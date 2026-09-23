import SwiftUI
import XCTest
@testable import Tortie

/// What the three screens draw, decided from one answer before anything is laid
/// out (build/p316/SPEC.md section 4 S2, builder B). Each test names the clause
/// it holds, and each fails when that clause is taken out.
final class ScreensDrawingTests: XCTestCase {
    // MARK: - The list (Main.html)

    /// Clause: "Needs your input (n)" then "Everything else (n)", each list in
    /// the order the door answered it. The phone does no ordering.
    func testWaitingFirstThenEverythingElseInTheDoorsOrder() throws {
        let answer = Answers.blocked(
            rows: [Answers.row("b", dot: "attention"), Answers.row("a", dot: "attention")],
            others: [Answers.row("z"), Answers.row("c"), Answers.row("m")]
        )
        let drawing = try ListDrawing(answer, clock: { _ in "4:32 PM" })
        XCTAssertEqual(drawing.waitingHeader, "Needs your input (2)")
        XCTAssertEqual(drawing.waiting.map(\.id), ["b", "a"])
        XCTAssertEqual(drawing.othersHeader, "Everything else (3)")
        XCTAssertEqual(drawing.others.map(\.id), ["z", "c", "m"])
    }

    /// Clause: a waiting row's second line is `project · question`, as
    /// Main.html's first section draws it; every other row's is
    /// `status · project`; a waiting row with no question reads like the rest.
    func testEachRowsSecondLine() throws {
        let answer = Answers.blocked(
            rows: [
                Answers.row("w", project: "webapp", title: "Needs input", dot: "attention", question: "Edit src/auth/session.ts"),
                Answers.row("q", project: "api", title: "Needs input", dot: "attention", question: nil)
            ],
            others: [Answers.row("o", project: "docs", title: "Failed (exit 1)", dot: "failed", question: "left over")]
        )
        let drawing = try ListDrawing(answer, clock: { _ in "" })
        XCTAssertEqual(drawing.waiting[0].line, "webapp · Edit src/auth/session.ts")
        XCTAssertEqual(drawing.waiting[1].line, "Needs input · api")
        XCTAssertEqual(drawing.others[0].line, "Failed (exit 1) · docs")
    }

    /// Clause: the machine badge only when the session is elsewhere.
    func testTheMachineIsDrawnOnlyWhenElsewhere() throws {
        let answer = Answers.blocked(others: [Answers.row("here"), Answers.row("there", machine: "Mac Pro")])
        let drawing = try ListDrawing(answer, clock: { _ in "" })
        XCTAssertNil(drawing.others[0].machine)
        XCTAssertEqual(drawing.others[1].machine, "Mac Pro")
    }

    /// Clause: the age and the status word are main's, drawn as they came. The
    /// row's epoch would give another age; it is never read.
    func testTheAgeAndTheTitleAreMainsNeverComputed() throws {
        let answer = Answers.blocked(rows: [
            Answers.row("w", title: "Needs input", dot: "attention", blockedSince: 0, age: "14m")
        ])
        let row = try ListDrawing(answer, clock: { _ in "" }).waiting[0]
        XCTAssertEqual(row.age, "14m")
        XCTAssertEqual(row.statusTitle, "Needs input")
        XCTAssertTrue(row.waiting)
    }

    /// Clause: with nothing waiting the list draws main's empty line and no
    /// first header, the way ⌘J does.
    func testNothingWaitingDrawsMainsEmptyLineAlone() throws {
        let drawing = try ListDrawing(Answers.blocked(others: [Answers.row("o")]), clock: { _ in "" })
        XCTAssertNil(drawing.waitingHeader)
        XCTAssertEqual(drawing.emptyLine, "Nothing needs you")
        let busy = try ListDrawing(
            Answers.blocked(rows: [Answers.row("w", dot: "attention")]),
            clock: { _ in "" }
        )
        XCTAssertNil(busy.emptyLine)
    }

