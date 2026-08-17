/**
 * The exec plane. One door for a tmux command, wherever it runs (Phase 69, M2,
 * research 51 sections 4.1 and 4.6).
 *
 * `execOn(ctx, args)` is that door. For a local context it does exactly what
 * `execTmux` did at `ab94847`, and `../tmux/supervisor.ts` now defines `execTmux`
 * as `execOn(localMachineContext(), ...)`. For a remote context it runs one ssh,
 * carrying the machine's own tmux on the far end, with two extra checks in front
 * of it that a local command does not need.
 *
 * ## At-least-once, and why it is a table rather than a paragraph
 *
 * A machine can sleep, and a link can drop, after the far side has already run
 * the command and before its answer arrives. So Tortie can never know whether a
 * command that failed ran or not, which means every command that crosses to a
 * machine must be safe to run twice. Research 51 section 4.6 states that as a
 * promise to the operator.
 *
 * A promise like that decays if it lives in prose. So it lives in
 * {@link REMOTE_VERB_LEDGER}, which the door reads before it sends anything, and
 * a verb that is not on the ledger is refused. That is also what keeps this
 * rung's scope fence honest in code: `new-session`, `kill-session`,
 * `rename-session`, `attach-session`, `send-keys` and `respawn-pane` cannot
 * reach a machine here even by accident, and M3 has to add each one with its
 * repeat reasoning written down beside it.
 *
 * ## The order of the checks, which is the order they have to be in
 *
 *  1. The server destroying verb check, asked before the context resolves and
 *     again against the resolved socket. Unchanged for local, and the same
 *     question for remote, so `kill-server` on `gmux` is refused whichever
 *     machine it is aimed at.
 *  2. Remote only: the verb ledger.
 *  3. Remote only: the ordering gate, being no mutating verb before the
 *     machine's program search list has been read.
 *  4. The spawn, with `killSignal: 'SIGKILL'`, a 64 MB buffer and the caller's
 *     timeout defaulting to 10 s.
 *  5. Failure classification. A local failure keeps `classifyTmuxFailure` byte
 *     for byte. A remote failure is read through the machine taxonomy first and
 *     then mapped onto the same codes, so a caller written against the local
 *     door reads the same codes.
 *
 * ## SIGKILL is load bearing and it stays for both kinds
 *
 * MEASURED in Phase 67 on a scratch socket with the server stopped by SIGSTOP:
 * the tmux client catches SIGTERM and exits 0, so a timed out exec RESOLVED with
 * empty stdout instead of rejecting. For `list-sessions` that empty stdout read
 * as a completed probe with zero sessions, which flipped every row to
 * 'restorable' and offered Restore over agents that were still running.
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { gmuxError } from '../errors';
import { classifyTmuxFailure } from '../tmux/errors';
import {
  activeTmuxSocket,
  assertVerbAllowedOnSocket,
  tmuxUnavailableError
} from '../tmux/resolve';
import {
  machineGeneration,
  resetMachineContexts,
  shellCommand,
  tmuxCommand,
  type MachineContext,
  type RemoteMachineContext
} from './context';
import { classifyMachineOutput } from './errors';

const execFileP = promisify(execFile);

/** capture-pane of 50k colored lines can be many MB; be generous. */
const MAX_BUFFER_BYTES = 64 * 1024 * 1024;

export interface ExecTmuxOptions {
  /** Milliseconds before the command is killed. Default 10s. */
  timeoutMs?: number;
}

// ---------------------------------------------------------------------------
// The verb ledger
// ---------------------------------------------------------------------------

export type RepeatClass =
  /** Running it twice leaves the machine in the same state as running it once. */
  | 'safe'
  /** Running it twice can leave two of something. Refused until M4's rescue exists. */
  | 'unsafe';

export type VerbClass =
  /** Reads only. */
  | 'read'
  /** Sets up the server itself. Allowed before the PATH capture. */
  | 'server-setup'
  /** Creates a session or a pane. Refused before the PATH capture. */
  | 'mutating';

export interface LedgerRow {
  readonly verb: string;
  readonly repeat: RepeatClass;
  readonly kind: VerbClass;
  /** Why running it twice is safe, or why it is not. Never empty. */
  readonly reason: string;
}

