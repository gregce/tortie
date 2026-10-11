import Foundation
import XCTest
@testable import Tortie

/// See a sample's reader and its world (Phase 333.3, build/p3333/SPEC.md
/// sections 5.2.2 to 5.2.4 and 7.2), over the tests' own book
/// (`SampleBookFixture`): the state machine a press and an End move, the echo
/// on the sample's own prompt, the held read, the history's pages, and that
/// the sample answers no alert, no Mac and no message. The clock is a script;
/// nothing reaches a network. Each test names the clause it holds and fails
/// when that clause is taken out of Sample/SampleWorld.swift or
/// Sample/SampleReader.swift.
final class SampleReaderTests: XCTestCase {
    /// A clock the test moves.
    final class Clock: @unchecked Sendable {
        private let lock = NSLock()
        private var ms: Double

        init(_ ms: Double = 1_800_000_000_000) {
            self.ms = ms
        }

        var now: Double { lock.withLock { ms } }

        func advance(_ by: Double) {
            lock.withLock { ms += by }
        }

        var read: @Sendable () -> Double { { [self] in now } }
    }

    private func reader(_ clock: Clock = Clock()) -> SampleReader {
        SampleReader(book: SampleBookFixture.book(), now: clock.read)
    }

    private func door(_ reader: SampleReader, _ id: String) throws -> any ScreenDoor {
        try XCTUnwrap(reader.screenDoor(id))
    }

    private static func done(_ result: WriteResult, _ verb: PocketWriteAnswer.Verb, _ id: String) -> Bool {
        result == .answered(PocketWriteAnswer(verb: verb, write: id, outcome: .done, reason: nil, sentence: nil))
    }

    /// The book's picture of one session at one variant.
    private static func bookScreen(_ id: String, _ variant: String) throws -> PocketScreen {
        try XCTUnwrap(SampleBookFixture.book().screen(id: id, variant: variant, at: 1).answer.screen)
    }

    /// The live picture now, read with no `since`.
    private func picture(_ door: any ScreenDoor) async throws -> (answer: PocketScreenAnswer, screen: PocketScreen) {
        let answer = try await door.read(since: nil)
        return (answer, try XCTUnwrap(answer.screen))
    }

    /// The task's answer, or its cancellation once `seconds` pass, so a read
    /// that never wakes fails its test rather than holding it.
    private func within<T: Sendable>(_ seconds: Double, _ task: Task<T, Error>) async throws -> T {
        let watchdog = Task {
            try? await Task.sleep(nanoseconds: UInt64(seconds * 1_000_000_000))
            task.cancel()
        }
        defer { watchdog.cancel() }
        return try await task.value
    }

    private static func run(_ text: String, _ style: Int = 0) -> PocketScreenRun {
        PocketScreenRun(text: text, runStyle: style, runCells: text.utf8.count)
    }

    // MARK: - What the reader is

    /// The sample asks iOS nothing about alerts, names no Mac, writes to its
    /// own copy, and opens a Terminal for its own sessions alone.
    func testTheReaderAnswersNoAlertNoMacAndItsOwnWriter() throws {
        let reader = reader()
        XCTAssertEqual(reader.alerts, .nothing)
        XCTAssertEqual(reader.facts, PairedFacts(name: "", address: "", fingerprint: "", pairedAt: 0, macSends: false))
        XCTAssertNotNil(reader.writer)
        XCTAssertTrue(reader.writer is SampleReader)
        let held = try door(reader, "s-idle")
        XCTAssertTrue(held is SampleScreenDoor)
        XCTAssertTrue(held.writes)
        XCTAssertNotNil(reader.screenDoor("s-done"))
        XCTAssertNil(reader.screenDoor("s-none"))
        held.close()
    }

    /// Through `any DoorReading`, as the app holds it: the sample's own
    /// sessions read, and the writer is not the extension's nil.
    func testTheAppsViewOfTheReaderIsTheSamples() async throws {
        let reading: any DoorReading = reader()
        XCTAssertNotNil(reading.writer)
        XCTAssertNotNil(reading.screenDoor("s-wait"))
        let sessions = try await reading.sessions(.standard)
        XCTAssertEqual(sessions.rows.map(\.sessionId), ["s-wait", "s-idle", "s-done"])
    }

    /// D10: no sample session offers a message, and `say` is not taken, with
    /// no write id.
    func testSayIsNotTakenAndCarriesNoWriteId() async {
        let sent = await reader().say("s-idle", text: "hello", write: nil)
        XCTAssertEqual(sent, SentWrite(result: .notTaken, write: nil))
        let again = await reader().say("s-idle", text: "hello", write: "kept")
        XCTAssertEqual(again, SentWrite(result: .notTaken, write: nil))
    }

