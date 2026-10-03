// An answer, parsed once and ready to draw (Phase 316.6, build/p3166/SPEC.md
// §5.5.1).
//
// WHERE THE PARSE RUNS. Once per answer, and never in a view's `body`:
// `SessionDrawing.init` builds the Session screen's last answer, and
// `ConversationModel` builds every turn's as each page is accepted. So a
// screen that is drawn again draws what was already parsed.
//
// THE SHAPE. `RenderedBlock` mirrors `MarkdownBlock` (Blocks.swift) with an
// `InlineText` (Inline.swift) wherever the parser held inline text (a
// heading, a paragraph, a table cell), and carries `n`, its PRE-ORDER ordinal
// over the whole tree: a container before its children, a list's items in
// order, a table once and its cells not at all. `n` is what the screen names
// each block by, `md-<scope>-<n>` (Screens/Identifiers.swift), so the names
// are decided here, with the parse, and the screen counts nothing.
//
// AN ANSWER TOO HEAVY TO DRAW AS BLOCKS (the ruled round of 2026-10-01). Every
// block, list item and table cell is its own drawn view, and a page of twenty
// answers each holding hundreds of them cost the reverify up to 28 s and
// 4.6 GB on iOS 18.3, against the build before this one's 4.4 s and 38 MB,
// and ended the test host. So an answer whose parse holds more PIECES than
// `MarkdownCaps.pieces` is not drawn as blocks at all: `written` holds it as
// that build drew it (`Inline.asWritten`, one text, every word, no link), and
// `blocks` is empty. A piece is one block or one table cell, a list item or a
// quote is two, and a block that scrolls sideways (a code block, a table) is
// eight: the unit the measurement in the spec's "As built, the ruled round"
// chose.
//
// MARKDOWN IS OFF (his ruling of 2026-10-02). `MarkdownCaps.pieces` is 0 and
// every parse holds at least one block, so EVERY answer takes the `written`
// path below and `blocks` is always empty: the phone draws each answer exactly
// as the build before this phase drew it. The blocks are still parsed and
// weighed here, and the parse is still tested, for the later phase that draws
// the conversation lazily and switches them back on (Markdown/Caps.swift).
//
// Foundation only.

import Foundation

struct RenderedAnswer: Equatable, Sendable {
    /// The answer's blocks, or none when it is drawn as written.
    let blocks: [RenderedBlock]
    /// The answer was longer than `MarkdownCaps.answerBytes`; the screen ends
    /// it with `Copy.restNotShown`.
    let cut: Bool
    /// The whole answer as the build before this one drew it, when its parse
    /// holds more pieces than `MarkdownCaps.pieces`; nil when it is drawn as
    /// blocks.
    let written: AttributedString?

    /// The answer, parsed once: as blocks, or, past `MarkdownCaps.pieces`, as
    /// written.
    init(_ answer: String) {
        let document = MarkdownBlocks.parse(answer)
        if Self.pieces(document.blocks, depth: 0) > MarkdownCaps.pieces {
            self.init(blocks: [], cut: document.cut, written: Inline.asWritten(MarkdownBlocks.within(answer).text))
        } else {
            self.init(blocks: Self.blocks(of: document), cut: document.cut, written: nil)
        }
    }

    init(blocks: [RenderedBlock], cut: Bool, written: AttributedString?) {
        self.blocks = blocks
        self.cut = cut
        self.written = written
    }

    /// A parsed document's blocks with their inline text parsed and their
    /// ordinals given from 0.
    static func blocks(of document: MarkdownDocument) -> [RenderedBlock] {
        var next = 0
        return render(document.blocks, depth: 0, next: &next)
    }

    /// What drawing the blocks would cost, counted in pieces: every block and
    /// every table cell (header cells included) is one view of its own, a list
    /// item or a quote is `containerPieces`, and a block that scrolls sideways
    /// (a code block, a table) is `scrollPieces`.
    static func pieces(_ blocks: [MarkdownBlock], depth: Int) -> Int {
        var count = 0
        for block in blocks {
            count += 1
            switch block {
            case .list(_, _, let items):
                for item in items {
                    count += containerPieces + pieces(item.blocks, depth: depth + 1)
                }
            case .quote(let inner):
                count += containerPieces - 1
                count += pieces(inner, depth: depth + 1)
            case .table(let table):
                count += scrollPieces - 1
                count += table.header.count
                for row in table.rows { count += row.count }
            case .code:
                count += scrollPieces - 1
            case .heading, .paragraph, .rule, .html, .plain:
                break
            }
        }
        return count
    }

