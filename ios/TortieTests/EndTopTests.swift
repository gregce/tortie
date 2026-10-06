import SwiftUI
import XCTest
@testable import Tortie

/// End at the top right (Phase 337, build/p337/SPEC.md D33): the same End,
/// owner check and Mac confirmation as Phase 317's, now the navigation bar's
/// trailing item, its one line under the session's status, and no bar at the
/// bottom. Each test names the clause it holds and fails when that clause is
/// taken out of Screens/EndBar.swift or Screens/SessionScreen.swift.
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
    /// `ToolbarItem(placement: .topBarTrailing)`, and the Session screen puts
    /// it in its toolbar.
    func testEndIsTheTopBarsTrailingItem() throws {
        let bar = try StyleSource.text("ios/Tortie/Screens/EndBar.swift")
        XCTAssertTrue(bar.contains("ToolbarItem(placement: .topBarTrailing)"))
        XCTAssertTrue(bar.contains(".disabled(row == .off)"))
        XCTAssertEqual(bar.components(separatedBy: ".accessibilityIdentifier(ID.sessionEnd)").count, 2)
        let session = try StyleSource.text("ios/Tortie/Screens/SessionScreen.swift")
        let toolbar = try XCTUnwrap(session.range(of: ".toolbar {"))
        let item = try XCTUnwrap(session.range(of: "EndTopItem(", range: toolbar.upperBound..<session.endIndex))
        XCTAssertLessThan(toolbar.lowerBound, item.lowerBound)
    }

    /// Clause: the bar at the bottom is gone: the bottom inset holds the
    /// message box alone, and no identifier names an End bar.
    func testTheBottomBarIsGone() throws {
        let session = try StyleSource.text("ios/Tortie/Screens/SessionScreen.swift")
        let inset = try XCTUnwrap(session.range(of: ".safeAreaInset(edge: .bottom"))
        let after = session[inset.upperBound...]
        let close = try XCTUnwrap(after.range(of: ".accessibilityElement"))
        let body = String(after[after.startIndex..<close.lowerBound])
        XCTAssertTrue(body.contains("MessageStrip("))
        XCTAssertFalse(body.contains("End"), "End is still drawn at the bottom")
        let identifiers = try StyleSource.text("ios/Tortie/Screens/Identifiers.swift")
        XCTAssertFalse(identifiers.contains("static let sessionEndBar"))
        XCTAssertFalse(try StyleSource.text("ios/Tortie/Screens/EndBar.swift").contains("struct EndBar: View"))
    }

    /// Clause: End's one line is drawn under the status.
    func testTheLineIsUnderTheStatus() throws {
        let session = try StyleSource.text("ios/Tortie/Screens/SessionScreen.swift")
        let status = try XCTUnwrap(session.range(of: "            status\n"))
        let line = try XCTUnwrap(session.range(of: "EndLine(model: end", range: status.upperBound..<session.endIndex))
        let card = try XCTUnwrap(session.range(of: "if drawing.hasCard { card }", range: status.upperBound..<session.endIndex))
        XCTAssertLessThan(line.lowerBound, card.lowerBound)
    }

    /// Clause (D32): the Screen row is drawn under Conversation, and only
    /// when the Mac says the session has one and the reader has a Screen.
    func testTheScreenRowIsUnderConversation() throws {
        let session = try StyleSource.text("ios/Tortie/Screens/SessionScreen.swift")
        let conversation = try XCTUnwrap(session.range(of: "            conversationRow\n"))
        let screen = try XCTUnwrap(session.range(of: "if drawing.screen, let openScreen { screenRow(openScreen) }"))
        XCTAssertLessThan(conversation.lowerBound, screen.lowerBound)
        let drawn = try SessionDrawing(Answers.detail(Answers.row("s")))
        XCTAssertFalse(drawn.screen, "a Mac older than 337 draws no Screen row")
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
