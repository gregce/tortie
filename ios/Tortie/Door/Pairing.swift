// Pairing.swift — reading the Mac's code, presenting, and knowing when it is
// done (Phase 316.2; the phone off the tailnet since Phase 330).
//
// THE ORDER, and the order is the Mac's (src/main/pocket/pairing.ts,
// build/p330/SPEC.md sections 4.7 and 4.8):
//
//   1. The Mac draws a QR (v:3) holding its PUBLIC NAME (`<mac>.<tailnet>.ts.net`,
//      published by Tailscale Funnel), the public port (8443 or 10000), `fp`
//      (the pin), its two public keys, a one-shot secret `ps` and the window's
//      end `exp`. No address and no credential.
//   2. The phone makes its two key pairs and a P-256 CLIENT KEY
//      (Door/Keys.swift), and draws the fingerprint of all THREE public keys,
//      six groups of four, which the Mac draws too.
//   3. The phone PRESENTS: `POST /pair` with `{ck, ek, label, xk}` sealed with
//      AES-256-GCM under HKDF-SHA256(`ps`, empty salt, `tortie-pocket-pair-v1`),
//      and the seal SIGNED with its Ed25519 key over the window's challenge,
//      HKDF-SHA256(`ps`, empty salt, `tortie-pocket-challenge-v1`), so only the
//      phone that holds the key it names can be told it was allowed. It
//      presents again every 2 seconds until the door answers `allowed` or the
//      window ends. A name that does not resolve yet is tried again inside the
//      window, and SAID (the first time a Mac publishes, its name can take
//      minutes to reach the phone: his measurement was about 8).
//
//      THE ALERT ADDRESS (Phase 316.5). Alerts are the Apple push key holder's
//      alone (research 136 section 9), so the phone asks iOS for alerts ONLY
//      when the Mac's `pending` answer says it can send (`"alerts": true`). It
//      asks once, on the first such answer, which is after the fingerprint is
//      drawn and before he can have allowed anything; with an address it
//      presents again at once carrying `apt` and `ape`, both or neither, which
//      is the one way the Mac learns it. The Mac holds whatever it last
//      answered `pending` to, so the pairing keeps THAT presentation's address
//      and the Mac's word with it; a denial, or an Allow that came first, keeps
//      none, and pairs all the same.
//   4. He matches the fingerprint and presses Allow ON THE MAC. The Mac asks
//      last. `allowed` carries the certificate the Mac issued over the client
//      key.
//   5. THE PHONE IS PAIRED ONLY WHEN ITS FIRST SIGNED READ SUCCEEDS, over a
//      connection presenting that certificate. Nothing is written to the
//      Keychain as a pairing until a signed `/v1/blocked` comes back whole, and
//      every attempt that ends any other way deletes its client key.
//
// WHAT THE CODE HOLDS. `ps` is a one-shot secret that dies with the window. It
// lives only in the parsed offer in memory and is never stored or logged. A
// value that holds it mirrors itself without it, and `print`, `dump`,
// `String(describing:)`, `String(reflecting:)` and interpolation all read a
// value through its mirror when it declares no description, so none of them
// repeats it (conformance:ios rule p). The raw code, which carries it too, is
// only ever compared, parsed or handed on under a name the rule watches.
//
// THE DEBUG SEAM. The Simulator has no camera, so a DEBUG build takes the
// code as a launch argument (`PairingDebugSeam`), inside `#if DEBUG`
// (conformance:ios rule d). The code's name is a public name in every build;
// where a DEBUG build opens its connections is Door/Transport.swift's.

import CryptoKit
import Foundation

// MARK: - The code the Mac draws

/// What the QR carries, checked. Nothing in it is trusted before this.
struct PairingOffer: Sendable, Equatable, CustomReflectable {
    /// `POCKET_QR_VERSION`.
    static let version = 3
    /// Far above any real code (a few hundred characters); anything longer
    /// is not a Tortie code and is not parsed.
    static let maxPayloadBytes = 4096

