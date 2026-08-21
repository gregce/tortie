/**
 * Open With in main (Phase 39).
 *
 * Every child process is faked at the `run` seam, so these tests spawn
 * nothing, open no app and read no LaunchServices registration. What they
 * pin is the part that can silently rot: the deadline, the cache, the dedupe
 * rule, the exact argv, and the refusals with the exact sentences the user
 * reads.
 *
 * The dedupe fixture is the real answer this machine gave for `.txt`, cut
 * down: four copies of Chromium under one bundle identifier, from Playwright
 * and Puppeteer caches, next to Google Chrome and Google Chrome for Testing,
 * which are two different apps that must not be merged.
 */

import { mkdir, mkdtemp, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { GmuxErrorPayload } from '@shared/types';
import type { GuardedRunResult } from '../../proc/guarded';
import type { OpenWithDeps, OpenWithService } from '../open-with';
import {
  APP_MISSING_MESSAGE,
  FILE_MISSING_MESSAGE,
  NOT_AN_APP_MESSAGE,
  OPEN_WITH_DEADLINE_MS,
  createOpenWith,
  normalizeLookup,
  parseLookup
} from '../open-with';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const CHROMIUM_CACHE_1 =
  '/Users/x/Library/Caches/ms-playwright/chromium-1181/chrome-mac/Chromium.app';
const CHROMIUM_CACHE_2 =
  '/Users/x/Library/Caches/ms-playwright/chromium-1169/chrome-mac/Chromium.app';
const CHROMIUM_CACHE_3 = '/Users/x/.codeium/windsurf/ws-browser/Chromium.app';
const CHROMIUM_CACHE_4 = '/Users/x/.vscode-test/Chromium.app';
const CHROME_TESTING =
  '/Users/x/.cache/puppeteer/chrome/mac_arm-150/Google Chrome for Testing.app';

const TXT_ANSWER = {
  defaultPath: '/System/Applications/TextEdit.app',
  apps: [
    {
      path: '/System/Applications/TextEdit.app',
      name: 'TextEdit',
      bundleId: 'com.apple.TextEdit'
    },
    { path: CHROMIUM_CACHE_1, name: 'Chromium', bundleId: 'org.chromium.Chromium' },
    { path: CHROMIUM_CACHE_2, name: 'Chromium', bundleId: 'org.chromium.Chromium' },
    { path: CHROMIUM_CACHE_3, name: 'Chromium', bundleId: 'org.chromium.Chromium' },
    { path: CHROMIUM_CACHE_4, name: 'Chromium', bundleId: 'org.chromium.Chromium' },
    {
      path: '/Applications/Google Chrome.app',
      name: 'Google Chrome',
      bundleId: 'com.google.Chrome'
    },
    {
      path: CHROME_TESTING,
      name: 'Google Chrome for Testing',
      bundleId: 'com.google.chrome.for.testing'
    },
    { path: '/Applications/Bear.app', name: 'Bear', bundleId: 'net.shinyfrog.bear' }
  ]
};

/** Every path the fixtures pretend exists as a real .app bundle. */
const REAL_APPS = new Set<string>([
  '/System/Applications/TextEdit.app',
  '/System/Applications/Preview.app',
  '/Applications/Google Chrome.app',
  '/Applications/Bear.app',
  CHROMIUM_CACHE_1,
  CHROMIUM_CACHE_2,
  CHROMIUM_CACHE_3,
  CHROMIUM_CACHE_4,
  CHROME_TESTING
]);

interface Spawned {
  bin: string;
  args: string[];
}

let scratch: string;
let root: string;
let filePath: string;
let spawned: Spawned[];
let answers: (() => Promise<GuardedRunResult>)[];
let service: OpenWithService;

/** A GuardedRunResult with the fields a caller branches on. */
function ok(stdout: string): GuardedRunResult {
  return { stdout, stderr: '', code: 0, signal: null, timedOut: false, spawnError: null };
}

function failed(partial: Partial<GuardedRunResult>): GuardedRunResult {
  return {
    stdout: '',
    stderr: '',
    code: 1,
    signal: null,
    timedOut: false,
    spawnError: null,
    ...partial
  };
}

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

function build(overrides: Partial<OpenWithDeps> = {}): OpenWithService {
  const deps: OpenWithDeps = {
    run: async (bin, args) => {
      spawned.push({ bin, args: [...args] });
      const next = answers.shift();
      return next === undefined ? ok(JSON.stringify(TXT_ANSWER)) : next();
    },
    listProjectRoots: async () => [root],
    isAppBundle: async (path) => REAL_APPS.has(path),
    ...overrides
  };
  return createOpenWith(deps);
}

beforeEach(async () => {
  // realpath, because /var is a symlink to /private/var on macOS and every
  // path the service reports has already been resolved.
  scratch = await realpath(await mkdtemp(join(tmpdir(), 'gmux-openwith-')));
  root = join(scratch, 'proj');
  filePath = join(root, 'notes.txt');
  spawned = [];
  answers = [];
  await mkdir(root, { recursive: true });
  await writeFile(filePath, 'hello', 'utf8');
  await writeFile(join(root, 'photo.png'), 'x', 'utf8');
  service = build();
});

afterEach(async () => {
  await rm(scratch, { recursive: true, force: true });
});

async function payloadOf(promise: Promise<unknown>): Promise<GmuxErrorPayload> {
  try {
    await promise;
  } catch (err) {
    return JSON.parse((err as Error).message) as GmuxErrorPayload;
  }
  throw new Error('expected a rejection');
}

const noChooser = async (): Promise<string | null> => null;

// ---------------------------------------------------------------------------

describe('the lookup, parsed and cleaned', () => {
  it('dedupes by bundle id, keeps two apps that only look alike, and sorts', async () => {
    const answer = await service.apps({ root, path: 'notes.txt' });
    expect(answer.status).toBe('ready');
    if (answer.status !== 'ready') return;
    expect(answer.defaultApp?.name).toBe('TextEdit');
    expect(answer.apps.map((a) => a.name)).toEqual([
      'Bear',
      'Chromium',
      'Google Chrome',
      'Google Chrome for Testing'
    ]);
    // Four Chromium rows collapsed to one, and the default is not repeated.
    expect(answer.apps.filter((a) => a.name === 'Chromium')).toHaveLength(1);
    expect(answer.apps.some((a) => a.name === 'TextEdit')).toBe(false);
  });

  it('prefers the copy in /Applications over one in a build cache', () => {
    const cleaned = normalizeLookup(
      {
        defaultPath: null,
        rows: [
          { path: CHROMIUM_CACHE_1, name: 'Chromium', bundleId: 'org.chromium.Chromium' },
          {
            path: '/Applications/Chromium.app',
            name: 'Chromium',
            bundleId: 'org.chromium.Chromium'
          }
        ]
      },
      () => true
    );
    expect(cleaned.apps.map((a) => a.path)).toEqual(['/Applications/Chromium.app']);
  });

  it('never lists an app twice when the default is a copy the dedupe replaced', () => {
    const cleaned = normalizeLookup(
      {
        // macOS named the build-cache copy as the default; /Applications won.
        defaultPath: CHROMIUM_CACHE_1,
        rows: [
          { path: CHROMIUM_CACHE_1, name: 'Chromium', bundleId: 'org.chromium.Chromium' },
          {
            path: '/Applications/Chromium.app',
            name: 'Chromium',
            bundleId: 'org.chromium.Chromium'
          },
          { path: '/Applications/Bear.app', name: 'Bear', bundleId: 'net.shinyfrog.bear' }
        ]
      },
      () => true
    );
    expect(cleaned.defaultApp?.path).toBe('/Applications/Chromium.app');
    expect(cleaned.apps.map((a) => a.name)).toEqual(['Bear']);
  });

  it('drops a row whose bundle is no longer on disk', () => {
    const cleaned = normalizeLookup(
      {
        defaultPath: null,
        rows: [
          { path: '/Applications/Gone.app', name: 'Gone', bundleId: 'com.gone' },
          { path: '/Applications/Bear.app', name: 'Bear', bundleId: 'net.shinyfrog.bear' }
        ]
      },
      (path) => path === '/Applications/Bear.app'
    );
    expect(cleaned.apps.map((a) => a.name)).toEqual(['Bear']);
  });

  it('groups a bundle with no identifier by its own path', () => {
    const cleaned = normalizeLookup(
      {
        defaultPath: null,
        rows: [
          { path: '/Applications/A.app', name: 'A', bundleId: null },
          { path: '/Applications/B.app', name: 'B', bundleId: null }
        ]
      },
      () => true
    );
    expect(cleaned.apps.map((a) => a.name)).toEqual(['A', 'B']);
  });

  it('refuses output that is not the shape we asked for', () => {
    expect(parseLookup('not json')).toBeNull();
    expect(parseLookup('{"defaultPath":null}')).toBeNull();
    expect(parseLookup('{"defaultPath":null,"apps":[]}')).toEqual({
      defaultPath: null,
      rows: []
    });
  });
});

describe('the per-extension cache', () => {
  it('spawns once for the same extension', async () => {
    await service.apps({ root, path: 'notes.txt' });
    const second = await service.apps({ root, path: 'notes.txt' });
    expect(spawned).toHaveLength(1);
    expect(second.status).toBe('ready');
  });

  it('spawns again for a different extension', async () => {
    await service.apps({ root, path: 'notes.txt' });
    await service.apps({ root, path: 'photo.png' });
    expect(spawned).toHaveLength(2);
  });

  it('caches an empty answer, because "nothing claims it" is an answer', async () => {
    answers = [async () => ok('{"defaultPath":null,"apps":[]}')];
    const answer = await service.apps({ root, path: 'notes.txt' });
    expect(answer).toEqual({ status: 'ready', defaultApp: null, apps: [] });
    await service.apps({ root, path: 'notes.txt' });
    expect(spawned).toHaveLength(1);
  });

  it('coalesces two right clicks in flight into one spawn', async () => {
    answers = [
      async () => {
        await wait(20);
        return ok(JSON.stringify(TXT_ANSWER));
      }
    ];
    const [a, b] = await Promise.all([
      service.apps({ root, path: 'notes.txt' }),
      service.apps({ root, path: 'notes.txt' })
    ]);
    expect(spawned).toHaveLength(1);
    expect(a.status).toBe('ready');
    expect(b.status).toBe('ready');
  });
});

describe('the deadline', () => {
  it('is 90 ms, and the number is exported rather than spelled twice', () => {
    // The pairing with the renderer's own deadline is asserted in
    // src/renderer/tree/__tests__/open-with.test.ts, which is allowed to read
    // both numbers because every file under a __tests__ directory belongs to
    // tsconfig.tests.json (Phase 124), the one project that references both.
    // Production main code cannot import a renderer file, and after Phase 124
    // production renderer code cannot import a main file either.
    expect(OPEN_WITH_DEADLINE_MS).toBe(90);
  });

  it('degrades when the lookup overruns, then answers from the late fill', async () => {
    answers = [
      async () => {
        await wait(OPEN_WITH_DEADLINE_MS + 80);
        return ok(JSON.stringify(TXT_ANSWER));
      }
    ];
    const first = await service.apps({ root, path: 'notes.txt' });
    expect(first).toEqual({ status: 'unavailable' });

    // The lookup was NOT cancelled. Once it lands the cache holds it, so the
    // next right click is a hit with no second spawn.
    await wait(140);
    const second = await service.apps({ root, path: 'notes.txt' });
    expect(second.status).toBe('ready');
    expect(spawned).toHaveLength(1);
  });
});

describe('a lookup that fails caches nothing', () => {
  const cases: [string, () => Promise<GuardedRunResult>][] = [
    ['a non zero exit', async () => failed({ code: 2, stderr: 'boom' })],
    ['a spawn error', async () => failed({ code: null, spawnError: 'ENOENT' })],
    ['a timeout', async () => failed({ code: null, timedOut: true })],
    ['unparseable output', async () => ok('<<not json>>')]
  ];

  for (const [name, answer] of cases) {
    it(`${name} answers unavailable and retries next time`, async () => {
      answers = [answer];
      expect(await service.apps({ root, path: 'notes.txt' })).toEqual({
        status: 'unavailable'
      });
      await service.apps({ root, path: 'notes.txt' });
      expect(spawned).toHaveLength(2);
    });
  }
});

describe('the launch', () => {
  it('composes -a <app> <file> for a named app', async () => {
    const outcome = await service.open(
      {
        root,
        path: 'notes.txt',
        app: { kind: 'app', appPath: '/Applications/Bear.app' }
      },
      noChooser
    );
    expect(outcome).toEqual({ status: 'opened' });
    expect(spawned).toEqual([
      { bin: '/usr/bin/open', args: ['-a', '/Applications/Bear.app', filePath] }
    ]);
  });

  it('composes just the file for the default app', async () => {
    await service.open({ root, path: 'notes.txt', app: { kind: 'default' } }, noChooser);
    expect(spawned).toEqual([{ bin: '/usr/bin/open', args: [filePath] }]);
  });

  it('opens with the app the system panel returned', async () => {
    await service.open(
      { root, path: 'notes.txt', app: { kind: 'choose' } },
      async () => '/Applications/Bear.app'
    );
    expect(spawned).toEqual([
      { bin: '/usr/bin/open', args: ['-a', '/Applications/Bear.app', filePath] }
    ]);
  });

  it('says nothing when the user cancels the panel', async () => {
    const outcome = await service.open(
      { root, path: 'notes.txt', app: { kind: 'choose' } },
      noChooser
    );
    expect(outcome).toEqual({ status: 'canceled' });
    expect(spawned).toHaveLength(0);
  });

  it('reports what open printed when open refuses', async () => {
    answers = [async () => failed({ code: 1, stderr: 'Unable to find application\n' })];
    const outcome = await service.open(
      { root, path: 'notes.txt', app: { kind: 'default' } },
      noChooser
    );
    expect(outcome).toEqual({
      status: 'failed',
      message: 'Unable to find application'
    });
  });

  it('records the argv instead of spawning when the harness seam is armed', async () => {
    const recorded: Spawned[] = [];
    const recording = build({
      recordLaunch: async (bin, args) => {
        recorded.push({ bin, args: [...args] });
      }
    });
    const outcome = await recording.open(
      {
        root,
        path: 'notes.txt',
        app: { kind: 'app', appPath: '/Applications/Bear.app' }
      },
      noChooser
    );
    expect(outcome).toEqual({ status: 'opened' });
    expect(recorded).toEqual([
      { bin: '/usr/bin/open', args: ['-a', '/Applications/Bear.app', filePath] }
    ]);
    expect(spawned).toHaveLength(0);
  });
});

describe('the refusals', () => {
  it('refuses a pick that is not an application, and spawns nothing', async () => {
    const outcome = await service.open(
      { root, path: 'notes.txt', app: { kind: 'app', appPath: '/etc/passwd' } },
      noChooser
    );
    expect(outcome).toEqual({ status: 'failed', message: NOT_AN_APP_MESSAGE });
    expect(spawned).toHaveLength(0);
  });

  it('refuses a relative app path', async () => {
    const outcome = await service.open(
      { root, path: 'notes.txt', app: { kind: 'app', appPath: 'Bear.app' } },
      noChooser
    );
    expect(outcome).toEqual({ status: 'failed', message: NOT_AN_APP_MESSAGE });
  });

  it('refuses an app bundle that is gone from disk', async () => {
    const outcome = await service.open(
      {
        root,
        path: 'notes.txt',
        app: { kind: 'app', appPath: '/Applications/Deleted.app' }
      },
      noChooser
    );
    expect(outcome).toEqual({ status: 'failed', message: APP_MISSING_MESSAGE });
    expect(spawned).toHaveLength(0);
  });

  it('refuses a file that is no longer there', async () => {
    const outcome = await service.open(
      { root, path: 'vanished.txt', app: { kind: 'default' } },
      noChooser
    );
    expect(outcome).toEqual({ status: 'failed', message: FILE_MISSING_MESSAGE });
    expect(spawned).toHaveLength(0);
  });

  it('refuses a path outside the project before anything is spawned', async () => {
    const payload = await payloadOf(
      service.apps({ root, path: '../outside.txt' })
    );
    expect(payload.code).toBe('INVALID_INPUT');
    expect(spawned).toHaveLength(0);
  });

  it('refuses a root that is not an open project', async () => {
    const payload = await payloadOf(
      service.apps({ root: scratch, path: 'anything.txt' })
    );
    expect(payload.code).toBe('PROJECT_NOT_FOUND');
    expect(spawned).toHaveLength(0);
  });

  it('refuses .git at any depth', async () => {
    const payload = await payloadOf(
      service.apps({ root, path: '.git/config' })
    );
    expect(payload.code).toBe('INVALID_INPUT');
    expect(spawned).toHaveLength(0);
  });
});
