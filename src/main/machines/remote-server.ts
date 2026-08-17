/**
 * Start what Tortie needs on another machine, and prove it stuck (Phase 69, M2,
 * research 51 sections 4.1 and 4.6).
 *
 * ## The order, and why every step is where it is
 *
 *  1. `list-sessions -F '#{session_id}'`. An answer means the server is warm and
 *     nothing is asserted on it beyond the option re-assert below. A failure the
 *     classifier calls "no server" means there is nothing there yet. ANY OTHER
 *     failure throws, because nothing is asserted on a machine Tortie cannot
 *     read.
 *  2. `start-server ; set-option -s exit-empty off`, in ONE invocation. The
 *     measurement that makes the chain necessary is in `./exec-plane.ts` beside
 *     `remoteVerbsOf`, and it is short: tmux's own default for `exit-empty` is
 *     `on`, so a server created with `-f /dev/null` and no sessions ends itself
 *     immediately. On this Mac the configuration file prevents that. On another
 *     machine nothing does, unless the option is set in the same invocation that
 *     creates the server.
 *  3. The PATH capture, BEFORE step 4 and before any option is written. The
 *     ordering is enforced by the exec plane rather than by this list.
 *  4. `set-environment -g PATH <captured>`.
 *  5. Every row of `remoteBootOptions()`, in list order.
 *  6. Read every option back and compare. A mismatch is REPORTED, not written
 *     again, because a value that will not stick is a fact about the machine and
 *     repeating the write hides it.
 *
 * ## Steps 2 to 6 run on every no-server detection, not only the first
 *
 * That is the research requirement, and the reason is a machine that rebooted. A
 * machine whose server went away and came back must not come back on tmux's own
 * `history-limit 2000`, which is 8 % of the depth the product promises.
 * `build/probe-execplane.mjs` step 9 ends the scratch remote server between two
 * calls and re-reads every option, so this is proven rather than asserted.
 *
 * ## What this module never does
 *
 * It creates no session, kills nothing, renames nothing and attaches to nothing.
 * The verb ledger in `./exec-plane.ts` refuses all four, so that is enforced and
 * not merely intended.
 */

import { getSettings } from '../settings/store';
import { getLog } from '../log';
import {
  localReassertOptions,
  remoteBootOptions,
  runtimeValueOf,
  setOptionArgs,
  showOptionArgs,
  type ServerOption
} from '../tmux/server-options';
import { serverProbeVerdict } from '../tmux/errors';
import { GmuxError } from '../errors';
import { classifyMachineOutput } from './errors';
import { bumpMachineGeneration, type RemoteMachineContext } from './context';
import { execOn } from './exec-plane';
import { captureRemotePath } from './remote-path';

const machinesLog = getLog('config');

/** The list the local boot re-asserts. Re-exported so one name reaches both. */
export { localReassertOptions };

/**
 * The boot verb, as one invocation.
 *
 * `-f /dev/null` is already on the argv by construction, in
 * `./context.ts`'s `tmuxCommand`, so it is not repeated here. `exit-empty` is set
 * with the row's own scope flag, which for this option is `-s`.
 */
export function remoteBootArgs(): string[] {
  return ['start-server', ';', 'set-option', '-s', 'exit-empty', 'off'];
}

/** One option, what Tortie asked for and what the machine answered. */
export interface RemoteOptionReadback {
  readonly name: string;
  readonly wanted: string;
  readonly observed: string;
  readonly agrees: boolean;
}

/** What one call to {@link ensureRemoteServer} did and found. */
export interface RemoteServerResult {
  /** True when this call created the server rather than finding it. */
  readonly born: boolean;
  /** The PATH the machine reported for this connection. */
  readonly remotePath: string;
  /** Every option, wanted against observed, in list order. */
  readonly options: readonly RemoteOptionReadback[];
  /** The rows whose value did not stick. Empty when every one agreed. */
  readonly disagreed: readonly RemoteOptionReadback[];
}

