/**
 * PHASE 328 — antigravity reads idle at its prompt (build/p353/SPEC.md §4.4,
 * D328-1 to D328-7; the Phase 328 entry in docs/BACKLOG.md).
 *
 * The SHIPPING state machine on a virtual clock, with the profiles from the
 * COMPILED registry, driven tick by tick the way the monitor drives it (a
 * session inside its probe window, `worthProbing`, gets the process table and
 * a capture; a blocked one gets a capture), beside THE PARENT'S OWN RULE, the
 * one literal copy in ./p321-parent-rule.ts. The input is antigravity's one
 * recorded turn as NUMBERS (build/fixtures/questions/a-antigravity-timeline.json,
 * rebuilt by build/p328/timeline.mjs from the entry's measured sentences and
 * labels.json, because the recording itself is gone): its writes, tmux's
 * whole-second activity stamp being the newest one's second; its captures, each
 * a committed screen of a-antigravity.jsonl; its half-second process samples
 * with the subtree's CPU-seconds and the STAT letters of agy and what is under
 * it; and its key times. 1 s and 2 s, ten tick phases each.
 *
 * What it holds, the entry's mechanism 6 in order:
 *
 *   - at rest (from +270 s) HEAD reads idle on every tick, where the parent
 *     read running (every tick at 1 s, a phase-dependent share at 2 s);
 *   - THE INVARIANT, tick for tick (D328-5): the dialog count, the clear count,
 *     every needs_input decision, the probe decision, the capture and the `ps`
 *     read equal the parent's; HEAD reads working where the parent read idle
 *     only while a session leader is alive under agy (clause B), and idle where
 *     the parent read working only on a tick whose only evidence was output;
 *   - the turn boundaries are the five the entry names and none falls at rest;
 *   - his numbered words, typed and pasted into the resting screen under the
 *     writes, read needs_input on exactly the parent's ticks;
 *   - the tool stretch with agy's CPU at 0, 1 and 4 percent reads running
 *     through clause B, and idle with clause B taken off the profile;
 *   - a terminal child left alive at rest reads running, a numbered question
 *     drawn while one is alive reads needs_input exactly as at the parent;
 *   - every other registry row, the shell and the floor read the parent tick
 *     for tick over the same inputs.
 *
 * `npm run ablation:p328` (build/p328/ablation.mjs) breaks the shipping source
 * one clause at a time and requires the row named for that clause here to go
 * red.
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
  freshState,
  inferredVerdict,
  isTurnBoundary,
  QUIET_MS,
  worthProbing
} from '../state-machine';
import type { ActivityState } from '../types';
import {
  HIS_WORDS,
  noteUserInput,
  pCommitVerdict,
  pDetectDialog,
  pFreshState,
  pInferredVerdict,
  pNoteUserInput,
  pWorthProbing,
  restingWindow,
  typedInto
} from './p321-parent-rule';

// ---------------------------------------------------------------------------
// The committed timeline and screens
// ---------------------------------------------------------------------------

const REPO = join(__dirname, '..', '..', '..', '..');
const QUESTIONS = join(REPO, 'build', 'fixtures', 'questions');

interface Timeline {
  end: { seconds: number };
  keys: { seconds: number[] };
  questions: { drawnAnsweredBytesLastWrite: number[][] };
  stretches: { restFrom: number; tool: [number, number]; silentTool: [number, number]; silentIntervalsFrom: number };
  writes: { seconds: number[] };
  captures: { seconds: number[]; screen: string[] };
  processes: { everySeconds: number; samples: Array<Array<number | string>> };
}

const TL = JSON.parse(readFileSync(join(QUESTIONS, 'a-antigravity-timeline.json'), 'utf8')) as Timeline;
const SCREENS = new Map<string, string>(
  readFileSync(join(QUESTIONS, 'a-antigravity.jsonl'), 'utf8')
    .split('\n')
    .filter((l) => l.trim() !== '')
    .map((l) => JSON.parse(l) as { id: string; rows: string[] })
    .map((w): [string, string] => [w.id, w.rows.join('\n')])
);
const REST = SCREENS.get('a-antigravity-0032') ?? '';
const REST_FROM = TL.stretches.restFrom;
const END = TL.end.seconds;

// ---------------------------------------------------------------------------
// One input: what tmux, `ps` and a capture would answer at each second
// ---------------------------------------------------------------------------

const T0 = 1_800_000_000_000;
const PANE_PID = 1000;

interface Sample {
  cpu: number;
  /** STAT of agy itself, then of each process under it. */
  stats: string[];
}

