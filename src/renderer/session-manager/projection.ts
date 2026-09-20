/**
 * What the session manager DRAWS, from the store's own lists (Phase 293).
 *
 * ONE PURE FUNCTION, `buildManageProjection`, turns the two session lists the
 * store already holds into the groups and rows the sheet draws. It lives here
 * and not under `../state/` because it joins `statusVisual`, which lives in
 * `../app/`, and the store may not name the shell that composes it
 * (build/assert-import-boundaries.mjs).
 *
 * THE PROJECTION IS WHAT IS DRAWN. IT IS NEVER WHAT IS ACTED ON. A row carries
 * its `Session` so a cell can read a name and an agent, and a handler takes
 * `row.id` from it and nothing else: every press re-reads the row by that id
 * from the store and asks that verb's own gate over the fresh row (SPEC 4.0,
 * ./actions.ts). A row can sit on screen for minutes while another window, a
 * machine reconnecting or the session itself changes it, so the object a row
 * was drawn from is stale by the time a finger reaches it.
 *
 * THE INPUTS ARE `sessions` AND `pastSessions` AND NOTHING ELSE. No diagnostics
 * row, no process list and no orphan report reaches the sheet, so nothing
 * without a session id can become a target. A row with an empty id cannot
 * occur by type; it is still drawn, with no control on it (./ManagedGrid.tsx),
 * and ./view.ts leaves it out of every id list a verb reads.
 *
 * GROUPING IS BY WORKSPACE TARGET, MACHINE INCLUDED, AND NEVER BY BASENAME.
 * Two folders called `api` on two machines are two groups, and one path
 * spelled the same on this Mac and on a machine is two groups, because
 * `targetKey` writes a machine's folder as `<machineId>:<path>`. No path here
 * is ever compared case-folded or normalised: the projection compares the
 * strings main stored, so one folder is one group exactly when main made it
 * one row (Phase 274, `src/shared/workspace-target.ts`). The one
 * `localeCompare` in this file orders group LABELS, which are names.
 *
 * A CLOSED TAB FILTERS NOTHING OUT. `useApp().projects` holds only the open
 * tabs, and the renderer has no list of closed projects, so a closed
 * project's group is derived from its sessions: its label is the name the tab
 * had when it closed, or the folder's own name.
 */

import type { MachineStateView } from '@shared/ipc';
import type { OverviewSessionActivity } from '@shared/overview';
import type { Project, Session, SessionStatus } from '@shared/types';
import {
  localTarget,
  sameTarget,
  targetKey,
  targetOfProject,
  targetOfSession,
  type WorkspaceTarget
} from '@shared/workspace-target';
import { statusVisual, type StatusVisual } from '../app/status';
import { baseName } from '../editor/paths';
import { displayPath } from '../format';
import { tombstoneRestoreRefused } from '../settings/machines-copy';
import { agentShortLabel } from '../state/agents';
import { machineLabelFor } from '../state/machines-slice';
import {
  hasRestoreMaterial,
  LIFECYCLE_BRIDGE_MISSING,
  restoreActionCopy,
  restoreExitedCopy,
  sessionActionGates,
  SHELL_PATH_PENDING_TITLE,
  type SessionActionGates,
  type SessionHandback
} from '../state/resume';
import { effectiveStatusOf } from '../state/store';
import { END_UNREACHABLE_TITLE, NOTHING_TO_RESTORE_TITLE } from './copy';

export interface ManageProjectionInput {
  sessions: readonly Session[];
  pastSessions: readonly Session[];
  /** The open tabs, already in `sortProjects` order. */
  projects: readonly Project[];
  machineStates: readonly MachineStateView[];
  handbacks: Record<string, SessionHandback | undefined>;
  activity: Record<string, OverviewSessionActivity>;
  restoringIds: Record<string, boolean>;
  shellPathReady: boolean;
  canRestore: boolean;
  canDiscard: boolean;
}

/**
 * The ONE visible button a row carries. End on a live row, Restore on an
 * ended or removed one. An unreachable row draws End disabled, with the
 * reason, because it may be running and nothing that acts is offered on it.
 */
export type ManagePrimary =
  | { verb: 'end'; enabled: true; title: null }
  | { verb: 'end'; enabled: false; title: string }
  | { verb: 'restore'; enabled: boolean; title: string | null; busy: boolean };

export interface ManageRow {
  id: string;
  tab: 'managed' | 'past';
  /** For DRAWING. A handler reads `id` and re-reads the row by it. */
  session: Session;
  status: SessionStatus;
  visual: StatusVisual;
  groupKey: string;
  /** Null only for a past row whose machine a person removed. */
  target: WorkspaceTarget | null;
  tabOpen: boolean;
  gates: SessionActionGates;
  primary: ManagePrimary;
  /** Null: main has not answered for this row yet. */
  activity: OverviewSessionActivity | null;
  /**
   * A restore of this row is in the air. SPEC 2.7: a busy row is inert,
   * whatever its status reads; a row whose restore has not answered yet can
   * already read live, and its End, ellipsis and checkbox stay off until the
   * answer lands (the fix round, the integrator's open concern).
   */
  restoring: boolean;
  searchText: string;
}