/**
 * Whether the machine has a server on Tortie's socket.
 *
 * TWO SENTENCES MEAN NO SERVER HERE, AND THE LOCAL RULE ONLY ACCEPTS ONE. That
 * difference is deliberate and it is worth the paragraph, because a later round
 * that "unified" the two would break one of them.
 *
 * `serverProbeVerdict` in `../tmux/errors.ts` answers a different question. It
 * decides whether a failed list PROVED the local server is dead, and its answer
 * drives whether Tortie offers Restore over a row. Phase 67 measured that a live
 * server whose socket file was deleted keeps every session running, so
 * "error connecting to <path> (No such file or directory)" cannot be treated as
 * death there: doing so offers Restore over an agent that is still working.
 *
 * The question here is whether to START a server on a machine that appears to
 * have none. In this release Tortie creates no session on any machine, so there
 * is no work on the far side for a second server to hide. So both sentences are
 * accepted, `serverProbeVerdict` is still asked first because a refused connect is
 * the stronger of the two answers, and the second pattern is read from the
 * machine taxonomy so there is one place that owns it.
 *
 * **This is owed to M3.** Once a machine can hold sessions, a missing socket file
 * on it stops being harmless and this function has to be revisited with a
 * measurement of what a far side's deleted socket file does to its live sessions.
 */
export async function remoteServerVerdict(
  ctx: RemoteMachineContext
): Promise<'running' | 'no-server' | 'unknown'> {
  try {
    await execOn(ctx, ['list-sessions', '-F', '#{session_id}']);
    return 'running';
  } catch (err) {
    if (serverProbeVerdict(err) === 'no-server') return 'no-server';
    const detail =
      err instanceof GmuxError ? String(err.payload.detail ?? '') : '';
    return classifyMachineOutput(detail) === 'no-server' ? 'no-server' : 'unknown';
  }
}

/**
 * Make sure the machine is running what Tortie needs, and say what it found.
 *
 * @throws GmuxError when the machine cannot be read at all, when it would not
 *   report its program search list, or when a command over the connection failed.
 */
export async function ensureRemoteServer(
  ctx: RemoteMachineContext
): Promise<RemoteServerResult> {
  const verdict = await remoteServerVerdict(ctx);
  if (verdict === 'unknown') {
    // Nothing is asserted on a machine Tortie cannot read. Rethrowing the
    // classifier's own error would lose the reason, so the read runs again and
    // its error travels up with its own sentence.
    await execOn(ctx, ['list-sessions', '-F', '#{session_id}']);
  }

  const born = verdict === 'no-server';
  if (born) {
    // A new server is a new connection's worth of state, so the generation moves
    // and the PATH captured for the previous one is dropped rather than carried.
    bumpMachineGeneration(ctx.machineId);
    await execOn(ctx, remoteBootArgs());
  }

  // Step 3. Before any option is written, and before any environment is set.
  const remotePath = await captureRemotePath(ctx);
  await execOn(ctx, ['set-environment', '-g', 'PATH', remotePath]);

  const scrollback = getSettings().scrollbackLines;
  const rows = remoteBootOptions();
  for (const row of rows) {
    const value = runtimeValueOf(row, scrollback);
    await execOn(ctx, setOptionArgs(row, value));
  }

  const options: RemoteOptionReadback[] = [];
  for (const row of rows) {
    const wanted = runtimeValueOf(row, scrollback);
    const observed = await readOption(ctx, row);
    options.push({
      name: row.name,
      wanted,
      observed,
      agrees: observed === wanted
    });
  }
  const disagreed = options.filter((row) => !row.agrees);
  if (disagreed.length > 0) {
    machinesLog.warn(
      `${ctx.machineId} did not keep ${String(disagreed.length)} setting(s): ` +
        disagreed
          .map((row) => `${row.name} asked ${row.wanted} got ${row.observed}`)
          .join(', ')
    );
  }
  return { born, remotePath, options, disagreed };
}

/**
 * One option read back, as the string the machine printed.
 *
 * A read that fails answers with an empty string rather than throwing, because a
 * value that cannot be read is the same fact to the caller as a value that did
 * not stick, and it belongs in the table beside the others rather than ending the
 * whole call.
 *
 * MEASURED on tmux 3.6a, 2026-08-17, which is why the row's own scope flag is
 * used for the read: `show-options -sv <a session option>` fails with
 * "no current session" on a server holding zero sessions, while
 * `show-options -gv <a server option>` answers correctly. So `-g` reads both and
 * `-s` reads only server options, and using the row's own flag is right for every
 * row.
 */
async function readOption(
  ctx: RemoteMachineContext,
  row: ServerOption
): Promise<string> {
  try {
    // `copy-mode-position-format` is the empty string on purpose, so the trailing
    // newline is the only thing trimmed.
    return (await execOn(ctx, showOptionArgs(row))).replace(/\n$/, '');
  } catch {
    return '';
  }
}
