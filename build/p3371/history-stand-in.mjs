#!/usr/bin/env node
/**
 * build/p3371/history-stand-in.mjs — A HISTORY, DRAWN INTO A PANE (Phase 337.1,
 * build/p3371/SPEC.md §7.5).
 *
 * Run INSIDE a tmux pane (a scratch server's, or a Tortie session's on a run's
 * scratch socket). It writes a history by mode and then sleeps; it reads
 * nothing but the files it is named (and, under --stream, the one byte its own
 * terminal sends it), runs nothing, opens no socket and logs
 * nothing. It ends on SIGHUP, SIGTERM or SIGINT, and on its own after
 * `MAX_LIFE_MS` whatever happens, so a pane that outlived its run cannot keep
 * it alive.
 *
 *   --lines N            N numbered lines, `L000001 …`, then sleep
 *   --stack <list>       every committed capture named in <list> (one path a
 *                        line), each drawn as measure:p337 draws it (its rows
 *                        joined by CR LF, a reply capture's source line
 *                        dropped, `\xNN` decoded in an `.ansi` one), the files
 *                        one after another with NO reset between them, so a
 *                        pen left open by one carries into the next as it
 *                        would on a real terminal
 *   --rate R --total N   numbered lines at R a second (0: as fast as the pane
 *                        takes them), then sleep
 *   --counter            after the history, one line at the bottom rewritten
 *                        in place once a second (`C000001`, `C000002`, …), so
 *                        a LIVE row keeps changing while the history stays put
 *   --alt                after the history, the alternate screen, its rows
 *                        drawn and 160 more scrolled inside it (§14 M7's shape)
 *   --worst N            N rows in which every cell has its own colours (the
 *                        page cap's worst case, §14 M11, §Attack B10)
 *   --clear-after MS     after the history, wait MS and write `ESC [ 3 J`,
 *                        which empties tmux's history from inside the pane
 *                        (§14 M8; measure:p337 arm H4's program-side clear)
 *   --quiet-after N      after the history, N plain numbered lines (`Q000001`
 *                        …, 30 columns), so the live screen is plain over a
 *                        history that is not: a live screen of per-cell
 *                        colours is over the 1,024-style cap and carries no
 *                        depth, and a page needs the depth a picture carries
 *                        (probe:p337 SB3's worst-colour history, the fix round)
 *   --stream R:N         after the history of --lines, the pane's terminal put
 *                        in raw mode (so nothing typed is drawn) and ONE byte
 *                        waited for on it, then N more numbered lines at R a
 *                        second, continuing the numbers (`--lines 3000 --stream
 *                        4:40` draws L003001 to L003040 over ten seconds), then
 *                        sleep. The byte is the probe's own `tmux send-keys`,
 *                        sent when the phone is watching, so the stream runs
 *                        while it reads (Phase 337.3, build/p3373/SPEC.md §7.3,
 *                        probe:p316 PF2, T.stream)
 *   --alt-for S          with --alt, leave the alternate screen S seconds after
 *                        entering it (`ESC [ ? 1049 l`), so the history comes
 *                        back under the rows it covered (Phase 337.3, PF4,
 *                        T.altback: `--lines 3000 --alt --alt-for 8`)
 *
 *   --prefix X           the numbered lines' letter (one capital, default L),
 *                        so two panes' histories differ (measure arm DS)
 *   --width W            each numbered line's width in columns (default 60,
 *                        less than any pane this phase draws it in, so no
 *                        line wraps and index i holds line i + 1)
 *   --cols C             --worst's row width (default 120; C - 1 cells drawn,
 *                        so the row never reaches the last column)
 *
 * --counter, --alt, --clear-after and --quiet-after follow --lines, --stack or
 * --worst, and --stream follows --lines alone (its numbers continue them);
 * each is one at a time, and --alt-for is --alt's and nothing else's.
 * --lines 3000 --counter is
 * PS13's stand-in. Nothing here is a model, an agent or a shell: no token is
 * spent and no history file is touched, and the one byte --stream reads is
 * never written back or run.
 */

import { readFileSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** The stand-in ends itself after this, whatever its run did. */
export const MAX_LIFE_MS = 1_800_000;
/** The numbered lines' digits: `L000001`. */
export const NUMBER_DIGITS = 6;
const TAIL = 'abcdefghijklmnopqrstuvwxyz0123456789 ';

/** Numbered line `n` (1-based), `width` columns, printable ASCII alone. */
export function lineOf(n, { prefix = 'L', width = 60 } = {}) {
  const head = `${prefix}${String(n).padStart(NUMBER_DIGITS, '0')} `;
  return (head + TAIL.repeat(Math.ceil(width / TAIL.length) + 1)).slice(0, Math.max(head.length - 1, width));
}

/** The number a numbered row starts with, and its letter; null for any other row. */
export function numberOf(row) {
  const m = /^([A-Z])(\d{6})(?: |$)/.exec(String(row ?? ''));
  return m === null ? null : { prefix: m[1], n: Number(m[2]) };
}

/** `\\` and `\xNN` back to their bytes (build/p318's capture encoding, as measure:p337 reads it). */
export function decodeAnsiLine(line) {
  return line.replace(/\\(\\|x[0-9a-f]{2})/g, (_, g) => (g === '\\' ? '\\' : String.fromCharCode(parseInt(g.slice(1), 16))));
}

/**
 * One committed capture as the bytes a pane is drawn from (measure:p337's
 * `fixtureBytes`, the same rules): its rows joined by CR LF, the first line
 * dropped for a reply capture (its source line), `\xNN` decoded for `.ansi`.
 */
export function captureBytes(path, text) {
  const header = String(path).includes('/build/fixtures/reply/');
  const ansi = String(path).endsWith('.ansi');
  const lines = String(text).split('\n');
  if (header) lines.shift();
  if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
  const rows = ansi ? lines.map(decodeAnsiLine) : lines;
  return Buffer.from(rows.join('\r\n'), ansi ? 'latin1' : 'utf8');
}

/** The list file's paths: one a line, blank lines and `#` lines skipped. */
export function listedPaths(listText) {
  return String(listText)
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l !== '' && !l.startsWith('#'));
}

/** Every capture of a list, one after another, CR LF after each, and no reset between them. */
export function stackBytes(paths, read) {
  const parts = [];
  for (const p of paths) {
    const ansi = p.endsWith('.ansi');
    parts.push(captureBytes(p, read(p, ansi ? 'latin1' : 'utf8')), Buffer.from('\r\n', 'latin1'));
  }
  return Buffer.concat(parts);
}

/** One worst row: every one of `cols - 1` cells its own 256-colour fg and bg pair. */
export function worstRow(r, cols = 120) {
  let s = '';
  for (let c = 0; c < cols - 1; c += 1) s += `\u001b[38;5;${String((r * 7 + c) % 256)};48;5;${String((r * 13 + c * 3) % 256)}m${String.fromCharCode(33 + ((r + c) % 90))}`;
  return `${s}\u001b[0m`;
}

/** The counter's row at second `k` (1-based), drawn over itself with CR and erase-to-end. */
export function counterRow(k) {
  return `\r\u001b[K${lineOf(k, { prefix: 'C', width: 30 })}`;
}

/** What --alt-for writes to leave the alternate screen, so the main screen and its history come back (Phase 337.3). */
export const ALT_LEAVE = '\u001b[?1049l';
/** --stream's bounds: lines a second, and lines in all (Phase 337.3). */
export const STREAM_MAX_RATE = 1_000;
export const STREAM_MAX_TOTAL = 1_000_000;
/** --alt-for's bound, in seconds (Phase 337.3). */
export const ALT_FOR_MAX_S = 3_600;

/**
 * The `k`th line (1-based) a --stream tail draws after `plan`'s history:
 * the numbered line that continues --lines' numbers, so the line at tmux's
 * index i is still line i + 1 whatever has streamed (Phase 337.3).
 */
export function streamLineOf(plan, k) {
  return lineOf(plan.lines + k, plan);
}

/** `R:N` read as `{ rate, total }` within --stream's bounds, or null. */
export function streamOf(text) {
  const m = /^([1-9][0-9]{0,3}):([1-9][0-9]{0,6})$/.exec(String(text ?? ''));
  if (m === null) return null;
  const rate = Number(m[1]);
  const total = Number(m[2]);
  return rate <= STREAM_MAX_RATE && total <= STREAM_MAX_TOTAL ? { rate, total } : null;
}

