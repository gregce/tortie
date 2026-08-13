/**
 * The fault-injection channel — named points inside the durability paths that
 * a harness can turn into a hard crash.
 *
 * Why this exists. Of the 29 rows in the fault matrix (research 26 §13, audited
 * in research 33 §7) only 2 are covered and 20 are exercised by nothing. Every
 * harness in this repo quits politely, so nothing anywhere kills the app, and
 * crash safety is the thing the product is sold on.
 *
 * Two measured facts shape this module (research 34 §3.3 and §5.1).
 *
 *  1. **Only SIGKILL is a crash.** SIGTERM, SIGINT and SIGHUP all run
 *     Electron's full graceful quit, including honouring `preventDefault()`,
 *     and a Node-level `process.on('SIGTERM')` handler never fires because
 *     Chromium owns the signal. A harness built on SIGTERM tests the happy
 *     path. So the only action this module takes is `SIGKILL` to its own pid.
 *  2. **A named, counted point beats a random timer** for anything you want to
 *     reproduce. This is SQLite's own crash-test shape: advance a counter per
 *     point, fire on the Nth arrival, and a failure is then reproducible by
 *     index rather than by luck. The random timer still has its place, and it
 *     lives in the supervisor (build/fault-harness.mjs) rather than here.
 *
 * Cost when nothing is armed: one boolean test per call. The environment is
 * read once, on first use.
 *
 * SAFETY. Arming is refused unless `GMUX_SMOKE` is set, so a `GMUX_FAULT` left
 * in a shell profile cannot kill the user's real app. The harness that owns
 * this module also runs under its own `--user-data-dir` and its own tmux
 * socket, so a crash injected here can never damage real work.
 *
 * Environment:
 *   GMUX_FAULT=<point>[#<n>]  SIGKILL on the nth arrival at <point> (n from 1,
 *                             default 1).
 *   GMUX_FAULT_TRACE=<path>   Append one `<point>\t<ordinal>\t<ms>` line per
 *                             arrival, so the supervisor can read back which
 *                             points a workload passed through and in what
 *                             order. Written with appendFileSync, which has
 *                             already reached the kernel when SIGKILL lands.
 */

import { appendFileSync, writeSync } from 'node:fs';

/**
 * Every named point, in roughly the order a session's life reaches them.
 *
 * Adding a point is adding a member here and one call at the site. The names
 * are an interface: the supervisor passes them on the command line and they
 * appear in reports, so renaming one breaks recorded runs.
 */
export const FAULT_POINTS = [
  // Create — fault matrix rows 1 to 4. The declaration is the manifest row,
  // which is written BEFORE the process exists (FINAL-REPORT §2.4 Step 0).
  'create.before-declaration',
  'create.after-declaration',
  'create.after-spawn',
  'create.after-launch-record',
  'create.after-identity-stamp',
  // Checkpoint write — row 9. `after-write` is the torn window: bytes are in
  // the temporary file and the rename has not happened.
  'snapshot.before-write',
  'snapshot.after-write',
  'snapshot.after-rename',
  // Restore — row 12, one point per stage boundary.
  'restore.before-spawn',
  'restore.after-spawn',
  'restore.after-replay',
  'restore.after-arm',
  'restore.after-status-write',
  // Quit — the app-quit capture point, which is where scrollback is saved.
  'quit.before-snapshots',
  'quit.after-snapshots',
  // The harness's own end of workload marker. Killing here is the "crash with
  // everything already written" control case.
  'work.after-snapshots'
] as const;

export type FaultPointName = (typeof FAULT_POINTS)[number];

export interface FaultSpec {
  point: string;
  /** 1-based arrival to fire on. */
  ordinal: number;
}

/**
 * Parse `GMUX_FAULT`. `create.after-spawn` means the first arrival,
 * `create.after-spawn#3` means the third. Returns null for anything unusable,
 * because an unparseable spec must not silently arm a different point.
 */
export function parseFaultSpec(raw: string): FaultSpec | null {
  const text = raw.trim();
  if (text.length === 0) return null;
  const hash = text.indexOf('#');
  const point = hash === -1 ? text : text.slice(0, hash);
  if (point.length === 0) return null;
  if (hash === -1) return { point, ordinal: 1 };
  const ordinal = Number(text.slice(hash + 1));
  if (!Number.isInteger(ordinal) || ordinal < 1) return null;
  return { point, ordinal };
}

type Killer = (point: string, ordinal: number) => void;

interface FaultState {
  spec: FaultSpec | null;
  tracePath: string | null;
  counts: Map<string, number>;
  kill: Killer;
}

function realKill(point: string, ordinal: number): void {
  // writeSync, not console.log: stdout through console can still be buffered
  // when the signal lands, and this line is how a supervisor learns where the
  // process died even if the trace file is unavailable.
  try {
    writeSync(1, `[gmux-fault] SIGKILL at ${point}#${String(ordinal)}\n`);
  } catch {
    /* a closed stdout must not stop the fault */
  }
  process.kill(process.pid, 'SIGKILL');
}

function build(env: NodeJS.ProcessEnv, kill: Killer): FaultState {
  const raw = env['GMUX_FAULT'] ?? '';
  const harness = (env['GMUX_SMOKE'] ?? '') !== '';
  const spec = harness ? parseFaultSpec(raw) : null;
  if (raw !== '' && !harness) {
    console.warn(
      '[gmux-fault] GMUX_FAULT is set but this is not a harness launch, so it is ignored.'
    );
  }
  const trace = env['GMUX_FAULT_TRACE'] ?? '';
  return {
    spec,
    tracePath: trace === '' ? null : trace,
    counts: new Map<string, number>(),
    kill
  };
}

let state: FaultState | null = null;

function current(): FaultState {
  state ??= build(process.env, realKill);
  return state;
}

/**
 * Reach a named point. Counts the arrival, records it when tracing is on, and
 * SIGKILLs this process when it is the arrival the harness asked for.
 *
 * Never throws. A fault point in a durability path must not become a new way
 * for that path to fail.
 */
export function faultPoint(name: FaultPointName): void {
  const st = current();
  if (st.spec === null && st.tracePath === null) return;
  const n = (st.counts.get(name) ?? 0) + 1;
  st.counts.set(name, n);
  if (st.tracePath !== null) {
    try {
      appendFileSync(st.tracePath, `${name}\t${String(n)}\t${String(Date.now())}\n`);
    } catch {
      /* tracing is evidence, not behaviour */
    }
  }
  if (st.spec !== null && st.spec.point === name && st.spec.ordinal === n) {
    st.kill(name, n);
  }
}

/** Arrivals per point so far, for a harness report. */
export function faultCounts(): Record<string, number> {
  return Object.fromEntries(current().counts);
}

/** The armed spec, or null. Printed by the harness so a run says what it did. */
export function armedFault(): FaultSpec | null {
  return current().spec;
}

/** Unit-test hook: rebuild the state from an explicit env and killer. */
export function __resetFaultsForTests(
  env: NodeJS.ProcessEnv,
  kill: Killer
): void {
  state = build(env, kill);
}
