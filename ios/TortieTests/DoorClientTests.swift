import Foundation
import Network
import XCTest
@testable import Tortie

/// The one network file's rules, each held without a network: the name it
/// may dial, the request it writes, the answer it will read, the caps, the
/// statuses, the errors and the routes (build/p330/SPEC.md sections 4.12.2 and
/// 4.12.3). The pin is held against the door's own certificates in
/// `DoorVectorTests`; a live exchange over mutual TLS is `P330TransportTests`'
/// (under `test:ios`) and the macOS harness's.
///
/// Each test names the clause it holds and fails when that clause is taken
/// out of `ios/Tortie/Door/DoorClient.swift` or `Transport.swift`.
final class DoorClientTests: XCTestCase {
    private let door = DoorEndpoint(name: "p330-mac.tail00000.ts.net", port: 8443, pin: "p")

    // MARK: The name

    /// Clause: the door is a lowercase name under `.ts.net`, 253 bytes at
    /// most, three labels at least, each `[a-z0-9-]{1,63}` not starting or
    /// ending with `-`. Never an address.
    func testOnlyAPublicNameIsADoor() {
        for name in [
            "p330-mac.tail00000.ts.net", "gregs-macbook-pro.tail2ddfe1.ts.net", "a.ts.net", "0.1.ts.net",
            String(repeating: "a", count: 63) + ".tail.ts.net"
        ] {
            XCTAssertTrue(DoorEndpoint.isPublicName(name), name)
        }
        for name in [
            "", "ts.net", ".ts.net", "mac.ts.net.", "Mac.tail.ts.net", "mac.tail.TS.NET", "mac.tail.ts.net.evil.com",
            "mac.tail.ts.network", "mac..ts.net", "-mac.tail.ts.net", "mac-.tail.ts.net", "mac_1.tail.ts.net",
            "mac tail.ts.net", "100.64.0.1", "127.0.0.1", "[::1]", "mac.tail.ts.net:8443", "user@mac.tail.ts.net",
            String(repeating: "a", count: 64) + ".tail.ts.net",
            String(repeating: "abcdefgh.", count: 31) + "ts.net", "mäc.tail.ts.net"
        ] {
            XCTAssertFalse(DoorEndpoint.isPublicName(name), name)
        }
    }

    /// Clause: the public port is 8443 or 10000, the ports Funnel publishes
    /// Tortie on; 443 is the person's own.
    func testOnlyAFunnelPortIsADoor() {
        XCTAssertEqual(DoorEndpoint.publicPorts, [8443, 10000])
        for port in [8443, 10000] {
            XCTAssertTrue(DoorEndpoint(name: door.name, port: port, pin: "p").isPublic, "\(port)")
        }
        for port in [443, 80, 8823, 0, -1, 65535, 65536] {
            XCTAssertFalse(DoorEndpoint(name: door.name, port: port, pin: "p").isPublic, "\(port)")
        }
    }

    // MARK: The request

    private func text(_ data: Data?) -> String? {
        data.map { String(decoding: $0, as: UTF8.self) }
    }

    /// Clause: one request, written by hand: the request line, `Host` as the
    /// door's name and public port, the signature's four headers as given,
    /// and `Connection: close`, which is why every connection carries one
    /// request.
    func testASignedReadIsWrittenByHand() {
        let request = DoorHTTP.request(
            method: "GET", target: "/v1/blocked", name: door.name, port: door.port,
            headers: [("x-tortie-phone", "abc"), ("x-tortie-nonce", "0123456789abcdef")], body: nil
        )
        XCTAssertEqual(
            text(request),
            "GET /v1/blocked HTTP/1.1\r\nHost: p330-mac.tail00000.ts.net:8443\r\nx-tortie-phone: abc\r\n" +
                "x-tortie-nonce: 0123456789abcdef\r\nConnection: close\r\n\r\n"
        )
    }

