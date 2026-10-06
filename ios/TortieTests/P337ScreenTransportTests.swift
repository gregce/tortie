import Foundation
import XCTest
@testable import Tortie

#if os(iOS)
/// THE SCREEN'S KEPT LINES, OVER THE WIRE (Phase 337, build/p337/SPEC.md D25,
/// section 6.4, §Attack A12): the SHIPPING `DoorClient` and `DoorLine` keep a
/// connection for the Screen's poll and its keys, reuse it only while it is
/// fresh, close it themselves at 4 s, on `Connection: close` and on a byte
/// nobody asked for, ask a READ once more on a new line when a reused one
/// ended before an answer, and never send a WRITE again.
///
/// `npm run test:ios` stands up the doors on this Mac's loopback
/// (build/p316/test-ios.mjs) and hands their facts to this test through the
/// runner's environment:
///
///   P330_DOOR_NAME, P330_DOOR_PORT, P330_DOOR_PIN
///       door A, which issues a client certificate (`POST /p330/issue`).
///   P337_SCREEN_PORT
///       a door under door A's key and rules that KEEPS connections alive
///       (`keepAliveTimeout` 5 s) and answers `GET /v1/screen` and
///       `POST /v1/keys`, verified with build/p316/node-phone.mjs
///       `verifySigned` as the VECTORS' phone, `Connection: keep-alive`. By
///       the session the request names (a read's `id`, a write's `session`):
///       `p337-close-on-next` is answered, and the NEXT request on that same
///       connection is read, counted and its connection ended with no
///       answer; `p337-stray` is answered and, 50 ms later, a second answer
///       nobody asked for is written on the same connection;
///       `p337-says-close` is answered with `Connection: close`. A keys write
///       is answered `done` with its own id echoed under the verb `keys`.
///       `GET /p337/counts` answers `handshakes`, `phoneCloses` (connections
///       the phone ended first), `screenReads` and `keysPosts`, every request
///       read counted, the counts request's own handshake included.
///
/// With none named it skips: on its own it has no door to dial. Every row
/// prints one `P337_TRANSPORT|<row>|<what it read>` line for the runner.
final class P337ScreenTransportTests: XCTestCase {
    private struct Doors {
        let name: String
        let issuePort: Int
        let screenPort: Int
        let pin: String
    }

    private struct Counts: Decodable {
        let handshakes: Int
        let phoneCloses: Int
        let screenReads: Int
        let keysPosts: Int
    }

    private let keys = KeychainClientKeys()

    override func tearDown() {
        for tag in keys.tags() { keys.delete(tag: tag) }
    }

    private func doors() throws -> Doors {
        let env = ProcessInfo.processInfo.environment
        guard let name = env["P330_DOOR_NAME"], let issue = Int(env["P330_DOOR_PORT"] ?? ""),
              let pin = env["P330_DOOR_PIN"], let screen = Int(env["P337_SCREEN_PORT"] ?? "") else {
            throw XCTSkip("test:ios stands up the doors this test dials; on its own it has none.")
        }
        return Doors(name: name, issuePort: issue, screenPort: screen, pin: pin)
    }

    private func client(_ port: Int) throws -> DoorClient {
        #if DEBUG
        let parsed = try XCTUnwrap(DoorEndpointDebugSeam.loopbackPort(["app", "-TortieDebugDoorEndpoint", "127.0.0.1:\(port)"]))
        return DoorClient(transport: DebugEndpointTransport(port: parsed))
        #else
        return DoorClient(transport: P337LoopbackTransport(port: port))
        #endif
    }

