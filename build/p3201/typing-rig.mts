/**
 * typing-rig.mts. `npm run probe:p320:rig` (Phase 320.1, build/p3201/SPEC.md
 * §7.1 and §7.2). The typing arms over a link with a real round trip, with NO
 * Electron. Run it through build/p3201/rig.mjs, which hands it the pinned tsx.
 *
 * ## What is real and what is supplied
 *
 * REAL, and the SHIPPING code, imported from this tree: the renderer's
 * `ScrollSurface` (src/renderer/terminal/scroll/surface.ts), main's
 * `scroll.ts`, the `TmuxControlClient` and the carriage door's
 * `guardedScrollRunner` (src/main/machines/scroll-shapes.ts), over a real `tmux
 * -C` client on a scratch server of this run's own, with
 * build/p3201/relay.mjs between them adding D ms each way plus a jitter of up
 * to J ms. The keys go through a REAL `tmux attach` in a node-pty, behind a
 * delay line of their own (the same link shape, independent of the carriage's:
 * the worst case, two paths). The pane runs build/p320/recorder.mjs, a raw-mode
 * program that logs every byte it receives, and that log is the ruler.
 *
 * SUPPLIED, and stated: the small part of main that decides a remote scroll
 * (`GmuxCore.remoteScroll`, src/main/sessions/core.ts) is restated here in a
 * few lines, because core loads the whole app. It answers exactly what core's
 * table answers for a connected machine and a live row: the operation through a
 * runner made on the CURRENT connection, `hasPane: true`, and the
 * not-reachable-now value (`NO_PANE_HERE` with `unreachable: true`) for a
 * connection that is down or an operation that failed. Since Phase 320.1's
 * fix round it restates core's READ PROOF too (`proveRemoteRead`): the first
 * operation on a connection is preceded by one read, and a connection whose
 * read cannot be read answers `NO_PANE_HERE` and parks nothing.
 *
 * THE SECOND BUILD (build/p3201/SPEC.md D13): every decision the redesign
 * adds is the SHIPPING src/main/machines/scroll-order.ts, imported, never
 * restated: `routeKey` decides the road of every keystroke the surface sends
 * and writes the typed sequence itself over the world's carriage (through the
 * module's own seam, `resetScrollOrderForTests(undefined, source)`, whose
 * source is this world's live row and runner); `roadFacts`, `keysSoFar`,
 * `awaitRoadQuiet`, `noteWritten`, `stampedRunner`, `readBeforePark` (with the
 * core's `stillWanted` and `parking` hooks), `undoRacedPark`,
 * `leaveForProgram`, `noteAnswer`, `noteSettled`, `noteWithdrawn` and
 * `noteUnreadableConnection` are called in core's order. WHAT IS STILL
 * RESTATED from core, listed so a later round can check it against the file:
 * which kind an operation is (`read`, `park`, `unpark` from its sign), the
 * `gated`, `wanted` and `counted` rule (the fix round's F2 and F4),
 * the read proof, and the not-reachable-now value, which carries
 * `keysOrderedInMain` as core's does. The key of an attach that a far pane
 * never saw is dropped the way a detach drops it (the delay line cancelled,
 * S7).
 *
 * THE CONTROL CLIENT'S LOCALE IS A DIMENSION OF THE MATRIX (`P3201_RIG_LOCALE`,
 * Phase 320.1's fix round). tmux answers every tab of a format as `_` to a
 * client it does not classify as UTF-8, and a machine's control client runs
 * with whatever locale that machine's sshd hands it, which is none unless both
 * ends forward one (the loopback machine forwards none). Before the fix the
 * rig inherited this Mac's UTF-8 locale and so never saw that world; the attack
 * verifier removed the locale from the carriage alone and the door lost 115 of
 * 330 characters in S1 and could not park at all in S3. `none` runs the
 * carriage with LANG, LC_ALL, LC_CTYPE and every other LC_ variable removed;
 * `utf8` runs it with LC_ALL=en_US.UTF-8. The world's tmux label carries the
 * locale, so every row and every relay log says which it was. The wheel is handed to
 * the surface as `deltaMode` 1, so nothing measures a cell. No DOM exists: the
 * surface is given the two members of xterm's Terminal it reads (`rows`,
 * `modes.mouseTrackingMode`), and the attach client's screen is a headless
 * xterm Terminal fed by the pty, read for a tmux prompt on its last row.
 *
 * ## The control, in the same invocation and interleaved run by run
 *
 * Research 130's UNGUARDED design: the PARENT's surface.ts and scroll.ts
 * (read out of git at `P3201_RIG_PARENT`, default d8f5c261, into this run's
 * scratch directory) over `args.map(quoteTmuxArg)` straight into
 * `sendCommand`. It is expected to LOSE characters, and a control that loses
 * nothing anywhere is reported: it would mean the rig cannot see a loss.
 *
 * ## The arms (P3201_RIG_ARMS, a comma separated subset; all by default)
 *
 *   S1  a notch (3 lines), then "fix the bug" typed at 60 ms a key, starting
 *       δ ∈ {0, 40, 100, 200, 400, 800} ms after it, 5 runs each. Graded: 0
 *       lost, order kept, and the pane live afterwards at EVERY δ (the fix
 *       round, F2). At δ 0 the first key reaches main BEFORE the notch's
 *       scroll, so it takes the attach and D6's wait holds the scroll; the
 *       next key, typed while it waits, drops it, so the pane is never parked
 *       after the typing. The second build parked it there (the integrator's
 *       ruling on builder C's report), and the parent verifier measured that
 *       jump in the app as a scenario worse than today: reversed.
 *   S2  momentum while typing, two shapes, 10 runs each: research 130's (50
 *       one-line events 16 ms apart, typing at 60 ms a key from 250 ms) and
 *       the reverifier's M3 (the same flick, "fix the bug" from 100 ms at 35
 *       ms a key). Graded: 0 lost, order kept. The flick outlasts the typing,
 *       so the pane is parked afterwards by the wheel, by design.
 *   S3  parked 100 back, then typed. Graded: all delivered in order, live.
 *   S4  parked, the carriage DROPPED by closing the relay (a signal to the
 *       relay, never to the `-C` child), "fix" typed during the outage, the
 *       carriage back after 1 s. Graded: nothing reached the recorder before
 *       the carriage was back, all of it after, in order, the pane live. One
 *       run with the outage held 15 s is printed, not graded (D15), at the
 *       first D only.
 *   S5  the drag: 60 positions over 1 s from 2,900 to 50. Graded: the pane
 *       ends at 50. The settle time is printed.
 *   S6  modes: clock, tree and options mode entered on the scratch server,
 *       "bc" typed. Printed: the bytes that reached the program and the calls
 *       the surface made per key, counted exactly because the rig owns the
 *       bridge. Graded: the same bytes as the control, and no more calls.
 *   H   the hostile argvs of build/p3201/SPEC.md §3.8 through the SHIPPING
 *       guarded runner over the live carriage: each refused, 0 bytes at the
 *       relay, 0 at the recorder, and the canary files a `copy-pipe-and-cancel
 *       'touch …'` and a `#(touch …)` format would make are absent. The canary
 *       is proved able to see: the same format sent UNGUARDED makes its file.
 *   R   one read sent the instant `connected` fires after a relay restart
 *       receives its own answer (P5, which landed in Phase 320), 10 trials.
 *   S7  THE SECOND BUILD'S: parked, `x` typed, and the session LEFT δ ∈ {0, 5,
 *       25} ms after: the surface disposed and the attach's delay line
 *       cancelled, which is what a detach does to bytes not yet sent. Graded:
 *       the key delivered (the first attempt delivered 0 of 20 at δ 0).
 *   S8  THE SECOND BUILD'S: a 16 KB paste over a parked pane, then one key at
 *       once. Graded: every byte of the paste, in order, then the key, and the
 *       pane live afterwards (64 typed commands of 256 bytes behind one
 *       cancel on the door; the control's attach types into copy mode).
 *
 * ## The grades (§7.2)
 *
 * The door: every S arm at every D with J ≤ 30 reads 0 lost, order kept and
 * (where graded) the pane live; J above 32 is printed, not graded. S6 is
 * graded as delivering at least what the control delivered (a key over a
 * mode goes behind a cancel on the door). The control is printed beside it.
 *
 * ## Environment
 *
 *   P3201_RIG_TMUX    comma separated tmux binaries; default
 *                     /opt/homebrew/bin/tmux (3.6a) and
 *                     build/vendor/tmux/bin/tmux (3.7b), each if present
 *   P3201_RIG_D       one-way delays in ms; default 0,3,25,60
 *   P3201_RIG_J       jitters in ms; default 0,10,30
 *   P3201_RIG_ARMS    default S1,S2,S3,S4,S5,S6,S7,S8,H,R
 *   P3201_RIG_LOCALE  the carriage's locale: none, utf8 or both; default
 *                     none,utf8 (Phase 320.1's fix round, above)
 *   P3201_RIG_RUNS    a multiplier on every arm's run count, default 1
 *   P3201_RIG_PARENT  the parent commit for the control, default d8f5c261
 *   P3201_RIG_OUT     the readings file; default out/p3201-rig/readings-<time>.json.
 *                     Each world's relay log (every byte the carriage wrote,
 *                     hex, timed) is kept beside it as
 *                     `<readings>-relay-<tmux>-D<d>-J<j>.jsonl`, and every row
 *                     names its own lines of it as `extra.relayLines`.
 *
 * ## SAFETY
 *
 * Every tmux server it starts is on a socket of its own (`-L p3201rig`) inside a
 * scratch `TMUX_TMPDIR` under /private/tmp that it makes and removes; it is
 * ended BY THE PID IT REPORTS in a `finally`, SIGTERM then SIGKILL after two
 * seconds, and never with kill-server or pkill. Every relay is ended through
 * the client that started it and then by its recorded pid; every pty is killed
 * by its pid; a `-C` client that outlived its server is ended by the pid its
 * relay recorded; all in a `finally`, and on SIGINT and SIGTERM. Anything still
 * running afterwards is a finding. A SIGKILL of this process skips every
 * `finally`, so each server also holds a WATCHDOG session of its own that
 * SIGKILLs it within a second of this process going (it did happen: three
 * servers and their `-C` clients of a killed run were up four hours later).
 * It never names `-L gmux` or the default server, starts no
 * Electron, spawns no agent and spends no token. If node-pty does not load
 * under this node it exits 2 with a sentence.
 */

