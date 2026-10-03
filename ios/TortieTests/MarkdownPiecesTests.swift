import XCTest
@testable import Tortie

// THE PAGE COST (Phase 316.6, his ruling of 2026-10-01, build/p3166/SPEC.md
// "As built, the ruled round"). Every block, list item and table cell of an
// answer is a view of its own, and a page of twenty answers each holding
// hundreds cost the reverify up to 28 s and 4.6 GB on iOS 18.3 where the build
// before this one spent 4.4 s and 38 MB, and ended the test host. So an answer
// whose parse holds more PIECES than `MarkdownCaps.pieces` is drawn EXACTLY as
// that build drew every answer: one text of Foundation's inline markdown,
// every word, no link and no image address. These tests hold each clause:
//
//   a piece is a block, a list item or a table cell, nothing else counted;
//   no parse weighs 0 pieces, so with the cap at 0 every answer, of every
//     kind of piece, an empty one too, is past it and drawn as written;
//   as written is the parent's own rendering, attribute for attribute, so
//     "exactly as today" is compared, not described;
//   as written presses and fetches nothing;
//   the cut still holds, and every fixture and every committed real answer
//     is drawn as written.
//
// MARKDOWN IS OFF (his ruling of 2026-10-02, "Ship tabs + Settings, markdown
// off"): `MarkdownCaps.pieces` is 0. The ruled round held the edge at 26 here
// ("at the cap blocks, one more as written") and every real answer drawn as
// blocks; those rules are restated for 0 below, and the weights stay held
// (testAPieceIsWhatItCostsToDraw) for the later phase that moves the cap.
//
// THE ORACLE, `parent(_:)`, is `AnswerMarkdown.render` of `28d89295`'s
// ios/Tortie/Screens/AnswerText.swift, copied statement for statement.

final class MarkdownPiecesTests: XCTestCase {
    /// The build before this one's renderer, `28d89295`'s
    /// `AnswerMarkdown.render`, verbatim but for its name and its options
    /// written inline.
    static func parent(_ answer: String) -> AttributedString {
        let options = AttributedString.MarkdownParsingOptions(
            allowsExtendedAttributes: false,
            interpretedSyntax: .inlineOnlyPreservingWhitespace,
            failurePolicy: .returnPartiallyParsedIfPossible
        )
        guard var drawn = try? AttributedString(markdown: answer, options: options) else {
            return AttributedString(answer)
        }
        typealias Link = AttributeScopes.FoundationAttributes.LinkAttribute
        typealias Image = AttributeScopes.FoundationAttributes.ImageURLAttribute
        let opened = drawn.runs.compactMap { run in
            run[Link.self] == nil && run[Image.self] == nil ? nil : run.range
        }
        for range in opened {
            drawn[range][Link.self] = nil
            drawn[range][Image.self] = nil
        }
        return drawn
    }

    static func pieces(_ source: String) -> Int {
        RenderedAnswer.pieces(MarkdownBlocks.parse(source).blocks, depth: 0)
    }

    /// `base`, then as many one-word paragraphs as bring it to `target`
    /// pieces exactly.
    static func padded(_ base: String, to target: Int) -> String {
        let have = pieces(base)
        guard target > have else { return base }
        return base + "\n\n" + (0..<(target - have)).map { "pad" + String($0) }.joined(separator: "\n\n")
    }

    /// An answer certainly past the cap, holding every inline kind the parent
    /// drew: emphasis, code, strikethrough, a link, an image, an autolink, a
    /// bare address, an entity, an escape and raw HTML.
    static let pastTheCap: String = {
        let inline = "**bold** *em* `code` ~~gone~~ [apple](https://apple.com/x) ![a chart](https://p3166.example/a.png) <https://p3166.example/b> www.p3166.example &amp; \\*kept\\* <kbd>K</kbd>"
        return inline + "\n\n" + String(repeating: "-\n", count: MarkdownCaps.pieces + 5) + "\n| a | b |\n|---|---|\n| [c](https://apple.com/c) | d |\n"
    }()

    // MARK: - What a piece is

