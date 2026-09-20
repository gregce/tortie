/**
 * Phase 293. The ONE gates predicate, `sessionActionGates`.
 *
 * WHY THIS FILE EXISTS. The Restore gate was written three times before this
 * phase, in the session menu, the ended card and the split, and the third copy
 * had already drifted. The session manager would have been a fourth. So the
 * rule was moved to one pure function, the menu policy reads it, and every
 * press in the sheet re-asks it over a fresh row. A predicate read that widely
 * is worth pinning from OUTSIDE its own text, so the oracle below is written
 * from the policy as it shipped at the parent commit
 * (`src/renderer/app/session-actions.tsx`, `sessionMenuItems`) and never from
 * `resume.ts`. When the two disagree, one of them changed what a person is
 * offered, and this file says which field.
 *
 * Three things are held, and each is a way the rewrite could go wrong with
 * every other test still green.
 *
 *  - PRESENCE AND ENABLEMENT ARE TWO FIELDS. The shipped `Remove` row is drawn
 *    whenever the row has ended and is greyed when this build cannot discard.
 *    The shipped `Restore` row is drawn when there is something to restore and
 *    is greyed until the login shell has answered. A predicate that folded each
 *    pair into one field would hide a row the policy draws.
 *  - A ROW TORTIE CANNOT SEE, AND A ROW A PERSON REMOVED, OFFER NOTHING THAT
 *    ACTS. The second is new in this phase: at the parent a `discarded` row was
 *    neither unknown nor ended, so the policy offered Rename and End on it.
 *  - THE PAST TAB'S RESTORE IS ITS OWN FIELD, because a removed row is the one
 *    row whose only verb is coming back.
 */

import { describe, expect, it } from 'vitest';
import { SESSION_STATUSES } from '@shared/types';
import type { Session, SessionMachine, SessionStatus } from '@shared/types';
import {
  hasRestoreMaterial,
  offersBareRecovery,
  sessionActionGates,
  showsResumeVerb
} from '../resume';
import type {
  SessionActionGates,
  SessionGateEnv,
  SessionHandback
} from '../resume';

const STUDIO: SessionMachine = {
  id: 'studio',
  label: 'Studio',
  color: 'orange',
  answering: true,
  canRestore: true,
  restoreReason: null
};

const CAPTURE: NonNullable<Session['capture']> = {
  provider: 'claude',
  bin: '/opt/specstory',
  exitCodeApproximate: false
};

const LEFT: SessionHandback = { state: 'left', leftAt: 1 };

function session(over: Partial<Session> = {}): Session {
  return {
    id: 'sid',
    name: 'auth',
    tmuxName: 'auth',
    projectPath: '/repo',
    cwd: '/repo',
    agent: 'claude',
    status: 'running',
    createdAt: 1,
    ...over
  };
}

function env(over: Partial<SessionGateEnv> = {}): SessionGateEnv {
  return {
    canRestore: true,
    canDiscard: true,
    shellPathReady: true,
    handback: undefined,
    ...over
  };
}

/**
 * The oracle, written from the PARENT's `sessionMenuItems` and `closeSession`
 * and deliberately not from the function under test. Each line names the
 * expression it was read from.
 */
function shippedPolicy(
  s: Session,
  status: SessionStatus,
  e: SessionGateEnv
): SessionActionGates {
  // `if (status === 'unknown') return [ ...reads only ]`
  const unknown = status === 'unknown';
  // Phase 293's one named difference: the `discarded` arm beside it.
  const removed = status === 'discarded';
  // `const ended = status === 'exited' || status === 'restorable';`
  const ended = status === 'exited' || status === 'restorable';
  const live =
    status === 'running' || status === 'idle' || status === 'needs_input';
  const remote = s.machine !== undefined;
  const acts = !unknown && !removed;
  // `s.canRestore() && (machine ? machine.canRestore : restorable || ...)`
  const offersRestore =
    acts &&
    e.canRestore &&
    (s.machine !== undefined
      ? s.machine.canRestore
      : status === 'restorable' ||
        (status === 'exited' && hasRestoreMaterial(s)));
  return {
    unknown,
    removed,
    ended,
    live,
    remote,
    canRename: acts,
    offersRestore,
    // `disabled: !useApp.getState().shellPathReady`
    canRestoreNow: offersRestore && e.shellPathReady,
    canRestorePastNow:
      removed &&
      e.canRestore &&
      e.shellPathReady &&
      s.machineGone === undefined &&
      (s.machine !== undefined ? s.machine.canRestore : true),
    // `...(ended && !remote ? [Restart] : [])`
    offersRestart: ended && !remote,
    offersBare: acts && offersBareRecovery(s),
    offersResumeInPlace: acts && showsResumeVerb(s, e.handback, status),
    // `: [ End session… ]`, the arm a row that has not ended takes
    canEnd: live,
    // `...(ended ? [Remove] : ...)` and `disabled: !s.canDiscard()`
    showsRemove: ended,
    canRemove: ended && e.canDiscard
  };
}