    /// D4: every answer the sample serves carries the phone's clock.
    func testAtIsTheInjectedClock() async throws {
        let clock = Clock(1_850_000_000_000)
        let reader = reader(clock)
        let blocked = try await reader.blocked()
        XCTAssertEqual(blocked.at, clock.now)
        clock.advance(1_000)
        let sessions = try await reader.sessions(.standard)
        XCTAssertEqual(sessions.at, clock.now)
        clock.advance(1_000)
        let session = try await reader.session("s-wait")
        XCTAssertEqual(session.at, clock.now)
        let turns = try await reader.turns("s-wait", to: nil)
        XCTAssertEqual(turns.at, clock.now)
        let older = try await reader.turns("s-wait", to: 0)
        XCTAssertEqual(older.at, clock.now)
        clock.advance(1_000)
        let held = try door(reader, "s-idle")
        let screen = try await held.read(since: nil)
        XCTAssertEqual(screen.at, clock.now)
        _ = await held.keys([.text("x")], turn: "", dialog: nil)
        clock.advance(1_000)
        let echoed = try await held.read(since: nil)
        XCTAssertEqual(echoed.at, clock.now)
        let page = try await held.scrollback(from: 0, count: 60, depth: 60, wrap: 20, keep: .bottom)
        XCTAssertEqual(page.at, clock.now)
        let status = try await held.session()
        XCTAssertEqual(status.at, clock.now)
    }

    /// An older page of the conversation is empty: no sample conversation has
    /// more than one.
    func testOlderTurnsAreAnEmptyPage() async throws {
        let page = try await reader().turns("s-wait", to: 0)
        XCTAssertEqual(page.sessionId, "s-wait")
        XCTAssertEqual(page.turns, [])
        XCTAssertFalse(page.more)
        XCTAssertNil(page.note)
        let newest = try await reader().turns("s-wait", to: nil)
        XCTAssertEqual(newest.turns.count, 2)
    }

    /// A session the sample does not have is refused, as the door refuses one,
    /// and nothing is written to it.
    func testASessionTheSampleDoesNotHaveIsRefused() async {
        let reader = reader()
        await assertRefused { _ = try await reader.session("s-none") }
        await assertRefused { _ = try await reader.turns("s-none", to: nil) }
        await assertRefused { _ = try await reader.turns("s-none", to: 0) }
        await assertRefused { _ = try await reader.world.picture("s-none", since: nil) }
        await assertRefused { _ = try await reader.world.page("s-none", from: 0, count: 1, depth: 60, wrap: 20) }
        let end = await reader.end("s-none", batch: false)
        XCTAssertEqual(end, .notTaken)
        let press = await reader.choose("s-none", question: "q", mark: "m", marker: "1")
        XCTAssertEqual(press, .notTaken)
        let typed = await reader.world.typeKeys("s-none", [.text("x")])
        XCTAssertEqual(typed, .notTaken)
    }

    private func assertRefused(_ read: () async throws -> Void, line: UInt = #line) async {
        do {
            try await read()
            XCTFail("not refused", line: line)
        } catch {
            XCTAssertEqual(error as? DoorFailure, .refused, line: line)
        }
    }

    // MARK: - The state machine (D10, D11)

    /// A press on a waiting session whose offer lists the marker answers it:
    /// Needs input no longer lists it, the session reads the answered
    /// variant, and its Terminal draws the answered picture.
    func testAPressOnAWaitingSessionAnswersIt() async throws {
        let reader = reader()
        let before = try await reader.blocked()
        XCTAssertEqual(before.rows.map(\.sessionId), ["s-wait"])
        let pressed = await reader.choose("s-wait", question: "\(SampleBookFixture.waitPrefix)-1", mark: SampleBookFixture.dialog, marker: "1")
        XCTAssertTrue(Self.done(pressed, .choose, "s-wait"), "\(pressed)")
        let state = await reader.world.currentState()
        XCTAssertEqual(state, "answered.live.ended")
        let after = try await reader.blocked()
        XCTAssertEqual(after.rows, [])
        let session = try await reader.session("s-wait")
        XCTAssertEqual(session.session.statusTitle, "Working")
        XCTAssertEqual(session.session.replyOffer, .empty)
        let screen = try await door(reader, "s-wait").read(since: nil)
        XCTAssertEqual(screen.revision, SampleBookFixture.revision["s-wait answered"])
        XCTAssertEqual(screen.screen, try Self.bookScreen("s-wait", "answered"))
    }

