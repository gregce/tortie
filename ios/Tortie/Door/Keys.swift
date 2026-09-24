// Keys.swift — the phone's keys and the one pairing it keeps (Phase 316.2).
//
// WHAT IS KEPT. One pairing, as one Keychain item: the door's address, port
// and pinned key, the Mac's two public keys, the label the phone presented,
// and the phone's own two private keys (Ed25519 to sign every read, X25519 to
// derive the binding). One item, so a pairing is written or removed whole and
// can never be half of two pairings.
//
// WHERE. The Keychain only, as a generic password with
// `kSecAttrAccessibleWhenUnlockedThisDeviceOnly`: it never syncs, never goes
// into a backup that can be restored to another phone, and cannot be read
// while the phone is locked. CryptoKit's Curve25519 keys are not SecKeys, and
// a generic password holding their raw bytes is Apple's own recipe for them
// ("Storing CryptoKit Keys in the Keychain").
//
// WHEN. Only after the pairing is DONE, which is the first signed read
// succeeding (build/p316/SPEC.md section 4 S2 and 316.1's open nit P2b: the
// door answers "allowed" to any presenter from the allowed phone's address, so
// "allowed" alone is not success). Until then the keys live only in memory.
//
// A record that does not read back whole is removed and the phone is not
// paired, never partly paired. Nothing here logs, and no key or record ever
// leaves this file except as the Keychain item and the in-memory pairing.

import CryptoKit
import Foundation
import Security

// MARK: - The phone's keys

/// The phone's two long-lived key pairs for one pairing.
struct PhoneKeys: Sendable {
    let signing: Curve25519.Signing.PrivateKey
    let exchange: Curve25519.KeyAgreement.PrivateKey

    /// Two fresh pairs, from the system's secure random source.
    static func generate() -> PhoneKeys {
        PhoneKeys(
            signing: Curve25519.Signing.PrivateKey(),
            exchange: Curve25519.KeyAgreement.PrivateKey()
        )
    }

    /// The pairs from their raw 32-byte private halves.
    init(signingSeed: Data, exchangeSeed: Data) throws {
        signing = try Curve25519.Signing.PrivateKey(rawRepresentation: signingSeed)
        exchange = try Curve25519.KeyAgreement.PrivateKey(rawRepresentation: exchangeSeed)
    }

    init(signing: Curve25519.Signing.PrivateKey, exchange: Curve25519.KeyAgreement.PrivateKey) {
        self.signing = signing
        self.exchange = exchange
    }

    /// `ek`: the Ed25519 SPKI, base64url, which the door stores and hashes.
    var signingKey: String { SPKI.ed25519(signing.publicKey) }
    /// `xk`: the X25519 SPKI, base64url.
    var exchangeKey: String { SPKI.x25519(exchange.publicKey) }
}

// MARK: - A pairing that is done

/// A door this phone reads. It exists only once a signed read succeeded.
struct PairedDoor: Sendable {
    let address: DoorAddress
    /// `dk`, the Mac's Ed25519 SPKI. Kept for the phase that checks an answer
    /// the door signs; the door signs none in 316.
    let macSigningKey: String
    /// `dx`, the Mac's X25519 SPKI, which the binding is derived from.
    let macExchangeKey: String
    /// What the phone called itself when it presented.
    let label: String
    /// Epoch ms of the first signed read that succeeded.
    let pairedAt: Double
    let keys: PhoneKeys

    /// `x-tortie-phone`.
    let phoneId: String
    /// The binding every signature covers. Derived, never stored.
    let binding: String
    /// The six groups both screens showed.
    let fingerprint: String

