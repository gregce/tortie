import Foundation
import XCTest
@testable import Tortie

/// Reply on one session (Phase 318, build/p318/SPEC.md sections 5.7.2 to
/// 5.7.4): the press, the message, the kept say, the runner every write goes
/// through, the app stopping them on the way out, and the words. The Mac is a
/// script (ReplyFakes.swift); nothing here reaches a network or asks iOS
/// anything. Each test names the clause it holds, and each fails when that
/// clause is taken out of Screens/Reply.swift, Screens/DoorWords.swift,
/// Screens/SessionScreen.swift or App/TortieApp.swift.
@MainActor
final class ReplyTests: XCTestCase {
    private func model(
        _ writer: any DoorWriting,
        registry: ReplyRecord? = nil,
        clock: HandClock = HandClock()
    ) -> ReplyModel {
        ReplyModel(sessionId: "s", writer: writer, registry: registry ?? ReplyRecord(), clock: clock.read)
    }

    // MARK: The press

    /// Clause: a press sends ONE choose, echoing the offer's question id and
    /// mark with the pressed marker, registered at the press and released
    /// after; taken, it draws no line and reads the session again.
    func testAPressSendsOnceWithTheOffersIdAndMark() async {
        let writer = ScriptedReplier(chooses: [ReplyAnswers.chosen])
        let registry = ReplyRecord()
        let reply = model(writer, registry: registry)
        var reads = 0
        reply.press("2", offer: ReplyAnswers.offer()) {
            reads += 1
            return true
        }
        XCTAssertEqual(reply.phase, .pressing("2"))
        XCTAssertEqual(registry.made.count, 1, "the runner was not registered at the press")
        await reply.running?.value
        let asked = await writer.chooses
        XCTAssertEqual(asked, [.init(session: "s", question: ReplyAnswers.question, mark: ReplyAnswers.mark, marker: "2")])
        XCTAssertNil(reply.pressLine)
        XCTAssertEqual(reads, 1)
        XCTAssertEqual(reply.phase, .idle)
        XCTAssertEqual(registry.live.count, 0, "the runner outlived its press")
    }

    /// Clause: a marker the offer does not name, or an offer with no question
    /// or mark, presses nothing.
    func testAMarkerTheOfferDoesNotNamePressesNothing() async {
        let writer = ScriptedReplier(chooses: [ReplyAnswers.chosen])
        let registry = ReplyRecord()
        let reply = model(writer, registry: registry)
        reply.press("1", offer: ReplyAnswers.offer(["4"])) { true }
        reply.press("1", offer: ReplyAnswers.offer(["1"], question: nil)) { true }
        reply.press("1", offer: ReplyAnswers.offer(["1"], mark: nil)) { true }
        reply.press("1", offer: .empty) { true }
        XCTAssertEqual(reply.phase, .idle)
        XCTAssertNil(reply.running)
        XCTAssertTrue(registry.made.isEmpty)
        let sent = await writer.chooseCount
        XCTAssertEqual(sent, 0)
    }

    /// Clause: a second press, or a message, while a press runs does nothing.
    func testNothingElseRunsWhileAPressRuns() async {
        let writer = ScriptedReplier(chooses: [ReplyAnswers.chosen, ReplyAnswers.chosen], says: [ReplyAnswers.sent])
        let reply = model(writer)
        reply.edit("hello")
        reply.press("1", offer: ReplyAnswers.offer()) { true }
        let first = reply.running
        reply.press("2", offer: ReplyAnswers.offer()) { true }
        reply.send { true }
        await first?.value
        let chooses = await writer.chooseCount
        let says = await writer.sayCount
        XCTAssertEqual(chooses, 1)
        XCTAssertEqual(says, 0)
    }

