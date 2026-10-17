import Foundation
import XCTest
@testable import Tortie

/// NEW SESSION ON THE PHONE (Phase 346, build/p346/SPEC.md section 8.2, D11,
/// D17, D20 to D25, D27, D28): the model over a scripted starter, the drawing
/// over offers, the runner, and the app's half (its registry, `wentAway`,
/// `openStarted`, `startSetup`). Every test names the clause it holds and
/// fails when that clause is taken out.
@MainActor
final class StartTests: XCTestCase {
    // MARK: The pieces the tests hand in

    private let mac = "studio.tail0000.ts.net"
    private let wrote = String(repeating: "a", count: 32)
    private let again = String(repeating: "b", count: 32)

    private func setup(
        _ starter: any DoorStarting,
        keeper: MemoryKeeper = MemoryKeeper(),
        registry: RecordingStarts = RecordingStarts(),
        sample: Bool = false,
        opened: @escaping @MainActor (String, String) -> Void = { _, _ in }
    ) -> StartSetup {
        StartSetup(mac: mac, starter: starter, registry: registry, keeper: keeper, sample: sample, opened: opened)
    }

    private func done(_ write: String, id: String = "made-1", name: String = "claude-3") -> StartResult {
        .answered(PocketStartAnswer(
            verb: "start", write: write, outcome: .done, reason: nil, sentence: nil,
            session: PocketStartSession(id: id, name: name)
        ))
    }

    private func refused(_ write: String, _ reason: String, _ sentence: String) -> StartResult {
        .answered(PocketStartAnswer(verb: "start", write: write, outcome: .refused, reason: reason, sentence: sentence, session: nil))
    }

    private func busy(_ write: String, _ sentence: String) -> StartResult {
        .answered(PocketStartAnswer(verb: "start", write: write, outcome: .busy, reason: nil, sentence: sentence, session: nil))
    }

    private func finish(_ model: StartModel) async {
        await model.running?.value
    }

    // MARK: Done (D24)

    /// Clause (D24, bb9): done opens the session the Mac made, with the id and
    /// name it answered, through the setup's `opened`, then reads Sessions;
    /// the runner is registered at the press and released at its end.
    func testDoneOpensTheSessionAndReadsSessionsAgain() async {
        let starter = ScriptedStarter(results: [done(wrote)], minted: [wrote])
        let registry = RecordingStarts()
        let model = StartModel(offer: StartOffers.two(), setup: setup(starter, registry: registry))
        var opened: [String] = []
        var reads = 0
        model.create(reread: { reads += 1 }, opened: { id, name in opened.append(id + "|" + name) })
        XCTAssertEqual(model.phase, .starting)
        XCTAssertEqual(model.createWord, Copy.creating)
        XCTAssertEqual(registry.registered.count, 1, "the runner is registered before its task runs")
        await finish(model)
        XCTAssertEqual(opened, ["made-1|claude-3"])
        XCTAssertEqual(reads, 1)
        XCTAssertNil(model.line)
        XCTAssertEqual(model.phase, .done, "a done start keeps Create off while the sheet closes")
        XCTAssertEqual(registry.released.count, 1)
        let asked = await starter.asked
        XCTAssertEqual(asked, [ScriptedStarter.Ask(project: "p-local", agent: "claude", write: nil)])
    }

