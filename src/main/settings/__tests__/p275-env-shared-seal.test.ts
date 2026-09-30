/**
 * The SHARED shell variable list is sealed in its own field (Phase 275).
 *
 * Phase 269 sealed a per-agent name under a key carrying the agent id, so a
 * confirmed name for `claude` could not reach `codex`. That gave two layers,
 * and this phase moves exactly one of them:
 *
 *  - LAYER ONE DOES NOT MOVE. A name no human confirmed is dropped. That is
 *    refusal 8 in CLAUDE.md — a human confirms the bytes, out of band of any
 *    agent turn — and it holds on the shared list exactly as it holds on a
 *    per-agent one. Most of this file is that layer, attacked.
 *  - LAYER TWO MOVES BY DESIGN. One confirmation now covers every agent Tortie
 *    can launch, including agents installed later. So the shared list needs its
 *    OWN seal field and its own confirmation, and a per-agent agreement must
 *    never be replayable as a shared one, nor the other way round.
 *
 * What is pinned here:
 *  - no shared name is the shipped answer, and a file written before this phase
 *    reads as none;
 *  - a shared name written into settings.json by hand is REFUSED on read, named
 *    in app.log through `envSharedKey`, and reported to the Settings window;
 *  - R-A — a shared name sealed as if it were per-agent is dropped;
 *  - R-B — a per-agent name sealed as if it were shared is dropped;
 *  - THE ABLATION FOR `isDangerStateEmpty` — a settings file whose ONLY danger
 *    value is a shared name still reaches the seal. That one line is the whole
 *    of layer one for this phase: `getSettings` short-circuits on it and returns
 *    the file VERBATIM without opening the seal, and because it is a boolean
 *    expression over an object, a forgotten clause compiles and admits the name
 *    unsealed;
 *  - a seal written before this phase has no `envShared` member and covers no
 *    shared name;
 *  - the sealed blob MOVES when a shared name is added through Tortie's own
 *    door and RETURNS when it is removed;
 *  - the shape layer's own table: the field dropped whole when it is not an
 *    array, one name dropped whole and never repaired, one bad entry never
 *    denying the rest, and a refused entry echoed only when it is safe to draw.
 *
 * NO SECRET VALUE APPEARS ANYWHERE IN THIS FILE. Every name is invented for
 * this test and nothing here resolves one.
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

/** Invented for this test. Nothing on any machine exports either of them. */
const SHARED = 'P275_SHARED_NAME';
const OTHER = 'P275_OTHER_NAME';
const AGENT = 'claude';

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
 * Write a settings file WITH a seal we chose, which is how the two
 * cross-admission attacks are staged. A real attacker cannot forge one; this
 * test can, and that is the point — it asks what the seal COVERS rather than
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

let warnings: string[] = [];

beforeEach(() => {
  userDataDir = mkdtempSync(join(tmpdir(), 'gmux-p275-seal-'));
  keystore.available = true;
  keystore.ready = true;
  keystore.calls = 0;
  warnings = [];
  vi.spyOn(console, 'warn').mockImplementation((...args: unknown[]) => {
    warnings.push(args.map((a) => String(a)).join(' '));
  });
});

afterEach(() => {
  rmSync(userDataDir, { recursive: true, force: true });
  vi.restoreAllMocks();
});

describe('no shared name at all is the shipped answer', () => {
  it('is what a fresh install reads', async () => {
    const store = await freshStore();
    expect(store.getSettings().envPassthroughShared).toEqual([]);
  });

  it('is what a settings file written before this phase reads', async () => {
    writeByHand({ defaultAgent: 'claude', envPassthrough: {} });
    const store = await freshStore();
    expect(store.getSettings().envPassthroughShared).toEqual([]);
  });

  it('still never touches the OS keystore', async () => {
    writeByHand({ defaultAgent: 'claude' });
    const store = await freshStore();
    store.getSettings();
    expect(keystore.calls).toBe(0);
  });
});

