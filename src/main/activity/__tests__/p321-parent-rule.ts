/**
 * THE PARENT'S RULE, copied once, for every test that holds HEAD to it
 * (build/p353/SPEC.md D328-6).
 *
 * `parentInferredVerdict` is a LITERAL COPY of `inferredVerdict` at `ecb6997a`
 * (src/main/activity/state-machine.ts) with every helper it calls, the
 * detector included, copied beside it rather than imported: an oracle that
 * imports the thing it judges proves nothing. Phase 321 changed nothing for a
 * row that lists no shape, so this is also every such row's rule at
 * `e371324b` and at `b1a557b8`, the parent of Phase 353, whose 328 leaves it
 * alone for every row but the one it names.
 *
 * MOVED HERE FROM p321-masking.test.ts BY PHASE 353 (D328-6), byte for byte in
 * every rule, with the two helpers that build its inputs over the committed
 * windows, `restingWindow` and `typedInto`. Phase 328's file needs the same
 * oracle, and a second copy is how two oracles of one rule drift apart. No
 * assertion of p321-masking.test.ts changed by the move.
 *
 * Not a test file: it asserts nothing, and vitest's include does not name it.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { AgentActivityProfile } from '../../agents/registry';
import type { PaneFacts } from '../panes';
import type { ProcSnapshot } from '../process';
import { commitVerdict, type SessionState } from '../state-machine';
import type { ActivityState, ActivityVerdict } from '../types';

// ---------------------------------------------------------------------------
// The parent's rule, copied (ecb6997a, src/main/activity/state-machine.ts and
// the helpers it calls from process.ts and screen.ts)
// ---------------------------------------------------------------------------

const P_QUIET_MS = 2_000;
const P_IDLE_CONFIRM_TICKS = 3;
const P_DIALOG_CONFIRM_TICKS = 2;
const P_DIALOG_CLEAR_TICKS = 2;
const P_AMBIGUOUS_WINDOW_MS = 60_000;
const P_CPU_BUSY_PERCENT = 5;
const P_CPU_BUSY_TICKS = 2;
const P_SCREEN_MEMORY_TICKS = 5;

function pNormalizeCapture(text: string): string {
  const lines = text.split('\n').map((l) => l.replace(/\s+$/, ''));
  while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
  return lines.join('\n');
}

function pHashScreen(text: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ (c + i), 0x85ebca6b) >>> 0;
  }
  return h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(4, '0').slice(0, 4);
}

/** The parent's numbered verdict, a literal copy of `detectDialog` at ecb6997a. */
export function pDetectDialog(capture: string): boolean {
  const BORDER = /^[\s│┃║▌▏|]+|[\s│┃║▕|]+$/g;
  const OPT1 = /^[❯›●▶◆*>▸○◇⏵\s]{0,4}1[.)]\s+\S/;
  const OPT2 = /^[❯›●▶◆*>▸○◇⏵\s]{0,4}2[.)]\s+\S/;
  const HINT =
    /(enter to (confirm|select|continue)|press enter|esc to cancel|esc to quit|use enter to select|to cancel)/i;
  const QUEST = /(do you (want|trust)|would you like|how would you like)/i;
  const DIALOG_ROWS = 24;
  const lines = capture.split('\n');
  while (lines.length > 0 && (lines[lines.length - 1] ?? '').trim() === '') {
    lines.pop();
  }
  const rows = lines.slice(-DIALOG_ROWS).map((l) => l.replace(BORDER, ''));
  let opt1 = false;
  let opt2 = false;
  let hint = false;
  for (const row of rows) {
    if (!opt1 && OPT1.test(row)) opt1 = true;
    if (!opt2 && OPT2.test(row)) opt2 = true;
    if (!hint && (HINT.test(row) || QUEST.test(row))) hint = true;
  }
  return opt1 && opt2 && hint;
}

class PScreenMemory {
  private last: string | null = null;
  private quiet: number;
  constructor(private readonly depth = P_SCREEN_MEMORY_TICKS) {
    this.quiet = depth;
  }
  note(hash: string): boolean {
    if (this.last === null) {
      this.last = hash;
      this.quiet = this.depth;
    } else if (hash !== this.last) {
      this.last = hash;
      this.quiet = 0;
    } else {
      this.quiet++;
    }
    return this.quiet < this.depth;
  }
  reset(): void {
    this.last = null;
    this.quiet = this.depth;
  }
}

