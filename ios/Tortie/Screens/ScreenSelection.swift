// Selecting on the Terminal, and Copy (Phase 337, build/p337/SPEC.md D34 and
// section 5.8.4; since Phase 337.5, build/p3375/SPEC.md D2 to D5, D11 and
// D14, the iPhone's own selection).
//
// WHAT THIS FILE IS SINCE PHASE 337.5. The pure half of the selection: the
// cells selected and the carets between them, the word a long press takes,
// how a press or a handle grows or moves a selection, what a tap means, the
// text Copy takes, and the ONE write of the iPhone's clipboard. Its UIKit
// half, UIKit's own handles, magnifier and edit menu over the rows, is
// Screens/ScreenTextInput.swift; the scroll view's long press, handle drag and
// tap read a point and hand it there (Screens/ScreenScroller.swift). Paseo's
// gesture tables (the tap tolerance, the vertical scroll threshold, the
// press, pending, select and scroll intents and the release actions) and the
// anchor-and-focus model left this file with 337.5: UIKit's selection
// replaced them, and the scroll view's own recognisers decide what a touch is.
//
// A POINT IS A CELL AND AN ABSOLUTE INDEX (Phase 337.1, build/p3371/SPEC.md
// D31). A point names its row by its index in the session's index space: a
// row of history by its own index, live row `r` of the held picture by
// `H + r`, never by its place in the layout, so a page reserved above moves no
// selection. The point is hit by arithmetic in the scroll view's own content
// coordinates (row `y / cellHeight` from the first row laid out, column
// `x / cellWidth`), and the text is read from the held rows and the live rows
// by index. A selection is two points, both included (D2). UIKit speaks
// CARETS, the places between cells: `ScreenCaret` is one, an absolute index
// and a column from 0 to the width, and `carets` and `between` convert, so
// nothing else changes shape.
//
// COPY IS OFFERED ONLY WHILE EVERY SELECTED ROW IS DRAWN: a selection that
// reaches rows not yet fetched waits for them, and never copies a blank line
// where a line of his was (§Attack B11 of 337.1; D10 of 337.5).
//
// WHAT IS PASEO'S (packages/app/src/terminal/native-renderer/
// terminal-selection-gesture.ts and terminal-selection.ts at getpaseo/paseo
// 2f0cb2f54be5742d6fc7e9b85ba39808ac22ad93, Apache-2.0, by the Paseo authors),
// ported to Swift with no Paseo code copied: the long press of 450 ms; the
// selection normalised into reading order; the hit test of a point to a cell;
// one highlight rectangle per row; and the selected text, each row's cells
// joined, trailing blanks dropped, rows joined by a line break.
//
// A LINE THE TERMINAL WRAPPED COPIES BACK AS ONE LINE (Phase 348,
// build/p348/SPEC.md D43 to D46): a row the Mac marked (tmux marked it
// wrapped, its last column holds ink, and it is on the main screen) is joined
// to the next row with no line break, its selected cells taken to its last
// column untrimmed, which is ink, so nothing is lost; every other row keeps
// today's trim and line break. STATED, never claimed fixed: a line tmux
// wrapped exactly at a written space keeps its break (tmux cannot tell a
// written space from a cell a clear left behind), a full-width overwrite with
// no erase keeps a stale mark and is joined, agents break their own lines,
// and a command zsh is still editing carries no mark.
//
// THE PASTEBOARD (conformance:ios rule al). This file writes it, once, on
// Copy, in one statement. Since Phase 348 (his ruling of 2026-10-18, "i'd
// like to be able to paste natively") the app READS it in exactly two places,
// the system's own paste command in the Terminal's two `paste(_:)` overrides
// (Screens/ScreenTextInput.swift and Screens/ScreenKeyField.swift), and asks
// `hasStrings` only inside their two `canPerformAction`s; nothing else names
// it.

import SwiftUI
import UIKit

// MARK: - The long press

enum ScreenGesture {
    /// The long press that starts a selection, in seconds, as UIKit's
    /// recogniser takes it: Paseo's 450 ms.
    static let longPressSeconds: Double = 0.45
}

