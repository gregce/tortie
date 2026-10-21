import Foundation
import XCTest
@testable import Tortie

/// Remove, on one session that has ended (Phase 348, build/p348/SPEC.md D4
/// to D11, D27, D33, D49, D55; his ruling of 2026-10-18, "No Face ID, just
/// confirm"): what the door's answer carries, what is drawn in End's place,
/// the press from the Mac's confirmation to the line under the status, the
/// runner every Remove goes through, the write's own answer and its result,
/// and that nothing on Remove's path names an owner check. The Mac is a
/// script; nothing here reaches a network or asks iOS anything. Each test
/// names the clause it holds and fails when that clause is taken out of
/// Screens/Remove.swift, Screens/EndBar.swift, Screens/SessionScreen.swift,
/// Screens/DoorWords.swift, Door/Contract.swift or Door/DoorClient.swift.
@MainActor
final class RemoveTests: XCTestCase {
    /// The Mac's own Remove confirmation (`removeSessionConfirm`) for a
    /// session named `build`.
    static let confirm = PocketEndConfirm(
        title: "Remove 'build'?", body: "It moves to Past Sessions and you can restore it from there.", confirmLabel: "Remove"
    )

    private let id = "00112233445566778899aabbccddeeff"

    private func answer(_ outcome: PocketWriteAnswer.Outcome, reason: String? = nil, sentence: String? = nil, write: String? = nil) -> PocketRemoveAnswer {
        PocketRemoveAnswer(verb: PocketRemoveAnswer.verbWord, write: write ?? id, outcome: outcome, reason: reason, sentence: sentence)
    }

    private func model(_ remover: ScriptedRemover, registry: RemoveRecord? = RemoveRecord(), routing: RoutingLog) -> RemoveModel {
        RemoveModel(sessionId: "s", remover: remover, registry: registry, routing: routing.routing)
    }

    // MARK: What is drawn in End's place (D4, D33)

    /// Clause (D4, D33): Remove is drawn exactly where End draws no row
    /// because the Mac offers no End, only with the Mac's own words, and only
    /// for a pairing that removes; on while idle, off with no confirmation
    /// while its write runs.
    func testRemoveIsDrawnInEndsPlaceOnceEndIsDone() {
        let on = RemoveDrawing.of(phase: .idle, offer: .none, confirm: Self.confirm)
        XCTAssertEqual(on, RemoveDrawing(row: .on, confirm: Self.confirm, writing: false))
        XCTAssertEqual(RemoveDrawing.of(phase: .writing, offer: .none, confirm: Self.confirm), RemoveDrawing(row: .off, confirm: nil, writing: true))
        XCTAssertNil(RemoveDrawing.of(phase: nil, offer: .none, confirm: Self.confirm), "Remove drawn for a pairing that removes nothing")
        XCTAssertNil(RemoveDrawing.of(phase: .idle, offer: .none, confirm: nil), "Remove drawn with no words of the Mac's")
        XCTAssertNil(RemoveDrawing.of(phase: .idle, offer: .offered(batch: true), confirm: Self.confirm), "Remove drawn while End is offered")
        XCTAssertNil(RemoveDrawing.of(phase: .idle, offer: .unreachable(title: "t"), confirm: Self.confirm), "Remove drawn while End cannot judge")
        // End draws no row exactly then: the two never draw at once.
        XCTAssertNil(EndBarDrawing(offer: .none, confirm: nil, kind: .faceID, phase: .idle, line: nil).row)
        let model = RemoveModel(sessionId: "s", remover: ScriptedRemover(), registry: nil, routing: .stay)
        XCTAssertEqual(RemoveDrawing.of(model, offer: .none, confirm: Self.confirm), on)
        XCTAssertNil(RemoveDrawing.of(nil, offer: .none, confirm: Self.confirm))
    }

