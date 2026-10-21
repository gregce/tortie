#!/usr/bin/env node
/**
 * build/p348/wraps-fixtures.mjs — the pictures the phone's Copy join is held
 * to (Phase 348, build/p348/SPEC.md §4.6 step 17, D43 to D46).
 *
 * WHAT IT MAKES. `ios/TortieTests/Fixtures/wraps.json`: the 34 committed reply
 * captures in build/fixtures/reply/ (every `.txt` and `.ansi`, the source line
 * dropped), each drawn into a pane of a SCRATCH tmux server at 120 by 40 and
 * then narrowed to 78 by 40, so tmux reflows them and marks the rows it
 * soft-wrapped (research 142 §2.5: the captures carry no mark until a
 * narrowing reflows them), read through the SHIPPING read
 * (src/main/screen/read.ts `readScreenLocal`, on the road the SHIPPING
 * `marksRoadOf` gives the server's version) and composed by the SHIPPING
 * `composeScreen` (src/main/screen/compose.ts, whose `wrapsOf` sets the
 * marks); beside them §2.4's eight redraw cases (`cases`), drawn the same
 * way at 40 columns. For every picture it writes:
 *
 *   name       the capture's file name, or the case's name (G1a …)
 *   width      the picture's columns
 *   screen     the composed picture exactly as `/v1/screen` would carry it
 *              (`PocketScreen`, its `lines` the rows the phone holds), so a
 *              test decodes it with the phone's own decoder
 *   wraps      the picture's marks (`screen.wraps`, or [] when it has none)
 *   joined     `capture-pane -p -J` over the same pane, line for line
 *   kept       the rows tmux marked wrapped that the INK GUARD kept broken
 *              (the row's last column a space: D45 (b)), the alternate
 *              screen's every marked row among them (D45 (c))
 *   expected   what Copy over every row must give, line for line
 *              (ScreenSelecting.text, D46): each `joined` line, split at each
 *              kept row's end, each piece's trailing spaces dropped
 *
 * ios/TortieTests/WrapJoinTests.swift (the terminal builder's) requires
 * `ScreenSelecting.text` over every row of every picture to equal
 * `expected.joined(separator: "\n")`.
 *
 * WHAT IT HOLDS ITSELF TO BEFORE IT WRITES, by readings of its OWN, never the
 * shipping functions': every mark the composer set is a row tmux flagged
 * wrapped (`capture-pane -p -F -T -N` on 3.7b; on 3.6a this file's own
 * alignment of `-p -T -N` rows against `-p -J` lines, the re-derivation m4.mjs
 * made for §2.4); every flagged row the composer left unmarked is one whose
 * last column is a space by this file's own width reading, or the alternate
 * screen's, or the last row; the rows of every `joined` line, concatenated,
 * are that line; and the same captures read on Homebrew's 3.6a through the
 * fallback give the same marks and the same `expected` as 3.7b through `-F`
 * (§2.4: every case read the same on both). Any problem refuses the write.
 *
 *   node build/p348/wraps-fixtures.mjs --write       draw, read, compose, check, write (the integrator, ONCE)
 *   node build/p348/wraps-fixtures.mjs --check       the same, compared with the committed file byte for byte
 *   node build/p348/wraps-fixtures.mjs --self-test   this file's readers on recorded fixtures; no tmux, no tsx
 *   --file <path>                                     (with --write or --check) write or read that file instead
 *                                                     of the committed one: a builder's or a verifier's dry run
 *
 * --write and --check run under the pinned tsx (build/ts-runner.mjs), which
 * this file starts on itself, so they can call the shipping TypeScript. Exit
 * 0 when the fixture was written or matches, 1 on a difference or a problem,
 * 2 when it could not run (no vendored tmux, a read that never settled) or,
 * for --check, when Homebrew's 3.6a is absent so the fallback's half could not
 * be read.
 *
 * WHAT IT STARTS AND ENDS. One scratch tmux server per build, the vendored
 * build/vendor/tmux/bin/tmux (3.7b) and /opt/homebrew/bin/tmux (3.6a), each on
 * its own `-L p348w-<pid>-<label>` socket under a scratch TMUX_TMPDIR in
 * /private/tmp/p348w-<pid>-<label>, under a copy of resources/gmux-tmux.conf,
 * with a scratch HOME and ZDOTDIR, HISTFILE=/dev/null, SHELL=/bin/sh and no
 * TERM_SESSION_ID; every pane runs THIS FILE as a drawer (`--draw`), which
 * writes a capture's bytes once (and a second file's later, for G4b) and
 * sleeps, reading nothing else and running nothing. Every server is ended by
 * `kill-server` in a `finally` and its scratch folder removed. It never names
 * `-L gmux` or the default server, starts no Electron, no shell for a person,
 * no agent, and reads nothing under his home. His shell history's size and
 * time are stat'd before and after a write or a check, and a move fails it.
 */

