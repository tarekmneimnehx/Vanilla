import Combine
import Foundation
import WatchConnectivity
import WatchKit

/// The watch's copy of the phone's list, plus ticks made here that the phone
/// hasn't confirmed yet. The phone stays the source of truth: every tick is sent
/// back and recorded there, through the same code as a tap on the phone.
@MainActor
final class WatchStore: NSObject, ObservableObject {
    static let shared = WatchStore()

    enum DisplayState {
        case taken, overdue, due, upcoming
    }

    @Published private(set) var payload: WatchPayload?
    /// Occurrence key → when it was ticked here (ms since 1970). Shown as taken at
    /// once and kept across relaunches, so a tick never "un-ticks" while the phone
    /// is out of reach.
    @Published private(set) var pendingTicks: [String: Double] = [:]

    private let defaults = UserDefaults.standard
    private enum StorageKey {
        static let payload = "rituvaya.watch.payload"
        static let pendingTicks = "rituvaya.watch.pendingTicks"
        static let outbox = "rituvaya.watch.outbox"
    }

    /// Actions made before the session finished activating, e.g. a notification
    /// button that launched the app. Persisted so a relaunch can't drop them.
    private var outbox: [[String: Any]] = []
    private var activationRequested = false

    private override init() {
        super.init()
        restore()
    }

    var labels: WatchLabels { payload?.labels ?? .beforeFirstSync }

    // MARK: - Session

    func activate() {
        guard !activationRequested, WCSession.isSupported() else { return }
        activationRequested = true
        let session = WCSession.default
        session.delegate = self
        session.activate()
    }

    // MARK: - Reading

    /// The list for the watch's current day, or nil when the phone hasn't sent one
    /// that covers it.
    func day(for date: Date) -> WatchDay? {
        let today = Self.localDate(date)
        return payload?.days.first { $0.date == today }
    }

    func isTaken(_ dose: WatchDose) -> Bool {
        dose.status == .taken || pendingTicks[dose.key] != nil
    }

    func state(of dose: WatchDose, now: Date) -> DisplayState {
        if isTaken(dose) { return .taken }
        if dose.status == .overdue { return .overdue }
        // Between syncs, doses move along by the watch's own clock.
        return now.timeIntervalSince1970 * 1000 >= dose.at ? .due : .upcoming
    }

    // MARK: - Acting

    func tick(_ dose: WatchDose) {
        guard !isTaken(dose) else { return }
        WKInterfaceDevice.current().play(.success)
        send(action: "taken", keys: [dose.key])
    }

    /// Shows an action here straight away, then sends it to the phone twice: as an
    /// immediate message when the phone is reachable, and as a queued transfer that
    /// survives it being away. The phone counts the pair once, by id.
    func send(action: String, keys: [String]) {
        guard !keys.isEmpty else { return }
        let now = Date().timeIntervalSince1970 * 1000
        if action == "taken" {
            for key in keys { pendingTicks[key] = now }
            savePendingTicks()
        }
        let message: [String: Any] = [
            "type": "action",
            "id": UUID().uuidString,
            "action": action,
            "keys": keys,
            "at": now,
        ]
        let session = WCSession.default
        guard session.activationState == .activated else {
            outbox.append(message)
            saveOutbox()
            activate()
            return
        }
        deliver(message, via: session)
    }

    private func deliver(_ message: [String: Any], via session: WCSession) {
        if session.isReachable {
            session.sendMessage(message, replyHandler: nil, errorHandler: nil)
        }
        session.transferUserInfo(message)
    }

    private func flushOutbox() {
        guard !outbox.isEmpty else { return }
        let session = WCSession.default
        for message in outbox { deliver(message, via: session) }
        outbox.removeAll()
        saveOutbox()
    }

    // MARK: - Receiving

    fileprivate func sessionActivated(contextData: Data?) {
        if let contextData { apply(contextData: contextData) }
        flushOutbox()
    }

    fileprivate func apply(contextData data: Data) {
        guard let decoded = try? JSONDecoder().decode(WatchPayload.self, from: data),
              decoded.v <= WatchPayload.supportedVersion else { return }
        payload = decoded
        defaults.set(data, forKey: StorageKey.payload)

        // A tick made here is let go once the phone reports the dose taken, once the
        // dose leaves the list (skipped on the phone, or its day has passed), or when
        // the phone still reports it untaken well after the tick — by then the phone
        // has had the tick and decided otherwise, for example an undo on the phone.
        var known: [String: WatchDose] = [:]
        for day in decoded.days {
            for dose in day.doses { known[dose.key] = dose }
        }
        pendingTicks = pendingTicks.filter { key, tickedAt in
            guard let dose = known[key], dose.status != .taken else { return false }
            return decoded.generatedAt < tickedAt + 60_000
        }
        savePendingTicks()
        NotificationHandler.registerCategories(labels: decoded.labels)
    }

    // MARK: - Persistence

    private func restore() {
        if let data = defaults.data(forKey: StorageKey.payload),
           let decoded = try? JSONDecoder().decode(WatchPayload.self, from: data) {
            payload = decoded
        }
        pendingTicks = defaults.dictionary(forKey: StorageKey.pendingTicks) as? [String: Double] ?? [:]
        outbox = defaults.array(forKey: StorageKey.outbox) as? [[String: Any]] ?? []
        NotificationHandler.registerCategories(labels: labels)
    }

    private func savePendingTicks() {
        defaults.set(pendingTicks, forKey: StorageKey.pendingTicks)
    }

    private func saveOutbox() {
        defaults.set(outbox, forKey: StorageKey.outbox)
    }

    /// The phone's `LocalDate` format, in the watch's own time zone.
    static func localDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = .current
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: date)
    }
}

extension WatchStore: WCSessionDelegate {
    // WatchConnectivity calls these on a background queue. Dictionaries of `Any`
    // can't cross to the main actor safely, so they cross as JSON bytes.

    nonisolated func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        guard activationState == .activated else { return }
        let context = session.receivedApplicationContext
        let data = context.isEmpty ? nil : try? JSONSerialization.data(withJSONObject: context)
        Task { @MainActor in
            WatchStore.shared.sessionActivated(contextData: data)
        }
    }

    nonisolated func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
        guard let data = try? JSONSerialization.data(withJSONObject: applicationContext) else { return }
        Task { @MainActor in
            WatchStore.shared.apply(contextData: data)
        }
    }
}
