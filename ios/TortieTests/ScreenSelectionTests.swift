import SwiftUI
import XCTest
@testable import Tortie

/// Selecting on the Screen, and Copy (Phase 337, build/p337/SPEC.md D34):
/// Paseo's gesture table row for row (terminal-selection-gesture.test.ts at
/// getpaseo/paseo 2f0cb2f, ported, not copied), the selection in reading
/// order, the hit test, one highlight per row, and the text a selection
/// copies, a wide cell's character once. Each test names the clause it holds
/// and fails when that clause is taken out of Screens/ScreenSelection.swift.
final class ScreenSelectionTests: XCTestCase {
    private let tolerance = ScreenGesture.tapTolerance
    private let scroll = ScreenGesture.verticalScroll

    /// Clause: the constants, 8 points, 450 ms and 12 points.
    func testTheConstants() {
        XCTAssertEqual(ScreenGesture.tapTolerance, 8)
        XCTAssertEqual(ScreenGesture.longPress, .milliseconds(450))
        XCTAssertEqual(ScreenGesture.longPressSeconds, 0.45)
        XCTAssertEqual(ScreenGesture.verticalScroll, 12)
    }

    /// Clause: the intent table, row for row.
    func testTheIntentTable() {
        let rows: [(String, ScreenGesture.Status, CGFloat, CGFloat, ScreenGesture.Intent)] = [
            ("a motionless press is a tap", .pressing, 0, 0, .tap),
            ("jitter inside the tolerance is a tap", .pressing, tolerance - 4, tolerance - 4, .tap),
            ("horizontal movement is left to selection", .pressing, tolerance + 20, 4, .pending),
            ("a slow horizontal dwell does not select", .pressing, tolerance + 40, 3, .pending),
            ("tiny horizontal jitter is a tap", .pressing, tolerance - 1, 1, .tap),
            ("horizontal movement below navigation is pending", .pressing, tolerance + 10, 2, .pending),
            ("a clearly vertical drag scrolls", .pressing, 4, scroll + 5, .scroll),
            ("a fast rightward swipe does not navigate", .pressing, tolerance + 40, 4, .pending),
            ("a fast leftward swipe does not navigate", .pressing, -(tolerance + 40), -4, .pending),
            ("movement inside the tolerance does not navigate", .pressing, tolerance - 1, 2, .tap),
            ("selection holds once it is active", .selecting, 100, 50, .select),
        ]
        for (name, status, dx, dy, want) in rows {
            XCTAssertEqual(ScreenGesture.intent(status, dx: dx, dy: dy), want, name)
        }
    }

    /// Clause: the release table, row for row.
    func testTheReleaseTable() {
        let long = ScreenGesture.longPress
        let rows: [(String, ScreenGesture.Status, Bool, Bool, Bool, Duration, ScreenGesture.Action)] = [
            ("a tap focuses", .pressing, false, false, false, .milliseconds(80), .focus),
            ("a long press selects", .pressing, false, false, false, long + .milliseconds(50), .select),
            ("a 500 ms hold selects", .pressing, false, false, false, .milliseconds(500), .select),
            ("a 400 ms press is a tap", .pressing, false, false, false, .milliseconds(400), .focus),
            ("a scroll does nothing", .pressing, false, true, true, .milliseconds(80), .none),
            ("selecting does nothing", .selecting, false, false, true, .milliseconds(80), .none),
            ("a short tap clears a selection", .selecting, true, false, false, .milliseconds(80), .clear),
            ("the long press's own selection is kept", .selecting, false, false, false, long + .milliseconds(50), .none),
            ("an undecided drag does not focus", .pressing, false, false, true, .milliseconds(80), .none),
            ("idle does nothing", .idle, false, false, false, .milliseconds(80), .none),
        ]
        for (name, status, started, scrolled, moved, pressed, want) in rows {
            XCTAssertEqual(
                ScreenGesture.release(status, startedWithSelection: started, didScroll: scrolled, movedBeyondTapTolerance: moved, pressed: pressed),
                want, name
            )
        }
    }

    /// Clause: a selection is its anchor and its focus in reading order, the
    /// anchor held while the focus moves.
    func testASelectionGrowsFromItsAnchor() {
        var model = ScreenSelectionModel()
        XCTAssertTrue(model.isEmpty)
        model.begin(at: ScreenPoint(row: 2, column: 5))
        XCTAssertEqual(model.range, ScreenSelectionRange(start: ScreenPoint(row: 2, column: 5), end: ScreenPoint(row: 2, column: 5)))
        model.update(to: ScreenPoint(row: 1, column: 3))
        XCTAssertEqual(model.range, ScreenSelectionRange(start: ScreenPoint(row: 1, column: 3), end: ScreenPoint(row: 2, column: 5)))
        model.update(to: ScreenPoint(row: 2, column: 8))
        XCTAssertEqual(model.range, ScreenSelectionRange(start: ScreenPoint(row: 2, column: 5), end: ScreenPoint(row: 2, column: 8)))
        model.clear()
        XCTAssertTrue(model.isEmpty)
    }

