/**
 * Restart never destroys the original first (Phase 19 item 8).
 *
 * The defect this replaces was one line of ordering: `discard()` and then
 * `create()`. Discard deletes the manifest row, the scrollback snapshot and
 * the hook settings file, so every way a create can fail was a way to lose a
 * session from a button with no undo. R33 asked for exactly this proof, in
 * these words: "Force `create` to throw at each failure point; assert row,
 * snapshot and hook settings all survive."
 *
 * The host below is a fake, and it is a fake on purpose. Driving the real core
 * would test tmux; what is under test here is an ORDER, and an order is proven
 * by recording the calls and reading them back.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CreateSessionInput, Session } from '@shared/types';

vi.mock('electron', () => ({
  app: { getPath: () => '/tmp/tortie-restart-test' }
}));

const { restartSession } = await import('../restart');
import type { RestartHost } from '../restart';
import type { ManifestSessionRecord } from '../../manifest/store';
import { RESTART_ON_MACHINE } from '../../machines/remote-copy';

const SESSION_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

function record(over: Partial<ManifestSessionRecord> = {}): ManifestSessionRecord {
  return {
    id: SESSION_ID,
    name: 'auth',
    tmuxName: 'auth',
    projectPath: '/repo',
    cwd: '/repo/api',
    agent: 'shell',
    status: 'exited',
    createdAt: 0,
    argv: ['/bin/zsh', '-l'],
    lastSeen: 0,
    ...over
  };
}

interface Fake {
  host: RestartHost;
  /** Every call this restart made, in order. */
  calls: string[];
  /** What createSession was handed. */
  created: CreateSessionInput[];
}

function fake(
  rec: ManifestSessionRecord,
  createFails?: Error
): Fake {
  const calls: string[] = [];
  const created: CreateSessionInput[] = [];
  const host: RestartHost = {
    manifest: { getSession: (id) => (id === rec.id ? rec : undefined) },
    createSession: async (input) => {
      calls.push('create');
      created.push(input);
      if (createFails !== undefined) throw createFails;
      const session: Session = {
        id: 'new-session',
        name: input.name,
        tmuxName: `${input.name}-2`,
        projectPath: input.projectPath,
        cwd: input.cwd ?? input.projectPath,
        agent: input.agent,
        status: 'running',
        createdAt: 1
      };
      return session;
    },
    killSession: async () => {
      calls.push('kill');
    },
    discardSession: () => {
      calls.push('discard');
    },
    broadcastSessions: () => {
      calls.push('broadcast');
    }
  };
  return { host, calls, created };
}

let warned: string[] = [];

beforeEach(() => {
  warned = [];
  vi.spyOn(console, 'warn').mockImplementation((...args: unknown[]) => {
    warned.push(args.join(' '));
  });
});

describe('the order', () => {
  it('creates the replacement before it discards anything', async () => {
    const f = fake(record());
    await restartSession(f.host, SESSION_ID);
    expect(f.calls).toEqual(['create', 'discard', 'broadcast']);
  });

  it('discards nothing at all when the create fails', async () => {
    const f = fake(record(), new Error('claude not found'));
    await expect(restartSession(f.host, SESSION_ID)).rejects.toThrow(
      'claude not found'
    );
    expect(f.calls).toEqual(['create']);
    expect(f.calls).not.toContain('discard');
  });

  it('rethrows the create’s own error, so the user reads the real reason', async () => {
    const f = fake(record(), new Error('The project folder does not exist.'));
    await expect(restartSession(f.host, SESSION_ID)).rejects.toThrow(
      'The project folder does not exist.'
    );
  });

  it('refuses a session id that is not in the manifest', async () => {
    const f = fake(record());
    await expect(restartSession(f.host, 'no-such-id')).rejects.toThrow(
      /no session/i
    );
    expect(f.calls).toEqual([]);
  });
});

