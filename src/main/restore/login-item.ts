/**
 * 'Launch Tortie at login' — the T3 trigger (FINAL-REPORT §2.4 Step 3.1).
 *
 * Electron's app.setLoginItemSettings uses SMAppService on macOS 13+, which
 * registers Tortie.app itself as the login item. That matters for TCC: the app
 * spawns the tmux server as its own child, so the whole restored agent tree is
 * attributed to Tortie.app (the cmux failure mode — research 09 §C.2).
 *
 * The setter returns the OS-read-back state, not the request — System
 * Settings > Login Items can refuse silently, and the UI must show truth.
 *
 * ---------------------------------------------------------------------------
 * WHY THE PREFERENCE IS ALSO WRITTEN TO DISK (Phase 16.5, rename hazard 3)
 * ---------------------------------------------------------------------------
 * SMAppService keys its registration on the BUNDLE ID. `com.specstory.gmux`
 * and `com.specstory.tortie` are two different apps to macOS, so a rename (or
 * any future bundle-id change) leaves the old registration pointing at a
 * bundle that no longer exists and reports `openAtLogin: false` for the new
 * one — the toggle silently flips itself off and the user's sessions stop
 * coming back after a reboot. Nothing in the OS lets us read the OLD bundle's
 * registration back (`backgrounditems.btm` is opaque and root-only), so the
 * only durable record is one we keep ourselves.
 *
 * So the user's ANSWER lives in `<userData>/gmux/login-item.json` — inside the
 * directory the userData migration carries across a rename — and every boot
 * reconciles it against what macOS actually has. If they diverge, we
 * re-register and say so; if macOS refuses, we say THAT, loudly, instead of
 * leaving a dead toggle looking healthy.
 *
 * Being honest about the one case this cannot rescue: the gmux build that
 * shipped before this file existed never wrote the stamp, so its login-item
 * setting genuinely cannot be recovered. That is what the one-time rename
 * notice (src/main/migrate/notice.ts) tells the user in plain words.
 */

import { app } from 'electron';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export interface LoginItemState {
  openAtLogin: boolean;
}

/** What we remembered the user asking for, and when. */
interface LoginItemStamp {
  version: 1;
  openAtLogin: boolean;
  updatedAt: number;
  /** The bundle id the answer was last applied under, for diagnosis. */
  bundleId: string;
}

/**
 * Inside `<userData>/gmux/` on purpose: that inner directory name is INTERNAL
 * and unchanged by the rename (see migrate/userdata.ts), and it is copied
 * wholesale by the migration, so the stamp survives the very event it exists
 * for.
 */
function stampPath(): string {
  return join(app.getPath('userData'), 'gmux', 'login-item.json');
}

function readStamp(): LoginItemStamp | null {
  try {
    const parsed = JSON.parse(
      readFileSync(stampPath(), 'utf8')
    ) as LoginItemStamp;
    return parsed.version === 1 && typeof parsed.openAtLogin === 'boolean'
      ? parsed
      : null;
  } catch {
    return null; // absent or unreadable — no remembered answer
  }
}

function writeStamp(openAtLogin: boolean): void {
  try {
    const path = stampPath();
    mkdirSync(dirname(path), { recursive: true });
    const stamp: LoginItemStamp = {
      version: 1,
      openAtLogin,
      updatedAt: Date.now(),
      bundleId: bundleId()
    };
    writeFileSync(path, JSON.stringify(stamp, null, 2));
  } catch (err) {
    // Not fatal: the OS registration is the live state either way. But a
    // preference we cannot remember is one a future rename will lose.
    console.warn(
      `[gmux] could not record the launch-at-login preference: ${(err as Error).message}`
    );
  }
}

function bundleId(): string {
  try {
    // Only defined for a packaged .app; dev runs report Electron's own id.
    return app.isPackaged ? 'com.specstory.tortie' : 'dev';
  } catch {
    return 'unknown';
  }
}

export function getLoginItemState(): LoginItemState {
  try {
    return { openAtLogin: app.getLoginItemSettings().openAtLogin };
  } catch {
    return { openAtLogin: false };
  }
}

export function setLoginItemState(openAtLogin: boolean): LoginItemState {
  app.setLoginItemSettings({ openAtLogin });
  // Readback — macOS may decline (MDM policy, unsigned build, user veto).
  const actual = getLoginItemState();
  // Record what the user ASKED for, not what macOS granted: on the next
  // launch (or the next bundle id) we want to retry their answer, not inherit
  // the refusal. The refusal itself is reported by the caller.
  writeStamp(openAtLogin);
  return actual;
}

/** What `reconcileLoginItem()` did, so a caller can tell the user about it. */
export type LoginItemReconcile =
  | { action: 'none'; openAtLogin: boolean }
  | { action: 're-registered'; openAtLogin: true }
  | { action: 'refused'; openAtLogin: false }
  | { action: 'unknown'; openAtLogin: boolean };

/**
 * Bring macOS back in line with the user's remembered answer. Called once at
 * boot, after the app is ready.
 *
 * - No stamp -> `unknown`: we have never been told, so we touch nothing. (This
 *   is the first launch after the gmux -> Tortie rename, and the reason the
 *   rename notice exists.)
 * - Stamp agrees with the OS -> `none`.
 * - Stamp says ON and the OS says OFF -> re-register under the CURRENT bundle
 *   id. This is the rename repair.
 * - Re-registration refused -> `refused`, logged as an error. Never silent.
 *
 * Deliberately one-directional: a stamp saying OFF against an OS saying ON is
 * left alone. Turning a login item off is the user's business — an app that
 * un-registers itself on the strength of a stale file is worse than a stale
 * file.
 */
export function reconcileLoginItem(): LoginItemReconcile {
  const stamp = readStamp();
  const current = getLoginItemState().openAtLogin;
  if (stamp === null) return { action: 'unknown', openAtLogin: current };
  if (stamp.openAtLogin === current || !stamp.openAtLogin) {
    return { action: 'none', openAtLogin: current };
  }

  console.warn(
    `[gmux] launch-at-login was on for ${stamp.bundleId} but macOS reports it ` +
      `off for ${bundleId()} — re-registering`
  );
  try {
    app.setLoginItemSettings({ openAtLogin: true });
  } catch (err) {
    console.error(
      `[gmux] could not re-register the login item: ${(err as Error).message}`
    );
    return { action: 'refused', openAtLogin: false };
  }
  if (getLoginItemState().openAtLogin) {
    return { action: 're-registered', openAtLogin: true };
  }
  console.error(
    '[gmux] macOS refused to re-register the login item — sessions will NOT ' +
      'come back automatically after a restart. Turn "Launch Tortie at login" ' +
      'back on in Settings → General, and check System Settings → General → ' +
      'Login Items.'
  );
  return { action: 'refused', openAtLogin: false };
}
