// Pairing.swift — reading the Mac's code, presenting, and knowing when it is
// done (Phase 316.2).
//
// THE ORDER, and the order is the Mac's (src/main/pocket/pairing.ts):
//
//   1. The Mac draws a QR (v:2) holding its address, its port, `fp` (the pin),
//      its two public keys, a one-shot secret `ps`, the window's end `exp` and,
//      when he pasted one, `tk`, a tailnet key for Phase 316.3's node.
//   2. The phone makes its two key pairs and draws the fingerprint of BOTH its
//      public keys, six groups of four, which the Mac draws too.
//   3. The phone PRESENTS: `POST /pair` with `{label, ek, xk}` sealed with
//      AES-256-GCM under HKDF-SHA256(`ps`, empty salt, `tortie-pocket-pair-v1`),
//      sent as `{iv, ct, tag}`. It presents again every 2 seconds until the
//      door answers `allowed` or the window ends.
//   4. He matches the fingerprint and presses Allow ON THE MAC. The Mac asks
//      last.
//   5. THE PHONE IS PAIRED ONLY WHEN ITS FIRST SIGNED READ SUCCEEDS. After an
//      Allow, the door answers `allowed` to ANY presenter from the allowed
//      phone's address (316.1's open nit P2b, kept on purpose: nothing leaks,
//      because that presenter's signed reads are refused). So `allowed` alone
//      is not success, and nothing is written to the Keychain until a signed
//      `/v1/blocked` comes back whole.
//
// WHAT THE CODE HOLDS. `ps` is a one-shot secret that dies with the window,
// and `tk` is his tailnet credential: both live only in the parsed offer in
// memory, and neither is ever stored or logged. 316.3 uses `tk` to join; 316.2
// parses it and keeps it nowhere.
//
// THE DEBUG SEAM. The Simulator has no camera, so a DEBUG build takes the
// code as a launch argument, and a DEBUG build also accepts a code whose
// address is this Mac's loopback, which is where the door runs in every agent
// run. Both exist only inside `#if DEBUG` (conformance:ios rule d); a Release
// build takes a code only from the camera and only for a tailnet address.

import CryptoKit
import Foundation

// MARK: - The code the Mac draws

/// What the QR carries, checked. Nothing in it is trusted before this.
struct PairingOffer: Sendable, Equatable {
    /// `POCKET_QR_VERSION`.
    static let version = 2
    /// Far above any real code (a few hundred characters); anything longer
    /// is not a Tortie code and is not parsed.
    static let maxPayloadBytes = 4096
    /// `TAILNET_AUTH_KEY_PREFIX` and `TAILNET_KEY_MAX_CHARS`.
    static let tailnetKeyPrefix = "tskey-auth-"
    static let tailnetKeyMaxChars = 256

    let address: DoorAddress
    /// `dk`, the Mac's Ed25519 SPKI, base64url.
    let macSigningKey: String
    /// `dx`, the Mac's X25519 SPKI, base64url.
    let macExchangeKey: String
    /// `ps`, the one-shot secret. Memory only.
    let secret: Data
    /// `exp`, epoch ms on the Mac's clock.
    let expiresAt: Double
    /// `tk`, his tailnet key, or nil. Memory only; 316.3 joins with it.
    let tailnetKey: String?

    /// Is the window still open by this phone's clock?
    func isOpen(at date: Date) -> Bool {
        date.timeIntervalSince1970 * 1000 < expiresAt
    }

    private struct Wire: Decodable {
        let v: Int
        let host: String
        let port: Int
        let fp: String
        let dk: String
        let dx: String
        let ps: String
        let exp: Double
        let tk: String?
    }

    /// The code, or `badCode` / `unsupportedCode`. Unknown fields are
    /// ignored; a field that is present and wrong refuses the whole code.
    static func parse(_ text: String) throws -> PairingOffer {
        guard !text.isEmpty, text.utf8.count <= maxPayloadBytes,
              let wire = try? JSONDecoder().decode(Wire.self, from: Data(text.utf8)) else {
            throw PairingFailure.badCode
        }
        guard wire.v == version else { throw PairingFailure.unsupportedCode }
        guard hostIsReachable(wire.host),
              (1...65535).contains(wire.port),
              let pin = Base64URL.decode(wire.fp), pin.count == 32, Base64URL.encode(pin) == wire.fp,
              SPKI.ed25519Key(wire.dk) != nil,
              SPKI.x25519Key(wire.dx) != nil,
              let secret = Base64URL.decode(wire.ps), (16...64).contains(secret.count),
              wire.exp.isFinite, wire.exp > 0,
              wire.tk.map(isTailnetKey) ?? true else {
            throw PairingFailure.badCode
        }
        return PairingOffer(
            address: DoorAddress(host: wire.host, port: wire.port, pin: wire.fp),
            macSigningKey: wire.dk,
            macExchangeKey: wire.dx,
            secret: secret,
            expiresAt: wire.exp,
            tailnetKey: wire.tk
        )
    }

