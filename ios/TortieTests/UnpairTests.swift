import Foundation
import XCTest
@testable import Tortie

/// Unpair this iPhone (Phase 316.6, build/p3166/SPEC.md section 5.4; one Mac
/// of several since Phase 345, build/p345/SPEC.md section 3.3), with
/// stand-ins: with one Mac kept the app goes back to Pairing with its
/// not-paired line, both tabs' places and every word about the old pairing
/// dropped, and tells iOS to forget this install's alert address once; a
/// record that stays says nothing changed and forgets nothing; and through the
/// SHIPPING `LiveDoor.unpair(name:)` over stores in memory, the named Mac's
/// record goes FIRST, so a record whose removal fails leaves every client key
/// where it was, and every OTHER Mac's record and key stay whatever happens.
/// The real Keychain's half is UnpairKeychainTests; the app with several Macs
/// is MacsTests'. Each test names the clause it holds, and each fails when
/// that clause is taken out of App/TortieApp.swift or Door/Keys.swift.
final class UnpairTests: XCTestCase {
    // MARK: The app

    /// Clause: `.forgotten` goes to Pairing with `This iPhone is not paired
    /// with a Mac.`, empties both paths, lands on Needs input, drops the list,
    /// the reader and what iOS allows, and calls `forgetAddress()` once; it is
    /// Unpair's own door verb and never the DEBUG forget, which swallows a
    /// failure. A second Unpair, on Pairing, does nothing.
    @MainActor
    func testForgottenGoesToPairingAndForgetsTheAddressOnce() async throws {
        let phone = StandInPhone(kept: ScriptedReader(alerts: AlertsKept(macSends: true, presented: nil)))
        let alerts = StandInAlerts(authorization: .authorized)
        let app = AppModel(door: phone, label: "iPhone", alerts: alerts)
        let mac = app.reader?.facts.publicName ?? ""
        await app.readAlertPermission()
        XCTAssertEqual(app.alertPermission, .authorized)
        app.tab = .settings
        app.waitingPath = [.session(mac: mac, id: "w", name: "w")]
        app.sessionsPath = [.session(mac: mac, id: "o", name: "o"), .catchUp(mac: mac, id: "o", honestLine: nil)]

        app.unpair()

        XCTAssertEqual(phone.unpairs, 1)
        XCTAssertEqual(phone.forgets, 0, "Unpair went through the DEBUG forget, which swallows a failure")
        XCTAssertEqual(app.root, .pairing)
        XCTAssertEqual(app.pairing.line, Copy.notPaired)
        XCTAssertEqual(app.waitingPath, [])
        XCTAssertEqual(app.sessionsPath, [])
        XCTAssertEqual(app.tab, .needsInput)
        XCTAssertNil(app.list)
        XCTAssertNil(app.reader)
        XCTAssertNil(app.settingsLine)
        XCTAssertNil(app.alertPermission, "what iOS allowed for the old pairing outlived it")
        let forgetting = try XCTUnwrap(app.forgetting, "Unpair told iOS nothing")
        await forgetting.value
        XCTAssertEqual(alerts.addressForgets, 1)

        // The pairing is gone, so a return to the foreground stays on Pairing,
        // and a second press does nothing at all.
        app.cameToForeground()
        XCTAssertEqual(app.root, .pairing)
        app.unpair()
        await app.forgetting?.value
        XCTAssertEqual(phone.unpairs, 1)
        XCTAssertEqual(alerts.addressForgets, 1)
    }

    /// Clause: `.kept` stays where it is, draws `This iPhone could not forget
    /// your Mac. Nothing was changed.`, and tells iOS nothing.
    @MainActor
    func testKeptStaysAndSaysNothingChanged() async {
        let phone = StandInPhone(kept: ScriptedReader(alerts: AlertsKept(macSends: true, presented: nil)))
        phone.unpairOutcome = .kept
        let alerts = StandInAlerts(authorization: .authorized)
        let app = AppModel(door: phone, label: "iPhone", alerts: alerts)
        let mac = app.reader?.facts.publicName ?? ""
        app.tab = .settings
        app.sessionsPath = [.session(mac: mac, id: "o", name: "o")]

        app.unpair()

        XCTAssertEqual(phone.unpairs, 1)
        XCTAssertEqual(app.root, .reading)
        XCTAssertEqual(app.settingsLine, Copy.unpairFailed)
        XCTAssertNil(app.forgetting, "a kept pairing told iOS to forget its address")
        XCTAssertEqual(alerts.addressForgets, 0)
        XCTAssertEqual(app.tab, .settings)
        XCTAssertEqual(app.sessionsPath, [.session(mac: mac, id: "o", name: "o")])
        XCTAssertNotNil(app.list)
        XCTAssertNotNil(app.reader)
    }