describe('THE ATTACK — a shared name written straight into settings.json', () => {
  it('is refused on read', async () => {
    writeByHand({ envPassthroughShared: [SHARED] });
    const store = await freshStore();
    expect(store.getSettings().envPassthroughShared).toEqual([]);
  });

  it('is named in app.log, through the shared spelling', async () => {
    writeByHand({ envPassthroughShared: [SHARED] });
    const store = await freshStore();
    store.getSettings();
    // `* NAME`, so one line can carry both lists and a person can tell which
    // one lost a name.
    expect(warnings.join('\n')).toContain(`* ${SHARED}`);
  });

  it('is reported to the Settings window, on the shared card', async () => {
    writeByHand({ envPassthroughShared: [SHARED, OTHER] });
    const store = await freshStore();
    store.getSettings();
    const rejections = store.envRejectionsNow();
    expect(rejections.shared).toEqual([SHARED, OTHER]);
    expect(rejections.perAgent).toEqual({});
    expect(rejections.unnamed).toBe(0);
  });

  it('cannot be replayed after the person removed it', async () => {
    const first = await freshStore();
    first.updateSettings({ envPassthroughShared: [SHARED] });
    // Through the app's own door, which re-seals without it.
    first.updateSettings({ envPassthroughShared: [] });
    const file = readRaw();
    writeFileSync(
      settingsPath(),
      JSON.stringify(
        {
          ...file,
          settings: {
            ...(file['settings'] as Record<string, unknown>),
            envPassthroughShared: [SHARED]
          }
        },
        null,
        2
      ),
      'utf8'
    );
    const store = await freshStore();
    expect(store.getSettings().envPassthroughShared).toEqual([]);
  });
});

describe('THE ABLATION FOR isDangerStateEmpty — rule 7', () => {
  /**
   * This is the single most important assertion in the file.
   *
   * `getSettings` short-circuits on `isDangerStateEmpty` and returns the file
   * VERBATIM, WITHOUT OPENING THE SEAL. `isDangerStateEmpty` is a boolean
   * expression over an object, so adding `envShared` to `DangerState` without
   * adding a clause here leaves the module COMPILING AND WRONG: a settings.json
   * whose only danger value is a shared name would be admitted unsealed, which
   * is a complete bypass of layer one.
   *
   * TWO ARMS, because neither alone proves it.
   *
   * Arm one is the bypass itself: with no seal on the file at all, a forgotten
   * clause returns `file.settings` VERBATIM and the name is admitted. It says
   * what the defect costs.
   *
   * Arm two says which BRANCH ran, and it needs a seal to exist. The keystore
   * count is not a discriminator on arm one, MEASURED while writing this file:
   * `openDangerSeal` answers a missing seal without touching the keystore on
   * purpose — "a missing seal is a known answer and costs no keychain access" —
   * so a file with no `dangerSeal` reads zero calls down either branch. Arm two
   * gives the file a real seal covering a DIFFERENT shared name, so the seal
   * path must decrypt and the short-circuit path cannot.
   */
  it('arm one — with no seal, the name is DROPPED rather than admitted verbatim', async () => {
    writeByHand({ envPassthroughShared: [SHARED] });
    const store = await freshStore();
    expect(store.getSettings().envPassthroughShared).toEqual([]);
  });

  it('arm two — the seal is OPENED, which the short circuit would never do', async () => {
    writeSealed({ envPassthroughShared: [SHARED] }, {
      ...emptyState(),
      envShared: [OTHER]
    });
    const store = await freshStore();
    const answer = store.getSettings();
    expect(keystore.calls).toBeGreaterThan(0);
    expect(answer.envPassthroughShared).toEqual([]);
  });

  it('and the clause is in the predicate itself, not only in the read path', async () => {
    const store = await freshStore();
    const state = store.dangerStateOf({
      ...store.sanitizeSettings({}),
      envPassthroughShared: [SHARED]
    });
    expect(store.isDangerStateEmpty(state)).toBe(false);
    expect(store.isDangerStateEmpty(store.dangerStateOf(store.sanitizeSettings({})))).toBe(
      true
    );
  });
});

describe('R-A — a shared name sealed as if it were per-agent is dropped', () => {
  /**
   * The seal says `claude P275_SHARED_NAME`. The settings ask for the name on
   * the SHARED list. If the two agreements were interchangeable, one
   * confirmation given for one agent would silently become a confirmation
   * covering every agent — which is exactly the widening this phase exists to
   * make a person ask for out loud.
   */
  it('comes back empty and is reported', async () => {
    writeSealed(
      { envPassthroughShared: [SHARED] },
      { ...emptyState(), env: [`${AGENT} ${SHARED}`] }
    );
    const store = await freshStore();
    expect(store.getSettings().envPassthroughShared).toEqual([]);
    expect(store.envRejectionsNow().shared).toEqual([SHARED]);
    expect(warnings.join('\n')).toContain(`* ${SHARED}`);
  });

  it('is dropped even when the per-agent name it was copied from survives', async () => {
    // The honest half: the agreement that WAS given still holds. Only the
    // widening is refused.
    writeSealed(
      {
        envPassthrough: { [AGENT]: [SHARED] },
        envPassthroughShared: [SHARED]
      },
      { ...emptyState(), env: [`${AGENT} ${SHARED}`] }
    );
    const store = await freshStore();
    const out = store.getSettings();
    expect(out.envPassthrough).toEqual({ [AGENT]: [SHARED] });
    expect(out.envPassthroughShared).toEqual([]);
  });
});

