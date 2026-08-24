/**
 * The two reads the story needs (Phase 143).
 *
 * `listSummaries` answers one session's whole version chain, oldest first, and
 * `listTurnsBetween` answers the turns between two indexes. Both are SELECTs,
 * and the point of this file is that they are: it drives the real store on a
 * scratch file, reads the same rows back through a second connection with
 * plain SQL, and checks that nothing about the file changed.
 */

import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  openOverviewStore,
  type NewFoldVersion,
  type OverviewStore,
  type StoredSession,
  type StoredTurn
} from '../store';
import type { PathMention, ReadTurn } from '../reader';
import { composeFoldPrompt } from '../fold/compose';
import { buildTimeline } from '../timeline';

let dir: string;
let dbPath: string;
let store: OverviewStore;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'gmux-overview-timeline-'));
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

function version(over: Partial<NewFoldVersion> = {}): NewFoldVersion {
  return {
    sessionId: 's1',
    fromTurn: 0,
    toTurn: 0,
    text: 'You asked the agent to read the log.',
    verdict: 'kept',
    reason: null,
    harness: 'claude',
    model: 'claude-haiku-4-5-20251001',
    providerMapVersion: 1,
    inputHash: 'a'.repeat(64),
    writtenAt: 1_700_000_000_000,
    ...over
  };
}

function mention(path: string): PathMention {
  return { path, mentions: 1, source: 'tool', inside: true };
}

function turn(index: number): ReadTurn {
  return {
    index,
    ask: { text: `ask ${index}`, at: null, queued: 0 },
    answer: { text: `answer ${index}`, at: null },
    closed: true,
    interrupted: false,
    notice: null,
    stopReason: 'end_turn',
    durationMs: 1_000,
    paths: [mention('src/main/overview/timeline.ts')],
    pathSource: 'tool-calls'
  };
}

function session(id: string): StoredSession {
  return {
    sessionId: id,
    agent: 'claude',
    provider: 'claude',
    agentSessionId: null,
    logPath: '/scratch/session.jsonl',
    watermark: null,
    mapVersionAtLastRead: 1,
    lastReadAt: 1_000,
    readState: 'ok',
    readDetail: null,
    lastTouchedAt: null,
    model: null,
    branch: null,
    honest: null
  };
}

/** The `data_version` pragma moves when another connection writes the file. */
function dataVersion(): number {
  const raw = new Database(dbPath, { readonly: true });
  const row = raw.pragma('data_version', { simple: true }) as number;
  raw.close();
  return row;
}

describe('listSummaries', () => {
  it('answers the whole chain oldest first, whatever the verdict', () => {
    store.appendSummary(version({ fromTurn: 0, toTurn: 1, text: 'one' }));
    store.appendSummary(
      version({ fromTurn: 2, toTurn: 3, text: null, verdict: 'refused', reason: 'digit' })
    );
    store.appendSummary(version({ fromTurn: 4, toTurn: 5, text: 'two' }));
    const rows = store.listSummaries('s1');
    expect(rows.map((row) => row.version)).toEqual([1, 2, 3]);
    expect(rows.map((row) => row.verdict)).toEqual([
      'kept',
      'refused',
      'kept'
    ]);
    expect(rows.map((row) => row.text)).toEqual(['one', null, 'two']);
  });

  it('answers an empty list for a session with no version', () => {
    expect(store.listSummaries('nobody')).toEqual([]);
  });

  it('answers one session and never another', () => {
    store.appendSummary(version({ sessionId: 's1', text: 'mine' }));
    store.appendSummary(version({ sessionId: 's2', text: 'theirs' }));
    expect(store.listSummaries('s1').map((row) => row.text)).toEqual(['mine']);
    expect(store.listSummaries('s2').map((row) => row.text)).toEqual([
      'theirs'
    ]);
  });

  it('carries every column the story draws from', () => {
    store.appendSummary(
      version({
        fromTurn: 3,
        toTurn: 9,
        text: 'a sentence',
        harness: 'codex',
        model: 'gpt-5.1-codex',
        writtenAt: 1_700_000_123_000
      })
    );
    const row = store.listSummaries('s1')[0];
    expect(row?.fromTurn).toBe(3);
    expect(row?.toTurn).toBe(9);
    expect(row?.text).toBe('a sentence');
    expect(row?.harness).toBe('codex');
    expect(row?.model).toBe('gpt-5.1-codex');
    expect(row?.writtenAt).toBe(1_700_000_123_000);
  });

  it('reads the same rows a second connection reads with plain SQL', () => {
    store.appendSummary(version({ fromTurn: 0, toTurn: 1, text: 'one' }));
    store.appendSummary(version({ fromTurn: 2, toTurn: 3, text: 'two' }));
    const raw = new Database(dbPath, { readonly: true });
    const rows = raw
      .prepare('SELECT version, text FROM summary WHERE session_id = ? ORDER BY version')
      .all('s1') as { version: number; text: string | null }[];
    raw.close();
    expect(rows).toEqual(
      store.listSummaries('s1').map((row) => ({
        version: row.version,
        text: row.text
      }))
    );
  });

  it('changes nothing in the file', () => {
    store.appendSummary(version());
    const before = dataVersion();
    store.listSummaries('s1');
    store.listSummaries('s1');
    expect(dataVersion()).toBe(before);
  });
});

