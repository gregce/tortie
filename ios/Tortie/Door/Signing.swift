// Signing.swift — the door's wire encodings and the signature on every read
// (Phase 316.2).
//
// WRITTEN FROM THE DOOR, NOT FROM A DESCRIPTION OF IT. Every rule below is the
// Swift spelling of one function in src/main/pocket/pairing.ts, and
// build/p316/vectors.mjs runs THAT function to write the test vectors this
// file is held to byte for byte (ios/TortieTests/Fixtures/vectors.json):
//
//   canonicalText   <- canonicalRequestText   (seven lines, the method raised)
//   binding         <- pairingBinding         (HKDF-SHA256 over the X25519 secret)
//   phoneId         <- phoneIdOf              (the x-tortie-phone header)
//   pairFingerprint <- pairFingerprint        (the six groups both screens show)
//
// build/p313/SPEC.md section 3 describes an HMAC and an X-Tortie-Key-Id. That is
// not what was built, and nothing here follows it (build/p316/SPEC.md section 2
// row 28).
//
// THE SIGNATURE ITSELF IS NOT BYTE FOR BYTE, and that is CryptoKit, not a
// defect: its Ed25519 signer is randomised (measured on this Mac, two
// signatures of one message differ), while Node's is RFC 8032 deterministic.
// Both are valid Ed25519 over the same bytes. The tests therefore hold the
// CANONICAL TEXT byte for byte, verify the Mac-side signature with CryptoKit,
// and verify CryptoKit's own signature under the same public key.
//
// This file holds no key and opens no socket. It never logs.

import CryptoKit
import Foundation

// MARK: - Encodings, one spelling each

/// base64url with no padding, which is Node's `Buffer.toString('base64url')`.
enum Base64URL {
    static func encode(_ data: Data) -> String {
        data.base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
    }

    /// Strict: only the 64 url-safe characters, never padding, and never a
    /// length no base64 text can have. Nil for anything else.
    static func decode(_ text: String) -> Data? {
        var standard = ""
        standard.reserveCapacity(text.utf8.count + 3)
        for byte in text.utf8 {
            switch byte {
            case UInt8(ascii: "A")...UInt8(ascii: "Z"),
                 UInt8(ascii: "a")...UInt8(ascii: "z"),
                 UInt8(ascii: "0")...UInt8(ascii: "9"):
                standard.unicodeScalars.append(UnicodeScalar(byte))
            case UInt8(ascii: "-"):
                standard.append("+")
            case UInt8(ascii: "_"):
                standard.append("/")
            default:
                return nil
            }
        }
        // A length of 1 mod 4 is no base64 text; Foundation refuses it below.
        switch standard.utf8.count % 4 {
        case 2: standard.append("==")
        case 3: standard.append("=")
        default: break
        }
        return Data(base64Encoded: standard)
    }
}

/// Lowercase hex, which is Node's `digest('hex')`.
enum Hex {
    static func encode<S: Sequence>(_ bytes: S) -> String where S.Element == UInt8 {
        let digits = Array("0123456789abcdef".utf8)
        var out = [UInt8]()
        for byte in bytes {
            out.append(digits[Int(byte >> 4)])
            out.append(digits[Int(byte & 0x0f)])
        }
        return String(decoding: out, as: UTF8.self)
    }

    /// Nil unless every character is a hex digit and the count is even.
    static func decode(_ text: String) -> Data? {
        let chars = Array(text.utf8)
        guard chars.count % 2 == 0 else { return nil }
        var out = Data(capacity: chars.count / 2)
        var index = 0
        while index < chars.count {
            guard let high = nibble(chars[index]), let low = nibble(chars[index + 1]) else { return nil }
            out.append(high << 4 | low)
            index += 2
        }
        return out
    }

    private static func nibble(_ c: UInt8) -> UInt8? {
        switch c {
        case UInt8(ascii: "0")...UInt8(ascii: "9"): return c - UInt8(ascii: "0")
        case UInt8(ascii: "a")...UInt8(ascii: "f"): return c - UInt8(ascii: "a") + 10
        case UInt8(ascii: "A")...UInt8(ascii: "F"): return c - UInt8(ascii: "A") + 10
        default: return nil
        }
    }

