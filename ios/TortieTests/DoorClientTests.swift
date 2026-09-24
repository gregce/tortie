import Foundation
import XCTest
@testable import Tortie

/// The one network user's rules, each held without a network: the URL it may
/// build, the cap, the statuses, the errors, the route and the configuration
/// it asks for (build/p316/SPEC.md section 4 S2 builder A). The pin is held
/// against the door's own certificates in `DoorVectorTests`; the live
/// exchange is `probe:p316`'s and the hostile door's.
///
/// Each test names the clause it holds and fails when that clause is taken
/// out of `ios/Tortie/Door/DoorClient.swift` or `Transport.swift`.
final class DoorClientTests: XCTestCase {
    private let door = DoorAddress(host: "100.101.102.103", port: 8823, pin: "p")

    // MARK: The URL

    /// Clause: https, and only https, to the door's address and port.
    func testEveryURLIsHTTPS() throws {
        let url = try XCTUnwrap(DoorClient.url(door, target: "/v1/blocked"))
        XCTAssertEqual(url.scheme, "https")
        XCTAssertEqual(url.absoluteString, "https://100.101.102.103:8823/v1/blocked")
        let session = try XCTUnwrap(DoorClient.url(door, target: DoorClient.sessionTarget("a b")))
        XCTAssertEqual(session.absoluteString, "https://100.101.102.103:8823/v1/session?id=a%20b")
    }

    /// Clause: the host is an IPv4 literal and nothing else, so no code can
    /// name a host, a user, a path or another scheme.
    func testOnlyAnIPv4LiteralIsAHost() {
        for host in [
            "100.64.0.1.example.com", "example.com", "evil.com/", "user@100.64.0.1", "100.64.0",
            "100.64.0.1:80", "0100.64.0.1", "100.064.0.1", "256.64.0.1", "100.64.0.-1", "", " 100.64.0.1", "::1",
            "[::1]", "100.64.0.1#", "１００.64.0.1"
        ] {
            XCTAssertFalse(DoorAddress.isIPv4Literal(host), host)
            XCTAssertNil(DoorClient.url(DoorAddress(host: host, port: 8823, pin: "p"), target: "/v1/blocked"), host)
        }
        for host in ["100.64.0.1", "127.0.0.1", "0.0.0.0", "255.255.255.255"] {
            XCTAssertTrue(DoorAddress.isIPv4Literal(host), host)
        }
    }

    /// Clause: a port in range and a target that is an absolute path with no
    /// fragment, space or control byte.
    func testPortAndTargetAreChecked() {
        for port in [0, -1, 65536] {
            XCTAssertNil(DoorClient.url(DoorAddress(host: "100.64.0.1", port: port, pin: "p"), target: "/"), "\(port)")
        }
        for target in ["v1/blocked", "//evil.com/x", "/v1/blocked#x", "/v1/ blocked", "/v1/\u{7f}", "/v1/\n"] {
            XCTAssertNil(DoorClient.url(door, target: target), target)
        }
    }

    /// Clause: a query value keeps only the unreserved set; every other byte
    /// is `%XX`, uppercase, so the door's URL parser reads the same bytes.
    func testQueryValuesKeepOnlyTheUnreservedSet() {
        XCTAssertEqual(DoorClient.queryValue("AZaz09-._~"), "AZaz09-._~")
        XCTAssertEqual(DoorClient.queryValue("a b&c=d/e?f#g%h+i"), "a%20b%26c%3Dd%2Fe%3Ff%23g%25h%2Bi")
        XCTAssertEqual(DoorClient.queryValue("’"), "%E2%80%99")
        XCTAssertEqual(DoorClient.turnsTarget("s", limit: 20, to: nil), "/v1/turns?id=s&limit=20")
        XCTAssertEqual(DoorClient.turnsTarget("s", limit: 0, to: 7), "/v1/turns?id=s&limit=1&to=7")
    }

    // MARK: The cap

    /// Clause: 2 MiB, counted as the bytes arrive; one byte over empties the
    /// buffer and refuses.
    func testTheCapIsTwoMebibytesCountedAsTheyArrive() {
        XCTAssertEqual(DoorLimits.standard.cap, 2 * 1024 * 1024)
        var buffer = AnswerBuffer(cap: 10)
        XCTAssertTrue(buffer.append(Data(count: 6)))
        XCTAssertTrue(buffer.append(Data(count: 4)))
        XCTAssertEqual(buffer.data.count, 10)
        XCTAssertFalse(buffer.append(Data(count: 1)))
        XCTAssertEqual(buffer.data.count, 0, "an answer over the cap is dropped whole")
    }

    /// Clause: a declared length over the cap is refused before its first
    /// byte; an unknown length is counted.
    func testADeclaredLengthOverTheCapIsRefused() {
        let cap = DoorLimits.answerCap
        XCTAssertTrue(AnswerBuffer.admits(declaredLength: -1, cap: cap))
        XCTAssertTrue(AnswerBuffer.admits(declaredLength: Int64(cap), cap: cap))
        XCTAssertFalse(AnswerBuffer.admits(declaredLength: Int64(cap) + 1, cap: cap))
        XCTAssertFalse(AnswerBuffer.admits(declaredLength: 10 * 1024 * 1024, cap: cap))
    }

