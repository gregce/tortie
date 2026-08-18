/**
 * Harness only driver for session focus (Phase 80.1 verification).
 *
 * Driven from the GMUX_SHOT_DRIVE spec (`sessionFocus: {…}`) and inert
 * otherwise. It exists because the one claim this phase makes at Tier 3 is
 * not visible in a screenshot.
 *
 * THE CLAIM. Between the chord press and the end of the flight, no visible
 * leaf is resized. After the swap, each visible leaf is resized exactly once.
 *
 * THE MEASUREMENT THIS FILE TAKES. `Terminal.onResize` is public and fires
 * exactly when columns or rows change, which is exactly the condition under
 * which TerminalPane calls the bridge's `sessions.resize`. This driver
 * subscribes to every visible leaf through the live terminal registry,
 * presses the real chord as a capture phase keydown on `window`, and records
 * one row per event with its offset in milliseconds from the press. It also
 * polls the document for the copy node, which is how the reduced motion claim
 * is checked. Under that setting the node must never appear at all.
 *
 * The app's storage prefix is left off that bridge name on purpose. The
 * contract inventory sweeps src for a quote followed by that prefix, and a
 * backtick in a comment counts, so writing the name in full here would add a
 * localStorage key the app never writes.
 *
 * THE OTHER MEASUREMENT IS NOT IN THIS FILE. build/probe-session-focus.mjs
 * polls the harness tmux server for pane sizes at 25 ms, which is the ground
 * truth this renderer table is checked against. Two independent readings were
 * asked for and neither replaces the other.
 *
 * Findings go to `console.log`, which GMUX_SHOT_VERBOSE=1 tees into the
 * harness output, and to `window.__gmuxFocusProbe`, which GMUX_SHOT_JS can
 * read back.
 */

import type { IDisposable, Terminal } from '@xterm/xterm';
import { getTerminal } from '../terminal/drop/registry';
import { observeFocusCopy, type CopyLeafReport } from './focus-copy';

export interface SessionFocusProbeSpec {
  /** Let the four attached panes settle this long before pressing. */
  armMs?: number;
  /** Wait this long after each press before reading the table. */
  settleMs?: number;
  /** Press a second time and record the way out too. Defaults to true. */
  leave?: boolean;
  /** How often the document is asked whether the copy node exists. */
  pollMs?: number;
  /** Read the copy's pixels back and report how much of it is not background. */
  measureCopy?: boolean;
  /**
   * A shell command sent to every visible leaf before the gesture, so the
   * panes have something on them.
   *
   * Without it the ink number says nothing. Measured on 2026-08-18 against
   * four fresh shell prompts, every leaf reported grabbed=true and ink
   * 0.0000, and a prompt occupying one row of twenty is indistinguishable
   * from an empty drawing buffer at 400 samples. A seeded pane separates the
   * two answers.
   */
  seed?: string;
}

/** One `Terminal.onResize` event, with its offset from the chord press. */
export interface ResizeRow {
  leafId: string;
  cols: number;
  rows: number;
  tMs: number;
}

/** What one gesture produced. */
export interface GestureReport {
  name: 'enter' | 'leave';
  /** `Date.now()` at the press, so the tmux timeline can be lined up with it. */
  pressedAtEpochMs: number;
  rows: ResizeRow[];
}

/** When the copy node was in the document, in `Date.now()` milliseconds. */
export interface CopyWindow {
  fromEpochMs: number;
  toEpochMs: number;
}

export interface SessionFocusReport {
  leafIds: string[];
  gestures: GestureReport[];
  copies: CopyLeafReport[];
  copyWindows: CopyWindow[];
  pollMs: number;
  polls: number;
}

const PREFIX = '[focus-probe]';

function log(line: string): void {
  console.log(`${PREFIX} ${line}`);
}

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/** Every leaf the surface is drawing right now, with its live terminal. */
function visibleLeaves(): { leafId: string; term: Terminal }[] {
  const found: { leafId: string; term: Terminal }[] = [];
  const nodes = document.querySelectorAll('[data-surface-leaves] [data-split-leaf]');
  for (const node of Array.from(nodes)) {
    const leafId = node.getAttribute('data-split-leaf') ?? '';
    if (leafId === '') continue;
    const term = getTerminal(leafId);
    if (term === null) continue;
    found.push({ leafId, term });
  }
  return found;
}

/**
 * The real gesture, in the real place. Capture phase keydown on `window` is
 * exactly where App.tsx listens, so this drives the shipped handler rather
 * than calling the store.
 */
