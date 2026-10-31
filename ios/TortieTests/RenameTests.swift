import Foundation
import XCTest
@testable import Tortie

/// Rename, on one session (Phase 349, build/p349/SPEC.md §4.4 step 5, D1, D8,
/// D9, D11, D20; his rulings "Only for End" and "No Face ID, just confirm"):
/// the sheet's model over a scripted renamer, the row's first read, the runner
/// every rename goes through, the line each result draws, and, read from the
/// source, that nothing on Rename's path names an owner check, that the
/// renamer's `rename(` has one caller, and that every runner is registered
/// before its task. The Mac is a script; nothing here reaches a network or
/// asks iOS anything. Each test names the clause it holds and fails when that
/// clause is taken out of Screens/SessionName.swift, Screens/Start.swift,
/// Screens/DoorWords.swift or Door/DoorClient.swift.
@MainActor
final class RenameTests: XCTestCase {
    private let id = "00112233445566778899aabbccddeeff"
    private let sessionId = "s-1"

    private func answer(_ outcome: PocketWriteAnswer.Outcome, reason: String? = nil, sentence: String? = nil, name: String? = nil, write: String? = nil) -> PocketRenameAnswer {
        PocketRenameAnswer(verb: PocketRenameAnswer.verbWord, write: write ?? id, outcome: outcome, reason: reason, sentence: sentence, name: name)
    }

    /// One session's detail as the door answers it, its name and its offer.
    private func detail(_ name: String, rename: Bool) -> PocketSessionAnswer {
        var row = Answers.row(sessionId, name: name)
        row.rename = rename
        return PocketSessionAnswer(session: Answers.detail(row), at: 1)
    }

    private func model(
        _ renamer: ScriptedRenamer, name: String = "fix-login", registry: RenameRecord? = RenameRecord(), readsFirst: Bool = false, sample: Bool = false
    ) -> RenameModel {
        RenameModel(sessionId: sessionId, name: name, renamer: renamer, registry: registry, readsFirst: readsFirst, sample: sample)
    }

    // MARK: Save follows the Mac's rule (D5, D11, bd8)

    /// Clause (D20, bd8): from the ⋯ nothing is read first; Save is off while
    /// the text is the held name (as bytes, once trimmed), while the Mac's
    /// rule refuses it, and on, otherwise.
    func testFromTheMenuSaveFollowsTheRuleAndTheHeldName() {
        let rename = model(ScriptedRenamer())
        XCTAssertEqual(rename.phase, .idle)
        XCTAssertTrue(rename.offered, "the ⋯ drew Rename over the latest detail")
        XCTAssertEqual(rename.text, "fix-login", "the name is prefilled whole")
        XCTAssertFalse(rename.canSave, "Save is on over the unchanged name")
        rename.text = "  fix-login\u{FEFF} "
        XCTAssertFalse(rename.canSave, "Save is on over the held name with only spaces around it")
        rename.text = "fix--auth"
        XCTAssertTrue(rename.canSave)
        for refused in ["", "   ", "\t", String(repeating: "a", count: NameRule.maxUnits + 1), "a\u{0001}b", "a\u{202E}b", "a\u{2028}b", "a\u{7F}b", "a\u{85}b"] {
            rename.text = refused
            XCTAssertFalse(rename.canSave, "Save is on over \(refused.unicodeScalars.map { String($0.value, radix: 16) })")
        }
        rename.text = String(repeating: "a", count: NameRule.maxUnits)
        XCTAssertTrue(rename.canSave, "120 units are the Mac's own cap, and pass")
        rename.text = "FIX-LOGIN"
        XCTAssertTrue(rename.canSave, "the held name is compared as bytes, never folded")
    }

    // MARK: A row's sheet reads first (D20)