    /// Clause (D33): in the Terminal's ⋯ Remove is the second item exactly
    /// where End's row is not drawn, read through the menu's own function,
    /// and `remove-writing` sits beside the ⋯ while its write runs; End's own
    /// marks come first.
    func testTheMenuDrawsRemoveWhereItDrawsNoEnd() throws {
        let remove = RemoveModel(sessionId: "s", remover: ScriptedRemover(), registry: nil, routing: .stay)
        let end = EndModel(sessionId: "s", writer: ScriptedWriter(), ownerCheck: ScriptedOwnerCheck(), registry: RunnerRecord(), remove: remove)
        XCTAssertEqual(TerminalMenuControl.removeDrawing(end, offer: .none, removeConfirm: Self.confirm)?.row, .on)
        XCTAssertNil(TerminalMenuControl.removeDrawing(end, offer: .offered(batch: true), removeConfirm: Self.confirm))
        XCTAssertNil(TerminalMenuControl.removeDrawing(end, offer: .none, removeConfirm: nil))
        XCTAssertNil(TerminalMenuControl.removeDrawing(nil, offer: .none, removeConfirm: Self.confirm), "Remove drawn for a pairing that writes nothing")
        let plain = EndModel(sessionId: "s", writer: ScriptedWriter(), ownerCheck: ScriptedOwnerCheck(), registry: RunnerRecord())
        XCTAssertNil(TerminalMenuControl.removeDrawing(plain, offer: .none, removeConfirm: Self.confirm), "Remove drawn for an End with no Remove")
        let writing = RemoveDrawing(row: .off, confirm: nil, writing: true)
        XCTAssertEqual(TerminalMenuControl.removeMark(writing), ID.removeWriting)
        XCTAssertNil(TerminalMenuControl.removeMark(RemoveDrawing(row: .on, confirm: Self.confirm, writing: false)))
        XCTAssertNil(TerminalMenuControl.removeMark(nil))
        let idle = EndBarDrawing(offer: .none, confirm: nil, kind: .faceID, phase: .idle, line: nil)
        XCTAssertNil(TerminalMenuControl.progressMark(idle), "End's mark drawn over an End that runs nothing")
        // The menu asks End's mark first, then Remove's.
        let control = try span("ios/Tortie/Screens/SessionScreen.swift", "struct TerminalMenuControl: View {")
        XCTAssertTrue(
            control.contains("if let mark = TerminalMenuControl.progressMark(drawing) ?? TerminalMenuControl.removeMark(removal) {"),
            "End's mark is not asked first, or Remove's not at all"
        )
    }

    // MARK: The press (D7, D55)

    /// Clause (D7, D55; rule ad): the press makes ONE runner of ONE target and
    /// registers it with the app BEFORE its write, asks nothing first, writes
    /// once, and `done` goes back to the list (the route's own backToList)
    /// with no line; the runner is released after.
    func testThePressRegistersBeforeTheWriteThenDoneGoesBackToTheList() async throws {
        let latch = Latch()
        let remover = ScriptedRemover(results: [.answered(answer(.done))], during: { _ in await latch.wait() })
        let registry = RemoveRecord()
        let routing = RoutingLog()
        let remove = model(remover, registry: registry, routing: routing)
        var rereads = 0
        remove.press { rereads += 1; return true }
        XCTAssertEqual(remove.phase, .writing)
        XCTAssertTrue(remove.pressed)
        XCTAssertEqual(registry.made.count, 1, "the runner was not registered at the press")
        XCTAssertEqual(registry.live.count, 1)
        XCTAssertEqual(registry.made.first?.target, "s")
        try await until { await remover.count == 1 }
        XCTAssertEqual(registry.live.count, 1, "the runner was released before its write answered")
        await latch.open()
        await remove.pressing?.value
        XCTAssertEqual(remove.phase, .idle)
        XCTAssertNil(remove.line)
        XCTAssertEqual(routing.back, 1, "done did not go back to the list")
        XCTAssertEqual(rereads, 0, "done read the session again rather than going back")
        XCTAssertEqual(registry.live.count, 0)
        let asked = await remover.asked
        XCTAssertEqual(asked, ["s"])
    }

