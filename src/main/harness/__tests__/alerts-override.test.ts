/**
 * Phase 316.5 — the alerts' harness override (build/p3165/SPEC.md §5.2.4): the
 * push seam's four refusals read through the push seam's own function, then
 * the origins and the key file, each refusing the WHOLE file.
 *
 * EACH REFUSAL HAS ITS OWN ROW, and each row is the one that goes red if that
 * clause is deleted: an environment and a file that pass every OTHER refusal
 * and fail exactly one. The honest row beside them is what keeps a table of
 * nulls from passing against a function that refuses everything.
 *
 * NOTHING HERE DIALS, BINDS OR SPAWNS. The override is read from a temporary
 * directory this file makes and removes; every origin in it is a string that is
 * never connected to. The modules the push seam composes are replaced, as
 * `./push-seam.test.ts` replaces them, because only its refusals are read here.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('electron', () => ({
  app: { getPath: () => '/nowhere', commandLine: { hasSwitch: () => false }, once: () => undefined },
  BrowserWindow: { getAllWindows: () => [] }
}));
vi.mock('../../sessions', () => ({
  getGmuxCore: () => new Promise(() => undefined)
}));
vi.mock('../../agents/registry', () => ({ getRegistryEntry: () => ({ displayName: 'Claude Code' }) }));
vi.mock('../../credentials', () => ({
  APNS_KEY_SLOT: 'apns-provider',
  apnsKeyDir: () => '/nowhere/push',
  apnsKeyStoreForApp: () => {
    throw new Error('the override never reaches the key store');
  }
}));
vi.mock('../../pocket/ipc', () => ({ PocketHost: class {} }));
vi.mock('../../pocket/pairing', () => ({
  pocketConfirmStatus: () => ({ state: 'never', lines: [], hash: '' }),
  readPocketStore: () => ({ store: null, sealKnown: true }),
  sealPresentationAsPhone: () => Buffer.alloc(0)
}));
vi.mock('../../pocket/routes', () => ({ createPocketRoutes: () => ({}) }));
vi.mock('../../power/wake-mark', () => ({ WakeMark: class {} }));
vi.mock('../../push/engine', () => ({
  createPushEngine: () => {
    throw new Error('the override builds no engine');
  }
}));
vi.mock('../../tray/blocked-feed', () => ({
  blockedSinceMap: () => new Map(),
  installBlockedFeed: () => undefined,
  onBlockedChange: () => () => undefined
}));

const { ALERTS_OVERRIDE_FILE, alertsHarnessOverride, parseAlertsOverride } = await import('../alerts-override');

let harness = '';
let dir = '';
let profile = '';
let keyFile = '';

const DEV = 'http://127.0.0.1:40101';
const PROD = 'http://127.0.0.1:40102';

beforeEach(() => {
  harness = mkdtempSync(join(tmpdir(), 'p3165-alerts-override-'));
  dir = join(harness, 'alerts');
  profile = join(harness, 'profile');
  mkdirSync(dir);
  mkdirSync(profile);
  // The override judges the key file's PATH; a placeholder stands where the
  // probe writes its scratch key, because containment is asked of the real
  // path and a path that does not exist cannot be resolved.
  keyFile = join(dir, 'AuthKey_P3165SCRAT.p8');
  writeFileSync(keyFile, 'not a key: the override reads only where it is\n', { mode: 0o600 });
});

afterEach(() => {
  rmSync(harness, { recursive: true, force: true });
});

/** The environment every row starts from: an armed probe run, the profile and the directory inside the harness. */
function honestEnv(): NodeJS.ProcessEnv {
  return { GMUX_HARNESS_ALERTS: dir, GMUX_PROBES: '1', GMUX_HARNESS_DIR: harness };
}

function writeOverride(value: unknown): void {
  writeFileSync(join(dir, ALERTS_OVERRIDE_FILE), typeof value === 'string' ? value : JSON.stringify(value));
}

const honestFile = (): Record<string, unknown> => ({ origins: { development: DEV, production: PROD }, keyFile });

describe('an ordinary launch', () => {
  it('answers null on its first line and asks Electron nothing', () => {
    writeOverride(honestFile());
    const mock = vi.fn(() => true);
    expect(alertsHarnessOverride({ GMUX_PROBES: '1', GMUX_HARNESS_DIR: harness }, profile, mock)).toBeNull();
    expect(alertsHarnessOverride({ ...honestEnv(), GMUX_HARNESS_ALERTS: '' }, profile, mock)).toBeNull();
    expect(mock).not.toHaveBeenCalled();
  });
});