    // MARK: The door, over stores in memory

    private let studio = "studio.tail00000.ts.net"
    private let laptop = "laptop.tail00000.ts.net"

    override func tearDown() {
        #if os(iOS)
        TestIdentity.removeFromKeychain()
        #endif
    }

    private func keys(_ count: Int) throws -> MemoryClientKeys {
        let keys = MemoryClientKeys(spki: try DoorVectorFile.load().keys.clientKey)
        for _ in 0..<count { _ = try keys.mint() }
        return keys
    }

    private func door(_ secrets: SecretStore, _ keys: MemoryClientKeys) -> LiveDoor {
        LiveDoor(store: PairingStore(secrets: secrets, clientKeys: keys), transport: NameTransport())
    }

    /// The bytes of a record of the Mac `name`, as the shipping encode writes
    /// it, under a fresh client key `keys` holds.
    private func record(_ name: String, _ keys: MemoryClientKeys, pairedAt: Double = 1) throws -> (data: Data, tag: String) {
        let v = try DoorVectorFile.load()
        let certificate = try XCTUnwrap(Data(base64Encoded: v.client.certificateDer))
        let key = try keys.mint()
        let door = try XCTUnwrap(PairedDoor(
            endpoint: DoorEndpoint(name: name, port: 8443, pin: Base64URL.encode(Data(count: 32))),
            macSigningKey: v.keys.macSigningKey, macExchangeKey: v.keys.macExchangeKey, label: "x", pairedAt: pairedAt,
            keys: PhoneKeys.generate(), clientKey: key, certificate: certificate,
            identity: try keys.adopt(certificate, for: key), alerts: .nothing
        ))
        return (try PairingStore.encode(door), key.tag)
    }

    /// Clause (THE ORDER): a record whose removal throws is `.kept`, and
    /// because the record goes first, every client key is still there, so
    /// "Nothing was changed." is true; the other Mac's record is untouched.
    func testARecordThatWillNotGoTouchesNoKey() throws {
        let keys = try keys(1)
        let a = try record(studio, keys)
        let b = try record(laptop, keys)
        let held = keys.held
        let secrets = RefusingSecrets(holding: [PairingStore.account: a.data, "pairing-v2-0123456789abcdef": b.data])
        XCTAssertEqual(door(secrets, keys).unpair(name: laptop), .kept)
        XCTAssertEqual(keys.held, held, "a client key was deleted while the record stayed")
        XCTAssertTrue(secrets.holds(PairingStore.account))
        XCTAssertTrue(secrets.holds("pairing-v2-0123456789abcdef"))
    }

    /// Clause (Phase 345): Unpair of one of two Macs removes that Mac's
    /// record and then its client key, `.forgotten`; the other Mac's record
    /// and key stay, and it still reads back.
    func testUnpairOfOneMacLeavesTheOther() throws {
        let keys = try keys(0)
        let a = try record(studio, keys)
        let b = try record(laptop, keys, pairedAt: 2)
        let secrets = MemorySecrets()
        try secrets.write(a.data, account: PairingStore.account)
        try secrets.write(b.data, account: "pairing-v2-0123456789abcdef")
        let store = PairingStore(secrets: secrets, clientKeys: keys)
        let live = LiveDoor(store: store, transport: NameTransport())
        XCTAssertEqual(live.unpair(name: laptop), .forgotten)
        XCTAssertEqual(secrets.held, [PairingStore.account])
        XCTAssertEqual(keys.held, [a.tag], "the other Mac's key went, or this one's stayed")
        XCTAssertFalse(store.holdsRecord(name: laptop))
        XCTAssertTrue(store.holdsRecord(name: studio))
        XCTAssertEqual(store.loadAll().map(\.endpoint.name), [studio])
        XCTAssertEqual(live.pairedReaders().map(\.facts.publicName), [studio])
    }

