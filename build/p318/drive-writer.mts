/**
 * build/p318/drive-writer.mts — `measure:p318`'s driver, run by
 * build/p318/measure-writer.mjs under the PINNED tsx, once per tmux build
 * (build/p318/SPEC.md §7.5, D26).
 *
 * WHAT IS REAL. The SHIPPING src/main/reply/writer.ts and reader.ts (through
 * `createReplyVerbs`), the shipping question-id counter, the shipping
 * `TmuxControlClient` on a scratch `ControlTransport` (its documented seam,
 * src/main/tmux/control-client.ts), the shipping `nativeVerdict` over Claude
 * Code's registry directory and Codex's pane title, the shipping hook
 * composition (`questionFromHookBody`, `hookBashOf`) and the shipping dialog
 * detector, against a REAL tmux server of the build it is handed, on a scratch
 * `-L p318-v-<pid>-<label>` socket under a scratch TMUX_TMPDIR, with
 * build/p318/stand-in.mjs (the Claude Code and Codex this phase answers, which
 * draw the committed real screens and log every byte they read with a
 * monotonic stamp) in its panes. No Electron, no door, no agent, no token.
 *
 * WHAT IS FAKE. The core: `listSessions`, `tmuxIdOf`, the manifest record and
 * the status, which this file sets as the monitor would (a press needs
 * `needs_input`, a message `running` or `idle`), and the hook events, which
 * this file composes from the stand-in's command exactly as core's hook path
 * does. Nothing else.
 *
 * THE ARMS IT READS (graded by measure-writer.mjs, never here):
 *   M1  check-to-land: `onLastCheck` stamped with process.hrtime.bigint(),
 *       the stand-in's read of the digit on the same clock (mach absolute
 *       time on macOS, one clock for every process), at least 200 presses
 *       over the control client, Claude Code and Codex alternating; and the
 *       spawned fallback list (the control client reading disconnected)
 *       beside it, printed and not graded
 *   M2  the message frames, read off the stand-in's log; `list-buffers`
 *       after each
 *   M3  from copy mode, a press and a message: `#{pane_in_mode}` before and
 *       after, and the bytes
 *   M4  every final-check refusal: no act argv, no `onLastCheck`, no byte
 *   M5  the read-back: answered, not taken (a digit inside the stand-in's
 *       widened drop window), unread (the pane gone before the read-back)
 *   M6  the say's window: the reader's last capture, `onLastCheck` and the
 *       stand-in's first byte of the paste, at least 200 messages
 *   M7  the press's outcome is the `send-keys` line's: a scratch control
 *       transport answering %error to `copy-mode` and %end to `send-keys`,
 *       and the inverse as the control
 *
 * It prints ONE line, `P318_MEASURE:{…}`, which measure-writer.mjs reads, and
 * it ends what it started (the control clients, the tmux server) in its
 * `finally`; measure-writer.mjs ends the server and the stand-ins again, by
 * name and by pid, in its own.
 *
 *   node build/p318/measure-writer.mjs   (never this file by hand)
 */

