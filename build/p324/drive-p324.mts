/**
 * drive-p324.mts — the driver half of `npm run probe:p324` (Phase 324).
 *
 * IT IS RUN BY `build/p324/probe-p324.mjs` and never by hand. The orchestrator
 * writes the `/bin/sh` sign-in stand-in, BUILDS the environment rather than
 * passing its own on, and spawns this file through `tsxCli()` with `cwd` and
 * `--tsconfig` at `P324_ROOT`, so the `@shared/*` alias and every relative
 * import resolve against the checkout whose `src/` is under test.
 *
 * WHAT IT DRIVES, and every line of it is the SHIPPING module's, imported by
 * absolute path from `P324_ROOT/src/main`:
 *   - `context.ts`     the carriage composers (`tmuxCommand`) and the context
 *                      registry.
 *   - `exec-plane.ts`  `execOn`, the one door every exec verb crosses.
 *   - `remote-server.ts` `remoteBootArgs`, `ensureRemoteServer`.
 *   - `control-plane.ts` `remoteControlTransport`, `openControlPlane`,
 *                      `machineLinkFacts`, `isControlPlaneLive`,
 *                      `closeControlPlane`, `closeEveryControlPlane`, and the
 *                      refusal sentence `CONTROL_DIALECT_UNMEASURED`.
 *   - `control-client.ts` `TmuxControlClient`, `CONTROL_ATTACH_ARGS`,
 *                      `CONTROL_GREETING_DEADLINE_MS`, `quoteTmuxArg`.
 *   - `version.ts`     `decideRemoteVersionGate`, `decideRemoteControlGate`,
 *                      `TESTED_REMOTE_TMUX_VERSIONS`.
 *   - `prepare.ts`     `readRemoteTmuxVersion`.
 *   - `remote-sessions.ts` `REMOTE_LIST_FORMAT`, `REMOTE_LIST_FIELDS`,
 *                      `parseRemoteListLine`, `remoteCreateArgs`.
 *   - `attach-plan.ts` `attachPlan`, spawned as-is in a node-pty.
 *   - `scroll.ts`      Phase 320.1's shapes (`readPaneScroll`, `scrollPaneBy`,
 *                      `scrollPaneTo`, `exitPaneScroll`), over a runner backed
 *                      by a control client's `sendCommand`. The parked
 *                      `STATE_FORMAT` answer is the raw string the shipping
 *                      `readPaneScroll` itself was handed, caught by a
 *                      recording runner, so the format is never copied here.
 *   - `errors.ts`      `gmuxErrorPayloadOf`, so a refusal is read by its code
 *                      and its sentence rather than by a JSON string.
 *
 * THE CARRIAGE. Every SHIPPING far string crosses the `/bin/sh` stand-in the
 * orchestrator wrote (`ctx.sshBin`), which runs only its LAST argument through
 * `/bin/sh -c`, the way sshd runs a no-pty command, and writes each one to
 * `argv.log` before it runs it. The stand-in refuses any string that is not one
 * of §6.2's three shapes, so this driver cannot smuggle a verb past the exec
 * ledger by composing it by hand. Because every far control child crosses the
 * stand-in, `argv.log` is also where a SPAWN is counted: an arm's spawn count
 * is the number of far strings naming its socket and `CONTROL_ATTACH_ARGS`
 * written while the arm ran, never a constant. The PROBE's OWN helpers — a raw
 * control child for the dialect stream, the second client's create / rename /
 * kill, the typing, the detach — run the tmux binary DIRECTLY on the scratch
 * `-L p324-` socket, because the "remote" here is loopback and those are the
 * probe's, not Tortie's. Every one of them is logged as a `PROBE` line.
 *
 * WHAT IT NEVER DOES. No Electron. No ssh. No download, no build. It reads no
 * server of the operator's. Every server it starts is on a scratch socket named
 * `p324-…-<this pid>`, and the `finally` stops every client, closes every
 * control plane, ends every raw child, the pty and every server by its pid
 * (SIGTERM, then SIGKILL), unlinks only the socket files it named itself, and
 * counts the tmux processes left on those sockets, which must be 0.
 *
 * WHERE THE SPEC COULD NOT BE FOLLOWED LITERALLY. The eight-step dialect stream
 * cannot be read out of a `TmuxControlClient`: the client consumes the greeting
 * and the `%begin`/`%end` guards internally and exposes neither. So the byte
 * stream compared against 3.6a's (steps 1, 3, 4, 5, 6, 7, 9) is captured by a
 * probe-owned RAW control child, spawned with `CONTROL_ATTACH_ARGS` against the
 * same binary on a fresh scratch server, which is research 131 §3.3's own
 * method; arms C and D record what the shipping client itself does (open or
 * refuse, its spawn count, the greeting, step 2's `%output` split against a raw
 * child beside it, and for D one list byte-equal to exec). This is stated in
 * `results.json` under `dialectVia`.
 */

import { spawn, spawnSync, execFileSync, type ChildProcess } from 'node:child_process';
import {
  mkdirSync,
  writeFileSync,
  appendFileSync,
  readFileSync,
  readdirSync,
  lstatSync,
  unlinkSync,
  statSync,
  symlinkSync,
  renameSync
} from 'node:fs';
import { join } from 'node:path';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ptyMod: any = await import('node-pty');
const pty = ptyMod.default ?? ptyMod;

const ROOT = process.env['P324_ROOT'];
const RUN = process.env['P324_RUN'];
const FAR = process.env['P324_FAR_SH'];
const ARGV_LOG = process.env['P324_ARGV_LOG'];
if (ROOT === undefined || RUN === undefined || FAR === undefined || ARGV_LOG === undefined) {
  process.stderr.write('drive-p324: P324_ROOT, P324_RUN, P324_FAR_SH and P324_ARGV_LOG are all required\n');
  process.exit(2);
}
const ablatePrecheck = process.env['P324_ABLATE_PRECHECK'] !== '0';

interface TargetSpec {
  readonly id: string;
  readonly bin: string;
  /** 'new' | 'control' | 'pair'. The reference is the 3.6a control. */
  readonly role: 'new' | 'control' | 'pair';
}
const targets: TargetSpec[] = JSON.parse(process.env['P324_TARGETS'] ?? '[]');
const REFERENCE_ID = process.env['P324_REFERENCE'] ?? '3.6a';

const M = `${ROOT}/src/main`;
const ctxMod = await import(`${M}/machines/context.ts`);
const { registerRemoteMachineContext, setMachineRemotePath, tmuxCommand } = ctxMod;
const { execOn } = await import(`${M}/machines/exec-plane.ts`);
const cp = await import(`${M}/machines/control-plane.ts`);
const {
  remoteControlTransport,
  openControlPlane,
  machineLinkFacts,
  isControlPlaneLive,
  closeControlPlane,
  closeEveryControlPlane,
  CONTROL_DIALECT_UNMEASURED
} = cp;
const ccMod = await import(`${M}/tmux/control-client.ts`);
const { TmuxControlClient, CONTROL_ATTACH_ARGS, CONTROL_GREETING_DEADLINE_MS, quoteTmuxArg } = ccMod;
const versionMod = await import(`${M}/tmux/version.ts`);
const { decideRemoteVersionGate, decideRemoteControlGate, TESTED_REMOTE_TMUX_VERSIONS } = versionMod;
const prepareMod = await import(`${M}/machines/prepare.ts`);
const { readRemoteTmuxVersion } = prepareMod;
const rsMod = await import(`${M}/machines/remote-server.ts`);
const { remoteBootArgs, ensureRemoteServer } = rsMod;
const rsessMod = await import(`${M}/machines/remote-sessions.ts`);
const { REMOTE_LIST_FORMAT, REMOTE_LIST_FIELDS, parseRemoteListLine, remoteCreateArgs } = rsessMod;
const apMod = await import(`${M}/attach/attach-plan.ts`);
const { attachPlan } = apMod;
const scrollMod = await import(`${M}/tmux/scroll.ts`);
const { readPaneScroll, scrollPaneBy, scrollPaneTo, exitPaneScroll, resetSeekSupportForTests } = scrollMod;
const errorsMod = await import(`${M}/errors.ts`);
const { gmuxErrorPayloadOf } = errorsMod;

// ---------------------------------------------------------------------------
// Bookkeeping the finally reads
// ---------------------------------------------------------------------------

const serverPids = new Set<number>();
const rawChildren = new Set<ChildProcess>();
const ptys: Array<{ pid: number; kill: () => void }> = [];
const clients: Array<{ stop: () => void }> = [];
/** Every socket name this run chose. The finally unlinks these and no other. */
const sockets = new Set<string>();
const argvSeen: string[] = [];

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
const now = (): number => Number(process.hrtime.bigint() / 1_000_000n);
const safeId = (id: string): string => id.replace(/[^a-z0-9]/gi, '');