    /// Clause (the ruled round): from a done answer until the sheet is gone,
    /// the phase never returns to idle, so Create cannot be pressed inside the
    /// dismissal and send a FRESH write id, which would start a second
    /// session. `opened` is where the sheet starts to close; the model is
    /// read there, during the read of Sessions that follows, and after the
    /// start's task has ended, and a press at each moment sends nothing.
    func testDoneKeepsCreateOffUntilTheSheetIsGone() async {
        let starter = ScriptedStarter(results: [done(wrote), done(again, id: "made-2", name: "claude-4")], minted: [wrote, again])
        let registry = RecordingStarts()
        let model = StartModel(offer: StartOffers.two(), setup: setup(starter, registry: registry))
        var phases: [StartModel.Phase] = []
        var pressable: [Bool] = []
        let look = {
            phases.append(model.phase)
            pressable.append(model.canCreate)
            // A press while the sheet is still up, as UIKit could take one.
            model.create(reread: {}, opened: { _, _ in })
        }
        model.create(reread: { look() }, opened: { _, _ in look() })
        await finish(model)
        look()
        XCTAssertEqual(phases, [.done, .done, .done], "the phase returned to idle while the sheet was still up")
        XCTAssertEqual(pressable, [false, false, false])
        XCTAssertEqual(model.createWord, Copy.creating)
        XCTAssertEqual(registry.registered.count, 1, "a press inside the dismissal made a second runner")
        let asked = await starter.asked
        XCTAssertEqual(asked.count, 1, "a press inside the dismissal sent a second start")
        model.choose(agent: "codex")
        XCTAssertEqual(model.agent, "claude", "nothing moves while the sheet closes")
    }

    /// Clause (the ruled round): an answer that is not done goes back to idle,
    /// so the sheet it keeps can be pressed again.
    func testARefusalGoesBackToIdle() async {
        let starter = ScriptedStarter(results: [refused(wrote, "agent", "That agent is no longer installed there.")], minted: [wrote])
        let model = StartModel(offer: StartOffers.two(), setup: setup(starter))
        model.create(reread: {}, opened: { _, _ in XCTFail("a refusal opens nothing") })
        await finish(model)
        XCTAssertEqual(model.phase, .idle)
        XCTAssertTrue(model.canCreate)
    }

    /// Clause (D15): what leaves the phone is the two ids the offer carried
    /// and a write id, and nothing else: the runner holds exactly those.
    func testOnlyTheTwoIdsAndAWriteIdLeaveThePhone() async {
        let starter = ScriptedStarter(results: [done(wrote)], minted: [wrote])
        let registry = RecordingStarts()
        let model = StartModel(offer: StartOffers.two(), setup: setup(starter, registry: registry))
        model.choose(agent: "codex")
        model.create(reread: {}, opened: { _, _ in })
        let runner = try? XCTUnwrap(registry.registered.first)
        XCTAssertEqual(runner?.project, "p-local")
        XCTAssertEqual(runner?.agent, "codex")
        XCTAssertNil(runner?.write)
        await finish(model)
    }

    // MARK: Not done (D25)

    /// Clause (D25): a refusal keeps the sheet with the Mac's own sentence,
    /// opens nothing, and reads Sessions so the offer refreshes.
    func testARefusalKeepsTheSheetWithTheMacsSentence() async {
        let sentence = "That project is not open on your Mac any more. Nothing was started."
        let starter = ScriptedStarter(results: [refused(wrote, "project", sentence)], minted: [wrote])
        let model = StartModel(offer: StartOffers.two(), setup: setup(starter))
        var opened = 0
        var reads = 0
        model.create(reread: { reads += 1 }, opened: { _, _ in opened += 1 })
        await finish(model)
        XCTAssertEqual(model.line, sentence)
        XCTAssertEqual(opened, 0)
        XCTAssertEqual(reads, 1)
        XCTAssertEqual(model.createWord, Copy.create, "a refusal keeps no id: the next press is a new start")
    }

    /// Clause (D5): a reason this build has never seen is drawn by its
    /// sentence, as any refusal is.
    func testAnUnknownReasonIsDrawnByItsSentence() async {
        let starter = ScriptedStarter(results: [refused(wrote, "a-later-word", "A later Mac's sentence.")], minted: [wrote])
        let model = StartModel(offer: StartOffers.two(), setup: setup(starter))
        model.create(reread: {}, opened: { _, _ in })
        await finish(model)
        XCTAssertEqual(model.line, "A later Mac's sentence.")
    }

