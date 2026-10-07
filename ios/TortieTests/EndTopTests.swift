import SwiftUI
import XCTest
@testable import Tortie

/// End at the top right (Phase 337, build/p337/SPEC.md D33): the same End,
/// owner check and Mac confirmation as Phase 317's, now the navigation bar's
/// trailing item, its one line under the session's status, and no bar at the
/// bottom; since Phase 337.1 on both of a session's faces, the Terminal and
/// Catch Me Up. Each test names the clause it holds and fails when that
/// clause is taken out of Screens/EndBar.swift, Screens/SessionScreen.swift
/// or Screens/ConversationScreen.swift.
@MainActor
final class EndTopTests: XCTestCase {
    /// Clause: End's word at the top is `End`, and `Ending…` while the write
    /// runs; its states are 317's.
    func testTheWordAndTheStates() {
        let on = EndBarDrawing(offer: .offered(batch: true), confirm: WriteAnswers.confirm, kind: .faceID, phase: .idle, line: nil)
        XCTAssertEqual(on.label, Copy.endTop)
        XCTAssertEqual(on.row, .on)
        XCTAssertEqual(on.confirm, WriteAnswers.confirm)
        let writing = EndBarDrawing(offer: .offered(batch: true), confirm: WriteAnswers.confirm, kind: .faceID, phase: .writing, line: nil)
        XCTAssertEqual(writing.label, Copy.ending)
        XCTAssertEqual(writing.row, .off)
        let passcode = EndBarDrawing(offer: .offered(batch: true), confirm: WriteAnswers.confirm, kind: .none, phase: .idle, line: nil)
        XCTAssertEqual(passcode.row, .off)
        XCTAssertEqual(passcode.line, Copy.endNeedsPasscode)
        XCTAssertNil(EndBarDrawing(offer: .none, confirm: nil, kind: .faceID, phase: .idle, line: nil).row)
    }

    /// Clause: End is a toolbar item at the top right, in EndBar.swift: the
    /// `ID.sessionEnd` Button, `.disabled(row == .off)`, inside
    /// `ToolbarItem(placement: .topBarTrailing)`; and since Phase 337.1 BOTH
    /// of a session's faces put it there: the Terminal as its last trailing
    /// item, after the Catch Me Up icon, so End is rightmost (D17), and Catch
    /// Me Up in its toolbar (D20).
    func testEndIsTheTopBarsTrailingItemOnBothFaces() throws {
        let bar = try StyleSource.text("ios/Tortie/Screens/EndBar.swift")
        XCTAssertTrue(bar.contains("ToolbarItem(placement: .topBarTrailing)"))
        XCTAssertTrue(bar.contains(".disabled(row == .off)"))
        XCTAssertEqual(bar.components(separatedBy: ".accessibilityIdentifier(ID.sessionEnd)").count, 2)
        let session = try StyleSource.text("ios/Tortie/Screens/SessionScreen.swift")
        let terminal = try XCTUnwrap(session.range(of: "struct TerminalPage: View {"))
        let trailing = try XCTUnwrap(session.range(of: "} trailing: {", range: terminal.upperBound..<session.endIndex))
        let icon = try XCTUnwrap(session.range(of: "CatchUpItem {", range: trailing.upperBound..<session.endIndex))
        let end = try XCTUnwrap(session.range(of: "EndTopItem(", range: trailing.upperBound..<session.endIndex))
        XCTAssertLessThan(icon.lowerBound, end.lowerBound, "End is not after the Catch Me Up icon, so it is not rightmost")
        let conversation = try StyleSource.text("ios/Tortie/Screens/ConversationScreen.swift")
        let toolbar = try XCTUnwrap(conversation.range(of: ".toolbar {"))
        let item = try XCTUnwrap(conversation.range(of: "EndTopItem(", range: toolbar.upperBound..<conversation.endIndex))
        XCTAssertLessThan(toolbar.lowerBound, item.lowerBound)
    }

