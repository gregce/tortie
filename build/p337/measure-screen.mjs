#!/usr/bin/env node
/**
 * measure:p337 — THE SHIPPING MAC SIDE OF THE SCREEN, OUTSIDE ELECTRON,
 * against real tmux (build/p337/SPEC.md §7.6, §Attack AM1 to AM3, D42).
 *
 * WHY IT IS A MEASUREMENT AND NOT AN APP RUN. What the phone draws is what
 * src/main/screen/** composes from one tmux read, and what a key reaches a
 * program as is what tmux makes of the keys verb's argv in the terminal mode
 * that program asked for. Neither needs a window, a door or a phone to be
 * measured, and both need real tmux, every recorder mode and hundreds of
 * keys, which an app run cannot afford. So the pinned tsx runs the SHIPPING
 * read, composer, watcher, keys verb, control client, `remote-screen.ts`'s
 * argv and the carriage's `namedKeySequence` here (build/p337/drive-screen.mts),
 * against the vendored tmux 3.7b and Homebrew's 3.6a.
 *
 * WHAT IT STARTS, AND ENDS. Per tmux build: a scratch directory under
 * /private/tmp (its TMUX_TMPDIR, HOME, ZDOTDIR and the drawn bytes), ONE tmux
 * server on `-L p337-v-<pid>-<label>` under a copy of resources/gmux-tmux.conf,
 * this file as a DRAWER in some panes (`--draw <file>`: it writes the bytes
 * and sleeps), build/p337/key-recorder.mjs in others, `/bin/cat` in one,
 * python3 holding a sized tmux client in a pty for arm Z (a client of the
 * scratch server only), and the pinned tsx running drive-screen.mts. The drive
 * ends its server, its control clients and its pty clients in its own
 * `finally`; THIS FILE ends the server again by its scratch socket name and
 * removes the directory, in a `finally`, whatever happened. It never names
 * `-L gmux`, the default server or the person's HOME, runs no agent and no
 * shell of its own, starts no Electron and spends no token; HISTFILE is
 * /dev/null and TERM_SESSION_ID is unset. It reads `stat -f '%z %m'` of
 * ~/.zsh_history and ~/.bash_history before and after, and FAILS if either
 * moved.
 *
 * THE ARMS (graded here from the drive's raw readings; SPEC §7.6)
 *   W  (`--check` and `--widths` only) tmux's own cell width of every code
 *      point U+0020 to U+3FFFF bar controls and surrogates, and of the 281
 *      sequences, by the two-column method (§14 M5, M6): `--check` compares
 *      with build/fixtures/screen/tmux-widths.json and tmux-sequences.json;
 *      `--widths` writes them, in their committed serialization
 *   F  every committed `.ansi` and `.txt` capture (build/fixtures/reply and
 *      src/main/activity/__tests__/fixtures) drawn into a 120x40 pane and read
 *      by the SHIPPING read and composer: text equal to `capture-pane -p` row
 *      for row, styles equal to this measure's own SGR reader's, zero
 *      `large`, and the far read's argv composing the same rows
 *   K  every key name in every recorder mode through the SHIPPING verb: bytes
 *      equal keys-encoding.json, the carriage's composer the same bytes; text
 *      as typed; check-to-land over at least 200 keys, p99 UNDER 15 ms; THE
 *      GAP (D42): `[Escape]` and `[t:"b"]`, the second handed to the verb 0 ms
 *      after the first is answered, reach a reader busy 25 ms after each input
 *      as TWO reads, the verb's two acts 50 ms or more apart by its own clock
 *      (onLastCheck) and the reads no closer than LANDING_SLACK_MS (2 ms) less
 *      than that, because a key's landing varies. Printed beside it and not graded: the
 *      parent's one statement, and the two handed to the verb AT ONCE, which
 *      the door never does (writes.ts step 3 answers a second write on a
 *      session `busy` while one is in flight); a named key not alone is
 *      refused before anything is read
 *   L  the long poll through the SHIPPING watcher: 100 changes, change to
 *      answer p99 UNDER 250 ms, none missed; a held poll ends within two
 *      ticks of `closing()`
 *   C  the SHIPPING control client with a pane drawing forged guard rows,
 *      four reads pipelined, 20 trials: 0 misattributed, and pane A's eight
 *      forged rows read back as A's own in every trial (the arm's control at
 *      HEAD); with P337_PARENT_CHECKOUT, the parent's client on the same arm,
 *      printed and graded as fooled (the probe review, 2026-10-05)
 *   S  the worst screens (§14 M8): `large` exactly past the caps; compose
 *      times printed
 *   Z  nothing sizes a window: a sized "Mac" client 160x45 attached, 100
 *      reads and 150 keys over the control client and 20 of each over the
 *      spawned list leave it 160x45, every pane of every arm keeps the size it
 *      was made at, and the control (a second, smaller ordinary client) does
 *      move it, so the measure could see a resize
 *
 * A build whose tmux is not installed is UNREADABLE, and so is an arm the
 * run could not stage; neither is ever a pass.
 *
 *   npm run -s measure:p337                     F, K, L, C, S, Z on both builds
 *   node build/p337/measure-screen.mjs --check  the same, and W compared
 *   node build/p337/measure-screen.mjs --widths W only, the two fixtures written
 *   node build/p337/measure-screen.mjs --self-test   every grader on its
 *                           fixtures, each clause shown red, and the pure
 *                           readers; starts nothing
 *   P337_ARMS=F,K           pick arms
 *   P337_TMUX_36A=<path>    another 3.6a than Homebrew's
 *   P337_PARENT_CHECKOUT=<dir>   arm C also reads the parent's control client
 *   P337_KEEP=1             keep each scratch directory and the raw readings
 *
 * Exit 0 when every arm passed on every build, 1 when one failed, 2 when a
 * build or an arm could not be read.
 */

import { spawn, spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gradeFixtures } from '../probe-graders.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SELF = fileURLToPath(import.meta.url);
const TAG = '[p337 measure]';
const J = JSON.stringify;

/** The floors the graders hold, whatever the counts asked for. */
export const KEY_FLOOR = 200;
export const CHANGE_FLOOR = 100;
export const TRIAL_FLOOR = 20;
export const FIXTURE_FLOOR = 56;
/** D26's bound, kept for a key: the check-to-land p99 a key must land under. */
export const CHECK_TO_LAND_P99_MS = 15;
/** §7.6 L: change to answer. */
export const CHANGE_TO_ANSWER_P99_MS = 250;
/** D42: the Mac's gap between two keys acts on one session. */
export const KEYS_GAP_MS = 50;
/**
 * How much closer than KEYS_GAP_MS two READS of a reader may be while the
 * verb's two acts were KEYS_GAP_MS or more apart by its own clock: a key's
 * landing (tmux writing it, the reader's read returning) varies by a
 * millisecond or two either way. MEASURED by this arm on 2026-10-05 on both
 * builds: reads 49.62 and 49.96 ms apart in two of ten trials while the verb
 * waited its 50 ms before each fresh read. The verb's own gap is graded at 50
 * with no slack.
 */
export const LANDING_SLACK_MS = 2;
/** The recorder modes K drives (keys-encoding.json's own). */
export const K_MODES = Object.freeze(['normal', 'decckm', 'decckm,keypad', 'mok1', 'mok2', 'kitty', 'paste']);

const FIXTURE_DIRS = Object.freeze([
  { dir: join(ROOT, 'build', 'fixtures', 'reply'), header: true },
  { dir: join(ROOT, 'src', 'main', 'activity', '__tests__', 'fixtures'), header: false }
]);
const WIDTHS_FIXTURE = join(ROOT, 'build', 'fixtures', 'screen', 'tmux-widths.json');
const SEQUENCES_FIXTURE = join(ROOT, 'build', 'fixtures', 'screen', 'tmux-sequences.json');
const KEYS_FIXTURE = join(ROOT, 'build', 'fixtures', 'screen', 'keys-encoding.json');

// ---------------------------------------------------------------------------
// The drawer: `--draw <file> [--alt]`, run inside a pane. It writes the bytes
// once and sleeps; it reads nothing but that file and runs nothing.
// ---------------------------------------------------------------------------

if (process.argv[2] === '--draw') {
  const file = process.argv[3] ?? '';
  const bytes = readFileSync(file);
  if (process.argv.includes('--alt')) process.stdout.write('\u001b[?1049h');
  process.stdout.write(bytes);
  const end = () => process.exit(0);
  for (const sig of ['SIGHUP', 'SIGTERM', 'SIGINT']) process.on(sig, end);
  setTimeout(end, 600_000);
  setInterval(() => undefined, 1 << 30);
}

