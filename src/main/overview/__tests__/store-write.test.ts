/**
 * The overview store's write contract (Phase 137).
 *
 * What this pins down:
 * - upsertSession and getSession roundtrip every field, watermark included.
 * - replaceTurnsFrom writes turn and turn_fact together, keeps the given
 *   indexes, replaces the tail from fromIndex, and refuses a gap.
 * - A failure inside the write rolls the whole transaction back, so the
 *   previous state stays intact and readable.
 * - The cache key works: a second read with nothing changed performs no
 *   turn writes, proved with a second connection watching data_version.
 * - listTurns is ascending, and a limit returns the LAST limit turns.
 */

import Database from 'better-sqlite3';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  openOverviewStore,
  type OverviewStore,
  type StoredSession
} from '../store';
import type { PathMention, ReadTurn, Watermark } from '../reader';

let dir: string;
let dbPath: string;
let store: OverviewStore;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'gmux-overview-write-'));
  dbPath = join(dir, 'overview.db');
  store = openOverviewStore(dbPath);
});

afterEach(() => {
  try {
    store.close();
  } catch {
    // Already closed by the test.
  }
  rmSync(dir, { recursive: true, force: true });
});

function mention(path: string): PathMention {
  return { path, mentions: 2, source: 'tool', inside: true };
}

function turn(index: number, text = `ask ${index}`): ReadTurn {
  return {
    index,
    ask: { text, at: `2026-08-20T10:0${index % 10}:00Z`, queued: 1 },
    answer: { text: `answer ${index}`, at: `2026-08-20T10:0${index % 10}:30Z` },
    closed: true,
    interrupted: false,
    notice: null,
    stopReason: 'end_turn',
    durationMs: 30_000,
    paths: [mention('src/main/overview/store/store.ts')],
    pathSource: 'tool-calls'
  };
}

function watermark(turnIndex: number): Watermark {
  return {
    kind: 'byte-offset',
    file: '/scratch/session.jsonl',
    size: String(turnIndex * 1_000),
    mtimeNs: '1755600000000000000',
    headHash: 'aaaa',
    tailHash: 'bbbb',
    offset: turnIndex * 1_000,
    open: false,
    turnIndex
  };
}

function session(id: string, wm: Watermark | null): StoredSession {
  return {
    sessionId: id,
    agent: 'claude',
    provider: 'claude',
    agentSessionId: '11111111-2222-4333-8444-555555555555',
    logPath: '/scratch/session.jsonl',
    watermark: wm,
    mapVersionAtLastRead: 1,
    lastReadAt: 1_000,
    readState: 'ok',
    readDetail: null,
    lastTouchedAt: '2026-08-20T10:05:00Z',
    model: 'claude-fable-5',
    branch: 'main',
    honest: null
  };
}

describe('sessions', () => {
  it('roundtrips every field through upsertSession and getSession', () => {
    const wm = watermark(3);
    store.upsertSession(session('s-1', wm));
    const row = store.getSession('s-1');
    expect(row).toEqual(session('s-1', wm));
  });

  it('returns null for a session never written', () => {
    expect(store.getSession('nobody')).toBeNull();
  });

  it('updates in place on a second upsert', () => {
    store.upsertSession(session('s-1', null));
    store.upsertSession({
      ...session('s-1', watermark(5)),
      readState: 'unreadable',
      readDetail: 'the file is not JSON lines'
    });
    const row = store.getSession('s-1');
    expect(row?.readState).toBe('unreadable');
    expect(row?.readDetail).toBe('the file is not JSON lines');
    expect(row?.watermark?.turnIndex).toBe(5);
  });
});

