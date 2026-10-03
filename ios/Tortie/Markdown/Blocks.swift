// The answer's blocks: Tortie's own line-based markdown parser (Phase 316.6,
// build/p3166/SPEC.md §5.5.2).
//
// WHY OUR OWN. Foundation's `.full` syntax parses blocks, but nothing caps its
// work and SwiftUI draws none of its block intents; a package is refused by
// rule (f). So the BLOCKS are parsed here, line by line, and each run of
// inline text is handed to Foundation's inline parser in one place
// (Inline.swift). What is recognised is CommonMark 0.31.2 and, for tables and
// task boxes, GFM 0.29:
//
//   fenced code       ``` or ~~~, closed by the same character at least as
//                     long; an unclosed fence runs to the end of its container
//   ATX heading       1 to 6 `#`, an optional closing run of `#` dropped
//   thematic break    3 or more of one of - * _, spaces between
//   HTML block        CommonMark's seven start conditions, kept as characters
//   block quote       `>`, with lazy paragraph continuation
//   list item         - + * or 1 to 9 digits and . or ), GFM task boxes
//   indented code     4 columns, never interrupting a paragraph
//   GFM table         a delimiter row under its header, `\|` a pipe; a row's
//                     cells past its header's count are kept in its last
//                     cell (GFM drops them; difference D16)
//   paragraph         every other line; a setext underline makes a heading
//
// NOT RECOGNISED, and drawn as their characters (each a named difference in
// the spec's §7.5): link reference definitions and reference links,
// footnotes, front matter and math.
//
// THE PROMISES rule (y) reads as text: Foundation and nothing else; no
// `throws`, no force unwrap, no trap and no regular expression; the ONE
// recursive function, `blocks`, takes `depth:` and passes `depth: depth + 1`,
// and at `MarkdownCaps.depth` no container opens; every cap is read here at
// one place; and every input yields blocks, an empty answer one empty
// paragraph. Its only input is a String, so every integer below is a count or
// a position inside at most `MarkdownCaps.answerBytes` bytes.
//
// HOW CONTAINERS ARE READ. A quote or a list item collects the lines that
// belong to it, with its marker and indentation taken off, and those lines are
// parsed again, one level deeper. A line taken by laziness (a paragraph
// continued without its `>` or its indentation) is marked, and can then only
// continue a paragraph, as CommonMark says; with no paragraph open it begins
// one, so EVERY TURN OF THE LOOP TAKES AT LEAST ONE LINE (the fix round: a lazy
// line of four columns once reached indented code, which refuses a lazy line,
// and the loop added an empty block per turn until the budget ran out).
//
// NOTHING AN HONEST ANSWER HOLDS IS LEFT UNDRAWN. A table's rows past
// `MarkdownCaps.tableRows` or the cell budget, and a table wider than
// `MarkdownCaps.tableColumns`, are drawn as their characters, one plain block;
// an unordered item keeps the bullet the agent wrote, so `- old` and `+ new`
// still say which line went and which came (Caps.swift says why).

import Foundation

// MARK: - What the parser answers (pinned, §5.5.1)

struct MarkdownDocument: Equatable, Sendable {
    let blocks: [MarkdownBlock]
    /// True when the answer was longer than `MarkdownCaps.answerBytes`.
    let cut: Bool
}

indirect enum MarkdownBlock: Equatable, Sendable {
    /// 1...6, ATX or setext.
    case heading(level: Int, text: String)
    /// The lines joined with "\n".
    case paragraph(String)
    case code(lines: [String], fenced: Bool, moreLines: Int)
    case list(ordered: Bool, start: Int, items: [MarkdownItem])
    case quote([MarkdownBlock])
    case rule
    case table(MarkdownTable)
    /// A raw HTML block, its characters.
    case html(String)
    /// The rest past a cap, verbatim.
    case plain(String)
}

struct MarkdownItem: Equatable, Sendable {
    let task: TaskMark?
    /// The list's marker as the agent wrote it: `-`, `+` or `*`, or an
    /// ordered list's `.` or `)`.
    let bullet: String
    /// An ordered item's number AS THE AGENT WROTE IT, its digits unchanged
    /// (`8`, `0`, `007`); nil in a bullet list. Never counted: CommonMark and
    /// the Mac number an ordered list on from its first item, and that drew
    /// `8. CONTEXT` as `7.` and the exit code in `code\n0. Nobody waits` as
    /// `4.`, digits the build before this one drew (difference D17, the ruled
    /// round of 2026-10-01).
    let number: String?
    let blocks: [MarkdownBlock]
}

enum TaskMark: Equatable, Sendable {
    case open, done
}

enum ColumnAlignment: Equatable, Sendable {
    case none, left, center, right
}

struct MarkdownTable: Equatable, Sendable {
    let alignments: [ColumnAlignment]
    let header: [String]
    let rows: [[String]]
}

// MARK: - The parser

enum MarkdownBlocks {
    /// The answer's blocks. Never fails and never answers nothing.
    static func parse(_ answer: String) -> MarkdownDocument {
        let kept = within(answer)
        var budget = Budget()
        let found = blocks(Line.split(kept.text), depth: 0, budget: &budget)
        return MarkdownDocument(blocks: found.isEmpty ? [.paragraph("")] : found, cut: kept.cut)
    }

    /// The longest prefix of at most `MarkdownCaps.answerBytes` UTF-8 bytes
    /// that ends on a Character, with NUL made U+FFFD (CommonMark §2.3).
    static func within(_ answer: String) -> (text: String, cut: Bool) {
        var bytes = 0
        var end = answer.startIndex
        var cut = false
        while end < answer.endIndex {
            let next = answer.index(after: end)
            let size = answer.utf8.distance(from: end, to: next)
            if bytes + size > MarkdownCaps.answerBytes {
                cut = true
                break
            }
            bytes += size
            end = next
        }
        let text = String(answer[..<end])
        guard text.utf8.contains(0) else { return (text, cut) }
        return (text.replacingOccurrences(of: "\u{0}", with: "\u{FFFD}"), cut)
    }

