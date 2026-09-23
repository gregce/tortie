import CryptoKit
import Foundation
import Security
import XCTest
@testable import Tortie

/// The door client against the SHIPPING TypeScript, byte for byte.
///
/// Every expected value below was written by `build/p316/vectors.mjs`, which
/// runs the door's own functions (src/main/pocket/pairing.ts, tls.ts,
/// routes.ts, facts.ts) and checks each one against the door's own verifier
/// or opener before it writes it. `node build/p316/vectors.mjs --check` holds
/// the file to the tree. The Swift is not the judge of the Swift here: the
/// door is.
///
/// Each test names the clause it holds and fails when that clause is taken
/// out of `ios/Tortie/Door/`.
final class DoorVectorTests: XCTestCase {
    private var v: DoorVectorFile!

    override func setUpWithError() throws {
        v = try DoorVectorFile.load()
    }

    private func data(hex: String) throws -> Data {
        try XCTUnwrap(Hex.decode(hex), "not hex")
    }

    private func phoneKeys() throws -> PhoneKeys {
        try PhoneKeys(
            signingSeed: try data(hex: v.keys.phoneSigningSeed),
            exchangeSeed: try data(hex: v.keys.phoneExchangeSeed)
        )
    }

    // MARK: Encodings

    /// Clause: base64url is Node's spelling: url-safe alphabet, no padding,
    /// and nothing else decodes.
    func testBase64URLIsNodesSpelling() {
        XCTAssertEqual(Base64URL.encode(Data([0xfb, 0xff])), "-_8")
        XCTAssertEqual(Base64URL.decode("-_8"), Data([0xfb, 0xff]))
        for text in ["+_8", "-/8", "-_8=", "a", "ab cd", "ab\ncd"] {
            XCTAssertNil(Base64URL.decode(text), text)
        }
        XCTAssertEqual(Hex.encode([0x00, 0xab, 0xff]), "00abff")
        XCTAssertEqual(Hex.decode("00ABff"), Data([0x00, 0xab, 0xff]))
        XCTAssertNil(Hex.decode("0g"))
        XCTAssertNil(Hex.decode("abc"))
    }

    // MARK: Keys and identity

    /// Clause: the phone's public keys are sent as base64url SPKI DER, the
    /// door's `export({ format: 'der', type: 'spki' })`.
    func testKeysAreSentAsTheDoorsSPKI() throws {
        let keys = try phoneKeys()
        XCTAssertEqual(keys.signingKey, v.keys.phoneSigningKey)
        XCTAssertEqual(keys.exchangeKey, v.keys.phoneExchangeKey)
        let macSigning = try Curve25519.Signing.PrivateKey(rawRepresentation: try data(hex: v.keys.macSigningSeed))
        let macExchange = try Curve25519.KeyAgreement.PrivateKey(rawRepresentation: try data(hex: v.keys.macExchangeSeed))
        XCTAssertEqual(SPKI.ed25519(macSigning.publicKey), v.keys.macSigningKey)
        XCTAssertEqual(SPKI.x25519(macExchange.publicKey), v.keys.macExchangeKey)
        XCTAssertNotNil(SPKI.ed25519Key(v.keys.macSigningKey))
        XCTAssertNil(SPKI.ed25519Key(v.keys.macExchangeKey), "an X25519 SPKI is not an Ed25519 key")
        XCTAssertNil(SPKI.x25519Key(v.keys.macSigningKey), "an Ed25519 SPKI is not an X25519 key")
    }

    /// Clause: `x-tortie-phone` is `phoneIdOf`, and the fingerprint is
    /// `pairFingerprint`, six groups of four.
    func testPhoneIdAndFingerprintAreTheDoors() throws {
        XCTAssertEqual(DoorSignature.phoneId(signingKey: v.keys.phoneSigningKey), v.identity.phoneId)
        XCTAssertEqual(
            DoorSignature.pairFingerprint(signingKey: v.keys.phoneSigningKey, exchangeKey: v.keys.phoneExchangeKey),
            v.identity.fingerprint
        )
        XCTAssertEqual(v.identity.fingerprint.split(separator: " ").count, 6)
    }

