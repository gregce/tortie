import Foundation
import XCTest
@testable import Tortie

/// The Screen's key sender (Phase 337, build/p337/SPEC.md D17, D29, D30,
/// §Attack A1 and A5): what is gathered, how fast it goes, the caps, a named
/// key alone in its write, the lock inside a question read off the TURN (the
/// race in which the poll's picture lands before the keys answer included),
/// `changed` waiting for a new revision, leaving the app, and no owner check.
/// The door and the clock are scripts; nothing reaches a network. Each test
/// names the clause it holds and fails when that clause is taken out of
/// Screens/ScreenKeys.swift.
@MainActor
final class ScreenKeysTests: XCTestCase {
    private var door: ScriptedScreenDoor!
    private var drawn: ScreenPicture?
    private var clock = ContinuousClock.now

    override func setUp() async throws {
        door = ScriptedScreenDoor()
        drawn = ScreenSample.picture()
        clock = ContinuousClock.now
    }

    private func sender() -> ScreenKeySender {
        ScreenKeySender(
            door: door,
            picture: { [unowned self] in self.drawn },
            now: { [unowned self] in self.clock },
            sleep: { _ in try? await Task.sleep(nanoseconds: 10_000_000) }
        )
    }

    /// Let the sender's tasks and the door's run: a sleep, which lets every
    /// task waiting on the main actor take its turn, then a few yields.
    private func settle() async {
        try? await Task.sleep(nanoseconds: 30_000_000)
        for _ in 0..<5 { await Task.yield() }
    }

    private func done(_ write: String = "0123456789abcdef0123456789abcdef") -> WriteResult {
        .answered(PocketWriteAnswer(verb: .keys, write: write, outcome: .done, reason: nil, sentence: nil))
    }

    private var changedAnswer: WriteResult {
        .answered(PocketWriteAnswer(
            verb: .keys, write: "0123456789abcdef0123456789abcdef", outcome: .refused, reason: .changed,
            sentence: "The question on this session changed since your screen was drawn. Nothing was typed."
        ))
    }

    /// Clause: one write in flight; keys typed while it is out are gathered
    /// and go in the NEXT write, outside a question.
    func testOneWriteInFlightAndTheRestGathered() async {
        let keys = sender()
        keys.send([.text("a")])
        await settle()
        XCTAssertEqual(door.asked.count, 1)
        keys.send([.text("b")])
        keys.send([.text("c")])
        await settle()
        XCTAssertEqual(door.asked.count, 1, "a second write while one is out")
        XCTAssertEqual(keys.pending, [.text("b"), .text("c")])
        clock = clock.advanced(by: .milliseconds(150))
        door.answer(done())
        await settle()
        XCTAssertEqual(door.asked.map(\.keys), [[.text("a")], [.text("b"), .text("c")]])
    }

    /// Clause (D30): at most one write started every 0.1 s.
    func testAtMostOneWriteEveryTenthOfASecond() async {
        XCTAssertGreaterThanOrEqual(ScreenKeySender.minGap, .milliseconds(100))
        let keys = sender()
        keys.send([.text("a")])
        await settle()
        door.answer(done())
        await settle()
        keys.send([.text("b")])
        await settle()
        XCTAssertEqual(door.asked.count, 1, "a write started within the gap")
        clock = clock.advanced(by: .milliseconds(100))
        try? await Task.sleep(nanoseconds: 40_000_000)
        await settle()
        XCTAssertEqual(door.asked.count, 2, "the write after the gap")
    }

    /// Clause (D17, §Attack A1): a named key other than Backspace is the only
    /// item of its write; text and Backspace go together.
    func testANamedKeyGoesAlone() async {
        let keys = sender()
        keys.send([.text("a")])
        await settle()
        keys.send([.key(.escape), .text("b"), .key(.backspace), .text("c"), .key(.enter)])
        for _ in 0..<4 {
            clock = clock.advanced(by: .milliseconds(150))
            door.answer(done())
            await settle()
        }
        XCTAssertEqual(door.asked.map(\.keys), [
            [.text("a")], [.key(.escape)], [.text("b"), .key(.backspace), .text("c")], [.key(.enter)],
        ])
    }

