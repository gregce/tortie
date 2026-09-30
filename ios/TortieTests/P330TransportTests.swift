import CryptoKit
import Foundation
import XCTest
@testable import Tortie

#if os(iOS)
/// THE CLIENT IDENTITY, MEASURED (build/p330/SPEC.md section 7.3, research 132
/// section 9 condition 1): the SHIPPING door client, over `NWConnection` and
/// TLS 1.3, presents a client identity the SHIPPING Keychain code made, and a
/// door that asks for a certificate reads the phone's key in the handshake.
///
/// `npm run test:ios` stands up an in-process Node door on this Mac's loopback
/// (build/p316/test-ios.mjs), which requests a certificate, records the key of
/// every certificate a handshake presents, and issues a client certificate
/// with the shipping `tls.ts` over a key the test hands it; and a second door
/// under another key that must serve nothing. Its ports and pin reach this test
/// through the runner's environment (`TEST_RUNNER_P330_*`). With none named it
/// skips: on its own it has no door to dial. If a row fails on iOS 18.3 the
/// phase stops and goes to him (the entry's S0).
final class P330TransportTests: XCTestCase {
    private struct Doors {
        let name: String
        let port: Int
        let pin: String
        let wrongPort: Int
    }

    private func doors() throws -> Doors {
        let env = ProcessInfo.processInfo.environment
        guard let name = env["P330_DOOR_NAME"], let port = Int(env["P330_DOOR_PORT"] ?? ""),
              let pin = env["P330_DOOR_PIN"], let wrongPort = Int(env["P330_WRONG_PORT"] ?? "") else {
            throw XCTSkip("test:ios stands up the door this test dials; on its own it has none.")
        }
        return Doors(name: name, port: port, pin: pin, wrongPort: wrongPort)
    }

    /// The shipping client, its connections opened on this Mac's loopback at
    /// `port` with the door's name kept as the TLS name and the `Host`: the
    /// DEBUG seam's own parse in a Debug build, and the same mapping written
    /// here in a Release build, which has no seam.
    private func client(_ port: Int) throws -> DoorClient {
        #if DEBUG
        let parsed = try XCTUnwrap(DoorEndpointDebugSeam.loopbackPort(["app", "-TortieDebugDoorEndpoint", "127.0.0.1:\(port)"]))
        return DoorClient(transport: DebugEndpointTransport(port: parsed))
        #else
        return DoorClient(transport: LoopbackTestTransport(port: port))
        #endif
    }

    private let keys = KeychainClientKeys()

    override func tearDown() {
        for tag in keys.tags() { keys.delete(tag: tag) }
    }

    private func json(_ reply: DoorReply) throws -> [String: String] {
        XCTAssertEqual(reply.status, 200)
        return try XCTUnwrap(JSONSerialization.jsonObject(with: reply.body) as? [String: String])
    }

    /// Row 1: a key the shipping code made in the Simulator's Keychain, a
    /// certificate the shipping `tls.ts` issued over it, the identity the
    /// Keychain makes of the two, presented by the shipping client: the door
    /// answers 200, and the key it read in the handshake is this key.
    func testAKeychainIdentityIsPresentedAndPinned() async throws {
        let d = try doors()
        let door = DoorEndpoint(name: d.name, port: 8443, pin: d.pin)
        let client = try client(d.port)
        let key = try keys.mint()
        let issue = try await client.exchange(
            method: "POST", target: "/p330/issue", headers: [], body: Data(#"{"ck":"\#(key.spki)"}"#.utf8), door: door, identity: nil
        )
        let certificate = try XCTUnwrap(Base64URL.decode(try XCTUnwrap(try json(issue)["cert"])))
        let identity = try keys.adopt(certificate, for: key)
        let reply = try await client.exchange(method: "GET", target: "/p330/whoami", headers: [], body: nil, door: door, identity: identity)
        let seen = try json(reply)
        let der = try XCTUnwrap(Base64URL.decode(key.spki))
        XCTAssertEqual(seen["pin"], Base64URL.encode(Data(SHA256.hash(data: der))), "the door read another key in the handshake")
        print("P330_TRANSPORT|identity|\(reply.status)|\(seen["pin"] ?? "none")")
    }

    /// Row 2: a door under another key is refused by the pin before a byte
    /// of the request is written; test:ios counts that door's requests, and
    /// they are zero.
    func testAWrongDoorKeyServesNothing() async throws {
        let d = try doors()
        let client = try client(d.wrongPort)
        do {
            _ = try await client.exchange(
                method: "POST", target: "/p330/issue", headers: [], body: Data("{}".utf8),
                door: DoorEndpoint(name: d.name, port: 8443, pin: d.pin), identity: nil
            )
            XCTFail("the wrong door answered")
        } catch {
            XCTAssertEqual(error as? DoorFailure, .wrongKey)
            print("P330_TRANSPORT|wrong-key|\(String(describing: error))")
        }
    }

    /// Row 3: a read with no identity, outside any window, is closed by the
    /// door after the handshake with no byte answered, and the phone says so
    /// as the door refusing it.
    func testNoIdentityIsClosedBeforeAnAnswer() async throws {
        let d = try doors()
        let client = try client(d.port)
        do {
            _ = try await client.exchange(
                method: "GET", target: "/p330/whoami", headers: [], body: nil,
                door: DoorEndpoint(name: d.name, port: 8443, pin: d.pin), identity: nil
            )
            XCTFail("the door answered a read with no identity")
        } catch {
            print("P330_TRANSPORT|no-identity|\(String(describing: error))")
            XCTAssertEqual(error as? DoorFailure, .closedBeforeAnswer)
        }
    }
}

#if !DEBUG
/// A Release build has no seam, so the test maps the door to this Mac's
/// loopback itself, keeping the door's name as the TLS name and the `Host`.
private struct LoopbackTestTransport: DoorTransport {
    let port: Int

    func route(to door: DoorEndpoint) throws -> DoorRoute {
        guard door.isPublic else { throw DoorFailure.notPaired }
        return DoorRoute(host: "127.0.0.1", port: port)
    }
}
#endif
#endif
