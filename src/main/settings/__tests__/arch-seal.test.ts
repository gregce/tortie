/**
 * The arch enrichment choice is sealed (Phase 158).
 *
 * The hole this file keeps closed is the same one fold-seal.test.ts closes,
 * being CLAUDE.md refusal 8: the arch pass SPAWNS A PROCESS, and
 * `settings.json` is plain JSON in the home directory that every agent
 * Tortie runs can write. So an `arch` key an agent put in the file must be
 * dropped before the value leaves the module, and the same value written by
 * Tortie itself must survive a restart.
 *
 * What is pinned here, beyond the fold's own pins:
 *  - None is the shipped answer, and a file with no `arch` key loads as None;
 *  - an arch choice written into the file by hand is not applied;
 *  - the same choice written by Tortie survives a restart;
 *  - an unknown agent, or a model no ARCH recipe exposes, drops the WHOLE
 *    object, and a model only a FOLD recipe exposes counts as unknown;
 *  - A SEALED FOLD CHOICE NEVER COVERS AN ARCH CHOICE. An agent that copies
 *    the person's own fold pair into the `arch` key gets None back, because
 *    the two choices live in separate seal fields;
 *  - a seal written before this phase still opens, and answers None for arch.
 *
 * The recipe module is mocked, because the compiled arch recipe table is
 * measured by hand in its own file and this file holds the SEAL, not the
 * table. The fold lookup answers a different model list than the arch
 * lookup on purpose: that difference is what the cross replay tests bite on.
 */

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const keystore = { available: true, ready: true };
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
    isEncryptionAvailable: (): boolean => keystore.available,
    encryptString: (text: string): Buffer =>
      Buffer.from(`sealed|${text}`, 'utf8'),
    decryptString: (buf: Buffer): string => {
      const text = buf.toString('utf8');
      if (!text.startsWith('sealed|')) throw new Error('not our key');
      return text.slice('sealed|'.length);
    }
  }
}));

/**
 * The recipe tables, hand built. `claude` carries both a fold recipe and an
 * arch recipe, with DISJOINT model lists, so a pair valid on one surface is
 * invalid on the other and a cross write cannot pass membership by luck.
 * `pi` carries a fold recipe only, which is the shipped shape for an agent
 * nobody has measured an arch row for.
 */
vi.mock('../../overview/fold/recipes', () => {
  const recipe = (models: string[]): Record<string, unknown> => ({
    agentId: 'claude',
    version: 1,
    measuredOn: '2026-08-28',
    models: models.map((id) => ({ id, label: id })),
    suggestedModel: models[0]
  });
  return {
    foldRecipeFor: (agentId: string) =>
      agentId === 'claude' || agentId === 'pi'
        ? recipe(['fold-model'])
        : null,
    archRecipeFor: (agentId: string) =>
      agentId === 'claude' ? recipe(['arch-model']) : null,
    recipeHasModel: (
      r: { models: { id: string }[] },
      model: string
    ): boolean => r.models.some((m) => m.id === model)
  };
});

const AGENT = 'claude';
const MODEL = 'arch-model';

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
  userDataDir = mkdtempSync(join(tmpdir(), 'gmux-arch-seal-'));
  keystore.available = true;
  keystore.ready = true;
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  rmSync(userDataDir, { recursive: true, force: true });
  vi.restoreAllMocks();
});

describe('None is the shipped answer, and it must stay valid', () => {
  it('is what a fresh install reads', async () => {
    const store = await freshStore();
    expect(store.getSettings().arch).toEqual({
      enabled: false,
      agentId: null,
      model: null
    });
  });

  it('is what a settings file written before this phase reads', async () => {
    writeByHand({ defaultAgent: 'claude', scrollbackLines: 25_000 });
    const store = await freshStore();
    expect(store.getSettings().arch).toEqual({
      enabled: false,
      agentId: null,
      model: null
    });
  });
});

describe('sanitizeArchSettings drops an invalid value WHOLE', () => {
  it.each([
    ['nothing at all', undefined],
    ['a string', 'claude'],
    ['an agent with no model', { agentId: AGENT }],
    ['a model with no agent', { model: MODEL }],
    ['an unknown agent', { agentId: 'nonesuch', model: MODEL }],
    ['an agent with a fold recipe but no arch recipe', { agentId: 'pi', model: 'fold-model' }],
    ['a model only the FOLD recipe exposes', { agentId: AGENT, model: 'fold-model' }],
    ['a model no recipe exposes', { agentId: AGENT, model: 'gpt' }],
    ['a non string agent', { agentId: 7, model: MODEL }]
  ])('drops %s', async (_what, raw) => {
    const store = await freshStore();
    expect(store.sanitizeArchSettings(raw)).toEqual({
      enabled: false,
      agentId: null,
      model: null
    });
  });

  it('keeps a pair the compiled arch recipe table has', async () => {
    const store = await freshStore();
    expect(store.sanitizeArchSettings({ agentId: AGENT, model: MODEL })).toEqual(
      { enabled: false, agentId: AGENT, model: MODEL }
    );
  });
});

