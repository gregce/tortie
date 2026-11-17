/**
 * PHASE 325.1 — Tortie knows his own words by WHAT HE TYPED, not by when
 * (build/p3251/SPEC.md §4.1 and §4.2, D3251-1 to D3251-5; the Phase 325.1
 * entry in docs/BACKLOG.md, his ruling "2. a" of 2026-11-08).
 *
 * CLAUDE.md's UI rule: "needs input" may only be triggered by session
 * behaviour, never by the user's own input to that session. Tortie broke it:
 * his own dialog-shaped words in an agent's input row (`1. to cancel` and
 * `2. x` are enough) read as the agent's numbered question. Phase 325 told his
 * words by TIME, so a real question drawn within about a second of his last
 * key was taken for his and stayed grey. This module tells them by CONTENT:
 *
 *   - THE RECORD (`OwnWords`) is the lines he has typed or pasted into one
 *     session and not sent, with a cursor, read from the bytes the terminal
 *     received: printable characters and a paste's text, and the control bytes
 *     and escape sequences only as the editing keys they are.
 *   - THE MATCH finds a line of his ON THE SCREEN only when consecutive rows,
 *     each with its border stripped and an optional mark that holds no letter
 *     or digit (the agent's prompt, a box, a quote mark), spell that WHOLE
 *     line with whitespace ignored. Never a substring of one row.
 *   - THE RULE (`dialogIsHisWords`) says a numbered dialog is his when the
 *     numbered verdict, asked again of the same screen with every character
 *     his lines drew replaced, reads no question; when (his ruled round,
 *     2026-11-14) his rows that make it one form ONE block that starts where
 *     his input starts, behind the agent's prompt mark or, for an agent that
 *     draws none (pi, opencode), at the row's start under the input's edge;
 *     and (the fix round) when lines of his only complete rows the agent drew,
 *     nothing of the agent's question lies below them and a hint of his sits
 *     behind a prompt mark. So a question whose own rows he did not type is
 *     the agent's however soon after his last key it came, and so is one whose
 *     rows he copied into his draft or only happen to include a line of his.
 *
 * NO CLOCK. Nothing here reads a time, a stamp or a quiet window, and
 * `npm run conformance:ownwords` refuses one: a real question is never held by
 * timing alone.
 *
 * HIS WORDS NEVER LEAVE MAIN. The record lives in the session's activity state
 * (`SessionState.ownWords`, ./state-machine.ts) and goes with it when the
 * session ends; it is cleared on submit, on Ctrl-C and on every key that drops
 * or replaces what he typed in a way it cannot follow, and at its cap. Nothing
 * in this module logs, writes, stores or sends anything: it imports the
 * screen's own border strip, verdict and rows and nothing else, names no log
 * call (`npm run conformance:phonecopy` refuses one here, honest or not), and
 * answers a boolean.
 *
 * EVERY DOUBT ERRS TOWARD THE PARENT'S READING (the fix round). A key the
 * reader cannot follow forgets what he typed: the screen is then read as the
 * parent reads it, which can turn his own words amber as today and can never
 * hold a real question. A line the record keeps after the screen dropped it is
 * the one thing that could.
 *
 * ITS LIMITS, stated (build/p3251/SPEC.md §12 and §13, and §As built's fix
 * round and his two ruled rounds, which count each). An escape sequence split
 * across two chunks is read as two halves (xterm hands main whole sequences).
 * An agent that draws its own text after his words on the same row, or
 * rewrites what he typed, shows rows no line of his spells. A draft of his
 * that BEGINS with a word for word copy of a question's rows, from a row an
 * input could start on (its question sentence, its first option, a row behind
 * a mark or under a row with no letter or digit), holds that question until
 * he sends or clears it, when the agent draws it with no gap between the rows
 * that make it a question or with gaps his copy keeps as blank lines (Q1, the
 * residual): words of his after the copy do not release it, and a line of his
 * before it does. His own dialog-shaped words read as the parent reads them
 * when his first line is not drawn whole (behind a prompt holding letters, as
 * a shell's, or scrolled away), or when a hint or question line of his with no
 * prompt mark before it (pi's input row, a second line of his) only finishes
 * numbered rows the agent drew. A question drawn above a visible draft of his
 * that itself looks like a numbered question reads as it would above ordinary
 * words, which for some agents is not at all.
 */

import { BORDER, detectDialogRows, dialogEvidenceRows, EVIDENCE_HINT, EVIDENCE_OPT1, EVIDENCE_OPT2, NUMBERED } from './screen';

// ---------------------------------------------------------------------------
// The record
// ---------------------------------------------------------------------------

/**
 * Characters the record holds at most, a line break counting one (D3251-3).
 * The dialog window can draw at most 24 rows of 512 columns (12,288
 * characters), and the phone's longest paste is 16,384 bytes. When one more
 * character would pass it the record is cleared first, so a paste longer than
 * the cap leaves its tail.
 */
export const OWN_WORDS_MAX = 16_384;

/**
 * What he has typed or pasted into one session and not sent. Main's memory
 * only, per session, in the session's activity state; never logged, stored or
 * sent anywhere.
 */
