import Foundation
import XCTest
@testable import Tortie

/// A fresh install forgets the pairing an earlier install left in the
/// Keychain, because the Keychain outlives the app and the tailnet node's
/// state does not (Phase 316.3, build/p316/SPEC.md section 4 S3 B).
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

    /// Clause: with no mark, the pairing is forgotten, and only then is the
    /// mark put down, excluded from backup.
    func testAFreshInstallForgetsThePairingFirst() throws {
        let secrets = MemorySecrets()
        try secrets.write(Data("an earlier install's pairing".utf8), account: PairingStore.account)
        let store = PairingStore(secrets: secrets)

        XCTAssertTrue(store.forgetOnFreshInstall(mark))
        XCTAssertNil(secrets.item(PairingStore.account))
        XCTAssertTrue(mark.isPresent)
        XCTAssertEqual(mark.isExcludedFromBackup, true)
    }

    /// Clause: an install that has launched before keeps its pairing.
    func testALaunchedInstallKeepsItsPairing() throws {
        try mark.put()
        let secrets = MemorySecrets()
        try secrets.write(Data("this install's pairing".utf8), account: PairingStore.account)
        let store = PairingStore(secrets: secrets)

        XCTAssertFalse(store.forgetOnFreshInstall(mark))
        XCTAssertEqual(secrets.item(PairingStore.account), Data("this install's pairing".utf8))
    }

    /// Clause: a forget that fails leaves no mark, so the next launch tries
    /// again rather than keeping keys whose node is gone.
    func testAForgetThatFailsIsTriedAgain() throws {
        let stuck = StuckSecrets()
        XCTAssertTrue(PairingStore(secrets: stuck).forgetOnFreshInstall(mark))
        XCTAssertFalse(mark.isPresent)
        XCTAssertEqual(stuck.removals, 1)

        let secrets = MemorySecrets()
        try secrets.write(Data("still here".utf8), account: PairingStore.account)
        XCTAssertTrue(PairingStore(secrets: secrets).forgetOnFreshInstall(mark))
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
}
