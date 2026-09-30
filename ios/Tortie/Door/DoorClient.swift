// DoorClient.swift — THE ONE NETWORK FILE (Phase 316.2; an ordinary pinned TLS
// client since Phase 330).
//
// Every byte the phone sends to or reads from the Mac passes through this
// file, and no other file in the app names a network type (conformance:ios
// rule c). Since Phase 330 the Mac publishes its door on the internet through
// Tailscale Funnel as RAW TCP, so TLS still ends inside Tortie on the Mac, under
// the key the QR pins, and the phone is an ordinary TLS client with no tailnet
// of its own (build/p330/SPEC.md section 4.12, research 132 section 9). What
// it does, and why each part is here:
//
//   NWCONNECTION TO THE NAME. The door is `https://<publicName>:<publicPort>`,
//   and the client dials the NAME, never an address, so Network.framework races
//   every address the name resolves to (his measurement: one of Funnel's two
//   ingress addresses did not answer from his Mac, SPEC section 2.2 O1). App
//   Transport Security governs URLSession and not this, so the app carries no
//   ATS key at all (research 132 section 9 condition 8).
//
//   TLS 1.3 AT THE LEAST, with the name as SNI. Under 1.2 the phone's client
//   certificate would cross Funnel's relay in the clear.
//
//   THE PIN IS THE TRUST. The door's certificate is self-signed, so no
//   certificate authority vouches for it. The QR carries `fp`, the sha256 of
//   the door's public key (SubjectPublicKeyInfo), and the verify block
//   completes the handshake ONLY when the leaf's key hashes to it. Anything
//   else completes it false before a byte of the request is written, and this
//   file reports `wrongKey`.
//
//   A LOCAL IDENTITY ON EVERY PAIRED CONNECTION. Once paired, every connection
//   presents the phone's client certificate, which the Mac issued over the
//   P-256 key the phone made (Door/Keys.swift). The Mac destroys a connection
//   whose key is not a paired phone's before its HTTP parser sees a byte. The
//   one connection with no certificate is `POST /pair`, inside a window a
//   person opened.
//
//   ONE REQUEST PER CONNECTION, `Connection: close`, and a hand-written,
//   BOUNDED HTTP/1.1 exchange (`DoorHTTP`): the head is at most 16 KiB and 64
//   lines, `Content-Length` is required and read through `DoorNumber`, any
//   `Transfer-Encoding` is refused, an answer is at most 2 MiB, and the whole
//   exchange has 15 seconds. The door always writes an explicit length and
//   never streams (conformance:pocket C1).
//
//   EVERY READ IS SIGNED, exactly as src/main/pocket/server.ts verifies it:
//   the target signed is the path and query exactly as sent, whose query
//   values are percent-encoded here so the door's URL parser reads back the
//   same bytes (see `queryValue`).
//
// It never logs: not a header, not a key, not a signature, not a line of the
// conversation. Its failures are `DoorFailure` cases with no words in them;
// the screens draw each one with a sentence from Copy.swift.

import CryptoKit
import Foundation
import Network
import Security

// MARK: - What can go wrong, as cases and never as words

/// Why the door gave no answer. The screens say each one in Copy.swift's
/// words; nothing here is shown to a person as it is.
enum DoorFailure: Error, Equatable, Sendable {
    /// No pairing, or nothing this build can dial.
    case notPaired
    /// The door did not present the key the pairing pinned.
    case wrongKey
    /// The Mac's public name did not resolve (`NWError.dns`). The first time
    /// a Mac publishes, its name can take minutes to reach public DNS.
    case nameNotFound
    /// No connection: a POSIX or TLS status, or 0 when there is none.
    case unreachable(code: Int)
    /// No answer inside the timeout.
    case timedOut
    /// The door answered 404, which is every refusal it makes past the
    /// handshake: not paired any more, a session it no longer has, a pairing
    /// window that is shut.
    case refused
    /// The handshake finished and the door closed the connection before one
    /// byte of an answer. It is what the door does to a client key that is not
    /// a paired phone's, and to no certificate outside a pairing window.
    case closedBeforeAnswer
    /// A status the door never sends.
    case unexpectedStatus(Int)
    /// Over the 2 MiB cap.
    case tooLarge
    /// Not HTTP the door writes, or not the contract's shape.
    case malformed
    /// Pages of the conversation that go backwards or overlap.
    case badPage
    /// The person left the screen, or the app stopped asking.
    case cancelled
}

