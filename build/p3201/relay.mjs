#!/usr/bin/env node
/**
 * relay.mjs. A link with a round trip, for `probe:p320:rig` (Phase 320.1,
 * build/p3201/SPEC.md §7.1).
 *
 * The rig drives the SHIPPING carriage (TmuxControlClient, scroll.ts, the
 * guarded runner) against a real `tmux -C` client, and a machine's carriage is
 * an ssh away. This file is that ssh, less everything but its timing: it starts
 * one child, copies bytes both ways, and holds every chunk D ms (plus up to J
 * ms of jitter) before it passes it on. ORDER IS KEPT within each direction,
 * because ssh is one TCP stream: a chunk is never delivered before the one
 * that arrived before it, whatever its own jitter drew. Research 130 measured
 * the design with a relay of this shape (`relay-pipe.mjs D`); this one adds the
 * jitter and the log the spec asks for.
 *
 * ## What it logs
 *
 * `--log <file>` appends one JSON line per chunk written TOWARD the child,
 * being every byte the carriage sent, in hex, with the time it was written:
 * `{"t":…,"hex":"…"}`. The rig reads it per run, so a hostile argv the door
 * refused can be proved to have put 0 bytes on the link, and a verifier can
 * re-derive every command that crossed from the bytes themselves.
 *
 * ## How it drops, and why never by a signal to the child
 *
 * SIGUSR1 to THIS process drops the link: the child's input is ended (EOF),
 * which a `tmux -C` client answers by leaving, and this process ends its own
 * output and exits. The child is never sent a signal. Research 131 §3.5
 * measured a SIGKILL of a `-C` client in the first 3 ms of its handshake ending
 * the whole SERVER on tmux 3.6a, so no signal ever goes to one.
 *
 * ## How it ends
 *
 * When its own input ends, it delivers what is pending, ends the child's input
 * and waits for the child. When the child exits, it delivers what is pending
 * and exits with the child's code. It is never detached, and the rig that
 * starts it (through TmuxControlClient) ends that client, which ends this.
 * A last resort: it ends itself and its child after `--max-ms` (15 minutes).
 *
 * Usage:
 *   node build/p3201/relay.mjs --delay <ms> [--jitter <ms>] [--log <file>]
 *        [--pid-file <file>] [--max-ms <ms>] -- <program> [args…]
 *
 * `--pid-file` gets this relay's pid on its first line and the child's on its
 * second (`readPidFile` reads both).
 *
 * `DelayLine` is exported for the rig's own key path, which is the same link
 * shape in process (the keys and the carriage are two independent paths, the
 * worst case the spec names).
 */