    /// Clause (D20): opened from a row, the model reads the session first; Save
    /// stays off until that read came back with `rename` true; the WHOLE name
    /// the list clipped at 200 is put in the field and held.
    func testARowsSheetReadsTheWholeNameFirst() async throws {
        let whole = String(repeating: "n", count: 300)
        let clipped = String(whole.prefix(200))
        let renamer = ScriptedRenamer(sessions: [.success(detail(whole, rename: true))])
        let rename = model(renamer, name: clipped, readsFirst: true)
        XCTAssertEqual(rename.phase, .reading)
        XCTAssertFalse(rename.offered)
        rename.text = clipped + "x"
        XCTAssertFalse(rename.canSave, "Save is on before the first read came back")
        rename.text = clipped
        rename.readFirst(reread: { XCTFail("a read that came back reads no list") })
        await rename.reading?.value
        XCTAssertEqual(rename.phase, .idle)
        XCTAssertEqual(rename.text, whole, "the field holds the clipped name, not the whole one")
        XCTAssertEqual(rename.held, whole)
        XCTAssertTrue(rename.offered)
        let asked = await renamer.sessionsAsked
        XCTAssertEqual(asked, [sessionId])
        rename.readFirst(reread: {})
        await rename.reading?.value
        let again = await renamer.sessionsAsked
        XCTAssertEqual(again.count, 1, "the first read is read twice")
    }

    /// Clause (D20): a name he typed before the first read came back is kept;
    /// only the held name moves.
    func testWhatHeTypedBeforeTheReadIsKept() async {
        let gate = Latch()
        let renamer = ScriptedRenamer(sessions: [.success(detail("fix-login-whole", rename: true))], duringSession: { await gate.wait() })
        let rename = model(renamer, name: "fix-login", readsFirst: true)
        rename.readFirst(reread: {})
        rename.text = "his own"
        await gate.open()
        await rename.reading?.value
        XCTAssertEqual(rename.text, "his own")
        XCTAssertEqual(rename.held, "fix-login-whole")
        XCTAssertTrue(rename.canSave)
    }

    /// Clause (D20): a read that came back with Rename no longer offered keeps
    /// Save off; a read refused (the Mac lists the session no longer) closes
    /// the sheet and reads the list under it; any other failure draws its
    /// sentence and keeps Save off.
    func testAFirstReadThatOffersNothingKeepsSaveOff() async {
        let off = model(ScriptedRenamer(sessions: [.success(detail("fix-login", rename: false))]), readsFirst: true)
        off.readFirst(reread: {})
        await off.reading?.value
        off.text = "a new name"
        XCTAssertFalse(off.offered)
        XCTAssertFalse(off.canSave)
        XCTAssertNil(off.line)

        let gone = model(ScriptedRenamer(sessions: [.failure(.refused)]), readsFirst: true)
        var lists = 0
        gone.readFirst(reread: { lists += 1 })
        await gone.reading?.value
        XCTAssertEqual(gone.phase, .done, "a session the Mac no longer lists keeps the sheet up")
        XCTAssertEqual(lists, 1)

        let slow = model(ScriptedRenamer(sessions: [.failure(.timedOut)]), readsFirst: true)
        slow.readFirst(reread: { XCTFail("a read that timed out reads the list") })
        await slow.reading?.value
        XCTAssertEqual(slow.line, Copy.macDidNotAnswer)
        XCTAssertEqual(slow.phase, .idle)
        slow.text = "a new name"
        XCTAssertFalse(slow.canSave)
    }

    // MARK: Save (D8, D9, bd7)

    /// Clause (bd7, D9): Save makes ONE runner of the text exactly as typed,
    /// registers it with the app BEFORE its write, asks nothing first, writes
    /// once, and `done` closes the sheet and reads the session again; the
    /// runner is released after.
    func testSaveRegistersBeforeTheWriteThenDoneCloses() async throws {
        let latch = Latch()
        let renamer = ScriptedRenamer(results: [.answered(answer(.done, name: "fix--auth"))], during: { await latch.wait() })
        let registry = RenameRecord()
        let rename = model(renamer, registry: registry)
        rename.text = "  fix--auth "
        var rereads = 0
        rename.save(reread: { rereads += 1 })
        XCTAssertEqual(rename.phase, .writing)
        XCTAssertFalse(rename.canSave, "Save is on while its write runs")
        XCTAssertEqual(registry.made.count, 1, "the runner was not registered at the press")
        XCTAssertEqual(registry.made.first?.target, sessionId)
        XCTAssertEqual(registry.made.first?.name, "  fix--auth ", "the name sent is not his text as typed")
        try await until { await renamer.count == 1 }
        XCTAssertEqual(registry.live.count, 1, "the runner was released before its write answered")
        await latch.open()
        await rename.writing?.value
        XCTAssertEqual(rename.phase, .done)
        XCTAssertNil(rename.line)
        XCTAssertEqual(rename.held, "fix--auth", "the held name is not the one the Mac stored")
        XCTAssertEqual(rereads, 1)
        XCTAssertTrue(registry.live.isEmpty)
        let asked = await renamer.asked
        XCTAssertEqual(asked, [ScriptedRenamer.Ask(session: sessionId, name: "  fix--auth ")])
    }