import { randomBytes } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { appendFileSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

import type { Session } from '../../src/shared/types.js';
import type { PocketReplyOffer } from '../../src/shared/ipc/pocket.js';
import type { PocketReplyOutcome } from '../../src/main/pocket/routes.js';

// ---------------------------------------------------------------------------
// The plan, handed by measure-writer.mjs
// ---------------------------------------------------------------------------

interface Plan {
  label: string;
  tmux: string;
  socket: string;
  conf: string;
  tmuxTmp: string;
  home: string;
  standinDir: string;
  bin: string;
  projects: { claude: string; codex: string; unread: string };
  presses: number;
  fallback: number;
  messages: number;
  logFile: string;
}

const planPath = process.argv[2] ?? '';
const plan = JSON.parse(readFileSync(planPath, 'utf8')) as Plan;
if (!/^p318-v-\d+-[a-z0-9]+$/.test(plan.socket)) throw new Error(`the socket ${plan.socket} is not a p318-v scratch socket`);
if (!plan.tmuxTmp.startsWith('/private/tmp/') && !plan.tmuxTmp.startsWith('/tmp/')) throw new Error('TMUX_TMPDIR is not a scratch directory under /tmp');

/** Every line this run said, also kept in a file the outer runner prints on a crash. */
function note(line: string): void {
  try {
    appendFileSync(plan.logFile, `${line}\n`);
  } catch {
    /* the outer runner removed the directory */
  }
}

// ---------------------------------------------------------------------------
// Electron is not here: the shipping log module names it, so a stand-in
// module goes into the require cache first, exactly as
// build/p313/hostile-client.mts does.
// ---------------------------------------------------------------------------

const scratch = mkdtempSync(join(plan.tmuxTmp, 'electron-'));
{
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

const { createReplyVerbs, REPLY_READ_BACK_MS } = await import('../../src/main/reply/writer.js');
const { createQuestionIds } = await import('../../src/main/reply/question-id.js');
const { hookBashOf } = await import('../../src/main/reply/hook-says.js');
const { questionFromHookBody, composeQuestion } = await import('../../src/main/activity/question.js');
const { detectDialogRows, normalizeCapture } = await import('../../src/main/activity/screen.js');
const { nativeVerdict, freshState } = await import('../../src/main/activity/state-machine.js');
const { activityProfileFor } = await import('../../src/main/agents/registry.js');
const { ClaudeSessionRegistry } = await import('../../src/main/activity/claude-registry.js');
const { TmuxControlClient, CONTROL_ATTACH_ARGS } = await import('../../src/main/tmux/control-client.js');
const replyCopy = await import('../../src/shared/reply-copy.js');
const lifecycle = await import('../../src/shared/lifecycle-words.js');
const pocket = await import('../../src/shared/ipc/pocket.js');
// The stand-in's own readers, one spelling for the probe, the measurement and the stand-in.
const standin = (await import(new URL('./stand-in.mjs', import.meta.url).href)) as {
  readLog(dir: string, pid: number): Array<Record<string, unknown> & { t: bigint; kind: string }>;
  readState(dir: string, pid: number): Record<string, unknown> | null;
  hellos(dir: string): Array<{ pid: number; agent: string; pane: string; cwd: string }>;
  sendOps(dir: string, pid: number, seq: number, ops: unknown[]): void;
  CLAUDE_DROP_MS: number;
};

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
const ms = (from: bigint, to: bigint): number => Number(to - from) / 1e6;
const sleep = (t: number): Promise<void> => new Promise((r) => setTimeout(r, t));

/** One tmux command on the scratch socket, its words on standard input when given. Rejects on a non-zero exit. */
function tmux(args: readonly string[], options: { stdin?: Buffer; timeoutMs?: number } = {}): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(plan.tmux, ['-L', plan.socket, ...args], { env: ENV, stdio: ['pipe', 'pipe', 'pipe'] });
    let out = '';
    const timer = setTimeout(() => child.kill('SIGKILL'), options.timeoutMs ?? 10_000);
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
      else reject(new Error(`tmux exited ${String(code)}`));
    });
    child.stdin.on('error', () => undefined);
    if (options.stdin !== undefined) child.stdin.end(options.stdin);
    else child.stdin.end();
  });
}

// ---------------------------------------------------------------------------
// The world: the server, the two stand-ins, the fake core
// ---------------------------------------------------------------------------

interface Agent {
  key: 'claude' | 'codex' | 'unread';
  agent: 'claude' | 'codex';
  sessionId: string;
  name: string;
  cwd: string;
  tmuxId: string;
  paneId: string;
  pid: number;
  seq: number;
}

const turns = createQuestionIds(randomBytes(8).toString('hex'));
const registry = new ClaudeSessionRegistry(join(plan.home, '.claude', 'sessions'));
const sessions = new Map<string, Session>();
const tmuxIds = new Map<string, string>();
const states = new Map<string, ReturnType<typeof freshState>>();
const noted: string[] = [];
/** Every argv the writer handed tmux, stamped as it was handed and as it answered. */
const calls: Array<{ at: bigint; done: bigint | null; args: string[]; stdinBytes: number; ok: boolean | null }> = [];
/** The control lines the writer wrote, stamped. */
const controlLines: Array<{ at: bigint; line: string }> = [];
/** `onLastCheck`, stamped per session. */
const lastChecks: Array<{ at: bigint; sessionId: string }> = [];
/** A hook run before a reader's call answers, to move the world under the reader (M4). */
let beforeAnswer: ((args: readonly string[]) => void) | null = null;

const realControl = new TmuxControlClient({
  machineId: `p318-${plan.label}`,
  precheck: async () => undefined,
  plan: async () => ({ file: plan.tmux, argv: ['-L', plan.socket, ...CONTROL_ATTACH_ARGS] }),
  env: () => ENV
});
/** The control client the core hands the writer now: the real one, a disconnected one, or M7's fakes. */
let controlNow: { readonly connected: boolean; sendCommand(command: string): Promise<string[]> } = realControl;
const recordingControl = (inner: { readonly connected: boolean; sendCommand(command: string): Promise<string[]> }) => ({
  get connected(): boolean {
    return inner.connected;
  },
  sendCommand(command: string): Promise<string[]> {
    controlLines.push({ at: now(), line: command });
    return inner.sendCommand(command);
  }
});
const DISCONNECTED = {
  connected: false,
  sendCommand: (): Promise<string[]> => Promise.reject(new Error('not connected'))
};

