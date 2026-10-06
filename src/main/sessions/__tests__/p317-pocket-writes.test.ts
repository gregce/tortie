/**
 * The phone's End, implemented once (Phase 317, build/p317/SPEC.md §5.4,
 * §14 findings 1 and 6), the reply's two writes passed through it (Phase 318,
 * build/p318/SPEC.md §5.1.5), and the Screen's keys passed through it (Phase
 * 337, build/p337/SPEC.md §5.4).
 *
 * `endVerdict` is driven row by row through the SPEC's table, every arm on its
 * reason and its sentence, read from the owner that spells it rather than
 * spelled here. The batch arm is the Mac batch's ONE narrowing: a remote row
 * whose machine Tortie holds no row for is refused for a batch and offered
 * single, and a remote row whose machine is known but NOT ANSWERING is not
 * narrowed at all, because its own status decides (an unanswering machine's
 * rows read `unknown`, which both arms refuse).
 *
 * `end` is driven over a fake core: one `killSession` on ok, none on every
 * refusal, nothing awaited before it, and a thrown error mapped BY CODE ONLY,
 * with a canary in its message that must never come back or be logged.
 *
 * Nothing here opens a socket, touches tmux, reads the manifest or Electron.
 */

import { describe, expect, it, vi } from 'vitest';

const logged: string[] = [];

vi.mock('../../log', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../log')>();
  const capture =
    (level: string) =>
    (msg: string, fields?: Record<string, unknown>): void => {
      logged.push(`${level} ${msg} ${JSON.stringify(fields ?? null)}`);
    };
  return {
    ...real,
    getLog: () => ({ error: capture('error'), warn: capture('warn'), info: capture('info'), debug: capture('debug') })
  };
});

/** The machine rows the production `machineKnown` reads, by id. */
const machineRows = new Map<string, { id: string }>();
const machineRowAsked: string[] = [];

vi.mock('../../machines/store', () => ({
  machineRow: (id: string) => {
    machineRowAsked.push(id);
    return machineRows.get(id) ?? null;
  }
}));

const { createPocketWrites, endOfferOf, endVerdict } = await import('../pocket-writes');
const { endRefusal } = await import('../lifecycle-gate');
const { gmuxError } = await import('../../errors');
const { END_FAILED, END_UNREACHABLE_TITLE, LIFECYCLE_SESSION_CHANGED, SESSION_NOT_FOUND } = await import(
  '@shared/lifecycle-words'
);
const { SESSION_STATUSES } = await import('@shared/types');
type Session = import('@shared/types').Session;
type SessionStatus = import('@shared/types').SessionStatus;
type PocketWritesCore = import('../pocket-writes').PocketWritesCore;

const REMOVED_SENTENCE = endRefusal({ status: 'discarded' }) as string;

/**
 * The reply verbs an End test hands in (Phase 318): they must never be asked,
 * so each throws, and an End that reached one would fail its own test.
 */
const UNUSED_REPLY = {
  choose: (): never => {
    throw new Error('an End must never reach the press');
  },
  say: (): never => {
    throw new Error('an End must never reach the message');
  }
};

/** The keys verb (Phase 337), which an End, a press or a message must never reach. */
const UNUSED_KEYS = {
  keys: (): never => {
    throw new Error('an End must never reach the keys');
  }
};

function row(id: string, status: SessionStatus, machine?: { id: string; answering?: boolean }): Session {
  return {
    id,
    name: `name-${id}`,
    tmuxName: `tmux-${id}`,
    projectPath: '/Users/x/work',
    cwd: '/Users/x/work',
    agent: 'shell',
    status,
    createdAt: 1,
    ...(machine !== undefined
      ? {
          machine: {
            id: machine.id,
            label: 'Mac Pro',
            color: 'blue',
            answering: machine.answering ?? true,
            canRestore: false,
            restoreReason: null
          }
        }
      : {})
  } as Session;
}

const known = (id: string): boolean => id === 'm-known';
const LIVE: SessionStatus[] = ['running', 'idle', 'needs_input'];

// ---------------------------------------------------------------------------