/** Every row shape the policy branches on, crossed below with every status. */
const SHAPES: Array<{ name: string; over: Partial<Session> }> = [
  { name: 'local, nothing saved', over: {} },
  { name: 'local, saved output', over: { hasSavedScrollback: true } },
  {
    name: 'local, an armed conversation',
    over: { agentSessionId: 'u', resumeArgv: ['claude', '-r', 'u'] }
  },
  {
    name: 'local, captured, an armed conversation',
    over: {
      agentSessionId: 'u',
      resumeArgv: ['specstory', 'run', '--', 'claude', '-r', 'u'],
      capture: CAPTURE
    }
  },
  { name: 'remote, restore allowed', over: { machine: STUDIO } },
  {
    name: 'remote, restore refused',
    over: {
      machine: {
        ...STUDIO,
        canRestore: false,
        restoreReason: 'Studio has not answered since this session ended.'
      }
    }
  },
  {
    name: 'machine removed',
    over: {
      machineGone: {
        label: 'Studio',
        lastStatus: 'running',
        lastSeenAt: 0,
        forgottenAt: 1
      }
    }
  }
];

const ENVS: SessionGateEnv[] = [];
for (const canRestore of [true, false]) {
  for (const canDiscard of [true, false]) {
    for (const shellPathReady of [true, false]) {
      for (const handback of [undefined, LEFT]) {
        ENVS.push({ canRestore, canDiscard, shellPathReady, handback });
      }
    }
  }
}

describe('sessionActionGates against the policy as it shipped', () => {
  it('agrees on every field, for every status, row shape and env', () => {
    let rows = 0;
    for (const status of SESSION_STATUSES) {
      for (const shape of SHAPES) {
        for (const e of ENVS) {
          const s = session({ ...shape.over, status });
          expect(
            sessionActionGates(s, status, e),
            `${status} · ${shape.name} · ${JSON.stringify({
              ...e,
              handback: e.handback?.state ?? null
            })}`
          ).toEqual(shippedPolicy(s, status, e));
          rows++;
        }
      }
    }
    // 7 statuses, 7 shapes, 16 envs. A matrix that quietly shrank would pass
    // with less of the policy under it.
    expect(rows).toBe(7 * 7 * 16);
  });

  it('reads the status it is HANDED and never re-decides it from the row', () => {
    // The caller passes `effectiveStatusOf(session)`. Status is main's and one
    // expression reads it, so the predicate does not reach for a second one.
    const stale = session({ status: 'running' });
    expect(sessionActionGates(stale, 'exited', env()).canEnd).toBe(false);
    expect(sessionActionGates(stale, 'exited', env()).showsRemove).toBe(true);
  });
});

describe('presence and enablement are two fields', () => {
  it('draws Remove on an ended row that this build cannot discard', () => {
    for (const status of ['exited', 'restorable'] as const) {
      const g = sessionActionGates(
        session({ status }),
        status,
        env({ canDiscard: false })
      );
      expect(g.showsRemove).toBe(true);
      expect(g.canRemove).toBe(false);
    }
  });

  it('draws Restore before the login shell has answered, and greys it', () => {
    const s = session({ status: 'restorable' });
    const g = sessionActionGates(s, 'restorable', env({ shellPathReady: false }));
    expect(g.offersRestore).toBe(true);
    expect(g.canRestoreNow).toBe(false);
    const ready = sessionActionGates(s, 'restorable', env());
    expect(ready.offersRestore).toBe(true);
    expect(ready.canRestoreNow).toBe(true);
  });

  it('never enables what it does not draw', () => {
    for (const status of SESSION_STATUSES) {
      for (const shape of SHAPES) {
        for (const e of ENVS) {
          const g = sessionActionGates(
            session({ ...shape.over, status }),
            status,
            e
          );
          if (g.canRemove) expect(g.showsRemove).toBe(true);
          if (g.canRestoreNow) expect(g.offersRestore).toBe(true);
        }
      }
    }
  });
});

describe('the material rule, Phase 26.3, still decides Restore', () => {
  it('refuses an exited local row with nothing to bring back', () => {
    const g = sessionActionGates(session({ status: 'exited' }), 'exited', env());
    expect(g.offersRestore).toBe(false);
    expect(g.offersRestart).toBe(true);
    expect(g.canRemove).toBe(true);
  });

  it('offers it for saved output alone, and for an armed command alone', () => {
    expect(
      sessionActionGates(
        session({ status: 'exited', hasSavedScrollback: true }),
        'exited',
        env()
      ).offersRestore
    ).toBe(true);
    expect(
      sessionActionGates(
        session({ status: 'exited', resumeArgv: ['claude', '-r', 'u'] }),
        'exited',
        env()
      ).offersRestore
    ).toBe(true);
  });

  it('reads ONE fact for a row on another machine, and never Restart', () => {
    const yes = sessionActionGates(
      session({ status: 'exited', machine: STUDIO }),
      'exited',
      env()
    );
    expect(yes.remote).toBe(true);
    expect(yes.offersRestore).toBe(true);
    expect(yes.offersRestart).toBe(false);
    const no = sessionActionGates(
      session({
        status: 'exited',
        hasSavedScrollback: true,
        machine: { ...STUDIO, canRestore: false, restoreReason: 'Not yet.' }
      }),
      'exited',
      env()
    );
    // Saved output on THIS Mac is not material for a row over there.
    expect(no.offersRestore).toBe(false);
  });
});

