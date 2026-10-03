// The agent's answer, drawn as inline markdown, as written (Phase 316.2; the
// blocks Phase 316.6 built are switched off, his ruling of 2026-10-02).
//
// HIS RULING, and the desktop's since Phase 137.1: the ANSWER renders as
// markdown, because agents answer in markdown, and the ASK stays plain text,
// because rendering a person's words would change what they wrote. The ask is
// never passed here: it is `Text(verbatim:)` in ConversationScreen.swift, and
// `conformance:ios` rule (h) holds that it reaches nothing else.
//
// WHAT IS DRAWN. MARKDOWN IS OFF (his ruling of 2026-10-02, "Ship tabs +
// Settings, markdown off"; build/p3166/SPEC.md "As built, markdown off"):
// every answer is drawn exactly as 316.2 drew it, `RenderedAnswer.written`
// drawn by `WrittenView`, which the reverify measured equal to 28d89295's
// rendering attribute for attribute:
//
//   - Foundation's inline markdown with `.inlineOnlyPreservingWhitespace`:
//     bold, italic, code and strikethrough, and every space and line break the
//     agent wrote kept where it wrote it. A heading, a list or a table is
//     drawn as the characters that make it, and a fence's backticks make a
//     code span, as they did in 316.2.
//   - NO HTML PATH. Nothing builds or interprets HTML and nothing is
//     fetched; an HTML tag in an answer is its characters.
//   - A LINK IS DRAWN AS ITS WORDS AND NEVER OPENED, as 316.2 said: every
//     link and image address is removed (`Inline.asWritten`), so nothing in an
//     answer can be pressed or fetched.
//   - A text the parser refuses is drawn verbatim, never dropped.
//
// The block parser, the drawing of blocks and the one way out
// (Markdown/Links.swift) stay in the tree, unused for drawing, for the later
// phase that draws the conversation lazily and switches markdown back on
// (Markdown/Caps.swift, `MarkdownCaps.pieces`).
//
// The parse happened once, before anything is drawn (`RenderedAnswer`, made
// by `SessionDrawing` and `ConversationModel`). Main already clipped the
// answer to 4,000 characters; `MarkdownCaps` is the second line, against a
// door that sends something else.

import SwiftUI

/// The agent's words, drawn as written (markdown off): one element,
/// `md-<scope>-0` (Screens/Identifiers.swift).
struct AnswerText: View {
    let answer: RenderedAnswer
    let scope: String

    var body: some View {
        MarkdownView(answer: answer, scope: scope)
    }
}
