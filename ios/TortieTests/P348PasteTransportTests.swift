import Foundation
import XCTest
@testable import Tortie

#if os(iOS)
/// REMOVE AND PASTE, OVER THE WIRE (Phase 348, build/p348/SPEC.md section 8.3,
/// D28, D29, D54, D55): the SHIPPING `DoorClient.paste` and
/// `DoorClient.remove` sign `POST /v1/paste` and `POST /v1/remove` over their
/// paths and their BODIES, present the phone's identity, and are answered with
/// their own ids echoed: a paste of 16,384 bytes of text with no control in
/// it, and one whose escaped body is near the door's cap of 131,072 bytes
/// (16,384 controls, each written `\u00XX`), each sent whole in ONE exchange
/// on a kept line; a Remove; and each write withheld before its handshake
/// reaching no request.
///
/// `npm run test:ios` stands up the doors on this Mac's loopback
/// (build/p316/test-ios.mjs) and hands their facts to this test through the
/// runner's environment (`TEST_RUNNER_<NAME>`, read here as `<NAME>`):
///
///   P330_DOOR_NAME, P330_DOOR_PORT, P330_DOOR_PIN
///       door A, which issues a client certificate (`POST /p330/issue`).
///   P348_DOOR_PORT
///       THE PASTE AND REMOVE DOOR, under door A's key and admission, taking
///       `POST /v1/remove` and `POST /v1/paste` verified as the VECTORS'
///       phone over the method, the path and the body, reading a paste body
///       up to 131,072 bytes and a Remove's up to 512, recording every body
///       it verified byte for byte (`GET /p348/bodies`, from a connection
///       presenting the identity, answers `{"bodies":[<each, as text>]}`),
///       and answering each `done` with its id echoed under its own verb.
///   P317_HOLD_TLS_PORT
///       the socket that holds each connection before its TLS handshake and
///       counts the requests it reads: ZERO is the runner's check.
///
/// With none named it skips: on its own it has no door to dial. Every row
/// prints one `P348_TRANSPORT|<row>|<what it read>` line for the runner
/// (`pasteProblems`).
final class P348PasteTransportTests: XCTestCase {
    private struct Doors {
        let name: String
        let port: Int
        let pin: String
        let pastePort: Int
        let holdTlsPort: Int
    }

    /// The paste and remove door's record.
    private struct Bodies: Decodable {
        let bodies: [String]
    }

    /// A paste body's fields, read back from the door's record.
    private struct PasteRead: Decodable {
        let dialog: String?
        let session: String
        let text: String
        let turn: String
        let write: String
    }

    private let keys = KeychainClientKeys()

    override func tearDown() {
        for tag in keys.tags() { keys.delete(tag: tag) }
    }

    private func doors() throws -> Doors {
        let env = ProcessInfo.processInfo.environment
        guard let name = env["P330_DOOR_NAME"], let port = Int(env["P330_DOOR_PORT"] ?? ""),
              let pin = env["P330_DOOR_PIN"], let paste = Int(env["P348_DOOR_PORT"] ?? ""),
              let holdTls = Int(env["P317_HOLD_TLS_PORT"] ?? "") else {
            throw XCTSkip("test:ios stands up the doors this test dials; on its own it has none.")
        }
        return Doors(name: name, port: port, pin: pin, pastePort: paste, holdTlsPort: holdTls)
    }

    /// The shipping client, its connections opened on this Mac's loopback at
    /// `port`, the door's name kept as the TLS name and the `Host`.
    private func client(_ port: Int) throws -> DoorClient {
        #if DEBUG
        let parsed = try XCTUnwrap(DoorEndpointDebugSeam.loopbackPort(["app", "-TortieDebugDoorEndpoint", "127.0.0.1:\(port)"]))
        return DoorClient(transport: DebugEndpointTransport(port: parsed))
        #else
        return DoorClient(transport: P348LoopbackTransport(port: port))
        #endif
    }