export interface OwnWords {
  /**
   * The lines, each as its code points. The cursor is always on the LAST one:
   * a line break moves what follows the cursor onto a new last line, and a
   * Backspace at a line's start joins it onto the line above.
   */
  lines: string[][];
  /** The cursor, in code points along the last line. */
  col: number;
  /** Code points held, a line break counting one: what the cap is measured in. */
  size: number;
  /** A bracketed paste is open. Its two markers can arrive in two chunks. */
  inPaste: boolean;
  /**
   * The last key he sent, outside a paste, was Escape on its own. A second one
   * forgets the record (Esc Esc, which clears an agent's input row or puts an
   * earlier message in it). Keys, never time: anything between the two, or
   * nothing for an hour, reads the same.
   */
  escAlone: boolean;
  /**
   * The record holds a restore's replayed screen (`noteReplayedOn`), a page
   * the shell printed rather than an input row he typed into, until he sends
   * or the record forgets. No agent runs in that time: the restore arms its
   * resume and waits for his Enter. So the block his own lines must form
   * (`dialogIsHisWords`, his ruled round) is not asked of it.
   */
  replayed: boolean;
}

export function freshOwnWords(): OwnWords {
  return { lines: [[]], col: 0, size: 0, inPaste: false, escAlone: false, replayed: false };
}

/** Forget every line. A paste that is open stays open: its closing marker is still coming. */
function clear(words: OwnWords): void {
  words.lines = [[]];
  words.col = 0;
  words.size = 0;
  words.replayed = false;
}

/** True when one more character would pass the cap. */
function full(words: OwnWords): boolean {
  return words.size + 1 > OWN_WORDS_MAX;
}

function cursorLine(words: OwnWords): string[] {
  return words.lines[words.lines.length - 1] as string[];
}

/** One character at the cursor; the record cleared first when it would pass the cap. */
function insert(words: OwnWords, ch: string): void {
  if (full(words)) clear(words);
  cursorLine(words).splice(words.col, 0, ch);
  words.col += 1;
  words.size += 1;
}

/** A line break at the cursor: what follows it becomes the new last line. */
function breakLine(words: OwnWords): void {
  if (full(words)) {
    clear(words);
    return;
  }
  const rest = cursorLine(words).splice(words.col);
  words.lines.push(rest);
  words.col = 0;
  words.size += 1;
}

/** Backspace: the character before the cursor, or at a line's start the break above it. */
function eraseBack(words: OwnWords): void {
  const line = cursorLine(words);
  if (words.col > 0) {
    line.splice(words.col - 1, 1);
    words.col -= 1;
    words.size -= 1;
    return;
  }
  if (words.lines.length < 2) return;
  words.lines.pop();
  const above = cursorLine(words);
  words.col = above.length;
  above.push(...line);
  words.size -= 1;
}

/**
 * A word back, Ctrl-W and Alt-Backspace: the whitespace before the cursor, then
 * everything back to the whitespace before that, the most any line editor takes
 * for it. At a line's start, the break above it, as Backspace.
 */
function eraseWordBack(words: OwnWords): void {
  const line = cursorLine(words);
  if (words.col === 0) return eraseBack(words);
  let from = words.col;
  while (from > 0 && IS_WHITESPACE.test(line[from - 1] ?? '')) from -= 1;
  while (from > 0 && !IS_WHITESPACE.test(line[from - 1] ?? '')) from -= 1;
  line.splice(from, words.col - from);
  words.size -= words.col - from;
  words.col = from;
}

/** Ctrl-K: everything from the cursor to the end of its line. */
function killToEnd(words: OwnWords): void {
  const cut = cursorLine(words).splice(words.col);
  words.size -= cut.length;
}

/** The editing keys a line editor moves by, and Delete. */
type EditKey = 'left' | 'right' | 'home' | 'end' | 'delete';

/** A cursor key, as the line editor every agent draws reads it. */
function moveOrDelete(words: OwnWords, key: EditKey): void {
  const line = cursorLine(words);
  if (key === 'left') words.col = Math.max(0, words.col - 1);
  else if (key === 'right') words.col = Math.min(line.length, words.col + 1);
  else if (key === 'home') words.col = 0;
  else if (key === 'end') words.col = line.length;
  else if (words.col < line.length) {
    line.splice(words.col, 1);
    words.size -= 1;
  }
}

// ---------------------------------------------------------------------------
// The reader: what reached the session from him, read into the record
// (D3251-2, with Phase 325's escape grammar, build/p353/SPEC.md D325-1)
// ---------------------------------------------------------------------------

const ESC = 0x1b;
const BEL = 0x07;
const ETX = 0x03;
const BS = 0x08;
const TAB = 0x09;
const LF = 0x0a;
const CR = 0x0d;
const DEL = 0x7f;
/** Ctrl-A, Ctrl-B, Ctrl-D, Ctrl-E and Ctrl-F: the line editor's own Home, Left, Delete, End and Right. */
const SOH = 0x01;
const STX = 0x02;
const EOT = 0x04;
const ENQ = 0x05;
const ACK = 0x06;
/** Ctrl-K, to the line's end; Ctrl-U, the whole line; Ctrl-W, a word back. */
const VT = 0x0b;
const NAK = 0x15;
const ETB = 0x17;
/** Ctrl-N, Ctrl-P, Ctrl-R, Ctrl-Z and Ctrl-\ (and Ctrl-G, which is BEL). */
const SO = 0x0e;
const DLE = 0x10;
const DC2 = 0x12;
const SUB = 0x1a;
const FS = 0x1c;

