/**
 * A name as a person can read it back (Phase 274.3, build/p352/SPEC.md D5).
 *
 * Two file names can draw identically and name different files: `notes.md`
 * with a zero-width space (U+200B) before the dot and without one, or
 * `my notes.md` with a non-breaking space (U+00A0) and with a plain one. A
 * refusal that quotes either teaches the person nothing, and a right-to-left
 * override (U+202E) makes `"invoice<RLO>dm.exe" is no longer there.` draw
 * backwards. Measured over the shipping sentences on 2026-11-02 (SPEC §2.4):
 * every one of them carried the character raw.
 *
 * So a name put into a sentence a person reads passes through here, and every
 * character with no glyph of its own is written out as its code, `<U+200B>`:
 * uppercase hex, at least four digits. The set is the union of four classes,
 * named by property rather than listed, so a character Unicode adds to one of
 * them later is written out without another round (Phase 206 measured what a
 * hand-written list misses, in src/shared/settings.ts):
 *
 *   - `Default_Ignorable_Code_Point`: the zero-width characters, the bidi
 *     controls, the byte order mark, the soft hyphen, the variation selectors,
 *     the tag block and the Hangul fillers;
 *   - `Cc`: the control characters, tab and newline among them;
 *   - `Zl` and `Zp`: U+2028 and U+2029;
 *   - `Zs` other than U+0020: every space that is not the space bar's.
 *
 * TWO EXCEPTIONS keep an emoji drawing as the emoji, because in them the
 * invisible character IS the glyph: a zero-width joiner (U+200D) between two
 * pictographs (the one before may also be a skin tone or a U+FE0F that is
 * itself kept), and a variation selector (U+FE0E or U+FE0F) after a character
 * that is an emoji. A family, a keycap and a red heart read exactly as written.
 * "The one before" means as written out here: a U+FE0F that was itself written
 * out joins nothing, which is what makes this idempotent on its own output.
 *
 * WHAT IT NEVER DOES. It never normalises and never folds case (Phase 274's
 * rule 23): every other code point passes byte for byte. It is for a sentence
 * a person reads and nothing else; a path a program reads, a `detail` field and
 * a log line keep the name exactly as it is on disk.
 *
 * THE LIMITS, stated rather than fixed:
 *   - a name that already holds the text `<U+200B>` reads the same as one that
 *     holds the character;
 *   - a tag sequence, such as a subdivision flag, is written out, because its
 *     tags are default ignorable and nothing but an emoji renderer draws them;
 *   - a joiner or non-joiner a script uses to shape its letters (Persian,
 *     the Indic scripts) is written out like any other;
 *   - the digits, `#` and `*` are emoji, so a U+FE0F after one is kept;
 *   - the 32 format characters outside `Default_Ignorable_Code_Point`, among
 *     them U+FFF9 to U+FFFB and U+13430 to U+1343F, are not in the set;
 *   - U+2800 BRAILLE PATTERN BLANK draws as an empty cell and is a symbol, in
 *     none of the four classes, so it passes as written (the verify lens's
 *     hostile set, 2026-11-02).
 *
 * Pure: no platform, no state.
 */

/** A character with no glyph of its own: the four classes, less U+0020. */
const HIDDEN = /(?! )[\p{Default_Ignorable_Code_Point}\p{Cc}\p{Zl}\p{Zp}\p{Zs}]/u;
const PICTOGRAPH = /\p{Extended_Pictographic}/u;
const SKIN_TONE = /\p{Emoji_Modifier}/u;
const EMOJI = /\p{Emoji}/u;

const ZERO_WIDTH_JOINER = '\u200D';
const TEXT_SELECTOR = '\uFE0E';
const EMOJI_SELECTOR = '\uFE0F';

const HEX_DIGITS = '0123456789ABCDEF';

/** `<U+XXXX>`: uppercase hex, at least four digits. */
function writtenOut(point: string): string {
  let n = point.codePointAt(0) ?? 0;
  let digits = '';
  while (n > 0 || digits.length < 4) {
    digits = HEX_DIGITS.charAt(n % 16) + digits;
    n = Math.floor(n / 16);
  }
  return `<U+${digits}>`;
}

/**
 * Whether a hidden character is part of an emoji's own glyph. `before` is the
 * code point before it AS WRITTEN OUT (null when that one was escaped, or at
 * the start), `after` the one after it in the name.
 */
function drawsAnEmoji(
  point: string,
  before: string | null,
  after: string | undefined
): boolean {
  if (point === ZERO_WIDTH_JOINER) {
    return (
      before !== null &&
      (PICTOGRAPH.test(before) ||
        SKIN_TONE.test(before) ||
        before === EMOJI_SELECTOR) &&
      after !== undefined &&
      PICTOGRAPH.test(after)
    );
  }
  if (point === TEXT_SELECTOR || point === EMOJI_SELECTOR) {
    return before !== null && EMOJI.test(before);
  }
  return false;
}

/** The name with every character that cannot be seen written out as its code. */
export function visibleName(text: string): string {
  if (!HIDDEN.test(text)) return text;
  const points = Array.from(text);
  let out = '';
  let before: string | null = null;
  for (let at = 0; at < points.length; at += 1) {
    const point = points[at] ?? '';
    const shown: boolean =
      !HIDDEN.test(point) || drawsAnEmoji(point, before, points[at + 1]);
    out += shown ? point : writtenOut(point);
    before = shown ? point : null;
  }
  return out;
}
