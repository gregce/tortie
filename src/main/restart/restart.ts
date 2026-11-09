/**
 * Restart a session without destroying it first (Phase 19 item 8).
 *
 * WHAT WAS WRONG. The renderer's `restartSession` called `discard(sessionId)`
 * and then `create(...)`. Discard deletes the manifest row, the scrollback
 * snapshot and the hook settings file, so a create that then failed for any
 * reason — the agent binary gone after an upgrade, the project folder
 * unmounted, a full disk — left the user with nothing at all, from a button
 * with no undo. The reason the order was that way is in the comment it
 * carried: the replacement wanted the old display name back. That is a
 * cosmetic collision, and it was being paid for with the user's transcript.
 *
 * The replacement also carried only `{name, projectPath, cwd, agent}`, so a
 * session restarted after Phase 15 came back without its launch flags and
 * without SpecStory capture, and nothing said so.
 *
 * WHAT HAPPENS NOW, in this order and no other:
 *
 *   1. Read the old row. Recover its launch flags and its capture choice.
 *   2. CREATE the replacement. If this throws, the function throws and
 *      NOTHING has been touched — the row, the snapshot and the hook settings
 *      are all still there and the user can try again.
 *   3. Kill the old tmux session when one is still live, so a restart cannot
 *      leave a running pane behind that no row points at.
 *   4. Only now, discard the old row.
 *
 * WHY IT IS IN MAIN. Two reasons, and the second is the one that decided it.
 * The renderer cannot hold an invariant across a window reload, so a reload
 * between its create and its discard used to leave a duplicate. And the launch
 * flags live in the manifest row's argv, which the renderer never sees.
 *
 * THE NAME. The replacement is created while the old row still exists, so tmux
 * appends a suffix to the sanitized tmux name for the few hundred milliseconds
 * both are alive. The DISPLAY name, which is the only one a person reads, is
 * the original on both rows and is the original on the survivor. No tmux
 * vocabulary reaches the UI, so the suffix is invisible.
 *
 * PHASE 84 ADDED THE FIRST REFUSAL THIS FUNCTION HAS EVER HAD, and the defect
 * behind it lost work. A row whose session runs on another machine was
 * restarted here like any other. Step 2 composed a `CreateSessionInput` with no
 * machine on it, so the create took the local branch and started the session on
 * this Mac. Step 4 then discarded the original, which is the hard delete. The
 * agent kept running on the other machine, the record of it was gone, and the
 * tab showed a session on this Mac wearing the other one's name.
 *
 * The refusal is in main rather than in the renderer because three renderer
 * surfaces draw Restart and a fourth one would miss the guard. Nothing is
 * created and nothing is discarded, because the check runs before step 2.
 *
 * PHASE 119 ADDED THE ONE OPTION THIS FUNCTION TAKES. A person can ask for the
 * replacement to come back with SpecStory turned off, and that answer outranks
 * the old row's capture setting. The four step order is untouched, the old row
 * is discarded exactly as it always was, and nothing is written back to it,
 * because the replacement is bare from birth and there is no setting left to
 * flip. `RestartOutcome.capture` reports what happened rather than what the old
 * row said.
 *
 * PHASE 305 READS THE ROW AGAIN AFTER THE CREATE, and decides what happens to
 * it from what that read says rather than from step 1's. The create spawns a
 * session and is hundreds of milliseconds wide, a Remove is accepted on an
 * ended row, and so a Remove could land inside it: step 4 then deleted, on the
 * strength of the read taken before the create, the row the person had just
 * removed, with its Past Sessions entry and the only record of that
 * conversation. Now a row that carries a removal date is kept
 * (`restartKeepsRow` in ../sessions/lifecycle-gate.ts) beside its replacement,
 * a row that is gone is not an error, a kill that failed keeps the row, and a
 * row is live by what it says now, `discarded` among the ended words. When a
 * kill was awaited, the delete reads the row once more after it, so nothing is
 * awaited between the read that decides the delete and the delete.
 * `RestartOutcome.oldRow` says which. An ordinary ended row is still deleted.
 */