// MARK: - Where the door is

/// A door: its PUBLIC NAME, its public port and the key it must present. Never
/// an address (research 132 section 3.8).
struct DoorEndpoint: Equatable, Sendable {
    let name: String
    let port: Int
    /// base64url sha256 of the door's public key (the QR's `fp`).
    let pin: String

    /// The ports Tortie publishes on through Funnel: 8443, then 10000. 443 is
    /// the person's own (src/main/pocket/funnel.ts, research 132 section 9).
    static let publicPorts: Set<Int> = [8443, 10000]
    /// Every name Tailscale gives a Mac ends here.
    static let nameSuffix = ".ts.net"
    /// A DNS name's limits.
    static let nameMaxBytes = 253
    static let labelMaxBytes = 63
    /// `<mac>.<tailnet>.ts.net` has four; nothing shorter than three is a Mac.
    static let labelsAtLeast = 3

    /// A lowercase DNS name under `.ts.net`: at most 253 bytes, at least three
    /// labels, each `[a-z0-9-]{1,63}` that neither starts nor ends with `-`.
    static func isPublicName(_ text: String) -> Bool {
        guard text.utf8.count <= nameMaxBytes, text.hasSuffix(nameSuffix) else { return false }
        let labels = text.split(separator: ".", omittingEmptySubsequences: false)
        guard labels.count >= labelsAtLeast else { return false }
        for label in labels {
            guard (1...labelMaxBytes).contains(label.utf8.count),
                  label.utf8.allSatisfy(isNameByte),
                  label.first != "-", label.last != "-" else { return false }
        }
        return true
    }

    private static func isNameByte(_ byte: UInt8) -> Bool {
        switch byte {
        case UInt8(ascii: "a")...UInt8(ascii: "z"), UInt8(ascii: "0")...UInt8(ascii: "9"), UInt8(ascii: "-"):
            return true
        default:
            return false
        }
    }

    /// A name and a port the phone may dial.
    var isPublic: Bool {
        Self.isPublicName(name) && Self.publicPorts.contains(port)
    }
}

/// The caps every exchange holds to.
struct DoorLimits: Sendable {
    /// The most bytes one answer's body may carry.
    static let answerCap = 2 * 1024 * 1024
    /// Seconds, for the whole exchange: resolving, the handshake, the request
    /// and the answer.
    static let timeout: TimeInterval = 15

    static let standard = DoorLimits(cap: answerCap, timeout: timeout)

    let cap: Int
    let timeout: TimeInterval
}

/// A status and a body that stayed under the cap.
struct DoorReply: Sendable, Equatable {
    let status: Int
    let body: Data
}

/// What pairing asks of the door, so its order can be tested without one.
protocol DoorExchanging: Sendable {
    /// `POST /pair` with a sealed, signed presentation. The ONE connection
    /// that presents no client certificate.
    func present(_ presentation: Data, to door: DoorEndpoint) async throws -> PairAnswer
    /// The first signed read, which is what makes a pairing DONE.
    func blocked(_ door: PairedDoor) async throws -> PocketBlockedAnswer
}

// MARK: - The client

final class DoorClient: DoorExchanging {
    let transport: DoorTransport
    let limits: DoorLimits
    private let clock: @Sendable () -> Date

    init(
        transport: DoorTransport,
        limits: DoorLimits = .standard,
        clock: @escaping @Sendable () -> Date = { Date() }
    ) {
        self.transport = transport
        self.limits = limits
        self.clock = clock
    }

    // MARK: The three reads, each signed, each over the phone's identity

    /// `GET /v1/blocked`: every session waiting on him, then everything else.
    func blocked(_ door: PairedDoor) async throws -> PocketBlockedAnswer {
        try await signedGet(PocketBlockedAnswer.self, target: Self.blockedTarget, door: door)
    }

    /// `GET /v1/session?id=`: one session. An answer about another session
    /// is not this answer.
    func session(_ sessionId: String, door: PairedDoor) async throws -> PocketSessionAnswer {
        let answer = try await signedGet(
            PocketSessionAnswer.self, target: Self.sessionTarget(sessionId), door: door
        )
        guard answer.session.sessionId == sessionId else { throw DoorFailure.malformed }
        return answer
    }

