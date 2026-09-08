/**
 * Telling main whether a Redline view is mounted (Phase 236).
 *
 * The Edit menu's four `redline-*` rows reach whichever Redline view is
 * mounted, and until this phase they were enabled always: a row that reaches
 * nothing is a promise with no explanation beside it. Main cannot answer the
 * question itself — `buildTemplate()` reads its state synchronously from main's
 * own sources, and nothing in src/shared/ipc carried which editor tab is open
 * or what mode it is in (research 96 §2.3 grepped for a channel and there was
 * none). So the view pushes, exactly the way the session and project surfaces
 * push their position.
 *
 * ONE DIRECTION ONLY, which is the shape src/main/menu.ts's own header sets:
 * the view says "mounted" on mount and "not mounted" on unmount, main caches
 * the last answer and builds its template FROM it. Main never asks.
 *
 * IT LIVES HERE AND NOT BESIDE THE VIEW because `npm run conformance:redline`
 * rule 9 forbids every redline module but the one call site from naming the
 * bridge at all, which is what keeps the redline's single write channel single.
 * A push of a boolean is not a write, and this file is not a redline module.
 *
 * The pushes are chained so a mount that follows an unmount in the same tick
 * cannot land out of order, and a failure is logged and swallowed: a menu row
 * that stayed enabled is worth less than a thrown error in a mount effect.
 */

import { gmuxBridge } from '../bridge';

let redlinePush: Promise<void> = Promise.resolve();

/** Tell main whether a Redline view is mounted. Fire-and-forget; never throws. */
export function pushRedlineMountedToMenu(mounted: boolean): void {
  const bridge = gmuxBridge();
  redlinePush = redlinePush
    .catch(() => undefined)
    .then(() => {
      if (bridge === undefined) return undefined;
      return bridge.setRedlineMounted(mounted);
    })
    .catch((err: unknown) => {
      console.error('[redline-menu] the Edit menu did not hear the view', err);
    });
}
