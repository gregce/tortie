import XCTest
@testable import Tortie

/// The block parser against the specs' own examples (Phase 316.6,
/// build/p3166/SPEC.md §7.2). Each row is one example of CommonMark 0.31.2 or
/// GFM 0.29, cited by the number the spec gives it, with its markdown copied
/// byte for byte from the spec and its outline WRITTEN BY HAND from the HTML the
/// spec says it renders as: a `<p>` is a paragraph whose text is what the
/// phone draws (emphasis without its marks, a code span without its backticks,
/// a hard break a line break, raw inline HTML its characters, as the phone
/// draws it), `<pre><code>` is code without its trailing newline, and so on.
///
/// THE OUTLINE, one string per node in pre-order, `<depth> <kind>` and, for a
/// leaf, `: <text>`:
///
///   p, h1...h6, code (indented), fence, html, plain, note, rest   a leaf
///   ul, ol <start>, li, li [ ], li [x], quote, hr, table, tr      a container or a mark
///   td, td left, td center, td right                              a cell
///
/// Every construct of §5.5.2 is here: tabs, thematic breaks, ATX and setext
/// headings, indented and fenced code, the seven kinds of HTML block,
/// paragraphs, block quotes with laziness, list items and lists, GFM tables
/// and task boxes. Each section fails when its clause is taken out of
/// Markdown/Blocks.swift (proved once per clause in a scratch copy).
final class MarkdownSpecTests: XCTestCase {
    /// A node as the rows above write it.
    static func compact(_ node: MarkdownOutline.Node) -> String {
        var head = String(node.depth) + " "
        switch node.kind {
        case "paragraph": head += "p"
        case "heading": head += "h" + String(node.level ?? 0)
        case "code": head += node.fenced == true ? "fence" : "code"
        case "list": head += node.ordered == true ? "ol " + String(node.start ?? -1) : "ul"
        case "item": head += "li" + (node.task.map { $0 == "done" ? " [x]" : " [ ]" } ?? "")
        case "rule": return head + "hr"
        case "row": return head + "tr"
        case "cell": head += "td" + (node.align == "none" ? "" : " " + (node.align ?? ""))
        default: head += node.kind
        }
        switch node.kind {
        case "list", "item", "quote", "table": return head
        default: return head + ":" + (node.text.isEmpty ? "" : " " + node.text)
        }
    }

    static func outline(_ markdown: String) -> [String] {
        // What the PARSE makes of each example, whatever MarkdownCaps.pieces
        // would draw: the spec's examples are clauses about the parser.
        MarkdownOutline.nodes(MarkdownOutline.asBlocks(markdown)).map(compact)
    }

    private func example(_ number: Int, _ markdown: String, _ expected: [String], file: StaticString = #filePath, line: UInt = #line) {
        XCTAssertEqual(Self.outline(markdown), expected, "CommonMark 0.31.2 example " + String(number), file: file, line: line)
    }

    private func gfm(_ number: Int, _ markdown: String, _ expected: [String], file: StaticString = #filePath, line: UInt = #line) {
        XCTAssertEqual(Self.outline(markdown), expected, "GFM 0.29 example " + String(number), file: file, line: line)
    }

    /// CommonMark 0.31.2, "Tabs".
    func testTabs() {
        example(1, "\tfoo\tbaz\t\tbim\n", ["0 code: foo\tbaz\t\tbim"])
        example(2, "  \tfoo\tbaz\t\tbim\n", ["0 code: foo\tbaz\t\tbim"])
        example(4, "  - foo\n\n\tbar\n", ["0 ul", "1 li", "2 p: foo", "2 p: bar"])
        example(5, "- foo\n\n\t\tbar\n", ["0 ul", "1 li", "2 p: foo", "2 code:   bar"])
        example(6, ">\t\tfoo\n", ["0 quote", "1 code:   foo"])
        example(7, "-\t\tfoo\n", ["0 ul", "1 li", "2 code:   foo"])
        example(8, "    foo\n\tbar\n", ["0 code: foo\nbar"])
        example(9, " - foo\n   - bar\n\t - baz\n", ["0 ul", "1 li", "2 p: foo", "2 ul", "3 li", "4 p: bar", "4 ul", "5 li", "6 p: baz"])
        example(10, "#\tFoo\n", ["0 h1: Foo"])
        example(11, "*\t*\t*\t\n", ["0 hr"])
    }