    /// Nil when the Mac's exchange key is not an X25519 key.
    init?(
        address: DoorAddress,
        macSigningKey: String,
        macExchangeKey: String,
        label: String,
        pairedAt: Double,
        keys: PhoneKeys
    ) {
        guard let binding = DoorSignature.binding(phoneExchange: keys.exchange, macExchangeKey: macExchangeKey) else {
            return nil
        }
        self.address = address
        self.macSigningKey = macSigningKey
        self.macExchangeKey = macExchangeKey
        self.label = label
        self.pairedAt = pairedAt
        self.keys = keys
        self.binding = binding
        self.phoneId = DoorSignature.phoneId(signingKey: keys.signingKey)
        self.fingerprint = DoorSignature.pairFingerprint(signingKey: keys.signingKey, exchangeKey: keys.exchangeKey)
    }

    var signer: RequestSigner {
        RequestSigner(phoneId: phoneId, binding: binding, key: keys.signing)
    }
}

// MARK: - Where secrets are kept

/// A place for the one pairing record. The app's is the Keychain; the tests
/// hand in their own, so no test run touches a keychain it did not make.
protocol SecretStore: Sendable {
    func read(_ account: String) throws -> Data?
    func write(_ data: Data, account: String) throws
    func remove(_ account: String) throws
}

enum KeysFailure: Error, Equatable {
    case keychain(OSStatus)
}

/// The Keychain: generic passwords under one service, this device only,
/// readable only while the phone is unlocked, never synchronised.
struct KeychainSecretStore: SecretStore {
    static let service = "com.itavero.tortie.phone.door"

    let service: String

    init(service: String = KeychainSecretStore.service) {
        self.service = service
    }

    private func query(_ account: String) -> [String: Any] {
        [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecAttrSynchronizable as String: kCFBooleanFalse as Any,
            kSecUseDataProtectionKeychain as String: true
        ]
    }

    func read(_ account: String) throws -> Data? {
        var q = query(account)
        q[kSecReturnData as String] = true
        q[kSecMatchLimit as String] = kSecMatchLimitOne
        var found: CFTypeRef?
        let status = SecItemCopyMatching(q as CFDictionary, &found)
        if status == errSecItemNotFound { return nil }
        guard status == errSecSuccess else { throw KeysFailure.keychain(status) }
        return found as? Data
    }

    /// Replaces any item under the account. The accessibility class is set on
    /// every write, so an item can never keep a weaker one it was given before.
    func write(_ data: Data, account: String) throws {
        try remove(account)
        var q = query(account)
        q[kSecValueData as String] = data
        q[kSecAttrAccessible as String] = kSecAttrAccessibleWhenUnlockedThisDeviceOnly
        let status = SecItemAdd(q as CFDictionary, nil)
        guard status == errSecSuccess else { throw KeysFailure.keychain(status) }
    }

    func remove(_ account: String) throws {
        let status = SecItemDelete(query(account) as CFDictionary)
        guard status == errSecSuccess || status == errSecItemNotFound else {
            throw KeysFailure.keychain(status)
        }
    }
}

// MARK: - The pairing, stored

/// The one pairing this phone keeps.
final class PairingStore: Sendable {
    /// The Keychain account the record lives under. Versioned, so a later
    /// shape is a different item rather than a misread one.
    static let account = "pairing-v1"

    /// The app's store.
    static let keychain = PairingStore(secrets: KeychainSecretStore())

    private let secrets: SecretStore

    init(secrets: SecretStore) {
        self.secrets = secrets
    }

    /// The pairing, or nil when there is none. A record that does not read
    /// back whole is removed, and the phone is not paired.
    func load() -> PairedDoor? {
        guard let data = try? secrets.read(Self.account) else { return nil }
        if let door = Self.decode(data) { return door }
        try? secrets.remove(Self.account)
        return nil
    }

    /// Keep this pairing, replacing any other.
    func save(_ door: PairedDoor) throws {
        try secrets.write(Self.encode(door), account: Self.account)
    }

    /// Forget the pairing. The Mac keeps its record until he presses Remove.
    func forget() throws {
        try secrets.remove(Self.account)
    }

    // MARK: The record

