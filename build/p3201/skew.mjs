#!/usr/bin/env node
/**
 * skew.mjs. `npm run probe:p320:skew` (Phase 320.1's second build,
 * build/p3201/SPEC.md §8.3). THE TWO ROADS TO ONE FAR PANE, MEASURED OVER A
 * REAL LINK, with NO Electron: what the product's two connections to a machine
 * do to the ORDER of a keystroke and a scroll when both are in flight.
 *
 * ## Why this exists
 *
 * The first attempt fenced a scroll 32 ms behind a keystroke and assumed the
 * two roads (the attach, which carries what a person types, and the control
 * connection, which carries the scroll) arrive in the order written. On his
 * Mac Pro over Tailscale, with round trips of 6.4 to 96.8 ms, typing during a
 * flick lost characters at HEAD and none at the parent (4 of 220). The spec's
 * own measurement M3 then showed the two roads reorder even on one Mac with no
 * network. The corrected design (D6) never lets the two roads overlap: a road
 * is taken only once the other has been quiet for `ROAD_QUIET_MS` (200 ms),
 * and a key over a parked pane goes on the control connection behind a
 * `cancel` (D7). This file measures the physics that design rests on, over the
 * product's own shape: ONE ssh ControlMaster, an attach (`ssh -t … tmux -u
 * attach-session -t =$N` in a node-pty) and a control client (`ssh … tmux -C
 * new-session -A -s ctl`) sharing it, exactly the product's two roads.
 *
 * ## The four parts (P3201_SKEW_PARTS, default a,b,c,d), per load
 *
 *   (a) a key on the ATTACH, then a park on the CONTROL connection (`copy-mode
 *       -e` and `send-keys -X -N 3 scroll-up`, pipelined) Δ ms later, Δ ∈ {0,
 *       1, 2, 5, 16, 32, 64, 128, 200}, N runs each: the key is EATEN when it
 *       never reaches the program. GRADED: 0 eaten at Δ = 200 ms, at every
 *       load, which is the bound D6 rests on.
 *   (b) parked; `cancel` then `send-keys -H <a key>` on the control
 *       connection, then another key on the attach at ONCE: the order they
 *       arrive in. PRINTED (M3 ii read it reversed up to 91 of 100 on one Mac).
 *   (c) parked; `cancel` then `send-keys -H <a key>`, both on ONE control
 *       connection: delivered. GRADED: N of N at every load (D7's premise).
 *   (d) M4's encoding table: each key of `M4_KEYS` typed on the attach into a
 *       live pane, and sent as `cancel` then `-H` into a parked one, the bytes
 *       the program received side by side. PRINTED, at the first load only.
 *
 * EVERY KEY IN (a) TO (c) IS A CHARACTER UNIQUE FOR THE WHOLE RUN (a letter
 * from U+0100 up, marks, controls and unassigned points skipped; the emacs
 * copy-mode table binds none of them, so an eaten key has no side effect), and
 * it is ATTRIBUTED BY WHAT IT IS, read from the whole log at the end of the
 * load. NEVER by either side's clock: the spec's first try at M3 compared two
 * processes' clocks and read 12 reversals where identity reads 91.
 *
 * THE LOADS (P3201_SKEW_LOADS, default none,light,heavy): the program is
 * build/p320/recorder.mjs, which logs every byte it receives and whose load is
 * printed by a CHILD sharing its terminal (`--load`), so its reading never
 * waits on its own output: none; 40 lines every 5 ms; and 200 lines every 1 ms
 * with the attach's reader paused 20 ms in every 40, the way the app's attach
 * host pauses under flow control. The heavy load costs the far machine about
 * one core for its minutes; it is the spec's, and P3201_SKEW_LOADS narrows it.
 *
 * ## The far machine
 *
 *   loopback (default)  build/with-scratch-machine.mjs's machine, which the
 *                       package script starts around this file with
 *                       SCRATCH_MACHINE_QUIET_SHELL=1: its far tmux is
 *                       P3201_SKEW_TMUX (default the carriage's own, 3.6a;
 *                       the vendored 3.7b by path), on this run's harness
 *                       socket inside the machine's own TMUX_TMPDIR, and its
 *                       ZDOTDIR must read the yard's empty zdot before a
 *                       session of this run is made, or nothing is.
 *   real                P3201_SKEW_FAR=real, VERIFIERS ONLY: his Mac Pro
 *                       through build/p3201/real-machine.mjs (every refusal,
 *                       proof, census and teardown of that file), node found
 *                       by path there, the recorder copied into the run's
 *                       directory. The package script leaves the loopback
 *                       machine out, whose agent holds none of his keys.
 *
 * `--self-test` runs the pure parts over fixtures and then the WHOLE
 * measurement once over a LOCAL scratch tmux with no ssh (both roads spawned
 * directly), small, so every line of the machinery is driven by anyone.
 *
 * ## Environment
 *
 *   GMUX_TMUX_SOCKET, GMUX_HARNESS_DIR (build/harness-socket.mjs), and on the
 *   loopback machine GMUX_CONFIG_ROOT (the carriage). P3201_SKEW_FAR,
 *   P3201_SKEW_TMUX, P3201_SKEW_N (50), P3201_SKEW_DELTAS, P3201_SKEW_LOADS,
 *   P3201_SKEW_PARTS, P3201_SKEW_OUT (default
 *   out/p3201-skew/readings-<far>-<time>.json). The real machine reads what
 *   build/p3201/real-machine.mjs reads.
 *
 * ## SAFETY
 *
 * It starts NO Electron, spawns no agent and spends no token. Every process it
 * starts is ended by its pid in a `finally`: the attach (a node-pty holding an
 * ssh), the control client (an ssh), the ssh ControlMaster (`ssh -O exit`),
 * and the far scratch tmux server (on the loopback machine by the pid it
 * reports, SIGTERM then SIGKILL after two seconds, because a server waits for
 * clients that never leave; on the real machine by real-machine.mjs's
 * `close()`, which also removes the run's directory and reads his session
 * count and dotfiles a second time). The recorder and its load child end with
 * the far server. Every ssh goes through build/ssh-run.mjs with a scratch
 * known-hosts file holding the machine's PUBLIC host key only. It never names
 * `-L gmux` (but for real-machine.mjs's one count) or his default server, and
 * it never signals a `-C` client while its server lives. This Mac's three
 * dotfiles (loopback) or the Mac Pro's (real) are read, size and modified time
 * only, before and after, and a change fails the run.
 */

