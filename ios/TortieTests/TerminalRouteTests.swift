import XCTest
@testable import Tortie

/// Terminal first (Phase 337.1, build/p3371/SPEC.md D16, D18, D19, D30, his
/// ruling "lets do B"): a session's route reads it once and opens on its
/// Terminal exactly when the answer says it has one and the reader has a door
/// to it, else on Catch Me Up; the face is decided at the first answer and
/// kept; the Terminal's ⋯ pushes Catch Me Up (its menu's first item since
/// Phase 337.3); its tray offers exactly the
/// options the Mac offers to press; and the door's side line takes one
/// exchange at a time. The door is a script (ScreensFixtures.swift); nothing
/// here reaches a network. Each test names the clause it holds, and each
/// fails when that clause is taken out of App/TortieApp.swift or
/// Screens/SessionScreen.swift.
@MainActor
final class TerminalRouteTests: XCTestCase {
    /// Records where the route sent the app.
    @MainActor
    private final class Routes {
        var backToList = 0
        var pairAgain = 0
        var routing: ReadRouting {
            ReadRouting(
                backToList: { [weak self] in self?.backToList += 1 },
                pairAgain: { [weak self] in self?.pairAgain += 1 }
            )
        }
    }

    private func route(
        _ answers: [Result<PocketSessionAnswer, DoorFailure>],
        door: (any ScreenDoor)? = ScriptedSideDoor(),
        routes: Routes = Routes()
    ) -> SessionRouteModel {
        SessionRouteModel(
            sessionId: "s",
            reader: ScreenedReader(base: ScriptedReader(session: answers), door: door),
            routing: routes.routing
        )
    }

    // MARK: Which face

    /// Clause (D16): the Terminal exactly when the session has one AND there
    /// is a door to it; Catch Me Up in every other case.
    func testTheTerminalExactlyWhenTheSessionHasOneAndADoor() {
        XCTAssertEqual(SessionRouteModel.face(screen: true, hasDoor: true), .terminal)
        XCTAssertEqual(SessionRouteModel.face(screen: true, hasDoor: false), .catchUp)
        XCTAssertEqual(SessionRouteModel.face(screen: false, hasDoor: true), .catchUp)
        XCTAssertEqual(SessionRouteModel.face(screen: false, hasDoor: false), .catchUp)
    }

    /// Clause (D16, his ruling 3): a running session opens on its Terminal,
    /// through the door the reader answered, after ONE read.
    func testARunningSessionOpensOnItsTerminal() async {
        let door = ScriptedSideDoor()
        let route = route([.success(sessionAnswer(screen: true))], door: door)
        XCTAssertNil(route.face, "a face was drawn before any answer")
        await route.load()
        XCTAssertEqual(route.face, .terminal)
        XCTAssertTrue(route.terminalDoor === door, "the Terminal is not the reader's door")
        XCTAssertEqual(door.sessionCalls, 0, "the route's first read went through the Terminal's side line")
        XCTAssertEqual(route.session.latest?.screen, true)
    }

    /// Clause (D16, "an ended session opens on Catch Me Up"): a session that
    /// is not running opens on Catch Me Up, and no Terminal door is held.
    func testAnEndedSessionOpensOnCatchUp() async {
        let route = route([.success(sessionAnswer(screen: false, title: "Ended"))])
        await route.load()
        XCTAssertEqual(route.face, .catchUp)
        XCTAssertNil(route.terminalDoor)
    }

    /// Clause (D16): a Mac older than Phase 337 sends no `screen`, so its
    /// sessions open on Catch Me Up, which holds everything its page held.
    func testAMacWithoutTheScreenOpensOnCatchUp() async {
        let route = route([.success(sessionAnswer(screen: nil))])
        await route.load()
        XCTAssertEqual(route.face, .catchUp)
    }

