// The Screen's box drawing and block elements, drawn as shapes and never as a
// font's glyphs (Phase 337, build/p337/SPEC.md D26 and section 5.8.4).
//
// WHY SHAPES. A box an agent draws is a grid of cells that must meet edge to
// edge, and a font's box glyph is drawn at the font's own height and weight,
// so its lines stop short of the cell or overshoot it and a frame breaks into
// dashes. Drawn as strokes and rectangles in cell units, every line meets its
// neighbour's whatever the zoom. The DESIGN is Paseo's
// (packages/app/src/terminal/native-renderer/terminal-custom-glyph.ts at
// getpaseo/paseo 2f0cb2f54be5742d6fc7e9b85ba39808ac22ad93, Apache-2.0, by the
// Paseo authors): box drawing and block elements as paths and rectangles in
// cell units. No Paseo code is copied, and NOT ITS TABLE: Paseo's holds 55
// code points and lacks nine the committed captures draw (`U+254C`, 1,676
// times, Claude Code's dashed rule; `U+2550`, `U+2551`, `U+2554`, `U+2557`,
// `U+255A`, `U+255D`; `U+2591`, `U+2593`), and a transcribed table would
// carry Apache-2.0's notice duties into the shipped app (§Attack A3).
//
// TORTIE'S OWN RULE: every shape of U+2500 to U+259F is DERIVED from the code
// point's own Unicode name (`Unicode.Scalar.Properties.name`), once, into a
// dictionary. The 160 names use 37 words, read so:
//
//   BOX DRAWINGS …          lines from the cell's middle to its edges. The
//                           name is groups joined by AND; each group names
//                           arms (UP, DOWN, LEFT, RIGHT; HORIZONTAL is left and
//                           right, VERTICAL up and down) and a weight (LIGHT or
//                           SINGLE, HEAVY, DOUBLE) that binds to the arms
//                           beside it; a group with no weight takes the first
//                           group's (`LIGHT DOWN AND RIGHT`). A double arm is
//                           two strokes a third of the cell apart.
//   DOUBLE, TRIPLE, QUADRUPLE directly before DASH
//                           a dash count, not a weight (`LIGHT DOUBLE DASH
//                           HORIZONTAL` is a light line of two dashes).
//   ARC                     a quarter circle joining the two arms named.
//   DIAGONAL                corner to corner: UPPER RIGHT TO LOWER LEFT rises,
//                           UPPER LEFT TO LOWER RIGHT falls, CROSS is both.
//   … BLOCK                 a rectangle: UPPER, LOWER, LEFT or RIGHT with HALF,
//                           or ONE to SEVEN EIGHTH(S), or ONE or THREE
//                           QUARTER(S); FULL is the whole cell.
//   QUADRANT …              quarter cells, joined by AND.
//   LIGHT, MEDIUM, DARK SHADE
//                           the whole cell in the ink at 25, 50 and 75 percent.
//
// A name this rule does not read draws the font's glyph, and
// ios/TortieTests/ScreenGlyphTests.swift holds the set of such code points
// frozen at none. No literal of U+2500 to U+259F stands in this file
// (conformance:ios rule ap): every code point is reached by its number.

import SwiftUI

// MARK: - The shapes

/// How heavy one arm of a box line is.
enum ScreenLineWeight: Equatable, Sendable {
    /// LIGHT or SINGLE: one stroke.
    case light
    /// HEAVY: one stroke, twice as thick.
    case heavy
    /// DOUBLE: two light strokes a third of the cell apart.
    case double
}

/// The four arms of a box line, each absent or of a weight.
struct ScreenArms: Equatable, Sendable {
    var up: ScreenLineWeight?
    var down: ScreenLineWeight?
    var left: ScreenLineWeight?
    var right: ScreenLineWeight?

    /// The arm in one direction.
    subscript(_ side: ScreenSide) -> ScreenLineWeight? {
        get {
            switch side {
            case .up: up
            case .down: down
            case .left: left
            case .right: right
            }
        }
        set {
            switch side {
            case .up: up = newValue
            case .down: down = newValue
            case .left: left = newValue
            case .right: right = newValue
            }
        }
    }
}

/// A direction from the cell's middle.
enum ScreenSide: CaseIterable, Sendable {
    case up, down, left, right

    var opposite: ScreenSide {
        switch self {
        case .up: .down
        case .down: .up
        case .left: .right
        case .right: .left
        }
    }

    /// The two directions across this one: left and right for a vertical
    /// arm, up and down for a horizontal one, the negative side first.
    var across: (ScreenSide, ScreenSide) {
        switch self {
        case .up, .down: (.left, .right)
        case .left, .right: (.up, .down)
        }
    }