import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { keyscanText, sshOptions, sshRun, sshSpawn } from '../ssh-run.mjs';
import { quietShellFor, setEnvLine } from '../scratch-machine.mjs';
import {
  controlPathRefusal,
  dotfilesMoved,
  dotfilesSentence,
  localCensus,
  openRealMachine,
  quoteArg,
  realMachineFromEnv,
  scratchTmuxCommand
} from './real-machine.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const TAG = '[p3201-skew]';
const CALLER = 'build/p3201/skew.mjs';
const t0 = Date.now();
const say = (l) => process.stdout.write(`${TAG} ${((Date.now() - t0) / 1000).toFixed(1).padStart(6)}s ${l}\n`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const J = (v) => JSON.stringify(v);

// ---------------------------------------------------------------------------
// The numbers, BY VALUE, and the pure parts. Every one is proved by --self-test.
// ---------------------------------------------------------------------------

/** Δ, from the key on the attach to the park on the control connection (§8.3). */
export const DELTAS = [0, 1, 2, 5, 16, 32, 64, 128, 200];
/** The bound D6 rests on: a park written this long after a key never eats it. */
export const ROAD_QUIET_BOUND_MS = 200;
export const LOADS = ['none', 'light', 'heavy'];
export const PARTS = ['a', 'b', 'c', 'd'];
/** Runs per cell. */
export const N_DEFAULT = 50;

/**
 * M4's encoding table (build/p3201/SPEC.md §4): what a key is on the attach
 * and what it is behind a `cancel` as `-H` bytes. `ESC O A`, `CSI 13;2u` and a
 * bracketed paste are the three the spec measured to differ on one Mac.
 */
export const M4_KEYS = [
  ['a', 'a'],
  ['é', 'é'],
  ['日本', '日本'],
  ['😀', '😀'],
  ['Enter', '\r'],
  ['Backspace', '\x7f'],
  ['Ctrl-C', '\x03'],
  ['Up (CSI A)', '\x1b[A'],
  ['Escape', '\x1b'],
  ['Tab', '\t'],
  ['Alt-b', '\x1bb'],
  ['Up (SS3 A)', '\x1bOA'],
  ['Shift-Enter (CSI 13;2u)', '\x1b[13;2u'],
  ['a bracketed paste', '\x1b[200~paste\x1b[201~']
];

/**
 * A maker of characters unique for the run: from U+0100 up, skipping every
 * mark (a combining mark could fold into the cell before it), control,
 * format, separator, surrogate, private-use and unassigned point, so each one
 * is one plain letter or symbol no copy-mode table binds.
 */
export function uniqueChars(start = 0x0100) {
  let next = start;
  const plain = /^[\p{L}\p{N}\p{S}\p{Pc}\p{Pd}\p{Ps}\p{Pe}\p{Pi}\p{Pf}\p{Po}]$/u;
  return () => {
    for (;;) {
      if (next > 0xffff) throw new Error('the run asked for more unique characters than the plane holds');
      const ch = String.fromCodePoint(next);
      next += 1;
      if (plain.test(ch)) return ch;
    }
  };
}

/** One character's UTF-8 bytes as the `-H` arguments tmux takes: lowercase two-digit hex. */
export function hexArgs(text) {
  return [...Buffer.from(text, 'utf8')].map((b) => b.toString(16).padStart(2, '0'));
}

/** The bytes a recorder log holds after its first `from` input records, as UTF-8 text and as hex. */
export function recorderText(logText, from = 0) {
  const hex = [];
  let seen = 0;
  for (const line of String(logText ?? '').split('\n')) {
    if (line.trim() === '') continue;
    let r;
    try {
      r = JSON.parse(line);
    } catch {
      continue;
    }
    if (r?.kind !== 'input' || typeof r.hex !== 'string') continue;
    seen += 1;
    if (seen > from) hex.push(r.hex);
  }
  const bytes = Buffer.from(hex.join(''), 'hex');
  return { text: bytes.toString('utf8'), hex: bytes.toString('hex'), inputs: seen };
}

/**
 * Every planned key's fate, by identity in the whole log's text. A plan row is
 * `{ part: 'a', delta, c }`, `{ part: 'b', c, u }` or `{ part: 'c', c }`, where
 * `c` went on the control connection or was the attach key before a park, and
 * `u` went on the attach. Answers the counts per cell and the keys that came
 * twice.
 */
export function attribute(plan, text) {
  const cells = {};
  const bump = (cell, what) => {
    cells[cell] = cells[cell] ?? {};
    cells[cell][what] = (cells[cell][what] ?? 0) + 1;
  };
  const twice = [];
  const at = (ch) => {
    const i = text.indexOf(ch);
    if (i >= 0 && text.indexOf(ch, i + ch.length) >= 0) twice.push(ch);
    return i;
  };
  for (const p of plan) {
    if (p.part === 'a') bump(`a Δ${String(p.delta)}`, at(p.c) >= 0 ? 'delivered' : 'eaten');
    else if (p.part === 'c') bump('c', at(p.c) >= 0 ? 'delivered' : 'lost');
    else if (p.part === 'b') {
      const jc = at(p.c);
      const ju = at(p.u);
      if (jc >= 0 && ju >= 0) bump('b', jc < ju ? 'in order' : 'reversed');
      else if (jc >= 0) bump('b', 'attach key lost');
      else if (ju >= 0) bump('b', 'control key lost');
      else bump('b', 'both lost');
    }
  }
  return { cells, twice };
}

/** The graded findings of one load's cells (§9): (c) N of N, (a) 0 eaten at 200 ms. */
export function gradeLoad(label, cells, planned) {
  const out = [];
  const c = cells['c'] ?? {};
  if ((planned.c ?? 0) > 0 && (c['delivered'] ?? 0) !== planned.c) {
    out.push(`${label} (c) cancel then -H on ONE control connection delivered ${String(c['delivered'] ?? 0)} of ${String(planned.c)}; D7 rests on every one arriving`);
  }
  const a = cells[`a Δ${String(ROAD_QUIET_BOUND_MS)}`];
  if ((planned.a200 ?? 0) > 0) {
    if (a === undefined) out.push(`${label} (a) at Δ = ${String(ROAD_QUIET_BOUND_MS)} ms was planned and not read`);
    else if ((a['eaten'] ?? 0) > 0) {
      out.push(`${label} (a) a park written ${String(ROAD_QUIET_BOUND_MS)} ms after a key on the attach ate ${String(a['eaten'])} of ${String((a['eaten'] ?? 0) + (a['delivered'] ?? 0))}; ROAD_QUIET_MS = ${String(ROAD_QUIET_BOUND_MS)} is not enough on this link`);
    }
  }
  return out;
}

/** A list option: the environment's comma list, or the default; every value checked. */
export function listOption(raw, fallback, allowed = null) {
  const text = String(raw ?? '').trim();
  const values = text === '' ? [...fallback] : text.split(',').map((s) => s.trim()).filter((s) => s !== '');
  const bad = allowed === null ? [] : values.filter((v) => !allowed.includes(v));
  return { values, bad };
}

/** The Δ list: whole numbers of ms from 0 to 1000. */
export function deltasOption(raw) {
  const { values } = listOption(raw, DELTAS.map(String));
  const nums = values.map(Number);
  const bad = values.filter((v, i) => !/^\d{1,4}$/.test(v) || nums[i] > 1000);
  return { values: nums, bad };
}

/** The recorder's command line on the far machine, every word quoted. */
export function recorderCommand(node, recorder, log, load, maxMs) {
  if (!LOADS.includes(load)) throw new Error(`${String(load)} is not a load`);
  const words = [node, recorder, '--log', log, '--max-ms', String(maxMs), ...(load === 'none' ? [] : ['--load', load])];
  return words.map(quoteArg).join(' ');
}

/** The refusal for this run's socket, or null: a harness socket ending in a pid, never gmux or default. */
export function socketRefusal(socket) {
  const s = String(socket ?? '');
  if (s === '') return 'no GMUX_TMUX_SOCKET. Run `npm run probe:p320:skew`, which wraps this file in build/harness-socket.mjs.';
  if (s === 'gmux' || s === 'default') return `"${s}" is not a harness socket.`;
  if (!/^gmux-p320[a-z0-9-]*-\d+$/.test(s)) return `"${s}" is not a gmux-p320 harness socket ending in its pid.`;
  return null;
}

/**
 * The control client's framing, fed chunk by chunk: every `%begin … %end` or
 * `%error` block answers the oldest waiting command, in order; notifications
 * outside a block are counted and dropped.
 */
export class ControlReader {
  constructor() {
    this.buf = '';
    this.cur = null;
    this.waiting = [];
    this.notes = 0;
  }
  expect() {
    return new Promise((resolveBlock) => this.waiting.push(resolveBlock));
  }
  feed(chunk) {
    this.buf += chunk;
    let i;
    while ((i = this.buf.indexOf('\n')) >= 0) {
      const line = this.buf.slice(0, i).replace(/\r$/, '');
      this.buf = this.buf.slice(i + 1);
      if (line.startsWith('%begin')) {
        this.cur = [];
        continue;
      }
      if (line.startsWith('%end') || line.startsWith('%error')) {
        if (this.cur === null) continue;
        const block = { ok: line.startsWith('%end'), lines: this.cur };
        this.cur = null;
        this.waiting.shift()?.(block);
        continue;
      }
      if (this.cur !== null) this.cur.push(line);
      else this.notes += 1;
    }
  }
  /** Every command still waiting answered as failed, when the connection ends. */
  fail() {
    for (const w of this.waiting.splice(0)) w({ ok: false, lines: ['the control connection ended'] });
  }
}

function selfTestPure() {
  const fresh = uniqueChars();
  const first = [fresh(), fresh(), fresh()];
  const many = Array.from({ length: 2000 }, fresh);
  const plan = [
    { part: 'a', delta: 0, c: 'Ā' },
    { part: 'a', delta: 200, c: 'ā' },
    { part: 'c', c: 'Ă' },
    { part: 'b', c: 'ă', u: 'Ą' },
    { part: 'b', c: 'ą', u: 'Ć' }
  ];
  const r = new ControlReader();
  const answers = [r.expect(), r.expect()];
  r.feed('%begin 1 2 0\n%end 1 2 0\n%output %1 x\n%begin 1 3 0\nline\n%err');
  r.feed('or 1 3 0\n');
  const cases = [
    ['unique characters start at U+0100', () => first, ['Ā', 'ā', 'Ă']],
    ['2000 unique characters are 2000 different ones', () => new Set(many).size, 2000],
    ['no mark, control or unassigned point is ever handed out', () => many.some((c) => /[\p{M}\p{C}\p{Z}]/u.test(c)), false],
    ['the combining marks U+0300 to U+036F are skipped', () => many.some((c) => c.codePointAt(0) >= 0x300 && c.codePointAt(0) <= 0x36f), false],
    ['-H arguments are lowercase two-digit UTF-8 bytes', () => [hexArgs('é'), hexArgs('😀'), hexArgs('\r')], [['c3', 'a9'], ['f0', '9f', '98', '80'], ['0d']]],
    ['the recorder log reads as text after an offset, across a split character', () => recorderText('{"kind":"ready"}\n{"kind":"input","hex":"61"}\n{"kind":"input","hex":"c3"}\n{"kind":"input","hex":"a962"}\n{"kind":"inp', 1).text, 'éb'],
    ['attribution by identity: delivered, eaten, lost, in order and reversed', () => attribute(plan, 'ĀĂąĆ').cells, { 'a Δ0': { delivered: 1 }, 'a Δ200': { eaten: 1 }, c: { delivered: 1 }, b: { 'both lost': 1, 'in order': 1 } }],
    ['a reversed pair is read by where each character is, never by a clock', () => attribute([{ part: 'b', c: 'x', u: 'y' }], 'yx').cells, { b: { reversed: 1 } }],
    ['a key that came twice is named', () => attribute([{ part: 'c', c: 'Ā' }], 'ĀzĀ').twice, ['Ā']],
    ['grade: N of N and nothing eaten at 200 ms passes', () => gradeLoad('3.6a none', { c: { delivered: 5 }, 'a Δ200': { delivered: 5 } }, { c: 5, a200: 5 }), []],
    ['grade: a key lost on one connection is named', () => gradeLoad('3.6a none', { c: { delivered: 4, lost: 1 }, 'a Δ200': { delivered: 5 } }, { c: 5, a200: 5 }).length, 1],
    ['grade: a key eaten at 200 ms is named with the bound', () => gradeLoad('3.7c heavy', { c: { delivered: 5 }, 'a Δ200': { delivered: 4, eaten: 1 } }, { c: 5, a200: 5 })[0]?.includes('ROAD_QUIET_MS = 200 is not enough'), true],
    ['grade: eaten at Δ 0 is printed, not graded', () => gradeLoad('x', { c: { delivered: 5 }, 'a Δ0': { eaten: 5 }, 'a Δ200': { delivered: 5 } }, { c: 5, a200: 5 }), []],
    ['grade: 200 ms planned and not read is a finding, not a pass', () => gradeLoad('x', { c: { delivered: 5 } }, { c: 5, a200: 5 }).length, 1],
    ['the Δ list defaults to the spec\'s nine', () => deltasOption('').values, DELTAS],
    ['a Δ that is not whole ms is refused', () => deltasOption('0,1.5,abc,2000').bad, ['1.5', 'abc', '2000']],
    ['a load that is not one of three is refused', () => listOption('none,fast', LOADS, LOADS).bad, ['fast']],
    ['the recorder line quotes every word and carries the load', () => recorderCommand('/usr/local/bin/node', '/tmp/p3201-9/bin/recorder.mjs', '/tmp/p3201-9/logs/skew.log', 'heavy', 1000), '/usr/local/bin/node /tmp/p3201-9/bin/recorder.mjs --log /tmp/p3201-9/logs/skew.log --max-ms 1000 --load heavy'],
    ['the recorder line carries no load for none', () => recorderCommand('/n', '/r', '/l', 'none', 5), '/n /r --log /l --max-ms 5'],
    ['the socket gmux is refused', () => socketRefusal('gmux') !== null, true],
    ['a socket with no pid is refused', () => socketRefusal('gmux-p320-skew') !== null, true],
    ['the harness socket is accepted', () => socketRefusal('gmux-p320-skew-wt-p3201-4242'), null],
    ['the control framing answers each command in order and counts notifications', async () => [await answers[0], await answers[1], r.notes], [{ ok: true, lines: [] }, { ok: false, lines: ['line'] }, 1]],
    // build/scratch-machine.mjs's QUIET SHELL, which this file's loopback run
    // proves live (D12): off by default, byte for byte the line every other
    // harness has always had; on, ZDOTDIR the yard's own and no history.
    ['the loopback machine\'s SetEnv is unchanged with the quiet shell off', () => [quietShellFor('/r', {}), setEnvLine('/tmp/x', quietShellFor('/r', {}))], [null, 'SetEnv TMUX_TMPDIR=/tmp/x']],
    ['the quiet shell adds the yard\'s empty ZDOTDIR and no history to the one SetEnv line', () => setEnvLine('/tmp/x', quietShellFor('/r', { SCRATCH_MACHINE_QUIET_SHELL: '1' })), 'SetEnv TMUX_TMPDIR=/tmp/x ZDOTDIR=/r/zdot HISTFILE=/dev/null'],
    ['the quiet shell is on only for the exact value 1', () => [quietShellFor('/r', { SCRATCH_MACHINE_QUIET_SHELL: 'yes' }), quietShellFor('/r', { SCRATCH_MACHINE_QUIET_SHELL: '0' })], [null, null]]
  ];
  return cases;
}

// ---------------------------------------------------------------------------
// One far machine, in the shape every part reads
// ---------------------------------------------------------------------------

let pty = null;
function loadPty() {
  if (pty !== null) return pty;
  pty = createRequire(import.meta.url)('node-pty');
  return pty;
}

/**
 * The world a measurement runs in. `kind` is `local` (the self-test: this
 * Mac's tmux, both roads spawned directly, no ssh), `loopback` or `real`.
 * Every process it starts is recorded in `owned` and ended in `close()`.
 */
function makeWorld({ kind, socket, runDir, farTmux, carriage, real }) {
  const owned = { ptys: new Set(), controls: new Set() };
  const w = { kind, socket, runDir, owned, version: null, serverPid: null, closed: false };
  const tmuxWords = (args) => [farTmux, '-L', socket, '-f', '/dev/null', ...args];
  if (kind === 'real') {
    w.tmux = (args) => real.tmux(args, { allowFail: true }).trim();
    w.command = (args) => scratchTmuxCommand(real.facts.farDir, socket, args);
    w.text = (path) => real.cat(path);
    w.node = real.node;
    w.recorder = real.standIns.find((p) => p.endsWith('/recorder.mjs')) ?? null;
    w.logs = `${real.facts.farDir}/logs`;
    w.version = real.version;
  } else {
    const env = { ...process.env, TMUX_TMPDIR: kind === 'local' ? runDir : carriage.tmuxTmp };
    delete env['TMUX'];
    delete env['TMUX_PANE'];
    // His ruling of 2026-10-02: a scratch HOME as well as the empty ZDOTDIR,
    // and never his Terminal tab's TERM_SESSION_ID, by which macOS's
    // /etc/zshrc_Apple_Terminal appends a session's history to his own file.
    delete env['TERM_SESSION_ID'];
    if (kind === 'local') Object.assign(env, { SHELL: '/bin/sh', HISTFILE: '/dev/null', HOME: join(runDir, 'zdot'), ZDOTDIR: join(runDir, 'zdot') });
    w.env = env;
    w.tmux = (args) => (spawnSync(farTmux, tmuxWords(args).slice(1), { encoding: 'utf8', env, timeout: 15_000 }).stdout ?? '').trim();
    w.command = (args) => tmuxWords(args).map(quoteArg).join(' ');
    w.text = (path) => {
      try {
        return readFileSync(path, 'utf8');
      } catch {
        return '';
      }
    };
    w.node = process.execPath;
    w.recorder = join(REPO, 'build', 'p320', 'recorder.mjs');
    w.logs = join(runDir, 'logs');
    mkdirSync(w.logs, { recursive: true });
    w.version = (spawnSync(farTmux, ['-V'], { encoding: 'utf8' }).stdout ?? '').trim();
  }
  if (kind === 'local') mkdirSync(join(runDir, 'zdot'), { recursive: true, mode: 0o700 });

  // THE SSH CONNECTION, the product's shape: one master, two slaves on it.
  let knownHosts = null;
  let base = null;
  let spawnEnv = process.env;
  if (kind === 'loopback') {
    knownHosts = join(runDir, 'kh');
    writeFileSync(knownHosts, keyscanText({ host: carriage.host, port: carriage.port, caller: CALLER }), { mode: 0o600 });
    const controlPath = join(runDir, 'cm');
    const tooLong = controlPathRefusal(controlPath);
    if (tooLong !== null) throw new Error(tooLong);
    base = sshOptions({
      knownHosts,
      caller: CALLER,
      connectTimeout: 10,
      strict: 'yes',
      controlMaster: 'auto',
      controlPath,
      controlPersist: '60s',
      extra: ['-F', '/dev/null', '-p', String(carriage.port), '-l', carriage.user]
    });
    spawnEnv = { ...process.env, SSH_AUTH_SOCK: carriage.authSock };
    w.master = { knownHosts, controlPath, host: carriage.host };
  }
  const sshArgv = (command, tty) => (kind === 'real' ? real.spawnArgv(command, { tty }) : [...(tty ? ['-t'] : []), ...base, carriage.host, command]);
  const hostsFile = kind === 'real' ? real.knownHosts : knownHosts;

  /** The master, opened first and synchronously, so both roads ride it. */
  w.openMaster = () => {
    if (kind !== 'loopback') return;
    const out = sshRun({ knownHosts, caller: CALLER, argv: [...base, carriage.host, 'true'], env: spawnEnv, timeout: 30_000 });
    if (out.status !== 0) throw new Error(`the loopback machine did not answer (exit ${String(out.status)}): ${String(out.stderr ?? '').trim().slice(0, 200)}`);
  };

  /** The control road: a `-C` client, framing read, pipelined sends. */
  w.openControl = async () => {
    const words = ['-C', 'new-session', '-A', '-s', 'ctl'];
    const child =
      kind === 'local'
        ? spawn(farTmux, tmuxWords(words).slice(1), { env: w.env, stdio: ['pipe', 'pipe', 'pipe'] })
        : sshSpawn({ knownHosts: hostsFile, caller: CALLER, argv: sshArgv(w.command(words), false), env: spawnEnv, stdio: ['pipe', 'pipe', 'pipe'] });
    owned.controls.add(child);
    const reader = new ControlReader();
    child.stdout.setEncoding('latin1');
    child.stdout.on('data', (d) => reader.feed(d));
    child.on('exit', () => reader.fail());
    child.stdin.on('error', () => undefined);
    const greeted = reader.expect();
    const send = (line) => {
      const answer = reader.expect();
      child.stdin.write(`${line}\n`);
      return answer;
    };
    const hello = await Promise.race([greeted, sleep(30_000).then(() => ({ ok: false, lines: ['no greeting in 30 s'] }))]);
    if (hello.ok !== true) throw new Error(`the control client did not greet: ${J(hello.lines).slice(0, 200)}`);
    await send('refresh-client -f no-output');
    return { child, send, reader };
  };

  /** The attach road: a real terminal, as the app's own attach host holds one. */
  w.openAttach = (sid) => {
    const words = ['-u', 'attach-session', '-t', `=${sid}`];
    const o = { name: 'xterm-256color', cols: 80, rows: 24, cwd: runDir, env: { ...spawnEnv, ...(w.env ?? {}), TERM: 'xterm-256color', LANG: 'en_US.UTF-8' } };
    const term =
      kind === 'local'
        ? loadPty().spawn(farTmux, tmuxWords(words).slice(1), o)
        : sshSpawn({ knownHosts: hostsFile, caller: CALLER, argv: sshArgv(w.command(words), true), spawn: loadPty().spawn, ...o });
    owned.ptys.add(term);
    term.onData(() => undefined);
    return term;
  };

  /** End everything this world started, by pid, once. */
  w.close = () => {
    if (w.closed) return;
    w.closed = true;
    for (const term of owned.ptys) endPid(term.pid);
    for (const child of owned.controls) {
      try {
        child.stdin.end();
      } catch {
        /* already closed */
      }
    }
    if (kind !== 'real') {
      const pid = Number(w.tmux(['display-message', '-p', '#{pid}']));
      w.serverPid = Number.isInteger(pid) && pid > 1 ? pid : w.serverPid;
      endPid(w.serverPid);
    }
    // A control client whose server is gone leaves by itself; one that has not
    // after its server ended is ended by its pid (the ssh on the far roads).
    for (const child of owned.controls) endPid(child.pid);
    if (kind === 'loopback') {
      sshRun({ knownHosts, caller: CALLER, argv: ['-O', 'exit', '-o', `ControlPath=${w.master.controlPath}`, w.master.host], env: spawnEnv, timeout: 15_000 });
    }
  };
  return w;
}

/**
 * True while `pid` names a RUNNING process (signal 0 sends nothing). A zombie
 * is not running: a child of this process that exited while a teardown held
 * the loop is `<defunct>` until the loop reaps it, holds no memory, and is not
 * a leak (CLAUDE.md).
 */
function alive(pid) {
  if (!Number.isInteger(pid) || pid <= 1) return false;
  try {
    process.kill(pid, 0);
  } catch (err) {
    if (err?.code !== 'EPERM') return false;
  }
  const stat = (spawnSync('ps', ['-p', String(pid), '-o', 'stat='], { encoding: 'utf8' }).stdout ?? '').trim();
  return stat !== '' && !stat.startsWith('Z');
}

/** SIGTERM, up to two seconds, then SIGKILL; blocking, so it runs in a `finally` and on exit. */
function endPid(pid) {
  if (!alive(pid)) return;
  try {
    process.kill(pid, 'SIGTERM');
  } catch {
    return;
  }
  const until = Date.now() + 2000;
  while (alive(pid) && Date.now() < until) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 25);
  if (alive(pid)) {
    try {
      process.kill(pid, 'SIGKILL');
    } catch {
      /* gone in between */
    }
  }
}