    /// The door binds the Mac's tailnet address, which is always inside
    /// 100.64.0.0/10, the one range the app's App Transport Security key
    /// names. A DEBUG build also takes this Mac's loopback, where the door
    /// runs in every agent run (`GMUX_POCKET_LOOPBACK=1`).
    static func hostIsReachable(_ host: String) -> Bool {
        guard let octets = DoorAddress(host: host, port: 0, pin: "").octets else { return false }
        if octets[0] == 100 && (64...127).contains(octets[1]) { return true }
        #if DEBUG
        if host == PairingDebugSeam.loopbackHost { return true }
        #endif
        return false
    }

    /// `tailnetKeyOf`'s rule, read again: the prefix, something after it, at
    /// most 256 characters, printable ASCII with no space.
    static func isTailnetKey(_ key: String) -> Bool {
        key.hasPrefix(tailnetKeyPrefix)
            && key.utf8.count > tailnetKeyPrefix.utf8.count
            && key.utf8.count <= tailnetKeyMaxChars
            && key.utf8.allSatisfy { $0 >= 0x21 && $0 <= 0x7e }
    }
}

// MARK: - What can go wrong

/// Why pairing stopped. No sentence here: the pairing screen says each one in
/// Copy.swift's words.
enum PairingFailure: Error, Equatable, Sendable {
    /// Not a Tortie pairing code.
    case badCode
    /// A Tortie code of another version.
    case unsupportedCode
    /// The window shut before the Mac allowed this phone.
    case codeExpired
    /// The Mac has no pairing window open (`/pair` answered 404).
    case windowClosed
    /// The Mac answered `refused`: the code was replaced or already used.
    case macRefused
    /// `/pair` answered something that is not one of its three words.
    case strangeAnswer
    /// The door did not present the key the code pinned.
    case wrongKey
    /// Allowed, but the first signed read was refused: this phone is not the
    /// one the Mac allowed.
    case notAccepted
    /// The Mac could not be reached inside the window.
    case unreachable
    /// The Keychain would not keep the pairing.
    case couldNotSave
    /// This build has no way to reach a Mac (a Release build before 316.3).
    case notAvailable
    /// The person left the pairing screen.
    case cancelled
}

// MARK: - The sealed presentation

/// `{label, ek, xk}` sealed the way `PocketPairing.openPresentation` opens it.
enum PresentationSeal {
    /// `PAIRING_INFO`.
    static let info = "tortie-pocket-pair-v1"

    /// HKDF-SHA256 over the one-shot secret, empty salt, 32 bytes.
    static func key(secret: Data) -> SymmetricKey {
        HKDF<SHA256>.deriveKey(
            inputKeyMaterial: SymmetricKey(data: secret),
            salt: Data(),
            info: Data(info.utf8),
            outputByteCount: 32
        )
    }

    // Declared in the door's own order (`{label, ek, xk}`, `{iv, ct, tag}`),
    // which is NOT the order they are written in: the encoder sorts the keys,
    // so the bytes are the same on every run and the vectors can hold them.
    private struct Inner: Encodable {
        let label: String
        let ek: String
        let xk: String
    }

    private struct Outer: Codable {
        let iv: String
        let ct: String
        let tag: String
    }

