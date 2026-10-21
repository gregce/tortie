import Foundation
import XCTest
@testable import Tortie

/// Copy joins the rows tmux marked wrapped (Phase 348, build/p348/SPEC.md D23,
/// D43 to D46; research 142 §4.1): a row the Mac marked (tmux's `W`, its last
/// column ink, the main screen) is joined to the next with no line break, its
/// cells untrimmed; every other row keeps today's trim and break; the marks
/// ride the live picture and every page of history by absolute index, a
/// page's last row never overwriting a mark already held. Held to REAL
/// SCREENS: `Fixtures/wraps.json`, which `build/p348/wraps-fixtures.mjs
/// --write` composes from the 34 committed reply captures drawn at 120 by 40
/// and narrowed to 78 on scratch tmux servers, through the SHIPPING read,
/// marks and composer, beside each picture's `capture-pane -p -J` lines: the
/// phone's Copy over every row must equal tmux's own joined lines, split
/// exactly where the ink guard kept a break. Each test names the clause it
/// holds and fails when that clause is taken out of
/// Screens/ScreenSelection.swift, Screens/ScreenRows.swift,
/// Screens/ScreenScrollback.swift or Door/Contract.swift.
@MainActor
final class WrapJoinTests: XCTestCase {
    // MARK: Pictures made here

    /// A picture of `rows` (each one run of its text, a row's cells its
    /// characters) at `cols` columns, with `wraps` as the Mac would mark it.
    private func picture(_ rows: [String], cols: Int, wraps: [Int]? = nil) -> ScreenPicture {
        let lines: [[[String: Any]]] = rows.map { text in
            text.isEmpty ? [] : [["text": text, "style": 0, "cells": text.count]]
        }
        return ScreenSample.picture(lines: lines, cols: cols, wraps: wraps)
    }

    /// Copy over every row of `picture`, from its first cell to its last.
    private func copied(_ picture: ScreenPicture) -> String {
        let last = picture.columns - 1
        let range = ScreenSelectionRange(start: ScreenPoint(row: 0, column: 0), end: ScreenPoint(row: picture.rowCount - 1, column: last))
        return ScreenSelecting.text(range, in: picture)
    }

    // MARK: The join (D46), over research 142's cases at 40 columns

    /// Clause (D46, G1a): a line of 100 characters tmux wrapped over three
    /// rows, the first two marked, copies back as ONE line.
    func testAWrappedLineCopiesBackAsOneLine() {
        let a = String(repeating: "A", count: 40)
        let shown = picture([a, a, String(repeating: "A", count: 20)], cols: 40, wraps: [0, 1])
        XCTAssertEqual(copied(shown), String(repeating: "A", count: 100))
        XCTAssertEqual(shown.rows.map(\.wrapped), [true, true, false])
    }

    /// Clause (D45, D46, G1b and G4b): rows the Mac did NOT mark (the ink
    /// guard kept the break, or tmux marked none) keep today's trim and line
    /// break, whatever their text; and with no marks at all Copy is today's
    /// exactly.
    func testUnmarkedRowsKeepTodaysCopy() {
        let g1b = picture(["status: ok", String(repeating: "A", count: 40), String(repeating: "A", count: 20)], cols: 40, wraps: [1])
        XCTAssertEqual(copied(g1b), "status: ok\n" + String(repeating: "A", count: 60))
        let g4b = picture((1...6).map { "line \($0)" }, cols: 30)
        XCTAssertEqual(copied(g4b), (1...6).map { "line \($0)" }.joined(separator: "\n"))
        let spaced = picture([String(repeating: "x", count: 39) + " ", "after-the-space"], cols: 40)
        XCTAssertEqual(copied(spaced), String(repeating: "x", count: 39) + "\nafter-the-space", "a break kept at a written space is today's Copy")
        let trailing = picture(["a   ", "b"], cols: 4)
        XCTAssertEqual(copied(trailing), "a\nb", "an unmarked row's trailing blanks are trimmed as today")
    }