// MARK: - The selection

/// A cell of the Terminal: its row, an ABSOLUTE index in the session's index
/// space (a history row's own, or `H + r` for live row `r`, D31), and its
/// column, from 0.
struct ScreenPoint: Equatable, Hashable, Sendable {
    let row: Int
    let column: Int
}

/// A selection in reading order: from `start` to `end`, both included.
struct ScreenSelectionRange: Equatable, Sendable {
    let start: ScreenPoint
    let end: ScreenPoint

    /// The anchor and the focus in reading order.
    static func normalised(anchor: ScreenPoint, focus: ScreenPoint) -> ScreenSelectionRange {
        let inOrder = anchor.row < focus.row || (anchor.row == focus.row && anchor.column <= focus.column)
        return inOrder ? ScreenSelectionRange(start: anchor, end: focus) : ScreenSelectionRange(start: focus, end: anchor)
    }

    /// The columns selected on `row`, or nil when the row is outside it.
    func columns(on row: Int, of width: Int) -> ClosedRange<Int>? {
        guard row >= start.row, row <= end.row, width > 0, let last = DoorNumber.difference(width, 1) else { return nil }
        let first = row == start.row ? min(start.column, last) : 0
        let final = row == end.row ? min(end.column, last) : last
        return first <= final ? first...final : nil
    }

    /// Whether `a` comes before `b` in reading order.
    static func precedes(_ a: ScreenPoint, _ b: ScreenPoint) -> Bool {
        a.row < b.row || (a.row == b.row && a.column < b.column)
    }
}

/// A caret: the place between two cells, as UIKit's text positions are
/// (Phase 337.5, D2). Its row is an absolute index; its column runs from 0,
/// before the row's first cell, to the width, after its last.
struct ScreenCaret: Equatable, Hashable, Sendable {
    let row: Int
    let column: Int

    /// Whether `a` comes before `b` in reading order.
    static func precedes(_ a: ScreenCaret, _ b: ScreenCaret) -> Bool {
        a.row < b.row || (a.row == b.row && a.column < b.column)
    }
}

/// Which end of a selection a handle holds (D5).
enum ScreenSelectionEnd: Sendable {
    case start
    case end
}

/// What a single tap means (D11): raise the keyboard, show the edit menu
/// over the selection, or clear it.
enum ScreenTap: Equatable, Sendable {
    case focus
    case menu
    case clear
}

extension ScreenSelectionRange {
    /// The carets at the selection's two ends: before its start cell and
    /// after its end cell. Nil only when the end's column cannot be counted
    /// one further.
    var carets: (start: ScreenCaret, end: ScreenCaret)? {
        guard let after = DoorNumber.sum(end.column, 1) else { return nil }
        return (ScreenCaret(row: start.row, column: start.column), ScreenCaret(row: end.row, column: after))
    }

    /// The cells between two carets, in reading order whichever is given
    /// first: from the cell after the earlier caret to the cell before the
    /// later one, where a caret at column 0 ends on the row above at its last
    /// column and a caret after a row's last cell starts on the row below.
    /// Nil when no cell lies between them.
    static func between(_ a: ScreenCaret, _ b: ScreenCaret, columns: Int) -> ScreenSelectionRange? {
        guard columns > 0, let last = DoorNumber.difference(columns, 1) else { return nil }
        let (first, final) = ScreenCaret.precedes(b, a) ? (b, a) : (a, b)
        let start: ScreenPoint
        if first.column >= columns {
            guard let below = DoorNumber.sum(first.row, 1) else { return nil }
            start = ScreenPoint(row: below, column: 0)
        } else {
            start = ScreenPoint(row: first.row, column: first.column)
        }
        let end: ScreenPoint
        if final.column == 0 {
            guard let above = DoorNumber.difference(final.row, 1) else { return nil }
            end = ScreenPoint(row: above, column: last)
        } else {
            guard let before = DoorNumber.difference(min(final.column, columns), 1) else { return nil }
            end = ScreenPoint(row: final.row, column: before)
        }
        guard !ScreenSelectionRange.precedes(end, start) else { return nil }
        return ScreenSelectionRange(start: start, end: end)
    }

