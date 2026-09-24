import XCTest
@testable import Tortie

/// What each screen does with the door's answer, and where the app goes when
/// there is none (build/p316/SPEC.md section 4 S2, builder B). The door is a
/// script (ScreensFixtures.swift); nothing here reaches a network. Each test
/// names the clause it holds, and each fails when that clause is taken out.
@MainActor
final class ScreensModelTests: XCTestCase {
    /// Records where the screens sent the app.
    @MainActor
    private final class Routes {
        var backToList = 0
        var pairAgain = 0

        var routing: ReadRouting {
            ReadRouting(
                backToList: { [unowned self] in self.backToList += 1 },
                pairAgain: { [unowned self] in self.pairAgain += 1 }
            )
        }
    }

    // MARK: - Which failure goes where

    /// Clause: a 404 on the LIST means the Mac no longer answers this iPhone,
    /// so the app goes to Pairing; a 404 about ONE session goes back to the
    /// list, which is the truth about what is still there; no pairing goes to
    /// Pairing from anywhere.
    func testWhereARefusalSendsTheApp() {
        XCTAssertEqual(DoorWords.consequence(of: DoorFailure.refused, reading: .list), .pairAgain)
        XCTAssertEqual(DoorWords.consequence(of: DoorFailure.refused, reading: .oneSession), .backToList)
        XCTAssertEqual(DoorWords.consequence(of: DoorFailure.notPaired, reading: .list), .pairAgain)
        XCTAssertEqual(DoorWords.consequence(of: DoorFailure.notPaired, reading: .oneSession), .pairAgain)
    }

    /// Clause: every other failure is ONE drawn sentence, Copy.swift's.
    func testEveryOtherFailureIsOneSentence() {
        let cases: [(DoorFailure, String)] = [
            (.unreachable(code: -1004), Copy.cannotReachMac),
            (.timedOut, Copy.macDidNotAnswer),
            (.wrongKey, Copy.keyMismatch),
            (.tooLarge, Copy.answerTooLarge),
            (.malformed, Copy.answerUnreadable),
            (.unexpectedStatus(500), Copy.answerUnreadable),
            (.badPage, Copy.answerUnreadable)
        ]
        for (failure, sentence) in cases {
            XCTAssertEqual(DoorWords.consequence(of: failure, reading: .list), .draw(sentence), "\(failure)")
            XCTAssertEqual(DoorWords.consequence(of: failure, reading: .oneSession), .draw(sentence), "\(failure)")
        }
        XCTAssertEqual(DoorWords.olderPageSentence(for: DoorFailure.badPage), Copy.earlierTurnsUnreadable)
        XCTAssertEqual(DoorWords.olderPageSentence(for: DoorFailure.timedOut), Copy.macDidNotAnswer)
        XCTAssertEqual(DoorWords.sentence(for: CocoaError(.fileReadUnknown)), Copy.answerUnreadable)
    }

    /// Clause: a read the person walked away from says nothing.
    func testACancelledReadSaysNothing() {
        XCTAssertTrue(DoorWords.isCancellation(DoorFailure.cancelled))
        XCTAssertTrue(DoorWords.isCancellation(CancellationError()))
        XCTAssertTrue(DoorWords.isCancellation(PairingFailure.cancelled))
        XCTAssertFalse(DoorWords.isCancellation(DoorFailure.timedOut))
    }

    /// Clause: every way pairing stops has its line, and leaving says nothing.
    func testEveryPairingFailureHasItsLine() {
        let lines: [(PairingFailure, String?)] = [
            (.badCode, Copy.pairNotACode),
            (.unsupportedCode, Copy.pairNotACode),
            (.codeExpired, Copy.codeExpired),
            (.windowClosed, Copy.codeExpired),
            (.macRefused, Copy.pairRefused),
            (.strangeAnswer, Copy.pairAnswerUnknown),
            (.wrongKey, Copy.keyMismatch),
            (.notAccepted, Copy.pairFirstReadRefused),
            (.unreachable, Copy.cannotReachMac),
            (.couldNotSave, Copy.notPaired),
            (.notAvailable, Copy.notPaired),
            (.cancelled, nil)
        ]
        for (failure, line) in lines {
            XCTAssertEqual(DoorWords.pairingSentence(for: failure), line, "\(failure)")
        }
    }

    // MARK: - The list

