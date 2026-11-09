/**
 * PHASE 321 — the agent that was MASKED, the two whose questions the shapes
 * now read, and every agent that must read exactly as it did
 * (build/p321/SPEC.md §4, §5.2 and §12.9).
 *
 * The SHIPPING state machine on a virtual clock, with the profiles from the
 * COMPILED registry, driven tick by tick the way the monitor drives it: a
 * session still inside its probe window (`worthProbing`) gets the process
 * table and a capture, a blocked one gets a capture, and the output clock is
 * tmux's `#{window_activity}`, which is whole seconds.
 *
 * THE ORACLE IS THE PARENT'S OWN RULE. `pInferredVerdict`
 * (./p321-parent-rule.ts, moved there by Phase 353 so Phase 328's file reads
 * the same one copy) is a LITERAL COPY of `inferredVerdict` at `ecb6997a` with
 * every helper it calls, the detector included, copied rather than imported:
 * an oracle that imports the thing it judges proves nothing. Every agent whose row declares
 * none of the new fields must read, tick for tick, what the oracle reads, over
 * every input this file builds; and for grok, every input on which the phase
 * promises nothing new must read the same too.
 *
 *  - A shape is asked ONLY while the session's agent holds the pane's
 *    terminal (the operator's ruling of 2026-09-23). The harness below does
 *    the monitor's one read the way the monitor does it, through the shipping
 *    `foregroundToRead` and `noteForeground`, with each scenario's command
 *    lines standing in for `ps -o command=`. The hostile shells are driven
 *    through the SHIPPING monitor in p321-foreground.test.ts.
 *  - grok's resident-helper rule was REMOVED whole by the same ruling, so grok
 *    is among the rows held to the parent tick for tick below, with its
 *    helpers alive for its whole life.
 *  - antigravity 1.2.7 repaints every 2.0 s at rest and while asking. The
 *    build excused that repaint while its own shape was drawn; the fix round
 *    removed the shape and the exemption, so antigravity, cursor and opencode
 *    are among the rows held to the parent tick for tick below, under that
 *    same repaint and with his words in the input box.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  activityProfileFor,
  AGENT_REGISTRY,
  DEFAULT_ACTIVITY,
  SHELL_ACTIVITY,
  type AgentActivityProfile
} from '../../agents/registry';
import type { PaneFacts } from '../panes';
import { parseProcTable, type ProcSnapshot } from '../process';
import {
  commitVerdict,
  foregroundToRead,
  freshState,
  inferredVerdict,
  noteForeground,
  worthProbing,
  type SessionState
} from '../state-machine';
import type { ActivityState } from '../types';
// THE PARENT'S RULE, and the two helpers that build its inputs over the
// committed windows, MOVED to ./p321-parent-rule.ts by Phase 353 (D328-6) so
// Phase 328's file holds HEAD to the same one copy. Nothing it asserts here
// changed by the move.
import {
  HIS_WORDS,
  noteUserInput,
  pCommitVerdict,
  pFreshState,
  pInferredVerdict,
  pNoteUserInput,
  pWorthProbing,
  restingWindow,
  typedInto
} from './p321-parent-rule';

// ---------------------------------------------------------------------------
// The screens: committed fixtures and committed windows, never typed here
// ---------------------------------------------------------------------------

const FIXTURES = join(__dirname, 'fixtures');
const fixture = (name: string): string => readFileSync(join(FIXTURES, name), 'utf8');

// ---------------------------------------------------------------------------
// The virtual clock
// ---------------------------------------------------------------------------

const T0 = 1_800_000_000_000;
const PANE_PID = 1000;

interface Process {
  pid: number;
  ppid: number;
  stat: string;
  born: number;
  died?: number;
  /** CPU seconds per wall second while alive. */
  rate?: number;
}

