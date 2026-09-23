#!/usr/bin/env node
/**
 * build/p321/stand-in.mjs — the agents `probe:p321` launches. It is NOT an
 * agent and runs none. It draws Phase 321's COMMITTED REDACTED SCREENS into
 * the pane Tortie launched it in, and nothing else.
 *
 * WHY A STAND-IN. The phase's app run needs the REAL registry rows cursor,
 * qwen, opencode, antigravity, claude, grok and pi, launched by Tortie under
 * their bare names, because the rows are what the phase changes. Every one of
 * those agents is installed on this Mac, and two of them (agy and grok)
 * installed updates the last time a research run launched them
 * (build/p321/SPEC.md §1.2 item 6), while qwen may never run outside a scratch
 * HOME. So the probe writes one wrapper per bare name on its scratch HOME's
 * PATH, each `exec`ing this file with `P321_AGENT` set, and asserts inside the
 * scratch login shell that every bare name resolves to its wrapper before any
 * arm runs.
 *
 * WHAT IT DRAWS, and only this: the committed redacted question screens under
 * src/main/activity/__tests__/fixtures/ and the committed redacted detector
 * windows under build/fixtures/questions/ (Builder A's, build/p321/SPEC.md
 * §2.4). It never reads a recording. Each screen is drawn in ONE write: home,
 * clear, every row cut to the pane's width.
 *
 * WHAT IT ANSWERS BEFORE IT DRAWS ANYTHING, because the rows send it argv the
 * real agents answer: `--version` and `-v` print a version with the identity
 * the row's version probe reads (claude's `(Claude Code)`, grok's `grok `) and
 * exit 0; cursor's id pre-assignment `create-chat` (registry.ts, the cursor
 * row) prints a fresh uuid and exits 0; `--help` exits 0. Anything else with
 * no terminal on stdout exits 0 at once, so a scan can never leave one running.
 *
 * HOW IT IS TOLD. It writes `hello-<pid>.json` into `P321_STANDIN_DIR` when it
 * starts, then reads `cmd-<pid>.json` there every 50 ms: `{ seq, ops }`, each
 * new `seq` applied once and in order, and after each it writes
 * `state-<pid>.json`. The ops:
 *   { op: 'draw', screen }        a committed screen, in one write
 *   { op: 'repaint', everyMs }    the current screen again, byte for byte,
 *                                 every `everyMs` (0 stops it): antigravity's
 *                                 2.0 s repaint, grok's drawing before its turn
 *   { op: 'work', ms, screens, then }
 *                                 committed screens in turn every 150 ms for
 *                                 `ms`, then `then` in one write and silence
 *   { op: 'helper', seconds }     a DETACHED helper (a session leader outside
 *                                 the pane's foreground group, as grok's MCP
 *                                 servers are), `/bin/sleep`, pid recorded
 *   { op: 'tool', seconds, afterMs }
 *                                 a DETACHED tool born `afterMs` from now that
 *                                 lives `seconds`, pid recorded
 *   { op: 'input', on }           echo what is typed into the agent's own input
 *                                 row, above its footer, and redraw; never submit
 *   { op: 'clear-input' }         empty the input row and redraw
 *   { op: 'exit' }                leave
 * A `screen` is `{ fixture: '<name>.txt' }` or `{ window: '<source>-<agent>.jsonl', id }`.
 *
 * WHAT IT NEVER DOES. It never submits what is typed (Enter is a new line in
 * its input row), never writes anything but its screens, reads nothing outside
 * this checkout's committed screens and its own directory, and runs no program
 * but `/bin/sleep`. Its helpers and tools are ENDED BY PID in its `finally`
 * whatever happened, and the probe ends any still standing by pid in its own
 * `finally` besides, because a detached child outlives the hang-up tmux sends.
 * It ends when told to, on SIGHUP, SIGTERM or SIGINT, when its directory is
 * removed, or after `P321_STANDIN_CEILING_MS` (45 minutes by default).
 *
 * THE PROBE IMPORTS IT TOO, for the screen loader, the input rows and the
 * parent's numbered verdict, so both sides read one spelling of each. Importing
 * it runs nothing: the stand-in runs only when this file is the entry point.
 */

