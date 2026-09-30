import Foundation
import Security
import XCTest
@testable import Tortie

/// Client keys in memory, so no flow test makes a key in a keychain. Every
/// key it mints is the vectors' test client key under a fresh tag, and every
/// identity it adopts is `TestIdentity.vectors()`, which a pairing flow never
/// signs with (the door is a stand-in). It counts what it minted and deleted,
/// so a test can hold that every attempt that ends unpaired deletes its key.
final class MemoryClientKeys: ClientKeyStore, @unchecked Sendable {
    private let lock = NSLock()
    private let spki: String
    private var live: [String] = []
    private var adopted: [String: Data] = [:]
    private(set) var minted = 0
    var refuseMint = false

    init(spki: String) {
        self.spki = spki
    }

    /// The tags of keys minted and not yet deleted.
    var held: [String] { lock.withLock { live } }

    func mint() throws -> ClientKey {
        try lock.withLock {
            if refuseMint { throw KeysFailure.clientKey }
            minted += 1
            let key = ClientKey(tag: ClientKeys.newTag(), spki: spki)
            live.append(key.tag)
            return key
        }
    }

    func adopt(_ certificate: Data, for key: ClientKey) throws -> ClientIdentity {
        guard ClientKeys.certificate(certificate, carrying: key.spki) != nil else { throw KeysFailure.clientKey }
        lock.withLock { adopted[key.tag] = certificate }
        return try TestIdentity.vectors()
    }

    func identity(tag: String, certificate: Data) -> ClientIdentity? {
        let kept = lock.withLock { live.contains(tag) && adopted[tag] == certificate }
        return kept ? try? TestIdentity.vectors() : nil
    }

    func delete(tag: String) {
        lock.withLock {
            live.removeAll { $0 == tag }
            adopted[tag] = nil
        }
    }

    func tags() -> [String] { held }
}

/// A `SecIdentity` for the vectors' client key and the certificate the shipping
/// `tls.ts` issued over it (build/p316/vectors.mjs, `keys.clientKeyX963` and
/// `client.certificateDer`).
///
/// On iOS it is made the way the app makes one: the key goes into the
/// Simulator's own keychain under a test tag and the certificate is adopted by
/// the SHIPPING `KeychainClientKeys`, which asks the Keychain for the identity.
/// On a Mac it is imported, IN MEMORY ONLY, from the PKCS#12 the macOS harness
/// made in scratch (`P330_HARNESS_P12`), so nothing touches a Mac's keychain;
/// with no harness the tests that need one skip.
enum TestIdentity {
    /// The Simulator keychain's test tag: the client key prefix and 16 hex digits.
    static let tag = "tortie.client.0330330330330330"

    static func vectors() throws -> ClientIdentity {
        #if os(iOS)
        let v = try DoorVectorFile.load()
        let keys = KeychainClientKeys()
        keys.delete(tag: tag)
        let x963 = try XCTUnwrap(Hex.decode(v.keys.clientKeyX963))
        var error: Unmanaged<CFError>?
        let key = try XCTUnwrap(SecKeyCreateWithData(x963 as CFData, [
            kSecAttrKeyType as String: kSecAttrKeyTypeECSECPrimeRandom,
            kSecAttrKeyClass as String: kSecAttrKeyClassPrivate,
            kSecAttrKeySizeInBits as String: 256
        ] as CFDictionary, &error))
        let add: [String: Any] = [
            kSecClass as String: kSecClassKey,
            kSecValueRef as String: key,
            kSecAttrApplicationTag as String: Data(tag.utf8),
            kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
            kSecUseDataProtectionKeychain as String: true
        ]
        let status = SecItemAdd(add as CFDictionary, nil)
        XCTAssertTrue(status == errSecSuccess || status == errSecDuplicateItem, "SecItemAdd answered \(status)")
        let certificate = try XCTUnwrap(Data(base64Encoded: v.client.certificateDer))
        return try keys.adopt(certificate, for: ClientKey(tag: tag, spki: v.keys.clientKey))
        #else
        return try harness()
        #endif
    }

    /// The harness's PKCS#12, imported in memory only.
    static func harness() throws -> ClientIdentity {
        let env = ProcessInfo.processInfo.environment
        guard let path = env["P330_HARNESS_P12"], let pass = env["P330_HARNESS_P12_PASS"] else {
            throw XCTSkip("no P330_HARNESS_P12: the in-memory identity is the macOS harness's, and no Mac keychain is written")
        }
        let data = try Data(contentsOf: URL(fileURLWithPath: path))
        var options: [String: Any] = [kSecImportExportPassphrase as String: pass]
        #if os(macOS)
        options[kSecImportToMemoryOnly as String] = true
        #endif
        var items: CFArray?
        let status = SecPKCS12Import(data as CFData, options as CFDictionary, &items)
        XCTAssertEqual(status, errSecSuccess)
        let first = try XCTUnwrap((items as? [[String: Any]])?.first)
        let identity = try XCTUnwrap(first[kSecImportItemIdentity as String])
        return ClientIdentity(identity: identity as! SecIdentity)
    }

    #if os(iOS)
    /// Remove the Simulator keychain's test items.
    static func removeFromKeychain() {
        KeychainClientKeys().delete(tag: tag)
    }
    #endif
}