describe('listTurnsBetween', () => {
  beforeEach(() => {
    store.upsertSession(session('s1'));
    store.replaceTurnsFrom(
      's1',
      0,
      Array.from({ length: 10 }, (_, i) => turn(i)),
      null,
      1,
      1_000
    );
  });

  it('answers the range with both ends included, ascending', () => {
    const rows = store.listTurnsBetween('s1', 3, 6);
    expect(rows.map((row) => row.index)).toEqual([3, 4, 5, 6]);
    expect(rows[0]?.askText).toBe('ask 3');
  });

  it('answers one index when both ends are the same', () => {
    expect(store.listTurnsBetween('s1', 4, 4).map((row) => row.index)).toEqual([
      4
    ]);
  });

  it('answers an empty list for a range the session has no turn in', () => {
    expect(store.listTurnsBetween('s1', 40, 50)).toEqual([]);
  });

  it('answers an empty list when the range runs backwards', () => {
    expect(store.listTurnsBetween('s1', 6, 3)).toEqual([]);
  });

  it('takes the LAST turns of the range under a limit, still ascending', () => {
    const rows = store.listTurnsBetween('s1', 0, 9, 3);
    expect(rows.map((row) => row.index)).toEqual([7, 8, 9]);
  });

  it('is unbothered by a limit wider than the range', () => {
    expect(
      store.listTurnsBetween('s1', 2, 4, 100).map((row) => row.index)
    ).toEqual([2, 3, 4]);
  });

  it('joins the fact row, so the git mark and the notice come with it', () => {
    store.setGitVerdict('s1', 5, 'agrees', 2_000);
    const rows = store.listTurnsBetween('s1', 5, 5);
    expect(rows[0]?.gitVerdict).toBe('agrees');
    expect(rows[0]?.gitCheckedAt).toBe(2_000);
    expect(rows[0]?.paths).toEqual([mention('src/main/overview/timeline.ts')]);
    expect(rows[0]?.pathSource).toBe('tool-calls');
  });

  it('answers one session and never another', () => {
    store.upsertSession(session('s2'));
    store.replaceTurnsFrom('s2', 0, [turn(0)], null, 1, 1_000);
    const rows = store.listTurnsBetween('s2', 0, 9);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.sessionId).toBe('s2');
  });

  it('changes nothing in the file', () => {
    const before = dataVersion();
    store.listTurnsBetween('s1', 0, 9);
    store.listTurnsBetween('s1', 0, 9, 2);
    expect(dataVersion()).toBe(before);
  });
});