import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import xterm from '@xterm/xterm';
import { DelayLine, readPidFile } from './relay.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const HERE = dirname(fileURLToPath(import.meta.url));
const TAG = '[p3201-rig]';
const t0 = Date.now();
const say = (l: string): void => {
  process.stdout.write(`${TAG} ${((Date.now() - t0) / 1000).toFixed(1).padStart(6)}s ${l}\n`);
};
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
const J = (v: unknown): string => JSON.stringify(v);

// ---------------------------------------------------------------------------
// The graders. Pure, exported, and proved under --self-test.
// ---------------------------------------------------------------------------

/** The reverifier's M3 text, and research 130's. */
export const TYPED = 'fix the bug';

/** Length of the longest common subsequence of two strings. */
export function lcsLength(a: string, b: string): number {
  const row = new Array<number>(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i += 1) {
    let diag = 0;
    for (let j = 1; j <= b.length; j += 1) {
      const up = row[j] ?? 0;
      row[j] = a[i - 1] === b[j - 1] ? diag + 1 : Math.max(up, row[j - 1] ?? 0);
      diag = up;
    }
  }
  return row[b.length] ?? 0;
}

/** Characters of `typed` that did not arrive, by LCS against what did. */
export function charsLost(typed: string, got: string): number {
  return typed.length - lcsLength(typed, got);
}

/**
 * A tmux prompt on a screen row: copy mode's jump, search and goto prompts, and
 * any other `(word …) ` prompt tmux draws at the start of the last row.
 */
export function promptOnRow(text: string | null | undefined): boolean {
  return /^\((?:jump|search|goto|go to|copy|command|[a-z][a-z -]{1,30})\)\s?/i.test(String(text ?? '').trimStart());
}

/** The bytes a recorder log holds after its first `from` lines, with the time of each chunk. */
export function recorderSince(text: string, from: number): { bytes: string; chunks: { t: number; bytes: string }[] } {
  const chunks: { t: number; bytes: string }[] = [];
  const lines = text.split('\n').filter((l) => l.trim() !== '');
  for (const line of lines.slice(from)) {
    try {
      const r = JSON.parse(line) as { kind?: string; hex?: string; t?: number };
      if (r.kind === 'input' && typeof r.hex === 'string') chunks.push({ t: Number(r.t ?? 0), bytes: Buffer.from(r.hex, 'hex').toString('latin1') });
    } catch {
      /* the line being written right now */
    }
  }
  return { bytes: chunks.map((c) => c.bytes).join(''), chunks };
}

/** One run's findings for the DOOR (never the control, which is printed). */
export function runFindings(
  arm: string,
  r: { typed: string; got: string; live?: boolean | null; gradeLive?: boolean; before?: string | null }
): string[] {
  const out: string[] = [];
  const lost = charsLost(r.typed, r.got);
  if (lost > 0) out.push(`${arm} lost ${String(lost)} of ${String(r.typed.length)} characters: typed ${J(r.typed)}, received ${J(r.got)}`);
  else if (r.got !== r.typed) out.push(`${arm} received ${J(r.got)} where ${J(r.typed)} was typed: a byte nobody typed, or the order changed`);
  if (typeof r.before === 'string' && r.before.length > 0) out.push(`${arm} ${String(r.before.length)} byte(s) reached the program while the carriage was down (${J(r.before)})`);
  if (r.gradeLive === true && r.live !== true) out.push(`${arm} the pane was not back at live output afterwards`);
  return out;
}

/**
 * The watchdog's command: while `rigPid` runs, sleep; when it is gone, SIGKILL
 * `serverPid`, the scratch server that runs this very command. Both are whole
 * numbers checked here, so nothing but digits reaches the shell.
 */
export function watchdogCommand(rigPid: number, serverPid: number): string {
  for (const n of [rigPid, serverPid]) {
    if (!Number.isInteger(n) || n <= 1) throw new Error(`${String(n)} is not a pid`);
  }
  return `/bin/sh -c 'while kill -0 ${String(rigPid)} 2>/dev/null; do sleep 1; done; kill -9 ${String(serverPid)}'`;
}

/** A position of the drag, i of n from `from` to `to`. */
export function dragAt(i: number, n: number, from: number, to: number): number {
  return Math.round(from + ((to - from) * i) / Math.max(1, n - 1));
}

function selfTest(): boolean {
  const cases: [string, () => unknown, unknown][] = [
    ['lcs of equal texts is their length', () => lcsLength(TYPED, TYPED), 11],
    ['M3 loss is counted by LCS', () => charsLost(TYPED, 'fx th bg'), 3],
    ['a stray byte is not a loss', () => charsLost(TYPED, `${TYPED}\u001b`), 0],
    ['nothing arrived is every character', () => charsLost(TYPED, ''), 11],
    ['a jump prompt is a prompt', () => promptOnRow('(jump forward) '), true],
    ['a goto prompt is a prompt', () => promptOnRow('(goto line) 12'), true],
    ['a recorder line is not a prompt', () => promptOnRow('line 3199'), false],
    ['an empty row is not a prompt', () => promptOnRow(''), false],
    ['the recorder log is read after its offset', () => recorderSince('{"kind":"ready"}\n{"kind":"input","hex":"66","t":1}\n{"kind":"input","hex":"6978","t":2}\n', 2).bytes, 'ix'],
    ['a half written line is skipped', () => recorderSince('{"kind":"input","hex":"66","t":1}\n{"kind":"inp', 0).bytes, 'f'],
    ['the door passes a whole delivery', () => runFindings('S1', { typed: TYPED, got: TYPED, live: true, gradeLive: true }), []],
    ['the door names a loss', () => runFindings('S1', { typed: TYPED, got: 'fx the bug', live: true, gradeLive: true }), ['S1 lost 1 of 11 characters: typed "fix the bug", received "fx the bug"']],
    ['the door names a pane left parked', () => runFindings('S3', { typed: TYPED, got: TYPED, live: false, gradeLive: true }).length, 1],
    ['the door names bytes during an outage', () => runFindings('S4', { typed: 'fix', got: 'fix', live: true, gradeLive: true, before: 'f' }).length, 1],
    ['the door names a byte nobody typed', () => runFindings('S2', { typed: TYPED, got: `${TYPED}x` }).length, 1],
    ['the drag goes 2900 to 50 in 60', () => [dragAt(0, 60, 2900, 50), dragAt(59, 60, 2900, 50)], [2900, 50]],
    ['the watchdog waits on the rig and then kills the server it runs in', () => watchdogCommand(4242, 4343), "/bin/sh -c 'while kill -0 4242 2>/dev/null; do sleep 1; done; kill -9 4343'"],
    ['the watchdog refuses a pid that is not a whole number', () => { try { return watchdogCommand(4242, Number.NaN); } catch { return 'refused'; } }, 'refused'],
    ['the watchdog refuses pid 1', () => { try { return watchdogCommand(1, 4343); } catch { return 'refused'; } }, 'refused'],
    ['S8\'s paste is 16 KB of printable ASCII lines, each ended with a return', () => { const t = pasteText(); return [t.length, /^[\x20-\x7e\r]+$/.test(t), t.startsWith('paste 00001 abc')]; }, [16_384, true, true]],
    ['S8\'s paste is 64 typed commands of 256 bytes on the door', () => Math.ceil(Buffer.byteLength(pasteText(), 'utf8') / 256), 64]
  ];
  let ok = true;
  for (const [label, run, want] of cases) {
    let got: unknown;
    try {
      got = run();
    } catch (err) {
      got = `THREW ${err instanceof Error ? err.message : String(err)}`;
    }
    const good = J(got) === J(want);
    ok = ok && good;
    say(`${good ? 'ok  ' : 'BAD '} ${label}: ${J(got)}${good ? '' : ` want ${J(want)}`}`);
  }
  say(ok ? `self-test PASS: ${String(cases.length)} fixtures` : 'self-test FAIL');
  return ok;
}

if (process.argv.includes('--self-test')) process.exit(selfTest() ? 0 : 1);

// ---------------------------------------------------------------------------
// The refusals
// ---------------------------------------------------------------------------

const refuse = (why: string): never => {
  process.stderr.write(`${TAG} REFUSED. ${why}\n`);
  process.exit(2);
};

type Pty = {
  pid: number;
  write(data: string): void;
  onData(cb: (d: string) => void): unknown;
  kill(signal?: string): void;
};
type PtyModule = { spawn(file: string, args: string[], o: Record<string, unknown>): Pty };
let pty: PtyModule;
try {
  pty = createRequire(import.meta.url)('node-pty') as PtyModule;
  const probe = pty.spawn('/bin/echo', ['p3201'], { cols: 20, rows: 5, env: process.env });
  probe.kill();
} catch (err) {
  refuse(`node-pty does not load under this node (${process.version}): ${err instanceof Error ? err.message.split('\n')[0] : String(err)}. The app arms of probe:p320 stand alone.`);
}