    let door: DoorEndpoint
    /// `dk`, the Mac's Ed25519 SPKI, base64url.
    let macSigningKey: String
    /// `dx`, the Mac's X25519 SPKI, base64url.
    let macExchangeKey: String
    /// `ps`, the one-shot secret. Memory only.
    let secret: Data
    /// `exp`, epoch ms on the Mac's clock.
    let expiresAt: Double

    /// Is the window still open by this phone's clock?
    func isOpen(at date: Date) -> Bool {
        date.timeIntervalSince1970 * 1000 < expiresAt
    }

    /// What `print`, `dump`, `String(describing:)`, `String(reflecting:)`
    /// and interpolation see: the door, and never the secret.
    var customMirror: Mirror { Mirror(self, children: ["door": door], displayStyle: .struct) }

    private struct Wire: Decodable, CustomReflectable {
        let v: Int
        let host: String
        let port: Int
        let fp: String
        let dk: String
        let dx: String
        let ps: String
        let exp: Double

        /// The code as read, which holds the one-shot secret, so it shows
        /// nothing.
        var customMirror: Mirror { Mirror(self, children: [:], displayStyle: .struct) }
    }

    /// The code, or `badCode` / `unsupportedCode`. Unknown fields are
    /// ignored; a field that is present and wrong refuses the whole code.
    static func parse(_ payload: String) throws -> PairingOffer {
        guard !payload.isEmpty, payload.utf8.count <= maxPayloadBytes,
              let wire = try? JSONDecoder().decode(Wire.self, from: Data(payload.utf8)) else {
            throw PairingFailure.badCode
        }
        guard wire.v == version else { throw PairingFailure.unsupportedCode }
        guard DoorEndpoint.isPublicName(wire.host),
              DoorEndpoint.publicPorts.contains(wire.port),
              let pin = Base64URL.decode(wire.fp), pin.count == 32, Base64URL.encode(pin) == wire.fp,
              SPKI.ed25519Key(wire.dk) != nil,
              SPKI.x25519Key(wire.dx) != nil,
              let secret = Base64URL.decode(wire.ps), (16...64).contains(secret.count),
              wire.exp.isFinite, wire.exp > 0 else {
            throw PairingFailure.badCode
        }
        return PairingOffer(
            door: DoorEndpoint(name: wire.host, port: wire.port, pin: wire.fp),
            macSigningKey: wire.dk,
            macExchangeKey: wire.dx,
            secret: secret,
            expiresAt: wire.exp
        )
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
    /// `/pair` answered something that is not one of its three answers, or a
    /// certificate that is not over this phone's key.
    case strangeAnswer
    /// The door did not present the key the code pinned.
    case wrongKey
    /// Allowed, but the first signed read was refused: this phone is not the
    /// one the Mac allowed.
    case notAccepted
    /// The Mac could not be reached inside the window.
    case unreachable
    /// The Mac's public name never resolved inside the window.
    case nameNotFound
    /// The Keychain would not keep the client key or the pairing.
    case couldNotSave
    /// This build has no way to reach a Mac.
    case notAvailable
    /// The person left the pairing screen.
    case cancelled
}

// MARK: - The sealed, signed presentation

/// `{ck, ek, label, xk}`, and `{ape, apt}` when the phone has an alert
/// address, sealed the way `PocketPairing.openPresentation` opens it, and
/// signed over the window's challenge the way `present` checks it.
enum PresentationSeal {
    /// `PAIRING_INFO`.
    static let info = "tortie-pocket-pair-v1"
    /// The HKDF info the window's challenge is derived under.
    static let challengeInfo = "tortie-pocket-challenge-v1"
    /// The proof's first line.
    static let proofLead = "tortie-pocket-present-v1"