    /// Clause (D17): no answer keeps the id the start went with, reads
    /// Sessions FIRST and only then says so and offers Try again; the next
    /// press of the same project and agent sends THAT id.
    func testNoAnswerKeepsTheIdAndTryAgainSendsIt() async {
        let starter = ScriptedStarter(results: [.noAnswer, done(wrote)], minted: [wrote])
        let keeper = MemoryKeeper()
        let model = StartModel(offer: StartOffers.two(), setup: setup(starter, keeper: keeper))
        var lineAtRead: [String?] = []
        model.create(reread: { lineAtRead.append(model.line) }, opened: { _, _ in })
        await finish(model)
        XCTAssertEqual(lineAtRead, [nil], "Sessions is read before the line offers Try again")
        XCTAssertEqual(model.line, Copy.startNoAnswer)
        XCTAssertEqual(keeper.keptStart?.write, wrote)
        XCTAssertEqual(keeper.keptStart?.mac, mac)
        XCTAssertEqual(keeper.keptStart?.project, "p-local")
        XCTAssertEqual(keeper.keptStart?.agent, "claude")
        XCTAssertEqual(model.createWord, Copy.tryAgain)
        model.create(reread: {}, opened: { _, _ in })
        await finish(model)
        let asked = await starter.asked
        XCTAssertEqual(asked.map(\.write), [nil, wrote], "Try again is the same id, once per press")
        XCTAssertNil(keeper.keptStart, "done forgets the kept start")
    }

    /// Clause (D17): 60 seconds, or another project or agent, and the next
    /// press is a new start with a fresh id.
    func testTheKeptIdIsForgottenAfterTheWindowAndOnAnotherChoice() async {
        let clock = StartClock(Date(timeIntervalSince1970: 1_000))
        let keeper = MemoryKeeper()
        let starter = ScriptedStarter(results: [.noAnswer, .noAnswer, .noAnswer], minted: [wrote, again, wrote])
        let model = StartModel(offer: StartOffers.two(), setup: setup(starter, keeper: keeper), clock: clock.now)
        model.create(reread: {}, opened: { _, _ in })
        await finish(model)
        XCTAssertEqual(model.createWord, Copy.tryAgain)
        clock.advance(by: KeptStart.window)
        XCTAssertEqual(model.createWord, Copy.create, "at 60 s the kept id is not sent again")
        model.create(reread: {}, opened: { _, _ in })
        await finish(model)
        var asked = await starter.asked
        XCTAssertEqual(asked.map(\.write), [nil, nil])
        XCTAssertEqual(keeper.keptStart?.write, again)
        model.choose(agent: "codex")
        XCTAssertNil(keeper.keptStart, "another choice forgets it")
        model.choose(agent: "claude")
        model.create(reread: {}, opened: { _, _ in })
        await finish(model)
        asked = await starter.asked
        XCTAssertEqual(asked.map(\.write), [nil, nil, nil])
    }

    /// Clause (D27): a kept start is the Mac's that sent it: another Mac's
    /// sheet over the same keeper never sends it.
    func testAKeptStartIsNeverSentToAnotherMac() async {
        let keeper = MemoryKeeper()
        keeper.keptStart = KeptStart(mac: "other.tail0000.ts.net", project: "p-local", agent: "claude", write: wrote, at: Date())
        let starter = ScriptedStarter(results: [done(again)], minted: [again])
        let model = StartModel(offer: StartOffers.two(), setup: setup(starter, keeper: keeper))
        XCTAssertEqual(model.createWord, Copy.create)
        model.create(reread: {}, opened: { _, _ in })
        await finish(model)
        let asked = await starter.asked
        XCTAssertEqual(asked.map(\.write), [nil])
    }

    /// Clause (D17, D18): busy on a kept id keeps it (the first may still be
    /// starting); busy on a fresh id forgets nothing that was not kept.
    func testBusyOnAKeptIdKeepsIt() async {
        let keeper = MemoryKeeper()
        let starter = ScriptedStarter(
            results: [.noAnswer, busy(wrote, "Your Mac is still starting this session.")], minted: [wrote]
        )
        let model = StartModel(offer: StartOffers.two(), setup: setup(starter, keeper: keeper))
        model.create(reread: {}, opened: { _, _ in })
        await finish(model)
        model.create(reread: {}, opened: { _, _ in })
        await finish(model)
        XCTAssertEqual(keeper.keptStart?.write, wrote)
        XCTAssertEqual(model.line, "Your Mac is still starting this session.")
        XCTAssertEqual(model.createWord, Copy.tryAgain)

        let fresh = MemoryKeeper()
        let busyStarter = ScriptedStarter(results: [busy(again, "Your Mac is starting another session. Nothing was started.")], minted: [again])
        let other = StartModel(offer: StartOffers.two(), setup: setup(busyStarter, keeper: fresh))
        other.create(reread: {}, opened: { _, _ in })
        await finish(other)
        XCTAssertNil(fresh.keptStart)
        XCTAssertEqual(other.createWord, Copy.create)
    }