    /// A marker the offer does not list, and any session not waiting, is not
    /// taken, and nothing moves.
    func testAPressOffTheOfferOrOnASessionNotWaitingIsNotTaken() async throws {
        let reader = reader()
        let offOffer = await reader.choose("s-wait", question: "q", mark: "m", marker: "9")
        XCTAssertEqual(offOffer, .notTaken)
        let idle = await reader.choose("s-idle", question: "q", mark: "m", marker: "1")
        XCTAssertEqual(idle, .notTaken)
        let ended = await reader.choose("s-done", question: "q", mark: "m", marker: "1")
        XCTAssertEqual(ended, .notTaken)
        var state = await reader.world.currentState()
        XCTAssertEqual(state, "waiting.live.ended")
        _ = await reader.choose("s-wait", question: "q", mark: "m", marker: "2")
        let twice = await reader.choose("s-wait", question: "q", mark: "m", marker: "2")
        XCTAssertEqual(twice, .notTaken)
        state = await reader.world.currentState()
        XCTAssertEqual(state, "answered.live.ended")
    }

    /// End moves every variant to ended and answers done; an ended session
    /// stays ended.
    func testEndOnEveryVariantEndsIt() async throws {
        for (id, variant, state) in [
            ("s-wait", "waiting", "ended.live.ended"), ("s-idle", "live", "waiting.ended.ended"), ("s-done", "ended", "waiting.live.ended")
        ] {
            let reader = reader()
            let start = await reader.world.currentState()
            XCTAssertEqual(start, "waiting.live.ended", variant)
            let ended = await reader.end(id, batch: false)
            XCTAssertTrue(Self.done(ended, .end, id), "\(id) \(ended)")
            let now = await reader.world.currentState()
            XCTAssertEqual(now, state, id)
            let session = try await reader.session(id)
            XCTAssertEqual(session.session.statusTitle, "Ended", id)
            let screen = try await door(reader, id).read(since: nil)
            XCTAssertEqual(screen.why, .ended, id)
            XCTAssertEqual(screen.sentence, SampleBookFixture.endedSentence, id)
        }
        let reader = reader()
        _ = await reader.choose("s-wait", question: "q", mark: "m", marker: "1")
        let answered = await reader.end("s-wait", batch: false)
        XCTAssertTrue(Self.done(answered, .end, "s-wait"))
        let again = await reader.end("s-wait", batch: false)
        XCTAssertTrue(Self.done(again, .end, "s-wait"))
        let state = await reader.world.currentState()
        XCTAssertEqual(state, "ended.live.ended")
    }

    /// End these over three, each a batch End of its own: every one done,
    /// and every session reads Ended.
    func testEndTheseOverThreeEndsEachOnTheSamplesCopy() async throws {
        let reader = reader()
        for id in SampleBookFixture.ids {
            let result = await reader.end(id, batch: true)
            XCTAssertTrue(Self.done(result, .end, id), "\(id) \(result)")
        }
        let state = await reader.world.currentState()
        XCTAssertEqual(state, "ended.ended.ended")
        let blocked = try await reader.blocked()
        XCTAssertEqual(blocked.rows, [])
        XCTAssertEqual(blocked.others.map(\.statusTitle), ["Ended", "Ended", "Ended"])
        let ended = try await reader.sessions(SessionsQuery(show: .ended, group: .project, sort: .recent, agent: nil, machine: nil))
        XCTAssertEqual(ended.rows.map(\.statusTitle), ["Ended", "Ended", "Ended"])
    }

    /// Keys on an ended session are not taken.
    func testKeysOnAnEndedSessionAreNotTaken() async throws {
        let reader = reader()
        let typed = try await door(reader, "s-done").keys([.text("x")], turn: "", dialog: nil)
        XCTAssertEqual(typed, .notTaken)
    }

    // MARK: - The echo (D7)

    /// Printable ASCII appears on the prompt row as one run in the prompt's
    /// style, and the cursor sits after it.
    func testTextAppearsOnThePromptRow() async throws {
        let reader = reader()
        let held = try door(reader, "s-idle")
        let typed = await held.keys([.text("ls -la")], turn: "", dialog: nil)
        XCTAssertTrue(Self.done(typed, .keys, "s-idle"), "\(typed)")
        let book = try Self.bookScreen("s-idle", "live")
        let now = try await picture(held).screen
        XCTAssertEqual(now.lines[4], book.lines[4] + [Self.run("ls -la")])
        XCTAssertEqual(now.cursor, PocketScreenCursor(cursorColumn: 8, cursorRow: 4, visible: book.cursor.visible))
        for (index, line) in now.lines.enumerated() where index != 4 {
            XCTAssertEqual(line, book.lines[index], "row \(index)")
        }
    }

