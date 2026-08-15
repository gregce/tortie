/**
 * Phase 24 unit tests, two subjects:
 *
 * - the updates.json store (state.ts). Missing and corrupt files read as the
 *   defaults, malformed fields fall back one by one, writes merge and land
 *   atomically, and the hidden allowDowngrade switch arms on the exact
 *   boolean true and on nothing else.
 * - the feed override gate predicate (updater.ts). TORTIE_UPDATE_FEED is
 *   honored only when all three rehearsal conditions hold, and every one of
 *   the eight combinations is pinned here so a stray environment variable
 *   can never redirect a production check.
 */

import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// A fake electron: only the surfaces the two modules touch at import time or
// in these tests. BrowserWindow exists because ../tmux/supervisor imports
// ../notice, which imports ../typed-events, which names it at import.
// ---------------------------------------------------------------------------

let userDataDir = '';

vi.mock('electron', () => ({
  app: {
    getPath: (name: string) => {
      if (name !== 'userData') throw new Error(`unexpected path: ${name}`);
      return userDataDir;
    },
    getVersion: () => '0.18.0',
    isPackaged: false
  },
  BrowserWindow: class {}
}));

// updater.ts imports the library at module scope. The predicate under test
// never touches it, so an empty stand-in is enough.
vi.mock('electron-updater', () => ({ autoUpdater: {} }));

import { readUpdateState, sanitizeUpdateState, writeUpdateState } from '../state';
import { feedOverrideDecision } from '../updater';

beforeEach(() => {
  userDataDir = mkdtempSync(join(tmpdir(), 'gmux-updates-test-'));
});

afterEach(() => {
  rmSync(userDataDir, { recursive: true, force: true });
});

const statePath = (): string => join(userDataDir, 'updates.json');

// ---------------------------------------------------------------------------
// The store
// ---------------------------------------------------------------------------

const DEFAULT_STATE = {
  lastSeenVersion: null,
  allowDowngrade: false,
  lastCheckedAt: null,
  pendingVersion: null,
  pendingRecordedAt: null,
  wreckAnnouncedFor: null
};

describe('readUpdateState', () => {
  it('returns the defaults when the file is missing', () => {
    expect(readUpdateState()).toEqual(DEFAULT_STATE);
  });

  it('returns the defaults when the file is corrupt', () => {
    writeFileSync(statePath(), '{not json', 'utf8');
    expect(readUpdateState()).toEqual(DEFAULT_STATE);
  });

  it('reads a valid file back field for field', () => {
    writeFileSync(
      statePath(),
      JSON.stringify({
        lastSeenVersion: '0.18.2',
        allowDowngrade: true,
        lastCheckedAt: 1765600000000,
        pendingVersion: '0.18.3',
        pendingRecordedAt: 1765600100000
      }),
      'utf8'
    );
    expect(readUpdateState()).toEqual({
      lastSeenVersion: '0.18.2',
      allowDowngrade: true,
      lastCheckedAt: 1765600000000,
      pendingVersion: '0.18.3',
      pendingRecordedAt: 1765600100000,
      wreckAnnouncedFor: null
    });
  });

  it('drops malformed fields one by one, not the whole file', () => {
    writeFileSync(
      statePath(),
      JSON.stringify({
        lastSeenVersion: 42,
        allowDowngrade: 'true',
        lastCheckedAt: 1765600000000
      }),
      'utf8'
    );
    expect(readUpdateState()).toEqual({
      ...DEFAULT_STATE,
      lastCheckedAt: 1765600000000
    });
  });
});

