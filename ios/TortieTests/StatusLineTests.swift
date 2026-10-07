import XCTest
@testable import Tortie

/// The Terminal's status line (Phase 337.1, build/p3371/SPEC.md D17, D30): one
/// line under the title from the session's answer, re-read when a drawn
/// picture's `turn` or `asking` moves, never two reads in a second, one in
/// flight, and through the Terminal's side line alone. The read and the
/// second are handed in, so every test holds them; nothing here reaches a
/// network or a clock. Each test names the clause it holds, and each fails
/// when that clause is taken out of Screens/SessionScreen.swift.
@MainActor
final class StatusLineTests: XCTestCase {
    /// A read the test can count and hold.
    @MainActor
    private final class Reads {
        private(set) var started = 0
        var holding = false
        private var held: [CheckedContinuation<Void, Never>] = []

        func read() async {
            started += 1
            guard holding else { return }
            await withCheckedContinuation { held.append($0) }
        }

        func finish() {
            let all = held
            held = []
            for one in all { one.resume() }
        }
    }

    /// The second after a read, which the test lets pass.
    private final class Second: @unchecked Sendable {
        private let lock = NSLock()
        private var held: [CheckedContinuation<Void, Never>] = []

        func wait() async {
            await withCheckedContinuation { continuation in
                lock.withLock { held.append(continuation) }
            }
        }

        var waiting: Int { lock.withLock { held.count } }

        func pass() {
            let all: [CheckedContinuation<Void, Never>] = lock.withLock {
                let all = held
                held = []
                return all
            }
            for one in all { one.resume() }
        }
    }

    private func follow(_ reads: Reads, _ second: Second) -> StatusFollow {
        StatusFollow(read: { await reads.read() }, wait: { await second.wait() })
    }

    private let calm = StatusFollow.Mark(turn: "0123456789abcdef-1", asking: false)
    private let moved = StatusFollow.Mark(turn: "0123456789abcdef-2", asking: false)
    private let asking = StatusFollow.Mark(turn: "0123456789abcdef-2", asking: true)

    /// Let every task that can run, run.
    private func settle() async {
        for _ in 0..<50 { await Task.yield() }
    }

    /// Settle until the read and the second are both over.
    private func quiet(_ follow: StatusFollow, _ second: Second) async {
        await settle()
        second.pass()
        await settle()
        await follow.reading?.value
        await settle()
    }

    // MARK: When it reads

    /// Clause (D17): a picture whose turn moved reads the session again, and
    /// so does one whose `asking` moved (the one status the turn does not
    /// cover); a picture that moved nothing reads nothing.
    func testAMovedTurnOrAskingReadsAgain() async {
        let reads = Reads()
        let second = Second()
        let follow = follow(reads, second)
        follow.picture(calm)
        follow.picture(calm)
        await settle()
        XCTAssertEqual(reads.started, 0, "a picture that moved nothing read the session")
        follow.picture(moved)
        await settle()
        XCTAssertEqual(reads.started, 1, "a moved turn read nothing")
        await quiet(follow, second)
        follow.picture(moved)
        await settle()
        XCTAssertEqual(reads.started, 1)
        follow.picture(asking)
        await settle()
        XCTAssertEqual(reads.started, 2, "a moved asking read nothing")
    }

    /// Clause (D17): never two reads in a second. A change seen within the
    /// second of a read waits for it to pass, then reads once.
    func testNeverTwoReadsInASecond() async {
        let reads = Reads()
        let second = Second()
        let follow = follow(reads, second)
        follow.picture(calm)
        follow.picture(moved)
        await settle()
        await follow.reading?.value
        XCTAssertEqual(reads.started, 1)
        follow.picture(asking)
        follow.picture(calm)
        follow.picture(asking)
        await settle()
        XCTAssertEqual(reads.started, 1, "a second read started inside the second")
        XCTAssertEqual(second.waiting, 1)
        second.pass()
        await settle()
        XCTAssertEqual(reads.started, 2, "the change seen inside the second was never read")
    }

    /// Clause (D17): one read in flight. A change seen while a read is out
    /// waits for it AND for its second; then one read follows.
    func testOneReadInFlight() async {
        let reads = Reads()
        reads.holding = true
        let second = Second()
        let follow = follow(reads, second)
        follow.picture(calm)
        follow.picture(moved)
        await settle()
        XCTAssertEqual(reads.started, 1)
        second.pass()
        follow.picture(asking)
        await settle()
        XCTAssertEqual(reads.started, 1, "a second read started while the first was in flight")
        reads.holding = false
        reads.finish()
        await settle()
        XCTAssertEqual(reads.started, 2, "the change seen while the read was out was never read")
    }

    /// Clause (D17): a change that went back to what the last read started
    /// at before the second passed reads nothing.
    func testAChangeThatWentBackReadsNothing() async {
        let reads = Reads()
        let second = Second()
        let follow = follow(reads, second)
        follow.picture(calm)
        follow.picture(moved)
        await settle()
        await follow.reading?.value
        follow.picture(asking)
        follow.picture(moved)
        await quiet(follow, second)
        XCTAssertEqual(reads.started, 1, "a change that went back was read")
    }

