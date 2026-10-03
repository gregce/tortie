import Foundation
import XCTest
@testable import Tortie

#if os(iOS)
/// THE WRITES, OVER THE WIRE (Phase 317, build/p317/SPEC.md section 6.3 (ab)
/// and (ad)): the SHIPPING `DoorClient` signs a write over `POST`, its path and
/// its BODY, presents the phone's identity, and is answered with its own id
/// echoed; a write withheld because its task was cancelled before its bytes
/// were handed is never sent; and one whose bytes already left runs to its
/// answer.
///
/// `npm run test:ios` stands up the doors on this Mac's loopback
/// (build/p316/test-ios.mjs `startTransportDoors`) and hands their facts to
/// this test through the runner's environment:
///
///   P330_DOOR_NAME, P330_DOOR_PORT, P330_DOOR_PIN
///       door A, which issues a client certificate (`POST /p330/issue`) and
///       takes `POST /v1/end` from a connection that
///       presents one, verified with build/p316/node-phone.mjs `verifySigned`
///       as the VECTORS' phone signing to the vectors' Mac, and answered with
///       the body's write id echoed; `GET /p317/counts` answers its counts.
///   P317_HOLD_TLS_PORT
///       a socket that holds each connection P317_HOLD_MS before its TLS
///       handshake starts, and counts the requests it reads: ZERO is the
///       runner's check (`writeProblems`).
///   P317_HOLD_ANSWER_PORT
///       door A's rules under door A's key, holding each answer P317_HOLD_MS
///       after reading its request.
///
/// With none named it skips: on its own it has no door to dial. Every row
/// prints one `P317_TRANSPORT|` line for the runner.
final class P317WriteTransportTests: XCTestCase {
    private struct Doors {
        let name: String
        let port: Int
        let pin: String
        let holdTlsPort: Int
        let holdAnswerPort: Int
        let holdMs: Int
    }

    /// door A's `GET /p317/counts`, the half this test reads.
    private struct Counts: Decodable {
        struct Held: Decodable {
            let requests: Int
        }
        let holdAnswer: Held
    }

    private let keys = KeychainClientKeys()

    override func tearDown() {
        for tag in keys.tags() { keys.delete(tag: tag) }
    }

    private func doors() throws -> Doors {
        let env = ProcessInfo.processInfo.environment
        guard let name = env["P330_DOOR_NAME"], let port = Int(env["P330_DOOR_PORT"] ?? ""),
              let pin = env["P330_DOOR_PIN"], let holdTls = Int(env["P317_HOLD_TLS_PORT"] ?? ""),
              let holdAnswer = Int(env["P317_HOLD_ANSWER_PORT"] ?? ""), let holdMs = Int(env["P317_HOLD_MS"] ?? "") else {
            throw XCTSkip("test:ios stands up the doors this test dials; on its own it has none.")
        }
        return Doors(name: name, port: port, pin: pin, holdTlsPort: holdTls, holdAnswerPort: holdAnswer, holdMs: holdMs)
    }

    /// The shipping client, its connections opened on this Mac's loopback at
    /// `port`, the door's name kept as the TLS name and the `Host`.
    private func client(_ port: Int) throws -> DoorClient {
        #if DEBUG
        let parsed = try XCTUnwrap(DoorEndpointDebugSeam.loopbackPort(["app", "-TortieDebugDoorEndpoint", "127.0.0.1:\(port)"]))
        return DoorClient(transport: DebugEndpointTransport(port: parsed))
        #else
        return DoorClient(transport: P317LoopbackTransport(port: port))
        #endif
    }