    /// Clause (D25, rule v): a start withheld because the app left says
    /// nothing was started, and a kept id stays kept (nothing reached the Mac).
    func testAWithheldStartSaysNothingWasStartedAndKeepsTheKeptId() async {
        let keeper = MemoryKeeper()
        let at = Date()
        keeper.keptStart = KeptStart(mac: mac, project: "p-local", agent: "claude", write: wrote, at: at)
        let starter = ScriptedStarter(results: [.notSent(.cancelled)], minted: [])
        let model = StartModel(offer: StartOffers.two(), setup: setup(starter, keeper: keeper), clock: { at })
        model.create(reread: {}, opened: { _, _ in })
        await finish(model)
        XCTAssertEqual(model.line, Copy.startNotTaken)
        XCTAssertEqual(keeper.keptStart?.write, wrote)
    }

    /// Clause (D25): a 404 says the Mac did not take it, and forgets the kept id.
    func testNotTakenSaysSo() async {
        let keeper = MemoryKeeper()
        keeper.keptStart = KeptStart(mac: mac, project: "p-local", agent: "claude", write: wrote, at: Date())
        let starter = ScriptedStarter(results: [.notTaken], minted: [])
        let model = StartModel(offer: StartOffers.two(), setup: setup(starter, keeper: keeper))
        model.create(reread: {}, opened: { _, _ in })
        await finish(model)
        XCTAssertEqual(model.line, Copy.startNotTaken)
        XCTAssertNil(keeper.keptStart)
    }

    /// Clause (D28, his answer 11): See a sample's Create says nothing ran,
    /// through the sample's own reader, and nothing is kept.
    func testTheSampleSaysNothingRan() async throws {
        let sample = SampleReader(book: SampleBookFixture.book())
        let starter = try XCTUnwrap(sample.starter)
        let keeper = MemoryKeeper()
        let model = StartModel(offer: StartOffers.two(), setup: setup(starter, keeper: keeper, sample: true))
        model.create(reread: {}, opened: { _, _ in XCTFail("the sample opens nothing") })
        await finish(model)
        XCTAssertEqual(model.line, Copy.startSample)
        XCTAssertNil(keeper.keptStart)
    }

    /// Clause: a press while a start runs does nothing; one start, one runner.
    func testAPressWhileOneRunsDoesNothing() async {
        let gate = StartGate()
        let starter = ScriptedStarter(results: [done(wrote)], minted: [wrote], during: { await gate.wait() })
        let registry = RecordingStarts()
        let model = StartModel(offer: StartOffers.two(), setup: setup(starter, registry: registry))
        model.create(reread: {}, opened: { _, _ in })
        model.create(reread: {}, opened: { _, _ in })
        model.choose(agent: "codex")
        XCTAssertEqual(model.agent, "claude", "nothing moves while a start runs")
        await gate.open()
        await finish(model)
        XCTAssertEqual(registry.registered.count, 1)
        let asked = await starter.asked
        XCTAssertEqual(asked.count, 1)
    }

    /// Clause (bb3): a runner stopped before it ran sends nothing and answers
    /// withheld; stop also cancels its task.
    func testAStoppedRunnerSendsNothing() async {
        let starter = ScriptedStarter(results: [done(wrote)], minted: [wrote])
        let runner = StartRunner(project: "p-local", agent: "claude", write: nil, starter: starter)
        runner.stop()
        XCTAssertTrue(runner.stopRequested)
        let sent = await runner.run()
        XCTAssertEqual(sent.result, .notSent(.cancelled))
        XCTAssertTrue(sent.result.withheld)
        let asked = await starter.asked
        XCTAssertTrue(asked.isEmpty)
    }

