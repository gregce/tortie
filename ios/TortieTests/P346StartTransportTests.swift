import Foundation
import XCTest
@testable import Tortie

#if os(iOS)
/// THE START, OVER THE WIRE (Phase 346, build/p346/SPEC.md section 6.3, D6,
/// D17): the SHIPPING `DoorClient.start` signs `POST /v1/start` over its
/// path and its BODY, presents the phone's identity, writes the vector body
/// byte for byte, is answered with its own id echoed; after an answer that
/// did not come, the kept id sends the SAME body again (only the signature,
/// its clock and its nonce move); and a start withheld before its handshake
/// reaches no request.
///
/// `npm run test:ios` stands up the doors on this Mac's loopback
/// (build/p316/test-ios.mjs) and hands their facts to this test through the
/// runner's environment (`TEST_RUNNER_<NAME>`, read here as `<NAME>`):
///
///   P330_DOOR_NAME, P330_DOOR_PORT, P330_DOOR_PIN
///       door A, which issues a client certificate (`POST /p330/issue`), as
///       for P317WriteTransportTests and P318ReplyTransportTests.
///   P346_START_PORT
///       THE START DOOR, under door A's key, taking `POST /v1/start` only from
///       a connection that presents a certificate door A issued, verified as
///       the VECTORS' phone signing to the vectors' Mac. It records every
///       body it read, in order, byte for byte. By the body's `project`:
///       `p346-hold` is read, recorded and its connection ended with NO
///       answer (the hold mode); any other is answered 200
///       `{"verb":"start","write":<the body's write>,"outcome":"done",
///       "reason":null,"sentence":null,"session":{"id":"p346-made",
///       "name":"<agent>-1"}}`. `GET /p346/starts`, from a connection
///       presenting the identity, answers `{"bodies":[<each body read, as
///       text>]}`.
///   P317_HOLD_TLS_PORT, P317_HOLD_MS
///       the socket that holds each connection P317_HOLD_MS before its TLS
///       handshake starts and counts the requests it reads: ZERO is the
///       runner's check, as for 317's and 318's withheld writes.
///
/// With none named it skips: on its own it has no door to dial. Every row
/// prints one `P346_TRANSPORT|<row>|<what it read>` line for the runner.
final class P346StartTransportTests: XCTestCase {
    private struct Doors {
        let name: String
        let port: Int
        let pin: String
        let startPort: Int
        let holdTlsPort: Int
    }

    /// The start door's record.
    private struct Starts: Decodable {
        let bodies: [String]
    }

    /// The vector body's three fields.
    private struct Body: Decodable {
        let agent: String
        let project: String
        let write: String
    }

    private let keys = KeychainClientKeys()

    override func tearDown() {
        for tag in keys.tags() { keys.delete(tag: tag) }
    }

    private func doors() throws -> Doors {
        let env = ProcessInfo.processInfo.environment
        guard let name = env["P330_DOOR_NAME"], let port = Int(env["P330_DOOR_PORT"] ?? ""),
              let pin = env["P330_DOOR_PIN"], let start = Int(env["P346_START_PORT"] ?? ""),
              let holdTls = Int(env["P317_HOLD_TLS_PORT"] ?? "") else {
            throw XCTSkip("test:ios stands up the doors this test dials; on its own it has none.")
        }
        return Doors(name: name, port: port, pin: pin, startPort: start, holdTlsPort: holdTls)
    }

    /// The shipping client, its connections opened on this Mac's loopback at
    /// `port`, the door's name kept as the TLS name and the `Host`.
    private func client(_ port: Int) throws -> DoorClient {
        #if DEBUG
        let parsed = try XCTUnwrap(DoorEndpointDebugSeam.loopbackPort(["app", "-TortieDebugDoorEndpoint", "127.0.0.1:\(port)"]))
        return DoorClient(transport: DebugEndpointTransport(port: parsed))
        #else
        return DoorClient(transport: P346LoopbackTransport(port: port))
        #endif
    }

