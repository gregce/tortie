/**
 * Where a tmux command runs (Phase 69, M2, research 51 section 4.1).
 *
 * Until this rung there was one implicit target and every tmux command went to
 * it: a single cached `TmuxContext` in `../tmux/supervisor.ts`. This module
 * replaces that with a registry keyed by machine id, where the local Mac is one
 * key among several rather than a hidden default.
 *
 * ## One function composes both shapes
 *
 * {@link tmuxCommand} is the only place either shape is written.
 *
 *   local   file: <the tmux this process runs>
 *           argv: ['-L', socket, '-f', confPath, ...verb]
 *
 *   remote  file: <the ssh this process runs>
 *           argv: [...sshOptions, host, <ONE quoted string>]
 *           and the quoted string is
 *             <remoteTmuxPath> -L <socket> -f /dev/null <verb>
 *
 * The remote command is ONE argument and it is quoted, because ssh hands
 * everything after the address to that machine's login shell as a string. The
 * measurement that forced this is in the header of {@link tmuxCommand}.
 *
 * The local branch produces byte for byte what `tmuxArgs` produced at `ab94847`,
 * and `build/conformance-machines.mjs` compares the two across twelve argument
 * vectors so that stays true.
 *
 * ## `-f /dev/null` on EVERY remote command, not only the boot verb
 *
 * tmux reads a configuration file when it creates a server, and any verb can
 * create the server implicitly. Passing `-f /dev/null` always means there is no
 * path by which the other machine's own `~/.tmux.conf` is read. It is inert on a
 * server that is already up.
 *
 * ## The remote program is an absolute path, and the local agent rule is the
 * ## opposite on purpose
 *
 * Agents on this Mac are launched by bare name (CLAUDE.md, Phase 12.7 F3). The
 * program on another machine is launched by the absolute path the confirm hash
 * bound. The reason is different: the gate seals which program runs on that
 * machine, and a bare name would let that machine's PATH choose instead. Sealing
 * that choice is the whole point of the machine row.
 *
 * ## The socket name comes from `activeTmuxSocket()` and nowhere else
 *
 * A remote command reaching `set-option -g history-limit` on socket `gmux` would
 * rewrite the options on the operator's own server if the far side happened to
 * be this Mac, which is exactly what the probe's far side is. So the socket is
 * read from the one function that refuses to move off `gmux` outside a harness
 * launch, and a literal `'gmux'` in the remote composition is a gate failure.
 *
 * ## The generation record
 *
 * A remote context carries a generation number and the PATH captured for it. The
 * number is bumped on every connect and on every server birth. `./exec-plane.ts`
 * refuses a mutating verb while the PATH for the current generation is null, and
 * `./remote-path.ts` is what fills it in. The record lives here because the
 * registry is where a machine's state belongs, and keeping it out of the frozen
 * context object means a capture cannot go stale in a caller's hand.
 */

import { homedir } from 'node:os';
import {
  activeTmuxSocket,
  assertConfUsable,
  resolveConfPath,
  resolveTmux,
  tmuxUnavailableError,
  type TmuxBinarySource
} from '../tmux/resolve';
import { resetTmuxVersionState } from '../tmux/version';
import { gmuxError } from '../errors';
import {
  assertMachineMayConnect,
  machineExecutionHash,
  type MachineExecutionFields
} from './confirm';
import {
  PINNED_SSH_PATH,
  resolveSsh,
  userHostKeysPath,
  type MachineHostKeyFiles
} from './carriage';
import { composeControlPath, sshOptions } from './ssh';
// The ONE quoting helper in this process. It is load bearing here: ssh hands the
// whole remote command to the other machine's login shell as a string, so an
// unquoted `;` becomes that shell's separator and an unquoted `#{...}` becomes its
// comment. See the header of `tmuxCommand`.
import { shellQuoteArgv } from '../restore/command';

// ---------------------------------------------------------------------------
// The two kinds
// ---------------------------------------------------------------------------

export type MachineKind = 'local' | 'remote';

/** The id the local Mac is registered under. It is not a machine row. */
export const LOCAL_MACHINE_ID = 'local';