    /// `GET /v1/turns?id=&limit=[&to=]`: the newest page when `to` is nil,
    /// else the newest `limit` turns at or below `to`. `TurnPages` checks it.
    func turns(
        _ sessionId: String,
        to: Int? = nil,
        limit: Int = TurnPages.pageSize,
        door: PairedDoor
    ) async throws -> PocketTurnsAnswer {
        try await signedGet(
            PocketTurnsAnswer.self, target: Self.turnsTarget(sessionId, limit: limit, to: to), door: door
        )
    }

    // MARK: Pairing

    /// `POST /pair`. Unsigned by a request signature and with no client
    /// certificate, because a phone that has not paired has neither; the body
    /// is sealed under the QR's one-shot secret and signed over the window's
    /// challenge instead (Door/Pairing.swift). The answer is one word, and
    /// `allowed` carries the certificate.
    func present(_ presentation: Data, to door: DoorEndpoint) async throws -> PairAnswer {
        let reply = try await exchange(
            method: "POST", target: Self.pairTarget, headers: [], body: presentation, door: door, identity: nil
        )
        return try Self.decode(PairAnswer.self, from: reply)
    }

    // MARK: Targets, spelled once

    static let pairTarget = "/pair"
    static let blockedTarget = "/v1/blocked"

    static func sessionTarget(_ sessionId: String) -> String {
        "/v1/session?id=\(queryValue(sessionId))"
    }

    static func turnsTarget(_ sessionId: String, limit: Int, to: Int?) -> String {
        var target = "/v1/turns?id=\(queryValue(sessionId))&limit=\(max(1, limit))"
        if let to { target += "&to=\(to)" }
        return target
    }

    /// Every byte but the RFC 3986 unreserved set, percent-encoded with
    /// uppercase hex. The door's WHATWG URL parser leaves a `%XX` alone and
    /// encodes nothing in this set, so `url.pathname + url.search` on the Mac
    /// is byte for byte the target signed here.
    static func queryValue(_ value: String) -> String {
        let digits = Array("0123456789ABCDEF".utf8)
        var out = [UInt8]()
        for byte in value.utf8 {
            switch byte {
            case UInt8(ascii: "A")...UInt8(ascii: "Z"),
                 UInt8(ascii: "a")...UInt8(ascii: "z"),
                 UInt8(ascii: "0")...UInt8(ascii: "9"),
                 UInt8(ascii: "-"), UInt8(ascii: "."), UInt8(ascii: "_"), UInt8(ascii: "~"):
                out.append(byte)
            default:
                out.append(UInt8(ascii: "%"))
                out.append(digits[Int(byte >> 4)])
                out.append(digits[Int(byte & 0x0f)])
            }
        }
        return String(decoding: out, as: UTF8.self)
    }

    // MARK: The exchange

    private func signedGet<T: Decodable>(_ type: T.Type, target: String, door: PairedDoor) async throws -> T {
        let headers: [(name: String, value: String)]
        do {
            headers = try door.signer.headers(
                method: "GET",
                target: target,
                timestamp: DoorSignature.timestamp(clock()),
                nonce: DoorSignature.freshNonce()
            )
        } catch {
            throw DoorFailure.notPaired
        }
        // A paired read ALWAYS presents the phone's identity (conformance:ios t).
        let reply = try await exchange(
            method: "GET", target: target, headers: headers, body: nil, door: door.endpoint, identity: door.identity
        )
        return try Self.decode(type, from: reply)
    }