    func testTheListDrawsTheAnswer() async {
        let reader = ScriptedReader(blocked: [.success(Answers.blocked(rows: [Answers.row("w", dot: "attention")]))])
        let routes = Routes()
        let model = ListModel(door: reader, routing: routes.routing)
        await model.load()
        guard case .loaded(let drawing) = model.state else { return XCTFail("\(model.state)") }
        XCTAssertEqual(drawing.waiting.map(\.id), ["w"])
        XCTAssertEqual(routes.pairAgain, 0)
    }

    /// Clause: a refused list goes to Pairing and draws nothing half.
    func testARefusedListGoesToPairing() async {
        let reader = ScriptedReader(blocked: [.failure(.refused)])
        let routes = Routes()
        let model = ListModel(door: reader, routing: routes.routing)
        await model.load()
        XCTAssertEqual(routes.pairAgain, 1)
        XCTAssertEqual(model.state, .loading)
    }

    /// Clause: a list that does not come back is one sentence in place of the
    /// list, never the old list with a line under it.
    func testAFailedReadReplacesTheList() async {
        let reader = ScriptedReader(blocked: [
            .success(Answers.blocked(rows: [Answers.row("w", dot: "attention")])),
            .failure(.timedOut)
        ])
        let model = ListModel(door: reader, routing: Routes().routing)
        await model.load()
        await model.load()
        XCTAssertEqual(model.state, .failed(Copy.macDidNotAnswer))
    }

    /// Clause: the pairing's first signed read is drawn at once; the list is
    /// not read a second time for it.
    func testTheFirstReadIsAdoptedNotReadAgain() async {
        let reader = ScriptedReader()
        let model = ListModel(door: reader, routing: Routes().routing)
        model.adopt(Answers.blocked(others: [Answers.row("o")]))
        guard case .loaded(let drawing) = model.state else { return XCTFail("\(model.state)") }
        XCTAssertEqual(drawing.others.map(\.id), ["o"])
        await model.appeared()
        let first = await reader.blockedCalls
        XCTAssertEqual(first, 0, "the list read again on the appearance that showed the first read")
        await model.appeared()
        let second = await reader.blockedCalls
        XCTAssertEqual(second, 1, "a later appearance reads")
    }

    /// Clause (his ruling of 2026-09-23): a list whose omitted count no door
    /// could send is ONE sentence in place of the list, the malformed answer's,
    /// and the app goes nowhere. Before the fix `Int.max` trapped here.
    func testAnOmittedCountNoDoorCouldSendIsOneSentence() async {
        for omitted in [Int.max, Int.min, -1] {
            let reader = ScriptedReader(blocked: [.success(Answers.blocked(others: [Answers.row("o")], omitted: omitted))])
            let routes = Routes()
            let model = ListModel(door: reader, routing: routes.routing)
            await model.load()
            XCTAssertEqual(model.state, .failed(Copy.answerUnreadable), "\(omitted)")
            XCTAssertEqual(routes.pairAgain, 0)
        }
        // The pairing's first read, adopted with one: the same sentence.
        let adopted = ListModel(door: ScriptedReader(), routing: Routes().routing)
        adopted.adopt(Answers.blocked(others: [Answers.row("o")], omitted: Int.max))
        XCTAssertEqual(adopted.state, .failed(Copy.answerUnreadable))
    }

    // MARK: - One session

    /// Clause (his ruling of 2026-09-23): a session whose counts no door could
    /// send, or whose sum would overflow, is ONE sentence in place of the
    /// session. Before the fix `Int.max` trapped on opening it.
    func testCountsNoDoorCouldSendAreOneSentence() async {
        let pairs: [(Int, Int)] = [(Int.max, 1), (1, Int.max), (Int.min, -1), (-1, 1), (1, -1)]
        for (user, agent) in pairs {
            let detail = Answers.detail(Answers.row("s"), activity: Answers.activity(user: user, agent: agent))
            let answer = PocketSessionAnswer(session: detail, at: 1)
            let routes = Routes()
            let model = SessionModel(sessionId: "s", door: ScriptedReader(session: [.success(answer)]), routing: routes.routing)
            await model.load()
            XCTAssertEqual(model.phase, .failed(Copy.answerUnreadable), "\(user) + \(agent)")
            XCTAssertEqual(routes.backToList, 0)
            XCTAssertEqual(routes.pairAgain, 0)
        }
    }

