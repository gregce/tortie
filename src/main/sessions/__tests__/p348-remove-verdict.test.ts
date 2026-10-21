/**
 * THE PHONE'S REMOVE, implemented once (Phase 348, build/p348/SPEC.md §4.2
 * steps 3 to 6, D6, D10, D47 to D49, §10.3), driven against the SHIPPING
 * src/main/sessions/pocket-writes.ts over a fake core.
 *
 *  - THE PARTITION (§10.3), driven by this test's own table rather than the
 *    code's: over every status, on this Mac and on another machine, main's
 *    gate (`removeRefusal`) and the shared gate under `DOOR_REMOVE_GATE_ENV`
 *    each answered, and EXACTLY the difference the spec names required: both
 *    pass on `exited` and `restorable`, both refuse a local live or unknown
 *    row, main passes and the gate refuses a remote live or unknown row and a
 *    removed row anywhere. A reader that asserts plain equality would pass
 *    while reading nothing, so the difference is asserted cell by cell.
 *  - `removeVerdict` refuses everywhere either gate refuses, in D48's order and
 *    words, and passes exactly where both pass.
 *  - `remove`: the row re-read by id, the verdict, the Mac's own Remove ONCE
 *    and the broadcast, nothing awaited between; a throw told apart by code
 *    alone; a broadcast that throws still answers done; no core is `failed`.
 *  - `removeOffer`: the Mac's own `removeSessionConfirm` words, field by
 *    field, exactly where the verdict passes.
 */

import { describe, expect, it, vi } from 'vitest';

vi.mock('../../log', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../log')>();
  const quiet = (): void => undefined;
  return { ...real, getLog: () => ({ error: quiet, warn: quiet, info: quiet, debug: quiet }) };
});

const { createPocketWrites, removeVerdict } = await import('../pocket-writes');
const { removeRefusal } = await import('../lifecycle-gate');
const { gmuxError } = await import('../../errors');
const { END_UNREACHABLE_TITLE, LIFECYCLE_SESSION_CHANGED, REMOVE_FAILED, SESSION_NOT_FOUND, removeSessionConfirm } = await import(
  '@shared/lifecycle-words'
);
const { DOOR_REMOVE_GATE_ENV, sessionActionGates } = await import('@shared/session-gates');
const { SESSION_STATUSES } = await import('@shared/types');
type Session = import('@shared/types').Session;
type SessionStatus = import('@shared/types').SessionStatus;
type PocketWritesCore = import('../pocket-writes').PocketWritesCore;

const UNUSED = {
  reply: {
    choose: (): never => {
      throw new Error('a Remove must never reach the press');
    },
    say: (): never => {
      throw new Error('a Remove must never reach the message');
    }
  },
  keys: {
    keys: (): never => {
      throw new Error('a Remove must never reach the keys');
    }
  },
  start: {
    start: (): never => {
      throw new Error('a Remove must never reach the start');
    }
  },
  paste: {
    paste: (): never => {
      throw new Error('a Remove must never reach the paste');
    }
  }
};

function row(id: string, status: SessionStatus, machine?: string): Session {
  return {
    id,
    name: `name-${id}`,
    tmuxName: `tmux-${id}`,
    projectPath: '/Users/x/work',
    cwd: '/Users/x/work',
    agent: 'shell',
    status,
    createdAt: 1,
    ...(machine === undefined
      ? {}
      : { machine: { id: machine, label: 'Mac Pro', color: 'blue', answering: true, canRestore: false, restoreReason: null } })
  } as Session;
}

interface RecordRow {
  status: SessionStatus;
  machineId?: string;
}

interface FakeCore extends PocketWritesCore {
  rows: Session[];
  records: Map<string, RecordRow>;
  readonly events: string[];
  removeWith: (id: string) => void;
  broadcastWith: () => void;
}