    /// Clause (D8, rule v): every result says what is true of it: the Mac's
    /// own sentence for a refusal (an open word included), read again after;
    /// the phone's not-renamed line for a 404 and for a write withheld; End's
    /// no-answer line ONLY over a read of the session that came back; a
    /// failure before the bytes were handed its own sentence, and no read.
    /// The sheet stays up with his text in every one.
    func testEachResultSaysWhatIsTrue() async {
        let refused = answer(.refused, reason: "name", sentence: Copy.nameCharacter)
        let cases: [(RenameResult, Bool, String?, Int)] = [
            (.answered(refused), true, Copy.nameCharacter, 1),
            (.answered(answer(.refused, reason: "a-later-macs-word", sentence: "The Mac's own words.")), true, "The Mac's own words.", 1),
            (.answered(answer(.failed, sentence: "Tortie could not rename this session.")), true, "Tortie could not rename this session.", 1),
            (.answered(answer(.busy, sentence: "Busy.")), true, "Busy.", 1),
            (.notTaken, true, Copy.renameNotTaken, 1),
            (.noAnswer, true, Copy.endNoAnswer, 1),
            (.noAnswer, false, nil, 1),
            (.notSent(.cancelled), true, Copy.renameNotTaken, 1),
            (.notSent(.unreachable(code: 61)), true, Copy.cannotReachMac, 0)
        ]
        for (result, readBack, line, reads) in cases {
            let renamer = ScriptedRenamer(results: [result], sessions: readBack ? [.success(detail("fix-login", rename: true))] : [.failure(.timedOut)])
            let rename = model(renamer)
            rename.text = "his name"
            var rereads = 0
            rename.save(reread: { rereads += 1 })
            await rename.writing?.value
            XCTAssertEqual(rename.line, line, "\(result)")
            XCTAssertEqual(rereads, reads, "\(result)")
            XCTAssertEqual(rename.phase, .idle, "\(result) closed the sheet")
            XCTAssertEqual(rename.text, "his name", "\(result) lost his text")
            let looked = await renamer.sessionsAsked
            XCTAssertEqual(looked.count, result == .noAnswer ? 1 : 0, "\(result): the one read after no answer")
        }
    }

    /// Clause: a second press while a rename runs does nothing: one write.
    func testASecondPressWhileOneRunsDoesNothing() async {
        let latch = Latch()
        let renamer = ScriptedRenamer(results: [.notTaken], during: { await latch.wait() })
        let registry = RenameRecord()
        let rename = model(renamer, registry: registry)
        rename.text = "one"
        rename.save(reread: {})
        rename.text = "two"
        rename.save(reread: {})
        XCTAssertEqual(registry.made.count, 1)
        await latch.open()
        await rename.writing?.value
        let asked = await renamer.asked
        XCTAssertEqual(asked.map(\.name), ["one"], "a second write went out")
    }

    /// Clause (bd7, rule ad): a runner stopped before its write (the app left
    /// between the press and the write) writes NOTHING, and the sheet says so,
    /// as a write withheld.
    func testARunnerStoppedBeforeItsWriteWritesNothing() async {
        let renamer = ScriptedRenamer(results: [.answered(answer(.done, name: "x"))])
        let runner = RenameRunner(target: sessionId, name: "x", renamer: renamer)
        runner.stop()
        XCTAssertTrue(runner.stopRequested)
        let result = await runner.run()
        XCTAssertNil(result)
        let count = await renamer.count
        XCTAssertEqual(count, 0, "a stopped runner wrote")
        let stopping = RenameRecord(stopsAtRegistration: true)
        let rename = model(renamer, registry: stopping)
        rename.text = "after the app left"
        var rereads = 0
        rename.save(reread: { rereads += 1 })
        await rename.writing?.value
        let after = await renamer.count
        XCTAssertEqual(after, 0, "a write went out after the app left")
        XCTAssertEqual(rename.line, Copy.renameNotTaken)
        XCTAssertEqual(rereads, 1)
    }