    /// Clause: a 404 about one session goes back to the list.
    func testARefusedSessionGoesBackToTheList() async {
        let reader = ScriptedReader(session: [.failure(.refused)])
        let routes = Routes()
        let model = SessionModel(sessionId: "s", door: reader, routing: routes.routing)
        await model.load()
        XCTAssertEqual(routes.backToList, 1)
        XCTAssertEqual(routes.pairAgain, 0)
        XCTAssertEqual(model.phase, .loading)
    }

    /// Clause: an answer about another session is not this session's.
    func testAnAnswerAboutAnotherSessionIsRefused() async {
        let other = PocketSessionAnswer(session: Answers.detail(Answers.row("other")), at: 1)
        let model = SessionModel(sessionId: "s", door: ScriptedReader(session: [.success(other)]), routing: Routes().routing)
        await model.load()
        XCTAssertEqual(model.phase, .failed(Copy.answerUnreadable))
    }

    func testTheSessionDrawsItsAnswer() async {
        let answer = PocketSessionAnswer(session: Answers.detail(Answers.row("s"), lastAnswer: "done"), at: 1)
        let model = SessionModel(sessionId: "s", door: ScriptedReader(session: [.success(answer)]), routing: Routes().routing)
        await model.load()
        guard case .loaded(let drawing) = model.phase else { return XCTFail("\(model.phase)") }
        XCTAssertEqual(drawing.lastAnswer, "done")
    }

    // MARK: - The conversation

    /// Clause: the newest page first, then older pages while the top is in
    /// view, each asked with `to` one below the oldest held, until the first.
    func testItPagesBackToTheFirstTurn() async {
        let reader = ScriptedReader(turns: [
            .success(Answers.page([4, 5], more: true)),
            .success(Answers.page([2, 3], more: true)),
            .success(Answers.page([0, 1], more: false))
        ])
        let model = ConversationModel(sessionId: "s", door: reader, routing: Routes().routing)
        await model.loadNewest()
        XCTAssertEqual(model.pages.turns.map(\.index), [4, 5])
        XCTAssertTrue(model.pagingBack)
        await model.top(visible: true)?.value
        XCTAssertEqual(model.pages.turns.map(\.index), [0, 1, 2, 3, 4, 5])
        XCTAssertFalse(model.pagingBack, "nothing is older than the first turn")
        let asked = await reader.turnsAsked
        XCTAssertEqual(asked, [nil, 3, 1])
    }

    /// Clause: with the top out of view, no older page is asked for.
    func testNoOlderPageWhileTheTopIsOutOfView() async {
        let reader = ScriptedReader(turns: [.success(Answers.page([4, 5], more: true))])
        let model = ConversationModel(sessionId: "s", door: reader, routing: Routes().routing)
        await model.loadNewest()
        XCTAssertNil(model.top(visible: false))
        let asked = await reader.turnsAsked
        XCTAssertEqual(asked, [nil])
    }

    /// Clause: an older page that overlaps is refused, paging stops, the turns
    /// already read stay, and one line says the earlier turns could not be read.
    func testAnOverlappingPageStopsWithOneLine() async {
        let reader = ScriptedReader(turns: [
            .success(Answers.page([4, 5], more: true)),
            .success(Answers.page([3, 4], more: true))
        ])
        let model = ConversationModel(sessionId: "s", door: reader, routing: Routes().routing)
        await model.loadNewest()
        await model.top(visible: true)?.value
        XCTAssertEqual(model.pages.turns.map(\.index), [4, 5])
        XCTAssertEqual(model.olderLine, Copy.earlierTurnsUnreadable)
        XCTAssertFalse(model.pagingBack)
        XCTAssertEqual(model.phase, .loaded)
    }

    /// Clause: `more` on a page that added nothing stops the paging WITH a
    /// line, so `more: true` forever ends in a drawn sentence.
    func testMoreOnAnEmptyPageEndsInALine() async {
        let reader = ScriptedReader(turns: [
            .success(Answers.page([4, 5], more: true)),
            .success(Answers.page([], more: true))
        ])
        let model = ConversationModel(sessionId: "s", door: reader, routing: Routes().routing)
        await model.loadNewest()
        await model.top(visible: true)?.value
        XCTAssertEqual(model.olderLine, Copy.earlierTurnsUnreadable)
        XCTAssertFalse(model.pagingBack)
        let asked = await reader.turnsAsked
        XCTAssertEqual(asked, [nil, 3], "it did not ask again")
    }

