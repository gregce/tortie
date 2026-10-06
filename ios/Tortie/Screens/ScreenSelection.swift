// Selecting on the Screen, and Copy (Phase 337, build/p337/SPEC.md D34 and
// section 5.8.4).
//
// A long press of 450 ms starts a selection at the cell under the finger, a
// drag extends it, a tap clears it, and Copy puts its text on the iPhone's
// clipboard. While a selection exists the Screen draws the picture it began
// on (Screens/Screen.swift), so the cells under it do not move.
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
// holds its picture instead), its word selection, and its scroll intent
// driving a terminal's scrollback (there is none on the phone: the scroll
// view pans).
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

/// A cell of the picture: its row and its column, from 0.
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
    /// The cell under `point` in a grid of `cell`s, or nil outside it.
    static func hit(_ point: CGPoint, cell: ScreenCell, columns: Int, rows: Int) -> ScreenPoint? {
        guard point.x >= 0, point.y >= 0, cell.width > 0, cell.height > 0 else { return nil }
        let across = (Double(point.x) / Double(cell.width)).rounded(.down)
        let down = (Double(point.y) / Double(cell.height)).rounded(.down)
        guard across < Double(columns), down < Double(rows), let column = Int(exactly: across), let row = Int(exactly: down) else { return nil }
        return ScreenPoint(row: row, column: column)
    }

    /// One highlight rectangle per selected row, in the grid's points.
    static func rects(_ range: ScreenSelectionRange?, cell: ScreenCell, columns: Int) -> [CGRect] {
        guard let range else { return [] }
        return (range.start.row...range.end.row).compactMap { row in
            guard let selected = range.columns(on: row, of: columns) else { return nil }
            let lead = CGFloat(selected.lowerBound) * cell.width
            let span = CGFloat(selected.count) * cell.width
            return CGRect(x: lead, y: CGFloat(row) * cell.height, width: span, height: cell.height)
        }
    }

    /// The selected text: each row's selected cells joined, trailing blanks
    /// dropped, rows joined by a line break. A wide cell's character is
    /// taken once.
    static func text(_ range: ScreenSelectionRange?, in picture: ScreenPicture) -> String {
        guard let range else { return "" }
        var lines: [String] = []
        for row in range.start.row...range.end.row {
            guard picture.rows.indices.contains(row) else { continue }
            let cells = picture.rows[row].cells
            guard let selected = range.columns(on: row, of: picture.columns) else {
                lines.append("")
                continue
            }
            let taken = selected.filter { cells.indices.contains($0) }.map { cells[$0] }.joined()
            lines.append(String(taken.reversed().drop(while: { $0 == " " }).reversed()))
        }
        return lines.joined(separator: lineBreak)
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
