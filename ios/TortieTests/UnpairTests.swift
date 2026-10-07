import Foundation
import XCTest
@testable import Tortie

/// Unpair this iPhone (Phase 316.6, build/p3166/SPEC.md section 5.4), with
/// stand-ins: the app goes back to Pairing with its not-paired line, both
/// tabs' places and every word about the old pairing dropped, and tells iOS to
/// forget this install's alert address once; a record that stays says nothing
/// changed and forgets nothing; and through the SHIPPING `LiveDoor.unpair()`
/// over stores in memory, the record goes FIRST, so a record whose removal
/// fails leaves every client key where it was. The real Keychain's half is
/// UnpairKeychainTests. Each test names the clause it holds, and each fails
/// when that clause is taken out of App/TortieApp.swift or Door/Keys.swift.
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
        await app.readAlertPermission()
        XCTAssertEqual(app.alertPermission, .authorized)
        app.tab = .settings
        app.waitingPath = [.session(id: "w", name: "w")]
        app.sessionsPath = [.session(id: "o", name: "o"), .catchUp(id: "o", honestLine: nil)]

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
        app.tab = .settings
        app.sessionsPath = [.session(id: "o", name: "o")]

        app.unpair()

        XCTAssertEqual(phone.unpairs, 1)
        XCTAssertEqual(app.root, .reading)
        XCTAssertEqual(app.settingsLine, Copy.unpairFailed)
        XCTAssertNil(app.forgetting, "a kept pairing told iOS to forget its address")
        XCTAssertEqual(alerts.addressForgets, 0)
        XCTAssertEqual(app.tab, .settings)
        XCTAssertEqual(app.sessionsPath, [.session(id: "o", name: "o")])
        XCTAssertNotNil(app.list)
        XCTAssertNotNil(app.reader)
    }

    // MARK: The door, over stores in memory

    private func keys(_ count: Int) throws -> MemoryClientKeys {
        let keys = MemoryClientKeys(spki: try DoorVectorFile.load().keys.clientKey)
        for _ in 0..<count { _ = try keys.mint() }
        return keys
    }

    private func door(_ secrets: SecretStore, _ keys: MemoryClientKeys) -> LiveDoor {
        LiveDoor(store: PairingStore(secrets: secrets, clientKeys: keys), transport: NameTransport())
    }

    /// Clause (THE ORDER): a record whose removal throws is `.kept`, and
    /// because the record goes first, every client key is still there, so
    /// "Nothing was changed." is true.
    func testARecordThatWillNotGoTouchesNoKey() throws {
        let keys = try keys(2)
        let held = keys.held
        let secrets = RefusingSecrets(holding: [PairingStore.account, PairingStore.formerAccount])
        XCTAssertEqual(door(secrets, keys).unpair(), .kept)
        XCTAssertEqual(keys.held, held, "a client key was deleted while the record stayed")
        XCTAssertTrue(secrets.holds(PairingStore.account))
    }

    /// Clause: a record that goes takes every client key and the former
    /// record with it, `.forgotten`; and Unpair with nothing kept is
    /// `.forgotten` too, never an error.
    func testARecordThatGoesTakesEveryKey() throws {
        let keys = try keys(2)
        let secrets = MemorySecrets()
        try secrets.write(Data("record".utf8), account: PairingStore.account)
        try secrets.write(Data("former".utf8), account: PairingStore.formerAccount)
        let store = PairingStore(secrets: secrets, clientKeys: keys)
        XCTAssertTrue(store.holdsRecord)
        XCTAssertEqual(LiveDoor(store: store, transport: NameTransport()).unpair(), .forgotten)
        XCTAssertTrue(secrets.isEmpty)
        XCTAssertEqual(keys.held, [])
        XCTAssertFalse(store.holdsRecord)
        XCTAssertEqual(LiveDoor(store: store, transport: NameTransport()).unpair(), .forgotten)
    }

    /// Clause: a record that cannot be PROVED gone is `.kept`: one whose
    /// removal answers yet still reads back, and one that cannot be read.
    func testARecordThatCannotBeProvedGoneIsKept() throws {
        let sticky = StickySecrets(readable: true)
        XCTAssertEqual(door(sticky, try keys(1)).unpair(), .kept)
        let unreadable = StickySecrets(readable: false)
        let store = PairingStore(secrets: unreadable, clientKeys: try keys(0))
        XCTAssertTrue(store.holdsRecord, "a record that cannot be read was taken for gone")
        XCTAssertEqual(door(unreadable, try keys(1)).unpair(), .kept)
    }
}

/// A store holding `accounts` whose every removal fails, as a Keychain that
/// refuses would.
private final class RefusingSecrets: SecretStore, @unchecked Sendable {
    private let lock = NSLock()
    private var accounts: Set<String>

    init(holding accounts: Set<String>) {
        self.accounts = accounts
    }

    func holds(_ account: String) -> Bool { lock.withLock { accounts.contains(account) } }

    func read(_ account: String) throws -> Data? {
        lock.withLock { accounts.contains(account) ? Data("record".utf8) : nil }
    }

    func write(_ data: Data, account: String) throws {
        _ = lock.withLock { accounts.insert(account) }
    }

    func remove(_ account: String) throws {
        throw KeysFailure.keychain(-25308)
    }
}

/// A store whose removal answers and removes nothing; its read answers the
/// record, or fails when it is not `readable`.
private final class StickySecrets: SecretStore, @unchecked Sendable {
    private let readable: Bool

    init(readable: Bool) {
        self.readable = readable
    }

    func read(_ account: String) throws -> Data? {
        guard readable else { throw KeysFailure.keychain(-25308) }
        return Data("record".utf8)
    }

    func write(_ data: Data, account: String) throws {}

    func remove(_ account: String) throws {}
}