    /// Blocks counted against `MarkdownCaps.blocks`, and cells against
    /// `MarkdownCaps.cells`, across the whole answer. A list item counts as a
    /// block: it is drawn as one (its mark, its own identifier) even when it
    /// holds none, so `-` written 16,384 times is not 16,384 drawn items (the
    /// integrator's finding, which ended a test host on iOS 18.3).
    struct Budget {
        var blocks = 0
        var cells = 0
        var full: Bool { blocks >= MarkdownCaps.blocks }

        mutating func add(_ block: MarkdownBlock, to out: inout [MarkdownBlock]) {
            out.append(block)
            blocks += 1
        }

        /// One list item, drawn like a block.
        mutating func countItem() {
            blocks += 1
        }
    }

    /// The blocks of one container's lines. THE ONE RECURSION: a quote's and
    /// a list item's lines are parsed again here, one level deeper.
    static func blocks(_ lines: [Line], depth: Int, budget: inout Budget) -> [MarkdownBlock] {
        let opens = depth < MarkdownCaps.depth
        var out: [MarkdownBlock] = []
        var para: [Line] = []
        var i = 0
        while i < lines.count {
            if budget.full {
                // The rest, the open paragraph's lines included, as one block.
                // Every branch that adds a block empties `para` first, so it is
                // empty here today (the attack verifier's ablation of it stayed
                // green for that reason); it is kept so a later branch that
                // forgets cannot drop the agent's words.
                let rest = para + Array(lines[i...])
                budget.add(.plain(rest.map(\.text).joined(separator: "\n")), to: &out)
                return out
            }
            let line = lines[i]
            if line.lazy {
                // A line taken by laziness only ever continues a paragraph.
                // With none open (the collector read the container's lines
                // without parsing them, and can be wrong), it BEGINS one. It
                // never reaches indented code, which refuses a lazy line and
                // would leave this loop on the line it started from.
                para.append(line)
                i += 1
                continue
            }
            let lead = line.leading
            if lead.at == line.bytes.endIndex {
                if !para.isEmpty { budget.add(.paragraph(paragraph(para)), to: &out) }
                para = []
                i += 1
                continue
            }
            if lead.columns >= 4 {
                if !para.isEmpty {
                    para.append(line)
                    i += 1
                    continue
                }
                let found = indentedCode(lines, from: i)
                budget.add(code(found.lines, fenced: false), to: &out)
                i = found.next
                continue
            }
            let first = line.bytes[lead.at]
            if let fence = Fence(line, lead: lead) {
                if !para.isEmpty { budget.add(.paragraph(paragraph(para)), to: &out) }
                para = []
                var content: [String] = []
                var j = i + 1
                while j < lines.count {
                    if fence.closes(lines[j]) {
                        j += 1
                        break
                    }
                    content.append(lines[j].dropping(lead.columns).text)
                    j += 1
                }
                budget.add(code(content, fenced: true), to: &out)
                i = j
                continue
            }
            if first == Byte.hash, let heading = atx(line, lead: lead) {
                if !para.isEmpty { budget.add(.paragraph(paragraph(para)), to: &out) }
                para = []
                budget.add(heading, to: &out)
                i += 1
                continue
            }
            if !para.isEmpty, let level = setext(line, lead: lead) {
                budget.add(.heading(level: level, text: paragraph(para)), to: &out)
                para = []
                i += 1
                continue
            }
            if isThematic(line, lead: lead) {
                if !para.isEmpty { budget.add(.paragraph(paragraph(para)), to: &out) }
                para = []
                budget.add(.rule, to: &out)
                i += 1
                continue
            }
            if first == Byte.less, let kind = HTMLStart.kind(line, lead: lead), kind != 7 || para.isEmpty {
                if !para.isEmpty { budget.add(.paragraph(paragraph(para)), to: &out) }
                para = []
                let found = html(lines, from: i, kind: kind)
                budget.add(.html(found.text), to: &out)
                i = found.next
                continue
            }
            if opens && first == Byte.greater {
                if !para.isEmpty { budget.add(.paragraph(paragraph(para)), to: &out) }
                para = []
                let found = quoteLines(lines, from: i)
                let inner = blocks(found.lines, depth: depth + 1, budget: &budget)
                budget.add(.quote(inner), to: &out)
                i = found.next
                continue
            }
            if opens, let marker = ListMarker(line, lead: lead), para.isEmpty || marker.interrupts {
                if !para.isEmpty { budget.add(.paragraph(paragraph(para)), to: &out) }
                para = []
                var items: [MarkdownItem] = []
                var current = marker
                var j = i
                while true {
                    let found = itemLines(lines, from: j, marker: current)
                    let task = TaskBox.read(found.lines)
                    let inner = blocks(task.lines, depth: depth + 1, budget: &budget)
                    items.append(MarkdownItem(task: task.mark, bullet: current.written, number: current.number, blocks: inner))
                    budget.countItem()
                    j = found.next
                    var k = j
                    while k < lines.count && lines[k].isBlank { k += 1 }
                    guard k < lines.count, !lines[k].lazy, !budget.full else { break }
                    let nextLead = lines[k].leading
                    guard nextLead.columns < 4,
                          let next = ListMarker(lines[k], lead: nextLead),
                          next.sameList(as: current) else { break }
                    current = next
                    j = k
                }
                budget.add(.list(ordered: marker.ordered, start: marker.start, items: items), to: &out)
                i = j
                continue
            }
            if let last = para.last, let table = Table(header: last, delimiter: line) {
                para.removeLast()
                if !para.isEmpty { budget.add(.paragraph(paragraph(para)), to: &out) }
                para = []
                var rows: [Line] = []
                var j = i + 1
                while j < lines.count, !lines[j].lazy, !lines[j].isBlank, lines[j].leading.columns < 4, !startsBlock(lines[j]) {
                    rows.append(lines[j])
                    j += 1
                }
                for block in table.pieces(rows: rows, source: [last, line] + rows, budget: &budget) {
                    budget.add(block, to: &out)
                }
                i = j
                continue
            }
            para.append(line)
            i += 1
        }
        if !para.isEmpty { budget.add(.paragraph(paragraph(para)), to: &out) }
        return out
    }

