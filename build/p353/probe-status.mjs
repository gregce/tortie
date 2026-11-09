#!/usr/bin/env node
/**
 * probe:p353:status — Phase 328 inside the real app (build/p353/SPEC.md §8,
 * D-P1; the Phase 328 entry in docs/BACKLOG.md, its `probe:p328` folded into
 * this run). Phase 325's arms left with 325 (build/p353/SPEC.md, "The move to
 * main and the drop of 325"), owed to Phase 325.1.
 *
 * WHAT IT IS FOR. Phase 328 stops an Antigravity session reading `running` at
 * its prompt while it writes two terminal modes every 2 s and draws nothing.
 * The vitest file drives the state machine on a virtual clock
 * (p328-writes-without-drawing.test.ts); this probe is its one run INSIDE THE
 * APP: the real registry rows launched by Tortie under their bare names, the
 * shipped monitor at the unfocused 2 s cadence, and main's own status read
 * back.
 *
 * IN probe:p321's SHAPE (build/p321/probe-p321.mjs). One Electron at a time
 * through `build/electron-run.mjs`, with a scratch profile, a scratch HOME and
 * the socket build/harness-socket.mjs hands it (`gmux-p353s-…`, never `gmux`),
 * named to the helper as `tmuxSocket` so its read-only census of his server
 * runs and its teardown ends this run's. The 2 s cadence is driven the way
 * probe:p321 drives it (the window's focus taken away for real over main's
 * inspector, then the app's own blur) and MEASURED per arm through a
 * `GMUX_TMUX_BIN` wrapper around the checkout's vendored tmux that notes each
 * monitor tick; an arm whose span did not tick every 2 s reads UNREADABLE.
 *
 * THE STAND-INS ARE THE REAL REGISTRY ROWS cursor, qwen, opencode, antigravity,
 * claude, grok and pi, under their bare names (`cursor-agent`, `qwen`,
 * `opencode`, `agy`, `claude`, `grok`, `pi`), each of which
 * the scratch login shell resolves to a wrapper on the scratch HOME's PATH
 * that `exec`s build/p321/stand-in.mjs under the bare name; the arms launch
 * antigravity (`agy`) and pi, beside shells. EVERY ONE OF THOSE
 * AGENTS IS INSTALLED ON THIS MAC, and agy, qwen and grok install updates when
 * they run, so BEFORE ANY LAUNCH the probe asks the scratch login shell, with
 * the environment the app is given, `command -v` for every bare name and exits
 * 2 (UNREADABLE) if any resolves anywhere but its wrapper, and refuses (exit 2)
 * when a copy of any bare name sits in a folder the app's own scan searches
 * whatever its PATH (`extraBinDirsFor` in the checkout's src/main/tmux/
 * resolve.ts: /opt/homebrew/bin and /usr/local/bin), because the scan would
 * run that copy for its version; gemini is hidden for exactly that reason; every
 * probed registry row but the stand-ins is HIDDEN (build/hidden-agents.mjs,
 * `hiddenAgentsBesides`), the checkout's own overlay parser is asked first
 * (`hiddenAgentsPrecheck`), and the app's own `agents:list` is read back
 * (`standInsOnlyVerdict`) before any arm, a run whose answer is not ok being
 * UNREADABLE. After every launch the stand-in's own hello is required, and a
 * pane holding anything else is ended at once. AGY IS NEVER LAUNCHED: `agy`
 * is a wrapper around the stand-in. No real agent runs and NO MODEL TURN is
 * spent.
 *
 * HIS WORDS IN ARM (c) ARE TYPED WITH `send-keys`, which Tortie cannot see, on
 * purpose: Phase 328's invariant is asked over inputs carrying no own-text
 * facts (D328-5).
 *
 * THE ARMS, each at a built parent (`P353_PARENT_CHECKOUT`, launched first) and
 * at HEAD, one Electron after the other, never at once:
 *   328 (the `antigravity` row, its stand-in writing the 15 bytes every 2.0 s)
 *   (G-a) at rest: running at the parent, idle at HEAD, in main's status;
 *   (G-b) a turn it draws, then a silent tool on a terminal of its own (`Ss+`
 *         under /usr/bin/script), then its answer: running through the turn and
 *         the tool at both builds, then idle and one boundary at HEAD;
 *   (G-c) his numbered words in its input row under the writes (send-keys):
 *         needs_input read the same way at both builds;
 *   (G-d) a numbered question under the writes: the same at both;
 *   (G-e) a pi row and a shell row: idle at rest and never needs_input at both.
 * Boundaries are read as main's own transitions from running to idle or
 * needs_input (the monitor's `isTurnBoundary`), polled every 500 ms; the fold's
 * count is not read, because no channel may be added to read it.
 *
 * THE PHASE, AND THE PARENT (the probe review, 2026-11-05). tmux stamps output
 * in whole seconds and both the stand-in's writes and the monitor tick every
 * 2.0 s, so one launch keeps one phase, and whether its ticks see the writes as
 * output is that phase's (about one launch in four sees them as quiet, where
 * BOTH builds read idle). So the tmux wrapper also logs each tick's clock in ms
 * and every pane's activity stamp; G-a and G-b start the writes half a second
 * before a tick (`alignModes`), so every tick sees them as output; G-a's HEAD
 * idle is read only where its own ticks did; G-c and G-d are each held to the
 * parent's rule over their own launch's ticks (`predictNeeds`) and never to the
 * other build's launch. A parent arm is READ and never graded: one that does
 * not read as the arm's premise says is UNREADABLE, never a failure.
 *
 * WHAT IT REFUSES. It signals nothing it did not start: the launch is
 * `withElectron`'s, whose kill is in a `finally`; every stand-in, helper, tool
 * and terminal tool is ended by pid in this file's `finally`, TERM then KILL,
 * only while its command line is still the one recorded. It never runs `pkill`,
 * never names `-L gmux` (the helper's census is the only reader of his server),
 * installs nothing, reads no credential or conversation store, writes nothing
 * under the person's home, and reads his shell history's size and time only.
 *
 * VERIFIERS ONLY, under a lock slot. Builders write it and run only
 * `--grader-self-test`, which grades recorded fixtures and STARTS NOTHING.
 *
 *   npm run probe:p353:status
 *   P353_PARENT_CHECKOUT=/path/to/parent npm run probe:p353:status
 *   P353_ARMS=G-a,G-c npm run probe:p353:status          named arms only
 *   P353_KEEP=1 npm run probe:p353:status                keep the scratch world
 *   node build/p353/probe-status.mjs --grader-self-test  the graders; starts nothing
 *
 * WHAT IT WRITES. `out/p353/probe-status.json`: per build and arm a verdict and
 * a sentence, statuses, timings and the measured cadence, never a line of any
 * screen or a byte of what was typed. Exit 0 when every arm read as expected,
 * 1 when an arm failed, 2 when it could not run or an arm could not be READ.
 */

import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { userInfo } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { withElectron, withoutDevRenderer } from '../electron-run.mjs';
import { wsConnect, cdpEval } from '../cdp-client.mjs';
import { pickRendererTarget } from '../cdp-target.mjs';
import { AGENTS_LIST_EXPR, hiddenAgentsBesides, hiddenAgentsPrecheck, standInsOnlyVerdict, writeHiddenAgents } from '../hidden-agents.mjs';
import { BARE_NAME, STAND_IN_AGENTS, idleScreensFor, parentDetectDialog } from '../p321/stand-in.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const J = JSON.stringify;
const TAG = '[p353 status]';
const say = (line) => process.stdout.write(`${TAG} ${line}\n`);
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

// ---------------------------------------------------------------------------
// The graders: pure functions of the readings, so they can be proved alone
// ---------------------------------------------------------------------------

/** A ticks-per-second reading counts as the unfocused 2 s cadence. */
export const atTwo = (rate) => rate !== null && rate > 0.35 && rate < 0.65;
/** One verdict: true a pass, false a failure, null UNREADABLE. */
const v = (ok, said) => ({ ok, said });

/**
 * (G-a) Antigravity at rest under its writes: idle at HEAD on every poll after
 * it settled; at the parent, running.
 *
 * THE PROBE REVIEW (Phase 353). The parent reads output newer than QUIET_MS as
 * work, and tmux stamps output in whole seconds, so at the 2 s cadence whether
 * a tick sees the 2.0 s writes as output is a matter of where the ticks fall
 * against them: the Phase 328 entry's own model of the recording reads the
 * parent `running` on 76 to 156 of 162 ticks by phase, and a stand-in whose
 * timer and the monitor's both run at exactly 2 s keeps one phase for the whole
 * arm, so about one launch in four reads the parent idle throughout. So the
 * parent reproduces the fault when ANY poll at rest reads running, and a
 * parent that never does is UNREADABLE (its ticks fell where the writes look
 * quiet, so HEAD's idle proves nothing about the change), never a failure.
 */