function fakeCore(rows: Session[], records?: Map<string, RecordRow>): FakeCore {
  const self: FakeCore = {
    rows,
    records: records ?? new Map(rows.map((r) => [r.id, { status: r.status, ...(r.machine ? { machineId: r.machine.id } : {}) }])),
    events: [],
    removeWith: () => undefined,
    broadcastWith: () => undefined,
    listSessions: () => {
      self.events.push('list');
      return self.rows;
    },
    manifest: {
      getSession: (id: string) => {
        self.events.push('record');
        return self.records.get(id);
      }
    },
    killSession: async (): Promise<void> => {
      throw new Error('a Remove never ends anything');
    },
    removeSession: (id: string) => {
      self.events.push(`remove:${id}`);
      self.removeWith(id);
    },
    broadcastSessions: () => {
      self.events.push('broadcast');
      self.broadcastWith();
    }
  };
  return self;
}

const writesOver = (core: FakeCore | null): ReturnType<typeof createPocketWrites> =>
  createPocketWrites({ core: () => core, machineKnown: () => true, ...UNUSED });

// ---------------------------------------------------------------------------

describe('the Remove partition, driven by this test’s own table (§10.3)', () => {
  /** What each gate should say, by this test's reading of the SPEC, not the code. */
  const mainPasses = (status: SessionStatus, remote: boolean): boolean =>
    remote || status === 'exited' || status === 'restorable' || status === 'discarded';
  const gatePasses = (status: SessionStatus): boolean => status === 'exited' || status === 'restorable';

  for (const remote of [false, true]) {
    for (const status of SESSION_STATUSES) {
      it(`${remote ? 'another machine' : 'this Mac'}, ${status}: each gate as the SPEC says, and the verdict refuses wherever either does`, () => {
        const session = row('s', status, remote ? 'm1' : undefined);
        const record: RecordRow = { status, ...(remote ? { machineId: 'm1' } : {}) };
        const main = removeRefusal(record) === null;
        const gate = sessionActionGates(session, status, DOOR_REMOVE_GATE_ENV).canRemove;
        expect(main, 'main').toBe(mainPasses(status, remote));
        expect(gate, 'gate').toBe(gatePasses(status));
        // The exact difference: main passes and the gate refuses on a remote
        // live or unknown row, and on a removed row anywhere; nowhere else.
        const differs = main && !gate;
        const shouldDiffer = status === 'discarded' || (remote && (status === 'running' || status === 'idle' || status === 'needs_input' || status === 'unknown'));
        expect(differs, 'difference').toBe(shouldDiffer);
        expect(!main && gate, 'the gate never passes where main refuses').toBe(false);
        // A discarded record is filtered out of the list, so the verdict is
        // asked with the record alone there; every other status with both.
        const listed = status === 'discarded' ? undefined : session;
        expect(removeVerdict(listed, record).ok, 'verdict').toBe(main && gate);
      });
    }
  }
});

describe('removeVerdict, D48’s order and words', () => {
  it('nothing by that id: gone, the verb’s own words', () => {
    expect(removeVerdict(undefined, undefined)).toEqual({ ok: false, reason: 'gone', sentence: SESSION_NOT_FOUND });
  });

  it('main’s gate first, in main’s own words: unreachable for an unknown record, changed for a live one', () => {
    const live = removeRefusal({ status: 'running' }) as string;
    const unknown = removeRefusal({ status: 'unknown' }) as string;
    expect(removeVerdict(row('s', 'running'), { status: 'running' })).toEqual({ ok: false, reason: 'changed', sentence: live });
    expect(removeVerdict(row('s', 'exited'), { status: 'needs_input' })).toEqual({ ok: false, reason: 'changed', sentence: live });
    expect(removeVerdict(row('s', 'unknown'), { status: 'unknown' })).toEqual({ ok: false, reason: 'unreachable', sentence: unknown });
    // Main's own words reach the phone, not the gate's.
    expect(removeVerdict(undefined, { status: 'idle' })).toEqual({ ok: false, reason: 'changed', sentence: live });
  });

  it('a record no surface lists (removed already): gone, the press rule’s words', () => {
    expect(removeVerdict(undefined, { status: 'discarded' })).toEqual({ ok: false, reason: 'gone', sentence: LIFECYCLE_SESSION_CHANGED });
    expect(removeVerdict(undefined, { status: 'exited' })).toEqual({ ok: false, reason: 'gone', sentence: LIFECYCLE_SESSION_CHANGED });
  });

  it('a remote row Tortie cannot see: unreachable, End’s sentence for it; a remote live row: changed (THE ONLY LOCK)', () => {
    expect(removeVerdict(row('s', 'unknown', 'm1'), { status: 'exited', machineId: 'm1' })).toEqual({
      ok: false,
      reason: 'unreachable',
      sentence: END_UNREACHABLE_TITLE
    });
    for (const status of ['running', 'idle', 'needs_input'] as const) {
      expect(removeVerdict(row('s', status, 'm1'), { status: 'exited', machineId: 'm1' }), status).toEqual({
        ok: false,
        reason: 'changed',
        sentence: LIFECYCLE_SESSION_CHANGED
      });
    }
  });

  it('passes an ended row on this Mac and on another machine, and a remote row an older Tortie left no record for', () => {
    for (const status of ['exited', 'restorable'] as const) {
      expect(removeVerdict(row('s', status), { status })).toEqual({ ok: true });
      expect(removeVerdict(row('s', status, 'm1'), { status: 'running', machineId: 'm1' })).toEqual({ ok: true });
      expect(removeVerdict(row('s', status, 'm1'), undefined)).toEqual({ ok: true });
    }
  });
});