const core = {
  listSessions: (): readonly Session[] => [...sessions.values()],
  tmuxIdOf: (id: string): string | null => tmuxIds.get(id) ?? null,
  manifest: {
    getSession: (id: string): { status: Session['status'] } | undefined => {
      const s = sessions.get(id);
      return s === undefined ? undefined : { status: s.status };
    }
  },
  get control() {
    return controlNow;
  },
  activity: {
    noteUserInput: (id: string): void => {
      noted.push(id);
    },
    nativeReadingOf: (sessionId: string, agent: string, cwd: string, pane: Parameters<typeof nativeVerdict>[0], proc: Parameters<typeof nativeVerdict>[5]) =>
      nativeVerdict(pane, activityProfileFor(agent), states.get(sessionId) ?? freshState(Date.now()), cwd, registry, proc)
  }
};

const run = async (args: readonly string[], options?: { stdin?: Buffer; timeoutMs?: number }): Promise<string> => {
  const call = { at: now(), done: null as bigint | null, args: [...args], stdinBytes: options?.stdin?.length ?? 0, ok: null as boolean | null };
  calls.push(call);
  try {
    const out = await tmux(args, options ?? {});
    beforeAnswer?.(args);
    call.done = now();
    call.ok = true;
    return out;
  } catch (err) {
    call.done = now();
    call.ok = false;
    throw err;
  }
};
const onLastCheck = (sessionId: string): void => {
  lastChecks.push({ at: now(), sessionId });
};
const verbs = createReplyVerbs({ core: () => core, turns, run, onLastCheck });

const agents: Agent[] = [];

async function makeAgent(key: Agent['key'], agent: 'claude' | 'codex', cwd: string, first: boolean): Promise<Agent> {
  const name = `p318-${key}`;
  const before = new Set(standin.hellos(plan.standinDir).map((h) => h.pid));
  const args = first ? ['-f', plan.conf, 'new-session', '-d'] : ['new-session', '-d'];
  await tmux([...args, '-s', name, '-x', '120', '-y', '40', '-c', cwd, `exec ${join(plan.bin, agent)}`]);
  const tmuxId = (await tmux(['display-message', '-p', '-t', `=${name}:`, '#{session_id}'])).trim();
  const paneId = (await tmux(['display-message', '-p', '-t', `=${name}:`, '#{pane_id}'])).trim();
  let hello: { pid: number; agent: string; pane: string; cwd: string } | undefined;
  for (let i = 0; i < 200 && hello === undefined; i += 1) {
    hello = standin.hellos(plan.standinDir).find((h) => !before.has(h.pid) && h.pane === paneId);
    if (hello === undefined) await sleep(50);
  }
  if (hello === undefined) throw new Error(`the ${agent} stand-in in ${name} never said hello`);
  const sessionId = `s-p318-${plan.label}-${key}`;
  sessions.set(sessionId, {
    id: sessionId,
    name,
    tmuxName: name,
    projectPath: cwd,
    cwd,
    agent,
    status: 'idle',
    createdAt: Date.now()
  } as Session);
  tmuxIds.set(sessionId, tmuxId);
  states.set(sessionId, freshState(Date.now()));
  const one: Agent = { key, agent, sessionId, name, cwd, tmuxId, paneId, pid: hello.pid, seq: 0 };
  agents.push(one);
  // A submit returns the stand-in to its empty prompt at once.
  await tell(one, [{ op: 'afterSubmit', then: { op: 'idle' } }]);
  await waitIdle(one);
  return one;
}

function stateOf(a: Agent): Record<string, unknown> | null {
  return standin.readState(plan.standinDir, a.pid);
}

/** Send ops and wait until the stand-in has applied them. */
async function tell(a: Agent, ops: unknown[]): Promise<void> {
  a.seq += 1;
  standin.sendOps(plan.standinDir, a.pid, a.seq, ops);
  for (let i = 0; i < 400; i += 1) {
    const s = stateOf(a);
    if (s !== null && Number(s['seq']) >= a.seq) return;
    await sleep(10);
  }
  throw new Error(`${a.name} never applied seq ${String(a.seq)}`);
}

async function waitFor<T>(test: () => T | null | undefined | false, timeoutMs: number, every = 10): Promise<T | null> {
  const started = Date.now();
  for (;;) {
    const v = test();
    if (v !== null && v !== undefined && v !== false) return v;
    if (Date.now() - started > timeoutMs) return null;
    await sleep(every);
  }
}

/** The stand-in at its empty prompt, its registry and the status saying so, as the monitor would. */
async function waitIdle(a: Agent): Promise<boolean> {
  const ok = await waitFor(() => {
    const s = stateOf(a);
    return s !== null && s['mode'] === 'idle' && Number(s['typedBytes']) === 0;
  }, 5_000);
  setStatus(a, 'idle');
  await registry.refresh();
  return ok === true;
}

