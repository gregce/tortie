/**
 * The fold choice is sealed (Phase 138).
 *
 * The hole this file keeps closed is CLAUDE.md refusal 8: nothing may cause a
 * process to start on a configuration change alone, and a human confirms the
 * bytes out of band of any agent turn. The fold SPAWNS A PROCESS, and
 * `settings.json` is plain JSON in the home directory that every agent Tortie
 * runs can write. So a `fold` key an agent put in the file must be dropped
 * before the value leaves the module, and the same value written by Tortie
 * itself must survive a restart.
 *
 * What is pinned here:
 *  - None is the shipped answer, and a file with no `fold` key loads as None;
 *  - a fold choice written into the file by hand is not applied;
 *  - the same choice written by Tortie survives a restart;
 *  - an unknown agent, or a model no recipe exposes, drops the WHOLE object;
 *  - a settings file with no fold choice and no danger flag never reaches the
 *    keystore;
 *  - a seal written before this phase still opens and still covers what it
 *    always covered.
 */

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
      return Buffer.from(`sealed|${text}`, 'utf8');
    },
    decryptString: (buf: Buffer): string => {
      keystore.calls += 1;
      const text = buf.toString('utf8');
      if (!text.startsWith('sealed|')) throw new Error('not our key');
      return text.slice('sealed|'.length);
    }
  }
}));

const AGENT = 'claude';
const MODEL = 'claude-haiku-4-5-20251001';

type Store = typeof import('../store');

async function freshStore(): Promise<Store> {
  vi.resetModules();
  return import('../store');
}

function settingsPath(): string {
  return join(userDataDir, 'settings.json');
}

/** Write a settings file the way a hostile agent would: JSON, and no seal. */
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
  userDataDir = mkdtempSync(join(tmpdir(), 'gmux-fold-seal-'));
  keystore.available = true;
  keystore.ready = true;
  keystore.calls = 0;
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  rmSync(userDataDir, { recursive: true, force: true });
  vi.restoreAllMocks();
});

describe('None is the shipped answer, and it must stay valid', () => {
  it('is what a fresh install reads', async () => {
    const store = await freshStore();
    expect(store.getSettings().fold).toEqual({ agentId: null, model: null });
  });

  it('is what a settings file written before this phase reads', async () => {
    writeByHand({ defaultAgent: 'claude', scrollbackLines: 25_000 });
    const store = await freshStore();
    expect(store.getSettings().fold).toEqual({ agentId: null, model: null });
  });

  it('costs no keystore access at all', async () => {
    writeByHand({ defaultAgent: 'claude' });
    const store = await freshStore();
    store.getSettings();
    expect(keystore.calls).toBe(0);
  });
});

describe('sanitizeFoldSettings drops an invalid value WHOLE', () => {
  it.each([
    ['nothing at all', undefined],
    ['a string', 'claude'],
    ['an agent with no model', { agentId: AGENT }],
    ['a model with no agent', { model: MODEL }],
    ['an unknown agent', { agentId: 'nonesuch', model: MODEL }],
    ['an agent with no measured recipe', { agentId: 'codex', model: MODEL }],
    ['a model the recipe does not expose', { agentId: AGENT, model: 'gpt' }],
    ['a non string agent', { agentId: 7, model: MODEL }]
  ])('drops %s', async (_what, raw) => {
    const store = await freshStore();
    expect(store.sanitizeFoldSettings(raw)).toEqual({
      agentId: null,
      model: null
    });
  });

  it('keeps a pair the compiled recipe table has', async () => {
    const store = await freshStore();
    expect(store.sanitizeFoldSettings({ agentId: AGENT, model: MODEL })).toEqual({
      agentId: AGENT,
      model: MODEL
    });
  });
});