    /// Clause: the binding is HKDF-SHA256 over the X25519 secret with salt
    /// `<Mac xpub>\n<phone xpub>` and info `tortie-pocket-bind-v1`. The Mac
    /// derived the expected value from ITS side; this derives it from the
    /// phone's.
    func testBindingIsTheDoorsFromThePhonesSide() throws {
        let keys = try phoneKeys()
        XCTAssertEqual(
            DoorSignature.binding(phoneExchange: keys.exchange, macExchangeKey: v.keys.macExchangeKey),
            v.identity.binding
        )
        let door = try XCTUnwrap(PairedDoor(
            address: DoorAddress(host: "127.0.0.1", port: 8823, pin: v.pins[0].pin),
            macSigningKey: v.keys.macSigningKey,
            macExchangeKey: v.keys.macExchangeKey,
            label: v.seal.label,
            pairedAt: 0,
            keys: keys
        ))
        XCTAssertEqual(door.binding, v.identity.binding)
        XCTAssertEqual(door.phoneId, v.identity.phoneId)
        XCTAssertEqual(door.fingerprint, v.identity.fingerprint)
    }

    // MARK: The signature

    /// Clause: the canonical text is seven lines, the method raised, exactly
    /// `canonicalRequestText`; and the body hash is sha256 hex.
    func testCanonicalTextIsTheDoorsByteForByte() throws {
        XCTAssertGreaterThanOrEqual(v.requests.count, 5)
        for r in v.requests {
            XCTAssertEqual(Hex.sha256(Data(r.body.utf8)), r.bodySha256, r.name)
            let text = DoorSignature.canonicalText(
                method: r.method, target: r.target, bodySha256: r.bodySha256,
                timestamp: r.timestamp, nonce: r.nonce, binding: v.identity.binding
            )
            XCTAssertEqual(Data(text.utf8), Data(r.canonical.utf8), r.name)
        }
    }

    /// Clause: the door's Ed25519 signature over that text verifies here, and
    /// the phone's own signature over the same text verifies under the same
    /// key. (CryptoKit signs with randomness, so its bytes are not Node's.)
    func testSignaturesVerifyBothWays() throws {
        let keys = try phoneKeys()
        let door = try XCTUnwrap(PairedDoor(
            address: DoorAddress(host: "127.0.0.1", port: 8823, pin: v.pins[0].pin),
            macSigningKey: v.keys.macSigningKey,
            macExchangeKey: v.keys.macExchangeKey,
            label: v.seal.label,
            pairedAt: 0,
            keys: keys
        ))
        for r in v.requests {
            let fromDoor = try XCTUnwrap(Base64URL.decode(r.signature), r.name)
            XCTAssertTrue(keys.signing.publicKey.isValidSignature(fromDoor, for: Data(r.canonical.utf8)), r.name)
            let headers = try door.signer.headers(
                method: r.method, target: r.target, body: Data(r.body.utf8), timestamp: r.timestamp, nonce: r.nonce
            )
            XCTAssertEqual(headers.map(\.name), ["x-tortie-phone", "x-tortie-timestamp", "x-tortie-nonce", "x-tortie-signature"])
            XCTAssertEqual(headers[0].value, v.identity.phoneId)
            XCTAssertEqual(headers[1].value, r.timestamp)
            XCTAssertEqual(headers[2].value, r.nonce)
            let mine = try XCTUnwrap(Base64URL.decode(headers[3].value))
            XCTAssertEqual(mine.count, 64)
            XCTAssertTrue(keys.signing.publicKey.isValidSignature(mine, for: Data(r.canonical.utf8)), r.name)
        }
    }

