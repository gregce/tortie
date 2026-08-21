/// <reference types="vite/client" />

import type { InstalledGmuxApi } from '../shared/ipc';

declare global {
  interface Window {
    /**
     * Typed IPC bridge exposed by src/preload/index.ts via contextBridge.
     * `InstalledGmuxApi` is the SAME type the preload's `api` const is
     * annotated with (Phase 42 stage 2), so this declaration is the truthful
     * installed surface.
     *
     * Phase 122 widened it to `| undefined`. The whole bridge can be absent,
     * because a renderer module also loads under vitest, where there is no
     * preload and no window. When the bridge is present every one of its
     * members is present with it, because there is one preload file and it
     * makes one `exposeInMainWorld` call with one object literal. The honest
     * question a renderer file asks is "is the bridge here", so read it
     * through `gmuxBridge()` in src/renderer/bridge.ts.
     *
     * Written as `| undefined` rather than `gmux?:` on purpose. The property
     * is always defined in a real window, so `'gmux' in window` is not the
     * interesting question and an optional property would invite it.
     */
    gmux: InstalledGmuxApi | undefined;
  }
}

export {};
