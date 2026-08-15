/**
 * The composed shape of the app store (Phase 42 stage 4).
 *
 * The store used to be one 1,800-line module holding every field and action.
 * It is now five domain slices plus a small lifecycle surface, and this
 * module is where their interfaces meet. Type-only: nothing here runs, and
 * the slice modules may import `AppState` from here without a runtime cycle
 * because every import of this file is `import type`.
 *
 * The facade is UNCHANGED: components keep importing `useApp` (and every
 * helper and type they always did) from ./store.
 */

import type { ChromeSlice } from './chrome-slice';
import type { NoticesSlice } from './notices-slice';
import type { OverlaysSlice } from './overlays-slice';
import type { ProjectsSlice } from './projects-slice';
import type { SessionsSlice } from './sessions-slice';

/** Boot-blocking failures (S9 §6.4). */
export type BootBlock = 'tmux-missing' | null;

/**
 * Boot and retry. The bodies live in ./subscriptions (the one lifecycle
 * owner), so hydration and event subscription cannot be re-entangled: boot
 * hydrates and then starts the subscriptions, retry hydrates again while the
 * subscription start is a no-op because the handlers are already attached.
 */
export interface LifecycleSlice {
  ready: boolean;
  bootBlock: BootBlock;
  bootErrorDetail: string | null;

  boot(): Promise<void>;
  retryBoot(): Promise<void>;
}

export type AppState = LifecycleSlice &
  ProjectsSlice &
  SessionsSlice &
  ChromeSlice &
  OverlaysSlice &
  NoticesSlice;
