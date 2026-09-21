/**
 * The activity aggregate over a REAL store (Phase 293, spec section 3.4).
 *
 * The store is a scratch file, and every conversation in it was read by the
 * PRODUCT reader from the committed fixtures in
 * docs/research/assets/63-fixtures, then written through the product's own
 * write path. So what is compared against the per-provider truth table is
 * what the shipping SQL answers over what the shipping reader keeps, cursor's
 * SQLite store included.
 *
 * What this pins down:
 * - the counts per provider, the user count being SUM(queued) and never the
 *   turn count, which codex proves with 4 over 3 turns;
 * - NULL out of the LEFT JOIN for a session that holds no turn, never 0;
 * - an id the store does not hold answers NO ROW;
 * - the answer carries no text, only the eleven columns;
 * - THE QUERY PLAN: both reads of `turn` go through its primary key and there
 *   is no scan of `turn`, whatever the store holds.
 */

import Database from 'better-sqlite3';
import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { toActivity, type ActivityRowFacts } from '../activity-map';
import { readSessionLog } from '../reader';
import type { ReadResult } from '../reader';
import { openOverviewStore, type OverviewStore, type StoredActivity } from '../store';
import { LIST_ACTIVITY_SQL } from '../store/store';
import {
  CLAUDE_BARE_CASE,
  JSONL_CASES,
  buildCursorStore,
  readFixture,
  scratchDir,
  type FixtureCase
} from './reader-helpers';

const NOW = 1_756_000_000_000;

/** The truth table of spec section 3.4, one row per fixture. */
interface Truth {
  turns: number;
  user: number;
  agent: number;
  coverage: 'complete' | 'partial';
  reason: 'ask-only' | null;
  by: 'you' | 'agent';
  clock: 'message' | 'ask' | 'session';
}

const TRUTH: Record<string, Truth> = {
  claude: { turns: 3, user: 3, agent: 3, coverage: 'complete', reason: null, by: 'agent', clock: 'message' },
  // One codex turn holds two queued asks, so the user count is 5 over 4 turns.
  // The fourth turn is Phase 299's: its reply exists only as an `AgentMessage`
  // part spelled `Text`, on a `task_complete` carrying no `last_agent_message`.
  codex: { turns: 4, user: 5, agent: 4, coverage: 'complete', reason: null, by: 'agent', clock: 'message' },
  grok: { turns: 3, user: 3, agent: 3, coverage: 'complete', reason: null, by: 'agent', clock: 'message' },
  // The last turn has no answer, so the last author is the person.
  antigravity: { turns: 3, user: 3, agent: 2, coverage: 'complete', reason: null, by: 'you', clock: 'message' },
  qwen: { turns: 4, user: 4, agent: 4, coverage: 'complete', reason: null, by: 'agent', clock: 'message' },
  pi: { turns: 2, user: 2, agent: 2, coverage: 'complete', reason: null, by: 'agent', clock: 'message' },
  omp: { turns: 2, user: 2, agent: 2, coverage: 'complete', reason: null, by: 'agent', clock: 'message' },
  muse: { turns: 2, user: 2, agent: 2, coverage: 'complete', reason: null, by: 'agent', clock: 'message' },
  // The fixture holds answers. Real files hold them in 1 of 216, which is why
  // the coverage is partial whatever this one file says.
  gemini: { turns: 3, user: 3, agent: 3, coverage: 'partial', reason: 'ask-only', by: 'agent', clock: 'message' },
  // No clock on either slot, so the time is the record's own updated time.
  deepseek: { turns: 3, user: 3, agent: 1, coverage: 'complete', reason: null, by: 'you', clock: 'session' }
};

/** omp is not in the shared helper's table, so its case is spelled here. */
const OMP_CASE: FixtureCase = {
  provider: 'omp',
  file: 'omp-sessions-rookery/2026-06-12T04-57-36-108Z_019eba31-566c-7911-bf09-14afe53d7c36.jsonl',
  cwd: '/Users/example/rookery'
};

let dir: string;
let dbPath: string;
let store: OverviewStore;
let cursorRead: ReadResult;

function facts(id: string, agent: string): ActivityRowFacts {
  return { id, agent, machineId: 'local', agentSessionId: 'aaaa', known: true };
}

/** One conversation through the product's write path, exactly as the service writes it. */
function write(id: string, provider: string, read: ReadResult): void {
  store.upsertSession({
    sessionId: id,
    agent: provider,
    provider,
    agentSessionId: 'aaaa',
    logPath: '/scratch/log',
    watermark: read.watermark,
    mapVersionAtLastRead: 1,
    lastReadAt: NOW,
    readState: 'ok',
    readDetail: null,
    lastTouchedAt: read.lastTouchedAt,
    model: null,
    branch: null,
    honest: null
  });
  store.replaceTurnsFrom(id, 0, read.turns, read.watermark, 1, NOW);
}