/**
 * The keys after which what he typed is no longer what the record can follow,
 * so it forgets everything (the fix round): Ctrl-N and Ctrl-P (a line from his
 * history in its place), Ctrl-R (a history search), Ctrl-G (an abort, or the
 * line taken to an editor), Ctrl-Z and Ctrl-\ (the program stopped or quit).
 * BEL is Ctrl-G only outside a control string, which is read past whole first.
 */
function forgetsOn(cp: number): boolean {
  return cp === SO || cp === DLE || cp === DC2 || cp === BEL || cp === SUB || cp === FS;
}

/** The C1 forms of the introducers, which a terminal may send as one code point. */
const C1_CSI = 0x9b;
const C1_OSC = 0x9d;
const C1_DCS = 0x90;
const C1_SS3 = 0x8f;
const C1_SOS = 0x98;
const C1_PM = 0x9e;
const C1_APC = 0x9f;
const C1_ST = 0x9c;

const isControl = (cp: number): boolean => cp < 0x20 || cp === DEL || (cp >= 0x80 && cp <= 0x9f);

/** The code points of a chunk, so a sequence looks ahead by whole characters. */
function codePointsOf(data: string): number[] {
  const out: number[] = [];
  for (const ch of data) out.push(ch.codePointAt(0) ?? 0);
  return out;
}

/**
 * Where a control string (OSC, DCS, SOS, PM, APC) that starts at `from` ends:
 * just past BEL, ST as `ESC \`, or ST as 0x9c. An unterminated one runs to the
 * end of the chunk.
 */
function endOfString(cps: readonly number[], from: number): number {
  for (let i = from; i < cps.length; i += 1) {
    const cp = cps[i] ?? 0;
    if (cp === BEL || cp === C1_ST) return i + 1;
    if (cp === ESC && cps[i + 1] === 0x5c) return i + 2;
  }
  return cps.length;
}

/**
 * A CSI that starts at `from` (just past its introducer): where it ends, its
 * parameter and intermediate bytes, and its final byte. A byte outside a CSI's
 * ranges ends it without being consumed; an unterminated one runs to the end.
 */
function readCsi(cps: readonly number[], from: number): { end: number; params: string; final: number | null } {
  let params = '';
  let i = from;
  while (i < cps.length) {
    const cp = cps[i] ?? 0;
    if (cp >= 0x20 && cp <= 0x3f) {
      params += String.fromCharCode(cp);
      i += 1;
      continue;
    }
    if (cp >= 0x40 && cp <= 0x7e) return { end: i + 1, params, final: cp };
    return { end: i, params, final: null };
  }
  return { end: i, params, final: null };
}

/** A paste opening (`200~`, answers 1), closing (`201~`, answers -1), or neither (0). */
function pasteMarker(params: string, final: number | null): number {
  if (final !== 0x7e) return 0;
  if (params === '200') return 1;
  if (params === '201') return -1;
  return 0;
}

/**
 * The cursor key a CSI is, or null. Left and Right with no parameter or `1`
 * (a modifier such as `1;5` is another key and moves nothing), Home and End as
 * `H`/`F` or `1~`/`7~` and `4~`/`8~`, and Delete as `3~`. Up and Down, with any
 * modifier, `forget` (the fix round): each puts a line from his history in the
 * row, or moves to another line of it, neither of which the record can follow.
 */
function csiKey(params: string, final: number | null): EditKey | 'forget' | null {
  if (final === 0x41 || final === 0x42) return 'forget';
  if (params === '' || params === '1') {
    if (final === 0x44) return 'left';
    if (final === 0x43) return 'right';
    if (final === 0x48) return 'home';
    if (final === 0x46) return 'end';
  }
  if (final === 0x7e) {
    if (params === '1' || params === '7') return 'home';
    if (params === '4' || params === '8') return 'end';
    if (params === '3') return 'delete';
  }
  return null;
}

/** The cursor key an SS3 is (application cursor mode), or null; Up and Down `forget`, as their CSI forms do. */
function ss3Key(final: number | undefined): EditKey | 'forget' | null {
  if (final === 0x41 || final === 0x42) return 'forget';
  if (final === 0x44) return 'left';
  if (final === 0x43) return 'right';
  if (final === 0x48) return 'home';
  if (final === 0x46) return 'end';
  return null;
}

/** The line editor's own control keys that move or delete: Ctrl-A, -B, -D, -E and -F, or null. */
function controlKey(cp: number): EditKey | null {
  if (cp === SOH) return 'home';
  if (cp === STX) return 'left';
  if (cp === EOT) return 'delete';
  if (cp === ENQ) return 'end';
  if (cp === ACK) return 'right';
  return null;
}

/** A cursor key read: `forget` forgets the record, any other key moves or deletes. */
function keyOn(words: OwnWords, key: EditKey | 'forget' | null): void {
  if (key === 'forget') clear(words);
  else if (key !== null) moveOrDelete(words, key);
}