describe('endVerdict, the SPEC’s table row by row', () => {
  it('main’s gate first: a removed record is refused `removed` with its own sentence, whatever the row says', () => {
    for (const status of SESSION_STATUSES) {
      for (const batch of [false, true]) {
        expect(endVerdict(row('s', status), { status: 'discarded' }, batch, known)).toEqual({
          ok: false,
          reason: 'removed',
          sentence: REMOVED_SENTENCE
        });
      }
    }
    expect(endVerdict(undefined, { status: 'discarded' }, false, known)).toMatchObject({ reason: 'removed' });
  });

  it('no listed row and no record: `gone`, the verb’s own words', () => {
    expect(endVerdict(undefined, undefined, false, known)).toEqual({ ok: false, reason: 'gone', sentence: SESSION_NOT_FOUND });
    expect(SESSION_NOT_FOUND).toBe('Session not found.');
  });

  it('no listed row and a record: `gone`, the press rule’s words', () => {
    expect(endVerdict(undefined, { status: 'running' }, true, known)).toEqual({
      ok: false,
      reason: 'gone',
      sentence: LIFECYCLE_SESSION_CHANGED
    });
  });

  it('`unknown`: `unreachable` with END_UNREACHABLE_TITLE, single and batch, local and remote', () => {
    for (const r of [row('s', 'unknown'), row('s', 'unknown', { id: 'm-known' }), row('s', 'unknown', { id: 'm-gone' })]) {
      for (const batch of [false, true]) {
        expect(endVerdict(r, { status: 'running' }, batch, known)).toEqual({
          ok: false,
          reason: 'unreachable',
          sentence: END_UNREACHABLE_TITLE
        });
      }
    }
  });

  it('`exited` and `restorable`: `ended`, which main’s gate alone would have passed', () => {
    for (const status of ['exited', 'restorable'] as const) {
      // The disagreement, asserted as one: main passes this row.
      expect(endRefusal({ status })).toBeNull();
      for (const batch of [false, true]) {
        expect(endVerdict(row('s', status), { status }, batch, known)).toEqual({
          ok: false,
          reason: 'ended',
          sentence: LIFECYCLE_SESSION_CHANGED
        });
      }
    }
  });

  it('a live row on this Mac: ok, single and batch, with or without a record', () => {
    for (const status of LIVE) {
      for (const batch of [false, true]) {
        expect(endVerdict(row('s', status), { status }, batch, known), `${status} ${batch}`).toEqual({ ok: true });
        expect(endVerdict(row('s', status), undefined, batch, known), `${status} ${batch}`).toEqual({ ok: true });
      }
    }
  });

  // §14 finding 1: the Mac batch's case is a machine with no row.
  it('a live remote row on a machine Tortie holds no row for: refused `unreachable` for a batch, ok single', () => {
    for (const status of LIVE) {
      const r = row('s', status, { id: 'm-gone' });
      expect(endVerdict(r, undefined, true, known)).toEqual({ ok: false, reason: 'unreachable', sentence: END_UNREACHABLE_TITLE });
      expect(endVerdict(r, undefined, false, known)).toEqual({ ok: true });
    }
  });

  it('a live remote row on a KNOWN machine that is not answering: no narrowing, its own status decides', () => {
    for (const status of LIVE) {
      const r = row('s', status, { id: 'm-known', answering: false });
      expect(endVerdict(r, undefined, true, known)).toEqual({ ok: true });
      expect(endVerdict(r, undefined, false, known)).toEqual({ ok: true });
    }
    // And when its rows read `unknown`, as an unanswering machine's do, both refuse.
    const quiet = row('s', 'unknown', { id: 'm-known', answering: false });
    expect(endVerdict(quiet, undefined, true, known)).toMatchObject({ reason: 'unreachable' });
    expect(endVerdict(quiet, undefined, false, known)).toMatchObject({ reason: 'unreachable' });
  });

  it('asks the batch’s machine question only for a batch, and only of a remote row', () => {
    const asked: string[] = [];
    const spy = (id: string): boolean => {
      asked.push(id);
      return false;
    };
    endVerdict(row('s', 'running', { id: 'm1' }), undefined, false, spy);
    endVerdict(row('s', 'running'), undefined, true, spy);
    expect(asked).toEqual([]);
    endVerdict(row('s', 'running', { id: 'm1' }), undefined, true, spy);
    expect(asked).toEqual(['m1']);
  });

  it('an ended remote row on an unknown machine reads `ended`, the gate before the narrowing', () => {
    expect(endVerdict(row('s', 'exited', { id: 'm-gone' }), undefined, true, known)).toMatchObject({ reason: 'ended' });
  });
});

