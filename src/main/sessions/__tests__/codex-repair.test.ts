/**
 * Phase 215 — the boot repair, over a real manifest and real rollout files.
 *
 * The property list this file exists for, in the order the phase is judged on:
 * NO ROW IS EVER EMPTIED on any path; a row already naming a real session is
 * byte identical afterwards; the walk terminates on a cycle, a self reference
 * and a chain past the bound and leaves the row alone rather than looping; and
 * the pass is idempotent, proved by running it twice and comparing every row.
 *
 * WHAT THIS FILE CANNOT SHOW. It never resumes anything, so it cannot show
 * that the parent id it writes actually opens. That needs `codex resume` under
 * the operator's own login and it is HIS acceptance step, stated as unmeasured
 * in the report rather than implied here.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { closeCodexState } from '../../manifest';
import { ManifestStore, type ManifestSessionRecord } from '../../manifest/store';
import { repairCodexResumeIds, type CodexRepairOutcome } from '../codex-repair';

let dir: string;
let home: string;
let store: ManifestStore;

const SHARD = ['sessions', '2026', '09', '03'];

/** Write a rollout whose line 1 is `payload`. */
function rollout(id: string, payload: Record<string, unknown>): void {
  const shard = join(home, '.codex', ...SHARD);
  mkdirSync(shard, { recursive: true });
  writeFileSync(
    join(shard, `rollout-2026-09-03T18-36-19-${id}.jsonl`),
    `${JSON.stringify({ type: 'session_meta', payload: { id, ...payload } })}\n` +
      `${JSON.stringify({ type: 'event_msg', payload: {} })}\n`
  );
}

function session(id: string, cwd = '/w'): void {
  rollout(id, { cwd, thread_source: 'user', source: 'cli' });
}

function subagent(id: string, parent: string, cwd = '/w'): void {
  rollout(id, {
    cwd,
    thread_source: 'subagent',
    parent_thread_id: parent,
    session_id: parent,
    agent_nickname: 'Hegel',
    source: { subagent: { thread_spawn: { parent_thread_id: parent, depth: 1 } } }
  });
}

function insert(
  id: string,
  patch: Partial<ManifestSessionRecord> = {}
): ManifestSessionRecord {
  const now = Date.now();
  return store.insertSession({
    id,
    name: id,
    tmuxName: id,
    projectPath: '/w',
    cwd: '/w',
    agent: 'codex',
    status: 'restorable',
    createdAt: now,
    lastSeen: now,
    argv: ['/usr/local/bin/codex', '--dangerously-bypass-approvals-and-sandbox'],
    ...patch
  });
}

/** The whole durable state of every row, for a byte comparison. */
function digest(): string {
  return JSON.stringify(
    store.listSessions().map((r) => [
      r.id,
      r.agent,
      r.agentSessionId ?? null,
      r.resumeArgv ?? null,
      r.resumeCapture ?? null,
      r.resumeProvenance ?? null
    ])
  );
}

function run(): CodexRepairOutcome[] {
  return repairCodexResumeIds(store, { home, env: {}, now: () => 1_700_000_000 });
}

function verdictOf(outcomes: CodexRepairOutcome[], id: string): string {
  return outcomes.find((o) => o.sessionId === id)?.verdict ?? 'no-outcome';
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'p215-repair-'));
  home = join(dir, 'home');
  mkdirSync(home, { recursive: true });
  store = new ManifestStore(join(dir, 'manifest.db'));
});

afterEach(() => {
  closeCodexState();
  store.close();
  rmSync(dir, { recursive: true, force: true });
});