/**
 * Every command that may cross to a machine in this rung, and why each one is
 * safe to run twice.
 *
 * The list is complete because these seven are the only verbs the rung sends. A
 * verb absent from it is refused before anything is sent, which is what makes
 * the scope fence a fact rather than a note.
 *
 * `build/conformance-machines.mjs` fails when any of the six forbidden verbs
 * appears here, when a row carries an empty reason, or when a verb the plane
 * does send is missing.
 */
export const REMOTE_VERB_LEDGER: readonly LedgerRow[] = [
  {
    verb: 'list-sessions',
    repeat: 'safe',
    kind: 'read',
    reason: 'It reads and writes nothing.'
  },
  {
    verb: 'display-message',
    repeat: 'safe',
    kind: 'read',
    reason: 'With -p it prints a format and changes nothing.'
  },
  {
    verb: 'show-options',
    repeat: 'safe',
    kind: 'read',
    reason: 'It reads one option.'
  },
  {
    verb: 'show-environment',
    repeat: 'safe',
    kind: 'read',
    reason: 'It reads the server environment.'
  },
  {
    verb: 'start-server',
    repeat: 'safe',
    kind: 'server-setup',
    reason:
      "tmux's own verb is idempotent. A second call finds the server and returns."
  },
  {
    verb: 'set-option',
    repeat: 'safe',
    kind: 'server-setup',
    reason: 'The same name and the same value written twice leaves one value.'
  },
  {
    verb: 'set-environment',
    repeat: 'safe',
    kind: 'server-setup',
    reason: 'The same reason as set-option, being one name and one value.'
  }
];

/**
 * The verbs this rung refuses to send, named so the gate can assert their
 * absence rather than guessing at what a ledger should not hold.
 */
export const VERBS_THIS_RUNG_REFUSES: readonly string[] = [
  'new-session',
  'kill-session',
  'kill-server',
  'rename-session',
  'attach-session',
  'send-keys',
  'respawn-pane'
];

/** The ledger row for one verb, or null when the verb is not on the ledger. */
export function ledgerRowFor(
  verb: string,
  ledger: readonly LedgerRow[] = REMOTE_VERB_LEDGER
): LedgerRow | null {
  return ledger.find((row) => row.verb === verb) ?? null;
}

/**
 * Every verb in one argv, because tmux takes more than one command at a time.
 *
 * A bare `;` separates commands, so `['start-server', ';', 'set-option', ...]`
 * is two commands in one invocation. Reading only `args[0]` would let a second
 * verb ride along unchecked, which is the one way `new-session` could reach a
 * machine in this rung. So the ledger is asked about every verb.
 *
 * The remote boot NEEDS a chain, and this is the measurement that made it
 * necessary. MEASURED on tmux 3.6a on a scratch socket, 2026-08-17:
 *
 *   tmux -L scratch -f /dev/null start-server
 *     exit 0, and 0.3 s later `list-sessions` answers
 *     "no server running on /private/tmp/tmux-501/scratch"
 *
 *   tmux -L scratch -f /dev/null start-server ';' set-option -s exit-empty off
 *     exit 0, `list-sessions` answers with zero rows and exit 0,
 *     `show-options -sv exit-empty` answers "off"
 *
 * tmux's own default for `exit-empty` is `on`, so a server created with
 * `-f /dev/null` and no sessions ends itself immediately. On this Mac the
 * configuration file is what prevents that. On another machine nothing does,
 * unless the option is set in the same invocation that creates the server.
 */
export function remoteVerbsOf(args: readonly string[]): string[] {
  const verbs: string[] = [];
  let expectVerb = true;
  for (const arg of args) {
    if (arg === ';') {
      expectVerb = true;
      continue;
    }
    if (expectVerb) {
      verbs.push(arg);
      expectVerb = false;
    }
  }
  return verbs;
}

// ---------------------------------------------------------------------------
// The three refusals this module owns
// ---------------------------------------------------------------------------

/**
 * A verb nobody wrote down. Pinned by `build/assert-bundle-refusals.mjs` as
 * `machine.verb-not-in-ledger`.
 */
export const VERB_NOT_IN_LEDGER =
  'Tortie will not send that command to another machine. Only commands Tortie ' +
  'has written down as safe to run twice may cross to a machine, and this one ' +
  'is not on that list. Nothing was sent.';

