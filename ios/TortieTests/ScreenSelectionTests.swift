import SwiftUI
import XCTest
@testable import Tortie

/// Selecting on the Terminal, the pure half (Phase 337, build/p337/SPEC.md
/// D34; Phase 337.1, build/p3371/SPEC.md D31; Phase 337.5, build/p3375/SPEC.md
/// D2 to D5, D11 and D14): the long press's wait, the word a press takes, the
/// carets UIKit speaks and the cells the page holds, a press growing from its
/// word and a handle moving its end, what a tap means, the hit test, one
/// highlight per row, the text a selection copies by absolute index (a wide
/// cell's character once, Copy waiting on a reserved row), and the pasteboard
/// written once and never read. Each test names the clause it holds and fails
/// when that clause is taken out of Screens/ScreenSelection.swift.
final class ScreenSelectionTests: XCTestCase {
    private func range(_ r0: Int, _ c0: Int, _ r1: Int, _ c1: Int) -> ScreenSelectionRange {
        ScreenSelectionRange(start: ScreenPoint(row: r0, column: c0), end: ScreenPoint(row: r1, column: c1))
    }

    private func caret(_ row: Int, _ column: Int) -> ScreenCaret {
        ScreenCaret(row: row, column: column)
    }

    /// One cell per character, as a row of ASCII is.
    private func cells(_ text: String) -> [String] {
        text.map { String($0) }
    }

    /// Clause: the long press waits 450 ms, Paseo's, as UIKit's recogniser
    /// takes it.
    func testTheLongPressWaits450Milliseconds() {
        XCTAssertEqual(ScreenGesture.longPressSeconds, 0.45)
    }

    // MARK: The word (D4)

    /// Clause (D4): a word is the run of cells around the pressed one that
    /// are not blank, so a path, a flag and the last word of a row come whole
    /// from any cell of them; a blank cell, or a cell past the row's cells,
    /// selects itself alone.
    func testAWordIsTheRunOfCellsThatAreNotBlank() {
        let row = cells("$ ls /usr/local/bin/tool-1205 --flag=2 done.")
        let path = range(7, 5, 7, 28)
        for column in [5, 9, 20, 28] {
            XCTAssertEqual(ScreenSelecting.word(at: ScreenPoint(row: 7, column: column), cells: row), path, "the path from column \(column)")
        }
        XCTAssertEqual(ScreenSelecting.text(path, columns: 80) { $0 == 7 ? row : nil }, "/usr/local/bin/tool-1205")
        XCTAssertEqual(ScreenSelecting.word(at: ScreenPoint(row: 7, column: 33), cells: row), range(7, 30, 7, 37), "the flag whole")
        XCTAssertEqual(ScreenSelecting.word(at: ScreenPoint(row: 7, column: 0), cells: row), range(7, 0, 7, 0), "the row's first cell")
        XCTAssertEqual(ScreenSelecting.word(at: ScreenPoint(row: 7, column: 41), cells: row), range(7, 39, 7, 43), "the word that ends the row")
        XCTAssertEqual(ScreenSelecting.word(at: ScreenPoint(row: 7, column: 4), cells: row), range(7, 4, 7, 4), "a blank cell alone")
        XCTAssertEqual(ScreenSelecting.word(at: ScreenPoint(row: 7, column: 70), cells: row), range(7, 70, 7, 70), "a cell past the row's cells alone")
        XCTAssertEqual(ScreenSelecting.word(at: ScreenPoint(row: 7, column: 3), cells: []), range(7, 3, 7, 3), "a reserved row's cell alone")
    }

    /// Clause (D4): a wide character's second column, which holds nothing,
    /// is not blank, so a press on either column takes the character with its
    /// word, and a wide character at the row's end is whole.
    func testAWideCharactersTwoColumnsAreOneWord() throws {
        let wide = String(Character(try XCTUnwrap(Unicode.Scalar(0x4E2D))))
        let row = ["a", wide, "", "b", " ", wide, ""]
        XCTAssertEqual(ScreenSelecting.word(at: ScreenPoint(row: 0, column: 2), cells: row), range(0, 0, 0, 3), "pressed on the empty column")
        XCTAssertEqual(ScreenSelecting.word(at: ScreenPoint(row: 0, column: 1), cells: row), range(0, 0, 0, 3))
        XCTAssertEqual(ScreenSelecting.word(at: ScreenPoint(row: 0, column: 6), cells: row), range(0, 5, 0, 6), "the wide character ending the row")
        XCTAssertEqual(ScreenSelecting.text(range(0, 0, 0, 3), columns: 7) { _ in row }, "a" + wide + "b", "its character once")
    }

