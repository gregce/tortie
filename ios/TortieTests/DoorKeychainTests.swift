import CryptoKit
import Foundation
import Security
import XCTest
@testable import Tortie

#if os(iOS)
/// The Keychain half of `Keys.swift`, in the Simulator's own keychain and
/// under a service name and client key tags only these tests use, removed
/// before and after. It never runs on the Mac: the Mac's keychain is his, and
/// no test may touch it (the file is iOS only, and so is `KeychainClientKeys`).
///
/// Each test names the clause it holds and fails when that clause is taken
/// out of `ios/Tortie/Door/Keys.swift`.
final class DoorKeychainTests: XCTestCase {
    private let store = KeychainSecretStore(service: "com.itavero.tortie.phone.door.tests")
    private let account = "p316-test"
    private let clientKeys = KeychainClientKeys()

    override func setUpWithError() throws {
        try store.remove(account)
        try store.remove(PairingStore.account)
        try store.remove(PairingStore.formerAccount)
        for tag in clientKeys.tags() { clientKeys.delete(tag: tag) }
    }

    override func tearDownWithError() throws {
        try store.remove(account)
        try store.remove(PairingStore.account)
        try store.remove(PairingStore.formerAccount)
        for tag in clientKeys.tags() { clientKeys.delete(tag: tag) }
    }

    /// Clause: written, read back, replaced and removed.
    func testTheItemRoundTrips() throws {
        XCTAssertNil(try store.read(account))
        try store.write(Data("one".utf8), account: account)
        XCTAssertEqual(try store.read(account), Data("one".utf8))
        try store.write(Data("two".utf8), account: account)
        XCTAssertEqual(try store.read(account), Data("two".utf8))
        try store.remove(account)
        XCTAssertNil(try store.read(account))
        XCTAssertNoThrow(try store.remove(account), "removing nothing is not an error")
    }

    /// Clause: this device only, only while unlocked, never synchronised.
    func testTheItemIsThisDeviceOnly() throws {
        try store.write(Data("x".utf8), account: account)
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: store.service,
            kSecAttrAccount as String: account,
            kSecReturnAttributes as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        var found: CFTypeRef?
        XCTAssertEqual(SecItemCopyMatching(query as CFDictionary, &found), errSecSuccess)
        let attributes = try XCTUnwrap(found as? [String: Any])
        XCTAssertEqual(
            attributes[kSecAttrAccessible as String] as? String,
            kSecAttrAccessibleWhenUnlockedThisDeviceOnly as String
        )
        XCTAssertNotEqual(attributes[kSecAttrSynchronizable as String] as? Bool, true)
    }

