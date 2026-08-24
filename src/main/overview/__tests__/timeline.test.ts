/**
 * The story a session told, version by version (Phase 143).
 *
 * Every rule the page draws is decided in src/main/overview/timeline.ts, so
 * this file proves them all with plain rows and no React and no database. The
 * source is a small object, because the module takes the two reads it needs
 * rather than the whole store.
 */

import { describe, expect, it } from 'vitest';
import type { OverviewGitMark } from '@shared/overview';
import {
  buildTimeline,
  timelineTurns,
  type TimelineSource
} from '../timeline';
import type { StoredSummary, StoredTurn } from '../store';

const BASE_TIME = 1_700_000_000_000;

function summary(over: Partial<StoredSummary> = {}): StoredSummary {
  return {
    sessionId: 's1',
    version: 1,
    parentVersion: null,
    fromTurn: 0,
    toTurn: 0,
    text: 'You asked the agent to read the log.',
    verdict: 'kept',
    reason: null,
    harness: 'claude',
    model: 'claude-haiku-4-5-20251001',
    providerMapVersion: 1,
    inputHash: 'a'.repeat(64),
    writtenAt: BASE_TIME,
    ...over
  };
}

/** Versions in the order the fold wrote them, numbered for you. */
function chain(rows: Partial<StoredSummary>[]): StoredSummary[] {
  return rows.map((row, i) => summary({ version: i + 1, ...row }));
}

function turn(over: Partial<StoredTurn> = {}): StoredTurn {
  return {
    sessionId: 's1',
    index: 0,
    askText: 'read the log',
    askAt: '2026-08-23T10:00:00.000Z',
    answerText: 'I read it.',
    answerAt: '2026-08-23T10:00:20.000Z',
    queued: 0,
    closed: true,
    interrupted: false,
    notice: null,
    stopReason: null,
    durationMs: 20_000,
    paths: [],
    pathSource: 'text-only',
    gitVerdict: null,
    gitCheckedAt: null,
    ...over
  };
}

/** A source that answers from the rows the test hands it. */
function source(
  summaries: StoredSummary[],
  turns: StoredTurn[] = []
): TimelineSource & { limits: (number | undefined)[] } {
  const limits: (number | undefined)[] = [];
  return {
    limits,
    listSummaries: () => summaries,
    listTurnsBetween: (_sessionId, fromTurn, toTurn, limit) => {
      limits.push(limit);
      const inRange = turns.filter(
        (row) => row.index >= fromTurn && row.index <= toTurn
      );
      return limit === undefined ? inRange : inRange.slice(-limit);
    }
  };
}

describe('when no model is writing these', () => {
  it('answers that nothing is chosen, with no list and no read', () => {
    let read = false;
    const empty: TimelineSource = {
      listSummaries: () => {
        read = true;
        return [];
      },
      listTurnsBetween: () => []
    };
    const out = buildTimeline(empty, 's1', false);
    expect(out).toEqual({
      sessionId: 's1',
      entries: [],
      chosen: false,
      modelChanged: false
    });
    expect(read).toBe(false);
  });

  it('answers chosen with an empty list when the session has no version yet', () => {
    const out = buildTimeline(source([]), 's1', true);
    expect(out.chosen).toBe(true);
    expect(out.entries).toEqual([]);
    expect(out.modelChanged).toBe(false);
  });
});

describe('which versions are drawn', () => {
  it('draws the kept ones and drops the refused and the failed', () => {
    const out = buildTimeline(
      source(
        chain([
          { fromTurn: 0, toTurn: 1, text: 'one' },
          { fromTurn: 2, toTurn: 3, text: null, verdict: 'refused', reason: 'digit' },
          { fromTurn: 4, toTurn: 5, text: null, verdict: 'failed', reason: 'timeout' },
          { fromTurn: 6, toTurn: 7, text: 'two' }
        ])
      ),
      's1',
      true
    );
    expect(out.entries.map((entry) => entry.text)).toEqual(['two', 'one']);
  });

  it('drops a kept row whose sentence is empty', () => {
    const out = buildTimeline(
      source(
        chain([
          { fromTurn: 0, toTurn: 1, text: '' },
          { fromTurn: 2, toTurn: 3, text: 'said something' }
        ])
      ),
      's1',
      true
    );
    expect(out.entries.map((entry) => entry.text)).toEqual(['said something']);
  });

  it('answers newest first', () => {
    const out = buildTimeline(
      source(
        chain([
          { fromTurn: 0, toTurn: 1, text: 'first', writtenAt: BASE_TIME },
          { fromTurn: 2, toTurn: 3, text: 'second', writtenAt: BASE_TIME + 60_000 },
          { fromTurn: 4, toTurn: 5, text: 'third', writtenAt: BASE_TIME + 120_000 }
        ])
      ),
      's1',
      true
    );
    expect(out.entries.map((entry) => entry.text)).toEqual([
      'third',
      'second',
      'first'
    ]);
  });
});