    /// Clause: the target is covered. The door refused this signature for
    /// another target (`signature`), and so does CryptoKit.
    func testATargetTheSignatureWasNotMadeForDoesNotVerify() throws {
        XCTAssertEqual(v.tampered.doorSays, "signature")
        let keys = try phoneKeys()
        let signed = try XCTUnwrap(v.requests.first { $0.name == v.tampered.signedFor })
        let signature = try XCTUnwrap(Base64URL.decode(signed.signature))
        XCTAssertFalse(keys.signing.publicKey.isValidSignature(signature, for: Data(v.tampered.canonical.utf8)))
        let text = DoorSignature.canonicalText(
            method: "GET", target: v.tampered.target, bodySha256: signed.bodySha256,
            timestamp: signed.timestamp, nonce: signed.nonce, binding: v.identity.binding
        )
        XCTAssertEqual(text, v.tampered.canonical)
    }

    /// Clause: the client spells every target the way the vectors do, and the
    /// door's own URL parser read each back to the same bytes and the same id
    /// (vectors.mjs asserts that half).
    func testTargetsAreSpelledAsTheDoorReadsThem() throws {
        let byName = Dictionary(uniqueKeysWithValues: v.requests.map { ($0.name, $0) })
        XCTAssertEqual(DoorClient.blockedTarget, byName["blocked"]?.target)
        let session = try XCTUnwrap(byName["session"])
        XCTAssertEqual(DoorClient.sessionTarget(try XCTUnwrap(session.id)), session.target)
        let older = try XCTUnwrap(byName["turns-older"])
        XCTAssertEqual(DoorClient.turnsTarget(try XCTUnwrap(older.id), limit: 20, to: 24), older.target)
        let odd = try XCTUnwrap(byName["odd-id"])
        XCTAssertEqual(DoorClient.sessionTarget(try XCTUnwrap(odd.id)), odd.target)
        XCTAssertEqual(DoorClient.pairTarget, byName["lowercase-method-with-body"]?.target)
    }

    // MARK: The pin

    private func certificate(_ pin: DoorVectorFile.Pin) throws -> SecCertificate {
        let der = try XCTUnwrap(Data(base64Encoded: pin.certificateDer))
        return try XCTUnwrap(SecCertificateCreateWithData(nil, der as CFData))
    }

    private func trust(_ certificate: SecCertificate) throws -> SecTrust {
        var trust: SecTrust?
        let status = SecTrustCreateWithCertificates(certificate, SecPolicyCreateBasicX509(), &trust)
        XCTAssertEqual(status, errSecSuccess)
        return try XCTUnwrap(trust)
    }

    /// Clause: the pin is sha256 over the leaf's P-256 SPKI, base64url, which
    /// is `spkiPinOf(publicKeyFingerprint)` for a certificate `tls.ts` issued,
    /// and it is NOT the certificate's own hash.
    func testThePinIsThePublicKeysHashNotTheCertificates() throws {
        XCTAssertEqual(v.pins.count, 2)
        for pin in v.pins {
            let cert = try certificate(pin)
            XCTAssertEqual(DoorPin.of(cert), pin.pin, pin.name)
            let der = try XCTUnwrap(Data(base64Encoded: pin.certificateDer))
            XCTAssertNotEqual(DoorPin.of(cert), Base64URL.encode(Data(SHA256.hash(data: der))), pin.name)
        }
    }

    /// Clause: the delegate's question. The right leaf matches its pin; another
    /// door's leaf does not; nor does a pin of the wrong length.
    func testTheTrustMatchesOnlyItsOwnPin() throws {
        let first = try trust(try certificate(v.pins[0]))
        let second = try trust(try certificate(v.pins[1]))
        XCTAssertTrue(DoorPin.matches(first, pin: v.pins[0].pin))
        XCTAssertTrue(DoorPin.matches(second, pin: v.pins[1].pin))
        XCTAssertFalse(DoorPin.matches(first, pin: v.pins[1].pin))
        XCTAssertFalse(DoorPin.matches(second, pin: v.pins[0].pin))
        XCTAssertFalse(DoorPin.matches(first, pin: ""))
        XCTAssertFalse(DoorPin.matches(first, pin: String(v.pins[0].pin.dropLast())))
    }

    // MARK: The sealed presentation

