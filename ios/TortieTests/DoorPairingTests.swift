import CryptoKit
import Foundation
import XCTest
@testable import Tortie

/// Pairing, in the Mac's order, and ending ONLY in a signed read over the
/// phone's new identity (build/p330/SPEC.md sections 4.7 and 4.12.5). The
/// door is a stand-in that answers what each test names; the keys are real,
/// the seal and the proof are the ones the door's own opener and proof took
/// in `DoorVectorTests`, and the client keys are in memory.
///
/// Each test names the clause it holds and fails when that clause is taken
/// out of `ios/Tortie/Door/Pairing.swift` or `Keys.swift`.
final class DoorPairingTests: XCTestCase {
    private var v: DoorVectorFile!
    private var offerText: String!
    private var offer: PairingOffer!
    private var openedAt: Date!
    private var certificate: Data!

    override func setUpWithError() throws {
        v = try DoorVectorFile.load()
        offerText = try XCTUnwrap(v.qr.first { $0.name == "funnel-8443" }).payload
        offer = try PairingOffer.parse(offerText)
        // The Mac's window is three minutes; the phone reads it at its start.
        openedAt = Date(timeIntervalSince1970: (offer.expiresAt - 180_000) / 1000)
        certificate = try XCTUnwrap(Data(base64Encoded: v.client.certificateDer))
    }

    override func tearDown() {
        #if os(iOS)
        TestIdentity.removeFromKeychain()
        #endif
    }

    private func list() throws -> PocketBlockedAnswer {
        try JSONDecoder().decode(PocketBlockedAnswer.self, from: Data(try XCTUnwrap(v.answers["blocked"]).json.utf8))
    }

    private struct Run {
        let outcome: PairingOutcome
        let door: StandInDoor
        let secrets: MemorySecrets
        let keys: MemoryClientKeys
        let steps: [PairingStep]
        let pending: PendingPairing
    }

    private func run(
        presents: [Result<PairAnswer, DoorFailure>],
        reads: [Result<PocketBlockedAnswer, DoorFailure>] = [],
        secrets: MemorySecrets = MemorySecrets()
    ) async throws -> Run {
        let door = StandInDoor(presents: presents, reads: reads)
        let clock = StepClock(openedAt)
        let keys = MemoryClientKeys(spki: v.keys.clientKey)
        let pairing = PairingFlow(
            exchange: door,
            store: PairingStore(secrets: secrets, clientKeys: keys),
            now: { clock.now },
            pause: { clock.advance($0) }
        )
        let pending = try pairing.begin(offer, label: "Tortie’s iPhone")
        let steps = StepLog()
        let outcome = await pairing.run(pending, progress: { steps.append($0) })
        return Run(outcome: outcome, door: door, secrets: secrets, keys: keys, steps: steps.all, pending: pending)
    }

    // MARK: The order

    /// Clause: present, keep presenting while pending, and only after
    /// `allowed` WITH a certificate over this phone's client key AND a signed
    /// read over that identity that succeeded, keep the pairing.
    func testPairedOnlyAfterTheFirstSignedRead() async throws {
        let first = try list()
        let r = try await run(
            presents: [.success(.pending(macSends: false)), .success(.pending(macSends: false)), .success(.allowed(certificate: certificate))],
            reads: [.success(first)]
        )
        guard case let .paired(paired, answer) = r.outcome else { return XCTFail("\(r.outcome)") }
        XCTAssertEqual(answer, first)
        XCTAssertEqual(r.door.presented.count, 3)
        XCTAssertEqual(r.door.reads, 1)
        XCTAssertEqual(r.steps, [.presenting, .waitingForMac, .confirming])
        XCTAssertEqual(paired.endpoint, offer.door)
        XCTAssertEqual(paired.fingerprint, r.pending.fingerprint)
        XCTAssertEqual(paired.certificate, certificate)
        XCTAssertEqual(paired.clientKey, r.pending.clientKey)
        XCTAssertEqual(r.keys.held, [r.pending.clientKey.tag], "the paired phone's client key is kept")
        // The read the pairing was confirmed by was signed by the kept keys.
        let kept = try XCTUnwrap(PairingStore(secrets: r.secrets, clientKeys: r.keys).load())
        XCTAssertEqual(kept.phoneId, paired.phoneId)
        XCTAssertEqual(kept.binding, paired.binding)
        XCTAssertEqual(r.door.readDoors.first?.phoneId, kept.phoneId)
    }

