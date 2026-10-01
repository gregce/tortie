// Keys.swift — the phone's keys and the one pairing it keeps (Phase 316.2; the
// client key and its certificate since Phase 330).
//
// WHAT IS KEPT. One pairing, as one Keychain record (`pairing-v2`): the door's
// public name, its port and pinned key, the Mac's two public keys, the label
// the phone presented, the phone's own two private keys (Ed25519 to sign every
// read, X25519 to derive the binding), the tag and certificate of its
// CLIENT KEY, and (Phase 316.5) what the pairing agreed about alerts: whether
// the Mac said it could send one, and the address the phone presented, both
// halves or neither. A record written before 316.5 holds neither and reads back
// as a pairing with a Mac that could not send; a record with half an address,
// or a malformed one, does not read back whole and is removed, the Mac's own
// rule for a stored phone row. One record, so a pairing is written or removed whole and can
// never be half of two pairings. A leftover `pairing-v1` (the tailnet build's)
// is removed on sight: its door answered on a tailnet address, which no door
// does now.
//
// THE CLIENT KEY (build/p330/SPEC.md section 4.7.1). A P-256 key the phone
// makes for each pairing attempt, in the Secure Enclave when the device has
// one and in the Keychain otherwise, ThisDeviceOnly, under a tag of its own
// (`tortie.client.<16 hex>`). The Mac issues a certificate over it when a
// person presses Allow, and every connection after that presents the two
// together. So a thief needs the client key, which the Secure Enclave never
// lets out, AND the signing key. Every attempt that ends without being paired
// deletes its key by its tag, and forgetting the pairing deletes every client
// key the app holds. The enclave key is ThisDeviceOnly by its access control,
// which the Simulator reads back as After First Unlock This Device Only
// (`cku`); his ruling of 2026-09-29 accepted that protection. The software key
// says `kSecAttrAccessibleWhenUnlockedThisDeviceOnly` itself.
//
// WHERE. The Keychain only, ThisDeviceOnly, so nothing syncs or goes into a
// backup that can be restored to another phone. The pairing record and the
// certificate are `kSecAttrAccessibleWhenUnlockedThisDeviceOnly`, so they are
// not read while the phone is locked. CryptoKit's Curve25519 keys are not
// SecKeys, and a generic password holding their raw bytes is Apple's own
// recipe for them ("Storing CryptoKit Keys in the Keychain").
//
// WHEN. Only after the pairing is DONE, which is the first signed read
// succeeding over the phone's identity (build/p316/SPEC.md section 4 S2).
// Until then the two Curve25519 keys live only in memory, and the client key
// only under its tag.
//
// A record that does not read back whole is removed and the phone is not
// paired, never partly paired. Nothing here logs, and no key or record ever
// leaves this file except as the Keychain items and the in-memory pairing.

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

// MARK: - The client key and what it presents

/// A P-256 client key the phone made for one pairing attempt.
struct ClientKey: Sendable, Equatable {
    /// `tortie.client.<16 hex>`, the key's Keychain tag and its certificate's
    /// label.
    let tag: String
    /// `ck`: the key's SubjectPublicKeyInfo, base64url, which the Mac issues
    /// its certificate over and pins.
    let spki: String
}

/// What every paired connection presents: the client key and the Mac's
/// certificate over it. A `SecIdentity` is immutable and the Security framework
/// is safe to call from any thread, which is why this may cross tasks.
struct ClientIdentity: @unchecked Sendable {
    let identity: SecIdentity
}

/// Where client keys are made, adopted and deleted. The app's is the Keychain;
/// the tests hand in their own, so no test touches a keychain it did not make.
protocol ClientKeyStore: Sendable {
    /// A new key for one attempt, under a fresh tag.
    func mint() throws -> ClientKey
    /// Keep the Mac's certificate for `key` and answer the identity the two
    /// make. Throws when the certificate is not over exactly this key.
    func adopt(_ certificate: Data, for key: ClientKey) throws -> ClientIdentity
    /// The identity kept under `tag` for this certificate, or nil.
    func identity(tag: String, certificate: Data) -> ClientIdentity?
    /// Delete the key and the certificate under `tag`.
    func delete(tag: String)
    /// Every client key's tag this app holds.
    func tags() -> [String]
}