export interface LocalMachineContext {
  readonly kind: 'local';
  readonly machineId: 'local';
  /** Absolute path to the tmux binary this process runs. */
  readonly bin: string;
  readonly socket: string;
  /** Absolute path to gmux-tmux.conf, passed as -f on every local invocation. */
  readonly confPath: string;
  /** Where that binary came from, for the log and the error copy. */
  readonly binSource: TmuxBinarySource;
  /** True when this is a packaged Tortie. */
  readonly packaged: boolean;
}

export interface RemoteMachineContext {
  readonly kind: 'remote';
  readonly machineId: string;
  /** Absolute path to the ssh client this process runs. */
  readonly sshBin: string;
  readonly host: string;
  readonly user: string | null;
  readonly port: number | null;
  /** The absolute program path the confirm hash bound. Never a bare name. */
  readonly remoteTmuxPath: string;
  readonly socket: string;
  /** The control socket for this machine's reused connection. */
  readonly controlPath: string;
  /** The two identity record files, Tortie's own first. */
  readonly hostKeys: MachineHostKeyFiles;
  /**
   * The version a person accepted for this machine, or null (Phase 83).
   *
   * IT REACHES NO ARGV. Nothing in this file or in `./exec-plane.ts` composes a
   * command out of it. It is carried here so `./prepare.ts` can ask the version
   * gate about it without reading the store a second time, and it is only ever
   * compared against the version the machine reports.
   *
   * IT IS OPTIONAL, and absent means the same as null, which is a machine
   * nobody accepted a version for. A context written before this field existed
   * is still a valid one, and it composes the same command it always did.
   */
  readonly acceptedTmuxVersion?: string | null;
}

export type MachineContext = LocalMachineContext | RemoteMachineContext;

/** What a spawn needs, and nothing else. */
export interface SpawnPlan {
  /** The program to run. */
  readonly file: string;
  /** Its arguments, in order. */
  readonly argv: readonly string[];
}

/** The configuration file a remote command names, so nothing else is read. */
export const REMOTE_CONF_PATH = '/dev/null';

/**
 * The tmux argv a machine's own tmux receives, before it is quoted. Pure.
 *
 * It is a separate function so the conformance gate and the unit tests can read
 * the list rather than pick it back out of a quoted string, and so there is only
 * one place the order is written.
 */
export function remoteTmuxArgv(
  ctx: RemoteMachineContext,
  args: readonly string[]
): string[] {
  return [
    ctx.remoteTmuxPath,
    '-L',
    ctx.socket,
    '-f',
    REMOTE_CONF_PATH,
    ...args
  ];
}

/**
 * The one composer for both kinds.
 *
 * Pure, so the golden comparison against `ab94847` can be a plain unit test and
 * the conformance gate can read the argv without starting anything.
 *
 * THE REMOTE COMMAND IS ONE ARGUMENT, AND IT IS QUOTED. This is the correction the
 * live probe forced, and it is worth stating plainly because the first build got it
 * wrong in a way that looked fine on screen.
 *
 * ssh does not carry an argv to the other machine. It joins everything after the
 * address with single spaces and hands the resulting STRING to that machine's login
 * shell, which splits it again by its own rules. MEASURED 2026-08-17 by
 * `build/probe-execplane.mjs` against a scratch sshd, with an unquoted argv:
 *
 *   start-server ';' set-option -s exit-empty off
 *     exit 127. The far side's shell read the `;` as ITS OWN command separator,
 *     ran the tmux call, then tried to run `set-option` as a program and could
 *     not find one.
 *
 *   list-sessions -F '#{session_id}'
 *     the far side's shell read `#{session_id}` as the start of a COMMENT and
 *     dropped it, so the format never reached tmux.
 *
 * Both are silent in the sense that matters: the exit code and the empty answer
 * look like a machine that is misconfigured rather than like a command that was
 * mangled in transit. So the whole tmux call is quoted with `shellQuoteArgv`, the
 * one quoting helper in this process, and it travels as a single argument. Phase
 * 68's connection test already did exactly this for the same reason, and the
 * comment there says so.
 */
export function tmuxCommand(
  ctx: MachineContext,
  args: readonly string[]
): SpawnPlan {
  if (ctx.kind === 'local') {
    return {
      file: ctx.bin,
      argv: ['-L', ctx.socket, '-f', ctx.confPath, ...args]
    };
  }
  return {
    file: ctx.sshBin,
    argv: [
      ...sshOptions(ctx),
      ctx.host,
      shellQuoteArgv(remoteTmuxArgv(ctx, args))
    ]
  };
}