    // MARK: Leaf blocks

    /// A paragraph's text: each line without its leading and trailing
    /// whitespace, joined by "\n" (a hard break's trailing spaces are dropped
    /// and its line break kept).
    static func paragraph(_ lines: [Line]) -> String {
        lines.map { $0.dropping($0.leading.columns).text.trimmingTrailingBlanks }.joined(separator: "\n")
    }

    /// A code block, cut at `MarkdownCaps.fenceLines` lines and each line at
    /// `MarkdownCaps.lineCharacters` characters.
    static func code(_ lines: [String], fenced: Bool) -> MarkdownBlock {
        let shown = lines.prefix(MarkdownCaps.fenceLines).map { line -> String in
            let cap = MarkdownCaps.lineCharacters
            guard line.count > cap else { return line }
            return Copy.cutShort(String(line.prefix(cap)))
        }
        return .code(lines: Array(shown), fenced: fenced, moreLines: lines.count - shown.count)
    }

    /// Indented code from `from`: lines of 4 or more columns and blank lines,
    /// with the trailing blank lines left out.
    static func indentedCode(_ lines: [Line], from: Int) -> (lines: [String], next: Int) {
        var found: [String] = []
        var kept = 0
        var j = from
        while j < lines.count {
            let line = lines[j]
            let lead = line.leading
            if lead.at == line.bytes.endIndex {
                found.append(line.dropping(4).text)
            } else if lead.columns >= 4 && !line.lazy {
                found.append(line.dropping(4).text)
                kept = found.count
            } else {
                break
            }
            j += 1
        }
        let blanksAfter = found.count - kept
        return (Array(found.prefix(kept)), j - blanksAfter)
    }

    /// An ATX heading, or nil when the `#` run is not one.
    static func atx(_ line: Line, lead: (columns: Int, at: Int)) -> MarkdownBlock? {
        let bytes = line.bytes
        var p = lead.at
        while p < bytes.endIndex && bytes[p] == Byte.hash { p += 1 }
        let level = p - lead.at
        guard level <= 6 else { return nil }
        if p < bytes.endIndex && !Byte.isBlank(bytes[p]) { return nil }
        var start = p
        while start < bytes.endIndex && Byte.isBlank(bytes[start]) { start += 1 }
        var end = bytes.endIndex
        while end > start && Byte.isBlank(bytes[end - 1]) { end -= 1 }
        // An optional closing run of `#`, preceded by a space or a tab.
        var run = end
        while run > start && bytes[run - 1] == Byte.hash { run -= 1 }
        if run == start {
            end = start
        } else if run < end && Byte.isBlank(bytes[run - 1]) {
            end = run
            while end > start && Byte.isBlank(bytes[end - 1]) { end -= 1 }
        }
        return .heading(level: level, text: String(decoding: bytes[start..<end], as: UTF8.self))
    }

    /// A setext underline's level: a run of `=` (1) or `-` (2), then only
    /// spaces or tabs.
    static func setext(_ line: Line, lead: (columns: Int, at: Int)) -> Int? {
        let bytes = line.bytes
        let mark = bytes[lead.at]
        guard mark == Byte.equals || mark == Byte.dash else { return nil }
        var p = lead.at
        while p < bytes.endIndex && bytes[p] == mark { p += 1 }
        while p < bytes.endIndex && Byte.isBlank(bytes[p]) { p += 1 }
        guard p == bytes.endIndex else { return nil }
        return mark == Byte.equals ? 1 : 2
    }

    /// Three or more of one of - * _, with only spaces or tabs between.
    static func isThematic(_ line: Line, lead: (columns: Int, at: Int)) -> Bool {
        let bytes = line.bytes
        guard lead.at < bytes.endIndex else { return false }
        let mark = bytes[lead.at]
        guard mark == Byte.dash || mark == Byte.star || mark == Byte.underscore else { return false }
        var count = 0
        for b in bytes[lead.at...] {
            if b == mark {
                count += 1
            } else if !Byte.isBlank(b) {
                return false
            }
        }
        return count >= 3
    }

    /// An HTML block from `from`: kinds 1 to 5 run to the line holding their
    /// end, 6 and 7 to a blank line.
    static func html(_ lines: [Line], from: Int, kind: Int) -> (text: String, next: Int) {
        var taken: [String] = []
        var j = from
        if kind <= 5 {
            while j < lines.count {
                let text = lines[j].text
                taken.append(text)
                j += 1
                if HTMLStart.ends(text, kind: kind) { break }
            }
        } else {
            while j < lines.count && !lines[j].isBlank {
                taken.append(lines[j].text)
                j += 1
            }
        }
        return (taken.joined(separator: "\n"), j)
    }

    // MARK: Containers

    /// A block quote's lines from `from`, each without its `>` and one
    /// following space, and the lazy lines that continue its paragraph.
    static func quoteLines(_ lines: [Line], from: Int) -> (lines: [Line], next: Int) {
        var inner: [Line] = []
        var open = Openness()
        var j = from
        while j < lines.count {
            let line = lines[j]
            let lead = line.leading
            if lead.at < line.bytes.endIndex && lead.columns < 4 && line.bytes[lead.at] == Byte.greater {
                let content = line.after(lead: lead, width: 1).dropping(1)
                inner.append(content)
                open.note(content)
                j += 1
                continue
            }
            guard !line.isBlank, open.paragraph, !startsBlock(line) else { break }
            inner.append(line.markedLazy)
            j += 1
        }
        return (inner, j)
    }