describe('sanitizeUpdateState, the allowDowngrade rule', () => {
  it('arms on the exact boolean true', () => {
    expect(sanitizeUpdateState({ allowDowngrade: true }).allowDowngrade).toBe(
      true
    );
  });

  it.each([['true'], [1], ['yes'], [{}], [null]])(
    'stays off for %j',
    (value) => {
      expect(
        sanitizeUpdateState({ allowDowngrade: value }).allowDowngrade
      ).toBe(false);
    }
  );

  it('rejects a blank or non-string lastSeenVersion', () => {
    expect(sanitizeUpdateState({ lastSeenVersion: '  ' }).lastSeenVersion).toBe(
      null
    );
    expect(sanitizeUpdateState({ lastSeenVersion: 7 }).lastSeenVersion).toBe(
      null
    );
  });

  it('rejects a lastCheckedAt that is not a positive finite number', () => {
    expect(sanitizeUpdateState({ lastCheckedAt: -5 }).lastCheckedAt).toBe(null);
    expect(sanitizeUpdateState({ lastCheckedAt: NaN }).lastCheckedAt).toBe(
      null
    );
    expect(sanitizeUpdateState({ lastCheckedAt: '12' }).lastCheckedAt).toBe(
      null
    );
  });
});

describe('sanitizeUpdateState, the pending pair (Phase 31)', () => {
  it('reads a valid pair back as written', () => {
    const state = sanitizeUpdateState({
      pendingVersion: '0.19.1',
      pendingRecordedAt: 1765600000000
    });
    expect(state.pendingVersion).toBe('0.19.1');
    expect(state.pendingRecordedAt).toBe(1765600000000);
  });

  it('nulls BOTH fields when the version is malformed', () => {
    const state = sanitizeUpdateState({
      pendingVersion: '   ',
      pendingRecordedAt: 1765600000000
    });
    expect(state.pendingVersion).toBe(null);
    expect(state.pendingRecordedAt).toBe(null);
  });

  it('nulls BOTH fields when the timestamp is malformed', () => {
    for (const bad of [-1, NaN, '1765600000000', null, undefined]) {
      const state = sanitizeUpdateState({
        pendingVersion: '0.19.1',
        pendingRecordedAt: bad
      });
      expect(state.pendingVersion).toBe(null);
      expect(state.pendingRecordedAt).toBe(null);
    }
  });

  it('a malformed pair leaves the other fields alone', () => {
    const state = sanitizeUpdateState({
      lastSeenVersion: '0.19.0',
      lastCheckedAt: 1765600000000,
      pendingVersion: 7,
      pendingRecordedAt: 1765600000000
    });
    expect(state.lastSeenVersion).toBe('0.19.0');
    expect(state.lastCheckedAt).toBe(1765600000000);
    expect(state.pendingVersion).toBe(null);
    expect(state.pendingRecordedAt).toBe(null);
  });
});

describe('sanitizeUpdateState, wreckAnnouncedFor (Phase 43)', () => {
  it('keeps a non empty string', () => {
    expect(
      sanitizeUpdateState({ wreckAnnouncedFor: 'a terminal line' })
        .wreckAnnouncedFor
    ).toBe('a terminal line');
  });

  it('trims a padded string', () => {
    expect(
      sanitizeUpdateState({ wreckAnnouncedFor: '  a terminal line  ' })
        .wreckAnnouncedFor
    ).toBe('a terminal line');
  });

  it.each([['   '], [''], [7], [null], [{}]])('reads %j as null', (value) => {
    expect(sanitizeUpdateState({ wreckAnnouncedFor: value }).wreckAnnouncedFor).toBe(
      null
    );
  });

  it('reads as null when the field is absent', () => {
    expect(sanitizeUpdateState({}).wreckAnnouncedFor).toBe(null);
  });

  it('survives a malformed pending pair, because it is independent of it', () => {
    const state = sanitizeUpdateState({
      wreckAnnouncedFor: 'a terminal line',
      pendingVersion: '0.19.1',
      pendingRecordedAt: 'not a number'
    });
    expect(state.wreckAnnouncedFor).toBe('a terminal line');
    expect(state.pendingVersion).toBe(null);
    expect(state.pendingRecordedAt).toBe(null);
  });
});