describe('two versions that say the same thing', () => {
  it('become one row carrying the later time and the wider range', () => {
    const out = buildTimeline(
      source(
        chain([
          { fromTurn: 0, toTurn: 2, text: 'same', writtenAt: BASE_TIME },
          { fromTurn: 3, toTurn: 5, text: 'same', writtenAt: BASE_TIME + 60_000 }
        ])
      ),
      's1',
      true
    );
    expect(out.entries).toHaveLength(1);
    const only = out.entries[0];
    expect(only?.writtenAt).toBe(BASE_TIME + 60_000);
    expect(only?.fromTurn).toBe(0);
    expect(only?.toTurn).toBe(5);
    expect(only?.repeated).toBe(true);
  });

  it('collapses a run of three into one', () => {
    const out = buildTimeline(
      source(
        chain([
          { fromTurn: 0, toTurn: 1, text: 'same', writtenAt: BASE_TIME },
          { fromTurn: 2, toTurn: 3, text: 'same', writtenAt: BASE_TIME + 60_000 },
          { fromTurn: 4, toTurn: 5, text: 'same', writtenAt: BASE_TIME + 120_000 }
        ])
      ),
      's1',
      true
    );
    expect(out.entries).toHaveLength(1);
    expect(out.entries[0]?.writtenAt).toBe(BASE_TIME + 120_000);
    expect(out.entries[0]?.toTurn).toBe(5);
  });

  it('stays two rows when a different model wrote the repeat', () => {
    // Joining them would drop the only place the first model is named, and
    // the entry's rule is that where the model changed, each row says which
    // model wrote it.
    const out = buildTimeline(
      source(
        chain([
          { fromTurn: 0, toTurn: 1, text: 'same', model: 'old-model' },
          { fromTurn: 2, toTurn: 3, text: 'same', model: 'new-model' }
        ])
      ),
      's1',
      true
    );
    expect(out.entries).toHaveLength(2);
    expect(out.entries.map((entry) => entry.model)).toEqual([
      'new-model',
      'old-model'
    ]);
    expect(out.modelChanged).toBe(true);
    expect(out.entries.every((entry) => !entry.repeated)).toBe(true);
  });

  it('stays two rows when a different harness wrote the repeat', () => {
    const out = buildTimeline(
      source(
        chain([
          { fromTurn: 0, toTurn: 1, text: 'same', harness: 'claude' },
          { fromTurn: 2, toTurn: 3, text: 'same', harness: 'codex' }
        ])
      ),
      's1',
      true
    );
    expect(out.entries).toHaveLength(2);
    expect(out.modelChanged).toBe(true);
  });

  it('hides no model change behind a run of three', () => {
    // The shape the story surface used to answer with no model named at all,
    // although two models wrote the chain.
    const out = buildTimeline(
      source(
        chain([
          { fromTurn: 0, toTurn: 1, text: 'same', model: 'one' },
          { fromTurn: 2, toTurn: 3, text: 'same', model: 'two' },
          { fromTurn: 4, toTurn: 5, text: 'later', model: 'two' }
        ])
      ),
      's1',
      true
    );
    expect(out.modelChanged).toBe(true);
    expect(out.entries.map((entry) => entry.model)).toEqual([
      'two',
      'two',
      'one'
    ]);
  });

  it('joins a run of three the same pair wrote and keeps the wider end', () => {
    const out = buildTimeline(
      source(
        chain([
          { fromTurn: 0, toTurn: 1, text: 'same', model: 'one' },
          { fromTurn: 2, toTurn: 3, text: 'same', model: 'one' },
          { fromTurn: 4, toTurn: 9, text: 'same', model: 'one' }
        ])
      ),
      's1',
      true
    );
    expect(out.entries).toHaveLength(1);
    expect(out.entries[0]?.toTurn).toBe(9);
    expect(out.entries[0]?.repeated).toBe(true);
  });

  it('leaves two versions that differ as two rows', () => {
    const out = buildTimeline(
      source(
        chain([
          { fromTurn: 0, toTurn: 1, text: 'one thing' },
          { fromTurn: 2, toTurn: 3, text: 'another thing' }
        ])
      ),
      's1',
      true
    );
    expect(out.entries).toHaveLength(2);
    expect(out.entries.every((entry) => !entry.repeated)).toBe(true);
  });

  it('joins a summary that is rewritten from the same first turn', () => {
    // The commonest chain there is. The fold rewrites the whole story every
    // time the session grows, so every version starts at turn zero and only
    // the end moves. Three of them say the same thing, and a person must read
    // that sentence once.
    const out = buildTimeline(
      source(
        chain([
          { fromTurn: 0, toTurn: 0, text: 'first', writtenAt: BASE_TIME },
          { fromTurn: 0, toTurn: 1, text: 'same', writtenAt: BASE_TIME + 1000 },
          { fromTurn: 0, toTurn: 2, text: 'same', writtenAt: BASE_TIME + 2000 },
          { fromTurn: 0, toTurn: 3, text: 'same', writtenAt: BASE_TIME + 3000 },
          { fromTurn: 0, toTurn: 3, text: 'last', writtenAt: BASE_TIME + 4000 }
        ])
      ),
      's1',
      true
    );
    expect(out.entries.map((entry) => entry.text)).toEqual([
      'last',
      'same',
      'first'
    ]);
    const joined = out.entries[1];
    expect(joined?.repeated).toBe(true);
    // The later time, and the wider end.
    expect(joined?.writtenAt).toBe(BASE_TIME + 3000);
    expect(joined?.fromTurn).toBe(0);
    expect(joined?.toTurn).toBe(3);
  });

  it('does not join a repeat that would cover an unwritten turn', () => {
    // The middle version reaches back over the row above it, so the row above
    // is the only place turn nine is spoken for. Joining the last two would
    // make one row covering eight to twelve, and pressing it would show turn
    // nine under a sentence that never covered it. The shipped fold cannot
    // write this shape, and the harness seed can, so the rule is written down.
    const out = buildTimeline(
      source(
        chain([
          { fromTurn: 6, toTurn: 9, text: 'same', harness: 'codex' },
          { fromTurn: 8, toTurn: 8, text: 'same' },
          { fromTurn: 10, toTurn: 12, text: 'same' }
        ])
      ),
      's1',
      true
    );
    expect(out.entries).toHaveLength(3);
    expect(out.entries.map((entry) => entry.fromTurn)).toEqual([10, 8, 6]);
    expect(out.entries.every((entry) => !entry.repeated)).toBe(true);
  });

  it('does not join a repeat that reaches back over the row above it', () => {
    // The row above covers turns the later version covers again. Joining them
    // would keep the earlier start and then say the turns before it are
    // missing, which the later version plainly covered. The shipped fold
    // cannot write this, because its floor is the newest row's last turn, and
    // the harness seed can, so the rule is written down here.
    const out = buildTimeline(
      source(
        chain([
          { fromTurn: 5, toTurn: 10, text: 'same', writtenAt: BASE_TIME },
          { fromTurn: 0, toTurn: 3, text: 'same', writtenAt: BASE_TIME + 1000 }
        ])
      ),
      's1',
      true
    );
    expect(out.entries).toHaveLength(2);
    expect(out.entries.map((entry) => entry.fromTurn)).toEqual([0, 5]);
    expect(out.entries.every((entry) => !entry.repeated)).toBe(true);
    // The older row still says the opening turns were missing when it was
    // written, and the later row, which covers them, says nothing of the sort.
    expect(out.entries[0]?.gapBefore).toBe(false);
    expect(out.entries[1]?.gapBefore).toBe(true);
  });

  it('does not join two identical versions that are not neighbours', () => {
    const out = buildTimeline(
      source(
        chain([
          { fromTurn: 0, toTurn: 1, text: 'same' },
          { fromTurn: 2, toTurn: 3, text: 'different' },
          { fromTurn: 4, toTurn: 5, text: 'same' }
        ])
      ),
      's1',
      true
    );
    expect(out.entries.map((entry) => entry.text)).toEqual([
      'same',
      'different',
      'same'
    ]);
  });
});

