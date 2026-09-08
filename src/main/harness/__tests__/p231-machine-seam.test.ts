/**
 * Phase 231 — the liveness seam: its three refusals, its parser dropping a
 * file whole, and each command reaching the arm the real event takes.
 *
 * Everything the seam reaches is replaced and counted, so this file proves
 * routing and proves nothing about a machine. `watchSeamFile` is driven over
 * a real file in a temp directory, because the one thing a probe waits on is
 * the applied line, and a sequence applied twice is a matrix cell read twice.
 */

import { mkdtempSync, rmSync, writeFileSync, utimesSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('electron', () => ({
  app: { getPath: () => '/nowhere/profile' }
}));
vi.mock('../../machines/control-plane', () => ({
  setMachineFactsForHarness: () => undefined,
  noteMachineFeedUnknown: () => undefined
}));
vi.mock('../../machines/remote-sessions', () => ({
  markMachineFeedMissed: () => undefined,
  markMachineQuiet: () => undefined
}));
vi.mock('../../power', () => ({
  fireMachineWake: () => undefined
}));

const {
  applySeamCommand,
  machineSeamPath,
  parseSeamFile,
  watchSeamFile,
  SEAM_POLL_MS
} = await import('../machine-seam');

type Deps = Parameters<typeof applySeamCommand>[1];

function countingDeps(): { deps: Deps; calls: string[] } {
  const calls: string[] = [];
  const deps: Deps = {
    setFacts: (machineId, over) => {
      calls.push(`set:${machineId}:${JSON.stringify(over)}`);
    },
    linkQuiet: (machineId, reason) => {
      calls.push(`quiet:${machineId}:${reason}`);
    },
    feedMissed: (machineId, errorClass) => {
      calls.push(`missed:${machineId}:${errorClass}`);
    },
    feedUnknown: (machineId) => {
      calls.push(`unknown:${machineId}`);
    },
    wake: () => {
      calls.push('wake');
    }
  };
  return { deps, calls };
}

describe('machineSeamPath, the three refusals', () => {
  const inside = '/h/dir/profile';
  it('answers the path on an isolated launch on a harness profile', () => {
    expect(
      machineSeamPath(
        { GMUX_SHOT_MACHINE_SEAM: '/h/dir/seam.json', GMUX_SHOT: '/h/x.png', GMUX_HARNESS_DIR: '/h/dir' },
        inside
      )
    ).toBe('/h/dir/seam.json');
    expect(
      machineSeamPath(
        { GMUX_SHOT_MACHINE_SEAM: '/h/dir/seam.json', GMUX_PROBES: '1', GMUX_HARNESS_DIR: '/h/dir' },
        inside
      )
    ).toBe('/h/dir/seam.json');
  });

  it('refuses an ordinary launch, a missing harness dir and a profile outside it', () => {
    expect(
      machineSeamPath({ GMUX_SHOT_MACHINE_SEAM: '/h/dir/seam.json', GMUX_HARNESS_DIR: '/h/dir' }, inside)
    ).toBeNull();
    expect(
      machineSeamPath({ GMUX_SHOT_MACHINE_SEAM: '/h/dir/seam.json', GMUX_SHOT: '/h/x.png' }, inside)
    ).toBeNull();
    expect(
      machineSeamPath(
        { GMUX_SHOT_MACHINE_SEAM: '/h/dir/seam.json', GMUX_SHOT: '/h/x.png', GMUX_HARNESS_DIR: '/h/dir' },
        '/Users/somebody/Library/Application Support/Tortie'
      )
    ).toBeNull();
    expect(machineSeamPath({ GMUX_SHOT: '/h/x.png', GMUX_HARNESS_DIR: '/h/dir' }, inside)).toBeNull();
  });
});

describe('parseSeamFile drops a file whole', () => {
  it('reads the documented shape', () => {
    const read = parseSeamFile(
      JSON.stringify({
        seq: 2,
        commands: [
          { op: 'link', machineId: 'studio', link: 'quiet' },
          { op: 'feed', machineId: 'studio', feed: 'missed' },
          { op: 'wake' }
        ]
      })
    );
    expect(read.reason).toBeNull();
    expect(read.file?.seq).toBe(2);
    expect(read.file?.commands).toHaveLength(3);
  });

  it.each([
    ['not json', 'not JSON'],
    ['[]', 'top level'],
    ['{"seq":-1,"commands":[]}', 'seq'],
    ['{"seq":1.5,"commands":[]}', 'seq'],
    ['{"seq":1}', 'commands'],
    ['{"seq":1,"commands":[{"op":"link","machineId":"","link":"quiet"}]}', 'machineId'],
    ['{"seq":1,"commands":[{"op":"link","machineId":"s","link":"dead"}]}', 'link'],
    ['{"seq":1,"commands":[{"op":"feed","machineId":"s","feed":"up"}]}', 'feed'],
    ['{"seq":1,"commands":[{"op":"kill","machineId":"s"}]}', 'op'],
    ['{"seq":1,"commands":[{"op":"wake"},{"op":"link","machineId":"s","link":"quiet","reason":7}]}', 'reason']
  ])('refuses %s naming %s', (text, named) => {
    const read = parseSeamFile(text);
    expect(read.file).toBeNull();
    expect(read.reason).toContain(named);
  });
});

describe('applySeamCommand takes the arm the real event takes', () => {
  it('routes quiet through the feed own markMachineQuiet, so rows go unknown', () => {
    const { deps, calls } = countingDeps();
    applySeamCommand({ op: 'link', machineId: 'studio', link: 'quiet' }, deps);
    expect(calls).toEqual(['quiet:studio:the harness seam cut it']);
  });

  it('writes every other link straight onto the record', () => {
    const { deps, calls } = countingDeps();
    applySeamCommand({ op: 'link', machineId: 'studio', link: 'polling', reason: 'x' }, deps);
    expect(calls).toEqual(['set:studio:{"link":"polling","reason":"x"}']);
  });

  it('routes missed through the poll own arm and unknown through the wake own', () => {
    const { deps, calls } = countingDeps();
    applySeamCommand({ op: 'feed', machineId: 'studio', feed: 'missed' }, deps);
    applySeamCommand({ op: 'feed', machineId: 'studio', feed: 'unknown' }, deps);
    applySeamCommand({ op: 'feed', machineId: 'studio', feed: 'listed' }, deps);
    expect(calls).toEqual([
      'missed:studio:the harness seam',
      'unknown:studio',
      'set:studio:{"feed":"listed"}'
    ]);
  });

  it('fires the wake', () => {
    const { deps, calls } = countingDeps();
    applySeamCommand({ op: 'wake' }, deps);
    expect(calls).toEqual(['wake']);
  });
});

describe('watchSeamFile applies each sequence once', () => {
  let dir = '';
  let stop: (() => void) | null = null;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'p231-seam-'));
  });
  afterEach(() => {
    stop?.();
    stop = null;
    rmSync(dir, { recursive: true, force: true });
  });

  const settle = (): Promise<void> => new Promise((r) => setTimeout(r, SEAM_POLL_MS * 3));

  /** Write and move the clock on, so a same-millisecond rewrite is seen. */
  function put(path: string, text: string, tick: number): void {
    writeFileSync(path, text);
    const at = new Date(Date.now() + tick * 1000);
    utimesSync(path, at, at);
  }

  it('applies a new seq once, ignores a rewrite of the same seq, and refuses a bad file', async () => {
    const path = join(dir, 'seam.json');
    const { deps, calls } = countingDeps();
    const said: string[] = [];
    put(path, JSON.stringify({ seq: 1, commands: [{ op: 'wake' }] }), 1);
    stop = watchSeamFile(path, deps, (line) => said.push(line));
    await settle();
    expect(calls).toEqual(['wake']);
    expect(said).toEqual(['[gmux-seam] applied seq=1 [{"op":"wake"}]']);

    // The same sequence written again is not applied again.
    put(path, JSON.stringify({ seq: 1, commands: [{ op: 'wake' }] }), 2);
    await settle();
    expect(calls).toEqual(['wake']);

    // A bad file is refused whole and said once.
    put(path, '{"seq":2,"commands":[{"op":"kill","machineId":"s"}]}', 3);
    await settle();
    expect(calls).toEqual(['wake']);
    expect(said.at(-1)).toContain('refused the file whole');

    // The next sequence applies, in order.
    put(
      path,
      JSON.stringify({
        seq: 2,
        commands: [
          { op: 'feed', machineId: 'studio', feed: 'missed' },
          { op: 'link', machineId: 'studio', link: 'quiet' }
        ]
      }),
      4
    );
    await settle();
    expect(calls).toEqual(['wake', 'missed:studio:the harness seam', 'quiet:studio:the harness seam cut it']);
  });
});
