/**
 * The modal family no launch needs during boot, behind ONE door (Phase 165).
 *
 * `./lazy-modals.tsx` imports this file with a single `import()`, so Rollup
 * emits these sheets and the remote directory picker as one chunk rather
 * than seven. One chunk is the right grain: every one of these opens from a
 * gesture a person makes after the window is up, none of them can be the
 * first screen, and together they are about 100 KB of generated code that
 * used to be parsed before first paint. Nothing else imports this file, and
 * nothing here runs: it is seven re-exports.
 *
 * Phase 293 took the Past Sessions panel out of this chunk. It is the second
 * tab of the session manager, whose chunk is its own.
 * Phase 320.2 took the last lines panel out, with its menu row and its channel.
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
export { SavedOutputModal } from './SavedOutputModal';
export { ShortcutsOverlay } from './ShortcutsOverlay';
// Phase 202. Add login opens from the meter's own card, which is a gesture a
// person makes long after the window is up, so it belongs in this chunk.
export { AddLoginModal } from './AddLoginModal';
