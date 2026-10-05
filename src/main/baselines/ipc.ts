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
import { localProjectRoots } from '../fs/project-roots';
import {
  BASELINE_PRUNE_INTERVAL_MS,
  createBaselineStore,
  type BaselineStore
} from './store';
// PHASE 265: the store door is owned at quit. `admitBaselineStore` refuses a
// write once admission is closed (rather than beginning one) and otherwise
// wraps the store's in-flight promise with `trackBaselineWork`, so the ordered
// disposer can join it. The door stays thin: the admission and the tracking
// both live in ./shutdown, which the shutdown test drives directly.
import { admitBaselineStore } from './shutdown';

/** `<userData>/gmux/baselines` — sibling of snapshots/ and dropped-images/. */
export function baselinesDir(): string {
  return join(app.getPath('userData'), 'gmux', 'baselines');
}

let store: BaselineStore | null = null;

/**
 * The one store, built on first use.
 *
 * `listProjectRoots` is the open project folders ON THIS MAC, read through
 * the singleton core by src/main/fs/project-roots.ts, so the authority on
 * "what is a project root" is the same list every file verb asks and the same
 * list the tabs render from. PHASE 336: it used to be every project row, and a
 * row for a folder on another machine made the same path HERE a root this
 * store would keep a baseline for. It is the fourth such reader, the one
 * research 138 section 2.5 item 5 did not name (build/p336/SPEC.md M4). The
 * lazy import that keeps the tmux core out of the module graph at boot moved
 * there with it.
 */
export function baselineStore(): BaselineStore {
  if (store === null) {
    store = createBaselineStore({
      dir: baselinesDir(),
      listProjectRoots: () => localProjectRoots(),
      realRootOf: (root) => resolveProjectRoot(root)
    });
  }
  return store;
}

export function registerBaselinesIpc(ipc: IpcMain): void {
  const get = (): BaselineStore => baselineStore();
  handle(ipc, 'baselines:load', (_event, key) => get().load(key));
  handle(ipc, 'baselines:store', (_event, input) =>
    admitBaselineStore(() => get().store(input))
  );
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