const list = (name: string, fallback: string): string[] =>
  (process.env[name] ?? '').trim() === '' ? fallback.split(',') : String(process.env[name]).split(',').map((s) => s.trim()).filter((s) => s !== '');
const TMUXES = list('P3201_RIG_TMUX', ['/opt/homebrew/bin/tmux', join(REPO, 'build', 'vendor', 'tmux', 'bin', 'tmux')].filter((p) => existsSync(p)).join(','));
if (TMUXES.length === 0) refuse('no tmux: neither /opt/homebrew/bin/tmux nor build/vendor/tmux/bin/tmux is here, and P3201_RIG_TMUX names none.');
for (const t of TMUXES) if (!existsSync(t)) refuse(`${t} is not here.`);
const DS = list('P3201_RIG_D', '0,3,25,60').map(Number);
const JS = list('P3201_RIG_J', '0,10,30').map(Number);
if ([...DS, ...JS].some((n) => !Number.isFinite(n) || n < 0 || n > 1000)) refuse('P3201_RIG_D and P3201_RIG_J are lists of whole ms from 0 to 1000.');
const ALL_ARMS = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'H', 'R'];
const ARMS = list('P3201_RIG_ARMS', ALL_ARMS.join(',')).map((s) => s.toUpperCase());
const badArms = ARMS.filter((a) => !ALL_ARMS.includes(a));
if (badArms.length > 0) refuse(`P3201_RIG_ARMS names ${badArms.join(', ')}; the arms are ${ALL_ARMS.join(', ')}.`);
const LOCALES = list('P3201_RIG_LOCALE', 'none,utf8').map((s) => s.toLowerCase());
if (LOCALES.some((l) => l !== 'none' && l !== 'utf8')) refuse('P3201_RIG_LOCALE is none, utf8, or both.');
const RUNS = Math.max(0.2, Number(process.env['P3201_RIG_RUNS'] ?? '1') || 1);
const runs = (n: number): number => Math.max(1, Math.round(n * RUNS));
const PARENT = (process.env['P3201_RIG_PARENT'] ?? '').trim() || 'd8f5c261';
const OUT = resolve(REPO, (process.env['P3201_RIG_OUT'] ?? '').trim() || join('out', 'p3201-rig', `readings-${new Date().toISOString().replace(/[:.]/g, '-')}.json`));
mkdirSync(dirname(OUT), { recursive: true });
/**
 * Every relay log this run KEPT, beside the readings: the scratch directory is
 * removed at the end, and the log is what a verifier re-derives every command
 * that crossed the carriage from (build/p3201/SPEC.md §10 item 1). Each row
 * names its own slice of it as `extra.relayLines`, [first, end) by line.
 */
const relayLogs: string[] = [];
const RECORDER = join(REPO, 'build', 'p320', 'recorder.mjs');
/** Three hours: longer than any world, so the recorder never ends itself mid-arm. */
const RECORDER_MAX_MS = 3 * 60 * 60 * 1000;
const RELAY = join(HERE, 'relay.mjs');

// ---------------------------------------------------------------------------
// The shipping modules, and the parent's for the control
// ---------------------------------------------------------------------------

const imp = async (path: string): Promise<Record<string, any>> => (await import(pathToFileURL(path).href)) as Record<string, any>;
const head = {
  surface: await imp(join(REPO, 'src', 'renderer', 'terminal', 'scroll', 'surface.ts')),
  scroll: await imp(join(REPO, 'src', 'main', 'tmux', 'scroll.ts')),
  shapes: await imp(join(REPO, 'src', 'main', 'machines', 'scroll-shapes.ts')),
  client: await imp(join(REPO, 'src', 'main', 'tmux', 'control-client.ts')),
  options: await imp(join(REPO, 'src', 'main', 'tmux', 'server-options.ts')),
  // THE SECOND BUILD: the two roads kept apart, the SHIPPING module (D13).
  order: await imp(join(REPO, 'src', 'main', 'machines', 'scroll-order.ts'))
};
for (const [mod, name] of [
  [head.surface, 'ScrollSurface'],
  [head.shapes, 'guardedScrollRunner'],
  [head.client, 'TmuxControlClient'],
  [head.client, 'quoteTmuxArg'],
  [head.scroll, 'scrollPaneBy'],
  [head.order, 'routeKey'],
  [head.order, 'awaitRoadQuiet'],
  [head.order, 'readBeforePark'],
  [head.order, 'undoRacedPark'],
  [head.order, 'stampedRunner'],
  [head.order, 'roadFacts'],
  [head.order, 'resetScrollOrderForTests'],
  // The fix round's.
  [head.order, 'keysSoFar'],
  [head.order, 'leaveForProgram'],
  [head.order, 'noteParkedByUs']
] as const) {
  if (typeof mod[name] !== 'function') refuse(`the shipping tree exports no ${name}, so there is nothing to drive.`);
}

