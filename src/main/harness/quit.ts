/**
 * GMUX_SMOKE=quit — Phase 36, the quit that is secretly a crash.
 * Moved out of src/main/index.ts in Phase 42 stage 3, byte for byte.
 *
 * On 2026-08-14 all 5 real quits of the installed app were SIGABRTs:
 * before-quit fired its @parcel/watcher unsubscribes with `void`, and under
 * a busy uv threadpool their napi completions were still queued when
 * FreeEnvironment ran. No other harness can see this, because they all end
 * with app.exit(), which never reaches before-quit. This one ends with the
 * REAL app.quit() while 8 slow pbkdf2 jobs hold the 4-thread pool, which is
 * the same pressure a real quit's snapshot and manifest-generation writes
 * apply. Exit 134 is the bug. Exit 0 has two shapes since the fix round:
 * the clean one, where the first drain finished in time, and the classified
 * late one, where the first drain expired, the quit path logged the
 * leftover close count and drained again for up to 15 s, and the close
 * settled before FreeEnvironment could run into it. A loaded machine hits
 * the late shape; an idle one hits the clean shape. Only a wedged FSEvents
 * outlives BOTH drains, and that last resort is a logged SIGKILL to self,
 * never an abort.
 */

import { app } from 'electron';
import { pbkdf2 } from 'node:crypto';
// Phase 23: the configuration file is read at boot, on an explicit reload and
// on a watcher debounce, and nowhere else. `initAgentOverlay` is the boot
// read; `startAgentOverlayWatch` is the subscription this smoke races.
import { initAgentOverlay, startAgentOverlayWatch } from '../config/store';
import { getGmuxCore } from '../sessions';
import { armWatchdog, smokeFail, smokeLog } from './support';

export async function runSmokeQuit(): Promise<void> {
  // 60 s, not the usual 30: the late path may legitimately spend up to 15 s
  // in the second drain on top of a slow boot under load, and the watchdog's
  // own app.exit(1) under a pending close would abort, which is the exact
  // failure this smoke exists to catch.
  armWatchdog(60_000);
  try {
    await getGmuxCore();
    smokeLog('1/4 core booted: tmux server + manifest + control client');

    // The agents.json watcher is the subscription EVERY real boot holds
    // (config/store.ts), so it is the one whose quit-time close this smoke
    // exists to race. initAgentOverlay starts it; the second call proves it
    // is live rather than assumed.
    await initAgentOverlay();
    const watching = await startAgentOverlayWatch();
    if (!watching) {
      throw new Error('agents.json watcher failed to start — nothing to race');
    }
    smokeLog('2/4 agents.json watcher live (the boot subscription)');

    // Saturate the uv threadpool so the unsubscribe completions queue behind
    // real work, exactly as they do behind a real quit's writes. Callbacks
    // are deliberately ignored; the jobs exist to keep the pool busy.
    for (let i = 0; i < 8; i += 1) {
      pbkdf2('x', 'y', 2_000_000, 64, 'sha512', () => {});
    }
    smokeLog('3/4 uv threadpool saturated: 8 pbkdf2 jobs of 2,000,000 rounds');

    smokeLog('4/4 calling the REAL app.quit() — the exit code is the verdict');
    app.quit();
  } catch (err) {
    smokeFail(err);
  }
}