interface Input {
  writes: readonly number[];
  screenAt(s: number): string;
  sampleAt(s: number): Sample;
  keys: readonly number[];
  end: number;
  /** Seconds at which Tortie resized the pane (Phase 12.11's reflow). */
  resizes?: readonly number[];
}

/** The newest entry at or before `s` in an ascending list of seconds, by index, or -1. */
function lastAtOrBefore(times: readonly number[], s: number): number {
  let lo = 0;
  let hi = times.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if ((times[mid] ?? Infinity) <= s + 1e-9) lo = mid + 1;
    else hi = mid;
  }
  return lo - 1;
}

const SAMPLE_TIMES = TL.processes.samples.map((x) => Number(x[0]));

/** The timeline as it was recorded, with any of its parts replaced. */
function timelineInput(over: Partial<Input> = {}): Input {
  return {
    writes: TL.writes.seconds,
    screenAt: (s) => {
      const i = lastAtOrBefore(TL.captures.seconds, s);
      return i < 0 ? '' : (SCREENS.get(TL.captures.screen[i] ?? '') ?? '');
    },
    sampleAt: (s) => {
      const i = Math.max(0, lastAtOrBefore(SAMPLE_TIMES, s));
      const row = TL.processes.samples[i] ?? [0, 0, 'Ss+'];
      return { cpu: Number(row[1]), stats: row.slice(2).map(String) };
    },
    keys: TL.keys.seconds,
    end: END,
    ...over
  };
}

/** `ps -axo pid=,ppid=,time=,stat=` for one sample: agy is the pane's own program. */
function tableOf(sample: Sample, s: number): ProcSnapshot {
  const time = (cpu: number): string => {
    const mm = Math.floor(cpu / 60);
    return `${String(mm)}:${(cpu - mm * 60).toFixed(2).padStart(5, '0')}`;
  };
  const [own = 'Ss+', ...kids] = sample.stats;
  const lines = [`${String(PANE_PID)} 1 ${time(sample.cpu)} ${own}`];
  kids.forEach((stat, i) => lines.push(`${String(2001 + i)} ${String(PANE_PID)} 0:00.00 ${stat}`));
  return parseProcTable(lines.join('\n'), T0 + Math.round(s * 1000));
}

function paneAt(input: Input, s: number): PaneFacts {
  const i = lastAtOrBefore(input.writes, s);
  // tmux's `#{window_activity}` is the whole second of the newest output, and
  // a pane with none yet carries its creation, the launch.
  const activity = i < 0 ? 0 : Math.floor(input.writes[i] ?? 0);
  return {
    tmuxId: '$1',
    paneId: '%1',
    panePid: PANE_PID,
    active: false,
    dead: false,
    activityAt: T0 + activity * 1000,
    currentCommand: 'agy',
    keypad: false,
    alternate: false,
    inMode: false,
    historySize: 0,
    historyLimit: 25_000,
    title: 'Mac'
  };
}

// ---------------------------------------------------------------------------
// Both builds, side by side, tick for tick
// ---------------------------------------------------------------------------

interface Tick {
  s: number;
  head: ActivityState;
  parent: ActivityState;
  headProbe: boolean;
  parentProbe: boolean;
  headCapture: boolean;
  parentCapture: boolean;
  headDialog: number;
  parentDialog: number;
  headClear: number;
  parentClear: number;
  headBoundary: boolean;
  parentBoundary: boolean;
  /** What the parent's rule answered on this tick, null when it held. */
  parentVerdict: ActivityState | null;
  /** A session leader is alive under agy in this tick's sample (clause B's fact). */
  leader: boolean;
}