// ---------------------------------------------------------------------------
// The measurement, over one world
// ---------------------------------------------------------------------------

/**
 * Every part at every load over `w`. Answers `{ loads: [...], findings }`.
 * `settleMs` is how long a load waits before the whole log is read.
 */
async function measure(w, { n, deltas, loads, parts, settleMs, maxMs }) {
  const fresh = uniqueChars();
  const results = [];
  const findings = [];
  const cc = await w.openControl();
  for (const [li, load] of loads.entries()) {
    const name = `rec-${load}`;
    const log = `${w.logs}/skew-${load}.jsonl`;
    const made = w.tmux(['new-session', '-d', '-s', name, '-x', '80', '-y', '24', recorderCommand(w.node, w.recorder, log, load, maxMs)]);
    void made;
    // `=name:` and not `=name`: display-message takes a PANE target, and tmux
    // resolves a bare `=name` there to nothing (measured, 3.6a and 3.7b).
    const sid = w.tmux(['display-message', '-p', '-t', `=${name}:`, '#{session_id}']);
    if (!/^\$\d+$/.test(sid)) throw new Error(`the recorder's session ${name} has no id (${J(sid)})`);
    const readyBy = Date.now() + 20_000;
    while (!w.text(log).includes('"ready"')) {
      if (Date.now() > readyBy) throw new Error(`the recorder in ${name} did not start within 20 s`);
      await sleep(100);
    }
    const term = w.openAttach(sid);
    let flow = null;
    try {
      await sleep(800);
      if (load === 'heavy') {
        let paused = false;
        flow = setInterval(() => {
          paused = !paused;
          if (paused) term.pause();
          else term.resume();
        }, 20);
      }
      const park = () => Promise.all([cc.send(`copy-mode -e -t ${sid}`), cc.send(`send-keys -t ${sid} -X -N 3 scroll-up`)]);
      const toLive = () => cc.send(`send-keys -t ${sid} -X cancel`);
      const plan = [];
      const planned = { a200: 0, c: 0 };
      if (parts.includes('c')) {
        for (let k = 0; k < n; k += 1) {
          await park();
          const c = fresh();
          await Promise.all([cc.send(`send-keys -t ${sid} -X cancel`), cc.send(`send-keys -t ${sid} -H ${hexArgs(c).join(' ')}`)]);
          plan.push({ part: 'c', c });
          planned.c += 1;
          await sleep(10);
          await toLive();
        }
      }
      if (parts.includes('b')) {
        for (let k = 0; k < n; k += 1) {
          await park();
          const c = fresh();
          const u = fresh();
          const a = cc.send(`send-keys -t ${sid} -X cancel`);
          const b = cc.send(`send-keys -t ${sid} -H ${hexArgs(c).join(' ')}`);
          term.write(u);
          await Promise.all([a, b]);
          plan.push({ part: 'b', c, u });
          await sleep(40);
          await toLive();
        }
      }
      if (parts.includes('a')) {
        for (const delta of deltas) {
          for (let k = 0; k < n; k += 1) {
            await toLive();
            await sleep(20);
            const c = fresh();
            term.write(c);
            if (delta > 0) await sleep(delta);
            await park();
            plan.push({ part: 'a', delta, c });
            if (delta === ROAD_QUIET_BOUND_MS) planned.a200 += 1;
            await sleep(60);
            await toLive();
          }
        }
      }
      await toLive();
      await sleep(settleMs);
      const { text } = recorderText(w.text(log));
      const { cells, twice } = attribute(plan, text);
      const label = `${String(w.version)} ${load}`;
      const graded = gradeLoad(label, cells, planned);
      findings.push(...graded);
      if (twice.length > 0) findings.push(`${label}: ${String(twice.length)} key(s) arrived TWICE (${J(twice.slice(0, 5))}); a keystroke is delivered at most once`);
      const row = { load, sid, planned: plan.length, cells, twice: twice.length, m4: null };
      // (d) M4's table, at the first load only: side by side, printed.
      if (parts.includes('d') && li === 0) {
        row.m4 = [];
        for (const [keyName, bytes] of M4_KEYS) {
          await toLive();
          await sleep(200);
          const before = recorderText(w.text(log)).inputs;
          term.write(bytes);
          await sleep(900);
          const viaAttach = recorderText(w.text(log), before).hex;
          await park();
          await sleep(150);
          const mid = recorderText(w.text(log)).inputs;
          await Promise.all([cc.send(`send-keys -t ${sid} -X cancel`), cc.send(`send-keys -t ${sid} -H ${hexArgs(bytes).join(' ')}`)]);
          await sleep(900);
          const viaControl = recorderText(w.text(log), mid).hex;
          row.m4.push({ key: keyName, sent: Buffer.from(bytes, 'utf8').toString('hex'), attach: viaAttach, control: viaControl, same: viaAttach === viaControl });
        }
      }
      results.push(row);
      const show = Object.entries(cells).map(([cell, v]) => `${cell} ${J(v)}`).join('; ');
      say(`${label}: ${show}${twice.length > 0 ? `; ${String(twice.length)} came twice` : ''}`);
      for (const m of row.m4 ?? []) say(`${label} (d) ${m.key.padEnd(24)} sent ${m.sent} | attach, live ${m.attach || '(nothing)'} | control, parked ${m.control || '(nothing)'}${m.same ? '' : '   DIFFER'}`);
    } finally {
      if (flow !== null) clearInterval(flow);
      try {
        term.resume();
      } catch {
        /* ended */
      }
      endPid(term.pid);
      w.owned.ptys.delete(term);
      w.tmux(['kill-session', '-t', `=${name}`]);
    }
  }
  return { results, findings };
}