    /// Clause: the bar at the bottom is gone: Catch Me Up's bottom inset holds
    /// the message box alone, the Terminal draws none, and no identifier names
    /// an End bar.
    func testTheBottomBarIsGone() throws {
        let conversation = try StyleSource.text("ios/Tortie/Screens/ConversationScreen.swift")
        let inset = try XCTUnwrap(conversation.range(of: ".safeAreaInset(edge: .bottom"))
        let after = conversation[inset.upperBound...]
        let close = try XCTUnwrap(after.range(of: ".accessibilityElement"))
        let body = String(after[after.startIndex..<close.lowerBound])
        XCTAssertTrue(body.contains("MessageStrip("))
        XCTAssertFalse(body.contains("End"), "End is still drawn at the bottom")
        let session = try StyleSource.text("ios/Tortie/Screens/SessionScreen.swift")
        XCTAssertFalse(session.contains(".safeAreaInset(edge: .bottom"), "the Terminal draws something at its foot besides its tray")
        let identifiers = try StyleSource.text("ios/Tortie/Screens/Identifiers.swift")
        XCTAssertFalse(identifiers.contains("static let sessionEndBar"))
        XCTAssertFalse(try StyleSource.text("ios/Tortie/Screens/EndBar.swift").contains("struct EndBar: View"))
    }

    /// Clause: End's one line is drawn under the status, on both faces: under
    /// the Terminal's status line, and under the now card's status, above its
    /// card.
    func testTheLineIsUnderTheStatus() throws {
        let session = try StyleSource.text("ios/Tortie/Screens/SessionScreen.swift")
        let terminal = try XCTUnwrap(session.range(of: "struct TerminalPage: View {"))
        let statusLine = try XCTUnwrap(session.range(of: "StatusLine(drawing: drawing)", range: terminal.upperBound..<session.endIndex))
        let terminalEnd = try XCTUnwrap(session.range(of: "EndLine(model: end", range: statusLine.upperBound..<session.endIndex))
        let tray = try XCTUnwrap(session.range(of: "} tray: {", range: statusLine.upperBound..<session.endIndex))
        XCTAssertLessThan(terminalEnd.lowerBound, tray.lowerBound, "End's line is not in the Terminal's header, under its status line")
        let now = try XCTUnwrap(session.range(of: "struct NowCard: View {"))
        let status = try XCTUnwrap(session.range(of: "            status\n", range: now.upperBound..<session.endIndex))
        let line = try XCTUnwrap(session.range(of: "EndLine(model: end", range: status.upperBound..<session.endIndex))
        let card = try XCTUnwrap(session.range(of: "if drawing.hasCard { card }", range: status.upperBound..<session.endIndex))
        XCTAssertLessThan(line.lowerBound, card.lowerBound)
    }

    /// Clause (Phase 337.1, D16): no session page draws a row to open the
    /// conversation or the screen any more: a running session opens on its
    /// Terminal, and Catch Me Up is an icon. The answer's `screen` still
    /// reads false from a Mac older than 337, which is what sends such a
    /// session to Catch Me Up.
    func testNoRowOpensTheConversationOrTheScreen() throws {
        let session = try StyleSource.text("ios/Tortie/Screens/SessionScreen.swift")
        XCTAssertFalse(session.contains("conversationRow"))
        XCTAssertFalse(session.contains("screenRow("))
        XCTAssertFalse(session.contains("struct SessionScreen: View"), "the 337 session page is still declared")
        let drawn = try SessionDrawing(Answers.detail(Answers.row("s")))
        XCTAssertFalse(drawn.screen, "a Mac older than 337 has no terminal")
        var detail = Answers.detail(Answers.row("s"))
        detail.screen = true
        XCTAssertTrue(try SessionDrawing(detail).screen)
    }

    /// Clause: a reader with no Screen (the tests' fakes, See a Sample until
    /// 333.3) answers no Screen door; the paired reader answers one that
    /// takes keys.
    func testOnlyAPairedReaderHasAScreen() {
        XCTAssertNil(ScriptedReader().screenDoor("s"))
    }
}
