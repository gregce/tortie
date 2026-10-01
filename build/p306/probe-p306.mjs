#!/usr/bin/env node
/**
 * probe-p306.mjs. THE PHASE 306 APP RUN: a remote project tab a person closed
 * stays closed (GitHub issue 35, "Tortie remote project always comes back").
 *
 * The reporter: "I close the project … But then it comes back. Sometimes
 * immediately. Sometimes only after I restart." The re-home in
 * src/main/machines/remote-rehome.ts opened a tab at the end of every completed
 * machine pass for every folder on a machine whose `remote_projects` row was
 * absent, and never asked why it was absent. Phase 306 asks the stamp a close
 * writes (`projectTabClosedFor`), and a create on that machine clears it.
 * build/p306/SPEC.md §8 is this file's specification and §9 its side-by-side.
 *
 * TWO Electrons, one after the other on ONE scratch profile, never both at
 * once, each through build/electron-run.mjs's `withElectron`, because the
 * reporter's second timing is a RELAUNCH and only a second launch on the same
 * profile can measure it. A scratch HOME, the tmux socket
 * build/harness-socket.mjs hands it (`gmux-p306-…`), and the LOOPBACK scratch
 * machine build/with-scratch-machine.mjs starts around this file (its own sshd
 * on 127.0.0.1, its own keys and agent, its own TMUX_TMPDIR). Every session is
 * a `shell`; no agent starts and no token is spent.
 *
 * ## The drives, every one present at the parent (75edbf5e)
 *
 *   window.__gmuxP95  machineUp, openRemote (the person's Open on machine)
 *   window.__p293     open, state, createSession, closeTab (the real
 *                     closeProject, its confirm, then finishCloseProject),
 *                     menuItemsFor, runMenuItem, killOutOfBand
 *   window.gmux       main's own answers: projects.list(), sessions.list(),
 *                     sessions.rename, sessions.create, machines.prepare
 *
 * So the same file measures the parent: `P306_PARENT_CHECKOUT=<a BUILT
 * checkout>` launches that checkout with it as the cwd.
 *
 * ## THE PASS WITNESS, and why "absent" needs one
 *
 * A folder absent from main's list proves nothing unless a completed pass ran
 * after the step being graded. So "wait for a pass" always means: RENAME the
 * one feed-only far session the fixture made for this (`p306-wit`, in a folder
 * of its own on the loopback machine's scratch server) with a synchronous
 * `tmux rename-session`, then wait, ceiling 90 s, until main's
 * `sessions.list()` shows that session under its new tmux name, then 2.5 s for
 * the broadcast that pass sends and any read the window makes of it. A pass
 * stores its rows and runs the re-home in one synchronous run before anything
 * can read them, so a list holding the new name was read after the re-home had
 * visited every far folder. A grading of "absent" taken without a witness is
 * reported as no reading.
 *
 * THE WITNESS ADDS NO FOLDER (the fix round, after both verifiers). The build
 * round's witness made a fresh folder each time, and a new folder with no tab
 * makes the window re-read the WHOLE project list, which at the parent drew
 * the hidden re-add and kept the reporter's "only after I restart" from ever
 * reproducing in this probe (arm C2 at the parent). Arm N alone still makes a
 * fresh folder, because a folder that never had a tab is what it measures.
 *
 * The far sessions are made only after a Tortie create on the machine started
 * the far server. They run `exec sleep 1800`, so no shell rc file runs, and
 * they end with that server.
 *
 * ## The arms (P306_ARMS, a comma separated subset; all by default)
 *
 * Fixture, launch 1: L (this Mac, open, shell l1); X at path E (this Mac,
 * shell x1, its LOCAL tab closed); the machine `p306far`; A, C, D, Q opened by
 * Open on machine with shells a1 and a2 (A), c1, d1, q1; P opened with no
 * session; and the witness session `p306-wit` in a folder of its own.
 *
 *   O   after the fixture: A in main's list and the strip, a1 live, a1's group
 *       reads tab-open yes
 *   N   W1, a folder that never had a tab, opens within one pass
 *   E   a feed-only far session in E, the path of this Mac's closed X, opens
 *       p306far:E within one pass
 *   C1  closeTab(A): at once A leaves the strip, a1 stays live and carries
 *       A's stamp. After the witness: at the parent A is BACK in main's list
 *       with a NEW id (the reporter's "immediately"); at HEAD A is absent from
 *       main's list and the strip, and the log's held count reads 1
 *   C2  Open on machine for A, then close it again, then the witness: at the
 *       parent A is in main's list and NOT in the strip (the hidden re-add,
 *       "only after I restart"); at HEAD absent from both
 *   S   the sheet: a1's group label is A's folder name, tab-open no, and the
 *       Closed tab filter draws a1 (HEAD; recorded at the parent)
 *   F1  a real click on Refresh session list, then the witness: the parent
 *       brings A back; HEAD keeps it closed, a1 under A's name, tab closed
 *   F3  l1 ended out of band, then Restore pressed on its Managed row (the
 *       third sheet door), then the witness: HEAD keeps A closed
 *   LC  the local control: Refresh, and this Mac's X stays closed at both
 *   R   a1 renamed, then the witness: HEAD keeps A closed
 *   W   machines.prepare, the stand-in for a wake, then the witness
 *   K   End a2 from the sheet as probe:p293 arm 3 presses it: a2 reads ended
 *       at both; at HEAD A stays closed and a2 is listed under A's name. a1
 *       is left LIVE, so the relaunch in X2 has a running session in A
 *   V   Page.reload (a reopened window: an empty tabsAskedFor and a fresh
 *       bootstrap list), then the witness: the parent shows A; HEAD does not
 *   D   closeTab(D), the witness, then a create in D through the bridge: D in
 *       main's list and the strip at both; at HEAD d1's stamp is cleared
 *   DS  closeTab(Q), the witness, then the REAL New session sheet from C's tab
 *       on the machine (Shell, Name, Directory Q, Create), which is a person's
 *       ⌘T: Q in main's list and the strip at both; at HEAD q1's stamp is
 *       cleared (the fix round, after both verifiers measured row 10 worse)
 *   G   closeTab(C), the witness, then Go to session on c1 from the sheet: C
 *       opens, c1 is active, the tab reads C's name; at HEAD c1's stamp is gone
 *   M   a create given P whose session the machine places in Y (outside P):
 *       p306far:Y in main's list and m1's projectPath is Y, at both
 *   MH  Open on machine for Y (the window never draws Y after M's bridge
 *       create, at either build), closeTab(Y), then the witness: HEAD keeps Y
 *       closed, m1 under Y's name. A close that did not happen is one finding
 *       and nothing else is graded
 *   B   THE STATED LIMIT: closeTab(W1), whose session no manifest row records,
 *       then the witness: W1 comes BACK at both builds
 *   X2  LAUNCH 2 on the same profile: machineUp, the witness: a1 is still
 *       LIVE at both (or the arm measures nothing); the parent has A in main's
 *       list; HEAD has it in neither, a1 under A's name, tab closed
 *
 * An arm another arm needs is DRIVEN when only the second is chosen, and is
 * graded only when chosen itself. After each launch the scratch manifest is
 * copied and the COPY is read with `/usr/bin/sqlite3` (never the live manifest;
 * see `readManifest` for why the copy is not opened `-readonly`),
 * the stamps and the remote rows are held against main's last bridge reading,
 * and at HEAD no `remote_projects` row may stand beside a stamp naming its own
 * folder (the spec's cell 4). No step this probe drives reaches it at HEAD;
 * the one route that does, restoring a REMOVED remote session from the Past
 * tab (SPEC §6, the first verifier's enumeration), is not driven here and is
 * identical at the parent.
 *
 * ## ARMS D and DS, and what their strip readings mean
 *
 * `__p293.createSession` reaches main through the bridge and re-reads no
 * project list afterwards, and neither does the store's own create from a tab
 * on the machine (it re-reads only for a create started from a tab on THIS
 * Mac). Both rely on `reconcileRemoteTabs` (src/renderer/state/sessions-slice.ts)
 * to learn of a folder main opened. The build round's memo there remembered
 * each folder by name alone, so a held folder the window had asked about once,
 * after the close, was never asked about again when the create opened it, and
 * the new session sat in no tab (both verifiers, row 10 WORSE). The fix round
 * remembers each folder beside whether a session in it carried the closed-tab
 * record and asks again when that changes. D's strip reading is the bridge
 * create and DS's is a person's ⌘T through the real sheet; both must draw the
 * folder at HEAD as the parent did.
 *
 * ## NOT DRIVEN, and why
 *
 *   - The real wake: `powerMonitor` `resume` reaching `pollEveryRemoteMachine`.
 *     No probe can emit it. Arm W's re-prepare runs a completed pass the same
 *     way and stands in for it.
 *   - A machine that stops answering mid-pass: build/with-scratch-machine.mjs
 *     owns the sshd and this file signals nothing it did not start. Unit H6
 *     covers it.
 *   - A create with NO folder (SPEC §3 item 2): on the loopback machine the far
 *     login directory is the operator's own home, and a session made there
 *     would start a shell in his home and list it in a tab. Unit C2 covers it.
 *   - Two different machines with the same path: only one loopback machine is
 *     allowed. Unit R2c covers it; arm E is this Mac against the machine.
 *   - Try again, the second sheet door: it needs a failed list read no probe
 *     can force, and it is the same `refresh` handler as F1.
 *
 * ## What it refuses, exit 2
 *
 *   - No `GMUX_TMUX_SOCKET`; the sockets `gmux` and `default` by name; any
 *     socket that is not a `gmux-p306` harness socket.
 *   - No `GMUX_HARNESS_DIR`.
 *   - No carriage file from build/with-scratch-machine.mjs, or one whose
 *     `tmuxTmp` is not under /tmp/.
 *   - `out/main/index.js` missing, or any of remote-rehome.ts,
 *     sessions-repository.ts, create-local.ts, store.ts, codecs.ts or the
 *     renderer's sessions-slice.ts newer than it, in the checkout being
 *     launched.
 *   - Any renamed agent (Gemini, Qwen, Antigravity, Grok, Droid) reading
 *     installed in `agents:list`. Before EVERY launch the profile's
 *     `gmux/config/agents.json` renames their binaries to names that exist
 *     nowhere, so detection never runs any of their `--version`.
 *
 * Exit 0 with no finding, 1 with findings.
 *
 * ## Environment
 *
 *   GMUX_TMUX_SOCKET      the scratch socket, set by build/harness-socket.mjs
 *   GMUX_HARNESS_DIR      the scratch directory, set by the same wrapper
 *   GMUX_CONFIG_ROOT      where build/with-scratch-machine.mjs wrote the carriage
 *   P306_PARENT_CHECKOUT  a BUILT checkout to measure instead of this one
 *   P306_OUT_DIR          default `out/p306`; `readings-<head|parent>.json`, and
 *                         `readings.json` as the latest of the two
 *   P306_ARMS             a comma separated subset
 *
 * ## Usage, from the worktree root. BUILD FIRST.
 *
 *   npm run build && npm run probe:p306                       HEAD
 *   P306_PARENT_CHECKOUT=/private/tmp/wt-p306-parent npm run -s probe:p306
 *   node build/p306/probe-p306.mjs --side-by-side out/p306/readings-parent.json out/p306/readings-head.json
 *   node build/p306/probe-p306.mjs --self-test                the graders alone
 *
 * `--self-test` and `--side-by-side` start nothing.
 *
 * ## SAFETY
 *
 * Each Electron is started through `withElectron`, which ends the tree it
 * started and the local scratch tmux server it was handed in a `finally`
 * whatever happened. The far scratch server outlives launch 1 on purpose: its
 * TMUX_TMPDIR is the carriage's, which neither the wrapper's child
 * environment nor `withElectron`'s local teardown names. It is ended by the pid
 * it reports through the carriage's binary, in this file's `finally` and on
 * `exit`, and by build/with-scratch-machine.mjs when this file exits. Every
 * other process this file starts is a synchronous tmux, sqlite3 or the one
 * ssh-keyscan build/ssh-run.mjs runs, each exited before its call returns. It
 * takes no photograph: every reading is a count, a box, a label or a byte. It
 * never names the operator's own tmux server, never uses a process-name kill
 * or a pattern search, and never signals a negative pid.
 */
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import {
  accessSync,
  constants as fsConstants,
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { withElectron, withoutDevRenderer } from '../electron-run.mjs';
import { cdpEval, wsConnect } from '../cdp-client.mjs';
import { keyscanText } from '../ssh-run.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const TAG = '[p306]';
const CALLER = 'build/p306/probe-p306.mjs';
const t0 = Date.now();
const say = (l) => console.log(`${TAG} ${((Date.now() - t0) / 1000).toFixed(1).padStart(6)}s ${l}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const J = (v) => JSON.stringify(v);

// ---------------------------------------------------------------------------
// The constants this run holds the app against, BY VALUE.
// ---------------------------------------------------------------------------
export const MACHINE_ID = 'p306far';
/** The ceiling on one pass witness (SPEC §8.1). */
export const WITNESS_MS = 90_000;
/** The line the re-home writes when its held count moves (SPEC §4 M3), as main's console prints it. */
export const HELD_LINE_RE = /\[gmux-config\] folders on machines whose tab a person closed are kept closed (\{[^\n]*\})/g;
export const LIVE = Object.freeze(['running', 'idle', 'needs_input']);
export const ENDED = Object.freeze(['exited', 'restorable']);
export const ALL_ARMS = Object.freeze(['O', 'N', 'E', 'C1', 'C2', 'S', 'F1', 'F3', 'LC', 'R', 'W', 'K', 'V', 'D', 'DS', 'G', 'M', 'MH', 'B', 'X2']);
/** Arms graded at HEAD only; at the parent they are recorded, because the parent's tab is already back by then. */
export const HEAD_ONLY = Object.freeze(['S', 'F3', 'R', 'W', 'MH']);
/** What each arm needs DRIVEN before it, whether or not it is chosen. */
const NEEDS = {
  C2: ['C1'],
  S: ['C1'],
  F1: ['C1'],
  F3: ['C1'],
  R: ['C1'],
  W: ['C1'],
  K: ['C1'],
  V: ['C1'],
  MH: ['M'],
  B: ['N'],
  X2: ['C1']
};
/** The sources the readings are made of, per SPEC §8's staleness refusal. */
export const MAIN_SOURCES = Object.freeze([
  'src/main/machines/remote-rehome.ts',
  'src/main/manifest/sessions-repository.ts',
  'src/main/sessions/create-local.ts',
  'src/main/manifest/store.ts',
  'src/main/manifest/codecs.ts',
  // The fix round: the window's memo, which decides whether a tab main opened
  // for a create is ever drawn (arms D and DS).
  'src/renderer/state/sessions-slice.ts'
]);

// ---------------------------------------------------------------------------
// The quiet agents. COPIED from build/p332/dns-standin.mjs, not imported: that
// module's probe runs at import, and the copy names this phase's binaries.
// ---------------------------------------------------------------------------

/** The agents whose `--version` this probe may never run. */
export const QUIET_AGENT_IDS = Object.freeze(['gemini', 'qwen', 'antigravity', 'grok', 'droid']);
/** A binary name that exists nowhere. */
export const absentBinaryOf = (id) => `p306-absent-${id}`;

/** Write `<profile>/gmux/config/agents.json` so each of `ids` names a binary that does not exist. */
export function writeQuietAgents(profile, ids = QUIET_AGENT_IDS) {
  const dir = join(profile, 'gmux', 'config');
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const agents = ids.map((id) => ({ id, binaries: [absentBinaryOf(id)], launch: { argv: [absentBinaryOf(id)] }, notes: 'probe: never started' }));
  const path = join(dir, 'agents.json');
  writeFileSync(path, `${JSON.stringify({ schema: 2, agents }, null, 2)}\n`, { mode: 0o600 });
  return path;
}

/** Did the app read it: is every one of `ids` not installed, with no binary found? */
export function quietAgentsHeld(scan, ids = QUIET_AGENT_IDS) {
  const problems = [];
  const agents = Array.isArray(scan?.agents) ? scan.agents : null;
  if (agents === null) return { ok: false, problems: ['agents:list answered no agent list'] };
  for (const id of ids) {
    const row = agents.find((a) => a.id === id);
    if (row === undefined) problems.push(`${id} is not in agents:list`);
    else if (row.installed !== false || row.binPath !== null || row.version !== null) problems.push(`${id} reads installed=${J(row.installed)} binPath=${J(row.binPath)} version=${J(row.version)}`);
  }
  return { ok: problems.length === 0, problems };
}

// ---------------------------------------------------------------------------
// The graders. Pure, exported, and proved both ways under --self-test.
// ---------------------------------------------------------------------------

const base = (p) => String(p ?? '').slice(String(p ?? '').lastIndexOf('/') + 1);

/** The held count the re-home last wrote in `text`, or null when it wrote none. */
export function heldFromLog(text) {
  let held = null;
  for (const m of String(text ?? '').matchAll(HELD_LINE_RE)) {
    try {
      const v = JSON.parse(m[1]);
      if (typeof v?.held === 'number') held = v.held;
    } catch {
      /* a line cut in half by the pipe */
    }
  }
  return held;
}

/** The P306_ARMS subset, or every arm; an unknown name is a refusal. */
export function chooseArms(raw) {
  const text = String(raw ?? '').trim();
  if (text === '') return { arms: [...ALL_ARMS], bad: [] };
  const names = text.split(',').map((s) => s.trim().toUpperCase()).filter((s) => s !== '');
  const bad = names.filter((n) => !ALL_ARMS.includes(n));
  return { arms: ALL_ARMS.filter((a) => names.includes(a)), bad };
}

/** Every arm that is DRIVEN for a chosen set: the chosen ones and what they need, in the file's order. */
export function drivenArms(chosen) {
  const want = new Set(chosen);
  let grew = true;
  while (grew) {
    grew = false;
    for (const arm of [...want]) {
      for (const need of NEEDS[arm] ?? []) {
        if (!want.has(need)) {
          want.add(need);
          grew = true;
        }
      }
    }
  }
  return ALL_ARMS.filter((a) => want.has(a));
}

/**
 * The staleness grader, probe-p320's by value. `sources` is `[path, mtimeMs]`
 * per source and `bundle` is `[path, mtimeMs]`, or null. The refusal sentence,
 * or null.
 */
export function staleSentence(sources, bundle) {
  if (bundle === null) return 'out/ holds no bundle for the sources this run reads; build first.';
  const newer = sources
    .filter(([, mtime]) => mtime > bundle[1])
    .map(([path, mtime]) => `${path} is ${((mtime - bundle[1]) / 1000).toFixed(1)} s newer than ${bundle[0]}`);
  if (newer.length === 0) return null;
  return `out/ is older than the sources this run reads; build first (${newer.join('; ')}).`;
}

/** No witness, no reading: the sentence every "absent" grading falls back to. */
const noWitness = (arm, r) => `${arm} no pass witness after the step (${String(r?.witness?.why ?? 'not made')}), so nothing it reads as absent is a reading`;

/**
 * One arm's findings. `r` is that arm's reading, `build` is 'head' or
 * 'parent', `paths` the run's own folders. An arm with no reading has one
 * finding saying so.
 */
export function gradeArm(arm, r, build, paths) {
  const out = [];
  const f = (s) => out.push(`${arm} ${s}`);
  const head = build === 'head';
  if (r === undefined || r === null) return [`${arm} has no reading, so nothing it claims was measured`];
  if (typeof r.error === 'string') out.push(`${arm} stopped: ${r.error}`);
  if (!head && HEAD_ONLY.includes(arm)) return out;
  const A = paths.A;
  const needWitness = () => {
    if (r.witness?.ok === true) return true;
    out.push(noWitness(arm, r));
    return false;
  };
  switch (arm) {
    case 'O':
      if (r.aInMain !== true) f(`A (${A}) is not in main's project list after Open on machine`);
      if (r.aInStrip !== true) f('A has no tab in the strip after Open on machine');
      if (r.a1Live !== true) f(`a1 reads ${J(r.a1Status)}, not live`);
      if (r.a1TabOpen !== 'yes') f(`a1's group in the session manager reads tab-open ${J(r.a1TabOpen)}, not "yes"`);
      break;
    case 'N':
      if (r.witness?.ok !== true) f(`W1, a folder on the machine that never had a tab, did not open within one pass (${String(r.witness?.why ?? 'no witness')}): Phase 90.3's first-pass tab is gone`);
      break;
    case 'E':
      if (r.ok !== true) f(`p306far:E, at the path of this Mac's closed X, did not open within one pass (${String(r.why ?? '')}): this Mac's stamp held a folder on another machine`);
      break;
    case 'C1':
      if (r.closed !== true) f('the drive could not close A\'s tab');
      if (r.nowInStrip !== false) f('A is still in the strip after its tab was closed');
      if (r.nowA1Live !== true) f(`a1 reads ${J(r.nowA1Status)} after the close; closing a tab ends nothing`);
      if (r.nowStampPath !== A) f(`a1's closedProject names ${J(r.nowStampPath)}, not A`);
      if (!needWitness()) break;
      if (head) {
        if (r.afterInMain !== false) f('A came back into main\'s project list within one pass of its close (issue 35, "immediately")');
        if (r.afterInStrip !== false) f('A came back into the strip within one pass of its close');
        if (r.held !== 1) f(`the log's last held count reads ${J(r.held)}, not 1`);
      } else {
        if (r.afterInMain !== true) f('at the parent A did not come back within one pass, so the reporter\'s "immediately" did not reproduce');
        else if (r.afterNewId !== true) f('at the parent A came back with the id it had, not a new one');
      }
      break;
    case 'C2':
      if (!needWitness()) break;
      if (head) {
        if (r.inMain !== false) f('A came back into main\'s project list after a second close (the hidden re-add)');
        if (r.inStrip !== false) f('A came back into the strip after a second close');
      } else {
        if (r.inMain !== true) f('at the parent the second close was not re-added in main, so "only after I restart" did not reproduce');
        if (r.inStrip !== false) f('at the parent A is in the strip after the second close, so the re-add was not the hidden one');
      }
      break;
    case 'S':
      if (r.listed !== true) f('a1 is not listed on Managed');
      if (r.label !== base(A)) f(`a1's group is labelled ${J(r.label)}, not A's folder name ${J(base(A))}`);
      if (r.tabOpen !== 'no') f(`a1's group reads tab-open ${J(r.tabOpen)}, not "no"`);
      if (r.closedFilterHasA1 !== true) f('the Closed tab filter does not draw a1');
      break;
    case 'F1':
      if (r.clicked !== true) f(`Refresh session list could not be clicked: ${String(r.why ?? '')}`);
      if (!needWitness()) break;
      if (head) {
        if (r.inStrip !== false || r.inMain !== false) f(`Refresh brought A back (main ${J(r.inMain)}, strip ${J(r.inStrip)})`);
        if (r.tabOpen !== 'no') f(`a1's group reads tab-open ${J(r.tabOpen)} after Refresh, not "no"`);
        if (r.label !== base(A)) f(`a1's group is labelled ${J(r.label)} after Refresh, not ${J(base(A))}`);
        if (r.closedFilterHasA1 !== true) f('the Closed tab filter does not draw a1 after Refresh');
      } else {
        if (r.inStrip !== true) f('at the parent Refresh did not bring A back into the strip');
        if (r.tabOpen !== 'yes') f(`at the parent a1's group reads tab-open ${J(r.tabOpen)} after Refresh, not "yes"`);
        if (r.closedFilterHasA1 !== false) f('at the parent the Closed tab filter still draws a1 after Refresh');
      }
      break;
    case 'F3':
      if (r.pressed !== true) f(`Restore could not be pressed on l1's Managed row: ${String(r.why ?? '')}`);
      if (!needWitness()) break;
      if (r.inMain !== false || r.inStrip !== false) f(`a restore landing on Managed brought A back (main ${J(r.inMain)}, strip ${J(r.inStrip)})`);
      break;
    case 'LC':
      if (r.clicked !== true) f(`Refresh session list could not be clicked: ${String(r.why ?? '')}`);
      if (r.xInMain !== false || r.xInStrip !== false) f(`this Mac's closed X came back after Refresh (main ${J(r.xInMain)}, strip ${J(r.xInStrip)})`);
      break;
    case 'R':
      if (r.renamed !== true) f(`a1 was not renamed: ${String(r.why ?? '')}`);
      if (!needWitness()) break;
      if (r.inMain !== false || r.inStrip !== false) f(`a rename brought A back (main ${J(r.inMain)}, strip ${J(r.inStrip)})`);
      break;
    case 'W':
      if (!needWitness()) break;
      if (r.inMain !== false || r.inStrip !== false) f(`a re-prepare, the stand-in for a wake, brought A back (main ${J(r.inMain)}, strip ${J(r.inStrip)})`);
      break;
    case 'K':
      if (!ENDED.includes(r.a2Status)) f(`a2 reads ${J(r.a2Status)} after End, not ended`);
      if (!head) break;
      if (!needWitness()) break;
      if (r.inMain !== false || r.inStrip !== false) f(`ending a2 brought A back (main ${J(r.inMain)}, strip ${J(r.inStrip)})`);
      if (r.label !== base(A)) f(`ended a2's group is labelled ${J(r.label)}, not ${J(base(A))}`);
      if (r.tabOpen !== 'no') f(`ended a2's group reads tab-open ${J(r.tabOpen)}, not "no"`);
      break;
    case 'V':
      if (!needWitness()) break;
      if (head) {
        if (r.inStrip !== false || r.inMain !== false) f(`a reloaded window shows A again (main ${J(r.inMain)}, strip ${J(r.inStrip)})`);
      } else if (r.inStrip !== true) {
        f('at the parent the reloaded window does not show A, so the relaunch half of the defect did not reproduce');
      }
      break;
    case 'D':
      if (r.closed !== true) f('the drive could not close D\'s tab');
      if (!needWitness()) break;
      if (r.created !== true) f(`the create in D did not return a session: ${String(r.why ?? '')}`);
      if (r.inMain !== true) f('a create in the closed folder D did not open D in main\'s project list');
      if (r.inStrip !== true) f('a create in the closed folder D left D with no tab in the strip');
      if (head && r.d1Stamp !== null) f(`d1 still carries the stamp ${J(r.d1Stamp)} beside an open tab`);
      break;
    case 'DS':
      if (r.closed !== true) f('the drive could not close Q\'s tab');
      if (!needWitness()) break;
      if (r.created !== true) f(`the New session sheet did not create q2 in Q from C's tab: ${String(r.why ?? '')}`);
      if (r.inMain !== true) f('a create in the closed folder Q through the New session sheet did not open Q in main\'s project list');
      if (r.inStrip !== true) f('a create in the closed folder Q through the New session sheet left Q with no tab in the strip');
      if (head && r.q1Stamp !== null) f(`q1 still carries the stamp ${J(r.q1Stamp)} beside an open tab`);
      break;
    case 'G':
      if (r.closed !== true) f('the drive could not close C\'s tab');
      if (!needWitness()) break;
      if (r.ran !== true) f(`Go to session could not be run from the sheet: ${String(r.why ?? '')}`);
      if (r.cInStrip !== true) f('Go to session on c1 did not open C\'s tab');
      if (r.c1Active !== true) f(`Go to session left ${J(r.activeSessionId)} active, not c1`);
      if (r.tabLabelOk !== true) f(`C's tab reads ${J(r.tabText)}, not C's folder name ${J(base(paths.C))}`);
      if (head && r.c1Stamp !== null) f(`c1 still carries the stamp ${J(r.c1Stamp)} after Go to session opened its tab`);
      break;
    case 'M':
      if (r.created !== true) f(`the create given P and placed in Y did not return a session: ${String(r.why ?? '')}`);
      if (r.yInMain !== true) f('p306far:Y, the folder the machine placed m1 in, is not in main\'s project list');
      if (r.m1ProjectPath !== paths.Y) f(`m1's projectPath reads ${J(r.m1ProjectPath)}, not Y`);
      break;
    case 'MH':
      // Nothing after a close that did not happen is a reading (both verifiers:
      // the build round graded three findings at HEAD from a Y it never closed).
      if (r.closed !== true) {
        f(`the drive could not close Y's tab (opened first: ${J(r.opened ?? null)}), so nothing MH reads is a reading`);
        break;
      }
      if (!needWitness()) break;
      if (r.yInMain !== false || r.yInStrip !== false) f(`Y came back after its close (main ${J(r.yInMain)}, strip ${J(r.yInStrip)})`);
      if (r.label !== base(paths.Y)) f(`m1's group is labelled ${J(r.label)}, not ${J(base(paths.Y))}`);
      if (r.tabOpen !== 'no') f(`m1's group reads tab-open ${J(r.tabOpen)}, not "no"`);
      break;
    case 'B':
      if (r.closed !== true) f('the drive could not close W1\'s tab');
      if (!needWitness()) break;
      if (r.w1InMain !== true) f('W1, a folder no manifest row records, did not come back after its close: the gate is wider than the stated limit (research 54 finding 15)');
      break;
    case 'X2':
      // The relaunch measures the hold only while a session in A is running:
      // what a machine reported gone is not carried into a new run, so with no
      // live session in A neither build would open it (the second verifier).
      if (!LIVE.includes(r.a1Status)) f(`a1 reads ${J(r.a1Status)} after the relaunch, not live, so the relaunch measures nothing about the hold`);
      if (!needWitness()) break;
      if (head) {
        if (r.inMain !== false || r.inStrip !== false) f(`the relaunch brought A back (main ${J(r.inMain)}, strip ${J(r.inStrip)}): "only after I restart"`);
        if (r.label !== base(A)) f(`a1's group is labelled ${J(r.label)} after the relaunch, not ${J(base(A))}`);
        if (r.tabOpen !== 'no') f(`a1's group reads tab-open ${J(r.tabOpen)} after the relaunch, not "no"`);
      } else if (r.inMain !== true) {
        f('at the parent A was not in main\'s list after the relaunch, so "only after I restart" did not reproduce');
      }
      break;
    default:
      f('is not an arm this file knows');
  }
  return out;
}