    /// Clause: a refused press draws the Mac's own sentence and reads again;
    /// a press typed and not taken draws the Mac's sentence for that; a 404
    /// and a withheld press draw the not-taken line.
    func testAPressThatWasNotTakenSaysWhy() async {
        for (result, line) in [
            (ReplyAnswers.changed, "This session changed. Nothing was done."),
            (ReplyAnswers.pressNotTaken, ReplyAnswers.notTakenSentence),
            (WriteResult.notTaken, Copy.replyNotTaken),
            (WriteResult.notSent(.cancelled), Copy.replyNotTaken),
            (WriteResult.notSent(.unreachable(code: 61)), Copy.cannotReachMac)
        ] {
            let reply = model(ScriptedReplier(chooses: [result]))
            var reads = 0
            reply.press("1", offer: ReplyAnswers.offer()) {
                reads += 1
                return true
            }
            await reply.running?.value
            XCTAssertEqual(reply.pressLine, line, "\(result)")
            XCTAssertEqual(reads, 1, "\(result)")
        }
    }

    /// Clause (317 §5.8.3's rule): no answer reads again, and says "as it
    /// reads now" ONLY when that read came back.
    func testAPressWithNoAnswerSaysAsItReadsNowOnlyOverARead() async {
        let read = model(ScriptedReplier(chooses: [.noAnswer]))
        read.press("1", offer: ReplyAnswers.offer()) { true }
        await read.running?.value
        XCTAssertEqual(read.pressLine, Copy.endNoAnswer)
        let unread = model(ScriptedReplier(chooses: [.noAnswer]))
        unread.press("1", offer: ReplyAnswers.offer()) { false }
        await unread.running?.value
        XCTAssertNil(unread.pressLine)
    }

    /// Clause (D24): a press never sends a write id of its own; the runner's
    /// verb carries none, and a press never sets a kept say.
    func testAPressKeepsNoId() async {
        let writer = ScriptedReplier(chooses: [.noAnswer])
        let registry = ReplyRecord()
        let reply = model(writer, registry: registry)
        reply.press("1", offer: ReplyAnswers.offer()) { true }
        await reply.running?.value
        guard case .choose? = registry.made.first?.verb else { return XCTFail("the press made no choose runner") }
        XCTAssertNil(reply.kept)
        // The runner's own result carries no id for a press, whatever the
        // Mac answered: nothing a press returns can be kept.
        let runner = ReplyRunner(
            verb: .choose(session: "s", question: ReplyAnswers.question, mark: ReplyAnswers.mark, marker: "1"),
            writer: ScriptedReplier(chooses: [ReplyAnswers.chosen])
        )
        let sent = await runner.run()
        XCTAssertEqual(sent.result, ReplyAnswers.chosen)
        XCTAssertNil(sent.write, "a press handed back an id to keep")
    }

    // MARK: The message

    /// Clause: Send sends the box's words ONCE, exactly as typed, with no id
    /// handed in; done empties the box, says `Sent`, and holds nothing.
    func testASentMessageEmptiesTheBoxAndSaysSent() async {
        let writer = ScriptedReplier(says: [ReplyAnswers.sent])
        let registry = ReplyRecord()
        let reply = model(writer, registry: registry)
        let words = "  /clear and !ls -- \"x\"  "
        reply.edit(words)
        var reads = 0
        reply.send {
            reads += 1
            return true
        }
        XCTAssertEqual(reply.phase, .sending)
        XCTAssertEqual(registry.made.count, 1)
        await reply.running?.value
        let asked = await writer.says
        XCTAssertEqual(asked, [.init(session: "s", text: words, write: nil)], "the words were not sent exactly as typed")
        XCTAssertEqual(reply.text, "")
        XCTAssertEqual(reply.sayLine, Copy.replySent)
        XCTAssertFalse(reply.holdsWords)
        XCTAssertNil(reply.kept)
        XCTAssertEqual(registry.live.count, 0)
        XCTAssertEqual(reply.phase, .idle)
    }

    /// Clause: an empty box sends nothing.
    func testAnEmptyBoxSendsNothing() async {
        let writer = ScriptedReplier(says: [ReplyAnswers.sent])
        let reply = model(writer)
        reply.send { true }
        XCTAssertNil(reply.running)
        let sent = await writer.sayCount
        XCTAssertEqual(sent, 0)
    }