    /// A character outside printable ASCII is not echoed.
    func testACharacterOutsidePrintableASCIIIsNotEchoed() async throws {
        let reader = reader()
        let held = try door(reader, "s-idle")
        _ = await held.keys([.text("a\u{e9}\u{1F600}b\u{7f}c")], turn: "", dialog: nil)
        let now = try await picture(held).screen
        XCTAssertEqual(now.lines[4].last, Self.run("abc"))
    }

    /// Ctrl-C appears as `^C`, two cells; Backspace takes a `^C` back whole,
    /// and a letter.
    func testCtrlIsACaretAndBackspaceTakesAUnitBack() async throws {
        let reader = reader()
        let held = try door(reader, "s-idle")
        _ = await held.keys([.text("a"), .key(.controlC)], turn: "", dialog: nil)
        var now = try await picture(held).screen
        XCTAssertEqual(now.lines[4].last, Self.run("a^C"))
        XCTAssertEqual(now.cursor.cursorColumn, 5)
        _ = await held.keys([.key(.backspace)], turn: "", dialog: nil)
        now = try await picture(held).screen
        XCTAssertEqual(now.lines[4].last, Self.run("a"))
        _ = await held.keys([.key(.backspace)], turn: "", dialog: nil)
        now = try await picture(held).screen
        XCTAssertEqual(now.lines[4], try Self.bookScreen("s-idle", "live").lines[4])
        XCTAssertEqual(now.cursor.cursorColumn, 2)
        _ = await held.keys([.key(.backspace)], turn: "", dialog: nil)
        now = try await picture(held).screen
        XCTAssertEqual(now.lines[4], try Self.bookScreen("s-idle", "live").lines[4])
    }

    /// Return empties the prompt and draws ONE line saying nothing ran, cut
    /// to the screen's width, never a shell's answer.
    func testReturnEmptiesThePromptAndSaysNothingRan() async throws {
        let reader = reader()
        let held = try door(reader, "s-idle")
        _ = await held.keys([.text("ls"), .key(.enter)], turn: "", dialog: nil)
        let book = try Self.bookScreen("s-idle", "live")
        let now = try await picture(held).screen
        XCTAssertEqual(now.lines[4], book.lines[4])
        let cut = String(Copy.sampleNothingRan.prefix(SampleBookFixture.columns))
        XCTAssertEqual(now.lines[3], [Self.run(cut)])
        XCTAssertEqual(now.cursor.cursorColumn, 2)
        _ = await held.keys([.text("pwd")], turn: "", dialog: nil)
        let later = try await picture(held).screen
        XCTAssertEqual(later.lines[4].last, Self.run("pwd"))
        XCTAssertEqual(later.lines[3], [Self.run(cut)])
    }

    /// Return's line is Copy's words, printable ASCII, a character a cell.
    func testReturnsLineIsCopysWords() {
        XCTAssertEqual(SampleWorld.nothingRan, Copy.sampleNothingRan)
        XCTAssertTrue(SampleWorld.nothingRan.unicodeScalars.allSatisfy(SampleWorld.echoes))
    }

    /// A full prompt row drops further text, and a `^X` that would not fit.
    func testAFullPromptRowDropsFurtherText() async throws {
        let reader = reader()
        let held = try door(reader, "s-idle")
        let room = SampleBookFixture.columns - 2
        _ = await held.keys([.text(String(repeating: "x", count: room + 7))], turn: "", dialog: nil)
        var now = try await picture(held).screen
        XCTAssertEqual(now.lines[4].last, Self.run(String(repeating: "x", count: room)))
        XCTAssertEqual(now.cursor.cursorColumn, SampleBookFixture.columns)
        _ = await held.keys([.key(.backspace), .key(.controlC)], turn: "", dialog: nil)
        now = try await picture(held).screen
        XCTAssertEqual(now.lines[4].last, Self.run(String(repeating: "x", count: room - 1)))
    }