describe('a hostile chain, read through the real store', () => {
  /** The story, built from rows this test wrote through the shipped append. */
  function story(): ReturnType<typeof buildTimeline> {
    return buildTimeline(store, 's1', true);
  }

  it('says the break when a repeat sits either side of a refused fold', () => {
    store.appendSummary(version({ fromTurn: 0, toTurn: 2, text: 'same' }));
    store.appendSummary(
      version({
        fromTurn: 3,
        toTurn: 5,
        text: null,
        verdict: 'refused',
        reason: 'digit'
      })
    );
    store.appendSummary(version({ fromTurn: 6, toTurn: 8, text: 'same' }));
    const out = story();
    expect(out.entries).toHaveLength(2);
    expect(out.entries[0]?.fromTurn).toBe(6);
    expect(out.entries[0]?.gapBefore).toBe(true);
    expect(out.entries[1]?.toTurn).toBe(2);
    // Nothing on the wire claims a row covers the refused range.
    expect(
      out.entries.some((entry) => entry.fromTurn <= 4 && entry.toTurn >= 4)
    ).toBe(false);
  });

  it('claims no break after a chain that was built again from the start', () => {
    store.appendSummary(version({ fromTurn: 0, toTurn: 10, text: 'whole' }));
    store.appendSummary(version({ fromTurn: 0, toTurn: 3, text: 'opening' }));
    store.appendSummary(version({ fromTurn: 4, toTurn: 6, text: 'middle' }));
    store.appendSummary(version({ fromTurn: 11, toTurn: 13, text: 'on' }));
    const out = story();
    expect(out.entries).toHaveLength(4);
    expect(out.entries.every((entry) => !entry.gapBefore)).toBe(true);
  });

  it('names both models when a repeat hides one of them', () => {
    store.appendSummary(
      version({ fromTurn: 0, toTurn: 1, text: 'same', model: 'one' })
    );
    store.appendSummary(
      version({ fromTurn: 2, toTurn: 3, text: 'same', model: 'two' })
    );
    store.appendSummary(
      version({ fromTurn: 4, toTurn: 5, text: 'later', model: 'two' })
    );
    const out = story();
    expect(out.modelChanged).toBe(true);
    expect(out.entries.map((entry) => entry.model)).toEqual([
      'two',
      'two',
      'one'
    ]);
  });

  it('changes nothing in the file while it reads all of that', () => {
    store.appendSummary(version({ fromTurn: 0, toTurn: 2, text: 'same' }));
    store.appendSummary(version({ fromTurn: 3, toTurn: 5, text: 'same' }));
    const before = dataVersion();
    story();
    story();
    expect(dataVersion()).toBe(before);
  });
});

describe('what a chain that was built again leaves behind', () => {
  it('carries the same unbroken parent line as one that never was', () => {
    store.appendSummary(version({ fromTurn: 0, toTurn: 2, text: 'one' }));
    store.appendSummary(version({ fromTurn: 3, toTurn: 5, text: 'two' }));
    // The rebuild. It covers ground the row above it already covered.
    store.appendSummary(version({ fromTurn: 3, toTurn: 4, text: 'again' }));
    const rows = store.listSummaries('s1');
    // Every version points at the one before it, the rebuild included, so the
    // parent line says nothing at all about which version was a rebuild. That
    // is the whole reason the story folds such a row into its watermark rather
    // than announcing it, and it is written down in timeline.ts's header.
    expect(rows.map((row) => row.parentVersion)).toEqual([
      null,
      rows[0]?.version ?? null,
      rows[1]?.version ?? null
    ]);
  });
});