    /// HKDF-SHA256 over the one-shot secret, empty salt, 32 bytes.
    static func key(secret: Data) -> SymmetricKey {
        HKDF<SHA256>.deriveKey(
            inputKeyMaterial: SymmetricKey(data: secret),
            salt: Data(),
            info: Data(info.utf8),
            outputByteCount: 32
        )
    }

    /// The window's challenge, base64url: HKDF-SHA256(`ps`, empty salt,
    /// `tortie-pocket-challenge-v1`, 32). The Mac computes it when it opens the
    /// window and keeps it until the deadline.
    static func challenge(secret: Data) -> String {
        let derived = HKDF<SHA256>.deriveKey(
            inputKeyMaterial: SymmetricKey(data: secret),
            salt: Data(),
            info: Data(challengeInfo.utf8),
            outputByteCount: 32
        )
        return derived.withUnsafeBytes { Base64URL.encode(Data($0)) }
    }

    /// What the signature covers: the lead, the challenge and the three sealed
    /// fields as they are sent, one per line.
    static func proofText(challenge: String, iv: String, ct: String, tag: String) -> String {
        [proofLead, challenge, iv, ct, tag].joined(separator: "\n")
    }

    // Declared in the door's own order, which is NOT the order they are
    // written in: the encoder sorts the keys, so the bytes are the same on
    // every run and the vectors can hold them.
    //
    // THE ALERT ADDRESS (Phase 316.5) is the device token `apt` and its
    // environment `ape`, the names `presentedPush` reads on the Mac. They are
    // written only when present (the synthesised encoder's `encodeIfPresent`),
    // so a phone with no address presents exactly the bytes it did before, and
    // this struct is the one place the app spells either name for the wire
    // (conformance:ios rule x).
    private struct Inner: Encodable {
        let label: String
        let ek: String
        let xk: String
        let ck: String
        let apt: String?
        let ape: String?
    }

    /// The sealed fields, each base64url.
    struct Sealed: Codable, Equatable {
        let iv: String
        let ct: String
        let tag: String
    }

    private struct Body: Encodable {
        let iv: String
        let ct: String
        let tag: String
        let ek: String
        let sig: String
    }

    private static func encoder() -> JSONEncoder {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.sortedKeys, .withoutEscapingSlashes]
        return encoder
    }

    /// The plaintext: `{"ck":…,"ek":…,"label":…,"xk":…}`, keys sorted, or
    /// `{"ape":…,"apt":…,"ck":…,"ek":…,"label":…,"xk":…}` with an address.
    static func inner(label: String, keys: PhoneKeys, clientKey: String, push: PushAddress?) throws -> Data {
        try encoder().encode(Inner(
            label: label, ek: keys.signingKey, xk: keys.exchangeKey, ck: clientKey,
            apt: push?.token, ape: push?.environment.rawValue
        ))
    }

    /// The seal. A fresh 12-byte nonce every time unless a test names one.
    static func seal(_ inner: Data, secret: Data, nonce: AES.GCM.Nonce = AES.GCM.Nonce()) throws -> Sealed {
        let box = try AES.GCM.seal(inner, using: key(secret: secret), nonce: nonce)
        let iv = nonce.withUnsafeBytes { Data($0) }
        return Sealed(iv: Base64URL.encode(iv), ct: Base64URL.encode(box.ciphertext), tag: Base64URL.encode(box.tag))
    }

    /// The body `POST /pair` carries: `{"ct":…,"ek":…,"iv":…,"sig":…,"tag":…}`,
    /// the seal and the phone's Ed25519 signature over the proof.
    static func body(_ sealed: Sealed, challenge: String, keys: PhoneKeys) throws -> Data {
        let proof = proofText(challenge: challenge, iv: sealed.iv, ct: sealed.ct, tag: sealed.tag)
        let signature = try keys.signing.signature(for: Data(proof.utf8))
        return try encoder().encode(
            Body(iv: sealed.iv, ct: sealed.ct, tag: sealed.tag, ek: keys.signingKey, sig: Base64URL.encode(signature))
        )
    }

