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
 * a verb that is not on the ledger is refused. That is also what keeps the scope
 * fence honest in code: `kill-server`, `attach-session` and `respawn-pane`
 * cannot reach a machine here even by accident, and any later rung that wants
 * one has to add it with its repeat reasoning written down beside it. Phase 70
 * did exactly that for `new-session`, `kill-session` and `rename-session`, and
 * `attach-session` stays refused forever, because attach is a different plane
 * with a different carriage.
 *
 * PHASE 72 ADDED ONE VERB, being `capture-pane`. It is a read: with `-p` it
 * prints what is on a screen and writes nothing, so running it twice leaves the
 * machine exactly as running it once does. It is what the saved output capture
 * in `./remote-capsule.ts` sends, and it is the only thing that rung sends.
 * Nothing was removed and no refused verb moved.
 *
 * ## PHASE 89 ADDED THE FIRST UNSAFE ROW, being `send-keys`
 *
 * Running `send-keys` twice types the text twice, and tmux has no rule that
 * stops the second copy. So it is the first row on the ledger whose repeat
 * class is `unsafe`, and the general door refuses it. {@link execOn} calls
 * {@link assertRemoteVerbAllowed} with no guard, so a `send-keys` argv sent
 * that way is refused with {@link REPEAT_UNSAFE}. That refusal had no member
 * in production before this phase and it has one now.
 *
 * ONE FUNCTION MAY SEND IT, being {@link sendArmedResumeText}. It exists to
 * arm a resume on a machine and it does nothing else. It composes its own
 * five element argv, so no caller can add a second command, a second target or
 * a key name, and it refuses a text that is not one line of printable
 * characters. A newline typed with `-l` IS Enter, so the newline refusal is
 * what keeps the promise that Tortie never presses Enter for a person.
 *
 * WHAT THAT FUNCTION DOES NOT CHECK, stated here so nothing above is read as
 * more than it is. It does not know what Tortie composed, so it cannot refuse a
 * text on the grounds that Tortie did not compose it, and it does not try.
 * Handed one line of printable characters aimed at an immutable identifier it
 * types that line. The rule that only Tortie's own composed text is ever handed
 * to it lives one layer up, in `./remote-arm.ts`, which is its only product
 * caller and which builds every word of the text out of the compiled agent
 * catalogue. `build/conformance-machines.mjs` counts the call sites so that the
 * word "only" is a measurement rather than a claim.
 *
 * The token that satisfies the ledger's guard is {@link ARMED_RESUME_GUARD},
 * and it is NOT EXPORTED. So the only code in this process that can hand a
 * non-null guard to {@link assertRemoteVerbAllowed} is code inside this file,
 * and the only function here that does it is `sendArmedResumeText`. That is
 * rule 2 of Phase 89 expressed as a structure rather than as a comment.
 * `build/conformance-machines.mjs` counts the call sites and fails on a third
 * file.
 *
 * PHASE 71 ADDED NOTHING TO THE LEDGER, and that is worth stating rather than
 * leaving a reader to diff. The pane environment rescue in
 * `./pane-env-rescue.ts` sends `show-environment` to read one session's identity
 * and `set-option` to write the four stamps back. Both were already on the list
 * with their repeat reasons, and both are safe to run twice for exactly the
 * reasons recorded there. The control plane is a different carriage again, being
 * a long lived pipe rather than a one-shot exec, so nothing it sends passes
 * through this door.
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
 *
 * ## PHASE 118: SOMEBODY OWNS THE SSH CHILD NOW
 *
 * The two `execFileP` calls in this file are the only places this product
 * spawns a long running child on another computer. Before Phase 118 they
 * registered that child with nothing, so quitting Tortie neither ended a copy
 * that had 600,000 ms nor waited for it, and no record said which had happened.
 *
 * Both calls now run inside `admitRemoteExecution` from `./execution-ledger.ts`,
 * for a REMOTE context only. The ledger refuses new work once the quit begins,
 * hands the quit the child to end, waits for it under a bound, and writes down
 * how it ended. Nothing about what is sent, in what order, or how a failure is
 * classified has moved. `build/conformance-machines.mjs` counts these call
 * sites, so a third spawn in this directory fails the build rather than
 * quietly escaping the ledger.
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
import {
  admitRemoteExecution,
  type RemoteExecutionHold,
  type RemoteExecutionKind
} from './execution-ledger';