const scratch = mkdtempSync('/private/tmp/p3201-rig-');
const parentDir = join(scratch, 'parent');
const PARENT_FILES = [
  'src/renderer/terminal/scroll/surface.ts',
  'src/renderer/terminal/scroll/live-distance.ts',
  'src/renderer/terminal/capture/metrics.ts',
  'src/renderer/bridge.ts',
  'src/main/tmux/scroll.ts'
];
for (const rel of PARENT_FILES) {
  const shown = spawnSync('git', ['-C', REPO, 'show', `${PARENT}:${rel}`], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  if (shown.status !== 0) {
    rmSync(scratch, { recursive: true, force: true });
    refuse(`git show ${PARENT}:${rel} failed, so the control has no parent to run: ${String(shown.stderr).trim().slice(0, 200)}`);
  }
  mkdirSync(dirname(join(parentDir, rel)), { recursive: true });
  writeFileSync(join(parentDir, rel), shown.stdout);
}
const parent = {
  surface: await imp(join(parentDir, 'src', 'renderer', 'terminal', 'scroll', 'surface.ts')),
  scroll: await imp(join(parentDir, 'src', 'main', 'tmux', 'scroll.ts'))
};

const { Terminal } = xterm as unknown as { Terminal: new (o: Record<string, unknown>) => any };

/** The two members of xterm's Terminal the surface reads. */
const SURFACE_TERM = { rows: 40, modes: { mouseTrackingMode: 'none' } };

/** core.ts's `NO_PANE_HERE` by value: what a connection whose read cannot be read answers. */
const NO_PANE_HERE = {
  hasPane: false,
  position: 0,
  history: 0,
  rows: 0,
  cols: 0,
  frameHistory: null,
  inMode: false,
  innerAlt: false,
  innerMouse: false
};

/**
 * The not-reachable-now value, core.ts's `PANE_NOT_REACHABLE_NOW` by value,
 * which carries `keysOrderedInMain` since the second build (D5).
 */
const UNREACHABLE = {
  hasPane: false,
  position: 0,
  history: 0,
  rows: 0,
  cols: 0,
  frameHistory: null,
  inMode: false,
  innerAlt: false,
  innerMouse: false,
  unreachable: true,
  keysOrderedInMain: true
};

/** The world's machine id, as the router's source names it. */
const RIG_MACHINE = 'rig';

// ---------------------------------------------------------------------------
// One world: a tmux build, a delay and a jitter
// ---------------------------------------------------------------------------

interface World {
  tmux: string;
  version: string;
  delay: number;
  jitter: number;
  dir: string;
  env: NodeJS.ProcessEnv;
  sock: string;
  target: string;
  recLog: string;
  relayLog: string;
  pidFile: string;
  relayPids: Set<number>;
  childPids: Set<number>;
  serverPid: number | null;
  pty: Pty | null;
  screen: any;
  keys: DelayLine | null;
  client: any;
  generation: number;
  /** core.ts's read proof, restated: the connection it was read on, and what it proved. */
  proven: { generation: number; verdict: 'readable' | 'unreadable' } | null;
  outage: boolean;
  connectedAt: number;
  calls: number;
  keyTimes: number[];
  /** Keystrokes the shipping router wrote to the carriage in the current run. */
  carriageKeys: number;
  closed: boolean;
  /** The relay log's line count when the current run began. */
  runStartLine: number;
}

const worlds: World[] = [];
let endedAll = false;

function tmuxCli(w: World, args: string[]): { code: number; out: string } {
  const r = spawnSync(w.tmux, ['-L', w.sock, '-f', '/dev/null', ...args], { env: w.env, encoding: 'utf8', timeout: 10_000 });
  return { code: r.status ?? -1, out: (r.stdout ?? '').trim() };
}

function paneFacts(w: World): { inMode: number; position: number; history: number } {
  const [m, p, h] = tmuxCli(w, ['display-message', '-p', '-t', w.target, '#{pane_in_mode}\t#{scroll_position}\t#{history_size}']).out.split('\t');
  return { inMode: Number(m) || 0, position: Number(p) || 0, history: Number(h) || 0 };
}

function lastRow(w: World): string {
  const b = w.screen.buffer.active;
  const l = b.getLine(b.viewportY + w.screen.rows - 1);
  return l ? String(l.translateToString(true)) : '';
}

function recorderText(w: World): string {
  try {
    return readFileSync(w.recLog, 'utf8');
  } catch {
    return '';
  }
}
const recorderLines = (w: World): number => recorderText(w).split('\n').filter((l) => l.trim() !== '').length;

/** Lines in the relay log: one per chunk the carriage wrote. */
function relayLineCount(w: World): number {
  try {
    return readFileSync(w.relayLog, 'utf8').split('\n').filter((l) => l.trim() !== '').length;
  } catch {
    return 0;
  }
}

function relayBytes(w: World): number {
  try {
    return readFileSync(w.relayLog, 'utf8').split('\n').filter((l) => l.trim() !== '').reduce((n, l) => n + (JSON.parse(l).hex.length / 2), 0);
  } catch {
    return 0;
  }
}

async function waitFor<T>(what: string, test: () => T | null | false | undefined, ms: number, every = 20): Promise<T> {
  const started = Date.now();
  for (;;) {
    const got = test();
    if (got) return got as T;
    if (Date.now() - started > ms) throw new Error(`${what} did not happen within ${String(ms)} ms`);
    await sleep(every);
  }
}

async function openWorld(tmux: string, delay: number, jitter: number, locale: string): Promise<World> {
  const version = `${(spawnSync(tmux, ['-V'], { encoding: 'utf8' }).stdout ?? '').trim()}${locale === 'none' ? ' no-locale' : ''}`;
  const dir = mkdtempSync(join(scratch, 'w-'));
  // THE QUIET SHELL, on this Mac (his ruling of 2026-10-02). The control
  // client's `new-session -A -s gmux-control` names no command, so its pane
  // runs the server's default-shell as a login shell, and before this the
  // server was started with his SHELL and HOME: his zsh, reading his rc files,
  // keeping its history in his ~/.zsh_history. Now the server's shell is
  // /bin/sh with no history file, its HOME and ZDOTDIR an empty directory of
  // this world's own, and his Terminal tab's TERM_SESSION_ID, which is what
  // macOS's /etc/zshrc_Apple_Terminal appends a session's history by, is gone.
  const home = join(dir, 'home');
  mkdirSync(home, { recursive: true, mode: 0o700 });
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    TMUX_TMPDIR: dir,
    SHELL: '/bin/sh',
    HISTFILE: '/dev/null',
    HOME: home,
    ZDOTDIR: home
  };
  delete env['TMUX'];
  delete env['TMUX_PANE'];
  delete env['TERM_SESSION_ID'];
  // THE CARRIAGE'S OWN ENVIRONMENT, and only the carriage's: the keys' attach
  // client keeps `-u`, as the app's own attach does.
  const carriageEnv: NodeJS.ProcessEnv = { ...env };
  for (const name of Object.keys(carriageEnv)) {
    if (name === 'LANG' || name.startsWith('LC_')) delete carriageEnv[name];
  }
  if (locale === 'utf8') carriageEnv['LC_ALL'] = 'en_US.UTF-8';
  const w: World = {
    tmux,
    version,
    delay,
    jitter,
    dir,
    env,
    sock: 'p3201rig',
    target: '',
    recLog: join(dir, 'recorder.jsonl'),
    relayLog: join(dir, 'relay.jsonl'),
    pidFile: join(dir, 'relay.pid'),
    relayPids: new Set(),
    childPids: new Set(),
    serverPid: null,
    pty: null,
    screen: null,
    keys: null,
    client: null,
    generation: 0,
    proven: null,
    outage: false,
    connectedAt: 0,
    calls: 0,
    keyTimes: [],
    carriageKeys: 0,
    closed: false,
    runStartLine: 0
  };
  worlds.push(w);
  // The server, booted the way a machine's is (remoteBootArgs), with the
  // product's own options, then the recorder's session.
  tmuxCli(w, ['start-server', ';', 'set-option', '-s', 'exit-empty', 'off']);
  // Before the session, because history-limit is read when a pane is made.
  for (const row of head.options['SERVER_OPTIONS'] as { name: string; scope: string; value: string }[]) {
    tmuxCli(w, ['set-option', row.scope, row.name, row.value]);
  }
  // `--max-ms` past the longest world: the recorder ends ITSELF after 15
  // minutes by default, and a world at D = 60 with every arm comes close.
  const created = tmuxCli(w, ['new-session', '-d', '-s', 'rig-rec', '-x', '120', '-y', '40', `${process.execPath} ${RECORDER} --log ${w.recLog} --history 3200 --max-ms ${String(RECORDER_MAX_MS)}`]);
  if (created.code !== 0) throw new Error(`the recorder's session did not start on ${tmux}`);
  w.serverPid = Number(tmuxCli(w, ['display-message', '-p', '-t', 'rig-rec', '#{pid}']).out) || null;
  if (w.serverPid === null) throw new Error(`the scratch server on ${tmux} reported no pid, so nothing could end it`);
  // THE WATCHDOG, a session of the scratch server's own, made AFTER the
  // recorder's so the recorder keeps `$0`. It ends this server if THIS process
  // goes without ending it, which a `finally` cannot cover: a SIGKILL of the
  // rig. On 2026-09-29 three worlds of a killed run left their servers and
  // their `-C` clients up for four hours, each server waiting on a client that
  // never left. It is SIGKILL, because a SIGTERM'd server waits for its clients.
  // It is the server's child, not this file's, and it ends with the server.
  tmuxCli(w, ['new-session', '-d', '-s', 'rig-watchdog', watchdogCommand(process.pid, w.serverPid)]);
  w.target = tmuxCli(w, ['display-message', '-p', '-t', 'rig-rec', '#{session_id}']).out;
  if (!/^\$\d+$/.test(w.target)) throw new Error(`the recorder's session has no id (${w.target})`);
  await waitFor('the recorder to start', () => recorderText(w).includes('"ready"'), 15_000, 50);
  // The attach, in a pty, as the app's own is; its screen, for a prompt.
  w.screen = new Terminal({ cols: 120, rows: 40, allowProposedApi: true, scrollback: 0 });
  w.pty = pty.spawn(tmux, ['-L', w.sock, '-f', '/dev/null', '-u', 'attach-session', '-t', w.target], { name: 'xterm-256color', cols: 120, rows: 40, cwd: dir, env });
  w.pty.onData((d) => w.screen.write(d));
  const ptyRef = w.pty;
  w.keys = new DelayLine(delay, jitter, (data: string) => ptyRef.write(data));
  // The carriage: the shipping client, through the relay.
  const transport = {
    machineId: 'rig',
    precheck: async (): Promise<void> => {
      if (w.outage) throw new Error('the carriage is down on purpose');
    },
    plan: async () => ({
      file: process.execPath,
      argv: [RELAY, '--delay', String(delay), '--jitter', String(jitter), '--log', w.relayLog, '--pid-file', w.pidFile, '--', tmux, '-L', w.sock, '-f', '/dev/null', '-C', 'new-session', '-A', '-s', 'gmux-control']
    }),
    env: () => carriageEnv
  };
  w.client = new head.client['TmuxControlClient'](transport);
  // D6: the generation moves FIRST, before anybody hears of the connection.
  w.client.on('connected', () => {
    w.generation += 1;
    w.connectedAt = Date.now();
    const pids = readPidFile(readFileSync(w.pidFile, 'utf8'));
    if (pids.relay !== null) w.relayPids.add(pids.relay);
    if (pids.child !== null) w.childPids.add(pids.child);
  });
  await w.client.start();
  await waitFor('the carriage to connect', () => w.client.connected, 20_000, 20);
  await sleep(300);
  say(`world: ${version} (${tmux}), D ${String(delay)} ms each way, J ${String(jitter)} ms, recorder ${w.target}, server pid ${String(w.serverPid)}`);
  return w;
}

function endProcess(pid: number | null | undefined, signal: NodeJS.Signals = 'SIGTERM'): void {
  if (typeof pid !== 'number' || !Number.isInteger(pid) || pid <= 1) return;
  try {
    process.kill(pid, signal);
  } catch {
    /* already gone */
  }
}

/**
 * True while `pid` names a RUNNING process (signal 0 asks and sends nothing).
 * A zombie is not running: a child of this process that exited while the
 * teardown held the loop (a relay) is `<defunct>` until the loop reaps it,
 * and a defunct entry holds no memory and is not a leak (CLAUDE.md).
 */
function alive(pid: number | null | undefined): boolean {
  if (typeof pid !== 'number' || !Number.isInteger(pid) || pid <= 1) return false;
  try {
    process.kill(pid, 0);
  } catch (err) {
    if ((err as { code?: string }).code !== 'EPERM') return false;
  }
  const stat = (spawnSync('ps', ['-p', String(pid), '-o', 'stat='], { encoding: 'utf8' }).stdout ?? '').trim();
  return stat !== '' && !stat.startsWith('Z');
}

