/**
 * A `powerMonitor` whose two events a harness fires by hand (Phase 19, moved
 * here in Phase 314).
 *
 * WHY IT IS DRIVABLE. macOS delivers `suspend` and `resume` only when the
 * machine really sleeps, and putting a machine that holds a person's live
 * agent sessions to sleep is not an acceptable thing for a harness to do. So
 * the events are injected through the same {@link PowerMonitorLike} seam the
 * unit tests use, and everything after the event is the real code.
 *
 * WHY IT IS ITS OWN MODULE. It was a private function of `./smoke.ts`, which
 * `GMUX_SMOKE=power` drives. Phase 314's harness seam
 * (`../harness/push-seam.ts`) needs the same monitor to drive the wake rule
 * of the push engine inside the real app, and a second copy is how two
 * drivers of one event come to disagree about what firing it means. There is
 * one copy, here, and both import it.
 *
 * It holds no timer, reads nothing and writes nothing. A listener that throws
 * propagates to the caller of `fire`, exactly as it would to Electron's own
 * emitter, so a harness sees a broken listener rather than a silent one.
 */

import type { PowerMonitorLike } from './index';

/** The monitor, plus the one verb a harness needs. */
export interface DrivableMonitor extends PowerMonitorLike {
  /** Call every listener registered for `event`, in the order they were added. */
  fire(event: 'suspend' | 'resume'): void;
  /** How many listeners `event` has, so a test can see a removal land. */
  listenerCount(event: 'suspend' | 'resume'): number;
}

/** A fresh monitor with no listeners. */
export function drivableMonitor(): DrivableMonitor {
  const listeners = new Map<string, Set<() => void>>();
  return {
    on(event, listener) {
      const set = listeners.get(event) ?? new Set();
      set.add(listener);
      listeners.set(event, set);
      return this;
    },
    removeListener(event, listener) {
      listeners.get(event)?.delete(listener);
      return this;
    },
    fire(event) {
      // A COPY, so a listener that removes itself while it runs does not skip
      // the one after it.
      for (const listener of [...(listeners.get(event) ?? [])]) listener();
    },
    listenerCount(event) {
      return listeners.get(event)?.size ?? 0;
    }
  };
}
