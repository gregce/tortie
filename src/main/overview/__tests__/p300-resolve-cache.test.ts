/**
 * The resolver's memory of one answer (Phase 300, finding C5).
 *
 * Every test here runs against a scratch home built in the temp directory.
 * **Nothing reads the operator's own `~/.claude/projects`**, and nothing here
 * asserts a timing: the 19.5 ms median and the 575 of 659 ms the phase entry
 * quotes were measured over his real store on 2026-09-19 and are not
 * re-measurable in a worktree. What is driven here is the RULE — what may be
 * remembered, for how long, under what key, how many, and every case in which
 * a remembered answer must not be believed.
 *
 * The five ablations this file owns, each of which must go red on the clause
 * that owns it:
 *
 *  - the cache keyed without the home        -> "two homes in one process"
 *  - the cache with no TTL                   -> "the window bounds the staleness"
 *  - the cache covering the direct stat      -> "a first turn at the direct path"
 *  - the cache unbounded                     -> "the bound, and what falls out"
 *  - a provider other than claude cached     -> "claude's cache alone"
 */

import * as fs from 'node:fs';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { resolveSessionLog } from '../reader';
import {
  createResolveCache,
  RESOLVE_CACHE_MAX,
  RESOLVE_CACHE_TTL_MS,
  type ResolveCache
} from '../reader/resolve-cache';
import { scratchDir } from './reader-helpers';

const CWD = '/Users/dev/demo-app';
/** `dashEncodeClaudeCwd(CWD)`, spelled out so a test never asks the product. */
const DIRECT_DIR = '-Users-dev-demo-app';
const ELSEWHERE_DIR = '-Users-dev-somewhere-else';

const homes: string[] = [];

function freshHome(name: string): string {
  const h = scratchDir(`p300-${name}`);
  homes.push(h);
  fs.mkdirSync(join(h, '.claude', 'projects'), { recursive: true });
  return h;
}

/** One synthesised record. The resolver only ever stats it. */
function plant(home: string, dir: string, id: string): string {
  const d = join(home, '.claude', 'projects', dir);
  fs.mkdirSync(d, { recursive: true });
  const p = join(d, `${id}.jsonl`);
  fs.writeFileSync(p, '{"type":"summary"}\n');
  return p;
}

function resolveClaude(
  home: string,
  id: string,
  cache?: ResolveCache,
  cwd = CWD
): ReturnType<typeof resolveSessionLog> {
  return resolveSessionLog(
    { agent: 'claude', agentSessionId: id, cwd, createdAt: Date.now(), storePathHint: null },
    { home, env: {}, cache }
  );
}

let clock = 1_700_000_000_000;
const ticking = (): number => clock;