describe('a row that is still live', () => {
  it('is stopped after the replacement exists and before the discard', async () => {
    const f = fake(record({ status: 'running' }));
    const out = await restartSession(f.host, SESSION_ID);
    expect(f.calls).toEqual(['create', 'kill', 'discard', 'broadcast']);
    expect(out.killedOld).toBe(true);
  });

  it('is not stopped when it had already exited', async () => {
    const f = fake(record({ status: 'exited' }));
    const out = await restartSession(f.host, SESSION_ID);
    expect(f.calls).not.toContain('kill');
    expect(out.killedOld).toBe(false);
  });

  it('still finishes the restart when the kill fails', async () => {
    const f = fake(record({ status: 'running' }));
    f.host.killSession = async () => {
      f.calls.push('kill');
      throw new Error('tmux went away');
    };
    const out = await restartSession(f.host, SESSION_ID);
    // PHASE 305 (build/p353/SPEC.md D305-5), RED ON PURPOSE: the parent read
    // ['create', 'kill', 'discard', 'broadcast'] here. A kill that failed no
    // longer reaches the delete, because a pane that survived its kill and
    // then lost its row is the orphan step 3 exists to prevent. The restart
    // still finishes, the replacement exists and the warning is still said.
    expect(f.calls).toEqual(['create', 'kill', 'broadcast']);
    expect(out.killedOld).toBe(false);
    expect(out.oldRow).toBe('kept-kill-failed');
    expect(warned.join('\n')).toContain('could not stop the old');
  });
});

describe('what the replacement is created with', () => {
  it('the same name, project and working directory', async () => {
    const f = fake(record());
    await restartSession(f.host, SESSION_ID);
    expect(f.created[0]).toMatchObject({
      name: 'auth',
      projectPath: '/repo',
      cwd: '/repo/api',
      agent: 'shell'
    });
  });

  it('the launch flags the original was started with', async () => {
    const f = fake(record({ argv: ['/bin/zsh', '-l', '-c', 'htop'] }));
    await restartSession(f.host, SESSION_ID);
    // Phase 74: the `-l` at index 1 is generated by the create path now, so it
    // is not one of the user's flags. The replacement gets it back from
    // buildLaunchSpec, and reporting it here would build ['/bin/zsh','-l','-l'].
    expect(f.created[0]?.extraArgs).toEqual(['-c', 'htop']);
  });

  it('no extraArgs key at all when there were no flags', async () => {
    const f = fake(record({ argv: ['/bin/zsh'] }));
    await restartSession(f.host, SESSION_ID);
    expect(f.created[0] && 'extraArgs' in f.created[0]).toBe(false);
  });

  it('capture: true when the original was captured', async () => {
    const f = fake(
      record({
        specstory: {
          enabled: true,
          provider: 'shell',
          bin: '/opt/specstory',
          binVersion: null,
          agentArgv: ['/bin/zsh', '-l'],
          exitCodeFidelity: 'exact'
        } as ManifestSessionRecord['specstory']
      })
    );
    const out = await restartSession(f.host, SESSION_ID);
    expect(f.created[0]?.capture).toBe(true);
    expect(out.capture).toBe(true);
  });

  it('no capture key at all when the original was not captured', async () => {
    const f = fake(record());
    await restartSession(f.host, SESSION_ID);
    // Absent, not false. That is the shape every uncaptured create sends, and
    // main reads exactly `=== true`.
    expect(f.created[0] && 'capture' in f.created[0]).toBe(false);
  });
});

describe('when the flags cannot be recovered', () => {
  it('the restart still happens and the log says the flags were lost', async () => {
    const f = fake(
      record({ agent: 'claude', argv: ['/usr/local/bin/claude', '--model'], agentSessionId: 'x' })
    );
    const out = await restartSession(f.host, SESSION_ID);
    expect(out.extrasRecovered).toBe(false);
    expect(f.calls).toEqual(['create', 'discard', 'broadcast']);
    expect(warned.join('\n')).toContain('without its launch flags');
  });
});

/**
 * PHASE 84. A row whose session runs on another machine.
 *
 * The defect this covers lost work rather than annoying somebody. A restart of
 * such a row created the replacement on this Mac, because the composed input
 * carries no machine, and then hard deleted the original row. The agent kept
 * running on the other machine with nothing pointing at it.
 *
 * What is proven here is that NOTHING HAPPENED. Zero creates, zero kills, zero
 * discards, zero broadcasts, and a rejection carrying the sentence a person
 * reads. An order is proven by recording the calls, and so is an absence.
 */