    /// Clause: a message the Mac refused keeps the words in the box, draws
    /// the Mac's sentence, reads again, and holds the box drawn whatever that
    /// read says, until he pulls to read again.
    func testARefusedMessageKeepsItsWordsAndHoldsTheBox() async {
        let reply = model(ScriptedReplier(says: [ReplyAnswers.notReady]))
        reply.edit("say hello")
        var reads = 0
        reply.send {
            reads += 1
            return true
        }
        await reply.running?.value
        XCTAssertEqual(reply.text, "say hello")
        XCTAssertEqual(reply.sayLine, "This session is not ready for a message. Nothing was sent.")
        XCTAssertEqual(reads, 1)
        XCTAssertTrue(reply.holdsWords)
        reply.readingAgain()
        XCTAssertFalse(reply.holdsWords)
        XCTAssertEqual(reply.text, "say hello", "a pull forgets the hold, never the words")
    }

    /// Clause: a message that reached the session lets go of a box held for
    /// an earlier refusal, so the box is drawn again only while the Mac
    /// offers it.
    func testASentMessageLetsGoOfAHeldBox() async {
        let reply = model(ScriptedReplier(says: [ReplyAnswers.notReady, ReplyAnswers.sent]))
        reply.edit("say hello")
        reply.send { true }
        await reply.running?.value
        XCTAssertTrue(reply.holdsWords)
        reply.send { true }
        await reply.running?.value
        XCTAssertEqual(reply.sayLine, Copy.replySent)
        XCTAssertFalse(reply.holdsWords, "a sent message kept holding the box")
    }

    /// Clause: a 404 and a withheld message both say the not-taken line.
    func testANotTakenOrWithheldMessageSaysNothingWasSent() async {
        for result in [WriteResult.notTaken, .notSent(.cancelled)] {
            let reply = model(ScriptedReplier(says: [result]))
            reply.edit("x")
            reply.send { true }
            await reply.running?.value
            XCTAssertEqual(reply.sayLine, Copy.replyNotTaken, "\(result)")
            XCTAssertEqual(reply.text, "x")
        }
    }

    /// Clause: a message with no answer says "as it reads now" only over a
    /// read that came back, and keeps its words.
    func testAMessageWithNoAnswerSaysAsItReadsNowOnlyOverARead() async {
        let read = model(ScriptedReplier(says: [.noAnswer]))
        read.edit("x")
        read.send { true }
        await read.running?.value
        XCTAssertEqual(read.sayLine, Copy.endNoAnswer)
        XCTAssertEqual(read.text, "x")
        let unread = model(ScriptedReplier(says: [.noAnswer]))
        unread.edit("x")
        unread.send { false }
        await unread.running?.value
        XCTAssertNil(unread.sayLine)
    }

    /// Clause: what he typed while the message was on its way is not wiped by
    /// its `done`.
    func testWordsTypedWhileSendingStay() async {
        let writer = ScriptedReplier(says: [ReplyAnswers.sent])
        let reply = model(writer)
        reply.edit("first")
        reply.send { true }
        reply.edit("second")
        await reply.running?.value
        XCTAssertEqual(reply.text, "second")
    }

    // MARK: The kept say (Revision R13)

    /// Clause: after no answer, Send on the same words sends THAT id again,
    /// and the Mac's recorded `done` empties the box.
    func testNoAnswerThenTheSameWordsSendsTheSameId() async {
        let writer = ScriptedReplier(says: [.noAnswer, ReplyAnswers.sent])
        let reply = model(writer)
        reply.edit("say hello")
        reply.send { true }
        await reply.running?.value
        XCTAssertEqual(reply.kept?.write, ReplyAnswers.mintedIds[0])
        XCTAssertEqual(reply.kept?.bytes, Array("say hello".utf8))
        reply.send { true }
        await reply.running?.value
        let asked = await writer.says
        XCTAssertEqual(asked.map(\.write), [nil, ReplyAnswers.mintedIds[0]], "the second Send did not ask about the first message")
        XCTAssertEqual(reply.text, "")
        XCTAssertNil(reply.kept)
    }