/**
 * A verb whose repeat class is unsafe. Pinned as `machine.repeat-unsafe`.
 *
 * The `unsafe` class has no members in this rung, so this branch is unreachable
 * in production. That is exactly the case rollup deletes, so the refusal gate
 * pins the sentence and `GMUX_SMOKE=exec-plane` drives it with a synthetic row.
 * A refusal nobody can reach and nobody has watched fire is not a refusal.
 */
export const REPEAT_UNSAFE =
  'Tortie will not send that command to another machine, because running it ' +
  'twice could leave two of something and Tortie cannot yet tell one from the ' +
  'other. Nothing was sent.';

/**
 * A mutating verb before the machine's program search list has been read.
 * Pinned as `machine.path-before-mutation`.
 *
 * No mutating verb exists in this rung either, for the same reason and with the
 * same answer: the sentence is pinned and the harness drives it.
 */
export const PATH_BEFORE_MUTATION =
  'Tortie will not start work on a machine before it has read the list of ' +
  'places that machine looks for programs. Without that list the wrong copy of ' +
  'a program can run, or none at all. Nothing was started.';

/**
 * Ask the ledger and the ordering gate about one remote command.
 *
 * Exported so the harness can drive all three refusals with a synthetic ledger,
 * which is the only way two of them are ever watched firing.
 *
 * @throws GmuxError INVALID_INPUT
 */
export function assertRemoteVerbAllowed(
  ctx: RemoteMachineContext,
  args: readonly string[],
  ledger: readonly LedgerRow[] = REMOTE_VERB_LEDGER
): LedgerRow[] {
  const rows: LedgerRow[] = [];
  for (const verb of remoteVerbsOf(args)) {
    const row = ledgerRowFor(verb, ledger);
    if (row === null) {
      throw gmuxError(
        'INVALID_INPUT',
        VERB_NOT_IN_LEDGER,
        `refused "${verb}" for machine ${ctx.machineId}: it is not on the ` +
          `remote verb ledger`
      );
    }
    if (row.repeat === 'unsafe') {
      throw gmuxError(
        'INVALID_INPUT',
        REPEAT_UNSAFE,
        `refused "${verb}" for machine ${ctx.machineId}: ${row.reason}`
      );
    }
    if (row.kind === 'mutating') {
      const gen = machineGeneration(ctx.machineId);
      if (gen.remotePath === null) {
        throw gmuxError(
          'INVALID_INPUT',
          PATH_BEFORE_MUTATION,
          `refused "${verb}" for machine ${ctx.machineId}: no program search ` +
            `list is recorded for connection ${String(gen.generation)}`
        );
      }
    }
    rows.push(row);
  }
  return rows;
}

// ---------------------------------------------------------------------------
// The door
// ---------------------------------------------------------------------------

/**
 * Run one tmux command against one machine and return stdout.
 *
 * @throws GmuxError. Local failures classify exactly as they did before this
 *   rung. Remote failures classify through the machine taxonomy and then onto
 *   the same codes.
 */
export async function execOn(
  ctx: MachineContext,
  args: readonly string[],
  options: ExecTmuxOptions = {}
): Promise<string> {
  const verb = args[0] ?? '';
  // Asked against the resolved socket, which is the one the command will use.
  assertVerbAllowedOnSocket(verb, ctx.socket);
  if (ctx.kind === 'remote') assertRemoteVerbAllowed(ctx, args);
  const plan = tmuxCommand(ctx, args);
  try {
    const { stdout } = await execFileP(plan.file, [...plan.argv], {
      timeout: options.timeoutMs ?? 10_000,
      killSignal: 'SIGKILL',
      maxBuffer: MAX_BUFFER_BYTES,
      env: process.env
    });
    return stdout;
  } catch (err) {
    throw classifyExecFailure(ctx, verb, err);
  }
}

/**
 * Run a command on the machine's own login shell. Local is not accepted at all,
 * because the type will not allow it.
 *
 * One caller, being the PATH capture. It is here rather than in `./remote-path.ts`
 * so there is one spawn site for a machine and one place the failure mapping
 * lives.
 */