describe('writeUpdateState', () => {
  it('merges the patch over what is on disk', () => {
    writeUpdateState({ lastSeenVersion: '0.18.1' });
    writeUpdateState({ lastCheckedAt: 1765600000000 });
    expect(readUpdateState()).toEqual({
      ...DEFAULT_STATE,
      lastSeenVersion: '0.18.1',
      lastCheckedAt: 1765600000000
    });
  });

  it('records and clears the pending pair across merges', () => {
    writeUpdateState({
      pendingVersion: '0.19.1',
      pendingRecordedAt: 1765600000000
    });
    expect(readUpdateState().pendingVersion).toBe('0.19.1');
    writeUpdateState({ pendingVersion: null, pendingRecordedAt: null });
    expect(readUpdateState().pendingVersion).toBe(null);
    expect(readUpdateState().pendingRecordedAt).toBe(null);
  });

  it('preserves a hand written allowDowngrade across unrelated writes', () => {
    writeFileSync(
      statePath(),
      JSON.stringify({ allowDowngrade: true }),
      'utf8'
    );
    writeUpdateState({ lastSeenVersion: '0.19.0' });
    expect(readUpdateState().allowDowngrade).toBe(true);
  });

  it('leaves no tmp file behind and writes parseable JSON', () => {
    writeUpdateState({ lastSeenVersion: '0.18.1' });
    expect(existsSync(`${statePath()}.tmp`)).toBe(false);
    const raw = readFileSync(statePath(), 'utf8');
    expect(raw.endsWith('\n')).toBe(true);
    expect(JSON.parse(raw).lastSeenVersion).toBe('0.18.1');
  });
});

// ---------------------------------------------------------------------------
// The feed override gate
// ---------------------------------------------------------------------------

const FEED = 'http://127.0.0.1:8099';
const ISOLATED_PROFILE = '/tmp/gmux-rehearsal/profile';
const OPERATOR_PROFILE = '/Users/gdc/Library/Application Support/Tortie';

describe('feedOverrideDecision', () => {
  it('does nothing when TORTIE_UPDATE_FEED is not set', () => {
    expect(feedOverrideDecision({}, 'gmux-update-rehearsal', ISOLATED_PROFILE))
      .toEqual({ url: null, refused: false });
    expect(
      feedOverrideDecision(
        { TORTIE_UPDATE_FEED: '   ' },
        'gmux-update-rehearsal',
        ISOLATED_PROFILE
      )
    ).toEqual({ url: null, refused: false });
  });

  // All eight combinations of the three conditions, with the feed set. Only
  // the one row where every condition holds hands the URL back.
  it.each([
    // [rehearsalFlag, socketName, userDataPath, expectUrl]
    ['1', 'gmux-update-rehearsal', ISOLATED_PROFILE, true],
    ['1', 'gmux-update-rehearsal', OPERATOR_PROFILE, false],
    ['1', 'gmux', ISOLATED_PROFILE, false],
    ['1', 'gmux', OPERATOR_PROFILE, false],
    ['', 'gmux-update-rehearsal', ISOLATED_PROFILE, false],
    ['', 'gmux-update-rehearsal', OPERATOR_PROFILE, false],
    ['', 'gmux', ISOLATED_PROFILE, false],
    ['', 'gmux', OPERATOR_PROFILE, false]
  ] as const)(
    'rehearsal=%j socket=%j profile=%j accepts=%j',
    (flag, socket, profile, accepts) => {
      const env: NodeJS.ProcessEnv = { TORTIE_UPDATE_FEED: FEED };
      if (flag !== '') env['GMUX_UPDATE_REHEARSAL'] = flag;
      const decision = feedOverrideDecision(env, socket, profile);
      if (accepts) {
        expect(decision).toEqual({ url: FEED, refused: false });
      } else {
        expect(decision).toEqual({ url: null, refused: true });
      }
    }
  );

  it('refuses a rehearsal flag that is not exactly "1"', () => {
    expect(
      feedOverrideDecision(
        { TORTIE_UPDATE_FEED: FEED, GMUX_UPDATE_REHEARSAL: 'yes' },
        'gmux-update-rehearsal',
        ISOLATED_PROFILE
      )
    ).toEqual({ url: null, refused: true });
  });
});
