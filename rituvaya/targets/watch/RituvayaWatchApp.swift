import SwiftUI
import WatchKit

final class WatchAppDelegate: NSObject, WKApplicationDelegate {
    func applicationDidFinishLaunching() {
        // Installed before launch completes, so a reminder button that launched the
        // app is still delivered to it.
        NotificationHandler.shared.install()
        Task { @MainActor in
            WatchStore.shared.activate()
        }
    }
}

@main
struct RituvayaWatchApp: App {
    @WKApplicationDelegateAdaptor(WatchAppDelegate.self) private var appDelegate
    @StateObject private var store = WatchStore.shared

    var body: some Scene {
        WindowGroup {
            ContentView(store: store)
        }
    }
}