    /// CommonMark 0.31.2, "Thematic breaks".
    func testThematicBreaks() {
        example(43, "***\n---\n___\n", ["0 hr", "0 hr", "0 hr"])
        example(44, "+++\n", ["0 p: +++"])
        example(47, " ***\n  ***\n   ***\n", ["0 hr", "0 hr", "0 hr"])
        example(48, "    ***\n", ["0 code: ***"])
        example(49, "Foo\n    ***\n", ["0 p: Foo\n***"])
        example(57, "- foo\n***\n- bar\n", ["0 ul", "1 li", "2 p: foo", "0 hr", "0 ul", "1 li", "2 p: bar"])
        example(59, "Foo\n---\nbar\n", ["0 h2: Foo", "0 p: bar"])
        example(60, "* Foo\n* * *\n* Bar\n", ["0 ul", "1 li", "2 p: Foo", "0 hr", "0 ul", "1 li", "2 p: Bar"])
        example(61, "- Foo\n- * * *\n", ["0 ul", "1 li", "2 p: Foo", "1 li", "2 hr"])
    }

    /// CommonMark 0.31.2, "ATX headings".
    func testATXHeadings() {
        example(62, "# foo\n## foo\n### foo\n#### foo\n##### foo\n###### foo\n", ["0 h1: foo", "0 h2: foo", "0 h3: foo", "0 h4: foo", "0 h5: foo", "0 h6: foo"])
        example(63, "####### foo\n", ["0 p: ####### foo"])
        example(64, "#5 bolt\n\n#hashtag\n", ["0 p: #5 bolt", "0 p: #hashtag"])
        example(66, "# foo *bar* \\*baz\\*\n", ["0 h1: foo bar *baz*"])
        example(69, "    # foo\n", ["0 code: # foo"])
        example(70, "foo\n    # bar\n", ["0 p: foo\n# bar"])
        example(71, "## foo ##\n  ###   bar    ###\n", ["0 h2: foo", "0 h3: bar"])
        example(75, "# foo#\n", ["0 h1: foo#"])
        example(76, "### foo \\###\n## foo #\\##\n# foo \\#\n", ["0 h3: foo ###", "0 h2: foo ###", "0 h1: foo #"])
        example(79, "## \n#\n### ###\n", ["0 h2:", "0 h1:", "0 h3:"])
    }

    /// CommonMark 0.31.2, "Setext headings".
    func testSetextHeadings() {
        example(80, "Foo *bar*\n=========\n\nFoo *bar*\n---------\n", ["0 h1: Foo bar", "0 h2: Foo bar"])
        example(81, "Foo *bar\nbaz*\n====\n", ["0 h1: Foo bar\nbaz"])
        example(83, "Foo\n-------------------------\n\nFoo\n=\n", ["0 h2: Foo", "0 h1: Foo"])
        example(85, "    Foo\n    ---\n\n    Foo\n---\n", ["0 code: Foo\n---\n\nFoo", "0 hr"])
        example(87, "Foo\n    ---\n", ["0 p: Foo\n---"])
        example(88, "Foo\n= =\n\nFoo\n--- -\n", ["0 p: Foo\n= =", "0 p: Foo", "0 hr"])
        example(92, "> Foo\n---\n", ["0 quote", "1 p: Foo", "0 hr"])
        example(93, "> foo\nbar\n===\n", ["0 quote", "1 p: foo\nbar\n==="])
        example(94, "- Foo\n---\n", ["0 ul", "1 li", "2 p: Foo", "0 hr"])
        example(95, "Foo\nBar\n---\n", ["0 h2: Foo\nBar"])
        example(97, "\n====\n", ["0 p: ===="])
        example(103, "Foo\n\nbar\n---\nbaz\n", ["0 p: Foo", "0 h2: bar", "0 p: baz"])
    }

    /// CommonMark 0.31.2, "Indented code blocks".
    func testIndentedCodeBlocks() {
        example(107, "    a simple\n      indented code block\n", ["0 code: a simple\n  indented code block"])
        example(110, "    <a/>\n    *hi*\n\n    - one\n", ["0 code: <a/>\n*hi*\n\n- one"])
        example(111, "    chunk1\n\n    chunk2\n  \n \n \n    chunk3\n", ["0 code: chunk1\n\nchunk2\n\n\n\nchunk3"])
        example(113, "Foo\n    bar\n\n", ["0 p: Foo\nbar"])
        example(115, "# Heading\n    foo\nHeading\n------\n    foo\n----\n", ["0 h1: Heading", "0 code: foo", "0 h2: Heading", "0 code: foo", "0 hr"])
        example(117, "\n    \n    foo\n    \n\n", ["0 code: foo"])
    }

