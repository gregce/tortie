/**
 * PHASE 325.1 — Tortie knows his own words by what he typed, not by when
 * (build/p3251/SPEC.md §2, §4.3 and §4.8; D3251-6; the Phase 325.1 entry in
 * docs/BACKLOG.md).
 *
 * The SHIPPING state machine on a virtual clock, one session at a time, in the
 * monitor's own per-tick order: the native verdict, `worthProbing`, the process
 * table and a capture for a session inside its probe window (and a capture for
 * a blocked one), the foreground read for a row that lists a shape, then
 * `inferredVerdict` and `commitVerdict`; tmux's whole-second activity stamp;
 * and the renderer's release of a raised question by his key. Every scene runs
 * twice on the same clock, FED (his bytes and a restore's replay handed to the
 * session's record, as the attach host's tap, the phone and the restore hand
 * them) and UNFED (nothing handed). Unfed is the parent's reading by
 * construction: an empty record holds no line, so the rule answers false and
 * the verdict is the parent's line for line.
 *
 * What it holds, the spec step's measurements (§2) in order:
 *
 *   - SET A: his dialog-shaped words typed and pasted into the input row of
 *     every committed idle window that draws one, per agent, never read needs
 *     input fed, where unfed reads 3,660 of 4,740 cells; and (his second ruled
 *     round, 2026-11-16) the same with a blank line between his lines, typed,
 *     pasted and with Alt-Enter, where unfed reads 6,570 of 7,110;
 *   - SET B: every recorded question, drawn 0.2, 0.5, 1, 2 and 5 s after his
 *     last key, reads fed exactly as unfed, tick for tick: a real question is
 *     never held by timing, nor by his words;
 *   - SET C: the attack rows of §2.4, each with its expectation, the stated
 *     limit (C11) and the forgotten edit (C8b) asserted equal to the parent;
 *     the fix round's rows, being lines erased with the keys the record now
 *     reads, a question's own sentence in his draft, one line spelling a
 *     question's rows joined, and lines the phone's paste and message sent;
 *     and (his ruled round, which raises C3c and the fix round's last-option
 *     residual) copies of a question in his draft, after a line of his or as
 *     two of its rows, raised, and his words behind bash's lettered prompt
 *     read as the parent reads them;
 *   - SET D: 353's trade scene, raised in every cell;
 *   - THE SHIPPING MONITOR: a replayed screen noted before the first tick,
 *     his words in a seventh session while six are blocked, and the per-tick
 *     driver agreeing with the class tick for tick.
 *
 * Every existing row of the activity suite is unchanged: the rule sits beside
 * the dialog line and an empty record changes nothing. `npm run ablation:p3251`
 * breaks the shipping source one clause at a time and requires the row named
 * for that clause here to go red.
 *
 * The words he types here are the spec's own made-up texts, and every screen is
 * a committed redacted capture (build/fixtures/questions/, the activity
 * fixtures).
 */

import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import type { SessionStatus } from '@shared/types';
import { activityProfileFor, type AgentActivityProfile } from '../../agents/registry';
import { SessionActivityMonitor, type ActivitySession } from '../monitor';
import { noteOwnWordsOn, noteReplayedOn } from '../own-words';
import type { PaneFacts } from '../panes';
import { parseProcTable, type ProcSnapshot } from '../process';
import { detectDialogRows, detectShapes, normalizeCapture } from '../screen';
import {
  commitVerdict,
  foregroundToRead,
  freshState,
  inferredVerdict,
  nativeVerdict,
  noteForeground,
  worthProbing,
  type ClaudeLookup
} from '../state-machine';
import type { ActivityState } from '../types';

// ---------------------------------------------------------------------------
// The committed windows and questions
// ---------------------------------------------------------------------------

const REPO = join(__dirname, '..', '..', '..', '..');
const QUESTIONS = join(REPO, 'build', 'fixtures', 'questions');
const FIXTURES = join(__dirname, 'fixtures');
const fixture = (name: string): string => readFileSync(join(FIXTURES, name), 'utf8').replace(/\n+$/, '');

interface Window {
  file: string;
  agent: string;
  id: string;
  label: string;
  rows: string[];
}

const WINDOWS: Window[] = readdirSync(QUESTIONS)
  .filter((f) => f.endsWith('.jsonl'))
  .sort()
  .flatMap((file) => {
    const agent = file.replace(/\.jsonl$/, '').split('-').slice(1).join('-');
    return readFileSync(join(QUESTIONS, file), 'utf8')
      .split('\n')
      .filter((l) => l.trim() !== '')
      .map((l) => JSON.parse(l) as { id: string; label: string; rows: string[] })
      .map((w) => ({ file, agent, id: w.id, label: w.label, rows: w.rows.map((r) => r.replace(/\s+$/, '')) }));
  });
const windowRows = (id: string): string[] => WINDOWS.find((w) => w.id === id)?.rows ?? [];
const windowOf = (id: string): string => windowRows(id).join('\n');

interface Labels {
  instances: Array<{ recording: string; question: string; drawn: number; answered: number; raisable: boolean }>;
  windows: Record<string, { label: string; instance?: number; first: number }>;
}
const LABELS = JSON.parse(readFileSync(join(QUESTIONS, 'labels.json'), 'utf8')) as Labels;

/** The parent's numbered verdict over a screen, as the state machine normalizes it. */
const parentReads = (screen: string): boolean => detectDialogRows(normalizeCapture(screen)).atChoice;

// ---------------------------------------------------------------------------
// Each agent's own input row, read off its committed windows
// ---------------------------------------------------------------------------

interface InputRow {
  index: number;
  prefix: string;
}

const VERTICALS = /[│┃║▌▏|]/;

/** The last inked row near the bottom matching `re`, its first group the mark. */
function lastRow(rows: readonly string[], re: RegExp, pad = ''): InputRow | null {
  let inked = rows.length;
  while (inked > 0 && (rows[inked - 1] ?? '').trim() === '') inked -= 1;
  for (let i = inked - 1; i >= Math.max(0, inked - 8); i -= 1) {
    const m = re.exec(rows[i] ?? '');
    if (m !== null) return { index: i, prefix: `${m[1] ?? ''}${pad}` };
  }
  return null;
}

/** Inked rows above the end of a window. */
function inkedEnd(rows: readonly string[]): number {
  let inked = rows.length;
  while (inked > 0 && (rows[inked - 1] ?? '').trim() === '') inked -= 1;
  return inked;
}

const INPUT_ROW: Record<string, (rows: readonly string[]) => InputRow | null> = {
  antigravity: (rows) => lastRow(rows, /^(>)\s*$/, ' '),
  claude: (rows) => lastRow(rows, /^(❯)\s*$/, ' '),
  codex: (rows) => lastRow(rows, /^(›) /, ' '),
  cursor: (rows) => lastRow(rows, /^(\s*→ )/),
  gemini: (rows) => lastRow(rows, /^(\s*>)\s/, ' '),
  grok: (rows) => lastRow(rows, /^(\s*│ ❯)/, ' '),
  qwen: (rows) => lastRow(rows, /^(>)\s+/, ' '),
  omp: (rows) => lastRow(rows, /^(╰─)\s*$/, ' '),
  opencode: (rows) => {
    const inked = inkedEnd(rows);
    for (let i = inked - 1; i >= Math.max(1, inked - 8); i -= 1) {
      if (!/^\s*╹/.test(rows[i] ?? '')) continue;
      let top = i;
      while (top - 1 >= 0 && /^\s*┃/.test(rows[top - 1] ?? '')) top -= 1;
      if (top === i) return null;
      const m = /^(\s*┃\s{2})/.exec((rows[top] ?? '').padEnd(8));
      return m === null ? null : { index: top, prefix: m[1] ?? '' };
    }
    return null;
  },
  pi: (rows) => {
    const inked = inkedEnd(rows);
    for (let i = inked - 2; i >= Math.max(1, inked - 8); i -= 1) {
      const rule = (r: string | undefined): boolean => /^─{20,}\s*$/.test(r ?? '');
      if (rule(rows[i - 1]) && (rows[i] ?? '').trim() === '' && rule(rows[i + 1])) return { index: i, prefix: '' };
    }
    return null;
  },
  shell: (rows) => lastRow(rows, /^(bash-5\.2\$)\s*$/, ' ')
};