    /// Clause: the LAST Mac's record goes and takes every client key and the
    /// former record with it, `.forgotten`, as the one Mac's Unpair always
    /// did; and Unpair with nothing kept is `.forgotten` too, never an error.
    func testTheLastRecordTakesEveryKey() throws {
        let keys = try keys(2)
        let secrets = MemorySecrets()
        try secrets.write(try record(studio, keys).data, account: PairingStore.account)
        try secrets.write(Data("former".utf8), account: PairingStore.formerAccount)
        let store = PairingStore(secrets: secrets, clientKeys: keys)
        XCTAssertTrue(store.holdsRecord)
        XCTAssertEqual(LiveDoor(store: store, transport: NameTransport()).unpair(name: studio), .forgotten)
        XCTAssertTrue(secrets.isEmpty)
        XCTAssertEqual(keys.held, [])
        XCTAssertFalse(store.holdsRecord)
        XCTAssertEqual(LiveDoor(store: store, transport: NameTransport()).unpair(name: studio), .forgotten)
    }

    /// Clause: a record that cannot be PROVED gone is `.kept`: one whose
    /// removal answers yet still reads back, and one that cannot be read.
    func testARecordThatCannotBeProvedGoneIsKept() throws {
        let keys = try keys(0)
        let sticky = StickySecrets(record: try record(studio, keys).data, readable: true)
        XCTAssertEqual(door(sticky, keys).unpair(name: studio), .kept)
        let unreadable = StickySecrets(record: nil, readable: false)
        let store = PairingStore(secrets: unreadable, clientKeys: try self.keys(0))
        XCTAssertTrue(store.holdsRecord(name: studio), "a record that cannot be read was taken for gone")
        XCTAssertEqual(door(unreadable, try self.keys(1)).unpair(name: studio), .kept)
    }

    /// Clause (Phase 345): Unpair of a name no record holds touches nothing
    /// and is `.forgotten`, because that Mac is not kept; and a name is the
    /// whole public name, never its first label.
    func testANameNoRecordHoldsTouchesNothing() throws {
        let keys = try keys(0)
        let a = try record(studio, keys)
        let b = try record(laptop, keys, pairedAt: 2)
        let secrets = MemorySecrets()
        try secrets.write(a.data, account: PairingStore.account)
        try secrets.write(b.data, account: "pairing-v2-0123456789abcdef")
        let events = KeychainEvents()
        secrets.events = events
        keys.events = events
        let live = door(secrets, keys)
        XCTAssertEqual(live.unpair(name: "desk.tail00000.ts.net"), .forgotten)
        XCTAssertEqual(live.unpair(name: "studio"), .forgotten)
        XCTAssertEqual(events.all, [], "Unpair of a Mac nobody keeps touched something")
        XCTAssertEqual(secrets.held.count, 2)
        XCTAssertEqual(Set(keys.held), [a.tag, b.tag])
    }
}

/// A store holding records whose every removal fails, as a Keychain that
/// refuses would.
private final class RefusingSecrets: SecretStore, @unchecked Sendable {
    private let lock = NSLock()
    private var items: [String: Data]

    init(holding items: [String: Data]) {
        self.items = items
    }

    func holds(_ account: String) -> Bool { lock.withLock { items[account] != nil } }

    func read(_ account: String) throws -> Data? {
        lock.withLock { items[account] }
    }

    func write(_ data: Data, account: String) throws {
        lock.withLock { items[account] = data }
    }

    func remove(_ account: String) throws {
        throw KeysFailure.keychain(-25308)
    }

    func accounts() throws -> [String] {
        lock.withLock { items.keys.sorted() }
    }
}

/// A store whose removal answers and removes nothing; its read answers the
/// record under `pairing-v2`, or fails, list and read alike, when it is not
/// `readable`.
private final class StickySecrets: SecretStore, @unchecked Sendable {
    private let record: Data?
    private let readable: Bool

    init(record: Data?, readable: Bool) {
        self.record = record
        self.readable = readable
    }

    func read(_ account: String) throws -> Data? {
        guard readable else { throw KeysFailure.keychain(-25308) }
        return account == PairingStore.account ? record : nil
    }

    func write(_ data: Data, account: String) throws {}

    func remove(_ account: String) throws {}

    func accounts() throws -> [String] {
        guard readable else { throw KeysFailure.keychain(-25308) }
        return record == nil ? [] : [PairingStore.account]
    }
}