    /// CommonMark 0.31.2, "Fenced code blocks".
    func testFencedCodeBlocks() {
        example(119, "```\n<\n >\n```\n", ["0 fence: <\n >"])
        example(122, "```\naaa\n~~~\n```\n", ["0 fence: aaa\n~~~"])
        example(126, "```\n", ["0 fence:"])
        example(127, "`````\n\n```\naaa\n", ["0 fence: \n```\naaa"])
        example(128, "> ```\n> aaa\n\nbbb\n", ["0 quote", "1 fence: aaa", "0 p: bbb"])
        example(131, " ```\n aaa\naaa\n```\n", ["0 fence: aaa\naaa"])
        example(133, "   ```\n   aaa\n    aaa\n  aaa\n   ```\n", ["0 fence: aaa\n aaa\naaa"])
        example(137, "```\naaa\n    ```\n", ["0 fence: aaa\n    ```"])
        example(138, "``` ```\naaa\n", ["0 p:  \naaa"])
        example(142, "```ruby\ndef foo(x)\n  return 3\nend\n```\n", ["0 fence: def foo(x)\n  return 3\nend"])
        example(147, "```\n``` aaa\n```\n", ["0 fence: ``` aaa"])
    }

    /// CommonMark 0.31.2, "HTML blocks".
    func testHTMLBlocks() {
        example(148, "<table><tr><td>\n<pre>\n**Hello**,\n\n_world_.\n</pre>\n</td></tr></table>\n", ["0 html: <table><tr><td>\n<pre>\n**Hello**,", "0 p: world.\n</pre>", "0 html: </td></tr></table>"])
        example(152, "<DIV CLASS=\"foo\">\n\n*Markdown*\n\n</DIV>\n", ["0 html: <DIV CLASS=\"foo\">", "0 p: Markdown", "0 html: </DIV>"])
        example(155, "<div>\n*foo*\n\n*bar*\n", ["0 html: <div>\n*foo*", "0 p: bar"])
        example(162, "<a href=\"foo\">\n*bar*\n</a>\n", ["0 html: <a href=\"foo\">\n*bar*\n</a>"])
        example(168, "<del>*foo*</del>\n", ["0 p: <del>foo</del>"])
        example(170, "<script type=\"text/javascript\">\n// JavaScript example\n\ndocument.getElementById(\"demo\").innerHTML = \"Hello JavaScript!\";\n</script>\nokay\n", ["0 html: <script type=\"text/javascript\">\n// JavaScript example\n\ndocument.getElementById(\"demo\").innerHTML = \"Hello JavaScript!\";\n</script>", "0 p: okay"])
        example(177, "<!-- foo -->*bar*\n*baz*\n", ["0 html: <!-- foo -->*bar*", "0 p: baz"])
        example(180, "<?php\n\n  echo '>';\n\n?>\nokay\n", ["0 html: <?php\n\n  echo '>';\n\n?>", "0 p: okay"])
        example(185, "Foo\n<div>\nbar\n</div>\n", ["0 p: Foo", "0 html: <div>\nbar\n</div>"])
        example(187, "Foo\n<a href=\"bar\">\nbaz\n", ["0 p: Foo\n<a href=\"bar\">\nbaz"])
    }

    /// CommonMark 0.31.2, "Paragraphs".
    func testParagraphs() {
        example(219, "aaa\n\nbbb\n", ["0 p: aaa", "0 p: bbb"])
        example(222, "  aaa\n bbb\n", ["0 p: aaa\nbbb"])
        example(225, "    aaa\nbbb\n", ["0 code: aaa", "0 p: bbb"])
        example(226, "aaa     \nbbb     \n", ["0 p: aaa\nbbb"])
    }

    /// CommonMark 0.31.2, "Block quotes".
    func testBlockQuotes() {
        example(228, "> # Foo\n> bar\n> baz\n", ["0 quote", "1 h1: Foo", "1 p: bar\nbaz"])
        example(232, "> # Foo\n> bar\nbaz\n", ["0 quote", "1 h1: Foo", "1 p: bar\nbaz"])
        example(234, "> foo\n---\n", ["0 quote", "1 p: foo", "0 hr"])
        example(235, "> - foo\n- bar\n", ["0 quote", "1 ul", "2 li", "3 p: foo", "0 ul", "1 li", "2 p: bar"])
        example(237, "> ```\nfoo\n```\n", ["0 quote", "1 fence:", "0 p: foo", "0 fence:"])
        example(238, "> foo\n    - bar\n", ["0 quote", "1 p: foo\n- bar"])
        example(239, ">\n", ["0 quote"])
        example(242, "> foo\n\n> bar\n", ["0 quote", "1 p: foo", "0 quote", "1 p: bar"])
        example(250, "> > > foo\nbar\n", ["0 quote", "1 quote", "2 quote", "3 p: foo\nbar"])
        example(252, ">     code\n\n>    not code\n", ["0 quote", "1 code: code", "0 quote", "1 p: not code"])
    }