import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const FIXTURES_DIR = join(ROOT, 'src', 'main', 'activity', '__tests__', 'fixtures');
export const WINDOWS_DIR = join(ROOT, 'build', 'fixtures', 'questions');

/** The agents the probe launches through this file, by registry id. */
export const STAND_IN_AGENTS = ['cursor', 'qwen', 'opencode', 'antigravity', 'claude', 'grok', 'pi'];

/** The bare name each registry row launches (registry.ts `binaries[0]`). */
export const BARE_NAME = {
  cursor: 'cursor-agent',
  qwen: 'qwen',
  opencode: 'opencode',
  antigravity: 'agy',
  claude: 'claude',
  grok: 'grok',
  pi: 'pi'
};

/**
 * What `--version` prints, carrying the identity substring the row's version
 * probe reads where it has one (claude's `(Claude Code)`, grok's `grok `), and
 * the version each question screen was recorded on (SPEC §3.2; the fix round
 * kept the shapes of qwen and Claude Code only, and the others still draw their
 * recorded questions for the probe to grade as never amber). The `stand-in`
 * word is there so no log line can be read as the real agent.
 */
const VERSION = {
  cursor: '2026.09.18-p321-stand-in',
  qwen: '0.22.0 (p321 stand-in)',
  opencode: '1.18.31 (p321 stand-in)',
  antigravity: '1.2.7 (p321 stand-in)',
  claude: '2.1.280 (Claude Code) p321 stand-in',
  grok: 'grok 1.0.34 (p321 stand-in)',
  pi: '0.84.1 (p321 stand-in)'
};

// ---------------------------------------------------------------------------
// The committed screens
// ---------------------------------------------------------------------------

const FIXTURE_NAME = /^[a-z0-9][a-z0-9-]*\.txt$/;
const WINDOW_FILE = /^[a-z0-9][a-z0-9-]*\.jsonl$/;

/** One committed window file's lines, parsed, or null when it is absent. */
export function windowsIn(file) {
  if (!WINDOW_FILE.test(file)) return null;
  const path = join(WINDOWS_DIR, file);
  if (!existsSync(path)) return null;
  const out = [];
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (line.trim() === '') continue;
    try {
      const w = JSON.parse(line);
      if (typeof w?.id === 'string' && typeof w?.label === 'string' && Array.isArray(w?.rows)) out.push(w);
    } catch {
      /* a malformed line is skipped, and the probe says what it could not find */
    }
  }
  return out;
}

/** A committed screen's rows, or null when the reference names nothing committed. */
export function loadScreen(ref) {
  if (ref === null || typeof ref !== 'object') return null;
  if (typeof ref.fixture === 'string') {
    if (!FIXTURE_NAME.test(ref.fixture)) return null;
    const path = join(FIXTURES_DIR, ref.fixture);
    if (!existsSync(path)) return null;
    const rows = readFileSync(path, 'utf8').split('\n');
    while (rows.length > 0 && rows[rows.length - 1].trim() === '') rows.pop();
    return rows;
  }
  if (typeof ref.window === 'string' && typeof ref.id === 'string') {
    const hit = (windowsIn(ref.window) ?? []).find((w) => w.id === ref.id);
    return hit === undefined ? null : hit.rows.map(String);
  }
  return null;
}

/** A short name for a reference, for reports: never a row. */
export const refName = (ref) => (ref?.fixture ?? (ref?.window === undefined ? 'nothing' : `${ref.window}#${ref.id}`));

// ---------------------------------------------------------------------------
// The input row each agent draws at idle, read off Builder A's committed idle
// windows (research 129's recordings, redacted): where typed text goes, and
// the prefix it is drawn with. Everything BELOW that row (the box's bottom
// border, the footer) stays below it, which is exactly the position a person's
// typed words sit in (build/p321/SPEC.md §3.1 rule 4).
// ---------------------------------------------------------------------------

/** Box verticals kept in a continuation line's prefix. */
const VERTICALS = /[│┃║▌▏|]/;

/**
 * Where an agent's input row is in a screen, or null. `prefix` is what the
 * first typed line is drawn after; later lines keep only its box verticals.
 */
