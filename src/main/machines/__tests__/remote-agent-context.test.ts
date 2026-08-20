/**
 * Phase 108, the Context of a folder on another machine.
 *
 * The far side is replaced by a small emulator of the `context-read` record
 * grammar over an in-memory file map, so the WHOLE driver loop runs here: the
 * facts read, the miss loop, the chunking and the fold. What these tests hold
 * is the shape research 57 i7 ruled for:
 *
 *  - the loop converges inside the pass cap on a fixture that needs several
 *    passes
 *  - the environment the scan sees is EXACTLY the far side's facts, so two
 *    different facts payloads scan two different worlds and `CLAUDE_CONFIG_DIR`
 *    moves the claude root (the two-env test from i7 section 9)
 *  - an empty far side HOME refuses with `noHome` before anything is scanned,
 *    because `resolveHomes` would otherwise fall back to THIS Mac's home
 *  - no machine state ever throws
 *  - the two caps chunk a list into more calls rather than a bigger one
 *
 * WHAT THIS FILE CANNOT SHOW. It cannot show that a real machine answers this
 * grammar, what a call costs, or that the read wrote nothing over there. That
 * is `node build/probe-p108-context.mjs`, against a loopback scratch machine,
 * whose row 2 compares a remote read against a local scan of the same disk.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CONTEXT_READ_LIMITS } from '../../context/port';
import { createEmptyRemoteBundle } from '../../context/recording-fs';

let connected = new Set<string>();
let contextReady = new Set<string>();

vi.mock('../remote-run', () => ({
  machineIsConnected: (machineId: string) => connected.has(machineId),
  runRemoteRead: async (): Promise<never> => {
    throw new Error('these tests drive the runner seam, never the door');
  }
}));

vi.mock('../remote-sessions', () => ({
  readyRemoteContext: (machineId: string) => {
    if (!contextReady.has(machineId)) throw new Error('no connection');
    return { kind: 'remote', machineId };
  }
}));

vi.mock('../store', () => ({
  machineRow: (id: string) => (id === 'far' ? { id, label: 'Studio' } : null),
  machineLabelOf: (row: { id: string; label?: string }) => row.label ?? row.id
}));

const {
  CONTEXT_ANSWER_BUDGET_BYTES,
  CONTEXT_ENUM_DEPTH,
  CONTEXT_READ_MAX_PASSES,
  planContextReadCalls,
  readContextOnMachine,
  readRemoteContextWithRunner,
  splitMisses
} = await import('../remote-agent-context');
const { CONTEXT_READ_FILE_MAX_BYTES, CONTEXT_READ_LIST_MAX_BYTES } =
  await import('../remote-scripts');

// ---------------------------------------------------------------------------
// The far side, emulated over a file map
// ---------------------------------------------------------------------------

interface FarSide {
  readonly files: Record<string, string>;
  readonly facts: string;
}

/** Derived directory set: every ancestor of every file. */
function dirsOf(files: Record<string, string>): Set<string> {
  const dirs = new Set<string>();
  for (const path of Object.keys(files)) {
    let parent = path;
    for (;;) {
      const cut = parent.lastIndexOf('/');
      if (cut <= 0) break;
      parent = parent.slice(0, cut);
      dirs.add(parent);
    }
  }
  return dirs;
}

/** The record grammar the shipped script prints, over the map. */
function answerContextRead(world: FarSide, args: readonly string[]): string {
  const [enumerateList = '', depthWord = '2', readList = ''] = args;
  const depth = Number(depthWord);
  const dirs = dirsOf(world.files);
  const lines: string[] = [];
  const below = (base: string, path: string): number => {
    if (path === base) return 0;
    if (!path.startsWith(`${base}/`)) return -1;
    return path.slice(base.length + 1).split('/').length;
  };
  for (const root of enumerateList.split('\n')) {
    if (root.length === 0) continue;
    if (!dirs.has(root)) {
      lines.push(`X ${root}`);
      continue;
    }
    for (const dir of [...dirs].sort()) {
      const at = below(root, dir);
      if (at >= 0 && at <= depth) lines.push(`E d 100 96 ${dir}`);
    }
    for (const [file, text] of Object.entries(world.files)) {
      const at = below(root, file);
      if (at >= 1 && at <= depth) {
        lines.push(`E f 100 ${String(Buffer.byteLength(text))} ${file}`);
      }
    }
  }
  for (const path of readList.split('\n')) {
    if (path.length === 0) continue;
    const text = world.files[path];
    if (text !== undefined) {
      lines.push(`F ${String(Buffer.byteLength(text))} ${path}`);
      lines.push(Buffer.from(text).toString('base64'));
    } else if (dirs.has(path)) {
      lines.push(`E d 100 96 ${path}`);
    } else {
      lines.push(`X ${path}`);
    }
  }
  return lines.length === 0 ? 'none' : `${lines.join('\n')}\n`;
}

