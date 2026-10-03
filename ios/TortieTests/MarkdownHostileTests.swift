import XCTest
@testable import Tortie

// Bytes somebody else wrote, through the renderer (Phase 316.6,
// build/p3166/SPEC.md §7.2): every fixture of
// ios/TortieTests/Fixtures/markdown/fixtures.json and every one built below.
// For each: it never traps (a trap ends this test process, which is the
// failure); it parses within the budget, best of three on `ContinuousClock`,
// 150 ms in a Release test host and a 500 ms ceiling in Debug, every measured
// value printed as one `P3166-BUDGET {…}` line; it draws within every one of
// `MarkdownCaps`; and, when nothing was cut or counted, it loses no word:
// every letter-or-digit word of its source, outside a link's or an image's
// destination, a fence's info string, a task box, a list item's number and a
// character reference, appears in its outline at least as often. A table
// row's cells past its header's count are NOT taken out first any more: the
// phone keeps them (D16), so they are held to it too.
//
// MARKDOWN IS OFF (his ruling of 2026-10-02, "Ship tabs + Settings, markdown
// off"): `MarkdownCaps.pieces` is 0, so the app draws EVERY answer as written
// (`RenderedAnswer.written`), and the screen's drawing is held to the parent's
// rendering here and in MarkdownPiecesTests. The PARSE stays in the tree for a
// later phase, so each clause about it below reads the parse drawn as blocks
// whatever the cap says (`MarkdownOutline.asBlocks`), as the ruled round
// already did for the answers past its cap; a clause about what the screen
// draws reads `RenderedAnswer`. The budget is timed on `RenderedAnswer`, which
// is what the app runs for each answer.
//
// THE BUDGET, PER ANSWER. 50 ms was proposed; the verifiers measured answers
// inside every cap at 114.31 ms (iOS 18.3.1) and 106.42 ms (26.3.1) in
// Release, and four paragraphs of code spans at 80.95 ms. The fix round moved
// the parse OFF the main actor (ConversationModel.rendering), so a slow
// answer delays its page and never freezes the screen, and pinned the budget
// at 150 ms, over the measured worst; an honest answer measured 13.71 ms at
// worst.
//
// THE FIFTEEN BUILT IN CODE, by recipe, so the node side
// (build/p316/hostile-door.mjs) builds the same bytes. `*` is repetition and
// `i` counts from 0; every row ends "\n" unless it says otherwise:
//
//   bomb-emphasis      "*a **a " * 20000 + "[" * 20000 + "a" + "]" * 20000
//   nest-quotes        "> " * 10000 + "deep"
//   nest-lists         "- " * 10000 + "deep"
//   table-10000-rows   "| a | b |\n| --- | --- |\n" + "| r<i> | v<i> |\n" for i < 10000
//   table-200-columns  "|" + " h<i> |" for i < 200, "\n", "|" + " --- |" * 200, "\n",
//                      then for j < 3: "|" + " c<j>x<i> |" for i < 200, "\n"
//   fence-5mb          "```\n" + ("x" * 99 + "\n") * 50000 + "```"   (5,000,007 bytes)
//   line-5mb           "a" * 5000000, no newline
//   fence-long-line    "```\n" + "y" * 5000 + "\n```"
//   fence-500-lines    "```\n" + ("line <i>" for i < 500, joined "\n") + "\n```"
//   blocks-1000        "paragraph <i>" for i < 1000, joined "\n\n"
//   cells-1500         for t < 30, joined "\n\n": "| a | b | c | d | e |\n| - | - | - | - | - |\n"
//                      + ("|" + " t<t>r<r>c<c> |" for c < 5) for r < 9, joined "\n"
//   code-spans-32k     for p < 4, joined "\n\n": "`a` " * 2046 + "`a`"   (32,754 bytes)
//   empty-items-2000   "-\n" * 2000
//   empty-items-32k    "-\n" * 16384                                  (32,768 bytes)
//   empty-ordered-in-quote  "> 1.\n" * 800
//
// `{{MD3}}` in a fixture is the probe's loopback listener; here it is
// `127.0.0.1:9`, which nothing listens on and nothing here dials.

final class MarkdownHostileTests: XCTestCase {
    struct Fixture {
        let name: String
        let source: String
    }

    /// The names fixtures.json holds (the spec's §7.2), so a fixture renamed
    /// or left out is a failure rather than a smaller run.
    static let pinnedNames = [
        "answer-realistic", "nested-list-task", "table-align", "table-at-caps", "quote-nested",
        "fence-unclosed", "clipped-in-fence", "clipped-in-table", "lying-link", "long-link",
        "link-over-cap", "user-part", "idn-host", "refused-schemes", "bare-urls", "ten-kb-url",
        "images", "script", "list-overflow", "format-specifiers", "redacted", "bidi",
        "line-endings-cr", "line-endings-crlf", "empty", "whitespace-only", "setext-and-rules",
        "indented-code", "html-kinds", "footnotes-definitions", "inline-mix", "ordered-as-written"
    ]

    static let listener = "127.0.0.1:9"

    #if DEBUG
    static let configuration = "Debug"
    static let budget = Duration.milliseconds(500)
    #else
    static let configuration = "Release"
    static let budget = Duration.milliseconds(150)
    #endif

    // MARK: - The fixtures