    /// Clause (D46): a marked row takes its selected cells to its last column
    /// UNTRIMMED, so a line tmux wrapped inside a run of blanks keeps them;
    /// a selection that begins inside a marked row and ends inside the next
    /// takes both halves joined; a selection that ends ON a marked row takes
    /// that row alone, trimmed.
    func testAMarkedRowJoinsItsSelectedCellsUntrimmed() {
        let shown = picture(["echo one  ", "two"], cols: 10, wraps: [0])
        XCTAssertEqual(copied(shown), "echo one  two")
        let middle = ScreenSelectionRange(start: ScreenPoint(row: 0, column: 5), end: ScreenPoint(row: 1, column: 1))
        XCTAssertEqual(ScreenSelecting.text(middle, in: shown), "one  tw")
        let first = ScreenSelectionRange(start: ScreenPoint(row: 0, column: 0), end: ScreenPoint(row: 0, column: 9))
        XCTAssertEqual(ScreenSelecting.text(first, in: shown), "echo one", "a selection that ends on a marked row joined to nothing")
    }

    /// Clause (D46): a marked row joins only to the very next index: a row
    /// that is not drawn (reserved) between them breaks the line, as Copy
    /// always has across a reserved row; and a wide character in a marked
    /// row's last columns joins with no blank.
    func testAMarkJoinsOnlyTheNextRow() {
        let cells: [Int: ([String], Bool)] = [0: (["a", "b"], true), 2: (["c"], false)]
        let range = ScreenSelectionRange(start: ScreenPoint(row: 0, column: 0), end: ScreenPoint(row: 2, column: 1))
        let text = ScreenSelecting.text(range, columns: 2, cells: { cells[$0]?.0 }, wrapped: { cells[$0]?.1 ?? false })
        XCTAssertEqual(text, "ab\nc", "a mark joined across a row that is not drawn")
        let wide = "\u{4E2D}"
        let shown = ScreenSample.picture(
            lines: [[["text": "ab", "style": 0, "cells": 2], ["text": wide, "style": 0, "cells": 2]], [["text": "cd", "style": 0, "cells": 2]]],
            wraps: [0]
        )
        XCTAssertEqual(ScreenSelecting.text(ScreenSelectionRange(start: ScreenPoint(row: 0, column: 0), end: ScreenPoint(row: 1, column: 3)), in: shown), "ab" + wide + "cd")
    }

    // MARK: The marks on the wire (D43)

    /// Clause (D43): the screen's marks are read LENIENTLY: ascending whole
    /// numbers, each a row with a row after it, or no marks at all, and never
    /// a refused picture.
    func testTheScreensMarksAreSquaredOrDropped() throws {
        func marks(_ wraps: Any) throws -> [Int]? {
            try ScreenSample.decode(ScreenSample.answer(screen: ScreenSample.screen(rows: 3, lines: [[], [], []], wraps: wraps))).screen?.wraps
        }
        XCTAssertEqual(try marks([0, 1]), [0, 1])
        XCTAssertEqual(try marks([] as [Int]), [])
        XCTAssertEqual(try marks([2]), [], "the last row named")
        XCTAssertEqual(try marks([1, 0]), [], "not ascending")
        XCTAssertEqual(try marks([0, 0]), [], "a row named twice")
        XCTAssertEqual(try marks([-1]), [], "a negative row")
        XCTAssertEqual(try marks(["0"]), [], "not whole numbers")
        XCTAssertEqual(try marks("0,1"), [], "not a list")
        XCTAssertEqual(try marks([0.5]), [], "a fraction")
        XCTAssertEqual(try ScreenSample.decode(ScreenSample.answer()).screen?.wraps, [], "a Mac older than 348")
        XCTAssertEqual(PocketScreen.marks([0, 3, 6], rows: 8), [0, 3, 6])
        XCTAssertEqual(PocketScreen.marks([7], rows: 8), [], "the last of eight rows named")
        XCTAssertEqual(PocketScreen.marks([0, 3, 7], rows: 8), [], "one mark naming the last row drops the whole list")
        XCTAssertEqual(PocketScreen.marks([Int.max], rows: 8), [], "a mark past the door's bound")
        XCTAssertEqual(PocketScreen.marks(nil, rows: 8), [])
    }