describe('endOfferOf', () => {
  it('offers End with batch true on a live local row, and batch false on a row the batch narrows', () => {
    expect(endOfferOf(row('s', 'running'), { status: 'running' }, known)).toEqual({ state: 'offered', batch: true });
    expect(endOfferOf(row('s', 'idle', { id: 'm-known' }), undefined, known)).toEqual({ state: 'offered', batch: true });
    expect(endOfferOf(row('s', 'needs_input', { id: 'm-gone' }), undefined, known)).toEqual({ state: 'offered', batch: false });
  });

  it('draws End off with the Mac’s sentence on an `unknown` row', () => {
    expect(endOfferOf(row('s', 'unknown'), { status: 'running' }, known)).toEqual({
      state: 'unreachable',
      title: END_UNREACHABLE_TITLE
    });
  });

  it('offers nothing on an ended or a removed row', () => {
    expect(endOfferOf(row('s', 'exited'), { status: 'exited' }, known)).toEqual({ state: 'none' });
    expect(endOfferOf(row('s', 'restorable'), { status: 'restorable' }, known)).toEqual({ state: 'none' });
    expect(endOfferOf(row('s', 'running'), { status: 'discarded' }, known)).toEqual({ state: 'none' });
    expect(endOfferOf(row('s', 'discarded'), undefined, known)).toEqual({ state: 'none' });
  });
});

// ---------------------------------------------------------------------------

interface FakeCore extends PocketWritesCore {
  readonly kills: string[];
  rows: Session[];
  records: Map<string, { status: SessionStatus }>;
  killWith: (id: string) => Promise<void>;
}

function fakeCore(rows: Session[]): FakeCore {
  const self: FakeCore = {
    kills: [],
    rows,
    records: new Map(rows.map((r) => [r.id, { status: r.status }])),
    killWith: async () => undefined,
    listSessions: () => self.rows,
    manifest: { getSession: (id: string) => self.records.get(id) },
    killSession: (id: string) => {
      self.kills.push(id);
      return self.killWith(id);
    }
  };
  return self;
}

