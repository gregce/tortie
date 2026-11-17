/**
 * PHASE 325.1 — the record of what he typed, and the match (build/p3251/SPEC.md
 * §4.1, §4.2 and §4.8; D3251-2 to D3251-5, D3251-10).
 *
 * ./own-words.ts is pure, so every row here drives it directly: the reader one
 * row per class of D3251-2, inside and outside a bracketed paste; the cap; the
 * replay; the match, over every agent's input row as its committed windows and
 * the Phase 318 captures draw it; THE CORPUS BOUNDARY of §2.5, driven over
 * every committed numbered question and every distinct inked row of every
 * committed window: no one line he has typed and not sent holds a real
 * question; and (his ruled round, 2026-11-14) the block his rows must form,
 * starting where his input starts, behind the agent's prompt mark or under the
 * input's edge where it draws none, so a copy of a question in his draft is the
 * agent's question, and the one shape that still holds one is a draft that is,
 * from its very first line, a gap-free copy of its rows.
 *
 * The verdict this feeds, tick by tick through the shipping state machine, is
 * ./p3251-own-words.test.ts. `npm run ablation:p3251` takes each clause out of
 * the shipping source and requires the row named for it here to go red.
 *
 * Every word typed here is made up: the texts are the spec's own, and the
 * screens are the committed redacted captures.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { stripAnsi } from '../../ansi';
import { ownBytesOf } from '../../screen/keys';
import {
  detectDialog,
  detectDialogRows,
  dialogEvidenceRows,
  EVIDENCE_HINT,
  EVIDENCE_OPT1,
  EVIDENCE_OPT2,
  normalizeCapture
} from '../screen';
import {
  dialogIsHisWords,
  freshOwnWords,
  noteOwnWordsOn,
  noteReplayedOn,
  OWN_WORDS_MAX,
  type OwnWords
} from '../own-words';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ESC = '\u001b';

/** A record fed these chunks, one `term:input` message each. */
function recordOf(...chunks: string[]): OwnWords {
  const words = freshOwnWords();
  for (const chunk of chunks) noteOwnWordsOn(words, chunk);
  return words;
}

/** What the record holds, its lines joined by a line feed. */
const textOf = (words: OwnWords): string => words.lines.map((l) => l.join('')).join('\n');

/** A desk paste exactly as xterm sends one: every line feed a carriage return, bracketed. */
const pasteOf = (text: string): string => `${ESC}[200~${text.replace(/\r?\n/g, '\r')}${ESC}[201~`;

/** A record holding these lines, pasted. */
const linesOf = (text: string): OwnWords => recordOf(pasteOf(text));

/** Each character a chunk of its own, the line breaks as `newline` sends them. */
function keysOf(text: string, newline = '\n'): string[] {
  return [...text].map((ch) => (ch === '\n' ? newline : ch));
}

/**
 * A line of his is DRAWN on a screen the numbered verdict reads no question
 * on. There the rule's second half (the counterfactual reads no question)
 * always holds, so the rule answers exactly whether a tile was found.
 */
function drawn(screen: string, words: OwnWords): boolean {
  expect(detectDialog(normalizeCapture(screen)), 'the screen used to read the match must not be a question').toBe(false);
  return dialogIsHisWords(normalizeCapture(screen), words);
}

const REPO = join(__dirname, '..', '..', '..', '..');
const QUESTIONS = join(REPO, 'build', 'fixtures', 'questions');
const FIXTURES = join(__dirname, 'fixtures');
const fixture = (name: string): string => readFileSync(join(FIXTURES, name), 'utf8').replace(/\n+$/, '');

/** A Phase 318 `.ansi` capture as the screen tmux printed, its source line dropped. */
function replyScreen(name: string): string {
  const text = readFileSync(join(REPO, 'build', 'fixtures', 'reply', name), 'utf8');
  const body = text.slice(text.indexOf('\n') + 1).replace(/\\(\\|x[0-9a-f]{2})/g, (_m, g: string) =>
    g === '\\' ? '\\' : String.fromCharCode(parseInt(g.slice(1), 16))
  );
  return normalizeCapture(stripAnsi(body));
}

/** A Phase 318 `.txt` capture as the screen tmux printed, its source line dropped. */
function replyText(name: string): string {
  const text = readFileSync(join(REPO, 'build', 'fixtures', 'reply', name), 'utf8');
  return normalizeCapture(text.startsWith('# ') ? text.slice(text.indexOf('\n') + 1) : text);
}

/** Every committed window, keyed by id. */
const WINDOWS = new Map<string, { label: string; rows: string[] }>(
  readdirSync(QUESTIONS)
    .filter((f) => f.endsWith('.jsonl'))
    .sort()
    .flatMap((f) => readFileSync(join(QUESTIONS, f), 'utf8').split('\n').filter((l) => l.trim() !== ''))
    .map((l) => JSON.parse(l) as { id: string; label: string; rows: string[] })
    .map((w): [string, { label: string; rows: string[] }] => [w.id, { label: w.label, rows: w.rows.map((r) => r.replace(/\s+$/, '')) }])
);
const windowOf = (id: string): string => (WINDOWS.get(id)?.rows ?? []).join('\n');

const CLAUDE_GATE = fixture('claude-workspace-trust.txt');
const GEMINI_GATE = windowOf('a-gemini-0002');
/**
 * A question whose last option is the lowest row it draws, no hint below: the
 * attack lens's own question with its hint left off (synthetic; no committed
 * question has this shape, and it is the residual the fix round leaves).
 */
const NO_HINT_QUESTION = ['some output', '', 'Do you want me to run them now?', '❯ 1. Yes, run them', '  2. No, not now'].join('\n');
const LONG = 'Do you want me to proceed?\n1. Yes, go ahead\n2. No, stop';
const MIN = '1. to cancel\n2. x';

// ---------------------------------------------------------------------------
// The reader, outside a paste
// ---------------------------------------------------------------------------