describe('remove, over a fake core (D48)', () => {
  it('reads the row and the record, then the Mac’s own Remove once and the broadcast, and answers done', async () => {
    const core = fakeCore([row('s1', 'exited'), row('s2', 'running')]);
    expect(await writesOver(core).remove({ sessionId: 's1' })).toEqual({ outcome: 'done' });
    expect(core.events).toEqual(['list', 'record', 'remove:s1', 'broadcast']);
  });

  it('removes an ended session on another machine through the same verb (which sends that machine nothing)', async () => {
    const core = fakeCore([row('r1', 'exited', 'm1')]);
    expect(await writesOver(core).remove({ sessionId: 'r1' })).toEqual({ outcome: 'done' });
    expect(core.events.filter((e) => e.startsWith('remove:'))).toEqual(['remove:r1']);
  });

  it('refuses with nothing removed and nothing broadcast wherever the verdict refuses', async () => {
    const cases: [Session[], string, unknown][] = [
      [[row('s1', 'running')], 's1', { outcome: 'refused', reason: 'changed', sentence: removeRefusal({ status: 'running' }) }],
      [[row('r1', 'running', 'm1')], 'r1', { outcome: 'refused', reason: 'changed', sentence: LIFECYCLE_SESSION_CHANGED }],
      [[row('u1', 'unknown')], 'u1', { outcome: 'refused', reason: 'unreachable', sentence: removeRefusal({ status: 'unknown' }) }],
      [[], 'nobody', { outcome: 'refused', reason: 'gone', sentence: SESSION_NOT_FOUND }]
    ];
    for (const [rows, id, want] of cases) {
      const core = fakeCore(rows);
      expect(await writesOver(core).remove({ sessionId: id }), id).toEqual(want);
      expect(core.events.some((e) => e.startsWith('remove:') || e === 'broadcast'), id).toBe(false);
    }
  });

  it('re-reads the row by id at the press: an ended row that runs again is refused', async () => {
    const core = fakeCore([row('s1', 'exited')]);
    const writes = writesOver(core);
    core.rows = [row('s1', 'running')];
    core.records.set('s1', { status: 'running' });
    expect(await writes.remove({ sessionId: 's1' })).toMatchObject({ outcome: 'refused', reason: 'changed' });
    expect(core.events).not.toContain('remove:s1');
  });

  describe('a thrown Remove, told apart BY CODE ONLY', () => {
    const CANARY = 'CANARY-p348 the error text names an argv';

    it('SESSION_NOT_FOUND reads gone with the verb’s words, never its message', async () => {
      const core = fakeCore([row('s1', 'exited')]);
      core.removeWith = () => {
        throw gmuxError('SESSION_NOT_FOUND', CANARY, CANARY);
      };
      const out = await writesOver(core).remove({ sessionId: 's1' });
      expect(out).toEqual({ outcome: 'refused', reason: 'gone', sentence: SESSION_NOT_FOUND });
      expect(JSON.stringify(out)).not.toContain('CANARY');
      expect(core.events).not.toContain('broadcast');
    });

    it('INVALID_INPUT asks main’s gate again: its sentence when it now refuses, else failed', async () => {
      const core = fakeCore([row('s1', 'exited')]);
      core.removeWith = () => {
        // The race: the row turned live after the verdict, and main's own gate refused inside the verb.
        core.records.set('s1', { status: 'running' });
        throw gmuxError('INVALID_INPUT', CANARY, 's1');
      };
      expect(await writesOver(core).remove({ sessionId: 's1' })).toEqual({
        outcome: 'refused',
        reason: 'changed',
        sentence: removeRefusal({ status: 'running' })
      });
      const passing = fakeCore([row('s2', 'exited')]);
      passing.removeWith = () => {
        throw gmuxError('INVALID_INPUT', CANARY, 's2');
      };
      expect(await writesOver(passing).remove({ sessionId: 's2' })).toEqual({ outcome: 'failed', sentence: REMOVE_FAILED });
      const gone = fakeCore([row('s3', 'exited')]);
      gone.removeWith = () => {
        gone.records.delete('s3');
        throw gmuxError('INVALID_INPUT', CANARY, 's3');
      };
      expect(await writesOver(gone).remove({ sessionId: 's3' })).toEqual({ outcome: 'failed', sentence: REMOVE_FAILED });
    });

    it('anything else reads failed with REMOVE_FAILED: a plain Error, another code, a thrown string', async () => {
      for (const thrown of [new Error(CANARY), gmuxError('SHUTTING_DOWN', CANARY), CANARY]) {
        const core = fakeCore([row('s1', 'exited')]);
        core.removeWith = () => {
          throw thrown;
        };
        const out = await writesOver(core).remove({ sessionId: 's1' });
        expect(out).toEqual({ outcome: 'failed', sentence: REMOVE_FAILED });
        expect(JSON.stringify(out)).not.toContain('CANARY');
      }
    });
  });

  it('a broadcast that throws still answers done: the session was removed', async () => {
    const core = fakeCore([row('s1', 'exited')]);
    core.broadcastWith = () => {
      throw new Error('no window');
    };
    expect(await writesOver(core).remove({ sessionId: 's1' })).toEqual({ outcome: 'done' });
  });

  it('answers failed while the core has not booted, and reads nothing', async () => {
    expect(await writesOver(null).remove({ sessionId: 's1' })).toEqual({ outcome: 'failed', sentence: REMOVE_FAILED });
  });

  it('the verdict and the verb sit with nothing awaited between: the Mac’s Remove runs in the same turn as the read', async () => {
    const core = fakeCore([row('s1', 'exited')]);
    let flipped = false;
    queueMicrotask(() => {
      flipped = true;
    });
    let seen: boolean | null = null;
    core.removeWith = () => {
      seen = flipped;
    };
    await writesOver(core).remove({ sessionId: 's1' });
    expect(seen).toBe(false);
  });
});