    /// Clause (D43): a page's marks are indices into its rows, its last row
    /// never listed, read leniently as the live picture's are; an absence
    /// carries none.
    func testAPagesMarksAreSquaredOrDropped() throws {
        func page(_ wraps: Any?, rows: Int = 3) throws -> PocketScrollbackAnswer {
            var object: [String: Any] = [
                "sessionId": "s", "at": 1, "from": 0, "depth": 10, "wrap": 4, "space": ScreenSample.space,
                "styles": [ScreenSample.style(fg: ScreenSample.colour("d8dbe2"))],
                "rows": Array(repeating: [["text": "ab", "style": 0, "cells": 2]], count: rows), "why": NSNull(), "sentence": NSNull(),
            ]
            if let wraps { object["wraps"] = wraps }
            return try JSONDecoder().decode(PocketScrollbackAnswer.self, from: try JSONSerialization.data(withJSONObject: object))
        }
        XCTAssertEqual(try page([0, 1]).wraps, [0, 1])
        XCTAssertEqual(try page([2]).wraps, [], "the page's last row named")
        XCTAssertEqual(try page(["x"]).wraps, [])
        XCTAssertEqual(try page(nil).wraps, [], "a Mac older than 348")
        XCTAssertNoThrow(try page([9, 9, 9]), "bad marks refused the page")
    }

    // MARK: A mark per absolute index (D43, D46)

    /// A live picture at `depth` of `rows` rows, `live-<r>` each, at the
    /// scrollback tests' width and space, with `wraps` marked.
    private func live(depth: Int, rows: Int = 40, wraps: [Int]? = nil) -> ScreenPicture {
        let lines: [[[String: Any]]] = (0..<rows).map { r in [["text": "live-\(r)", "style": 0, "cells": "live-\(r)".count]] }
        return ScreenSample.picture(lines: lines, cols: ScrollbackModelTests.wrap, depth: depth, space: ScrollbackModelTests.space, wraps: wraps)
    }

    /// Clause (D43): a row carried from the live picture into the history
    /// keeps the live picture's mark; a page that replaces carried rows
    /// brings its own marks for every row but its LAST, which keeps the mark
    /// the phone already held for that index; and Copy joins across the
    /// history and the live rows by index.
    func testTheHistoryKeepsAMarkPerIndex() throws {
        var layout = ScrollbackLayout()
        layout.picture(live(depth: 500, wraps: [3, 10, 19]), holds: { _ in true })
        XCTAssertGreaterThan(layout.reserve(visibleTop: 500, fill: 57), 0)
        layout.picture(live(depth: 520), holds: { _ in true })
        XCTAssertEqual(layout.row(at: 503, picture: nil)?.wrapped, true, "a carried row lost the live picture's mark")
        XCTAssertEqual(layout.row(at: 510, picture: nil)?.wrapped, true)
        XCTAssertEqual(layout.row(at: 519, picture: nil)?.wrapped, true)
        XCTAssertEqual(layout.row(at: 504, picture: nil)?.wrapped, false)
        let ask = try XCTUnwrap(layout.want(visibleTop: 505, visibleBottom: 560))
        XCTAssertEqual(ask.from, 500)
        XCTAssertEqual(ask.count, 20, "the check over the carried rows")
        var page = ScrollbackModelTests.answer(ask)
        page.wraps = [3, 4]
        XCTAssertEqual(layout.accept(page, for: ask, holds: { _ in true }), .joined(20))
        XCTAssertEqual(layout.row(at: 503, picture: nil)?.wrapped, true)
        XCTAssertEqual(layout.row(at: 504, picture: nil)?.wrapped, true, "the page's own mark was not taken")
        XCTAssertEqual(layout.row(at: 510, picture: nil)?.wrapped, false, "the page's word on a row it drew was not taken")
        XCTAssertEqual(layout.row(at: 519, picture: nil)?.wrapped, true, "the page's LAST row overwrote a mark the phone held")
        let picture = live(depth: 520)
        let held = layout
        let range = ScreenSelectionRange(start: ScreenPoint(row: 519, column: 0), end: ScreenPoint(row: 520, column: 119))
        let text = ScreenSelecting.text(range, columns: picture.columns) { held.row(at: $0, picture: picture) }
        XCTAssertFalse(text.contains("\n"), "Copy did not join the last row of history to the live top: \(text)")
    }

    // MARK: Real screens (D23, D45, D46; SPEC section 4.6 step 17)

    /// One picture of `Fixtures/wraps.json`, as `build/p348/wraps-fixtures.mjs`
    /// writes it (format 1): its name, its width, the picture as `/v1/screen`
    /// carries it (decoded here by the phone's own decoder), its marks,
    /// tmux's own `capture-pane -p -J` lines over the same pane, the rows tmux
    /// flagged wrapped that the ink guard kept broken, and what Copy over
    /// every row must give, line for line.
    private struct Fixture {
        let name: String
        let width: Int
        let picture: ScreenPicture
        let wraps: [Int]
        let joined: [String]
        let kept: [Int]
        let expected: [String]
    }

