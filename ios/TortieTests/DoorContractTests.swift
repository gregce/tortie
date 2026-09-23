import Foundation
import XCTest
@testable import Tortie

/// A door's answer is somebody else's bytes. These are the shapes a hostile or
/// broken door can send, and what the phone does with each: the whole answer
/// refused, never half of it drawn; and the conversation paged by its own
/// rule, never forever (build/p316/SPEC.md section 4 S2, Method B).
///
/// Each test names the clause it holds and fails when that clause is taken
/// out of `ios/Tortie/Door/Contract.swift`.
final class DoorContractTests: XCTestCase {
    private func row(_ overrides: [String: Any?] = [:], dropping: [String] = []) -> [String: Any] {
        var fields: [String: Any] = [
            "sessionId": "s1", "name": "fix-login", "project": "tortie", "machine": NSNull(),
            "agent": "claude", "agentLabel": "Claude Code", "statusLabel": "needs input",
            "statusTitle": "Needs input", "statusDot": "attention", "question": NSNull(),
            "choices": [], "blockedSince": 1_790_000_000_000.0, "seenAtWake": false, "ageText": "2m"
        ]
        for (key, value) in overrides { fields[key] = value ?? NSNull() }
        for key in dropping { fields.removeValue(forKey: key) }
        return fields
    }

    private func blocked(rows: [[String: Any]], dropping: [String] = []) throws -> Data {
        var fields: [String: Any] = [
            "rows": rows, "others": [], "othersOmitted": 0, "at": 1_790_000_000_000.0,
            "emptyLine": "Nothing needs you", "ageNote": "Waits first seen after your Mac wakes or Tortie restarts are timed from then."
        ]
        for key in dropping { fields.removeValue(forKey: key) }
        return try JSONSerialization.data(withJSONObject: fields)
    }

    private func decodes(_ data: Data) -> Bool {
        (try? JSONDecoder().decode(PocketBlockedAnswer.self, from: data)) != nil
    }

    // MARK: Decoding

    /// Control: the honest shape decodes.
    func testTheHonestShapeDecodes() throws {
        XCTAssertTrue(decodes(try blocked(rows: [row()])))
    }

    /// Clause: a required field missing refuses the WHOLE answer.
    func testAMissingFieldRefusesTheWholeAnswer() throws {
        XCTAssertFalse(decodes(try blocked(rows: [row(), row(dropping: ["statusTitle"])])))
        XCTAssertFalse(decodes(try blocked(rows: [row()], dropping: ["others"])))
        XCTAssertFalse(decodes(try blocked(rows: [row()], dropping: ["ageNote"])))
    }

    /// Clause: a field that may be null must still be SENT. A missing
    /// `machine` or `question` is not "this Mac" or "no question".
    func testANullableFieldMissingRefusesTheAnswer() throws {
        XCTAssertFalse(decodes(try blocked(rows: [row(dropping: ["machine"])])))
        XCTAssertFalse(decodes(try blocked(rows: [row(dropping: ["question"])])))
        XCTAssertTrue(decodes(try blocked(rows: [row(["machine": "Mac Pro", "question": "Proceed?"])])))
    }

    /// Clause: a field of the wrong type refuses the answer.
    func testAWrongTypeRefusesTheAnswer() throws {
        XCTAssertFalse(decodes(try blocked(rows: [row(["seenAtWake": "no"])])))
        XCTAssertFalse(decodes(try blocked(rows: [row(["choices": [["marker": 1, "text": "Yes"]]])])))
        XCTAssertFalse(decodes(try blocked(rows: [row(["name": 7])])))
    }

    /// Clause: a word or a dot the phone does not know is still main's word,
    /// and only the dot's colour falls back.
    func testAnUnknownStatusWordAndDotAreKept() throws {
        let data = try blocked(rows: [row(["statusLabel": "pondering", "statusTitle": "Pondering", "statusDot": "violet"])])
        let answer = try JSONDecoder().decode(PocketBlockedAnswer.self, from: data)
        XCTAssertEqual(answer.rows[0].statusTitle, "Pondering")
        XCTAssertEqual(answer.rows[0].dot, .unknown)
        XCTAssertEqual(StatusDot(name: "unknown"), .unknown)
        XCTAssertEqual(StatusDot(name: "attention"), .attention)
    }