    /// Clause: the second header counts every other session, including any
    /// the door left out, and a line says how many were left out.
    func testEverythingElseCountsWhatTheDoorLeftOut() throws {
        let drawing = try ListDrawing(
            Answers.blocked(others: [Answers.row("a"), Answers.row("b")], omitted: 3),
            clock: { _ in "" }
        )
        XCTAssertEqual(drawing.othersHeader, "Everything else (5)")
        XCTAssertEqual(drawing.othersOmitted, "3 more not shown.")
        let whole = try ListDrawing(Answers.blocked(others: [Answers.row("a")]), clock: { _ in "" })
        XCTAssertNil(whole.othersOmitted)
        let none = try ListDrawing(Answers.blocked(), clock: { _ in "" })
        XCTAssertNil(none.othersHeader, "no second header over nothing")
    }

    /// Clause (his ruling of 2026-09-23): an omitted count no door could send,
    /// or one whose sum with the rows would overflow, is an answer this build
    /// cannot read. It is refused whole and drawn as one sentence, never a
    /// trap: `Int.max` here ended the app on the list's refresh.
    func testAnOmittedCountNoDoorCouldSendIsUnreadable() throws {
        for omitted in [Int.max, Int.min, -1, DoorNumber.largest + 1] {
            let answer = Answers.blocked(others: [Answers.row("a"), Answers.row("b")], omitted: omitted)
            XCTAssertThrowsError(try ListDrawing(answer, clock: { _ in "" }), "\(omitted)") {
                XCTAssertEqual($0 as? DoorFailure, .malformed)
            }
            XCTAssertEqual(ListModel.drawn(answer), .failed(Copy.answerUnreadable), "\(omitted)")
            XCTAssertEqual(ListModel.drawn(Answers.blocked(omitted: omitted)), .failed(Copy.answerUnreadable), "\(omitted), no row")
        }
        // The bound itself is a count, and the sum past it does not trap.
        let edge = try ListDrawing(Answers.blocked(others: [Answers.row("a")], omitted: DoorNumber.largest), clock: { _ in "" })
        XCTAssertEqual(edge.othersHeader, Copy.everythingElse(9_007_199_254_740_992))
    }

    /// Clause: the foot is main's age note and `read <the answer's moment>`.
    func testTheFootIsMainsNoteAndTheAnswersMoment() throws {
        var asked: Double?
        let drawing = try ListDrawing(Answers.blocked(at: 1_758_600_000_123)) { at in
            asked = at
            return "4:32 PM"
        }
        XCTAssertEqual(asked, 1_758_600_000_123)
        XCTAssertEqual(drawing.readLine, "read 4:32 PM")
        XCTAssertEqual(drawing.ageNote, Answers.blocked().ageNote)
    }

    /// Clause: a session in both lists, or twice in one, is not an answer the
    /// door gives, and it is refused whole rather than half drawn.
    func testASessionListedTwiceIsRefusedWhole() {
        let twice = Answers.blocked(rows: [Answers.row("s", dot: "attention")], others: [Answers.row("s")])
        XCTAssertThrowsError(try ListDrawing(twice, clock: { _ in "" }))
        XCTAssertEqual(ListModel.drawn(twice), .failed(Copy.answerUnreadable))
        let doubled = Answers.blocked(others: [Answers.row("s"), Answers.row("s")])
        XCTAssertEqual(ListModel.drawn(doubled), .failed(Copy.answerUnreadable))
    }

    /// Clause: a dot this build does not know gets no colour of its own and is
    /// drawn as a ring; the five it knows keep theirs.
    func testAnUnknownDotHasNoColourOfItsOwn() {
        XCTAssertEqual(StatusDot(name: "exploded").color, Tokens.textMuted)
        XCTAssertTrue(StatusDot(name: "exploded").hollow)
        XCTAssertEqual(StatusDot.attention.color, Tokens.statusAttention)
        XCTAssertEqual(StatusDot.working.color, Tokens.statusWorking)
        XCTAssertEqual(StatusDot.idle.color, Tokens.statusIdle)
        XCTAssertEqual(StatusDot.ended.color, Tokens.statusExited)
        XCTAssertEqual(StatusDot.failed.color, Tokens.statusFailed)
        XCTAssertEqual([StatusDot.ended, .failed].map(\.hollow), [true, true])
        XCTAssertEqual([StatusDot.attention, .working, .idle].map(\.hollow), [false, false, false])
        XCTAssertEqual(StatusDot.allCases.filter(\.pulses), [.attention], "only the waiting dot pulses")
    }

    // MARK: - One session (Session.html, Choice.html)