/** The fields that would let a press change something. */
const ACTING: Array<keyof SessionActionGates> = [
  'canRename',
  'offersRestore',
  'canRestoreNow',
  'offersRestart',
  'offersBare',
  'offersResumeInPlace',
  'canEnd',
  'showsRemove',
  'canRemove'
];

describe('a row Tortie cannot see, and a row a person removed', () => {
  it('unknown: every acting field is false, the Past restore included', () => {
    for (const shape of SHAPES) {
      for (const e of ENVS) {
        const g = sessionActionGates(
          session({ ...shape.over, status: 'unknown' }),
          'unknown',
          e
        );
        expect(g.unknown).toBe(true);
        for (const field of ACTING) {
          expect(g[field], `unknown · ${shape.name} · ${field}`).toBe(false);
        }
        expect(g.canRestorePastNow).toBe(false);
      }
    }
  });

  it('discarded: every acting field is false, so no Rename and no End', () => {
    for (const shape of SHAPES) {
      for (const e of ENVS) {
        const g = sessionActionGates(
          session({ ...shape.over, status: 'discarded' }),
          'discarded',
          e
        );
        expect(g.removed).toBe(true);
        expect(g.live).toBe(false);
        for (const field of ACTING) {
          expect(g[field], `discarded · ${shape.name} · ${field}`).toBe(false);
        }
      }
    }
  });

  it('a removed row with a handback record is still offered no Resume', () => {
    // `showsResumeVerb` refuses exited, restorable and unknown by name, and
    // would answer true here. The gate is what closes it.
    const s = session({
      status: 'discarded',
      agentSessionId: 'u',
      resumeArgv: ['claude', '-r', 'u']
    });
    expect(showsResumeVerb(s, LEFT, 'discarded')).toBe(true);
    expect(
      sessionActionGates(s, 'discarded', env({ handback: LEFT }))
        .offersResumeInPlace
    ).toBe(false);
  });
});

describe('the Past tab restore', () => {
  const removed = (over: Partial<Session> = {}): Session =>
    session({ status: 'discarded', removedAt: 1, ...over });

  it('is offered for a removed row on this Mac', () => {
    expect(
      sessionActionGates(removed(), 'discarded', env()).canRestorePastNow
    ).toBe(true);
  });

  it('waits for the login shell, and for a build that can restore', () => {
    expect(
      sessionActionGates(removed(), 'discarded', env({ shellPathReady: false }))
        .canRestorePastNow
    ).toBe(false);
    expect(
      sessionActionGates(removed(), 'discarded', env({ canRestore: false }))
        .canRestorePastNow
    ).toBe(false);
  });

  it('is refused for a row whose machine a person removed', () => {
    const gone = removed({
      machineGone: {
        label: 'Studio',
        lastStatus: 'running',
        lastSeenAt: 0,
        forgottenAt: 1
      }
    });
    expect(
      sessionActionGates(gone, 'discarded', env()).canRestorePastNow
    ).toBe(false);
  });

  it('asks the machine’s own gate for a row on a machine that is still here', () => {
    expect(
      sessionActionGates(removed({ machine: STUDIO }), 'discarded', env())
        .canRestorePastNow
    ).toBe(true);
    expect(
      sessionActionGates(
        removed({
          machine: { ...STUDIO, canRestore: false, restoreReason: 'Not yet.' }
        }),
        'discarded',
        env()
      ).canRestorePastNow
    ).toBe(false);
  });

  it('is never true for a row that was not removed', () => {
    for (const status of SESSION_STATUSES) {
      if (status === 'discarded') continue;
      expect(
        sessionActionGates(session({ status }), status, env()).canRestorePastNow
      ).toBe(false);
    }
  });
});

describe('End is for a live row and for nothing else', () => {
  it('is true for the three live statuses exactly', () => {
    const live: SessionStatus[] = [];
    for (const status of SESSION_STATUSES) {
      const g = sessionActionGates(session({ status }), status, env());
      if (g.canEnd) live.push(status);
      expect(g.canEnd).toBe(g.live);
    }
    expect(live).toEqual(['running', 'idle', 'needs_input']);
  });
});