describe('the honest override', () => {
  it('names the two loopback origins and the key file inside the harness', () => {
    writeOverride(honestFile());
    expect(alertsHarnessOverride(honestEnv(), profile, () => true)).toEqual({
      origins: { development: DEV, production: PROD },
      keyFile
    });
  });

  it('may name no key file', () => {
    writeOverride({ origins: { development: DEV, production: PROD } });
    expect(alertsHarnessOverride(honestEnv(), profile, () => true)?.keyFile).toBeNull();
    writeOverride({ origins: { development: DEV, production: PROD }, keyFile: null });
    expect(alertsHarnessOverride(honestEnv(), profile, () => true)?.keyFile).toBeNull();
  });

  it('is accepted in an isolated launch as well as an armed probe run', () => {
    writeOverride(honestFile());
    const env = { GMUX_HARNESS_ALERTS: dir, GMUX_SMOKE: 'p3165', GMUX_HARNESS_DIR: harness };
    expect(alertsHarnessOverride(env, profile, () => true)).not.toBeNull();
  });
});

describe('the push seam’s four refusals, each on its own row', () => {
  const rows: Array<[string, (env: NodeJS.ProcessEnv) => { env: NodeJS.ProcessEnv; profile?: string; mock?: boolean }]> = [
    ['neither an isolated launch nor an armed probe run', (env) => ({ env: { ...env, GMUX_PROBES: '0' } })],
    ['no harness directory', (env) => ({ env: { ...env, GMUX_HARNESS_DIR: '' } })],
    ['a profile outside the harness directory', (env) => ({ env, profile: join(tmpdir(), 'p3165-not-inside') })],
    ['the override’s directory outside the harness directory', (env) => ({ env: { ...env, GMUX_HARNESS_ALERTS: tmpdir() } })],
    ['no mock keychain', (env) => ({ env, mock: false })]
  ];
  for (const [name, edit] of rows) {
    it(`refuses ${name}`, () => {
      writeOverride(honestFile());
      const row = edit(honestEnv());
      expect(alertsHarnessOverride(row.env, row.profile ?? profile, () => row.mock ?? true)).toBeNull();
    });
  }
});

describe('the file, refused whole', () => {
  const files: Array<[string, () => unknown]> = [
    ['not JSON', () => '{"origins":'],
    ['an array', () => [honestFile()]],
    ['a key it does not know', () => ({ ...honestFile(), remote: true })],
    ['one origin', () => ({ origins: { development: DEV }, keyFile })],
    ['a third origin', () => ({ origins: { development: DEV, production: PROD, sandbox: DEV }, keyFile })],
    ['an origin off this Mac', () => ({ origins: { development: 'http://10.0.0.1:80', production: PROD }, keyFile })],
    ['an origin that is a name', () => ({ origins: { development: DEV, production: 'http://localhost:40102' }, keyFile })],
    ['an https origin', () => ({ origins: { development: 'https://127.0.0.1:40101', production: PROD }, keyFile })],
    ['an https origin off this Mac', () => ({ origins: { development: DEV, production: 'https://push.invalid:443' }, keyFile })],
    ['an origin with a path', () => ({ origins: { development: `${DEV}/3/device`, production: PROD }, keyFile })],
    ['an origin that is not a string', () => ({ origins: { development: 40101, production: PROD }, keyFile })],
    ['a key file outside the harness directory', () => ({ ...honestFile(), keyFile: join(tmpdir(), 'AuthKey_P3165SCRAT.p8') })],
    ['a relative key file', () => ({ ...honestFile(), keyFile: 'alerts/AuthKey_P3165SCRAT.p8' })],
    ['a key file that is not a string', () => ({ ...honestFile(), keyFile: 7 })],
    ['an empty key file', () => ({ ...honestFile(), keyFile: '' })]
  ];
  for (const [name, file] of files) {
    it(`refuses ${name}`, () => {
      writeOverride(file());
      expect(alertsHarnessOverride(honestEnv(), profile, () => true)).toBeNull();
    });
  }

  it('refuses a directory that holds no file', () => {
    expect(alertsHarnessOverride(honestEnv(), profile, () => true)).toBeNull();
  });

  it('parses against the harness directory alone, and refuses a key file with no harness directory', () => {
    expect(parseAlertsOverride(JSON.stringify(honestFile()), harness)?.keyFile).toBe(keyFile);
    expect(parseAlertsOverride(JSON.stringify(honestFile()), '')).toBeNull();
    expect(parseAlertsOverride(JSON.stringify({ origins: { development: DEV, production: PROD } }), '')).not.toBeNull();
  });
});
