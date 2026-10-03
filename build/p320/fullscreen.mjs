#!/usr/bin/env node
/**
 * fullscreen.mjs. A stand-in for Claude Code's fullscreen renderer, for
 * `probe:p320` (Phase 320). Adopted from research 130's harnesses, which lived
 * in a scratchpad and are not in the tree.
 *
 * ## What it does, and why each part is there
 *
 * It does what research 130 §2.2 read from the Claude Code 2.1.280 bundle and
 * nothing more:
 *
 *  - it takes the alternate screen (`CSI ? 1049 h`) and clears the way Claude's
 *    fullscreen renderer clears, `CSI 2J CSI 3J CSI H`. tmux honours `CSI 3J`
 *    as clear-history, so the pane it runs in holds exactly one screen, which
 *    is the signature issue 31's recording shows;
 *  - it holds its lines in ITS OWN MEMORY, 5,000 by default, and draws the
 *    screen it is scrolled to, so the only way to scroll it is to tell it;
 *  - it asks for the mouse the way Claude does. `--mouse any` asks for
 *    `1000+1002+1003+1006`, which xterm reports as `any`; `--mouse vt200` asks
 *    for `1000+1006`, which xterm reports as `vt200`; `--mouse none` asks for
 *    nothing and stands in for `less` or a `vim` with no mouse, which is
 *    research 130 §3.3's stated gap;
 *  - it reads raw bytes, turns every SGR wheel report (`CSI < 64;x;y M` up,
 *    `CSI < 65;x;y M` down) into a move of three lines, and writes every chunk
 *    it received to its log, split into the reports and everything else.
 *
 * THE LOG IS THE RULER. One JSON object per line, appended synchronously so a
 * reader never sees half a record:
 *
 *   {"kind":"ready", ...}           once, after the screen is taken
 *   {"kind":"input", ...}           every chunk read, with `hex`, the reports
 *                                   it held and the bytes that were not one
 *   {"kind":"state", ...}           after every chunk and every resize: the
 *                                   top line drawn and the running counts
 *
 * The probe reads it from outside the program. On the loopback machine the far
 * side is this Mac, so the far program writes to a path under the probe's own
 * run directory and nothing crosses the connection to read it.
 *
 * ## How it ends
 *
 * It spawns nothing and opens nothing but its own log. It runs in a tmux pane
 * and ends with the tmux server the harness ends; it also ends on a hang up,
 * on end of input, on SIGTERM, and by itself after `--max-ms` (15 minutes by
 * default), so a pane that outlives its run cannot keep it for long.
 *
 * ## `--toggle`, Phase 320.1's second build (R1's wait sweep and R7)
 *
 * With `--toggle` it starts on the NORMAL screen, prints `--history` numbered
 * lines (200 by default) so the pane has a history, and asks for nothing,
 * exactly like a shell at rest. Then two bytes the probe sends straight to the
 * pane through the far scratch server (`send-keys -H 0e` and `-H 0f`, never
 * through the app) move it:
 *
 *   0x0e  TAKE: the alternate screen, Claude's clear and the mouse as `--mouse`
 *         says, in ONE write, logged `{"kind":"took"}`. This is the moment
 *         R1's wait is measured from: the wheel that follows must reach the
 *         program at every wait, which is the reporter's own case, and the
 *         pane must never be left in copy mode over a program that asked.
 *   0x0f  GIVE: the mouse given back and the alternate screen left, in ONE
 *         write, then the history lines printed again, logged
 *         `{"kind":"gave"}`. R7 reads that no arrow key reaches the program
 *         after it lets go.
 *
 * The two bytes are logged as those records and are not counted as input a
 * person typed. Without `--toggle` it behaves exactly as before.
 *
 * Usage: node build/p320/fullscreen.mjs --log <file> [--mouse any|vt200|none]
 *        [--lines 5000] [--max-ms 900000] [--toggle [--history 200]]
 */

import { appendFileSync } from 'node:fs';

const arg = (name, fallback) => {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 && at + 1 < process.argv.length ? process.argv[at + 1] : fallback;
};

const LOG = arg('log', '');
if (LOG === '') {
  process.stderr.write('usage: fullscreen.mjs --log <file> [--mouse any|vt200|none]\n');
  process.exit(2);
}
const MOUSE = arg('mouse', 'any');
if (!['any', 'vt200', 'none'].includes(MOUSE)) {
  process.stderr.write(`--mouse must be any, vt200 or none, not ${MOUSE}\n`);
  process.exit(2);
}
const LINES = Math.max(100, Number(arg('lines', '5000')) || 5000);
const MAX_MS = Math.max(1000, Number(arg('max-ms', '900000')) || 900_000);
const TOGGLE = process.argv.includes('--toggle');
const HISTORY = Math.max(0, Math.min(10_000, Math.trunc(Number(arg('history', '200')) || 0)));
/** The two bytes that move a `--toggle` stand-in: take the screen and the mouse, give them back. */
const TAKE = 0x0e;
const GIVE = 0x0f;
/** Lines one wheel report moves the view, which is what Claude's renderer moves. */
const STEP = 3;