describe('the row he reported', () => {
  const OWN = '01a0696a-75d1-7af1-8f22-de5903c5ebeb';
  const PARENT = '01a06966-7253-7a72-afc1-ae84664a7cd5';

  it('moves to the thread that spawned it, keeps its extras, and says where it came from', () => {
    session(PARENT, '/w');
    subagent(OWN, PARENT, '/w');
    insert('row', { agentSessionId: OWN, resumeArgv: ['x'], status: 'idle' });

    const outcomes = run();
    expect(verdictOf(outcomes, 'row')).toBe('repaired');

    const after = store.getSession('row');
    expect(after?.agentSessionId).toBe(PARENT);
    // The resume argv is recomposed the way the harvest composes one: the
    // row's own recorded absolute binary, and the launch extras re-appended,
    // because resume restores no launch flags.
    expect(after?.resumeArgv).toEqual([
      '/usr/local/bin/codex',
      'resume',
      PARENT,
      '--dangerously-bypass-approvals-and-sandbox'
    ]);
    expect(after?.resumeCapture).toBe('armed');
    // THE ROW SAYS WHAT IT IS.
    expect(after?.resumeProvenance?.repairedFrom).toBe(OWN);
    expect(after?.resumeProvenance?.repairedBy).toBe('codex-subagent');
    expect(after?.resumeProvenance?.repairedHops).toBe(1);
    expect(after?.resumeProvenance?.repairedAt).toBe(1_700_000_000);
    // NOT 'exact'. The new id inherits the evidence the old one had, being a
    // folder and a time, and the row that said 'exact' about the old one is
    // the overstatement this phase exists to end.
    expect(after?.resumeProvenance?.confidence).toBe('weak');
    expect(after?.resumeProvenance?.keyConfidence).toBe('weak');
  });

  it('is idempotent: a second pass moves nothing and changes no byte', () => {
    session(PARENT);
    subagent(OWN, PARENT);
    insert('row', { agentSessionId: OWN });
    expect(run().filter((o) => o.verdict === 'repaired')).toHaveLength(1);
    const afterFirst = digest();
    const second = run();
    expect(second.filter((o) => o.verdict === 'repaired')).toHaveLength(0);
    expect(verdictOf(second, 'row')).toBe('already-a-session');
    expect(digest()).toBe(afterFirst);
  });
});

