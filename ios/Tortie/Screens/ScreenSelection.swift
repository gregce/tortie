// Selecting on the Screen, and Copy (Phase 337, build/p337/SPEC.md D34 and
// section 5.8.4).
//
// A long press of 450 ms starts a selection at the cell under the finger, a
// drag extends it, a tap clears it, and Copy puts its text on the iPhone's
// clipboard. While a selection exists the Screen draws the picture it began
// on (Screens/Screen.swift), so the cells under it do not move.
//
// A POINT IS AN ABSOLUTE INDEX (Phase 337.1, build/p3371/SPEC.md D31). Since
// the Terminal scrolls back, a point names its row by its index in the
// session's index space: a row of history by its own index, live row `r` of
// the held picture by `H + r`, never by its place in the layout, so a page
// reserved above moves no selection. The point is hit by arithmetic in the
// scroll view's own content coordinates (row `y / cellHeight` from the first
// row laid out, column `x / cellWidth`), and the text is read from the held
// rows and the live rows by index. COPY IS DRAWN ONLY WHILE EVERY SELECTED ROW
// IS DRAWN: a selection that reaches rows not yet fetched waits for them, and
// never copies a blank line where a line of his was (§Attack B11).
//
// THE DESIGN IS PASEO'S (packages/app/src/terminal/native-renderer/
// terminal-selection-gesture.ts and terminal-selection.ts at getpaseo/paseo
// 2f0cb2f54be5742d6fc7e9b85ba39808ac22ad93, Apache-2.0, by the Paseo authors),
// ported to Swift, and no Paseo code is copied: the tap tolerance of 8 points,
// the long press of 450 ms and the vertical scroll threshold of 12 points;
// the press, pending, select and scroll intents and the release actions; the
// selection as an anchor and a focus normalised into reading order; the hit
// test of a point to a cell; one highlight rectangle per row; and the
// selected text, each row's cells joined, trailing blanks dropped, rows
// joined by a line break. Not taken: Paseo's coordinate epoch (the Screen
// holds its picture instead, and names a point by its absolute index), its
// word selection, and its scroll intent driving a terminal's scrollback (the
// phone's scroll view pans, into the history since Phase 337.1).
//
// THE PASTEBOARD IS WRITTEN AND NEVER READ (conformance:ios rule al). This
// file is the one that names `UIPasteboard`, and only to set its string on
// Copy. Nothing in the app reads the pasteboard, and the key field refuses
// paste (Screens/ScreenKeyField.swift).

import SwiftUI
import UIKit

// MARK: - The gesture, classified (Paseo's table)

enum ScreenGesture {
    /// Points a finger may move and still tap.
    static let tapTolerance: CGFloat = 8
    /// How long a press must be held to start a selection.
    static let longPress: Duration = .milliseconds(450)
    /// The long press, in seconds, as SwiftUI's gesture takes it.
    static let longPressSeconds: Double = 0.45
    /// Points a mostly vertical drag must move to scroll.
    static let verticalScroll: CGFloat = 12

    enum Status: Equatable, Sendable {
        case idle
        case pressing
        case selecting
    }

    enum Intent: Equatable, Sendable {
        case tap
        case pending
        case select
        case scroll
    }

    enum Action: Equatable, Sendable {
        case none
        /// Raise the keyboard.
        case focus
        /// Start a selection.
        case select
        /// Clear the selection.
        case clear
    }

    /// What a finger moving `dx`, `dy` from where it pressed means.
    static func intent(_ status: Status, dx: CGFloat, dy: CGFloat) -> Intent {
        if status == .selecting { return .select }
        if abs(dy) > verticalScroll, abs(dy) > abs(dx) { return .scroll }
        if hypot(dx, dy) > tapTolerance { return .pending }
        return .tap
    }

    /// What a finger lifting means.
    static func release(
        _ status: Status,
        startedWithSelection: Bool,
        didScroll: Bool,
        movedBeyondTapTolerance: Bool,
        pressed: Duration
    ) -> Action {
        if didScroll { return .none }
        switch status {
        case .selecting:
            guard startedWithSelection else { return .none }
            return movedBeyondTapTolerance ? .none : .clear
        case .pressing:
            if pressed >= longPress { return .select }
            return movedBeyondTapTolerance ? .none : .focus
        case .idle:
            return .none
        }
    }
}

// MARK: - The selection

//// A cell of the Terminal: its row, an ABSOLUTE index in the session's index
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
}

/// The selection as it grows: its anchor, and the range so far.
struct ScreenSelectionModel: Equatable, Sendable {
    private(set) var anchor: ScreenPoint?
    private(set) var range: ScreenSelectionRange?

    var isEmpty: Bool { range == nil }

    /// A long press: anchor and focus at the cell pressed.
    mutating func begin(at point: ScreenPoint) {
        anchor = point
        range = ScreenSelectionRange(start: point, end: point)
    }

    /// A drag: the focus moves, the anchor stays.
    mutating func update(to point: ScreenPoint) {
        let held = anchor ?? point
        anchor = held
        range = ScreenSelectionRange.normalised(anchor: held, focus: point)
    }

    mutating func clear() {
        anchor = nil
        range = nil
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
    /// cell's character is taken once.
    static func text(_ range: ScreenSelectionRange?, columns: Int, rows: (Int) -> ScreenRowModel?) -> String {
        guard let range else { return "" }
        var lines: [String] = []
        for row in range.start.row...range.end.row {
            guard let cells = rows(row)?.cells else { continue }
            guard let selected = range.columns(on: row, of: columns) else {
                lines.append("")
                continue
            }
            let taken = selected.filter { cells.indices.contains($0) }.map { cells[$0] }.joined()
            lines.append(String(taken.reversed().drop(while: { $0 == " " }).reversed()))
        }
        return lines.joined(separator: lineBreak)
    }

    /// The selected text of one picture alone, its rows from index 0.
    static func text(_ range: ScreenSelectionRange?, in picture: ScreenPicture) -> String {
        text(range, columns: picture.columns) { picture.rows.indices.contains($0) ? picture.rows[$0] : nil }
    }

    /// Whether every row of `range` is DRAWN, held or live (D31, §Attack
    /// B11): Copy is drawn only then, so a selection over rows not yet
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
