import CryptoKit
import Foundation
import XCTest
@testable import Tortie

/// Pairing, in the Mac's order, and ending ONLY in a signed read
/// (build/p316/SPEC.md section 4 S2; 316.1's open nit P2b: after Allow the
/// door answers `allowed` to any presenter from the allowed phone's address,
/// so `allowed` alone is not success). The door is a stand-in that answers
/// what each test names; the keys are real and the seal is the one the door's
/// own opener opened in `DoorVectorTests`.
///
/// Each test names the clause it holds and fails when that clause is taken
/// out of `ios/Tortie/Door/Pairing.swift` or `Keys.swift`.
final class DoorPairingTests: XCTestCase {
    private var v: DoorVectorFile!
    private var offerText: String!
    private var offer: PairingOffer!
    private var openedAt: Date!

    override func setUpWithError() throws {
        v = try DoorVectorFile.load()
        offerText = try XCTUnwrap(v.qr.first { $0.name == "tailnet-no-key" }).payload
        offer = try PairingOffer.parse(offerText)
        // The Mac's window is three minutes; the phone reads it at its start.
        openedAt = Date(timeIntervalSince1970: (offer.expiresAt - 180_000) / 1000)
    }

    private func list() throws -> PocketBlockedAnswer {
        try JSONDecoder().decode(PocketBlockedAnswer.self, from: Data(try XCTUnwrap(v.answers["blocked"]).json.utf8))
    }

    private func flow(_ door: StandInDoor, _ secrets: MemorySecrets, clock: StepClock) -> PairingFlow {
        PairingFlow(
            exchange: door,
            store: PairingStore(secrets: secrets),
            now: { clock.now },
            pause: { clock.advance($0) }
        )
    }

    private func run(
        presents: [Result<PairAnswer, DoorFailure>],
        reads: [Result<PocketBlockedAnswer, DoorFailure>] = [],
        secrets: MemorySecrets = MemorySecrets()
    ) async throws -> (PairingOutcome, StandInDoor, MemorySecrets, [PairingStep], PendingPairing) {
        let door = StandInDoor(presents: presents, reads: reads)
        let clock = StepClock(openedAt)
        let pairing = flow(door, secrets, clock: clock)
        let pending = pairing.begin(offer, label: "Tortie’s iPhone")
        let steps = StepLog()
        let outcome = await pairing.run(pending) { steps.append($0) }
        return (outcome, door, secrets, steps.all, pending)
    }

    // MARK: The order

    /// Clause: present, keep presenting while pending, and only after
    /// `allowed` AND a signed read that succeeded, keep the pairing.
    func testPairedOnlyAfterTheFirstSignedRead() async throws {
        let first = try list()
        let (outcome, door, secrets, steps, pending) = try await run(
            presents: [.success(.pending), .success(.pending), .success(.allowed)],
            reads: [.success(first)]
        )
        guard case let .paired(paired, answer) = outcome else { return XCTFail("\(outcome)") }
        XCTAssertEqual(answer, first)
        XCTAssertEqual(door.presented.count, 3)
        XCTAssertEqual(door.reads, 1)
        XCTAssertEqual(steps, [.presenting, .waitingForMac, .confirming])
        XCTAssertEqual(paired.address, offer.address)
        XCTAssertEqual(paired.fingerprint, pending.fingerprint)
        // Every presentation is sealed under the QR's secret, freshly, and
        // carries this phone's keys and label.
        XCTAssertEqual(Set(door.presented).count, 3, "each presentation has a fresh nonce")
        for body in door.presented {
            let inner = try PresentationSeal.open(body, secret: offer.secret)
            let fields = try XCTUnwrap(JSONSerialization.jsonObject(with: inner) as? [String: String])
            XCTAssertEqual(fields, ["label": "Tortie’s iPhone", "ek": pending.keys.signingKey, "xk": pending.keys.exchangeKey])
        }
        // The read the pairing was confirmed by was signed by the kept keys.
        let kept = try XCTUnwrap(PairingStore(secrets: secrets).load())
        XCTAssertEqual(kept.phoneId, paired.phoneId)
        XCTAssertEqual(kept.binding, paired.binding)
        XCTAssertEqual(door.readDoors.first?.phoneId, kept.phoneId)
    }

