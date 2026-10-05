/**
 * Phase 316.7. The session manager's grouping rule, its group order, its label
 * rule and its lifecycle partition MOVED to src/shared/session-list.ts, and
 * `displayPath` and `createdOld` moved beside their kin in src/shared, every
 * one token for token (build/p3167/SPEC.md D6, §6.3), so the phone's door
 * (src/main/pocket/routes.ts) and the sheet call the same functions.
 *
 * WHAT THIS HOLDS. Each moved function answers exactly what its PARENT body
 * answered, over a grid of inputs that reaches every branch. The parent bodies
 * below are copied byte for byte from `git show c1a5fd38:<file>` (the lines
 * each names), with only their names changed so the two can sit side by side,
 * and with one argument made explicit where the move made it one: the parent
 * `collect` called the renderer's `machineLabelOf(session, states)`, and the
 * moved one takes that labeller as its argument. A body that drifted from its
 * parent on any row reads red here with the row named.
 *
 * And the one-definition half: each name is declared once under src/, in the
 * shared file, and the renderer's two old homes re-export the very same
 * function object, so none of their importers moved.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SESSION_STATUSES } from '@shared/types';
import type { Session, SessionMachine, SessionStatus } from '@shared/types';
import { DOOR_GATE_ENV, sessionActionGates, type SessionActionGates } from '@shared/session-gates';
import {
  localTarget,
  targetKey,
  targetOfSession,
  type WorkspaceTarget
} from '@shared/workspace-target';
import {
  collectSessionGroups,
  compareSessionGroups,
  firstNamed,
  lifecycleKeeps,
  sessionGroupIdentity,
  sessionGroupLabel,
  type SessionLifecycleChoice
} from '@shared/session-list';
import { displayPath } from '@shared/display-path';
import { createdOld, formatAge } from '@shared/age';
import { displayPath as formatDisplayPath } from '../../renderer/format';
import { createdOld as copyCreatedOld } from '../../renderer/session-manager/copy';

// ---------------------------------------------------------------------------
// The PARENT bodies, from c1a5fd38, renamed only
// ---------------------------------------------------------------------------

/** c1a5fd38:src/renderer/session-manager/projection.ts:151-156 */
interface ParentIdentity {
  key: string;
  target: WorkspaceTarget | null;
  path: string;
  machineId: string | null;
}

/** c1a5fd38:src/renderer/session-manager/projection.ts:168-187 (`groupIdentity`) */
function parentGroupIdentity(session: Session): ParentIdentity {
  const gone = session.machineGone;
  if (gone !== undefined) {
    return {
      key: `!gone:${gone.label}:${session.projectPath}`,
      target: null,
      path: session.projectPath,
      machineId: null
    };
  }
  // `targetOfSession` answers null only for a null session, so the fallback
  // is for the type and is never taken.
  const resolved = targetOfSession(session) ?? localTarget(session.projectPath);
  return {
    key: targetKey(resolved),
    target: resolved,
    path: resolved.path,
    machineId: session.machine === undefined ? null : resolved.machineId
  };
}

/** c1a5fd38:src/renderer/session-manager/projection.ts:190-192 (`named`) */
function parentNamed(label: string | undefined | null): string | null {
  return typeof label === 'string' && label.length > 0 ? label : null;
}

/** c1a5fd38:src/renderer/session-manager/projection.ts:309-315 (`GroupDraft`) */
interface ParentGroupDraft {
  identity: ParentIdentity;
  members: { session: Session; at: number }[];
  closedName: string | null;
  machineLabel: string | null;
}

/**
 * c1a5fd38:src/renderer/session-manager/projection.ts:321-343 (`collect`). Its
 * one call to the renderer's `machineLabelOf(session, states)` is handed in as
 * `machineLabelOf`, the argument the move made explicit.
 */
function parentCollect(
  list: readonly Session[],
  machineLabelOf: (session: Session) => string | null
): ParentGroupDraft[] {
  const byKey = new Map<string, ParentGroupDraft>();
  list.forEach((session, at) => {
    const identity = parentGroupIdentity(session);
    let draft = byKey.get(identity.key);
    if (draft === undefined) {
      draft = {
        identity,
        members: [],
        closedName: null,
        machineLabel: null
      };
      byKey.set(identity.key, draft);
    }
    draft.members.push({ session, at });
    draft.closedName ??= parentNamed(session.closedProject?.name);
    draft.machineLabel ??= machineLabelOf(session);
  });
  return [...byKey.values()];
}

