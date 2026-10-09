import Foundation
import XCTest
@testable import Tortie

/// End on one session (Phase 317, build/p317/SPEC.md sections 5.8.1, 5.8.3 and
/// 5.8.5): what the door's answer carries, what the bar draws, the press from
/// the confirmation to the line under the bar, and the runner every End goes
/// through. The Mac and iOS are scripts (EndFakes.swift); nothing here reaches
/// a network or asks iOS anything. Each test names the clause it holds, and
/// each fails when that clause is taken out of Screens/EndBar.swift,
/// Screens/DoorWords.swift, Door/Contract.swift or App/TortieApp.swift.
@MainActor
final class EndTests: XCTestCase {
    // MARK: What the door's answer carries

    private func row(_ end: String?) throws -> PocketBlockedRow {
        let base = #""sessionId":"s","name":"s","project":"p","machine":null,"agent":"claude","agentLabel":"Claude Code","statusLabel":"working","statusTitle":"Working","statusDot":"working","question":null,"choices":[],"blockedSince":1,"seenAtWake":false,"ageText":"2m""#
        let json = end.map { "{" + base + #","end":"# + $0 + "}" } ?? "{" + base + "}"
        return try JSONDecoder().decode(PocketBlockedRow.self, from: Data(json.utf8))
    }

    /// Clause: a row's offer is read in closed words; a Mac older than 317
    /// sends none, which is `.none` (no End is drawn), and a word this build
    /// does not know is `.none` too, never a guess at a press; a known word
    /// missing its field refuses the answer.
    func testTheOfferIsReadInClosedWords() throws {
        XCTAssertEqual(try row(nil).end, .none)
        XCTAssertEqual(try row(#"{"state":"offered","batch":true}"#).end, .offered(batch: true))
        XCTAssertEqual(try row(#"{"state":"offered","batch":false}"#).end, .offered(batch: false))
        XCTAssertEqual(
            try row(#"{"state":"unreachable","title":"Tortie cannot see whether this session is running, so it cannot end it."}"#).end,
            .unreachable(title: "Tortie cannot see whether this session is running, so it cannot end it.")
        )
        XCTAssertEqual(try row(#"{"state":"none"}"#).end, .none)
        XCTAssertEqual(try row(#"{"state":"maybe","batch":true}"#).end, .none)
        XCTAssertThrowsError(try row(#"{"state":"offered"}"#))
        XCTAssertThrowsError(try row(#"{"state":"unreachable"}"#))
        XCTAssertTrue(PocketEndOffer.offered(batch: false).isOffered)
        XCTAssertFalse(PocketEndOffer.offered(batch: false).batchMayEnd)
        XCTAssertTrue(PocketEndOffer.offered(batch: true).batchMayEnd)
        XCTAssertFalse(PocketEndOffer.unreachable(title: "t").isOffered)
    }

    /// Clause: the write's answer refuses whole unless its words are the
    /// closed sets', a reason comes exactly with `refused`, and a non-empty
    /// sentence exactly with every outcome but `done`.
    func testTheWriteAnswerIsStrict() {
        func decodes(_ json: String) -> Bool {
            (try? JSONDecoder().decode(PocketWriteAnswer.self, from: Data(json.utf8))) != nil
        }
        let id = "00112233445566778899aabbccddeeff"
        XCTAssertTrue(decodes(#"{"verb":"end","write":"\#(id)","outcome":"done","reason":null,"sentence":null}"#))
        XCTAssertTrue(decodes(#"{"verb":"end","write":"\#(id)","outcome":"refused","reason":"ended","sentence":"s."}"#))
        XCTAssertTrue(decodes(#"{"verb":"end","write":"\#(id)","outcome":"failed","reason":null,"sentence":"s."}"#))
        // The one verb this build knows: the fix round took `unpair` out, so a
        // Mac's answer naming it refuses whole and reads no answer.
        XCTAssertFalse(decodes(#"{"verb":"unpair","write":"\#(id)","outcome":"done","reason":null,"sentence":null}"#), "a verb this build does not send")
        XCTAssertTrue(decodes(#"{"verb":"end","write":"\#(id)","outcome":"busy","reason":null,"sentence":"s."}"#))
        XCTAssertFalse(decodes(#"{"verb":"end","write":"\#(id)","outcome":"done","reason":"ended","sentence":null}"#), "a reason with done")
        XCTAssertFalse(decodes(#"{"verb":"end","write":"\#(id)","outcome":"refused","reason":null,"sentence":"s."}"#), "refused with no reason")
        XCTAssertFalse(decodes(#"{"verb":"end","write":"\#(id)","outcome":"done","reason":null,"sentence":"s."}"#), "a sentence with done")
        XCTAssertFalse(decodes(#"{"verb":"end","write":"\#(id)","outcome":"failed","reason":null,"sentence":null}"#), "failed with no sentence")
        XCTAssertFalse(decodes(#"{"verb":"end","write":"\#(id)","outcome":"failed","reason":null,"sentence":""}"#), "an empty sentence")
        XCTAssertFalse(decodes(#"{"verb":"interrupt","write":"\#(id)","outcome":"done","reason":null,"sentence":null}"#), "a verb this build does not make")
        XCTAssertFalse(decodes(#"{"verb":"end","write":"\#(id)","outcome":"refused","reason":"tired","sentence":"s."}"#), "a reason outside the set")
        XCTAssertFalse(decodes(#"{"verb":"end","write":"\#(id)","outcome":"done","sentence":null}"#), "a field left out")
    }

    /// Clause: the session screen's drawing carries the offer and the Mac's
    /// own confirmation; a Mac older than 317 draws neither.
    func testTheSessionCarriesTheOfferAndTheMacsConfirmation() throws {
        let offered = try SessionDrawing(WriteAnswers.session("s", end: .offered(batch: true)).session)
        XCTAssertEqual(offered.end, .offered(batch: true))
        XCTAssertEqual(offered.endConfirm, WriteAnswers.confirm)
        let older = try SessionDrawing(Answers.detail(Answers.row("s")))
        XCTAssertEqual(older.end, .none)
        XCTAssertNil(older.endConfirm)
    }

    /// Clause: the SHIPPING door's own answers (build/p316/vectors.mjs, from
    /// routes.ts) carry each row's offer and the session's confirmation, and
    /// the phone reads them; the same answer from a Mac older than 317, with
    /// neither field, reads no offer and no confirmation.
    func testTheDoorsAnswersCarryTheOfferAndTheConfirmation() throws {
        let v = try DoorVectorFile.load()
        let talk = try XCTUnwrap(v.answers["session-talk"]).json
        let read = try JSONDecoder().decode(PocketSessionAnswer.self, from: Data(talk.utf8))
        let confirm = try XCTUnwrap(read.session.endConfirm, "the door's session answer carries no confirmation")
        XCTAssertTrue(confirm.title.hasPrefix(Copy.batchEndLead), confirm.title)
        XCTAssertFalse(confirm.body.isEmpty)
        XCTAssertFalse(confirm.confirmLabel.isEmpty)
        XCTAssertTrue(read.session.end.isOffered)
        var object = try XCTUnwrap(try JSONSerialization.jsonObject(with: Data(talk.utf8)) as? [String: Any])
        var session = try XCTUnwrap(object["session"] as? [String: Any])
        session["endConfirm"] = nil
        session["end"] = nil
        object["session"] = session
        let older = try JSONDecoder().decode(PocketSessionAnswer.self, from: try JSONSerialization.data(withJSONObject: object))
        XCTAssertNil(older.session.endConfirm)
        XCTAssertEqual(older.session.end, .none)
        let blocked = try JSONDecoder().decode(PocketBlockedAnswer.self, from: Data(try XCTUnwrap(v.answers["blocked"]).json.utf8))
        let offers = (blocked.rows + blocked.others).map(\.end)
        XCTAssertTrue(offers.contains(.offered(batch: true)))
        XCTAssertTrue(offers.contains(.offered(batch: false)), "the batch narrowing never reached the phone")
    }

    /// Clause (F21): a session read says whether it drew THIS read's answer,
    /// which is what the End line's "as it reads now" stands on.
    func testTheReadSaysWhetherItDrew() async {
        let drew = SessionModel(sessionId: "s", door: ScriptedReader(session: [.success(WriteAnswers.session("s", end: .none))]), routing: .stay)
        let answered = await drew.load()
        XCTAssertTrue(answered)
        let refused = SessionModel(sessionId: "s", door: ScriptedReader(session: [.failure(.refused)]), routing: .stay)
        let back = await refused.load()
        XCTAssertFalse(back)
        let unreachable = SessionModel(sessionId: "s", door: ScriptedReader(session: [.failure(.unreachable(code: 61))]), routing: .stay)
        let failed = await unreachable.load()
        XCTAssertFalse(failed)
        let other = SessionModel(sessionId: "s", door: ScriptedReader(session: [.success(WriteAnswers.session("t", end: .none))]), routing: .stay)
        let wrong = await other.load()
        XCTAssertFalse(wrong, "an answer about another session drew as this one")
    }

    // MARK: What the bar draws

    /// Clause: offered with the Mac's words and a passcode: the row is on, in
    /// the press's colour, with the owner check's glyph and the confirmation.
    func testAnOfferedSessionDrawsTheRowOn() {
        let drawing = EndBarDrawing(offer: .offered(batch: true), confirm: WriteAnswers.confirm, kind: .faceID, phase: .idle, line: nil)
        XCTAssertEqual(drawing.row, .on)
        XCTAssertEqual(drawing.label, Copy.endTop, "End at the top right says End (Phase 337)")
        XCTAssertEqual(drawing.menuLabel, Copy.endSessionMenu, "End in the Terminal's ⋯ says the Mac's End session… (Phase 337.3)")
        XCTAssertFalse(drawing.writing)
        XCTAssertFalse(drawing.confirming)
        XCTAssertEqual(drawing.glyph, "faceid")
        XCTAssertEqual(drawing.confirm, WriteAnswers.confirm)
        XCTAssertNil(drawing.line)
        XCTAssertTrue(drawing.drawn)
        XCTAssertEqual(EndBarDrawing(offer: .offered(batch: false), confirm: WriteAnswers.confirm, kind: .touchID, phase: .idle, line: nil).glyph, "touchid")
    }

    /// Clause: with no passcode the row is off, offers no confirmation, and
    /// says so in one line.
    func testNoPasscodeDrawsTheRowOffWithOneLine() {
        let drawing = EndBarDrawing(offer: .offered(batch: true), confirm: WriteAnswers.confirm, kind: .none, phase: .idle, line: nil)
        XCTAssertEqual(drawing.row, .off)
        XCTAssertNil(drawing.confirm)
        XCTAssertEqual(drawing.line, Copy.endNeedsPasscode)
        XCTAssertEqual(drawing.glyph, "lock")
    }

    /// Clause: a session Tortie cannot see draws the row off with the door's
    /// own sentence under it; one End is not offered on draws no bar at all;
    /// and an offer without the Mac's words draws no row, so the phone never
    /// makes up the words of a confirmation.
    func testUnreachableNoneAndNoWords() {
        let title = "Tortie cannot see whether this session is running, so it cannot end it."
        let unreachable = EndBarDrawing(offer: .unreachable(title: title), confirm: nil, kind: .faceID, phase: .idle, line: nil)
        XCTAssertEqual(unreachable.row, .off)
        XCTAssertEqual(unreachable.line, title)
        XCTAssertNil(unreachable.confirm)
        let none = EndBarDrawing(offer: .none, confirm: nil, kind: .faceID, phase: .idle, line: nil)
        XCTAssertNil(none.row)
        XCTAssertFalse(none.drawn)
        let wordless = EndBarDrawing(offer: .offered(batch: true), confirm: nil, kind: .faceID, phase: .idle, line: nil)
        XCTAssertNil(wordless.row)
        XCTAssertFalse(wordless.drawn)
        // A line outlives the offer: after the session ended, its line stays.
        XCTAssertEqual(EndBarDrawing(offer: .none, confirm: nil, kind: .faceID, phase: .idle, line: Copy.endNoAnswer).line, Copy.endNoAnswer)
    }

    /// Clause: while iOS asks the row is off and `end-confirming` is drawn;
    /// while the write runs it is off and reads `Ending…`, at the top right
    /// and in the Terminal's ⋯ alike (Phase 337.3), which draws its own mark
    /// from `writing`.
    func testConfirmingAndWritingDrawTheRowOff() {
        let confirming = EndBarDrawing(offer: .offered(batch: true), confirm: WriteAnswers.confirm, kind: .faceID, phase: .confirming, line: nil)
        XCTAssertEqual(confirming.row, .off)
        XCTAssertTrue(confirming.confirming)
        XCTAssertFalse(confirming.writing)
        XCTAssertEqual(confirming.menuLabel, Copy.endSessionMenu)
        XCTAssertNil(confirming.confirm)
        let writing = EndBarDrawing(offer: .offered(batch: true), confirm: WriteAnswers.confirm, kind: .faceID, phase: .writing, line: nil)
        XCTAssertEqual(writing.row, .off)
        XCTAssertEqual(writing.label, Copy.ending)
        XCTAssertEqual(writing.menuLabel, Copy.ending)
        XCTAssertTrue(writing.writing)
        XCTAssertFalse(writing.confirming)
    }

    // MARK: The runner

    /// Clause (ad): a runner asked to stop before its first write sends
    /// nothing, and every target reads `Not run`.
    func testARunnerStoppedBeforeItsFirstWriteSendsNothing() async {
        let writer = ScriptedWriter(ends: [WriteAnswers.done, WriteAnswers.done])
        let runner = EndRunner(targets: ["a", "b"], batch: true, writer: writer)
        runner.stop()
        var steps: [String: EndStep] = [:]
        await runner.run { steps[$0] = $1 }
        let sent = await writer.endCount
        XCTAssertEqual(sent, 0)
        XCTAssertEqual(steps, ["a": .notRun, "b": .notRun])
    }

    /// Clause: one awaited write per target, in order, with the runner's own
    /// batch flag; an answered refusal or `busy` does not stop it.
    func testOneWritePerTargetInOrder() async {
        let writer = ScriptedWriter(ends: [WriteAnswers.busy, WriteAnswers.ended, WriteAnswers.done])
        let runner = EndRunner(targets: ["a", "b", "c"], batch: true, writer: writer)
        var order: [String] = []
        await runner.run { id, step in
            if case .wrote = step { order.append(id) }
        }
        let asked = await writer.ends
        XCTAssertEqual(asked.map(\.session), ["a", "b", "c"])
        XCTAssertEqual(asked.map(\.batch), [true, true, true])
        XCTAssertEqual(order, ["a", "b", "c"])
        XCTAssertFalse(runner.stopRequested)
    }

    /// Clause (D15): a write the Mac did not take, did not answer, or that was
    /// not sent stops the run for good; what follows is not run.
    func testTheRunStopsAfterNotTakenNoAnswerAndNotSent() async {
        for stopper in [WriteResult.notTaken, .noAnswer, .notSent(.cancelled), .notSent(.unreachable(code: 61))] {
            let writer = ScriptedWriter(ends: [WriteAnswers.done, stopper, WriteAnswers.done])
            let runner = EndRunner(targets: ["a", "b", "c"], batch: true, writer: writer)
            var steps: [String: EndStep] = [:]
            await runner.run { steps[$0] = $1 }
            let sent = await writer.endedIds
            XCTAssertEqual(sent, ["a", "b"], "\(stopper)")
            XCTAssertEqual(steps["c"], .notRun, "\(stopper)")
            XCTAssertTrue(runner.stopRequested, "\(stopper)")
        }
    }

    // MARK: The press

    private func endModel(
        _ writer: any DoorWriting,
        owner: ScriptedOwnerCheck? = nil,
        registry: RunnerRecord? = nil
    ) -> EndModel {
        EndModel(sessionId: "s", writer: writer, ownerCheck: owner ?? ScriptedOwnerCheck(), registry: registry ?? RunnerRecord())
    }

    /// Clause (ac): the owner check is asked with the confirmation's own
    /// press as its reason, and only `.confirmed` sends: one write, for this
    /// session, not a batch's. `done` draws no line and reads again.
    func testAConfirmedPressSendsOnceAndReadsAgain() async {
        let writer = ScriptedWriter(ends: [WriteAnswers.done])
        let owner = ScriptedOwnerCheck(answers: [.confirmed])
        let registry = RunnerRecord()
        let model = endModel(writer, owner: owner, registry: registry)
        var reads = 0
        model.press(WriteAnswers.confirm) {
            reads += 1
            return true
        }
        XCTAssertEqual(model.phase, .confirming)
        await model.pressing?.value
        let asked = await writer.ends
        XCTAssertEqual(asked.map(\.session), ["s"])
        XCTAssertEqual(asked.map(\.batch), [false])
        XCTAssertEqual(owner.asked, ["End session"])
        XCTAssertNil(model.line)
        XCTAssertEqual(reads, 1)
        XCTAssertEqual(model.phase, .idle)
        XCTAssertEqual(registry.made.count, 1, "the runner was not registered at the press")
        XCTAssertEqual(registry.live.count, 0, "the runner outlived its End")
    }

    /// Clause (D12): cancelled or failed, nothing is sent and one line says so.
    func testNotConfirmedSendsNothing() async {
        let writer = ScriptedWriter(ends: [WriteAnswers.done])
        let model = endModel(writer, owner: ScriptedOwnerCheck(answers: [.notConfirmed]))
        model.press(WriteAnswers.confirm) { true }
        await model.pressing?.value
        let sent = await writer.endCount
        XCTAssertEqual(sent, 0)
        XCTAssertEqual(model.line, Copy.endNotConfirmed)
    }

    /// Clause: iOS answering that no passcode is set sends nothing and draws
    /// End off with its line.
    func testNoPasscodeAtThePressSendsNothing() async {
        let writer = ScriptedWriter(ends: [WriteAnswers.done])
        let model = endModel(writer, owner: ScriptedOwnerCheck(answers: [.needsPasscode]))
        model.press(WriteAnswers.confirm) { true }
        await model.pressing?.value
        let sent = await writer.endCount
        XCTAssertEqual(sent, 0)
        XCTAssertEqual(model.kind, .none)
        let drawing = EndBarDrawing(offer: .offered(batch: true), confirm: WriteAnswers.confirm, kind: model.kind, phase: model.phase, line: model.line)
        XCTAssertEqual(drawing.line, Copy.endNeedsPasscode)
        XCTAssertEqual(drawing.row, .off)
    }

    /// Clause: a refusal draws the Mac's own sentence; a 404 draws the
    /// not-taken line and reads again.
    func testARefusalAndA404DrawTheirLines() async {
        let refused = endModel(ScriptedWriter(ends: [WriteAnswers.removed]))
        refused.press(WriteAnswers.confirm) { true }
        await refused.pressing?.value
        XCTAssertEqual(refused.line, "This session was removed, so there is nothing to end. Nothing was changed.")
        let notTaken = endModel(ScriptedWriter(ends: [.notTaken]))
        var reads = 0
        notTaken.press(WriteAnswers.confirm) {
            reads += 1
            return true
        }
        await notTaken.pressing?.value
        XCTAssertEqual(notTaken.line, Copy.endNotTaken)
        XCTAssertEqual(reads, 1)
    }

    /// Clause (F21): no answer reads again, and says "as it reads now" ONLY
    /// when that read came back; otherwise the read's own consequence stands
    /// and the End line says nothing.
    func testNoAnswerSaysAsItReadsNowOnlyOverARead() async {
        let read = endModel(ScriptedWriter(ends: [.noAnswer]))
        read.press(WriteAnswers.confirm) { true }
        await read.pressing?.value
        XCTAssertEqual(read.line, Copy.endNoAnswer)
        let unread = endModel(ScriptedWriter(ends: [.noAnswer]))
        unread.press(WriteAnswers.confirm) { false }
        await unread.pressing?.value
        XCTAssertNil(unread.line)
    }

    /// Clause: a write withheld when the app left is the not-taken line; a
    /// write that could not be sent says the read's own sentence.
    func testNotSentLines() async {
        let withheld = endModel(ScriptedWriter(ends: [.notSent(.cancelled)]))
        withheld.press(WriteAnswers.confirm) { true }
        await withheld.pressing?.value
        XCTAssertEqual(withheld.line, Copy.endNotTaken)
        let unreachable = endModel(ScriptedWriter(ends: [.notSent(.unreachable(code: 61))]))
        unreachable.press(WriteAnswers.confirm) { true }
        await unreachable.pressing?.value
        XCTAssertEqual(unreachable.line, Copy.cannotReachMac)
    }

    /// Clause: a second press while one is under way does nothing.
    func testASecondPressDoesNothing() async {
        let writer = ScriptedWriter(ends: [WriteAnswers.done, WriteAnswers.done])
        let owner = ScriptedOwnerCheck(answers: [.confirmed, .confirmed])
        let model = endModel(writer, owner: owner)
        model.press(WriteAnswers.confirm) { true }
        let first = model.pressing
        model.press(WriteAnswers.confirm) { true }
        await first?.value
        await model.pressing?.value
        let sent = await writer.endCount
        XCTAssertEqual(sent, 1)
        XCTAssertEqual(owner.askedCount, 1)
    }

    // MARK: Leaving the app

    /// Clause (D15, ad): the runner is made and registered with the APP at the
    /// press, before the owner check, so leaving the app while iOS asks stops
    /// it: nothing is sent once confirmed, and the line is the not-taken one.
    func testLeavingDuringTheOwnerCheckSendsNothing() async {
        let writer = ScriptedWriter(ends: [WriteAnswers.done])
        let owner = ScriptedOwnerCheck(answers: [.confirmed])
        let phone = StandInPhone(kept: WritingReader(reads: ScriptedReader(), writes: writer))
        let app = AppModel(door: phone, label: "iPhone", alerts: StandInAlerts(), ownerCheck: owner)
        let model = EndModel(sessionId: "s", writer: writer, ownerCheck: owner, registry: app)
        owner.during = { @MainActor in app.wentAway() }
        model.press(WriteAnswers.confirm) { true }
        XCTAssertEqual(app.liveRunners.count, 1, "the runner was not registered with the app at the press")
        await model.pressing?.value
        let sent = await writer.endCount
        XCTAssertEqual(sent, 0, "a write was sent after the app went away")
        XCTAssertEqual(model.line, Copy.endNotTaken)
        XCTAssertEqual(app.liveRunners.count, 0)
    }

    /// Clause (his ruling, "Only for End"; the fix round): Unpair asks no
    /// owner check and sends the Mac nothing. The phone forgets itself alone,
    /// exactly as 316.6 does, whatever its reader can write.
    func testUnpairAsksNoOwnerCheckAndSendsNothing() async {
        let writer = ScriptedWriter()
        let owner = ScriptedOwnerCheck()
        let phone = StandInPhone(kept: WritingReader(reads: ScriptedReader(), writes: writer))
        let app = AppModel(door: phone, label: "iPhone", alerts: StandInAlerts(), ownerCheck: owner)
        app.unpair()
        await app.forgetting?.value
        XCTAssertEqual(owner.askedCount, 0)
        XCTAssertEqual(phone.unpairs, 1)
        XCTAssertEqual(app.root, .pairing)
        let sent = await writer.endCount
        XCTAssertEqual(sent, 0)
    }

    /// Clause (ad): `wentAway` sets `stopRequested` on EVERY live runner and
    /// cancels its task.
    func testWentAwayStopsEveryLiveRunnerAndCancelsItsTask() {
        let app = AppModel(door: StandInPhone(), label: "iPhone", alerts: StandInAlerts(), ownerCheck: ScriptedOwnerCheck())
        let writer = ScriptedWriter()
        let runners = [EndRunner(targets: ["a"], batch: false, writer: writer), EndRunner(targets: ["b", "c"], batch: true, writer: writer)]
        let tasks: [Task<Void, Never>] = runners.map { _ in Task { _ = try? await Task.sleep(nanoseconds: 10_000_000_000) } }
        for (runner, task) in zip(runners, tasks) {
            runner.task = task
            app.register(runner)
        }
        app.wentAway()
        for (runner, task) in zip(runners, tasks) {
            XCTAssertTrue(runner.stopRequested)
            XCTAssertTrue(task.isCancelled)
        }
    }

    // MARK: The words

    /// Clause (rule v, widened): every result but a `done` answer has a
    /// sentence, never empty, and each is the owner's.
    func testEveryResultHasASentence() {
        let failures: [DoorFailure] = [
            .notPaired, .wrongKey, .nameNotFound, .unreachable(code: 61), .timedOut, .refused, .closedBeforeAnswer,
            .unexpectedStatus(500), .tooLarge, .malformed, .badPage, .cancelled
        ]
        var results: [WriteResult] = [.notTaken, .noAnswer, WriteAnswers.ended, WriteAnswers.removed, WriteAnswers.busy]
        results.append(contentsOf: failures.map { WriteResult.notSent($0) })
        for result in results {
            XCTAssertFalse(DoorWords.endSentence(for: result).isEmpty, "\(result)")
        }
        XCTAssertEqual(DoorWords.endSentence(for: .notTaken), Copy.endNotTaken)
        XCTAssertEqual(DoorWords.endSentence(for: .notSent(.cancelled)), Copy.endNotTaken)
        XCTAssertEqual(DoorWords.endSentence(for: .noAnswer), Copy.endNoAnswer)
        XCTAssertEqual(DoorWords.endSentence(for: WriteAnswers.busy), "Tortie is still doing the last thing you asked from this phone. Nothing was done.")
        XCTAssertEqual(DoorWords.endSentence(for: .notSent(.timedOut)), Copy.macDidNotAnswer)
    }
}