    static func sha256(_ data: Data) -> String {
        encode(SHA256.hash(data: data))
    }
}

/// SubjectPublicKeyInfo DER, for the three key kinds the door speaks.
///
/// The door keeps every public key as base64url SPKI DER
/// (`export({ format: 'der', type: 'spki' })`), and the phone's own keys are
/// sent the same way. CryptoKit holds raw keys, so each kind is its fixed DER
/// header followed by the raw bytes.
enum SPKI {
    /// Ed25519, OID 1.3.101.112, then a 32-byte BIT STRING.
    static let ed25519Header = Data([0x30, 0x2a, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x03, 0x21, 0x00])
    /// X25519, OID 1.3.101.110, then a 32-byte BIT STRING.
    static let x25519Header = Data([0x30, 0x2a, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x6e, 0x03, 0x21, 0x00])
    /// P-256 (id-ecPublicKey with prime256v1), then a 65-byte uncompressed
    /// point. build/p316/SPEC.md section 3.3: this header plus
    /// `SecKeyCopyExternalRepresentation` hashed equals `tls.ts`'s
    /// `publicKeyFingerprint` in 112 of 112 challenges.
    static let p256Header = Data([
        0x30, 0x59, 0x30, 0x13, 0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01,
        0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07, 0x03, 0x42, 0x00
    ])

    static func wrap(_ raw: Data, header: Data) -> Data {
        header + raw
    }

    /// The raw key inside an SPKI of exactly this kind, or nil.
    static func unwrap(_ spki: Data, header: Data, rawCount: Int) -> Data? {
        guard spki.count == header.count + rawCount, spki.prefix(header.count) == header else { return nil }
        return Data(spki.suffix(rawCount))
    }

    /// The base64url SPKI of an Ed25519 public key.
    static func ed25519(_ key: Curve25519.Signing.PublicKey) -> String {
        Base64URL.encode(wrap(key.rawRepresentation, header: ed25519Header))
    }

    /// The base64url SPKI of an X25519 public key.
    static func x25519(_ key: Curve25519.KeyAgreement.PublicKey) -> String {
        Base64URL.encode(wrap(key.rawRepresentation, header: x25519Header))
    }

    /// An Ed25519 public key from its base64url SPKI, or nil.
    static func ed25519Key(_ text: String) -> Curve25519.Signing.PublicKey? {
        guard let der = Base64URL.decode(text),
              let raw = unwrap(der, header: ed25519Header, rawCount: 32) else { return nil }
        return try? Curve25519.Signing.PublicKey(rawRepresentation: raw)
    }

    /// An X25519 public key from its base64url SPKI, or nil.
    static func x25519Key(_ text: String) -> Curve25519.KeyAgreement.PublicKey? {
        guard let der = Base64URL.decode(text),
              let raw = unwrap(der, header: x25519Header, rawCount: 32) else { return nil }
        return try? Curve25519.KeyAgreement.PublicKey(rawRepresentation: raw)
    }
}

// MARK: - The request signature

/// Every signed read, exactly as `PocketRequestVerifier.verify` checks it.
enum DoorSignature {
    /// `POCKET_REQUEST_ALGORITHM`, the canonical text's first line.
    static let algorithm = "tortie-pocket-req-v1"
    /// The HKDF info the binding is derived under.
    static let bindingInfo = "tortie-pocket-bind-v1"
    /// The prefix `phoneIdOf` hashes before the signing key.
    static let phoneIdPrefix = "tortie-pocket-id-v1\n"
    /// The prefix `pairFingerprint` hashes before both keys.
    static let fingerprintPrefix = "tortie-pocket-fp-v1\n"

    /// `POCKET_HEADERS`. None of them is a secret.
    enum Header {
        static let phone = "x-tortie-phone"
        static let timestamp = "x-tortie-timestamp"
        static let nonce = "x-tortie-nonce"
        static let signature = "x-tortie-signature"
    }