    /// Clause: a point is the cell under it, and nothing outside the grid.
    func testAPointIsTheCellUnderIt() {
        let cell = ScreenCell(fontSize: 10, width: 6, height: 12)
        XCTAssertEqual(ScreenSelecting.hit(CGPoint(x: 0, y: 0), cell: cell, columns: 4, rows: 2), ScreenPoint(row: 0, column: 0))
        XCTAssertEqual(ScreenSelecting.hit(CGPoint(x: 13, y: 13), cell: cell, columns: 4, rows: 2), ScreenPoint(row: 1, column: 2))
        XCTAssertNil(ScreenSelecting.hit(CGPoint(x: 24, y: 0), cell: cell, columns: 4, rows: 2))
        XCTAssertNil(ScreenSelecting.hit(CGPoint(x: 0, y: 24), cell: cell, columns: 4, rows: 2))
        XCTAssertNil(ScreenSelecting.hit(CGPoint(x: -1, y: 0), cell: cell, columns: 4, rows: 2))
        XCTAssertNil(ScreenSelecting.hit(CGPoint(x: CGFloat.infinity, y: 0), cell: cell, columns: 4, rows: 2))
    }

    /// Clause: one highlight rectangle per selected row: the first row from
    /// its column, the middle rows whole, the last row to its column.
    func testOneHighlightPerRow() {
        let cell = ScreenCell(fontSize: 10, width: 6, height: 12)
        let range = ScreenSelectionRange(start: ScreenPoint(row: 0, column: 2), end: ScreenPoint(row: 2, column: 1))
        XCTAssertEqual(ScreenSelecting.rects(range, cell: cell, columns: 4), [
            CGRect(x: 12, y: 0, width: 12, height: 12),
            CGRect(x: 0, y: 12, width: 24, height: 12),
            CGRect(x: 0, y: 24, width: 12, height: 12),
        ])
        XCTAssertEqual(ScreenSelecting.rects(nil, cell: cell, columns: 4), [])
    }

    /// Clause: the selected text is each row's cells joined, trailing blanks
    /// dropped, rows joined by a line break; a wide cell's character once.
    func testTheSelectedTextTakesAWideCellOnce() throws {
        let wide = String(Character(try XCTUnwrap(Unicode.Scalar(0x4E2D))))
        let picture = ScreenSample.picture(
            lines: [
                [["text": "ab", "style": 0, "cells": 2], ["text": wide, "style": 0, "cells": 2]],
                [["text": "cd  ", "style": 0, "cells": 4]],
            ]
        )
        let all = ScreenSelectionRange(start: ScreenPoint(row: 0, column: 0), end: ScreenPoint(row: 1, column: 3))
        XCTAssertEqual(ScreenSelecting.text(all, in: picture), "ab" + wide + "\n" + "cd")
        let half = ScreenSelectionRange(start: ScreenPoint(row: 0, column: 1), end: ScreenPoint(row: 0, column: 2))
        XCTAssertEqual(ScreenSelecting.text(half, in: picture), "b" + wide)
        XCTAssertEqual(ScreenSelecting.text(nil, in: picture), "")
    }

    /// Clause (conformance:ios rule al): `UIPasteboard` is named only in
    /// Screens/ScreenSelection.swift and only written there; nothing in the
    /// app reads it.
    func testThePasteboardIsWrittenAndNeverRead() throws {
        let files = ["App/TortieApp.swift", "Screens/Screen.swift", "Screens/ScreenGrid.swift", "Screens/ScreenKeyField.swift",
                     "Screens/ScreenKeys.swift", "Screens/ScreenRows.swift", "Screens/SessionScreen.swift", "Door/DoorClient.swift"]
        for file in files {
            XCTAssertFalse(try StyleSource.text("ios/Tortie/" + file).contains("UIPasteboard"), file)
        }
        let selection = try StyleSource.text("ios/Tortie/Screens/ScreenSelection.swift")
        let code = selection.components(separatedBy: "\n").filter { !$0.trimmingCharacters(in: .whitespaces).hasPrefix("//") }.joined(separator: "\n")
        XCTAssertEqual(code.components(separatedBy: "UIPasteboard").count, 2, "one mention, the write")
        XCTAssertTrue(code.contains("UIPasteboard.general.string = text"))
        for read in [".strings", ".items", "hasStrings", "detectPatterns", ".changeCount", "= UIPasteboard"] {
            XCTAssertFalse(code.contains(read), read)
        }
    }
}
