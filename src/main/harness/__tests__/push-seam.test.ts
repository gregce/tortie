/**
 * Phase 314 — the push seam: its six refusals by a table of environments, its
 * seed parser refusing a seed whole, its command parser dropping a file whole,
 * and each command reaching the arm it names.
 *
 * Everything the seam composes is replaced here and counted, so this file
 * proves the REFUSALS and the ROUTING and nothing about a push. The push itself
 * is proved by `conformance:push` over the shipping modules and by
 * `probe:p314` inside the real app.
 *
 * EACH REFUSAL HAS ITS OWN ROW, and each row is the one that goes red if that
 * clause is deleted from `pushSeamDir` or `parsePushSeed`: an environment that
 * passes every OTHER refusal and fails exactly one.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const electron = vi.hoisted(() => ({
  userData: '/h/dir/profile',
  mock: true,
  windows: 0,
  onceCalls: 0,
  hasSwitchCalls: 0,
  getPathCalls: 0
}));

vi.mock('electron', () => ({
  app: {
    getPath: () => {
      electron.getPathCalls += 1;
      return electron.userData;
    },
    commandLine: {
      hasSwitch: (name: string) => {
        electron.hasSwitchCalls += 1;
        return name === 'use-mock-keychain' && electron.mock;
      }
    },
    once: () => {
      electron.onceCalls += 1;
    }
  },
  BrowserWindow: { getAllWindows: () => new Array(electron.windows).fill({}) }
}));

const composed = vi.hoisted(() => ({ core: 0 }));

vi.mock('../../sessions', () => ({
  getGmuxCore: () => {
    composed.core += 1;
    return new Promise(() => undefined);
  }
}));
vi.mock('../../agents/registry', () => ({
  getRegistryEntry: () => ({ displayName: 'Claude Code' })
}));
vi.mock('../../credentials', () => ({
  APNS_KEY_SLOT: 'apns-provider',
  apnsKeyDir: () => '/nowhere/push',
  apnsKeyStoreForApp: () => {
    throw new Error('the key store is not reached by a refused seam');
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
vi.mock('../../push/apns', () => ({
  createApnsSender: () => {
    throw new Error('the sender is not built by a refused seam');
  }
}));
vi.mock('../../push/engine', () => ({
  createPushEngine: () => {
    throw new Error('the engine is not built by a refused seam');
  }
}));
vi.mock('../../tray/blocked-feed', () => ({
  blockedSinceMap: () => new Map(),
  installBlockedFeed: () => undefined,
  onBlockedChange: () => () => undefined
}));

const {
  applyPushCommand,
  installPushSeam,
  isSeamOrigin,
  parsePushCommands,
  parsePushSeed,
  pushSeamDir,
  watchPushCommands,
  PUSH_SEAM_POLL_MS,
  PUSH_SEAM_TAG
} = await import('../push-seam');
const { drivableMonitor } = await import('../../power/drivable-monitor');

type Deps = Parameters<typeof applyPushCommand>[1];

function countingDeps(): { deps: Deps; calls: string[] } {
  const calls: string[] = [];
  const deps: Deps = {
    suspend: () => {
      calls.push('suspend');
    },
    resume: () => {
      calls.push('resume');
    },
    setClockOffset: (ms) => {
      calls.push(`clock:${String(ms)}`);
    },
    blocked: () => {
      calls.push('blocked');
      return { rows: [{ name: 's1', statusLabel: 'needs input' }] };
    },
    status: () => {
      calls.push('status');
      return { destinations: 2 };
    },
    setAlerts: (on) => {
      calls.push(`alerts:${String(on)}`);
    },
    removePhone: (label) => {
      calls.push(`remove:${label}`);
      return label === 'A';
    },
    confirm: () => {
      calls.push('confirm');
      return 'confirmed';
    },
    breakKey: () => {
      calls.push('break-key');
    },
    restoreKey: async () => {
      calls.push('restore-key');
      return true;
    }
  };
  return { deps, calls };
}

// ---------------------------------------------------------------------------
// The refusals, by a table of environments
// ---------------------------------------------------------------------------

describe('pushSeamDir, the four refusals it owns', () => {
  const inside = '/h/dir/profile';
  const armed = { GMUX_HARNESS_PUSH: '/h/dir/push', GMUX_PROBES: '1', GMUX_HARNESS_DIR: '/h/dir' };
  const yes = (): boolean => true;
  const no = (): boolean => false;

  it.each([
    ['an armed probe run', armed, inside, yes, '/h/dir/push'],
    [
      'an isolated shot launch',
      { GMUX_HARNESS_PUSH: '/h/dir/push', GMUX_SHOT: '/h/x.png', GMUX_HARNESS_DIR: '/h/dir' },
      inside,
      yes,
      '/h/dir/push'
    ],
    [
      'an isolated smoke launch',
      { GMUX_HARNESS_PUSH: '/h/dir/push', GMUX_SMOKE: 'power', GMUX_HARNESS_DIR: '/h/dir' },
      inside,
      yes,
      '/h/dir/push'
    ],
    // Refusal 1: an ordinary launch, and a probe variable that is not armed.
    ['refusal 1: an ordinary launch', { GMUX_HARNESS_PUSH: '/h/dir/push', GMUX_HARNESS_DIR: '/h/dir' }, inside, yes, null],
    ['refusal 1: GMUX_PROBES=0', { ...armed, GMUX_PROBES: '0' }, inside, yes, null],
    // Refusal 2: no harness directory, and a profile outside it.
    ['refusal 2: no harness directory', { GMUX_HARNESS_PUSH: '/h/dir/push', GMUX_PROBES: '1' }, inside, yes, null],
    ['refusal 2: the person’s own profile', armed, '/Users/somebody/Library/Application Support/Tortie', yes, null],
    // Refusal 3: the seam's directory outside the harness directory.
    ['refusal 3: the seam directory outside', { ...armed, GMUX_HARNESS_PUSH: '/elsewhere/push' }, inside, yes, null],
    ['refusal 3: a sibling that shares a prefix', { ...armed, GMUX_HARNESS_PUSH: '/h/dir-evil/push' }, inside, yes, null],
    // Refusal 4: no mock keychain.
    ['refusal 4: no mock keychain', armed, inside, no, null],
    // And no variable at all.
    ['no variable', { GMUX_PROBES: '1', GMUX_HARNESS_DIR: '/h/dir' }, inside, yes, null]
  ] as const)('%s', (_name, env, profile, mock, want) => {
    expect(pushSeamDir(env as NodeJS.ProcessEnv, profile, mock)).toBe(want);
  });

  it('asks Electron nothing when the variable is unset', () => {
    let asked = 0;
    expect(
      pushSeamDir({ GMUX_PROBES: '1', GMUX_HARNESS_DIR: '/h/dir' }, inside, () => {
        asked += 1;
        return true;
      })
    ).toBeNull();
    expect(asked).toBe(0);
  });
});

describe('parsePushSeed, refusals 5 and 6, and the seed refused whole', () => {
  const good = {
    key: { keyId: 'ABCDE12345', teamId: 'TEAM123456', topic: 'software.itavero.tortie', p8File: '/h/dir/push/key.p8' },
    phones: [
      { label: 'A', token: 'ab'.repeat(32), environment: 'development' },
      { label: 'B', token: 'cd'.repeat(32), environment: 'production' }
    ],
    origins: { development: 'http://127.0.0.1:4101', production: 'http://127.0.0.1:4102' },
    alerts: true
  };
  const with_ = (over: Record<string, unknown>): string => JSON.stringify({ ...good, ...over });

  it('reads the documented shape', () => {
    const read = parsePushSeed(JSON.stringify(good), '/h/dir');
    expect(read.reason).toBeNull();
    expect(read.seed?.phones.map((p) => p.label)).toEqual(['A', 'B']);
    expect(read.seed?.origins.production).toBe('http://127.0.0.1:4102');
  });

  it.each([
    // Refusal 5, one row per shape of origin that is not the one shape.
    ['a private address', 'http://10.0.0.1:1'],
    ['a NAME, even the loopback one', 'http://localhost:1'],
    ['Apple’s own production origin', 'https://api.push.apple.com'],
    ['Apple’s own sandbox origin', 'https://api.sandbox.push.apple.com:443'],
    ['https to loopback', 'https://127.0.0.1:4101'],
    ['no port', 'http://127.0.0.1'],
    ['port zero', 'http://127.0.0.1:0'],
    ['a port no socket has', 'http://127.0.0.1:70000'],
    ['a path after the port', 'http://127.0.0.1:4101/3/device'],
    ['IPv6 loopback, which no stand-in binds', 'http://[::1]:4101'],
    ['the wildcard', 'http://0.0.0.0:4101'],
    ['a tailnet address', 'http://100.64.0.1:4101']
  ])('refusal 5: %s (%s) refuses the seed whole', (_name, origin) => {
    for (const env of ['development', 'production']) {
      const read = parsePushSeed(with_({ origins: { ...good.origins, [env]: origin } }), '/h/dir');
      expect(read.seed).toBeNull();
      expect(read.reason).toContain(`origins.${env}`);
    }
    expect(isSeamOrigin(origin)).toBe(false);
  });

  it('refusal 5: a third origin, or a missing one, refuses the seed whole', () => {
    expect(parsePushSeed(with_({ origins: { ...good.origins, staging: 'http://127.0.0.1:1' } }), '/h/dir').seed).toBeNull();
    expect(parsePushSeed(with_({ origins: { development: good.origins.development } }), '/h/dir').seed).toBeNull();
  });

  it('refusal 6: a key file outside the harness directory, or relative, refuses the seed whole', () => {
    for (const p8File of ['/Users/somebody/AuthKey.p8', 'key.p8', '/h/dir-evil/key.p8']) {
      const read = parsePushSeed(with_({ key: { ...good.key, p8File } }), '/h/dir');
      expect(read.seed).toBeNull();
      expect(read.reason).toContain('p8File');
    }
  });

  it.each([
    ['not json', 'not JSON'],
    ['[]', 'top level'],
    [with_({ key: null }), 'key'],
    [with_({ key: { ...good.key, keyId: 7 } }), 'key.keyId'],
    [with_({ phones: {} }), 'phones'],
    [with_({ phones: new Array(9).fill(good.phones[0]) }), 'phones'],
    [with_({ phones: [good.phones[0], good.phones[0]] }), 'label'],
    [with_({ phones: [{ ...good.phones[0], environment: 'staging' }] }), 'environment'],
    [with_({ phones: [{ ...good.phones[0], token: 12 }] }), 'token'],
    [with_({ alerts: 'yes' }), 'alerts']
  ])('refuses %s whole', (text, reason) => {
    const read = parsePushSeed(text, '/h/dir');
    expect(read.seed).toBeNull();
    expect(read.reason).toContain(reason);
  });
});

// ---------------------------------------------------------------------------
// The commands
// ---------------------------------------------------------------------------

describe('parsePushCommands drops a file whole', () => {
  it('reads every documented command', () => {
    const read = parsePushCommands(
      JSON.stringify({
        seq: 4,
        commands: [
          { op: 'suspend' },
          { op: 'resume' },
          { op: 'clock', offsetMs: 8 * 3_600_000 },
          { op: 'clock', offsetMs: -2 * 3_600_000 },
          { op: 'blocked' },
          { op: 'status' },
          { op: 'push-off' },
          { op: 'push-on' },
          { op: 'remove-phone', label: 'A' },
          { op: 'confirm' },
          { op: 'break-key' },
          { op: 'restore-key' }
        ]
      })
    );
    expect(read.reason).toBeNull();
    expect(read.file?.seq).toBe(4);
    expect(read.file?.commands).toHaveLength(12);
  });

  it.each([
    ['not json', 'not JSON'],
    ['[]', 'top level'],
    ['{"seq":-1,"commands":[]}', 'seq'],
    ['{"seq":1.5,"commands":[]}', 'seq'],
    ['{"seq":1}', 'commands'],
    ['{"seq":1,"commands":[null]}', 'not an object'],
    ['{"seq":1,"commands":[{"op":"wake"}]}', 'op'],
    ['{"seq":1,"commands":[{"op":"suspend"},{"op":"send"}]}', 'op'],
    ['{"seq":1,"commands":[{"op":"clock"}]}', 'offsetMs'],
    ['{"seq":1,"commands":[{"op":"clock","offsetMs":1.5}]}', 'offsetMs'],
    ['{"seq":1,"commands":[{"op":"clock","offsetMs":999999999999}]}', 'offsetMs'],
    ['{"seq":1,"commands":[{"op":"remove-phone"}]}', 'label'],
    ['{"seq":1,"commands":[{"op":"remove-phone","label":""}]}', 'label']
  ])('refuses %s whole', (text, reason) => {
    const read = parsePushCommands(text);
    expect(read.file).toBeNull();
    expect(read.reason).toContain(reason);
  });
});

describe('applyPushCommand reaches the arm each command names', () => {
  it('routes every command once and prints what it reads', async () => {
    const { deps, calls } = countingDeps();
    const said: string[] = [];
    const say = (line: string): void => {
      said.push(line);
    };
    for (const cmd of [
      { op: 'suspend' },
      { op: 'resume' },
      { op: 'clock', offsetMs: 42 },
      { op: 'blocked' },
      { op: 'status' },
      { op: 'push-off' },
      { op: 'push-on' },
      { op: 'remove-phone', label: 'A' },
      { op: 'remove-phone', label: 'Z' },
      { op: 'confirm' },
      { op: 'break-key' },
      { op: 'restore-key' }
    ] as const) {
      await applyPushCommand(cmd, deps, say);
    }
    expect(calls).toEqual([
      'suspend',
      'resume',
      'clock:42',
      'blocked',
      'status',
      'alerts:false',
      'confirm',
      'alerts:true',
      'confirm',
      'remove:A',
      'remove:Z',
      'confirm',
      'break-key',
      'restore-key'
    ]);
    expect(said).toEqual([
      `${PUSH_SEAM_TAG} blocked {"rows":[{"name":"s1","statusLabel":"needs input"}]}`,
      `${PUSH_SEAM_TAG} status {"destinations":2}`,
      `${PUSH_SEAM_TAG} push-off confirm=confirmed`,
      `${PUSH_SEAM_TAG} push-on confirm=confirmed`,
      `${PUSH_SEAM_TAG} remove-phone "A" taken off the door`,
      `${PUSH_SEAM_TAG} remove-phone "Z" no such phone`,
      `${PUSH_SEAM_TAG} confirm=confirmed`,
      `${PUSH_SEAM_TAG} restore-key kept`
    ]);
  });
});

describe('watchPushCommands applies each sequence once', () => {
  let dir = '';
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'p314-seam-'));
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    rmSync(dir, { recursive: true, force: true });
  });

  it('applies a sequence once, refuses a bad file whole with one line, and ignores an old seq', async () => {
    const path = join(dir, 'commands.json');
    const { deps, calls } = countingDeps();
    const said: string[] = [];
    writeFileSync(path, JSON.stringify({ seq: 1, commands: [{ op: 'suspend' }, { op: 'resume' }] }));
    const stop = watchPushCommands(path, deps, (line) => said.push(line));
    try {
      await vi.advanceTimersByTimeAsync(PUSH_SEAM_POLL_MS * 3);
      expect(calls).toEqual(['suspend', 'resume']);
      expect(said.filter((l) => l.includes('applied seq=1'))).toHaveLength(1);

      writeFileSync(path, '{"seq":2,"commands":[{"op":"send"}]}');
      await vi.advanceTimersByTimeAsync(PUSH_SEAM_POLL_MS * 3);
      expect(said.filter((l) => l.includes('refused the file whole'))).toHaveLength(1);
      expect(calls).toEqual(['suspend', 'resume']);

      writeFileSync(path, JSON.stringify({ seq: 1, commands: [{ op: 'suspend' }], note: 'rewritten' }));
      await vi.advanceTimersByTimeAsync(PUSH_SEAM_POLL_MS * 3);
      expect(calls).toEqual(['suspend', 'resume']);

      writeFileSync(path, JSON.stringify({ seq: 3, commands: [{ op: 'clock', offsetMs: 5 }] }));
      await vi.advanceTimersByTimeAsync(PUSH_SEAM_POLL_MS * 3);
      expect(calls).toEqual(['suspend', 'resume', 'clock:5']);
      expect(said.filter((l) => l.includes('applied seq='))).toHaveLength(2);
    } finally {
      stop();
    }
  });
});

// ---------------------------------------------------------------------------
// installPushSeam: a refused launch composes nothing and prints nothing
// ---------------------------------------------------------------------------

describe('installPushSeam, refused, installs nothing and prints nothing', () => {
  const saved = { ...process.env };
  let dir = '';
  let logged: string[] = [];
  let spy: ReturnType<typeof vi.spyOn> | null = null;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'p314-install-'));
    // The profile EXISTS, as it does under a real launch: the containment test
    // resolves both sides, and a path that is not there resolves to itself.
    mkdirSync(join(dir, 'profile'), { recursive: true });
    for (const name of ['GMUX_HARNESS_PUSH', 'GMUX_PROBES', 'GMUX_HARNESS_DIR', 'GMUX_SHOT', 'GMUX_SMOKE']) {
      delete process.env[name];
    }
    electron.userData = join(dir, 'profile');
    electron.mock = true;
    electron.windows = 0;
    electron.onceCalls = 0;
    electron.hasSwitchCalls = 0;
    electron.getPathCalls = 0;
    composed.core = 0;
    logged = [];
    spy = vi.spyOn(console, 'log').mockImplementation((line: unknown) => {
      logged.push(String(line));
    });
  });
  afterEach(() => {
    spy?.mockRestore();
    process.env = { ...saved };
    rmSync(dir, { recursive: true, force: true });
  });

  const seed = (origin: string): void => {
    // A key file that exists, so refusal 6 reads what a real run has. Its
    // bytes are never read by a refused seam.
    writeFileSync(join(dir, 'push', 'key.p8'), 'not a key\n');
    writeFileSync(
      join(dir, 'push', 'seed.json'),
      JSON.stringify({
        key: { keyId: 'ABCDE12345', teamId: 'TEAM123456', topic: 'a.b', p8File: join(dir, 'push', 'key.p8') },
        phones: [],
        origins: { development: origin, production: 'http://127.0.0.1:2' },
        alerts: true
      })
    );
  };
  const arm = (): void => {
    process.env['GMUX_HARNESS_PUSH'] = join(dir, 'push');
    process.env['GMUX_PROBES'] = '1';
    process.env['GMUX_HARNESS_DIR'] = dir;
  };

  it('an ordinary launch returns before asking Electron anything', () => {
    installPushSeam();
    expect(electron.getPathCalls).toBe(0);
    expect(electron.hasSwitchCalls).toBe(0);
    expect(electron.onceCalls).toBe(0);
    expect(composed.core).toBe(0);
    expect(logged).toEqual([]);
  });

  it('refusal 4 at install: no mock keychain composes nothing', () => {
    mkdirSync(join(dir, 'push'), { recursive: true });
    seed('http://127.0.0.1:1');
    arm();
    electron.mock = false;
    installPushSeam();
    expect(electron.hasSwitchCalls).toBe(1);
    expect(electron.onceCalls).toBe(0);
    expect(composed.core).toBe(0);
    expect(logged).toEqual([]);
  });

  it('refusal 5 at install: a non-loopback origin in the seed composes nothing', () => {
    mkdirSync(join(dir, 'push'), { recursive: true });
    seed('https://api.sandbox.push.apple.com');
    arm();
    installPushSeam();
    expect(electron.onceCalls).toBe(0);
    expect(composed.core).toBe(0);
    expect(logged).toEqual([]);
  });

  it('no seed file composes nothing', () => {
    arm();
    installPushSeam();
    expect(electron.onceCalls).toBe(0);
    expect(composed.core).toBe(0);
    expect(logged).toEqual([]);
  });

  it('a seed that passes WAITS FOR A WINDOW rather than booting the core itself', () => {
    mkdirSync(join(dir, 'push'), { recursive: true });
    seed('http://127.0.0.1:1');
    arm();
    installPushSeam();
    // Armed, and nothing composed yet: the composition waits for startup to
    // create the first window, which is after startup kicked the core boot.
    expect(electron.onceCalls).toBe(1);
    expect(composed.core).toBe(0);
    expect(logged).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// The drivable monitor, which the power smoke and this seam now share
// ---------------------------------------------------------------------------

describe('drivableMonitor, one copy for the power smoke and the push seam', () => {
  it('fires each listener for its event only, and a removed one never', () => {
    const monitor = drivableMonitor();
    const seen: string[] = [];
    const onSuspend = (): void => {
      seen.push('suspend');
    };
    const onResume = (): void => {
      seen.push('resume');
    };
    monitor.on('suspend', onSuspend);
    monitor.on('resume', onResume);
    monitor.fire('suspend');
    monitor.fire('resume');
    expect(seen).toEqual(['suspend', 'resume']);
    expect(monitor.listenerCount('resume')).toBe(1);
    monitor.removeListener('resume', onResume);
    expect(monitor.listenerCount('resume')).toBe(0);
    monitor.fire('resume');
    expect(seen).toEqual(['suspend', 'resume']);
  });

  it('a listener that removes itself while it runs does not skip the next one', () => {
    const monitor = drivableMonitor();
    const seen: string[] = [];
    const first = (): void => {
      seen.push('first');
      monitor.removeListener('resume', first);
    };
    monitor.on('resume', first);
    monitor.on('resume', () => seen.push('second'));
    monitor.fire('resume');
    expect(seen).toEqual(['first', 'second']);
  });
});
