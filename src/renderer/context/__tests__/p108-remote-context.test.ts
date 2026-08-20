/**
 * Phase 108. Reading the Context of a project that lives on another machine,
 * from the store's side of the call.
 *
 * WHAT IS PROVED HERE, and each one is a thing that can silently go wrong:
 *
 *  1. **A remote target with the bridge reads, once, and the answer lands.**
 *     Before this phase the store refused the target and read nothing, and a
 *     regression back to that shape would look exactly like a slow machine.
 *  2. **Every mode the machine can answer lands as `ready`.** The refusal
 *     words carry `scan: null` and the word, and the view draws the sentence.
 *     A mode that landed as `error` would draw a raw string instead of the
 *     drafted copy.
 *  3. **A late answer after a project switch never paints.** The epoch rule
 *     is the only thing that can stop one, because nothing can call the read
 *     back once it is on the wire.
 *  4. **Pins are never asked for a remote scan.** `skillPins` re-hashes paths
 *     on THIS Mac's disk, and a remote row's path would hash a different file
 *     here or nothing. The map is empty and the channel is never called.
 *  5. **A build without the bridge is `elsewhere` and asks nothing.** That is
 *     the one honest meaning the word keeps after this phase.
 *
 * No process, no window and no view. The two bridges are fakes that record
 * what they were asked and answer when this file says so.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WorkspaceTarget } from '@shared/workspace-target';

/** Every folder the LOCAL reader was asked to read, in order. */
let scans: string[] = [];
/** Every call to the machine, in order. */
let readContexts: { machineId: string; cwd: string }[] = [];
/** Every call to the pin re-check, in order. Must stay empty for a machine. */
let pinAsks: string[][] = [];
/** Answers held back, so a late one can be shown never to paint. */
let held: (() => void)[] = [];
/** Hold every machine answer until this file releases it. */
let holding = false;
/** Set by a test to shape the next machine answer. */
let shape: Record<string, unknown> = {};
/** Set by a test to make the next machine call reject. */
let rejectNext: Error | null = null;

/** One skill row, structural, with only the fields the store touches. */
function skillEntry(id: string): Record<string, unknown> {
  return {
    id,
    category: 'skill',
    name: id,
    sourcePath: `/fixtures/${id}/SKILL.md`,
    realPath: `/fixtures/${id}/SKILL.md`
  };
}

/** The scan shape both readers answer with. */
function scanOf(cwd: string, entries: Record<string, unknown>[] = []) {
  return {
    entries,
    sections: [],
    problems: [],
    agents: [],
    cwd,
    scannedAt: 0,
    durationMs: 3,
    truncated: false
  };
}

/** What the machine answers, in the §5 contract shape. */
function contextAnswer(input: { machineId: string; cwd: string }) {
  return {
    machineId: input.machineId,
    machineLabel: 'Studio',
    cwd: input.cwd,
    mode: 'context',
    scan: scanOf(input.cwd, [skillEntry('remote-skill')]),
    passes: 2,
    calls: 2,
    cut: false,
    elapsedMs: 310,
    ...shape
  };
}

const gmux: Record<string, unknown> = {
  context: {
    scan: (input: { cwd: string }) => {
      scans.push(input.cwd);
      return Promise.resolve(scanOf(input.cwd, [skillEntry('local-skill')]));
    },
    skillPins: (paths: string[]) => {
      pinAsks.push(paths);
      return Promise.resolve([]);
    }
  },
  machines: {
    readContext: (input: { machineId: string; cwd: string }) => {
      readContexts.push(input);
      if (rejectNext !== null) {
        const err = rejectNext;
        rejectNext = null;
        return Promise.reject(err);
      }
      if (!holding) return Promise.resolve(contextAnswer(input));
      return new Promise((resolve) => {
        held.push(() => resolve(contextAnswer(input)));
      });
    }
  }
};

vi.stubGlobal('window', {
  addEventListener() {},
  removeEventListener() {},
  setTimeout,
  clearTimeout,
  gmux
});
vi.stubGlobal('localStorage', {
  getItem: () => null,
  setItem() {},
  removeItem() {}
});
vi.stubGlobal('document', {
  body: { classList: { add() {}, remove() {}, contains: () => false } },
  documentElement: { style: { setProperty() {} } },
  querySelector: () => null,
  addEventListener() {},
  removeEventListener() {}
});

const { remoteContextAvailable, useContext } = await import('../store');

const LOCAL: WorkspaceTarget = { machineId: 'local', path: '/l1' };
const REMOTE: WorkspaceTarget = { machineId: 'p108', path: '/home/greg/api' };

const store = (): ReturnType<typeof useContext.getState> =>
  useContext.getState();