function logProbeArgv(kind: string, file: string, args: readonly string[]): void {
  const line = `PROBE ${kind} ${file} ${args.join(' ')}`;
  argvSeen.push(line);
  try {
    appendFileSync(ARGV_LOG!, `${line}\n`);
  } catch {
    /* the log is best effort */
  }
}

/** Run the tmux binary directly on the scratch socket — a probe helper, never a far string. */
function tmuxDirect(bin: string, socket: string, args: readonly string[], timeoutMs = 20_000): { code: number; stdout: string; stderr: string } {
  const argv = ['-L', socket, '-f', '/dev/null', ...args];
  logProbeArgv('tmux', bin, argv);
  const out = spawnSync(bin, argv, { encoding: 'utf8', timeout: timeoutMs, env: process.env });
  return { code: out.status ?? -1, stdout: out.stdout ?? '', stderr: out.stderr ?? '' };
}

/** A refusal read by its code and sentence (a `GmuxError`), or by its message. */
function refusalOf(err: unknown): { code: string; message: string; detail: string | null } {
  const payload = gmuxErrorPayloadOf(err);
  if (payload !== null) {
    return { code: payload.code, message: payload.message, detail: payload.detail?.slice(0, 200) ?? null };
  }
  return { code: 'NOT_A_GMUX_ERROR', message: String((err as Error)?.message ?? err).slice(0, 200), detail: null };
}

// ---------------------------------------------------------------------------
// argv.log: where a far control child is COUNTED rather than assumed
// ---------------------------------------------------------------------------

/** The byte length of argv.log now. An arm reads the strings written after it. */
function argvMark(): number {
  try {
    return statSync(ARGV_LOG!).size;
  } catch {
    return 0;
  }
}

