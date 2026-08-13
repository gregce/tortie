/**
 * notice.ts — the one thing the rename needs a human for (Phase 16.5).
 *
 * The userData migration (./userdata.ts) carries the manifest, snapshots,
 * settings and hotkeys across gmux -> Tortie without asking. Two things it
 * CANNOT carry, because they belong to macOS and macOS keys them on the
 * bundle id:
 *
 *  1. **TCC grants.** Full Disk Access, Files & Folders, Automation,
 *     Accessibility — anything the user granted `com.specstory.gmux` means
 *     nothing to `com.specstory.tortie`. macOS will ask again, once, per
 *     permission, at the moment it is needed.
 *  2. **The login item.** SMAppService registered the OLD bundle. The new one
 *     starts unregistered, and the old entry lingers in System Settings
 *     pointing at an app that is not there any more. `reconcileLoginItem()`
 *     (restore/login-item.ts) repairs this automatically WHENEVER there is a
 *     recorded preference to repair from — but the build that shipped before
 *     the rename never recorded one, so for this upgrade and only this one,
 *     the answer is genuinely unrecoverable and the user has to be told.
 *
 * "Tell the user once, plainly, and never fail silently" is the whole
 * requirement (docs/BACKLOG.md Phase 16.5 hazard 3), so this is a native
 * dialog rather than a toast: a toast that scrolls away while the user is
 * looking at their restored sessions is the silent failure with extra steps.
 * It fires at most once per machine, gated by a stamp file next to the
 * migration marker, and it is driven by the MARKER rather than by this
 * launch's result — so a migration that succeeded and then crashed before the
 * window opened still gets its notice on the next launch.
 *
 * ## Phase 19 item 10 — the failure notice
 *
 * Everything above is the SUCCESS notice, and until Phase 19 it was the only
 * one. `showRenameNoticeOnce` returned early on anything that was not a
 * completed migration, so a migration that FAILED said nothing at all. The
 * only trace was a `console.log` in a terminal that a shipped-app user does
 * not have. Research 33 §3.1 proved the shape with a probe: the copy threw on
 * one unreadable file, the app booted with an empty session list, and the user
 * had no way to know their 41 sessions were still sitting in the old folder.
 *
 * So there are two notices now, with separate words and separate stamps. The
 * failure one is shown once per distinct cause, keyed on the reason and the
 * error text in its own stamp file. An unchanged cause repeating on every
 * launch stays silent, because a modal that returns every morning is a nag
 * rather than a notice. A NEW cause is shown, because it is new information.
 */

import { app, dialog, shell } from 'electron';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { LoginItemReconcile } from '../restore/login-item';
import {
  LEGACY_APP_NAME,
  readMigrationMarker,
  type MigrationResult
} from './userdata';

/** Written beside the migration marker once the notice has been shown. */
export const NOTICE_STAMP = '.rename-notice-shown';

/**
 * Written beside the migration marker once the FAILURE notice has been shown.
 * It holds the cause it was shown for, so a new cause is shown and the same
 * one repeating is not.
 */
export const FAILURE_STAMP = '.rename-notice-failed';

export interface RenameNoticeInput {
  /** This launch's migration outcome (index.ts keeps it for exactly this). */
  result: MigrationResult;
  /** What the boot-time login-item reconcile did, if it ran. */
  login?: LoginItemReconcile;
  /** Test seam. */
  userDataDir?: string;
  /** Test seam — returns the index of the button the user chose. */
  show?: (options: {
    message: string;
    detail: string;
    buttons: string[];
  }) => Promise<number>;
  /** Test seam. */
  onOpenSettings?: () => void;
  /** Test seam — opens the folder the old data is still sitting in. */
  onShowFolder?: (dir: string) => void;
}

export type RenameNoticeOutcome =
  | {
      shown: false;
      reason: 'no-migration' | 'already-shown' | 'error' | 'nothing-to-show';
    }
  | { shown: true; kind: 'migrated' | 'failed' };

/**
 * Decide whether this launch owes the user the rename notice, and show it.
 *
 * Returns rather than throws, and swallows its own failures: a dialog that
 * cannot be drawn must not stop an app whose sessions just came back.
 */