    var isVertical: Bool { self == .up || self == .down }
}

/// One shape of U+2500 to U+259F, in the cell's own units.
enum ScreenGlyph: Equatable, Sendable {
    /// Lines from the middle to the edges.
    case lines(ScreenArms)
    /// A straight dashed line, `dashes` dashes in the cell.
    case dashes(ScreenLineWeight, vertical: Bool, dashes: Int)
    /// A quarter circle joining a vertical arm and a horizontal one.
    case arc(ScreenSide, ScreenSide)
    /// Corner to corner: `rising` is lower left to upper right.
    case diagonal(rising: Bool, falling: Bool)
    /// Rectangles of the unit cell, filled.
    case blocks([CGRect])
    /// The whole cell in the ink at this opacity.
    case shade(Double)
}

// MARK: - The names, read

enum ScreenGlyphs {
    /// The first and last code points derived.
    static let first: UInt32 = 0x2500
    static let last: UInt32 = 0x259F

    /// Every shape of U+2500 to U+259F, derived from its name once.
    static let shapes: [UInt32: ScreenGlyph] = {
        var out: [UInt32: ScreenGlyph] = [:]
        for value in first...last {
            guard let scalar = Unicode.Scalar(value), let name = scalar.properties.name,
                  let glyph = shape(named: name) else { continue }
            out[value] = glyph
        }
        return out
    }()

    /// The code points of the range whose names the rule does not read:
    /// drawn with the font's glyph. Frozen at none by ScreenGlyphTests.
    static var unread: [UInt32] {
        (first...last).filter { shapes[$0] == nil }
    }

    /// The shape a character is drawn as, or nil to draw the font's glyph.
    static func shape(for character: Character) -> ScreenGlyph? {
        guard character.unicodeScalars.count == 1, let scalar = character.unicodeScalars.first else { return nil }
        return shapes[scalar.value]
    }

    /// One name, read by the rule in this file's header; nil when it is not.
    static func shape(named name: String) -> ScreenGlyph? {
        let words = name.split(separator: " ").map(String.init)
        if words.count > 2, words[0] == Word.box, words[1] == Word.drawings {
            return boxLines(Array(words.dropFirst(2)))
        }
        if words.last == Word.shade, words.count == 2 {
            switch words[0] {
            case Word.light: return .shade(0.25)
            case Word.medium: return .shade(0.5)
            case Word.dark: return .shade(0.75)
            default: return nil
            }
        }
        if words.first == Word.quadrant {
            return quadrants(Array(words.dropFirst()))
        }
        if words.last == Word.block {
            return block(Array(words.dropLast()))
        }
        return nil
    }

    // MARK: Box drawings

    private static func boxLines(_ words: [String]) -> ScreenGlyph? {
        if words.contains(Word.arc) { return arc(words) }
        if words.contains(Word.diagonal) { return diagonal(words) }
        if let at = words.firstIndex(of: Word.dash) { return dashes(words, at: at) }
        var arms = ScreenArms()
        var leading: ScreenLineWeight?
        for (place, group) in groups(words).enumerated() {
            var weight: ScreenLineWeight?
            var sides: [ScreenSide] = []
            for word in group {
                if let named = Self.weight(word) {
                    guard weight == nil else { return nil }
                    weight = named
                } else if let named = Self.sides(word) {
                    sides.append(contentsOf: named)
                } else {
                    return nil
                }
            }
            if place == 0 { leading = weight }
            guard let drawn = weight ?? leading, !sides.isEmpty else { return nil }
            for side in sides {
                guard arms[side] == nil else { return nil }
                arms[side] = drawn
            }
        }
        return arms == ScreenArms() ? nil : .lines(arms)
    }

    /// `LIGHT ARC DOWN AND RIGHT`: the two arms joined by a quarter circle.
    private static func arc(_ words: [String]) -> ScreenGlyph? {
        let sides = words.compactMap { Self.sides($0) }.flatMap { $0 }
        guard words.first == Word.light, sides.count == 2,
              let vertical = sides.first(where: \.isVertical),
              let horizontal = sides.first(where: { !$0.isVertical }) else { return nil }
        return .arc(vertical, horizontal)
    }