    /// Clause: every presentation is sealed under the QR's secret, freshly,
    /// carries all three of this phone's keys and its label, and is SIGNED by
    /// its Ed25519 key over the window's challenge (the proof the Mac checks
    /// before it opens anything).
    func testEveryPresentationIsSealedAndSigned() async throws {
        let r = try await run(presents: [.success(.pending(macSends: false)), .success(.pending(macSends: false)), .success(.refused)])
        XCTAssertEqual(r.door.presented.count, 3)
        XCTAssertEqual(Set(r.door.presented).count, 3, "each presentation has a fresh nonce")
        let challenge = PresentationSeal.challenge(secret: offer.secret)
        for body in r.door.presented {
            let outer = try XCTUnwrap(JSONSerialization.jsonObject(with: body) as? [String: String])
            XCTAssertEqual(Set(outer.keys), ["ct", "ek", "iv", "sig", "tag"])
            XCTAssertEqual(outer["ek"], r.pending.keys.signingKey)
            let inner = try PresentationSeal.open(body, secret: offer.secret)
            let fields = try XCTUnwrap(JSONSerialization.jsonObject(with: inner) as? [String: String])
            XCTAssertEqual(fields, [
                "label": "Tortie’s iPhone", "ek": r.pending.keys.signingKey, "xk": r.pending.keys.exchangeKey,
                "ck": r.pending.clientKey.spki
            ])
            let proof = PresentationSeal.proofText(
                challenge: challenge, iv: try XCTUnwrap(outer["iv"]), ct: try XCTUnwrap(outer["ct"]), tag: try XCTUnwrap(outer["tag"])
            )
            let sig = try XCTUnwrap(Base64URL.decode(try XCTUnwrap(outer["sig"])))
            XCTAssertTrue(r.pending.keys.signing.publicKey.isValidSignature(sig, for: Data(proof.utf8)))
        }
    }

    /// Clause: the fingerprint both screens show covers all three keys.
    func testTheFingerprintCoversTheClientKey() async throws {
        let r = try await run(presents: [.success(.refused)])
        XCTAssertEqual(
            r.pending.fingerprint,
            DoorSignature.pairFingerprint(
                signingKey: r.pending.keys.signingKey, exchangeKey: r.pending.keys.exchangeKey, clientKey: r.pending.clientKey.spki
            )
        )
        XCTAssertNotEqual(
            r.pending.fingerprint,
            DoorSignature.pairFingerprint(signingKey: r.pending.keys.signingKey, exchangeKey: r.pending.keys.exchangeKey, clientKey: "other")
        )
    }

    /// Clause: `allowed` followed by a refused signed read is NOT paired, and
    /// nothing is kept, the client key included. A door that closes the
    /// connection on this phone's key before a byte refuses it the same way.
    func testAllowedAloneIsNotPaired() async throws {
        for failure in [DoorFailure.refused, .closedBeforeAnswer] {
            let r = try await run(presents: [.success(.allowed(certificate: certificate))], reads: [.failure(failure)])
            guard case .failed(.notAccepted) = r.outcome else { return XCTFail("\(failure): \(r.outcome)") }
            XCTAssertEqual(r.door.reads, 1)
            XCTAssertTrue(r.secrets.isEmpty, "a phone the door would not read for kept a pairing")
            XCTAssertEqual(r.keys.held, [], "its client key was left behind")
        }
    }

    /// Clause: a certificate that is not over this phone's client key is an
    /// answer the phone does not know, and nothing is kept.
    func testACertificateOverAnotherKeyIsRefused() async throws {
        let doorCertificate = try XCTUnwrap(Data(base64Encoded: v.pins[0].certificateDer))
        let r = try await run(presents: [.success(.allowed(certificate: doorCertificate))], reads: [.success(try list())])
        guard case .failed(.strangeAnswer) = r.outcome else { return XCTFail("\(r.outcome)") }
        XCTAssertEqual(r.door.reads, 0)
        XCTAssertTrue(r.secrets.isEmpty)
        XCTAssertEqual(r.keys.held, [])
    }

    /// Clause: `refused` ends it at once, and nothing is read or kept.
    func testRefusedEndsIt() async throws {
        let r = try await run(presents: [.success(.pending(macSends: false)), .success(.refused)])
        guard case .failed(.macRefused) = r.outcome else { return XCTFail("\(r.outcome)") }
        XCTAssertEqual(r.door.presented.count, 2)
        XCTAssertEqual(r.door.reads, 0)
        XCTAssertTrue(r.secrets.isEmpty)
        XCTAssertEqual(r.keys.held, [])
    }

    /// Clause: a door that does not present the pinned key ends it at once.
    func testAWrongKeyEndsItAtOnce() async throws {
        let r = try await run(presents: [.failure(.wrongKey)])
        guard case .failed(.wrongKey) = r.outcome else { return XCTFail("\(r.outcome)") }
        XCTAssertEqual(r.door.presented.count, 1)
        XCTAssertTrue(r.secrets.isEmpty)
        XCTAssertEqual(r.keys.held, [])
    }

