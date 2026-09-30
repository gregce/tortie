#!/usr/bin/env node
/**
 * build/p331/stand-in-sgr.mjs. NOT AN AGENT: a control for probe:p331's arm
 * (h), typed into a plain shell session in the real app.
 *
 * It asks the terminal for the alternate screen (1049) and for SGR mouse
 * reporting (1000, 1002 and 1006), the shape every full-screen agent that
 * takes the mouse asks for (deepseek, opencode, a full-screen Claude Code), and
 * then echoes, as escaped text, every byte that reaches it. Tortie's wheel
 * router hands the wheel over such a program to xterm as SGR reports, and
 * Phase 331 changes nothing about that route: the probe reads what xterm sent
 * over this stand-in at the parent and at HEAD and requires the two to be
 * byte for byte the same.
 *
 * It spawns nothing, opens no socket, and writes one file: the log named by
 * its first argument, holding what arrived, as JSON-escaped text, one line per
 * chunk. It restores the terminal and exits on `q`, on its stdin closing, on a
 * signal, or after P331_SGR_CEILING_MS (default 180 s), whichever is first, so
 * a run that lost track of it cannot leave it holding a pane.
 *
 *   node build/p331/stand-in-sgr.mjs /path/to/log.jsonl
 */

import { appendFileSync, writeFileSync } from 'node:fs';

const LOG = process.argv[2] ?? '';
const CEILING_MS = Number(process.env['P331_SGR_CEILING_MS'] ?? '') || 180_000;
const ENTER = '\x1b[?1049h\x1b[?1000h\x1b[?1002h\x1b[?1006h\x1b[H\x1b[2J';
const LEAVE = '\x1b[?1006l\x1b[?1002l\x1b[?1000l\x1b[?1049l';

let done = false;
function finish(code) {
  if (done) return;
  done = true;
  try {
    if (process.stdin.isTTY) process.stdin.setRawMode(false);
  } catch {
    /* the terminal is already gone */
  }
  process.stdout.write(LEAVE);
  process.exit(code);
}

try {
  if (LOG !== '') writeFileSync(LOG, '');
  process.stdout.write(`${ENTER}P331 SGR STAND-IN READY: it asked for 1049 and SGR mouse, and echoes what arrives. q ends it.\r\n`);
  if (process.stdin.isTTY) process.stdin.setRawMode(true);
  process.stdin.on('data', (chunk) => {
    const text = chunk.toString('latin1');
    if (LOG !== '') appendFileSync(LOG, `${JSON.stringify(text)}\n`);
    process.stdout.write(`got ${JSON.stringify(text)}\r\n`);
    if (text === 'q') finish(0);
  });
  process.stdin.on('end', () => finish(0));
  for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(sig, () => finish(0));
  setTimeout(() => finish(0), CEILING_MS).unref?.();
  // Keep the process alive until one of the above ends it.
  setTimeout(() => undefined, CEILING_MS + 1_000);
} catch {
  finish(1);
}