// ---------------------------------------------------------------------------
// --self-test: the pure parts, then one small LOCAL world with no ssh
// ---------------------------------------------------------------------------

async function selfTest() {
  let ok = true;
  for (const [label, run, want] of selfTestPure()) {
    let got;
    try {
      got = await run();
    } catch (err) {
      got = `THREW ${err instanceof Error ? err.message : String(err)}`;
    }
    const good = J(got) === J(want);
    ok = ok && good;
    say(`${good ? 'ok  ' : 'BAD '} ${label}: ${J(got)}${good ? '' : ` want ${J(want)}`}`);
  }
  // THE MACHINERY, driven: this Mac's tmux, both roads spawned directly (no
  // ssh), a scratch socket and TMUX_TMPDIR of its own, ended in the finally.
  const tmux = [join(REPO, 'build', 'vendor', 'tmux', 'bin', 'tmux'), '/opt/homebrew/bin/tmux'].find((p) => existsSync(p));
  if (tmux === undefined) {
    say('BAD  no tmux on this Mac to drive the machinery with');
    return false;
  }
  try {
    loadPty();
  } catch (err) {
    say(`BAD  node-pty does not load under this node: ${err instanceof Error ? err.message.split('\n')[0] : String(err)}`);
    return false;
  }
  const runDir = mkdtempSync('/private/tmp/p3201-sk-');
  const w = makeWorld({ kind: 'local', socket: `p3201-skew-selftest-${String(process.pid)}`, runDir, farTmux: tmux });
  let out = null;
  try {
    out = await measure(w, { n: 4, deltas: [0, 200], loads: ['none', 'light'], parts: PARTS, settleMs: 1200, maxMs: 120_000 });
  } catch (err) {
    say(`BAD  the local world stopped: ${err instanceof Error ? err.message : String(err)}`);
    ok = false;
  } finally {
    w.close();
    rmSync(runDir, { recursive: true, force: true });
  }
  if (out !== null) {
    const none = out.results.find((r) => r.load === 'none');
    const cDelivered = out.results.map((r) => r.cells['c']?.['delivered'] ?? 0);
    const m4Plain = (none?.m4 ?? []).filter((m) => ['a', 'é', 'Enter', 'Ctrl-C'].includes(m.key)).every((m) => m.same && m.attach !== '');
    const checks = [
      ['the local world ran both loads', out.results.length, 2],
      ['(c) cancel then -H on one connection delivered 4 of 4 at both loads', cDelivered, [4, 4]],
      ['(a) read at both Δ and (b) read, at both loads', out.results.map((r) => ['a Δ0', 'a Δ200', 'b'].every((c) => r.cells[c] !== undefined)), [true, true]],
      ['(d) read at the first load only, and a, é, Enter, Ctrl-C arrive the same on both roads', [none?.m4?.length ?? 0, out.results[1]?.m4 ?? null, m4Plain], [M4_KEYS.length, null, true]],
      ['no key arrived twice', out.results.map((r) => r.twice), [0, 0]],
      ['nothing this world started is still running', [...w.owned.ptys].concat([...w.owned.controls]).filter((p) => alive(p.pid)).length + (alive(w.serverPid) ? 1 : 0), 0]
    ];
    for (const [label, got, want] of checks) {
      const good = J(got) === J(want);
      ok = ok && good;
      say(`${good ? 'ok  ' : 'BAD '} ${label}: ${J(got)}${good ? '' : ` want ${J(want)}`}`);
    }
    for (const f of out.findings) say(`note: the local world graded ${f}`);
  }
  say(ok ? 'self-test PASS' : 'self-test FAIL');
  return ok;
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

async function main() {
  const refuse = (why) => {
    process.stderr.write(`${TAG} REFUSED. ${why}\n`);
    process.exit(2);
  };
  // His ruling of 2026-10-02: nothing this run starts carries his Terminal
  // tab's TERM_SESSION_ID, by which /etc/zshrc_Apple_Terminal appends an
  // interactive zsh's history to his own file when it exits.
  delete process.env['TERM_SESSION_ID'];
  const socket = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
  {
    const r = socketRefusal(socket);
    if (r !== null) refuse(r);
  }
  const harnessDir = (process.env['GMUX_HARNESS_DIR'] ?? '').trim();
  if (harnessDir === '') refuse('no GMUX_HARNESS_DIR. Run `npm run probe:p320:skew`.');
  const FAR = (process.env['P3201_SKEW_FAR'] ?? '').trim() || 'loopback';
  if (FAR !== 'loopback' && FAR !== 'real') refuse(`P3201_SKEW_FAR is ${J(FAR)}; it is loopback or real.`);
  const n = Number((process.env['P3201_SKEW_N'] ?? '').trim() || N_DEFAULT);
  if (!Number.isInteger(n) || n < 1 || n > 500) refuse('P3201_SKEW_N is a whole number from 1 to 500.');
  const deltas = deltasOption(process.env['P3201_SKEW_DELTAS']);
  if (deltas.bad.length > 0) refuse(`P3201_SKEW_DELTAS names ${deltas.bad.join(', ')}; each is a whole number of ms from 0 to 1000.`);
  const loads = listOption(process.env['P3201_SKEW_LOADS'], LOADS, LOADS);
  if (loads.bad.length > 0 || loads.values.length === 0) refuse(`P3201_SKEW_LOADS names ${loads.bad.join(', ')}; the loads are ${LOADS.join(', ')}.`);
  const parts = listOption(process.env['P3201_SKEW_PARTS'], PARTS, PARTS);
  if (parts.bad.length > 0 || parts.values.length === 0) refuse(`P3201_SKEW_PARTS names ${parts.bad.join(', ')}; the parts are ${PARTS.join(', ')}.`);
  const outPath = resolve(REPO, (process.env['P3201_SKEW_OUT'] ?? '').trim() || join('out', 'p3201-skew', `readings-${FAR}-${String(Date.now())}.json`));

  let carriage = null;
  let realFacts = null;
  let farTmux = null;
  if (FAR === 'loopback') {
    const configRoot = (process.env['GMUX_CONFIG_ROOT'] ?? '').trim();
    try {
      carriage = JSON.parse(readFileSync(join(configRoot, 'p69-carriage.json'), 'utf8'));
    } catch {
      carriage = null;
    }
    if (configRoot === '' || carriage === null) refuse('no p69-carriage.json inside GMUX_CONFIG_ROOT. Run me inside node build/with-scratch-machine.mjs, which `npm run probe:p320:skew` does.');
    if (typeof carriage.tmuxTmp !== 'string' || !carriage.tmuxTmp.startsWith('/tmp/')) refuse(`the carriage names ${J(carriage.tmuxTmp)} as the machine's TMUX_TMPDIR, which is not a scratch directory under /tmp.`);
    farTmux = (process.env['P3201_SKEW_TMUX'] ?? '').trim() || carriage.remoteTmuxPath;
    if (!existsSync(farTmux)) refuse(`the far tmux ${farTmux} is not here.`);
  } else {
    let scratchAgent = null;
    try {
      scratchAgent = JSON.parse(readFileSync(join((process.env['GMUX_CONFIG_ROOT'] ?? '').trim(), 'p69-carriage.json'), 'utf8')).authSock ?? null;
    } catch {
      scratchAgent = null;
    }
    realFacts = realMachineFromEnv(process.env, socket, { scratchAgent });
    if (realFacts.refusal !== null) refuse(`the real machine: ${realFacts.refusal}`);
  }
  try {
    loadPty();
  } catch (err) {
    refuse(`node-pty does not load under this node (${process.version}): ${err instanceof Error ? err.message.split('\n')[0] : String(err)}.`);
  }

  // SHORT, so the ssh control socket fits macOS's 104 bytes (real-machine.mjs refusal 7).
  const runDir = mkdtempSync('/private/tmp/p3201-sk-');
  const findings = [];
  const readings = { far: FAR, socket, n, deltas: deltas.values, loads: loads.values, parts: parts.values, notes: [] };
  let real = null;
  let w = null;
  let censusBefore = null;
  try {
    if (FAR === 'real') {
      real = openRealMachine(realFacts, { runDir, say });
      if (real.node === null || !real.standIns.some((p) => p.endsWith('/recorder.mjs'))) {
        throw new Error(`the recorder cannot run there: node ${String(realFacts.realNode)} did not answer (set P3201_REAL_NODE)`);
      }
    } else {
      censusBefore = localCensus();
    }
    w = makeWorld({ kind: FAR, socket, runDir, farTmux, carriage, real });
    w.openMaster();
    readings.version = w.version;
    say(`the ${FAR} machine runs ${String(w.version)}; n ${String(n)}, Δ ${deltas.values.join(',')} ms, loads ${loads.values.join(',')}, parts ${parts.values.join(',')}`);
    // THE QUIET SHELL, PROVED before any session of this run is made: the
    // control client's greeting has made the server and its `ctl` session.
    const proving = await w.openControl();
    if (FAR === 'real') {
      const why = real.prove();
      if (why !== null) throw new Error(`the far socket is not this run's own: ${why}. Nothing of this run was made there.`);
    } else {
      const zdot = w.tmux(['show-environment', '-g', 'ZDOTDIR']);
      const want = `ZDOTDIR=${join((process.env['GMUX_CONFIG_ROOT'] ?? '').trim(), 'zdot')}`;
      if (zdot !== want) throw new Error(`the loopback machine's far shell is not the quiet one (ZDOTDIR reads ${J(zdot)}, not ${J(want)}); run it with SCRATCH_MACHINE_QUIET_SHELL=1, which the package script sets`);
    }
    proving.child.stdin.end();
    const out = await measure(w, { n, deltas: deltas.values, loads: loads.values, parts: parts.values, settleMs: FAR === 'real' ? 3000 : 1500, maxMs: 3 * 60 * 60 * 1000 });
    readings.results = out.results;
    findings.push(...out.findings);
  } catch (err) {
    findings.push(`the run stopped: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    w?.close();
    if (real !== null) {
      real.close();
      readings.realCounts = { before: real.countBefore, after: real.countAfter };
      readings.dotfiles = real.dotfiles;
      if (real.countBefore === null || real.countBefore !== real.countAfter) findings.push(`his own server held ${String(real.countBefore)} sessions before and ${String(real.countAfter)} after; the two counts must be read and equal`);
      if (real.teardown?.removed !== true) findings.push(`the run's directory ${realFacts.farDir} on the far machine was not confirmed removed; remove it by hand and say so`);
      const moved = dotfilesSentence('the far machine', real.dotfiles.moved, real.dotfiles.before, real.dotfiles.after);
      if (moved !== null) findings.push(moved);
    }
    if (censusBefore !== null) {
      const after = localCensus();
      readings.dotfiles = { before: censusBefore, after };
      const moved = dotfilesSentence('this Mac', dotfilesMoved(censusBefore, after), censusBefore, after);
      if (moved !== null) findings.push(moved);
    }
    rmSync(runDir, { recursive: true, force: true });
  }
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${J({ findings, readings })}\n`);
  say(`readings: ${outPath}`);
  if (findings.length > 0) {
    for (const f of findings) process.stderr.write(`${TAG}   ${f}\n`);
    process.stderr.write(`${TAG} FAILED: ${String(findings.length)} finding(s).\n`);
    process.exit(1);
  }
  say('PASS: cancel then -H on one connection delivered every key, and no park written 200 ms after a key on the attach ate it, at every load.');
  process.exit(0);
}

if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  if (process.argv.includes('--self-test')) process.exit((await selfTest()) ? 0 : 1);
  await main();
}
