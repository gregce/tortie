import CoreText
import SwiftUI
import UIKit
import XCTest
@testable import Tortie

/// The Screen's rows (Phase 337, build/p337/SPEC.md D26, section 5.8.4,
/// §Attack A2): the row model compares and hashes as one, and the layout
/// keeps every cell in its column over every distinct character the
/// committed captures draw, measured with the iPhone's own fonts. Each test
/// names the clause it holds and fails when that clause is taken out of
/// Screens/ScreenRows.swift.
final class ScreenRowsTests: XCTestCase {
    private let holdsAll: (Character) -> Bool = { _ in true }

    /// Clause: the row model is Equatable and Hashable over its runs, so an
    /// unchanged row is not drawn again and a changed one is.
    func testTheRowModelComparesAndHashesAsOne() {
        let a = ScreenRowModel(index: 0, runs: [ScreenRun(text: "ab", styleIndex: 0, span: 2)], holds: holdsAll)
        let same = ScreenRowModel(index: 0, runs: [ScreenRun(text: "ab", styleIndex: 0, span: 2)], holds: holdsAll)
        let restyled = ScreenRowModel(index: 0, runs: [ScreenRun(text: "ab", styleIndex: 1, span: 2)], holds: holdsAll)
        let retyped = ScreenRowModel(index: 0, runs: [ScreenRun(text: "ac", styleIndex: 0, span: 2)], holds: holdsAll)
        XCTAssertEqual(a, same)
        XCTAssertEqual(a.hashValue, same.hashValue)
        XCTAssertNotEqual(a, restyled)
        XCTAssertNotEqual(a, retyped)
        XCTAssertEqual(Set([a, same, restyled]).count, 2)
    }

    /// Clause: the label is the row's text with trailing blanks dropped, what
    /// the Mac's `capture-pane -p` row is.
    func testTheLabelDropsTrailingBlanks() {
        let row = ScreenRowModel(index: 0, runs: [ScreenRun(text: "a b", styleIndex: 0, span: 3), ScreenRun(text: "   ", styleIndex: 1, span: 3)], holds: holdsAll)
        XCTAssertEqual(row.label, "a b")
        XCTAssertEqual(row.cells, ["a", " ", "b", " ", " ", " "])
    }

    /// Clause: a column is accumulated in CGFloat from each run's cells, and
    /// a wide cell is one box of its two columns, alone.
    func testColumnsAccumulateFromEachRunsCells() throws {
        let wide = String(Character(try XCTUnwrap(Unicode.Scalar(0x4E2D))))
        let boxes = ScreenLayout.boxes([
            ScreenRun(text: "ab", styleIndex: 0, span: 2),
            ScreenRun(text: wide, styleIndex: 1, span: 2),
            ScreenRun(text: "c", styleIndex: 0, span: 1),
        ], holds: holdsAll)
        XCTAssertEqual(boxes.map(\.column), [0, 2, 4])
        XCTAssertEqual(boxes.map(\.span), [2, 2, 1])
        XCTAssertEqual(boxes.map(\.kind), [.text, .alone, .text])
        let cells = ScreenLayout.cells([ScreenRun(text: "ab", styleIndex: 0, span: 2), ScreenRun(text: wide, styleIndex: 1, span: 2)])
        XCTAssertEqual(cells, ["a", "b", wide, ""], "a wide cell's character in its first column, nothing in its second")
    }

    /// Clause (§Attack A2): a run is split at every character the cell font
    /// does not hold, each such character alone in its own column, asked for
    /// text presentation when it is a narrow emoji-capable code point.
    func testARunSplitsAtACharacterTheFontLacks() throws {
        let record = try XCTUnwrap(Unicode.Scalar(0x23FA))
        let lacks = Character(record)
        let boxes = ScreenLayout.boxes([ScreenRun(text: "ab" + String(lacks) + "cd", styleIndex: 0, span: 5)], holds: { $0 != lacks })
        XCTAssertEqual(boxes.map(\.column), [0, 2, 3])
        XCTAssertEqual(boxes.map(\.span), [2, 1, 2])
        XCTAssertEqual(boxes.map(\.kind), [.text, .alone, .text])
        let selector = try XCTUnwrap(Unicode.Scalar(0xFE0E))
        XCTAssertEqual(Array(boxes[1].text.unicodeScalars), [record, selector], "U+FE0E after a narrow emoji-capable code point")
        XCTAssertEqual(ScreenLayout.presented("x"), "x", "not emoji-capable: as it is")
    }

