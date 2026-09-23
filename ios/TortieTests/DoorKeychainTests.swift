import Foundation
import Security
import XCTest
@testable import Tortie

#if os(iOS)
/// The Keychain half of `Keys.swift`, in the Simulator's own keychain and
/// under a service name only this test uses, removed before and after.
/// It never runs on the Mac: the Mac's keychain is his, and no test may touch
/// it (the file is iOS only).
///
/// Each test names the clause it holds and fails when that clause is taken
/// out of `ios/Tortie/Door/Keys.swift`.
final class DoorKeychainTests: XCTestCase {
    private let store = KeychainSecretStore(service: "com.itavero.tortie.phone.door.tests")
    private let account = "p316-test"

    override func setUpWithError() throws {
        try store.remove(account)
        try store.remove(PairingStore.account)
    }

    override func tearDownWithError() throws {
        try store.remove(account)
        try store.remove(PairingStore.account)
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

    /// Clause: the app's store keeps one pairing under its versioned account
    /// in the Keychain, and forgets it.
    func testThePairingStoreKeepsOnePairing() throws {
        let pairing = PairingStore(secrets: store)
        let keys = PhoneKeys.generate()
        let macExchange = SPKI.x25519(PhoneKeys.generate().exchange.publicKey)
        let macSigning = SPKI.ed25519(PhoneKeys.generate().signing.publicKey)
        let door = try XCTUnwrap(PairedDoor(
            address: DoorAddress(host: "100.64.0.1", port: 8823, pin: Base64URL.encode(Data(count: 32))),
            macSigningKey: macSigning, macExchangeKey: macExchange, label: "x", pairedAt: 1, keys: keys
        ))
        try pairing.save(door)
        XCTAssertNotNil(try store.read(PairingStore.account))
        XCTAssertEqual(pairing.load()?.phoneId, door.phoneId)
        try pairing.forget()
        XCTAssertNil(try store.read(PairingStore.account))
    }
}
#endif