    /// Clause: `/pair` answering 404, or the connection closed before a byte,
    /// is a shut window: before the Mac had the phone it is `windowClosed`,
    /// after it `codeExpired`.
    func testA404IsAShutWindow() async throws {
        for failure in [DoorFailure.refused, .closedBeforeAnswer] {
            let never = try await run(presents: [.failure(failure)])
            guard case .failed(.windowClosed) = never.outcome else { return XCTFail("\(never.outcome)") }
            let later = try await run(presents: [.success(.pending(macSends: false)), .failure(failure)])
            guard case .failed(.codeExpired) = later.outcome else { return XCTFail("\(later.outcome)") }
            XCTAssertEqual(later.keys.held, [])
        }
    }

    /// Clause: an answer that is not one of the three ends it with one
    /// sentence.
    func testAStrangeAnswerEndsIt() async throws {
        for failure in [DoorFailure.malformed, .tooLarge, .unexpectedStatus(500)] {
            let r = try await run(presents: [.failure(failure)])
            guard case .failed(.strangeAnswer) = r.outcome else { return XCTFail("\(failure): \(r.outcome)") }
            XCTAssertTrue(r.secrets.isEmpty)
            XCTAssertEqual(r.keys.held, [])
        }
    }

    /// Clause: allowed, then a FIRST SIGNED READ this build cannot read ends
    /// pairing as a strange answer, and nothing is kept.
    func testAFirstReadThatCannotBeReadEndsItUnpaired() async throws {
        for failure in [DoorFailure.malformed, .tooLarge, .unexpectedStatus(500), .badPage] {
            let r = try await run(presents: [.success(.allowed(certificate: certificate))], reads: [.failure(failure)])
            guard case .failed(.strangeAnswer) = r.outcome else { return XCTFail("\(failure): \(r.outcome)") }
            XCTAssertTrue(r.secrets.isEmpty, "\(failure) kept a pairing")
            XCTAssertEqual(r.keys.held, [])
        }
    }

    /// Clause: "present again every 2 s until allowed or the window ends":
    /// a three-minute window is 90 presentations, then it ends.
    func testItPresentsEveryTwoSecondsUntilTheWindowEnds() async throws {
        let r = try await run(presents: [.success(.pending(macSends: false))])
        guard case .failed(.codeExpired) = r.outcome else { return XCTFail("\(r.outcome)") }
        XCTAssertEqual(r.door.presented.count, 90)
        XCTAssertEqual(PairingFlow.presentEvery, .seconds(2))
        XCTAssertTrue(r.secrets.isEmpty)
        XCTAssertEqual(r.keys.held, [])
    }

    /// Clause: a Mac that cannot be reached is tried for the whole window, and
    /// then it says so.
    func testUnreachableIsTriedForTheWholeWindow() async throws {
        let r = try await run(presents: [.failure(.unreachable(code: 61))])
        guard case .failed(.unreachable) = r.outcome else { return XCTFail("\(r.outcome)") }
        XCTAssertEqual(r.door.presented.count, 90)
        XCTAssertEqual(r.keys.held, [])
    }

    /// Clause (his 8 minutes): a name that does not resolve yet is tried again
    /// for the whole window, the screen is told it is finding the name, and a
    /// window that shuts first says the name did not reach the internet.
    func testANameNotYetOnTheInternetIsTriedAndSaid() async throws {
        let r = try await run(presents: [.failure(.nameNotFound)])
        guard case .failed(.nameNotFound) = r.outcome else { return XCTFail("\(r.outcome)") }
        XCTAssertEqual(r.door.presented.count, 90)
        XCTAssertEqual(r.steps, [.presenting, .findingName])
        XCTAssertEqual(r.keys.held, [])
    }

    /// Clause: once the name resolves the pairing goes on, and the screen is
    /// told the Mac has the phone.
    func testANameThatResolvesLaterPairs() async throws {
        let r = try await run(
            presents: [.failure(.nameNotFound), .failure(.nameNotFound), .success(.pending(macSends: false)), .success(.allowed(certificate: certificate))],
            reads: [.success(try list())]
        )
        guard case .paired = r.outcome else { return XCTFail("\(r.outcome)") }
        XCTAssertEqual(r.steps, [.presenting, .findingName, .waitingForMac, .confirming])
    }

    /// Clause: a code whose window has shut is not presented at all, and its
    /// client key does not outlive the attempt.
    func testAnExpiredCodeIsNotPresented() async throws {
        let door = StandInDoor(presents: [.success(.pending(macSends: false))], reads: [])
        let clock = StepClock(Date(timeIntervalSince1970: offer.expiresAt / 1000))
        let keys = MemoryClientKeys(spki: v.keys.clientKey)
        let pairing = PairingFlow(
            exchange: door, store: PairingStore(secrets: MemorySecrets(), clientKeys: keys), now: { clock.now }, pause: { clock.advance($0) }
        )
        let outcome = await pairing.run(try pairing.begin(offer, label: "x"))
        guard case .failed(.codeExpired) = outcome else { return XCTFail("\(outcome)") }
        XCTAssertEqual(door.presented.count, 0)
        XCTAssertEqual(keys.held, [])
    }