    private struct Record: Codable {
        let v: Int
        let host: String
        let port: Int
        let fp: String
        let dk: String
        let dx: String
        let label: String
        let pairedAt: Double
        /// The raw Ed25519 private half, base64url.
        let signingSeed: String
        /// The raw X25519 private half, base64url.
        let exchangeSeed: String
    }

    static func encode(_ door: PairedDoor) throws -> Data {
        let record = Record(
            v: 1,
            host: door.address.host,
            port: door.address.port,
            fp: door.address.pin,
            dk: door.macSigningKey,
            dx: door.macExchangeKey,
            label: door.label,
            pairedAt: door.pairedAt,
            signingSeed: Base64URL.encode(door.keys.signing.rawRepresentation),
            exchangeSeed: Base64URL.encode(door.keys.exchange.rawRepresentation)
        )
        return try JSONEncoder().encode(record)
    }

    /// A FRESH INSTALL forgets the pairing before anything reads it (Phase
    /// 316.3, build/p316/SPEC.md section 4 S3 B). A Keychain item outlives the
    /// app that wrote it, but the tailnet node's state does not (it is in the
    /// app's container, and excluded from backup), so a reinstall would
    /// otherwise find keys whose node is gone. The mark goes down only once
    /// the pairing is gone, so a forget that fails is tried again at the next
    /// launch. Answers whether this launch was a fresh install.
    @discardableResult
    func forgetOnFreshInstall(_ mark: InstallMark) -> Bool {
        guard !mark.isPresent else { return false }
        do {
            try forget()
        } catch {
            return true
        }
        try? mark.put()
        return true
    }

    static func decode(_ data: Data) -> PairedDoor? {
        guard let record = try? JSONDecoder().decode(Record.self, from: data),
              record.v == 1,
              DoorAddress.isIPv4Literal(record.host),
              (1...65535).contains(record.port),
              Base64URL.decode(record.fp)?.count == 32,
              SPKI.ed25519Key(record.dk) != nil,
              let signingSeed = Base64URL.decode(record.signingSeed),
              let exchangeSeed = Base64URL.decode(record.exchangeSeed),
              let keys = try? PhoneKeys(signingSeed: signingSeed, exchangeSeed: exchangeSeed) else { return nil }
        return PairedDoor(
            address: DoorAddress(host: record.host, port: record.port, pin: record.fp),
            macSigningKey: record.dk,
            macExchangeKey: record.dx,
            label: record.label,
            pairedAt: record.pairedAt,
            keys: keys
        )
    }
}

// MARK: - The mark a launched install leaves

/// An empty file in Application Support saying this install has launched and
/// has forgotten any pairing an earlier install left in the Keychain. It is
/// excluded from backup, so a phone restored from a backup is a fresh install
/// too: the tailnet node's state is not in the backup either.
struct InstallMark: Sendable {
    static let name = "installed"

    let url: URL

    /// The app's mark, in its own container.
    static func standard() throws -> InstallMark {
        let support = try FileManager.default.url(
            for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: true
        )
        return InstallMark(url: support.appendingPathComponent(name, isDirectory: false))
    }

    var isPresent: Bool {
        FileManager.default.fileExists(atPath: url.path(percentEncoded: false))
    }

    /// Put the mark down, excluded from backup in the same body.
    func put() throws {
        try Data().write(to: url, options: .atomic)
        var values = URLResourceValues()
        values.isExcludedFromBackup = true
        var excluded = url
        try excluded.setResourceValues(values)
    }

    /// The flag as the file system reports it now, read through a fresh URL.
    /// Nil when there is no mark.
    var isExcludedFromBackup: Bool? {
        let fresh = URL(fileURLWithPath: url.path(percentEncoded: false), isDirectory: false)
        guard isPresent else { return nil }
        return try? fresh.resourceValues(forKeys: [.isExcludedFromBackupKey]).isExcludedFromBackup
    }
}