describe('what it leaves exactly as it is, and it never empties one', () => {
  const A = 'aaaaaaaa-1111-4111-8111-111111111111';
  const B = 'bbbbbbbb-2222-4222-8222-222222222222';
  const C = 'cccccccc-3333-4333-8333-333333333333';

  it('a row already naming a real session is byte identical', () => {
    session(A);
    insert('row', { agentSessionId: A, resumeArgv: ['codex', 'resume', A] });
    const before = digest();
    expect(verdictOf(run(), 'row')).toBe('already-a-session');
    expect(digest()).toBe(before);
  });

  it('a row with no id at all is not an outcome and is untouched', () => {
    insert('row');
    const before = digest();
    expect(run()).toHaveLength(0);
    expect(digest()).toBe(before);
  });

  it('a sub agent that names no parent anywhere keeps its id', () => {
    // The 0.125.0-alpha.3 pair in his store: `source.subagent` with no
    // `thread_spawn` inside it and no parent_thread_id anywhere.
    rollout(A, { cwd: '/w', source: { subagent: {} } });
    insert('row', { agentSessionId: A });
    const before = digest();
    expect(verdictOf(run(), 'row')).toBe('no-parent-named');
    expect(store.getSession('row')?.agentSessionId).toBe(A);
    expect(digest()).toBe(before);
  });

  it('a parent whose rollout is not on disk keeps its id', () => {
    subagent(A, B); // B is never written
    insert('row', { agentSessionId: A });
    const before = digest();
    expect(verdictOf(run(), 'row')).toBe('parent-missing');
    expect(store.getSession('row')?.agentSessionId).toBe(A);
    expect(digest()).toBe(before);
  });

  it('a stored id with no rollout at all keeps its id', () => {
    insert('row', { agentSessionId: A });
    const before = digest();
    expect(verdictOf(run(), 'row')).toBe('rollout-missing');
    expect(digest()).toBe(before);
  });

  it('a two record cycle terminates and keeps its id', () => {
    subagent(A, B);
    subagent(B, A);
    insert('row', { agentSessionId: A });
    const before = digest();
    expect(verdictOf(run(), 'row')).toBe('cycle');
    expect(digest()).toBe(before);
  });

  it('a self reference terminates and keeps its id', () => {
    subagent(A, A);
    insert('row', { agentSessionId: A });
    const before = digest();
    expect(verdictOf(run(), 'row')).toBe('cycle');
    expect(digest()).toBe(before);
  });

  it('a chain deeper than the bound keeps its id rather than writing the last hop it reached', () => {
    // Nine derived records in a row, so the eighth hop is over the bound. The
    // rule under test is that the bound REFUSES rather than truncates.
    const ids = Array.from(
      { length: 10 },
      (_, i) => `dddddddd-${String(i).padStart(4, '0')}-4444-8444-444444444444`
    );
    for (let i = 0; i < 9; i += 1) subagent(ids[i]!, ids[i + 1]!);
    session(ids[9]!);
    insert('row', { agentSessionId: ids[0]! });
    const before = digest();
    expect(verdictOf(run(), 'row')).toBe('over-bound');
    expect(store.getSession('row')?.agentSessionId).toBe(ids[0]);
    expect(digest()).toBe(before);
  });

  it('a line 1 that is not JSON leaves the row alone rather than refusing it', () => {
    const shard = join(home, '.codex', ...SHARD);
    mkdirSync(shard, { recursive: true });
    writeFileSync(
      join(shard, `rollout-2026-09-03T18-36-19-${A}.jsonl`),
      'this is not json\n'
    );
    insert('row', { agentSessionId: A });
    const before = digest();
    // The file is THERE and cannot be classified, which is a different
    // sentence from a rollout that is gone. Both leave the row alone.
    expect(verdictOf(run(), 'row')).toBe('cannot-tell');
    expect(digest()).toBe(before);
  });

  it('a .zst sub agent rollout leaves the row alone', () => {
    const shard = join(home, '.codex', ...SHARD);
    mkdirSync(shard, { recursive: true });
    writeFileSync(
      join(shard, `rollout-2026-09-03T18-36-19-${A}.jsonl.zst`),
      'compressed bytes nobody here can read'
    );
    insert('row', { agentSessionId: A });
    const before = digest();
    expect(verdictOf(run(), 'row')).toBe('cannot-tell');
    expect(digest()).toBe(before);
  });

  it('no other agent is touched, whatever its store says', () => {
    subagent(A, B);
    session(B);
    insert('claude-row', { agent: 'claude', agentSessionId: A });
    insert('shell-row', { agent: 'shell', agentSessionId: A });
    const before = digest();
    expect(run()).toHaveLength(0);
    expect(digest()).toBe(before);
  });

  it('walks two hops when the chain really is two deep', () => {
    session(C);
    subagent(B, C);
    subagent(A, B);
    insert('row', { agentSessionId: A });
    const outcomes = run();
    expect(verdictOf(outcomes, 'row')).toBe('repaired');
    expect(outcomes[0]?.hops).toBe(2);
    expect(store.getSession('row')?.agentSessionId).toBe(C);
  });

  it('reads the parent from the NESTED place when the top level has none', () => {
    // 115 of his 521 derived records name their parent only there.
    rollout(A, {
      cwd: '/w',
      source: { subagent: { thread_spawn: { parent_thread_id: B, depth: 1 } } }
    });
    session(B);
    insert('row', { agentSessionId: A });
    expect(verdictOf(run(), 'row')).toBe('repaired');
    expect(store.getSession('row')?.agentSessionId).toBe(B);
  });

  it('repairs a discarded row too, and the id it writes is a real session', () => {
    session(B);
    subagent(A, B);
    insert('row', { agentSessionId: A, status: 'discarded' });
    expect(verdictOf(run(), 'row')).toBe('repaired');
    expect(store.getSession('row')?.agentSessionId).toBe(B);
  });
});

describe('the SpecStory wrapper survives a repair', () => {
  const A = 'aaaaaaaa-1111-4111-8111-111111111111';
  const B = 'bbbbbbbb-2222-4222-8222-222222222222';

  it('recomposes the inner argv from the capture record and rewraps it', () => {
    session(B);
    subagent(A, B);
    insert('row', {
      agentSessionId: A,
      argv: ['/opt/specstory', 'run', '--', '/usr/local/bin/codex'],
      specstory: {
        enabled: true,
        bin: '/opt/specstory',
        binVersion: '1.0.0',
        provider: 'codex',
        exitCodeFidelity: 'exact',
        agentArgv: ['/usr/local/bin/codex', '--dangerously-bypass-approvals-and-sandbox']
      }
    });
    expect(verdictOf(run(), 'row')).toBe('repaired');
    const argv = store.getSession('row')?.resumeArgv ?? [];
    // The wrapper is back on the outside and the agent's own resume is inside
    // it, which SpecStory carries as one `-c` string rather than as elements.
    expect(argv[0]).toBe('/opt/specstory');
    expect(argv.join(' ')).toContain(B);
    expect(argv.join(' ')).not.toContain(A);
  });
});