/** Switch, then let the read's promises settle. */
async function switchTo(target: WorkspaceTarget | null): Promise<void> {
  store().syncProject(target);
  for (let i = 0; i < 4; i += 1) await Promise.resolve();
}

beforeEach(() => {
  scans = [];
  readContexts = [];
  pinAsks = [];
  held = [];
  holding = false;
  shape = {};
  rejectNext = null;
  useContext.setState({
    target: null,
    status: 'idle',
    scan: null,
    error: null,
    remoteMode: null,
    machineLabel: null,
    remoteCut: false,
    agentId: null,
    filter: '',
    mode: 'browse',
    sessionId: null,
    sessionName: null,
    pins: new Map(),
    epoch: 0
  });
});

describe('a remote target with the bridge', () => {
  it('reads once, over the machines bridge, and lands ready', async () => {
    expect(remoteContextAvailable()).toBe(true);

    await switchTo(REMOTE);

    expect(readContexts).toEqual([
      { machineId: 'p108', cwd: '/home/greg/api' }
    ]);
    expect(scans).toEqual([]);
    expect(store().status).toBe('ready');
    expect(store().scan?.entries).toHaveLength(1);
    expect(store().remoteMode).toBe('context');
    expect(store().machineLabel).toBe('Studio');
    expect(store().remoteCut).toBe(false);
  });

  it('carries the cut flag with the scan it describes', async () => {
    shape = { cut: true };
    await switchTo(REMOTE);
    expect(store().remoteCut).toBe(true);
  });

  it('reads again on refresh, and at no other time', async () => {
    await switchTo(REMOTE);
    expect(readContexts).toHaveLength(1);

    store().refresh();
    for (let i = 0; i < 4; i += 1) await Promise.resolve();

    expect(readContexts).toHaveLength(2);
  });

  it('lands each refusal word as ready with no scan, never as error', async () => {
    for (const mode of ['notConnected', 'noHome', 'unreachable'] as const) {
      shape = { mode, scan: null, cut: false };
      useContext.setState({ target: null });
      await switchTo(REMOTE);

      expect(store().status).toBe('ready');
      expect(store().scan).toBeNull();
      expect(store().remoteMode).toBe(mode);
      expect(store().machineLabel).toBe('Studio');
      expect(store().error).toBeNull();
    }
  });

  it('lands a rejected promise as error, because main never answered', async () => {
    rejectNext = new Error('the door fell over');
    await switchTo(REMOTE);
    expect(store().status).toBe('error');
    expect(store().error).toBe('the door fell over');
  });
});

describe('the epoch rule', () => {
  it('never paints a late machine answer over the project you switched to', async () => {
    holding = true;
    await switchTo(REMOTE);
    expect(held).toHaveLength(1);

    holding = false;
    await switchTo(LOCAL);
    expect(store().status).toBe('ready');
    expect(store().scan?.cwd).toBe('/l1');

    // The machine finally answers, for a tab nobody is on.
    held[0]?.();
    for (let i = 0; i < 4; i += 1) await Promise.resolve();

    expect(store().scan?.cwd).toBe('/l1');
    expect(store().remoteMode).toBeNull();
    expect(store().machineLabel).toBeNull();
  });
});

describe('pins on a remote scan', () => {
  it('never calls skillPins and holds an empty map', async () => {
    await switchTo(REMOTE);

    expect(store().scan?.entries).toHaveLength(1);
    expect(pinAsks).toEqual([]);
    expect(store().pins.size).toBe(0);
  });

  it('still calls skillPins for a folder on this Mac, so the contrast is real', async () => {
    await switchTo(LOCAL);
    for (let i = 0; i < 4; i += 1) await Promise.resolve();

    expect(pinAsks).toEqual([['/fixtures/local-skill']]);
  });
});

describe('a local read after a remote one', () => {
  it('clears the three machine fields with the rows they described', async () => {
    await switchTo(REMOTE);
    expect(store().remoteMode).toBe('context');

    await switchTo(LOCAL);

    expect(store().status).toBe('ready');
    expect(store().remoteMode).toBeNull();
    expect(store().machineLabel).toBeNull();
    expect(store().remoteCut).toBe(false);
  });
});

describe('a build without the bridge', () => {
  it('is elsewhere, and asks nothing', async () => {
    const machines = gmux['machines'];
    delete gmux['machines'];
    try {
      expect(remoteContextAvailable()).toBe(false);

      await switchTo(REMOTE);

      expect(store().status).toBe('elsewhere');
      expect(readContexts).toEqual([]);
      expect(scans).toEqual([]);
    } finally {
      gmux['machines'] = machines;
    }
  });
});
