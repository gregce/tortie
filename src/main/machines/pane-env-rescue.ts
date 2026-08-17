/**
 * Re-binding a session a create started on a machine and could not finish
 * marking (Phase 71, M4, research 51 section 4.1's last bullet).
 *
 * ## The case this exists for, in the order it happens
 *
 * A remote create sends `new-session` with `GMUX_SESSION_ID` riding on the line
 * itself as pane environment. It then sends `set-option @gmux-id` as a SECOND
 * command. The link can die between the two. What is left on that machine is a
 * session that is running, carries the pane stamp, and carries no option stamp.
 *
 * Every list after that reads its `@gmux-id` as empty, counts it as a session
 * Tortie did not create, and leaves it alone forever. The person sees an agent
 * they started that Tortie will not show them.
 *
 * This module is the one read that settles it.
 *
 * ## The mechanism, and every step is where it is on purpose
 *
 *  1. Skip a session this machine's foreign memo already holds. A pane's
 *     environment is fixed at create and a tmux `$-id` is never reused inside
 *     one server's life, so ONE probe settles one session. Without the memo,
 *     every refresh would spend one exec on every foreign session on that
 *     machine, which on a busy machine is most of them.
 *  2. `show-environment -t <$id>` over the exec plane. The verb is already on the
 *     ledger with its repeat reason, so nothing new can be sent to a machine by
 *     this rung.
 *
 *     THE VARIABLE IS NOT NAMED ON THE LINE, and that is measured rather than a
 *     style choice. MEASURED on tmux 3.6a, 2026-08-17, on a scratch socket:
 *
 *       show-environment -t $0 GMUX_SESSION_ID   exit 1, "unknown variable: GMUX_SESSION_ID"
 *       show-environment -t $0                   exit 0, 9 lines, none of them ours
 *       show-environment -t $1                   exit 0, "GMUX_SESSION_ID=abc123"
 *
 *     Naming the variable makes tmux exit non zero for the ordinary case, being
 *     a session that is not ours. The exec plane turns a non zero exit into a
 *     thrown error, and an error is indistinguishable from a machine that did
 *     not answer, so the memo below was never written and the same session was
 *     probed again on every list. MEASURED live before the fix: four list passes
 *     produced four identical probes of the same `$0`, plus a warning line each.
 *     Leaving the variable off gives tmux one answer with one exit code for both
 *     cases, so an answer is an answer and step 1 settles the session for good.
 *  3. Judge the answer against the ids THIS run issued for creates on THIS
 *     machine, and against nothing else.
 *  4. On a match, re-stamp all four options through `set-option`, which is on
 *     the ledger, and the row joins that machine's rows with its name, its
 *     agent, its project and its directory.
 *
 * ## What the rescue may never do
 *
 * It never adopts a session whose pane stamp names an id this run did not issue.
 * A session on that machine carrying neither stamp, or a stamp naming nothing of
 * ours, is NOT OURS: it is counted, never shown, never adopted and never killed.
 * That is the tmux safety rule in CLAUDE.md and it does not bend for a rescue.
 * It is `identityProbeVerdict`'s rule from `../sessions/reconcile-plan.ts` with
 * the manifest's known set replaced by the issued set, because a remote session
 * has no manifest row to be known by.
 *
 * ## The honest limit, and it is named in the commit body
 *
 * The issued set lives in memory for ONE Tortie run, because this rung writes no
 * remote row to the manifest. A create interrupted in the last run cannot be
 * rescued by this one. That session is running on that machine and it shows as a
 * session Tortie did not create. M5's per machine argv capture is what makes the
 * issued set durable.
 *
 * ## Why this file imports `./remote-sessions.ts`
 *
 * For the four stamp names and the one composer that writes them. There is one
 * definition of what Tortie stamps on a session it created, and a second copy
 * here would be a second place a stamp could be dropped. The import is used
 * inside functions only, never at module load, so the pair loading each other is
 * not a hazard.
 */

import { getLog } from '../log';
import type { RemoteMachineContext } from './context';
import { machineGeneration } from './context';
import { execOn } from './exec-plane';
import { REMOTE_STAMPS, oneLine, remoteStampArgs } from './remote-sessions';

