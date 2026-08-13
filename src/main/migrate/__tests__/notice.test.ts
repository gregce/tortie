/**
 * The one-time rename notice (Phase 16.5, hazard 3).
 *
 * "Tell the user once, plainly, and never fail silently" is the requirement.
 * These tests pin all three words: ONCE (a stamp, written before the dialog so
 * a crash cannot turn it into a nag), PLAINLY (the words are asserted, not
 * just the fact of a dialog), and NEVER SILENTLY (a dialog that throws is
 * swallowed by the app, not by the user).
 */

import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('electron', () => ({
  app: { getPath: () => userData },
  dialog: { showMessageBox: async () => ({ response: 0 }) },
  shell: { openExternal: () => undefined, openPath: async () => '' }
}));

const {
  FAILURE_STAMP,
  NOTICE_STAMP,
  renameFailureDetail,
  renameNoticeDetail,
  showRenameNoticeOnce
} = await import('../notice');
const { MIGRATION_MARKER } = await import('../userdata');
import type { MigrationResult } from '../userdata';

let userData = '';

function result(over: Partial<MigrationResult> = {}): MigrationResult {
  return {
    status: 'migrated',
    reason: 'copied',
    legacyDir: '/Users/x/Library/Application Support/gmux',
    targetDir: userData,
    entries: [],
    skipped: [],
    files: 0,
    bytes: 0,
    databases: [],
    movedAside: [],
    warnings: [],
    summary: '',
    ms: 1,
    ...over
  };
}

function writeCompleteMarker(): void {
  mkdirSync(userData, { recursive: true });
  writeFileSync(
    join(userData, MIGRATION_MARKER),
    JSON.stringify({
      version: 1,
      status: 'complete',
      from: '/Users/x/Library/Application Support/gmux',
      to: userData,
      startedAt: Date.now(),
      finishedAt: Date.now(),
      entries: ['gmux'],
      app: { legacyName: 'gmux' }
    })
  );
}

/**
 * A legacy directory that really exists on disk. The failure notice refuses to
 * point at a folder that is not there, so every failure case needs one.
 */
function makeLegacyDir(): string {
  const dir = join(userData, 'legacy-gmux');
  mkdirSync(dir, { recursive: true });
  return dir;
}

function writeFailedMarker(over: Record<string, unknown> = {}): void {
  mkdirSync(userData, { recursive: true });
  writeFileSync(
    join(userData, MIGRATION_MARKER),
    JSON.stringify({
      version: 1,
      status: 'failed',
      from: makeLegacyDir(),
      to: userData,
      startedAt: Date.now(),
      entries: [],
      app: { legacyName: 'gmux' },
      reason: 'error',
      error: 'migration failed: EACCES, copyfile',
      attempts: 1,
      lastAttemptAt: Date.now(),
      ...over
    })
  );
}

beforeEach(() => {
  userData = mkdtempSync(join(tmpdir(), 'gmux-notice-'));
});

afterEach(() => {
  rmSync(userData, { recursive: true, force: true });
  vi.restoreAllMocks();
});

