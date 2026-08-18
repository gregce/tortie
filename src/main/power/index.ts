/**
 * power/index.ts — what Tortie does when the machine sleeps and wakes.
 *
 * Phase 19 item 11. Before this module, `powerMonitor` appeared nowhere in
 * `src`, confirmed by grep, so a laptop lid closing was a durability gap the
 * app never saw. Two handlers, and only two.
 *
 * **suspend → capture every session's scrollback.** Sleep is the one moment
 * the app knows in advance that it is about to stop running. Quit already
 * captures (shutdownGmuxCore → snapshotAllSessions); sleep did not, so the
 * newest snapshot on disk could be hours older than the pane when the machine
 * went down and never came back. This is the same capture the quit path runs,
 * called from the other event that means "you are about to stop".
 *
 * **suspend → then take a manifest generation (Phase 77).** The quit path took
 * one and the sleep path did not, so a machine that slept and never woke left
 * the newest generation as old as the five minute floor allowed. The take runs
 * after the capture, in the order the quit path uses, and inside the same
 * deadline. It is the second half of the same promise the capture makes.
 *
 * **resume → clear the terminal glyph atlas, then reconcile.** This is the
 * handler VS Code wires in `terminalNativeContribution.ts`, to the same
 * event, calling the same public `clearTextureAtlas()` from `@xterm/xterm@6`.
 * A WebGL texture atlas does not survive the GPU process losing its context
 * across a sleep, and what the user sees afterwards is a pane of wrong or
 * blank glyphs that only a resize repairs. Main cannot reach the atlas, so it
 * broadcasts `power:resume` and the terminal renderer clears its own.
 * The reconcile is the second half: a session can die while the machine is
 * asleep, and the 1 Hz status poll would take until its next tick to notice.
 *
 * **resume also tells the machines layer (Phase 70).** A session on another
 * machine keeps running while this Mac sleeps, and the last answer Tortie got
 * about it is about a world that may no longer be the current one. So the wake
 * is one of the three moments Tortie is allowed to sign in to a machine, the
 * other two being the app launching and a person pressing a control. It is never
 * a file change, which is the line refusal 8 draws. The listeners are registered
 * through {@link onMachineWake} rather than passed in as a dependency, because
 * this module must keep importing nothing but the log: it is unit tested outside
 * Electron, and an import of the machines layer would pull the whole exec plane
 * into that test.
 *
 * **This is NOT the adaptive checkpoint scheduler.** That is a later phase and
 * a much larger piece of work. Nothing here runs on a timer, nothing here
 * decides when to capture, and nothing here holds state beyond one in-flight
 * flag.
 *
 * WHAT THIS CANNOT DO, stated because the limit is the design. macOS does not
 * promise the app any particular amount of time after `suspend`, and Electron
 * gives no way to hold sleep off while a capture finishes. The deadline below
 * stops this module WAITING; it cannot stop the machine sleeping. A capture
 * cut short by the machine going down loses that session's newest lines, not
 * the snapshot that was already on disk.
 */

/**
 * The part of Electron's `powerMonitor` this module uses.
 *
 * Injected so the two handlers can be tested without a real machine going to
 * sleep, which is the only other way to fire these events.
 */
import { getLog } from '../log';

export interface PowerMonitorLike {
  on(event: 'suspend' | 'resume', listener: () => void): unknown;
  removeListener(event: 'suspend' | 'resume', listener: () => void): unknown;
}

export interface PowerHandlerDeps {
  /**
   * Capture every live session's scrollback now. Resolves when the pass is
   * done. Rejections are logged and swallowed — a failed capture must never
   * be the reason a machine refuses to sleep.
   */
  captureAll: () => Promise<void>;
  /**
   * Take a manifest generation because the machine is going to sleep (Phase
   * 77). Runs after the capture and inside the same deadline. Resolves true
   * when a generation was copied, and false when the manifest had not changed
   * since the last one, which is the common case and is not a failure.
   * Rejections are logged and swallowed, because a failed copy must never be
   * the reason a machine refuses to sleep.
   *
   * Required rather than optional on purpose. An optional dependency is a call
   * site that can forget, and there are only three call sites.
   */
  takeManifestGeneration: () => Promise<boolean>;
  /**
   * The machine woke. Broadcast the atlas clear and reconcile. Synchronous
   * and must not throw: there is no user waiting on this and nowhere to
   * report a failure to.
   */
  onResume: () => void;
  /** Defaults to Electron's `powerMonitor`. */
  monitor?: PowerMonitorLike;
  /** Defaults to SUSPEND_CAPTURE_DEADLINE_MS. */
  captureDeadlineMs?: number;
}

/**
 * How long the suspend work may run before this module stops waiting on it.
 *
 * 4 s, chosen against the two numbers either side of it. The quit path bounds
 * the same pass at 8 s, and quit can afford that because the user is watching
 * a window that has not closed yet. Sleep has no such budget: the machine is
 * going down whatever this module thinks, so the deadline exists only to keep
 * one log line honest about what finished. The pass itself is parallel across
 * sessions, so 4 s is far more than the 43-session shape needs.
 *
 * Phase 77 put a second step inside the same deadline and did not raise it. A
 * take costs about 21 ms on the operator's manifest, so the number that was
 * far more than the capture needs is still far more than both steps need.
 */
export const SUSPEND_CAPTURE_DEADLINE_MS = 4_000;