const machinesLog = getLog('config');

// ---------------------------------------------------------------------------
// The issued set
// ---------------------------------------------------------------------------

/**
 * One create this run asked a machine for, remembered until the create is bound.
 *
 * It carries everything the four stamps need, because a rescue re-writes all
 * four and the pane environment carries only the id.
 */
export interface IssuedRemoteId {
  readonly id: string;
  readonly machineId: string;
  readonly name: string;
  readonly agent: string;
  readonly projectPath: string;
  readonly cwd: string;
  /** Local epoch ms, stamped before the create was sent. */
  readonly issuedAt: number;
}

/** Keyed by the uuid, which is unique across every machine in this run. */
const issued = new Map<string, IssuedRemoteId>();

/**
 * Remember an id BEFORE the `new-session` line is sent.
 *
 * Before, and not after, because the failure this exists for is a create whose
 * answer never arrived. An id recorded on the answer would not be recorded for
 * exactly the create that needs rescuing.
 */
export function noteIssuedRemoteId(record: IssuedRemoteId): void {
  issued.set(record.id, record);
}

/**
 * Forget an id whose create finished and whose option stamp landed.
 *
 * The row is on that machine's list from then on, carrying `@gmux-id`, so no
 * later list can read it as foreign and no rescue can be needed for it.
 */
export function clearIssuedRemoteId(id: string): void {
  issued.delete(id);
}

/** Every id this run issued for one machine, newest last. */
export function issuedRemoteIdsFor(machineId: string): readonly IssuedRemoteId[] {
  return [...issued.values()]
    .filter((one) => one.machineId === machineId)
    .sort((a, b) => a.issuedAt - b.issuedAt);
}

// ---------------------------------------------------------------------------
// The foreign memo
// ---------------------------------------------------------------------------

/**
 * The `$-id`s on one machine that a probe already proved are not ours, keyed by
 * the connection generation the proof was taken in.
 *
 * The generation is part of the key because a server that was born again is a
 * different server: its `$-id`s start over at `$0`, and a memo carried across
 * that boundary would refuse to probe a session that has nothing to do with the
 * one it remembers. `./context.ts` already bumps the generation on every connect
 * and on every server birth, so this reads that number rather than keeping a
 * second one.
 */
const foreignMemo = new Map<string, { generation: number; ids: Set<string> }>();

function memoFor(machineId: string): Set<string> {
  const generation = machineGeneration(machineId).generation;
  const held = foreignMemo.get(machineId);
  if (held !== undefined && held.generation === generation) return held.ids;
  const fresh = { generation, ids: new Set<string>() };
  foreignMemo.set(machineId, fresh);
  return fresh.ids;
}

/**
 * The `$-id`s already proven foreign on one machine, for the caller that wants
 * to ask {@link rescueNeeded} before it spends anything.
 */
export function foreignRemoteIds(machineId: string): ReadonlySet<string> {
  return memoFor(machineId);
}

/** Forget one machine's memo. Called when that machine's server is reborn. */
export function forgetForeignMemo(machineId: string): void {
  foreignMemo.delete(machineId);
}

// ---------------------------------------------------------------------------
// The decision, pure
// ---------------------------------------------------------------------------

/**
 * Whether one listed row is worth one `show-environment` exec.
 *
 * True only when the row carries NO `@gmux-id` and its `$-id` has not already
 * been proven foreign. It is the remote twin of `identityProbeNeeded` in
 * `../sessions/reconcile-plan.ts`, and it is deliberately the same shape so the
 * two rules can be compared side by side.
 */
export function rescueNeeded(
  row: { readonly gmuxId: string; readonly tmuxId: string },
  foreign: ReadonlySet<string>
): boolean {
  return row.gmuxId.length === 0 && !foreign.has(row.tmuxId);
}

// ---------------------------------------------------------------------------
// The rescue itself
// ---------------------------------------------------------------------------