    /// Clause: the first read is tried three times when it cannot connect,
    /// and a pairing it never confirmed is not kept.
    func testTheFirstReadIsTriedThreeTimes() async throws {
        let first = try list()
        let paired = try await run(
            presents: [.success(.allowed(certificate: certificate))],
            reads: [.failure(.unreachable(code: 61)), .failure(.nameNotFound), .success(first)]
        )
        guard case .paired = paired.outcome else { return XCTFail("\(paired.outcome)") }
        XCTAssertEqual(paired.door.reads, 3)
        XCTAssertFalse(paired.secrets.isEmpty)

        let gaveUp = try await run(presents: [.success(.allowed(certificate: certificate))], reads: [.failure(.timedOut)])
        guard case .failed(.unreachable) = gaveUp.outcome else { return XCTFail("\(gaveUp.outcome)") }
        XCTAssertEqual(gaveUp.door.reads, PairingFlow.firstReadAttempts)
        XCTAssertTrue(gaveUp.secrets.isEmpty)
        XCTAssertEqual(gaveUp.keys.held, [])
    }

    /// Clause: a Keychain that will not keep the pairing is said, never
    /// pretended, and the key it would have kept goes.
    func testAPairingTheKeychainWillNotKeepIsNotPaired() async throws {
        let secrets = MemorySecrets()
        secrets.refuseWrites = true
        let r = try await run(presents: [.success(.allowed(certificate: certificate))], reads: [.success(try list())], secrets: secrets)
        guard case .failed(.couldNotSave) = r.outcome else { return XCTFail("\(r.outcome)") }
        XCTAssertEqual(r.keys.held, [])
    }

    /// Clause: a client key that cannot be made refuses before anything is
    /// presented.
    func testNoClientKeyNoPairing() throws {
        let keys = MemoryClientKeys(spki: v.keys.clientKey)
        keys.refuseMint = true
        let pairing = PairingFlow(exchange: StandInDoor(presents: [], reads: []), store: PairingStore(secrets: MemorySecrets(), clientKeys: keys))
        XCTAssertThrowsError(try pairing.begin(offer, label: "x")) { XCTAssertEqual($0 as? PairingFailure, .couldNotSave) }
    }

    /// Clause: leaving the screen stops the pairing and keeps nothing.
    func testLeavingTheScreenStopsIt() async throws {
        let door = StandInDoor(presents: [.success(.pending(macSends: false))], reads: [])
        let secrets = MemorySecrets()
        let keys = MemoryClientKeys(spki: v.keys.clientKey)
        let pairing = PairingFlow(
            exchange: door, store: PairingStore(secrets: secrets, clientKeys: keys),
            now: { [openedAt] in openedAt! }, pause: { try await Task.sleep(for: $0 * 30) }
        )
        let pending = try pairing.begin(offer, label: "x")
        let task = Task { await pairing.run(pending) }
        while door.presented.isEmpty { await Task.yield() }
        task.cancel()
        let outcome = await task.value
        guard case .failed(.cancelled) = outcome else { return XCTFail("\(outcome)") }
        XCTAssertTrue(secrets.isEmpty)
        XCTAssertEqual(keys.held, [])
    }

    // MARK: The label

    /// Clause: the label as the Mac will draw it: no control characters,
    /// trimmed, cut at a whole character to 64 UTF-16 units.
    func testTheLabelIsCutTheMacsWay() {
        XCTAssertEqual(PairingFlow.presentedLabel("  Greg’s\u{7} iPhone\n"), "Greg’s iPhone")
        XCTAssertEqual(PairingFlow.presentedLabel(String(repeating: "a", count: 100)).utf16.count, 64)
        XCTAssertEqual(PairingFlow.presentedLabel(String(repeating: "a", count: 63) + "👍"), String(repeating: "a", count: 63))
        XCTAssertEqual(PairingFlow.presentedLabel("a\u{200B}b"), "ab")
    }

    // MARK: The code

    private func code(_ edit: (inout [String: Any]) -> Void) throws -> String {
        var fields = try XCTUnwrap(JSONSerialization.jsonObject(with: Data(offerText.utf8)) as? [String: Any])
        edit(&fields)
        return String(decoding: try JSONSerialization.data(withJSONObject: fields), as: UTF8.self)
    }

    private func refused(_ text: String, _ failure: PairingFailure = .badCode, file: StaticString = #filePath, line: UInt = #line) {
        XCTAssertThrowsError(try PairingOffer.parse(text), file: file, line: line) {
            XCTAssertEqual($0 as? PairingFailure, failure, text, file: file, line: line)
        }
    }