    /// Clause (Phase 337, D25): a kept line's request asks the door to keep
    /// the connection, and ONLY a kept line's; every other request still
    /// says `Connection: close`, which the one-shot test above holds.
    func testOnlyAKeptLinesRequestSaysKeepAlive() {
        let kept = DoorHTTP.request(
            method: "GET", target: "/v1/screen?id=s", name: door.name, port: door.port, headers: [], body: nil, keepAlive: true
        )
        XCTAssertEqual(text(kept), "GET /v1/screen?id=s HTTP/1.1\r\nHost: p330-mac.tail00000.ts.net:8443\r\nConnection: keep-alive\r\n\r\n")
        let once = DoorHTTP.request(method: "GET", target: "/v1/screen?id=s", name: door.name, port: door.port, headers: [], body: nil)
        XCTAssertEqual(text(once), "GET /v1/screen?id=s HTTP/1.1\r\nHost: p330-mac.tail00000.ts.net:8443\r\nConnection: close\r\n\r\n")
        XCTAssertFalse(DoorLine.once().keeps)
        XCTAssertTrue(DoorLine(keeps: true).keeps)
        XCTAssertLessThanOrEqual(DoorLine.freshFor, 4)
    }

    /// Clause (Phase 337, §Attack A12): the reader says when an answer said
    /// `Connection: close`, in any case and in a list, which closes a kept
    /// line; and a byte past the declared length is refused, so a stray is
    /// never read as the next answer.
    func testTheReaderSaysWhenTheDoorSaysClose() throws {
        for header in ["Connection: close", "connection: Close", "Connection: keep-alive, close"] {
            var reader = DoorResponseReader(cap: DoorLimits.answerCap)
            try reader.feed(answer("HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: 19\r\n\(header)", json))
            XCTAssertTrue(reader.closes, header)
            XCTAssertTrue(reader.isComplete)
        }
        var kept = DoorResponseReader(cap: DoorLimits.answerCap)
        try kept.feed(answer("HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: 19\r\nConnection: keep-alive", json))
        XCTAssertFalse(kept.closes)
        var stray = DoorResponseReader(cap: DoorLimits.answerCap)
        XCTAssertThrowsError(try stray.feed(answer("HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: 19", json + "HTTP/1.1 200 OK"))) {
            XCTAssertEqual($0 as? DoorFailure, .malformed)
        }
    }

    /// Clause (Phase 337, conformance:ios rule ah): the Screen's read names
    /// the session and the revision held, and NOTHING ELSE: never a size.
    func testTheScreenTargetIsTheSessionAndTheRevisionAlone() {
        XCTAssertEqual(DoorClient.screenTarget("s", since: nil), "/v1/screen?id=s")
        XCTAssertEqual(DoorClient.screenTarget("a b", since: "0123456789ab"), "/v1/screen?id=a%20b&since=0123456789ab")
        for word in ["cols", "rows", "width", "height", "size", "resize"] {
            XCTAssertFalse(DoorClient.screenTarget("s", since: "0123456789ab").contains(word), word)
        }
        XCTAssertEqual(DoorClient.keysTarget, "/v1/keys")
        XCTAssertEqual(WriteRoute.keys(session: "s", keys: [], turn: "t", dialog: nil).verb, .keys)
    }