// ---------------------------------------------------------------------------
// The pure readers
// ---------------------------------------------------------------------------

/** `\\` and `\xNN` back to their bytes (build/p318's capture encoding). */
export function decodeAnsiLine(line) {
  return line.replace(/\\(\\|x[0-9a-f]{2})/g, (_, g) => (g === '\\' ? '\\' : String.fromCharCode(parseInt(g.slice(1), 16))));
}

/** A committed capture as the bytes a pane is drawn from: its rows, CR LF between them. */
export function fixtureBytes(text, { header, ansi }) {
  const lines = String(text).split('\n');
  if (header) lines.shift();
  if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
  const rows = ansi ? lines.map(decodeAnsiLine) : lines;
  return Buffer.from(rows.join('\r\n'), ansi ? 'latin1' : 'utf8');
}

/** The `q` quantile of a list (nearest rank), or null. */
export function quantile(values, q) {
  const xs = values.filter((v) => typeof v === 'number' && Number.isFinite(v)).sort((a, b) => a - b);
  if (xs.length === 0) return null;
  return xs[Math.min(xs.length - 1, Math.max(0, Math.ceil(q * xs.length) - 1))];
}

/** The two-column method's reading of one case's rows between sentinels (§14 M5). */
export function widthOfSegment(seg) {
  if (seg.length === 1 && seg[0] === 'X') return 0;
  if (seg.length === 1 && seg[0].endsWith('X')) return 1;
  if (seg.length === 2 && seg[1] === 'X') return 2;
  return `?${J(seg)}`;
}

/** Walk a two-column capture: after `S`, each case's rows up to its `Y`. */
export function readTwoColumn(capture, count) {
  let i = capture.indexOf('S') + 1;
  if (i === 0) return null;
  const out = [];
  for (let n = 0; n < count; n += 1) {
    const seg = [];
    while (i < capture.length && capture[i] !== 'Y') {
      seg.push(capture[i]);
      i += 1;
    }
    if (i >= capture.length) return null;
    i += 1;
    out.push(widthOfSegment(seg));
  }
  return out;
}

const cp = (...xs) => String.fromCodePoint(...xs);
const NAMED_SEQUENCES = Object.freeze({
  'zwj family': [0x1f468, 0x200d, 0x1f469, 0x200d, 0x1f467, 0x200d, 0x1f466],
  'zwj tech': [0x1f9d1, 0x200d, 0x1f4bb],
  'zwj rainbow flag': [0x1f3f3, 0xfe0f, 0x200d, 0x1f308],
  'zwj heart fire': [0x2764, 0xfe0f, 0x200d, 0x1f525],
  'flag us': [0x1f1fa, 0x1f1f8],
  'flag gb': [0x1f1ec, 0x1f1e7],
  'lone RI': [0x1f1fa],
  'keycap 1': [0x31, 0xfe0f, 0x20e3],
  'keycap #': [0x23, 0xfe0f, 0x20e3],
  'tag flag scotland': [0x1f3f4, 0xe0067, 0xe0062, 0xe0073, 0xe0063, 0xe0074, 0xe007f],
  'hangul jamo seq': [0x1100, 0x1161, 0x11a8],
  devanagari: [0x915, 0x94d, 0x937],
  thai: [0xe01, 0xe33]
});

/** A sequence fixture's label back to its text: `e+301`, `2764+fe0f`, `1f44d+1f3fb`, or a named one. Null for a label it does not know. */
export function sequenceOf(label) {
  if (Object.hasOwn(NAMED_SEQUENCES, label)) return cp(...NAMED_SEQUENCES[label]);
  const m = /^(e|[0-9a-f]{2,5})\+([0-9a-f]{3,5})$/.exec(String(label));
  if (m === null) return null;
  const base = m[1] === 'e' ? 0x65 : parseInt(m[1], 16);
  return cp(base, parseInt(m[2], 16));
}

/** Every code point the full scan reads (§14 M6). */
export function scannedPoints() {
  const all = [];
  for (let c = 0x20; c <= 0x3ffff; c += 1) {
    if (c >= 0x7f && c <= 0x9f) continue;
    if (c >= 0xd800 && c <= 0xdfff) continue;
    all.push(c);
  }
  return all;
}

/** Widths by code point to `[start, end, width]` ranges and a tally. */
export function rangesOf(points, widthAt) {
  const ranges = [];
  const tally = {};
  for (const c of points) {
    const w = widthAt(c);
    tally[w] = (tally[w] ?? 0) + 1;
    const last = ranges[ranges.length - 1];
    if (last !== undefined && last[2] === w && last[1] === c - 1) last[1] = c;
    else ranges.push([c, c, w]);
  }
  return { tally, ranges };
}

// ---------------------------------------------------------------------------
// Summaries of the drive's raw readings
// ---------------------------------------------------------------------------

export function summarizeF(f) {
  const xs = f?.fixtures ?? [];
  return {
    n: xs.length,
    unread: xs.filter((x) => x.unread === true).map((x) => x.name),
    large: xs.filter((x) => x.large === true).map((x) => x.name),
    textMismatch: xs.filter((x) => Array.isArray(x.textMismatch) && x.textMismatch.length > 0).map((x) => `${x.name} rows ${J(x.textMismatch.slice(0, 5))}`),
    styleMismatch: xs.filter((x) => typeof x.styleMismatch === 'number' && x.styleMismatch > 0).map((x) => `${x.name} (${String(x.styleMismatch)})`),
    remoteDiffer: xs.filter((x) => x.unread !== true && x.large !== true && x.remoteSame !== true).map((x) => x.name)
  };
}

export function summarizeK(k) {
  const modes = k?.modes ?? {};
  const named = Object.entries(modes);
  const outcomes = named.flatMap(([, m]) => Object.values(m?.got ?? {}).map((g) => g.outcome));
  return {
    modes: named.map(([mode]) => mode).sort(),
    unstaged: named.filter(([, m]) => typeof m?.unread === 'string').map(([mode]) => mode),
    compared: named.reduce((n, [, m]) => n + (m?.compared ?? 0), 0),
    differ: named.flatMap(([mode, m]) => (m?.differ ?? []).map((name) => `${mode}:${name}`)),
    carriageDiffer: named.flatMap(([mode, m]) => (m?.carriageDiffer ?? []).map((name) => `${mode}:${name}`)),
    notDone: outcomes.filter((o) => o !== 'done').length,
    keys: outcomes.length,
    text: (k?.text ?? []).filter((t) => t.want !== t.got).map((t) => t.want),
    textN: (k?.text ?? []).length,
    land: k?.land ?? { n: 0, p50: null, p99: null, max: null },
    gap: (k?.gap ?? []).map((g) => ({ reads: g.reads, apartMs: g.apartMs, actsApartMs: g.actsApartMs ?? null })),
    concurrent: (k?.concurrent ?? []).map((g) => ({ reads: g.reads, apartMs: g.apartMs, actsApartMs: g.actsApartMs ?? null })),
    parentShape: k?.parentShape ?? [],
    notAlone: { outcome: k?.notAlone?.outcome?.outcome ?? null, reason: k?.notAlone?.outcome?.reason ?? null, freshReads: k?.notAlone?.freshReads ?? null }
  };
}

export function summarizeL(l) {
  return { n: l?.n ?? 0, missed: l?.missed ?? null, p50: l?.p50 ?? null, p99: l?.p99 ?? null, max: l?.max ?? null, closedMs: l?.closedMs ?? null, tickMs: l?.tickMs ?? null };
}

export function summarizeC(c) {
  const head = c?.head ?? [];
  const parent = c?.parent ?? null;
  const rows = typeof c?.forgedRows === 'number' ? c.forgedRows : null;
  return {
    trials: head.length,
    wrong: head.reduce((n, t) => n + (t.wrong ?? 1) + (t.later ?? 1), 0),
    // The probe review's control: trials whose pane A answer held every forged guard row it drew, as its own rows.
    forgedRead: rows === null ? 0 : head.filter((t) => t.forged === rows).length,
    parent: parent === null ? null : { trials: parent.length, wrong: parent.reduce((n, t) => n + (t.wrong ?? 0) + (t.later ?? 0), 0) },
    parentWhy: c?.parentWhy ?? null
  };
}