/**
 * The one read the rescue sends, composed in one place.
 *
 * Exported so a test can assert the exact line rather than repeat it, because
 * the shape of this line is what decides whether one probe settles one session.
 * See the header for the three measurements behind leaving the variable off.
 */
export function paneEnvProbeArgs(tmuxId: string): string[] {
  return ['show-environment', '-t', tmuxId];
}

/**
 * Read one session's pane environment on a machine and re-bind it if it is ours.
 *
 * Returns the issued record on a match, and null on everything else: a session
 * that is not ours, a machine that did not answer, a stamp naming an id nobody
 * issued, and a `$-id` the memo already settled.
 *
 * The memo is consulted here as well as by {@link rescueNeeded}, so a caller
 * that forgets the guard still spends one exec per session rather than one per
 * refresh.
 *
 * A failed re-stamp is logged and the match still stands. The pane environment
 * is the identity that survived the interrupted create in the first place, and
 * the next pass tries the stamps again.
 */
export async function rescueRemoteRow(
  ctx: RemoteMachineContext,
  tmuxId: string
): Promise<IssuedRemoteId | null> {
  const memo = memoFor(ctx.machineId);
  if (memo.has(tmuxId)) return null;

  let printed: string;
  try {
    printed = await execOn(ctx, paneEnvProbeArgs(tmuxId));
  } catch (err) {
    // A machine that did not answer proves nothing about this session, so it is
    // NOT memoised. The next completed list asks again.
    //
    // This arm is now narrow, and the header records why. It used to catch the
    // ordinary case too, because naming the variable made tmux exit non zero
    // whenever a session was not ours, and every list then paid for another
    // probe of the same session and printed another one of these lines.
    machinesLog.warn(
      `${ctx.machineId} did not answer the identity read for ${tmuxId}: ` +
        `${(err as Error).message}`
    );
    return null;
  }

  const stamped = parsePaneEnvId(printed);
  const match =
    stamped === null
      ? null
      : (issuedRemoteIdsFor(ctx.machineId).find((one) => one.id === stamped) ??
        null);
  if (match === null) {
    // NOT OURS. Memoised so this session costs one exec in this server's life
    // and never another one.
    memo.add(tmuxId);
    return null;
  }

  await restamp(ctx, tmuxId, match);
  return match;
}

/**
 * The four stamps, in the order {@link REMOTE_STAMPS} declares them, so the list
 * a reader checks and the list this loop sends are one list.
 */
async function restamp(
  ctx: RemoteMachineContext,
  tmuxId: string,
  record: IssuedRemoteId
): Promise<void> {
  const values: Record<(typeof REMOTE_STAMPS)[number], string> = {
    '@gmux-id': record.id,
    '@gmux-agent': record.agent,
    '@gmux-name': oneLine(record.name),
    '@gmux-project': oneLine(record.projectPath)
  };
  for (const option of REMOTE_STAMPS) {
    try {
      await execOn(ctx, remoteStampArgs(tmuxId, option, values[option]));
    } catch (err) {
      machinesLog.warn(
        `${ctx.machineId} did not keep ${option} on ${tmuxId} during a ` +
          `rescue: ${(err as Error).message}`
      );
    }
  }
}

/**
 * The one line that matters in what `show-environment -t <target>` printed.
 *
 * The answer is the session's whole environment, one variable per line, so this
 * looks for the one name it cares about and ignores every other line. tmux
 * prints `GMUX_SESSION_ID=<value>` when the variable is set, and
 * `-GMUX_SESSION_ID` when it is explicitly unset. Anything else, including an
 * answer with no such line at all, is read as no stamp. Exported for the test,
 * because the shape of that line is what the whole rescue rests on.
 */
export function parsePaneEnvId(printed: string): string | null {
  for (const line of printed.split('\n')) {
    const text = line.trim();
    if (!text.startsWith('GMUX_SESSION_ID=')) continue;
    const value = text.slice('GMUX_SESSION_ID='.length);
    return value.length > 0 ? value : null;
  }
  return null;
}

/** Drop the issued set and every memo. Tests and the smoke. */
export function resetRescueForTests(): void {
  issued.clear();
  foreignMemo.clear();
}
