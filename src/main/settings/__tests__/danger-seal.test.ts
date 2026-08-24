/**
 * The danger seal (Phase 18.5) — an agent cannot arm a safety flag by writing
 * settings.json.
 *
 * The hole this file exists to keep closed: `<userData>/settings.json` is
 * plain JSON in the user's home directory, and Tortie runs many agent
 * processes with write access to that directory. `sanitizeSettings` bounds
 * what a value may be, so arbitrary argv can never be injected, but it cannot
 * tell who wrote the file. An agent that added
 * `launchDefaults.claude = ["--dangerously-skip-permissions"]` made every
 * later modal-less create for claude start with permissions off. Adding the
 * matching key to `dangerAcknowledged` also stopped the Settings window from
 * ever explaining what had happened.
 *
 * What is pinned here:
 *  - a danger launch default written into the file by hand is not applied;
 *  - a danger acknowledgement written into the file by hand does not count;
 *  - the same value written by Tortie itself survives a restart;
 *  - non-danger launch defaults are untouched in every case;
 *  - a settings file with no danger value never reaches the OS keystore.
 */

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// A fake electron: the two surfaces store.ts touches.
// ---------------------------------------------------------------------------

/** Set per test. Counts every call so the "no keystore access" claim is real. */
const keystore = {
  available: true,
  ready: true,
  calls: 0
};

let userDataDir = '';

vi.mock('electron', () => ({
  app: {
    isReady: () => keystore.ready,
    getPath: (name: string) => {
      if (name !== 'userData') throw new Error(`unexpected path: ${name}`);
      return userDataDir;
    }
  },
  safeStorage: {
    isEncryptionAvailable: (): boolean => {
      keystore.calls += 1;
      return keystore.available;
    },
    // A stand-in for the OS key: reversible, and only for text this fake
    // produced, so a blob an attacker invents still fails to open.
    encryptString: (text: string): Buffer => {
      keystore.calls += 1;
      return Buffer.from(`sealed\u0000${text}`, 'utf8');
    },
    decryptString: (buf: Buffer): string => {
      keystore.calls += 1;
      const text = buf.toString('utf8');
      if (!text.startsWith('sealed\u0000')) throw new Error('not our key');
      return text.slice('sealed\u0000'.length);
    }
  }
}));

const DANGER = '--dangerously-skip-permissions';
const SAFE = '--permission-mode plan';
const DANGER_KEY = `claude ${DANGER}`;

type Store = typeof import('../store');

/** A fresh module instance, so the per-run load cache starts empty. */
async function freshStore(): Promise<Store> {
  vi.resetModules();
  return import('../store');
}

function settingsPath(): string {
  return join(userDataDir, 'settings.json');
}

/** Write a settings file the way a hostile agent would: JSON, no seal. */
function writeByHand(settings: Record<string, unknown>): void {
  writeFileSync(
    settingsPath(),
    JSON.stringify({ version: 1, settings }, null, 2),
    'utf8'
  );
}

function readRaw(): Record<string, unknown> {
  return JSON.parse(readFileSync(settingsPath(), 'utf8')) as Record<
    string,
    unknown
  >;
}

