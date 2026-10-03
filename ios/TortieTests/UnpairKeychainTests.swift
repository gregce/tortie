import Foundation
import Security
import XCTest
@testable import Tortie

#if os(iOS)
/// Unpair this iPhone on the Simulator's REAL keychain (Phase 316.6,
/// build/p3166/SPEC.md sections 5.4 and 7.2), through the SHIPPING
/// `LiveDoor.unpair()` over the shipping `KeychainSecretStore` and
/// `KeychainClientKeys`, in DoorKeychainTests' shape: a service name and client
/// key tags only these tests use, removed before and after. It never runs on
/// the Mac: the Mac's keychain is his, and no test may touch it (the file is
/// iOS only, and so is `KeychainClientKeys`).
///
/// This is the proof a byte scan of the device's keychain database cannot be
/// (SPEC section 3 row 4): it asks the Keychain itself, after Unpair, for the
/// record, every client key and the certificate, and finds none.
///
/// Each test names the clause it holds and fails when that clause is taken
/// out of `LiveDoor.unpair()` or `PairingStore.forget()`.
final class UnpairKeychainTests: XCTestCase {
    private let secrets = KeychainSecretStore(service: "com.itavero.tortie.phone.door.unpair-tests")
    private let clientKeys = KeychainClientKeys()

    override func setUpWithError() throws {
        try clean()
    }

    override func tearDownWithError() throws {
        try clean()
    }

    private func clean() throws {
        try secrets.remove(PairingStore.account)
        try secrets.remove(PairingStore.formerAccount)
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

    /// Clause: a pairing kept in the Keychain, its client key and the Mac's
    /// certificate over it, and a client key an earlier attempt left; after
    /// the shipping Unpair the Keychain holds no `pairing-v2` record, no
    /// client key and no certificate, no identity can be made, the store reads
    /// back no pairing, and `holdsRecord` says so. A second Unpair, with
    /// nothing kept, is `.forgotten` too and never an error.
    func testUnpairLeavesNothingInTheKeychain() throws {
        let v = try DoorVectorFile.load()
        let store = PairingStore(secrets: secrets, clientKeys: clientKeys)
        let certificate = try XCTUnwrap(Data(base64Encoded: v.client.certificateDer))
        let door = try XCTUnwrap(PairedDoor(
            endpoint: DoorEndpoint(name: "p330-mac.tail00000.ts.net", port: 8443, pin: Base64URL.encode(Data(count: 32))),
            macSigningKey: v.keys.macSigningKey, macExchangeKey: v.keys.macExchangeKey, label: "x", pairedAt: 1,
            keys: PhoneKeys.generate(), clientKey: ClientKey(tag: TestIdentity.tag, spki: v.keys.clientKey),
            certificate: certificate, identity: try TestIdentity.vectors(), alerts: AlertsKept(macSends: true, presented: nil)
        ))
        try store.save(door)
        try secrets.write(Data("tailnet".utf8), account: PairingStore.formerAccount)
        let leftover = try clientKeys.mint()

        // Everything is there before.
        XCTAssertEqual(recordStatus(PairingStore.account), errSecSuccess)
        XCTAssertEqual(recordStatus(PairingStore.formerAccount), errSecSuccess)
        XCTAssertEqual(certificateStatus(TestIdentity.tag), errSecSuccess)
        XCTAssertEqual(Set(clientKeys.tags()), [TestIdentity.tag, leftover.tag])
        XCTAssertNotNil(clientKeys.identity(tag: TestIdentity.tag, certificate: certificate))
        XCTAssertEqual(store.load()?.phoneId, door.phoneId)
        XCTAssertTrue(store.holdsRecord)

        XCTAssertEqual(LiveDoor(store: store, transport: NameTransport()).unpair(), .forgotten)

        // And nothing after.
        XCTAssertEqual(recordStatus(PairingStore.account), errSecItemNotFound, "the pairing record outlived Unpair")
        XCTAssertEqual(recordStatus(PairingStore.formerAccount), errSecItemNotFound, "the former record outlived Unpair")
        XCTAssertEqual(clientKeys.tags(), [], "a client key outlived Unpair")
        XCTAssertEqual(certificateStatus(TestIdentity.tag), errSecItemNotFound, "the Mac's certificate outlived Unpair")
        XCTAssertNil(clientKeys.identity(tag: TestIdentity.tag, certificate: certificate))
        XCTAssertFalse(store.holdsRecord)
        XCTAssertNil(PairingStore(secrets: secrets, clientKeys: clientKeys).load())

        XCTAssertEqual(LiveDoor(store: store, transport: NameTransport()).unpair(), .forgotten)
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

    /// Clause (the fix round): a client certificate whose key is already gone
    /// (what a build that deleted the key first left when it was ended between
    /// the two deletes) is still listed by `tags()`, and the shipping Unpair
    /// forgets it. Before the fix `tags()` read keys alone, so the verifier's
    /// planted certificate outlived every later Unpair.
    func testAnOrphanedCertificateIsFoundAndForgotten() throws {
        let v = try DoorVectorFile.load()
        let certificate = try XCTUnwrap(Data(base64Encoded: v.client.certificateDer))
        _ = try TestIdentity.vectors()
        deleteKeyOnly(TestIdentity.tag)
        XCTAssertEqual(certificateStatus(TestIdentity.tag), errSecSuccess, "the certificate was planted")
        XCTAssertEqual(clientKeys.tags(), [TestIdentity.tag], "a certificate whose key is gone is still listed")

        let store = PairingStore(secrets: secrets, clientKeys: clientKeys)
        try secrets.write(Data("record".utf8), account: PairingStore.account)
        XCTAssertEqual(LiveDoor(store: store, transport: NameTransport()).unpair(), .forgotten)
        XCTAssertEqual(certificateStatus(TestIdentity.tag), errSecItemNotFound, "the orphaned certificate outlived Unpair")
        XCTAssertEqual(clientKeys.tags(), [])
        XCTAssertNil(clientKeys.identity(tag: TestIdentity.tag, certificate: certificate))
    }
}
#endif