function pDescendants(snap: ProcSnapshot, root: number): number[] {
  const out: number[] = [];
  const stack = [...(snap.children.get(root) ?? [])];
  const seen = new Set<number>([root]);
  while (stack.length > 0 && out.length < 4_096) {
    const pid = stack.pop();
    if (pid === undefined || seen.has(pid)) continue;
    seen.add(pid);
    out.push(pid);
    for (const kid of snap.children.get(pid) ?? []) stack.push(kid);
  }
  return out;
}

function pSubtreeCpuSeconds(snap: ProcSnapshot, root: number): number {
  let total = snap.cpu.get(root) ?? 0;
  for (const pid of pDescendants(snap, root)) total += snap.cpu.get(pid) ?? 0;
  return total;
}

function pHasToolChild(snap: ProcSnapshot, root: number): boolean {
  for (const pid of pDescendants(snap, root)) {
    const stat = snap.stat.get(pid) ?? '';
    if (stat.includes('s') && !stat.includes('+')) return true;
  }
  return false;
}

function pCpuPercent(prevSeconds: number, nextSeconds: number, deltaMs: number): number {
  if (deltaMs <= 0) return 0;
  const delta = Math.max(0, nextSeconds - prevSeconds);
  return (100 * delta) / (deltaMs / 1000);
}

export interface ParentState {
  state: ActivityState;
  since: number;
  quietTicks: number;
  dialogTicks: number;
  clearTicks: number;
  cpuBusyTicks: number;
  lastCpuSeconds: number | null;
  lastCpuAt: number;
  screen: PScreenMemory;
  lastWorkingAt: number;
  reflowUntil: number;
}

export function pFreshState(now: number): ParentState {
  return {
    state: 'starting',
    since: now,
    quietTicks: 0,
    dialogTicks: 0,
    clearTicks: 0,
    cpuBusyTicks: 0,
    lastCpuSeconds: null,
    lastCpuAt: 0,
    screen: new PScreenMemory(),
    lastWorkingAt: now,
    reflowUntil: 0
  };
}

export function pWorthProbing(profile: AgentActivityProfile, st: ParentState, now: number): boolean {
  return profile.animatesWhenIdle || st.state === 'starting' || now - st.lastWorkingAt < P_AMBIGUOUS_WINDOW_MS;
}

export function pInferredVerdict(
  pane: PaneFacts,
  profile: AgentActivityProfile,
  st: ParentState,
  ctx: { now: number; proc: ProcSnapshot | null; capture?: string }
): ActivityVerdict | null {
  if (pane.inMode) return null;
  const reflowing = ctx.now < st.reflowUntil;
  const quiet = ctx.now - pane.activityAt > P_QUIET_MS;
  const outputEvidence = !reflowing && !profile.animatesWhenIdle && !quiet;
  const cpuBusy = pNoteCpu(st, pane, ctx.proc, ctx.now);
  const toolChild = ctx.proc !== null && pHasToolChild(ctx.proc, pane.panePid);
  const screen = ctx.capture === undefined ? null : pNormalizeCapture(ctx.capture);
  if (reflowing) st.screen.reset();
  const screenChanged = screen !== null && st.screen.note(pHashScreen(screen));
  const dialog = screen !== null && pDetectDialog(screen);
  if (outputEvidence || cpuBusy || toolChild) {
    st.dialogTicks = 0;
    if (st.state === 'needs_input') {
      return pReleaseNeedsInput(st, ctx.capture);
    }
    st.quietTicks = 0;
    return { state: 'working', tier: 'inferred' };
  }
  if (dialog) {
    st.clearTicks = 0;
    st.dialogTicks++;
    if (st.dialogTicks >= P_DIALOG_CONFIRM_TICKS) {
      return { state: 'needs_input', tier: 'inferred' };
    }
    return null;
  }
  st.dialogTicks = 0;
  if (st.state === 'needs_input') return pReleaseNeedsInput(st, ctx.capture);
  if (screenChanged) {
    st.quietTicks = 0;
    return { state: 'working', tier: 'inferred' };
  }
  if (reflowing) return null;
  st.quietTicks++;
  if (st.state === 'idle' || st.quietTicks >= P_IDLE_CONFIRM_TICKS) {
    return { state: 'idle', tier: 'inferred' };
  }
  return null;
}

function pReleaseNeedsInput(st: ParentState, capture: string | undefined): ActivityVerdict | null {
  if (capture === undefined) return null;
  st.clearTicks++;
  if (st.clearTicks < P_DIALOG_CLEAR_TICKS) return null;
  st.clearTicks = 0;
  st.quietTicks = 0;
  return { state: 'working', tier: 'inferred' };
}