describe('the reader: what reached the session from him (D3251-2)', () => {
  it('printable characters, one chunk a key, are inserted at the cursor', () => {
    const words = recordOf(...keysOf('1. to cancel'));
    expect(textOf(words)).toBe('1. to cancel');
    expect(words.col).toBe(12);
    expect(words.size).toBe(12);
  });

  it('a carriage return outside a paste clears: he sent it', () => {
    const words = recordOf(...keysOf(MIN), '\r');
    expect(textOf(words)).toBe('');
    expect(words.size).toBe(0);
    expect(words.col).toBe(0);
    // Typed after the submit, a fresh draft.
    noteOwnWordsOn(words, 'y');
    expect(textOf(words)).toBe('y');
  });

  it('Ctrl-C clears', () => {
    const words = recordOf(...keysOf(MIN), '\u0003');
    expect(textOf(words)).toBe('');
    expect(words.size).toBe(0);
  });

  it('a line feed (Ctrl-J) breaks the line at the cursor, never a submit', () => {
    expect(textOf(recordOf(...keysOf(MIN)))).toBe(MIN);
    // In the middle of a line: what follows the cursor moves to the new line.
    const words = recordOf('abcd', `${ESC}[D`, `${ESC}[D`, '\n');
    expect(words.lines.map((l) => l.join(''))).toEqual(['ab', 'cd']);
    expect(words.col).toBe(0);
    expect(words.size).toBe(5);
  });

  it('Alt-Enter (ESC then CR or LF) breaks the line at the cursor, never a submit', () => {
    expect(textOf(recordOf(...keysOf(MIN, `${ESC}\r`)))).toBe(MIN);
    expect(textOf(recordOf(...keysOf(MIN, `${ESC}\n`)))).toBe(MIN);
    expect(textOf(recordOf(`1. to cancel${ESC}\r2. x`))).toBe(MIN);
  });

  it('Backspace and DEL erase the character before the cursor, and at a line’s start join the line above', () => {
    expect(textOf(recordOf(...keysOf('1. to cancez'), '\u007f', 'l'))).toBe('1. to cancel');
    expect(textOf(recordOf(...keysOf('1. to cancez'), '\b', 'l'))).toBe('1. to cancel');
    const joined = recordOf('ab', '\n', 'cd', `${ESC}[H`, '\u007f');
    expect(joined.lines.map((l) => l.join(''))).toEqual(['abcd']);
    expect(joined.col).toBe(2);
    expect(joined.size).toBe(4);
    // At the very start of the record there is nothing to erase.
    const empty = recordOf('\u007f', '\b');
    expect(textOf(empty)).toBe('');
    expect(empty.size).toBe(0);
  });

  it('the cursor keys in their CSI form move the cursor: Left, Right, Home, End, and Delete erases at it', () => {
    expect(textOf(recordOf('1. to cncel', `${ESC}[D`, `${ESC}[D`, `${ESC}[D`, `${ESC}[D`, 'a'))).toBe('1. to cancel');
    expect(textOf(recordOf('1. to cncel', `${ESC}[1D`, `${ESC}[1D`, `${ESC}[1D`, `${ESC}[1D`, 'a'))).toBe('1. to cancel');
    expect(textOf(recordOf('bc', `${ESC}[H`, 'a', `${ESC}[F`, 'd'))).toBe('abcd');
    expect(textOf(recordOf('bc', `${ESC}[1~`, 'a', `${ESC}[4~`, 'd'))).toBe('abcd');
    expect(textOf(recordOf('bc', `${ESC}[7~`, 'a', `${ESC}[8~`, 'd'))).toBe('abcd');
    expect(textOf(recordOf('abxc', `${ESC}[D`, `${ESC}[D`, `${ESC}[3~`))).toBe('abc');
    expect(textOf(recordOf('ab', `${ESC}[D`, `${ESC}[D`, `${ESC}[C`, 'X'))).toBe('aXb');
    // The cursor never leaves its line: Left at the start and Right at the end stay put.
    expect(textOf(recordOf('ab', `${ESC}[H`, `${ESC}[D`, 'X', `${ESC}[F`, `${ESC}[C`, 'Y'))).toBe('XabY');
    // Delete at the end of the line erases nothing.
    const atEnd = recordOf('ab', `${ESC}[3~`);
    expect(textOf(atEnd)).toBe('ab');
    expect(atEnd.size).toBe(2);
  });

  it('the cursor keys in their SS3 form (application mode) move it the same way', () => {
    expect(textOf(recordOf('1. to cncel', `${ESC}OD`, `${ESC}OD`, `${ESC}OD`, `${ESC}OD`, 'a'))).toBe('1. to cancel');
    expect(textOf(recordOf('bc', `${ESC}OH`, 'a', `${ESC}OF`, 'd'))).toBe('abcd');
    expect(textOf(recordOf('ac', `${ESC}OD`, `${ESC}OD`, `${ESC}OC`, 'b'))).toBe('abc');
    // The single-code-point SS3 form.
    expect(textOf(recordOf('ac', '\u008fD', 'b'))).toBe('abc');
  });

  it('a modified Left or Right, a function key, Page Up and Down, Tab and Shift-Tab move and change nothing', () => {
    for (const key of [`${ESC}[1;5D`, `${ESC}[1;2C`, `${ESC}[15~`, `${ESC}OP`, `${ESC}[5~`, `${ESC}[6~`, '\t', `${ESC}[Z`]) {
      const words = recordOf('ab', key, 'c');
      expect(textOf(words), JSON.stringify(key)).toBe('abc');
      expect(words.size).toBe(3);
    }
  });

  it('every other C0 and C1 changes nothing: NUL, Ctrl-L, -O, -T, -V, -X, -Y, -], and a C1 code point', () => {
    for (const ctl of ['\u0000', '\u000c', '\u000f', '\u0014', '\u0016', '\u0018', '\u0019', '\u001d', '\u0085', '\u0080']) {
      expect(textOf(recordOf('ab', ctl, 'c')), JSON.stringify(ctl)).toBe('abc');
    }
  });

  // THE FIX ROUND: the keys a line editor erases by, read as the edits they are,
  // and the keys that drop or replace what he typed, which forget it all.
  it('Ctrl-U forgets the record, every line of it, wherever the cursor is', () => {
    const words = recordOf(...keysOf(MIN), '\u0015');
    expect(textOf(words)).toBe('');
    expect(words.size).toBe(0);
    expect(words.col).toBe(0);
    expect(textOf(recordOf('abc', `${ESC}[D`, '\u0015', 'x'))).toBe('x');
    // Inside a paste it is a byte of the paste, and changes nothing.
    expect(textOf(recordOf(`${ESC}[200~ab\u0015c${ESC}[201~`))).toBe('abc');
  });

  it('Ctrl-W and Alt-Backspace erase a word back, its whitespace first, and at a line’s start the break above', () => {
    for (const key of ['\u0017', `${ESC}\u007f`, `${ESC}\b`]) {
      expect(textOf(recordOf('1. Yes please', key)), JSON.stringify(key)).toBe('1. Yes ');
      expect(textOf(recordOf('1. Yes please  ', key)), JSON.stringify(key)).toBe('1. Yes ');
      expect(textOf(recordOf('1. Yes', key, key)), JSON.stringify(key)).toBe('');
      // Mid-line, the cursor after `two `: what follows it stays.
      expect(textOf(recordOf('one two three', `${ESC}[D`, `${ESC}[D`, `${ESC}[D`, `${ESC}[D`, `${ESC}[D`, key)), JSON.stringify(key)).toBe('one three');
      const joined = recordOf('ab', '\n', key);
      expect(joined.lines.map((l) => l.join('')), JSON.stringify(key)).toEqual(['ab']);
      expect(joined.size).toBe(2);
    }
  });

  it('Ctrl-K erases from the cursor to the line’s end', () => {
    const words = recordOf('1. Yes please', `${ESC}[D`, `${ESC}[D`, `${ESC}[D`, `${ESC}[D`, `${ESC}[D`, `${ESC}[D`, `${ESC}[D`, '\u000b');
    expect(textOf(words)).toBe('1. Yes');
    expect(words.size).toBe(6);
    expect(textOf(recordOf('ab', '\u000b'))).toBe('ab');
  });

  it('Ctrl-A, Ctrl-E, Ctrl-B, Ctrl-F and Ctrl-D move and delete as Home, End, Left, Right and Delete', () => {
    expect(textOf(recordOf('bc', '\u0001', 'a', '\u0005', 'd'))).toBe('abcd');
    expect(textOf(recordOf('ac', '\u0002', 'b', '\u0006', 'd'))).toBe('abcd');
    expect(textOf(recordOf('abxc', '\u0002', '\u0002', '\u0004'))).toBe('abc');
    // Ctrl-A then Ctrl-K, the way a line is cleared in every Emacs-keyed editor.
    expect(textOf(recordOf('1. Yes, I trust this folder', '\u0001', '\u000b'))).toBe('');
  });

  it('Up and Down, in CSI and SS3 form and with a modifier, Ctrl-P, Ctrl-N, Ctrl-R, Ctrl-G, Ctrl-Z and Ctrl-\\ forget the record', () => {
    for (const key of [`${ESC}[A`, `${ESC}[B`, `${ESC}OA`, `${ESC}OB`, `${ESC}[1;5A`, `${ESC}[1;2B`, '\u0010', '\u000e', '\u0012', '\u0007', '\u001a', '\u001c']) {
      const words = recordOf(...keysOf(MIN), key);
      expect(textOf(words), JSON.stringify(key)).toBe('');
      expect(words.size).toBe(0);
      expect(textOf(recordOf('ab', key, 'c')), JSON.stringify(key)).toBe('c');
    }
    // Inside a paste none of them is a key.
    expect(textOf(recordOf(`${ESC}[200~ab${ESC}[Ac\u0012d${ESC}[201~`))).toBe('abcd');
  });

  it('Escape twice forgets, in one message or in two; once, or with any key between, forgets nothing', () => {
    expect(textOf(recordOf(...keysOf(MIN), ESC, ESC))).toBe('');
    expect(textOf(recordOf(...keysOf(MIN), `${ESC}${ESC}`))).toBe('');
    expect(textOf(recordOf(...keysOf(MIN), ESC))).toBe(MIN);
    expect(textOf(recordOf('ab', ESC, 'c', ESC))).toBe('abc');
    expect(textOf(recordOf('ab', ESC, `${ESC}[D`, ESC))).toBe('ab');
    // Escape then Up in one message (an Alt-Up): both forget.
    expect(textOf(recordOf('ab', `${ESC}${ESC}[A`))).toBe('');
  });

  it('a carriage return in the same message as his text is a submit too', () => {
    expect(textOf(recordOf('1. to cancel\r'))).toBe('');
    expect(textOf(recordOf('ab\rcd'))).toBe('cd');
    expect(textOf(recordOf(`${MIN.replace('\n', '\r')}`))).toBe('2. x');
  });

  it('the phone’s keys as ownBytesOf spells them: text and Enter in one write submit, Ctrl-U and Up forget', () => {
    expect(textOf(recordOf(ownBytesOf([{ t: '1. Yes, I trust this folder' }, { k: 'Enter' }])))).toBe('');
    expect(textOf(recordOf(ownBytesOf([{ t: '1. Yes' }, { k: 'C-u' }])))).toBe('');
    expect(textOf(recordOf(ownBytesOf([{ t: '1. Yes' }, { k: 'Up' }])))).toBe('');
    expect(textOf(recordOf(ownBytesOf([{ t: '1. Yes' }, { k: 'Escape' }, { k: 'Escape' }])))).toBe('');
    expect(textOf(recordOf(ownBytesOf([{ t: '1. Yes ok' }, { k: 'C-w' }])))).toBe('1. Yes ');
    expect(textOf(recordOf(ownBytesOf([{ t: '1. Yes' }, { k: 'BSpace' }, { t: 's' }])))).toBe('1. Yes');
  });

  it('a report alone, and beside a key: focus, colour (BEL and ST), device attributes', () => {
    const reports = [
      `${ESC}[I`,
      `${ESC}[O`,
      `${ESC}]11;rgb:1e1e/1e1e/1e1e${ESC}\\`,
      `${ESC}]10;rgb:d4d4/d4d4/d4d4\u0007`,
      `${ESC}[?1;2c`,
      `${ESC}[>0;276;0c`
    ];
    for (const r of reports) {
      expect(textOf(recordOf(r)), JSON.stringify(r)).toBe('');
      expect(textOf(recordOf(`${r}a`)), JSON.stringify(r)).toBe('a');
      expect(textOf(recordOf(`a${r}b`)), JSON.stringify(r)).toBe('ab');
    }
  });

  it('SGR and X10 mouse reports, the X10 raw bytes printable, change nothing', () => {
    expect(textOf(recordOf(`a${ESC}[<0;12;5M${ESC}[<0;12;5mb`))).toBe('ab');
    // X10: `ESC [ M` and three raw bytes, here a press at column 1, row 1, all printable.
    expect(textOf(recordOf(`a${ESC}[M !!b`))).toBe('ab');
    // Raw bytes that look like text and a carriage return are still the report's.
    expect(textOf(recordOf(`ab${ESC}[Mx\ryc`))).toBe('abc');
  });

  it('OSC, DCS, SOS, PM and APC to their terminator change nothing; an unterminated one runs to the chunk’s end', () => {
    for (const intro of [']', 'P', 'X', '^', '_']) {
      expect(textOf(recordOf(`a${ESC}${intro}some text${ESC}\\b`)), intro).toBe('ab');
      expect(textOf(recordOf(`a${ESC}${intro}some text\u0007b`)), intro).toBe('ab');
      expect(textOf(recordOf(`a${ESC}${intro}some text`)), intro).toBe('a');
    }
    for (const c1 of ['\u009d', '\u0090', '\u0098', '\u009e', '\u009f']) {
      expect(textOf(recordOf(`a${c1}some text\u009cb`)), JSON.stringify(c1)).toBe('ab');
    }
    // The single-code-point CSI.
    expect(textOf(recordOf('ab\u009b1;5Dc'))).toBe('abc');
  });

  it('ESC and any other character (Alt and a key) changes nothing', () => {
    expect(textOf(recordOf('ab', `${ESC}f`, `${ESC}b`, `${ESC}d`, 'c'))).toBe('abc');
    expect(textOf(recordOf(`ab${ESC}`))).toBe('ab');
  });

  it('wide, combining and astral characters are characters, one code point each', () => {
    const words = recordOf('日本', 'é', '🙂', `${ESC}[D`, 'x');
    expect(textOf(words)).toBe('日本éx🙂');
    expect(words.size).toBe(6);
    expect(textOf(recordOf('a🙂', '\u007f'))).toBe('a');
  });
});