export const INPUT_ROW = {
  // `  → Add a follow-up` (a/cursor): the LAST arrow row, the prompt's own.
  cursor: (rows) => lastMatch(rows, /^(\s*→ )/),
  // `>   Type your message or @path/to/file` between two rules (a/qwen).
  qwen: (rows) => lastMatch(rows, /^(>\s+)/),
  // opencode's input box: the `┃` rows above its `╹▀▀▀` bottom; the first of
  // them holds the text (a/opencode).
  opencode: (rows) => {
    let bottom = -1;
    for (let i = rows.length - 1; i >= 0; i -= 1) {
      if (/^\s*╹/.test(rows[i])) {
        bottom = i;
        break;
      }
    }
    if (bottom <= 0) return null;
    let top = bottom;
    while (top - 1 >= 0 && /^\s*┃/.test(rows[top - 1])) top -= 1;
    if (top === bottom) return null;
    const m = /^(\s*┃\s{2})/.exec(rows[top].padEnd(8));
    return m === null ? null : { index: top, prefix: m[1] };
  },
  // `❯` alone between two rules (a/claude, 2.1.280).
  claude: (rows) => lastMatch(rows, /^(❯)\s*$/, ' '),
  // `>` alone between two rules (a/antigravity, 1.2.7).
  antigravity: (rows) => lastMatch(rows, /^(>)\s*$/, ' '),
  // `  │ ❯` inside its box (a/grok, 1.0.34).
  grok: (rows) => lastMatch(rows, /^(\s*│ ❯)/, ' '),
  // pi's empty row between two rules; pi is a control and is never typed into.
  pi: (rows) => {
    for (let i = rows.length - 2; i >= 1; i -= 1) {
      if (/^─{20,}\s*$/.test(rows[i - 1]) && rows[i].trim() === '' && /^─{20,}\s*$/.test(rows[i + 1])) {
        return { index: i, prefix: '' };
      }
    }
    return null;
  }
};

function lastMatch(rows, re, pad = '') {
  for (let i = rows.length - 1; i >= 0; i -= 1) {
    const m = re.exec(rows[i]);
    if (m !== null) return { index: i, prefix: `${m[1]}${pad}` };
  }
  return null;
}

/** The screen with `typed` lines in the agent's input row, the rows below it kept below. */
export function composeInput(agent, rows, typed) {
  const at = INPUT_ROW[agent]?.(rows) ?? null;
  if (at === null || typed.length === 0) return rows;
  const cont = [...at.prefix].map((ch) => (VERTICALS.test(ch) ? ch : ' ')).join('');
  const lines = typed.map((t, i) => `${i === 0 ? at.prefix : cont}${t}`);
  return [...rows.slice(0, at.index), ...lines, ...rows.slice(at.index + 1)];
}

// ---------------------------------------------------------------------------
// The parent's numbered verdict, a literal copy of `detectDialog` at ecb6997a
// (src/main/activity/screen.ts), the way p312-choices.test.ts copies it. The
// probe grades a typed composition only where this reads FALSE: where it reads
// true the numbered verdict's own fault reads it at both builds (research 129
// §9 item 6), which this phase does not fix and must not widen.
// ---------------------------------------------------------------------------

const P_BORDER = /^[\s│┃║▌▏|]+|[\s│┃║▕|]+$/g;
const P_OPT1 = /^[❯›●▶◆*>▸○◇⏵\s]{0,4}1[.)]\s+\S/;
const P_OPT2 = /^[❯›●▶◆*>▸○◇⏵\s]{0,4}2[.)]\s+\S/;
const P_HINT =
  /(enter to (confirm|select|continue)|press enter|esc to cancel|esc to quit|use enter to select|to cancel)/i;
const P_QUEST = /(do you (want|trust)|would you like|how would you like)/i;

export function parentDetectDialog(capture) {
  const lines = capture.split('\n');
  while (lines.length > 0 && (lines[lines.length - 1] ?? '').trim() === '') lines.pop();
  const rows = lines.slice(-24).map((l) => l.replace(P_BORDER, ''));
  let opt1 = false;
  let opt2 = false;
  let hint = false;
  for (const row of rows) {
    if (!opt1 && P_OPT1.test(row)) opt1 = true;
    if (!opt2 && P_OPT2.test(row)) opt2 = true;
    if (!hint && (P_HINT.test(row) || P_QUEST.test(row))) hint = true;
  }
  return opt1 && opt2 && hint;
}