describe('the seal', () => {
  it('drops a fold choice an agent wrote by hand', async () => {
    writeByHand({ fold: { agentId: AGENT, model: MODEL } });
    const store = await freshStore();
    expect(store.getSettings().fold).toEqual({ agentId: null, model: null });
  });

  it('keeps a fold choice Tortie wrote, across a restart', async () => {
    const first = await freshStore();
    first.updateSettings({ fold: { agentId: AGENT, model: MODEL } });
    expect(readRaw()['dangerSeal']).toBeTypeOf('string');
    const second = await freshStore();
    expect(second.getSettings().fold).toEqual({ agentId: AGENT, model: MODEL });
  });

  it('drops the choice when the seal names a different pair', async () => {
    const first = await freshStore();
    first.updateSettings({ fold: { agentId: AGENT, model: MODEL } });
    // Swap the model under the seal, which is what an agent editing the file
    // would leave behind.
    const raw = readRaw();
    const settings = raw['settings'] as Record<string, unknown>;
    settings['fold'] = { agentId: AGENT, model: 'sonnet' };
    writeFileSync(settingsPath(), JSON.stringify(raw, null, 2), 'utf8');
    const second = await freshStore();
    expect(second.getSettings().fold).toEqual({ agentId: null, model: null });
  });

  it('reports a dropped fold choice, so Settings can say one sentence', async () => {
    const store = await freshStore();
    const settings = store.sanitizeSettings({
      fold: { agentId: AGENT, model: MODEL }
    });
    const out = store.withSealedDangerState(settings, {
      defaults: [],
      acks: [],
      fold: null
    });
    expect(out.settings.fold).toEqual({ agentId: null, model: null });
    expect(out.rejected).toEqual([`${AGENT} ${MODEL}`]);
  });

  it('does not touch a fold choice the seal covers', async () => {
    const store = await freshStore();
    const settings = store.sanitizeSettings({
      fold: { agentId: AGENT, model: MODEL }
    });
    const out = store.withSealedDangerState(settings, {
      defaults: [],
      acks: [],
      fold: `${AGENT} ${MODEL}`
    });
    expect(out.settings.fold).toEqual({ agentId: AGENT, model: MODEL });
    expect(out.rejected).toEqual([]);
  });

  it('drops the choice when the keystore cannot be read', async () => {
    const first = await freshStore();
    first.updateSettings({ fold: { agentId: AGENT, model: MODEL } });
    keystore.available = false;
    const second = await freshStore();
    expect(second.getSettings().fold).toEqual({ agentId: null, model: null });
  });

  it('leaves an old seal covering exactly what it always covered', async () => {
    const store = await freshStore();
    // A seal written before this phase has no `fold` member at all.
    const state = { defaults: ['claude --dangerously-skip-permissions'], acks: [] };
    const blob = Buffer.from(
      `sealed|gmux-danger-seal-v1:${JSON.stringify(state)}`,
      'utf8'
    ).toString('base64');
    writeFileSync(
      settingsPath(),
      JSON.stringify(
        {
          version: 1,
          settings: {
            launchDefaults: { claude: ['--dangerously-skip-permissions'] }
          },
          dangerSeal: blob
        },
        null,
        2
      ),
      'utf8'
    );
    const reloaded = await freshStore();
    const out = reloaded.getSettings();
    expect(out.launchDefaults.claude).toEqual([
      '--dangerously-skip-permissions'
    ]);
    expect(out.fold).toEqual({ agentId: null, model: null });
    expect(store).toBeDefined();
  });
});

describe('dangerStateOf', () => {
  it('carries the fold pair when one is chosen', async () => {
    const store = await freshStore();
    const settings = store.sanitizeSettings({
      fold: { agentId: AGENT, model: MODEL }
    });
    expect(store.dangerStateOf(settings).fold).toBe(`${AGENT} ${MODEL}`);
    expect(store.isDangerStateEmpty(store.dangerStateOf(settings))).toBe(false);
  });

  it('is empty for a file with no fold choice and no danger flag', async () => {
    const store = await freshStore();
    const state = store.dangerStateOf(store.sanitizeSettings({}));
    expect(state.fold).toBeNull();
    expect(store.isDangerStateEmpty(state)).toBe(true);
  });
});
