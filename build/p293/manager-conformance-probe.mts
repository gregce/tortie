/**
 * The driven half of `npm run conformance:manager` (Phase 293, the session
 * manager). build/p293/conformance-manager.mjs starts this file under the
 * pinned tsx and reads ONE line of JSON back from it.
 *
 * WHAT IT DRIVES. The SHIPPING modules, never a copy of them:
 *
 *   - `sessionActionGates` (src/renderer/state/resume.ts), the one gates
 *     predicate every surface reads;
 *   - `batchEligibility` and `runBatchEnd` (session-manager/batch-end.ts), the
 *     loop that ends many sessions, over plain injected functions;
 *   - `buildManageProjection` (projection.ts), `visibleGroups`, `visibleIds`,
 *     `selectAllWrite` and `stateFilterKeeps` (view.ts);
 *   - `createdCell`, `messagesCell` and `lastMessageCell` (copy.ts);
 *   - `toActivity` (src/main/overview/activity-map.ts), the truth table;
 *   - and, over the REAL zustand store with the lifecycle verbs replaced by
 *     recorders, the press and the batch in actions.ts: `manageMenuItems`,
 *     `retryInline`, `confirmInline`, `startBatch`, `batchTargetsNow`,
 *     `confirmBatch`, the slice's `beginSessionSheetBatchRun` and
 *     `settleSessionSheetInline`, `selectSheetView`, and the policy's own
 *     `sessionMenuItems` with and without a host.
 *
 * WHY THE STORE IS REAL AND THE VERBS ARE NOT. Every rule of the press lives in
 * the store and in actions.ts, so a gate over a copy of either would agree with
 * a wrong one. The seven verbs that reach main are recorders instead, so a
 * check can say exactly which lifecycle call was made, for which id, in what
 * order, and can hold one call open while the world changes under it. Nothing
 * here reaches a bridge that could end, remove or restart anything: there is
 * no Electron, no main process and no tmux, and the fake `window.gmux` below
 * answers only the questions the store asks at load.
 *
 * WHAT IT READS. Only the checkout it sits in, by relative path, so the
 * ablation harness (build/p293/ablation.mjs) runs it over a CLONE and gets the
 * clone's modules. Nothing under the person's home is read.
 *
 * TWO THINGS A PLAIN NODE CANNOT LOAD. The renderer imports its stylesheets and
 * its agent marks (`*.css`, `*.svg?raw`) through vite. A synchronous resolve
 * hook points every such specifier at ONE stub file this process writes under
 * a mkdtemp in the system temporary directory and removes in a `finally`, and
 * again on exit should a rule's async work end the process first. It stubs
 * assets only, never a module the rules below are about.
 *
 * THE OUTPUT. One line on stdout, `P293_JSON:` then the rules, each with its id,
 * the spec clause that owns it, how many checks it made and what failed. A
 * rule whose body THREW is a failure of that rule, so an ablation that breaks
 * the code into an exception still reddens the rule that owns it.
 */

import { registerHooks } from 'node:module';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import type { OverviewSessionActivity } from '../../src/shared/overview';
import type { Project, Session, SessionMachine, SessionStatus } from '../../src/shared/types';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const src = (rel: string): string => pathToFileURL(join(ROOT, 'src', rel)).href;

// ---------------------------------------------------------------------------
// The asset stub, and the globals the renderer's store asks for at load
// ---------------------------------------------------------------------------

const scratch = mkdtempSync(join(tmpdir(), 'p293-manager-'));
const stubPath = join(scratch, 'asset-stub.cjs');
writeFileSync(stubPath, 'module.exports = { __esModule: true, default: "" };\n', 'utf8');
const STUB = pathToFileURL(stubPath).href;
process.on('exit', () => rmSync(scratch, { recursive: true, force: true }));
const ASSET = /\.(css|svg|png|jpe?g|gif|woff2?|ttf)(\?.*)?$/;
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (ASSET.test(specifier)) return { url: STUB, shortCircuit: true };
    return nextResolve(specifier, context);
  }
});

const define = (name: string, value: unknown): void => {
  Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
};
/**
 * The bridge the store captures when its slices are created. Only presence is
 * read at load (whether this build can restore, remove and so on), and every
 * verb that would reach main is replaced by a recorder before any rule runs.
 * Nothing here answers `shellPathReady`, so the store starts with the login
 * shell answered, which is the state the rules below want.
 */
const bridgeReached: string[] = [];
const bridgeNever =
  (verb: string) =>
  (id?: unknown): Promise<void> => {
    bridgeReached.push(`${verb}:${String(id)}`);
    return Promise.resolve();
  };
define('window', {
  addEventListener() {},
  removeEventListener() {},
  setTimeout,
  clearTimeout,
  gmux: {
    // Two View menu mirrors the chrome slice calls at load; answered so the
    // gate's output carries no noise that is not a finding.
    setSessionsPosition: () => Promise.resolve(),
    setProjectsPosition: () => Promise.resolve(),
    sessions: {
      list: () => Promise.resolve([]),
      listRemoved: () => Promise.resolve([]),
      kill: bridgeNever('kill'),
      discard: bridgeNever('discard'),
      restore: bridgeNever('restore'),
      rename: bridgeNever('rename')
    }
  }
});
define('localStorage', { getItem: () => null, setItem() {}, removeItem() {} });
define('navigator', {
  userAgent: 'node',
  platform: 'MacIntel',
  clipboard: { writeText: () => Promise.resolve() }
});

// ---------------------------------------------------------------------------
// The rule ledger
// ---------------------------------------------------------------------------

interface RuleResult {
  id: string;
  owner: string;
  title: string;
  checks: number;
  failures: string[];
}
const results: RuleResult[] = [];
const J = (v: unknown): string => JSON.stringify(v);

interface Check {
  ok(cond: boolean, what: string): void;
  eq(got: unknown, want: unknown, what: string): void;
}

async function rule(
  id: string,
  owner: string,
  title: string,
  body: (c: Check) => void | Promise<void>
): Promise<void> {
  const r: RuleResult = { id, owner, title, checks: 0, failures: [] };
  results.push(r);
  const c: Check = {
    ok(cond, what) {
      r.checks += 1;
      if (!cond) r.failures.push(what);
    },
    eq(got, want, what) {
      r.checks += 1;
      if (J(got) !== J(want)) r.failures.push(`${what}: got ${J(got).slice(0, 300)}, want ${J(want).slice(0, 300)}`);
    }
  };
  try {
    await body(c);
  } catch (err) {
    r.failures.push(`the rule threw: ${err instanceof Error ? err.message : String(err)}`);
  }
}

// ---------------------------------------------------------------------------
// The world
// ---------------------------------------------------------------------------

/** A fixed clock, so every age drawn below is the same on every run. */
const NOW = Date.UTC(2026, 8, 18, 16, 0, 0);

const STUDIO: SessionMachine = {
  id: 'm1',
  label: 'Studio',
  color: 'green',
  answering: true,
  canRestore: true,
  restoreReason: null
} as SessionMachine;
const ATTIC: SessionMachine = { ...STUDIO, id: 'm2', label: 'Attic' } as SessionMachine;
const MACHINE_M1 = { id: 'm1', label: 'Studio' };
const MACHINE_M2 = { id: 'm2', label: 'Attic' };

function sess(id: string, over: Partial<Session> = {}): Session {
  return {
    id,
    name: `n-${id}`,
    tmuxName: `t-${id}`,
    projectPath: '/w/alpha',
    cwd: '/w/alpha',
    agent: 'shell',
    status: 'running',
    createdAt: NOW - 3_600_000,
    ...over
  } as Session;
}

const STATUSES: SessionStatus[] = [
  'running',
  'idle',
  'needs_input',
  'exited',
  'restorable',
  'unknown',
  'discarded'
];
const LIVE = new Set<SessionStatus>(['running', 'idle', 'needs_input']);
const ENDED = new Set<SessionStatus>(['exited', 'restorable']);

const tick = (): Promise<void> => new Promise((r) => setImmediate(r));
async function settle(n = 8): Promise<void> {
  for (let i = 0; i < n; i += 1) await tick();
}