    /// Clause (P2b): `allowed` followed by a refused signed read is NOT paired,
    /// and nothing is kept.
    func testAllowedAloneIsNotPaired() async throws {
        let (outcome, door, secrets, _, _) = try await run(
            presents: [.success(.allowed)], reads: [.failure(.refused)]
        )
        guard case .failed(.notAccepted) = outcome else { return XCTFail("\(outcome)") }
        XCTAssertEqual(door.reads, 1)
        XCTAssertTrue(secrets.isEmpty, "a phone the door would not read for kept a pairing")
        XCTAssertNil(PairingStore(secrets: secrets).load())
    }

    /// Clause: `refused` ends it at once, and nothing is read or kept.
    func testRefusedEndsIt() async throws {
        let (outcome, door, secrets, _, _) = try await run(presents: [.success(.pending), .success(.refused)])
        guard case .failed(.macRefused) = outcome else { return XCTFail("\(outcome)") }
        XCTAssertEqual(door.presented.count, 2)
        XCTAssertEqual(door.reads, 0)
        XCTAssertTrue(secrets.isEmpty)
    }

    /// Clause: a door that does not present the pinned key ends it at once.
    func testAWrongKeyEndsItAtOnce() async throws {
        let (outcome, door, secrets, _, _) = try await run(presents: [.failure(.wrongKey)])
        guard case .failed(.wrongKey) = outcome else { return XCTFail("\(outcome)") }
        XCTAssertEqual(door.presented.count, 1)
        XCTAssertTrue(secrets.isEmpty)
    }

    /// Clause: `/pair` answering 404 is a shut window: before the Mac had the
    /// phone it is `windowClosed`, after it `codeExpired`.
    func testA404IsAShutWindow() async throws {
        let (never, _, _, _, _) = try await run(presents: [.failure(.refused)])
        guard case .failed(.windowClosed) = never else { return XCTFail("\(never)") }
        let (later, _, _, _, _) = try await run(presents: [.success(.pending), .failure(.refused)])
        guard case .failed(.codeExpired) = later else { return XCTFail("\(later)") }
    }

    /// Clause: an answer that is not one of the three words ends it with one
    /// sentence.
    func testAStrangeAnswerEndsIt() async throws {
        for failure in [DoorFailure.malformed, .tooLarge, .unexpectedStatus(500)] {
            let (outcome, _, secrets, _, _) = try await run(presents: [.failure(failure)])
            guard case .failed(.strangeAnswer) = outcome else { return XCTFail("\(failure): \(outcome)") }
            XCTAssertTrue(secrets.isEmpty)
        }
    }

    /// Clause (Phase 316.2's fix round): allowed, then a FIRST SIGNED READ this
    /// build cannot read (too large, not JSON, a status the door never sends,
    /// a page that breaks its promise) ends pairing as a strange answer, which
    /// the pairing screen says as `Copy.pairAnswerUnknown` (ScreensModelTests
    /// holds that mapping), and nothing is kept. The list's `answerTooLarge`
    /// and `answerUnreadable` are a paired phone's words, and this phone is not.
    func testAFirstReadThatCannotBeReadEndsItUnpaired() async throws {
        for failure in [DoorFailure.malformed, .tooLarge, .unexpectedStatus(500), .badPage] {
            let (outcome, _, secrets, _, _) = try await run(presents: [.success(.allowed)], reads: [.failure(failure)])
            guard case .failed(.strangeAnswer) = outcome else { return XCTFail("\(failure): \(outcome)") }
            XCTAssertTrue(secrets.isEmpty, "\(failure) kept a pairing")
        }
    }

    /// Clause: "present again every 2 s until allowed or the window ends":
    /// a three-minute window is 90 presentations, then it ends.
    func testItPresentsEveryTwoSecondsUntilTheWindowEnds() async throws {
        let (outcome, door, secrets, _, _) = try await run(presents: [.success(.pending)])
        guard case .failed(.codeExpired) = outcome else { return XCTFail("\(outcome)") }
        XCTAssertEqual(door.presented.count, 90)
        XCTAssertEqual(PairingFlow.presentEvery, .seconds(2))
        XCTAssertTrue(secrets.isEmpty)
    }

