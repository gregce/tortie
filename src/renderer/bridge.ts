/**
 * The one way renderer code reaches the installed bridge.
 *
 * Phase 122. Before this file six modules each carried the same eight line
 * read of `globalThis.window.gmux`, typed `unknown` and then cast back to the
 * surface they wanted. The cast was there because `Window.gmux` was declared
 * required while its members were declared optional, which is the opposite of
 * what a build can produce. There is one preload file, it makes one
 * `contextBridge.exposeInMainWorld('gmux', api)` call, and `api` is one object
 * literal. Either the whole bridge is installed or none of it is.
 *
 * The read goes through `globalThis` rather than naming `window` directly,
 * because vitest.config.ts sets `environment: 'node'`. A bare `window`
 * reference throws when a unit test imports a renderer module. This returns
 * `undefined` there instead, which is the same answer the type states.
 *
 * The name is `gmuxBridge` and not `bridge` because 14 renderer files already
 * declare a local `function bridge()` that narrows to one surface. Those
 * locals stay and call this one inside.
 */
import type { InstalledGmuxApi } from '@shared/ipc';

/** The installed bridge, or `undefined` when there is no preload. */
export function gmuxBridge(): InstalledGmuxApi | undefined {
  return (globalThis as { window?: Window }).window?.gmux;
}