function setStatus(a: Agent, status: Session['status']): void {
  const row = sessions.get(a.sessionId);
  if (row === undefined) return;
  const was = row.status;
  sessions.set(a.sessionId, { ...row, status });
  // Core's onStatus wiring (§5.3 item 5): a committed status that is not needs_input moves the id.
  if (was !== status && status !== 'needs_input') turns.bump(a.sessionId, 'status');
}

/**
 * Draw a press screen for `command` and announce it as core would: Claude's
 * PermissionRequest through the shipping composer (the hook first, then the
 * choice appearing), Codex's choice appearing alone. Answers the drawn serial
 * and the offer the door would serve over the question and options the
 * activity map would hold.
 */
async function drawPress(a: Agent, command: string, extra: Record<string, unknown> = {}): Promise<{ serial: number; drewAt: bigint; offer: PocketReplyOffer; bash: 'whole' | 'partial' | null }> {
  const prevSerial = Number(stateOf(a)?.['serial'] ?? 0);
  let bash: 'whole' | 'partial' | null = null;
  if (a.agent === 'claude') {
    const body = JSON.stringify({
      session_id: `p318-${a.key}`,
      transcript_path: '/dev/null',
      cwd: a.cwd,
      permission_mode: 'default',
      hook_event_name: 'PermissionRequest',
      tool_name: 'Bash',
      tool_input: { command, description: 'Run the command the stand-in names' }
    });
    const asked = questionFromHookBody(body);
    bash = asked === null ? null : hookBashOf(body, asked);
    turns.hook(a.sessionId, asked, bash);
  }
  await tell(a, [{ op: 'press', command, noHook: true, onCommit: { op: 'idle' }, ...extra }]);
  const drew = await waitFor(() => {
    const s = stateOf(a);
    return s !== null && s['mode'] === 'press' && Number(s['serial']) > prevSerial ? s : null;
  }, 5_000);
  if (drew === null) throw new Error(`${a.name} never drew its press screen`);
  const serial = Number(drew['serial']);
  const drewLine = standin.readLog(plan.standinDir, a.pid).filter((l) => l.kind === 'drew' && Number(l['serial']) === serial)[0];
  turns.bump(a.sessionId, 'choice-appeared');
  setStatus(a, 'needs_input');
  // What the activity map would hold after the monitor's tick: the composed question and the options.
  const screen = normalizeCapture(await tmux(['capture-pane', '-p', '-t', a.paneId]));
  const rows = detectDialogRows(screen);
  const turn = turns.current(a.sessionId);
  const drawn = { question: composeQuestion(turn.hookAsk, rows.question), choices: rows.options };
  const row = sessions.get(a.sessionId);
  if (row === undefined) throw new Error('the row went away');
  const offer = await verbs.offer(row, drawn);
  return { serial, drewAt: drewLine?.t ?? now(), offer, bash };
}

/** The bytes a stand-in read after `from`, as hex, and its events after `from`. */
function logAfter(a: Agent, from: bigint): { hex: string; events: Array<Record<string, unknown> & { t: bigint; kind: string }> } {
  const log = standin.readLog(plan.standinDir, a.pid).filter((l) => l.t >= from);
  return { hex: log.filter((l) => l.kind === 'read').map((l) => String(l['hex'])).join(''), events: log };
}
const firstReadAfter = (a: Agent, from: bigint) => standin.readLog(plan.standinDir, a.pid).find((l) => l.kind === 'read' && l.t >= from) ?? null;

type Outcome = PocketReplyOutcome;
const outcomeOf = (o: Outcome) => ({ outcome: o.outcome, reason: o.outcome === 'refused' ? o.reason : null, sentence: o.outcome === 'done' ? null : o.sentence });

/** One press at `marker`, its stamps and what the stand-in read. */
async function pressOnce(a: Agent, command: string, pickMarker: (pressable: readonly string[]) => string, extra: Record<string, unknown> = {}) {
  const d = await drawPress(a, command, extra);
  if (d.offer.question === null || d.offer.mark === null || d.offer.pressable.length === 0) {
    return { ok: false as const, agent: a.agent, why: `no press offered (${JSON.stringify(d.offer)})`, serial: d.serial };
  }
  // Claude drops a digit read in its first 200 ms; a press made after it is the honest case.
  if (a.agent === 'claude' && extra['dropMs'] === undefined) {
    const wait = standin.CLAUDE_DROP_MS + 60 - ms(d.drewAt, now());
    if (wait > 0) await sleep(wait);
  }
  const marker = pickMarker(d.offer.pressable);
  const from = now();
  const checksBefore = lastChecks.length;
  const out = await verbs.choose({ sessionId: a.sessionId, question: d.offer.question, mark: d.offer.mark, marker }, () => true);
  const check = lastChecks.slice(checksBefore).find((c) => c.sessionId === a.sessionId) ?? null;
  const land = check === null ? null : firstReadAfter(a, check.at);
  await sleep(120);
  const after = logAfter(a, from);
  return {
    ok: true as const,
    agent: a.agent,
    marker,
    serial: d.serial,
    outcome: outcomeOf(out),
    checkToLandMs: check !== null && land !== null ? ms(check.at, land.t) : null,
    landedHex: land === null ? null : String(land['hex']),
    commits: after.events.filter((e) => e.kind === 'commit').map((e) => ({ marker: String(e['marker']), serial: Number(e['serial']) })),
    dropped: after.events.filter((e) => e.kind === 'dropped').length,
    enters: after.events.filter((e) => e.kind === 'enter').length,
    readHex: after.hex,
    command: d.offer.command,
    pressable: [...d.offer.pressable]
  };
}

