/**
 * Harness probe for the split group's focus affordance (Phase 40 item 2).
 *
 * Driven by the GMUX_SHOT hook (`splitGroup` on ShotDriveSpec). It builds a
 * real multiplexed group of 2 or 3 sessions, puts focus on one leaf, and can
 * hold one leaf at `needs_input` so a capture shows the status dot on a
 * dimmed pane.
 *
 * The sessions are REAL, created through the store's own `createSession`, for
 * one reason. Item 2 is a claim about readability of live terminal content
 * under a dim, and a renderer-only fake session has no terminal at all. It
 * renders the cannot-connect state, so a capture of it would photograph an
 * empty box and prove nothing.
 *
 * The grouping goes through `useLayout.splitWith`, which is the same action
 * the drag of a session tab onto a pane's armed half calls. Nothing here
 * reimplements the split tree.
 *
 * `attentionOn` writes the status into the RENDERER STORE only. It never asks
 * main to report a status and it never reaches the manifest, so it cannot
 * break the rule that a user's own input may not raise "needs input" on a
 * session. It is a paint fixture and nothing else.
 */

import type { SessionStatus } from '@shared/types';
import { useApp } from '../../state/store';
import { useLayout } from '../../state/layout';

export interface SplitGroupProbeSpec {
  projectPath: string;
  /** How many real sessions to create and multiplex. 2 or 3. */
  count: 2 | 3;
  /** Which leaf holds focus, 0-based in creation order. */
  focus: number;
  /** Force this leaf's status to needs_input after the group is built. */
  attentionOn?: number;
}

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/** Stage marker, teed into the harness output by GMUX_SHOT_VERBOSE=1. */
const step = (name: string): void => {
  console.log(`[shot-drive] splitGroup: ${name}`);
};

/** Live (not ended) session ids in the active project, in store order. */
function liveIds(): string[] {
  return useApp
    .getState()
    .projectSessions()
    .filter((x) => x.status !== 'exited' && x.status !== 'restorable')
    .map((x) => x.id);
}

/**
 * Create one session and return the id it landed under.
 *
 * Found by DIFFERENCE against the ids that existed a moment ago, never by
 * name. `createSession` dedupes a display name silently, so a run against a
 * project that already holds a session of this name would otherwise hand back
 * the pre-existing row and the probe would group the wrong pane.
 */
async function createOne(name: string): Promise<string | null> {
  const before = new Set(liveIds());
  await useApp.getState().createSession({ name, agent: 'shell' });
  for (let i = 0; i < 40; i++) {
    const fresh = liveIds().find((id) => !before.has(id));
    if (fresh !== undefined) return fresh;
    await wait(250);
  }
  return null;
}

/** The interval re-stamping a held status over main's session list. */
let statusHold: number | null = null;

/**
 * Keep one session at `status` in the store.
 *
 * A single `setState` is not enough. Main owns the session list, and every
 * `sessions:changed` replaces the array wholesale, which puts the real status
 * back before the capture is taken. The interval re-stamps it, and stops
 * itself once the session is gone from the store, which is what the harness
 * cleanup does at the end of a run.
 */
function holdStatus(sessionId: string, status: SessionStatus): void {
  const stamp = (): void => {
    const rows = useApp.getState().sessions;
    const hit = rows.find((x) => x.id === sessionId);
    if (hit === undefined) {
      if (statusHold !== null) window.clearInterval(statusHold);
      statusHold = null;
      return;
    }
    if (hit.status === status) return;
    useApp.setState({
      sessions: rows.map((x) => (x.id === sessionId ? { ...x, status } : x))
    });
  };
  stamp();
  if (statusHold !== null) window.clearInterval(statusHold);
  statusHold = window.setInterval(stamp, 200);
}

/**
 * Stop the held status. Called by the harness cleanup so the last moments of
 * a run report main's real status rather than the fixture's.
 */
export function stopSplitGroupHolds(): void {
  if (statusHold !== null) window.clearInterval(statusHold);
  statusHold = null;
}

/** Wait until every pane of the group has painted its terminal. */
async function waitForPanes(count: number): Promise<void> {
  for (let i = 0; i < 60; i++) {
    const panes = document.querySelectorAll('.split-pane');
    const drawn = document.querySelectorAll('.split-pane-body .xterm');
    if (panes.length >= count && drawn.length >= count) break;
    await wait(250);
  }
  // One settle beat for the attach to write the prompt into each pane. A
  // dim over an empty pane is not a readable dim.
  await wait(1500);
}

/**
 * Build the group and return the created session ids, in creation order, so
 * the hook's cleanup can kill every one of them.
 */
export async function driveSplitGroup(
  spec: SplitGroupProbeSpec
): Promise<string[]> {
  const ids: string[] = [];
  for (let i = 0; i < spec.count; i++) {
    const name = `p40-split-${String(i + 1)}`;
    step(`creating ${name}`);
    const id = await createOne(name);
    if (id === null) {
      step(`create failed for ${name}`);
      return ids;
    }
    ids.push(id);
  }

  // splitWith is the drag-a-tab-onto-a-pane action. The first call turns two
  // singles into a group; the second drops the third session onto a leaf of
  // that group, which is exactly how a person builds a 3-pane group.
  const layout = useLayout.getState();
  const first = ids[0];
  const second = ids[1];
  if (first === undefined || second === undefined) return ids;
  step(`grouping ${ids.join(', ')}`);
  layout.splitWith(spec.projectPath, first, 'right', second);
  await wait(400);
  const third = ids[2];
  if (third !== undefined) {
    // 'right' again, so three sessions land as three columns left to right in
    // creation order. That makes `focus: 1` literally the middle pane, which
    // is the shape the 3-pane screenshot read is written against.
    layout.splitWith(spec.projectPath, second, 'right', third);
    await wait(400);
  }

  await waitForPanes(spec.count);

  const focusId = ids[spec.focus];
  if (focusId !== undefined) {
    step(`focusing leaf ${String(spec.focus)}`);
    useLayout.getState().selectLeaf(spec.projectPath, focusId);
    await wait(500);
  }

  if (spec.attentionOn !== undefined) {
    const attentionId = ids[spec.attentionOn];
    if (attentionId !== undefined) {
      step(`holding needs_input on leaf ${String(spec.attentionOn)}`);
      holdStatus(attentionId, 'needs_input');
      await wait(400);
    }
  }

  const panes = document.querySelectorAll('.split-pane').length;
  const focused = document.querySelectorAll('.split-pane.focused').length;
  step(`built panes=${String(panes)} focused=${String(focused)}`);
  return ids;
}