    /// Every write moves the question id one on and the revision to one never
    /// drawn, and every echoed picture holds together.
    func testEveryWriteMovesTheQuestionIdAndTheRevision() async throws {
        let reader = reader()
        let held = try door(reader, "s-idle")
        let first = try await picture(held)
        XCTAssertEqual(first.screen.turn, "\(SampleBookFixture.idlePrefix)-1")
        var seen: Set<String> = [first.answer.revision]
        let writes: [[KeyItem]] = [[.text("a")], [.key(.escape)], [.key(.up)], [.key(.controlZ)], [.key(.enter)], [.key(.backspace)], [.text("b")]]
        for (index, items) in writes.enumerated() {
            _ = await held.keys(items, turn: "", dialog: nil)
            let now = try await picture(held)
            XCTAssertEqual(now.screen.turn, "\(SampleBookFixture.idlePrefix)-\(index + 2)")
            XCTAssertTrue(PocketReplyOffer.isMark(now.answer.revision), now.answer.revision)
            XCTAssertTrue(seen.insert(now.answer.revision).inserted, "revision \(now.answer.revision) drawn before")
            XCTAssertTrue(PocketScreen.holdsTogether(
                columns: now.screen.screenColumns, rows: now.screen.screenRows, cursor: now.screen.cursor,
                styles: now.screen.styles.count, lines: now.screen.lines, turn: now.screen.turn, dialog: now.screen.dialog
            ))
        }
    }

    /// Escape, Tab and the arrows draw nothing.
    func testOtherKeysDrawNothing() async throws {
        let reader = reader()
        let held = try door(reader, "s-idle")
        _ = await held.keys([.key(.escape)], turn: "", dialog: nil)
        _ = await held.keys([.key(.tab)], turn: "", dialog: nil)
        _ = await held.keys([.key(.up)], turn: "", dialog: nil)
        let now = try await picture(held).screen
        XCTAssertEqual(now.lines, try Self.bookScreen("s-idle", "live").lines)
    }

    /// A waiting screen has no prompt: keys draw nothing there, but the
    /// question id and the revision move, so the key sender's lock lets go.
    func testAWaitingScreenDrawsNothingTyped() async throws {
        let reader = reader()
        let held = try door(reader, "s-wait")
        let first = try await picture(held)
        _ = await held.keys([.text("1")], turn: first.screen.turn, dialog: first.screen.dialog)
        let now = try await picture(held)
        let book = try Self.bookScreen("s-wait", "waiting")
        XCTAssertEqual(now.screen.lines, book.lines)
        XCTAssertEqual(now.screen.cursor, book.cursor)
        XCTAssertEqual(now.screen.dialog, book.dialog)
        XCTAssertEqual(now.screen.turn, "\(SampleBookFixture.waitPrefix)-2")
        XCTAssertNotEqual(now.answer.revision, first.answer.revision)
    }

    /// A press clears the echo: the answered picture is the book's, under its
    /// own revision, until something is typed on it.
    func testAVariantChangeClearsTheEcho() async throws {
        let reader = reader()
        let held = try door(reader, "s-wait")
        _ = await held.keys([.text("x")], turn: "", dialog: nil)
        _ = await reader.choose("s-wait", question: "q", mark: "m", marker: "1")
        let answered = try await picture(held)
        XCTAssertEqual(answered.answer.revision, SampleBookFixture.revision["s-wait answered"])
        XCTAssertEqual(answered.screen, try Self.bookScreen("s-wait", "answered"))
        _ = await held.keys([.text("y")], turn: "", dialog: nil)
        let typed = try await picture(held)
        XCTAssertEqual(typed.screen.lines[4].last, Self.run("y"))
        XCTAssertEqual(typed.screen.turn, "\(SampleBookFixture.waitPrefix)-3")
    }

    /// The echo is handed out only when its picture holds together; one that
    /// would not is nil, and the book's is drawn.
    func testAnEchoThatWouldNotHoldTogetherIsNotDrawn() throws {
        let book = try Self.bookScreen("s-idle", "live")
        var echo = SampleEcho()
        echo.add("a", room: 18)
        echo.moved()
        let fits = SampleEcho.Rows(prompt: .init(row: 4, column: 2, style: 0), note: nil)
        XCTAssertNotNil(SampleWorld.echoed(book, rows: fits, echo: echo))
        let pastTheRows = SampleEcho.Rows(prompt: .init(row: 9, column: 2, style: 0), note: nil)
        XCTAssertNil(SampleWorld.echoed(book, rows: pastTheRows, echo: echo))
        let pastTheStyles = SampleEcho.Rows(prompt: .init(row: 4, column: 2, style: 7), note: nil)
        XCTAssertNil(SampleWorld.echoed(book, rows: pastTheStyles, echo: echo))
        let pastTheWidth = SampleEcho.Rows(prompt: .init(row: 4, column: 20, style: 0), note: nil)
        XCTAssertNil(SampleWorld.echoed(book, rows: pastTheWidth, echo: echo))
    }