/** One message; its stamps, the frame the stand-in read and what it submitted. */
async function sayOnce(a: Agent, text: string) {
  await waitIdle(a);
  const from = now();
  const callsBefore = calls.length;
  const checksBefore = lastChecks.length;
  const out = await verbs.say({ sessionId: a.sessionId, text }, () => true);
  const check = lastChecks.slice(checksBefore).find((c) => c.sessionId === a.sessionId) ?? null;
  const capture = calls.slice(callsBefore).filter((c) => c.args[0] === 'capture-pane').pop() ?? null;
  const submitted = await waitFor(() => standin.readLog(plan.standinDir, a.pid).find((l) => l.kind === 'submitted' && l.t >= from) ?? null, 3_000);
  const after = logAfter(a, from);
  const land = check === null ? null : firstReadAfter(a, check.at);
  const buffers = (await tmux(['list-buffers', '-F', '#{buffer_name}']).catch(() => '')).split('\n').filter((l) => l.trim() !== '');
  return {
    agent: a.agent,
    bytes: Buffer.byteLength(text, 'utf8'),
    textHex: Buffer.from(text, 'utf8').toString('hex'),
    outcome: outcomeOf(out),
    readHex: after.hex,
    submittedHex: submitted === null ? null : String(submitted['hex']),
    submits: after.events.filter((e) => e.kind === 'submitted').length,
    buffersAfter: buffers,
    checkToLandMs: check !== null && land !== null ? ms(check.at, land.t) : null,
    captureToLandMs: capture !== null && capture.done !== null && land !== null ? ms(capture.done, land.t) : null,
    firstHex: land === null ? null : String(land['hex']).slice(0, 12)
  };
}

const paneInMode = async (a: Agent): Promise<string> => (await tmux(['display-message', '-p', '-t', a.paneId, '#{pane_in_mode}'])).trim();

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

const readings: Record<string, unknown> = {
  label: plan.label,
  tmuxVersion: spawnSync(plan.tmux, ['-V'], { encoding: 'utf8' }).stdout?.trim() ?? null,
  readBackMs: REPLY_READ_BACK_MS,
  words: {
    notTaken: replyCopy.REPLY_NOT_TAKEN,
    unread: replyCopy.REPLY_TYPED_UNREAD,
    failed: replyCopy.REPLY_FAILED,
    notReady: replyCopy.REPLY_NOT_READY,
    changed: lifecycle.LIFECYCLE_SESSION_CHANGED,
    stopped: pocket.POCKET_WRITE_SENTENCES.stopped
  }
};
const fakes: Array<InstanceType<typeof TmuxControlClient>> = [];