    /// Clause (D28's family, RM10): inside See a sample every press says
    /// nothing ran, through the sample's own renamer, which sends nothing.
    func testTheSampleSaysNothingRan() async throws {
        let sample = SampleReader(book: SampleBookFixture.book())
        let renamer = try XCTUnwrap(sample.renamer, "the sample is no renamer of its own")
        let rename = RenameModel(sessionId: "s", name: "fix-login", renamer: renamer, registry: nil, readsFirst: false, sample: true)
        rename.text = "a sample name"
        rename.save(reread: {})
        await rename.writing?.value
        XCTAssertEqual(rename.line, Copy.startSample)
        XCTAssertEqual(DoorWords.renameSentence(for: .notTaken, sample: true), Copy.startSample)
    }

    // MARK: The seams' defaults (section 9.3)

    /// Clause (section 9.3): a reader that says nothing of Rename (every fake
    /// before this phase, through `DoorReading`'s requirement) renames
    /// nothing, so no Rename and no Name are drawn for it.
    func testAReaderRenamesNothingByDefault() {
        let reader: any DoorReading = ScriptedReader()
        XCTAssertNil(reader.renamer)
        let writing: any DoorReading = WritingReader(reads: ScriptedReader(), writes: ScriptedWriter())
        XCTAssertNil(writing.renamer, "a reader that writes renames")
    }

    // MARK: The sentence (rule v)

    /// Clause (rule v): `renameSentence` is ALWAYS a sentence: the Mac's words
    /// for a refusal, the phone's not-renamed line for a 404 and a withheld
    /// write, End's no-answer line, and any read's sentence for a failure
    /// before the bytes were handed; `done` is the Mac's word Rename, which is
    /// never drawn; and inside the sample, nothing ran.
    func testTheSentenceIsAlwaysASentence() {
        XCTAssertEqual(DoorWords.renameSentence(for: .answered(answer(.done, name: "x")), sample: false), Copy.rename)
        XCTAssertEqual(DoorWords.renameSentence(for: .answered(answer(.busy, sentence: "Busy.")), sample: false), "Busy.")
        XCTAssertEqual(DoorWords.renameSentence(for: .notTaken, sample: false), Copy.renameNotTaken)
        XCTAssertEqual(DoorWords.renameSentence(for: .noAnswer, sample: false), Copy.endNoAnswer)
        XCTAssertEqual(DoorWords.renameSentence(for: .notSent(.cancelled), sample: false), Copy.renameNotTaken)
        XCTAssertEqual(DoorWords.renameSentence(for: .notSent(.timedOut), sample: false), Copy.macDidNotAnswer)
        let all: [RenameResult] = [.answered(answer(.done, name: "x")), .notTaken, .noAnswer, .notSent(.cancelled), .notSent(.notPaired)]
        for result in all {
            XCTAssertFalse(DoorWords.renameSentence(for: result, sample: false).isEmpty, "\(result)")
            XCTAssertEqual(DoorWords.renameSentence(for: result, sample: true), Copy.startSample, "\(result)")
        }
    }

    // MARK: The shape, read from the source (rules ac, ad, bd7, bd8)

    /// Clause (D8, rule ac): nothing on Rename's path names an owner check,
    /// Face ID or the passcode: the sheet's file and the field's.
    func testNothingOnRenamesPathNamesAnOwnerCheck() throws {
        for path in ["ios/Tortie/Screens/SessionName.swift", "ios/Tortie/Screens/NameField.swift"] {
            let code = Self.code(try StyleSource.text(path))
            for refused in ["OwnerCheck", "ownerCheck", "LAContext", "evaluatePolicy", "LocalAuthentication", "confirm(reason:", "faceid", "touchid"] {
                XCTAssertFalse(code.contains(refused), "\(path) names \(refused)")
            }
        }
    }

