/**
 * Phase 293 — the host: the policy's menu, another surface's presentation.
 *
 * `sessionMenuItems` gained an optional host so the session manager can answer
 * a verb inside itself (an End confirmation under the row, a Restore that
 * keeps the sheet open) without owning a second list of verbs. The rule that
 * makes that safe is THE PARITY RULE: with a host and without one, a menu is
 * equal in everything but `run`. The same rows, in the same order, under the
 * same label, glyph, hint and sublabel, enabled or not, destructive or not.
 *
 * What this file holds, over every status, on this Mac and on two kinds of
 * machine, with and without restore material, a capture and a handback, under
 * all four environments:
 *
 *  - THE PARITY RULE, field by field over 672 menus. A row the host does not
 *    take (a copy row, a disabled row) runs what it ran with no host, and hands
 *    the host nothing.
 *  - EVERY HOSTED ROW HANDS THE HOST A SESSION ID and nothing else, and none
 *    of them reaches a store verb. A native menu runs the closure it was built
 *    with, which can be seconds old, so a host handed a `Session` would act on
 *    that stale object; handed an id it has to read the row again.
 *  - A ROW THAT GOES SOMEWHERE FIRST READS THE ROW AGAIN when it finally runs:
 *    `Show what it loaded…` opens the Context view for the row as it is after
 *    the jump, not as it was when the menu was drawn.
 *  - A REMOVED ROW offers nothing that acts. At the parent it was offered
 *    `Rename` and `End session…` (p293-menu-characterisation.test.ts keeps the
 *    record of what the parent drew).
 */

import { describe, expect, it, vi } from 'vitest';
import type { Session, SessionMachine, SessionStatus } from '@shared/types';

vi.stubGlobal('window', {
  addEventListener() {},
  removeEventListener() {},
  setTimeout,
  clearTimeout,
  gmux: {
    sessions: {
      restore: () => Promise.resolve({}),
      discard: () => Promise.resolve()
    },
    machines: { reviewFiles: () => Promise.resolve({}) },
    setSessionsPosition: () => Promise.resolve()
  }
});
vi.stubGlobal('localStorage', {
  getItem: () => null,
  setItem() {},
  removeItem() {}
});
vi.stubGlobal('document', {
  body: { classList: { add() {}, remove() {}, contains: () => false } },
  documentElement: { style: { setProperty() {} } },
  querySelector: () => null,
  addEventListener() {},
  removeEventListener() {}
});
vi.stubGlobal('requestAnimationFrame', (fn: FrameRequestCallback) => {
  void fn;
  return 0;
});

/** Everything a `run` reached, in order. */
const calls: string[] = [];

vi.stubGlobal('navigator', {
  userAgent: globalThis.navigator?.userAgent ?? 'node',
  platform: 'MacIntel',
  clipboard: {
    writeText: (text: string) => {
      calls.push(`clipboard(${text})`);
      return Promise.resolve();
    }
  }
});

vi.mock('../../icons/codicon-menu-icon', async (original) => {
  const real = await original<typeof import('../../icons/codicon-menu-icon')>();
  return {
    ...real,
    menuGlyph: (name: string) => ({
      icon: { dataUrl: `glyph:${name}`, template: true }
    })
  };
});
vi.mock('../../context/open-session', () => ({
  openSessionContext: (session: Session) => {
    calls.push(`openSessionContext(${session.id},${session.name})`);
  }
}));
vi.mock('../../overview/open-overview', () => ({
  openOverviewForSession: (id: string, projectPath: string) => {
    calls.push(`openOverviewForSession(${id},${projectPath})`);
    return Promise.resolve();
  }
}));

const { useApp } = await import('../../state/store');
const { sessionMenuItems, closeSession } = await import('../session-actions');
type Host = import('../session-actions').SessionActionHost;
type Item = ReturnType<typeof sessionMenuItems>[number];

const STATUSES: readonly SessionStatus[] = [
  'running',
  'needs_input',
  'idle',
  'exited',
  'restorable',
  'unknown',
  'discarded'
];
const WHERES = ['local', 'remote', 'remote-refused'] as const;
const ENVS = [
  { canDiscard: true, shellPathReady: true },
  { canDiscard: true, shellPathReady: false },
  { canDiscard: false, shellPathReady: true },
  { canDiscard: false, shellPathReady: false }
] as const;

const STUDIO: SessionMachine = {
  id: 'studio',
  label: 'Studio',
  color: 'green',
  answering: true,
  canRestore: true,
  restoreReason: null
};