/**
 * The scratch manifest's own rows, held against main's last bridge reading.
 * `db` is { error } or { sessions: [{id, project_path, machine_id, status,
 * project_tombstone}], remote: [{machine_id, path, id}] }. `bridge` is {
 * remote: [{path, id}], sessions: [{id, machineId, closedProject}] }. The
 * findings, and at HEAD the spec's cell 4: a remote row beside a live stamp
 * naming its own folder, which no step this probe drives reaches after this
 * phase (the Past restore of a removed remote session does, SPEC §6, and is
 * not driven).
 */
export function dbFindings(label, db, bridge, build) {
  const out = [];
  if (db === null || db === undefined) return [`${label} the scratch manifest was not read`];
  if (typeof db.error === 'string') return [`${label} the scratch manifest could not be read: ${db.error}`];
  const remote = (db.remote ?? []).filter((r) => r.machine_id === MACHINE_ID);
  if (bridge !== null && bridge !== undefined) {
    const want = new Set((bridge.remote ?? []).map((r) => `${r.path}\u0000${r.id}`));
    const got = new Set(remote.map((r) => `${r.path}\u0000${r.id}`));
    const missing = [...want].filter((k) => !got.has(k)).map((k) => k.split('\u0000')[0]);
    const extra = [...got].filter((k) => !want.has(k)).map((k) => k.split('\u0000')[0]);
    if (missing.length > 0 || extra.length > 0) out.push(`${label} remote_projects disagrees with main's last list: missing ${J(missing)}, extra ${J(extra)}`);
    const rows = new Map((db.sessions ?? []).map((s) => [s.id, s]));
    for (const s of bridge.sessions ?? []) {
      const row = rows.get(s.id);
      if (row === undefined) continue;
      const stamp = stampPath(row.project_tombstone);
      const said = s.closedProject?.path ?? null;
      if (stamp !== said) out.push(`${label} ${s.id}'s stamp in the manifest names ${J(stamp)} and main says ${J(said)}`);
    }
  }
  if (build === 'head') {
    for (const c of cell4(db)) out.push(`${label} a remote row for ${c.path} stands beside ${c.session}'s stamp naming it, which no step this probe drives reaches after Phase 306`);
  }
  return out;
}