const execFileP = promisify(execFile);

/** capture-pane of 50k colored lines can be many MB; be generous. */
const MAX_BUFFER_BYTES = 64 * 1024 * 1024;

export interface ExecTmuxOptions {
  /** Milliseconds before the command is killed. Default 10s. */
  timeoutMs?: number;
  /**
   * PHASE 118. What a person would call this piece of work, for the ledger that
   * owns the ssh child underneath it.
   *
   * It changes nothing about what is sent. It decides what the log line says,
   * what a cut off copy is recorded as, and which sentence a person reads at
   * the next launch. A caller that leaves it out is recorded as `command`,
   * which is the honest word for a remote tmux verb nobody named.
   *
   * IGNORED FOR A LOCAL CONTEXT. A local `execFile` of tmux on this Mac takes
   * milliseconds and is not admitted to the ledger at all.
   */
  execution?: {
    readonly kind: RemoteExecutionKind;
    /** e.g. the destination folder, or the session's name. May be ''. */
    readonly subject: string;
    /**
     * The machine as the person named it. Only the copy passes it, because it
     * is the only kind whose record outlives this run and has to name the
     * machine after it may have been removed.
     */
    readonly machineLabel?: string;
  };
}

// ---------------------------------------------------------------------------
// The verb ledger
// ---------------------------------------------------------------------------

export type RepeatClass =
  /** Running it twice leaves the machine in the same state as running it once. */
  | 'safe'
  /**
   * Running it twice can leave two of something. Refused by the general door.
   * A row of this class may name a `guard`, and one narrow function that runs
   * under that guard may send it. Phase 89 added the first such row.
   */
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
  /**
   * For an `unsafe` row, the name of the thing that finds a repeat after it has
   * happened. A safe row has none, because it needs none. An unsafe row with no
   * guard is refused by {@link assertRemoteVerbAllowed} exactly as before.
   */
  readonly guard?: string;
}

/**
 * The one guard token that satisfies an `unsafe` ledger row (Phase 89).
 *
 * NOT EXPORTED. {@link assertRemoteVerbAllowed} allows an `unsafe` row only
 * when the caller hands it a guard equal to the row's own, and this file is the
 * only one that names the constant. {@link sendArmedResumeText} is the only
 * function here that names it.
 *
 * SAID PLAINLY, BECAUSE A READER COULD READ MORE INTO IT. The guard decides
 * what a pure function ANSWERS. It is not what stops a module sending the verb.
 * What stops that is that one function in this process spawns a `send-keys`
 * argv, being `sendArmedResumeText` below, and {@link execOn} names no guard at
 * all so every argv sent through the general door is refused. A module that
 * copied the guard's text would get an allow answer from a function that sends
 * nothing.
 *
 * The name says what the guard IS, being a read of the screen before the send
 * and a read after it, so a second copy is found rather than assumed away.
 */
const ARMED_RESUME_GUARD = 'armed-resume-read-back';

