import Foundation
import XCTest
@testable import Tortie

/// The two writes' client half (Phase 317, build/p317/SPEC.md section 5.8.1):
/// the bodies' bytes, the write id, how one exchange's end is read as a
/// write's result, and that a write is asked for once and never again. Each
/// test names the clause it holds, and each fails when that clause is taken
/// out of Door/DoorClient.swift.
final class WriteClientTests: XCTestCase {
    private let id = "00112233445566778899aabbccddeeff"

    private func encoded<T: Encodable>(_ body: T) throws -> String {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.sortedKeys]
        return String(decoding: try encoder.encode(body), as: UTF8.self)
    }

    // MARK: The bodies

    /// Clause: the body is exactly its keys, written sorted, which is what
    /// the Mac's strict parse reads (`batch,session,write`).
    func testTheBodiesAreExactlyTheirKeys() throws {
        XCTAssertEqual(
            try encoded(EndBody(batch: false, session: "s-1", write: id)),
            #"{"batch":false,"session":"s-1","write":"00112233445566778899aabbccddeeff"}"#
        )
        XCTAssertEqual(
            try encoded(EndBody(batch: true, session: "s-1", write: id)),
            #"{"batch":true,"session":"s-1","write":"00112233445566778899aabbccddeeff"}"#
        )
    }

    /// Clause (section 5.3.3): the worst legal body is 199 bytes for End (198
    /// with `batch: true`), under the door's cap of 512, and Swift's encoder
    /// escapes nothing in the session id's alphabet.
    func testTheWorstBodiesAreUnderTheDoorsCaps() throws {
        let alphabet = Array("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789._:-")
        let session = String((0..<128).map { alphabet[$0 % alphabet.count] })
        XCTAssertEqual(session.count, 128)
        let worst = try encoded(EndBody(batch: false, session: session, write: id))
        XCTAssertEqual(worst.utf8.count, 199)
        XCTAssertFalse(worst.contains("\\"), "an escaped character changes the body's length")
        XCTAssertEqual(try encoded(EndBody(batch: true, session: session, write: id)).utf8.count, 198)
        XCTAssertLessThanOrEqual(worst.utf8.count, 512)
    }

    /// Clause: the target is a path with no query, and the route names its
    /// verb.
    func testTheTargetsAreThePathsAlone() {
        XCTAssertEqual(DoorClient.endTarget, "/v1/end")
        XCTAssertEqual(WriteRoute.end(session: "s", batch: true).target, DoorClient.endTarget)
        XCTAssertEqual(WriteRoute.end(session: "s", batch: false).verb, .end)
    }

    // MARK: The write id

    /// Clause: 16 random bytes as 32 lowercase hex, a new one every call:
    /// 10,000 calls, 10,000 ids, every one well formed.
    func testAWriteIdIsFreshEveryCall() throws {
        var seen = Set<String>()
        for _ in 0..<10_000 {
            let fresh = try XCTUnwrap(WriteId.fresh())
            XCTAssertTrue(WriteId.isWellFormed(fresh), fresh)
            seen.insert(fresh)
        }
        XCTAssertEqual(seen.count, 10_000)
        XCTAssertFalse(WriteId.isWellFormed(String(repeating: "A", count: 32)), "uppercase hex is not the Mac's")
        XCTAssertFalse(WriteId.isWellFormed(String(repeating: "a", count: 33)))
        XCTAssertFalse(WriteId.isWellFormed(String(repeating: "g", count: 32)))
    }

    // MARK: One exchange's end, read as a write's result

    private func reply(_ status: Int, _ json: String) -> ExchangeEnd {
        ExchangeEnd(result: .success(DoorReply(status: status, body: Data(json.utf8))), handed: true)
    }

    private func answer(write: String, outcome: String = "done", reason: String = "null", sentence: String = "null", verb: String = "end") -> String {
        #"{"verb":"\#(verb)","write":"\#(write)","outcome":"\#(outcome)","reason":\#(reason),"sentence":\#(sentence)}"#
    }

    /// Clause (`handed`, not `written`): a failure before the request's bytes
    /// were handed is `notSent` with its failure; the same failure after them
    /// is `noAnswer`, because the bytes may have reached the Mac.
    func testAFailureIsReadByWhetherTheBytesWereHanded() {
        let before = ExchangeEnd(result: .failure(DoorFailure.unreachable(code: 61)), handed: false)
        XCTAssertEqual(WriteResult.of(before, verb: .end, sent: id), .notSent(.unreachable(code: 61)))
        let after = ExchangeEnd(result: .failure(DoorFailure.unreachable(code: 61)), handed: true)
        XCTAssertEqual(WriteResult.of(after, verb: .end, sent: id), .noAnswer)
        let timedOut = ExchangeEnd(result: .failure(DoorFailure.timedOut), handed: true)
        XCTAssertEqual(WriteResult.of(timedOut, verb: .end, sent: id), .noAnswer)
        let withheld = ExchangeEnd(result: .failure(DoorFailure.cancelled), handed: false)
        XCTAssertEqual(WriteResult.of(withheld, verb: .end, sent: id), .notSent(.cancelled))
        XCTAssertTrue(WriteResult.of(withheld, verb: .end, sent: id).withheld)
        XCTAssertFalse(WriteResult.notSent(.timedOut).withheld)
    }

    /// Clause: a 200 is an answer only with the id this write carried echoed;
    /// any other id, this write's verb not named, a word outside the closed
    /// sets, or a body that is not the shape is `noAnswer`.
    func testAnAnswerMustEchoTheIdItCarried() {
        XCTAssertEqual(
            WriteResult.of(reply(200, answer(write: id)), verb: .end, sent: id),
            .answered(PocketWriteAnswer(verb: .end, write: id, outcome: .done, reason: nil, sentence: nil))
        )
        let other = "ffeeddccbbaa99887766554433221100"
        XCTAssertEqual(WriteResult.of(reply(200, answer(write: other)), verb: .end, sent: id), .noAnswer)
        XCTAssertEqual(WriteResult.of(reply(200, answer(write: id, verb: "unpair")), verb: .end, sent: id), .noAnswer)
        XCTAssertEqual(WriteResult.of(reply(200, answer(write: id, outcome: "maybe")), verb: .end, sent: id), .noAnswer)
        XCTAssertEqual(WriteResult.of(reply(200, "{}"), verb: .end, sent: id), .noAnswer)
        XCTAssertEqual(WriteResult.of(reply(200, "not json"), verb: .end, sent: id), .noAnswer)
    }

    /// Clause (F14): the one empty echo accepted is `refused` `malformed`,
    /// the Mac's answer when it could read no id; an empty echo on any other
    /// outcome or reason is `noAnswer`.
    func testOnlyAMalformedRefusalMayEchoNothing() {
        let unreadable = #""Your Mac could not read that request. Nothing was done.""#
        let malformed = WriteResult.of(
            reply(200, answer(write: "", outcome: "refused", reason: #""malformed""#, sentence: unreadable)), verb: .end, sent: id
        )
        guard case .answered(let said) = malformed else { return XCTFail("\(malformed)") }
        XCTAssertEqual(said.reason, .malformed)
        XCTAssertEqual(
            WriteResult.of(reply(200, answer(write: "", outcome: "refused", reason: #""ended""#, sentence: unreadable)), verb: .end, sent: id),
            .noAnswer
        )
        XCTAssertEqual(WriteResult.of(reply(200, answer(write: "")), verb: .end, sent: id), .noAnswer)
    }

    /// Clause: a 404 is the door's own refusal before the act, `notTaken`.
    func testA404IsNotTaken() {
        XCTAssertEqual(WriteResult.of(reply(404, ""), verb: .end, sent: id), .notTaken)
    }

    // MARK: Through the shipping client, once

    #if os(iOS)
    /// A pairing as Door/ keeps it, from the vectors' code and certificate.
    private func pairedDoor() throws -> PairedDoor {
        let v = try DoorVectorFile.load()
        let offer = try PairingOffer.parse(try XCTUnwrap(v.qr.first).payload)
        let certificate = try XCTUnwrap(Data(base64Encoded: v.client.certificateDer))
        let keys = MemoryClientKeys(spki: v.keys.clientKey)
        let key = try keys.mint()
        return try XCTUnwrap(PairedDoor(
            endpoint: offer.door, macSigningKey: offer.macSigningKey, macExchangeKey: offer.macExchangeKey,
            label: "p317-phone-label", pairedAt: 1_759_190_400_000, keys: PhoneKeys.generate(), clientKey: key,
            certificate: certificate, identity: try keys.adopt(certificate, for: key),
            alerts: AlertsKept(macSends: false, presented: nil)
        ))
    }

    override func tearDown() {
        TestIdentity.removeFromKeychain()
    }

    /// Clause (no retry): a write whose connection could not be made is asked
    /// for ONCE: one route asked, `notSent`, and nothing after it.
    func testAWriteThatCannotBeSentIsAskedOnce() async throws {
        let door = try pairedDoor()
        let refusing = CountingTransport(route: nil)
        let end = await DoorClient(transport: refusing).end("s-1", batch: false, door: door)
        XCTAssertEqual(end, .notSent(.notPaired))
        XCTAssertEqual(refusing.asked, 1)
    }

    /// Clause (no retry, and `handed`): a door that refuses the connection
    /// before any handshake is `notSent`, asked for once.
    func testARefusedConnectionIsNotSentAndAskedOnce() async throws {
        let door = try pairedDoor()
        let nobody = CountingTransport(route: DoorRoute(host: "127.0.0.1", port: 1))
        let result = await DoorClient(transport: nobody).end("s-1", batch: false, door: door)
        guard case .notSent = result else { return XCTFail("\(result)") }
        XCTAssertFalse(result.withheld)
        XCTAssertEqual(nobody.asked, 1)
    }

    /// Clause (withheld): a write whose task was cancelled before it began is
    /// never dialled: `.notSent(.cancelled)`.
    func testAWriteCancelledBeforeItBeganIsWithheld() async throws {
        let door = try pairedDoor()
        let transport = CountingTransport(route: DoorRoute(host: "127.0.0.1", port: 1))
        let client = DoorClient(transport: transport)
        let task = Task { () -> WriteResult in
            withUnsafeCurrentTask { $0?.cancel() }
            return await client.end("s-1", batch: false, door: door)
        }
        let result = await task.value
        XCTAssertEqual(result, .notSent(.cancelled))
        XCTAssertTrue(result.withheld)
    }
    #endif
}

/// A transport that counts how often it is asked, and routes to `route`, or
/// refuses when it is nil.
final class CountingTransport: DoorTransport, @unchecked Sendable {
    private let lock = NSLock()
    private let route: DoorRoute?
    private var count = 0

    init(route: DoorRoute?) {
        self.route = route
    }

    var asked: Int { lock.withLock { count } }

    func route(to door: DoorEndpoint) throws -> DoorRoute {
        lock.withLock { count += 1 }
        guard let route else { throw DoorFailure.notPaired }
        return route
    }
}
