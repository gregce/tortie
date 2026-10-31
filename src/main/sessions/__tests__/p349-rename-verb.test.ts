/**
 * THE PHONE'S RENAME, implemented once (Phase 349, build/p349/SPEC.md §4.3
 * step 4, D3, D4, D5, §10.3).
 *
 * `renameVerdict` is driven arm by arm in the SPEC's order, every arm on its
 * reason and its sentence, read from the module that spells it rather than
 * spelled here: no listed row is `gone`; an unknown row is `unreachable`; a row
 * the shared gate's `canRename` refuses is `changed`; a row on another machine
 * that does not run now is `changed` (D3); and a name the one rule refuses is
 * `name`. Then the §10.3 PARTITION over every status on this Mac and on a
 * machine, computed here from the gate and the verdict and held to EXACTLY its
 * one difference, because a reader that asserts plain equality passes while
 * reading nothing.
 *
 * `rename` is driven over a fake core: one `renameSession` with the TRIMMED
 * name on ok, none on any refusal, nothing awaited before it, the stored name
 * answered, and a thrown error told apart BY CODE ONLY, with a canary in its
 * message that must never come back or be logged.
 *
 * Nothing here opens a socket, touches tmux, reads the manifest or Electron.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
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

vi.mock('../../machines/store', () => ({ machineRow: () => null }));

const { createPocketWrites, renameOfferOf, renameTargetVerdict, renameVerdict } = await import('../pocket-writes');
const { gmuxError } = await import('../../errors');
const { LIFECYCLE_SESSION_CHANGED, RENAME_FAILED, RENAME_UNREACHABLE, SESSION_NOT_FOUND } = await import(
  '@shared/lifecycle-words'
);
const { SESSION_NAME_CHARACTER, SESSION_NAME_EMPTY, SESSION_NAME_TOO_LONG } = await import('@shared/session-names');
const { DOOR_GATE_ENV, DOOR_REMOVE_GATE_ENV, DOOR_RENAME_GATE_ENV, sessionActionGates } = await import(
  '@shared/session-gates'
);
const { SESSION_STATUSES } = await import('@shared/types');
type Session = import('@shared/types').Session;
type SessionStatus = import('@shared/types').SessionStatus;
type PocketWritesCore = import('../pocket-writes').PocketWritesCore;

const HERE = dirname(fileURLToPath(import.meta.url));

/** The four verbs a Rename must never reach (Phases 318, 337, 346, 348). */
const NEVER = (what: string) => (): never => {
  throw new Error(`a Rename must never reach the ${what}`);
};
const UNUSED = {
  reply: { choose: NEVER('press'), say: NEVER('message') },
  keys: { keys: NEVER('keys') },
  start: { start: NEVER('start') },
  paste: { paste: NEVER('paste') }
};

function row(id: string, status: SessionStatus, remote = false): Session {
  return {
    id,
    name: `name-${id}`,
    tmuxName: `tmux-${id}`,
    projectPath: '/Users/x/work',
    cwd: '/Users/x/work',
    agent: 'shell',
    status,
    createdAt: 1,
    ...(remote
      ? { machine: { id: 'm1', label: 'Mac Pro', color: 'blue', answering: true, canRestore: false, restoreReason: null } }
      : {})
  } as Session;
}

const LIVE: readonly SessionStatus[] = ['running', 'idle', 'needs_input'];
const GONE = { ok: false, reason: 'gone', sentence: SESSION_NOT_FOUND };
const UNREACHABLE = { ok: false, reason: 'unreachable', sentence: RENAME_UNREACHABLE };
const CHANGED = { ok: false, reason: 'changed', sentence: LIFECYCLE_SESSION_CHANGED };
const OK = { ok: true };

// ---------------------------------------------------------------------------

describe('the two Rename sentences (§5.1)', () => {
  it('say exactly the words §5.1 spells, the unreachable one made the way End\'s is', () => {
    expect(RENAME_FAILED).toBe('Tortie could not rename this session.');
    expect(RENAME_UNREACHABLE).toBe('Tortie cannot see whether this session is running, so it cannot rename it.');
  });
});