describe('the range the shipped fold can write', () => {
  /** One stored turn, as the reader would have written it. */
  function storedTurn(
    sessionId: string,
    index: number,
    closed: boolean
  ): StoredTurn {
    return {
      sessionId,
      index,
      askText: `ask ${String(index)}`,
      askAt: null,
      answerText: `answer ${String(index)}`,
      answerAt: null,
      queued: 0,
      closed,
      interrupted: false,
      notice: null,
      stopReason: null,
      durationMs: null,
      paths: [],
      pathSource: 'text-only',
      gitVerdict: null,
      gitCheckedAt: null
    };
  }

  it('is the floor fold-wiring.ts still uses', () => {
    const wiring = readFileSync(
      join(import.meta.dirname, '..', '..', 'sessions', 'fold-wiring.ts'),
      'utf8'
    );
    // The rule this test drives below is copied from there, so it must not
    // drift away without this failing.
    expect(wiring).toContain('const floor = newest === null ? -1 : newest.toTurn');
    expect(wiring.replace(/\s+/g, ' ')).toContain(
      '(turn) => turn.index > floor && turn.closed'
    );
  });

  it('never reaches back over a range it already wrote', () => {
    // The floor rule from fold-wiring.ts, driven over many sessions with the
    // real store, the real compose and the real append. Turns arrive in
    // uneven batches, some stay open, and a fold may be kept, refused or
    // failed. If any of that could write a backwards range, the story's join
    // rule would have a shape a person could reach through the fold.
    let seed = 12_345;
    const roll = (n: number): number => {
      seed = (seed * 1_103_515_245 + 12_345) % 2_147_483_648;
      return seed % n;
    };
    let backwards = 0;
    let appended = 0;
    for (let s = 0; s < 40; s += 1) {
      const id = `fold-${String(s)}`;
      let highest = -1;
      for (let round = 0; round < 8; round += 1) {
        const turns: StoredTurn[] = [];
        for (let t = 0; t <= highest + roll(6); t += 1) {
          turns.push(storedTurn(id, t, roll(5) !== 0));
        }
        highest = turns.length - 1;
        const newest = store.latestSummary(id);
        const kept = store.latestKeptSummary(id);
        const floor = newest === null ? -1 : newest.toTurn;
        const fresh = turns.filter((t) => t.index > floor && t.closed);
        if (fresh.length === 0) continue;
        const composed = composeFoldPrompt(kept?.text ?? null, fresh);
        if (composed === null) continue;
        if (newest !== null && composed.fromTurn <= newest.toTurn) backwards += 1;
        const roll10 = roll(10);
        const verdict =
          roll10 < 6 ? 'kept' : roll10 < 8 ? 'refused' : 'failed';
        store.appendSummary(
          version({
            sessionId: id,
            fromTurn: composed.fromTurn,
            toTurn: composed.toTurn,
            text: verdict === 'kept' ? `sentence ${String(round)}` : null,
            verdict,
            reason: verdict === 'kept' ? null : 'a roll',
            model: roll(3) === 0 ? 'model-two' : 'model-one',
            inputHash: `b`.repeat(64),
            writtenAt: 1_700_000_000_000 + round
          })
        );
        appended += 1;
      }
      // The same question again, asked of what the file actually holds.
      let mark = -1;
      for (const row of store.listSummaries(id)) {
        if (row.fromTurn <= mark) backwards += 1;
        mark = Math.max(mark, row.toTurn);
      }
    }
    // The run did real work rather than skipping every round.
    expect(appended).toBeGreaterThan(100);
    expect(backwards).toBe(0);
  });
});

describe('the store module itself', () => {
  const source = readFileSync(
    join(import.meta.dirname, '..', 'store', 'store.ts'),
    'utf8'
  );

  it('reads the summary table and never writes it outside the one insert', () => {
    expect(source).not.toMatch(/UPDATE summary/i);
    expect(source).not.toMatch(/DELETE FROM summary/i);
    expect(source.match(/INSERT INTO summary/gi) ?? []).toHaveLength(1);
  });

  it('builds the range read out of the shared turn join', () => {
    expect(source).toMatch(
      /TURN_JOIN_SELECT\}\s*AND t\.turn_index >= \? AND t\.turn_index <= \?/
    );
  });
});