export async function showRenameNoticeOnce(
  input: RenameNoticeInput
): Promise<RenameNoticeOutcome> {
  try {
    const userData = input.userDataDir ?? app.getPath('userData');
    const marker = readMigrationMarker(userData);
    const migratedNow = input.result.status === 'migrated';

    // Phase 19 item 10. A failure is told BEFORE anything else is considered,
    // because it is the case where the user's data is not where the app is
    // looking and only they can act on it.
    if (input.result.status === 'failed' || marker?.status === 'failed') {
      return await showFailureNotice(input, userData, marker);
    }

    if (marker?.status !== 'complete' && !migratedNow) {
      return { shown: false, reason: 'no-migration' };
    }

    const stamp = join(userData, NOTICE_STAMP);
    if (existsSync(stamp)) return { shown: false, reason: 'already-shown' };

    // Stamp FIRST, like every one-time tip in this codebase: a notice that
    // cannot be remembered must never become a nag.
    mkdirSync(userData, { recursive: true });
    writeFileSync(stamp, `${new Date().toISOString()}\n`);

    const legacyDir = input.result.legacyDir || (marker?.from ?? '');
    const choice = await (input.show ?? defaultShow)({
      message: `${LEGACY_APP_NAME} is now Tortie.`,
      detail: renameNoticeDetail({
        legacyDir,
        login: input.login,
        oldAppWasRunning: input.result.warnings.some((w) =>
          w.includes('SingletonLock')
        )
      }),
      buttons: ['OK', 'Open Settings']
    });
    if (choice === 1) {
      (
        input.onOpenSettings ??
        ((): void => {
          void import('../settings').then((m) => m.openSettingsWindow());
        })
      )();
    }
    return { shown: true, kind: 'migrated' };
  } catch (err) {
    console.error(
      `[gmux-migrate] could not show the rename notice: ${(err as Error).message}`
    );
    return { shown: false, reason: 'error' };
  }
}

/**
 * Say that the copy did not happen, where the data still is, and that the app
 * will try again.
 *
 * Shown once per distinct cause. The stamp holds the cause, so the same
 * permission error on twenty launches produces one dialog, and a different
 * error on the twenty first produces a second. Stamped before the dialog is
 * drawn, like every one-time notice in this codebase, so a hang cannot turn it
 * into a nag.
 */
async function showFailureNotice(
  input: RenameNoticeInput,
  userData: string,
  marker: ReturnType<typeof readMigrationMarker>
): Promise<RenameNoticeOutcome> {
  const failedNow = input.result.status === 'failed';
  const legacyDir = failedNow
    ? input.result.legacyDir
    : (marker?.from ?? input.result.legacyDir);
  // `cause` and not `summary`. The summary is a log line: it repeats the folder
  // the dialog already names, it carries a copyfile source and destination, and
  // it used to put an em dash in front of a person. See MigrationResult.cause.
  const error = failedNow
    ? (input.result.cause ?? input.result.summary)
    : (marker?.error ?? '');
  const reason = failedNow ? input.result.reason : (marker?.reason ?? 'error');

  // The old folder having been removed since the failure is the one case where
  // there is nothing true left to say. Saying "your data is still in X" about a
  // directory that is gone would be worse than silence.
  if (legacyDir === '' || !existsSync(legacyDir)) {
    return { shown: false, reason: 'nothing-to-show' };
  }

  const cause = `${reason}: ${error}`.slice(0, 400);
  const stamp = join(userData, FAILURE_STAMP);
  if (existsSync(stamp)) {
    try {
      if (readFileSync(stamp, 'utf8').trim() === cause) {
        return { shown: false, reason: 'already-shown' };
      }
    } catch {
      /* an unreadable stamp is a stamp we replace */
    }
  }

  mkdirSync(userData, { recursive: true });
  writeFileSync(stamp, `${cause}\n`);

  const choice = await (input.show ?? defaultShow)({
    message: 'Tortie could not copy your old data.',
    detail: renameFailureDetail({ legacyDir, error }),
    buttons: ['OK', 'Show the Old Folder']
  });
  if (choice === 1) {
    (input.onShowFolder ?? defaultShowFolder)(legacyDir);
  }
  return { shown: true, kind: 'failed' };
}