const AGY = activityProfileFor('antigravity');

function drive(
  input: Input,
  cadence: number,
  phase: number,
  profile: AgentActivityProfile = AGY,
  parentProfile: AgentActivityProfile = profile
): Tick[] {
  const st = freshState(T0);
  const ps = pFreshState(T0);
  const out: Tick[] = [];
  let prev = -Infinity;
  for (let s = phase; s <= input.end; s = Math.round((s + cadence) * 1000) / 1000) {
    const now = T0 + Math.round(s * 1000);
    for (const k of input.keys) {
      if (k > prev && k <= s) {
        noteUserInput(st, now);
        pNoteUserInput(ps, now);
      }
    }
    for (const r of input.resizes ?? []) {
      if (r > prev && r <= s) {
        // The monitor's `noteGeometryChange`, and the parent's own.
        st.reflowUntil = T0 + Math.round(r * 1000) + 2_500;
        ps.reflowUntil = T0 + Math.round(r * 1000) + 2_500;
      }
    }
    prev = s;
    const pane = paneAt(input, s);
    const sample = input.sampleAt(s);
    const leader = sample.stats.slice(1).some((x) => x.includes('s'));

    const headProbe = worthProbing(profile, st, now);
    const headCapture = headProbe || st.state === 'needs_input';
    const hv = inferredVerdict(pane, profile, st, {
      now,
      proc: headProbe ? tableOf(sample, s) : null,
      ...(headCapture ? { capture: input.screenAt(s) } : {})
    });
    const hFrom = st.state;
    const hNext = hv === null ? null : commitVerdict(st, hv, now);

    const parentProbe = pWorthProbing(parentProfile, ps, now);
    const parentCapture = parentProbe || ps.state === 'needs_input';
    const pv = pInferredVerdict(pane, parentProfile, ps, {
      now,
      proc: parentProbe ? tableOf(sample, s) : null,
      ...(parentCapture ? { capture: input.screenAt(s) } : {})
    });
    const pFrom = ps.state;
    const pNext = pv === null ? null : pCommitVerdict(ps, pv, now);

    out.push({
      s,
      head: st.state,
      parent: ps.state,
      headProbe,
      parentProbe,
      headCapture,
      parentCapture,
      headDialog: st.dialogTicks,
      parentDialog: ps.dialogTicks,
      headClear: st.clearTicks,
      parentClear: ps.clearTicks,
      headBoundary: hNext !== null && isTurnBoundary(hFrom, hNext),
      parentBoundary: pNext !== null && isTurnBoundary(pFrom, pNext),
      parentVerdict: pv === null ? null : pv.state,
      leader
    });
  }
  return out;
}

const PHASES = Array.from({ length: 10 }, (_, i) => i / 10);
const CADENCES = [1, 2];

function everyRun(input: Input, profile: AgentActivityProfile = AGY): Array<{ cadence: number; phase: number; ticks: Tick[] }> {
  const out: Array<{ cadence: number; phase: number; ticks: Tick[] }> = [];
  for (const cadence of CADENCES) {
    for (const p of PHASES) out.push({ cadence, phase: p * cadence, ticks: drive(input, cadence, p * cadence, profile) });
  }
  return out;
}

const where = (cadence: number, phase: number, s?: number): string =>
  `${String(cadence)} s, phase ${String(phase)}${s === undefined ? '' : `, +${s.toFixed(1)} s`}`;