function quiet(id: string, agent: string, readState: StoredActivity['readState']): void {
  store.upsertSession({
    sessionId: id,
    agent,
    provider: agent,
    agentSessionId: null,
    logPath: null,
    watermark: null,
    mapVersionAtLastRead: null,
    lastReadAt: null,
    readState,
    readDetail: null,
    lastTouchedAt: null,
    model: null,
    branch: null,
    honest: null
  });
}

function one(id: string): StoredActivity {
  const rows = store.listActivity([id]);
  expect(rows).toHaveLength(1);
  return rows[0] as StoredActivity;
}

beforeAll(() => {
  dir = scratchDir('p293-activity');
  dbPath = join(dir, 'overview.db');
  store = openOverviewStore(dbPath);
  for (const [provider, fixture] of Object.entries({ ...JSONL_CASES, omp: OMP_CASE })) {
    write(`S-${provider}`, provider, readFixture(fixture));
  }
  cursorRead = readSessionLog({
    provider: 'cursor',
    file: buildCursorStore(dir),
    sessionId: null,
    cwd: '/Users/example/rookery',
    projectPath: '/Users/example/rookery',
    watermark: null
  });
  write('S-cursor', 'cursor', cursorRead);
  // Phase 299, C3. A claude record holding bare slash commands, beside the
  // provider rows rather than inside the truth table, because it is a second
  // record for a provider the table already covers.
  write('S-claude-bare', 'claude', readFixture(CLAUDE_BARE_CASE));
  quiet('S-shell', 'shell', 'shell');
  quiet('S-nofile', 'claude', 'no-file');
  quiet('S-droid', 'droid', 'no-store');
  // `ok` with zero turns: a record was read and held nothing Tortie keeps.
  write('S-empty', 'claude', { ...readFixture(JSONL_CASES['claude'] as FixtureCase), turns: [] });
});

afterAll(() => {
  try {
    store.close();
  } catch {
    // Already closed.
  }
  rmSync(dir, { recursive: true, force: true });
});

describe('listActivity over what the product reader kept', () => {
  it('covers every fixture the truth table names', () => {
    expect(Object.keys(TRUTH).sort()).toEqual(
      [...Object.keys(JSONL_CASES), 'omp'].sort()
    );
  });

  it.each(Object.entries(TRUTH))(
    '%s: the stored counts are the truth table’s',
    (provider, truth) => {
      const row = one(`S-${provider}`);
      expect(row.provider).toBe(provider);
      expect(row.readState).toBe('ok');
      expect(row.turns).toBe(truth.turns);
      expect(row.userMessages).toBe(truth.user);
      expect(row.agentReplies).toBe(truth.agent);
      expect(row.lastReadAt).toBe(NOW);
    }
  );

  it.each(Object.entries(TRUTH))(
    '%s: mapped, the coverage, the last author and the CLOCK are the truth table’s',
    (provider, truth) => {
      const out = toActivity(facts(`S-${provider}`, provider), one(`S-${provider}`));
      expect(out.coverage).toBe(truth.coverage);
      expect(out.reason).toBe(truth.reason);
      expect(out.userMessages).toBe(truth.user);
      expect(out.agentMessages).toBe(truth.agent);
      expect(out.lastMessageBy).toBe(truth.by);
      expect(out.lastMessageClock).toBe(truth.clock);
      expect(out.lastMessageAt).not.toBeNull();
      // The agent count never exceeds the turn count: one closing reply per turn.
      expect(out.agentMessages ?? 0).toBeLessThanOrEqual(truth.turns);
    }
  );

  it('codex: SUM(queued) is 5 over 4 turns, and COUNT(*) would have said 4', () => {
    const row = one('S-codex');
    expect(row.turns).toBe(4);
    expect(row.userMessages).toBe(5);
    expect(store.countTurns('S-codex')).toBe(4);
  });

  // Phase 299, C3. Measured at c1de8e0f with the engine's unconditional clause
  // restored: this same record stores 3 turns, 3 user and 3 agent, because the
  // two bare commands were emptied and their replies folded into the turn
  // before them.
  it('claude, a bare slash command: 5 turns, 5 user and 5 agent through the store', () => {
    const row = one('S-claude-bare');
    expect(row.provider).toBe('claude');
    expect(row.readState).toBe('ok');
    expect(row.turns).toBe(5);
    expect(row.userMessages).toBe(5);
    expect(row.agentReplies).toBe(5);
    const out = toActivity(facts('S-claude-bare', 'claude'), row);
    expect(out.coverage).toBe('complete');
    expect(out.reason).toBeNull();
    expect(out.userMessages).toBe(5);
    expect(out.agentMessages).toBe(5);
  });

  it('deepseek: the clock is the record’s own updated time, to the millisecond Date.parse reads', () => {
    const row = one('S-deepseek');
    expect(row.lastAskAt).toBeNull();
    expect(row.lastAnswerAt).toBeNull();
    expect(row.lastTouchedAt).toBe('2026-08-10T19:57:47.358535Z');
    const out = toActivity(facts('S-deepseek', 'deepseek'), row);
    expect(out.lastMessageAt).toBe(Date.parse('2026-08-10T19:57:47.358535Z'));
  });

  it('the last turn is read BY INDEX: it is the highest turn_index, whatever the clocks say', () => {
    const turns = store.listTurns('S-antigravity');
    const last = turns.at(-1);
    const row = one('S-antigravity');
    expect(row.lastAskAt).toBe(last?.askAt ?? null);
    expect(row.lastHasAnswer).toBe(last?.answerText !== null);
    expect(row.lastHasAnswer).toBe(false);
  });
});