    /// Clause: status title, `agent · project`, the Catch Me Up card with the
    /// person's ask quoted, and the agent's options in its own order.
    func testTheSessionScreenIsMainsWords() throws {
        let row = Answers.row(
            "s", project: "docs-site", agentLabel: "Grok", title: "Needs input", dot: "attention",
            question: "Bash rm -rf build",
            choices: [PocketChoiceOption(marker: "1", text: "Yes"), PocketChoiceOption(marker: "3", text: "No")]
        )
        let drawing = try SessionDrawing(Answers.detail(
            row,
            catchUp: PocketCatchUp(ask: "make the **cookie** httpOnly and…", outcome: "The agent is waiting for you."),
            lastAnswer: "I can set `httpOnly`."
        ))
        XCTAssertEqual(drawing.statusTitle, "Needs input")
        XCTAssertEqual(drawing.agentLine, "Grok · docs-site")
        XCTAssertEqual(drawing.outcome, "The agent is waiting for you.")
        XCTAssertEqual(drawing.question, "Bash rm -rf build")
        XCTAssertEqual(drawing.asked, "you asked “make the **cookie** httpOnly and…”", "the ask stays as typed")
        XCTAssertEqual(drawing.choices.map(\.marker), ["1", "3"], "the agent's own markers, never an index")
        XCTAssertEqual(drawing.lastAnswer, "I can set `httpOnly`.")
        XCTAssertTrue(drawing.hasCard)
    }

    /// Clause: with no Catch Me Up line and no question there is no card.
    func testNoCardWithNothingToSay() throws {
        let drawing = try SessionDrawing(Answers.detail(Answers.row("s")))
        XCTAssertFalse(drawing.hasCard)
        XCTAssertNil(drawing.asked)
    }

    // MARK: - The two cells: a null is never drawn as zero

    /// Clause: both counts read: the total, then `you · agent`.
    func testBothCountsRead() throws {
        let cell = try ActivityCells.messages(Answers.activity(user: 20, agent: 21), agent: "claude", remote: false)
        XCTAssertEqual(cell, CellDrawing(main: "41", small: "20 you · 21 agent"))
        let zero = try ActivityCells.messages(Answers.activity(user: 0, agent: 0), agent: "claude", remote: false)
        XCTAssertEqual(zero, CellDrawing(main: "0", small: "0 you · 0 agent"), "a zero that was read is a zero")
    }

    /// Clause: a shell and a session elsewhere are decided from the row, and
    /// neither draws a digit.
    func testShellAndElsewhereAreDashesWithTheirWords() {
        XCTAssertEqual(
            try ActivityCells.messages(Answers.activity(), agent: "shell", remote: false),
            CellDrawing(main: "—", small: "Shell")
        )
        XCTAssertEqual(
            try ActivityCells.messages(Answers.activity(), agent: "claude", remote: true),
            CellDrawing(main: "—", small: "Unavailable")
        )
        XCTAssertEqual(
            try ActivityCells.lastMessage(Answers.activity(), agent: "shell", text: "2m"),
            CellDrawing(main: "—", small: "Not applicable")
        )
    }

    /// Clause: NULL IS NEVER DRAWN AS ZERO. No read, an unread record, or a
    /// count the contract promised and did not send is a dash and a word.
    func testNullIsNeverZero() {
        XCTAssertEqual(try ActivityCells.messages(nil, agent: "claude", remote: false), CellDrawing(main: "—", small: nil))
        XCTAssertEqual(try ActivityCells.lastMessage(nil, agent: "claude", text: nil), CellDrawing(main: "—", small: nil))
        XCTAssertEqual(
            try ActivityCells.messages(Answers.activity(coverage: "unavailable", reason: "unreadable", user: nil, agent: nil),
                                   agent: "claude", remote: false),
            CellDrawing(main: "—", small: "Not recorded")
        )
        XCTAssertEqual(
            try ActivityCells.messages(Answers.activity(coverage: "unavailable", reason: "unknown-session", user: nil, agent: nil),
                                   agent: "claude", remote: false),
            CellDrawing(main: "—", small: "Unavailable")
        )
        XCTAssertEqual(
            try ActivityCells.messages(Answers.activity(coverage: "not-applicable", user: nil, agent: nil),
                                   agent: "claude", remote: false),
            CellDrawing(main: "—", small: "Shell")
        )
        XCTAssertEqual(
            try ActivityCells.messages(Answers.activity(coverage: "complete", user: nil, agent: 3),
                                   agent: "claude", remote: false),
            CellDrawing(main: "—", small: "Not recorded"),
            "a complete record with no ask count breaks the contract and is not a zero"
        )
    }