/** Every disagreement on one of the invariant's quantities, as text: empty means the invariant held. */
function invariantBreaks(ticks: readonly Tick[], cadence: number, phase: number): string[] {
  const out: string[] = [];
  for (const t of ticks) {
    const at = where(cadence, phase, t.s);
    if (t.headDialog !== t.parentDialog) out.push(`${at}: dialog count ${String(t.headDialog)} against ${String(t.parentDialog)}`);
    if (t.headClear !== t.parentClear) out.push(`${at}: clear count ${String(t.headClear)} against ${String(t.parentClear)}`);
    if ((t.head === 'needs_input') !== (t.parent === 'needs_input')) out.push(`${at}: needs_input ${t.head} against ${t.parent}`);
    if (t.headProbe !== t.parentProbe) out.push(`${at}: probe ${String(t.headProbe)} against ${String(t.parentProbe)}`);
    if (t.headCapture !== t.parentCapture) out.push(`${at}: capture ${String(t.headCapture)} against ${String(t.parentCapture)}`);
    if (t.head === 'working' && t.parent !== 'working' && !t.leader) out.push(`${at}: HEAD working where the parent read ${t.parent} with no session leader alive`);
  }
  return out;
}

const fmt = (xs: readonly number[]): string => xs.map((x) => `+${x.toFixed(1)}`).join(', ');

// The entry's five moments (Phase 328, its model table), each with the slack a
// rebuilt timeline needs. At 2 s every one lands later, by the screen memory's
// five ticks and the three quiet ticks idle needs, so its window is nine
// seconds wider; the entry's own 2 s model puts the turn's end at +257 to +259.
const BOUNDARIES: Array<[string, number, number]> = [
  ['the launch draw settles under the trust gate (+16)', 12, 20],
  ['the draw after the trust answer settles before the prompt (+47 to +48)', 44, 52],
  ['its first question (+80 to +83)', 77, 87],
  ['its second question (+188 to +192)', 184, 196],
  ['the turn ends (+251)', 247, 262]
];

// ---------------------------------------------------------------------------