    /// The pieces of the echo: a revision is 12 lowercase hex, the question
    /// id moves by the writes, and only `C-a` to `C-z` are a caret.
    func testTheEchosPieces() {
        XCTAssertEqual(SampleWorld.revision(1), "000000000001")
        XCTAssertEqual(SampleWorld.revision(255), "0000000000ff")
        XCTAssertTrue(PocketReplyOffer.isMark(SampleWorld.revision(123_456)))
        XCTAssertEqual(SampleWorld.turnMoved("0123456789abcdef-1", by: 2), "0123456789abcdef-3")
        XCTAssertNil(SampleWorld.turnMoved("not-a-turn", by: 1))
        XCTAssertNil(SampleWorld.turnMoved("0123456789abcdef", by: 1))
        XCTAssertEqual(SampleWorld.controlLetter(.controlC), "C")
        XCTAssertEqual(SampleWorld.controlLetter(.controlZ), "Z")
        XCTAssertNil(SampleWorld.controlLetter(.enter))
        XCTAssertNil(SampleWorld.controlLetter(.backTab))
        var echo = SampleEcho()
        echo.add("a", room: 1)
        echo.add("b", room: 1)
        XCTAssertEqual(echo.text, "a")
        echo.pressReturn()
        XCTAssertEqual(echo.text, "")
        XCTAssertTrue(echo.returned)
    }

    // MARK: - The held read (D8)

    /// No `since`, or a `since` that is not the revision drawn now, answers at
    /// once.
    func testAStaleSinceAnswersAtOnce() async throws {
        let reader = reader()
        let held = try door(reader, "s-idle")
        let started = Date()
        let none = try await held.read(since: nil)
        let stale = try await held.read(since: "000000000000")
        XCTAssertLessThan(Date().timeIntervalSince(started), 0.1)
        XCTAssertFalse(none.unchanged)
        XCTAssertFalse(stale.unchanged)
        XCTAssertNotNil(stale.screen)
    }

    /// A read holding the revision drawn now wakes on a change within 200 ms
    /// and answers the new picture.
    func testAHeldReadWakesOnAChangeWithin200ms() async throws {
        let reader = reader()
        let held = try door(reader, "s-idle")
        let first = try await held.read(since: nil)
        let read = Task { try await held.read(since: first.revision) }
        try await Task.sleep(nanoseconds: 50_000_000)
        let changed = Date()
        _ = await held.keys([.text("x")], turn: "", dialog: nil)
        let answer = try await within(2, read)
        XCTAssertLessThan(Date().timeIntervalSince(changed), 0.2)
        XCTAssertFalse(answer.unchanged)
        XCTAssertNotEqual(answer.revision, first.revision)
        XCTAssertEqual(answer.screen?.lines[4].last, Self.run("x"))
    }

    /// An End wakes a held read, which answers main's ended absence.
    func testAHeldReadWakesOnAnEnd() async throws {
        let reader = reader()
        let held = try door(reader, "s-idle")
        let first = try await held.read(since: nil)
        let read = Task { try await held.read(since: first.revision) }
        try await Task.sleep(nanoseconds: 50_000_000)
        _ = await reader.end("s-idle", batch: false)
        let answer = try await within(2, read)
        XCTAssertEqual(answer.why, .ended)
        XCTAssertNil(answer.screen)
    }

    /// With nothing changing, a held read answers `unchanged` once its hold
    /// has passed on the clock it was handed: the revision it holds, no
    /// screen and no absence. Before that it answers nothing.
    func testAHeldReadAnswersUnchangedAfterItsHold() async throws {
        let clock = Clock()
        let reader = reader(clock)
        let held = try door(reader, "s-idle")
        let first = try await held.read(since: nil)
        let read = Task { try await held.read(since: first.revision) }
        try await Task.sleep(nanoseconds: 300_000_000)
        clock.advance(SampleWorld.holdMs - 1)
        try await Task.sleep(nanoseconds: 300_000_000)
        let advanced = Date()
        clock.advance(2)
        let answer = try await within(2, read)
        XCTAssertLessThan(Date().timeIntervalSince(advanced), 0.25)
        XCTAssertTrue(answer.unchanged)
        XCTAssertEqual(answer.revision, first.revision)
        XCTAssertNil(answer.screen)
        XCTAssertNil(answer.why)
        XCTAssertNil(answer.sentence)
        XCTAssertEqual(answer.at, clock.now)
    }