/**
 * One code point of pasted text at `i`: a printable character is inserted, a
 * CR, an LF or a CR LF breaks the line, a TAB is a space, and nothing submits.
 * Answers how many code points it read.
 */
function pastedAt(words: OwnWords, cps: readonly number[], i: number): number {
  const cp = cps[i] ?? 0;
  if (cp === CR || cp === LF) {
    breakLine(words);
    return cp === CR && cps[i + 1] === LF ? 2 : 1;
  }
  if (cp === TAB) insert(words, ' ');
  else if (!isControl(cp)) insert(words, String.fromCodePoint(cp));
  return 1;
}

/**
 * What reached the session from him, read into the record (D3251-2, widened by
 * the fix round).
 *
 * OUTSIDE A PASTE: a printable character (not C0, DEL or C1) is inserted at
 * the cursor; CR is a submit and clears the record; ETX (Ctrl-C) clears it;
 * LF (Ctrl-J) and Alt-Enter (ESC then CR or LF) break the line at the cursor;
 * BS and DEL erase the character before the cursor (at a line's start they
 * join it to the line above); Left, Right, Home, End and Delete move or erase
 * as a line editor does, and so do their control keys Ctrl-B, Ctrl-F, Ctrl-A,
 * Ctrl-E and Ctrl-D; Ctrl-W and Alt-Backspace erase a word back; Ctrl-K erases
 * to the line's end. THE KEYS THAT DROP OR REPLACE WHAT HE TYPED, in a way the
 * reader cannot follow line for line, FORGET the whole record: Ctrl-U (every
 * line editor clears at least the line, zsh the whole of it), Up and Down,
 * Ctrl-P and Ctrl-N (his history), Ctrl-R (a search of it), Ctrl-G, Ctrl-Z,
 * Ctrl-\ and Escape pressed twice. Forgetting reads the screen as the parent
 * does; keeping a line the screen dropped could hold a real question.
 *
 * INSIDE A BRACKETED PASTE (`CSI 200~` to `CSI 201~`, kept across chunks): a
 * printable character is inserted, CR, LF or CR LF break the line, TAB is a
 * space, and nothing submits.
 *
 * EVERYTHING ELSE counts nothing and changes nothing: every other C0 and C1,
 * every other CSI (a modified Left or Right, a function key, a focus or
 * device report, an SGR mouse report), an X10 mouse report (`ESC [ M` and its
 * three raw bytes), OSC, DCS, SOS, PM and APC up to BEL or ST, every other
 * SS3, and ESC with any other character (Alt and a key).
 */
export function noteOwnWordsOn(words: OwnWords, data: string): void {
  const cps = codePointsOf(data);
  let i = 0;
  while (i < cps.length) {
    const cp = cps[i] ?? 0;
    const next = cps[i + 1];
    // Escape alone is remembered for exactly one key: whatever comes next ends it.
    const escBefore = words.escAlone;
    words.escAlone = false;
    const csi = cp === C1_CSI ? 1 : cp === ESC && next === 0x5b ? 2 : 0;
    if (csi > 0) {
      const { end, params, final } = readCsi(cps, i + csi);
      const marker = pasteMarker(params, final);
      if (marker === 1) words.inPaste = true;
      else if (marker === -1) words.inPaste = false;
      else if (!words.inPaste) keyOn(words, csiKey(params, final));
      // An X10 mouse report: `ESC [ M` with nothing between, then three raw bytes.
      i = final === 0x4d && params === '' ? Math.min(cps.length, end + 3) : end;
      continue;
    }
    const str =
      cp === C1_OSC || cp === C1_DCS || cp === C1_SOS || cp === C1_PM || cp === C1_APC
        ? 1
        : cp === ESC && (next === 0x5d || next === 0x50 || next === 0x58 || next === 0x5e || next === 0x5f)
          ? 2
          : 0;
    if (str > 0) {
      i = endOfString(cps, i + str);
      continue;
    }
    const ss3 = cp === C1_SS3 ? 1 : cp === ESC && next === 0x4f ? 2 : 0;
    if (ss3 > 0) {
      if (!words.inPaste) keyOn(words, ss3Key(cps[i + ss3]));
      i = Math.min(cps.length, i + ss3 + 1);
      continue;
    }
    if (cp === ESC) {
      // Alt and a key. Alt-Enter is the line break the agents that take one take.
      if (next === CR || next === LF) breakLine(words);
      // Outside a paste, Alt-Backspace erases a word back, and Escape pressed
      // twice, in one message or in two, forgets the record.
      if (!words.inPaste) {
        if (next === DEL || next === BS) eraseWordBack(words);
        else if (next === ESC || (next === undefined && escBefore)) clear(words);
        else if (next === undefined) words.escAlone = true;
      }
      // Esc Esc in one message: the second Escape is read next, as the key it is.
      i = Math.min(cps.length, i + (next === ESC ? 1 : 2));
      continue;
    }
    if (words.inPaste) {
      i += pastedAt(words, cps, i);
      continue;
    }
    if (cp === CR) {
      // Enter: he sent it, so it is no longer a draft of his on the screen.
      clear(words);
    } else if (cp === ETX) {
      // Ctrl-C: every agent's input row clears on it.
      clear(words);
    } else if (cp === NAK) {
      // Ctrl-U: every line editor empties at least the line before the cursor,
      // zsh the whole line and readline the whole of what he typed, so the
      // record keeps none of it.
      clear(words);
    } else if (forgetsOn(cp)) {
      // His history, a search of it, an abort or a stopped program: what the
      // row holds next is not what he typed here.
      clear(words);
    } else if (cp === LF) {
      breakLine(words);
    } else if (cp === BS || cp === DEL) {
      eraseBack(words);
    } else if (cp === ETB) {
      // Ctrl-W: a word back.
      eraseWordBack(words);
    } else if (cp === VT) {
      // Ctrl-K: to the end of the line.
      killToEnd(words);
    } else if (isControl(cp)) {
      keyOn(words, controlKey(cp));
    } else {
      insert(words, String.fromCodePoint(cp));
    }
    i += 1;
  }
}