    /// Clause: a fractional epoch is a clock, not a refusal.
    func testAFractionalClockDecodes() throws {
        XCTAssertTrue(decodes(try blocked(rows: [row(["blockedSince": 1_790_000_000_000.5])])))
    }

    /// Clause: `/pair` answers one of three words, and nothing else decodes.
    func testThePairAnswerIsOneOfThreeWords() throws {
        for word in ["pending", "allowed", "refused"] {
            XCTAssertEqual(try JSONDecoder().decode(PairAnswer.self, from: Data("{\"state\":\"\(word)\"}".utf8)).rawValue, word)
        }
        for body in ["{\"state\":\"ALLOWED\"}", "{\"state\":\"ok\"}", "{\"state\":1}", "{}", "[]", "allowed", ""] {
            XCTAssertNil(try? JSONDecoder().decode(PairAnswer.self, from: Data(body.utf8)), body)
        }
    }

    /// Clause: a turn with its ask missing, or its index a string, refuses
    /// the page.
    func testABrokenTurnRefusesThePage() throws {
        let good = #"{"sessionId":"s","turns":[{"index":0,"askText":"a","askClipped":false,"askAt":null,"answerText":null,"answerClipped":false,"answerAt":null,"closed":false,"interrupted":false,"notice":null,"absence":"x"}],"more":false,"at":1,"note":null}"#
        XCTAssertNotNil(try? JSONDecoder().decode(PocketTurnsAnswer.self, from: Data(good.utf8)))
        let noAsk = good.replacingOccurrences(of: #""askText":"a","#, with: "")
        XCTAssertNil(try? JSONDecoder().decode(PocketTurnsAnswer.self, from: Data(noAsk.utf8)))
        let stringIndex = good.replacingOccurrences(of: #""index":0"#, with: #""index":"0""#)
        XCTAssertNil(try? JSONDecoder().decode(PocketTurnsAnswer.self, from: Data(stringIndex.utf8)))
        let noNote = good.replacingOccurrences(of: #","note":null"#, with: "")
        XCTAssertNil(try? JSONDecoder().decode(PocketTurnsAnswer.self, from: Data(noNote.utf8)))
    }

    // MARK: Whole numbers (his ruling of 2026-09-23)

    /// What a door could not have sent: `Int.max`, `Int.min`, `-1`, and one past
    /// `Number.MAX_SAFE_INTEGER`. Spelled as JSON so the decoder reads the digits.
    private let outsideTheBound = ["9223372036854775807", "-9223372036854775808", "-1", "9007199254740992"]

    private func decodesAs<T: Decodable>(_ type: T.Type, _ json: String) -> Bool {
        (try? JSONDecoder().decode(T.self, from: Data(json.utf8))) != nil
    }

    /// Clause: a whole number the door could not have sent refuses the WHOLE
    /// answer, the way a missing field does, in every place the contract
    /// carries one: the omitted count, both message counts, the turn count
    /// and a turn's index. The bound itself decodes.
    func testAWholeNumberNoDoorCouldSendRefusesTheAnswer() {
        let list = #"{"rows":[],"others":[],"othersOmitted":N,"at":1,"emptyLine":"e","ageNote":"a"}"#
        let session = #"{"session":{"sessionId":"s1","name":"n","project":"p","machine":null,"agent":"claude","agentLabel":"Claude Code","statusLabel":"working","statusTitle":"Working","statusDot":"working","question":null,"choices":[],"blockedSince":1,"seenAtWake":false,"ageText":"now","catchUp":null,"lastAnswer":null,"turnCount":T,"handoff":null,"activity":{"sessionId":"s1","coverage":"complete","reason":null,"userMessages":U,"agentMessages":A,"lastMessageAt":null,"lastMessageBy":null,"lastMessageClock":null,"readAt":1},"lastMessageText":null},"at":1}"#
        let turns = #"{"sessionId":"s","turns":[{"index":I,"askText":"a","askClipped":false,"askAt":null,"answerText":null,"answerClipped":false,"answerAt":null,"closed":false,"interrupted":false,"notice":null,"absence":"x"}],"more":false,"at":1,"note":null}"#
        func sessionWith(t: String = "3", u: String = "4", a: String = "5") -> String {
            session.replacingOccurrences(of: ":T,", with: ":\(t),")
                .replacingOccurrences(of: ":U,", with: ":\(u),")
                .replacingOccurrences(of: ":A,", with: ":\(a),")
        }
        // Controls: small counts, the bound itself, and a null count.
        for n in ["0", "3", "9007199254740991"] {
            XCTAssertTrue(decodesAs(PocketBlockedAnswer.self, list.replacingOccurrences(of: ":N,", with: ":\(n),")), n)
            XCTAssertTrue(decodesAs(PocketSessionAnswer.self, sessionWith(t: n, u: n, a: n)), n)
            XCTAssertTrue(decodesAs(PocketTurnsAnswer.self, turns.replacingOccurrences(of: ":I,", with: ":\(n),")), n)
        }
        XCTAssertTrue(decodesAs(PocketSessionAnswer.self, sessionWith(u: "null", a: "null")), "a null count is not a number to bound")
        for n in outsideTheBound {
            XCTAssertFalse(decodesAs(PocketBlockedAnswer.self, list.replacingOccurrences(of: ":N,", with: ":\(n),")), "othersOmitted \(n)")
            XCTAssertFalse(decodesAs(PocketSessionAnswer.self, sessionWith(t: n)), "turnCount \(n)")
            XCTAssertFalse(decodesAs(PocketSessionAnswer.self, sessionWith(u: n)), "userMessages \(n)")
            XCTAssertFalse(decodesAs(PocketSessionAnswer.self, sessionWith(a: n)), "agentMessages \(n)")
            XCTAssertFalse(decodesAs(PocketTurnsAnswer.self, turns.replacingOccurrences(of: ":I,", with: ":\(n),")), "index \(n)")
        }
    }

    /// Clause: the one checked sum and difference answer nil, never trap, for
    /// any operand the door could not send and for any result that overflows
    /// or goes below zero; the bound is JavaScript's `Number.MAX_SAFE_INTEGER`.
    func testTheCheckedArithmeticNeverTraps() {
        XCTAssertEqual(DoorNumber.largest, 9_007_199_254_740_991)
        for n in [Int.max, Int.min, -1, DoorNumber.largest + 1] {
            XCTAssertFalse(DoorNumber.isCount(n), "\(n)")
            XCTAssertNil(DoorNumber.sum(n, 1), "\(n) + 1")
            XCTAssertNil(DoorNumber.sum(1, n), "1 + \(n)")
            XCTAssertNil(DoorNumber.sum(n, n), "\(n) + \(n)")
            XCTAssertNil(DoorNumber.difference(n, 1), "\(n) - 1")
            XCTAssertNil(DoorNumber.difference(1, n), "1 - \(n)")
            XCTAssertNil(DoorNumber.difference(n, n), "\(n) - \(n)")
        }
        let top = DoorNumber.largest
        XCTAssertEqual(DoorNumber.sum(top, top), 18_014_398_509_481_982, "two counts at the bound sum without overflow")
        XCTAssertEqual(DoorNumber.sum(2, 3), 5)
        XCTAssertEqual(DoorNumber.difference(5, 3), 2)
        XCTAssertEqual(DoorNumber.difference(top, 0), top)
        XCTAssertNil(DoorNumber.difference(3, 5), "a count is never negative")
        XCTAssertNil(DoorNumber.difference(0, 1))
    }

    /// Clause: a page holding an index the door could not send is refused,
    /// newest, older or a refresh, and paging stops; at the bound itself the
    /// one checked sum over a held index keeps the older turns.
    func testAnIndexNoDoorCouldSendIsRefused() throws {
        for n in [Int.max, Int.min, -1, DoorNumber.largest + 1] {
            var newest = TurnPages(sessionId: "s")
            XCTAssertThrowsError(try newest.acceptNewest(page([n], more: false)), "\(n)") {
                XCTAssertEqual($0 as? DoorFailure, .badPage)
            }
            XCTAssertTrue(newest.turns.isEmpty)

            var older = TurnPages(sessionId: "s")
            try older.acceptNewest(page([10, 11], more: true))
            XCTAssertThrowsError(try older.acceptOlder(page([n], more: true), askedTo: 9), "\(n)")
            XCTAssertNil(older.olderBound, "a refusal stops the paging")

            var refresh = TurnPages(sessionId: "s")
            try refresh.acceptNewest(page([10, 11], more: false))
            XCTAssertThrowsError(try refresh.acceptNewest(page([11, n], more: false)), "\(n)")
            XCTAssertEqual(refresh.turns.map(\.index), [10, 11])
        }
        let top = DoorNumber.largest
        var edge = TurnPages(sessionId: "s")
        try edge.acceptNewest(page([top - 2, top - 1], more: true))
        try edge.acceptNewest(page([top - 1, top], more: true))
        XCTAssertEqual(edge.turns.map(\.index), [top - 2, top - 1, top])
        XCTAssertEqual(edge.olderBound, top - 3)
    }

    // MARK: Paging

    private func turn(_ index: Int, _ answer: String? = "a") -> PocketTurn {
        PocketTurn(
            index: index, askText: "ask \(index)", askClipped: false, askAt: nil,
            answerText: answer, answerClipped: false, answerAt: nil,
            closed: answer != nil, interrupted: false, notice: nil,
            absence: answer == nil ? "not yet" : nil
        )
    }

    private func page(_ indexes: [Int], more: Bool, session: String = "s", note: String? = nil) -> PocketTurnsAnswer {
        PocketTurnsAnswer(sessionId: session, turns: indexes.map { turn($0) }, more: more, at: 1, note: note)
    }

    /// Clause: a page whose indexes do not strictly rise is refused.
    func testAPageThatGoesBackwardsIsRefused() {
        var pages = TurnPages(sessionId: "s")
        XCTAssertThrowsError(try pages.acceptNewest(page([5, 4, 6], more: false))) {
            XCTAssertEqual($0 as? DoorFailure, .badPage)
        }
        XCTAssertThrowsError(try pages.acceptNewest(page([5, 5], more: false)))
        XCTAssertThrowsError(try pages.acceptNewest(page([-1, 0], more: false)), "a negative index is not an index")
        XCTAssertTrue(pages.turns.isEmpty, "nothing of a refused page is kept")
    }

    /// Clause: an older page that overlaps what is held, or reaches past what
    /// was asked, is refused, and paging stops.
    func testAnOlderPageThatOverlapsIsRefusedAndStops() throws {
        var pages = TurnPages(sessionId: "s")
        try pages.acceptNewest(page(Array(20...29), more: true))
        XCTAssertEqual(pages.olderBound, 19)
        XCTAssertThrowsError(try pages.acceptOlder(page(Array(15...20), more: true), askedTo: 19)) {
            XCTAssertEqual($0 as? DoorFailure, .badPage)
        }
        XCTAssertEqual(pages.turns.map(\.index), Array(20...29), "the overlapping page added nothing")
        XCTAssertNil(pages.olderBound, "a refusal stops the paging")

        var again = TurnPages(sessionId: "s")
        try again.acceptNewest(page(Array(20...29), more: true))
        XCTAssertThrowsError(try again.acceptOlder(page([18, 25], more: true), askedTo: 19))
        XCTAssertEqual(again.turns.map(\.index), Array(20...29))
    }

    /// Clause: a page for another session is not this conversation.
    func testAPageForAnotherSessionIsRefused() throws {
        var pages = TurnPages(sessionId: "s")
        XCTAssertThrowsError(try pages.acceptNewest(page([1], more: false, session: "other")))
        try pages.acceptNewest(page([10], more: true))
        XCTAssertThrowsError(try pages.acceptOlder(page([9], more: true, session: "other"), askedTo: 9))
        XCTAssertNil(pages.olderBound)
    }

    /// Clause: `more: true` on a page that adds nothing STOPS the paging.
    func testMoreOnAnEmptyPageStops() throws {
        var pages = TurnPages(sessionId: "s")
        try pages.acceptNewest(page(Array(5...9), more: true))
        XCTAssertEqual(pages.olderBound, 4)
        try pages.acceptOlder(page([], more: true), askedTo: 4)
        XCTAssertNil(pages.olderBound)
        XCTAssertFalse(pages.hasOlder)

        var empty = TurnPages(sessionId: "s")
        try empty.acceptNewest(page([], more: true))
        XCTAssertNil(empty.olderBound, "an empty newest page never says go on")
    }

    /// Clause: a door that says `more: true` forever still ends, at the first
    /// turn, in a bounded number of pages.
    func testMoreForeverEndsAtTheFirstTurn() throws {
        var pages = TurnPages(sessionId: "s")
        try pages.acceptNewest(page(Array(90...99), more: true))
        var asked = 0
        while let to = pages.olderBound {
            asked += 1
            XCTAssertLessThan(asked, 100, "paged forever")
            try pages.acceptOlder(page(Array(max(0, to - 9)...to), more: true), askedTo: to)
        }
        XCTAssertEqual(pages.turns.map(\.index), Array(0...99))
        XCTAssertEqual(asked, 9)
    }

    /// Clause: a refresh that continues what is held keeps the older turns and
    /// replaces the newest; anything else starts again from the new page.
    func testARefreshKeepsOlderTurnsOnlyWhenItContinues() throws {
        var pages = TurnPages(sessionId: "s")
        try pages.acceptNewest(page(Array(20...29), more: true))
        try pages.acceptOlder(page(Array(10...19), more: true), askedTo: 19)
        XCTAssertEqual(pages.olderBound, 9)

        // The newest turn's answer arrived, and one turn more.
        let refreshed = PocketTurnsAnswer(
            sessionId: "s", turns: Array(21...30).map { turn($0, "new \($0)") }, more: true, at: 2, note: nil
        )
        try pages.acceptNewest(refreshed)
        XCTAssertEqual(pages.turns.map(\.index), Array(10...30))
        XCTAssertEqual(pages.turns.last?.answerText, "new 30")
        XCTAssertEqual(pages.turns.first { $0.index == 25 }?.answerText, "new 25")
        XCTAssertEqual(pages.olderBound, 9, "the older pages are still older")

        // A gap: the conversation moved on further than one page.
        try pages.acceptNewest(page(Array(50...59), more: true))
        XCTAssertEqual(pages.turns.map(\.index), Array(50...59))
        XCTAssertEqual(pages.olderBound, 49)

        // Shorter than what is held: the record changed, start again.
        try pages.acceptNewest(page(Array(50...55), more: false))
        XCTAssertEqual(pages.turns.map(\.index), Array(50...55))
        XCTAssertNil(pages.olderBound)

        // Continues what is held but ends before its newest turn: the turns
        // after it are gone, so nothing older is trusted either.
        var shrunk = TurnPages(sessionId: "s")
        try shrunk.acceptNewest(page(Array(20...29), more: true))
        try shrunk.acceptOlder(page(Array(10...19), more: false), askedTo: 19)
        XCTAssertNil(shrunk.olderBound)
        try shrunk.acceptNewest(page(Array(21...25), more: true))
        XCTAssertEqual(shrunk.turns.map(\.index), Array(21...25))
        XCTAssertEqual(shrunk.olderBound, 20)
    }

    /// Clause: main's note travels with the newest page.
    func testTheNoteIsKept() throws {
        var pages = TurnPages(sessionId: "s")
        try pages.acceptNewest(page([], more: false, note: "on another machine"))
        XCTAssertEqual(pages.note, "on another machine")
        XCTAssertTrue(pages.turns.isEmpty)
    }
}