    /// Open a body sealed the Mac's way. The tests use it on what the door's
    /// own sealer (`sealPresentationAsPhone`) produced.
    static func open(_ body: Data, secret: Data) throws -> Data {
        let outer = try JSONDecoder().decode(Sealed.self, from: body)
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
/// to draw. Nothing of it is stored but the client key, under its tag, which
/// the attempt deletes unless it ends paired.
struct PendingPairing: Sendable {
    let offer: PairingOffer
    let keys: PhoneKeys
    let clientKey: ClientKey
    let label: String
    /// Six groups of four, the Mac's `pairFingerprint` of the phone's three keys.
    let fingerprint: String
}

/// Where a pairing has got to, for the screen. Every step has its line
/// (Screens/DoorWords.swift, conformance:ios rule v).
enum PairingStep: Equatable, Sendable {
    /// Presenting; the Mac has not answered yet.
    case presenting
    /// The Mac's public name does not resolve yet; presenting again.
    case findingName
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

    /// Make the phone's keys for this code, the client key among them.
    /// `label` is what the Mac will show beside the fingerprint.
    func begin(_ offer: PairingOffer, label: String, keys: PhoneKeys = .generate()) throws -> PendingPairing {
        let clientKey: ClientKey
        do {
            clientKey = try store.clientKeys.mint()
        } catch {
            throw PairingFailure.couldNotSave
        }
        return PendingPairing(
            offer: offer,
            keys: keys,
            clientKey: clientKey,
            label: Self.presentedLabel(label),
            fingerprint: DoorSignature.pairFingerprint(
                signingKey: keys.signingKey, exchangeKey: keys.exchangeKey, clientKey: clientKey.spki
            )
        )
    }

    /// Present until allowed, then make the first signed read over the
    /// phone's new identity, then keep the pairing. Nothing is kept on any
    /// other path, and the attempt's client key is deleted.
    ///
    /// `askForAlerts` is iOS's question and this phone's address. It is asked
    /// at most once, and only when the Mac answers `pending` saying it can send
    /// an alert; a pairing with a Mac that cannot never asks.
    func run(
        _ pending: PendingPairing,
        askForAlerts: @escaping @Sendable () async -> PushAddress? = { nil },
        progress: @escaping @Sendable (PairingStep) -> Void = { _ in }
    ) async -> PairingOutcome {
        let outcome = await attempt(pending, askForAlerts: askForAlerts, progress: progress)
        if case .failed = outcome {
            store.clientKeys.delete(tag: pending.clientKey.tag)
        }
        return outcome
    }

    private func attempt(
        _ pending: PendingPairing,
        askForAlerts: @escaping @Sendable () async -> PushAddress?,
        progress: @escaping @Sendable (PairingStep) -> Void
    ) async -> PairingOutcome {
        let offer = pending.offer
        let inner = { (push: PushAddress?) in
            try? PresentationSeal.inner(
                label: pending.label, keys: pending.keys, clientKey: pending.clientKey.spki, push: push
            )
        }
        // The address the next presentation carries, and its plaintext.
        var offered: PushAddress?
        guard var plaintext = inner(nil) else {
            return .failed(.badCode)
        }
        // What the Mac holds: the address of the last presentation it
        // answered `pending` to, and what that answer said about alerts. An
        // `allowed` does not open the presentation it answers, so these, and
        // not what was last sent, are what the pairing keeps.
        var held: PushAddress?
        var macSends = false
        var asked = false
        let challenge = PresentationSeal.challenge(secret: offer.secret)
        var heard = false
        var miss: PairingFailure?
        var said = PairingStep.presenting
        progress(said)
        let say = { (step: PairingStep) in
            guard step != said else { return }
            said = step
            progress(step)
        }
        var certificate = Data()
        presenting: while true {
            if Task.isCancelled { return .failed(.cancelled) }
            guard offer.isOpen(at: now()) else {
                // Shut before the Mac allowed it. If the Mac never answered at
                // all while it was open, that is the thing to say.
                return .failed(heard ? .codeExpired : (miss ?? .codeExpired))
            }
            do {
                let sealed = try PresentationSeal.seal(plaintext, secret: offer.secret)
                let body = try PresentationSeal.body(sealed, challenge: challenge, keys: pending.keys)
                switch try await exchange.present(body, to: offer.door) {
                case .allowed(let issued):
                    certificate = issued
                    break presenting
                case .pending(let sends):
                    if !heard { say(.waitingForMac) }
                    heard = true
                    held = offered
                    macSends = sends
                    // The Mac can send: iOS's question, once. An address is
                    // presented at once, with no pause, so the Mac holds it as
                    // soon as it can; an Allow he pressed while iOS was asking
                    // is answered to that presentation, and keeps none.
                    if sends, !asked {
                        asked = true
                        if let address = await askForAlerts(), let next = inner(address) {
                            offered = address
                            plaintext = next
                            continue presenting
                        }
                    }
                case .refused:
                    return .failed(.macRefused)
                }
            } catch let failure as DoorFailure {
                switch failure {
                case .wrongKey: return .failed(.wrongKey)
                case .refused, .closedBeforeAnswer: return .failed(heard ? .codeExpired : .windowClosed)
                case .malformed, .unexpectedStatus, .tooLarge, .badPage: return .failed(.strangeAnswer)
                case .cancelled: return .failed(.cancelled)
                case .notPaired: return .failed(.notAvailable)
                case .nameNotFound:
                    // Again, inside the window, and said.
                    miss = .nameNotFound
                    if !heard { say(.findingName) }
                case .unreachable, .timedOut:
                    miss = .unreachable
                    if !heard { say(.presenting) }
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

        say(.confirming)
        let identity: ClientIdentity
        do {
            identity = try store.clientKeys.adopt(certificate, for: pending.clientKey)
        } catch KeysFailure.clientKey {
            return .failed(.strangeAnswer)
        } catch {
            return .failed(.couldNotSave)
        }
        guard let door = PairedDoor(
            endpoint: offer.door,
            macSigningKey: offer.macSigningKey,
            macExchangeKey: offer.macExchangeKey,
            label: pending.label,
            pairedAt: (now().timeIntervalSince1970 * 1000).rounded(.down),
            keys: pending.keys,
            clientKey: pending.clientKey,
            certificate: certificate,
            identity: identity,
            alerts: AlertsKept(macSends: macSends, presented: held)
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
                case .refused, .closedBeforeAnswer: return .failed(.notAccepted)
                case .wrongKey: return .failed(.wrongKey)
                // A first read too large or unreadable ends pairing with the
                // pairing screen's own word for an answer it does not know,
                // which says nothing was paired (Copy.pairAnswerUnknown). The
                // list's words for the same answers are a paired phone's, and
                // this phone is not paired: nothing was kept.
                case .malformed, .unexpectedStatus, .tooLarge, .badPage: return .failed(.strangeAnswer)
                case .cancelled: return .failed(.cancelled)
                case .notPaired: return .failed(.notAvailable)
                case .unreachable, .timedOut, .nameNotFound:
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
/// argument instead. It does not exist in a Release build.
enum PairingDebugSeam {
    /// `-TortieDebugPairingPayload '<the QR text>'`.
    static let payloadArgument = "-TortieDebugPairingPayload"
    /// `-TortieDebugForgetPairing`: start with no pairing kept.
    static let forgetArgument = "-TortieDebugForgetPairing"

    /// The injected code, or nil.
    static func injectedPayload(_ arguments: [String] = ProcessInfo.processInfo.arguments) -> String? {
        arguments.drop(while: { $0 != payloadArgument }).dropFirst().first
    }

    static func forgetRequested(_ arguments: [String] = ProcessInfo.processInfo.arguments) -> Bool {
        arguments.contains(forgetArgument)
    }
}
#endif