    /// Clause (D17): the first appear reads nothing (the route's answer that
    /// decided the face is that read); a later appear and a return to the
    /// foreground read, except within the second of a read.
    func testTheFirstAppearIsTheRoutesRead() async {
        let reads = Reads()
        let second = Second()
        let follow = follow(reads, second)
        follow.appeared()
        await settle()
        XCTAssertEqual(reads.started, 0, "the Terminal read again what the route had just read")
        follow.appeared()
        await settle()
        XCTAssertEqual(reads.started, 1, "coming back to the Terminal read nothing")
        follow.appeared()
        await settle()
        XCTAssertEqual(reads.started, 1, "an appear inside the second read again")
        await quiet(follow, second)
        follow.appeared()
        await settle()
        XCTAssertEqual(reads.started, 2)
    }

    /// Clause (D17): the page going away starts nothing more; a change it saw
    /// is read on its return, not behind it.
    func testGoingAwayStartsNothing() async {
        let reads = Reads()
        let second = Second()
        let follow = follow(reads, second)
        follow.picture(calm)
        follow.picture(moved)
        await settle()
        follow.picture(asking)
        follow.stop()
        await quiet(follow, second)
        XCTAssertEqual(reads.started, 1, "a read started after the page went away")
    }

    // MARK: Through the side line alone

    /// Clause (D17, D30): a session model handed a read reads through it and
    /// never through the reader, so the Terminal's re-reads ride its side
    /// line; one with none reads through the reader, as before.
    func testTheTerminalReadsThroughItsSideLineAlone() async {
        let door = ScriptedSideDoor(session: [.success(sessionAnswer(screen: true))])
        let reader = ScriptedReader(session: [.success(sessionAnswer(screen: true))])
        let side = SessionModel(sessionId: "s", door: reader, routing: .stay, read: { try await door.session() })
        let drew = await side.load()
        XCTAssertTrue(drew)
        XCTAssertEqual(door.sessionCalls, 1)
        let readerCalls = await reader.sessionCalls
        XCTAssertEqual(readerCalls, 0, "the Terminal's re-read went through the reader")
        let plain = SessionModel(sessionId: "s", door: reader, routing: .stay)
        await plain.load()
        let afterPlain = await reader.sessionCalls
        XCTAssertEqual(afterPlain, 1)
        XCTAssertEqual(door.sessionCalls, 1)
    }

    /// Clause (D17): the line keeps the last answer the Mac gave when a later
    /// read fails, rather than going blank.
    func testTheLineKeepsTheLastAnswerOverAFailedRead() async throws {
        let model = SessionModel(
            sessionId: "s",
            door: ScriptedReader(session: [.success(sessionAnswer(screen: true, title: "Needs input")), .failure(.timedOut)]),
            routing: .stay
        )
        await model.load()
        await model.load()
        XCTAssertEqual(model.phase, .failed(Copy.macDidNotAnswer))
        let kept = try XCTUnwrap(model.latest, "the line went blank over a read that failed")
        XCTAssertEqual(kept.statusTitle, "Needs input")
    }

    /// Clause (D17): a picture's mark is its turn and asking, and no picture
    /// is no mark.
    func testAPicturesMarkIsItsTurnAndAsking() {
        XCTAssertNil(StatusFollow.Mark(nil))
        XCTAssertNotEqual(calm, moved)
        XCTAssertNotEqual(moved, asking)
        XCTAssertEqual(StatusFollow.gap, .seconds(1))
    }

    // MARK: What the line draws

    /// Clause (D17, rule at): the line reads `SessionDrawing` fields alone,
    /// one line with the status in its dot's colour, `·`, the agent line and
    /// the machine's badge, under `terminal-status`; and the Terminal follows
    /// every drawn picture's mark into it.
    func testTheLineIsTheDrawingsFieldsAlone() throws {
        let session = try StyleSource.text("ios/Tortie/Screens/SessionScreen.swift")
        let start = try XCTUnwrap(session.range(of: "struct StatusLine: View {"))
        let end = try XCTUnwrap(session.range(of: "\n}\n", range: start.upperBound..<session.endIndex))
        let line = String(session[start.upperBound..<end.lowerBound])
        XCTAssertTrue(line.contains("    let drawing: SessionDrawing\n"))
        XCTAssertEqual(line.components(separatedBy: "\n    let ").count, 2, "the line holds more than the drawing")
        XCTAssertEqual(line.components(separatedBy: "\n    var ").count, 2, "the line holds more than the drawing")
        XCTAssertTrue(line.contains("\n    var body: some View {"))
        for part in ["Words(drawing.statusTitle, .secondary, drawing.dot.color)", "Words(Copy.separator", "Words(drawing.agentLine", "MachineBadge(name: machine)", ".accessibilityIdentifier(ID.terminalStatus)"] {
            XCTAssertTrue(line.contains(part), "the line does not draw \(part)")
        }
        let page = try XCTUnwrap(session.range(of: "struct TerminalPage: View {"))
        let rest = session[page.upperBound...]
        XCTAssertTrue(rest.contains(".onChange(of: StatusFollow.Mark(screen.picture)) { _, mark in\n            follow.picture(mark)"))
        XCTAssertTrue(rest.contains("session.latest ?? first"))
        XCTAssertEqual(ID.terminalStatus, "terminal-status")
    }
}