describe('end, over a fake core', () => {
  it('calls the Mac’s own End once on ok, and answers done', async () => {
    const core = fakeCore([row('s1', 'running')]);
    const writes = createPocketWrites({ core: () => core, machineKnown: known, reply: UNUSED_REPLY, keys: UNUSED_KEYS });
    expect(await writes.end({ sessionId: 's1', batch: false })).toEqual({ outcome: 'done' });
    expect(core.kills).toEqual(['s1']);
  });

  it('kills nothing on every refusal, and answers each on its reason', async () => {
    const core = fakeCore([
      row('ex', 'exited'),
      row('rs', 'restorable'),
      row('un', 'unknown'),
      row('far', 'running', { id: 'm-gone' })
    ]);
    core.records.set('rm', { status: 'discarded' });
    core.records.set('vanished', { status: 'running' });
    const writes = createPocketWrites({ core: () => core, machineKnown: known, reply: UNUSED_REPLY, keys: UNUSED_KEYS });
    expect(await writes.end({ sessionId: 'ex', batch: false })).toEqual({ outcome: 'refused', reason: 'ended', sentence: LIFECYCLE_SESSION_CHANGED });
    expect(await writes.end({ sessionId: 'rs', batch: true })).toEqual({ outcome: 'refused', reason: 'ended', sentence: LIFECYCLE_SESSION_CHANGED });
    expect(await writes.end({ sessionId: 'un', batch: false })).toEqual({ outcome: 'refused', reason: 'unreachable', sentence: END_UNREACHABLE_TITLE });
    expect(await writes.end({ sessionId: 'far', batch: true })).toEqual({ outcome: 'refused', reason: 'unreachable', sentence: END_UNREACHABLE_TITLE });
    expect(await writes.end({ sessionId: 'rm', batch: false })).toEqual({ outcome: 'refused', reason: 'removed', sentence: REMOVED_SENTENCE });
    expect(await writes.end({ sessionId: 'vanished', batch: false })).toEqual({ outcome: 'refused', reason: 'gone', sentence: LIFECYCLE_SESSION_CHANGED });
    expect(await writes.end({ sessionId: 'nobody', batch: false })).toEqual({ outcome: 'refused', reason: 'gone', sentence: SESSION_NOT_FOUND });
    expect(core.kills).toEqual([]);
    // The single End of the narrowed row IS offered, and kills through the verb.
    expect(await writes.end({ sessionId: 'far', batch: false })).toEqual({ outcome: 'done' });
    expect(core.kills).toEqual(['far']);
  });

  it('awaits nothing before the verb: a microtask queued by the read has not run when the verb is called', async () => {
    let flipped = false;
    let seen: boolean | null = null;
    const core = fakeCore([row('s1', 'running')]);
    const rows = core.rows;
    core.listSessions = () => {
      queueMicrotask(() => {
        flipped = true;
      });
      return rows;
    };
    core.killWith = async () => {
      seen = flipped;
    };
    await createPocketWrites({ core: () => core, machineKnown: known, reply: UNUSED_REPLY, keys: UNUSED_KEYS }).end({ sessionId: 's1', batch: false });
    expect(seen).toBe(false);
  });

  it('re-reads the row by id at the press, not at a time before it', async () => {
    const core = fakeCore([row('s1', 'running')]);
    const writes = createPocketWrites({ core: () => core, machineKnown: known, reply: UNUSED_REPLY, keys: UNUSED_KEYS });
    core.rows = [row('s1', 'exited')];
    expect(await writes.end({ sessionId: 's1', batch: false })).toMatchObject({ outcome: 'refused', reason: 'ended' });
    expect(core.kills).toEqual([]);
  });

  it('answers failed with END_FAILED while the core has not booted', async () => {
    const writes = createPocketWrites({ core: () => null, machineKnown: known, reply: UNUSED_REPLY, keys: UNUSED_KEYS });
    expect(await writes.end({ sessionId: 's1', batch: false })).toEqual({ outcome: 'failed', sentence: END_FAILED });
  });

  describe('a thrown End, mapped BY CODE ONLY (§14 finding 6)', () => {
    const CANARY = 'CANARY-p317 tmux -L private kill-session -t =secret-argv';

    it('SESSION_NOT_FOUND reads `gone` with the verb’s words, never its message', async () => {
      const core = fakeCore([row('s1', 'running')]);
      core.killWith = async () => {
        throw gmuxError('SESSION_NOT_FOUND', CANARY, CANARY);
      };
      const out = await createPocketWrites({ core: () => core, machineKnown: known, reply: UNUSED_REPLY, keys: UNUSED_KEYS }).end({ sessionId: 's1', batch: false });
      expect(out).toEqual({ outcome: 'refused', reason: 'gone', sentence: SESSION_NOT_FOUND });
      expect(JSON.stringify(out)).not.toContain('CANARY');
    });

    it('INVALID_INPUT asks main’s gate AGAIN: removed with its sentence when it now refuses', async () => {
      const core = fakeCore([row('s1', 'running')]);
      core.killWith = async () => {
        // The race: another window removed the row between the verdict and the verb.
        core.records.set('s1', { status: 'discarded' });
        throw gmuxError('INVALID_INPUT', CANARY, 's1');
      };
      const out = await createPocketWrites({ core: () => core, machineKnown: known, reply: UNUSED_REPLY, keys: UNUSED_KEYS }).end({ sessionId: 's1', batch: false });
      expect(out).toEqual({ outcome: 'refused', reason: 'removed', sentence: REMOVED_SENTENCE });
    });

    it('INVALID_INPUT with main’s gate still passing reads failed with END_FAILED', async () => {
      const core = fakeCore([row('s1', 'running')]);
      core.killWith = async () => {
        throw gmuxError('INVALID_INPUT', CANARY, 's1');
      };
      const out = await createPocketWrites({ core: () => core, machineKnown: known, reply: UNUSED_REPLY, keys: UNUSED_KEYS }).end({ sessionId: 's1', batch: false });
      expect(out).toEqual({ outcome: 'failed', sentence: END_FAILED });
    });

    it('anything else reads failed with END_FAILED, a plain Error, another code and a thrown string alike', async () => {
      for (const thrown of [new Error(CANARY), gmuxError('TMUX_UNREACHABLE', CANARY), gmuxError('SHUTTING_DOWN', CANARY), CANARY]) {
        const core = fakeCore([row('s1', 'running')]);
        core.killWith = async () => {
          throw thrown;
        };
        const out = await createPocketWrites({ core: () => core, machineKnown: known, reply: UNUSED_REPLY, keys: UNUSED_KEYS }).end({ sessionId: 's1', batch: false });
        expect(out).toEqual({ outcome: 'failed', sentence: END_FAILED });
      }
    });

    it('never returns or logs an error’s message', async () => {
      logged.length = 0;
      const core = fakeCore([row('s1', 'running')]);
      core.killWith = async () => {
        throw new Error(CANARY);
      };
      const out = await createPocketWrites({ core: () => core, machineKnown: known, reply: UNUSED_REPLY, keys: UNUSED_KEYS }).end({ sessionId: 's1', batch: false });
      expect(JSON.stringify(out)).not.toContain('CANARY');
      expect(logged.join('\n')).not.toContain('CANARY');
    });

    it('a core whose read throws answers failed rather than throwing', async () => {
      const core = fakeCore([]);
      core.listSessions = () => {
        throw new Error(CANARY);
      };
      const out = await createPocketWrites({ core: () => core, machineKnown: known, reply: UNUSED_REPLY, keys: UNUSED_KEYS }).end({ sessionId: 's1', batch: false });
      expect(out).toEqual({ outcome: 'failed', sentence: END_FAILED });
      expect(core.kills).toEqual([]);
    });
  });
});