import { spawn } from 'node:child_process';
import { appendFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * A one-direction link: `write(chunk)` delivers the chunk to `sink` D ms later,
 * plus a jitter drawn from [0, J], and never before the chunk written before it.
 *
 * ONE QUEUE AND ONE TIMER, and that is load bearing. The first version armed a
 * timer per chunk with a wait computed from `performance.now()`, and Node starts
 * a timer from its CACHED loop time, so a chunk written later in the same loop
 * turn got a wait a fraction of a millisecond shorter and could fire FIRST. The
 * rig's reconnect arm caught it at D = 25: tmux numbered the second command of
 * a connect before the first (`%begin … 343` for the read, `344` for
 * `refresh-client`), which is a link no ssh can be. Now every chunk waits in
 * order behind the one before it, whatever the timers do.
 */
export class DelayLine {
  constructor(delayMs, jitterMs, sink, random = Math.random) {
    this.delayMs = Math.max(0, Number(delayMs) || 0);
    this.jitterMs = Math.max(0, Number(jitterMs) || 0);
    this.sink = sink;
    this.random = random;
    this.lastDue = 0;
    this.queue = [];
    this.timer = null;
    this.idle = [];
  }

  /** When a chunk written now is delivered, in ms of the monotonic clock. */
  dueFor(now) {
    const drawn = now + this.delayMs + (this.jitterMs > 0 ? this.random() * this.jitterMs : 0);
    this.lastDue = Math.max(this.lastDue, drawn);
    return this.lastDue;
  }

  /** Chunks written and not yet delivered. */
  get pending() {
    return this.queue.length;
  }

  write(chunk) {
    const due = this.dueFor(performance.now());
    if (this.queue.length === 0 && due <= performance.now()) {
      this.sink(chunk);
      return;
    }
    this.queue.push({ due, chunk });
    this.arm();
  }

  /** One timer, for the chunk at the head of the queue. */
  arm() {
    if (this.timer !== null || this.queue.length === 0) return;
    const wait = Math.max(0, this.queue[0].due - performance.now());
    this.timer = setTimeout(() => {
      this.timer = null;
      this.flushDue();
    }, wait);
  }

  /** Deliver every chunk whose time has come, in the order written. */
  flushDue() {
    const now = performance.now();
    while (this.queue.length > 0 && this.queue[0].due <= now + 0.5) {
      const { chunk } = this.queue.shift();
      this.sink(chunk);
    }
    if (this.queue.length > 0) this.arm();
    else {
      const waiting = this.idle;
      this.idle = [];
      for (const done of waiting) done();
    }
  }

  /** Resolve once every chunk written so far has been delivered. */
  drained() {
    if (this.queue.length === 0) return Promise.resolve();
    return new Promise((done) => {
      this.idle.push(done);
    });
  }

  /** Drop what has not been delivered. */
  cancel() {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
    this.queue = [];
    const waiting = this.idle;
    this.idle = [];
    for (const done of waiting) done();
  }
}

/**
 * What `--pid-file` holds: this relay's pid on the first line and its child's
 * on the second. Either is null when it is not a whole number above 1.
 */
export function readPidFile(text) {
  const [relay = '', child = ''] = String(text ?? '').split('\n');
  const one = (s) => {
    const n = Number(s.trim());
    return Number.isInteger(n) && n > 1 && s.trim() !== '' ? n : null;
  };
  return { relay: one(relay), child: one(child) };
}

/** The options this file takes, and the child's argv after `--`. */
export function parseRelayArgs(argv) {
  const out = { delayMs: 0, jitterMs: 0, log: '', pidFile: '', maxMs: 900_000, child: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--') {
      out.child = argv.slice(i + 1);
      break;
    }
    const v = argv[i + 1];
    if (a === '--delay') out.delayMs = Number(v);
    else if (a === '--jitter') out.jitterMs = Number(v);
    else if (a === '--log') out.log = String(v ?? '');
    else if (a === '--pid-file') out.pidFile = String(v ?? '');
    else if (a === '--max-ms') out.maxMs = Number(v);
    else throw new Error(`relay.mjs does not know ${a}`);
    i += 1;
  }
  if (!Number.isFinite(out.delayMs) || out.delayMs < 0) throw new Error('--delay is a number of ms, 0 or more');
  if (!Number.isFinite(out.jitterMs) || out.jitterMs < 0) throw new Error('--jitter is a number of ms, 0 or more');
  if (out.child.length === 0) throw new Error('relay.mjs needs a program after --');
  return out;
}