describe('the model line', () => {
  it('is off when every drawn row was written by the same pair', () => {
    const out = buildTimeline(
      source(
        chain([
          { fromTurn: 0, toTurn: 1, text: 'one' },
          { fromTurn: 2, toTurn: 3, text: 'two' }
        ])
      ),
      's1',
      true
    );
    expect(out.modelChanged).toBe(false);
  });

  it('is on when the model changed partway', () => {
    const out = buildTimeline(
      source(
        chain([
          { fromTurn: 0, toTurn: 1, text: 'one', model: 'haiku' },
          { fromTurn: 2, toTurn: 3, text: 'two', model: 'sonnet' }
        ])
      ),
      's1',
      true
    );
    expect(out.modelChanged).toBe(true);
    expect(out.entries.map((entry) => entry.model)).toEqual([
      'sonnet',
      'haiku'
    ]);
  });

  it('is on when the harness changed and the model name did not', () => {
    const out = buildTimeline(
      source(
        chain([
          { fromTurn: 0, toTurn: 1, text: 'one', harness: 'claude', model: 'm' },
          { fromTurn: 2, toTurn: 3, text: 'two', harness: 'codex', model: 'm' }
        ])
      ),
      's1',
      true
    );
    expect(out.modelChanged).toBe(true);
  });

  it('ignores a pair that only ever appeared on a refused version', () => {
    const out = buildTimeline(
      source(
        chain([
          { fromTurn: 0, toTurn: 1, text: 'one', model: 'haiku' },
          {
            fromTurn: 2,
            toTurn: 3,
            text: null,
            verdict: 'refused',
            reason: 'digit',
            model: 'sonnet'
          },
          { fromTurn: 4, toTurn: 5, text: 'two', model: 'haiku' }
        ])
      ),
      's1',
      true
    );
    expect(out.modelChanged).toBe(false);
  });
});