    /// Clause (D16): a reader with no screen door (See a Sample until 333.3)
    /// opens even a running session on Catch Me Up.
    func testNoScreenDoorOpensOnCatchUp() async {
        let route = route([.success(sessionAnswer(screen: true))], door: nil)
        await route.load()
        XCTAssertEqual(route.face, .catchUp)
        XCTAssertNil(route.terminalDoor)
    }

    /// Clause (D16): the face is decided at the FIRST answer and kept, so
    /// nothing he is looking at swaps under him: a session that ends while
    /// he watches keeps its Terminal, and one that starts keeps Catch Me Up.
    func testTheFaceIsDecidedOnceAndKept() async {
        let ending = route([.success(sessionAnswer(screen: true)), .success(sessionAnswer(screen: false, title: "Ended"))])
        await ending.load()
        await ending.load()
        XCTAssertEqual(ending.session.latest?.screen, false, "the second answer was not read")
        XCTAssertEqual(ending.face, .terminal, "the face swapped under him")
        let starting = route([.success(sessionAnswer(screen: false)), .success(sessionAnswer(screen: true))])
        await starting.load()
        await starting.load()
        XCTAssertEqual(starting.face, .catchUp, "the face swapped under him")
        XCTAssertNil(starting.terminalDoor)
    }

    /// Clause (D16, §Attack B12): a first read that fails decides nothing and
    /// draws its sentence; Try again reads again and that answer decides.
    func testAFailedFirstReadDecidesNothingUntilItAnswers() async {
        let route = route([.failure(.timedOut), .success(sessionAnswer(screen: true))])
        await route.load()
        XCTAssertNil(route.face)
        XCTAssertEqual(route.session.phase, .failed(Copy.macDidNotAnswer))
        await route.load()
        XCTAssertEqual(route.face, .terminal)
    }

    /// Clause (D16): an answer this build cannot draw, or one about another
    /// session, decides nothing: a face is decided only by a drawn answer.
    func testAnUnreadableAnswerDecidesNothing() async {
        let route = route([.success(sessionAnswer("t", screen: true))])
        await route.load()
        XCTAssertNil(route.face)
        XCTAssertNil(route.terminalDoor)
        XCTAssertEqual(route.session.phase, .failed(Copy.answerUnreadable))
    }

    /// Clause (D16): a refusal goes where the session page's refusal went: a
    /// 404 back to the list, and no face.
    func testARefusalGoesBackToTheList() async {
        let routes = Routes()
        let route = route([.failure(.refused)], routes: routes)
        await route.load()
        XCTAssertNil(route.face)
        XCTAssertEqual(routes.backToList, 1)
        XCTAssertEqual(routes.pairAgain, 0)
    }

    // MARK: The routes

    /// Clause (§5.5.3): Catch Me Up from the Terminal's ⋯ is pushed on the
    /// tab it was pressed on, with the session's own line.
    func testTheMenuPushesCatchUpOnItsTab() {
        let app = AppModel(door: StandInPhone(kept: ScriptedReader()), label: "iPhone", alerts: StandInAlerts())
        app.waitingPath = [.session(id: "w", name: "w")]
        app.openCatchUp("w", honestLine: "The agent is waiting for you.", in: .needsInput)
        XCTAssertEqual(app.waitingPath, [.session(id: "w", name: "w"), .catchUp(id: "w", honestLine: "The agent is waiting for you.")])
        XCTAssertEqual(app.sessionsPath, [])
        XCTAssertTrue(app.isTop(.catchUp(id: "w", honestLine: "The agent is waiting for you."), in: .needsInput))
    }