/** Block this thread for `ms`: teardown runs in a signal handler, where nothing may be awaited. */
function pause(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/**
 * SIGTERM, up to `graceMs` for it to go, then SIGKILL. A tmux SERVER needs the
 * second step: on SIGTERM it waits for every client to leave, and a control
 * client whose relay is gone may never leave (2026-09-29, four hours).
 */
function endHard(pid: number | null | undefined, graceMs = 2000): void {
  if (!alive(pid)) return;
  endProcess(pid, 'SIGTERM');
  const until = Date.now() + graceMs;
  while (alive(pid) && Date.now() < until) pause(25);
  if (alive(pid)) endProcess(pid, 'SIGKILL');
}

/** Every pid this run recorded that is still running, for the report. */
const leftRunning: string[] = [];

function closeWorld(w: World): void {
  // Once: the world's own `finally` and the run's both call this.
  if (w.closed) return;
  w.closed = true;
  if (existsSync(w.relayLog)) {
    const kept = join(dirname(OUT), `${basename(OUT, '.json')}-relay-${w.version.replace(/[^A-Za-z0-9.]+/g, '')}-D${String(w.delay)}-J${String(w.jitter)}.jsonl`);
    try {
      copyFileSync(w.relayLog, kept);
      relayLogs.push(kept);
    } catch {
      /* the readings say which logs were kept */
    }
  }
  try {
    w.client?.stop();
  } catch {
    /* the relay is ended by pid below */
  }
  w.keys?.cancel();
  try {
    w.pty?.kill();
  } catch {
    /* ended by pid below */
  }
  // The attach client in the pty: a plain tmux client, never a `-C` one.
  endHard(w.pty?.pid, 1000);
  // The scratch SERVER first, by the pid IT reported, and nothing else: with it
  // gone every client of it, the `-C` ones included, loses its server and
  // leaves by itself, so no `-C` client is signalled while its server lives.
  endHard(w.serverPid);
  for (const pid of w.relayPids) endHard(pid);
  // A `-C` client that outlived its server, which the relay's child pid names.
  // Ended only when its command line still names this rig's socket, so a pid
  // the system has handed to something else is never signalled.
  for (const pid of w.childPids) {
    const until = Date.now() + 1000;
    while (alive(pid) && Date.now() < until) pause(25);
    if (!alive(pid)) continue;
    const command = (spawnSync('ps', ['-p', String(pid), '-o', 'command='], { encoding: 'utf8' }).stdout ?? '').trim();
    if (command.includes(`-L ${w.sock} `)) endHard(pid, 1000);
  }
  const roles: [string, number | null | undefined][] = [
    ['the scratch server', w.serverPid],
    ['the attach client', w.pty?.pid],
    ...[...w.relayPids].map((pid): [string, number] => ['a relay', pid]),
    ...[...w.childPids].map((pid): [string, number] => ['a -C client', pid])
  ];
  for (const [role, pid] of roles) {
    if (!alive(pid)) continue;
    const command = (spawnSync('ps', ['-p', String(pid), '-o', 'command='], { encoding: 'utf8' }).stdout ?? '').trim();
    leftRunning.push(`${w.version} D${String(w.delay)} J${String(w.jitter)}: ${role}, pid ${String(pid)} (${command.slice(0, 120)})`);
  }
  try {
    w.screen?.dispose();
  } catch {
    /* a headless screen */
  }
}

function endEverything(): void {
  if (endedAll) return;
  endedAll = true;
  for (const w of worlds) closeWorld(w);
  try {
    rmSync(scratch, { recursive: true, force: true });
  } catch {
    /* under /private/tmp */
  }
}
for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP'] as const) {
  process.on(sig, () => {
    endEverything();
    process.exit(130);
  });
}

// ---------------------------------------------------------------------------
// The two bridges: the door (HEAD) and the unguarded design (the control)
// ---------------------------------------------------------------------------

type Which = 'door' | 'control';

function bridgeFor(w: World, which: Which): Record<string, unknown> {
  const s = which === 'door' ? head.scroll : parent.scroll;
  const O = head.order;
  type Kind = 'read' | 'park' | 'unpark';
  const answer = async (
    sessionId: string,
    kind: Kind,
    op: (run: any, target: string) => Promise<Record<string, unknown>>
  ): Promise<Record<string, unknown>> => {
    w.calls += 1;
    if (which === 'door') {
      // core.ts's remoteScroll for a live row, restated in core's order (the
      // second build, §6.5): the runner made on the CURRENT connection, the
      // park gated and counted by the SHIPPING scroll-order.ts, and the
      // not-reachable-now value when there is no connection or the operation
      // failed.
      if (!w.client.connected) return { ...UNREACHABLE };
      const made = w.generation;
      const carriageRun = head.shapes['guardedScrollRunner']({
        send: (line: string) => w.client.sendCommand(line),
        isCurrent: () => w.client.connected && w.generation === made,
        server: 'machine:rig'
      });
      const road = O['roadFacts'](sessionId) as { parked: boolean; mayBeParked: boolean; held: number };
      const gated = kind === 'park' && !road.parked;
      // The fix round (F2, F4): a park whose quiet wait sees a key, or asked
      // while keys are held for a connection that was down, is dropped.
      const keysAtStart = O['keysSoFar'](sessionId) as number;
      const wanted = !gated || (road.held === 0 && ((await O['awaitRoadQuiet'](sessionId)) as boolean));
      const counted = (kind === 'park' && wanted) || road.parked || road.mayBeParked;
      if (counted) O['noteWritten'](sessionId);
      const run = O['stampedRunner'](sessionId, carriageRun);
      let settle = counted;
      try {
        // core.ts's proveRemoteRead, restated: one read before the first
        // operation on a connection, and a connection whose read cannot be
        // read answers NO_PANE_HERE, parks nothing, and takes no keystroke.
        if (w.proven?.generation !== made) {
          try {
            await s['readPaneScroll'](carriageRun, w.target);
            w.proven = { generation: made, verdict: 'readable' };
          } catch (err) {
            if (!(s['isUnreadableScrollAnswer'] as (e: unknown) => boolean)(err)) throw err;
            w.proven = { generation: made, verdict: 'unreadable' };
            O['noteUnreadableConnection'](RIG_MACHINE, made);
          }
        }
        if (w.proven.verdict === 'unreadable') {
          if (counted) O['noteWithdrawn'](sessionId);
          settle = false;
          return { ...NO_PANE_HERE };
        }
        let state: Record<string, unknown>;
        if (!wanted) state = await s['readPaneScroll'](run, w.target);
        else if (gated) {
          state = await O['undoRacedPark'](
            run,
            w.target,
            await O['readBeforePark'](run, w.target, op, {
              stillWanted: () => O['keysSoFar'](sessionId) === keysAtStart,
              parking: () => O['noteParkedByUs'](sessionId)
            })
          );
        } else state = await op(run, w.target);
        // F3: a pane Tortie parked goes back to its program when the program takes it.
        if (counted) state = await O['leaveForProgram'](sessionId, run, w.target, state);
        O['noteAnswer'](sessionId, state, run.lastStamp());
        return { ...state, hasPane: true, keysOrderedInMain: true };
      } catch (err) {
        const stamp = run.lastStamp() as number;
        if (stamp > 0 && (s['isUnreadableScrollAnswer'] as (e: unknown) => boolean)(err)) O['noteAnswer'](sessionId, 'unreadable', stamp);
        else if (stamp > 0 && counted) O['noteAnswer'](sessionId, 'failed', stamp);
        return { ...UNREACHABLE };
      } finally {
        if (settle) O['noteSettled'](sessionId);
      }
    }
    // Research 130's unguarded design: every argv straight into sendCommand.
    const quote = head.client['quoteTmuxArg'] as (a: string) => string;
    const run = (args: readonly string[]): Promise<string> =>
      w.client.sendCommand(args.map(quote).join(' ')).then((l: string[]) => l.join('\n'));
    return { ...(await op(run, w.target)), hasPane: true };
  };
  const byKind = (lines: number): Kind => (Math.trunc(lines) > 0 ? 'park' : Math.trunc(lines) < 0 ? 'unpark' : 'read');
  return {
    scroll: {
      state: (i: { sessionId: string }) => answer(i.sessionId, 'read', (run, target) => s['readPaneScroll'](run, target)),
      by: (i: { sessionId: string; lines: number }) => answer(i.sessionId, byKind(i.lines), (run, target) => s['scrollPaneBy'](run, target, i.lines)),
      to: (i: { sessionId: string; position: number }) =>
        answer(i.sessionId, Math.trunc(i.position) > 0 ? 'park' : 'unpark', (run, target) => s['scrollPaneTo'](run, target, i.position)),
      live: (sessionId: string) => answer(sessionId, 'unpark', (run, target) => s['exitPaneScroll'](run, target))
    },
    term: {
      sendInput: (sessionId: string, data: string) => {
        w.keyTimes.push(Date.now());
        // THE DOOR: main's `term:input` listener, restated as the attach host
        // is (§6.4): the SHIPPING routeKey decides, synchronously, and on
        // 'carriage' it has already written the key behind a cancel.
        // Since the fix round a key can also be 'held' (F4): written nowhere yet.
        if (which === 'door' && O['routeKey'](sessionId, data) !== 'attach') {
          w.carriageKeys += 1;
          return;
        }
        w.keys?.write(data);
      }
    }
  };
}

/**
 * The router's source for THIS world (scroll-order.ts's seam): the session's
 * live row on the world's current connection, and a guarded runner made on it.
 */
function routeSourceFor(w: World): Record<string, unknown> {
  return {
    address: () => ({ kind: 'live', machineId: RIG_MACHINE, tmuxId: w.target }),
    carriage: () => {
      if (!w.client?.connected) return { kind: 'waiting' };
      const made = w.generation;
      return {
        kind: 'live',
        generation: made,
        run: head.shapes['guardedScrollRunner']({
          send: (line: string) => w.client.sendCommand(line),
          isCurrent: () => w.client.connected && w.generation === made,
          server: 'machine:rig'
        })
      };
    }
  };
}

let surfaceSerial = 0;