/**
 * A restore's replayed screen (D3251-10): Tortie printed the old screen into
 * the pane, so its text is read as a paste of his, followed by one line break
 * so what he types next starts a line of its own. Its own escape sequences
 * were removed before it got here; nothing in it is read as a key.
 */
export function noteReplayedOn(words: OwnWords, text: string): void {
  const cps = codePointsOf(text);
  let i = 0;
  while (i < cps.length) i += pastedAt(words, cps, i);
  breakLine(words);
  words.replayed = true;
}

// ---------------------------------------------------------------------------
// The match: a line of his ON THE SCREEN (D3251-4)
// ---------------------------------------------------------------------------

/** A mark holds no letter and no digit: it cannot carry OPT1, OPT2, HINT or QUEST. */
const LETTER_OR_DIGIT = /[\p{L}\p{N}]/u;
const WHITESPACE = /\s/gu;
const IS_WHITESPACE = /^\s$/u;
/** What stands in for each of his characters in the counterfactual: in no class the verdict reads. */
const HIS = '░';

/**
 * A string with the verdict's own border strip, and how many code units it
 * took off the front. `BORDER` carries the `g` flag, so it is only ever used
 * through `.replace`, whose callback is told where each strip sat.
 */
function stripBorder(text: string): { lead: number; text: string } {
  let lead = 0;
  const kept = text.replace(BORDER, (strip: string, at: number) => {
    if (at === 0) lead = strip.length;
    return '';
  });
  return { lead, text: kept };
}

/** A record line's FORM: its text with the verdict's border strip and every whitespace character removed. */
function formOfLine(line: readonly string[]): string {
  return stripBorder(line.join('')).text.replace(WHITESPACE, '');
}

/** One screen row, ready to be tiled. */
interface Row {
  /** The row's code points, as captured. */
  chars: string[];
  /** Index in `chars` just past the border-stripped text: where his characters can end. */
  end: number;
  /** The FORM: the border-stripped text with every whitespace character removed. */
  form: string;
  /** For each code point of the form, its index in `chars`. */
  at: number[];
  /** For each code point of the form, its code-unit offset in `form`. */
  unit: number[];
  /** The longest mark the row may have, in code points of the form. */
  markMax: number;
  /**
   * The row, its border stripped, reads as numbered (`NUMBERED`, the rule
   * Phase 312's option collector reads): a line of his never continues onto
   * such a row, so no one line can be spelled by a question's options joined.
   */
  numbered: boolean;
}

/**
 * The longest MARK a row's form may begin with: everything before its first
 * letter or digit, and never the whole form (a tile row draws at least one
 * character of his).
 */
function markMaxOf(form: readonly string[]): number {
  for (let k = 0; k < form.length; k += 1) {
    if (LETTER_OR_DIGIT.test(form[k] ?? '')) return k;
  }
  return form.length - 1;
}

function rowOf(raw: string): Row {
  const chars = [...raw];
  const { lead, text } = stripBorder(raw);
  // Every character of the strip is in the Basic Multilingual Plane, so its
  // length in code units is its length in code points.
  const end = lead + [...text].length;
  let form = '';
  const at: number[] = [];
  const unit: number[] = [];
  const formChars: string[] = [];
  for (let c = lead; c < end; c += 1) {
    const ch = chars[c] ?? '';
    if (IS_WHITESPACE.test(ch)) continue;
    at.push(c);
    unit.push(form.length);
    formChars.push(ch);
    form += ch;
  }
  return { chars, end, form, at, unit, markMax: markMaxOf(formChars), numbered: NUMBERED.test(text) };
}

/** A row of a tile, and the index in its `chars` where his characters start. */
type Span = [row: number, from: number];

/**
 * Steps the lines of his may spend, all together, being placed on one screen,
 * a step being one mark of one row tried for one line (the fix round: a budget
 * for each line let hundreds of lines spend it hundreds of times over, up to a
 * second a call on a contrived record; his ruled round counts every step, not
 * only the comparisons, so a step that is skipped for its length is paid for
 * too). The search below remembers every (row, position) a line has answered,
 * so it grows with rows times characters and never exponentially; on a real
 * screen a line costs a few hundred steps, and his first line and then his
 * newest are placed first. Only a contrived screen, many rows of one repeated
 * mark under lines that are long runs of the same mark, comes near this, and
 * there THE LINES LEFT ARE LEFT UNPLACED: fewer of his characters are
 * replaced, so the screen reads nearer to how the parent reads it, which can
 * never hold a real question. A count of steps, never a clock.
 */