/** c1a5fd38:src/renderer/session-manager/projection.ts:360-373, the comparator of `orderGroups` */
function parentOrderGroups(
  groups: { key: string; label: string }[],
  openAt: Map<string, number>
): void {
  groups.sort((a, b) => {
    const ia = openAt.get(a.key) ?? -1;
    const ib = openAt.get(b.key) ?? -1;
    if (ia !== -1 || ib !== -1) {
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    }
    const byLabel = a.label.localeCompare(b.label);
    if (byLabel !== 0) return byLabel;
    return a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
  });
}

/** c1a5fd38:src/renderer/editor/paths.ts:11-13 (`baseName`), which the label rule called */
function parentBaseName(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1);
}

/**
 * c1a5fd38:src/renderer/session-manager/projection.ts:397-400, the label
 * expression, with `tabOpen ? named(name) : null` handed in as `openName`.
 */
function parentLabel(openName: string | null, closedName: string | null, path: string): string {
  return openName ?? closedName ?? parentBaseName(path);
}

/** c1a5fd38:src/renderer/session-manager/view.ts:116-117, inside `rowPasses` */
function parentLifecyclePasses(
  lifecycle: SessionLifecycleChoice,
  gates: SessionActionGates
): boolean {
  if (lifecycle === 'active' && !(gates.live || gates.unknown)) return false;
  if (lifecycle === 'ended' && !gates.ended) return false;
  return true;
}

/** c1a5fd38:src/renderer/format.ts:54-61 (`displayPath`) */
function parentDisplayPath(path: string, machineId?: string): string {
  if (machineId !== undefined && machineId !== '' && machineId !== 'local') {
    return path;
  }
  const m = /^\/Users\/[^/]+(\/.*)?$/.exec(path);
  if (m) return `~${m[1] ?? ''}`;
  return path;
}

/** c1a5fd38:src/renderer/session-manager/copy.ts:256-258 (`createdOld`) */
function parentCreatedOld(age: string): string {
  return `${age} old`;
}

// ---------------------------------------------------------------------------
// The grid
// ---------------------------------------------------------------------------

function machine(id: string, label: string): SessionMachine {
  return {
    id,
    label,
    color: 'blue',
    answering: true,
    canRestore: false,
    restoreReason: null
  } as SessionMachine;
}

function session(over: Partial<Session> & { id: string }): Session {
  return {
    name: over.id,
    tmuxName: over.id,
    projectPath: '/Users/x/app',
    cwd: '/Users/x/app',
    agent: 'claude',
    status: 'idle',
    createdAt: 1,
    ...over
  } as Session;
}

const GONE = { label: 'old box', lastStatus: 'idle' as SessionStatus, lastSeenAt: 1, forgottenAt: 2 };

/**
 * Every placement a listed or removed session can have: this Mac, a machine, a
 * machine whose id is `local` (folded into this Mac by the one target rule),
 * a removed machine, one path on two machines, a trailing slash, a root, a
 * path with no slash, and closed-tab names that are empty, absent and set on a
 * member that is not the group's first.
 */
const LIST: Session[] = [
  session({ id: 'l1', projectPath: '/Users/x/app' }),
  session({ id: 'l2', projectPath: '/Users/x/app', closedProject: { name: '', path: '/Users/x/app', closedAt: 1 } }),
  session({ id: 'l3', projectPath: '/Users/x/app', closedProject: { name: 'App Tab', path: '/Users/x/app', closedAt: 2 } }),
  session({ id: 'l4', projectPath: '/Users/x/app', closedProject: { name: 'Later Name', path: '/Users/x/app', closedAt: 3 } }),
  session({ id: 'r1', projectPath: '/Users/x/app', machine: machine('devbox', 'Dev Box') }),
  session({ id: 'r2', projectPath: '/Users/x/app', machine: machine('devbox', '') }),
  session({ id: 'k1', projectPath: '/Users/x/app', machine: machine('local', 'Local') }),
  session({ id: 'g1', projectPath: '/Users/x/app', machineGone: GONE }),
  session({ id: 'g2', projectPath: '/Users/x/gone', machineGone: { ...GONE, label: 'other' } }),
  session({ id: 's1', projectPath: '/Users/x/api/' }),
  session({ id: 's2', projectPath: '/' }),
  session({ id: 's3', projectPath: 'relative' }),
  session({ id: 'w1', projectPath: '/srv/app', machine: machine('web-1', 'Web 1') }),
  session({ id: 'w2', projectPath: '/srv/app', machine: machine('web-1', 'Web 1 renamed') })
];

