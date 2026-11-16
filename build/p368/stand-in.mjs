#!/usr/bin/env node
/**
 * stand-in.mjs. The program a probe:p368 session runs in its pane instead of a
 * real agent (Phase 368, build/p368/SPEC.md §8).
 *
 * ## Why it exists
 *
 * A real Claude Code or Codex needs the operator's own HOME to find its sign
 * in, and the app a probe runs must never have that HOME (its login shell
 * probe would run his .zshrc). So the agents' bytes reach the app by RECORD
 * and REPLAY: research 145 recorded real Claude Code 2.1.325 and Codex
 * 0.167.1 output with its timing and size, and this program writes those
 * bytes back into its own terminal at their recorded times, the way the agent
 * wrote them. It reacts to nothing unless its plan says so, as an agent that
 * missed a size would.
 *
 * Every mode also WATCHES ITS OWN SIZE, the way the spec step's census
 * stand-in did: the size at start, every SIGWINCH, and a 1 ms poll of the
 * terminal's size, so a size that comes and goes before a signal handler runs
 * is still seen. That log is how probe:p368 reads "what the pane's program
 * saw" (arms a to c).
 *
 * ## Its modes (the plan is a JSON file the probe writes before each create)
 *
 *   winch     prints one line and only watches its size.
 *   replay    writes a fixture's chunks at their recorded times, the gaps
 *             capped at `maxGapMs` and divided by `speed`; with `gate` it
 *             waits for `<ctl>/go-<id>-start` first; after each chunk whose
 *             index is in `marks` it stops, logs the mark, and waits for
 *             `<ctl>/go-<id>-<k>` (or for `<ctl>/free-<id>`, which releases
 *             every later mark) before writing on. With `tail` it then waits
 *             for `<ctl>/go-<id>-tail` and writes those lines at the bottom
 *             row (the scroll region reset first), so the reply's rows go up
 *             into the pane's history.
 *   reactive  research 145's cold1 shape: writes the fixture's `start`
 *             segment at its recorded times, and writes its `repaint` segment
 *             ONCE, `repaintDelayMs` after the first size it is given that is
 *             not its start size, as Claude Code's inline renderer repaints
 *             on a size change and returns early on an unchanged one.
 *   lines     writes the plan's lines (strings that may hold escapes),
 *             joined by CR LF, after the gate when there is one.
 *
 * Output processing is off (raw mode), so the terminal receives exactly the
 * bytes the agent wrote. Each write is awaited before the next, so a mark
 * means every byte before it has been handed to the terminal.
 *
 * ## What it logs (JSON lines, `t` in epoch milliseconds)
 *
 *   start {pid, cols, rows, plan}, winch {cols, rows}, poll {cols, rows, from},
 *   chunk {i, n} (replay), mark {k, i}, released {k}, segment {name, chunks},
 *   repaint {cols, rows}, lines {n}, end, stdin {n}, SIGHUP / SIGTERM.
 *
 * ## What it refuses
 *
 * It starts nothing, opens no socket, reads only its plan, its fixture and its
 * control folder, and writes only its log. It never reads or writes anything
 * under a person's home. It exits on SIGHUP and SIGTERM, which is how the pane's
 * server ends it.
 *
 *   node build/p368/stand-in.mjs --plan <plan.json> --log <log.jsonl> --ctl <dir> --id <session id>
 */

import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const opt = (name) => {
  const at = args.indexOf(`--${name}`);
  return at === -1 ? '' : String(args[at + 1] ?? '');
};
const PLAN_FILE = opt('plan');
const LOG = opt('log');
const CTL = opt('ctl');
const ID = opt('id') || 'nosession';

const now = () => performance.timeOrigin + performance.now();
const log = (o) => {
  if (LOG === '') return;
  try {
    appendFileSync(LOG, `${JSON.stringify({ t: now(), ...o })}\n`);
  } catch {
    /* a log that cannot be written is the probe's reading, not this program's failure */
  }
};
const sleep = (ms) => new Promise((r) => setTimeout(r, Math.max(0, ms)));
const size = () => {
  try {
    const [cols, rows] = process.stdout.getWindowSize();
    return { cols, rows };
  } catch {
    return { cols: 0, rows: 0 };
  }
};

let plan = { mode: 'winch' };
try {
  plan = JSON.parse(readFileSync(PLAN_FILE, 'utf8'));
} catch (err) {
  plan = { mode: 'winch', planError: String(err?.message ?? err) };
}

// ---- the size watch, in every mode -------------------------------------------------
const startSize = size();
let last = startSize;
const sizeListeners = [];
log({ ev: 'start', pid: process.pid, cols: startSize.cols, rows: startSize.rows, plan });
process.on('SIGWINCH', () => {
  const s = size();
  log({ ev: 'winch', cols: s.cols, rows: s.rows });
});
setInterval(() => {
  const s = size();
  if (s.cols !== last.cols || s.rows !== last.rows) {
    log({ ev: 'poll', cols: s.cols, rows: s.rows, from: [last.cols, last.rows] });
    last = s;
    for (const f of sizeListeners) f(s);
  }
}, 1);
for (const sig of ['SIGHUP', 'SIGTERM']) {
  process.on(sig, () => {
    log({ ev: sig });
    process.exit(0);
  });
}
if (process.stdin.isTTY) process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.on('data', (d) => log({ ev: 'stdin', n: d.length }));

