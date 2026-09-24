import UserNotifications

/// Reminder buttons pressed on the watch. The phone schedules the reminders and
/// the watch shows them; with this app installed, a button pressed on the wrist
/// is delivered here, so it becomes the same action as a tap in the list and
/// goes back to the phone through WatchStore. The phone's own handler would
/// record it the same way if iOS routed it there instead; recording is
/// idempotent, so it can never count twice.
///
/// Identifiers must match `src/notifications/content.ts` on the phone.
final class NotificationHandler: NSObject, UNUserNotificationCenterDelegate {
    static let shared = NotificationHandler()

    static let doseCategory = "rituvaya.dose"
    static let doseManyCategory = "rituvaya.dose.multi"
    static let hydrationCategory = "rituvaya.hydration"

    /// Notification action identifier → the action sent to the phone.
    private static let actions: [String: String] = [
        "taken": "taken",
        "skip": "skip",
        "snooze": "snooze",
        "tonight": "tonight",
    ]

    func install() {
        UNUserNotificationCenter.current().delegate = self
    }

    /// Button titles follow the phone's language once it has synced.
    static func registerCategories(labels: WatchLabels) {
        let taken = UNNotificationAction(identifier: "taken", title: labels.taken, options: [])
        let takenAll = UNNotificationAction(identifier: "taken", title: labels.takenAll, options: [])
        let snooze = UNNotificationAction(identifier: "snooze", title: labels.snooze, options: [])
        let skip = UNNotificationAction(identifier: "skip", title: labels.skip, options: [.destructive])
        let tonight = UNNotificationAction(identifier: "tonight", title: labels.tonight, options: [])
        UNUserNotificationCenter.current().setNotificationCategories([
            UNNotificationCategory(identifier: doseCategory, actions: [taken, snooze, skip, tonight], intentIdentifiers: [], options: []),
            UNNotificationCategory(identifier: doseManyCategory, actions: [takenAll, snooze, tonight], intentIdentifiers: [], options: []),
            // Logging water needs an amount, which only the phone asks for.
            UNNotificationCategory(identifier: hydrationCategory, actions: [], intentIdentifiers: [], options: []),
        ])
    }

    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        let keys = response.notification.request.content.userInfo["occurrenceKeys"] as? [String] ?? []
        guard let action = Self.actions[response.actionIdentifier], !keys.isEmpty else {
            // Tapping the reminder itself just opens the list.
            completionHandler()
            return
        }
        Task { @MainActor in
            WatchStore.shared.send(action: action, keys: keys)
            completionHandler()
        }
    }

    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        completionHandler([.banner, .list, .sound])
    }
}
