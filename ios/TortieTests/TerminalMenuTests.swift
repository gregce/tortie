import XCTest
@testable import Tortie

/// The Terminal's one ⋯ (Phase 337.3, build/p3373/SPEC.md D21 to D24, D27,
/// D28, his "In vertical mode, I'd rather have an ellipses in in the top right
/// that show the option to catch me up or end session (we can keep face input
/// for end session)"): one native menu at the top right, Catch Me Up then End
/// session…, End exactly where End's press at the top right would be drawn,
/// on or off as it would be, behind the same confirmation and the same owner
/// check, and a progress mark beside the ⋯ while End is under way. Since
/// Phase 349 (build/p349/SPEC.md D1, D20) Rename is the second item where the
/// Mac offers it and the pairing renames, its sheet's model made at the press
/// over the name the Terminal holds, and outside the items. What the menu
/// holds is read from the drawing, through the same functions the menu calls;
/// its shape is read from the source, because a menu iOS draws is not a view
/// a unit test can open. The Mac and iOS are scripts (EndFakes.swift). Each
/// test names the clause it holds and fails when that clause is taken out of
/// Screens/SessionScreen.swift, Screens/EndBar.swift,
/// Screens/Identifiers.swift or Style/Copy.swift.
@MainActor
final class TerminalMenuTests: XCTestCase {
    // MARK: What the menu holds, case by case

    /// What the menu draws for End, read through the menu's own functions.
    private struct Drawn: Equatable {
        /// End's row, or nil when the menu holds Catch Me Up alone.
        let row: EndBarDrawing.Row?
        let label: String?
        let glyph: String?
        /// The progress mark's identifier beside the ⋯, or nil.
        let mark: String?
    }

    private func drawn(_ end: EndModel?, offer: PocketEndOffer, confirm: PocketEndConfirm? = WriteAnswers.confirm) -> Drawn {
        let drawing = TerminalMenuControl.drawing(end, offer: offer, confirm: offer.isOffered ? confirm : nil)
        let row = TerminalMenuControl.endRow(drawing, writes: end?.writer != nil)
        return Drawn(
            row: row,
            label: row == nil ? nil : drawing?.menuLabel,
            glyph: row == nil ? nil : drawing?.glyph,
            mark: TerminalMenuControl.progressMark(drawing)
        )
    }

    private func model(_ kind: OwnerKind = .faceID, writer: (any DoorWriting)? = ScriptedWriter(), owner: ScriptedOwnerCheck? = nil) -> EndModel {
        EndModel(sessionId: "s", writer: writer, ownerCheck: owner ?? ScriptedOwnerCheck(kind: kind), registry: RunnerRecord())
    }

    /// Clause (D22): offered, the Mac's words with it, and an owner check
    /// iOS can ask: End session… is on, with the glyph of what iOS will ask,
    /// Face ID, Touch ID or the passcode alone, and no mark beside the ⋯.
    func testOfferedWithEachOwnerCheckIsOn() {
        let kinds: [(OwnerKind, String)] = [(.faceID, "faceid"), (.touchID, "touchid"), (.passcode, "lock")]
        for (kind, glyph) in kinds {
            XCTAssertEqual(
                drawn(model(kind), offer: .offered(batch: true)),
                Drawn(row: .on, label: Copy.endSessionMenu, glyph: glyph, mark: nil),
                "\(kind)"
            )
        }
        let drawing = TerminalMenuControl.drawing(model(), offer: .offered(batch: false), confirm: WriteAnswers.confirm)
        XCTAssertEqual(drawing?.confirm, WriteAnswers.confirm, "End is on with no confirmation to show")
    }

    /// Clause (D22): with no passcode on this iPhone End session… is drawn
    /// OFF, as End at the top right is, and End's line says why.
    func testNoPasscodeIsOff() {
        let end = model(.none)
        XCTAssertEqual(drawn(end, offer: .offered(batch: true)), Drawn(row: .off, label: Copy.endSessionMenu, glyph: "lock", mark: nil))
        let drawing = TerminalMenuControl.drawing(end, offer: .offered(batch: true), confirm: WriteAnswers.confirm)
        XCTAssertNil(drawing?.confirm, "a confirmation was offered with no owner check to ask")
        XCTAssertEqual(drawing?.line, Copy.endNeedsPasscode)
    }