    /// `LIGHT DIAGONAL UPPER RIGHT TO LOWER LEFT`, `… UPPER LEFT TO LOWER
    /// RIGHT`, `LIGHT DIAGONAL CROSS`.
    private static func diagonal(_ words: [String]) -> ScreenGlyph? {
        guard words.first == Word.light, words.count > 2 else { return nil }
        let rest = Array(words.dropFirst(2))
        if rest == [Word.cross] { return .diagonal(rising: true, falling: true) }
        if rest == [Word.upper, Word.right, Word.to, Word.lower, Word.left] { return .diagonal(rising: true, falling: false) }
        if rest == [Word.upper, Word.left, Word.to, Word.lower, Word.right] { return .diagonal(rising: false, falling: true) }
        return nil
    }

    /// `<weight> DOUBLE|TRIPLE|QUADRUPLE DASH HORIZONTAL|VERTICAL`: the word
    /// directly before DASH is a count, never a weight.
    private static func dashes(_ words: [String], at dash: Int) -> ScreenGlyph? {
        guard words.count == 4, dash == 2, let weight = Self.weight(words[0]), weight != .double,
              let count = dashCount(words[1]) else { return nil }
        switch words[3] {
        case Word.horizontal: return .dashes(weight, vertical: false, dashes: count)
        case Word.vertical: return .dashes(weight, vertical: true, dashes: count)
        default: return nil
        }
    }

    // MARK: Blocks

    /// `UPPER HALF`, `LOWER THREE EIGHTHS`, `LEFT ONE QUARTER`, `FULL`, … of
    /// `… BLOCK`.
    private static func block(_ words: [String]) -> ScreenGlyph? {
        if words == [Word.full] { return .blocks([CGRect(x: 0, y: 0, width: 1, height: 1)]) }
        guard let edge = words.first, let part = fraction(Array(words.dropFirst())) else { return nil }
        switch edge {
        case Word.upper: return .blocks([CGRect(x: 0, y: 0, width: 1, height: part)])
        case Word.lower: return .blocks([CGRect(x: 0, y: 1.0 - part, width: 1, height: part)])
        case Word.left: return .blocks([CGRect(x: 0, y: 0, width: part, height: 1)])
        case Word.right: return .blocks([CGRect(x: 1.0 - part, y: 0, width: part, height: 1)])
        default: return nil
        }
    }

    /// `HALF`, `ONE EIGHTH` to `SEVEN EIGHTHS`, `ONE QUARTER`, `THREE
    /// QUARTERS`: the fraction of the cell.
    private static func fraction(_ words: [String]) -> CGFloat? {
        if words == [Word.half] { return 0.5 }
        guard words.count == 2, let count = number(words[0]) else { return nil }
        switch words[1] {
        case Word.eighth, Word.eighths: return CGFloat(count) / 8.0
        case Word.quarter, Word.quarters: return CGFloat(count) / 4.0
        default: return nil
        }
    }

    /// `QUADRANT UPPER LEFT AND LOWER RIGHT`: the quarter cells named.
    private static func quadrants(_ words: [String]) -> ScreenGlyph? {
        var rects: [CGRect] = []
        for group in groups(words) {
            guard group.count == 2 else { return nil }
            let top: CGFloat
            let lead: CGFloat
            switch group[0] {
            case Word.upper: top = 0
            case Word.lower: top = 0.5
            default: return nil
            }
            switch group[1] {
            case Word.left: lead = 0
            case Word.right: lead = 0.5
            default: return nil
            }
            rects.append(CGRect(x: lead, y: top, width: 0.5, height: 0.5))
        }
        return rects.isEmpty ? nil : .blocks(rects)
    }

    // MARK: Words

    /// The words of a name split at AND.
    private static func groups(_ words: [String]) -> [[String]] {
        words.split(separator: Word.and, omittingEmptySubsequences: false).map(Array.init)
    }

    private static func weight(_ word: String) -> ScreenLineWeight? {
        switch word {
        case Word.light, Word.single: .light
        case Word.heavy: .heavy
        case Word.double: .double
        default: nil
        }
    }

    private static func sides(_ word: String) -> [ScreenSide]? {
        switch word {
        case Word.up: [.up]
        case Word.down: [.down]
        case Word.left: [.left]
        case Word.right: [.right]
        case Word.horizontal: [.left, .right]
        case Word.vertical: [.up, .down]
        default: nil
        }
    }

    private static func dashCount(_ word: String) -> Int? {
        switch word {
        case Word.double: 2
        case Word.triple: 3
        case Word.quadruple: 4
        default: nil
        }
    }

    private static func number(_ word: String) -> Int? {
        switch word {
        case Word.one: 1
        case Word.three: 3
        case Word.five: 5
        case Word.seven: 7
        default: nil
        }
    }