const TILE_BUDGET = 50_000;

/** One line's search: what each (row, position) answered for it, and the one budget every line draws on. */
interface Search {
  memo: Map<number, Span[] | null>;
  budget: { left: number };
}

/**
 * The tile of `line` from row `r`, its first `pos` code units already spelled:
 * the rows that spell the rest of it, or null. Each row's form, after a mark
 * (the shortest that completes the tile), continues the line exactly; the last
 * one ends it. A blank row has no form and ends a tile, and (the fix round) a
 * row that reads as numbered is never a continuation, as Phase 312's option
 * collector holds it: a line runs on into the next row only as a wrap does.
 */
function tileFrom(rows: readonly Row[], line: string, r: number, pos: number, search: Search): Span[] | null {
  const key = r * (line.length + 1) + pos;
  const known = search.memo.get(key);
  if (known !== undefined) return known;
  let found: Span[] | null = null;
  const row = rows[r];
  if (row !== undefined && row.form.length > 0 && !(pos > 0 && row.numbered)) {
    for (let k = 0; k <= row.markMax && found === null && search.budget.left > 0; k += 1) {
      search.budget.left -= 1;
      const rest = row.form.slice(row.unit[k] ?? row.form.length);
      if (rest.length === 0 || rest.length > line.length - pos) continue;
      if (!line.startsWith(rest, pos)) continue;
      const here: Span = [r, row.at[k] ?? row.end];
      if (pos + rest.length === line.length) {
        found = [here];
      } else {
        const after = tileFrom(rows, line, r + 1, pos + rest.length, search);
        if (after !== null) found = [here, ...after];
      }
    }
  }
  search.memo.set(key, found);
  return found;
}

// ---------------------------------------------------------------------------
// The rule (D3251-5)
// ---------------------------------------------------------------------------

/**
 * His lines the rule places, each once: the FIRST he typed, which is where his
 * input begins and where the block his rows form must start (his ruled round),
 * and then his newest, no more of them than the screen has rows. A line the
 * screen has no room for cannot be one of its rows, and a line left unplaced
 * reads as the parent reads it. `first` is null when none of the first lines
 * he typed, as many as the screen has rows, holds a letter or a digit.
 */
function linesToPlace(words: OwnWords, room: number): { first: string | null; lines: string[] } {
  let first: string | null = null;
  for (let n = 0; n < words.lines.length && n < room && first === null; n += 1) {
    const form = formOfLine(words.lines[n] ?? []);
    if (LETTER_OR_DIGIT.test(form)) first = form;
  }
  const lines: string[] = first === null ? [] : [first];
  const seen = new Set<string>(lines);
  for (let n = words.lines.length - 1; n >= Math.max(0, words.lines.length - room); n -= 1) {
    const form = formOfLine(words.lines[n] ?? []);
    if (!LETTER_OR_DIGIT.test(form) || seen.has(form)) continue;
    seen.add(form);
    lines.push(form);
  }
  return { first, lines };
}

/**
 * WHERE AN INPUT ROW STARTS (his ruled round, "the input's prompt mark"): his
 * first line begins on row `r`, at index `at`, behind the agent's prompt mark,
 * a mark that holds no letter or digit (Claude Code's `❯`, Codex's `›`, the
 * `>` of gemini, qwen and antigravity); or, for an agent that draws none (pi,
 * opencode), at the row's own start under a row that holds no letter or digit
 * (pi's rule, the blank line above opencode's box). A question's option or
 * hint row that he happens to have typed is drawn under the agent's row above
 * it, and is no input's start.
 */
function startsAnInput(rows: readonly Row[], r: number, at: number): boolean {
  const row = rows[r];
  if (row === undefined) return false;
  if (at > (row.at[0] ?? row.end)) return true;
  return !LETTER_OR_DIGIT.test(rows[r - 1]?.form ?? '');
}

/**
 * A BLANK LINE OF HIS: nothing on it but whitespace, as a person types one. A
 * line holding only a box's marks (`│`, copied from a boxed question) has no
 * form either, but it is not a blank line he typed, and it never stands for
 * the box's blank rows.
 */
function isBlankLine(line: readonly string[]): boolean {
  return line.every((ch) => IS_WHITESPACE.test(ch));
}

/**
 * Whether his record holds a line whose form is one of `above`, then exactly
 * `count` blank lines (`isBlankLine`), then a line whose form is one of
 * `below`. Only the lines the rule may place are read, his first `room` and
 * his newest `room` and the blank lines beside them, so a record at its cap
 * costs no more than one a screen long. `formAt` remembers each form it made.
 */
