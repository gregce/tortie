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
import type { MachinesSlice } from './machines-slice';
import type { NoticesSlice } from './notices-slice';
import type { OverlaysSlice } from './overlays-slice';
import type { ProjectsSlice } from './projects-slice';
import type { SessionsSlice } from './sessions-slice';

/**
 * Boot-blocking failures (S9 §6.4).
 *
 * Phase 41 added the second and the third. They are separate blocks rather
 * than one screen with a variable, because the three say different things and
 * offer different ways forward:
 *
 * - `tmux-missing` is a development build with no tmux on the machine.
 * - `tmux-bundle-incomplete` is a packaged Tortie whose own copy of tmux is
 *   not inside the bundle. Nothing is missing from the machine.
 * - `tmux-version-blocked` is a session server already running whose version
 *   pair is one this release never tested, or whose version could not be
 *   read. Every session on that server is still running and untouched.
 */
export type BootBlock =
  | 'tmux-missing'
  | 'tmux-bundle-incomplete'
  | 'tmux-version-blocked'
  | null;

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
  /**
   * The sentence main composed for the block, or null (Phase 41).
   *
   * The version block is the reason this field exists. Main is the only place
   * that holds both version numbers, so main writes that sentence and the
   * screen draws it with its own paragraphs around it. `bootErrorDetail` keeps
   * its old job, which is the technical line at the foot.
   */
  bootBlockMessage: string | null;

  boot(): Promise<void>;
  retryBoot(): Promise<void>;
}

export type AppState = LifecycleSlice &
  ProjectsSlice &
  SessionsSlice &
  ChromeSlice &
  OverlaysSlice &
  NoticesSlice &
  // Phase 71: the link state of every machine, which is the one thing that can
  // be stated about a machine that has not answered. Session rows cannot carry
  // it, because a machine that never answered produces none.
  MachinesSlice;