/** The far strings (never PROBE lines, never REFUSED lines) written since `mark`. */
function farSince(mark: number): string[] {
  let buf: Buffer;
  try {
    buf = readFileSync(ARGV_LOG!);
  } catch {
    return [];
  }
  return buf
    .subarray(mark)
    .toString('utf8')
    .split('\n')
    .filter((l) => l.length > 0 && !l.startsWith('PROBE ') && !l.startsWith('REFUSED '));
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** A far string naming exactly this socket, quoted or not. */
function namesSocket(line: string, socket: string): boolean {
  return new RegExp(`(^|\\s)-L\\s*'?${escapeRe(socket)}'?(\\s|$)`).test(line);
}

/** The control attach tail every far control child ends with, quotes dropped. */
const CONTROL_TAIL = ` ${(CONTROL_ATTACH_ARGS as readonly string[]).join(' ')}`;

/** How many far control children were spawned on `socket` since `mark`. */
function controlSpawnsSince(mark: number, socket: string): number {
  return farSince(mark).filter((l) => namesSocket(l, socket) && l.replace(/'/g, '').endsWith(CONTROL_TAIL)).length;
}

// ---------------------------------------------------------------------------
// The raw control child, for the dialect stream (research 131 §3.3's method)
// ---------------------------------------------------------------------------

interface RawControl {
  child: ChildProcess;
  lines: string[];
  raw: string;
  exited: boolean;
}

/**
 * A `-C new-session -A -s gmux-control` control child, spawned DIRECTLY
 * (loopback), that the probe owns.
 *
 * It is `CONTROL_ATTACH_ARGS` byte for byte (create-or-attach), NOT a bare
 * `attach -t gmux-control`: the dialect server is fresh, so `attach` to a
 * session that does not exist errors at once with `%begin / no sessions /
 * %error / %exit` and no notification ever arrives. The shipping client uses
 * create-or-attach for exactly this reason, and the raw child must match it or
 * it measures an error greeting rather than the dialect.
 */
function openRawControl(bin: string, socket: string): RawControl {
  const argv = ['-L', socket, '-f', '/dev/null', ...(CONTROL_ATTACH_ARGS as readonly string[])];
  logProbeArgv('rawcontrol', bin, argv);
  const child = spawn(bin, argv, { stdio: ['pipe', 'pipe', 'pipe'], env: process.env });
  rawChildren.add(child);
  const state: RawControl = { child, lines: [], raw: '', exited: false };
  let pending = '';
  child.stdout?.setEncoding('utf8');
  child.stdout?.on('data', (chunk: string) => {
    state.raw += chunk;
    pending += chunk;
    const parts = pending.split('\n');
    pending = parts.pop() ?? '';
    for (const line of parts) state.lines.push(line);
  });
  child.on('exit', () => {
    state.exited = true;
    rawChildren.delete(child);
  });
  return state;
}

/** End one raw child by its pid: SIGTERM, then SIGKILL if it is still there. */
async function endRaw(state: RawControl): Promise<void> {
  if (state.exited) return;
  try {
    state.child.kill('SIGTERM');
  } catch {
    /* gone */
  }
  const until = now() + 1_000;
  while (!state.exited && now() < until) await sleep(25);
  if (!state.exited) {
    try {
      state.child.kill('SIGKILL');
    } catch {
      /* gone */
    }
  }
}

async function waitForLines(state: RawControl, count: number, timeoutMs = 8_000): Promise<boolean> {
  const deadline = now() + timeoutMs;
  while (state.lines.length < count && now() < deadline && !state.exited) await sleep(25);
  return state.lines.length >= count;
}
async function waitForLine(state: RawControl, pred: (l: string) => boolean, timeoutMs = 8_000): Promise<string | null> {
  const deadline = now() + timeoutMs;
  while (now() < deadline) {
    const found = state.lines.find(pred);
    if (found !== undefined) return found;
    if (state.exited) break;
    await sleep(25);
  }
  return null;
}
function drain(state: RawControl): string[] {
  const taken = [...state.lines];
  state.lines.length = 0;
  return taken;
}

/**
 * Replace the values two servers can never print alike (research 131 §3.3,
 * SPEC §6.3): epoch seconds, `$` `@` `%` ids, and the server's command number
 * in a `%begin`/`%end`/`%error` guard, which counts every command that server
 * has run and so says nothing about the dialect. The guard's word and flags are
 * kept, and `guardShape` compares them on their own.
 */
function normalize(text: string): string {
  return text
    .replace(/^(%(?:begin|end|error) \S+) \d+/gm, '$1 <cmd>')
    .replace(/\b1[0-9]{9}\b/g, '<epoch>')
    .replace(/\$\d+/g, '$N')
    .replace(/@\d+/g, '@N')
    .replace(/%\d+/g, '%N');
}

/**
 * The notification lines that are the SHELL's, not the control dialect's, and
 * which race into or out of a capture window between runs.
 *
 * `%output` is the pane's own bytes (the login shell's prompt, hostname and
 * cwd). `%window-renamed`, `%unlinked-window-renamed` and `%unlinked-window-add`
 * are tmux's automatic-rename of the shell's own window, which fires when the
 * shell sets its title and so depends on how fast that shell started. Research
 * 131 §3.3 records the same: the name in `%unlinked-window-renamed` is a sampled
 * process name that varies between runs. None of them is part of the control
 * protocol Tortie parses, so a greeting comparison drops them before it
 * compares the deterministic guard-and-notification structure. Measured: with
 * them in, 3.6's greeting carried an extra `%window-renamed @N tmux` that
 * 3.6a's and 3.6b's did not, purely because that shell renamed its window
 * inside the 600 ms capture; with them out, all three greetings are identical.
 * The raw stream is kept whole in `control-<target>.raw` so a verifier can
 * check the filter hides no protocol difference.
 */
const SHELL_VOLATILE = /^%(output|window-renamed|unlinked-window-renamed|unlinked-window-add)\b/;

/** Normalize a multi-line block, dropping the shell-timing lines above. */
function normalizeProtocol(lines: readonly string[]): string {
  return normalize(`${lines.filter((l) => !SHELL_VOLATILE.test(l)).join('\n')}\n`);
}

const GUARD_RE = /^%(begin|end|error) (\d+) (\d+) (\d+)$/;
const PARSED_NOTIFICATIONS = new Set(['sessions-changed', 'session-changed', 'session-renamed', 'session-window-changed', 'output', 'exit']);
function notificationNames(lines: readonly string[]): string[] {
  return lines.filter((l) => l.startsWith('%')).map((l) => l.slice(1).split(' ')[0] ?? '');
}
function knownNames(lines: readonly string[]): string {
  return notificationNames(lines).filter((n) => PARSED_NOTIFICATIONS.has(n)).join(',');
}
function unparsedNames(lines: readonly string[]): string[] {
  return [...new Set(notificationNames(lines).filter((n) => !PARSED_NOTIFICATIONS.has(n)))];
}

/**
 * Drive the comparable steps over a probe-owned RAW control child, on a fresh
 * scratch socket, and record every value the 3.6a control will be compared to.
 */
async function measureDialect(t: TargetSpec, socket: string): Promise<Record<string, unknown>> {
  const out: Record<string, unknown> = { target: t.id };
  const raw = openRawControl(t.bin, socket);
  try {
    // Step 1. The greeting.
    const t0 = now();
    const greeted = await waitForLines(raw, 2, CONTROL_GREETING_DEADLINE_MS);
    await sleep(600);
    if (!greeted) {
      out.step1 = `hung (no greeting within the ${String(CONTROL_GREETING_DEADLINE_MS)} ms deadline)`;
      return out;
    }
    const greeting = drain(raw);
    out.greetMs = now() - t0;
    // The deterministic greeting: guards, %window-add, %sessions-changed,
    // %session-changed. The shell's own %output and window-rename lines are
    // dropped, because they race into the capture window (see SHELL_VOLATILE).
    out.greetingNormalized = normalizeProtocol(greeting);
    out.greetingRaw = normalize(`${greeting.join('\n')}\n`);
    out.step1 = 'greeted';
    const guards = greeting.filter((l) => GUARD_RE.test(l));
    // Step 3. The guard shape: the word and the flags of each guard.
    out.guardShape = guards
      .map((l) => {
        const m = GUARD_RE.exec(l);
        return m ? `${m[1]}:${m[4]}` : l;
      })
      .join(',');
    // Step 2's first half. refresh-client -f no-output answered with an empty block.
    raw.child.stdin?.write('refresh-client -f no-output\n');
    await waitForLine(raw, (l) => l.startsWith('%end') || l.startsWith('%error'));
    const noOutBlock = drain(raw);
    out.noOutputBlockNormalized = normalizeProtocol(noOutBlock);
    out.noOutputBlockEmpty = noOutBlock.filter((l) => !l.startsWith('%')).join('') === '';

    // The worker session name is FIXED, not per-target: each dialect runs on its
    // own scratch server so there is no collision, and a name that embedded the
    // target id (`p324-w-36` vs `p324-w-36a`) could never match across targets in
    // the %session-renamed comparison — which is a harness artifact, not a
    // dialect difference. Step 4: create, rename (step 5), then kill below.
    const worker = 'p324-w';
    tmuxDirect(t.bin, socket, ['new-session', '-d', '-s', worker]);
    await sleep(400);
    out.onCreateKnown = knownNames(drain(raw));
    tmuxDirect(t.bin, socket, ['rename-session', '-t', `=${worker}`, `${worker}-2`]);
    await sleep(400);
    const renameLines = drain(raw);
    out.onRenameKnown = knownNames(renameLines);
    out.renamedLineNormalized = normalize(renameLines.find((l) => l.startsWith('%session-renamed')) ?? '');
    // Step 6. Window traffic + any unparsed notification names.
    tmuxDirect(t.bin, socket, ['new-window', '-t', `=${worker}-2`]);
    await sleep(400);
    const windowLines = drain(raw);
    out.windowKnown = knownNames(windowLines);
    out.unparsed = unparsedNames([...greeting, ...windowLines]);
    // Step 9. One list over the raw control connection.
    raw.child.stdin?.write(`list-sessions -F '${REMOTE_LIST_FORMAT}'\n`);
    await waitForLine(raw, (l) => l.startsWith('%end') || l.startsWith('%error'));
    const listBlock = drain(raw).filter((l) => !l.startsWith('%'));
    // Normalized: this line is compared across targets, and it carries each
    // server's own session_created and window_activity epochs and its session
    // ids. With the worker name fixed and those normalized, the shape is what is
    // compared, not one server's clock.
    out.listOverControl = normalize(listBlock.join('\n'));
    // Step 4's third verb. The row's note names the notifications on a create, a
    // KILL and a rename, so the kill's are recorded and compared like the other
    // two rather than drained unread.
    tmuxDirect(t.bin, socket, ['kill-session', '-t', `=${worker}-2`]);
    await sleep(300);
    out.onKillKnown = knownNames(drain(raw));
    // Step 7. %exit when kill-server crosses the connection.
    const killedAt = now();
    raw.child.stdin?.write('kill-server\n');
    const exitLine = await waitForLine(raw, (l) => l.startsWith('%exit'), 8_000);
    out.exitLineNormalized = normalize(exitLine ?? '(no %exit)');
    out.exitAfterMs = now() - killedAt;
    await sleep(300);
    return out;
  } finally {
    await endRaw(raw);
    // §6.5. The raw control-mode stream, for the verifier to re-derive the
    // steps by its own reader rather than trusting the normalised fields.
    try {
      writeFileSync(join(RUN!, `control-${safeId(t.id)}.raw`), raw.raw);
    } catch {
      /* the raw dump is best effort */
    }
  }
}

// ---------------------------------------------------------------------------
// A control client we can await the greeting on and count %output on
// ---------------------------------------------------------------------------

interface DrivenClient {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: any;
  /** ms to 'connected'; 'hung' when the greeting deadline passed; 'refused' when start() threw. */
  greetMs: number | 'hung' | 'refused';
  outputCount: number;
  refusal: { code: string; message: string; detail: string | null } | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function startClient(transport: any): Promise<DrivenClient> {
  const client = new TmuxControlClient(transport);
  clients.push(client);
  const res: DrivenClient = { client, greetMs: 'hung', outputCount: 0, refusal: null };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client.on('notification', (ev: any) => {
    if (ev.kind === 'output') res.outputCount += 1;
  });
  // An 'error' event with no listener would throw; the client emits one for
  // stderr lines and failed spawns, which this harness reads through its own
  // cells rather than as a crash.
  client.on('error', () => undefined);
  const t0 = now();
  const connected = new Promise<number>((resolve) => client.once('connected', () => resolve(now() - t0)));
  try {
    await client.start();
  } catch (e) {
    res.refusal = refusalOf(e);
    res.greetMs = 'refused';
    return res;
  }
  const greet = await Promise.race([connected, sleep(CONTROL_GREETING_DEADLINE_MS + 500).then(() => 'hung' as const)]);
  res.greetMs = greet;
  return res;
}

/**
 * Step 2's second half: type into `gmux-control` and count `%output` on the
 * shipping client (must be 0, it asked for no output) while a raw child the
 * probe owns beside it sees at least 1, so the 0 is not vacuous.
 */
async function outputSplit(bin: string, socket: string, driven: DrivenClient, tag: string): Promise<{ onClient: number; onRawChild: number }> {
  const beside = openRawControl(bin, socket);
  try {
    await waitForLines(beside, 2, 5_000);
    await sleep(300);
    drain(beside);
    const before = driven.outputCount;
    tmuxDirect(bin, socket, ['send-keys', '-t', '=gmux-control:', '-l', `echo p324-${tag}-output`]);
    tmuxDirect(bin, socket, ['send-keys', '-t', '=gmux-control:', 'Enter']);
    await sleep(600);
    return {
      onClient: driven.outputCount - before,
      onRawChild: drain(beside).filter((l) => l.startsWith('%output')).length
    };
  } finally {
    await endRaw(beside);
  }
}

// ---------------------------------------------------------------------------
// The scroll runner over a control client's sendCommand
// ---------------------------------------------------------------------------

interface RecordedCall {
  args: string[];
  raw: string;
}

/**
 * `args.map(quoteTmuxArg).join(' ')` into `sendCommand`, the way §6.3 names it,
 * with every call and its RAW answer recorded, so the parked `STATE_FORMAT`
 * answer is read from what the shipping `readPaneScroll` was handed.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function recordingRunner(client: any, calls: RecordedCall[]): (args: readonly string[]) => Promise<string> {
  return async (args: readonly string[]): Promise<string> => {
    const line = args.map((a: string) => quoteTmuxArg(a)).join(' ');
    const lines: string[] = await client.sendCommand(line);
    const raw = lines.join('\n');
    calls.push({ args: [...args], raw });
    return raw;
  };
}

/** A shape: the verb and its flags, with the target and every number made generic. */
function shapeOf(args: readonly string[]): string {
  return args
    .map((a, i) => (args[i - 1] === '-t' ? '<target>' : /^-?\d+$/.test(a) ? '<n>' : a.includes('#{') ? '<format>' : a))
    .join(' ');
}

// ---------------------------------------------------------------------------
// Contexts
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function registerContext(machineId: string, bin: string, socket: string, cpTag: string): any {
  sockets.add(socket);
  return registerRemoteMachineContext({
    kind: 'remote',
    machineId,
    sshBin: FAR!,
    host: 'p324.invalid',
    user: null,
    port: null,
    remoteTmuxPath: bin,
    socket,
    controlPath: `${RUN}/cp-${cpTag}-%C`,
    hostKeys: { tortie: `${RUN}/kh-tortie`, user: `${RUN}/kh-user` },
    acceptedTmuxVersion: null,
    label: null,
    identityFile: null
  });
}

/** Read a server's pid through the shipping exec plane, and own it. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function ownServerPid(ctx: any): Promise<number | null> {
  const pid = Number((await execOn(ctx, ['display-message', '-p', '#{pid}'])).trim());
  if (!Number.isInteger(pid) || pid <= 1) return null;
  serverPids.add(pid);
  return pid;
}

function pidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * Whether `pid` is still ONE OF THIS RUN'S processes: alive, and its command
 * line naming a socket this run chose. A tmux server keeps the command line of
 * the client that started it (`<tmux> -L p324-… -f /dev/null …`, measured on
 * 3.6 on 2026-09-30), and a raw control child, the attach pty's tmux client
 * and the server all name their socket, so this is the proof a pid read
 * earlier has not died and been handed to another process of the operator's.
 * Every SIGTERM and SIGKILL this driver sends by a bare pid asks it first.
 */
function stillOurs(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 1 || !pidAlive(pid)) return false;
  try {
    const cmd = execFileSync('/bin/ps', ['-p', String(pid), '-o', 'command='], { encoding: 'utf8' });
    return [...sockets].some((s) => namesSocket(cmd, s));
  } catch {
    return false;
  }
}

/** Signal `pid` only while `stillOurs` says it is this run's. */
function signalOurs(pid: number, sig: NodeJS.Signals): void {
  if (!stillOurs(pid)) return;
  try {
    process.kill(pid, sig);
  } catch {
    /* gone */
  }
}

/** Spawn the shipping attach plan in a node-pty; drawn when the marker arrives; detach by the probe's own detach-client. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function attachArm(ctx: any, bin: string, socket: string, tmuxName: string, marker: string): Promise<Record<string, unknown>> {
  const a: Record<string, unknown> = {};
  let rec: { pid: number; kill: () => void } | null = null;
  try {
    const plan = attachPlan({ kind: 'remote', ctx, tmuxName });
    logProbeArgv('attach', plan.file, plan.argv as string[]);
    let buf = '';
    let drawn = false;
    const term = pty.spawn(plan.file, [...plan.argv], { name: 'xterm-256color', cols: 80, rows: 24, cwd: RUN, env: process.env });
    let exitInfo: { exitCode: number } | null = null;
    rec = {
      pid: term.pid,
      kill: (): void => {
        if (exitInfo !== null) return;
        try {
          term.kill();
        } catch {
          /* gone */
        }
      }
    };
    ptys.push(rec);
    term.onData((chunk: string) => {
      buf += chunk;
      if (buf.includes(marker)) drawn = true;
    });
    term.onExit((ev: { exitCode: number }) => {
      exitInfo = ev;
    });
    const t0 = now();
    const drawDeadline = t0 + 8_000;
    while (!drawn && now() < drawDeadline && exitInfo === null) await sleep(50);
    a.drew = drawn;
    a.drawMs = drawn ? now() - t0 : `not drawn within 8000 ms`;
    // detach through the probe's own detach-client on the scratch socket; no
    // control byte is typed and nothing crosses execOn
    tmuxDirect(bin, socket, ['detach-client', '-s', `=${tmuxName}`]);
    const detachDeadline = now() + 4_000;
    while (exitInfo === null && now() < detachDeadline) await sleep(50);
    a.exitCode = exitInfo !== null ? (exitInfo as { exitCode: number }).exitCode : 'hung (still up 4000 ms after detach-client)';
  } catch (err) {
    a.error = (err as Error).message.slice(0, 120);
  } finally {
    if (rec !== null) rec.kill();
  }
  return a;
}