    /// One list item's lines from `from`: its first line after the marker,
    /// every line indented at least to its content, the blank lines between
    /// them, and the lazy lines that continue its paragraph.
    static func itemLines(_ lines: [Line], from: Int, marker: ListMarker) -> (lines: [Line], next: Int) {
        var inner: [Line] = []
        var open = Openness()
        if let first = marker.first {
            inner.append(first)
            open.note(first)
        }
        var blanks: [Line] = []
        var j = from + 1
        while j < lines.count {
            let line = lines[j]
            let lead = line.leading
            if lead.at == line.bytes.endIndex {
                // An item may begin with at most one blank line.
                if marker.first == nil && inner.isEmpty { break }
                blanks.append(line.dropping(marker.contentIndent))
                open.paragraph = false
                j += 1
                continue
            }
            if lead.columns >= marker.contentIndent {
                inner += blanks
                blanks = []
                let content = line.dropping(marker.contentIndent)
                inner.append(content)
                open.note(content)
                j += 1
                continue
            }
            guard blanks.isEmpty, open.paragraph, !startsBlock(line) else { break }
            inner.append(line.markedLazy)
            j += 1
        }
        return (inner, j - blanks.count)
    }

    /// True when the line begins a block in the container a quote or an item
    /// sits in, so it can be no lazy continuation and no table row. That
    /// container is not a paragraph, so any list item starts there, an empty
    /// one and one numbered from 2 included; indented code and HTML of kind 7
    /// still cannot, because the paragraph left open would take the line
    /// (CommonMark's own reading of a lazy line).
    static func startsBlock(_ line: Line) -> Bool {
        let lead = line.leading
        guard lead.at < line.bytes.endIndex, lead.columns < 4 else { return false }
        let first = line.bytes[lead.at]
        if Fence(line, lead: lead) != nil { return true }
        if first == Byte.hash && atx(line, lead: lead) != nil { return true }
        if isThematic(line, lead: lead) { return true }
        if first == Byte.greater { return true }
        if first == Byte.less, let kind = HTMLStart.kind(line, lead: lead), kind != 7 { return true }
        return ListMarker(line, lead: lead) != nil
    }

    /// Whether a container's content leaves a paragraph open, which is what
    /// lets the next line continue it lazily. Read line by line as the
    /// container's lines are collected, without parsing them.
    struct Openness {
        var paragraph = false
        var fence: Fence?
        /// The start condition of an open HTML block: kinds 1 to 5 run to the
        /// line holding their end, 6 and 7 to a blank line. No paragraph is
        /// open inside one, so no lazy line continues it (the fix round:
        /// `> <!--` then `> -->` once read its second line as a paragraph).
        var html: Int?
        /// Inside a table's rows, which no lazy line continues.
        var table = false
        var last: Line?

        mutating func note(_ line: Line) {
            defer { last = line }
            if let open = fence {
                if open.closes(line) { fence = nil }
                paragraph = false
                return
            }
            if let kind = html {
                if kind <= 5 ? HTMLStart.ends(line.text, kind: kind) : line.isBlank { html = nil }
                paragraph = false
                return
            }
            let lead = line.leading
            if lead.at == line.bytes.endIndex {
                paragraph = false
                table = false
                return
            }
            if let opened = Fence(line, lead: lead) {
                fence = opened
                paragraph = false
                table = false
                return
            }
            if table && lead.columns < 4 && !startsBlock(line) { return }
            table = false
            if paragraph, let header = last, Table(header: header, delimiter: line) != nil {
                table = true
                paragraph = false
                return
            }
            if lead.columns < 4, line.bytes[lead.at] == Byte.less,
               let kind = HTMLStart.kind(line, lead: lead), kind != 7 || !paragraph {
                // Kinds 1 to 5 may end on the line they start on.
                html = kind <= 5 && HTMLStart.ends(line.text, kind: kind) ? nil : kind
                paragraph = false
                return
            }
            paragraph = Self.leavesParagraph(line, lead: lead, after: paragraph)
        }

        /// Whether a line, read as the first line of whatever it starts,
        /// leaves a paragraph open. A quote's or an item's marker is looked
        /// through, a fixed number of times, to the text inside it.
        static func leavesParagraph(_ line: Line, lead: (columns: Int, at: Int), after open: Bool) -> Bool {
            var line = line
            var lead = lead
            var open = open
            for _ in 0..<4 {
                guard lead.at < line.bytes.endIndex else { return false }
                if lead.columns >= 4 { return open }
                let first = line.bytes[lead.at]
                if Fence(line, lead: lead) != nil { return false }
                if first == Byte.hash && atx(line, lead: lead) != nil { return false }
                if open && setext(line, lead: lead) != nil { return false }
                if isThematic(line, lead: lead) { return false }
                if first == Byte.less, let kind = HTMLStart.kind(line, lead: lead), kind != 7 || !open { return false }
                if first == Byte.greater {
                    line = line.after(lead: lead, width: 1).dropping(1)
                } else if let marker = ListMarker(line, lead: lead), !open || marker.interrupts {
                    guard let inside = marker.first else { return false }
                    line = inside
                } else {
                    return true
                }
                lead = line.leading
                open = false
            }
            return lead.at < line.bytes.endIndex
        }
    }
}

// MARK: - The parser's parts, inside its namespace so no name is taken from the app

extension MarkdownBlocks {
    // MARK: - A line