    /// Clause: QR v:3 and nothing else; every field present and the right
    /// shape, or the whole code is refused; unknown fields are ignored.
    func testACodeIsCheckedFieldByField() throws {
        XCTAssertNoThrow(try PairingOffer.parse(try code { $0["later"] = ["x": 1] }))
        // Phase 333.1 (D24): a Tortie code of another version says which side
        // to update (testACodeFromAnotherVersionSaysWhichSideToUpdate).
        refused(try code { $0["v"] = 2 }, .codeFromOlderMac)
        refused(try code { $0["v"] = 4 }, .codeFromNewerMac)
        for key in ["v", "host", "port", "fp", "dk", "dx", "ps", "exp"] {
            refused(try code { $0.removeValue(forKey: key) })
        }
        refused(try code { $0["fp"] = Base64URL.encode(Data(count: 31)) })
        refused(try code { $0["fp"] = ($0["fp"] as? String ?? "") + "=" })
        refused(try code { $0["fp"] = DoorPairingTests.noncanonical($0["fp"] as? String ?? "") })
        refused(try code { $0["fp"] = String(repeating: "A", count: 64) })
        refused(try code { $0["dk"] = $0["dx"] })
        refused(try code { $0["dx"] = $0["dk"] })
        refused(try code { $0["ps"] = Base64URL.encode(Data(count: 8)) })
        refused(try code { $0["port"] = "8443" })
        refused(try code { $0["exp"] = "soon" })
        refused("not json")
        refused("[]")
        refused("")
        refused(try code { $0["pad"] = String(repeating: "x", count: 5000) })
    }

