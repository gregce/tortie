/**
 * version.ts — which tmux Tortie carries, which server versions it will talk
 * to, and the gate that runs before the first attach (Phase 41).
 *
 * ## Why a gate exists at all
 *
 * Tortie now ships its own tmux inside the application bundle, so a packaged
 * app always runs the version this release was built against. The server it
 * finds on the machine is a different matter. A tmux server keeps running
 * across quits, crashes and updates, so the copy of Tortie that starts today
 * can meet a server an older copy created weeks ago, and that server keeps the
 * version of the binary that made it. Tortie never restarts, signals,
 * reconfigures or upgrades a running server, because every session the user
 * cares about is inside it. A new bundled version becomes the server only when
 * Tortie creates a server, which in practice means after a reboot.
 *
 * The danger is not a clean error. MEASURED here on 2026-08-15, on scratch
 * sockets, never the real one:
 *
 *   client 3.7b -> server 3.6a   display-message answers "3.6a", exit 0
 *   client 3.6a -> server 3.7b   display-message answers "3.7b", exit 0
 *   client 3.7b -> server 3.5a   display-message answers "3.5a", exit 0
 *   client 3.5a -> server 3.7b   "server exited unexpectedly", exit 1
 *   client 3.7b -> server 3.5a, control mode `-C new-session -A`
 *                                prints "%exit" and then HANGS. Still
 *                                running after 8 s, killed by the probe.
 *
 * The last line is the one this module exists for. The first thing Tortie does
 * after `ensureServer` is a control mode attach, and across a broken version
 * boundary that attach hangs instead of failing. A hang reads to the user as
 * Tortie freezing on work they care about. So the version is read FIRST, with
 * a short timeout, using a command that answers in every direction measured
 * above, and the boot stops with a screen when the pair is one this release
 * never tested.
 *
 * ## The zero session question, which research 43 left open
 *
 * MEASURED 2026-08-15 on socket gmux-p41-b-empty, a warm server created with
 * resources/gmux-tmux.conf, one session created and then killed, so the server
 * sat at zero sessions with `exit-empty off`:
 *
 *   tmux -L <scratch> list-sessions                 exit 0, no rows
 *   tmux -L <scratch> display-message -p '#{version}'  prints "3.7b", exit 0
 *   tmux -L <scratch> list-sessions -F '#{version}'    prints nothing, exit 0
 *
 * So `display-message` is the read that carries the empty server, and the
 * `list-sessions` fallback answers nothing exactly when there are no sessions.
 * The fallback is kept as belt and braces for a server that has sessions and
 * whose `display-message` fails for some reason nobody has seen yet. It is not
 * load bearing, and the order below is the right way round because of that.
 *
 * ## No import cycle
 *
 * This module never imports the supervisor. The caller hands it the exec
 * function, which keeps the gate a pure decision plus two reads and lets the
 * unit tests drive every branch in plain node.
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { gmuxError } from '../errors';
import { getLog } from '../log';
import type { TmuxBinarySource } from './resolve';

const execFileP = promisify(execFile);

/** Scope "tmux" (Phase 35), the same log this directory already writes to. */
const tmuxLog = getLog('tmux');

// ---------------------------------------------------------------------------
// The pin, mirrored from build/tmux-release.json
// ---------------------------------------------------------------------------

/**
 * The tmux version Tortie builds and ships inside the application bundle.
 *
 * THE NAME IS LOAD BEARING. `build/check-tmux-pin.cjs` text-scans this file
 * for `BUNDLED_TMUX_VERSION` and fails the build when the value here and the
 * value in build/tmux-release.json disagree. src/main may not import from
 * build/ (the forbidden import check draws that line), so the runtime carries
 * its own copy and a script proves the two copies agree.
 */
export const BUNDLED_TMUX_VERSION = '3.7b';

/** One server version and one client version, measured working together. */
export interface TmuxVersionPair {
  server: string;
  client: string;
}

