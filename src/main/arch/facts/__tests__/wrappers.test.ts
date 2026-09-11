/**
 * The one hop wrapper pass (Phase 257): the three measured clauses, the hop
 * closure, the shadow's idempotence and the digest.
 */

import { describe, expect, it } from 'vitest';
import { ARCH_WRAPPER_ANCHORS } from '@shared/arch';
import type { ExtractedWrapper } from '../../../symbols/extract';
import {
  ANCHORS,
  closeWrappers,
  EMPTY_WRAPPER_DIGEST,
  shadowWrappers,
  unwrapSite,
  wrapperDigest,
  WRAPPER_GRAMMARS,
  WRAPPER_MAX_HOPS
} from '../wrappers';
import { site } from './site';

function decl(name: string, innerCallee: string, paramIndex: number, innerIndex: number, line = 1): ExtractedWrapper {
  const innerLast = innerCallee.split(/::|\./).pop()!;
  return { name, innerCallee, innerLast, paramIndex, innerIndex, hops: ANCHORS[innerLast] === innerIndex ? 1 : 0, line };
}

/** This repository's own shape: typed-ipc.ts declares handle(ipc, channel, fn) → ipc.handle(channel, …). */
const TYPED = decl('handle', 'ipc.handle', 1, 0);
/** ipc.ts: `import { handle as handleTyped }` then handle(channel, fn) → handleTyped(ipcMain, channel, fn), alias resolved by the worker. */
const IPC_OWN = decl('handle', 'handleTyped', 0, 1);
const IPC_OWN_ALIASED: ExtractedWrapper = { ...IPC_OWN, innerLast: 'handle' };

describe('the table and the constants', () => {
  it('ANCHORS is the shared table, the grammars are the JS family, the bound is 3', () => {
    expect(ANCHORS).toBe(ARCH_WRAPPER_ANCHORS);
    expect(Object.keys(ANCHORS)).toHaveLength(24);
    expect(WRAPPER_GRAMMARS).toEqual(['typescript', 'tsx', 'javascript']);
    expect(WRAPPER_MAX_HOPS).toBe(3);
  });
});

describe('closeWrappers', () => {
  it('resolves a hop 1 declaration and a hop 2 through the alias resolved name', () => {
    const map = closeWrappers([TYPED, IPC_OWN_ALIASED]);
    expect(map.get('handle')).toMatchObject({ innerCallee: 'ipc.handle', hops: 1, paramIndex: 1 });
  });

  it('clause 2: without the alias resolved, the second hop has nothing to reach', () => {
    const map = closeWrappers([decl('mine', 'handleTyped', 0, 1)]);
    expect(map.has('mine')).toBe(false);
    const aliased = closeWrappers([TYPED, { ...decl('mine', 'handleTyped', 0, 1), innerLast: 'handle' }]);
    expect(aliased.get('mine')).toMatchObject({ innerCallee: 'ipc.handle', hops: 2, paramIndex: 0 });
  });

  it('a second hop needs the forwarded argument in the inner wrapper name position', () => {
    const wrong = closeWrappers([TYPED, { ...decl('mine', 'handleTyped', 0, 2), innerLast: 'handle' }]);
    expect(wrong.has('mine')).toBe(false);
  });

  it('stops at maxHops, counts hops rather than passes, and does not depend on order', () => {
    const chain = [TYPED, { ...decl('two', 'handle', 0, 1), innerLast: 'handle' }, { ...decl('three', 'two', 0, 0), innerLast: 'two' }, { ...decl('four', 'three', 0, 0), innerLast: 'three' }];
    expect(closeWrappers(chain, 3).has('four')).toBe(false);
    expect(closeWrappers(chain, 3).get('three')?.hops).toBe(3);
    expect(closeWrappers(chain, 4).get('four')?.hops).toBe(4);
    const forward = [...closeWrappers(chain, 3).entries()].sort();
    const backward = [...closeWrappers([...chain].reverse(), 3).entries()].sort();
    expect(backward).toEqual(forward);
  });

  it('clause 3: a caller\'s own declaration shadows the project wide one, and shadowing is idempotent', () => {
    const project = closeWrappers([TYPED, IPC_OWN_ALIASED]);
    expect(project.get('handle')?.paramIndex).toBe(1);
    const local = closeWrappers([TYPED, IPC_OWN_ALIASED], 3, [IPC_OWN_ALIASED]);
    expect(local.get('handle')).toMatchObject({ innerCallee: 'ipc.handle', paramIndex: 0, hops: 2 });
    const twice = shadowWrappers(local, [IPC_OWN_ALIASED]);
    expect([...twice.entries()]).toEqual([...local.entries()]);
  });
});

describe('unwrapSite', () => {
  const map = closeWrappers([TYPED]);

  it('rewrites a bare call of a wrapper into the anchor site with the name argument first', () => {
    const u = unwrapSite(site('handle', [null, 'arch:map', null]), map);
    expect(u).toMatchObject({ callee: 'ipc.handle', recv: 'ipc', last: 'handle', args: ['arch:map', ''], form: 'call' });
  });

  it('clause 1: a call WITH a receiver is never unwrapped, so sock.on(data) stays an emitter event', () => {
    const onMap = closeWrappers([decl('on', 'ipcMain.on', 0, 0)]);
    expect(unwrapSite(site('sock.on', ['data', null]), onMap)).toBeNull();
    expect(unwrapSite(site('on', ['data', null]), onMap)).toMatchObject({ callee: 'ipcMain.on' });
  });

  it('clause 1: a callee that is not its own name is never unwrapped, so $(window).on(hashchange) stays a jQuery event', () => {
    const onMap = closeWrappers([decl('on', 'ipcMain.on', 0, 0)]);
    // `splitCallee` strips the `$(window)` call, so recv reads '' and last reads 'on'.
    expect(unwrapSite(site('$(window).on', ['hashchange', null]), onMap)).toBeNull();
  });

  it('answers null for a non call, an unknown name, a missing or empty name argument', () => {
    expect(unwrapSite(site('handle', [null, 'x'], { form: 'new' }), map)).toBeNull();
    expect(unwrapSite(site('other', [null, 'x']), map)).toBeNull();
    expect(unwrapSite(site('handle', [null]), map)).toBeNull();
    expect(unwrapSite(site('handle', [null, '']), map)).toBeNull();
  });
});

describe('wrapperDigest', () => {
  it('is the pinned constant for the empty map and moves with any field', () => {
    expect(wrapperDigest(new Map())).toBe(EMPTY_WRAPPER_DIGEST);
    const a = wrapperDigest(closeWrappers([TYPED]));
    expect(a).not.toBe(EMPTY_WRAPPER_DIGEST);
    expect(wrapperDigest(closeWrappers([{ ...TYPED, paramIndex: 2, innerIndex: 0 }]))).not.toBe(a);
    expect(wrapperDigest(closeWrappers([{ ...TYPED, line: 99 }]))).toBe(a);
  });

  it('does not depend on insertion order', () => {
    const one = decl('a', 'ipc.handle', 0, 0);
    const two = decl('b', 'ipc.on', 0, 0);
    expect(wrapperDigest(closeWrappers([one, two]))).toBe(wrapperDigest(closeWrappers([two, one])));
  });
});