    // MARK: Carets and cells (D2)

    /// Clause (D2): a selection's carets are before its start cell and after
    /// its end cell, and the cells between two carets, in either order, are
    /// the selection again; a caret at column 0 ends on the row above at its
    /// last column, a caret after a row's last cell starts on the row below,
    /// and no cell between two carets is no range.
    func testCaretsAndCellsConvertBothWays() throws {
        let selected = range(3, 2, 5, 7)
        let carets = try XCTUnwrap(selected.carets)
        XCTAssertEqual(carets.start, caret(3, 2))
        XCTAssertEqual(carets.end, caret(5, 8))
        XCTAssertEqual(ScreenSelectionRange.between(carets.start, carets.end, columns: 10), selected)
        XCTAssertEqual(ScreenSelectionRange.between(carets.end, carets.start, columns: 10), selected, "the later caret first")
        XCTAssertEqual(ScreenSelectionRange.between(caret(3, 2), caret(5, 0), columns: 10), range(3, 2, 4, 9), "a caret at column 0")
        XCTAssertEqual(ScreenSelectionRange.between(caret(3, 10), caret(5, 3), columns: 10), range(4, 0, 5, 2), "a caret after the row's last cell")
        XCTAssertEqual(ScreenSelectionRange.between(caret(4, 0), caret(4, 10), columns: 10), range(4, 0, 4, 9), "a whole row")
        XCTAssertEqual(ScreenSelectionRange.between(caret(3, 2), caret(3, 3), columns: 10), range(3, 2, 3, 2), "one cell")
        XCTAssertNil(ScreenSelectionRange.between(caret(3, 2), caret(3, 2), columns: 10), "no cell between equal carets")
        XCTAssertNil(ScreenSelectionRange.between(caret(3, 10), caret(4, 0), columns: 10), "no cell between a row's end and the next row's start")
        XCTAssertNil(ScreenSelectionRange.between(caret(0, 0), caret(0, 4), columns: 0), "no width")
        XCTAssertNil(range(3, 2, 3, Int.max).carets, "an end that cannot be counted one further")
        // Every selection round trips, the deep indices of a history among them.
        for (r0, c0, r1, c1) in [(0, 0, 0, 0), (0, 119, 1, 0), (2_900, 3, 3_039, 119), (99_999, 0, 100_000, 511)] {
            let one = range(r0, c0, r1, c1)
            let ends = try XCTUnwrap(one.carets)
            XCTAssertEqual(ScreenSelectionRange.between(ends.start, ends.end, columns: 512), one, "\(one)")
        }
    }

    // MARK: Growing and moving (D3, D5)

    /// Clause (D3): a press grows from the word it pressed, and the word
    /// stays selected: a cell before it moves the start, after it the end,
    /// inside it keeps the word.
    func testAPressGrowsFromTheWordItPressed() {
        let word = range(5, 10, 5, 20)
        XCTAssertEqual(word.extending(to: ScreenPoint(row: 5, column: 15)), word, "inside")
        XCTAssertEqual(word.extending(to: ScreenPoint(row: 5, column: 10)), word)
        XCTAssertEqual(word.extending(to: ScreenPoint(row: 5, column: 20)), word)
        XCTAssertEqual(word.extending(to: ScreenPoint(row: 5, column: 25)), range(5, 10, 5, 25), "after it")
        XCTAssertEqual(word.extending(to: ScreenPoint(row: 8, column: 1)), range(5, 10, 8, 1), "rows below")
        XCTAssertEqual(word.extending(to: ScreenPoint(row: 5, column: 3)), range(5, 3, 5, 20), "before it, the word kept")
        XCTAssertEqual(word.extending(to: ScreenPoint(row: 2, column: 40)), range(2, 40, 5, 20), "rows above")
    }