describe('turns the story does not cover', () => {
  it('marks the oldest row when the opening turns were never covered', () => {
    const out = buildTimeline(
      source(chain([{ fromTurn: 4, toTurn: 6, text: 'late start' }])),
      's1',
      true
    );
    expect(out.entries[0]?.gapBefore).toBe(true);
  });

  it('leaves the oldest row unmarked when it starts at the first turn', () => {
    const out = buildTimeline(
      source(chain([{ fromTurn: 0, toTurn: 2, text: 'from the start' }])),
      's1',
      true
    );
    expect(out.entries[0]?.gapBefore).toBe(false);
  });

  it('marks a row a refused fold jumped over', () => {
    // The refused fold covered turns two to three, and it still moved the
    // next fold's floor, so no kept version covers those turns.
    const out = buildTimeline(
      source(
        chain([
          { fromTurn: 0, toTurn: 1, text: 'one' },
          { fromTurn: 2, toTurn: 3, text: null, verdict: 'refused', reason: 'digit' },
          { fromTurn: 4, toTurn: 5, text: 'two' }
        ])
      ),
      's1',
      true
    );
    const [newest, oldest] = out.entries;
    expect(newest?.text).toBe('two');
    expect(newest?.gapBefore).toBe(true);
    expect(oldest?.gapBefore).toBe(false);
  });

  it('leaves a row unmarked when it starts right after the row before it', () => {
    const out = buildTimeline(
      source(
        chain([
          { fromTurn: 0, toTurn: 1, text: 'one' },
          { fromTurn: 2, toTurn: 3, text: 'two' }
        ])
      ),
      's1',
      true
    );
    expect(out.entries.every((entry) => !entry.gapBefore)).toBe(true);
  });

  it('keeps a repeat that straddles a break as its own row, and says so', () => {
    // The shape the story surface used to swallow whole: a refused fold moved
    // the floor, and the fold after it wrote the same sentence again, so the
    // row was widened over turns no sentence covers and said nothing.
    const out = buildTimeline(
      source(
        chain([
          { fromTurn: 0, toTurn: 2, text: 'same' },
          {
            fromTurn: 3,
            toTurn: 5,
            text: null,
            verdict: 'refused',
            reason: 'digit'
          },
          { fromTurn: 6, toTurn: 8, text: 'same' }
        ])
      ),
      's1',
      true
    );
    expect(out.entries).toHaveLength(2);
    const [newest, oldest] = out.entries;
    expect(newest?.fromTurn).toBe(6);
    expect(newest?.toTurn).toBe(8);
    expect(newest?.gapBefore).toBe(true);
    expect(oldest?.fromTurn).toBe(0);
    expect(oldest?.toTurn).toBe(2);
    expect(oldest?.gapBefore).toBe(false);
  });

  it('never lets a version that covers old ground lower the watermark', () => {
    // A chain built again from the first turn. The rows after it cover turns
    // an earlier row already covered, and no later row may call that a break.
    const out = buildTimeline(
      source(
        chain([
          { fromTurn: 0, toTurn: 10, text: 'the whole thing' },
          { fromTurn: 0, toTurn: 3, text: 'the opening again' },
          { fromTurn: 4, toTurn: 6, text: 'the middle again' },
          { fromTurn: 11, toTurn: 13, text: 'carrying on' }
        ])
      ),
      's1',
      true
    );
    expect(out.entries).toHaveLength(4);
    expect(out.entries.every((entry) => !entry.gapBefore)).toBe(true);
  });

  it('takes the mark from the earliest member of a collapsed row', () => {
    const out = buildTimeline(
      source(
        chain([
          { fromTurn: 0, toTurn: 1, text: 'one' },
          { fromTurn: 4, toTurn: 5, text: 'same' },
          { fromTurn: 6, toTurn: 7, text: 'same' }
        ])
      ),
      's1',
      true
    );
    expect(out.entries).toHaveLength(2);
    expect(out.entries[0]?.gapBefore).toBe(true);
    expect(out.entries[0]?.toTurn).toBe(7);
  });
});