    /// Clause: an edit that changes the box's bytes forgets the kept id, and
    /// so do edited-back words: the next Send is a fresh id.
    func testAnEditForgetsTheKeptId() async {
        let writer = ScriptedReplier(says: [.noAnswer, .noAnswer])
        let reply = model(writer)
        reply.edit("say hello")
        reply.send { true }
        await reply.running?.value
        XCTAssertNotNil(reply.kept)
        reply.edit("say hello!")
        XCTAssertNil(reply.kept)
        reply.edit("say hello")
        reply.send { true }
        await reply.running?.value
        let asked = await writer.says
        XCTAssertEqual(asked.map(\.write), [nil, nil])
    }

    /// Clause: the kept id goes only with the SAME BYTES it went with: words
    /// typed while the first message was on its way, sent after its answer did
    /// not come, are a fresh id.
    func testOtherWordsNeverGoUnderTheKeptId() async {
        let writer = ScriptedReplier(says: [.noAnswer, .noAnswer])
        let reply = model(writer)
        reply.edit("first")
        reply.send { true }
        reply.edit("second")
        await reply.running?.value
        XCTAssertEqual(reply.kept?.bytes, Array("first".utf8))
        reply.send { true }
        await reply.running?.value
        let asked = await writer.says
        XCTAssertEqual(asked.map(\.write), [nil, nil], "other words went under the first message's id")
        XCTAssertEqual(asked.last?.text, "second")
    }

    /// Clause: the same edit that changes nothing (the same bytes) forgets
    /// nothing.
    func testAnEditThatChangesNoByteKeepsTheId() async {
        let writer = ScriptedReplier(says: [.noAnswer])
        let reply = model(writer)
        reply.edit("same")
        reply.send { true }
        await reply.running?.value
        reply.edit("same")
        XCTAssertEqual(reply.kept?.write, ReplyAnswers.mintedIds[0])
    }

    /// Clause: the kept id is sent again for less than 60 s after the first
    /// was sent, and not at 60 s or after, and not when the clock went back.
    func testTheKeptIdLastsSixtySeconds() async {
        for (after, reused) in [(59.9, true), (60.0, false), (120.0, false), (-1.0, false)] {
            let clock = HandClock()
            let start = clock.now
            let writer = ScriptedReplier(says: [.noAnswer, .noAnswer])
            let reply = model(writer, clock: clock)
            reply.edit("words")
            reply.send { true }
            await reply.running?.value
            clock.set(start.addingTimeInterval(after))
            reply.send { true }
            await reply.running?.value
            let asked = await writer.says
            XCTAssertEqual(asked.last?.write, reused ? ReplyAnswers.mintedIds[0] : nil, "at \(after) s")
        }
    }

    /// Clause: the 60 s count is from the FIRST send: a second no answer on
    /// the kept id does not restart it.
    func testASecondNoAnswerKeepsTheFirstTime() async {
        let clock = HandClock()
        let start = clock.now
        let writer = ScriptedReplier(says: [.noAnswer, .noAnswer, .noAnswer])
        let reply = model(writer, clock: clock)
        reply.edit("words")
        reply.send { true }
        await reply.running?.value
        clock.set(start.addingTimeInterval(40))
        reply.send { true }
        await reply.running?.value
        XCTAssertEqual(reply.kept?.at, start)
        clock.set(start.addingTimeInterval(70))
        reply.send { true }
        await reply.running?.value
        let asked = await writer.says
        XCTAssertEqual(asked.map(\.write), [nil, ReplyAnswers.mintedIds[0], nil])
    }

    /// Clause: busy on a kept id keeps it (the first may still be acting);
    /// busy on a fresh id keeps nothing; any other answer forgets it.
    func testBusyKeepsOnlyAKeptId() async {
        let kept = ScriptedReplier(says: [.noAnswer, ReplyAnswers.sayBusy])
        let reply = model(kept)
        reply.edit("words")
        reply.send { true }
        await reply.running?.value
        reply.send { true }
        await reply.running?.value
        XCTAssertEqual(reply.kept?.write, ReplyAnswers.mintedIds[0], "busy on the kept id forgot it")

        let fresh = model(ScriptedReplier(says: [ReplyAnswers.sayBusy]))
        fresh.edit("words")
        fresh.send { true }
        await fresh.running?.value
        XCTAssertNil(fresh.kept, "busy on a fresh id kept one")

        for other in [ReplyAnswers.notReady, WriteResult.notTaken] {
            let refused = model(ScriptedReplier(says: [.noAnswer, other]))
            refused.edit("words")
            refused.send { true }
            await refused.running?.value
            refused.send { true }
            await refused.running?.value
            XCTAssertNil(refused.kept, "\(other) did not forget the kept id")
        }
    }