    /// Clause (D22): a session Tortie cannot see draws End session… OFF, with
    /// the door's own sentence on End's line.
    func testUnreachableIsOff() {
        let title = "Tortie cannot see whether this session is running, so it cannot end it."
        let end = model()
        XCTAssertEqual(drawn(end, offer: .unreachable(title: title)), Drawn(row: .off, label: Copy.endSessionMenu, glyph: "faceid", mark: nil))
        XCTAssertEqual(TerminalMenuControl.drawing(end, offer: .unreachable(title: title), confirm: nil)?.line, title)
    }

    /// Clause (D22): where End is not drawn today the menu holds Catch Me Up
    /// alone: the Mac offers no End, it offers one without its own words, a
    /// model with no writer, and a pairing that writes nothing (no model).
    func testNotOfferedOrNoWriterHoldsCatchUpAlone() {
        let alone = Drawn(row: nil, label: nil, glyph: nil, mark: nil)
        XCTAssertEqual(drawn(model(), offer: .none), alone, "End drawn on a session the Mac offers no End on")
        XCTAssertEqual(drawn(model(), offer: .offered(batch: true), confirm: nil), alone, "End drawn with no words of the Mac's to confirm")
        XCTAssertEqual(drawn(model(writer: nil), offer: .offered(batch: true)), alone, "End drawn for a model that cannot write")
        XCTAssertEqual(drawn(nil, offer: .offered(batch: true)), alone, "End drawn for a pairing that writes nothing")
        XCTAssertNil(TerminalMenuControl.drawing(nil, offer: .offered(batch: true), confirm: WriteAnswers.confirm))
        XCTAssertNil(TerminalMenuControl.endRow(EndBarDrawing(offer: .offered(batch: true), confirm: WriteAnswers.confirm, kind: .faceID, phase: .idle, line: nil), writes: false))
    }

    /// Clause (D24): while iOS asks Face ID, Touch ID or the passcode, End
    /// session… is drawn off and `end-confirming` sits beside the ⋯, as it
    /// does beside End at the top right; when iOS answers it goes.
    func testUnderWayIsOffWithTheConfirmingMark() async throws {
        let latch = Latch()
        let owner = ScriptedOwnerCheck(kind: .faceID, answers: [.notConfirmed])
        owner.during = { await latch.wait() }
        let writer = ScriptedWriter()
        let end = model(writer: writer, owner: owner)
        end.press(WriteAnswers.confirm) { true }
        XCTAssertEqual(end.phase, .confirming)
        XCTAssertEqual(drawn(end, offer: .offered(batch: true)), Drawn(row: .off, label: Copy.endSessionMenu, glyph: "faceid", mark: ID.endConfirming))
        await latch.open()
        await end.pressing?.value
        XCTAssertEqual(drawn(end, offer: .offered(batch: true)), Drawn(row: .on, label: Copy.endSessionMenu, glyph: "faceid", mark: nil))
        let sent = await writer.endCount
        XCTAssertEqual(sent, 0, "a write went out with no match")
    }

    /// Clause (D22, D24): while the write runs End reads `Ending…`, drawn off,
    /// and `end-writing` sits beside the ⋯; once it has answered both go.
    func testWritingReadsEndingWithTheWritingMark() async throws {
        let latch = Latch()
        let writer = ScriptedWriter(ends: [WriteAnswers.busy], during: { _ in await latch.wait() })
        let end = model(writer: writer, owner: ScriptedOwnerCheck(kind: .faceID, answers: [.confirmed]))
        end.press(WriteAnswers.confirm) { true }
        try await until { end.phase == .writing }
        XCTAssertEqual(drawn(end, offer: .offered(batch: true)), Drawn(row: .off, label: Copy.ending, glyph: "faceid", mark: ID.endWriting))
        await latch.open()
        await end.pressing?.value
        XCTAssertEqual(end.phase, .idle)
        XCTAssertNil(drawn(end, offer: .offered(batch: true)).mark, "the mark outlived the write")
        let sent = await writer.endCount
        XCTAssertEqual(sent, 1)
    }