    /// The held read never answered before its hold: it was still waiting
    /// when the test let it go.
    func testAHeldReadWaitsWhileNothingChanges() async throws {
        let reader = reader()
        let held = try door(reader, "s-idle")
        let first = try await held.read(since: nil)
        let answered = Answered()
        let read = Task {
            let answer = try await held.read(since: first.revision)
            await answered.mark()
            return answer
        }
        try await Task.sleep(nanoseconds: 400_000_000)
        let early = await answered.done
        XCTAssertFalse(early)
        read.cancel()
        _ = try? await read.value
    }

    /// The read's own task's cancellation ends it at once.
    func testAHeldReadEndsOnCancellationWithin100ms() async throws {
        let reader = reader()
        let held = try door(reader, "s-idle")
        let first = try await held.read(since: nil)
        let read = Task { try await held.read(since: first.revision) }
        try await Task.sleep(nanoseconds: 50_000_000)
        let cancelled = Date()
        read.cancel()
        do {
            _ = try await read.value
            XCTFail("a cancelled read answered")
        } catch {
            XCTAssertTrue(error is CancellationError, "\(error)")
        }
        XCTAssertLessThan(Date().timeIntervalSince(cancelled), 0.1)
    }

    private actor Answered {
        private(set) var done = false
        func mark() { done = true }
    }

    // MARK: - The history (D9)

    /// A page is the history's rows `[from, from + count)` under its whole
    /// style table, with the ask's own `from`, `depth` and `wrap` and the
    /// picture's space.
    func testAPageIsTheHistorySliced() async throws {
        let reader = reader()
        let held = try door(reader, "s-idle")
        let history = try SampleBookFixture.book().history(id: "s-idle")
        for (from, count) in [(0, 60), (20, 40), (59, 1)] {
            let page = try await held.scrollback(from: from, count: count, depth: 60, wrap: 20, keep: .bottom)
            XCTAssertNil(page.why, "\(from)")
            XCTAssertEqual(page.pageFrom, from)
            XCTAssertEqual(page.pageDepth, 60)
            XCTAssertEqual(page.pageWrap, 20)
            XCTAssertEqual(page.space, SampleBookFixture.space["s-idle"])
            XCTAssertEqual(page.styles, history.styles)
            XCTAssertEqual(page.rows, Array(history.rows[from..<(from + count)]))
            XCTAssertEqual(page.rows.first, [Self.run("line \(from)")])
        }
        let top = try await held.scrollback(from: 0, count: 60, depth: 60, wrap: 20, keep: .top)
        XCTAssertEqual(top.rows.count, 60)
    }

    /// An ask the picture did not make is main's `moved`: another depth,
    /// another width, no rows, or past the depth.
    func testAnAskThePictureDidNotMakeIsMoved() async throws {
        let reader = reader()
        let held = try door(reader, "s-idle")
        for (from, count, depth, wrap) in [(0, 10, 59, 20), (0, 10, 61, 20), (0, 10, 60, 21), (0, 0, 60, 20), (50, 20, 60, 20), (-1, 5, 60, 20)] {
            let page = try await held.scrollback(from: from, count: count, depth: depth, wrap: wrap, keep: .bottom)
            XCTAssertEqual(page.why, .moved, "\(from) \(count) \(depth) \(wrap)")
            XCTAssertEqual(page.sentence, SampleBookFixture.movedSentence)
            XCTAssertEqual(page.rows, [])
        }
    }

    /// After End, a page is main's `ended`.
    func testAPageAfterEndIsEnded() async throws {
        let reader = reader()
        let held = try door(reader, "s-idle")
        _ = await reader.end("s-idle", batch: false)
        let page = try await held.scrollback(from: 0, count: 60, depth: 60, wrap: 20, keep: .bottom)
        XCTAssertEqual(page.why, .ended)
        XCTAssertEqual(page.sentence, SampleBookFixture.endedSentence)
    }

    /// The answered variant pages the same history.
    func testTheAnsweredVariantPagesTheSameHistory() async throws {
        let reader = reader()
        let held = try door(reader, "s-wait")
        _ = await reader.choose("s-wait", question: "q", mark: "m", marker: "3")
        let page = try await held.scrollback(from: 0, count: 60, depth: 60, wrap: 20, keep: .bottom)
        XCTAssertNil(page.why)
        XCTAssertEqual(page.space, SampleBookFixture.space["s-wait"])
    }

    // MARK: - Over the book the app carries

    /// The sample the app carries, on the tests' clock.
    private func bundled(_ clock: Clock = Clock()) throws -> SampleReader {
        SampleReader(book: try XCTUnwrap(SampleBook.bundled(), "the app carries no sample.json this build reads"), now: clock.read)
    }