    /// A pairing the door verifies: the vectors' phone keys and Mac exchange
    /// key, a client key the shipping code made in the Simulator's Keychain,
    /// and the certificate door A issued over it.
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
            label: "p348-transport", pairedAt: 1_759_190_400_000, keys: phone, clientKey: key,
            certificate: certificate, identity: try keys.adopt(certificate, for: key),
            alerts: AlertsKept(macSends: false, presented: nil)
        ))
    }

    /// Every body the door has verified so far, in order.
    private func bodies(_ d: Doors, _ pairing: PairedDoor) async throws -> [String] {
        let reply = try await client(d.pastePort).exchange(
            method: "GET", target: "/p348/bodies", headers: [], body: nil, door: pairing.endpoint, identity: pairing.identity
        )
        XCTAssertEqual(reply.status, 200)
        return try JSONDecoder().decode(Bodies.self, from: reply.body).bodies
    }

    /// Row 1 (D29, D54): a paste of 16,384 bytes of text with no control in
    /// it, through the shipping client on a kept line, is verified and
    /// answered done with its id echoed, and the door read its text exactly,
    /// with the stamp it carried.
    func testAPasteOfTheWholeCapGoesInOneWrite() async throws {
        let d = try doors()
        let pairing = try await paired(d)
        let text = String(repeating: "p348 paste line, ", count: 963) + String(repeating: "x", count: 16_384 - 17 * 963)
        XCTAssertEqual(text.utf8.count, ScreenPasteRule.mostBytes)
        XCTAssertNil(ScreenPasteRule.refusal(text), "the phone's own rule refuses the text this row sends")
        let shipping = try client(d.pastePort)
        let result = await shipping.paste("p348-live", text: text, turn: "0123456789abcdef-3", dialog: nil, line: DoorLine(keeps: true), door: pairing)
        guard case .answered(let answer) = result else { return XCTFail("\(result)") }
        XCTAssertEqual(answer.outcome, .done)
        XCTAssertTrue(WriteId.isWellFormed(answer.write))
        let read = try await bodies(d, pairing)
        let last = try JSONDecoder().decode(PasteRead.self, from: Data(try XCTUnwrap(read.last).utf8))
        XCTAssertEqual(last.text, text, "the text on the wire is not his, byte for byte")
        XCTAssertEqual(last.turn, "0123456789abcdef-3")
        XCTAssertNil(last.dialog)
        XCTAssertEqual(last.write, answer.write)
        print("P348_TRANSPORT|paste|\(answer.outcome.rawValue)")
    }

    /// Row 2 (D29): a paste body near the door's cap (16,384 controls, each
    /// escaped `\u00XX`, which the phone's rule never lets through but the
    /// client and the door must carry) is sent whole and answered done.
    func testAPasteBodyNearTheCapIsSentWhole() async throws {
        let d = try doors()
        let pairing = try await paired(d)
        let text = String(repeating: "\u{1}", count: 16_384)
        let shipping = try client(d.pastePort)
        let result = await shipping.paste("p348-live", text: text, turn: "0123456789abcdef-3", dialog: "a1b2c3d4e5f6", line: DoorLine(keeps: true), door: pairing)
        guard case .answered(let answer) = result else { return XCTFail("\(result)") }
        XCTAssertEqual(answer.outcome, .done)
        let read = try await bodies(d, pairing)
        let body = try XCTUnwrap(read.last)
        XCTAssertGreaterThan(body.utf8.count, 90_000, "the body is not near the cap")
        XCTAssertLessThanOrEqual(body.utf8.count, 131_072)
        XCTAssertEqual(try JSONDecoder().decode(PasteRead.self, from: Data(body.utf8)).text, text)
        print("P348_TRANSPORT|near-cap|\(answer.outcome.rawValue)")
    }

    /// Row 3 (D28, D55): a Remove is exactly `{session, write}`, verified and
    /// answered done with its id echoed; a second press is a NEW write id.
    func testARemoveIsVerifiedAndAnswered() async throws {
        let d = try doors()
        let pairing = try await paired(d)
        let shipping = try client(d.pastePort)
        let first = await shipping.remove("p348-ended", door: pairing)
        guard case .answered(let answer) = first else { return XCTFail("\(first)") }
        XCTAssertEqual(answer.outcome, .done)
        let read = try await bodies(d, pairing)
        let object = try XCTUnwrap(try JSONSerialization.jsonObject(with: Data(try XCTUnwrap(read.last).utf8)) as? [String: Any])
        XCTAssertEqual(object.keys.sorted(), ["session", "write"])
        XCTAssertEqual(object["session"] as? String, "p348-ended")
        XCTAssertEqual(object["write"] as? String, answer.write)
        let second = await shipping.remove("p348-ended", door: pairing)
        guard case .answered(let again) = second else { return XCTFail("\(second)") }
        XCTAssertNotEqual(again.write, answer.write, "a second press kept the first write's id")
        print("P348_TRANSPORT|remove|\(answer.outcome.rawValue)")
    }

    /// Row 4 (D54, D55): a paste and a Remove whose handshakes are held when
    /// their tasks are cancelled at 0.5 s are WITHHELD: `.notSent(.cancelled)`;
    /// the runner reads that the door holding the handshake read no request.
    func testAWriteCancelledBeforeTheHandshakeIsWithheld() async throws {
        let d = try doors()
        let pairing = try await paired(d)
        let held = try client(d.holdTlsPort)
        let paste = Task { await held.paste("p348-withheld", text: "ls", turn: "0123456789abcdef-3", dialog: nil, line: DoorLine(keeps: true), door: pairing) }
        try await Task.sleep(nanoseconds: 500_000_000)
        paste.cancel()
        let pasted = await paste.value
        XCTAssertEqual(pasted, .notSent(.cancelled))
        XCTAssertTrue(pasted.withheld)
        let remove = Task { await held.remove("p348-withheld", door: pairing) }
        try await Task.sleep(nanoseconds: 500_000_000)
        remove.cancel()
        let removed = await remove.value
        XCTAssertEqual(removed, .notSent(.cancelled))
        print("P348_TRANSPORT|withheld|\(pasted)")
        print("P348_TRANSPORT|withheld-remove|\(removed)")
    }

    /// Row 5 (section 9.3): a Remove through the shipping reader's remover
    /// and a paste through its Screen door, as the app holds them (`any
    /// DoorReading`, `any ScreenDoor`), so the requirements, not a fake,
    /// reach the wire.
    func testRemoveAndPasteThroughTheReaderAsTheAppHoldsThem() async throws {
        let d = try doors()
        let pairing = try await paired(d)
        let reader: any DoorReading = PairedReader(client: try client(d.pastePort), door: pairing)
        let remover = try XCTUnwrap(reader.remover, "the paired reader removes nothing")
        let removed = await remover.remove("p348-reader")
        guard case .answered(let answer) = removed else { return XCTFail("\(removed)") }
        XCTAssertEqual(answer.outcome, .done)
        let screen = try XCTUnwrap(reader.screenDoor("p348-reader"), "the paired reader has no Screen door")
        XCTAssertTrue(screen.pastes, "the paired Screen door takes no paste")
        let pasted = await screen.paste("echo reader", turn: "0123456789abcdef-3", dialog: nil)
        guard case .answered(let pasteAnswer) = pasted else { return XCTFail("\(pasted)") }
        XCTAssertEqual(pasteAnswer.outcome, .done)
        screen.close()
        print("P348_TRANSPORT|reader|\(answer.outcome.rawValue),\(pasteAnswer.outcome.rawValue)")
    }
}

#if !DEBUG
/// A Release build has no seam, so the test maps the door to this Mac's
/// loopback itself, keeping the door's name as the TLS name and the `Host`.
private struct P348LoopbackTransport: DoorTransport {
    let port: Int

    func route(to door: DoorEndpoint) throws -> DoorRoute {
        guard door.isPublic else { throw DoorFailure.notPaired }
        return DoorRoute(host: "127.0.0.1", port: port)
    }
}
#endif
#endif