describe('the production machine question', () => {
  it('is the store’s own machineRow: a machine with no row is refused for a batch, a machine with one is not', async () => {
    machineRows.clear();
    machineRowAsked.length = 0;
    machineRows.set('m1', { id: 'm1' });
    const core = fakeCore([row('a', 'running', { id: 'm1' }), row('b', 'running', { id: 'm2' })]);
    const writes = createPocketWrites({ core: () => core, reply: UNUSED_REPLY, keys: UNUSED_KEYS });
    expect(await writes.end({ sessionId: 'a', batch: true })).toEqual({ outcome: 'done' });
    expect(await writes.end({ sessionId: 'b', batch: true })).toMatchObject({ outcome: 'refused', reason: 'unreachable' });
    expect(machineRowAsked).toEqual(['m1', 'm2']);
    expect(core.kills).toEqual(['a']);
    expect(writes.endOffer(core.rows[1] as Session)).toEqual({ state: 'offered', batch: false });
  });

  it('reads the record from the core for the offer, so a removed row offers nothing', () => {
    const core = fakeCore([row('a', 'running')]);
    core.records.set('a', { status: 'discarded' });
    expect(createPocketWrites({ core: () => core, machineKnown: known, reply: UNUSED_REPLY, keys: UNUSED_KEYS }).endOffer(core.rows[0] as Session)).toEqual({ state: 'none' });
    expect(createPocketWrites({ core: () => null, machineKnown: known, reply: UNUSED_REPLY, keys: UNUSED_KEYS }).endOffer(row('a', 'running'))).toEqual({
      state: 'offered',
      batch: true
    });
  });
});

