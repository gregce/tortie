/**
 * The `context:*` bridge, as the Context view calls it.
 *
 * ONE registrar, one preload extra, five methods, and they are feature-detected
 * in TWO groups rather than one. `contextBridge()` tests for `scan`, because a
 * build that cannot read configuration has no view to draw. `skillsBridge()`
 * tests for `skillsRun` separately, because a build that can READ configuration
 * but cannot WRITE it is an ordinary state the panel renders honestly: the list
 * is a filesystem read and shows everything, and only the write controls are
 * absent.
 *
 * WHY IT IS FEATURE-DETECTED AT ALL. Same doctrine as `state/agents.ts` and
 * `search/store.ts`: an older preload must leave the view mounted and honest
 * rather than crash it. `contextAvailable()` goes false, the view says one
 * sentence, and the activity-bar item stays exactly where it is. A view that
 * vanished would read as a missing feature rather than as a build that cannot
 * read configuration.
 */

import type { GmuxContextExtras } from '@shared/ipc';

/** The bridge, typed by the shared declaration rather than a local mirror. */
export type ContextBridgeApi = NonNullable<GmuxContextExtras['context']>;

/**
 * Config changed under this project.
 *
 * NOT PART OF THE BRIDGE, and the absence is deliberate. Research 29 §8.4
 * refuses an ambient signal when a file changes under a running session: no
 * toast, no rail badge, no dot on a session tab. The view re-reads on its own
 * refresh control and when the project changes. If a future round ever wires
 * this to the existing `@parcel/watcher` subscription that already feeds
 * `git:changed`, it rides that one and never adds a second watcher, and it
 * still announces nothing.
 */
export type ContextChangedCallback = (cwd: string) => void;

function extras(): GmuxContextExtras {
  return (window.gmux ?? {}) as unknown as GmuxContextExtras;
}

/** The bridge, or null when this build cannot read agent configuration. */
export function contextBridge(): ContextBridgeApi | null {
  const api = extras().context;
  return typeof api?.scan === 'function' ? api : null;
}

/** Can this build read agent configuration at all? */
export function contextAvailable(): boolean {
  return contextBridge() !== null;
}

/**
 * The write half, or null when this build cannot run the skills CLI.
 *
 * Separate from `contextBridge()` on purpose. Nothing in the Skills LIST is
 * gated on this, because the list never touches the CLI.
 */
export function skillsBridge(): ContextBridgeApi | null {
  const api = contextBridge();
  return typeof api?.skillsRun === 'function' ? api : null;
}

/** Can this build install, remove or update a skill? */
export function skillsWriteAvailable(): boolean {
  return skillsBridge() !== null;
}

/**
 * Subscribe to config changes for a project, or get a no-op unsubscribe.
 *
 * The no-op is what ships today, because nothing broadcasts. It is kept as one
 * call site rather than scattered `if` statements, so the day a watcher does
 * arrive there is one place to wire it.
 */
export function onContextChanged(_cb: ContextChangedCallback): () => void {
  return () => undefined;
}
