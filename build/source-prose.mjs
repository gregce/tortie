/**
 * source-prose.mjs. Blanking the prose in a TypeScript file so a scanner reads
 * only what the program does (Phase 296).
 *
 * ## Why this file exists
 *
 * `stripProse` was written inside `build/assert-menu-accelerators.mjs` in Phase
 * 156, and it has never missed a chord. Phase 296 needed the same reading of the
 * same file for a different question — where the Session menu's End Session row
 * is — because `build/handback-conformance-probe.mts` had been finding the
 * comment at `src/main/menu.ts:876` instead of the row, and calling that a
 * changed menu, since 25 August.
 *
 * Two modules needing one reading of one file is CLAUDE.md's growth guardrail
 * exactly: grep for an existing helper before writing one, and extract the
 * duplicated block rather than keep two. So the function moved here and neither
 * script owns it. `assert-menu-accelerators.mjs` re-exports it under its own
 * name so nothing that named it there has to change.
 *
 * ## Why this is not `stripComments` in build/scan-source.mjs
 *
 * That module has a stripper too, and it is the right one for the gates that
 * import it. It is the wrong one for these two, in both directions:
 *
 *   - It BLANKS REGULAR EXPRESSION BODIES. That is what its callers want, and it
 *     is a reading `assert-menu-accelerators.mjs` has never had. Changing the
 *     text a chord gate reads is not a thing to do in passing.
 *   - It LEAVES SUBSTITUTING TEMPLATE LITERALS ALONE. The chord gate has to
 *     blank those, and the reason is written at `checkLiterals`: `${...}` inside
 *     a template is not a chord, and the display strings the ⌘/ overlay builds
 *     live in them. A template with no substitution is kept, because a chord can
 *     be typed in one and Electron would register it.
 *
 * So this is the SECOND stripper in `build/`, not a third. Phase 296 refused to
 * write a new one and refused to widen either existing one into the other.
 *
 * ## The one change Phase 296 made to the lifted function
 *
 * NEWLINES ARE KEPT. The old function dropped a block comment whole, newlines
 * and all, and `src/main/menu.ts` holds 33 block comments. A caller that asks
 * "which line is this row on" would have been told a line number 200 short. The
 * output is now the same length as the input, character for character, so every
 * offset and every line number in the result still points at the same place in
 * the file.
 *
 * That cannot change what the chord gate finds. A quoted string is copied
 * through whole, so no quote character ever comes out of a comment, and the
 * literal patterns forbid a newline inside a literal. Blanking a comment down to
 * its own newlines therefore adds whitespace between code tokens and can never
 * join or invent a string literal. The reading was measured both ways in Phase
 * 296: `node build/assert-menu-accelerators.mjs` printed the same
 * `OK: 7 files, 36 accelerator sites` before and after.
 *
 * It spawns nothing, opens nothing and reads no file. Callers hand it text.
 */

/**
 * The source with comments and substituting template literals blanked out,
 * newlines kept, every other character in the same place it was.
 *
 * Chords are named in prose all over the menu files, and the whole reason the
 * literal pass in `assert-menu-accelerators.mjs` can be strict is that it never
 * reads a comment. A template literal that SUBSTITUTES goes too, because
 * `${...}` inside one is not a chord and the display strings the overlay builds
 * live in them. A template literal with no substitution is kept, because it is a
 * plain string in every way that matters here and a chord can be typed in one.
 *
 * A quoted string is copied through whole rather than read character by
 * character, so a backtick inside one cannot be mistaken for the start of a
 * template and blank the code that follows it. For the same reason a `//` or a
 * `/*` inside a string is not a comment.
 *
 * @param {string} source
 * @returns {string} the same text, the same length, with the prose blanked.
 */
export function stripProse(source) {
  /** Every character of a run replaced by a space, except its newlines. */
  const blank = (from, to) => {
    let out = '';
    for (let k = from; k < to; k += 1) out += source[k] === '\n' ? '\n' : ' ';
    return out;
  };

  let out = '';
  let i = 0;
  while (i < source.length) {
    const two = source.slice(i, i + 2);
    if (two === '//') {
      const end = source.indexOf('\n', i);
      const stop = end === -1 ? source.length : end;
      out += blank(i, stop);
      i = stop;
      continue;
    }
    if (two === '/*') {
      const end = source.indexOf('*/', i + 2);
      const stop = end === -1 ? source.length : end + 2;
      out += blank(i, stop);
      i = stop;
      continue;
    }
    const ch = source[i];
    if (ch === "'" || ch === '"') {
      let j = i + 1;
      while (j < source.length && source[j] !== ch && source[j] !== '\n') {
        if (source[j] === '\\') j += 1;
        j += 1;
      }
      if (j < source.length && source[j] === ch) {
        out += source.slice(i, j + 1);
        i = j + 1;
      } else {
        out += source.slice(i, j);
        i = j;
      }
      continue;
    }
    if (ch === '`') {
      let j = i + 1;
      while (j < source.length && source[j] !== '`') {
        if (source[j] === '\\') j += 1;
        j += 1;
      }
      const closed = j < source.length;
      const body = source.slice(i + 1, j);
      if (!closed || body.includes('${')) {
        out += blank(i, Math.min(j + 1, source.length));
      } else {
        out += source.slice(i, j + 1);
      }
      i = j + 1;
      continue;
    }
    out += ch;
    i += 1;
  }
  return out;
}