/**
 * Every command that may cross to a machine, and why each one is safe to run
 * twice.
 *
 * The list is complete because these twelve are the only verbs Tortie sends. A
 * verb absent from it is refused before anything is sent, which is what makes
 * the scope fence a fact rather than a note.
 *
 * `build/conformance-machines.mjs` fails when any of the three forbidden verbs
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
  // -------------------------------------------------------------------------
  // Phase 72 added this one, and it is the only verb this rung adds.
  // -------------------------------------------------------------------------
  {
    verb: 'capture-pane',
    repeat: 'safe',
    kind: 'read',
    reason:
      'With -p it prints what is on a screen and writes nothing. Two prints ' +
      'of the same screen leave the machine exactly as one does, and the ' +
      'second answer is simply the newer one.'
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
  },
  // -------------------------------------------------------------------------
  // Phase 70 added these three. Each one carries its repeat reasoning, which is
  // the price of putting a verb on this list at all.
  // -------------------------------------------------------------------------
  {
    verb: 'new-session',
    repeat: 'safe',
    kind: 'mutating',
    reason:
      'tmux refuses a second session with the same name, so a repeat cannot ' +
      'leave two. Identity is on the new-session line itself as pane ' +
      'environment, so a session created by a call whose answer was lost is ' +
      'still identifiable by reading that environment back.'
  },
  {
    verb: 'kill-session',
    repeat: 'safe',
    kind: 'mutating',
    reason:
      'Killing a session that is already gone is the state that was asked ' +
      'for. The target is an immutable id Tortie read from this machine, so a ' +
      'repeat cannot land on a different session.'
  },
  {
    verb: 'rename-session',
    repeat: 'safe',
    kind: 'mutating',
    reason: 'The same target given the same name twice holds one name.'
  },
  // -------------------------------------------------------------------------
  // Phase 89 added this one, and it is the first row on the ledger that is NOT
  // safe to run twice. Read the guard beside it before reading anything else.
  // -------------------------------------------------------------------------
  {
    verb: 'send-keys',
    repeat: 'unsafe',
    kind: 'mutating',
    guard: ARMED_RESUME_GUARD,
    reason:
      'Running it twice types the text twice, and tmux has no rule that stops ' +
      'the second copy. So it is not safe to run twice and this row says so. ' +
      'One call site may send it, being the armed resume in ./remote-arm.ts, ' +
      'and that call site reads the screen before and after so a second copy ' +
      'is found rather than assumed away. Enter is never sent, so nothing ' +
      'runs on that machine from this verb.'
  }
];

/**
 * The verbs Tortie refuses to send to a machine, named so the gate can assert
 * their absence rather than guessing at what a ledger should not hold.
 *
 * `attach-session` is on this list FOREVER. Attach is a different plane with a
 * different carriage, being a pty rather than a one-shot exec, and a person's
 * keystrokes must never be reachable through this door.
 *
 * PHASE 89 TOOK `send-keys` OFF THIS LIST and put it on the ledger as the
 * first `unsafe` row. It is not allowed generally. The general door refuses it
 * with {@link REPEAT_UNSAFE}, and one function that names the row's own guard
 * may send one line of Tortie's own composed text with no key press after it.
 * The other three stay here and nothing on this rung sends them.
 */
export const VERBS_THIS_RUNG_REFUSES: readonly string[] = [
  'kill-server',
  'attach-session',
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
 * PHASE 89 GAVE THE CLASS ITS FIRST MEMBER, being `send-keys`, so this branch
 * is now reachable in production: an argv carrying that verb through
 * {@link execOn} lands here, because the general door names no guard. Before
 * Phase 89 the class had no members at all and the branch was unreachable,
 * which is exactly the case rollup deletes. The refusal gate still pins the
 * sentence and `GMUX_SMOKE=exec-plane` still drives it, once with a synthetic
 * row and once with the real `send-keys` argv.
 */
export const REPEAT_UNSAFE =
  'Tortie will not send that command to another machine, because running it ' +
  'twice could leave two of something and Tortie cannot yet tell one from the ' +
  'other. Nothing was sent.';

/**
 * A mutating verb before the machine's program search list has been read.
 * Pinned as `machine.path-before-mutation`.
 *
 * Phase 69 wrote this rule with no member to exercise it. Phase 70 gave it its
 * first three, being `new-session`, `kill-session` and `rename-session`, so a
 * create on a machine nobody prepared is refused here rather than running the
 * wrong copy of a program.
 */
export const PATH_BEFORE_MUTATION =
  'Tortie will not start work on a machine before it has read the list of ' +
  'places that machine looks for programs. Without that list the wrong copy of ' +
  'a program can run, or none at all. Nothing was started.';

/**
 * A text this door will not type on another machine (Phase 89).
 *
 * PINNED as `machine.armed-text-refused`. It belongs to the door rather than to
 * the restore, which is why it is here rather than in `./remote-copy.ts`.
 *
 * It fires for a text carrying a newline, a carriage return or any other
 * control character, for an empty text, for a text over the cap, and for a
 * target that is not an immutable identifier. A newline typed with `-l` IS
 * Enter, so this sentence is where the promise that Tortie never presses Enter
 * for a person is enforced rather than described.
 */
export const ARMED_TEXT_REFUSED =
  'Tortie will not type that on another machine. The only thing it may type ' +
  'there is the command it composed itself to continue a conversation, on one ' +
  'line, with no key press after it. Nothing was sent.';

/** The longest text this door will type. Every composed resume is under 200. */
const ARMED_TEXT_MAX_CHARS = 1000;

/** An immutable tmux identifier, which is the only target this door accepts. */
const IMMUTABLE_TARGET = /^\$\d+$/;

/**
 * The five element argv `sendArmedResumeText` sends, composed in one place.
 *
 * Exported so `build/machines-conformance-probe.mts` can read the shape without
 * spawning anything. Composing it cannot send it: the only function that
 * spawns is below, and {@link execOn} refuses the verb.
 */
export function composeArmedResumeArgv(
  target: string,
  text: string
): string[] {
  return ['send-keys', '-t', target, '-l', text];
}

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
  ledger: readonly LedgerRow[] = REMOTE_VERB_LEDGER,
  /**
   * The guard a caller claims to be running under. An `unsafe` row is allowed
   * only when this equals the row's own `guard`. The one value that satisfies
   * the ledger today is {@link ARMED_RESUME_GUARD}, a module private constant
   * in this file, so no module outside this one can produce it.
   */
  guard: string | null = null
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
      // A row with no guard is refused the way every unsafe row was refused
      // before Phase 89. A row WITH a guard is allowed only to a caller that
      // names it, and the only name that satisfies the ledger today is a
      // constant no module outside this file can read.
      const guarded =
        row.guard !== undefined && row.guard.length > 0 && guard === row.guard;
      if (!guarded) {
        throw gmuxError(
          'INVALID_INPUT',
          REPEAT_UNSAFE,
          `refused "${verb}" for machine ${ctx.machineId}: ${row.reason}`
        );
      }
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
  // NO GUARD IS NAMED HERE, and that is deliberate. The general door allows a
  // safe row and refuses an unsafe one, so a `send-keys` argv sent this way is
  // refused with REPEAT_UNSAFE whatever else is true of it.
  if (ctx.kind === 'remote') assertRemoteVerbAllowed(ctx, args);
  return spawnTmux(ctx, args, options);
}