// ---- writing ------------------------------------------------------------------------
const write = (buf) =>
  new Promise((resolve) => {
    process.stdout.write(buf, () => resolve());
  });

const ctlFile = (name) => (CTL === '' ? '' : join(CTL, name));
async function waitFor(name, alsoFree) {
  const file = ctlFile(name);
  const free = alsoFree ? ctlFile(`free-${ID}`) : '';
  if (file === '') return;
  for (;;) {
    if (existsSync(file)) return;
    if (free !== '' && existsSync(free)) return;
    await sleep(5);
  }
}

function loadFixture(path) {
  const f = JSON.parse(readFileSync(path, 'utf8'));
  const chunks = (f.chunks ?? []).map((c) => ({ t: Number(c.t), b: Buffer.from(String(c.b), 'base64') }));
  return { fixture: f, chunks };
}

/** Write chunks [from, to) at their recorded spacing, pausing at marks. */
async function play(chunks, from, to, { marks = [], maxGapMs = Infinity, speed = 1, label = 'chunks' } = {}) {
  const markAt = new Map(marks.map((i, k) => [i, k]));
  let clock = now();
  for (let i = from; i < to; i += 1) {
    if (i > from) {
      const gap = Math.min(Math.max(0, chunks[i].t - chunks[i - 1].t), maxGapMs) / (speed > 0 ? speed : 1);
      const due = clock + gap;
      await sleep(due - now());
      clock = Math.max(due, now());
    }
    await write(chunks[i].b);
    log({ ev: 'chunk', i, n: chunks[i].b.length });
    if (markAt.has(i)) {
      const k = markAt.get(i);
      if (!(CTL !== '' && existsSync(ctlFile(`free-${ID}`)))) {
        log({ ev: 'mark', k, i });
        await waitFor(`go-${ID}-${String(k)}`, true);
        log({ ev: 'released', k });
      }
      clock = now();
    }
  }
  log({ ev: 'segment', name: label, chunks: to - from });
}

async function main() {
  const mode = String(plan.mode ?? 'winch');
  if (mode === 'winch') {
    await write(Buffer.from('p368 size watcher\r\n'));
    return;
  }
  if (plan.gate === true) await waitFor(`go-${ID}-start`, false);
  if (mode === 'lines') {
    const lines = Array.isArray(plan.lines) ? plan.lines.map(String) : [];
    await write(Buffer.from(`${lines.join('\r\n')}\r\n`, 'utf8'));
    log({ ev: 'lines', n: lines.length });
    log({ ev: 'end' });
    return;
  }
  const { fixture, chunks } = loadFixture(String(plan.fixture ?? ''));
  const pace = { maxGapMs: Number(plan.maxGapMs ?? Infinity), speed: Number(plan.speed ?? 1) };
  if (mode === 'replay') {
    await play(chunks, 0, chunks.length, { ...pace, marks: Array.isArray(plan.marks) ? plan.marks : [], label: 'replay' });
    log({ ev: 'end' });
    // A tail, on cue: the scroll region reset, the cursor to the bottom row, then lines, so what the
    // replay drew scrolls up into the pane's history.
    if (Array.isArray(plan.tail) && plan.tail.length > 0) {
      await waitFor(`go-${ID}-tail`, false);
      await write(Buffer.from(`\x1b[r\x1b[999;1H\r\n${plan.tail.map(String).join('\r\n')}\r\n`, 'utf8'));
      log({ ev: 'tail', n: plan.tail.length });
    }
    return;
  }
  if (mode === 'reactive') {
    const cut = Number(fixture.segments?.repaintFrom ?? chunks.length);
    const repaintDelayMs = Number(plan.repaintDelayMs ?? fixture.segments?.repaintDelayMs ?? 500);
    let repainted = false;
    let startDone = false;
    let pending = null;
    const repaint = async (s) => {
      if (repainted) return;
      repainted = true;
      await sleep(repaintDelayMs);
      log({ ev: 'repaint', cols: s.cols, rows: s.rows });
      await play(chunks, cut, chunks.length, { ...pace, label: 'repaint' });
    };
    sizeListeners.push((s) => {
      if (s.cols === startSize.cols && s.rows === startSize.rows) return;
      if (startDone) void repaint(s);
      else pending = s;
    });
    await play(chunks, 0, cut, { ...pace, label: 'start' });
    startDone = true;
    if (pending !== null) await repaint(pending);
    log({ ev: 'end' });
    return;
  }
  log({ ev: 'unknown-mode', mode });
}

main().catch((err) => log({ ev: 'error', message: String(err?.stack ?? err).slice(0, 400) }));