    /// Clause (Phase 337, D17, rule ah): a keys body is exactly
    /// `dialog, keys, session, turn, write`, sorted, `dialog` written as
    /// null when the picture had none, and no size anywhere.
    func testAKeysBodyIsItsFiveKeys() throws {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.sortedKeys]
        let id = "0123456789abcdef0123456789abcdef"
        let body = KeysBody(dialog: nil, keys: [.text("ls"), .key(.backspace)], session: "s", turn: "0123456789abcdef-1", write: id)
        XCTAssertEqual(
            String(decoding: try encoder.encode(body), as: UTF8.self),
            #"{"dialog":null,"keys":[{"t":"ls"},{"k":"BSpace"}],"session":"s","turn":"0123456789abcdef-1","write":"0123456789abcdef0123456789abcdef"}"#
        )
        let asking = KeysBody(dialog: "a1b2c3d4e5f6", keys: [.key(.enter)], session: "s", turn: "0123456789abcdef-1", write: id)
        let fields = try XCTUnwrap(try JSONSerialization.jsonObject(with: try encoder.encode(asking)) as? [String: Any])
        XCTAssertEqual(fields.keys.sorted(), ["dialog", "keys", "session", "turn", "write"])
        XCTAssertEqual(fields["dialog"] as? String, "a1b2c3d4e5f6")
    }

    /// Clause: `/pair`'s body is JSON with its length, and nothing streams.
    func testAPresentationCarriesItsLength() {
        let body = Data(#"{"ct":"x"}"#.utf8)
        let request = DoorHTTP.request(method: "POST", target: "/pair", name: door.name, port: 10000, headers: [], body: body)
        XCTAssertEqual(
            text(request),
            "POST /pair HTTP/1.1\r\nHost: p330-mac.tail00000.ts.net:10000\r\nContent-Type: application/json\r\n" +
                "Content-Length: 10\r\nConnection: close\r\n\r\n{\"ct\":\"x\"}"
        )
    }

    /// Clause: nothing that could become a second line or a second request is
    /// ever written: a target with a space, a line break or a fragment, a
    /// header name or value with one, a method that is not a token.
    func testNothingIsWrittenThatIsNotOneLine() {
        for target in ["v1/blocked", "//evil.com/x", "/v1/blocked#x", "/v1/ blocked", "/v1/\u{7f}", "/v1/\n", "/v1/\r\nX: y"] {
            XCTAssertNil(DoorHTTP.request(method: "GET", target: target, name: door.name, port: 8443, headers: [], body: nil), target)
        }
        for header in [("x-tortie-phone", "a\r\nX: y"), ("x tortie", "a"), ("x-tortie-phone", ""), ("x-tortie:phone", "a")] {
            XCTAssertNil(DoorHTTP.request(method: "GET", target: "/v1/blocked", name: door.name, port: 8443, headers: [header], body: nil), header.0)
        }
        XCTAssertNil(DoorHTTP.request(method: "GE T", target: "/v1/blocked", name: door.name, port: 8443, headers: [], body: nil))
        XCTAssertNil(DoorHTTP.request(method: "GET", target: "/v1/blocked", name: "a b", port: 8443, headers: [], body: nil))
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

    // MARK: The answer, read by hand

    private func answer(_ head: String, _ body: String = "") -> Data {
        Data((head + "\r\n\r\n" + body).utf8)
    }

    private func read(_ chunks: [Data], cap: Int = DoorLimits.answerCap) -> Result<DoorReply, DoorFailure> {
        var reader = DoorResponseReader(cap: cap)
        do {
            for chunk in chunks {
                try reader.feed(chunk)
            }
            return .success(try reader.finish())
        } catch let failure as DoorFailure {
            return .failure(failure)
        } catch {
            return .failure(.malformed)
        }
    }

    private func read(_ data: Data, cap: Int = DoorLimits.answerCap) -> Result<DoorReply, DoorFailure> {
        read([data], cap: cap)
    }

    private let json = #"{"state":"pending"}"#
    private var honest: Data {
        answer("HTTP/1.1 200 OK\r\nContent-Type: application/json; charset=utf-8\r\nContent-Length: 19\r\nConnection: close", json)
    }

    /// Clause: the door's answer reads whole: a 200 with its JSON and its
    /// length, and a 404 with a length of 0 and no body.
    func testTheDoorsAnswersRead() {
        XCTAssertEqual(read(honest), .success(DoorReply(status: 200, body: Data(json.utf8))))
        XCTAssertEqual(read(answer("HTTP/1.1 404 Not Found\r\nContent-Length: 0")), .success(DoorReply(status: 404, body: Data())))
        XCTAssertEqual(
            read(answer("HTTP/1.1 200 OK\r\ncontent-type: APPLICATION/JSON\r\ncontent-length: 19", json)),
            .success(DoorReply(status: 200, body: Data(json.utf8))),
            "header names and the media type are read in any case"
        )
    }

    /// Clause: the same answer read one byte at a time is the same answer, and
    /// one whose head and body arrive together is too.
    func testAnAnswerReadsTheSameInAnyPieces() {
        XCTAssertEqual(read(honest.map { Data([$0]) }), .success(DoorReply(status: 200, body: Data(json.utf8))))
        var reader = DoorResponseReader(cap: DoorLimits.answerCap)
        XCTAssertNoThrow(try reader.feed(honest))
        XCTAssertTrue(reader.isComplete, "an answer is complete at its length, before the close")
    }

    /// Clause: `Content-Length` is required, once, digits only, and any
    /// `Transfer-Encoding` is not the door (the hostile door's arms `chunked`,
    /// `no-length` and `two-lengths`).
    func testTheLengthIsRequiredAndNothingStreams() {
        let chunked = answer("HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nTransfer-Encoding: chunked", "13\r\n" + json + "\r\n0\r\n\r\n")
        XCTAssertEqual(read(chunked), .failure(.malformed))
        XCTAssertEqual(read(answer("HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: 19\r\nTransfer-Encoding: identity", json)), .failure(.malformed))
        XCTAssertEqual(read(answer("HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nConnection: close", json)), .failure(.malformed))
        XCTAssertEqual(read(answer("HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: 19\r\nContent-Length: 19", json)), .failure(.malformed))
        for length in ["+19", "19.0", "0x13", " ", "-1", "１９", "99999999999999999"] {
            XCTAssertEqual(read(answer("HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: \(length)", json)), .failure(.malformed), length)
        }
    }

    /// Clause: 2 MiB, decided from the declared length before a byte of the
    /// body is taken (the arm `over-cap`).
    func testALengthOverTheCapIsRefusedFirst() {
        XCTAssertEqual(DoorLimits.standard.cap, 2 * 1024 * 1024)
        XCTAssertEqual(read(answer("HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: 3145728")), .failure(.tooLarge))
        XCTAssertEqual(read(answer("HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: 11"), cap: 10), .failure(.tooLarge))
        XCTAssertEqual(read(answer("HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: 10", "0123456789"), cap: 10), .success(DoorReply(status: 200, body: Data("0123456789".utf8))))
    }

    /// Clause: the head is at most 16 KiB and 64 lines (the arm
    /// `huge-header`), and it is plain ASCII with no folding and no lone line
    /// break.
    func testTheHeadIsBounded() {
        XCTAssertEqual(DoorHTTP.headCap, 16 * 1024)
        XCTAssertEqual(DoorHTTP.headLineCap, 64)
        let padding = String(repeating: "a", count: 20 * 1024)
        XCTAssertEqual(read(answer("HTTP/1.1 200 OK\r\nX-Padding: \(padding)\r\nContent-Type: application/json\r\nContent-Length: 19", json)), .failure(.malformed))
        XCTAssertEqual(read(Data(("HTTP/1.1 200 OK\r\nX-Padding: " + padding).utf8)), .failure(.malformed), "a head that never ends is refused at its cap")
        let many = (1...64).map { "X-\($0): a" }.joined(separator: "\r\n")
        XCTAssertEqual(read(answer("HTTP/1.1 404 Not Found\r\n\(many)\r\nContent-Length: 0")), .failure(.malformed))
        let sixtyFour = (1...63).map { "X-\($0): a" }.joined(separator: "\r\n")
        XCTAssertEqual(read(answer("HTTP/1.1 404 Not Found\r\n\(sixtyFour)\r\nContent-Length: 0")), .success(DoorReply(status: 404, body: Data())))
        XCTAssertEqual(read(answer("HTTP/1.1 404 Not Found\r\n Content-Length: 0")), .failure(.malformed), "a folded line")
        XCTAssertEqual(read(answer("HTTP/1.1 404 Not Found\r\nX: a\nContent-Length: 0")), .failure(.malformed), "a lone line feed")
        XCTAssertEqual(read(answer("HTTP/1.1 404 Not Found\r\nX: \u{1}\r\nContent-Length: 0")), .failure(.malformed), "a control byte")
        XCTAssertEqual(read(answer("HTTP/1.1 404 Not Found\r\n: a\r\nContent-Length: 0")), .failure(.malformed), "an empty name")
    }

    /// Clause: the status line is exactly `HTTP/1.1` and three digits (the
    /// arm `not-http11`); a status the door never sends is not the door.
    func testTheStatusLineIsTheDoors() {
        for line in ["HTTP/1.0 200 OK", "HTTP/2 200", "http/1.1 200 OK", "HTTP/1.1 20 OK", "HTTP/1.1 2000 OK", "HTTP/1.1  200 OK", "HTTP/1.1 200OK", "ICY 200 OK"] {
            XCTAssertEqual(read(answer("\(line)\r\nContent-Type: application/json\r\nContent-Length: 19", json)), .failure(.malformed), line)
        }
        XCTAssertEqual(read(answer("HTTP/1.1 200\r\nContent-Type: application/json\r\nContent-Length: 19", json)), .success(DoorReply(status: 200, body: Data(json.utf8))), "a status with no reason")
        XCTAssertEqual(read(answer("HTTP/1.1 302 Found\r\nLocation: https://example.com/\r\nContent-Length: 0")), .failure(.unexpectedStatus(302)))
        XCTAssertEqual(read(answer("HTTP/1.1 500 Internal Server Error\r\nContent-Length: 0")), .failure(.unexpectedStatus(500)))
    }

    /// Clause: a 200 carries JSON and says so (the arm `not-json`).
    func testA200IsJSON() {
        XCTAssertEqual(read(answer("HTTP/1.1 200 OK\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Length: 19", json)), .failure(.malformed))
        XCTAssertEqual(read(answer("HTTP/1.1 200 OK\r\nContent-Length: 19", json)), .failure(.malformed))
        XCTAssertEqual(read(answer("HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Type: application/json\r\nContent-Length: 19", json)), .failure(.malformed))
    }

    /// Clause: exactly the declared bytes. Fewer and then the close is not the
    /// door (the arm `early-close`), and neither is more.
    func testExactlyTheDeclaredBytes() {
        let short = answer("HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: 38", json)
        XCTAssertEqual(read(short), .failure(.malformed))
        let long = answer("HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: 5", json)
        XCTAssertEqual(read(long), .failure(.malformed))
        // Refused the moment the bytes pass the length, not at the close, so a
        // door that keeps sending costs the phone nothing past what it declared.
        var reader = DoorResponseReader(cap: DoorLimits.answerCap)
        XCTAssertThrowsError(try reader.feed(long)) { XCTAssertEqual($0 as? DoorFailure, .malformed) }
        XCTAssertEqual(read(Data("HTTP/1.1 200 OK\r\nContent-".utf8)), .failure(.malformed), "a head cut short")
    }

    /// Clause: a connection that closes before a byte of an answer is its own
    /// failure, the one the door's refusal of a client key looks like.
    func testNothingAtAllIsClosedBeforeAnswer() {
        XCTAssertEqual(read([]), .failure(.closedBeforeAnswer))
        XCTAssertEqual(read([Data()]), .failure(.closedBeforeAnswer))
    }

    // MARK: Statuses and errors

    /// Clause: 200 decodes, 404 is the door's refusal, any other status is not
    /// the door, and a body that is not the shape is `malformed`.
    func testStatusesAreReadOneWay() {
        let ok = DoorReply(status: 200, body: Data(#"{"state":"pending"}"#.utf8))
        XCTAssertEqual(try? DoorClient.decode(PairAnswer.self, from: ok), .pending(macSends: false))
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

    /// Clause: a connection's errors become cases. A name that does not
    /// resolve is `nameNotFound`; a leaf the verify block refused is
    /// `wrongKey` whatever TLS then said; a connection the door ended after the
    /// handshake with nothing sent is `closedBeforeAnswer`, and before the
    /// handshake it is unreachable.
    func testConnectionErrorsBecomeCases() {
        let dns = NWError.dns(-65554) // kDNSServiceErr_NoSuchRecord
        XCTAssertEqual(DoorClient.failure(for: dns, ready: false, pinRefused: false, answered: false), .nameNotFound)
        XCTAssertEqual(DoorClient.failure(for: .tls(-9808), ready: false, pinRefused: true, answered: false), .wrongKey)
        XCTAssertEqual(DoorClient.failure(for: .tls(-9808), ready: false, pinRefused: false, answered: false), .unreachable(code: -9808))
        XCTAssertEqual(DoorClient.failure(for: .posix(.ECONNRESET), ready: true, pinRefused: false, answered: false), .closedBeforeAnswer)
        XCTAssertEqual(DoorClient.failure(for: .posix(.EPIPE), ready: true, pinRefused: false, answered: false), .closedBeforeAnswer)
        XCTAssertEqual(DoorClient.failure(for: .posix(.ECONNRESET), ready: true, pinRefused: false, answered: true), .unreachable(code: Int(POSIXErrorCode.ECONNRESET.rawValue)))
        XCTAssertEqual(DoorClient.failure(for: .posix(.ECONNREFUSED), ready: false, pinRefused: false, answered: false), .unreachable(code: Int(POSIXErrorCode.ECONNREFUSED.rawValue)))
        XCTAssertEqual(DoorClient.failure(for: .posix(.ECONNRESET), ready: false, pinRefused: false, answered: false), .unreachable(code: Int(POSIXErrorCode.ECONNRESET.rawValue)))
    }

    /// Clause: 15 seconds for the whole exchange.
    func testTheTimeoutIsFifteenSeconds() {
        XCTAssertEqual(DoorLimits.standard.timeout, 15)
    }

    // MARK: Routes

    /// Clause: a Release build dials the door's own NAME and public port, and
    /// nothing that is not one.
    func testTheShippingRouteIsTheName() throws {
        let transport = NameTransport()
        XCTAssertEqual(try transport.route(to: door), DoorRoute(host: door.name, port: 8443))
        for bad in [DoorEndpoint(name: "100.64.0.1", port: 8443, pin: "p"), DoorEndpoint(name: door.name, port: 8823, pin: "p")] {
            XCTAssertThrowsError(try transport.route(to: bad)) { XCTAssertEqual($0 as? DoorFailure, .notPaired) }
        }
    }

    /// Clause: a read against a door the transport will not dial fails as
    /// `notPaired` before any connection exists.
    func testTheClientAsksTheTransportFirst() async throws {
        let client = DoorClient(transport: NameTransport())
        do {
            _ = try await client.present(Data("{}".utf8), to: DoorEndpoint(name: "127.0.0.1", port: 8443, pin: "p"))
            XCTFail("dialled an address")
        } catch {
            XCTAssertEqual(error as? DoorFailure, .notPaired)
        }
    }

    #if DEBUG
    /// Clause (DEBUG seam): `-TortieDebugDoorEndpoint 127.0.0.1:<port>` and
    /// nothing else; the connection goes to that loopback port while the
    /// door's name stays its name.
    func testTheDebugEndpointTakesThisMacsLoopbackOnly() throws {
        XCTAssertEqual(DoorEndpointDebugSeam.loopbackPort(["app", "-TortieDebugDoorEndpoint", "127.0.0.1:52001"]), 52001)
        for value in ["127.0.0.2:52001", "localhost:52001", "0.0.0.0:52001", "192.168.1.2:52001", "127.0.0.1", "127.0.0.1:0",
                      "127.0.0.1:65536", "127.0.0.1:+80", "127.0.0.1:80:1", "[::1]:80", ":80", "127.0.0.1:"] {
            XCTAssertNil(DoorEndpointDebugSeam.loopbackPort(["app", "-TortieDebugDoorEndpoint", value]), value)
        }
        XCTAssertNil(DoorEndpointDebugSeam.loopbackPort(["app", "-TortieDebugDoorEndpoint"]))
        XCTAssertNil(DoorEndpointDebugSeam.loopbackPort(["app"]))
        let transport = DebugEndpointTransport(port: 52001)
        XCTAssertEqual(try transport.route(to: door), DoorRoute(host: "127.0.0.1", port: 52001))
        XCTAssertThrowsError(try transport.route(to: DoorEndpoint(name: "evil.example.com", port: 8443, pin: "p")))
    }
    #else
    /// Clause: a Release build dials the name and nothing else.
    func testAReleaseBuildDialsTheName() {
        XCTAssertTrue(DoorTransports.shipping is NameTransport)
    }
    #endif
}