enum ClientKeys {
    /// Every client key's tag begins with this.
    static let tagPrefix = "tortie.client."

    /// A fresh tag: the prefix and 16 random hex digits.
    static func newTag() -> String {
        var generator = SystemRandomNumberGenerator()
        return tagPrefix + Hex.encode((0..<8).map { _ in UInt8.random(in: 0...255, using: &generator) })
    }

    /// Is this one of the app's client key tags?
    static func isTag(_ tag: String) -> Bool {
        guard tag.hasPrefix(tagPrefix) else { return false }
        let tail = tag.dropFirst(tagPrefix.utf8.count)
        return tail.utf8.count == 16 && Hex.decode(String(tail)) != nil
    }

    /// The base64url SPKI of a P-256 public key, or nil for any other key.
    static func spki(of key: SecKey) -> String? {
        SPKI.p256(key).map(Base64URL.encode)
    }

    /// The certificate in `der` when it is a certificate over exactly `spki`,
    /// or nil. The Mac's certificate must carry the key the phone made.
    static func certificate(_ der: Data, carrying spki: String) -> SecCertificate? {
        guard let certificate = SecCertificateCreateWithData(nil, der as CFData),
              let key = SecCertificateCopyKey(certificate),
              self.spki(of: key) == spki else { return nil }
        return certificate
    }
}

#if os(iOS)
/// The Keychain's client keys. iOS only: nothing on a Mac, a test harness
/// included, can make a key in anybody's keychain through this file.
struct KeychainClientKeys: ClientKeyStore {
    #if DEBUG
    /// DEBUG ONLY, for `DoorKeychainTests`: make the key in software even
    /// where the Secure Enclave is available. The Simulator has one (iOS
    /// 18.3.1 and 26.3.1, the reverify of 2026-09-29), so without this no test
    /// ever runs the software path. A Release build has no such field and
    /// always asks for the enclave where there is one.
    var softwareKeyDebugSeam = false
    #endif

    /// Whether this store makes its key in software where the enclave is
    /// available: only under the DEBUG seam above, never in a Release build.
    private var softwareOnly: Bool {
        #if DEBUG
        return softwareKeyDebugSeam
        #else
        return false
        #endif
    }

    func mint() throws -> ClientKey {
        let tag = ClientKeys.newTag()
        let enclave = SecureEnclave.isAvailable && !softwareOnly
        var privateAttributes: [String: Any] = [
            kSecAttrIsPermanent as String: true,
            kSecAttrApplicationTag as String: Data(tag.utf8)
        ]
        if enclave {
            // ThisDeviceOnly, and the Secure Enclave may only USE the key. On
            // the Simulator (iOS 18.3.1 and 26.3.1) the key reads back the
            // token `com.apple.setoken` and an access control whose protection
            // is `cku`, After First Unlock This Device Only, though `aku` is
            // asked for here; its kSecAttrAccessible attribute reads `dk`. His
            // ruling of 2026-09-29 accepted that protection: the enclave
            // token, and an access control that is ThisDeviceOnly.
            guard let access = SecAccessControlCreateWithFlags(
                nil, kSecAttrAccessibleWhenUnlockedThisDeviceOnly, .privateKeyUsage, nil
            ) else { throw KeysFailure.clientKey }
            privateAttributes[kSecAttrAccessControl as String] = access
        } else {
            // A software key says its accessibility ITSELF, and this line is
            // what makes it ThisDeviceOnly: with it the key reads back `aku`
            // on iOS 18.3.1 and 26.3.1, and without it `ak` (WhenUnlocked,
            // NOT ThisDeviceOnly), measured by Phase 330's second reverify on
            // 2026-09-29. Never remove it.
            privateAttributes[kSecAttrAccessible as String] = kSecAttrAccessibleWhenUnlockedThisDeviceOnly
        }
        var attributes: [String: Any] = [
            kSecAttrKeyType as String: kSecAttrKeyTypeECSECPrimeRandom,
            kSecAttrKeySizeInBits as String: 256,
            kSecPrivateKeyAttrs as String: privateAttributes
        ]
        if enclave {
            attributes[kSecAttrTokenID as String] = kSecAttrTokenIDSecureEnclave
        }
        var error: Unmanaged<CFError>?
        guard let key = SecKeyCreateRandomKey(attributes as CFDictionary, &error),
              let publicKey = SecKeyCopyPublicKey(key),
              let spki = ClientKeys.spki(of: publicKey) else {
            delete(tag: tag)
            throw KeysFailure.clientKey
        }
        return ClientKey(tag: tag, spki: spki)
    }