    /// A press on each waiting session answers it, by its own first option,
    /// and Needs input then lists none.
    func testAPressOnEachWaitingSessionOfTheBundledBook() async throws {
        let reader = try bundled()
        let waiting = try await reader.blocked().rows
        XCTAssertEqual(waiting.count, 2)
        XCTAssertEqual(Set(waiting.map(\.agent)), ["claude", "codex"])
        for row in waiting {
            let offer = try await reader.session(row.sessionId).session.replyOffer
            let marker = try XCTUnwrap(offer.pressable.first, row.sessionId)
            let pressed = await reader.choose(row.sessionId, question: offer.question ?? "", mark: offer.mark ?? "", marker: marker)
            XCTAssertTrue(Self.done(pressed, .choose, row.sessionId), "\(row.sessionId) \(pressed)")
            let after = try await reader.session(row.sessionId).session
            XCTAssertEqual(after.replyOffer, .empty, row.sessionId)
            XCTAssertNotEqual(after.statusTitle, row.statusTitle, row.sessionId)
        }
        let none = try await reader.blocked()
        XCTAssertEqual(none.rows, [])
    }

    /// End these over three live sessions of the book: each done, and Show
    /// Ended then lists every session.
    func testEndTheseOverThreeOfTheBundledBook() async throws {
        let reader = try bundled()
        let book = try XCTUnwrap(SampleBook.bundled())
        let live = book.ids.filter { book.start[$0] != SampleWorld.Variant.ended }
        XCTAssertGreaterThanOrEqual(live.count, 3)
        for id in live.prefix(3) {
            let result = await reader.end(id, batch: true)
            XCTAssertTrue(Self.done(result, .end, id), "\(id) \(result)")
        }
        let ended = try await reader.sessions(SessionsQuery(show: .ended, group: .project, sort: .recent, agent: nil, machine: nil))
        XCTAssertEqual(ended.rows.count, book.ids.count - live.count + 3)
    }

    /// The echo and the history over every live session of the book: what he
    /// types lands after the agent's own prompt, Return draws Copy's line on
    /// the book's note row, every picture holds together, and one page is the
    /// whole history.
    func testTheEchoAndTheHistoryOverTheBundledBook() async throws {
        let reader = try bundled()
        let book = try XCTUnwrap(SampleBook.bundled())
        for id in book.ids where book.start[id] == SampleWorld.Variant.live {
            let kept = try book.screen(id: id, variant: SampleWorld.Variant.live, at: 1)
            let rows = try XCTUnwrap(kept.rows, id)
            let held = try door(reader, id)
            _ = await held.keys([.text("ls -la")], turn: "", dialog: nil)
            var now = try await picture(held).screen
            XCTAssertEqual(now.lines[rows.prompt.row].last, Self.run("ls -la", rows.prompt.style), id)
            XCTAssertEqual(now.cursor.cursorColumn, rows.prompt.column + 6, id)
            _ = await held.keys([.key(.enter)], turn: "", dialog: nil)
            now = try await picture(held).screen
            let note = try XCTUnwrap(rows.note, id)
            XCTAssertEqual(now.lines[note.row], [Self.run(Copy.sampleNothingRan, note.style)], id)
            XCTAssertEqual(now.lines[rows.prompt.row], try XCTUnwrap(kept.answer.screen).lines[rows.prompt.row], id)
            XCTAssertTrue(PocketScreen.holdsTogether(
                columns: now.screenColumns, rows: now.screenRows, cursor: now.cursor, styles: now.styles.count,
                lines: now.lines, turn: now.turn, dialog: now.dialog
            ), id)
            let history = try book.history(id: id)
            let depth = try XCTUnwrap(history.pageDepth)
            let wrap = try XCTUnwrap(history.pageWrap)
            XCTAssertEqual(now.historyDepth, depth, id)
            XCTAssertEqual(now.space, history.space, id)
            let page = try await held.scrollback(from: 0, count: depth, depth: depth, wrap: wrap, keep: .bottom)
            XCTAssertEqual(page.rows, history.rows, id)
        }
    }

    // MARK: - The three words (D17)

    /// The sample keeps Show, Group by and Sort by in memory alone, and each
    /// sample starts from the standard words.
    func testTheSamplesChoicesAreInMemoryAndFresh() {
        let choices = SampleChoices()
        XCTAssertEqual(choices.load(), .standard)
        let words = SessionsWords(show: .ended, group: .none, sort: .oldest)
        choices.save(words)
        XCTAssertEqual(choices.load(), words)
        XCTAssertEqual(SampleChoices().load(), .standard)
    }
}