/** One agent session as the monitor sees it, on seconds from launch. */
interface Scenario {
  profile: AgentActivityProfile;
  end: number;
  /** Seconds of each write the agent makes. */
  writes: number[];
  /** The visible screen at a second. */
  screen: (s: number) => string;
  /** The processes under the pane, the agent itself included. */
  procs: Process[];
  /** Seconds at which HIS keystroke reaches the session (noteUserInput). */
  keys?: number[];
  /** The registry id the monitor would hand `noteForeground`. */
  agent?: string;
  /** `ps -o command=` for each pid, as the monitor's one foreground read gets it. */
  commands?: Record<number, string>;
  /** The pane's own program's STAT: `Ss` is a shell with a job, `Ss+` holds the terminal itself. */
  paneStat?: string;
}

function tableAt(procs: readonly Process[], s: number, paneStat = 'Ss'): ProcSnapshot {
  const lines = [`${String(PANE_PID)} 1 0:00.10 ${paneStat}`];
  for (const p of procs) {
    if (s < p.born || (p.died !== undefined && s >= p.died)) continue;
    const cpu = (p.rate ?? 0) * (s - p.born);
    const mm = Math.floor(cpu / 60);
    const ss = (cpu - mm * 60).toFixed(2).padStart(5, '0');
    lines.push(`${String(p.pid)} ${String(p.ppid)} ${String(mm)}:${ss} ${p.stat}`);
  }
  return parseProcTable(lines.join('\n'), T0 + s * 1000);
}