/** The runner seam, recording every call the driver makes. */
function runnerOver(world: FarSide): {
  calls: Array<{ script: string; args: string[] }>;
  run: (script: string, args: readonly string[]) => Promise<string>;
} {
  const calls: Array<{ script: string; args: string[] }> = [];
  return {
    calls,
    run: async (script, args) => {
      calls.push({ script, args: [...args] });
      if (script === 'machine-facts') return world.facts;
      return answerContextRead(world, args);
    }
  };
}

const FACTS = 'home=/far/home\ncodex_home=\nxdg_data_home=\nuname=Linux\n';

const input = { machineId: 'far', cwd: '/far/proj' };

beforeEach(() => {
  connected = new Set(['far']);
  contextReady = new Set(['far']);
});

// ---------------------------------------------------------------------------
// The loop
// ---------------------------------------------------------------------------

describe('readRemoteContextWithRunner', () => {
  it('converges inside the pass cap and finds the far configuration', async () => {
    const world: FarSide = {
      facts: FACTS,
      files: {
        '/far/home/.claude/skills/alpha/SKILL.md':
          '---\nname: alpha\ndescription: a far skill\n---\nbody\n',
        '/far/proj/.claude/skills/beta/SKILL.md':
          '---\nname: beta\ndescription: a project skill\n---\nbody\n'
      }
    };
    const seam = runnerOver(world);
    const out = await readRemoteContextWithRunner(input, seam.run);
    expect(out.mode).toBe('context');
    expect(out.machineLabel).toBe('Studio');
    expect(out.cut).toBe(false);
    expect(out.passes).toBeGreaterThanOrEqual(2);
    expect(out.passes).toBeLessThanOrEqual(CONTEXT_READ_MAX_PASSES);
    expect(seam.calls[0]?.script).toBe('machine-facts');
    expect(out.calls).toBe(seam.calls.length);
    const names = (out.scan?.entries ?? [])
      .filter((one) => one.category === 'skill')
      .map((one) => one.name)
      .sort();
    expect(names).toContain('alpha');
    expect(names).toContain('beta');
    // Every root readout points at the far side, never at this Mac's home.
    // The one absolute location, being the managed settings path, names the
    // SAME path on that machine and is allowed through.
    for (const agent of out.scan?.agents ?? []) {
      for (const root of agent.roots) {
        expect(
          root.path.startsWith('/far/') || root.path.startsWith('/Library/')
        ).toBe(true);
      }
    }
    // Every context-read call sent depth 2.
    for (const call of seam.calls.slice(1)) {
      expect(call.script).toBe('context-read');
      expect(call.args[1]).toBe(String(CONTEXT_ENUM_DEPTH));
    }
  });

  it('scans two different worlds under two different facts payloads', async () => {
    const world: FarSide = { facts: FACTS, files: {} };
    const seam = runnerOver(world);
    const first = await readRemoteContextWithRunner(input, seam.run);
    const other = runnerOver({
      facts: 'home=/other/place\nuname=Linux\n',
      files: {}
    });
    const second = await readRemoteContextWithRunner(input, other.run);
    const rootsOf = (out: typeof first): string[] =>
      (out.scan?.agents ?? []).flatMap((agent) =>
        agent.roots.map((root) => root.path)
      );
    const firstRoots = rootsOf(first);
    const secondRoots = rootsOf(second);
    expect(firstRoots.some((one) => one.startsWith('/far/home/'))).toBe(true);
    expect(secondRoots.some((one) => one.startsWith('/other/place/'))).toBe(
      true
    );
    expect(firstRoots.some((one) => one.startsWith('/other/place/'))).toBe(
      false
    );
  });

  it('CLAUDE_CONFIG_DIR from the facts moves the claude root', async () => {
    const seam = runnerOver({
      facts: `${FACTS}claude_config_dir=/far/moved-claude\n`,
      files: {}
    });
    await readRemoteContextWithRunner(input, seam.run);
    const asked = seam.calls
      .slice(1)
      .flatMap((call) => (call.args[0] ?? '').split('\n'));
    expect(asked).toContain('/far/moved-claude/skills');
    expect(asked.some((one) => one === '/far/home/.claude/skills')).toBe(false);
  });

  it('an empty far side HOME refuses with noHome and reads nothing', async () => {
    const seam = runnerOver({ facts: 'home=\nuname=Linux\n', files: {} });
    const out = await readRemoteContextWithRunner(input, seam.run);
    expect(out.mode).toBe('noHome');
    expect(out.scan).toBeNull();
    expect(
      seam.calls.filter((call) => call.script === 'context-read')
    ).toEqual([]);
  });

  it('a runner that throws is a machine that did not answer, never a throw', async () => {
    const out = await readRemoteContextWithRunner(input, async () => {
      throw new Error('link dropped');
    });
    expect(out.mode).toBe('unreachable');
    expect(out.scan).toBeNull();
    const late = runnerOver({ facts: FACTS, files: {} });
    const dropAfterFacts = async (
      script: string,
      args: readonly string[]
    ): Promise<string> => {
      if (script === 'machine-facts') return late.run(script, args);
      throw new Error('link dropped mid loop');
    };
    const second = await readRemoteContextWithRunner(input, dropAfterFacts);
    expect(second.mode).toBe('unreachable');
  });

  it('a relative cwd scans global scope only rather than resolving here', async () => {
    const seam = runnerOver({ facts: FACTS, files: {} });
    const out = await readRemoteContextWithRunner(
      { machineId: 'far', cwd: 'not-absolute' },
      seam.run
    );
    expect(out.mode).toBe('context');
    expect(out.scan?.cwd).toBeNull();
    const asked = seam.calls
      .slice(1)
      .flatMap((call) =>
        [call.args[0] ?? '', call.args[2] ?? ''].flatMap((list) =>
          list.split('\n')
        )
      );
    expect(
      asked.every(
        (one) =>
          one === '' || one.startsWith('/far/') || one.startsWith('/Library/')
      )
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// The production door's own refusal
// ---------------------------------------------------------------------------

describe('readContextOnMachine', () => {
  it('refuses while not connected, sending nothing', async () => {
    connected = new Set();
    const out = await readContextOnMachine(input);
    expect(out.mode).toBe('notConnected');
    expect(out.calls).toBe(0);
    expect(out.scan).toBeNull();
  });

  it('a connection that is not ready is the same refusal', async () => {
    contextReady = new Set();
    const out = await readContextOnMachine(input);
    expect(out.mode).toBe('notConnected');
  });
});

// ---------------------------------------------------------------------------
// The caps
// ---------------------------------------------------------------------------

describe('the caps', () => {
  it('the file cap IS the reader big json cap, asserted because remote-scripts imports nothing', () => {
    expect(CONTEXT_READ_FILE_MAX_BYTES).toBe(
      CONTEXT_READ_LIMITS.bigJsonMaxBytes
    );
  });

  it('a list over the byte cap becomes more calls in the same pass', () => {
    const wide = Array.from(
      { length: 3000 },
      (_, at) => `/far/home/.claude/skills/skill-${String(at)}/SKILL.md`
    );
    const calls = planContextReadCalls([], wide, () => 100);
    expect(calls.length).toBeGreaterThan(1);
    for (const call of calls) {
      const bytes =
        Buffer.byteLength(call.enumerate.join('\n'), 'utf8') +
        Buffer.byteLength(call.read.join('\n'), 'utf8');
      expect(bytes).toBeLessThanOrEqual(CONTEXT_READ_LIST_MAX_BYTES);
    }
    expect(calls.flatMap((call) => [...call.read])).toEqual(wide);
  });

  it('the answer budget chunks known-heavy reads, one oversized file alone', () => {
    const heavy = ['/far/a.json', '/far/b.json', '/far/c.json'];
    const calls = planContextReadCalls([], heavy, () => 10_000_000);
    expect(calls.length).toBe(3);
    const alone = planContextReadCalls(
      [],
      ['/far/huge.json'],
      () => CONTEXT_ANSWER_BUDGET_BYTES * 4
    );
    expect(alone.length).toBe(1);
    expect(alone[0]?.read).toEqual(['/far/huge.json']);
  });

  it('an unknown size counts as the reader default per file cap', () => {
    const calls = planContextReadCalls(
      [],
      ['/far/one.md', '/far/two.md', '/far/three.md', '/far/four.md', '/far/five.md'],
      () => null
    );
    // Five unknowns at 4 MiB each is 20 MiB against a 16 MiB budget, so the
    // plan is two calls, four then one.
    expect(calls.map((call) => call.read.length)).toEqual([4, 1]);
  });
});

// ---------------------------------------------------------------------------
// What is never sent
// ---------------------------------------------------------------------------

describe('splitMisses', () => {
  it('pins a path no list can carry instead of sending it', () => {
    const bundle = createEmptyRemoteBundle();
    const out = splitMisses(bundle, [
      { path: '/far/ok-dir', method: 'readDir' },
      { path: '/far/ok.md', method: 'readText' },
      { path: 'relative/never', method: 'readDir' },
      { path: '/far/holds\nnewline', method: 'readText' },
      { path: '/far/glob-*', method: 'stat' }
    ]);
    expect(out.enumerate).toEqual(['/far/ok-dir']);
    expect(out.read).toEqual(['/far/ok.md']);
    expect(bundle.absent.has('relative/never')).toBe(true);
    expect(bundle.absent.has('/far/holds\nnewline')).toBe(true);
    expect(bundle.absent.has('/far/glob-*')).toBe(true);
  });
});
