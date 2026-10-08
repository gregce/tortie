/**
 * The setup presses (Phase 333.1, build/p3331/SPEC.md D11 to D13, D35; r2
 * §Attack F23).
 *
 * THE ONLY DRIVE OF A REAL SETUP PRESS. No probe calls `pocket:setupAction`,
 * because a probe that did would open his browser or his Tailscale, or write
 * his clipboard, the moment the harness return regressed (D35). So the press
 * is driven here, through the SHIPPING owner, over a recording
 * `PocketSetupSeam`, and once over the production seam itself with Electron's
 * `shell` and `clipboard` replaced by recorders: nothing opens and nothing is
 * written anywhere.
 *
 * What each test holds is in its title: a listed word acts once with the
 * exact constant; a word not listed acts never; under every harness term each
 * word acts never; Open Tailscale is listed only for the app's own copy at its
 * pinned place and never under an override; a press that is not one closed
 * word throws and opens nothing; and the list agrees with step 1's state.
 *
 * NOTHING HERE BINDS A SOCKET, AND NOTHING EXECS A PROGRAM. `./bind.ts` is a
 * door made of booleans, and Tailscale an in-memory stand-in behind
 * `FunnelDeps` that is never executed, whatever path it is said to be at.
 */

import { EventEmitter } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { PocketSetupAction, PocketStatus } from '@shared/ipc/pocket';
import type { FunnelChild, FunnelDeps, FunnelResolution } from '../funnel';
import type { PocketSetupSeam } from '../ipc';
import type { PocketFacts } from '../routes';
import { fakeNameDeps } from './dns-fixtures';

let userData = '';
const MARKER = '--tortie-p3331-setup-test--';

/** What the PRODUCTION seam reached: Electron's shell and clipboard, replaced by recorders. */
const electronCalls: string[] = [];

vi.mock('electron', () => ({
  app: { getPath: () => userData, isReady: () => true, isPackaged: false },
  shell: {
    openExternal: async (url: string) => {
      electronCalls.push(`openExternal ${url}`);
    },
    openPath: async (path: string) => {
      electronCalls.push(`openPath ${path}`);
      return '';
    }
  },
  clipboard: {
    writeText: (text: string) => {
      electronCalls.push(`writeText ${text}`);
    }
  },
  BrowserWindow: { getAllWindows: () => [] },
  ipcMain: { handle: () => undefined },
  safeStorage: {
    isEncryptionAvailable: () => true,
    encryptString: (text: string) => Buffer.from(`${MARKER}${text}`, 'utf8'),
    decryptString: (buf: Buffer) => {
      const text = buf.toString('utf8');
      if (!text.startsWith(MARKER)) throw new Error('not ours');
      return text.slice(MARKER.length);
    }
  }
}));

vi.mock('../../log', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../log')>();
  const quiet = (): void => undefined;
  return { ...real, getLog: () => ({ error: quiet, warn: quiet, info: quiet, debug: quiet }) };
});

/** The door process, as booleans: it listens when started and stops when stopped. */
const door = { listening: false, quitting: false };
vi.mock('../bind', async (importOriginal) => {
  const real = await importOriginal<typeof import('../bind')>();
  return {
    ...real,
    pocketDoorStatus: () => ({
      listening: door.listening,
      localPort: door.listening ? 50_001 : 0,
      certificateFingerprint: null,
      publicKeyFingerprint: null,
      shortFingerprint: null,
      lastRefusal: null,
      sentence: null
    }),
    pocketShutdownStarted: () => door.quitting,
    startPocketDoor: async () => {
      door.listening = true;
      return { ok: true, localPort: 50_001, certificateFingerprint: '', publicKeyFingerprint: '', shortFingerprint: '' };
    },
    stopPocketDoor: async () => {
      door.listening = false;
      return { accepted: 0, joined: true, waitedMs: 0 };
    },
    updatePocketDoor: () => undefined,
    onPocketDoorExit: () => () => undefined
  };
});

const { PocketHost } = await import('../ipc');
const { POCKET_SETUP_ACTIONS } = await import('@shared/ipc/pocket');
const { TAILSCALE_DOWNLOAD_PAGE, beginFunnelShutdown, resetFunnelForTests } = await import('../funnel');
const { TAILSCALE_APP_BUNDLE, TAILSCALE_APP_PROGRAM } = await import('../../machines/tailscale');
const { gmuxErrorPayloadOf } = await import('../../errors');