    /// CommonMark 0.31.2, "List items".
    func testListItems() {
        example(253, "A paragraph\nwith two lines.\n\n    indented code\n\n> A block quote.\n", ["0 p: A paragraph\nwith two lines.", "0 code: indented code", "0 quote", "1 p: A block quote."])
        example(255, "- one\n\n two\n", ["0 ul", "1 li", "2 p: one", "0 p: two"])
        example(256, "- one\n\n  two\n", ["0 ul", "1 li", "2 p: one", "2 p: two"])
        example(261, "-one\n\n2.two\n", ["0 p: -one", "0 p: 2.two"])
        example(264, "- Foo\n\n      bar\n\n\n      baz\n", ["0 ul", "1 li", "2 p: Foo", "2 code: bar\n\n\nbaz"])
        example(265, "123456789. ok\n", ["0 ol 123456789", "1 li", "2 p: ok"])
        example(266, "1234567890. not ok\n", ["0 p: 1234567890. not ok"])
        example(267, "0. ok\n", ["0 ol 0", "1 li", "2 p: ok"])
        example(268, "003. ok\n", ["0 ol 3", "1 li", "2 p: ok"])
        example(278, "-\n  foo\n-\n  ```\n  bar\n  ```\n-\n      baz\n", ["0 ul", "1 li", "2 p: foo", "1 li", "2 fence: bar", "1 li", "2 code: baz"])
        example(280, "-\n\n  foo\n", ["0 ul", "1 li", "0 p: foo"])
        example(283, "1. foo\n2.\n3. bar\n", ["0 ol 1", "1 li", "2 p: foo", "1 li", "1 li", "2 p: bar"])
        example(285, "foo\n*\n\nfoo\n1.\n", ["0 p: foo\n*", "0 p: foo\n1."])
        example(290, "  1.  A paragraph\nwith two lines.\n\n          indented code\n\n      > A block quote.\n", ["0 ol 1", "1 li", "2 p: A paragraph\nwith two lines.", "2 code: indented code", "2 quote", "3 p: A block quote."])
        example(292, "> 1. > Blockquote\ncontinued here.\n", ["0 quote", "1 ol 1", "2 li", "3 quote", "4 p: Blockquote\ncontinued here."])
        example(294, "- foo\n  - bar\n    - baz\n      - boo\n", ["0 ul", "1 li", "2 p: foo", "2 ul", "3 li", "4 p: bar", "4 ul", "5 li", "6 p: baz", "6 ul", "7 li", "8 p: boo"])
        example(295, "- foo\n - bar\n  - baz\n   - boo\n", ["0 ul", "1 li", "2 p: foo", "1 li", "2 p: bar", "1 li", "2 p: baz", "1 li", "2 p: boo"])
        example(298, "- - foo\n", ["0 ul", "1 li", "2 ul", "3 li", "4 p: foo"])
        example(299, "1. - 2. foo\n", ["0 ol 1", "1 li", "2 ul", "3 li", "4 ol 2", "5 li", "6 p: foo"])
        example(300, "- # Foo\n- Bar\n  ---\n  baz\n", ["0 ul", "1 li", "2 h1: Foo", "1 li", "2 h2: Bar", "2 p: baz"])
    }

    /// CommonMark 0.31.2, "Lists".
    func testLists() {
        example(301, "- foo\n- bar\n+ baz\n", ["0 ul", "1 li", "2 p: foo", "1 li", "2 p: bar", "0 ul", "1 li", "2 p: baz"])
        example(302, "1. foo\n2. bar\n3) baz\n", ["0 ol 1", "1 li", "2 p: foo", "1 li", "2 p: bar", "0 ol 3", "1 li", "2 p: baz"])
        example(304, "The number of windows in my house is\n14.  The number of doors is 6.\n", ["0 p: The number of windows in my house is\n14.  The number of doors is 6."])
        example(305, "The number of windows in my house is\n1.  The number of doors is 6.\n", ["0 p: The number of windows in my house is", "0 ol 1", "1 li", "2 p: The number of doors is 6."])
        example(310, "- a\n - b\n  - c\n   - d\n  - e\n - f\n- g\n", ["0 ul", "1 li", "2 p: a", "1 li", "2 p: b", "1 li", "2 p: c", "1 li", "2 p: d", "1 li", "2 p: e", "1 li", "2 p: f", "1 li", "2 p: g"])
        example(312, "- a\n - b\n  - c\n   - d\n    - e\n", ["0 ul", "1 li", "2 p: a", "1 li", "2 p: b", "1 li", "2 p: c", "1 li", "2 p: d\n- e"])
        example(313, "1. a\n\n  2. b\n\n    3. c\n", ["0 ol 1", "1 li", "2 p: a", "1 li", "2 p: b", "0 code: 3. c"])
    }