    /// Clause: a re-send that was not sent at all is not an answer, so the
    /// first message's id stays kept.
    func testAReSendNotSentKeepsTheId() async {
        let reply = model(ScriptedReplier(says: [.noAnswer, .notSent(.unreachable(code: 61))]))
        reply.edit("words")
        reply.send { true }
        await reply.running?.value
        reply.send { true }
        await reply.running?.value
        XCTAssertEqual(reply.kept?.write, ReplyAnswers.mintedIds[0])
    }

    /// Clause: the words are compared as UTF-8 BYTES, never with `String ==`:
    /// `é` and `e` with a combining acute are equal Strings and different
    /// bytes, and the second is a fresh id. Both built from code points.
    func testTheWordsAreComparedAsBytes() async throws {
        let composed = String(Character(try XCTUnwrap(Unicode.Scalar(0x00E9))))
        let decomposed = "e" + String(Character(try XCTUnwrap(Unicode.Scalar(0x0301))))
        XCTAssertEqual(composed, decomposed, "Swift calls these equal, which is why the model does not ask it")
        XCTAssertNotEqual(Array(composed.utf8), Array(decomposed.utf8))
        let writer = ScriptedReplier(says: [.noAnswer, .noAnswer])
        let reply = model(writer)
        reply.edit(composed)
        reply.send { true }
        await reply.running?.value
        reply.edit(decomposed)
        reply.send { true }
        await reply.running?.value
        let asked = await writer.says
        XCTAssertEqual(asked.map(\.write), [nil, nil], "different bytes went under the kept id")
        XCTAssertEqual(asked.last.map { Array($0.text.utf8) }, Array(decomposed.utf8))
    }

    // MARK: The runner and leaving the app

    /// Clause: a runner stopped before it ran sends nothing and reads as
    /// withheld.
    func testAStoppedRunnerSendsNothing() async {
        let writer = ScriptedReplier(says: [ReplyAnswers.sent])
        let runner = ReplyRunner(verb: .say(session: "s", text: "x", write: nil), writer: writer)
        runner.stop()
        let sent = await runner.run()
        XCTAssertEqual(sent.result, .notSent(.cancelled))
        XCTAssertTrue(sent.result.withheld)
        let says = await writer.sayCount
        XCTAssertEqual(says, 0)
    }

    /// Clause (ag): `wentAway` stops EVERY live reply runner and cancels its
    /// task.
    func testWentAwayStopsEveryLiveReplyRunner() {
        let app = AppModel(door: StandInPhone(), label: "iPhone", alerts: StandInAlerts(), ownerCheck: ScriptedOwnerCheck())
        let writer = ScriptedReplier()
        let runners = [
            ReplyRunner(verb: .choose(session: "a", question: ReplyAnswers.question, mark: ReplyAnswers.mark, marker: "1"), writer: writer),
            ReplyRunner(verb: .say(session: "b", text: "x", write: nil), writer: writer)
        ]
        let tasks: [Task<Void, Never>] = runners.map { _ in Task { _ = try? await Task.sleep(nanoseconds: 10_000_000_000) } }
        for (runner, task) in zip(runners, tasks) {
            runner.task = task
            app.registerReply(runner)
        }
        XCTAssertEqual(app.liveReplies.count, 2)
        app.wentAway()
        for (runner, task) in zip(runners, tasks) {
            XCTAssertTrue(runner.stopRequested)
            XCTAssertTrue(task.isCancelled)
        }
    }