/** The screen with `typed` in the agent's input row, each line after the first under the mark's width, wrapped at `width` when given. */
function compose(agent: string, rows: readonly string[], typed: string, width = 0): string {
  const at = INPUT_ROW[agent]?.(rows) ?? null;
  if (at === null || typed.length === 0) return rows.join('\n');
  const cont = [...at.prefix].map((ch) => (VERTICALS.test(ch) ? ch : ' ')).join('');
  const out: string[] = [];
  typed.split('\n').forEach((t, i) => {
    const head = i === 0 ? at.prefix : cont;
    if (width <= 0 || head.length + t.length <= width) {
      out.push(`${head}${t}`);
      return;
    }
    let rest = t;
    let first = true;
    while (rest.length > 0) {
      const room = width - (first ? head.length : cont.length);
      out.push(`${first ? head : cont}${rest.slice(0, room)}`);
      rest = rest.slice(room);
      first = false;
    }
  });
  return [...rows.slice(0, at.index), ...out, ...rows.slice(at.index + 1)].join('\n');
}

/** The spec's texts (§2.1, §2.2): every one made up. */
const MIN = '1. to cancel\n2. x';
const LONG = 'Do you want me to proceed?\n1. Yes, go ahead\n2. No, stop';
const REAL = 'Two ways to do this:\n1. keep the cache\n2. drop it\nWould you like me to pick one?';
const ORDINARY = 'please look at the tests';
/** His second ruled round's texts: a blank line between his lines, between his options, before them, and twice. */
const GAP_MID = '1. to cancel\n\n2. x';
const GAP_LONG = 'Do you want me to proceed?\n\n1. Yes, go ahead\n2. No, stop';
const GAP_REAL = 'Two ways to do this:\n\n1. keep the cache\n2. drop it\n\nWould you like me to pick one?';
const BASH_WINDOW = ['bash-5.2$ ls', 'README.md  src', 'bash-5.2$'];
const ESC = '\u001b';

// ---------------------------------------------------------------------------
// A scene, and its run on the shipping state machine
// ---------------------------------------------------------------------------

type Event =
  | { at: number; kind: 'key'; chunk: string; screen?: string }
  | { at: number; kind: 'draw'; screen: string }
  | { at: number; kind: 'write' }
  | { at: number; kind: 'command'; command: string }
  | { at: number; kind: 'replay'; tail: string }
  | { at: number; kind: 'hook'; state: ActivityState };

interface Scene {
  agent: string;
  profile?: AgentActivityProfile;
  command: string;
  screen: string;
  end: number;
  events: Event[];
  /** The command line the foreground read names; the agent's id by default. */
  argv?: string;
}

const T0 = 1_800_000_000_000;
const PANE_PID = 1000;
const ms = (s: number): number => T0 + Math.round(s * 1000);
const NO_CLAUDE: ClaudeLookup = { forPane: () => undefined, unmapped: () => [] };
const TABLE: ProcSnapshot = parseProcTable(`${String(PANE_PID)} 1 0:00.10 Ss+`, T0);

interface Run {
  at: number[];
  states: ActivityState[];
}

/**
 * One scene, one cadence, one tick phase. FED hands his bytes and a restore's
 * replay to the session's record, as the monitor's `noteOwnWords` and
 * `noteReplayedScreen` do; unfed hands nothing.
 */
function run(scene: Scene, fed: boolean, cadence: number, phase: number): Run {
  const profile = scene.profile ?? activityProfileFor(scene.agent);
  const st = freshState(T0);
  let screen = scene.screen;
  let command = scene.command;
  let written = 0;
  const events = [...scene.events].sort((a, b) => a.at - b.at);
  let next = 0;
  const out: Run = { at: [], states: [] };
  const pane = (): PaneFacts => ({
    tmuxId: '$1',
    paneId: '%1',
    panePid: PANE_PID,
    active: true,
    dead: false,
    activityAt: T0 + Math.floor(written) * 1000,
    currentCommand: command,
    keypad: false,
    alternate: false,
    inMode: false,
    historySize: 0,
    historyLimit: 25_000,
    title: ''
  });
  for (let s = phase; s <= scene.end + 1e-9; s = Math.round((s + cadence) * 1000) / 1000) {
    while (next < events.length && (events[next]?.at ?? Infinity) <= s) {
      const e = events[next] as Event;
      next += 1;
      const now = ms(e.at);
      if (e.kind === 'key') {
        if (fed) noteOwnWordsOn(st.ownWords, e.chunk);
        // The renderer's gate, as today: the release only while its row reads needs_input.
        if (st.state === 'needs_input') {
          st.dialogTicks = 0;
          st.clearTicks = 0;
          commitVerdict(st, { state: 'working', tier: 'native' }, now);
        }
        if (e.screen !== undefined) screen = e.screen;
        written = e.at;
      } else if (e.kind === 'draw') {
        screen = e.screen;
        written = e.at;
      } else if (e.kind === 'write') {
        written = e.at;
      } else if (e.kind === 'command') {
        command = e.command;
      } else if (e.kind === 'replay') {
        if (fed) noteReplayedOn(st.ownWords, e.tail);
      } else {
        commitVerdict(st, { state: e.state, tier: 'native' }, now);
      }
    }
    const now = ms(s);
    const p = pane();
    const probe = nativeVerdict(p, profile, st, '/work', NO_CLAUDE, null) === null && worthProbing(profile, st, now);
    const proc = probe ? TABLE : null;
    const captured = probe || st.state === 'needs_input';
    if (proc !== null && captured) {
      const pid = foregroundToRead(p, profile, st, proc);
      if (pid !== null) noteForeground(st, p, pid, scene.argv ?? scene.agent, scene.agent);
    }
    const ctx = { now, proc, ...(captured ? { capture: screen } : {}) };
    const v = nativeVerdict(p, profile, st, '/work', NO_CLAUDE, proc) ?? inferredVerdict(p, profile, st, ctx);
    if (v !== null) commitVerdict(st, v, now);
    out.at.push(s);
    out.states.push(st.state);
  }
  return out;
}

const PHASES = Array.from({ length: 10 }, (_, i) => i / 10);
const CADENCES = [1, 2];

/** Ten tick phases at 1 s and at 2 s: twenty runs a cell, fed and unfed on one clock. */
function everyRun(scene: Scene): Array<{ where: string; fed: Run; unfed: Run }> {
  const out: Array<{ where: string; fed: Run; unfed: Run }> = [];
  for (const cadence of CADENCES) {
    for (const p of PHASES) {
      const phase = p * cadence;
      out.push({ where: `${String(cadence)} s, phase ${String(phase)}`, fed: run(scene, true, cadence, phase), unfed: run(scene, false, cadence, phase) });
    }
  }
  return out;
}

/** Ticks in [from, to) that read needs_input. */
const amber = (r: Run, from = -Infinity, to = Infinity): number[] =>
  r.at.filter((s, i) => s >= from && s < to && r.states[i] === 'needs_input');

/** His text typed key by key into the agent's input row, a key every `every` seconds. */
function typing(agent: string, base: readonly string[], at: number, text: string, every = 0.12, newline = '\n', width = 0): Event[] {
  const out: Event[] = [];
  let typed = '';
  let t = at;
  for (const ch of text) {
    typed += ch;
    out.push({ at: Math.round(t * 1000) / 1000, kind: 'key', chunk: ch === '\n' ? newline : ch, screen: compose(agent, base, typed, width) });
    t += every;
  }
  return out;
}

/** His text pasted in one message, exactly as xterm brackets a desk paste. */
function pasting(agent: string, base: readonly string[], at: number, text: string, width = 0): Event {
  return { at, kind: 'key', chunk: `${ESC}[200~${text.replace(/\n/g, '\r')}${ESC}[201~`, screen: compose(agent, base, text, width) };
}

const lastAt = (events: readonly Event[]): number => events.reduce((n, e) => Math.max(n, e.at), 0);

/** How many of the twenty runs read needs_input inside [from, to), fed and unfed. */
function cells(scene: Scene, from = -Infinity, to = Infinity): { fed: number; unfed: number; runs: number } {
  let fed = 0;
  let unfed = 0;
  let runs = 0;
  for (const r of everyRun(scene)) {
    runs += 1;
    if (amber(r.fed, from, to).length > 0) fed += 1;
    if (amber(r.unfed, from, to).length > 0) unfed += 1;
  }
  return { fed, unfed, runs };
}

// ---------------------------------------------------------------------------
// SET A — his words, per agent (§2.1, M1)
// ---------------------------------------------------------------------------

