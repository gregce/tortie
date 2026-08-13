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
 * How long a suspend capture may run before this module stops waiting on it.
 *
 * 4 s, chosen against the two numbers either side of it. The quit path bounds
 * the same pass at 8 s, and quit can afford that because the user is watching
 * a window that has not closed yet. Sleep has no such budget: the machine is
 * going down whatever this module thinks, so the deadline exists only to keep
 * one log line honest about what finished. The pass itself is parallel across
 * sessions, so 4 s is far more than the 43-session shape needs.
 */
export const SUSPEND_CAPTURE_DEADLINE_MS = 4_000;

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

  const onSuspend = (): void => {
    if (capturing) {
      console.log('[gmux] suspend: a capture is already running');
      return;
    }
    capturing = true;
    const startedAt = Date.now();
    void (async () => {
      try {
        const finished = await withDeadline(
          deps.captureAll().catch((err: unknown) => {
            console.warn(
              `[gmux] suspend capture failed: ${(err as Error).message}`
            );
          }),
          deadlineMs
        );
        const took = Date.now() - startedAt;
        console.log(
          finished
            ? `[gmux] suspend: captured every session in ${took} ms`
            : `[gmux] suspend: capture still running after ${deadlineMs} ms — ` +
                'the machine may sleep before it finishes'
        );
      } finally {
        capturing = false;
      }
    })();
  };

  const onResume = (): void => {
    console.log('[gmux] resume: clearing the terminal glyph atlas');
    try {
      deps.onResume();
    } catch (err) {
      console.warn(`[gmux] resume handler failed: ${(err as Error).message}`);
    }
  };

  monitor.on('suspend', onSuspend);
  monitor.on('resume', onResume);

  return () => {
    monitor.removeListener('suspend', onSuspend);
    monitor.removeListener('resume', onResume);
  };
}