/**
 * The spawn itself, with no check in front of it.
 *
 * PRIVATE, and it has exactly two callers, being {@link execOn} and
 * {@link sendArmedResumeText}. Each one asks its own questions first, and this
 * is here so the two share one spawn shape, one buffer cap, one SIGKILL and one
 * failure classification rather than growing a second copy of them.
 */
async function spawnTmux(
  ctx: MachineContext,
  args: readonly string[],
  options: ExecTmuxOptions
): Promise<string> {
  // PHASE 118. The composition is INSIDE the run, so a call refused because
  // Tortie is quitting never composes an argv at all.
  const run = async (hold: RemoteExecutionHold | null): Promise<string> => {
    const plan = tmuxCommand(ctx, args);
    try {
      const running = execFileP(plan.file, [...plan.argv], {
        timeout: options.timeoutMs ?? 10_000,
        killSignal: 'SIGKILL',
        maxBuffer: MAX_BUFFER_BYTES,
        env: process.env
      });
      hold?.own(running.child);
      const { stdout } = await running;
      return stdout;
    } catch (err) {
      throw classifyExecFailure(ctx, args[0] ?? '', err);
    }
  };
  if (ctx.kind !== 'remote') return run(null);
  return admitRemoteExecution(
    {
      machineId: ctx.machineId,
      kind: options.execution?.kind ?? 'command',
      subject: options.execution?.subject ?? '',
      ...(options.execution?.machineLabel !== undefined
        ? { machineLabel: options.execution.machineLabel }
        : {})
    },
    run
  );
}