    /// Clause: a piece is one block or one table cell (header cells
    /// included), each a view of its own; a list item or a quote is
    /// `containerPieces` (two, by the measurement) and a block that scrolls
    /// sideways, a code block or a table, `scrollPieces` (eight); nothing else
    /// is counted.
    func testAPieceIsWhatItCostsToDraw() {
        XCTAssertEqual(RenderedAnswer.containerPieces, 2)
        XCTAssertEqual(RenderedAnswer.scrollPieces, 8)
        XCTAssertEqual(Self.pieces("a\n\nb"), 2)
        XCTAssertEqual(Self.pieces("- a\n- b"), 1 + 2 * 2 + 2, "the list, two items, their two paragraphs")
        XCTAssertEqual(Self.pieces("-\n-"), 1 + 2 * 2, "an empty item still costs its mark and its column")
        XCTAssertEqual(Self.pieces("| a | b |\n|---|---|\n| c | d |"), 8 + 4, "the table scrolls, and its four cells")
        XCTAssertEqual(Self.pieces("> q"), 2 + 1)
        XCTAssertEqual(Self.pieces("> - x"), 2 + 1 + 2 + 1, "the quote, the list, the item, the paragraph")
        XCTAssertEqual(Self.pieces("```\nx\n```"), 8, "a code block scrolls")
        XCTAssertEqual(Self.pieces("    indented\n    code"), 8, "so does indented code")
        XCTAssertEqual(Self.pieces("> ```\n> x\n> ```"), 2 + 8)
        XCTAssertEqual(Self.pieces("# h\n\n***\n\n<div>\n\nx"), 4, "a heading, a rule, an HTML block, a paragraph")
        XCTAssertEqual(Self.pieces("**a** and `b` and [c](https://apple.com)"), 1, "inline runs are one paragraph")
    }

    // MARK: - The edge of the cap

    /// Clause (markdown off): the cap is 0, and no parse weighs 0 pieces (an
    /// empty or blank answer is one empty paragraph), so every answer is one
    /// piece or more past the cap and drawn as written, whichever kind of
    /// piece it holds and however few; and the same answers padded to the
    /// ruled round's old edge, 26 and 27 pieces, are drawn as written too.
    /// Their parse is still there, for the later phase that moves the cap.
    func testEveryAnswerIsPastTheCap() {
        XCTAssertEqual(MarkdownCaps.pieces, 0, "markdown is off: every answer is drawn as written")
        let bases = [
            ("empty", ""),
            ("blank", "  \n\t\n"),
            ("a word", "first"),
            ("paragraphs", "first\n\nsecond"),
            ("items", "- a\n- b\n- c"),
            ("empty items", "-\n-\n-\n-"),
            ("cells", "| a | b | c |\n|---|---|---|\n| 1 | 2 | 3 |\n| 4 | 5 | 6 |"),
            ("quotes", "> > deep\n> back"),
            ("code", "```\nx\n```\n\n    indented")
        ]
        for (name, base) in bases {
            for source in [base, Self.padded(base, to: 26), Self.padded(base, to: 27)] {
                XCTAssertGreaterThan(Self.pieces(source), MarkdownCaps.pieces, name + ": every parse weighs at least one piece")
                let rendered = RenderedAnswer(source)
                XCTAssertNotNil(rendered.written, name + ": drawn as written")
                XCTAssertTrue(rendered.blocks.isEmpty, name + ": as written draws no block")
                XCTAssertFalse(MarkdownOutline.asBlocks(source).blocks.isEmpty, name + ": the parse is still there")
            }
        }
    }

    // MARK: - As written is the parent's own rendering