/**
 * Run a command on the machine's own login shell rather than its tmux.
 *
 * One caller, being the PATH capture in `./remote-path.ts`. It is here beside
 * {@link tmuxCommand} because it carries the same carriage, and a second place
 * composing ssh options is a second place that could drop one.
 */
export function shellCommand(
  ctx: RemoteMachineContext,
  command: string
): SpawnPlan {
  return {
    file: ctx.sshBin,
    argv: [...sshOptions(ctx), ctx.host, command]
  };
}

// ---------------------------------------------------------------------------
// The registry
// ---------------------------------------------------------------------------

let localContext: LocalMachineContext | null = null;
const remoteContexts = new Map<string, RemoteMachineContext>();

/**
 * The local Mac, resolved once and then remembered.
 *
 * It replaces `getTmuxContext()`, which `../tmux/supervisor.ts` now re-exports
 * from here so no other file changed shape.
 *
 * @throws GmuxError TMUX_BUNDLE_INCOMPLETE when a packaged Tortie has no tmux
 *   inside its own bundle, TMUX_NOT_FOUND when a development build finds none on
 *   the machine, and TMUX_NOT_FOUND when the configuration file is missing,
 *   empty, a directory or unreadable.
 */
export function localMachineContext(): LocalMachineContext {
  if (localContext !== null) return localContext;
  const res = resolveTmux();
  if (res.path === null) throw tmuxUnavailableError(res);
  const confPath = resolveConfPath();
  // Phase 19 item 13: exists, is a file, and is not empty. A zero-byte conf left
  // by a half-written update starts a tmux server on the built-in defaults
  // exactly as a missing one does, and passes an existence test.
  assertConfUsable(confPath);
  localContext = {
    kind: 'local',
    machineId: LOCAL_MACHINE_ID,
    bin: res.path,
    socket: activeTmuxSocket(),
    confPath,
    binSource: res.source,
    packaged: res.packaged
  };
  return localContext;
}

/** What a remote context needs from the caller, so this module reads no store. */
export interface RemoteContextInput {
  readonly machineId: string;
  readonly fields: MachineExecutionFields;
  /** True when this is a packaged Tortie. Decides whether GMUX_SSH_BIN applies. */
  readonly packaged: boolean;
  readonly env: NodeJS.ProcessEnv;
  /** The home directory whose record file is read, never written. */
  readonly home?: string;
  /** This process's user id, for the control socket name. */
  readonly uid: number;
  /** Tortie's own identity record file. Named first on every command. */
  readonly tortieHostKeys: string;
}

/**
 * Build one remote context, after the gate has agreed to it.
 *
 * The gate is asked FIRST, before anything is composed, so an unconfirmed
 * machine has no context object at all. There is nothing a later caller could
 * hold and use.
 *
 * @throws GmuxError INVALID_INPUT when the machine is not confirmed, when its
 *   details moved since the confirmation, when the record's seal cannot be read,
 *   when the row names no program, or when this Mac has no ssh client.
 */
export function buildRemoteMachineContext(
  input: RemoteContextInput
): RemoteMachineContext {
  assertMachineMayConnect(input.machineId, input.fields);
  const program = input.fields.remoteTmuxPath;
  if (program === null || !program.startsWith('/')) {
    throw gmuxError(
      'INVALID_INPUT',
      `Tortie does not know which program to run on ${input.machineId}, so it ` +
        `will not sign in to it. Test the connection, which is what finds the ` +
        `program. Nothing was started.`
    );
  }
  const ssh = resolveSsh({ packaged: input.packaged, env: input.env });
  if (ssh.path === null) {
    throw gmuxError(
      'INVALID_INPUT',
      `This Mac has no sign in program at ${PINNED_SSH_PATH}, so Tortie ` +
        `cannot reach any machine. This is a broken system rather than a ` +
        `broken machine. Nothing was started.`
    );
  }
  const hostKeys: MachineHostKeyFiles = {
    tortie: input.tortieHostKeys,
    user: userHostKeysPath(input.home ?? homedir())
  };
  const controlPath = composeControlPath({
    executionHash: machineExecutionHash(input.machineId, input.fields),
    uid: input.uid
  });
  return {
    kind: 'remote',
    machineId: input.machineId,
    sshBin: ssh.path,
    host: input.fields.host,
    user: input.fields.user,
    port: input.fields.port,
    remoteTmuxPath: program,
    // The ONE place the remote socket name comes from. Never a literal.
    socket: activeTmuxSocket(input.env),
    controlPath,
    hostKeys,
    // Phase 83. Taken from the fields the gate just agreed to, so an acceptance
    // that is not part of the confirmed hash cannot reach this object.
    acceptedTmuxVersion: input.fields.acceptedTmuxVersion ?? null
  };
}