// ---------------------------------------------------------------------------
// One target, every per-target arm
// ---------------------------------------------------------------------------

async function runTarget(t: TargetSpec): Promise<Record<string, unknown>> {
  const socket = `p324-${safeId(t.id)}-${String(process.pid)}`;
  const id = `p324-${t.id}`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ctx: any = registerContext(id, t.bin, socket, safeId(t.id));
  const cell: Record<string, unknown> = { target: t.id, role: t.role, socket };
  resetSeekSupportForTests();
  let cRes: DrivenClient | null = null;
  let dRes: DrivenClient | null = null;
  try {
    // --- P: version reads, gates, boot, reborn -----------------------------
    const readNoServer = await readRemoteTmuxVersion(ctx);
    cell.readNoServer = readNoServer;
    cell.dashV = readNoServer.kind === 'version' ? readNoServer.version : `(${readNoServer.kind})`;

    let bootPid: number | null = null;
    try {
      const first = await ensureRemoteServer(ctx);
      cell.boot = {
        born: first.born,
        agree: first.options.filter((o: { agrees: boolean }) => o.agrees).length,
        of: first.options.length,
        disagreed: first.disagreed.map((o: { name: string; wanted: string; observed: string }) => `${o.name}:${o.wanted}!=${o.observed}`)
      };
      bootPid = await ownServerPid(ctx);
    } catch (e) {
      cell.boot = `threw: ${(e as Error).message.slice(0, 200)}`;
    }
    cell.hashVersion = (await execOn(ctx, ['display-message', '-p', '#{version}']).catch(() => '(threw)')).toString().trim();

    const gateVersion = readNoServer.kind === 'version' ? readNoServer.version : null;
    const execGate = decideRemoteVersionGate(gateVersion, TESTED_REMOTE_TMUX_VERSIONS, null);
    const ctrlGate = decideRemoteControlGate(gateVersion, TESTED_REMOTE_TMUX_VERSIONS);
    cell.execGate = execGate.kind;
    cell.controlGate = ctrlGate.kind;
    // Composed in Prepare's own order (SPEC 1.2 item 4): the gate, then the
    // sheet rule (`sheetFor`: a sheet exactly when a version was named).
    cell.prepare =
      execGate.kind === 'measured' ? 'no sheet, boots' : execGate.kind === 'unmeasured' ? 'acceptance sheet offered' : 'refused, no sheet';

    // Reborn: end the server by the pid it reported, then ensureRemoteServer
    // again on the same socket.
    if (bootPid !== null) {
      signalOurs(bootPid, 'SIGTERM');
      const until = now() + 2_000;
      while (pidAlive(bootPid) && now() < until) await sleep(50);
      if (!pidAlive(bootPid)) serverPids.delete(bootPid);
    }
    try {
      const second = await ensureRemoteServer(ctx);
      cell.reborn = {
        born: second.born,
        agree: second.options.filter((o: { agrees: boolean }) => o.agrees).length,
        of: second.options.length
      };
      await ownServerPid(ctx);
    } catch (e) {
      cell.reborn = `threw: ${(e as Error).message.slice(0, 200)}`;
    }

    // --- E: the exec shapes ------------------------------------------------
    const e: Record<string, unknown> = {};
    try {
      const empty = await execOn(ctx, ['list-sessions', '-F', '#{session_id}']);
      e.listEmpty = { rows: (empty as string).split('\n').filter((l) => l.length > 0).length };
    } catch (err) {
      e.listEmpty = { threw: refusalOf(err) };
    }
    // One create through the shipping remoteCreateArgs — the drawn pane. The
    // pane holds itself open with `exec cat`, which waits on its terminal: no
    // sleeper and no loop.
    const drawName = `p324-draw-${safeId(t.id)}`;
    let drawnSessionId = '';
    try {
      const createArgs = remoteCreateArgs({
        tmuxName: drawName,
        sessionId: 'p324-draw',
        argv: ['/bin/sh', '-c', `seq 1 3000; echo P324-DRAWN-${t.id}; exec cat`]
      });
      drawnSessionId = (await execOn(ctx, createArgs)).trim();
      e.createdSessionId = drawnSessionId;
    } catch (err) {
      e.createdSessionId = `threw: ${(err as Error).message.slice(0, 120)}`;
    }
    await sleep(300);
    try {
      const oneRow = await execOn(ctx, ['list-sessions', '-F', '#{session_id}']);
      e.listOneRow = oneRow.split('\n').filter((l: string) => l.length > 0);
    } catch (err) {
      e.listOneRow = `threw: ${(err as Error).message.slice(0, 80)}`;
    }
    try {
      e.historyLimit = (await execOn(ctx, ['show-options', '-gv', 'history-limit'])).trim();
    } catch (err) {
      e.historyLimit = `threw: ${(err as Error).message.slice(0, 80)}`;
    }
    // REMOTE_LIST_FORMAT round-trip through parseRemoteListLine, which answers
    // null unless the line splits into exactly REMOTE_LIST_FIELDS fields.
    try {
      const listed = await execOn(ctx, ['list-sessions', '-F', REMOTE_LIST_FORMAT]);
      const first = listed.split('\n').find((l: string) => l.length > 0) ?? '';
      const parsed = parseRemoteListLine(first);
      e.listFormat = {
        bytes: Buffer.byteLength(first),
        parsed: parsed !== null,
        fieldsTheParserRequires: REMOTE_LIST_FIELDS,
        tmuxIdRead: parsed?.tmuxId ?? null
      };
    } catch (err) {
      e.listFormat = `threw: ${(err as Error).message.slice(0, 80)}`;
    }
    // The no-server sentence + classifyTmuxFailure class, on a socket with no server.
    {
      const deadSocket = `p324-noserv-${safeId(t.id)}-${String(process.pid)}`;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const deadCtx: any = registerContext(`${id}-dead`, t.bin, deadSocket, `${safeId(t.id)}d`);
      try {
        await execOn(deadCtx, ['list-sessions', '-F', '#{session_id}']);
        e.noServer = 'DID NOT THROW';
      } catch (err) {
        const r = refusalOf(err);
        e.noServer = { code: r.code, detail: (r.detail ?? r.message).slice(0, 160) };
      }
      // The exit status, which execOn's classified error does not carry. The SAME
      // composed plan (`tmuxCommand`, the one execOn spawns) is run once more
      // through the stand-in, so the row's "with exit 1" is this run's reading
      // rather than the spec step's.
      const plan = tmuxCommand(deadCtx, ['list-sessions', '-F', '#{session_id}']);
      const again = spawnSync(plan.file, [...plan.argv], { encoding: 'utf8', timeout: 20_000, env: process.env });
      e.noServerExit = {
        status: again.status,
        stderr: (again.stderr ?? '').split('\n').find((l) => l.trim().length > 0)?.trim().slice(0, 160) ?? ''
      };
    }
    cell.E = e;

    // --- G: the product's own entry point ----------------------------------
    const g: Record<string, unknown> = {};
    const gMark = argvMark();
    try {
      const opened = await openControlPlane(id);
      g.openControlPlane = opened;
      const facts = machineLinkFacts(id);
      g.link = `${facts.link} / ${facts.reason ?? ''}`;
      g.linkKind = facts.link;
      g.reason = facts.reason ?? null;
      if (opened) {
        const deadline = now() + CONTROL_GREETING_DEADLINE_MS;
        while (!isControlPlaneLive(id) && now() < deadline) await sleep(50);
        g.live = isControlPlaneLive(id);
      }
    } catch (err) {
      g.error = refusalOf(err);
    } finally {
      try {
        closeControlPlane(id);
      } catch {
        /* nothing open */
      }
    }
    g.spawns = controlSpawnsSince(gMark, socket);
    cell.G = g;

    // --- C: the shipping transport -----------------------------------------
    const cMark = argvMark();
    cRes = await startClient(remoteControlTransport(id));
    const cOpened = typeof cRes.greetMs === 'number';
    const c: Record<string, unknown> = { opened: cOpened, spawns: controlSpawnsSince(cMark, socket) };
    if (cOpened) {
      c.greetMs = cRes.greetMs;
      const split = await outputSplit(t.bin, socket, cRes, 'c');
      c.outputOnClient = split.onClient;
      c.outputOnRawChild = split.onRawChild;
    } else if (cRes.greetMs === 'hung') {
      c.hung = `no greeting within the ${String(CONTROL_GREETING_DEADLINE_MS)} ms deadline`;
    } else {
      c.refusal = cRes.refusal;
      c.refusedAsUnmeasured = cRes.refusal?.message === CONTROL_DIALECT_UNMEASURED;
    }
    cell.C = c;

    // --- D: the gate-free transport, same plan -----------------------------
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dTransport: any = {
      machineId: id,
      async precheck(): Promise<void> {
        await execOn(ctx, ['display-message', '-p', '#{version}']);
      },
      async plan(): Promise<unknown> {
        return tmuxCommand(ctx, CONTROL_ATTACH_ARGS);
      },
      env(): NodeJS.ProcessEnv {
        return process.env;
      }
    };
    const dMark = argvMark();
    dRes = await startClient(dTransport);
    const dOpened = typeof dRes.greetMs === 'number';
    const d: Record<string, unknown> = dOpened
      ? { greeted: true, greetMs: dRes.greetMs }
      : { greeted: false, greetMs: dRes.greetMs, refusal: dRes.refusal };
    d.spawns = controlSpawnsSince(dMark, socket);
    if (dOpened) {
      // Step 9 FIRST, and the two reads back to back: `#{q:window_activity}` is
      // a live one-second clock, and any write into a session between the two
      // reads (the %output test below types into gmux-control) can straddle a
      // second boundary and make two equal-length lists differ. With the draw
      // pane idle (`exec cat`) and nothing typed yet, the control read and the
      // exec read are milliseconds apart and byte-equal, which is what the
      // row's note claims.
      try {
        const overControl = (await dRes.client.sendCommand(`list-sessions -F '${REMOTE_LIST_FORMAT}'`)).join('\n');
        const overExec = (await execOn(ctx, ['list-sessions', '-F', REMOTE_LIST_FORMAT])).replace(/\n$/, '');
        d.listBytes = [Buffer.byteLength(overControl), Buffer.byteLength(overExec)];
        d.listEqual = overControl === overExec;
      } catch (err) {
        d.list = `threw: ${(err as Error).message.slice(0, 80)}`;
      }
      const split = await outputSplit(t.bin, socket, dRes, 'd');
      d.outputOnClient = split.onClient;
      d.outputOnRawChild = split.onRawChild;
    }
    cell.D = d;

    // --- the dialect stream (raw child), source of the step comparison -----
    cell.dialectVia = 'a raw control child the probe owns, CONTROL_ATTACH_ARGS on the same binary, on a fresh scratch server';
    {
      const dSocket = `p324-dia-${safeId(t.id)}-${String(process.pid)}`;
      sockets.add(dSocket);
      tmuxDirect(t.bin, dSocket, ['start-server', ';', 'set-option', '-s', 'exit-empty', 'off']);
      const dpid = Number(tmuxDirect(t.bin, dSocket, ['display-message', '-p', '#{pid}']).stdout.trim());
      if (Number.isInteger(dpid) && dpid > 1) serverPids.add(dpid);
      try {
        cell.dialect = await measureDialect(t, dSocket);
      } catch (err) {
        cell.dialect = `threw: ${(err as Error).message.slice(0, 120)}`;
      }
      // kill-server inside measureDialect ended it; forget the pid once it is gone.
      if (Number.isInteger(dpid) && dpid > 1) {
        const until = now() + 2_000;
        while (pidAlive(dpid) && now() < until) await sleep(50);
        if (!pidAlive(dpid)) serverPids.delete(dpid);
      }
    }

    // --- S: Phase 320.1's shapes over scroll.ts ----------------------------
    // Over C's client (the shipping transport) when it opened, which it does at
    // HEAD; at the parent C is refused for the new strings, so S runs over D's
    // client, the same class and plan, and says so under `via`.
    const s: Record<string, unknown> = {};
    const scrollClient = cOpened ? cRes : dOpened ? dRes : null;
    s.via = cOpened ? 'C (the shipping transport)' : dOpened ? 'D (C was refused)' : 'none';
    if (scrollClient !== null && drawnSessionId.startsWith('$')) {
      const target = drawnSessionId;
      const calls: RecordedCall[] = [];
      const run = recordingRunner(scrollClient.client, calls);
      try {
        resetSeekSupportForTests();
        s.by30 = (await scrollPaneBy(run, target, 30)).position;
        s.to1500 = (await scrollPaneTo(run, target, 1500)).position;
        s.byMinus10 = (await scrollPaneBy(run, target, -10)).position;
        const by2500 = await scrollPaneBy(run, target, 2500);
        s.by2500Clamped = { position: by2500.position, history: by2500.history };
        // The parked STATE_FORMAT answer, RAW: the string the shipping
        // readPaneScroll was handed, read back from the recorder.
        const parked = await readPaneScroll(run, target);
        const stateCall = calls[calls.length - 1];
        const fields = (stateCall?.raw ?? '').split('\n').find((l) => l.length > 0)?.split('\t') ?? [];
        s.stateFormatRaw = fields;
        s.stateFormatVerb = stateCall ? shapeOf(stateCall.args) : null;
        s.copyPositionLimit = fields[7] ?? '(absent)';
        s.parkedInMode = parked.inMode;
        s.exit = (await exitPaneScroll(run, target)).position;
        s.shapesSent = [...new Set(calls.map((c2) => shapeOf(c2.args)))].sort();
      } catch (err) {
        s.error = (err as Error).message.slice(0, 120);
      }
      // "not in a mode" answers, via the binary on the scratch socket
      const topLine = tmuxDirect(t.bin, socket, ['send-keys', '-t', target, '-X', 'top-line']);
      const cancel = tmuxDirect(t.bin, socket, ['send-keys', '-t', target, '-X', 'cancel']);
      s.noModeTopLine = topLine.stderr.trim() || `exit ${topLine.code}`;
      s.noModeCancel = cancel.stderr.trim() || `exit ${cancel.code}`;
    } else {
      s.notRun = scrollClient === null ? 'no control client open' : 'no drawn session';
    }
    cell.S = s;

    // --- A: the attach, in a node-pty --------------------------------------
    cell.A = drawnSessionId.startsWith('$')
      ? await attachArm(ctx, t.bin, socket, drawName, `P324-DRAWN-${t.id}`)
      : { notRun: 'no drawn session' };
  } finally {
    cRes?.client.stop();
    dRes?.client.stop();
    closeEveryControlPlane();
  }
  return cell;
}