function pressChord(): void {
  window.dispatchEvent(
    new KeyboardEvent('keydown', {
      key: 'Enter',
      code: 'Enter',
      metaKey: true,
      shiftKey: true,
      bubbles: true
    })
  );
}

export async function driveSessionFocus(
  spec: SessionFocusProbeSpec
): Promise<SessionFocusReport> {
  const armMs = spec.armMs ?? 1_500;
  const settleMs = spec.settleMs ?? 1_500;
  const pollMs = spec.pollMs ?? 8;
  const wantsLeave = spec.leave !== false;

  const leaves = visibleLeaves();
  log(`${String(leaves.length)} visible leaves: ${leaves.map((l) => l.leafId).join(', ')}`);

  const events: { leafId: string; cols: number; rows: number; at: number }[] = [];
  const subs: IDisposable[] = leaves.map(({ leafId, term }) =>
    term.onResize(({ cols, rows }) => {
      events.push({ leafId, cols, rows, at: performance.now() });
    })
  );

  const copies: CopyLeafReport[] = [];
  if (spec.measureCopy === true) {
    observeFocusCopy((report) => {
      copies.push(report);
    });
  }

  // The copy poll. It records only the edges, because a list of every sample
  // says nothing a pair of timestamps does not.
  const copyWindows: CopyWindow[] = [];
  let polls = 0;
  let open: CopyWindow | null = null;
  const timer = setInterval(() => {
    polls += 1;
    const present = document.querySelector('.gmux-focus-copy') !== null;
    const now = Date.now();
    if (present && open === null) {
      open = { fromEpochMs: now, toEpochMs: now };
      copyWindows.push(open);
    } else if (present && open !== null) {
      open.toEpochMs = now;
    } else if (!present && open !== null) {
      open = null;
    }
  }, pollMs);

  if (spec.seed !== undefined && spec.seed !== '') {
    for (const { leafId } of leaves) {
      window.gmux?.term.sendInput(leafId, `${spec.seed}\r`);
    }
    log(`seeded ${String(leaves.length)} panes`);
    await wait(1_500);
  }

  log(`arming, ${String(armMs)} ms`);
  await wait(armMs);

  const gestures: GestureReport[] = [];
  gestures.push(await gesture('enter', events, settleMs));
  if (wantsLeave) gestures.push(await gesture('leave', events, settleMs));

  clearInterval(timer);
  for (const sub of subs) sub.dispose();
  observeFocusCopy(null);

  const report: SessionFocusReport = {
    leafIds: leaves.map((l) => l.leafId),
    gestures,
    copies,
    copyWindows,
    pollMs,
    polls
  };
  printReport(report);
  (window as unknown as { __gmuxFocusProbe?: SessionFocusReport }).__gmuxFocusProbe =
    report;
  log(`result ${JSON.stringify(report)}`);
  return report;
}

async function gesture(
  name: 'enter' | 'leave',
  events: { leafId: string; cols: number; rows: number; at: number }[],
  settleMs: number
): Promise<GestureReport> {
  const from = events.length;
  const t0 = performance.now();
  const pressedAtEpochMs = Date.now();
  pressChord();
  log(`pressed ${name} at epoch ${String(pressedAtEpochMs)}`);
  await wait(settleMs);
  const rows = events.slice(from).map((e) => ({
    leafId: e.leafId,
    cols: e.cols,
    rows: e.rows,
    tMs: Math.round(e.at - t0)
  }));
  return { name, pressedAtEpochMs, rows };
}

function printReport(report: SessionFocusReport): void {
  for (const g of report.gestures) {
    log(`${g.name}: ${String(g.rows.length)} resize events`);
    log('  leaf                                  cols  rows   t_ms');
    for (const row of g.rows) {
      log(
        `  ${row.leafId.padEnd(36)}${String(row.cols).padStart(6)}` +
          `${String(row.rows).padStart(6)}${String(row.tMs).padStart(7)}`
      );
    }
  }
  for (const c of report.copies) {
    const ink = c.ink === null ? 'not measured' : c.ink.toFixed(4);
    log(
      `copy leaf=${c.leafId} grabbed=${String(c.grabbed)} ` +
        `ink=${ink} sampled=${String(c.sampled)} ` +
        `sources=[${c.sources.join(' ')}]`
    );
  }
  log(
    `copy node seen in ${String(report.copyWindows.length)} windows over ` +
      `${String(report.polls)} polls at ${String(report.pollMs)} ms`
  );
}