    /// Clause: an older page that does not come back is its sentence where the
    /// older turns would be; the turns read stay drawn.
    func testAnOlderPageThatTimesOutKeepsWhatWasRead() async {
        let reader = ScriptedReader(turns: [.success(Answers.page([4, 5], more: true)), .failure(.timedOut)])
        let model = ConversationModel(sessionId: "s", door: reader, routing: Routes().routing)
        await model.loadNewest()
        await model.top(visible: true)?.value
        XCTAssertEqual(model.olderLine, Copy.macDidNotAnswer)
        XCTAssertEqual(model.pages.turns.map(\.index), [4, 5])
    }

    /// Clause: a newest page that breaks the door's promise is one sentence in
    /// place of the conversation.
    func testABadNewestPageIsOneSentence() async {
        let reader = ScriptedReader(turns: [.success(Answers.page([5, 4], more: false))])
        let model = ConversationModel(sessionId: "s", door: reader, routing: Routes().routing)
        await model.loadNewest()
        XCTAssertEqual(model.phase, .failed(Copy.answerUnreadable))
    }

    /// Clause (his ruling of 2026-09-23): a page holding an index no door could
    /// send is one sentence: in place of the conversation when it is the
    /// newest page, and where the older turns would be when it is an older
    /// one, the turns already read kept.
    func testAnIndexNoDoorCouldSendIsOneSentence() async {
        for index in [Int.max, Int.min, -1] {
            let newest = ConversationModel(
                sessionId: "s", door: ScriptedReader(turns: [.success(Answers.page([index], more: false))]), routing: Routes().routing
            )
            await newest.loadNewest()
            XCTAssertEqual(newest.phase, .failed(Copy.answerUnreadable), "\(index)")

            let reader = ScriptedReader(turns: [.success(Answers.page([4, 5], more: true)), .success(Answers.page([index], more: true))])
            let older = ConversationModel(sessionId: "s", door: reader, routing: Routes().routing)
            await older.loadNewest()
            await older.top(visible: true)?.value
            XCTAssertEqual(older.olderLine, Copy.earlierTurnsUnreadable, "\(index)")
            XCTAssertEqual(older.pages.turns.map(\.index), [4, 5])
            XCTAssertFalse(older.pagingBack)
        }
    }

    /// Clause: a session elsewhere has no turns here, and main's note says so;
    /// that is an answer, not a failure.
    func testTheRemoteNoteIsAnAnswer() async {
        let note = "This session runs on another machine. Its record is there"
        let reader = ScriptedReader(turns: [.success(Answers.page([], more: false, note: note))])
        let model = ConversationModel(sessionId: "s", door: reader, routing: Routes().routing)
        await model.loadNewest()
        XCTAssertEqual(model.phase, .loaded)
        XCTAssertEqual(model.pages.note, note)
        XCTAssertTrue(model.pages.turns.isEmpty)
    }

    /// Clause: a 404 on the conversation goes back to the list.
    func testARefusedConversationGoesBackToTheList() async {
        let routes = Routes()
        let model = ConversationModel(sessionId: "s", door: ScriptedReader(turns: [.failure(.refused)]), routing: routes.routing)
        await model.loadNewest()
        XCTAssertEqual(routes.backToList, 1)
    }

    /// Clause: the desktop's header note when no turn carries a clock.
    func testNoClocksIsSaid() async {
        let model = ConversationModel(
            sessionId: "s", door: ScriptedReader(turns: [.success(Answers.page([0], more: false))]), routing: Routes().routing
        )
        await model.loadNewest()
        XCTAssertTrue(model.noClocks)
    }

    // MARK: - Pairing

    private func pairing(_ phone: StandInPhone) -> (PairingModel, () -> [PocketBlockedAnswer]) {
        var seen: [PocketBlockedAnswer] = []
        let model = PairingModel(door: phone, label: "iPhone") { _, first in seen.append(first) }
        return (model, { seen })
    }