const ESC = '\x1b';
const ENTER =
  `${ESC}[?1049h${ESC}[2J${ESC}[3J${ESC}[H` +
  (MOUSE === 'any'
    ? `${ESC}[?1000h${ESC}[?1002h${ESC}[?1003h${ESC}[?1006h`
    : MOUSE === 'vt200'
      ? `${ESC}[?1000h${ESC}[?1006h`
      : '');
const LEAVE =
  (MOUSE === 'none' ? '' : `${ESC}[?1006l${ESC}[?1003l${ESC}[?1002l${ESC}[?1000l`) +
  `${ESC}[?1049l`;

const log = (record) => {
  try {
    appendFileSync(LOG, `${JSON.stringify({ t: Date.now(), ...record })}\n`);
  } catch {
    /* a log that cannot be written is a reading the probe reports as missing */
  }
};

const rows = () => Math.max(2, process.stdout.rows || 24);
const cols = () => Math.max(10, process.stdout.columns || 80);
/** The newest screen's first line. */
const bottomTop = () => Math.max(1, LINES - rows() + 1);

let top = bottomTop();
const counts = { up: 0, down: 0, other: 0, chunks: 0 };
/** Whether the screen and the mouse are held right now; always, without --toggle. */
let holding = !TOGGLE;

function printHistory() {
  const lines = [];
  for (let i = 1; i <= HISTORY; i += 1) lines.push(`idle line ${String(i)}`);
  if (lines.length > 0) process.stdout.write(`${lines.join('\r\n')}\r\n`);
}

function draw() {
  if (!holding) return;
  let out = `${ESC}[H`;
  for (let r = 0; r < rows(); r += 1) {
    const n = top + r;
    const text = n <= LINES ? `fs line ${String(n)}` : '';
    out += `${ESC}[${String(r + 1)};1H${text.slice(0, cols())}${ESC}[K`;
  }
  process.stdout.write(out);
}

function state(why) {
  log({ kind: 'state', why, top, rows: rows(), cols: cols(), ...counts });
}

/** Every SGR mouse report in a chunk, and whatever was left over. */
function reportsIn(text) {
  const reports = [];
  const rest = text.replace(/\x1b\[<(\d+);(\d+);(\d+)([Mm])/g, (_m, b, x, y, fin) => {
    reports.push({ b: Number(b), x: Number(x), y: Number(y), release: fin === 'm' });
    return '';
  });
  return { reports, rest };
}

let ended = false;
function end(why) {
  if (ended) return;
  ended = true;
  log({ kind: 'end', why, top, ...counts });
  try {
    if (holding) process.stdout.write(LEAVE);
  } catch {
    /* the pane is already gone */
  }
  try {
    process.stdin.setRawMode(false);
  } catch {
    /* not a terminal any more */
  }
  process.exit(0);
}

if (TOGGLE) printHistory();
else process.stdout.write(ENTER);
if (process.stdin.isTTY) process.stdin.setRawMode(true);
process.stdin.resume();
draw();
log({ kind: 'ready', mouse: MOUSE, lines: LINES, top, rows: rows(), cols: cols(), pid: process.pid, toggle: TOGGLE });

/** A `--toggle` stand-in's own two bytes, acted on and taken out of the chunk. */
function toggleIn(text) {
  if (!TOGGLE) return text;
  let rest = '';
  for (const ch of text) {
    const code = ch.charCodeAt(0);
    if (code === TAKE && !holding) {
      holding = true;
      top = bottomTop();
      process.stdout.write(ENTER);
      draw();
      log({ kind: 'took', mouse: MOUSE, top });
    } else if (code === GIVE && holding) {
      holding = false;
      process.stdout.write(LEAVE);
      printHistory();
      log({ kind: 'gave' });
    } else if (code !== TAKE && code !== GIVE) {
      rest += ch;
    }
  }
  return rest;
}

process.stdin.on('data', (chunk) => {
  const text = toggleIn(chunk.toString('latin1'));
  if (text.length === 0) return;
  const { reports, rest } = reportsIn(text);
  counts.chunks += 1;
  for (const one of reports) {
    // The modifier bits (shift 4, meta 8, control 16) and the motion bit (32)
    // are masked off; 64 and 65 are the wheel.
    const base = one.b & ~(4 | 8 | 16 | 32);
    if (base === 64) {
      counts.up += 1;
      top = Math.max(1, top - STEP);
    } else if (base === 65) {
      counts.down += 1;
      top = Math.min(bottomTop(), top + STEP);
    }
  }
  counts.other += Buffer.byteLength(rest, 'latin1');
  log({
    kind: 'input',
    hex: Buffer.from(text, 'latin1').toString('hex'),
    reports,
    other: rest.length > 0 ? Buffer.from(rest, 'latin1').toString('hex') : ''
  });
  draw();
  state('input');
});
process.stdin.on('end', () => end('end of input'));
process.on('SIGHUP', () => end('SIGHUP'));
process.on('SIGTERM', () => end('SIGTERM'));
process.on('SIGWINCH', () => {
  top = Math.min(top, bottomTop());
  draw();
  state('resize');
});
setTimeout(() => end(`the ${String(MAX_MS)} ms lifetime passed`), MAX_MS).unref();
// Something must hold the loop open while the pane is quiet; stdin does, and
// this is the belt for a pane whose stdin is paused by a hang up in flight.
setInterval(() => undefined, 60_000);