try {
  const claude = await makeAgent('claude', 'claude', plan.projects.claude, true);
  const codex = await makeAgent('codex', 'codex', plan.projects.codex, false);
  note(`[p318 drive ${plan.label}] stand-ins up: claude ${String(claude.pid)} in ${claude.paneId}, codex ${String(codex.pid)} in ${codex.paneId}`);

  // The control client, as core holds it.
  await realControl.start();
  const connected = await waitFor(() => realControl.connected, 10_000, 20);
  if (connected === null) throw new Error('the control client never connected to the scratch server');
  controlNow = recordingControl(realControl);

  // ---- M1: check-to-land over the control client --------------------------
  const m1: unknown[] = [];
  for (let i = 0; i < plan.presses; i += 1) {
    const a = i % 2 === 0 ? claude : codex;
    const r = await pressOnce(a, `touch p318-m1-${String(i)}.txt`, (p) => p[i % p.length] ?? p[0] ?? '1');
    m1.push(r);
    await waitIdle(a);
  }
  readings['M1'] = m1;
  note(`[p318 drive ${plan.label}] M1: ${String(m1.length)} presses over the control client`);

  // ---- M1's fallback: the spawned list, printed and not graded ------------
  controlNow = recordingControl(DISCONNECTED);
  const fallback: unknown[] = [];
  for (let i = 0; i < plan.fallback; i += 1) {
    const a = i % 2 === 0 ? claude : codex;
    fallback.push(await pressOnce(a, `touch p318-fallback-${String(i)}.txt`, (p) => p[p.length - 1] ?? '1'));
    await waitIdle(a);
  }
  readings['M1fallback'] = fallback;
  controlNow = recordingControl(realControl);

  // ---- M2: the message frames --------------------------------------------
  const decomposedE = `e${String.fromCodePoint(0x301)}`;
  const thumbsUpMedium = `${String.fromCodePoint(0x1f44d)}${String.fromCodePoint(0x1f3fd)}`;
  const texts: Array<[string, string]> = [
    ['hello phone', 'hello phone'],
    ['backslashes and a semicolon', 'a\\;b\\\\c\\'],
    ['-R, a semicolon, a newline, an emoji with a skin tone and a decomposed e', `-R ls -la;\nsecond line ; ${thumbsUpMedium} ${decomposedE}`],
    ['a slash command', '/exit'],
    ['a shell escape', '!touch x'],
    ['a trailing semicolon', 'x;'],
    ['4,096 bytes, a three-byte character on the boundary', `${'a'.repeat(4_093)}${String.fromCodePoint(0x20ac)}`]
  ];
  const m2: unknown[] = [];
  for (const [what, text] of texts) {
    for (const a of [claude, codex]) m2.push({ what, ...(await sayOnce(a, text)) });
  }
  readings['M2'] = m2;

  // ---- M3: from copy mode ---------------------------------------------------
  const m3: Record<string, unknown> = {};
  {
    await waitIdle(claude);
    const d = await drawPress(claude, 'touch p318-m3.txt');
    await sleep(standin.CLAUDE_DROP_MS + 80);
    await tmux(['copy-mode', '-t', claude.paneId]);
    const before = await paneInMode(claude);
    const from = now();
    const out = d.offer.question !== null && d.offer.mark !== null
      ? await verbs.choose({ sessionId: claude.sessionId, question: d.offer.question, mark: d.offer.mark, marker: d.offer.pressable[d.offer.pressable.length - 1] ?? '4' }, () => true)
      : null;
    const afterMode = await paneInMode(claude);
    await sleep(100);
    const log = logAfter(claude, from);
    m3['press'] = {
      before,
      after: afterMode,
      outcome: out === null ? null : outcomeOf(out),
      marker: d.offer.pressable[d.offer.pressable.length - 1] ?? null,
      commits: log.events.filter((e) => e.kind === 'commit').map((e) => String(e['marker'])),
      readHex: log.hex
    };
    await waitIdle(claude);
    await tmux(['copy-mode', '-t', claude.paneId]);
    const sayBefore = await paneInMode(claude);
    const said = await sayOnce(claude, 'm3 from copy mode');
    m3['say'] = { before: sayBefore, after: await paneInMode(claude), ...said };
  }
  readings['M3'] = m3;

  // ---- M4: every final-check refusal ----------------------------------------
  const m4: unknown[] = [];
  const refusal = async (what: string, a: Agent, act: () => Promise<Outcome>, verb: 'choose' | 'say') => {
    const callsBefore = calls.length;
    const linesBefore = controlLines.length;
    const checksBefore = lastChecks.length;
    const from = now();
    let out: Outcome;
    try {
      out = await act();
    } finally {
      beforeAnswer = null;
    }
    await sleep(Math.max(REPLY_READ_BACK_MS, 300));
    const mine = calls.slice(callsBefore);
    const lastRead = mine.reduce((n, c, i) => (['list-panes', 'display-message', 'capture-pane'].includes(c.args[0] ?? '') ? i : n), -1);
    m4.push({
      what,
      verb,
      agent: a.agent,
      outcome: outcomeOf(out),
      lastChecks: lastChecks.slice(checksBefore).filter((c) => c.sessionId === a.sessionId).length,
      actsAfterReads: mine.slice(lastRead + 1).filter((c) => ['send-keys', 'paste-buffer', 'copy-mode'].includes(c.args[0] ?? '') || c.args.includes('send-keys') || c.args.includes('paste-buffer')).map((c) => c.args.join(' ')),
      cleanupAfterReads: mine.slice(lastRead + 1).filter((c) => c.args[0] === 'delete-buffer').length,
      controlLines: controlLines.slice(linesBefore).length,
      bytesRead: logAfter(a, from).hex.length / 2,
      buffersAfter: (await tmux(['list-buffers', '-F', '#{buffer_name}']).catch(() => '')).split('\n').filter((l) => l.trim() !== '')
    });
    await tell(a, [{ op: 'idle' }]);
    await waitIdle(a);
  };
  const pressRefusal = async (what: string, a: Agent, opts: { still?: () => boolean; onCapture?: () => void; mark?: string; marker?: (p: readonly string[]) => string; command?: string }) => {
    const d = await drawPress(a, opts.command ?? `touch p318-m4-${what.replace(/\W+/g, '-')}.txt`);
    if (a.agent === 'claude') await sleep(standin.CLAUDE_DROP_MS + 80);
    if (d.offer.question === null || d.offer.mark === null) {
      m4.push({ what, verb: 'choose', agent: a.agent, unreadable: `no press offered: ${JSON.stringify(d.offer)}` });
      await tell(a, [{ op: 'idle' }]);
      await waitIdle(a);
      return;
    }
    const question = d.offer.question;
    const mark = opts.mark ?? d.offer.mark;
    const marker = (opts.marker ?? ((p) => p[0] ?? '1'))(d.offer.pressable);
    await refusal(what, a, () => {
      beforeAnswer = opts.onCapture === undefined ? null : (args) => {
        if (args[0] === 'capture-pane') opts.onCapture?.();
      };
      return verbs.choose({ sessionId: a.sessionId, question, mark, marker }, opts.still ?? (() => true));
    }, 'choose');
  };
  await pressRefusal('a press after the door stopped', claude, { still: () => false });
  await pressRefusal('a press whose question id moved during the reading (a desk keystroke)', claude, { onCapture: () => turns.bump(claude.sessionId, 'desk') });
  await pressRefusal('a press whose session changed its $-id during the reading', codex, {
    onCapture: () => tmuxIds.set(codex.sessionId, '$9999')
  });
  tmuxIds.set(codex.sessionId, codex.tmuxId);
  await pressRefusal('a press on a row that stopped waiting during the reading', codex, {
    onCapture: () => {
      const row = sessions.get(codex.sessionId);
      if (row !== undefined) sessions.set(codex.sessionId, { ...row, status: 'running' });
    }
  });
  await pressRefusal('a press with a mark from another screen', codex, { mark: 'a1b2c3d4e5f6' });
  await pressRefusal('Yes on a command not said whole (only No is pressable)', claude, {
    command: 'echo ok\ntouch p318-never.txt',
    marker: () => '1'
  });
  const sayRefusal = async (what: string, a: Agent, opts: { still?: () => boolean; onCapture?: () => void; before?: () => Promise<void> }) => {
    await waitIdle(a);
    await opts.before?.();
    await refusal(what, a, () => {
      beforeAnswer = opts.onCapture === undefined ? null : (args) => {
        if (args[0] === 'capture-pane') opts.onCapture?.();
      };
      return verbs.say({ sessionId: a.sessionId, text: `m4 ${what}` }, opts.still ?? (() => true));
    }, 'say');
  };
  await sayRefusal('a message after the door stopped', claude, { still: () => false });
  await sayRefusal('a message whose session moved during the reading (a desk keystroke)', codex, { onCapture: () => turns.bump(codex.sessionId, 'desk') });
  await sayRefusal('a message over a draft typed at the Mac', claude, {
    before: async () => {
      await tmux(['send-keys', '-t', claude.paneId, '-l', 'abc']);
      await waitFor(() => Number(stateOf(claude)?.['typedBytes'] ?? 0) === 3, 3_000);
    }
  });
  await tmux(['send-keys', '-t', claude.paneId, 'C-u']);
  await waitIdle(claude);
  await sayRefusal('a message while the agent works', codex, {
    before: async () => {
      await tell(codex, [{ op: 'work', ms: 4_000 }]);
      setStatus(codex, 'running');
      await sleep(250);
    }
  });
  await waitIdle(codex);
  readings['M4'] = m4;

  // ---- M5: the read-back ------------------------------------------------------
  const m5: Record<string, unknown> = {};
  {
    const notedBefore = noted.length;
    const answered = await pressOnce(claude, 'touch p318-m5-answered.txt', (p) => p[0] ?? '1');
    // The desk's own funnel, called for THIS press (nothing else moved the id).
    m5['answered'] = { ...answered, noted: noted.slice(notedBefore).includes(claude.sessionId) };
    await waitIdle(claude);
    // Not taken: the stand-in drops every digit for 5 s after it draws, so the
    // digit is typed and the same window is still drawn at the read-back.
    let notTaken: unknown = null;
    for (let attempt = 0; attempt < 3 && notTaken === null; attempt += 1) {
      const r = await pressOnce(codex, `touch p318-m5-not-taken-${String(attempt)}.txt`, (p) => p[0] ?? '1', { dropMs: 5_000 });
      if (r.ok && r.dropped > 0 && r.commits.length === 0) notTaken = r;
      else if (attempt === 2) notTaken = { ...r, staged: false };
      await tell(codex, [{ op: 'idle' }]);
      await waitIdle(codex);
    }
    m5['notTaken'] = notTaken;
    // Unread: a third session whose pane is killed between the act and the
    // read-back, through a writer built with a sleep that kills it first.
    const unread = await makeAgent('unread', 'codex', plan.projects.unread, false);
    const killing = createReplyVerbs({
      core: () => core,
      turns,
      run,
      onLastCheck,
      sleep: async (t: number) => {
        await tmux(['kill-pane', '-t', unread.paneId]).catch(() => undefined);
        await sleep(t);
      }
    });
    const d = await drawPress(unread, 'touch p318-m5-unread.txt');
    const out = d.offer.question !== null && d.offer.mark !== null
      ? await killing.choose({ sessionId: unread.sessionId, question: d.offer.question, mark: d.offer.mark, marker: d.offer.pressable[0] ?? '1' }, () => true)
      : null;
    m5['unread'] = { offered: d.offer.pressable.length > 0, outcome: out === null ? null : outcomeOf(out) };
  }
  readings['M5'] = m5;

  // ---- M6: the say's window -------------------------------------------------
  const m6: unknown[] = [];
  for (let i = 0; i < plan.messages; i += 1) {
    const a = i % 2 === 0 ? claude : codex;
    m6.push(await sayOnce(a, `m6 message ${String(i)}`));
  }
  readings['M6'] = m6;

  // ---- M7: the press's outcome is the send-keys line's ----------------------
  const m7: Record<string, unknown> = {};
  for (const mode of ['copy-error', 'send-error'] as const) {
    const fakeLog = join(plan.tmuxTmp, `fake-control-${mode}.log`);
    writeFileSync(fakeLog, '');
    const code = [
      "const fs = require('node:fs');",
      "const rl = require('node:readline').createInterface({ input: process.stdin });",
      'let n = 0;',
      'const t = () => Math.floor(Date.now() / 1000);',
      'n += 1;',
      "process.stdout.write('%begin ' + t() + ' ' + n + ' 0\\n%end ' + t() + ' ' + n + ' 0\\n');",
      "rl.on('line', (line) => {",
      '  n += 1;',
      "  fs.appendFileSync(process.env.P318_FAKE_LOG, line + '\\n');",
      "  const bad = (process.env.P318_FAKE_MODE === 'copy-error' && line.startsWith('copy-mode')) || (process.env.P318_FAKE_MODE === 'send-error' && line.startsWith('send-keys'));",
      "  process.stdout.write('%begin ' + t() + ' ' + n + ' 1\\n' + (bad ? '%error ' : '%end ') + t() + ' ' + n + ' 1\\n');",
      '});',
      "rl.on('close', () => process.exit(0));"
    ].join('\n');
    const fake = new TmuxControlClient({
      machineId: `p318-fake-${mode}`,
      precheck: async () => undefined,
      plan: async () => ({ file: process.execPath, argv: ['-e', code] }),
      env: () => ({ ...ENV, P318_FAKE_LOG: fakeLog, P318_FAKE_MODE: mode })
    });
    fakes.push(fake);
    await fake.start();
    const up = await waitFor(() => fake.connected, 10_000, 20);
    if (up === null) {
      m7[mode] = { unreadable: 'the scratch control transport never connected' };
      continue;
    }
    controlNow = recordingControl(fake);
    await waitIdle(claude);
    const r = await pressOnce(claude, `touch p318-m7-${mode}.txt`, (p) => p[0] ?? '1');
    const lines = readFileSync(fakeLog, 'utf8').split('\n').filter((l) => l.trim() !== '' && !l.startsWith('refresh-client'));
    m7[mode] = { ...r, fakeLines: lines };
    fake.stop();
    controlNow = recordingControl(realControl);
    await tell(claude, [{ op: 'idle' }]);
    await waitIdle(claude);
  }
  readings['M7'] = m7;
  readings['noted'] = noted.length;
  readings['ok'] = true;
} catch (err) {
  readings['ok'] = false;
  readings['error'] = err instanceof Error ? `${err.message}\n${String(err.stack ?? '').split('\n').slice(1, 4).join('\n')}` : String(err);
} finally {
  for (const f of fakes) f.stop();
  realControl.stop();
  registry.stop();
  // The server this file started, by its scratch socket name; measure-writer.mjs asks again.
  spawnSync(plan.tmux, ['-L', plan.socket, 'kill-server'], { env: ENV, encoding: 'utf8', timeout: 10_000 });
  for (const a of agents) {
    try {
      process.kill(a.pid, 'SIGTERM');
    } catch {
      /* gone with its pane */
    }
  }
}

process.stdout.write(`P318_MEASURE:${JSON.stringify(readings, (_k, v) => (typeof v === 'bigint' ? String(v) : v))}\n`);