    /// One request over one new connection, one answer under the caps, or a
    /// `DoorFailure`. Every other method reaches the network through here.
    /// `identity` is nil for `POST /pair` alone.
    func exchange(
        method: String,
        target: String,
        headers: [(name: String, value: String)],
        body: Data?,
        door: DoorEndpoint,
        identity: ClientIdentity?
    ) async throws -> DoorReply {
        guard let request = DoorHTTP.request(
            method: method, target: target, name: door.name, port: door.port, headers: headers, body: body
        ) else { throw DoorFailure.notPaired }
        let route: DoorRoute
        do {
            route = try transport.route(to: door)
        } catch let failure as DoorFailure {
            throw failure
        } catch {
            throw DoorFailure.notPaired
        }
        guard (1...65535).contains(route.port),
              let port = NWEndpoint.Port(rawValue: UInt16(clamping: route.port)) else { throw DoorFailure.notPaired }
        if Task.isCancelled { throw DoorFailure.cancelled }
        let exchange = try DoorExchange(
            endpoint: .hostPort(host: NWEndpoint.Host(route.host), port: port),
            serverName: door.name,
            pin: door.pin,
            identity: identity,
            request: request,
            limits: limits
        )
        return try await exchange.run()
    }

    /// The TLS the door is spoken to with: 1.3 at the least, the door's NAME
    /// as SNI, a verify block that completes true ONLY for the pinned key, and
    /// the phone's identity when it has one. `onPinRefused` is called on
    /// `queue` when the leaf is not the pinned key.
    static func parameters(
        serverName: String,
        pin: String,
        identity: ClientIdentity?,
        queue: DispatchQueue,
        onPinRefused: @escaping @Sendable () -> Void
    ) throws -> NWParameters {
        let tls = NWProtocolTLS.Options()
        let options = tls.securityProtocolOptions
        sec_protocol_options_set_min_tls_protocol_version(options, .TLSv13)
        sec_protocol_options_set_tls_server_name(options, serverName)
        sec_protocol_options_set_verify_block(options, { _, trust, complete in
            let matched = DoorPin.matches(sec_trust_copy_ref(trust).takeRetainedValue(), pin: pin)
            if !matched { onPinRefused() }
            complete(matched)
        }, queue)
        if let identity {
            guard let presented = sec_identity_create(identity.identity) else { throw DoorFailure.notPaired }
            sec_protocol_options_set_local_identity(options, presented)
        }
        let parameters = NWParameters(tls: tls, tcp: NWProtocolTCP.Options())
        // No system proxy between the phone and the door.
        parameters.preferNoProxies = true
        return parameters
    }

    /// 200 decodes, 404 is the door's one refusal, anything else is a status
    /// it never sends. A body that is not the shape refuses whole.
    static func decode<T: Decodable>(_ type: T.Type, from reply: DoorReply) throws -> T {
        switch reply.status {
        case 200:
            break
        case 404:
            throw DoorFailure.refused
        default:
            throw DoorFailure.unexpectedStatus(reply.status)
        }
        do {
            return try JSONDecoder().decode(type, from: reply.body)
        } catch {
            throw DoorFailure.malformed
        }
    }

    /// A connection's error as a failure. `ready` is whether the handshake had
    /// finished, `pinRefused` whether the verify block refused the leaf, and
    /// `answered` whether a byte of the answer had arrived.
    static func failure(for error: NWError, ready: Bool, pinRefused: Bool, answered: Bool) -> DoorFailure {
        if pinRefused { return .wrongKey }
        switch error {
        case .dns:
            return .nameNotFound
        case .tls(let status):
            return .unreachable(code: Int(status))
        case .posix(let code):
            if ready && !answered && (code == .ECONNRESET || code == .EPIPE || code == .ENOTCONN) {
                return .closedBeforeAnswer
            }
            return .unreachable(code: Int(code.rawValue))
        default:
            // Wi-Fi Aware (iOS 26) and anything a later SDK adds.
            return .unreachable(code: 0)
        }
    }
}

// MARK: - The pin

/// The QR's `fp`, computed the phone's way from the leaf the door served.
enum DoorPin {
    /// sha256 over the leaf's P-256 SubjectPublicKeyInfo, base64url. Nil for
    /// a key that is not P-256, because the door's never is (`tls.ts`) and a
    /// pin over anything else would be a hash of a guess.
    static func of(_ certificate: SecCertificate) -> String? {
        guard let key = SecCertificateCopyKey(certificate), let spki = SPKI.p256(key) else { return nil }
        return Base64URL.encode(Data(SHA256.hash(data: spki)))
    }

    /// Does the leaf of this trust carry the pinned key?
    static func matches(_ trust: SecTrust, pin: String) -> Bool {
        guard let chain = SecTrustCopyCertificateChain(trust) as? [SecCertificate],
              let leaf = chain.first,
              let found = of(leaf) else { return false }
        return found == pin
    }
}