describe('set A: his words over every committed idle window (§2.1)', () => {
  const idle = WINDOWS.filter((w) => w.label === 'not-question' && INPUT_ROW[w.agent]?.(w.rows) !== null);

  it('his words over every committed idle window never read needs input', () => {
    const per = new Map<string, { windows: number; cells: number; fed: number; unfed: number; ownScreen: number }>();
    idle.forEach((w, n) => {
      const a = per.get(w.agent) ?? { windows: 0, cells: 0, fed: 0, unfed: 0, ownScreen: 0 };
      per.set(w.agent, a);
      a.windows += 1;
      // A window already a question by itself proves nothing about his words.
      if (parentReads(w.rows.join('\n'))) {
        a.ownScreen += 1;
        return;
      }
      for (const typed of [true, false]) {
        for (const cadence of CADENCES) {
          const phase = ((n % 10) / 10) * cadence;
          const events = typed ? typing(w.agent, w.rows, 10, MIN) : [pasting(w.agent, w.rows, 10, MIN)];
          const scene: Scene = { agent: w.agent, command: w.agent, screen: w.rows.join('\n'), end: lastAt(events) + 15, events };
          a.cells += 1;
          const fed = run(scene, true, cadence, phase);
          if (amber(fed).length > 0) a.fed += 1;
          if (amber(run(scene, false, cadence, phase)).length > 0) a.unfed += 1;
          expect(amber(fed), `${w.id} ${typed ? 'typed' : 'pasted'} at ${String(cadence)} s`).toEqual([]);
        }
      }
    });
    let cellsAll = 0;
    let unfedAll = 0;
    for (const [agent, a] of [...per].sort()) {
      cellsAll += a.cells;
      unfedAll += a.unfed;
      process.stdout.write(
        `[p3251 A] ${agent}: ${String(a.windows)} windows, ${String(a.cells)} cells, parent ${String(a.unfed)}, HEAD ${String(a.fed)}` +
          `${a.ownScreen > 0 ? ` (${String(a.ownScreen)} already a question, left out)` : ''}\n`
      );
    }
    process.stdout.write(`[p3251 A] all: ${String(cellsAll)} cells, parent ${String(unfedAll)}, HEAD 0\n`);
    // The row proves something only while the parent reads the fault.
    expect(unfedAll).toBeGreaterThanOrEqual(cellsAll / 2);
    expect(cellsAll).toBe(4_740);
    expect(unfedAll).toBe(3_660);
  }, 600_000);

  // HIS SECOND RULED ROUND (2026-11-16, "325.1 a"): "Tortie will count a blank
  // line inside your draft as part of your typing". The round before read every
  // one of these cells grey and his ruled round's block turned them amber again,
  // pi's and opencode's among them (the reverify's 18,896 cells).
  it('his words with a blank line between them over every committed idle window never read needs input', () => {
    const per = new Map<string, { cells: number; fed: number; unfed: number }>();
    const ways: ReadonlyArray<[name: string, text: string, events: (w: Window) => Event[]]> = [
      ['typed', GAP_MID, (w) => typing(w.agent, w.rows, 10, GAP_MID)],
      ['pasted', GAP_LONG, (w) => [pasting(w.agent, w.rows, 10, GAP_LONG)]],
      ['alt-enter', GAP_REAL, (w) => typing(w.agent, w.rows, 10, GAP_REAL, 0.12, `${ESC}\r`)]
    ];
    idle.forEach((w, n) => {
      if (parentReads(w.rows.join('\n'))) return;
      const a = per.get(w.agent) ?? { cells: 0, fed: 0, unfed: 0 };
      per.set(w.agent, a);
      for (const [how, , eventsOf] of ways) {
        for (const cadence of CADENCES) {
          const phase = ((n % 10) / 10) * cadence;
          const events = eventsOf(w);
          const scene: Scene = { agent: w.agent, command: w.agent, screen: w.rows.join('\n'), end: lastAt(events) + 15, events };
          a.cells += 1;
          const fed = run(scene, true, cadence, phase);
          if (amber(fed).length > 0) a.fed += 1;
          if (amber(run(scene, false, cadence, phase)).length > 0) a.unfed += 1;
          expect(amber(fed), `${w.id} ${how} at ${String(cadence)} s`).toEqual([]);
        }
      }
    });
    let cellsAll = 0;
    let unfedAll = 0;
    for (const [agent, a] of [...per].sort()) {
      cellsAll += a.cells;
      unfedAll += a.unfed;
      process.stdout.write(`[p3251 A blank] ${agent}: ${String(a.cells)} cells, parent ${String(a.unfed)}, HEAD ${String(a.fed)}\n`);
    }
    process.stdout.write(`[p3251 A blank] all: ${String(cellsAll)} cells, parent ${String(unfedAll)}, HEAD 0\n`);
    // The row proves something only while the parent reads the fault, pi and opencode among it.
    expect(unfedAll).toBeGreaterThanOrEqual(cellsAll / 2);
    for (const agent of ['pi', 'opencode']) expect(per.get(agent)?.unfed ?? 0, agent).toBeGreaterThan(0);
    expect(cellsAll).toBe(7_110);
    expect(unfedAll).toBe(6_570);
  }, 600_000);

  it('the resting window of every recording and a bash prompt, three texts typed, typed with Alt-Enter and pasted: never needs input, but behind bash’s lettered prompt, where it reads as the parent', () => {
    const rest = [...new Map(idle.map((w) => [w.file, w])).values()].filter((w) => !parentReads(w.rows.join('\n')));
    rest.push({ file: 'bash', agent: 'shell', id: 'bash', label: 'not-question', rows: BASH_WINDOW });
    let parentCells = 0;
    let all = 0;
    let asParent = 0;
    for (const w of rest) {
      for (const [name, text] of [['min', MIN], ['long', LONG], ['real', REAL]] as const) {
        for (const how of ['typed', 'alt-enter', 'pasted'] as const) {
          const events =
            how === 'pasted' ? [pasting(w.agent, w.rows, 10, text)] : typing(w.agent, w.rows, 10, text, 0.12, how === 'typed' ? '\n' : `${ESC}\r`);
          const scene: Scene = { agent: w.agent, command: w.agent === 'shell' ? 'bash' : w.agent, screen: w.rows.join('\n'), end: lastAt(events) + 15, events };
          const c = cells(scene);
          all += 1;
          if (c.unfed === c.runs) parentCells += 1;
          // His ruled round: at bash's prompt his first line is drawn behind
          // `bash-5.2$`, a prompt that holds letters, so no block of his starts
          // there and his longer texts read exactly as the parent reads them.
          if (w.agent === 'shell' && name !== 'min') {
            asParent += 1;
            asTheParent(scene);
            continue;
          }
          expect(c.fed, `${w.id} ${name} ${how}`).toBe(0);
        }
      }
    }
    process.stdout.write(
      `[p3251 A rest] ${String(all)} cells of 20 runs, the parent amber in all 20 in ${String(parentCells)}, HEAD in none but the ${String(asParent)} at bash's lettered prompt, which read as the parent\n`
    );
    expect(asParent).toBe(6);
    expect(parentCells).toBeGreaterThanOrEqual(all / 2);
  }, 600_000);
});

// ---------------------------------------------------------------------------
// SET B — every recorded question, drawn d s after his last key (§2.2, M2)
// ---------------------------------------------------------------------------

describe('set B: every recorded question drawn after his last key (§2.2)', () => {
  it('every recorded question drawn 0.2, 0.5 and 1 s after his last key is raised as with no record', () => {
    let compared = 0;
    LABELS.instances.forEach((inst, k) => {
      if (!inst.raisable) return;
      const recording = inst.recording.replace('/', '-');
      const agent = recording.split('-').slice(1).join('-');
      const ids = Object.entries(LABELS.windows)
        .filter(([id]) => id.startsWith(`${recording}-`))
        .sort((a, b) => a[1].first - b[1].first);
      const asked = ids.filter(([, v]) => v.label === 'question' && v.instance === k);
      if (asked.length === 0) return;
      const firstAsked = ids.findIndex(([id]) => id === asked[0]?.[0]);
      const before = firstAsked > 0 ? (ids[firstAsked - 1]?.[0] ?? '') : '';
      const base = before === '' ? [''] : windowRows(before);
      for (const d of [0.2, 0.5, 1, 2, 5]) {
        const typed = typing(agent, base, 10, ORDINARY);
        const draw = lastAt(typed) + d;
        const events: Event[] = [...typed];
        for (const [id, v] of asked) events.push({ at: Math.round((draw + (v.first - inst.drawn)) * 1000) / 1000, kind: 'draw', screen: windowOf(id) });
        const answer = draw + (inst.answered - inst.drawn);
        const scene: Scene = { agent, command: agent, screen: base.join('\n'), end: answer - 0.01, events, argv: agent === 'claude' ? 'claude --session-id x' : agent };
        let raised = 0;
        for (const r of everyRun(scene)) {
          compared += 1;
          expect(r.fed.states, `${inst.recording} ${inst.question}, ${String(d)} s after his last key, ${r.where}`).toEqual(r.unfed.states);
          if (amber(r.fed, draw, answer).length > 0) raised += 1;
        }
        if (d === 0.2) process.stdout.write(`[p3251 B] ${inst.recording} ${inst.question}: raised ${String(raised)} of 20 at 0.2 s, fed exactly as unfed\n`);
      }
    });
    expect(compared).toBeGreaterThan(0);
  }, 600_000);
});

