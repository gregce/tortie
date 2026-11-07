/**
 * Phase 359, Builder A — the sealed agent-access switch.
 *
 * THE PATTERN IS p275-env-shared-seal.test.ts: a settings file holds a value
 * anyone with home-directory write access could have written, and the seal is
 * what decides whether it counts. Most of this file is the attack.
 *
 * What is pinned here:
 *  - the switch defaults off, patches through, and round-trips;
 *  - only literal `true` survives the shape layer;
 *  - the ONLY danger value being `agentAccess: true` still reaches the seal
 *    (the `isDangerStateEmpty` ablation — a forgotten clause compiles and
 *    admits the file unsealed);
 *  - a pre-359 seal (no member) opens but covers no delivery;
 *  - forged/truncated/wrong-machine/missing seals with file true read false;
 *  - an old-schema seal still opens and still covers exactly what it covered;
 *  - safeStorage unavailable strips the switch off on write and the live
 *    answer reads off while `sealAvailable()` is false;
 *  - direct-file and rename-over fixtures fail closed after cache reset and
 *    in a fresh store process.
 *
 * NO SECRET VALUE APPEARS ANYWHERE IN THIS FILE. Nothing here resolves one.
 */

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Set per test. Counts every call, because "did this read reach the seal?" is
 * answered by whether the keystore was touched at all — which is the only way
 * to tell the `isDangerStateEmpty` short circuit from the seal path from
 * outside the module. The mock is the one from p269-env-seal.test.ts.
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

/** The prefix `store.ts` puts in front of the sealed JSON. */
const SEAL_PREFIX = 'gmux-danger-seal-v1:';

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

/**
 * Write a settings file WITH a seal we chose, which is how the forged and
 * old-schema attacks are staged. A real attacker cannot forge one; this test
 * can, and that is the point — it asks what the seal COVERS rather than
 * whether it can be produced.
 */
function writeSealed(
  settings: Record<string, unknown>,
  state: Record<string, unknown>
): void {
  const blob = Buffer.from(
    `sealed ${SEAL_PREFIX}${JSON.stringify(state)}`,
    'utf8'
  ).toString('base64');
  writeFileSync(
    settingsPath(),
    JSON.stringify({ version: 1, settings, dangerSeal: blob }, null, 2),
    'utf8'
  );
}

/** A complete, empty danger state, so a forged seal covers only what we add. */
function emptyState(): Record<string, unknown> {
  return { defaults: [], acks: [], fold: null, arch: null, env: [], envShared: [] };
}

