/**
 * One rule with the Mac for a list of sessions: which group a session is in,
 * what that group is called and on which machine, the order groups come in,
 * and which sessions a lifecycle choice keeps (Phase 316.7,
 * build/p3167/SPEC.md D6).
 *
 * MOVED, NOT REWRITTEN. Every function here was the session manager's
 * (`src/renderer/session-manager/projection.ts` and `view.ts`), moved token for
 * token, with one argument made explicit (below). The sheet calls them where it
 * computed them, and the phone's door (`src/main/pocket/routes.ts`) calls the
 * same functions, so a phone groups, labels and partitions by the sheet's rule
 * rather than by a second spelling of it that would drift.
 *
 * GROUPING IS BY WORKSPACE TARGET, MACHINE INCLUDED, AND NEVER BY BASENAME.
 * Two folders called `api` on two machines are two groups, and one path
 * spelled the same on this Mac and on a machine is two groups, because
 * `targetKey` writes a machine's folder as `<machineId>:<path>`. No path here
 * is ever compared case-folded or normalised: the strings main stored are
 * compared, so one folder is one group exactly when main made it one row
 * (Phase 274, `./workspace-target.ts`). The one `localeCompare` in this file
 * orders group LABELS, which are names.
 *
 * THE ONE ARGUMENT MADE EXPLICIT. The machine label a group carries was read
 * through the renderer's machines list, which main does not have. So
 * {@link collectSessionGroups} takes the labeller as an argument: the sheet
 * passes its own `machineLabelOf`, the door passes `PocketFacts.machineLabel`.
 * The first non-null answer among a group's members is the group's, exactly as
 * before.
 *
 * ONE DIFFERENCE THE DOOR TAKES, ALSO AS AN ARGUMENT: open tabs first. The
 * sheet orders the groups whose folder is an open tab first, in the tabs' own
 * order, because the sheet sits beside those tabs. A phone has no tabs, so the
 * door hands {@link compareSessionGroups} an EMPTY map and every group is
 * ordered by its label, then its key.
 *
 * TWO THINGS THE DOOR DRAWS DIFFERENTLY FROM THE SHEET, NAMED HERE SO NOBODY
 * "FIXES" EITHER ONE BACK (SPEC §15 F17):
 *
 *  - a creation age in ONE unit, `3d old`, where the sheet's Created cell draws
 *    two (`ageTwoUnits`): the phone's row has room for one short word beside the
 *    name, and every other age on that row is one unit (`formatAge`);
 *  - a Name sort's tie broken by the session id, where the sheet keeps the
 *    incoming order: the door's answer is re-derived and compared answer for
 *    answer, so two reads over the same facts must be the same list.
 *
 * Imports values from `./workspace-target` and types from `./types` and
 * `./session-gates`, and nothing else.
 */

import type { Session } from './types';
import type { SessionActionGates } from './session-gates';
import {
  localTarget,
  targetKey,
  targetOfSession,
  type WorkspaceTarget
} from './workspace-target';

// ---------------------------------------------------------------------------
// Which group a session is in
// ---------------------------------------------------------------------------

/** Where one session belongs, before its group is built. */
export interface SessionGroupIdentity {
  key: string;
  target: WorkspaceTarget | null;
  path: string;
  machineId: string | null;
}

/**
 * The group a session belongs to, from its target and nothing looser.
 *
 * A past row whose machine a person removed carries `machineGone` and NO
 * machine id, by design (`src/main/manifest/codecs.ts`), so nothing could say
 * which computer its path is on. It keys under `!gone:<label>:<path>` and
 * carries no target. `!` cannot start a machine id or an absolute path, so
 * that key can never meet a live group's key, and a restore can never try to
 * open that path on this Mac.
 */
export function sessionGroupIdentity(session: Session): SessionGroupIdentity {
  const gone = session.machineGone;
  if (gone !== undefined) {
    return {
      key: `!gone:${gone.label}:${session.projectPath}`,
      target: null,
      path: session.projectPath,
      machineId: null
    };
  }
  // `targetOfSession` answers null only for a null session, so the fallback
  // is for the type and is never taken.
  const resolved = targetOfSession(session) ?? localTarget(session.projectPath);
  return {
    key: targetKey(resolved),
    target: resolved,
    path: resolved.path,
    machineId: session.machine === undefined ? null : resolved.machineId
  };
}