describe('renameVerdict, its five arms in the SPEC\'s order (§4.3 step 4)', () => {
  it('1. no listed row is gone, in the verb\'s own words, whatever the name', () => {
    for (const name of ['fine', '', 'b'.repeat(121), `a${String.fromCharCode(7)}b`]) {
      expect(renameVerdict(undefined, name)).toEqual(GONE);
    }
  });

  it('2. a row Tortie cannot see is unreachable, here and on a machine, before the gate and the name', () => {
    for (const remote of [false, true]) {
      expect(renameVerdict(row('u', 'unknown', remote), 'fine')).toEqual(UNREACHABLE);
      expect(renameVerdict(row('u', 'unknown', remote), '')).toEqual(UNREACHABLE);
    }
  });

  it('3. a row the shared gate refuses (a removed one) is changed, before the far arm and the name', () => {
    for (const remote of [false, true]) {
      expect(renameVerdict(row('d', 'discarded', remote), 'fine')).toEqual(CHANGED);
      expect(renameVerdict(row('d', 'discarded', remote), '')).toEqual(CHANGED);
    }
  });

  it('4. a row on another machine that does not run now is changed, before the name (D3)', () => {
    for (const status of ['exited', 'restorable'] as const) {
      expect(renameVerdict(row('f', status, true), 'fine')).toEqual(CHANGED);
      expect(renameVerdict(row('f', status, true), '')).toEqual(CHANGED);
      // The same status on this Mac is renamed: the Mac's own rename does its whole job here.
      expect(renameVerdict(row('h', status, false), 'fine')).toEqual(OK);
    }
    for (const status of LIVE) expect(renameVerdict(row('f', status, true), 'fine'), status).toEqual(OK);
  });

  it('5. a name the one rule refuses is name, in the rule\'s own sentence, on every row that reaches it', () => {
    const reach = [...SESSION_STATUSES.filter((s) => s !== 'unknown' && s !== 'discarded').map((s) => row('h', s)), ...LIVE.map((s) => row('f', s, true))];
    for (const r of reach) {
      expect(renameVerdict(r, ''), r.status).toEqual({ ok: false, reason: 'name', sentence: SESSION_NAME_EMPTY });
      expect(renameVerdict(r, '   '), r.status).toEqual({ ok: false, reason: 'name', sentence: SESSION_NAME_EMPTY });
      expect(renameVerdict(r, 'x'.repeat(121)), r.status).toEqual({ ok: false, reason: 'name', sentence: SESSION_NAME_TOO_LONG });
      expect(renameVerdict(r, `a${String.fromCharCode(0x202e)}b`), r.status).toEqual({ ok: false, reason: 'name', sentence: SESSION_NAME_CHARACTER });
      expect(renameVerdict(r, '  it\'s "x" fix--auth  '), r.status).toEqual(OK);
    }
  });
});