    /// The door refuses a nonce outside 16 to 64 characters (`pairing.ts`).
    static let nonceRange = 16...64

    /// The bytes a signature covers: seven lines joined by a line feed, with
    /// the method raised, which is `canonicalRequestText`.
    static func canonicalText(
        method: String,
        target: String,
        bodySha256: String,
        timestamp: String,
        nonce: String,
        binding: String
    ) -> String {
        [algorithm, method.uppercased(), target, bodySha256, timestamp, nonce, binding]
            .joined(separator: "\n")
    }

    /// `phoneIdOf`: the first 32 hex characters of
    /// sha256(`tortie-pocket-id-v1\n` + the phone's signing SPKI, base64url).
    static func phoneId(signingKey: String) -> String {
        String(Hex.sha256(Data((phoneIdPrefix + signingKey).utf8)).prefix(32))
    }

    /// `pairFingerprint`: six groups of four hex characters over BOTH of the
    /// phone's public keys, which is what the person matches on both screens.
    static func pairFingerprint(signingKey: String, exchangeKey: String) -> String {
        let digest = Hex.sha256(Data("\(fingerprintPrefix)\(signingKey)\n\(exchangeKey)".utf8))
        let head = Array(digest.prefix(24))
        return stride(from: 0, to: head.count, by: 4)
            .map { String(head[$0..<($0 + 4)]) }
            .joined(separator: " ")
    }

    /// `pairingBinding`, from the phone's side of the same X25519 agreement:
    /// HKDF-SHA256 over the shared secret, salt `<Mac xpub>\n<phone xpub>`
    /// (both base64url SPKI), info `tortie-pocket-bind-v1`, 32 bytes, hex. It
    /// never crosses the wire, so a signature made for this door cannot be
    /// replayed at another.
    static func binding(
        phoneExchange: Curve25519.KeyAgreement.PrivateKey,
        macExchangeKey: String
    ) -> String? {
        guard let macPublic = SPKI.x25519Key(macExchangeKey),
              let shared = try? phoneExchange.sharedSecretFromKeyAgreement(with: macPublic) else { return nil }
        let phoneExchangeKey = SPKI.x25519(phoneExchange.publicKey)
        let key = shared.hkdfDerivedSymmetricKey(
            using: SHA256.self,
            salt: Data("\(macExchangeKey)\n\(phoneExchangeKey)".utf8),
            sharedInfo: Data(bindingInfo.utf8),
            outputByteCount: 32
        )
        return key.withUnsafeBytes { Hex.encode($0) }
    }

    /// Epoch milliseconds as the door reads them (`Number(timestamp)`).
    static func timestamp(_ date: Date) -> String {
        String(Int64((date.timeIntervalSince1970 * 1000).rounded(.down)))
    }

    /// 16 random bytes as 32 hex characters, inside the door's 16 to 64.
    static func freshNonce() -> String {
        var generator = SystemRandomNumberGenerator()
        return Hex.encode((0..<16).map { _ in UInt8.random(in: 0...255, using: &generator) })
    }
}

/// What signs a read for one pairing. Built from a pairing that is stored or
/// being confirmed, and nothing else.
struct RequestSigner: Sendable {
    let phoneId: String
    let binding: String
    let key: Curve25519.Signing.PrivateKey

    /// The four headers for one request, in the order `POCKET_HEADERS` names
    /// them. `body` is empty for every read the door has.
    func headers(
        method: String,
        target: String,
        body: Data = Data(),
        timestamp: String,
        nonce: String
    ) throws -> [(name: String, value: String)] {
        let text = DoorSignature.canonicalText(
            method: method,
            target: target,
            bodySha256: Hex.sha256(body),
            timestamp: timestamp,
            nonce: nonce,
            binding: binding
        )
        let signature = try key.signature(for: Data(text.utf8))
        return [
            (DoorSignature.Header.phone, phoneId),
            (DoorSignature.Header.timestamp, timestamp),
            (DoorSignature.Header.nonce, nonce),
            (DoorSignature.Header.signature, Base64URL.encode(signature))
        ]
    }
}