function pNoteCpu(st: ParentState, pane: PaneFacts, proc: ProcSnapshot | null, now: number): boolean {
  if (proc === null) {
    st.lastCpuSeconds = null;
    st.cpuBusyTicks = 0;
    return false;
  }
  const seconds = pSubtreeCpuSeconds(proc, pane.panePid);
  const prev = st.lastCpuSeconds;
  const prevAt = st.lastCpuAt;
  st.lastCpuSeconds = seconds;
  st.lastCpuAt = now;
  if (prev === null) return false;
  const percent = pCpuPercent(prev, seconds, now - prevAt);
  st.cpuBusyTicks = percent >= P_CPU_BUSY_PERCENT ? st.cpuBusyTicks + 1 : 0;
  return st.cpuBusyTicks >= P_CPU_BUSY_TICKS;
}

export function pCommitVerdict(st: ParentState, verdict: ActivityVerdict, now: number): ActivityState | null {
  if (verdict.state === 'working') st.lastWorkingAt = now;
  if (verdict.state === st.state) return null;
  if (st.state === 'needs_input' && verdict.state === 'idle') return null;
  st.state = verdict.state;
  st.since = now;
  st.quietTicks = 0;
  if (verdict.state !== 'needs_input') st.dialogTicks = 0;
  return verdict.state;
}

/** The monitor's `noteUserInput` (monitor.ts), which neither build moved. */
export function pNoteUserInput(st: ParentState, now: number): void {
  if (st.state !== 'needs_input') return;
  st.dialogTicks = 0;
  st.clearTicks = 0;
  pCommitVerdict(st, { state: 'working', tier: 'native' }, now);
}
/** The same, over the SHIPPING state, for the HEAD side of a run. */
export function noteUserInput(st: SessionState, now: number): void {
  if (st.state !== 'needs_input') return;
  st.dialogTicks = 0;
  st.clearTicks = 0;
  commitVerdict(st, { state: 'working', tier: 'native' }, now);
}

// ---------------------------------------------------------------------------
// The screens: committed fixtures and committed windows, never typed here
// ---------------------------------------------------------------------------

const REPO = join(__dirname, '..', '..', '..', '..');
const QUESTIONS = join(REPO, 'build', 'fixtures', 'questions');

/** The last not-question window of one recording, which is its agent at rest. */
const RESTING = new Map<string, string>();
export function restingWindow(source: string, agent: string): string {
  const key = `${source}-${agent}`;
  const known = RESTING.get(key);
  if (known !== undefined) return known;
  const read = readRestingWindow(source, agent);
  RESTING.set(key, read);
  return read;
}
function readRestingWindow(source: string, agent: string): string {
  const file = readdirSync(QUESTIONS).find((f) => f === `${source}-${agent}.jsonl`);
  if (file === undefined) throw new Error(`no committed windows for ${source}-${agent}`);
  const rows = readFileSync(join(QUESTIONS, file), 'utf8')
    .split('\n')
    .filter((l) => l.trim() !== '')
    .map((l) => JSON.parse(l) as { label: string; rows: string[] })
    .filter((w) => w.label === 'not-question');
  const last = rows.at(-1);
  if (last === undefined) throw new Error(`no resting window for ${source}-${agent}`);
  return last.rows.join('\n');
}

/**
 * HIS OWN WORDS, dialog-shaped, typed into the agent's own input row: a
 * question and two numbered rows, which the numbered verdict reads as a
 * question today (research 129 §9 item 6, a fault this phase must not widen).
 */
export function typedInto(screen: string, input: RegExp, words: readonly string[]): string {
  const lines = screen.split('\n');
  let at = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (input.test(lines[i] ?? '')) {
      at = i;
      break;
    }
  }
  if (at < 0) throw new Error('no input row');
  const row = lines[at] ?? '';
  const [first, ...rest] = words;
  const typed = row.replace(input, (m) => `${m}${first ?? ''}`);
  const lead = /^\s*[│┃]?\s*/.exec(row)?.[0] ?? '';
  return [...lines.slice(0, at), typed, ...rest.map((w) => `${lead}  ${w}`), ...lines.slice(at + 1)].join('\n');
}

export const HIS_WORDS = ['Do you want me to proceed?', '1. Yes, go ahead', '2. No, stop'];