export function gradeAgyRest(r, atParent) {
  if (!Array.isArray(r?.statuses) || r.statuses.length < 10) return v(null, 'too few polls of main\'s status');
  if (r.writing !== true) return v(null, 'the stand-in never wrote its 15 bytes, so there is nothing to read');
  if (atParent) {
    const running = r.statuses.filter((s) => s === 'running').length;
    return running > 0
      ? v(true, `${String(running)} of ${String(r.statuses.length)} polls at rest read running (the fault, reproduced)`)
      : v(null, `none of ${String(r.statuses.length)} polls at rest read running: this launch's ticks fell where the writes look quiet, so the fault did not show and HEAD's idle proves nothing`);
  }
  // The same phase reads HEAD's idle as nothing: a launch whose every tick saw
  // the writes as quiet reads idle at the parent too, so HEAD's idle asked
  // clause A nothing. HEAD's own ticks must have seen them as output at least
  // once (`predictNeeds`' clock, the tick log), or the arm is UNREADABLE.
  const seen = Array.isArray(r.ticks) ? r.ticks.filter((k) => Number.isFinite(k?.t) && Number.isFinite(k?.a) && k.t >= (r.from ?? -Infinity) && k.t <= (r.to ?? Infinity)) : null;
  if (seen === null || seen.length < 5) return v(null, `${String(seen?.length ?? 0)} tick(s) of this launch were logged at rest, so whether its ticks saw the writes as output cannot be said`);
  const asOutput = seen.filter((k) => k.t - k.a + NOW_LAG_MS <= QUIET_MS).length;
  if (asOutput === 0) return v(null, `none of the ${String(seen.length)} ticks at rest saw the writes as output (this launch's ticks fell where they look quiet, where the parent reads idle too), so HEAD's idle asked nothing`);
  const off = r.statuses.filter((s) => s !== 'idle');
  return off.length === 0
    ? v(true, `${String(r.statuses.length)} polls over ${String(r.seconds)} s at rest, every one idle, while ${String(asOutput)} of ${String(seen.length)} ticks saw the writes as output`)
    : v(false, `${String(off.length)} of ${String(r.statuses.length)} polls at rest read ${[...new Set(off)].join(', ')}, not idle`);
}

/** THE FIX ROUND: the polls of HEAD's antigravity turn that may come before it reads running (`gradeAgyTool`). */
const HEAD_TURN_GRACE_POLLS = 5;

/**
 * (G-b) A turn, a silent terminal tool, its answer: running through both at
 * HEAD, then idle with one boundary.
 *
 * THE PROBE REVIEW (Phase 353). What held the recorded agy running through its
 * silent tool at the parent was its output clock AND 6 to 11 % CPU; the
 * stand-in burns no CPU, so at the parent the tool stretch rests on the 2 s
 * writes alone, which a launch's tick phase can read as quiet (see G-a). So
 * the parent is graded on the turn, which draws, and its tool stretch is
 * printed; HEAD, whose clause B holds the tool whatever the phase, is graded on
 * all of it. A tool that died before its stretch ended is UNREADABLE.
 *
 * THE FIX ROUND (the status lens, 2026-11-05). At HEAD the writes that draw
 * nothing are no longer work, so the turn reads working once a capture lands
 * on its frame that differs from the resting screen (the stand-in's work
 * alternates the two), which can be one tick after the parent reads it: the
 * entry's own bound ("no later than one tick after the parent"). HEAD's turn is
 * therefore graded from its first `running` poll, which must come within
 * `HEAD_TURN_GRACE_POLLS` polls of the graded window's start (one 2 s tick of
 * 500 ms polls and one more for the call's own time); its one FAIL at HEAD
 * read `[idle, running x7]`, a turn that read running on its second poll.
 */
export function gradeAgyTool(r, atParent) {
  if (r?.toolAlive !== true) return v(null, 'the terminal tool never ran under the stand-in');
  if (r.toolAliveAfter === false) return v(null, 'the terminal tool had ended before its stretch did, so the polls after it read no tool');
  const turnOff = (r.turnStatuses ?? []).filter((s) => s !== 'running');
  if (atParent) {
    const toolRunning = (r.toolStatuses ?? []).filter((s) => s === 'running').length;
    return (r.turnStatuses ?? []).length > 0 && turnOff.length === 0
      ? v(true, `running through the turn; through the silent tool ${String(toolRunning)} of ${String((r.toolStatuses ?? []).length)} polls read running (the stand-in burns no CPU, so the parent's tool stretch rests on its writes alone)`)
      : v(null, `the parent read ${[...new Set(turnOff)].join(', ') || 'nothing'} while the stand-in drew its turn, so the turn the tool follows was not read`);
  }
  const turn = r.turnStatuses ?? [];
  const first = turn.indexOf('running');
  if (first === -1 || first > HEAD_TURN_GRACE_POLLS) {
    return v(false, `HEAD read the turn running ${first === -1 ? 'on no poll' : `only from its poll ${String(first + 1)}`}, later than one tick after the parent (${J(turn)})`);
  }
  const busy = [...turn.slice(first), ...(r.toolStatuses ?? [])].filter((s) => s !== 'running');
  if (busy.length > 0) return v(false, `${String(busy.length)} polls through the turn and the tool read ${[...new Set(busy)].join(', ')}, not running`);
  const rested = r.afterStatuses ?? [];
  return rested.at(-1) === 'idle' && r.boundaries === 1
    ? v(true, 'running through the turn and the silent tool, then idle with one boundary')
    : v(false, `after its answer HEAD read ${rested.at(-1) ?? 'nothing'} with ${String(r.boundaries)} boundaries, not idle with one`);
}

/** The monitor's own constants the prediction below re-derives with (src/main/activity/state-machine.ts). */
const QUIET_MS = 2_000;
/** How far the monitor's `now` can trail the wrapper's clock: its own list-panes and the tick's first awaits. */
const NOW_LAG_MS = 100;
/** How long after the words or the question are handed over a capture might still miss them. */
const DIALOG_LAG_MS = 250;
/** A raise in the last second of the watch may not reach a 500 ms poll. */
const RAISE_SETTLE_MS = 1_000;

/**
 * THE PROBE REVIEW (Phase 353). What the PARENT's numbered verdict raises over
 * one launch's own ticks. At the 2 s cadence the 2.0 s writes make every tick
 * either output (the dialog count reset and the dialog arm skipped, at the
 * parent and, by clause A, at HEAD) or quiet (the dialog counted) according to
 * where that launch's ticks fall against them, so two launches cannot be
 * compared with each other: about three times in eight they disagree with no
 * defect anywhere. Each launch is held to its own ticks instead, which is the
 * Phase 328 invariant itself, every needs_input decision equal to the
 * parent's over the same input.
 *
 * `ticks` is `[{ t, a }]` in ms: each monitor tick's wall clock as the tmux
 * wrapper logged it a moment BEFORE the monitor's own read (so the monitor's
 * `now` is t to t + NOW_LAG_MS) and the pane's `#{window_activity}`. A tick
 * COUNTS when it is quiet (now - a > QUIET_MS) and its capture holds the dialog
 * (taken after `dialogAt`); any other tick resets the count; two counting ticks
 * in a row raise needs_input. Answers `{ predicted, why }`: true, false, or
 * null when a tick too near a boundary decides it, the log holds a tick that
 * is not the monitor's, or the ticks are too few to say.
 */
export function predictNeeds(ticks, dialogAt, to) {
  if (!Array.isArray(ticks) || !Number.isFinite(dialogAt) || !Number.isFinite(to)) return { predicted: null, why: 'no tick log for the pane' };
  const usable = ticks.filter((k) => Number.isFinite(k?.t) && Number.isFinite(k?.a) && k.t <= to).sort((x, y) => x.t - y.t);
  const after = usable.filter((k) => k.t + NOW_LAG_MS >= dialogAt);
  if (after.length < 4) return { predicted: null, why: `only ${String(after.length)} logged tick(s) after the dialog was drawn` };
  for (let i = 1; i < usable.length; i += 1) {
    if (usable[i].t - usable[i - 1].t < 1_500) return { predicted: null, why: 'the tick log holds two reads under 1.5 s apart, so not every line is a monitor tick' };
  }
  const cls = (k) => {
    const age = k.t - k.a;
    const quiet = age > QUIET_MS ? 'yes' : age + NOW_LAG_MS <= QUIET_MS ? 'no' : 'maybe';
    const drawn = k.t >= dialogAt + DIALOG_LAG_MS ? 'yes' : k.t + NOW_LAG_MS < dialogAt ? 'no' : 'maybe';
    return { t: k.t, certain: quiet === 'yes' && drawn === 'yes', possible: quiet !== 'no' && drawn !== 'no' };
  };
  const c = usable.map(cls);
  let doubt = null;
  for (let i = 1; i < c.length; i += 1) {
    if (c[i - 1].certain && c[i].certain) {
      if (c[i].t <= to - RAISE_SETTLE_MS) return { predicted: true, why: `two quiet ticks in a row with the dialog drawn, the second at +${String(Math.round(c[i].t - dialogAt))} ms` };
      doubt ??= 'the first two quiet ticks in a row came in the last second of the watch';
    } else if (c[i - 1].possible && c[i].possible) {
      doubt ??= `a tick at +${String(Math.round(c[i].t - dialogAt))} ms sits within ${String(NOW_LAG_MS)} ms of the quiet line or of the draw`;
    }
  }
  if (doubt !== null) return { predicted: null, why: doubt };
  const quietTicks = c.filter((k) => k.certain).length;
  return { predicted: false, why: `no two quiet ticks in a row with the dialog drawn (${String(quietTicks)} quiet of ${String(c.length)})` };
}

