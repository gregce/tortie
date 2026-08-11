/**
 * src/main/quickopen — the ⌘P engine (Phase 14, research 19 §2.1/§3.2).
 *
 * One resident worker_threads Worker per app owns everything expensive: it
 * spawns its own `rg --files`, keeps the path list and a `fuzzysort` snapshot,
 * and reranks the surviving 512 with a vendored extract of VS Code's MIT
 * fuzzyScorer. Main holds nothing but the promise plumbing.
 *
 * Public surface, deliberately small — the palette talks IPC, nothing else
 * in main talks to this module at all.
 */

export { registerQuickOpenIpc, disposeQuickOpenIpc } from './ipc';
export { createQuickOpenCoordinator } from './coordinator';
export type { QuickOpenCoordinator, QuickOpenDeps } from './coordinator';
