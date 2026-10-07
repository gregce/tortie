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
    /// `pairFingerprint` over all three of the phone's keys, six groups of four.
    func testPhoneIdAndFingerprintAreTheDoors() throws {
        XCTAssertEqual(DoorSignature.phoneId(signingKey: v.keys.phoneSigningKey), v.identity.phoneId)
        XCTAssertEqual(
            DoorSignature.pairFingerprint(
                signingKey: v.keys.phoneSigningKey, exchangeKey: v.keys.phoneExchangeKey, clientKey: v.keys.clientKey
            ),
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
    }

    /// Clause: a pairing made from these keys, the client key and the Mac's
    /// certificate derives the Mac's binding, phone id and fingerprint.
    func testAPairedDoorIsTheDoors() throws {
        let certificate = try XCTUnwrap(Data(base64Encoded: v.client.certificateDer))
        let clientKey = ClientKey(tag: TestIdentity.tag, spki: v.keys.clientKey)
        let door = try XCTUnwrap(PairedDoor(
            endpoint: DoorEndpoint(name: "p330-mac.tail00000.ts.net", port: 8443, pin: v.pins[0].pin),
            macSigningKey: v.keys.macSigningKey,
            macExchangeKey: v.keys.macExchangeKey,
            label: v.seal.label,
            pairedAt: 0,
            keys: try phoneKeys(),
            clientKey: clientKey,
            certificate: certificate,
            identity: try TestIdentity.vectors(),
            alerts: .nothing
        ))
        #if os(iOS)
        defer { TestIdentity.removeFromKeychain() }
        #endif
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
        let signer = RequestSigner(phoneId: v.identity.phoneId, binding: v.identity.binding, key: keys.signing)
        for r in v.requests {
            let fromDoor = try XCTUnwrap(Base64URL.decode(r.signature), r.name)
            XCTAssertTrue(keys.signing.publicKey.isValidSignature(fromDoor, for: Data(r.canonical.utf8)), r.name)
            let headers = try signer.headers(
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

    /// Clause (Phase 316.7): every `/v1/sessions` target the vectors sign is
    /// the one the client's single builder spells for the same words, byte for
    /// byte, so the door reads back exactly what the phone signed. The words
    /// are read out of each vector's own query; at least one vector must hold
    /// a sessions read, or the file predates the route
    /// (`node build/p316/vectors.mjs`).
    func testTheSessionsTargetIsTheDoorsByteForByte() throws {
        let sessions = v.requests.filter { $0.target.hasPrefix("/v1/sessions?") }
        XCTAssertFalse(sessions.isEmpty, "vectors.json holds no /v1/sessions request: run node build/p316/vectors.mjs")
        for request in sessions {
            XCTAssertEqual(request.method, "GET")
            let query = try XCTUnwrap(Self.sessionsQuery(request.target), "\(request.name): \(request.target) is not five closed words")
            XCTAssertEqual(DoorClient.sessionsTarget(query), request.target, request.name)
        }
    }

    /// The words a `/v1/sessions` target asks with, or nil when it is not
    /// spelled as the door reads one.
    private static func sessionsQuery(_ target: String) -> SessionsQuery? {
        guard let question = target.split(separator: "?", maxSplits: 1).last, target.contains("?") else { return nil }
        var values: [String: String] = [:]
        for pair in question.split(separator: "&") {
            let parts = pair.split(separator: "=", maxSplits: 1).map(String.init)
            guard parts.count == 2, values[parts[0]] == nil, let value = parts[1].removingPercentEncoding else { return nil }
            values[parts[0]] = value
        }
        guard let show = values["show"].flatMap(SessionsShow.init(rawValue:)),
              let group = values["group"].flatMap(SessionsGroupBy.init(rawValue:)),
              let sort = values["sort"].flatMap(SessionsSortBy.init(rawValue:)) else { return nil }
        return SessionsQuery(show: show, group: group, sort: sort, agent: values["agent"], machine: values["machine"])
    }

    // MARK: The writes (Phase 317)

    /// Clause: the write's request is the one the shipping verifier accepted:
    /// POST, the client's own target, and the body Swift's encoder writes with
    /// sorted keys, byte for byte (the signature loops above sign and verify
    /// it with the rest). The fix round took the unpair write out, so the
    /// vectors carry no request to `/v1/unpair`.
    func testTheWritesAreTheDoorsByteForByte() throws {
        let byName = Dictionary(uniqueKeysWithValues: v.requests.map { ($0.name, $0) })
        let end = try XCTUnwrap(byName["end"], "vectors.json carries no end write; run build/p316/vectors.mjs")
        XCTAssertNil(byName["unpair"])
        XCTAssertFalse(v.requests.contains { $0.target.hasPrefix("/v1/unpair") })
        XCTAssertEqual(end.method, "POST")
        XCTAssertEqual(end.target, DoorClient.endTarget)
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.sortedKeys]
        let fields = try XCTUnwrap(try JSONSerialization.jsonObject(with: Data(end.body.utf8)) as? [String: Any])
        let body = EndBody(
            batch: try XCTUnwrap(fields["batch"] as? Bool),
            session: try XCTUnwrap(fields["session"] as? String),
            write: try XCTUnwrap(fields["write"] as? String)
        )
        XCTAssertEqual(String(decoding: try encoder.encode(body), as: UTF8.self), end.body)
        XCTAssertTrue(WriteId.isWellFormed(body.write))
        XCTAssertEqual(Array(fields.keys).sorted(), ["batch", "session", "write"])
    }

    /// Clause (Phase 318, build/p318/SPEC.md section 6.3): the press and the
    /// message are the requests the shipping verifier accepted over the
    /// phone's channel: POST, the client's own targets, and the bodies Swift's
    /// encoder writes with sorted keys, byte for byte, the message's text
    /// holding `/` (which Swift writes `\/`), `"`, a line break and an emoji.
    /// The signature loops above sign and verify both with the rest.
    func testTheReplyWritesAreTheDoorsByteForByte() throws {
        let byName = Dictionary(uniqueKeysWithValues: v.requests.map { ($0.name, $0) })
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.sortedKeys]

        let choose = try XCTUnwrap(byName["choose"], "vectors.json carries no choose write; run build/p316/vectors.mjs")
        XCTAssertEqual(choose.method, "POST")
        XCTAssertEqual(choose.target, DoorClient.chooseTarget)
        let pressed = try XCTUnwrap(try JSONSerialization.jsonObject(with: Data(choose.body.utf8)) as? [String: String])
        XCTAssertEqual(Array(pressed.keys).sorted(), ["mark", "marker", "question", "session", "write"])
        let chooseBody = ChooseBody(
            mark: try XCTUnwrap(pressed["mark"]), marker: try XCTUnwrap(pressed["marker"]),
            question: try XCTUnwrap(pressed["question"]), session: try XCTUnwrap(pressed["session"]),
            write: try XCTUnwrap(pressed["write"])
        )
        XCTAssertEqual(String(decoding: try encoder.encode(chooseBody), as: UTF8.self), choose.body)
        XCTAssertTrue(WriteId.isWellFormed(chooseBody.write))
        XCTAssertTrue(PocketReplyOffer.isQuestionId(chooseBody.question), chooseBody.question)
        XCTAssertTrue(PocketReplyOffer.isMark(chooseBody.mark), chooseBody.mark)
        XCTAssertTrue(PocketReplyOffer.isMarker(chooseBody.marker), chooseBody.marker)

        let say = try XCTUnwrap(byName["say"], "vectors.json carries no say write; run build/p316/vectors.mjs")
        XCTAssertEqual(say.method, "POST")
        XCTAssertEqual(say.target, DoorClient.sayTarget)
        let said = try XCTUnwrap(try JSONSerialization.jsonObject(with: Data(say.body.utf8)) as? [String: String])
        XCTAssertEqual(Array(said.keys).sorted(), ["session", "text", "write"])
        let text = try XCTUnwrap(said["text"])
        let sayBody = SayBody(session: try XCTUnwrap(said["session"]), text: text, write: try XCTUnwrap(said["write"]))
        XCTAssertEqual(String(decoding: try encoder.encode(sayBody), as: UTF8.self), say.body)
        XCTAssertTrue(WriteId.isWellFormed(sayBody.write))
        XCTAssertTrue(text.contains("/") && say.body.contains(#"\/"#), "the vector's text has no slash written as Swift writes it")
        XCTAssertTrue(text.contains("\""), "the vector's text has no quote")
        XCTAssertTrue(text.contains("\n"), "the vector's text has no line break")
        XCTAssertTrue(text.unicodeScalars.contains { $0.properties.isEmoji && !$0.isASCII }, "the vector's text has no emoji")
    }

    /// Clause (Phase 337, build/p337/SPEC.md section 6.4, the vectors): the
    /// Screen's read and the keys write are the requests the shipping verifier
    /// accepted: `GET` the client's own `/v1/screen` target with `since`, and
    /// `POST /v1/keys` with the body Swift's encoder writes, sorted, byte for
    /// byte, its items holding `"`, `\`, `/`, an emoji and every key name.
    /// The signature loops above sign and verify both with the rest.
    func testTheScreenReadAndTheKeysWriteAreTheDoorsByteForByte() throws {
        let screen = try XCTUnwrap(
            v.requests.first { $0.target.hasPrefix("/v1/screen?") }, "vectors.json carries no screen read; run build/p316/vectors.mjs"
        )
        XCTAssertEqual(screen.method, "GET")
        let since = try XCTUnwrap(screen.target.split(separator: "=").last.map(String.init))
        XCTAssertEqual(DoorClient.screenTarget(try XCTUnwrap(screen.id), since: since), screen.target)
        XCTAssertTrue(screen.target.contains("&since="), "the read carries the revision it holds")

        let writes = v.requests.filter { $0.target == DoorClient.keysTarget }
        XCTAssertFalse(writes.isEmpty, "vectors.json carries no keys write; run build/p316/vectors.mjs")
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.sortedKeys]
        var texts = ""
        var named = Set<ScreenKeyName>()
        for keys in writes {
            XCTAssertEqual(keys.method, "POST", keys.name)
            let fields = try XCTUnwrap(try JSONSerialization.jsonObject(with: Data(keys.body.utf8)) as? [String: Any])
            XCTAssertEqual(fields.keys.sorted(), ["dialog", "keys", "session", "turn", "write"], keys.name)
            let items = try XCTUnwrap(fields["keys"] as? [[String: String]])
            let read: [KeyItem] = try items.map { item in
                if let text = item["t"] { return .text(text) }
                return .key(try XCTUnwrap(ScreenKeyName(rawValue: try XCTUnwrap(item["k"]))))
            }
            let body = KeysBody(
                dialog: fields["dialog"] as? String, keys: read, session: try XCTUnwrap(fields["session"] as? String),
                turn: try XCTUnwrap(fields["turn"] as? String), write: try XCTUnwrap(fields["write"] as? String)
            )
            XCTAssertEqual(String(decoding: try encoder.encode(body), as: UTF8.self), keys.body, keys.name)
            XCTAssertTrue(WriteId.isWellFormed(body.write))
            XCTAssertTrue(PocketReplyOffer.isQuestionId(body.turn), body.turn)
            for item in read {
                switch item {
                case .text(let text): texts += text
                case .key(let name): named.insert(name)
                }
            }
        }
        for needed in ["\"", "\\", "/"] { XCTAssertTrue(texts.contains(needed), "the vectors' text has no \(needed)") }
        XCTAssertTrue(texts.unicodeScalars.contains { $0.properties.isEmoji && !$0.isASCII }, "the vectors' text has no emoji")
        XCTAssertEqual(named, Set(ScreenKeyName.allCases), "the vectors do not carry every key name")
    }

    /// Clause (Phase 337.1, build/p3371/SPEC.md section 6.4, the vectors): a
    /// page of the Terminal's history is the request the shipping verifier
    /// accepted: `GET` the client's own `/v1/scrollback` target, its six names
    /// in the one order the door's own reader read back (vectors.mjs asserts
    /// that half). The signature loops above sign and verify it with the rest.
    func testTheScrollbackReadIsTheDoorsByteForByte() throws {
        let page = try XCTUnwrap(
            v.requests.first { $0.target.hasPrefix("/v1/scrollback?") }, "vectors.json carries no scrollback read; run build/p316/vectors.mjs"
        )
        XCTAssertEqual(page.method, "GET")
        XCTAssertEqual(page.body, "")
        var values: [String: String] = [:]
        let query = try XCTUnwrap(page.target.split(separator: "?", maxSplits: 1).last)
        for pair in query.split(separator: "&") {
            let parts = pair.split(separator: "=", maxSplits: 1).map(String.init)
            XCTAssertEqual(parts.count, 2, page.target)
            XCTAssertNil(values[parts[0]], "\(parts[0]) is named twice")
            if parts.count == 2 { values[parts[0]] = parts[1] }
        }
        XCTAssertEqual(values.keys.sorted(), ["count", "depth", "from", "id", "keep", "wrap"])
        let number = { (name: String) throws -> Int in try XCTUnwrap(values[name].flatMap { Int($0) }, name) }
        let keep = try XCTUnwrap(values["keep"].flatMap(ScrollbackKeep.init(rawValue:)))
        let target = DoorClient.scrollbackTarget(
            try XCTUnwrap(page.id), from: try number("from"), count: try number("count"),
            depth: try number("depth"), wrap: try number("wrap"), keep: keep
        )
        XCTAssertEqual(target, page.target)
    }

    /// Clause (Phase 337.1): a page's target is covered. The door refused a
    /// page's signature presented with one byte of its target changed
    /// (`signature`), and so does CryptoKit.
    func testAScrollbackTargetTheSignatureWasNotMadeForDoesNotVerify() throws {
        let tampered = try XCTUnwrap(v.scrollbackTampered, "vectors.json carries no tampered page; run build/p316/vectors.mjs")
        XCTAssertEqual(tampered.doorSays, "signature")
        let signed = try XCTUnwrap(v.requests.first { $0.name == tampered.signedFor })
        XCTAssertNotEqual(signed.target, tampered.target)
        XCTAssertEqual(signed.target.utf8.count, tampered.target.utf8.count, "one byte changed, none added")
        let text = DoorSignature.canonicalText(
            method: "GET", target: tampered.target, bodySha256: signed.bodySha256,
            timestamp: signed.timestamp, nonce: signed.nonce, binding: v.identity.binding
        )
        XCTAssertEqual(text, tampered.canonical)
        let keys = try phoneKeys()
        let signature = try XCTUnwrap(Base64URL.decode(signed.signature))
        XCTAssertFalse(keys.signing.publicKey.isValidSignature(signature, for: Data(tampered.canonical.utf8)))
    }

    /// Clause (Phase 337): a keys body is covered too. The door refused a
    /// keys write's signature over its body with one byte changed
    /// (`signature`), and so does CryptoKit.
    func testAKeysBodyTheSignatureWasNotMadeForDoesNotVerify() throws {
        let tampered = try XCTUnwrap(v.keysTampered, "vectors.json carries no tampered keys write; run build/p316/vectors.mjs")
        XCTAssertEqual(tampered.doorSays, "signature")
        let signed = try XCTUnwrap(v.requests.first { $0.name == tampered.signedFor })
        XCTAssertEqual(signed.target, DoorClient.keysTarget)
        XCTAssertNotEqual(tampered.body, signed.body)
        XCTAssertEqual(Hex.sha256(Data(tampered.body.utf8)), tampered.bodySha256)
        let text = DoorSignature.canonicalText(
            method: signed.method, target: signed.target, bodySha256: tampered.bodySha256,
            timestamp: signed.timestamp, nonce: signed.nonce, binding: v.identity.binding
        )
        XCTAssertEqual(text, tampered.canonical)
        let keys = try phoneKeys()
        let signature = try XCTUnwrap(Base64URL.decode(signed.signature))
        XCTAssertFalse(keys.signing.publicKey.isValidSignature(signature, for: Data(tampered.canonical.utf8)))
        XCTAssertTrue(keys.signing.publicKey.isValidSignature(signature, for: Data(signed.canonical.utf8)))
    }

    /// Clause: the body is covered, not only the target. The door refused the
    /// end write's signature over its body with one byte changed
    /// (`signature`), and so does CryptoKit.
    func testABodyTheSignatureWasNotMadeForDoesNotVerify() throws {
        let tampered = try XCTUnwrap(v.writeTampered, "vectors.json carries no tampered write; run build/p316/vectors.mjs")
        XCTAssertEqual(tampered.doorSays, "signature")
        let signed = try XCTUnwrap(v.requests.first { $0.name == tampered.signedFor })
        XCTAssertNotEqual(tampered.body, signed.body)
        XCTAssertEqual(Hex.sha256(Data(tampered.body.utf8)), tampered.bodySha256)
        let text = DoorSignature.canonicalText(
            method: signed.method, target: signed.target, bodySha256: tampered.bodySha256,
            timestamp: signed.timestamp, nonce: signed.nonce, binding: v.identity.binding
        )
        XCTAssertEqual(text, tampered.canonical)
        let keys = try phoneKeys()
        let signature = try XCTUnwrap(Base64URL.decode(signed.signature))
        XCTAssertFalse(keys.signing.publicKey.isValidSignature(signature, for: Data(tampered.canonical.utf8)))
        XCTAssertTrue(keys.signing.publicKey.isValidSignature(signature, for: Data(signed.canonical.utf8)))
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

    // MARK: The client key and its certificate

    /// Clause: the client key is the door's `ck`: the phone's P-256 key,
    /// imported from its X9.63 form, is the SPKI the Mac issued over, and the
    /// pin the door admits it by is sha256 over that SPKI, base64url.
    func testTheClientKeyIsTheDoors() throws {
        let x963 = try XCTUnwrap(Hex.decode(v.keys.clientKeyX963))
        var error: Unmanaged<CFError>?
        let key = try XCTUnwrap(SecKeyCreateWithData(x963 as CFData, [
            kSecAttrKeyType as String: kSecAttrKeyTypeECSECPrimeRandom,
            kSecAttrKeyClass as String: kSecAttrKeyClassPrivate,
            kSecAttrKeySizeInBits as String: 256
        ] as CFDictionary, &error))
        let publicKey = try XCTUnwrap(SecKeyCopyPublicKey(key))
        XCTAssertEqual(ClientKeys.spki(of: publicKey), v.keys.clientKey)
        let der = try XCTUnwrap(Base64URL.decode(v.keys.clientKey))
        XCTAssertEqual(Base64URL.encode(Data(SHA256.hash(data: der))), v.identity.clientPin)
    }

    /// Clause: the Mac's client certificate builds a SecCertificate whose key
    /// is `ck`, and a certificate over another key is not this phone's.
    func testTheClientCertificateCarriesTheClientKey() throws {
        let der = try XCTUnwrap(Data(base64Encoded: v.client.certificateDer))
        let certificate = try XCTUnwrap(SecCertificateCreateWithData(nil, der as CFData))
        let key = try XCTUnwrap(SecCertificateCopyKey(certificate))
        XCTAssertEqual(ClientKeys.spki(of: key), v.keys.clientKey)
        XCTAssertNotNil(ClientKeys.certificate(der, carrying: v.keys.clientKey))
        XCTAssertNil(ClientKeys.certificate(der, carrying: v.keys.phoneSigningKey))
        let doorDer = try XCTUnwrap(Data(base64Encoded: v.pins[0].certificateDer))
        XCTAssertNil(ClientKeys.certificate(doorDer, carrying: v.keys.clientKey), "the door's own certificate is not over the phone's key")
        XCTAssertNil(ClientKeys.certificate(Data("not DER".utf8), carrying: v.keys.clientKey))
    }

    // MARK: The sealed, signed presentation

    /// Clause: the AES-256-GCM key is HKDF-SHA256(`ps`, empty salt,
    /// `tortie-pocket-pair-v1`) and the sealed fields are `{iv, ct, tag}`:
    /// what the door's own sealer made opens here to its plaintext.
    func testTheDoorsSealOpensHere() throws {
        let secret = try XCTUnwrap(Base64URL.decode(v.seal.secret))
        let opened = try PresentationSeal.open(Data(v.seal.fromDoor.body.utf8), secret: secret)
        XCTAssertEqual(opened, Data(v.seal.fromDoor.plaintext.utf8))
        var wrong = secret
        wrong[0] ^= 0x01
        XCTAssertThrowsError(try PresentationSeal.open(Data(v.seal.fromDoor.body.utf8), secret: wrong))
    }

    /// Clause: the window's challenge is HKDF-SHA256(`ps`, empty salt,
    /// `tortie-pocket-challenge-v1`), and the proof text is the door's
    /// `presentationProofText`, byte for byte.
    func testTheChallengeAndTheProofAreTheDoors() throws {
        let secret = try XCTUnwrap(Base64URL.decode(v.seal.secret))
        XCTAssertEqual(PresentationSeal.challenge(secret: secret), v.seal.challenge)
        let phone = v.seal.fromPhone
        XCTAssertEqual(
            PresentationSeal.proofText(challenge: v.seal.challenge, iv: phone.iv, ct: phone.ct, tag: phone.tag),
            phone.proof
        )
    }

    /// Clause: the phone's plaintext, its seal at a fixed nonce, and the body
    /// it sends are the bytes the door's opener opened to these keys and this
    /// label, with the door's proof holding over them. Node's Ed25519 signature
    /// over the proof verifies here, and so does the phone's own over the same
    /// proof (CryptoKit signs with randomness, so its bytes are not Node's).
    func testThePhonesPresentationIsTheBodyTheDoorOpened() throws {
        let secret = try XCTUnwrap(Base64URL.decode(v.seal.secret))
        let keys = try phoneKeys()
        let inner = try PresentationSeal.inner(label: v.seal.label, keys: keys, clientKey: v.keys.clientKey, push: nil)
        XCTAssertEqual(inner, Data(v.seal.fromPhone.plaintext.utf8))
        let iv = try XCTUnwrap(Base64URL.decode(v.seal.fromPhone.iv))
        let sealed = try PresentationSeal.seal(inner, secret: secret, nonce: try AES.GCM.Nonce(data: iv))
        XCTAssertEqual(sealed, PresentationSeal.Sealed(iv: v.seal.fromPhone.iv, ct: v.seal.fromPhone.ct, tag: v.seal.fromPhone.tag))
        let nodeSig = try XCTUnwrap(Base64URL.decode(v.seal.fromPhone.sig))
        XCTAssertTrue(keys.signing.publicKey.isValidSignature(nodeSig, for: Data(v.seal.fromPhone.proof.utf8)))

        let body = try PresentationSeal.body(sealed, challenge: v.seal.challenge, keys: keys)
        let mine = try XCTUnwrap(JSONSerialization.jsonObject(with: body) as? [String: String])
        let theirs = try XCTUnwrap(JSONSerialization.jsonObject(with: Data(v.seal.fromPhone.body.utf8)) as? [String: String])
        for field in ["ct", "ek", "iv", "tag"] {
            XCTAssertEqual(mine[field], theirs[field], field)
        }
        XCTAssertEqual(Set(mine.keys), ["ct", "ek", "iv", "sig", "tag"])
        let mySig = try XCTUnwrap(Base64URL.decode(try XCTUnwrap(mine["sig"])))
        XCTAssertTrue(keys.signing.publicKey.isValidSignature(mySig, for: Data(v.seal.fromPhone.proof.utf8)))
        let written = String(decoding: body, as: UTF8.self)
        XCTAssertTrue(written.hasPrefix("{\"ct\":"), "the body's keys are written sorted, as the door's own sealer writes them")
    }

    /// Clause: every presentation gets a fresh nonce, so two seals of one
    /// plaintext differ and both open.
    func testEverySealHasAFreshNonce() throws {
        let secret = try XCTUnwrap(Base64URL.decode(v.seal.secret))
        let inner = try PresentationSeal.inner(label: v.seal.label, keys: try phoneKeys(), clientKey: v.keys.clientKey, push: nil)
        let one = try PresentationSeal.seal(inner, secret: secret)
        let two = try PresentationSeal.seal(inner, secret: secret)
        XCTAssertNotEqual(one, two)
        for sealed in [one, two] {
            let body = try PresentationSeal.body(sealed, challenge: v.seal.challenge, keys: try phoneKeys())
            XCTAssertEqual(try PresentationSeal.open(body, secret: secret), inner)
        }
    }

    // MARK: QR v:3

    /// Clause: the QR the shipping window mints parses to exactly its fields,
    /// at each public port.
    func testTheShippingQRParses() throws {
        XCTAssertEqual(Set(v.qr.map(\.name)), ["funnel-8443", "funnel-10000"])
        for qr in v.qr {
            let fields = try XCTUnwrap(
                JSONSerialization.jsonObject(with: Data(qr.payload.utf8)) as? [String: Any], qr.name
            )
            XCTAssertEqual(Set(fields.keys), ["v", "host", "port", "fp", "dk", "dx", "ps", "exp"], qr.name)
            let offer = try PairingOffer.parse(qr.payload)
            XCTAssertEqual(offer.door.name, fields["host"] as? String, qr.name)
            XCTAssertEqual(offer.door.port, fields["port"] as? Int, qr.name)
            XCTAssertEqual(offer.door.pin, fields["fp"] as? String, qr.name)
            XCTAssertEqual(offer.door.pin, v.pins[0].pin, qr.name)
            XCTAssertEqual(offer.macSigningKey, v.keys.macSigningKey, qr.name)
            XCTAssertEqual(offer.macExchangeKey, v.keys.macExchangeKey, qr.name)
            XCTAssertEqual(offer.secret, Base64URL.decode(try XCTUnwrap(fields["ps"] as? String)), qr.name)
            XCTAssertEqual(offer.secret.count, 16, qr.name)
            XCTAssertEqual(offer.expiresAt, (fields["exp"] as? NSNumber)?.doubleValue, qr.name)
            XCTAssertTrue(offer.door.isPublic, qr.name)
        }
    }

    // MARK: /pair's answers

    /// Clause: the shipping handler's three `/pair` answers decode, and
    /// `allowed` carries the client certificate the Mac issued.
    func testThePairAnswersAreTheDoors() throws {
        let decode = { (text: String) in try JSONDecoder().decode(PairAnswer.self, from: Data(text.utf8)) }
        XCTAssertEqual(try decode(v.pairAnswers.pending), .pending(macSends: false))
        // Research 136 section 9: the one cue on which the phone asks iOS.
        let sends = try XCTUnwrap(v.pairAnswers.pendingSends, "vectors.json holds no pendingSends: run node build/p316/vectors.mjs")
        XCTAssertEqual(try decode(sends), .pending(macSends: true))
        XCTAssertEqual(try decode(v.pairAnswers.refused), .refused)
        let der = try XCTUnwrap(Data(base64Encoded: v.client.certificateDer))
        XCTAssertEqual(try decode(v.pairAnswers.allowed), .allowed(certificate: der))
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

    /// Clause (Phase 316.7): every `/v1/sessions` answer the SHIPPING composer
    /// wrote reads back as the door wrote it, unknown fields ignored, and is
    /// one the Sessions tab draws for the words it echoes: never refused.
    /// vectors.mjs composes two (the integrator's addition to section 9.2);
    /// a file with none predates the route and fails here by name.
    func testTheSessionsAnswersReadBackAndDraw() throws {
        let names = v.answers.keys.filter { $0.hasPrefix("sessions") }.sorted()
        XCTAssertEqual(names, ["sessions-active-none-name", "sessions-all-project"], "vectors.json holds no /v1/sessions answer: run node build/p316/vectors.mjs")
        for name in names {
            let answer = try assertRoundTrip(PocketSessionsAnswer.self, name)
            let asked = SessionsQuery(
                show: answer.asked.show, group: answer.asked.group, sort: answer.asked.sort,
                agent: answer.asked.agent, machine: answer.asked.machine
            )
            XCTAssertNoThrow(try SessionsDrawing(answer, asked: asked), "\(name): the shipping composer's answer is refused")
        }
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
        let clientKey, clientKeyX963, clientKeyPkcs8: String
    }
    struct Identity: Decodable {
        let phoneId, fingerprint, binding, clientPin: String
    }
    struct Client: Decodable {
        let clientKey, certificateDer: String
    }
    struct Request: Decodable {
        let name, method, target, body, bodySha256, timestamp, nonce, canonical, signature: String
        let id: String?
    }
    struct Tampered: Decodable {
        let signedFor, target, canonical, doorSays: String
    }
    /// Phase 317: the end write's signature over its body with one byte
    /// changed. Optional so a file written before it fails the one test that
    /// reads it, by name.
    struct WriteTampered: Decodable {
        let signedFor, body, bodySha256, canonical, doorSays: String
    }
    struct Pin: Decodable {
        let name, certificateDer, certificateFingerprint, publicKeyFingerprint, pin: String
    }
    struct Seal: Decodable {
        struct FromDoor: Decodable { let body, plaintext: String }
        struct FromPhone: Decodable { let iv, plaintext, ct, tag, proof, sig, body: String }
        let secret, challenge, label: String
        let fromDoor: FromDoor
        let fromPhone: FromPhone
    }
    struct PairAnswers: Decodable {
        let pending, refused, allowed: String
        /// Phase 316.5: the `pending` of a Mac that can send an alert. Optional
        /// so a file written before it fails the one test that reads it, by
        /// name, rather than every test that reads the file.
        let pendingSends: String?
    }
    struct QR: Decodable {
        let name, payload: String
    }
    struct Answer: Decodable {
        let json, withUnknown: String
    }
    /// Phase 316.5: the presentation with an alert address, and what the
    /// shipping opener read out of it.
    struct PushSeal: Decodable {
        struct Opened: Decodable { let pushToken, pushEnvironment: String }
        let token, environment, iv, plaintext, ct, tag, proof, sig, body: String
        let opened: Opened
    }
    /// Phase 316.5: one of Phase 314's alert shapes and the tap it is.
    struct Alert: Decodable {
        struct Tap: Decodable { let kind: String; let session: String? }
        let name, payload: String
        let tap: Tap
    }

    let keys: Keys
    let identity: Identity
    let requests: [Request]
    let tampered: Tampered
    let writeTampered: WriteTampered?
    /// Phase 337: a keys write's signature over its body with one byte
    /// changed. Optional so a file written before it fails the one test that
    /// reads it, by name.
    let keysTampered: WriteTampered?
    /// Phase 337.1: a page's signature presented with one byte of its target
    /// changed. Optional so a file written before it fails the one test that
    /// reads it, by name.
    let scrollbackTampered: Tampered?
    let pins: [Pin]
    let client: Client
    let seal: Seal
    let qr: [QR]
    let pairAnswers: PairAnswers
    let answers: [String: Answer]
    let pushSeal: PushSeal
    let alerts: [Alert]

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
