/**
 * Which session a drop is for, and what the overlay may promise it.
 *
 * A leaf element carries its session id in `data-split-leaf` — the same
 * attribute the split surface and the split drop zone use, so hit-testing
 * costs one `elementFromPoint` and one `closest()`. The overlays are
 * pointer-events:none precisely so this stays honest during a drag.
 */

import type { Session } from '@shared/types';
import { useLayout } from '../../state/layout';
import { useApp } from '../../state/store';
import { canInsert } from './insert';
import type { AttachPromise } from './state';
import { imageDropFor } from './strategy';

export const LEAF_SELECTOR = '[data-split-leaf]';

/** The session leaf under a viewport point, or null. */
export function leafUnder(x: number, y: number): HTMLElement | null {
  const el = document.elementFromPoint(x, y);
  if (!(el instanceof Element)) return null;
  const leaf = el.closest<HTMLElement>(LEAF_SELECTOR);
  if (!leaf) return null;
  return (leaf.dataset['splitLeaf'] ?? '').length > 0 ? leaf : null;
}

/** The session id on a leaf element ('' when it carries none). */
export function leafSessionId(leaf: HTMLElement | null): string {
  return leaf?.dataset['splitLeaf'] ?? '';
}

export function sessionById(id: string): Session | null {
  return useApp.getState().sessions.find((s) => s.id === id) ?? null;
}

/**
 * A pane can accept a drop only while its session is actually running.
 * `unknown` (Phase 67) refuses on the same terms as exited and restorable:
 * the server did not answer, so nothing may act on the session's tmux side.
 */
export function paneAccepts(session: Session | null): boolean {
  if (!session) return false;
  if (
    session.status === 'exited' ||
    session.status === 'restorable' ||
    session.status === 'unknown'
  ) {
    return false;
  }
  return canInsert(session.id);
}

/**
 * Focus the target pane first — an unfocused leaf accepts the drop (§4.3).
 *
 * Through `selectLeaf`, not `setActiveSession`: inside a split GROUP the
 * remembered focused leaf is separate state, normally written by the leaf's
 * `onPointerDownCapture`. Chromium dispatches only drag events during a drag,
 * so no pointerdown ever arrives and the leaf under the lit overlay would
 * otherwise take the text while its neighbour kept the focus ring.
 */
export function focusSession(sessionId: string): void {
  const app = useApp.getState();
  const projectPath = app.activeProject()?.path ?? null;
  if (projectPath !== null) {
    useLayout.getState().selectLeaf(projectPath, sessionId);
  } else if (app.activeSession()?.id !== sessionId) {
    app.setActiveSession(sessionId);
  }
}

/**
 * What the overlay may promise. The copy has to match the outcome: an agent
 * that really attaches says "attach"; everything else says what it will
 * actually do, which is insert a path. `count` is what the drag is carrying
 * (already capped at MAX_REFERENCES by the caller) — naming it is the only
 * way a multi-row tree drag can be told apart from a single one before the
 * user commits.
 */
export function promiseFor(
  session: Session | null,
  looksLikeImage: boolean,
  count = 1
): { promise: AttachPromise; label: string } {
  if (!paneAccepts(session)) {
    return { promise: 'blocked', label: 'Session not running' };
  }
  const strategy = imageDropFor(session?.agent ?? 'shell').strategy;
  if (looksLikeImage && strategy === 'paste-path') {
    return {
      promise: 'attach',
      label: count > 1 ? `Drop to attach ${count} files` : 'Drop to attach'
    };
  }
  return {
    promise: 'insert',
    label: count > 1 ? `Drop to insert ${count} paths` : 'Drop to insert path'
  };
}