describe('antigravity at rest reads idle, and the invariant holds over its one recorded turn', () => {
  const runs = everyRun(timelineInput());

  it('at rest, from +270 s, HEAD reads idle on every tick at 1 s and at 2 s, in every phase, where the parent read running', () => {
    const lines: string[] = [];
    for (const { cadence, phase, ticks } of runs) {
      const rest = ticks.filter((t) => t.s >= REST_FROM);
      expect(rest.length).toBeGreaterThan(150);
      const notIdle = rest.filter((t) => t.head !== 'idle');
      expect(notIdle.map((t) => `+${t.s.toFixed(1)} ${t.head}`), where(cadence, phase)).toEqual([]);
      const parentRunning = rest.filter((t) => t.parent === 'working').length;
      if (cadence === 1) expect(parentRunning, `the parent at 1 s, ${where(cadence, phase)}`).toBe(rest.length);
      lines.push(`${where(cadence, phase)}: parent running ${String(parentRunning)} of ${String(rest.length)}, HEAD idle ${String(rest.length - notIdle.length)}`);
    }
    process.stdout.write(`[p328 rest] ${lines.join(' | ')}\n`);
  });

  it('THE INVARIANT: dialog count, clear count, needs_input, probe and capture equal the parent tick for tick, and HEAD works where the parent did not only while a session leader is alive', () => {
    for (const { cadence, phase, ticks } of runs) {
      expect(invariantBreaks(ticks, cadence, phase).slice(0, 5), where(cadence, phase)).toEqual([]);
    }
  });

  it('HEAD reads idle where the parent read working only while the parent\'s working was last asserted on output alone', () => {
    // Re-derived from the timeline alone, not from either rule. The parent's
    // working state on a tick was last ASSERTED on the latest tick its rule
    // answered working (it holds working through two quiet ticks after it).
    // On that tick the evidence must have been output alone: output inside
    // QUIET_MS, no session leader without `+` under agy, CPU under the bar on
    // it or the tick before, and the screen the same over the five captures
    // before it.
    const input = timelineInput();
    for (const { cadence, phase, ticks } of runs) {
      const bad: string[] = [];
      let asserted = -1;
      for (let i = 0; i < ticks.length; i += 1) {
        const t = ticks[i] as Tick;
        if (t.parentVerdict === 'working') asserted = i;
        if (!(t.head === 'idle' && t.parent === 'working')) continue;
        const u = ticks[asserted];
        if (u === undefined) {
          bad.push(`+${t.s.toFixed(1)}: the parent read working with no working verdict before it`);
          continue;
        }
        const sample = input.sampleAt(u.s);
        const toolChild = sample.stats.slice(1).some((x) => x.includes('s') && !x.includes('+'));
        const rate = (from: number, to: number): number => (input.sampleAt(to).cpu - input.sampleAt(from).cpu) / (to - from);
        const busy = rate(u.s - cadence, u.s) >= 0.05 && rate(u.s - 2 * cadence, u.s - cadence) >= 0.05;
        const screens = [0, 1, 2, 3, 4, 5].map((k) => input.screenAt(u.s - k * cadence));
        const changed = screens.some((x) => x !== screens[0]);
        const output = T0 + Math.round(u.s * 1000) - paneAt(input, u.s).activityAt <= QUIET_MS;
        if (toolChild || busy || changed || !output) {
          bad.push(`+${t.s.toFixed(1)} (asserted at +${u.s.toFixed(1)}): tool ${String(toolChild)}, cpu ${String(busy)}, screen moved ${String(changed)}, output ${String(output)}`);
        }
      }
      expect(bad.slice(0, 5), where(cadence, phase)).toEqual([]);
    }
  });

  it('the turn boundaries are the five the entry names, in every phase at both cadences, and none falls at rest', () => {
    const lines: string[] = [];
    for (const { cadence, phase, ticks } of runs) {
      const head = ticks.filter((t) => t.headBoundary).map((t) => t.s);
      const parent = ticks.filter((t) => t.parentBoundary).map((t) => t.s);
      lines.push(`${where(cadence, phase)}: HEAD ${fmt(head)}; parent ${parent.length === 0 ? 'none' : fmt(parent)}`);
    }
    process.stdout.write(`[p328 boundaries] ${lines.join(' | ')}\n`);
    for (const { cadence, phase, ticks } of runs) {
      const head = ticks.filter((t) => t.headBoundary).map((t) => t.s);
      expect(head.filter((s) => s >= REST_FROM), `HEAD at rest, ${where(cadence, phase)}`).toEqual([]);
      const slack = cadence === 1 ? 0 : 9;
      expect(head.length, `${where(cadence, phase)}: ${fmt(head)}`).toBe(5);
      BOUNDARIES.forEach(([name, from, to], i) => {
        const s = head[i] ?? -1;
        expect(s >= from && s <= to + slack, `${name} at +${s.toFixed(1)}, ${where(cadence, phase)}`).toBe(true);
      });
    }
  });

  it('the questions: needs_input on the parent\'s ticks exactly, and printed against the entry\'s model', () => {
    const lines: string[] = [];
    for (const { cadence, phase, ticks } of runs) {
      const head = ticks.filter((t) => t.head === 'needs_input').map((t) => t.s);
      const parent = ticks.filter((t) => t.parent === 'needs_input').map((t) => t.s);
      expect(head, where(cadence, phase)).toEqual(parent);
      if (head.length > 0) lines.push(`${where(cadence, phase)}: ${String(head.length)} needs_input tick(s) from +${(head[0] ?? 0).toFixed(1)}`);
    }
    process.stdout.write(`[p328 questions] ${lines.length === 0 ? 'no needs_input at either build' : lines.join(' | ')}\n`);
  });
});

// ---------------------------------------------------------------------------
// His words under the writes: needs_input exactly where the parent had it
// ---------------------------------------------------------------------------