// ---------------------------------------------------------------------------
// SET C — the attack rows (§2.4, M4)
// ---------------------------------------------------------------------------

const AGY = windowRows('a-antigravity-0032');
const CLAUDE_REST = windowRows('a-claude-0122');
const CLAUDE_GATE = fixture('claude-workspace-trust.txt');
const AGY_PERMISSION = fixture('antigravity-run-permission.txt');
const GEMINI_GATE = windowOf('a-gemini-0002');
/** The rows of Claude's numbered trust gate a person would type. */
const GATE_ROWS = '1. Yes, I trust this folder\n2. No, exit\nEnter to confirm · Esc to cancel';

/** His words pasted into the agent's resting screen, then the scene ends 15 s after its last event. */
function wordsScene(agent: string, rows: readonly string[], text: string, extra: Event[] = []): Scene {
  const events = [pasting(agent, rows, 10, text), ...extra];
  return { agent, command: agent, screen: rows.join('\n'), end: lastAt(events) + 15, events };
}

/** Each chunk at its own time, the screen after it composed into the input row. */
function steps(agent: string, base: readonly string[], at: number, list: ReadonlyArray<[chunk: string, after: string]>): Event[] {
  return list.map(([chunk, after], i): Event => ({ at: Math.round((at + i * 0.12) * 1000) / 1000, kind: 'key', chunk, screen: compose(agent, base, after) }));
}

/** Raised in every one of the twenty runs, fed and unfed. */
function raisedEverywhere(scene: Scene, from: number, to = Infinity): void {
  const c = cells(scene, from, to);
  expect(c.unfed, 'the parent raises it').toBe(c.runs);
  expect(c.fed, 'raised with his words in the record').toBe(c.runs);
}

/** Never needs input fed, in any of the twenty runs, where the parent reads the fault in every one. */
function greyWhereTheParentIsAmber(scene: Scene, from = -Infinity, to = Infinity): void {
  const c = cells(scene, from, to);
  expect(c.unfed, 'the parent reads his words as a question').toBe(c.runs);
  expect(c.fed, 'never needs input with his words in the record').toBe(0);
}

/** The stated limits: fed reads exactly as unfed, tick for tick. */
function asTheParent(scene: Scene): void {
  for (const r of everyRun(scene)) expect(r.fed.states, r.where).toEqual(r.unfed.states);
}