export async function execRemoteShell(
  ctx: RemoteMachineContext,
  command: string,
  options: ExecTmuxOptions = {}
): Promise<string> {
  const plan = shellCommand(ctx, command);
  try {
    const { stdout } = await execFileP(plan.file, [...plan.argv], {
      timeout: options.timeoutMs ?? 10_000,
      killSignal: 'SIGKILL',
      maxBuffer: MAX_BUFFER_BYTES,
      env: process.env
    });
    return stdout;
  } catch (err) {
    throw classifyExecFailure(ctx, 'the login shell', err);
  }
}

/**
 * Turn a failed spawn into a GmuxError.
 *
 * The local branch is the Phase 41 and Phase 67 behaviour with nothing changed:
 * a vanished binary produces the one composed "there is no tmux to run" sentence
 * and drops the cached context, and everything else goes through
 * `classifyTmuxFailure`.
 *
 * The remote branch reads the machine taxonomy FIRST, because ssh's own text
 * says what happened and tmux's exit code only says that something did. A
 * message the taxonomy recognises decides the code. Anything else falls through
 * to `classifyTmuxFailure`, which is what recognises tmux's own
 * "no server running on" and gives it TMUX_UNREACHABLE.
 */
function classifyExecFailure(
  ctx: MachineContext,
  verb: string,
  err: unknown
): Error {
  const e = err as NodeJS.ErrnoException & { stderr?: string };
  const stderr = e.stderr ?? '';
  if (ctx.kind === 'local') {
    if (e.code === 'ENOENT') {
      // The binary vanished since we cached it. Which sentence the user gets
      // depends on which build this is, so the one composer decides rather than
      // a second literal here.
      const gone = {
        path: null,
        source: ctx.binSource,
        packaged: ctx.packaged,
        detail: `${ctx.bin} was there when Tortie started and it is gone now`
      };
      // The whole registry goes, including the version gate's remembered PASS,
      // which is what `resetTmuxContext` has done since Phase 41.
      resetMachineContexts();
      return tmuxUnavailableError(gone);
    }
    return classifyTmuxFailure(stderr, `tmux ${verb} failed: ${e.message}`);
  }
  if (e.code === 'ENOENT') {
    return gmuxError(
      'TMUX_NOT_FOUND',
      `This Mac has no sign in program where Tortie expected one, so it ` +
        `cannot reach ${ctx.machineId}. This is a broken system rather than a ` +
        `broken machine.`,
      `${ctx.sshBin} was there when Tortie started and it is gone now`
    );
  }
  const cls = classifyMachineOutput(stderr);
  if (cls !== 'unknown') {
    return gmuxError(
      MACHINE_CLASS_CODES[cls] ?? 'TMUX_UNREACHABLE',
      `Tortie could not reach ${ctx.machineId}.`,
      `${cls}: ${firstLine(stderr) || e.message}`
    );
  }
  return classifyTmuxFailure(
    stderr,
    `${ctx.machineId}: tmux ${verb} failed: ${e.message}`
  );
}

/** The first line with anything on it, for a detail a bug report can read. */
function firstLine(text: string): string {
  return (
    text
      .split('\n')
      .map((line) => line.trim())
      .find((line) => line.length > 0) ?? ''
  );
}

/**
 * The machine taxonomy classes this door can meet, mapped onto the codes a
 * caller written against the local door already handles.
 *
 * Only the classes ssh itself produces are here. `no-server` is deliberately
 * absent, because that text comes from tmux rather than from ssh and
 * `classifyTmuxFailure` already gives it TMUX_UNREACHABLE, which is the code the
 * reconcile boundary reads.
 */
const MACHINE_CLASS_CODES: Partial<
  Record<ReturnType<typeof classifyMachineOutput>, 'TMUX_UNREACHABLE' | 'INVALID_INPUT'>
> = {
  'host-key-changed': 'INVALID_INPUT',
  'auth-refused': 'INVALID_INPUT',
  unreachable: 'TMUX_UNREACHABLE',
  refused: 'TMUX_UNREACHABLE',
  'not-resolved': 'TMUX_UNREACHABLE'
};

/**
 * The socket a command would use before any context is resolved.
 *
 * `../tmux/supervisor.ts` asks it so the server destroying refusal does not
 * depend on the configuration file being present or on Electron being up, which
 * is where that check has been since Phase 19.
 */
export function socketBeforeContext(): string {
  return activeTmuxSocket();
}
