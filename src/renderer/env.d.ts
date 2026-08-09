/// <reference types="vite/client" />

import type { GmuxApi } from '../shared/ipc';

declare global {
  interface Window {
    /** Typed IPC bridge exposed by src/preload/index.ts via contextBridge. */
    gmux: GmuxApi;
  }
}

export {};
