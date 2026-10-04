import Foundation
import XCTest
@testable import Tortie

#if os(iOS)
/// THE REPLY WRITES, OVER THE WIRE (Phase 318, build/p318/SPEC.md section
/// 6.3, research 137 section 5): the SHIPPING `DoorClient` signs a press and a
/// message over `POST`, its path and its BODY, presents the phone's identity,
/// and is answered with its own id echoed; a message handed a kept id goes
/// with THAT id; a message withheld because its task was cancelled before its
/// bytes were handed is never sent; and one whose bytes already left runs to
/// its answer.
///
/// `npm run test:ios` stands up the doors on this Mac's loopback
/// (build/p316/test-ios.mjs) and hands their facts to this test through the
/// runner's environment, the same ones P317WriteTransportTests reads:
///
///   P330_DOOR_NAME, P330_DOOR_PORT, P330_DOOR_PIN
///       door A, which issues a client certificate (`POST /p330/issue`) and
///       takes `POST /v1/choose` and `POST /v1/say` from a connection that
///       presents one, verified with build/p316/node-phone.mjs `verifySigned`
///       as the VECTORS' phone signing to the vectors' Mac, and answered with
///       the body's write id echoed under the route's own verb; `GET
///       /p317/counts` answers its counts.
///   P317_HOLD_TLS_PORT
///       a socket that holds each connection P317_HOLD_MS before its TLS
///       handshake starts, and counts the requests it reads: ZERO is the
///       runner's check.
///   P317_HOLD_ANSWER_PORT
///       door A's rules under door A's key, holding each answer P317_HOLD_MS
///       after reading its request.
///
/// With none named it skips: on its own it has no door to dial. Every row
/// prints one `P318_TRANSPORT|<row>|<what it read>` line for the runner.
final class P318ReplyTransportTests: XCTestCase {
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
    private let question = "0123456789abcdef-42"
    private let mark = "a1b2c3d4e5f6"

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
        return DoorClient(transport: P318LoopbackTransport(port: port))
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
            label: "p318-transport", pairedAt: 1_759_190_400_000, keys: phone, clientKey: key,
            certificate: certificate, identity: try keys.adopt(certificate, for: key),
            alerts: AlertsKept(macSends: false, presented: nil)
        ))
    }

    /// A message holding `/`, `"`, a line break and an emoji, built from code
    /// points, so the door verified the body Swift writes for it (`\/`).
    private func words() throws -> String {
        let emoji = String(Character(try XCTUnwrap(Unicode.Scalar(0x1F44D))))
        return "/exit \"now\"" + "\n" + "!ls " + emoji
    }

    /// Row 1: a signed press, over the identity, is answered with the id it
    /// carried under its own verb: door A verified the signature over POST,
    /// the path and the body.
    func testASignedPressIsAnsweredWithItsOwnId() async throws {
        let d = try doors()
        let pairing = try await paired(d)
        let result = try await client(d.port).choose("p318-session", question: question, mark: mark, marker: "1", door: pairing)
        guard case .answered(let answer) = result else { return XCTFail("\(result)") }
        XCTAssertEqual(answer.verb, .choose)
        XCTAssertEqual(answer.outcome, .done)
        XCTAssertTrue(WriteId.isWellFormed(answer.write))
        print("P318_TRANSPORT|choose|\(answer.outcome.rawValue)")
    }

    /// Row 2: a signed message is answered with the id it went with.
    func testASignedMessageIsAnsweredWithItsOwnId() async throws {
        let d = try doors()
        let pairing = try await paired(d)
        let text = try words()
        let sent = try await client(d.port).say("p318-session", text: text, write: nil, door: pairing)
        guard case .answered(let answer) = sent.result else { return XCTFail("\(sent.result)") }
        XCTAssertEqual(answer.verb, .say)
        XCTAssertEqual(answer.outcome, .done)
        XCTAssertEqual(answer.write, sent.write)
        print("P318_TRANSPORT|say|\(answer.outcome.rawValue)")
    }

    /// Row 3 (Revision R13): a message handed a kept id goes with THAT id,
    /// and door A answers it echoing that id, twice.
    func testAMessageHandedAKeptIdGoesWithIt() async throws {
        let d = try doors()
        let pairing = try await paired(d)
        let shipping = try client(d.port)
        let text = try words()
        let first = await shipping.say("p318-session", text: text, write: nil, door: pairing)
        let kept = try XCTUnwrap(first.write)
        let again = await shipping.say("p318-session", text: text, write: kept, door: pairing)
        guard case .answered(let answer) = again.result else { return XCTFail("\(again.result)") }
        XCTAssertEqual(again.write, kept)
        XCTAssertEqual(answer.write, kept)
        print("P318_TRANSPORT|say-kept|\(answer.outcome.rawValue)")
    }

    /// Row 4: a press and a message through the shipping reader's writer as
    /// the app holds it (`any DoorReading`), so the requirements, not a fake,
    /// reach the wire.
    func testRepliesThroughTheReaderAsTheAppHoldsIt() async throws {
        let d = try doors()
        let pairing = try await paired(d)
        let reader: any DoorReading = PairedReader(client: try client(d.port), door: pairing)
        let writer = try XCTUnwrap(reader.writer)
        let pressed = await writer.choose("p318-reader", question: question, mark: mark, marker: "2")
        guard case .answered(let press) = pressed else { return XCTFail("\(pressed)") }
        XCTAssertEqual(press.verb, .choose)
        let text = try words()
        let said = await writer.say("p318-reader", text: text, write: nil)
        guard case .answered(let message) = said.result else { return XCTFail("\(said.result)") }
        XCTAssertEqual(message.verb, .say)
        print("P318_TRANSPORT|reader|\(press.outcome.rawValue),\(message.outcome.rawValue)")
    }

    /// Row 5 (Paseo #3464, D24): a message whose handshake is held when its
    /// task is cancelled at 0.5 s is WITHHELD: `.notSent(.cancelled)`; the
    /// runner reads that the door holding the handshake read no request.
    func testAMessageCancelledBeforeTheHandshakeIsWithheld() async throws {
        let d = try doors()
        let pairing = try await paired(d)
        let held = try client(d.holdTlsPort)
        let text = try words()
        let task = Task { await held.say("p318-withheld", text: text, write: nil, door: pairing) }
        try await Task.sleep(nanoseconds: 500_000_000)
        task.cancel()
        let sent = await task.value
        XCTAssertEqual(sent.result, .notSent(.cancelled))
        XCTAssertTrue(sent.result.withheld)
        print("P318_TRANSPORT|say-withheld|\(sent.result)")
    }

    /// Row 6: the same for a press.
    func testAPressCancelledBeforeTheHandshakeIsWithheld() async throws {
        let d = try doors()
        let pairing = try await paired(d)
        let held = try client(d.holdTlsPort)
        let (question, mark) = (question, mark)
        let task = Task { await held.choose("p318-withheld", question: question, mark: mark, marker: "1", door: pairing) }
        try await Task.sleep(nanoseconds: 500_000_000)
        task.cancel()
        let result = await task.value
        XCTAssertEqual(result, .notSent(.cancelled))
        print("P318_TRANSPORT|choose-withheld|\(result)")
    }

    /// Row 7: a message cancelled after the door read its request (read from
    /// door A's own counts, not guessed) runs to its answer: the cancellation
    /// does nothing once the bytes left, so the phone reads what the Mac did.
    func testAMessageCancelledAfterItsBytesLeftIsAnswered() async throws {
        let d = try doors()
        let pairing = try await paired(d)
        let counter = try client(d.port)
        let before = try await requestsRead(counter, pairing)
        let held = try client(d.holdAnswerPort)
        let text = try words()
        let task = Task { await held.say("p318-handed", text: text, write: nil, door: pairing) }
        let deadline = Date().addingTimeInterval(Double(d.holdMs) / 1000)
        while try await requestsRead(counter, pairing) == before {
            guard Date() < deadline else { return XCTFail("the door holding its answer never read the request") }
            try await Task.sleep(nanoseconds: 50_000_000)
        }
        task.cancel()
        let sent = await task.value
        guard case .answered(let answer) = sent.result else { return XCTFail("\(sent.result)") }
        XCTAssertEqual(answer.outcome, .done)
        print("P318_TRANSPORT|say-handed|\(answer.outcome.rawValue)")
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
private struct P318LoopbackTransport: DoorTransport {
    let port: Int

    func route(to door: DoorEndpoint) throws -> DoorRoute {
        guard door.isPublic else { throw DoorFailure.notPaired }
        return DoorRoute(host: "127.0.0.1", port: port)
    }
}
#endif
#endif
