/**
 * identity.ts — make every gmux process say "gmux" (Phase 13.8).
 *
 * The trigger: the user searched Activity Monitor for "gmux", found nothing
 * of ours, and found *Cursor's* extension host instead (it is named for the
 * open folder, which happened to be gmux). An app you cannot find is an app
 * you cannot judge — not for CPU, not for memory, not for "why is my fan on".
 *
 * WHAT EACH KNOB ACTUALLY DOES ON macOS — the honest version, because two of
 * these look interchangeable and are not:
 *
 *  - `process.title = 'gmux'` rewrites the process's argument space. MEASURED
 *    on a dev run (2026-08-11): `ps -o command=` and `ps -o comm=` both then
 *    print `gmux`, so `pgrep -f gmux` and `ps aux | grep gmux` find it — but
 *    `ps -o ucomm=` still prints `Electron`. ucomm is p_comm, the name the
 *    KERNEL recorded at exec, and it is the one Activity Monitor's "Process
 *    Name" column follows. argv is ours to rewrite; p_comm is not.
 *  - `app.setName('gmux')` sets the Electron app name: the menu-bar title,
 *    the About panel, `app.getPath('userData')`. (Ours already resolves to
 *    ~/Library/Application Support/gmux via package.json `name`, so this
 *    changes no path — it is here so the identity is stated in one place
 *    rather than inherited by luck.)
 *  - Activity Monitor's process name comes from the executable inside the
 *    .app bundle (plus the bundle's CFBundleName). In a PACKAGED build those
 *    are `gmux` and `gmux Helper (…)` — electron-builder renames them from
 *    productName, and build/after-pack.cjs fixes the one thing it leaves
 *    behind (the helpers' CFBundleName, still "Electron Helper (…)").
 *
 * SO, STATED PLAINLY: **`npm run dev` cannot show up as "gmux" in Activity
 * Monitor.** Measured on a live dev run: the main process is `ucomm=Electron`
 * and its three helpers are `ucomm=Electron Helper`, because the binary
 * really is node_modules/electron/dist/Electron.app/Contents/MacOS/Electron.
 * The only ways to change that are renaming a file inside node_modules or
 * shipping a re-signed dev copy of Electron.app — both worse than the
 * problem. What dev mode CAN do, and now does, is be findable from a
 * terminal: `pgrep -fl gmux` lists the main process as `gmux`, plus the
 * private tmux server and every attach client (they carry `-L gmux`). Run the
 * packaged app when you want to read Activity Monitor.
 */

import type { App } from 'electron';

/** The one spelling of our name. Lowercase, like the product. */
export const GMUX_PROCESS_NAME = 'gmux';

/**
 * Name the main process. Call as early as possible in main — before
 * `app.whenReady()`, and before anything reads `app.getPath('userData')`.
 */
export function applyProcessIdentity(app: App): void {
  app.setName(GMUX_PROCESS_NAME);
  try {
    // Node caps the new title at the space argv/environ already occupy; a
    // short name like ours always fits. Guarded anyway: a failure here is
    // cosmetic and must never take the app down at boot.
    process.title = GMUX_PROCESS_NAME;
  } catch {
    /* nothing to do — the app is still usable, just harder to grep */
  }
}

/**
 * Thread names for the main process's worker_threads (⌘P ranking, the
 * tree-sitter symbol pool). Node appends these to the worker's title, so they
 * show in `--inspect` targets, heap snapshots and thread dumps.
 *
 * Being honest about the limit: a worker_thread is a THREAD, so it will never
 * appear as its own row in Activity Monitor no matter what it is called. What
 * naming buys is that when the main process is hot, the thread that is
 * burning the CPU says which subsystem it belongs to.
 */
export const WORKER_NAMES = {
  quickOpen: 'gmux quick-open',
  symbols: 'gmux symbols'
} as const;