type Host = InstanceType<typeof PocketHost>;

// ---------------------------------------------------------------------------
// Tailscale, in memory, never executed
// ---------------------------------------------------------------------------

const STAND_IN = '/stand/in/tailscale';
const NAME = 'mac.tail00000.ts.net';
const ADMIN_URL = 'https://login.tailscale.com/f/funnel?node=nMADEUP';

class Child extends EventEmitter {
  readonly stdout = new EventEmitter() as unknown as NodeJS.ReadableStream;
  readonly stderr = new EventEmitter() as unknown as NodeJS.ReadableStream;
  closed = false;
  constructor(readonly pid: number) {
    super();
  }
  close(code: number | null): void {
    if (this.closed) return;
    this.closed = true;
    this.emit('close', code, null);
  }
  kill(): boolean {
    this.close(0);
    return true;
  }
}

const ts = {
  resolution: null as FunnelResolution | null,
  backend: 'Running',
  /** Every exec answers ENOENT, as a wrapper whose interpreter is gone does: the stat finds it, the read does not. */
  enoent: false,
  caps: true,
  /** The stderr every funnel start fails with, or null. */
  refuse: null as string | null,
  /** Print Tailscale's approval page and exit 0, as a start a non-admin meets does. */
  exit0: false,
  /** The page that start prints (the 333.1 reverify: a hostile spelling of it). */
  printed: ADMIN_URL,
  execs: 0,
  children: [] as Child[],
  nextPid: 60_000
};

const pinnedAt = (path: string): FunnelResolution => ({
  resolution: { path, source: 'pinned', detail: path },
  overrideSet: false
});
const missing: FunnelResolution = { resolution: { path: null, source: 'missing', detail: '' }, overrideSet: false };

function funnelDeps(): FunnelDeps {
  return {
    resolve: () =>
      ts.resolution ?? { resolution: { path: STAND_IN, source: 'dev-override', detail: '' }, overrideSet: true },
    exec: async (_file, args) => {
      ts.execs += 1;
      if (ts.enoent) return { stdout: '', stderr: '', code: null, failed: true, errno: 'ENOENT' };
      if (args[0] === 'status') {
        return {
          stdout: JSON.stringify({
            BackendState: ts.backend,
            Self: { DNSName: `${NAME}.`, CapMap: ts.caps ? { https: null, funnel: null } : {} },
            CurrentTailnet: { Name: 'example.github' },
            Peer: null
          }),
          stderr: '',
          code: 0,
          failed: false,
          errno: null
        };
      }
      return { stdout: 'null', stderr: '', code: 0, failed: false, errno: null };
    },
    spawn: () => {
      const child = new Child((ts.nextPid += 1));
      ts.children.push(child);
      setImmediate(() => {
        if (ts.exit0) {
          (child.stdout as unknown as EventEmitter).emit('data', Buffer.from(`         ${ts.printed}\n`, 'utf8'));
          child.close(0);
          return;
        }
        (child.stderr as unknown as EventEmitter).emit('data', Buffer.from(`${ts.refuse ?? 'nothing published'}\n`, 'utf8'));
        child.close(1);
      });
      return child as unknown as FunnelChild;
    },
    ps: async () => null,
    kill: () => false,
    recordPath: () => join(userData, 'gmux', 'pocket-funnel', 'record.json'),
    now: () => Date.now(),
    sleep: (ms) =>
      new Promise<void>((resolve) => {
        if (ms < 1_000) setImmediate(resolve);
      })
  };
}

// ---------------------------------------------------------------------------
// The world
// ---------------------------------------------------------------------------

const FACTS: PocketFacts = {
  sessions: () => [],
  projects: () => [],
  blockedSince: () => new Map(),
  activity: () => undefined,
  statusWord: () => ({ dot: 'idle', label: 'idle' }),
  agentLabel: (id) => id,
  machineLabel: () => null,
  emptyLine: 'Nothing needs you',
  wakes: () => [],
  catchUp: async () => null,
  lastTurn: async () => ({ answerText: null, turnCount: 0 }),
  turns: async () => ({ turns: [], more: false }),
  handoff: () => null
};

/** A recording seam. `opened` answers what Electron's `openPath` answers: '' when it opened. */
function recordingSeam(opened = ''): PocketSetupSeam & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    openExternal: async (url) => {
      calls.push(`openExternal ${url}`);
    },
    openPath: async (path) => {
      calls.push(`openPath ${path}`);
      return opened;
    },
    writeClipboard: (text) => {
      calls.push(`writeClipboard ${text}`);
    }
  };
}