    func adopt(_ certificate: Data, for key: ClientKey) throws -> ClientIdentity {
        guard let cert = ClientKeys.certificate(certificate, carrying: key.spki) else { throw KeysFailure.clientKey }
        let add: [String: Any] = [
            kSecClass as String: kSecClassCertificate,
            kSecValueRef as String: cert,
            kSecAttrLabel as String: key.tag,
            kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
            kSecUseDataProtectionKeychain as String: true
        ]
        let status = SecItemAdd(add as CFDictionary, nil)
        guard status == errSecSuccess || status == errSecDuplicateItem else { throw KeysFailure.keychain(status) }
        guard let identity = identity(tag: key.tag, certificate: certificate) else { throw KeysFailure.clientKey }
        return identity
    }

    /// The identity whose certificate is exactly `certificate`, from the
    /// Keychain's identities (the certificate and its key, matched by the
    /// Keychain itself). Compared by the certificate's bytes, so no attribute
    /// the Keychain may or may not match on decides which one it is.
    func identity(tag: String, certificate: Data) -> ClientIdentity? {
        guard ClientKeys.isTag(tag) else { return nil }
        let query: [String: Any] = [
            kSecClass as String: kSecClassIdentity,
            kSecMatchLimit as String: kSecMatchLimitAll,
            kSecReturnRef as String: true,
            kSecUseDataProtectionKeychain as String: true
        ]
        var found: CFTypeRef?
        guard SecItemCopyMatching(query as CFDictionary, &found) == errSecSuccess,
              let items = found as? [AnyObject] else { return nil }
        for item in items where CFGetTypeID(item) == SecIdentityGetTypeID() {
            let identity = item as! SecIdentity
            var cert: SecCertificate?
            guard SecIdentityCopyCertificate(identity, &cert) == errSecSuccess, let cert else { continue }
            if SecCertificateCopyData(cert) as Data == certificate { return ClientIdentity(identity: identity) }
        }
        return nil
    }

    func delete(tag: String) {
        guard ClientKeys.isTag(tag) else { return }
        let key: [String: Any] = [
            kSecClass as String: kSecClassKey,
            kSecAttrApplicationTag as String: Data(tag.utf8),
            kSecUseDataProtectionKeychain as String: true
        ]
        let certificate: [String: Any] = [
            kSecClass as String: kSecClassCertificate,
            kSecAttrLabel as String: tag,
            kSecUseDataProtectionKeychain as String: true
        ]
        SecItemDelete(key as CFDictionary)
        SecItemDelete(certificate as CFDictionary)
    }

    func tags() -> [String] {
        let query: [String: Any] = [
            kSecClass as String: kSecClassKey,
            kSecMatchLimit as String: kSecMatchLimitAll,
            kSecReturnAttributes as String: true,
            kSecUseDataProtectionKeychain as String: true
        ]
        var found: CFTypeRef?
        guard SecItemCopyMatching(query as CFDictionary, &found) == errSecSuccess,
              let items = found as? [[String: Any]] else { return [] }
        return items.compactMap { item in
            guard let data = item[kSecAttrApplicationTag as String] as? Data else { return nil }
            let tag = String(decoding: data, as: UTF8.self)
            return ClientKeys.isTag(tag) ? tag : nil
        }
    }
}
#endif

extension SPKI {
    /// A P-256 public key's SubjectPublicKeyInfo DER: the fixed header and the
    /// 65-byte uncompressed point, which is `tls.ts`'s and Node's export. Nil
    /// for any key that is not P-256.
    static func p256(_ key: SecKey) -> Data? {
        guard let attributes = SecKeyCopyAttributes(key) as? [String: Any],
              attributes[kSecAttrKeyType as String] as? String == kSecAttrKeyTypeECSECPrimeRandom as String,
              attributes[kSecAttrKeySizeInBits as String] as? Int == 256,
              let point = SecKeyCopyExternalRepresentation(key, nil) as Data?,
              point.count == 65, point.first == 0x04 else { return nil }
        return wrap(point, header: p256Header)
    }
}