/** Back to a live pane, no prompt, no mode; then a fresh surface on the chosen bridge. */
async function freshRun(w: World, which: Which): Promise<{ surface: any; offset: number; relayAt: number }> {
  for (let i = 0; i < 6; i += 1) {
    if (promptOnRow(lastRow(w))) w.pty?.write('\u001b');
    tmuxCli(w, ['send-keys', '-t', w.target, '-X', 'cancel']);
    await sleep(60 + 2 * w.delay);
    if (paneFacts(w).inMode === 0 && !promptOnRow(lastRow(w))) break;
  }
  await w.keys?.drained();
  await sleep(150 + 2 * w.delay + w.jitter);
  (globalThis as { window?: unknown }).window = { gmux: bridgeFor(w, which) };
  // A fresh session's roads for the door: the shipping module forgets every
  // session and takes this world's row and runner as its source; a
  // connection already found unreadable stays so (core's proof is per
  // connection, not per run).
  head.order['resetScrollOrderForTests'](undefined, routeSourceFor(w));
  if (w.proven?.verdict === 'unreadable') head.order['noteUnreadableConnection'](RIG_MACHINE, w.proven.generation);
  w.carriageKeys = 0;
  const mod = which === 'door' ? head.surface : parent.surface;
  mod['forgetParkedFramesForTests']?.();
  surfaceSerial += 1;
  // The door's pane says it is on another machine at mount, as TerminalPane
  // does since the fix round; the parent's constructor takes no options.
  const surface =
    which === 'door'
      ? new mod['ScrollSurface'](`rig-${String(surfaceSerial)}`, SURFACE_TERM, { onAnotherMachine: true })
      : new mod['ScrollSurface'](`rig-${String(surfaceSerial)}`, SURFACE_TERM);
  w.runStartLine = relayLineCount(w);
  const before = w.calls;
  surface.start();
  await waitFor('the surface to hear its first answer', () => w.calls > before, 5000, 5);
  await sleep(50 + 2 * w.delay + w.jitter);
  w.keyTimes = [];
  return { surface, offset: recorderLines(w), relayAt: relayBytes(w) };
}

/** Schedule `fn` at `at` ms after `start`, on the real clock. */
function schedule(start: number, at: number, fn: () => void): Promise<void> {
  return new Promise((done) => {
    setTimeout(() => {
      fn();
      done();
    }, Math.max(0, start + at - Date.now()));
  });
}

function notch(lines: number): { deltaY: number; deltaMode: number } {
  return { deltaY: -lines, deltaMode: 1 };
}

/** Wait for the typed text to arrive, up to `ms`, and read what did. */
async function received(w: World, offset: number, typed: string, ms: number): Promise<string> {
  const started = Date.now();
  let got = '';
  for (;;) {
    got = recorderSince(recorderText(w), offset).bytes;
    if (charsLost(typed, got) === 0 || Date.now() - started > ms) return got;
    await sleep(40);
  }
}

// ---------------------------------------------------------------------------
// The arms
// ---------------------------------------------------------------------------

interface Row {
  tmux: string;
  delay: number;
  jitter: number;
  arm: string;
  shape: string;
  which: Which;
  typed: string;
  got: string;
  lost: number;
  live: boolean | null;
  leftOpen: boolean;
  inModeAfter: number;
  extra: Record<string, unknown>;
}
const rows: Row[] = [];
const findings: string[] = [];
const notes: string[] = [];

/** One row, with its slice of the kept relay log. */
function pushRow(w: World, row: Row): Row {
  const full: Row = { ...row, extra: { ...row.extra, relayLines: [w.runStartLine, relayLineCount(w)] } };
  rows.push(full);
  return full;
}

function record(w: World, row: Omit<Row, 'tmux' | 'delay' | 'jitter'>, gradeLive: boolean, before: string | null = null): void {
  pushRow(w, { tmux: w.version, delay: w.delay, jitter: w.jitter, ...row });
  const graded = row.which === 'door' && w.jitter <= 30;
  if (graded) {
    for (const f of runFindings(`${row.arm} ${row.shape}`, { typed: row.typed, got: row.got, live: row.live, gradeLive, before })) {
      findings.push(`${w.version} D${String(w.delay)} J${String(w.jitter)}: ${f}`);
    }
  }
}

async function typeAt(surface: any, start: number, from: number, gap: number, text: string): Promise<void> {
  const all: Promise<void>[] = [];
  [...text].forEach((ch, k) => {
    all.push(schedule(start, from + k * gap, () => surface.sendInput(ch)));
  });
  await Promise.all(all);
}

async function wheelAt(surface: any, start: number, from: number, gap: number, count: number, lines: number): Promise<void> {
  const all: Promise<void>[] = [];
  for (let k = 0; k < count; k += 1) all.push(schedule(start, from + k * gap, () => surface.handleWheel(notch(lines))));
  await Promise.all(all);
}

const settleMs = (w: World): number => 1000 + 4 * w.delay + 2 * w.jitter;

async function afterRun(w: World, surface: any): Promise<{ live: boolean; leftOpen: boolean; inMode: number }> {
  const f = paneFacts(w);
  const open = promptOnRow(lastRow(w));
  surface.dispose();
  return { live: f.inMode === 0 && f.position === 0, leftOpen: open, inMode: f.inMode };
}

async function armS1(w: World): Promise<void> {
  for (const delta of [0, 40, 100, 200, 400, 800]) {
    for (let k = 0; k < runs(5); k += 1) {
      for (const which of ['door', 'control'] as const) {
        const { surface, offset } = await freshRun(w, which);
        const start = Date.now() + 20;
        await schedule(start, 0, () => surface.handleWheel(notch(3)));
        await typeAt(surface, start, delta, 60, TYPED);
        await sleep(settleMs(w));
        const got = await received(w, offset, TYPED, 4000);
        const a = await afterRun(w, surface);
        // Graded live at EVERY δ since the fix round (F2). At δ 0 the first
        // key reaches main before the notch's scroll, the scroll waits for the
        // attach to be quiet, and the next key, 60 ms later, drops it: the
        // pane ends live as it does on this Mac. The second build parked it
        // after the typing (the integrator's ruling, now reversed: the parent
        // verifier measured that jump as a scenario worse than today).
        record(w, { arm: 'S1', shape: `δ ${String(delta)}`, which, typed: TYPED, got, lost: charsLost(TYPED, got), live: a.live, leftOpen: a.leftOpen, inModeAfter: a.inMode, extra: {} }, true);
      }
    }
  }
}

async function armS2(w: World): Promise<void> {
  for (const [shape, from, gap] of [
    ['research 130', 250, 60],
    ['M3', 100, 35]
  ] as const) {
    for (let k = 0; k < runs(10); k += 1) {
      for (const which of ['door', 'control'] as const) {
        const { surface, offset } = await freshRun(w, which);
        const start = Date.now() + 20;
        await Promise.all([wheelAt(surface, start, 0, 16, 50, 1), typeAt(surface, start, from, gap, TYPED)]);
        await sleep(settleMs(w));
        const got = await received(w, offset, TYPED, 4000);
        const a = await afterRun(w, surface);
        record(w, { arm: 'S2', shape, which, typed: TYPED, got, lost: charsLost(TYPED, got), live: a.live, leftOpen: a.leftOpen, inModeAfter: a.inMode, extra: {} }, false);
      }
    }
  }
}

/** Park the pane 100 back through the surface's own wheel, and wait for the surface to know. */
async function park(w: World, surface: any): Promise<void> {
  for (let k = 0; k < 10; k += 1) surface.handleWheel(notch(10));
  await waitFor('the pane to park', () => paneFacts(w).position >= 90, 8000, 30);
  await sleep(300 + 4 * w.delay + 2 * w.jitter);
}

async function armS3(w: World): Promise<void> {
  for (let k = 0; k < runs(5); k += 1) {
    for (const which of ['door', 'control'] as const) {
      const { surface, offset } = await freshRun(w, which);
      await park(w, surface);
      const start = Date.now() + 10;
      await typeAt(surface, start, 0, 35, TYPED);
      await sleep(settleMs(w));
      const got = await received(w, offset, TYPED, 4000);
      const a = await afterRun(w, surface);
      record(w, { arm: 'S3', shape: 'parked 100', which, typed: TYPED, got, lost: charsLost(TYPED, got), live: a.live, leftOpen: a.leftOpen, inModeAfter: a.inMode, extra: {} }, true);
    }
  }
}

async function dropCarriage(w: World): Promise<void> {
  const pid = readPidFile(readFileSync(w.pidFile, 'utf8')).relay;
  if (pid === null) throw new Error('no relay pid to drop the carriage by');
  // A signal to the RELAY, never to the `-C` child (research 131 §3.5).
  process.kill(pid, 'SIGUSR1');
  await waitFor('the client to see the drop', () => !w.client.connected, 5000, 5);
}

async function armS4(w: World, long: boolean): Promise<void> {
  const shapes: [string, number, boolean][] = [['outage 1 s', 1000, true]];
  if (long) shapes.push(['outage 15 s, printed not graded (D15)', 15_000, false]);
  for (const [shape, outageMs, graded] of shapes) {
    for (let k = 0; k < (graded ? runs(3) : 1); k += 1) {
      for (const which of ['door', 'control'] as const) {
        const { surface, offset } = await freshRun(w, which);
        await park(w, surface);
        w.outage = true;
        await dropCarriage(w);
        const typed = 'fix';
        await typeAt(surface, Date.now() + 5, 0, 35, typed);
        await sleep(outageMs);
        const during = recorderSince(recorderText(w), offset).bytes;
        const downAt = Date.now();
        w.outage = false;
        await waitFor('the carriage to come back', () => w.client.connected, 40_000, 20);
        const backAt = w.connectedAt;
        await sleep(settleMs(w) + 1500);
        const got = await received(w, offset, typed, 12_000);
        const chunks = recorderSince(recorderText(w), offset).chunks;
        const before = chunks.filter((c) => c.t < backAt).map((c) => c.bytes).join('');
        const a = await afterRun(w, surface);
        record(
          w,
          { arm: 'S4', shape, which, typed, got, lost: charsLost(typed, got), live: a.live, leftOpen: a.leftOpen, inModeAfter: a.inMode, extra: { during, lastDown: downAt, backAt, deliveredAfterBackMs: chunks.length > 0 ? (chunks[chunks.length - 1]?.t ?? 0) - backAt : null } },
          graded,
          graded ? before : null
        );
        if (!graded) notes.push(`${w.version} D${String(w.delay)} ${which} ${shape}: ${J(got)} delivered, the last byte ${String(chunks.length > 0 ? (chunks[chunks.length - 1]?.t ?? 0) - backAt : 'never')} ms after the carriage came back`);
      }
    }
  }
}