    /// Clause (§5.5.3, rule at): no `Route.screen`, no `openScreen`, no
    /// `ScreenRoute` and no `ConversationRoute`; the session route draws the
    /// Terminal face or Catch Me Up inside one `screen-session` container, and
    /// the Terminal face registers and releases its key sender.
    func testTheRoutesAreTheTwoFaces() throws {
        let app = try StyleSource.text("ios/Tortie/App/TortieApp.swift")
        for gone in ["case screen(", "case conversation(", "func openScreen", "func openConversation", "struct ScreenRoute", "struct ConversationRoute"] {
            XCTAssertFalse(app.contains(gone), "TortieApp.swift still has \(gone)")
        }
        let route = try XCTUnwrap(app.range(of: "private struct SessionRoute: View {"))
        let body = try XCTUnwrap(app.range(of: "var body: some View {", range: route.upperBound..<app.endIndex))
        let terminal = try XCTUnwrap(app.range(of: "TerminalFace(", range: body.upperBound..<app.endIndex))
        let catchUp = try XCTUnwrap(app.range(of: "CatchUpPage(", range: body.upperBound..<app.endIndex))
        let container = try XCTUnwrap(app.range(of: ".accessibilityIdentifier(ID.sessionScreen)", range: body.upperBound..<app.endIndex))
        XCTAssertLessThan(terminal.lowerBound, container.lowerBound)
        XCTAssertLessThan(catchUp.lowerBound, container.lowerBound)
        let face = try XCTUnwrap(app.range(of: "private struct TerminalFace: View {"))
        let rest = app[face.upperBound...]
        XCTAssertTrue(rest.contains(".onAppear { if let keys { registry.registerKeys(keys) } }"))
        XCTAssertTrue(rest.contains(".onDisappear { if let keys { registry.releaseKeys(keys) } }"))
    }

    // MARK: The Terminal's top bar and tray

    /// Clause (D18, Phase 337.3's D22): Catch Me Up is the first item of the
    /// Terminal's ⋯, the Mac's word beside its speech bubble (`text.bubble`),
    /// under its own identifier, and its press is the push Catch Me Up's icon
    /// made; the icon and its name are gone.
    func testCatchUpIsTheMenusSpeechBubble() throws {
        let session = try StyleSource.text("ios/Tortie/Screens/SessionScreen.swift")
        XCTAssertFalse(session.contains("CatchUpItem"), "the Catch Me Up icon is still declared")
        XCTAssertFalse(session.contains("sessionOpenCatchUp"), "SessionScreen.swift still names the icon's identifier")
        let item = try XCTUnwrap(session.range(of: "struct TerminalMenuControl: View {"))
        let end = try XCTUnwrap(session.range(of: "\n}\n", range: item.upperBound..<session.endIndex))
        let body = String(session[item.upperBound..<end.lowerBound])
        XCTAssertTrue(body.contains("Button(action: openCatchUp) {\n                    Label(Copy.catchMeUp, systemImage: \"text.bubble\")\n                }\n                .accessibilityIdentifier(ID.terminalMenuCatchUp)"))
        XCTAssertEqual(ID.terminalMenuCatchUp, "terminal-menu-catch-up")
        let menu = try XCTUnwrap(session.range(of: "struct TerminalMenu: ToolbarContent {"))
        let menuEnd = try XCTUnwrap(session.range(of: "\n}\n", range: menu.upperBound..<session.endIndex))
        XCTAssertTrue(session[menu.upperBound..<menuEnd.lowerBound].contains("openCatchUp: openCatchUp"), "the ⋯ is not handed the Terminal's push of Catch Me Up")
    }

    /// Clause (D19): the tray offers exactly the options the Mac offers to
    /// press, each under its place among the agent's options (318's `n`), and
    /// nothing for a pairing that writes nothing.
    func testTheTrayOffersWhatTheMacOffers() throws {
        let choices = [
            PocketChoiceOption(marker: "1", text: "Yes"),
            PocketChoiceOption(marker: "2", text: "Yes, and don't ask again"),
            PocketChoiceOption(marker: "3", text: "No")
        ]
        var detail = Answers.detail(Answers.row("s", title: "Needs input", dot: "attention", question: "Run this?", choices: choices))
        detail.reply = ReplyAnswers.offer(["1", "3"])
        let drawing = try SessionDrawing(detail)
        XCTAssertEqual(drawing.pressable(writes: true).map(\.n), [0, 2])
        XCTAssertEqual(drawing.pressable(writes: true).map(\.option.marker), ["1", "3"])
        XCTAssertEqual(drawing.pressable(writes: false), [], "a pairing that writes nothing was offered a press")
        let none = try SessionDrawing(Answers.detail(Answers.row("s", choices: choices)))
        XCTAssertEqual(none.pressable(writes: true), [], "options the Mac does not offer were offered")
    }