    /// Clause (D5): a handle moves its own end to the cell under the finger
    /// and the other end stays; crossing the other end swaps which end it
    /// holds, so the same handle carries on from there.
    func testAHandleMovesItsEndAndCrossingSwapsIt() {
        let held = range(5, 10, 5, 20)
        XCTAssertTrue(held.moving(.end, to: ScreenPoint(row: 8, column: 4)) == (range(5, 10, 8, 4), .end))
        XCTAssertTrue(held.moving(.end, to: ScreenPoint(row: 5, column: 10)) == (range(5, 10, 5, 10), .end), "onto the start: one cell")
        XCTAssertTrue(held.moving(.end, to: ScreenPoint(row: 5, column: 3)) == (range(5, 3, 5, 10), .start), "crossing the start")
        XCTAssertTrue(held.moving(.start, to: ScreenPoint(row: 2, column: 0)) == (range(2, 0, 5, 20), .start))
        XCTAssertTrue(held.moving(.start, to: ScreenPoint(row: 5, column: 20)) == (range(5, 20, 5, 20), .start), "onto the end: one cell")
        XCTAssertTrue(held.moving(.start, to: ScreenPoint(row: 6, column: 0)) == (range(5, 20, 6, 0), .end), "crossing the end")
        // One drag that crosses and comes back: the end it holds after
        // crossing carries on, and the end it crossed is where it was.
        var (moving, end) = held.moving(.end, to: ScreenPoint(row: 4, column: 0))
        XCTAssertEqual(moving, range(4, 0, 5, 10))
        (moving, end) = moving.moving(end, to: ScreenPoint(row: 3, column: 7))
        XCTAssertEqual(moving, range(3, 7, 5, 10))
        (moving, end) = moving.moving(end, to: ScreenPoint(row: 6, column: 2))
        XCTAssertEqual(moving, range(5, 10, 6, 2))
        XCTAssertEqual(end, .end)
    }

    // MARK: The tap (D11)

    /// Clause (D11): with no selection a tap raises the keyboard wherever it
    /// lands; with one, a tap on a selected cell shows the menu and a tap
    /// anywhere else, outside the rows included, clears it.
    func testTheTapTable() {
        XCTAssertEqual(ScreenSelecting.tap(selection: nil, at: ScreenPoint(row: 3, column: 4)), .focus)
        XCTAssertEqual(ScreenSelecting.tap(selection: nil, at: nil), .focus, "outside the rows")
        let held = range(3, 5, 5, 2)
        let rows: [(String, ScreenPoint?, ScreenTap)] = [
            ("its first cell", ScreenPoint(row: 3, column: 5), .menu),
            ("before it on its first row", ScreenPoint(row: 3, column: 4), .clear),
            ("its first row's last column", ScreenPoint(row: 3, column: 119), .menu),
            ("a middle row, whole", ScreenPoint(row: 4, column: 0), .menu),
            ("a middle row's far column", ScreenPoint(row: 4, column: 300), .menu),
            ("its last cell", ScreenPoint(row: 5, column: 2), .menu),
            ("after it on its last row", ScreenPoint(row: 5, column: 3), .clear),
            ("the row above", ScreenPoint(row: 2, column: 9), .clear),
            ("the row below", ScreenPoint(row: 6, column: 0), .clear),
            ("outside the rows", nil, .clear),
        ]
        for (name, point, want) in rows {
            XCTAssertEqual(ScreenSelecting.tap(selection: held, at: point), want, name)
        }
    }

    // MARK: Kept from 337 and 337.1

    /// Clause: a point is the cell under it, and nothing outside the rows
    /// laid out; since Phase 337.1 (D31) its row is the ABSOLUTE index, the
    /// layout's first index plus the rows down, hit by arithmetic in the
    /// content's own coordinates.
    func testAPointIsTheCellUnderIt() {
        let cell = ScreenCell(fontSize: 10, width: 6, height: 12)
        XCTAssertEqual(ScreenSelecting.hit(CGPoint(x: 0, y: 0), cell: cell, columns: 4, first: 0, rows: 2), ScreenPoint(row: 0, column: 0))
        XCTAssertEqual(ScreenSelecting.hit(CGPoint(x: 13, y: 13), cell: cell, columns: 4, first: 0, rows: 2), ScreenPoint(row: 1, column: 2))
        XCTAssertEqual(ScreenSelecting.hit(CGPoint(x: 13, y: 13), cell: cell, columns: 4, first: 2_900, rows: 140), ScreenPoint(row: 2_901, column: 2), "an absolute index")
        XCTAssertNil(ScreenSelecting.hit(CGPoint(x: 24, y: 0), cell: cell, columns: 4, first: 0, rows: 2))
        XCTAssertNil(ScreenSelecting.hit(CGPoint(x: 0, y: 24), cell: cell, columns: 4, first: 0, rows: 2))
        XCTAssertNil(ScreenSelecting.hit(CGPoint(x: -1, y: 0), cell: cell, columns: 4, first: 0, rows: 2))
        XCTAssertNil(ScreenSelecting.hit(CGPoint(x: CGFloat.infinity, y: 0), cell: cell, columns: 4, first: 0, rows: 2))
        XCTAssertNil(ScreenSelecting.hit(CGPoint(x: 0, y: CGFloat.infinity), cell: cell, columns: 4, first: 0, rows: 2))
    }