    /// A pairing the start door verifies: the vectors' phone keys and Mac
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
            label: "p346-transport", pairedAt: 1_759_190_400_000, keys: phone, clientKey: key,
            certificate: certificate, identity: try keys.adopt(certificate, for: key),
            alerts: AlertsKept(macSends: false, presented: nil)
        ))
    }

    /// Every body the start door has read so far, in order.
    private func bodies(_ d: Doors, _ pairing: PairedDoor) async throws -> [String] {
        let reply = try await client(d.startPort).exchange(
            method: "GET", target: "/p346/starts", headers: [], body: nil, door: pairing.endpoint, identity: pairing.identity
        )
        XCTAssertEqual(reply.status, 200)
        return try JSONDecoder().decode(Starts.self, from: reply.body).bodies
    }

    /// Row 1 (D6): the shipping client writes the VECTOR body byte for byte
    /// (its id handed in as a kept id, so the bytes are the vector's) and is
    /// answered done with that id echoed.
    func testTheShippingClientWritesTheVectorBody() async throws {
        let d = try doors()
        let pairing = try await paired(d)
        let v = try DoorVectorFile.load()
        let vector = try XCTUnwrap(v.requests.first { $0.name == "start" }, "vectors.json holds no start request: run node build/p316/vectors.mjs")
        XCTAssertEqual(vector.method, "POST")
        XCTAssertEqual(vector.target, DoorClient.startTarget)
        let fields = try JSONDecoder().decode(Body.self, from: Data(vector.body.utf8))
        let shipping = try client(d.startPort)
        let sent = await shipping.start(project: fields.project, agent: fields.agent, write: fields.write, door: pairing)
        guard case .answered(let answer) = sent.result else { return XCTFail("\(sent.result)") }
        XCTAssertEqual(answer.outcome, .done)
        XCTAssertEqual(answer.write, fields.write)
        XCTAssertEqual(sent.write, fields.write)
        let read = try await bodies(d, pairing)
        XCTAssertEqual(read.last, vector.body, "the body on the wire is the vector's, byte for byte")
        print("P346_TRANSPORT|vector|\(answer.outcome.rawValue),\(read.last == vector.body ? "same" : "differs")")
    }

    /// Row 2 (D17): a start whose answer did not come keeps its id, and the
    /// next call handed that id sends the SAME body; the door read both.
    func testAHeldAnswerThenTheKeptIdSendsTheSameBytes() async throws {
        let d = try doors()
        let pairing = try await paired(d)
        let shipping = try client(d.startPort)
        let before = try await bodies(d, pairing).count
        let first = await shipping.start(project: "p346-hold", agent: "claude", write: nil, door: pairing)
        XCTAssertEqual(first.result, .noAnswer)
        let kept = try XCTUnwrap(first.write)
        XCTAssertTrue(WriteId.isWellFormed(kept))
        let second = await shipping.start(project: "p346-hold", agent: "claude", write: kept, door: pairing)
        XCTAssertEqual(second.result, .noAnswer)
        XCTAssertEqual(second.write, kept)
        let read = try await bodies(d, pairing)
        XCTAssertEqual(read.count, before + 2)
        let pair = Array(read.suffix(2))
        XCTAssertEqual(pair.first, pair.last, "the same id sends the same bytes")
        XCTAssertTrue(pair.first?.contains(#""write":"\#(kept)""#) ?? false)
        print("P346_TRANSPORT|kept|\(pair.first == pair.last ? "same" : "differs")")
    }

    /// Row 3 (D25): a start whose handshake is held when its task is
    /// cancelled at 0.5 s is WITHHELD: `.notSent(.cancelled)`; the runner
    /// reads that the door holding the handshake read no request.
    func testAStartCancelledBeforeTheHandshakeIsWithheld() async throws {
        let d = try doors()
        let pairing = try await paired(d)
        let held = try client(d.holdTlsPort)
        let task = Task { await held.start(project: "p346-withheld", agent: "claude", write: nil, door: pairing) }
        try await Task.sleep(nanoseconds: 500_000_000)
        task.cancel()
        let sent = await task.value
        XCTAssertEqual(sent.result, .notSent(.cancelled))
        XCTAssertTrue(sent.result.withheld)
        print("P346_TRANSPORT|withheld|\(sent.result)")
    }

    /// Row 4: a start through the shipping reader's starter as the app holds
    /// it (`any DoorReading`), so the requirement, not a fake, reaches the wire.
    func testAStartThroughTheReaderAsTheAppHoldsIt() async throws {
        let d = try doors()
        let pairing = try await paired(d)
        let reader: any DoorReading = PairedReader(client: try client(d.startPort), door: pairing)
        let starter = try XCTUnwrap(reader.starter, "the paired reader starts nothing")
        let sent = await starter.start(project: "p346-reader", agent: "codex", write: nil)
        guard case .answered(let answer) = sent.result else { return XCTFail("\(sent.result)") }
        XCTAssertEqual(answer.outcome, .done)
        XCTAssertEqual(answer.write, sent.write)
        XCTAssertEqual(answer.session?.id, "p346-made")
        print("P346_TRANSPORT|reader|\(answer.outcome.rawValue)")
    }
}

#if !DEBUG
/// A Release build has no seam, so the test maps the door to this Mac's
/// loopback itself, keeping the door's name as the TLS name and the `Host`.
private struct P346LoopbackTransport: DoorTransport {
    let port: Int

    func route(to door: DoorEndpoint) throws -> DoorRoute {
        guard door.isPublic else { throw DoorFailure.notPaired }
        return DoorRoute(host: "127.0.0.1", port: port)
    }
}
#endif
#endif