describe('when it fires', () => {
  it('does not fire on an install that never migrated', async () => {
    const shown = vi.fn(async () => 0);
    const out = await showRenameNoticeOnce({
      result: result({ status: 'skipped', reason: 'no-legacy-data' }),
      userDataDir: userData,
      show: shown
    });
    expect(out).toEqual({ shown: false, reason: 'no-migration' });
    expect(shown).not.toHaveBeenCalled();
  });

  it('fires on the launch that migrated', async () => {
    const shown = vi.fn(async () => 0);
    const out = await showRenameNoticeOnce({
      result: result(),
      userDataDir: userData,
      show: shown
    });
    expect(out).toEqual({ shown: true, kind: 'migrated' });
    expect(shown).toHaveBeenCalledTimes(1);
  });

  it('fires from the MARKER on a later launch — a crash cannot lose it', async () => {
    // The migration happened, the app died before the window opened, and
    // this launch's own result is a plain "already-migrated" skip.
    writeCompleteMarker();
    const shown = vi.fn(async () => 0);
    const out = await showRenameNoticeOnce({
      result: result({ status: 'skipped', reason: 'already-migrated' }),
      userDataDir: userData,
      show: shown
    });
    expect(out).toEqual({ shown: true, kind: 'migrated' });
    expect(shown).toHaveBeenCalledTimes(1);
  });

  it('shows ONCE, ever', async () => {
    writeCompleteMarker();
    const shown = vi.fn(async () => 0);
    const args = { result: result(), userDataDir: userData, show: shown };
    expect(await showRenameNoticeOnce(args)).toEqual({
      shown: true,
      kind: 'migrated'
    });
    expect(await showRenameNoticeOnce(args)).toEqual({
      shown: false,
      reason: 'already-shown'
    });
    expect(shown).toHaveBeenCalledTimes(1);
  });

  it('stamps BEFORE it shows, so a hang cannot become a nag', async () => {
    let stampedWhenShown = false;
    await showRenameNoticeOnce({
      result: result(),
      userDataDir: userData,
      show: async () => {
        stampedWhenShown = existsSync(join(userData, NOTICE_STAMP));
        return 0;
      }
    });
    expect(stampedWhenShown).toBe(true);
  });

  it('never lets a broken dialog take the app down', async () => {
    const out = await showRenameNoticeOnce({
      result: result(),
      userDataDir: userData,
      show: async () => {
        throw new Error('no window server');
      }
    });
    expect(out).toEqual({ shown: false, reason: 'error' });
  });

  it('opens Settings when the user asks for it', async () => {
    const onOpenSettings = vi.fn();
    await showRenameNoticeOnce({
      result: result(),
      userDataDir: userData,
      show: async () => 1, // "Open Settings"
      onOpenSettings
    });
    expect(onOpenSettings).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Phase 19 item 10 — the failure notice, which did not exist
// ---------------------------------------------------------------------------

describe('when the migration FAILED', () => {
  it('tells the user, where before it said nothing at all', async () => {
    const legacyDir = makeLegacyDir();
    let detail = '';
    const out = await showRenameNoticeOnce({
      result: result({
        status: 'failed',
        reason: 'error',
        legacyDir,
        summary: 'migration failed: EACCES, copyfile'
      }),
      userDataDir: userData,
      show: async (options) => {
        detail = options.detail;
        return 0;
      }
    });
    expect(out).toEqual({ shown: true, kind: 'failed' });
    expect(detail).toContain(legacyDir);
    expect(detail).toContain('EACCES');
  });

  it('fires from the MARKER on a later launch, when this run only skipped', async () => {
    // The failure was two launches ago. This launch found the target already
    // holding data and skipped, which is exactly the state that used to be
    // permanent and silent.
    writeFailedMarker();
    const shown = vi.fn(async () => 0);
    const out = await showRenameNoticeOnce({
      result: result({ status: 'skipped', reason: 'target-has-data' }),
      userDataDir: userData,
      show: shown
    });
    expect(out).toEqual({ shown: true, kind: 'failed' });
  });

  it('shows once for the same cause, however many launches it repeats over', async () => {
    const legacyDir = makeLegacyDir();
    const shown = vi.fn(async () => 0);
    const args = {
      result: result({
        status: 'failed' as const,
        reason: 'error' as const,
        legacyDir,
        summary: 'migration failed: EACCES, copyfile'
      }),
      userDataDir: userData,
      show: shown
    };
    expect(await showRenameNoticeOnce(args)).toEqual({
      shown: true,
      kind: 'failed'
    });
    expect(await showRenameNoticeOnce(args)).toEqual({
      shown: false,
      reason: 'already-shown'
    });
    expect(await showRenameNoticeOnce(args)).toEqual({
      shown: false,
      reason: 'already-shown'
    });
    expect(shown).toHaveBeenCalledTimes(1);
  });

  it('shows again when the cause CHANGES, because that is new information', async () => {
    const legacyDir = makeLegacyDir();
    const shown = vi.fn(async () => 0);
    const base = { userDataDir: userData, show: shown };
    await showRenameNoticeOnce({
      ...base,
      result: result({
        status: 'failed',
        reason: 'error',
        legacyDir,
        summary: 'migration failed: EACCES, copyfile'
      })
    });
    const out = await showRenameNoticeOnce({
      ...base,
      result: result({
        status: 'failed',
        reason: 'verification-failed',
        legacyDir,
        summary: 'migration ABORTED — 1 verification failure(s)'
      })
    });
    expect(out).toEqual({ shown: true, kind: 'failed' });
    expect(shown).toHaveBeenCalledTimes(2);
  });

  it('stamps BEFORE it shows, so a hang cannot become a nag', async () => {
    const legacyDir = makeLegacyDir();
    let stampedWhenShown = false;
    await showRenameNoticeOnce({
      result: result({ status: 'failed', reason: 'error', legacyDir }),
      userDataDir: userData,
      show: async () => {
        stampedWhenShown = existsSync(join(userData, FAILURE_STAMP));
        return 0;
      }
    });
    expect(stampedWhenShown).toBe(true);
  });

  it('says nothing when the old folder is no longer there', async () => {
    const shown = vi.fn(async () => 0);
    const out = await showRenameNoticeOnce({
      result: result({
        status: 'failed',
        reason: 'error',
        legacyDir: join(userData, 'a-folder-that-was-deleted')
      }),
      userDataDir: userData,
      show: shown
    });
    expect(out).toEqual({ shown: false, reason: 'nothing-to-show' });
    expect(shown).not.toHaveBeenCalled();
  });

  it('opens the old folder when the user asks for it', async () => {
    const legacyDir = makeLegacyDir();
    const onShowFolder = vi.fn();
    await showRenameNoticeOnce({
      result: result({ status: 'failed', reason: 'error', legacyDir }),
      userDataDir: userData,
      show: async () => 1, // "Show the Old Folder"
      onShowFolder
    });
    expect(onShowFolder).toHaveBeenCalledWith(legacyDir);
  });

  it('still shows the SUCCESS notice once the retry works', async () => {
    const legacyDir = makeLegacyDir();
    const shown = vi.fn(async () => 0);
    await showRenameNoticeOnce({
      result: result({ status: 'failed', reason: 'error', legacyDir }),
      userDataDir: userData,
      show: shown
    });
    writeCompleteMarker();
    const out = await showRenameNoticeOnce({
      result: result({ status: 'migrated', reason: 'copied', legacyDir }),
      userDataDir: userData,
      show: shown
    });
    expect(out).toEqual({ shown: true, kind: 'migrated' });
    expect(shown).toHaveBeenCalledTimes(2);
  });
});

describe('the words for a failure', () => {
  const legacyDir = '/Users/x/Library/Application Support/gmux';
  const error = 'migration failed: EACCES, copyfile';

  it('says where the data still is, and never that anything moved', () => {
    const detail = renameFailureDetail({ legacyDir, error });
    expect(detail).toContain(legacyDir);
    expect(detail).toContain('Nothing was lost and nothing was moved');
  });

  it('says the app will try again by itself', () => {
    expect(renameFailureDetail({ legacyDir, error })).toContain(
      'try again by itself the next time it starts'
    );
  });

  it('repeats the reassurance that running sessions are unaffected', () => {
    expect(renameFailureDetail({ legacyDir, error })).toContain(
      'running sessions were never touched'
    );
  });

  it('quotes the actual error, so a support answer has something to work with', () => {
    expect(renameFailureDetail({ legacyDir, error })).toContain('EACCES');
  });

  it('still reads as a sentence when there is no error text', () => {
    expect(renameFailureDetail({ legacyDir, error: '' })).toContain(
      'The copy did not finish.'
    );
  });

  it('uses no jargon a user would have to look up', () => {
    const detail = renameFailureDetail({ legacyDir, error: '' });
    for (const word of ['tmux', 'SQLite', 'marker', 'manifest', 'quarantine']) {
      expect(detail).not.toContain(word);
    }
  });

  it('uses no dash a style rule forbids', () => {
    const detail = renameFailureDetail({ legacyDir, error });
    expect(detail).not.toContain('—');
    expect(detail).not.toContain('–');
  });
});

describe('the words', () => {
  const legacyDir = '/Users/x/Library/Application Support/gmux';

  it('says the originals are still there — never "moved"', () => {
    const detail = renameNoticeDetail({ legacyDir });
    expect(detail).toContain('copied, not moved');
    expect(detail).toContain(legacyDir);
  });

  it('names both things macOS will not carry across', () => {
    const detail = renameNoticeDetail({ legacyDir });
    expect(detail).toContain('Permissions');
    expect(detail).toContain('Full Disk Access');
    expect(detail).toContain('Opening at login');
    expect(detail).toContain('Login Items');
  });

  it('reassures about the running sessions, which really were untouched', () => {
    expect(renameNoticeDetail({ legacyDir })).toContain(
      'running sessions were never touched'
    );
  });

  it('says so when the login item was repaired for them', () => {
    const detail = renameNoticeDetail({
      legacyDir,
      login: { action: 're-registered', openAtLogin: true }
    });
    expect(detail).toContain('re-registered itself');
    expect(detail).not.toContain('turn it back on in Tortie’s Settings');
  });

  it('is explicit — not silent — when macOS refused the login item', () => {
    const detail = renameNoticeDetail({
      legacyDir,
      login: { action: 'refused', openAtLogin: false }
    });
    expect(detail).toContain('macOS refused');
    expect(detail).toContain('will not come back on their own after a restart');
  });

  it('warns when the old app was still running as the copy was taken', () => {
    const detail = renameNoticeDetail({ legacyDir, oldAppWasRunning: true });
    expect(detail).toContain('not in the list here');
    expect(detail).toContain('Quit gmux and use only');
  });

  it('uses no jargon a user would have to look up', () => {
    const detail = renameNoticeDetail({ legacyDir });
    for (const word of ['tmux', 'SMAppService', 'TCC', 'bundle id', 'SQLite']) {
      expect(detail).not.toContain(word);
    }
  });
});