describe('a session that runs on another machine', () => {
  it('is refused, and nothing at all is created or removed', async () => {
    const f = fake(record({ machineId: 'studio', status: 'running' }));
    await expect(restartSession(f.host, SESSION_ID)).rejects.toThrow(
      RESTART_ON_MACHINE
    );
    expect(f.calls).toEqual([]);
    expect(f.created).toEqual([]);
  });

  it('is refused whatever the row says it is doing', async () => {
    for (const status of ['running', 'idle', 'exited', 'restorable'] as const) {
      const f = fake(record({ machineId: 'studio', status }));
      await expect(restartSession(f.host, SESSION_ID)).rejects.toThrow(
        RESTART_ON_MACHINE
      );
      expect(f.calls).toEqual([]);
    }
  });

  it('says why, and names neither a machine nor any transport word', async () => {
    const f = fake(record({ machineId: 'studio' }));
    let message = '';
    try {
      await restartSession(f.host, SESSION_ID);
    } catch (err) {
      message = (err as Error).message;
    }
    expect(message).toContain('runs on another machine');
    expect(message).toContain('Nothing was changed.');
    for (const word of ['pane', 'window', 'prefix', 'socket', 'ssh', 'tmux']) {
      expect(message.toLowerCase()).not.toContain(word);
    }
  });

  it('restarts a row that names this Mac exactly as it always did', async () => {
    const f = fake(record({ machineId: 'local' }));
    await restartSession(f.host, SESSION_ID);
    expect(f.calls).toEqual(['create', 'discard', 'broadcast']);
  });

  it('restarts a row written before machines existed, which names none', async () => {
    const f = fake(record());
    expect(f.host.manifest.getSession(SESSION_ID)?.machineId).toBeUndefined();
    await restartSession(f.host, SESSION_ID);
    expect(f.calls).toEqual(['create', 'discard', 'broadcast']);
  });
});

// ---------------------------------------------------------------------------
// PHASE 119. A restart can decline capture, and the answer outranks the old
// row. Nothing is flipped on that row, because step 4 discards it: the
// replacement is bare from birth and there is no setting left to change.
// ---------------------------------------------------------------------------

/** A row whose capture record says the original saved its history. */
function captured(): ManifestSessionRecord {
  return record({
    specstory: {
      enabled: true,
      provider: 'shell',
      bin: '/opt/specstory',
      binVersion: null,
      agentArgv: ['/bin/zsh', '-l', '-c', 'htop'],
      exitCodeFidelity: 'exact'
    } as ManifestSessionRecord['specstory'],
    argv: ['/bin/zsh', '-l', '-c', 'htop']
  });
}

describe('a restart under the chosen login (Phase 211, fix round)', () => {
  it('names no login, so the create resolves the chosen one and the row carries it', async () => {
    const f = fake(record({ login: 'work' }));
    await restartSession(f.host, SESSION_ID, { underChosenLogin: true });
    expect(f.created[0]).not.toHaveProperty('login');
    expect(f.calls).toEqual(['create', 'discard', 'broadcast']);
  });

  it('keeps the original login when the option is absent, as Phase 202 built it', async () => {
    const f = fake(record({ login: 'work' }));
    await restartSession(f.host, SESSION_ID);
    expect(f.created[0]?.login).toBe('work');
  });

  it('names no login for a row that ran under the default, either way', async () => {
    const f = fake(record({}));
    await restartSession(f.host, SESSION_ID, { underChosenLogin: true });
    expect(f.created[0]).not.toHaveProperty('login');
  });
});

