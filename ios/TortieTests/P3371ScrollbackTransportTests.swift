import Foundation
import XCTest
@testable import Tortie

#if os(iOS)
/// THE TERMINAL'S SIDE LINE, OVER THE WIRE (Phase 337.1, build/p3371/SPEC.md
/// D30 and section 6.4): the SHIPPING `DoorClient` and `DoorLine` carry pages
/// of history on a kept line of their own: two pages on one kept line are one
/// handshake; a page on a kept line the door ended is asked once more, on a
/// new line, and answered; a page and the poll asked at once ride two lines;
/// and a page and a status re-read asked at once through the SHIPPING
/// `PairedScreenDoor` go one after the other on its side line, never two
/// connections.
///
/// `npm run test:ios` stands up the doors on this Mac's loopback
/// (build/p316/test-ios.mjs) and hands their facts to this test through the
/// runner's environment, as `P337ScreenTransportTests` reads them:
///
///   P330_DOOR_NAME, P330_DOOR_PORT, P330_DOOR_PIN
///       door A, which issues a client certificate (`POST /p330/issue`).
///   P3371_SCROLLBACK_PORT, or else P337_SCREEN_PORT
///       the keep-alive door that answers `GET /v1/screen` and, since Phase
///       337.1, `GET /v1/scrollback` over a numbered history, verified as the
///       VECTORS' phone, with the same session words as 337's rows
///       (`p337-close-on-next`: answered, and the NEXT request on that
///       connection read, counted and ended with no answer), and
///       `GET /p337/counts` answering at least `handshakes`.
///
/// With none named it skips: on its own it has no door to dial. Every row
/// prints one `P3371_TRANSPORT|<row>|<what it read>` line for the runner.
final class P3371ScrollbackTransportTests: XCTestCase {
    private struct Doors {
        let name: String
        let issuePort: Int
        let port: Int
        let pin: String
    }

    /// The door's counts: every request it read and every handshake, the
    /// counts request's own included. A count this build of the door does
    /// not keep reads nil.
    private struct Counts: Decodable {
        let handshakes: Int
        let screenReads: Int?
        let scrollbackReads: Int?
    }

    private let keys = KeychainClientKeys()

    override func tearDown() {
        for tag in keys.tags() { keys.delete(tag: tag) }
    }

    private func doors() throws -> Doors {
        let env = ProcessInfo.processInfo.environment
        let port = Int(env["P3371_SCROLLBACK_PORT"] ?? "") ?? Int(env["P337_SCREEN_PORT"] ?? "")
        guard let name = env["P330_DOOR_NAME"], let issue = Int(env["P330_DOOR_PORT"] ?? ""),
              let pin = env["P330_DOOR_PIN"], let port else {
            throw XCTSkip("test:ios stands up the doors this test dials; on its own it has none.")
        }
        return Doors(name: name, issuePort: issue, port: port, pin: pin)
    }