export function summarizeS(s, caps) {
  const xs = s?.screens ?? [];
  return {
    n: xs.length,
    unread: xs.filter((x) => x.unread === true).map((x) => `${String(x.w)}x${String(x.h)}`),
    wrong: xs
      .filter((x) => x.unread !== true)
      .filter((x) => {
        const owedLarge = x.w > caps.cols || x.h > caps.rows || x.cells > caps.runs;
        if (owedLarge) return x.result !== 'large';
        return x.result === 'large' || typeof x.result?.bytes !== 'number' || x.result.bytes > caps.bytes;
      })
      .map((x) => `${String(x.w)}x${String(x.h)}: ${J(x.result)}`),
    anyLarge: xs.some((x) => x.result === 'large'),
    anyComposed: xs.some((x) => x.result !== 'large' && x.unread !== true),
    times: xs.map((x) => `${String(x.w)}x${String(x.h)} ${String(x.composeMsP50)} ms`)
  };
}

export function summarizeZ(z) {
  if (z === undefined || z === null) return null;
  if (typeof z.unread === 'string') return { unread: z.unread };
  return {
    before: z.before,
    after: z.after,
    afterSpawned: z.afterSpawned,
    control: z.control,
    spawnedReads: z.spawnedReads,
    spawnedKeys: z.spawnedKeys,
    drift: (z.drift ?? []).map((d) => `${d.session} ${d.made} -> ${d.now}`)
  };
}

// ---------------------------------------------------------------------------
// The graders: pure, over a summarized reading, each clause shown to fail
// ---------------------------------------------------------------------------

export const GRADERS = {
  F: {
    title: 'every committed capture reads back through the shipping read and composer',
    clauses: [
      ['every committed capture was drawn and read', (r) => r.n >= FIXTURE_FLOOR && r.unread.length === 0],
      ['none was answered large', (r) => r.large.length === 0],
      ['the composed text equals capture-pane -p, row for row', (r) => r.textMismatch.length === 0],
      ['every run is one style by this measure\'s own SGR reader, and one style index is one pen', (r) => r.styleMismatch.length === 0],
      ['the far read\'s argv composes the same rows', (r) => r.remoteDiffer.length === 0]
    ]
  },
  K: {
    title: 'every key name in every mode, through the shipping keys verb',
    clauses: [
      ['every recorder mode was staged', (r) => K_MODES.every((m) => r.modes.includes(m)) && r.unstaged.length === 0],
      ['every key was answered done', (r) => r.keys > 0 && r.notDone === 0],
      ['every key reached the program as keys-encoding.json says', (r) => r.compared > 0 && r.differ.length === 0],
      ['the carriage\'s composer types the same bytes', (r) => r.carriageDiffer.length === 0],
      ['text reached the program byte for byte', (r) => r.textN > 0 && r.text.length === 0],
      ['at least 200 keys were timed, and p99 check-to-land is under 15 ms', (r) => r.land.n >= KEY_FLOOR && typeof r.land.p99 === 'number' && r.land.p99 < CHECK_TO_LAND_P99_MS],
      ["two writes handed 0 ms apart arrive as two reads, the verb's acts 50 ms or more apart and the reads within the landing slack of it (D42)", (r) => r.gap.length >= 5 && r.gap.every((g) => J(g.reads) === J(['1b', '62']) && typeof g.actsApartMs === 'number' && g.actsApartMs >= KEYS_GAP_MS && typeof g.apartMs === 'number' && g.apartMs >= KEYS_GAP_MS - LANDING_SLACK_MS)],
      ['a named key not alone is refused before anything is read', (r) => r.notAlone.outcome === 'refused' && r.notAlone.freshReads === 0]
    ]
  },
  L: {
    title: 'the long poll through the shipping watcher',
    clauses: [
      ['at least 100 changes were answered, none missed', (r) => r.n >= CHANGE_FLOOR && r.missed === 0],
      ['p99 change to answer is under 250 ms', (r) => typeof r.p99 === 'number' && r.p99 < CHANGE_TO_ANSWER_P99_MS],
      ['a held poll ends within two ticks of closing', (r) => typeof r.closedMs === 'number' && typeof r.tickMs === 'number' && r.closedMs <= 2 * r.tickMs]
    ]
  },
  C: {
    title: 'the shared control client against forged guard rows',
    clauses: [
      ['at least 20 trials of four pipelined reads', (r) => r.trials >= TRIAL_FLOOR],
      ['no read was misattributed and the next command was its own', (r) => r.trials > 0 && r.wrong === 0],
      // The probe review (2026-10-05): the arm's own control at HEAD. Without
      // it a pane whose forged rows forged nothing passes the clause above,
      // and only a parent run, which the battery does not make, could say so.
      ["every trial read pane A's forged guard rows back as A's own rows", (r) => r.trials > 0 && r.forgedRead === r.trials],
      // And when the parent's client WAS read, it must have been fooled: the
      // measured 20 of 20 (§14 M3) is what says these rows reach the defect.
      ["the parent's client, when read, misattributed (the rows reach the defect)", (r) => r.parent === null || (r.parent.trials > 0 && r.parent.wrong > 0)]
    ]
  },
  S: {
    title: 'the worst screens',
    clauses: [
      ['every worst screen was drawn and read', (r) => r.n >= 3 && r.unread.length === 0],
      ['large exactly past the caps, composed under them', (r) => r.wrong.length === 0 && r.anyLarge && r.anyComposed]
    ]
  },
  Z: {
    title: 'nothing sizes a window',
    clauses: [
      ['the sized client set the window, and the control moved it (the measure can see a resize)', (r) => r.before === '160x45' && typeof r.control === 'string' && r.control !== r.before],
      ['100 reads and 150 keys over the control client left it as it was', (r) => r.after === r.before],
      ['20 reads and 20 keys over the spawned list left it as it was', (r) => r.afterSpawned === r.before && r.spawnedReads === 20 && r.spawnedKeys === 20],
      ['every pane of every arm kept the size it was made at', (r) => Array.isArray(r.drift) && r.drift.length === 0]
    ]
  }
};

/** One arm's verdict: `{ ok, failed }`. A clause that throws is a failed clause. */
export function grade(id, reading) {
  const failed = [];
  for (const [name, predicate] of GRADERS[id].clauses) {
    let ok = false;
    try {
      ok = predicate(reading) === true;
    } catch {
      ok = false;
    }
    if (!ok) failed.push(name);
  }
  return { ok: failed.length === 0, failed };
}

/** Why an arm could not be READ (as opposed to failing), or null. */
export function unreadableOf(id, summary) {
  if (id === 'Z' && summary !== null && typeof summary.unread === 'string') return summary.unread;
  if (id === 'Z' && summary === null) return 'arm Z printed nothing';
  return null;
}