/**
 * Server and client versions measured working together for THIS release,
 * including a real attach that moved terminal bytes.
 *
 * The pair is ORDERED. Server 3.6a with client 3.7b is a different case from
 * server 3.7b with client 3.6a, and only the first one is tested here. The
 * measurements at the top of this file show why the direction matters: an
 * older client against a newer server is the direction that fails outright.
 *
 * THE NAME IS LOAD BEARING, for the same reason as `BUNDLED_TMUX_VERSION`.
 */
export const TESTED_TMUX_PAIRS: readonly TmuxVersionPair[] = [
  { server: '3.6a', client: '3.7b' }
];

// ---------------------------------------------------------------------------
// Reading versions
// ---------------------------------------------------------------------------

/**
 * How long either read gets before Tortie gives up on it.
 *
 * 2,000 ms rather than the 10,000 ms `execTmux` defaults to. This read sits in
 * front of every boot, and a server that will not answer in two seconds is one
 * the gate should treat as unreadable rather than one the user waits on.
 */
export const TMUX_VERSION_PROBE_TIMEOUT_MS = 2_000;

/** The one door shape this module needs from the supervisor. */
export type TmuxExec = (
  args: readonly string[],
  options?: { timeoutMs?: number }
) => Promise<string>;

/** Pull "3.7b" out of "tmux 3.7b", or out of a bare "3.7b". Null when neither. */
export function parseTmuxVersion(text: string): string | null {
  const first = text.split('\n')[0]?.trim() ?? '';
  if (first.length === 0) return null;
  const withPrefix = /^tmux\s+(\S+)/i.exec(first);
  if (withPrefix?.[1] !== undefined) return withPrefix[1];
  // `#{version}` answers the bare number, with no "tmux " in front of it.
  return /^[0-9][A-Za-z0-9.+-]*$/.test(first) ? first : null;
}

/** One measured client version per binary path, for the life of the process. */
const clientVersions = new Map<string, string | null>();

/**
 * What `<bin> -V` says. It contacts no server and it starts no server.
 *
 * Cached by path, because the control client's reconnect loop can drive
 * `ensureServer` more than once and a process cannot change the bytes of a
 * binary it already ran.
 */
export async function readClientVersion(bin: string): Promise<string | null> {
  const cached = clientVersions.get(bin);
  if (cached !== undefined) return cached;
  let answer: string | null = null;
  try {
    const { stdout } = await execFileP(bin, ['-V'], {
      timeout: TMUX_VERSION_PROBE_TIMEOUT_MS
    });
    answer = parseTmuxVersion(stdout);
  } catch {
    answer = null;
  }
  clientVersions.set(bin, answer);
  return answer;
}

/** One read, returning null for anything that is not a version. */
async function tryRead(exec: TmuxExec, args: readonly string[]): Promise<string | null> {
  try {
    return parseTmuxVersion(
      await exec(args, { timeoutMs: TMUX_VERSION_PROBE_TIMEOUT_MS })
    );
  } catch {
    return null;
  }
}

/**
 * What version the server on the other end of the socket is running.
 *
 * `display-message -p '#{version}'` first, because it is the read that answers
 * on a server holding zero sessions. `list-sessions -F '#{version}'` second,
 * which answers from a session row when one exists. Null means neither read
 * produced a version.
 */
export async function readServerVersion(exec: TmuxExec): Promise<string | null> {
  const primary = await tryRead(exec, ['display-message', '-p', '#{version}']);
  if (primary !== null) return primary;
  return tryRead(exec, ['list-sessions', '-F', '#{version}']);
}

// ---------------------------------------------------------------------------
// The decision
// ---------------------------------------------------------------------------

/** What the two version reads add up to. */
export type VersionGate =
  | { kind: 'same' }
  | { kind: 'tested-pair'; server: string; client: string }
  | { kind: 'untested-pair'; server: string; client: string }
  | { kind: 'unreadable'; server: string | null; client: string | null }
  | { kind: 'skip' };