/**
 * (G-c, G-d) His numbered words, or a numbered question, under the writes:
 * needs_input read exactly where the parent's own rule reads it over THIS
 * launch's ticks (`predictNeeds`). The words must read as a question by the
 * parent's own verdict on the pane, or the arm asked nothing. HEAD reading
 * otherwise is a failure of the Phase 328 invariant; the parent reading
 * otherwise means the prediction does not describe this arm, which is
 * UNREADABLE and never a failure.
 */
export function gradeAgyNeeds(r, atParent, what = 'the dialog under the writes') {
  if (r === null || r === undefined) return v(null, `${what} was not read`);
  if (r.numbered !== true) return v(null, `${what} does not read as a question by the parent's own verdict on the pane, so nothing was asked`);
  if (typeof r.amber !== 'boolean') return v(null, `${what} carries no reading of main's status`);
  const p = predictNeeds(r.ticks, r.dialogAt, r.to);
  if (p.predicted === null) return v(null, `${what}: the parent's rule cannot be read off this launch's ticks (${p.why})`);
  if (r.amber === p.predicted) return v(true, `${what}: ${r.amber ? 'needs_input' : 'never needs_input'}, as the parent's rule reads this launch's ticks (${p.why})`);
  const said = `${what}: main read ${r.amber ? 'needs_input' : 'no needs_input'} where the parent's rule over this launch's own ticks reads ${p.predicted ? 'needs_input' : 'none'} (${p.why})`;
  return atParent ? v(null, `${said}; at the parent, so the prediction does not describe this arm`) : v(false, said);
}

/** (G-e) The controls: idle at rest, never needs_input, at both builds. */
export function gradeControls(r) {
  if (!Array.isArray(r?.pi) || !Array.isArray(r?.shell) || r.pi.length === 0 || r.shell.length === 0) return v(null, 'the controls were not read');
  const ok = r.pi.at(-1) === 'idle' && r.shell.at(-1) === 'idle' && !r.pi.includes('needs_input') && !r.shell.includes('needs_input');
  return ok ? v(true, 'pi and the shell rest idle and never read needs_input') : v(false, `pi read ${r.pi.join(', ')} and the shell ${r.shell.join(', ')}`);
}

/** The run's own preconditions: every bare name the stand-in, only stand-ins resolved, the cadence 2 s. */
export function gradePreconditions(p) {
  if (p?.resolved !== true) return v(null, `a bare name resolves elsewhere: ${J(p?.elsewhere ?? [])}`);
  if (p?.agents?.ok !== true) return v(null, `the app's own agents:list: ${p?.agents?.said ?? 'not read'}`);
  if (!atTwo(p?.rate ?? null)) return v(null, `the monitor ticked ${String(p?.rate)} times a second with a session present, not every 2 s`);
  return v(true, `every bare name the stand-in, ${p.agents.said}, the monitor at ${String(p.rate)} ticks a second`);
}

// ---------------------------------------------------------------------------
// --grader-self-test: recorded fixtures, each grader asked over what must pass,
// what must fail and what it cannot read. It starts nothing.
// ---------------------------------------------------------------------------

