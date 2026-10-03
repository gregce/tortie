#!/usr/bin/env node
/**
 * recorder.mjs. A raw-mode program that logs every byte typed into it, for
 * `probe:p320` (Phase 320). Adopted from research 130's harnesses, which lived
 * in a scratchpad and are not in the tree.
 *
 * ## Why a recorder and not a shell
 *
 * A shell echoes, edits and completes, so what it shows is not what it was
 * sent. This program reads its terminal in raw mode with no echo and appends
 * every chunk it receives to its log, byte for byte, so a character lost to a
 * scroll is a character missing from the log and a wheel handed over as keys is
 * a byte present in it. It stays on the normal screen and asks for nothing, so
 * xterm's mouse mode over it reads `none` exactly as it does over a shell.
 *
 * THE LOG, one JSON object per line, appended synchronously:
 *
 *   {"kind":"ready", ...}      once, after its ready line is printed
 *   {"kind":"input","hex":…}   every chunk read, in the order read
 *
 * ## How it ends
 *
 * It spawns nothing and opens nothing but its own log. It runs in a tmux pane
 * and ends with the tmux server the harness ends; it also ends on a hang up,
 * on end of input, on SIGTERM, and by itself after `--max-ms` (15 minutes by
 * default).
 *
 * PHASE 320.1 GAVE BACK `--history <n>`: before it goes raw it prints n numbered
 * lines (`line 1` to `line n`), so the pane it runs in holds a history to
 * scroll back through. The typing arms of `probe:p320` and `probe:p320:rig`
 * park the pane in that history and type into the program under it. Without
 * the option it prints nothing but its ready line, exactly as before.
 *
 * PHASE 320.1's SECOND BUILD ADDED TWO OPTIONS, both off by default so every
 * earlier reader sees exactly what it saw:
 *
 *   `--load light|heavy` prints load into the SAME terminal from a CHILD
 *     process (40 lines every 5 ms, or 200 every 1 ms), the shape of the spec's
 *     M3 measurement (build/p3201/SPEC.md §4). It is a child and not this
 *     process because a write to a terminal is synchronous on macOS and Linux,
 *     and a recorder whose own printing blocked would stop reading, which is the
 *     one thing a ruler must never do. The child is ended when this process
 *     ends, in the `end` below and on every signal, and it ends ITSELF with the
 *     same `--max-ms`, so it cannot outlive a lost parent for long.
 *     `probe:p320:skew` uses it.
 *   `--app-cursor` asks the terminal for application cursor keys (DECCKM,
 *     `CSI ? 1 h`) before it goes raw, so a cursor key typed into it arrives as
 *     `ESC O A` where the program is live. `probe:p320`'s T6 prints what a
 *     cursor key typed over a scrolled-back pane becomes (D7's stated limit).
 *
 * Usage: node build/p320/recorder.mjs --log <file> [--history 0] [--max-ms 900000]
 *        [--load light|heavy] [--app-cursor]
 */

import { spawn } from 'node:child_process';
import { appendFileSync } from 'node:fs';

const arg = (name, fallback) => {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 && at + 1 < process.argv.length ? process.argv[at + 1] : fallback;
};

const LOG = arg('log', '');
if (LOG === '') {
  process.stderr.write('usage: recorder.mjs --log <file>\n');
  process.exit(2);
}
const MAX_MS = Math.max(1000, Number(arg('max-ms', '900000')) || 900_000);
const HISTORY = Math.max(0, Math.min(100_000, Math.trunc(Number(arg('history', '0')) || 0)));
const LOAD = arg('load', 'none');
if (!['none', 'light', 'heavy'].includes(LOAD)) {
  process.stderr.write(`--load must be light or heavy, not ${LOAD}\n`);
  process.exit(2);
}
const APP_CURSOR = process.argv.includes('--app-cursor');

const log = (record) => {
  try {
    appendFileSync(LOG, `${JSON.stringify({ t: Date.now(), ...record })}\n`);
  } catch {
    /* a log that cannot be written is a reading the probe reports as missing */
  }
};

if (HISTORY > 0) {
  const lines = [];
  for (let i = 1; i <= HISTORY; i += 1) lines.push(`line ${String(i)}`);
  process.stdout.write(`${lines.join('\n')}\n`);
}
process.stdout.write('p320 recorder ready\n');
if (APP_CURSOR) process.stdout.write('\x1b[?1h');

if (process.stdin.isTTY) process.stdin.setRawMode(true);
process.stdin.resume();

/**
 * The load printer, a child sharing this terminal. Its text is fixed: `per`
 * numbered lines every `every` ms, each with a colour change so the far tmux
 * parses escapes as it would for an agent's output.
 */
let loader = null;
if (LOAD !== 'none') {
  const per = LOAD === 'heavy' ? 200 : 40;
  const every = LOAD === 'heavy' ? 1 : 5;
  // The child ends ITSELF when this recorder is gone (its parent pid changes
  // to launchd's or init's), so even a SIGKILL of the recorder, which runs no
  // `end`, cannot leave a load printer behind; and after --max-ms regardless.
  const text =
    `const parent=${String(process.pid)};let n=0;const t=setInterval(()=>{if(process.ppid!==parent)process.exit(0);let s='';for(let i=0;i<${String(per)};i+=1){n+=1;` +
    `s+='load line '+n+' \\x1b[3'+(n%8)+'m'+'x'.repeat(60)+'\\x1b[0m\\r\\n';}process.stdout.write(s);},${String(every)});` +
    `setTimeout(()=>{clearInterval(t);process.exit(0);},${String(MAX_MS)});`;
  loader = spawn(process.execPath, ['-e', text], { stdio: ['ignore', 'inherit', 'inherit'] });
}
log({ kind: 'ready', pid: process.pid, load: LOAD, loader: loader?.pid ?? null, appCursor: APP_CURSOR });

let ended = false;
function end(why) {
  if (ended) return;
  ended = true;
  log({ kind: 'end', why });
  try {
    loader?.kill('SIGTERM');
  } catch {
    /* already gone */
  }
  try {
    process.stdin.setRawMode(false);
  } catch {
    /* not a terminal any more */
  }
  process.exit(0);
}

process.stdin.on('data', (chunk) => {
  log({ kind: 'input', hex: chunk.toString('hex') });
});
process.stdin.on('end', () => end('end of input'));
process.on('SIGHUP', () => end('SIGHUP'));
process.on('SIGTERM', () => end('SIGTERM'));
setTimeout(() => end(`the ${String(MAX_MS)} ms lifetime passed`), MAX_MS).unref();
setInterval(() => undefined, 60_000);