// MARK: - HTTP/1.1, by hand and bounded

/// The request the phone writes and the answer it reads, with no HTTP library
/// between them: one request, one answer, then the connection is closed.
enum DoorHTTP {
    /// The most bytes the answer's head may take, and its most lines.
    static let headCap = 16 * 1024
    static let headLineCap = 64
    /// Digits a length may have: far past 2 MiB, and far short of overflow.
    static let lengthDigitsCap = 16

    static let version = "HTTP/1.1"
    static let lineEnd = "\r\n"
    static let headEnd = Data("\r\n\r\n".utf8)

    /// Header names as the phone writes them. The door reads names in any case.
    enum Name {
        static let host = "Host"
        static let contentType = "Content-Type"
        static let contentLength = "Content-Length"
        static let connection = "Connection"
    }

    /// Header names as the phone reads them, lowercased.
    enum Read {
        static let contentLength = "content-length"
        static let contentType = "content-type"
        static let transferEncoding = "transfer-encoding"
    }

    static let json = "application/json"
    static let close = "close"

    /// The request's bytes, or nil when any part of it could not be written
    /// as one line of plain ASCII.
    static func request(
        method: String,
        target: String,
        name: String,
        port: Int,
        headers: [(name: String, value: String)],
        body: Data?
    ) -> Data? {
        guard isToken(method), isTarget(target), isFieldValue(name) else { return nil }
        var lines = ["\(method) \(target) \(version)", "\(Name.host): \(name):\(port)"]
        for header in headers {
            guard isToken(header.name), isFieldValue(header.value) else { return nil }
            lines.append("\(header.name): \(header.value)")
        }
        if let body {
            lines.append("\(Name.contentType): \(json)")
            lines.append("\(Name.contentLength): \(body.count)")
        }
        lines.append("\(Name.connection): \(close)")
        var out = Data((lines.joined(separator: lineEnd) + lineEnd + lineEnd).utf8)
        if let body { out.append(body) }
        return out
    }

    /// An absolute path and query: no fragment, no space, no control byte and
    /// nothing outside printable ASCII, so it cannot become another request.
    static func isTarget(_ text: String) -> Bool {
        text.hasPrefix("/") && !text.hasPrefix("//") && !text.contains("#")
            && !text.utf8.contains(where: { $0 <= 0x20 || $0 >= 0x7f })
    }

    /// A header value the phone writes: printable ASCII, no line break.
    static func isFieldValue(_ text: String) -> Bool {
        !text.isEmpty && text.utf8.allSatisfy { $0 >= 0x21 && $0 <= 0x7e }
    }

    /// An RFC 9110 token: a method or a header name.
    static func isToken(_ text: String) -> Bool {
        !text.isEmpty && text.utf8.allSatisfy { byte in
            switch byte {
            case UInt8(ascii: "A")...UInt8(ascii: "Z"), UInt8(ascii: "a")...UInt8(ascii: "z"),
                 UInt8(ascii: "0")...UInt8(ascii: "9"):
                return true
            default:
                return Array("!#$%&'*+-.^_`|~".utf8).contains(byte)
            }
        }
    }

    /// A `Content-Length` value: digits only, a count `DoorNumber` holds, or
    /// nil.
    static func length(_ text: String) -> Int? {
        guard (1...lengthDigitsCap).contains(text.utf8.count),
              text.utf8.allSatisfy({ $0 >= UInt8(ascii: "0") && $0 <= UInt8(ascii: "9") }),
              let number = Int(text), DoorNumber.isCount(number) else { return nil }
        return number
    }
}

/// The answer, read as its bytes arrive. Every refusal is a `DoorFailure` the
/// moment the bytes make it one; nothing half-read is ever handed on.
struct DoorResponseReader: Sendable {
    let cap: Int
    private var head = Data()
    private var headRead = false
    private var status = 0
    private var expected = 0
    private var body = Data()
    /// Whether a byte of the answer arrived at all.
    private(set) var answered = false

    init(cap: Int) {
        self.cap = cap
    }

    /// The head is read, and the body holds exactly the declared length.
    var isComplete: Bool {
        headRead && body.count == expected
    }