describe('the seal', () => {
  it('drops an arch choice an agent wrote by hand', async () => {
    writeByHand({ arch: { agentId: AGENT, model: MODEL } });
    const store = await freshStore();
    expect(store.getSettings().arch).toEqual({
      enabled: false,
      agentId: null,
      model: null
    });
  });

  it('keeps an arch choice Tortie wrote, across a restart', async () => {
    const first = await freshStore();
    first.updateSettings({
      arch: { enabled: false, agentId: AGENT, model: MODEL }
    });
    expect(readRaw()['dangerSeal']).toBeTypeOf('string');
    const second = await freshStore();
    expect(second.getSettings().arch).toEqual({
      enabled: false,
      agentId: AGENT,
      model: MODEL
    });
  });

  it('drops the choice when the seal names a different pair', async () => {
    const first = await freshStore();
    first.updateSettings({
      arch: { enabled: false, agentId: AGENT, model: MODEL }
    });
    const raw = readRaw();
    const settings = raw['settings'] as Record<string, unknown>;
    settings['arch'] = { agentId: AGENT, model: 'arch-model-two' };
    writeFileSync(settingsPath(), JSON.stringify(raw, null, 2), 'utf8');
    const second = await freshStore();
    expect(second.getSettings().arch).toEqual({
      enabled: false,
      agentId: null,
      model: null
    });
  });

  it('reports a dropped arch choice, so Settings can say one sentence', async () => {
    const store = await freshStore();
    const settings = store.sanitizeSettings({
      arch: { enabled: false, agentId: AGENT, model: MODEL }
    });
    const out = store.withSealedDangerState(settings, {
      defaults: [],
      acks: [],
      fold: null,
      arch: null
    });
    expect(out.settings.arch).toEqual({
      enabled: false,
      agentId: null,
      model: null
    });
    expect(out.rejected).toEqual([`${AGENT} ${MODEL}`]);
  });

  it('does not touch an arch choice the seal covers', async () => {
    const store = await freshStore();
    const settings = store.sanitizeSettings({
      arch: { enabled: false, agentId: AGENT, model: MODEL }
    });
    const out = store.withSealedDangerState(settings, {
      defaults: [],
      acks: [],
      fold: null,
      arch: `${AGENT} ${MODEL}`
    });
    expect(out.settings.arch).toEqual({ enabled: false, agentId: AGENT, model: MODEL });
    expect(out.rejected).toEqual([]);
  });

  it('drops the choice when the keystore cannot be read', async () => {
    const first = await freshStore();
    first.updateSettings({
      arch: { enabled: false, agentId: AGENT, model: MODEL }
    });
    keystore.available = false;
    const second = await freshStore();
    expect(second.getSettings().arch).toEqual({
      enabled: false,
      agentId: null,
      model: null
    });
  });

  it('answers None for arch from a seal written before this phase', async () => {
    // A pre Phase 158 seal has a `fold` member and no `arch` member at all.
    const state = { defaults: [], acks: [], fold: 'claude fold-model' };
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
            fold: { agentId: 'claude', model: 'fold-model' },
            arch: { enabled: false, agentId: AGENT, model: MODEL }
          },
          dangerSeal: blob
        },
        null,
        2
      ),
      'utf8'
    );
    const store = await freshStore();
    const out = store.getSettings();
    expect(out.fold).toEqual({ agentId: 'claude', model: 'fold-model' });
    expect(out.arch).toEqual({ enabled: false, agentId: null, model: null });
  });
});