const gap = (apartMs, actsApartMs = 50.6) => ({ reads: ['1b', '62'], apartMs, actsApartMs });
export const GRADER_FIXTURES = {
  F: {
    pass: { n: 56, unread: [], large: [], textMismatch: [], styleMismatch: [], remoteDiffer: [] },
    breaks: {
      'every committed capture was drawn and read': (r) => void (r.unread = ['claude-idle.txt']),
      'none was answered large': (r) => void (r.large = ['codex-approval-tall-0.160.0.txt']),
      'the composed text equals capture-pane -p, row for row': (r) => void (r.textMismatch = ['claude-edit.txt rows [3]']),
      'every run is one style by this measure\'s own SGR reader, and one style index is one pen': (r) => void (r.styleMismatch = ['codex-prompt-dim-run-reconstructed.ansi (1)']),
      'the far read\'s argv composes the same rows': (r) => void (r.remoteDiffer = ['qwen-idle.txt'])
    },
    refused: [{ what: 'a run that drew fewer captures than are committed', clause: 'every committed capture was drawn and read', edit: (r) => void (r.n = 55) }]
  },
  K: {
    pass: {
      modes: [...K_MODES].sort(),
      unstaged: [],
      compared: 7 * 33,
      differ: [],
      carriageDiffer: [],
      notDone: 0,
      keys: 245,
      text: [],
      textN: 12,
      land: { n: 245, p50: 0.9, p99: 3.4, max: 6.1 },
      // gap(49.6, 50.4) is the measured case: the reads a little closer than the verb's acts.
      gap: [gap(51.2), gap(49.6, 50.4), gap(55), gap(50.9), gap(52)],
      concurrent: [{ reads: ['1b62'], apartMs: null }],
      parentShape: [['1b62']],
      notAlone: { outcome: 'refused', reason: 'character', freshReads: 0 }
    },
    breaks: {
      'every recorder mode was staged': (r) => void (r.unstaged = ['kitty']),
      'every key was answered done': (r) => void (r.notDone = 1),
      'every key reached the program as keys-encoding.json says': (r) => void (r.differ = ['decckm:Up']),
      'the carriage\'s composer types the same bytes': (r) => void (r.carriageDiffer = ['mok2:C-c']),
      'text reached the program byte for byte': (r) => void (r.text = ['783b']),
      'at least 200 keys were timed, and p99 check-to-land is under 15 ms': (r) => void (r.land.p99 = 15),
      "two writes handed 0 ms apart arrive as two reads, the verb's acts 50 ms or more apart and the reads within the landing slack of it (D42)": (r) => void (r.gap[1] = { reads: ['1b62'], apartMs: null, actsApartMs: 50.3 }),
      'a named key not alone is refused before anything is read': (r) => void (r.notAlone.freshReads = 1)
    },
    refused: [
      { what: 'a run missing a mode', clause: 'every recorder mode was staged', edit: (r) => void (r.modes = r.modes.filter((m) => m !== 'paste')) },
      { what: 'fewer than 200 keys timed', clause: 'at least 200 keys were timed, and p99 check-to-land is under 15 ms', edit: (r) => void (r.land.n = 199) },
      { what: 'two reads 47.9 ms apart, past the landing slack', clause: "two writes handed 0 ms apart arrive as two reads, the verb's acts 50 ms or more apart and the reads within the landing slack of it (D42)", edit: (r) => void (r.gap[0] = gap(47.9, 50.4)) },
      { what: "the verb's two acts 49.9 ms apart", clause: "two writes handed 0 ms apart arrive as two reads, the verb's acts 50 ms or more apart and the reads within the landing slack of it (D42)", edit: (r) => void (r.gap[0] = gap(51, 49.9)) },
      { what: "the verb's gap not read", clause: "two writes handed 0 ms apart arrive as two reads, the verb's acts 50 ms or more apart and the reads within the landing slack of it (D42)", edit: (r) => void (r.gap[3] = gap(50.9, null)) },
      { what: 'the reads in the other order', clause: "two writes handed 0 ms apart arrive as two reads, the verb's acts 50 ms or more apart and the reads within the landing slack of it (D42)", edit: (r) => void (r.gap[2] = { reads: ['62', '1b'], apartMs: 60, actsApartMs: 60 }) },
      { what: 'a named key not alone typed', clause: 'a named key not alone is refused before anything is read', edit: (r) => void (r.notAlone.outcome = 'done') }
    ]
  },
  L: {
    pass: { n: 100, missed: 0, p50: 104.2, p99: 141.8, max: 160.1, closedMs: 101.5, tickMs: 100 },
    breaks: {
      'at least 100 changes were answered, none missed': (r) => void (r.missed = 1),
      'p99 change to answer is under 250 ms': (r) => void (r.p99 = 250),
      'a held poll ends within two ticks of closing': (r) => void (r.closedMs = 200.1)
    },
    refused: [{ what: 'fewer than 100 changes', clause: 'at least 100 changes were answered, none missed', edit: (r) => void (r.n = 99) }]
  },
  C: {
    pass: { trials: 20, wrong: 0, forgedRead: 20, parent: { trials: 20, wrong: 20 }, parentWhy: null },
    breaks: {
      'at least 20 trials of four pipelined reads': (r) => Object.assign(r, { trials: 19, forgedRead: 19 }),
      'no read was misattributed and the next command was its own': (r) => void (r.wrong = 1),
      "every trial read pane A's forged guard rows back as A's own rows": (r) => void (r.forgedRead = 0),
      "the parent's client, when read, misattributed (the rows reach the defect)": (r) => void (r.parent = { trials: 20, wrong: 0 })
    },
    refused: [
      // The probe review's own: a pane that drew its forged rows in some other shape reads them back as nothing, and HEAD then passes the first two clauses.
      { what: 'a HEAD run whose forged rows forged nothing (none read back), with no parent', clause: "every trial read pane A's forged guard rows back as A's own rows", edit: (r) => Object.assign(r, { forgedRead: 0, parent: null }) },
      { what: 'one trial in twenty missing a forged row', clause: "every trial read pane A's forged guard rows back as A's own rows", edit: (r) => void (r.forgedRead = 19) },
      { what: 'a parent read with no trials', clause: "the parent's client, when read, misattributed (the rows reach the defect)", edit: (r) => void (r.parent = { trials: 0, wrong: 0 }) }
    ]
  },
  S: {
    pass: { n: 3, unread: [], wrong: [], anyLarge: true, anyComposed: true, times: [] },
    breaks: {
      'every worst screen was drawn and read': (r) => void (r.unread = ['400x120']),
      'large exactly past the caps, composed under them': (r) => void (r.wrong = ['250x70: {"bytes":1}'])
    },
    refused: [{ what: 'a run where nothing was over a cap', clause: 'large exactly past the caps, composed under them', edit: (r) => void (r.anyLarge = false) }]
  },
  Z: {
    pass: { before: '160x45', after: '160x45', afterSpawned: '160x45', control: '50x30', spawnedReads: 20, spawnedKeys: 20, drift: [] },
    breaks: {
      'the sized client set the window, and the control moved it (the measure can see a resize)': (r) => void (r.control = '160x45'),
      '100 reads and 150 keys over the control client left it as it was': (r) => void (r.after = '120x40'),
      '20 reads and 20 keys over the spawned list left it as it was': (r) => void (r.afterSpawned = '80x24'),
      'every pane of every arm kept the size it was made at': (r) => void (r.drift = ['$3 120x40 -> 80x24'])
    },
    refused: [
      { what: 'a sized client that never took', clause: 'the sized client set the window, and the control moved it (the measure can see a resize)', edit: (r) => void (r.before = '80x24') },
      { what: 'spawned reads that never answered', clause: '20 reads and 20 keys over the spawned list left it as it was', edit: (r) => void (r.spawnedReads = 0) }
    ]
  }
};

/**
 * THE PROBE REVIEW'S RECORDED RUN (2026-10-05, `P337_KEEP=1
 * P337_PARENT_CHECKOUT=<aebb4ce9's src> node build/p337/measure-screen.mjs`,
 * exit 0, 198 s, both builds): the summaries each grader read, as printed,
 * with C's parent reading included (the parent's client misattributed 72 and
 * 60 over 20 trials; HEAD read pane A's eight forged rows back in all 20).
 * The self-test holds every grader green on them.
 */
const RECORDED_F = { n: 56, unread: [], large: [], textMismatch: [], styleMismatch: [], remoteDiffer: [] };
const RECORDED_MODES = [...K_MODES].sort();
export const RECORDED = Object.freeze({
  '3.7b': {
    F: RECORDED_F,
    K: { modes: RECORDED_MODES, unstaged: [], compared: 175, differ: [], carriageDiffer: [], notDone: 0, keys: 245, text: [], textN: 12, land: { n: 245, p50: 0.382708, p99: 2.070916, max: 2.367709 }, gap: [gap(50.22575, 51.461542), gap(50.724875, 50.947958), gap(51.493834, 51.511041), gap(51.089834, 51.092333), gap(50.604625, 51.122)], concurrent: [], parentShape: [], notAlone: { outcome: 'refused', reason: 'character', freshReads: 0 } },
    L: { n: 100, missed: 0, p50: 85.334292, p99: 89.623083, max: 89.623083, closedMs: 2.082041, tickMs: 100 },
    C: { trials: 20, wrong: 0, forgedRead: 20, parent: { trials: 20, wrong: 72 }, parentWhy: null },
    S: { n: 3, unread: [], wrong: [], anyLarge: true, anyComposed: true, times: [] },
    Z: { before: '160x45', after: '160x45', afterSpawned: '160x45', control: '50x30', spawnedReads: 20, spawnedKeys: 20, drift: [] }
  },
  '3.6a': {
    F: RECORDED_F,
    K: { modes: RECORDED_MODES, unstaged: [], compared: 175, differ: [], carriageDiffer: [], notDone: 0, keys: 245, text: [], textN: 12, land: { n: 245, p50: 0.341084, p99: 1.723125, max: 2.057542 }, gap: [gap(50.188042, 51.633), gap(50.183583, 50.567458), gap(51.658208, 52.074), gap(51.507334, 51.90175), gap(51.695625, 52.020625)], concurrent: [], parentShape: [], notAlone: { outcome: 'refused', reason: 'character', freshReads: 0 } },
    L: { n: 100, missed: 0, p50: 83.021042, p99: 100.606666, max: 100.606666, closedMs: 0.193792, tickMs: 100 },
    C: { trials: 20, wrong: 0, forgedRead: 20, parent: { trials: 20, wrong: 60 }, parentWhy: null },
    S: { n: 3, unread: [], wrong: [], anyLarge: true, anyComposed: true, times: [] },
    Z: { before: '160x45', after: '160x45', afterSpawned: '160x45', control: '50x30', spawnedReads: 20, spawnedKeys: 20, drift: [] }
  }
});
/** The 35 key names, spelled for the review's raw K (the drive reads the contract's own). */
const REVIEW_NAMES = Object.freeze(['Escape', 'Tab', 'BTab', 'Enter', 'BSpace', 'Up', 'Down', 'Left', 'Right', ...'abcdefghijklmnopqrstuvwxyz'.split('').map((l) => `C-${l}`)]);
/** A raw K in the drive's shape, as the recorded 3.7b run read it, for the hostile edits above. */
const RAW_K_HONEST = Object.freeze({
  modes: Object.fromEntries(K_MODES.map((m) => [m, { got: Object.fromEntries(REVIEW_NAMES.map((n) => [n, { hex: '', outcome: 'done' }])), compared: 25, differ: [], carriageDiffer: [] }])),
  text: Array.from({ length: 12 }, () => ({ want: '61', got: '61' })),
  land: { n: 245, p50: 0.382708, p99: 2.070916, max: 2.367709 },
  gap: RECORDED['3.7b'].K.gap,
  concurrent: [],
  parentShape: [['1b62'], ['1b62'], ['1b62']],
  notAlone: { outcome: { outcome: 'refused', reason: 'character' }, freshReads: 0 }
});