    /// The fixture file beside this one in the checkout, which a Simulator
    /// process can read, or the copy in the test bundle: the 34 captures'
    /// pictures and the eight redraw cases.
    private func fixtures() throws -> (pictures: [Fixture], cases: [Fixture]) {
        let beside = URL(fileURLWithPath: #filePath).deletingLastPathComponent().appendingPathComponent("Fixtures").appendingPathComponent("wraps.json")
        let bundled = Bundle(for: WrapJoinTests.self).url(forResource: "wraps", withExtension: "json")
        let url = FileManager.default.fileExists(atPath: beside.path) ? beside : (bundled ?? beside)
        // A missing fixture FAILS, never skips: a skip would let the join go
        // unproved over real screens while every suite still reads as run.
        guard FileManager.default.fileExists(atPath: url.path) else { throw MissingFixture() }
        let root = try XCTUnwrap(try JSONSerialization.jsonObject(with: Data(contentsOf: url)) as? [String: Any])
        XCTAssertEqual(root["format"] as? Int, 1, "wraps.json is not the format this file reads")
        let pictures = try XCTUnwrap(root["pictures"] as? [[String: Any]], "wraps.json holds no pictures")
        let cases = try XCTUnwrap(root["cases"] as? [[String: Any]], "wraps.json holds no redraw cases")
        return (try pictures.map(fixture), try cases.map(fixture))
    }

    /// The fixture is not there: the integrator writes it once, after the
    /// Mac's change.
    private struct MissingFixture: Error, CustomStringConvertible {
        var description: String {
            "Fixtures/wraps.json is not written: run node build/p348/wraps-fixtures.mjs --write (the integrator, once)"
        }
    }

    private func fixture(_ entry: [String: Any]) throws -> Fixture {
        let name = try XCTUnwrap(entry["name"] as? String, "a picture with no name")
        let screen = try XCTUnwrap(entry["screen"] as? [String: Any], "\(name): no picture")
        let answer = try ScreenSample.decode(ScreenSample.answer(screen: screen))
        let decoded = try XCTUnwrap(answer.screen, "\(name): the composed picture does not decode")
        return Fixture(
            name: name,
            width: try XCTUnwrap(entry["width"] as? Int, "\(name): no width"),
            picture: ScreenPicture(decoded, revision: ScreenSample.revision, holds: { _ in true }),
            wraps: try XCTUnwrap(entry["wraps"] as? [Int], "\(name): no marks"),
            joined: try XCTUnwrap(entry["joined"] as? [String], "\(name): no capture-pane -J lines"),
            kept: try XCTUnwrap(entry["kept"] as? [Int], "\(name): no kept breaks"),
            expected: try XCTUnwrap(entry["expected"] as? [String], "\(name): no expected lines")
        )
    }

    /// The `-J` lines split where the ink guard split them, by THIS file's own
    /// walk over the phone's rows, never the generator's `expected`: each `-J`
    /// line is consumed row by row; a row that goes on into the next (one the
    /// Mac marked, or one the guard kept broken) takes its full width (its
    /// text, then blanks to the width); after a kept row the line is split;
    /// each piece's trailing blanks are dropped, as Copy drops an unmarked
    /// row's. Every row is walked once, in order, and every line is consumed
    /// whole, or the walk fails by name.
    private func walked(_ fixture: Fixture) -> [String] {
        let marks = Set(fixture.wraps)
        let goesOn = marks.union(fixture.kept)
        let rows = fixture.picture.rows
        var out: [String] = []
        var r = 0
        for line in fixture.joined {
            var rest = Substring(line)
            var piece = ""
            while true {
                guard r < rows.count else {
                    XCTFail("\(fixture.name): more -J lines than rows")
                    return out
                }
                let row = rows[r]
                let text = row.cells.joined()
                if goesOn.contains(r) {
                    guard rest.hasPrefix(text) else {
                        XCTFail("\(fixture.name): row \(r) (\(text.debugDescription)) does not lead its -J line (\(String(rest.prefix(90)).debugDescription))")
                        return out
                    }
                    rest = rest.dropFirst(text.count)
                    let blanks = rest.prefix(max(0, fixture.width - row.cells.count)).prefix { $0 == " " }
                    rest = rest.dropFirst(blanks.count)
                    if marks.contains(r) {
                        piece += text + blanks
                    } else {
                        out.append(ScreenSelecting.trimmed(piece + text))
                        piece = ""
                    }
                    r += 1
                    continue
                }
                let shown = ScreenSelecting.trimmed(text)
                guard rest.hasPrefix(shown), rest.dropFirst(shown.count).allSatisfy({ $0 == " " }) else {
                    XCTFail("\(fixture.name): row \(r) (\(shown.debugDescription)) does not end its -J line (\(String(rest.prefix(90)).debugDescription))")
                    return out
                }
                out.append(ScreenSelecting.trimmed(piece + shown))
                r += 1
                break
            }
        }
        XCTAssertEqual(r, rows.count, "\(fixture.name): the -J lines cover \(r) of \(rows.count) rows")
        return out
    }

    /// Clause (D23, D43, D45, D46; SPEC section 4.6 step 17): over every
    /// picture of the 34 real captures and the eight redraw cases, the phone's
    /// decoder keeps every mark the SHIPPING composer set; Copy over every row
    /// reads, line for line, tmux's own `-J` lines with every line the ink
    /// guard kept broken split where the guard split it, by this file's own
    /// walk AND as the generator wrote it; and the pictures hold joins and
    /// kept breaks both, so the clause proves the join rather than reading
    /// nothing.
    func testRealScreensCopyBackAsTmuxJoinsThem() throws {
        let (pictures, cases) = try fixtures()
        XCTAssertEqual(pictures.count, 34, "not the 34 committed reply captures")
        XCTAssertEqual(cases.count, 8, "not research 142's eight redraw cases")
        var joins = 0
        var kept = 0
        for fixture in pictures + cases {
            XCTAssertEqual(fixture.picture.columns, fixture.width, fixture.name)
            XCTAssertEqual(
                fixture.picture.rows.indices.filter { fixture.picture.rows[$0].wrapped }, fixture.wraps,
                "\(fixture.name): the phone did not keep the marks the composer set"
            )
            let range = ScreenSelectionRange(
                start: ScreenPoint(row: 0, column: 0),
                end: ScreenPoint(row: fixture.picture.rowCount - 1, column: fixture.picture.columns - 1)
            )
            let copied = ScreenSelecting.text(range, in: fixture.picture)
            XCTAssertEqual(copied, fixture.expected.joined(separator: ScreenSelecting.lineBreak), fixture.name)
            XCTAssertEqual(walked(fixture), fixture.expected, "\(fixture.name): the generator's lines are not tmux's -J lines split at the kept breaks")
            joins += fixture.wraps.count
            kept += fixture.kept.count
        }
        XCTAssertGreaterThan(joins, 0, "no picture joins a row: the fixture proves nothing")
        XCTAssertGreaterThan(kept, 0, "no picture keeps a break the ink guard kept")
        print("P348_WRAPS|\(pictures.count) pictures|\(cases.count) cases|\(joins) joined|\(kept) kept")
    }

    /// Clause (D46, today's Copy): the same pictures with their marks taken
    /// away copy back exactly as the build before this phase copied them,
    /// every row its own line, trimmed; so a join the fixture proves is the
    /// marks' doing and nothing else's.
    func testRealScreensWithNoMarksCopyAsToday() throws {
        let (pictures, _) = try fixtures()
        for fixture in pictures where !fixture.wraps.isEmpty {
            let bare = fixture.picture.rows.map { row in ScreenSelecting.trimmed(row.cells.joined()) }
            let range = ScreenSelectionRange(
                start: ScreenPoint(row: 0, column: 0),
                end: ScreenPoint(row: fixture.picture.rowCount - 1, column: fixture.picture.columns - 1)
            )
            let unmarked = ScreenSelecting.text(range, columns: fixture.picture.columns, cells: { r in
                fixture.picture.rows.indices.contains(r) ? fixture.picture.rows[r].cells : nil
            })
            XCTAssertEqual(unmarked, bare.joined(separator: ScreenSelecting.lineBreak), fixture.name)
            XCTAssertNotEqual(unmarked, fixture.expected.joined(separator: ScreenSelecting.lineBreak), "\(fixture.name): its marks join nothing")
        }
    }
}