describe('cursor, through a real store.db the product reader opened', () => {
  it('reads 3 turns, 3 asks and 2 replies', () => {
    const row = one('S-cursor');
    expect(row.turns).toBe(3);
    expect(row.userMessages).toBe(3);
    expect(row.agentReplies).toBe(2);
  });

  it('records a text clock on the prompt and NO clock on any reply', () => {
    for (const turn of cursorRead.turns) {
      expect(turn.ask.at).not.toBeNull();
      if (turn.answer !== null) expect(turn.answer.at).toBeNull();
    }
  });

  // WHICH TURN IS LAST, measured through the product reader on 2026-09-18:
  // the fixture holds three turns, 0 answered, 1 unanswered, 2 answered, and
  // no reply in it carries a time. So the last message is the agent's, and the
  // only time there is belongs to the prompt of turn 2, 9:33 AM.
  it('the last turn, index 2, holds a reply with no clock: the agent, the PROMPT’s time, clock ASK', () => {
    const last = cursorRead.turns.at(-1);
    expect(last?.index).toBe(2);
    expect(last?.answer).not.toBeNull();
    const row = one('S-cursor');
    expect(row.lastHasAnswer).toBe(true);
    expect(row.lastAnswerAt).toBeNull();
    const out = toActivity(facts('S-cursor', 'cursor'), row);
    expect(out.coverage).toBe('complete');
    expect(out.lastMessageBy).toBe('agent');
    expect(out.lastMessageClock).toBe('ask');
    expect(out.lastMessageClock).not.toBe('message');
    expect(out.lastMessageAt).toBe(Date.parse(last?.ask.at ?? ''));
    // Minute resolution: the prompt's text tag carries no seconds.
    expect(out.lastMessageAt).not.toBeNull();
    expect((out.lastMessageAt ?? 1) % 60_000).toBe(0);
  });

  it('cut back to turn 1, which holds no reply: the person, the prompt’s own time, clock MESSAGE', () => {
    const upTo = cursorRead.turns.filter((turn) => turn.index <= 1);
    expect(upTo.at(-1)?.answer).toBeNull();
    write('S-cursor-cut', 'cursor', { ...cursorRead, turns: upTo });
    const out = toActivity(facts('S-cursor-cut', 'cursor'), one('S-cursor-cut'));
    expect(out.userMessages).toBe(2);
    expect(out.agentMessages).toBe(1);
    expect(out.lastMessageBy).toBe('you');
    expect(out.lastMessageClock).toBe('message');
    expect(out.lastMessageAt).toBe(Date.parse(upTo.at(-1)?.ask.at ?? ''));
  });
});