describe('set C: the attack rows (§2.4)', { timeout: 300_000 }, () => {
  it('C1 his unsent line equal to a row the question does not need: raised', () => {
    raisedEverywhere(wordsScene('antigravity', AGY, '4. No, cancel', [{ at: 20, kind: 'draw', screen: AGY_PERMISSION }]), 20);
  });

  it('C1b his unsent line equal to the only OPT1 row of Claude’s numbered trust gate: raised, its other rows below it (the fix round)', () => {
    raisedEverywhere({ ...wordsScene('claude', CLAUDE_REST, '1. Yes, I trust this folder', [{ at: 20, kind: 'draw', screen: CLAUDE_GATE }]), argv: 'claude' }, 20);
  });

  it('C1c his unsent line equal to the gate’s own hint line, at its bottom and led by no prompt: raised (the fix round)', () => {
    raisedEverywhere({ ...wordsScene('claude', CLAUDE_REST, 'Enter to confirm · Esc to cancel', [{ at: 20, kind: 'draw', screen: CLAUDE_GATE }]), argv: 'claude' }, 20);
  });

  // THE RESIDUAL (Q1) since the fix round, and no committed question has it: a
  // question whose last option is the lowest row it draws, his unsent line that
  // option word for word. Synthetic, the attack's own question with its hint
  // left off; the agent puts it up in place of its input row.
  const NO_HINT = [...CLAUDE_REST.slice(0, -4), 'Do you want me to run them now?', '❯ 1. Yes, run them', '  2. No, not now'].join('\n');

  it('the fix round’s residual (Q1), his unsent line word for word a question’s last option with nothing of it below: raised since his ruled round', () => {
    expect(parentReads(NO_HINT)).toBe(true);
    const scene: Scene = { ...wordsScene('claude', CLAUDE_REST, '2. No, not now', [{ at: 20, kind: 'draw', screen: NO_HINT }]), argv: 'claude' };
    raisedEverywhere(scene, 20);
  });

  // THE FIX ROUND, the verify lenses' attacks: a line erased with a key the
  // record now reads, a real question's sentence in his draft, one line
  // spelling a question's rows joined, and a line the phone's paste sent.
  const ERASERS: ReadonlyArray<[name: string, bytes: string]> = [
    ['Ctrl-U', '\u0015'],
    ['Ctrl-W, word by word', '\u0017'.repeat(4)],
    ['Ctrl-A then Ctrl-K', '\u0001\u000b'],
    ['Up', `${ESC}[A`],
    ['Down', `${ESC}[B`],
    ['Esc Esc', `${ESC}${ESC}`]
  ];

  // His ruled round: the one shape his rule still holds, a draft that is from
  // its first line a gap-free copy of a question's options down to its bottom,
  // so each key that drops or sends it is the only thing that raises it.
  const BOTH_OPTIONS = '1. Yes, run them\n2. No, not now';

  it('a line erased with Ctrl-U, Ctrl-W, Ctrl-A and Ctrl-K, Up, Down or Esc Esc, then a real question with that line its lowest row: raised as the parent raises it', () => {
    for (const draft of ['2. No, not now', BOTH_OPTIONS]) {
      for (const [name, bytes] of ERASERS) {
        const rest = CLAUDE_REST.join('\n');
        const scene: Scene = {
          ...wordsScene('claude', CLAUDE_REST, draft, [
            { at: 14, kind: 'key', chunk: bytes, screen: rest },
            { at: 30, kind: 'draw', screen: NO_HINT }
          ]),
          argv: 'claude'
        };
        const c = cells(scene, 30);
        expect(c.unfed, `${draft}: ${name}`).toBe(c.runs);
        expect(c.fed, `${draft}: ${name}: raised with the erased line in no record`).toBe(c.runs);
      }
    }
    // And the same draft kept: the residual (Q1), held, which is what each key above clears.
    const kept: Scene = { ...wordsScene('claude', CLAUDE_REST, BOTH_OPTIONS, [{ at: 30, kind: 'draw', screen: NO_HINT }]), argv: 'claude' };
    expect(cells(kept, 30).fed).toBe(0);
  });

  it('his typed-ahead draft holding a question’s own sentence on a line of its own, then that question: raised (the attack’s RQ1)', () => {
    const permission = [' Bash command', '   rm -rf build', ' Do you want to proceed?', ' ❯ 1. Yes', '   2. Yes, and do not ask again for rm commands', '   3. No, and tell me what to do differently (esc)'];
    expect(parentReads(permission.join('\n'))).toBe(true);
    const draft = 'Add a confirmation step that prints\nDo you want to proceed?\nand waits for y or n';
    const drawn = [...permission, '', ...compose('claude', CLAUDE_REST.slice(-4), draft).split('\n')].join('\n');
    raisedEverywhere({ ...wordsScene('claude', CLAUDE_REST, draft, [{ at: 20, kind: 'draw', screen: drawn }]), argv: 'claude' }, 20);
  });

  it('one unsent line spelling a question’s sentence and both its options joined, then that question: raised (the attack’s Q7)', () => {
    const question = ['Do you want me to run them now?', '❯ 1. Yes, run them', '  2. No, not now'];
    const line = 'Do you want me to run them now? 1. Yes, run them 2. No, not now';
    raisedEverywhere({ ...wordsScene('claude', CLAUDE_REST, line, [{ at: 20, kind: 'draw', screen: [...CLAUDE_REST.slice(0, -4), ...question].join('\n') }]), argv: 'claude' }, 20);
  });

  it('a line the phone pasted and its newline sent, then a question with it as its lowest row: raised (the attack’s PP2)', () => {
    // What src/main/screen/paste.ts hands the record now: every line break a
    // carriage return, as a program that asked for no brackets takes the paste.
    const scene: Scene = {
      agent: 'claude',
      command: 'claude',
      argv: 'claude',
      screen: CLAUDE_REST.join('\n'),
      end: 45,
      events: [
        { at: 10, kind: 'key', chunk: '2. No, not now\r', screen: CLAUDE_REST.join('\n') },
        { at: 20, kind: 'draw', screen: NO_HINT }
      ]
    };
    raisedEverywhere(scene, 20);
  });

  it('a line the phone’s message sent with its Enter, then a question with it as its lowest row: raised (the attack’s Y2)', () => {
    // His desk draft, then the message's closing Enter, which the reply writer
    // hands the record alone (src/main/reply/writer.ts, the fix round).
    const rest = CLAUDE_REST.join('\n');
    const scene: Scene = {
      ...wordsScene('claude', CLAUDE_REST, '2. No, not now', [
        { at: 14, kind: 'key', chunk: '\r', screen: rest },
        { at: 20, kind: 'draw', screen: NO_HINT }
      ]),
      argv: 'claude'
    };
    raisedEverywhere(scene, 20);
  });

  it('C2 his unsent line a substring of that row: raised', () => {
    raisedEverywhere({ ...wordsScene('claude', CLAUDE_REST, 'Yes, I trust', [{ at: 20, kind: 'draw', screen: CLAUDE_GATE }]), argv: 'claude' }, 20);
  });

  it('C2b his unsent line holding that whole row inside a longer line: raised', () => {
    raisedEverywhere({ ...wordsScene('claude', CLAUDE_REST, 'pick 1. Yes, I trust this folder please', [{ at: 20, kind: 'draw', screen: CLAUDE_GATE }]), argv: 'claude' }, 20);
  });

  it('his words sent, then the agent draws the same rows: raised', () => {
    const rest = CLAUDE_REST.join('\n');
    // His ruled round: and a draft the rule would hold were it kept (BOTH_OPTIONS).
    for (const [draft, question] of [[GATE_ROWS, CLAUDE_GATE], [BOTH_OPTIONS, NO_HINT]] as const) {
      const scene: Scene = {
        ...wordsScene('claude', CLAUDE_REST, draft, [
          { at: 14, kind: 'key', chunk: '\r', screen: rest },
          { at: 30, kind: 'draw', screen: question }
        ]),
        argv: 'claude'
      };
      raisedEverywhere(scene, 30);
    }
  });

  it('C3b the same, cleared with Ctrl-C: raised', () => {
    const rest = CLAUDE_REST.join('\n');
    for (const [draft, question] of [[GATE_ROWS, CLAUDE_GATE], [BOTH_OPTIONS, NO_HINT]] as const) {
      const scene: Scene = {
        ...wordsScene('claude', CLAUDE_REST, draft, [
          { at: 14, kind: 'key', chunk: '\u0003', screen: rest },
          { at: 30, kind: 'draw', screen: question }
        ]),
        argv: 'claude'
      };
      raisedEverywhere(scene, 30);
    }
  });

  it('C3c the same, not sent: raised since his ruled round, the gate’s own blank row breaking his copy of its rows in two', () => {
    const rest = CLAUDE_REST.join('\n');
    const scene: Scene = {
      ...wordsScene('claude', CLAUDE_REST, GATE_ROWS, [
        { at: 14, kind: 'draw', screen: rest },
        { at: 30, kind: 'draw', screen: CLAUDE_GATE }
      ]),
      argv: 'claude'
    };
    raisedEverywhere(scene, 30);
  });

  // HIS RULED ROUND (2026-11-14, "325.1 a"): the reverify's copies, through
  // the shipping state machine. Each agent's resting screen with an input row,
  // the copy put into it, then the question drawn in its place.
  const restOf = (agent: string): string[] =>
    WINDOWS.find((w) => w.agent === agent && w.label === 'not-question' && INPUT_ROW[agent]?.(w.rows) !== null && !parentReads(w.rows.join('\n')))?.rows ?? [];
  const replyRows = (name: string): string => {
    const text = readFileSync(join(REPO, 'build', 'fixtures', 'reply', name), 'utf8');
    return text.slice(text.indexOf('\n') + 1).replace(/\s+$/, '');
  };
  /** The inked rows of a question from the first that matches `from` to its end, as a person selects them. */
  const copyOf = (screen: string, from: RegExp): string => {
    const rows = screen.split('\n');
    return rows.slice(Math.max(0, rows.findIndex((r) => from.test(r)))).filter((r) => r.trim() !== '').map((r) => r.trim()).join('\n');
  };
  const COPIED: ReadonlyArray<[agent: string, question: string, from: RegExp]> = [
    ['claude', replyRows('claude-bash-2.1.287.txt'), /Do you want to proceed/],
    ['codex', replyRows('codex-approval-0.160.0.txt'), /Would you like to run/],
    ['gemini', GEMINI_GATE, /Do you trust/],
    ['antigravity', AGY_PERMISSION, /Run this command/],
    ['claude', CLAUDE_GATE, /Quick safety check/]
  ];

  it('his ruled round: a copy of a real question in his unsent draft after a line of his own, then that question: raised', () => {
    for (const [agent, question, from] of COPIED) {
      const rest = restOf(agent);
      expect(rest.length, agent).toBeGreaterThan(0);
      const scene: Scene = { ...wordsScene(agent, rest, `you asked me this:\n${copyOf(question, from)}\nwhy?`, [{ at: 20, kind: 'draw', screen: question }]), argv: agent };
      raisedEverywhere(scene, 20);
    }
  });

  it('his ruled round: two rows of a real question typed into his unsent draft, then that question: raised', () => {
    for (const [agent, question, rows] of [
      ['codex', replyRows('codex-approval-hidden-line-0.160.0.txt'), '1. Yes, proceed (y)\n2. No, and tell Codex what to do differently (esc)'],
      ['gemini', GEMINI_GATE, '1. Trust folder (xxxxxx)\n2. Trust parent folder (xxxx)'],
      ['claude', CLAUDE_GATE, '2. No, exit\nEnter to confirm · Esc to cancel']
    ] as const) {
      const rest = restOf(agent);
      const typed = typing(agent, rest, 10, rows);
      const scene: Scene = { agent, command: agent, argv: agent, screen: rest.join('\n'), end: lastAt(typed) + 30, events: [...typed, { at: lastAt(typed) + 5, kind: 'draw', screen: question }] };
      raisedEverywhere(scene, lastAt(typed) + 5);
    }
  });

  it('C4 his words under the agent’s numbered prose: never needs input', () => {
    const prose = [...AGY.slice(0, -4), '1. First we read the file', '2. Then we change it', ...AGY.slice(-4)];
    for (const hint of ['esc to cancel', 'do you want']) greyWhereTheParentIsAmber(wordsScene('antigravity', prose, hint));
  });

  // C5: a real question drawn above his words, inside the window.
  const q2 = AGY_PERMISSION.split('\n');
  while (q2.length > 0 && (q2[q2.length - 1] ?? '').trim() === '') q2.pop();
  const both = [...q2, '', ...compose('antigravity', AGY.slice(-4), MIN).split('\n')].join('\n');
  const c5: Scene = { ...wordsScene('antigravity', AGY, MIN, [{ at: 30, kind: 'draw', screen: both }]), end: 60 };

  it('his words in the row, a real question drawn above them: raised', () => {
    raisedEverywhere(c5, 30);
  });

  it('C5 his words alone, before it: never needs input', () => {
    greyWhereTheParentIsAmber(c5, -Infinity, 30);
  });

  it('C6 a paste split over two messages: never needs input', () => {
    const text = MIN.replace(/\n/g, '\r');
    const half = Math.floor(text.length / 2);
    greyWhereTheParentIsAmber({
      agent: 'antigravity',
      command: 'antigravity',
      screen: AGY.join('\n'),
      end: 40,
      events: [
        { at: 10, kind: 'key', chunk: `${ESC}[200~${text.slice(0, half)}`, screen: compose('antigravity', AGY, MIN.slice(0, half)) },
        { at: 10.02, kind: 'key', chunk: `${text.slice(half)}${ESC}[201~`, screen: compose('antigravity', AGY, MIN) }
      ]
    });
  });

  // C6 alone cannot show the paste's state is kept: whichever half the record
  // kept, that half is one of the rows the question needs, so it reads his
  // either way. A third line no part of the question can: the record keeps it
  // alone when a carriage return in the second half is read as a submit.
  it('C6b a paste of three lines split over two messages, its last no part of the question: never needs input', () => {
    const three = `${MIN}\nthanks`;
    const text = three.replace(/\n/g, '\r');
    greyWhereTheParentIsAmber({
      agent: 'antigravity',
      command: 'antigravity',
      screen: AGY.join('\n'),
      end: 40,
      events: [
        { at: 10, kind: 'key', chunk: `${ESC}[200~${text.slice(0, 7)}`, screen: compose('antigravity', AGY, three.slice(0, 7)) },
        { at: 10.02, kind: 'key', chunk: `${text.slice(7)}${ESC}[201~`, screen: compose('antigravity', AGY, three) }
      ]
    });
  });

  it('C7 a typo erased with Backspace: never needs input', () => {
    const list: Array<[string, string]> = [];
    let sofar = '';
    for (const ch of '1. to cancez') {
      sofar += ch;
      list.push([ch, sofar]);
    }
    sofar = sofar.slice(0, -1);
    list.push(['\u007f', sofar]);
    for (const ch of 'l\n2. x') {
      sofar += ch;
      list.push([ch, sofar]);
    }
    greyWhereTheParentIsAmber({ agent: 'antigravity', command: 'antigravity', screen: AGY.join('\n'), end: 40, events: steps('antigravity', AGY, 10, list) });
  });

  // C7 alone cannot show Backspace erases: his untouched second line is a row
  // the question needs, so it reads his whatever the first line holds. A typo
  // in each line can.
  it('C7b a typo erased with Backspace in each line: never needs input', () => {
    const list: Array<[string, string]> = [];
    let sofar = '';
    for (const ch of '1. to cancez') {
      sofar += ch;
      list.push([ch, sofar]);
    }
    sofar = sofar.slice(0, -1);
    list.push(['\u007f', sofar]);
    for (const ch of 'l\n2. z') {
      sofar += ch;
      list.push([ch, sofar]);
    }
    sofar = sofar.slice(0, -1);
    list.push(['\b', sofar]);
    sofar += 'x';
    list.push(['x', sofar]);
    expect(sofar).toBe(MIN);
    greyWhereTheParentIsAmber({ agent: 'antigravity', command: 'antigravity', screen: AGY.join('\n'), end: 40, events: steps('antigravity', AGY, 10, list) });
  });

  it('C8 an arrow edit in the second line only: never needs input', () => {
    greyWhereTheParentIsAmber({
      agent: 'antigravity',
      command: 'antigravity',
      screen: AGY.join('\n'),
      end: 40,
      events: [
        pasting('antigravity', AGY, 10, '1. to cancel\n2. xy'),
        { at: 11, kind: 'key', chunk: `${ESC}[D` },
        { at: 11.2, kind: 'key', chunk: 'z', screen: compose('antigravity', AGY, '1. to cancel\n2. xzy') }
      ]
    });
  });

  it('C8b Up, then edits in both lines: Up forgets, so read as with no record (the fix round)', () => {
    const scene: Scene = {
      agent: 'antigravity',
      command: 'antigravity',
      screen: AGY.join('\n'),
      end: 40,
      events: [
        pasting('antigravity', AGY, 10, '1. to cancel please\n2. xy'),
        { at: 11, kind: 'key', chunk: `${ESC}[A` },
        { at: 11.1, kind: 'key', chunk: `${ESC}[F` },
        { at: 11.2, kind: 'key', chunk: 'X', screen: compose('antigravity', AGY, '1. to cancel pleaseX\n2. xy') },
        { at: 11.3, kind: 'key', chunk: `${ESC}[B` },
        { at: 11.4, kind: 'key', chunk: `${ESC}[D` },
        { at: 11.5, kind: 'key', chunk: 'z', screen: compose('antigravity', AGY, '1. to cancel pleaseX\n2. xzy') }
      ]
    };
    asTheParent(scene);
    expect(cells(scene).unfed).toBe(20);
  });

  it('C8c a mid-line fix with Left in each line, one line at a time: never needs input', () => {
    const list: Array<[string, string]> = [];
    let sofar = '';
    for (const ch of '1. to cncel') {
      sofar += ch;
      list.push([ch, sofar]);
    }
    for (let n = 0; n < 4; n += 1) list.push([`${ESC}[D`, sofar]);
    sofar = '1. to cancel';
    list.push(['a', sofar], [`${ESC}[F`, sofar]);
    sofar += '\n';
    list.push(['\n', sofar]);
    for (const ch of '2. y') {
      sofar += ch;
      list.push([ch, sofar]);
    }
    list.push([`${ESC}[D`, sofar]);
    sofar = '1. to cancel\n2. xy';
    list.push(['x', sofar]);
    greyWhereTheParentIsAmber({ agent: 'antigravity', command: 'antigravity', screen: AGY.join('\n'), end: 40, events: steps('antigravity', AGY, 10, list) });
  });

  it('C20 committed text in two chunks and a line feed (an IME or dictation commit): never needs input', () => {
    const rows = windowRows('a-qwen-0198');
    greyWhereTheParentIsAmber({
      agent: 'qwen',
      command: 'qwen',
      screen: rows.join('\n'),
      end: 40,
      events: [
        { at: 10, kind: 'key', chunk: '1. to cancel', screen: compose('qwen', rows, '1. to cancel') },
        { at: 10.5, kind: 'key', chunk: '\n', screen: compose('qwen', rows, '1. to cancel\n') },
        { at: 11, kind: 'key', chunk: '2. x', screen: compose('qwen', rows, MIN) }
      ]
    });
  });

  it('C22 each of his lines drawn behind the agent’s own >: never needs input', () => {
    const quoted = [...AGY.slice(0, -3), '> 1. to cancel', '> 2. x', ...AGY.slice(-2)].join('\n');
    greyWhereTheParentIsAmber({
      agent: 'antigravity',
      command: 'antigravity',
      screen: AGY.join('\n'),
      end: 40,
      events: [{ at: 10, kind: 'key', chunk: `${ESC}[200~${MIN.replace(/\n/g, '\r')}${ESC}[201~`, screen: quoted }]
    });
  });

  // C9: a restore replaying gemini's boxed trust gate, a prompt and the armed resume under it.
  const gateTail = GEMINI_GATE.split('\n').filter((l) => l.trim() !== '').slice(-24).join('\n');
  const replayed = `${GEMINI_GATE}\n── restored ──\ngdc@mac ~ % gemini --resume 1a2b3c4d`;

  it('a restore replaying gemini’s boxed trust gate reads no needs input', () => {
    greyWhereTheParentIsAmber({ agent: 'gemini', command: 'zsh', screen: replayed, end: 40, events: [{ at: 0, kind: 'replay', tail: gateTail }] });
  });

  it('C9b then his Enter and gemini’s own gate: raised', () => {
    raisedEverywhere(
      {
        agent: 'gemini',
        command: 'zsh',
        screen: replayed,
        end: 80,
        events: [
          { at: 0, kind: 'replay', tail: gateTail },
          { at: 41, kind: 'key', chunk: '\r' },
          { at: 41.2, kind: 'command', command: 'gemini' },
          { at: 41.5, kind: 'draw', screen: GEMINI_GATE }
        ]
      },
      41
    );
  });

  it('C11 his words sent and echoed by the agent: as with no record, a stated limit (Q2)', () => {
    // He sent them, so the record forgot them (Q2's default), and the echo is
    // read as the parent reads it: raised in every run at both, a tick later
    // at most, because before his Enter his words in the row were his.
    const echoed = [...AGY.slice(0, -4), '> 1. to cancel', '  2. x', '', ...AGY.slice(-4)].join('\n');
    const scene: Scene = {
      agent: 'antigravity',
      command: 'antigravity',
      screen: AGY.join('\n'),
      end: 40,
      events: [pasting('antigravity', AGY, 10, MIN), { at: 12.5, kind: 'key', chunk: '\r' }, { at: 12.6, kind: 'draw', screen: echoed }]
    };
    raisedEverywhere(scene, 12.6);
  });

  it('C12 long lines wrapped at 60 columns: never needs input', () => {
    const text = 'note the two options below\n1. keep the existing cache layer because it already works for the slow path\n2. drop it entirely\ndo you want the first';
    greyWhereTheParentIsAmber({ agent: 'antigravity', command: 'antigravity', screen: AGY.join('\n'), end: 40, events: [pasting('antigravity', AGY, 10, text, 60)] });
  });

  it('C14 an answering key, then the next question 30, 400 and 1,000 ms later: raised as with no record', () => {
    for (const key of ['1', 'y', '\r', `${ESC}[B`, ESC]) {
      for (const d of [0.03, 0.4, 1]) {
        const scene: Scene = {
          agent: 'antigravity',
          command: 'antigravity',
          screen: CLAUDE_GATE,
          end: 40,
          events: [
            { at: 0, kind: 'draw', screen: CLAUDE_GATE },
            { at: 15, kind: 'key', chunk: key, screen: CLAUDE_GATE },
            { at: 15.01, kind: 'draw', screen: AGY.join('\n') },
            { at: 15 + d, kind: 'draw', screen: AGY_PERMISSION }
          ]
        };
        raisedEverywhere(scene, 15.01);
        asTheParent(scene);
      }
    }
  });

  it('C15 his command and Enter in a shell, then a new program’s gate: raised', () => {
    const prompt = 'gdc@mac ~ % ';
    raisedEverywhere(
      {
        agent: 'claude',
        command: 'zsh',
        screen: prompt,
        end: 40,
        events: [
          ...typing('shell', ['bash-5.2$'], 10, 'claude').map((e) => ({ ...e, screen: `${prompt}claude` })),
          { at: 11, kind: 'key', chunk: '\r' },
          { at: 11.02, kind: 'command', command: 'claude' },
          { at: 11.4, kind: 'draw', screen: CLAUDE_GATE }
        ],
        argv: 'claude'
      },
      11
    );
  });

  it('C16 typed ahead while the agent works, it finishes with his words drawn: never needs input', () => {
    const working = ['⠋ Working (3s · esc to interrupt)', ...AGY.slice(-4)];
    const c = cells({
      agent: 'antigravity',
      command: 'antigravity',
      screen: working.join('\n'),
      end: 50,
      events: [
        ...Array.from({ length: 20 }, (_, i): Event => ({ at: 5 + i * 0.5, kind: 'write' })),
        ...typing('antigravity', working, 8, MIN),
        { at: 15.2, kind: 'draw', screen: compose('antigravity', AGY, MIN) }
      ]
    });
    expect(c.unfed).toBe(c.runs);
    expect(c.fed).toBe(0);
  });

  it('C17 his words while the agent repaints its footer every 5 s: never needs input', () => {
    const events: Event[] = [pasting('antigravity', AGY, 10, MIN)];
    for (let t = 15; t < 60; t += 5) events.push({ at: t, kind: 'draw', screen: compose('antigravity', [...AGY.slice(0, -1), `? for shortcuts   ${String(t)}`], MIN) });
    const c = cells({ agent: 'antigravity', command: 'antigravity', screen: AGY.join('\n'), end: 60, events });
    expect(c.unfed).toBeGreaterThanOrEqual(c.runs - 1);
    expect(c.fed).toBe(0);
  });

  it('C18 a 1.5, 2.5 and 4 s pause before the completing character: never needs input', () => {
    for (const pause of [1.5, 2.5, 4]) {
      const events: Event[] = [...typing('antigravity', AGY, 10, '1. to cancel\n2. ')];
      const at = lastAt(events) + pause;
      events.push({ at, kind: 'key', chunk: 'x', screen: compose('antigravity', AGY, MIN) });
      greyWhereTheParentIsAmber({ agent: 'antigravity', command: 'antigravity', screen: AGY.join('\n'), end: at + 15, events });
    }
  });

  it('a question a hook raised over his words is never released by them', () => {
    const scene: Scene = { ...wordsScene('antigravity', AGY, MIN, [{ at: 20, kind: 'hook', state: 'needs_input' }]), end: 50 };
    for (const r of everyRun(scene)) {
      // Before the hook, his words are his and grey; from it on, blocked to the end.
      expect(amber(r.fed, -Infinity, 20), r.where).toEqual([]);
      const after = r.fed.at.filter((s) => s >= 20);
      expect(amber(r.fed, 20), r.where).toEqual(after);
    }
  });

  it('a screen both numbered and shaped, its rows his, is raised', () => {
    // Synthetic: qwen's committed confirmation, read by its shape, with one row
    // of his above it that makes the numbered verdict read it too.
    const permission = fixture('qwen-run-permission.txt').split('\n');
    const at = permission.findIndex((r) => r.includes('Allow execution of'));
    const synthetic = [...permission.slice(0, at), '  > do you want', ...permission.slice(at)].join('\n');
    expect(parentReads(synthetic)).toBe(true);
    expect(parentReads(permission.join('\n'))).toBe(false);
    expect(detectShapes(normalizeCapture(synthetic), ['qwen-confirmation'])).toBe(true);
    const rows = windowRows('a-qwen-0198');
    raisedEverywhere({ ...wordsScene('qwen', rows, 'do you want', [{ at: 20, kind: 'draw', screen: synthetic }]), end: 45 }, 20);
    // And (the fix round, which reads the qwen screen above as the agent's by
    // its options below his row too) his whole dialog-shaped words above
    // Claude Code 2.1.280's trust gate, whose options carry no numbers: his
    // rows give the numbered verdict both options, so only `!shaped` keeps the
    // shape's question the agent's.
    const gate = fixture('claude-trust-2-1-280.txt').split('\n');
    const accessing = gate.findIndex((r) => r.includes('Accessing workspace:'));
    const above = [...gate.slice(0, accessing), ' > 1. to cancel', '   2. x', ...gate.slice(accessing + 1)].join('\n');
    expect(parentReads(above)).toBe(true);
    expect(parentReads(gate.join('\n'))).toBe(false);
    expect(detectShapes(normalizeCapture(above), ['claude-trust-gate'])).toBe(true);
    raisedEverywhere({ ...wordsScene('claude', CLAUDE_REST, MIN, [{ at: 20, kind: 'draw', screen: above }]), end: 45, argv: 'claude' }, 20);
  });
});

