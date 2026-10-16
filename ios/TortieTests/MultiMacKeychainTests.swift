import Foundation
import Security
import XCTest
@testable import Tortie

#if os(iOS)
/// Several Macs kept in the Simulator's REAL keychain (Phase 345,
/// build/p345/SPEC.md sections 3.1 and 5.2), through the SHIPPING
/// `PairingStore` over the shipping `KeychainSecretStore` and
/// `KeychainClientKeys`, under a TEST service (never the app's
/// `com.itavero.tortie.phone.door`), removed before and after. It never runs on
/// the Mac: the Mac's keychain is his, and no test may touch it (the file is
/// iOS only, and so is `KeychainClientKeys`).
///
/// THIS IS THE MATRIX'S "ONE CORRUPT RECORD" ROW (section 5.3): the probe has no
/// way into the keychain and adds no seam for one, so it is proved here, on
/// both runtimes `test:ios` runs. Three Macs are kept, one Mac's record is
/// overwritten with bytes that do not decode, and the store reads the other
/// two in order, removes that one record, and leaves every client key, both
/// other Macs' identities answering; only the launch's sweep then deletes the
/// corrupt record's key, and nothing else.
///
/// Each test names the clause it holds and fails when that clause is taken
/// out of `ios/Tortie/Door/Keys.swift`.
final class MultiMacKeychainTests: XCTestCase {
    private let secrets = KeychainSecretStore(service: "com.itavero.tortie.phone.door.p345-tests")
    private let clientKeys = KeychainClientKeys()

    override func setUpWithError() throws {
        try clean()
    }

    override func tearDownWithError() throws {
        try clean()
    }

    private func clean() throws {
        for account in try secrets.accounts() { try secrets.remove(account) }
        try secrets.remove(PairingStore.account)
        for tag in clientKeys.tags() { clientKeys.delete(tag: tag) }
        TestIdentity.removeFromKeychain()
        XCTAssertEqual(try secrets.accounts(), [], "the test service was not emptied")
    }

    /// A pairing with the Mac `label`, under `key`, carrying the vectors'
    /// certificate, whose identity the Keychain answers by the certificate's
    /// bytes.
    private func door(_ label: String, key: ClientKey, pairedAt: Double) throws -> PairedDoor {
        let v = try DoorVectorFile.load()
        let certificate = try XCTUnwrap(Data(base64Encoded: v.client.certificateDer))
        return try XCTUnwrap(PairedDoor(
            endpoint: DoorEndpoint(name: "\(label).tail00000.ts.net", port: 8443, pin: Base64URL.encode(Data(count: 32))),
            macSigningKey: v.keys.macSigningKey, macExchangeKey: v.keys.macExchangeKey, label: "x", pairedAt: pairedAt,
            keys: PhoneKeys.generate(), clientKey: key, certificate: certificate,
            identity: try TestIdentity.vectors(), alerts: .nothing
        ))
    }

    /// Clause: the list names exactly the accounts the store wrote, the first
    /// Mac's `pairing-v2` and two of the phone's own, and a foreign account
    /// under the same service, which the store never reads or removes.
    func testTheListNamesExactlyWhatWasWritten() throws {
        let v = try DoorVectorFile.load()
        let store = PairingStore(secrets: secrets, clientKeys: clientKeys)
        let a = try door("studio", key: ClientKey(tag: TestIdentity.tag, spki: v.keys.clientKey), pairedAt: 1)
        let b = try door("laptop", key: try clientKeys.mint(), pairedAt: 2)
        let c = try door("desk", key: try clientKeys.mint(), pairedAt: 3)
        try secrets.write(Data("not the store's".utf8), account: "p345-foreign")
        let written = [try store.save(a), try store.save(b), try store.save(c)]
        XCTAssertEqual(written[0], PairingStore.account)
        XCTAssertTrue(written.dropFirst().allSatisfy { $0.hasPrefix(PairingStore.accountPrefix) && PairingStore.isPairingAccount($0) }, "\(written)")
        XCTAssertEqual(Set(try secrets.accounts()), Set(written + ["p345-foreign"]))
        XCTAssertEqual(try secrets.accounts().count, 4)

        try store.forget()
        XCTAssertEqual(try secrets.accounts(), ["p345-foreign"], "forgetting every Mac removed an account that is not the store's, or missed one")
        XCTAssertEqual(clientKeys.tags(), [])
    }