function sessionFor(
  status: SessionStatus,
  where: (typeof WHERES)[number],
  material: boolean,
  captured: boolean
): Session {
  return {
    id: 'sess-1',
    name: 'auth',
    tmuxName: 'auth',
    projectPath: '/repo',
    cwd: '/repo',
    agent: 'claude',
    status,
    createdAt: 0,
    ...(material
      ? {
          hasSavedScrollback: true,
          resumeArgv: ['/usr/local/bin/claude', '--resume', 'c0ffee'],
          agentSessionId: 'c0ffee',
          savedOutputAt: 1
        }
      : {}),
    ...(captured
      ? {
          capture: {
            provider: 'claude',
            bin: '/opt/specstory',
            exitCodeApproximate: false
          }
        }
      : {}),
    ...(where === 'remote' ? { machine: STUDIO } : {}),
    ...(where === 'remote-refused'
      ? {
          machine: {
            ...STUDIO,
            answering: false,
            canRestore: false,
            restoreReason: 'Studio did not answer.'
          }
        }
      : {})
  };
}

/** Every store verb a row can reach writes its own call down, so a hosted row that reached one is caught. */
function spyStore(): void {
  const verb =
    (name: string) =>
    (...args: unknown[]): undefined => {
      calls.push(`store.${name}(${args.map((a) => JSON.stringify(a)).join(',')})`);
      return undefined;
    };
  useApp.setState({
    setRenaming: verb('setRenaming'),
    restoreSession: verb('restoreSession') as never,
    restartSession: verb('restartSession') as never,
    resumeInPlace: verb('resumeInPlace') as never,
    openSavedOutput: verb('openSavedOutput'),
    removeSession: verb('removeSession') as never,
    endSession: verb('endSession'),
    setMenu: verb('setMenu'),
    toast: (() => undefined) as never
  });
}

function setEnv(
  env: (typeof ENVS)[number],
  handback: boolean,
  sessions: Session[]
): void {
  useApp.setState({
    shellPathReady: env.shellPathReady,
    canDiscard: () => env.canDiscard,
    canRestore: () => true,
    handbacks: handback ? { 'sess-1': { state: 'left', leftAt: 0 } } : {},
    sessions
  });
}

/**
 * A host that writes down every call and the TYPE of every argument, so a
 * `Session` handed where an id belongs is caught. `goThen` and `leaveThen`
 * keep the closure they were handed, so a test can run it later.
 */
function recordingHost(): { host: Host; log: string[]; later: (() => void)[] } {
  const log: string[] = [];
  const later: (() => void)[] = [];
  const id = (value: unknown): string => {
    expect(typeof value).toBe('string');
    return value as string;
  };
  const host: Host = {
    rename: (sessionId) => log.push(`rename(${id(sessionId)})`),
    restore: (sessionId, options) =>
      log.push(`restore(${id(sessionId)}${options === undefined ? '' : `,${JSON.stringify(options)}`})`),
    restart: (sessionId, options) =>
      log.push(`restart(${id(sessionId)}${options === undefined ? '' : `,${JSON.stringify(options)}`})`),
    end: (sessionId) => log.push(`end(${id(sessionId)})`),
    remove: (sessionId) => log.push(`remove(${id(sessionId)})`),
    savedOutput: (sessionId) => log.push(`savedOutput(${id(sessionId)})`),
    leaveThen: (run) => {
      log.push('leaveThen');
      later.push(run);
    },
    goThen: (sessionId, run, needs) => {
      log.push(`goThen(${id(sessionId)}${needs === undefined ? '' : `,${needs}`})`);
      later.push(run);
    }
  };
  return { host, log, later };
}

/** Everything about a row but its `run`. */
function face(item: Item): unknown {
  if (item === 'sep') return 'sep';
  const { run: _run, ...rest } = item;
  return rest;
}

function labelOf(item: Item): string {
  return item === 'sep' ? '---' : item.label;
}

/** Every combination, with its menu under a host and without one. */
function* combinations(): Generator<{
  key: string;
  session: Session;
  env: (typeof ENVS)[number];
  handback: boolean;
}> {
  for (const status of STATUSES)
    for (const where of WHERES)
      for (const material of [false, true])
        for (const captured of [false, true])
          for (const handback of [false, true])
            for (const env of ENVS)
              yield {
                key: `${status} ${where} material=${String(material)} captured=${String(captured)} handback=${String(handback)} canDiscard=${String(env.canDiscard)} ready=${String(env.shellPathReady)}`,
                session: sessionFor(status, where, material, captured),
                env,
                handback
              };
}

/** What each row's hosted run must hand the host. Rows not named here keep their own run. */
const HOSTED: Record<string, string> = {
  Rename: 'rename(sess-1)',
  Restore: 'restore(sess-1)',
  Restart: 'restart(sess-1)',
  'Restore without saving history': 'restore(sess-1,{"withoutCapture":true})',
  'Restart without saving history': 'restart(sess-1,{"withoutCapture":true})',
  'Resume conversation': 'goThen(sess-1,offersResumeInPlace)',
  'Show what it loaded…': 'goThen(sess-1)',
  'Show saved output…': 'savedOutput(sess-1)',
  'Catch me up…': 'leaveThen',
  'Review changes on Studio': 'goThen(sess-1)',
  Remove: 'remove(sess-1)',
  'End session…': 'end(sess-1)'
};