// ---------------------------------------------------------------------------
// SET D — 353's trade scene (§2.3, M3)
// ---------------------------------------------------------------------------

describe('set D: the trade scene (§2.3)', () => {
  it('the trade scene: a real numbered question 0.1 to 5 s after his last key, the pane silent or writing, raised in every cell', () => {
    for (const d of [0.1, 0.2, 0.5, 1, 1.2, 1.5, 2, 3, 5]) {
      for (const writing of [false, true]) {
        const typed = typing('antigravity', AGY, 10, ORDINARY);
        const last = lastAt(typed);
        const events: Event[] = [
          ...typed,
          ...(writing ? Array.from({ length: Math.ceil(d * 4) }, (_, i): Event => ({ at: last + 0.02 + i * 0.25, kind: 'write' })) : []),
          { at: last + d, kind: 'draw', screen: AGY_PERMISSION }
        ];
        const scene: Scene = { agent: 'antigravity', command: 'antigravity', screen: AGY.join('\n'), end: last + d + 30, events };
        for (const r of everyRun(scene)) {
          const label = `${String(d)} s ${writing ? 'writing' : 'silent'}, ${r.where}`;
          expect(amber(r.fed, last + d).length, label).toBeGreaterThan(0);
          expect(r.fed.states, label).toEqual(r.unfed.states);
        }
      }
    }
  }, 600_000);
});

