// Alerts: the address the Mac sends to, and what a tap on an alert opens
// (Phase 316.5, build/p3165/SPEC.md sections 5.4 to 5.6).
//
// PURE. No UIKit and no UserNotifications here: Alerts/SystemAlerts.swift is
// the one file that asks iOS, and App/AppDelegate.swift the one that hears
// from it (conformance:ios rule x). Everything below is decided from values,
// so the tests drive every row of it with no Simulator setting touched.
//
// THE ADDRESS. A device token and the environment it is Apple's for. The phone
// hands it to the Mac ONLY inside the sealed pairing presentation (`apt`,
// `ape`, Door/Pairing.swift), because no route of the door carries it (Phase
// 314, build/p314/SPEC.md section 1.1 row 3). So a phone whose address moved
// can only say so, and pairing again is how the Mac learns the new one.
//
// WHOSE ALERTS. Only a Mac that keeps the app publisher's Apple push key can
// send one, so alerts are his alone (research 136 section 9, research 127
// section 11.6). A phone asks iOS for alerts only when the Mac it is pairing
// with says, in its `pending` answer, that it can send (Door/Contract.swift),
// and a pairing with a Mac that could not never asks, never says
// `Pair again to get alerts.`, and promises nothing.
//
// THE TAP. Phase 314's single alert carries `tortie: {v: 1, session: <id>}`;
// its count alert `tortie: {v: 1}`; its badge nothing. A tap opens the session
// the single alert names and the list for everything else, so a payload this
// build cannot read opens the list and never a guess.

import CoreFoundation
import Foundation
import Observation

// MARK: - The address

/// Which of Apple's two environments this build's device token belongs to.
///
/// Compile time (SPEC section 5.6.1): every DEBUG build is ad hoc and reaches
/// Apple's development environment only; the app he uploads is a Release
/// archive that App Store Connect re-signs for production. The one case this
/// gets wrong is a Release build run from Xcode straight onto a device, which
/// carries a development profile; Apple answers that token `BadDeviceToken`
/// and the Mac stops sending to it. His checklist never runs one.
enum PushEnvironment: String, Codable, Equatable, Sendable {
    case development
    case production

    #if DEBUG
    static let current: PushEnvironment = .development
    #else
    static let current: PushEnvironment = .production
    #endif
}

/// A device token and its environment, checked the Mac's way
/// (`PUSH_TOKEN_RE` in src/main/pocket/pairing.ts, folded to lowercase).
struct PushAddress: Equatable, Sendable, Codable {
    /// Lowercase hex, 32 to 256 characters.
    let token: String
    let environment: PushEnvironment

    /// The token's length, in hex characters, the Mac accepts.
    static let tokenLength = 32...256

    /// Nil unless `token` is hex of an accepted length. Upper case is folded,
    /// so one token has one spelling, as it does on the Mac.
    init?(token: String, environment: PushEnvironment) {
        let folded = token.lowercased()
        guard Self.tokenLength.contains(folded.utf8.count),
              folded.utf8.allSatisfy(Self.isHexDigit) else { return nil }
        self.token = folded
        self.environment = environment
    }

    /// The token Apple hands the app, as the hex the Mac reads.
    static func hex(_ data: Data) -> String {
        Hex.encode(data)
    }

    private static func isHexDigit(_ byte: UInt8) -> Bool {
        (byte >= UInt8(ascii: "0") && byte <= UInt8(ascii: "9")) || (byte >= UInt8(ascii: "a") && byte <= UInt8(ascii: "f"))
    }

    private enum CodingKeys: String, CodingKey {
        case token
        case environment
    }

    /// Decoded through the same check, so nothing read back is an address
    /// the Mac would refuse.
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let token = try container.decode(String.self, forKey: .token)
        let environment = try container.decode(PushEnvironment.self, forKey: .environment)
        guard let address = PushAddress(token: token, environment: environment) else {
            throw DecodingError.dataCorruptedError(forKey: .token, in: container, debugDescription: "token")
        }
        self = address
    }
}

/// What iOS says about alerts for this app. A provisional or an ephemeral
/// grant is a grant.
enum PushAuthorization: Equatable, Sendable {
    case notDetermined
    case denied
    case authorized
}

/// Everything the app asks iOS about alerts. The app's is
/// `SystemPushAddressing`; the tests hand in their own.
protocol PushAddressing: Sendable {
    /// What iOS says now. Never shows anything.
    func authorization() async -> PushAuthorization
    /// Asked at most once per pairing, and only when the Mac it is presenting
    /// to says it can send (Door/Pairing.swift), which is after the fingerprint
    /// is drawn: iOS shows its question only when it has none, and the answer
    /// is this phone's address, or nil when alerts are denied, the address
    /// could not be had, or this build has none to give.
    func askForPairing() async -> PushAddress?
    /// This phone's address now, asked only when alerts are allowed and the
    /// kept pairing's Mac said it could send.
    func currentAddress() async -> PushAddress?
    /// Unpair forgot the pairing (Phase 316.6): stop Apple taking alerts for
    /// this install. Called once per Unpair, only after the record went. A
    /// later pairing with a Mac that can send registers again.
    func forgetAddress() async
}