const LABELLERS: ((s: Session) => string | null)[] = [
  () => null,
  (s) => s.machine?.label ?? null,
  (s) => (s.machineGone !== undefined ? s.machineGone.label : s.machine === undefined ? null : `m:${s.machine.id}`)
];

// ---------------------------------------------------------------------------

describe('each moved function answers what its parent answered', () => {
  it('sessionGroupIdentity is groupIdentity, on every placement', () => {
    for (const one of LIST) {
      expect(sessionGroupIdentity(one), one.id).toEqual(parentGroupIdentity(one));
    }
    // A machine whose id is `local` keys as this Mac's folder does (SPEC §15 F9).
    const [here, local] = [LIST[0], LIST[6]].map((s) => sessionGroupIdentity(s as Session));
    expect(here?.key).toBe(local?.key);
    expect(local?.target?.machineId).toBe('local');
  });

  it('firstNamed is named', () => {
    for (const value of [undefined, null, '', ' ', 'a', 'App']) {
      expect(firstNamed(value), String(value)).toBe(parentNamed(value));
    }
  });

  it('collectSessionGroups is collect, the labeller handed in, over every order of the list', () => {
    const orders = [LIST, [...LIST].reverse(), [...LIST.slice(3), ...LIST.slice(0, 3)]];
    for (const list of orders) {
      for (const labelOf of LABELLERS) {
        expect(collectSessionGroups(list, labelOf)).toEqual(parentCollect(list, labelOf));
      }
    }
    // The closed name is the FIRST NON-EMPTY one among the members, not the
    // first member's (SPEC §15 F12): l1 has none, l2 an empty one, l3 names it.
    const app = collectSessionGroups(LIST, () => null).find((d) => d.identity.key === '/Users/x/app');
    expect(app?.closedName).toBe('App Tab');
    expect(app?.members.map((m) => m.session.id)).toEqual(['l1', 'l2', 'l3', 'l4', 'k1']);
  });

  it('compareSessionGroups is the orderGroups comparator, tab map and all', () => {
    const groups = [
      { key: '/b', label: 'beta' },
      { key: '/a', label: 'alpha' },
      { key: 'devbox:/a', label: 'alpha' },
      { key: '/c', label: 'Alpha' },
      { key: '/d', label: 'gamma' },
      { key: '/e', label: '' },
      { key: '!gone:x:/a', label: 'alpha' }
    ];
    const maps: Map<string, number>[] = [
      new Map(),
      new Map([['/d', 0]]),
      new Map([['/d', 1], ['/b', 0]]),
      new Map([['/b', 0], ['/a', 1], ['/e', 2]]),
      new Map([['/nowhere', 0]])
    ];
    for (const openAt of maps) {
      for (const start of [groups, [...groups].reverse()]) {
        const parent = start.map((g) => ({ ...g }));
        parentOrderGroups(parent, openAt);
        const moved = start.map((g) => ({ ...g }));
        moved.sort((a, b) => compareSessionGroups(a, b, openAt));
        expect(moved.map((g) => g.key)).toEqual(parent.map((g) => g.key));
      }
    }
    // The door's argument: an empty map is labels then keys, nothing first.
    const none = [...groups].sort((a, b) => compareSessionGroups(a, b, new Map()));
    expect(none[0]?.label).toBe('');
  });

  it('sessionGroupLabel is the label expression, the tab, then the closed name, then the folder', () => {
    for (const openName of [null, 'Open Tab']) {
      for (const closedName of [null, 'Closed Tab']) {
        for (const path of ['/Users/x/app', '/Users/x/api/', '/', 'relative', '/a/b/c.d']) {
          expect(sessionGroupLabel(openName, closedName, path)).toBe(parentLabel(openName, closedName, path));
        }
      }
    }
  });

  it('lifecycleKeeps is rowPasses’ two lines, over every status, both placements and every choice', () => {
    let readings = 0;
    for (const status of SESSION_STATUSES) {
      for (const where of [undefined, machine('devbox', 'Dev Box')]) {
        const row = session({ id: 'x', status, ...(where === undefined ? {} : { machine: where }) });
        const gates = sessionActionGates(row, status, DOOR_GATE_ENV);
        for (const lifecycle of ['all', 'active', 'ended'] as const) {
          readings += 1;
          expect(lifecycleKeeps(lifecycle, gates), `${status} ${lifecycle}`).toBe(
            parentLifecyclePasses(lifecycle, gates)
          );
        }
      }
    }
    expect(readings).toBe(SESSION_STATUSES.length * 2 * 3);
    // The partition, read off: Active is live or unknown, Ended is ended.
    const keeps = (lifecycle: SessionLifecycleChoice): SessionStatus[] =>
      SESSION_STATUSES.filter((status) =>
        lifecycleKeeps(lifecycle, sessionActionGates(session({ id: 'x', status }), status, DOOR_GATE_ENV))
      );
    expect(keeps('active').sort()).toEqual(['idle', 'needs_input', 'running', 'unknown']);
    expect(keeps('ended').sort()).toEqual(['exited', 'restorable']);
    expect(keeps('all')).toEqual([...SESSION_STATUSES]);
  });

  it('displayPath is the parent’s, on this Mac and on a machine', () => {
    const paths = ['/Users/gdc', '/Users/gdc/', '/Users/gdc/src/app', '/Users/a b/x', '/srv/app', '/Users', '/', 'rel'];
    for (const path of paths) {
      for (const id of [undefined, '', 'local', 'devbox']) {
        expect(displayPath(path, id), `${path} ${String(id)}`).toBe(parentDisplayPath(path, id));
      }
    }
  });

  it('createdOld is the parent’s, and says a creation age with the word', () => {
    for (const age of ['now', '4m', '3d', '2d 1h', '']) {
      expect(createdOld(age)).toBe(parentCreatedOld(age));
    }
    expect(createdOld(formatAge(0, 3 * 86_400_000))).toBe('3d old');
  });
});