describe('his numbered words in the resting input box, under the recorded writes', () => {
  const words = typedInto(REST, /^>/, HIS_WORDS);
  /** The resting screen with the first `n` characters of his words in its input box. */
  const partly = (n: number): string => {
    let left = n;
    const lines: string[] = [];
    for (const w of HIS_WORDS) {
      if (left <= 0) break;
      lines.push(w.slice(0, left));
      left -= w.length;
    }
    return lines.length === 0 ? REST : typedInto(REST, /^>/, lines);
  };
  const total = HIS_WORDS.join('').length;

  /** Typed from `from`, one key every 150 ms; or pasted at `from`, one write. */
  function withWords(from: number, typed: boolean): Input {
    const keys = typed ? Array.from({ length: total }, (_, i) => Math.round((from + i * 0.15) * 1000) / 1000) : [from];
    const writes = [...TL.writes.seconds, ...keys].sort((a, b) => a - b);
    return timelineInput({
      writes,
      screenAt: (s) => {
        if (s < from) return timelineInput().screenAt(s);
        if (!typed) return words;
        const n = keys.filter((k) => k <= s).length;
        return n >= total ? words : partly(n);
      },
      end: Math.min(END, from + 90)
    });
  }

  for (const [how, typed] of [['typed key by key', true], ['pasted in one write', false]] as const) {
    it(`${how}, at 1 s and 2 s over ten phases: HEAD's needs_input ticks are the parent's`, () => {
      // At +300 s, and at +330 s: more than 60 s after the session last worked,
      // the one-write class Phase 319 was parked for.
      for (const from of [300, 330]) {
        for (const { cadence, phase, ticks } of everyRun(withWords(from, typed))) {
          const head = ticks.filter((t) => t.head === 'needs_input').map((t) => t.s);
          const parent = ticks.filter((t) => t.parent === 'needs_input').map((t) => t.s);
          expect(head, `from +${String(from)}, ${where(cadence, phase)}`).toEqual(parent);
          expect(invariantBreaks(ticks, cadence, phase).slice(0, 3), `from +${String(from)}`).toEqual([]);
        }
      }
      // The words are a question to the parent's own detector: this row would
      // prove nothing if they were not.
      expect(pDetectDialog(words)).toBe(true);
    });
  }
});

// ---------------------------------------------------------------------------
// Clause B: a tool on a terminal of its own
// ---------------------------------------------------------------------------