    /// Clause: the app is handed a reader ONLY when the pairing ends paired,
    /// which Door/Pairing.swift allows only after the first signed read.
    func testPairedOnlyOnThePairedOutcome() async {
        let first = Answers.blocked(others: [Answers.row("o")])
        let phone = StandInPhone(outcomes: [.failed(.notAccepted), .paired(ScriptedReader(), first)])
        let (model, seen) = pairing(phone)
        await model.read("code-1")
        XCTAssertTrue(seen().isEmpty, "a pairing the first read refused was treated as paired")
        XCTAssertEqual(model.line, Copy.pairFirstReadRefused)
        XCTAssertTrue(model.stopped)
        XCTAssertNil(model.fingerprint, "a fingerprint from a stopped pairing stays drawn")
        await model.read("code-2")
        XCTAssertEqual(seen(), [first])
    }

    /// Clause: the fingerprint both screens show is drawn while the Mac is
    /// being asked, and gone once the pairing stopped.
    func testTheFingerprintIsDrawnWhilePresenting() async {
        let phone = StandInPhone(outcomes: [.failed(.codeExpired)])
        let (model, _) = pairing(phone)
        let seen = Seen<String>()
        phone.duringPair = {
            let drawn = await MainActor.run { model.fingerprint }
            await seen.set(drawn)
        }
        await model.read("code")
        let whilePresenting = await seen.value
        XCTAssertEqual(whilePresenting, "aaaa bbbb cccc dddd eeee ffff")
        XCTAssertNil(model.fingerprint)
        XCTAssertEqual(model.line, Copy.codeExpired)
    }

    /// Clause: a code that stopped is not presented again until he asks, and a
    /// different code is tried at once.
    func testASpentCodeWaitsForPairAgain() async {
        let phone = StandInPhone(outcomes: [.failed(.codeExpired), .failed(.codeExpired), .failed(.codeExpired)])
        let (model, _) = pairing(phone)
        await model.read("same")
        await model.read("same")
        XCTAssertEqual(phone.begun, ["same"], "the camera's second sight of a spent code was presented again")
        await model.read("other")
        XCTAssertEqual(phone.begun, ["same", "other"])
        model.pairAgain()
        XCTAssertEqual(model.line, Copy.notPaired)
        XCTAssertFalse(model.stopped)
        await model.read("other")
        XCTAssertEqual(phone.begun, ["same", "other", "other"])
    }

    /// Clause (conformance:ios rule p): the code last read, which carries
    /// the tailnet key, is kept as `spent` and as the launch code, and
    /// neither model repeats it to `dump` or `Mirror`. Fails when either
    /// model's `customMirror` is taken out (measured on iOS in 316.3's
    /// hardening round). The needle is the code's own text: the fix round
    /// looked for "p316mirror" in a code that held "kP316mirror", so the test
    /// could not fail, and the reverify took each mirror out with it green.
    func testTheModelsNeverMirrorTheCode() async {
        let needle = "P316mirrorMadeUpNotAKey"
        let code = "{\"tk\":\"tskey-auth-k\(needle)\"}"
        // The positive control: a holder of the models' own shape with no
        // customMirror IS repeated, so the search finds the code where it is.
        final class Unredacted {
            private var spent: String?
            init(_ code: String) { spent = code }
        }
        XCTAssertTrue(everythingSaid(about: Unredacted(code)).contains(needle), "the search cannot find the code even where it is kept, so it proves nothing")
        let phone = StandInPhone(beginFailure: .badCode)
        let (model, _) = pairing(phone)
        await model.read(code)
        XCTAssertEqual(phone.begun, [code])
        XCTAssertFalse(everythingSaid(about: model).contains(needle), everythingSaid(about: model))
        let app = AppModel(door: StandInPhone(), label: "iPhone", launchCode: code)
        XCTAssertFalse(everythingSaid(about: app).contains(needle), everythingSaid(about: app))
        XCTAssertEqual(app.takeLaunchCode(), code)
    }

    /// Clause: text that is not a code says so and presents nothing.
    func testNotACodePresentsNothing() async {
        let phone = StandInPhone(beginFailure: .badCode)
        let (model, _) = pairing(phone)
        await model.read("hello")
        XCTAssertEqual(model.line, Copy.pairNotACode)
        XCTAssertEqual(phone.pairs, 0)
    }

