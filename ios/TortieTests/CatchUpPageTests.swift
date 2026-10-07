import XCTest
@testable import Tortie

/// Catch Me Up (Phase 337.1, build/p3371/SPEC.md D20 to D22, his ruling "Yes,
/// rename it"): the conversation, oldest at the top, then the now card after
/// the newest turn; the agent's last answer only when there are no turns;
/// Phase 318's message box in the bottom inset exactly as 318 drew it; End at
/// the top right; the title in two lines; and no line keeping the terminal's
/// scrollback on the Mac. The door is a script; nothing here reaches a
/// network. Each test names the clause it holds, and each fails when that
/// clause is taken out of Screens/ConversationScreen.swift or
/// Screens/SessionScreen.swift.
@MainActor
final class CatchUpPageTests: XCTestCase {
    private func source(_ name: String) throws -> String {
        try StyleSource.text("ios/Tortie/Screens/" + name)
    }

    /// The text of `name`'s declaration that starts with `head`, up to its
    /// closing brace at the left margin.
    private func declaration(_ head: String, in name: String) throws -> String {
        let text = try source(name)
        let start = try XCTUnwrap(text.range(of: head), "\(name) declares no \(head)")
        let end = try XCTUnwrap(text.range(of: "\n}\n", range: start.upperBound..<text.endIndex))
        return String(text[start.upperBound..<end.lowerBound])
    }

    // MARK: What is drawn

    /// Clause (D20): the agent's last answer is drawn on the now card only
    /// when there are no turns, because otherwise it IS the newest turn's
    /// answer, drawn just above it.
    func testTheLastAnswerOnlyWithoutTurns() {
        XCTAssertTrue(CatchUpParts.drawsLastAnswer(turns: []))
        XCTAssertFalse(CatchUpParts.drawsLastAnswer(turns: [Answers.turn(0)]))
        XCTAssertFalse(CatchUpParts.drawsLastAnswer(turns: [Answers.turn(3), Answers.turn(4)]))
    }

    /// Clause (D20): in place of turns, main's note for a session elsewhere,
    /// else the session's own line, unless the now card's card says those
    /// very words already.
    func testTheLineInPlaceOfTurns() throws {
        let card = try SessionDrawing(sessionAnswer(screen: false, outcome: "no agent here").session)
        let other = try SessionDrawing(sessionAnswer(screen: false, outcome: "The agent finished.").session)
        XCTAssertEqual(CatchUpParts.emptyLine(note: "On studio.", honestLine: "no agent here", now: card), "On studio.")
        XCTAssertNil(CatchUpParts.emptyLine(note: nil, honestLine: "no agent here", now: card), "the card's words were drawn twice")
        XCTAssertEqual(CatchUpParts.emptyLine(note: nil, honestLine: "no agent here", now: other), "no agent here")
        XCTAssertEqual(CatchUpParts.emptyLine(note: nil, honestLine: "no agent here", now: nil), "no agent here", "the line went with a session read that never came")
        XCTAssertNil(CatchUpParts.emptyLine(note: nil, honestLine: nil, now: nil))
    }

    /// Clause (D20, Phase 318): the box is drawn while the Mac says the
    /// session can take a message, and after a message that was not sent,
    /// to hold his words; never for a pairing that writes nothing.
    func testTheBoxIsDrawnAs318DrewIt() async {
        XCTAssertFalse(CatchUpParts.boxDrawn(reply: nil, offer: ReplyAnswers.sayable), "a pairing that writes nothing drew a box")
        let reply = ReplyModel(sessionId: "s", writer: ScriptedReplier(says: [ReplyAnswers.notReady]), registry: nil)
        XCTAssertTrue(CatchUpParts.boxDrawn(reply: reply, offer: ReplyAnswers.sayable))
        XCTAssertFalse(CatchUpParts.boxDrawn(reply: reply, offer: .empty))
        reply.edit("say hello")
        reply.send { true }
        await reply.running?.value
        XCTAssertTrue(reply.holdsWords)
        XCTAssertTrue(CatchUpParts.boxDrawn(reply: reply, offer: .empty), "a message that was not sent lost its box")
        reply.readingAgain()
        XCTAssertFalse(CatchUpParts.boxDrawn(reply: reply, offer: .empty))
    }

    // MARK: Where it is drawn

    /// Clause (D20): bottom-anchored, the turns first and the now card after
    /// the newest turn, so the page opens on where things stand now.
    func testTheNowCardIsAfterTheNewestTurn() throws {
        let screen = try declaration("struct ConversationScreen: View {", in: "ConversationScreen.swift")
        let page = try XCTUnwrap(screen.range(of: "private var page: some View {"))
        let after = screen[page.upperBound...]
        let turns = try XCTUnwrap(after.range(of: "                    turns\n"))
        let now = try XCTUnwrap(after.range(of: "                now\n"))
        XCTAssertLessThan(turns.lowerBound, now.lowerBound, "the now card is not after the turns")
        XCTAssertTrue(after.contains(".defaultScrollAnchor(.bottom)"), "the page does not open at its bottom")
        let nowBody = try XCTUnwrap(screen.range(of: "private var now: some View {"))
        XCTAssertTrue(screen[nowBody.upperBound...].contains("NowCard("))
        XCTAssertTrue(screen.contains("lastAnswer: CatchUpParts.drawsLastAnswer(turns: model.pages.turns)"))
    }

