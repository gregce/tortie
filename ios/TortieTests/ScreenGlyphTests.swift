import SwiftUI
import XCTest
@testable import Tortie

/// The box and block shapes (Phase 337, build/p337/SPEC.md D26, section 5.8.4,
/// §Attack A3): every code point of U+2500 to U+259F has a shape DERIVED from
/// its own Unicode name, the set drawn with the font's glyph is frozen at
/// none, and the shapes the committed captures draw most are the shapes their
/// names say. Each test names the clause it holds and fails when that clause
/// is taken out of Screens/ScreenGlyphs.swift. Every character here is built
/// from its code point.
final class ScreenGlyphTests: XCTestCase {
    private func glyph(_ value: UInt32) throws -> ScreenGlyph {
        try XCTUnwrap(ScreenGlyphs.shapes[value], String(value, radix: 16))
    }

    private func character(_ value: UInt32) throws -> Character {
        Character(try XCTUnwrap(Unicode.Scalar(value)))
    }

    /// Clause: all 160 code points derive a shape, and the frozen set of the
    /// ones drawn with the font's glyph is empty.
    func testEveryCodePointOfTheRangeHasADerivedShape() {
        XCTAssertEqual(ScreenGlyphs.shapes.count, 160)
        XCTAssertEqual(ScreenGlyphs.unread, [], "drawn with the font's glyph: \(ScreenGlyphs.unread.map { String($0, radix: 16) })")
        XCTAssertNil(ScreenGlyphs.shapes[0x24FF])
        XCTAssertNil(ScreenGlyphs.shapes[0x25A0])
    }

    /// Clause: the names read are the 37 words, and nothing outside the range
    /// is a shape (a name the rule does not read draws the font's glyph).
    func testTheNamesUseThirtySevenWords() throws {
        var words = Set<String>()
        for value in ScreenGlyphs.first...ScreenGlyphs.last {
            let name = try XCTUnwrap(Unicode.Scalar(value)?.properties.name)
            words.formUnion(name.split(separator: " ").map(String.init))
        }
        XCTAssertEqual(words.count, 37)
        XCTAssertNil(ScreenGlyphs.shape(named: "BOX DRAWINGS LIGHT SIDEWAYS"))
        XCTAssertNil(ScreenGlyphs.shape(named: "BOX DRAWINGS LIGHT HEAVY UP"), "two weights in one group")
        XCTAssertNil(ScreenGlyphs.shape(named: "BOX DRAWINGS UP AND UP"), "an arm named twice")
        XCTAssertNil(ScreenGlyphs.shape(named: "BLACK SQUARE"))
        XCTAssertNil(ScreenGlyphs.shape(for: "a"))
    }

    /// Clause: `U+254C`, Claude Code's dashed rule (1,676 times in the
    /// captures): DOUBLE directly before DASH is a count of two, and the
    /// weight is LIGHT.
    func testTheLightDoubleDashIsTwoDashesNotADoubleLine() throws {
        XCTAssertEqual(try glyph(0x254C), .dashes(.light, vertical: false, dashes: 2))
        XCTAssertEqual(try glyph(0x2504), .dashes(.light, vertical: false, dashes: 3))
        XCTAssertEqual(try glyph(0x250B), .dashes(.heavy, vertical: true, dashes: 4))
        XCTAssertEqual(ScreenGlyphs.shape(for: try character(0x254C)), .dashes(.light, vertical: false, dashes: 2))
    }

    /// Clause: `U+2550` is a double horizontal line, `U+2551` a double
    /// vertical one, and `U+2554` the double corner joining down and right.
    func testTheDoubleLinesAreTheirNames() throws {
        XCTAssertEqual(try glyph(0x2550), .lines(ScreenArms(left: .double, right: .double)))
        XCTAssertEqual(try glyph(0x2551), .lines(ScreenArms(up: .double, down: .double)))
        XCTAssertEqual(try glyph(0x2554), .lines(ScreenArms(down: .double, right: .double)))
        XCTAssertEqual(try glyph(0x2557), .lines(ScreenArms(down: .double, left: .double)))
        XCTAssertEqual(try glyph(0x255A), .lines(ScreenArms(up: .double, right: .double)))
        XCTAssertEqual(try glyph(0x255D), .lines(ScreenArms(up: .double, left: .double)))
    }

    /// Clause: a weight binds to the arms beside it, and a group with none
    /// takes the first group's.
    func testAWeightBindsToTheArmsBesideIt() throws {
        XCTAssertEqual(try glyph(0x250C), .lines(ScreenArms(down: .light, right: .light)), "LIGHT DOWN AND RIGHT")
        XCTAssertEqual(try glyph(0x250D), .lines(ScreenArms(down: .light, right: .heavy)), "DOWN LIGHT AND RIGHT HEAVY")
        XCTAssertEqual(try glyph(0x2552), .lines(ScreenArms(down: .light, right: .double)), "DOWN SINGLE AND RIGHT DOUBLE")
        XCTAssertEqual(try glyph(0x257C), .lines(ScreenArms(left: .light, right: .heavy)), "LIGHT LEFT AND HEAVY RIGHT")
        XCTAssertEqual(try glyph(0x251E), .lines(ScreenArms(up: .heavy, down: .light, right: .light)), "UP HEAVY AND RIGHT DOWN LIGHT")
        XCTAssertEqual(try glyph(0x2566), .lines(ScreenArms(down: .double, left: .double, right: .double)), "DOUBLE DOWN AND HORIZONTAL")
        XCTAssertEqual(try glyph(0x2500), .lines(ScreenArms(left: .light, right: .light)))
        XCTAssertEqual(try glyph(0x2574), .lines(ScreenArms(left: .light)), "a half line")
        XCTAssertEqual(try glyph(0x254B), .lines(ScreenArms(up: .heavy, down: .heavy, left: .heavy, right: .heavy)))
    }