    /// Clause: leaving the screen spends nothing and says nothing.
    func testLeavingSpendsNothing() async {
        let phone = StandInPhone(outcomes: [.failed(.cancelled), .failed(.cancelled)])
        let (model, _) = pairing(phone)
        await model.read("code")
        XCTAssertFalse(model.stopped)
        await model.read("code")
        XCTAssertEqual(phone.begun, ["code", "code"])
    }

    /// Clause: a camera he turned off says where to turn it on; no camera at
    /// all (the Simulator) says nothing.
    func testTheCameraLine() {
        let (model, _) = pairing(StandInPhone())
        model.camera(.denied)
        XCTAssertEqual(model.cameraLine, Copy.cameraOff)
        model.camera(.none)
        XCTAssertNil(model.cameraLine)
    }

    /// Clause: at rest the pairing screen says the phone is not paired, which
    /// is all a Release build of 316.2 says.
    func testAtRestItSaysNotPaired() {
        let (model, _) = pairing(StandInPhone())
        XCTAssertEqual(model.line, Copy.notPaired)
    }

    // MARK: - The app

    /// Clause: with no pairing kept the app opens on Pairing; with one, on the
    /// list.
    func testWhereTheAppOpens() {
        XCTAssertEqual(AppModel(door: StandInPhone(), label: "iPhone").root, .pairing)
        let paired = AppModel(door: StandInPhone(kept: ScriptedReader()), label: "iPhone")
        XCTAssertEqual(paired.root, .reading)
        XCTAssertNotNil(paired.list)
    }

    /// Clause: pairing done means the list, drawn from the first read.
    func testPairingDoneOpensTheListOnTheFirstRead() async {
        let first = Answers.blocked(rows: [Answers.row("w", dot: "attention")])
        let app = AppModel(door: StandInPhone(outcomes: [.paired(ScriptedReader(), first)]), label: "iPhone")
        await app.pairing.read("code")
        XCTAssertEqual(app.root, .reading)
        guard case .loaded(let drawing)? = app.list?.state else { return XCTFail("the list did not draw") }
        XCTAssertEqual(drawing.waiting.map(\.id), ["w"])
    }

    /// Clause: a refused list takes the app back to Pairing with one line and
    /// nothing pushed over it.
    func testALostPairingGoesBackToPairing() async throws {
        let reader = ScriptedReader(blocked: [.failure(.refused)])
        let app = AppModel(door: StandInPhone(kept: reader), label: "iPhone")
        app.path = [.session(id: "s", name: "s")]
        let list = try XCTUnwrap(app.list)
        await list.load()
        XCTAssertEqual(app.root, .pairing)
        XCTAssertTrue(app.path.isEmpty)
        XCTAssertNil(app.list)
        XCTAssertEqual(app.pairing.line, Copy.notPaired)
    }

    /// Clause: a refusal about one session pops to the list.
    func testBackToListPops() {
        let app = AppModel(door: StandInPhone(kept: ScriptedReader()), label: "iPhone")
        app.path = [.session(id: "s", name: "s"), .conversation(id: "s", honestLine: nil)]
        app.routing.backToList()
        XCTAssertTrue(app.path.isEmpty)
        XCTAssertEqual(app.root, .reading)
    }

    /// Clause: the code handed in at launch is read once, and only when the
    /// app opens unpaired, so a pairing removed later draws the not-paired line
    /// rather than presenting a spent code again.
    func testTheLaunchCodeIsReadOnce() {
        let unpaired = AppModel(door: StandInPhone(), label: "iPhone", launchCode: "code")
        XCTAssertEqual(unpaired.takeLaunchCode(), "code")
        XCTAssertNil(unpaired.takeLaunchCode())
        let paired = AppModel(door: StandInPhone(kept: ScriptedReader()), label: "iPhone", launchCode: "code")
        XCTAssertNil(paired.takeLaunchCode())
    }

    /// Clause: only the screen on top reads again on return to the foreground.
    func testOnlyTheTopScreenIsTop() {
        let app = AppModel(door: StandInPhone(kept: ScriptedReader()), label: "iPhone")
        XCTAssertTrue(app.isTop(nil))
        app.path = [.session(id: "s", name: "s")]
        XCTAssertTrue(app.isTop(.session(id: "s", name: "s")))
        XCTAssertFalse(app.isTop(nil))
        app.cameToForeground()
        XCTAssertEqual(app.foregroundTick, 1)
    }
}