/** The argv read into a plan, or a sentence saying why not. */
export function planOf(argv) {
  const has = (name) => argv.includes(name);
  const arg = (name) => {
    const i = argv.indexOf(name);
    return i >= 0 && i + 1 < argv.length ? argv[i + 1] : null;
  };
  const whole = (name, dflt, max) => {
    const v = arg(name);
    if (v === null) return dflt;
    if (!/^(0|[1-9][0-9]{0,8})$/.test(v) || Number(v) > max) return Number.NaN;
    return Number(v);
  };
  const prefix = arg('--prefix') ?? 'L';
  if (!/^[A-Z]$/.test(prefix)) return { why: 'the prefix is one capital letter' };
  const width = whole('--width', 60, 400);
  const cols = whole('--cols', 120, 512);
  if (!(width >= 8) || !(cols >= 2)) return { why: 'the width is 8 to 400 and the cols 2 to 512' };
  const modes = ['--lines', '--stack', '--rate', '--worst'].filter(has);
  if (modes.length !== 1) return { why: 'name exactly one of --lines, --stack, --rate and --worst' };
  const plan = { mode: modes[0].slice(2), prefix, width, cols, counter: has('--counter'), alt: has('--alt'), clearAfter: has('--clear-after') ? whole('--clear-after', 0, 600_000) : null, quiet: has('--quiet-after') ? whole('--quiet-after', 0, 10_000) : null };
  if (plan.clearAfter !== null && !Number.isFinite(plan.clearAfter)) return { why: '--clear-after is a whole number of milliseconds' };
  if (plan.quiet !== null && !(plan.quiet >= 1)) return { why: '--quiet-after is a whole number of lines, 1 to 10,000' };
  if (plan.mode === 'lines') plan.lines = whole('--lines', 0, 1_000_000);
  if (plan.mode === 'worst') plan.rows = whole('--worst', 0, 100_000);
  if (plan.mode === 'rate') {
    plan.rate = whole('--rate', 0, 1_000_000);
    plan.total = whole('--total', 1_000_000, 10_000_000);
  }
  if (plan.mode === 'stack') {
    plan.list = arg('--stack');
    if (plan.list === null || plan.list === '') return { why: '--stack names a list file' };
  }
  for (const k of ['lines', 'rows', 'rate', 'total']) if (k in plan && !Number.isFinite(plan[k])) return { why: `--${k === 'rows' ? 'worst' : k} is a whole number in its bounds` };
  // Phase 337.3: --stream R:N continues --lines' numbers; --alt-for S is --alt's.
  plan.stream = has('--stream') ? streamOf(arg('--stream')) : null;
  if (has('--stream') && plan.stream === null) return { why: `--stream is R:N, 1 to ${String(STREAM_MAX_RATE)} lines a second and 1 to ${String(STREAM_MAX_TOTAL)} lines` };
  if (plan.stream !== null && plan.mode !== 'lines') return { why: '--stream continues the numbers of --lines, and follows nothing else' };
  plan.altFor = has('--alt-for') ? whole('--alt-for', 0, ALT_FOR_MAX_S) : null;
  if (plan.altFor !== null && !(plan.altFor >= 1)) return { why: `--alt-for is a whole number of seconds, 1 to ${String(ALT_FOR_MAX_S)}` };
  if (plan.altFor !== null && !plan.alt) return { why: '--alt-for leaves the alternate screen --alt enters, and follows nothing else' };
  const tails = [plan.counter, plan.alt, plan.clearAfter !== null, plan.quiet !== null, plan.stream !== null].filter(Boolean).length;
  if (tails > 0 && plan.mode === 'rate') return { why: '--counter, --alt, --clear-after and --quiet-after follow a drawn history, not a rate' };
  if (tails > 1) return { why: '--counter, --alt, --clear-after, --quiet-after and --stream are one at a time' };
  return plan;
}

/**
 * Call `then` on the first byte the pane sends (Phase 337.3, --stream), with
 * its terminal in raw mode first so nothing typed is echoed or edited. Every
 * byte after it is read and dropped, so none waits in the terminal's buffer.
 */
function onFirstByte(then) {
  const input = process.stdin;
  if (input.isTTY) input.setRawMode(true);
  let started = false;
  input.on('data', () => {
    if (started) return;
    started = true;
    then();
  });
  input.on('error', () => process.exit(0));
  input.resume();
}

/** --stream's tail: one byte waited for, then `total` numbered lines at `rate` a second, continuing --lines' numbers. */
function drawStream(plan) {
  sleepForever();
  onFirstByte(() => {
    const every = 1000 / plan.stream.rate;
    const t0 = Date.now();
    let k = 0;
    const tick = () => {
      const due = Math.min(plan.stream.total, Math.floor((Date.now() - t0) / every) + 1);
      let s = '';
      while (k < due) {
        k += 1;
        s += `${streamLineOf(plan, k)}\r\n`;
      }
      if (s !== '') process.stdout.write(s);
      if (k < plan.stream.total) setTimeout(tick, Math.max(1, Math.min(10, every)));
    };
    tick();
  });
}

