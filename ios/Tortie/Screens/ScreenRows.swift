// The Screen's rows, as the phone holds and lays them out (Phase 337,
// build/p337/SPEC.md D26 and section 5.8.4).
//
// THE ROW MODEL is Paseo's design (packages/app/src/terminal/native-renderer/
// terminal-row-model.ts at getpaseo/paseo 2f0cb2f54be5742d6fc7e9b85ba39808ac22ad93,
// Apache-2.0, by the Paseo authors): a row is runs of one style, each with
// the number of cells it covers, and the row is Equatable and Hashable so a
// row that did not change is not drawn again. No Paseo code is copied, and
// the runs are NOT built here: the Mac builds them with tmux's own widths
// (D9, D10), where Paseo guesses a wide character from a table of ranges.
//
// THE LAYOUT (`ScreenLayout`, pure) turns a row's runs into BOXES, each drawn
// alone in exactly its columns (§Attack A2): a run of narrow cells the cell
// font holds is one box of text, every character one column; a character the
// cell font does NOT hold (`CTFontGetGlyphsForCharacters` false: 18 of the 69
// distinct non-ASCII characters the committed captures draw, Claude Code's
// `U+23FA` among them) is a box of its own, asked for text presentation when
// it is a narrow emoji-capable code point (U+FE0E after it, built from the
// code point), and its glyph, measured as it is drawn, is scaled DOWN to its
// box and never up; a wide cell is a box of its own, its glyph centred and
// scaled down to its two columns; a box or block character is a shape
// (Screens/ScreenGlyphs.swift). So one character a fallback font draws wider
// than a cell never pushes the cells after it out of their columns.
//
// THE CELL is measured, never assumed: its width is the advance of the digit
// zero in the regular monospaced system font, read through CoreText, snapped
// to the display's pixel, and the font size is then CHOSEN so its advance is
// exactly that snapped width, so a run's characters land on their columns
// however long the run. Its height is the font's line height snapped up. No
// string is drawn to measure it, and nothing names an attributed string.
//
// EVERY POSITION IS A CGFloat: a column is accumulated as `CGFloat` from each
// run's cells and never in `Int`, so nothing here can trap, whatever the
// door's numbers (conformance:ios rule k).

import CoreText
import SwiftUI
import UIKit

// MARK: - The style, as drawn

/// One style of the picture, its door colours made `Color` once, through
/// `Token.drawn`, the one constructor of a colour the door names.
struct ScreenStyle: Equatable, Sendable {
    let ink: Color
    /// Nil is the screen's own ground: nothing is drawn under the run.
    let ground: Color?
    let bold: Bool
    let dim: Bool
    let italic: Bool
    let underline: Bool
    let strike: Bool

    init(_ style: PocketScreenStyle) {
        ink = Token.drawn(style.fg)
        ground = style.bg.map(Token.drawn)
        bold = style.bold
        dim = style.dim
        italic = style.italic
        underline = style.underline
        strike = style.strike
    }

    /// The ink of a cell with no style: the screen's own.
    init(ink: Color) {
        self.ink = ink
        ground = nil
        bold = false
        dim = false
        italic = false
        underline = false
        strike = false
    }
}

// MARK: - One row

/// One run of a row, as the phone holds it: its text, its style, and the
/// columns it covers.
struct ScreenRun: Equatable, Hashable, Sendable {
    let text: String
    let styleIndex: Int
    let span: Int
}

/// One box of a laid-out row, drawn alone in exactly its columns.
struct ScreenBox: Equatable, Hashable, Sendable {
    enum Kind: Equatable, Hashable, Sendable {
        /// Characters the cell font holds, every one a column, drawn as one.
        case text
        /// One character drawn alone: one the cell font does not hold, or a
        /// wide cell. Measured as drawn, centred, and scaled down to fit.
        case alone
        /// A box or block character, its shape drawn in every column.
        case shape(ScreenGlyphCode)
    }

    /// What is drawn: the run's characters, with U+FE0E after a narrow
    /// emoji-capable one the cell font does not hold.
    let text: String
    let column: CGFloat
    let span: CGFloat
    let styleIndex: Int
    let kind: Kind
}

/// A box or block code point, by its number, so a box can be Hashable while
/// its shape is looked up in `ScreenGlyphs.shapes`.
struct ScreenGlyphCode: Equatable, Hashable, Sendable {
    let value: UInt32
    var glyph: ScreenGlyph? { ScreenGlyphs.shapes[value] }
}

/// One row: its runs, its boxes, its text and each column's character
/// (Paseo's row model: an unchanged row compares equal and is not drawn
/// again).
struct ScreenRowModel: Equatable, Hashable, Sendable {
    /// The row's place, from 0 at the top.
    let index: Int
    let runs: [ScreenRun]
    let boxes: [ScreenBox]
    /// The row's text, trailing blanks dropped: what VoiceOver and a UI test
    /// read, which is the Mac's `capture-pane -p` row.
    let label: String
    /// Each column's character, a wide cell's in its first column and
    /// nothing in its second: what a selection copies.
    let cells: [String]