    /// One line of the answer, as one container sees it: the bytes left after its
    /// markers and indentation were taken off.
    struct Line: Equatable, Sendable {
        let bytes: ArraySlice<UInt8>
        /// Spaces before `bytes`, left from a tab a marker took part of.
        let pad: Int
        /// The column `bytes` begins at, counted from the start of the source
        /// line, so a tab reaches the same stop however much was taken off.
        let column: Int
        /// Taken by laziness: it can only continue a paragraph.
        let lazy: Bool

        init(bytes: ArraySlice<UInt8>, pad: Int = 0, column: Int = 0, lazy: Bool = false) {
            self.bytes = bytes
            self.pad = pad
            self.column = column
            self.lazy = lazy
        }

        /// The answer's lines, split at \r\n, \r or \n (CommonMark §2.1).
        static func split(_ text: String) -> [Line] {
            let all = Array(text.utf8)[...]
            var out: [Line] = []
            var start = all.startIndex
            var p = all.startIndex
            while p < all.endIndex {
                let b = all[p]
                if b == Byte.newline || b == Byte.carriageReturn {
                    out.append(Line(bytes: all[start..<p]))
                    if b == Byte.carriageReturn && p + 1 < all.endIndex && all[p + 1] == Byte.newline { p += 1 }
                    start = p + 1
                }
                p += 1
            }
            if start < all.endIndex { out.append(Line(bytes: all[start...])) }
            return out
        }

        /// The leading whitespace, in columns (a tab reaching the next multiple
        /// of four), and where the first other byte is.
        var leading: (columns: Int, at: Int) {
            var columns = pad
            var stop = column
            var p = bytes.startIndex
            while p < bytes.endIndex {
                let b = bytes[p]
                if b == Byte.space {
                    columns += 1
                    stop += 1
                } else if b == Byte.tab {
                    let width = 4 - stop % 4
                    columns += width
                    stop += width
                } else {
                    break
                }
                p += 1
            }
            return (columns, p)
        }

        var isBlank: Bool { leading.at == bytes.endIndex }

        /// This line with `count` columns of its leading whitespace taken off, or
        /// all of it when it has fewer. A tab taken in part leaves spaces.
        func dropping(_ count: Int) -> Line {
            if pad >= count { return Line(bytes: bytes, pad: pad - count, column: column, lazy: lazy) }
            var left = count - pad
            var stop = column
            var p = bytes.startIndex
            while left > 0 && p < bytes.endIndex {
                let b = bytes[p]
                if b == Byte.space {
                    left -= 1
                    stop += 1
                } else if b == Byte.tab {
                    let width = 4 - stop % 4
                    if width > left {
                        return Line(bytes: bytes[(p + 1)...], pad: width - left, column: stop + width, lazy: lazy)
                    }
                    left -= width
                    stop += width
                } else {
                    break
                }
                p += 1
            }
            return Line(bytes: bytes[p...], pad: 0, column: stop, lazy: lazy)
        }

        /// The rest of the line after a marker `width` bytes long that begins at
        /// `lead.at`.
        func after(lead: (columns: Int, at: Int), width: Int) -> Line {
            let markerColumn = column - pad + lead.columns
            return Line(bytes: bytes[(lead.at + width)...], pad: 0, column: markerColumn + width, lazy: lazy)
        }

        /// The same line, taken by laziness.
        var markedLazy: Line { Line(bytes: bytes, pad: pad, column: column, lazy: true) }

        /// What the line says: its spaces, then its bytes.
        var text: String {
            let rest = String(decoding: bytes, as: UTF8.self)
            guard pad > 0 else { return rest }
            return String(repeating: " ", count: pad) + rest
        }
    }


    // MARK: - The bytes the grammar names

    enum Byte {
        static let tab = UInt8(ascii: "\t")
        static let newline = UInt8(ascii: "\n")
        static let carriageReturn = UInt8(ascii: "\r")
        static let space = UInt8(ascii: " ")
        static let hash = UInt8(ascii: "#")
        static let dash = UInt8(ascii: "-")
        static let plus = UInt8(ascii: "+")
        static let star = UInt8(ascii: "*")
        static let underscore = UInt8(ascii: "_")
        static let equals = UInt8(ascii: "=")
        static let greater = UInt8(ascii: ">")
        static let less = UInt8(ascii: "<")
        static let slash = UInt8(ascii: "/")
        static let bang = UInt8(ascii: "!")
        static let question = UInt8(ascii: "?")
        static let backtick = UInt8(ascii: "`")
        static let tilde = UInt8(ascii: "~")
        static let pipe = UInt8(ascii: "|")
        static let backslash = UInt8(ascii: "\\")
        static let colon = UInt8(ascii: ":")
        static let dot = UInt8(ascii: ".")
        static let closeParen = UInt8(ascii: ")")
        static let openBracket = UInt8(ascii: "[")
        static let closeBracket = UInt8(ascii: "]")
        static let quote = UInt8(ascii: "\"")
        static let apostrophe = UInt8(ascii: "'")
        static let zero = UInt8(ascii: "0")
        static let nine = UInt8(ascii: "9")
        static let lowerX = UInt8(ascii: "x")
        static let upperX = UInt8(ascii: "X")

        static func isBlank(_ b: UInt8) -> Bool { b == space || b == tab }
        static func isDigit(_ b: UInt8) -> Bool { b >= zero && b <= nine }
        static func isLetter(_ b: UInt8) -> Bool {
            (b >= UInt8(ascii: "a") && b <= UInt8(ascii: "z")) || (b >= UInt8(ascii: "A") && b <= UInt8(ascii: "Z"))
        }
        static func isWhitespace(_ b: UInt8) -> Bool {
            b == space || b == tab || b == newline || b == carriageReturn || b == 0x0b || b == 0x0c
        }
    }

    // MARK: - Fences

    struct Fence: Equatable, Sendable {
        let mark: UInt8
        let length: Int