    /// fixtures.json beside this file in the checkout, which a Simulator
    /// process can read; the copy in the test bundle when there is one.
    static func fixtureFile() -> URL? {
        let beside = URL(fileURLWithPath: #filePath)
            .deletingLastPathComponent()
            .appendingPathComponent("Fixtures")
            .appendingPathComponent("markdown")
            .appendingPathComponent("fixtures.json")
        if FileManager.default.fileExists(atPath: beside.path) { return beside }
        return Bundle(for: MarkdownHostileTests.self).url(forResource: "fixtures", withExtension: "json")
    }

    static func fixtures() throws -> [Fixture] {
        let file = try XCTUnwrap(fixtureFile(), "ios/TortieTests/Fixtures/markdown/fixtures.json is missing")
        let object = try JSONSerialization.jsonObject(with: Data(contentsOf: file))
        let top = try XCTUnwrap(object as? [String: Any], "fixtures.json is not an object")
        let rows = try XCTUnwrap(top["fixtures"] as? [[String: Any]], "fixtures.json holds no fixtures")
        return try rows.map { row in
            let name = try XCTUnwrap(row["name"] as? String, "a fixture with no name")
            let source = try XCTUnwrap(row["source"] as? String, "fixture " + name + " has no source")
            return Fixture(name: name, source: source.replacingOccurrences(of: "{{MD3}}", with: listener))
        }
    }

    /// The fifteen built in code, by the recipes in this file's header.
    static func built() -> [Fixture] {
        func rows(_ count: Int, _ row: (Int) -> String) -> String { (0..<count).map(row).joined() }
        let wide = "|" + rows(200) { " h" + String($0) + " |" } + "\n|" + String(repeating: " --- |", count: 200) + "\n"
            + rows(3) { j in "|" + rows(200) { " c" + String(j) + "x" + String($0) + " |" } + "\n" }
        let cells = (0..<30).map { t in
            "| a | b | c | d | e |\n| - | - | - | - | - |\n" + (0..<9).map { r in
                "|" + rows(5) { " t" + String(t) + "r" + String(r) + "c" + String($0) + " |" }
            }.joined(separator: "\n")
        }.joined(separator: "\n\n")
        return [
            Fixture(name: "bomb-emphasis", source: String(repeating: "*a **a ", count: 20_000) + String(repeating: "[", count: 20_000) + "a" + String(repeating: "]", count: 20_000)),
            Fixture(name: "nest-quotes", source: String(repeating: "> ", count: 10_000) + "deep"),
            Fixture(name: "nest-lists", source: String(repeating: "- ", count: 10_000) + "deep"),
            Fixture(name: "table-10000-rows", source: "| a | b |\n| --- | --- |\n" + rows(10_000) { "| r" + String($0) + " | v" + String($0) + " |\n" }),
            Fixture(name: "table-200-columns", source: wide),
            Fixture(name: "fence-5mb", source: "```\n" + String(repeating: String(repeating: "x", count: 99) + "\n", count: 50_000) + "```"),
            Fixture(name: "line-5mb", source: String(repeating: "a", count: 5_000_000)),
            Fixture(name: "fence-long-line", source: "```\n" + String(repeating: "y", count: 5_000) + "\n```"),
            Fixture(name: "fence-500-lines", source: "```\n" + (0..<500).map { "line " + String($0) }.joined(separator: "\n") + "\n```"),
            Fixture(name: "blocks-1000", source: (0..<1000).map { "paragraph " + String($0) }.joined(separator: "\n\n")),
            Fixture(name: "cells-1500", source: cells),
            Fixture(name: "code-spans-32k", source: (0..<4).map { _ in String(repeating: "`a` ", count: 2_046) + "`a`" }.joined(separator: "\n\n")),
            Fixture(name: "empty-items-2000", source: String(repeating: "-\n", count: 2_000)),
            Fixture(name: "empty-items-32k", source: String(repeating: "-\n", count: 16_384)),
            Fixture(name: "empty-ordered-in-quote", source: String(repeating: "> 1.\n", count: 800))
        ]
    }

    // MARK: - Every fixture

    /// Clause: fixtures.json holds every pinned fixture.
    func testEveryPinnedFixtureIsThere() throws {
        let names = Set(try Self.fixtures().map(\.name))
        for name in Self.pinnedNames {
            XCTAssertTrue(names.contains(name), "fixtures.json has no " + name)
        }
    }

    /// Clause: the built recipes are the bytes the header says.
    func testTheBuiltRecipes() {
        let built = Dictionary(uniqueKeysWithValues: Self.built().map { ($0.name, $0.source) })
        XCTAssertEqual(built.count, 15)
        XCTAssertEqual(built["code-spans-32k"]?.utf8.count, 32_754)
        XCTAssertEqual(built["empty-items-32k"]?.utf8.count, MarkdownCaps.answerBytes)
        XCTAssertEqual(built["fence-5mb"]?.utf8.count, 5_000_007)
        XCTAssertEqual(built["line-5mb"]?.utf8.count, 5_000_000)
        XCTAssertEqual(built["bomb-emphasis"]?.utf8.count, 180_001)
        XCTAssertEqual(built["nest-quotes"]?.utf8.count, 20_004)
        XCTAssertEqual(built["table-10000-rows"]?.hasSuffix("| r9999 | v9999 |\n"), true)
        XCTAssertEqual(built["cells-1500"]?.components(separatedBy: "| t29r8c4 |").count, 2)
    }

    /// Clause: the recipes fixtures.json writes for build/p316/hostile-door.mjs
    /// build exactly the bytes `built()` builds, so the phone's tests and the
    /// hostile door serve the same fifteen answers.
    func testTheBuiltRecipesAreTheFixtureFilesRecipes() throws {
        let file = try XCTUnwrap(Self.fixtureFile(), "ios/TortieTests/Fixtures/markdown/fixtures.json is missing")
        let top = try XCTUnwrap(try JSONSerialization.jsonObject(with: Data(contentsOf: file)) as? [String: Any])
        let recipes = try XCTUnwrap(top["recipes"] as? [[String: Any]], "fixtures.json holds no recipes")
        let built = Dictionary(uniqueKeysWithValues: Self.built().map { ($0.name, $0.source) })
        XCTAssertEqual(Set(recipes.compactMap { $0["name"] as? String }), Set(built.keys))
        for recipe in recipes {
            let name = try XCTUnwrap(recipe["name"] as? String)
            let parts = try XCTUnwrap(recipe["parts"] as? [[String: Any]], name)
            XCTAssertEqual(try Self.render(parts, [:]), built[name], name)
        }
    }

    /// The recipe format, as fixtures.json's `about` says it: `{text}` as
    /// itself, `{repeat, times}` repeated, `{index}` a loop counter in
    /// decimal, `{each, count, join, parts}` the parts once per counter value.
    static func render(_ parts: [[String: Any]], _ scope: [String: Int]) throws -> String {
        var out = ""
        for part in parts {
            if let text = part["text"] as? String {
                out += text
            } else if let piece = part["repeat"] as? String, let times = part["times"] as? Int {
                out += String(repeating: piece, count: times)
            } else if let name = part["index"] as? String {
                out += String(try XCTUnwrap(scope[name], "an index outside its loop"))
            } else if let name = part["each"] as? String, let count = part["count"] as? Int, let inner = part["parts"] as? [[String: Any]] {
                var rows: [String] = []
                for value in 0..<count {
                    var next = scope
                    next[name] = value
                    rows.append(try render(inner, next))
                }
                out += rows.joined(separator: part["join"] as? String ?? "")
            } else {
                XCTFail("a part that is not text, repeat, index or each")
            }
        }
        return out
    }

    /// Clause: never a trap, within the budget, within every cap, and no word
    /// lost within the caps, for every fixture and every built one. The
    /// budget is what the app runs (`RenderedAnswer`); the caps and the words
    /// are the parse's (`MarkdownOutline.asBlocks`); and what the screen
    /// draws, markdown off, is the parent's rendering of the kept text.
    func testEveryFixtureWithinBudgetAndCaps() throws {
        for fixture in try Self.fixtures() + Self.built() {
            var rendered = RenderedAnswer("")
            var best = Duration.seconds(3_600)
            let clock = ContinuousClock()
            for _ in 0..<3 {
                let took = clock.measure { rendered = RenderedAnswer(fixture.source) }
                best = min(best, took)
            }
            let ms = Double(best.components.seconds) * 1_000 + Double(best.components.attoseconds) / 1e15
            print("P3166-BUDGET {\"fixture\":" + MarkdownOutline.quoted(fixture.name)
                + ",\"configuration\":\"" + Self.configuration + "\",\"bestMs\":" + String(format: "%.3f", ms)
                + ",\"ceilingMs\":" + String(Self.budget.components.seconds * 1_000 + Self.budget.components.attoseconds / 1_000_000_000_000_000) + "}")
            XCTAssertLessThanOrEqual(best, Self.budget, fixture.name + " parsed in " + String(format: "%.3f", ms) + " ms")
            XCTAssertEqual(rendered.cut, fixture.source.utf8.count > MarkdownCaps.answerBytes, fixture.name + ": the cut")
            XCTAssertEqual(rendered.written, MarkdownPiecesTests.parent(MarkdownBlocks.within(fixture.source).text), fixture.name + ": drawn as the parent drew it")
            XCTAssertTrue(rendered.blocks.isEmpty, fixture.name + ": markdown off, no block drawn")
            let parsed = MarkdownOutline.asBlocks(fixture.source)
            let report = Caps.read(parsed)
            XCTAssertEqual(report.problems, [], fixture.name)
            if report.withinCaps {
                XCTAssertEqual(Self.lostWords(fixture.source, parsed), [], fixture.name + " lost words")
            }
        }
    }

    // MARK: - Each cap, one clause each

    /// `answerBytes`: the cut, on a Character, with the rest counted, on the
    /// answer the screen draws (as written, markdown off) and on the parse.
    func testTheAnswerCap() {
        let rendered = RenderedAnswer(String(repeating: "a", count: 40_000))
        XCTAssertTrue(rendered.cut)
        XCTAssertEqual(Self.texts(rendered), ["written:" + String(repeating: "a", count: MarkdownCaps.answerBytes), "rest:" + Copy.restNotShown])
        XCTAssertEqual(Self.texts(MarkdownOutline.asBlocks(String(repeating: "a", count: 40_000))), ["p:" + String(repeating: "a", count: MarkdownCaps.answerBytes), "rest:" + Copy.restNotShown])
        // A character is never split: an emoji across the boundary goes whole.
        let edge = RenderedAnswer(String(repeating: "a", count: MarkdownCaps.answerBytes - 2) + "\u{1F600}")
        XCTAssertTrue(edge.cut)
        XCTAssertEqual(Self.texts(edge), ["written:" + String(repeating: "a", count: MarkdownCaps.answerBytes - 2), "rest:" + Copy.restNotShown])
        XCTAssertFalse(RenderedAnswer(String(repeating: "a", count: MarkdownCaps.answerBytes)).cut)
    }

    /// `blocks`: the parse keeps the rest as one plain block, every word
    /// kept; and an answer that big is drawn as written (`pieces`).
    func testTheBlocksCap() {
        let source = (0..<1000).map { "paragraph " + String($0) }.joined(separator: "\n\n")
        XCTAssertNotNil(RenderedAnswer(source).written)
        let rendered = MarkdownOutline.asBlocks(source)
        let texts = Self.texts(rendered)
        XCTAssertEqual(texts.filter { $0.hasPrefix("p:") }.count, MarkdownCaps.blocks)
        XCTAssertEqual(texts.filter { $0.hasPrefix("plain:") }.count, 1)
        XCTAssertTrue(texts.last?.hasSuffix("paragraph 999") == true)
    }

    /// `depth`: containers stop opening, and the markers are text.
    func testTheDepthCap() {
        let quotes = MarkdownOutline.nodes(MarkdownOutline.asBlocks(String(repeating: "> ", count: 20) + "deep"))
        XCTAssertEqual(quotes.filter { $0.kind == "quote" }.count, MarkdownCaps.depth)
        XCTAssertEqual(quotes.last?.text, String(repeating: "> ", count: 12) + "deep")
        let lists = MarkdownOutline.nodes(MarkdownOutline.asBlocks(String(repeating: "- ", count: 20) + "deep"))
        XCTAssertEqual(lists.filter { $0.kind == "list" }.count, MarkdownCaps.depth)
        XCTAssertEqual(lists.last?.text, String(repeating: "- ", count: 12) + "deep")
    }

    /// `inlineBytes`: a longer run is drawn verbatim, never parsed.
    func testTheInlineCap() {
        let long = String(repeating: "**a** ", count: 1_400)
        XCTAssertGreaterThan(long.utf8.count, MarkdownCaps.inlineBytes)
        XCTAssertEqual(Inline.render(long).plain, long)
        XCTAssertEqual(Inline.render("**a** ").plain, "a ")
    }

    /// `tableRows`: the rows past it are drawn as their characters, one plain
    /// block right under the table, so no word is lost (the fix round; the
    /// first build counted them, `1 more row`, and drew none of their words).
    func testTheRowCap() throws {
        let body: String = (0..<52).map { (row: Int) -> String in
            Self.row(3) { (column: Int) -> String in "c" + String(row) + "x" + String(column) }
        }.joined()
        let source = Self.row(3) { "h" + String($0) } + "|" + String(repeating: " - |", count: 3) + "\n" + body
        let rendered = MarkdownOutline.asBlocks(source)
        let table = try XCTUnwrap(Self.tables(rendered).first)
        XCTAssertEqual(table.rows.count, MarkdownCaps.tableRows)
        XCTAssertTrue(table.rows.allSatisfy { $0.count == 3 })
        XCTAssertEqual(Self.texts(rendered).last, "plain:| c50x0 | c50x1 | c50x2 |\n| c51x0 | c51x1 | c51x2 |")
        XCTAssertEqual(Self.lostWords(source, rendered), [])
        XCTAssertEqual(Self.lostWords(source, RenderedAnswer(source)), [], "and drawn as written, every word")
    }

    /// `tableColumns`: a table this wide is drawn as a table, every column of
    /// it; one wider is drawn as its characters, one plain block, so no word
    /// is lost (the first build drew 8 columns and counted the rest).
    func testTheColumnCap() throws {
        func table(_ columns: Int) -> String {
            Self.row(columns) { "h" + String($0) } + "|" + String(repeating: " - |", count: columns) + "\n"
                + Self.row(columns) { "v" + String($0) }
        }
        let wide = MarkdownOutline.asBlocks(table(MarkdownCaps.tableColumns))
        let drawn = try XCTUnwrap(Self.tables(wide).first)
        XCTAssertEqual(drawn.header.count, MarkdownCaps.tableColumns)
        XCTAssertEqual(drawn.rows.first?.count, MarkdownCaps.tableColumns)
        let wider = MarkdownOutline.asBlocks(table(MarkdownCaps.tableColumns + 1))
        XCTAssertEqual(Self.tables(wider).count, 0)
        XCTAssertEqual(Self.texts(wider), ["plain:" + table(MarkdownCaps.tableColumns + 1).dropLast()])
        XCTAssertEqual(Self.lostWords(table(MarkdownCaps.tableColumns + 1), wider), [])
        // Ten columns, the honest table the first build cut at eight.
        XCTAssertEqual(Self.tables(MarkdownOutline.asBlocks(table(10))).first?.header.count, 10)
    }

    /// One table row of `count` cells, `| a | b |` and its newline.
    static func row(_ count: Int, _ cell: (Int) -> String) -> String {
        "|" + (0..<count).map { (column: Int) -> String in " " + cell(column) + " |" }.joined() + "\n"
    }

    /// `cellCharacters`: past main's clip, so an honest cell is whole; a
    /// longer one is cut there, ending in the Mac's mark.
    func testTheCellCap() throws {
        let honest = String(repeating: "w", count: 3_999)
        XCTAssertEqual(try XCTUnwrap(Self.tables(MarkdownOutline.asBlocks("| a |\n| - |\n| " + honest + " |\n")).first).rows.first?.first?.plain, honest)
        let long = String(repeating: "w", count: MarkdownCaps.cellCharacters + 100)
        let table = try XCTUnwrap(Self.tables(MarkdownOutline.asBlocks("| a |\n| - |\n| " + long + " |\n")).first)
        XCTAssertEqual(table.rows.first?.first?.plain, String(repeating: "w", count: MarkdownCaps.cellCharacters) + Copy.pending)
    }

    /// `cells`: per answer, header cells included. The rows of the table the
    /// budget runs out in are drawn as their characters under it, and a table
    /// whose header cannot fit is its source: every word drawn.
    func testTheCellsCap() {
        let one: String = "| a | b | c | d | e |\n| - | - | - | - | - |\n" + String(repeating: "| 1 | 2 | 3 | 4 | 5 |\n", count: 9)
        let source = Array(repeating: one, count: 21).joined(separator: "\n\n") + "\n\n| x |\n| - |\n| y |"
        XCTAssertNotNil(RenderedAnswer(source).written)
        XCTAssertEqual(Self.lostWords(source, RenderedAnswer(source)), [])
        let rendered = MarkdownOutline.asBlocks(source)
        let tables = Self.tables(rendered)
        XCTAssertEqual(tables.count, 20)
        XCTAssertEqual(tables.map { ($0.rows.count + 1) * $0.header.count }.reduce(0, +), MarkdownCaps.cells)
        XCTAssertEqual(Self.texts(rendered).filter { $0.hasPrefix("plain:") }.count, 2)
        XCTAssertEqual(Self.lostWords(source, rendered), [])
        // Partly: 19 whole tables leave 50 cells, so the 20th of ten rows of
        // seven columns keeps its header and six rows, and draws the other
        // three as their characters right under it.
        let seven: String = "| a | b | c | d | e | f | g |\n| - | - | - | - | - | - | - |\n" + (0..<9).map { "| r" + String($0) + " | 2 | 3 | 4 | 5 | 6 | 7 |\n" }.joined()
        let partly = MarkdownOutline.asBlocks(Array(repeating: one, count: 19).joined(separator: "\n\n") + "\n\n" + seven)
        XCTAssertEqual(Self.tables(partly).last?.rows.count, 6)
        XCTAssertEqual(Self.texts(partly).last, "plain:| r6 | 2 | 3 | 4 | 5 | 6 | 7 |\n| r7 | 2 | 3 | 4 | 5 | 6 | 7 |\n| r8 | 2 | 3 | 4 | 5 | 6 | 7 |")
    }

    /// `fenceLines` and `lineCharacters`: past main's clip, so an honest code
    /// block is whole; a longer one has the lines past the cap counted, and a
    /// longer line is cut and marked.
    func testTheCodeCaps() throws {
        let honestLine = String(repeating: "j", count: 3_999)
        guard case .code(let whole, true, 0) = try XCTUnwrap(MarkdownOutline.asBlocks("```\n" + honestLine + "\n```").blocks.first).kind else { return XCTFail("not code") }
        XCTAssertEqual(whole, [honestLine])
        // The tallest code block main's 4,000 characters can hold is whole too.
        let tall = "```\n" + String(repeating: "\n", count: 3_990) + "x\n```"
        guard case .code(let rows, true, 0) = try XCTUnwrap(MarkdownOutline.asBlocks(tall).blocks.first).kind else { return XCTFail("not code") }
        XCTAssertEqual(rows.count, 3_991)
        let many = MarkdownOutline.asBlocks("```\n" + (0..<(MarkdownCaps.fenceLines + 50)).map { "l" + String($0) }.joined(separator: "\n") + "\n```")
        guard case .code(let lines, true, let more) = try XCTUnwrap(many.blocks.first).kind else { return XCTFail("not code") }
        XCTAssertEqual(lines.count, MarkdownCaps.fenceLines)
        XCTAssertEqual(more, 50)
        XCTAssertEqual(RenderedBlock.codeNote(more), "50 more lines")
        let wide = MarkdownOutline.asBlocks("    " + String(repeating: "z", count: MarkdownCaps.lineCharacters + 200))
        guard case .code(let cut, false, 0) = try XCTUnwrap(wide.blocks.first).kind else { return XCTFail("not code") }
        XCTAssertEqual(cut, [String(repeating: "z", count: MarkdownCaps.lineCharacters) + Copy.pending])
    }

    /// `listNumberDigits`: nine digits are an item, ten a paragraph.
    func testTheListNumberCap() {
        XCTAssertEqual(Self.texts(MarkdownOutline.asBlocks("999999999. ok")), ["list:999999999", "item", "p:ok"])
        XCTAssertEqual(Self.texts(MarkdownOutline.asBlocks("9999999999. not ok")), ["p:9999999999. not ok"])
    }

    // MARK: - The fix round (2026-10-01), one clause each

    /// Clause: every turn of the block loop takes at least one line. A lazy
    /// line of four or more columns with no paragraph open is words; the first
    /// build read it as indented code, which refuses a lazy line, and added an
    /// empty code block per turn until the budget ran out: the attack
    /// verifier's 18 bytes were 402 blocks, 399 of them empty, and drew
    /// everything after them as one raw block.
    func testEveryTurnOfTheLoopTakesALine() {
        let shapes = [
            "> <!--\n> -->\n    x",
            "> > <!--\n> > -->\n    x",
            "> > ~~~\n> > ===\n     word after\n\n**bold after** and `code after`",
            "- <!-- note\n  end -->\n      indented after\n\nThe **rest** of the answer.",
            "- <!--\n  -->\n\n    after",
            "> <pre>\n> x</pre>\n    y\n\n## heading after\n\n| t | u |\n| - | - |\n| 1 | 2 |",
            "> <!--\n> c -->\n     lazy words\n\n# After heading\n\n| head a | head b |\n| --- | --- |\n| one | two |\n\n- item one\n- item two",
            "Here is the change:\n\n> <!-- generated -->\n> Do not edit by hand.\n    see src/gen.ts\n\n## Next steps\n\n1. Run the tests\n2. Ship it"
        ]
        for shape in shapes {
            let rendered = MarkdownOutline.asBlocks(shape)
            let nodes = MarkdownOutline.nodes(rendered)
            XCTAssertLessThanOrEqual(nodes.count, 20, shape)
            XCTAssertFalse(nodes.contains { $0.kind == "code" && $0.text.isEmpty }, "an empty code block: " + shape)
            XCTAssertFalse(nodes.contains { $0.kind == "plain" }, "a raw block: " + shape)
            XCTAssertEqual(Self.lostWords(shape, rendered), [], shape)
        }
        // The one that reaches the lazy line itself: the inner quote's comment
        // is open-and-shut, the outer quote's collector cannot see that, and the
        // line it took lazily is drawn as words in the outer quote.
        XCTAssertEqual(Self.texts(MarkdownOutline.asBlocks("> > <!--\n> > -->\n    x")), ["quote", "quote", "html:<!--\n-->", "p:x"])
        // And an HTML block the collector CAN see ends the quote, as CommonMark
        // says, so the line is the indented code mdast reads.
        XCTAssertEqual(Self.texts(MarkdownOutline.asBlocks("> <!--\n> -->\n    x")), ["quote", "html:<!--\n-->", "code:x"])
    }

    /// Clause: a list item counts against `MarkdownCaps.blocks` like a block,
    /// so empty items stop at the budget and the rest is drawn as its
    /// characters. The first build drew 16,384 items for 32 KiB, and a page of
    /// twenty such answers ended the test host on iOS 18.3.
    func testAnEmptyItemCountsAgainstTheBudget() {
        for (source, name) in [
            (String(repeating: "-\n", count: 2_000), "dash"),
            (String(repeating: "-\n", count: 16_384), "dash 32k"),
            (String(repeating: "1.\n", count: 2_000), "ordered"),
            (String(repeating: "> -\n", count: 1_000), "in a quote"),
            ("- - - - - - - \n" + String(repeating: "-\n", count: 2_000), "nested")
        ] {
            XCTAssertNotNil(RenderedAnswer(source).written, name + ": drawn as written")
            let nodes = MarkdownOutline.nodes(MarkdownOutline.asBlocks(source))
            XCTAssertLessThanOrEqual(nodes.filter { $0.kind == "item" }.count, MarkdownCaps.blocks, name)
            XCTAssertEqual(nodes.filter { $0.kind == "plain" }.count, 1, name + ": the rest, as its characters")
        }
    }

    /// Clause: the list loop stops when the budget is full; the items after it
    /// are the plain block, never more items each holding a plain block.
    func testTheListStopsAtTheBudget() {
        let source = String(repeating: "- a\n", count: 500)
        XCTAssertNotNil(RenderedAnswer(source).written)
        let texts = Self.texts(MarkdownOutline.asBlocks(source))
        // Each item is a block and so is its paragraph: 200 items fill 400.
        XCTAssertEqual(texts.filter { $0 == "item" }.count, 200)
        XCTAssertEqual(texts.last, "plain:" + Array(repeating: "- a", count: 300).joined(separator: "\n"))
    }

    /// Clause (difference D17, his ruling of 2026-10-01): an ordered item is
    /// drawn with the number the agent WROTE, never a counted one. CommonMark
    /// and the Mac count on from a list's first number, which drew `8. CONTEXT`
    /// as `7.` and the exit code in `exits code` / `0. Nobody waits` as `4.`,
    /// digits the build before this one drew (the reverify's corpus, 2 real
    /// windows of docs/BACKLOG.md). The list's own `start` is still
    /// CommonMark's, which decides only whether it may interrupt a paragraph.
    func testOrderedItemsDrawTheNumberTheAgentWrote() throws {
        XCTAssertEqual(Self.numbers(MarkdownOutline.asBlocks("1. a\n2. b\n4. d")), ["1", "2", "4"])
        XCTAssertEqual(Self.numbers(MarkdownOutline.asBlocks("3. a\n3. b\n3. c")), ["3", "3", "3"])
        XCTAssertEqual(Self.numbers(MarkdownOutline.asBlocks("6. six\n8. CONTEXT")), ["6", "8"])
        XCTAssertEqual(Self.numbers(MarkdownOutline.asBlocks("3. all ten exits code\n0. Nobody waits longer.\n5. next")), ["3", "0", "5"])
        XCTAssertEqual(Self.numbers(MarkdownOutline.asBlocks("007. bond\n1) one\n3) three")), ["007", "1", "3"])
        XCTAssertEqual(Self.numbers(MarkdownOutline.asBlocks("- a\n+ b")), [])
        XCTAssertEqual(Self.texts(MarkdownOutline.asBlocks("6. six\n8. eight")).first, "list:6")
        // Markdown off: the screen draws the answer as written, so the digits
        // it shows are the agent's own characters, `8.` and `0.` included.
        for source in ["6. six\n8. CONTEXT", "3. all ten exits code\n0. Nobody waits longer.\n5. next", "007. bond\n1) one\n3) three"] {
            XCTAssertEqual(String(try XCTUnwrap(RenderedAnswer(source).written).characters), source)
        }
        // The committed fixture, and the marks the screen draws from it.
        let fixture = try XCTUnwrap(try Self.fixtures().first { $0.name == "ordered-as-written" }, "fixtures.json has no ordered-as-written")
        // Past `MarkdownCaps.pieces` (0 since markdown went off), so on the
        // screen it is drawn as written, its digits as typed; parsed, every
        // item keeps them.
        XCTAssertNotNil(RenderedAnswer(fixture.source).written)
        let numbers = Self.numbers(MarkdownOutline.asBlocks(fixture.source))
        XCTAssertEqual(numbers, ["1", "2", "4", "7", "8", "3", "0", "5", "007", "1", "3"])
        XCTAssertEqual(numbers.map(Copy.orderedMark), ["1.", "2.", "4.", "7.", "8.", "3.", "0.", "5.", "007.", "1.", "3."])
    }

    /// Clause: an unordered item's mark is the bullet the agent wrote, so an
    /// unfenced diff still says which line went and which came (the first
    /// build drew `•` for both, which the build before it never did).
    func testAnUnfencedDiffKeepsItsMarks() throws {
        let diff = "- res.cookie(\"sid\", id);\n+ res.cookie(\"sid\", id, { httpOnly: true });"
        XCTAssertEqual(Self.bullets(MarkdownOutline.asBlocks(diff)), ["-", "+"])
        XCTAssertEqual(Self.bullets(MarkdownOutline.asBlocks("* a\n* b\n\n- c")), ["*", "*", "-"])
        // Markdown off: drawn as written, so both marks are its characters.
        XCTAssertEqual(String(try XCTUnwrap(RenderedAnswer(diff).written).characters), diff)
    }

    /// Clause: a task box is `[ ]`, `[x]` or `[X]` and then a space or a tab,
    /// and nothing else is one: `[y]` and `[x]` with no blank after it are the
    /// item's words.
    func testATaskBoxIsExactlyItsShapes() {
        XCTAssertEqual(Self.texts(MarkdownOutline.asBlocks("- [ ] a\n- [x] b\n- [X] c")), ["list", "item", "p:a", "item", "p:b", "item", "p:c"])
        var tasks: [TaskMark?] = []
        Self.visit(MarkdownOutline.asBlocks("- [ ] a\n- [x] b\n- [X] c\n- [y] d\n- [x]e").blocks) { block in
            if case .list(false, _, let items) = block.kind { tasks = items.map(\.task) }
        }
        XCTAssertEqual(tasks, [.open, .done, .done, nil, nil])
        XCTAssertEqual(Self.texts(MarkdownOutline.asBlocks("- [y] d")), ["list", "item", "p:[y] d"])
        XCTAssertEqual(Self.texts(MarkdownOutline.asBlocks("- [x]e")), ["list", "item", "p:[x]e"])
    }

    /// Clause: NUL is U+FFFD before anything is parsed (CommonMark §2.3).
    func testNULIsTheReplacementCharacter() {
        XCTAssertEqual(MarkdownBlocks.parse("a\u{0}b").blocks, [.paragraph("a\u{FFFD}b")])
        XCTAssertEqual(MarkdownBlocks.parse("```\nx\u{0}\n```").blocks, [.code(lines: ["x\u{FFFD}"], fenced: true, moreLines: 0)])
    }

    /// Clause: a table row's cells past its header's count stay in its last
    /// cell (D16), pipes and all, so a `|` in a code span loses no word.
    func testExtraCellsStayInTheLastCell() throws {
        let table = try XCTUnwrap(Self.tables(MarkdownOutline.asBlocks("| meaning | pattern |\n| --- | --- |\n| either | `a||b` |\n| x | y | z | w |")).first)
        XCTAssertEqual(table.rows.map { $0.map(\.plain) }, [["either", "a||b"], ["x", "y | z | w"]])
    }

    // MARK: - The named fixtures

    func testNamedFixtures() throws {
        let all = Dictionary(try Self.fixtures().map { ($0.name, $0.source) }, uniquingKeysWith: { first, _ in first })
        if let source = all["table-at-caps"] {
            // 462 pieces: drawn as written, every word, and parsed within the
            // row and column caps.
            XCTAssertNotNil(RenderedAnswer(source).written)
            XCTAssertEqual(Self.lostWords(source, RenderedAnswer(source)), [])
            let rendered = MarkdownOutline.asBlocks(source)
            let table = try XCTUnwrap(Self.tables(rendered).first)
            XCTAssertEqual(table.rows.count, 50)
            XCTAssertTrue(table.rows.allSatisfy { $0.count == 9 })
            XCTAssertEqual(Self.texts(rendered).last, "plain:|r51c1|r51c2|r51c3|r51c4|r51c5|r51c6|r51c7|r51c8|r51c9|")
            XCTAssertEqual(Self.lostWords(source, rendered), [])
        }
        if let source = all["table-align"] {
            // The row with more cells than its header keeps them in its last
            // (D16), so `five` is drawn, which GFM drops and the parent drew.
            let table = try XCTUnwrap(Self.tables(MarkdownOutline.asBlocks(source)).first)
            XCTAssertEqual(table.rows.last?.map(\.plain), ["one", "two", "three", "four | five"])
            XCTAssertEqual(Self.lostWords(source, RenderedAnswer(source)), [], "and drawn as written, every word")
        }
        if let source = all["honest-wide"] {
            // Every edge the first build cut, in an answer main sends whole.
            // Past `MarkdownCaps.pieces`, so drawn as written; parsed, every
            // edge is whole.
            XCTAssertEqual(Self.lostWords(source, RenderedAnswer(source)), [], "honest-wide as written lost words")
            let rendered = MarkdownOutline.asBlocks(source)
            XCTAssertLessThanOrEqual(source.utf16.count, 4_000)
            XCTAssertEqual(Self.lostWords(source, rendered), [], "honest-wide lost words")
            let tables = Self.tables(rendered)
            XCTAssertEqual(tables.map(\.header.count), [2, 10, 2])
            XCTAssertGreaterThan(tables.first?.rows.first?.last?.plain.count ?? 0, 300)
            XCTAssertEqual(tables.last?.rows.first?.last?.plain, "a||b")
            XCTAssertTrue(tables.last?.rows.last?.first?.plain.contains("\u{2028}") == true)
            XCTAssertEqual(Self.bullets(rendered), ["-", "+"])
            XCTAssertFalse(MarkdownOutline.nodes(rendered).contains { $0.kind == "note" || $0.kind == "plain" })
        }
        for name in ["loop-quote-comment", "loop-nested-fence", "loop-item-comment"] {
            guard let source = all[name] else { continue }
            XCTAssertEqual(Self.lostWords(source, RenderedAnswer(source)), [], name + " as drawn")
            let rendered = MarkdownOutline.asBlocks(source)
            let nodes = MarkdownOutline.nodes(rendered)
            XCTAssertLessThanOrEqual(nodes.count, 20, name + " made " + String(nodes.count) + " nodes")
            XCTAssertFalse(nodes.contains { $0.kind == "code" && $0.text.isEmpty }, name + " drew an empty code block")
            XCTAssertFalse(nodes.contains { $0.kind == "plain" }, name + " drew a raw block")
            XCTAssertEqual(Self.lostWords(source, rendered), [], name)
        }
        // Markdown off: no link is pressable on the screen, as 316.2 drew
        // them; parsed, the policy still decides what the later phase would
        // offer to the gate.
        if let source = all["lying-link"] {
            XCTAssertEqual(Self.links(RenderedAnswer(source)), [], "drawn as written, no link can be pressed")
            XCTAssertEqual(Self.links(MarkdownOutline.asBlocks(source)), ["https://evil.example/x"])
        }
        if let source = all["long-link"] {
            XCTAssertEqual(Self.links(RenderedAnswer(source)), [], "drawn as written, no link can be pressed")
            let links = Self.links(MarkdownOutline.asBlocks(source))
            XCTAssertEqual(links.count, 1)
            XCTAssertEqual(links.first?.utf8.count, 2_048)
        }
        if let source = all["link-over-cap"] {
            XCTAssertEqual(Self.links(RenderedAnswer(source)), [])
            XCTAssertEqual(Self.links(MarkdownOutline.asBlocks(source)), [])
        }
        for name in ["user-part", "idn-host", "refused-schemes", "bare-urls", "ten-kb-url"] {
            guard let source = all[name] else { continue }
            XCTAssertEqual(Self.links(RenderedAnswer(source)), [], name)
            XCTAssertEqual(Self.links(MarkdownOutline.asBlocks(source)), [], name + ", parsed")
        }
        for (name, source) in all {
            // No address at the probe's listener is ever a link or an image,
            // drawn (no link at all, markdown off) or parsed.
            let rendered = RenderedAnswer(source)
            XCTAssertEqual(Self.links(rendered), [], name)
            XCTAssertFalse(Self.imageAddresses(rendered), name)
            let parsed = MarkdownOutline.asBlocks(source)
            XCTAssertFalse(Self.links(parsed).contains { $0.contains("127.0.0.1") }, name)
            XCTAssertFalse(Self.imageAddresses(parsed), name)
        }
        if let source = all["list-overflow"] {
            let texts = Self.texts(MarkdownOutline.asBlocks(source))
            XCTAssertTrue(texts.contains { $0.hasPrefix("p:9999999999.") }, "ten digits are a paragraph")
            XCTAssertTrue(texts.contains("list:999999999"), "nine digits are an item")
        }
        if let source = all["format-specifiers"] {
            let plain = MarkdownOutline.nodes(RenderedAnswer(source)).map(\.text).joined(separator: "\n")
            XCTAssertTrue(plain.contains("%@ %n"), "a format specifier draws as written")
            XCTAssertFalse(Self.extendedAttributes(RenderedAnswer(source)))
        }
        // D4 (the spec's §3 row 2): Foundation takes the `^[…](…)` syntax and
        // keeps its words, applying no attribute.
        XCTAssertEqual(Inline.render("^[x](inflect: true) %@ %n").plain, "x %@ %n")
        XCTAssertFalse(Self.extendedAttributes(RenderedAnswer("^[x](inflect: true) and ^[cats](morphology: { number: \"plural\" })")))
        for name in ["empty", "whitespace-only"] {
            guard let source = all[name] else { continue }
            XCTAssertEqual(Self.texts(MarkdownOutline.asBlocks(source)), ["p:"], name)
            XCTAssertEqual(RenderedAnswer(source).written, MarkdownPiecesTests.parent(source), name + ": drawn as the parent drew it")
        }
        if let source = all["script"] {
            XCTAssertTrue(Self.texts(MarkdownOutline.asBlocks(source)).contains { $0.hasPrefix("html:<script") })
            XCTAssertTrue(String(try XCTUnwrap(RenderedAnswer(source).written).characters).contains("<script"), "drawn as written, a tag is its characters")
        }
        if let source = all["bidi"] {
            let drawn = MarkdownOutline.nodes(RenderedAnswer(source)).map(\.text).joined()
            for scalar in ["\u{202E}", "\u{2066}", "\u{2067}", "\u{2068}", "\u{2069}", "\u{200D}"] where source.contains(scalar) {
                XCTAssertTrue(drawn.contains(scalar), "a bidi character is drawn as itself")
            }
        }
        if let cr = all["line-endings-cr"], let crlf = all["line-endings-crlf"] {
            XCTAssertEqual(Self.texts(MarkdownOutline.asBlocks(cr)), Self.texts(MarkdownOutline.asBlocks(crlf)))
        }
    }

    // MARK: - Readers

    /// Every node as `kind:text`, a list as `list:<start>`.
    static func texts(_ rendered: RenderedAnswer) -> [String] {
        MarkdownOutline.nodes(rendered).map { node in
            switch node.kind {
            case "paragraph": "p:" + node.text
            case "list": node.ordered == true ? "list:" + String(node.start ?? -1) : "list"
            case "item", "quote", "table", "row", "rule": node.kind
            default: node.kind + ":" + node.text
            }
        }
    }

    /// Every ordered item's written number, in order.
    static func numbers(_ rendered: RenderedAnswer) -> [String] {
        var out: [String] = []
        visit(rendered.blocks) { block in
            guard case .list(true, _, let items) = block.kind else { return }
            out += items.compactMap(\.number)
        }
        return out
    }

    /// Every bullet item's drawn mark, in order.
    static func bullets(_ rendered: RenderedAnswer) -> [String] {
        var out: [String] = []
        visit(rendered.blocks) { block in
            guard case .list(false, _, let items) = block.kind else { return }
            out += items.map(\.bullet)
        }
        return out
    }

    static func tables(_ rendered: RenderedAnswer) -> [RenderedTable] {
        var out: [RenderedTable] = []
        visit(rendered.blocks) { if case .table(let table) = $0.kind { out.append(table) } }
        return out
    }

    static func visit(_ blocks: [RenderedBlock], _ body: (RenderedBlock) -> Void) {
        for block in blocks {
            body(block)
            switch block.kind {
            case .quote(let inner): visit(inner, body)
            case .list(_, _, let items): for item in items { visit(item.blocks, body) }
            default: break
            }
        }
    }

    static func inlines(_ rendered: RenderedAnswer) -> [InlineText] {
        var out: [InlineText] = []
        visit(rendered.blocks) { block in
            switch block.kind {
            case .heading(_, let text), .paragraph(let text): out.append(text)
            case .table(let table): out += table.header + table.rows.flatMap { $0 }
            default: break
            }
        }
        return out
    }

    /// Every attributed run the answer draws: its blocks' inline text, and
    /// the whole answer when it is drawn as written (markdown off).
    static func drawnRuns(_ rendered: RenderedAnswer) -> [AttributedString] {
        let blocks = inlines(rendered).flatMap { text in
            text.segments.compactMap { segment -> AttributedString? in
                guard case .text(let words) = segment else { return nil }
                return words
            }
        }
        return blocks + (rendered.written.map { [$0] } ?? [])
    }

    static func links(_ rendered: RenderedAnswer) -> [String] {
        drawnRuns(rendered).flatMap { words in
            words.runs[AttributeScopes.FoundationAttributes.LinkAttribute.self].compactMap { $0.0?.absoluteString }
        }
    }

    static func imageAddresses(_ rendered: RenderedAnswer) -> Bool {
        drawnRuns(rendered).contains { words in
            words.runs[AttributeScopes.FoundationAttributes.ImageURLAttribute.self].contains { $0.0 != nil }
        }
    }

    static func extendedAttributes(_ rendered: RenderedAnswer) -> Bool {
        drawnRuns(rendered).contains { words in
            words.runs[AttributeScopes.FoundationAttributes.MorphologyAttribute.self].contains { $0.0 != nil }
                || words.runs[AttributeScopes.FoundationAttributes.InflectionRuleAttribute.self].contains { $0.0 != nil }
        }
    }

    /// What every cap promises, read back from what was drawn.
    struct Caps {
        var problems: [String] = []
        var withinCaps = true

        static func read(_ rendered: RenderedAnswer) -> Caps {
            var caps = Caps()
            if rendered.cut { caps.withinCaps = false }
            var blocks = 0
            var cells = 0
            func walk(_ list: [RenderedBlock], depth: Int) {
                if depth > MarkdownCaps.depth { caps.problems.append("nested deeper than the cap") }
                for block in list {
                    blocks += 1
                    switch block.kind {
                    case .quote(let inner):
                        walk(inner, depth: depth + 1)
                    case .list(_, let start, let items):
                        if String(start).count > MarkdownCaps.listNumberDigits { caps.problems.append("a list number past the cap") }
                        // An item is drawn like a block, and counted as one.
                        blocks += items.count
                        for item in items { walk(item.blocks, depth: depth + 1) }
                    case .code(let lines, _, let more):
                        if lines.count > MarkdownCaps.fenceLines { caps.problems.append("code past the line cap") }
                        if lines.contains(where: { $0.count > MarkdownCaps.lineCharacters + 1 }) { caps.problems.append("a code line past its cap") }
                        if more > 0 || lines.contains(where: { $0.count > MarkdownCaps.lineCharacters }) { caps.withinCaps = false }
                    case .table(let table):
                        if table.rows.count > MarkdownCaps.tableRows { caps.problems.append("rows past the cap") }
                        if table.header.count > MarkdownCaps.tableColumns { caps.problems.append("columns past the cap") }
                        if table.rows.contains(where: { $0.count != table.header.count }) { caps.problems.append("a row of another width") }
                        cells += table.header.count * (table.rows.count + 1)
                        let all = table.header + table.rows.flatMap { $0 }
                        if all.contains(where: { $0.plain.count > MarkdownCaps.cellCharacters + 1 }) { caps.problems.append("a cell past its cap") }
                        if all.contains(where: { $0.plain.count > MarkdownCaps.cellCharacters }) { caps.withinCaps = false }
                    default:
                        break
                    }
                }
            }
            walk(rendered.blocks, depth: 0)
            if blocks > MarkdownCaps.blocks + 2 * (MarkdownCaps.depth + 1) { caps.problems.append("blocks past the cap") }
            if cells > MarkdownCaps.cells { caps.problems.append("cells past the cap") }
            return caps
        }
    }

    // MARK: - No word lost

    /// The words of `source` the outline of `rendered` lacks, `word ×missing`.
    static func lostWords(_ source: String, _ rendered: RenderedAnswer) -> [String] {
        let drawn = words(MarkdownOutline.nodes(rendered).map(\.text).joined(separator: "\n"))
        let wanted = words(withoutUndrawn(source))
        return wanted.compactMap { word, count in
            let have = drawn[word] ?? 0
            return have < count ? word + " x" + String(count - have) : nil
        }.sorted()
    }

    static func words(_ text: String) -> [String: Int] {
        var out: [String: Int] = [:]
        var current = ""
        for character in text {
            if character.isLetter || character.isNumber {
                current.append(character)
            } else if !current.isEmpty {
                out[current, default: 0] += 1
                current = ""
            }
        }
        if !current.isEmpty { out[current, default: 0] += 1 }
        return out
    }

    /// The source without what is never drawn as words: a link's or an
    /// image's destination and title, a fence's info string, a task box's x,
    /// a list item's number and a character reference. A table row's cells
    /// past its header's count stay: the phone draws them (D16).
    static func withoutUndrawn(_ source: String) -> String {
        var text = withoutDestinations(source)
        text = replacing(#"&#?[A-Za-z0-9]+;"#, in: text, with: " ")
        text = replacing(#"\[[xX ]\]"#, in: text, with: " ")
        let lines = text.components(separatedBy: CharacterSet(charactersIn: "\r\n")).map { line -> String in
            let rest = replacing(#"^(?:[ \t]*>)*[ \t]*(?:(?:[-+*]|[0-9]{1,9}[.)])(?:[ \t]+|$)(?:[ \t]*>)*[ \t]*)*"#, in: line, with: "")
            return replacing(#"^[ \t]*(`{3,}|~{3,}).*$"#, in: rest, with: "$1")
        }
        return lines.joined(separator: "\n")
    }

    /// Every `](…)`, its parentheses balanced, made a space.
    static func withoutDestinations(_ source: String) -> String {
        let characters = Array(source)
        var out: [Character] = []
        var p = 0
        while p < characters.count {
            if characters[p] == "]", p + 1 < characters.count, characters[p + 1] == "(" {
                out.append("]")
                var depth = 0
                var q = p + 1
                while q < characters.count {
                    if characters[q] == "\\" { q += 2; continue }
                    if characters[q] == "(" { depth += 1 }
                    if characters[q] == ")" { depth -= 1; if depth == 0 { break } }
                    q += 1
                }
                out.append(" ")
                p = q + 1
                continue
            }
            out.append(characters[p])
            p += 1
        }
        return String(out)
    }

    static func replacing(_ pattern: String, in text: String, with template: String) -> String {
        guard let expression = try? NSRegularExpression(pattern: pattern, options: [.anchorsMatchLines]) else { return text }
        return expression.stringByReplacingMatches(in: text, range: NSRange(text.startIndex..., in: text), withTemplate: template)
    }
}
