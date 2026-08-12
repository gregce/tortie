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
 */

import { app, dialog, shell } from 'electron';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { LoginItemReconcile } from '../restore/login-item';
import {
  LEGACY_APP_NAME,
  readMigrationMarker,
  type MigrationResult
} from './userdata';

/** Written beside the migration marker once the notice has been shown. */
export const NOTICE_STAMP = '.rename-notice-shown';

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
}

export type RenameNoticeOutcome =
  | { shown: false; reason: 'no-migration' | 'already-shown' | 'error' }
  | { shown: true };

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
    return { shown: true };
  } catch (err) {
    console.error(
      `[gmux-migrate] could not show the rename notice: ${(err as Error).message}`
    );
    return { shown: false, reason: 'error' };
  }
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
      'copied, not moved — the originals are still in ' +
      `${opts.legacyDir || `~/Library/Application Support/${LEGACY_APP_NAME}`}.`,
    '',
    'macOS treats a renamed app as a different app, so two things could not ' +
      'come with it:',
    '',
    '• Permissions. Anything you allowed gmux — Full Disk Access, Files & ' +
      'Folders, Automation — will be asked for again the first time Tortie ' +
      'needs it. Nothing is broken; macOS just has to hear it from you once ' +
      'more.'
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
        'not in the list here. Those sessions are still alive and unharmed — ' +
        'the old data is still in the folder above. Quit gmux and use only ' +
        'Tortie from now on.'
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