// ---------------------------------------------------------------------------
// The pair, crossing, rollback and ablated arms
// ---------------------------------------------------------------------------

/** A gate-free probe transport over a context: precheck reads without the gate, plan is the shipping composer. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function gateFreeTransport(machineId: string, ctx: any): unknown {
  return {
    machineId,
    async precheck(): Promise<void> {
      await execOn(ctx, ['display-message', '-p', '#{version}']);
    },
    async plan(): Promise<unknown> {
      return tmuxCommand(ctx, CONTROL_ATTACH_ARGS);
    },
    env(): NodeJS.ProcessEnv {
      return process.env;
    }
  };
}

/**
 * A server under `serverBin`, and a control client composed for `programBin`
 * on the same socket: the version read, both gates, C, D (unless it would
 * hang) and, for a pair that must work, A.
 */
async function runPair(tag: string, serverBin: string, programBin: string, mustWork: boolean): Promise<Record<string, unknown>> {
  const socket = `p324-pair-${tag}-${String(process.pid)}`;
  const sid = `p324-pair-${tag}`;
  const progId = `p324-pairprog-${tag}`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const srv: any = registerContext(sid, serverBin, socket, `p${tag}`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prog: any = registerContext(progId, programBin, socket, `pp${tag}`);
  setMachineRemotePath(progId, '/usr/bin:/bin');
  setMachineRemotePath(sid, '/usr/bin:/bin');
  const out: Record<string, unknown> = { tag, server: serverBin.split('/').slice(-3).join('/'), program: programBin.split('/').slice(-3).join('/') };
  const opened: DrivenClient[] = [];
  try {
    await execOn(srv, remoteBootArgs());
    out.serverPid = await ownServerPid(srv);
    const read = await readRemoteTmuxVersion(prog);
    out.versionRead = read.kind === 'version' ? read.version : read.kind;
    const gv = read.kind === 'version' ? read.version : null;
    out.execGate = decideRemoteVersionGate(gv, TESTED_REMOTE_TMUX_VERSIONS, null).kind;
    out.controlGate = decideRemoteControlGate(gv, TESTED_REMOTE_TMUX_VERSIONS).kind;
    const cMark = argvMark();
    const cRes = await startClient(remoteControlTransport(progId));
    opened.push(cRes);
    out.C =
      typeof cRes.greetMs === 'number'
        ? { opened: true, greetMs: cRes.greetMs, spawns: controlSpawnsSince(cMark, socket) }
        : cRes.greetMs === 'hung'
          ? { opened: false, hung: `no greeting within ${String(CONTROL_GREETING_DEADLINE_MS)} ms`, spawns: controlSpawnsSince(cMark, socket) }
          : {
              opened: false,
              refusal: cRes.refusal,
              refusedAsUnmeasured: cRes.refusal?.message === CONTROL_DIALECT_UNMEASURED,
              spawns: controlSpawnsSince(cMark, socket)
            };
    cRes.client.stop();
    if (mustWork) {
      const dMark = argvMark();
      const dRes = await startClient(gateFreeTransport(progId, prog));
      opened.push(dRes);
      out.D =
        typeof dRes.greetMs === 'number'
          ? { greeted: true, greetMs: dRes.greetMs, spawns: controlSpawnsSince(dMark, socket) }
          : { greeted: false, greetMs: dRes.greetMs, spawns: controlSpawnsSince(dMark, socket) };
      dRes.client.stop();
      // A: a drawn session on the server, attached through the OTHER program.
      const drawName = `p324-pdraw-${tag}`;
      try {
        await execOn(
          srv,
          remoteCreateArgs({
            tmuxName: drawName,
            sessionId: 'p324-pdraw',
            argv: ['/bin/sh', '-c', `seq 1 300; echo P324-DRAWN-PAIR-${tag}; exec cat`]
          })
        );
        await sleep(300);
        out.A = await attachArm(prog, programBin, socket, drawName, `P324-DRAWN-PAIR-${tag}`);
      } catch (err) {
        out.A = { error: (err as Error).message.slice(0, 120) };
      }
    } else {
      out.D = 'not run (would hang to the 10 s deadline; research 131 §3.4)';
    }
  } catch (err) {
    out.error = (err as Error).message.slice(0, 160);
  } finally {
    for (const r of opened) r.client.stop();
    closeEveryControlPlane();
  }
  return out;
}

/**
 * The rolled-back program: a server under `serverBin`, the SHIPPING transport
 * composed for an older `programBin`. The precheck must throw, the server's
 * pid must be unchanged, and no far control child may be spawned.
 */
async function runRollback(tag: string, serverBin: string, programBin: string): Promise<Record<string, unknown>> {
  const socket = `p324-rb-${tag}-${String(process.pid)}`;
  const sid = `p324-rb-${tag}`;
  const progId = `p324-rbprog-${tag}`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const srv: any = registerContext(sid, serverBin, socket, `rb${tag}`);
  registerContext(progId, programBin, socket, `rbp${tag}`);
  // BOTH contexts need a recorded program search list before a mutating verb:
  // the server context uses `new-session` below, and the ordering gate refuses
  // a mutating verb before the path is read (exec-plane.ts PATH_BEFORE_MUTATION,
  // which production satisfies through ensureRemoteServer's captureRemotePath).
  setMachineRemotePath(progId, '/usr/bin:/bin');
  setMachineRemotePath(sid, '/usr/bin:/bin');
  const out: Record<string, unknown> = { tag, serverBin: serverBin.split('/').slice(-3).join('/'), programBin: programBin.split('/').slice(-3).join('/') };
  let client: DrivenClient | null = null;
  try {
    await execOn(srv, remoteBootArgs());
    // Record the server pid the instant it is born, BEFORE any later step can
    // throw, so the finally and the global cleanup always own it.
    const pid = await ownServerPid(srv);
    out.serverPid = pid;
    await execOn(srv, ['new-session', '-d', '-s', `p324-held-${tag}`, 'exec cat']);
    const mark = argvMark();
    client = await startClient(remoteControlTransport(progId));
    out.C = typeof client.greetMs === 'number' ? { opened: true } : client.greetMs === 'hung' ? { opened: false, hung: true } : { opened: false, refusal: client.refusal };
    client.client.stop();
    await sleep(600);
    out.controlSpawns = controlSpawnsSince(mark, socket);
    out.controlChildrenAlive = execFileSync('/bin/ps', ['-Ao', 'command'], { encoding: 'utf8' })
      .split('\n')
      .filter((l) => namesSocket(l, socket) && l.includes(' -C ')).length;
    out.serverAlive = pid !== null && pidAlive(pid);
    out.pidAfter = out.serverAlive ? Number((await execOn(srv, ['display-message', '-p', '#{pid}'])).trim()) : null;
    out.pidUnchanged = out.serverAlive === true && out.pidAfter === pid;
  } catch (err) {
    out.error = (err as Error).message.slice(0, 160);
  } finally {
    client?.client.stop();
    closeEveryControlPlane();
  }
  return out;
}

/**
 * THE DOWNGRADE (the fix round, 2026-09-30). A LIVE connection opened through
 * the product's own entry point, `openControlPlane`, whose program is then
 * downgraded IN PLACE to 3.5a, after which its control child ends by the
 * probe's own `detach-client`, so the SHIPPING client's reconnect runs.
 *
 * It is the path the precheck exists for, and no other arm reached it: every
 * other arm opens a client once and never reconnects. Phase 324's attack
 * verifier found that a three line "read once per client" flag in the
 * transport passed conformance:machines, every unit test AND this probe, and
 * that driven over real ssh this way it spawned -C through 3.5a with no read,
 * which ended the server and every session in it and started a fresh 3.5a
 * server on the socket that the link then called connected.
 *
 * The program is a symlink in the run directory, `<run>/dg-<tag>/bin/tmux`,
 * made for the target build and re-pointed at 3.5a by an atomic rename, so the
 * far strings before and after name the SAME program path, exactly as a
 * package upgrade or rollback on a real machine leaves them. After the
 * downgrade, the reconnect must ask the server for its version at least once
 * (that read fails on a 3.6-family server and leaves it alive), spawn no far
 * control child, and leave the server, its pid and its held session as they
 * were. A server that is gone is recorded, and any fresh server on the socket
 * is asked through both programs and ended by the pid it reports.
 */
async function runDowngrade(tag: string, serverBin: string, olderBin: string): Promise<Record<string, unknown>> {
  const socket = `p324-dg-${tag}-${String(process.pid)}`;
  const id = `p324-dg-${tag}`;
  const binDir = join(RUN!, `dg-${tag}`, 'bin');
  mkdirSync(binDir, { recursive: true });
  const link = join(binDir, 'tmux');
  symlinkSync(serverBin, link);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ctx: any = registerContext(id, link, socket, `dg${tag}`);
  setMachineRemotePath(id, '/usr/bin:/bin');
  const out: Record<string, unknown> = { tag, server: serverBin.split('/').slice(-3).join('/'), downgradedTo: olderBin.split('/').slice(-3).join('/') };
  let pid: number | null = null;
  try {
    await execOn(ctx, remoteBootArgs());
    pid = await ownServerPid(ctx);
    out.serverPid = pid;
    await execOn(ctx, ['new-session', '-d', '-s', 'p324-dg-held', 'exec cat']);
    const openMark = argvMark();
    const opened = await openControlPlane(id);
    out.opened = opened;
    if (opened) {
      const deadline = now() + CONTROL_GREETING_DEADLINE_MS;
      while (!isControlPlaneLive(id) && now() < deadline) await sleep(50);
    }
    out.live = isControlPlaneLive(id);
    out.spawnsBeforeDowngrade = controlSpawnsSince(openMark, socket);
    if (!opened || out.live !== true) {
      out.downgrade = opened ? 'not run (the connection never went live)' : 'not run (openControlPlane answered false, so there is no connection to reconnect)';
      const facts = machineLinkFacts(id);
      out.link = `${facts.link} / ${facts.reason ?? ''}`;
      return out;
    }
    // The downgrade, in place: the same path now runs 3.5a.
    const staged = `${link}.p324-next`;
    symlinkSync(olderBin, staged);
    renameSync(staged, link);
    const mark = argvMark();
    // The control child ends by the probe's own detach-client, sent through the
    // SERVER's own program on the scratch socket, never through execOn.
    const detached = tmuxDirect(serverBin, socket, ['detach-client', '-s', '=gmux-control']);
    out.detachExit = detached.code;
    // The shipping client reconnects after 500 ms, then 1 s, then 2 s. Wait
    // for two reads after the downgrade, or 6 s, then 1 s more for any child.
    const readsSince = (): number =>
      farSince(mark).filter((l) => namesSocket(l, socket) && l.replace(/'/g, '').endsWith(' display-message -p #{version}')).length;
    const until = now() + 6_000;
    while (readsSince() < 2 && now() < until) await sleep(100);
    await sleep(1_000);
    out.readsAfterDowngrade = readsSince();
    out.controlSpawnsAfterDowngrade = controlSpawnsSince(mark, socket);
    const facts = machineLinkFacts(id);
    out.linkAfter = `${facts.link} / ${facts.reason ?? ''}`;
    out.linkKindAfter = facts.link;
    closeControlPlane(id);
    await sleep(300);
    out.controlChildrenAlive = execFileSync('/bin/ps', ['-Ao', 'command'], { encoding: 'utf8' })
      .split('\n')
      .filter((l) => namesSocket(l, socket) && l.includes(' -C ')).length;
    out.serverAlive = pid !== null && pidAlive(pid);
    const asked = tmuxDirect(serverBin, socket, ['display-message', '-p', '#{pid}']);
    const pidNow = asked.code === 0 ? Number(asked.stdout.trim()) : null;
    out.pidUnchanged = out.serverAlive === true && pidNow === pid;
    out.heldSessionPresent = tmuxDirect(serverBin, socket, ['has-session', '-t', '=p324-dg-held']).code === 0;
    if (pid !== null && !pidAlive(pid)) serverPids.delete(pid);
    // A fresh server a reconnect may have started through the older program:
    // asked through both programs, owned, and ended by the pid it reports.
    for (const bin of [serverBin, olderBin]) {
      const fresh = tmuxDirect(bin, socket, ['display-message', '-p', '#{pid}']);
      if (fresh.code !== 0) continue;
      const freshPid = Number(fresh.stdout.trim());
      if (Number.isInteger(freshPid) && freshPid > 1 && freshPid !== pid) {
        out.freshServerPid = freshPid;
        serverPids.add(freshPid);
        signalOurs(freshPid, 'SIGTERM');
      }
    }
  } catch (err) {
    out.error = (err as Error).message.slice(0, 160);
  } finally {
    try {
      closeControlPlane(id);
    } catch {
      /* nothing open */
    }
  }
  return out;
}

/** The ablated cell: a 3.6 server under a 3.5a program, precheck removed, must END. */
async function runAblated(
  server36: string,
  program35: string,
  reports: (sinceMs: number) => string[]
): Promise<Record<string, unknown>> {
  const socket = `p324-abl-${String(process.pid)}`;
  const sid = `p324-abl-srv`;
  const progId = `p324-abl-prog`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const srv: any = registerContext(sid, server36, socket, 'abl');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prog: any = registerContext(progId, program35, socket, 'ablp');
  // BOTH contexts need a recorded program search list before a mutating verb:
  // the server context runs `new-session` below. Without it, `new-session`
  // throws PATH_BEFORE_MUTATION and the server `remoteBootArgs()` made leaks.
  setMachineRemotePath(progId, '/usr/bin:/bin');
  setMachineRemotePath(sid, '/usr/bin:/bin');
  const out: Record<string, unknown> = {};
  // The window opens here, so a report this cell's crash writes is counted
  // whatever macOS has rotated or retired since (see tmuxIpsSince).
  const cellStartedAt = Date.now();
  let client: { stop: () => void } | null = null;
  try {
    await execOn(srv, remoteBootArgs());
    // Record the server pid the instant it is born, BEFORE any later step can
    // throw, so the finally and the global cleanup always own it.
    const pid = await ownServerPid(srv);
    out.serverPid = pid;
    await execOn(srv, ['new-session', '-d', '-s', 'p324-abl-held', 'exec cat']);
    // A transport with NO precheck and the SHIPPING plan (the older program).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ablTransport: any = {
      machineId: progId,
      async precheck(): Promise<void> {
        /* the ablation: nothing */
      },
      async plan(): Promise<unknown> {
        return tmuxCommand(prog, CONTROL_ATTACH_ARGS);
      },
      env(): NodeJS.ProcessEnv {
        return process.env;
      }
    };
    const mark = argvMark();
    const c = new TmuxControlClient(ablTransport);
    client = c;
    clients.push(c);
    c.on('error', () => undefined);
    // Stop at the FIRST disconnect, before a reconnect can start a fresh server
    // on that socket (research 131 §9 item 9).
    const gone = new Promise<void>((resolve) => c.once('disconnected', () => resolve()));
    c.start().catch(() => undefined);
    const firstDisconnect = await Promise.race([gone.then(() => true), sleep(4_000).then(() => false)]);
    c.stop();
    out.disconnectedWithin4s = firstDisconnect;
    out.controlSpawns = controlSpawnsSince(mark, socket);
    const until = now() + 2_000;
    while (pid !== null && pidAlive(pid) && now() < until) await sleep(50);
    out.serverEnded = pid !== null && !pidAlive(pid);
    if (pid !== null && !pidAlive(pid)) serverPids.delete(pid);
    // Any fresh server a reconnect may have started, asked through the 3.6
    // program and ended by the pid it reports.
    const fresh = tmuxDirect(server36, socket, ['display-message', '-p', '#{pid}']);
    if (fresh.code === 0) {
      const freshPid = Number(fresh.stdout.trim());
      if (Number.isInteger(freshPid) && freshPid > 1 && freshPid !== pid) {
        out.freshServerPid = freshPid;
        serverPids.add(freshPid);
        signalOurs(freshPid, 'SIGTERM');
      }
    } else {
      out.freshServer = 'none';
    }
  } catch (err) {
    out.error = (err as Error).message.slice(0, 160);
  } finally {
    client?.stop();
  }
  await sleep(1_000);
  out.reportsWritten = reports(cellStartedAt);
  return out;
}

/**
 * The tmux crash reports written since `sinceMs`, by name.
 *
 * macOS's crash reporter writes tmux-*.ips into the REAL user's
 * DiagnosticReports by uid, not into the driver's scratch $HOME, so this reads
 * P324_REAL_HOME (the orchestrator's own home) rather than $HOME, which the
 * orchestrator rebuilt to <run>/home.
 *
 * THE RULED ROUND (2026-09-30) made it a window rather than a count. macOS
 * keeps about 25 top-level reports and moves older ones into `Retired/`, so a
 * count of the top level before and after can stand still or fall while a run
 * writes one: on 2026-09-30 every tmux report moved to `Retired/` at about
 * 06:46 and the top level read 0. A report counts here when its mtime is at or
 * after the moment the window opened, in either directory, and a rename into
 * `Retired/` keeps the mtime. Names and mtimes only: no report is opened, read
 * or deleted.
 */
function tmuxIpsSince(sinceMs: number): string[] {
  const home = process.env['P324_REAL_HOME'] ?? process.env['HOME'] ?? '/tmp';
  const top = join(home, 'Library', 'Logs', 'DiagnosticReports');
  const out: string[] = [];
  for (const [dir, prefix] of [
    [top, ''],
    [join(top, 'Retired'), 'Retired/']
  ] as const) {
    let names: string[] = [];
    try {
      names = readdirSync(dir);
    } catch {
      continue;
    }
    for (const name of names) {
      if (!/^tmux-.*\.ips$/.test(name)) continue;
      try {
        if (statSync(join(dir, name)).mtimeMs >= sinceMs) out.push(`${prefix}${name}`);
      } catch {
        // Gone between the listing and the stat: retired or rotated away.
      }
    }
  }
  return out.sort();
}

// ---------------------------------------------------------------------------
// The finally
// ---------------------------------------------------------------------------

function tmuxSocketDir(): string {
  const uid = typeof process.getuid === 'function' ? process.getuid() : 0;
  return join('/tmp', `tmux-${String(uid)}`);
}

/** Processes whose command line names one of THIS run's sockets. */
function processesOnOwnSockets(): number {
  try {
    return execFileSync('/bin/ps', ['-Ao', 'command'], { encoding: 'utf8' })
      .split('\n')
      .filter((l) => [...sockets].some((s) => namesSocket(l, s))).length;
  } catch {
    return -1;
  }
}

/** Processes naming ANY `-L p324-` socket, this run's or another's. Printed only. */
function processesOnAnyP324(): number {
  try {
    return execFileSync('/bin/ps', ['-Ao', 'command'], { encoding: 'utf8' })
      .split('\n')
      .filter((l) => /(^|\s)-L\s*'?p324-/.test(l)).length;
  } catch {
    return -1;
  }
}

let cleaned: Promise<{ own: number; any: number }> | null = null;
function cleanup(): Promise<{ own: number; any: number }> {
  if (cleaned !== null) return cleaned;
  cleaned = (async (): Promise<{ own: number; any: number }> => {
    for (const c of clients) {
      try {
        c.stop();
      } catch {
        /* gone */
      }
    }
    try {
      closeEveryControlPlane();
    } catch {
      /* nothing open */
    }
    // The raw control children and the ptys, SIGTERM then SIGKILL.
    for (const child of [...rawChildren]) {
      try {
        child.kill('SIGTERM');
      } catch {
        /* gone */
      }
    }
    for (const p of ptys) p.kill();
    // Each server by the pid it reported, SIGTERM then SIGKILL, and only while
    // that pid is still this run's (`stillOurs`): a server that ended earlier
    // has left a number the system may already have handed to something else.
    for (const pid of serverPids) signalOurs(pid, 'SIGTERM');
    const until = now() + 2_000;
    const stragglers = (): number[] => [
      ...[...serverPids].filter(stillOurs),
      ...[...rawChildren].map((c) => c.pid ?? 0).filter(stillOurs),
      ...ptys.map((p) => p.pid).filter(stillOurs)
    ];
    while (stragglers().length > 0 && now() < until) await sleep(50);
    for (const pid of stragglers()) signalOurs(pid, 'SIGKILL');
    await sleep(200);
    // Unlink only the socket files this run named, only once nothing names them.
    const dir = tmuxSocketDir();
    if (processesOnOwnSockets() === 0) {
      for (const name of sockets) {
        const full = join(dir, name);
        try {
          if (lstatSync(full).isSocket()) unlinkSync(full);
        } catch {
          /* never made, or gone */
        }
      }
    }
    return { own: processesOnOwnSockets(), any: processesOnAnyP324() };
  })();
  return cleaned;
}

for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP'] as const) {
  process.on(sig, () => {
    void cleanup().finally(() => process.exit(130));
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<number> {
  mkdirSync(RUN!, { recursive: true });
  const results: Record<string, unknown> = {
    root: ROOT,
    parent: process.env['P324_PARENT_CHECKOUT'] ?? null,
    reference: REFERENCE_ID,
    ablatePrecheck,
    testedRemoteVersions: (TESTED_REMOTE_TMUX_VERSIONS as ReadonlyArray<{ version: string }>).map((r) => r.version),
    // NAMES only, never a value: what the far side saw, since execOn hands
    // process.env to every spawn.
    envNames: Object.keys(process.env).sort(),
    controlDialectUnmeasured: CONTROL_DIALECT_UNMEASURED,
    // THE RULED ROUND: the window the crash reports are counted in opens here.
    ipsWindowOpenedAt: Date.now(),
    targets: {} as Record<string, unknown>
  };
  const startedAt = now();
  try {
    const byId = new Map<string, TargetSpec>();
    for (const t of targets) byId.set(t.id, t);

    // Per-target arms
    for (const t of targets) {
      if (t.role === 'pair') continue; // 3.5a is only a program/server for the pair arms
      try {
        (results.targets as Record<string, unknown>)[t.id] = await runTarget(t);
      } catch (err) {
        (results.targets as Record<string, unknown>)[t.id] = { fatal: (err as Error).message.slice(0, 200), stack: (err as Error).stack?.split('\n').slice(0, 4) };
      }
    }

    // Pairs that must work: 3.6 under 3.7b, 3.6b under 3.7c
    const pairs: Record<string, unknown> = {};
    const bin = (id: string): string | null => byId.get(id)?.bin ?? null;
    if (bin('3.6') && bin('3.7b')) pairs['3.6-under-3.7b'] = await runPair('36u37b', bin('3.6')!, bin('3.7b')!, true);
    if (bin('3.6b') && bin('3.7c')) pairs['3.6b-under-3.7c'] = await runPair('36bu37c', bin('3.6b')!, bin('3.7c')!, true);
    // Crossing 3.6: a 3.5a server under 3.6 and 3.6b programs (D not run — would hang)
    if (bin('3.5a') && bin('3.6')) pairs['3.5a-under-3.6'] = await runPair('35au36', bin('3.5a')!, bin('3.6')!, false);
    if (bin('3.5a') && bin('3.6b')) pairs['3.5a-under-3.6b'] = await runPair('35au36b', bin('3.5a')!, bin('3.6b')!, false);
    results.pairs = pairs;

    // Rollback: 3.6, 3.6a and 3.6b servers each under a 3.5a program
    const rollback: Record<string, unknown> = {};
    if (bin('3.5a')) {
      for (const srv of ['3.6', '3.6a', '3.6b']) {
        if (bin(srv)) rollback[`${srv}-under-3.5a`] = await runRollback(safeId(srv), bin(srv)!, bin('3.5a')!);
      }
    }
    results.rollback = rollback;

    // The downgrade (the fix round): a live connection whose program becomes
    // 3.5a in place, then reconnects. 3.6a is the control that opens at both
    // builds; 3.6 and 3.6b open at HEAD and are never opened at the parent.
    const downgrade: Record<string, unknown> = {};
    if (bin('3.5a')) {
      for (const srv of ['3.6', '3.6b', '3.6a']) {
        if (bin(srv)) downgrade[`${srv}-to-3.5a`] = await runDowngrade(safeId(srv), bin(srv)!, bin('3.5a')!);
      }
    }
    results.downgrade = downgrade;

    // The ablated cell (once), unless P324_ABLATE_PRECHECK=0
    if (!ablatePrecheck) {
      results.ablated = 'not run (P324_ABLATE_PRECHECK=0)';
    } else if (bin('3.6') && bin('3.5a')) {
      results.ablated = await runAblated(bin('3.6')!, bin('3.5a')!, tmuxIpsSince);
    } else {
      results.ablated = 'not run (3.6 or 3.5a build missing)';
    }
  } catch (err) {
    results.fatal = (err as Error).message.slice(0, 300);
  } finally {
    const left = await cleanup();
    results.tmuxLeftOnOwnSockets = left.own;
    results.tmuxLeftOnAnyP324 = left.any;
    results.ipsWrittenDuringRun = tmuxIpsSince(Number(results.ipsWindowOpenedAt));
    results.argvSeenCount = argvSeen.length;
    results.driverMs = now() - startedAt;
    writeFileSync(join(RUN!, 'results.json'), JSON.stringify(results, null, 2));
    process.stdout.write(
      `drive-p324: results.json written, ${String(left.own)} tmux left on this run's sockets, ` +
        `${String(left.any)} on any -L p324- socket\n`
    );
  }
  return results.fatal === undefined && results.tmuxLeftOnOwnSockets === 0 ? 0 : 1;
}

main().then(
  (code) => process.exit(code),
  (err) => {
    process.stderr.write(`drive-p324: ${(err as Error).message}\n${(err as Error).stack ?? ''}\n`);
    void cleanup().finally(() => process.exit(1));
  }
);