async function armS5(w: World): Promise<void> {
  for (let k = 0; k < runs(3); k += 1) {
    for (const which of ['door', 'control'] as const) {
      const { surface } = await freshRun(w, which);
      const start = Date.now() + 10;
      const n = 60;
      const moves: Promise<void>[] = [];
      for (let i = 0; i < n; i += 1) moves.push(schedule(start, (i * 1000) / (n - 1), () => surface.scrollTo(dragAt(i, n, 2900, 50))));
      await Promise.all(moves);
      const stopped = Date.now();
      let settled: number | null = null;
      const deadline = stopped + 60_000;
      while (Date.now() < deadline) {
        const f = paneFacts(w);
        if (f.inMode > 0 && f.position === 50) {
          settled = Date.now() - stopped;
          break;
        }
        await sleep(10);
      }
      await sleep(500 + 4 * w.delay);
      const final = paneFacts(w).position;
      const a = await afterRun(w, surface);
      pushRow(w, { tmux: w.version, delay: w.delay, jitter: w.jitter, arm: 'S5', shape: 'drag 2900 to 50', which, typed: '', got: '', lost: 0, live: a.live, leftOpen: a.leftOpen, inModeAfter: a.inMode, extra: { settledMs: settled, final } });
      if (which === 'door' && w.jitter <= 30 && final !== 50) findings.push(`${w.version} D${String(w.delay)} J${String(w.jitter)}: S5 the drag ended at ${String(final)}, not 50`);
      const pos = await (async () => {
        (globalThis as { window?: any }).window?.gmux?.scroll?.live?.();
        await sleep(200 + 4 * w.delay);
        return paneFacts(w).position;
      })();
      void pos;
    }
  }
}

async function armS6(w: World): Promise<void> {
  for (const [mode, enter] of [
    ['clock', ['clock-mode', '-t', '%TARGET%']],
    ['tree', ['choose-tree', '-t', '%TARGET%']],
    ['options', ['customize-mode', '-t', '%TARGET%']]
  ] as const) {
    for (let k = 0; k < runs(2); k += 1) {
      for (const which of ['door', 'control'] as const) {
        const { surface, offset } = await freshRun(w, which);
        tmuxCli(w, enter.map((a) => (a === '%TARGET%' ? w.target : a)));
        await sleep(100 + 2 * w.delay);
        const heard = w.calls;
        surface.refresh();
        await waitFor('the surface to hear the mode', () => w.calls > heard, 5000, 5);
        await sleep(100 + 4 * w.delay + 2 * w.jitter);
        const callsBefore = w.calls;
        const typedAt = Date.now();
        await typeAt(surface, typedAt, 0, 35, 'bc');
        await sleep(settleMs(w));
        const got = recorderSince(recorderText(w), offset).bytes;
        const calls = w.calls - callsBefore;
        const keyDelays = w.keyTimes.map((t) => t - typedAt);
        const a = await afterRun(w, surface);
        tmuxCli(w, ['copy-mode', '-q', '-t', w.target]);
        pushRow(w, { tmux: w.version, delay: w.delay, jitter: w.jitter, arm: 'S6', shape: mode, which, typed: 'bc', got, lost: charsLost('bc', got), live: a.live, leftOpen: a.leftOpen, inModeAfter: a.inMode, extra: { callsFromFirstKey: calls, keySentAtMs: keyDelays } });
      }
    }
  }
}

/**
 * S7, THE SECOND BUILD: a key over a parked pane, then the session LEFT at
 * once. The surface is disposed and the attach's delay line is cancelled, which
 * is what a detach does to bytes the far side has not seen. The first attempt
 * held the key in the renderer and lost it every time at δ 0 (0 of 20).
 */
async function armS7(w: World): Promise<void> {
  for (const delta of [0, 5, 25]) {
    for (let k = 0; k < runs(5); k += 1) {
      for (const which of ['door', 'control'] as const) {
        const { surface, offset } = await freshRun(w, which);
        await park(w, surface);
        surface.sendInput('x');
        if (delta > 0) await sleep(delta);
        surface.dispose();
        w.keys?.cancel();
        await sleep(settleMs(w) + 500);
        const got = await received(w, offset, 'x', 4000);
        const f = paneFacts(w);
        record(w, { arm: 'S7', shape: `δ ${String(delta)}`, which, typed: 'x', got, lost: charsLost('x', got), live: f.inMode === 0, leftOpen: promptOnRow(lastRow(w)), inModeAfter: f.inMode, extra: { carriageKeys: w.carriageKeys } }, false);
      }
    }
  }
}

/** The 16 KB paste S8 types: numbered lines of printable ASCII, each ended as xterm ends a pasted line. */
export function pasteText(bytes = 16_384): string {
  let out = '';
  for (let n = 1; out.length < bytes; n += 1) out += `paste ${String(n).padStart(5, '0')} abcdefghijklmnopqrstuvwxyz0123456789\r`;
  return out.slice(0, bytes);
}

/**
 * S8, THE SECOND BUILD: a 16 KB paste over a parked pane, then one key at once.
 * Graded: every byte of the paste, in order, then the key; the pane live.
 */
async function armS8(w: World): Promise<void> {
  const paste = pasteText();
  for (let k = 0; k < runs(2); k += 1) {
    for (const which of ['door', 'control'] as const) {
      const { surface, offset } = await freshRun(w, which);
      await park(w, surface);
      surface.sendInput(paste);
      surface.sendInput('Z');
      await sleep(settleMs(w) + 1500 + 4 * w.delay);
      const typed = `${paste}Z`;
      const got = await received(w, offset, typed, 20_000);
      const a = await afterRun(w, surface);
      const row = { arm: 'S8', shape: '16 KB paste, then a key', which, typed, got, lost: charsLost(typed, got), live: a.live, leftOpen: a.leftOpen, inModeAfter: a.inMode, extra: { pasteBytes: paste.length, gotBytes: got.length, exact: got === typed, carriageKeys: w.carriageKeys } } as const;
      pushRow(w, { tmux: w.version, delay: w.delay, jitter: w.jitter, ...row });
      if (which === 'door' && w.jitter <= 30) {
        if (got !== typed) findings.push(`${w.version} D${String(w.delay)} J${String(w.jitter)}: S8 the 16 KB paste and the key after it arrived as ${String(got.length)} bytes, ${String(charsLost(typed, got))} lost, ${got.startsWith(paste) ? 'the paste whole' : 'the paste NOT whole'}, where ${String(typed.length)} were typed`);
        if (a.live !== true) findings.push(`${w.version} D${String(w.delay)} J${String(w.jitter)}: S8 the pane was not live after the paste and the key`);
      }
    }
  }
}

