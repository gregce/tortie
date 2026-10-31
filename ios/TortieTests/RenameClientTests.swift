import Foundation
import XCTest
@testable import Tortie

/// The rename's half of the one network file and the contract (Phase 349,
/// build/p349/SPEC.md §4.4 steps 1 and 2, D6, D9, D21; conformance:ios rules
/// ab, bd10): the body, the target, the route, the answer the Mac sends and
/// how one exchange's end is read as a rename's result. Nothing here dials;
/// a live exchange is `P349RenameTransportTests`' (under `test:ios`). Each
/// test names the clause it holds and fails when that clause is taken out of
/// Door/DoorClient.swift or Door/Contract.swift.
final class RenameClientTests: XCTestCase {
    private let id = "00112233445566778899aabbccddeeff"

    private func encoded<T: Encodable>(_ body: T) throws -> String {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.sortedKeys]
        return String(decoding: try encoder.encode(body), as: UTF8.self)
    }

    private func decode(_ json: String) -> PocketRenameAnswer? {
        try? JSONDecoder().decode(PocketRenameAnswer.self, from: Data(json.utf8))
    }

    private func answer(_ outcome: String, write: String? = nil, reason: String = "null", sentence: String = "null", name: String = "null", verb: String = "\"rename\"") -> String {
        #"{"verb":\#(verb),"write":"\#(write ?? id)","outcome":"\#(outcome)","reason":\#(reason),"sentence":\#(sentence),"name":\#(name)}"#
    }

    // MARK: The body (D6)

    /// Clause (D6, rule ab): the body is exactly `name`, `session` and
    /// `write`, sorted, the name exactly as given (spaces, quotes, dashes and
    /// all, never trimmed here), Swift writing `/` as `\/`; and the worst a
    /// 120-unit name can make, 120 controls each escaped beside the longest
    /// session id, is the 915 bytes D6 measured, under the door's 2,048.
    func testTheBodyIsExactlyItsThreeKeys() throws {
        XCTAssertEqual(
            try encoded(RenameBody(name: " it's \"x\" fix--auth ", session: "s-1", write: id)),
            #"{"name":" it's \"x\" fix--auth ","session":"s-1","write":"00112233445566778899aabbccddeeff"}"#
        )
        XCTAssertEqual(try encoded(RenameBody(name: "/review", session: "s", write: id)), #"{"name":"\/review","session":"s","write":"00112233445566778899aabbccddeeff"}"#)
        let worst = try encoded(RenameBody(name: String(repeating: "\u{0001}", count: NameRule.maxUnits), session: String(repeating: "x", count: 128), write: id))
        XCTAssertEqual(worst.utf8.count, 915)
        XCTAssertLessThanOrEqual(worst.utf8.count, 2_048)
        let astral = try encoded(RenameBody(name: String(repeating: "\u{1F600}", count: 60), session: String(repeating: "x", count: 128), write: id))
        XCTAssertLessThan(astral.utf8.count, worst.utf8.count, "Swift writes an astral character raw, four bytes, never escaped")
        let fields = try XCTUnwrap(try JSONSerialization.jsonObject(with: Data(worst.utf8)) as? [String: String])
        XCTAssertEqual(fields.keys.sorted(), ["name", "session", "write"])
        XCTAssertEqual(fields["name"], String(repeating: "\u{0001}", count: NameRule.maxUnits))
    }

    /// Clause (rule ab): the route is the rename's own path, a write with no
    /// session-write verb (its answer is a shape of its own), and its case
    /// names the session and the name and nothing else.
    func testTheRouteIsTheRenamesOwn() {
        XCTAssertEqual(DoorClient.renameTarget, "/v1/rename")
        let route = WriteRoute.rename(session: "s", name: "n")
        XCTAssertEqual(route.target, DoorClient.renameTarget)
        XCTAssertNil(route.verb, "a rename names a session write's verb, which the frozen phones read as a closed set")
        XCTAssertNotEqual(route, WriteRoute.rename(session: "s", name: "n "))
    }

    // MARK: The answer (D21)

    /// Clause (D21): six fields; the verb `rename`; a non-empty reason exactly
    /// when refused, read as an OPEN word; a non-empty sentence exactly when
    /// not done; the name the Mac stored, a non-empty one, exactly when done;
    /// anything else refused whole, a field left out included.
    func testTheAnswerIsStrictWithAnOpenReason() {
        let done = decode(answer("done", name: #""fix--auth""#))
        XCTAssertEqual(done?.name, "fix--auth")
        XCTAssertNil(done?.reason)
        XCTAssertNil(done?.sentence)
        for reason in ["malformed", "gone", "unreachable", "changed", "name", "a-later-macs-word"] {
            let read = decode(answer("refused", reason: "\"\(reason)\"", sentence: #""The Mac's words.""#))
            XCTAssertEqual(read?.reason, reason, reason)
            XCTAssertNil(read?.name, reason)
        }
        XCTAssertNotNil(decode(answer("busy", sentence: #""Busy.""#)))
        XCTAssertNotNil(decode(answer("failed", sentence: #""Tortie could not rename this session.""#)))
        let refusedWhole = [
            answer("done"),
            answer("done", name: #""""#),
            answer("done", name: "7"),
            answer("done", sentence: #""Done.""#, name: #""x""#),
            answer("done", reason: #""name""#, name: #""x""#),
            answer("refused", reason: #""name""#, sentence: #""s.""#, name: #""x""#),
            answer("busy", sentence: #""s.""#, name: #""x""#),
            answer("refused", sentence: #""s.""#),
            answer("refused", reason: #""""#, sentence: #""s.""#),
            answer("failed"),
            answer("maybe", name: #""x""#),
            answer("done", name: #""x""#, verb: #""remove""#),
            answer("done", name: #""x""#, verb: #""start""#),
            answer("done", name: #""x""#, verb: "null"),
            #"{"verb":"rename","write":"\#(id)","outcome":"done","reason":null,"sentence":null}"#
        ]
        for body in refusedWhole {
            XCTAssertNil(decode(body), body)
        }
        XCTAssertEqual(decode(answer("refused", write: "", reason: #""malformed""#, sentence: #""s.""#))?.echoesNoId, true)
        XCTAssertEqual(decode(answer("refused", write: "", reason: #""gone""#, sentence: #""s.""#))?.echoesNoId, false)
    }

    /// Clause: an answer reads back as it was written, its null fields
    /// written as null.
    func testTheAnswerRoundTrips() throws {
        for body in [answer("done", name: #""fix--auth""#), answer("refused", reason: #""changed""#, sentence: #""s.""#)] {
            let read = try XCTUnwrap(decode(body))
            let again = try JSONEncoder().encode(read)
            XCTAssertEqual(try JSONDecoder().decode(PocketRenameAnswer.self, from: again), read)
            let object = try XCTUnwrap(try JSONSerialization.jsonObject(with: again) as? [String: Any])
            XCTAssertEqual(object.keys.sorted(), ["name", "outcome", "reason", "sentence", "verb", "write"])
        }
    }

    // MARK: The result (D9)

    private func reply(_ status: Int, _ json: String) -> ExchangeEnd {
        ExchangeEnd(result: .success(DoorReply(status: status, body: Data(json.utf8))), handed: true)
    }

    /// Clause (D9): one exchange's end is read as a rename's result EXACTLY as
    /// a Remove's is: a 200 is an answer only when it names the rename and
    /// echoes this write's id (or `""` with `malformed`); a 404 is the door's
    /// refusal; a failure before the bytes were handed is not sent, after it
    /// no answer; anything else no answer.
    func testTheResultIsClassifiedAsARemovesIs() throws {
        let done = answer("done", name: #""fix--auth""#)
        let read = try XCTUnwrap(decode(done))
        XCTAssertEqual(RenameResult.of(reply(200, done), sent: id), .answered(read))
        XCTAssertEqual(RenameResult.of(reply(200, done), sent: "ffeeddccbbaa99887766554433221100"), .noAnswer, "another write's echo")
        XCTAssertEqual(RenameResult.of(reply(200, #"{"verb":"remove","write":"\#(id)","outcome":"done","reason":null,"sentence":null}"#), sent: id), .noAnswer, "a remove's answer")
        XCTAssertEqual(RenameResult.of(reply(200, answer("done")), sent: id), .noAnswer, "a done with no name")
        let malformed = answer("refused", write: "", reason: #""malformed""#, sentence: #""s.""#)
        XCTAssertEqual(RenameResult.of(reply(200, malformed), sent: id), .answered(try XCTUnwrap(decode(malformed))))
        XCTAssertEqual(RenameResult.of(reply(200, "not json"), sent: id), .noAnswer)
        XCTAssertEqual(RenameResult.of(reply(404, ""), sent: id), .notTaken)
        XCTAssertEqual(RenameResult.of(reply(500, ""), sent: id), .noAnswer)
        XCTAssertEqual(RenameResult.of(ExchangeEnd(result: .failure(DoorFailure.unreachable(code: 61)), handed: false), sent: id), .notSent(.unreachable(code: 61)))
        XCTAssertEqual(RenameResult.of(ExchangeEnd(result: .failure(DoorFailure.cancelled), handed: false), sent: id), .notSent(.cancelled))
        XCTAssertTrue(RenameResult.notSent(.cancelled).withheld)
        XCTAssertFalse(RenameResult.noAnswer.withheld)
        XCTAssertEqual(RenameResult.of(ExchangeEnd(result: .failure(DoorFailure.timedOut), handed: true), sent: id), .noAnswer)
        XCTAssertEqual(PostEnd.notSent(.notPaired, write: nil).asRename, .notSent(.notPaired))
        XCTAssertEqual(PostEnd.ended(reply(404, ""), write: id).asRename, .notTaken)
        XCTAssertEqual(PostEnd.ended(reply(200, done), write: id).asRename, .answered(read))
    }

    /// Clause (D21): a rename's answer is never read as another write's, nor
    /// another's as a rename's.
    func testNoOtherWritesAnswerIsARenames() throws {
        let rename = answer("done", name: #""x""#)
        XCTAssertEqual(RemoveResult.of(reply(200, rename), sent: id), .noAnswer, "a rename's answer read as a remove's")
        XCTAssertEqual(PasteResult.of(reply(200, rename), sent: id), .noAnswer, "a rename's answer read as a paste's")
        XCTAssertEqual(StartResult.of(reply(200, rename), sent: id), .noAnswer, "a rename's answer read as a start's")
        XCTAssertEqual(WriteResult.of(reply(200, rename), verb: .end, sent: id), .noAnswer, "a rename's answer read as an end's")
        for other in [
            #"{"verb":"paste","write":"\#(id)","outcome":"done","reason":null,"sentence":null}"#,
            #"{"verb":"start","write":"\#(id)","outcome":"done","reason":null,"sentence":null,"session":{"id":"made-1","name":"x"}}"#,
            #"{"verb":"end","write":"\#(id)","outcome":"done","reason":null,"sentence":null}"#
        ] {
            XCTAssertEqual(RenameResult.of(reply(200, other), sent: id), .noAnswer, other)
        }
    }

    // MARK: The client's one path, read from the source (rule ab, D9)

    /// Clause (rule ab, D9): `rename` goes through the one `signedPost` with no
    /// kept id, the body is built there alone with sorted keys, and the result
    /// is read by `asRename`.
    func testTheRenameIsOneCallOfTheOnePath() throws {
        let source = RenameTests.code(try StyleSource.text("ios/Tortie/Door/DoorClient.swift"))
        XCTAssertTrue(source.contains("func rename(_ sessionId: String, name: String, door: PairedDoor) async -> RenameResult {\n        await signedPost(route: .rename(session: sessionId, name: name), door: door, limits: limits, write: nil).asRename\n    }"), "rename is not one call of signedPost with no kept id")
        XCTAssertTrue(source.contains("case .rename(let session, let name):\n                body = try encoder.encode(RenameBody(name: name, session: session, write: id))"), "the body is not built in signedPost")
        XCTAssertEqual(source.components(separatedBy: "RenameBody(").count, 2, "a RenameBody is built outside signedPost")
        XCTAssertEqual(source.components(separatedBy: "JSONDecoder().decode(PocketRenameAnswer.self").count, 2)
    }
}