    /// Clause (bd7): the renamer's `rename(` (a member call naming `name:` and
    /// no `door:`, which only the client's own takes) is called ONCE in the
    /// app, in `RenameRunner.run`, and never in a loop.
    func testTheRenamersOneCallerIsTheRunner() throws {
        var calls: [String] = []
        for (name, text) in try appSwift() {
            let code = Self.code(text)
            for call in Self.memberCalls(code, "rename") where call.args.contains("name:") && !call.args.contains("door:") {
                calls.append(name)
                XCTAssertEqual(name, "Screens/SessionName.swift", "\(name) calls the renamer's rename(")
            }
        }
        XCTAssertEqual(calls.count, 1, "the renamer's rename( is called \(calls.count) time(s): \(calls)")
        let runner = try span("ios/Tortie/Screens/SessionName.swift", "final class RenameRunner {")
        let run = try XCTUnwrap(runner.range(of: "func run() async -> RenameResult? {"))
        let call = try XCTUnwrap(runner.range(of: "renamer.rename(target, name: name)"))
        XCTAssertLessThan(run.lowerBound, call.lowerBound)
        let between = String(runner[run.lowerBound..<call.lowerBound])
        XCTAssertTrue(between.contains("guard !stopRequested else { return nil }"), "run sends before it reads stopRequested")
        for loop in ["for ", "while ", "repeat "] { XCTAssertFalse(between.contains(loop), "the write is in a loop") }
    }

    /// Clause (bd7, rule ad): a runner's `stopRequested` is set by `stop()`
    /// alone, to true, and nothing sets it back; `stop()` also cancels its task.
    func testAStoppedRunnerStaysStopped() throws {
        let file = try StyleSource.text("ios/Tortie/Screens/SessionName.swift")
        let lines = Self.code(file).components(separatedBy: "\n")
        let sets = lines.filter { $0.contains("stopRequested =") && !$0.contains("var stopRequested") }
        XCTAssertEqual(sets.map { $0.trimmingCharacters(in: .whitespaces) }, ["stopRequested = true"])
        let stop = try span("ios/Tortie/Screens/SessionName.swift", "func stop() {", close: "\n    }\n")
        XCTAssertTrue(stop.contains("stopRequested = true") && stop.contains("task?.cancel()"), "stop() does not set stopRequested and cancel its task")
    }

    /// Clause (bd7, rule ad): every `RenameRunner(` the app makes is bound to a
    /// `let` and registered before its task starts: the Save press's, and the
    /// one the named Create makes in its start's done arm.
    func testEveryRunnerIsRegisteredBeforeItsTask() throws {
        var made = 0
        for (name, text) in try appSwift() {
            let code = Self.code(text)
            var from = code.startIndex
            while let at = code.range(of: "= RenameRunner(", range: from..<code.endIndex) {
                made += 1
                let head = code[code.startIndex..<at.lowerBound]
                let bound = try XCTUnwrap(head.components(separatedBy: "let ").last?.trimmingCharacters(in: .whitespaces), name)
                let rest = code[at.upperBound...]
                let registered = try XCTUnwrap(rest.range(of: "registerRename(\(bound))"), "\(name): the runner \(bound) is never registered")
                let task = try XCTUnwrap(rest.range(of: "Task {"), "\(name): the runner \(bound) runs in no task of its own")
                XCTAssertLessThan(registered.lowerBound, task.lowerBound, "\(name): the runner \(bound) is registered after its task starts")
                XCTAssertTrue(rest.contains("\(bound).task = "), "\(name): the runner \(bound)'s task is not its own, so stop() cancels nothing")
                from = at.upperBound
            }
        }
        XCTAssertEqual(made, 2, "the app makes \(made) RenameRunner(s); one at Save, one in the named Create's done arm")
    }