    // MARK: The drawing (D10, D11, D22)

    /// Clause (D22): the menu lists every project in main's order, a project
    /// on a machine Tortie is not connected to dimmed with `Not connected` and
    /// not choosable; the marks are exactly the chosen place's agents.
    func testTheDrawingListsProjectsAndOnlyTheInstalledMarks() {
        let offer = StartOffers.three()
        let drawing = StartDrawing(offer: offer, project: "p-local", agent: "claude")
        XCTAssertEqual(drawing.projects.map(\.id), ["p-local", "p-pro", "p-away"])
        XCTAssertEqual(drawing.projects.map(\.choosable), [true, true, false])
        XCTAssertEqual(drawing.projects[1].detail, "Mac Pro")
        XCTAssertEqual(drawing.projects[2].detail, Copy.joined(["Old box", Copy.startNotConnected]))
        XCTAssertEqual(drawing.marks.map(\.id), ["claude", "codex"])
        XCTAssertEqual(drawing.marks.map(\.chosen), [true, false])
        XCTAssertEqual(drawing.agentName, "Claude Code")
        XCTAssertNil(drawing.state)
        XCTAssertTrue(drawing.canCreate)
        let pro = StartDrawing(offer: offer, project: "p-pro", agent: "codex")
        XCTAssertEqual(pro.marks.map(\.id), ["codex"], "a machine's marks are its own installed agents alone")
        XCTAssertFalse(StartDrawing(offer: offer, project: "p-away", agent: "claude").canCreate, "a project Tortie is not connected to cannot be started")
    }

    /// Clause (D10, D11): main's chosen project when it can be chosen, else
    /// the first that can; the Mac's default agent when the place lists it,
    /// else the place's first; and a project change keeps the agent only where
    /// the new place lists it.
    func testTheChoicesFollowMainsRules() {
        let offer = StartOffers.three(chosen: "p-away", defaultAgent: "codex")
        XCTAssertEqual(StartDrawing.firstProject(offer), "p-local", "a chosen project that cannot be chosen gives way to the first that can")
        let model = StartModel(offer: offer, setup: setup(ScriptedStarter(results: [], minted: [])))
        XCTAssertEqual(model.project, "p-local")
        XCTAssertEqual(model.agent, "codex", "the Mac's default agent, installed here")
        let plain = StartModel(offer: StartOffers.three(defaultAgent: "gemini"), setup: setup(ScriptedStarter(results: [], minted: [])))
        XCTAssertEqual(plain.agent, "claude", "a default not installed here gives way to the place's first")
        plain.choose(project: "p-pro")
        XCTAssertEqual(plain.agent, "codex", "the agent moves when the new place does not list it")
        plain.choose(project: "p-away")
        XCTAssertEqual(plain.project, "p-pro", "a project Tortie is not connected to cannot be chosen")
        plain.choose(project: "p-local")
        XCTAssertEqual(plain.agent, "codex", "the agent stays where the new place lists it")
    }

    /// Clause (D22): the danger line is the Mac's labels under `Starts with`.
    func testTheSealedDefaultIsSaidInOneLine() {
        let drawing = StartDrawing(offer: StartOffers.three(), project: "p-local", agent: "codex")
        XCTAssertEqual(drawing.danger, Copy.startsWithLabels("Full auto"))
        XCTAssertEqual(drawing.danger, "Starts with Full auto")
        XCTAssertNil(StartDrawing(offer: StartOffers.three(), project: "p-local", agent: "claude").danger)
    }

    /// Clause (D22): one line for a state with nothing to create.
    func testTheStateLines() {
        let empty = PocketStartOffer(projects: [], places: [], agents: [], chosen: nil, defaultAgent: nil)
        XCTAssertEqual(StartDrawing(offer: empty, project: nil, agent: nil).state, Copy.startNoProject)
        XCTAssertFalse(StartDrawing(offer: empty, project: nil, agent: nil).canCreate)
        let unread = StartOffers.one(place: PocketStartPlace(id: "local", ready: true, read: false, agents: []))
        XCTAssertEqual(StartDrawing(offer: unread, project: "p-local", agent: nil).state, Copy.startNotRead)
        let none = StartOffers.one(place: PocketStartPlace(id: "local", ready: true, read: true, agents: []))
        XCTAssertEqual(StartDrawing(offer: none, project: "p-local", agent: nil).state, Copy.startNoAgent)
        XCTAssertTrue(StartDrawing(offer: none, project: "p-local", agent: nil).marks.isEmpty)
    }