    /// Clause (D24): the mark is the drawing's, one at a time, and nothing
    /// while End is idle.
    func testTheMarkIsOneAtATime() {
        func mark(_ phase: EndModel.Phase) -> String? {
            TerminalMenuControl.progressMark(EndBarDrawing(offer: .offered(batch: true), confirm: WriteAnswers.confirm, kind: .faceID, phase: phase, line: nil))
        }
        XCTAssertNil(mark(.idle))
        XCTAssertEqual(mark(.confirming), ID.endConfirming)
        XCTAssertEqual(mark(.writing), ID.endWriting)
        XCTAssertNil(TerminalMenuControl.progressMark(nil))
    }

    // MARK: The ⋯ itself

    /// Clause (D21): SF Symbols' `ellipsis` on iOS 26 and later (the bar
    /// draws its own glass circle around it) and `ellipsis.circle` before,
    /// read on the runtime this test runs on and in the source.
    func testTheSymbolByIOSVersion() throws {
        if #available(iOS 26, *) {
            XCTAssertEqual(TerminalMenuControl.symbol, "ellipsis")
        } else {
            XCTAssertEqual(TerminalMenuControl.symbol, "ellipsis.circle")
        }
        let control = try span("ios/Tortie/Screens/SessionScreen.swift", "struct TerminalMenuControl: View {")
        XCTAssertTrue(control.contains("if #available(iOS 26, *) { \"ellipsis\" } else { \"ellipsis.circle\" }"))
    }

    /// The ⋯'s items and what follows them, split at the ⋯'s OWN label: since
    /// Phase 349 Rename's Button inside the items has a `label:` of its own,
    /// so the first `} label: {` after `Menu {` is no longer the menu's.
    private func menuParts(_ control: String) throws -> (items: String, chrome: String, after: String) {
        let open = try XCTUnwrap(control.range(of: "Menu {"))
        let label = try XCTUnwrap(
            control.range(of: "} label: {\n                Image(systemName: TerminalMenuControl.symbol)", range: open.upperBound..<control.endIndex),
            "the ⋯'s own label is not the symbol"
        )
        return (
            String(control[open.upperBound..<label.lowerBound]),
            String(control[label.lowerBound...]),
            String(control[label.upperBound...])
        )
    }

    /// Clause (D21, D22): ONE `Menu {`, labelled with the symbol in the
    /// accent, spoken `More`, identified `terminal-menu`; its items at most
    /// three in this order, Catch Me Up (the Mac's word, its speech bubble, its
    /// identifier, pushing Catch Me Up), then Rename where it is drawn (Phase
    /// 349, D1: the Mac's word and its pencil, behind `if let rename`), then
    /// End's item, and End's only where `endRow` says it is drawn. Since Phase
    /// 348 (D33, his ruling that Remove asks no Face ID) the last item is
    /// Remove's where the menu draws no End and Remove is drawn, in End's
    /// place: never both.
    func testOneMenuOfThreeItemsInOrder() throws {
        let control = try span("ios/Tortie/Screens/SessionScreen.swift", "struct TerminalMenuControl: View {")
        XCTAssertEqual(control.components(separatedBy: "Menu {").count, 2, "the ⋯ is not exactly one menu")
        let (items, chrome, _) = try menuParts(control)
        let catchUp = try XCTUnwrap(items.range(of: "Button(action: openCatchUp) {"))
        let rename = try XCTUnwrap(items.range(of: "if let rename {\n                    Button {\n                        renaming = rename.asked()\n                    } label: {"), "Rename is not its own item behind its drawing")
        let end = try XCTUnwrap(items.range(of: "EndMenuItem(row: row, drawing: drawing) {"))
        XCTAssertLessThan(catchUp.lowerBound, rename.lowerBound, "Rename is not after Catch Me Up")
        XCTAssertLessThan(rename.lowerBound, end.lowerBound, "Rename is not before End")
        XCTAssertTrue(items.contains("Label(Copy.catchMeUp, systemImage: \"text.bubble\")"))
        XCTAssertTrue(items.contains(".accessibilityIdentifier(ID.terminalMenuCatchUp)"))
        XCTAssertTrue(items.contains("Label(Copy.rename, systemImage: \"pencil\")"), "Rename is not the Mac's word with its pencil")
        XCTAssertTrue(items.contains(".accessibilityIdentifier(ID.terminalMenuRename)"))
        XCTAssertEqual(items.components(separatedBy: "if let rename {").count, 2, "Rename is drawn other than once, behind its drawing")
        XCTAssertTrue(items.contains("if let drawing, let row = TerminalMenuControl.endRow(drawing, writes: end?.writer != nil) {"), "End's item is not drawn exactly where End's press would be")
        XCTAssertEqual(items.components(separatedBy: "Button").count, 3, "the menu holds an item besides Catch Me Up, Rename and End")
        XCTAssertEqual(items.components(separatedBy: "EndMenuItem(").count, 2)
        let otherwise = try XCTUnwrap(items.range(of: "} else if let removal {\n                    RemoveMenuItem(drawing: removal) {"), "Remove is not End's item's otherwise")
        XCTAssertLessThan(end.lowerBound, otherwise.lowerBound)
        XCTAssertEqual(items.components(separatedBy: "RemoveMenuItem(").count, 2)
        XCTAssertTrue(control.contains("let removal = TerminalMenuControl.removeDrawing(end, offer: offer, removeConfirm: removeConfirm)"))
        XCTAssertFalse(items.contains("Divider()"))
        XCTAssertTrue(chrome.contains("Image(systemName: TerminalMenuControl.symbol)"))
        XCTAssertTrue(chrome.contains(".foregroundStyle(Tokens.accent)"))
        XCTAssertTrue(chrome.contains(".accessibilityLabel(Text(verbatim: Copy.more))"))
        XCTAssertTrue(chrome.contains(".accessibilityIdentifier(ID.terminalMenu)"))
        // The ⋯ draws no word of its own: a symbol, spoken `More`.
        XCTAssertFalse(chrome.contains("Words("))
    }

    /// Clause (D23): the Mac's confirmation is attached to the MENU, outside
    /// its items, so it presents once the menu has closed; the press only
    /// asks for it, and it shows only over the Mac's own words. Since Phase
    /// 349 (D20) the Rename sheet is attached outside the items too, after
    /// Remove's confirmation, and Rename's press makes its model and nothing
    /// else.
    func testTheConfirmationIsOnTheMenuOutsideItsItems() throws {
        let control = try span("ios/Tortie/Screens/SessionScreen.swift", "struct TerminalMenuControl: View {")
        let (items, _, after) = try menuParts(control)
        XCTAssertFalse(items.contains(".endConfirmation("), "the confirmation is inside the menu's items")
        XCTAssertFalse(items.contains("confirmationDialog"))
        let id = try XCTUnwrap(after.range(of: ".accessibilityIdentifier(ID.terminalMenu)"))
        let confirmation = try XCTUnwrap(after.range(of: ".endConfirmation(model: end, offer: offer, confirm: confirm, drawing: drawing, isPresented: $asking, reread: reread)"))
        XCTAssertLessThan(id.lowerBound, confirmation.lowerBound, "the confirmation is not in the menu's own chain")
        XCTAssertTrue(items.contains("guard drawing.confirm != nil else { return }\n                        asking = true"), "the press does more than ask for the Mac's words")
        XCTAssertEqual(control.components(separatedBy: "asking = true").count, 2, "something else asks for the confirmation")
        // Remove's (Phase 348, D33): the Mac's Remove words, outside the
        // items too, asked for by Remove's press alone.
        XCTAssertFalse(items.contains(".removeConfirmation("), "Remove's confirmation is inside the menu's items")
        let remove = try XCTUnwrap(after.range(of: ".removeConfirmation(model: end?.remove, drawing: removal, isPresented: $removeAsked, reread: reread)"))
        XCTAssertTrue(items.contains("guard removal.confirm != nil else { return }\n                        removeAsked = true"), "Remove's press does more than ask for the Mac's words")
        XCTAssertEqual(control.components(separatedBy: "removeAsked = true").count, 2, "something else asks for Remove's confirmation")
        // Rename's (Phase 349, D20): the sheet, outside the items, after
        // Remove's confirmation, over the model the press made there and then.
        XCTAssertFalse(items.contains(".sheet("), "the Rename sheet is inside the menu's items")
        let sheet = try XCTUnwrap(after.range(of: ".sheet(item: $renaming) { asked in"), "the Rename sheet is not on the control")
        XCTAssertLessThan(remove.lowerBound, sheet.lowerBound, "the Rename sheet is not after Remove's confirmation")
        XCTAssertEqual(control.components(separatedBy: ".sheet(").count, 2, "the ⋯ presents other than one sheet")
        XCTAssertEqual(control.components(separatedBy: "renaming = ").count, 2, "something else asks for the Rename sheet")
        XCTAssertTrue(control.contains("@State private var renaming: RenameAsked?"))
    }

    /// Clause (D21): the Terminal's top bar holds ONE trailing item, the ⋯,
    /// handed since Phase 348 the Mac's Remove words beside End's and since
    /// Phase 349 its Rename.
    func testTheMenuIsOneTopBarTrailingItem() throws {
        let menu = try span("ios/Tortie/Screens/SessionScreen.swift", "struct TerminalMenu: ToolbarContent {")
        XCTAssertEqual(menu.components(separatedBy: "ToolbarItem(").count, 2)
        XCTAssertTrue(menu.contains("ToolbarItem(placement: .topBarTrailing) {\n            TerminalMenuControl(end: end, offer: offer, confirm: confirm, removeConfirm: removeConfirm, rename: rename, reread: reread, openCatchUp: openCatchUp)"))
        // The Terminal hands Rename through a copy, so its one line that makes
        // the menu keeps its words (EndTopTests reads it).
        XCTAssertTrue(menu.contains("func renaming(_ rename: TerminalRename?) -> TerminalMenu {\n        var copy = self\n        copy.rename = rename\n        return copy\n    }"))
        let session = try StyleSource.text("ios/Tortie/Screens/SessionScreen.swift")
        XCTAssertTrue(session.contains(") { openCatchUp(drawing.outcome) }\n                .renaming(TerminalRename.of(drawing, setup: rename))\n"), "the Terminal does not hand the ⋯ its Rename")
        XCTAssertEqual(session.components(separatedBy: ".renaming(").count, 2)
    }

    /// Clause (D23, rule ac, "we can keep face input for end session"): the
    /// menu names no owner check; End's is `EndModel.press`, which the one
    /// confirmation calls.
    func testTheMenuNamesNoOwnerCheck() throws {
        for start in ["struct TerminalMenu: ToolbarContent {", "struct TerminalMenuControl: View {"] {
            let body = try span("ios/Tortie/Screens/SessionScreen.swift", start)
            for refused in ["OwnerCheck", "ownerCheck", "LAContext", "evaluatePolicy", "LocalAuthentication", "confirm(reason:"] {
                XCTAssertFalse(body.contains(refused), "\(start) names \(refused)")
            }
        }
        let item = try span("ios/Tortie/Screens/EndBar.swift", "struct EndMenuItem: View {")
        for refused in ["OwnerCheck", "ownerCheck", "LAContext", "evaluatePolicy", ".press("] {
            XCTAssertFalse(item.contains(refused), "EndMenuItem names \(refused); its press asks for the Mac's confirmation and nothing else")
        }
    }

    // MARK: End's item and the one confirmation

    /// Clause (D22, rule ac's second press): End's item is ONE destructive
    /// Button labelled with the menu's word and the owner check's glyph,
    /// whose own chain is `.disabled(row == .off)` then its identifier, over a
    /// stored row of `EndBarDrawing.Row`.
    func testEndsItemIsOneDestructiveButtonOff() throws {
        let item = try span("ios/Tortie/Screens/EndBar.swift", "struct EndMenuItem: View {")
        XCTAssertTrue(item.contains("let row: EndBarDrawing.Row\n"))
        XCTAssertEqual(item.components(separatedBy: "Button(").count, 2, "End's item is not one Button")
        XCTAssertTrue(item.contains("""
                Button(role: .destructive) {
                    ask()
                } label: {
                    Label(drawing.menuLabel, systemImage: drawing.glyph)
                }
                .disabled(row == .off)
                .accessibilityIdentifier(ID.terminalMenuEnd)
        """), "End's item is not the destructive Button whose own chain is drawn off and identified")
    }

    /// Clause (D23): the Mac's confirmation is written ONCE in the app for a
    /// single End, in `EndConfirmation`, word for word, its destructive press
    /// `EndModel.press`; Catch Me Up's End applies it, and the Terminal writes
    /// no copy.
    func testTheConfirmationIsOneModifierBothEndsApply() throws {
        let bar = try StyleSource.text("ios/Tortie/Screens/EndBar.swift")
        XCTAssertEqual(bar.components(separatedBy: ".confirmationDialog(").count, 2, "EndBar.swift does not hold exactly one confirmation")
        let modifier = try span("ios/Tortie/Screens/EndBar.swift", "struct EndConfirmation: ViewModifier {")
        XCTAssertTrue(modifier.contains(".confirmationDialog(confirm?.title ?? Copy.endSessionMenu, isPresented: $isPresented, titleVisibility: .visible) {"))
        XCTAssertTrue(modifier.contains("Button(shown.confirmLabel, role: .destructive) {\n                        model.press(shown, reread: reread)"))
        XCTAssertTrue(modifier.contains("Button(Copy.cancel, role: .cancel) {}"))
        XCTAssertTrue(modifier.contains("Text(verbatim: shown.body)"))
        XCTAssertTrue(modifier.contains("offer.isOffered ? drawing?.confirm : nil"), "the press could be drawn over no offer of the Mac's")
        let top = try span("ios/Tortie/Screens/EndBar.swift", "struct EndTopControl: View {")
        XCTAssertTrue(top.contains(".endConfirmation(model: model, offer: offer, confirm: confirm, drawing: drawing, isPresented: $asking, reread: reread)"), "Catch Me Up's End does not apply the one confirmation")
        XCTAssertFalse(top.contains("confirmationDialog"), "Catch Me Up's End holds a copy of the confirmation")
        for path in ["ios/Tortie/Screens/SessionScreen.swift", "ios/Tortie/Screens/ConversationScreen.swift", "ios/Tortie/Screens/Screen.swift"] {
            XCTAssertFalse(try StyleSource.text(path).contains("confirmationDialog"), "\(path) holds a confirmation of its own")
        }
    }

    // MARK: Rename (Phase 349, build/p349/SPEC.md D1, D20)

    /// A rename setup that makes the app's own models, as App/TortieApp.swift
    /// does, and records what each press asked for.
    @MainActor
    private final class RecordingSetup {
        struct Made: Equatable {
            let sessionId: String
            let name: String
            let readsFirst: Bool
        }

        private(set) var made: [Made] = []

        var setup: RenameSetup {
            RenameSetup { [self] id, name, readsFirst in
                made.append(Made(sessionId: id, name: name, readsFirst: readsFirst))
                return RenameModel(sessionId: id, name: name, renamer: MenuRenamer(), registry: nil, readsFirst: readsFirst)
            }
        }
    }

    /// A renamer no test here presses: every rename is not taken.
    private struct MenuRenamer: DoorRenaming {
        func rename(_ sessionId: String, name: String) async -> RenameResult { .notTaken }
        func session(_ sessionId: String) async throws -> PocketSessionAnswer { throw DoorFailure.refused }
    }

    /// Clause (D1, D20): Rename is drawn only where the app handed a setup (a
    /// pairing that renames) and the latest detail offers it; no model is made
    /// until the press, and the press's model holds the name the Terminal
    /// holds, WHOLE (a list would clip it at 200), and reads nothing more.
    func testRenameIsDrawnOnlyWithASetupAndTheMacsOffer() throws {
        let long = String(repeating: "n", count: 300)
        var row = Answers.row("s", name: long)
        let plain = try SessionDrawing(Answers.detail(row))
        row.rename = true
        let offered = try SessionDrawing(Answers.detail(row))
        let recording = RecordingSetup()
        XCTAssertNil(TerminalRename.of(offered, setup: nil), "Rename drawn for a pairing that renames nothing")
        XCTAssertNil(TerminalRename.of(plain, setup: recording.setup), "Rename drawn where the Mac offers none")
        let rename = try XCTUnwrap(TerminalRename.of(offered, setup: recording.setup))
        XCTAssertEqual(recording.made, [], "a sheet's model was made before the press")
        let asked = rename.asked()
        XCTAssertEqual(recording.made, [RecordingSetup.Made(sessionId: "s", name: long, readsFirst: false)])
        XCTAssertEqual(asked.model.sessionId, "s")
        XCTAssertEqual(asked.model.text, long, "the ⋯'s sheet does not hold the whole name the Terminal holds")
        XCTAssertFalse(asked.model.readsFirst, "the ⋯'s sheet reads the session again")
        XCTAssertEqual(asked.model.phase, .idle)
        XCTAssertTrue(asked.model.offered)
    }

    /// Clause (D20): every press makes a model of its own, so a second press
    /// always gets a fresh sheet, never one the first press left behind,
    /// though both models are of one session; and a press's name is the one
    /// the Terminal held when he pressed.
    func testEachPressMakesAFreshSheetOverItsOwnModel() throws {
        var row = Answers.row("s", name: "first")
        row.rename = true
        let recording = RecordingSetup()
        let first = try XCTUnwrap(TerminalRename.of(try SessionDrawing(Answers.detail(row)), setup: recording.setup)).asked()
        first.model.text = "typed over"
        var later = Answers.row("s", name: "second")
        later.rename = true
        let second = try XCTUnwrap(TerminalRename.of(try SessionDrawing(Answers.detail(later)), setup: recording.setup)).asked()
        XCTAssertNotEqual(first.id, second.id, "a second press was handed the first press's sheet")
        XCTAssertTrue(first.model !== second.model)
        XCTAssertEqual(first.model.sessionId, second.model.sessionId)
        XCTAssertEqual(second.model.text, "second", "the second press did not take the name drawn when he pressed")
        XCTAssertEqual(first.model.held, "first", "a press's name moved after the press")
        XCTAssertEqual(recording.made.map(\.name), ["first", "second"])
        XCTAssertEqual(recording.made.map(\.readsFirst), [false, false])
    }

    // MARK: Words and names

    /// Clause (D27, D28): the ⋯'s spoken name is the phone's one new word,
    /// `More`, owned by the phone; the menu's other words are the Mac's,
    /// Rename among them since Phase 349 (D11); and the names a drive finds
    /// them by.
    func testTheWordsAndTheNames() throws {
        XCTAssertEqual(Copy.more, "More")
        XCTAssertEqual(Copy.rename, "Rename")
        let entries = StyleSource.copyEntries(try StyleSource.text("ios/Tortie/Style/Copy.swift")).entries
        let more = try XCTUnwrap(entries.first(where: { $0.name == "more" }))
        let end = try XCTUnwrap(entries.first(where: { $0.name == "endSessionMenu" }))
        let catchUp = try XCTUnwrap(entries.first(where: { $0.name == "catchMeUp" }))
        let rename = try XCTUnwrap(entries.first(where: { $0.name == "rename" }), "Rename is not declared in Copy.swift")
        guard case .phone? = more.owner else { return XCTFail("More is not the phone's word") }
        guard case .mac? = end.owner else { return XCTFail("End session… is not the Mac's word") }
        guard case .mac? = catchUp.owner else { return XCTFail("Catch Me Up is not the Mac's word") }
        guard case .mac? = rename.owner else { return XCTFail("Rename is not the Mac's word") }
        XCTAssertEqual(ID.terminalMenu, "terminal-menu")
        XCTAssertEqual(ID.terminalMenuCatchUp, "terminal-menu-catch-up")
        XCTAssertEqual(ID.terminalMenuEnd, "terminal-menu-end")
        XCTAssertEqual(ID.terminalMenuRename, "terminal-menu-rename")
        XCTAssertEqual(ID.endWriting, "end-writing")
        XCTAssertEqual(ID.endConfirming, "end-confirming")
    }

    // MARK: Helpers

    /// A type's text in a checkout file, from its declaration to its closing
    /// brace at the start of a line.
    private func span(_ path: String, _ start: String) throws -> String {
        let text = try StyleSource.text(path)
        let head = try XCTUnwrap(text.range(of: start), "\(path) declares no \(start)")
        let close = try XCTUnwrap(text.range(of: "\n}\n", range: head.upperBound..<text.endIndex))
        return String(text[head.lowerBound..<close.upperBound])
    }

    /// Wait until `condition` holds, a millisecond at a time; fail after five
    /// seconds.
    private func until(_ condition: () -> Bool) async throws {
        for _ in 0..<5_000 {
            if condition() { return }
            try await Task.sleep(nanoseconds: 1_000_000)
        }
        XCTFail("the condition never held")
    }
}