    /// Clause (D55, rule v): every result says what is true of it, on End's
    /// line: the Mac's own sentence for a refusal, read again after; the
    /// phone's not-removed line for a 404 and for a write withheld; End's
    /// no-answer line ONLY over a read that came back; a failure before the
    /// bytes were handed its own sentence, and no read.
    func testEachResultSaysWhatIsTrue() async {
        let refused = PocketRemoveAnswer(
            verb: PocketRemoveAnswer.verbWord, write: id, outcome: .refused, reason: "changed",
            sentence: "This session changed since your phone read it. Nothing was done."
        )
        let cases: [(RemoveResult, Bool, String?, Int)] = [
            (.answered(refused), true, refused.sentence, 1),
            (.answered(answer(.refused, reason: "a-word-this-build-does-not-know", sentence: "The Mac's own words.")), true, "The Mac's own words.", 1),
            (.answered(answer(.failed, sentence: "Tortie could not remove this session.")), true, "Tortie could not remove this session.", 1),
            (.notTaken, true, Copy.removeNotTaken, 1),
            (.noAnswer, true, Copy.endNoAnswer, 1),
            (.noAnswer, false, nil, 1),
            (.notSent(.cancelled), true, Copy.removeNotTaken, 1),
            (.notSent(.unreachable(code: 61)), true, Copy.cannotReachMac, 0),
        ]
        for (result, readBack, line, reads) in cases {
            let routing = RoutingLog()
            let remove = model(ScriptedRemover(results: [result]), routing: routing)
            var rereads = 0
            remove.press { rereads += 1; return readBack }
            await remove.pressing?.value
            XCTAssertEqual(remove.line, line, "\(result)")
            XCTAssertEqual(rereads, reads, "\(result)")
            XCTAssertEqual(routing.back, 0, "\(result) went back to the list")
            XCTAssertEqual(remove.phase, .idle)
        }
    }

    /// Clause: a second press while a Remove runs does nothing: one write.
    func testASecondPressWhileOneRunsDoesNothing() async throws {
        let latch = Latch()
        let remover = ScriptedRemover(results: [.notTaken], during: { _ in await latch.wait() })
        let registry = RemoveRecord()
        let routing = RoutingLog()
        let remove = model(remover, registry: registry, routing: routing)
        remove.press { true }
        remove.press { true }
        XCTAssertEqual(registry.made.count, 1)
        await latch.open()
        await remove.pressing?.value
        let count = await remover.count
        XCTAssertEqual(count, 1, "a second write went out")
    }

    /// Clause (D55, rule ad): a runner stopped before its write (the app left
    /// between the press and the write) writes NOTHING and says so; one
    /// stopped while its write waits is cancelled.
    func testARunnerStoppedBeforeItsWriteWritesNothing() async {
        let remover = ScriptedRemover(results: [.answered(answer(.done))])
        let runner = RemoveRunner(target: "s", remover: remover)
        runner.stop()
        let result = await runner.run()
        XCTAssertNil(result)
        let count = await remover.count
        XCTAssertEqual(count, 0, "a stopped runner wrote")
        // Stopped at the registration, which is what wentAway does to a live
        // runner: the press's write never goes.
        let stopping = RemoveRecord(stopsAtRegistration: true)
        let routing = RoutingLog()
        let pressed = model(remover, registry: stopping, routing: routing)
        var rereads = 0
        pressed.press { rereads += 1; return true }
        await pressed.pressing?.value
        let after = await remover.count
        XCTAssertEqual(after, 0, "a write went out after the app left")
        XCTAssertEqual(pressed.line, Copy.removeNotTaken)
        XCTAssertEqual(rereads, 1)
        XCTAssertEqual(routing.back, 0)
    }

    /// Clause (D4): End's line under the status gives way to Remove's once a
    /// Remove is pressed on the page, and is End's until then.
    func testEndsLineGivesWayToRemovesOnceRemoveIsPressed() async {
        let routing = RoutingLog()
        let remove = model(ScriptedRemover(results: [.notTaken]), routing: routing)
        let end = EndModel(sessionId: "s", writer: ScriptedWriter(), ownerCheck: ScriptedOwnerCheck(), registry: RunnerRecord(), remove: remove)
        XCTAssertNil(end.shownLine)
        XCTAssertIdentical(end.remove, remove)
        remove.press { true }
        await remove.pressing?.value
        XCTAssertEqual(end.shownLine, Copy.removeNotTaken)
        XCTAssertNil(EndModel(sessionId: "s", writer: ScriptedWriter(), ownerCheck: ScriptedOwnerCheck(), registry: RunnerRecord()).remove)
    }

    // MARK: The seams' defaults (section 9.3)