    /// Clause (ag, D24): the runner is registered with the APP before its
    /// write starts, so leaving the app the moment Send is pressed sends
    /// nothing: the write is withheld and the line says so.
    func testLeavingAtTheSendSendsNothing() async {
        let writer = ScriptedReplier(says: [ReplyAnswers.sent])
        let app = AppModel(door: StandInPhone(), label: "iPhone", alerts: StandInAlerts(), ownerCheck: ScriptedOwnerCheck())
        let reply = ReplyModel(sessionId: "s", writer: writer, registry: app)
        reply.edit("x")
        reply.send { true }
        XCTAssertEqual(app.liveReplies.count, 1, "the runner was not registered with the app at the press")
        app.wentAway()
        await reply.running?.value
        let says = await writer.sayCount
        XCTAssertEqual(says, 0, "a message was sent after the app went away")
        XCTAssertEqual(reply.sayLine, Copy.replyNotTaken)
        XCTAssertEqual(reply.text, "x")
        XCTAssertEqual(app.liveReplies.count, 0)
    }

    /// Clause (his ruling, "Only for End"; rule af): a press and a message
    /// ask NO owner check, whatever the app's check would answer.
    func testAReplyAsksNoOwnerCheck() async {
        let owner = ScriptedOwnerCheck(answers: [.notConfirmed])
        let writer = ScriptedReplier(chooses: [ReplyAnswers.chosen], says: [ReplyAnswers.sent])
        let app = AppModel(door: StandInPhone(), label: "iPhone", alerts: StandInAlerts(), ownerCheck: owner)
        let reply = ReplyModel(sessionId: "s", writer: writer, registry: app)
        reply.press("1", offer: ReplyAnswers.offer()) { true }
        await reply.running?.value
        reply.edit("x")
        reply.send { true }
        await reply.running?.value
        XCTAssertEqual(owner.askedCount, 0)
        let chooses = await writer.chooseCount
        let says = await writer.sayCount
        XCTAssertEqual(chooses, 1)
        XCTAssertEqual(says, 1)
    }

    // MARK: The words

    /// Clause (rule v, widened): every result has a reply sentence, never
    /// empty, and each is the owner's.
    func testEveryResultHasAReplySentence() {
        let failures: [DoorFailure] = [
            .notPaired, .wrongKey, .nameNotFound, .unreachable(code: 61), .timedOut, .refused, .closedBeforeAnswer,
            .unexpectedStatus(500), .tooLarge, .malformed, .badPage, .cancelled
        ]
        var results: [WriteResult] = [
            .notTaken, .noAnswer, ReplyAnswers.chosen, ReplyAnswers.sent, ReplyAnswers.changed,
            ReplyAnswers.notReady, ReplyAnswers.sayBusy, ReplyAnswers.pressNotTaken
        ]
        results.append(contentsOf: failures.map { WriteResult.notSent($0) })
        for result in results {
            XCTAssertFalse(DoorWords.replySentence(for: result).isEmpty, "\(result)")
        }
        XCTAssertEqual(DoorWords.replySentence(for: ReplyAnswers.sent), Copy.replySent)
        XCTAssertEqual(DoorWords.replySentence(for: .notTaken), Copy.replyNotTaken)
        XCTAssertEqual(DoorWords.replySentence(for: .notSent(.cancelled)), Copy.replyNotTaken)
        XCTAssertEqual(DoorWords.replySentence(for: .noAnswer), Copy.endNoAnswer)
        XCTAssertEqual(DoorWords.replySentence(for: ReplyAnswers.notReady), "This session is not ready for a message. Nothing was sent.")
        XCTAssertEqual(DoorWords.replySentence(for: .notSent(.timedOut)), Copy.macDidNotAnswer)
    }

    // MARK: What the screen draws

    /// Clause: the session's drawing carries the door's offer, and a Mac
    /// older than 318 draws the empty one.
    func testTheDrawingCarriesTheOffer() throws {
        let offer = ReplyAnswers.offer(command: "ls -la")
        let drawn = try SessionDrawing(ReplyAnswers.session(choices: ReplyAnswers.claudeChoices, reply: offer).session)
        XCTAssertEqual(drawn.reply, offer)
        XCTAssertTrue(drawn.hasCard, "a command alone is something the card says")
        let older = try SessionDrawing(ReplyAnswers.session(choices: ReplyAnswers.claudeChoices).session)
        XCTAssertEqual(older.reply, .empty)
    }
}
