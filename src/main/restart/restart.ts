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
 */

import type { CreateSessionInput, Session } from '@shared/types';
import type { ManifestSessionRecord } from '../manifest/store';
import { recoverLaunchExtras } from './extras';
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
  /** True when the replacement was asked to run under SpecStory capture. */
  capture: boolean;
  /** True when a live tmux session had to be stopped first. */
  killedOld: boolean;
}

/**
 * Create the replacement, then remove the original. Rejects with the create's
 * own error, having removed nothing.
 */
export async function restartSession(
  host: RestartHost,
  sessionId: string
): Promise<RestartOutcome> {
  const rec = host.manifest.getSession(sessionId);
  if (rec === undefined) {
    throw new Error(`No session ${sessionId} to restart.`);
  }

  const recovered = recoverLaunchExtras(rec);
  const extras = recovered ?? [];
  // The capture choice, read from the row rather than from the argv: a
  // wrapped argv proves capture was applied, and this field is what Phase 15
  // records the request as.
  const capture = rec.specstory?.enabled === true;

  const input: CreateSessionInput = {
    name: rec.name,
    projectPath: rec.projectPath,
    cwd: rec.cwd,
    agent: rec.agent,
    ...(extras.length > 0 ? { extraArgs: [...extras] } : {}),
    ...(capture ? { capture: true } : {})
  };

  // STEP 2. Everything the user could lose is still on disk while this runs.
  const session = await host.createSession(input);

  // STEP 3. A row that is still live has a pane behind it. Discarding without
  // killing would orphan that pane: it keeps its `@gmux-id`, no row points at
  // it any more, and reconcile will never adopt it back.
  let killedOld = false;
  const live = rec.status !== 'exited' && rec.status !== 'restorable';
  if (live) {
    try {
      await host.killSession(sessionId);
      killedOld = true;
    } catch (err) {
      // The replacement exists and is what the user asked for. A kill that
      // failed is worth a log line, not a failed restart.
      restartLog.warn(
        `restart: could not stop the old '${rec.name}': ` +
          `${(err as Error).message}`
      );
    }
  }

  // STEP 4, and not one step earlier.
  host.discardSession(sessionId);
  host.broadcastSessions();

  if (recovered === null) {
    restartLog.warn(
      `restart: '${rec.name}' came back without its launch flags — ` +
        `the recorded argv matched no known launch shape for ${rec.agent}.`
    );
  }

  return { session, extras, extrasRecovered: recovered !== null, capture, killedOld };
}
