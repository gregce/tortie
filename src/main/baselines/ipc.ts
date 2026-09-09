/**
 * baselines:* IPC — the durable baseline's two doors (Phase 243).
 *
 *   baselines:load   the stored baseline for one file, or a word saying why
 *                    there is none. Called once when a prose tab opens.
 *   baselines:store  record a moved baseline. Called when `nextBaseline`
 *                    answers a NEW state and never otherwise, so a watcher
 *                    tick that changes nothing writes nothing.
 *
 * Both are thin by design: every refusal, the containment, the ring, the
 * record and the sweep live in ./store.ts, which `conformance:redline` runs
 * under node. Neither door throws for a refusal.
 *
 * Ownership: src/main/baselines/**.
 */

import { app, type IpcMain } from 'electron';
import { join } from 'node:path';
import { handle } from '../typed-ipc';
import { resolveProjectRoot } from '../fs/paths';
import {
  BASELINE_PRUNE_INTERVAL_MS,
  createBaselineStore,
  type BaselineStore
} from './store';

/** `<userData>/gmux/baselines` — sibling of snapshots/ and dropped-images/. */
export function baselinesDir(): string {
  return join(app.getPath('userData'), 'gmux', 'baselines');
}

let store: BaselineStore | null = null;

/**
 * The one store, built on first use.
 *
 * `listProjectRoots` reads the manifest through the singleton core, so the
 * authority on "what is a project root" is the same list every file verb asks
 * and the same list the tabs render from. Imported lazily for the reason
 * src/main/fs/ipc.ts gives: these channels must not drag the tmux core into
 * the module graph at boot.
 */
export function baselineStore(): BaselineStore {
  if (store === null) {
    store = createBaselineStore({
      dir: baselinesDir(),
      listProjectRoots: async () => {
        const { getGmuxCore } = await import('../sessions');
        return (await getGmuxCore()).listProjects().map((p) => p.path);
      },
      realRootOf: (root) => resolveProjectRoot(root)
    });
  }
  return store;
}

export function registerBaselinesIpc(ipc: IpcMain): void {
  const get = (): BaselineStore => baselineStore();
  handle(ipc, 'baselines:load', (_event, key) => get().load(key));
  handle(ipc, 'baselines:store', (_event, input) => get().store(input));
}

/**
 * Sweep now and once a day after that, exactly as the drop store next door
 * does. The timer is unref'd so it never holds the process open, and the
 * first sweep is deliberately not awaited by anything.
 */
export function startBaselineStorePruning(): void {
  void baselineStore().sweep().catch(() => undefined);
  const timer = setInterval(() => {
    void baselineStore().sweep().catch(() => undefined);
  }, BASELINE_PRUNE_INTERVAL_MS);
  timer.unref?.();
}