    /// Clause (D30): at most 64 items and 1,024 bytes of text a write; a text
    /// longer than the cap is split at characters.
    func testTheCaps() async {
        XCTAssertEqual(ScreenKeySender.mostItems, 64)
        XCTAssertEqual(ScreenKeySender.mostTextBytes, 1_024)
        let keys = sender()
        keys.send([.text("x")])
        await settle()
        keys.send(Array(repeating: KeyItem.text("a"), count: 70))
        clock = clock.advanced(by: .milliseconds(150))
        door.answer(done())
        await settle()
        XCTAssertEqual(door.asked.last?.keys.count, 64)
        let long = KeyItem.text(String(repeating: "b", count: 1_500))
        let split = ScreenKeySender.withinCap(long)
        XCTAssertEqual(split.map(\.textBytes), [1_024, 476])
        XCTAssertEqual(ScreenKeySender.withinCap(.key(.up)), [.key(.up)])
    }

    /// Clause (D29): inside a question, after a batch answered `done`, keys
    /// are NOT sent against a picture still carrying the turn that batch
    /// carried, and the line says so; a picture with a new turn releases it.
    func testInsideAQuestionOneBatchPerPictureByTheTurn() async {
        drawn = ScreenSample.picture(turn: "0123456789abcdef-1", asking: true, dialog: "a1b2c3d4e5f6")
        let keys = sender()
        keys.send([.key(.down)])
        await settle()
        keys.send([.key(.down)])
        XCTAssertEqual(keys.line, Copy.screenWaitForRedraw, "a key while the write is out")
        clock = clock.advanced(by: .milliseconds(150))
        door.answer(done())
        await settle()
        keys.send([.key(.down)])
        await settle()
        XCTAssertEqual(door.asked.count, 1, "a key sent against the spent picture")
        XCTAssertEqual(keys.line, Copy.screenWaitForRedraw)
        drawn = ScreenSample.picture(revision: "bbbbbbbbbbbb", turn: "0123456789abcdef-2", asking: true, dialog: "a1b2c3d4e5f6")
        keys.pictureChanged()
        XCTAssertNil(keys.line, "the redraw clears the line")
        keys.send([.key(.down)])
        await settle()
        XCTAssertEqual(door.asked.count, 2)
        XCTAssertEqual(door.asked.map(\.turn), ["0123456789abcdef-1", "0123456789abcdef-2"])
        XCTAssertEqual(door.asked.last?.dialog, "a1b2c3d4e5f6")
    }

    /// Clause (§Attack A5): the poll's picture of the new turn lands BEFORE
    /// the keys answer, and the next batch still goes against it: the lock is
    /// the turn, never which answer arrived first.
    func testThePollsPictureBeforeTheAnswerReleasesTheLock() async {
        drawn = ScreenSample.picture(turn: "0123456789abcdef-1", asking: true, dialog: "a1b2c3d4e5f6")
        let keys = sender()
        keys.send([.key(.down)])
        await settle()
        drawn = ScreenSample.picture(revision: "cccccccccccc", turn: "0123456789abcdef-2", asking: true, dialog: "a1b2c3d4e5f6")
        keys.pictureChanged()
        clock = clock.advanced(by: .milliseconds(150))
        door.answer(done())
        await settle()
        keys.send([.key(.down)])
        await settle()
        XCTAssertEqual(door.asked.count, 2, "the lock waited for a picture that had already landed")
    }

    /// Clause (D29): after `changed`, keys wait for a picture whose revision
    /// is not the refused batch's, and the line is the Mac's own sentence.
    func testChangedWaitsForANewRevision() async {
        drawn = ScreenSample.picture(revision: "aaaaaaaaaaaa", turn: "0123456789abcdef-1", asking: true, dialog: "a1b2c3d4e5f6")
        let keys = sender()
        keys.send([.key(.enter)])
        await settle()
        clock = clock.advanced(by: .milliseconds(150))
        door.answer(changedAnswer)
        await settle()
        XCTAssertEqual(keys.line, DoorWords.keysSentence(for: changedAnswer))
        keys.send([.key(.enter)])
        await settle()
        XCTAssertEqual(door.asked.count, 1, "a key against the refused picture")
        drawn = ScreenSample.picture(revision: "dddddddddddd", turn: "0123456789abcdef-1", asking: true, dialog: "a1b2c3d4e5f6")
        keys.pictureChanged()
        keys.send([.key(.enter)])
        await settle()
        XCTAssertEqual(door.asked.count, 2)
    }

    /// Clause: outside a question there is no lock: keys flow after `done`.
    func testOutsideAQuestionKeysFlow() async {
        let keys = sender()
        keys.send([.key(.down)])
        await settle()
        clock = clock.advanced(by: .milliseconds(150))
        door.answer(done())
        await settle()
        keys.send([.key(.down)])
        await settle()
        XCTAssertEqual(door.asked.count, 2)
    }