    /// Clause (D19, §Attack B6): the tray presses through 318's
    /// `ReplyModel.press` alone, draws what will run and every option whole,
    /// and carries 318's identifiers, so 318's press arms run on it.
    func testTheTrayIs318sPress() throws {
        let session = try StyleSource.text("ios/Tortie/Screens/SessionScreen.swift")
        let tray = try XCTUnwrap(session.range(of: "struct ChoiceTray: View {"))
        let end = try XCTUnwrap(session.range(of: "\n}\n", range: tray.upperBound..<session.endIndex))
        let body = String(session[tray.upperBound..<end.lowerBound])
        XCTAssertTrue(body.contains("reply.press(option.marker, offer: offer, reread: reread)"))
        XCTAssertTrue(body.contains("OptionRow(option: item.option, n: item.n"))
        XCTAssertTrue(body.contains("Words(command, .body, Tokens.textPrimary, lines: nil)"))
        XCTAssertTrue(body.contains(".accessibilityIdentifier(ID.sessionCommand)"))
        XCTAssertTrue(body.contains(".accessibilityIdentifier(ID.sessionReplyLine)"))
        XCTAssertTrue(body.contains("drawing.pressable(writes: reply != nil)"))
        for refused in ["OwnerCheck", "ownerCheck", "LAContext", "evaluatePolicy"] {
            XCTAssertFalse(body.contains(refused), "the tray names \(refused); a press asks no Face ID")
        }
        let row = try XCTUnwrap(session.range(of: "private struct OptionRow: View {"))
        let rowBody = session[row.upperBound...]
        XCTAssertTrue(rowBody.contains(".accessibilityIdentifier(ID.sessionChoicePress(n))"))
        XCTAssertTrue(rowBody.contains("Words(option.text, .body, ink, lines: nil)"))
    }

    /// Clause (§5.5.7): the names a drive finds the two faces by. The
    /// session route is `screen-session` whichever face it draws; the
    /// Terminal keeps 337's `screen-screen`; Catch Me Up is `screen-catch-up`;
    /// and the Terminal's new parts have names of their own. No name opens a
    /// conversation or a screen row any more.
    func testTheNamesOfTheFaces() throws {
        XCTAssertEqual(ID.sessionScreen, "screen-session")
        XCTAssertEqual(ID.screen, "screen-screen")
        XCTAssertEqual(ID.catchUpScreen, "screen-catch-up")
        XCTAssertEqual(ID.terminalStatus, "terminal-status")
        XCTAssertEqual(ID.screenHistoryRow(0), "screen-history-0")
        XCTAssertEqual(ID.screenHistoryRow(24_999), "screen-history-24999")
        XCTAssertEqual(ID.screenToLive, "screen-to-live")
        XCTAssertEqual(ID.screenScrollbackLine, "screen-scrollback-line")
        let identifiers = try StyleSource.text("ios/Tortie/Screens/Identifiers.swift")
        // Phase 337.3 (D28): the Catch Me Up icon's name went with the icon.
        for gone in ["sessionOpenConversation", "sessionOpenScreen", "conversationScreen", "conversationTerminalLine", "session-open-screen", "sessionOpenCatchUp", "session-open-catch-up"] {
            XCTAssertFalse(identifiers.contains(gone), "Identifiers.swift still names \(gone)")
        }
        XCTAssertEqual(ID.terminalMenu, "terminal-menu")
        XCTAssertEqual(ID.terminalMenuEnd, "terminal-menu-end")
    }