describe('a tool on a terminal of its own reads as work', () => {
  const [toolFrom, toolTo] = TL.stretches.tool;
  /** The timeline with agy's CPU over the tool stretch held to `percent` of one core. */
  function toolAt(percent: number): Input {
    const base = timelineInput();
    const startCpu = base.sampleAt(toolFrom).cpu;
    return timelineInput({
      sampleAt: (s) => {
        const real = base.sampleAt(s);
        if (s < toolFrom) return real;
        const inStretch = Math.min(s, toolTo) - toolFrom;
        const after = s > toolTo ? real.cpu - base.sampleAt(toolTo).cpu : 0;
        return { cpu: startCpu + (inStretch * percent) / 100 + after, stats: real.stats };
      }
    });
  }
  const silent = (ticks: readonly Tick[]): Tick[] =>
    ticks.filter((t) => t.s >= TL.stretches.silentTool[0] && t.s <= TL.stretches.silentTool[1] - 2);

  it('the silent tool with agy’s CPU at 0, 1 and 4 percent reads running at HEAD on every tick, through clause B', () => {
    for (const percent of [0, 1, 4]) {
      for (const { cadence, phase, ticks } of everyRun(toolAt(percent))) {
        const off = silent(ticks).filter((t) => t.head !== 'working');
        expect(off.map((t) => `+${t.s.toFixed(1)} ${t.head}`), `${String(percent)}%, ${where(cadence, phase)}`).toEqual([]);
      }
    }
  });

  it('the same stretch at 0 percent reads idle once clause B is taken off the profile', () => {
    const without: AgentActivityProfile = { ...AGY, terminalTools: undefined };
    for (const { cadence, phase, ticks } of everyRun(toolAt(0), without)) {
      const idle = silent(ticks).filter((t) => t.head === 'idle').length;
      expect(idle, where(cadence, phase)).toBeGreaterThan(silent(ticks).length / 2);
    }
  });

  it('a terminal child left alive at rest reads running', () => {
    const base = timelineInput();
    const input = timelineInput({
      sampleAt: (s) => {
        const real = base.sampleAt(s);
        return s >= 400 && s < 460 ? { cpu: real.cpu, stats: [...real.stats, 'Ss+'] } : real;
      }
    });
    for (const { cadence, phase, ticks } of everyRun(input)) {
      const during = ticks.filter((t) => t.s >= 400 + cadence && t.s < 460);
      expect(during.filter((t) => t.head !== 'working').length, where(cadence, phase)).toBe(0);
      const after = ticks.filter((t) => t.s >= 470);
      expect(after.every((t) => t.head === 'idle'), `${where(cadence, phase)}: back to idle once it ended`).toBe(true);
    }
  });

  it('a numbered question drawn while a terminal tool is alive reads needs_input exactly as at the parent', () => {
    const question = SCREENS.get('a-antigravity-0030') ?? '';
    expect(pDetectDialog(question)).toBe(true);
    const base = timelineInput();
    const input = timelineInput({
      writes: [...TL.writes.seconds, 400].sort((a, b) => a - b),
      screenAt: (s) => (s >= 400 && s < 460 ? question : base.screenAt(s)),
      sampleAt: (s) => {
        const real = base.sampleAt(s);
        return s >= 395 && s < 470 ? { cpu: real.cpu, stats: [...real.stats, 'Ss+'] } : real;
      }
    });
    for (const { cadence, phase, ticks } of everyRun(input)) {
      const head = ticks.filter((t) => t.head === 'needs_input').map((t) => t.s);
      const parent = ticks.filter((t) => t.parent === 'needs_input').map((t) => t.s);
      expect(head, where(cadence, phase)).toEqual(parent);
    }
  });

  it('a tool started detached (Ss) reads running at both builds, as today for every agent', () => {
    const base = timelineInput();
    const input = timelineInput({
      sampleAt: (s) => {
        const real = base.sampleAt(s);
        return s >= 400 && s < 460 ? { cpu: real.cpu, stats: [...real.stats, 'Ss'] } : real;
      }
    });
    for (const { cadence, phase, ticks } of everyRun(input)) {
      const during = ticks.filter((t) => t.s >= 400 + cadence && t.s < 460);
      expect(during.every((t) => t.head === 'working' && t.parent === 'working'), where(cadence, phase)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Tortie's own hand, and the limit
// ---------------------------------------------------------------------------

describe('Tortie’s own hand and a version that draws at rest', () => {
  it('a resize of a resting antigravity session raises nothing at either build, and HEAD settles to idle', () => {
    for (const { cadence, phase, ticks } of everyRun(timelineInput({ resizes: [350, 420] }))) {
      const after = ticks.filter((t) => t.s >= 350);
      expect(after.some((t) => t.head === 'needs_input' || t.parent === 'needs_input'), where(cadence, phase)).toBe(false);
      expect(ticks.filter((t) => t.s >= 440).every((t) => t.head === 'idle'), where(cadence, phase)).toBe(true);
    }
  });

  it('STATED LIMIT: a version that draws a clock every second at rest reads running at both builds', () => {
    const clock = (s: number): string => `${REST}\n${String(Math.floor(s))}`;
    const writes = [...TL.writes.seconds, ...Array.from({ length: 200 }, (_, i) => 300 + i)].sort((a, b) => a - b);
    const input = timelineInput({ writes, screenAt: (s) => (s >= 300 ? clock(s) : timelineInput().screenAt(s)) });
    for (const { cadence, phase, ticks } of everyRun(input)) {
      const drawing = ticks.filter((t) => t.s >= 310 && t.s < 495);
      expect(drawing.every((t) => t.head === 'working' && t.parent === 'working'), where(cadence, phase)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// The same inputs p321-masking.test.ts drives every other row over (D328-6:
// antigravity leaves that file's tick-for-tick list, and is held here to the
// invariant over those same inputs instead)
// ---------------------------------------------------------------------------

describe('antigravity over p321-masking.test.ts’s own inputs: the invariant, tick for tick', () => {
  const FIXTURES = join(__dirname, 'fixtures');
  const fixture = (name: string): string => readFileSync(join(FIXTURES, name), 'utf8');
  const every = (from: number, to: number, step: number, offset = 0): number[] => {
    const out: number[] = [];
    for (let x = from + offset; x < to; x += step) out.push(Math.round(x * 1000) / 1000);
    return out;
  };
  /** agy as a child of the pane's shell, as p321-masking.test.ts's AGY_PROCS draws it. */
  const agyKids = (): Sample => ({ cpu: 0, stats: ['Ss', 'S+'] });
  const REPAINT = every(0, 400, 2.0, 0.3);
  const rest = restingWindow('a', 'antigravity');
  const inputs: Array<[string, Input]> = [];
  for (const file of [
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
  ]) {
    const q = fixture(file);
    const screenAt = (s: number): string => (s >= 10 && s < 40 ? q : rest);
    inputs.push([`${file}, quiet`, { writes: [1, 10], screenAt, sampleAt: agyKids, keys: [40], end: 52 }]);
    inputs.push([`${file}, under a 2.0 s repaint`, { writes: REPAINT, screenAt, sampleAt: agyKids, keys: [40], end: 52 }]);
  }
  {
    const grokRest = restingWindow('adv1', 'grok');
    const writes = every(0, 180, 0.15);
    const writtenBy = (s: number): number => writes.filter((w) => w <= s).length;
    inputs.push([
      'grok with its helpers',
      {
        writes,
        screenAt: (s) => `${grokRest}\n${'.'.repeat(writtenBy(s) % 97)}`,
        sampleAt: (s) => ({ cpu: 0, stats: ['Ss', 'S+', ...(s >= 6 ? Array(6).fill('Ss') : [])] }),
        keys: [],
        end: 240
      }
    ]);
  }
  {
    const words = typedInto(rest, /^>/, HIS_WORDS);
    inputs.push(['his numbered words under a repaint', { writes: REPAINT, screenAt: () => words, sampleAt: agyKids, keys: [], end: 120 }]);
  }

  it('every input at 1 s and 2 s over five phases', () => {
    for (const [name, input] of inputs) {
      for (const cadence of CADENCES) {
        for (const p of [0, 0.2, 0.4, 0.6, 0.8]) {
          const ticks = drive(input, cadence, p * cadence);
          expect(invariantBreaks(ticks, cadence, p * cadence).slice(0, 3), name).toEqual([]);
        }
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Every other row reads exactly what the parent read
// ---------------------------------------------------------------------------

describe('every other registry row, the shell and the floor read the parent over the same inputs', () => {
  const rows: Array<[string, AgentActivityProfile]> = [
    ['the shell', SHELL_ACTIVITY],
    ['an agent this build has never heard of', DEFAULT_ACTIVITY],
    ...AGENT_REGISTRY.filter((r) => r.activity !== undefined && r.id !== 'antigravity').map(
      (r): [string, AgentActivityProfile] => [r.id, r.activity as AgentActivityProfile]
    )
  ];
  const inputs: Array<[string, Input]> = [
    ['antigravity’s recorded turn', timelineInput()],
    ['a terminal child alive at rest', timelineInput({
      sampleAt: (s) => {
        const real = timelineInput().sampleAt(s);
        return s >= 400 && s < 460 ? { cpu: real.cpu, stats: [...real.stats, 'Ss+'] } : real;
      }
    })]
  ];
  for (const [id, profile] of rows) {
    it(`${id}`, () => {
      for (const [name, input] of inputs) {
        for (const cadence of CADENCES) {
          for (const p of [0, 0.3, 0.7]) {
            const ticks = drive(input, cadence, p * cadence, profile);
            expect(ticks.map((t) => t.head), `${name}, ${where(cadence, p * cadence)}`).toEqual(ticks.map((t) => t.parent));
          }
        }
      }
    });
  }
});
