import XCTest
@testable import Tortie

/// The outline walker (MarkdownOutline.swift) and the file Method 2 reads
/// (build/p3166/SPEC.md §7.5): `<P3166_OUTLINE_DIR>/outline-<Debug|Release>.jsonl`,
/// over the JSON array `[{name, source}]` at `P3166_OUTLINE_INPUT`, or over
/// fixtures.json when that is unset. `build/p316/test-ios.mjs` passes both as
/// test environment and refuses a directory inside the repository or the home.
/// With no directory, the outlines are made and checked and nothing is written.
final class MarkdownOutlineTests: XCTestCase {
    /// Clause: pre-order, every node's parent and depth, and each field only
    /// on the kind that has it.
    func testTheWalkersShape() {
        let source = "# T\n\n> q\n\n1. [x] a\n\n   ```sh\n   c\n   ```\n\n| h | i |\n|:-:|--:|\n| j | k |\n\n---\n\n<div>\n"
        let lines = MarkdownOutline.lines(fixture: "shape", MarkdownOutline.asBlocks(source))
        func row(_ n: Int, _ parent: Int, _ kind: String, _ depth: Int, level: String = "null", ordered: String = "null", start: String = "null",
                 task: String = "null", align: String = "null", fenced: String = "null", _ text: String = "") -> String {
            "{\"fixture\":\"shape\",\"n\":" + String(n) + ",\"parent\":" + String(parent) + ",\"kind\":\"" + kind + "\",\"depth\":" + String(depth)
                + ",\"level\":" + level + ",\"ordered\":" + ordered + ",\"start\":" + start + ",\"task\":" + task + ",\"align\":" + align
                + ",\"fenced\":" + fenced + ",\"text\":\"" + text + "\"}"
        }
        XCTAssertEqual(lines, [
            row(0, -1, "heading", 0, level: "1", "T"),
            row(1, -1, "quote", 0),
            row(2, 1, "paragraph", 1, "q"),
            row(3, -1, "list", 0, ordered: "true", start: "1"),
            row(4, 3, "item", 1, task: "\"done\""),
            row(5, 4, "paragraph", 2, "a"),
            row(6, 4, "code", 2, fenced: "true", "c"),
            row(7, -1, "table", 0),
            row(8, 7, "row", 1),
            row(9, 8, "cell", 2, align: "\"center\"", "h"),
            row(10, 8, "cell", 2, align: "\"right\"", "i"),
            row(11, 7, "row", 1),
            row(12, 11, "cell", 2, align: "\"center\"", "j"),
            row(13, 11, "cell", 2, align: "\"right\"", "k"),
            row(14, -1, "rule", 0),
            row(15, -1, "html", 0, "<div>")
        ])
    }

    /// Clause: an answer past `MarkdownCaps.pieces` is ONE node, `written`,
    /// holding every character it draws (difference D18). Since markdown went
    /// off (his ruling of 2026-10-02) the cap is 0 and every answer is one,
    /// a list of three items included.
    func testAnAnswerAsWrittenIsOneNode() throws {
        let source = String(repeating: "- item\n", count: 3)
        let rendered = RenderedAnswer(source)
        let written = try XCTUnwrap(rendered.written)
        let nodes = MarkdownOutline.nodes(rendered)
        XCTAssertEqual(nodes.map(\.kind), ["written"])
        XCTAssertEqual(nodes.first?.text, String(written.characters))
        XCTAssertEqual(nodes.first?.text, source)
    }