    /// More bytes. Throws as soon as they cannot be the door's answer.
    mutating func feed(_ chunk: Data) throws {
        guard !chunk.isEmpty else { return }
        answered = true
        guard headRead else {
            head.append(chunk)
            guard let end = head.range(of: DoorHTTP.headEnd) else {
                if head.count > DoorHTTP.headCap { throw DoorFailure.malformed }
                return
            }
            if end.lowerBound > DoorHTTP.headCap { throw DoorFailure.malformed }
            let rest = Data(head[end.upperBound...])
            try readHead(Data(head[head.startIndex..<end.lowerBound]))
            headRead = true
            head = Data()
            try take(rest)
            return
        }
        try take(chunk)
    }

    /// The answer once the connection ended: whole, or a failure.
    func finish() throws -> DoorReply {
        guard answered else { throw DoorFailure.closedBeforeAnswer }
        guard headRead, body.count == expected else { throw DoorFailure.malformed }
        return DoorReply(status: status, body: body)
    }

    private mutating func take(_ chunk: Data) throws {
        body.append(chunk)
        // More than the door said it would send is not the door.
        if body.count > expected { throw DoorFailure.malformed }
    }

    private mutating func readHead(_ bytes: Data) throws {
        // Printable ASCII, tabs and line ends: a head is nothing else.
        guard bytes.allSatisfy({ $0 == 0x09 || $0 == 0x0d || $0 == 0x0a || ($0 >= 0x20 && $0 <= 0x7e) }),
              let text = String(data: bytes, encoding: .ascii) else { throw DoorFailure.malformed }
        let lines = text.components(separatedBy: DoorHTTP.lineEnd)
        // A lone CR or LF inside a line is not a line the door wrote.
        if lines.contains(where: { $0.utf8.contains(0x0d) || $0.utf8.contains(0x0a) }) { throw DoorFailure.malformed }
        guard let statusLine = lines.first else { throw DoorFailure.malformed }
        let fields = lines.dropFirst()
        if fields.count > DoorHTTP.headLineCap { throw DoorFailure.malformed }
        let code = try Self.statusCode(statusLine)

        var found: [String: [String]] = [:]
        for line in fields {
            // No folding and no empty name.
            guard let lead = line.first, lead != " ", lead != "\t",
                  let colon = line.firstIndex(of: ":") else { throw DoorFailure.malformed }
            let name = String(line[line.startIndex..<colon])
            guard DoorHTTP.isToken(name) else { throw DoorFailure.malformed }
            let value = line[line.index(after: colon)...].trimmingCharacters(in: CharacterSet(charactersIn: " \t"))
            found[name.lowercased(), default: []].append(value)
        }
        // The door never streams (conformance:pocket C1), so any
        // Transfer-Encoding is not the door.
        if found[DoorHTTP.Read.transferEncoding] != nil { throw DoorFailure.malformed }
        // Content-Length is required, once, and a count.
        guard let lengths = found[DoorHTTP.Read.contentLength], lengths.count == 1,
              let length = DoorHTTP.length(lengths[0]) else { throw DoorFailure.malformed }
        if length > cap { throw DoorFailure.tooLarge }
        switch code {
        case 200:
            // A 200 carries JSON, and says so once.
            guard let types = found[DoorHTTP.Read.contentType], types.count == 1,
                  types[0].split(separator: ";", maxSplits: 1).first?
                      .trimmingCharacters(in: .whitespaces).lowercased() == DoorHTTP.json
            else { throw DoorFailure.malformed }
        case 404:
            break
        default:
            throw DoorFailure.unexpectedStatus(code)
        }
        status = code
        expected = length
    }

    /// `HTTP/1.1 <three digits>` and, optionally, a space and a reason.
    private static func statusCode(_ line: String) throws -> Int {
        let prefix = "\(DoorHTTP.version) "
        guard line.hasPrefix(prefix) else { throw DoorFailure.malformed }
        let rest = line.dropFirst(prefix.utf8.count)
        let digits = rest.prefix(3)
        guard digits.utf8.count == 3,
              digits.utf8.allSatisfy({ $0 >= UInt8(ascii: "0") && $0 <= UInt8(ascii: "9") }),
              let code = Int(digits) else { throw DoorFailure.malformed }
        let reason = rest.dropFirst(3)
        guard reason.isEmpty || reason.hasPrefix(" ") else { throw DoorFailure.malformed }
        return code
    }
}