    /// Clause: an answer past the cap is EXACTLY what the build before this
    /// one drew: the same characters and the same attributes, run for run.
    func testAsWrittenIsTheParentsRendering() throws {
        var answers: [(String, String)] = [("past-the-cap", Self.pastTheCap), ("empty answer", ""), ("blank answer", " \n \t\n")]
        answers += try MarkdownHostileTests.fixtures().map { ($0.name, $0.source) }
        answers += MarkdownHostileTests.built().map { ($0.name, $0.source) }
        var compared = 0
        for (name, source) in answers {
            let rendered = RenderedAnswer(source)
            let past = RenderedAnswer.pieces(MarkdownBlocks.parse(source).blocks, depth: 0) > MarkdownCaps.pieces
            XCTAssertEqual(rendered.written != nil, past, name + ": as written exactly when past the cap")
            guard let written = rendered.written else { continue }
            compared += 1
            let kept = MarkdownBlocks.within(source)
            XCTAssertEqual(written, Self.parent(kept.text), name + ": as written is the parent's rendering")
            XCTAssertEqual(String(written.characters), String(Self.parent(kept.text).characters), name)
            XCTAssertEqual(rendered.cut, kept.cut, name + ": the cut")
            XCTAssertTrue(rendered.blocks.isEmpty, name)
        }
        // Markdown off: EVERY one of them, the empty answer included, is
        // drawn as written and is the parent's rendering.
        XCTAssertEqual(compared, answers.count, "every answer is drawn as written")
    }

    /// Clause: as written presses and fetches nothing: no link and no image
    /// address survives in any run, and every word stays.
    func testAsWrittenPressesAndFetchesNothing() throws {
        let written = try XCTUnwrap(RenderedAnswer(Self.pastTheCap).written)
        typealias Link = AttributeScopes.FoundationAttributes.LinkAttribute
        typealias Image = AttributeScopes.FoundationAttributes.ImageURLAttribute
        XCTAssertTrue(written.runs[Link.self].allSatisfy { $0.0 == nil }, "a link survived as written")
        XCTAssertTrue(written.runs[Image.self].allSatisfy { $0.0 == nil }, "an image address survived as written")
        let text = String(written.characters)
        for word in ["bold", "em", "code", "gone", "apple", "a chart", "p3166.example/b", "www.p3166.example", "*kept*", "<kbd>K</kbd>", "| a | b |", "| c | d |"] where !text.contains(word) {
            XCTFail("as written lost " + word)
        }
        XCTAssertFalse(text.contains("https://apple.com/x"), "a link's address is not a word the parent drew")
    }

    /// Clause: the answer cut is still the answer cut. A door that sends more
    /// than `MarkdownCaps.answerBytes` has the rest said, as written too.
    func testAsWrittenKeepsTheCut() throws {
        let source = String(repeating: "- a\n", count: 10_000)
        let rendered = RenderedAnswer(source)
        let written = try XCTUnwrap(rendered.written)
        XCTAssertTrue(rendered.cut)
        XCTAssertEqual(String(written.characters), String(Self.parent(String(source.prefix(MarkdownCaps.answerBytes))).characters))
        XCTAssertEqual(MarkdownOutline.nodes(rendered).last?.text, Copy.restNotShown)
    }

    /// Clause (markdown off): every committed fixture is drawn as written,
    /// the ones the ruled round drew as blocks (`quote-nested`, `redacted`,
    /// `bidi`, `images`, `script`, …) and the ones it already drew as written
    /// (`answer-realistic`, `table-at-caps`, …) alike.
    func testTheFixturesEachSideOfTheCap() throws {
        let all = Dictionary(try MarkdownHostileTests.fixtures().map { ($0.name, $0.source) }, uniquingKeysWith: { first, _ in first })
        for name in ["quote-nested", "redacted", "bidi", "loop-nested-fence", "loop-item-comment", "html-kinds", "indented-code", "setext-and-rules", "list-overflow", "images", "script", "fence-unclosed",
                     "answer-realistic", "honest-wide", "ordered-as-written", "nested-list-task", "table-align", "refused-schemes", "loop-quote-comment", "clipped-in-table", "table-at-caps"] {
            let source = try XCTUnwrap(all[name], name)
            XCTAssertNotNil(RenderedAnswer(source).written, name + " is drawn as written")
        }
        for (name, source) in all {
            XCTAssertNotNil(RenderedAnswer(source).written, name + " is drawn as written")
        }
    }

    // MARK: - Every committed real answer is drawn as written