/**
 * Register a remote context and start its first generation.
 *
 * Registering is separate from building so a caller that only wants to read the
 * composition, e.g. the conformance probe, never touches the registry.
 */
export function registerRemoteMachineContext(
  ctx: RemoteMachineContext
): RemoteMachineContext {
  remoteContexts.set(ctx.machineId, ctx);
  bumpMachineGeneration(ctx.machineId);
  return ctx;
}

/**
 * The context for one machine id, being `'local'` or a machine already
 * registered.
 *
 * It never builds a remote context, because building one needs the row, the home
 * directory, the user id and the packaged flag, and none of those belong in a
 * lookup. `./prepare.ts` is the one caller that builds and registers.
 *
 * @throws GmuxError INVALID_INPUT for an id with no registered context.
 */
export function machineContext(machineId: string): MachineContext {
  if (machineId === LOCAL_MACHINE_ID) return localMachineContext();
  const found = remoteContexts.get(machineId);
  if (found === undefined) {
    throw gmuxError(
      'INVALID_INPUT',
      `Tortie has not signed in to ${machineId} in this session, so it has ` +
        `nothing to send a command over. Prepare the machine first. Nothing ` +
        `was started.`
    );
  }
  return found;
}

/** Every remote machine with a live context, for the smoke and the probe. */
export function registeredMachineIds(): string[] {
  return [...remoteContexts.keys()].sort();
}

/**
 * Drop every context and every generation.
 *
 * It replaces `resetTmuxContext()`, which `../tmux/supervisor.ts` re-exports
 * from here so no other file changed shape.
 *
 * The version gate's remembered PASS goes with it, exactly as before. Phase 41
 * put that line in `resetTmuxContext` because a reset means the next boot
 * resolves a binary again, so the remembered answer is about a world that may no
 * longer be the current one.
 */
export function resetMachineContexts(): void {
  localContext = null;
  remoteContexts.clear();
  generations.clear();
  resetTmuxVersionState();
}

// ---------------------------------------------------------------------------
// The generation record
// ---------------------------------------------------------------------------

/** What is known about one machine's current connection. */
export interface MachineGeneration {
  /** Bumped on every connect and on every server birth. */
  readonly generation: number;
  /** The PATH captured for this generation, or null. */
  readonly remotePath: string | null;
}

const generations = new Map<string, MachineGeneration>();

/** What is known about this machine's current connection. */
export function machineGeneration(machineId: string): MachineGeneration {
  return generations.get(machineId) ?? { generation: 0, remotePath: null };
}

/**
 * Start a new generation, with no PATH captured for it.
 *
 * Called on every connect and on every server birth. The PATH is deliberately
 * dropped: a server that was just born has a fresh environment, and carrying the
 * previous generation's answer forward is how a stale PATH would reach a pane.
 */
export function bumpMachineGeneration(machineId: string): MachineGeneration {
  const next: MachineGeneration = {
    generation: machineGeneration(machineId).generation + 1,
    remotePath: null
  };
  generations.set(machineId, next);
  return next;
}

/** Record the PATH captured for this machine's current generation. */
export function setMachineRemotePath(
  machineId: string,
  remotePath: string
): MachineGeneration {
  const next: MachineGeneration = {
    generation: machineGeneration(machineId).generation,
    remotePath
  };
  generations.set(machineId, next);
  return next;
}

/**
 * Force the current generation's PATH back to unknown. Harness only.
 *
 * `GMUX_SMOKE=exec-plane` uses it to watch the ordering refusal fire, which is
 * the only way a refusal that production cannot reach gets watched at all.
 */
export function clearMachineRemotePathForHarness(machineId: string): void {
  const current = machineGeneration(machineId);
  generations.set(machineId, {
    generation: current.generation,
    remotePath: null
  });
}
