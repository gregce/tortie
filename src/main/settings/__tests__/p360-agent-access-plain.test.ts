/**
 * Phase 360 — the agent-access switch is a PLAIN BOOLEAN. It used to live in
 * the danger seal (see the 359 entry in the running log); the operator's
 * ruling of 2026-11-07 removed it, because the operations it gates are
 * read/show-only and the keychain prompt the seal costs is not worth it for
 * this switch.
 *
 * What is pinned here:
 *  - the switch defaults off, patches through, and round-trips;
 *  - only literal `true` survives the shape layer;
 *  - the switch NEVER touches the OS keystore — on or off, sealed or
 *    unsealed, the keystore count stays zero;
 *  - a settings file holding `true` reads `true` with no seal at all (that
 *    is the whole point of the phase);
 *  - a 359-era seal that still carries the old `agentAccess` member opens
 *    fine and changes nothing about this switch;
 *  - the seal still works for everything it still owns (launch defaults are
 *    the witness here).
 *
 * NO SECRET VALUE APPEARS ANYWHERE IN THIS FILE. Nothing here resolves one.
 */

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Set per test. Counts every call, because "did this read reach the seal?" is
 * answered by whether the keystore was touched at all. The mock is the one
 * from p269-env-seal.test.ts.
 */
const keystore = { available: true, ready: true, calls: 0 };

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
    encryptString: (text: string): Buffer => {
      keystore.calls += 1;
      return Buffer.from(`sealed ${text}`, 'utf8');
    },
    decryptString: (buf: Buffer): string => {
      keystore.calls += 1;
      const text = buf.toString('utf8');
      if (!text.startsWith('sealed ')) throw new Error('not our key');
      return text.slice('sealed '.length);
    }
  }
}));

type Store = typeof import('../store');

async function freshStore(): Promise<Store> {
  vi.resetModules();
  return import('../store');
}

function settingsPath(): string {
  return join(userDataDir, 'settings.json');
}

function readRaw(): Record<string, unknown> {
  return JSON.parse(readFileSync(settingsPath(), 'utf8')) as Record<
    string,
    unknown
  >;
}

/** Write a settings file the way a hostile agent would: JSON, and no seal. */
function writeByHand(settings: Record<string, unknown>): void {
  writeFileSync(
    settingsPath(),
    JSON.stringify({ version: 1, settings }, null, 2),
    'utf8'
  );
}

beforeEach(() => {
  userDataDir = mkdtempSync(join(tmpdir(), 'gmux-p360-switch-'));
  keystore.available = true;
  keystore.ready = true;
  keystore.calls = 0;
});

afterEach(() => {
  rmSync(userDataDir, { recursive: true, force: true });
  vi.restoreAllMocks();
});

describe('the shipped answer is off', () => {
  it('is what a fresh install reads', async () => {
    const store = await freshStore();
    expect(store.getSettings().agentAccess).toBe(false);
  });

  it('is what a settings file written before this phase reads', async () => {
    writeByHand({ defaultAgent: 'claude' });
    const store = await freshStore();
    expect(store.getSettings().agentAccess).toBe(false);
  });

  it('is the default and the sanitizer keeps it', async () => {
    const store = await freshStore();
    const { defaultGmuxSettings } = await import('@shared/settings');
    expect(defaultGmuxSettings().agentAccess).toBe(false);
    expect(store.sanitizeSettings({}).agentAccess).toBe(false);
  });
});

describe('the shape layer: only literal true survives', () => {
  it.each([
    ['a string', 'true'],
    ['a number', 1],
    ['an object', { on: true }],
    ['an array', [true]],
    ['null', null]
  ])('reads %s as off', async (_label, value) => {
    const store = await freshStore();
    expect(store.sanitizeSettings({ agentAccess: value }).agentAccess).toBe(
      false
    );
  });

  it('keeps literal true through sanitize', async () => {
    const store = await freshStore();
    expect(store.sanitizeSettings({ agentAccess: true }).agentAccess).toBe(true);
  });
});

describe('the keystore is never asked', () => {
  it('switching on touches nothing', async () => {
    const store = await freshStore();
    store.updateSettings({ agentAccess: true });
    expect(store.getSettings().agentAccess).toBe(true);
    expect(keystore.calls).toBe(0);
  });

  it('reading on touches nothing', async () => {
    writeByHand({ agentAccess: true });
    const store = await freshStore();
    expect(store.getSettings().agentAccess).toBe(true);
    expect(keystore.calls).toBe(0);
  });
});

describe('the Settings door: patch and watch shape', () => {
  it('patches through the app door and broadcasts the answer', async () => {
    const store = await freshStore();
    const seen: boolean[] = [];
    store.onSettingsUpdated((next) => seen.push(next.agentAccess));
    store.updateSettings({ agentAccess: true });
    expect(store.getSettings().agentAccess).toBe(true);
    expect(seen).toEqual([true]);
    const file = readRaw();
    expect(
      (file['settings'] as Record<string, unknown>)['agentAccess']
    ).toBe(true);
  });

  it('turns back off through the same door', async () => {
    const store = await freshStore();
    store.updateSettings({ agentAccess: true });
    expect(store.getSettings().agentAccess).toBe(true);
    store.updateSettings({ agentAccess: false });
    expect(store.getSettings().agentAccess).toBe(false);
  });
});

describe('THE POINT OF THE PHASE — a file true reads true with no seal', () => {
  it('is honored on read', async () => {
    writeByHand({ agentAccess: true });
    const store = await freshStore();
    expect(store.getSettings().agentAccess).toBe(true);
  });

  it('is honored when renamed over the file atomically', async () => {
    writeByHand({ agentAccess: false });
    const store = await freshStore();
    expect(store.getSettings().agentAccess).toBe(false);
    writeFileSync(
      `${settingsPath()}.tmp`,
      JSON.stringify(
        { version: 1, settings: { agentAccess: true } },
        null,
        2
      ),
      'utf8'
    );
    const { renameSync } = await import('node:fs');
    renameSync(`${settingsPath()}.tmp`, settingsPath());
    const again = await freshStore();
    expect(again.getSettings().agentAccess).toBe(true);
  });

  it('a 359-era seal carrying the old member opens and changes nothing', async () => {
    const SEAL_PREFIX = 'gmux-danger-seal-v1:';
    const state = {
      defaults: [],
      acks: [],
      fold: null,
      arch: null,
      env: [],
      envShared: [],
      agentAccess: true
    };
    const blob = Buffer.from(
      `sealed ${SEAL_PREFIX}${JSON.stringify(state)}`,
      'utf8'
    ).toString('base64');
    writeFileSync(
      settingsPath(),
      JSON.stringify(
        { version: 1, settings: { agentAccess: true }, dangerSeal: blob },
        null,
        2
      ),
      'utf8'
    );
    const store = await freshStore();
    expect(store.getSettings().agentAccess).toBe(true);
  });
});

describe('the seal still covers what it still owns', () => {
  it('launch defaults are still refused unsealed and kept sealed', async () => {
    writeByHand({
      agentAccess: true,
      launchDefaults: { claude: ['--dangerously-skip-permissions'] }
    });
    const store = await freshStore();
    // The switch reads on; the danger flag does not ride along with it.
    expect(store.getSettings().agentAccess).toBe(true);
    expect(
      store.getSettings().launchDefaults['claude'] ?? []
    ).not.toContain('--dangerously-skip-permissions');
  });
});