    // MARK: The side line

    /// Clause (D30, §5.5.3): the paired door keeps a THIRD line, the side
    /// line, for the pages and the status re-reads, both through its one
    /// gate, and closes all three.
    func testThePairedDoorHasASideLineBehindOneGate() throws {
        let app = try StyleSource.text("ios/Tortie/App/TortieApp.swift")
        let start = try XCTUnwrap(app.range(of: "final class PairedScreenDoor: ScreenDoor {"))
        let end = try XCTUnwrap(app.range(of: "\n}\n", range: start.upperBound..<app.endIndex))
        let door = String(app[start.upperBound..<end.lowerBound])
        XCTAssertEqual(door.components(separatedBy: "DoorLine(keeps: true)").count, 4, "the door does not keep exactly three lines")
        XCTAssertTrue(door.contains("private let side = DoorLine(keeps: true)"))
        XCTAssertEqual(door.components(separatedBy: "sideGate.run {").count, 3, "the page and the status re-read do not both go through the one gate")
        XCTAssertTrue(door.contains("line: side, door: door"))
        let close = try XCTUnwrap(door.range(of: "func close() {"))
        let closeBody = door[close.upperBound...]
        for line in ["poll.close()", "typing.close()", "side.close()"] {
            XCTAssertTrue(closeBody.contains(line), "close() does not call \(line)")
        }
    }

    /// Clause (D30): ONE exchange at a time. A second waits until the first
    /// has ended, then runs; the order is the order they came.
    func testTheGateLetsOneExchangeAtATime() async throws {
        let gate = OneExchange()
        let first = Latch()
        let log = Log()
        let a = Task {
            try await gate.run {
                await log.add("a starts")
                await first.wait()
                await log.add("a ends")
                return 1
            }
        }
        try await until { await log.all == ["a starts"] }
        let b = Task {
            try await gate.run {
                await log.add("b starts")
                return 2
            }
        }
        for _ in 0..<50 { await Task.yield() }
        let whileHeld = await log.all
        XCTAssertEqual(whileHeld, ["a starts"], "the second exchange started while the first was under way")
        await first.open()
        let results = try await (a.value, b.value)
        XCTAssertEqual(results.0, 1)
        XCTAssertEqual(results.1, 2)
        let order = await log.all
        XCTAssertEqual(order, ["a starts", "a ends", "b starts"])
    }

    /// Clause (D30): an exchange that throws lets the next one through.
    func testAFailedExchangeLetsTheNextOneThrough() async throws {
        let gate = OneExchange()
        do {
            _ = try await gate.run { () async throws -> Int in throw DoorFailure.timedOut }
            XCTFail("the failure was swallowed")
        } catch {
            XCTAssertEqual(error as? DoorFailure, .timedOut)
        }
        let next = try await gate.run { 7 }
        XCTAssertEqual(next, 7)
    }

    /// Wait, yielding, until `condition` holds; fail after many tries.
    private func until(_ condition: @escaping () async -> Bool) async throws {
        for _ in 0..<500 {
            if await condition() { return }
            await Task.yield()
        }
        XCTFail("the condition never held")
    }
}

/// A door a test holds shut until it opens it. Shared with TerminalMenuTests.
actor Latch {
    private var opened = false
    private var waiting: [CheckedContinuation<Void, Never>] = []

    func wait() async {
        guard !opened else { return }
        await withCheckedContinuation { waiting.append($0) }
    }

    func open() {
        opened = true
        let all = waiting
        waiting = []
        for one in all { one.resume() }
    }
}

/// What happened, in order.
private actor Log {
    private(set) var all: [String] = []

    func add(_ line: String) {
        all.append(line)
    }
}