        /// A code fence opening at `lead.at`, or nil.
        init?(_ line: Line, lead: (columns: Int, at: Int)) {
            let bytes = line.bytes
            guard lead.columns < 4, lead.at < bytes.endIndex else { return nil }
            let mark = bytes[lead.at]
            guard mark == Byte.backtick || mark == Byte.tilde else { return nil }
            var p = lead.at
            while p < bytes.endIndex && bytes[p] == mark { p += 1 }
            let length = p - lead.at
            guard length >= 3 else { return nil }
            // A backtick fence's info string holds no backtick.
            if mark == Byte.backtick && bytes[p...].contains(Byte.backtick) { return nil }
            self.mark = mark
            self.length = length
        }

        /// True when the line closes this fence: the same character, at least as
        /// many, at most three columns in, then only spaces or tabs.
        func closes(_ line: Line) -> Bool {
            let bytes = line.bytes
            let lead = line.leading
            guard lead.columns < 4, lead.at < bytes.endIndex, bytes[lead.at] == mark else { return false }
            var p = lead.at
            while p < bytes.endIndex && bytes[p] == mark { p += 1 }
            guard p - lead.at >= length else { return false }
            while p < bytes.endIndex && Byte.isBlank(bytes[p]) { p += 1 }
            return p == bytes.endIndex
        }
    }

    // MARK: - List markers and task boxes

    struct ListMarker: Equatable, Sendable {
        let ordered: Bool
        /// The bullet character, or the ordered delimiter.
        let mark: UInt8
        let start: Int
        /// An ordered marker's digits as written, or nil for a bullet.
        let number: String?
        /// The columns a following line needs to belong to the item.
        let contentIndent: Int
        /// The item's first line after the marker, or nil when it is empty.
        let first: Line?

        /// A list item's marker at `lead.at`, or nil. A thematic break is no
        /// marker, and a number has at most `MarkdownCaps.listNumberDigits`
        /// digits.
        init?(_ line: Line, lead: (columns: Int, at: Int)) {
            let bytes = line.bytes
            guard lead.columns < 4, lead.at < bytes.endIndex else { return nil }
            let head = bytes[lead.at]
            var p = lead.at
            var number = 0
            if head == Byte.dash || head == Byte.plus || head == Byte.star {
                guard !MarkdownBlocks.isThematic(line, lead: lead) else { return nil }
                p += 1
                ordered = false
                mark = head
                self.number = nil
            } else if Byte.isDigit(head) {
                while p < bytes.endIndex && Byte.isDigit(bytes[p]) {
                    number = number * 10 + Int(bytes[p] - Byte.zero)
                    p += 1
                    guard p - lead.at <= MarkdownCaps.listNumberDigits else { return nil }
                }
                guard p < bytes.endIndex, bytes[p] == Byte.dot || bytes[p] == Byte.closeParen else { return nil }
                self.number = String(decoding: bytes[lead.at..<p], as: UTF8.self)
                mark = bytes[p]
                p += 1
                ordered = true
            } else {
                return nil
            }
            guard p == bytes.endIndex || Byte.isBlank(bytes[p]) else { return nil }
            start = number
            let width = p - lead.at
            let rest = line.after(lead: lead, width: width)
            let spaces = rest.leading
            if spaces.at == rest.bytes.endIndex {
                contentIndent = lead.columns + width + 1
                first = nil
            } else if spaces.columns >= 5 {
                contentIndent = lead.columns + width + 1
                first = rest.dropping(1)
            } else {
                contentIndent = lead.columns + width + spaces.columns
                first = rest.dropping(spaces.columns)
            }
        }

        /// Whether it may interrupt a paragraph: not empty, and an ordered list
        /// only from 1.
        var interrupts: Bool { first != nil && (!ordered || start == 1) }

        /// Siblings share the bullet character or the ordered delimiter.
        func sameList(as other: ListMarker) -> Bool {
            ordered == other.ordered && mark == other.mark
        }

        /// The marker character as the agent wrote it.
        var written: String { String(decoding: [mark], as: UTF8.self) }
    }

    /// A GFM task box, `[ ]`, `[x]` or `[X]` then a space or a tab, at the start
    /// of an item's first line.
    enum TaskBox {
        static func read(_ lines: [Line]) -> (mark: TaskMark?, lines: [Line]) {
            guard let first = lines.first, !first.lazy else { return (nil, lines) }
            let lead = first.leading
            let bytes = first.bytes
            let p = lead.at
            guard lead.columns < 4, bytes.distance(from: p, to: bytes.endIndex) >= 4,
                  bytes[p] == Byte.openBracket, bytes[p + 2] == Byte.closeBracket, Byte.isBlank(bytes[p + 3]) else {
                return (nil, lines)
            }
            let inside = bytes[p + 1]
            let mark: TaskMark
            if Byte.isBlank(inside) {
                mark = .open
            } else if inside == Byte.lowerX || inside == Byte.upperX {
                mark = .done
            } else {
                return (nil, lines)
            }
            let rest = first.after(lead: lead, width: 3)
            guard !rest.isBlank else { return (nil, lines) }
            var kept = lines
            kept[0] = rest.dropping(rest.leading.columns)
            return (mark, kept)
        }
    }

    // MARK: - HTML blocks

    /// CommonMark's seven HTML block start conditions, read character by
    /// character, and their ends.
    enum HTMLStart {
        /// The 62 block tag names of CommonMark 0.31.2, condition 6.
        static let blockNames: Set<String> = [
            "address", "article", "aside", "base", "basefont", "blockquote", "body", "caption", "center",
            "col", "colgroup", "dd", "details", "dialog", "dir", "div", "dl", "dt", "fieldset",
            "figcaption", "figure", "footer", "form", "frame", "frameset", "h1", "h2", "h3", "h4", "h5",
            "h6", "head", "header", "hr", "html", "iframe", "legend", "li", "link", "main", "menu",
            "menuitem", "nav", "noframes", "ol", "optgroup", "option", "p", "param", "search", "section",
            "summary", "table", "tbody", "td", "tfoot", "th", "thead", "title", "tr", "track", "ul"
        ]
        /// Condition 1's names.
        static let rawNames: Set<String> = ["pre", "script", "style", "textarea"]

