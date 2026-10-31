import Foundation
import XCTest
@testable import Tortie

#if os(iOS)
/// RENAME, OVER THE WIRE (Phase 349, build/p349/SPEC.md section 8.3, D6, D9):
/// the SHIPPING `DoorClient.rename` signs `POST /v1/rename` over its path and
/// its BODY, presents the phone's identity, and is answered with its own id
/// echoed: a name with quotes and dashes, read on the door exactly as sent; a
/// 120-unit astral name; the worst body a 120-unit name makes (120 controls,
/// each written `\u00XX`, beside the longest session id: 915 bytes, under the
/// door's cap of 2,048), sent whole in ONE exchange; a rename withheld before
/// its handshake reaching no request; and a rename through the paired reader
/// as the app holds it.
///
/// `npm run test:ios` stands up the doors on this Mac's loopback
/// (build/p316/test-ios.mjs) and hands their facts to this test through the
/// runner's environment (`TEST_RUNNER_<NAME>`, read here as `<NAME>`):
///
///   P330_DOOR_NAME, P330_DOOR_PORT, P330_DOOR_PIN
///       door A, which issues a client certificate (`POST /p330/issue`).
///   P349_DOOR_PORT
///       THE RENAME DOOR, under door A's key and admission, taking
///       `POST /v1/rename` verified as the VECTORS' phone over the method, the
///       path and the body, reading a body up to 2,048 bytes, recording every
///       body it verified byte for byte (`GET /p349/bodies`, from a connection
///       presenting the identity, answers `{"bodies":[<each, as text>]}`), and
///       answering each `done` with its id echoed and the name it carried as
///       the name stored.
///   P317_HOLD_TLS_PORT
///       the socket that holds each connection before its TLS handshake and
///       counts the requests it reads: ZERO is the runner's check.
///
/// With none named it skips: on its own it has no door to dial. Every row
/// prints one `P349_TRANSPORT|<row>|<what it read>` line for the runner
/// (`renameProblems`).
final class P349RenameTransportTests: XCTestCase {
    private struct Doors {
        let name: String
        let port: Int
        let pin: String
        let renamePort: Int
        let holdTlsPort: Int
    }

    /// The rename door's record.
    private struct Bodies: Decodable {
        let bodies: [String]
    }

    /// A rename body's fields, read back from the door's record.
    private struct RenameRead: Decodable {
        let name: String
        let session: String
        let write: String
    }

    private let keys = KeychainClientKeys()

    override func tearDown() {
        for tag in keys.tags() { keys.delete(tag: tag) }
    }

    private func doors() throws -> Doors {
        let env = ProcessInfo.processInfo.environment
        guard let name = env["P330_DOOR_NAME"], let port = Int(env["P330_DOOR_PORT"] ?? ""),
              let pin = env["P330_DOOR_PIN"], let rename = Int(env["P349_DOOR_PORT"] ?? ""),
              let holdTls = Int(env["P317_HOLD_TLS_PORT"] ?? "") else {
            throw XCTSkip("test:ios stands up the doors this test dials; on its own it has none.")
        }
        return Doors(name: name, port: port, pin: pin, renamePort: rename, holdTlsPort: holdTls)
    }