// ---------------------------------------------------------------------------
// The python pty client for arm Z: a client of the SCRATCH server, sized
// ---------------------------------------------------------------------------

const PTY_CLIENT = [
  '# measure:p337 arm Z: a sized tmux client of the scratch server, in a pty,',
  '# drained until SIGTERM. It runs no shell. argv: tmux socket conf session cols rows',
  'import os, pty, sys, fcntl, termios, struct, signal, select, time',
  'bin_, sock, conf, session, cols, rows = sys.argv[1:7]',
  "if sock in ('gmux', 'default') or not sock.startswith('p337-v-'):",
  '    sys.exit(2)',
  'pid, fd = pty.fork()',
  'if pid == 0:',
  "    fcntl.ioctl(0, termios.TIOCSWINSZ, struct.pack('HHHH', int(rows), int(cols), 0, 0))",
  "    os.execv(bin_, [bin_, '-L', sock, '-f', conf, 'attach-session', '-t', '=' + session])",
  "fcntl.ioctl(fd, termios.TIOCSWINSZ, struct.pack('HHHH', int(rows), int(cols), 0, 0))",
  'stop = False',
  'def end(*_):',
  '    global stop',
  '    stop = True',
  'signal.signal(signal.SIGTERM, end)',
  'signal.signal(signal.SIGHUP, end)',
  'deadline = time.time() + 600',
  'while not stop and time.time() < deadline:',
  '    r, _, _ = select.select([fd], [], [], 0.2)',
  '    if r:',
  '        try:',
  '            os.read(fd, 65536)',
  '        except OSError:',
  '            break',
  'for sig in (signal.SIGTERM, signal.SIGKILL):',
  '    try:',
  '        os.kill(pid, sig)',
  '    except ProcessLookupError:',
  '        break',
  '    time.sleep(0.2)',
  'try:',
  '    os.waitpid(pid, 0)',
  'except ChildProcessError:',
  '    pass',
  ''
].join('\n');

// ---------------------------------------------------------------------------
// The self-test: starts nothing
// ---------------------------------------------------------------------------

