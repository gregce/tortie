/**
 * The one place this process's PATH is decided and written (Phase 81).
 *
 * Everything that can start a pane awaits {@link installUserPath}. Nothing
 * that only reads does. Before this module the wait sat inside
 * `ensureServer`, so the session list, the project list and every attach sat
 * behind a login shell that had nothing to say about any of them.
 *
 * THE ONE WRITER RULE, and it is the whole safety argument of the phase.
 * `process.env['PATH']` is assigned on exactly one line in src/main, and it is
 * the line in this file. It is assigned once per app run, with the value of
 * the one cached capture, and it is never assigned a second time. A create
 * reads the PATH at four moments, being the absolute path written to the
 * manifest row, the interpreter verdict, the bare name decision and the file
 * the pane's own execvp picks. The manifest keeps what it read, so two
 * different values in one run would let a create record one binary and run
 * another. On the reporting machine the concrete case is node: the login shell
 * has v22.23.1 under nvm and the fallback has /usr/local/bin/node at v22.14.0.
 * src/main/tmux/__tests__/user-path.test.ts asserts the rule against the
 * source, so a second writer fails the build rather than the next person's
 * restore.
 *
 * IT DOES NOT AWAIT `ensureServer`. That direction is deliberate and it is
 * what stops the one development build branch that awaits this from
 * deadlocking. This module imports from ./resolve and ../notice and from
 * nothing else in this directory.
 */

import { getUserPath, userPathShell, userPathSource } from './resolve';
import { postDurabilityNotice } from '../notice';

let installPromise: Promise<string> | null = null;
let installed = false;

/**
 * Capture the user's login shell PATH and write it into THIS process, once.
 *
 * Always resolves on a healthy machine, at worst on the capture's own 10,000
 * ms deadline, because the capture falls back rather than failing. A
 * rejection clears the memo, the same shape `getGmuxCore` uses, so a retry
 * after the user fixes their machine is a fresh attempt.
 */
export function installUserPath(): Promise<string> {
  installPromise ??= (async () => {
    const userPath = await getUserPath();
    process.env['PATH'] = userPath;
    if (userPathSource() === 'fallback') {
      // The shell did not print, so every pane this run gets the fallback,
      // which carries no version managed node directory at all. Said once per
      // app run by the latch in ../notice.
      postDurabilityNotice({
        kind: 'shell-path-fallback',
        shell: userPathShell() ?? 'your login shell'
      });
    }
    // Last, so `userPathInstalled()` means the whole install finished. A
    // throw anywhere above rejects the promise and clears the memo below, and
    // reporting an install that did not complete as done would be a lie the
    // retry could not correct.
    installed = true;
    return userPath;
  })().catch((err: unknown) => {
    installPromise = null;
    throw err;
  });
  return installPromise;
}

/** True once the assignment above has run. Awaits nothing. */
export function userPathInstalled(): boolean {
  return installed;
}

/** Tests only. There is no product path that clears this. */
export function resetUserPathInstallForTests(): void {
  installPromise = null;
  installed = false;
}