    /// Clause: 15 seconds, for the idle wait and for the whole request.
    func testTheTimeoutIsFifteenSecondsBothWays() {
        let configuration = DoorClient.configuration(.direct, limits: .standard)
        XCTAssertEqual(DoorLimits.standard.timeout, 15)
        XCTAssertEqual(configuration.timeoutIntervalForRequest, 15)
        XCTAssertEqual(configuration.timeoutIntervalForResource, 15)
    }

    // MARK: Statuses and errors

    /// Clause: 200 decodes, 404 is the door's refusal, any other status is not
    /// the door, and a body that is not the shape is `malformed`.
    func testStatusesAreReadOneWay() {
        let ok = DoorReply(status: 200, body: Data(#"{"state":"pending"}"#.utf8))
        XCTAssertEqual(try? DoorClient.decode(PairAnswer.self, from: ok), .pending)
        XCTAssertThrowsError(try DoorClient.decode(PairAnswer.self, from: DoorReply(status: 404, body: Data()))) {
            XCTAssertEqual($0 as? DoorFailure, .refused)
        }
        XCTAssertThrowsError(try DoorClient.decode(PairAnswer.self, from: DoorReply(status: 302, body: Data()))) {
            XCTAssertEqual($0 as? DoorFailure, .unexpectedStatus(302))
        }
        XCTAssertThrowsError(try DoorClient.decode(PairAnswer.self, from: DoorReply(status: 200, body: Data("{".utf8)))) {
            XCTAssertEqual($0 as? DoorFailure, .malformed)
        }
    }

    /// Clause: the URL loading system's codes become cases; -1200 (a TLS or
    /// App Transport Security refusal) keeps its code for the ATS arm.
    func testErrorsBecomeCases() {
        let url = { (code: Int) in NSError(domain: NSURLErrorDomain, code: code) }
        XCTAssertEqual(DoorClient.failure(for: url(NSURLErrorCancelled)), .cancelled)
        XCTAssertEqual(DoorClient.failure(for: url(NSURLErrorTimedOut)), .timedOut)
        XCTAssertEqual(DoorClient.failure(for: url(NSURLErrorDataLengthExceedsMaximum)), .tooLarge)
        XCTAssertEqual(DoorClient.failure(for: url(-1200)), .unreachable(code: -1200))
        XCTAssertEqual(DoorClient.failure(for: url(NSURLErrorCannotConnectToHost)), .unreachable(code: -1004))
        XCTAssertEqual(DoorClient.failure(for: NSError(domain: "elsewhere", code: 7)), .unreachable(code: 7))
    }

    // MARK: Routes

    /// Clause: the direct route uses no system proxy, and a SOCKS route never
    /// fails over to a direct connection.
    func testRoutesAskForExactlyTheirProxy() {
        let direct = DoorClient.configuration(.direct, limits: .standard)
        XCTAssertEqual(direct.connectionProxyDictionary?.count, 0)
        XCTAssertTrue(direct.proxyConfigurations.isEmpty)
        let socks = DoorClient.configuration(
            .socks5(host: "127.0.0.1", port: 1080, username: nil, password: nil), limits: .standard
        )
        XCTAssertEqual(socks.proxyConfigurations.count, 1)
        XCTAssertEqual(socks.proxyConfigurations.first?.allowFailover, false)
        XCTAssertNil(direct.urlCache)
        XCTAssertNil(direct.httpCookieStorage)
        XCTAssertNil(direct.urlCredentialStorage)
    }

    #if DEBUG
    /// Clause (DEBUG seam): the direct transport dials this Mac's loopback and
    /// refuses every other host before a socket exists.
    func testTheDebugTransportDialsLoopbackOnly() async throws {
        let transport = DirectLoopbackTransport()
        let route = try await transport.route(to: "127.0.0.1")
        XCTAssertEqual(route, .direct)
        for host in ["100.64.0.1", "100.101.102.103", "192.168.1.2", "localhost"] {
            do {
                _ = try await transport.route(to: host)
                XCTFail("the DEBUG transport would dial \(host)")
            } catch {
                XCTAssertEqual(error as? DoorFailure, .notPaired)
            }
        }
        XCTAssertNotNil(DoorTransports.shipping)
    }

    /// Clause: a read against a door the transport cannot reach fails as
    /// `notPaired` before any socket; the client never dials it itself.
    func testTheClientAsksTheTransportFirst() async throws {
        let client = DoorClient(transport: DirectLoopbackTransport())
        do {
            _ = try await client.present(Data("{}".utf8), to: door)
            XCTFail("reached a tailnet address through the DEBUG transport")
        } catch {
            XCTAssertEqual(error as? DoorFailure, .notPaired)
        }
    }
    #else
    /// Clause (Phase 316.3): a Release build reaches the door through the
    /// tailnet node and nothing else.
    func testAReleaseBuildReachesTheDoorThroughTheNode() {
        XCTAssertTrue(DoorTransports.shipping is TailnetNode)
    }
    #endif
}