    /// Clause: the AES-256-GCM key is HKDF-SHA256(`ps`, empty salt,
    /// `tortie-pocket-pair-v1`) and the body is `{iv, ct, tag}`: what the
    /// door's own sealer made opens here to its plaintext.
    func testTheDoorsSealOpensHere() throws {
        let secret = try XCTUnwrap(Base64URL.decode(v.seal.secret))
        let opened = try PresentationSeal.open(Data(v.seal.fromDoor.body.utf8), secret: secret)
        XCTAssertEqual(opened, Data(v.seal.fromDoor.plaintext.utf8))
        var wrong = secret
        wrong[0] ^= 0x01
        XCTAssertThrowsError(try PresentationSeal.open(Data(v.seal.fromDoor.body.utf8), secret: wrong))
    }

    /// Clause: the phone's plaintext and its seal, at a fixed nonce, are the
    /// bytes the door's opener opened to these keys and this label.
    func testThePhonesSealIsTheBodyTheDoorOpened() throws {
        let secret = try XCTUnwrap(Base64URL.decode(v.seal.secret))
        let keys = try phoneKeys()
        let inner = try PresentationSeal.inner(label: v.seal.label, keys: keys)
        XCTAssertEqual(inner, Data(v.seal.fromPhone.plaintext.utf8))
        let iv = try XCTUnwrap(Base64URL.decode(v.seal.fromPhone.iv))
        let body = try PresentationSeal.seal(inner, secret: secret, nonce: try AES.GCM.Nonce(data: iv))
        XCTAssertEqual(String(decoding: body, as: UTF8.self), v.seal.fromPhone.body)
    }

    /// Clause: every presentation gets a fresh nonce, so two seals of one
    /// plaintext differ and both open.
    func testEverySealHasAFreshNonce() throws {
        let secret = try XCTUnwrap(Base64URL.decode(v.seal.secret))
        let inner = try PresentationSeal.inner(label: v.seal.label, keys: try phoneKeys())
        let one = try PresentationSeal.seal(inner, secret: secret)
        let two = try PresentationSeal.seal(inner, secret: secret)
        XCTAssertNotEqual(one, two)
        XCTAssertEqual(try PresentationSeal.open(one, secret: secret), inner)
        XCTAssertEqual(try PresentationSeal.open(two, secret: secret), inner)
    }

    // MARK: QR v:2

    /// Clause: the QR the shipping window mints parses to exactly its fields.
    func testTheShippingQRParses() throws {
        for qr in v.qr {
            let fields = try XCTUnwrap(
                JSONSerialization.jsonObject(with: Data(qr.payload.utf8)) as? [String: Any], qr.name
            )
            #if !DEBUG
            if qr.name == "loopback" {
                XCTAssertThrowsError(try PairingOffer.parse(qr.payload), "a Release build takes no loopback door")
                continue
            }
            #endif
            let offer = try PairingOffer.parse(qr.payload)
            XCTAssertEqual(offer.address.host, fields["host"] as? String, qr.name)
            XCTAssertEqual(offer.address.port, fields["port"] as? Int, qr.name)
            XCTAssertEqual(offer.address.pin, fields["fp"] as? String, qr.name)
            XCTAssertEqual(offer.address.pin, v.pins[0].pin, qr.name)
            XCTAssertEqual(offer.macSigningKey, v.keys.macSigningKey, qr.name)
            XCTAssertEqual(offer.macExchangeKey, v.keys.macExchangeKey, qr.name)
            XCTAssertEqual(offer.secret, Base64URL.decode(try XCTUnwrap(fields["ps"] as? String)), qr.name)
            XCTAssertEqual(offer.secret.count, 16, qr.name)
            XCTAssertEqual(offer.expiresAt, (fields["exp"] as? NSNumber)?.doubleValue, qr.name)
            XCTAssertEqual(offer.tailnetKey, fields["tk"] as? String, qr.name)
        }
        let keyed = try XCTUnwrap(v.qr.first { $0.name == "tailnet-with-key" })
        XCTAssertEqual(try PairingOffer.parse(keyed.payload).tailnetKey, v.madeUpTailnetKey)
    }

    // MARK: The answers

    private func answer(_ name: String) throws -> DoorVectorFile.Answer {
        try XCTUnwrap(v.answers[name], "no answer vector \(name)")
    }