    /// A long press growing from the word it pressed (D3): the receiver is
    /// that word, and it stays selected; a point before it moves the start,
    /// after it the end, and inside it keeps the word.
    func extending(to point: ScreenPoint) -> ScreenSelectionRange {
        if Self.precedes(point, start) { return ScreenSelectionRange(start: point, end: end) }
        if Self.precedes(end, point) { return ScreenSelectionRange(start: start, end: point) }
        return self
    }

    /// A handle moving one end to the cell under the finger (D5). The other
    /// end stays where it is; a finger that crosses it swaps which end the
    /// handle holds, and the end it holds now is answered beside the range.
    func moving(_ held: ScreenSelectionEnd, to point: ScreenPoint) -> (ScreenSelectionRange, ScreenSelectionEnd) {
        switch held {
        case .end:
            if Self.precedes(point, start) { return (ScreenSelectionRange(start: point, end: start), .start) }
            return (ScreenSelectionRange(start: start, end: point), .end)
        case .start:
            if Self.precedes(end, point) { return (ScreenSelectionRange(start: end, end: point), .end) }
            return (ScreenSelectionRange(start: point, end: end), .start)
        }
    }
}

enum ScreenSelecting {
    /// The cell under `point`, a point in the scroll view's own content
    /// coordinates, where row 0 of the layout is index `first` and `rows` rows
    /// are laid out; nil outside them. Arithmetic, never a hit test of a view
    /// (D31).
    static func hit(_ point: CGPoint, cell: ScreenCell, columns: Int, first: Int, rows: Int) -> ScreenPoint? {
        guard point.x >= 0, point.y >= 0, cell.width > 0, cell.height > 0 else { return nil }
        let across = (Double(point.x) / Double(cell.width)).rounded(.down)
        let down = (Double(point.y) / Double(cell.height)).rounded(.down)
        guard across < Double(columns), down < Double(rows), let column = Int(exactly: across), let place = Int(exactly: down),
              let row = DoorNumber.sum(first, place) else { return nil }
        return ScreenPoint(row: row, column: column)
    }

    /// THE WORD a long press selects (D4): the run of cells on the pressed
    /// row around the pressed one that are not blank, so a path, a URL, a
    /// flag or a hash comes whole, where a word break would cut a path at
    /// every `/`. A cell is BLANK when it is a space or past the row's cells;
    /// a wide character's second column, which holds nothing, belongs to its
    /// character. A blank cell selects itself alone, so a press always
    /// selects something, as 337's did.
    static func word(at point: ScreenPoint, cells: [String]) -> ScreenSelectionRange {
        func blank(_ column: Int) -> Bool {
            !cells.indices.contains(column) || cells[column] == " "
        }
        guard !blank(point.column) else { return ScreenSelectionRange(start: point, end: point) }
        var first = point.column
        while let before = DoorNumber.difference(first, 1), !blank(before) {
            first = before
        }
        var last = point.column
        while let after = DoorNumber.sum(last, 1), !blank(after) {
            last = after
        }
        return ScreenSelectionRange(start: ScreenPoint(row: point.row, column: first), end: ScreenPoint(row: point.row, column: last))
    }

    /// What a single tap means (D11): with no selection it raises the
    /// keyboard, as before; on a selected cell it shows the edit menu over
    /// the selection; anywhere else, outside the rows included, it clears the
    /// selection and raises nothing. The point was hit inside the Mac's width,
    /// so its column is already bounded; the columns are read at the widest a
    /// row may be.
    static func tap(selection: ScreenSelectionRange?, at point: ScreenPoint?) -> ScreenTap {
        guard let selection else { return .focus }
        guard let point, let selected = selection.columns(on: point.row, of: PocketScreen.widest), selected.contains(point.column) else {
            return .clear
        }
        return .menu
    }

