// The agent's answer, drawn from its parsed blocks (Phase 316.6,
// build/p3166/SPEC.md §5.5.6 and §5.5.7; docs/design/phone/Conversation.html).
//
// EVERY BLOCK AND EVERY CELL IS ITS OWN `Text` and its own accessibility
// element, so a bidi override in one cannot reorder a neighbour, and a UI test
// reads each by name: a block is `md-<scope>-<n>`, a cell
// `md-<scope>-<n>-r<i>c<j>` (row 0 the header), an item's mark
// `md-<scope>-<n>-mark`, a code block's counted note `md-<scope>-<n>-more`, and the line
// when the answer was cut `md-<scope>-rest` (Screens/Identifiers.swift). `n`
// was given with the parse (Markdown/Rendered.swift); nothing here counts.
// A leaf's label is the characters it draws; a container's is empty.
//
// THE AGENT'S WORDS reach the screen only as `Text(verbatim:)` or as
// `Text(attributed)` of the `AttributedString` Markdown/Inline.swift built,
// never as a `LocalizedStringKey`, so `%@` draws as it was written
// (`conformance:ios` rule (y), clauses y7 and y8). An image is the `photo`
// symbol and its words, and its address was dropped before it got here: the
// phone never fetches, shows or keeps one. A link is drawn in the root's tint
// and pressing it reaches the one gate in Markdown/Links.swift.
//
// THE FRAMES are Conversation.html's: blocks 8 apart, a heading 12 below what
// is above it, a list's mark in a 12 pt column 8 from its content and items 4
// apart, code and tables scrolling sideways, a quote's 1 pt rule in
// `--border-strong` 12 to the left of its words, a table's cells `6px 12px`
// with a 1 pt border and its header row semibold on the sidebar's ground.
//
// NOTHING WRITTEN IS HIDDEN (the fix round). A bullet item's mark is the
// bullet the agent wrote, `-`, `+` or `*`, so an unfenced diff keeps which line
// went and which came; and a cell has no line limit, so a line or paragraph
// separator inside it shows what is after it rather than clipping it.
//
// AN ANSWER TOO HEAVY TO DRAW AS BLOCKS (the ruled round): one whose parse
// holds more than `MarkdownCaps.pieces` blocks, items and cells is drawn by
// `WrittenView`, exactly as the build before this one drew it, one `Text`,
// every word and no link (Markdown/Rendered.swift says why).
//
// MARKDOWN IS OFF (his ruling of 2026-10-02): the cap is 0, so EVERY answer is
// drawn by `WrittenView` and nothing below it is reached. `BlockList` and the
// rest stay, unused, for the later phase that draws the conversation lazily
// and switches markdown back on (Markdown/Caps.swift).
//
// RECURSION. A quote and a list item hold blocks, so `BlockList` draws
// itself one level deeper; it holds `depth` and passes `depth: depth + 1`
// (rule (y), clause y5). The parse already bounded the depth.

import SwiftUI

/// What `AnswerText` draws: the blocks, then the line when the answer was cut.
struct MarkdownView: View {
    let answer: RenderedAnswer
    /// `last` on the Session screen, the turn's index in the conversation.
    let scope: String