    /// The weights, MEASURED on iOS 18.3 in a Release test host, pages of
    /// twenty answers each holding 40 and then 160 of one kind of piece (the
    /// spec's "As built, the ruled round"): a paragraph, a heading, a rule, a
    /// raw HTML block or a table cell grew the page by 38 to 49 KB each; a
    /// list item by 59 KB empty and 154 KB with its paragraph, a quote by
    /// 146 KB with its paragraph; a one-line code block, its own horizontal
    /// scroll and rounded ground, by 347 KB. So a list item and a quote count
    /// as two, and a code block or a table as eight.
    static let containerPieces = 2
    static let scrollPieces = 8

    /// The parsed blocks with their inline text parsed and their ordinals
    /// given, from `next` on. Recurses into quotes and list items.
    static func render(_ blocks: [MarkdownBlock], depth: Int, next: inout Int) -> [RenderedBlock] {
        var out: [RenderedBlock] = []
        out.reserveCapacity(blocks.count)
        for block in blocks {
            let n = next
            next += 1
            let kind: RenderedBlock.Kind
            switch block {
            case .heading(let level, let text):
                kind = .heading(level: level, text: Inline.render(text))
            case .paragraph(let text):
                kind = .paragraph(Inline.render(text))
            case .code(let lines, let fenced, let moreLines):
                kind = .code(lines: lines, fenced: fenced, moreLines: moreLines)
            case .list(let ordered, let start, let items):
                var drawn: [RenderedItem] = []
                for item in items {
                    let itemN = next
                    next += 1
                    let inner = render(item.blocks, depth: depth + 1, next: &next)
                    drawn.append(RenderedItem(n: itemN, number: item.number, bullet: item.bullet, task: item.task, blocks: inner))
                }
                kind = .list(ordered: ordered, start: start, items: drawn)
            case .quote(let inner):
                kind = .quote(render(inner, depth: depth + 1, next: &next))
            case .rule:
                kind = .rule
            case .table(let table):
                kind = .table(RenderedTable(
                    alignments: table.alignments,
                    header: table.header.map(Inline.render),
                    rows: table.rows.map { $0.map(Inline.render) }
                ))
            case .html(let text):
                kind = .html(text)
            case .plain(let text):
                kind = .plain(text)
            }
            out.append(RenderedBlock(n: n, kind: kind))
        }
        return out
    }
}

/// One block, named by its pre-order ordinal.
struct RenderedBlock: Equatable, Sendable, Identifiable {
    let n: Int
    let kind: Kind

    var id: Int { n }

    enum Kind: Equatable, Sendable {
        case heading(level: Int, text: InlineText)
        case paragraph(InlineText)
        case code(lines: [String], fenced: Bool, moreLines: Int)
        case list(ordered: Bool, start: Int, items: [RenderedItem])
        case quote([RenderedBlock])
        case rule
        case table(RenderedTable)
        case html(String)
        case plain(String)
    }
}

/// One list item, named by its pre-order ordinal like a block.
struct RenderedItem: Equatable, Sendable, Identifiable {
    let n: Int
    /// An ordered item's number as the agent wrote it, its digits unchanged;
    /// nil in a bullet list. NEVER COUNTED (difference D17): `8. CONTEXT`
    /// after a `6.` stays 8, and `0. Nobody waits` keeps its 0, as the build
    /// before this one drew them, where CommonMark and the Mac count on from
    /// the list's first number.
    let number: String?
    /// The bullet the agent wrote, `-`, `+` or `*`, drawn as its mark in a
    /// bullet list, so an unfenced diff's `-` and `+` lines stay told apart
    /// (the fix round). An ordered list's `.` or `)`, which is not drawn: its
    /// written number is, with `Copy.orderedMarkTail` (difference D7).
    let bullet: String
    let task: TaskMark?
    let blocks: [RenderedBlock]

    var id: Int { n }
}

/// A table. Nothing it was written with is left out of the drawing: what
/// does not fit is the plain block after it (Markdown/Blocks.swift).
struct RenderedTable: Equatable, Sendable {
    let alignments: [ColumnAlignment]
    let header: [InlineText]
    let rows: [[InlineText]]
}

extension RenderedBlock {
    /// A code block's note, `12 more lines`, or nil.
    static func codeNote(_ moreLines: Int) -> String? {
        moreLines > 0 ? Copy.moreLines(moreLines) : nil
    }
}