describe('the Rename partition (§10.3), driven here from the gate and the verdict', () => {
  it('both pass, both refuse, and ONLY a far exited or restorable row passes the gate and is refused by the verdict', () => {
    const cells = { bothPass: [] as string[], bothRefuse: [] as string[], gateAlone: [] as string[], verdictAlone: [] as string[] };
    const reasons = new Map<string, string>();
    for (const status of SESSION_STATUSES) {
      for (const remote of [false, true]) {
        const where = `${status} ${remote ? 'far' : 'here'}`;
        const r = row('p', status, remote);
        const gate = sessionActionGates(r, status, DOOR_RENAME_GATE_ENV).canRename;
        const verdict = renameVerdict(r, 'a name the rule passes');
        if (!verdict.ok) reasons.set(where, verdict.reason);
        if (gate && verdict.ok) cells.bothPass.push(where);
        else if (!gate && !verdict.ok) cells.bothRefuse.push(where);
        else if (gate) cells.gateAlone.push(where);
        else cells.verdictAlone.push(where);
      }
    }
    expect([...SESSION_STATUSES].sort()).toEqual(['discarded', 'exited', 'idle', 'needs_input', 'restorable', 'running', 'unknown']);
    expect(cells.bothPass.sort()).toEqual(
      ['running here', 'idle here', 'needs_input here', 'exited here', 'restorable here', 'running far', 'idle far', 'needs_input far'].sort()
    );
    expect(cells.bothRefuse.sort()).toEqual(['unknown here', 'unknown far', 'discarded here', 'discarded far'].sort());
    expect(cells.gateAlone.sort()).toEqual(['exited far', 'restorable far']);
    expect(cells.verdictAlone).toEqual([]);
    expect(reasons.get('unknown here')).toBe('unreachable');
    expect(reasons.get('unknown far')).toBe('unreachable');
    expect(reasons.get('discarded here')).toBe('changed');
    expect(reasons.get('discarded far')).toBe('changed');
    expect(reasons.get('exited far')).toBe('changed');
    expect(reasons.get('restorable far')).toBe('changed');
  });

  it('canRename answers the same over every door environment and one with every field set', () => {
    const every = { canRestore: true, canDiscard: true, shellPathReady: true, handback: { state: 'left' as const, leftAt: 1 } };
    for (const status of SESSION_STATUSES) {
      for (const remote of [false, true]) {
        const r = row('e', status, remote);
        const answers = new Set([DOOR_GATE_ENV, DOOR_REMOVE_GATE_ENV, DOOR_RENAME_GATE_ENV, every].map((env) => sessionActionGates(r, status, env).canRename));
        expect(answers.size, `${status} ${String(remote)}`).toBe(1);
      }
    }
  });

  it('renameTargetVerdict and renameOfferOf track the first four arms, and the name is the fifth\'s alone', () => {
    for (const status of SESSION_STATUSES) {
      for (const remote of [false, true]) {
        const r = row('t', status, remote);
        expect(renameTargetVerdict(r), `${status} ${String(remote)}`).toEqual(renameVerdict(r, 'any name the rule passes'));
        expect(renameOfferOf(r), `${status} ${String(remote)}`).toBe(renameVerdict(r, 'x').ok);
      }
    }
    expect(renameTargetVerdict(undefined)).toEqual(GONE);
    // The target verdict asks no name: a row that passes the four passes it whatever is typed later.
    expect(renameTargetVerdict(row('t', 'running')).ok).toBe(true);
    expect(renameVerdict(row('t', 'running'), '').ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------

interface FakeCore extends PocketWritesCore {
  readonly renames: { sessionId: string; name: string }[];
  rows: Session[];
  renameWith: (input: { sessionId: string; name: string }) => Promise<Session>;
}

function fakeCore(rows: Session[]): FakeCore {
  const self: FakeCore = {
    renames: [],
    rows,
    renameWith: async (input) => ({ ...(self.rows.find((r) => r.id === input.sessionId) as Session), name: input.name }),
    listSessions: () => self.rows,
    manifest: { getSession: () => undefined },
    killSession: async () => {
      throw new Error('a Rename never ends anything');
    },
    removeSession: () => {
      throw new Error('a Rename never removes anything');
    },
    broadcastSessions: () => {
      throw new Error('a Rename broadcasts through the verb, never itself');
    },
    renameSession: (input) => {
      self.renames.push(input);
      return self.renameWith(input);
    }
  };
  return self;
}

const writesOver = (core: PocketWritesCore | null) =>
  createPocketWrites({ core: () => core, machineKnown: () => true, ...UNUSED });

describe('rename, over a fake core', () => {
  it('calls the Mac\'s own rename once, with the TRIMMED name, and answers the name main stored', async () => {
    const core = fakeCore([row('s1', 'running')]);
    const nbsp = String.fromCharCode(0xa0);
    expect(await writesOver(core).rename({ sessionId: 's1', name: `  fix--auth ${nbsp}` })).toEqual({ outcome: 'done', name: 'fix--auth' });
    expect(core.renames).toEqual([{ sessionId: 's1', name: 'fix--auth' }]);
  });

  it('answers the name main answered, never the name it was handed', async () => {
    const core = fakeCore([row('s1', 'idle', true)]);
    core.renameWith = async () => ({ ...row('s1', 'idle', true), name: 'the stored name' });
    expect(await writesOver(core).rename({ sessionId: 's1', name: 'typed' })).toEqual({ outcome: 'done', name: 'the stored name' });
  });

  it('renames an ended session on this Mac, and a running one on a machine', async () => {
    const core = fakeCore([row('ex', 'exited'), row('rs', 'restorable'), row('far', 'needs_input', true)]);
    const writes = writesOver(core);
    for (const id of ['ex', 'rs', 'far']) expect((await writes.rename({ sessionId: id, name: `n-${id}` })).outcome, id).toBe('done');
    expect(core.renames.map((r) => r.sessionId)).toEqual(['ex', 'rs', 'far']);
  });

  it('renames nothing on every refusal, and answers each on its reason and sentence', async () => {
    const core = fakeCore([
      row('un', 'unknown'),
      row('rm', 'discarded'),
      row('fx', 'exited', true),
      row('fr', 'restorable', true),
      row('ok', 'running')
    ]);
    const writes = writesOver(core);
    expect(await writes.rename({ sessionId: 'nobody', name: 'n' })).toEqual({ outcome: 'refused', reason: 'gone', sentence: SESSION_NOT_FOUND });
    expect(await writes.rename({ sessionId: 'un', name: 'n' })).toEqual({ outcome: 'refused', reason: 'unreachable', sentence: RENAME_UNREACHABLE });
    expect(await writes.rename({ sessionId: 'rm', name: 'n' })).toEqual({ outcome: 'refused', reason: 'changed', sentence: LIFECYCLE_SESSION_CHANGED });
    expect(await writes.rename({ sessionId: 'fx', name: 'n' })).toEqual({ outcome: 'refused', reason: 'changed', sentence: LIFECYCLE_SESSION_CHANGED });
    expect(await writes.rename({ sessionId: 'fr', name: 'n' })).toEqual({ outcome: 'refused', reason: 'changed', sentence: LIFECYCLE_SESSION_CHANGED });
    expect(await writes.rename({ sessionId: 'ok', name: ' ' })).toEqual({ outcome: 'refused', reason: 'name', sentence: SESSION_NAME_EMPTY });
    expect(await writes.rename({ sessionId: 'ok', name: 'z'.repeat(121) })).toEqual({ outcome: 'refused', reason: 'name', sentence: SESSION_NAME_TOO_LONG });
    expect(await writes.rename({ sessionId: 'ok', name: `a${String.fromCharCode(0xd800)}` })).toEqual({ outcome: 'refused', reason: 'name', sentence: SESSION_NAME_CHARACTER });
    expect(core.renames).toEqual([]);
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
    core.renameWith = async (input) => {
      seen = flipped;
      return { ...row('s1', 'running'), name: input.name };
    };
    await writesOver(core).rename({ sessionId: 's1', name: 'n' });
    expect(seen).toBe(false);
  });

  it('re-reads the row by id at the press, not at a time before it', async () => {
    const core = fakeCore([row('s1', 'running', true)]);
    const writes = writesOver(core);
    core.rows = [row('s1', 'exited', true)];
    expect(await writes.rename({ sessionId: 's1', name: 'n' })).toMatchObject({ outcome: 'refused', reason: 'changed' });
    expect(core.renames).toEqual([]);
  });

  it('answers failed with RENAME_FAILED while the core has not booted', async () => {
    expect(await writesOver(null).rename({ sessionId: 's1', name: 'n' })).toEqual({ outcome: 'failed', sentence: RENAME_FAILED });
  });

  describe('a thrown Rename, told apart BY CODE ONLY', () => {
    const CANARY = 'CANARY-p349 tmux -L private rename-session -t $9 the-typed-name';

    it('SESSION_NOT_FOUND reads gone in the verb\'s words, never its message', async () => {
      const core = fakeCore([row('s1', 'running')]);
      core.renameWith = async () => {
        throw gmuxError('SESSION_NOT_FOUND', CANARY, CANARY);
      };
      const out = await writesOver(core).rename({ sessionId: 's1', name: 'n' });
      expect(out).toEqual({ outcome: 'refused', reason: 'gone', sentence: SESSION_NOT_FOUND });
      expect(JSON.stringify(out)).not.toContain('CANARY');
    });

    it('INVALID_INPUT (a far row no list reports any more) reads changed', async () => {
      const core = fakeCore([row('s1', 'running', true)]);
      core.renameWith = async () => {
        throw gmuxError('INVALID_INPUT', CANARY, CANARY);
      };
      expect(await writesOver(core).rename({ sessionId: 's1', name: 'n' })).toEqual({ outcome: 'refused', reason: 'changed', sentence: LIFECYCLE_SESSION_CHANGED });
    });

    it('anything else reads failed, a plain Error, another code and a thrown string alike', async () => {
      for (const thrown of [new Error(CANARY), gmuxError('TMUX_UNREACHABLE', CANARY), gmuxError('SHUTTING_DOWN', CANARY), CANARY, { payload: { code: 'SESSION_NOT_FOUND' } }]) {
        const core = fakeCore([row('s1', 'running')]);
        core.renameWith = async () => {
          throw thrown;
        };
        expect(await writesOver(core).rename({ sessionId: 's1', name: 'n' })).toEqual({ outcome: 'failed', sentence: RENAME_FAILED });
      }
    });

    it('never returns or logs an error\'s message, and a core whose read throws answers failed', async () => {
      logged.length = 0;
      const core = fakeCore([row('s1', 'running')]);
      core.renameWith = async () => {
        throw new Error(CANARY);
      };
      const out = await writesOver(core).rename({ sessionId: 's1', name: 'the-typed-name' });
      expect(JSON.stringify(out)).not.toContain('CANARY');
      const broken = fakeCore([]);
      broken.listSessions = () => {
        throw new Error(CANARY);
      };
      expect(await writesOver(broken).rename({ sessionId: 's1', name: 'n' })).toEqual({ outcome: 'failed', sentence: RENAME_FAILED });
      expect(broken.renames).toEqual([]);
      // The rename path logs nothing at all, the typed name least of all.
      expect(logged).toEqual([]);
    });
  });
});

describe('the offer (D14)', () => {
  it('is renameOfferOf over the row, and reads nothing of the core', () => {
    const calls: string[] = [];
    const writes = createPocketWrites({
      core: () => {
        calls.push('core');
        return null;
      },
      machineKnown: () => true,
      ...UNUSED
    });
    for (const status of SESSION_STATUSES) {
      for (const remote of [false, true]) {
        const r = row('o', status, remote);
        expect(writes.renameOffer(r), `${status} ${String(remote)}`).toBe(renameOfferOf(r));
      }
    }
    expect(calls).toEqual([]);
  });
});

describe('what the rename path is, read off the source (RN5 to RN8\'s ground, §4.3 step 4)', () => {
  const source = readFileSync(join(HERE, '..', 'pocket-writes.ts'), 'utf8');
  const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const bodyOf = (start: string): string => {
    const at = code.indexOf(start);
    expect(at, start).toBeGreaterThan(-1);
    const open = code.indexOf('{', code.indexOf(')', at));
    let depth = 0;
    for (let i = open; i < code.length; i += 1) {
      if (code[i] === '{') depth += 1;
      else if (code[i] === '}') {
        depth -= 1;
        if (depth === 0) return code.slice(open, i + 1);
      }
    }
    return '';
  };

  it('renameVerdict reads .canRename of DOOR_RENAME_GATE_ENV and nothing else of the gate, and asks neither of main\'s gates', () => {
    const verdict = bodyOf('export function renameVerdict(');
    expect(verdict.split('sessionActionGates(')).toHaveLength(2);
    expect(verdict).toContain('sessionActionGates(session, session.status, DOOR_RENAME_GATE_ENV).canRename');
    expect(verdict).not.toMatch(/\.can(?:End|Remove|RestoreNow|RestorePastNow)\b|\.offers|\.showsRemove|endRefusal\(|removeRefusal\(|await\b/);
    // The arms in order: the gate, then the far arm, then the rule.
    const gate = verdict.indexOf('.canRename');
    const far = verdict.indexOf('session.machine !== undefined');
    const rule = verdict.indexOf('sessionNameRefusal(');
    expect(verdict.indexOf("'unknown'")).toBeLessThan(gate);
    expect(gate).toBeLessThan(far);
    expect(far).toBeLessThan(rule);
  });

  it('renameTargetVerdict asks no gate itself: it asks the verdict over a name the rule passes', () => {
    const target = bodyOf('export function renameTargetVerdict(');
    expect(target).not.toContain('sessionActionGates(');
    expect(target).toContain("renameVerdict(session, 'a')");
  });

  it('rename calls the Mac\'s rename once, after the verdict, with the trimmed name, and sets, logs and ends nothing', () => {
    const rename = bodyOf('async rename(');
    expect(code.split('.renameSession(')).toHaveLength(2);
    expect(rename.indexOf('renameVerdict(')).toBeLessThan(rename.indexOf('await core.renameSession('));
    expect(rename.split('await ')).toHaveLength(2);
    expect(rename).toContain('name: trimmedSessionName(input.name)');
    expect(rename).not.toMatch(/noteUserInput|setStatus|killSession|removeSession|getLog|\.warn\(|\.info\(|\.message\b|execOn|remoteRename/);
    const thrown = bodyOf('function renameThrownOutcome(');
    expect(thrown).not.toMatch(/\.message\b|String\(err\)|JSON\.stringify/);
  });
});