function graderSelfTest() {
  // THE PROBE REVIEW (Phase 353). A launch whose stand-in writes from write0
  // and whose monitor ticks from tick0, both every 2.0 s, as tmux stamps them
  // (whole seconds): the dialog drawn half a second before the first tick and
  // the watch ending a second and a half after the last.
  const phaseRun = (write0, tick0, n) => {
    const ticks = [];
    for (let k = 0; k < n; k += 1) {
      const t = tick0 + 2_000 * k;
      const w = write0 + 2_000 * Math.floor((t - write0) / 2_000);
      ticks.push({ t, a: Math.floor(w / 1_000) * 1_000 });
    }
    return { dialogAt: tick0 - 500, to: tick0 + 2_000 * (n - 1) + 1_500, ticks };
  };
  const withTicks = (run, extra) => ({ ...run, ticks: [...run.ticks, ...extra] });
  /** The same launch at rest, its watch from just before the first tick to just after the last. */
  const restRun = (write0, tick0, n) => {
    const { ticks } = phaseRun(write0, tick0, n);
    return { from: tick0 - 100, to: tick0 + 2_000 * (n - 1) + 100, ticks };
  };
  const lastSecond = [{ t: 1_000_500, a: 1_000_000 }, { t: 1_002_500, a: 1_002_000 }, { t: 1_004_500, a: 1_002_000 }, { t: 1_006_500, a: 1_002_000 }];
  const beforeDraw = [
    { t: 1_006_000, a: 1_003_000 },
    { t: 1_008_000, a: 1_005_000 },
    { t: 1_010_500, a: 1_007_000 },
    { t: 1_012_500, a: 1_012_000 },
    { t: 1_014_500, a: 1_014_000 },
    { t: 1_016_500, a: 1_016_000 }
  ];
  const cases = [
    ['review G-c the only raise came in the last second of the watch: unreadable', () => predictNeeds(lastSecond, 1_000_000, 1_007_000).predicted, null],
    ['review G-c quiet ticks before the draw never count toward it', () => predictNeeds(beforeDraw, 1_010_000, 1_018_000).predicted, false],
    // The probe review: HEAD's two readings carry the launch's own ticks, in the
    // phase where they see the writes as output (the builder's two rows, as a
    // run now records them).
    ['G-a HEAD idle', () => gradeAgyRest({ writing: true, seconds: 40, statuses: Array(20).fill('idle'), ...restRun(1_000_100, 1_000_600, 20) }, false).ok, true],
    ['G-a HEAD running is a failure', () => gradeAgyRest({ writing: true, seconds: 40, statuses: [...Array(19).fill('idle'), 'running'], ...restRun(1_000_100, 1_000_600, 20) }, false).ok, false],
    ['review G-a HEAD idle in a launch whose ticks all saw the writes as quiet asked nothing', () => gradeAgyRest({ writing: true, seconds: 40, statuses: Array(20).fill('idle'), ...restRun(1_000_900, 1_002_850, 20) }, false).ok, null],
    ['review G-a HEAD idle with no tick log is unreadable', () => gradeAgyRest({ writing: true, seconds: 40, statuses: Array(20).fill('idle') }, false).ok, null],
    ['G-a parent running', () => gradeAgyRest({ writing: true, seconds: 40, statuses: Array(20).fill('running') }, true).ok, true],
    ['G-a no writes is unreadable', () => gradeAgyRest({ writing: false, statuses: Array(20).fill('idle') }, false).ok, null],
    ['G-b HEAD running then idle, one boundary', () => gradeAgyTool({ toolAlive: true, turnStatuses: ['running'], toolStatuses: ['running', 'running'], afterStatuses: ['running', 'idle'], boundaries: 1 }, false).ok, true],
    ['G-b HEAD idle during the tool is a failure', () => gradeAgyTool({ toolAlive: true, turnStatuses: ['running'], toolStatuses: ['running', 'idle'], afterStatuses: ['idle'], boundaries: 1 }, false).ok, false],
    ['G-b HEAD two boundaries is a failure', () => gradeAgyTool({ toolAlive: true, turnStatuses: ['running'], toolStatuses: ['running'], afterStatuses: ['idle'], boundaries: 2 }, false).ok, false],
    ['G-b no tool is unreadable', () => gradeAgyTool({ toolAlive: false }, false).ok, null],
    // THE FIX ROUND: HEAD's turn graded from its first running poll, within one tick.
    ['G-b HEAD: a turn read running from its second poll, the one FAIL the status lens read, passes', () => gradeAgyTool({ toolAlive: true, toolAliveAfter: true, turnStatuses: ['idle', 'running', 'running', 'running', 'running', 'running', 'running', 'running'], toolStatuses: ['running', 'running'], afterStatuses: ['running', 'idle'], boundaries: 1 }, false).ok, true],
    ['G-b HEAD: a turn never read running is a failure', () => gradeAgyTool({ toolAlive: true, toolAliveAfter: true, turnStatuses: ['idle', 'idle', 'idle'], toolStatuses: ['running'], afterStatuses: ['idle'], boundaries: 1 }, false).ok, false],
    ['G-b HEAD: a turn read running only after more than one tick is a failure', () => gradeAgyTool({ toolAlive: true, toolAliveAfter: true, turnStatuses: ['idle', 'idle', 'idle', 'idle', 'idle', 'idle', 'running'], toolStatuses: ['running'], afterStatuses: ['idle'], boundaries: 1 }, false).ok, false],
    ['G-b HEAD: idle again inside the turn after it read running is a failure', () => gradeAgyTool({ toolAlive: true, toolAliveAfter: true, turnStatuses: ['idle', 'running', 'idle', 'running'], toolStatuses: ['running'], afterStatuses: ['idle'], boundaries: 1 }, false).ok, false],
    // THE PROBE REVIEW (Phase 353). G-c and G-d, held to the parent's rule over
    // their own launch's ticks; the parent never graded; a missing reading
    // UNREADABLE. `run(write0, tick0, n)` is a launch whose writes start at
    // write0 and whose ticks at tick0, both every 2.0 s, as tmux stamps them.
    ['review G-c HEAD quiet phase, raised: the rule raises too', () => gradeAgyNeeds({ numbered: true, amber: true, ...phaseRun(1_000_900, 1_002_850, 20) }, false).ok, true],
    ['review G-c HEAD output phase, never raised: the rule never raises', () => gradeAgyNeeds({ numbered: true, amber: false, ...phaseRun(1_000_100, 1_000_600, 20) }, false).ok, true],
    ['review G-c HEAD raised where its own ticks read output: a failure', () => gradeAgyNeeds({ numbered: true, amber: true, ...phaseRun(1_000_100, 1_000_600, 20) }, false).ok, false],
    ['review G-d HEAD never raised where its own ticks read quiet: a failure', () => gradeAgyNeeds({ numbered: true, amber: false, ...phaseRun(1_000_900, 1_002_850, 20) }, false).ok, false],
    ['review G-c the parent off its own rule is unreadable, never a failure', () => gradeAgyNeeds({ numbered: true, amber: true, ...phaseRun(1_000_100, 1_000_600, 20) }, true).ok, null],
    ['review G-c two launches on different phases each pass (the old comparison read this as a failure)', () => [gradeAgyNeeds({ numbered: true, amber: true, ...phaseRun(1_000_900, 1_002_850, 20) }, false).ok, gradeAgyNeeds({ numbered: true, amber: false, ...phaseRun(1_000_100, 1_000_600, 20) }, true).ok].join(','), 'true,true'],
    ['review G-c ticks on the quiet line are unreadable', () => gradeAgyNeeds({ numbered: true, amber: false, ...phaseRun(1_000_200, 1_001_950, 20) }, false).ok, null],
    ['review G-c words that read as no question asked nothing', () => gradeAgyNeeds({ numbered: false, amber: false, ...phaseRun(1_000_100, 1_000_600, 20) }, false).ok, null],
    ['review G-c no tick log is unreadable', () => gradeAgyNeeds({ numbered: true, amber: false, dialogAt: 1_000_000, to: 1_040_000, ticks: [] }, false).ok, null],
    ['review G-c a line in the log that is not a tick is unreadable', () => gradeAgyNeeds({ numbered: true, amber: true, ...withTicks(phaseRun(1_000_900, 1_002_850, 20), [{ t: 1_003_350, a: 1_000_000 }]) }, false).ok, null],
    ['review G-c too few ticks after the draw are unreadable', () => predictNeeds(phaseRun(1_000_900, 1_002_850, 20).ticks, 1_040_000, 1_042_850).predicted, null],
    ['review G-a parent mixed polls reproduce the fault', () => gradeAgyRest({ writing: true, seconds: 40, statuses: [...Array(14).fill('running'), ...Array(6).fill('idle')] }, true).ok, true],
    ['review G-a parent idle throughout is unreadable, never a failure', () => gradeAgyRest({ writing: true, seconds: 40, statuses: Array(20).fill('idle') }, true).ok, null],
    ['review G-b parent: the turn read running, the tool stretch printed', () => gradeAgyTool({ toolAlive: true, toolAliveAfter: true, turnStatuses: ['running'], toolStatuses: ['running', 'idle', 'idle'], afterStatuses: ['idle'], boundaries: 1 }, true).ok, true],
    ['review G-b parent: a turn not read running is unreadable', () => gradeAgyTool({ toolAlive: true, toolAliveAfter: true, turnStatuses: ['idle'], toolStatuses: ['running'], afterStatuses: ['idle'], boundaries: 1 }, true).ok, null],
    ['review G-b a tool that ended before its stretch did is unreadable', () => gradeAgyTool({ toolAlive: true, toolAliveAfter: false, turnStatuses: ['running'], toolStatuses: ['running', 'idle'], afterStatuses: ['idle'], boundaries: 1 }, false).ok, null],
    ['G-e controls idle', () => gradeControls({ pi: ['running', 'idle'], shell: ['idle'] }).ok, true],
    ['G-e a control blocked', () => gradeControls({ pi: ['needs_input', 'idle'], shell: ['idle'] }).ok, false],
    ['preconditions held', () => gradePreconditions({ resolved: true, agents: { ok: true, said: 's' }, rate: 0.5 }).ok, true],
    ['preconditions a 1 s cadence is unreadable', () => gradePreconditions({ resolved: true, agents: { ok: true, said: 's' }, rate: 1 }).ok, null],
    ['preconditions a real agent resolved is unreadable', () => gradePreconditions({ resolved: true, agents: { ok: false, said: 'agy at /Users/x/.local/bin/agy' }, rate: 0.5 }).ok, null]
  ];
  let bad = 0;
  for (const [name, run, want] of cases) {
    let got;
    try {
      got = run();
    } catch (err) {
      got = `threw ${String(err?.message ?? err)}`;
    }
    const ok = got === want;
    if (!ok) bad += 1;
    say(`self-test ${ok ? 'ok  ' : 'FAIL'} ${name}: ${J(got)}${ok ? '' : `, want ${J(want)}`}`);
  }
  say(bad === 0 ? `grader self-test PASS: ${String(cases.length)} cases, nothing started` : `grader self-test FAIL: ${String(bad)} of ${String(cases.length)}`);
  return bad === 0;
}

if (process.argv.includes('--grader-self-test')) process.exit(graderSelfTest() ? 0 : 1);

// ---------------------------------------------------------------------------
// The run (verifiers only): everything below starts an Electron
// ---------------------------------------------------------------------------

function refuse(message) {
  process.stderr.write(`${TAG} ${message}\n`);
  process.exit(2);
}

const SOCKET = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
if (SOCKET === '' || SOCKET === 'gmux' || SOCKET === 'default' || !SOCKET.startsWith('gmux-p353s')) {
  refuse(`GMUX_TMUX_SOCKET is ${J(SOCKET)}, not a gmux-p353s harness socket. Run it as \`npm run probe:p353:status\`.`);
}
const HARNESS_DIR = (process.env['GMUX_HARNESS_DIR'] ?? '').trim();
if (HARNESS_DIR === '') refuse('no GMUX_HARNESS_DIR, so there is nowhere scratch to put the HOME and the profile.');
const PARENT = (process.env['P353_PARENT_CHECKOUT'] ?? '').trim();
const BUILDS = [...(PARENT === '' ? [] : [{ label: 'parent', checkout: resolve(PARENT), atParent: true }]), { label: 'head', checkout: ROOT, atParent: false }];
for (const b of BUILDS) {
  if (!existsSync(join(b.checkout, 'out', 'main', 'index.js'))) refuse(`${b.checkout} has no build at out/main/index.js. Build it first.`);
}
const ARMS = new Set(((process.env['P353_ARMS'] ?? '').trim() || 'G-a,G-b,G-c,G-d,G-e').split(',').map((x) => x.trim()));
const KEEP = (process.env['P353_KEEP'] ?? '') === '1';
const CEILING_MS = 3_000_000;
const COLS = 172;
const ROWS = 52;

/** His shell history, size and time only, never a byte of it. */
const historyStat = () =>
  ['.zsh_history', '.bash_history']
    .map((n) => {
      try {
        const s = statSync(join(userInfo().homedir, n));
        return `${String(s.size)} ${String(Math.floor(s.mtimeMs / 1000))}`;
      } catch {
        return 'none';
      }
    })
    .join('|');
const HISTORY_BEFORE = historyStat();

mkdirSync(join(HARNESS_DIR, 'p353s'), { recursive: true });
const RUN = realpathSync(join(HARNESS_DIR, 'p353s'));
const HOME = join(RUN, 'home');
const BIN = join(HOME, '.local', 'bin');
const NODE_BIN = join(RUN, 'nodebin');
const STANDIN_DIR = join(RUN, 'standin');
const PROJECT = join(RUN, 'project');
const TICK_LOG = join(RUN, 'monitor-ticks.log');
/**
 * THE PROBE REVIEW (Phase 353). Beside each tick's second, the wrapper logs
 * the tick's wall clock in ms and every pane's `#{window_activity}`, read a
 * moment before the monitor's own read, so G-c and G-d can be held to the
 * parent's rule over their own launch's ticks (`predictNeeds`).
 */
