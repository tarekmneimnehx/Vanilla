import SwiftUI

/// Today's doses, in time order: name, size and time, with a tick for each.
/// Tapping a dose marks it taken; everything else lives on the phone.
struct ContentView: View {
    @ObservedObject var store: WatchStore
    @State private var now = Date()
    /// Moves doses from upcoming to due, and rolls over to the next day's list,
    /// without waiting for the phone.
    private let clock = Timer.publish(every: 30, on: .main, in: .common).autoconnect()

    var body: some View {
        NavigationStack {
            content
                .navigationTitle(store.labels.title)
        }
        .environment(\.layoutDirection, store.payload?.rtl == true ? .rightToLeft : .leftToRight)
        .onReceive(clock) { now = $0 }
        .onAppear { store.activate() }
    }

    @ViewBuilder
    private var content: some View {
        if let day = store.day(for: now) {
            if day.doses.isEmpty {
                message(store.labels.empty, systemImage: "leaf")
            } else {
                list(for: day)
            }
        } else {
            message(store.labels.openPhone, systemImage: "iphone")
        }
    }

    private func list(for day: WatchDay) -> some View {
        let done = day.doses.filter { store.isTaken($0) }.count
        let total = day.doses.count
        return List {
            Section {
                ForEach(day.doses) { dose in
                    DoseRow(dose: dose, state: store.state(of: dose, now: now), takenLabel: store.labels.taken) {
                        store.tick(dose)
                    }
                }
            } header: {
                Text(done == total ? store.labels.allDone : store.labels.progressText(done: done, total: total))
            }
        }
    }

    private func message(_ text: String, systemImage: String) -> some View {
        VStack(spacing: 8) {
            Image(systemName: systemImage)
                .font(.title2)
                .foregroundStyle(Color.accentColor)
                .accessibilityHidden(true)
            Text(text)
                .font(.footnote)
                .multilineTextAlignment(.center)
                .foregroundStyle(.secondary)
        }
        .padding()
    }
}

struct DoseRow: View {
    let dose: WatchDose
    let state: WatchStore.DisplayState
    let takenLabel: String
    let onTick: () -> Void

    private var isTaken: Bool { state == .taken }

    var body: some View {
        Button(action: onTick) {
            HStack(alignment: .top, spacing: 8) {
                Image(systemName: isTaken ? "checkmark.circle.fill" : "circle")
                    .font(.title3)
                    .foregroundStyle(isTaken ? Color.accentColor : Color.secondary)
                    .accessibilityHidden(true)
                VStack(alignment: .leading, spacing: 2) {
                    Text(dose.name)
                        .font(.headline)
                        .lineLimit(2)
                        .foregroundStyle(isTaken ? Color.secondary : Color.primary)
                    Text(dose.size)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                    Text(dose.time)
                        .font(.caption2.monospacedDigit())
                        .foregroundStyle(state == .overdue ? Color.orange : Color.secondary)
                }
                Spacer(minLength: 0)
            }
        }
        // A tick is undone on the phone, where the record lives, not here.
        .disabled(isTaken)
        .accessibilityElement(children: .combine)
        .accessibilityValue(isTaken ? takenLabel : "")
    }
}