    /// A pairing door A's writes verify: the vectors' phone keys and Mac
    /// exchange key, a client key the shipping code made in the Simulator's
    /// Keychain, and the certificate door A issued over it.
    private func paired(_ d: Doors) async throws -> PairedDoor {
        let v = try DoorVectorFile.load()
        let phone = try PhoneKeys(
            signingSeed: try XCTUnwrap(Hex.decode(v.keys.phoneSigningSeed)),
            exchangeSeed: try XCTUnwrap(Hex.decode(v.keys.phoneExchangeSeed))
        )
        let endpoint = DoorEndpoint(name: d.name, port: 8443, pin: d.pin)
        let key = try keys.mint()
        let issue = try await client(d.port).exchange(
            method: "POST", target: "/p330/issue", headers: [], body: Data(#"{"ck":"\#(key.spki)"}"#.utf8), door: endpoint, identity: nil
        )
        XCTAssertEqual(issue.status, 200)
        let issued = try XCTUnwrap(try JSONSerialization.jsonObject(with: issue.body) as? [String: String])
        let certificate = try XCTUnwrap(Base64URL.decode(try XCTUnwrap(issued["cert"])))
        return try XCTUnwrap(PairedDoor(
            endpoint: endpoint, macSigningKey: v.keys.macSigningKey, macExchangeKey: v.keys.macExchangeKey,
            label: "p317-transport", pairedAt: 1_759_190_400_000, keys: phone, clientKey: key,
            certificate: certificate, identity: try keys.adopt(certificate, for: key),
            alerts: AlertsKept(macSends: false, presented: nil)
        ))
    }

    /// Row 1: a signed End, over the identity, is answered with the id it
    /// carried: door A verified the signature over POST, the path and the body.
    func testASignedEndIsAnsweredWithItsOwnId() async throws {
        let d = try doors()
        let pairing = try await paired(d)
        let shipping = try client(d.port)
        let result = await shipping.end("p317-session", batch: false, door: pairing)
        guard case .answered(let answer) = result else { return XCTFail("\(result)") }
        XCTAssertEqual(answer.verb, .end)
        XCTAssertEqual(answer.outcome, .done)
        XCTAssertTrue(WriteId.isWellFormed(answer.write))
        print("P317_TRANSPORT|end|\(answer.outcome.rawValue)")
    }

    /// Row 2: an End through the shipping reader's writer as the app holds it
    /// (`any DoorReading`), so the requirement, not a fake, reaches the wire.
    /// (Until the fix round this row was Unpair's Mac half, which it took out.)
    func testAnEndThroughTheReaderAsTheAppHoldsIt() async throws {
        let d = try doors()
        let pairing = try await paired(d)
        let reader: any DoorReading = PairedReader(client: try client(d.port), door: pairing)
        let result = await reader.writer?.end("p317-session-reader", batch: true)
        guard case .answered(let answer)? = result else { return XCTFail("\(String(describing: result))") }
        XCTAssertEqual(answer.verb, .end)
        XCTAssertEqual(answer.outcome, .done)
        print("P317_TRANSPORT|end-reader|\(answer.outcome.rawValue)")
    }

    /// Row 3 (D6): a write whose handshake is held when its task is cancelled
    /// at 0.5 s is WITHHELD: `.notSent(.cancelled)`; the runner reads that the
    /// door holding the handshake read no request at all.
    func testAWriteCancelledBeforeTheHandshakeIsWithheld() async throws {
        let d = try doors()
        let pairing = try await paired(d)
        let held = try client(d.holdTlsPort)
        let task = Task { await held.end("p317-withheld", batch: false, door: pairing) }
        try await Task.sleep(nanoseconds: 500_000_000)
        task.cancel()
        let result = await task.value
        XCTAssertEqual(result, .notSent(.cancelled))
        XCTAssertTrue(result.withheld)
        print("P317_TRANSPORT|withheld|\(result)")
    }

    /// Row 4 (D6): a write cancelled after the door read its request (read
    /// from door A's own counts, not guessed) runs to its answer: the
    /// cancellation does nothing once the bytes left, so the phone reads what
    /// the Mac did.
    func testAWriteCancelledAfterItsBytesLeftIsAnswered() async throws {
        let d = try doors()
        let pairing = try await paired(d)
        let counter = try client(d.port)
        let before = try await requestsRead(counter, pairing)
        let held = try client(d.holdAnswerPort)
        let task = Task { await held.end("p317-handed", batch: false, door: pairing) }
        let deadline = Date().addingTimeInterval(Double(d.holdMs) / 1000)
        while try await requestsRead(counter, pairing) == before {
            guard Date() < deadline else { return XCTFail("the door holding its answer never read the request") }
            try await Task.sleep(nanoseconds: 50_000_000)
        }
        task.cancel()
        let result = await task.value
        guard case .answered(let answer) = result else { return XCTFail("\(result)") }
        XCTAssertEqual(answer.outcome, .done)
        print("P317_TRANSPORT|handed|\(answer.outcome.rawValue)")
    }

    /// How many requests the door that holds its answer has read so far.
    private func requestsRead(_ client: DoorClient, _ pairing: PairedDoor) async throws -> Int {
        let reply = try await client.exchange(
            method: "GET", target: "/p317/counts", headers: [], body: nil, door: pairing.endpoint, identity: pairing.identity
        )
        XCTAssertEqual(reply.status, 200)
        return try JSONDecoder().decode(Counts.self, from: reply.body).holdAnswer.requests
    }
}

#if !DEBUG
/// A Release build has no seam, so the test maps the door to this Mac's
/// loopback itself, keeping the door's name as the TLS name and the `Host`.
private struct P317LoopbackTransport: DoorTransport {
    let port: Int

    func route(to door: DoorEndpoint) throws -> DoorRoute {
        guard door.isPublic else { throw DoorFailure.notPaired }
        return DoorRoute(host: "127.0.0.1", port: port)
    }
}
#endif
#endif