    private static func encoder() -> JSONEncoder {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.sortedKeys, .withoutEscapingSlashes]
        return encoder
    }

    /// The plaintext: `{"ek":…,"label":…,"xk":…}`, keys sorted.
    static func inner(label: String, keys: PhoneKeys) throws -> Data {
        try encoder().encode(Inner(label: label, ek: keys.signingKey, xk: keys.exchangeKey))
    }

    /// The body `POST /pair` carries: `{"ct":…,"iv":…,"tag":…}`, each
    /// base64url. A fresh 12-byte nonce every time unless a test names one.
    static func seal(_ inner: Data, secret: Data, nonce: AES.GCM.Nonce = AES.GCM.Nonce()) throws -> Data {
        let box = try AES.GCM.seal(inner, using: key(secret: secret), nonce: nonce)
        let iv = nonce.withUnsafeBytes { Data($0) }
        return try encoder().encode(
            Outer(iv: Base64URL.encode(iv), ct: Base64URL.encode(box.ciphertext), tag: Base64URL.encode(box.tag))
        )
    }

    /// Open a body sealed the Mac's way. The tests use it on what the door's
    /// own sealer (`sealPresentationAsPhone`) produced.
    static func open(_ body: Data, secret: Data) throws -> Data {
        let outer = try JSONDecoder().decode(Outer.self, from: body)
        guard let iv = Base64URL.decode(outer.iv), iv.count == 12,
              let ct = Base64URL.decode(outer.ct), !ct.isEmpty,
              let tag = Base64URL.decode(outer.tag), tag.count == 16 else {
            throw PairingFailure.strangeAnswer
        }
        let box = try AES.GCM.SealedBox(nonce: AES.GCM.Nonce(data: iv), ciphertext: ct, tag: tag)
        return try AES.GCM.open(box, using: key(secret: secret))
    }
}

// MARK: - Pairing, in order

/// A pairing under way: the code, the phone's new keys, and the fingerprint
/// to draw. Nothing of it is stored.
struct PendingPairing: Sendable {
    let offer: PairingOffer
    let keys: PhoneKeys
    let label: String
    /// Six groups of four, the Mac's `pairFingerprint` of the phone's keys.
    let fingerprint: String
}

/// Where a pairing has got to, for the screen.
enum PairingStep: Equatable, Sendable {
    /// Presenting; the Mac has not answered yet.
    case presenting
    /// The Mac has the phone and is asking him to allow it.
    case waitingForMac
    /// Allowed; the first signed read is being made.
    case confirming
}

/// How a pairing ended.
enum PairingOutcome: Sendable {
    /// Done: the first signed read succeeded and the pairing is kept. Its
    /// answer is the list, so the screen can draw it at once.
    case paired(PairedDoor, PocketBlockedAnswer)
    case failed(PairingFailure)
}

/// The pairing, in the Mac's order, ending only in a signed read.
final class PairingFlow: Sendable {
    /// "present again every 2 s until allowed or the window ends".
    static let presentEvery: Duration = .seconds(2)
    /// A door that allowed a moment ago is listening; a read that cannot
    /// connect is tried this many times, 2 seconds apart, before giving up.
    static let firstReadAttempts = 3
    /// `presentation.label` is cut to 64 characters by the Mac.
    static let labelMaxUTF16 = 64

    private let exchange: DoorExchanging
    private let store: PairingStore
    private let now: @Sendable () -> Date
    private let pause: @Sendable (Duration) async throws -> Void

    init(
        exchange: DoorExchanging,
        store: PairingStore,
        now: @escaping @Sendable () -> Date = { Date() },
        pause: @escaping @Sendable (Duration) async throws -> Void = { try await Task.sleep(for: $0) }
    ) {
        self.exchange = exchange
        self.store = store
        self.now = now
        self.pause = pause
    }

    /// Make the phone's keys for this code. `label` is what the Mac will show
    /// beside the fingerprint.
    func begin(_ offer: PairingOffer, label: String, keys: PhoneKeys = .generate()) -> PendingPairing {
        PendingPairing(
            offer: offer,
            keys: keys,
            label: Self.presentedLabel(label),
            fingerprint: DoorSignature.pairFingerprint(signingKey: keys.signingKey, exchangeKey: keys.exchangeKey)
        )
    }