beforeEach(() => {
  userDataDir = mkdtempSync(join(tmpdir(), 'gmux-danger-seal-'));
  keystore.available = true;
  keystore.ready = true;
  keystore.calls = 0;
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  rmSync(userDataDir, { recursive: true, force: true });
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// The pure half
// ---------------------------------------------------------------------------

describe('danger state', () => {
  it('separates danger launch defaults from ordinary ones', async () => {
    const store = await freshStore();
    const settings = store.sanitizeSettings({
      launchDefaults: { claude: [DANGER, SAFE] }
    });
    // Sanitization keeps both: shape is all it can judge.
    expect(settings.launchDefaults.claude).toEqual([DANGER, SAFE]);
    expect(store.dangerStateOf(settings).defaults).toEqual([DANGER_KEY]);
  });

  it('drops an unsealed danger default and keeps the ordinary one', async () => {
    const store = await freshStore();
    const settings = store.sanitizeSettings({
      launchDefaults: { claude: [DANGER, SAFE] },
      dangerAcknowledged: [DANGER_KEY]
    });
    const out = store.withSealedDangerState(settings, {
      defaults: [],
      acks: [],
      fold: null
    });
    expect(out.settings.launchDefaults.claude).toEqual([SAFE]);
    expect(out.rejected).toEqual([DANGER_KEY]);
    // The acknowledgement is dropped too, so the Settings window still
    // explains the flag the first time the user switches it on.
    expect(out.settings.dangerAcknowledged).toEqual([]);
  });

  it('keeps a danger default the seal covers', async () => {
    const store = await freshStore();
    const settings = store.sanitizeSettings({
      launchDefaults: { claude: [DANGER, SAFE] },
      dangerAcknowledged: [DANGER_KEY]
    });
    const out = store.withSealedDangerState(settings, {
      defaults: [DANGER_KEY],
      acks: [DANGER_KEY],
      fold: null
    });
    expect(out.settings.launchDefaults.claude).toEqual([DANGER, SAFE]);
    expect(out.settings.dangerAcknowledged).toEqual([DANGER_KEY]);
    expect(out.rejected).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// The store, through a real file on disk
// ---------------------------------------------------------------------------

describe('getSettings', () => {
  it('ignores a danger default an agent wrote into the file', async () => {
    writeByHand({
      launchDefaults: { claude: [DANGER, SAFE] },
      dangerAcknowledged: [DANGER_KEY]
    });
    const store = await freshStore();
    const settings = store.getSettings();
    expect(settings.launchDefaults.claude).toEqual([SAFE]);
    expect(settings.dangerAcknowledged).toEqual([]);
  });

  it('ignores a seal the agent invented', async () => {
    writeFileSync(
      settingsPath(),
      JSON.stringify({
        version: 1,
        settings: { launchDefaults: { claude: [DANGER] } },
        dangerSeal: Buffer.from(
          `gmux-danger-seal-v1:{"defaults":["${DANGER_KEY}"],"acks":[]}`,
          'utf8'
        ).toString('base64')
      }),
      'utf8'
    );
    const store = await freshStore();
    expect(store.getSettings().launchDefaults.claude).toBeUndefined();
  });

  it('never reaches the keystore when no danger value is present', async () => {
    writeByHand({ launchDefaults: { claude: [SAFE] }, defaultAgent: 'codex' });
    const store = await freshStore();
    expect(store.getSettings().launchDefaults.claude).toEqual([SAFE]);
    expect(keystore.calls).toBe(0);
  });

  it('re-asks after a read that happened before the app was ready', async () => {
    writeByHand({ launchDefaults: { claude: [DANGER] } });
    keystore.ready = false;
    const store = await freshStore();
    // Fail closed while the answer is unknown.
    expect(store.getSettings().launchDefaults.claude).toBeUndefined();
    keystore.ready = true;
    // Still refused, because the file carries no seal — but the question was
    // asked again rather than answered from the pre-ready cache.
    expect(store.getSettings().launchDefaults.claude).toBeUndefined();
  });
});

describe('updateSettings', () => {
  it('seals what Tortie writes, so it survives a restart', async () => {
    const first = await freshStore();
    first.updateSettings({
      launchDefaults: { claude: [DANGER, SAFE] },
      dangerAcknowledged: [DANGER_KEY]
    });
    expect(first.getSettings().launchDefaults.claude).toEqual([DANGER, SAFE]);
    expect(typeof readRaw()['dangerSeal']).toBe('string');

    // A restart: new module instance, same file.
    const second = await freshStore();
    const settings = second.getSettings();
    expect(settings.launchDefaults.claude).toEqual([DANGER, SAFE]);
    expect(settings.dangerAcknowledged).toEqual([DANGER_KEY]);
  });

  it('does not let an added flag ride along on a sealed one', async () => {
    const first = await freshStore();
    first.updateSettings({ launchDefaults: { claude: [DANGER] } });
    const sealed = readRaw()['dangerSeal'];

    // The agent adds a second danger flag but cannot re-seal.
    writeFileSync(
      settingsPath(),
      JSON.stringify({
        version: 1,
        settings: {
          launchDefaults: {
            claude: [DANGER, '--allow-dangerously-skip-permissions']
          }
        },
        dangerSeal: sealed
      }),
      'utf8'
    );
    const second = await freshStore();
    expect(second.getSettings().launchDefaults.claude).toEqual([DANGER]);
  });

  it('drops the flag rather than storing one the next load would refuse', async () => {
    keystore.available = false;
    const store = await freshStore();
    const next = store.updateSettings({ launchDefaults: { claude: [DANGER] } });
    expect(next.launchDefaults.claude).toBeUndefined();
    expect(readRaw()['dangerSeal']).toBeUndefined();
  });
});

describe('saveSettingsWindowBounds', () => {
  it('leaves the sealed settings on disk exactly as they were', async () => {
    const store = await freshStore();
    store.updateSettings({ launchDefaults: { claude: [DANGER] } });
    const before = readRaw();

    store.saveSettingsWindowBounds({ x: 10, y: 20, width: 800, height: 600 });
    const after = readRaw();
    expect(after['settings']).toEqual(before['settings']);
    expect(after['dangerSeal']).toEqual(before['dangerSeal']);
    expect(after['settingsWindowBounds']).toEqual({
      x: 10,
      y: 20,
      width: 800,
      height: 600
    });
  });
});
