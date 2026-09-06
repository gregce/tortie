/**
 * The repair half of `npm run conformance:derived` (Phase 215).
 *
 * It builds a fixture codex store and a fixture manifest under a scratch
 * directory the checker gives it, runs the SHIPPING boot repair over them
 * TWICE, and prints every outcome and a digest of every row after each pass.
 *
 * IT NEVER TOUCHES A REAL STORE. The codex home and the manifest are both
 * under the scratch directory, and nothing here reads the person's home,
 * spawns an agent, opens a keychain or launches an Electron.
 */

import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ManifestStore } from '../src/main/manifest/store';
import { repairCodexResumeIds } from '../src/main/sessions/codex-repair';

const dir = process.env['P215_SCRATCH'] ?? '';
const home = join(dir, 'home');
const shard = join(home, '.codex', 'sessions', '2026', '09', '03');
mkdirSync(shard, { recursive: true });

const rollout = (id: string, payload: Record<string, unknown>): void => {
  writeFileSync(
    join(shard, `rollout-2026-09-03T18-36-19-${id}.jsonl`),
    `${JSON.stringify({ type: 'session_meta', payload: { id, ...payload } })}\n`
  );
};
const session = (id: string): void =>
  rollout(id, { cwd: '/w', thread_source: 'user', source: 'cli' });
const subagent = (id: string, parent: string): void =>
  rollout(id, {
    cwd: '/w',
    thread_source: 'subagent',
    parent_thread_id: parent,
    agent_nickname: 'Hegel',
    source: { subagent: { thread_spawn: { parent_thread_id: parent, depth: 1 } } }
  });

const uuid = (n: number): string =>
  `0000000${n}-1111-4111-8111-11111111111${n}`;

// The row shapes, one per verdict the repair can reach.
const PARENT = uuid(0);
const SUB = uuid(1);
const REAL = uuid(2);
const ORPHAN = uuid(3); // derived, names a parent nobody wrote
const NOPARENT = uuid(4); // derived, names no parent anywhere
const CYCLE_A = uuid(5);
const CYCLE_B = uuid(6);
const MID = uuid(7); // two hop chain
const DEEP = uuid(8);
const GONE = uuid(9); // no rollout at all

session(PARENT);
subagent(SUB, PARENT);
session(REAL);
subagent(ORPHAN, 'ffffffff-9999-4999-8999-999999999999');
rollout(NOPARENT, { cwd: '/w', source: { subagent: {} } });
subagent(CYCLE_A, CYCLE_B);
subagent(CYCLE_B, CYCLE_A);
subagent(MID, PARENT);
subagent(DEEP, MID);

const store = new ManifestStore(join(dir, 'manifest.db'));
const insert = (id: string, agentSessionId: string | undefined, agent = 'codex'): void => {
  const now = 1_700_000_000;
  store.insertSession({
    id,
    name: id,
    tmuxName: id,
    projectPath: '/w',
    cwd: '/w',
    agent: agent as 'codex',
    status: 'restorable',
    createdAt: now,
    lastSeen: now,
    argv: ['/usr/local/bin/codex', '--flag'],
    ...(agentSessionId !== undefined ? { agentSessionId } : {})
  });
};

insert('row-sub', SUB);
insert('row-real', REAL);
insert('row-orphan', ORPHAN);
insert('row-noparent', NOPARENT);
insert('row-cycle', CYCLE_A);
insert('row-deep', DEEP);
insert('row-gone', GONE);
insert('row-empty', undefined);
insert('row-other', SUB, 'claude');

const digest = (): string =>
  createHash('sha256')
    .update(
      JSON.stringify(
        store.listSessions().map((r) => [
          r.id,
          r.agent,
          r.agentSessionId ?? null,
          r.resumeArgv ?? null,
          r.resumeProvenance ?? null
        ])
      )
    )
    .digest('hex');

const before = digest();
const options = { home, env: {}, now: () => 1_700_000_042 };
const first = repairCodexResumeIds(store, options);
const afterFirst = digest();
const second = repairCodexResumeIds(store, options);
const afterSecond = digest();

const rows = store.listSessions().map((r) => ({
  id: r.id,
  agent: r.agent,
  agentSessionId: r.agentSessionId ?? null,
  resumeArgv: r.resumeArgv ?? null,
  provenance: r.resumeProvenance ?? null
}));

process.stdout.write(
  JSON.stringify({
    ids: { PARENT, SUB, REAL, ORPHAN, NOPARENT, CYCLE_A, DEEP, GONE },
    first,
    second,
    rows,
    digests: { before, afterFirst, afterSecond }
  })
);
store.close();