    /// Clause (bd8, D11): the sheet's Save is `.disabled(` by `canSave`;
    /// Return saves only where Save would; Cancel is the phone's own; and the
    /// sheet is titled with the Mac's `Rename`, identified, its line drawn
    /// only when there is one.
    func testTheSheetIsInNewSessionsFamily() throws {
        let sheet = try span("ios/Tortie/Screens/SessionName.swift", "struct SessionNameSheet: View {")
        XCTAssertTrue(sheet.contains(".navigationTitle(Copy.rename)"))
        XCTAssertTrue(sheet.contains("Button(Copy.saveName) { model.save(reread: reread) }\n                            .disabled(!model.canSave)\n                            .accessibilityIdentifier(ID.renameSave)"), "Save is not the Mac's word, off by canSave")
        XCTAssertTrue(sheet.contains("if model.canSave { model.save(reread: reread) }"), "Return saves where Save would not")
        XCTAssertTrue(sheet.contains("Button(Copy.cancel) { dismiss() }"))
        XCTAssertTrue(sheet.contains(".accessibilityIdentifier(ID.renameCancel)"))
        XCTAssertTrue(sheet.contains("if let line = model.line {"), "the line is drawn when there is none")
        XCTAssertTrue(sheet.contains(".accessibilityIdentifier(ID.renameLine)"))
        XCTAssertTrue(sheet.contains(".accessibilityIdentifier(ID.renameWriting)"))
        XCTAssertTrue(sheet.contains(".accessibilityIdentifier(ID.renameSheet)"))
        XCTAssertTrue(sheet.contains("NameField(text: $model.text, identifier: ID.renameField, label: Copy.sortName, focusOnAppear: true)"), "the sheet's field is not the one name field, focused as it appears")
        XCTAssertTrue(sheet.contains("if phase == .done { dismiss() }"), "the sheet does not close when the Mac renamed it")
        XCTAssertFalse(sheet.contains("TextField("), "the sheet holds a SwiftUI text field")
    }

    // MARK: Words and names (sections 5.2, 5.3)

    /// Clause: Rename's six words are the Mac's own five and the phone's
    /// not-renamed line, and its seven names are the spec's.
    func testTheWordsAndTheNames() {
        XCTAssertEqual(Copy.rename, "Rename")
        XCTAssertEqual(Copy.saveName, "Save name")
        XCTAssertEqual(Copy.nameEmpty, "Session name cannot be empty.")
        XCTAssertEqual(Copy.nameTooLong, "That name is too long.")
        XCTAssertEqual(Copy.nameCharacter, "That name holds a character Tortie does not use.")
        XCTAssertEqual(Copy.renameNotTaken, "Your Mac did not rename it. Nothing was changed.")
        XCTAssertEqual(ID.startName, "start-name")
        XCTAssertEqual(ID.renameSheet, "rename-sheet")
        XCTAssertEqual(ID.renameField, "rename-field")
        XCTAssertEqual(ID.renameSave, "rename-save")
        XCTAssertEqual(ID.renameCancel, "rename-cancel")
        XCTAssertEqual(ID.renameLine, "rename-line")
        XCTAssertEqual(ID.renameWriting, "rename-writing")
    }

    // MARK: Helpers

    /// Every Swift file of the app, named relative to `ios/Tortie/`. Both
    /// paths are resolved before they are compared, because the checkout may
    /// be reached through a link (`/tmp` and `/private/tmp`, `/var` and
    /// `/private/var`), and a path resolved on one side only is never under
    /// the other.
    private func appSwift() throws -> [(name: String, text: String)] {
        let root = StyleSource.root.appendingPathComponent("ios").appendingPathComponent("Tortie").resolvingSymlinksInPath()
        let prefix = root.path.hasSuffix("/") ? root.path : root.path + "/"
        let walk = try XCTUnwrap(FileManager.default.enumerator(at: root, includingPropertiesForKeys: nil), "the app's folder cannot be read")
        var out: [(name: String, text: String)] = []
        for case let url as URL in walk where url.pathExtension == "swift" {
            let path = url.resolvingSymlinksInPath().path
            XCTAssertTrue(path.hasPrefix(prefix), "\(path) is not under \(prefix)")
            guard path.hasPrefix(prefix) else { continue }
            out.append((name: String(path.dropFirst(prefix.count)), text: try String(contentsOf: url, encoding: .utf8)))
        }
        XCTAssertGreaterThan(out.count, 40, "the app's Swift files were not found")
        return out.sorted { $0.name < $1.name }
    }

    /// The text with every `//` comment taken out, line by line.
    nonisolated static func code(_ text: String) -> String {
        text.components(separatedBy: "\n").map { line in
            guard let at = line.range(of: "//") else { return line }
            return String(line[line.startIndex..<at.lowerBound])
        }.joined(separator: "\n")
    }