    /// Clause: a Mac that cannot be reached is tried for the whole window, and
    /// then it says so.
    func testUnreachableIsTriedForTheWholeWindow() async throws {
        let (outcome, door, _, _, _) = try await run(presents: [.failure(.unreachable(code: -1004))])
        guard case .failed(.unreachable) = outcome else { return XCTFail("\(outcome)") }
        XCTAssertEqual(door.presented.count, 90)
    }

    /// Clause: a code whose window has shut is not presented at all.
    func testAnExpiredCodeIsNotPresented() async throws {
        let door = StandInDoor(presents: [.success(.pending)], reads: [])
        let clock = StepClock(Date(timeIntervalSince1970: offer.expiresAt / 1000))
        let pairing = flow(door, MemorySecrets(), clock: clock)
        let outcome = await pairing.run(pairing.begin(offer, label: "x"))
        guard case .failed(.codeExpired) = outcome else { return XCTFail("\(outcome)") }
        XCTAssertEqual(door.presented.count, 0)
    }

    /// Clause: the first read is tried three times when it cannot connect,
    /// and a pairing it never confirmed is not kept.
    func testTheFirstReadIsTriedThreeTimes() async throws {
        let first = try list()
        let (paired, door, secrets, _, _) = try await run(
            presents: [.success(.allowed)],
            reads: [.failure(.unreachable(code: -1004)), .failure(.timedOut), .success(first)]
        )
        guard case .paired = paired else { return XCTFail("\(paired)") }
        XCTAssertEqual(door.reads, 3)
        XCTAssertFalse(secrets.isEmpty)

        let (gaveUp, again, none, _, _) = try await run(
            presents: [.success(.allowed)],
            reads: [.failure(.unreachable(code: -1004))]
        )
        guard case .failed(.unreachable) = gaveUp else { return XCTFail("\(gaveUp)") }
        XCTAssertEqual(again.reads, PairingFlow.firstReadAttempts)
        XCTAssertTrue(none.isEmpty)
    }

    /// Clause: a Keychain that will not keep the pairing is said, never
    /// pretended.
    func testAPairingTheKeychainWillNotKeepIsNotPaired() async throws {
        let secrets = MemorySecrets()
        secrets.refuseWrites = true
        let (outcome, _, _, _, _) = try await run(
            presents: [.success(.allowed)], reads: [.success(try list())], secrets: secrets
        )
        guard case .failed(.couldNotSave) = outcome else { return XCTFail("\(outcome)") }
    }

