/**
 * THE PHONE'S RENAME, OFFERED (Phase 349, build/p349/SPEC.md §4.1, §4.2 steps
 * 5 and 6, D2, D12, D14), driven against the SHIPPING composers in
 * src/main/pocket/routes.ts and the production facts in src/main/pocket/facts.ts.
 *
 *  - A ROW'S `rename`: on every row of `/v1/blocked` (its `rows` and its
 *    `others`) and of `/v1/sessions`, and so on the detail of `/v1/session`,
 *    which inherits its row; PRESENT, and `true`, exactly when the facts'
 *    `renameOffer` answered exactly `true`, and absent otherwise, so a Mac
 *    whose Allow waits, an older Mac and the push seam offer no Rename.
 *  - THE SESSIONS ANSWER'S `renames`: present, and `true`, exactly when the
 *    facts' `renames` answered exactly `true`; OUTSIDE `start` and before it,
 *    so `start` stays the answer's last key (NS9) and a fault in one never
 *    hides the other.
 *  - ITS BYTES COUNT inside the sessions budget, as End's do (D14).
 *  - THE PRODUCTION FACTS pass both reads through untouched, and carry neither
 *    when none was handed in.
 */

import { describe, expect, it, vi } from 'vitest';

vi.mock('../../log', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../log')>();
  const quiet = (): void => undefined;
  return { ...real, getLog: () => ({ error: quiet, warn: quiet, info: quiet, debug: quiet }) };
});

const { createPocketRoutes } = await import('../routes');
const { createPocketFacts } = await import('../facts');
type PocketFacts = import('../routes').PocketFacts;
type Session = import('@shared/types').Session;
type PocketSessionsStart = import('@shared/ipc/pocket').PocketSessionsStart;

/** Three sessions: one waiting, one running, one ended. */
const SESSIONS: Session[] = [
  { id: 'wait', name: 'waits', tmuxName: 'waits', projectPath: '/w', cwd: '/w', agent: 'shell', status: 'needs_input', createdAt: 3 } as Session,
  { id: 'run', name: 'runs', tmuxName: 'runs', projectPath: '/w', cwd: '/w', agent: 'shell', status: 'running', createdAt: 2 } as Session,
  { id: 'over', name: 'ended', tmuxName: 'ended', projectPath: '/w', cwd: '/w', agent: 'shell', status: 'exited', createdAt: 1 } as Session
];

function factsWith(over: Partial<PocketFacts> = {}): PocketFacts {
  return {
    sessions: () => SESSIONS,
    projects: () => [],
    blockedSince: () => new Map([['wait', 3]]),
    wakes: () => [],
    activity: () => undefined,
    statusWord: (s) => ({ dot: s.status === 'exited' ? 'ended' : 'idle', label: s.status }),
    agentLabel: (id) => id,
    machineLabel: () => null,
    emptyLine: 'Nothing needs you',
    catchUp: async () => null,
    lastTurn: async () => ({ answerText: null, turnCount: 0 }),
    turns: async () => ({ turns: [], more: false }),
    handoff: () => null,
    now: () => 10,
    ...over
  };
}

const sessionsQuery = (): URLSearchParams => new URLSearchParams('show=all&group=none&sort=recent');

