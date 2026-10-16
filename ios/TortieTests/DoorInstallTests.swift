import Foundation
import XCTest
@testable import Tortie

/// A fresh install forgets every pairing an earlier install left in the
/// Keychain, and every client key with it, because the Keychain outlives the
/// app and a pairing a person deleted with the app must not come back with it
/// (Phase 316.3; the client keys since Phase 330; every Mac's record since
/// Phase 345).
///
/// Each test names the clause it holds and fails when that clause is taken
/// out of `ios/Tortie/Door/Keys.swift`. The secrets are in memory and the mark
/// is in a scratch directory, so nothing here touches a keychain or the app's
/// own container, except the last test, which reads the running app's mark.
final class DoorInstallTests: XCTestCase {
    private var scratch: URL!

    override func setUpWithError() throws {
        scratch = FileManager.default.temporaryDirectory
            .appendingPathComponent("p316-install-" + UUID().uuidString, isDirectory: true)
        try FileManager.default.createDirectory(at: scratch, withIntermediateDirectories: true)
    }

    override func tearDownWithError() throws {
        if let scratch { try? FileManager.default.removeItem(at: scratch) }
    }

    private var mark: InstallMark {
        InstallMark(url: scratch.appendingPathComponent(InstallMark.name, isDirectory: false))
    }

    /// Clause: with no mark, every Mac's pairing is forgotten, the first
    /// Mac's and the others' alike, then every client key, and only then is
    /// the mark put down, excluded from backup. An account that is not the
    /// store's is left alone.
    func testAFreshInstallForgetsThePairingFirst() throws {
        let secrets = MemorySecrets()
        let others = ["pairing-v2-0123456789abcdef", "pairing-v2-fedcba9876543210"]
        try secrets.write(Data("an earlier install's pairing".utf8), account: PairingStore.account)
        for account in others {
            try secrets.write(Data("an earlier install's other Mac".utf8), account: account)
        }
        try secrets.write(Data("not the store's".utf8), account: "p345-foreign")
        let keys = MemoryClientKeys(spki: "k")
        _ = try keys.mint()
        _ = try keys.mint()
        let store = PairingStore(secrets: secrets, clientKeys: keys)

        XCTAssertTrue(store.forgetOnFreshInstall(mark))
        XCTAssertNil(secrets.item(PairingStore.account))
        for account in others {
            XCTAssertNil(secrets.item(account), "an earlier install's other Mac outlived it")
        }
        XCTAssertEqual(secrets.held, ["p345-foreign"])
        XCTAssertEqual(keys.held, [], "an earlier install's client keys outlived it")
        XCTAssertTrue(mark.isPresent)
        XCTAssertEqual(mark.isExcludedFromBackup, true)
    }

    /// Clause (Phase 345): a list of the accounts that cannot be made leaves
    /// every record, every key and no mark, so the next launch tries again
    /// rather than keeping a pairing its person deleted.
    func testAFreshInstallWhoseListFailsIsTriedAgain() throws {
        let secrets = MemorySecrets()
        try secrets.write(Data("an earlier install's other Mac".utf8), account: "pairing-v2-0123456789abcdef")
        secrets.refuseList = true
        let keys = MemoryClientKeys(spki: "k")
        _ = try keys.mint()
        XCTAssertTrue(PairingStore(secrets: secrets, clientKeys: keys).forgetOnFreshInstall(mark))
        XCTAssertFalse(mark.isPresent)
        XCTAssertNotNil(secrets.item("pairing-v2-0123456789abcdef"))
        XCTAssertEqual(keys.held.count, 1, "a key went though the records could not be listed")
    }

    /// Clause: an install that has launched before keeps its pairing.
    func testALaunchedInstallKeepsItsPairing() throws {
        try mark.put()
        let secrets = MemorySecrets()
        try secrets.write(Data("this install's pairing".utf8), account: PairingStore.account)
        let store = PairingStore(secrets: secrets, clientKeys: MemoryClientKeys(spki: "k"))

        XCTAssertFalse(store.forgetOnFreshInstall(mark))
        XCTAssertEqual(secrets.item(PairingStore.account), Data("this install's pairing".utf8))
    }

    /// Clause: a forget that fails leaves no mark, so the next launch tries
    /// again rather than keeping a pairing its person deleted.
    func testAForgetThatFailsIsTriedAgain() throws {
        let stuck = StuckSecrets()
        XCTAssertTrue(PairingStore(secrets: stuck, clientKeys: MemoryClientKeys(spki: "k")).forgetOnFreshInstall(mark))
        XCTAssertFalse(mark.isPresent)
        XCTAssertEqual(stuck.removals, 1)

        let secrets = MemorySecrets()
        try secrets.write(Data("still here".utf8), account: PairingStore.account)
        XCTAssertTrue(PairingStore(secrets: secrets, clientKeys: MemoryClientKeys(spki: "k")).forgetOnFreshInstall(mark))
        XCTAssertNil(secrets.item(PairingStore.account))
        XCTAssertTrue(mark.isPresent)
    }

    #if os(iOS)
    /// Clause: the running app put its mark in its own Application Support,
    /// excluded from backup, when it launched (the test host is the app).
    func testTheRunningAppLeftItsMarkExcludedFromBackup() throws {
        let app = try InstallMark.standard()
        XCTAssertTrue(app.url.path(percentEncoded: false).hasSuffix("/Library/Application Support/installed"), app.url.path)
        XCTAssertTrue(app.isPresent)
        XCTAssertEqual(app.isExcludedFromBackup, true)
    }
    #endif
}

/// Secrets whose remove always fails, as a locked or broken Keychain would.
private final class StuckSecrets: SecretStore, @unchecked Sendable {
    private let lock = NSLock()
    private var count = 0

    var removals: Int { lock.withLock { count } }

    func read(_ account: String) throws -> Data? { nil }
    func write(_ data: Data, account: String) throws {}

    func remove(_ account: String) throws {
        lock.withLock { count += 1 }
        throw KeysFailure.keychain(-25308)
    }

    /// It holds the first Mac's record, which it will not remove.
    func accounts() throws -> [String] { [PairingStore.account] }
}