import { execFile, spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { userInfo } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = fileURLToPath(import.meta.url);
const ROOT = resolve(dirname(HERE), '..', '..');
const TAG = '[p348 wraps]';
const J = JSON.stringify;
const INNER = 'P348_WRAPS_INNER';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** The committed fixture this file writes and checks. */
export const FIXTURE = join(ROOT, 'ios', 'TortieTests', 'Fixtures', 'wraps.json');
/** The file a run writes or reads: `--file <path>` for a dry run, else the committed fixture. */
function fixturePathOf(argv) {
  const at = argv.indexOf('--file');
  if (at === -1) return FIXTURE;
  const path = argv[at + 1] ?? '';
  if (path === '' || path.startsWith('--')) throw new Error('--file takes a path');
  return resolve(path);
}
/** The committed captures it draws. */
export const CAPTURES = join(ROOT, 'build', 'fixtures', 'reply');
/** The width the captures are drawn at, and the width they are narrowed to (SPEC §2.4, §4.6 step 17). */
export const DRAW_COLS = 120;
export const NARROW_COLS = 78;
export const DRAW_ROWS = 40;
/** The fixture's format, so a reader knows what it holds. */
export const FORMAT = 1;
/** The two builds, the first the one the fixture is written from. */
export const BUILDS = Object.freeze([
  { label: '37b', bin: join(ROOT, 'build', 'vendor', 'tmux', 'bin', 'tmux'), required: true },
  { label: '36a', bin: '/opt/homebrew/bin/tmux', required: false }
]);
/** The composer's question id and status for every picture: fixed, so a picture is the same on every run. */
export const FIXED_TURN = '0000000000000000-0';

// ---------------------------------------------------------------------------
// The drawer, run inside a pane: `--draw <file> [--then <file> <ms>] [--alt]`.
// It writes the bytes once and sleeps; it reads nothing else and runs nothing.
// ---------------------------------------------------------------------------

/** How long the drawer waits for its pane's size before it writes (m4.mjs waited 700 ms). */
export const DRAW_WAIT_MS = 400;

/** The drawer's arguments, read: `{ file, then, thenMs, alt }`, or a sentence. Pure. */
export function drawerArgs(argv) {
  const at = argv.indexOf('--draw');
  if (at === -1) return 'no --draw';
  const file = argv[at + 1];
  if (typeof file !== 'string' || file === '' || file.startsWith('--')) return '--draw takes a file';
  const thenAt = argv.indexOf('--then');
  let then = null;
  let thenMs = 0;
  if (thenAt !== -1) {
    then = argv[thenAt + 1] ?? '';
    thenMs = Number(argv[thenAt + 2] ?? '');
    if (then === '' || then.startsWith('--') || !Number.isInteger(thenMs) || thenMs < 0 || thenMs > 60_000) return '--then takes a file and a whole number of milliseconds to 60,000';
  }
  return { file, then, thenMs, alt: argv.includes('--alt') };
}

const isMain = process.argv[1] !== undefined && (() => {
  try {
    return realpathSync(resolve(process.argv[1])) === realpathSync(HERE);
  } catch {
    return false;
  }
})();

if (isMain && process.argv.includes('--draw')) {
  const args = drawerArgs(process.argv.slice(2));
  if (typeof args === 'string') {
    process.stderr.write(`${TAG} ${args}\n`);
    process.exit(2);
  }
  setTimeout(() => {
    if (args.alt) process.stdout.write('\u001b[?1049h');
    process.stdout.write(readFileSync(args.file));
  }, DRAW_WAIT_MS);
  if (args.then !== null) {
    const then = args.then;
    setTimeout(() => process.stdout.write(readFileSync(then)), DRAW_WAIT_MS + args.thenMs);
  }
  const end = () => process.exit(0);
  for (const sig of ['SIGHUP', 'SIGTERM', 'SIGINT']) process.on(sig, end);
  setTimeout(end, 600_000);
  setInterval(() => undefined, 1 << 30);
}

// ---------------------------------------------------------------------------
// THIS FILE'S OWN READERS (never the shipping functions'), pure
// ---------------------------------------------------------------------------

/** A capture's lines, a trailing newline dropped. */
export const linesOf = (text) => {
  const a = String(text ?? '').split('\n');
  if (a.length > 0 && a[a.length - 1] === '') a.pop();
  return a;
};

/** `capture-pane -F`'s prefix, read here: a run of tmux's flag letters or `-`, then one space. */
const PREFIX = /^([DHOPWX]+|-) /;
/** Each `-F` line's flag letters and text, or null for a line with no prefix. */
export function flagsOf(lines) {
  return lines.map((l) => {
    const m = PREFIX.exec(l);
    return m === null ? null : { letters: m[1], text: l.slice(m[0].length), wrapped: m[1].includes('W') };
  });
}

/**
 * THE FALLBACK, RE-DERIVED (m4.mjs's rule, §2.4): `-T -N` rows against `-J`
 * lines. For each line in order, rows are taken while the rest of the line
 * starts with the row's text; a row taken with some of the line still left is
 * marked; a line its rows do not consume exactly marks none of them, and its
 * rows are counted `disagreed`. An empty row ends a line only when the line is
 * empty too. Answers `{ marked, groups, disagreed }`, `groups` the row indices
 * of each line.
 */
export function alignedMarks(rows, joined) {
  const marked = rows.map(() => false);
  const groups = [];
  let r = 0;
  let disagreed = 0;
  for (const line of joined) {
    let rest = line;
    const start = r;
    let exact = false;
    while (r < rows.length) {
      const row = rows[r];
      if (row.length === 0 ? rest.length !== 0 : !rest.startsWith(row)) break;
      rest = rest.slice(row.length);
      r += 1;
      if (rest.length === 0) {
        exact = true;
        break;
      }
      marked[r - 1] = true;
    }
    if (!exact) {
      for (let k = start; k < r; k += 1) marked[k] = false;
      disagreed += 1;
    }
    groups.push({ rows: Array.from({ length: r - start }, (_, k) => start + k), exact });
  }
  return { marked, groups, disagreed };
}

/**
 * A code point's cells, read here for the ink guard's re-derivation: 2 for
 * the East Asian Wide and Fullwidth blocks and the emoji planes, 0 for a
 * combining mark or a zero-width character, 1 otherwise. `null` for a code
 * point this table cannot vouch for (a variation selector, a joiner), so a
 * row holding one is not re-derived.
 */
export function cellsOfPoint(cp) {
  if (cp === 0x200d || (cp >= 0xfe00 && cp <= 0xfe0f) || (cp >= 0xe0100 && cp <= 0xe01ef)) return null;
  if ((cp >= 0x0300 && cp <= 0x036f) || cp === 0x200b || cp === 0x200c || cp === 0x2060) return 0;
  if (
    (cp >= 0x1100 && cp <= 0x115f) ||
    (cp >= 0x2e80 && cp <= 0x303e) ||
    (cp >= 0x3041 && cp <= 0x33ff) ||
    (cp >= 0x3400 && cp <= 0x4dbf) ||
    (cp >= 0x4e00 && cp <= 0x9fff) ||
    (cp >= 0xa000 && cp <= 0xa4cf) ||
    (cp >= 0xac00 && cp <= 0xd7a3) ||
    (cp >= 0xf900 && cp <= 0xfaff) ||
    (cp >= 0xfe30 && cp <= 0xfe4f) ||
    (cp >= 0xff00 && cp <= 0xff60) ||
    (cp >= 0xffe0 && cp <= 0xffe6) ||
    (cp >= 0x1f300 && cp <= 0x1f64f) ||
    (cp >= 0x1f900 && cp <= 0x1f9ff) ||
    (cp >= 0x20000 && cp <= 0x3fffd)
  ) {
    return 2;
  }
  return 1;
}

/**
 * THE INK GUARD, RE-DERIVED over a `-T -N` row's text (D45 (b)): the row's
 * cells reach the last column and the character in it is not a space or a
 * tab. `true`, `false`, or `null` when the row holds a code point
 * {@link cellsOfPoint} cannot vouch for.
 */
export function inkAtEndOf(text, cols) {
  // A tab is one character over up to eight cells, which this reading cannot place.
  if (String(text).includes('\t')) return null;
  let used = 0;
  let last = null;
  for (const ch of String(text)) {
    const n = cellsOfPoint(ch.codePointAt(0));
    if (n === null) return null;
    used += n;
    if (n > 0) last = ch;
  }
  return used === cols && last !== null && last !== ' ' && last !== '\t';
}

/**
 * What Copy over every row must give, line for line (D46), from this file's
 * own readings: the rows grouped into lines by `flagged` (a row tmux flagged
 * wrapped goes on into the next one, the last row never), each group split at
 * every flagged row the picture did not mark (`wraps`), each piece the rows'
 * text concatenated with its trailing spaces dropped. Answers `{ expected,
 * kept, groups }`.
 */
export function expectedOf(rowsText, flagged, wraps) {
  const marks = new Set(wraps);
  const expected = [];
  const kept = [];
  const groups = [];
  let piece = '';
  let group = [];
  for (let r = 0; r < rowsText.length; r += 1) {
    const goesOn = flagged[r] === true && r < rowsText.length - 1;
    group.push(r);
    if (goesOn && marks.has(r)) {
      piece += rowsText[r];
      continue;
    }
    if (goesOn) kept.push(r);
    expected.push((piece + rowsText[r]).replace(/ +$/u, ''));
    piece = '';
    if (!goesOn) {
      groups.push(group);
      group = [];
    }
  }
  return { expected, kept, groups };
}

/**
 * Every disagreement between a picture and this file's own readings
 * (sentences; none is a picture this file will write):
 *   - the screen's `lines` are not as many as its rows, or `-T -N` read
 *     another number of rows;
 *   - a mark on a row tmux did not flag wrapped, out of order, or on the last
 *     row;
 *   - a mark on the alternate screen;
 *   - a flagged row on the main screen, not the last, whose ink this file
 *     reads otherwise than the mark says (marked with a space at its end, or
 *     left unmarked with ink there), unless its width cannot be read here;
 *   - a group of flagged rows whose text concatenated is not its `-J` line,
 *     or `joined` holding another number of lines;
 *   - on the fallback, the alignment disagreeing with the flags.
 */
export function pictureProblems({ name, screen, rowsText, flagged, joined, alternate }) {
  const p = [];
  const say = (x) => p.push(`${name}: ${x}`);
  const rows = Number(screen?.rows);
  const cols = Number(screen?.cols);
  if (!Array.isArray(screen?.lines) || screen.lines.length !== rows) say(`the screen holds ${String(screen?.lines?.length)} lines for ${String(rows)} rows`);
  if (rowsText.length !== rows) say(`-T -N read ${String(rowsText.length)} rows, not the screen's ${String(rows)}`);
  if (flagged.length !== rowsText.length) say(`the flags cover ${String(flagged.length)} rows, not ${String(rowsText.length)}`);
  const wraps = screen?.wraps ?? [];
  if (!Array.isArray(wraps)) return [...p, `${name}: wraps is not a list`];
  let prev = -1;
  for (const r of wraps) {
    if (!Number.isSafeInteger(r) || r <= prev) say(`wraps ${J(wraps)} is not ascending whole numbers`);
    prev = r;
    if (r >= rows - 1) say(`wraps marks row ${String(r)}, the last row or past it`);
    if (flagged[r] !== true) say(`wraps marks row ${String(r)}, which tmux did not flag wrapped`);
  }
  if (alternate && wraps.length > 0) say(`wraps marks ${J(wraps)} on the alternate screen`);
  if (!alternate) {
    for (let r = 0; r < rows - 1; r += 1) {
      if (flagged[r] !== true) continue;
      const ink = inkAtEndOf(rowsText[r] ?? '', cols);
      if (ink === null) continue;
      const marked = wraps.includes(r);
      if (ink && !marked) say(`row ${String(r)} is flagged wrapped and ends in ink by this file's reading, and the picture left it unmarked`);
      if (!ink && marked) say(`row ${String(r)} is marked, and by this file's reading its last column is a space`);
    }
  }
  const { groups } = expectedOf(rowsText, flagged, []);
  if (groups.length !== joined.length) say(`the flags group the rows into ${String(groups.length)} lines, and -J printed ${String(joined.length)}`);
  else {
    groups.forEach((g, k) => {
      const text = g.map((r) => rowsText[r]).join('');
      if (text !== joined[k]) say(`-J line ${String(k)} is not its rows' text concatenated (${J(String(joined[k]).slice(0, 40))} against ${J(text.slice(0, 40))})`);
    });
  }
  return p;
}

/** Every way a fixture file's shape is wrong (sentences), checked before it is written and when it is read. */
export function fixtureProblems(file) {
  const p = [];
  if (file === null || typeof file !== 'object') return ['the fixture is not an object'];
  if (file.format !== FORMAT) p.push(`format ${J(file.format)} is not ${String(FORMAT)}`);
  for (const list of ['pictures', 'cases']) {
    if (!Array.isArray(file[list])) {
      p.push(`${list} is not a list`);
      continue;
    }
    for (const pic of file[list]) {
      const name = String(pic?.name ?? '?');
      if (typeof pic?.name !== 'string' || pic.name === '') p.push(`a ${list} entry has no name`);
      if (!Number.isSafeInteger(pic?.width) || pic.width !== pic?.screen?.cols) p.push(`${name}: width ${J(pic?.width)} is not the screen's columns`);
      if (!Array.isArray(pic?.screen?.lines)) p.push(`${name}: the screen has no lines`);
      if (J(pic?.wraps) !== J(pic?.screen?.wraps ?? [])) p.push(`${name}: wraps ${J(pic?.wraps)} is not the screen's`);
      for (const k of ['joined', 'expected', 'kept']) if (!Array.isArray(pic?.[k])) p.push(`${name}: ${k} is not a list`);
      if (Array.isArray(pic?.joined) && Array.isArray(pic?.expected) && Array.isArray(pic?.kept) && pic.expected.length !== pic.joined.length + pic.kept.length) {
        p.push(`${name}: ${String(pic.expected.length)} expected lines for ${String(pic.joined.length)} joined and ${String(pic.kept.length)} kept`);
      }
    }
  }
  if (Array.isArray(file.pictures) && file.pictures.length !== 34) p.push(`${String(file.pictures.length)} pictures, not the 34 committed captures`);
  return p;
}

/** The fixture's text: two-space JSON and a final newline, keys in the order they were made. */
export const fixtureText = (file) => `${JSON.stringify(file, null, 1)}\n`;

/** The committed captures, sorted, each `{ name, bytes }` as a pane is drawn from it (the source line dropped, CR LF between rows). */
export function captureFiles(dir = CAPTURES) {
  const decodeAnsi = (line) => line.replace(/\\(\\|x[0-9a-f]{2})/g, (_, x) => (x === '\\' ? '\\' : String.fromCharCode(parseInt(x.slice(1), 16))));
  return readdirSync(dir)
    .filter((f) => /\.(txt|ansi)$/.test(f))
    .sort()
    .map((name) => {
      const ansi = name.endsWith('.ansi');
      const raw = readFileSync(join(dir, name), ansi ? 'latin1' : 'utf8').split('\n');
      if (raw[0]?.startsWith('#')) raw.shift();
      if (raw.length > 0 && raw[raw.length - 1] === '') raw.pop();
      const rows = ansi ? raw.map(decodeAnsi) : raw;
      return { name, bytes: Buffer.from(rows.join('\r\n'), ansi ? 'latin1' : 'utf8') };
    });
}

/**
 * §2.4's eight redraw cases (SPEC §2.4, research 142 §2.4), drawn at 40
 * columns and 8 rows (G4b at 60, then narrowed to 30): what each writes, and
 * what the pane SHOWS, which `expected` must equal on every case but G2 (a
 * full-width overwrite with no erase keeps a stale mark: stated, D46).
 */
export const CASES = Object.freeze([
  { name: 'G1a', cols: 40, bytes: 'A'.repeat(100), shows: ['A'.repeat(100)] },
  { name: 'G1b', cols: 40, bytes: `${'A'.repeat(100)}\u001b[Hstatus: ok\u001b[K`, shows: ['status: ok', 'A'.repeat(60)] },
  { name: 'G2', cols: 40, bytes: `${'A'.repeat(100)}\u001b[H${'B'.repeat(40)}short line two`, shows: ['B'.repeat(40), `short line two${'A'.repeat(26)}`, 'A'.repeat(20)], stale: true },
  { name: 'G3', cols: 40, bytes: `${'A'.repeat(100)}\u001b[H\u001b[2Kstatus: ok`, shows: ['status: ok', 'A'.repeat(60)] },
  { name: 'G5', cols: 40, bytes: `${'P'.repeat(60)}\r\u001b[Aprogress 50%`, shows: [`progress 50%${'P'.repeat(48)}`] },
  { name: 'atSpace', cols: 40, bytes: `${'x'.repeat(39)} after-the-space`, shows: ['x'.repeat(39), 'after-the-space'] },
  { name: 'G4b', cols: 60, narrow: 30, bytes: 'L'.repeat(150), then: Array.from({ length: 6 }, (_, i) => `\u001b[${String(i + 1)};1Hline ${String(i + 1)}\u001b[K`).join(''), shows: ['line 1', 'line 2', 'line 3', 'line 4', 'line 5', 'line 6'] },
  { name: 'alt', cols: 40, bytes: 'A'.repeat(100), alt: true, shows: ['A'.repeat(40), 'A'.repeat(40), 'A'.repeat(20)] }
]);

/** A case's `expected` against what its pane shows: the shown lines, then blank lines to the screen's rows. */
export function showsProblem(c, expected) {
  if (c.stale === true) return null;
  const want = [...c.shows];
  while (want.length < expected.length) want.push('');
  return J(expected) === J(want) ? null : `${c.name}: Copy would give ${J(expected.slice(0, c.shows.length + 1))} where the pane shows ${J(c.shows)}`;
}

/** His shell history's size and time, under the ACCOUNT's home (never $HOME), and nothing else of it. */
export function historyStat() {
  return ['.zsh_history', '.bash_history']
    .map((n) => {
      try {
        const s = statSync(join(userInfo().homedir, n));
        return `${String(s.size)} ${String(Math.floor(s.mtimeMs / 1000))}`;
      } catch {
        return 'none';
      }
    })
    .join('|');
}

// ---------------------------------------------------------------------------
// --self-test: this file's readers on recorded fixtures. No tmux, no tsx.
// ---------------------------------------------------------------------------

function selfTest() {
  let failures = 0;
  const say = (ok, text) => {
    if (!ok) failures += 1;
    process.stdout.write(`${ok ? 'ok  ' : 'FAIL'} ${text}\n`);
  };
  const A40 = 'A'.repeat(40);
  // The recorded readings: §2.4's G1a, G1b and G4b as 3.7b printed them at 40 (and 30) columns, eight rows.
  const g1a = { rows: [A40, A40, 'A'.repeat(20), '', '', '', '', ''], joined: ['A'.repeat(100), '', '', '', '', ''], F: ['W ' + A40, 'W ' + A40, '- ' + 'A'.repeat(20), '- ', '- ', '- ', '- ', '- '] };
  const g1b = { rows: [`status: ok${' '.repeat(30)}`, A40, 'A'.repeat(20), '', '', '', '', ''], joined: [`status: ok${' '.repeat(30)}${'A'.repeat(60)}`, '', '', '', '', ''], F: [`W status: ok${' '.repeat(30)}`, 'W ' + A40, '- ' + 'A'.repeat(20), '- ', '- ', '- ', '- ', '- '] };
  const l30 = (n) => `line ${String(n)}${' '.repeat(24)}`;
  const g4b = { rows: [l30(1), l30(2), l30(3), l30(4), l30(5), l30(6), '', ''], joined: [`${l30(1)}${l30(2)}${l30(3)}`, `${l30(4)}${l30(5)}${l30(6)}`, '', ''], F: ['W ' + l30(1), 'W ' + l30(2), '- ' + l30(3), 'W ' + l30(4), 'W ' + l30(5), '- ' + l30(6), '- ', '- '] };
  const screenOf = (rows, cols, wraps) => ({ cols, rows: rows.length, lines: rows.map((t) => (t === '' ? [] : [{ text: t, style: 0, cells: t.length }])), ...(wraps.length > 0 ? { wraps } : {}) });

  // The flags reader.
  const fl = flagsOf(['W x', 'PW y', '- z', 'HW ', 'no prefix']);
  say(fl[0].wrapped && fl[1].wrapped && !fl[2].wrapped && fl[3].wrapped && fl[3].text === '' && fl[4] === null, 'flagsOf reads a run of letters, W among others, an empty row, and no prefix as null');
  // The fallback's re-derivation against the flags, on each recorded case.
  for (const [name, c] of [['G1a', g1a], ['G1b', g1b], ['G4b', g4b]]) {
    const a = alignedMarks(c.rows, c.joined);
    say(J(a.marked) === J(flagsOf(c.F).map((x) => x.wrapped)) && a.disagreed === 0, `alignedMarks equals the -F flags on ${name} (${J(a.marked)})`);
  }
  {
    const a = alignedMarks(['ab', 'cd', 'ef'], ['abXd', 'ef']);
    say(J(a.marked) === J([false, false, false]) && a.disagreed >= 1, 'alignedMarks marks nothing on a line its rows do not consume, and counts the disagreement');
    const b = alignedMarks(['ab', 'cd', 'ef', 'gh'], ['abcd', 'efgh']);
    say(J(b.marked) === J([true, false, true, false]) && b.disagreed === 0 && J(b.groups.map((g) => g.rows)) === J([[0, 1], [2, 3]]), 'alignedMarks groups two wrapped lines in order, the last row of each unmarked');
  }
  // The ink guard's re-derivation.
  say(inkAtEndOf(A40, 40) === true && inkAtEndOf(`status: ok${' '.repeat(30)}`, 40) === false && inkAtEndOf('A'.repeat(39), 40) === false, 'inkAtEndOf: ink in the last column, a space there, and a row that stops short');
  say(inkAtEndOf(`${'x'.repeat(38)}中`, 40) === true && inkAtEndOf(`${'x'.repeat(39)}中`, 40) === false && inkAtEndOf(`${'x'.repeat(38)}‍`, 40) === null, 'inkAtEndOf: a wide character ending the row is ink, one past it is not, a joiner is unread');
  // expected: the joins Copy makes, against what each pane shows (§2.4's own grading).
  {
    const fa = flagsOf(g1a.F).map((x) => x.wrapped);
    const e = expectedOf(g1a.rows, fa, [0, 1]);
    say(J(e.expected) === J(['A'.repeat(100), '', '', '', '', '']) && e.kept.length === 0 && showsProblem(CASES[0], e.expected) === null, 'G1a: both marked rows join, and Copy gives the 100 As the pane shows');
    const fb = flagsOf(g1b.F).map((x) => x.wrapped);
    const eb = expectedOf(g1b.rows, fb, [1]);
    say(J(eb.expected.slice(0, 2)) === J(['status: ok', 'A'.repeat(60)]) && J(eb.kept) === J([0]) && showsProblem(CASES[1], eb.expected) === null, 'G1b: the ink guard keeps row 0 broken, and Copy gives status: ok then 60 As, as the pane shows');
    const wrong = expectedOf(g1b.rows, fb, [0, 1]);
    say(showsProblem(CASES[1], wrong.expected) !== null, 'G1b joined by the width rule (the first draft\'s) reads red against what the pane shows');
    const f4 = flagsOf(g4b.F).map((x) => x.wrapped);
    const e4 = expectedOf(g4b.rows, f4, []);
    say(J(e4.expected.slice(0, 6)) === J(['line 1', 'line 2', 'line 3', 'line 4', 'line 5', 'line 6']) && J(e4.kept) === J([0, 1, 3, 4]) && showsProblem(CASES[6], e4.expected) === null, 'G4b: no row marked (a space ends each), four kept breaks, and Copy gives line 1 to line 6');
  }
  // pictureProblems: the honest readings, then one break each.
  {
    const fb = flagsOf(g1b.F).map((x) => x.wrapped);
    const honest = { name: 'G1b', screen: screenOf(g1b.rows, 40, [1]), rowsText: g1b.rows, flagged: fb, joined: g1b.joined, alternate: false };
    say(pictureProblems(honest).length === 0, `pictureProblems passes G1b as the composer marks it (${J(pictureProblems(honest))})`);
    const plant = (edit) => {
      const x = structuredClone(honest);
      edit(x);
      return pictureProblems(x);
    };
    say(plant((x) => (x.screen.wraps = [0, 1])).some((s) => /last column is a space/.test(s)), 'pictureProblems: the width rule\'s mark on G1b\'s row 0 reads red (its last column is a space)');
    say(plant((x) => delete x.screen.wraps).some((s) => /ends in ink/.test(s)), 'pictureProblems: a flagged row ending in ink left unmarked reads red');
    say(plant((x) => (x.screen.wraps = [2])).some((s) => /did not flag/.test(s)), 'pictureProblems: a mark on a row tmux did not flag reads red');
    say(plant((x) => (x.screen.wraps = [1, 7])).some((s) => /last row/.test(s)), 'pictureProblems: a mark on the last row reads red');
    say(plant((x) => (x.alternate = true)).some((s) => /alternate screen/.test(s)), 'pictureProblems: a mark on the alternate screen reads red');
    say(plant((x) => (x.joined = [x.joined[0].slice(1), ...x.joined.slice(1)])).some((s) => /concatenated/.test(s)), 'pictureProblems: a -J line that is not its rows\' text reads red');
    say(plant((x) => x.joined.pop()).some((s) => /lines/.test(s)), 'pictureProblems: -J holding another number of lines reads red');
    say(plant((x) => x.rowsText.pop()).length > 0, 'pictureProblems: -T -N holding another number of rows reads red');
  }
  // fixtureProblems: a honest shape, then breaks.
  {
    const fb = flagsOf(g1b.F).map((x) => x.wrapped);
    const e = expectedOf(g1b.rows, fb, [1]);
    const pic = (name) => ({ name, width: 40, screen: screenOf(g1b.rows, 40, [1]), wraps: [1], joined: g1b.joined, kept: e.kept, expected: e.expected });
    const honest = { format: FORMAT, about: 'x', pictures: Array.from({ length: 34 }, (_, k) => pic(`c${String(k)}`)), cases: [pic('G1b')] };
    say(fixtureProblems(honest).length === 0, `fixtureProblems passes a whole fixture (${J(fixtureProblems(honest).slice(0, 2))})`);
    const plant = (edit) => {
      const x = structuredClone(honest);
      edit(x);
      return fixtureProblems(x).length > 0;
    };
    say(plant((x) => x.pictures.pop()), 'fixtureProblems: 33 pictures read red');
    say(plant((x) => (x.pictures[0].wraps = [])), 'fixtureProblems: wraps that are not the screen\'s read red');
    say(plant((x) => x.pictures[0].expected.pop()), 'fixtureProblems: expected lines that do not account for every kept break read red');
    say(plant((x) => (x.format = 2)), 'fixtureProblems: another format reads red');
    say(plant((x) => (x.cases[0].width = 41)), 'fixtureProblems: a width that is not the screen\'s reads red');
  }
  // The drawer's arguments.
  {
    const d = drawerArgs(['--draw', '/x/f', '--then', '/x/g', '2500', '--alt']);
    say(d.file === '/x/f' && d.then === '/x/g' && d.thenMs === 2500 && d.alt === true && typeof drawerArgs(['--draw']) === 'string' && typeof drawerArgs(['--draw', '/x', '--then', '/y', 'soon']) === 'string', 'drawerArgs reads a file, a second one and its delay, and refuses a malformed line');
  }
  // The committed captures and cases.
  {
    const caps = captureFiles();
    say(caps.length === 34 && caps.every((c) => c.bytes.length > 0 && !c.bytes.toString('latin1').startsWith('#')), `the committed captures are 34 and none keeps its source line (${String(caps.length)})`);
    say(CASES.length === 8 && CASES.filter((c) => c.stale === true).map((c) => c.name).join() === 'G2', "the eight cases are §2.4's, G2 the one stated stale join");
  }
  // The committed fixture, when the integrator has written it.
  if (existsSync(FIXTURE)) {
    let file = null;
    try {
      file = JSON.parse(readFileSync(FIXTURE, 'utf8'));
    } catch (err) {
      say(false, `the committed fixture does not read: ${String(err?.message ?? err)}`);
    }
    if (file !== null) {
      const p = fixtureProblems(file);
      say(p.length === 0, `the committed fixture is whole (${String(file.pictures?.length)} pictures, ${String(file.cases?.length)} cases)${p.length === 0 ? '' : `: ${J(p.slice(0, 3))}`}`);
      const kept = [...(file.pictures ?? [])].reduce((n, x) => n + (x.kept?.length ?? 0), 0);
      const joins = [...(file.pictures ?? [])].reduce((n, x) => n + (x.wraps?.length ?? 0), 0);
      say(joins > 0, `the committed pictures carry ${String(joins)} marks and ${String(kept)} kept breaks (§2.4 measured 67 and 24)`);
    }
  } else {
    process.stdout.write(`note ${FIXTURE.slice(ROOT.length + 1)} is not written yet: the integrator runs --write once, after the Mac's marks have landed\n`);
  }
  process.stdout.write(failures === 0 ? `${TAG} self-test PASS: every reader on its recorded fixtures, each break red; no tmux started\n` : `${TAG} self-test FAIL: ${String(failures)}\n`);
  return failures === 0;
}

// ---------------------------------------------------------------------------
// --write and --check: the scratch servers, the shipping read, the composer
// ---------------------------------------------------------------------------

/** The scratch world of one build: its socket, its folder, its env, and a runner. */
function scratchServer(build) {
  const dir = `/private/tmp/p348w-${String(process.pid)}-${build.label}`;
  const socket = `p348w-${String(process.pid)}-${build.label}`;
  if (socket === 'gmux' || socket === 'default') throw new Error('refusing the person\'s own socket');
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(join(dir, 'h'), { recursive: true });
  mkdirSync(join(dir, 't'), { recursive: true, mode: 0o700 });
  mkdirSync(join(dir, 'f'), { recursive: true });
  const conf = join(dir, 'gmux-tmux.conf');
  copyFileSync(join(ROOT, 'resources', 'gmux-tmux.conf'), conf);
  const env = { PATH: '/usr/bin:/bin:/usr/sbin:/sbin', HOME: join(dir, 'h'), ZDOTDIR: join(dir, 'h'), HISTFILE: '/dev/null', TMUX_TMPDIR: join(dir, 't'), SHELL: '/bin/sh', LANG: 'en_US.UTF-8', LC_ALL: 'en_US.UTF-8', TERM: 'xterm-256color' };
  const t = (args) => {
    const r = spawnSync(build.bin, ['-L', socket, '-f', conf, ...args], { env, encoding: 'utf8', timeout: 30_000, maxBuffer: 64 * 1024 * 1024 });
    return { code: r.status, out: r.stdout ?? '', err: String(r.stderr ?? '').trim() };
  };
  /** The shipping read's spawn: the same binary, socket and config, asynchronously, stdout or a throw. */
  const spawn = (args, options = {}) =>
    new Promise((ok, fail) => {
      execFile(build.bin, ['-L', socket, '-f', conf, ...args], { env, encoding: 'utf8', timeout: options.timeoutMs ?? 5_000, maxBuffer: 64 * 1024 * 1024 }, (err, stdout) => (err ? fail(err) : ok(String(stdout))));
    });
  return { dir, socket, conf, env, t, spawn, build };
}

/** Poll until `test()` answers truthy, or null past `ms`. */
async function until(test, ms, every = 100) {
  const started = Date.now();
  for (;;) {
    const v = await test();
    if (v) return v;
    if (Date.now() - started > ms) return null;
    await sleep(every);
  }
}

/** A pane's plain capture, settled: the same twice, 150 ms apart. */
async function settled(sv, target, ms = 8_000) {
  let last = null;
  return until(async () => {
    const now = sv.t(['capture-pane', '-p', '-t', target]).out;
    const same = now === last;
    last = now;
    return same ? now : null;
  }, ms, 150);
}

/**
 * Draw one picture in a session of its own, at `cols` by `rows`, narrowed to
 * `narrow` when given; answers the session's `$`-id once the pane settled, or
 * a sentence.
 */
async function drawSession(sv, k, { bytes, cols, rows, narrow, then, thenMs, alt, waitFor }) {
  const file = join(sv.dir, 'f', `d${String(k)}`);
  writeFileSync(file, bytes);
  const argv = [process.execPath, HERE, '--draw', file];
  if (then !== undefined) {
    const second = join(sv.dir, 'f', `d${String(k)}b`);
    writeFileSync(second, then);
    argv.push('--then', second, String(thenMs));
  }
  if (alt === true) argv.push('--alt');
  const made = sv.t(['new-session', '-d', '-P', '-F', '#{session_id}', '-s', `c${String(k)}`, '-x', String(cols), '-y', String(rows), ...argv]);
  const id = made.out.trim();
  if (made.code !== 0 || !/^\$[0-9]+$/.test(id)) return `the session for picture ${String(k)} was not made (${made.err})`;
  const drawn = await until(() => sv.t(['capture-pane', '-p', '-t', id]).out.includes(waitFor), 10_000);
  if (drawn === null) return `picture ${String(k)} never drew ${J(waitFor.slice(0, 20))}`;
  if (narrow !== undefined) {
    sv.t(['resize-window', '-t', id, '-x', String(narrow), '-y', String(rows)]);
    const width = await until(() => sv.t(['display-message', '-p', '-t', id, '#{pane_width}']).out.trim() === String(narrow), 5_000);
    if (width === null) return `picture ${String(k)} was never narrowed to ${String(narrow)}`;
  }
  if (then !== undefined) {
    const second = await until(() => sv.t(['capture-pane', '-p', '-t', id]).out.includes('line 6'), 10_000);
    if (second === null) return `picture ${String(k)}'s second write never drew`;
  }
  if ((await settled(sv, id)) === null) return `picture ${String(k)} never held still`;
  return id;
}

/** The shipping read and composer over one session, and this file's own readings of the same pane. */
async function pictureOf(sv, ship, id, name) {
  const version = sv.t(['display-message', '-p', '#{version}']).out.trim();
  const road = ship.marksRoadOf(version);
  const core = {
    listSessions: () => [],
    tmuxIdOf: () => null,
    manifest: { getSession: () => undefined },
    control: { connected: false, sendCommand: async () => { throw new Error('no control client in this script'); } },
    activity: { noteUserInput: () => undefined }
  };
  let roadRefused = false;
  const reading = await ship.readScreenLocal(core, id, { spawn: sv.spawn, timeoutMs: 5_000, road, onRoadRefused: () => (roadRefused = true) });
  if (reading === null) return { problem: `${name}: the shipping read answered nothing` };
  const composed = ship.composeScreen(reading, { turn: FIXED_TURN, status: 'idle', typable: true, local: true });
  if (composed === 'large') return { problem: `${name}: the shipping composer answered large` };
  const rowsText = linesOf(sv.t(['capture-pane', '-p', '-T', '-N', '-t', id]).out);
  const joined = linesOf(sv.t(['capture-pane', '-p', '-J', '-t', id]).out);
  let flagged;
  if (road === 'flags') {
    const f = flagsOf(linesOf(sv.t(['capture-pane', '-p', '-F', '-T', '-N', '-t', id]).out));
    if (f.some((x) => x === null)) return { problem: `${name}: a -F line carried no prefix` };
    flagged = f.map((x) => x.wrapped);
    // The bottom row is left out: a mark there joins nothing, and -J ends the capture after it either way.
    const fb = alignedMarks(rowsText, joined);
    if (J(fb.marked.slice(0, -1)) !== J(flagged.slice(0, -1))) return { problem: `${name}: this file's alignment ${J(fb.marked)} disagrees with -F's flags ${J(flagged)}` };
  } else {
    flagged = alignedMarks(rowsText, joined).marked;
  }
  const alternate = sv.t(['display-message', '-p', '-t', id, '#{alternate_on}']).out.trim() === '1';
  const problems = pictureProblems({ name, screen: composed.screen, rowsText, flagged, joined, alternate });
  if (roadRefused) problems.push(`${name}: the read refused its road (${road}) and fell back to none`);
  const { expected, kept } = expectedOf(rowsText, flagged, composed.screen.wraps ?? []);
  return {
    problem: problems.length === 0 ? null : problems.join('; '),
    version,
    road,
    picture: { name, width: composed.screen.cols, screen: composed.screen, wraps: composed.screen.wraps ?? [], joined, kept, expected }
  };
}

/** Every picture of one build: the 34 captures narrowed to 78, then the eight cases. */
async function readBuild(build, ship) {
  const sv = scratchServer(build);
  const out = { label: build.label, version: null, road: null, pictures: [], cases: [], problems: [] };
  try {
    const base = sv.t(['new-session', '-d', '-s', 'base', '-x', String(DRAW_COLS), '-y', String(DRAW_ROWS), process.execPath, HERE, '--draw', '/dev/null']);
    if (base.code !== 0) throw new Error(`the scratch server did not start: ${base.err}`);
    let k = 0;
    for (const cap of captureFiles()) {
      k += 1;
      // The bytes are the capture's own (UTF-8 under the escapes), so the line the pane draws is their UTF-8 text.
      const lines = cap.bytes.toString('utf8').split('\r\n');
      const marker = [...lines].reverse().map((l) => l.replace(/\u001b\[[0-9;?]*[ -/]*[@-~]/g, '').replace(/\u001b\][^\u0007]*\u0007/g, '').replace(/\u001b./g, '').trim()).find((l) => l.length >= 4) ?? '';
      const id = await drawSession(sv, k, { bytes: cap.bytes, cols: DRAW_COLS, rows: DRAW_ROWS, narrow: NARROW_COLS, waitFor: marker.slice(0, 12) });
      if (!id.startsWith('$')) {
        out.problems.push(`${cap.name}: ${id}`);
        continue;
      }
      const got = await pictureOf(sv, ship, id, cap.name);
      out.version ??= got.version ?? null;
      out.road ??= got.road ?? null;
      if (got.problem !== null) out.problems.push(got.problem);
      if (got.picture !== undefined) out.pictures.push(got.picture);
      sv.t(['kill-session', '-t', id]);
    }
    for (const c of CASES) {
      k += 1;
      const id = await drawSession(sv, k, { bytes: Buffer.from(c.bytes, 'utf8'), cols: c.cols, rows: 8, narrow: c.narrow, then: c.then === undefined ? undefined : Buffer.from(c.then, 'utf8'), thenMs: 3_000, alt: c.alt, waitFor: c.name === 'G4b' ? 'LLLL' : c.shows[0].slice(0, 8) });
      if (!id.startsWith('$')) {
        out.problems.push(`${c.name}: ${id}`);
        continue;
      }
      const got = await pictureOf(sv, ship, id, c.name);
      if (got.problem !== null) out.problems.push(got.problem);
      if (got.picture !== undefined) {
        const shows = showsProblem(c, got.picture.expected);
        if (shows !== null) out.problems.push(shows);
        out.cases.push(got.picture);
      }
      sv.t(['kill-session', '-t', id]);
    }
  } finally {
    sv.t(['kill-server']);
    rmSync(sv.dir, { recursive: true, force: true });
  }
  return out;
}

/** The fixture, from the first build's pictures. */
function fixtureOf(first) {
  return {
    format: FORMAT,
    about:
      'Phase 348 (build/p348/SPEC.md §4.6 step 17): the 34 committed reply captures drawn at 120 by 40 and narrowed to 78, and §2.4\'s eight redraw cases, each read by the SHIPPING read and composed by the SHIPPING composer on the vendored tmux, by build/p348/wraps-fixtures.mjs --write. `screen` is the picture as /v1/screen carries it; `wraps` its marks; `joined` capture-pane -p -J; `kept` the rows tmux flagged wrapped that the ink guard kept broken; `expected` what Copy over every row must give, line for line (D46).',
    tmux: first.version,
    road: first.road,
    pictures: first.pictures,
    cases: first.cases
  };
}

async function writeOrCheck(mode, target = FIXTURE) {
  const before = historyStat();
  let ship;
  try {
    const read = await import(pathToFileURL(join(ROOT, 'src', 'main', 'screen', 'read.ts')).href);
    const compose = await import(pathToFileURL(join(ROOT, 'src', 'main', 'screen', 'compose.ts')).href);
    ship = { readScreenLocal: read.readScreenLocal, composeScreen: compose.composeScreen, marksRoadOf: compose.marksRoadOf };
  } catch (err) {
    process.stderr.write(`${TAG} the shipping read and composer could not be loaded: ${String(err?.message ?? err)}\n`);
    return 2;
  }
  for (const [name, fn] of Object.entries(ship)) {
    if (typeof fn !== 'function') {
      process.stderr.write(`${TAG} the shipping tree has no ${name}, which this file reads through (the mac builder's half)\n`);
      return 2;
    }
  }
  const results = [];
  for (const build of BUILDS) {
    if (!existsSync(build.bin)) {
      if (build.required) {
        process.stderr.write(`${TAG} ${build.bin} is missing; build the vendored tmux first\n`);
        return 2;
      }
      process.stdout.write(`${TAG} UNREADABLE: ${build.bin} is not on this Mac, so the fallback's half (3.6a) was not read\n`);
      results.push(null);
      continue;
    }
    process.stdout.write(`${TAG} reading ${build.label} (${build.bin})\n`);
    results.push(await readBuild(build, ship));
  }
  const [first, second] = results;
  const problems = [...first.problems];
  if (second !== null && second !== undefined) {
    problems.push(...second.problems.map((p) => `${second.label}: ${p}`));
    if (second.road !== 'fallback') problems.push(`${second.label} read the ${String(second.road)} road, not the fallback`);
    for (const list of ['pictures', 'cases']) {
      first[list].forEach((pic, i) => {
        const other = second[list][i];
        if (other === undefined) problems.push(`${pic.name}: no ${second.label} picture`);
        else if (J(other.wraps) !== J(pic.wraps) || J(other.expected) !== J(pic.expected)) problems.push(`${pic.name}: ${second.label}'s fallback marks ${J(other.wraps)} where ${first.label}'s -F marks ${J(pic.wraps)}`);
      });
    }
  }
  if (first.road !== 'flags') problems.push(`${first.label} read the ${String(first.road)} road, not -F`);
  const file = fixtureOf(first);
  problems.push(...fixtureProblems(file));
  const joins = file.pictures.reduce((n, x) => n + x.wraps.length, 0);
  const kept = file.pictures.reduce((n, x) => n + x.kept.length, 0);
  process.stdout.write(`${TAG} ${String(file.pictures.length)} pictures and ${String(file.cases.length)} cases on ${String(first.version)} (${String(first.road)}): ${String(joins)} marks, ${String(kept)} kept breaks (§2.4 measured 67 and 24)${second === null || second === undefined ? '' : `; ${second.label} (${String(second.road)}) agrees on every picture: ${String(!problems.some((p) => p.includes(second.label)))}`}\n`);
  const after = historyStat();
  if (before !== after) problems.push(`his shell history moved across this run (${before} to ${after})`);
  if (problems.length > 0) {
    for (const p of problems.slice(0, 40)) process.stdout.write(`  ${p}\n`);
    process.stdout.write(`${TAG} ${mode === 'write' ? 'NOT WRITTEN' : 'CHECK FAIL'}: ${String(problems.length)} problem(s)\n`);
    return 1;
  }
  const text = fixtureText(file);
  if (mode === 'write') {
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, text, 'utf8');
    process.stdout.write(`${TAG} wrote ${target} (${String(Buffer.byteLength(text))} bytes)\n`);
    return second === null ? 2 : 0;
  }
  let committed = null;
  try {
    committed = readFileSync(target, 'utf8');
  } catch {
    committed = null;
  }
  if (committed === null) {
    process.stdout.write(`${TAG} CHECK FAIL: ${target} is not there\n`);
    return 1;
  }
  if (committed !== text) {
    process.stdout.write(`${TAG} CHECK FAIL: the committed fixture differs from this run's (${String(committed.length)} against ${String(text.length)} characters); run --write once the difference is understood\n`);
    return 1;
  }
  process.stdout.write(`${TAG} CHECK PASS: the committed fixture is this run's, byte for byte\n`);
  return second === null ? 2 : 0;
}

