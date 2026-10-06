/**
 * build/p337/drive-screen.mts — the SHIPPING Mac side of the Screen, driven
 * against real tmux, for `measure:p337` (build/p337/SPEC.md §7.6). Run ONLY by
 * build/p337/measure-screen.mjs, under the pinned tsx, once per tmux build,
 * with a plan file that measure-screen.mjs wrote: the tmux binary, a scratch
 * `-L p337-v-<pid>-<label>` socket under a scratch TMUX_TMPDIR, a copy of
 * resources/gmux-tmux.conf, a scratch HOME, and the paths of the drawer and
 * build/p337/key-recorder.mjs.
 *
 * WHAT IT RUNS. The shipping src/main/screen/read.ts, compose.ts, watch.ts and
 * keys.ts and the shipping TmuxControlClient, over a FAKE core whose sessions
 * are this run's own panes; with P337_PARENT_CHECKOUT, the PARENT's
 * TmuxControlClient too, for arm C's parent reading. In its panes: the drawer
 * (a node process writing a committed capture's bytes and sleeping),
 * build/p337/key-recorder.mjs (logging every byte it reads), and `/bin/cat`
 * (a terminal that echoes, for the long poll). No shell, no agent, no
 * Electron, no door, no token, no ssh. It never names `-L gmux` or the
 * default server, and it ends its control clients and its server in its own
 * `finally`; measure-screen.mjs kills the server again by its socket name and
 * removes the directory in ITS `finally`, whatever happened here.
 *
 * WHAT IT PRINTS. One line, `P337_MEASURE:{…}`, the raw readings of every arm
 * it ran (no grade: measure-screen.mjs grades). Nothing typed into a pane, no
 * screen and no key is logged anywhere else.
 */

import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { appendFileSync, existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

interface Plan {
  label: string;
  tmux: string;
  socket: string;
  conf: string;
  tmuxTmp: string;
  home: string;
  dir: string;
  node: string;
  drawer: string;
  recorder: string;
  pty: string | null;
  python: string | null;
  fixtures: Array<{ name: string; path: string; kind: 'ansi' | 'txt' }>;
  keysEncoding: string;
  parentClient: string | null;
  arms: string[];
  counts: { keys: number; changes: number; trials: number };
  logFile: string;
}

const plan = JSON.parse(readFileSync(process.argv[2] ?? '', 'utf8')) as Plan;
if (!/^p337-v-\d+-[a-z0-9]+$/.test(plan.socket)) throw new Error(`the socket ${plan.socket} is not a p337-v scratch socket`);
if (!plan.tmuxTmp.startsWith('/private/tmp/') && !plan.tmuxTmp.startsWith('/tmp/')) throw new Error('TMUX_TMPDIR is not a scratch directory under /tmp');

const note = (line: string): void => {
  try {
    appendFileSync(plan.logFile, `${line}\n`);
  } catch {
    /* the outer runner removed the directory */
  }
};

// Electron is not here: the shipping log module names it, so a stand-in module
// goes into the require cache first, exactly as build/p318/drive-writer.mts does.
{
  const scratch = mkdtempSync(join(plan.tmuxTmp, 'electron-'));
  const requireHere = createRequire(import.meta.url);
  const electronPath = requireHere.resolve('electron');
  requireHere.cache[electronPath] = {
    id: electronPath,
    filename: electronPath,
    loaded: true,
    exports: {
      app: { getPath: () => scratch, isReady: () => true, isPackaged: false, on: () => undefined },
      ipcMain: { removeAllListeners: () => undefined, removeHandler: () => undefined, on: () => undefined, handle: () => undefined }
    }
  } as unknown as NodeJS.Module;
}

const { readScreenLocal, SCREEN_FORMAT } = await import('../../src/main/screen/read.js');
const { remoteScreenArgv, splitRemoteRead } = await import('../../src/main/machines/remote-screen.js');
const { namedKeySequence } = await import('../../src/main/machines/scroll-shapes.js');
const { composeScreen } = await import('../../src/main/screen/compose.js');
const { createScreenWatch, SCREEN_TICK_MS } = await import('../../src/main/screen/watch.js');
const { createScreenKeys } = await import('../../src/main/screen/keys.js');
const { createQuestionIds } = await import('../../src/main/reply/question-id.js');
const { TmuxControlClient, CONTROL_ATTACH_ARGS } = await import('../../src/main/tmux/control-client.js');
const { POCKET_SCREEN_KEY_NAMES, POCKET_SCREEN_MAX_COLS, POCKET_SCREEN_MAX_ROWS, POCKET_SCREEN_MAX_RUNS, POCKET_SCREEN_MAX_BYTES } = await import('../../src/shared/ipc/pocket.js');
const recorderModule = (await import(pathToFileURL(plan.recorder).href)) as { readRecorderLog(text: string): { ready: unknown; reads: Array<{ t: string; hex: string }> } };

// ---------------------------------------------------------------------------
// tmux, on the scratch socket only
// ---------------------------------------------------------------------------

const ENV: NodeJS.ProcessEnv = {
  PATH: '/usr/bin:/bin:/usr/sbin:/sbin',
  HOME: plan.home,
  ZDOTDIR: plan.home,
  HISTFILE: '/dev/null',
  TMUX_TMPDIR: plan.tmuxTmp,
  SHELL: '/bin/sh',
  TERM: 'xterm-256color',
  LANG: 'en_US.UTF-8',
  LC_ALL: 'en_US.UTF-8'
};

const now = (): bigint => process.hrtime.bigint();
const msBetween = (from: bigint, to: bigint): number => Number(to - from) / 1e6;
const sleep = (t: number): Promise<void> => new Promise((r) => setTimeout(r, t));

function tmux(args: readonly string[], timeoutMs = 10_000): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(plan.tmux, ['-L', plan.socket, '-f', plan.conf, ...args], { env: ENV, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    const timer = setTimeout(() => child.kill('SIGKILL'), timeoutMs);
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (c: string) => {
      out += c;
    });
    child.stderr.resume();
    child.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(out);
      else reject(new Error(`tmux ${args[0] ?? ''} exited ${String(code)}`));
    });
  });
}