/**
 * Scope "power" (Phase 35). Suspend and resume are the events behind "the app
 * got weird after I closed the lid", and until Phase 35 they were console
 * lines a packaged build discarded. They are records now, in the same file as
 * the `process.gone` record the same lid close produces, so the three lines
 * of research 42's incident 1 read together.
 */
const powerLog = getLog('power');

// ---------------------------------------------------------------------------
// The wake hook (Phase 70)
// ---------------------------------------------------------------------------

/**
 * What runs when the Mac wakes, beyond the injected `onResume`.
 *
 * One registry rather than a second dependency, for two reasons. The composition
 * root already passes `onResume` and adding a second callback there would make
 * every caller of {@link installPowerHandlers} carry a machines concern. And a
 * listener registers itself when it starts caring, which for the machines layer
 * is the moment a machine is first polled, not app start.
 */
const wakeListeners = new Set<() => void>();

/** Run `listener` when the Mac wakes. Returns the unsubscribe. */
export function onMachineWake(listener: () => void): () => void {
  wakeListeners.add(listener);
  return () => {
    wakeListeners.delete(listener);
  };
}

/** How many listeners are registered. For the tests and the smoke. */
export function machineWakeListenerCount(): number {
  return wakeListeners.size;
}

/**
 * Fire every wake listener, catching each one on its own.
 *
 * Exported so a harness can drive a wake without a machine going to sleep, which
 * is the only other way this runs.
 */
export function fireMachineWake(): void {
  for (const listener of [...wakeListeners]) {
    try {
      listener();
    } catch (err) {
      powerLog.warn(`a wake listener failed: ${(err as Error).message}`);
    }
  }
}

/** Resolves to false if `work` has not settled within `ms`. */
async function withDeadline(work: Promise<void>, ms: number): Promise<boolean> {
  let timer: NodeJS.Timeout | undefined;
  const expired = new Promise<boolean>((resolve) => {
    timer = setTimeout(() => resolve(false), ms);
    timer.unref?.();
  });
  try {
    return await Promise.race([work.then(() => true), expired]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

/**
 * Wire the two power handlers. Returns a function that removes them.
 *
 * Call it once, from the normal-startup path only. A harness has no business
 * reacting to the operator's machine going to sleep.
 */
export function installPowerHandlers(deps: PowerHandlerDeps): () => void {
  // Lazy require rather than a top-level import: this module is unit-tested
  // outside Electron, and `powerMonitor` throws there if it is even read
  // before the app is ready.
  const monitor =
    deps.monitor ??
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    (require('electron') as typeof import('electron')).powerMonitor;
  const deadlineMs = deps.captureDeadlineMs ?? SUSPEND_CAPTURE_DEADLINE_MS;

  // One flag, not a queue. A suspend that arrives while a capture is still
  // running is the sleep/wake/sleep flurry a lid gets on a desk, and starting
  // a second pass over the same panes would only make the first one slower.
  let capturing = false;

  /**
   * The two steps sleep gets, in this order, inside one deadline.
   *
   * Phase 77. The take runs after the capture, which is the order the quit
   * path already uses in shutdownGmuxCore, so the copy holds every row the
   * capture itself wrote. It skips the five minute floor because sleep has no
   * next tick, and it copies nothing when the manifest has not changed. Each
   * step catches its own failure, so a failed capture still lets the take run
   * and neither one can reject at the caller.
   */
  const suspendWork = async (): Promise<void> => {
    await deps.captureAll().catch((err: unknown) => {
      powerLog.warn(`suspend capture failed: ${(err as Error).message}`);
    });
    const took = await deps.takeManifestGeneration().catch((err: unknown) => {
      powerLog.warn(
        `suspend: taking a manifest generation failed: ${(err as Error).message}`
      );
      return false;
    });
    if (took) {
      powerLog.info('suspend: took a manifest generation');
    } else {
      powerLog.info(
        'suspend: the manifest has not changed, so no generation was taken'
      );
    }
  };

  const onSuspend = (): void => {
    if (capturing) {
      powerLog.info('suspend: a capture is already running');
      return;
    }
    capturing = true;
    const startedAt = Date.now();
    void (async () => {
      try {
        const finished = await withDeadline(suspendWork(), deadlineMs);
        const elapsed = Date.now() - startedAt;
        if (finished) {
          powerLog.info(
            'suspend: the capture and the manifest generation both finished ' +
              `in ${elapsed} ms`,
            { tookMs: elapsed }
          );
        } else {
          powerLog.warn(
            `suspend: still working after ${deadlineMs} ms. ` +
              'The machine may sleep before it finishes.',
            { deadlineMs }
          );
        }
      } finally {
        capturing = false;
      }
    })();
  };

  const onResume = (): void => {
    powerLog.info('resume: clearing the terminal glyph atlas');
    try {
      deps.onResume();
    } catch (err) {
      powerLog.warn(`resume handler failed: ${(err as Error).message}`);
    }
    // Phase 70. Every remote row goes to unknown and every machine with a live
    // connection is asked again, at once. It runs after `deps.onResume` and in
    // its own try, so a machines layer that throws cannot stop the atlas clear
    // and the local reconcile, which are what the person is looking at.
    fireMachineWake();
  };

  monitor.on('suspend', onSuspend);
  monitor.on('resume', onResume);

  return () => {
    monitor.removeListener('suspend', onSuspend);
    monitor.removeListener('resume', onResume);
  };
}