function sleepForever() {
  const end = () => process.exit(0);
  for (const sig of ['SIGHUP', 'SIGTERM', 'SIGINT']) process.on(sig, end);
  setTimeout(end, MAX_LIFE_MS);
  setInterval(() => undefined, 1 << 30);
}

/** Write `s` and then `next`, waiting for the pane to take it. */
function write(s, next) {
  if (process.stdout.write(s)) setImmediate(next);
  else process.stdout.once('drain', next);
}

function drawTail(plan) {
  if (plan.counter) {
    let k = 0;
    sleepForever();
    const tick = () => {
      k += 1;
      process.stdout.write(counterRow(k));
    };
    tick();
    setInterval(tick, 1_000);
    return;
  }
  if (plan.stream !== null) {
    drawStream(plan);
    return;
  }
  if (plan.clearAfter !== null) {
    setTimeout(() => process.stdout.write('\u001b[3J'), plan.clearAfter);
  }
  if (plan.quiet !== null) {
    let q = '';
    for (let i = 1; i <= plan.quiet; i += 1) q += `${lineOf(i, { prefix: 'Q', width: 30 })}\r\n`;
    process.stdout.write(q);
  }
  if (plan.alt) {
    setTimeout(() => {
      let a = '\u001b[?1049h\u001b[H\u001b[2J';
      for (let i = 1; i <= 160 + 40; i += 1) a += `A${String(i).padStart(NUMBER_DIGITS, '0')} full screen row\r\n`;
      process.stdout.write(a);
      // Phase 337.3 (--alt-for): the program leaves, and the history comes back.
      if (plan.altFor !== null) setTimeout(() => process.stdout.write(ALT_LEAVE), plan.altFor * 1_000);
    }, 300);
  }
  sleepForever();
}

function run(plan) {
  if (plan.mode === 'lines') {
    let n = 1;
    const pump = () => {
      let s = '';
      for (let k = 0; k < 500 && n <= plan.lines; k += 1, n += 1) s += `${lineOf(n, plan)}\r\n`;
      if (s === '') drawTail(plan);
      else write(s, pump);
    };
    pump();
    return;
  }
  if (plan.mode === 'stack') {
    const paths = listedPaths(readFileSync(plan.list, 'utf8'));
    write(stackBytes(paths, (p, enc) => readFileSync(p, enc)), () => drawTail(plan));
    return;
  }
  if (plan.mode === 'worst') {
    let r = 0;
    const pump = () => {
      let s = '';
      for (let k = 0; k < 50 && r < plan.rows; k += 1, r += 1) s += `${worstRow(r, plan.cols)}\r\n`;
      if (s === '') drawTail(plan);
      else write(s, pump);
    };
    pump();
    return;
  }
  // --rate
  let n = 1;
  if (plan.rate === 0) {
    const pump = () => {
      let s = '';
      for (let k = 0; k < 200 && n <= plan.total; k += 1, n += 1) s += `${lineOf(n, plan)}\r\n`;
      if (s === '') sleepForever();
      else write(s, pump);
    };
    pump();
    return;
  }
  const every = 1000 / plan.rate;
  const t0 = Date.now();
  const tick = () => {
    const due = Math.floor((Date.now() - t0) / every) + 1;
    let s = '';
    while (n <= due && n <= plan.total) {
      s += `${lineOf(n, plan)}\r\n`;
      n += 1;
    }
    if (s !== '') process.stdout.write(s);
    if (n <= plan.total) setTimeout(tick, Math.max(1, Math.min(10, every)));
    else sleepForever();
  };
  for (const sig of ['SIGHUP', 'SIGTERM', 'SIGINT']) process.on(sig, () => process.exit(0));
  setTimeout(() => process.exit(0), MAX_LIFE_MS);
  tick();
}

function isEntry() {
  try {
    return process.argv[1] !== undefined && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}
if (isEntry()) {
  // A pane that is gone answers the next write with an error. Left unheard, that
  // error reaches Node's fatal report, which opens the hung-up terminal again for
  // stderr and waits in that open(2) for good, where neither the signal handlers
  // above nor MAX_LIFE_MS can run: measure:p337's first live runs (2026-10-06)
  // left 34 stand-ins waiting there for four hours, and 5 or 6 of 10 panes killed
  // mid-write did it again. Both handlers end the stand-in and write nothing.
  process.stdout.on('error', () => process.exit(0));
  process.on('uncaughtException', () => process.exit(1));
  const plan = planOf(process.argv.slice(2));
  if (typeof plan.why === 'string') {
    process.stderr.write(`history-stand-in: ${plan.why}\n`);
    process.exit(2);
  }
  run(plan);
}
