import Foundation
import XCTest
@testable import Tortie

/// End these (Phase 317, build/p317/SPEC.md section 5.8.4): the Mac sheet's
/// confirmation in its order, the targets fixed at it, each door reason as the
/// Mac batch's outcome word, and a run that only shrinks. The Mac and iOS are
/// scripts (EndFakes.swift). Each test names the clause it holds, and each
/// fails when that clause is taken out of Screens/EndBatch.swift,
/// Screens/EndBar.swift or Style/Copy.swift.
@MainActor
final class EndBatchTests: XCTestCase {
    private func rows(_ rows: [PocketBlockedRow]) -> [RowDrawing] {
        rows.map { RowDrawing($0, waiting: false) }
    }

    /// The Sessions tab's rows: two running, one ended.
    private var three: [RowDrawing] {
        rows([
            WriteAnswers.row("a", end: .offered(batch: true)),
            WriteAnswers.row("b", end: .none, title: "Ended"),
            WriteAnswers.row("c", end: .offered(batch: true))
        ])
    }

    // MARK: The confirmation

    /// Clause (F4): the Mac sheet's order: its body FIRST, then the targets'
    /// names one per line, then the skipped line; the title and the press
    /// count the targets alone.
    func testTheConfirmationIsTheMacSheetsInItsOrder() throws {
        let confirm = try XCTUnwrap(BatchConfirm.of(selected: ["a", "b", "c"], rows: three))
        XCTAssertEqual(confirm.heading, "End 2 running sessions?")
        XCTAssertEqual(confirm.confirmLabel, "End 2 sessions")
        XCTAssertEqual(confirm.message.components(separatedBy: "\n"), [
            Copy.batchBody(false),
            "a",
            "c",
            "1 selected session stays unchanged: 1 already ended"
        ])
    }

    /// Clause (F19): a row skipped at the confirmation is counted in the
    /// skipped line and is NOT a target; the targets are in drawn order.
    func testASkippedRowIsNoTarget() throws {
        let confirm = try XCTUnwrap(BatchConfirm.of(selected: ["c", "b", "a"], rows: three))
        XCTAssertEqual(confirm.targets, ["a", "c"])
    }

    /// Clause (D14): a target on another machine says the remote tail; a row
    /// on a machine Tortie holds no row for (offered, but not to a batch) is
    /// skipped `unreachable`, as is a row Tortie cannot see; a selected row no
    /// longer on the list is `no longer here`.
    func testTheRemoteTailAndTheSkipReasons() throws {
        let drawn = rows([
            WriteAnswers.row("far", end: .offered(batch: true), machine: "studio-pro"),
            WriteAnswers.row("lost", end: .offered(batch: false), machine: "gone-mac"),
            WriteAnswers.row("dark", end: .unreachable(title: "Tortie cannot see whether this session is running, so it cannot end it."))
        ])
        let confirm = try XCTUnwrap(BatchConfirm.of(selected: ["far", "lost", "dark", "left"], rows: drawn))
        let lines = confirm.message.components(separatedBy: "\n")
        XCTAssertEqual(lines.first, Copy.batchBody(true))
        XCTAssertTrue(Copy.batchBody(true).hasPrefix(Copy.batchBody(false)))
        XCTAssertEqual(lines.last, "3 selected sessions stay unchanged: 2 unreachable, 1 no longer here")
        XCTAssertEqual(confirm.targets, ["far"])
        XCTAssertEqual(confirm.heading, "End 1 running session?")
    }

    /// Clause: with no row a batch may end, there is no confirmation.
    func testNoTargetNoConfirmation() {
        XCTAssertNil(BatchConfirm.of(selected: ["b"], rows: three))
        XCTAssertNil(BatchConfirm.of(selected: [], rows: three))
    }

    // MARK: The words