// ---------------------------------------------------------------------------
// The entry
// ---------------------------------------------------------------------------

if (isMain && !process.argv.includes('--draw')) {
  if (process.argv.includes('--self-test')) {
    process.exit(selfTest() ? 0 : 1);
  }
  const mode = process.argv.includes('--write') ? 'write' : process.argv.includes('--check') ? 'check' : null;
  if (mode === null) {
    process.stderr.write('usage: node build/p348/wraps-fixtures.mjs --write | --check | --self-test\n');
    process.exit(2);
  }
  if (process.env[INNER] !== '1') {
    // The shipping read and composer are TypeScript: run this file again under the pinned tsx, and wait.
    const { tsxCli } = await import('../ts-runner.mjs');
    const r = spawnSync(process.execPath, [tsxCli(), '--tsconfig', 'tsconfig.node.json', HERE, ...process.argv.slice(2)], {
      cwd: ROOT,
      stdio: 'inherit',
      env: { ...process.env, [INNER]: '1' },
      timeout: 900_000
    });
    process.exit(r.status ?? 1);
  }
  let target;
  try {
    target = fixturePathOf(process.argv.slice(2));
  } catch (err) {
    process.stderr.write(`${TAG} ${String(err?.message ?? err)}\n`);
    process.exit(2);
  }
  process.exit(await writeOrCheck(mode, target));
}