    init(index: Int, runs: [ScreenRun], holds: (Character) -> Bool) {
        self.index = index
        self.runs = runs
        boxes = ScreenLayout.boxes(runs, holds: holds)
        let text = runs.map(\.text).joined()
        label = String(text.reversed().drop(while: { $0 == " " }).reversed())
        cells = ScreenLayout.cells(runs)
    }
}

// MARK: - The picture

/// The decoded screen, as the Screen draws it: rows laid out once, styles
/// made once, and the facts a keys write echoes.
struct ScreenPicture: Equatable, Sendable {
    let revision: String
    /// The Mac's width and height, in cells.
    let columns: Int
    let rowCount: Int
    /// Where the cursor's block is drawn: its column (one past the last is
    /// drawn on the last), its row, and whether it is shown.
    let caretColumn: Int
    let caretRow: Int
    let caretShown: Bool
    let alternate: Bool
    let ground: Color
    let ink: Color
    let caret: Color
    let styles: [ScreenStyle]
    let rows: [ScreenRowModel]
    /// What a keys write echoes (D21).
    let turn: String
    let dialog: String?
    let asking: Bool
    let typable: Bool

    init(_ screen: PocketScreen, revision: String, holds: (Character) -> Bool = ScreenFont.holds) {
        self.revision = revision
        columns = screen.screenColumns
        rowCount = screen.screenRows
        let last = DoorNumber.difference(screen.screenColumns, 1) ?? 0
        caretColumn = min(screen.cursor.cursorColumn, last)
        caretRow = screen.cursor.cursorRow
        caretShown = screen.cursor.visible
        alternate = screen.alternate
        ground = Token.drawn(screen.ground)
        ink = Token.drawn(screen.ink)
        caret = Token.drawn(screen.caret)
        styles = screen.styles.map(ScreenStyle.init)
        rows = screen.lines.enumerated().map { place, runs in
            ScreenRowModel(
                index: place,
                runs: runs.map { ScreenRun(text: $0.text, styleIndex: $0.runStyle, span: $0.runCells) },
                holds: holds
            )
        }
        turn = screen.turn
        dialog = screen.dialog
        asking = screen.asking
        typable = screen.typable
    }

    /// The style of a run, or the screen's own ink for an index the decoder
    /// would have refused.
    func style(_ index: Int) -> ScreenStyle {
        styles.indices.contains(index) ? styles[index] : ScreenStyle(ink: ink)
    }
}

// MARK: - The cell font

/// The Screen's cell font: the regular monospaced system font, SF Mono.
enum ScreenFont {
    /// Whether the cell font holds a glyph for every UTF-16 unit of
    /// `character`, asked of CoreText. A character it does not hold is drawn
    /// alone, in its own box (§Attack A2).
    static func holds(_ character: Character) -> Bool {
        let units = Array(String(character).utf16)
        guard !units.isEmpty else { return true }
        var glyphs = [CGGlyph](repeating: 0, count: units.count)
        return CTFontGetGlyphsForCharacters(probe, units, &glyphs, units.count)
    }

    /// The font coverage and advances are asked of. Its size is any: a
    /// monospaced font's advance scales with its size.
    static let probeSize: CGFloat = 100
    /// A CTFont is immutable once made, and CoreText reads it from any thread.
    nonisolated(unsafe) static let probe: CTFont = UIFont.monospacedSystemFont(ofSize: probeSize, weight: .regular) as CTFont

    /// The digit whose advance is the cell's width.
    static let measuredDigit = "0"

    /// The advance of the digit zero, per point of font size, read through
    /// CoreText (`CTFontGetGlyphsForCharacters`, `CTFontGetAdvancesForGlyphs`).
    static let advancePerPoint: CGFloat = {
        let units = Array(measuredDigit.utf16)
        var glyphs = [CGGlyph](repeating: 0, count: units.count)
        guard CTFontGetGlyphsForCharacters(probe, units, &glyphs, units.count) else { return 0.6 }
        var advance = CGSize.zero
        CTFontGetAdvancesForGlyphs(probe, .horizontal, glyphs, &advance, 1)
        return advance.width > 0 ? CGFloat(advance.width) / probeSize : 0.6
    }()

    /// U+FE0E, which asks for a character's text presentation.
    static let textPresentation: UInt32 = 0xFE0E
}

/// One cell's measure at one zoom: the font size and the cell's width and
/// height in points, both on the display's pixel grid.
struct ScreenCell: Equatable, Sendable {
    let fontSize: CGFloat
    let width: CGFloat
    let height: CGFloat

    /// The cell whose width is `wanted`, snapped down to the display's pixel,
    /// with the font size chosen so its advance is exactly that width, and
    /// the height its line height snapped up.
    static func wide(_ wanted: CGFloat, scale: CGFloat) -> ScreenCell {
        let pixel = CGFloat(1.0) / max(scale, 1)
        let width = max(pixel, snapped(wanted, scale: scale, rule: .down))
        let fontSize = CGFloat(width) / max(ScreenFont.advancePerPoint, 0.01)
        let line = UIFont.monospacedSystemFont(ofSize: fontSize, weight: .regular).lineHeight
        return ScreenCell(fontSize: fontSize, width: width, height: max(pixel, snapped(line, scale: scale, rule: .up)))
    }

