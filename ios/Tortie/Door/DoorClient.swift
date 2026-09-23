// DoorClient.swift — THE ONE NETWORK USER (Phase 316.2).
//
// Every byte the phone sends to or reads from the Mac passes through this
// file, and no other file in the app names a network type (conformance:ios
// rule c). What it does, and why each part is here:
//
//   HTTPS ONLY. `url(_:target:)` is the one place a URL is built, its scheme
//   is written once as `https`, and its host must be an IPv4 literal. The one
//   App Transport Security key the app carries (100.64.0.0/10) would also
//   allow plain http to a tailnet address, so the client must never build one
//   (build/p316/SPEC.md section 3.2).
//
//   THE PIN IS THE TRUST. The door's certificate is self-signed, so no
//   certificate authority vouches for it. The QR carries `fp`, the sha256 of
//   the door's public key (SubjectPublicKeyInfo), and the session delegate
//   answers the server-trust challenge with the door's credential ONLY when
//   the leaf's key hashes to it. Anything else cancels the challenge before a
//   byte of the request is sent, which URLSession reports as -999 and this
//   file reports as `wrongKey` (section 3.3 measured the hash: 112 of 112).
//
//   ANSWERS ARE CAPPED AT 2 MiB. Counted as they arrive, and the task is
//   cancelled the moment one goes over, so a door that sends ten mebibytes
//   costs the phone two. A declared length over the cap is refused before its
//   first byte.
//
//   15 SECONDS. Both the idle and the whole-request timeouts, so a door that
//   answers nothing, or answers a byte a minute, ends in a sentence.
//
//   NOTHING ELSE IS FOLLOWED OR KEPT: no redirect, no cookie, no cache, no
//   credential store, and no system proxy on the direct route. A SOCKS route
//   never fails over to a direct connection.
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
    /// No pairing, or this build has no way to reach a Mac.
    case notPaired
    /// The door did not present the key the pairing pinned.
    case wrongKey
    /// No connection: the URLSession error code (e.g. -1004 refused, -1200 a
    /// TLS or App Transport Security refusal).
    case unreachable(code: Int)
    /// No answer inside the timeout.
    case timedOut
    /// The door answered 404, which is every refusal it makes: not paired any
    /// more, a session it no longer has, a pairing window that is shut.
    case refused
    /// A status the door never sends.
    case unexpectedStatus(Int)
    /// Over the 2 MiB cap.
    case tooLarge
    /// Not the contract's shape.
    case malformed
    /// Pages of the conversation that go backwards or overlap.
    case badPage
    /// The person left the screen, or the app stopped asking.
    case cancelled
}

// MARK: - Where the door is

/// A door: its IPv4 address, its port and the key it must present.
struct DoorAddress: Equatable, Sendable {
    let host: String
    let port: Int
    /// base64url sha256 of the door's public key (the QR's `fp`).
    let pin: String

    /// A dotted IPv4 literal: four decimal octets, 0 to 255, no leading zero.
    /// The door binds IPv4 only (src/main/pocket/bind.ts).
    static func isIPv4Literal(_ text: String) -> Bool {
        let parts = text.split(separator: ".", omittingEmptySubsequences: false)
        guard parts.count == 4 else { return false }
        for part in parts {
            guard (1...3).contains(part.count),
                  part.utf8.allSatisfy({ $0 >= UInt8(ascii: "0") && $0 <= UInt8(ascii: "9") }),
                  !(part.count > 1 && part.first == "0"),
                  let value = Int(part), value <= 255 else { return false }
        }
        return true
    }

    /// The four octets, for the range checks pairing makes.
    var octets: [Int]? {
        guard Self.isIPv4Literal(host) else { return nil }
        return host.split(separator: ".").compactMap { Int($0) }
    }
}

/// The caps every exchange holds to.
struct DoorLimits: Sendable {
    /// The most bytes one answer may carry.
    static let answerCap = 2 * 1024 * 1024
    /// Seconds, for the idle timeout and the whole request alike.
    static let timeout: TimeInterval = 15

    static let standard = DoorLimits(cap: answerCap, timeout: timeout)

    let cap: Int
    let timeout: TimeInterval
}

/// A status and a body that stayed under the cap.
struct DoorReply: Sendable {
    let status: Int
    let body: Data
}

/// What pairing asks of the door, so its order can be tested without one.
protocol DoorExchanging: Sendable {
    /// `POST /pair` with a sealed presentation.
    func present(_ sealed: Data, to door: DoorAddress) async throws -> PairAnswer
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

    // MARK: The three reads, each signed

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