    /// GFM 0.29, "Tables (extension)".
    func testGFMTables() {
        gfm(198, "| foo | bar |\n| --- | --- |\n| baz | bim |\n", ["0 table", "1 tr", "2 td: foo", "2 td: bar", "1 tr", "2 td: baz", "2 td: bim"])
        gfm(199, "| abc | defghi |\n:-: | -----------:\nbar | baz\n", ["0 table", "1 tr", "2 td center: abc", "2 td right: defghi", "1 tr", "2 td center: bar", "2 td right: baz"])
        gfm(200, "| f\\|oo  |\n| ------ |\n| b `\\|` az |\n| b **\\|** im |\n", ["0 table", "1 tr", "2 td: f|oo", "1 tr", "2 td: b | az", "1 tr", "2 td: b | im"])
        gfm(201, "| abc | def |\n| --- | --- |\n| bar | baz |\n> bar\n", ["0 table", "1 tr", "2 td: abc", "2 td: def", "1 tr", "2 td: bar", "2 td: baz", "0 quote", "1 p: bar"])
        gfm(202, "| abc | def |\n| --- | --- |\n| bar | baz |\nbar\n\nbar\n", ["0 table", "1 tr", "2 td: abc", "2 td: def", "1 tr", "2 td: bar", "2 td: baz", "1 tr", "2 td: bar", "2 td:", "0 p: bar"])
        gfm(203, "| abc | def |\n| --- |\n| bar |\n", ["0 p: | abc | def |\n| --- |\n| bar |"])
        // GFM drops `boo`, the cell past the header's count; the phone keeps
        // it in the row's last cell, so no word is lost (difference D16).
        gfm(204, "| abc | def |\n| --- | --- |\n| bar |\n| bar | baz | boo |\n", ["0 table", "1 tr", "2 td: abc", "2 td: def", "1 tr", "2 td: bar", "2 td:", "1 tr", "2 td: bar", "2 td: baz | boo"])
        gfm(205, "| abc | def |\n| --- | --- |\n", ["0 table", "1 tr", "2 td: abc", "2 td: def"])
    }

    /// GFM 0.29, "Task list items (extension)".
    func testGFMTaskListItems() {
        gfm(279, "- [ ] foo\n- [x] bar\n", ["0 ul", "1 li [ ]", "2 p: foo", "1 li [x]", "2 p: bar"])
        gfm(280, "- [x] foo\n  - [ ] bar\n  - [x] baz\n- [ ] bim\n", ["0 ul", "1 li [x]", "2 p: foo", "2 ul", "3 li [ ]", "4 p: bar", "3 li [x]", "4 p: baz", "1 li [ ]", "2 p: bim"])
    }
    /// §5.5.2 item 6: every input yields blocks, an empty or all-whitespace
    /// answer one empty paragraph.
    func testEveryInputYieldsBlocks() {
        XCTAssertEqual(Self.outline(""), ["0 p:"])
        XCTAssertEqual(Self.outline("  \n\t\n \r\n"), ["0 p:"])
    }

    /// §5.5.2 item 2: lines end at \r\n, \r or \n alike.
    func testLineEndings() {
        let expected = ["0 h1: a", "0 p: b\nc", "0 ul", "1 li", "2 p: d"]
        XCTAssertEqual(Self.outline("# a\nb\nc\n\n- d\n"), expected)
        XCTAssertEqual(Self.outline("# a\r\nb\r\nc\r\n\r\n- d\r\n"), expected)
        XCTAssertEqual(Self.outline("# a\rb\rc\r\r- d\r"), expected)
    }

    /// §5.5.2 item 5: a footnote, a link reference definition and a reference
    /// link are their characters (D2, D3), and Foundation is kept from eating
    /// a definition at the start of a run (Inline.swift `definitionKept`).
    func testDefinitionsAndFootnotesAreTheirCharacters() {
        XCTAssertEqual(Self.outline("[foo][bar]\n\n[bar]: /url \"title\"\n"), ["0 p: [foo][bar]", "0 p: [bar]: /url \"title\""])
        XCTAssertEqual(Self.outline("Text[^1].\n\n[^1]: The note.\n"), ["0 p: Text[^1].", "0 p: [^1]: The note."])
    }
}
