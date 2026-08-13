/**
 * The launch context snapshot writer, and the four rules that keep it away
 * from durability (Phase 22, research 29 §8.2).
 *
 * ## Why the cases look like this
 *
 * This module runs on the session create path and the restore path. Those are
 * the two paths where a wrong answer costs the user a session or a
 * conversation, and the snapshot's whole claim to being safe there is that it
 * cannot affect either. A test that only checked "the snapshot is written
 * correctly" would prove nothing about that claim.
 *
 * So the cases drive the writer against resolvers that a real one cannot be
 * made to be on demand: one that throws, one that never settles, one that
 * returns nonsense, one that returns rows with fields missing, and one that
 * returns more rows than the record will hold. In every case the assertion is
 * the same shape, being that the failure produced no snapshot and no
 * exception.
 *
 * The manifest sink is a stub rather than a real store here. What is under
 * test is the writer's behaviour, and the column round trip has its own file
 * at `manifest/__tests__/context-snapshot.test.ts` against a real SQLite file.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  CONTEXT_SNAPSHOT_BUDGET_MS,
  captureAndStore,
  captureContextSnapshot,
  hasContextResolver,
  recordLaunchContext,
  setContextResolver,
  type ContextResolveResult
} from '../snapshot';
import {
  CONTEXT_HASH_CHARS,
  CONTEXT_SNAPSHOT_MAX_ENTRIES,
  CONTEXT_SNAPSHOT_VERSION,
  type ContextSnapshot
} from '@shared/context-snapshot';

/** A sink that records what it was handed and nothing else. */
function sink(): {
  setContextSnapshot: (id: string, s: ContextSnapshot) => void;
  written: { id: string; snapshot: ContextSnapshot }[];
} {
  const written: { id: string; snapshot: ContextSnapshot }[] = [];
  return {
    written,
    setContextSnapshot: (id, snapshot) => {
      written.push({ id, snapshot });
    }
  };
}

function row(id: string, hash = 'a'.repeat(64)): Record<string, unknown> {
  return {
    id,
    category: 'skill',
    name: id,
    scope: 'global',
    sourcePath: `/Users/x/.agents/skills/${id}/SKILL.md`,
    hash
  };
}

const launch = {
  sessionId: 's1',
  reason: 'create' as const,
  agent: 'claude',
  cwd: '/Users/x/work/repo'
};

