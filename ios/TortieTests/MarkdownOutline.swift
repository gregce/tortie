import Foundation
@testable import Tortie

// The outline Method 2 compares (build/p3166/SPEC.md §7.5): what the phone's
// renderer made of an answer, one JSON object per node, in pre-order (a
// container before its children, a list's items in order, a table's rows and
// then each row's cells). TEST SUPPORT ONLY: nothing in the app writes it.
//
//   {"fixture":<name>,"n":<int>,"parent":<int|-1>,
//    "kind":"heading|paragraph|code|list|item|quote|rule|table|row|cell|html|plain|note|rest|written",
//    "depth":<int>,"level":<1-6|null>,"ordered":<bool|null>,"start":<int|null>,
//    "task":"open|done"|null,"align":"none|left|center|right"|null,
//    "fenced":<bool|null>,"text":<string>}
//
// `n` is the node's place in THIS outline, counted from 0 over every node,
// rows, cells and notes included, and `parent` is its parent's `n` (-1 at the
// top), so the file is a tree on its own. It is NOT the screen's ordinal: the
// screen's `md-<scope>-<n>` counts blocks and list items only (a table once,
// its cells not at all), so the two agree on ORDER, not on number. `depth`
// counts outline levels from 0 at the top: a list's items are one below it,
// an item's blocks one below that, a table's rows one below it and their cells
// one below those, and a note one below the block it counts.
//
// `text`: a heading's, a paragraph's or a cell's drawn characters, an image
// as its words or `Image` (`InlineText.plain`); a code block's lines joined
// with "\n"; the characters of html and plain; a note's words; "" for a
// container and a rule; an answer past `MarkdownCaps.pieces` is one
// `written` node, every character it draws. `start` is an ordered list's first number and null
// for a bullet list; `level` only on a heading, `ordered` only on a list,
// `task` only on an item, `align` only on a cell, `fenced` only on code.
//
// The JSON is written by hand, so the keys stay in this order, and every
// character outside printable ASCII is a `\u` escape, so a bidi or zero-width
// character in an answer never reaches the file raw.

enum MarkdownOutline {
    struct Node: Equatable {
        let n: Int
        let parent: Int
        let kind: String
        let depth: Int
        var level: Int?
        var ordered: Bool?
        var start: Int?
        var task: String?
        var align: String?
        var fenced: Bool?
        var text: String = ""

        init(n: Int, parent: Int, kind: String, depth: Int) {
            self.n = n
            self.parent = parent
            self.kind = kind
            self.depth = depth
        }
    }

    /// The answer drawn as BLOCKS whatever `MarkdownCaps.pieces` says: what
    /// the parse makes of it. The parser's own caps (`blocks`, `cells`, the
    /// rows and the columns) are clauses about the parse, and an answer past
    /// `pieces` is drawn as written instead, which its own tests hold.
    static func asBlocks(_ source: String) -> RenderedAnswer {
        let document = MarkdownBlocks.parse(source)
        return RenderedAnswer(blocks: RenderedAnswer.blocks(of: document), cut: document.cut, written: nil)
    }

    /// Every node of a rendered answer, in pre-order. An answer drawn as
    /// written is ONE node, `written`, holding every character it draws.
    static func nodes(_ answer: RenderedAnswer) -> [Node] {
        var out: [Node] = []
        if let written = answer.written {
            var node = Node(n: 0, parent: -1, kind: "written", depth: 0)
            node.text = String(written.characters)
            out.append(node)
        }
        walk(answer.blocks, parent: -1, depth: 0, into: &out)
        if answer.cut {
            var rest = Node(n: out.count, parent: -1, kind: "rest", depth: 0)
            rest.text = Copy.restNotShown
            out.append(rest)
        }
        return out
    }

