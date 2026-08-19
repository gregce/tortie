# Research 57. Terminal font glyph coverage, and where the two notes went

Phase 87 deleted two notes from Settings then Appearance. This file is where they went. Nothing was
destroyed and nothing was re-measured. Both notes are reproduced below word for word, and the
measurements behind them come from Phase 78.

## 0. Why this file exists

The Font card in Settings then Appearance carried four notes under one dropdown. Two of them told a
person what to do. Two of them recorded a measurement that no pick on that card changes. A person
opening the card is choosing a face, and a measurement they cannot act on is not a thing they need
at that moment. Phase 87 kept the two notes a person acts on and moved the two measurements here.

The measurements are still true as far as anyone knows. Phase 87 did not re-measure them. It moved
strings.

## 1. The two notes, verbatim as they were drawn

These are the exact strings that stood in `src/renderer/settings/AppearanceSection.tsx` from Phase 78
until Phase 87. Each was drawn in a `<span className="set-row-caption">` inside a `set-row` on the
Font card.

**Note one, Source Code Pro.**

> Source Code Pro is missing three of the marks agents print. The first is the cross at U+2717. The
> second is the arrow at U+279C. The third is the warning at U+26A0. Menlo draws each one instead,
> 12.5 percent taller than the letters beside it. The column grid does not move.

**Note two, Apple Braille.**

> Agent spinners are drawn from Apple Braille under all three options. No monospace font on this Mac
> has those marks, so nothing here changes them.

## 2. Where the numbers came from

Both notes were written in Phase 78, which shipped the three font presets at commit `7b429d5` and
version 0.36.0. The measurements are recorded in the Phase 78 backlog entry at
`docs/BACKLOG.md`, in the Phase 78 entry for the three font presets.

The two facts that carry a number are these.

- Source Code Pro regular and bold are missing U+2717, U+279C and U+26A0. When one of those falls
  back to Menlo inside a Source Code Pro line, the Menlo glyph is taller. Menlo's x-height is
  0.5469 em against Source Code Pro's 0.4860 em, a ratio of 1.1252. That is where the 12.5 percent
  in note one comes from. The advance width matches, so the column grid holds and only the height
  differs.
- No monospace face on this Mac has any of the 256 braille codepoints. None of the eight candidates
  Phase 78 measured has any, and neither does the Nerd Font symbols file. `Apple Braille.ttf` has all
  256, so macOS draws agent spinners from it whichever preset is chosen. No font preset changes that.
  Phase 78 recorded the fix as an xterm.js upgrade and left it to its own phase.

## 3. What is not true here

- Phase 87 did not re-measure either fact. It moved two strings out of a dropdown and into this file.
  If a later round wants a current number, it has to measure again.
- Phase 78's coverage answers came from rendering tests in a real renderer rather than from reading a
  font's `cmap` table. The Phase 78 entry says so itself, and that limit carries over to everything
  above.
- The three presets themselves are unchanged by Phase 87. The Font card offers the same three faces
  it offered before, and it still sets no size.
