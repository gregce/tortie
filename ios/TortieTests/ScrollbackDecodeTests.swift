import Foundation
import XCTest
@testable import Tortie

/// One page of a session's history, decoded STRICTLY (Phase 337.1,
/// build/p3371/SPEC.md D7, D8 and section 5.5.2): every bound one at a time,
/// each refusing the whole answer, so no half-trusted page is ever joined to
/// the rows the Terminal holds. Each test names the clause it holds and fails
/// when that clause is taken out of Door/Contract.swift.
final class ScrollbackDecodeTests: XCTestCase {
    private static let space = "5eed0123abcd"

    /// A run of `cells` cells of text.
    private static func run(_ text: String, style: Int = 0, cells: Int? = nil) -> [String: Any] {
        ["text": text, "style": style, "cells": cells ?? text.count]
    }

    /// A page answer, field by field.
    private static func page(
        from: Any? = 100,
        depth: Any? = 3_000,
        wrap: Any? = 120,
        space: Any? = space,
        styles: [[String: Any]]? = nil,
        rows: [[[String: Any]]]? = nil,
        why: Any? = nil,
        sentence: Any? = nil,
        session: String = "s"
    ) -> [String: Any] {
        [
            "sessionId": session, "at": 1_791_158_400_000,
            "from": from ?? NSNull(), "depth": depth ?? NSNull(), "wrap": wrap ?? NSNull(), "space": space ?? NSNull(),
            "styles": styles ?? [ScreenSample.style(fg: ScreenSample.colour("d8dbe2"))],
            "rows": rows ?? [[run("L000101")], [run("L000102")]],
            "why": why ?? NSNull(), "sentence": sentence ?? NSNull(),
        ]
    }

    private func decode(_ answer: [String: Any]) throws -> PocketScrollbackAnswer {
        try JSONDecoder().decode(PocketScrollbackAnswer.self, from: try JSONSerialization.data(withJSONObject: answer))
    }

    private func decodes(_ answer: [String: Any]) -> Bool {
        (try? decode(answer)) != nil
    }

    /// An absence: no index space and no row.
    private static func absence(_ why: String, _ sentence: Any? = "s.") -> [String: Any] {
        page(from: nil, depth: nil, wrap: nil, space: nil, styles: [], rows: [], why: why, sentence: sentence)
    }

    /// Clause: a page the Mac composed decodes, under its own names.
    func testAWellFormedPageDecodes() throws {
        let read = try decode(Self.page())
        XCTAssertEqual(read.pageFrom, 100)
        XCTAssertEqual(read.pageDepth, 3_000)
        XCTAssertEqual(read.pageWrap, 120)
        XCTAssertEqual(read.space, Self.space)
        XCTAssertEqual(read.rows.count, 2)
        XCTAssertEqual(read.rows[0].first?.text, "L000101")
        XCTAssertNil(read.why)
        XCTAssertNil(read.sentence)
    }

    /// Clause: `from`, `depth` and `wrap` are whole numbers in their bounds,
    /// and `space` 12 lowercase hex.
    func testTheIndexSpaceIsBounded() {
        XCTAssertTrue(decodes(Self.page(from: 0, depth: 2)), "the oldest line")
        XCTAssertTrue(decodes(Self.page(from: 99_998, depth: 100_000)), "the deepest index")
        XCTAssertTrue(decodes(Self.page(wrap: 512, rows: [[Self.run(String(repeating: "x", count: 512))]])))
        let refused: [(String, [String: Any])] = [
            ("a from past the deepest index", Self.page(from: 100_001, depth: 100_000)),
            ("a depth past the deepest index", Self.page(depth: 100_001)),
            ("a negative from", Self.page(from: -1)),
            ("a fractional from", Self.page(from: 1.5)),
            ("a from no door could send", Self.page(from: Int.max)),
            ("a negative depth", Self.page(depth: -1)),
            ("a width of 0", Self.page(wrap: 0)),
            ("a width of 513", Self.page(wrap: 513)),
            ("a space in capitals", Self.page(space: "5EED0123ABCD")),
            ("a space too long", Self.page(space: "5eed0123abcd0")),
            ("a space that is not hex", Self.page(space: "5eed0123abcz")),
            ("a space that is a number", Self.page(space: 12)),
        ]
        for (name, answer) in refused {
            XCTAssertFalse(decodes(answer), name)
        }
    }

    /// Clause: `from` plus the rows is at most `depth`: a page past the top
    /// of the history it names is no page.
    func testThePageIsInsideTheHistoryItNames() {
        XCTAssertTrue(decodes(Self.page(from: 2_998, depth: 3_000)))
        XCTAssertFalse(decodes(Self.page(from: 2_999, depth: 3_000)), "one row past the depth")
        XCTAssertFalse(decodes(Self.page(from: 0, depth: 1)))
    }

    /// Clause: at most 128 rows, and none is no page.
    func testAtMostOneHundredAndTwentyEightRows() {
        let row = [Self.run("x")]
        XCTAssertTrue(decodes(Self.page(from: 0, rows: Array(repeating: row, count: 128))))
        XCTAssertFalse(decodes(Self.page(from: 0, rows: Array(repeating: row, count: 129))))
        XCTAssertFalse(decodes(Self.page(rows: [])), "a page with no row and no absence")
    }