describe('THE PARITY RULE: with a host and without one, equal in everything but run', () => {
  it('holds for every status, on this Mac and on a machine, in every environment', () => {
    spyStore();
    let menus = 0;
    for (const { key, session, env, handback } of combinations()) {
      setEnv(env, handback, [session]);
      const plain = sessionMenuItems(session, 'target:sess-1');
      const { host } = recordingHost();
      const hosted = sessionMenuItems(session, 'target:sess-1', host);
      expect(hosted.map(face), key).toEqual(plain.map(face));
      menus += 1;
    }
    // 7 statuses x 3 places x 2 x 2 x 2 x 4 environments.
    expect(menus).toBe(672);
  });
});

describe('every hosted row hands the host a session ID, and reaches no store verb', () => {
  it('holds for every enabled row of every menu', () => {
    spyStore();
    const seen = new Set<string>();
    for (const { key, session, env, handback } of combinations()) {
      setEnv(env, handback, [session]);
      const { host, log } = recordingHost();
      for (const item of sessionMenuItems(session, 'target:sess-1', host)) {
        if (item === 'sep' || item.disabled === true) continue;
        const want = HOSTED[item.label];
        log.length = 0;
        calls.length = 0;
        item.run();
        if (want === undefined) {
          // The identity rows and Copy directory path: the clipboard, and
          // nothing a host is asked for.
          expect(log, `${key}: ${item.label}`).toEqual([]);
          expect(calls.every((one) => one.startsWith('clipboard(')), `${key}: ${item.label}`).toBe(true);
          continue;
        }
        seen.add(item.label);
        expect(log, `${key}: ${item.label}`).toEqual([want]);
        expect(calls, `${key}: ${item.label}`).toEqual([]);
      }
    }
    // Every hosted row was actually reached by some combination.
    expect([...seen].sort()).toEqual(Object.keys(HOSTED).sort());
  });

  it('with no host, every row runs exactly what it ran before', () => {
    spyStore();
    const session = sessionFor('exited', 'local', true, true);
    setEnv(ENVS[0], false, [session]);
    const ran = sessionMenuItems(session, 'target:sess-1')
      .filter((item): item is Exclude<Item, 'sep'> => item !== 'sep')
      .filter((item) => item.disabled !== true)
      .map((item) => {
        calls.length = 0;
        item.run();
        return `${item.label} -> ${calls.join(';')}`;
      });
    expect(ran).toContain('Rename -> store.setRenaming("target:sess-1")');
    expect(ran).toContain('Restore -> store.restoreSession("sess-1")');
    expect(ran).toContain('Restart -> store.restartSession("sess-1")');
    expect(ran).toContain('Remove -> store.removeSession("sess-1")');
  });
});

describe('a row that goes somewhere first reads the row again when it runs', () => {
  it('opens the Context view for the row as it is AFTER the jump', () => {
    spyStore();
    const drawn = sessionFor('running', 'local', true, false);
    setEnv(ENVS[0], false, [drawn]);
    const { host, later } = recordingHost();
    const loaded = sessionMenuItems(drawn, 'target:sess-1', host).find(
      (item) => item !== 'sep' && item.label === 'Show what it loaded…'
    );
    expect(loaded).toBeDefined();
    (loaded as Exclude<Item, 'sep'>).run();
    // The row was renamed while the menu stood open.
    useApp.setState({ sessions: [{ ...drawn, name: 'renamed-since' }] });
    calls.length = 0;
    later[0]!();
    expect(calls).toEqual(['openSessionContext(sess-1,renamed-since)']);
  });

  it('opens nothing when the row is gone by the time the jump lands', () => {
    spyStore();
    const drawn = sessionFor('running', 'local', true, false);
    setEnv(ENVS[0], false, [drawn]);
    const { host, later } = recordingHost();
    const loaded = sessionMenuItems(drawn, 'target:sess-1', host).find(
      (item) => item !== 'sep' && item.label === 'Show what it loaded…'
    ) as Exclude<Item, 'sep'>;
    loaded.run();
    useApp.setState({ sessions: [] });
    calls.length = 0;
    later[0]!();
    expect(calls).toEqual([]);
  });
});

describe('a removed row offers nothing that acts', () => {
  it('offers no Rename and no End session…, whatever else is true of it', () => {
    spyStore();
    for (const where of WHERES) {
      for (const material of [false, true]) {
        const session = sessionFor('discarded', where, material, true);
        setEnv(ENVS[0], true, [session]);
        const labels = sessionMenuItems(session, 'target:sess-1').map(labelOf);
        expect(labels, where).not.toContain('Rename');
        expect(labels, where).not.toContain('End session…');
        expect(labels, where).not.toContain('Remove');
        expect(labels, where).not.toContain('Restart');
        expect(labels, where).not.toContain('---');
      }
    }
  });

  it('its × does nothing', () => {
    spyStore();
    const session = sessionFor('discarded', 'local', true, false);
    setEnv(ENVS[0], false, [session]);
    calls.length = 0;
    closeSession(session);
    expect(calls).toEqual([]);
  });
});