/// What a pairing agreed about alerts, kept with it (Door/Keys.swift).
struct AlertsKept: Equatable, Sendable {
    /// The Mac said, in the `pending` answer it last gave this phone, that it
    /// can send an alert: it keeps an Apple push key and its switch is on.
    let macSends: Bool
    /// The address in the presentation the Mac held, or nil: the one the Mac
    /// holds for this phone.
    let presented: PushAddress?

    /// A pairing that agreed nothing about alerts: made before Phase 316.5,
    /// or with a Mac that could not send and a phone that presented nothing.
    static let nothing = AlertsKept(macSends: false, presented: nil)
}

// MARK: - The tap

/// Where a tap on an alert goes.
enum AlertTap: Equatable, Sendable {
    /// The list: a count alert, a badge, or anything this build cannot read.
    case list
    /// The one session Phase 314's single alert names.
    case session(String)

    /// The one key the app reads, and the one version it knows.
    static let key = "tortie"
    static let version = 1
    /// A session id the door could have named: letters, digits and `-`, 1 to
    /// 128 of them (a UUID is 36).
    static let idLength = 1...128

    /// The tap for a notification's payload. Reads `tortie` and nothing else:
    /// `.session` only when it is a dictionary whose `v` is the whole number 1
    /// and whose `session` is a string of the id's shape; everything else,
    /// `aps` and `thread-id` included, is never read and opens the list.
    static func parse(_ userInfo: [AnyHashable: Any]) -> AlertTap {
        guard let tortie = userInfo[key] as? [String: Any],
              isVersion(tortie["v"]),
              let id = tortie["session"] as? String,
              isSessionId(id) else { return .list }
        return .session(id)
    }

    /// `v` is the whole number 1: not a string, not 1.5, and not `true`,
    /// which a JSON payload bridges to a number that reads as 1.
    private static func isVersion(_ value: Any?) -> Bool {
        guard let value else { return false }
        if CFGetTypeID(value as AnyObject) == CFBooleanGetTypeID() { return false }
        guard let number = value as? Int else { return false }
        return number == version
    }

    private static func isSessionId(_ id: String) -> Bool {
        idLength.contains(id.utf8.count) && id.utf8.allSatisfy { byte in
            (byte >= UInt8(ascii: "A") && byte <= UInt8(ascii: "Z"))
                || (byte >= UInt8(ascii: "a") && byte <= UInt8(ascii: "z"))
                || (byte >= UInt8(ascii: "0") && byte <= UInt8(ascii: "9"))
                || byte == UInt8(ascii: "-")
        }
    }
}

// MARK: - Pair again to get alerts

/// Whether the list says `Pair again to get alerts.` (SPEC section 5.6.5, and
/// research 136 section 9 over it).
///
/// The Mac learns this phone's address only inside a pairing, so the line is
/// drawn exactly when pairing again would give the Mac an address it does not
/// hold, or would let iOS ask a question it has not asked. And ONLY for a
/// pairing whose Mac said it could send: a phone paired with a Mac that could
/// not, or before Phase 316.5 when no Mac said, is never told to pair again
/// for alerts that could not arrive.
enum AlertLine {
    /// - Parameters:
    ///   - kept: what the pairing agreed: whether its Mac could send, and the
    ///     address this phone presented, or nil (it presented none).
    ///   - authorization: what iOS says now.
    ///   - current: this phone's address now; read only when authorized.
    static func shows(kept: AlertsKept, authorization: PushAuthorization, current: PushAddress?) -> Bool {
        // A Mac that could not send: nothing to pair again for.
        guard kept.macSends else { return false }
        switch authorization {
        case .notDetermined:
            // Never asked, or permission was reset: pairing again asks.
            return true
        case .denied:
            // He said no, or turned alerts off in iOS Settings; the Mac's
            // address, if it holds one, is still his.
            return false
        case .authorized:
            // No address to be had says nothing; the same one says nothing;
            // one the Mac does not hold (none presented, or Apple gave a new
            // one) is what pairing again fixes.
            guard let current else { return false }
            return current != kept.presented
        }
    }
}

// MARK: - The inbox

/// The one tap waiting to be opened. The delegate posts it the moment iOS
/// hands it over, which for a tap that launched the app can be before the
/// first screen is drawn; the root view takes it when it can, exactly once.
@MainActor
@Observable
final class AlertInbox {
    static let shared = AlertInbox()

    private(set) var pending: AlertTap?

    func post(_ tap: AlertTap) {
        pending = tap
    }

    /// The waiting tap, once: a second take answers nil.
    func take() -> AlertTap? {
        defer { pending = nil }
        return pending
    }
}