// ---------------------------------------------------------------------------
// The shipping monitor class
// ---------------------------------------------------------------------------

/** The shipping monitor over scripted panes, his keys handed on as the attach host's tap and the renderer's gate hand them. */
class Desk {
  now = T0;
  readonly statuses: Array<[string, SessionStatus, number]> = [];
  readonly monitor: SessionActivityMonitor;
  readonly claudeDir = mkdtempSync(join(tmpdir(), 'p3251-claude-'));
  readonly panes = new Map<string, { screen: string; written: number; command: string; pane: string; pid: number }>();
  sessions: ActivitySession[] = [];

  constructor() {
    this.monitor = new SessionActivityMonitor({
      sessions: () => this.sessions,
      exec: (async (args: readonly string[]) => {
        if (args[0] !== 'list-panes') throw new Error(`unexpected ${String(args[0])}`);
        return this.sessions
          .map((s) => {
            const p = this.panes.get(s.id);
            if (p === undefined) return '';
            return [s.tmuxId, p.pane, String(p.pid), '1', '0', '', '', String(Math.floor(T0 / 1000 + p.written)), '0', '0', '0', '0', '25000', p.command, ''].join('\t');
          })
          .join('\n');
      }) as never,
      run: async (args: readonly string[]) => {
        const target = args[args.indexOf('-t') + 1] ?? '';
        for (const p of this.panes.values()) if (p.pane === target) return p.screen;
        return '';
      },
      readProc: async () => parseProcTable([...this.panes.values()].map((p) => `${String(p.pid)} 1 0:00.10 Ss+`).join('\n'), this.now),
      readWitness: async () => ({ found: false, stat: '', ppid: null }),
      readCommand: async () => null,
      readChildren: async () => [],
      claudeSessionsDir: this.claudeDir,
      onStatus: (id, status) => this.statuses.push([id, status, this.now]),
      onActivity: () => undefined,
      onDead: () => undefined,
      now: () => this.now
    });
  }