/** What the gate needs to know. Pure input, so the decision is pure. */
export interface VersionGateInput {
  /** What the running server answered, or null when it would not answer. */
  server: string | null;
  /** What `<bin> -V` answered, or null when it would not answer. */
  client: string | null;
  /** True when this is a packaged Tortie. */
  packaged: boolean;
}

/**
 * Turn two version reads into one of five outcomes. Pure, and exhaustively
 * unit tested.
 *
 * THE TWO ASYMMETRIES, and why each one points the safe way.
 *
 * A server Tortie cannot read BLOCKS. The server answered `list-sessions` a
 * moment earlier, so a version read that fails twice is an anomaly, and
 * attaching to a server nobody can identify is the case that hangs. Blocking
 * costs the user a screen with two ways forward. Not blocking can cost them a
 * freeze on live work.
 *
 * A client Tortie cannot read does NOT block a development build. There the
 * binary is whatever the developer has on PATH, the log says the read failed,
 * and stopping every dev run on a probe failure buys nothing. In a packaged
 * build there is no such doubt, so a failed `-V` falls back to
 * {@link BUNDLED_TMUX_VERSION}, which is what this build shipped.
 *
 * The skip test comes FIRST, ahead of the server test. A development build
 * that could not read its own client version has nothing to compare against,
 * so calling that case unreadable would block every such run on a comparison
 * that was never possible.
 */
export function decideVersionGate(input: VersionGateInput): VersionGate {
  const client =
    input.client ?? (input.packaged ? BUNDLED_TMUX_VERSION : null);
  if (client === null) return { kind: 'skip' };
  if (input.server === null) {
    return { kind: 'unreadable', server: null, client };
  }
  if (input.server === client) return { kind: 'same' };
  const tested = TESTED_TMUX_PAIRS.some(
    (pair) => pair.server === input.server && pair.client === client
  );
  return tested
    ? { kind: 'tested-pair', server: input.server, client }
    : { kind: 'untested-pair', server: input.server, client };
}

// ---------------------------------------------------------------------------
// The words
// ---------------------------------------------------------------------------

/**
 * The sentence the user reads when the boot stops.
 *
 * It is composed HERE, in main, because this is the only place that holds both
 * version numbers. The renderer draws it and adds the paragraphs around it.
 *
 * `build/assert-bundle-refusals.mjs` pins the static fragments of both shapes
 * under `tmux.untested-version-pair`. If the bundler ever removes this branch,
 * Tortie attaches across a pair nobody tested and the failure the user sees is
 * a freeze.
 */
export function versionBlockMessage(gate: VersionGate): string {
  if (gate.kind === 'untested-pair') {
    return (
      `The session server on this machine is running tmux ${gate.server}. ` +
      `Tortie runs tmux ${gate.client}. ` +
      'Tortie has not tested that pair, so it will not attach to it.'
    );
  }
  return (
    'Tortie could not read the version of the session server that is already ' +
    'running. It will not attach to a server it cannot identify.'
  );
}

/** The technical line under the screen. Not product copy, and never a sentence. */
export function versionBlockDetail(
  gate: VersionGate,
  socket: string,
  bin: string
): string {
  const server =
    gate.kind === 'untested-pair' || gate.kind === 'unreadable'
      ? (gate.server ?? 'unreadable')
      : 'unknown';
  const client =
    gate.kind === 'untested-pair' || gate.kind === 'unreadable'
      ? (gate.client ?? 'unreadable')
      : 'unknown';
  return `server ${server}, client ${client}, socket ${socket}, client at ${bin}`;
}

// ---------------------------------------------------------------------------
// The gate, as the supervisor calls it
// ---------------------------------------------------------------------------