    /// Clause (section 9.3, D30, D55): a reader that says nothing of Remove
    /// (every fake before this phase, through `DoorReading`'s requirement)
    /// removes nothing, so no Remove is drawn for it; and a Screen door that
    /// says nothing of paste (through `ScreenDoor`'s two requirements) takes
    /// none and sends none, answering that nothing was sent; the sample's
    /// reader is its own remover.
    func testAReaderOrADoorThatSaysNothingRemovesAndPastesNothing() async {
        let reader: any DoorReading = WritingReader(reads: ScriptedReader(), writes: ScriptedWriter())
        XCTAssertNil(reader.remover, "a reader that says nothing of Remove removes")
        let door: any ScreenDoor = ScriptedSideDoor()
        XCTAssertFalse(door.pastes, "a Screen door that says nothing of paste takes one")
        let pasted = await door.paste("ls", turn: "0123456789abcdef-1", dialog: nil)
        XCTAssertEqual(pasted, .notSent(.notPaired))
        XCTAssertFalse(pasted.withheld)
        let sample: any DoorReading = SampleReader(book: SampleBookFixture.book())
        XCTAssertNotNil(sample.remover, "the sample removes nothing on its own copy")
    }

    // MARK: The sentence (rule v)

    /// Clause (D55, rule v): `removeSentence` is ALWAYS a sentence: the Mac's
    /// words for a refusal, the phone's not-removed line for a 404 and a
    /// withheld write, End's no-answer line, and any read's sentence for a
    /// failure before the bytes were handed; `done` is the Mac's word Remove,
    /// which is never drawn.
    func testTheSentenceIsAlwaysASentence() {
        XCTAssertEqual(DoorWords.removeSentence(for: .answered(answer(.done))), Copy.remove)
        XCTAssertEqual(DoorWords.removeSentence(for: .answered(answer(.busy, sentence: "Busy."))), "Busy.")
        XCTAssertEqual(DoorWords.removeSentence(for: .notTaken), Copy.removeNotTaken)
        XCTAssertEqual(DoorWords.removeSentence(for: .noAnswer), Copy.endNoAnswer)
        XCTAssertEqual(DoorWords.removeSentence(for: .notSent(.cancelled)), Copy.removeNotTaken)
        XCTAssertEqual(DoorWords.removeSentence(for: .notSent(.timedOut)), Copy.macDidNotAnswer)
        for result: RemoveResult in [.answered(answer(.done)), .notTaken, .noAnswer, .notSent(.cancelled), .notSent(.notPaired)] {
            XCTAssertFalse(DoorWords.removeSentence(for: result).isEmpty, "\(result)")
        }
    }

    // MARK: The door's answer (D27, D49)