afterAll(() => {
  for (const h of homes) fs.rmSync(h, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// What is remembered, and what is not
// ---------------------------------------------------------------------------

describe('what the resolver may remember', () => {
  it('remembers the fallback falling off its end, and answers from that memory', () => {
    const home = freshHome('remember');
    const cache = createResolveCache({ now: ticking });
    const id = '11111111-2222-4333-8444-000000000001';

    expect(resolveClaude(home, id, cache).state).toBe('no-file');
    expect(cache.size).toBe(1);

    // The record now exists, but NOT at the direct path, so only the loop
    // could find it. Inside the window the remembered answer stands, which is
    // the proof the loop was skipped: the filesystem says otherwise.
    plant(home, ELSEWHERE_DIR, id);
    expect(resolveClaude(home, id, cache).state).toBe('no-file');
  });

  it('the window bounds the staleness: after the TTL the loop runs again and finds it', () => {
    const home = freshHome('ttl-loop');
    const cache = createResolveCache({ now: ticking });
    const id = '11111111-2222-4333-8444-000000000002';

    expect(resolveClaude(home, id, cache).state).toBe('no-file');
    const placed = plant(home, ELSEWHERE_DIR, id);
    expect(resolveClaude(home, id, cache).state).toBe('no-file');

    clock += RESOLVE_CACHE_TTL_MS;
    const after = resolveClaude(home, id, cache);
    expect(after.state).toBe('resolved');
    expect((after as { file: string }).file).toBe(placed);
  });

  it('a first turn at the direct path is found on the very next ask, with no wait', () => {
    const home = freshHome('direct');
    const cache = createResolveCache({ now: ticking });
    const id = '11111111-2222-4333-8444-000000000003';

    expect(resolveClaude(home, id, cache).state).toBe('no-file');
    expect(cache.size).toBe(1);

    // The normal first turn writes HERE. The direct stat runs above the cache
    // and is never cached, so the remembered `no-file` cannot hide it.
    const placed = plant(home, DIRECT_DIR, id);
    const found = resolveClaude(home, id, cache);
    expect(found.state).toBe('resolved');
    expect((found as { file: string }).file).toBe(placed);
  });

  it('never remembers a resolved answer', () => {
    const home = freshHome('resolved');
    const cache = createResolveCache({ now: ticking });
    const id = '11111111-2222-4333-8444-000000000004';
    const placed = plant(home, ELSEWHERE_DIR, id);

    const r = resolveClaude(home, id, cache);
    expect(r.state).toBe('resolved');
    expect((r as { file: string }).file).toBe(placed);
    expect(cache.size).toBe(0);
  });

  it('never remembers a row with no session id, because no loop ran', () => {
    const home = freshHome('no-id');
    const cache = createResolveCache({ now: ticking });
    expect(resolveClaude(home, '', cache).state).toBe('no-file');
    expect(cache.size).toBe(0);
  });

  it("claude's cache alone: no other provider's fallback is remembered", () => {
    const home = freshHome('providers');
    const cache = createResolveCache({ now: ticking });
    const id = '11111111-2222-4333-8444-000000000005';
    // Every provider with a fallback loop of its own, plus the two that take
    // no loop at all. Counted for the entry: cursor 52 entries, omp 61,
    // grok 152, pi 305, gemini 311, against claude's 2,776.
    for (const agent of [
      'codex',
      'grok',
      'gemini',
      'pi',
      'omp',
      'cursor',
      'muse',
      'qwen',
      'deepseek',
      'antigravity'
    ]) {
      const r = resolveSessionLog(
        { agent, agentSessionId: id, cwd: CWD, createdAt: Date.now(), storePathHint: null },
        { home, env: {}, cache }
      );
      expect(r.state).toBe('no-file');
    }
    expect(cache.size).toBe(0);
  });

  it('with no cache handed in, nothing is remembered anywhere', () => {
    const home = freshHome('no-cache');
    const id = '11111111-2222-4333-8444-000000000006';
    expect(resolveClaude(home, id).state).toBe('no-file');
    // No module-level cache exists to hold that answer, so the record planted
    // between the two asks is found immediately.
    const placed = plant(home, ELSEWHERE_DIR, id);
    const r = resolveClaude(home, id);
    expect(r.state).toBe('resolved');
    expect((r as { file: string }).file).toBe(placed);
  });
});

// ---------------------------------------------------------------------------
// The key, and the two things that must not share one
// ---------------------------------------------------------------------------

describe('the key', () => {
  it('two homes in one process do not share an answer', () => {
    const a = freshHome('home-a');
    const b = freshHome('home-b');
    const cache = createResolveCache({ now: ticking });
    const id = '11111111-2222-4333-8444-000000000007';

    expect(resolveClaude(a, id, cache).state).toBe('no-file');
    expect(cache.size).toBe(1);

    // Home b's record sits under a NON-direct directory, so only b's own
    // fallback loop can find it. A key without the home reads a's answer here.
    const placed = plant(b, ELSEWHERE_DIR, id);
    const r = resolveClaude(b, id, cache);
    expect(r.state).toBe('resolved');
    expect((r as { file: string }).file).toBe(placed);
    // That answer resolved, so nothing new was remembered: the one key held is
    // still home a's.
    expect(cache.size).toBe(1);

    // And the home is in the key on the WRITE side too. The same id under two
    // homes, neither holding a record, is two keys rather than one.
    const missing = '11111111-2222-4333-8444-00000000000b';
    expect(resolveClaude(a, missing, cache).state).toBe('no-file');
    expect(resolveClaude(b, missing, cache).state).toBe('no-file');
    expect(cache.size).toBe(3);
  });

  it('two instances in one process do not share an answer', () => {
    const home = freshHome('instances');
    const first = createResolveCache({ now: ticking });
    const second = createResolveCache({ now: ticking });
    const id = '11111111-2222-4333-8444-000000000008';

    expect(resolveClaude(home, id, first).state).toBe('no-file');
    expect(first.size).toBe(1);
    expect(second.size).toBe(0);

    const placed = plant(home, ELSEWHERE_DIR, id);
    const r = resolveClaude(home, id, second);
    expect(r.state).toBe('resolved');
    expect((r as { file: string }).file).toBe(placed);
  });

  it('holds home, provider and id apart, and answers null for any other key', () => {
    const cache = createResolveCache({ now: ticking });
    cache.set({ home: '/h', provider: 'claude', id: 'x' });
    expect(cache.get({ home: '/h', provider: 'claude', id: 'x' })).toBe('no-file');
    expect(cache.get({ home: '/other', provider: 'claude', id: 'x' })).toBeNull();
    expect(cache.get({ home: '/h', provider: 'grok', id: 'x' })).toBeNull();
    expect(cache.get({ home: '/h', provider: 'claude', id: 'y' })).toBeNull();
    // No spelling of one part can be made to look like the next.
    expect(cache.get({ home: '/h\u0000claude', provider: '', id: 'x' })).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// The window and the bound, driven on the cache itself
// ---------------------------------------------------------------------------

describe('the window', () => {
  it('holds inside the TTL and is gone at it, dropping the entry as it reads', () => {
    let t = 0;
    const cache = createResolveCache({ now: () => t, ttlMs: 1_000 });
    cache.set({ home: '/h', provider: 'claude', id: 'x' });

    t = 999;
    expect(cache.get({ home: '/h', provider: 'claude', id: 'x' })).toBe('no-file');
    expect(cache.size).toBe(1);

    t = 1_000;
    expect(cache.get({ home: '/h', provider: 'claude', id: 'x' })).toBeNull();
    expect(cache.size).toBe(0);
  });

  it('defaults to 30 s, the sheet’s own re-ask interval', () => {
    expect(RESOLVE_CACHE_TTL_MS).toBe(30_000);
  });
});

describe('the bound, and what falls out', () => {
  it('holds at most 512 keys and evicts the one written longest ago', () => {
    let t = 0;
    const cache = createResolveCache({ now: () => t });
    expect(RESOLVE_CACHE_MAX).toBe(512);

    for (let i = 0; i < 600; i += 1) {
      t += 1;
      cache.set({ home: '/h', provider: 'claude', id: `id-${i}` });
    }
    expect(cache.size).toBe(512);
    // 600 written, 512 held, so the first 88 are gone and the rest are held.
    expect(cache.get({ home: '/h', provider: 'claude', id: 'id-0' })).toBeNull();
    expect(cache.get({ home: '/h', provider: 'claude', id: 'id-87' })).toBeNull();
    expect(cache.get({ home: '/h', provider: 'claude', id: 'id-88' })).toBe('no-file');
    expect(cache.get({ home: '/h', provider: 'claude', id: 'id-599' })).toBe('no-file');
  });

  it('a key written again moves to the end, so a re-asked id is not evicted by a burst', () => {
    let t = 0;
    const cache = createResolveCache({ now: () => t, max: 3 });
    for (const id of ['a', 'b', 'c']) cache.set({ home: '/h', provider: 'claude', id });
    t += 1;
    cache.set({ home: '/h', provider: 'claude', id: 'a' });
    cache.set({ home: '/h', provider: 'claude', id: 'd' });
    expect(cache.size).toBe(3);
    expect(cache.get({ home: '/h', provider: 'claude', id: 'b' })).toBeNull();
    expect(cache.get({ home: '/h', provider: 'claude', id: 'a' })).toBe('no-file');
    expect(cache.get({ home: '/h', provider: 'claude', id: 'c' })).toBe('no-file');
    expect(cache.get({ home: '/h', provider: 'claude', id: 'd' })).toBe('no-file');
  });

  it('an evicted answer is re-scanned, so eviction can only cost time and never truth', () => {
    const home = freshHome('evicted');
    const cache = createResolveCache({ now: ticking, max: 1 });
    const one = '11111111-2222-4333-8444-000000000009';
    const two = '11111111-2222-4333-8444-00000000000a';

    expect(resolveClaude(home, one, cache).state).toBe('no-file');
    expect(resolveClaude(home, two, cache).state).toBe('no-file');
    expect(cache.size).toBe(1);

    const placed = plant(home, ELSEWHERE_DIR, one);
    const r = resolveClaude(home, one, cache);
    expect(r.state).toBe('resolved');
    expect((r as { file: string }).file).toBe(placed);
  });
});