describe('a row’s rename (D14)', () => {
  it('is on every /v1/blocked row, rows and others, exactly where renameOffer answered exactly true', () => {
    const asked: string[] = [];
    const answer = createPocketRoutes(
      factsWith({
        renameOffer: (s) => {
          asked.push(s.id);
          // Only `run` is offered; a truthy answer that is not `true` offers nothing.
          return (s.id === 'run' ? true : s.id === 'over' ? (1 as unknown as boolean) : false);
        }
      })
    ).blocked();
    const all = [...answer.rows, ...answer.others];
    expect(all.map((r) => [r.sessionId, 'rename' in r ? r.rename : 'absent'])).toEqual([
      ['wait', 'absent'],
      ['run', true],
      ['over', 'absent']
    ]);
    expect([...asked].sort()).toEqual(['over', 'run', 'wait']);
    // After End, as the composer writes it.
    const run = all.find((r) => r.sessionId === 'run');
    expect(Object.keys(run ?? {}).slice(-2)).toEqual(['end', 'rename']);
  });

  it('rides the /v1/session detail, which inherits its row, and is absent there when the row offers none', async () => {
    const routes = createPocketRoutes(factsWith({ renameOffer: (s) => s.id === 'over' }));
    const offered = await routes.session('over');
    expect(offered?.session.rename).toBe(true);
    const plain = await routes.session('run');
    expect(plain).not.toBeNull();
    expect('rename' in (plain?.session ?? {})).toBe(false);
  });

  it('is on every /v1/sessions row exactly where renameOffer answered exactly true', () => {
    const answer = createPocketRoutes(factsWith({ renameOffer: (s) => s.id !== 'wait' })).sessions(sessionsQuery());
    expect(answer).not.toBeNull();
    expect(answer?.rows.map((r) => [r.sessionId, 'rename' in r ? r.rename : 'absent'])).toEqual([
      ['wait', 'absent'],
      ['run', true],
      ['over', true]
    ]);
    const run = answer?.rows.find((r) => r.sessionId === 'run');
    expect(Object.keys(run ?? {}).slice(-2)).toEqual(['end', 'rename']);
  });

  it('counts inside the sessions budget, as End’s bytes do: the same rows weigh more with the offer', () => {
    // The budget is measured on the rows as composed, so an offered row's
    // `"rename":true` is paid for; read through the answer's own bytes.
    const plain = createPocketRoutes(factsWith()).sessions(sessionsQuery());
    const offered = createPocketRoutes(factsWith({ renameOffer: () => true })).sessions(sessionsQuery());
    const bytes = (rows: unknown): number => Buffer.byteLength(JSON.stringify(rows));
    expect(bytes(offered?.rows)).toBe(bytes(plain?.rows) + SESSIONS.length * ',"rename":true'.length);
  });
});

describe('the sessions answer’s renames (D2, D12)', () => {
  const START: PocketSessionsStart = { state: 'waiting' };

  it('is present, true, exactly when renames() answered exactly true, before start, which stays last', () => {
    const both = createPocketRoutes(factsWith({ renames: () => true, start: () => START })).sessions(sessionsQuery());
    expect(both?.renames).toBe(true);
    expect(Object.keys(both ?? {}).slice(-2)).toEqual(['renames', 'start']);
    // Neither inside the other: a fault in renames never touches the "+".
    expect(both?.start).toEqual(START);
    expect('renames' in (both?.start ?? {})).toBe(false);
    for (const answered of [false, 1, 'true', undefined]) {
      const got = createPocketRoutes(factsWith({ renames: () => answered as unknown as boolean, start: () => START })).sessions(sessionsQuery());
      expect('renames' in (got ?? {}), String(answered)).toBe(false);
      expect(got?.start, String(answered)).toEqual(START);
    }
    // With no start, renames is the last key and stands alone.
    const alone = createPocketRoutes(factsWith({ renames: () => true })).sessions(sessionsQuery());
    expect(Object.keys(alone ?? {}).at(-1)).toBe('renames');
  });

  it('is absent everywhere, and no row carries rename, when the facts carry neither member (the push seam, the tests)', async () => {
    const routes = createPocketRoutes(factsWith());
    const blocked = routes.blocked();
    for (const row of [...blocked.rows, ...blocked.others]) expect('rename' in row).toBe(false);
    const sessions = routes.sessions(sessionsQuery());
    expect('renames' in (sessions ?? {})).toBe(false);
    for (const row of sessions?.rows ?? []) expect('rename' in row).toBe(false);
    expect('rename' in ((await routes.session('run'))?.session ?? {})).toBe(false);
  });
});

describe('the production facts (§4.2 step 6)', () => {
  it('pass renameOffer and renames through untouched, and carry neither when none was handed in', () => {
    const renameOffer = (s: Session): boolean => s.id === 'run';
    const renames = (): boolean => true;
    const overview = { manifest: () => Promise.reject(new Error('unused')), store: () => { throw new Error('unused'); } };
    const handed = createPocketFacts({ core: () => null, overview: overview as never, wakes: () => [], renameOffer, renames });
    expect(handed.renameOffer).toBe(renameOffer);
    expect(handed.renames).toBe(renames);
    const plain = createPocketFacts({ core: () => null, overview: overview as never, wakes: () => [] });
    expect(plain.renameOffer).toBeUndefined();
    expect(plain.renames).toBeUndefined();
  });
});