    /// A pairing the doors verify: the vectors' phone keys, a client key made
    /// in the Simulator's Keychain, and the certificate door A issued over it.
    private func paired(_ d: Doors) async throws -> PairedDoor {
        let v = try DoorVectorFile.load()
        let phone = try PhoneKeys(
            signingSeed: try XCTUnwrap(Hex.decode(v.keys.phoneSigningSeed)),
            exchangeSeed: try XCTUnwrap(Hex.decode(v.keys.phoneExchangeSeed))
        )
        let endpoint = DoorEndpoint(name: d.name, port: 8443, pin: d.pin)
        let key = try keys.mint()
        let issue = try await client(d.issuePort).exchange(
            method: "POST", target: "/p330/issue", headers: [], body: Data(#"{"ck":"\#(key.spki)"}"#.utf8), door: endpoint, identity: nil
        )
        XCTAssertEqual(issue.status, 200)
        let issued = try XCTUnwrap(try JSONSerialization.jsonObject(with: issue.body) as? [String: String])
        let certificate = try XCTUnwrap(Base64URL.decode(try XCTUnwrap(issued["cert"])))
        return try XCTUnwrap(PairedDoor(
            endpoint: endpoint, macSigningKey: v.keys.macSigningKey, macExchangeKey: v.keys.macExchangeKey,
            label: "p337-transport", pairedAt: 1_759_190_400_000, keys: phone, clientKey: key,
            certificate: certificate, identity: try keys.adopt(certificate, for: key),
            alerts: AlertsKept(macSends: false, presented: nil)
        ))
    }

    /// The screen door's counts, read on a connection of their own.
    private func counts(_ d: Doors, _ pairing: PairedDoor) async throws -> Counts {
        let reply = try await client(d.screenPort).exchange(
            method: "GET", target: "/p337/counts", headers: [], body: nil, door: pairing.endpoint, identity: pairing.identity
        )
        XCTAssertEqual(reply.status, 200)
        return try JSONDecoder().decode(Counts.self, from: reply.body)
    }

    /// Row 1: two reads on one kept line are ONE handshake.
    func testTwoReadsOnOneLineAreOneHandshake() async throws {
        let d = try doors()
        let pairing = try await paired(d)
        let shipping = try client(d.screenPort)
        let line = DoorLine(keeps: true)
        let before = try await counts(d, pairing)
        let first = try await shipping.screen("p337-session", since: nil, line: line, door: pairing)
        let second = try await shipping.screen("p337-session", since: first.revision, line: line, door: pairing)
        let after = try await counts(d, pairing)
        line.close()
        XCTAssertEqual(second.sessionId, "p337-session")
        XCTAssertEqual(after.screenReads - before.screenReads, 2)
        XCTAssertEqual(after.handshakes - before.handshakes - 1, 1, "two reads opened more than one connection")
        print("P337_TRANSPORT|one-line|\(after.handshakes - before.handshakes - 1)")
    }

    /// Row 2: a line idle 4.5 s is not reused, and the PHONE closed it at 4 s,
    /// before the door's own 5 s.
    func testAnIdleLineIsClosedByThePhoneAndNotReused() async throws {
        let d = try doors()
        let pairing = try await paired(d)
        let shipping = try client(d.screenPort)
        let line = DoorLine(keeps: true)
        _ = try await shipping.screen("p337-session", since: nil, line: line, door: pairing)
        let before = try await counts(d, pairing)
        try await Task.sleep(nanoseconds: 4_500_000_000)
        let idle = try await counts(d, pairing)
        _ = try await shipping.screen("p337-session", since: nil, line: line, door: pairing)
        let after = try await counts(d, pairing)
        line.close()
        XCTAssertEqual(idle.phoneCloses - before.phoneCloses, 1, "the phone did not close its idle line before the door's 5 s")
        XCTAssertEqual(after.handshakes - idle.handshakes - 1, 1, "a line idle past 4 s was reused")
        print("P337_TRANSPORT|idle|\(idle.phoneCloses - before.phoneCloses)")
    }

    /// Row 3: a read on a kept line the door ends at that read is asked once
    /// more, freshly signed, on a new line, and answered.
    func testAReadOnALineTheDoorClosedIsAskedOnceMore() async throws {
        let d = try doors()
        let pairing = try await paired(d)
        let shipping = try client(d.screenPort)
        let line = DoorLine(keeps: true)
        let before = try await counts(d, pairing)
        _ = try await shipping.screen("p337-close-on-next", since: nil, line: line, door: pairing)
        let read = try await shipping.screen("p337-session", since: nil, line: line, door: pairing)
        let after = try await counts(d, pairing)
        line.close()
        XCTAssertEqual(read.sessionId, "p337-session")
        XCTAssertEqual(after.screenReads - before.screenReads, 3, "the first read, the one the door ended, and the one asked once more")
        XCTAssertEqual(after.handshakes - before.handshakes - 1, 2, "the read was not asked on a new line")
        print("P337_TRANSPORT|closed-read|\(after.screenReads - before.screenReads)")
    }

    /// Row 4: a keys write on a kept line the door ends at that write is NOT
    /// sent again: its POST counted once, and the phone says no answer.
    func testAKeysWriteIsNeverRetried() async throws {
        let d = try doors()
        let pairing = try await paired(d)
        let shipping = try client(d.screenPort)
        let line = DoorLine(keeps: true)
        let before = try await counts(d, pairing)
        let first = await shipping.keys("p337-close-on-next", keys: [.text("a")], turn: "0123456789abcdef-1", dialog: nil, line: line, door: pairing)
        guard case .answered(let answer) = first else { return XCTFail("\(first)") }
        XCTAssertEqual(answer.verb, .keys)
        let second = await shipping.keys("p337-close-on-next", keys: [.key(.enter)], turn: "0123456789abcdef-1", dialog: nil, line: line, door: pairing)
        let after = try await counts(d, pairing)
        line.close()
        XCTAssertEqual(after.keysPosts - before.keysPosts, 2, "the write the door ended was sent again")
        XCTAssertEqual(second, .noAnswer, "a write whose bytes were handed and not answered")
        print("P337_TRANSPORT|keys-once|\(second)")
    }

    /// Row 5: an answer followed by bytes nobody asked for: the phone closes
    /// that line, never reads the stray as an answer, and the next read opens
    /// a NEW line and is answered.
    func testAStrayAnswerClosesTheLine() async throws {
        let d = try doors()
        let pairing = try await paired(d)
        let shipping = try client(d.screenPort)
        let line = DoorLine(keeps: true)
        _ = try? await shipping.screen("p337-stray", since: nil, line: line, door: pairing)
        try await Task.sleep(nanoseconds: 300_000_000)
        let before = try await counts(d, pairing)
        let read = try await shipping.screen("p337-session", since: nil, line: line, door: pairing)
        let after = try await counts(d, pairing)
        line.close()
        XCTAssertEqual(read.sessionId, "p337-session")
        XCTAssertEqual(after.handshakes - before.handshakes - 1, 1, "the line that read a stray was reused")
        print("P337_TRANSPORT|stray|\(after.handshakes - before.handshakes - 1)")
    }

    /// Row 6: an answer saying `Connection: close` ends the line, and the
    /// next read opens a new one.
    func testConnectionCloseEndsTheLine() async throws {
        let d = try doors()
        let pairing = try await paired(d)
        let shipping = try client(d.screenPort)
        let line = DoorLine(keeps: true)
        _ = try await shipping.screen("p337-says-close", since: nil, line: line, door: pairing)
        let before = try await counts(d, pairing)
        _ = try await shipping.screen("p337-session", since: nil, line: line, door: pairing)
        let after = try await counts(d, pairing)
        line.close()
        XCTAssertEqual(after.handshakes - before.handshakes - 1, 1, "a line the door said close was reused")
        print("P337_TRANSPORT|says-close|\(after.handshakes - before.handshakes - 1)")
    }
}

#if !DEBUG
/// A Release build has no seam, so the test maps the door to this Mac's
/// loopback itself, keeping the door's name as the TLS name and the `Host`.
private struct P337LoopbackTransport: DoorTransport {
    let port: Int

    func route(to door: DoorEndpoint) throws -> DoorRoute {
        guard door.isPublic else { throw DoorFailure.notPaired }
        return DoorRoute(host: "127.0.0.1", port: port)
    }
}
#endif
#endif