    /// Clause (D25): a newer offer keeps the choices it still lists and makes
    /// the others again.
    func testARefreshedOfferKeepsWhatItStillLists() {
        let model = StartModel(offer: StartOffers.three(), setup: setup(ScriptedStarter(results: [], minted: [])))
        model.choose(project: "p-pro")
        model.refresh(StartOffers.three())
        XCTAssertEqual(model.project, "p-pro")
        model.refresh(StartOffers.two())
        XCTAssertEqual(model.project, "p-local", "a project the Mac no longer offers gives way to main's choice")
        XCTAssertEqual(model.agent, "codex", "the agent stays where the new place lists it")
    }

    // MARK: Every result is a sentence (rule v)

    /// Clause (rule v): every start result draws a non-empty sentence.
    func testEveryResultIsASentence() {
        let results: [StartResult] = [
            done(wrote), refused(wrote, "agent", "That agent is not installed there. Nothing was started."),
            busy(wrote, "Your Mac is starting another session. Nothing was started."),
            .notTaken, .noAnswer, .notSent(.cancelled), .notSent(.timedOut), .notSent(.unreachable(code: 61))
        ]
        for result in results {
            XCTAssertFalse(DoorWords.startSentence(for: result, sample: false).isEmpty, "\(result)")
            XCTAssertEqual(DoorWords.startSentence(for: result, sample: true), Copy.startSample)
        }
        XCTAssertEqual(DoorWords.startSentence(for: .noAnswer, sample: false), Copy.startNoAnswer)
        XCTAssertEqual(DoorWords.startSentence(for: .notTaken, sample: false), Copy.startNotTaken)
        XCTAssertEqual(DoorWords.startSentence(for: .notSent(.cancelled), sample: false), Copy.startNotTaken)
    }

    // MARK: The Sessions tab carries the offer (D9, D21, D26)

    /// Clause (D9, D21): the drawing carries the answer's start; the "+" is
    /// offered only for an offer, never for `waiting` or none.
    func testTheSessionsTabOffersOnlyAnOffer() async throws {
        var answer = SessionsAnswers.honest()
        answer.start = .offered(StartOffers.two())
        XCTAssertEqual(try SessionsDrawing(answer, asked: .standard).start, .offered(StartOffers.two()))
        let cases: [(PocketSessionsStart?, Bool)] = [(.offered(StartOffers.two()), true), (.waiting, false), (nil, false)]
        for (start, offered) in cases {
            let carried = start
            let reader = SessionsReader(respond: { query in
                var answer = SessionsAnswers.honest(query)
                answer.start = carried
                return .success(answer)
            })
            let model = SessionsModel(door: reader, list: ListModel(door: reader, routing: .stay), store: MemoryWords())
            await model.load(listToo: false)
            XCTAssertEqual(model.startOffer != nil, offered, "\(String(describing: start))")
        }
    }

    // MARK: The app's half (D17, D24, D27, bb3, bb9)

    /// Clause (DoorReading's default): a reader with no starter draws no "+".
    func testAReaderStartsNothingByDefault() {
        let reader: any DoorReading = ScriptedReader()
        XCTAssertNil(reader.starter)
    }

    /// Clause (D27): New session is handed to a pairing that starts, for its
    /// own space, and to no other.
    func testTheAppHandsAStartOnlyToAStarter() throws {
        let plain = AppModel(door: StandInPhone(kept: ScriptedReader()), label: "iPhone", alerts: StandInAlerts())
        XCTAssertNil(plain.reader.flatMap { plain.startSetup($0) })
        let starting = StartingReader(reads: ScriptedReader(), starts: ScriptedStarter(results: [], minted: []))
        let app = AppModel(door: StandInPhone(kept: starting), label: "iPhone", alerts: StandInAlerts())
        let made = try XCTUnwrap(app.reader.flatMap { app.startSetup($0) })
        XCTAssertEqual(made.mac, Answers.mac)
        XCTAssertFalse(made.sample)
        XCTAssertTrue(made.keeper === app.chosen)
    }

