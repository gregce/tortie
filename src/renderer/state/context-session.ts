/**
 * The session readout — the Context view in its second mode (Phase 22,
 * research 29 §8.3).
 *
 * ## What it is
 *
 * The Context view has two modes and one component tree. `browse` lists what
 * the configuration is now. `session` lists the same rows, pinned to one
 * session, with three marks on them: changed, added and removed. The header
 * above them says when that session started and how much has moved since.
 *
 * DESIGN.md §11.1's rule applied before the drift rather than after it.
 * `AgentGrid` became one component only after the ⌘T copy had already rotted,
 * so the readout is a mode from the first commit rather than a second panel
 * that will later be merged.
 *
 * ## Where the two halves of the answer come from
 *
 * The record of what the session launched with is one IPC call that reads one
 * manifest column. The current set is the rows the view has ALREADY resolved
 * in order to draw itself, passed in. The comparison is `diffContextSnapshot`
 * in shared code, which is a pure function over two lists.
 *
 * That split is deliberate. Main could compare and return the answer, and it
 * would then walk every configuration root a second time to produce data this
 * process is already holding. It would also be a second implementation of "did
 * this change", which is how the panel and the detail card start disagreeing
 * about the same file.
 *
 * ## On demand, and never ambient
 *
 * Nothing here polls, subscribes or watches. The readout is opened from the
 * session context menu and the identity strip, and it is fetched when it is
 * opened. Research 29 §8.4 refuses the rail badge, the toast when a watched
 * file changes, the dot on the session tab and the banner over the terminal. A
 * user who edits `.mcp.json` while three sessions run sees nothing, because
 * they already know what they did.
 *
 * The snapshot is frozen at launch and the current set only moves when a human
 * or an agent edits a file, so there is no clock behind any number here and
 * nothing to refresh on a timer.
 */

import { useEffect, useMemo, useState } from 'react';
import type { GmuxContextSnapshotExtras } from '@shared/ipc';
import {
  describeSessionContext,
  diffContextSnapshot,
  driftById,
  removedEntries,
  toSnapshotEntries,
  type ContextDrift,
  type ContextDriftEntry,
  type ContextEntryLike,
  type ContextSnapshot,
  type SessionContextHeader
} from '@shared/context-snapshot';
import { formatAge } from '../app/format';

/** Which mode the Context view is in. One component, two modes. */
export type ContextViewMode = 'browse' | 'session';

type Bridge = NonNullable<GmuxContextSnapshotExtras['contextSnapshot']>;

function bridge(): Bridge | null {
  return (
    (window.gmux as (typeof window.gmux & GmuxContextSnapshotExtras) | undefined)
      ?.contextSnapshot ?? null
  );
}

/**
 * What the view needs to render the session mode.
 *
 * `loading` is separate from a null snapshot ON PURPOSE. They read the same on
 * screen if the view does not distinguish them, and they mean opposite things:
 * one is "not yet asked" and the other is "asked, and there is no record".
 * Drawing the unrecorded sentence during the first round trip would tell the
 * user their session was never snapshotted and then silently take it back.
 */
export interface SessionContextReadout {
  loading: boolean;
  snapshot: ContextSnapshot | null;
  /** Null until the snapshot has arrived. */
  drift: ContextDrift | null;
  /** The mark for one row of the current set, keyed by entry id. */
  marks: Map<string, ContextDriftEntry>;
  /**
   * The rows that are gone from disk and are still loaded by the session.
   *
   * They have no row in the current set, so the view has to draw them itself.
   * Research 29 §8.3 calls this the one nobody expects and the one that bites.
   */
  removed: ContextDriftEntry[];
  /** The sentences above the list. */
  header: SessionContextHeader;
}

/** What a readout looks like before anything has been asked. */
const PENDING_HEADER: SessionContextHeader = {
  lines: [],
  driftCount: 0,
  unrecorded: false
};

/**
 * Read one session's launch context and compare it against what is resolved
 * now.
 *
 * @param sessionId the session the view is pinned to, or null in browse mode.
 * @param current   the resolved rows the view has already computed. In browse
 *                  mode it is ignored, so a caller may pass whatever it holds.
 * @param nowMs     the clock the header's age is written against. The caller
 *                  passes `useNow()` when it wants the age to stay honest
 *                  while the panel is open, and `Date.now()` when it does not
 *                  care. It is a parameter rather than a second interval in
 *                  here, because a component that already re-renders on a
 *                  clock does not need this module to start another one.
 *
 * A build whose preload has no `contextSnapshot` gets a null snapshot and the
 * unrecorded sentence. The rest of the Context view is unaffected, which is
 * the point of feature detecting rather than assuming.
 */
export function useSessionContext(
  sessionId: string | null,
  current: readonly ContextEntryLike[],
  nowMs: number = Date.now()
): SessionContextReadout {
  const [snapshot, setSnapshot] = useState<ContextSnapshot | null>(null);
  const [loading, setLoading] = useState(sessionId !== null);

  useEffect(() => {
    if (sessionId === null) {
      setSnapshot(null);
      setLoading(false);
      return;
    }
    let live = true;
    setLoading(true);
    setSnapshot(null);
    const call = bridge();
    if (call === null) {
      setLoading(false);
      return;
    }
    void call(sessionId)
      .then((result) => {
        if (!live) return;
        setSnapshot(result);
      })
      .catch(() => {
        // A failed read is the same to the reader as no record: Tortie cannot
        // say what this session loaded. There is nothing for them to act on,
        // so there is no error state of its own.
        if (live) setSnapshot(null);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [sessionId]);

  return useMemo(() => {
    if (snapshot === null) {
      return {
        loading,
        snapshot: null,
        drift: null,
        marks: new Map<string, ContextDriftEntry>(),
        removed: [],
        header: loading
          ? PENDING_HEADER
          : describeSessionContext({ snapshot: null, drift: null, age: null })
      };
    }
    // The view's rows carry more than the record does, so they are folded to
    // the six fields the comparison reads. `ResolvedEntry` is structurally
    // assignable, so this is the whole adapter.
    const drift = diffContextSnapshot(snapshot, toSnapshotEntries(current));
    return {
      loading,
      snapshot,
      drift,
      marks: driftById(drift),
      removed: removedEntries(drift),
      header: describeSessionContext({
        snapshot,
        drift,
        age: formatAge(snapshot.at, nowMs)
      })
    };
  }, [snapshot, current, loading, nowMs]);
}