        /// The start condition the line meets at `lead.at` (which holds `<`), or nil.
        static func kind(_ line: Line, lead: (columns: Int, at: Int)) -> Int? {
            let bytes = line.bytes
            let p = lead.at + 1
            guard lead.columns < 4, p < bytes.endIndex else { return nil }
            if starts(bytes, at: p, with: "!--") { return 2 }
            if starts(bytes, at: p, with: "![CDATA[") { return 5 }
            if bytes[p] == Byte.bang {
                return p + 1 < bytes.endIndex && Byte.isLetter(bytes[p + 1]) ? 4 : nil
            }
            if bytes[p] == Byte.question { return 3 }
            let closing = bytes[p] == Byte.slash
            var q = closing ? p + 1 : p
            let nameStart = q
            while q < bytes.endIndex && (Byte.isLetter(bytes[q]) || Byte.isDigit(bytes[q])) { q += 1 }
            guard q > nameStart, Byte.isLetter(bytes[nameStart]) else { return nil }
            let name = String(decoding: bytes[nameStart..<q], as: UTF8.self).lowercased()
            let atEnd = q == bytes.endIndex
            let next = atEnd ? Byte.space : bytes[q]
            if !closing && rawNames.contains(name) && (atEnd || Byte.isWhitespace(next) || next == Byte.greater) {
                return 1
            }
            if blockNames.contains(name) {
                if atEnd || Byte.isWhitespace(next) || next == Byte.greater { return 6 }
                if next == Byte.slash && q + 1 < bytes.endIndex && bytes[q + 1] == Byte.greater { return 6 }
            }
            guard !rawNames.contains(name), let end = completeTag(bytes, at: lead.at) else { return nil }
            var r = end
            while r < bytes.endIndex && Byte.isBlank(bytes[r]) { r += 1 }
            return r == bytes.endIndex ? 7 : nil
        }

        /// True when a line of an HTML block of kinds 1 to 5 holds its end.
        static func ends(_ text: String, kind: Int) -> Bool {
            switch kind {
            case 1:
                let lower = text.lowercased()
                return lower.contains("</script>") || lower.contains("</pre>") || lower.contains("</style>") || lower.contains("</textarea>")
            case 2: return text.contains("-->")
            case 3: return text.contains("?>")
            case 4: return text.contains(">")
            default: return text.contains("]]>")
            }
        }

        static func starts(_ bytes: ArraySlice<UInt8>, at p: Int, with literal: String) -> Bool {
            var q = p
            for b in literal.utf8 {
                guard q < bytes.endIndex, bytes[q] == b else { return false }
                q += 1
            }
            return true
        }

        /// The position after a complete open or closing tag at `at`, or nil.
        static func completeTag(_ bytes: ArraySlice<UInt8>, at: Int) -> Int? {
            var p = at + 1
            guard p < bytes.endIndex else { return nil }
            let closing = bytes[p] == Byte.slash
            if closing { p += 1 }
            guard p < bytes.endIndex, Byte.isLetter(bytes[p]) else { return nil }
            while p < bytes.endIndex && (Byte.isLetter(bytes[p]) || Byte.isDigit(bytes[p]) || bytes[p] == Byte.dash) { p += 1 }
            if closing {
                while p < bytes.endIndex && Byte.isWhitespace(bytes[p]) { p += 1 }
                return p < bytes.endIndex && bytes[p] == Byte.greater ? p + 1 : nil
            }
            while p < bytes.endIndex {
                var q = p
                while q < bytes.endIndex && Byte.isWhitespace(bytes[q]) { q += 1 }
                guard q < bytes.endIndex else { return nil }
                if bytes[q] == Byte.greater { return q + 1 }
                if bytes[q] == Byte.slash {
                    return q + 1 < bytes.endIndex && bytes[q + 1] == Byte.greater ? q + 2 : nil
                }
                // An attribute needs whitespace before it.
                guard q > p, let after = attribute(bytes, at: q) else { return nil }
                p = after
            }
            return nil
        }

        /// The position after one attribute, its name and an optional value.
        static func attribute(_ bytes: ArraySlice<UInt8>, at: Int) -> Int? {
            var p = at
            let head = bytes[p]
            guard Byte.isLetter(head) || head == Byte.underscore || head == Byte.colon else { return nil }
            p += 1
            while p < bytes.endIndex {
                let b = bytes[p]
                guard Byte.isLetter(b) || Byte.isDigit(b) || b == Byte.underscore || b == Byte.dot || b == Byte.colon || b == Byte.dash else { break }
                p += 1
            }
            var q = p
            while q < bytes.endIndex && Byte.isWhitespace(bytes[q]) { q += 1 }
            guard q < bytes.endIndex, bytes[q] == Byte.equals else { return p }
            q += 1
            while q < bytes.endIndex && Byte.isWhitespace(bytes[q]) { q += 1 }
            guard q < bytes.endIndex else { return nil }
            let open = bytes[q]
            if open == Byte.quote || open == Byte.apostrophe {
                q += 1
                while q < bytes.endIndex && bytes[q] != open { q += 1 }
                return q < bytes.endIndex ? q + 1 : nil
            }
            let start = q
            while q < bytes.endIndex {
                let b = bytes[q]
                if Byte.isWhitespace(b) || b == Byte.quote || b == Byte.apostrophe || b == Byte.equals
                    || b == Byte.less || b == Byte.greater || b == Byte.backtick { break }
                q += 1
            }
            return q > start ? q : nil
        }
    }