    /// Clause: a record with no reply count draws the asks with a `+`, and a
    /// record with nothing kept says so rather than `0+`.
    func testRepliesNotRecordedAndPartial() {
        XCTAssertEqual(
            try ActivityCells.messages(Answers.activity(coverage: "partial", user: 4, agent: nil), agent: "gemini", remote: false),
            CellDrawing(main: "4+", small: "Replies not recorded")
        )
        XCTAssertEqual(
            try ActivityCells.messages(Answers.activity(coverage: "partial", user: 0, agent: nil), agent: "gemini", remote: false),
            CellDrawing(main: "—", small: "No messages yet")
        )
        XCTAssertEqual(
            try ActivityCells.messages(Answers.activity(coverage: "partial", user: 5, agent: 3), agent: "claude", remote: false),
            CellDrawing(main: "8+", small: "Partial history")
        )
    }

    /// Clause: ONE CLOCK IS NEVER DRAWN AS ANOTHER. The big line is main's age;
    /// the small word says whose time it is; a time with no clock, no author
    /// or no age drawn for it is not recorded.
    func testTheLastMessageSaysWhoseClock() {
        func cell(_ clock: String?, _ by: String?, _ text: String? = "2m") throws -> CellDrawing {
            try ActivityCells.lastMessage(Answers.activity(by: by, clock: clock), agent: "claude", text: text)
        }
        XCTAssertEqual(try cell("message", "you"), CellDrawing(main: "2m", small: "Your prompt"))
        XCTAssertEqual(try cell("message", "agent"), CellDrawing(main: "2m", small: "Agent reply"))
        XCTAssertEqual(try cell("ask", "you"), CellDrawing(main: "2m", small: "Agent reply"))
        XCTAssertEqual(try cell("session", "agent"), CellDrawing(main: "2m", small: "Session updated"))
        XCTAssertEqual(try cell(nil, "you"), CellDrawing(main: "—", small: "Not recorded"))
        XCTAssertEqual(try cell("message", nil), CellDrawing(main: "—", small: "Not recorded"))
        XCTAssertEqual(try cell("message", "somebody"), CellDrawing(main: "—", small: "Not recorded"))
        XCTAssertEqual(try cell("message", "you", nil), CellDrawing(main: "—", small: "Not recorded"))
    }

    /// Clause (his ruling of 2026-09-23): counts no door could send, or two
    /// whose sum would overflow, are an answer this build cannot read. Both
    /// cells refuse them, and so does the session, which draws one sentence in
    /// place of itself, never a trap: `userMessages` of `Int.max` ended the app
    /// on opening a session.
    func testCountsNoDoorCouldSendAreUnreadable() throws {
        let pairs: [(Int?, Int?)] = [
            (Int.max, 1), (1, Int.max), (Int.max, Int.max), (Int.max, nil),
            (Int.min, -1), (-1, Int.min), (Int.min, nil),
            (-1, 1), (1, -1), (-1, nil),
            (DoorNumber.largest + 1, 0)
        ]
        for (user, agent) in pairs {
            let what = "\(String(describing: user)) + \(String(describing: agent))"
            for coverage in ["complete", "partial"] {
                let counts = Answers.activity(coverage: coverage, user: user, agent: agent, at: nil, by: nil, clock: nil)
                XCTAssertThrowsError(try ActivityCells.messages(counts, agent: "claude", remote: false), "\(coverage) \(what)") {
                    XCTAssertEqual($0 as? DoorFailure, .malformed)
                }
                XCTAssertThrowsError(try ActivityCells.lastMessage(counts, agent: "claude", text: nil), "\(coverage) \(what)") {
                    XCTAssertEqual($0 as? DoorFailure, .malformed)
                }
            }
            let detail = Answers.detail(Answers.row("s"), activity: Answers.activity(user: user, agent: agent))
            XCTAssertThrowsError(try SessionDrawing(detail), what)
        }
        // Two counts at the bound sum without a trap and are drawn.
        let top = DoorNumber.largest
        let edge = try ActivityCells.messages(Answers.activity(user: top, agent: top), agent: "claude", remote: false)
        XCTAssertEqual(edge.small, Copy.messageCounts(you: top, agent: top))
    }