    /// Clause (bb3, D17): the app keeps every start runner and stops each one
    /// when it goes away, and every Mac forgets its kept start.
    func testWentAwayStopsEveryStartAndForgetsKeptStarts() throws {
        let app = AppModel(door: StandInPhone(kept: ScriptedReader()), label: "iPhone", alerts: StandInAlerts())
        let space = try XCTUnwrap(app.chosen)
        space.keptStart = KeptStart(mac: space.id, project: "p", agent: "claude", write: wrote, at: Date())
        let runner = StartRunner(project: "p", agent: "claude", write: nil, starter: ScriptedStarter(results: [], minted: []))
        app.registerStart(runner)
        XCTAssertEqual(app.liveStarts.count, 1)
        app.wentAway()
        XCTAssertTrue(runner.stopRequested)
        XCTAssertNil(space.keptStart)
        app.releaseStart(runner)
        XCTAssertTrue(app.liveStarts.isEmpty)
    }

    /// Clause (D24, bb9): done opens the session on the Sessions tab of the
    /// Mac that started it, and a Mac no longer on screen opens nothing.
    func testOpenStartedPushesTheSessionOnSessions() throws {
        let app = AppModel(door: StandInPhone(kept: ScriptedReader()), label: "iPhone", alerts: StandInAlerts())
        let space = try XCTUnwrap(app.chosen)
        app.openStarted(mac: "elsewhere.tail0000.ts.net", id: "x", name: "x")
        XCTAssertEqual(app.tab, .needsInput)
        XCTAssertTrue(app.sessionsPath.isEmpty)
        app.openStarted(mac: space.id, id: "made-1", name: "claude-3")
        XCTAssertEqual(app.tab, .sessions)
        XCTAssertEqual(app.sessionsPath, [.session(mac: space.id, id: "made-1", name: "claude-3")])
        XCTAssertTrue(app.waitingPath.isEmpty)
    }

    /// Clause (D24, D27): the setup's `opened` is `openStarted` on its own Mac.
    func testTheSetupOpensOnItsOwnMac() throws {
        let starting = StartingReader(reads: ScriptedReader(), starts: ScriptedStarter(results: [], minted: []))
        let app = AppModel(door: StandInPhone(kept: starting), label: "iPhone", alerts: StandInAlerts())
        let made = try XCTUnwrap(app.reader.flatMap { app.startSetup($0) })
        made.opened("made-2", "codex-1")
        XCTAssertEqual(app.sessionsPath, [.session(mac: Answers.mac, id: "made-2", name: "codex-1")])
    }
}

// MARK: - The stand-ins

/// The offers the tests draw from, built field by field.
enum StartOffers {
    static let claude = PocketStartAgent(id: "claude", name: "Claude Code", icon: "claude", danger: nil)
    static let codex = PocketStartAgent(id: "codex", name: "Codex CLI", icon: "codex", danger: "Full auto")

    /// One local project, claude and codex installed.
    static func two() -> PocketStartOffer {
        PocketStartOffer(
            projects: [PocketStartProject(id: "p-local", label: "webapp", machine: nil, folder: nil, place: "local")],
            places: [PocketStartPlace(id: "local", ready: true, read: true, agents: ["claude", "codex"])],
            agents: [claude, codex], chosen: "p-local", defaultAgent: "claude"
        )
    }