    /// Clause: a picture that takes no keys sends none and says so.
    func testAPictureThatTakesNoKeysSendsNone() async {
        drawn = ScreenSample.picture(typable: false)
        let keys = sender()
        keys.send([.text("a")])
        await settle()
        XCTAssertEqual(door.asked.count, 0)
        XCTAssertEqual(keys.line, Copy.screenCannotType)
    }

    /// Clause (D30): `wentAway` stops every live sender: the keys waiting
    /// are dropped, the write in flight is cancelled (withheld before its
    /// bytes were handed), and the door's kept connections close.
    func testWentAwayWithholdsAndDrops() async {
        let app = AppModel(door: StandInPhone(), label: "iPhone", alerts: StandInAlerts(), ownerCheck: ScriptedOwnerCheck())
        let keys = sender()
        app.registerKeys(keys)
        XCTAssertEqual(app.liveKeys.count, 1)
        keys.send([.text("a")])
        await settle()
        keys.send([.text("b")])
        app.wentAway()
        await settle()
        XCTAssertTrue(keys.stopped)
        XCTAssertEqual(keys.pending, [], "waiting keys are dropped")
        XCTAssertTrue(door.cancelledWhileAsked, "the write in flight was cancelled")
        XCTAssertGreaterThanOrEqual(door.closes, 1, "the kept connections close")
        keys.send([.text("c")])
        await settle()
        XCTAssertEqual(door.asked.count, 1, "nothing is sent after the app left")
        keys.resume()
        clock = clock.advanced(by: .milliseconds(150))
        keys.send([.text("d")])
        await settle()
        XCTAssertEqual(door.asked.last?.keys, [.text("d")], "back in the foreground, keys go again; nothing dropped comes back")
        app.releaseKeys(keys)
        XCTAssertEqual(app.liveKeys.count, 0)
    }

    /// Clause (his ruling 3): no key asks Face ID: nothing in the Screen's
    /// files names the owner check.
    func testNoKeyAsksTheOwnerCheck() throws {
        for file in ["Screens/ScreenKeys.swift", "Screens/ScreenKeyField.swift", "Screens/Screen.swift", "Screens/ScreenGrid.swift",
                     "Screens/ScreenSelection.swift", "Screens/ScreenRows.swift", "Screens/ScreenGlyphs.swift"] {
            let source = try StyleSource.text("ios/Tortie/" + file)
            for name in ["OwnerCheck", "ownerCheck", "LAContext", "LocalAuthentication", "confirm(reason"] {
                XCTAssertFalse(source.contains(name), "\(file) names \(name)")
            }
        }
    }

    /// Clause: nothing the sender holds is persisted.
    func testNothingIsPersisted() throws {
        let source = try StyleSource.text("ios/Tortie/Screens/ScreenKeys.swift")
        for name in ["UserDefaults", "@AppStorage", "FileManager", "SecItemAdd", "write(to:"] {
            XCTAssertFalse(source.contains(name), name)
        }
    }
}

/// A Screen door whose keys answer when the test says, and every write
/// asked, in order.
@MainActor
final class ScriptedScreenDoor: ScreenDoor {
    struct Asked: Equatable {
        let keys: [KeyItem]
        let turn: String
        let dialog: String?
    }

    private(set) var asked: [Asked] = []
    private(set) var closes = 0
    private(set) var cancelledWhileAsked = false
    private var waiting: [CheckedContinuation<WriteResult, Never>] = []
    var reads: [Result<PocketScreenAnswer, DoorFailure>] = []
    private(set) var sinces: [String?] = []

    nonisolated var writes: Bool { true }

    nonisolated func read(since: String?) async throws -> PocketScreenAnswer {
        try await MainActor.run {
            sinces.append(since)
            guard !reads.isEmpty else { throw DoorFailure.cancelled }
            return try reads.removeFirst().get()
        }
    }

    nonisolated func keys(_ keys: [KeyItem], turn: String, dialog: String?) async -> WriteResult {
        await withTaskCancellationHandler {
            await withCheckedContinuation { (continuation: CheckedContinuation<WriteResult, Never>) in
                Task { @MainActor in
                    self.asked.append(Asked(keys: keys, turn: turn, dialog: dialog))
                    self.waiting.append(continuation)
                }
            }
        } onCancel: {
            Task { @MainActor in
                self.cancelledWhileAsked = true
                self.answer(.notSent(.cancelled))
            }
        }
    }

    /// Answer the oldest write waiting.
    func answer(_ result: WriteResult) {
        guard !waiting.isEmpty else { return }
        waiting.removeFirst().resume(returning: result)
    }

    nonisolated func close() {
        Task { @MainActor in self.closes += 1 }
    }
}