    // MARK: - Tables

    /// A GFM table's header and delimiter row, read before its body.
    struct Table {
        let header: [String]
        let alignments: [ColumnAlignment]

        /// A table when `delimiter` is a delimiter row with as many cells as
        /// `header`. A delimiter row of dashes alone is a setext underline, which
        /// the parser asks about first.
        init?(header line: Line, delimiter: Line) {
            guard !line.lazy, !delimiter.lazy, delimiter.leading.columns < 4 else { return nil }
            let headerText = line.dropping(line.leading.columns).text
            let delimiterText = delimiter.dropping(delimiter.leading.columns).text
            let marks = Self.cells(delimiterText)
            var alignments: [ColumnAlignment] = []
            for mark in marks {
                guard let alignment = Self.alignment(mark) else { return nil }
                alignments.append(alignment)
            }
            let cells = Self.cells(headerText)
            guard !cells.isEmpty, cells.count == marks.count else { return nil }
            header = cells
            self.alignments = alignments
        }

        /// `:?-+:?`, and what it says.
        static func alignment(_ cell: String) -> ColumnAlignment? {
            let bytes = Array(cell.utf8)
            guard let first = bytes.first, let last = bytes.last else { return nil }
            let left = first == Byte.colon
            let right = last == Byte.colon && bytes.count > 1
            let inner = bytes.dropFirst(left ? 1 : 0).dropLast(right ? 1 : 0)
            guard !inner.isEmpty, inner.allSatisfy({ $0 == Byte.dash }) else { return nil }
            switch (left, right) {
            case (true, true): return .center
            case (true, false): return .left
            case (false, true): return .right
            case (false, false): return ColumnAlignment.none
            }
        }

        /// A row's cells: split on the pipes no backslash escapes, a leading and a
        /// trailing pipe optional, each cell trimmed, `\|` a pipe in its text.
        /// Given `columns`, a body row's cells past that count are NOT dropped,
        /// as GFM drops them: they stay in its last cell with the pipes between
        /// them, so no word of the row goes undrawn (a `|` inside a code span,
        /// `` `a||b` ``, is one; the spec's §7.5, difference D16).
        static func cells(_ row: String, columns: Int? = nil) -> [String] {
            var bytes = Array(row.utf8)[...]
            while let first = bytes.first, Byte.isBlank(first) { bytes = bytes.dropFirst() }
            while let last = bytes.last, Byte.isBlank(last) { bytes = bytes.dropLast() }
            if bytes.first == Byte.pipe { bytes = bytes.dropFirst() }
            if bytes.last == Byte.pipe {
                let before = bytes.index(before: bytes.endIndex)
                if before == bytes.startIndex || bytes[bytes.index(before: before)] != Byte.backslash {
                    bytes = bytes.dropLast()
                }
            }
            var out: [String] = []
            var cell: [UInt8] = []
            var p = bytes.startIndex
            while p < bytes.endIndex {
                let b = bytes[p]
                if b == Byte.backslash && p + 1 < bytes.endIndex && bytes[p + 1] == Byte.pipe {
                    cell.append(Byte.pipe)
                    p += 2
                    continue
                }
                if b == Byte.pipe, columns.map({ out.count + 1 < $0 }) ?? true {
                    out.append(Self.trimmed(cell))
                    cell = []
                } else {
                    cell.append(b)
                }
                p += 1
            }
            out.append(Self.trimmed(cell))
            return out
        }

        static func trimmed(_ bytes: [UInt8]) -> String {
            var slice = bytes[...]
            while let first = slice.first, Byte.isBlank(first) { slice = slice.dropFirst() }
            while let last = slice.last, Byte.isBlank(last) { slice = slice.dropLast() }
            return String(decoding: slice, as: UTF8.self)
        }

        /// The table and its body, within `MarkdownCaps.tableColumns`,
        /// `MarkdownCaps.tableRows`, `MarkdownCaps.cellCharacters` and the
        /// answer's `MarkdownCaps.cells`. NOTHING IS DROPPED: a table wider
        /// than the column cap, or whose header does not fit the cell budget,
        /// is its source as one plain block; the rows past the row cap or the
        /// budget are their source as one plain block right under the table.
        func pieces(rows: [Line], source: [Line], budget: inout MarkdownBlocks.Budget) -> [MarkdownBlock] {
            let columns = header.count
            let cellCap = MarkdownCaps.cells
            guard columns <= MarkdownCaps.tableColumns, budget.cells + columns <= cellCap else {
                return [.plain(source.map(\.text).joined(separator: "\n"))]
            }
            budget.cells += columns
            let rowCap = MarkdownCaps.tableRows
            let characterCap = MarkdownCaps.cellCharacters
            func fit(_ cells: [String]) -> [String] {
                (0..<columns).map { column in
                    let cell = column < cells.count ? cells[column] : ""
                    guard cell.count > characterCap else { return cell }
                    return Copy.cutShort(String(cell.prefix(characterCap)))
                }
            }
            var body: [[String]] = []
            for row in rows {
                guard body.count < rowCap, budget.cells + columns <= cellCap else { break }
                budget.cells += columns
                body.append(fit(Self.cells(row.dropping(row.leading.columns).text, columns: columns)))
            }
            let table = MarkdownBlock.table(MarkdownTable(alignments: alignments, header: fit(header), rows: body))
            guard body.count < rows.count else { return [table] }
            return [table, .plain(rows[body.count...].map(\.text).joined(separator: "\n"))]
        }
    }
}

private extension String {
    /// Without its trailing spaces and tabs.
    var trimmingTrailingBlanks: String {
        var end = utf8.endIndex
        while end > utf8.startIndex {
            let before = utf8.index(before: end)
            guard MarkdownBlocks.Byte.isBlank(utf8[before]) else { break }
            end = before
        }
        return String(self[..<end])
    }
}