    private func client(_ port: Int) throws -> DoorClient {
        #if DEBUG
        let parsed = try XCTUnwrap(DoorEndpointDebugSeam.loopbackPort(["app", "-TortieDebugDoorEndpoint", "127.0.0.1:\(port)"]))
        return DoorClient(transport: DebugEndpointTransport(port: parsed))
        #else
        return DoorClient(transport: P3371LoopbackTransport(port: port))
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
            label: "p3371-transport", pairedAt: 1_759_190_400_000, keys: phone, clientKey: key,
            certificate: certificate, identity: try keys.adopt(certificate, for: key),
            alerts: AlertsKept(macSends: false, presented: nil)
        ))
    }

    /// The door's counts, read on a connection of their own.
    private func counts(_ d: Doors, _ pairing: PairedDoor) async throws -> Counts {
        let reply = try await client(d.port).exchange(
            method: "GET", target: "/p337/counts", headers: [], body: nil, door: pairing.endpoint, identity: pairing.identity
        )
        XCTAssertEqual(reply.status, 200)
        return try JSONDecoder().decode(Counts.self, from: reply.body)
    }

    /// A page the door can answer: the newest rows of the history its own
    /// screen names, or a small page when it names none.
    private func ask(_ shipping: DoorClient, _ pairing: PairedDoor) async throws -> (from: Int, count: Int, depth: Int, wrap: Int) {
        let line = DoorLine.once()
        let screen = try await shipping.screen("p337-session", since: nil, line: line, door: pairing).screen
        let depth = screen?.historyDepth ?? 100
        let wrap = screen?.screenColumns ?? 120
        let count = min(10, max(1, depth))
        return (from: max(0, depth - count), count: count, depth: max(depth, count), wrap: wrap)
    }

    /// The status re-read on the side line. A door that keeps no session
    /// answers it 404 on the same kept line, which is still one exchange on
    /// it; anything else is the read's own failure.
    private static func statusRead(_ door: PairedScreenDoor) async throws -> PocketSessionAnswer? {
        do {
            return try await door.session()
        } catch let failure as DoorFailure where failure == .refused {
            return nil
        }
    }

    /// Row 1: two pages on one kept line are ONE handshake.
    func testTwoPagesOnOneLineAreOneHandshake() async throws {
        let d = try doors()
        let pairing = try await paired(d)
        let shipping = try client(d.port)
        let page = try await ask(shipping, pairing)
        let side = DoorLine(keeps: true)
        let before = try await counts(d, pairing)
        let first = try await shipping.scrollback(
            "p337-session", from: page.from, count: page.count, depth: page.depth, wrap: page.wrap, keep: .bottom, line: side, door: pairing
        )
        let second = try await shipping.scrollback(
            "p337-session", from: page.from, count: page.count, depth: page.depth, wrap: page.wrap, keep: .top, line: side, door: pairing
        )
        let after = try await counts(d, pairing)
        side.close()
        XCTAssertEqual(first.sessionId, "p337-session")
        XCTAssertEqual(second.sessionId, "p337-session")
        if let reads = after.scrollbackReads, let earlier = before.scrollbackReads { XCTAssertEqual(reads - earlier, 2) }
        XCTAssertEqual(after.handshakes - before.handshakes - 1, 1, "two pages opened more than one connection")
        print("P3371_TRANSPORT|two-pages|\(after.handshakes - before.handshakes - 1)")
    }

    /// Row 2: a page on a kept line the door ended at that page is asked
    /// once more, freshly signed, on a new line, and answered.
    func testAPageOnALineTheDoorClosedIsAskedOnceMore() async throws {
        let d = try doors()
        let pairing = try await paired(d)
        let shipping = try client(d.port)
        let page = try await ask(shipping, pairing)
        let side = DoorLine(keeps: true)
        let before = try await counts(d, pairing)
        _ = try await shipping.scrollback(
            "p337-close-on-next", from: page.from, count: page.count, depth: page.depth, wrap: page.wrap, keep: .bottom, line: side, door: pairing
        )
        let read = try await shipping.scrollback(
            "p337-session", from: page.from, count: page.count, depth: page.depth, wrap: page.wrap, keep: .bottom, line: side, door: pairing
        )
        let after = try await counts(d, pairing)
        side.close()
        XCTAssertEqual(read.sessionId, "p337-session")
        if let reads = after.scrollbackReads, let earlier = before.scrollbackReads {
            XCTAssertEqual(reads - earlier, 3, "the first page, the one the door ended, and the one asked once more")
        }
        XCTAssertEqual(after.handshakes - before.handshakes - 1, 2, "the page was not asked on a new line")
        print("P3371_TRANSPORT|closed-page|\(after.handshakes - before.handshakes - 1)")
    }

    /// Row 3: a page and the poll asked at once ride two lines, each
    /// answered.
    func testAPageAndThePollRideTwoLines() async throws {
        let d = try doors()
        let pairing = try await paired(d)
        let shipping = try client(d.port)
        let page = try await ask(shipping, pairing)
        let side = DoorLine(keeps: true)
        let poll = DoorLine(keeps: true)
        let before = try await counts(d, pairing)
        async let paged = shipping.scrollback(
            "p337-session", from: page.from, count: page.count, depth: page.depth, wrap: page.wrap, keep: .bottom, line: side, door: pairing
        )
        async let polled = shipping.screen("p337-session", since: nil, line: poll, door: pairing)
        let (one, two) = try await (paged, polled)
        let after = try await counts(d, pairing)
        side.close()
        poll.close()
        XCTAssertEqual(one.sessionId, "p337-session")
        XCTAssertEqual(two.sessionId, "p337-session")
        XCTAssertEqual(after.handshakes - before.handshakes - 1, 2, "a page and a poll did not ride two lines")
        print("P3371_TRANSPORT|page-and-poll|\(after.handshakes - before.handshakes - 1)")
    }

    /// Row 4: a page and a status re-read asked at once through the SHIPPING
    /// `PairedScreenDoor` go one after the other on its side line: one
    /// connection, neither cancelling the other.
    func testAPageAndAStatusReadShareTheSideLineOneAfterTheOther() async throws {
        let d = try doors()
        let pairing = try await paired(d)
        let shipping = try client(d.port)
        let page = try await ask(shipping, pairing)
        let door = PairedScreenDoor(client: shipping, door: pairing, sessionId: "p337-session")
        let before = try await counts(d, pairing)
        async let paged = door.scrollback(from: page.from, count: page.count, depth: page.depth, wrap: page.wrap, keep: .bottom)
        async let status = Self.statusRead(door)
        let (one, _) = try await (paged, status)
        let after = try await counts(d, pairing)
        door.close()
        XCTAssertEqual(one.sessionId, "p337-session", "the page was cancelled by the status read")
        XCTAssertEqual(after.handshakes - before.handshakes - 1, 1, "a page and a status read opened two connections")
        print("P3371_TRANSPORT|side-line|\(after.handshakes - before.handshakes - 1)")
    }
}

#if !DEBUG
/// A Release build has no seam, so the test maps the door to this Mac's
/// loopback itself, keeping the door's name as the TLS name and the `Host`.
private struct P3371LoopbackTransport: DoorTransport {
    let port: Int

    func route(to door: DoorEndpoint) throws -> DoorRoute {
        guard door.isPublic else { throw DoorFailure.notPaired }
        return DoorRoute(host: "127.0.0.1", port: port)
    }
}
#endif
#endif
