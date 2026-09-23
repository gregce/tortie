// The agent's answer, drawn as inline markdown (Phase 316.2).
//
// HIS RULING, and the desktop's since Phase 137.1: the ANSWER renders as
// markdown, because agents answer in markdown, and the ASK stays plain text,
// because rendering a person's words would change what they wrote. The ask is
// never passed here: it is `Text(verbatim:)` in ConversationScreen.swift, and
// `conformance:ios` rule (h) holds that it reaches nothing else.
//
// WHAT "INLINE MARKDOWN ONLY" MEANS HERE (build/p316/SPEC.md S2, the
// conversation screen):
//
//   - `AttributedString(markdown:)` with `.inlineOnlyPreservingWhitespace`:
//     bold, italic, code and strikethrough, and every space and line break the
//     agent wrote kept where it wrote it. No block parsing, so a list or a
//     fence is drawn as the characters that make it, exactly where they are.
//   - NO HTML PATH. Foundation's markdown parser builds no HTML and loads
//     nothing; an HTML tag in an answer is text.
//   - A LINK IS DRAWN AS ITS WORDS AND NEVER OPENED. An answer is somebody
//     else's bytes read over a network, and a tap on a read-only screen must
//     not hand the phone a URL an agent wrote. Every `link` and `imageURL`
//     attribute is removed; the words stay.
//   - A text the parser refuses is drawn verbatim, never dropped.
//
// Nothing here clips: main already clipped the answer to 4,000 characters, and
// a second cap would be a second place the truth about what he sees lives.

import SwiftUI

enum AnswerMarkdown {
    static var options: AttributedString.MarkdownParsingOptions {
        AttributedString.MarkdownParsingOptions(
            allowsExtendedAttributes: false,
            interpretedSyntax: .inlineOnlyPreservingWhitespace,
            failurePolicy: .returnPartiallyParsedIfPossible
        )
    }

    /// The answer as the screen draws it.
    static func render(_ answer: String) -> AttributedString {
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
}

/// The agent's words, drawn as inline markdown in the body face.
struct AnswerText: View {
    let answer: String
    var color: Color = Tokens.textPrimary

    var body: some View {
        Text(AnswerMarkdown.render(answer))
            .font(Face.body.font)
            .foregroundStyle(color)
            .lineSpacing(Face.body.spacing)
            .fixedSize(horizontal: false, vertical: true)
            .frame(maxWidth: .infinity, alignment: .leading)
    }
}