// MARK: - One exchange

/// One connection, one request, one answer. Everything it holds is touched
/// only on its own serial queue, which is also the queue Network.framework
/// calls it on; `run` hands the result to the caller's task.
private final class DoorExchange: @unchecked Sendable {
    private let queue: DispatchQueue
    private let connection: NWConnection
    private let request: Data
    private let timeout: TimeInterval
    private let refused: PinRefusal
    private var reader: DoorResponseReader
    private var continuation: CheckedContinuation<DoorReply, Error>?
    private var result: Result<DoorReply, Error>?
    private var timer: DispatchWorkItem?
    private var ready = false

    init(
        endpoint: NWEndpoint,
        serverName: String,
        pin: String,
        identity: ClientIdentity?,
        request: Data,
        limits: DoorLimits
    ) throws {
        let queue = DispatchQueue(label: "tortie.door.exchange")
        let refused = PinRefusal()
        let parameters = try DoorClient.parameters(
            serverName: serverName, pin: pin, identity: identity, queue: queue, onPinRefused: { refused.mark() }
        )
        self.queue = queue
        self.refused = refused
        connection = NWConnection(to: endpoint, using: parameters)
        self.request = request
        timeout = limits.timeout
        reader = DoorResponseReader(cap: limits.cap)
    }

    func run() async throws -> DoorReply {
        try await withTaskCancellationHandler {
            try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<DoorReply, Error>) in
                queue.async { self.start(continuation) }
            }
        } onCancel: {
            queue.async { self.finish(.failure(DoorFailure.cancelled)) }
        }
    }

    private func start(_ waiting: CheckedContinuation<DoorReply, Error>) {
        if let result {
            // Cancelled before it began.
            waiting.resume(with: result)
            return
        }
        continuation = waiting
        let timer = DispatchWorkItem { [weak self] in self?.finish(.failure(DoorFailure.timedOut)) }
        self.timer = timer
        queue.asyncAfter(deadline: .now() + timeout, execute: timer)
        connection.stateUpdateHandler = { [weak self] state in self?.changed(state) }
        connection.start(queue: queue)
    }

    private func changed(_ state: NWConnection.State) {
        switch state {
        case .ready:
            ready = true
            send()
        case .waiting(let error), .failed(let error):
            // A connection that is waiting is not waited on: a name that does
            // not resolve, or a Mac that does not answer, is said now.
            finish(.failure(failure(error)))
        case .cancelled:
            finish(.failure(DoorFailure.cancelled))
        default:
            break
        }
    }

    private func failure(_ error: NWError) -> DoorFailure {
        DoorClient.failure(for: error, ready: ready, pinRefused: refused.happened, answered: reader.answered)
    }

    private func send() {
        connection.send(content: request, completion: .contentProcessed { [weak self] error in
            guard let self else { return }
            if let error {
                self.finish(.failure(self.failure(error)))
                return
            }
            self.receive()
        })
    }

    private func receive() {
        connection.receive(minimumIncompleteLength: 1, maximumLength: 64 * 1024) { [weak self] data, _, isComplete, error in
            guard let self, self.result == nil else { return }
            if let data, !data.isEmpty {
                do {
                    try self.reader.feed(data)
                } catch {
                    self.finish(.failure(error))
                    return
                }
                if self.reader.isComplete {
                    self.finish(Result { try self.reader.finish() })
                    return
                }
            }
            if let error {
                self.finish(.failure(self.failure(error)))
                return
            }
            if isComplete {
                self.finish(Result { try self.reader.finish() })
                return
            }
            self.receive()
        }
    }

    private func finish(_ outcome: Result<DoorReply, Error>) {
        guard result == nil else { return }
        result = outcome
        timer?.cancel()
        timer = nil
        connection.stateUpdateHandler = nil
        connection.cancel()
        let waiting = continuation
        continuation = nil
        waiting?.resume(with: outcome)
    }
}

/// Whether the verify block refused the leaf, set on the exchange's queue and
/// read there.
private final class PinRefusal: @unchecked Sendable {
    private(set) var happened = false
    func mark() { happened = true }
}