afterEach(() => {
  setContextResolver(null);
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// The happy path, so the failures below mean something
// ---------------------------------------------------------------------------

describe('the record it writes', () => {
  it('carries the version, the reason, the agent and the directory', async () => {
    setContextResolver(() => ({ entries: [row('impeccable')] as never }));
    const store = sink();
    const snapshot = await captureAndStore(store, launch);
    expect(snapshot).toMatchObject({
      v: CONTEXT_SNAPSHOT_VERSION,
      reason: 'create',
      agent: 'claude',
      cwd: '/Users/x/work/repo'
    });
    expect(store.written).toHaveLength(1);
    expect(store.written[0]?.id).toBe('s1');
  });

  it('truncates every hash to the length the record stores', async () => {
    setContextResolver(() => ({ entries: [row('a')] as never }));
    const snapshot = await captureContextSnapshot(launch);
    expect(snapshot?.entries[0]?.hash).toHaveLength(CONTEXT_HASH_CHARS);
  });

  it('keeps a row whose hash is NULL, which is what a no-hash scan produces', async () => {
    // `ContextEntry.hash` in src/shared/context.ts is `string | null`, and it
    // is null whenever the scan ran with hashing off. That is the common case,
    // not an edge, so it gets its own assertion rather than riding on the
    // undefined one below.
    setContextResolver(() => ({
      entries: [{ ...row('a'), hash: null }] as never
    }));
    const snapshot = await captureContextSnapshot(launch);
    expect(snapshot?.entries).toHaveLength(1);
    expect(snapshot?.entries[0]?.hash).toBe('');
  });

  it('keeps a row whose hash is missing, with an empty hash', async () => {
    // A row with no hash is a real thing the session really loaded. Dropping
    // it would under-report the configuration; giving it a fake hash would
    // make it compare as changed on the next refresh. Empty is the third
    // answer and it is the true one.
    const noHash = row('a');
    delete noHash['hash'];
    setContextResolver(() => ({ entries: [noHash] as never }));
    const snapshot = await captureContextSnapshot(launch);
    expect(snapshot?.entries).toHaveLength(1);
    expect(snapshot?.entries[0]?.hash).toBe('');
  });

  it('folds a rich resolver row down to the six stored fields', async () => {
    setContextResolver(() => ({
      entries: [
        {
          ...row('a'),
          summary: 'a description the manifest must not carry per session',
          agents: ['claude', 'codex'],
          state: 'active',
          executes: { commands: ['curl evil.example'] }
        }
      ] as never
    }));
    const snapshot = await captureContextSnapshot(launch);
    expect(Object.keys(snapshot?.entries[0] ?? {}).sort()).toEqual([
      'category',
      'hash',
      'id',
      'name',
      'scope',
      'sourcePath'
    ]);
  });

  it('carries the unknown categories through as a first class value', async () => {
    setContextResolver(() => ({
      entries: [row('a')] as never,
      unknown: ['hook', 'plugin']
    }));
    const snapshot = await captureContextSnapshot(launch);
    expect(snapshot?.unknown).toEqual(['hook', 'plugin']);
  });

  it('records how long the scan took, so the cost claim stays checkable', async () => {
    setContextResolver(() => ({ entries: [] }));
    const snapshot = await captureContextSnapshot(launch);
    expect(typeof snapshot?.tookMs).toBe('number');
  });

  it('separates "resolved nothing" from "could not resolve"', async () => {
    // An agent that genuinely loads nothing gets a record with an empty list,
    // which is a real answer. Only a failure gets null.
    setContextResolver(() => ({ entries: [] }));
    const snapshot = await captureContextSnapshot(launch);
    expect(snapshot).not.toBeNull();
    expect(snapshot?.entries).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Rule 1: advisory. Nothing here may throw at a launch path.
// ---------------------------------------------------------------------------

describe('rule 1 — it can never fail a launch', () => {
  it('writes nothing and throws nothing when no resolver is installed', async () => {
    expect(hasContextResolver()).toBe(false);
    const store = sink();
    await expect(captureAndStore(store, launch)).resolves.toBeNull();
    expect(store.written).toEqual([]);
  });

  it('returns null when the resolver throws', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    setContextResolver(() => {
      throw new Error('ENOENT: no such directory');
    });
    await expect(captureContextSnapshot(launch)).resolves.toBeNull();
  });

  it('returns null when the resolver rejects', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    setContextResolver(() => Promise.reject(new Error('EACCES')));
    await expect(captureContextSnapshot(launch)).resolves.toBeNull();
  });

  it('returns null when the resolver hands back something that is not a result', async () => {
    setContextResolver(() => null as unknown as ContextResolveResult);
    await expect(captureContextSnapshot(launch)).resolves.toBeNull();
  });

  it('returns null when the entries are not an array', async () => {
    setContextResolver(
      () => ({ entries: 'everything' }) as unknown as ContextResolveResult
    );
    await expect(captureContextSnapshot(launch)).resolves.toBeNull();
  });

  it('returns null rather than an empty list when no row survives the checks', async () => {
    // An empty list would tell the user this session loaded nothing. A
    // scanner producing a shape this build cannot read is a fact about the
    // scanner, and it must not be reported as a fact about the session.
    setContextResolver(() => ({ entries: [{ nope: true }] as never }));
    await expect(captureContextSnapshot(launch)).resolves.toBeNull();
  });

  it('swallows a sink that throws, e.g. a session discarded mid-scan', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    setContextResolver(() => ({ entries: [row('a')] as never }));
    const throwing = {
      setContextSnapshot: () => {
        throw new Error('No manifest row for session s1');
      }
    };
    await expect(captureAndStore(throwing, launch)).resolves.toBeNull();
  });

  it('gives a caller of recordLaunchContext nothing to await or handle', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    setContextResolver(() => {
      throw new Error('boom');
    });
    const store = sink();
    // The launch paths call it exactly like this. If this line could throw or
    // return a rejected promise, a create would fail on a scan.
    expect(() => {
      recordLaunchContext(store, launch);
    }).not.toThrow();
    expect(recordLaunchContext(store, launch)).toBeUndefined();
    // Let the detached work settle so an unhandled rejection would surface.
    await new Promise((r) => setTimeout(r, 10));
    expect(store.written).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// The deadline
// ---------------------------------------------------------------------------

describe('the deadline', () => {
  it('gives up on a resolver that never settles, and writes nothing', async () => {
    vi.useFakeTimers();
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    setContextResolver(() => new Promise<ContextResolveResult>(() => undefined));
    const store = sink();
    const pending = captureAndStore(store, launch);
    await vi.advanceTimersByTimeAsync(CONTEXT_SNAPSHOT_BUDGET_MS + 1);
    await expect(pending).resolves.toBeNull();
    expect(store.written).toEqual([]);
    vi.useRealTimers();
  });

  it('does not wait for the deadline when the resolver is quick', async () => {
    setContextResolver(() => ({ entries: [row('a')] as never }));
    const startedAt = Date.now();
    await captureContextSnapshot(launch);
    // The budget is 3 s. A test that took anywhere near it would mean the
    // timer arm is being awaited rather than raced.
    expect(Date.now() - startedAt).toBeLessThan(1_000);
  });
});

// ---------------------------------------------------------------------------
// The cap
// ---------------------------------------------------------------------------

describe('the entry cap', () => {
  it('cuts the list and says so, rather than writing an unbounded blob', async () => {
    const many = Array.from({ length: CONTEXT_SNAPSHOT_MAX_ENTRIES + 25 }, (_, i) =>
      row(`skill-${String(i)}`)
    );
    setContextResolver(() => ({ entries: many as never }));
    const snapshot = await captureContextSnapshot(launch);
    expect(snapshot?.entries).toHaveLength(CONTEXT_SNAPSHOT_MAX_ENTRIES);
    expect(snapshot?.truncated).toBe(true);
  });

  it('does not mark an ordinary machine truncated', async () => {
    // The measured resolved set is 33 rows. The flag must be absent, not
    // false, so the readout's "cut short" sentence never appears for it.
    setContextResolver(() => ({
      entries: Array.from({ length: 33 }, (_, i) => row(`s${String(i)}`)) as never
    }));
    const snapshot = await captureContextSnapshot(launch);
    expect(snapshot?.truncated).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Rule 3: a restore re-snapshots
// ---------------------------------------------------------------------------

describe('rule 3 — a restore re-snapshots', () => {
  it('records the restore reason, not the create one', async () => {
    setContextResolver(() => ({ entries: [row('a')] as never }));
    const store = sink();
    await captureAndStore(store, { ...launch, reason: 'restore' });
    expect(store.written[0]?.snapshot.reason).toBe('restore');
  });

  it('writes a second record for the same session', async () => {
    // A restored session genuinely re-read its configuration. Keeping the
    // first record would be a lie with a timestamp on it.
    setContextResolver(() => ({ entries: [row('a')] as never }));
    const store = sink();
    await captureAndStore(store, launch);
    setContextResolver(() => ({ entries: [row('a'), row('b')] as never }));
    await captureAndStore(store, { ...launch, reason: 'restore' });
    expect(store.written).toHaveLength(2);
    expect(store.written[1]?.snapshot.entries).toHaveLength(2);
  });
});
