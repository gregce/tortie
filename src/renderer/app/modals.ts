/**
 * The modal family no launch needs during boot, behind ONE door (Phase 165).
 *
 * `./lazy-modals.tsx` imports this file with a single `import()`, so Rollup
 * emits the eight sheets and the remote directory picker as one chunk rather
 * than eight. One chunk is the right grain: every one of these opens from a
 * gesture a person makes after the window is up, none of them can be the
 * first screen, and together they are about 100 KB of generated code that
 * used to be parsed before first paint. Nothing else imports this file, and
 * nothing here runs: it is eight re-exports.
 *
 * What is NOT here, on purpose: the attention overlay, the confirm dialog,
 * the toasts, the empty states and the home screen. Those are refusal and
 * recovery surfaces that can be the first thing a person sees, and they stay
 * in the entry chunk.
 */

export { CreateSessionModal } from './CreateSessionModal';
export { NewProjectModal } from './NewProjectModal';
export { RemoteProjectModal } from './RemoteProjectModal';
export { CloneRepoModal } from './CloneRepoModal';
export { PastSessionsModal } from './PastSessionsModal';
export { SavedOutputModal } from './SavedOutputModal';
export { RemoteLinesModal } from './RemoteLinesModal';
export { ShortcutsOverlay } from './ShortcutsOverlay';