import type { CaptureChoice } from '@shared/ipc';
import type { CreateSessionInput, Session } from '@shared/types';
import type { ManifestSessionRecord } from '../manifest/store';
import { recoverLaunchExtras } from './extras';
// PHASE 84. `../machines/remote-copy` is pure data and imports nothing at all,
// so naming it here keeps this module free of the session core, of the machines
// barrel and of Electron, which is what lets its tests drive a fake host.
import { RESTART_ON_MACHINE } from '../machines/remote-copy';
// PHASE 305. A pure leaf (one type import, one shared constant), so this
// module stays free of the session core and of Electron.
import { restartKeepsRow } from '../sessions/lifecycle-gate';
import { getLog } from '../log';

/**
 * Scope "restart" (Phase 35). Every error and warning from this
 * directory is one record in `<userData>/logs/app.log`. The console
 * line is unchanged for dev terminals; what is new is that a packaged
 * build keeps it.
 */
const restartLog = getLog('restart');


/**
 * The slice of GmuxCore a restart needs, stated structurally so this module
 * does not import the session core and close a cycle through its barrel.
 */
export interface RestartHost {
  readonly manifest: {
    getSession(sessionId: string): ManifestSessionRecord | undefined;
  };
  createSession(input: CreateSessionInput): Promise<Session>;
  killSession(sessionId: string): Promise<void>;
  discardSession(sessionId: string): void;
  broadcastSessions(): void;
}

/** What a restart did, for the log and for the tests. */
export interface RestartOutcome {
  /** The session that now exists. */
  session: Session;
  /** Flags carried over from the old session. Empty when it had none. */
  extras: readonly string[];
  /** False when the old argv matched no known launch shape — see ./extras. */
  extrasRecovered: boolean;
  /**
   * True when the replacement was asked to run under SpecStory capture.
   *
   * Phase 119: this reports what HAPPENED, not what the old row said. A
   * restart that declined capture reports false even though the old row
   * recorded a capture.
   */
  capture: boolean;
  /** True when a live tmux session had to be stopped first. */
  killedOld: boolean;
  /**
   * PHASE 305. True when the old row was kept because it carries a removal
   * date: the person removed it while it restarted, so it stays in Past
   * Sessions beside its replacement.
   */
  keptRemovedRow: boolean;
  /** PHASE 305. What happened to the old row. */
  oldRow: RestartOldRow;
}

/**
 * PHASE 305. What a restart did with the row it replaced:
 *
 *  - `deleted`: the hard delete step 4 has always made, for an ordinary row.
 *  - `kept-removed`: the row carries a removal date, so it is kept.
 *  - `kept-kill-failed`: the old session could not be stopped, so its row is
 *    kept, because a pane that survived its kill and then lost its row is the
 *    orphan step 3 exists to prevent.
 *  - `already-gone`: another writer deleted the row first; nothing is deleted.
 */
export type RestartOldRow = 'deleted' | 'kept-removed' | 'kept-kill-failed' | 'already-gone';

/**
 * PHASE 305. Is this status a session that may still have a pane? The three
 * ended words are named, `discarded` among them, and `unknown` is live: a row
 * Tortie could not see may still have a pane, as it always could.
 */
function mayHaveAPane(status: ManifestSessionRecord['status']): boolean {
  return status !== 'exited' && status !== 'restorable' && status !== 'discarded';
}

/**
 * Create the replacement, then remove the original. Rejects with the create's
 * own error, having removed nothing.
 */
