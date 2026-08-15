/// <reference types="vite/client" />

import type { InstalledGmuxApi } from '../shared/ipc';

declare global {
  interface Window {
    /**
     * Typed IPC bridge exposed by src/preload/index.ts via contextBridge.
     * `InstalledGmuxApi` is the SAME type the preload's `api` const is
     * annotated with (Phase 42 stage 2), so this declaration is the truthful
     * installed surface: the extras are present here, and renderer casts that
     * re-intersected them onto `Window['gmux']` are no longer necessary.
     */
    gmux: InstalledGmuxApi;
  }
}

export {};