    /// Clause: a bullet list has no start; a counted note and the cut are
    /// nodes of their own, the note under the block it counts (the parse,
    /// drawn as blocks whatever the cap says).
    func testNotesAndTheCut() {
        let code = "```\n" + (0...MarkdownCaps.fenceLines).map { String($0) }.joined(separator: "\n") + "\n```\n\n- b\n\n" + String(repeating: "z", count: 40_000)
        let nodes = MarkdownOutline.nodes(MarkdownOutline.asBlocks(code))
        XCTAssertEqual(nodes.map(\.kind), ["code", "note", "list", "item", "paragraph", "paragraph", "rest"])
        guard nodes.count == 7 else { return }
        XCTAssertEqual(nodes[1].parent, 0)
        XCTAssertEqual(nodes[1].depth, 1)
        XCTAssertEqual(nodes[1].text, "1 more line")
        XCTAssertNil(nodes[2].start)
        XCTAssertEqual(nodes[2].ordered, false)
        XCTAssertEqual(nodes[6].parent, -1)
        XCTAssertEqual(nodes[6].text, Copy.restNotShown)
    }

    /// Clause: an image's text is its words, or `Image` when it has none (the
    /// parse, drawn as blocks whatever the cap says).
    func testAnImageIsItsWords() {
        let nodes = MarkdownOutline.nodes(MarkdownOutline.asBlocks("![a cat](https://127.0.0.1:9/c.png) and ![](https://127.0.0.1:9/d.png)"))
        XCTAssertEqual(nodes.map(\.text), ["a cat and " + Copy.image])
    }

    /// Clause: the JSON is printable ASCII; `"` and `\` are escaped and every
    /// other character is a `\u` escape, a pair past U+FFFF.
    func testTheJSONIsASCII() {
        XCTAssertEqual(MarkdownOutline.quoted("a\"b\\c"), "\"a\\\"b\\\\c\"")
        XCTAssertEqual(MarkdownOutline.quoted("\u{202E}x\u{200B}\n\t"), "\"\\u202ex\\u200b\\u000a\\u0009\"")
        XCTAssertEqual(MarkdownOutline.quoted("\u{1F600}"), "\"\\ud83d\\ude00\"")
        for line in MarkdownOutline.lines(fixture: "bidi\u{202E}", RenderedAnswer("> \u{2066}x\u{2069} **y**\n")) {
            XCTAssertTrue(line.unicodeScalars.allSatisfy { $0.value >= 0x20 && $0.value <= 0x7e }, line)
            XCTAssertNotNil(try? JSONSerialization.jsonObject(with: Data(line.utf8)), line)
        }
    }

    /// Clause: the file. Every input is outlined; with `P3166_OUTLINE_DIR`
    /// set, the lines are written to `outline-<configuration>.jsonl` there.
    func testTheOutlineFile() throws {
        let environment = ProcessInfo.processInfo.environment
        let inputs: [(name: String, source: String)]
        if let path = environment["P3166_OUTLINE_INPUT"], !path.isEmpty {
            let object = try JSONSerialization.jsonObject(with: Data(contentsOf: URL(fileURLWithPath: path)))
            let rows = try XCTUnwrap(object as? [[String: Any]], "P3166_OUTLINE_INPUT is not an array of {name, source}")
            inputs = try rows.map { row in
                (try XCTUnwrap(row["name"] as? String), try XCTUnwrap(row["source"] as? String))
            }
        } else {
            inputs = try MarkdownHostileTests.fixtures().map { ($0.name, $0.source) }
        }
        XCTAssertFalse(inputs.isEmpty)
        var lines: [String] = []
        for input in inputs {
            let outline = MarkdownOutline.lines(fixture: input.name, RenderedAnswer(input.source))
            XCTAssertFalse(outline.isEmpty, input.name)
            lines += outline
        }
        guard let directory = environment["P3166_OUTLINE_DIR"], !directory.isEmpty else { return }
        let file = URL(fileURLWithPath: directory).appendingPathComponent("outline-" + MarkdownHostileTests.configuration + ".jsonl")
        try (lines.joined(separator: "\n") + "\n").write(to: file, atomically: true, encoding: .utf8)
        print("P3166-OUTLINE " + MarkdownOutline.quoted(file.path) + " " + String(lines.count))
    }
}
