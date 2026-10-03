// The owner check: Face ID, Touch ID or the passcode, asked before an End is
// sent and before nothing else (Phase 317, build/p317/SPEC.md section 5.8.2).
//
// HIS RULING OF 2026-09-30: "Only for End". Reading, Unpair and Settings never
// ask, and there is no switch. THE ONE FILE THAT NAMES LocalAuthentication
// (conformance:ios rule ac).
//
// WHY `deviceOwnerAuthentication` IS EVALUATED AND NEVER THE BIOMETRICS-ONLY
// POLICY. A Touch ID iPhone, an iPhone with Face ID turned off for Tortie and
// an iPhone whose Face ID fails three times all fall back to the passcode, and
// each must still be able to end a session (research 136 section 14). Only an
// iPhone with no passcode at all cannot, and the End bar says so in one line
// before any press (`OwnerKind.none`).
//
// A NEW CONTEXT PER CALL, and no reuse window is ever set on one: an earlier
// match never stands in for this press.
//
// THE GLYPH SAYS WHAT iOS WILL ASK FOR, never what the hardware is (Phase
// 317's fix round, after the verify's E3): `biometryType` names the phone's
// biometry whether or not one is enrolled or allowed to Tortie, so on its own
// it drew Face ID's mark on a phone that would ask for the passcode. `kind()`
// therefore also asks `canEvaluatePolicy` of the biometrics-only policy. That
// is a QUESTION and authenticates nothing: the one evaluation is still
// `deviceOwnerAuthentication`, in `confirm`, and conformance:ios (ac) allows
// the biometrics-only policy as `canEvaluatePolicy`'s argument in `kind()`
// and nowhere else.
//
// WHAT IT CANNOT DO, stated: the Mac cannot verify any of this (research 135
// section 4.9). It is a check the phone makes before it signs, nothing in the
// write claims it happened, and no DEBUG seam skips it (D21): the Simulator
// arms enrol and answer Face ID from the host.

import Foundation
import LocalAuthentication

/// What the phone has to confirm its owner with, which picks the End bar's
/// glyph: an image with no words, so a Touch ID iPhone never reads "Face ID".
enum OwnerKind: Equatable, Sendable {
    case faceID
    case touchID
    /// No biometry, none enrolled, none allowed to Tortie, or locked out:
    /// iOS asks for the passcode.
    case passcode
    /// No passcode is set, so nothing can confirm the owner: End is drawn off.
    case none
}

/// How one confirmation ended.
enum OwnerAnswer: Equatable, Sendable {
    case confirmed
    /// Cancelled, failed, or anything else: nothing is sent.
    case notConfirmed
    /// No passcode is set on this iPhone.
    case needsPasscode
}

/// The check the End press asks. `DeviceOwnerCheck` is the one conformer in
/// the app; the tests hand in their own.
protocol OwnerCheck: Sendable {
    /// What this iPhone confirms its owner with, now.
    func kind() -> OwnerKind
    /// Ask iOS, with `reason` (the press's own words) under its prompt.
    func confirm(reason: String) async -> OwnerAnswer
}

/// What the check asks of one context: `LAContext`'s own members, so its one
/// production conformer is `LAContext` itself and a test can hand in a fake.
protocol OwnerContext: AnyObject {
    var biometryType: LABiometryType { get }
    func canEvaluatePolicy(_ policy: LAPolicy, error: NSErrorPointer) -> Bool
    func evaluatePolicy(_ policy: LAPolicy, localizedReason: String) async throws -> Bool
}

extension LAContext: OwnerContext {}

/// iOS's own check, through a NEW `LAContext` every call, under the one
/// policy: biometry with the passcode behind it.
struct DeviceOwnerCheck: OwnerCheck {
    /// The tests' contexts; nil in the app, which makes `LAContext()`.
    private let contexts: (@Sendable () -> any OwnerContext)?

    init(contexts: (@Sendable () -> any OwnerContext)? = nil) {
        self.contexts = contexts
    }

    func kind() -> OwnerKind {
        let context: any OwnerContext = contexts?() ?? LAContext()
        var error: NSError?
        guard context.canEvaluatePolicy(.deviceOwnerAuthentication, error: &error) else {
            // No passcode: nothing can confirm the owner. Any other refusal
            // still draws End on, and the press says what iOS answered.
            return Self.isPasscodeNotSet(error) ? .none : .passcode
        }
        // A biometry's mark only when iOS will ask for it now: none enrolled,
        // none allowed to Tortie, or locked out, and the press asks for the
        // passcode, so the glyph is the lock.
        var biometryError: NSError?
        guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &biometryError) else {
            return .passcode
        }
        switch context.biometryType {
        case .faceID: return .faceID
        case .touchID: return .touchID
        default: return .passcode
        }
    }

    func confirm(reason: String) async -> OwnerAnswer {
        let context: any OwnerContext = contexts?() ?? LAContext()
        do {
            return try await context.evaluatePolicy(.deviceOwnerAuthentication, localizedReason: reason) ? .confirmed : .notConfirmed
        } catch {
            return Self.isPasscodeNotSet(error) ? .needsPasscode : .notConfirmed
        }
    }

    /// `LAError.passcodeNotSet`, and nothing else.
    static func isPasscodeNotSet(_ error: Error?) -> Bool {
        guard let error = error as NSError?, error.domain == LAErrorDomain else { return false }
        return LAError.Code(rawValue: error.code) == .passcodeNotSet
    }
}
