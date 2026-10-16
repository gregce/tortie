import Foundation
import Security
import XCTest
@testable import Tortie

#if os(iOS)
/// Unpair this iPhone on the Simulator's REAL keychain (Phase 316.6,
/// build/p3166/SPEC.md sections 5.4 and 7.2; one Mac of several since Phase
/// 345), through the SHIPPING `LiveDoor.unpair(name:)` over the shipping
/// `KeychainSecretStore` and `KeychainClientKeys`, in DoorKeychainTests'
/// shape: a service name and client key tags only these tests use, removed
/// before and after. It never runs on the Mac: the Mac's keychain is his, and
/// no test may touch it (the file is iOS only, and so is `KeychainClientKeys`).
///
/// This is the proof a byte scan of the device's keychain database cannot be
/// (SPEC section 3 row 4): it asks the Keychain itself, after Unpair, for the
/// record, every client key and the certificate.
///
/// Each test names the clause it holds and fails when that clause is taken
/// out of `LiveDoor.unpair(name:)` or `PairingStore.forget(name:)`.
final class UnpairKeychainTests: XCTestCase {
    private let secrets = KeychainSecretStore(service: "com.itavero.tortie.phone.door.unpair-tests")
    private let clientKeys = KeychainClientKeys()
    private let studio = "p330-mac.tail00000.ts.net"
    private let laptop = "p345-laptop.tail00000.ts.net"

    override func setUpWithError() throws {
        try clean()
    }

    override func tearDownWithError() throws {
        try clean()
    }

    private func clean() throws {
        try secrets.remove(PairingStore.account)
        try secrets.remove(PairingStore.formerAccount)
        for account in try secrets.accounts() { try secrets.remove(account) }
        for tag in clientKeys.tags() { clientKeys.delete(tag: tag) }
        TestIdentity.removeFromKeychain()
    }

    /// What the Keychain answers for the record under this test's service.
    private func recordStatus(_ account: String) -> OSStatus {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: secrets.service,
            kSecAttrAccount as String: account,
            kSecReturnAttributes as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        var found: CFTypeRef?
        return SecItemCopyMatching(query as CFDictionary, &found)
    }