    /// Clause: a box or block character is a shape, and consecutive equal
    /// ones are one box.
    func testBoxCharactersAreShapes() throws {
        let rule = String(Character(try XCTUnwrap(Unicode.Scalar(0x2500))))
        let boxes = ScreenLayout.boxes([ScreenRun(text: "a" + rule + rule + rule + "b", styleIndex: 0, span: 5)], holds: holdsAll)
        XCTAssertEqual(boxes.map(\.column), [0, 1, 4])
        XCTAssertEqual(boxes.map(\.span), [1, 3, 1])
        XCTAssertEqual(boxes[1].kind, .shape(ScreenGlyphCode(value: 0x2500)))
    }

    /// Clause (ap): a glyph is scaled DOWN to its box and never up.
    func testAGlyphIsScaledDownNeverUp() {
        XCTAssertEqual(ScreenLayout.fit(measured: 20, box: 10), 0.5)
        XCTAssertEqual(ScreenLayout.fit(measured: 5, box: 10), 1)
        XCTAssertEqual(ScreenLayout.fit(measured: 0, box: 10), 1)
    }

    /// Clause: the cell is measured and snapped to the pixel, and the font
    /// size is chosen so a held character's advance IS the cell's width, so
    /// a run of any length lands on its columns.
    func testTheCellIsTheFontsOwnAdvanceOnThePixel() {
        for scale: CGFloat in [2, 3] {
            for wanted: CGFloat in [3.1, 5.6, 7.42, 10.9] {
                let cell = ScreenCell.wide(wanted, scale: scale)
                XCTAssertEqual((cell.width * scale).rounded(), cell.width * scale, accuracy: 0.0001, "the width is on the pixel")
                XCTAssertEqual((cell.height * scale).rounded(), cell.height * scale, accuracy: 0.0001, "the height is on the pixel")
                XCTAssertLessThanOrEqual(cell.width, wanted)
                let font = UIFont.monospacedSystemFont(ofSize: cell.fontSize, weight: .regular) as CTFont
                for text in ["0", "m", "W", "|"] {
                    XCTAssertEqual(advance(of: text, in: font), cell.width, accuracy: 0.001, "\(text) at \(cell.fontSize) pt")
                }
            }
        }
    }

    /// Clause (§Attack A2), over every distinct character of every committed
    /// capture, measured with the iPhone's own fonts: a character the cell
    /// font holds advances exactly one cell, so it lands on its column; one
    /// it does not hold is its own box, and its glyph, measured in the font
    /// the iPhone falls back to, scaled by the layout, is at most its cells'
    /// width plus half a point.
    func testEveryCharacterOfTheCapturesKeepsItsColumn() throws {
        let characters = try Self.captureCharacters()
        XCTAssertGreaterThan(characters.count, 40, "the captures were not read")
        let cell = ScreenCell.wide(7.4, scale: 3)
        let font = UIFont.monospacedSystemFont(ofSize: cell.fontSize, weight: .regular) as CTFont
        var lacking: [String] = []
        for character in characters {
            let run = ScreenRun(text: "a" + String(character) + "b", styleIndex: 0, span: 3)
            let boxes = ScreenLayout.boxes([run], holds: ScreenFont.holds)
            let middle = try XCTUnwrap(boxes.first { $0.column <= 1 && $0.column + $0.span > 1 }, "\(character)")
            if ScreenGlyphs.shape(for: character) != nil {
                XCTAssertEqual(middle.kind, .shape(ScreenGlyphCode(value: character.unicodeScalars.first?.value ?? 0)))
                continue
            }
            if ScreenFont.holds(character) {
                XCTAssertEqual(middle.kind, .text, "\(character)")
                XCTAssertEqual(advance(of: String(character), in: font), cell.width, accuracy: 0.01, "U+\(hex(character)) advances off its cell")
            } else {
                lacking.append("U+" + hex(character))
                XCTAssertEqual(middle.kind, .alone, "\(character)")
                XCTAssertEqual(middle.column, 1, "U+\(hex(character))")
                XCTAssertEqual(middle.span, 1)
                let measured = fallbackAdvance(of: middle.text, from: font)
                let drawn = measured * ScreenLayout.fit(measured: measured, box: cell.width)
                XCTAssertLessThanOrEqual(drawn, cell.width + 0.5, "U+\(hex(character)) overflows its box")
            }
        }
        XCTAssertFalse(lacking.isEmpty, "the cell font holds every character the captures draw, which the attack measured otherwise")
        print("P337_ROWS|lacking|\(lacking.count)|\(lacking.joined(separator: ","))")
    }