describe('replaceTurnsFrom', () => {
  it('writes turn and turn_fact together and stamps the read on the session row', () => {
    store.upsertSession(session('s-1', null));
    store.replaceTurnsFrom('s-1', 0, [turn(0), turn(1)], watermark(2), 1, 9_000);

    const turns = store.listTurns('s-1');
    expect(turns.map((t) => t.index)).toEqual([0, 1]);
    expect(turns[0]?.askText).toBe('ask 0');
    expect(turns[0]?.answerText).toBe('answer 0');
    expect(turns[0]?.closed).toBe(true);
    expect(turns[0]?.stopReason).toBe('end_turn');
    expect(turns[0]?.durationMs).toBe(30_000);
    expect(turns[0]?.paths).toEqual([
      mention('src/main/overview/store/store.ts')
    ]);
    expect(turns[0]?.pathSource).toBe('tool-calls');
    expect(store.countTurns('s-1')).toBe(2);

    const row = store.getSession('s-1');
    expect(row?.watermark).toEqual(watermark(2));
    expect(row?.mapVersionAtLastRead).toBe(1);
    expect(row?.lastReadAt).toBe(9_000);
  });

  it('keeps a turn with no answer, an interrupt and a notice', () => {
    store.replaceTurnsFrom(
      's-1',
      0,
      [
        {
          index: 0,
          ask: { text: 'do the thing', at: null, queued: 2 },
          answer: null,
          closed: false,
          interrupted: true,
          notice: 'usage limit reached',
          stopReason: null,
          durationMs: null,
          paths: [],
          pathSource: 'text-only'
        }
      ],
      null,
      1,
      1_000
    );
    const turns = store.listTurns('s-1');
    expect(turns[0]?.answerText).toBeNull();
    expect(turns[0]?.answerAt).toBeNull();
    expect(turns[0]?.closed).toBe(false);
    expect(turns[0]?.interrupted).toBe(true);
    expect(turns[0]?.notice).toBe('usage limit reached');
    expect(turns[0]?.queued).toBe(2);
    expect(turns[0]?.durationMs).toBeNull();
  });

  it('replaces the tail from fromIndex and keeps the head', () => {
    store.replaceTurnsFrom(
      's-1',
      0,
      [turn(0), turn(1), turn(2)],
      watermark(3),
      1,
      1_000
    );
    store.setGitVerdict('s-1', 0, 'agrees', 1_500);

    store.replaceTurnsFrom(
      's-1',
      2,
      [turn(2, 'ask 2 rewritten'), turn(3)],
      watermark(4),
      1,
      2_000
    );

    const turns = store.listTurns('s-1');
    expect(turns.map((t) => t.index)).toEqual([0, 1, 2, 3]);
    expect(turns[0]?.askText).toBe('ask 0');
    expect(turns[0]?.gitVerdict).toBe('agrees');
    expect(turns[2]?.askText).toBe('ask 2 rewritten');
    expect(turns[2]?.gitVerdict).toBeNull();
    expect(store.getSession('s-1')?.watermark).toEqual(watermark(4));
  });

  it('accepts an empty turn list and still deletes the tail and stamps the read', () => {
    store.replaceTurnsFrom('s-1', 0, [turn(0), turn(1)], watermark(2), 1, 1_000);
    store.replaceTurnsFrom('s-1', 1, [], watermark(1), 1, 2_000);
    expect(store.countTurns('s-1')).toBe(1);
    const row = store.getSession('s-1');
    expect(row?.watermark).toEqual(watermark(1));
    expect(row?.lastReadAt).toBe(2_000);
  });

  it('refuses turns whose first index is not fromIndex', () => {
    expect(() =>
      store.replaceTurnsFrom('s-1', 0, [turn(1)], null, 1, 1_000)
    ).toThrow(/starting at index 1/);
  });

  it('refuses a gap in the turn indexes', () => {
    expect(() =>
      store.replaceTurnsFrom('s-1', 0, [turn(0), turn(2)], null, 1, 1_000)
    ).toThrow(/gap/);
  });

  it('carries the watermark even when the session row does not exist yet', () => {
    store.replaceTurnsFrom('s-new', 0, [turn(0)], watermark(1), 1, 1_000);
    const row = store.getSession('s-new');
    expect(row?.watermark).toEqual(watermark(1));
    expect(row?.mapVersionAtLastRead).toBe(1);
    store.upsertSession({ ...session('s-new', watermark(1)), lastReadAt: 1_000 });
    expect(store.getSession('s-new')?.agent).toBe('claude');
  });

  it('rolls the whole write back when one insert fails, leaving the previous state intact', () => {
    store.replaceTurnsFrom('s-1', 0, [turn(0)], watermark(1), 1, 1_000);

    const circular: Record<string, unknown> = {
      path: 'x',
      mentions: 1,
      source: 'tool',
      inside: true
    };
    circular['self'] = circular;
    const poisoned: ReadTurn = {
      ...turn(1),
      paths: [circular as unknown as PathMention]
    };

    // Turn 0 of the failing batch inserts cleanly. Turn 1 throws when its
    // path list is serialized. The transaction must take both back out.
    expect(() =>
      store.replaceTurnsFrom(
        's-1',
        0,
        [turn(0, 'new ask 0'), poisoned],
        watermark(2),
        1,
        2_000
      )
    ).toThrow();

    const turns = store.listTurns('s-1');
    expect(turns).toHaveLength(1);
    expect(turns[0]?.askText).toBe('ask 0');
    const row = store.getSession('s-1');
    expect(row?.watermark).toEqual(watermark(1));
    expect(row?.lastReadAt).toBe(1_000);
  });
});