describe('the turns one row covers', () => {
  it('answers the range, oldest first', () => {
    const out = timelineTurns(
      source(
        [],
        [turn({ index: 0 }), turn({ index: 1 }), turn({ index: 2 })]
      ),
      { sessionId: 's1', fromTurn: 1, toTurn: 2 }
    );
    expect(out.map((view) => view.index)).toEqual([1, 2]);
  });

  it('uses the git mark the store already holds and runs nothing', () => {
    const marks: OverviewGitMark[] = ['agrees', 'no-record'];
    const out = timelineTurns(
      source(
        [],
        [
          turn({ index: 0, gitVerdict: marks[0] ?? null }),
          turn({ index: 1, gitVerdict: marks[1] ?? null })
        ]
      ),
      { sessionId: 's1', fromTurn: 0, toTurn: 1 }
    );
    expect(out.map((view) => view.git)).toEqual(['agrees', 'no-record']);
  });

  it('says there is nothing to check when the turn was never marked', () => {
    const out = timelineTurns(
      source([], [turn({ index: 0, gitVerdict: null })]),
      { sessionId: 's1', fromTurn: 0, toTurn: 0 }
    );
    expect(out[0]?.git).toBe('nothing-to-check');
  });

  it('clips a very long ask and says it clipped', () => {
    const out = timelineTurns(
      source([], [turn({ index: 0, askText: 'x'.repeat(5_000) })]),
      { sessionId: 's1', fromTurn: 0, toTurn: 0 }
    );
    expect(out[0]?.askText).toHaveLength(4_000);
    expect(out[0]?.askClipped).toBe(true);
  });

  it('clips a very long answer and says it clipped', () => {
    const out = timelineTurns(
      source([], [turn({ index: 0, answerText: 'y'.repeat(5_000) })]),
      { sessionId: 's1', fromTurn: 0, toTurn: 0 }
    );
    expect(out[0]?.answerText).toHaveLength(4_000);
    expect(out[0]?.answerClipped).toBe(true);
  });

  it('leaves a short turn alone and says so', () => {
    const out = timelineTurns(source([], [turn({ index: 0 })]), {
      sessionId: 's1',
      fromTurn: 0,
      toTurn: 0
    });
    expect(out[0]?.askClipped).toBe(false);
    expect(out[0]?.answerClipped).toBe(false);
    expect(out[0]?.answerText).toBe('I read it.');
  });

  it('carries a turn with no answer through as null', () => {
    const out = timelineTurns(
      source([], [turn({ index: 0, answerText: null, answerAt: null })]),
      { sessionId: 's1', fromTurn: 0, toTurn: 0 }
    );
    expect(out[0]?.answerText).toBeNull();
    expect(out[0]?.answerClipped).toBe(false);
  });

  it('names no path judgement, because it is given a session and not a project', () => {
    const out = timelineTurns(source([], [turn({ index: 0 })]), {
      sessionId: 's1',
      fromTurn: 0,
      toTurn: 0
    });
    expect(out[0]?.namedOnlyOutside).toBe(false);
  });

  it('holds a very wide range to the ceiling and takes the newest turns', () => {
    const many = Array.from({ length: 260 }, (_, i) => turn({ index: i }));
    const fake = source([], many);
    const out = timelineTurns(fake, {
      sessionId: 's1',
      fromTurn: 0,
      toTurn: 259
    });
    expect(out).toHaveLength(200);
    expect(out[0]?.index).toBe(60);
    expect(out.at(-1)?.index).toBe(259);
    // The ceiling is asked of the store too, so one wide range never reads a
    // whole session into memory.
    expect(fake.limits).toEqual([200]);
  });
});