// ---------------------------------------------------------------------------
// The reader, inside a bracketed paste
// ---------------------------------------------------------------------------

describe('the reader inside a bracketed paste', () => {
  it('a paste inserts its text, its CR, LF and CR LF break lines, TAB is a space, and nothing submits', () => {
    expect(textOf(recordOf(pasteOf(LONG)))).toBe(LONG);
    expect(textOf(recordOf(`${ESC}[200~a\nb\r\nc\rd${ESC}[201~`))).toBe('a\nb\nc\nd');
    expect(textOf(recordOf(`${ESC}[200~a\tb${ESC}[201~`))).toBe('a b');
    // A paste lands at the cursor, and what was after the cursor follows its last line.
    expect(textOf(recordOf('xy', `${ESC}[D`, pasteOf('1\n2')))).toBe('x1\n2y');
    // After the paste closes, a carriage return is a submit again.
    expect(textOf(recordOf(pasteOf(LONG), '\r'))).toBe('');
  });

  it('a paste split over two chunks keeps its state', () => {
    const text = MIN.replace(/\n/g, '\r');
    const words = recordOf(`${ESC}[200~${text.slice(0, 5)}`, `${text.slice(5)}${ESC}[201~`);
    expect(textOf(words)).toBe(MIN);
    expect(words.inPaste).toBe(false);
    // And open between them, so the carriage return in the second half is a line of the paste.
    const open = recordOf(`${ESC}[200~1. to cancel`);
    expect(open.inPaste).toBe(true);
    noteOwnWordsOn(open, `\r2. x${ESC}[201~`);
    expect(textOf(open)).toBe(MIN);
  });

  it('Ctrl-C, Backspace, a cursor key and any other escape sequence inside a paste change nothing', () => {
    expect(textOf(recordOf(`${ESC}[200~ab\u0003\u007f\b${ESC}[Dc${ESC}]0;title\u0007d${ESC}OD${ESC}[201~`))).toBe('abcd');
  });

  it('an empty paste, its two markers and nothing between them, changes nothing', () => {
    const words = recordOf('ab', `${ESC}[200~${ESC}[201~`);
    expect(textOf(words)).toBe('ab');
    expect(words.inPaste).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// The cap
// ---------------------------------------------------------------------------

describe('the cap (D3251-3)', () => {
  it('is 16,384 characters', () => {
    expect(OWN_WORDS_MAX).toBe(16_384);
  });

  it('one character past the cap clears the record first', () => {
    const words = recordOf(pasteOf('y'.repeat(OWN_WORDS_MAX)));
    expect(words.size).toBe(OWN_WORDS_MAX);
    noteOwnWordsOn(words, 'z');
    expect(textOf(words)).toBe('z');
    expect(words.size).toBe(1);
  });

  it('a paste longer than the cap keeps its tail', () => {
    const head = 'h'.repeat(OWN_WORDS_MAX);
    const tail = 'one\ntwo';
    const words = recordOf(pasteOf(`${head}${tail}`));
    expect(textOf(words)).toBe(tail);
    expect(words.size).toBe(7);
    expect(words.inPaste).toBe(false);
  });

  it('a line break counts one toward the cap, and a line break that would pass it clears', () => {
    const words = recordOf(pasteOf(`${'a'.repeat(OWN_WORDS_MAX - 1)}\n`));
    expect(words.size).toBe(OWN_WORDS_MAX);
    expect(words.lines.length).toBe(2);
    noteOwnWordsOn(words, '\n');
    expect(words.size).toBe(0);
    expect(textOf(words)).toBe('');
  });
});

// ---------------------------------------------------------------------------
// The replay
// ---------------------------------------------------------------------------

describe('the replay (D3251-10)', () => {
  it('a replayed screen is read as a paste of his followed by one line break, so his typing starts a fresh line', () => {
    const words = freshOwnWords();
    noteReplayedOn(words, '│ 1. Trust folder │\r\n│ 2. Don’t trust │\n\tend');
    expect(words.lines.map((l) => l.join(''))).toEqual(['│ 1. Trust folder │', '│ 2. Don’t trust │', ' end', '']);
    expect(words.col).toBe(0);
    expect(words.inPaste).toBe(false);
    // Nothing in it is a key: a carriage return is a line, an escape byte nothing.
    const plain = freshOwnWords();
    noteReplayedOn(plain, `a\rb${ESC}c`);
    expect(plain.lines.map((l) => l.join(''))).toEqual(['a', 'bc', '']);
    // His Enter on the armed resume then clears it all.
    noteOwnWordsOn(words, 'x');
    expect(words.lines.at(-1)?.join('')).toBe('x');
    noteOwnWordsOn(words, '\r');
    expect(textOf(words)).toBe('');
  });

  it('a replay marks the record replayed until it is cleared (his ruled round); a fresh record and his own typing are not', () => {
    expect(freshOwnWords().replayed).toBe(false);
    const typed = recordOf(...keysOf(MIN));
    expect(typed.replayed).toBe(false);
    const words = freshOwnWords();
    noteReplayedOn(words, '1. Trust folder\n2. Don’t trust');
    expect(words.replayed).toBe(true);
    noteOwnWordsOn(words, 'x');
    expect(words.replayed).toBe(true);
    // His Enter, Ctrl-C and every key that forgets clear the mark with the lines.
    for (const forget of ['\r', '\u0003', '\u0015', `${ESC}[A`]) {
      const w = freshOwnWords();
      noteReplayedOn(w, '1. Trust folder');
      noteOwnWordsOn(w, forget);
      expect(w.replayed, JSON.stringify(forget)).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// The match
// ---------------------------------------------------------------------------

/**
 * Every agent's input row as one of its committed windows draws it, the mark
 * read off that window: the agent's prompt glyph, its box, or nothing.
 */
const MARKS: ReadonlyArray<[agent: string, window: string, first: string, cont: string]> = [
  ['antigravity', 'a-antigravity-0032', '> ', '  '],
  ['claude 2.1.287 (U+00A0)', 'claude-prompt-pasted-2.1.287.ansi', '❯ ', '  '],
  ['codex', 'a-codex-0010', '› ', '  '],
  ['cursor', 'a-cursor-0003', '  → ', '    '],
  ['gemini', 'a-gemini-0010', ' >   ', '     '],
  ['grok', 'a-grok-0010', '  │ ❯ ', '  │   '],
  ['omp', 'a-omp-0002', '╰─ ', '   '],
  ['opencode', 'a-opencode-0010', '  ┃  ', '  ┃  '],
  ['pi', 'a-pi-0002', '', ''],
  ['qwen', 'a-qwen-0010', '> ', '  ']
];

describe('the match: a line of his on the screen (D3251-4)', () => {
  it('every agent’s input row: his lines behind its mark, read off its committed windows, are his', () => {
    for (const [agent, window, first, cont] of MARKS) {
      const typed = LONG.split('\n').map((t, i) => `${i === 0 ? first : cont}${t}`);
      const screen = ['some earlier output of the agent', '', ...typed, '', '  a footer the agent draws'].join('\n');
      expect(detectDialog(normalizeCapture(screen)), `${agent} (${window}): the parent reads his words as a question`).toBe(true);
      expect(dialogIsHisWords(normalizeCapture(screen), linesOf(LONG)), `${agent} (${window})`).toBe(true);
      expect(dialogIsHisWords(normalizeCapture(screen), recordOf(...keysOf(LONG))), `${agent} (${window}), typed`).toBe(true);
    }
  });

  it('the real input rows of Claude Code 2.1.287 and Codex 0.160.0 (build/fixtures/reply): a draft and a paste are his', () => {
    for (const name of ['claude-prompt-draft-2.1.287.ansi', 'codex-prompt-draft-0.160.0.ansi']) {
      expect(drawn(replyScreen(name), recordOf(...keysOf('hello draft'))), name).toBe(true);
      expect(drawn(replyScreen(name), recordOf(...keysOf('hello draftx'))), `${name}, a line it does not draw`).toBe(false);
    }
    for (const name of ['claude-prompt-pasted-2.1.287.ansi', 'codex-prompt-pasted-0.160.0.ansi']) {
      expect(drawn(replyScreen(name), linesOf('first pasted line\nsecond pasted line\nthird pasted line')), name).toBe(true);
      expect(drawn(replyScreen(name), linesOf('second pasted line')), `${name}, one line of it`).toBe(true);
    }
  });

  it('boxes: his line inside a box drawn with │ ┃ ║ | is his, the box stripped as the verdict strips it', () => {
    for (const [left, right] of [['│ ', ' │'], ['┃ ', ' ┃'], ['║ ', ' ║'], ['| ', ' |'], ['▌ ', ' ▕']]) {
      const screen = ['╭──────╮', `${left}please look at the tests${right}`, '╰──────╯'].join('\n');
      expect(drawn(screen, linesOf('please look at the tests')), left).toBe(true);
    }
  });

  it('a line that wraps, at a word or mid-word, is his across the rows it takes', () => {
    const line = 'keep the existing cache layer because it already works for the slow path';
    // Hard wrap at 30 columns, mid-word.
    const hard = ['> ' + line.slice(0, 28), '  ' + line.slice(28, 56), '  ' + line.slice(56)];
    expect(drawn(hard.join('\n'), linesOf(line))).toBe(true);
    // Word wrap: the break at a space, the space dropped or carried.
    const word = ['> keep the existing cache layer', '  because it already works for', '  the slow path'];
    expect(drawn(word.join('\n'), linesOf(line))).toBe(true);
    // And the wrapped rows may each carry the agent's quote mark.
    const quoted = ['> keep the existing cache layer', '> because it already works for', '> the slow path'];
    expect(drawn(quoted.join('\n'), linesOf(line))).toBe(true);
  });

  it('a blank row between two halves of a line breaks the tile', () => {
    expect(drawn(['> please look', '', '  at the tests'].join('\n'), linesOf('please look at the tests'))).toBe(false);
    expect(drawn(['> please look', '  at the tests'].join('\n'), linesOf('please look at the tests'))).toBe(true);
  });

  it('a whole line only: a row with more after his line, or his line with more after the row, is not his line', () => {
    expect(drawn('> please look at the tests  ctrl+c to stop', linesOf('please look at the tests'))).toBe(false);
    expect(drawn('> please look at the', linesOf('please look at the tests'))).toBe(false);
  });

  it('a line with no letter and no digit is ignored', () => {
    expect(drawn('> ---\n> ...', linesOf('---\n...'))).toBe(false);
    expect(drawn('> ---\n> ...', linesOf('---\n...\nx'))).toBe(false);
  });

  it('a substring of a row holds nothing', () => {
    expect(detectDialog(normalizeCapture(CLAUDE_GATE))).toBe(true);
    expect(dialogIsHisWords(normalizeCapture(CLAUDE_GATE), linesOf('Yes, I trust'))).toBe(false);
    expect(dialogIsHisWords(normalizeCapture(CLAUDE_GATE), linesOf('Yes'))).toBe(false);
    expect(dialogIsHisWords(normalizeCapture(CLAUDE_GATE), linesOf('to cancel'))).toBe(false);
    // The fix round: the one row a whole line of his can still hold a question
    // by, a last option with nothing below it, held by no piece of itself.
    expect(dialogIsHisWords(NO_HINT_QUESTION, linesOf('No, not'))).toBe(false);
    expect(dialogIsHisWords(NO_HINT_QUESTION, linesOf('2. No'))).toBe(false);
    // His ruled round: an input row whose first option the agent drew in its
    // prose above it. His whole line there is his; a piece of it is not.
    const prose = ['some output', '  2. x', '', '> 1. to cancel now'].join('\n');
    expect(detectDialog(prose)).toBe(true);
    expect(dialogIsHisWords(prose, linesOf('1. to cancel now'))).toBe(true);
    expect(dialogIsHisWords(prose, linesOf('1. to cancel'))).toBe(false);
  });

  it('a line holding a question’s row inside it holds nothing', () => {
    expect(dialogIsHisWords(normalizeCapture(CLAUDE_GATE), linesOf('pick 1. Yes, I trust this folder please'))).toBe(false);
    expect(dialogIsHisWords(normalizeCapture(CLAUDE_GATE), linesOf('1. Yes, I trust this folder please'))).toBe(false);
    expect(dialogIsHisWords(normalizeCapture(CLAUDE_GATE), linesOf('please Enter to confirm · Esc to cancel now'))).toBe(false);
    // And the last option, inside a longer line; since his ruled round the
    // whole line holds it neither, the option above it being the agent's.
    expect(dialogIsHisWords(NO_HINT_QUESTION, linesOf('2. No, not now please'))).toBe(false);
    expect(dialogIsHisWords(NO_HINT_QUESTION, linesOf('2. No, not now'))).toBe(false);
    // His ruled round: the same input row, a line of his holding its row and more.
    const prose = ['some output', '  2. x', '', '> 1. to cancel'].join('\n');
    expect(detectDialog(prose)).toBe(true);
    expect(dialogIsHisWords(prose, linesOf('1. to cancel'))).toBe(true);
    expect(dialogIsHisWords(prose, linesOf('1. to cancel now'))).toBe(false);
  });

  it('the agent’s own words before his line are no mark', () => {
    expect(detectDialog(normalizeCapture(GEMINI_GATE))).toBe(true);
    expect(dialogIsHisWords(normalizeCapture(GEMINI_GATE), linesOf('trust the files in this folder?'))).toBe(false);
    expect(dialogIsHisWords(normalizeCapture(GEMINI_GATE), linesOf('Trust folder (xxxxxx)'))).toBe(false);
    // The gate's lowest needed row, the agent's first word before his line.
    expect(dialogIsHisWords(normalizeCapture(CLAUDE_GATE), linesOf('to confirm · Esc to cancel'))).toBe(false);
  });

  it('his words that only finish rows the agent drew are his: his hint under its numbered prose', () => {
    const prose = ['● here is the plan', '1. First we read the file', '2. Then we change it', '', '> esc to cancel'].join('\n');
    expect(detectDialog(prose)).toBe(true);
    expect(dialogIsHisWords(prose, linesOf('esc to cancel'))).toBe(true);
    // The same screen with an empty record is read as it always was.
    expect(dialogIsHisWords(prose, freshOwnWords())).toBe(false);
  });

  it('his words beside a real question the agent drew: the question stays the agent’s', () => {
    const screen = [...normalizeCapture(CLAUDE_GATE).split('\n'), '', '> 1. to cancel', '  2. x'].join('\n');
    expect(dialogIsHisWords(screen, linesOf(MIN))).toBe(false);
    // His words alone, the same rows, are his.
    expect(dialogIsHisWords(['some output', '', '> 1. to cancel', '  2. x'].join('\n'), linesOf(MIN))).toBe(true);
  });

  it('reads its arguments and writes nothing', () => {
    const words = linesOf(MIN);
    const before = JSON.stringify(words);
    const screen = 'out\n> 1. to cancel\n  2. x';
    dialogIsHisWords(screen, words);
    expect(JSON.stringify(words)).toBe(before);
  });

  // THE FIX ROUND. A real question whose rows only include a line he typed is
  // the agent's whenever a row of the question lies below that line.
  it('a line of his that is one of a real question’s rows, with its other rows below, holds nothing', () => {
    const gate = normalizeCapture(CLAUDE_GATE);
    expect(detectDialog(gate)).toBe(true);
    // Its only first option, and its last (the hint below each).
    expect(dialogIsHisWords(gate, linesOf('1. Yes, I trust this folder'))).toBe(false);
    expect(dialogIsHisWords(gate, linesOf('2. No, exit'))).toBe(false);
    // Its question sentence, its options below it (Claude Code 2.1.287's real bash prompt).
    const bash = replyText('claude-bash-2.1.287.txt');
    expect(detectDialog(bash)).toBe(true);
    for (const line of ['Do you want to proceed?', '1. Yes', '2. Yes, and always allow access to /private/tmp/p318cap-claude-71621/proj-claude from this project', '4. No']) {
      expect(dialogIsHisWords(bash, linesOf(line)), line).toBe(false);
    }
    // gemini's last counted option, its third option below it.
    expect(dialogIsHisWords(normalizeCapture(GEMINI_GATE), linesOf('2. Trust parent folder (xxxx)'))).toBe(false);
    // His ruled round: the first option of a question whose other counted rows
    // the agent drew above it, behind its own mark, and a third option of the
    // agent's below it that the verdict does not count: still the agent's.
    const third = ['Do you want me to go on?', '  2. No', '', '❯ 1. Yes', '  3. Later'].join('\n');
    expect(detectDialog(third)).toBe(true);
    expect(dialogIsHisWords(third, linesOf('1. Yes'))).toBe(false);
    // Codex's approval and update prompt, each option.
    const approval = replyText('codex-approval-0.160.0.txt');
    expect(detectDialog(approval)).toBe(true);
    for (const line of ['1. Yes, proceed (y)', '3. No, and tell Codex what to do differently (esc)']) expect(dialogIsHisWords(approval, linesOf(line)), line).toBe(false);
  });

  it('his own dialog-shaped words stay his whatever the agent draws below his input row (antigravity’s esc to cancel while it works)', () => {
    const rows = WINDOWS.get('a-antigravity-0006')?.rows ?? [];
    const at = rows.findIndex((r) => /^>\s*$/.test(r));
    expect(at).toBeGreaterThan(0);
    const screen = normalizeCapture([...rows.slice(0, at), '> 1. to cancel', '  2. x', ...rows.slice(at + 1)].join('\n'));
    expect(detectDialog(screen)).toBe(true);
    // The agent's own row below his words is one the verdict counts.
    expect(dialogEvidenceRows(screen).slice(at + 2).some((c) => c !== 0)).toBe(true);
    expect(dialogIsHisWords(screen, linesOf(MIN))).toBe(true);
    expect(dialogIsHisWords(screen, recordOf(...keysOf(MIN)))).toBe(true);
  });

  it('a question’s own hint line, at its bottom and led by no prompt, holds nothing though he typed it word for word', () => {
    expect(dialogIsHisWords(normalizeCapture(CLAUDE_GATE), linesOf('Enter to confirm · Esc to cancel'))).toBe(false);
    expect(dialogIsHisWords(replyText('codex-approval-0.160.0.txt'), linesOf('Press enter to confirm or esc to cancel'))).toBe(false);
    expect(dialogIsHisWords(normalizeCapture(windowOf('a-codex-0002')), linesOf('Press enter to continue'))).toBe(false);
    // His own hint under the agent's numbered prose, behind the agent's prompt, is his;
    // with no prompt before it, it reads as the parent reads it.
    const prose = ['● here is the plan', '1. First we read the file', '2. Then we change it', ''];
    expect(dialogIsHisWords([...prose, '> esc to cancel'].join('\n'), linesOf('esc to cancel'))).toBe(true);
    expect(dialogIsHisWords([...prose, 'esc to cancel'].join('\n'), linesOf('esc to cancel'))).toBe(false);
  });

  it('the fix round’s residual (Q1), a line of his word for word a question’s last option with nothing of it below, holds nothing since his ruled round: no input starts under the option above it', () => {
    const question = NO_HINT_QUESTION;
    expect(detectDialog(question)).toBe(true);
    expect(dialogIsHisWords(question, linesOf('2. No, not now'))).toBe(false);
    // A further option or a hint below it, and it holds nothing either.
    expect(dialogIsHisWords(`${question}\n  3. Later`, linesOf('2. No, not now'))).toBe(false);
    expect(dialogIsHisWords(`${question}\nEsc to cancel`, linesOf('2. No, not now'))).toBe(false);
  });

  it('a line of his never runs on into a numbered row, so a question’s rows joined spell no line of his', () => {
    // The attack's Q7: the question sentence and both options typed as ONE line.
    const q7 = ['some output', '', 'Do you want me to run them now?', '❯ 1. Yes, run them', '  2. No, not now'].join('\n');
    expect(detectDialog(q7)).toBe(true);
    expect(dialogIsHisWords(q7, linesOf('Do you want me to run them now? 1. Yes, run them 2. No, not now'))).toBe(false);
    expect(dialogIsHisWords(q7, linesOf('1. Yes, run them 2. No, not now'))).toBe(false);
    // As a match, on a screen that is no question: the numbered row stops the tile.
    expect(drawn(['> 1. Yes, run them', '  2. No, not now'].join('\n'), linesOf('1. Yes, run them 2. No, not now'))).toBe(false);
    // A wrap onto a row that is not numbered is still his.
    expect(drawn(['> keep the cache because', '  2 of them are slow'].join('\n'), linesOf('keep the cache because 2 of them are slow'))).toBe(true);
  });

  it('the rows the verdict reads as a question’s: its own window and its own three classes, nothing else', () => {
    const padding = Array.from({ length: 30 }, (_, i) => (i === 0 ? '1. far above the window' : 'x'));
    const screen = [...padding, 'Do you want me to go on?', 'plain', '❯ 1. Yes', '  2. No', '  3. Later', 'esc to cancel', '', ''].join('\n');
    const ev = dialogEvidenceRows(screen);
    expect(ev.length).toBe(screen.split('\n').length);
    // Outside the window, and a third option, carry nothing the verdict counts.
    expect(ev[0]).toBe(0);
    expect([30, 31, 32, 33, 34, 35].map((n) => ev[n])).toEqual([EVIDENCE_HINT, 0, EVIDENCE_OPT1, EVIDENCE_OPT2, 0, EVIDENCE_HINT]);
    expect(ev.slice(36)).toEqual([0, 0]);
    // One row can carry two: his `1. to cancel` is a first option and a hint.
    expect(dialogEvidenceRows('❯ 1. to cancel')).toEqual([EVIDENCE_OPT1 | EVIDENCE_HINT]);
  });
});

// ---------------------------------------------------------------------------
// His ruled round (2026-11-14, "325.1 a"): his lines count as his only when
// they form one block that starts at the input's prompt mark
// ---------------------------------------------------------------------------

/** The inked rows of a question from the first that matches `from` to its end, as a person selects them. */
function copyOf(screen: string, from: RegExp): string[] {
  const rows = screen.split('\n');
  const at = rows.findIndex((r) => from.test(r));
  return rows.slice(Math.max(0, at)).filter((r) => r.trim() !== '').map((r) => r.trim());
}

describe('his ruled round: one block that starts at the input’s prompt mark', () => {
  const QUESTIONS_COPIED: ReadonlyArray<[name: string, screen: string, from: RegExp]> = [
    ['Claude Code 2.1.287’s bash prompt', replyText('claude-bash-2.1.287.txt'), /Do you want to proceed/],
    ['Codex 0.160.0’s approval', replyText('codex-approval-0.160.0.txt'), /Would you like to run/],
    ['gemini’s trust gate', normalizeCapture(GEMINI_GATE), /Do you trust/],
    ['antigravity’s run permission', normalizeCapture(fixture('antigravity-run-permission.txt')), /Run this command/],
    ['Claude Code’s workspace trust gate', normalizeCapture(CLAUDE_GATE), /Quick safety check/]
  ];

  it('a copy of a question in his draft after a line of his own holds nothing: his first line is on none of its rows', () => {
    for (const [name, screen, from] of QUESTIONS_COPIED) {
      expect(detectDialog(screen), name).toBe(true);
      const copy = copyOf(screen, from);
      expect(copy.length, name).toBeGreaterThan(2);
      expect(dialogIsHisWords(screen, linesOf(['you asked me this:', ...copy, 'why?'].join('\n'))), `${name}, pasted`).toBe(false);
      expect(dialogIsHisWords(screen, recordOf(...keysOf(['about this question:', ...copy].join('\n')))), `${name}, typed`).toBe(false);
    }
  });

  it('his rows that make the question are one block: a copy the question’s own blank row breaks holds nothing, the same lines in his input row are his', () => {
    const gateRows = '1. Yes, I trust this folder\n2. No, exit\nEnter to confirm · Esc to cancel';
    expect(dialogIsHisWords(normalizeCapture(CLAUDE_GATE), linesOf(gateRows))).toBe(false);
    expect(dialogIsHisWords(normalizeCapture(CLAUDE_GATE), recordOf(...keysOf(gateRows)))).toBe(false);
    const input = ['some output', '', '❯ 1. Yes, I trust this folder', '  2. No, exit', '  Enter to confirm · Esc to cancel'].join('\n');
    expect(detectDialog(input)).toBe(true);
    expect(dialogIsHisWords(input, linesOf(gateRows))).toBe(true);
    // A blank line of his own between his rows is part of his block (his second
    // ruled round, 2026-11-16): his record holds it, so the blank row it draws is his.
    const gapped = ['some output', '', '❯ 1. to cancel', '', '  2. x'].join('\n');
    expect(detectDialog(gapped)).toBe(true);
    expect(dialogIsHisWords(gapped, linesOf('1. to cancel\n\n2. x'))).toBe(true);
  });

  it('two of a question’s rows typed word for word hold nothing: the agent’s hint, or its next option, lies below them', () => {
    const hidden = replyText('codex-approval-hidden-line-0.160.0.txt');
    expect(detectDialog(hidden)).toBe(true);
    expect(dialogIsHisWords(hidden, recordOf(...keysOf('1. Yes, proceed (y)\n2. No, and tell Codex what to do differently (esc)')))).toBe(false);
    expect(dialogIsHisWords(normalizeCapture(GEMINI_GATE), recordOf(...keysOf('1. Trust folder (xxxxxx)\n2. Trust parent folder (xxxx)')))).toBe(false);
    // His two options under the agent's own question, nothing of the agent's below them: his.
    const asked = ['Would you like me to run it?', '', '› 1. Yes, proceed (y)', '  2. No, and tell Codex what to do differently (esc)'].join('\n');
    expect(detectDialog(asked)).toBe(true);
    expect(dialogIsHisWords(asked, recordOf(...keysOf('1. Yes, proceed (y)\n2. No, and tell Codex what to do differently (esc)')))).toBe(true);
  });

  it('his block starts where his input starts: behind the agent’s prompt mark, or at the row’s start under the input’s edge (pi’s rule, the blank line above opencode’s box)', () => {
    const rule = '─'.repeat(60);
    const pi = ['  some answer of the agent', rule, '1. to cancel', '2. x', rule, '~/pi (main)'].join('\n');
    expect(detectDialog(pi)).toBe(true);
    expect(dialogIsHisWords(pi, linesOf(MIN))).toBe(true);
    const opencode = ['     ▣  Build · some model', '', '  ┃  1. to cancel', '  ┃  2. x', `  ╹${'▀'.repeat(60)}`].join('\n');
    expect(detectDialog(opencode)).toBe(true);
    expect(dialogIsHisWords(opencode, linesOf(MIN))).toBe(true);
    // Behind a prompt mark, whatever is above it.
    expect(dialogIsHisWords(['some answer of the agent', '> 1. to cancel', '  2. x'].join('\n'), linesOf(MIN))).toBe(true);
    // No mark, and a row of the agent's above it holding letters: no input starts there.
    const under = ['some answer of the agent', '1. to cancel', '2. x'].join('\n');
    expect(detectDialog(under)).toBe(true);
    expect(dialogIsHisWords(under, linesOf(MIN))).toBe(false);
  });

  it('his first line not drawn whole starts no block: behind a prompt that holds letters (a shell’s), his dialog-shaped words read as the parent reads them', () => {
    const lettered = ['bash-5.2$ Do you want me to proceed?', '          1. Yes, go ahead', '          2. No, stop'].join('\n');
    expect(detectDialog(lettered)).toBe(true);
    expect(dialogIsHisWords(lettered, linesOf(LONG))).toBe(false);
    const bare = ['% Do you want me to proceed?', '  1. Yes, go ahead', '  2. No, stop'].join('\n');
    expect(detectDialog(bare)).toBe(true);
    expect(dialogIsHisWords(bare, linesOf(LONG))).toBe(true);
  });

  it('a restore’s replayed screen is not asked for a block: its blank rows are the page the shell printed', () => {
    const page = normalizeCapture(GEMINI_GATE);
    expect(detectDialog(page)).toBe(true);
    const replayed = freshOwnWords();
    noteReplayedOn(replayed, page);
    expect(replayed.replayed).toBe(true);
    expect(dialogIsHisWords(page, replayed)).toBe(true);
    // The same rows pasted by him are no input row of his: the gate's own box rows break them.
    expect(dialogIsHisWords(page, linesOf(page))).toBe(false);
  });

  it('a line more than a screen’s rows before his newest is not placed: it reads as the parent reads it', () => {
    const screen = ['> one', '  1. to cancel', '  2. x'].join('\n');
    expect(detectDialog(screen)).toBe(true);
    expect(dialogIsHisWords(screen, linesOf('one\n1. to cancel\n2. x'))).toBe(true);
    expect(dialogIsHisWords(screen, linesOf('one\n1. to cancel\n2. x\na\nb\nc'))).toBe(false);
  });

  it('his first line is placed whatever its age, since the block starts there', () => {
    // Four rows, and his first line older than his newest four.
    const screen = ['> one', '  1. to cancel', '  2. x', '  c'].join('\n');
    expect(detectDialog(screen)).toBe(true);
    expect(dialogIsHisWords(screen, linesOf('one\nfiller\n1. to cancel\n2. x\nc'))).toBe(true);
  });

  it('the budget counts every step of every line together: long runs of one mark below his input leave his later lines unplaced, read as the parent reads them', () => {
    const below = (width: number): string => ['> 1. to cancel', '  2. x', ...Array.from({ length: 22 }, () => '─'.repeat(width))].join('\n');
    for (const width of [80, 3_000]) expect(detectDialog(below(width)), String(width)).toBe(true);
    // Short runs: both his lines placed, his.
    expect(dialogIsHisWords(below(80), linesOf(MIN))).toBe(true);
    // Long runs: his first line's search spends the screen's one budget on
    // them, step by step, and his second line is left unplaced.
    expect(dialogIsHisWords(below(3_000), linesOf(MIN))).toBe(false);
  });

  it('the residual (Q1): a draft that is, from its very first line, a word for word copy of a question’s rows drawn with no gap, from its question sentence down, holds it; a line of his before it, and it holds nothing', () => {
    const bash = replyText('claude-bash-2.1.287.txt');
    const draft = 'Do you want to proceed?\n1. Yes\n2. Yes, and always allow access to /private/tmp/p318cap-claude-71621/proj-claude from this project';
    expect(dialogIsHisWords(bash, linesOf(draft))).toBe(true);
    expect(dialogIsHisWords(bash, linesOf(`please read this first\n${draft}`))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// His second ruled round (2026-11-16, "325.1 a"): "Tortie will count a blank
// line inside your draft as part of your typing"
// ---------------------------------------------------------------------------

describe('his second ruled round: a blank line of his is a blank row of his block', () => {
  const rule = '─'.repeat(60);
  const GAP_MID = '1. to cancel\n\n2. x';
  const GAP_LEAD = 'see below\n\n1. to cancel\n2. x';
  const GAP_LONG = 'Do you want me to proceed?\n\n1. Yes, go ahead\n2. No, stop';
  const GAP_REAL = 'Two ways to do this:\n\n1. keep the cache\n2. drop it\n\nWould you like me to pick one?';
  /** His draft in an input row: `first` before his first line, `cont` before the rest. */
  const drawnAs = (above: readonly string[], text: string, first: string, cont: string, below: readonly string[] = []): string =>
    [...above, ...text.split('\n').map((l, i) => (l === '' ? cont.trimEnd() : `${i === 0 ? first : cont}${l}`)), ...below].join('\n');
  /** The draft as he sends it from the desk: pasted, typed with line feeds, and typed with Alt-Enter. */
  const everyWay = (text: string): Array<[string, OwnWords]> => [
    ['pasted', linesOf(text)],
    ['typed', recordOf(...keysOf(text))],
    ['alt-enter', recordOf(...keysOf(text, `${ESC}\r`))]
  ];

  it('a blank line of his between his lines is a blank row of his block: typed, pasted and with Alt-Enter, behind a prompt mark and under the input’s edge', () => {
    const screens: Array<[string, string, string]> = [];
    for (const text of [GAP_MID, GAP_LEAD, GAP_LONG, GAP_REAL]) {
      screens.push(['Claude Code’s ❯', text, drawnAs(['some output', ''], text, '❯ ', '  ')]);
      screens.push(['a > prompt', text, drawnAs(['some answer of the agent'], text, '> ', '  ')]);
      screens.push(['pi’s rules', text, drawnAs(['  some answer of the agent', rule], text, '', '', [rule, '~/pi (main)'])]);
      screens.push(['opencode’s box', text, drawnAs(['     ▣  Build · some model', ''], text, '  ┃  ', '  ┃  ', [`  ╹${'▀'.repeat(60)}`])]);
      screens.push(['a boxed input', text, drawnAs(['╭──────────────╮'], text, '│ > ', '│   ').split('\n').map((r) => (r.startsWith('│') ? `${r.padEnd(60)}│` : r)).join('\n')]);
    }
    // Two blank lines of his, two blank rows.
    const twice = '1. to cancel\n\n\n2. x';
    screens.push(['two blank lines', twice, drawnAs(['some output', ''], twice, '❯ ', '  ')]);
    for (const [where, text, screen] of screens) {
      expect(detectDialog(screen), `${where}: ${text}`).toBe(true);
      for (const [how, words] of everyWay(text)) expect(dialogIsHisWords(screen, words), `${where}, ${how}: ${JSON.stringify(text)}`).toBe(true);
    }
  });

  it('a blank row his record does not hold still breaks the block: the agent’s own between his lines reads as the parent reads it', () => {
    // His lines with no blank line between them, drawn with a blank row between.
    const screen = ['some output', '', '❯ 1. to cancel', '', '  2. x'].join('\n');
    expect(detectDialog(screen)).toBe(true);
    for (const [how, words] of everyWay(MIN)) expect(dialogIsHisWords(screen, words), how).toBe(false);
    // A question's own blank row is not his either: his copy of its rows with no blank line.
    expect(dialogIsHisWords(normalizeCapture(CLAUDE_GATE), linesOf('1. Yes, I trust this folder\n2. No, exit\nEnter to confirm · Esc to cancel'))).toBe(false);
  });

  it('one more or fewer blank rows than the blank lines he typed between two of his lines break the block, and so does a blank line before a line not drawn below it', () => {
    const one = ['some output', '', '❯ 1. to cancel', '', '  2. x'].join('\n');
    const two = ['some output', '', '❯ 1. to cancel', '', '', '  2. x'].join('\n');
    for (const screen of [one, two]) expect(detectDialog(screen)).toBe(true);
    // The honest pairs, his.
    expect(dialogIsHisWords(one, linesOf('1. to cancel\n\n2. x'))).toBe(true);
    expect(dialogIsHisWords(two, linesOf('1. to cancel\n\n\n2. x'))).toBe(true);
    // One blank line, two blank rows; two blank lines, one blank row.
    expect(dialogIsHisWords(two, linesOf('1. to cancel\n\n2. x'))).toBe(false);
    expect(dialogIsHisWords(one, linesOf('1. to cancel\n\n\n2. x'))).toBe(false);
    // His blank line is followed by a line the screen does not draw below the blank row.
    expect(dialogIsHisWords(one, linesOf('1. to cancel\n\nsomething else\n2. x'))).toBe(false);
  });

  it('a line of his holding only a box’s marks is no blank line of his: a copy of gemini’s boxed question, its box rows carried as lines, holds nothing', () => {
    const gate = normalizeCapture(GEMINI_GATE);
    expect(detectDialog(gate)).toBe(true);
    // His copy as a terminal selection gives it: from its question line down,
    // the box's empty rows carried as lines of box marks, which have no form.
    const copy = copyOf(gate, /Do you trust/);
    expect(copy.filter((l) => /^│\s*│$/.test(l)).length).toBeGreaterThan(1);
    expect(dialogIsHisWords(gate, linesOf(copy.join('\n')))).toBe(false);
    expect(dialogIsHisWords(gate, recordOf(...keysOf(copy.join('\n'))))).toBe(false);
    // His own words with truly blank lines, in a boxed input, stay his.
    const boxed = ['╭──────────────╮', '│ > 1. to cancel'.padEnd(40), '│'.padEnd(40), '│   2. x'.padEnd(40)].map((r) => (r.startsWith('│') ? `${r}│` : r)).join('\n');
    expect(detectDialog(boxed)).toBe(true);
    expect(dialogIsHisWords(boxed, linesOf('1. to cancel\n\n2. x'))).toBe(true);
    // The same draft with a line of box marks where his blank line was: not his.
    expect(dialogIsHisWords(boxed, linesOf('1. to cancel\n│      │\n2. x'))).toBe(false);
  });

  it('only the lines the rule places hold his blank rows: the same words long before them, with a blank line between, hold none', () => {
    const screen = ['some answer of the agent', '> 1. to cancel', '', '  2. x'].join('\n');
    expect(detectDialog(screen)).toBe(true);
    const filler = Array.from({ length: 10 }, (_, i) => `older line ${String(i)}`);
    // His first line and his newest are drawn, with no blank line between his
    // newest two; the same two with a blank line between sit in the middle of
    // his record, more than a screen from either end, where nothing is drawn.
    const old = ['1. to cancel', ...filler, '1. to cancel', '', '2. x', ...filler, '1. to cancel', '2. x'].join('\n');
    expect(dialogIsHisWords(screen, linesOf(old))).toBe(false);
    // The same record with its newest two a screen's rows from its end, and a blank line between them: his.
    const near = ['1. to cancel', ...filler, '1. to cancel', '2. x', ...filler, '1. to cancel', '', '2. x'].join('\n');
    expect(dialogIsHisWords(screen, linesOf(near))).toBe(true);
  });

  it('the residual (Q1) with its blank rows: a draft that begins with a copy of a question’s rows, its blank rows kept, holds it; a line of his before the copy, and it holds nothing', () => {
    const gate = normalizeCapture(CLAUDE_GATE);
    const copy = '1. Yes, I trust this folder\n2. No, exit\n\nEnter to confirm · Esc to cancel';
    expect(dialogIsHisWords(gate, linesOf(copy))).toBe(true);
    expect(dialogIsHisWords(gate, linesOf(`${copy}\nwhy do you ask?`))).toBe(true);
    expect(dialogIsHisWords(gate, linesOf(`please read this first\n${copy}`))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// No clock (the fix round): every clock the process has moved on an hour
// ---------------------------------------------------------------------------

describe('no clock', () => {
  it('his words noted, then every clock moved on an hour: the rule answers exactly as it did', () => {
    const HOUR_MS = 3_600_000;
    const mine = ['some output', '', '> 1. to cancel', '  2. x'].join('\n');
    const gate = normalizeCapture(CLAUDE_GATE);
    const words = recordOf(...keysOf(MIN));
    const near = linesOf('Yes, I trust');
    const answers = (): boolean[] => [dialogIsHisWords(mine, words), dialogIsHisWords(gate, near), dialogIsHisWords(gate, linesOf('1. Yes, I trust this folder'))];
    const before = answers();
    expect(before).toEqual([true, false, false]);
    // Forward, never back: a window put back reads "too long ago" here.
    const realPerf = performance.now();
    const realUptime = process.uptime();
    const realHrtime = process.hrtime;
    const realHr = realHrtime.bigint();
    const fakeHrtime = Object.assign(
      (prev?: [number, number]): [number, number] => {
        const [s, ns] = realHrtime(prev);
        return [s + HOUR_MS / 1000, ns];
      },
      { bigint: (): bigint => realHrtime.bigint() + BigInt(HOUR_MS) * 1_000_000n }
    );
    vi.useFakeTimers({ now: Date.now() + HOUR_MS, toFake: ['Date'] });
    vi.spyOn(performance, 'now').mockReturnValue(realPerf + HOUR_MS);
    vi.spyOn(process, 'uptime').mockReturnValue(realUptime + HOUR_MS / 1000);
    process.hrtime = fakeHrtime as typeof process.hrtime;
    try {
      expect(performance.now() - realPerf).toBeGreaterThanOrEqual(HOUR_MS);
      expect(process.uptime() - realUptime).toBeGreaterThanOrEqual(HOUR_MS / 1000);
      expect(Number(process.hrtime.bigint() - realHr)).toBeGreaterThanOrEqual(HOUR_MS * 1_000_000);
      expect(answers()).toEqual(before);
    } finally {
      process.hrtime = realHrtime;
      vi.restoreAllMocks();
      vi.useRealTimers();
    }
  });
});

// ---------------------------------------------------------------------------
// The corpus boundary (§2.5, M5)
// ---------------------------------------------------------------------------

const NUMBERED_FIXTURES = [
  'claude-workspace-trust.txt',
  'antigravity-run-permission.txt',
  'gemini-trust-gate.txt',
  'claude-permission-prompt.txt',
  'codex-signin-choice.txt'
];
/** Two committed gates the numbered verdict never reads: their rows are records, never questions. */
const UNNUMBERED_FIXTURES = ['antigravity-trust-gate.txt', 'muse-trust-gate.txt'];
const SHORT_TEXTS = [
  'please look at the tests',
  '1. to cancel',
  '2. x',
  'Do you want me to proceed?',
  '1. Yes, go ahead',
  '2. No, stop',
  'y',
  '1',
  'a',
  'Yes',
  'No',
  'cancel',
  'to cancel',
  'Esc to cancel',
  'yes',
  'continue'
];

/** A row's form as the match reads it, for the property alone: the verdict's border strip, no whitespace. */
const formOf = (row: string): string => row.replace(/^[\s│┃║▌▏|]+|[\s│┃║▕|]+$/g, '').replace(/\s+/g, '');

describe('the corpus boundary (§2.5)', { timeout: 300_000 }, () => {
  it('over every committed numbered question, no one line of his holds it, and only a question’s own lowest needed row ever could', () => {
    const questions = [
      ...[...WINDOWS].map(([id, w]) => ({ id, screen: normalizeCapture(w.rows.join('\n')) })),
      ...NUMBERED_FIXTURES.map((f) => ({ id: f, screen: normalizeCapture(fixture(f)) }))
    ].filter((q) => detectDialogRows(q.screen).atChoice);
    const drafts = new Set<string>();
    for (const w of WINDOWS.values()) for (const r of w.rows) if (r.trim() !== '') drafts.add(r.trim());
    for (const f of [...NUMBERED_FIXTURES, ...UNNUMBERED_FIXTURES]) for (const r of fixture(f).split('\n')) if (r.trim() !== '') drafts.add(r.trim());
    for (const t of SHORT_TEXTS) drafts.add(t);
    let checks = 0;
    const held = new Map<string, string[]>();
    for (const q of questions) {
      for (const d of drafts) {
        checks += 1;
        if (dialogIsHisWords(q.screen, linesOf(d))) held.set(q.id, [...(held.get(q.id) ?? []), d]);
      }
    }
    // THE PROPERTY: every line that held a question is one of its own rows,
    // its border stripped and a mark that holds no letter or digit allowed,
    // and (the fix round) that row is the LOWEST the verdict reads on it: a
    // line equal to an option, a question sentence or any row with more of the
    // question below it holds nothing.
    for (const [id, lines] of held) {
      const screen = questions.find((q) => q.id === id)?.screen ?? '';
      const rows = screen.split('\n').map(formOf);
      const evidence = dialogEvidenceRows(screen);
      const lowest = evidence.reduce((low, classes, n) => (classes !== 0 ? n : low), -1);
      for (const d of lines) {
        const b = formOf(d);
        const at = rows.flatMap((r, n) => (r === b || (r.endsWith(b) && !/[\p{L}\p{N}]/u.test(r.slice(0, r.length - b.length))) ? [n] : []));
        expect(at.length, `${id}: "${d}" held it and is none of its rows`).toBeGreaterThan(0);
        expect(at, `${id}: "${d}" held it and is not its lowest needed row (${String(lowest)})`).toContain(lowest);
      }
    }
    // No short answer holds any question.
    for (const lines of held.values()) for (const t of ['y', '1', 'a', 'Yes', 'No', 'cancel', 'to cancel', 'yes', 'continue']) expect(lines).not.toContain(t);
    const pairs = [...held.values()].reduce((n, l) => n + l.length, 0);
    process.stdout.write(
      `[p3251 corpus] ${String(questions.length)} questions, ${String(drafts.size)} one-line records, ${String(checks)} checks, ` +
        `${String(pairs)} held, over ${String(held.size)} questions\n`
    );
    expect(questions.length).toBe(16);
    expect(drafts.size).toBe(1_786);
    expect(checks).toBe(28_576);
    // The spec step's rule was held by 56 pairs over all sixteen, every line one
    // of the question's own rows (build/p3251/SPEC.md §2.5). With the agent's
    // rows below his read as the agent's (the fix round), 6 pairs over 6, each
    // the question's own hint line: Claude Code's workspace trust, Codex's
    // update prompt and sign-in choice, and antigravity's run permission three
    // times; and with a hint of his asked to sit behind a prompt mark, none.
    expect(held.size).toBe(0);
    expect(pairs).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// The cost (§2.6, M6)
// ---------------------------------------------------------------------------

describe('the cost', { timeout: 300_000 }, () => {
  it('the rule over a question with records of several sizes, and the reader per key and per paste, in microseconds', () => {
    const question = normalizeCapture(CLAUDE_GATE);
    const time = (f: () => unknown, n: number): number => {
      for (let i = 0; i < Math.min(50, n); i += 1) f();
      const start = performance.now();
      for (let i = 0; i < n; i += 1) f();
      return ((performance.now() - start) * 1000) / n;
    };
    const r1 = linesOf('please look at the tests');
    const r3 = linesOf('1. to cancel\n2. x\nthird');
    const r24 = linesOf(Array.from({ length: 24 }, (_, i) => `line ${String(i)} of what he typed, ${'x'.repeat(40)}`).join('\n'));
    const rMax = linesOf('y'.repeat(OWN_WORDS_MAX - 10));
    const rMin = linesOf(MIN);
    const mine = `${windowOf('a-antigravity-0032')}\n> 1. to cancel\n  2. x`;
    // A contrived worst case: a line that is a long run of one mark ending in a
    // letter, over forty rows of that mark under a numbered question, which a
    // search that forgot what it had tried would take exponentially long over.
    // The search remembers, and stops at its budget, leaving the line unplaced.
    const runs = Array.from({ length: 40 }, () => '─'.repeat(80)).join('\n');
    const worstScreen = `${runs}\n1. a\n2. b\nesc to cancel`;
    const rWorst = linesOf(`${'─'.repeat(3_000)}a`);
    // The attack's contrived worst over many lines (the fix round): twenty rows
    // of blocks over Claude's gate, and 390 lines of his, each forty blocks and
    // a letter. One budget for the whole screen, so the lines after it ran out
    // are left unplaced, where a budget for each line cost a second a call.
    const banner = Array.from({ length: 20 }, () => '█'.repeat(80)).join('\n');
    const blockyScreen = `${banner}\n${question}`;
    const rBlocky = linesOf(Array.from({ length: 390 }, (_, i) => `${'█'.repeat(40)}${String.fromCodePoint(0x4e00 + i)}`).join('\n'));
    const out = {
      rule1: time(() => dialogIsHisWords(question, r1), 2_000),
      rule3: time(() => dialogIsHisWords(question, r3), 2_000),
      rule24: time(() => dialogIsHisWords(question, r24), 500),
      ruleMax: time(() => dialogIsHisWords(question, rMax), 200),
      ruleHis: time(() => dialogIsHisWords(mine, rMin), 2_000),
      ruleWorst: time(() => dialogIsHisWords(worstScreen, rWorst), 20),
      ruleBlocky: time(() => dialogIsHisWords(blockyScreen, rBlocky), 20),
      key: time(() => noteOwnWordsOn(freshOwnWords(), 'a'), 20_000),
      paste4k: time(() => noteOwnWordsOn(freshOwnWords(), pasteOf('x'.repeat(4_096))), 500)
    };
    process.stdout.write(
      `[p3251 cost] the rule: ${out.rule1.toFixed(1)} µs (1 line), ${out.rule3.toFixed(1)} µs (3), ${out.rule24.toFixed(1)} µs (24), ` +
        `${out.ruleMax.toFixed(1)} µs (a full record), ${out.ruleHis.toFixed(1)} µs (his own words), ` +
        `${out.ruleWorst.toFixed(0)} µs (the contrived worst case), ${out.ruleBlocky.toFixed(0)} µs (390 contrived lines); ` +
        `the reader: ${out.key.toFixed(2)} µs a key, ${out.paste4k.toFixed(1)} µs a 4 KB paste\n`
    );
    expect(dialogIsHisWords(mine, rMin)).toBe(true);
    // The worst case reads as the parent reads it: a question, not his.
    expect(dialogIsHisWords(worstScreen, rWorst)).toBe(false);
    // Generous bounds: a tick holds six captures at most.
    expect(out.rule24).toBeLessThan(20_000);
    expect(out.ruleMax).toBeLessThan(20_000);
    expect(out.ruleWorst).toBeLessThan(100_000);
    // The many-line worst case reads as the parent does too, and is bounded as one line is.
    expect(dialogIsHisWords(blockyScreen, rBlocky)).toBe(false);
    expect(out.ruleBlocky).toBeLessThan(100_000);
    expect(out.key).toBeLessThan(200);
  });
});

// ---------------------------------------------------------------------------
// The landing (2026-11-17), from the second ruled round's gate review and
// reverify: withHisBlankRows asks for a line of his whose tile ENDS on the row
// above his blank rows and one whose tile BEGINS on the row below them. On one
// row the two are the same row; on a line the input row wraps they are not, so
// these rows are what tell the two maps apart (`ablation:p3251` A60 swaps them).
// ---------------------------------------------------------------------------

describe('his blank line beside a wrapped line of his', () => {
  it('his blank line beside a line of his the input row wraps, above or below it, typed and pasted, is his', () => {
    const typedOf = (text: string): OwnWords => recordOf(...Array.from(text));
    const cases: Array<[string, string]> = [
      [
        'Do you want me to proceed with this?\n\n1. Yes, go ahead\n2. No, stop',
        ['some output', '', '❯ Do you want me to', '  proceed with this?', '', '  1. Yes, go ahead', '  2. No, stop'].join('\n')
      ],
      [
        'Do you want me to proceed?\n\n1. Yes, go ahead and do it now\n2. No, stop',
        ['some output', '', '❯ Do you want me to proceed?', '', '  1. Yes, go ahead and', '  do it now', '  2. No, stop'].join('\n')
      ],
      [
        '1. to cancel the whole thing now\n\n2. x',
        ['some output', '', '❯ 1. to cancel the whole', '  thing now', '', '  2. x'].join('\n')
      ]
    ];
    for (const [text, screen] of cases) {
      expect(detectDialog(screen)).toBe(true);
      expect(dialogIsHisWords(screen, linesOf(text))).toBe(true);
      expect(dialogIsHisWords(screen, typedOf(text))).toBe(true);
    }
  });
});