/**
 * The words for the failure, apart from the dialog, so a test can read them.
 *
 * Three things have to be true in it. The user has to learn that their data is
 * still on the disk and where. They have to learn that the app will try again
 * on its own, because otherwise the reasonable response is to give up. And
 * they have to learn that their running sessions are unaffected, which is the
 * fact that turns this from a disaster into an inconvenience.
 */
export function renameFailureDetail(opts: {
  legacyDir: string;
  error: string;
}): string {
  const lines: string[] = [
    `Your projects, sessions and settings are still in ${opts.legacyDir}. ` +
      'Nothing was lost and nothing was moved.',
    '',
    'Here is what stopped it.',
    opts.error === '' ? 'The copy did not finish.' : opts.error,
    '',
    'Tortie will try again by itself the next time it starts. Until that ' +
      'works, Tortie opens with an empty session list.',
    '',
    'If it keeps failing, two things are worth checking:',
    '',
    '• Whether you can open the folder above yourself. One file in it that ' +
      'cannot be read is enough to stop the copy.',
    '• Whether the disk has room for a second copy of that folder.',
    '',
    'Your running sessions were never touched. They live outside the app and ' +
      'are still exactly where you left them.'
  ];
  return lines.join('\n');
}

function defaultShowFolder(dir: string): void {
  void shell.openPath(dir);
}

/**
 * The words, apart from the dialog, so a test can read them and a reviewer can
 * argue with them. Plain sentences, no jargon, and it never claims a
 * permission was preserved.
 */
export function renameNoticeDetail(opts: {
  legacyDir: string;
  login?: LoginItemReconcile;
  oldAppWasRunning?: boolean;
}): string {
  const lines: string[] = [
    'Your projects, sessions, settings and shortcuts came across. They were ' +
      'copied, not moved. The originals are still in ' +
      `${opts.legacyDir || `~/Library/Application Support/${LEGACY_APP_NAME}`}.`,
    '',
    'macOS treats a renamed app as a different app, so two things could not ' +
      'come with it:',
    '',
    '• Permissions. Anything you allowed gmux, such as Full Disk Access, ' +
      'will be asked for again the first time Tortie needs it. Nothing is ' +
      'broken. macOS just has to hear it from you once more.'
  ];

  if (opts.login?.action === 're-registered') {
    lines.push(
      '',
      '• Opening at login. This was registered to the old app, so Tortie has ' +
        're-registered itself. Remove the leftover “gmux” entry in System ' +
        'Settings → General → Login Items.'
    );
  } else {
    lines.push(
      '',
      '• Opening at login. If gmux used to start automatically, turn it back ' +
        'on in Tortie’s Settings → General, then remove the leftover “gmux” ' +
        'entry in System Settings → General → Login Items.'
    );
  }

  if (opts.login?.action === 'refused') {
    lines.push(
      '',
      'macOS refused to register Tortie as a login item. Until that is ' +
        'allowed in System Settings → General → Login Items, your sessions ' +
        'will not come back on their own after a restart.'
    );
  }

  if (opts.oldAppWasRunning === true) {
    lines.push(
      '',
      'One thing to check: gmux still looked like it was running when this ' +
        'copy was taken, so anything you started in gmux AFTER that moment is ' +
        'not in the list here. Those sessions are still alive and unharmed, ' +
        'and the old data is still in the folder above. Quit gmux and use ' +
        'only Tortie from now on.'
    );
  }

  lines.push(
    '',
    'Your running sessions were never touched. They live outside the app and ' +
      'are still exactly where you left them.'
  );
  return lines.join('\n');
}

async function defaultShow(options: {
  message: string;
  detail: string;
  buttons: string[];
}): Promise<number> {
  const { response } = await dialog.showMessageBox({
    type: 'info',
    message: options.message,
    detail: options.detail,
    buttons: options.buttons,
    defaultId: 0,
    cancelId: 0,
    noLink: true
  });
  return response;
}

/** Exported for the diagnostics answer "why did I not see the notice?". */
export function openLoginItemsSettings(): void {
  void shell.openExternal(
    'x-apple.systempreferences:com.apple.LoginItems-Settings.extension'
  );
}