/** Everything the gate needs from its caller. */
export interface ServerVersionGateInput {
  /** The supervisor's `execTmux`, already bound to the socket and the conf. */
  exec: TmuxExec;
  /** Absolute path to the tmux binary this process runs. */
  bin: string;
  /** Socket name, for the technical detail line. */
  socket: string;
  /** True when this is a packaged Tortie. */
  packaged: boolean;
}

/**
 * A pass outcome, remembered for the life of the process.
 *
 * A pass is remembered so the control client's reconnect loop does not re-probe
 * a server it already agreed with. A BLOCK is deliberately not remembered: the
 * user's way forward is to end the old server themselves and press Check again,
 * and a remembered block would make that button do nothing.
 */
let memoisedPass: VersionGate | null = null;

/** True once the "the bundled tmux is not the version we expected" line was said. */
let saidClientMismatch = false;

/** Clear everything this module remembers. Called by `resetTmuxContext()`. */
export function resetTmuxVersionState(): void {
  memoisedPass = null;
  saidClientMismatch = false;
  clientVersions.clear();
}

/** What the gate decided last, for a harness or a bug report. Null before boot. */
export function lastVersionGate(): VersionGate | null {
  return memoisedPass;
}

/**
 * Read both versions, decide, and stop the boot when the pair is one this
 * release never tested.
 *
 * The supervisor calls this on a WARM server only, immediately after the
 * `serverWasAlreadyRunning` test and therefore before the control client's
 * `-C new-session -A` attach, which is the call measured hanging at the top of
 * this file.
 *
 * @throws GmuxError TMUX_VERSION_UNTESTED
 */
export async function assertServerVersionUsable(
  input: ServerVersionGateInput
): Promise<VersionGate> {
  if (memoisedPass !== null) return memoisedPass;

  const server = await readServerVersion(input.exec);
  const client = await readClientVersion(input.bin);
  if (
    input.packaged &&
    client !== null &&
    client !== BUNDLED_TMUX_VERSION &&
    !saidClientMismatch
  ) {
    saidClientMismatch = true;
    tmuxLog.warn(
      `The bundled tmux reports ${client} and this build expects ` +
        `${BUNDLED_TMUX_VERSION}.`
    );
  }

  const gate = decideVersionGate({ server, client, packaged: input.packaged });
  if (gate.kind === 'untested-pair' || gate.kind === 'unreadable') {
    throw gmuxError(
      'TMUX_VERSION_UNTESTED',
      versionBlockMessage(gate),
      versionBlockDetail(gate, input.socket, input.bin)
    );
  }
  if (gate.kind === 'tested-pair') {
    tmuxLog.info(
      `tmux versions differ: the session server runs ${gate.server} and ` +
        `Tortie runs ${gate.client}. This pair is tested for this release.`
    );
  }
  memoisedPass = gate;
  return gate;
}

/** Where the binary that just created a server came from, in plain words. */
function sourcePhrase(source: TmuxBinarySource, bin: string): string {
  if (source === 'bundled') return 'the copy inside the application bundle';
  if (source === 'dev-override') return 'GMUX_TMUX_BIN';
  return bin;
}

/**
 * Say which tmux created the server, once, on the cold path.
 *
 * It costs one command on a server that was created a moment ago, and it buys
 * two things. Every ordinary development run exercises the same `#{version}`
 * read the warm path depends on, so a read that breaks shows up in the log long
 * before it can matter to a user. And the log of any launch says which binary
 * is holding that user's sessions.
 */
export async function logCreatedServerVersion(input: {
  exec: TmuxExec;
  bin: string;
  source: TmuxBinarySource;
}): Promise<void> {
  const version = await readServerVersion(input.exec);
  if (version === null) {
    tmuxLog.warn(
      'The tmux server was created and it did not report its version.'
    );
    return;
  }
  tmuxLog.info(
    `tmux server created, running ${version}, from ` +
      `${sourcePhrase(input.source, input.bin)}.`
  );
}