    /// The words the rule reads, as Unicode spells them.
    private enum Word {
        static let box = "BOX"
        static let drawings = "DRAWINGS"
        static let light = "LIGHT"
        static let single = "SINGLE"
        static let heavy = "HEAVY"
        static let double = "DOUBLE"
        static let triple = "TRIPLE"
        static let quadruple = "QUADRUPLE"
        static let dash = "DASH"
        static let up = "UP"
        static let down = "DOWN"
        static let left = "LEFT"
        static let right = "RIGHT"
        static let horizontal = "HORIZONTAL"
        static let vertical = "VERTICAL"
        static let and = "AND"
        static let arc = "ARC"
        static let diagonal = "DIAGONAL"
        static let cross = "CROSS"
        static let upper = "UPPER"
        static let lower = "LOWER"
        static let to = "TO"
        static let block = "BLOCK"
        static let full = "FULL"
        static let half = "HALF"
        static let one = "ONE"
        static let three = "THREE"
        static let five = "FIVE"
        static let seven = "SEVEN"
        static let eighth = "EIGHTH"
        static let eighths = "EIGHTHS"
        static let quarter = "QUARTER"
        static let quarters = "QUARTERS"
        static let quadrant = "QUADRANT"
        static let shade = "SHADE"
        static let medium = "MEDIUM"
        static let dark = "DARK"
    }
}

// MARK: - The shapes, in a cell

/// What one shape draws in one cell: rectangles filled in the ink, strokes
/// in the ink at `strokeWidth`, all at `opacity`.
struct ScreenGlyphPaint {
    var fills: [CGRect] = []
    var strokes: [Path] = []
    var strokeWidth: CGFloat = 1
    var opacity: Double = 1
}

extension ScreenGlyph {
    /// The offset of a double line's two strokes from the middle: a third of
    /// the cell apart.
    static let doubleOffset: CGFloat = 1.0 / 6.0
    /// A quarter circle's radius, in the cell's units.
    static let arcRadius: CGFloat = 0.25

    /// The shape in `cell`, whose light line is `light` points thick.
    func paint(in cell: CGRect, light: CGFloat) -> ScreenGlyphPaint {
        let toCell = CGAffineTransform(a: cell.width, b: 0, c: 0, d: cell.height, tx: cell.minX, ty: cell.minY)
        var out = ScreenGlyphPaint()
        out.strokeWidth = light
        switch self {
        case .lines(let arms):
            out.fills = Self.lineRects(arms, across: Thickness(cell: cell, light: light)).map { $0.applying(toCell) }
        case .dashes(let weight, let vertical, let count):
            out.fills = Self.dashRects(weight, vertical: vertical, count: count, across: Thickness(cell: cell, light: light))
                .map { $0.applying(toCell) }
        case .arc(let vertical, let horizontal):
            out.strokes = [Self.arcPath(vertical, horizontal).applying(toCell)]
        case .diagonal(let rising, let falling):
            var lines: [Path] = []
            if rising { lines.append(Path { p in p.move(to: CGPoint(x: 0, y: 1)); p.addLine(to: CGPoint(x: 1, y: 0)) }) }
            if falling { lines.append(Path { p in p.move(to: CGPoint(x: 0, y: 0)); p.addLine(to: CGPoint(x: 1, y: 1)) }) }
            out.strokes = lines.map { $0.applying(toCell) }
        case .blocks(let rects):
            out.fills = rects.map { $0.applying(toCell) }
        case .shade(let opacity):
            out.fills = [cell]
            out.opacity = opacity
        }
        return out
    }

    /// A light line's thickness in the cell's units, across a vertical arm
    /// (a share of the width) and across a horizontal one (of the height).
    struct Thickness {
        let vertical: CGFloat
        let horizontal: CGFloat

        init(cell: CGRect, light: CGFloat) {
            vertical = CGFloat(light) / max(cell.width, 1)
            horizontal = CGFloat(light) / max(cell.height, 1)
        }

        /// Across an arm going `side`, at `weight`.
        func of(_ side: ScreenSide, _ weight: ScreenLineWeight) -> CGFloat {
            let one = side.isVertical ? vertical : horizontal
            return weight == .heavy ? CGFloat(one) * 2.0 : one
        }
    }