describe('NULL is preserved out of the store', () => {
  it.each(['S-shell', 'S-nofile', 'S-droid', 'S-empty'])(
    '%s holds no turn, and every aggregate is NULL, never 0',
    (id) => {
      const row = one(id);
      expect(row.turns).toBeNull();
      expect(row.userMessages).toBeNull();
      expect(row.agentReplies).toBeNull();
      expect(row.lastAskAt).toBeNull();
      expect(row.lastAnswerAt).toBeNull();
      expect(row.lastHasAnswer).toBeNull();
    }
  );

  it('mapped: a no-file row is a dash and never a zero, and `ok` with zero turns is the one zero', () => {
    const nofile = toActivity(facts('S-nofile', 'claude'), one('S-nofile'));
    expect(nofile.coverage).toBe('unavailable');
    expect(nofile.reason).toBe('not-yet');
    expect(nofile.userMessages).toBeNull();
    const empty = toActivity(facts('S-empty', 'claude'), one('S-empty'));
    expect(empty.coverage).toBe('complete');
    expect(empty.userMessages).toBe(0);
    expect(empty.agentMessages).toBe(0);
    expect(empty.lastMessageAt).toBeNull();
    const droid = toActivity(facts('S-droid', 'droid'), one('S-droid'));
    expect(droid.reason).toBe('no-store');
    expect(droid.userMessages).toBeNull();
  });
});

describe('the shape of the answer', () => {
  it('an id the store does not hold answers NO ROW', () => {
    expect(store.listActivity(['S-nobody'])).toEqual([]);
    const rows = store.listActivity(['S-nobody', 'S-claude', 'S-also-nobody']);
    expect(rows.map((row) => row.sessionId)).toEqual(['S-claude']);
  });

  it('answers in the asked order, a repeated id once, and nothing for an empty list', () => {
    const rows = store.listActivity(['S-qwen', 'S-claude', 'S-qwen']);
    expect(rows.map((row) => row.sessionId)).toEqual(['S-qwen', 'S-claude']);
    expect(store.listActivity([])).toEqual([]);
  });

  it('carries the eleven columns and NO TEXT of any conversation', () => {
    const row = one('S-claude');
    expect(Object.keys(row).sort()).toEqual(
      [
        'agentReplies',
        'lastAnswerAt',
        'lastAskAt',
        'lastHasAnswer',
        'lastReadAt',
        'lastTouchedAt',
        'provider',
        'readState',
        'sessionId',
        'turns',
        'userMessages'
      ].sort()
    );
    const firstAsk = store.listTurns('S-claude')[0]?.askText ?? '';
    expect(firstAsk.length).toBeGreaterThan(0);
    expect(JSON.stringify(row)).not.toContain(firstAsk.slice(0, 24));
  });

  it('writes nothing: the file’s data_version does not move across a read', () => {
    const watcher = new Database(dbPath, { readonly: true, fileMustExist: true });
    try {
      const before = watcher.pragma('data_version', { simple: true });
      store.listActivity(Object.keys(TRUTH).map((p) => `S-${p}`));
      expect(watcher.pragma('data_version', { simple: true })).toBe(before);
    } finally {
      watcher.close();
    }
  });
});

describe('the query plan', () => {
  it('reads `turn` through its primary key, twice, and never scans it', () => {
    const db = new Database(dbPath, { readonly: true, fileMustExist: true });
    let plan: string[];
    try {
      plan = (
        db.prepare(`EXPLAIN QUERY PLAN ${LIST_ACTIVITY_SQL}`).all({
          id: 'S-claude'
        }) as Array<{ detail: string }>
      ).map((line) => line.detail);
    } finally {
      db.close();
    }
    // The aggregate walks ONE session's turns, by the key's first column.
    expect(plan).toContainEqual(
      expect.stringMatching(
        /^SEARCH turn USING (COVERING )?INDEX sqlite_autoindex_turn_1 \(session_id=\?\)$/
      )
    );
    // The last turn is one row, by the whole key.
    expect(plan).toContainEqual(
      expect.stringMatching(
        /^SEARCH l USING INDEX sqlite_autoindex_turn_1 \(session_id=\? AND turn_index=\?\)/
      )
    );
    // The session row is one row, by its own key.
    expect(plan).toContainEqual(
      expect.stringMatching(/^SEARCH s USING INDEX sqlite_autoindex_session_1 \(session_id=\?\)/)
    );
    // And no table of the store is ever scanned. `SCAN a` is the one-row
    // result of the aggregate itself, which is not a table.
    for (const line of plan) {
      expect(line).not.toMatch(/\bSCAN (turn|l|s|session|turn_fact)\b/);
    }
  });

  it('names its one parameter, twice, because a numbered one refuses a plain bind', () => {
    expect([...LIST_ACTIVITY_SQL.matchAll(/@id\b/g)]).toHaveLength(2);
    expect(LIST_ACTIVITY_SQL).not.toMatch(/\?\d/);
    // Both reads of `turn` are keyed: the inner WHERE is the whole fix.
    expect(LIST_ACTIVITY_SQL).toMatch(/FROM turn WHERE session_id = @id GROUP BY/);
  });
});