// ---------------------------------------------------------------------------
// The stand-in itself, run only when this file is the entry point
// ---------------------------------------------------------------------------

const ESC = '\u001b';

/** Cells a code point takes: the wide emoji and CJK ranges, as a terminal counts them. */
function cellWidth(cp) {
  if (cp >= 0x1100 && cp <= 0x115f) return 2;
  if (cp >= 0x2e80 && cp <= 0xa4cf) return 2;
  if (cp >= 0xac00 && cp <= 0xd7a3) return 2;
  if (cp >= 0xf900 && cp <= 0xfaff) return 2;
  if (cp >= 0xfe30 && cp <= 0xfe4f) return 2;
  if (cp >= 0xff00 && cp <= 0xff60) return 2;
  if (cp >= 0x1f300 && cp <= 0x1faff) return 2;
  if (cp === 0x2728 || cp === 0x23f3 || cp === 0x231b) return 2;
  return 1;
}
const widthOf = (row) => [...row.replace(/\s+$/, '')].reduce((n, ch) => n + cellWidth(ch.codePointAt(0) ?? 32), 0);
function clipRow(row, cols) {
  let used = 0;
  let out = '';
  for (const ch of row.replace(/\s+$/, '')) {
    const w = cellWidth(ch.codePointAt(0) ?? 32);
    if (used + w > cols) break;
    out += ch;
    used += w;
  }
  return out;
}

