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
 * ## The issued set now survives a restart, and PHASE 117 is what changed that
 *
 * This paragraph used to say that the issued set lives in memory for one Tortie
 * run, that a create interrupted in the last run could not be rescued by this
 * one, and that M5's per machine argv capture was what would make it durable.
 * M5 shipped in Phase 72 and Phase 117 spends it.
 *
 * A remote create writes a durable manifest row before it sends the line that
 * starts the session. A create whose answer was lost now keeps that row and
 * writes `unknown` into its status column. On the first list pass of every run,
 * `./remote-sessions.ts` reads those rows back and calls
 * {@link seedIssuedRemoteIds} with them, once per machine. So the same immutable
 * id the first run generated is what the rescue binds, and no second create is
 * ever made for the same session.
 *
 * ## What is STILL not true, and it is named in the commit body
 *
 * A session created by 0.34 or 0.35 wrote no manifest row at all, so there is
 * nothing to seed from and it still cannot be rescued across a restart. It is
 * running on that machine and it shows as a session Tortie did not create.
 *
 * ## Where the four stamp names come from
 *
 * From `./remote-stamps.ts`, which is a leaf that imports nothing. There is one
 * definition of what Tortie stamps on a session it created, and a second copy
 * here would be a second place a stamp could be dropped.
 *
 * IT USED TO COME FROM `./remote-sessions.ts`, and Phase 123 moved it. That file
 * imports this one, so the two loaded each other, and the pair sat inside a six
 * module runtime cycle. Reading the names from a leaf ends the cycle and changes
 * no value: the same four names in the same order compose the same stamps.
 */

import { getLog } from '../log';
import type { RemoteMachineContext } from './context';
import { LOCAL_MACHINE_ID, machineGeneration } from './context';
import { execOn } from './exec-plane';
import { REMOTE_STAMPS, oneLine, remoteStampArgs } from './remote-stamps';

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
 * Forget an id whose `@gmux-id` stamp landed.
 *
 * The row is on that machine's list from then on, carrying `@gmux-id`, so no
 * later list can read it as foreign and no rescue can be needed for it.
 *
 * TWO CALLERS WRITE THAT STAMP and both call this. The create does when its own
 * stamp lands, and the rescue does when it binds a session a past run left
 * behind. The Phase 117 fix round added the second one, because without it a
 * rescued row stayed unconfirmed for the rest of the run and the restore gate
 * went on refusing it after the machine had answered.
 */
export function clearIssuedRemoteId(id: string): void {
  issued.delete(id);
}

/**
 * Fill the issued set from rows a previous run left unconfirmed (Phase 117).
 *
 * Returns how many were added, so a caller can log a number rather than a claim.
 *
 * Three rows are refused, and each refusal is a rule rather than a taste:
 *
 *  - A row naming this Mac. The issued set is about sessions on other machines,
 *    and a local row reaching it would let a remote probe adopt a session this
 *    Mac holds.
 *  - A row whose id the CURRENT run already issued. The live record carries the
 *    values this run sent, and a seeded record carries what a past run recorded,
 *    so the live one wins.
 *  - A row with no id at all.
 *
 * The caller decides which rows are unconfirmed. `unconfirmedRemoteRecords` in
 * `./remote-record.ts` is the only source, and it returns the rows whose status
 * column reads `unknown`.
 */
export function seedIssuedRemoteIds(records: readonly IssuedRemoteId[]): number {
  let added = 0;
  for (const record of records) {
    if (record.id.length === 0) continue;
    if (record.machineId.length === 0) continue;
    if (record.machineId === LOCAL_MACHINE_ID) continue;
    if (issued.has(record.id)) continue;
    issued.set(record.id, record);
    added += 1;
  }
  return added;
}

/**
 * True while this id is still waiting to be accounted for.
 *
 * Two things read it. The restore gate refuses a row it answers true for,
 * because that row may be a session running right now. The write back of a
 * completed pass leaves such a row alone while a rescue is still pending, so a
 * session about to be re-bound is not written to `restorable` first.
 */
export function issuedRemoteIdHeld(id: string): boolean {
  return issued.has(id);
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

  // PHASE 117 FIX ROUND. The id leaves the issued set here, and only when the
  // `@gmux-id` stamp itself landed. Until this line the set had two ways in and
  // one way out: a create whose own stamp landed cleared it, and a pass that
  // proved the session absent cleared it, but a rescue that BOUND the session
  // did not. So a row rescued from a past run stayed unconfirmed for the rest of
  // the run, and the restore gate went on refusing it after the machine had
  // answered and the session was back on the list under its own name. MEASURED
  // by `npm run smoke:p117` on 2026-08-20 at its step 14.
  if (await restamp(ctx, tmuxId, match)) clearIssuedRemoteId(match.id);
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
): Promise<boolean> {
  const values: Record<(typeof REMOTE_STAMPS)[number], string> = {
    '@gmux-id': record.id,
    '@gmux-agent': record.agent,
    '@gmux-name': oneLine(record.name),
    '@gmux-project': oneLine(record.projectPath)
  };
  // The one answer the caller acts on. The other three stamps are presentation,
  // and a session missing one of them is still bound and still shown. `@gmux-id`
  // is the identity, so it is the only one whose landing may settle a row.
  let idLanded = false;
  for (const option of REMOTE_STAMPS) {
    try {
      await execOn(ctx, remoteStampArgs(tmuxId, option, values[option]));
      if (option === '@gmux-id') idLanded = true;
    } catch (err) {
      machinesLog.warn(
        `${ctx.machineId} did not keep ${option} on ${tmuxId} during a ` +
          `rescue: ${(err as Error).message}`
      );
    }
  }
  return idLanded;
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