    /// Clause: the arcs and the diagonals.
    func testArcsAndDiagonals() throws {
        XCTAssertEqual(try glyph(0x256D), .arc(.down, .right))
        XCTAssertEqual(try glyph(0x256F), .arc(.up, .left))
        XCTAssertEqual(try glyph(0x2571), .diagonal(rising: true, falling: false))
        XCTAssertEqual(try glyph(0x2572), .diagonal(rising: false, falling: true))
        XCTAssertEqual(try glyph(0x2573), .diagonal(rising: true, falling: true))
    }

    /// Clause: `U+2591` and `U+2593` fill the cell in the ink at 25 and 75
    /// percent, `U+2592` at 50.
    func testTheShades() throws {
        XCTAssertEqual(try glyph(0x2591), .shade(0.25))
        XCTAssertEqual(try glyph(0x2592), .shade(0.5))
        XCTAssertEqual(try glyph(0x2593), .shade(0.75))
    }

    /// Clause: the blocks, from their names: halves, eighths, quarters, the
    /// full block, and the quadrants (`U+2599` is three of them).
    func testTheBlocks() throws {
        XCTAssertEqual(try glyph(0x2588), .blocks([CGRect(x: 0, y: 0, width: 1, height: 1)]))
        XCTAssertEqual(try glyph(0x2580), .blocks([CGRect(x: 0, y: 0, width: 1, height: 0.5)]))
        XCTAssertEqual(try glyph(0x2581), .blocks([CGRect(x: 0, y: 0.875, width: 1, height: 0.125)]))
        XCTAssertEqual(try glyph(0x2586), .blocks([CGRect(x: 0, y: 0.25, width: 1, height: 0.75)]))
        XCTAssertEqual(try glyph(0x258E), .blocks([CGRect(x: 0, y: 0, width: 0.25, height: 1)]))
        XCTAssertEqual(try glyph(0x2590), .blocks([CGRect(x: 0.5, y: 0, width: 0.5, height: 1)]))
        XCTAssertEqual(try glyph(0x2594), .blocks([CGRect(x: 0, y: 0, width: 1, height: 0.125)]))
        XCTAssertEqual(try glyph(0x2599), .blocks([
            CGRect(x: 0, y: 0, width: 0.5, height: 0.5),
            CGRect(x: 0, y: 0.5, width: 0.5, height: 0.5),
            CGRect(x: 0.5, y: 0.5, width: 0.5, height: 0.5),
        ]))
    }

    /// Clause: drawn in a cell, a line reaches the cell's edges, so it meets
    /// its neighbour's; a double line is two strokes a third of the cell
    /// apart; a double corner's strokes close on each other.
    func testTheShapesReachTheEdgesAndClose() throws {
        let cell = CGRect(x: 10, y: 20, width: 9, height: 18)
        let light: CGFloat = 1
        let line = try glyph(0x2500).paint(in: cell, light: light)
        let union = line.fills.reduce(CGRect.null) { $0.union($1) }
        XCTAssertEqual(union.minX, cell.minX, accuracy: 0.001)
        XCTAssertEqual(union.maxX, cell.maxX, accuracy: 0.001)
        XCTAssertEqual(union.midY, cell.midY, accuracy: 0.001)

        let double = try glyph(0x2550).paint(in: cell, light: light)
        let ys = Set(double.fills.map { ($0.midY * 1000).rounded() / 1000 })
        XCTAssertEqual(ys.count, 2, "a double line is two strokes")
        let sorted = ys.sorted()
        XCTAssertEqual(sorted[1] - sorted[0], cell.height / 3, accuracy: 0.01, "a third of the cell apart")

        // The double corner: the outer strokes meet at the outer corner.
        let corner = try glyph(0x2554).paint(in: cell, light: light)
        let vertical = corner.fills.filter { $0.height > $0.width }
        let horizontal = corner.fills.filter { $0.width > $0.height }
        XCTAssertEqual(vertical.count, 2)
        XCTAssertEqual(horizontal.count, 2)
        for v in vertical {
            XCTAssertEqual(v.maxY, cell.maxY, accuracy: 0.001, "a down arm reaches the bottom edge")
            XCTAssertTrue(horizontal.contains { $0.intersects(v) }, "a stroke closes on one across it")
        }
        for h in horizontal {
            XCTAssertEqual(h.maxX, cell.maxX, accuracy: 0.001, "a right arm reaches the right edge")
        }

        let shade = try glyph(0x2591).paint(in: cell, light: light)
        XCTAssertEqual(shade.fills, [cell])
        XCTAssertEqual(shade.opacity, 0.25)

        let dashes = try glyph(0x254C).paint(in: cell, light: light)
        XCTAssertEqual(dashes.fills.count, 2)
        XCTAssertTrue(dashes.fills.allSatisfy { cell.contains($0) })
    }

    /// Clause (conformance:ios rule ap): no literal of U+2500 to U+259F
    /// stands in the file; every shape is reached by its number.
    func testTheFileHoldsNoLiteralOfTheRange() throws {
        let source = try StyleSource.text("ios/Tortie/Screens/ScreenGlyphs.swift")
        let inRange = source.unicodeScalars.filter { $0.value >= 0x2500 && $0.value <= 0x259F }
        XCTAssertEqual(inRange.count, 0, "ScreenGlyphs.swift spells a box or block character")
        XCTAssertTrue(source.contains("properties.name"))
    }
}