/** A label that says something: a string with at least one character. */
export function firstNamed(label: string | undefined | null): string | null {
  return typeof label === 'string' && label.length > 0 ? label : null;
}

// ---------------------------------------------------------------------------
// Collecting a list into groups
// ---------------------------------------------------------------------------

/** A group while it is being collected. */
export interface SessionGroupDraft {
  identity: SessionGroupIdentity;
  /** Each session with its place in the incoming list. */
  members: { session: Session; at: number }[];
  closedName: string | null;
  machineLabel: string | null;
}

/**
 * Collect one list into groups, in first-seen order, each holding its rows in
 * the incoming order. A later row's closed-tab record still names its group.
 *
 * `labelOf` is the machine a session is on, in words, or null for this Mac.
 * The first non-null answer among a group's members is the group's.
 */
export function collectSessionGroups(
  list: readonly Session[],
  labelOf: (session: Session) => string | null
): SessionGroupDraft[] {
  const byKey = new Map<string, SessionGroupDraft>();
  list.forEach((session, at) => {
    const identity = sessionGroupIdentity(session);
    let draft = byKey.get(identity.key);
    if (draft === undefined) {
      draft = {
        identity,
        members: [],
        closedName: null,
        machineLabel: null
      };
      byKey.set(identity.key, draft);
    }
    draft.members.push({ session, at });
    draft.closedName ??= firstNamed(session.closedProject?.name);
    draft.machineLabel ??= labelOf(session);
  });
  return [...byKey.values()];
}

// ---------------------------------------------------------------------------
// What a group is called, and the order groups come in
// ---------------------------------------------------------------------------

/**
 * A group's label: the open tab's name, else the name the tab had when it
 * closed, else the folder's own name. The folder's name is everything after
 * the last slash, spelled here as the editor's `baseName` spells it, because
 * shared code may not import the renderer.
 */
export function sessionGroupLabel(
  openName: string | null,
  closedName: string | null,
  path: string
): string {
  return openName ?? closedName ?? path.slice(path.lastIndexOf('/') + 1);
}

/**
 * Groups with an open tab first, in the tabs' own order; then closed groups by
 * label, ties by key. The label is a NAME, so it is compared as one; the key
 * holds a path, and it is compared byte for byte with `<`, which folds nothing.
 *
 * `openAt` is each open group's index among the tabs. The door hands it an
 * empty map, because a phone has no tabs.
 */
export function compareSessionGroups(
  a: { readonly key: string; readonly label: string },
  b: { readonly key: string; readonly label: string },
  openAt: ReadonlyMap<string, number>
): number {
  const ia = openAt.get(a.key) ?? -1;
  const ib = openAt.get(b.key) ?? -1;
  if (ia !== -1 || ib !== -1) {
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  }
  const byLabel = a.label.localeCompare(b.label);
  if (byLabel !== 0) return byLabel;
  return a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
}

// ---------------------------------------------------------------------------
// The lifecycle partition
// ---------------------------------------------------------------------------

/** The lifecycle choice: every session, the active ones, or the ended ones. */
export type SessionLifecycleChoice = 'all' | 'active' | 'ended';

/**
 * Whether a lifecycle choice keeps a session (Phase 303, moved in 316.7).
 *
 * It reads the partition `sessionActionGates` ALREADY computed for the row,
 * and names no status of its own: Active is what the gates call `live` or
 * `unknown`, Ended is what they call `ended`, All keeps every row. "Live" is
 * already spelled in main's `removeRefusal` and in `sessionActionGates`, and a
 * third spelling here would be one more place for the two to drift from.
 * `unknown` is Active because Restore never acts on it, so Ended, the segment
 * for what can be restored, would promise a verb the row does not offer.
 */
export function lifecycleKeeps(
  lifecycle: SessionLifecycleChoice,
  gates: Pick<SessionActionGates, 'live' | 'unknown' | 'ended'>
): boolean {
  if (lifecycle === 'active' && !(gates.live || gates.unknown)) return false;
  if (lifecycle === 'ended' && !gates.ended) return false;
  return true;
}
