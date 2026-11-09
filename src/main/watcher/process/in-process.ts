/**
 * The watcher process, run in the calling process (Phase 365,
 * build/p365/SPEC.md §4.1, D7).
 *
 * Plain Node has no `utilityProcess`: vitest, the tsx probes and the gates run
 * there. So `../host.ts`, and ONLY `../host.ts`, reaches this module, through a
 * dynamic `import()` inside its `process.versions.electron === undefined`
 * branch, and gets back the same `WatcherChild` shape a forked process has.
 * Behind it runs exactly what `../watcher-process.ts` runs: the one queue and
 * its server from `./queue.ts`, over `await import('@parcel/watcher')`. Main's
 * built bundle therefore never requires the native module at load, and no
 * test needs a seam in production code to run the real queue.
 *
 * WHAT CROSSES IS WHAT WOULD CROSS A PROCESS BOUNDARY. Every message is
 * `structuredClone`d both ways, so nothing reaches the other side by
 * reference.
 *
 * IT DELIVERS SYNCHRONOUSLY, ON PURPOSE. Today a site's callback runs inside
 * the native module's own callback, in the same turn, and the existing
 * contract tests read a site's state in the very turn they hand it a batch
 * (the observation's drop count, the stalled-re-read alarm under a patched
 * clock). A later turn here would change what those tests measure without
 * changing what Tortie does in the app, where the hop is a real one. The two
 * places a synchronous hop could re-enter are handled: messages posted before
 * the host listens are held and handed over on a microtask, and the host
 * registers every request before it posts it.
 *
 * Production never runs this: in Electron the branch above is never taken.
 */

import { statSync } from 'node:fs';
import { serveWatchQueue, type NativeWatcher } from './queue';
import type { FromWatcher, ToWatcher } from './wire';

/** One watcher "process" in this one: the same shape `../host.ts` forks. */
export interface InProcessWatcherChild {
  readonly pid: undefined;
  post(message: ToWatcher): void;
  onMessage(listener: (message: unknown) => void): void;
  onExit(listener: (code: number | null) => void): void;
  kill(): void;
}

/** Every in-process watcher made in this process, newest last. */
const made: InProcessWatcherChild[] = [];

/**
 * Tests: the in-process watchers this module made, newest last. Ending one
 * with `kill()` from a test is an exit its host did not ask for, which is how
 * a test drives a crash, the restart and its one re-scan notice through the
 * real queue. Production never loads this module.
 */
export function inProcessWatchersForTests(): readonly InProcessWatcherChild[] {
  return [...made];
}

/** True when `dir` is a directory now; anything else, a throw included, is false. */
function isDirectory(dir: string): boolean {
  try {
    return statSync(dir).isDirectory();
  } catch {
    return false;
  }
}

export async function inProcessWatcher(): Promise<InProcessWatcherChild> {
  const native: NativeWatcher = await import('@parcel/watcher');
  let dead = false;
  const listeners: ((message: unknown) => void)[] = [];
  const exits: ((code: number | null) => void)[] = [];
  const held: unknown[] = [];

  const toHost = (message: FromWatcher): void => {
    if (dead) return;
    const copy: unknown = structuredClone(message);
    if (listeners.length === 0) {
      held.push(copy);
      return;
    }
    for (const listener of listeners) listener(copy);
  };

  const server = serveWatchQueue(
    {
      native,
      exists: isDirectory,
      now: () => Date.now(),
      setTimeout: (callback, ms) => {
        const timer = setTimeout(callback, ms);
        // A grace must never keep a test runner or a probe alive on its own.
        timer.unref?.();
        return timer;
      }
    },
    toHost
  );

  const child: InProcessWatcherChild = {
    pid: undefined,
    post(message: ToWatcher): void {
      if (dead) return;
      server.receive(structuredClone(message));
    },
    onMessage(listener): void {
      listeners.push(listener);
      if (held.length === 0) return;
      queueMicrotask(() => {
        for (const message of held.splice(0)) {
          if (dead) return;
          for (const each of listeners) each(message);
        }
      });
    },
    onExit(listener): void {
      exits.push(listener);
    },
    kill(): void {
      if (dead) return;
      dead = true;
      // What the end of a real process does to its native streams.
      server.stop();
      queueMicrotask(() => {
        for (const listener of exits) listener(null);
      });
    }
  };
  made.push(child);
  return child;
}