function selfTest() {
  let failures = 0;
  const say = (ok, text) => {
    if (!ok) failures += 1;
    process.stdout.write(`${ok ? 'ok  ' : 'FAIL'} ${text}\n`);
  };
  const clauses = gradeFixtures({ graders: GRADERS, fixtures: GRADER_FIXTURES, grade, clone: (x) => structuredClone(x), say, J });
  // The two-column reading, on segments the method produces.
  say(widthOfSegment(['X']) === 0 && widthOfSegment(['aX']) === 1 && widthOfSegment(['a', 'X']) === 2, 'widthOfSegment reads 0, 1 and 2 cells off a two-column pane');
  say(widthOfSegment(['a', 'b', 'X']) === '?["a","b","X"]', 'widthOfSegment keeps what it cannot read, as the fixture spells it');
  say(J(readTwoColumn(['junk', 'S', 'X', 'Y', 'aX', 'Y', 'a', 'X', 'Y'], 3)) === J([0, 1, 2]), 'readTwoColumn walks from the S sentinel, one case to a Y');
  say(readTwoColumn(['S', 'X', 'Y'], 2) === null && readTwoColumn(['X', 'Y'], 1) === null, 'readTwoColumn refuses a capture missing a case or the sentinel');
  // The sequences: every committed label is one this file can draw again.
  try {
    const seq = JSON.parse(readFileSync(SEQUENCES_FIXTURE, 'utf8'));
    const labels = Object.keys(seq.cases);
    const unknown = labels.filter((l) => sequenceOf(l) === null);
    say(labels.length === 281 && unknown.length === 0, `every one of the ${String(labels.length)} committed sequences is drawn again from its label${unknown.length === 0 ? '' : `; unknown ${J(unknown.slice(0, 5))}`}`);
    say(sequenceOf('e+301') === `e${cp(0x301)}` && sequenceOf('1f44d+1f3fb') === cp(0x1f44d, 0x1f3fb) && sequenceOf('flag gb') === cp(0x1f1ec, 0x1f1e7) && sequenceOf('nonsense') === null, 'sequenceOf rebuilds a combining mark, a tone, a named flag, and refuses nonsense');
    const widths = JSON.parse(readFileSync(WIDTHS_FIXTURE, 'utf8'));
    say(widths.codePoints === scannedPoints().length, `the full scan reads the ${String(widths.codePoints)} code points the fixture names`);
    const map = new Map();
    for (const [s, e, w] of widths.builds['3.7b'].ranges) for (let c = s; c <= e; c += 1) map.set(c, w);
    const again = rangesOf(scannedPoints(), (c) => map.get(c));
    say(J(again.ranges) === J(widths.builds['3.7b'].ranges) && J(again.tally) === J(widths.builds['3.7b'].tally), 'rangesOf rebuilds the committed 3.7b ranges and tally from the widths they say');
  } catch (err) {
    say(false, `the committed width fixtures could not be read: ${err instanceof Error ? err.message : String(err)}`);
  }
  // The capture bytes.
  say(fixtureBytes('# header\nab\\x1b[1mc\n', { header: true, ansi: true }).toString('latin1') === 'ab\u001b[1mc', 'fixtureBytes drops the source line and decodes \\xNN');
  say(fixtureBytes('one\ntwo\n', { header: false, ansi: false }).toString('utf8') === 'one\r\ntwo', 'fixtureBytes joins rows with CR LF and keeps the first row of an activity capture');
  // Quantiles.
  const hundred = Array.from({ length: 100 }, (_, i) => i + 1);
  say(quantile(hundred, 0.99) === 99 && quantile([], 0.5) === null, 'quantile reads the nearest rank, and nothing from nothing');
  // The summaries.
  const k = summarizeK({ modes: { normal: { got: { Escape: { hex: '1b', outcome: 'done' } }, compared: 1, differ: [], carriageDiffer: [] }, kitty: { unread: 'never ready' } }, text: [{ want: '61', got: '61' }], land: { n: 1 }, gap: [], notAlone: { outcome: { outcome: 'refused', reason: 'character' }, freshReads: 0 } });
  say(J(k.unstaged) === J(['kitty']) && k.keys === 1 && k.notDone === 0 && k.notAlone.outcome === 'refused', 'summarizeK names a mode never staged apart from the keys it did read');
  const s = summarizeS({ screens: [{ w: 120, h: 40, cells: 4800, result: { bytes: 140_000 } }, { w: 250, h: 70, cells: 17_500, result: { bytes: 9 } }] }, { cols: 512, rows: 200, runs: 16_384, bytes: 1_048_576 });
  say(s.wrong.length === 1 && s.wrong[0].startsWith('250x70'), 'summarizeS owes large to a screen past the run cap and names one composed anyway');
  say(summarizeC({ head: [{ wrong: 0, later: 1 }] }).wrong === 1, 'summarizeC counts a later command answered with another command\'s lines');
  say(unreadableOf('Z', summarizeZ({ unread: 'no python3 pty helper' })) !== null && unreadableOf('Z', summarizeZ({ before: '160x45' })) === null, 'Z is unreadable, never failed, without its pty client');
  // THE PROBE REVIEW'S RECORDED RUN (2026-10-05): every grader passes the
  // summaries a live run printed, and goes red on hostile RAW readings put
  // through the same summaries the run uses, so a summary cannot hide a break.
  for (const [build, readings] of Object.entries(RECORDED)) {
    for (const [id, reading] of Object.entries(readings)) {
      const g = grade(id, structuredClone(reading));
      say(g.ok, `${id} passes the ${build} summary a live run recorded${g.ok ? '' : `, failing ${J(g.failed)}`}`);
    }
  }
  say(summarizeC({ head: [{ wrong: 0, later: 0, forged: 8 }, { wrong: 0, later: 0, forged: 7 }], forgedRows: 8 }).forgedRead === 1 && summarizeC({ head: [{ wrong: 0, later: 0, forged: 8 }] }).forgedRead === 0, 'summarizeC counts a trial read back only when it held every forged row, and none when the drive named no count');
  const hostile = [
    ['C', 'a raw C whose pane A answered none of its forged rows', summarizeC({ head: Array.from({ length: 20 }, () => ({ wrong: 0, later: 0, forged: 0 })), parent: null, forgedRows: 8 })],
    ['C', 'a raw C whose parent client read every pane right', summarizeC({ head: Array.from({ length: 20 }, () => ({ wrong: 0, later: 0, forged: 8 })), parent: Array.from({ length: 20 }, () => ({ wrong: 0, later: 0, forged: 8 })), forgedRows: 8 })],
    ['C', 'a raw C from a drive that printed no forged count (an older drive)', summarizeC({ head: Array.from({ length: 20 }, () => ({ wrong: 0, later: 0 })), parent: null })],
    ['K', 'a raw K whose gap pair arrived as one read, the parent\'s shape', summarizeK({ ...RAW_K_HONEST, gap: [...RAW_K_HONEST.gap.slice(1), { reads: ['1b62'], apartMs: null, actsApartMs: 0.4 }] })],
    ['K', 'a raw K with a mode that never said it was ready', summarizeK({ ...RAW_K_HONEST, modes: { ...RAW_K_HONEST.modes, kitty: { unread: 'the recorder never said it was ready' } } })],
    ['K', 'a raw K whose carriage typed C-q otherwise than the verb', summarizeK({ ...RAW_K_HONEST, modes: { ...RAW_K_HONEST.modes, normal: { ...RAW_K_HONEST.modes.normal, carriageDiffer: ['C-q'] } } })],
    ['K', 'a raw K whose named key not alone reached a read', summarizeK({ ...RAW_K_HONEST, notAlone: { outcome: { outcome: 'refused', reason: 'character' }, freshReads: 1 } })],
    ['S', 'a raw S whose 250x70 screen composed instead of large', summarizeS({ screens: [{ w: 120, h: 40, cells: 4800, result: { bytes: 243_884 } }, { w: 250, h: 70, cells: 17_500, result: { bytes: 899_442 } }, { w: 400, h: 120, cells: 48_000, result: 'large' }] }, { cols: 512, rows: 200, runs: 16_384, bytes: 1_048_576 })],
    ['S', 'a raw S whose 120x40 screen was answered large', summarizeS({ screens: [{ w: 120, h: 40, cells: 4800, result: 'large' }, { w: 250, h: 70, cells: 17_500, result: 'large' }, { w: 400, h: 120, cells: 48_000, result: 'large' }] }, { cols: 512, rows: 200, runs: 16_384, bytes: 1_048_576 })],
    ['F', 'a raw F with one capture large and one whose far read differed', summarizeF({ fixtures: [...Array.from({ length: 54 }, (_, i) => ({ name: `x${String(i)}.txt`, textMismatch: [], styleMismatch: 0, remoteSame: true })), { name: 'big.ansi', large: true }, { name: 'far.txt', textMismatch: [], styleMismatch: 0, remoteSame: false }] })],
    ['F', 'a raw F with a style that split a run', summarizeF({ fixtures: Array.from({ length: 56 }, (_, i) => ({ name: `x${String(i)}.ansi`, textMismatch: [], styleMismatch: i === 3 ? 2 : 0, remoteSame: true })) })],
    ['L', 'a raw L whose held poll outlived closing() by three ticks', summarizeL({ n: 100, missed: 0, p50: 85, p99: 90, max: 90, closedMs: 300.4, tickMs: 100 })],
    ['Z', 'a raw Z whose spawned keys went nowhere', summarizeZ({ before: '160x45', after: '160x45', afterSpawned: '160x45', control: '50x30', spawnedReads: 20, spawnedKeys: 0, drift: [] })]
  ];
  for (const [id, what, reading] of hostile) {
    const g = grade(id, reading);
    say(!g.ok, `${id} refuses ${what}${g.ok ? ' (it PASSED)' : ` on ${J(g.failed)}`}`);
  }
  // The pty client names no socket of his.
  say(!/-L', 'gmux|'gmux'\]/.test(PTY_CLIENT) && PTY_CLIENT.includes("startswith('p337-v-')"), 'the pty client refuses any socket but a p337-v scratch one');
  process.stdout.write(failures === 0 ? `${TAG} self-test PASS: ${String(Object.keys(GRADERS).length)} graders, ${String(clauses)} clauses, each shown to go red on its own break, and the readers.\n` : `${TAG} self-test FAIL: ${String(failures)}.\n`);
  return failures === 0;
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

