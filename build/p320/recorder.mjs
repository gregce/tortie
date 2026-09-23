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
 * Usage: node build/p320/recorder.mjs --log <file> [--max-ms 900000]
 */

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

const log = (record) => {
  try {
    appendFileSync(LOG, `${JSON.stringify({ t: Date.now(), ...record })}\n`);
  } catch {
    /* a log that cannot be written is a reading the probe reports as missing */
  }
};

process.stdout.write('p320 recorder ready\n');

if (process.stdin.isTTY) process.stdin.setRawMode(true);
process.stdin.resume();
log({ kind: 'ready', pid: process.pid });

let ended = false;
function end(why) {
  if (ended) return;
  ended = true;
  log({ kind: 'end', why });
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