export async function restartSession(
  host: RestartHost,
  sessionId: string,
  options: CaptureChoice = {}
): Promise<RestartOutcome> {
  const rec = host.manifest.getSession(sessionId);
  if (rec === undefined) {
    throw new Error(`No session ${sessionId} to restart.`);
  }

  // PHASE 84, AND IT IS BEFORE STEP 2 ON PURPOSE. A restart of a session that
  // runs on another machine would create the replacement on this Mac and then
  // hard delete the only record of the one still running over there. Nothing
  // below this line runs for such a row, so nothing is created and nothing is
  // discarded.
  //
  // The literal is `LOCAL_MACHINE_ROW` from `../manifest/codecs`, which is the
  // one definition of the word. It is written out here rather than imported
  // because importing it as a value would pull the whole manifest store, and
  // with it better-sqlite3 and Electron, into this module's graph. This file is
  // deliberately free of both.
  if (rec.machineId !== undefined && rec.machineId !== 'local') {
    throw new Error(RESTART_ON_MACHINE);
  }

  const recovered = recoverLaunchExtras(rec);
  const extras = recovered ?? [];
  // The capture choice, read from the row rather than from the argv: a
  // wrapped argv proves capture was applied, and this field is what Phase 15
  // records the request as.
  //
  // PHASE 119. A person can ask for the replacement to come back with SpecStory
  // turned off, and that answer outranks the old row. Nothing is written back
  // to the old row, because step 4 discards it: the replacement is bare from
  // birth and there is no setting left to flip.
  const declined = options.withoutCapture === true;
  const capture = !declined && rec.specstory?.enabled === true;

  // PHASE 84. This composition drops `machineId` on the floor, and that is now
  // safe rather than lucky, because the refusal above means every row reaching
  // this line runs on this Mac. Passing the machine through would be a remote
  // restart, which is a different verb and is not built here.
  const input: CreateSessionInput = {
    name: rec.name,
    projectPath: rec.projectPath,
    cwd: rec.cwd,
    agent: rec.agent,
    ...(extras.length > 0 ? { extraArgs: [...extras] } : {}),
    ...(capture ? { capture: true } : {}),
    // PHASE 202. Restart means start THIS session again, so the replacement
    // runs under the login the original ran under rather than under whichever
    // one happens to be chosen now. A login the person has removed since falls
    // back to the default with one sentence, exactly as a restore does.
    //
    // PHASE 211, FIX ROUND. Except when the person asked for the CHOSEN login,
    // which is the `Restart now` beside a switch. Then no login is named and
    // the create resolves the chosen one, exactly as a create from the toolbar
    // does, and the new row carries that name. The original login is not
    // written anywhere on this path, because the whole point of the control is
    // that the session leaves it.
    ...(rec.login !== undefined && options.underChosenLogin !== true
      ? { login: rec.login }
      : {})
  };

  // STEP 2. Everything the user could lose is still on disk while this runs.
  const session = await host.createSession(input);

  // PHASE 305. THE ROW AGAIN, after the create and before anything else, and
  // every decision below is read off this rather than off `rec`. Step 1's read
  // is hundreds of milliseconds old by now, and a Remove accepted inside the
  // create made it wrong.
  const fresh = host.manifest.getSession(sessionId);

  // STEP 3. A row that is still live has a pane behind it. Discarding without
  // killing would orphan that pane: it keeps its `@gmux-id`, no row points at
  // it any more, and reconcile will never adopt it back.
  let killedOld = false;
  let killFailed = false;
  if (fresh !== undefined && !restartKeepsRow(fresh) && mayHaveAPane(fresh.status)) {
    try {
      await host.killSession(sessionId);
      killedOld = true;
    } catch (err) {
      // The replacement exists and is what the user asked for. A kill that
      // failed is worth a log line, not a failed restart. PHASE 305: and it is
      // not a delete either, so the row is kept (below).
      killFailed = true;
      restartLog.warn(
        `restart: could not stop the old '${rec.name}': ` +
          `${(err as Error).message}`
      );
    }
  }

  // STEP 4, and not one step earlier. PHASE 305: decided from the row as it is
  // NOW. When no kill was awaited that is the read above; when one was, it is
  // read again, because the kill's awaits are a second window a removal can
  // land in (a session that ended by itself during them is one a Remove is
  // accepted on).
  const now = killedOld ? host.manifest.getSession(sessionId) : fresh;
  let oldRow: RestartOldRow;
  if (killFailed) {
    oldRow = 'kept-kill-failed';
  } else if (now === undefined) {
    oldRow = 'already-gone';
  } else if (restartKeepsRow(now)) {
    oldRow = 'kept-removed';
    restartLog.info(
      `restart: '${rec.name}' was removed while it restarted; the new session ` +
        'exists and the removed one is still in Past Sessions.'
    );
  } else {
    host.discardSession(sessionId);
    oldRow = 'deleted';
  }
  host.broadcastSessions();

  if (declined && rec.specstory?.enabled === true) {
    restartLog.warn(
      `restart: '${rec.name}' came back without SpecStory at the person's ` +
        'request, so the new session does not save its history.'
    );
  }

  if (recovered === null) {
    restartLog.warn(
      `restart: '${rec.name}' came back without its launch flags — ` +
        `the recorded argv matched no known launch shape for ${rec.agent}.`
    );
  }

  return {
    session,
    extras,
    extrasRecovered: recovered !== null,
    capture,
    killedOld,
    keptRemovedRow: oldRow === 'kept-removed',
    oldRow
  };
}