/** The path a raw stamp names when it is one the codec would keep, or null. */
export function stampPath(raw) {
  if (typeof raw !== 'string' || raw === '') return null;
  try {
    const v = JSON.parse(raw);
    if (v === null || typeof v !== 'object') return null;
    if (typeof v.projectId !== 'string' || v.projectId === '') return null;
    if (typeof v.projectName !== 'string' || v.projectName === '') return null;
    if (typeof v.path !== 'string' || v.path === '') return null;
    if (typeof v.closedAt !== 'number') return null;
    return v.path;
  } catch {
    return null;
  }
}

/** The spec's cell 4, re-derived from the bytes: R present and S true for one folder on the machine. */
export function cell4(db) {
  const out = [];
  for (const r of (db.remote ?? []).filter((x) => x.machine_id === MACHINE_ID)) {
    for (const s of db.sessions ?? []) {
      if (s.status === 'discarded' || s.project_path !== r.path) continue;
      const machine = s.machine_id === null || s.machine_id === '' ? 'local' : s.machine_id;
      if (machine !== MACHINE_ID) continue;
      let tab = null;
      try {
        tab = JSON.parse(s.project_tombstone);
      } catch {
        tab = null;
      }
      if (stampPath(s.project_tombstone) === r.path && (tab?.machineId ?? 'local') === MACHINE_ID) out.push({ path: r.path, session: s.id });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// The side-by-side, SPEC §9. Each row reads a rank from one run's arms, higher
// is better, and HEAD is WORSE when its rank is below the parent's, or when it
// has no reading where the parent had one.
// ---------------------------------------------------------------------------

const absent = (r) => r?.witness?.ok === true && r.inMain === false && r.inStrip === false;

export const SIDE_ROWS = [
  ['1', 'Open a remote project', 'O', (a) => (a.O ? { rank: a.O.aInMain && a.O.aInStrip && a.O.a1Live && a.O.a1TabOpen === 'yes' ? 1 : 0, v: a.O.aInMain && a.O.aInStrip ? 'tab opens, sessions under it' : 'no tab' } : null)],
  ['2', 'Close its tab', 'C1', (a, p) => (a.C1 ? { rank: a.C1.nowInStrip === false && a.C1.nowA1Live && a.C1.nowStampPath === p.A ? 1 : 0, v: a.C1.nowInStrip === false ? `tab goes, a1 ${String(a.C1.nowA1Status)}, stamp ${a.C1.nowStampPath === p.A ? 'written' : 'missing'}` : 'tab stays' } : null)],
  ['3', 'Press Refresh in the sheet', 'F1', (a) => (a.F1?.witness?.ok ? { rank: a.F1.inStrip ? 0 : 1, v: a.F1.inStrip ? 'tab reappears' : 'tab stays closed' } : null)],
  ['4', 'The sheet lists that session', 'S, F1', (a, p) => {
    const r = a.F1 ?? a.S;
    if (!r) return null;
    const listed = r.listed === true;
    const good = listed && r.tabOpen === 'no' && r.label === base(p.A) && r.closedFilterHasA1 === true;
    return { rank: good ? 2 : listed ? 1 : 0, v: listed ? `listed under ${J(r.label)}, tab-open ${String(r.tabOpen)}, Closed tab ${r.closedFilterHasA1 ? 'finds it' : 'does not'}` : 'not listed' };
  }],
  ['5', 'End it from the sheet', 'K', (a) => (a.K ? { rank: (ENDED.includes(a.K.a2Status) ? 1 : 0) + (absent(a.K) ? 1 : 0), v: `a2 ${String(a.K.a2Status)}, tab ${absent(a.K) ? 'stays closed' : 'open or unread'}` } : null)],
  ['6', "A LOCAL project's tab closed, then Refresh", 'LC', (a) => (a.LC ? { rank: a.LC.xInMain === false && a.LC.xInStrip === false ? 1 : 0, v: a.LC.xInMain === false && a.LC.xInStrip === false ? 'stays closed' : 'comes back' } : null)],
  ['7', 'A machine folder that never had a tab', 'N, E', (a) => (a.N || a.E ? { rank: (a.N?.witness?.ok ? 1 : 0) + (a.E?.ok ? 1 : 0), v: `W1 ${a.N?.witness?.ok ? 'opens' : 'does not open'}, E ${a.E?.ok ? 'opens' : 'does not open'}` } : null)],
  ['8', 'The reporter\'s "immediately": the first close', 'C1', (a) => (a.C1?.witness?.ok ? { rank: a.C1.afterInMain ? 0 : 1, v: a.C1.afterInMain ? 'back within one pass' : 'stays closed' } : null)],
  ['9', 'A second close, then relaunch or reload', 'C2, X2, V', (a) => {
    const parts = [];
    let rank = 0;
    if (a.C2?.witness?.ok) {
      parts.push(`second close ${a.C2.inMain ? 'hidden re-add' : 'held'}`);
      if (a.C2.inMain === false) rank += 1;
    }
    if (a.V?.witness?.ok) {
      parts.push(`reload ${a.V.inStrip ? 'back' : 'closed'}`);
      if (a.V.inStrip === false) rank += 1;
    }
    if (a.X2?.witness?.ok) {
      parts.push(`relaunch ${absent(a.X2) ? 'closed' : 'back'}`);
      if (absent(a.X2)) rank += 1;
    }
    return parts.length === 0 ? null : { rank, v: parts.join(', ') };
  }],
  ['10', 'A create in the closed folder, folder named', 'D', (a) => (a.D?.witness?.ok ? { rank: (a.D.inMain && a.D.inStrip ? 2 : 0) + (a.D.d1Stamp === null ? 1 : 0), v: `${a.D.inMain && a.D.inStrip ? 'tab opens' : `main ${String(a.D.inMain)}, strip ${String(a.D.inStrip)}`}; stamp ${a.D.d1Stamp === null ? 'cleared' : 'stays'}` } : null)],
  ['10b', 'A create in the closed folder by the New session sheet, from a tab on the machine', 'DS', (a) => (a.DS?.witness?.ok ? { rank: (a.DS.inMain && a.DS.inStrip ? 2 : 0) + (a.DS.q1Stamp === null ? 1 : 0), v: `${a.DS.inMain && a.DS.inStrip ? 'tab opens' : `main ${String(a.DS.inMain)}, strip ${String(a.DS.inStrip)}`}; stamp ${a.DS.q1Stamp === null ? 'cleared' : 'stays'}` } : null)],
  ['11', 'A create with no folder that lands in a closed folder', 'unit C2', () => ({ rank: null, v: 'unit C2, not driven' })],
  ['12', 'Go to session on a session whose tab is closed', 'G', (a) => (a.G?.witness?.ok ? { rank: (a.G.cInStrip && a.G.c1Active && a.G.tabLabelOk ? 2 : 0) + (a.G.c1Stamp === null ? 1 : 0), v: `${a.G.cInStrip ? 'tab opens' : 'no tab'}${a.G.tabLabelOk ? ' with its name' : ''}; stamp ${a.G.c1Stamp === null ? 'cleared' : 'stays'}` } : null)],
  ['13', 'The same path closed on this Mac, then a session in it on the machine', 'E', (a) => (a.E ? { rank: a.E.ok ? 1 : 0, v: a.E.ok ? "the machine's folder opens" : 'held' } : null)],
  ['14', 'A folder whose sessions this Mac did not start, closed', 'B', (a) => (a.B?.witness?.ok ? { rank: a.B.w1InMain ? 1 : 0, v: a.B.w1InMain ? 'comes back' : 'held' } : null)],
  ['M', 'A create placed outside its given folder', 'M', (a, p) => (a.M ? { rank: a.M.yInMain && a.M.m1ProjectPath === p.Y ? 1 : 0, v: a.M.yInMain ? 'the placed folder opens' : 'no tab for the placed folder' } : null)]
];

/** The side-by-side table: one line per row, and whether HEAD reads worse on any. */
export function sideBySide(parent, head) {
  const lines = [];
  let worse = 0;
  for (const [n, scenario, arms, read] of SIDE_ROWS) {
    let p = null;
    let h = null;
    try {
      p = read(parent?.readings?.arms ?? {}, parent?.readings?.paths ?? {});
    } catch {
      p = null;
    }
    try {
      h = read(head?.readings?.arms ?? {}, head?.readings?.paths ?? {});
    } catch {
      h = null;
    }
    let verdict = 'same';
    if (p !== null && h !== null && p.rank === null && h.rank === null) verdict = 'not compared';
    else if (p === null || p.rank === null || p.rank === undefined) verdict = h === null ? 'not read' : 'no parent reading';
    else if (h === null || h.rank === null || h.rank === undefined) verdict = 'WORSE: no reading at HEAD';
    else if (h.rank < p.rank) verdict = 'WORSE';
    else if (h.rank > p.rank) verdict = 'better';
    if (verdict.startsWith('WORSE')) worse += 1;
    lines.push({ n, scenario, arms, today: p?.v ?? 'not read', head: h?.v ?? 'not read', verdict });
  }
  return { lines, worse };
}

// ---------------------------------------------------------------------------
// --self-test. Every grader on a HEAD shaped reading and on a parent shaped one.
// ---------------------------------------------------------------------------

const FX_PATHS = { A: '/r/far/alpha', C: '/r/far/charlie', D: '/r/far/delta', Q: '/r/far/quebec', P: '/r/far/papa', Y: '/r/far/yankee', E: '/r/echo', L: '/r/lima', W1: '/r/far/w1' };
const W = { ok: true, name: 'p306-wit-9', ms: 1800 };

/** A run's arm readings, HEAD shaped. */
function headArmsFixture() {
  return {
    O: { aInMain: true, aInStrip: true, a1Live: true, a1Status: 'idle', a1TabOpen: 'yes' },
    N: { witness: { ok: true, path: '/r/far/w1', ms: 2100 } },
    E: { ok: true, ms: 1900 },
    C1: { closed: true, nowInStrip: false, nowA1Live: true, nowA1Status: 'idle', nowStampPath: FX_PATHS.A, witness: W, afterInMain: false, afterNewId: false, afterInStrip: false, held: 1 },
    C2: { witness: W, inMain: false, inStrip: false },
    S: { listed: true, label: 'alpha', tabOpen: 'no', closedFilterHasA1: true },
    F1: { clicked: true, witness: W, inMain: false, inStrip: false, listed: true, label: 'alpha', tabOpen: 'no', closedFilterHasA1: true },
    F3: { pressed: true, witness: W, inMain: false, inStrip: false },
    LC: { clicked: true, xInMain: false, xInStrip: false },
    R: { renamed: true, witness: W, inMain: false, inStrip: false },
    W: { witness: W, inMain: false, inStrip: false },
    K: { a2Status: 'exited', witness: W, inMain: false, inStrip: false, label: 'alpha', tabOpen: 'no' },
    V: { witness: W, inMain: false, inStrip: false },
    D: { closed: true, witness: W, created: true, inMain: true, inStrip: true, d1Stamp: null },
    DS: { closed: true, witness: W, created: true, inMain: true, inStrip: true, q1Stamp: null },
    G: { closed: true, witness: W, ran: true, cInStrip: true, c1Active: true, activeSessionId: 'c1', tabText: 'charlie', tabLabelOk: true, c1Stamp: null },
    M: { created: true, yInMain: true, m1ProjectPath: FX_PATHS.Y },
    MH: { opened: true, closed: true, witness: W, yInMain: false, yInStrip: false, label: 'yankee', tabOpen: 'no' },
    B: { closed: true, witness: W, w1InMain: true },
    X2: { witness: W, a1Status: 'idle', inMain: false, inStrip: false, label: 'alpha', tabOpen: 'no' }
  };
}

/** The same run at the parent: the defect, as SPEC §8.2's parent column says it reads. */
function parentArmsFixture() {
  const a = headArmsFixture();
  return {
    ...a,
    C1: { ...a.C1, afterInMain: true, afterNewId: true, afterInStrip: true, held: null },
    C2: { witness: W, inMain: true, inStrip: false },
    S: { listed: true, label: 'alpha', tabOpen: 'no', closedFilterHasA1: true },
    F1: { clicked: true, witness: W, inMain: true, inStrip: true, listed: true, label: 'alpha', tabOpen: 'yes', closedFilterHasA1: false },
    F3: { pressed: true, witness: W, inMain: true, inStrip: true },
    R: { renamed: true, witness: W, inMain: true, inStrip: true },
    W: { witness: W, inMain: true, inStrip: true },
    K: { a2Status: 'exited', witness: W, inMain: true, inStrip: true, label: 'alpha', tabOpen: 'yes' },
    V: { witness: W, inMain: true, inStrip: true },
    D: { ...a.D, d1Stamp: FX_PATHS.D },
    DS: { ...a.DS, q1Stamp: FX_PATHS.Q },
    G: { ...a.G },
    MH: { opened: true, closed: true, witness: W, yInMain: true, yInStrip: true, label: 'yankee', tabOpen: 'yes' },
    X2: { witness: W, a1Status: 'idle', inMain: true, inStrip: false, label: 'alpha', tabOpen: 'no' }
  };
}

const gradeAll = (arms, build) => ALL_ARMS.flatMap((arm) => gradeArm(arm, arms[arm], build, FX_PATHS));
const run = (arms, tag) => ({ readings: { tag, paths: FX_PATHS, arms } });

function selfTest() {
  const headFx = headArmsFixture();
  const parentFx = parentArmsFixture();
  const stamp = (path, machineId) => JSON.stringify({ v: 1, projectId: 'p', projectName: base(path), path, closedAt: 1, ...(machineId ? { machineId } : {}) });
  const dbHead = {
    sessions: [
      { id: 'a1', project_path: FX_PATHS.A, machine_id: MACHINE_ID, status: 'exited', project_tombstone: stamp(FX_PATHS.A, MACHINE_ID) },
      { id: 'd1', project_path: FX_PATHS.D, machine_id: MACHINE_ID, status: 'running', project_tombstone: null }
    ],
    remote: [{ machine_id: MACHINE_ID, path: FX_PATHS.D, id: 'pd' }]
  };
  const dbParent = { ...dbHead, remote: [...dbHead.remote, { machine_id: MACHINE_ID, path: FX_PATHS.A, id: 'pa2' }] };
  const bridgeHead = { remote: [{ path: FX_PATHS.D, id: 'pd' }], sessions: [{ id: 'a1', machineId: MACHINE_ID, closedProject: { path: FX_PATHS.A } }, { id: 'd1', machineId: MACHINE_ID, closedProject: null }, { id: 'feed-only', machineId: MACHINE_ID, closedProject: null }] };
  const headWorseD = { ...headFx, D: { ...headFx.D, inStrip: false } };
  const headWorseDS = { ...headFx, DS: { ...headFx.DS, inStrip: false } };
  const headWideB = { ...headFx, B: { ...headFx.B, w1InMain: false } };
  const headNoO = { ...headFx };
  delete headNoO.O;
  const count = (x) => x.length;
  const fixtures = [
    ['HEAD readings graded at HEAD: no finding', () => gradeAll(headFx, 'head'), []],
    ['parent readings graded at the parent: no finding', () => gradeAll(parentFx, 'parent'), []],
    ['parent readings graded at HEAD: C1 C2 F1 F3 R W K V D DS MH X2 each name the defect', () => [...new Set(gradeAll(parentFx, 'head').map((l) => l.split(' ')[0]))], ['C1', 'C2', 'F1', 'F3', 'R', 'W', 'K', 'V', 'D', 'DS', 'MH', 'X2']],
    ['HEAD readings graded at the parent: the defect did not reproduce in C1 C2 F1 V X2', () => [...new Set(gradeAll(headFx, 'parent').map((l) => l.split(' ')[0]))], ['C1', 'C2', 'F1', 'V', 'X2']],
    ['C1 at HEAD: A back in main is the reporter\'s "immediately"', () => gradeArm('C1', { ...headFx.C1, afterInMain: true }, 'head', FX_PATHS), ['C1 A came back into main\'s project list within one pass of its close (issue 35, "immediately")']],
    ['C1 at HEAD: a held count that never moved is named', () => count(gradeArm('C1', { ...headFx.C1, held: null }, 'head', FX_PATHS)), 1],
    ['C1 at the parent: back with the same id is named', () => gradeArm('C1', { ...parentFx.C1, afterNewId: false }, 'parent', FX_PATHS), ['C1 at the parent A came back with the id it had, not a new one']],
    ['an "absent" with no witness is no reading, at HEAD', () => gradeArm('R', { renamed: true, witness: { ok: false, why: 'not in main\'s list within 90 s' }, inMain: false, inStrip: false }, 'head', FX_PATHS), ['R no pass witness after the step (not in main\'s list within 90 s), so nothing it reads as absent is a reading']],
    ['an arm with no reading is a finding, not a pass', () => gradeArm('O', undefined, 'head', FX_PATHS), ['O has no reading, so nothing it claims was measured']],
    ['HEAD-only arms are recorded at the parent', () => [gradeArm('S', { listed: false }, 'parent', FX_PATHS), gradeArm('MH', { closed: true, witness: W, yInMain: true }, 'parent', FX_PATHS)], [[], []]],
    ['B: W1 held is the gate wider than its limit', () => count(gradeArm('B', headWideB.B, 'head', FX_PATHS)), 1],
    ['E: this Mac\'s stamp holding the machine\'s folder is named', () => count(gradeArm('E', { ok: false, why: 'x' }, 'head', FX_PATHS)), 1],
    ['D: no tab in the strip after the create is named at both', () => [count(gradeArm('D', headWorseD.D, 'head', FX_PATHS)), count(gradeArm('D', headWorseD.D, 'parent', FX_PATHS))], [1, 1]],
    ['D at HEAD: a stamp left beside the open tab is named', () => count(gradeArm('D', parentFx.D, 'head', FX_PATHS)), 1],
    ['DS: no tab in the strip after the sheet create is named at both', () => [count(gradeArm('DS', headWorseDS.DS, 'head', FX_PATHS)), count(gradeArm('DS', headWorseDS.DS, 'parent', FX_PATHS))], [1, 1]],
    ['DS: a sheet that did not create is named', () => count(gradeArm('DS', { ...headFx.DS, created: false, why: 'Create: disabled' }, 'head', FX_PATHS)), 1],
    ['MH: a close that did not happen is ONE finding and nothing else is graded', () => gradeArm('MH', { opened: true, closed: false, witness: W, yInMain: true, yInStrip: true, label: 'yankee', tabOpen: 'yes' }, 'head', FX_PATHS), ['MH the drive could not close Y\'s tab (opened first: true), so nothing MH reads is a reading']],
    ['K: a2 not ended is named', () => count(gradeArm('K', { ...headFx.K, a2Status: 'idle' }, 'head', FX_PATHS)), 1],
    ['X2: a relaunch with no live session in A is named at both builds', () => [count(gradeArm('X2', { ...headFx.X2, a1Status: 'exited' }, 'head', FX_PATHS)), count(gradeArm('X2', { ...parentFx.X2, a1Status: 'restorable' }, 'parent', FX_PATHS))], [1, 1]],
    ['G at HEAD: the stamp left after Go to session is named', () => count(gradeArm('G', { ...headFx.G, c1Stamp: FX_PATHS.C }, 'head', FX_PATHS)), 1],
    ['M: a placed folder with no tab is named', () => count(gradeArm('M', { ...headFx.M, yInMain: false }, 'parent', FX_PATHS)), 1],
    ['side-by-side: parent against HEAD reads nothing worse', () => sideBySide(run(parentFx, 'parent'), run(headFx, 'head')).worse, 0],
    ['side-by-side: rows 3, 4, 5, 8, 9, 10 and 10b read better at HEAD, the rest the same', () => sideBySide(run(parentFx, 'parent'), run(headFx, 'head')).lines.filter((l) => l.verdict === 'better').map((l) => l.n), ['3', '4', '5', '8', '9', '10', '10b']],
    ['side-by-side: a create in a closed folder with no tab at HEAD is WORSE on row 10', () => sideBySide(run(parentFx, 'parent'), run(headWorseD, 'head')).lines.filter((l) => l.verdict.startsWith('WORSE')).map((l) => l.n), ['10']],
    ['side-by-side: the same through the New session sheet is WORSE on row 10b', () => sideBySide(run(parentFx, 'parent'), run(headWorseDS, 'head')).lines.filter((l) => l.verdict.startsWith('WORSE')).map((l) => l.n), ['10b']],
    ['side-by-side: a gate that holds W1 is WORSE on row 14', () => sideBySide(run(parentFx, 'parent'), run(headWideB, 'head')).lines.filter((l) => l.verdict.startsWith('WORSE')).map((l) => l.n), ['14']],
    ['side-by-side: the unit row is not compared', () => sideBySide(run(parentFx, 'parent'), run(headFx, 'head')).lines.find((l) => l.n === '11').verdict, 'not compared'],
    ['side-by-side: a row HEAD did not read is WORSE, not a pass', () => sideBySide(run(parentFx, 'parent'), run(headNoO, 'head')).lines.filter((l) => l.verdict.startsWith('WORSE')).map((l) => l.n), ['1']],
    ['the held line: the last count main printed', () => heldFromLog('[gmux-config] folders on machines whose tab a person closed are kept closed {"held":1}\nx\n[gmux-config] folders on machines whose tab a person closed are kept closed {"held":2}\n'), 2],
    ['the held line: none printed reads null', () => heldFromLog('[gmux-config] something else {"held":3}'), null],
    ['the manifest at HEAD: agrees with main and holds no cell 4', () => dbFindings('DB1', dbHead, bridgeHead, 'head'), []],
    ['the manifest at HEAD: a remote row beside its own stamp is cell 4', () => count(dbFindings('DB1', dbParent, { remote: [...bridgeHead.remote, { path: FX_PATHS.A, id: 'pa2' }], sessions: bridgeHead.sessions }, 'head')), 1],
    ['the manifest at the parent: cell 4 is recorded, not graded', () => dbFindings('DB1', dbParent, { remote: [...bridgeHead.remote, { path: FX_PATHS.A, id: 'pa2' }], sessions: bridgeHead.sessions }, 'parent'), []],
    ['the manifest: a stamp main does not report is named', () => count(dbFindings('DB1', dbHead, { ...bridgeHead, sessions: [{ id: 'a1', machineId: MACHINE_ID, closedProject: null }] }, 'head')), 1],
    ['the manifest: a remote row main does not list is named', () => count(dbFindings('DB1', dbHead, { ...bridgeHead, remote: [] }, 'head')), 1],
    ['the manifest: a stamp naming this Mac on a machine row is not cell 4', () => cell4({ sessions: [{ id: 's', project_path: FX_PATHS.D, machine_id: MACHINE_ID, status: 'running', project_tombstone: stamp(FX_PATHS.D) }], remote: dbHead.remote }), []],
    ['the manifest: a stamp the codec drops is no stamp', () => stampPath(JSON.stringify({ v: 1, projectId: '', projectName: 'x', path: '/x', closedAt: 1 })), null],
    ['the arms: empty means all twenty', () => chooseArms('').arms.length, 20],
    ['the arms: an unknown name is named', () => chooseArms('C1,Z9'), { arms: ['C1'], bad: ['Z9'] }],
    ['the arms: X2 alone drives C1 first', () => drivenArms(['X2']), ['C1', 'X2']],
    ['the arms: MH and B drive M and N', () => drivenArms(['B', 'MH']), ['N', 'M', 'MH', 'B']],
    ['the quiet agents: none installed holds', () => quietAgentsHeld({ agents: QUIET_AGENT_IDS.map((id) => ({ id, installed: false, binPath: null, version: null })) }).ok, true],
    ['the quiet agents: grok found refuses', () => quietAgentsHeld({ agents: QUIET_AGENT_IDS.map((id) => ({ id, installed: id === 'grok', binPath: id === 'grok' ? '/usr/local/bin/grok' : null, version: null })) }).ok, false],
    ['the quiet agents: a row missing from the list refuses', () => quietAgentsHeld({ agents: [] }).problems.length, 5],
    ['stale: a build newer than every source is not stale', () => staleSentence([['a.ts', 1000]], ['out/main/index.js', 2000]), null],
    ['stale: no bundle at all is a refusal, not a pass', () => staleSentence([['a.ts', 1000]], null), 'out/ holds no bundle for the sources this run reads; build first.']
  ];
  let ok = true;
  for (const [label, runIt, want] of fixtures) {
    let got;
    try {
      got = runIt();
    } catch (err) {
      got = `THREW ${err instanceof Error ? err.message : String(err)}`;
    }
    const good = J(got) === J(want);
    ok = ok && good;
    say(`${good ? 'ok  ' : 'BAD '} ${label}: ${J(got)}${good ? '' : ` want ${J(want)}`}`);
  }
  say(ok ? `self-test PASS: ${String(fixtures.length)} fixtures behaved` : 'self-test FAIL');
  return ok;
}

function printSideBySide(parentPath, headPath) {
  let parent = null;
  let head = null;
  try {
    parent = JSON.parse(readFileSync(parentPath, 'utf8'));
    head = JSON.parse(readFileSync(headPath, 'utf8'));
  } catch (err) {
    console.error(`${TAG} --side-by-side could not read its two files: ${err instanceof Error ? err.message : String(err)}`);
    return 2;
  }
  const table = sideBySide(parent, head);
  const pad = (s, n) => String(s).padEnd(n);
  console.log(`${pad('#', 3)} ${pad('Scenario', 62)} ${pad('Today', 44)} ${pad('HEAD', 44)} Verdict`);
  for (const l of table.lines) console.log(`${pad(l.n, 3)} ${pad(l.scenario, 62)} ${pad(l.today, 44)} ${pad(l.head, 44)} ${l.verdict} (${l.arms})`);
  console.log(table.worse === 0 ? `${TAG} no row reads worse at HEAD than at the parent.` : `${TAG} ${String(table.worse)} row(s) read WORSE at HEAD than at the parent; by his rule the part responsible is removed.`);
  return table.worse === 0 ? 0 : 1;
}

if (process.argv.includes('--self-test')) process.exit(selfTest() ? 0 : 1);
{
  const at = process.argv.indexOf('--side-by-side');
  if (at !== -1) {
    const [p, h] = [process.argv[at + 1], process.argv[at + 2]];
    if (p === undefined || h === undefined) {
      console.error(`${TAG} usage: --side-by-side <parent readings.json> <head readings.json>`);
      process.exit(2);
    }
    process.exit(printSideBySide(p, h));
  }
}

// ---------------------------------------------------------------------------
// The refusals, in the order they are asked.
// ---------------------------------------------------------------------------
const refuse = (why) => {
  console.error(`${TAG} REFUSED. ${why}`);
  process.exit(2);
};
const socket = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
if (socket === '') refuse('no GMUX_TMUX_SOCKET. Run `npm run probe:p306`, which wraps this file in build/harness-socket.mjs and build/with-scratch-machine.mjs.');
if (socket === 'gmux' || socket === 'default') refuse(`"${socket}" is not a harness socket.`);
if (!socket.startsWith('gmux-p306')) refuse(`"${socket}" is not a gmux-p306 harness socket.`);
const harnessDir = (process.env['GMUX_HARNESS_DIR'] ?? '').trim();
if (harnessDir === '') refuse('no GMUX_HARNESS_DIR, so there is nowhere scratch to put the HOME and the profile.');
const { arms: chosen, bad: badArms } = chooseArms(process.env['P306_ARMS']);
if (badArms.length > 0) refuse(`P306_ARMS names ${badArms.join(', ')}; the arms are ${ALL_ARMS.join(', ')}.`);
if (chosen.length === 0) refuse('P306_ARMS chose nothing.');
const driven = drivenArms(chosen);
const drives = (arm) => driven.includes(arm);

const parentCheckout = (process.env['P306_PARENT_CHECKOUT'] ?? '').trim();
const checkout = parentCheckout !== '' ? resolve(parentCheckout) : REPO;
const tag = parentCheckout !== '' ? 'parent' : 'head';
const mainBundle = join(checkout, 'out', 'main', 'index.js');
if (!existsSync(mainBundle)) refuse(`${mainBundle} is missing. Build that checkout first.`);
{
  const stat = (rel) => [rel, existsSync(join(checkout, rel)) ? statSync(join(checkout, rel)).mtimeMs : 0];
  const stale = staleSentence(MAIN_SOURCES.map(stat), [join('out', 'main', 'index.js'), statSync(mainBundle).mtimeMs]);
  if (stale !== null) refuse(`${tag} ${checkout}: ${stale}`);
}

/** What build/with-scratch-machine.mjs wrote for this run. */
const configRoot = (process.env['GMUX_CONFIG_ROOT'] ?? '').trim();
let carriage = null;
try {
  carriage = JSON.parse(readFileSync(join(configRoot, 'p69-carriage.json'), 'utf8'));
} catch {
  carriage = null;
}
if (configRoot === '' || carriage === null) {
  refuse('there is no p69-carriage.json inside GMUX_CONFIG_ROOT. Run me inside node build/with-scratch-machine.mjs, which `npm run probe:p306` does.');
}
if (typeof carriage.tmuxTmp !== 'string' || !carriage.tmuxTmp.startsWith('/tmp/')) {
  refuse(`the carriage names ${J(carriage.tmuxTmp)} as the machine's own TMUX_TMPDIR, which is not a scratch directory under /tmp.`);
}
const farTmux = String(carriage.remoteTmuxPath ?? '');
try {
  accessSync(farTmux, fsConstants.X_OK);
  if (!statSync(farTmux).isFile()) throw new Error('not a file');
} catch {
  refuse(`the carriage's tmux ${J(farTmux)} is not an executable file.`);
}
const FAR_ENV = { ...process.env, TMUX_TMPDIR: carriage.tmuxTmp };
const outDir = resolve(REPO, (process.env['P306_OUT_DIR'] ?? '').trim() || join('out', 'p306'));
mkdirSync(outDir, { recursive: true });

// ---------------------------------------------------------------------------
// The scratch world: folders on this Mac and on the loopback machine (which is
// this Mac, so every far folder is a directory here too), one HOME, one profile.
// ---------------------------------------------------------------------------
mkdirSync(join(harnessDir, 'p306'), { recursive: true });
const root = realpathSync(join(harnessDir, 'p306'));
const home = join(root, 'h');
const farRoot = join(root, 'far');
const profile = join(root, `p-${tag}`);
const dbScratch = join(root, 'db');
const P = {
  L: join(root, 'lima'),
  E: join(root, 'echo'),
  A: join(farRoot, 'alpha'),
  C: join(farRoot, 'charlie'),
  D: join(farRoot, 'delta'),
  Q: join(farRoot, 'quebec'),
  P: join(farRoot, 'papa'),
  Y: join(farRoot, 'yankee'),
  WIT: join(farRoot, 'witness'),
  W1: null
};
for (const d of [home, farRoot, profile, dbScratch]) {
  rmSync(d, { recursive: true, force: true });
  mkdirSync(d, { recursive: true });
}
for (const d of [P.L, P.E, P.A, P.C, P.D, P.Q, P.P, P.Y, P.WIT]) {
  rmSync(d, { recursive: true, force: true });
  mkdirSync(d, { recursive: true });
  writeFileSync(join(d, 'README.md'), `# Phase 306, ${base(d)}\n`);
}
writeFileSync(join(home, '.zshrc'), "PS1='p306 %# '\n");
writeFileSync(join(home, '.hushlogin'), '');

{
  const configDir = join(profile, 'gmux', 'config');
  mkdirSync(configDir, { recursive: true, mode: 0o700 });
  writeFileSync(
    join(configDir, 'machines.json'),
    `${J({ schema: 1, machines: [{ id: MACHINE_ID, label: 'p306 loopback', host: carriage.host, user: carriage.user, port: carriage.port, remoteTmuxPath: farTmux }] })}\n`,
    'utf8'
  );
  const knownMachines = join(profile, 'gmux', 'machines', 'known-machines');
  mkdirSync(dirname(knownMachines), { recursive: true });
  writeFileSync(knownMachines, keyscanText({ host: carriage.host, port: carriage.port, caller: CALLER }), 'utf8');
}

say(`${tag}: measuring ${checkout}, arms ${chosen.join(',')} (driven ${driven.join(',')}), socket ${socket}`);
say(`${tag}: the loopback machine on ${String(carriage.host)}:${String(carriage.port)} runs ${farTmux}, sessions under ${String(carriage.tmuxTmp)}`);

// ---------------------------------------------------------------------------
// The far server: witnesses made on it, and its end.
// ---------------------------------------------------------------------------

/** One synchronous far tmux call on the scratch machine's own server. */
function farTmuxRun(args) {
  return spawnSync(farTmux, ['-L', socket, '-f', '/dev/null', ...args], { encoding: 'utf8', env: FAR_ENV, timeout: 20_000 });
}

/**
 * A FEED-ONLY far session in `dir`: no manifest row, so no stamp, and the
 * options that make it ours set in the same tmux call as the create, so the
 * pass the create's own event starts already reads it whole.
 */
function makeFarSession(dir, name) {
  const id = randomUUID();
  const target = `=${name}:`;
  const r = farTmuxRun([
    'new-session', '-d', '-P', '-F', '#{session_id}', '-s', name, '-c', dir, 'exec sleep 1800',
    ';', 'set-option', '-t', target, '@gmux-id', id,
    ';', 'set-option', '-t', target, '@gmux-agent', 'shell',
    ';', 'set-option', '-t', target, '@gmux-name', name,
    ';', 'set-option', '-t', target, '@gmux-project', dir
  ]);
  const sid = (r.stdout ?? '').trim().split('\n')[0] ?? '';
  if (r.status !== 0 || !/^\$\d+$/.test(sid)) return { ok: false, why: `far new-session exited ${String(r.status)}: ${(r.stderr ?? '').trim().slice(0, 200)}` };
  const back = farTmuxRun(['display-message', '-p', '-t', sid, '#{@gmux-id}|#{session_path}']);
  const [gotId, gotPath] = (back.stdout ?? '').trim().split('|');
  if (gotId !== id) {
    // The chained form did not take on this tmux: set them by the $-id now.
    // The pass the create's event started may have read the session before
    // this, as not ours; the next pass reads it whole.
    for (const [opt, value] of [['@gmux-id', id], ['@gmux-agent', 'shell'], ['@gmux-name', name], ['@gmux-project', dir]]) farTmuxRun(['set-option', '-t', sid, opt, value]);
  }
  return { ok: true, sid, id, path: gotPath ?? null, chained: gotId === id };
}

let farEnded = false;
/**
 * The loopback machine's own tmux server, ended by the pid it reports through
 * the carriage's binary. build/with-scratch-machine.mjs ends it too when this
 * file exits. Called from the `finally` below and on `exit`, because an
 * interrupt runs no `finally`.
 */
function endFarServer() {
  if (farEnded) return;
  farEnded = true;
  const asked = farTmuxRun(['display-message', '-p', '#{pid}']);
  const pid = Number((asked.stdout ?? '').trim());
  if (!Number.isInteger(pid) || pid <= 1) return;
  try {
    process.kill(pid, 'SIGKILL');
    say(`ended the loopback machine's tmux server, pid ${String(pid)}`);
  } catch {
    /* already gone */
  }
}
process.on('exit', endFarServer);

/**
 * The scratch manifest, copied, and the COPY read by `/usr/bin/sqlite3`
 * (build/p274/probe-p274.mjs:126-155's shape).
 *
 * NOT `-readonly`, which the build round used and which never produced a
 * reading at either build (both verifiers, reproduced on a three-line WAL
 * database): the app has exited by now, so SQLite checkpointed the WAL and
 * removed `-wal` and `-shm`, and a WAL-mode database with no `-shm` cannot be
 * opened read-only, because opening it must create that file. It exits 14,
 * "unable to open database file". The copy is this probe's own file under the
 * run directory, so opening it read-write writes nothing anybody else reads,
 * and any `-wal` the copy carries is applied to the copy, never to the profile.
 */
function readManifest(label) {
  const db = join(profile, 'gmux', 'manifest.db');
  if (!existsSync(db)) return { error: `no manifest at ${db}` };
  const copy = join(dbScratch, `${label}.db`);
  for (const suffix of ['', '-wal', '-shm']) {
    rmSync(`${copy}${suffix}`, { force: true });
    if (existsSync(`${db}${suffix}`)) {
      try {
        writeFileSync(`${copy}${suffix}`, readFileSync(`${db}${suffix}`));
      } catch (err) {
        return { error: `the manifest could not be copied: ${String(err)}` };
      }
    }
  }
  const q = (sql) => spawnSync('/usr/bin/sqlite3', ['-json', copy, sql], { encoding: 'utf8', timeout: 20_000 });
  const parse = (r) => {
    if (r.status !== 0) throw new Error(`sqlite3 refused: ${(r.stderr ?? '').trim()}`);
    const text = (r.stdout ?? '').trim();
    return text === '' ? [] : JSON.parse(text);
  };
  try {
    return {
      sessions: parse(q('SELECT id, project_path, machine_id, status, project_tombstone FROM sessions;')),
      remote: parse(q('SELECT machine_id, path, id FROM remote_projects;'))
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

// ---------------------------------------------------------------------------
// The page kit. One expression, evaluated after every load, putting this
// probe's DOM readers on window.__p306. No product file gains a hook.
// ---------------------------------------------------------------------------
const PAGE_KIT = String.raw`
(() => {
  const esc = (s) => (typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(s) : s);
  const kit = {};
  kit.strip = async () => {
    const s = await window.__p293.state();
    const byId = new Map(s.store.projects.map((p) => [p.id, p]));
    const out = [];
    for (const el of document.querySelectorAll('[data-project-id]')) {
      const id = el.getAttribute('data-project-id');
      const p = byId.get(id);
      const b = el.getBoundingClientRect();
      out.push({ id, path: p ? p.path : null, machineId: p ? p.machineId : null, w: b.width, h: b.height, text: (el.textContent || '').replace(/\s+/g, ' ').trim() });
    }
    return out;
  };
  kit.group = (sessionId) => {
    const row = document.querySelector('tr.sm-row[data-manage-row="' + esc(sessionId) + '"]');
    if (!row) return null;
    const g = row.closest('tbody') ? row.closest('tbody').querySelector('tr.sm-group[data-manage-group]') : null;
    if (!g) return { listed: true, key: null, tabOpen: null, label: null, th: null };
    const strong = g.querySelector('.sm-group-name strong');
    return {
      listed: true,
      key: g.getAttribute('data-manage-group'),
      tabOpen: g.getAttribute('data-tab-open'),
      label: strong ? (strong.textContent || '').trim() : null,
      th: (g.textContent || '').replace(/\s+/g, ' ').trim()
    };
  };
  kit.drawnRows = () => Array.prototype.slice.call(document.querySelectorAll('tr.sm-row[data-manage-row]')).map((el) => el.getAttribute('data-manage-row'));
  // The first DRAWN element a selector names, so a control written in two
  // places (the New session button is in the strip and the dock) is found
  // wherever it is on screen.
  kit.box = (selector) => {
    for (const el of document.querySelectorAll(selector)) {
      el.scrollIntoView({ block: 'nearest' });
      const b = el.getBoundingClientRect();
      if (b.width > 0 && b.height > 0) return { x: b.left + b.width / 2, y: b.top + b.height / 2, disabled: el.disabled === true || el.getAttribute('aria-disabled') === 'true', verb: el.getAttribute('data-verb') };
    }
    return null;
  };
  // A controlled input's value set the way React hears it: the native setter,
  // then an input event.
  kit.setValue = (selector, value) => {
    const el = document.querySelector(selector);
    if (!el) return false;
    const proto = el.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
    el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
    return el.value === value;
  };
  window.__p306 = kit;
  return true;
})()
`;

/** The page that carries both drives and the bridge. */
async function cdpForAppWindow(profileDir, timeoutMs) {
  const started = Date.now();
  for (;;) {
    let port = 0;
    try {
      port = Number(readFileSync(join(profileDir, 'DevToolsActivePort'), 'utf8').split('\n')[0].trim());
    } catch {
      port = 0;
    }
    if (port > 0) {
      let list = [];
      try {
        list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      } catch {
        list = [];
      }
      for (const t of list) {
        if (t.type !== 'page' || !t.webSocketDebuggerUrl) continue;
        let cdp = null;
        try {
          cdp = await wsConnect(t.webSocketDebuggerUrl);
          const a = await cdpEval(cdp, `typeof window.gmux === 'object' && typeof window.__gmuxP95 === 'object' && typeof window.__p293 === 'object' ? location.href : null`, 5000);
          if (typeof a === 'string') return { cdp, url: a };
          cdp.close();
        } catch {
          try {
            cdp?.close();
          } catch {
            /* already closed */
          }
        }
      }
    }
    if (Date.now() - started > timeoutMs) throw new Error('no app window carrying the Phase 95 and Phase 293 drives');
    await sleep(250);
  }
}

async function waitFor(what, test, ms, every = 250) {
  const started = Date.now();
  for (;;) {
    const got = await test();
    if (got) return got;
    if (Date.now() - started > ms) throw new Error(`${what} did not happen within ${String(ms / 1000)} s`);
    await sleep(every);
  }
}

// ---------------------------------------------------------------------------
// The run.
// ---------------------------------------------------------------------------
const findings = Object.fromEntries([...ALL_ARMS, 'DB1', 'DB2', 'RUN'].map((a) => [a, []]));
const readings = { tag, checkout, socket, chosen, driven, farTmux, carriage: { host: carriage.host, port: carriage.port, tmuxTmp: carriage.tmuxTmp }, paths: P, arms: {}, launches: [], witnesses: [], notes: [] };
const note = (l) => {
  readings.notes.push(l);
  say(`note: ${l}`);
};
let refusedAfterLaunch = null;
let witnessCount = 0;
/** The one feed-only far session every pass witness renames, made in the fixture. */
let witnessSession = null;
const ids = {};

function launchOptions(label, ceilingMs) {
  return {
    label: `p306-${tag}-${label}`,
    userDataDir: profile,
    tmuxSocket: socket,
    cwd: checkout,
    args: [
      '--remote-debugging-port=0',
      '--use-mock-keychain',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-background-timer-throttling'
    ],
    env: withoutDevRenderer({
      HOME: home,
      GMUX_TMUX_SOCKET: socket,
      GMUX_PROBES: '1',
      GMUX_SPECSTORY_NO_CLOUD: '1',
      GMUX_CONFIG_ROOT: configRoot,
      ...(typeof carriage.authSock === 'string' ? { SSH_AUTH_SOCK: carriage.authSock } : {})
    }),
    graceMs: 8_000,
    ceilingMs
  };
}

/**
 * One launch through the helper, after the quiet agents are written, with the
 * app window's DevTools page handed to `body` and closed whatever happened.
 */
async function launch(label, ceilingMs, body) {
  writeQuietAgents(profile);
  const rec = { label, bridge: null, db: null, agentsHeld: null, error: null };
  readings.launches.push(rec);
  try {
    await withElectron(launchOptions(label, ceilingMs), async (handle) => {
      const { cdp, url } = await cdpForAppWindow(profile, 120_000);
      say(`${label}: app window at ${url}, pid ${String(handle.appPid())}`);
      try {
        await cdp.call('Runtime.enable');
        await cdp.call('Emulation.setFocusEmulationEnabled', { enabled: true }).catch(() => undefined);
        await waitFor('the page load', async () => (await cdpEval(cdp, `performance.getEntriesByType('navigation')[0].loadEventEnd`)) > 0, 30_000, 50);
        await cdp.call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
        await sleep(600);
        // NO AGENT STARTS: the five renamed rows must read not installed, or nothing goes on.
        const scan = await cdpEval(cdp, 'window.gmux.agentsList()', 60_000);
        const held = quietAgentsHeld(scan);
        rec.agentsHeld = held;
        if (!held.ok) {
          refusedAfterLaunch = `agents:list says the renamed agents are not all absent: ${held.problems.join('; ')}`;
          return;
        }
        await cdpEval(cdp, PAGE_KIT);
        const ctx = makeContext(cdp, handle);
        try {
          await body(ctx);
        } finally {
          try {
            rec.bridge = { remote: await ctx.mainRemote(), sessions: await ctx.sessions() };
          } catch (err) {
            note(`${label}: the last bridge reading failed: ${err instanceof Error ? err.message : String(err)}`);
          }
        }
      } finally {
        try {
          writeFileSync(join(outDir, `app-${tag}-${label}.log`), handle.text());
        } catch {
          /* the readings are the evidence; this is the footnote */
        }
        cdp.close();
      }
    });
  } catch (err) {
    rec.error = err instanceof Error ? err.message : String(err);
    findings.RUN.push(`${label}: the launch did not complete: ${rec.error}`);
  }
  // The app has exited; the manifest is read from a copy, never live.
  rec.db = readManifest(label);
  return rec;
}

/** Every reader and gesture one launch's arms use, bound to its page. */
function makeContext(cdp, handle) {
  const ev = (expr, ms = 60_000) => cdpEval(cdp, expr, ms);
  const p95 = (method, ...args) =>
    ev(`(async () => { const d = window.__gmuxP95; if (d === undefined) return { missing: true }; return await d.${method}(${args.map((a) => J(a)).join(', ')}); })()`, 180_000);
  const p293 = (call) => ev(`window.__p293.${call}`, 120_000);
  const ctx = {
    cdp,
    handle,
    ev,
    p95,
    p293,
    mainRemote: () => ev(`window.gmux.projects.list().then((l) => l.filter((p) => p.machineId === ${J(MACHINE_ID)}).map((p) => ({ path: p.path, id: p.id })))`),
    mainLocal: () => ev(`window.gmux.projects.list().then((l) => l.filter((p) => p.machineId === undefined || p.machineId === null || p.machineId === 'local').map((p) => ({ path: p.path, id: p.id })))`),
    sessions: () =>
      ev(`window.gmux.sessions.list().then((l) => l.map((s) => ({ id: s.id, name: s.name, tmuxName: s.tmuxName, status: s.status, projectPath: s.projectPath, cwd: s.cwd, machineId: s.machine ? s.machine.id : null, closedProject: s.closedProject ? { name: s.closedProject.name, path: s.closedProject.path } : null })))`),
    strip: () => ev('window.__p306.strip()'),
    group: (id) => ev(`window.__p306.group(${J(id)})`),
    drawnRows: () => ev('window.__p306.drawnRows()'),
    state: () => p293('state()')
  };
  ctx.inMain = async (path) => (await ctx.mainRemote()).some((p) => p.path === path);
  ctx.inStrip = async (path, machineId = MACHINE_ID) =>
    (await ctx.strip()).some((b) => b.path === path && (b.machineId ?? null) === machineId && b.w > 0 && b.h > 0);
  ctx.session = async (id) => (await ctx.sessions()).find((s) => s.id === id) ?? null;
  /** A REAL click at the centre of the first element a selector names (probe:p293's click). */
  ctx.click = async (selector, settleMs = 300) => {
    const box = await ev(`window.__p306.box(${J(selector)})`, 10_000);
    if (box === null) return { ok: false, why: `nothing drawn at ${selector}` };
    if (box.disabled) return { ok: false, why: `${selector} is disabled` };
    const m = (type, extra) => cdp.call('Input.dispatchMouseEvent', { type, x: Math.round(box.x), y: Math.round(box.y), ...extra });
    await m('mouseMoved', { button: 'none', buttons: 0 });
    await sleep(80);
    await m('mousePressed', { button: 'left', buttons: 1, clickCount: 1 });
    await m('mouseReleased', { button: 'left', buttons: 0, clickCount: 1 });
    if (settleMs > 0) await sleep(settleMs);
    return { ok: true, why: '', verb: box.verb };
  };
  /** A native select's value, chosen the one way a probe can (probe:p293's choose). */
  ctx.choose = (selector, value) =>
    ev(`(() => { const el = document.querySelector(${J(selector)}); if (!el) return false; el.value = ${J(value)}; el.dispatchEvent(new Event('change', { bubbles: true })); return el.value === ${J(value)}; })()`, 10_000);
  ctx.ensureSheet = async () => {
    let s = await ctx.state();
    if (!s.sheet) s = await p293("open('managed')");
    if (s.sheet && s.tab !== 'sm-tab-managed') {
      await ctx.click('#sm-tab-managed');
      s = await ctx.state();
    }
    if (!s.sheet) throw new Error('the session manager did not open');
    return s;
  };
  ctx.closeSheet = async () => {
    const s = await ctx.state();
    if (!s.sheet) return;
    await ctx.click('.session-sheet [aria-label="Close session manager"]');
    await waitFor('the session manager to close', async () => !(await ctx.state()).sheet, 5_000).catch(() => undefined);
  };
  /** Whether the Closed tab filter draws `id`, the filter put back to all after. */
  ctx.closedFilterHas = async (id) => {
    await ctx.ensureSheet();
    await ctx.choose('#sm-filter-tab', 'closed');
    await sleep(500);
    const drawn = await ctx.drawnRows();
    await ctx.choose('#sm-filter-tab', 'all');
    await sleep(300);
    return drawn.includes(id);
  };
  /** A session's group on Managed, the sheet opened for it. */
  ctx.groupOf = async (id) => {
    await ctx.ensureSheet();
    await ctx.choose('#sm-filter-tab', 'all').catch(() => false);
    await sleep(400);
    return ctx.group(id);
  };
  ctx.openRemote = async (path) => {
    let opened = null;
    for (let attempt = 1; attempt <= 6; attempt += 1) {
      opened = await p95('openRemote', MACHINE_ID, path);
      if (opened?.result?.ok === true) return opened;
      await sleep(3000);
    }
    throw new Error(`${path} did not open on the machine: ${J(opened?.result ?? null).slice(0, 400)}`);
  };
  ctx.closeTab = async (path, machineId = MACHINE_ID) => {
    await ctx.closeSheet();
    return (await p293(`closeTab(${J(path)}, ${J(machineId)})`)) === true;
  };
  ctx.createShell = async (path, name, machineId) => {
    const id = await p293(`createSession(${J(machineId === undefined ? { path, name } : { path, name, machineId })})`);
    if (typeof id !== 'string') throw new Error(`${name} was not created: ${J(id)}`);
    return id;
  };
  /**
   * A FRESH feed-only far folder, and main's list holding it: a folder that
   * never had a tab (arm N). It makes the window re-read the project list, so
   * it is never the pass witness.
   */
  ctx.newFeedFolder = async (label) => {
    const dir = join(farRoot, label);
    mkdirSync(dir, { recursive: true });
    const started = Date.now();
    const made = makeFarSession(dir, `p306-${label}`);
    const rec = { path: dir, ok: false, ms: null, chained: made.chained ?? null, why: null };
    if (!made.ok) {
      rec.why = made.why;
      return rec;
    }
    try {
      await waitFor(`p306far:${dir} in main's list`, () => ctx.inMain(dir), WITNESS_MS, 300);
      rec.ok = true;
      rec.ms = Date.now() - started;
    } catch (err) {
      rec.why = err instanceof Error ? err.message : String(err);
    }
    say(`${label}: ${rec.ok ? `in main's list after ${String(rec.ms)} ms` : `NONE (${String(rec.why)})`}`);
    return rec;
  };
  /**
   * The pass witness (the header): the fixture's witness session renamed, and
   * main's session list showing the new name. It adds no folder, so the
   * window re-reads nothing because of it.
   */
  ctx.witness = async (why) => {
    witnessCount += 1;
    const name = `p306-wit-${String(witnessCount)}`;
    const rec = { n: witnessCount, for: why, name, ok: false, ms: null, why: null };
    readings.witnesses.push(rec);
    if (witnessSession === null) {
      rec.why = 'the fixture made no witness session';
      return rec;
    }
    const started = Date.now();
    const renamed = farTmuxRun(['rename-session', '-t', witnessSession.sid, name]);
    if (renamed.status !== 0) {
      rec.why = `far rename-session exited ${String(renamed.status)}: ${(renamed.stderr ?? '').trim().slice(0, 200)}`;
      return rec;
    }
    try {
      await waitFor(`${name} in main's session list`, async () => (await ctx.sessions()).some((x) => x.tmuxName === name), WITNESS_MS, 300);
      rec.ms = Date.now() - started;
      // The broadcast that pass sent, and any read the window makes of it.
      await sleep(2500);
      rec.ok = true;
    } catch (err) {
      rec.why = err instanceof Error ? err.message : String(err);
    }
    say(`witness ${name} for ${why}: ${rec.ok ? `in main's list after ${String(rec.ms)} ms` : `NONE (${String(rec.why)})`}`);
    return rec;
  };
  /**
   * The REAL New session sheet, from the tab of `from` on the machine: the
   * tab focused by Open on machine (the store focuses a tab that is already
   * open), the New session button, the Shell tile, the Name and Directory
   * fields, Create. Ported from the second verifier's own driver, which ran it
   * at both builds.
   */
  ctx.uiCreate = async ({ from, name, dir }) => {
    await ctx.closeSheet();
    await ctx.openRemote(from);
    const st = await ctx.state();
    const tab = st.store.projects.find((p) => p.path === from && p.machineId === MACHINE_ID);
    if (tab === undefined || st.store.activeProjectId !== tab.id) throw new Error(`${from}'s tab is not the active one (active ${J(st.store.activeProjectId)})`);
    const opened = await ctx.click('button[aria-label^="New session ("]', 600);
    if (!opened.ok) throw new Error(`New session: ${opened.why}`);
    await waitFor('the New session sheet', () => ctx.ev(`document.querySelector('.modal[aria-label="New session"]') !== null`, 5_000), 5_000);
    const tile = await ctx.click('.modal[aria-label="New session"] .agent-tile[aria-label="Shell"]', 300);
    if (!tile.ok) throw new Error(`the Shell tile: ${tile.why}`);
    if ((await ctx.ev(`window.__p306.setValue('#session-name', ${J(name)})`, 5_000)) !== true) throw new Error('the Name field did not take the name');
    if ((await ctx.ev(`window.__p306.setValue('#session-dir', ${J(dir)})`, 5_000)) !== true) throw new Error('the Directory field did not take the folder');
    await sleep(300);
    const created = await ctx.click('.modal[aria-label="New session"] .modal-actions .btn-primary', 300);
    if (!created.ok) throw new Error(`Create: ${created.why}`);
    await waitFor('the New session sheet to close', () => ctx.ev(`document.querySelector('.modal[aria-label="New session"]') === null`, 5_000), 90_000);
    const made = await waitFor(`${name} in main's session list`, async () => (await ctx.sessions()).find((x) => x.name === name) ?? null, 30_000);
    return made.id;
  };
  ctx.heldNow = () => heldFromLog(handle.text());
  ctx.reinstall = async () => {
    await waitFor('the drives after the reload', async () => (await ev(`typeof window.gmux === 'object' && typeof window.__gmuxP95 === 'object' && typeof window.__p293 === 'object'`, 5_000).catch(() => false)) === true, 60_000);
    await waitFor('the page load after the reload', async () => (await ev(`performance.getEntriesByType('navigation')[0].loadEventEnd`, 5_000).catch(() => 0)) > 0, 30_000, 100);
    await ev(PAGE_KIT);
    await waitFor('the bootstrap project list', async () => (await ctx.state()).store.projects.length > 0, 30_000);
  };
  return ctx;
}

/** Run one arm's steps, its reading recorded whatever happened. */
async function arm(name, steps) {
  if (!drives(name)) return;
  const r = {};
  readings.arms[name] = r;
  say(`arm ${name}${chosen.includes(name) ? '' : ' (driven for a later arm, not graded)'}`);
  try {
    await steps(r);
  } catch (err) {
    r.error = err instanceof Error ? err.message : String(err);
    say(`arm ${name} stopped: ${r.error}`);
  }
}

/** Where A stands after a step: main's list and the strip. */
async function aStands(ctx, r, path = P.A) {
  r.inMain = await ctx.inMain(path);
  r.inStrip = await ctx.inStrip(path);
}

try {
  // ======================================================== LAUNCH 1
  await launch('launch1', 40 * 60 * 1000, async (ctx) => {
    // ------------------------------------------------------- the fixture
    const up = await ctx.p95('machineUp', MACHINE_ID);
    readings.machine = up;
    if (!(up?.rows ?? []).some((row) => row.id === MACHINE_ID && row.usable)) throw new Error(`the loopback machine is not usable: ${J(up).slice(0, 600)}`);
    await ctx.p293(`addProject(${J(P.L)})`);
    ids.l1 = await ctx.createShell(P.L, 'p306-l1');
    await ctx.p293(`addProject(${J(P.E)})`);
    ids.x1 = await ctx.createShell(P.E, 'p306-x1');
    for (const dir of [P.A, P.C, P.D, P.Q, P.P]) await ctx.openRemote(dir);
    ids.a1 = await ctx.createShell(P.A, 'p306-a1', MACHINE_ID);
    // a2 is the one arm K ends, so a1 stays LIVE in A through the relaunch.
    ids.a2 = await ctx.createShell(P.A, 'p306-a2', MACHINE_ID);
    ids.c1 = await ctx.createShell(P.C, 'p306-c1', MACHINE_ID);
    ids.d1 = await ctx.createShell(P.D, 'p306-d1', MACHINE_ID);
    ids.q1 = await ctx.createShell(P.Q, 'p306-q1', MACHINE_ID);
    await waitFor('every fixture session to read live', async () => {
      const list = await ctx.sessions();
      return ['l1', 'x1', 'a1', 'a2', 'c1', 'd1', 'q1'].every((k) => list.some((s) => s.id === ids[k] && LIVE.includes(s.status)));
    }, 45_000);
    // The witness session: made once, after a create started the far server,
    // in a folder of its own, which opens on the first pass at both builds.
    {
      const made = makeFarSession(P.WIT, 'p306-wit-0');
      if (!made.ok) throw new Error(`the witness session was not made: ${made.why}`);
      witnessSession = made;
      await waitFor(`p306far:${P.WIT} in main's list`, () => ctx.inMain(P.WIT), WITNESS_MS, 300);
      readings.witnessSession = { sid: made.sid, path: made.path, chained: made.chained };
    }
    if (!(await ctx.closeTab(P.E, null))) throw new Error('the local tab of X did not close');
    const x1 = await ctx.session(ids.x1);
    if (x1?.closedProject?.path !== P.E) note(`X's local close left x1's closedProject ${J(x1?.closedProject ?? null)}, not E`);
    readings.ids = { ...ids };
    say(`fixture: L open with l1, X closed on this Mac, A C D Q P open on ${MACHINE_ID} with a1 a2 c1 d1 q1, the witness session ${String(witnessSession?.sid)} (${J(ids)})`);

    // -------------------------------------------------------------- O
    await arm('O', async (r) => {
      r.aInMain = await ctx.inMain(P.A);
      r.aInStrip = await ctx.inStrip(P.A);
      const a1 = await ctx.session(ids.a1);
      r.a1Status = a1?.status ?? null;
      r.a1Live = LIVE.includes(r.a1Status);
      const g = await ctx.groupOf(ids.a1);
      r.a1TabOpen = g?.tabOpen ?? null;
      r.a1Label = g?.label ?? null;
      await ctx.closeSheet();
    });

    // -------------------------------------------------------------- N
    await arm('N', async (r) => {
      r.witness = await ctx.newFeedFolder('w1');
      P.W1 = r.witness.path;
    });

    // -------------------------------------------------------------- E
    await arm('E', async (r) => {
      const started = Date.now();
      const made = makeFarSession(P.E, 'p306-e');
      if (!made.ok) {
        r.ok = false;
        r.why = made.why;
        return;
      }
      try {
        await waitFor(`p306far:${P.E} in main's list`, () => ctx.inMain(P.E), WITNESS_MS, 300);
        r.ok = true;
        r.ms = Date.now() - started;
      } catch (err) {
        r.ok = false;
        r.why = err instanceof Error ? err.message : String(err);
      }
      r.localXInMain = (await ctx.mainLocal()).some((p) => p.path === P.E);
    });

    // ------------------------------------------------------------- C1
    await arm('C1', async (r) => {
      const before = (await ctx.mainRemote()).find((p) => p.path === P.A);
      r.idBefore = before?.id ?? null;
      r.closed = await ctx.closeTab(P.A);
      r.nowInStrip = await ctx.inStrip(P.A);
      const a1 = await ctx.session(ids.a1);
      r.nowA1Status = a1?.status ?? null;
      r.nowA1Live = LIVE.includes(r.nowA1Status);
      r.nowStampPath = a1?.closedProject?.path ?? null;
      r.witness = await ctx.witness('C1, the first close');
      const after = (await ctx.mainRemote()).find((p) => p.path === P.A);
      r.afterInMain = after !== undefined;
      r.afterId = after?.id ?? null;
      r.afterNewId = after !== undefined && after.id !== r.idBefore;
      r.afterInStrip = await ctx.inStrip(P.A);
      r.held = ctx.heldNow();
    });

    // ------------------------------------------------------------- C2
    await arm('C2', async (r) => {
      r.reopen = (await ctx.openRemote(P.A))?.result?.ok === true;
      r.reopenedInMain = await ctx.inMain(P.A);
      r.closed = await ctx.closeTab(P.A);
      r.witness = await ctx.witness('C2, the second close');
      await aStands(ctx, r);
    });

    // -------------------------------------------------------------- S
    await arm('S', async (r) => {
      const g = await ctx.groupOf(ids.a1);
      r.listed = g?.listed === true;
      r.label = g?.label ?? null;
      r.tabOpen = g?.tabOpen ?? null;
      r.th = g?.th ?? null;
      r.closedFilterHasA1 = await ctx.closedFilterHas(ids.a1);
    });

    // ------------------------------------------------------------- F1
    await arm('F1', async (r) => {
      await ctx.ensureSheet();
      const c = await ctx.click('.session-sheet button[aria-label="Refresh session list"]', 1500);
      r.clicked = c.ok;
      r.why = c.why;
      r.witness = await ctx.witness('F1, Refresh');
      await aStands(ctx, r);
      const g = await ctx.groupOf(ids.a1);
      r.listed = g?.listed === true;
      r.label = g?.label ?? null;
      r.tabOpen = g?.tabOpen ?? null;
      r.closedFilterHasA1 = await ctx.closedFilterHas(ids.a1);
    });

    // ------------------------------------------------------------- F3
    await arm('F3', async (r) => {
      r.killed = (await ctx.p293(`killOutOfBand(${J(ids.l1)})`)) === true;
      await waitFor('l1 to read ended', async () => ENDED.includes((await ctx.session(ids.l1))?.status ?? ''), 30_000);
      await ctx.ensureSheet();
      const c = await ctx.click(`[data-manage-primary="${ids.l1}"][data-verb="restore"]`, 500);
      r.pressed = c.ok;
      r.why = c.why;
      if (c.ok) {
        await waitFor('l1 to read live after Restore', async () => LIVE.includes((await ctx.session(ids.l1))?.status ?? ''), 30_000).catch((err) => note(`F3: ${err instanceof Error ? err.message : String(err)}`));
      }
      r.l1Status = (await ctx.session(ids.l1))?.status ?? null;
      r.witness = await ctx.witness('F3, a restore landing on Managed');
      await aStands(ctx, r);
    });

    // ------------------------------------------------------------- LC
    await arm('LC', async (r) => {
      await ctx.ensureSheet();
      const c = await ctx.click('.session-sheet button[aria-label="Refresh session list"]', 1500);
      r.clicked = c.ok;
      r.why = c.why;
      r.xInMain = (await ctx.mainLocal()).some((p) => p.path === P.E);
      r.xInStrip = await ctx.inStrip(P.E, null);
      await ctx.closeSheet();
    });

    // -------------------------------------------------------------- R
    await arm('R', async (r) => {
      try {
        await ctx.ev(`window.gmux.sessions.rename(${J({ sessionId: ids.a1, name: 'p306-a1-renamed' })})`);
        r.renamed = true;
      } catch (err) {
        r.renamed = false;
        r.why = err instanceof Error ? err.message : String(err);
      }
      r.witness = await ctx.witness('R, a rename');
      await aStands(ctx, r);
    });

    // -------------------------------------------------------------- W
    await arm('W', async (r) => {
      try {
        r.prepare = await ctx.ev(`window.gmux.machines.prepare(${J(MACHINE_ID)}).then((x) => ({ class: x.class, detail: x.detail ?? null }))`, 120_000);
      } catch (err) {
        r.prepare = { error: err instanceof Error ? err.message : String(err) };
      }
      r.witness = await ctx.witness('W, a re-prepare (the stand-in for a wake)');
      await aStands(ctx, r);
    });

    // -------------------------------------------------------------- K
    await arm('K', async (r) => {
      // a2, not a1: a1 stays running in A so the relaunch (X2) measures the
      // hold over a live session (the second verifier).
      await ctx.ensureSheet();
      let c = await ctx.click(`[data-manage-primary="${ids.a2}"][data-verb="end"]`);
      if (!c.ok) throw new Error(`a2's End: ${c.why}`);
      await waitFor('the End panel', async () => {
        const s = await ctx.state();
        return s.inline?.id === ids.a2 && s.inline?.kind === 'end';
      }, 5_000);
      c = await ctx.click('[data-sm-confirm="end"]');
      if (!c.ok) throw new Error(`Confirm: ${c.why}`);
      await waitFor('a2 to read ended', async () => ENDED.includes((await ctx.session(ids.a2))?.status ?? ''), 30_000).catch(() => undefined);
      r.a2Status = (await ctx.session(ids.a2))?.status ?? null;
      r.a1Status = (await ctx.session(ids.a1))?.status ?? null;
      r.witness = await ctx.witness('K, End from the sheet');
      await aStands(ctx, r);
      const g = await ctx.groupOf(ids.a2);
      r.label = g?.label ?? null;
      r.tabOpen = g?.tabOpen ?? null;
      await ctx.closeSheet();
    });

    // -------------------------------------------------------------- V
    await arm('V', async (r) => {
      await ctx.closeSheet();
      await ctx.cdp.call('Page.reload', { ignoreCache: false });
      await sleep(1500);
      await ctx.reinstall();
      r.witness = await ctx.witness('V, a reloaded window');
      await aStands(ctx, r);
    });

    // -------------------------------------------------------------- D
    await arm('D', async (r) => {
      r.closed = await ctx.closeTab(P.D);
      r.witness = await ctx.witness('D, the close before the create');
      r.heldBeforeCreate = await ctx.inMain(P.D);
      try {
        ids.d2 = await ctx.createShell(P.D, 'p306-d2', MACHINE_ID);
        r.created = true;
      } catch (err) {
        r.created = false;
        r.why = err instanceof Error ? err.message : String(err);
      }
      await waitFor('D in main\'s list after the create', () => ctx.inMain(P.D), 30_000).catch(() => undefined);
      r.inMain = await ctx.inMain(P.D);
      await waitFor('D in the strip after the create', () => ctx.inStrip(P.D), 15_000).catch(() => undefined);
      r.inStrip = await ctx.inStrip(P.D);
      r.d1Stamp = (await ctx.session(ids.d1))?.closedProject?.path ?? null;
    });

    // ------------------------------------------------------------- DS
    await arm('DS', async (r) => {
      r.closed = await ctx.closeTab(P.Q);
      r.witness = await ctx.witness('DS, the close before the sheet create');
      r.heldBeforeCreate = await ctx.inMain(P.Q);
      try {
        ids.q2 = await ctx.uiCreate({ from: P.C, name: 'p306-q2', dir: P.Q });
        r.created = true;
      } catch (err) {
        r.created = false;
        r.why = err instanceof Error ? err.message : String(err);
        // A sheet left open would sit over every later arm: its own Cancel.
        await ctx.ev(`(() => { for (const b of document.querySelectorAll('.modal[aria-label="New session"] .modal-actions button')) { if ((b.textContent || '').trim() === 'Cancel') { b.click(); return true; } } return false; })()`, 5_000).catch(() => undefined);
      }
      await waitFor('Q in main\'s list after the create', () => ctx.inMain(P.Q), 30_000).catch(() => undefined);
      r.inMain = await ctx.inMain(P.Q);
      await waitFor('Q in the strip after the create', () => ctx.inStrip(P.Q), 15_000).catch(() => undefined);
      r.inStrip = await ctx.inStrip(P.Q);
      r.q1Stamp = (await ctx.session(ids.q1))?.closedProject?.path ?? null;
      r.q2ProjectPath = ids.q2 === undefined ? null : ((await ctx.session(ids.q2))?.projectPath ?? null);
    });

    // -------------------------------------------------------------- G
    await arm('G', async (r) => {
      r.closed = await ctx.closeTab(P.C);
      r.witness = await ctx.witness('G, the close before Go to session');
      await ctx.ensureSheet();
      const items = await ctx.p293(`menuItemsFor(${J(ids.c1)})`);
      r.items = (items ?? []).map((i) => i.label);
      r.ran = (await ctx.p293(`runMenuItem(${J(ids.c1)}, 'Go to session')`)) === true;
      if (!r.ran) r.why = `the sheet's menu for c1 held ${J(r.items)}`;
      await waitFor('C in the strip after Go to session', () => ctx.inStrip(P.C), 15_000).catch(() => undefined);
      r.cInStrip = await ctx.inStrip(P.C);
      const s = await ctx.state();
      r.activeSessionId = s.store.activeSessionId;
      r.c1Active = s.store.activeSessionId === ids.c1;
      const box = (await ctx.strip()).find((b) => b.path === P.C && b.machineId === MACHINE_ID && b.w > 0);
      r.tabText = box?.text ?? null;
      r.tabLabelOk = typeof r.tabText === 'string' && r.tabText.includes(base(P.C));
      r.c1Stamp = (await ctx.session(ids.c1))?.closedProject?.path ?? null;
      await ctx.closeSheet();
    });

    // -------------------------------------------------------------- M
    await arm('M', async (r) => {
      try {
        const made = await ctx.ev(
          `window.gmux.sessions.create(${J({ name: 'p306-m1', projectPath: P.P, projectMachineId: MACHINE_ID, machineId: MACHINE_ID, cwd: P.Y, agent: 'shell' })}).then((s) => s.id)`,
          120_000
        );
        ids.m1 = made;
        r.created = typeof made === 'string';
      } catch (err) {
        r.created = false;
        r.why = err instanceof Error ? err.message : String(err);
      }
      await waitFor('Y in main\'s list', () => ctx.inMain(P.Y), 30_000).catch(() => undefined);
      r.yInMain = await ctx.inMain(P.Y);
      r.pInMain = await ctx.inMain(P.P);
      if (ids.m1 !== undefined) {
        await waitFor('m1 recorded in Y', async () => (await ctx.session(ids.m1))?.projectPath === P.Y, 30_000).catch(() => undefined);
        r.m1ProjectPath = (await ctx.session(ids.m1))?.projectPath ?? null;
      }
    });

    // ------------------------------------------------------------- MH
    await arm('MH', async (r) => {
      // The window never draws Y after M's bridge create, at either build (both
      // verifiers), so Y is opened the way a person would before it is closed.
      try {
        r.opened = (await ctx.openRemote(P.Y))?.result?.ok === true;
      } catch (err) {
        r.opened = false;
        r.openWhy = err instanceof Error ? err.message : String(err);
      }
      await waitFor('Y in the window\'s project list', async () => (await ctx.state()).store.projects.some((p) => p.path === P.Y && p.machineId === MACHINE_ID), 30_000).catch(() => undefined);
      r.closed = await ctx.closeTab(P.Y);
      if (!r.closed) return;
      r.witness = await ctx.witness('MH, the placed folder closed');
      r.yInMain = await ctx.inMain(P.Y);
      r.yInStrip = await ctx.inStrip(P.Y);
      if (ids.m1 !== undefined) {
        const g = await ctx.groupOf(ids.m1);
        r.label = g?.label ?? null;
        r.tabOpen = g?.tabOpen ?? null;
        await ctx.closeSheet();
      }
    });

    // -------------------------------------------------------------- B
    await arm('B', async (r) => {
      if (P.W1 === null) throw new Error('W1 was never made');
      await waitFor('W1 in the window\'s project list', async () => (await ctx.state()).store.projects.some((p) => p.path === P.W1 && p.machineId === MACHINE_ID), 30_000).catch(() => undefined);
      r.closed = await ctx.closeTab(P.W1);
      r.witness = await ctx.witness('B, the stated limit');
      r.w1InMain = await ctx.inMain(P.W1);
    });

    readings.heldLast = ctx.heldNow();
  });

  // ======================================================== LAUNCH 2
  if (refusedAfterLaunch === null && drives('X2')) {
    await launch('launch2', 15 * 60 * 1000, async (ctx) => {
      await arm('X2', async (r) => {
        const up = await ctx.p95('machineUp', MACHINE_ID);
        r.machineUsable = (up?.rows ?? []).some((row) => row.id === MACHINE_ID && row.usable);
        r.witness = await ctx.witness('X2, the relaunch');
        await aStands(ctx, r);
        if (ids.a1 !== undefined) {
          const g = await ctx.groupOf(ids.a1);
          r.label = g?.label ?? null;
          r.tabOpen = g?.tabOpen ?? null;
          r.a1Status = (await ctx.session(ids.a1))?.status ?? null;
          await ctx.closeSheet();
        }
      });
    });
  }
} catch (err) {
  findings.RUN.push(`the run stopped: ${err instanceof Error ? err.message : String(err)}`);
} finally {
  endFarServer();
}

if (refusedAfterLaunch !== null) refuse(refusedAfterLaunch);

// -- the report ---------------------------------------------------------------
for (const a of chosen) findings[a].push(...gradeArm(a, readings.arms[a], tag, P));
for (const [i, rec] of readings.launches.entries()) {
  const key = `DB${String(i + 1)}`;
  if (findings[key] !== undefined) findings[key].push(...dbFindings(key, rec.db, rec.bridge, tag));
}
const readingsPath = join(outDir, `readings-${tag}.json`);
const doc = `${J({ findings, readings }, null, 2)}\n`;
writeFileSync(readingsPath, doc);
writeFileSync(join(outDir, 'readings.json'), doc);
say('');
say(`arm   ${tag.toUpperCase()}`);
for (const a of [...ALL_ARMS, 'DB1', 'DB2', 'RUN']) {
  const n = findings[a].length;
  const here = a === 'RUN' || a.startsWith('DB') || chosen.includes(a);
  say(`${a.padEnd(5)} ${!here ? (drives(a) ? 'driven, not graded' : 'not run') : n === 0 ? 'PASS' : `FAIL ${String(n)}`}`);
}
say(`readings: ${readingsPath}`);
if (tag === 'parent') say('this run measured the PARENT: its arms grade that the defect reproduces, and the side-by-side is --side-by-side.');
const failures = Object.entries(findings).flatMap(([, list]) => list.map((f) => `${tag.toUpperCase()} ${f}`));
if (failures.length > 0) {
  for (const f of failures) process.stderr.write(`${TAG}   ${f}\n`);
  process.stderr.write(`${TAG} ${tag === 'parent' ? `${checkout} FAILED` : 'FAILED'}: ${String(failures.length)} finding(s).\n`);
  process.exit(1);
}
say(`PASS: ${tag} has 0 findings on ${chosen.join(', ')}.`);
process.exit(0);
