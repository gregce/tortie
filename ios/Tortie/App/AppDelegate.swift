// AppDelegate.swift — the one place iOS hands the app its alert address and
// its taps (Phase 316.5, build/p3165/SPEC.md section 5.6.1; conformance:ios
// rule x).
//
// It sets itself as the notification center's delegate while the app is
// still launching, so a tap that COLD-launches the app is delivered here and
// not lost; it forwards Apple's answer to a registration to
// `SystemPushAddressing`; it turns a tap into an `AlertTap` with the one
// reader of a payload there is (`AlertTap.parse`) and posts it to the inbox,
// which the root view empties; and it asks iOS to show an alert that arrives
// while the app is open. It reads nothing else of a notification, writes no
// badge and logs nothing.

import UIKit
import UserNotifications

final class AppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        UNUserNotificationCenter.current().delegate = self
        return true
    }

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        SystemPushAddressing.shared.registered(deviceToken)
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: any Error) {
        SystemPushAddressing.shared.failed()
    }

    /// A tap: the session the alert names, or the list.
    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        let tap = AlertTap.parse(response.notification.request.content.userInfo)
        Task { @MainActor in
            AlertInbox.shared.post(tap)
        }
        completionHandler()
    }

    /// An alert while the app is open is shown as it is on the lock screen.
    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        completionHandler([.banner, .list, .sound])
    }
}
