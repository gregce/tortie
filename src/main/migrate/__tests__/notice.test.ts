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
  shell: { openExternal: () => undefined }
}));

const { NOTICE_STAMP, renameNoticeDetail, showRenameNoticeOnce } = await import(
  '../notice'
);
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
    expect(out).toEqual({ shown: true });
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
    expect(out).toEqual({ shown: true });
    expect(shown).toHaveBeenCalledTimes(1);
  });

  it('shows ONCE, ever', async () => {
    writeCompleteMarker();
    const shown = vi.fn(async () => 0);
    const args = { result: result(), userDataDir: userData, show: shown };
    expect(await showRenameNoticeOnce(args)).toEqual({ shown: true });
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