async function standIn() {
  const agent = process.env['P321_AGENT'] ?? '';
  const args = process.argv.slice(2);
  // The argv the rows send that must never reach a screen.
  if (args.includes('--version') || args.includes('-v') || args.includes('-V')) {
    process.stdout.write(`${VERSION[agent] ?? 'p321 stand-in'}\n`);
    return;
  }
  if (args[0] === 'create-chat') {
    process.stdout.write(`${randomUUID()}\n`);
    return;
  }
  if (args.includes('--help') || args.includes('-h')) return;
  const DIR = process.env['P321_STANDIN_DIR'] ?? '';
  // No terminal, no directory, or not one of the rows this probe launches:
  // leave at once, so a scan or a stray call can never leave one running.
  if (!process.stdout.isTTY || DIR === '' || !existsSync(DIR) || !STAND_IN_AGENTS.includes(agent)) return;

  const ceilingMs = Math.max(60_000, Number(process.env['P321_STANDIN_CEILING_MS'] ?? '') || 45 * 60_000);
  const kids = [];
  const timers = new Set();
  let screen = [];
  let screenName = 'nothing';
  let typed = [];
  let echo = false;
  let seq = 0;
  let narrow = false;
  let widest = 0;
  let repaintTimer = null;
  let workTimer = null;
  let done = null;
  const finished = new Promise((r) => {
    done = r;
  });

  const cmdFile = join(DIR, `cmd-${String(process.pid)}.json`);
  const stateFile = join(DIR, `state-${String(process.pid)}.json`);
  const later = (ms, fn) => {
    const t = setTimeout(() => {
      timers.delete(t);
      fn();
    }, ms);
    timers.add(t);
  };

  function writeState() {
    const live = (k) => k.child.exitCode === null && k.child.signalCode === null;
    try {
      writeFileSync(
        stateFile,
        JSON.stringify({
          agent,
          seq,
          cols: process.stdout.columns ?? null,
          rows: process.stdout.rows ?? null,
          narrow,
          widest,
          screen: screenName,
          echo,
          typedLines: typed.length,
          helpers: kids.filter((k) => k.kind === 'helper').map((k) => ({ pid: k.child.pid, live: live(k) })),
          tools: kids.filter((k) => k.kind === 'tool').map((k) => ({ pid: k.child.pid, live: live(k) })),
          at: Date.now()
        })
      );
    } catch {
      /* the directory went away; the poll below ends the stand-in */
    }
  }

  /** The current screen, with anything typed in its input row, in ONE write. */
  function paint() {
    const rows = echo ? composeInput(agent, screen, typed) : screen;
    const cols = process.stdout.columns ?? 80;
    widest = rows.reduce((n, r) => Math.max(n, widthOf(r)), 0);
    narrow = widest > cols || rows.length > (process.stdout.rows ?? 24);
    process.stdout.write(`${ESC}[H${ESC}[2J${rows.map((r) => clipRow(r, cols)).join('\r\n')}`);
  }
  function show(ref) {
    const rows = loadScreen(ref);
    if (rows === null) return false;
    screen = rows;
    screenName = refName(ref);
    paint();
    return true;
  }
  function stopWork() {
    if (workTimer !== null) clearInterval(workTimer);
    workTimer = null;
  }
  function setRepaint(everyMs) {
    if (repaintTimer !== null) clearInterval(repaintTimer);
    repaintTimer = everyMs > 0 ? setInterval(paint, Math.max(50, everyMs)) : null;
  }
  /** A detached `/bin/sleep`: its own session, outside the pane's foreground group. */
  function startDetached(kind, seconds) {
    const child = spawn('/bin/sleep', [String(Math.max(1, Math.min(3600, Math.round(seconds))))], {
      detached: true,
      stdio: 'ignore'
    });
    child.on('error', () => undefined);
    // Its end is news too: the probe reads `live` off the state file.
    child.on('exit', () => writeState());
    kids.push({ kind, child });
    writeState();
  }
  function endKids() {
    for (const k of kids) {
      if (k.child.exitCode !== null || k.child.signalCode !== null) continue;
      try {
        process.kill(k.child.pid, 'SIGTERM');
      } catch {
        /* already gone */
      }
    }
  }

  function apply(op) {
    if (op?.op === 'draw') {
      stopWork();
      show(op.screen);
    } else if (op?.op === 'repaint') {
      setRepaint(Number(op.everyMs) || 0);
    } else if (op?.op === 'work') {
      stopWork();
      const screens = (Array.isArray(op.screens) ? op.screens : []).map(loadScreen).filter((r) => r !== null);
      const until = Date.now() + (Number(op.ms) || 0);
      let i = 0;
      workTimer = setInterval(() => {
        if (Date.now() >= until || screens.length === 0) {
          stopWork();
          if (op.then !== undefined) show(op.then);
          writeState();
          return;
        }
        screen = screens[i % screens.length];
        screenName = 'working';
        paint();
        i += 1;
      }, 150);
    } else if (op?.op === 'helper') {
      startDetached('helper', Number(op.seconds) || 2700);
    } else if (op?.op === 'tool') {
      later(Math.max(0, Number(op.afterMs) || 0), () => startDetached('tool', Number(op.seconds) || 5));
    } else if (op?.op === 'input') {
      echo = op.on === true;
      if (!echo) typed = [];
      paint();
    } else if (op?.op === 'clear-input') {
      typed = [];
      paint();
    } else if (op?.op === 'exit') {
      done();
    }
  }

  /**
   * What is typed. Printable text goes into the input row, Enter and a line
   * feed start a new line in it (never a submit), Backspace takes one back,
   * Ctrl-U empties it, and every escape sequence (the bracketed paste marks
   * among them) is dropped.
   */
  function onKeys(chunk) {
    if (!echo) return;
    const text = chunk.toString('utf8').replace(/\u001b\[[0-9;?]*[ -/]*[@-~]/g, '').replace(/\u001b./g, '');
    if (typed.length === 0) typed = [''];
    for (const ch of text) {
      if (ch === '\r' || ch === '\n') typed.push('');
      else if (ch === '\u007f' || ch === '\b') typed[typed.length - 1] = typed[typed.length - 1].slice(0, -1);
      else if (ch === '\u0015') typed = [''];
      else if (ch >= ' ') typed[typed.length - 1] += ch;
    }
    paint();
    writeState();
  }

  try {
    writeFileSync(
      join(DIR, `hello-${String(process.pid)}.json`),
      JSON.stringify({
        pid: process.pid,
        agent,
        session: process.env['GMUX_SESSION_ID'] ?? null,
        cols: process.stdout.columns ?? null,
        rows: process.stdout.rows ?? null,
        at: Date.now()
      })
    );
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
      process.stdin.on('data', onKeys);
    }
    process.stdout.on('resize', () => {
      paint();
      writeState();
    });
    for (const sig of ['SIGHUP', 'SIGTERM', 'SIGINT']) process.on(sig, () => done());
    later(ceilingMs, () => done());
    const poll = setInterval(() => {
      if (!existsSync(DIR)) {
        done();
        return;
      }
      let cmd;
      try {
        cmd = JSON.parse(readFileSync(cmdFile, 'utf8'));
      } catch {
        return;
      }
      if (typeof cmd?.seq !== 'number' || cmd.seq <= seq) return;
      seq = cmd.seq;
      for (const op of Array.isArray(cmd.ops) ? cmd.ops : []) apply(op);
      writeState();
    }, 50);
    timers.add(poll);
    writeState();
    await finished;
  } finally {
    // THE HELPERS AND TOOLS, BY PID, whatever happened: a detached child
    // outlives the hang-up tmux sends, which is the whole reason it counts
    // as a tool. The probe ends any still standing by pid in its own finally.
    endKids();
    stopWork();
    setRepaint(0);
    for (const t of timers) {
      clearTimeout(t);
      clearInterval(t);
    }
    if (process.stdin.isTTY) {
      try {
        process.stdin.setRawMode(false);
      } catch {
        /* the terminal is gone */
      }
    }
    process.stdin.pause();
  }
}

