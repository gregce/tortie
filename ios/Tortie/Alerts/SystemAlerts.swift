// SystemAlerts.swift — the one file that asks iOS about alerts (Phase 316.5,
// build/p3165/SPEC.md sections 5.6.1, 5.6.2 and 5.6.6; conformance:ios rule x).
//
// WHAT IT ASKS. Whether alerts are allowed (`notificationSettings`), the
// question itself (`requestAuthorization`, once, at pairing, which iOS shows
// only while it has no answer), and this phone's address.
//
// THE ADDRESS, AND WHY A DEBUG BUILD NEVER ASKS APPLE FOR ONE. A Release build
// registers with Apple (`registerForRemoteNotifications`, named ONCE, in the
// `#else` of `#if DEBUG` below) and waits for App/AppDelegate.swift to hand
// over the token, at most 10 seconds, a failure or a timeout answering nil.
// A DEBUG build, which is every Simulator run, never registers: its address is
// the one a launch argument names (`-TortieDebugPushToken <hex>`, the fifth
// DEBUG seam, conformance:ios rule d) or none, so no test and no probe ever
// asks Apple for anything. Unpair (Phase 316.6) is the one way back out: a
// Release build unregisters (`unregisterForRemoteNotifications`, named ONCE,
// in the `#else` of `#if DEBUG` in `forgetAddress`), so Apple stops taking
// alerts for this install, and a DEBUG build does nothing.
//
// It writes no badge, reads no payload and logs nothing: a token never reaches
// a log, and the tap is App/AppDelegate.swift's and Alerts/Alerts.swift's.

import Foundation
import UIKit
import UserNotifications

/// The app's `PushAddressing`, over the system's notification center.
@MainActor
final class SystemPushAddressing: PushAddressing {
    static let shared = SystemPushAddressing()

    /// How long a registration may take before it answers nil.
    static let registrationBound: Duration = .seconds(10)

    /// Registrations waiting for Apple's answer, each settled once.
    private var waiting: [UUID: CheckedContinuation<Data?, Never>] = [:]

    func authorization() async -> PushAuthorization {
        let settings = await UNUserNotificationCenter.current().notificationSettings()
        switch settings.authorizationStatus {
        case .notDetermined:
            return .notDetermined
        case .authorized, .provisional, .ephemeral:
            return .authorized
        case .denied:
            return .denied
        @unknown default:
            return .denied
        }
    }

    func askForPairing() async -> PushAddress? {
        let granted: Bool
        do {
            granted = try await UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge])
        } catch {
            return nil
        }
        guard granted else { return nil }
        return await address()
    }

    func currentAddress() async -> PushAddress? {
        await address()
    }

    /// Unpair forgot the pairing (Phase 316.6, build/p3166/SPEC.md section
    /// 5.4). A Release build tells Apple to stop taking alerts for this
    /// install, named ONCE, in the `#else` of `#if DEBUG`. A DEBUG build,
    /// which is every Simulator run, never speaks to Apple in either
    /// direction, so it does nothing.
    func forgetAddress() async {
        #if DEBUG
        return
        #else
        UIApplication.shared.unregisterForRemoteNotifications()
        #endif
    }

    // MARK: What App/AppDelegate.swift hands over

    /// Apple answered a registration with this phone's token.
    func registered(_ token: Data) {
        settleAll(token)
    }

    /// Apple could not register this phone.
    func failed() {
        settleAll(nil)
    }

    private func settleAll(_ token: Data?) {
        for id in Array(waiting.keys) {
            settle(id, token)
        }
    }

    private func settle(_ id: UUID, _ token: Data?) {
        waiting.removeValue(forKey: id)?.resume(returning: token)
    }

    // MARK: The address

    #if DEBUG
    /// DEBUG: the address a launch argument names, or none. Never Apple's.
    private func address() async -> PushAddress? {
        guard let token = AlertsDebugSeam.token() else { return nil }
        return PushAddress(token: token, environment: .current)
    }
    #else
    /// Release: registered with Apple, bounded, and read as hex.
    private func address() async -> PushAddress? {
        guard let token = await register() else { return nil }
        return PushAddress(token: PushAddress.hex(token), environment: .current)
    }

    private func register() async -> Data? {
        let id = UUID()
        return await withCheckedContinuation { continuation in
            waiting[id] = continuation
            UIApplication.shared.registerForRemoteNotifications()
            Task { [weak self] in
                try? await Task.sleep(for: Self.registrationBound)
                self?.settle(id, nil)
            }
        }
    }
    #endif
}

#if DEBUG
// MARK: - DEBUG ONLY: the address without Apple

/// A DEBUG build takes its alert address as a launch argument, because it
/// never registers with Apple. It does not exist in a Release build.
enum AlertsDebugSeam {
    /// `-TortieDebugPushToken <hex>`.
    static let tokenArgument = "-TortieDebugPushToken"

    /// The token named, or nil.
    static func token(_ arguments: [String] = DebugLaunchSeam.arguments) -> String? {
        arguments.drop(while: { $0 != tokenArgument }).dropFirst().first
    }
}
#endif