    /// The cell of a font size.
    static func ofFont(_ size: CGFloat, scale: CGFloat) -> ScreenCell {
        wide(CGFloat(size) * ScreenFont.advancePerPoint, scale: scale)
    }

    /// `value` on the pixel grid.
    static func snapped(_ value: CGFloat, scale: CGFloat, rule: FloatingPointRoundingRule) -> CGFloat {
        let pixels = CGFloat(value) * max(scale, 1)
        return CGFloat(pixels.rounded(rule)) / max(scale, 1)
    }
}

// MARK: - The layout

enum ScreenLayout {
    /// A row's boxes, every column at `column × width`, accumulated in
    /// `CGFloat` from each run's cells.
    static func boxes(_ runs: [ScreenRun], holds: (Character) -> Bool) -> [ScreenBox] {
        var out: [ScreenBox] = []
        var column: CGFloat = 0
        for run in runs {
            let characters = Array(run.text)
            if characters.count == run.span {
                // Narrow cells, one character each.
                out.append(contentsOf: narrow(characters, at: column, style: run.styleIndex, holds: holds))
            } else if !characters.isEmpty {
                // One wide cell, or text that does not split into its cells
                // as Swift counts characters: alone, centred, scaled down.
                out.append(ScreenBox(text: run.text, column: column, span: CGFloat(run.span), styleIndex: run.styleIndex, kind: .alone))
            }
            column += CGFloat(run.span)
        }
        return out
    }

    /// A run of narrow cells: the characters the cell font holds in boxes of
    /// text, every other character alone in its own column, and each box or
    /// block character a shape (consecutive equal ones one box).
    private static func narrow(_ characters: [Character], at start: CGFloat, style: Int, holds: (Character) -> Bool) -> [ScreenBox] {
        var out: [ScreenBox] = []
        var pending = ""
        var pendingAt = start
        var pendingSpan: CGFloat = 0
        func flush() {
            guard !pending.isEmpty else { return }
            out.append(ScreenBox(text: pending, column: pendingAt, span: pendingSpan, styleIndex: style, kind: .text))
            pending = ""
            pendingSpan = 0
        }
        for (offset, character) in characters.enumerated() {
            let at = start + CGFloat(offset)
            if let code = shapeCode(character) {
                flush()
                if let previous = out.last, previous.kind == .shape(code), CGFloat(previous.column) + previous.span == at {
                    out[out.index(before: out.endIndex)] = ScreenBox(
                        text: previous.text + String(character), column: previous.column,
                        span: CGFloat(previous.span) + 1.0, styleIndex: style, kind: previous.kind
                    )
                } else {
                    out.append(ScreenBox(text: String(character), column: at, span: 1, styleIndex: style, kind: .shape(code)))
                }
            } else if holds(character) {
                if pending.isEmpty { pendingAt = at }
                pending.append(character)
                pendingSpan += CGFloat(1.0)
            } else {
                flush()
                out.append(ScreenBox(text: presented(character), column: at, span: 1, styleIndex: style, kind: .alone))
            }
        }
        flush()
        return out
    }

    /// The code point of a box or block character this file draws as a
    /// shape, or nil.
    private static func shapeCode(_ character: Character) -> ScreenGlyphCode? {
        guard character.unicodeScalars.count == 1, let scalar = character.unicodeScalars.first,
              ScreenGlyphs.shapes[scalar.value] != nil else { return nil }
        return ScreenGlyphCode(value: scalar.value)
    }

    /// A narrow character drawn alone: with U+FE0E after it when it is ONE
    /// emoji-capable code point with no presentation asked, so the cascade
    /// picks a text glyph near a cell's width rather than a colour emoji two
    /// and a quarter cells wide (§Attack A2, AM5). Built from the code point.
    static func presented(_ character: Character) -> String {
        guard character.unicodeScalars.count == 1, let scalar = character.unicodeScalars.first,
              scalar.properties.isEmoji, !scalar.isASCII,
              let selector = Unicode.Scalar(ScreenFont.textPresentation) else { return String(character) }
        var scalars = String.UnicodeScalarView()
        scalars.append(scalar)
        scalars.append(selector)
        return String(scalars)
    }

    /// Down, never up: the scale that fits a glyph `measured` wide into a box
    /// `box` wide (conformance:ios rule ap).
    static func fit(measured: CGFloat, box: CGFloat) -> CGFloat {
        guard measured > 0, box > 0 else { return 1 }
        return min(1, CGFloat(box) / measured)
    }

    /// Each column's character: a narrow cell's own, a wide cell's in its
    /// first column and nothing in the next, and text that does not split
    /// into its cells whole in its first column.
    static func cells(_ runs: [ScreenRun]) -> [String] {
        var out: [String] = []
        for run in runs {
            let characters = Array(run.text)
            if characters.count == run.span {
                out.append(contentsOf: characters.map { String($0) })
            } else {
                out.append(run.text)
                out.append(contentsOf: repeatElement("", count: max(0, DoorNumber.difference(run.span, 1) ?? 0)))
            }
        }
        return out
    }
}