function recordHoldsBlankLines(
  words: OwnWords,
  above: ReadonlySet<string>,
  below: ReadonlySet<string>,
  count: number,
  room: number,
  formAt: (n: number) => string
): boolean {
  const total = words.lines.length;
  const reach = room + count + 1;
  for (let n = 0; n + count + 1 < total; n += 1) {
    // Past his first lines, straight on to his newest: no line between can be drawn.
    if (n === reach && total - reach > n) n = total - reach;
    if (!above.has(formAt(n))) continue;
    let blank = true;
    for (let k = n + 1; k <= n + count && blank; k += 1) blank = isBlankLine(words.lines[k] ?? []);
    if (blank && below.has(formAt(n + count + 1))) return true;
  }
  return false;
}

/**
 * HIS BLANK ROWS (his second ruled round, 2026-11-16, "325.1 a": "Tortie will
 * count a blank line inside your draft as part of your typing"). A run of
 * blank rows between two rows of his is his too when his record holds exactly
 * that many blank lines between a line of his drawn just above the run (a tile
 * that ends on the row above it) and one drawn just below it (a tile that
 * begins on the row below it). So a draft with a blank line between its lines
 * is one block, as he typed it, and a blank row his record does not hold (the
 * agent's own, or one more or fewer than he typed) still breaks it. Answers
 * `his` with those rows added; it reads its arguments alone.
 */
function withHisBlankRows(
  rows: readonly Row[],
  his: readonly boolean[],
  endsOn: ReadonlyMap<number, ReadonlySet<string>>,
  beginsOn: ReadonlyMap<number, ReadonlySet<string>>,
  words: OwnWords
): boolean[] {
  const out = [...his];
  const forms = new Map<number, string>();
  const formAt = (n: number): string => {
    let form = forms.get(n);
    if (form === undefined) {
      form = formOfLine(words.lines[n] ?? []);
      forms.set(n, form);
    }
    return form;
  };
  let n = 1;
  while (n < rows.length) {
    if ((rows[n]?.form.length ?? 1) !== 0 || his[n - 1] !== true) {
      n += 1;
      continue;
    }
    let last = n;
    while ((rows[last + 1]?.form.length ?? 1) === 0) last += 1;
    const above = endsOn.get(n - 1);
    const below = beginsOn.get(last + 1);
    if (
      his[last + 1] === true &&
      above !== undefined &&
      below !== undefined &&
      recordHoldsBlankLines(words, above, below, last - n + 1, rows.length, formAt)
    ) {
      for (let k = n; k <= last; k += 1) out[k] = true;
    }
    n = last + 1;
  }
  return out;
}

/**
 * THE BLOCK (his ruled round, 2026-11-14, "325.1 a"): his rows that the
 * verdict counts, `top` to `bottom`, are ONE run of his rows, and the run
 * begins on a row his first line starts an input on (`startsAnInput`). A
 * blank row inside his input is one of his rows when his record holds it
 * (`withHisBlankRows`, his second ruled round). It reads its arguments alone.
 */
function oneBlockFromHisStart(his: readonly boolean[], starts: ReadonlySet<number>, top: number, bottom: number): boolean {
  for (let n = top; n <= bottom; n += 1) if (his[n] !== true) return false;
  let start = top;
  while (!starts.has(start) && start > 0 && his[start - 1] === true) start -= 1;
  return starts.has(start);
}

/**
 * True when the numbered dialog on `screen` is HIS WORDS: at least one line of
 * his record is drawn on it; (his ruled round) his rows that the verdict
 * counts form one block that starts where his input starts; the numbered
 * verdict, asked again of the same screen with every character his lines drew
 * replaced by ░, reads no question; and (the fix round) when his rows are not
 * a question on their own, or the agent's rows give two of the three things
 * the verdict counts, no row of the AGENT'S that the verdict reads as a
 * question's (an option, its hint, its question sentence), or that reads as
 * numbered, lies below a row of his that the verdict reads, and a hint or
 * question sentence of his is drawn behind a mark.
 *
 * WHY. His input row is drawn as one block: his first line behind the agent's
 * prompt mark (or at the row's start under the input's edge where the agent
 * draws none), the rest on the rows below it, a blank line of his a blank row
 * inside it (his second ruled round, 2026-11-16). A question the agent drew
 * whose rows he happened to copy into his draft is not: the copy's first
 * line, a line of his before it, sits on none of the question's rows, a
 * copied option or hint row starts no input, or the question's own blank rows
 * that his record does not hold and rows of the agent's break the copy in two
 * (his ruling of 2026-11-14). A question
 * is drawn at the bottom of the screen, and so is his input row. His own words
 * that only finish rows the agent drew (his hint under its numbered prose)
 * sit below every one of them, behind that prompt. A real question whose rows
 * include lines he happens to have typed (an option, two options, its
 * question sentence) has its other rows, its later options and its hint,
 * below them, and its own hint line, at its bottom, is led by no prompt: it
 * stays the agent's. His own dialog-shaped words give the dialog all three of
 * the things it needs, which no one row of a question does, and stay his
 * whatever the agent draws around them. What still reads as his (Q1, the
 * residual, counted over every committed question in build/p3251/SPEC.md §As
 * built, his two ruled rounds) is a draft that begins with a word for word
 * copy of a question's rows, from a row an input could start on, that the
 * agent draws with no gap between the rows that make it a question, or with
 * gaps the copy keeps as blank lines.
 *
 * Every row stays inked (a tile row draws at least one character of his, and
 * ░ is ink), so the window the verdict reads is the same window. It asks the
 * ONE spelling of the predicate, `detectDialogRows(...).atChoice`, and never
 * `detectDialog`, whose one production caller is the state machine
 * (`conformance:choices` clause 3); `dialogEvidenceRows` names the rows the same
 * window and classes count. It reads its arguments and writes nothing.
 */