    /// Clause (Phase 333.1, build/p3331/SPEC.md D24, r2 §Attack F24): the
    /// version is read only behind THE TORTIE MARKER, an `fp` of 32 bytes
    /// beside a `dk` and a `dx`, so somebody else's code never says which side
    /// to update, and it is compared with this app's own version, never
    /// computed. The hostile table: every way to spell a version on a code
    /// that carries the marker, the 316.4 Mac's v:2 shape, and the foreign
    /// codes, each its own failure and none a crash. Fails when the marker's
    /// guard is taken out (the foreign rows then say older or newer) or when a
    /// version arm is written as one number.
    func testACodeFromAnotherVersionSaysWhichSideToUpdate() throws {
        let real = try XCTUnwrap(JSONSerialization.jsonObject(with: Data(offerText.utf8)) as? [String: Any])
        let marker: [String: Any] = ["fp": try XCTUnwrap(real["fp"]), "dk": try XCTUnwrap(real["dk"]), "dx": try XCTUnwrap(real["dx"])]
        func json(_ fields: [String: Any]) throws -> String {
            String(decoding: try JSONSerialization.data(withJSONObject: fields), as: UTF8.self)
        }
        // Every version, on a code that is otherwise the Mac's own.
        let versions: [(Any?, PairingFailure)] = [
            (1, .codeFromOlderMac),
            (2, .codeFromOlderMac),
            (4, .codeFromNewerMac),
            (99, .codeFromNewerMac),
            (100, .badCode),
            (0, .badCode),
            (-1, .badCode),
            ("3", .badCode),
            (3.5, .badCode),
            (9_007_199_254_740_992, .badCode),
            (Int.max, .badCode),
            (NSNull(), .badCode),
            (true, .badCode),
            (nil, .badCode)
        ]
        for (value, failure) in versions {
            let text = try code { fields in
                if let value { fields["v"] = value } else { fields.removeValue(forKey: "v") }
            }
            refused(text, failure)
        }
        // The same versions on the marker ALONE: what decides is the marker
        // and the version, never the rest of the shape.
        refused(try json(marker.merging(["v": 1]) { $1 }), .codeFromOlderMac)
        refused(try json(marker.merging(["v": 4]) { $1 }), .codeFromNewerMac)
        refused(try json(marker.merging(["v": 3]) { $1 }), .badCode)
        // The v:2 code as the 316.4 Mac drew it: its bind address, its port,
        // the pin, the two keys, the secret and the window's end, with its
        // tailnet-key field left out (rule p), which cannot move the verdict.
        var v2 = marker
        v2["v"] = 2
        v2["host"] = "100.64.0.7"
        v2["port"] = 7443
        v2["ps"] = try XCTUnwrap(real["ps"])
        v2["exp"] = try XCTUnwrap(real["exp"])
        refused(try json(v2), .codeFromOlderMac)
        // A v:3 code with one field wrong is still not a code.
        refused(try code { $0["port"] = 443 })
        refused(try code { $0["host"] = "100.64.0.7" })
        // THE FOREIGN CODES: no marker, so not Tortie's, whatever `v` says.
        var noPin = marker
        noPin.removeValue(forKey: "fp")
        noPin["v"] = 4
        var noSigning = marker
        noSigning.removeValue(forKey: "dk")
        noSigning["v"] = 2
        var noExchange = marker
        noExchange.removeValue(forKey: "dx")
        noExchange["v"] = 1
        var shortPin = marker
        shortPin["v"] = 4
        shortPin["fp"] = Base64URL.encode(Data(count: 16))
        var numberKey = marker
        numberKey["v"] = 1
        numberKey["dk"] = 5
        for foreign in [
            #"{"v":1}"#,
            #"{"v":2,"name":"x"}"#,
            #"{"v":4}"#,
            #"{"v":4,"fp":"short","dk":"a","dx":"b"}"#,
            try json(noPin),
            try json(noSigning),
            try json(noExchange),
            try json(shortPin),
            try json(numberKey)
        ] {
            refused(foreign, .badCode)
        }
        // Too large, not JSON, nothing: not a code, before anything is read.
        refused(try code { $0["v"] = 4; $0["pad"] = String(repeating: "x", count: 5000) }, .badCode)
        refused("not json", .badCode)
        refused(#"{"v":4,"#, .badCode)
        refused("", .badCode)
        // And each failure draws its own sentence (DoorWords).
        XCTAssertEqual(DoorWords.pairingSentence(for: .codeFromNewerMac), Copy.pairNewerMac)
        XCTAssertEqual(DoorWords.pairingSentence(for: .codeFromOlderMac), Copy.pairOlderMac)
        XCTAssertEqual(DoorWords.pairingSentence(for: .badCode), Copy.pairNotACode)
    }

    /// Clause (D24, conformance:ios rule k): the version arms read this app's
    /// own `PairingOffer.version`, compared and never computed, so the next
    /// version moves them with it.
    func testTheVersionArmsReadThisAppsVersion() throws {
        XCTAssertEqual(PairingOffer.version, 3)
        let source = try StyleSource.text("ios/Tortie/Door/Pairing.swift")
        XCTAssertTrue(source.contains("if marker.v > version && marker.v <= 99 { throw PairingFailure.codeFromNewerMac }"), "the newer arm is not compared with this app's version")
        XCTAssertTrue(source.contains("if marker.v >= 1 && marker.v < version { throw PairingFailure.codeFromOlderMac }"), "the older arm is not compared with this app's version")
        XCTAssertTrue(source.contains("guard marker.v == version,"), "this app's version does not go on to the whole shape")
    }

    /// The same 32 bytes spelled another way: the last character's two
    /// unused bits set. A pin has one spelling.
    static func noncanonical(_ pin: String) -> String {
        let alphabet = Array("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_")
        guard let last = pin.last, let at = alphabet.firstIndex(of: last) else { return pin }
        return String(pin.dropLast()) + String(alphabet[at | 0b11])
    }

    /// Clause: the door is a public `.ts.net` name at 8443 or 10000, in every
    /// build, and never an address.
    func testTheHostIsAPublicName() throws {
        for host in ["p330-mac.tail00000.ts.net", "gregs-macbook-pro.tail2ddfe1.ts.net"] {
            XCTAssertNoThrow(try PairingOffer.parse(try code { $0["host"] = host }), host)
        }
        for host in ["100.64.0.1", "127.0.0.1", "192.168.1.2", "Mac.tail.ts.net", "mac.tail.ts.net.evil.com", "door.example", "localhost"] {
            refused(try code { $0["host"] = host })
        }
        for port in [8443, 10000] {
            XCTAssertNoThrow(try PairingOffer.parse(try code { $0["port"] = port }), "\(port)")
        }
        for port in [443, 8823, 0, 70000] {
            refused(try code { $0["port"] = port })
        }
    }

    /// Clause (conformance:ios rule p): a value that holds the one-shot secret
    /// never repeats it. `print`, `String(describing:)`, `String(reflecting:)`,
    /// interpolation, `dump` and `Mirror` all read the offer, and the pending
    /// pairing that holds it, without the secret. Fails when `PairingOffer`'s
    /// `customMirror` is taken out.
    func testTheCodeNeverRepeatsItsSecret() throws {
        let parsed = try PairingOffer.parse(offerText)
        let ps = try XCTUnwrap((JSONSerialization.jsonObject(with: Data(offerText.utf8)) as? [String: Any])?["ps"] as? String)
        let pending = PendingPairing(
            offer: parsed, keys: PhoneKeys.generate(), clientKey: ClientKey(tag: "t", spki: "s"), label: "x", fingerprint: "f"
        )
        // The positive control: a value of the offer's shape with no mirror of
        // its own IS found holding the secret, so the search proves something.
        struct Unredacted { let secret: Data }
        XCTAssertTrue(reaches(Unredacted(secret: parsed.secret), parsed.secret), "the search cannot find the secret even where it is kept")
        for value in [parsed as Any, pending as Any] {
            let said = everythingSaid(about: value)
            XCTAssertFalse(said.contains(ps), said)
            XCTAssertFalse(said.contains(Hex.encode(parsed.secret)), said)
            XCTAssertFalse(said.contains(parsed.secret.base64EncodedString()), said)
            XCTAssertFalse(reaches(value, parsed.secret), "a mirror reaches the secret: \(said)")
            XCTAssertTrue(said.contains(parsed.door.name), "the description says nothing at all: \(said)")
        }
    }

    /// Whether any mirror under `value`, to eight levels, holds these bytes or
    /// a child named `secret`. A `Data` prints as "16 bytes", so reading the
    /// words alone would never find it.
    private func reaches(_ value: Any, _ secret: Data, depth: Int = 0) -> Bool {
        if let data = value as? Data, data == secret { return true }
        if let bytes = value as? [UInt8], Data(bytes) == secret { return true }
        guard depth < 8 else { return false }
        for child in Mirror(reflecting: value).children {
            if child.label == "secret" || reaches(child.value, secret, depth: depth + 1) { return true }
        }
        return false
    }

    // MARK: Keeping it

    private func paired(_ keys: MemoryClientKeys) throws -> PairedDoor {
        let key = try keys.mint()
        return try XCTUnwrap(PairedDoor(
            endpoint: offer.door, macSigningKey: offer.macSigningKey, macExchangeKey: offer.macExchangeKey,
            label: "x", pairedAt: 1, keys: PhoneKeys.generate(), clientKey: key, certificate: certificate,
            identity: try keys.adopt(certificate, for: key), alerts: .nothing
        ))
    }

    /// Clause: the pairing reads back whole: the same keys, the same derived
    /// identity, the same pin, the same client key and certificate.
    func testAPairingReadsBackWhole() throws {
        let secrets = MemorySecrets()
        let keys = MemoryClientKeys(spki: v.keys.clientKey)
        let store = PairingStore(secrets: secrets, clientKeys: keys)
        let door = try paired(keys)
        try store.save(door)
        let back = try XCTUnwrap(store.load())
        XCTAssertEqual(back.endpoint, door.endpoint)
        XCTAssertEqual(back.phoneId, door.phoneId)
        XCTAssertEqual(back.binding, door.binding)
        XCTAssertEqual(back.fingerprint, door.fingerprint)
        XCTAssertEqual(back.clientKey, door.clientKey)
        XCTAssertEqual(back.certificate, door.certificate)
        XCTAssertEqual(back.keys.signing.rawRepresentation, door.keys.signing.rawRepresentation)
        XCTAssertEqual(back.keys.exchange.rawRepresentation, door.keys.exchange.rawRepresentation)
        try store.forget()
        XCTAssertNil(store.load())
        XCTAssertEqual(keys.held, [], "forgetting the pairing forgets every client key")
    }

    /// Clause: a record that does not read back whole, or whose client key is
    /// gone, is removed and the phone is not paired, never partly paired.
    func testABrokenRecordIsRemoved() throws {
        for edit in [("name", "100.64.0.1"), ("port", "8823"), ("clientTag", "not-a-tag"), ("certificate", "AAAA")] {
            let secrets = MemorySecrets()
            let keys = MemoryClientKeys(spki: v.keys.clientKey)
            let store = PairingStore(secrets: secrets, clientKeys: keys)
            try store.save(try paired(keys))
            var record = try XCTUnwrap(JSONSerialization.jsonObject(with: try XCTUnwrap(secrets.item(PairingStore.account))) as? [String: Any])
            if edit.0 == "port" {
                record["port"] = 8823
            } else {
                record[edit.0] = edit.1
            }
            try secrets.write(try JSONSerialization.data(withJSONObject: record), account: PairingStore.account)
            XCTAssertNil(store.load(), edit.0)
            XCTAssertTrue(secrets.isEmpty, "the broken record was left behind (\(edit.0))")
            XCTAssertEqual(keys.held, [], "the broken record's key was left behind (\(edit.0))")
        }
        let secrets = MemorySecrets()
        let keys = MemoryClientKeys(spki: v.keys.clientKey)
        let store = PairingStore(secrets: secrets, clientKeys: keys)
        let door = try paired(keys)
        try store.save(door)
        keys.delete(tag: door.clientKey.tag)
        XCTAssertNil(store.load(), "a pairing whose client key is gone is not a pairing")
        XCTAssertTrue(secrets.isEmpty)
    }

    /// Clause: a leftover `pairing-v1`, the tailnet build's record, is removed
    /// and is no pairing.
    func testTheTailnetBuildsRecordIsRemoved() throws {
        let secrets = MemorySecrets()
        try secrets.write(Data(#"{"v":1,"host":"100.64.0.1","port":8823}"#.utf8), account: PairingStore.formerAccount)
        let store = PairingStore(secrets: secrets, clientKeys: MemoryClientKeys(spki: v.keys.clientKey))
        XCTAssertNil(store.load())
        XCTAssertNil(secrets.item(PairingStore.formerAccount))
        XCTAssertEqual(PairingStore.account, "pairing-v2")
    }

    #if DEBUG
    /// Clause (DEBUG seam): the code arrives as a launch argument.
    func testTheDebugSeamReadsTheLaunchArgument() {
        XCTAssertEqual(PairingDebugSeam.injectedPayload(["app", "-TortieDebugPairingPayload", "{}"]), "{}")
        XCTAssertNil(PairingDebugSeam.injectedPayload(["app", "-TortieDebugPairingPayload"]))
        XCTAssertNil(PairingDebugSeam.injectedPayload(["app"]))
        XCTAssertTrue(PairingDebugSeam.forgetRequested(["app", "-TortieDebugForgetPairing"]))
        XCTAssertFalse(PairingDebugSeam.forgetRequested(["app"]))
    }
    #endif
}

// MARK: - Stand-ins

/// A door that answers what the test names, in order; the last answer
/// repeats. It records what it was sent.
final class StandInDoor: DoorExchanging, @unchecked Sendable {
    private let lock = NSLock()
    private var presents: [Result<PairAnswer, DoorFailure>]
    private var readAnswers: [Result<PocketBlockedAnswer, DoorFailure>]
    private var _presented: [Data] = []
    private var _readDoors: [PairedDoor] = []

    init(presents: [Result<PairAnswer, DoorFailure>], reads: [Result<PocketBlockedAnswer, DoorFailure>]) {
        self.presents = presents
        self.readAnswers = reads
    }

    var presented: [Data] { lock.withLock { _presented } }
    var reads: Int { lock.withLock { _readDoors.count } }
    var readDoors: [PairedDoor] { lock.withLock { _readDoors } }

    func present(_ presentation: Data, to door: DoorEndpoint) async throws -> PairAnswer {
        let answer: Result<PairAnswer, DoorFailure> = lock.withLock {
            _presented.append(presentation)
            return presents.count > 1 ? presents.removeFirst() : presents[0]
        }
        return try answer.get()
    }

    func blocked(_ door: PairedDoor) async throws -> PocketBlockedAnswer {
        let answer: Result<PocketBlockedAnswer, DoorFailure> = lock.withLock {
            _readDoors.append(door)
            guard !readAnswers.isEmpty else { return .failure(.refused) }
            return readAnswers.count > 1 ? readAnswers.removeFirst() : readAnswers[0]
        }
        return try answer.get()
    }
}

/// Secrets in memory, so no test touches a keychain.
final class MemorySecrets: SecretStore, @unchecked Sendable {
    private let lock = NSLock()
    private var items: [String: Data] = [:]
    var refuseWrites = false

    var isEmpty: Bool { lock.withLock { items.isEmpty } }
    func item(_ account: String) -> Data? { lock.withLock { items[account] } }

    func read(_ account: String) throws -> Data? { lock.withLock { items[account] } }

    func write(_ data: Data, account: String) throws {
        try lock.withLock {
            if refuseWrites { throw KeysFailure.keychain(-25308) }
            items[account] = data
        }
    }

    func remove(_ account: String) throws {
        lock.withLock { _ = items.removeValue(forKey: account) }
    }
}

/// A clock that moves only when the flow pauses.
final class StepClock: @unchecked Sendable {
    private let lock = NSLock()
    private var current: Date

    init(_ start: Date) { current = start }

    var now: Date { lock.withLock { current } }

    func advance(_ duration: Duration) {
        let (seconds, attoseconds) = duration.components
        lock.withLock { current += Double(seconds) + Double(attoseconds) / 1e18 }
    }
}

/// The steps a flow reported, in order.
final class StepLog: @unchecked Sendable {
    private let lock = NSLock()
    private var steps: [PairingStep] = []
    func append(_ step: PairingStep) { lock.withLock { steps.append(step) } }
    var all: [PairingStep] { lock.withLock { steps } }
}

/// Everything Swift says about a value: `print`'s and interpolation's words,
/// `debugPrint`'s, `dump`'s, and every label and value `Mirror` walks to eight
/// levels. The rule p tests read it for the secret.
func everythingSaid(about value: Any) -> String {
    var out = "\(String(describing: value))\n\(String(reflecting: value))\n\(value)\n"
    dump(value, to: &out)
    func walk(_ mirror: Mirror, _ depth: Int) {
        guard depth < 8 else { return }
        for child in mirror.children {
            out += "\(child.label ?? "_")=\(String(reflecting: child.value))\n"
            walk(Mirror(reflecting: child.value), depth + 1)
        }
        if let parent = mirror.superclassMirror { walk(parent, depth + 1) }
    }
    walk(Mirror(reflecting: value), 0)
    return out
}