async function armH(w: World): Promise<void> {
  w.runStartLine = relayLineCount(w);
  const canary = join(w.dir, 'canary');
  mkdirSync(canary, { recursive: true });
  // The format the table admits for a machine, so "the format with #( appended"
  // is one byte past an admitted read and not already refused for its separator.
  const F = head.scroll['REMOTE_STATE_FORMAT'] as string;
  const HOSTILE: [string, string[]][] = [
    ['copy-pipe-and-cancel with a touch', ['send-keys', '-t', w.target, '-X', 'copy-pipe-and-cancel', `touch ${canary}/copy-pipe`]],
    ['a format that runs a program', ['display-message', '-p', '-t', w.target, '-F', `#(touch ${canary}/format)`]],
    ['the format with #( appended', ['display-message', '-p', '-t', w.target, '-F', `${F}#(touch ${canary}/appended)`]],
    ['-l literal text', ['send-keys', '-t', w.target, '-l', 'abc']],
    ['a key name', ['send-keys', '-t', w.target, 'Enter']],
    // `-H 41` is the SEVENTH SHAPE since his word of 2026-09-30, so what
    // stays hostile is every other spelling of -H.
    ['-H in capitals', ['send-keys', '-t', w.target, '-H', '4A']],
    ['-H with a key name', ['send-keys', '-t', w.target, '-H', 'Enter']],
    ['-H with -l', ['send-keys', '-t', w.target, '-H', '-l', '41']],
    ['run-shell', ['run-shell', `touch ${canary}/run-shell`]],
    ['a second command after ;', ['copy-mode', '-e', '-t', w.target, ';', 'run-shell', `touch ${canary}/semicolon`]],
    ['a % target', ['send-keys', '-t', '%0', '-X', 'cancel']],
    ['a name target', ['send-keys', '-t', 'rig-rec', '-X', 'cancel']],
    ['-N 2001', ['send-keys', '-t', w.target, '-X', '-N', '2001', 'scroll-up']],
    ['-N 1e3', ['send-keys', '-t', w.target, '-X', '-N', '1e3', 'scroll-up']],
    ['kill-server', ['kill-server']]
  ];
  const offset = recorderLines(w);
  const before = relayBytes(w);
  const made = w.generation;
  const run = head.shapes['guardedScrollRunner']({
    send: (line: string) => w.client.sendCommand(line),
    isCurrent: () => w.client.connected && w.generation === made,
    server: 'machine:rig'
  });
  const refused: string[] = [];
  for (const [label, args] of HOSTILE) {
    try {
      await run(args);
      findings.push(`${w.version}: H the door ANSWERED the hostile argv "${label}"`);
    } catch {
      refused.push(label);
    }
  }
  await sleep(1500 + 4 * w.delay);
  const after = relayBytes(w);
  const files = readdirSync(canary);
  const got = recorderSince(recorderText(w), offset).bytes;
  if (after !== before) findings.push(`${w.version}: H ${String(after - before)} byte(s) crossed the relay for ${String(HOSTILE.length)} refused argvs; it is 0`);
  if (files.length > 0) findings.push(`${w.version}: H a program ran on the far side: ${J(files)}`);
  if (got.length > 0) findings.push(`${w.version}: H the recorder received ${J(got)}`);
  // THE CANARY CAN SEE: the same format, UNGUARDED, makes its file.
  const quote = head.client['quoteTmuxArg'] as (a: string) => string;
  await w.client.sendCommand(['display-message', '-p', '-t', w.target, '-F', `#(touch ${canary}/control)`].map(quote).join(' ')).catch(() => undefined);
  let seen = false;
  for (let i = 0; i < 30 && !seen; i += 1) {
    await sleep(100);
    seen = existsSync(join(canary, 'control'));
  }
  pushRow(w, { tmux: w.version, delay: w.delay, jitter: w.jitter, arm: 'H', shape: 'hostile argvs', which: 'door', typed: '', got, lost: 0, live: null, leftOpen: false, inModeAfter: 0, extra: { refused: refused.length, of: HOSTILE.length, relayBytes: after - before, canaryFiles: files, canaryCanSee: seen } });
  if (!seen) notes.push(`${w.version}: H the unguarded #( control made no file, so the canary's absence proves less on this build`);
  rmSync(join(canary, 'control'), { force: true });
}

async function armR(w: World): Promise<void> {
  w.runStartLine = relayLineCount(w);
  let right = 0;
  const trials = runs(10);
  const answers: string[] = [];
  for (let i = 0; i < trials; i += 1) {
    const got = new Promise<string>((done) => {
      w.client.once('connected', () => {
        const made = w.generation;
        const run = head.shapes['guardedScrollRunner']({
          send: (line: string) => w.client.sendCommand(line),
          isCurrent: () => w.client.connected && w.generation === made,
          server: 'machine:rig'
        });
        head.scroll['readPaneScroll'](run, w.target).then(
          (s: { rows: number; cols: number }) => done(`${String(s.rows)}x${String(s.cols)}`),
          (e: unknown) => done(`threw ${e instanceof Error ? e.message : String(e)}`)
        );
      });
    });
    await dropCarriage(w);
    const answer = await got;
    answers.push(answer);
    if (answer === '40x120') right += 1;
    await sleep(200);
  }
  pushRow(w, { tmux: w.version, delay: w.delay, jitter: w.jitter, arm: 'R', shape: 'first read after a reconnect', which: 'door', typed: '', got: '', lost: 0, live: null, leftOpen: false, inModeAfter: 0, extra: { right, trials, answers } });
  if (right !== trials) findings.push(`${w.version} D${String(w.delay)}: R the first read after a reconnect got its own answer in ${String(right)} of ${String(trials)} (${J(answers)})`);
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

let exitCode = 0;
try {
  say(`matrix: ${TMUXES.join(', ')} x carriage locale ${LOCALES.join(',')} x D ${DS.join(',')} x J ${JS.join(',')}; arms ${ARMS.join(',')}; control from ${PARENT}; this rig is pid ${String(process.pid)}, which each server's watchdog watches`);
  let first = true;
  for (const tmux of TMUXES) {
   for (const locale of LOCALES) {
    for (const delay of DS) {
      for (const jitter of JS) {
        const w = await openWorld(tmux, delay, jitter, locale);
        try {
          if (ARMS.includes('R')) await armR(w);
          if (ARMS.includes('H')) await armH(w);
          if (ARMS.includes('S1')) await armS1(w);
          if (ARMS.includes('S2')) await armS2(w);
          if (ARMS.includes('S3')) await armS3(w);
          if (ARMS.includes('S4')) await armS4(w, first);
          if (ARMS.includes('S5')) await armS5(w);
          if (ARMS.includes('S6')) await armS6(w);
          if (ARMS.includes('S7')) await armS7(w);
          if (ARMS.includes('S8')) await armS8(w);
        } catch (err) {
          findings.push(`${w.version} D${String(delay)} J${String(jitter)}: the world stopped: ${err instanceof Error ? err.message : String(err)}`);
        } finally {
          closeWorld(w);
        }
        first = false;
        // One line a world, door beside control.
        const here = rows.filter((r) => r.tmux === w.version && r.delay === delay && r.jitter === jitter);
        const sum = (which: Which, arm: string): string => {
          const r = here.filter((x) => x.which === which && x.arm === arm);
          if (r.length === 0) return '-';
          const lostN = r.reduce((n, x) => n + x.lost, 0);
          const typedN = r.reduce((n, x) => n + x.typed.length, 0);
          return `${String(lostN)}/${String(typedN)}`;
        };
        say(`${w.version} D${String(delay)} J${String(jitter)} lost, door | control: ` + ['S1', 'S2', 'S3', 'S4', 'S7', 'S8'].map((a) => `${a} ${sum('door', a)} | ${sum('control', a)}`).join('; '));
        const opened = (which: Which): string => {
          const r = here.filter((x) => x.which === which && x.arm === 'S2');
          return `${String(r.filter((x) => x.leftOpen).length)} with a prompt, ${String(r.filter((x) => x.inModeAfter > 0).length)} in copy mode, of ${String(r.length)}`;
        };
        if (here.some((x) => x.arm === 'S2')) say(`${w.version} D${String(delay)} J${String(jitter)} S2 after the settle, door: ${opened('door')}; control: ${opened('control')}`);
        const s5 = here.filter((x) => x.arm === 'S5').map((x) => `${x.which} ${String(x.extra['settledMs'])} ms to ${String(x.extra['final'])}`);
        if (s5.length > 0) say(`${w.version} D${String(delay)} J${String(jitter)} S5 settle: ${s5.join(', ')}`);
        const s6 = here.filter((x) => x.arm === 'S6').map((x) => `${x.shape} ${x.which} ${J(x.got)} in ${String(x.extra['callsFromFirstKey'])} calls`);
        if (s6.length > 0) say(`${w.version} D${String(delay)} J${String(jitter)} S6: ${s6.join('; ')}`);
      }
    }
   }
  }
  // S6 against the control: at least as many of "bc" delivered (the second
  // build: a key over a mode goes behind a cancel on the door, so what the
  // mode eats may differ from the attach's, and only less is worse). The
  // calls are printed: a key over a parked pane asks once more so the thumb
  // follows (§7), which the control never did.
  for (const r of rows.filter((x) => x.arm === 'S6' && x.which === 'door' && x.jitter <= 30)) {
    const c = rows.filter((x) => x.arm === 'S6' && x.which === 'control' && x.tmux === r.tmux && x.delay === r.delay && x.jitter === r.jitter && x.shape === r.shape);
    const bytes = [...new Set(c.map((x) => x.got))];
    const kept = (got: string): number => 2 - charsLost('bc', got);
    const best = Math.max(...c.map((x) => kept(x.got)));
    if (c.length > 0 && kept(r.got) < best) findings.push(`${r.tmux} D${String(r.delay)} J${String(r.jitter)}: S6 ${r.shape} the program received ${J(r.got)} where the control's received ${J(bytes)}: fewer of "bc"`);
  }
  const controlLost = rows.filter((r) => r.which === 'control').reduce((n, r) => n + r.lost, 0);
  if (rows.some((r) => r.which === 'control' && r.typed !== '') && controlLost === 0) {
    notes.push('the control lost NO character in any run, so this invocation did not show the rig can see a loss; widen D or add S2');
  }
} catch (err) {
  findings.push(`the rig stopped: ${err instanceof Error ? err.message : String(err)}`);
} finally {
  endEverything();
}
// COUNTED ONCE, AT THE END: every server, relay, pty and `-C` client this run
// recorded is gone, or it is named here as a finding.
for (const left of leftRunning) findings.push(`left running after its world was closed: ${left}`);

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, `${J({ tmuxes: TMUXES, locales: LOCALES, ds: DS, js: JS, arms: ARMS, parent: PARENT, relayLogs, rows, findings, notes })}\n`);
for (const n of notes) say(`note: ${n}`);
say(`readings: ${OUT}`);
say(`relay logs kept: ${String(relayLogs.length)}, beside the readings, each row naming its lines`);
if (findings.length > 0) {
  for (const f of findings) process.stderr.write(`${TAG}   ${f}\n`);
  process.stderr.write(`${TAG} FAILED: ${String(findings.length)} finding(s) against the door.\n`);
  exitCode = 1;
} else {
  say(`PASS: the door lost 0 characters, kept the order and left the pane live wherever graded, over ${String(rows.filter((r) => r.which === 'door').length)} door runs.`);
}
process.exit(exitCode);