    /// One highlight rectangle per selected row, in the content's points,
    /// where row 0 of the layout is index `first`.
    static func rects(_ range: ScreenSelectionRange?, cell: ScreenCell, columns: Int, first: Int = 0) -> [CGRect] {
        guard let range else { return [] }
        return (range.start.row...range.end.row).compactMap { row in
            guard let selected = range.columns(on: row, of: columns) else { return nil }
            let lead = CGFloat(selected.lowerBound) * cell.width
            let span = CGFloat(selected.count) * cell.width
            let down = CGFloat(row) - CGFloat(first)
            return CGRect(x: lead, y: CGFloat(down) * cell.height, width: span, height: cell.height)
        }
    }

    /// The selected text: each row's selected cells joined, trailing blanks
    /// dropped, rows joined by a line break, every row read by its absolute
    /// index through `rows` (the held history and the live rows, D31). A wide
    /// cell's character is taken once. Since Phase 348 a row the Mac marked
    /// wrapped is joined to the next with no line break (D46).
    static func text(_ range: ScreenSelectionRange?, columns: Int, rows: (Int) -> ScreenRowModel?) -> String {
        text(range, columns: columns, cells: { rows($0)?.cells }, wrapped: { rows($0)?.wrapped ?? false })
    }

    /// The same text, every row read as its cells and its mark by absolute
    /// index (the Terminal's text input reads rows this way,
    /// Screens/ScreenTextInput.swift). THE JOIN (D46): a MARKED row whose next
    /// row is selected and drawn takes its selected cells to its last column
    /// UNTRIMMED and is followed by that row with no line break; the last
    /// column of a marked row is ink (the Mac's guard, D45), so the untrimmed
    /// cells lose nothing and add no blank. Every other row keeps today's
    /// trim and is followed by a line break. With no marks this is today's
    /// text exactly.
    static func text(
        _ range: ScreenSelectionRange?, columns: Int, cells: (Int) -> [String]?, wrapped: (Int) -> Bool = { _ in false }
    ) -> String {
        guard let range else { return "" }
        var read: [(row: Int, taken: String)] = []
        for row in range.start.row...range.end.row {
            guard let cells = cells(row) else { continue }
            guard let selected = range.columns(on: row, of: columns) else {
                read.append((row, ""))
                continue
            }
            read.append((row, selected.filter { cells.indices.contains($0) }.map { cells[$0] }.joined()))
        }
        // Each row beside the one after it: no arithmetic on a row, only
        // `DoorNumber`'s checked sum (rule k).
        var pieces: [String] = []
        for (line, next) in zip(read, read.dropFirst()) {
            let joins = wrapped(line.row) && next.row == DoorNumber.sum(line.row, 1)
            pieces.append(joins ? line.taken : trimmed(line.taken))
            if !joins { pieces.append(lineBreak) }
        }
        if let last = read.last { pieces.append(trimmed(last.taken)) }
        return pieces.joined()
    }

    /// A row's text with its trailing blanks dropped, as Copy has always taken
    /// an unmarked row.
    static func trimmed(_ taken: String) -> String {
        String(taken.reversed().drop(while: { $0 == " " }).reversed())
    }

    /// The selected text of one picture alone, its rows from index 0.
    static func text(_ range: ScreenSelectionRange?, in picture: ScreenPicture) -> String {
        text(range, columns: picture.columns) { picture.rows.indices.contains($0) ? picture.rows[$0] : nil }
    }

    /// Whether every row of `range` is DRAWN, held or live (D31, §Attack
    /// B11): Copy is offered only then, so a selection over rows not yet
    /// fetched copies nothing until they land.
    static func drawn(_ range: ScreenSelectionRange, rows: (Int) -> ScreenRowModel?) -> Bool {
        (range.start.row...range.end.row).allSatisfy { rows($0) != nil }
    }

    static let lineBreak = "\n"

    /// COPY: the selected text onto the iPhone's clipboard, and nothing read
    /// from it (conformance:ios rule al). Empty text writes nothing.
    @MainActor
    static func copy(_ text: String) {
        guard !text.isEmpty else { return }
        UIPasteboard.general.string = text
    }
}