    /// Every member call `<expression>.<name>(…)` in `code`, with its
    /// arguments' text: a case of an enum written after `(`, `,` or `:` is not
    /// a call.
    nonisolated static func memberCalls(_ code: String, _ name: String) -> [(at: String.Index, args: String)] {
        var out: [(at: String.Index, args: String)] = []
        var from = code.startIndex
        while let dot = code.range(of: ".\(name)(", range: from..<code.endIndex) {
            from = dot.upperBound
            var before = dot.lowerBound
            while before > code.startIndex, code[code.index(before: before)] == " " { before = code.index(before: before) }
            guard before > code.startIndex else { continue }
            let last = code[code.index(before: before)]
            guard last.isLetter || last.isNumber || last == "_" || last == ")" || last == "]" || last == "?" || last == "!" else { continue }
            var depth = 1
            var end = dot.upperBound
            while end < code.endIndex, depth > 0 {
                if code[end] == "(" { depth += 1 } else if code[end] == ")" { depth -= 1 }
                end = code.index(after: end)
            }
            out.append((at: dot.lowerBound, args: String(code[dot.upperBound..<end])))
        }
        return out
    }

    private func span(_ path: String, _ start: String, close: String = "\n}\n") throws -> String {
        let text = try StyleSource.text(path)
        let head = try XCTUnwrap(text.range(of: start), "\(path) declares no \(start)")
        let end = try XCTUnwrap(text.range(of: close, range: head.upperBound..<text.endIndex))
        return String(text[head.lowerBound..<end.upperBound])
    }

    private func until(_ condition: () async -> Bool) async throws {
        for _ in 0..<5_000 {
            if await condition() { return }
            try await Task.sleep(nanoseconds: 1_000_000)
        }
        XCTFail("the condition never held")
    }
}

// MARK: - The stand-ins

/// The Mac's answers to a rename, scripted, every rename asked in order, and
/// the session reads it answers (the sheet's first read and its read after
/// no answer).
actor ScriptedRenamer: DoorRenaming {
    struct Ask: Equatable, Sendable {
        let session: String
        let name: String
    }

    private var results: [RenameResult]
    private var sessions: [Result<PocketSessionAnswer, DoorFailure>]
    private(set) var asked: [Ask] = []
    private(set) var sessionsAsked: [String] = []
    private let during: (@Sendable () async -> Void)?
    private let duringSession: (@Sendable () async -> Void)?

    init(
        results: [RenameResult] = [],
        sessions: [Result<PocketSessionAnswer, DoorFailure>] = [],
        during: (@Sendable () async -> Void)? = nil,
        duringSession: (@Sendable () async -> Void)? = nil
    ) {
        self.results = results
        self.sessions = sessions
        self.during = during
        self.duringSession = duringSession
    }

    func rename(_ sessionId: String, name: String) async -> RenameResult {
        asked.append(Ask(session: sessionId, name: name))
        await during?()
        return results.isEmpty ? .noAnswer : results.removeFirst()
    }

    func session(_ sessionId: String) async throws -> PocketSessionAnswer {
        sessionsAsked.append(sessionId)
        await duringSession?()
        guard !sessions.isEmpty else { throw DoorFailure.unreachable(code: -1004) }
        return try sessions.removeFirst().get()
    }

    var count: Int { asked.count }
}

/// The app's rename registry, for a test with no app: every runner made, the
/// ones still live, and (when asked) each one stopped as it is registered,
/// which is what a trip to the background does to a live runner.
@MainActor
final class RenameRecord: RenameRegistry {
    private(set) var made: [RenameRunner] = []
    private(set) var live: [RenameRunner] = []
    private let stopsAtRegistration: Bool

    init(stopsAtRegistration: Bool = false) {
        self.stopsAtRegistration = stopsAtRegistration
    }

    func registerRename(_ runner: RenameRunner) {
        made.append(runner)
        live.append(runner)
        if stopsAtRegistration { runner.stop() }
    }

    func releaseRename(_ runner: RenameRunner) {
        live.removeAll { $0 === runner }
    }
}