/** How many of the (ascending) writes happened at or before a second. */
function writtenBy(writes: readonly number[], s: number): number {
  let lo = 0;
  let hi = writes.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if ((writes[mid] ?? Infinity) <= s) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

function paneAt(writes: readonly number[], s: number, over: Partial<PaneFacts> = {}): PaneFacts {
  const n = writtenBy(writes, s);
  const last = n > 0 ? (writes[n - 1] ?? 0) : 0;
  return {
    tmuxId: '$1',
    paneId: '%1',
    panePid: PANE_PID,
    active: false,
    dead: false,
    // `#{window_activity}` is whole seconds.
    activityAt: Math.floor((T0 + last * 1000) / 1000) * 1000,
    currentCommand: 'node',
    keypad: false,
    alternate: false,
    inMode: false,
    historySize: 0,
    historyLimit: 25_000,
    title: '',
    ...over
  };
}

interface Run {
  head: ActivityState[];
  parent: ActivityState[];
  at: number[];
  st: SessionState;
}

/** Drive both builds over one scenario at one cadence and one tick phase. */
function run(sc: Scenario, cadence: number, phase: number, profile = sc.profile): Run {
  const st = freshState(T0);
  const ps = pFreshState(T0);
  const out: Run = { head: [], parent: [], at: [], st };
  const keys = [...(sc.keys ?? [])];
  let prev = -Infinity;
  for (let s = phase; s <= sc.end; s += cadence) {
    const now = T0 + Math.round(s * 1000);
    for (const k of keys) {
      if (k > prev && k <= s) {
        noteUserInput(st, now);
        pNoteUserInput(ps, now);
      }
    }
    prev = s;
    const pane = paneAt(sc.writes, s);

    const probe = worthProbing(profile, st, now);
    const ctx = {
      now,
      proc: probe ? tableAt(sc.procs, s, sc.paneStat) : null,
      ...(probe || st.state === 'needs_input' ? { capture: sc.screen(s) } : {})
    };
    // The monitor's one read, before the verdict, as `readForegrounds` does it.
    const readPid = ctx.capture === undefined ? null : foregroundToRead(pane, profile, st, ctx.proc);
    if (readPid !== null) noteForeground(st, pane, readPid, sc.commands?.[readPid] ?? null, sc.agent ?? '');
    const v = inferredVerdict(pane, profile, st, ctx);
    if (v !== null) commitVerdict(st, v, now);

    const pProbe = pWorthProbing(profile, ps, now);
    const pCtx = {
      now,
      proc: pProbe ? tableAt(sc.procs, s, sc.paneStat) : null,
      ...(pProbe || ps.state === 'needs_input' ? { capture: sc.screen(s) } : {})
    };
    const pv = pInferredVerdict(pane, profile, ps, pCtx);
    if (pv !== null) pCommitVerdict(ps, pv, now);

    out.head.push(st.state);
    out.parent.push(ps.state);
    out.at.push(s);
  }
  return out;
}

const PHASES = Array.from({ length: 10 }, (_, i) => i / 10);
const CADENCES = [1, 2];

/**
 * Five tick phases, for the one section that multiplies every input by every
 * profile. `normalizeCapture` is quadratic on a row whose trailing column is
 * not blank (grok's and qwen's scrollbar), about 0.28 ms a call on grok's
 * resting window, and the oracle pays it again, so ten phases there cost a
 * minute of the suite for no further clause.
 */
const FIVE_PHASES = [0, 0.2, 0.4, 0.6, 0.8];

/** Every cadence and ten tick phases of it. */
function everyRun(
  sc: Scenario,
  profile = sc.profile,
  phases: readonly number[] = PHASES
): Array<{ cadence: number; phase: number; r: Run }> {
  const out: Array<{ cadence: number; phase: number; r: Run }> = [];
  for (const cadence of CADENCES) {
    for (const p of phases) out.push({ cadence, phase: p * cadence, r: run(sc, cadence, p * cadence, profile) });
  }
  return out;
}

const firstAt = (r: Run, state: ActivityState, from = 0): number | null => {
  for (let i = 0; i < r.at.length; i++) {
    if ((r.at[i] ?? 0) >= from && r.head[i] === state) return r.at[i] ?? null;
  }
  return null;
};

const between = (r: Run, from: number, to: number, which: 'head' | 'parent' = 'head'): ActivityState[] =>
  r.at.flatMap((s, i) => (s >= from && s < to ? [r[which][i] as ActivityState] : []));

/** A write every `every` seconds from `from` to `to`, starting at `offset`. */
function writesEvery(from: number, to: number, every: number, offset = 0): number[] {
  const out: number[] = [];
  for (let s = from + offset; s < to; s += every) out.push(Math.round(s * 1000) / 1000);
  return out;
}

// ---------------------------------------------------------------------------
// antigravity's repaint, an input the rows below are driven under
// ---------------------------------------------------------------------------

const AGY = activityProfileFor('antigravity');
const AGY_PROCS: Process[] = [{ pid: 1001, ppid: PANE_PID, stat: 'S+', born: 0 }];
/** agy 1.2.7 writes every 2.0 s at rest and while asking (research 129 §2.2). */
const AGY_REPAINT = writesEvery(0, 400, 2.0, 0.3);

function agyScenario(question: string, drawn: number, answered: number, keys = true, after = 30): Scenario {
  const rest = restingWindow('a', 'antigravity');
  return {
    profile: AGY,
    end: answered + after,
    writes: AGY_REPAINT,
    screen: (s) => (s >= drawn && s < answered ? question : rest),
    procs: AGY_PROCS,
    ...(keys ? { keys: [answered] } : {})
  };
}

// ---------------------------------------------------------------------------
// The two agents whose questions the numbered verdict could not read
// ---------------------------------------------------------------------------

/** Each kept agent's command line as `ps -o command=` prints it on this Mac. */
const AGENT_COMMAND: Record<string, string> = {
  // qwen 0.22.0's launcher ends in `exec "$ROOT/node/bin/node" "$ROOT/lib/cli-entry.js"`.
  qwen: '/Users/example/.local/lib/qwen-code/node/bin/node /Users/example/.local/lib/qwen-code/lib/cli-entry.js',
  // Tortie launches Claude Code by its bare name.
  claude: 'claude --session-id 1b2c3d4e-0000-4000-8000-000000000000'
};

describe('a drawn shape question reaches needs_input on a quiet screen', () => {
  const cases: Array<[string, string, string]> = [
    ['qwen', 'qwen-run-permission.txt', 'a'],
    ['qwen', 'qwen-run-permission-scrollbar.txt', 'a'],
    ['claude', 'claude-trust-2-1-280.txt', 'a']
  ];
  // Both shapes of pane the agent holds the terminal in: its own program in a
  // session Tortie created (`Ss+`), and a job of the login shell in one Tortie
  // restored and he resumed (`Ss`, the agent `S+` under it).
  const shapesOfPane: Array<[string, Partial<Scenario>]> = [
    ['as the pane\'s own program', { paneStat: 'Ss+', procs: [], commands: {} }],
    ['as the shell\'s job', { paneStat: 'Ss', procs: [{ pid: 1001, ppid: PANE_PID, stat: 'S+', born: 0 }] }]
  ];
  for (const [agent, file, source] of cases) {
    for (const [how, pane] of shapesOfPane) {
      it(`${agent}: ${file} at 1 s and at 2 s, ${how}, where the parent never raised it`, () => {
        const rest = restingWindow(source, agent);
        const question = fixture(file);
        const holder = pane.paneStat === 'Ss+' ? PANE_PID : 1001;
        const sc: Scenario = {
          profile: activityProfileFor(agent),
          agent,
          end: 80,
          // The question is drawn in one write and the agent is silent after it.
          writes: [1, 2, 3, 10],
          screen: (s) => (s >= 10 && s < 60 ? question : rest),
          procs: pane.procs ?? [],
          paneStat: pane.paneStat ?? 'Ss',
          commands: { [holder]: AGENT_COMMAND[agent] ?? '' },
          keys: [60]
        };
        for (const { cadence, phase, r } of everyRun(sc)) {
          const raised = firstAt(r, 'needs_input');
          expect(raised, `cadence ${String(cadence)} phase ${String(phase)}`).not.toBeNull();
          expect(r.parent.includes('needs_input')).toBe(false);
          expect(between(r, 60 + cadence, 80).includes('needs_input')).toBe(false);
        }
      });
    }
  }

  it('the same question with a process holding the terminal whose command line names no agent is never raised', () => {
    // The rule's own twin: everything as above, but what holds the terminal is
    // `tail -f` printing a screen log (research: the reverify's first case).
    for (const [agent, file] of [['qwen', 'qwen-run-permission.txt'], ['claude', 'claude-trust-2-1-280.txt']] as const) {
      const sc: Scenario = {
        profile: activityProfileFor(agent),
        agent,
        end: 80,
        writes: [1, 2, 3, 10],
        screen: (s) => (s >= 10 ? fixture(file) : restingWindow('a', agent)),
        procs: [{ pid: 1001, ppid: PANE_PID, stat: 'S+', born: 0 }],
        paneStat: 'Ss',
        commands: { 1001: 'tail -f /Users/example/screen.log' }
      };
      for (const { cadence, phase, r } of everyRun(sc)) {
        expect(r.head.includes('needs_input'), `${agent} cadence ${String(cadence)} phase ${String(phase)}`).toBe(false);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// grok, an INPUT the rows below are driven under (its rule was removed)
// ---------------------------------------------------------------------------

/**
 * grok as research 129 recorded it: it draws continuously until its first
 * turn ends, its six helpers are born about 6 s after launch as detached
 * session leaders and stay for its whole life, and then it is silent. The
 * operator's ruling of 2026-09-23 removed the rule that excused those
 * helpers, so grok reads working on every tick, exactly as the parent does,
 * and the section below holds it to that.
 *
 * Its resting screen is taken from adv1's recording (the same grok 1.0.34 on
 * the same day) rather than a's, because a's draws a scrollbar column down the
 * right edge and `normalizeCapture`'s `\s+$` is quadratic on a row whose last
 * column is not blank.
 */
function grokInput(end: number): Scenario {
  const rest = restingWindow('adv1', 'grok');
  const writes = writesEvery(0, 180, 0.15);
  return {
    profile: activityProfileFor('grok'),
    agent: 'grok',
    end,
    writes,
    screen: (s) => `${rest}\n${'.'.repeat(writtenBy(writes, s) % 97)}`,
    procs: [
      { pid: 1001, ppid: PANE_PID, stat: 'S+', born: 0 },
      ...[2001, 2002, 2003, 2004, 2005, 2006].map((pid) => ({ pid, ppid: 1001, stat: 'Ss', born: 6 }))
    ],
    commands: { 1001: 'grok' }
  };
}

// ---------------------------------------------------------------------------
// Every other profile reads exactly what the parent read
// ---------------------------------------------------------------------------

describe('every profile without the new fields reads the parent, tick for tick', () => {
  const plain: Array<[string, AgentActivityProfile]> = [
    ['the shell', SHELL_ACTIVITY],
    ['an agent this build has never heard of', DEFAULT_ACTIVITY],
    // PHASE 353's named amendment (build/p353/SPEC.md D328-6): a row carrying
    // either of Phase 328's fields leaves this list, because its output no
    // longer reads as work at rest. That is antigravity alone, and
    // p328-writes-without-drawing.test.ts holds it to Phase 328's invariant
    // over these same inputs instead of to the parent tick for tick.
    ...AGENT_REGISTRY.filter(
      (r) =>
        r.activity !== undefined &&
        r.activity.dialogs === undefined &&
        r.activity.writesWithoutDrawing === undefined &&
        r.activity.terminalTools === undefined
    ).map((r): [string, AgentActivityProfile] => [r.id, r.activity as AgentActivityProfile])
  ];

  it('the list is every row but the two whose shapes stay and the one Phase 328 changed: the removed shapes and grok among them', () => {
    expect(plain.map(([id]) => id).sort()).toEqual(
      [
        'an agent this build has never heard of',
        'codex',
        'cursor',
        'deepseek',
        'droid',
        'gemini',
        'grok',
        'muse',
        'omp',
        'opencode',
        'pi',
        'the shell'
      ].sort()
    );
  });

  /** Every input this file builds, with the question screens of every shape. */
  const inputs = (): Array<[string, Scenario]> => {
    const shapes = [
      'antigravity-trust-gate.txt',
      'antigravity-run-permission.txt',
      'cursor-trust-gate.txt',
      'cursor-trust-answered.txt',
      'cursor-run-permission.txt',
      'qwen-run-permission.txt',
      'opencode-permission.txt',
      'claude-trust-2-1-280.txt',
      'gemini-trust-gate.txt',
      'claude-workspace-trust.txt'
    ];
    const out: Array<[string, Scenario]> = [];
    for (const file of shapes) {
      const q = fixture(file);
      out.push([`${file}, quiet`, { ...agyScenario(q, 10, 40, true, 12), writes: [1, 10] }]);
      out.push([`${file}, under a 2.0 s repaint`, agyScenario(q, 10, 40, true, 12)]);
    }
    out.push(['grok with its helpers', grokInput(240)]);
    const words = typedInto(restingWindow('a', 'antigravity'), /^>/, HIS_WORDS);
    out.push([
      'his numbered words under a repaint',
      { profile: AGY, end: 120, writes: AGY_REPAINT, screen: () => words, procs: AGY_PROCS }
    ]);
    return out;
  };

  for (const [id, profile] of plain) {
    it(`${id}`, () => {
      for (const [name, sc] of inputs()) {
        for (const { cadence, phase, r } of everyRun(sc, profile, FIVE_PHASES)) {
          expect(r.head, `${name} at ${String(cadence)} s phase ${String(phase)}`).toEqual(r.parent);
          // A row that lists no shape is never read for its foreground.
          expect(r.st.foreground).toBeNull();
        }
      }
    });
  }
});
