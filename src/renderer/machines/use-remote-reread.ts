/**
 * ONE hook that reads a remote view again at the right moments (Phase 230).
 *
 * ## The four moments, and nothing on a clock
 *
 *   sign in   the machine starts answering while the view holds a link shaped
 *             refusal: one more read, once per sign in. This is the Phase
 *             90.3 fix round shape that lived in tree/FilesSection.tsx and
 *             scm/ScmSection.tsx, lifted here and applied to every view
 *   looked    the view is opened, or its tab is activated, or its group is
 *             expanded, while the store already holds an answer for the target
 *   focus     the window regains focus, or the document becomes visible again
 *   write     one of Tortie's OWN writes lands on that machine, announced by
 *             the site that read the answer (../machines/remote-writes.ts)
 *
 * NO TIMER POLL. The one timer in this file is a 150 ms coalescing window,
 * being the same window ../state/repo-changed.ts uses for the local watcher,
 * and it is armed only by one of the four moments above. It never re-arms
 * itself, so a view that nobody touches makes no read at all; the harness
 * drive ../app/remote-boot-drive.ts counts reads across 2.5 s of nothing
 * happening and fails if the count moves. Research 85 section 8 rules that a
 * remote folder is never a subscription, and this hook is not one.
 *
 * ## What the consumer says, and what it does not
 *
 * The consumer folds its own store into one word, `held` (../machines/
 * reread.ts says the four), says whether it is looking (`active`), names the
 * read to run, and may name itself as `self` so a store that already re-reads
 * after its own write does not read twice, and may narrow which write kinds
 * it cares about. The hook asks the app store whether the machine is
 * answering, through `machineAnswering`, which reads the ONE link fact
 * `MachineStateView.link` carries. Phase 231 splits that fact in two; if it
 * lands after this, the question here is the LINK, being whether an ask of
 * that machine would be attempted at all, and never the session feed.
 *
 * ## Why the moments are read through a ref
 *
 * The looked, focus and write effects fire on the MOMENT and not on every
 * change of the answer, so they read `held`, `answering` and `active` from a
 * ref written on every render rather than listing them as dependencies. A
 * looked effect keyed on the held answer would fire again when the read it
 * caused landed, which is the shape of a loop.
 */

import { useCallback, useEffect, useRef } from 'react';
import { isLocalTarget, targetKey } from '@shared/workspace-target';
import type { WorkspaceTarget } from '@shared/workspace-target';
import { useApp } from '../state/store';
import { machineAnswering } from '../state/machines-slice';
import { createSignInRetry, rereadNow } from './reread';
import type { RereadHeld } from './reread';
import { onRemoteWrite, onWindowLooked } from './remote-writes';
import type { RemoteWriteKind } from './remote-writes';

/**
 * How long two moments may sit before they are one read. The local watcher
 * bus uses the same number, so a burst of writes repaints a remote view in the
 * same rhythm a burst of local changes repaints a local one.
 */
export const REMOTE_REREAD_COALESCE_MS = 150;

const EVERY_KIND: readonly RemoteWriteKind[] = ['file', 'index', 'commit'];

export interface RemoteRereadSpec {
  /** The tab's target. Null, or a folder on this Mac, makes the hook inert. */
  target: WorkspaceTarget | null;
  /** What the store holds for that target, folded into one word. */
  held: RereadHeld;
  /** Whether the view is looking. Defaults to true. Collapsed groups say false. */
  active?: boolean;
  /** Which write kinds this view re-reads for. Defaults to all three. */
  writes?: readonly RemoteWriteKind[];
  /** This view's own announcer name, so its own write does not read twice. */
  self?: string;
  /** The read. It is the store's refresh, never a new call. */
  read: () => void;
}

/**
 * Re-read a remote view at the four moments. Returns nothing; the store the
 * consumer reads from is what changes.
 */
export function useRemoteReread(spec: RemoteRereadSpec): void {
  const { target, held, read } = spec;
  const active = spec.active ?? true;
  const writes = spec.writes ?? EVERY_KIND;
  const self = spec.self;

  const remote = target !== null && !isLocalTarget(target) ? target : null;
  const key = remote === null ? null : targetKey(remote);
  const machineId = remote === null ? null : remote.machineId;
  const machineStates = useApp((s) => s.machineStates);
  const answering =
    machineId !== null && machineAnswering(machineStates, machineId);

  // The latest of everything a moment reads, so the moment effects below can
  // key on the moment alone.
  const latest = useRef({ held, active, answering, read, writes, self });
  latest.current = { held, active, answering, read, writes, self };

  const retry = useRef(createSignInRetry()).current;
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** One read for every moment that lands inside the window. */
  const schedule = useCallback((): void => {
    if (pending.current !== null) return;
    pending.current = setTimeout(() => {
      pending.current = null;
      latest.current.read();
    }, REMOTE_REREAD_COALESCE_MS);
  }, []);

  // A view that unmounts with a read pending reads nothing.
  useEffect(
    () => () => {
      if (pending.current !== null) clearTimeout(pending.current);
      pending.current = null;
    },
    []
  );

  // -- sign in ---------------------------------------------------------------
  useEffect(() => {
    if (retry.consider(key, answering, held)) schedule();
  }, [retry, key, answering, held, schedule]);

  // -- looked: the view opened, the tab activated, the group expanded --------
  //
  // Keyed on the moment, being the target and whether the view is looking, and
  // deliberately not on the held answer, for the reason in the header.
  useEffect(() => {
    if (key === null || !active) return;
    const now = latest.current;
    if (rereadNow({ key, answering: now.answering, held: now.held, active })) {
      schedule();
    }
  }, [key, active, schedule]);

  // -- focus: the person came back to the window -----------------------------
  useEffect(() => {
    if (key === null) return;
    return onWindowLooked(() => {
      const now = latest.current;
      if (
        rereadNow({
          key,
          answering: now.answering,
          held: now.held,
          active: now.active
        })
      ) {
        schedule();
      }
    });
  }, [key, schedule]);

  // -- write: one of Tortie's own writes landed on that machine --------------
  useEffect(() => {
    if (key === null || machineId === null) return;
    return onRemoteWrite((write) => {
      if (write.machineId !== machineId) return;
      const now = latest.current;
      if (now.self !== undefined && write.by === now.self) return;
      if (!now.writes.includes(write.kind)) return;
      if (
        rereadNow({
          key,
          answering: now.answering,
          held: now.held,
          active: now.active
        })
      ) {
        schedule();
      }
    });
  }, [key, machineId, schedule]);
}