export function dialogIsHisWords(screen: string, words: OwnWords): boolean {
  const rows = screen.split('\n').map(rowOf);
  // His first line, then his newest, each once (linesToPlace): the one budget
  // below is spent first on where his input starts and on what he typed last,
  // which is what an input row shows.
  const { first, lines } = linesToPlace(words, rows.length);
  if (lines.length === 0) return false;
  // Every span of his on a row ends at that row's end, so a row's union of
  // spans is everything from the earliest start.
  const from = rows.map((row) => row.end);
  // The rows a tile of his first line starts an input on: where his input can
  // begin.
  const starts = new Set<number>();
  // For his blank rows (his second ruled round): the lines whose tile begins
  // on each row, and those whose tile ends on it.
  const beginsOn = new Map<number, Set<string>>();
  const endsOn = new Map<number, Set<string>>();
  const budget = { left: TILE_BUDGET };
  let any = false;
  for (const line of lines) {
    const search: Search = { memo: new Map(), budget };
    for (let r = 0; r < rows.length && budget.left > 0; r += 1) {
      const tile = tileFrom(rows, line, r, 0, search);
      if (tile === null) continue;
      if (line === first && startsAnInput(rows, r, tile[0]?.[1] ?? 0)) starts.add(r);
      for (const [n, at] of tile) from[n] = Math.min(from[n] ?? at, at);
      const end = tile[tile.length - 1]?.[0] ?? r;
      beginsOn.set(r, (beginsOn.get(r) ?? new Set<string>()).add(line));
      endsOn.set(end, (endsOn.get(end) ?? new Set<string>()).add(line));
      any = true;
    }
  }
  if (!any) return false;
  // A row of his is one his characters reach; a row of the agent's is any
  // other.
  const evidence = dialogEvidenceRows(screen);
  const his = rows.map((row, n) => (from[n] ?? row.end) < row.end);
  let agentClasses = 0;
  let hisClasses = 0;
  let hisTop = rows.length;
  let hisBottom = -1;
  let agentBottom = -1;
  rows.forEach((row, n) => {
    const classes = evidence[n] ?? 0;
    if (his[n] === true) {
      hisClasses |= classes;
      if (classes !== 0) {
        hisTop = Math.min(hisTop, n);
        hisBottom = n;
      }
      return;
    }
    agentClasses |= classes;
    if (classes !== 0 || row.numbered) agentBottom = Math.max(agentBottom, n);
  });
  // THE BLOCK (his ruled round): lines count as his only when they form one
  // block that starts at the input's prompt mark, a blank row inside his
  // input counted with them when his record holds it (his second ruled round).
  // A restore's replayed screen is a printed page, not an input row, and is
  // not asked this.
  const inBlock = words.replayed || hisBottom < 0 ? his : withHisBlankRows(rows, his, endsOn, beginsOn, words);
  if (!words.replayed && hisBottom >= 0 && !oneBlockFromHisStart(inBlock, starts, hisTop, hisBottom)) return false;
  // THE AGENT'S QUESTION AROUND HIS ROWS. When his rows give one or two of the
  // three things the verdict counts (a first option, a second, a hint or
  // question) and the agent's rows give it the rest (his ruled round: two of a
  // question's rows, typed word for word, give it two), or when the agent's
  // rows give two of them (the fix round: one such row of his), his lines may
  // be rows of the agent's own question. Then they are his only when nothing
  // of the agent's that the verdict counts, nor a numbered row (a further
  // option, as Phase 312's collector reads one), lies below his rows, and,
  // when his rows give it no option, when his first such row is drawn behind
  // a mark, as an input row is behind the agent's prompt: a question's own
  // hint line is led by none. His own dialog-shaped words give it all three,
  // and stay his whatever the agent draws around them (antigravity's `esc to
  // cancel` under his input row while it works).
  const agentLacks = [EVIDENCE_OPT1, EVIDENCE_OPT2, EVIDENCE_HINT].filter((c) => (agentClasses & c) === 0).length;
  const hisLacks = [EVIDENCE_OPT1, EVIDENCE_OPT2, EVIDENCE_HINT].filter((c) => (hisClasses & c) === 0).length;
  if (agentLacks < 2 || (hisLacks > 0 && hisLacks < 3)) {
    if (agentBottom > hisTop) return false;
    const top = rows[hisTop];
    const behindAMark = top !== undefined && (from[hisTop] ?? top.end) > (top.at[0] ?? top.end);
    if ((hisClasses & (EVIDENCE_OPT1 | EVIDENCE_OPT2)) === 0 && !behindAMark) return false;
  }
  const counterfactual = rows
    .map((row, n) => row.chars.map((ch, c) => (c >= (from[n] ?? row.end) && c < row.end ? HIS : ch)).join(''))
    .join('\n');
  return !detectDialogRows(counterfactual).atChoice;
}