const PHASE_LOG = join(RUN, 'monitor-phase.log');
const TMUX_WRAPPER = join(RUN, 'tmux-counting');
const STAND_IN = join(ROOT, 'build', 'p321', 'stand-in.mjs');
const LOGIN_PATH = `${BIN}:/usr/bin:/bin:/usr/sbin:/sbin`;
const APP_PATH = `${BIN}:${NODE_BIN}:/usr/bin:/bin:/usr/sbin:/sbin`;
/**
 * The stand-ins: probe:p321's seven rows. GEMINI IS HIDDEN, not stood in: a
 * real `gemini` sits in /usr/local/bin on this Mac, which the app's own scan
 * searches whatever PATH it is handed (`extraBinDirsFor`), so a stand-in row
 * named gemini would be the real one run for its version.
 */
const STAND_INS = STAND_IN_AGENTS;
const HIDDEN_PREFIX = 'p353s';
const HIDDEN_IDS = hiddenAgentsBesides(STAND_INS);
/** Every Claude Code session variable and ZDOTDIR the probe inherited, removed from the app (probe:p314's rule). */
const STRIPPED = Object.fromEntries(
  Object.keys(process.env)
    .filter((name) => /^(?:CLAUDECODE|CLAUDE_)/.test(name) || name === 'ZDOTDIR' || name === 'TERM_SESSION_ID')
    .map((name) => [name, undefined])
);

const report = { builds: {}, comparisons: [], readings: {}, historyBefore: HISTORY_BEFORE };
let failures = 0;
let unreadable = 0;
const record = (build, id, verdict) => {
  report.builds[build] ??= [];
  report.builds[build].push({ id, ...verdict });
  if (verdict.ok === false) failures += 1;
  if (verdict.ok === null) unreadable += 1;
  say(`${verdict.ok === null ? 'UNREADABLE' : verdict.ok ? 'PASS' : 'FAIL'} [${build}] ${id}: ${verdict.said}`);
};
class Unreadable extends Error {}

// ---------------------------------------------------------------------------
// The processes this run started, ended by pid in the finally
// ---------------------------------------------------------------------------

const commandOf = (pid) => (spawnSync('/bin/ps', ['-p', String(pid), '-o', 'command='], { encoding: 'utf8' }).stdout ?? '').trim();
const ours = new Map();
const noteProc = (pid) => {
  if (Number.isInteger(pid) && pid > 1 && !ours.has(pid)) {
    const cmd = commandOf(pid);
    if (cmd !== '') ours.set(pid, cmd);
  }
};
/** A pane's process and every descendant, by parent pid, so the finally can end them. */
function noteTree(root) {
  const ps = spawnSync('/bin/ps', ['-Ao', 'pid=,ppid='], { encoding: 'utf8' });
  const kids = new Map();
  for (const line of (ps.stdout ?? '').split('\n')) {
    const m = /^\s*(\d+)\s+(\d+)/.exec(line);
    if (m === null) continue;
    const [pid, ppid] = [Number(m[1]), Number(m[2])];
    if (!kids.has(ppid)) kids.set(ppid, []);
    kids.get(ppid).push(pid);
  }
  const stack = [root];
  const seen = new Set();
  while (stack.length > 0) {
    const pid = stack.pop();
    if (seen.has(pid)) continue;
    seen.add(pid);
    noteProc(pid);
    for (const k of kids.get(pid) ?? []) stack.push(k);
  }
}
async function endByPid(pids) {
  const live = pids.filter((pid) => ours.has(pid) && commandOf(pid) === ours.get(pid));
  for (const pid of live) {
    try {
      process.kill(pid, 'SIGTERM');
    } catch {
      /* already gone */
    }
  }
  if (live.length === 0) return { asked: 0, killed: 0 };
  await sleep(1_500);
  const still = live.filter((pid) => commandOf(pid) === ours.get(pid));
  for (const pid of still) {
    try {
      process.kill(pid, 'SIGKILL');
    } catch {
      /* already gone */
    }
  }
  return { asked: live.length, killed: still.length };
}

// ---------------------------------------------------------------------------
// tmux, on this run's socket only
// ---------------------------------------------------------------------------

const vendoredOf = (checkout) =>
  [join(checkout, 'build', 'vendor', 'tmux', 'bin', 'tmux'), join(ROOT, 'build', 'vendor', 'tmux', 'bin', 'tmux')].find((p) => existsSync(p)) ?? null;
const VENDORED = vendoredOf(ROOT);
const tmuxRun = (args) => spawnSync(VENDORED ?? 'tmux', ['-L', SOCKET, ...args], { encoding: 'utf8', timeout: 15_000 });
function paneOf(tmuxName) {
  const r = tmuxRun(['list-panes', '-a', '-F', '#{session_name}\t#{pane_id}\t#{pane_pid}']);
  for (const line of (r.stdout ?? '').split('\n')) {
    const [name, paneId, pid] = line.split('\t');
    if (name === tmuxName && paneId !== undefined) return { paneId, panePid: Number(pid) };
  }
  return null;
}
const screenOf = (paneId) => (paneId === null ? '' : (tmuxRun(['capture-pane', '-p', '-J', '-t', paneId]).stdout ?? ''));

// ---------------------------------------------------------------------------
// The stand-ins
// ---------------------------------------------------------------------------

function hellos() {
  if (!existsSync(STANDIN_DIR)) return [];
  const out = [];
  for (const n of readdirSync(STANDIN_DIR)) {
    if (!/^hello-\d+\.json$/.test(n)) continue;
    try {
      out.push(JSON.parse(readFileSync(join(STANDIN_DIR, n), 'utf8')));
    } catch {
      /* written a beat ago */
    }
  }
  return out;
}
function stateOf(pid) {
  try {
    return JSON.parse(readFileSync(join(STANDIN_DIR, `state-${String(pid)}.json`), 'utf8'));
  } catch {
    return null;
  }
}
const cmdSeq = new Map();
async function tell(pid, ops, waitMs = 3_000) {
  const seq = (cmdSeq.get(pid) ?? 0) + 1;
  cmdSeq.set(pid, seq);
  writeFileSync(join(STANDIN_DIR, `cmd-${String(pid)}.json`), J({ seq, ops }));
  const started = Date.now();
  while (Date.now() - started < waitMs) {
    if ((stateOf(pid)?.seq ?? 0) >= seq) return stateOf(pid);
    await sleep(60);
  }
  throw new Unreadable(`the stand-in ${String(pid)} did not apply command ${String(seq)} within ${String(waitMs)} ms`);
}

const fx = (name) => ({ fixture: name });
const win = (file, id) => ({ window: file, id });
/** A numbered question an agent draws, and his numbered words, the parent's own verdict reading each. */
const Q2 = fx('antigravity-run-permission.txt');
const LONG = 'Do you want me to proceed?\n1. Yes, go ahead\n2. No, stop';

function writeWorld() {
  rmSync(RUN, { recursive: true, force: true });
  for (const d of [HOME, BIN, NODE_BIN, STANDIN_DIR, PROJECT]) mkdirSync(d, { recursive: true });
  for (const agent of STAND_INS) {
    const bare = BARE_NAME[agent];
    writeFileSync(
      join(BIN, bare),
      [
        '#!/bin/bash',
        `# probe:p353:status. NOT ${bare} and not an agent: build/p321/stand-in.mjs draws committed screens.`,
        `P321_AGENT='${agent}'; export P321_AGENT`,
        `P321_STANDIN_DIR='${STANDIN_DIR}'; export P321_STANDIN_DIR`,
        `P321_STANDIN_CEILING_MS='${String(CEILING_MS)}'; export P321_STANDIN_CEILING_MS`,
        `exec -a '${bare}' '${process.execPath}' '${STAND_IN}' "$@"`,
        ''
      ].join('\n'),
      'utf8'
    );
    chmodSync(join(BIN, bare), 0o755);
  }
  writeFileSync(join(BIN, 'npm'), '#!/bin/sh\necho "probe:p353:status refuses npm: nothing is installed during this run" >&2\nexit 1\n', 'utf8');
  chmodSync(join(BIN, 'npm'), 0o755);
  symlinkSync(process.execPath, join(NODE_BIN, 'node'));
  writeFileSync(join(HOME, '.zprofile'), `export PATH="${LOGIN_PATH}"\nexport HISTFILE=/dev/null\n`, 'utf8');
  writeFileSync(join(HOME, '.zshrc'), `export PATH="${LOGIN_PATH}"\nexport HISTFILE=/dev/null\nPROMPT='%~ %# '\n`, 'utf8');
  if (VENDORED !== null) {
    writeFileSync(
      TMUX_WRAPPER,
      [
        '#!/bin/sh',
        `case "$*" in *'#{window_activity}'*)`,
        `  /bin/date +%s >> '${TICK_LOG}'`,
        // The probe review: the tick's clock in ms and each pane's activity
        // stamp, a read of the run's own server only; a perl or tmux that
        // fails leaves a line the reader skips, so the prediction reads null.
        `  { /usr/bin/perl -MTime::HiRes=time -e 'printf("%.3f", time)' 2>/dev/null; printf ' '; '${VENDORED}' -L '${SOCKET}' list-panes -a -F '#{pane_id}=#{window_activity}' 2>/dev/null | /usr/bin/tr '\\n' ' '; printf '\\n'; } >> '${PHASE_LOG}' ;;`,
        'esac',
        `exec '${VENDORED}' "$@"`,
        ''
      ].join('\n'),
      'utf8'
    );
    chmodSync(TMUX_WRAPPER, 0o755);
  }
  const git = (args) => spawnSync('/usr/bin/git', args, { cwd: PROJECT, encoding: 'utf8', env: { ...process.env, HOME } });
  git(['init', '-q']);
  writeFileSync(join(PROJECT, 'note.txt'), 'hello\n');
  git(['add', '-A']);
  git(['-c', 'user.email=p@x', '-c', 'user.name=p', 'commit', '-qm', 'seed']);
}

