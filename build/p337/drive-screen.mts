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
 *
 * PHASE 337.1 (build/p3371/SPEC.md §7.6) adds arms H1 to H6, D and DS: the
 * SHIPPING page reader (src/main/screen/scrollback.ts `createScreenScrollback`)
 * paging histories build/p3371/history-stand-in.mjs draws, over the same fake
 * core and the same shipping control client. Its statements reach the scratch
 * server and nothing else: every reader here is handed a core whose client
 * says it is connected and refuses a statement while the shipping client is
 * down, so the reader's own down path (a spawned `execTmux`, which names
 * Tortie's socket) is never taken, and a refused statement is counted; the
 * three wrappers this file puts around the client (a 10 ms delay before each
 * statement for H3's oldest pages, a recorder of statement starts for H5, and
 * a second client's pane switch for D) forward to it alone.
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
  /** Phase 337.1: build/p3371/history-stand-in.mjs, the history every H, D and DS arm draws. */
  standIn: string;
  /** Phase 337.1 arm H2: the committed captures stacked by provider (measure-screen.mjs `h2Groups`). */
  groups: Record<string, string[]>;
  /** Phase 337.1 counts: pages each rate of H3 must reach, and each oldest-end trial count. */
  history: { pages: number; oldest: number; matrixLines: number; floodWaveSessions: number; rateSessions: number; timeCapMs: number };
  /** P337_PARENT_CHECKOUT's src/main/screen/compose.ts, read for arm DS's printed parent line, or null. */
  parentCompose: string | null;
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

/**
 * The measure's own SGR reader and its run comparison (never
 * src/main/screen/sgr.ts), one spelling shared with measure-screen.mjs's
 * graders and probe:p337's SB1.
 */
const { ownStyles, runsAgainstOwn } = (await import(pathToFileURL(plan.drawer).href)) as {
  ownStyles(styled: string, rows: number): Array<Array<{ ch: string; key: string }>>;
  runsAgainstOwn(lines: ReadonlyArray<ReadonlyArray<{ text: string; style: number }>>, own: Array<Array<{ ch: string; key: string }>>): number;
};

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
      const styleMismatch = runsAgainstOwn(composed.screen.lines, ownStyles(reading.styled, composed.screen.rows));
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

  // ---------------------------------------------------------------------------
  // PHASE 337.1 — arms H1 to H6, D and DS (build/p3371/SPEC.md §7.6)
  // ---------------------------------------------------------------------------
  const HISTORY_ARMS = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'D', 'DS'];
  if (HISTORY_ARMS.some(want)) {
    const stand = (await import(pathToFileURL(plan.standIn).href)) as {
      lineOf(n: number, o?: { prefix?: string; width?: number }): string;
      numberOf(row: string): { prefix: string; n: number } | null;
    };
    const standIn = (args: string): string => `${q(plan.node)} ${q(plan.standIn)} ${args}`;
    const textOf = (row: ReadonlyArray<{ text: string }>): string => row.map((r) => r.text).join('').replace(/ +$/, '');
    const historyOf = async (target: string): Promise<number | null> => {
      const t = (await tmux(['display-message', '-p', '-t', target, '#{history_size}']).catch(() => '')).trim();
      return /^\d+$/.test(t) ? Number(t) : null;
    };
    /** The history size once it reads the same three times 150 ms apart. */
    const settleHistory = async (target: string, ms = 20_000): Promise<number | null> => {
      const until = Date.now() + ms;
      let last = -1;
      let same = 0;
      while (Date.now() < until) {
        await sleep(150);
        const h = await historyOf(target);
        if (h === null) continue;
        if (h === last) {
          same += 1;
          if (same >= 3) return h;
        } else {
          same = 0;
          last = h;
        }
      }
      return historyOf(target);
    };
    const pct = (xs: number[], p: number): number | null => {
      const s = [...xs].sort((a, b) => a - b);
      return s.length === 0 ? null : (s[Math.min(s.length - 1, Math.max(0, Math.ceil(p * s.length) - 1))] ?? null);
    };

    // The SHIPPING page reader, and the module's constants, or why not.
    type Run = { text: string; style: number; cells: number };
    type Page = { from: number | null; depth: number | null; wrap: number | null; space: string | null; styles: unknown[]; rows: Run[][]; why: string | null; sentence: string | null };
    type Ask = { from: number; count: number; depth: number; wrap: number; keep: 'top' | 'bottom' };
    interface Ctl {
      readonly connected: boolean;
      sendCommand(command: string): Promise<string[]>;
    }
    interface ScrollbackModule {
      createScreenScrollback(deps: { core(): unknown }): { page(session: unknown, ask: Ask, closing: () => boolean): Promise<Page> };
      SCROLLBACK_MIN_GAP_MS: number;
      SCROLLBACK_OVERSCAN: number;
    }
    let sb: ScrollbackModule | null = null;
    let sbWhy = '';
    try {
      sb = (await import('../../src/main/screen/scrollback.js')) as unknown as ScrollbackModule;
      if (typeof sb?.createScreenScrollback !== 'function') {
        sbWhy = 'src/main/screen/scrollback.ts exports no createScreenScrollback';
        sb = null;
      }
    } catch (err) {
      sbWhy = `src/main/screen/scrollback.ts did not load: ${err instanceof Error ? err.message.slice(0, 200) : String(err)}`;
    }
    const composeModule = (await import('../../src/main/screen/compose.js')) as unknown as {
      composePage?(styled: string, firstLine: number, cols: number, want: { from: number; count: number; keep: 'top' | 'bottom' }): unknown;
    };
    const watchModule = (await import('../../src/main/screen/watch.js')) as unknown as { SCREEN_DUTY_FACTOR: number };
    out['historyConstants'] = sb === null ? { unread: sbWhy } : { floorMs: sb.SCROLLBACK_MIN_GAP_MS, overscan: sb.SCROLLBACK_OVERSCAN, dutyFactor: watchModule.SCREEN_DUTY_FACTOR };

    /** A core whose control client is `ctl`: the fake core's sessions, ids and manifest, nothing else. */
    const coreWith = (ctl: Ctl): unknown => ({
      listSessions: core.listSessions,
      tmuxIdOf: core.tmuxIdOf,
      manifest: core.manifest,
      get control() {
        return ctl;
      },
      activity: core.activity
    });
    /**
     * THE ONE GUARD every page here passes. The reader's production down path
     * spawns `execTmux`, which names Tortie's own socket, so every reader here
     * is handed a core whose control client SAYS it is connected and refuses a
     * statement while the shipping client is down: the shipping round always
     * takes its control-client path, which reaches the scratch server alone,
     * and a refused statement is counted (a page asked while the client is
     * down is not asked at all, and counted the same).
     */
    let refusedDown = 0;
    const upControl: Ctl = {
      get connected() {
        return true;
      },
      sendCommand(command: string): Promise<string[]> {
        if (!control.connected) {
          refusedDown += 1;
          return Promise.reject(new Error('the scratch control client is down'));
        }
        return control.sendCommand(command);
      }
    };
    const pageVia = async (pager: { page(session: unknown, ask: Ask, closing: () => boolean): Promise<Page> }, session: FakeSession, ask: Ask): Promise<{ page: Page | null; ms: number }> => {
      if (!control.connected) {
        refusedDown += 1;
        return { page: null, ms: 0 };
      }
      const t0 = now();
      const page = await pager.page(session, ask, () => false);
      return { page, ms: msBetween(t0, now()) };
    };
    /** A 10 ms wait before each STATEMENT, as a far machine's round trip (§Attack B1): one wait for every command written in one tick. */
    const delayed = (real: Ctl, ms: number): Ctl => {
      let gate: Promise<void> | null = null;
      return {
        get connected() {
          return real.connected;
        },
        sendCommand(command: string): Promise<string[]> {
          if (gate === null) {
            gate = sleep(ms);
            queueMicrotask(() => {
              gate = null;
            });
          }
          return gate.then(() => real.sendCommand(command));
        }
      };
    };
    const freshSession = async (name: string, args: string, cols = 120, rows = 40): Promise<{ tmuxId: string; paneId: string; session: FakeSession }> => {
      const made = await newSession(name, cols, rows, standIn(args));
      return { ...made, session: addSession(name, made.tmuxId) };
    };
    /** A live picture through the SHIPPING read and composer: its depth, space and first row's text, or null. */
    const picture = async (tmuxId: string): Promise<{ depth: number | null; space: string | null; cols: number; row0: string; alternate: boolean } | null> => {
      const reading = await readHere(tmuxId);
      if (reading === null) return null;
      const c = composeScreen(reading, { turn: turns.current('h').id, status: 'running', typable: true });
      if (c === 'large') return null;
      const screen = c.screen as unknown as { depth?: number | null; space?: string | null; cols: number; alternate: boolean; lines: Run[][] };
      return { depth: screen.depth ?? null, space: screen.space ?? null, cols: screen.cols, row0: textOf(screen.lines[0] ?? []), alternate: screen.alternate };
    };
    const unread = (id: string): void => {
      out[id] = { unread: sbWhy };
    };

    // H1 — 3,000 numbered lines, every page of 100 by index.
    if (want('H1')) {
      if (sb === null) unread('H1');
      else {
        const pager = sb.createScreenScrollback({ core: () => coreWith(upControl) });
        const s = await freshSession('h1', '--lines 3000 --width 100');
        const h = await settleHistory(s.tmuxId);
        const wrong: number[] = [];
        const unserved: Array<{ from: number; why: string | null }> = [];
        let pages = 0;
        let served = 0;
        const asked: number[] = [];
        if (h !== null) {
          for (let from = 0; from < h; from += 100) {
            const count = Math.min(100, h - from);
            pages += 1;
            asked.push(from);
            const { page } = await pageVia(pager, s.session, { from, count, depth: h, wrap: 120, keep: 'bottom' });
            if (page === null || page.why !== null) {
              unserved.push({ from, why: page?.why ?? 'not asked' });
              continue;
            }
            served += 1;
            const ok = page.from === from && page.rows.length === count && page.rows.every((row, k) => textOf(row) === stand.lineOf(from + k + 1, { width: 100 }).replace(/ +$/, ''));
            if (!ok) wrong.push(from);
          }
        }
        out['H1'] = { history: h, pages, served, wrong, unserved, asked: { first: asked[0] ?? null, last: asked[asked.length - 1] ?? null, n: asked.length } };
        await killMade(s.tmuxId);
        note(`H1: ${String(served)} of ${String(pages)} page(s) served`);
      }
    }

    // H2 — the matrix: every provider's committed captures stacked, the whole history paged.
    if (want('H2')) {
      if (sb === null) unread('H2');
      else {
        const pager = sb.createScreenScrollback({ core: () => coreWith(upControl) });
        const groups: unknown[] = [];
        let g = 0;
        for (const [group, files] of Object.entries(plan.groups)) {
          g += 1;
          if (files.length === 0) {
            groups.push({ group, files: 0, history: null });
            continue;
          }
          // Enough copies of the group's captures for a history of at least plan.history.matrixLines.
          const perPass = files.reduce((n, f) => {
            try {
              return n + readFileSync(f, 'latin1').split('\n').length;
            } catch {
              return n;
            }
          }, 0);
          // A quarter more than the files' own line count: the first live run (2026-10-06) stacked five
          // groups 2 to 4 percent short of the floor, because a capture's last line joins the next file's first.
          const reps = Math.max(1, Math.ceil((plan.history.matrixLines * 1.25 + 40) / Math.max(1, perPass)));
          const list = join(plan.dir, `h2-${String(g)}.txt`);
          writeFileSync(list, `${Array.from({ length: reps }, () => files).flat().join('\n')}\n`);
          const s = await freshSession(`h2-${String(g)}`, `--stack ${q(list)}`);
          const h = await settleHistory(s.tmuxId, 30_000);
          let pages = 0;
          let rowsCompared = 0;
          let textMismatch = 0;
          let styleMismatch = 0;
          let cut = 0;
          const unserved: Array<{ from: number; why: string | null }> = [];
          const firstMismatch: unknown[] = [];
          if (h !== null && h > 0) {
            for (let from = 0; from < h; ) {
              const count = Math.min(100, h - from);
              pages += 1;
              const { page } = await pageVia(pager, s.session, { from, count, depth: h, wrap: 120, keep: 'top' });
              if (page === null || page.why !== null || page.from === null || page.depth === null || page.rows.length === 0) {
                unserved.push({ from, why: page?.why ?? 'not asked' });
                from += count;
                continue;
              }
              if (page.rows.length < count) cut += 1;
              const lo = page.from - page.depth;
              const hi = page.from + page.rows.length - 1 - page.depth;
              const plainRows = (await tmux(['capture-pane', '-p', '-t', s.tmuxId, '-S', String(lo), '-E', String(hi)])).split('\n');
              const styled = (await tmux(['capture-pane', '-p', '-e', '-t', s.tmuxId, '-S', String(lo), '-E', String(hi)])).replace(/\n$/, '');
              styleMismatch += runsAgainstOwn(page.rows, ownStyles(styled, page.rows.length));
              page.rows.forEach((row, k) => {
                rowsCompared += 1;
                const mine = textOf(row);
                const theirs = (plainRows[k] ?? '').replace(/ +$/, '');
                if (mine !== theirs) {
                  textMismatch += 1;
                  if (firstMismatch.length < 3) firstMismatch.push({ group, index: (page.from ?? 0) + k });
                }
              });
              from = page.from + page.rows.length;
            }
          }
          groups.push({ group, files: files.length, history: h, pages, rowsCompared, textMismatch, styleMismatch, cut, unserved: unserved.slice(0, 5), unservedN: unserved.length, firstMismatch });
          await killMade(s.tmuxId);
        }
        out['H2'] = { groups };
        note(`H2: ${String(groups.length)} group(s) paged`);
      }
    }

    // H3 — while output scrolls: the phone's depth read 300 ms before each page.
    if (want('H3')) {
      if (sb === null) unread('H3');
      else {
        await tmux(['set-option', '-g', 'history-limit', '100000']);
        const pager = sb.createScreenScrollback({ core: () => coreWith(upControl) });
        const STALE_MS = 300;
        const oneTrial = async (s: { tmuxId: string; session: FakeSession }, tally: { n: number; served: number; busy: number; moved: number; other: number; wrong: number; rest: number; ms: number[]; nulls: number }, opts: { from: (depth: number) => number; scrolling: boolean; pagerOf: typeof pager }): Promise<void> => {
          const pic = await picture(s.tmuxId);
          if (pic === null || pic.depth === null) {
            tally.nulls += 1;
            await sleep(20);
            return;
          }
          if (pic.depth < 300) {
            await sleep(50);
            return;
          }
          await sleep(STALE_MS);
          const from = opts.from(pic.depth);
          const { page, ms } = await pageVia(opts.pagerOf, s.session, { from, count: 100, depth: pic.depth, wrap: pic.cols, keep: 'bottom' });
          if (page === null) return;
          // A page counts as asked WHILE OUTPUT SCROLLED when lines arrived between the phone's depth and the page.
          const scrolled = page.depth !== null && page.depth > pic.depth;
          if (opts.scrolling && !scrolled) {
            tally.rest += 1;
            if (page.why === null && !(page.from === from && page.rows.length === 100 && page.rows.every((row, k) => stand.numberOf(textOf(row))?.n === from + k + 1))) tally.wrong += 1;
            return;
          }
          tally.n += 1;
          tally.ms.push(ms);
          if (page.why === 'busy') tally.busy += 1;
          else if (page.why === 'moved') tally.moved += 1;
          else if (page.why !== null) tally.other += 1;
          else {
            tally.served += 1;
            const ok = page.from === from && page.rows.length === 100 && page.rows.every((row, k) => stand.numberOf(textOf(row))?.n === from + k + 1);
            if (!ok) tally.wrong += 1;
          }
        };
        const blank = () => ({ n: 0, served: 0, busy: 0, moved: 0, other: 0, wrong: 0, rest: 0, ms: [] as number[], nulls: 0 });
        const summary = (rate: string, t: ReturnType<typeof blank>) => ({ rate, n: t.n, served: t.served, busy: t.busy, moved: t.moved, other: t.other, wrong: t.wrong, atRest: t.rest, nullPictures: t.nulls, p50: pct(t.ms, 0.5), p99: pct(t.ms, 0.99), max: pct(t.ms, 1) });
        const rates: unknown[] = [];
        let made = 0;
        // 100 and 1,000 lines a second: plan.history.rateSessions sessions paged at once, each its own loop.
        for (const rate of [100, 1000]) {
          const tally = blank();
          const ss: Array<{ tmuxId: string; paneId: string; session: FakeSession }> = [];
          for (let i = 0; i < plan.history.rateSessions; i += 1) {
            made += 1;
            ss.push(await freshSession(`h3r${String(made)}`, `--rate ${String(rate)} --total 90000`));
          }
          const until = Date.now() + plan.history.timeCapMs;
          await Promise.all(
            ss.map(async (s) => {
              while (tally.n < plan.history.pages && Date.now() < until) await oneTrial(s, tally, { from: (d) => d - 250, scrolling: false, pagerOf: pager });
            })
          );
          rates.push(summary(String(rate), tally));
          for (const s of ss) await killMade(s.tmuxId);
        }
        // A flood, in waves: each wave's sessions write as fast as the pane takes them and stop; only
        // pages asked while lines arrived count toward the floor, the rest are checked and set apart.
        {
          const tally = blank();
          const until = Date.now() + plan.history.timeCapMs;
          while (tally.n < plan.history.pages && Date.now() < until) {
            const wave: Array<{ tmuxId: string; paneId: string; session: FakeSession }> = [];
            for (let i = 0; i < plan.history.floodWaveSessions; i += 1) {
              made += 1;
              wave.push(await freshSession(`h3f${String(made)}`, '--rate 0 --total 95000'));
            }
            await Promise.all(
              wave.map(async (s) => {
                let still = 0;
                let lastDepth = -1;
                while (tally.n < plan.history.pages && Date.now() < until && still < 3) {
                  const before = tally.n + tally.rest;
                  await oneTrial(s, tally, { from: (d) => d - 250, scrolling: true, pagerOf: pager });
                  const d = await historyOf(s.tmuxId);
                  // Still only once lines have come: a stand-in not yet printing is a depth of 0 three
                  // times over, which ended a wave before its flood began in the first live run.
                  still = d !== null && d > 0 && d === lastDepth ? still + 1 : 0;
                  lastDepth = d ?? lastDepth;
                  if (tally.n + tally.rest === before) await sleep(20);
                }
              })
            );
            for (const s of wave) await killMade(s.tmuxId);
          }
          rates.push(summary('flood', tally));
        }
        // THE OLDEST PAGES (§Attack B1): from 0, 30 and 100, with a 10 ms wait before each statement,
        // as a far machine's round trip, and the phone's depth 300 ms stale.
        const slow = sb.createScreenScrollback({ core: () => coreWith(delayed(upControl, 10)) });
        const oldest: unknown[] = [];
        for (const rate of [100, 1000]) {
          const ss: Array<{ from: number; s: { tmuxId: string; paneId: string; session: FakeSession } }> = [];
          for (const from of [0, 30, 100]) {
            made += 1;
            ss.push({ from, s: await freshSession(`h3o${String(made)}`, `--rate ${String(rate)} --total 90000`) });
          }
          const until = Date.now() + plan.history.timeCapMs;
          const results = await Promise.all(
            ss.map(async ({ from, s }) => {
              const tally = blank();
              while (tally.n < plan.history.oldest && Date.now() < until) await oneTrial(s, tally, { from: () => from, scrolling: false, pagerOf: slow });
              return { rate: String(rate), from, n: tally.n, served: tally.served, busy: tally.busy, moved: tally.moved, other: tally.other, wrong: tally.wrong, p99: pct(tally.ms, 0.99) };
            })
          );
          oldest.push(...results);
          for (const { s } of ss) await killMade(s.tmuxId);
        }
        await tmux(['set-option', '-g', 'history-limit', '25000']);
        out['H3'] = { rates, oldest, refusedDown };
        note('H3: done');
      }
    }

    // H4 — moved: a trim under a held depth, clear-history, ESC [ 3 J, a width change, the alternate screen.
    if (want('H4')) {
      if (sb === null) unread('H4');
      else {
        const pager = sb.createScreenScrollback({ core: () => coreWith(upControl) });
        const answer = (page: Page | null): { why: string | null; rows: number; from: number | null } => ({ why: page === null ? 'not asked' : page.why, rows: page?.rows.length ?? -1, from: page?.from ?? null });
        const r: Record<string, unknown> = {};
        // The trim: a limit of 1,000, a depth held at 980 or more, the page asked the moment the history drops.
        {
          // The limit is held until the trim has been read: tmux applies a changed history-limit to the
          // panes that exist (the first live run set it back at once and the pane never trimmed).
          await tmux(['set-option', '-g', 'history-limit', '1000']);
          const s = await freshSession('h4trim', '--rate 400 --total 4000 --width 100');
          let held: number | null = null;
          for (let k = 0; k < 800 && held === null; k += 1) {
            const d = await historyOf(s.tmuxId);
            if (d !== null && d >= 980) held = d;
            else await sleep(20);
          }
          let dropped: number | null = null;
          if (held !== null) {
            let last = held;
            for (let k = 0; k < 1_000 && dropped === null; k += 1) {
              const d = await historyOf(s.tmuxId);
              if (d !== null && d < last) dropped = d;
              else {
                if (d !== null) last = d;
                await sleep(5);
              }
            }
          }
          const { page } = held !== null && dropped !== null ? await pageVia(pager, s.session, { from: 600, count: 50, depth: held, wrap: 120, keep: 'bottom' }) : { page: null };
          r['trim'] = { staged: held !== null && dropped !== null, held, dropped, ...answer(page) };
          await killMade(s.tmuxId);
          await tmux(['set-option', '-g', 'history-limit', '25000']);
        }
        // clear-history, by the scratch server's own command.
        {
          const s = await freshSession('h4clear', '--lines 500 --width 100');
          const held = await settleHistory(s.tmuxId);
          await tmux(['clear-history', '-t', s.tmuxId]);
          const after = await historyOf(s.tmuxId);
          const { page } = held !== null && held > 0 ? await pageVia(pager, s.session, { from: Math.max(0, held - 150), count: 100, depth: held, wrap: 120, keep: 'bottom' }) : { page: null };
          r['clear'] = { staged: held !== null && held > 0 && after === 0, held, after, ...answer(page) };
          await killMade(s.tmuxId);
        }
        // ESC [ 3 J, written by the program in the pane.
        {
          const s = await freshSession('h4e3', '--lines 500 --width 100 --clear-after 4000');
          const held = await settleHistory(s.tmuxId);
          let after: number | null = null;
          for (let k = 0; k < 200 && after !== 0; k += 1) {
            await sleep(50);
            after = await historyOf(s.tmuxId);
          }
          const { page } = held !== null && held > 0 && after === 0 ? await pageVia(pager, s.session, { from: Math.max(0, held - 150), count: 100, depth: held, wrap: 120, keep: 'bottom' }) : { page: null };
          r['e3'] = { staged: held !== null && held > 0 && after === 0, held, after, ...answer(page) };
          await killMade(s.tmuxId);
        }
        // A width change (this run's own resize, set apart from arm Z's drift).
        {
          const s = await freshSession('h4width', '--lines 500 --width 100');
          const held = await settleHistory(s.tmuxId);
          madeAt.delete(s.tmuxId);
          await tmux(['resize-window', '-t', s.tmuxId, '-x', '80']);
          await sleep(400);
          const cols = (await tmux(['display-message', '-p', '-t', s.tmuxId, '#{pane_width}']).catch(() => '')).trim();
          const { page } = held !== null && held > 0 ? await pageVia(pager, s.session, { from: Math.max(0, held - 150), count: 100, depth: held, wrap: 120, keep: 'bottom' }) : { page: null };
          r['width'] = { staged: held !== null && held > 0 && cols === '80', held, cols, ...answer(page) };
          await tmux(['kill-session', '-t', s.tmuxId]).catch(() => '');
        }
        // The alternate screen, its history kept by tmux and covered by the program (§14 M7).
        {
          const s = await freshSession('h4alt', '--lines 300 --width 100 --alt');
          await sleep(1_500);
          const alt = (await tmux(['display-message', '-p', '-t', s.tmuxId, '#{alternate_on}']).catch(() => '')).trim();
          const held = await historyOf(s.tmuxId);
          const { page } = held !== null && held > 100 ? await pageVia(pager, s.session, { from: held - 100, count: 100, depth: held, wrap: 120, keep: 'bottom' }) : { page: null };
          r['alt'] = { staged: alt === '1' && held !== null && held > 100, held, ...answer(page) };
          await killMade(s.tmuxId);
        }
        out['H4'] = r;
        note('H4: done');
      }
    }

    // H5 — the worst page: the rows nearest `keep` that fit, and the duty spacing after a 236-row compose.
    if (want('H5')) {
      if (sb === null) unread('H5');
      else {
        // Every statement's capture, stamped as it is written: this pager reads one session alone, so
        // the first capture a page writes is that page's start (the reader's floor is between starts).
        const starts: bigint[] = [];
        const captures: string[] = [];
        const recording: Ctl = {
          get connected() {
            return upControl.connected;
          },
          sendCommand(command: string): Promise<string[]> {
            const isCapture = command.startsWith('capture-pane');
            if (isCapture) starts.push(now());
            const answer = upControl.sendCommand(command);
            if (isCapture) void answer.then((lines) => void captures.push(lines.join('\n'))).catch(() => undefined);
            return answer;
          }
        };
        const pager = sb.createScreenScrollback({ core: () => coreWith(recording) });
        const s = await freshSession('h5', '--worst 400 --cols 120');
        const h = await settleHistory(s.tmuxId, 30_000);
        const r: Record<string, unknown> = { history: h };
        if (h !== null && h >= 320) {
          const askFrom = 200;
          const askCount = 108;
          const before = starts.length;
          const bottom = (await pageVia(pager, s.session, { from: askFrom, count: askCount, depth: h, wrap: 120, keep: 'bottom' })).page;
          const between = starts.length;
          const firstStart = starts[before] ?? null;
          const capture = captures.at(-1) ?? '';
          const top = (await pageVia(pager, s.session, { from: askFrom, count: askCount, depth: h, wrap: 120, keep: 'top' })).page;
          const secondStart = starts[between] ?? null;
          // The compose of that very capture, timed here through the SHIPPING composePage (five, the median).
          const times: number[] = [];
          let captureRows = 0;
          if (typeof composeModule.composePage === 'function' && capture !== '') {
            captureRows = capture.split('\n').length;
            const firstLine = Math.max(0, askFrom - (sb.SCROLLBACK_OVERSCAN ?? 128));
            for (let i = 0; i < 6; i += 1) {
              const t0 = now();
              composeModule.composePage(capture, firstLine, 120, { from: askFrom, count: askCount, keep: 'bottom' });
              if (i > 0) times.push(msBetween(t0, now()));
            }
          }
          r['askFrom'] = askFrom;
          r['askCount'] = askCount;
          // A served page's `why` is null; 'not asked' only when no page came back at all.
          r['keepBottom'] = { why: bottom === null ? 'not asked' : bottom.why, rows: bottom?.rows.length ?? -1, from: bottom?.from ?? null, styles: bottom?.styles.length ?? null };
          r['keepTop'] = { why: top === null ? 'not asked' : top.why, rows: top?.rows.length ?? -1, from: top?.from ?? null, styles: top?.styles.length ?? null };
          r['captureRows'] = captureRows;
          r['composeMs'] = pct(times, 0.5);
          r['gapMs'] = firstStart !== null && secondStart !== null ? msBetween(firstStart, secondStart) : null;
          r['statements'] = starts.length - before;
          r['floorMs'] = sb.SCROLLBACK_MIN_GAP_MS;
          r['dutyFactor'] = watchModule.SCREEN_DUTY_FACTOR;
        }
        out['H5'] = r;
        await killMade(s.tmuxId);
        note('H5: done');
      }
    }

    // H6 — the live picture's depth: at rest, on the alternate screen, and under a flood.
    if (want('H6')) {
      const r: Record<string, unknown> = {};
      {
        const s = await freshSession('h6rest', '--lines 3000 --width 100');
        const h = await settleHistory(s.tmuxId);
        const pic = await picture(s.tmuxId);
        r['rest'] = { history: h, depth: pic?.depth ?? null, space: pic?.space ?? null, row0: pic === null ? null : (stand.numberOf(pic.row0)?.n ?? null) };
        await killMade(s.tmuxId);
      }
      {
        const s = await freshSession('h6alt', '--lines 300 --width 100 --alt');
        await sleep(1_500);
        const pic = await picture(s.tmuxId);
        r['alt'] = { alternate: pic?.alternate ?? null, depth: pic === null ? 'unread' : pic.depth, space: pic === null ? 'unread' : pic.space };
        await killMade(s.tmuxId);
      }
      {
        // Held at 100,000 until the flood's pane is gone (tmux applies a changed limit to existing panes,
        // and the first live run's pane trimmed at 25,000, so every row 0 read one trim off its depth).
        await tmux(['set-option', '-g', 'history-limit', '100000']);
        const s = await freshSession('h6flood', '--rate 0 --total 95000 --width 100');
        let reads = 0;
        let nulls = 0;
        let checked = 0;
        const off: Array<{ depth: number; row0: number | null }> = [];
        let still = 0;
        let last = -1;
        const until = Date.now() + 60_000;
        // The flood's first lines, before any picture is read: a stand-in still starting draws no
        // numbered row, and its depth of 0 read five times over ended this loop in the first live run.
        for (let k = 0; k < 500 && Date.now() < until; k += 1) {
          const d = await historyOf(s.tmuxId);
          if (d !== null && d > 0) break;
          await sleep(20);
        }
        while (reads < 2_000 && still < 5 && Date.now() < until) {
          const pic = await picture(s.tmuxId);
          reads += 1;
          if (pic === null) continue;
          if (pic.depth === null) {
            nulls += 1;
            continue;
          }
          checked += 1;
          const n = stand.numberOf(pic.row0);
          if (n === null || n.n !== pic.depth + 1) off.push({ depth: pic.depth, row0: n?.n ?? null });
          still = pic.depth === last ? still + 1 : 0;
          last = pic.depth;
        }
        r['flood'] = { reads, nulls, checked, offByLine: off.length, off: off.slice(0, 5) };
        await killMade(s.tmuxId);
        await tmux(['set-option', '-g', 'history-limit', '25000']);
      }
      out['H6'] = r;
      note('H6: done');
    }

    // D — D5's pane clause: a second client switches the active pane between a read's two displays.
    if (want('D')) {
      const paneField = (line: string | undefined): string => String(line ?? '').split(/\t|_/)[0] ?? '';
      const displays: string[][] = [];
      /** A wrapper that switches the active pane once, after a statement's first display is answered, and once more before a keys act. */
      const switching = (real: Ctl): Ctl & { armRead(to: string): void; armAct(to: string): void } => {
        let readTo: string | null = null;
        let actTo: string | null = null;
        let afterFirst: Promise<unknown> | null = null;
        let left = 0;
        let actGate: Promise<unknown> | null = null;
        let statement: string[] = [];
        const track = (command: string, answer: Promise<string[]>): Promise<string[]> => {
          if (command.startsWith('display-message')) {
            void answer
              .then((lines) => {
                statement.push(paneField(lines[0]));
                if (statement.length === 2) {
                  displays.push(statement);
                  statement = [];
                }
              })
              .catch(() => undefined);
          }
          return answer;
        };
        return {
          get connected() {
            return real.connected;
          },
          armRead(to: string) {
            readTo = to;
          },
          armAct(to: string) {
            actTo = to;
          },
          sendCommand(command: string): Promise<string[]> {
            if (actGate !== null) return actGate.then(() => track(command, real.sendCommand(command)));
            if (left > 0 && afterFirst !== null) {
              left -= 1;
              const gate = afterFirst;
              return gate.then(() => track(command, real.sendCommand(command)));
            }
            if (readTo !== null && command.startsWith('display-message')) {
              const to = readTo;
              readTo = null;
              const first = track(command, real.sendCommand(command));
              afterFirst = first.then(() => scratchSpawn(['select-pane', '-t', to])).catch(() => undefined);
              left = 2;
              return first;
            }
            if (actTo !== null && !command.startsWith('display-message') && !command.startsWith('capture-pane')) {
              const to = actTo;
              actTo = null;
              actGate = scratchSpawn(['select-pane', '-t', to]).catch(() => undefined);
              return actGate.then(() => track(command, real.sendCommand(command)));
            }
            return track(command, real.sendCommand(command));
          }
        };
      };
      const r: Record<string, unknown> = {};
      // The read: pane A draws `A…` lines, pane B `B…` lines; the switch lands between the first statement's displays.
      {
        const made = await newSession('dread', 120, 40, standIn('--lines 600 --prefix A --width 100'));
        await tmux(['split-window', '-d', '-v', '-t', made.tmuxId, standIn('--lines 2000 --prefix B --width 100')]);
        const panes = (await tmux(['list-panes', '-t', made.tmuxId, '-F', '#{pane_id} #{pane_active}'])).trim().split('\n').map((l) => l.split(' '));
        const paneA = panes.find((p) => p[1] === '1')?.[0] ?? '';
        const paneB = panes.find((p) => p[1] === '0')?.[0] ?? '';
        await sleep(1_500);
        const sw = switching(control);
        const swCore = coreWith(sw);
        displays.length = 0;
        sw.armRead(paneB);
        const reading = await readScreenLocal(swCore as never, made.tmuxId, { spawn: scratchSpawn });
        const composed = reading === null ? null : composeScreen(reading, { turn: turns.current('d').id, status: 'running', typable: true });
        const row0 = composed === null || composed === 'large' ? '' : textOf((composed.screen.lines as Run[][])[0] ?? []);
        r['read'] = { paneA, paneB, statements: displays.map((d) => d.slice()), served: reading?.display.paneId ?? null, rowPrefix: stand.numberOf(row0)?.prefix ?? null, steady: (reading as unknown as { steady?: boolean } | null)?.steady ?? null };
        await killMade(made.tmuxId);
      }
      // The keys: a recorder in each pane; the switch lands during the keys verb's fresh read, and the
      // active pane is switched BACK before its act, so only an act aimed at the fresh read's pane reaches B.
      {
        const logA = join(plan.dir, 'rec-dA.jsonl');
        const logB = join(plan.dir, 'rec-dB.jsonl');
        const made = await newSession('dkeys', 120, 40, `${q(plan.node)} ${q(plan.recorder)} ${q(logA)} normal --label=dA`);
        await tmux(['split-window', '-d', '-v', '-t', made.tmuxId, `${q(plan.node)} ${q(plan.recorder)} ${q(logB)} normal --label=dB`]);
        const session = addSession('dkeys', made.tmuxId);
        const panes = (await tmux(['list-panes', '-t', made.tmuxId, '-F', '#{pane_id} #{pane_active}'])).trim().split('\n').map((l) => l.split(' '));
        const paneA = panes.find((p) => p[1] === '1')?.[0] ?? '';
        const paneB = panes.find((p) => p[1] === '0')?.[0] ?? '';
        const ready = (await waitReady(logA)) && (await waitReady(logB));
        await sleep(200);
        const sw = switching(control);
        const swCore = coreWith(sw);
        const keysVerb = createScreenKeys({
          core: () => swCore as never,
          turns,
          watch: { readFresh: (row: { id: string }) => readScreenLocal(swCore as never, tmuxIds.get(row.id) ?? '', { spawn: scratchSpawn }), nudge: () => undefined } as never,
          noteUserInput: () => undefined,
          run: scratchSpawn
        });
        const fromA = readRecorder(logA).length;
        const fromB = readRecorder(logB).length;
        displays.length = 0;
        sw.armRead(paneB);
        sw.armAct(paneA);
        const outcome = (await keysVerb.keys({ sessionId: session.id, keys: [{ t: 'x' }], turn: turns.current(session.id).id, dialog: null } as never, () => true)) as { outcome: string };
        await sleep(300);
        const active = (await tmux(['display-message', '-p', '-t', made.tmuxId, '#{pane_id}']).catch(() => '')).trim();
        r['keys'] = {
          ready,
          paneA,
          paneB,
          outcome: outcome.outcome,
          statements: displays.map((d) => d.slice()),
          activeAtEnd: active,
          aHex: readRecorder(logA).slice(fromA).map((x) => x.hex).join(''),
          bHex: readRecorder(logB).slice(fromB).map((x) => x.hex).join('')
        };
        await killMade(made.tmuxId);
      }
      out['D'] = r;
      note('D: done');
    }

    // DS — the space: a picture on pane A, the active pane switched to B, a first page through the SHIPPING reader.
    if (want('DS')) {
      if (sb === null) unread('DS');
      else {
        const pager = sb.createScreenScrollback({ core: () => coreWith(upControl) });
        const made = await newSession('dspace', 120, 40, standIn('--lines 600 --prefix A --width 100'));
        await tmux(['split-window', '-d', '-v', '-t', made.tmuxId, standIn('--lines 2000 --prefix B --width 100')]);
        const session = addSession('dspace', made.tmuxId);
        const panes = (await tmux(['list-panes', '-t', made.tmuxId, '-F', '#{pane_id} #{pane_active}'])).trim().split('\n').map((l) => l.split(' '));
        const paneB = panes.find((p) => p[1] === '0')?.[0] ?? '';
        await sleep(1_500);
        const pic = await picture(made.tmuxId);
        await tmux(['select-pane', '-t', paneB]);
        const { page } = pic !== null && pic.depth !== null ? await pageVia(pager, session, { from: Math.max(0, pic.depth - 100), count: Math.min(100, pic.depth), depth: pic.depth, wrap: pic.cols, keep: 'bottom' }) : { page: null };
        let parent: string | null = null;
        if (plan.parentCompose !== null) {
          try {
            parent = /\bspace\b/.test(readFileSync(plan.parentCompose, 'utf8')) ? "the parent's composer names a space" : "the parent's composer names no space, so its pictures carry none (printed, not graded)";
          } catch {
            parent = "the parent's composer could not be read";
          }
        }
        out['DS'] = {
          picture: { depth: pic?.depth ?? null, space: pic?.space ?? null, rowPrefix: pic === null ? null : (stand.numberOf(pic.row0)?.prefix ?? null) },
          page: { why: page === null ? 'not asked' : page.why, space: page?.space ?? null, depth: page?.depth ?? null, rowPrefix: page === null || page.rows.length === 0 ? null : (stand.numberOf(textOf(page.rows[0] ?? []))?.prefix ?? null) },
          parent
        };
        await killMade(made.tmuxId);
        note('DS: done');
      }
    }
    out['historyRefusedDown'] = refusedDown;
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