    /// Clause: leaving the screen stops the pairing and keeps nothing.
    func testLeavingTheScreenStopsIt() async throws {
        let door = StandInDoor(presents: [.success(.pending)], reads: [])
        let secrets = MemorySecrets()
        let pairing = PairingFlow(
            exchange: door, store: PairingStore(secrets: secrets),
            now: { [openedAt] in openedAt! }, pause: { try await Task.sleep(for: $0 * 30) }
        )
        let pending = pairing.begin(offer, label: "x")
        let task = Task { await pairing.run(pending) }
        while door.presented.isEmpty { await Task.yield() }
        task.cancel()
        let outcome = await task.value
        guard case .failed(.cancelled) = outcome else { return XCTFail("\(outcome)") }
        XCTAssertTrue(secrets.isEmpty)
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

    /// Clause: QR v:2 and nothing else; every field present and the right
    /// shape, or the whole code is refused; unknown fields are ignored.
    func testACodeIsCheckedFieldByField() throws {
        XCTAssertNoThrow(try PairingOffer.parse(try code { $0["later"] = ["x": 1] }))
        refused(try code { $0["v"] = 1 }, .unsupportedCode)
        refused(try code { $0["v"] = 3 }, .unsupportedCode)
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
        refused(try code { $0["port"] = 0 })
        refused(try code { $0["port"] = 70000 })
        refused(try code { $0["port"] = "8823" })
        refused(try code { $0["exp"] = "soon" })
        refused("not json")
        refused("[]")
        refused("")
        refused(try code { $0["pad"] = String(repeating: "x", count: 5000) })
    }

    /// The same 32 bytes spelled another way: the last character's two
    /// unused bits set. A pin has one spelling.
    static func noncanonical(_ pin: String) -> String {
        let alphabet = Array("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_")
        guard let last = pin.last, let at = alphabet.firstIndex(of: last) else { return pin }
        return String(pin.dropLast()) + String(alphabet[at | 0b11])
    }

    /// Clause: the door is on the tailnet, 100.64.0.0/10, the one range the
    /// App Transport Security key names. A DEBUG build also takes loopback.
    func testTheHostIsATailnetAddress() throws {
        for host in ["100.64.0.1", "100.127.255.254", "100.101.102.103"] {
            XCTAssertNoThrow(try PairingOffer.parse(try code { $0["host"] = host }), host)
        }
        for host in ["100.63.255.255", "100.128.0.1", "10.0.0.1", "192.168.1.2", "0.0.0.0", "8.8.8.8", "door.example", "100.64.0.1.nip.io"] {
            refused(try code { $0["host"] = host })
        }
        #if DEBUG
        XCTAssertNoThrow(try PairingOffer.parse(try code { $0["host"] = "127.0.0.1" }))
        #else
        refused(try code { $0["host"] = "127.0.0.1" })
        #endif
    }

    /// Clause: `tk` is optional, and when present it is an auth key or the
    /// whole code is refused. It is kept only in the parsed code.
    func testTheTailnetKeyIsAnAuthKeyOrNothing() throws {
        XCTAssertNil(try PairingOffer.parse(offerText).tailnetKey)
        XCTAssertEqual(try PairingOffer.parse(try code { $0["tk"] = v.madeUpTailnetKey }).tailnetKey, v.madeUpTailnetKey)
        refused(try code { $0["tk"] = "tskey-api-k123" })
        refused(try code { $0["tk"] = "tskey-auth-" })
        refused(try code { $0["tk"] = "tskey-auth-has space" })
        refused(try code { $0["tk"] = "tskey-auth-" + String(repeating: "k", count: 250) })
        refused(try code { $0["tk"] = 7 })
    }

    // MARK: Keeping it

    private func paired(_ secrets: MemorySecrets) throws -> PairedDoor {
        let keys = PhoneKeys.generate()
        return try XCTUnwrap(PairedDoor(
            address: offer.address, macSigningKey: offer.macSigningKey, macExchangeKey: offer.macExchangeKey,
            label: "x", pairedAt: 1, keys: keys
        ))
    }

    /// Clause: the pairing reads back whole: the same keys, the same derived
    /// identity, the same pin.
    func testAPairingReadsBackWhole() throws {
        let secrets = MemorySecrets()
        let store = PairingStore(secrets: secrets)
        let door = try paired(secrets)
        try store.save(door)
        let back = try XCTUnwrap(store.load())
        XCTAssertEqual(back.address, door.address)
        XCTAssertEqual(back.phoneId, door.phoneId)
        XCTAssertEqual(back.binding, door.binding)
        XCTAssertEqual(back.keys.signing.rawRepresentation, door.keys.signing.rawRepresentation)
        XCTAssertEqual(back.keys.exchange.rawRepresentation, door.keys.exchange.rawRepresentation)
        try store.forget()
        XCTAssertNil(store.load())
    }

    /// Clause: a record that does not read back whole is removed and the phone
    /// is not paired, never partly paired.
    func testABrokenRecordIsRemoved() throws {
        let secrets = MemorySecrets()
        let store = PairingStore(secrets: secrets)
        try store.save(try paired(secrets))
        var record = try XCTUnwrap(JSONSerialization.jsonObject(with: try XCTUnwrap(secrets.item(PairingStore.account))) as? [String: Any])
        record["host"] = "evil.example"
        try secrets.write(try JSONSerialization.data(withJSONObject: record), account: PairingStore.account)
        XCTAssertNil(store.load())
        XCTAssertTrue(secrets.isEmpty, "the broken record was left behind")
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

    func present(_ sealed: Data, to door: DoorAddress) async throws -> PairAnswer {
        let answer: Result<PairAnswer, DoorFailure> = lock.withLock {
            _presented.append(sealed)
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
