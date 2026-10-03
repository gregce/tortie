// Every bound the answer's renderer keeps, in one place (Phase 316.6,
// build/p3166/SPEC.md §5.5.3; `conformance:ios` rule (y), clause y2).
//
// WHY THERE ARE CAPS AT ALL. An honest answer arrives already clipped by main
// to 4,000 characters (src/main/overview/turn-view.ts, `CLIP_CHARACTERS`), so
// at most about 12,000 UTF-8 bytes. These caps are the SECOND line, against a
// door that sends something else.
//
// NO HONEST ANSWER LOSES A WORD TO ONE. The first build cut a cell at 200
// characters, a table at 8 columns and 50 rows and a code line at 1,000, and
// both verifiers measured answers main had sent whole losing words the build
// before it drew (the fix round of 2026-10-01). So each cap is now one of two
// kinds:
//
//   ONE AN HONEST ANSWER CANNOT REACH: `answerBytes`, `cellCharacters`,
//   `fenceLines`, `lineCharacters`. Each is past main's 4,000 characters, so
//   only a door that broke its promise has anything cut or counted by it.
//
//   ONE AN HONEST ANSWER CAN REACH: `blocks`, `depth`, `inlineBytes`,
//   `tableRows`, `tableColumns`, `cells`, `listNumberDigits`, `linkBytes`,
//   `pieces`. What is past it is still DRAWN, as the characters the agent
//   wrote: one plain block, a run drawn verbatim, a marker left as text, a
//   link left as its words, the whole answer as written. That is how the
//   build before this one drew every answer, so nothing is drawn less.
//
// `pieces` IS THE PAGE'S CAP (the ruled round of 2026-10-01). Every block,
// item and cell is a view of its own, and a page holds twenty answers, three
// pages once he has paged back; past it an answer is not drawn as blocks at
// all (Markdown/Rendered.swift's weights; the spec's "As built, the ruled
// round" has the table).
//
// MARKDOWN IS OFF (his ruling of 2026-10-02, "Ship tabs + Settings, markdown
// off"). `pieces` is 0, so every answer, an empty one included, is drawn
// through `Inline.asWritten` and `WrittenView`, exactly as the build before
// this phase drew it (the reverify measured that drawing equal to 28d89295's
// AnswerText, attribute for attribute). This module stays in the tree, parsed
// and tested but unused for drawing, for a later phase that draws the
// conversation lazily to switch back on (the spec's "As built, markdown off").
//
// THE SHAPE, which rule (y) reads as text: one enum, thirteen `static let`
// integer literals, and each member read at exactly ONE place in the app
// outside this file, so a cap has one meaning and one consequence. The table
// of where each is read and what happens past it is the spec's §5.5.3.
//
// Foundation only, like the rest of the parser.

import Foundation

enum MarkdownCaps {
    /// The answer's UTF-8 bytes. Past it, the answer ends with
    /// `Copy.restNotShown`. 2.7 times the honest maximum; the spec step
    /// measured Foundation's inline parse at about 40 ms for 64 KiB.
    static let answerBytes = 32_768

    /// Blocks in one answer, a list item counted as one. Past it, the
    /// remaining source lines are ONE plain block, drawn as their characters.
    static let blocks = 400

    /// How deep quotes and list items nest. At this depth no container opens,
    /// and a `>` or a list marker is the paragraph's own characters.
    static let depth = 8

    /// One inline run's UTF-8 bytes. Past it, the run is drawn verbatim and
    /// whole, and never handed to Foundation's parser.
    static let inlineBytes = 8_192

    /// A table's body rows. The rows past it are drawn as their characters,
    /// one plain block right under the table.
    static let tableRows = 50

    /// A table's columns. A wider table is drawn as its characters, one plain
    /// block.
    static let tableColumns = 64

    /// One cell's characters, past main's clip. The cell's source is cut
    /// there, `Copy.cutShort`.
    static let cellCharacters = 4_096

    /// Cells in one answer, header cells included. The rows of the table the
    /// budget runs out in are drawn as their characters, one plain block
    /// under it; a table whose header cannot fit is one plain block of its
    /// source.
    static let cells = 1_000

    /// A code block's lines, past what main's clip can hold. The lines past it
    /// are counted.
    static let fenceLines = 4_096

    /// One code line's characters, past main's clip. The line is cut there,
    /// `Copy.cutShort`.
    static let lineCharacters = 4_096

    /// An ordered list item's number. A tenth digit makes the line a
    /// paragraph, which is CommonMark's own rule.
    static let listNumberDigits = 9

    /// A link's address, in bytes. A longer one is not pressable.
    static let linkBytes = 2_048

    /// Pieces one answer may draw as blocks, weighed by what each costs to
    /// draw (`RenderedAnswer.pieces`). Past it, the WHOLE answer is drawn as
    /// the build before this one drew it, one text, every word and no link
    /// (`RenderedAnswer.written`).
    ///
    /// 0: MARKDOWN OFF, his ruling of 2026-10-02 ("Ship tabs + Settings,
    /// markdown off"). Every parse holds at least one block, an empty answer
    /// one empty paragraph, so every answer is past it and drawn as written.
    /// The ruled round's 26 (the densest real answer committed here) still
    /// cost a page of real prose dense in inline code 3.2 times the memory
    /// and a page of images 50 to 76 times (the reverify of 2026-10-02). A
    /// later phase that draws the conversation lazily switches markdown back
    /// on by moving this number, and `conformance:ios` y2 pins it at 0 until
    /// then.
    static let pieces = 0
}