interface Deferred<T> {
  promise: Promise<T>;
  resolve(v: T): void;
}
function deferred<T>(): Deferred<T> {
  let resolveFn: (v: T) => void = () => undefined;
  const promise = new Promise<T>((r) => {
    resolveFn = r;
  });
  return { promise, resolve: resolveFn };
}

// ---------------------------------------------------------------------------
// The modules, the shipping ones
// ---------------------------------------------------------------------------

type Mod = Record<string, unknown>;
const load = async (rel: string): Promise<Mod> => (await import(src(rel))) as Mod;

/** The gate reads the rules and decides; this process always exits 0 once it has answered. */
const exitCode = 0;
try {
  const resume = await load('renderer/state/resume.ts');
  const batchEnd = await load('renderer/session-manager/batch-end.ts');
  const projectionMod = await load('renderer/session-manager/projection.ts');
  const view = await load('renderer/session-manager/view.ts');
  const copy = await load('renderer/session-manager/copy.ts');
  const activityMap = await load('main/overview/activity-map.ts');
  const storeMod = await load('renderer/state/store.ts');
  const actions = await load('renderer/session-manager/actions.ts');
  const refreshMod = await load('renderer/session-manager/use-sheet-refresh.ts');
  const policy = await load('renderer/app/session-actions.tsx');

  // The modules are loaded by URL at run time, so their types are named here
  // by hand at the width each rule needs, and no wider.
  const sessionActionGates = resume['sessionActionGates'] as (s: Session, st: SessionStatus, env: unknown) => any;
  const batchEligibility = batchEnd['batchEligibility'] as (s: Session, g: unknown, known: (id: string) => boolean) => string;
  const runBatchEnd = batchEnd['runBatchEnd'] as (deps: unknown) => Promise<any>;
  const buildManageProjection = projectionMod['buildManageProjection'] as (input: unknown) => any;
  const visibleGroups = view['visibleGroups'] as (g: unknown, f: unknown, s: unknown) => any[];
  const visibleIds = view['visibleIds'] as (g: unknown) => string[];
  const selectAllWrite = view['selectAllWrite'] as (v: string[], c: Record<string, true>) => { ids: string[]; on: boolean };
  const stateFilterKeeps = view['stateFilterKeeps'] as (f: string, s: SessionStatus) => boolean;
  const createdCell = copy['createdCell'] as (at: number, now: number) => any;
  const messagesCell = copy['messagesCell'] as (a: OverviewSessionActivity | null, agent: string, remote: boolean) => any;
  const lastMessageCell = copy['lastMessageCell'] as (a: OverviewSessionActivity | null, agent: string, now: number) => any;
  const drawnMessageTotal = copy['drawnMessageTotal'] as (a: OverviewSessionActivity | null, agent: string, remote: boolean) => number | null;
  const BATCH_LIST_FAILED = copy['BATCH_LIST_FAILED'] as string;
  const SESSION_CHANGED = copy['SESSION_CHANGED'] as string;
  const toActivity = activityMap['toActivity'] as (facts: unknown, stored: unknown) => OverviewSessionActivity;
  const useApp = storeMod['useApp'] as {
    getState(): any;
    setState(patch: unknown): void;
  };
  const manageMenuItems = actions['manageMenuItems'] as (row: unknown) => any[];
  const retryInline = actions['retryInline'] as () => void;
  const confirmInline = actions['confirmInline'] as () => void;
  const startBatch = actions['startBatch'] as () => void;
  const batchTargetsNow = actions['batchTargetsNow'] as () => string[];
  const confirmBatch = actions['confirmBatch'] as () => Promise<void>;
  const selectSheetView = refreshMod['selectSheetView'] as (s: unknown) => { visibleIds: string[] } | null;
  const sessionMenuItems = policy['sessionMenuItems'] as (s: Session, t: string, host?: unknown) => any[];

  const env = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
    canRestore: true,
    canDiscard: true,
    shellPathReady: true,
    handback: undefined,
    ...over
  });
  const gatesOf = (s: Session, over: Record<string, unknown> = {}): Record<string, boolean> =>
    sessionActionGates(s, s.status, env(over)) as Record<string, boolean>;

  // -------------------------------------------------------------------------
  // The store, with every verb that reaches main replaced by a recorder
  // -------------------------------------------------------------------------

  interface Ledger {
    calls: string[];
    toasts: { kind: string; text: string; sticky: boolean }[];
    confirms: number;
  }
  let ledger: Ledger = { calls: [], toasts: [], confirms: 0 };
  let endAnswer: (id: string) => Promise<{ ok: true } | { ok: false; message: string }> = () =>
    Promise.resolve({ ok: true });

  interface WorldOptions {
    past?: Session[];
    projects?: Project[];
    machineStates?: { id: string; label: string }[];
    canDiscard?: boolean;
    shellPathReady?: boolean;
    open?: boolean;
  }
  function world(sessions: Session[], o: WorldOptions = {}): void {
    ledger = { calls: [], toasts: [], confirms: 0 };
    endAnswer = () => Promise.resolve({ ok: true });
    useApp.setState({
      sessions,
      pastSessions: o.past ?? [],
      projects: o.projects ?? [],
      tabOrder: [],
      machineStates: o.machineStates ?? [],
      handbacks: {},
      restoringIds: {},
      shellPathReady: o.shellPathReady ?? true,
      sessionSheet: null,
      endSessionNow: (id: string) => {
        ledger.calls.push(`end:${id}`);
        return endAnswer(id);
      },
      removeSessionNow: (id: string) => {
        ledger.calls.push(`remove:${id}`);
        return Promise.resolve({ ok: true });
      },
      restartSessionNow: (id: string) => {
        ledger.calls.push(`restart:${id}`);
        return Promise.resolve({ ok: true });
      },
      renameSessionNow: (id: string) => {
        ledger.calls.push(`rename:${id}`);
        return Promise.resolve({ ok: true });
      },
      restoreSessionNow: (id: string) => {
        ledger.calls.push(`restore:${id}`);
        return Promise.resolve({ kind: 'failed', message: 'conformance:manager restores nothing' });
      },
      restorePastSession: (id: string) => {
        ledger.calls.push(`restore-past:${id}`);
        return Promise.resolve({ kind: 'failed', message: 'conformance:manager restores nothing' });
      },
      refreshSessions: () => {
        ledger.calls.push('list');
        return Promise.resolve([...(useApp.getState().sessions as Session[])]);
      },
      refreshPastSessions: () => Promise.resolve(),
      refreshSessionSheet: () => Promise.resolve(),
      loadSessionActivity: () => Promise.resolve(),
      openSavedOutput: () => undefined,
      closeSavedOutput: () => undefined,
      setConfirm: () => {
        ledger.confirms += 1;
      },
      toast: (kind: string, text: string, opts?: { sticky?: boolean }) => {
        ledger.toasts.push({ kind, text, sticky: opts?.sticky === true });
      },
      canDiscard: () => o.canDiscard ?? true,
      canRestore: () => true
    });
    if (o.open !== false) useApp.getState().openSessionSheet('managed');
  }
  const sheet = (): any => useApp.getState().sessionSheet;
  const setSheet = (patch: Record<string, unknown>): void => {
    useApp.setState({ sessionSheet: { ...sheet(), ...patch } });
  };
  const setSessions = (sessions: Session[]): void => useApp.setState({ sessions });
  const changedToasts = (): number =>
    ledger.toasts.filter((t) => t.kind === 'info' && t.text === SESSION_CHANGED).length;

  // =========================================================================
  // §4.1 THE ONE GATES PREDICATE
  // =========================================================================

  await rule('G1', '§4.1', 'canEnd is a live row only; an unknown or removed row gains nothing that acts; presence and enablement are two fields', (c) => {
    for (const status of STATUSES) {
      for (const machine of [undefined, STUDIO]) {
        for (const e of [env(), env({ canDiscard: false }), env({ shellPathReady: false })]) {
          const s = sess('g', { status, machine, hasSavedScrollback: true } as Partial<Session>);
          const g = sessionActionGates(s, status, e) as Record<string, boolean>;
          const where = `${status}${machine ? ' on m1' : ''} ${J(e)}`;
          c.eq(g['canEnd'], LIVE.has(status), `canEnd for ${where}`);
          if (status === 'unknown' || status === 'discarded') {
            for (const field of ['canRename', 'offersRestore', 'canRestoreNow', 'offersRestart', 'offersBare', 'offersResumeInPlace', 'canEnd', 'showsRemove', 'canRemove']) {
              c.eq(g[field], false, `${field} for ${where}`);
            }
          }
          c.eq(g['showsRemove'], ENDED.has(status), `showsRemove (PRESENCE) for ${where}`);
          c.eq(g['canRemove'], ENDED.has(status) && e['canDiscard'] === true, `canRemove (ENABLEMENT) for ${where}`);
          c.eq(g['canRestoreNow'], g['offersRestore'] === true && e['shellPathReady'] === true, `canRestoreNow is offersRestore and a shell that answered, for ${where}`);
        }
      }
    }
  });

  // =========================================================================
  // §2.10 WHO A BATCH MAY END
  // =========================================================================

  await rule('E1', '§2.10', 'batchEligibility is canEnd narrowed by one named case and never widened', (c) => {
    const known = (id: string): boolean => id === 'm1';
    const table: [string, Session, string][] = [
      ['a live row on this Mac', sess('a'), 'yes'],
      ['an idle row', sess('b', { status: 'idle' }), 'yes'],
      ['a row asking for input', sess('c', { status: 'needs_input' }), 'yes'],
      ['a live row on a machine this run holds', sess('d', { machine: STUDIO }), 'yes'],
      ['a live row on a machine this run holds NO row for (R11)', sess('e', { machine: ATTIC }), 'unreachable'],
      ['an unreachable row', sess('f', { status: 'unknown' }), 'unreachable'],
      ['an ended row', sess('g', { status: 'exited' }), 'ended'],
      ['a restorable row', sess('h', { status: 'restorable' }), 'ended'],
      ['a removed row', sess('i', { status: 'discarded' }), 'gone']
    ];
    for (const [what, s, want] of table) {
      c.eq(batchEligibility(s, gatesOf(s), known), want, what);
    }
    // Before the machines list has loaded every remote target is skipped.
    const s = sess('j', { machine: STUDIO });
    c.eq(batchEligibility(s, gatesOf(s), () => false), 'unreachable', 'a remote row before the machines list loaded');
  });

  // =========================================================================
  // §4.9 THE LOOP, over plain injected functions
  // =========================================================================

  interface LoopRun {
    trace: string[];
    outcomes: Record<string, { state: string; message?: string; reason?: string }>;
    summary: Record<string, number>;
  }
  async function loop(o: {
    targets: string[];
    list: () => Session[] | null;
    end?: (id: string) => Promise<{ ok: true } | { ok: false; message: string }>;
    stop?: (trace: string[]) => boolean;
    known?: (id: string) => boolean;
  }): Promise<LoopRun> {
    const trace: string[] = [];
    const outcomes: LoopRun['outcomes'] = {};
    const known = o.known ?? ((id: string) => id === 'm1');
    const summary = (await runBatchEnd({
      targetIds: o.targets,
      list: () => {
        trace.push('list');
        return Promise.resolve(o.list());
      },
      eligibility: (s: Session) => {
        trace.push(`eligibility:${s.id}`);
        return batchEligibility(s, gatesOf(s), known);
      },
      end: (id: string) => {
        trace.push(`end:${id}`);
        return (o.end ?? (() => Promise.resolve({ ok: true as const })))(id);
      },
      stopRequested: () => (o.stop ? o.stop(trace) : false),
      report: (id: string, outcome: { state: string }) => {
        trace.push(`report:${id}:${outcome.state}`);
        outcomes[id] = outcome as LoopRun['outcomes'][string];
      }
    })) as Record<string, number>;
    return { trace, outcomes, summary };
  }
  /** Every end in a trace is preceded, since the one before it, by a list. */
  const freshReadBeforeEveryEnd = (trace: string[]): boolean => {
    let readSinceLastEnd = false;
    for (const step of trace) {
      if (step === 'list') readSinceLastEnd = true;
      if (step.startsWith('end:')) {
        if (!readSinceLastEnd) return false;
        readSinceLastEnd = false;
      }
    }
    return true;
  };

  await rule('B1', '§4.9 step 3', 'a fresh list() before EVERY end, and a list that could not be read ends nothing', async (c) => {
    const all = [sess('a'), sess('b'), sess('c')];
    const r = await loop({ targets: ['a', 'b', 'c'], list: () => all });
    c.ok(freshReadBeforeEveryEnd(r.trace), `an end was called without a fresh read before it: ${J(r.trace)}`);
    c.eq(r.trace.filter((t) => t === 'list').length, 3, 'one read per target');
    c.eq(r.summary['ended'], 3, 'three live targets end');
    const nulls = await loop({ targets: ['a', 'b'], list: (() => { let n = 0; return () => (n++ === 0 ? null : all); })() });
    c.eq(nulls.outcomes['a'], { state: 'failed', message: BATCH_LIST_FAILED }, 'a null read is a failure with its sentence');
    c.ok(!nulls.trace.includes('end:a'), `end was called for a target whose read failed: ${J(nulls.trace)}`);
    c.eq(nulls.outcomes['b']?.state, 'ended', 'the next target still runs after a failed read');
  });

  await rule('B2', '§4.9 step 4', 'the target is found BY SESSION ID; a row with the same name changes nothing, and no dependency is handed a name', async (c) => {
    // Two sessions share a name in two projects. The ENDED one is listed
    // first, so a lookup by name would read it and skip the live target.
    const twin = sess('y', { name: 'dup', status: 'exited', projectPath: '/w/beta' });
    const target = sess('x', { name: 'dup' });
    const r = await loop({ targets: ['x'], list: () => [twin, target] });
    c.eq(r.outcomes['x']?.state, 'ended', 'the selected id ends, whatever shares its name');
    c.eq(r.trace.filter((t) => t.startsWith('end:')), ['end:x'], 'end is called with the target id alone');
    c.ok(!r.trace.some((t) => t.includes('dup')), `a dependency was handed a name: ${J(r.trace)}`);
  });

  await rule('B3', '§4.9 step 4', 'an id absent from the fresh read is skipped as gone and never ended', async (c) => {
    const r = await loop({ targets: ['a', 'gone', 'b'], list: () => [sess('a'), sess('b')] });
    c.eq(r.outcomes['gone'], { state: 'skipped', reason: 'gone' }, 'the absent id');
    c.ok(!r.trace.includes('end:gone'), `end was called for an id main no longer lists: ${J(r.trace)}`);
    c.eq(r.summary['ended'], 2, 'the others still end');
    const empty = await loop({ targets: [''], list: () => [sess('')] });
    c.ok(!empty.trace.includes('end:'), 'an empty id is never ended, whatever a list answers for it');
  });

  await rule('B4', '§4.9 step 6', 'one failure never stops the batch: a refusal and a throw are that row\'s outcome and the next target runs', async (c) => {
    const all = [sess('a'), sess('b'), sess('c')];
    const r = await loop({
      targets: ['a', 'b', 'c'],
      list: () => all,
      end: (id) =>
        id === 'a'
          ? Promise.resolve({ ok: false, message: 'refused by main' })
          : id === 'b'
            ? Promise.reject(new Error('the transport broke'))
            : Promise.resolve({ ok: true })
    });
    c.eq(r.outcomes['a'], { state: 'failed', message: 'refused by main' }, 'a refusal is recorded with main\'s sentence');
    c.eq(r.outcomes['b']?.state, 'failed', 'a throw is recorded as a failure');
    c.eq(r.outcomes['c']?.state, 'ended', 'the target after two failures still ends');
    c.eq(r.summary, { ended: 1, skipped: 0, failed: 2, notRun: 0 }, 'the summary');
  });

  await rule('B5', '§4.9 step 3', 'stopRequested is asked before EACH target; once true, the rest are not-run and nothing more is read or ended', async (c) => {
    const all = [sess('a'), sess('b'), sess('c')];
    let flips = 0;
    const r = await loop({
      targets: ['a', 'b', 'c'],
      list: () => all,
      // True once the first target has been reported, and false again after:
      // a flag that flips back must not resume a batch a person stopped.
      stop: (trace) => {
        if (!trace.some((t) => t.startsWith('report:a:'))) return false;
        flips += 1;
        return flips === 1;
      }
    });
    c.eq(r.outcomes['a']?.state, 'ended', 'the target before the stop ends');
    c.eq([r.outcomes['b']?.state, r.outcomes['c']?.state], ['not-run', 'not-run'], 'every target after the stop');
    c.eq(r.trace.filter((t) => t === 'list').length, 1, 'no read after the stop');
    c.ok(!r.trace.includes('end:b') && !r.trace.includes('end:c'), `a target was ended after the stop: ${J(r.trace)}`);
  });

  // =========================================================================
  // §4.9 steps 0, 1 and 8, and §2.10, over the REAL store
  // =========================================================================

  await rule('B6', '§4.9 step 1', 'the press re-checks eligibility: a NAMED id that is no longer eligible is not a target', async (c) => {
    world([sess('x'), sess('y')]);
    useApp.getState().setSessionSheetChecked(['x', 'y'], true);
    startBatch();
    c.eq((sheet().batch?.named ?? []).map((t: { id: string }) => t.id), ['x', 'y'], 'both are named at open');
    // x ends by itself while the confirmation is open.
    setSessions([sess('x', { status: 'exited' }), sess('y')]);
    c.eq(batchTargetsNow(), ['y'], 'the targets a press would freeze now');
    await confirmBatch();
    await settle();
    c.eq(ledger.calls.filter((t) => t.startsWith('end:')), ['end:y'], 'what the press ended');
  });

  await rule('B7', '§4.9 step 1', 'an id that was NOT named at open is never a target, however eligible it has become; the store holds that too; a second press starts nothing', async (c) => {
    // z is on a machine this run holds no row for, so it is skipped at open.
    world([sess('x'), sess('z', { machine: ATTIC })], { machineStates: [MACHINE_M1] });
    useApp.getState().setSessionSheetChecked(['x', 'z'], true);
    startBatch();
    c.eq((sheet().batch?.named ?? []).map((t: { id: string }) => t.id), ['x'], 'only x is named');
    c.eq(sheet().batch?.skippedAtOpen, { ended: 0, unreachable: 1 }, 'z is counted as unreachable at open');
    // The machine comes back while the confirmation is open.
    useApp.setState({ machineStates: [MACHINE_M1, MACHINE_M2] });
    c.eq(batchTargetsNow(), ['x'], 'the machine that came back adds nothing (actions.ts)');
    // The store's own lock, asked directly with the id it must refuse.
    const runId = useApp.getState().beginSessionSheetBatchRun(['x', 'z']);
    c.ok(typeof runId === 'number', 'the run began');
    c.eq(sheet().batch?.targets, ['x'], 'the store froze only what was named (session-manager-slice.ts)');
    // A second press, a held Enter or a double click.
    world([sess('x')]);
    useApp.getState().setSessionSheetChecked(['x'], true);
    startBatch();
    await Promise.all([confirmBatch(), confirmBatch()]);
    await settle();
    c.eq(ledger.calls.filter((t) => t.startsWith('end:')), ['end:x'], 'two presses end one target once');
  });

  await rule('B8', '§2.10', 'a checked id the filters hide is never named and never a target (checked is intersected with visibleIds again at naming and at the press)', async (c) => {
    world([sess('x', { projectPath: '/w/alpha' }), sess('w', { projectPath: '/w/beta' })]);
    // The prune has NOT run: w is checked and the project filter hides it.
    setSheet({ project: '/w/alpha', checked: { x: true, w: true } });
    startBatch();
    c.eq((sheet().batch?.named ?? []).map((t: { id: string }) => t.id), ['x'], 'named at open');
    c.eq(batchTargetsNow(), ['x'], 'the targets at the press');
  });

  await rule('B9', '§4.9 step 8', 'stopRequested is bound to THIS run: a loop whose sheet closed and reopened with a new batch ends no further target', async (c) => {
    world([sess('a'), sess('b')]);
    useApp.getState().setSessionSheetChecked(['a', 'b'], true);
    startBatch();
    const held = deferred<{ ok: true }>();
    endAnswer = (id) => (id === 'a' ? held.promise : Promise.resolve({ ok: true }));
    const first = confirmBatch();
    for (let i = 0; i < 40 && !ledger.calls.includes('end:a'); i += 1) await tick();
    c.ok(ledger.calls.includes('end:a'), 'the first call is in flight');
    // The manager closes, opens again, and a NEW batch waits in confirm with
    // a clear stop flag of its own.
    useApp.getState().closeSessionSheet();
    useApp.getState().openSessionSheet('managed');
    useApp.getState().setSessionSheetChecked(['b'], true);
    startBatch();
    c.eq(sheet().batch?.phase, 'confirm', 'the new batch is waiting');
    held.resolve({ ok: true });
    await first;
    await settle();
    c.eq(ledger.calls.filter((t) => t.startsWith('end:')), ['end:a'], 'the old loop ended nothing after the close');
    c.eq(sheet().batch?.phase, 'confirm', 'the new batch was not started or reported into');
  });

  // =========================================================================
  // §4.0 THE RULE OF THE PRESS
  // =========================================================================

  const menuRow = (id: string, tab: 'managed' | 'past' = 'managed'): unknown => ({ id, tab });
  const pick = (items: unknown[], label: string): { run(): void } | undefined =>
    items.find((i) => typeof i === 'object' && i !== null && (i as { label?: string }).label === label) as
      | { run(): void }
      | undefined;

  await rule('P1', '§4.0', 'a menu pick acts only on a FRESH row that passes that verb\'s own gate; a stale pick calls nothing, opens nothing and says SESSION_CHANGED once', async (c) => {
    // Remove, drawn on an ended row that has since turned live.
    world([sess('x', { status: 'exited', hasSavedScrollback: true } as Partial<Session>)]);
    let items = manageMenuItems(menuRow('x'));
    const remove = pick(items, 'Remove');
    const restart = pick(items, 'Restart');
    c.ok(remove !== undefined && restart !== undefined, 'the ended row offers Remove and Restart');
    setSessions([sess('x')]);
    remove?.run();
    await settle();
    c.eq(sheet().inline, null, 'a stale Remove opened a panel');
    c.ok(!ledger.calls.includes('remove:x'), 'a stale Remove removed');
    c.eq(changedToasts(), 1, 'one SESSION_CHANGED after the stale Remove');
    restart?.run();
    await settle();
    c.ok(!ledger.calls.includes('restart:x'), `a stale Restart restarted a live session: ${J(ledger.calls)}`);
    c.eq(changedToasts(), 2, 'one SESSION_CHANGED after the stale Restart');
    // End, drawn on a live row that has since ended.
    world([sess('y')]);
    items = manageMenuItems(menuRow('y'));
    const end = pick(items, 'End session…');
    c.ok(end !== undefined, 'the live row offers End session…');
    setSessions([sess('y', { status: 'exited' })]);
    end?.run();
    await settle();
    c.eq(sheet().inline, null, 'a stale End opened its confirmation');
    c.eq(changedToasts(), 1, 'one SESSION_CHANGED after the stale End');
    c.eq(ledger.confirms, 0, 'no stacked confirm');
  });

  await rule('P2', '§4.0 step 5', 'Retry re-enters AT THE GATE and never calls a lifecycle verb directly', async (c) => {
    world([sess('x', { status: 'exited', hasSavedScrollback: true } as Partial<Session>)]);
    c.ok(useApp.getState().setSessionSheetInline({ id: 'x', kind: 'failed', retry: 'remove', message: 'first try' }), 'the failed panel opened');
    setSessions([sess('x')]);
    retryInline();
    await settle();
    c.ok(!ledger.calls.includes('remove:x'), `Retry removed a row that turned live: ${J(ledger.calls)}`);
    c.eq(sheet().inline, null, 'the stale panel closed');
    c.eq(changedToasts(), 1, 'one SESSION_CHANGED');
    world([sess('y')]);
    useApp.getState().setSessionSheetInline({ id: 'y', kind: 'failed', retry: 'end', message: 'first try' });
    setSessions([sess('y', { status: 'exited' })]);
    retryInline();
    await settle();
    c.ok(!ledger.calls.includes('end:y'), `Retry ended a row that had already ended: ${J(ledger.calls)}`);
  });

  await rule('P3', '§4.3', 'a continuation writes only into ITS OWN busy panel; when that panel is gone the failure is one sticky toast', async (c) => {
    world([sess('x'), sess('y')]);
    useApp.getState().setSessionSheetInline({ id: 'x', kind: 'end' });
    const held = deferred<{ ok: false; message: string }>();
    endAnswer = (id) => (id === 'x' ? held.promise : Promise.resolve({ ok: true }));
    confirmInline();
    for (let i = 0; i < 40 && !ledger.calls.includes('end:x'); i += 1) await tick();
    c.ok(ledger.calls.includes('end:x'), 'the End is in flight');
    c.eq(sheet().inline?.busy, true, 'its panel is busy');
    // The person closes the manager, opens it again and opens Details on y.
    useApp.getState().closeSessionSheet();
    useApp.getState().openSessionSheet('managed');
    c.ok(useApp.getState().setSessionSheetInline({ id: 'y', kind: 'details' }), 'Details opened on y');
    held.resolve({ ok: false, message: 'the machine is not ready' });
    await settle();
    c.eq({ id: sheet().inline?.id, kind: sheet().inline?.kind }, { id: 'y', kind: 'details' }, 'the panel under y is untouched');
    c.eq(
      ledger.toasts.filter((t) => t.kind === 'error' && t.text === 'the machine is not ready' && t.sticky).length,
      1,
      'the failure is one sticky error toast with main\'s sentence'
    );
  });

  // =========================================================================
  // §4.1 and §4.2: the policy's menu, with and without the host
  // =========================================================================

  const labels = (items: unknown[]): string[] =>
    items.map((i) => (i === 'sep' ? '—' : String((i as { label?: string }).label)));
  const itemOf = (items: unknown[], label: string): Record<string, unknown> | undefined =>
    items.find((i) => i !== 'sep' && (i as { label?: string }).label === label) as Record<string, unknown> | undefined;

  await rule('H1', '§4.1', 'in the policy\'s own menu Remove and Restore are PRESENT by one field and ENABLED by another; an unknown or removed row offers nothing that acts', (c) => {
    const ended = sess('x', { status: 'exited', hasSavedScrollback: true } as Partial<Session>);
    world([ended], { canDiscard: false, open: false });
    let items = sessionMenuItems(ended, 't');
    const removeOff = itemOf(items, 'Remove');
    c.ok(removeOff !== undefined, `Remove is absent on a build that cannot discard: ${J(labels(items))}`);
    c.eq(removeOff?.['disabled'], true, 'Remove is drawn greyed on a build that cannot discard');
    c.eq(removeOff?.['destructive'], true, 'Remove is destructive');
    c.ok(itemOf(items, 'End session…') === undefined, 'an ended row offers End session…');
    world([ended], { canDiscard: true, open: false });
    items = sessionMenuItems(ended, 't');
    c.ok(itemOf(items, 'Remove')?.['disabled'] !== true, 'Remove is enabled on a build that can discard');
    world([ended], { shellPathReady: false, open: false });
    items = sessionMenuItems(ended, 't');
    c.eq(itemOf(items, 'Restore')?.['disabled'], true, 'Restore is PRESENT and greyed while the shell has not answered');
    for (const status of ['unknown', 'discarded'] as SessionStatus[]) {
      const s = sess('u', { status, hasSavedScrollback: true } as Partial<Session>);
      world([s], { open: false });
      const offered = labels(sessionMenuItems(s, 't'));
      for (const verb of ['Rename', 'Restore', 'Restart', 'Remove', 'End session…']) {
        c.ok(!offered.includes(verb), `${status} offers ${verb}`);
      }
    }
  });

  await rule('H2', '§4.2 the parity rule', 'with a host and without one the items are equal in everything but run, for every status, on this Mac and on a machine', (c) => {
    const host = {
      rename() {},
      restore() {},
      restart() {},
      end() {},
      remove() {},
      savedOutput() {},
      leaveThen() {},
      goThen() {}
    };
    const shape = (items: unknown[]): string =>
      J(items.map((i) => (i === 'sep' ? 'sep' : Object.fromEntries(Object.entries(i as object).filter(([k]) => k !== 'run').sort()))));
    for (const status of STATUSES) {
      for (const machine of [undefined, STUDIO]) {
        for (const material of [true, false]) {
          for (const o of [{}, { canDiscard: false }, { shellPathReady: false }] as WorldOptions[]) {
            const s = sess('p', { status, machine, hasSavedScrollback: material } as Partial<Session>);
            world([s], { ...o, open: false });
            const bare = sessionMenuItems(s, 't');
            const hosted = sessionMenuItems(s, 't', host);
            c.eq(shape(hosted), shape(bare), `${status}${machine ? ' on m1' : ''}${material ? ' with material' : ''} ${J(o)}`);
          }
        }
      }
    }
  });

  // =========================================================================
  // §3.2 THE PROJECTION
  // =========================================================================

  const projection = (sessions: Session[], o: { past?: Session[]; projects?: Project[] } = {}): any =>
    buildManageProjection({
      sessions,
      pastSessions: o.past ?? [],
      projects: o.projects ?? [],
      machineStates: [MACHINE_M1],
      handbacks: {},
      activity: {},
      restoringIds: {},
      shellPathReady: true,
      canRestore: true,
      canDiscard: true
    });
  const groupOf = (p: { managed: { key: string; rows: { id: string }[] }[] }, id: string): string | undefined =>
    p.managed.find((g) => g.rows.some((r) => r.id === id))?.key;

  await rule('R1', '§3.2', 'a group is a workspace target and NEVER a basename: two folders with one name are two groups', (c) => {
    const p = projection([
      sess('a', { projectPath: '/w/one/app' }),
      sess('b', { projectPath: '/w/two/app' }),
      sess('c', { projectPath: '/w/one/app' })
    ]);
    c.eq(p.managed.length, 2, 'two folders named app on this Mac');
    c.ok(groupOf(p, 'a') !== groupOf(p, 'b'), 'a and b share a group');
    c.eq(groupOf(p, 'a'), groupOf(p, 'c'), 'one folder is one group');
    // A closed tab filters nothing out: none of these has an open tab.
    c.eq(p.managedTotal, 3, 'every session is on the tab whether or not its project is open');
  });

  await rule('R2', '§3.2', 'the machine is part of the group key: one path on this Mac and on a machine is two groups', (c) => {
    const p = projection([
      sess('l', { projectPath: '/w/same' }),
      sess('r', { projectPath: '/w/same', machine: STUDIO })
    ]);
    c.eq(p.managed.length, 2, 'two groups');
    c.eq(groupOf(p, 'l'), '/w/same', 'this Mac keys by the bare path');
    c.eq(groupOf(p, 'r'), 'm1:/w/same', 'a machine keys by its id and the path');
    const gone = projection([], {
      past: [sess('g', { status: 'discarded', projectPath: '/w/same', machineGone: { label: 'Old box' } } as Partial<Session>)]
    });
    c.eq(gone.past[0]?.key, '!gone:Old box:/w/same', 'a row whose machine was removed keys under !gone:');
  });

  // =========================================================================
  // §2.4, §2.5, §2.10: THE VIEW
  // =========================================================================

  const ALL = { search: '', project: 'all', tabFilter: 'all', stateFilter: 'all' };

  await rule('V1', '§2.5', 'a null sorts LAST in both directions, and sorting is inside each group', (c) => {
    const p = projection([
      sess('n', { projectPath: '/w/a', createdAt: 0 }),
      sess('o', { projectPath: '/w/a', createdAt: 100 }),
      sess('q', { projectPath: '/w/a', createdAt: 50 }),
      sess('z', { projectPath: '/w/b', createdAt: 10 })
    ]);
    const order = (dir: 1 | -1): string[][] =>
      visibleGroups(p.managed, ALL, { key: 'created', dir }).map((g: { rows: { id: string }[] }) => g.rows.map((r) => r.id));
    c.eq(order(1), [['q', 'o', 'n'], ['z']], 'ascending, the dash last');
    c.eq(order(-1), [['o', 'q', 'n'], ['z']], 'descending, the dash still last');
  });

  await rule('V2', '§2.10', 'select-all and the prune act on the FILTERED ids: the view the sheet draws never offers a row the filters hide', (c) => {
    world([sess('x'), sess('y', { status: 'exited' }), sess('i', { status: 'idle' })]);
    useApp.getState().patchSessionSheet({ stateFilter: 'working' });
    const v = selectSheetView(useApp.getState());
    c.eq(v?.visibleIds, ['x'], 'the ids the Working filter leaves');
    c.eq(selectAllWrite(v?.visibleIds ?? [], {}), { ids: ['x'], on: true }, 'select-all checks those and nothing else');
  });

  await rule('V3', '§2.10', 'select-all with NOTHING checked checks every visible row; with anything checked, some or all, it CLEARS', (c) => {
    const visible = ['a', 'b', 'c'];
    c.eq(selectAllWrite(visible, {}), { ids: visible, on: true }, 'nothing checked');
    c.eq(selectAllWrite(visible, { a: true }), { ids: ['a'], on: false }, 'an indeterminate click');
    c.eq(selectAllWrite(visible, { a: true, b: true, c: true }), { ids: visible, on: false }, 'everything checked');
  });

  await rule('V4', '§2.4', 'the state filter\'s Running is THREE statuses, and Ended is two', (c) => {
    for (const status of STATUSES) {
      c.eq(stateFilterKeeps('running', status), LIVE.has(status), `Running keeps ${status}`);
      c.eq(stateFilterKeeps('ended', status), ENDED.has(status), `Ended keeps ${status}`);
    }
    const p = projection(STATUSES.filter((s) => s !== 'discarded').map((status, i) => sess(`s${String(i)}`, { status })));
    c.eq(visibleIds(visibleGroups(p.managed, { ...ALL, stateFilter: 'running' }, null)).length, 3, 'the rows Running leaves');
  });

  // =========================================================================
  // §3.4 and §2.5: THE CELLS
  // =========================================================================

  const act = (over: Partial<OverviewSessionActivity>): OverviewSessionActivity => ({
    sessionId: 'a',
    coverage: 'complete',
    reason: null,
    userMessages: 2,
    agentMessages: 1,
    lastMessageAt: NOW - 3_600_000,
    lastMessageBy: 'agent',
    lastMessageClock: 'message',
    readAt: NOW,
    ...over
  });
  const drawn = (cell: Record<string, unknown>): string => [cell['main'], cell['small'], cell['title']].join(' | ');

  await rule('C1', '§3.4', 'a null count is NEVER drawn as a number, and nothing drawn reads null, undefined or NaN', (c) => {
    const gemini = act({ coverage: 'partial', reason: 'ask-only', userMessages: 3, agentMessages: null });
    const g = messagesCell(gemini, 'gemini', false);
    c.eq([g.main, g.small], ['3+', 'Replies not recorded'], 'replies not recorded are words');
    // A gemini record with no reply count AND no kept ask (Phase 298, rough
    // edge 2). Its time halves are empty too, which is what such a record holds.
    const nothingSaid = act({
      coverage: 'partial',
      reason: 'ask-only',
      userMessages: 0,
      agentMessages: null,
      lastMessageAt: null,
      lastMessageBy: null,
      lastMessageClock: null
    });
    const cases: [string, OverviewSessionActivity | null, string, boolean][] = [
      ['complete', act({}), 'claude', false],
      ['zero replies', act({ userMessages: 2, agentMessages: 0 }), 'claude', false],
      ['gemini', gemini, 'gemini', false],
      ['unavailable', act({ coverage: 'unavailable', reason: 'not-yet', userMessages: null, agentMessages: null, lastMessageAt: null, lastMessageBy: null, lastMessageClock: null }), 'claude', false],
      ['a shell', act({ coverage: 'not-applicable', reason: 'shell', userMessages: null, agentMessages: null, lastMessageAt: null, lastMessageBy: null, lastMessageClock: null }), 'shell', false],
      ['a remote row', null, 'claude', true],
      ['pending', null, 'claude', false],
      ['nothing said yet', nothingSaid, 'gemini', false]
    ];
    for (const [what, a, agent, remote] of cases) {
      for (const cell of [messagesCell(a, agent, remote), lastMessageCell(a, agent, NOW)]) {
        c.ok(!/null|undefined|NaN/.test(drawn(cell)), `${what} drew ${J(drawn(cell))}`);
      }
    }
    const none = messagesCell(cases[3]?.[1] ?? null, 'claude', false);
    c.eq(none.main, '—', 'a count that was never read is a dash');

    // PHASE 298, ROUGH EDGE 2. The two cells beside each other contradicted
    // themselves: `0+ / Replies not recorded` next to `No messages yet`, a `+`
    // on a zero promising more where the cell next door said there is none.
    // Both halves come from the same `countsOf`, so the cell, the cell beside it
    // and the NUMBER THE COLUMN SORTS BY must all read the one answer.
    const empty = messagesCell(nothingSaid, 'gemini', false);
    c.eq([empty.main, empty.small], ['—', 'No messages yet'], 'no kept ask and no reply count draws the dash and the word the cell beside it draws');
    c.eq(lastMessageCell(nothingSaid, 'gemini', NOW).small, 'No messages yet', 'the Last message cell reads the same word from the same halves');
    c.eq(drawnMessageTotal(nothingSaid, 'gemini', false), null, 'the Messages sort answers null, so the row sorts with the other dashes and not with the zeros');
    // And a `0` that IS a count — both halves kept, each of them zero — still
    // draws its zero, because that is a fact about the conversation and not a
    // gap in the record.
    const countedZero = act({ userMessages: 0, agentMessages: 0 });
    c.eq(messagesCell(countedZero, 'claude', false).main, '0', 'a record that kept both halves and counted zero still draws its 0');
    c.eq(drawnMessageTotal(countedZero, 'claude', false), 0, 'and that zero sorts as a zero');
    // One kept ask is still `1+`: the clause is about the ZERO and not about a
    // missing reply count.
    c.eq(messagesCell(act({ coverage: 'partial', reason: 'ask-only', userMessages: 1, agentMessages: null }), 'gemini', false).main, '1+', 'one kept ask with no reply count is still 1+');
  });

  await rule('C4', '§3.4, Phase 298 rough edge 6', 'a shell is decided BEFORE remote: a shell on another machine reads — / Shell, because a shell has no messages on ANY machine and that is the truer word', (c) => {
    // §3.4's Messages table is keyed on the activity, and `remoteActivity()`
    // answers `coverage: 'unavailable', reason: 'remote'`, so BY THE TABLE the
    // cell would read `Unavailable`. The code short-circuits on the agent first
    // and reads `Shell`, and the prose under that same table blesses it: "In the
    // renderer a shell is decided before remote". The product is right and the
    // table was wrong; §3.4's table moves and this case pins the order so a
    // later round cannot quietly flip it back. NO WORD A PERSON READS CHANGES.
    const shellAnswer = act({
      coverage: 'not-applicable',
      reason: 'shell',
      userMessages: null,
      agentMessages: null,
      lastMessageAt: null,
      lastMessageBy: null,
      lastMessageClock: null
    });
    const remoteAnswer = act({
      coverage: 'unavailable',
      reason: 'remote',
      userMessages: null,
      agentMessages: null,
      lastMessageAt: null,
      lastMessageBy: null,
      lastMessageClock: null
    });
    const arms: [string, OverviewSessionActivity | null][] = [
      ['the shell answer', shellAnswer],
      ['the remote answer, which is what a remote row actually carries', remoteAnswer],
      ['no answer at all', null]
    ];
    for (const [what, a] of arms) {
      const cell = messagesCell(a, 'shell', true);
      c.eq([cell.main, cell.small], ['—', 'Shell'], `a shell on another machine reads the shell word, with ${what}`);
      c.eq(drawnMessageTotal(a, 'shell', true), null, `and its Messages sort is a dash, with ${what}`);
      c.eq(lastMessageCell(a, 'shell', NOW).small, 'Not applicable', `and its Last message cell is Not applicable, with ${what}`);
    }
    // The same word on this Mac, so the machine is not what decides it.
    c.eq(messagesCell(shellAnswer, 'shell', false).small, 'Shell', 'a shell on this Mac reads the same word');
    // And it is an ORDER and not a blanket answer: a row that is not a shell
    // still reads Unavailable on another machine.
    c.eq(messagesCell(null, 'claude', true).small, 'Unavailable', 'an agent row on another machine still reads Unavailable');
    c.eq(messagesCell(remoteAnswer, 'claude', false).small, 'Unavailable', 'and so does a local row whose answer says remote');
  });

  await rule('C2', '§3.4', 'one clock is never drawn as another: ask and session each say which clock the age is', (c) => {
    const ask = lastMessageCell(act({ lastMessageClock: 'ask' }), 'cursor', NOW);
    c.eq(ask.small, 'Agent reply', 'clock ask names the reply');
    c.ok(typeof ask.title === 'string' && ask.title.endsWith('. Time of your last prompt. This agent records no reply time.'), `clock ask's title says whose time it is: ${J(ask.title)}`);
    const session = lastMessageCell(act({ lastMessageClock: 'session' }), 'deepseek', NOW);
    c.eq(session.small, 'Session updated', 'clock session');
    c.ok(typeof session.title === 'string' && session.title.endsWith('. This agent records no time per message.'), `clock session's title: ${J(session.title)}`);
    const message = lastMessageCell(act({ lastMessageBy: 'you' }), 'claude', NOW);
    c.eq(message.small, 'Your prompt', 'clock message, by you');
    c.ok(typeof message.title === 'string' && !message.title.includes('This agent'), 'clock message carries no clock sentence');
  });

  await rule('C3', '§2.5', 'a createdAt that is not above 0 is a dash with no small and no title', (c) => {
    for (const at of [0, -5]) {
      const cell = createdCell(at, NOW);
      c.eq([cell.main, cell.small, cell.title], ['—', null, null], `createdAt ${String(at)}`);
    }
    const real = createdCell(NOW - 3_600_000, NOW);
    c.eq(real.main, 'Today', 'an hour ago is Today');
  });

  // =========================================================================
  // §3.4 THE TRUTH TABLE, spot rows, main side
  // =========================================================================

  await rule('A1', '§3.4', 'toActivity: nothing that was not read is a zero, and the zeros are made under ok alone', (c) => {
    const facts = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
      id: 'a',
      agent: 'claude',
      machineId: 'local',
      agentSessionId: 'conv-1',
      known: true,
      ...over
    });
    const stored = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
      sessionId: 'a',
      provider: 'claude',
      readState: 'ok',
      lastReadAt: NOW,
      lastTouchedAt: null,
      turns: null,
      userMessages: null,
      agentReplies: null,
      lastAskAt: null,
      lastAnswerAt: null,
      lastHasAnswer: null,
      ...over
    });
    const counts = (a: OverviewSessionActivity): unknown => [a.coverage, a.reason, a.userMessages, a.agentMessages];
    c.eq(counts(toActivity(facts({ agent: 'shell' }), undefined)), ['not-applicable', 'shell', null, null], 'a shell');
    c.eq(counts(toActivity(facts({ machineId: 'm1' }), undefined)), ['unavailable', 'remote', null, null], 'a row on another machine');
    c.eq(counts(toActivity(facts(), undefined)), ['unavailable', 'unreadable', null, null], 'row 0, the refresh wrote nothing');
    c.eq(counts(toActivity(facts(), stored({ readState: 'no-file' }))), ['unavailable', 'not-yet', null, null], 'row 6, nothing on disk');
    c.eq(counts(toActivity(facts(), stored())), ['complete', null, 0, 0], 'row 9, a record read that held nothing');
    c.eq(counts(toActivity(facts(), stored({ provider: 'gemini', turns: 3, userMessages: 3, agentReplies: 0 }))), ['partial', 'ask-only', 3, null], 'row 8, gemini');
    const cursor = toActivity(facts({ agent: 'cursor' }), stored({ provider: 'cursor', turns: 3, userMessages: 3, agentReplies: 2, lastHasAnswer: true, lastAskAt: '2026-09-18T12:00:00Z' }));
    c.eq(cursor.lastMessageClock, 'ask', 'a reply with no clock draws the ask\'s time under clock ask');
  });

  // =========================================================================
  // THE FIX ROUND: what the verifiers measured as worse than today, or unsafe
  // =========================================================================

  await rule('R3', '§2.11, §12, the operator\'s ruling 2026-09-19', 'the Past tab is ONE list in main\'s removal order, copied and never re-sorted, and groups only when the project filter names one project, as today', (c) => {
    // Driven through the REAL store and `selectSheetView`, the selector the
    // sheet draws from. Built by hand from the no-regression reverify's X5:
    // main answered ax2, bx1, ax1, wt1, d1, removals alternating between alpha
    // and beta (both open), wt1 a worktree of alpha, d1 from delta (closed).
    // The fix round's group order drew ax2, ax1, wt1, bx1, d1.
    const removed = (id: string, path: string, at: number, cwd: string = path): Session =>
      sess(id, { status: 'discarded', removedAt: at, projectPath: path, cwd } as Partial<Session>);
    const projects = [
      { id: 'pa', path: '/w/alpha', name: 'alpha' },
      { id: 'pb', path: '/w/beta', name: 'beta' }
    ] as Project[];
    type PastView = {
      visibleIds: string[];
      pastList: { row: { id: string }; group: { label: string } }[] | null;
      groups: { key: string; rows: { id: string }[] }[];
    };
    const pastView = (past: Session[], patch: Record<string, unknown> = {}): PastView => {
      world([], { past, projects });
      c.ok(useApp.getState().setSessionSheetTab('past') === true, 'the sheet moved to Past');
      if (Object.keys(patch).length > 0) useApp.getState().patchSessionSheet(patch);
      const v = selectSheetView(useApp.getState()) as PastView | null;
      if (v === null) throw new Error('the sheet is open, so there is a view');
      return v;
    };
    const X5 = (): Session[] => [
      removed('ax2', '/w/alpha', 40),
      removed('bx1', '/w/beta', 30),
      removed('ax1', '/w/alpha', 20),
      removed('wt1', '/w/alpha', 10, '/w/alpha-wt'),
      removed('d1', '/w/delta', 5)
    ];
    const all = pastView(X5());
    c.eq(all.visibleIds, ['ax2', 'bx1', 'ax1', 'wt1', 'd1'], 'X5 under All: the drawn order is main\'s');
    c.eq(all.pastList?.map((e) => e.row.id) ?? null, ['ax2', 'bx1', 'ax1', 'wt1', 'd1'], 'X5 under All is drawn as ONE list, with no heading');
    c.eq(all.pastList?.map((e) => e.group.label) ?? null, ['alpha', 'beta', 'alpha', 'alpha', 'delta'], 'each row carries its project for its small line');
    c.eq(pastView(X5(), { search: 'x' }).visibleIds, ['ax2', 'bx1', 'ax1'], 'a search across projects keeps main\'s order');
    // The reverify's second reading: the second newest removal behind twenty
    // older removals in the other project went from row 2 to row 22 of 22.
    const deep = [removed('A-newest', '/w/alpha', 1000), removed('B-second', '/w/beta', 990)];
    for (let i = 20; i >= 1; i -= 1) deep.push(removed(`A-old-${String(i)}`, '/w/alpha', i));
    const deepView = pastView(deep);
    c.eq(deepView.visibleIds.indexOf('B-second') + 1, 2, 'the second newest removal is row 2 of 22');
    c.eq(deepView.visibleIds, deep.map((s) => s.id), 'every one of the 22 rows in main\'s order');
    // One project named: that project's rows, in the same order, under its head.
    const one = pastView(X5(), { project: '/w/alpha' });
    c.eq(one.pastList, null, 'filtered to one project, the tab draws a group, not the single list');
    c.eq(one.groups.map((g) => [g.key, g.rows.map((r) => r.id)]), [['/w/alpha', ['ax2', 'ax1', 'wt1']]], 'alpha\'s rows in main\'s order under alpha\'s head');
    // The order is COPIED from main, never re-derived: a list whose times
    // disagree with its order is drawn as it came.
    const handed = [removed('q1', '/w/alpha', 10), removed('q2', '/w/beta', 90), removed('q3', '/w/alpha', 50)];
    c.eq(pastView(handed).visibleIds, ['q1', 'q2', 'q3'], 'the list as main handed it, times ignored');
    c.eq(
      projection([], { past: handed }).pastRows.map((r: { id: string }) => r.id),
      ['q1', 'q2', 'q3'],
      'the projection\'s single list is the incoming order'
    );
  });

  await rule('V5', '§2.4, the fix round W4', 'the search text holds the folder as main STORED it and the session\'s own folder, so a pasted absolute path finds its sessions, as today', (c) => {
    const p = projection([], {
      past: [
        sess('p', {
          status: 'discarded',
          removedAt: 5,
          projectPath: '/Users/somebody/code/api',
          cwd: '/Users/somebody/code/api-wt'
        } as Partial<Session>)
      ]
    });
    const groups = (q: string): string[] =>
      visibleIds(visibleGroups(p.past, { ...ALL, search: q }, null));
    c.eq(groups('/Users/somebody/code/api'), ['p'], 'the pasted project path');
    c.eq(groups('somebody'), ['p'], 'the user name in it');
    c.eq(groups('/Users/somebody/code/api-wt'), ['p'], 'the session\'s own folder');
  });

  await rule('L1', '§4.5 step 5, the fix round W1', 'a Past restore that succeeded closes the sheet and lands in the session when its project is open; the Managed tab stays open', async (c) => {
    const landed: string[] = [];
    const one = { id: 'p1', path: '/w/alpha', name: 'alpha' } as Project;
    const other = { id: 'p0', path: '/w/zero', name: 'zero' } as Project;
    const restoredAs = (id: string) => ({
      kind: 'restored',
      session: sess(id),
      note: { kind: 'success', text: `'n-${id}' restored.`, sticky: false }
    });
    const pastWorld = (): void => {
      landed.length = 0;
      world([], { past: [sess('x', { status: 'discarded', removedAt: 5 } as Partial<Session>)], projects: [other, one] });
      useApp.setState({
        activeProjectId: 'p0',
        setActiveProject: (id: string) => {
          landed.push(`project:${id}`);
          useApp.setState({ activeProjectId: id });
        },
        setActiveSession: (id: string) => {
          landed.push(`session:${id}`);
        },
        restorePastSession: (id: string) => {
          ledger.calls.push(`restore-past:${id}`);
          return Promise.resolve(restoredAs(id));
        },
        restoreSessionNow: (id: string) => {
          ledger.calls.push(`restore:${id}`);
          return Promise.resolve(restoredAs(id));
        }
      });
      useApp.getState().setSessionSheetTab('past');
    };
    pastWorld();
    (actions['runPrimary'] as (id: string, tab: string, verb?: string) => void)('x', 'past', 'restore');
    await settle();
    c.eq(ledger.calls, ['restore-past:x'], 'the Past verb ran once');
    c.eq(sheet(), null, 'the sheet closed after a Past restore');
    c.eq(landed, ['project:p1', 'session:x'], 'the project was switched to and the session selected');
    // The Managed tab is a list a person works down: it stays.
    world([sess('m', { status: 'exited', hasSavedScrollback: true } as Partial<Session>)], { projects: [one] });
    useApp.setState({
      restoreSessionNow: (id: string) => {
        ledger.calls.push(`restore:${id}`);
        return Promise.resolve(restoredAs(id));
      }
    });
    (actions['runPrimary'] as (id: string, tab: string, verb?: string) => void)('m', 'managed', 'restore');
    await settle();
    c.eq(ledger.calls, ['restore:m'], 'the Managed restore ran once');
    c.ok(sheet() !== null, 'the Managed tab stayed open');
  });

  await rule('F1', '§4.5 step 3, the fix round W7', 'a folder that is gone is said on the FIRST press, with no ask promising a shell in it; any other read failure draws the ask as before', async (c) => {
    const bridge = (globalThis as unknown as { window: { gmux: Record<string, unknown> } }).window.gmux;
    const payload = (detail: string): Error =>
      new Error(`Error invoking remote method 'fs:readDir': ${JSON.stringify({ code: 'FS_FAILED', message: 'Could not read alpha', detail })}`);
    const run = async (detail: string | null): Promise<any> => {
      bridge['fs'] = {
        readDir: (path: string) => {
          ledger.calls.push(`readDir:${path}`);
          return detail === null ? Promise.resolve({ path, entries: [] }) : Promise.reject(payload(detail));
        }
      };
      try {
        world([sess('x', { status: 'exited', hasSavedScrollback: true } as Partial<Session>)]);
        (actions['runPrimary'] as (id: string, tab: string, verb?: string) => void)('x', 'managed', 'restore');
        await settle();
        return sheet()?.inline ?? null;
      } finally {
        delete bridge['fs'];
      }
    };
    const gone = await run("ENOENT: no such file or directory, scandir '/w/alpha'");
    c.eq(gone?.kind, 'failed', 'ENOENT: the failed panel on the first press');
    c.ok(typeof gone?.message === 'string' && gone.message.includes('/w/alpha') && gone.message.includes('no folder there now'), `ENOENT: the folder sentence, got ${J(gone?.message)}`);
    c.eq(ledger.calls.filter((one) => !one.startsWith('readDir:') && one !== 'list'), [], 'ENOENT: nothing restored and no tab opened');
    const file = await run("ENOTDIR: not a directory, scandir '/w/alpha'");
    c.eq(file?.kind, 'failed', 'ENOTDIR (a path that is now a file): the failed panel, as today\'s stat counted it');
    const denied = await run("EACCES: permission denied, scandir '/w/alpha'");
    c.eq(denied?.kind, 'restore-open', 'any other failure: the ask, exactly as before');
    const there = await run(null);
    c.eq(there?.kind, 'restore-open', 'a folder that is there: the ask');
  });

  await rule('O1', '§5.2, the fix round W3', 'the doors open OVER the Catch Me Up page and the New Session sheet, and the sheet stays the top layer over them; a layer drawn over the sheet still refuses the door', async (c) => {
    const open = await load('renderer/session-manager/open.ts');
    const other = open['otherLayerOpen'] as () => boolean;
    const top = open['sheetIsTopLayer'] as () => boolean;
    world([], { open: false });
    const rest = { confirm: null, createOpen: false, newProjectOpen: false, remoteProjectOpen: false, shortcutsOpen: false, attentionOpen: false, overview: null };
    useApp.setState({ ...rest, createOpen: true, overview: { level: 'project' } });
    c.eq(other(), false, 'the page and the create sheet are not layers the door refuses under');
    useApp.getState().openSessionSheet('past');
    c.eq(top(), true, 'the sheet opened over them is the top layer, so the keyboard is pulled back into it');
    for (const [field, value] of [['confirm', { title: 'x' }], ['attentionOpen', true], ['shortcutsOpen', true], ['newProjectOpen', true], ['remoteProjectOpen', true]] as const) {
      useApp.setState({ ...rest, [field]: value });
      c.eq(other(), true, `${field} refuses the door`);
      c.eq(top(), false, `${field} is drawn over the sheet`);
    }
    useApp.setState(rest);
  });

  await rule('K1', '§4.9, the fix round (the batch attack\'s P2)', 'the closed-mid-batch toast says there was a rest only when something was left not run', (c) => {
    const closed = copy['batchClosedToast'] as (ended: number, n: number, notRun?: number) => string;
    c.eq(closed(1, 1, 0), '1 of 1 session ended.', 'closed during the only target\'s call');
    c.ok(closed(1, 3, 2).includes('The rest were left running'), 'closed with two not run');
  });

  // Every rule has run. Nothing may have asked the fake bridge for a
  // lifecycle verb: the sheet reaches main through the store's verbs alone,
  // and every one of those is a recorder here.
  await rule('Z1', '§4.0', 'no lifecycle bridge method was reached directly: kill, discard, restore and rename go through the store\'s verbs', (c) => {
    c.eq(bridgeReached, [], 'bridge calls made around the store');
  });
} catch (err) {
  results.push({
    id: 'LOAD',
    owner: 'the gate itself',
    title: 'the shipping modules loaded',
    checks: 1,
    failures: [`${err instanceof Error ? (err.stack ?? err.message) : String(err)}`]
  });
} finally {
  rmSync(scratch, { recursive: true, force: true });
}

// At most twenty failures a rule, so one broken rule cannot flood the line.
for (const r of results) {
  if (r.failures.length > 20) r.failures = [...r.failures.slice(0, 20), `and ${String(r.failures.length - 20)} more`];
}
// A pipe on macOS is written asynchronously, and exiting before the write
// drains cuts the one line the gate reads. So the exit waits for it.
process.stdout.write(`\nP293_JSON:${JSON.stringify({ rules: results })}\n`, () => process.exit(exitCode));