    /// Decode, re-encode, and compare with the door's bytes as JSON values,
    /// nulls dropped on both sides (an absent optional encodes as absent). A
    /// field read into the wrong property, or not read, fails here.
    private func assertRoundTrip<T: Codable>(_ type: T.Type, _ name: String) throws -> T {
        let vector = try answer(name)
        let decoded = try JSONDecoder().decode(type, from: Data(vector.json.utf8))
        let unknown = try JSONDecoder().decode(type, from: Data(vector.withUnknown.utf8))
        let again = try JSONEncoder().encode(decoded)
        let theirs = DoorVectorFile.withoutNulls(try JSONSerialization.jsonObject(with: Data(vector.json.utf8)))
        let ours = DoorVectorFile.withoutNulls(try JSONSerialization.jsonObject(with: again))
        XCTAssertEqual(ours as? NSObject, theirs as? NSObject, "\(name) does not read back as the door wrote it")
        let againUnknown = try JSONEncoder().encode(unknown)
        XCTAssertEqual(
            DoorVectorFile.withoutNulls(try JSONSerialization.jsonObject(with: againUnknown)) as? NSObject,
            theirs as? NSObject,
            "\(name): a field the phone does not know changed what it read"
        )
        return decoded
    }

    /// Clause: every field of all three answers is read, unknown fields are
    /// ignored, and the words are main's.
    func testEveryAnswerReadsBackAsTheDoorWroteIt() throws {
        let blocked = try assertRoundTrip(PocketBlockedAnswer.self, "blocked")
        XCTAssertEqual(blocked.rows.map(\.statusTitle), ["Needs input"])
        XCTAssertEqual(blocked.rows.first?.question, "Do you want to **proceed** with `rm -rf build`?")
        XCTAssertEqual(blocked.rows.first?.choices.map(\.marker), ["1", "2"])
        XCTAssertEqual(blocked.rows.first?.dot, .attention)
        XCTAssertEqual(blocked.others.map(\.statusTitle), ["Working", "Idle", "Idle", "Failed (exit 1)"])
        XCTAssertEqual(blocked.others.map(\.machine), [nil, nil, "Mac Pro", nil])
        XCTAssertEqual(blocked.others.last?.dot, .failed)
        XCTAssertEqual(blocked.emptyLine, "Nothing needs you")

        let talk = try assertRoundTrip(PocketSessionAnswer.self, "session-talk")
        XCTAssertEqual(talk.session.turnCount, 45)
        XCTAssertEqual(talk.session.activity?.userMessages, 45)
        XCTAssertEqual(talk.session.statusTitle, "Working")
        XCTAssertNil(talk.session.handoff)

        let waiting = try assertRoundTrip(PocketSessionAnswer.self, "session-waiting")
        XCTAssertNil(waiting.session.activity?.userMessages, "a null count is never a zero")
        XCTAssertNil(waiting.session.lastMessageText)
        XCTAssertEqual(waiting.session.choices.count, 2)

        for name in ["turns-newest", "turns-to-24", "turns-to-4", "turns-quiet", "turns-remote"] {
            _ = try assertRoundTrip(PocketTurnsAnswer.self, name)
        }
        let remote = try JSONDecoder().decode(PocketTurnsAnswer.self, from: Data(try answer("turns-remote").json.utf8))
        XCTAssertNotNil(remote.note, "a remote row's turns carry main's sentence, not an error")
    }

    /// Clause: the ask arrives exactly as he typed it, markdown characters and
    /// all, and so does the answer; the phone decodes and never rewrites.
    func testTheAskAndTheAnswerArriveVerbatim() throws {
        let page = try JSONDecoder().decode(PocketTurnsAnswer.self, from: Data(try answer("turns-to-24").json.utf8))
        let seven = try XCTUnwrap(page.turns.first { $0.index == 7 })
        XCTAssertEqual(seven.askText, "Keep **this** plain and _that_ `too`")
        XCTAssertEqual(seven.answerText, "**x** is bold here, and `code` is code")
        let newest = try JSONDecoder().decode(PocketTurnsAnswer.self, from: Data(try answer("turns-newest").json.utf8))
        let last = try XCTUnwrap(newest.turns.last)
        XCTAssertNil(last.answerText)
        XCTAssertNotNil(last.absence, "a turn with no answer carries main's sentence")
        XCTAssertNotNil(newest.turns.first { $0.index == 30 }?.notice)
    }