describe('a fold agreement is not an arch agreement', () => {
  it('drops an arch pair the FOLD seal field covers', async () => {
    // The person chose a fold harness in Tortie, so the seal covers the pair
    // under `fold`. An agent then copies that same pair into `arch` by hand.
    // Membership would even pass if the model lists overlapped. The seal must
    // still answer None, because the `arch` field of the seal is null.
    const store = await freshStore();
    const settings = store.sanitizeSettings({
      arch: { enabled: false, agentId: AGENT, model: MODEL }
    });
    const out = store.withSealedDangerState(settings, {
      defaults: [],
      acks: [],
      fold: `${AGENT} ${MODEL}`,
      arch: null
    });
    expect(out.settings.arch).toEqual({
      enabled: false,
      agentId: null,
      model: null
    });
    expect(out.rejected).toEqual([`${AGENT} ${MODEL}`]);
  });

  it('drops a fold pair the ARCH seal field covers', async () => {
    const store = await freshStore();
    const settings = store.sanitizeSettings({
      fold: { agentId: AGENT, model: 'fold-model' }
    });
    const out = store.withSealedDangerState(settings, {
      defaults: [],
      acks: [],
      fold: null,
      arch: `${AGENT} fold-model`
    });
    expect(out.settings.fold).toEqual({ agentId: null, model: null });
  });

  it('keeps both choices when each seal field covers its own', async () => {
    const first = await freshStore();
    first.updateSettings({
      fold: { agentId: AGENT, model: 'fold-model' },
      arch: { enabled: false, agentId: AGENT, model: MODEL }
    });
    const second = await freshStore();
    const out = second.getSettings();
    expect(out.fold).toEqual({ agentId: AGENT, model: 'fold-model' });
    expect(out.arch).toEqual({ enabled: false, agentId: AGENT, model: MODEL });
  });
});

/**
 * PHASE 175. The visibility switch is a SECOND field on the same key, and
 * everything below is about keeping the two apart: `enabled` decides what is
 * drawn and starts nothing, the pair decides that a program runs. So the
 * switch is not sealed, an invalid pair never turns the surface off behind
 * the person's back, and a file written before this phase reads off, which
 * is why no migration was needed.
 */
describe('the visibility switch (Phase 175)', () => {
  it('is OFF on a fresh install', async () => {
    const store = await freshStore();
    expect(store.getSettings().arch.enabled).toBe(false);
  });

  it('is OFF in a settings file written before the field existed', async () => {
    writeByHand({ arch: { agentId: AGENT, model: MODEL } });
    const store = await freshStore();
    expect(store.getSettings().arch.enabled).toBe(false);
  });

  it('reads ON only from a literal true', async () => {
    const store = await freshStore();
    for (const raw of ['true', 1, {}, [], null, undefined]) {
      expect(
        store.sanitizeArchSettings({ enabled: raw, agentId: AGENT, model: MODEL })
          .enabled,
        `${JSON.stringify(raw)} read as on`
      ).toBe(false);
    }
    expect(
      store.sanitizeArchSettings({ enabled: true, agentId: AGENT, model: MODEL })
        .enabled
    ).toBe(true);
  });

  it('survives a pair the recipe table refuses, dropped whole', async () => {
    const store = await freshStore();
    expect(
      store.sanitizeArchSettings({
        enabled: true,
        agentId: 'nonesuch',
        model: MODEL
      })
    ).toEqual({ enabled: true, agentId: null, model: null });
  });

  it('survives the SEAL dropping the pair, because it starts nothing', async () => {
    const store = await freshStore();
    const settings = store.sanitizeSettings({
      arch: { enabled: true, agentId: AGENT, model: MODEL }
    });
    const out = store.withSealedDangerState(settings, {
      defaults: [],
      acks: [],
      fold: null,
      arch: null
    });
    expect(out.settings.arch).toEqual({
      enabled: true,
      agentId: null,
      model: null
    });
    expect(out.rejected).toEqual([`${AGENT} ${MODEL}`]);
  });

  it('is no part of the sealed key, so flipping it seals nothing new', async () => {
    const store = await freshStore();
    const off = store.sanitizeSettings({
      arch: { enabled: false, agentId: AGENT, model: MODEL }
    });
    const on = store.sanitizeSettings({
      arch: { enabled: true, agentId: AGENT, model: MODEL }
    });
    expect(store.dangerStateOf(on).arch).toBe(store.dangerStateOf(off).arch);
  });

  it('persists across a restart, on its own, with the pair at None', async () => {
    const first = await freshStore();
    first.updateSettings({
      arch: { enabled: true, agentId: null, model: null }
    });
    const second = await freshStore();
    expect(second.getSettings().arch).toEqual({
      enabled: true,
      agentId: null,
      model: null
    });
  });
});

describe('dangerStateOf', () => {
  it('carries the arch pair when one is chosen', async () => {
    const store = await freshStore();
    const settings = store.sanitizeSettings({
      arch: { enabled: false, agentId: AGENT, model: MODEL }
    });
    expect(store.dangerStateOf(settings).arch).toBe(`${AGENT} ${MODEL}`);
    expect(store.isDangerStateEmpty(store.dangerStateOf(settings))).toBe(false);
  });

  it('is empty for a file with no arch choice and no danger flag', async () => {
    const store = await freshStore();
    const state = store.dangerStateOf(store.sanitizeSettings({}));
    expect(state.arch).toBeNull();
    expect(store.isDangerStateEmpty(state)).toBe(true);
  });
});