describe('R-B — a per-agent name sealed as if it were shared is dropped', () => {
  it('comes back empty and is reported under its agent', async () => {
    writeSealed(
      { envPassthrough: { [AGENT]: [SHARED] } },
      { ...emptyState(), envShared: [SHARED] }
    );
    const store = await freshStore();
    expect(store.getSettings().envPassthrough).toEqual({});
    expect(store.envRejectionsNow().perAgent).toEqual({ [AGENT]: [SHARED] });
    expect(warnings.join('\n')).toContain(`${AGENT} ${SHARED}`);
  });
});

describe('the two Sets are never consulted for the other kind', () => {
  /**
   * Belt one of the disjointness argument, driven rather than argued. A shared
   * agreement admits ONLY the shared list and a per-agent agreement admits ONLY
   * that agent's list, on every combination.
   */
  it('a shared seal admits the shared list and nothing else', async () => {
    writeSealed(
      {
        envPassthrough: { [AGENT]: [SHARED] },
        envPassthroughShared: [SHARED]
      },
      { ...emptyState(), envShared: [SHARED] }
    );
    const store = await freshStore();
    const out = store.getSettings();
    expect(out.envPassthroughShared).toEqual([SHARED]);
    expect(out.envPassthrough).toEqual({});
  });

  it('and the bare name and the per-agent key are different strings', async () => {
    const shared = await import('@shared/settings');
    // Belt two, textual. `envNameKey` joins with one space and a variable name
    // may not contain one, so every per-agent key holds exactly one space and
    // every bare shared name holds none. `envSharedKey` is the DISPLAY form and
    // begins with `*`, which no agent id can, because every launchable id
    // begins with a lowercase letter.
    expect(shared.envNameKey(AGENT, SHARED)).toBe(`${AGENT} ${SHARED}`);
    expect(shared.envNameKey(AGENT, SHARED)).not.toBe(SHARED);
    expect(shared.envSharedKey(SHARED)).not.toBe(shared.envNameKey(AGENT, SHARED));
    expect(SHARED.includes(' ')).toBe(false);
  });
});

describe("the same name through Tortie's own door", () => {
  it('survives a restart', async () => {
    const first = await freshStore();
    expect(first.updateSettings({ envPassthroughShared: [SHARED] })
      .envPassthroughShared).toEqual([SHARED]);
    const second = await freshStore();
    expect(second.getSettings().envPassthroughShared).toEqual([SHARED]);
  });

  it('moves the sealed blob when it is added, and returns it when removed', async () => {
    // A per-agent name is kept on throughout, so a seal exists in every state
    // and the comparison is about the SHARED half rather than about the seal
    // appearing and disappearing.
    const store = await freshStore();
    store.updateSettings({ envPassthrough: { [AGENT]: [OTHER] } });
    const before = readRaw()['dangerSeal'];
    store.updateSettings({ envPassthroughShared: [SHARED] });
    const withShared = readRaw()['dangerSeal'];
    expect(withShared).not.toBe(before);
    store.updateSettings({ envPassthroughShared: [] });
    expect(readRaw()['dangerSeal']).toBe(before);
  });

  it('seals to one text whatever order the names were written in', async () => {
    const store = await freshStore();
    store.updateSettings({ envPassthroughShared: [SHARED, OTHER] });
    const first = readRaw()['dangerSeal'];
    store.updateSettings({ envPassthroughShared: [OTHER, SHARED] });
    expect(readRaw()['dangerSeal']).toBe(first);
  });

  it('clears the rejection report, because the file no longer says it', async () => {
    writeByHand({ envPassthroughShared: [SHARED] });
    const store = await freshStore();
    store.getSettings();
    expect(store.envRejectionsNow().shared).toEqual([SHARED]);
    store.updateSettings({ envPassthroughShared: [OTHER] });
    expect(store.envRejectionsNow().shared).toEqual([]);
  });
});