const say = (line) => console.log(`${TAG} ${line}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const KEEP = (process.env['P337_KEEP'] ?? '') === '1';
const ALL_ARMS = ['F', 'K', 'L', 'C', 'S', 'Z'];

/** `stat -f '%z %m'` of his two history files, and nothing else read of them. */
function historyStat() {
  const home = process.env['HOME'] ?? '';
  const r = spawnSync('/usr/bin/stat', ['-f', '%z %m', join(home, '.zsh_history'), join(home, '.bash_history')], { encoding: 'utf8', timeout: 10_000 });
  return String(r.stdout ?? '').trim().replace(/\n/g, ' | ');
}

/** The tmux builds: the vendored one, and Homebrew's 3.6a when it is installed. */
function builds() {
  const version = (bin) => {
    if (bin === '' || !existsSync(bin)) return null;
    const r = spawnSync(bin, ['-V'], { encoding: 'utf8', timeout: 10_000 });
    return r.status === 0 ? String(r.stdout ?? '').trim() : null;
  };
  const vendored = join(ROOT, 'build', 'vendor', 'tmux', 'bin', 'tmux');
  const homebrew = (process.env['P337_TMUX_36A'] ?? '').trim() || ['/opt/homebrew/bin/tmux', '/usr/local/bin/tmux'].find((p) => existsSync(p)) || '';
  const out = [];
  const v = version(vendored);
  out.push(v === null ? { label: '37b', key: '3.7b', bin: vendored, unreadable: `the vendored tmux ${vendored} is not built (npm run vendor:tmux)` } : { label: '37b', key: '3.7b', bin: vendored, version: v });
  const h = version(homebrew);
  out.push(h === null ? { label: '36a', key: '3.6a', bin: homebrew, unreadable: 'Homebrew\'s tmux 3.6a is not installed' } : /3\.6a/.test(h) ? { label: '36a', key: '3.6a', bin: homebrew, version: h } : { label: '36a', key: '3.6a', bin: homebrew, unreadable: `${homebrew} is ${h}, not 3.6a` });
  return out;
}

/** The committed captures arm F draws, each written as the bytes a pane is drawn from. */
function captureFiles(dir) {
  const out = [];
  for (const { dir: from, header } of FIXTURE_DIRS) {
    for (const name of readdirSync(from).sort()) {
      if (!/\.(?:ansi|txt)$/.test(name)) continue;
      const ansi = name.endsWith('.ansi');
      const path = join(dir, `fx-${String(out.length + 1)}.bin`);
      writeFileSync(path, fixtureBytes(readFileSync(join(from, name), ansi ? 'latin1' : 'utf8'), { header, ansi }));
      out.push({ name, path, kind: ansi ? 'ansi' : 'txt' });
    }
  }
  return out;
}

/** Run tmux on the scratch socket, synchronously. */
function scratchTmux(build, socket, conf, env, args, timeout = 15_000) {
  const r = spawnSync(build.bin, ['-L', socket, '-f', conf, ...args], { env, encoding: 'utf8', timeout, maxBuffer: 256 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`tmux ${String(args[0])} exited ${String(r.status)}`);
  return String(r.stdout ?? '');
}

/** W: every scanned code point and every sequence, by the two-column method, on one build. */
async function measureWidths(build, socket, conf, env, dir) {
  const t = (args, timeout) => scratchTmux(build, socket, conf, env, args, timeout);
  t(['new-session', '-d', '-s', 'w', '-x', '120', '-y', '40', '/bin/sleep 1800']);
  t(['set-option', '-g', 'history-limit', '200000']);
  const draw = async (name, texts) => {
    const body = ['S\r\n', ...texts.map((s) => `${s}X\r\nY\r\n`)];
    const file = join(dir, `w-${name}.bin`);
    writeFileSync(file, body.join(''));
    t(['new-window', '-d', '-t', '=w:', '-n', name, '/bin/sleep 1800']);
    t(['resize-window', '-t', `=w:${name}`, '-x', '2', '-y', '20']);
    t(['respawn-pane', '-k', '-t', `=w:${name}`, `'${process.execPath}' '${SELF}' --draw '${file}'`]);
    let cap = [];
    for (let k = 0; k < 240; k += 1) {
      await sleep(250);
      const tail = t(['capture-pane', '-p', '-t', `=w:${name}`]).split('\n').filter(Boolean);
      if (tail[tail.length - 1] === 'Y' && tail.length > 2) {
        cap = t(['capture-pane', '-p', '-S', '-', '-t', `=w:${name}`], 60_000).split('\n');
        if (cap.filter((l) => l === 'Y').length >= texts.length) break;
      }
    }
    t(['kill-window', '-t', `=w:${name}`]);
    return readTwoColumn(cap, texts.length);
  };
  const points = scannedPoints();
  const widths = new Map();
  let unreadable = 0;
  for (let off = 0, n = 0; off < points.length; off += 20_000, n += 1) {
    const part = points.slice(off, off + 20_000);
    const got = await draw(`p${String(n)}`, part.map((c) => String.fromCodePoint(c)));
    part.forEach((c, i) => {
      const w = got === null ? 254 : got[i];
      if (typeof w !== 'number') unreadable += 1;
      widths.set(c, typeof w === 'number' ? w : 254);
    });
  }
  const seqFixture = JSON.parse(readFileSync(SEQUENCES_FIXTURE, 'utf8'));
  const labels = Object.keys(seqFixture.cases);
  const seqGot = await draw('seq', labels.map((l) => sequenceOf(l) ?? ''));
  const sequences = {};
  labels.forEach((l, i) => {
    sequences[l] = seqGot === null ? null : seqGot[i];
  });
  return { ...rangesOf(points, (c) => widths.get(c)), unreadable, sequences };
}

async function run() {
  const check = process.argv.includes('--check');
  const widthsOnly = process.argv.includes('--widths');
  const asked = (process.env['P337_ARMS'] ?? '').split(',').map((a) => a.trim()).filter((a) => a !== '');
  const arms = widthsOnly ? [] : asked.length > 0 ? ALL_ARMS.filter((a) => asked.includes(a)) : ALL_ARMS;
  const parentCheckout = (process.env['P337_PARENT_CHECKOUT'] ?? '').trim();
  const parentClient = parentCheckout === '' ? null : join(parentCheckout, 'src', 'main', 'tmux', 'control-client.ts');
  if (parentClient !== null && !existsSync(parentClient)) {
    say(`UNREADABLE: P337_PARENT_CHECKOUT names ${parentCheckout}, which holds no src/main/tmux/control-client.ts`);
    process.exit(2);
  }
  const python = ['/usr/bin/python3', '/opt/homebrew/bin/python3'].find((p) => existsSync(p)) ?? null;
  const historyBefore = historyStat();
  const report = { checkout: ROOT, at: new Date().toISOString(), arms, check, widthsOnly, historyBefore, builds: [] };
  let failures = 0;
  let unreadable = 0;
  const measured = {};

  for (const build of builds()) {
    if (build.unreadable !== undefined) {
      unreadable += 1;
      say(`UNREADABLE ${build.label}: ${build.unreadable}`);
      report.builds.push({ label: build.label, unreadable: build.unreadable });
      continue;
    }
    const socket = `p337-v-${String(process.pid)}-${build.label}`;
    // A SHORT path: the socket lives under TMUX_TMPDIR, and a Unix socket path is about 104 bytes at most.
    const dir = realpathSync(mkdtempSync(`/private/tmp/p337-measure-${build.label}-`));
    const tmuxTmp = join(dir, 't');
    const home = join(dir, 'home');
    const conf = join(dir, 'gmux-tmux.conf');
    const tmuxEnv = { PATH: '/usr/bin:/bin:/usr/sbin:/sbin', HOME: home, ZDOTDIR: home, HISTFILE: '/dev/null', TMUX_TMPDIR: tmuxTmp, SHELL: '/bin/sh', LANG: 'en_US.UTF-8', LC_ALL: 'en_US.UTF-8', TERM: 'xterm-256color' };
    const entry = { label: build.label, version: build.version, socket, arms: [] };
    try {
      for (const d of [tmuxTmp, home]) mkdirSync(d, { recursive: true, mode: 0o700 });
      writeFileSync(join(home, '.hushlogin'), '');
      copyFileSync(join(ROOT, 'resources', 'gmux-tmux.conf'), conf);
      say(`${build.label}: ${build.version} on -L ${socket}; scratch ${dir}`);

      if (check || widthsOnly) {
        say(`${build.label} W: scanning ${String(scannedPoints().length)} code points and the sequences (minutes)`);
        const w = await measureWidths(build, socket, conf, tmuxEnv, dir);
        spawnSync(build.bin, ['-L', socket, 'kill-server'], { env: tmuxEnv, timeout: 10_000 });
        measured[build.key] = w;
        if (check) {
          const widths = JSON.parse(readFileSync(WIDTHS_FIXTURE, 'utf8'));
          const seq = JSON.parse(readFileSync(SEQUENCES_FIXTURE, 'utf8'));
          const want = widths.builds[build.key];
          const rangesSame = J(w.ranges) === J(want?.ranges) && J(w.tally) === J(want?.tally);
          const seqDiffer = Object.keys(seq.cases).filter((l) => J(seq.cases[l][build.key]) !== J(w.sequences[l]));
          const ok = w.unreadable === 0 && rangesSame && seqDiffer.length === 0;
          if (!ok) failures += 1;
          entry.arms.push({ id: 'W', ok, unreadable: w.unreadable, rangesSame, seqDiffer: seqDiffer.slice(0, 20) });
          say(`${ok ? 'PASS' : 'FAIL'} ${build.label} W: widths ${rangesSame ? 'equal the fixture' : 'DIFFER from the fixture'} (${String(w.ranges.length)} ranges, tally ${J(w.tally)}), ${String(w.unreadable)} unreadable, sequences ${seqDiffer.length === 0 ? 'equal' : `differ on ${J(seqDiffer.slice(0, 10))}`}`);
        }
      }

      if (arms.length > 0) {
        const planPath = join(dir, 'plan.json');
        const logFile = join(dir, 'drive.log');
        const ptyPath = python === null ? null : join(dir, 'pty-client.py');
        if (ptyPath !== null) writeFileSync(ptyPath, PTY_CLIENT);
        const fixtures = captureFiles(dir);
        writeFileSync(
          planPath,
          J({
            label: build.label,
            tmux: build.bin,
            socket,
            conf,
            tmuxTmp,
            home,
            dir,
            node: process.execPath,
            drawer: SELF,
            recorder: join(ROOT, 'build', 'p337', 'key-recorder.mjs'),
            pty: ptyPath,
            python,
            fixtures,
            keysEncoding: KEYS_FIXTURE,
            parentClient,
            arms,
            counts: { keys: KEY_FLOOR, changes: CHANGE_FLOOR, trials: TRIAL_FLOOR },
            logFile
          })
        );
        const env = { ...process.env, HOME: home, ZDOTDIR: home, HISTFILE: '/dev/null', TMUX_TMPDIR: tmuxTmp };
        for (const name of Object.keys(env)) if (name === 'TERM_SESSION_ID' || name === 'TMUX' || name === 'TMUX_PANE' || /^(?:CLAUDECODE|CLAUDE_|GMUX_)/.test(name)) delete env[name];
        const { tsxCli } = await import('../ts-runner.mjs');
        const raw = await new Promise((resolveRaw) => {
          const child = spawn(process.execPath, [tsxCli(), '--tsconfig', 'tsconfig.node.json', join('build', 'p337', 'drive-screen.mts'), planPath], { cwd: ROOT, env, stdio: ['ignore', 'pipe', 'pipe'] });
          let stdout = '';
          let stderr = '';
          const timer = setTimeout(() => child.kill('SIGTERM'), 40 * 60_000);
          child.stdout.setEncoding('utf8');
          child.stderr.setEncoding('utf8');
          child.stdout.on('data', (c) => (stdout += c));
          child.stderr.on('data', (c) => (stderr = `${stderr}${c}`.slice(-8_000)));
          child.on('close', (code) => {
            clearTimeout(timer);
            const line = stdout.split('\n').find((l) => l.startsWith('P337_MEASURE:'));
            resolveRaw(line === undefined ? { printed: false, code, stderr } : JSON.parse(line.slice('P337_MEASURE:'.length)));
          });
        });
        if (raw.printed === false) {
          unreadable += 1;
          say(`UNREADABLE ${build.label}: the drive printed no reading (exit ${String(raw.code)})\n${String(raw.stderr).trim().split('\n').slice(-12).join('\n')}`);
          entry.unreadable = 'the drive printed no reading';
        } else {
          if (raw.ok !== true) {
            unreadable += 1;
            say(`UNREADABLE ${build.label}: the drive stopped: ${String(raw.error ?? 'no reason')}`);
          }
          const caps = raw.caps ?? { cols: 512, rows: 200, runs: 16_384, bytes: 1_048_576 };
          const summary = { F: summarizeF(raw.F), K: summarizeK(raw.K), L: summarizeL(raw.L), C: summarizeC(raw.C), S: summarizeS(raw.S, caps), Z: summarizeZ(raw.Z) };
          for (const id of arms) {
            if (raw[id] === undefined) {
              unreadable += 1;
              entry.arms.push({ id, ok: null, said: 'not reached' });
              say(`UNREADABLE ${build.label} ${id}: not reached`);
              continue;
            }
            const why = unreadableOf(id, summary[id]);
            if (why !== null) {
              unreadable += 1;
              entry.arms.push({ id, ok: null, said: why });
              say(`UNREADABLE ${build.label} ${id}: ${why}`);
              continue;
            }
            const g = grade(id, summary[id]);
            if (!g.ok) failures += 1;
            entry.arms.push({ id, ok: g.ok, failed: g.failed });
            say(`${g.ok ? 'PASS' : 'FAIL'} ${build.label} ${id}: ${GRADERS[id].title}${g.ok ? '' : `; FAILED ${J(g.failed)}`}`);
          }
          if (arms.includes('F')) say(`${build.label} F: ${String(summary.F.n)} captures; text ${J(summary.F.textMismatch.slice(0, 3))}; styles ${J(summary.F.styleMismatch.slice(0, 3))}; far ${J(summary.F.remoteDiffer.slice(0, 3))}`);
          if (arms.includes('K')) {
            say(`${build.label} K check-to-land: n=${String(summary.K.land.n)} p50=${String(summary.K.land.p50)} p99=${String(summary.K.land.p99)} max=${String(summary.K.land.max)} ms (graded: p99 under ${String(CHECK_TO_LAND_P99_MS)} ms); differ ${J(summary.K.differ.slice(0, 6))}; carriage ${J(summary.K.carriageDiffer.slice(0, 6))}`);
            say(`${build.label} K the gap: ${J(summary.K.gap)}; printed and not graded: two at once ${J(summary.K.concurrent)}, the parent's one statement ${J(summary.K.parentShape)}; a named key not alone: ${J(summary.K.notAlone)}`);
          }
          if (arms.includes('L')) say(`${build.label} L change to answer: n=${String(summary.L.n)} missed=${String(summary.L.missed)} p50=${String(summary.L.p50)} p99=${String(summary.L.p99)} max=${String(summary.L.max)} ms; closing answered in ${String(summary.L.closedMs)} ms (tick ${String(summary.L.tickMs)})`);
          if (arms.includes('C')) say(`${build.label} C: ${String(summary.C.wrong)} misattributed over ${String(summary.C.trials)} trials at HEAD; the parent's client: ${summary.C.parent === null ? (summary.C.parentWhy ?? 'not asked (P337_PARENT_CHECKOUT)') : `${String(summary.C.parent.wrong)} over ${String(summary.C.parent.trials)} trials`}`);
          if (arms.includes('S')) say(`${build.label} S compose times, printed and not graded: ${summary.S.times.join('; ')}`);
          if (arms.includes('Z') && summary.Z !== null) say(`${build.label} Z: ${J(summary.Z)}`);
          entry.summary = summary;
          if (KEEP) entry.raw = raw;
        }
      }
    } finally {
      // The server, by its scratch socket name, whatever the drive managed; then the directory.
      spawnSync(build.bin, ['-L', socket, 'kill-server'], { env: tmuxEnv, encoding: 'utf8', timeout: 10_000 });
      if (!KEEP) rmSync(dir, { recursive: true, force: true });
      else say(`${build.label}: kept ${dir} (P337_KEEP=1)`);
    }
    report.builds.push(entry);
  }

  if (widthsOnly) {
    const b37 = measured['3.7b'];
    const b36 = measured['3.6a'];
    if (b37 === undefined || b37.unreadable > 0 || (b36 !== undefined && b36.unreadable > 0)) {
      say('UNREADABLE: a build was not scanned whole; the fixtures were not written.');
      process.exit(2);
    }
    const widths = JSON.parse(readFileSync(WIDTHS_FIXTURE, 'utf8'));
    const seq = JSON.parse(readFileSync(SEQUENCES_FIXTURE, 'utf8'));
    const builds = { '3.7b': { tally: b37.tally, ranges: b37.ranges } };
    if (b36 !== undefined) builds['3.6a'] = { tally: b36.tally, ranges: b36.ranges };
    writeFileSync(WIDTHS_FIXTURE, `${J({ source: widths.source, codePoints: scannedPoints().length, excluded: widths.excluded, builds })}\n`);
    const cases = {};
    for (const l of Object.keys(seq.cases)) cases[l] = { '3.7b': b37.sequences[l], ...(b36 === undefined ? {} : { '3.6a': b36.sequences[l] }) };
    writeFileSync(SEQUENCES_FIXTURE, `${JSON.stringify({ source: seq.source, cases }, null, 1)}\n`);
    say(`wrote ${WIDTHS_FIXTURE} and ${SEQUENCES_FIXTURE}; the screen's own test pins their sha256, which moves with them`);
  }

  const historyAfter = historyStat();
  report.historyAfter = historyAfter;
  if (historyAfter !== historyBefore) {
    failures += 1;
    say(`FAIL: his shell history moved during the run: before ${historyBefore}, after ${historyAfter}`);
  } else say(`history unchanged: ${historyAfter}`);
  const out = join('/private/tmp', `p337-measure-${String(process.pid)}.json`);
  writeFileSync(out, `${J(report, null, 2)}\n`, { mode: 0o600 });
  say(`report: ${out}`);
  if (failures > 0) {
    say(`FAIL: ${String(failures)} arm(s) failed${unreadable > 0 ? `, ${String(unreadable)} unreadable` : ''}.`);
    process.exit(1);
  }
  if (unreadable > 0) {
    say(`UNREADABLE: ${String(unreadable)} build(s) or arm(s) could not be read; nothing failed.`);
    process.exit(2);
  }
  say('PASS: every arm on every build. No Electron, no door, no agent, no token; every tmux server ended.');
  process.exit(0);
}

/** This file run as the entry point (not as a drawer, and not imported for a grader). */
function isEntry() {
  try {
    return process.argv[1] !== undefined && realpathSync(process.argv[1]) === realpathSync(SELF) && process.argv[2] !== '--draw';
  } catch {
    return false;
  }
}
if (isEntry()) {
  if (process.argv.includes('--self-test')) process.exit(selfTest() ? 0 : 1);
  await run();
}