    /// What the Keychain answers for the certificate kept under `tag`.
    private func certificateStatus(_ tag: String) -> OSStatus {
        let query: [String: Any] = [
            kSecClass as String: kSecClassCertificate,
            kSecAttrLabel as String: tag,
            kSecReturnAttributes as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        var found: CFTypeRef?
        return SecItemCopyMatching(query as CFDictionary, &found)
    }

    /// A pairing with `name` under the client key `key`, carrying the
    /// vectors' certificate (the Keychain answers its identity by the
    /// certificate's bytes).
    private func door(_ name: String, key: ClientKey, pairedAt: Double) throws -> PairedDoor {
        let v = try DoorVectorFile.load()
        let certificate = try XCTUnwrap(Data(base64Encoded: v.client.certificateDer))
        return try XCTUnwrap(PairedDoor(
            endpoint: DoorEndpoint(name: name, port: 8443, pin: Base64URL.encode(Data(count: 32))),
            macSigningKey: v.keys.macSigningKey, macExchangeKey: v.keys.macExchangeKey, label: "x", pairedAt: pairedAt,
            keys: PhoneKeys.generate(), clientKey: key, certificate: certificate,
            identity: try TestIdentity.vectors(), alerts: AlertsKept(macSends: true, presented: nil)
        ))
    }

    /// Clause (Phase 345): Unpair of ONE of two Macs takes that Mac's record
    /// and its client key, and leaves the other Mac's record, its client key,
    /// its certificate and its identity, which still read back.
    func testUnpairOfOneMacLeavesTheOthersRecordAndIdentity() throws {
        let v = try DoorVectorFile.load()
        let certificate = try XCTUnwrap(Data(base64Encoded: v.client.certificateDer))
        let store = PairingStore(secrets: secrets, clientKeys: clientKeys)
        let first = try door(studio, key: ClientKey(tag: TestIdentity.tag, spki: v.keys.clientKey), pairedAt: 1)
        let otherKey = try clientKeys.mint()
        let second = try door(laptop, key: otherKey, pairedAt: 2)
        try store.save(first)
        let account = try store.save(second)
        XCTAssertEqual(recordStatus(account), errSecSuccess)
        XCTAssertEqual(Set(clientKeys.tags()), [TestIdentity.tag, otherKey.tag])

        XCTAssertEqual(LiveDoor(store: store, transport: NameTransport()).unpair(name: laptop), .forgotten)

        XCTAssertEqual(recordStatus(account), errSecItemNotFound, "the unpaired Mac's record outlived Unpair")
        XCTAssertEqual(recordStatus(PairingStore.account), errSecSuccess, "the other Mac's record went with it")
        XCTAssertEqual(clientKeys.tags(), [TestIdentity.tag], "the unpaired Mac's key outlived it, or the other's went")
        XCTAssertEqual(certificateStatus(TestIdentity.tag), errSecSuccess, "the other Mac's certificate went")
        XCTAssertNotNil(clientKeys.identity(tag: TestIdentity.tag, certificate: certificate))
        XCTAssertFalse(store.holdsRecord(name: laptop))
        XCTAssertTrue(store.holdsRecord(name: studio))
        XCTAssertEqual(PairingStore(secrets: secrets, clientKeys: clientKeys).loadAll().map(\.phoneId), [first.phoneId])
    }

    /// Clause: the LAST Mac kept in the Keychain, its client key and the Mac's
    /// certificate over it, a client key an earlier attempt left and the
    /// former record; after the shipping Unpair the Keychain holds no record,
    /// no client key and no certificate, no identity can be made, the store
    /// reads back no pairing, and `holdsRecord` says so. A second Unpair, with
    /// nothing kept, is `.forgotten` too and never an error.
    func testUnpairOfTheLastMacLeavesNothingInTheKeychain() throws {
        let v = try DoorVectorFile.load()
        let store = PairingStore(secrets: secrets, clientKeys: clientKeys)
        let certificate = try XCTUnwrap(Data(base64Encoded: v.client.certificateDer))
        let first = try door(studio, key: ClientKey(tag: TestIdentity.tag, spki: v.keys.clientKey), pairedAt: 1)
        try store.save(first)
        try secrets.write(Data("tailnet".utf8), account: PairingStore.formerAccount)
        let leftover = try clientKeys.mint()

        // Everything is there before.
        XCTAssertEqual(recordStatus(PairingStore.account), errSecSuccess)
        XCTAssertEqual(recordStatus(PairingStore.formerAccount), errSecSuccess)
        XCTAssertEqual(certificateStatus(TestIdentity.tag), errSecSuccess)
        XCTAssertEqual(Set(clientKeys.tags()), [TestIdentity.tag, leftover.tag])
        XCTAssertNotNil(clientKeys.identity(tag: TestIdentity.tag, certificate: certificate))
        XCTAssertEqual(store.load()?.phoneId, first.phoneId)
        XCTAssertTrue(store.holdsRecord)

        XCTAssertEqual(LiveDoor(store: store, transport: NameTransport()).unpair(name: studio), .forgotten)

        // And nothing after.
        XCTAssertEqual(recordStatus(PairingStore.account), errSecItemNotFound, "the pairing record outlived Unpair")
        XCTAssertEqual(recordStatus(PairingStore.formerAccount), errSecItemNotFound, "the former record outlived Unpair")
        XCTAssertEqual(try secrets.accounts(), [], "a record outlived Unpair")
        XCTAssertEqual(clientKeys.tags(), [], "a client key outlived Unpair")
        XCTAssertEqual(certificateStatus(TestIdentity.tag), errSecItemNotFound, "the Mac's certificate outlived Unpair")
        XCTAssertNil(clientKeys.identity(tag: TestIdentity.tag, certificate: certificate))
        XCTAssertFalse(store.holdsRecord)
        XCTAssertNil(PairingStore(secrets: secrets, clientKeys: clientKeys).load())

        XCTAssertEqual(LiveDoor(store: store, transport: NameTransport()).unpair(name: studio), .forgotten)
    }

    /// The key that holds the client certificate's private half, alone.
    private func deleteKeyOnly(_ tag: String) {
        let key: [String: Any] = [
            kSecClass as String: kSecClassKey,
            kSecAttrApplicationTag as String: Data(tag.utf8),
            kSecUseDataProtectionKeychain as String: true
        ]
        SecItemDelete(key as CFDictionary)
    }

    /// Clause (the fix round of Phase 316.6): a client certificate whose key
    /// is already gone (what a build that deleted the key first left when it
    /// was ended between the two deletes) is still listed by `tags()`, and is
    /// forgotten: by the launch's sweep when no record names it (Phase 345),
    /// and by the shipping Unpair of the last Mac when one does.
    func testAnOrphanedCertificateIsFoundAndForgotten() throws {
        let v = try DoorVectorFile.load()
        let certificate = try XCTUnwrap(Data(base64Encoded: v.client.certificateDer))
        let store = PairingStore(secrets: secrets, clientKeys: clientKeys)

        _ = try TestIdentity.vectors()
        deleteKeyOnly(TestIdentity.tag)
        XCTAssertEqual(certificateStatus(TestIdentity.tag), errSecSuccess, "the certificate was planted")
        XCTAssertEqual(clientKeys.tags(), [TestIdentity.tag], "a certificate whose key is gone is still listed")
        store.sweepOrphans()
        XCTAssertEqual(certificateStatus(TestIdentity.tag), errSecItemNotFound, "the orphaned certificate outlived the sweep")
        XCTAssertEqual(clientKeys.tags(), [])

        let first = try door(studio, key: ClientKey(tag: TestIdentity.tag, spki: v.keys.clientKey), pairedAt: 1)
        deleteKeyOnly(TestIdentity.tag)
        try secrets.write(try PairingStore.encode(first), account: PairingStore.account)
        XCTAssertEqual(clientKeys.tags(), [TestIdentity.tag])
        XCTAssertEqual(LiveDoor(store: store, transport: NameTransport()).unpair(name: studio), .forgotten)
        XCTAssertEqual(certificateStatus(TestIdentity.tag), errSecItemNotFound, "the orphaned certificate outlived Unpair")
        XCTAssertEqual(clientKeys.tags(), [])
        XCTAssertNil(clientKeys.identity(tag: TestIdentity.tag, certificate: certificate))
    }
}
#endif