    /// A local project, one on a ready machine with codex alone, and one on a
    /// machine Tortie is not connected to.
    static func three(chosen: String? = "p-local", defaultAgent: String? = "claude") -> PocketStartOffer {
        PocketStartOffer(
            projects: [
                PocketStartProject(id: "p-local", label: "webapp", machine: nil, folder: nil, place: "local"),
                PocketStartProject(id: "p-pro", label: "monorepo", machine: "Mac Pro", folder: nil, place: "studio-pro"),
                PocketStartProject(id: "p-away", label: "infra", machine: "Old box", folder: nil, place: "old-box")
            ],
            places: [
                PocketStartPlace(id: "local", ready: true, read: true, agents: ["claude", "codex"]),
                PocketStartPlace(id: "studio-pro", ready: true, read: true, agents: ["codex"]),
                PocketStartPlace(id: "old-box", ready: false, read: true, agents: ["claude"])
            ],
            agents: [claude, codex], chosen: chosen, defaultAgent: defaultAgent
        )
    }

    /// One local project at `place`.
    static func one(place: PocketStartPlace) -> PocketStartOffer {
        PocketStartOffer(
            projects: [PocketStartProject(id: "p-local", label: "webapp", machine: nil, folder: nil, place: place.id)],
            places: [place], agents: place.agents.isEmpty ? [] : [claude], chosen: "p-local", defaultAgent: nil
        )
    }
}

/// The Mac's answers to the start, scripted, and every start asked, in order.
actor ScriptedStarter: DoorStarting {
    struct Ask: Equatable, Sendable {
        let project: String
        let agent: String
        let write: String?
    }

    private var results: [StartResult]
    /// The id each start that was not handed one went with, in order.
    private var minted: [String]
    private(set) var asked: [Ask] = []
    private let during: (@Sendable () async -> Void)?

    init(results: [StartResult], minted: [String], during: (@Sendable () async -> Void)? = nil) {
        self.results = results
        self.minted = minted
        self.during = during
    }

    func start(project: String, agent: String, write: String?) async -> SentStart {
        asked.append(Ask(project: project, agent: agent, write: write))
        await during?()
        let result = results.isEmpty ? StartResult.noAnswer : results.removeFirst()
        let id = write ?? (minted.isEmpty ? nil : minted.removeFirst())
        if case .notSent(.cancelled) = result { return SentStart(result: result, write: write) }
        return SentStart(result: result, write: id)
    }
}

/// The app's registry, recorded.
@MainActor
final class RecordingStarts: StartRunnerRegistry {
    private(set) var registered: [StartRunner] = []
    private(set) var released: [StartRunner] = []

    func registerStart(_ runner: StartRunner) {
        registered.append(runner)
    }

    func releaseStart(_ runner: StartRunner) {
        released.append(runner)
    }
}

/// A Mac's keeper of its one kept start, in memory.
@MainActor
final class MemoryKeeper: StartKeeping {
    var keptStart: KeptStart?
}

/// A reader that starts: `ScriptedReader`'s reads, and a starter, answered
/// through `DoorReading`'s requirement exactly as `PairedReader` answers it.
struct StartingReader: DoorReading {
    let reads: ScriptedReader
    let starts: any DoorStarting

    var alerts: AlertsKept { reads.alerts }
    var facts: PairedFacts { reads.facts }
    var starter: (any DoorStarting)? { starts }

    func blocked() async throws -> PocketBlockedAnswer { try await reads.blocked() }
    func session(_ sessionId: String) async throws -> PocketSessionAnswer { try await reads.session(sessionId) }
    func turns(_ sessionId: String, to: Int?) async throws -> PocketTurnsAnswer { try await reads.turns(sessionId, to: to) }
}

/// A clock a test moves.
final class StartClock: @unchecked Sendable {
    private let lock = NSLock()
    private var at: Date

    init(_ start: Date) {
        at = start
    }

    var now: @Sendable () -> Date {
        { [self] in lock.withLock { at } }
    }

    func advance(by seconds: TimeInterval) {
        lock.withLock { at = at.addingTimeInterval(seconds) }
    }
}

/// A gate a scripted start waits at until the test opens it.
actor StartGate {
    private var opened = false
    private var waiters: [CheckedContinuation<Void, Never>] = []

    func wait() async {
        if opened { return }
        await withCheckedContinuation { waiters.append($0) }
    }

    func open() {
        opened = true
        for waiter in waiters { waiter.resume() }
        waiters = []
    }
}