// MARK: - A pairing that is done

/// A door this phone reads. It exists only once a signed read succeeded over
/// its identity.
struct PairedDoor: Sendable {
    let endpoint: DoorEndpoint
    /// `dk`, the Mac's Ed25519 SPKI. Kept for the phase that checks an answer
    /// the door signs; the door signs none yet.
    let macSigningKey: String
    /// `dx`, the Mac's X25519 SPKI, which the binding is derived from.
    let macExchangeKey: String
    /// What the phone called itself when it presented.
    let label: String
    /// Epoch ms of the first signed read that succeeded.
    let pairedAt: Double
    let keys: PhoneKeys
    /// The client key: its tag and `ck`.
    let clientKey: ClientKey
    /// The certificate the Mac issued over it, DER.
    let certificate: Data
    /// What every connection presents.
    let identity: ClientIdentity
    /// What this pairing agreed about alerts: whether the Mac said it could
    /// send one, and the address this phone PRESENTED in the presentation the
    /// Mac held, which is exactly the one the Mac holds, so the list compares
    /// it with the phone's address now (`AlertLine`).
    let alerts: AlertsKept

    /// `x-tortie-phone`.
    let phoneId: String
    /// The binding every signature covers. Derived, never stored.
    let binding: String
    /// The six groups both screens showed, over all three keys.
    let fingerprint: String