    /// Clause (D20): the now card is the 337 session page less its two rows:
    /// the status, End's line, the card, the options, the press line, the
    /// cells, then the last answer, in that order, and no row to open the
    /// conversation or the screen.
    func testTheNowCardIsTheSessionPageLessItsRows() throws {
        let card = try declaration("struct NowCard: View {", in: "SessionScreen.swift")
        let order = [
            "            status\n",
            "EndLine(model: end",
            "if drawing.hasCard { card }",
            "if !drawing.choices.isEmpty { choices }",
            "if let line = reply?.pressLine { pressLine(line) }",
            "            cells\n",
            "if lastAnswer, let answer = drawing.lastAnswerRendered { lastAnswer(answer) }"
        ]
        var from = card.startIndex
        for part in order {
            let found = try XCTUnwrap(card.range(of: part, range: from..<card.endIndex), "the now card does not draw \(part) in its place")
            from = found.upperBound
        }
        for gone in ["conversationRow", "screenRow", "Copy.conversation", "Copy.screen"] {
            XCTAssertFalse(card.contains(gone), "the now card still draws \(gone)")
        }
    }

    /// Clause (D20, D21): the title is two lines, the session's name and then
    /// `Catch Me Up` in the secondary colour; the box sits in the bottom
    /// inset; End is in the toolbar; and the page is `screen-catch-up`.
    func testTheTitleTheBoxAndEnd() throws {
        let screen = try declaration("struct ConversationScreen: View {", in: "ConversationScreen.swift")
        let principal = try XCTUnwrap(screen.range(of: "ToolbarItem(placement: .principal) {"))
        let rest = screen[principal.upperBound...]
        let name = try XCTUnwrap(rest.range(of: "Words(title, .navTitle, Tokens.textPrimary)"))
        let word = try XCTUnwrap(rest.range(of: "Words(Copy.catchMeUp, .small, Tokens.textSecondary)"))
        XCTAssertLessThan(name.lowerBound, word.lowerBound, "the name is not the title's first line")
        XCTAssertTrue(screen.contains("if let reply, CatchUpParts.boxDrawn(reply: reply, offer: replyOffer) {"))
        XCTAssertTrue(screen.contains("EndTopItem(model: end"))
        XCTAssertTrue(screen.contains(".accessibilityIdentifier(ID.catchUpScreen)"))
        XCTAssertEqual(ID.catchUpScreen, "screen-catch-up")
    }

    /// Clause (D20): a pull and a return to the foreground read both the
    /// conversation and the session; the appear reads the session only when
    /// nothing has read it yet (a session that opened on this face was read
    /// by its route).
    func testAPullReadsBoth() throws {
        let screen = try declaration("struct ConversationScreen: View {", in: "ConversationScreen.swift")
        let pull = try XCTUnwrap(screen.range(of: ".refreshable {"))
        XCTAssertTrue(screen[pull.upperBound...].hasPrefix("\n            reply?.readingAgain()\n            await readBoth(session: true)"))
        XCTAssertTrue(screen.contains(".task { await readBoth(session: session.latest == nil) }"))
        XCTAssertTrue(screen.contains("Task { await readBoth(session: true) }"))
        let both = try XCTUnwrap(screen.range(of: "private func readBoth(session reading: Bool) async {"))
        let body = screen[both.upperBound...]
        XCTAssertTrue(body.contains("async let turns: Void = model.loadNewest()"))
        XCTAssertTrue(body.contains("async let now: Bool = session.load()"))
    }

    /// Clause (D21, D22): the page draws no terminal line and names no
    /// `conversation` identifier, and no Face ID is asked on it.
    func testNoTerminalLineAndTheNewNames() throws {
        let text = try source("ConversationScreen.swift")
        XCTAssertFalse(text.contains("terminalStaysOnMac"))
        XCTAssertFalse(text.contains("TerminalLine"))
        XCTAssertFalse(text.contains("ID.conversation"))
        for refused in ["OwnerCheck", "ownerCheck", "LAContext", "evaluatePolicy"] {
            XCTAssertFalse(text.contains(refused), "Catch Me Up names \(refused); only End asks Face ID, inside EndBar.swift")
        }
        let identifiers = try source("Identifiers.swift")
        for line in identifiers.components(separatedBy: "\n") where line.contains("static") {
            XCTAssertFalse(line.lowercased().contains("\"conversation") || line.contains("-conversation"), "an identifier still spells conversation: \(line)")
        }
        XCTAssertEqual(
            [ID.catchUpOlder, ID.catchUpOlderLine, ID.catchUpNoClock, ID.catchUpNote, ID.catchUpEmpty, ID.catchUpLoading, ID.catchUpFailure],
            ["catch-up-older", "catch-up-older-line", "catch-up-no-clock", "catch-up-note", "catch-up-empty", "catch-up-loading", "catch-up-failure"]
        )
    }

    // MARK: A model behind it

    /// Clause (D20): the now card keeps the session's last answer over a
    /// read that failed, so a pull that does not come back leaves where
    /// things stood rather than nothing.
    func testTheNowCardKeepsTheLastAnswer() async {
        let session = SessionModel(
            sessionId: "s",
            door: ScriptedReader(session: [.success(sessionAnswer(screen: false, title: "Ended")), .failure(.unreachable(code: 61))]),
            routing: .stay
        )
        await session.load()
        await session.load()
        XCTAssertEqual(session.latest?.statusTitle, "Ended")
        XCTAssertEqual(session.phase, .failed(Copy.cannotReachMac))
    }
}
