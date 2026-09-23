/**
 * The blocked feed (Phase 314): the one owner of the blocked-since stamps and
 * the one assignment of `core.onSessionsBroadcast`.
 *
 * What is proved here that reading the module cannot prove: that a second
 * install does not take the slot a second time (which would unplug whichever
 * consumer had it), that the stamps are exactly `blockedSince`'s, re-derived
 * here by hand, and that one consumer throwing cannot stop another.
 */

import { afterEach, describe, expect, it } from 'vitest';
import type { Project, Session } from '@shared/types';
import {
  blockedSinceMap,
  installBlockedFeed,
  onBlockedChange,
  resetBlockedFeedForTests,
  type BlockedSnapshot
} from '../blocked-feed';

function session(id: string, status: Session['status']): Session {
  return {
    id,
    name: id,
    tmuxName: id,
    projectPath: '/repos/tortie',
    cwd: '/repos/tortie',
    agent: 'claude',
    status,
    createdAt: 1
  } as Session;
}

const PROJECTS: Project[] = [{ id: 'p1', path: '/repos/tortie', name: 'tortie' }];

function fakeCore(initial: Session[]): {
  onSessionsBroadcast: ((s: Session[]) => void) | null;
  listSessions(): Session[];
  listProjects(): Project[];
  sessions: Session[];
  assignments: number;
} {
  let slot: ((s: Session[]) => void) | null = null;
  const core = {
    sessions: initial,
    assignments: 0,
    get onSessionsBroadcast() {
      return slot;
    },
    set onSessionsBroadcast(value: ((s: Session[]) => void) | null) {
      core.assignments += 1;
      slot = value;
    },
    listSessions: () => core.sessions,
    listProjects: () => PROJECTS
  };
  return core;
}

afterEach(() => {
  resetBlockedFeedForTests();
});

describe('the blocked feed', () => {
  it('takes the broadcast slot ONCE however many consumers install it', () => {
    const core = fakeCore([]);
    installBlockedFeed(core, () => 1);
    const slot = core.onSessionsBroadcast;
    installBlockedFeed(core, () => 2);
    installBlockedFeed(core);
    expect(core.assignments).toBe(1);
    expect(core.onSessionsBroadcast).toBe(slot);
  });

  it('runs one pass at install, which is the refresh the tray used to run itself', () => {
    const core = fakeCore([session('a', 'needs_input')]);
    const seen: BlockedSnapshot[] = [];
    onBlockedChange((s) => seen.push(s));
    installBlockedFeed(core, () => 500);
    expect(seen).toHaveLength(1);
    expect([...(seen[0]?.since ?? [])]).toEqual([['a', 500]]);
    expect(seen[0]?.projects).toBe(PROJECTS);
  });

  it("stamps exactly as blockedSince does: first sight, kept while blocked, gone when clear", () => {
    const core = fakeCore([]);
    let t = 100;
    installBlockedFeed(core, () => t);
    t = 200;
    core.onSessionsBroadcast?.([session('a', 'needs_input'), session('b', 'running')]);
    t = 300;
    core.onSessionsBroadcast?.([session('a', 'needs_input'), session('b', 'needs_input')]);
    expect([...blockedSinceMap()]).toEqual([
      ['a', 200],
      ['b', 300]
    ]);
    t = 400;
    core.onSessionsBroadcast?.([session('a', 'idle'), session('b', 'needs_input')]);
    expect([...blockedSinceMap()]).toEqual([['b', 300]]);
    t = 500;
    core.onSessionsBroadcast?.([session('a', 'needs_input'), session('b', 'needs_input')]);
    expect(blockedSinceMap().get('a')).toBe(500);
  });

  it('replaces the map on every pass and never edits a snapshot a listener holds', () => {
    const core = fakeCore([session('a', 'needs_input')]);
    const seen: BlockedSnapshot[] = [];
    onBlockedChange((s) => seen.push(s));
    installBlockedFeed(core, () => 1);
    core.onSessionsBroadcast?.([]);
    expect(seen).toHaveLength(2);
    expect(seen[0]?.since.get('a')).toBe(1);
    expect(seen[1]?.since.size).toBe(0);
    expect(seen[0]?.since).not.toBe(seen[1]?.since);
  });

  it('hands every consumer the SAME map, and one throwing cannot stop another', () => {
    const core = fakeCore([session('a', 'needs_input')]);
    const maps: Array<ReadonlyMap<string, number>> = [];
    onBlockedChange(() => {
      throw new Error('a consumer that fails');
    });
    onBlockedChange((s) => maps.push(s.since));
    onBlockedChange((s) => maps.push(s.since));
    installBlockedFeed(core, () => 9);
    expect(maps).toHaveLength(2);
    expect(maps[0]).toBe(maps[1]);
    expect(maps[0]).toBe(blockedSinceMap());
  });

  it('stops calling a listener that unsubscribed', () => {
    const core = fakeCore([]);
    let calls = 0;
    const off = onBlockedChange(() => (calls += 1));
    installBlockedFeed(core, () => 1);
    off();
    core.onSessionsBroadcast?.([session('a', 'needs_input')]);
    expect(calls).toBe(1);
  });

  it('refuses a second, different core without taking its slot', () => {
    const first = fakeCore([]);
    const second = fakeCore([]);
    installBlockedFeed(first, () => 1);
    installBlockedFeed(second, () => 1);
    expect(second.assignments).toBe(0);
    expect(second.onSessionsBroadcast).toBeNull();
  });

  it('ignores a broadcast from a core it was reset away from', () => {
    const core = fakeCore([]);
    installBlockedFeed(core, () => 1);
    const stale = core.onSessionsBroadcast;
    resetBlockedFeedForTests();
    stale?.([session('a', 'needs_input')]);
    expect(blockedSinceMap().size).toBe(0);
  });
});