describe('a restart that declines capture', () => {
  it('sends no capture key at all, whatever the old row said', async () => {
    const f = captured();
    const h = fake(f);
    const out = await restartSession(h.host, SESSION_ID, {
      withoutCapture: true
    });
    // Absent, not false. `capture: false` is a shape the create path has never
    // been sent, and main reads exactly `=== true`.
    expect(h.created[0] && 'capture' in h.created[0]).toBe(false);
    expect(out.capture).toBe(false);
  });

  it('keeps the four step order and the launch flags', async () => {
    const h = fake(captured());
    const out = await restartSession(h.host, SESSION_ID, {
      withoutCapture: true
    });
    expect(h.calls).toEqual(['create', 'discard', 'broadcast']);
    expect(out.extrasRecovered).toBe(true);
    expect(h.created[0]?.extraArgs).toEqual(['-c', 'htop']);
  });

  it('says in the log that the person asked for it', async () => {
    const h = fake(captured());
    await restartSession(h.host, SESSION_ID, { withoutCapture: true });
    const line = warned.join('\n');
    expect(line).toContain('came back without SpecStory');
    expect(line).toContain('does not save its history');
  });

  it('says nothing when the old row was not captured anyway', async () => {
    const h = fake(record());
    const out = await restartSession(h.host, SESSION_ID, {
      withoutCapture: true
    });
    expect(out.capture).toBe(false);
    expect(warned.join('\n')).not.toContain('came back without SpecStory');
  });

  it('leaves the ordinary restart alone when the option is omitted', async () => {
    const h = fake(captured());
    const out = await restartSession(h.host, SESSION_ID);
    expect(h.created[0]?.capture).toBe(true);
    expect(out.capture).toBe(true);
    expect(warned.join('\n')).not.toContain('came back without SpecStory');
  });

  it('refuses a row on another machine before it reads the option', async () => {
    const h = fake(record({ machineId: 'mac-mini' }));
    await expect(
      restartSession(h.host, SESSION_ID, { withoutCapture: true })
    ).rejects.toThrow(RESTART_ON_MACHINE);
    expect(h.calls).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// PHASE 305 (build/p353/SPEC.md §4.2 step 4; the entry's proof 1). A restart
// never deletes a row the person removed.
//
// THE DEFECT, measured at the parent (build/p353/SPEC.md §2.4, M305): `rec` was
// read ONCE, before the create, and both the liveness test and the delete ran
// off it across two awaits. A Remove is accepted on an ended row, so one that
// landed inside the create was written, and the restart then hard deleted the
// row the person had just removed: GONE in 10 of 10 cells.
//
// THE GRID. A row held in a map the fake host's manifest reads, a create and a
// kill that each take a known width on a fake clock, and a hook that mutates
// the row mid-flight: tombstoned (`discarded` with a removal date, which is
// what `markSessionRemoved` writes), deleted outright, or left alone as the
// control. The hook fires 0, 1, 5, 25 and 100 ms into the create, or into the
// kill, measured from the moment the create returns. The hook is UNGATED on
// purpose: it tombstones a running row too, which the real Remove refuses, so
// the guard is attacked where the product's own gates would not reach.
//
// The fake kill does what core.killSession does at this phase's head: it writes
// `exited` at its end unless the row was removed meanwhile (Phase 302's
// re-read), and a kill of a removed row throws as `endRefusal` makes it.
//
// THE EXPECTED TABLE IS DERIVED BY HAND, from build/p353/SPEC.md §4.2 step 2
// and D305-1 to D305-5, before the run, and committed here. Every interval
// falls inside its window (asserted below), so a cell's reading depends on the
// phase, the starting status and the mutation, and the table is keyed by those
// three; each interval is a cell of its own and is read against its key.
//
// Each cell reads: whether a kill was attempted, the row afterwards as
// `status,removed_at` (or GONE), what the outcome says happened to the old row,
// and how many deletes were made.
// ---------------------------------------------------------------------------

type GridStatus = 'exited' | 'restorable' | 'running' | 'unknown';
type GridPhase = 'create' | 'kill';
type GridMutation = 'tombstone' | 'delete' | 'alone';

const GRID_CREATE_MS = 120;
const GRID_KILL_MS = 120;
const GRID_INTERVALS = [0, 1, 5, 25, 100] as const;
const GRID_STATUSES: readonly GridStatus[] = ['exited', 'restorable', 'running', 'unknown'];
const GRID_REMOVED_AT = 1_800_000_000_000;

/** The hand-derived expectation, keyed `phase status mutation`. */
const GRID_EXPECTED: Readonly<Record<string, string>> = {
  // A mutation inside the create: the read after it sees it.
  'create exited alone': 'kill=no row=GONE oldRow=deleted discards=1',
  'create exited tombstone': 'kill=no row=discarded,removed_at oldRow=kept-removed discards=0',
  'create exited delete': 'kill=no row=GONE oldRow=already-gone discards=0',
  'create restorable alone': 'kill=no row=GONE oldRow=deleted discards=1',
  'create restorable tombstone': 'kill=no row=discarded,removed_at oldRow=kept-removed discards=0',
  'create restorable delete': 'kill=no row=GONE oldRow=already-gone discards=0',
  'create running alone': 'kill=yes row=GONE oldRow=deleted discards=1',
  'create running tombstone': 'kill=no row=discarded,removed_at oldRow=kept-removed discards=0',
  'create running delete': 'kill=no row=GONE oldRow=already-gone discards=0',
  'create unknown alone': 'kill=yes row=GONE oldRow=deleted discards=1',
  'create unknown tombstone': 'kill=no row=discarded,removed_at oldRow=kept-removed discards=0',
  'create unknown delete': 'kill=no row=GONE oldRow=already-gone discards=0',
  // A mutation after the create returns. An ended row needs no kill, so the
  // restart has finished, and deleted the row, before the hook fires: the
  // mutation lands on nothing, exactly as an ordinary restart today.
  'kill exited alone': 'kill=no row=GONE oldRow=deleted discards=1',
  'kill exited tombstone': 'kill=no row=GONE oldRow=deleted discards=1',
  'kill exited delete': 'kill=no row=GONE oldRow=deleted discards=1',
  'kill restorable alone': 'kill=no row=GONE oldRow=deleted discards=1',
  'kill restorable tombstone': 'kill=no row=GONE oldRow=deleted discards=1',
  'kill restorable delete': 'kill=no row=GONE oldRow=deleted discards=1',
  // A live row is killed, and the mutation lands inside the kill's await. The
  // delete reads the row again after the kill.
  'kill running alone': 'kill=yes row=GONE oldRow=deleted discards=1',
  'kill running tombstone': 'kill=yes row=discarded,removed_at oldRow=kept-removed discards=0',
  'kill running delete': 'kill=yes row=GONE oldRow=already-gone discards=0',
  'kill unknown alone': 'kill=yes row=GONE oldRow=deleted discards=1',
  'kill unknown tombstone': 'kill=yes row=discarded,removed_at oldRow=kept-removed discards=0',
  'kill unknown delete': 'kill=yes row=GONE oldRow=already-gone discards=0'
};

interface GridWorld {
  host: RestartHost;
  rows: Map<string, ManifestSessionRecord>;
  killAttempted: boolean;
  discards: number;
}

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

function gridWorld(
  start: ManifestSessionRecord,
  phase: GridPhase,
  mutation: GridMutation,
  at: number,
  killThrows = false
): GridWorld {
  const rows = new Map<string, ManifestSessionRecord>([[start.id, start]]);
  const mutate = (): void => {
    const row = rows.get(start.id);
    // A row already gone takes no removal, as `markSessionRemoved` throws on it.
    if (row === undefined) return;
    if (mutation === 'tombstone') {
      rows.set(start.id, { ...row, status: 'discarded', removedAt: GRID_REMOVED_AT });
    } else if (mutation === 'delete') {
      rows.delete(start.id);
    }
  };
  const w: GridWorld = {
    rows,
    killAttempted: false,
    discards: 0,
    host: {
      // A fresh object per read, as the real store's `rowToRecord` is.
      manifest: {
        getSession: (id) => {
          const row = rows.get(id);
          return row === undefined ? undefined : { ...row };
        }
      },
      createSession: async (input) => {
        if (phase === 'create') setTimeout(mutate, at);
        await wait(GRID_CREATE_MS);
        if (phase === 'kill') setTimeout(mutate, at);
        return {
          id: 'new-session',
          name: input.name,
          tmuxName: `${input.name}-2`,
          projectPath: input.projectPath,
          cwd: input.cwd ?? input.projectPath,
          agent: input.agent,
          status: 'running',
          createdAt: 1
        };
      },
      killSession: async (id) => {
        w.killAttempted = true;
        const before = rows.get(id);
        // `endRefusal` at the top of core.killSession.
        if (before?.status === 'discarded') {
          throw new Error('This session was removed, so there is nothing to end. Nothing was changed.');
        }
        await wait(GRID_KILL_MS);
        if (killThrows) throw new Error('tmux went away');
        const after = rows.get(id);
        if (after !== undefined && after.status !== 'discarded') {
          rows.set(id, { ...after, status: 'exited' });
        }
      },
      discardSession: (id) => {
        w.discards += 1;
        rows.delete(id);
      },
      broadcastSessions: () => undefined
    }
  };
  return w;
}

function rowReading(w: GridWorld): string {
  const row = w.rows.get(SESSION_ID);
  return row === undefined
    ? 'GONE'
    : `${row.status},${row.removedAt !== undefined ? 'removed_at' : '-'}`;
}

async function runGridCell(w: GridWorld): Promise<string> {
  const pending = restartSession(w.host, SESSION_ID);
  // Long past both windows, so every timer the cell made has fired.
  await vi.advanceTimersByTimeAsync(GRID_CREATE_MS + GRID_KILL_MS + 500);
  const out = await pending;
  // The outcome's two fields agree with each other in every cell; a cell where
  // they do not says so in its reading, so the row is still read beside it.
  const agree = out.keptRemovedRow === (out.oldRow === 'kept-removed');
  return (
    `kill=${w.killAttempted ? 'yes' : 'no'} row=${rowReading(w)} oldRow=${String(out.oldRow)} ` +
    `discards=${String(w.discards)}${agree ? '' : ' OUTCOME-DISAGREES'}`
  );
}

describe('a restart while the row is removed, ended or deleted around it (Phase 305)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('every interval falls inside the window it is aimed at', () => {
    for (const at of GRID_INTERVALS) {
      expect(at).toBeLessThan(GRID_CREATE_MS);
      expect(at).toBeLessThan(GRID_KILL_MS);
    }
    expect(Object.keys(GRID_EXPECTED)).toHaveLength(2 * GRID_STATUSES.length * 3);
  });

  for (const phase of ['create', 'kill'] as const) {
    for (const status of GRID_STATUSES) {
      for (const mutation of ['tombstone', 'delete', 'alone'] as const) {
        for (const at of GRID_INTERVALS) {
          it(`${phase} ${status} ${mutation}@${String(at)}ms`, async () => {
            const w = gridWorld(record({ status }), phase, mutation, at);
            const reading = await runGridCell(w);
            expect(reading).toBe(GRID_EXPECTED[`${phase} ${status} ${mutation}`]);
          });
        }
      }
    }
  }

  it('a removed row keeps the replacement and says so in one log line', async () => {
    // An info line reaches the console through console.log (src/main/log).
    const info = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const w = gridWorld(record({ status: 'exited' }), 'create', 'tombstone', 5);
    const pending = restartSession(w.host, SESSION_ID);
    await vi.advanceTimersByTimeAsync(1000);
    const out = await pending;
    expect(out.session.id).toBe('new-session');
    expect(out.keptRemovedRow).toBe(true);
    const said = info.mock.calls.map((c) => c.join(' ')).filter((l) => l.includes('was removed while it restarted'));
    expect(said).toHaveLength(1);
    expect(said[0]).toContain('the new session exists and the removed one is still in Past Sessions');
  });

  it('a row that was ALREADY removed is never killed and never deleted (the charter’s path)', async () => {
    const w = gridWorld(
      record({ status: 'discarded', removedAt: GRID_REMOVED_AT }),
      'create',
      'alone',
      0
    );
    // The parent read this row as live, killed it into the end refusal,
    // swallowed that and deleted the tombstone.
    expect(await runGridCell(w)).toBe('kill=no row=discarded,removed_at oldRow=kept-removed discards=0');
  });

  // PHASE 353's FIX ROUND (the records lens). A row an earlier build left
  // ended beside its removal date is in the managed list, not in Past: it is
  // replaced as at the parent, and nothing says it is in Past Sessions.
  it.each(['exited', 'restorable'] as const)(
    'a %s row an earlier build left beside its removal date is replaced, as at the parent',
    async (status) => {
      const info = vi.spyOn(console, 'log').mockImplementation(() => undefined);
      // The spy an earlier row made is the same spy: read only this row's lines.
      info.mockClear();
      const w = gridWorld(record({ status, removedAt: GRID_REMOVED_AT }), 'create', 'alone', 0);
      expect(await runGridCell(w)).toBe('kill=no row=GONE oldRow=deleted discards=1');
      expect(info.mock.calls.map((c) => c.join(' ')).filter((l) => l.includes('still in Past Sessions'))).toEqual([]);
    }
  );

  it('a discarded row with no removal date, which this build cannot write, is ended and not live', async () => {
    const w = gridWorld(record({ status: 'discarded' }), 'create', 'alone', 0);
    expect(await runGridCell(w)).toBe('kill=no row=GONE oldRow=deleted discards=1');
  });

  it.each(['running', 'unknown'] as const)(
    'a %s row whose kill fails is kept, with its own status',
    async (status) => {
      const w = gridWorld(record({ status }), 'create', 'alone', 0, true);
      expect(await runGridCell(w)).toBe(`kill=yes row=${status},- oldRow=kept-kill-failed discards=0`);
      expect(warned.join('\n')).toContain('could not stop the old');
    }
  );
});