    /// Clause (F19): the door's reason becomes the Mac batch's outcome word,
    /// `removed` included (the Mac batch reads a discarded row as gone), and
    /// a withheld write is `Not run` because it was never sent.
    func testEveryReasonIsTheMacBatchsWord() {
        func refused(_ reason: PocketWriteAnswer.Reason, _ sentence: String = "s.") -> EndStep {
            .wrote(.answered(WriteAnswers.answer(.refused, reason: reason, sentence: sentence)))
        }
        XCTAssertEqual(EndBatchModel.word(.ending), "Ending…")
        XCTAssertEqual(EndBatchModel.word(.wrote(WriteAnswers.done)), "Ended")
        XCTAssertEqual(EndBatchModel.word(refused(.ended)), "Already ended")
        XCTAssertEqual(EndBatchModel.word(refused(.unreachable)), "Unreachable")
        XCTAssertEqual(EndBatchModel.word(refused(.gone)), "No longer here")
        XCTAssertEqual(EndBatchModel.word(refused(.removed)), "No longer here")
        XCTAssertEqual(
            EndBatchModel.word(refused(.malformed, "Your Mac could not read that request. Nothing was done.")),
            "Not ended. Your Mac could not read that request. Nothing was done."
        )
        XCTAssertEqual(
            EndBatchModel.word(.wrote(WriteAnswers.busy)),
            "Not ended. Tortie is still doing the last thing you asked from this phone. Nothing was done."
        )
        XCTAssertEqual(
            EndBatchModel.word(.wrote(.answered(WriteAnswers.answer(.failed, sentence: "Tortie could not end this session.")))),
            "Not ended. Tortie could not end this session."
        )
        XCTAssertEqual(EndBatchModel.word(.wrote(.noAnswer)), "No answer")
        XCTAssertEqual(EndBatchModel.word(.wrote(.notTaken)), "Not ended. Your Mac did not end it. Nothing was changed.")
        XCTAssertEqual(EndBatchModel.word(.wrote(.notSent(.cancelled))), "Not run")
        XCTAssertEqual(EndBatchModel.word(.wrote(.notSent(.unreachable(code: 61)))), "Not ended. Tortie could not reach your Mac.")
        XCTAssertEqual(EndBatchModel.word(.notRun), "Not run")
    }

    // MARK: The run

    private func model(
        _ writer: any DoorWriting,
        owner: ScriptedOwnerCheck? = nil,
        registry: (any EndRunnerRegistry)? = nil
    ) -> EndBatchModel {
        EndBatchModel(setup: EndBatchSetup(writer: writer, ownerCheck: owner ?? ScriptedOwnerCheck(), registry: registry ?? RunnerRecord()))
    }

    /// Clause: Select, tick, the press: one Face ID with the press's words,
    /// then one `batch` write per target in drawn order, each target its word,
    /// and the heading `E of N sessions ended`.
    func testTheRunEndsEachTargetInTurn() async throws {
        let writer = ScriptedWriter(ends: [WriteAnswers.done, WriteAnswers.ended])
        let owner = ScriptedOwnerCheck(answers: [.confirmed])
        let batch = model(writer, owner: owner)
        batch.select()
        for id in ["c", "b", "a"] { batch.toggle(id) }
        let confirm = try XCTUnwrap(BatchConfirm.of(selected: batch.selected, rows: three))
        batch.press(confirm)
        XCTAssertEqual(batch.phase, .confirming)
        await batch.pressing?.value
        let asked = await writer.ends
        XCTAssertEqual(asked.map(\.session), ["a", "c"])
        XCTAssertEqual(asked.map(\.batch), [true, true])
        XCTAssertEqual(owner.asked, ["End 2 sessions"])
        XCTAssertEqual(batch.phase, .done)
        XCTAssertEqual(batch.word(for: "a"), "Ended")
        XCTAssertEqual(batch.word(for: "c"), "Already ended")
        XCTAssertNil(batch.word(for: "b"), "a row skipped at the confirmation got an outcome word")
        XCTAssertEqual(batch.heading, "1 of 2 sessions ended")
        batch.finish()
        XCTAssertEqual(batch.phase, .off)
        XCTAssertTrue(batch.selected.isEmpty)
    }

