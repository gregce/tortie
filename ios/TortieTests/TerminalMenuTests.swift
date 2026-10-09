import XCTest
@testable import Tortie

/// The Terminal's one ⋯ (Phase 337.3, build/p3373/SPEC.md D21 to D24, D27,
/// D28, his "In vertical mode, I'd rather have an ellipses in in the top right
/// that show the option to catch me up or end session (we can keep face input
/// for end session)"): one native menu at the top right, Catch Me Up then End
/// session…, End exactly where End's press at the top right would be drawn,
/// on or off as it would be, behind the same confirmation and the same owner
/// check, and a progress mark beside the ⋯ while End is under way. What the
/// menu holds is read from the drawing, through the same functions the menu
/// calls; its shape is read from the source, because a menu iOS draws is not
/// a view a unit test can open. The Mac and iOS are scripts (EndFakes.swift).
/// Each test names the clause it holds and fails when that clause is taken
/// out of Screens/SessionScreen.swift, Screens/EndBar.swift,
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

    /// Clause (D21, D22): ONE `Menu {`, labelled with the symbol in the
    /// accent, spoken `More`, identified `terminal-menu`; its items exactly
    /// two in this order, Catch Me Up (the Mac's word, its speech bubble, its
    /// identifier, pushing Catch Me Up) then End's item, and End's only where
    /// `endRow` says it is drawn.
    func testOneMenuOfTwoItemsInOrder() throws {
        let control = try span("ios/Tortie/Screens/SessionScreen.swift", "struct TerminalMenuControl: View {")
        XCTAssertEqual(control.components(separatedBy: "Menu {").count, 2, "the ⋯ is not exactly one menu")
        let open = try XCTUnwrap(control.range(of: "Menu {"))
        let label = try XCTUnwrap(control.range(of: "} label: {", range: open.upperBound..<control.endIndex))
        let items = String(control[open.upperBound..<label.lowerBound])
        let catchUp = try XCTUnwrap(items.range(of: "Button(action: openCatchUp) {"))
        let end = try XCTUnwrap(items.range(of: "EndMenuItem(row: row, drawing: drawing) {"))
        XCTAssertLessThan(catchUp.lowerBound, end.lowerBound, "End is not after Catch Me Up")
        XCTAssertTrue(items.contains("Label(Copy.catchMeUp, systemImage: \"text.bubble\")"))
        XCTAssertTrue(items.contains(".accessibilityIdentifier(ID.terminalMenuCatchUp)"))
        XCTAssertTrue(items.contains("if let drawing, let row = TerminalMenuControl.endRow(drawing, writes: end?.writer != nil) {"), "End's item is not drawn exactly where End's press would be")
        XCTAssertEqual(items.components(separatedBy: "Button(").count, 2, "the menu holds an item besides Catch Me Up and End")
        XCTAssertEqual(items.components(separatedBy: "EndMenuItem(").count, 2)
        XCTAssertFalse(items.contains("Divider()"))
        let chrome = String(control[label.lowerBound...])
        XCTAssertTrue(chrome.contains("Image(systemName: TerminalMenuControl.symbol)"))
        XCTAssertTrue(chrome.contains(".foregroundStyle(Tokens.accent)"))
        XCTAssertTrue(chrome.contains(".accessibilityLabel(Text(verbatim: Copy.more))"))
        XCTAssertTrue(chrome.contains(".accessibilityIdentifier(ID.terminalMenu)"))
        // The ⋯ draws no word of its own: a symbol, spoken `More`.
        XCTAssertFalse(chrome.contains("Words("))
    }

    /// Clause (D23): the Mac's confirmation is attached to the MENU, outside
    /// its items, so it presents once the menu has closed; the press only
    /// asks for it, and it shows only over the Mac's own words.
    func testTheConfirmationIsOnTheMenuOutsideItsItems() throws {
        let control = try span("ios/Tortie/Screens/SessionScreen.swift", "struct TerminalMenuControl: View {")
        let open = try XCTUnwrap(control.range(of: "Menu {"))
        let label = try XCTUnwrap(control.range(of: "} label: {", range: open.upperBound..<control.endIndex))
        let items = String(control[open.upperBound..<label.lowerBound])
        XCTAssertFalse(items.contains(".endConfirmation("), "the confirmation is inside the menu's items")
        XCTAssertFalse(items.contains("confirmationDialog"))
        let after = String(control[label.upperBound...])
        let id = try XCTUnwrap(after.range(of: ".accessibilityIdentifier(ID.terminalMenu)"))
        let confirmation = try XCTUnwrap(after.range(of: ".endConfirmation(model: end, offer: offer, confirm: confirm, drawing: drawing, isPresented: $asking, reread: reread)"))
        XCTAssertLessThan(id.lowerBound, confirmation.lowerBound, "the confirmation is not in the menu's own chain")
        XCTAssertTrue(items.contains("guard drawing.confirm != nil else { return }\n                        asking = true"), "the press does more than ask for the Mac's words")
        XCTAssertEqual(control.components(separatedBy: "asking = true").count, 2, "something else asks for the confirmation")
    }

    /// Clause (D21): the Terminal's top bar holds ONE trailing item, the ⋯.
    func testTheMenuIsOneTopBarTrailingItem() throws {
        let menu = try span("ios/Tortie/Screens/SessionScreen.swift", "struct TerminalMenu: ToolbarContent {")
        XCTAssertEqual(menu.components(separatedBy: "ToolbarItem(").count, 2)
        XCTAssertTrue(menu.contains("ToolbarItem(placement: .topBarTrailing) {\n            TerminalMenuControl(end: end, offer: offer, confirm: confirm, reread: reread, openCatchUp: openCatchUp)"))
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

    // MARK: Words and names

    /// Clause (D27, D28): the ⋯'s spoken name is the phone's one new word,
    /// `More`, owned by the phone; the menu's other words are the Mac's; and
    /// the four names a drive finds them by.
    func testTheWordsAndTheNames() throws {
        XCTAssertEqual(Copy.more, "More")
        let entries = StyleSource.copyEntries(try StyleSource.text("ios/Tortie/Style/Copy.swift")).entries
        let more = try XCTUnwrap(entries.first(where: { $0.name == "more" }))
        let end = try XCTUnwrap(entries.first(where: { $0.name == "endSessionMenu" }))
        let catchUp = try XCTUnwrap(entries.first(where: { $0.name == "catchMeUp" }))
        guard case .phone? = more.owner else { return XCTFail("More is not the phone's word") }
        guard case .mac? = end.owner else { return XCTFail("End session… is not the Mac's word") }
        guard case .mac? = catchUp.owner else { return XCTFail("Catch Me Up is not the Mac's word") }
        XCTAssertEqual(ID.terminalMenu, "terminal-menu")
        XCTAssertEqual(ID.terminalMenuCatchUp, "terminal-menu-catch-up")
        XCTAssertEqual(ID.terminalMenuEnd, "terminal-menu-end")
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