function main() {
  let opts;
  try {
    opts = parseRelayArgs(process.argv.slice(2));
  } catch (err) {
    process.stderr.write(`relay.mjs: ${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(2);
  }
  const child = spawn(opts.child[0], opts.child.slice(1), { stdio: ['pipe', 'pipe', 'pipe'] });
  // The rig reads the FIRST line to drop the link by a signal to THIS process,
  // and the second, the child's pid, only at its teardown: after it has ended
  // the scratch SERVER, it confirms the `-C` client left with it and ends one
  // that did not (a leaked client is how a server waited forever on 2026-09-29).
  // The child is never signalled while its server lives (research 131 §3.5).
  if (opts.pidFile !== '') {
    try {
      writeFileSync(opts.pidFile, `${String(process.pid)}\n${String(child.pid ?? '')}\n`);
    } catch {
      /* the rig reports a drop it could not make */
    }
  }
  let childGone = false;
  let exiting = false;
  const toChild = new DelayLine(opts.delayMs, opts.jitterMs, (chunk) => {
    if (!childGone && child.stdin.writable) child.stdin.write(chunk);
  });
  const toParent = new DelayLine(opts.delayMs, opts.jitterMs, (chunk) => {
    process.stdout.write(chunk);
  });
  const log = (chunk) => {
    if (opts.log === '') return;
    try {
      appendFileSync(opts.log, `${JSON.stringify({ t: Date.now(), hex: Buffer.from(chunk).toString('hex') })}\n`);
    } catch {
      /* a log that cannot be written is a reading the rig reports as missing */
    }
  };
  const finish = async (code) => {
    if (exiting) return;
    exiting = true;
    await toParent.drained();
    process.stdout.end(() => process.exit(code));
    setTimeout(() => process.exit(code), 2000).unref();
  };
  process.stdin.on('data', (chunk) => {
    log(chunk);
    toChild.write(chunk);
  });
  process.stdin.on('end', async () => {
    await toChild.drained();
    if (!childGone) child.stdin.end();
  });
  child.stdout.on('data', (chunk) => toParent.write(chunk));
  child.stderr.on('data', (chunk) => process.stderr.write(chunk));
  child.on('exit', (code) => {
    childGone = true;
    void finish(code ?? 1);
  });
  // THE DROP. The child's input is ended, never signalled; see the header.
  process.on('SIGUSR1', () => {
    toChild.cancel();
    if (!childGone) child.stdin.end();
    toParent.cancel();
    void finish(0);
  });
  // An interrupt or a termination of THIS process ends its input to the child
  // the same way, and the child leaves by itself.
  for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
    process.on(sig, () => {
      if (!childGone) child.stdin.end();
      void finish(130);
    });
  }
  setTimeout(() => {
    if (!childGone) child.stdin.end();
    void finish(1);
  }, opts.maxMs).unref();
}

/**
 * `--self-test`: the delay line keeps order under jitter, within one loop turn
 * and across turns, delivers at once at D = 0, holds a chunk at least D, and
 * drops on cancel. It starts no child.
 */
async function selfTest() {
  const out = [];
  const check = (label, got, want) => {
    const good = JSON.stringify(got) === JSON.stringify(want);
    out.push(good);
    process.stdout.write(`[p3201-relay] ${good ? 'ok  ' : 'BAD '} ${label}: ${JSON.stringify(got)}${good ? '' : ` want ${JSON.stringify(want)}`}\n`);
  };
  {
    const got = [];
    const d = new DelayLine(5, 30, (c) => got.push(c));
    for (let i = 0; i < 300; i += 1) {
      d.write(i);
      if (i % 7 === 0) await new Promise((r) => setImmediate(r));
    }
    await d.drained();
    check('300 chunks under 30 ms of jitter arrive in the order written', got.every((v, i) => v === i) && got.length === 300, true);
  }
  {
    let draws = [1, 0];
    const got = [];
    const d = new DelayLine(10, 20, (c) => got.push(c), () => draws.shift() ?? 0);
    d.write('late draw');
    d.write('early draw');
    await d.drained();
    check('a later chunk that drew less jitter still waits for the one before it', got, ['late draw', 'early draw']);
    draws = [];
  }
  {
    const got = [];
    const d = new DelayLine(0, 0, (c) => got.push(c));
    d.write('a');
    d.write('b');
    check('D = 0 delivers at once, in order', got, ['a', 'b']);
  }
  {
    const got = [];
    const d = new DelayLine(25, 0, (c) => got.push(c));
    const t0 = performance.now();
    d.write(1);
    await d.drained();
    check('a chunk is held at least D', performance.now() - t0 >= 24, true);
  }
  {
    const got = [];
    const d = new DelayLine(50, 0, (c) => got.push(c));
    d.write('x');
    d.cancel();
    await new Promise((r) => setTimeout(r, 80));
    check('cancel drops what was not delivered', got, []);
  }
  check('the pid file is read as the relay, then its child', readPidFile('4242\n4243\n'), { relay: 4242, child: 4243 });
  check('a pid file an older relay wrote has no child', readPidFile('4242\n'), { relay: 4242, child: null });
  check('a pid of 1 or a word is nobody', readPidFile('1\nx\n'), { relay: null, child: null });
  const ok = out.every(Boolean);
  process.stdout.write(`[p3201-relay] ${ok ? `self-test PASS: ${String(out.length)} fixtures` : 'self-test FAIL'}\n`);
  return ok;
}

if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  if (process.argv.includes('--self-test')) selfTest().then((ok) => process.exit(ok ? 0 : 1));
  else main();
}