    /// Every real answer this repository holds, as the reverify's corpus took
    /// them: each string of 40 or more characters in the research 63
    /// transcripts (docs/research/assets/63-fixtures, JSON and JSON lines),
    /// once per file, and every committed terminal screen's rows joined
    /// (build/fixtures/questions), each cut to main's 4,000 characters.
    static func realAnswers() throws -> [(name: String, source: String)] {
        var root = URL(fileURLWithPath: #filePath).deletingLastPathComponent()
        var found: URL?
        for _ in 0..<6 {
            if FileManager.default.fileExists(atPath: root.appendingPathComponent("docs/research/assets/63-fixtures").path) {
                found = root
                break
            }
            root = root.deletingLastPathComponent()
        }
        let base = try XCTUnwrap(found, "no docs/research/assets/63-fixtures above " + #filePath)
        func clip(_ text: String) -> String {
            let units = text as NSString
            return units.length <= 4_000 ? text : units.substring(to: 4_000)
        }
        func strings(_ value: Any, into out: inout [String]) {
            if let text = value as? String {
                if (text as NSString).length >= 40 { out.append(text) }
            } else if let list = value as? [Any] {
                for item in list { strings(item, into: &out) }
            } else if let object = value as? [String: Any] {
                for key in object.keys.sorted() { strings(object[key] as Any, into: &out) }
            }
        }
        var answers: [(name: String, source: String)] = []
        let transcripts = base.appendingPathComponent("docs/research/assets/63-fixtures")
        let files = (FileManager.default.enumerator(at: transcripts, includingPropertiesForKeys: nil)?.allObjects as? [URL] ?? [])
            .filter { $0.pathExtension == "json" || $0.pathExtension == "jsonl" }
            .sorted { $0.path < $1.path }
        for file in files {
            let text = try String(contentsOf: file, encoding: .utf8)
            var values: [String] = []
            let documents = file.pathExtension == "jsonl" ? text.components(separatedBy: "\n") : [text]
            for document in documents {
                guard let data = document.data(using: .utf8), let object = try? JSONSerialization.jsonObject(with: data, options: [.fragmentsAllowed]) else { continue }
                strings(object, into: &values)
            }
            var seen = Set<String>()
            for value in values where seen.insert(value).inserted {
                answers.append((file.lastPathComponent, clip(value)))
            }
        }
        let screens = base.appendingPathComponent("build/fixtures/questions")
        for file in (try FileManager.default.contentsOfDirectory(at: screens, includingPropertiesForKeys: nil)).filter({ $0.pathExtension == "jsonl" }).sorted(by: { $0.path < $1.path }) {
            for line in try String(contentsOf: file, encoding: .utf8).components(separatedBy: "\n") {
                guard let data = line.data(using: .utf8),
                      let row = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                      let rows = row["rows"] as? [String], !rows.isEmpty else { continue }
                answers.append((file.lastPathComponent, clip(rows.joined(separator: "\n"))))
            }
        }
        return answers
    }

    /// Clause (markdown off, his ruling of 2026-10-02): every real answer
    /// committed here is drawn as written, exactly the parent's rendering of
    /// it, the densest included. The ruled round held this the other way
    /// round (every one drawn as blocks, the densest at the old cap of 26);
    /// the weights are still printed, for the later phase that moves the cap.
    func testEveryCommittedRealAnswerIsAsWritten() throws {
        let answers = try Self.realAnswers()
        XCTAssertGreaterThanOrEqual(answers.count, 1_400, "the transcripts and the screens were read")
        var weights: [Int] = []
        for answer in answers {
            weights.append(Self.pieces(answer.source))
            let rendered = RenderedAnswer(answer.source)
            XCTAssertNotNil(rendered.written, answer.name + " is a real answer drawn as blocks")
            XCTAssertEqual(rendered.written, Self.parent(MarkdownBlocks.within(answer.source).text), answer.name + " is not the parent's rendering")
        }
        let densest = weights.sorted(by: >).prefix(20)
        print("P3166-REAL {\"answers\":" + String(answers.count) + ",\"densest20\":" + String(describing: Array(densest)) + "}")
        XCTAssertGreaterThan(weights.min() ?? 0, MarkdownCaps.pieces, "every real answer is past the cap")
    }
}