/**
 * The folders the app's own scan searches whatever PATH it is handed, read out
 * of a checkout's `extraBinDirsFor` (src/main/tmux/resolve.ts): its absolute
 * ones, being /opt/homebrew/bin and /usr/local/bin today. A copy of a stand-in's
 * bare name there is a real agent the scan would run for its version.
 */
function shadowCopies(checkout) {
  let text = '';
  try {
    text = readFileSync(join(checkout, 'src', 'main', 'tmux', 'resolve.ts'), 'utf8');
  } catch {
    return { ok: false, copies: [], why: 'resolve.ts could not be read' };
  }
  const at = text.indexOf('export function extraBinDirsFor(');
  if (at === -1) return { ok: false, copies: [], why: 'extraBinDirsFor is not in resolve.ts' };
  const body = text.slice(at, text.indexOf('\n}\n', at));
  const dirs = [...new Set([...body.matchAll(/'(\/[^']*)'/g)].map((m) => m[1]))];
  const copies = [];
  for (const dir of dirs) {
    let entries = [];
    try {
      entries = readdirSync(dir);
    } catch (err) {
      if (err?.code !== 'ENOENT') return { ok: false, copies, why: `${dir} could not be read` };
      continue;
    }
    for (const agent of STAND_INS) if (entries.includes(BARE_NAME[agent])) copies.push(join(dir, BARE_NAME[agent]));
  }
  return { ok: copies.length === 0, copies, why: copies.length === 0 ? '' : `a copy of a stand-in's name sits where the scan looks: ${copies.join(', ')}` };
}

/** Asked of the login shell the app will ask, with the environment the app will be given. */
function resolvedToStandIns() {
  const env = { ...process.env, HOME, ZDOTDIR: HOME, HISTFILE: '/dev/null', PATH: LOGIN_PATH };
  for (const name of Object.keys(STRIPPED)) delete env[name];
  const elsewhere = [];
  for (const agent of STAND_INS) {
    const bare = BARE_NAME[agent];
    const r = spawnSync('/bin/zsh', ['-lic', `command -v ${bare}`], { encoding: 'utf8', timeout: 30_000, env });
    const got = (r.stdout ?? '').trim().split('\n').pop() ?? '';
    if (got !== join(BIN, bare)) elsewhere.push(`${bare} → ${got || 'nothing'}`);
  }
  return { resolved: elsewhere.length === 0, elsewhere };
}

// ---------------------------------------------------------------------------
// One build's run
// ---------------------------------------------------------------------------

/** MAIN's node inspector, whose url the app printed because it started with `--inspect=0`. */
async function cdpForMain(handle, timeoutMs) {
  const started = Date.now();
  for (;;) {
    const m = /Debugger listening on (ws:\/\/127\.0\.0\.1:\d+\/[0-9a-f-]+)/i.exec(handle.text());
    if (m !== null) {
      try {
        return await wsConnect(m[1]);
      } catch {
        /* printed a beat before it listens */
      }
    }
    if (Date.now() - started > timeoutMs) throw new Error('the main process inspector never appeared');
    await sleep(300);
  }
}
async function cdpForWindow(profile, timeoutMs) {
  const started = Date.now();
  let why = 'no DevToolsActivePort yet';
  for (;;) {
    try {
      const port = Number(readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0].trim());
      if (Number.isFinite(port) && port > 0) {
        const list = await (await fetch(`http://127.0.0.1:${String(port)}/json/list`)).json();
        const picked = pickRendererTarget(list);
        if (picked.target !== null) return await wsConnect(picked.target.webSocketDebuggerUrl);
        why = picked.why;
      }
    } catch (err) {
      why = String(err?.message ?? err);
    }
    if (Date.now() - started > timeoutMs) throw new Error(`no app window: ${why}`);
    await sleep(300);
  }
}

/** The focus, taken away for real before the app's own blur (probe:p321's fix). */
const BLUR = `(async () => {
  const load = typeof require === 'function' ? require : process.mainModule.require.bind(process.mainModule);
  const { app, BrowserWindow } = load('electron');
  const ws = BrowserWindow.getAllWindows().filter((w) => !w.isDestroyed());
  const focused = () => ws.filter((w) => w.isFocused()).length;
  const wait = (ms) => new Promise((done) => setTimeout(done, ms));
  if (ws[0] !== undefined && ws[0].getSize()[0] < 1900) ws[0].setSize(1920, 1200);
  for (const w of ws) if (w.isFocused()) w.blur();
  for (let i = 0; i < 20 && focused() > 0; i += 1) await wait(100);
  if (focused() > 0 && process.platform === 'darwin') { app.hide(); for (let i = 0; i < 30 && focused() > 0; i += 1) await wait(100); }
  app.emit('browser-window-blur', {}, ws[0]);
  return String(focused()) + ' focused after';
})()`;

async function runBuild(build) {
  const PROFILE = join(RUN, `profile-${build.label}`);
  mkdirSync(PROFILE, { recursive: true });
  const pre = hiddenAgentsPrecheck({ checkout: build.checkout, prefix: HIDDEN_PREFIX, home: HOME, userPath: `${LOGIN_PATH}:${APP_PATH}`, standIns: STAND_INS });
  report.readings[`${build.label} hidden precheck`] = { ok: pre.ok, said: pre.said };
  if (!pre.ok) {
    record(build.label, 'preconditions', v(null, `the hidden agents' precheck refused the launch: ${pre.said}`));
    return null;
  }
  writeHiddenAgents(PROFILE, HIDDEN_PREFIX, HIDDEN_IDS);
  const readings = {};
  let shim = 0;
  let appPid = 0;
  await withElectron(
    {
      label: `p353s-${build.label}`,
      userDataDir: PROFILE,
      cwd: build.checkout,
      tmuxSocket: SOCKET,
      args: [
        '--remote-debugging-port=0',
        '--use-mock-keychain',
        '--inspect=0',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-background-timer-throttling'
      ],
      env: withoutDevRenderer({
        ...STRIPPED,
        HOME,
        ZDOTDIR: HOME,
        HISTFILE: '/dev/null',
        PATH: APP_PATH,
        GMUX_TMUX_SOCKET: SOCKET,
        GMUX_PROBES: '1',
        GMUX_LOG_FILE: '1',
        GMUX_SPECSTORY_NO_CLOUD: '1',
        GMUX_HARNESS_DIR: HARNESS_DIR,
        ...(VENDORED === null ? {} : { GMUX_TMUX_BIN: TMUX_WRAPPER })
      }),
      graceMs: 8_000,
      ceilingMs: CEILING_MS
    },
    async (handle) => {
      shim = handle.pid;
      try {
        await drive(build, handle, PROFILE, readings);
      } finally {
        try {
          appPid = handle.appPid();
        } catch {
          /* recorded below */
        }
      }
    }
  );
  report.readings[`${build.label} pids`] = { shim, app: appPid };
  return readings;
}

async function drive(build, handle, profile, readings) {
  const cdp = await cdpForWindow(profile, 150_000);
  await cdp.call('Runtime.enable');
  for (let i = 0; i < 200; i += 1) {
    if ((await cdpEval(cdp, 'window.__gmuxP95 !== undefined && window.__gmuxP202 !== undefined && window.__gmuxP93 !== undefined && window.gmux !== undefined')) === true) break;
    await sleep(300);
  }
  const agents = standInsOnlyVerdict(JSON.parse(await cdpEval(cdp, AGENTS_LIST_EXPR, 120_000)), { standIns: STAND_INS, under: RUN });
  await cdpEval(cdp, `window.__gmuxP93.setup(${J({ path: PROJECT, names: [] })}).then(() => true)`);
  let mainCdp = null;
  try {
    mainCdp = await cdpForMain(handle, 60_000);
  } catch {
    mainCdp = null;
  }
  const blur = async () => {
    if (mainCdp === null) return 'no inspector';
    const got = await mainCdp.call('Runtime.evaluate', { expression: BLUR, includeCommandLineAPI: true, returnByValue: true, awaitPromise: true });
    return String(got.result?.result?.value ?? '');
  };
  await blur().catch(() => undefined);
  const ticks = () => (existsSync(TICK_LOG) ? readFileSync(TICK_LOG, 'utf8').split('\n').filter(Boolean).map(Number) : []);
  /** THE PROBE REVIEW: every logged tick's clock, in ms, oldest first. */
  const tickClock = () =>
    existsSync(PHASE_LOG)
      ? readFileSync(PHASE_LOG, 'utf8').split('\n').map((l) => Number(l.trim().split(/\s+/)[0]) * 1000).filter((t) => Number.isFinite(t) && t > 0)
      : [];
  /**
   * THE PROBE REVIEW (Phase 353). Starts the stand-in's 2.0 s writes so each
   * lands about `leadMs` before a monitor tick, read off this launch's own tick
   * log: then the output is under QUIET_MS old at every tick at both builds
   * (the lead plus the stamp's truncation, under a second), so G-a and G-b read
   * the phase they exist for and never the one where both builds read idle.
   * The stand-in reads its commands every 50 ms; the monitor's interval is a
   * fixed 2 s. With no tick log to align to, the writes start where they fall
   * and the graders read the phase off the log.
   */
  async function alignModes(one, leadMs = 500) {
    await tell(one.pid, [{ op: 'modes', everyMs: 0 }]);
    const clock = tickClock();
    if (clock.length < 3) {
      await tell(one.pid, [{ op: 'modes', everyMs: 2_000 }]);
      return false;
    }
    // A tick far enough ahead that the command can be written before it.
    let target = clock[clock.length - 1];
    while (target - leadMs - 2_000 < Date.now() + 300) target += 2_000;
    await sleep(Math.max(0, target - leadMs - 2_000 - 25 - Date.now()));
    await tell(one.pid, [{ op: 'modes', everyMs: 2_000 }]);
    return true;
  }
  /** THE PROBE REVIEW: one pane's logged ticks between two moments, `{ t, a }` in ms. */
  const phaseTicksOf = (paneId, fromMs, toMs) => {
    if (paneId === null || !existsSync(PHASE_LOG)) return [];
    const out = [];
    for (const line of readFileSync(PHASE_LOG, 'utf8').split('\n')) {
      const [first, ...rest] = line.trim().split(/\s+/);
      const t = Number(first) * 1000;
      if (!Number.isFinite(t) || t < fromMs || t > toMs) continue;
      const hit = rest.find((x) => x.startsWith(`${paneId}=`));
      if (hit === undefined) continue;
      const a = Number(hit.slice(paneId.length + 1)) * 1000;
      if (Number.isFinite(a) && a > 0) out.push({ t, a });
    }
    return out;
  };
  const rateBetween = (from, to) => {
    if (VENDORED === null || to - from < 5_000) return null;
    const a = Math.ceil(from / 1000);
    const b = Math.floor(to / 1000);
    return Math.round((ticks().filter((t) => t >= a && t < b).length * 100) / Math.max(1, b - a)) / 100;
  };

  const mainSessions = async () =>
    JSON.parse(await cdpEval(cdp, 'window.gmux.sessions.list().then((s) => JSON.stringify(s.map((x) => ({ id: x.id, name: x.name, status: x.status, tmuxName: x.tmuxName }))))'));
  const statusOf = async (one) => (await mainSessions()).find((s) => s.id === one.id)?.status ?? 'gone';
  /** Poll main every 500 ms for `ms`: every status in order, and the transitions that are turn boundaries. */
  async function watch(one, ms) {
    const statuses = [];
    let boundaries = 0;
    let prev = null;
    const until = Date.now() + ms;
    while (Date.now() < until) {
      const s = await statusOf(one);
      statuses.push(s);
      if (prev === 'running' && (s === 'idle' || s === 'needs_input')) boundaries += 1;
      prev = s;
      await sleep(500);
    }
    return { statuses, boundaries };
  }

  async function launch(name, agent) {
    const before = new Set(hellos().map((h) => h.pid));
    await cdpEval(cdp, `window.__gmuxP202.createSession(${J(name)}, ${J(agent)}).then(() => 'ok').catch((e) => 'ERR ' + String(e && e.message || e))`);
    let row;
    for (let i = 0; i < 80 && row === undefined; i += 1) {
      row = (await mainSessions()).find((s) => s.name === name);
      if (row === undefined) await sleep(250);
    }
    if (row === undefined) throw new Unreadable(`Tortie never created the ${agent} session ${name}`);
    const pane = paneOf(row.tmuxName);
    if (pane !== null) noteTree(pane.panePid);
    if (agent === 'shell') return { name, agent, id: row.id, pid: 0, pane: pane?.paneId ?? null, panePid: pane?.panePid ?? 0 };
    let hello;
    for (let i = 0; i < 120 && hello === undefined; i += 1) {
      hello = hellos().find((h) => !before.has(h.pid) && h.agent === agent);
      if (hello === undefined) await sleep(250);
    }
    if (hello === undefined) {
      await cdpEval(cdp, `window.gmux.sessions.kill(${J(row.id)}).then(() => 'ok').catch(() => 'err')`);
      throw new Unreadable(`${name}: the ${BARE_NAME[agent]} Tortie launched never said hello as the stand-in; the session was ended at once`);
    }
    noteProc(hello.pid);
    if (pane !== null) tmuxRun(['resize-window', '-t', pane.paneId, '-x', String(COLS), '-y', String(ROWS)]);
    return { name, agent, id: row.id, pid: hello.pid, pane: pane?.paneId ?? null, panePid: pane?.panePid ?? 0 };
  }
  const end = async (ones) => {
    for (const one of ones) {
      if (one.panePid > 0) noteTree(one.panePid);
      await cdpEval(cdp, `window.gmux.sessions.kill(${J(one.id)}).then(() => 'ok').catch(() => 'err')`);
    }
    await sleep(1_500);
  };
  /** One section: its span's cadence measured, the sessions it started ended. */
  async function section(id, fn) {
    if (!ARMS.has(id)) return;
    await blur().catch(() => undefined);
    const live = [];
    const from = Date.now();
    let reading = null;
    try {
      reading = await fn(live);
    } catch (err) {
      reading = { unreadable: err instanceof Unreadable ? err.message : `it threw: ${String(err?.message ?? err)}` };
    } finally {
      await end(live);
    }
    readings[id] = { ...reading, rate: rateBetween(from, Date.now()) };
  }

  // ---- the preconditions, and the cadence measured with one settled shell ----
  const metronome = await launch('metronome', 'shell');
  const measuredFrom = Date.now();
  await sleep(20_000);
  readings.preconditions = { resolved: true, agents, rate: rateBetween(measuredFrom, Date.now()) };
  if (gradePreconditions(readings.preconditions).ok !== true) {
    await end([metronome]);
    cdp.close();
    mainCdp?.close();
    return;
  }

  // ---- 328 (G-a): antigravity at rest under its writes ----
  const agyAtRest = async (live, name, align = false) => {
    const one = await launch(name, 'antigravity');
    live.push(one);
    const idle = idleScreensFor('antigravity');
    if (idle.idle === null) throw new Unreadable(idle.why);
    await tell(one.pid, [{ op: 'draw', screen: idle.idle }, { op: 'modes', everyMs: 2_000 }]);
    // The probe review: G-a and G-b put the writes where every tick sees them
    // as output (`alignModes`); G-c and G-d leave them where they fall, and are
    // graded against the parent's rule over whatever phase that is.
    const aligned = align ? await alignModes(one) : null;
    return { one, idle, aligned };
  };
  await section('G-a', async (live) => {
    const { one } = await agyAtRest(live, 'g-agy-rest', true);
    await sleep(15_000);
    const from = Date.now();
    const seen = await watch(one, 40_000);
    const to = Date.now();
    const before = screenOf(one.pane);
    await sleep(2_500);
    // The probe review: this launch's own ticks, so HEAD's idle is read only
    // where its ticks saw the writes as output (`gradeAgyRest`).
    return { writing: true, seconds: 40, statuses: seen.statuses, screenStill: before === screenOf(one.pane), from, to, ticks: phaseTicksOf(one.pane, from, to) };
  });

  // ---- 328 (G-b): a turn, a silent terminal tool, its answer ----
  await section('G-b', async (live) => {
    const { one, idle } = await agyAtRest(live, 'g-agy-tool', true);
    await sleep(12_000);
    await tell(one.pid, [{ op: 'work', ms: 6_000, screens: [idle.idle, idle.alt ?? idle.idle], then: idle.alt ?? idle.idle }]);
    const turn = await watch(one, 6_000);
    await tell(one.pid, [{ op: 'terminal-tool', seconds: 25, afterMs: 0 }]);
    await sleep(1_000);
    const toolAlive = (stateOf(one.pid)?.terminals ?? []).some((t) => t.live === true);
    if (one.panePid > 0) noteTree(one.panePid);
    const tool = await watch(one, 22_000);
    // The probe review: the tool still alive when its stretch ended, or the
    // polls after it died read no tool at all.
    const toolAliveAfter = (stateOf(one.pid)?.terminals ?? []).some((t) => t.live === true);
    await sleep(4_000);
    await tell(one.pid, [{ op: 'draw', screen: idle.idle }]);
    const after = await watch(one, 25_000);
    return { toolAlive, toolAliveAfter, turnStatuses: turn.statuses.slice(4), toolStatuses: tool.statuses, afterStatuses: after.statuses, boundaries: after.boundaries };
  });

  // ---- 328 (G-c): his numbered words under the writes, typed where Tortie cannot see (D328-5) ----
  await section('G-c', async (live) => {
    const { one } = await agyAtRest(live, 'g-agy-words');
    await tell(one.pid, [{ op: 'input', on: true }]);
    await sleep(12_000);
    if (one.pane !== null) {
      for (const line of LONG.split('\n')) {
        tmuxRun(['send-keys', '-t', one.pane, '-l', '--', line]);
        tmuxRun(['send-keys', '-t', one.pane, '-H', '0a']);
      }
    }
    // The probe review: the words read as a question by the parent's verdict,
    // and this launch's own ticks, so the reading is held to the parent's rule
    // over them (`gradeAgyNeeds`) and not to another launch's.
    const dialogAt = Date.now();
    await sleep(300);
    const numbered = one.pane !== null && parentDetectDialog(screenOf(one.pane));
    const seen = await watch(one, 40_000);
    const to = Date.now();
    return { amber: seen.statuses.includes('needs_input'), numbered, dialogAt, to, ticks: phaseTicksOf(one.pane, dialogAt - 8_000, to) };
  });

  // ---- 328 (G-d): a numbered question under the writes ----
  await section('G-d', async (live) => {
    const { one } = await agyAtRest(live, 'g-agy-question');
    await sleep(12_000);
    await tell(one.pid, [{ op: 'draw', screen: Q2 }]);
    const dialogAt = Date.now();
    await sleep(300);
    const numbered = one.pane !== null && parentDetectDialog(screenOf(one.pane));
    const seen = await watch(one, 40_000);
    const to = Date.now();
    return { amber: seen.statuses.includes('needs_input'), numbered, dialogAt, to, ticks: phaseTicksOf(one.pane, dialogAt - 8_000, to) };
  });

  // ---- 328 (G-e): the controls ----
  await section('G-e', async (live) => {
    const pi = await launch('g-pi', 'pi');
    live.push(pi);
    const shell = await launch('g-shell', 'shell');
    live.push(shell);
    await tell(pi.pid, [{ op: 'draw', screen: idleScreensFor('pi').idle }]);
    const piSeen = await watch(pi, 30_000);
    const shellSeen = await watch(shell, 6_000);
    return { pi: piSeen.statuses, shell: shellSeen.statuses };
  });

  await end([metronome]);
  cdp.close();
  mainCdp?.close();
}

// ---------------------------------------------------------------------------

const GRADE = {
  'G-a': (r, p) => gradeAgyRest(r, p),
  'G-b': (r, p) => gradeAgyTool(r, p),
  // The probe review: each build held to the parent's rule over its own ticks,
  // never to the other build's launch, whose ticks fall elsewhere.
  'G-c': (r, p) => gradeAgyNeeds(r, p, 'his numbered words under the writes'),
  'G-d': (r, p) => gradeAgyNeeds(r, p, 'a numbered question under the writes'),
  'G-e': (r) => gradeControls(r)
};

let ran = false;
let preconditionsOk = false;
try {
  writeWorld();
  const resolution = resolvedToStandIns();
  report.readings.resolution = resolution;
  const shadows = BUILDS.map((b) => ({ label: b.label, ...shadowCopies(b.checkout) }));
  report.readings.shadows = shadows;
  const shadowed = shadows.find((x) => !x.ok);
  if (shadowed !== undefined) {
    record('run', 'preconditions', v(null, `${shadowed.label}: ${shadowed.why}; nothing is launched, because the app's scan would run it for its version`));
  } else if (!resolution.resolved) {
    record('run', 'preconditions', v(null, `a bare name resolves elsewhere: ${resolution.elsewhere.join(', ')}; nothing is launched`));
  } else {
    preconditionsOk = true;
    const byBuild = {};
    for (const build of BUILDS) {
      const readings = await runBuild(build);
      byBuild[build.label] = readings;
      if (readings === null) continue;
      report.readings[build.label] = readings;
      const pre = gradePreconditions(readings.preconditions ?? {});
      record(build.label, 'preconditions', pre);
      if (pre.ok !== true) continue;
      for (const [id, grade] of Object.entries(GRADE)) {
        if (!ARMS.has(id)) continue;
        const r = readings[id];
        if (r === undefined) continue;
        if (typeof r.unreadable === 'string') {
          record(build.label, id, v(null, r.unreadable));
          continue;
        }
        const g0 = grade(r, build.atParent);
        // THE PROBE REVIEW (Phase 353). The parent is READ, never graded: a
        // parent that does not read as an arm's premise says leaves that arm's
        // side by side unread, which is UNREADABLE and never this build's
        // failure (a FAIL at the parent once made the whole run exit 1).
        const g = build.atParent && g0.ok === false ? v(null, `at the parent, read and not graded: ${g0.said}`) : g0;
        record(build.label, id, g.ok !== null && !atTwo(r.rate ?? null) ? v(null, `${g.said}, but the monitor ticked ${String(r.rate)} times a second across this arm, not every 2 s`) : g);
      }
    }
    // G-c and G-d are graded per build above, each against the parent's rule
    // over its own launch's ticks; the two launches' readings are printed side
    // by side and never compared, since their ticks fall in different places
    // against the 2 s writes.
    if (byBuild.parent !== undefined && byBuild.head !== undefined && byBuild.parent !== null && byBuild.head !== null) {
      for (const id of ['G-c', 'G-d']) {
        if (!ARMS.has(id)) continue;
        say(`${id}: HEAD ${byBuild.head[id]?.amber === true ? 'needs_input' : 'no needs_input'}, the parent ${byBuild.parent[id]?.amber === true ? 'needs_input' : 'no needs_input'}; each graded on its own ticks`);
      }
    }
    ran = true;
  }
} catch (err) {
  record('run', 'the run', v(false, `it threw: ${String(err?.message ?? err)}`));
} finally {
  // THE STAND-INS, THEIR HELPERS, TOOLS AND TERMINAL TOOLS, by pid. The
  // teardown ended the scratch server, which hangs every pane up, and each
  // stand-in ends its own children in its finally; anything this run recorded
  // that is still running with the same command line is ended here.
  for (const n of existsSync(STANDIN_DIR) ? readdirSync(STANDIN_DIR) : []) {
    const m = /^state-(\d+)\.json$/.exec(n);
    if (m === null) continue;
    const st = stateOf(Number(m[1]));
    for (const k of [...(st?.helpers ?? []), ...(st?.tools ?? []), ...(st?.terminals ?? [])]) if (k.live === true) noteProc(k.pid);
  }
  const ended = await endByPid([...ours.keys()]);
  report.readings.processes = { seen: ours.size, leftAfterTeardown: ended.asked, neededKill: ended.killed, survivors: [...ours].filter(([pid, cmd]) => commandOf(pid) === cmd).length };
  if (!KEEP) rmSync(RUN, { recursive: true, force: true });
}

const ps = spawnSync('/bin/ps', ['-Ao', 'pid,ppid,rss,comm'], { encoding: 'utf8' });
const electrons = (ps.stdout ?? '').split('\n').filter((l) => /Electron|Tortie$|chrome_crashpad/.test(l) && !/defunct/.test(l));
const shims = Object.values(report.readings).filter((x) => x !== null && typeof x === 'object' && 'shim' in x);
const ofThisRun = electrons.filter((l) => {
  const [pid, ppid] = l.trim().split(/\s+/).map(Number);
  return shims.some((s) => [s.shim, s.app].includes(pid) || [s.shim, s.app].includes(ppid));
});
report.readings.electron = { lines: electrons.length, ofThisRun: ofThisRun.length };
record('run', 'no Electron of this run is left', ofThisRun.length === 0 ? v(true, `${String(electrons.length)} Electron line(s) on the machine, none of this run`) : v(false, `${String(ofThisRun.length)} of this run`));
record('run', 'no stand-in or tool of this run is left', (report.readings.processes?.survivors ?? 0) === 0 ? v(true, `${String(report.readings.processes?.seen ?? 0)} seen, none left`) : v(false, `${String(report.readings.processes?.survivors)} left`));
report.historyAfter = historyStat();
record('run', 'his shell history did not move', report.historyAfter === HISTORY_BEFORE ? v(true, 'size and time the same before and after') : v(null, `moved across the run (${HISTORY_BEFORE} → ${report.historyAfter}); his own terminals append on their own, so read it again before calling it this run's`));

const OUT = join(ROOT, 'out', 'p353');
mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'probe-status.json'), `${J(report, null, 1)}\n`, 'utf8');
say(`wrote ${join(OUT, 'probe-status.json')}`);
if (!preconditionsOk || !ran) process.exit(2);
if (failures > 0) {
  say(`probe:p353:status FAILED ${String(failures)} arm(s)`);
  process.exit(1);
}
if (unreadable > 0) {
  say(`probe:p353:status could not READ ${String(unreadable)} arm(s); that is not a pass`);
  process.exit(2);
}
say('probe:p353:status OK');
process.exit(0);