    /// Clause: cancelled or failed, nothing is sent, the bar says so, and the
    /// selection stays.
    func testNotConfirmedSendsNothing() async throws {
        let writer = ScriptedWriter(ends: [WriteAnswers.done])
        let batch = model(writer, owner: ScriptedOwnerCheck(answers: [.notConfirmed]))
        batch.select()
        batch.toggle("a")
        batch.press(try XCTUnwrap(BatchConfirm.of(selected: batch.selected, rows: three)))
        await batch.pressing?.value
        let sent = await writer.endCount
        XCTAssertEqual(sent, 0)
        XCTAssertEqual(batch.line, Copy.endNotConfirmed)
        XCTAssertEqual(batch.phase, .selecting)
        XCTAssertEqual(batch.selected, ["a"])
    }

    /// Clause (D15, ad): leaving the app during the run stops it: the write in
    /// flight runs to its end, nothing after it is sent, and every target it
    /// did not reach reads `Not run`.
    func testLeavingDuringTheRunStopsIt() async throws {
        let app = AppModel(door: StandInPhone(), label: "iPhone", alerts: StandInAlerts(), ownerCheck: ScriptedOwnerCheck())
        let writer = ScriptedWriter(ends: [WriteAnswers.done, WriteAnswers.done, WriteAnswers.done]) { id in
            if id == "a" { await MainActor.run { app.wentAway() } }
        }
        let drawn = rows([
            WriteAnswers.row("a", end: .offered(batch: true)),
            WriteAnswers.row("b", end: .offered(batch: true)),
            WriteAnswers.row("c", end: .offered(batch: true))
        ])
        let batch = model(writer, registry: app)
        batch.select()
        for id in ["a", "b", "c"] { batch.toggle(id) }
        batch.press(try XCTUnwrap(BatchConfirm.of(selected: batch.selected, rows: drawn)))
        await batch.pressing?.value
        let sent = await writer.endedIds
        XCTAssertEqual(sent, ["a"])
        XCTAssertEqual(batch.word(for: "a"), "Ended")
        XCTAssertEqual(batch.word(for: "b"), "Not run")
        XCTAssertEqual(batch.word(for: "c"), "Not run")
        XCTAssertEqual(batch.heading, "1 of 3 sessions ended")
        XCTAssertTrue(app.liveRunners.isEmpty)
    }

    /// Clause: `Stop` starts no further write.
    func testStopStartsNoFurtherWrite() async throws {
        let holder = BatchHolder()
        let writer = ScriptedWriter(ends: [WriteAnswers.done, WriteAnswers.done]) { _ in
            await MainActor.run { holder.batch?.stop() }
        }
        let batch = model(writer)
        holder.batch = batch
        batch.select()
        batch.toggle("a")
        batch.toggle("c")
        batch.press(try XCTUnwrap(BatchConfirm.of(selected: batch.selected, rows: three)))
        await batch.pressing?.value
        let sent = await writer.endedIds
        XCTAssertEqual(sent, ["a"])
        XCTAssertEqual(batch.word(for: "c"), "Not run")
    }

    /// Clause: rows open their session until Select, toggle while selecting,
    /// and Cancel goes back with nothing selected.
    func testSelectToggleCancel() {
        let batch = model(ScriptedWriter())
        XCTAssertFalse(batch.takesTaps)
        batch.toggle("a")
        XCTAssertTrue(batch.selected.isEmpty, "a row toggled before Select")
        batch.select()
        XCTAssertTrue(batch.takesTaps)
        batch.toggle("a")
        batch.toggle("c")
        batch.toggle("a")
        XCTAssertEqual(batch.selected, ["c"])
        batch.cancel()
        XCTAssertFalse(batch.takesTaps)
        XCTAssertTrue(batch.selected.isEmpty)
    }
}

/// Lets a scripted Mac reach the batch it answers.
@MainActor
private final class BatchHolder {
    var batch: EndBatchModel?
}