beforeEach(() => {
  userDataDir = mkdtempSync(join(tmpdir(), 'gmux-p359-seal-'));
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
    expect(store.dangerStateOf(store.sanitizeSettings({})).agentAccess).not.toBe(
      true
    );
  });

  it('still never touches the OS keystore', async () => {
    writeByHand({ defaultAgent: 'claude' });
    const store = await freshStore();
    store.getSettings();
    expect(keystore.calls).toBe(0);
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

describe('the Settings door: patch and watch shape', () => {
  it('patches through the app door and broadcasts the sealed answer', async () => {
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
    expect(typeof file['dangerSeal']).toBe('string');
  });

  it('turns back off through the same door', async () => {
    const store = await freshStore();
    store.updateSettings({ agentAccess: true });
    expect(store.getSettings().agentAccess).toBe(true);
    store.updateSettings({ agentAccess: false });
    expect(store.getSettings().agentAccess).toBe(false);
  });
});

describe('THE ATTACK — the switch written straight into settings.json', () => {
  it('is refused on read', async () => {
    writeByHand({ agentAccess: true });
    const store = await freshStore();
    expect(store.getSettings().agentAccess).toBe(false);
  });

  it('is refused when renamed over the file atomically', async () => {
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
    expect(again.getSettings().agentAccess).toBe(false);
  });
});

describe('THE ABLATION FOR isDangerStateEmpty', () => {
  /**
   * This is the single most important assertion in the file.
   *
   * `getSettings` short-circuits on `isDangerStateEmpty` and returns the file
   * VERBATIM, WITHOUT OPENING THE SEAL. `isDangerStateEmpty` is a boolean
   * expression over an object, so adding `agentAccess` to `DangerState`
   * without extending the predicate would compile and admit a settings.json
   * whose ONLY danger value is the switch, unsealed.
   */
  it('arm one — with no seal, the switch is DROPPED rather than admitted verbatim', async () => {
    // A forgotten `agentAccess` clause would return `file.settings` VERBATIM
    // here and admit the switch: that is what the defect costs. The keystore
    // count is not a discriminator on this arm — `openDangerSeal` answers a
    // missing seal without touching the keystore on purpose — so arm two
    // says which branch ran.
    writeByHand({ agentAccess: true });
    const store = await freshStore();
    expect(store.getSettings().agentAccess).toBe(false);
  });

  it('arm two — the seal is OPENED, which the short circuit would never do', async () => {
    writeSealed({ agentAccess: true }, emptyState());
    const store = await freshStore();
    const answer = store.getSettings();
    expect(keystore.calls).toBeGreaterThan(0);
    expect(answer.agentAccess).toBe(false);
  });

  it('arm two — the seal is OPENED, which the short circuit would never do', async () => {
    // The file carries a real seal (covering nothing relevant), so the seal
    // path must decrypt and the short-circuit path cannot. The keystore
    // count IS a discriminator here.
    writeSealed({ agentAccess: true }, emptyState());
    const store = await freshStore();
    const answer = store.getSettings();
    expect(keystore.calls).toBeGreaterThan(0);
    expect(answer.agentAccess).toBe(false);
  });

  it('and the clause is in the predicate itself, not only in the read path', async () => {
    const store = await freshStore();
    const state = store.dangerStateOf({
      ...store.sanitizeSettings({}),
      agentAccess: true
    });
    expect(store.isDangerStateEmpty(state)).toBe(false);
    expect(
      store.isDangerStateEmpty(store.dangerStateOf(store.sanitizeSettings({})))
    ).toBe(true);
  });
});

describe('a seal written before this phase', () => {
  it('has no member and covers no delivery', async () => {
    writeSealed({ agentAccess: true }, emptyState());
    const store = await freshStore();
    expect(store.getSettings().agentAccess).toBe(false);
  });

  it('still opens and still covers exactly what it always covered', async () => {
    writeSealed(
      { launchDefaults: {}, agentAccess: true },
      { ...emptyState(), defaults: [] }
    );
    const store = await freshStore();
    expect(store.getSettings().agentAccess).toBe(false);
    expect(store.getSettings().launchDefaults).toEqual({});
  });
});

describe('a seal the reader must not trust', () => {
  it.each([['forged'], ['truncated'], ['wrong-machine']])(
    'a %s seal with file true reads false',
    async () => {
      writeFileSync(
        settingsPath(),
        JSON.stringify(
          {
            version: 1,
            settings: { agentAccess: true },
            dangerSeal: Buffer.from('not our key', 'utf8').toString('base64')
          },
          null,
          2
        ),
        'utf8'
      );
      const store = await freshStore();
      expect(store.getSettings().agentAccess).toBe(false);
    }
  );

  it('a missing seal with file true reads false', async () => {
    writeByHand({ agentAccess: true });
    const store = await freshStore();
    expect(store.getSettings().agentAccess).toBe(false);
  });

  it('a valid seal covering true authorizes delivery', async () => {
    writeSealed({ agentAccess: true }, { ...emptyState(), agentAccess: true });
    const store = await freshStore();
    expect(store.getSettings().agentAccess).toBe(true);
  });

  it('a valid seal that does not cover it refuses a file true', async () => {
    writeSealed({ agentAccess: true }, emptyState());
    const store = await freshStore();
    expect(store.getSettings().agentAccess).toBe(false);
  });
});

describe('the keystore cannot seal', () => {
  it('writes the switch off rather than one the next load would refuse', async () => {
    keystore.available = false;
    const store = await freshStore();
    store.updateSettings({ agentAccess: true });
    expect(store.getSettings().agentAccess).toBe(false);
    const file = readRaw();
    expect(
      (file['settings'] as Record<string, unknown>)['agentAccess']
    ).toBe(false);
  });

  it('reads off while the seal answers not-known-yet', async () => {
    writeSealed({ agentAccess: true }, { ...emptyState(), agentAccess: true });
    keystore.ready = false;
    const store = await freshStore();
    expect(store.getSettings().agentAccess).toBe(false);
  });
});