describe('the press and the message, passed through (Phase 318, build/p318/SPEC.md §5.1.5)', () => {
  type ReplyOutcome = import('../../pocket/routes').PocketReplyOutcome;
  type Still = import('../../pocket/routes').PocketStillAllowed;

  it('hands choose and say to the reply verbs exactly as asked, with the very `still` the door built, and answers what they answered', async () => {
    const asked: unknown[] = [];
    const still: Still = () => true;
    const chooseAnswer: ReplyOutcome = { outcome: 'refused', reason: 'changed', sentence: LIFECYCLE_SESSION_CHANGED };
    const sayAnswer: ReplyOutcome = { outcome: 'done' };
    const core = fakeCore([row('s1', 'needs_input'), row('s2', 'idle')]);
    const writes = createPocketWrites({
      core: () => core,
      machineKnown: known,
      reply: {
        choose: async (input, handed) => {
          asked.push(['choose', input, handed]);
          return chooseAnswer;
        },
        say: async (input, handed) => {
          asked.push(['say', input, handed]);
          return sayAnswer;
        }
      },
      keys: UNUSED_KEYS
    });
    const chooseInput = { sessionId: 's1', question: '0123456789abcdef-4', mark: 'a1b2c3d4e5f6', marker: '2' };
    const sayInput = { sessionId: 's2', text: '/exit' };
    expect(await writes.choose(chooseInput, still)).toBe(chooseAnswer);
    expect(await writes.say(sayInput, still)).toBe(sayAnswer);
    expect(asked).toEqual([
      ['choose', chooseInput, still],
      ['say', sayInput, still]
    ]);
    // The same objects, never copies or rewrites: the press and the words reach the verb as sent.
    expect((asked[0] as unknown[])[1]).toBe(chooseInput);
    expect((asked[1] as unknown[])[1]).toBe(sayInput);
    // Nothing of the End's: no row read, no record read, no kill.
    expect(core.kills).toEqual([]);
  });

  it('reads nothing of the core for a press or a message, even while the core has not booted', async () => {
    const calls: string[] = [];
    const writes = createPocketWrites({
      core: () => {
        calls.push('core');
        return null;
      },
      machineKnown: known,
      reply: {
        choose: async () => ({ outcome: 'done' }),
        say: async () => ({ outcome: 'done' })
      },
      keys: { keys: async () => ({ outcome: 'done' }) }
    });
    expect(await writes.choose({ sessionId: 's', question: '0123456789abcdef-1', mark: 'a1b2c3d4e5f6', marker: '1' }, () => true)).toEqual({ outcome: 'done' });
    expect(await writes.say({ sessionId: 's', text: 'hi' }, () => true)).toEqual({ outcome: 'done' });
    expect(calls).toEqual([]);
  });

  it('leaves end and endOffer as they were: the reply verbs are never asked by either', async () => {
    const core = fakeCore([row('s1', 'running')]);
    const writes = createPocketWrites({ core: () => core, machineKnown: known, reply: UNUSED_REPLY, keys: UNUSED_KEYS });
    expect(writes.endOffer(core.rows[0] as Session)).toEqual({ state: 'offered', batch: true });
    expect(await writes.end({ sessionId: 's1', batch: false })).toEqual({ outcome: 'done' });
    expect(Object.keys(writes).sort()).toEqual(['choose', 'end', 'endOffer', 'keys', 'say']);
  });
});

describe('the keys, passed through (Phase 337, build/p337/SPEC.md §5.4)', () => {
  type ReplyOutcome = import('../../pocket/routes').PocketReplyOutcome;
  type Still = import('../../pocket/routes').PocketStillAllowed;

  it('hands keys to the Screen’s keys verb exactly as asked, with the very `still` the door built, and answers what it answered', async () => {
    const asked: unknown[] = [];
    const still: Still = () => true;
    const answer: ReplyOutcome = { outcome: 'refused', reason: 'unreachable', sentence: 'not now' };
    const core = fakeCore([row('s1', 'running')]);
    const writes = createPocketWrites({
      core: () => core,
      machineKnown: known,
      reply: UNUSED_REPLY,
      keys: {
        keys: async (input, handed) => {
          asked.push([input, handed]);
          return answer;
        }
      }
    });
    const input = { sessionId: 's1', keys: [{ k: 'C-c' as const }], turn: '0123456789abcdef-3', dialog: null };
    expect(await writes.keys(input, still)).toBe(answer);
    expect(asked).toEqual([[input, still]]);
    // The same object, never a copy: the keys reach the verb as sent.
    expect((asked[0] as unknown[])[0]).toBe(input);
    // Nothing of the End's or the reply's.
    expect(core.kills).toEqual([]);
  });

  it('reads nothing of the core for keys, even while the core has not booted', async () => {
    const calls: string[] = [];
    const writes = createPocketWrites({
      core: () => {
        calls.push('core');
        return null;
      },
      machineKnown: known,
      reply: UNUSED_REPLY,
      keys: { keys: async () => ({ outcome: 'done' }) }
    });
    expect(await writes.keys({ sessionId: 's', keys: [{ t: 'a' }], turn: '0123456789abcdef-1', dialog: null }, () => true)).toEqual({
      outcome: 'done'
    });
    expect(calls).toEqual([]);
  });
});