describe('removeOffer (D49)', () => {
  it('is the Mac’s own words, field by field, exactly where the verdict passes', () => {
    const core = fakeCore([row('s1', 'exited'), row('s2', 'running'), row('r1', 'restorable', 'm1'), row('r2', 'idle', 'm1')]);
    const writes = writesOver(core);
    const ended = core.rows[0] as Session;
    const confirm = removeSessionConfirm(ended);
    expect(writes.removeOffer(ended)).toEqual({ title: confirm.title, body: confirm.body, confirmLabel: confirm.confirmLabel });
    expect(writes.removeOffer(ended)).toEqual({
      title: "Remove 'name-s1'?",
      body: 'It moves to Past Sessions and you can restore it from there.',
      confirmLabel: 'Remove'
    });
    expect(writes.removeOffer(core.rows[1] as Session)).toBeNull();
    expect(writes.removeOffer(core.rows[2] as Session)).not.toBeNull();
    expect(writes.removeOffer(core.rows[3] as Session)).toBeNull();
    // A read: nothing removed, nothing broadcast.
    expect(core.events.some((e) => e.startsWith('remove:') || e === 'broadcast')).toBe(false);
  });

  it('offers nothing while the core has not booted', () => {
    expect(writesOver(null).removeOffer(row('s1', 'exited'))).toBeNull();
  });
});