    /// The shipping client, its connections opened on this Mac's loopback at
    /// `port`, the door's name kept as the TLS name and the `Host`.
    private func client(_ port: Int) throws -> DoorClient {
        #if DEBUG
        let parsed = try XCTUnwrap(DoorEndpointDebugSeam.loopbackPort(["app", "-TortieDebugDoorEndpoint", "127.0.0.1:\(port)"]))
        return DoorClient(transport: DebugEndpointTransport(port: parsed))
        #else
        return DoorClient(transport: P349LoopbackTransport(port: port))
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
            label: "p349-transport", pairedAt: 1_759_190_400_000, keys: phone, clientKey: key,
            certificate: certificate, identity: try keys.adopt(certificate, for: key),
            alerts: AlertsKept(macSends: false, presented: nil)
        ))
    }

    /// Every body the door has verified so far, in order.
    private func bodies(_ d: Doors, _ pairing: PairedDoor) async throws -> [String] {
        let reply = try await client(d.renamePort).exchange(
            method: "GET", target: "/p349/bodies", headers: [], body: nil, door: pairing.endpoint, identity: pairing.identity
        )
        XCTAssertEqual(reply.status, 200)
        return try JSONDecoder().decode(Bodies.self, from: reply.body).bodies
    }

    /// Row 1 (D6, D9): a rename is exactly `{name, session, write}`, verified
    /// and answered done with its id echoed and the name it carried, read on
    /// the door exactly as he typed it; a second press is a NEW write id.
    func testARenameIsVerifiedAndAnswered() async throws {
        let d = try doors()
        let pairing = try await paired(d)
        let shipping = try client(d.renamePort)
        let name = " it's \"x\" fix--auth /review "
        let first = await shipping.rename("p349-session", name: name, door: pairing)
        guard case .answered(let answer) = first else { return XCTFail("\(first)") }
        XCTAssertEqual(answer.outcome, .done)
        XCTAssertEqual(answer.name, name)
        let read = try await bodies(d, pairing)
        let body = try XCTUnwrap(read.last)
        let object = try XCTUnwrap(try JSONSerialization.jsonObject(with: Data(body.utf8)) as? [String: Any])
        XCTAssertEqual(object.keys.sorted(), ["name", "session", "write"])
        let fields = try JSONDecoder().decode(RenameRead.self, from: Data(body.utf8))
        XCTAssertEqual(fields.name, name, "the name on the wire is not his, byte for byte")
        XCTAssertEqual(fields.session, "p349-session")
        XCTAssertEqual(fields.write, answer.write)
        let second = await shipping.rename("p349-session", name: name, door: pairing)
        guard case .answered(let again) = second else { return XCTFail("\(second)") }
        XCTAssertNotEqual(again.write, answer.write, "a second press kept the first write's id")
        print("P349_TRANSPORT|rename|\(answer.outcome.rawValue)")
    }

    /// Row 2 (D5, D6): a name of 120 UTF-16 units, every one half of an astral
    /// character, goes whole and is read back whole.
    func testAnAstralNameOfTheWholeCapGoesWhole() async throws {
        let d = try doors()
        let pairing = try await paired(d)
        let name = String(repeating: "\u{1F600}", count: 60)
        XCTAssertEqual(name.utf16.count, NameRule.maxUnits)
        XCTAssertNil(NameRule.refusal(name), "the phone's own rule refuses the name this row sends")
        let shipping = try client(d.renamePort)
        let result = await shipping.rename("p349-session", name: name, door: pairing)
        guard case .answered(let answer) = result else { return XCTFail("\(result)") }
        XCTAssertEqual(answer.outcome, .done)
        let read = try await bodies(d, pairing)
        XCTAssertEqual(try JSONDecoder().decode(RenameRead.self, from: Data(try XCTUnwrap(read.last).utf8)).name, name)
        print("P349_TRANSPORT|astral|\(answer.outcome.rawValue)")
    }

    /// Row 3 (D6): the worst body a 120-unit name makes, 120 controls each
    /// escaped beside a 128-character session id (which the phone's rule never
    /// lets through, but the client and the door must carry), is 915 bytes,
    /// sent whole in one exchange and answered done.
    func testTheWorstBodyIsSentWhole() async throws {
        let d = try doors()
        let pairing = try await paired(d)
        let name = String(repeating: "\u{1}", count: NameRule.maxUnits)
        let session = String(repeating: "x", count: 128)
        let shipping = try client(d.renamePort)
        let result = await shipping.rename(session, name: name, door: pairing)
        guard case .answered(let answer) = result else { return XCTFail("\(result)") }
        XCTAssertEqual(answer.outcome, .done)
        let read = try await bodies(d, pairing)
        let body = try XCTUnwrap(read.last)
        XCTAssertEqual(body.utf8.count, 915, "the worst body is not the 915 bytes D6 measured")
        XCTAssertLessThanOrEqual(body.utf8.count, 2_048)
        XCTAssertEqual(try JSONDecoder().decode(RenameRead.self, from: Data(body.utf8)).name, name)
        print("P349_TRANSPORT|near-cap|\(answer.outcome.rawValue)")
    }

    /// Row 4 (D9): a rename whose handshake is held when its task is cancelled
    /// at 0.5 s is WITHHELD: `.notSent(.cancelled)`; the runner reads that the
    /// door holding the handshake read no request.
    func testARenameCancelledBeforeTheHandshakeIsWithheld() async throws {
        let d = try doors()
        let pairing = try await paired(d)
        let held = try client(d.holdTlsPort)
        let rename = Task { await held.rename("p349-withheld", name: "never sent", door: pairing) }
        try await Task.sleep(nanoseconds: 500_000_000)
        rename.cancel()
        let result = await rename.value
        XCTAssertEqual(result, .notSent(.cancelled))
        XCTAssertTrue(result.withheld)
        print("P349_TRANSPORT|withheld|\(result)")
    }

    /// Row 5 (section 9.3): a rename through the shipping reader's renamer, as
    /// the app holds it (`any DoorReading`), so the requirement, not a fake,
    /// reaches the wire.
    func testARenameThroughTheReaderAsTheAppHoldsIt() async throws {
        let d = try doors()
        let pairing = try await paired(d)
        let reader: any DoorReading = PairedReader(client: try client(d.renamePort), door: pairing)
        let renamer = try XCTUnwrap(reader.renamer, "the paired reader renames nothing")
        let result = await renamer.rename("p349-reader", name: "from the reader")
        guard case .answered(let answer) = result else { return XCTFail("\(result)") }
        XCTAssertEqual(answer.outcome, .done)
        XCTAssertEqual(answer.name, "from the reader")
        print("P349_TRANSPORT|reader|\(answer.outcome.rawValue)")
    }
}

#if !DEBUG
/// A Release build has no seam, so the test maps the door to this Mac's
/// loopback itself, keeping the door's name as the TLS name and the `Host`.
private struct P349LoopbackTransport: DoorTransport {
    let port: Int

    func route(to door: DoorEndpoint) throws -> DoorRoute {
        guard door.isPublic else { throw DoorFailure.notPaired }
        return DoorRoute(host: "127.0.0.1", port: port)
    }
}
#endif
#endif