    /// Clause (THE CORRUPT RECORD ROW): three Macs kept; one Mac's record
    /// overwritten with bytes that do not decode; `loadAll` answers the other
    /// two, in order; the corrupt account is gone and no other; every client
    /// key is still there and both other Macs' identities answer. Then the
    /// sweep deletes the corrupt record's key alone.
    func testACorruptRecordRemovesOnlyItselfInTheKeychain() throws {
        let v = try DoorVectorFile.load()
        let certificate = try XCTUnwrap(Data(base64Encoded: v.client.certificateDer))
        let store = PairingStore(secrets: secrets, clientKeys: clientKeys)
        let aKey = ClientKey(tag: TestIdentity.tag, spki: v.keys.clientKey)
        let bKey = try clientKeys.mint()
        let cKey = try clientKeys.mint()
        let a = try door("studio", key: aKey, pairedAt: 1)
        let b = try door("laptop", key: bKey, pairedAt: 2)
        let c = try door("desk", key: cKey, pairedAt: 3)
        XCTAssertEqual(try store.save(a), PairingStore.account)
        let bAccount = try store.save(b)
        let cAccount = try store.save(c)
        XCTAssertEqual(store.loadAll().map(\.phoneId), [a.phoneId, b.phoneId, c.phoneId])

        try secrets.write(Data("not a record".utf8), account: bAccount)

        XCTAssertEqual(store.loadAll().map(\.phoneId), [a.phoneId, c.phoneId], "the other two did not read back, in order")
        XCTAssertNil(try secrets.read(bAccount), "the corrupt record outlived the read")
        XCTAssertEqual(Set(try secrets.accounts()), [PairingStore.account, cAccount], "more than the corrupt record went")
        XCTAssertEqual(Set(clientKeys.tags()), [aKey.tag, bKey.tag, cKey.tag], "a corrupt record took a client key")
        XCTAssertNotNil(clientKeys.identity(tag: aKey.tag, certificate: certificate))
        XCTAssertNotNil(clientKeys.identity(tag: cKey.tag, certificate: certificate))

        store.sweepOrphans()
        XCTAssertEqual(Set(clientKeys.tags()), [aKey.tag, cKey.tag], "the sweep missed the corrupt record's key, or took another")
        XCTAssertEqual(store.loadAll().map(\.phoneId), [a.phoneId, c.phoneId])
    }

    /// Clause: a re-pair of a kept Mac replaces its record in its own account
    /// in the Keychain and deletes the old client key, and nothing of the
    /// first Mac's.
    func testARePairReplacesInPlaceInTheKeychain() throws {
        let v = try DoorVectorFile.load()
        let store = PairingStore(secrets: secrets, clientKeys: clientKeys)
        let aKey = ClientKey(tag: TestIdentity.tag, spki: v.keys.clientKey)
        let oldKey = try clientKeys.mint()
        let newKey = try clientKeys.mint()
        try store.save(try door("studio", key: aKey, pairedAt: 1))
        let account = try store.save(try door("laptop", key: oldKey, pairedAt: 2))
        let again = try door("laptop", key: newKey, pairedAt: 3)
        XCTAssertEqual(try store.save(again), account)
        XCTAssertEqual(Set(try secrets.accounts()), [PairingStore.account, account])
        XCTAssertEqual(Set(clientKeys.tags()), [aKey.tag, newKey.tag])
        XCTAssertEqual(store.loadAll().last?.phoneId, again.phoneId)
    }
}
#endif
