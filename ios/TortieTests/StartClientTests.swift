import Foundation
import XCTest
@testable import Tortie

/// The start's client half (Phase 346, build/p346/SPEC.md D5, D6, D15, D17,
/// rules bb1 and bb4): the body's bytes, how one exchange's end is read as a
/// start's result, the route, and the one write path's end read by both
/// kinds of write. Each test names the clause it holds and fails when that
/// clause is taken out of Door/DoorClient.swift.
final class StartClientTests: XCTestCase {
    private let id = "00112233445566778899aabbccddeeff"

    private func encoded<T: Encodable>(_ body: T) throws -> String {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.sortedKeys]
        return String(decoding: try encoder.encode(body), as: UTF8.self)
    }

    // MARK: The body (D6, D15)

    /// Clause (D6): the body is exactly `agent`, `project` and `write`, sorted,
    /// which is what the Mac's strict parse reads (`agent,project,write`).
    func testTheBodyIsExactlyItsThreeKeys() throws {
        XCTAssertEqual(
            try encoded(StartBody(agent: "claude", project: "0f6c1b2e-aa1b-4c9e-8d6f-1234567890ab", write: id)),
            #"{"agent":"claude","project":"0f6c1b2e-aa1b-4c9e-8d6f-1234567890ab","write":"00112233445566778899aabbccddeeff"}"#
        )
        let keys = try XCTUnwrap(
            try JSONSerialization.jsonObject(with: Data(try encoded(StartBody(agent: "a", project: "p", write: id)).utf8)) as? [String: Any]
        ).keys.sorted()
        XCTAssertEqual(keys, ["agent", "project", "write"], "nothing else leaves the phone: no path, flag, name, login or machine")
    }

    /// Clause (D6): the worst legal body is far under the door's cap of 512:
    /// a 64-character project id and the longest compiled agent id.
    func testTheWorstBodyIsUnderTheDoorsCap() throws {
        let worst = try encoded(StartBody(agent: "antigravity", project: String(repeating: "f", count: 64), write: id))
        XCTAssertLessThanOrEqual(worst.utf8.count, 512)
        XCTAssertFalse(worst.contains("\\"), "nothing in a project id or an agent id is escaped")
    }

    /// Clause: the target is a path with no query, and a start names no
    /// session write's verb, so `WriteResult` never reads its answer.
    func testTheRouteIsThePathAlone() {
        XCTAssertEqual(DoorClient.startTarget, "/v1/start")
        XCTAssertEqual(WriteRoute.start(project: "p", agent: "claude").target, DoorClient.startTarget)
        XCTAssertNil(WriteRoute.start(project: "p", agent: "claude").verb)
        XCTAssertEqual(WriteRoute.end(session: "s", batch: true).verb, .end)
    }

    // MARK: One exchange's end, read as a start's result (D5, D25)

    private func reply(_ status: Int, _ json: String, handed: Bool = true) -> ExchangeEnd {
        ExchangeEnd(result: .success(DoorReply(status: status, body: Data(json.utf8))), handed: handed)
    }

    private func answer(write: String, verb: String = "start", outcome: String = "done", reason: String = "null", sentence: String = "null", session: String = #"{"id":"made-1","name":"claude-1"}"#) -> String {
        #"{"verb":"\#(verb)","write":"\#(write)","outcome":"\#(outcome)","reason":\#(reason),"sentence":\#(sentence),"session":\#(session)}"#
    }

    /// Clause (bb1): a failure BEFORE the bytes were handed is not sent; after
    /// it, no answer: the Mac may have started the session.
    func testAFailureIsClassifiedByHanded() {
        let before = ExchangeEnd(result: .failure(DoorFailure.unreachable(code: 61)), handed: false)
        XCTAssertEqual(StartResult.of(before, sent: id), .notSent(.unreachable(code: 61)))
        let cancelled = ExchangeEnd(result: .failure(DoorFailure.cancelled), handed: false)
        XCTAssertEqual(StartResult.of(cancelled, sent: id), .notSent(.cancelled))
        XCTAssertTrue(StartResult.of(cancelled, sent: id).withheld)
        let after = ExchangeEnd(result: .failure(DoorFailure.timedOut), handed: true)
        XCTAssertEqual(StartResult.of(after, sent: id), .noAnswer)
        XCTAssertFalse(StartResult.of(after, sent: id).withheld)
    }

    /// Clause (bb1): a 200 is an answer only when it names the start and
    /// echoes the id it carried; anything else is no answer.
    func testAnAnswerIsTheStartsOwnOrNoAnswer() {
        guard case .answered(let done) = StartResult.of(reply(200, answer(write: id)), sent: id) else {
            return XCTFail("an honest done read as no answer")
        }
        XCTAssertEqual(done.session?.id, "made-1")
        XCTAssertEqual(StartResult.of(reply(200, answer(write: id, verb: "end")), sent: id), .noAnswer)
        XCTAssertEqual(StartResult.of(reply(200, answer(write: "ffffffffffffffffffffffffffffffff")), sent: id), .noAnswer)
        XCTAssertEqual(StartResult.of(reply(200, answer(write: "", outcome: "refused", reason: #""project""#, sentence: #""Gone.""#, session: "null")), sent: id), .noAnswer)
        XCTAssertEqual(StartResult.of(reply(200, answer(write: id, outcome: "done", session: "null")), sent: id), .noAnswer, "a done with no session is no answer")
        XCTAssertEqual(StartResult.of(reply(200, "not json"), sent: id), .noAnswer)
        XCTAssertEqual(StartResult.of(reply(200, #"{"verb":"end","write":"\#(id)","outcome":"done","reason":null,"sentence":null}"#), sent: id), .noAnswer, "a session write's answer is not a start's")
    }

    /// Clause (bb1, D5): the one empty echo is `refused` `malformed`.
    func testTheEmptyEchoIsMalformedAlone() {
        let malformed = StartResult.of(reply(200, answer(write: "", outcome: "refused", reason: #""malformed""#, sentence: #""Unreadable.""#, session: "null")), sent: id)
        guard case .answered(let read) = malformed else { return XCTFail("the malformed answer read as no answer") }
        XCTAssertTrue(read.echoesNoId)
    }

    /// Clause (D25): a 404 is not taken; any other status is no answer.
    func testA404IsNotTaken() {
        XCTAssertEqual(StartResult.of(reply(404, ""), sent: id), .notTaken)
        XCTAssertEqual(StartResult.of(reply(500, ""), sent: id), .noAnswer)
        XCTAssertEqual(StartResult.of(reply(302, ""), sent: id), .noAnswer)
    }

    // MARK: The one write path's end, read by both kinds of write

    /// Clause: the path's end becomes a start's result with the id it went
    /// with, and a session write's exactly as before this phase.
    func testThePathsEndIsReadByEachVerb() {
        let unsent = PostEnd.notSent(.notPaired, write: nil)
        XCTAssertEqual(unsent.asStart, SentStart(result: .notSent(.notPaired), write: nil))
        XCTAssertEqual(unsent.asWrite(verb: .end), SentWrite(result: .notSent(.notPaired), write: nil))
        let ran = PostEnd.ended(reply(200, answer(write: id)), write: id)
        guard case .answered = ran.asStart.result else { return XCTFail("a start's answer did not read") }
        XCTAssertEqual(ran.asStart.write, id)
        XCTAssertEqual(ran.asWrite(verb: .end).result, .noAnswer, "a start's answer is never an End's")
        let ended = PostEnd.ended(reply(200, #"{"verb":"end","write":"\#(id)","outcome":"done","reason":null,"sentence":null}"#), write: id)
        guard case .answered = ended.asWrite(verb: .end).result else { return XCTFail("an End's answer did not read") }
        XCTAssertEqual(ended.asStart.result, .noAnswer, "an End's answer is never a start's")
        let held = PostEnd.ended(ExchangeEnd(result: .failure(DoorFailure.timedOut), handed: true), write: id)
        XCTAssertEqual(held.asStart, SentStart(result: .noAnswer, write: id), "no answer keeps the id it went with (D17)")
    }

    // MARK: Never retried, never a loop

    /// Clause (bb1): `DoorClient.start` is one call of the one write path, and
    /// a kept id that is not well formed is not used.
    func testTheStartIsOneCallOfTheOnePath() throws {
        let source = try StyleSource.text("ios/Tortie/Door/DoorClient.swift")
        let start = try XCTUnwrap(source.range(of: "func start(project: String, agent: String, write: String?, door: PairedDoor) async -> SentStart {"))
        let body = String(source[start.upperBound...].prefix { $0 != "}" })
        XCTAssertEqual(body.components(separatedBy: "signedPost(").count, 2, "one call of signedPost")
        XCTAssertFalse(body.contains("while") || body.contains("repeat") || body.contains("for "), "never a loop")
        XCTAssertTrue(source.contains("case .start(let project, let agent):\n                body = try encoder.encode(StartBody(agent: agent, project: project, write: id))"), "the body is built in signedPost alone")
    }
}