    /// The attributes the Keychain holds for the key under `tag`.
    private func keyAttributes(_ tag: String) throws -> [String: Any] {
        let query: [String: Any] = [
            kSecClass as String: kSecClassKey,
            kSecAttrApplicationTag as String: Data(tag.utf8),
            kSecReturnAttributes as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        var found: CFTypeRef?
        XCTAssertEqual(SecItemCopyMatching(query as CFDictionary, &found), errSecSuccess)
        return try XCTUnwrap(found as? [String: Any])
    }

    /// The protection an access control carries, read from its description
    /// (`<SecAccessControlRef: cku;dacl(true)>` reads `cku`), which is how
    /// the reverify of 2026-09-29 read it: the Security framework has no
    /// public getter for it. Nil when the attribute is not an access control.
    private func protection(of access: Any?) -> String? {
        guard let access, CFGetTypeID(access as CFTypeRef) == SecAccessControlGetTypeID() else { return nil }
        let text = String(describing: access)
        guard let open = text.range(of: "SecAccessControlRef: ") else { return nil }
        let rest = text[open.upperBound...]
        let end = rest.firstIndex(where: { $0 == ";" || $0 == ">" }) ?? rest.endIndex
        return String(rest[..<end])
    }

    /// Clause (Phase 330, his ruling of 2026-09-29): the SHIPPING mint makes
    /// a P-256 key under a fresh tag, in the Secure Enclave, and deleting its
    /// tag deletes it. The Simulator HAS a Secure Enclave (iOS 18.3.1 and
    /// 26.3.1, `SecureEnclave.isAvailable` true, the reverify's measurement),
    /// so this is the enclave path: the key carries the enclave's token and an
    /// access control whose protection is ThisDeviceOnly. It reads back `cku`,
    /// After First Unlock This Device Only, though `aku` is asked for, and its
    /// kSecAttrAccessible reads `dk`, which this row no longer asks about: he
    /// accepted that protection. The software path is the next row's.
    func testAClientKeyIsMintedAndDeletedByItsTag() throws {
        guard SecureEnclave.isAvailable else {
            XCTFail("this runtime reports no Secure Enclave, so the shipping mint's enclave path cannot be tested on it")
            return
        }
        let one = try clientKeys.mint()
        let two = try clientKeys.mint()
        XCTAssertNotEqual(one.tag, two.tag)
        XCTAssertTrue(ClientKeys.isTag(one.tag))
        XCTAssertEqual(try XCTUnwrap(Base64URL.decode(one.spki)).count, 91, "a P-256 SPKI is 26 header bytes and a 65-byte point")
        XCTAssertEqual(Set(clientKeys.tags()), [one.tag, two.tag])
        let attributes = try keyAttributes(one.tag)
        XCTAssertEqual(attributes[kSecAttrTokenID as String] as? String, kSecAttrTokenIDSecureEnclave as String, "the key is not the Secure Enclave's")
        let access = attributes[kSecAttrAccessControl as String]
        let thisDeviceOnly: Set<String> = [
            kSecAttrAccessibleWhenUnlockedThisDeviceOnly as String,
            kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly as String
        ]
        let carried = protection(of: access)
        XCTAssertNotNil(carried, "the key carries no access control: \(String(describing: access))")
        XCTAssertTrue(thisDeviceOnly.contains(carried ?? ""), "the access control's protection is \(carried ?? "unread"), not ThisDeviceOnly")
        XCTAssertNotEqual(attributes[kSecAttrSynchronizable as String] as? Bool, true)
        clientKeys.delete(tag: one.tag)
        XCTAssertEqual(clientKeys.tags(), [two.tag])
        clientKeys.delete(tag: two.tag)
        XCTAssertEqual(clientKeys.tags(), [])
    }

    #if DEBUG
    /// Clause (Phase 330, his ruling of 2026-09-29): the SOFTWARE path, forced
    /// through the store's DEBUG seam because the Simulator has an enclave. A
    /// P-256 key under a fresh tag, with no token, kSecAttrAccessible
    /// `aku` (WhenUnlockedThisDeviceOnly), never synchronised, and deleting its
    /// tag deletes it.
    func testASoftwareClientKeyIsThisDeviceOnly() throws {
        var software = KeychainClientKeys()
        software.softwareKeyDebugSeam = true
        let key = try software.mint()
        XCTAssertTrue(ClientKeys.isTag(key.tag))
        XCTAssertEqual(try XCTUnwrap(Base64URL.decode(key.spki)).count, 91, "a P-256 SPKI is 26 header bytes and a 65-byte point")
        let attributes = try keyAttributes(key.tag)
        XCTAssertNil(attributes[kSecAttrTokenID as String] as? String, "the seam did not keep the key out of the Secure Enclave")
        XCTAssertEqual(attributes[kSecAttrAccessible as String] as? String, kSecAttrAccessibleWhenUnlockedThisDeviceOnly as String)
        XCTAssertNotEqual(attributes[kSecAttrSynchronizable as String] as? Bool, true)
        software.delete(tag: key.tag)
        XCTAssertEqual(clientKeys.tags(), [])
    }
    #else
    /// Clause: a Release build's store has no software seam, so it always
    /// asks for the enclave where there is one.
    func testAReleaseStoreHasNoSoftwareSeam() {
        XCTAssertTrue(Mirror(reflecting: KeychainClientKeys()).children.isEmpty)
    }
    #endif

    /// Clause (Phase 330): the Mac's certificate over the client key is kept
    /// under its tag and the Keychain hands back the identity the two make; a
    /// certificate over another key is refused and nothing is kept.
    func testTheCertificateMakesTheIdentity() throws {
        let v = try DoorVectorFile.load()
        let identity = try TestIdentity.vectors()
        var certificate: SecCertificate?
        XCTAssertEqual(SecIdentityCopyCertificate(identity.identity, &certificate), errSecSuccess)
        let der = try XCTUnwrap(Data(base64Encoded: v.client.certificateDer))
        XCTAssertEqual(try XCTUnwrap(certificate).der, der)
        XCTAssertNotNil(clientKeys.identity(tag: TestIdentity.tag, certificate: der))
        var key: SecKey?
        XCTAssertEqual(SecIdentityCopyPrivateKey(identity.identity, &key), errSecSuccess)
        XCTAssertNotNil(key)
        TestIdentity.removeFromKeychain()
        XCTAssertNil(clientKeys.identity(tag: TestIdentity.tag, certificate: der), "the identity outlived its key's deletion")

        let minted = try clientKeys.mint()
        XCTAssertThrowsError(try clientKeys.adopt(der, for: minted), "a certificate over another key was adopted")
        clientKeys.delete(tag: minted.tag)
    }

    /// Clause: the app's store keeps one pairing under its versioned account
    /// in the Keychain, reads it back with its identity, and forgets it with
    /// every client key.
    func testThePairingStoreKeepsOnePairing() throws {
        let v = try DoorVectorFile.load()
        let pairing = PairingStore(secrets: store, clientKeys: clientKeys)
        let certificate = try XCTUnwrap(Data(base64Encoded: v.client.certificateDer))
        let door = try XCTUnwrap(PairedDoor(
            endpoint: DoorEndpoint(name: "p330-mac.tail00000.ts.net", port: 8443, pin: Base64URL.encode(Data(count: 32))),
            macSigningKey: v.keys.macSigningKey, macExchangeKey: v.keys.macExchangeKey, label: "x", pairedAt: 1,
            keys: PhoneKeys.generate(), clientKey: ClientKey(tag: TestIdentity.tag, spki: v.keys.clientKey),
            certificate: certificate, identity: try TestIdentity.vectors()
        ))
        try pairing.save(door)
        XCTAssertNotNil(try store.read(PairingStore.account))
        XCTAssertEqual(pairing.load()?.phoneId, door.phoneId)
        try pairing.forget()
        XCTAssertNil(try store.read(PairingStore.account))
        XCTAssertEqual(clientKeys.tags(), [])
    }
}

private extension SecCertificate {
    var der: Data { SecCertificateCopyData(self) as Data }
}
#endif