    /// Clause: the picture the phone draws is the door's screen, laid out
    /// once: its rows, its styles through `Token.drawn`, the cursor's block
    /// one past the last column drawn on the last.
    func testThePictureIsTheDoorsScreen() throws {
        let picture = ScreenSample.picture()
        XCTAssertEqual(picture.columns, 4)
        XCTAssertEqual(picture.rows.count, 2)
        XCTAssertEqual(picture.rows[0].label, "abcd")
        XCTAssertEqual(picture.rows[1].label, "")
        XCTAssertEqual(picture.styles.count, 2)
        let past = try ScreenSample.decode(ScreenSample.answer(screen: ScreenSample.screen(cursor: (4, 1))))
        let drawn = ScreenPicture(try XCTUnwrap(past.screen), revision: past.revision)
        XCTAssertEqual(drawn.caretColumn, 3)
        XCTAssertEqual(drawn.caretRow, 1)
    }

    // MARK: Helpers

    private func hex(_ character: Character) -> String {
        character.unicodeScalars.map { String($0.value, radix: 16, uppercase: true) }.joined(separator: "+")
    }

    /// The advance of `text` in `font`, through CoreText.
    private func advance(of text: String, in font: CTFont) -> CGFloat {
        let units = Array(text.utf16)
        var glyphs = [CGGlyph](repeating: 0, count: units.count)
        guard CTFontGetGlyphsForCharacters(font, units, &glyphs, units.count) else { return 0 }
        var advances = [CGSize](repeating: .zero, count: glyphs.count)
        CTFontGetAdvancesForGlyphs(font, .horizontal, glyphs, &advances, glyphs.count)
        return advances.reduce(0) { $0 + $1.width }
    }

    /// The advance of `text` in the font the iPhone's cascade picks for it
    /// (`CTFontCreateForString`), whatever the cell font lacks.
    private func fallbackAdvance(of text: String, from font: CTFont) -> CGFloat {
        let fallback = CTFontCreateForString(font, text as CFString, CFRange(location: 0, length: text.utf16.count))
        return advance(of: text, in: fallback)
    }

    /// Every distinct non-ASCII character of every committed capture under
    /// build/fixtures and src/main/activity/__tests__/fixtures, escapes taken
    /// out of the styled ones.
    static func captureCharacters() throws -> [Character] {
        var seen = Set<Character>()
        let fm = FileManager.default
        for folder in ["build/fixtures", "src/main/activity/__tests__/fixtures"] {
            let root = StyleSource.root.appendingPathComponent(folder)
            guard let walker = fm.enumerator(at: root, includingPropertiesForKeys: nil) else { continue }
            for case let url as URL in walker where url.pathExtension == "txt" || url.pathExtension == "ansi" {
                let text = try String(contentsOf: url, encoding: .utf8)
                for character in plain(text) where !character.isASCII && !character.isNewline {
                    seen.insert(character)
                }
            }
        }
        return seen.sorted { String($0) < String($1) }
    }

    /// `text` with every escape sequence (CSI, OSC, a two-byte escape) and
    /// every control taken out.
    static func plain(_ text: String) -> String {
        var out = String.UnicodeScalarView()
        var scalars = Array(text.unicodeScalars)[...]
        while let scalar = scalars.popFirst() {
            if scalar.value == 0x1B, let next = scalars.first {
                scalars = scalars.dropFirst()
                if next == "[" {
                    while let c = scalars.popFirst(), !(c.value >= 0x40 && c.value <= 0x7E) {}
                } else if next == "]" {
                    while let c = scalars.popFirst(), c.value != 0x07, c.value != 0x1B {}
                    if scalars.first == "\\" { scalars = scalars.dropFirst() }
                }
                continue
            }
            if scalar.value < 0x20 && scalar.value != 0x0A { continue }
            out.append(scalar)
        }
        return String(out)
    }
}
