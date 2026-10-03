// One run of the answer's inline text: emphasis, code, strikethrough and links
// (Phase 316.6, build/p3166/SPEC.md §5.5.4).
//
// FOUNDATION PARSES IT, HERE AND NOWHERE ELSE. This file holds the app's one
// `AttributedString(markdown:` (`conformance:ios` rule (y), clause y6), with
// exactly the options 316.2 chose:
//
//   allowsExtendedAttributes: false     no `^[…](inflect: true)` attribute is
//                                       applied (Foundation still takes the
//                                       syntax and keeps its words, §3 row 2)
//   .inlineOnlyPreservingWhitespace     no block parsing, which Blocks.swift
//                                       did, and every space and line break
//                                       kept where the agent wrote it
//   .returnPartiallyParsedIfPossible    a text it half reads is still drawn
//
// A run longer than `MarkdownCaps.inlineBytes`, or one Foundation refuses, is
// drawn VERBATIM and whole: its words are never dropped.
//
// AN ANSWER TOO HEAVY TO DRAW AS BLOCKS (`MarkdownCaps.pieces`) goes through
// the same parse WHOLE, as the build before this one drew every answer:
// `asWritten`, every link and image address removed (the ruled round). Since
// his ruling of 2026-10-02 (markdown off) the cap is 0, so EVERY answer is
// drawn through `asWritten`, and `render` serves the parse that stays in the
// tree for a later phase.
//
// THEN EACH RUN IS WALKED ONCE:
//
//   an image   becomes `.image(alt:)`: its words, and nothing else. The URL is
//              dropped here and never kept, so nothing can ever fetch it.
//   a link     keeps its address only when `LinkPolicy.pressable` says so
//              (Links.swift); otherwise the address is removed and the words
//              stay, so a bare URL, an autolink and `www.` draw as words.
//
// Foundation only. `Copy` and `LinkPolicy` are this module's own.

import Foundation

/// A run of inline text, ready to draw.
struct InlineText: Equatable, Sendable {
    let segments: [InlineSegment]

    /// What it says, an image as its words or `Copy.image`: an accessibility
    /// label, and the text the outline compares.
    var plain: String {
        segments.map { segment in
            switch segment {
            case .text(let text): String(text.characters)
            case .image(let alt): alt.isEmpty ? Copy.image : alt
            }
        }.joined()
    }

    var hasImage: Bool {
        segments.contains { segment in
            if case .image = segment { return true }
            return false
        }
    }
}

enum InlineSegment: Equatable, Sendable {
    /// Words, with Foundation's inline intents and, when the policy allowed
    /// it, a link.
    case text(AttributedString)
    /// An image the phone never loads: its words only.
    case image(alt: String)
}

enum Inline {
    typealias LinkKey = AttributeScopes.FoundationAttributes.LinkAttribute
    typealias ImageKey = AttributeScopes.FoundationAttributes.ImageURLAttribute

    /// Foundation's inline parse with exactly 316.2's three options: the
    /// app's ONE `AttributedString(markdown:` (rule (y), clause y6), which a
    /// run and an answer drawn as written both go through. Nil when
    /// Foundation refuses the text.
    private static func parsed(_ source: String) -> AttributedString? {
        let options = AttributedString.MarkdownParsingOptions(
            allowsExtendedAttributes: false,
            interpretedSyntax: .inlineOnlyPreservingWhitespace,
            failurePolicy: .returnPartiallyParsedIfPossible
        )
        return try? AttributedString(markdown: source, options: options)
    }

    /// One run, parsed once.
    static func render(_ source: String) -> InlineText {
        guard source.utf8.count <= MarkdownCaps.inlineBytes,
              var drawn = parsed(definitionKept(source)) else {
            return InlineText(segments: [.text(AttributedString(source))])
        }
        // A link's words may span several runs; it is judged whole.
        var unlinked: [Range<AttributedString.Index>] = []
        for (link, range) in drawn.runs[LinkKey.self] {
            guard let link else { continue }
            if !LinkPolicy.pressable(link, words: String(drawn[range].characters)) {
                unlinked.append(range)
            }
        }
        for range in unlinked {
            drawn[range][LinkKey.self] = nil
        }
        var segments: [InlineSegment] = []
        for (image, range) in drawn.runs[ImageKey.self] {
            if image != nil {
                // An image with no words comes back as U+FFFC alone.
                let alt = String(drawn[range].characters.filter { $0 != "\u{FFFC}" })
                segments.append(.image(alt: alt))
            } else {
                segments.append(.text(AttributedString(drawn[range])))
            }
        }
        return InlineText(segments: segments)
    }

    /// A WHOLE ANSWER DRAWN AS THE BUILD BEFORE THIS ONE DREW IT (the ruled
    /// round of 2026-10-01): `AnswerMarkdown.render` of `28d89295`'s
    /// Screens/AnswerText.swift, statement for statement. One inline parse of
    /// the whole answer, every space and line break where the agent wrote it,
    /// and EVERY link and image address removed, so nothing in it can be
    /// pressed or fetched; the words stay. A text Foundation refuses is drawn
    /// verbatim. `RenderedAnswer` takes this path for an answer with more
    /// pieces than `MarkdownCaps.pieces`, which no page of them can afford.
    static func asWritten(_ answer: String) -> AttributedString {
        guard var drawn = parsed(answer) else {
            return AttributedString(answer)
        }
        let opened = drawn.runs.compactMap { run in
            run[LinkKey.self] == nil && run[ImageKey.self] == nil ? nil : run.range
        }
        for range in opened {
            drawn[range][LinkKey.self] = nil
            drawn[range][ImageKey.self] = nil
        }
        return drawn
    }

    /// The run with its first `[` escaped when it opens with `[label]:`.
    /// Foundation still reads a link reference definition at the start of an
    /// inline run, a title after it, and drops it whole, words and all
    /// (measured: `[a]: /b "c"` draws nothing). The parser does not recognise
    /// definitions (the spec's §7.5, D2), so their characters are drawn; the
    /// escape changes no character a person sees.
    static func definitionKept(_ source: String) -> String {
        typealias Byte = MarkdownBlocks.Byte
        let bytes = source.utf8
        var p = bytes.startIndex
        while p < bytes.endIndex && (bytes[p] == Byte.space || bytes[p] == Byte.tab) { p = bytes.index(after: p) }
        guard p < bytes.endIndex, bytes[p] == Byte.openBracket else { return source }
        let open = p
        p = bytes.index(after: p)
        while p < bytes.endIndex {
            let b = bytes[p]
            if b == Byte.backslash {
                p = bytes.index(after: p)
                if p < bytes.endIndex { p = bytes.index(after: p) }
                continue
            }
            if b == Byte.openBracket { return source }
            if b == Byte.closeBracket {
                let after = bytes.index(after: p)
                guard after < bytes.endIndex, bytes[after] == Byte.colon else { return source }
                return String(source[..<open]) + "\\" + String(source[open...])
            }
            p = bytes.index(after: p)
        }
        return source
    }
}