    /// `POST /pair`. Unsigned, because a phone that has not paired has no key
    /// the door knows; the body is sealed under the QR's one-shot secret
    /// instead. The answer is one word.
    func present(_ sealed: Data, to door: DoorAddress) async throws -> PairAnswer {
        let reply = try await exchange(
            method: "POST", target: Self.pairTarget, headers: [], body: sealed, door: door
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

    /// THE ONE URL BUILDER. `https`, an IPv4 literal, a port in range and an
    /// absolute target, or nil.
    static func url(_ door: DoorAddress, target: String) -> URL? {
        guard DoorAddress.isIPv4Literal(door.host),
              (1...65535).contains(door.port),
              target.hasPrefix("/"),
              !target.hasPrefix("//"),
              !target.contains("#"),
              !target.utf8.contains(where: { $0 <= 0x20 || $0 >= 0x7f }) else { return nil }
        guard let url = URL(string: "https://\(door.host):\(door.port)\(target)"),
              url.scheme == "https", url.host(percentEncoded: false) == door.host else { return nil }
        return url
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
        let reply = try await exchange(method: "GET", target: target, headers: headers, body: nil, door: door.address)
        return try Self.decode(type, from: reply)
    }

    /// One request, one answer under the cap, or a `DoorFailure`. Every other
    /// method reaches the network through here.
    func exchange(
        method: String,
        target: String,
        headers: [(name: String, value: String)],
        body: Data?,
        door: DoorAddress
    ) async throws -> DoorReply {
        guard let url = Self.url(door, target: target) else { throw DoorFailure.notPaired }
        let route: DoorRoute
        do {
            route = try await transport.route(to: door.host)
        } catch let failure as DoorFailure {
            throw failure
        } catch {
            throw DoorFailure.notPaired
        }
        if Task.isCancelled { throw DoorFailure.cancelled }

        var request = URLRequest(
            url: url, cachePolicy: .reloadIgnoringLocalAndRemoteCacheData, timeoutInterval: limits.timeout
        )
        request.httpMethod = method
        request.httpShouldHandleCookies = false
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        for header in headers {
            request.setValue(header.value, forHTTPHeaderField: header.name)
        }
        if let body {
            request.httpBody = body
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        }

        let exchange = DoorExchange(pin: door.pin, cap: limits.cap)
        let session = URLSession(
            configuration: Self.configuration(route, limits: limits),
            delegate: exchange,
            delegateQueue: nil
        )
        // The session holds its delegate until it is invalidated.
        defer { session.finishTasksAndInvalidate() }
        return try await exchange.run(session.dataTask(with: request))
    }

    static func configuration(_ route: DoorRoute, limits: DoorLimits) -> URLSessionConfiguration {
        let configuration = URLSessionConfiguration.ephemeral
        configuration.timeoutIntervalForRequest = limits.timeout
        configuration.timeoutIntervalForResource = limits.timeout
        configuration.requestCachePolicy = .reloadIgnoringLocalAndRemoteCacheData
        configuration.urlCache = nil
        configuration.httpCookieStorage = nil
        configuration.httpShouldSetCookies = false
        configuration.urlCredentialStorage = nil
        configuration.waitsForConnectivity = false
        configuration.httpMaximumConnectionsPerHost = 1
        configuration.tlsMinimumSupportedProtocolVersion = .TLSv12
        switch route {
        case .direct:
            // No system proxy: an empty dictionary, not nil, which would
            // inherit the device's settings.
            configuration.connectionProxyDictionary = [:]
        case let .socks5(host, port, username, password):
            let proxyPort = NWEndpoint.Port(rawValue: UInt16(clamping: port)) ?? .any
            var proxy = ProxyConfiguration(
                socksv5Proxy: .hostPort(host: NWEndpoint.Host(host), port: proxyPort)
            )
            // Never around the proxy: a failover would dial the door's
            // tailnet address from the phone's own network.
            proxy.allowFailover = false
            if let username, let password {
                proxy.applyCredential(username: username, password: password)
            }
            configuration.proxyConfigurations = [proxy]
        }
        return configuration
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

    /// A URLSession error as a failure. Only the URL loading system's own codes
    /// are read; anything else is a connection that did not happen.
    static func failure(for error: Error) -> DoorFailure {
        let ns = error as NSError
        guard ns.domain == NSURLErrorDomain else { return .unreachable(code: ns.code) }
        switch ns.code {
        case NSURLErrorCancelled: return .cancelled
        case NSURLErrorTimedOut: return .timedOut
        case NSURLErrorDataLengthExceedsMaximum: return .tooLarge
        default: return .unreachable(code: ns.code)
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
        guard let key = SecCertificateCopyKey(certificate),
              let attributes = SecKeyCopyAttributes(key) as? [String: Any],
              attributes[kSecAttrKeyType as String] as? String == kSecAttrKeyTypeECSECPrimeRandom as String,
              attributes[kSecAttrKeySizeInBits as String] as? Int == 256,
              let point = SecKeyCopyExternalRepresentation(key, nil) as Data?,
              point.count == 65, point.first == 0x04 else { return nil }
        return Base64URL.encode(Data(SHA256.hash(data: SPKI.p256Header + point)))
    }

    /// Does the leaf of this trust carry the pinned key?
    static func matches(_ trust: SecTrust, pin: String) -> Bool {
        guard let chain = SecTrustCopyCertificateChain(trust) as? [SecCertificate],
              let leaf = chain.first,
              let found = of(leaf) else { return false }
        return found == pin
    }
}

// MARK: - The answer buffer

/// The cap, counted as the bytes arrive.
struct AnswerBuffer: Sendable {
    let cap: Int
    private(set) var data = Data()

    init(cap: Int) {
        self.cap = cap
    }

    /// False, and the buffer emptied, once the answer goes over the cap.
    mutating func append(_ chunk: Data) -> Bool {
        guard data.count + chunk.count <= cap else {
            data = Data()
            return false
        }
        data.append(chunk)
        return true
    }

    /// A declared length over the cap is refused before its first byte. An
    /// unknown length (-1) is counted as it arrives.
    static func admits(declaredLength: Int64, cap: Int) -> Bool {
        declaredLength <= Int64(cap)
    }
}

// MARK: - One exchange's delegate

/// The session delegate for one request: the pin, the cap and the answer.
/// URLSession calls it on its own serial queue; the lock is for `run`, which
/// is called from the caller's.
private final class DoorExchange: NSObject, URLSessionDataDelegate, @unchecked Sendable {
    private let pin: String
    private let lock = NSLock()
    private var buffer: AnswerBuffer
    private var status = 0
    private var pinRefused = false
    private var overCap = false
    private var continuation: CheckedContinuation<DoorReply, Error>?

    init(pin: String, cap: Int) {
        self.pin = pin
        self.buffer = AnswerBuffer(cap: cap)
    }

    func run(_ task: URLSessionDataTask) async throws -> DoorReply {
        try await withTaskCancellationHandler {
            try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<DoorReply, Error>) in
                lock.lock()
                self.continuation = continuation
                lock.unlock()
                task.resume()
            }
        } onCancel: {
            task.cancel()
        }
    }

    // The door's certificate. Session level, where URLSession sends the
    // server-trust challenge.
    func urlSession(
        _ session: URLSession,
        didReceive challenge: URLAuthenticationChallenge,
        completionHandler: @escaping @Sendable (URLSession.AuthChallengeDisposition, URLCredential?) -> Void
    ) {
        answer(challenge, completionHandler)
    }

    // Task level, so no challenge of any kind falls through to the default.
    func urlSession(
        _ session: URLSession,
        task: URLSessionTask,
        didReceive challenge: URLAuthenticationChallenge,
        completionHandler: @escaping @Sendable (URLSession.AuthChallengeDisposition, URLCredential?) -> Void
    ) {
        answer(challenge, completionHandler)
    }

    private func answer(
        _ challenge: URLAuthenticationChallenge,
        _ completionHandler: @escaping @Sendable (URLSession.AuthChallengeDisposition, URLCredential?) -> Void
    ) {
        guard challenge.protectionSpace.authenticationMethod == NSURLAuthenticationMethodServerTrust,
              let trust = challenge.protectionSpace.serverTrust else {
            // The door asks for nothing else. A client certificate or a
            // password prompt is not the door.
            completionHandler(.cancelAuthenticationChallenge, nil)
            return
        }
        if DoorPin.matches(trust, pin: pin) {
            completionHandler(.useCredential, URLCredential(trust: trust))
        } else {
            lock.lock()
            pinRefused = true
            lock.unlock()
            completionHandler(.cancelAuthenticationChallenge, nil)
        }
    }

    func urlSession(
        _ session: URLSession,
        dataTask: URLSessionDataTask,
        didReceive response: URLResponse,
        completionHandler: @escaping @Sendable (URLSession.ResponseDisposition) -> Void
    ) {
        lock.lock()
        status = (response as? HTTPURLResponse)?.statusCode ?? 0
        let admitted = AnswerBuffer.admits(declaredLength: response.expectedContentLength, cap: buffer.cap)
        if !admitted { overCap = true }
        lock.unlock()
        completionHandler(admitted ? .allow : .cancel)
    }

    func urlSession(_ session: URLSession, dataTask: URLSessionDataTask, didReceive data: Data) {
        lock.lock()
        let kept = buffer.append(data)
        if !kept { overCap = true }
        lock.unlock()
        if !kept { dataTask.cancel() }
    }

    // Never followed: the door does not redirect, so a redirect is not the door.
    func urlSession(
        _ session: URLSession,
        task: URLSessionTask,
        willPerformHTTPRedirection response: HTTPURLResponse,
        newRequest request: URLRequest,
        completionHandler: @escaping @Sendable (URLRequest?) -> Void
    ) {
        completionHandler(nil)
    }

    func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: Error?) {
        lock.lock()
        let waiting = continuation
        continuation = nil
        let result: Result<DoorReply, Error>
        if pinRefused {
            result = .failure(DoorFailure.wrongKey)
        } else if overCap {
            result = .failure(DoorFailure.tooLarge)
        } else if let error {
            result = .failure(DoorClient.failure(for: error))
        } else {
            result = .success(DoorReply(status: status, body: buffer.data))
        }
        lock.unlock()
        waiting?.resume(with: result)
    }
}