    /// Clause: one highlight rectangle per selected row: the first row from
    /// its column, the middle rows whole, the last row to its column, placed
    /// from the layout's first index (D31). UIKit's selection reads these
    /// (Screens/ScreenTextInput.swift).
    func testOneHighlightPerRow() {
        let cell = ScreenCell(fontSize: 10, width: 6, height: 12)
        let range = self.range(0, 2, 2, 1)
        XCTAssertEqual(ScreenSelecting.rects(range, cell: cell, columns: 4), [
            CGRect(x: 12, y: 0, width: 12, height: 12),
            CGRect(x: 0, y: 12, width: 24, height: 12),
            CGRect(x: 0, y: 24, width: 12, height: 12),
        ])
        XCTAssertEqual(ScreenSelecting.rects(nil, cell: cell, columns: 4), [])
        let deep = self.range(2_901, 0, 2_901, 3)
        XCTAssertEqual(ScreenSelecting.rects(deep, cell: cell, columns: 4, first: 2_900), [CGRect(x: 0, y: 12, width: 24, height: 12)])
    }

    /// Clause (D31, §Attack B11): the text is read by absolute index from
    /// whatever holds each row, and Copy is offered only while EVERY selected
    /// row is drawn: a row reserved and not yet fetched withholds it. The
    /// cells reader (the text input's) reads the same text.
    func testTheTextIsReadByIndexAndCopyWaitsForEveryRow() {
        let held: [Int: ScreenRowModel] = [
            2_900: ScreenRowModel(index: 2_900, runs: [ScreenRun(text: "L002901 ", styleIndex: 0, span: 8)], holds: { _ in true }),
            2_902: ScreenRowModel(index: 2_902, runs: [ScreenRun(text: "L002903", styleIndex: 0, span: 7)], holds: { _ in true }),
        ]
        let range = self.range(2_900, 0, 2_902, 6)
        XCTAssertFalse(ScreenSelecting.drawn(range) { held[$0] }, "row 2,901 is reserved: no Copy")
        var filled = held
        filled[2_901] = ScreenRowModel(index: 2_901, runs: [ScreenRun(text: "L002902", styleIndex: 0, span: 7)], holds: { _ in true })
        XCTAssertTrue(ScreenSelecting.drawn(range) { filled[$0] })
        XCTAssertEqual(ScreenSelecting.text(range, columns: 8) { filled[$0] }, "L002901\nL002902\nL002903")
        XCTAssertEqual(ScreenSelecting.text(range, columns: 8, cells: { filled[$0]?.cells }), "L002901\nL002902\nL002903", "the cells reader")
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
        XCTAssertEqual(ScreenSelecting.text(range(0, 0, 1, 3), in: picture), "ab" + wide + "\n" + "cd")
        XCTAssertEqual(ScreenSelecting.text(range(0, 1, 0, 2), in: picture), "b" + wide)
        XCTAssertEqual(ScreenSelecting.text(nil, in: picture), "")
    }

    /// Clause (conformance:ios rule al): `UIPasteboard` is named only in
    /// Screens/ScreenSelection.swift and only written there; nothing in the
    /// app reads it, the Terminal's text input (Phase 337.5) included.
    func testThePasteboardIsWrittenAndNeverRead() throws {
        let files = ["App/TortieApp.swift", "Screens/Screen.swift", "Screens/ScreenGrid.swift", "Screens/ScreenKeyField.swift",
                     "Screens/ScreenKeys.swift", "Screens/ScreenRows.swift", "Screens/SessionScreen.swift", "Door/DoorClient.swift",
                     "Screens/ScreenScroller.swift", "Screens/ScreenScrollback.swift", "Screens/ScreenTextInput.swift"]
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