    /// Clause: with no time, the word says whether anything was said.
    func testNoTimeSaysWhetherAnythingWasSaid() {
        XCTAssertEqual(
            try ActivityCells.lastMessage(Answers.activity(user: 0, agent: 0, at: nil, by: nil, clock: nil), agent: "claude", text: nil),
            CellDrawing(main: "—", small: "No messages yet")
        )
        XCTAssertEqual(
            try ActivityCells.lastMessage(Answers.activity(user: 3, agent: 2, at: nil, by: nil, clock: nil), agent: "claude", text: nil),
            CellDrawing(main: "—", small: "Not recorded")
        )
    }

    // MARK: - The answer is markdown; nothing it links to opens

    /// Clause: the answer is drawn as inline markdown, so `**x**` loses its
    /// asterisks and `code` is code.
    func testTheAnswerIsInlineMarkdown() {
        let drawn = AnswerMarkdown.render("say **x** and `y`")
        XCTAssertEqual(String(drawn.characters), "say x and y")
        typealias Intent = AttributeScopes.FoundationAttributes.InlinePresentationIntentAttribute
        let intents = drawn.runs.compactMap { $0[Intent.self] }
        XCTAssertTrue(intents.contains(.stronglyEmphasized))
        XCTAssertTrue(intents.contains(.code))
    }

    /// Clause: whitespace kept. A list or a fence is its own characters, where
    /// the agent put them.
    func testWhitespaceIsKept() {
        let text = "one\n\n  - two\n    three"
        XCTAssertEqual(String(AnswerMarkdown.render(text).characters), text)
    }

    /// Clause: a link is drawn as its words and never opened, and an image is
    /// never loaded.
    func testLinksAndImagesAreWordsOnly() {
        let drawn = AnswerMarkdown.render("[here](https://example.com) and ![pic](file:///etc/hosts)")
        typealias Link = AttributeScopes.FoundationAttributes.LinkAttribute
        typealias Image = AttributeScopes.FoundationAttributes.ImageURLAttribute
        XCTAssertTrue(drawn.runs.allSatisfy { $0[Link.self] == nil }, "a link survived")
        XCTAssertTrue(drawn.runs.allSatisfy { $0[Image.self] == nil }, "an image survived")
        XCTAssertTrue(String(drawn.characters).hasPrefix("here and "))
    }

    /// Clause: no HTML path. A tag in an answer is text.
    func testHTMLIsText() {
        let text = "<script>alert(1)</script><b>x</b>"
        XCTAssertEqual(String(AnswerMarkdown.render(text).characters), text)
    }

    // MARK: - The clock over a turn

    /// Clause: formatTurnClock's rule: the time alone on the answer's own day,
    /// the date as well on any other, and nothing when there is no clock. "Now"
    /// is the answer's moment, not the phone's.
    func testTheTurnClock() throws {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = try XCTUnwrap(TimeZone(identifier: "UTC"))
        let answeredAt = 1_758_600_000_000.0 // 2025-09-23T04:00:00Z
        let sameDay = "2025-09-23T01:02:03.456Z"
        let dayBefore = "2025-09-22T23:30:00Z"
        var timeOnly = Date.FormatStyle(date: .omitted, time: .shortened)
        timeOnly.timeZone = calendar.timeZone
        timeOnly.calendar = calendar
        let expectedSame = try XCTUnwrap(TurnClock.parse(sameDay)).formatted(timeOnly)
        XCTAssertEqual(TurnClock.clock(sameDay, answeredAt: answeredAt, calendar: calendar), expectedSame)
        let older = try XCTUnwrap(TurnClock.clock(dayBefore, answeredAt: answeredAt, calendar: calendar))
        XCTAssertNotEqual(older, try XCTUnwrap(TurnClock.parse(dayBefore)).formatted(timeOnly))
        XCTAssertTrue(older.contains("22"), "a turn from another day shows its date")
        XCTAssertNil(TurnClock.clock(nil, answeredAt: answeredAt, calendar: calendar))
        XCTAssertNil(TurnClock.clock("yesterday", answeredAt: answeredAt, calendar: calendar))
    }
}