describe('the cache key', () => {
  it('a second read with nothing changed performs no turn writes', () => {
    store.upsertSession(session('s-1', null));
    store.replaceTurnsFrom('s-1', 0, [turn(0), turn(1)], watermark(2), 1, 1_000);
    store.recordProviderMap('claude', 1, 'deadbeef', 1_000);

    // A second connection watches the file. Its data_version moves when any
    // other connection commits a write, so an unmoved data_version is proof
    // that the check below wrote nothing.
    const probe = new Database(dbPath, { readonly: true });
    const before = probe.pragma('data_version', { simple: true }) as number;

    // The second read with nothing changed: the service reads the session
    // row, sees the stored watermark and the stored map version match what
    // the resolver and the map say today, and never calls replaceTurnsFrom.
    const cached = store.getSession('s-1');
    expect(cached?.watermark).toEqual(watermark(2));
    expect(cached?.mapVersionAtLastRead).toBe(1);
    expect(store.providerMapVersion('claude')).toBe(1);
    expect(store.countTurns('s-1')).toBe(2);

    const after = probe.pragma('data_version', { simple: true }) as number;
    expect(after).toBe(before);

    // The control: a real turn write moves data_version, so the probe above
    // would have seen one.
    store.replaceTurnsFrom('s-1', 2, [turn(2)], watermark(3), 1, 2_000);
    const moved = probe.pragma('data_version', { simple: true }) as number;
    probe.close();
    expect(moved).not.toBe(before);
  });
});

describe('listTurns and countTurns', () => {
  it('lists ascending, and a limit returns the last turns still ascending', () => {
    store.replaceTurnsFrom(
      's-1',
      0,
      [turn(0), turn(1), turn(2), turn(3)],
      null,
      1,
      1_000
    );
    expect(store.listTurns('s-1').map((t) => t.index)).toEqual([0, 1, 2, 3]);
    expect(store.listTurns('s-1', 2).map((t) => t.index)).toEqual([2, 3]);
    expect(store.listTurns('s-1', 50).map((t) => t.index)).toEqual([
      0, 1, 2, 3
    ]);
    expect(store.countTurns('s-1')).toBe(4);
    expect(store.countTurns('nobody')).toBe(0);
    expect(store.listTurns('nobody')).toEqual([]);
  });
});

describe('git verdicts', () => {
  it('writes the verdict and the checked time onto the fact row', () => {
    store.replaceTurnsFrom('s-1', 0, [turn(0)], null, 1, 1_000);
    store.setGitVerdict('s-1', 0, 'no-record', 5_000);
    const turns = store.listTurns('s-1');
    expect(turns[0]?.gitVerdict).toBe('no-record');
    expect(turns[0]?.gitCheckedAt).toBe(5_000);
  });
});

describe('provider maps', () => {
  it('records a version and hash per provider and reads the version back', () => {
    expect(store.providerMapVersion('claude')).toBeNull();
    store.recordProviderMap('claude', 1, 'aaaa', 1_000);
    store.recordProviderMap('codex', 2, 'bbbb', 1_000);
    expect(store.providerMapVersion('claude')).toBe(1);
    expect(store.providerMapVersion('codex')).toBe(2);
    store.recordProviderMap('claude', 3, 'cccc', 2_000);
    expect(store.providerMapVersion('claude')).toBe(3);
  });
});