  add(id: string, agent: string, screen: string, command = 'node'): void {
    const n = this.sessions.length + 1;
    this.sessions.push({ id, tmuxId: `$${String(n)}`, agent, cwd: '/work' });
    this.panes.set(id, { screen, written: (this.now - T0) / 1000, command, pane: `%${String(n)}`, pid: 1000 + n });
  }

  draw(id: string, screen: string): void {
    const p = this.panes.get(id);
    if (p === undefined) return;
    p.screen = screen;
    p.written = (this.now - T0) / 1000;
  }

  /** One chunk he sends: the tap's note, then the renderer's release while its row reads needs input. */
  key(id: string, chunk: string, screen?: string): void {
    this.monitor.noteOwnWords(id, chunk);
    if (this.last(id) === 'needs_input') this.monitor.noteUserInput(id);
    if (screen !== undefined) this.draw(id, screen);
  }

  async at(seconds: number): Promise<void> {
    this.now = ms(seconds);
    await this.monitor.tick();
  }

  last(id: string): SessionStatus | undefined {
    for (let i = this.statuses.length - 1; i >= 0; i -= 1) if (this.statuses[i]?.[0] === id) return this.statuses[i]?.[1];
    return undefined;
  }

  amber(id: string, from = 0): number {
    return this.statuses.filter(([s, status, at]) => s === id && status === 'needs_input' && at >= ms(from)).length;
  }

  close(): void {
    this.monitor.dispose();
    rmSync(this.claudeDir, { recursive: true, force: true });
  }
}

describe('the shipping monitor', { timeout: 300_000 }, () => {
  const desks: Desk[] = [];
  afterAll(() => {
    for (const d of desks) d.close();
  });
  const desk = (): Desk => {
    const d = new Desk();
    desks.push(d);
    return d;
  };
  const gate = GEMINI_GATE;
  const replay = `${gate}\n\ngdc@mac ~ % gemini --resume 1a2b3c4d`;
  const tail = gate.split('\n').filter((l) => l.trim() !== '').slice(-24).join('\n');

  it('a replayed screen noted before the first tick is held, then his Enter and the agent’s own gate are raised', async () => {
    for (const cadence of CADENCES) {
      const d = desk();
      d.now = ms(5);
      d.add('r', 'gemini', replay, 'zsh');
      // The restore's note (seam S2), before any tick has seen the session.
      d.monitor.noteReplayedScreen('r', tail);
      for (let s = 5 + cadence; s <= 40; s += cadence) await d.at(s);
      expect(d.amber('r'), `the replayed gate, ${String(cadence)} s`).toBe(0);
      // He presses Enter on the armed resume; gemini starts and draws its own gate.
      d.now = ms(41);
      d.key('r', '\r');
      const pane = d.panes.get('r');
      if (pane !== undefined) pane.command = 'gemini';
      d.now = ms(41.5);
      d.draw('r', gate);
      for (let s = 41 + cadence; s <= 70; s += cadence) await d.at(s);
      expect(d.amber('r', 41), `gemini's own gate, ${String(cadence)} s`).toBeGreaterThan(0);
    }
  });

  it('with no note, the same replay reads needs input, which is the reason the restore hands it on', async () => {
    const d = desk();
    d.now = ms(5);
    d.add('r', 'gemini', replay, 'zsh');
    for (let s = 6; s <= 30; s += 1) await d.at(s);
    expect(d.amber('r')).toBeGreaterThan(0);
  });

  it('the hook’s question over his words, through the shipping monitor: held to the end, never released by them', async () => {
    const rows = windowRows('a-gemini-0010');
    for (const cadence of CADENCES) {
      const d = desk();
      d.add('h', 'gemini', rows.join('\n'), 'gemini');
      let t = 2;
      let typed = '';
      for (const ch of MIN) {
        typed += ch;
        d.now = ms(t);
        d.key('h', ch, compose('gemini', rows, typed));
        t += 0.12;
      }
      for (let s = 4; s <= 20; s += cadence) await d.at(s);
      expect(d.amber('h'), `his words alone, ${String(cadence)} s`).toBe(0);
      // A hook says the agent is asking; his words stay on the screen.
      d.now = ms(20.5);
      d.monitor.noteHookEvent('h', 'needs_input');
      expect(d.last('h')).toBe('needs_input');
      for (let s = 21; s <= 50; s += cadence) await d.at(s);
      expect(d.last('h'), `still asking, ${String(cadence)} s`).toBe('needs_input');
    }
  });

  it('his words in a seventh session while six are blocked, then a slot freed: never raised', async () => {
    const d = desk();
    for (let i = 1; i <= 6; i += 1) d.add(`b${String(i)}`, 'gemini', CLAUDE_GATE, 'gemini');
    const rows = windowRows('a-gemini-0010');
    d.add('w', 'gemini', rows.join('\n'), 'gemini');
    for (let s = 1; s <= 10; s += 1) await d.at(s);
    for (let i = 1; i <= 6; i += 1) expect(d.last(`b${String(i)}`)).toBe('needs_input');
    let t = 11;
    let typed = '';
    for (const ch of MIN) {
      typed += ch;
      d.now = ms(t);
      d.key('w', ch, compose('gemini', rows, typed));
      t += 0.12;
    }
    for (let s = 14; s <= 30; s += 1) await d.at(s);
    // A slot is freed: one blocked session is ended.
    d.sessions = d.sessions.filter((x) => x.id !== 'b1');
    for (let s = 31; s <= 60; s += 1) await d.at(s);
    expect(d.amber('w')).toBe(0);
  });

  it('the two drivers agree tick for tick: the monitor class reads what the per-tick sequence reads, his words typed and a real question after them', async () => {
    const rows = windowRows('a-gemini-0010');
    for (const cadence of CADENCES) {
      for (const phase of [0, 0.5]) {
        const events: Event[] = [...typing('gemini', rows, 10, MIN), { at: 40, kind: 'draw', screen: gate }];
        const scene: Scene = { agent: 'gemini', command: 'gemini', screen: rows.join('\n'), end: 60, events };
        const expected = run(scene, true, cadence, phase * cadence);
        const d = desk();
        d.add('g', 'gemini', scene.screen, 'gemini');
        const sorted = [...events].sort((a, b) => a.at - b.at);
        let next = 0;
        const seen: string[] = [];
        for (const s of expected.at) {
          while (next < sorted.length && (sorted[next]?.at ?? Infinity) <= s) {
            const e = sorted[next] as Event;
            next += 1;
            d.now = ms(e.at);
            if (e.kind === 'key') d.key('g', e.chunk, e.screen);
            else if (e.kind === 'draw') d.draw('g', e.screen);
          }
          await d.at(s);
          const status = d.last('g');
          seen.push(status === 'needs_input' ? 'needs_input' : status === 'idle' ? 'idle' : 'working');
        }
        const want = expected.states.map((x) => (x === 'starting' ? 'working' : x));
        expect(seen, `${String(cadence)} s, phase ${String(phase * cadence)}`).toEqual(want);
        // And the question after his words is raised.
        expect(d.amber('g', 40)).toBeGreaterThan(0);
      }
    }
  });
});