export interface ManageGroup {
  key: string;
  label: string;
  path: string;
  /** Null for this Mac and for a machine a person removed. */
  machineId: string | null;
  /** Null for this Mac. */
  machineLabel: string | null;
  tabOpen: boolean;
  rows: ManageRow[];
}

export interface ManageProjection {
  managed: ManageGroup[];
  past: ManageGroup[];
  /**
   * The Past rows as ONE list, in main's order: newest removal first, exactly
   * as `sessions:listRemoved` answered. The same row objects `past` holds. It
   * is what the Past tab draws unless the project filter names one project
   * (the operator's ruling, 2026-09-19; ./view.ts).
   */
  pastRows: ManageRow[];
  /** Whole-tab totals. Filters never change them. */
  managedTotal: number;
  pastTotal: number;
}

/** Where one session belongs, before its group is built. */
interface Identity {
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
function groupIdentity(session: Session): Identity {
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
function named(label: string | undefined | null): string | null {
  return typeof label === 'string' && label.length > 0 ? label : null;
}

/**
 * The machine a group is on, in words. The row's own label first, then the
 * machines list, then the tombstone's. Null for this Mac, which is never
 * announced (Phase 70's badge rule, and "remote reads like local").
 */
function machineLabelOf(
  session: Session,
  states: readonly MachineStateView[]
): string | null {
  if (session.machineGone !== undefined) return session.machineGone.label;
  const machine = session.machine;
  if (machine === undefined) return null;
  return named(machine.label) ?? machineLabelFor(states, machine.id);
}

/** What the gates need that is not on the row, read from the input once. */
function gateEnv(
  input: ManageProjectionInput,
  id: string
): Parameters<typeof sessionActionGates>[2] {
  return {
    canRestore: input.canRestore,
    canDiscard: input.canDiscard,
    shellPathReady: input.shellPathReady,
    handback: input.handbacks[id]
  };
}

/**
 * Why Restore is off, or the sentence it carries when it is on, for a
 * Managed row that has ended. Every clause is a gate the policy already
 * keeps (`sessionActionGates`); this only chooses the words.
 */
function managedRestoreTitle(
  session: Session,
  status: SessionStatus,
  input: ManageProjectionInput
): string | null {
  const machine = session.machine;
  // Phase 72. A row on another machine reads ONE fact, main's own.
  if (machine !== undefined && !machine.canRestore) {
    return machine.restoreReason;
  }
  if (
    machine === undefined &&
    status === 'exited' &&
    !hasRestoreMaterial(session)
  ) {
    return NOTHING_TO_RESTORE_TITLE;
  }
  if (!input.canRestore) return LIFECYCLE_BRIDGE_MISSING;
  if (!input.shellPathReady) return SHELL_PATH_PENDING_TITLE;
  // A row on another machine carries no sentence: the projection holds
  // neither its resume argv nor its capture, so any promise would be a guess.
  if (machine !== undefined) return null;
  return status === 'restorable'
    ? restoreActionCopy(session)
    : restoreExitedCopy(session);
}

/** Why a past row's Restore is off, or null when it is on. */
function pastRestoreTitle(
  session: Session,
  input: ManageProjectionInput
): string | null {
  const gone = session.machineGone;
  if (gone !== undefined) return tombstoneRestoreRefused(gone.label);
  const machine = session.machine;
  if (machine !== undefined && !machine.canRestore) {
    return machine.restoreReason;
  }
  if (!input.canRestore) return LIFECYCLE_BRIDGE_MISSING;
  if (!input.shellPathReady) return SHELL_PATH_PENDING_TITLE;
  return null;
}

/**
 * The visible button, SPEC 2.7, row by row. ENABLEMENT IS THE GATES' ANSWER
 * and nothing else: this file never writes a fourth copy of the restore rule.
 * A restoring row is busy and inert.
 */
function primaryOf(
  session: Session,
  status: SessionStatus,
  gates: SessionActionGates,
  tab: 'managed' | 'past',
  input: ManageProjectionInput
): ManagePrimary {
  const busy = input.restoringIds[session.id] === true;
  if (tab === 'past') {
    return {
      verb: 'restore',
      enabled: gates.canRestorePastNow && !busy,
      title: pastRestoreTitle(session, input),
      busy
    };
  }
  if (gates.canEnd) return { verb: 'end', enabled: true, title: null };
  if (gates.unknown) {
    return { verb: 'end', enabled: false, title: END_UNREACHABLE_TITLE };
  }
  return {
    verb: 'restore',
    enabled: gates.canRestoreNow && !busy,
    title: gates.ended ? managedRestoreTitle(session, status, input) : null,
    busy
  };
}

/** A group while it is being collected. */
interface GroupDraft {
  identity: Identity;
  /** Each session with its place in the incoming list. */
  members: { session: Session; at: number }[];
  closedName: string | null;
  machineLabel: string | null;
}

/**
 * Collect one list into groups, in first-seen order, each holding its rows in
 * the incoming order. A later row's closed-tab record still names its group.
 */
function collect(
  list: readonly Session[],
  states: readonly MachineStateView[]
): GroupDraft[] {
  const byKey = new Map<string, GroupDraft>();
  list.forEach((session, at) => {
    const identity = groupIdentity(session);
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
    draft.closedName ??= named(session.closedProject?.name);
    draft.machineLabel ??= machineLabelOf(session, states);
  });
  return [...byKey.values()];
}

/** The open tab a group's target is, or -1. A removed machine's never is. */
function openIndex(
  identity: Identity,
  projects: readonly Project[]
): number {
  const target = identity.target;
  if (target === null) return -1;
  return projects.findIndex((p) => sameTarget(targetOfProject(p), target));
}

/**
 * Groups with an open tab first, in the tabs' own order; then closed groups by
 * label, ties by key. The label is a NAME, so it is compared as one; the key
 * holds a path, and it is compared byte for byte with `<`, which folds nothing.
 */
function orderGroups(groups: ManageGroup[], openAt: Map<string, number>): void {
  groups.sort((a, b) => {
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
  });
}

/**
 * One tab's groups, and the same rows as one list in the incoming order.
 *
 * The list is main's order COPIED, never re-derived: each row is written back
 * at the index its session had in the list main answered, so nothing here
 * sorts by `removedAt` or by anything else. Main already sorts the removed
 * list newest removal first (`listRemovedSessions` in
 * src/main/sessions/core.ts), and today's Past Sessions drew it as it came.
 */
function buildTab(
  list: readonly Session[],
  tab: 'managed' | 'past',
  input: ManageProjectionInput
): { groups: ManageGroup[]; inOrder: ManageRow[] } {
  const openAt = new Map<string, number>();
  const inOrder: ManageRow[] = new Array<ManageRow>(list.length);
  const groups: ManageGroup[] = collect(list, input.machineStates).map(
    (draft) => {
      const { identity } = draft;
      const at = openIndex(identity, input.projects);
      openAt.set(identity.key, at);
      const tabOpen = at !== -1;
      const label =
        (tabOpen ? named(input.projects[at]?.name) : null) ??
        draft.closedName ??
        baseName(identity.path);
      const where = displayPath(identity.path, identity.machineId ?? undefined);
      const rows = draft.members.map(({ session, at: place }): ManageRow => {
        const status = effectiveStatusOf(session);
        const gates = sessionActionGates(
          session,
          status,
          gateEnv(input, session.id)
        );
        const row: ManageRow = {
          id: session.id,
          tab,
          session,
          status,
          visual: statusVisual(status, session),
          groupKey: identity.key,
          target: identity.target,
          tabOpen,
          gates,
          primary: primaryOf(session, status, gates, tab, input),
          activity: input.activity[session.id] ?? null,
          restoring: input.restoringIds[session.id] === true,
          // The folder is in the haystack TWICE: as a person reads it (`~/…`)
          // and as main stored it, so a path pasted from Copy directory path
          // finds its sessions, as today's Past Sessions search did (the fix
          // round, W4). The session's own folder is there too, for a worktree.
          // Lowercasing a haystack for display matching compares no paths.
          searchText: [
            session.name,
            agentShortLabel(session.agent),
            label,
            where,
            identity.path,
            session.cwd === identity.path ? null : session.cwd,
            draft.machineLabel
          ]
            .filter((part): part is string => named(part) !== null)
            .join(' ')
        };
        inOrder[place] = row;
        return row;
      });
      return {
        key: identity.key,
        label,
        path: identity.path,
        machineId: identity.machineId,
        machineLabel: draft.machineLabel,
        tabOpen,
        rows
      };
    }
  );
  orderGroups(groups, openAt);
  return { groups, inOrder };
}

/**
 * The sheet's whole picture, both tabs. Pure: the same input answers the same
 * groups, and nothing here reads the store, the DOM or the clock.
 */
export function buildManageProjection(
  input: ManageProjectionInput
): ManageProjection {
  const past = buildTab(input.pastSessions, 'past', input);
  return {
    managed: buildTab(input.sessions, 'managed', input).groups,
    past: past.groups,
    pastRows: past.inOrder,
    managedTotal: input.sessions.length,
    pastTotal: input.pastSessions.length
  };
}