    /// Clause: every run covers 1 to `wrap` cells, a row's runs cover no
    /// more than `wrap`, summed through `DoorNumber`, and every style index
    /// is in the page's own table.
    func testEveryRunIsInsideItsRow() {
        XCTAssertTrue(decodes(Self.page(wrap: 4, rows: [[Self.run("ab"), Self.run("cd")]])))
        XCTAssertFalse(decodes(Self.page(wrap: 4, rows: [[Self.run("ab"), Self.run("cde")]])), "a row past the width")
        XCTAssertFalse(decodes(Self.page(wrap: 4, rows: [[Self.run("abcde")]])), "a run past the width")
        XCTAssertFalse(decodes(Self.page(rows: [[Self.run("a", cells: 0)]])), "a run of no cells")
        XCTAssertFalse(decodes(Self.page(rows: [[Self.run("a", cells: Int.max)]])), "a count no door could send")
        XCTAssertFalse(decodes(Self.page(rows: [[Self.run("a", style: 1)]])), "a style index out of the page's table")
        XCTAssertTrue(decodes(Self.page(styles: [], rows: [[]])), "an empty row needs no style")
    }

    /// Clause: at most 1,024 styles, and every colour `#` and six lowercase
    /// hex digits.
    func testStylesAndColours() {
        let style = ScreenSample.style(fg: ScreenSample.colour("d8dbe2"))
        XCTAssertTrue(decodes(Self.page(styles: Array(repeating: style, count: 1_024))))
        XCTAssertFalse(decodes(Self.page(styles: Array(repeating: style, count: 1_025))))
        for bad in ["d8dbe2", ScreenSample.colour("D8DBE2"), ScreenSample.colour("d8dbe"), "rgb(1,2,3)"] {
            XCTAssertFalse(decodes(Self.page(styles: [ScreenSample.style(fg: bad)])), "fg \(bad)")
            XCTAssertFalse(decodes(Self.page(styles: [ScreenSample.style(fg: ScreenSample.colour("d8dbe2"), bg: bad)])), "bg \(bad)")
        }
    }

    /// Clause: an absence is one of four words with main's non-empty
    /// sentence, and carries no index space and no row; a sentence comes only
    /// with an absence.
    func testAnAbsenceIsOneOfFourWithASentenceAndNothingElse() throws {
        for why in ["ended", "unreachable", "moved", "busy"] {
            let read = try decode(Self.absence(why))
            XCTAssertEqual(read.why?.rawValue, why)
            XCTAssertNil(read.pageFrom)
            XCTAssertTrue(read.rows.isEmpty)
        }
        XCTAssertFalse(decodes(Self.absence("gone")), "a word this build does not know")
        XCTAssertFalse(decodes(Self.absence("moved", nil)), "an absence with no sentence")
        XCTAssertFalse(decodes(Self.absence("moved", "")), "an empty sentence")
        XCTAssertFalse(decodes(Self.page(sentence: "s.")), "a sentence with a page")
        var withRows = Self.absence("moved")
        withRows["rows"] = [[Self.run("x")]]
        XCTAssertFalse(decodes(withRows), "an absence with rows")
        for key in ["from", "depth", "wrap", "space"] {
            var carrying = Self.absence("busy")
            carrying[key] = key == "space" ? Self.space : 1
            XCTAssertFalse(decodes(carrying), "an absence carrying \(key)")
        }
        for key in ["from", "depth", "wrap", "space"] {
            var missing = Self.page()
            missing[key] = NSNull()
            XCTAssertFalse(decodes(missing), "a page with a null \(key) and no absence")
        }
    }

    /// Clause: a field the contract always sends refuses the answer when it
    /// is missing, the nullable ones included.
    func testAMissingFieldRefusesTheAnswer() {
        for key in ["sessionId", "at", "from", "depth", "wrap", "space", "styles", "rows", "why", "sentence"] {
            var answer = Self.page()
            answer[key] = nil
            XCTAssertFalse(decodes(answer), "a page with no \(key)")
        }
    }

    /// Clause (D7, rules ah and as): the page's target names exactly `id`,
    /// `from`, `count`, `depth`, `wrap` and `keep`, in that order, the id
    /// percent-encoded as every query value is, and never a size.
    func testTheScrollbackTarget() {
        XCTAssertEqual(
            DoorClient.scrollbackTarget("a b", from: 2_900, count: 108, depth: 3_000, wrap: 120, keep: .bottom),
            "/v1/scrollback?id=a%20b&from=2900&count=108&depth=3000&wrap=120&keep=bottom"
        )
        XCTAssertEqual(
            DoorClient.scrollbackTarget("s", from: 0, count: 1, depth: 1, wrap: 1, keep: .top),
            "/v1/scrollback?id=s&from=0&count=1&depth=1&wrap=1&keep=top"
        )
        let target = DoorClient.scrollbackTarget("s", from: 1, count: 2, depth: 3, wrap: 4, keep: .top)
        let names = target.split(separator: "?")[1].split(separator: "&").map { String($0.split(separator: "=")[0]) }
        XCTAssertEqual(names, ["id", "from", "count", "depth", "wrap", "keep"])
        for word in ["cols", "rows", "width", "height", "size", "resize"] {
            XCTAssertFalse(target.contains(word), word)
        }
    }

    /// Clause (rule v): the scrollback's sentence is never empty, and a
    /// refused page says the earlier lines changed.
    func testTheScrollbackSentence() {
        let failures: [DoorFailure] = [
            .notPaired, .wrongKey, .nameNotFound, .unreachable(code: 61), .timedOut, .refused, .closedBeforeAnswer,
            .unexpectedStatus(500), .tooLarge, .malformed, .badPage, .cancelled,
        ]
        for failure in failures {
            XCTAssertFalse(DoorWords.scrollbackSentence(for: failure).isEmpty, "\(failure)")
        }
        XCTAssertEqual(DoorWords.scrollbackSentence(for: .refused), Copy.scrollbackMoved)
        XCTAssertEqual(DoorWords.scrollbackSentence(for: .timedOut), DoorWords.sentence(for: DoorFailure.timedOut))
    }
}