/**
 * Type ONE line of Tortie's own composed text into one session on one machine,
 * without pressing Enter (Phase 89).
 *
 * The only product caller is `./remote-arm.ts` and the only reason this
 * function exists is to arm a resume. `./exec-smoke.ts` calls it as well, to
 * watch its refusals fire inside a real Electron process against the built
 * bundle, and `build/conformance-machines.mjs` fails on any third file.
 *
 * THE CALLER DOES NOT PASS AN ARGV. This function composes it, so no caller can
 * add a second command, a second target, or a key name. The composed argv is
 * five elements and carries `-l`, which tells tmux to send the text literally
 * rather than to read it as key names.
 *
 * What it checks before it spawns anything, in this order:
 *
 *  1. The target is an immutable identifier and nothing else. A name could be
 *     renamed between the read and the send and land on a different session.
 *  2. The text is between one and {@link ARMED_TEXT_MAX_CHARS} characters. The
 *     cap is not decoration: the read back that detects a double send reads one
 *     screen, and a string longer than a screen cannot be found in one.
 *  3. The text carries no newline, no carriage return and no other control
 *     character. A NEWLINE TYPED WITH `-l` IS ENTER, so this is the check that
 *     keeps the promise that Tortie never presses Enter for a person.
 *  4. The ledger row for `send-keys` exists, reads `unsafe`, and carries a
 *     non-empty guard. A row edited to `safe` throws here, because the honesty
 *     of the row is the guard.
 *  5. The ledger and the ordering gate, under the guard, which also refuses the
 *     send before the machine's program search list has been read.
 *
 * WHAT IT DOES NOT CHECK. It does not check who composed the text. That rule is
 * `./remote-arm.ts`'s and it is enforced there, in `composeArmedResumeText`,
 * against the compiled agent catalogue. This function will type any one line of
 * printable characters it is handed. What makes that safe is that one product
 * file hands it anything at all.
 *
 * @throws GmuxError INVALID_INPUT carrying {@link ARMED_TEXT_REFUSED} when the
 *   text is not one line of printable characters, or when the target is not an
 *   immutable identifier. Nothing is sent in either case.
 */
export async function sendArmedResumeText(
  ctx: RemoteMachineContext,
  target: string,
  text: string,
  options: ExecTmuxOptions = {}
): Promise<void> {
  function refuse(detail: string): never {
    throw gmuxError('INVALID_INPUT', ARMED_TEXT_REFUSED, detail);
  }
  if (!IMMUTABLE_TARGET.test(target)) {
    refuse(
      `refused an armed resume for machine ${ctx.machineId}: the target ` +
        `${JSON.stringify(target)} is not an immutable identifier`
    );
  }
  if (text.length === 0) {
    refuse(
      `refused an armed resume for machine ${ctx.machineId}: the text is empty`
    );
  }
  if (text.length > ARMED_TEXT_MAX_CHARS) {
    refuse(
      `refused an armed resume for machine ${ctx.machineId}: the text is ` +
        `${String(text.length)} characters and the cap is ` +
        `${String(ARMED_TEXT_MAX_CHARS)}`
    );
  }
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    if (code < 0x20 || code === 0x7f) {
      refuse(
        `refused an armed resume for machine ${ctx.machineId}: the text ` +
          `carries the character ${String(code)} at position ${String(i)}, and ` +
          `only one line of printable characters may be typed`
      );
    }
  }
  const row = ledgerRowFor('send-keys');
  if (row === null || row.repeat !== 'unsafe' || (row.guard ?? '') === '') {
    refuse(
      `refused an armed resume for machine ${ctx.machineId}: the ledger row ` +
        `for send-keys no longer says it is unsafe to run twice under a named ` +
        `guard, and the guard is what makes this door safe to have opened`
    );
  }
  const argv = composeArmedResumeArgv(target, text);
  assertVerbAllowedOnSocket('send-keys', ctx.socket);
  assertRemoteVerbAllowed(ctx, argv, REMOTE_VERB_LEDGER, ARMED_RESUME_GUARD);
  await spawnTmux(ctx, argv, options);
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
  // PHASE 118. The second of the ledger's two seams. Every long running remote
  // child in this product is spawned here or in `spawnTmux` above, and the
  // conformance gate counts the call sites so a third one fails the build.
  return admitRemoteExecution(
    {
      machineId: ctx.machineId,
      kind: options.execution?.kind ?? 'command',
      subject: options.execution?.subject ?? '',
      ...(options.execution?.machineLabel !== undefined
        ? { machineLabel: options.execution.machineLabel }
        : {})
    },
    async (hold) => {
      const plan = shellCommand(ctx, command);
      try {
        const running = execFileP(plan.file, [...plan.argv], {
          timeout: options.timeoutMs ?? 10_000,
          killSignal: 'SIGKILL',
          maxBuffer: MAX_BUFFER_BYTES,
          env: process.env
        });
        hold.own(running.child);
        const { stdout } = await running;
        return stdout;
      } catch (err) {
        throw classifyExecFailure(ctx, 'the login shell', err);
      }
    }
  );
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