    /// Present until allowed, then make the first signed read, then keep the
    /// pairing. Nothing is kept on any other path.
    func run(
        _ pending: PendingPairing,
        progress: @escaping @Sendable (PairingStep) -> Void = { _ in }
    ) async -> PairingOutcome {
        let offer = pending.offer
        guard let inner = try? PresentationSeal.inner(label: pending.label, keys: pending.keys) else {
            return .failed(.badCode)
        }
        var heard = false
        var attempts = 0
        progress(.presenting)
        presenting: while true {
            if Task.isCancelled { return .failed(.cancelled) }
            guard offer.isOpen(at: now()) else {
                // Shut before the Mac allowed it. If the Mac never answered at
                // all while it was open, that is the thing to say.
                return .failed(attempts > 0 && !heard ? .unreachable : .codeExpired)
            }
            attempts += 1
            do {
                let body = try PresentationSeal.seal(inner, secret: offer.secret)
                switch try await exchange.present(body, to: offer.address) {
                case .allowed:
                    break presenting
                case .pending:
                    if !heard { progress(.waitingForMac) }
                    heard = true
                case .refused:
                    return .failed(.macRefused)
                }
            } catch let failure as DoorFailure {
                switch failure {
                case .wrongKey: return .failed(.wrongKey)
                case .refused: return .failed(heard ? .codeExpired : .windowClosed)
                case .malformed, .unexpectedStatus, .tooLarge, .badPage: return .failed(.strangeAnswer)
                case .cancelled: return .failed(.cancelled)
                case .notPaired: return .failed(.notAvailable)
                case .unreachable, .timedOut: break // again, inside the window
                }
            } catch {
                return .failed(.strangeAnswer)
            }
            do {
                try await pause(Self.presentEvery)
            } catch {
                return .failed(.cancelled)
            }
        }

        progress(.confirming)
        guard let door = PairedDoor(
            address: offer.address,
            macSigningKey: offer.macSigningKey,
            macExchangeKey: offer.macExchangeKey,
            label: pending.label,
            pairedAt: (now().timeIntervalSince1970 * 1000).rounded(.down),
            keys: pending.keys
        ) else { return .failed(.badCode) }

        for attempt in 1...Self.firstReadAttempts {
            if Task.isCancelled { return .failed(.cancelled) }
            do {
                let first = try await exchange.blocked(door)
                do {
                    try store.save(door)
                } catch {
                    return .failed(.couldNotSave)
                }
                return .paired(door, first)
            } catch let failure as DoorFailure {
                switch failure {
                case .refused: return .failed(.notAccepted)
                case .wrongKey: return .failed(.wrongKey)
                // A first read too large or unreadable ends pairing with the
                // pairing screen's own word for an answer it does not know,
                // which says nothing was paired (Copy.pairAnswerUnknown). The
                // list's words for the same answers are a paired phone's, and
                // this phone is not paired: nothing was kept.
                case .malformed, .unexpectedStatus, .tooLarge, .badPage: return .failed(.strangeAnswer)
                case .cancelled: return .failed(.cancelled)
                case .notPaired: return .failed(.notAvailable)
                case .unreachable, .timedOut:
                    if attempt == Self.firstReadAttempts { return .failed(.unreachable) }
                }
            } catch {
                return .failed(.strangeAnswer)
            }
            do {
                try await pause(Self.presentEvery)
            } catch {
                return .failed(.cancelled)
            }
        }
        return .failed(.unreachable)
    }

    /// The label as the Mac will draw it: no control characters, trimmed, and
    /// cut at a whole character to the Mac's 64.
    static func presentedLabel(_ raw: String) -> String {
        let printable = String(String.UnicodeScalarView(raw.unicodeScalars.filter {
            $0.properties.generalCategory != .control && $0.properties.generalCategory != .format
        }))
        var out = ""
        for character in printable.trimmingCharacters(in: .whitespacesAndNewlines) {
            guard out.utf16.count + String(character).utf16.count <= labelMaxUTF16 else { break }
            out.append(character)
        }
        return out
    }
}

#if DEBUG
// MARK: - DEBUG ONLY: the code without a camera

/// The Simulator has no camera. A DEBUG build takes the code as a launch
/// argument instead, and takes this Mac's loopback as a door address. Neither
/// exists in a Release build.
enum PairingDebugSeam {
    /// `-TortieDebugPairingPayload '<the QR text>'`.
    static let payloadArgument = "-TortieDebugPairingPayload"
    /// `-TortieDebugForgetPairing`: start with no pairing kept.
    static let forgetArgument = "-TortieDebugForgetPairing"
    /// Where the door runs in every agent run.
    static let loopbackHost = "127.0.0.1"

    /// The injected code, or nil.
    static func injectedPayload(_ arguments: [String] = ProcessInfo.processInfo.arguments) -> String? {
        guard let flag = arguments.firstIndex(of: payloadArgument), arguments.indices.contains(flag + 1) else {
            return nil
        }
        return arguments[flag + 1]
    }

    static func forgetRequested(_ arguments: [String] = ProcessInfo.processInfo.arguments) -> Bool {
        arguments.contains(forgetArgument)
    }
}
#endif