    /// Clause (D27): the answer refuses whole unless its verb is `remove`, a
    /// non-empty reason comes exactly with `refused` (read as an OPEN word),
    /// and a non-empty sentence exactly with every outcome but `done`.
    func testTheAnswerIsStrictWithAnOpenReason() {
        func decodes(_ json: String) -> PocketRemoveAnswer? {
            try? JSONDecoder().decode(PocketRemoveAnswer.self, from: Data(json.utf8))
        }
        XCTAssertNotNil(decodes(#"{"verb":"remove","write":"\#(id)","outcome":"done","reason":null,"sentence":null}"#))
        XCTAssertNotNil(decodes(#"{"verb":"remove","write":"\#(id)","outcome":"refused","reason":"gone","sentence":"s."}"#))
        XCTAssertNotNil(decodes(#"{"verb":"remove","write":"\#(id)","outcome":"refused","reason":"a-later-macs-word","sentence":"s."}"#), "an open reason refused whole")
        XCTAssertNotNil(decodes(#"{"verb":"remove","write":"\#(id)","outcome":"busy","reason":null,"sentence":"s."}"#))
        XCTAssertNil(decodes(#"{"verb":"end","write":"\#(id)","outcome":"done","reason":null,"sentence":null}"#), "another verb's answer")
        XCTAssertNil(decodes(#"{"verb":"remove","write":"\#(id)","outcome":"done","reason":"gone","sentence":null}"#), "a reason with done")
        XCTAssertNil(decodes(#"{"verb":"remove","write":"\#(id)","outcome":"refused","reason":"","sentence":"s."}"#), "an empty reason")
        XCTAssertNil(decodes(#"{"verb":"remove","write":"\#(id)","outcome":"refused","reason":null,"sentence":"s."}"#), "refused with no reason")
        XCTAssertNil(decodes(#"{"verb":"remove","write":"\#(id)","outcome":"failed","reason":null,"sentence":null}"#), "failed with no sentence")
        XCTAssertNil(decodes(#"{"verb":"remove","write":"\#(id)","outcome":"done","reason":null}"#), "a field left out")
        XCTAssertNil(decodes(#"{"verb":"remove","write":"\#(id)","outcome":"maybe","reason":null,"sentence":null}"#), "an outcome outside the four")
        let malformed = decodes(#"{"verb":"remove","write":"","outcome":"refused","reason":"malformed","sentence":"s."}"#)
        XCTAssertEqual(malformed?.echoesNoId, true)
        XCTAssertEqual(decodes(#"{"verb":"remove","write":"","outcome":"refused","reason":"gone","sentence":"s."}"#)?.echoesNoId, false)
    }

    /// Clause (D49): the session answer carries the Mac's own Remove words
    /// when it offers Remove, read strictly when present; absent (a Mac older
    /// than 348, a session not ended, an Allow that waits) reads as no
    /// Remove, and the drawing carries what the answer did.
    func testTheSessionCarriesTheMacsRemoveWords() throws {
        // The SHIPPING door's own bytes for a session (build/p316/vectors.mjs),
        // with the key taken out, then written as a Mac of this phase writes it.
        let v = try DoorVectorFile.load()
        let talk = try XCTUnwrap(v.answers["session-talk"], "vectors.json holds no session answer").json
        var object = try XCTUnwrap(try JSONSerialization.jsonObject(with: Data(talk.utf8)) as? [String: Any])
        var session = try XCTUnwrap(object["session"] as? [String: Any])
        func read() throws -> PocketSessionAnswer {
            object["session"] = session
            return try JSONDecoder().decode(PocketSessionAnswer.self, from: try JSONSerialization.data(withJSONObject: object))
        }
        session["removeConfirm"] = nil
        XCTAssertNil(try read().session.removeConfirm, "a Mac older than 348 offers Remove")
        XCTAssertNil(try SessionDrawing(try read().session).removeConfirm)
        session["removeConfirm"] = ["title": Self.confirm.title, "body": Self.confirm.body, "confirmLabel": Self.confirm.confirmLabel]
        XCTAssertEqual(try read().session.removeConfirm, Self.confirm)
        XCTAssertEqual(try SessionDrawing(try read().session).removeConfirm, Self.confirm)
        session["removeConfirm"] = ["title": Self.confirm.title]
        XCTAssertThrowsError(try read(), "half a confirmation drew")
        session["removeConfirm"] = "Remove"
        XCTAssertThrowsError(try read(), "a confirmation that is not the Mac's three words drew")
    }

    // MARK: The client's half (D28, D55)

    private func encoded<T: Encodable>(_ body: T) throws -> String {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.sortedKeys]
        return String(decoding: try encoder.encode(body), as: UTF8.self)
    }

    /// Clause (D28): the body is exactly `session` and `write`, sorted, and
    /// its worst is far under the door's cap of 512.
    func testTheBodyIsExactlyItsTwoKeys() throws {
        XCTAssertEqual(try encoded(RemoveBody(session: "s-1", write: id)), #"{"session":"s-1","write":"00112233445566778899aabbccddeeff"}"#)
        let worst = try encoded(RemoveBody(session: String(repeating: "x", count: 128), write: id))
        XCTAssertLessThanOrEqual(worst.utf8.count, 512)
        XCTAssertEqual(DoorClient.removeTarget, "/v1/remove")
        XCTAssertEqual(WriteRoute.remove(session: "s").target, DoorClient.removeTarget)
        XCTAssertNil(WriteRoute.remove(session: "s").verb, "a Remove names no session write's verb")
    }

    private func reply(_ status: Int, _ json: String, handed: Bool = true) -> ExchangeEnd {
        ExchangeEnd(result: .success(DoorReply(status: status, body: Data(json.utf8))), handed: handed)
    }

    /// Clause (D55): one exchange's end is read as a Remove's result exactly
    /// as a start's is: a 200 is an answer only when it names the remove and
    /// echoes this write's id (or `""` with `malformed`); a 404 is the door's
    /// refusal; a failure before the bytes were handed is not sent, after it
    /// no answer; anything else no answer.
    func testTheResultIsClassifiedAsAStartsIs() {
        let done = #"{"verb":"remove","write":"\#(id)","outcome":"done","reason":null,"sentence":null}"#
        XCTAssertEqual(RemoveResult.of(reply(200, done), sent: id), .answered(answer(.done)))
        XCTAssertEqual(RemoveResult.of(reply(200, done), sent: "ffeeddccbbaa99887766554433221100"), .noAnswer, "another write's echo")
        XCTAssertEqual(RemoveResult.of(reply(200, #"{"verb":"end","write":"\#(id)","outcome":"done","reason":null,"sentence":null}"#), sent: id), .noAnswer)
        let malformed = #"{"verb":"remove","write":"","outcome":"refused","reason":"malformed","sentence":"s."}"#
        XCTAssertEqual(RemoveResult.of(reply(200, malformed), sent: id), .answered(answer(.refused, reason: "malformed", sentence: "s.", write: "")))
        XCTAssertEqual(RemoveResult.of(reply(200, "not json"), sent: id), .noAnswer)
        XCTAssertEqual(RemoveResult.of(reply(404, ""), sent: id), .notTaken)
        XCTAssertEqual(RemoveResult.of(reply(500, ""), sent: id), .noAnswer)
        XCTAssertEqual(RemoveResult.of(ExchangeEnd(result: .failure(DoorFailure.unreachable(code: 61)), handed: false), sent: id), .notSent(.unreachable(code: 61)))
        XCTAssertEqual(RemoveResult.of(ExchangeEnd(result: .failure(DoorFailure.cancelled), handed: false), sent: id), .notSent(.cancelled))
        XCTAssertTrue(RemoveResult.notSent(.cancelled).withheld)
        XCTAssertEqual(RemoveResult.of(ExchangeEnd(result: .failure(DoorFailure.timedOut), handed: true), sent: id), .noAnswer)
        XCTAssertEqual(PostEnd.notSent(.notPaired, write: nil).asRemove, .notSent(.notPaired))
        XCTAssertEqual(PostEnd.ended(reply(404, ""), write: id).asRemove, .notTaken)
    }

    // MARK: The shape, read from the source (D33, rules ac and ad)

    /// Clause (D7, D33, rule ac): nothing on Remove's path names an owner
    /// check, Face ID or the passcode: Remove.swift, the ⋯'s control and its
    /// ToolbarContent, Catch Me Up's page, and the menu's Remove item.
    func testNothingOnRemovesPathNamesAnOwnerCheck() throws {
        let remove = try StyleSource.text("ios/Tortie/Screens/Remove.swift")
        for refused in ["OwnerCheck", "ownerCheck", "LAContext", "evaluatePolicy", "LocalAuthentication", "confirm(reason:", "faceid", "touchid"] {
            XCTAssertFalse(remove.contains(refused), "Remove.swift names \(refused)")
        }
        for start in ["struct TerminalMenu: ToolbarContent {", "struct TerminalMenuControl: View {", "struct CatchUpPage: View {"] {
            let body = try span("ios/Tortie/Screens/SessionScreen.swift", start)
            for refused in ["OwnerCheck", "ownerCheck", "LAContext", "evaluatePolicy", "confirm(reason:"] {
                XCTAssertFalse(body.contains(refused), "\(start) names \(refused)")
            }
        }
    }

    /// Clause (D5, D33): the Mac's confirmation is written ONCE in Remove.swift,
    /// word for word (its title, its destructive press, Cancel, its body), and
    /// the destructive press is `RemoveModel.press` and nothing before it;
    /// both Removes apply it.
    func testTheConfirmationIsTheMacsWordsOnce() throws {
        let remove = try StyleSource.text("ios/Tortie/Screens/Remove.swift")
        XCTAssertEqual(remove.components(separatedBy: ".confirmationDialog(").count, 2, "Remove.swift does not hold exactly one confirmation")
        let modifier = try span("ios/Tortie/Screens/Remove.swift", "struct RemoveConfirmation: ViewModifier {")
        XCTAssertTrue(modifier.contains(".confirmationDialog(drawing?.confirm?.title ?? Copy.remove, isPresented: $isPresented, titleVisibility: .visible) {"))
        XCTAssertTrue(modifier.contains("Button(shown.confirmLabel, role: .destructive) {\n                        model.press(reread: reread)\n                    }"))
        XCTAssertTrue(modifier.contains("Button(Copy.cancel, role: .cancel) {}"))
        XCTAssertTrue(modifier.contains("Text(verbatim: shown.body)"))
        let top = try span("ios/Tortie/Screens/Remove.swift", "struct RemoveTopControl: View {")
        XCTAssertTrue(top.contains(".removeConfirmation(model: model, drawing: drawing, isPresented: $asking, reread: reread)"))
        XCTAssertTrue(top.contains(".accessibilityIdentifier(ID.sessionRemove)"))
        XCTAssertTrue(top.contains("Words(Copy.remove, .body, drawing.row == .on ? Tokens.error : Tokens.textMuted)"), "Remove is not the Mac's word in the error colour")
        XCTAssertFalse(top.contains("Image(systemName"), "Remove at the top right draws a glyph")
        let control = try span("ios/Tortie/Screens/SessionScreen.swift", "struct TerminalMenuControl: View {")
        XCTAssertTrue(control.contains(".removeConfirmation(model: end?.remove, drawing: removal, isPresented: $removeAsked, reread: reread)"))
        let item = try span("ios/Tortie/Screens/Remove.swift", "struct RemoveMenuItem: View {")
        XCTAssertTrue(item.contains("Button(Copy.remove, role: .destructive) {\n            ask()\n        }"), "the menu's Remove is not the Mac's word alone, destructive")
        XCTAssertFalse(item.contains("systemImage"), "the menu's Remove draws a mark beside its word")
        XCTAssertTrue(item.contains(".disabled(drawing.row == .off)\n        .accessibilityIdentifier(ID.terminalMenuRemove)"))
        for path in ["ios/Tortie/Screens/SessionScreen.swift", "ios/Tortie/Screens/ConversationScreen.swift", "ios/Tortie/Screens/Screen.swift"] {
            XCTAssertFalse(try StyleSource.text(path).contains("confirmationDialog"), "\(path) holds a confirmation of its own")
        }
    }

    /// Clause (D33): the ⋯ draws Remove in End session…'s place (End's item
    /// when End is drawn, else Remove's), and Catch Me Up draws Remove at its
    /// top right from the session's own newest answer.
    func testRemoveTakesEndsPlaceOnBothFaces() throws {
        let control = try span("ios/Tortie/Screens/SessionScreen.swift", "struct TerminalMenuControl: View {")
        let end = try XCTUnwrap(control.range(of: "EndMenuItem(row: row, drawing: drawing) {"))
        let otherwise = try XCTUnwrap(control.range(of: "} else if let removal {", range: end.upperBound..<control.endIndex))
        let remove = try XCTUnwrap(control.range(of: "RemoveMenuItem(drawing: removal) {", range: otherwise.upperBound..<control.endIndex))
        XCTAssertLessThan(end.lowerBound, remove.lowerBound)
        XCTAssertTrue(control.contains("guard removal.confirm != nil else { return }\n                        removeAsked = true"))
        let page = try span("ios/Tortie/Screens/SessionScreen.swift", "struct CatchUpPage: View {")
        XCTAssertTrue(page.contains("RemoveTopItem(model: end?.remove, offer: session.latest?.end ?? PocketEndOffer.none, confirm: session.latest?.removeConfirm) { await session.load() }"))
        let terminal = try span("ios/Tortie/Screens/SessionScreen.swift", "struct TerminalPage: View {")
        XCTAssertTrue(terminal.contains("removeConfirm: drawing.removeConfirm"), "the Terminal's ⋯ is not handed the Mac's Remove words")
        let item = try span("ios/Tortie/Screens/Remove.swift", "struct RemoveTopItem: ToolbarContent {")
        let drawn = try XCTUnwrap(item.range(of: "if let model, let drawing = RemoveDrawing.of(model, offer: offer, confirm: confirm) {"), "Remove's item is not behind its drawing")
        let placed = try XCTUnwrap(item.range(of: "ToolbarItem(placement: .topBarTrailing) {"), "Remove is not at the top right")
        XCTAssertLessThan(drawn.lowerBound, placed.lowerBound, "an empty item stands beside End on a live session")
        XCTAssertEqual(item.components(separatedBy: "ToolbarItem(").count, 2)
    }

    /// Clause (D55, rule ab): the remover's `remove(` is called ONCE in the
    /// app, in `RemoveRunner.run`, never in a loop.
    func testTheRemoversOneCallerIsTheRunner() throws {
        let remove = try StyleSource.text("ios/Tortie/Screens/Remove.swift")
        XCTAssertEqual(remove.components(separatedBy: "remover.remove(").count, 2)
        let run = try XCTUnwrap(remove.range(of: "func run() async -> RemoveResult? {"))
        let call = try XCTUnwrap(remove.range(of: "remover.remove(target)"))
        XCTAssertLessThan(run.lowerBound, call.lowerBound)
        XCTAssertFalse(String(remove[run.lowerBound..<call.lowerBound]).contains("for "), "the write is in a loop")
    }

    // MARK: Words and names (sections 5.2, 5.3)

    /// Clause: Remove's two words are the Mac's `Remove` and the phone's
    /// not-removed line, and its three names are the spec's.
    func testTheWordsAndTheNames() {
        XCTAssertEqual(Copy.remove, "Remove")
        XCTAssertEqual(Copy.removeNotTaken, "Your Mac did not remove it. Nothing was changed.")
        XCTAssertEqual(ID.sessionRemove, "session-remove")
        XCTAssertEqual(ID.terminalMenuRemove, "terminal-menu-remove")
        XCTAssertEqual(ID.removeWriting, "remove-writing")
    }

    // MARK: Helpers

    private func span(_ path: String, _ start: String) throws -> String {
        let text = try StyleSource.text(path)
        let head = try XCTUnwrap(text.range(of: start), "\(path) declares no \(start)")
        let close = try XCTUnwrap(text.range(of: "\n}\n", range: head.upperBound..<text.endIndex))
        return String(text[head.lowerBound..<close.upperBound])
    }

    private func until(_ condition: () async -> Bool) async throws {
        for _ in 0..<5_000 {
            if await condition() { return }
            try await Task.sleep(nanoseconds: 1_000_000)
        }
        XCTFail("the condition never held")
    }
}

/// The Mac's answers to a Remove, scripted, and every Remove asked, in order.
actor ScriptedRemover: DoorRemoving {
    private var results: [RemoveResult]
    private(set) var asked: [String] = []
    private let during: (@Sendable (String) async -> Void)?

    init(results: [RemoveResult] = [], during: (@Sendable (String) async -> Void)? = nil) {
        self.results = results
        self.during = during
    }

    func remove(_ sessionId: String) async -> RemoveResult {
        asked.append(sessionId)
        await during?(sessionId)
        return results.isEmpty ? .noAnswer : results.removeFirst()
    }

    var count: Int { asked.count }
}

/// The app's Remove registry, for a test with no app: every runner made, the
/// ones still live, and (when asked) each one stopped as it is registered,
/// which is what a trip to the background does to a live runner.
@MainActor
final class RemoveRecord: RemoveRegistry {
    private(set) var made: [RemoveRunner] = []
    private(set) var live: [RemoveRunner] = []
    private let stopsAtRegistration: Bool

    init(stopsAtRegistration: Bool = false) {
        self.stopsAtRegistration = stopsAtRegistration
    }

    func registerRemove(_ runner: RemoveRunner) {
        made.append(runner)
        live.append(runner)
        if stopsAtRegistration { runner.stop() }
    }

    func releaseRemove(_ runner: RemoveRunner) {
        live.removeAll { $0 === runner }
    }
}

/// Where a read meant the screen belongs, counted.
@MainActor
final class RoutingLog {
    private(set) var back = 0
    private(set) var pairs = 0

    var routing: ReadRouting {
        ReadRouting(backToList: { [weak self] in self?.back += 1 }, pairAgain: { [weak self] in self?.pairs += 1 })
    }
}
