import Foundation

/// Mirrors `WatchPayload` in `src/watch/payload.ts`. Change the two together; `v`
/// lets an older watch app ignore a newer shape instead of misreading it.
///
/// Numbers are read as `Double` and booleans leniently: values arrive from
/// JavaScript, where every number is a double, and cross two bridges on the way.
struct WatchPayload: Decodable {
    static let supportedVersion: Double = 1

    let v: Double
    let generatedAt: Double
    let rtl: Bool
    let labels: WatchLabels
    /// Today and the next two days, so the watch still has the right list on a
    /// morning the phone app hasn't been opened yet.
    let days: [WatchDay]

    private enum CodingKeys: String, CodingKey {
        case v, generatedAt, rtl, labels, days
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        v = try c.decode(Double.self, forKey: .v)
        generatedAt = try c.decode(Double.self, forKey: .generatedAt)
        rtl = try c.decodeFlexibleBool(forKey: .rtl)
        labels = try c.decode(WatchLabels.self, forKey: .labels)
        days = try c.decode([WatchDay].self, forKey: .days)
    }
}

struct WatchDay: Decodable {
    /// Local calendar date on the phone, `yyyy-MM-dd`.
    let date: String
    let doses: [WatchDose]
}

struct WatchDose: Decodable, Identifiable {
    enum Status: String, Decodable {
        case upcoming, due, overdue, taken
    }

    /// Occurrence key: what the watch sends back to say which dose was ticked.
    let key: String
    let name: String
    /// Amount plus strength when known, already worded by the phone.
    let size: String
    let time: String
    /// Scheduled time, milliseconds since 1970.
    let at: Double
    let status: Status
    let medication: Bool

    var id: String { key }

    private enum CodingKeys: String, CodingKey {
        case key, name, size, time, at, status, medication
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        key = try c.decode(String.self, forKey: .key)
        name = try c.decode(String.self, forKey: .name)
        size = try c.decode(String.self, forKey: .size)
        time = try c.decode(String.self, forKey: .time)
        at = try c.decode(Double.self, forKey: .at)
        status = try c.decode(Status.self, forKey: .status)
        medication = try c.decodeFlexibleBool(forKey: .medication)
    }
}

/// Every word the watch shows comes from the phone, in the user's language.
struct WatchLabels: Decodable {
    let title: String
    let openPhone: String
    let empty: String
    let allDone: String
    /// Contains `{done}` and `{total}`.
    let progress: String
    let taken: String
    let takenAll: String
    let skip: String
    let snooze: String
    let tonight: String

    /// Only until the phone first syncs, when there is no language to follow yet.
    static let beforeFirstSync = WatchLabels(
        title: "Rituvaya",
        openPhone: "Open Rituvaya on your iPhone to set up this list",
        empty: "",
        allDone: "",
        progress: "{done} of {total}",
        taken: "Taken",
        takenAll: "Mark all taken",
        skip: "Skip",
        snooze: "Snooze",
        tonight: "Remind tonight"
    )

    init(title: String, openPhone: String, empty: String, allDone: String, progress: String, taken: String, takenAll: String, skip: String, snooze: String, tonight: String) {
        self.title = title
        self.openPhone = openPhone
        self.empty = empty
        self.allDone = allDone
        self.progress = progress
        self.taken = taken
        self.takenAll = takenAll
        self.skip = skip
        self.snooze = snooze
        self.tonight = tonight
    }

    func progressText(done: Int, total: Int) -> String {
        progress
            .replacingOccurrences(of: "{done}", with: String(done))
            .replacingOccurrences(of: "{total}", with: String(total))
    }
}

extension KeyedDecodingContainer {
    /// A boolean can reach the watch as `true` or as `1`, depending on how it
    /// crossed from JavaScript; both mean the same thing here.
    func decodeFlexibleBool(forKey key: Key) throws -> Bool {
        if let value = try? decode(Bool.self, forKey: key) { return value }
        return try decode(Double.self, forKey: key) != 0
    }
}