    /// The rectangles of a box line, in the unit cell.
    static func lineRects(_ arms: ScreenArms, across thick: Thickness) -> [CGRect] {
        var rects: [CGRect] = []
        for side in ScreenSide.allCases {
            guard let weight = arms[side] else { continue }
            let (negative, positive) = side.across
            if weight == .double {
                // Half a light line across this arm's way, so each stroke
                // closes on the one it meets.
                let closing = CGFloat(thick.of(negative, .light)) * 0.5
                let width = thick.of(side, .light)
                let near = CGFloat(doubleStop(side, toward: negative, arms: arms)) - closing
                let far = CGFloat(doubleStop(side, toward: positive, arms: arms)) - closing
                rects.append(stroke(side, at: 0.0 - doubleOffset, begin: near, width: width))
                rects.append(stroke(side, at: doubleOffset, begin: far, width: width))
            } else {
                rects.append(stroke(side, at: 0, begin: singleStop(side, arms: arms, across: thick), width: thick.of(side, weight)))
            }
        }
        return rects
    }

    /// Where a double arm's stroke on the `toward` side begins, as a signed
    /// distance from the middle toward the arm's edge: at the near stroke of
    /// a double arm on that side, at the line of a single one, through the
    /// middle when the opposite arm goes on, round the outside of a corner
    /// whose other arm is double, and at the middle otherwise.
    static func doubleStop(_ side: ScreenSide, toward: ScreenSide, arms: ScreenArms) -> CGFloat {
        if let near = arms[toward] { return near == .double ? doubleOffset : 0 }
        if arms[side.opposite] != nil { return 0 }
        if let far = arms[toward.opposite] { return far == .double ? 0.0 - doubleOffset : 0 }
        return 0
    }

    /// Where a single or heavy arm begins: past the middle far enough to
    /// meet the strokes across it, so every join is closed.
    static func singleStop(_ side: ScreenSide, arms: ScreenArms, across thick: Thickness) -> CGFloat {
        let (negative, positive) = side.across
        var reach: CGFloat = 0
        for other in [negative, positive] {
            guard let weight = arms[other] else { continue }
            let half = CGFloat(thick.of(other, weight == .double ? .light : weight)) * 0.5
            let needed = weight == .double ? CGFloat(doubleOffset) + half : half
            reach = max(reach, needed)
        }
        return 0.0 - reach
    }

    /// One stroke of an arm going `side`, `offset` across the middle, `width`
    /// thick, from `begin` (a signed distance from the middle toward the
    /// arm's edge; below zero is past the middle) to that edge.
    private static func stroke(_ side: ScreenSide, at offset: CGFloat, begin: CGFloat, width: CGFloat) -> CGRect {
        let lead = 0.5 + CGFloat(offset) - CGFloat(width) * 0.5
        let length = 0.5 - CGFloat(begin)
        switch side {
        case .up: return CGRect(x: lead, y: 0, width: width, height: length)
        case .down: return CGRect(x: lead, y: 0.5 + CGFloat(begin), width: width, height: length)
        case .left: return CGRect(x: 0, y: lead, width: length, height: width)
        case .right: return CGRect(x: 0.5 + CGFloat(begin), y: lead, width: length, height: width)
        }
    }

    /// `count` dashes along the middle, each half its share of the cell,
    /// centred in it, so dashes keep their spacing from cell to cell.
    static func dashRects(_ weight: ScreenLineWeight, vertical: Bool, count: Int, across thick: Thickness) -> [CGRect] {
        let width = thick.of(vertical ? .up : .left, weight)
        let lead = 0.5 - CGFloat(width) * 0.5
        let share = 1.0 / CGFloat(max(count, 1))
        return (0..<max(count, 1)).map { place in
            let start = CGFloat(place) * share + CGFloat(share) * 0.25
            let length = CGFloat(share) * 0.5
            return vertical
                ? CGRect(x: lead, y: start, width: width, height: length)
                : CGRect(x: start, y: lead, width: length, height: width)
        }
    }

    /// A quarter circle from the vertical arm's edge to the horizontal arm's,
    /// through the cell's middle region, in the unit cell.
    static func arcPath(_ vertical: ScreenSide, _ horizontal: ScreenSide) -> Path {
        let edgeY: CGFloat = vertical == .up ? 0 : 1
        let edgeX: CGFloat = horizontal == .left ? 0 : 1
        let towardY: CGFloat = vertical == .up ? -1 : 1
        let towardX: CGFloat = horizontal == .left ? -1 : 1
        return Path { p in
            p.move(to: CGPoint(x: 0.5, y: edgeY))
            p.addLine(to: CGPoint(x: 0.5, y: CGFloat(towardY) * arcRadius + 0.5))
            p.addQuadCurve(to: CGPoint(x: CGFloat(towardX) * arcRadius + 0.5, y: 0.5), control: CGPoint(x: 0.5, y: 0.5))
            p.addLine(to: CGPoint(x: edgeX, y: 0.5))
        }
    }
}