/**
 * THE ONLY RUNNER the shipping modules are handed. Their production defaults
 * (`execTmux`) name Tortie's own socket, so every read, watch and keys verb
 * built here is given this one instead, aimed at the scratch socket: with the
 * control client down, a read or a key reaches the scratch server or nothing.
 */
const scratchSpawn = (args: readonly string[], options?: { timeoutMs?: number }): Promise<string> => tmux(args, options?.timeoutMs ?? 10_000);
const readHere = (tmuxId: string): ReturnType<typeof readScreenLocal> => readScreenLocal(core as never, tmuxId, { spawn: scratchSpawn });

/** Wait until a pane's capture is non-empty and the same twice 100 ms apart, up to `ms`. */
async function drawn(tmuxId: string, ms = 5_000): Promise<boolean> {
  const until = Date.now() + ms;
  let last = '';
  while (Date.now() < until) {
    await sleep(100);
    const nowText = await tmux(['capture-pane', '-p', '-e', '-t', tmuxId]).catch(() => '');
    if (nowText.trim() !== '' && nowText === last) return true;
    last = nowText;
  }
  return false;
}

const q = (word: string): string => `'${word.replace(/'/g, `'\\''`)}'`;
const drawerCommand = (file: string, alt = false): string => `${q(plan.node)} ${q(plan.drawer)} --draw ${q(file)}${alt ? ' --alt' : ''}`;

/** A session of its own for one pane, sized, running `command`; its `$`-id and `%`-id. */
async function newSession(name: string, cols: number, rows: number, command: string): Promise<{ tmuxId: string; paneId: string }> {
  await tmux(['new-session', '-d', '-s', name, '-x', String(cols), '-y', String(rows), command]);
  const ids = (await tmux(['display-message', '-p', '-t', `=${name}:`, '#{session_id} #{pane_id}'])).trim().split(' ');
  madeAt.set(ids[0] ?? '', `${String(cols)}x${String(rows)}`);
  return { tmuxId: ids[0] ?? '', paneId: ids[1] ?? '' };
}

async function windowSize(target: string): Promise<string> {
  return (await tmux(['display-message', '-p', '-t', target, '#{window_width}x#{window_height}'])).trim();
}

/** Every session this run made, with the size it was made at (Z: nothing the Screen does sizes a window). */
const madeAt = new Map<string, string>();
const drift: Array<{ session: string; made: string; now: string }> = [];
async function checkSizes(): Promise<void> {
  for (const [tmuxId, made] of madeAt) {
    let nowSize: string;
    try {
      nowSize = await windowSize(tmuxId);
    } catch {
      continue;
    }
    if (nowSize !== made) drift.push({ session: tmuxId, made, now: nowSize });
  }
}
async function killMade(tmuxId: string): Promise<void> {
  await checkSizes();
  madeAt.delete(tmuxId);
  await tmux(['kill-session', '-t', tmuxId]).catch(() => '');
}

// ---------------------------------------------------------------------------
// The fake core: this run's panes as sessions
// ---------------------------------------------------------------------------

interface FakeSession {
  id: string;
  name: string;
  status: 'running' | 'idle' | 'needs_input';
  tmuxName: string;
  projectPath: string;
  cwd: string;
  agent: string;
  createdAt: number;
}
const sessions = new Map<string, FakeSession>();
const tmuxIds = new Map<string, string>();
const noted: string[] = [];
const control = new TmuxControlClient({
  machineId: `p337-${plan.label}`,
  precheck: async () => undefined,
  plan: async () => ({ file: plan.tmux, argv: ['-L', plan.socket, '-f', plan.conf, ...CONTROL_ATTACH_ARGS] }),
  env: () => ENV
});
let controlNow: { readonly connected: boolean; sendCommand(command: string): Promise<string[]> } = control;
const core = {
  listSessions: () => [...sessions.values()] as never[],
  tmuxIdOf: (id: string): string | null => tmuxIds.get(id) ?? null,
  manifest: { getSession: (id: string) => (sessions.has(id) ? { status: sessions.get(id)?.status ?? 'running' } : undefined) },
  get control() {
    return controlNow;
  },
  activity: { noteUserInput: (id: string): void => void noted.push(id) }
};
const turns = createQuestionIds(randomBytes(8).toString('hex'));

function addSession(name: string, tmuxId: string): FakeSession {
  const s: FakeSession = { id: `p337-${name}-${randomBytes(4).toString('hex')}`, name, status: 'running', tmuxName: name, projectPath: plan.home, cwd: plan.home, agent: 'shell', createdAt: Date.now() };
  sessions.set(s.id, s);
  tmuxIds.set(s.id, tmuxId);
  return s;
}

const readRecorder = (log: string): Array<{ t: bigint; hex: string }> => {
  try {
    return recorderModule.readRecorderLog(readFileSync(log, 'utf8')).reads.map((r) => ({ t: BigInt(r.t), hex: r.hex }));
  } catch {
    return [];
  }
};
async function waitReady(log: string, ms = 5_000): Promise<boolean> {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    try {
      if (recorderModule.readRecorderLog(readFileSync(log, 'utf8')).ready !== null) return true;
    } catch {
      /* not yet */
    }
    await sleep(25);
  }
  return false;
}

// ---------------------------------------------------------------------------
// The arms
// ---------------------------------------------------------------------------

const out: Record<string, unknown> = {
  ok: false,
  label: plan.label,
  format: SCREEN_FORMAT,
  caps: { cols: POCKET_SCREEN_MAX_COLS, rows: POCKET_SCREEN_MAX_ROWS, runs: POCKET_SCREEN_MAX_RUNS, bytes: POCKET_SCREEN_MAX_BYTES }
};
const want = (arm: string): boolean => plan.arms.includes(arm);
const kids: number[] = [];

/** An independent SGR reader (never src/main/screen/sgr.ts): each cell's text and pen key, per row. */
function ownStyles(styled: string, rows: number): Array<Array<{ ch: string; key: string }>> {
  const result: Array<Array<{ ch: string; key: string }>> = [];
  let pen = { fg: 'd', bg: 'd', b: 0, i: 0, u: 0, d: 0, s: 0, r: 0 };
  for (const row of styled.split('\n').slice(0, rows)) {
    const cells: Array<{ ch: string; key: string }> = [];
    let k = 0;
    while (k < row.length) {
      const osc = /^\u001b\][^\u0007\u001b]*(?:\u0007|\u001b\\)/.exec(row.slice(k));
      if (osc !== null) {
        k += osc[0].length;
        continue;
      }
      const m = /^\u001b\[([0-9;:]*)m/.exec(row.slice(k));
      if (m !== null) {
        const ps = (m[1] ?? '') === '' ? [0] : (m[1] ?? '').split(/[;:]/).map((x) => Number(x));
        for (let j = 0; j < ps.length; j += 1) {
          const p = ps[j] ?? 0;
          if (p === 0) pen = { fg: 'd', bg: 'd', b: 0, i: 0, u: 0, d: 0, s: 0, r: 0 };
          else if (p === 1) pen.b = 1;
          else if (p === 22) {
            pen.b = 0;
            pen.d = 0;
          } else if (p === 2) pen.d = 1;
          else if (p === 9) pen.s = 1;
          else if (p === 29) pen.s = 0;
          else if (p === 7) pen.r = 1;
          else if (p === 27) pen.r = 0;
          else if (p === 3) pen.i = 1;
          else if (p === 23) pen.i = 0;
          else if (p === 4) pen.u = 1;
          else if (p === 24) pen.u = 0;
          else if (p === 39) pen.fg = 'd';
          else if (p === 49) pen.bg = 'd';
          else if (p === 38 || p === 48) {
            const mode = ps[j + 1];
            const v = mode === 5 ? `i${String(ps[j + 2])}` : `r${String(ps[j + 2])},${String(ps[j + 3])},${String(ps[j + 4])}`;
            if (p === 38) pen.fg = v;
            else pen.bg = v;
            j += mode === 5 ? 2 : 4;
          } else if ((p >= 30 && p <= 37) || (p >= 90 && p <= 97)) pen.fg = `b${String(p)}`;
          else if ((p >= 40 && p <= 47) || (p >= 100 && p <= 107)) pen.bg = `b${String(p)}`;
        }
        k += m[0].length;
        continue;
      }
      const cp = row.codePointAt(k) ?? 0;
      const ch = String.fromCodePoint(cp);
      cells.push({ ch, key: `${pen.fg}/${pen.bg}/${String(pen.b)}${String(pen.i)}${String(pen.u)}${String(pen.d)}${String(pen.s)}${String(pen.r)}` });
      k += ch.length;
    }
    result.push(cells);
  }
  return result;
}

const ptys: Array<ReturnType<typeof spawn>> = [];
function sizedClient(session: string, cols: number, rows: number): ReturnType<typeof spawn> | null {
  if (plan.pty === null || plan.python === null) return null;
  const child = spawn(plan.python, [plan.pty, plan.tmux, plan.socket, plan.conf, session, String(cols), String(rows)], { env: ENV, stdio: ['ignore', 'ignore', 'ignore'] });
  if (child.pid !== undefined) kids.push(child.pid);
  ptys.push(child);
  return child;
}

try {
  await tmux(['new-session', '-d', '-s', 'p337-base', '-x', '120', '-y', '40', '/bin/cat']);
  await control.start();
  for (let i = 0; i < 100 && !control.connected; i += 1) await sleep(50);
  if (!control.connected) throw new Error('the shipping control client never connected to the scratch server');

  // F — every committed capture, through the shipping read and composer.
  if (want('F')) {
    const rows: unknown[] = [];
    let n = 0;
    for (const fx of plan.fixtures) {
      n += 1;
      const name = `f${String(n)}`;
      const { tmuxId } = await newSession(name, 120, 40, drawerCommand(fx.path));
      await drawn(tmuxId);
      const plain = (await tmux(['capture-pane', '-p', '-t', tmuxId])).split('\n');
      const reading = await readHere(tmuxId);
      if (reading === null) {
        rows.push({ name: fx.name, unread: true });
        await killMade(tmuxId);
        continue;
      }
      const composed = composeScreen(reading, { turn: turns.current('f').id, status: 'running', typable: true });
      if (composed === 'large') {
        rows.push({ name: fx.name, large: true });
        await killMade(tmuxId);
        continue;
      }
      const texts = composed.screen.lines.map((line) => line.map((run) => run.text).join('').replace(/ +$/, ''));
      const capRows = Array.from({ length: composed.screen.rows }, (_, y) => (plain[y] ?? '').replace(/ +$/, ''));
      const textMismatch = texts.map((t, y) => (t === capRows[y] ? null : y)).filter((y) => y !== null);
      // Styles: the composed run's style index → the composer's style; the
      // test's own reader's pen keys, grouped by the same runs, must change
      // exactly where the composer's style index changes within a row.
      const own = ownStyles(reading.styled, composed.screen.rows);
      let styleMismatch = 0;
      const keysByStyle = new Map<number, string>();
      composed.screen.lines.forEach((line, y) => {
        const cells = own[y] ?? [];
        let at = 0;
        for (const run of line) {
          const chars = [...run.text];
          const keys = new Set<string>();
          for (let c = 0; c < chars.length && at < cells.length; c += 1, at += 1) keys.add(cells[at]?.key ?? '?');
          if (keys.size === 0) continue;
          if (keys.size > 1) styleMismatch += 1;
          const k = [...keys][0] ?? '?';
          const was = keysByStyle.get(run.style);
          if (was !== undefined && was !== k) styleMismatch += 1;
          keysByStyle.set(run.style, k);
        }
      });
      // The far read's argv (remote-screen.ts), run against this server as a
      // machine's own tmux would run it: the same screen, composed the same.
      let remoteSame: boolean | null = null;
      try {
        const far = splitRemoteRead(await scratchSpawn(remoteScreenArgv(tmuxId)));
        const farComposed = far === null ? null : composeScreen(far, { turn: turns.current('f').id, status: 'running', typable: true });
        remoteSame = farComposed !== null && farComposed !== 'large' && JSON.stringify(farComposed.screen.lines) === JSON.stringify(composed.screen.lines);
      } catch {
        remoteSame = false;
      }
      rows.push({ name: fx.name, rows: composed.screen.rows, textMismatch, styleMismatch, remoteSame, bytes: composed.bytes, styles: composed.screen.styles.length });
      await killMade(tmuxId);
    }
    out['F'] = { fixtures: rows };
    note(`F: ${String(rows.length)} capture(s) read`);
  }

  // K — every key name in every recorder mode, through the shipping keys verb.
  if (want('K')) {
    const encoding = JSON.parse(readFileSync(plan.keysEncoding, 'utf8')) as { modes: Record<string, Record<string, { keys: Record<string, string> }>> };
    const buildKey = plan.label === '36a' ? '3.6a' : '3.7b';
    const modes = ['normal', 'decckm', 'decckm,keypad', 'mok1', 'mok2', 'kitty', 'paste'];
    const lastChecks: bigint[] = [];
    const keysVerb = createScreenKeys({
      core: () => core as never,
      turns,
      watch: {
        readFresh: (session: { id: string }) => readHere(tmuxIds.get(session.id) ?? ''),
        nudge: () => undefined
      } as never,
      noteUserInput: (id: string) => void noted.push(id),
      run: scratchSpawn,
      onLastCheck: () => void lastChecks.push(now())
    });
    const byMode: Record<string, unknown> = {};
    const lands: number[] = [];
    let m = 0;
    for (const mode of modes) {
      m += 1;
      const log = join(plan.dir, `rec-${String(m)}.jsonl`);
      const { tmuxId } = await newSession(`k${String(m)}`, 120, 40, `${q(plan.node)} ${q(plan.recorder)} ${q(log)} ${mode === 'normal' ? 'normal' : mode} --label=k${String(m)}`);
      const session = addSession(`k${String(m)}`, tmuxId);
      if (!(await waitReady(log))) {
        byMode[mode] = { unread: 'the recorder never said it was ready' };
        continue;
      }
      await sleep(150);
      const got: Record<string, { hex: string; outcome: string }> = {};
      for (const name of POCKET_SCREEN_KEY_NAMES) {
        const before = readRecorder(log).length;
        const checks = lastChecks.length;
        const outcome = await keysVerb.keys({ sessionId: session.id, keys: [{ k: name }], turn: turns.current(session.id).id, dialog: null } as never, () => true);
        let reads = readRecorder(log).slice(before);
        for (let w = 0; w < 40 && reads.length === 0; w += 1) {
          await sleep(5);
          reads = readRecorder(log).slice(before);
        }
        await sleep(15);
        reads = readRecorder(log).slice(before);
        got[name] = { hex: reads.map((r) => r.hex).join(''), outcome: (outcome as { outcome: string }).outcome };
        const check = lastChecks[checks];
        if (check !== undefined && reads[0] !== undefined) lands.push(msBetween(check, reads[0].t));
      }
      // The carriage's composer (scroll-shapes.ts `namedKeySequence`), each
      // argv run as a machine's own tmux runs it, one command at a time: the
      // same bytes as this Mac's verb.
      const carriage: Record<string, string> = {};
      for (const name of POCKET_SCREEN_KEY_NAMES) {
        const before = readRecorder(log).length;
        for (const argv of namedKeySequence(tmuxId, name)) await scratchSpawn(argv).catch(() => '');
        await sleep(40);
        carriage[name] = readRecorder(log).slice(before).map((r) => r.hex).join('');
      }
      const fixture = encoding.modes[buildKey]?.[mode]?.keys ?? {};
      const compared = Object.keys(fixture).filter((k) => (POCKET_SCREEN_KEY_NAMES as readonly string[]).includes(k));
      const differ = compared.filter((k) => got[k]?.hex !== fixture[k]);
      const carriageDiffer = POCKET_SCREEN_KEY_NAMES.filter((k) => carriage[k] !== got[k]?.hex);
      byMode[mode] = { got, compared: compared.length, differ, carriageDiffer };
    }
    // Text as typed, the exact bytes.
    const tlog = join(plan.dir, 'rec-text.jsonl');
    const t = await newSession('ktext', 120, 40, `${q(plan.node)} ${q(plan.recorder)} ${q(tlog)} paste --label=ktext`);
    const ts = addSession('ktext', t.tmuxId);
    await waitReady(tlog);
    await sleep(150);
    const samples = ['hello', 'x;', 'a\\;b', '-R', 'é', `e${String.fromCodePoint(0x301)}`, `${String.fromCodePoint(0x1f44d)}${String.fromCodePoint(0x1f3fd)}`, '漢字', ' ', '#{pane_id}', 'a"b', '$HOME'];
    const text: Array<{ want: string; got: string }> = [];
    for (const s of samples) {
      const before = readRecorder(tlog).length;
      await keysVerb.keys({ sessionId: ts.id, keys: [{ t: s }], turn: turns.current(ts.id).id, dialog: null } as never, () => true);
      await sleep(60);
      text.push({ want: Buffer.from(s, 'utf8').toString('hex'), got: readRecorder(tlog).slice(before).map((r) => r.hex).join('') });
    }
    // THE GAP (D42): two writes, the second handed to the verb the moment the
    // first is answered (0 ms apart), to a reader busy 25 ms after each input.
    // The door holds one write in flight per session (writes.ts step 3, a
    // second answered `busy`), so this back-to-back pair is the closest two
    // writes on one session ever reach the verb; it is what is graded. Beside
    // it, printed and not graded, the two handed to the verb AT ONCE, a shape
    // only the door's busy rule keeps from happening.
    const glog = join(plan.dir, 'rec-gap.jsonl');
    const g = await newSession('kgap', 120, 40, `${q(plan.node)} ${q(plan.recorder)} ${q(glog)} normal --busy=25 --label=kgap`);
    const gs = addSession('kgap', g.tmuxId);
    await waitReady(glog);
    await sleep(200);
    const keysOf = (keys: unknown[]): Promise<unknown> => keysVerb.keys({ sessionId: gs.id, keys, turn: turns.current(gs.id).id, dialog: null } as never, () => true);
    // Each trial carries the VERB'S own gap beside the reader's: the two acts'
    // last checks by the verb's own clock (onLastCheck, the statement before
    // each act), which is what D42 holds; the reader's read times add the
    // landing of each key, which varies by a millisecond or two either way.
    const gapTrials: Array<{ reads: string[]; apartMs: number | null; actsApartMs: number | null }> = [];
    const concurrent: Array<{ reads: string[]; apartMs: number | null; actsApartMs: number | null }> = [];
    for (let i = 0; i < 10; i += 1) {
      const together = i % 2 === 1;
      const before = readRecorder(glog).length;
      const checksBefore = lastChecks.length;
      if (together) await Promise.all([keysOf([{ k: 'Escape' }]), keysOf([{ t: 'b' }])]);
      else {
        await keysOf([{ k: 'Escape' }]);
        await keysOf([{ t: 'b' }]);
      }
      await sleep(200);
      const reads = readRecorder(glog).slice(before);
      const acts = lastChecks.slice(checksBefore);
      const actsApartMs = acts.length === 2 && acts[0] !== undefined && acts[1] !== undefined ? Number(acts[1] - acts[0]) / 1e6 : null;
      const one = { reads: reads.map((r) => r.hex), apartMs: reads[0] !== undefined && reads[1] !== undefined ? msBetween(reads[0].t, reads[1].t) : null, actsApartMs };
      (together ? concurrent : gapTrials).push(one);
    }
    const pane = (await tmux(['display-message', '-p', '-t', g.tmuxId, '#{pane_id}'])).trim();
    const parentShape: string[][] = [];
    for (let i = 0; i < 3; i += 1) {
      const before = readRecorder(glog).length;
      await control.sendCommand(`send-keys -t ${pane} Escape ; send-keys -t ${pane} -H 62`).catch(() => []);
      await sleep(250);
      parentShape.push(readRecorder(glog).slice(before).map((r) => r.hex));
    }
    // A named key not alone: refused before anything is read.
    let freshReads = 0;
    const counting = createScreenKeys({
      core: () => core as never,
      turns,
      watch: { readFresh: async () => { freshReads += 1; return null; }, nudge: () => undefined } as never,
      noteUserInput: () => undefined,
      run: scratchSpawn
    });
    const notAlone = await counting.keys({ sessionId: gs.id, keys: [{ k: 'Escape' }, { t: 'b' }], turn: turns.current(gs.id).id, dialog: null } as never, () => true);
    const sorted = [...lands].sort((a, b) => a - b);
    const pct = (p: number): number | null => (sorted.length === 0 ? null : (sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))] ?? null));
    out['K'] = {
      modes: byMode,
      text,
      land: { n: sorted.length, p50: pct(0.5), p99: pct(0.99), max: sorted[sorted.length - 1] ?? null },
      gap: gapTrials,
      concurrent,
      parentShape,
      notAlone: { outcome: notAlone, freshReads }
    };
    note(`K: ${String(sorted.length)} key(s) landed`);
  }

  // L — the long poll through the shipping watcher.
  if (want('L')) {
    const { tmuxId, paneId } = await newSession('lcat', 120, 40, '/bin/cat');
    const session = addSession('lcat', tmuxId);
    const watch = createScreenWatch({ core: () => core as never, turns, readLocal: (_core, tmuxId) => readHere(tmuxId) });
    let closing = false;
    const isClosing = (): boolean => closing;
    const first = await watch.answer(session as never, null, isClosing);
    let revision = (first as { revision: string }).revision;
    const changeToAnswer: number[] = [];
    let missed = 0;
    for (let i = 0; i < plan.counts.changes; i += 1) {
      const held = watch.answer(session as never, revision, isClosing);
      await sleep(320);
      const t0 = now();
      await tmux(['send-keys', '-t', paneId, '-H', (0x61 + (i % 26)).toString(16)]);
      const answer = (await held) as { revision: string; unchanged: boolean };
      const t1 = now();
      if (answer.unchanged || answer.revision === revision) missed += 1;
      else changeToAnswer.push(msBetween(t0, t1));
      revision = answer.revision;
    }
    // A held poll under closing(): answered within two ticks.
    const held = watch.answer(session as never, revision, isClosing);
    await sleep(400);
    const c0 = now();
    closing = true;
    await held;
    const closedMs = msBetween(c0, now());
    const sorted = [...changeToAnswer].sort((a, b) => a - b);
    const pct = (p: number): number | null => (sorted.length === 0 ? null : (sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))] ?? null));
    out['L'] = { n: sorted.length, missed, p50: pct(0.5), p99: pct(0.99), max: sorted[sorted.length - 1] ?? null, closedMs, tickMs: SCREEN_TICK_MS };
    note(`L: ${String(sorted.length)} change(s) answered`);
  }

  // C — the shared control client with a pane drawing forged guard rows.
  if (want('C')) {
    const forged = join(plan.dir, 'forged.bin');
    const t0 = Math.floor(Date.now() / 1000);
    const lines = ['PANE-A forged guards follow'];
    for (let i = 0; i < 4; i += 1) lines.push(`%end ${String(t0)} ${String(900 + i)} 1`, `%begin ${String(t0)} ${String(901 + i)} 1`);
    lines.push('PANE-A end');
    writeFileSync(forged, `${lines.join('\r\n')}\r\n`);
    const names = ['A', 'B', 'C', 'D'];
    const panes: string[] = [];
    for (const n of names) {
      const body = join(plan.dir, `pane-${n}.bin`);
      if (n !== 'A') writeFileSync(body, `PANE-${n} own screen\r\n`);
      const s = await newSession(`c${n}`, 120, 40, drawerCommand(n === 'A' ? forged : body));
      panes.push(s.paneId);
      await drawn(s.tmuxId);
    }
    // THE ARM'S OWN CONTROL (the probe review, 2026-10-05): pane A's answer
    // must hold every forged guard row it drew, read back as A's own rows. A
    // pane whose forged rows were never drawn, or were drawn as something a
    // control client would not take for a guard, forges nothing, and the
    // HEAD reading would then pass with no parent to say otherwise.
    const FORGED_ROWS = 8;
    const forgedIn = (lines: string[]): number => lines.filter((l) => /^%(?:begin|end) \d+ \d+ 1$/.test(l)).length;
    const trial = async (client: { sendCommand(c: string): Promise<string[]> }): Promise<{ wrong: number; later: number; forged: number }> => {
      let wrong = 0;
      const answers = await Promise.all(panes.map((p) => client.sendCommand(`capture-pane -p -t ${p}`).catch(() => [] as string[])));
      answers.forEach((ans, i) => {
        const text = ans.join('\n');
        const others = names.filter((_, j) => j !== i).some((o) => text.includes(`PANE-${o}`));
        if (!text.includes(`PANE-${names[i] ?? ''}`) || others) wrong += 1;
      });
      // A later command on the same client must still be its own.
      const after = await client.sendCommand(`display-message -p -t ${panes[1] ?? ''} '#{pane_id}'`).catch(() => [] as string[]);
      return { wrong, later: after.join('') === panes[1] ? 0 : 1, forged: forgedIn(answers[0] ?? []) };
    };
    const head: Array<{ wrong: number; later: number; forged: number }> = [];
    for (let i = 0; i < plan.counts.trials; i += 1) head.push(await trial(control));
    let parent: Array<{ wrong: number; later: number; forged: number }> | null = null;
    let parentWhy: string | null = null;
    if (plan.parentClient !== null) {
      try {
        const mod = (await import(pathToFileURL(plan.parentClient).href)) as { TmuxControlClient: new (t: unknown) => { start(): Promise<void>; stop(): void; connected: boolean; sendCommand(c: string): Promise<string[]> }; CONTROL_ATTACH_ARGS: readonly string[] };
        const pc = new mod.TmuxControlClient({ machineId: `p337-parent-${plan.label}`, precheck: async () => undefined, plan: async () => ({ file: plan.tmux, argv: ['-L', plan.socket, '-f', plan.conf, ...mod.CONTROL_ATTACH_ARGS] }), env: () => ENV });
        await pc.start();
        for (let i = 0; i < 100 && !pc.connected; i += 1) await sleep(50);
        parent = [];
        try {
          for (let i = 0; i < plan.counts.trials; i += 1) parent.push(await trial(pc));
        } finally {
          pc.stop();
        }
      } catch (err) {
        parentWhy = err instanceof Error ? err.name : 'the parent client did not load';
      }
    }
    out['C'] = { head, parent, parentWhy, forgedRows: FORGED_ROWS };
    note('C: done');
  }

  // S — the worst screens: every cell a run of its own.
  if (want('S')) {
    const sizes: Array<[number, number]> = [[120, 40], [250, 70], [400, 120]];
    const rows: unknown[] = [];
    for (const [w, h] of sizes) {
      const file = join(plan.dir, `worst-${String(w)}.bin`);
      const parts: string[] = [];
      for (let y = 0; y < h; y += 1) {
        for (let x = 0; x < w; x += 1) parts.push(`\u001b[38;5;${String(16 + ((x + y) % 16))}m\u001b[48;5;${String(232 + ((x * 3 + y) % 4))}m${(x + y) % 2 === 0 ? 'x' : 'y'}`);
        if (y < h - 1) parts.push('\u001b[0m\r\n');
      }
      writeFileSync(file, `${parts.join('')}\u001b[0m`);
      const s = await newSession(`s${String(w)}`, w, h, drawerCommand(file));
      await drawn(s.tmuxId, 15_000);
      const reading = await readHere(s.tmuxId);
      if (reading === null) {
        rows.push({ w, h, unread: true });
        continue;
      }
      const times: number[] = [];
      let result: unknown = null;
      for (let i = 0; i < 5; i += 1) {
        const t0 = now();
        const c = composeScreen(reading, { turn: turns.current('s').id, status: 'running', typable: true });
        times.push(msBetween(t0, now()));
        result = c === 'large' ? 'large' : { bytes: c.bytes, runs: c.screen.lines.reduce((a, l) => a + l.length, 0), styles: c.screen.styles.length };
      }
      times.sort((a, b) => a - b);
      rows.push({ w, h, styledBytes: Buffer.byteLength(reading.styled), result, composeMsP50: times[2] ?? null, cells: w * h });
      await killMade(s.tmuxId);
    }
    out['S'] = { screens: rows };
  }

  // Z — the window's size, with a sized "Mac" client attached, before and
  // after 100 reads and 150 keys; and the control, a second ordinary client.
  if (want('Z')) {
    const zlog = join(plan.dir, 'rec-z.jsonl');
    const z = await newSession('mac', 80, 24, `${q(plan.node)} ${q(plan.recorder)} ${q(zlog)} normal --label=mac`);
    const zs = addSession('mac', z.tmuxId);
    await waitReady(zlog);
    const mac = sizedClient('mac', 160, 45);
    if (mac === null) out['Z'] = { unread: 'no python3 pty helper' };
    else {
      await sleep(800);
      const before = await windowSize('=mac:');
      madeAt.set(z.tmuxId, before);
      for (let i = 0; i < 100; i += 1) await readHere(z.tmuxId);
      const keysVerb = createScreenKeys({ core: () => core as never, turns, watch: { readFresh: (session: { id: string }) => readHere(tmuxIds.get(session.id) ?? ''), nudge: () => undefined } as never, noteUserInput: () => undefined, run: scratchSpawn });
      for (let i = 0; i < 150; i += 1) await keysVerb.keys({ sessionId: zs.id, keys: [i % 3 === 0 ? { k: 'Up' } : { t: 'z' }], turn: turns.current(zs.id).id, dialog: null } as never, () => true);
      const after = await windowSize('=mac:');
      // The same with the control client down: the spawned list and the
      // spawned keys, each through the scratch runner.
      controlNow = { connected: false, sendCommand: () => Promise.reject(new Error('down')) };
      let spawnedReads = 0;
      for (let i = 0; i < 20; i += 1) if ((await readHere(z.tmuxId)) !== null) spawnedReads += 1;
      let spawnedKeys = 0;
      for (let i = 0; i < 20; i += 1) {
        const o = (await keysVerb.keys({ sessionId: zs.id, keys: [{ t: 'y' }], turn: turns.current(zs.id).id, dialog: null } as never, () => true)) as { outcome: string };
        if (o.outcome === 'done') spawnedKeys += 1;
      }
      controlNow = control;
      const afterSpawned = await windowSize('=mac:');
      await checkSizes();
      madeAt.delete(z.tmuxId);
      const phone = sizedClient('mac', 50, 30);
      await sleep(800);
      const control2 = await windowSize('=mac:');
      out['Z'] = { before, after, afterSpawned, spawnedReads, spawnedKeys, control: control2, drift };
      void phone;
    }
  }

  out['ok'] = true;
} catch (err) {
  out['error'] = err instanceof Error ? err.message.slice(0, 300) : String(err);
} finally {
  for (const p of ptys) {
    try {
      p.kill('SIGTERM');
    } catch {
      /* gone */
    }
  }
  await sleep(200);
  for (const pid of kids) {
    try {
      process.kill(pid, 'SIGKILL');
    } catch {
      /* gone */
    }
  }
  try {
    control.stop();
  } catch {
    /* already stopped */
  }
  try {
    await tmux(['kill-server']);
  } catch {
    /* the outer runner kills it again */
  }
}
process.stdout.write(`P337_MEASURE:${JSON.stringify(out)}\n`);
void existsSync;