    var body: some View {
        VStack(alignment: .leading, spacing: MarkdownLook.blockGap) {
            if let written = answer.written {
                WrittenView(attributed: written)
                    .accessibilityIdentifier(ID.md(scope, 0))
            } else {
                BlockList(blocks: answer.blocks, scope: scope, depth: 0)
            }
            if answer.cut {
                Words(Copy.restNotShown, .small, Tokens.textMuted, lines: nil)
                    .accessibilityIdentifier(ID.mdRest(scope))
            }
        }
        .font(Face.body.font)
        .foregroundStyle(Tokens.textPrimary)
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

/// AN ANSWER TOO HEAVY TO DRAW AS BLOCKS (`MarkdownCaps.pieces`), drawn
/// EXACTLY as the build before this one drew every answer (`28d89295`'s
/// `AnswerText`): one `Text` of the whole answer, in the body face, its
/// colour, its line spacing, wrapping to the column's width. It is ONE
/// element, `md-<scope>-0`, whose label is every word it draws.
private struct WrittenView: View {
    let attributed: AttributedString

    var body: some View {
        Text(attributed)
            .font(Face.body.font)
            .foregroundStyle(Tokens.textPrimary)
            .lineSpacing(Face.body.spacing)
            .fixedSize(horizontal: false, vertical: true)
            .frame(maxWidth: .infinity, alignment: .leading)
    }
}

// MARK: - The numbers (Conversation.html)

private enum MarkdownLook {
    /// `.md > * + * { margin-top: 8px }`.
    static let blockGap: CGFloat = 8
    /// A heading sits 12 below what is above it: the gap and these 4.
    static let headingExtra: CGFloat = 4
    /// A thematic break has 12 above and below it: the gap and these 4.
    static let ruleExtra: CGFloat = 4
    /// `.mark { width: 12px }` (a minimum: a number may be wider),
    /// `.li { gap: 8px }`, items `margin-top: 4px`.
    static let markWidth: CGFloat = 12
    static let markGap: CGFloat = 8
    static let itemGap: CGFloat = 4
    /// `.quote { padding-left: 12px }`, after its 1 pt rule.
    static let quoteInset: CGFloat = 12
    /// `.fence { border-radius: 6px; padding: 12px }`.
    static let codeRadius: CGFloat = 6
    static let codePadding: CGFloat = 12
    /// `th, td { padding: 6px 12px }`; neighbouring borders overlap, as
    /// `border-collapse` draws them.
    static let cellVertical: CGFloat = 6
    static let cellHorizontal: CGFloat = 12
    static let cellOverlap: CGFloat = -1
    /// A note under a code block.
    static let noteGap: CGFloat = 4

    static let h1 = Face(20, .semibold, line: 25)
    static let h2 = Face(17, .semibold, line: 22)
    static let h3 = Face(15, .semibold, line: 20)
    /// Code, raw HTML, a cell: 15/20.
    static let small = Face(15, line: 20)
    static let header = Face(15, .semibold, line: 20)

    static var mono: Font { Font.system(size: small.size, design: .monospaced) }

    static func heading(_ level: Int) -> Face {
        switch level {
        case 1: h1
        case 2: h2
        default: h3
        }
    }

    /// SF Symbols, never drawn words.
    static let photo = "photo"
    static let openTask = "square"
    static let doneTask = "checkmark.square"
    /// Between an image's symbol and its words (`.img { gap: 6px }`).
    static let imageGap = " "
}

// MARK: - Blocks

/// One container's blocks. Draws itself again for a quote's and an item's.
private struct BlockList: View {
    let blocks: [RenderedBlock]
    let scope: String
    let depth: Int

    var body: some View {
        VStack(alignment: .leading, spacing: MarkdownLook.blockGap) {
            ForEach(blocks) { block in
                drawn(block, first: block.n == blocks.first?.n)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    @ViewBuilder
    private func drawn(_ block: RenderedBlock, first: Bool) -> some View {
        let id = ID.md(scope, block.n)
        switch block.kind {
        case .heading(let level, let text):
            InlineView(text: text, face: MarkdownLook.heading(level))
                .accessibilityAddTraits(.isHeader)
                .accessibilityIdentifier(id)
                .padding(.top, first ? 0 : MarkdownLook.headingExtra)
        case .paragraph(let text):
            InlineView(text: text, face: Face.body)
                .accessibilityIdentifier(id)
        case .code(let lines, _, let moreLines):
            CodeView(lines: lines, note: RenderedBlock.codeNote(moreLines), id: id, noteID: ID.mdMore(scope, block.n))
        case .list(_, _, let items):
            VStack(alignment: .leading, spacing: MarkdownLook.itemGap) {
                ForEach(items) { item in
                    HStack(alignment: .firstTextBaseline, spacing: MarkdownLook.markGap) {
                        ItemMark(item: item)
                            .accessibilityIdentifier(ID.mdMark(scope, item.n))
                        BlockList(blocks: item.blocks, scope: scope, depth: depth + 1)
                    }
                    .accessibilityElement(children: .contain)
                    .accessibilityIdentifier(ID.md(scope, item.n))
                }
            }
            .accessibilityElement(children: .contain)
            .accessibilityIdentifier(id)
        case .quote(let inner):
            BlockList(blocks: inner, scope: scope, depth: depth + 1)
                .foregroundStyle(Tokens.textSecondary)
                .padding(.leading, MarkdownLook.quoteInset)
                .overlay(alignment: .leading) {
                    Rectangle()
                        .fill(Tokens.borderStrong)
                        .frame(width: Frame.hairline)
                        .accessibilityHidden(true)
                }
                .accessibilityElement(children: .contain)
                .accessibilityIdentifier(id)
        case .rule:
            Hairline()
                .padding(.vertical, MarkdownLook.ruleExtra)
                .accessibilityElement()
                .accessibilityIdentifier(id)
        case .table(let table):
            TableView(table: table, scope: scope, n: block.n)
        case .html(let text):
            Text(verbatim: text)
                .font(MarkdownLook.mono)
                .foregroundStyle(Tokens.textSecondary)
                .lineSpacing(MarkdownLook.small.spacing)
                .fixedSize(horizontal: false, vertical: true)
                .frame(maxWidth: .infinity, alignment: .leading)
                .accessibilityIdentifier(id)
        case .plain(let text):
            Text(verbatim: text)
                .font(Face.body.font)
                .lineSpacing(Face.body.spacing)
                .fixedSize(horizontal: false, vertical: true)
                .frame(maxWidth: .infinity, alignment: .leading)
                .accessibilityIdentifier(id)
        }
    }
}

// MARK: - Inline text

/// A heading's, a paragraph's or a cell's words. A text holding an image is
/// labelled by its words, the image's alt in its place; one with none keeps
/// SwiftUI's own label, so its links stay links to VoiceOver and XCUITest.
private struct InlineView: View {
    let text: InlineText
    let face: Face
    var alignment: TextAlignment = .leading

    var body: some View {
        let drawn = InlineDrawing.text(text)
            .font(face.font)
            .lineSpacing(face.spacing)
            .multilineTextAlignment(alignment)
            .fixedSize(horizontal: false, vertical: true)
        if text.hasImage {
            drawn.accessibilityLabel(Text(verbatim: text.plain))
        } else {
            drawn
        }
    }
}

enum InlineDrawing {
    /// The segments as one `Text`: words with their intents, an inline code
    /// run in the monospaced face at 15 on `--bg-raised`, and an image as the
    /// `photo` symbol in `--text-muted` then its words in `--text-secondary`.
    static func text(_ inline: InlineText) -> Text {
        var out = Text(verbatim: "")
        for segment in inline.segments {
            switch segment {
            case .text(let words):
                let attributed = styled(words)
                out = out + Text(attributed)
            case .image(let alt):
                out = out
                    + Text(Image(systemName: MarkdownLook.photo)).foregroundStyle(Tokens.textMuted)
                    + Text(verbatim: MarkdownLook.imageGap + (alt.isEmpty ? Copy.image : alt)).foregroundStyle(Tokens.textSecondary)
            }
        }
        return out
    }

    /// Inline code drawn as Conversation.html's `.md code`. The words and
    /// every other run are untouched.
    static func styled(_ words: AttributedString) -> AttributedString {
        typealias Intent = AttributeScopes.FoundationAttributes.InlinePresentationIntentAttribute
        typealias FontKey = AttributeScopes.SwiftUIAttributes.FontAttribute
        typealias GroundKey = AttributeScopes.SwiftUIAttributes.BackgroundColorAttribute
        var attributed = words
        for (intent, range) in words.runs[Intent.self] {
            guard let intent, intent.contains(.code) else { continue }
            attributed[range][FontKey.self] = MarkdownLook.mono
            attributed[range][GroundKey.self] = Tokens.bgRaised
        }
        return attributed
    }
}

// MARK: - Lists

/// An item's mark: the bullet the agent wrote, the number the agent wrote
/// (never a counted one, difference D17), or a task's box, all in
/// `--text-secondary`, in a 12 pt column.
private struct ItemMark: View {
    let item: RenderedItem

    var body: some View {
        mark
            .font(Face.body.font)
            .foregroundStyle(Tokens.textSecondary)
            .lineLimit(1)
            .frame(minWidth: MarkdownLook.markWidth, alignment: .leading)
            .fixedSize()
    }

    private var mark: Text {
        if let task = item.task {
            return Text(Image(systemName: task == .done ? MarkdownLook.doneTask : MarkdownLook.openTask))
        }
        if let number = item.number {
            return Text(verbatim: Copy.orderedMark(number))
        }
        return Text(verbatim: item.bullet)
    }
}

// MARK: - Code

/// A code block: unhighlighted, monospaced 15/20 on `--bg-raised`, scrolling
/// sideways, its info string not drawn; the lines past the cap counted under it.
private struct CodeView: View {
    let lines: [String]
    let note: String?
    let id: String
    let noteID: String

    /// The lines as they are drawn, one under another.
    private var drawn: String { lines.joined(separator: "\n") }

    var body: some View {
        VStack(alignment: .leading, spacing: MarkdownLook.noteGap) {
            ScrollView(.horizontal) {
                Text(verbatim: drawn)
                    .font(MarkdownLook.mono)
                    .lineSpacing(MarkdownLook.small.spacing)
                    .fixedSize(horizontal: true, vertical: true)
                    .padding(MarkdownLook.codePadding)
                    .accessibilityIdentifier(id)
            }
            .scrollIndicators(.hidden)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(
                RoundedRectangle(cornerRadius: MarkdownLook.codeRadius, style: .continuous)
                    .fill(Tokens.bgRaised)
            )
            if let note {
                Words(note, .small, Tokens.textMuted, lines: nil)
                    .accessibilityIdentifier(noteID)
            }
        }
    }
}

// MARK: - Tables

/// A GFM table in a `Grid` that scrolls sideways. What did not fit is the
/// plain block the parser put under it, so nothing is counted here.
private struct TableView: View {
    let table: RenderedTable
    let scope: String
    let n: Int

    var body: some View {
        ScrollView(.horizontal) {
            Grid(alignment: .topLeading, horizontalSpacing: MarkdownLook.cellOverlap, verticalSpacing: MarkdownLook.cellOverlap) {
                GridRow {
                    ForEach(Array(table.header.enumerated()), id: \.offset) { column, cell in
                        CellView(text: cell, header: true, alignment: alignment(column))
                            .accessibilityIdentifier(ID.mdCell(scope, n, row: 0, column: column))
                    }
                }
                ForEach(Array(table.rows.enumerated()), id: \.offset) { row, cells in
                    GridRow {
                        ForEach(Array(cells.enumerated()), id: \.offset) { column, cell in
                            CellView(text: cell, header: false, alignment: alignment(column))
                                .accessibilityIdentifier(ID.mdCell(scope, n, row: row + 1, column: column))
                        }
                    }
                }
            }
        }
        .scrollIndicators(.hidden)
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier(ID.md(scope, n))
    }

    private func alignment(_ column: Int) -> ColumnAlignment {
        column < table.alignments.count ? table.alignments[column] : ColumnAlignment.none
    }
}

/// One cell, `padding: 6px 12px` inside a 1 pt `--border`; a header cell
/// semibold on `--bg-sidebar`. The horizontal scroll proposes no width, so a
/// cell is as wide as its words and never wraps them; and it has NO line limit,
/// so a U+2028, U+2029 or U+0085 inside it draws a second line instead of
/// hiding everything after it (the fix round: one did, at 49 pt of 218).
private struct CellView: View {
    let text: InlineText
    let header: Bool
    let alignment: ColumnAlignment

    var body: some View {
        InlineView(text: text, face: header ? MarkdownLook.header : MarkdownLook.small, alignment: textAlignment)
            .padding(.vertical, MarkdownLook.cellVertical)
            .padding(.horizontal, MarkdownLook.cellHorizontal)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: frameAlignment)
            .background {
                if header { Tokens.bgSidebar }
            }
            .overlay(Rectangle().strokeBorder(Tokens.border, lineWidth: Frame.hairline).accessibilityHidden(true))
    }

    private var textAlignment: TextAlignment {
        switch alignment {
        case .center: .center
        case .right: .trailing
        case .none, .left: .leading
        }
    }

    private var frameAlignment: Alignment {
        switch alignment {
        case .center: .top
        case .right: .topTrailing
        case .none, .left: .topLeading
        }
    }
}