    /// Nil when the Mac's exchange key is not an X25519 key.
    init?(
        endpoint: DoorEndpoint,
        macSigningKey: String,
        macExchangeKey: String,
        label: String,
        pairedAt: Double,
        keys: PhoneKeys,
        clientKey: ClientKey,
        certificate: Data,
        identity: ClientIdentity,
        alerts: AlertsKept
    ) {
        guard let binding = DoorSignature.binding(phoneExchange: keys.exchange, macExchangeKey: macExchangeKey) else {
            return nil
        }
        self.endpoint = endpoint
        self.macSigningKey = macSigningKey
        self.macExchangeKey = macExchangeKey
        self.label = label
        self.pairedAt = pairedAt
        self.keys = keys
        self.clientKey = clientKey
        self.certificate = certificate
        self.identity = identity
        self.alerts = alerts
        self.binding = binding
        self.phoneId = DoorSignature.phoneId(signingKey: keys.signingKey)
        self.fingerprint = DoorSignature.pairFingerprint(
            signingKey: keys.signingKey, exchangeKey: keys.exchangeKey, clientKey: clientKey.spki
        )
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
    /// A client key that could not be made, or a certificate not over it.
    case clientKey
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
    static let account = "pairing-v2"
    /// The tailnet build's record (Phases 316.2 to 316.4), removed on sight.
    static let formerAccount = "pairing-v1"

    #if os(iOS)
    /// The app's store.
    static let keychain = PairingStore(secrets: KeychainSecretStore(), clientKeys: KeychainClientKeys())
    #endif

    private let secrets: SecretStore
    let clientKeys: ClientKeyStore

    init(secrets: SecretStore, clientKeys: ClientKeyStore) {
        self.secrets = secrets
        self.clientKeys = clientKeys
    }

    /// The pairing, or nil when there is none. A leftover `pairing-v1` is
    /// removed and is no pairing. A record that does not read back whole, or
    /// whose identity is gone, is removed with its keys, and the phone is not
    /// paired.
    func load() -> PairedDoor? {
        if (try? secrets.read(Self.formerAccount)) != nil {
            try? secrets.remove(Self.formerAccount)
        }
        guard let data = try? secrets.read(Self.account) else { return nil }
        if let door = decode(data) { return door }
        try? forget()
        return nil
    }

    /// Keep this pairing, replacing any other.
    func save(_ door: PairedDoor) throws {
        try secrets.write(Self.encode(door), account: Self.account)
    }

    /// Forget the pairing and every client key the app holds. The Mac keeps
    /// its record until he presses Remove.
    func forget() throws {
        try secrets.remove(Self.account)
        try? secrets.remove(Self.formerAccount)
        for tag in clientKeys.tags() {
            clientKeys.delete(tag: tag)
        }
    }

    // MARK: The record

    private struct Record: Codable {
        let v: Int
        let name: String
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
        /// The client key's Keychain tag.
        let clientTag: String
        /// The Mac's certificate over the client key, DER, base64url.
        let certificate: String
        /// The alert address presented: the device token and its
        /// environment, both or neither (Phase 316.5). Absent in a record
        /// written before it, which reads as a phone that presented none.
        let apt: String?
        let ape: String?
        /// True when the Mac said, as it held this phone, that it could send
        /// an alert (Phase 316.5); written only when true, so a record with a
        /// Mac that could not, or from before 316.5, has no such key.
        let sends: Bool?
    }

    static func encode(_ door: PairedDoor) throws -> Data {
        let record = Record(
            v: 2,
            name: door.endpoint.name,
            port: door.endpoint.port,
            fp: door.endpoint.pin,
            dk: door.macSigningKey,
            dx: door.macExchangeKey,
            label: door.label,
            pairedAt: door.pairedAt,
            signingSeed: Base64URL.encode(door.keys.signing.rawRepresentation),
            exchangeSeed: Base64URL.encode(door.keys.exchange.rawRepresentation),
            clientTag: door.clientKey.tag,
            certificate: Base64URL.encode(door.certificate),
            apt: door.alerts.presented?.token,
            ape: door.alerts.presented?.environment.rawValue,
            sends: door.alerts.macSends ? true : nil
        )
        return try JSONEncoder().encode(record)
    }

    /// A stored address, both halves or neither. `.whole(nil)` is a phone that
    /// presented none; `.broken` is half an address, a word that is not an
    /// environment, or a token that is not what this app writes, and the
    /// record is not read back whole.
    private enum StoredPush {
        case whole(PushAddress?)
        case broken
    }

    private static func storedPush(_ record: Record) -> StoredPush {
        switch (record.apt, record.ape) {
        case (nil, nil):
            return .whole(nil)
        case let (token?, word?):
            guard let environment = PushEnvironment(rawValue: word),
                  let address = PushAddress(token: token, environment: environment),
                  address.token == token else { return .broken }
            return .whole(address)
        default:
            return .broken
        }
    }

    /// A FRESH INSTALL forgets the pairing before anything reads it (Phase
    /// 316.3). A Keychain item outlives the app that wrote it, and a pairing a
    /// person deleted with the app must not come back when the app does. The
    /// mark goes down only once the pairing is gone, so a forget that fails is
    /// tried again at the next launch. Answers whether this launch was a fresh
    /// install.
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

    func decode(_ data: Data) -> PairedDoor? {
        guard let record = try? JSONDecoder().decode(Record.self, from: data),
              record.v == 2,
              DoorEndpoint(name: record.name, port: record.port, pin: record.fp).isPublic,
              Base64URL.decode(record.fp)?.count == 32,
              SPKI.ed25519Key(record.dk) != nil,
              let signingSeed = Base64URL.decode(record.signingSeed),
              let exchangeSeed = Base64URL.decode(record.exchangeSeed),
              let keys = try? PhoneKeys(signingSeed: signingSeed, exchangeSeed: exchangeSeed),
              ClientKeys.isTag(record.clientTag),
              let certificate = Base64URL.decode(record.certificate),
              let cert = SecCertificateCreateWithData(nil, certificate as CFData),
              let certKey = SecCertificateCopyKey(cert),
              let spki = ClientKeys.spki(of: certKey),
              case let .whole(push) = Self.storedPush(record),
              let identity = clientKeys.identity(tag: record.clientTag, certificate: certificate) else { return nil }
        return PairedDoor(
            endpoint: DoorEndpoint(name: record.name, port: record.port, pin: record.fp),
            macSigningKey: record.dk,
            macExchangeKey: record.dx,
            label: record.label,
            pairedAt: record.pairedAt,
            keys: keys,
            clientKey: ClientKey(tag: record.clientTag, spki: spki),
            certificate: certificate,
            identity: identity,
            alerts: AlertsKept(macSends: record.sends ?? false, presented: push)
        )
    }
}

// MARK: - The mark a launched install leaves

/// An empty file in Application Support saying this install has launched and
/// has forgotten any pairing an earlier install left in the Keychain. It is
/// excluded from backup, so a phone restored from a backup is a fresh install
/// too: a pairing is this device's alone.
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