function hostWith(setup?: PocketSetupSeam): Host {
  return new PocketHost({
    facts: FACTS,
    tailscale: funnelDeps(),
    names: fakeNameDeps({ sleep: 'now' }),
    ...(setup !== undefined ? { setup } : {})
  });
}

async function settle(one: Host): Promise<void> {
  for (let i = 0; i < 8; i += 1) {
    await one.idle();
    await new Promise((resolve) => setImmediate(resolve));
  }
}

/** The four terms `isHarnessLaunch` reads (`../harness/launch-gate.ts`). */
const HARNESS_TERMS = ['GMUX_PROBES', 'GMUX_SMOKE', 'GMUX_SHOT', 'GMUX_UPDATE_REHEARSAL'] as const;
const savedEnv: Record<string, string | undefined> = {};

/** Each state in which one word is listed, made through the owner's own presses. */
const LISTED: Record<PocketSetupAction, (one: Host) => Promise<void>> = {
  'get-tailscale': async () => {
    ts.resolution = missing;
  },
  'open-tailscale': async (one) => {
    ts.resolution = pinnedAt(TAILSCALE_APP_PROGRAM);
    ts.backend = 'Stopped';
    await one.setDoor({ on: true });
    await settle(one);
  },
  'copy-admin-link': async (one) => {
    ts.caps = false;
    ts.exit0 = true;
    await one.setDoor({ on: true });
    await settle(one);
    const lines = one.status();
    await one.confirmDoor({ linesRead: lines.confirmLines, hashRead: lines.confirmHash });
    await settle(one);
  }
};

const ACT: Record<PocketSetupAction, string> = {
  'get-tailscale': `openExternal ${TAILSCALE_DOWNLOAD_PAGE}`,
  'open-tailscale': `openPath ${TAILSCALE_APP_BUNDLE}`,
  'copy-admin-link': `writeClipboard ${ADMIN_URL}`
};

beforeEach(() => {
  userData = mkdtempSync(join(tmpdir(), 'p3331-setup-'));
  for (const term of HARNESS_TERMS) {
    savedEnv[term] = process.env[term];
    delete process.env[term];
  }
  resetFunnelForTests();
  Object.assign(door, { listening: false, quitting: false });
  Object.assign(ts, {
    resolution: null,
    backend: 'Running',
    enoent: false,
    caps: true,
    refuse: null,
    exit0: false,
    printed: ADMIN_URL,
    execs: 0,
    children: []
  });
  electronCalls.length = 0;
});