    private static func walk(_ blocks: [RenderedBlock], parent: Int, depth: Int, into out: inout [Node]) {
        for block in blocks {
            let n = out.count
            switch block.kind {
            case .heading(let level, let text):
                var node = Node(n: n, parent: parent, kind: "heading", depth: depth)
                node.level = level
                node.text = text.plain
                out.append(node)
            case .paragraph(let text):
                var node = Node(n: n, parent: parent, kind: "paragraph", depth: depth)
                node.text = text.plain
                out.append(node)
            case .code(let lines, let fenced, let moreLines):
                var node = Node(n: n, parent: parent, kind: "code", depth: depth)
                node.fenced = fenced
                node.text = lines.joined(separator: "\n")
                out.append(node)
                if let note = RenderedBlock.codeNote(moreLines) {
                    var child = Node(n: out.count, parent: n, kind: "note", depth: depth + 1)
                    child.text = note
                    out.append(child)
                }
            case .list(let ordered, let start, let items):
                var node = Node(n: n, parent: parent, kind: "list", depth: depth)
                node.ordered = ordered
                node.start = ordered ? start : nil
                out.append(node)
                for item in items {
                    var child = Node(n: out.count, parent: n, kind: "item", depth: depth + 1)
                    child.task = item.task.map { $0 == .done ? "done" : "open" }
                    out.append(child)
                    walk(item.blocks, parent: child.n, depth: depth + 2, into: &out)
                }
            case .quote(let inner):
                out.append(Node(n: n, parent: parent, kind: "quote", depth: depth))
                walk(inner, parent: n, depth: depth + 1, into: &out)
            case .rule:
                out.append(Node(n: n, parent: parent, kind: "rule", depth: depth))
            case .table(let table):
                out.append(Node(n: n, parent: parent, kind: "table", depth: depth))
                for cells in [table.header] + table.rows {
                    let row = Node(n: out.count, parent: n, kind: "row", depth: depth + 1)
                    out.append(row)
                    for (column, cell) in cells.enumerated() {
                        var node = Node(n: out.count, parent: row.n, kind: "cell", depth: depth + 2)
                        node.align = column < table.alignments.count ? name(table.alignments[column]) : "none"
                        node.text = cell.plain
                        out.append(node)
                    }
                }
            case .html(let text):
                var node = Node(n: n, parent: parent, kind: "html", depth: depth)
                node.text = text
                out.append(node)
            case .plain(let text):
                var node = Node(n: n, parent: parent, kind: "plain", depth: depth)
                node.text = text
                out.append(node)
            }
        }
    }

    static func name(_ alignment: ColumnAlignment) -> String {
        switch alignment {
        case .none: "none"
        case .left: "left"
        case .center: "center"
        case .right: "right"
        }
    }

    /// The outline of one fixture, as JSON lines.
    static func lines(fixture: String, _ answer: RenderedAnswer) -> [String] {
        nodes(answer).map { line(fixture: fixture, $0) }
    }

    static func line(fixture: String, _ node: Node) -> String {
        let fields: [(String, String)] = [
            ("fixture", quoted(fixture)),
            ("n", String(node.n)),
            ("parent", String(node.parent)),
            ("kind", quoted(node.kind)),
            ("depth", String(node.depth)),
            ("level", node.level.map { String($0) } ?? "null"),
            ("ordered", node.ordered.map { $0 ? "true" : "false" } ?? "null"),
            ("start", node.start.map { String($0) } ?? "null"),
            ("task", node.task.map(quoted) ?? "null"),
            ("align", node.align.map(quoted) ?? "null"),
            ("fenced", node.fenced.map { $0 ? "true" : "false" } ?? "null"),
            ("text", quoted(node.text))
        ]
        return "{" + fields.map { quoted($0.0) + ":" + $0.1 }.joined(separator: ",") + "}"
    }

    /// A JSON string: printable ASCII as itself, `"` and `\` escaped, and
    /// every other character a `\u` escape (a pair past U+FFFF).
    static func quoted(_ text: String) -> String {
        var out = "\""
        for unit in text.utf16 {
            switch unit {
            case 0x22: out += "\\\""
            case 0x5c: out += "\\\\"
            case 0x20...0x7e: out.unicodeScalars.append(Unicode.Scalar(UInt8(unit)))
            default:
                let hex = String(unit, radix: 16)
                out += "\\u" + String(repeating: "0", count: 4 - hex.count) + hex
            }
        }
        return out + "\""
    }
}