    /// Clause: paging back from the newest turn reaches the first, every turn
    /// once, in order, and then stops: 45 turns, the count on record.
    func testPagingTheDoorsPagesReachesTheFirstTurn() throws {
        let decode = { (name: String) -> PocketTurnsAnswer in
            try JSONDecoder().decode(PocketTurnsAnswer.self, from: Data(try self.answer(name).json.utf8))
        }
        let newest = try decode("turns-newest")
        var pages = TurnPages(sessionId: newest.sessionId)
        try pages.acceptNewest(newest)
        XCTAssertEqual(pages.olderBound, 24)
        try pages.acceptOlder(try decode("turns-to-24"), askedTo: 24)
        XCTAssertEqual(pages.olderBound, 4)
        try pages.acceptOlder(try decode("turns-to-4"), askedTo: 4)
        XCTAssertNil(pages.olderBound)
        XCTAssertFalse(pages.hasOlder)
        XCTAssertEqual(pages.turns.map(\.index), Array(0..<45))
        let talk = try JSONDecoder().decode(PocketSessionAnswer.self, from: Data(try answer("session-talk").json.utf8))
        XCTAssertEqual(pages.turns.count, talk.session.turnCount)
    }
}

// MARK: - The vector file

/// `ios/TortieTests/Fixtures/vectors.json`, typed.
struct DoorVectorFile: Decodable {
    struct Keys: Decodable {
        let phoneSigningSeed, phoneExchangeSeed, macSigningSeed, macExchangeSeed: String
        let phoneSigningKey, phoneExchangeKey, macSigningKey, macExchangeKey: String
    }
    struct Identity: Decodable {
        let phoneId, fingerprint, binding: String
    }
    struct Request: Decodable {
        let name, method, target, body, bodySha256, timestamp, nonce, canonical, signature: String
        let id: String?
    }
    struct Tampered: Decodable {
        let signedFor, target, canonical, doorSays: String
    }
    struct Pin: Decodable {
        let name, certificateDer, certificateFingerprint, publicKeyFingerprint, pin: String
    }
    struct Seal: Decodable {
        struct FromDoor: Decodable { let body, plaintext: String }
        struct FromPhone: Decodable { let iv, plaintext, body: String }
        let secret, label: String
        let fromDoor: FromDoor
        let fromPhone: FromPhone
    }
    struct QR: Decodable {
        let name, payload: String
    }
    struct Answer: Decodable {
        let json, withUnknown: String
    }

    let keys: Keys
    let identity: Identity
    let requests: [Request]
    let tampered: Tampered
    let pins: [Pin]
    let seal: Seal
    let qr: [QR]
    let madeUpTailnetKey: String
    let answers: [String: Answer]

    /// The file beside this one in the checkout, which a Simulator process can
    /// read; the copy in the test bundle when there is one.
    static func load() throws -> DoorVectorFile {
        let beside = URL(fileURLWithPath: #filePath)
            .deletingLastPathComponent()
            .appendingPathComponent("Fixtures")
            .appendingPathComponent("vectors.json")
        let bundled = Bundle(for: DoorVectorTests.self).url(forResource: "vectors", withExtension: "json")
        let url = FileManager.default.fileExists(atPath: beside.path) ? beside : (bundled ?? beside)
        return try JSONDecoder().decode(DoorVectorFile.self, from: Data(contentsOf: url))
    }

    /// A JSON value with every null member removed, recursively.
    static func withoutNulls(_ value: Any) -> Any {
        if let object = value as? [String: Any] {
            var out: [String: Any] = [:]
            for (key, member) in object where !(member is NSNull) {
                out[key] = withoutNulls(member)
            }
            return out as NSDictionary
        }
        if let array = value as? [Any] {
            return array.map(withoutNulls) as NSArray
        }
        return value
    }
}