describe('a seal written before this phase', () => {
  it('has no envShared member and covers no shared name', async () => {
    writeSealed({ envPassthroughShared: [SHARED] }, {
      defaults: [],
      acks: [],
      fold: null,
      arch: null,
      env: []
    });
    const store = await freshStore();
    expect(store.getSettings().envPassthroughShared).toEqual([]);
  });

  it('still covers exactly what it always covered', async () => {
    writeSealed({ envPassthrough: { [AGENT]: [OTHER] } }, {
      defaults: [],
      acks: [],
      fold: null,
      arch: null,
      env: [`${AGENT} ${OTHER}`]
    });
    const store = await freshStore();
    expect(store.getSettings().envPassthrough).toEqual({ [AGENT]: [OTHER] });
  });
});

describe('the keystore cannot seal', () => {
  it('writes no shared name rather than one the next load would refuse', async () => {
    const store = await freshStore();
    keystore.available = false;
    store.updateSettings({ envPassthroughShared: [SHARED] });
    expect(
      (readRaw()['settings'] as Record<string, unknown>)['envPassthroughShared']
    ).toEqual([]);
    expect(readRaw()['dangerSeal']).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// The shape layer, which runs BEFORE the seal and cannot tell who wrote the
// file. It bounds what a value may BE; the seal above bounds who said it.
// ---------------------------------------------------------------------------

describe('sanitizeEnvPassthroughShared — the shape table', () => {
  /**
   * The compiled `launch.env` keys the shared list refuses, today three
   * (Phase 331 added Claude Code's inline switch).
   */
  const REFUSED_COMPILED = [
    'CLAUDE_CODE_DISABLE_ALTERNATE_SCREEN',
    'FORCE_COLOR',
    'GROK_PRIVACY_NOTICE_ROLLOUT'
  ];

  it('drops the whole FIELD when it is not an array', async () => {
    const { sanitizeEnvPassthroughShared } = await import('@shared/settings');
    for (const bad of [null, undefined, 7, 'NAME', { 0: 'NAME' }, true]) {
      expect(sanitizeEnvPassthroughShared(bad, []), JSON.stringify(bad)).toEqual({
        names: [],
        refused: [],
        refusedOver: 0,
        unnamed: 0
      });
    }
  });

  it('never throws, on anything', async () => {
    const { sanitizeEnvPassthroughShared } = await import('@shared/settings');
    const hostile: unknown[] = [
      [Symbol('x')],
      [{ toString: () => { throw new Error('no'); } }],
      [[], {}, null, undefined, NaN, Infinity]
    ];
    for (const raw of hostile) {
      expect(() => sanitizeEnvPassthroughShared(raw, [])).not.toThrow();
    }
  });

  it('drops one NAME whole and repairs nothing', async () => {
    const { sanitizeEnvPassthroughShared } = await import('@shared/settings');
    // Not trimmed, not case-folded, not truncated into shape. A name with a
    // leading space is refused rather than made acceptable.
    const out = sanitizeEnvPassthroughShared([` ${SHARED}`, SHARED], []);
    expect(out.names).toEqual([SHARED]);
    expect(out.refused).toEqual([]);
    expect(out.unnamed).toBe(1);
  });

  it('lets one bad entry deny nothing else', async () => {
    const { sanitizeEnvPassthroughShared } = await import('@shared/settings');
    // Dropping the whole list because one entry is junk is a denial any agent
    // with write access could author in one line, and it would take away every
    // key a person set.
    const out = sanitizeEnvPassthroughShared(
      [7, SHARED, 'PATH', OTHER, null],
      []
    );
    expect(out.names).toEqual([SHARED, OTHER]);
    expect(out.refused).toEqual(['PATH']);
    expect(out.unnamed).toBe(2);
  });

  it('echoes a refused entry only when it is safe to draw', async () => {
    const { sanitizeEnvPassthroughShared } = await import('@shared/settings');
    // The difference between "never silently dropped" and "hand an attacker a
    // rendering primitive". A 4 KB blob, a newline and a tag are COUNTED and
    // never echoed; a well-formed but refused name is named.
    const out = sanitizeEnvPassthroughShared(
      ['PATH', 'A'.repeat(4096), 'NAME\n', '<img src=x onerror=1>', '1BAD'],
      []
    );
    expect(out.names).toEqual([]);
    expect(out.refused).toEqual(['PATH']);
    expect(out.unnamed).toBe(4);
  });

  it('refuses a name a launchable agent compiles in, because the list reaches it', async () => {
    const { sanitizeEnvPassthroughShared } = await import('@shared/settings');
    // A shared FORCE_COLOR would make the env-unresolved notice say a cursor
    // pane started WITHOUT a variable that pane actually has.
    const out = sanitizeEnvPassthroughShared(
      [...REFUSED_COMPILED, SHARED],
      REFUSED_COMPILED
    );
    expect(out.names).toEqual([SHARED]);
    expect(out.refused).toEqual(REFUSED_COMPILED);
  });

  it('caps the list at sixteen, separately from every agent list', async () => {
    const { sanitizeEnvPassthroughShared } = await import('@shared/settings');
    const many = Array.from({ length: 17 }, (_v, i) => `P275_N${i}`);
    const out = sanitizeEnvPassthroughShared(many, []);
    expect(out.names).toEqual(many.slice(0, 16));
    expect(out.refused).toEqual([many[16]]);
  });

  it('is wired into sanitizeSettings, and the per-agent list keeps its own sixteen', async () => {
    const store = await freshStore();
    const many = Array.from({ length: 16 }, (_v, i) => `P275_N${i}`);
    const out = store.sanitizeSettings({
      envPassthroughShared: many,
      envPassthrough: { [AGENT]: many }
    });
    // Two caps, one number. A full shared list does not shrink what an agent
    // may add on its own card.
    expect(out.envPassthroughShared).toHaveLength(16);
    expect(out.envPassthrough[AGENT]).toHaveLength(16);
  });

  it('reports the unnamed count to the Settings window', async () => {
    writeByHand({ envPassthroughShared: [7, 'NAME\n', SHARED] });
    const store = await freshStore();
    store.getSettings();
    const rejections = store.envRejectionsNow();
    expect(rejections.unnamed).toBe(2);
    // The one well-formed name reached the seal and was dropped there.
    expect(rejections.shared).toEqual([SHARED]);
  });
});

describe('the shared refusal set is spelled once', () => {
  it('is the union of every launchable agent compiled launch.env key', async () => {
    const store = await freshStore();
    const { LAUNCHABLE_AGENT_IDS, compiledLaunchEnvKeys } = await import(
      '../../agents/registry'
    );
    // No vacuous pass: a registry with no launchable rows would make every
    // per-id assertion below true for free.
    expect(LAUNCHABLE_AGENT_IDS.length).toBeGreaterThan(0);
    const expected = new Set<string>();
    for (const id of LAUNCHABLE_AGENT_IDS) {
      for (const key of compiledLaunchEnvKeys(id)) expected.add(key);
    }
    expect([...store.sharedRefusedEnvKeys()].sort()).toEqual(
      [...expected].sort()
    );
  });
});

/**
 * THE FIX ROUND — the two layers are two answers, and the window says which.
 *
 * Both of these were found by the phase's own verifiers, independently, one in
 * a hand-written harness against this module and one by hand-writing a real
 * sealed settings.json and reading what the running Settings window drew. The
 * build they attacked concatenated the shape layer's drops and the seal
 * layer's into one list and drew the SEAL's sentence over all of it.
 *
 * NEITHER WAS A SAFETY DEFECT and that is why both are here rather than in the
 * seal section above: the name was dropped, the cap still failed closed, no
 * value moved, and layer one did not budge on any reading. It is the reporting
 * half — the surface whose entire purpose is to say honestly why a key stopped
 * arriving — and it was saying something untrue about the one name a person
 * would come to it about.
 */
describe('THE FIX ROUND — the shape layer and the seal layer are told apart', () => {
  it('reports a SEAL drop on `shared` and a SHAPE drop on `sharedUnread`', async () => {
    // PATH is refused by `envPassthroughRefusal` — the shape layer. SHARED is
    // well formed and unconfirmed — the seal.
    writeByHand({ envPassthroughShared: ['PATH', SHARED] });
    const store = await freshStore();
    store.getSettings();
    const r = store.envRejectionsNow();
    expect(r.shared).toEqual([SHARED]);
    expect(r.sharedUnread).toEqual(['PATH']);
    expect(r.sharedUnreadOver).toBe(0);
  });

  /**
   * THE READING THAT BLOCKED THE PHASE. Sixteen shape-valid junk names ahead of
   * a name the seal DOES cover push the real name out at the SHAPE layer,
   * because the cap counts kept-so-far in FILE ORDER. The verified build then
   * drew that name FIRST, under "they were not added here". It had been added
   * here — it is in the seal.
   *
   * PHASE 278 REMOVED THE LIMIT THIS TEST USED TO PIN, and the test moved with
   * it rather than being deleted. It asserted the displacement as the expected
   * state — `envPassthroughShared` reading `[]`, the confirmed name on the
   * SHAPE list — because Phase 275 shipped the reporting half and recorded the
   * order as a limit. Phase 278 (audit F3, the cap half) recomputes the list
   * from the file's own entries in the file's own order once the seal is open,
   * keeping only what the seal covers, so the junk no longer spends the cap the
   * confirmed name needs. The title's promise is unchanged and is still
   * asserted: the name is never drawn as "not added here". What changed is the
   * stronger half: it is now DELIVERED, and it is on no drop list because
   * nothing dropped it. The sixteen unconfirmed names are still refused by the
   * seal, which is the half that may never move.
   */
  it('never tells a person a name they DID confirm was not added here', async () => {
    const junk = Array.from({ length: 16 }, (_v, i) => `P275_JUNK_${String(i)}`);
    writeSealed(
      { envPassthroughShared: [...junk, SHARED] },
      { ...emptyState(), envShared: [SHARED] }
    );
    const store = await freshStore();
    // The confirmed name survives the junk ahead of it.
    expect(store.getSettings().envPassthroughShared).toEqual([SHARED]);
    const r = store.envRejectionsNow();
    // It was not dropped, so it is on neither drop list.
    expect(r.sharedUnread).toEqual([]);
    expect(r.sharedUnreadOver).toBe(0);
    expect(r.shared).not.toContain(SHARED);
    // And a delivered name is never also counted as missing (the fix round).
    expect(r.sharedMissing).toBe(0);
    // And every unconfirmed name is still refused by the seal.
    expect(r.shared).toEqual(junk);
  });

  /**
   * THE SECOND BLOCKING READING. The shape half runs over the RAW file, so its
   * length is chosen by whoever wrote the file — the exact actor layer one of
   * the seal exists to refuse. A verifier measured the verified build turning
   * 200,000 hand-written names into a 12,088,932-byte paragraph in one `<p>`.
   */
  it('echoes at most sixteen shape drops and counts the rest', async () => {
    const flood = Array.from({ length: 200 }, (_v, i) => `P275_FLOOD_${String(i)}`);
    writeByHand({ envPassthroughShared: flood });
    const store = await freshStore();
    store.getSettings();
    const r = store.envRejectionsNow();
    // Sixteen kept by the cap and then dropped by the seal; 184 refused at the
    // shape layer, of which sixteen may be echoed.
    expect(r.shared).toHaveLength(16);
    expect(r.sharedUnread).toHaveLength(16);
    expect(r.sharedUnreadOver).toBe(168);
    expect(r.sharedUnread.length + r.sharedUnreadOver).toBe(184);
    // Nothing unsafe was ever the risk here; the SIZE was. Bound it.
    expect(r.sharedUnread.join(', ').length).toBeLessThan(600);
  });

  it('the shape half is bounded at the sanitizer, not at the face', async () => {
    const { sanitizeEnvPassthroughShared } = await import('@shared/settings');
    const flood = Array.from({ length: 5_000 }, (_v, i) => `P275_F${String(i)}`);
    const out = sanitizeEnvPassthroughShared(flood, []);
    expect(out.names).toHaveLength(16);
    expect(out.refused).toHaveLength(16);
    expect(out.refusedOver).toBe(4_968);
    expect(out.unnamed).toBe(0);
    // The two channels are disjoint: every entry is counted exactly once.
    expect(out.names.length + out.refused.length + out.refusedOver).toBe(5_000);
  });

  it('a clean file reports neither half', async () => {
    const store = await freshStore();
    store.getSettings();
    const r = store.envRejectionsNow();
    expect(r.shared).toEqual([]);
    expect(r.sharedUnread).toEqual([]);
    expect(r.sharedUnreadOver).toBe(0);
    expect(r.unnamed).toBe(0);
  });
});