afterEach(() => {
  for (const term of HARNESS_TERMS) {
    if (savedEnv[term] === undefined) delete process.env[term];
    else process.env[term] = savedEnv[term];
  }
  for (const child of ts.children) child.close(null);
  resetFunnelForTests();
  rmSync(userData, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------

describe('a setup press acts only on a word main lists', () => {
  for (const word of POCKET_SETUP_ACTIONS) {
    it(`${word}: listed, it acts ONCE with the exact constant; the other two, not listed, act never and answer false`, async () => {
      const seam = recordingSeam();
      const one = hostWith(seam);
      await LISTED[word](one);
      const listed = one.status().setupActions;
      expect(listed).toContain(word);
      for (const other of POCKET_SETUP_ACTIONS) {
        if (other === word || listed.includes(other)) continue;
        expect(await one.setupAction(other), other).toBe(false);
      }
      expect(seam.calls).toEqual([]);
      expect(await one.setupAction(word)).toBe(true);
      expect(seam.calls).toEqual([ACT[word]]);
      await one.stop();
    });
  }

  it('at rest, with Tailscale found and the door off, lists nothing and every word acts never', async () => {
    const seam = recordingSeam();
    const one = hostWith(seam);
    expect(one.status()).toMatchObject({ tailscale: 'installed', setupActions: [] });
    for (const word of POCKET_SETUP_ACTIONS) expect(await one.setupAction(word), word).toBe(false);
    expect(seam.calls).toEqual([]);
  });

  it('Open Tailscale answers whether the app opened', async () => {
    const seam = recordingSeam('The application cannot be opened.');
    const one = hostWith(seam);
    await LISTED['open-tailscale'](one);
    expect(await one.setupAction('open-tailscale')).toBe(false);
    expect(seam.calls).toEqual([`openPath ${TAILSCALE_APP_BUNDLE}`]);
    await one.stop();
  });

  it('the stat’s own missing lists Get Tailscale with no exec, the switch off', () => {
    const one = hostWith(recordingSeam());
    ts.resolution = missing;
    expect(one.status()).toMatchObject({ tailscale: 'missing', setupActions: ['get-tailscale'] });
    expect(ts.execs).toBe(0);
  });

  it('a Tailscale deleted after a read that answered reads missing, the switch on: the stat, not the last read, decides (the fix round)', async () => {
    const seam = recordingSeam();
    const one = hostWith(seam);
    await one.setDoor({ on: true });
    await settle(one);
    const read = one.status();
    // The read answered: step 1 ready, the lines drawn to Allow, nothing listed.
    expect(read).toMatchObject({ tailscale: 'ready', setupActions: [], confirmable: true });
    expect(read.funnel.refused).toBeNull();
    const execs = ts.execs;
    // Then Tailscale is deleted. No press reads again; the stat finds nothing.
    ts.resolution = missing;
    const gone = one.status();
    expect(gone.tailscale).toBe('missing');
    expect(gone.setupActions).toEqual(['get-tailscale']);
    // The read's account and tailnet are not drawn over a Tailscale that is gone.
    expect([gone.account, gone.tailnet]).toEqual([null, null]);
    // The stat runs nothing.
    expect(ts.execs).toBe(execs);
    // And the press it lists is the one that acts.
    expect(await one.setupAction('get-tailscale')).toBe(true);
    expect(seam.calls).toEqual([`openExternal ${TAILSCALE_DOWNLOAD_PAGE}`]);
    await one.stop();
  });
});

describe('under a harness launch every word acts never (D12, D35)', () => {
  for (const term of HARNESS_TERMS) {
    it(`${term}=1: each word, listed, answers false and reaches no seam`, async () => {
      for (const word of POCKET_SETUP_ACTIONS) {
        const seam = recordingSeam();
        const one = hostWith(seam);
        await LISTED[word](one);
        expect(one.status().setupActions).toContain(word);
        process.env[term] = '1';
        try {
          expect(await one.setupAction(word), word).toBe(false);
        } finally {
          delete process.env[term];
        }
        expect(seam.calls, word).toEqual([]);
        await one.stop();
        Object.assign(ts, { resolution: null, backend: 'Running', caps: true, exit0: false });
      }
    });
  }
});

describe('Open Tailscale is listed only for the app’s own copy at its pinned place (D11)', () => {
  const states: [string, string][] = [
    ['Stopped', 'stopped'],
    ['NeedsLogin', 'signed-out']
  ];
  for (const [backend, word] of states) {
    it(`${word}: listed for the app’s copy, never under an override, a dev-override or a Homebrew path`, async () => {
      const cases: [string, FunnelResolution, boolean][] = [
        ['the app’s copy, pinned', pinnedAt(TAILSCALE_APP_PROGRAM), true],
        ['a Homebrew path', pinnedAt('/opt/homebrew/bin/tailscale'), false],
        ['the standalone installer’s path', pinnedAt('/usr/local/bin/tailscale'), false],
        [
          'the app’s copy, as a development override',
          { resolution: { path: TAILSCALE_APP_PROGRAM, source: 'dev-override', detail: '' }, overrideSet: true },
          false
        ],
        [
          'the app’s copy, pinned while an override is set',
          { resolution: { path: TAILSCALE_APP_PROGRAM, source: 'pinned', detail: '' }, overrideSet: true },
          false
        ],
        [
          // A shape `resolveTailscale` never answers, handed to the seam: the
          // predicate asks the source itself, not only the override's flag.
          'the app’s copy, said to be an override with none set',
          { resolution: { path: TAILSCALE_APP_PROGRAM, source: 'dev-override', detail: '' }, overrideSet: false },
          false
        ],
        ['the stand-in', { resolution: { path: STAND_IN, source: 'dev-override', detail: '' }, overrideSet: true }, false]
      ];
      for (const [what, resolution, listed] of cases) {
        const seam = recordingSeam();
        const one = hostWith(seam);
        ts.resolution = resolution;
        ts.backend = backend;
        await one.setDoor({ on: true });
        await settle(one);
        const s = one.status();
        // An unusable override refuses before any read; every other case reads the state.
        if (!(resolution.overrideSet && resolution.resolution.source !== 'dev-override')) {
          expect(s.tailscale, what).toBe(word);
        }
        expect(s.setupActions.includes('open-tailscale'), what).toBe(listed);
        expect(await one.setupAction('open-tailscale'), what).toBe(listed);
        expect(seam.calls, what).toEqual(listed ? [`openPath ${TAILSCALE_APP_BUNDLE}`] : []);
        await one.stop();
      }
    });
  }

  it('never for his real app while a development override is set, even one that broke after the read found Tailscale stopped', async () => {
    const seam = recordingSeam();
    const one = hostWith(seam);
    ts.backend = 'Stopped';
    await one.setDoor({ on: true });
    await settle(one);
    expect(one.status().tailscale).toBe('stopped');
    // The override stops resolving: resolveTailscale falls back to the pinned
    // app, which on his Mac is HIS Tailscale.
    ts.resolution = { resolution: { path: TAILSCALE_APP_PROGRAM, source: 'pinned', detail: '' }, overrideSet: true };
    const s = one.status();
    expect(s.tailscale).toBe('stopped');
    expect(s.setupActions).not.toContain('open-tailscale');
    expect(await one.setupAction('open-tailscale')).toBe(false);
    expect(seam.calls).toEqual([]);
    await one.stop();
  });

  it('and after a start that refused shields-up, for the app’s copy alone', async () => {
    const one = hostWith(recordingSeam());
    ts.resolution = pinnedAt(TAILSCALE_APP_PROGRAM);
    ts.refuse = 'Unable to turn on Funnel while shields-up is enabled';
    await one.setDoor({ on: true });
    await settle(one);
    const lines = one.status();
    await one.confirmDoor({ linesRead: lines.confirmLines, hashRead: lines.confirmHash });
    await settle(one);
    const s = one.status();
    expect(s.tailscale).toBe('ready');
    expect(s.funnel.refused).toBe('shields-up');
    expect(s.setupActions).toEqual(['open-tailscale']);
    await one.stop();
  });
});

describe('a press that is not one closed word', () => {
  it('throws INVALID_INPUT and opens nothing: another word, a URL, a path, an object, nothing', async () => {
    const seam = recordingSeam();
    const one = hostWith(seam);
    ts.resolution = missing;
    for (const bad of [
      'get-tailscale ',
      'Get-Tailscale',
      'open-approval',
      TAILSCALE_DOWNLOAD_PAGE,
      'https://example.invalid/',
      TAILSCALE_APP_BUNDLE,
      TAILSCALE_APP_PROGRAM,
      ['get-tailscale'],
      { action: 'get-tailscale' },
      null,
      undefined,
      1
    ]) {
      let thrown: unknown = null;
      try {
        await one.setupAction(bad);
      } catch (err) {
        thrown = err;
      }
      expect(gmuxErrorPayloadOf(thrown)?.code, JSON.stringify(bad) ?? 'undefined').toBe('INVALID_INPUT');
    }
    expect(seam.calls).toEqual([]);
  });
});

describe('the list, the state and the quit', () => {
  it('lists Get Tailscale exactly while step 1 says missing, and Open Tailscale only beside stopped, signed out or shields-up', async () => {
    const one = hostWith(recordingSeam());
    const seen: PocketStatus[] = [];
    const record = (): void => void seen.push(one.status());
    // Each world: what the stat answers, and whether the read then finds no
    // program (a wrapper whose interpreter is gone) where the stat found one.
    const worlds: [FunnelResolution | null, boolean][] = [
      [null, false],
      [missing, false],
      [pinnedAt(TAILSCALE_APP_PROGRAM), false],
      [null, true],
      [pinnedAt(TAILSCALE_APP_PROGRAM), true]
    ];
    for (const [resolution, enoent] of worlds) {
      ts.resolution = resolution;
      ts.enoent = enoent;
      record();
      for (const backend of ['Running', 'Stopped', 'NeedsLogin', 'Weird']) {
        ts.backend = backend;
        await one.setDoor({ on: true });
        await settle(one);
        record();
      }
      await one.setDoor({ on: false });
      await settle(one);
      record();
    }
    expect(seen.length).toBeGreaterThan(10);
    // Every kind of step 1 the worlds can reach was reached, the read's own
    // missing among them.
    for (const state of ['missing', 'stopped', 'signed-out', 'installed', 'ready'] as const) {
      expect(seen.some((s) => s.tailscale === state), state).toBe(true);
    }
    expect(seen.some((s) => s.tailscale === 'missing' && s.funnel.refused === 'no-tailscale')).toBe(true);
    for (const s of seen) {
      expect(s.setupActions.includes('get-tailscale'), JSON.stringify([s.state, s.tailscale])).toBe(
        s.tailscale === 'missing'
      );
      if (s.setupActions.includes('open-tailscale')) {
        expect(
          s.tailscale === 'stopped' || s.tailscale === 'signed-out' || s.funnel.refused === 'shields-up',
          JSON.stringify([s.state, s.tailscale])
        ).toBe(true);
      }
      // In the contract's order, each once.
      expect(s.setupActions).toEqual(POCKET_SETUP_ACTIONS.filter((w) => s.setupActions.includes(w)));
    }
    await one.stop();
  });

  it('lists Copy link no longer once the quit has begun, and acts never then', async () => {
    const seam = recordingSeam();
    const one = hostWith(seam);
    await LISTED['copy-admin-link'](one);
    expect(one.status().setupActions).toContain('copy-admin-link');
    beginFunnelShutdown();
    expect(one.status().setupActions).not.toContain('copy-admin-link');
    expect(await one.setupAction('copy-admin-link')).toBe(false);
    expect(seam.calls).toEqual([]);
  });

  // The 333.1 reverify (2026-10-08): Copy link hands the held link to a second
  // person, who pastes it into whatever reads it, and a backslash can name two
  // hosts to two parsers. The link is listed as it was, and written as new URL
  // spells it, which every parser reads as login.tailscale.com.
  for (const [printed, written] of [
    ['https://login.tailscale.com\\@evil.example/f/funnel', 'https://login.tailscale.com/@evil.example/f/funnel'],
    ['HTTPS://LOGIN.TAILSCALE.COM/f/funnel', 'https://login.tailscale.com/f/funnel'],
    ['https://login.tailscale.com\\\\evil.example/f', 'https://login.tailscale.com//evil.example/f']
  ] as const) {
    it(`a start that printed ${JSON.stringify(printed)} lists Copy link and writes ${JSON.stringify(written)}, never the printed text`, async () => {
      ts.printed = printed;
      const seam = recordingSeam();
      const one = hostWith(seam);
      await LISTED['copy-admin-link'](one);
      expect(ts.children.length).toBeGreaterThan(0);
      expect(one.status().setupActions).toContain('copy-admin-link');
      expect(await one.setupAction('copy-admin-link')).toBe(true);
      expect(seam.calls).toEqual([`writeClipboard ${written}`]);
      await one.stop();
    });
  }

  it('copies a link Tailscale printed in its one spelling exactly as printed, an "@" in its path included', async () => {
    ts.printed = 'https://login.tailscale.com/@evil.example/f/funnel';
    const seam = recordingSeam();
    const one = hostWith(seam);
    await LISTED['copy-admin-link'](one);
    expect(one.status().setupActions).toContain('copy-admin-link');
    expect(await one.setupAction('copy-admin-link')).toBe(true);
    expect(seam.calls).toEqual(['writeClipboard https://login.tailscale.com/@evil.example/f/funnel']);
    await one.stop();
  });

  it('a start that printed a link Tortie would not open lists no Copy link and copies nothing', async () => {
    ts.printed = 'https://login.tailscale.com.\\@evil.example/f/funnel';
    const seam = recordingSeam();
    const one = hostWith(seam);
    await LISTED['copy-admin-link'](one);
    expect(ts.children.length).toBeGreaterThan(0);
    expect(one.status().setupActions).not.toContain('copy-admin-link');
    expect(await one.setupAction('copy-admin-link')).toBe(false);
    expect(seam.calls).toEqual([]);
    await one.stop();
  });

  it('the production seam reaches Electron’s shell and clipboard only when a press is acted on', async () => {
    const one = hostWith();
    expect(electronCalls).toEqual([]);
    ts.resolution = missing;
    expect(await one.setupAction('get-tailscale')).toBe(true);
    ts.resolution = null;
    await LISTED['copy-admin-link'](one);
    expect(await one.setupAction('copy-admin-link')).toBe(true);
    await one.stop();
    const app = hostWith();
    await LISTED['open-tailscale'](app);
    expect(await app.setupAction('open-tailscale')).toBe(true);
    await app.stop();
    expect(electronCalls).toEqual([
      `openExternal ${TAILSCALE_DOWNLOAD_PAGE}`,
      `writeText ${ADMIN_URL}`,
      `openPath ${TAILSCALE_APP_BUNDLE}`
    ]);
  });
});