// ---------------------------------------------------------------------------

const SRC = resolve(import.meta.dirname, '..', '..');

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    if (name === '__tests__' || name === 'node_modules') continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...sourceFiles(path));
    else if (/\.tsx?$/.test(name) && !/\.d\.ts$/.test(name)) out.push(path);
  }
  return out;
}

const SOURCES = sourceFiles(SRC).map((file) => ({
  rel: relative(SRC, file),
  code: readFileSync(file, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
}));

describe('one definition of each, and the old homes hand out the same function', () => {
  const RULES: [string, RegExp, string][] = [
    ['sessionGroupIdentity', /\bfunction sessionGroupIdentity\s*\(/, 'shared/session-list.ts'],
    ['firstNamed', /\bfunction firstNamed\s*\(/, 'shared/session-list.ts'],
    ['collectSessionGroups', /\bfunction collectSessionGroups\s*\(/, 'shared/session-list.ts'],
    ['compareSessionGroups', /\bfunction compareSessionGroups\s*\(/, 'shared/session-list.ts'],
    ['sessionGroupLabel', /\bfunction sessionGroupLabel\s*\(/, 'shared/session-list.ts'],
    ['lifecycleKeeps', /\bfunction lifecycleKeeps\s*\(/, 'shared/session-list.ts'],
    ['displayPath', /\bfunction displayPath\s*\(/, 'shared/display-path.ts'],
    ['createdOld', /\bfunction createdOld\s*\(/, 'shared/age.ts']
  ];

  it('scans the tree at all', () => {
    expect(SOURCES.length).toBeGreaterThan(500);
  });

  for (const [name, pattern, owner] of RULES) {
    it(`${name} is declared once, in src/${owner}`, () => {
      expect(SOURCES.filter((s) => pattern.test(s.code)).map((s) => s.rel)).toEqual([owner]);
    });
  }

  it('the parent homes are gone: projection.ts declares no groupIdentity, named or collect', () => {
    const projection = SOURCES.find((s) => s.rel === 'renderer/session-manager/projection.ts');
    expect(projection?.code).not.toMatch(/\bfunction (groupIdentity|named|collect)\s*\(/);
    expect(projection?.code).not.toMatch(/from '\.\.\/editor\/paths'/);
  });

  it('format.ts and copy.ts re-export the shared function itself', () => {
    expect(formatDisplayPath).toBe(displayPath);
    expect(copyCreatedOld).toBe(createdOld);
  });

  it('session-list.ts imports values from ./workspace-target and types from ./types and ./session-gates, and nothing else', () => {
    const text = readFileSync(resolve(SRC, 'shared', 'session-list.ts'), 'utf8');
    const specs = [...text.matchAll(/^import\s+(type\s+)?[\s\S]*?from\s+'([^']+)';/gm)].map((m) => [
      m[1] === undefined ? 'value' : 'type',
      m[2]
    ]);
    expect(specs).toEqual([
      ['type', './types'],
      ['type', './session-gates'],
      ['value', './workspace-target']
    ]);
  });
});