/** This file run as the entry point, however the path that named it was spelled. */
function isEntry() {
  try {
    return process.argv[1] !== undefined && pathToFileURL(realpathSync(process.argv[1])).href === pathToFileURL(realpathSync(fileURLToPath(import.meta.url))).href;
  } catch {
    return false;
  }
}
if (isEntry()) {
  standIn()
    .catch(() => undefined)
    .finally(() => process.exit(0));
}

/**
 * tmux's own line under a pane whose program was killed, `Pane is dead (signal
 * …, <date>)`, which the recorder left under some agents' last screens. It is
 * not the agent's UI, and Builder A's pass shapes its letters, so it is matched
 * in both spellings.
 */
const DEAD_PANE = /^(?:Pane is dead|[xX]{4} [xX]{2} [xX]{4}) \(/;

/** Every committed window file for one agent, the investigator A recording first. */
export function windowFilesFor(agent) {
  if (!existsSync(WINDOWS_DIR)) return [];
  const files = readdirSync(WINDOWS_DIR).filter((f) => WINDOW_FILE.test(f) && f.endsWith(`-${agent}.jsonl`));
  return files.sort((a, b) => (a.startsWith('a-') ? -1 : b.startsWith('a-') ? 1 : a.localeCompare(b)));
}

/**
 * The idle screen the probe draws for an agent, and a second one to alternate
 * with while it works, chosen from Builder A's committed windows by rule, not
 * by hand: a `not-question` window that draws the agent's own input row, that
 * the parent's numbered verdict reads false, and that is not the recorder's
 * dead-pane line; the LAST such window of the first file (the recording's own
 * rest), and the one before it with different rows. Null with the reason when
 * there is none, which the probe reads as UNREADABLE for that agent.
 */
export function idleScreensFor(agent) {
  for (const file of windowFilesFor(agent)) {
    const all = windowsIn(file) ?? [];
    const ok = all.filter(
      (w) =>
        w.label === 'not-question' &&
        INPUT_ROW[agent]?.(w.rows.map(String)) !== null &&
        !w.rows.some((r) => DEAD_PANE.test(String(r))) &&
        !parentDetectDialog(w.rows.join('\n'))
    );
    if (ok.length === 0) continue;
    const idle = ok[ok.length - 1];
    const alt = [...ok].reverse().find((w) => w.rows.join('\n') !== idle.rows.join('\n')) ?? null;
    return {
      idle: { window: file, id: idle.id },
      alt: alt === null ? null : { window: file, id: alt.id },
      why: ''
    };
  }
  return {
    idle: null,
    alt: null,
    why: `no committed not-question window of ${agent} under build/fixtures/questions/ draws its input row`
  };
}
