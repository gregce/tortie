#!/usr/bin/env node
/**
 * probe:p323 — End and Restart, inside the real app, over real agents and
 * planted processes, at the PARENT build and then at HEAD (Phase 323,
 * build/p323/SPEC.md §8.1).
 *
 * WHAT IT IS FOR. Phase 323 puts a signal into the product: after his End, the
 * session's processes that the hang-up was aimed at and that outlived it are
 * sent SIGTERM, then SIGKILL, each one only while its start time, command line
 * and group still match what the tree read recorded. The unit tests drive the
 * module over planted tables and `conformance:endtree` reads the source; this
 * probe is the one run of the whole chain INSIDE THE APP: the renderer's own
 * bridge (`window.gmux.sessions.kill`, `sessions.restart`, the session
 * manager's batch End), the real core, the real tmux (the vendored one), the
 * real agents launched by Tortie under their bare names, the real quit. Every
 * arm is read at the parent and at HEAD, one build after the other and never
 * at once, and HEAD is graded against the parent: his rule is that a phase
 * lands only when no scenario is worse than today.
 *
 * THE TWO BUILDS. `P323_PARENT_CHECKOUT` names a BUILT checkout of the parent
 * commit. Absent, the same checkout as this one, or unbuilt, the probe exits 2
 * with one sentence, because a HEAD reading alone proves nothing. Each build
 * gets its own Electron (through `build/electron-run.mjs`, ONE at a time), its
 * own scratch profile under a harness directory and its own socket
 * `gmux-p323-<pid>-p` / `-h`, so nothing of the parent's run survives into
 * HEAD's: every process the parent run recorded is ended by pid before HEAD
 * starts.
 *
 * THE TWO HOMES, chosen per session by FOLDER. The app runs with a scratch
 * HOME. Each agent's bare name on the scratch PATH is a short wrapper that
 * `exec`s the REAL agent under the same pid (so the pane's shape is exactly
 * the product's) after choosing HOME from the working folder: a session under
 * the run's `his/` folder gets his own home, anything else the scratch one.
 * GEMINI'S WRAPPER ALWAYS SETS THE SCRATCH HOME (his ruling R3). Every wrapper
 * unsets `TMUX` and `TMUX_PANE` (Phase 314's R8). The scratch home carries
 * Gemini's R8 settings, Codex's `check_for_update_on_startup = false` with its
 * shared daemon off, omp's update check off, and an `npm` first on the PATH
 * that refuses and logs. The §3 guards are in the app's environment and so in
 * every pane's; every `CLAUDECODE*`, `CLAUDE_*`, `npm_*`, `ZDOTDIR` and
 * `NVM_BIN` the probe inherited is removed.
 *
 * QWEN, ANTIGRAVITY AND GROK ARE NEVER STARTED, NOT EVEN `--version`. There
 * is no wrapper for `qwen`, `agy` or `grok`. They ARE installed on his Mac, and
 * Tortie's agent scan runs every registry binary it can resolve for its
 * version, so the app is given a PATH in which none of the three can be found:
 * a folder that holds one of them is replaced by a scratch folder of links to
 * everything else in it, and a folder that belongs to one of them is dropped.
 * BEFORE ANY LAUNCH the probe asks the scratch login shell, with the very
 * environment the app is given, where each of the three resolves, and walks
 * the PATH it prints plus every folder Tortie's resolver adds, and it REFUSES
 * (exit 2) if any of the three would be reached. It also requires every bare
 * name it does launch to resolve to its own wrapper. The create helper refuses
 * the three by id before it composes anything.
 *
 * AND THE APP'S OWN DETECTION IS KEPT OFF THEM, READ BACK (his ruling of
 * 2026-09-30, "Fix the tests, then land"). Before EACH launch a scratch
 * `<profile>/gmux/config/agents.json` renames the binaries and the launch
 * argv[0] of the qwen, antigravity and grok rows to `p323-never-<id>`, a name
 * nothing on any machine carries; the app reads it at boot, before its first
 * scan. Before either launch the probe runs EACH build's own overlay parser,
 * merge and resolver over that file through the pinned tsx, and refuses (exit
 * 2) unless the file loads whole and no renamed row resolves anywhere; after
 * each launch boots and before any arm, it reads `agents:list` back, and a
 * hidden row with a binary, a version or `installed` stops the run (exit 2)
 * and the other build is never launched. Droid is not renamed, because its
 * row IS the planted stand-in below and a renamed execution field would put
 * it behind the confirm gate the create path asks; the read-back requires
 * droid to resolve to the probe's own stand-in or nowhere. Gemini is not
 * renamed, because every launch's HOME is the scratch one and Gemini runs
 * there under R8 (his ruling R3). The three installs are also read by `stat`
 * alone before and after every arm, like every other install.
 * `node build/p323/probe-p323.mjs --self-test` proves each grader can say no
 * (the guard's three, and the tools round's npm, install, ABBA and stated
 * exception graders), and starts nothing.
 *
 * THE PLANTED ROWS use the `droid` registry row. Droid is installed on no
 * machine this runs on, so its bare name on the scratch PATH is
 * `build/p323/stand-in.sh <mode>`, the mode being the create's extra argument.
 * Every table labels them planted. If the create path refuses the droid row,
 * the probe exits 2 and says so; it never puts a real agent in its place.
 *
 * WHAT IT RECORDS BEFORE AND AFTER EVERY ARM (arm i): every agent install's
 * realpath, mtime and size, Gemini's package version and mtime, Claude Code's
 * and cursor-agent's version folders; the app's tmux server pid and start
 * time and the Electron main pid; his Codex shared server's pids and start
 * times, read with `ps` alone (SPEC §2.1); the stranger of arm a. A moved
 * install STOPS THE RUN (exit 2). Any other move is a finding.
 *
 * THE ARMS (SPEC §8.1), in this order in each build:
 *   a   a stranger Gemini in the probe's OWN second scratch server, in the
 *       folder of the created Gemini row; it must keep its pid and start time
 *       through every End (read by arm i after every arm)
 *   C1  scratch home: claude, cursor, codex, gemini, deepseek, muse, pi, omp,
 *       opencode, each created, restored (the created row restored, its armed
 *       line cleared, the bare name typed and entered) and, for the six with a
 *       SpecStory provider, wrapped. Droid reads "not installed"; qwen,
 *       antigravity and grok read "not launched, by his ruling"
 *   C2  his home, created only, the same list without Gemini. No turn, no token
 *   R   Restart a created Gemini row
 *   b   two created sessions of each C1 agent; End one, the other untouched
 *   c   a shell row holding a nohup job, a setsid job and a foreground process
 *       that ignores the hang-up (R2: all survive, no tree line)
 *   d1  a restored claude row: a nohup job, then the agent entered, then End
 *   d2  a restored claude row, before any Enter on the armed resume: a
 *       foreground `nohup sh -c "trap '' HUP; exec sleep"`, then End; since
 *       the second fix round it must run on, as today
 *   e   ONE real Claude Code turn under his home and sign-in, running a
 *       ninety second `perl` tool, with End pressed while it runs (REPORTED)
 *   k   a planted shared server (setsid) and a client of it in another
 *       session; End the server's session; the server and the client live on
 *   l   the planted modes: ignore-hup, fg-child-ignore-hup,
 *       ignore-hup-and-term, setsid-child, app-bundle, each signal read from
 *       app.log
 *   g   the second fix round's arm (Lens 1's S10): a planted ignore-hup row
 *       whose window another session still shows, once through a grouped
 *       session (`new-session -t`) and once through a linked window
 *       (`link-window`), both made by the probe on the app's own scratch
 *       server with no Tortie id, so the app never adopts them. End leaves the
 *       pane live in the other session; it must be sent no signal, past the
 *       first wait
 *   h   the session manager's batch End of eight created Gemini rows
 *   rt  arm (C)'s End round trip, graded in BALANCED ABBA ORDER within this
 *       one run (the tools round after his ruling of 2026-09-30): each full
 *       launch ends with P323_RT_ROWS (16) planted rows that end on the
 *       hang-up, each Ended through the bridge and timed there; then each
 *       build is launched ONCE MORE, in the other order, for this block alone
 *       (parent, HEAD, HEAD, parent). The pooled median of HEAD's Ends minus
 *       the parent's must be within one tree read. The census rows' round
 *       trips, one order only, are REPORTED
 *   f   LAST: End a created Gemini row and a planted ignore-hup-and-term row,
 *       then quit at once; the quit's wall time and what is left. Since the fix
 *       round a quit does NOT wait for what an End is still ending, so HEAD's
 *       quit must take no longer than the parent's (500 ms, or a tenth of the
 *       parent's quit when longer), and what is left may be what the parent
 *       leaves (the fix round removed the join: it made the quit 4.8 to 6.6 s
 *       slower than today). The quit is scheduled by the inspector call and
 *       runs after the session is closed, so the debugger is never inside it
 *
 * THE MEASUREMENT, per session (the census of SPEC §3, in the app): wait for a
 * stable first screen and a stable tree, read the tree with the probe's OWN
 * reader (never the module under test), press End through the bridge and time
 * the round trip, re-read the recorded pids every 100 ms matching start time
 * and command line for up to `HANGUP_GRACE_MS + TERM_GRACE_MS + 2 s` (and no
 * longer than SETTLE_MS once nothing left is a process the build could still
 * signal), read which pids the product signalled from app.log, and end
 * whatever is left itself.
 *
 * WHAT IT REFUSES. It signals nothing it did not record under its own panes:
 * every process any tree read recorded is ended by pid in its `finally`, TERM
 * then KILL, with the start time, command line and group re-read first; that
 * covers everything it started, the setsid ones the product spares on purpose
 * included, and THIS ENDING IS THE PROBE'S OWN, never the module under test,
 * because the instrument must not depend on the code it measures. A process
 * whose pid and start time are his Codex server's is never signalled. It never
 * names his live server or his default one, installs nothing, reads no
 * credential or conversation store, and takes no photograph. Its two scratch
 * servers per build are ended and their socket files unlinked in the
 * `finally`. Electrons are counted once, at the end.
 *
 * VERIFIERS ONLY, under the Electron lock. Builders write it and never run it.
 * It carries no `npm run build &&`: both checkouts must already be built.
 *
 *   P323_PARENT_CHECKOUT=/path/to/parent npm run -s probe:p323
 *   node build/p323/probe-p323.mjs --self-test   every pure grader on
 *                           fixtures; no build, no Electron, no process
 *   P323_HEAD_FIRST=1      run HEAD first and the parent second (the second
 *                           fix round: parent-first alone favours HEAD, which
 *                           runs warm; run once each way)
 *   P323_PRIOR_REPORT=f     a copy of this probe's JSON from a run in the OTHER
 *                           order; (h) then grades both orders' samples
 *                           together ((C) is balanced within the run itself)
 *   P323_RT_ROWS=16         planted Ends per (C) block (4 to 32)
 *   P323_H_REPEATS=4        how many batch Ends arm h times per build (default 4)
 *   P323_ARMS=C1,l          named arms only (i always runs)
 *   P323_AGENTS=claude,gemini   a smaller explicit list; qwen, agy and grok refused
 *   P323_KEEP=1             keep the run folder (rows, app logs) for re-derivation
 *   P323_RUN=/private/tmp/x the run folder (default /private/tmp/p323-probe-<pid>)
 *
 * WHAT IT WRITES. `out/p323/probe-p323.json`: per build every row's tree at
 * rest (pid, parent, group, terminal group, state, program name), each exit
 * time, survivors, the signals app.log names, the End round trip, the batch
 * and quit timings, the world readings; and per arm a verdict. Never a screen,
 * a command line's arguments, a credential or a conversation.
 *
 * STATED EXCEPTIONS AND NPM (the tools round). A census row whose agent
 * refuses to start at BOTH builds for a reason of its own is graded EXCEPTION,
 * never a pass and never a failure, only when it is listed in
 * KNOWN_START_REFUSALS and its own words were on its dead pane at both builds;
 * today that is `c2-muse` alone. Every `npm` call is still refused by the
 * stub, and the stub logs each; a registry READ (`npm view`, `info`, `ls`) is
 * named in the install verdict and never fails the run, and an INSTALL verb
 * (`install`, `i`, `update`, `add`, a global add, `exec`) does. The installs
 * are read by version and mtime before and after every arm: each agent's
 * binary, Gemini's package, and every package in every global npm folder.
 *
 * Exit 0 when every HEAD requirement held (a REPORTED line or a stated
 * EXCEPTION does not stop it), 1 when one failed, 2 when the run could not
 * run, an install moved, or an arm could not be READ, which is never a pass.
 */

import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync
} from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { withElectron, withoutDevRenderer } from '../electron-run.mjs';
import { wsConnect, cdpEval } from '../cdp-client.mjs';
import { PS_FIELDS, psRows } from './ps-read.mjs';
import { globalInstalls } from './installs.mjs';
import { tsxCli } from '../ts-runner.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const TAG = '[p323]';
const say = (line) => console.log(`${TAG} ${line}`);
const J = JSON.stringify;
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
/** An arm whose precondition did not hold: never a pass and never a failure. */
class Unreadable extends Error {}
/** The run cannot go on: a moved install, a refused droid row, a reachable forbidden agent. Exit 2. */
class Stop extends Error {}

function refuseRun(sentence) {
  console.error(`${TAG} ${sentence}`);
  process.exit(2);
}

// ---------------------------------------------------------------------------
// The app's own detection, kept off qwen, antigravity and grok (his ruling of
// 2026-09-30). Pure graders first, so --self-test can prove each one says no.
// ---------------------------------------------------------------------------

/**
 * The registry rows the app's detection must resolve NOWHERE. Not droid: its
 * row IS the planted stand-in, and an overlay that renames an execution field
 * puts a row behind the confirm gate the create path asks, so no planted row
 * could be made. Not Gemini: every launch's HOME is the scratch one, where
 * Gemini runs under Phase 314's R8 settings (his ruling R3).
 */
const HIDDEN_IDS = Object.freeze(['qwen', 'antigravity', 'grok']);
/** The real names the overlay must never carry. */
const REAL_NAMES = Object.freeze(['qwen', 'agy', 'grok', 'gemini', 'droid']);
const hiddenBin = (id) => `p323-never-${id}`;
/**
 * The scratch `agents.json`: each hidden row's binaries and launch argv[0]
 * renamed to a name nothing carries, so the app's scan finds nothing to ask
 * for a version and nothing the app composes for these rows names a real file.
 */
export function neverOverlay() {
  return { schema: 1, agents: HIDDEN_IDS.map((id) => ({ id, binaries: [hiddenBin(id)], launch: { argv: [hiddenBin(id)] } })) };
}
/**
 * One build's own overlay parser, merge and resolver run over `neverOverlay()`
 * (`{ parseProblems, mergeProblems, rows: { id: { binaries, copies } } }`): the
 * file must load whole, and every hidden row must carry exactly its renamed
 * binary with no copy of it anywhere. `{ ok, said }`.
 */
export function neverPrecheckVerdict(out) {
  if (out === null || typeof out !== 'object') return { ok: false, said: 'the check printed nothing readable' };
  if (out.parseProblems !== 0 || out.mergeProblems !== 0) {
    return { ok: false, said: `the file did not load whole (${String(out.parseProblems)} parse, ${String(out.mergeProblems)} merge problem(s)), so a hidden row would fall back to its real binary` };
  }
  const bad = HIDDEN_IDS.filter((id) => {
    const r = out.rows?.[id];
    return r === null || r === undefined || J(r.binaries) !== J([hiddenBin(id)]) || r.copies !== 0;
  });
  return bad.length === 0
    ? { ok: true, said: `${HIDDEN_IDS.join(', ')} merge with renamed binaries that resolve nowhere` }
    : { ok: false, said: `not hidden: ${bad.map((id) => `${id} ${J(out.rows?.[id] ?? null)}`).join('; ')}` };
}
/**
 * The app's own scan, read back through `agents:list` (`[{ id, installed,
 * binPath, version }]`, each binPath already put through realpath): no hidden
 * row may answer a binary, a version or `installed`, and droid resolves to the
 * probe's own stand-in (`standIn`) or nowhere. `{ ok, said }`.
 */
export function neverScanVerdict(list, standIn) {
  if (!Array.isArray(list)) return { ok: false, said: 'agents:list answered no list' };
  const has = (v) => v !== null && v !== undefined;
  const found = list.filter((a) => HIDDEN_IDS.includes(a?.id) && (has(a.binPath) || has(a.version) || a.installed === true));
  const droid = list.find((a) => a?.id === 'droid');
  const droidAt = droid === undefined || !has(droid.binPath) ? null : droid.binPath;
  const problems = [
    ...found.map((a) => `${String(a.id)} at ${String(a.binPath)}${has(a.version) ? ` (version ${String(a.version)})` : ''}`),
    ...(droidAt !== null && droidAt !== standIn ? [`droid at ${droidAt}, not the planted stand-in`] : [])
  ];
  return problems.length === 0
    ? { ok: true, said: `${HIDDEN_IDS.join(', ')} resolve nowhere in the app's own scan; droid ${droidAt === null ? 'resolves nowhere' : 'is the planted stand-in'}` }
    : { ok: false, said: `the app's scan resolved ${problems.join(', ')}` };
}

// ---------------------------------------------------------------------------
// npm: a registry READ is not an install (the tools round after his ruling of
// 2026-09-30). The reverify's arm e ran Claude Code under his home, and a
// plugin in his setup asked `npm view vercel version` twice; the verdict read
// any npm call as an install and failed a run in which every install was
// unchanged. The stub still refuses EVERY call, so nothing reaches the
// network or the disk through it; only an install verb fails the run, and the
// installs are still read by version and mtime before and after.
// ---------------------------------------------------------------------------

/** npm's verbs, aliases included (npm 10 and 11), that install, update, remove or fetch-and-run a package. */
const NPM_INSTALL_VERBS = new Set([
  'install', 'i', 'in', 'ins', 'inst', 'insta', 'instal', 'isnt', 'isnta', 'isntal', 'isntall', 'add',
  'update', 'up', 'upgrade', 'udpate',
  'ci', 'clean-install', 'ic', 'install-clean', 'isntall-clean',
  'install-test', 'it', 'install-ci-test', 'cit', 'clean-install-test', 'sit',
  'uninstall', 'unlink', 'remove', 'rm', 'r', 'un',
  'link', 'ln', 'rebuild', 'rb', 'dedupe', 'ddp', 'prune',
  // Each fetches a package it may not have and runs it.
  'exec', 'x', 'init', 'create', 'innit'
]);
/** npm's verbs that only read, from the registry or the disk. */
const NPM_READ_VERBS = new Set([
  'view', 'v', 'info', 'show', 'ls', 'list', 'la', 'll', 'outdated', 'search', 's', 'se', 'find',
  'explain', 'why', 'query', 'fund', 'help', 'help-search', 'prefix', 'root', 'bin', 'ping', 'whoami'
]);
/** Every other npm verb: known, so the scan for the verb stops at it, and neither of the two above. */
const NPM_OTHER_VERBS = new Set([
  'access', 'adduser', 'audit', 'bugs', 'cache', 'completion', 'config', 'c', 'deprecate', 'diff', 'dist-tag',
  'docs', 'doctor', 'edit', 'explore', 'get', 'hook', 'login', 'logout', 'org', 'owner', 'pack', 'pkg', 'profile',
  'publish', 'repo', 'restart', 'run', 'run-script', 'rum', 'urn', 'sbom', 'set', 'shrinkwrap', 'star', 'stars',
  'start', 'stop', 'team', 'test', 't', 'tst', 'token', 'undeprecate', 'unpublish', 'unstar', 'version', 'verison'
]);
/**
 * One npm call the stub logged, by its argv (never recorded beyond its verb):
 * `{ verb, cls: 'install' | 'read' | 'other', global }`. The verb is the first
 * word, skipping options, that npm knows as a command, so `npm --prefix /x
 * install` is an install and `npm view install` is a read. `npm audit fix`
 * installs and `npm config get` reads; `npm --version` alone reads.
 */
export function npmCallClass(argv) {
  const args = Array.isArray(argv) ? argv.map(String) : [];
  const global = args.some((a) => a === '-g' || a === '--global' || a === '--location=global');
  const words = args.filter((a) => !a.startsWith('-'));
  const at = words.findIndex((w) => NPM_INSTALL_VERBS.has(w) || NPM_READ_VERBS.has(w) || NPM_OTHER_VERBS.has(w));
  if (at === -1) {
    const versionOnly = words.length === 0 && args.some((a) => a === '--version' || a === '-v');
    return { verb: versionOnly ? '--version' : '?', cls: versionOnly ? 'read' : 'other', global };
  }
  const verb = words[at];
  const next = words[at + 1] ?? '';
  if (verb === 'audit') return { verb: next === 'fix' ? 'audit fix' : 'audit', cls: next === 'fix' ? 'install' : 'read', global };
  if (verb === 'config' || verb === 'c') {
    const reads = next === 'get' || next === 'list' || next === 'ls';
    return { verb: `config ${next}`.trim(), cls: reads ? 'read' : 'other', global };
  }
  return { verb, cls: NPM_INSTALL_VERBS.has(verb) ? 'install' : NPM_READ_VERBS.has(verb) ? 'read' : 'other', global };
}
/** The stub's log: one call a line, the arguments separated by the unit separator. */
export function npmCallsOf(text) {
  return String(text ?? '')
    .split('\n')
    .filter((l) => l !== '')
    .map((l) => npmCallClass(l.split('\x1f').slice(1)));
}
/**
 * The run's install verdict: `{ ok, said }`. FAIL on an install verb asked of
 * npm, or on any install that moved; a registry read is named and never fails.
 */
export function installVerdict(calls, before, after) {
  const installs = calls.filter((c) => c.cls === 'install');
  const reads = calls.filter((c) => c.cls !== 'install');
  const count = (list) => {
    const n = new Map();
    for (const c of list) n.set(c.verb, (n.get(c.verb) ?? 0) + 1);
    return [...n].map(([v, k]) => `${v}${k > 1 ? ` ×${String(k)}` : ''}`).join(', ');
  };
  const moved = before === undefined || after === undefined ? null : Object.keys({ ...before, ...after }).filter((k) => before[k] !== after[k]);
  const npmSaid =
    calls.length === 0
      ? 'npm never called'
      : `npm called ${String(calls.length)} time(s), every call refused by the stub: ${String(installs.length)} install(s)${installs.length > 0 ? ` (${count(installs)})` : ''}, ${String(reads.length)} read(s) or other (${reads.length > 0 ? count(reads) : 'none'})`;
  if (moved === null) return { ok: null, said: `${npmSaid}; the installs were not read at ${before === undefined ? 'the start' : 'the end'}` };
  return {
    ok: installs.length === 0 && moved.length === 0,
    said: `${npmSaid}; ${moved.length === 0 ? 'every install unchanged by version and mtime' : `MOVED: ${moved.join(', ')}`}`
  };
}

/**
 * THE STATED EXCEPTIONS (the tools round after his ruling of 2026-09-30): a
 * row whose agent refuses to start for a reason of its own, measured outside
 * Tortie, so there is nothing under its pane to End at either build. Such a
 * row is graded EXCEPTION, which is neither a pass nor a failure and never
 * stops the run exiting 0, but ONLY when the agent's own words are on its dead
 * pane at BOTH builds; the words are matched and never recorded. A row that
 * exits at start without its stated words, or at one build only, or that is
 * not listed here, is still UNREADABLE, because an instrument that started
 * nothing must never read as a pass.
 *
 * Which rows: in the reverify's whole run of 2026-09-30 (all fourteen arms,
 * nine agents, both builds) `c2-muse` was the ONLY row whose agent refused to
 * start at both builds. Lens 2 of the second verify round measured it outside
 * Tortie: muse under his home prints "created session home no longer matches
 * its protected writer route" and exits 1 in about 0.55 s, with or without
 * Tortie and the guards. Every other row, pi's included since its node fix,
 * started at both builds.
 */
const KNOWN_START_REFUSALS = {
  'c2-muse': {
    said: 'muse refuses to start under his home (its own error, measured outside Tortie with and without the guards)',
    words: /created session home no longer matches its protected writer route/
  }
};
/**
 * A census row where the tree read found nothing at one build or both:
 * `{ ok, said }`. EXCEPTION only for a row KNOWN_START_REFUSALS states, empty
 * at BOTH builds, whose own words were on its dead pane at both; anything else
 * is UNREADABLE (null), because nothing measured is not a pass.
 */
export function emptyRowVerdict(label, p, h) {
  const stated = KNOWN_START_REFUSALS[label];
  const both = p.tree.length === 0 && h.tree.length === 0;
  if (stated !== undefined && both && p.statedRefusalSeen === true && h.statedRefusalSeen === true) {
    return { ok: 'exception', said: `STATED EXCEPTION: ${stated.said}; its own words were on its dead pane at the parent and at HEAD, so there was nothing under it to End at either build` };
  }
  return {
    ok: null,
    said:
      `${stated?.said ?? 'exited at start'}: the tree read found ${String(p.tree.length)} process(es) at the parent and ${String(h.tree.length)} at HEAD, so nothing was measured` +
      (stated === undefined
        ? ''
        : !both
          ? '; it started at one build, so the stated exception does not apply'
          : `; its stated words were ${p.statedRefusalSeen === true ? '' : 'NOT '}on its pane at the parent and ${h.statedRefusalSeen === true ? '' : 'NOT '}at HEAD, so this is not the refusal the exception names`)
  };
}

/**
 * Arm (C)'s grade over the run's balanced ABBA blocks (the tools round).
 * `order` is the full launches' order, `launches` each launch's `{ samples,
 * oneReadMs }` by name (`parent`, `head`, `parent2`, `head2`), `rows` how many
 * Ends a block times. The blocks run order[0], order[1], order[1]2, order[0]2,
 * so a warm-second bias falls on each build once. `{ ok, said }`: UNREADABLE
 * (null) when a block timed fewer than half its Ends, because the order is
 * then not balanced; else PASS when the pooled median of HEAD's Ends minus the
 * parent's is within one tree read, measured at both HEAD launches.
 */
export function abbaVerdict(order, launches, rows) {
  const med = (xs) => {
    const v = xs.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
    if (v.length === 0) return NaN;
    const m = Math.floor(v.length / 2);
    return v.length % 2 === 1 ? v[m] : (v[m - 1] + v[m]) / 2;
  };
  const r1 = (x) => Math.round(x * 10) / 10;
  const blocks = [...order, ...[...order].reverse().map((b) => `${b}2`)];
  const short = blocks.filter((l) => !Array.isArray(launches[l]?.samples) || launches[l].samples.length < Math.ceil(rows / 2));
  if (short.length > 0) {
    return { ok: null, said: `the block(s) ${short.join(', ')} timed too few Ends (${short.map((l) => launches[l]?.unreadable ?? `${String(launches[l]?.samples?.length ?? 0)} of ${String(rows)}`).join('; ')}), so the order is not balanced` };
  }
  const ps = [...launches.parent.samples, ...launches.parent2.samples];
  const hs = [...launches.head.samples, ...launches.head2.samples];
  const diff = med(hs) - med(ps);
  const allowance = (launches.head.oneReadMs + launches.head2.oneReadMs) / 2;
  return {
    ok: diff <= allowance,
    said:
      `in this run's balanced order ${blocks.map((l) => `${l} ${String(r1(med(launches[l].samples)))}`).join(', ')} ms (medians of ${String(rows)} planted Ends each); ` +
      `pooled HEAD ${String(r1(med(hs)))} ms minus parent ${String(r1(med(ps)))} ms is ${String(r1(diff))} ms against one tree read of ${String(r1(allowance))} ms (the terminal read plus the pane read, measured at both HEAD launches)`
  };
}

if (process.argv.includes('--self-test')) {
  let bad = 0;
  let n = 0;
  const expect = (name, got, want) => {
    n += 1;
    if (got !== want) {
      bad += 1;
      console.log(`${TAG} self-test FAIL ${name}: got ${J(got)}, want ${J(want)}`);
    }
  };
  const overlay = neverOverlay();
  expect('overlay: the three rows, no other', J(overlay.agents.map((a) => a.id)), J(['qwen', 'antigravity', 'grok']));
  expect('overlay: every binary and argv[0] renamed', overlay.agents.every((a) => a.binaries.length === 1 && a.binaries[0] === hiddenBin(a.id) && a.launch.argv.length === 1 && a.launch.argv[0] === a.binaries[0]), true);
  expect('overlay: never gemini or droid by id', overlay.agents.some((a) => a.id === 'gemini' || a.id === 'droid'), false);
  expect('overlay: a real name as a binary', overlay.agents.some((a) => REAL_NAMES.includes(a.binaries[0]) || REAL_NAMES.includes(a.launch.argv[0])), false);
  const STAND = '/private/tmp/p323-probe-1/home/.local/bin/droid';
  const row = (id, over = {}) => ({ id, installed: false, binPath: null, version: null, ...over });
  const scan = (over = {}) => ['claude', 'gemini', 'qwen', 'antigravity', 'grok', 'droid'].map((id) => row(id, over[id] ?? {}));
  expect('scan: all hidden, droid nowhere', neverScanVerdict(scan(), STAND).ok, true);
  expect('scan: droid is the stand-in', neverScanVerdict(scan({ droid: { installed: true, binPath: STAND, version: 'p323-stand-in 0.0.0' } }), STAND).ok, true);
  expect('scan: gemini resolved is allowed', neverScanVerdict(scan({ gemini: { installed: true, binPath: '/x/gemini', version: '0.60.0' } }), STAND).ok, true);
  expect('scan: qwen resolved', neverScanVerdict(scan({ qwen: { binPath: '/Users/x/.local/bin/qwen' } }), STAND).ok, false);
  expect('scan: grok version only', neverScanVerdict(scan({ grok: { version: '1.0.41' } }), STAND).ok, false);
  expect('scan: antigravity installed only', neverScanVerdict(scan({ antigravity: { installed: true } }), STAND).ok, false);
  expect('scan: droid somewhere else', neverScanVerdict(scan({ droid: { installed: true, binPath: '/usr/local/bin/droid' } }), STAND).ok, false);
  expect('scan: a hidden row absent', neverScanVerdict(scan().filter((a) => a.id !== 'grok'), STAND).ok, true);
  expect('scan: no list', neverScanVerdict(null, STAND).ok, false);
  const pre = (over = {}) => ({ parseProblems: 0, mergeProblems: 0, rows: Object.fromEntries(HIDDEN_IDS.map((id) => [id, { binaries: [hiddenBin(id)], copies: 0 }])), ...over });
  expect('precheck: clean', neverPrecheckVerdict(pre()).ok, true);
  expect('precheck: a parse problem', neverPrecheckVerdict(pre({ parseProblems: 1 })).ok, false);
  expect('precheck: a merge problem', neverPrecheckVerdict(pre({ mergeProblems: 2 })).ok, false);
  expect('precheck: qwen fell back to its own binary', neverPrecheckVerdict(pre({ rows: { ...pre().rows, qwen: { binaries: ['qwen'], copies: 1 } } })).ok, false);
  expect('precheck: qwen fell back, found nowhere here', neverPrecheckVerdict(pre({ rows: { ...pre().rows, qwen: { binaries: ['qwen'], copies: 0 } } })).ok, false);
  expect('precheck: a renamed copy found', neverPrecheckVerdict(pre({ rows: { ...pre().rows, grok: { binaries: [hiddenBin('grok')], copies: 1 } } })).ok, false);
  expect('precheck: a row missing', neverPrecheckVerdict(pre({ rows: { ...pre().rows, antigravity: null } })).ok, false);
  expect('precheck: nothing printed', neverPrecheckVerdict(null).ok, false);
  // npm: a read is not an install (the tools round).
  const cls = (argv) => npmCallClass(argv).cls;
  expect('npm: the plugin’s view is a read', cls(['view', 'vercel', 'version']), 'read');
  expect('npm: info and ls are reads', [cls(['info', 'x']), cls(['ls', '-g', '--depth=0'])].join(), 'read,read');
  expect('npm: install is an install', cls(['install', 'x']), 'install');
  expect('npm: i -g is an install', cls(['i', '-g', 'x']), 'install');
  expect('npm: a global add is an install, and global', J(npmCallClass(['add', '--global', 'x'])), J({ verb: 'add', cls: 'install', global: true }));
  expect('npm: update is an install', cls(['update']), 'install');
  expect('npm: an option before the verb', cls(['--prefix', '/x', 'install', 'y']), 'install');
  expect('npm: a package named install is a read of it', cls(['view', 'install']), 'read');
  expect('npm: audit fix installs, audit reads', [cls(['audit', 'fix']), cls(['audit'])].join(), 'install,read');
  expect('npm: config get reads, config set does not', [cls(['config', 'get', 'prefix']), cls(['config', 'set', 'a', 'b'])].join(), 'read,other');
  expect('npm: exec fetches and runs a package', cls(['exec', 'x']), 'install');
  expect('npm: --version alone reads', J(npmCallClass(['--version'])), J({ verb: '--version', cls: 'read', global: false }));
  expect('npm: nothing known is other', cls(['frobnicate']), 'other');
  expect('npm: the log parses', J(npmCallsOf('npm\x1fview\x1fvercel\x1fversion\nnpm\x1fi\x1f-g\x1fx\n').map((c) => c.cls)), J(['read', 'install']));
  const w = { a: '1' };
  expect('install verdict: two reads, nothing moved', installVerdict([npmCallClass(['view', 'v']), npmCallClass(['view', 'v'])], w, w).ok, true);
  expect('install verdict: an install asked', installVerdict([npmCallClass(['install', 'x'])], w, w).ok, false);
  expect('install verdict: an install moved, npm never called', installVerdict([], w, { a: '2' }).ok, false);
  expect('install verdict: a key appeared', installVerdict([], w, { a: '1', b: '1' }).ok, false);
  expect('install verdict: not read at the end', installVerdict([], w, undefined).ok, null);
  // A stated start refusal (the tools round).
  const er = (tree, seen) => ({ tree: Array.from({ length: tree }), ...(seen === undefined ? {} : { statedRefusalSeen: seen }) });
  expect('refusal: c2-muse, its words at both builds', emptyRowVerdict('c2-muse', er(0, true), er(0, true)).ok, 'exception');
  expect('refusal: c2-muse, its words at one build only', emptyRowVerdict('c2-muse', er(0, true), er(0, false)).ok, null);
  expect('refusal: c2-muse started at one build', emptyRowVerdict('c2-muse', er(0, true), er(1, true)).ok, null);
  expect('refusal: a row nobody stated', emptyRowVerdict('c2-pi', er(0, true), er(0, true)).ok, null);
  expect('refusal: c1-c-muse is not the stated row', emptyRowVerdict('c1-c-muse', er(0, true), er(0, true)).ok, null);
  // (C) in ABBA order (the tools round).
  const blk = (samples, oneReadMs = 4) => ({ samples, oneReadMs });
  const eight = (x) => Array.from({ length: 8 }, () => x);
  const L = (p, h, h2, p2) => ({ parent: blk(p), head: blk(h), head2: blk(h2), parent2: blk(p2) });
  expect('abba: HEAD one read slower, inside', abbaVerdict(['parent', 'head'], L(eight(10), eight(13), eight(14), eight(10)), 8).ok, true);
  expect('abba: HEAD ten ms slower, outside', abbaVerdict(['parent', 'head'], L(eight(10), eight(20), eight(20), eight(10)), 8).ok, false);
  // A drift across the run's four launches, 6 ms a launch (10, 16, 22, 28) on
  // a build that costs nothing: in one order alone HEAD reads 6 ms slower,
  // over the allowance; in ABBA order each build takes one early and one late
  // block, and the drift cancels.
  expect('abba: an order drift cancels', abbaVerdict(['parent', 'head'], L(eight(10), eight(16), eight(22), eight(28)), 8).ok, true);
  expect('abba: the blocks named in ABBA order', abbaVerdict(['head', 'parent'], L(eight(10), eight(10), eight(10), eight(10)), 8).said.startsWith("in this run's balanced order head 10, parent 10, parent2 10, head2 10"), true);
  expect('abba: a missing second launch', abbaVerdict(['parent', 'head'], { parent: blk(eight(10)), head: blk(eight(10)) }, 8).ok, null);
  expect('abba: a block with too few Ends', abbaVerdict(['parent', 'head'], L(eight(10), [10, 10, 10], eight(10), eight(10)), 8).ok, null);
  console.log(`${TAG} self-test: ${String(n - bad)} of ${String(n)} held`);
  process.exit(bad === 0 ? 0 : 1);
}

// ---------------------------------------------------------------------------
// The two builds. Absent or unbuilt: one sentence, exit 2.
// ---------------------------------------------------------------------------

const PARENT_RAW = (process.env['P323_PARENT_CHECKOUT'] ?? '').trim();
if (PARENT_RAW === '') {
  refuseRun('P323_PARENT_CHECKOUT is not set, so there is no parent build to measure HEAD against, and a HEAD reading alone proves nothing.');
}
const PARENT = resolve(PARENT_RAW);
if (PARENT === ROOT) {
  refuseRun(`P323_PARENT_CHECKOUT is this checkout (${ROOT}); it must be a separate, built checkout of the parent commit.`);
}
if (!existsSync(join(PARENT, 'out', 'main', 'index.js'))) {
  refuseRun(`P323_PARENT_CHECKOUT (${PARENT}) has no build at out/main/index.js; run npm run build there first.`);
}
if (!existsSync(join(ROOT, 'out', 'main', 'index.js'))) {
  refuseRun(`${ROOT} has no build at out/main/index.js; run npm run build here first.`);
}

// ---------------------------------------------------------------------------
// The agent list, explicit, and the three names never started
// ---------------------------------------------------------------------------

/** qwen, Antigravity and grok: never started, not even `--version` (his ruling, 2026-09-29). */
const NEVER_IDS = new Set(['qwen', 'antigravity', 'grok']);
const NEVER_BINS = ['qwen', 'agy', 'grok'];
/** A folder that belongs to one of the three is dropped from the app's PATH whole. */
const NEVER_DIR = /\/\.(?:grok|antigravity|antigravitycli|qwen)(?:\/|$)/;
/** A folder entry named like one of the three is never linked into the app's PATH. */
const NEVER_ENTRY = /^(?:qwen|agy|grok)/;

/**
 * The census list, SPEC §8.1 C1, and each row's facts. `bins` is the
 * registry's own candidate order (src/main/agents/registry.ts), because
 * Tortie launches the first candidate it can resolve. `tty` flags are the
 * §3 guard cursor takes on the command line.
 */
const AGENT_ROWS = {
  claude: { bins: ['claude'], provider: true },
  cursor: { bins: ['cursor-agent'], provider: true, tty: ['--disable-auto-update'] },
  codex: { bins: ['codex'], provider: true },
  gemini: { bins: ['gemini'], provider: true, scratchOnly: true },
  deepseek: { bins: ['codewhale', 'codew', 'deepseek'], provider: true },
  muse: { bins: ['muse'], provider: true },
  // nodeFirst (the second fix round, Lens 2): pi 0.84.2 needs node >=22.19.0
  // (its own package.json), and the scratch login PATH puts /usr/local/bin
  // first, whose node on his Mac is 22.14.0; under it pi died at start in
  // undici's fetch ("zlib.createZstdDecompress is not a function") and its
  // rows read "exited at start" at both builds. Its wrapper puts a folder
  // holding ONLY a link to this probe's own node first; his nvm folder is never
  // added, because it holds grok.
  pi: { bins: ['pi'], provider: false, nodeFirst: true },
  omp: { bins: ['omp'], provider: false },
  opencode: { bins: ['opencode'], provider: false }
};
const DEFAULT_AGENTS = ['claude', 'cursor', 'codex', 'gemini', 'deepseek', 'muse', 'pi', 'omp', 'opencode'];
/** Arm h's batch Ends per build (the second fix round: one sample could not tell noise from a regression). */
const H_REPEATS = Math.max(1, Math.min(8, Number((process.env['P323_H_REPEATS'] ?? '').trim() || '4') || 4));
const askedAgents = (process.env['P323_AGENTS'] ?? '').trim();
const RUN_AGENTS = askedAgents === '' ? DEFAULT_AGENTS : askedAgents.split(',').map((s) => s.trim()).filter(Boolean);
for (const id of RUN_AGENTS) {
  if (NEVER_IDS.has(id) || NEVER_BINS.includes(id)) {
    refuseRun(`P323_AGENTS names ${id}, which is never started, not even for its version (his ruling of 2026-09-29).`);
  }
  if (AGENT_ROWS[id] === undefined) refuseRun(`P323_AGENTS names ${id}, which is not in the census list (${DEFAULT_AGENTS.join(', ')}).`);
}
/** Registry probe folders an agent adds before Tortie's shared install folders (registry.ts `extraProbeDirs`). */
const PROBE_DIRS = {
  claude: ['~/.claude/local'],
  cursor: ['~/.cursor/bin'],
  codex: ['~/.nvm/versions/node/*/bin'],
  pi: ['~/.npm-global/bin', '~/.local/bin'],
  grok: ['~/.grok/bin'],
  opencode: ['~/.opencode/bin']
};

const ALL_ARMS = ['a', 'C1', 'C2', 'R', 'b', 'c', 'd1', 'd2', 'e', 'k', 'l', 'g', 'h', 'rt', 'f'];
/**
 * Arm (C), the End round trip, is graded in BALANCED ABBA ORDER WITHIN THIS
 * ONE RUN (the tools round after his ruling of 2026-09-30). The reverify's run
 * failed (C) at +5.9 ms against a 4.4 ms allowance from the census rows, which
 * are timed in one build order only and spread ±40 ms row to row; its own
 * balanced measurement of 64 Ends read +3.85 ms, inside the allowance. So each
 * full launch ends with the `rt` block, RT_ROWS planted rows that end on the
 * hang-up, each Ended through the bridge and timed there, and after both full
 * launches the two builds are launched ONCE MORE, in the other order, for the
 * `rt` block alone: parent, HEAD, HEAD, parent (or the reverse under
 * P323_HEAD_FIRST). The grade is the pooled median of HEAD's two blocks minus
 * the parent's two, against one tree read. The census rows' round trips are
 * still recorded, and REPORTED.
 */
const RT_ROWS = Math.max(4, Math.min(32, Number((process.env['P323_RT_ROWS'] ?? '').trim() || '16') || 16));
/** After a planted row says hello, before its End: the pane settles. */
const RT_SETTLE_MS = 500;
/** How long an `rt` row's process is watched after its End (it ends on the hang-up). */
const RT_WATCH_MS = 3_000;
/** After an `rt` row's process is gone, before the next End: HEAD's ending re-reads once and returns. */
const RT_SPACING_MS = 1_500;
const askedArms = (process.env['P323_ARMS'] ?? '').trim();
const ARMS = new Set(askedArms === '' ? ALL_ARMS : askedArms.split(',').map((s) => s.trim()).filter(Boolean));
for (const a of ARMS) if (!ALL_ARMS.includes(a) && a !== 'i') refuseRun(`P323_ARMS names ${a}, which is no arm (${ALL_ARMS.join(', ')}).`);

// ---------------------------------------------------------------------------
// The shipping constants, read out of HEAD's own source
// ---------------------------------------------------------------------------

function constantOf(checkout, file, name) {
  const path = join(checkout, file);
  if (!existsSync(path)) return null;
  const hit = new RegExp(`${name}\\s*=\\s*([0-9_]+)`).exec(readFileSync(path, 'utf8'));
  return hit === null ? null : Number(hit[1].replace(/_/g, ''));
}
const HANGUP_GRACE_MS = constantOf(ROOT, 'src/main/proc/session-tree.ts', 'HANGUP_GRACE_MS') ?? 10_000;
const TERM_GRACE_MS = constantOf(ROOT, 'src/main/proc/session-tree.ts', 'TERM_GRACE_MS') ?? 60_000;
/** The longest each End is watched, at BOTH builds: past the SIGKILL's moment. */
const WATCH_MS = HANGUP_GRACE_MS + TERM_GRACE_MS + 2_000;
/** A process "gone within the two graces", with room for one poll and one re-read. */
const GRACES_MS = HANGUP_GRACE_MS + TERM_GRACE_MS + 1_500;
/**
 * The second fix round: past the first wait and a SIGTERM exit (the census's
 * slowest, 1,465 ms), a watch ENDS once nothing it still sees is a process
 * the build could signal later: at the parent anything, at HEAD whatever left
 * the pane's group or is an app bundle's executable. A process the product
 * wrongly selected would have had its SIGTERM by now and ended (every planted
 * spared process keeps SIGTERM's default), so a spared process is not watched
 * through the 60 s second grace for nothing. Only a target that ignores
 * SIGTERM too is watched on, to its SIGKILL.
 */
const SETTLE_MS = HANGUP_GRACE_MS + 5_000;
/**
 * SPEC §8.1 f's first ceiling, written when the quit waited for an ending.
 * Recorded beside the reading, and NOT a verdict since the round after his
 * ruling of 2026-09-30: the fix round removed that wait, so HEAD is graded
 * against the parent's own quit, never against a number the parent's own quit
 * need not meet (the second reverify read the parent's at 36,647 ms, with the
 * quit run inside the inspector call).
 */
const QUIT_CEILING_MS = 10_000;
/**
 * The fix round's (f): HEAD's quit may take at most this much longer than the
 * parent's, the spread of one app's own quit, because HEAD no longer waits for
 * an ending. It is a noise allowance and not a budget for the ending: 500 ms,
 * or a tenth of the parent's own quit when that is longer (one sample a build).
 */
const QUIT_NOISE_MS = 500;
const QUIT_NOISE_SHARE = 0.1;
/** How long arm f waits for the app to exit once the quit is scheduled. */
const QUIT_WAIT_MS = 90_000;
/** The quit runs this long after the inspector call that schedules it has returned. */
const QUIT_DELAY_MS = 100;
/** One build's Electron may live this long. */
const CEILING_MS = 90 * 60_000;

// ---------------------------------------------------------------------------
// The scratch world: outside the repository and outside his home
// ---------------------------------------------------------------------------

const TMUX_VENDORED = (checkout) =>
  [join(checkout, 'build', 'vendor', 'tmux', 'bin', 'tmux'), join(ROOT, 'build', 'vendor', 'tmux', 'bin', 'tmux')].find((p) => existsSync(p)) ?? null;
if (TMUX_VENDORED(ROOT) === null) refuseRun('build/vendor/tmux/bin/tmux is not in this checkout; the probe runs the vendored tmux the app runs.');

const RUN_RAW = resolve((process.env['P323_RUN'] ?? '').trim() || `/private/tmp/p323-probe-${String(process.pid)}`);
if (!RUN_RAW.startsWith('/private/tmp/') && !RUN_RAW.startsWith('/tmp/')) {
  refuseRun(`P323_RUN (${RUN_RAW}) is not under /private/tmp, and the run folder is removed whole at the end.`);
}
rmSync(RUN_RAW, { recursive: true, force: true });
mkdirSync(RUN_RAW, { recursive: true });
/** Real path, because a wrapper compares `pwd -P` against it. */
const RUN = realpathSync(RUN_RAW);
const HOME = join(RUN, 'home');
const BIN = join(HOME, '.local', 'bin');
const HIS = join(RUN, 'his');
const WORK = join(RUN, 'work');
const STANDIN_DIR = join(RUN, 'standin');
const FAKE_APP = join(RUN, 'Fake.app', 'Contents', 'MacOS', 'fake');
const NPM_LOG = join(RUN, 'npm-calls.log');
const STAND_IN = join(ROOT, 'build', 'p323', 'stand-in.sh');
const KEEP = (process.env['P323_KEEP'] ?? '') === '1';
const REAL_HOME = (process.env['HOME'] ?? '').trim();
const HIS_HOME_OK =
  REAL_HOME !== '' && isAbsolute(REAL_HOME) && !REAL_HOME.startsWith('/private/tmp') && !REAL_HOME.startsWith('/tmp') && !REAL_HOME.includes("'");
const SHELL = (process.env['SHELL'] ?? '').trim() || '/bin/zsh';
const CONF = join(ROOT, 'resources', 'gmux-tmux.conf');

/**
 * The §3 guards, in the app's environment and so in every pane's. Each was
 * confirmed present in its binary by the spec step before use.
 */
const GUARDS = {
  DISABLE_AUTOUPDATER: '1',
  MUSE_NO_AUTO_UPDATE: '1',
  OPENCODE_DISABLE_AUTOUPDATE: '1',
  AGENT_CLI_UPDATE_CHECK_URL: 'http://127.0.0.1:9/',
  OMP_SKIP_SETUP: '1',
  NO_UPDATE_NOTIFIER: '1',
  GMUX_SPECSTORY_NO_CLOUD: '1'
};
/** Every inherited name the app must not see, mapped to undefined (which removes a key). */
const STRIPPED = Object.fromEntries(
  Object.keys(process.env)
    // The Terminal.app names too (the fix round): with them the scratch login
    // shell prints "Restored session: …" before `command -v`, which read as
    // qwen, agy and grok being reachable and stopped the run before launch.
    .filter(
      (n) =>
        /^(?:CLAUDECODE|CLAUDE_|npm_)/.test(n) ||
        ['ZDOTDIR', 'NVM_BIN', 'TMUX', 'TMUX_PANE', 'TERM_SESSION_ID', 'TERM_PROGRAM', 'TERM_PROGRAM_VERSION', 'SHELL_SESSION_ID'].includes(n)
    )
    .map((n) => [n, undefined])
);

const quoted = (s) => {
  if (s.includes("'")) throw new Stop(`a path holds a quote and cannot be written into a wrapper: ${s}`);
  return `'${s}'`;
};
function isExec(p) {
  try {
    const s = statSync(p);
    return s.isFile() && (s.mode & 0o111) !== 0;
  } catch {
    return false;
  }
}
/** `command -v <name>` in HIS login shell, the way probe:p314 finds the real binaries. Never run for the three. */
function loginWhich(name) {
  if (NEVER_BINS.includes(name)) throw new Stop(`refused to look up ${name}`);
  const r = spawnSync('/bin/zsh', ['-lc', `command -v ${name}`], { encoding: 'utf8', timeout: 30_000 });
  const path = (r.stdout ?? '').trim().split('\n').pop() ?? '';
  return isAbsolute(path) && existsSync(path) && !path.includes("'") ? path : null;
}

// ---------------------------------------------------------------------------
// ps, C locale, the probe's own reader. NEVER src/main/proc/session-tree.ts.
// ---------------------------------------------------------------------------

const C_ENV = { ...process.env, LC_ALL: 'C' };
/**
 * The wide table, or the named pids only; an empty map when none of them runs
 * (./ps-read.mjs, shared with harness-arms). A read that did not answer is
 * UNREADABLE and never an empty map, because an empty map is "no survivor" and
 * a failed read that looked like one would grade a leak as a pass.
 */
function psRead(pids = null) {
  const rows = psRows(pids);
  if (rows === null) {
    throw new Unreadable(`ps did not answer ${pids === null ? 'the wide read' : `a re-read of ${String(pids.length)} pid(s)`}, so no survivor count from it can be trusted`);
  }
  return rows;
}
/** Still the process recorded: same start time and same command line. */
const sameProc = (row, e) => row !== undefined && row.lstart === e.lstart && row.command === e.command;
const binOf = (command) => {
  const first = (command ?? '').trim().split(/\s+/)[0] ?? '';
  return first.slice(first.lastIndexOf('/') + 1).slice(0, 64) || '?';
};
const median = (xs) => {
  const s = [...xs].filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (s.length === 0) return null;
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const round = (x) => (x === null || x === undefined ? null : Math.round(x * 10) / 10);

// ---------------------------------------------------------------------------
// Every process any tree read recorded, for the probe's own ending
// ---------------------------------------------------------------------------

/** key pid|lstart → the recorded process, with the build and the row it was read under. */
const ours = new Map();
/** His Codex shared server at the start of the run: never signalled, whatever happens. */
let hisCodex = [];
const isHis = (e) => hisCodex.some((h) => h.pid === e.pid && h.lstart === e.lstart);
function note(entries, build, label) {
  for (const e of entries) {
    if (e.pid <= 1 || e.pid === process.pid) continue;
    const key = `${String(e.pid)}|${e.lstart}`;
    if (!ours.has(key)) ours.set(key, { pid: e.pid, lstart: e.lstart, command: e.command, pgid: e.pgid, build, label });
  }
}
/**
 * The probe's OWN ending, deliberately not the module under test. By pid, one
 * at a time, TERM then KILL, each only while the start time and command line
 * re-read as recorded; the group is re-read and reported, never used to
 * signal. Never his Codex server, never pid 1, never this process.
 */
async function endOwn(entries) {
  const live = [];
  const table = psRead(entries.map((e) => e.pid));
  for (const e of entries) {
    if (e.pid <= 1 || e.pid === process.pid || isHis(e)) continue;
    const row = table.get(e.pid);
    if (sameProc(row, e)) live.push({ ...e, groupNow: row.pgid });
  }
  for (const e of live) {
    try {
      process.kill(e.pid, 'SIGTERM');
    } catch {
      /* gone between the re-read and now */
    }
  }
  const started = Date.now();
  const termExit = {};
  let left = live;
  while (left.length > 0 && Date.now() - started < 3_000) {
    await sleep(100);
    const now = psRead(left.map((e) => e.pid));
    const still = left.filter((e) => sameProc(now.get(e.pid), e));
    for (const e of left) if (!still.includes(e)) termExit[e.pid] = Date.now() - started;
    left = still;
  }
  const again = psRead(left.map((e) => e.pid));
  const killed = [];
  for (const e of left) {
    if (!sameProc(again.get(e.pid), e)) continue;
    try {
      process.kill(e.pid, 'SIGKILL');
      killed.push(e.pid);
    } catch {
      /* gone */
    }
  }
  if (killed.length > 0) await sleep(300);
  return {
    asked: live.length,
    afterTermMs: Object.fromEntries(Object.entries(termExit).map(([p, ms]) => [p, ms])),
    killed: killed.length,
    groupMoved: live.filter((e) => e.groupNow !== e.pgid).map((e) => e.pid)
  };
}
/** Everything recorded (for one build, or all) that is still the recorded process. */
function stillRecorded(build) {
  const entries = [...ours.values()].filter((e) => build === null || e.build === build);
  const now = psRead(entries.map((e) => e.pid));
  return entries.filter((e) => sameProc(now.get(e.pid), e) && !isHis(e));
}

// ---------------------------------------------------------------------------
// The world (arm i): installs, his Codex server, the app's server, the stranger
// ---------------------------------------------------------------------------

/** The real binary of each agent in the list, from his own login shell. */
const real = {};
function installsNow() {
  const out = {};
  for (const id of RUN_AGENTS) {
    const r = real[id];
    if (r === undefined || r === null) {
      out[id] = 'not installed';
      continue;
    }
    try {
      const rp = realpathSync(r.path);
      const s = statSync(rp);
      out[id] = `${rp} ${s.mtime.toISOString()} ${String(s.size)}`;
    } catch (err) {
      out[id] = `unreadable: ${String(err?.code ?? err)}`;
    }
  }
  const gem = geminiPackage();
  if (gem !== null) {
    try {
      const pkg = JSON.parse(readFileSync(gem, 'utf8'));
      out['gemini package'] = `${String(pkg.version)} ${statSync(gem).mtime.toISOString()}`;
    } catch {
      out['gemini package'] = 'unreadable';
    }
  }
  if (HIS_HOME_OK) {
    for (const d of ['.local/share/claude/versions', '.local/share/cursor-agent/versions']) {
      try {
        out[d] = readdirSync(join(REAL_HOME, d)).sort().join(',');
      } catch {
        out[d] = 'none';
      }
    }
  }
  // Every package in every global npm folder on the machine, by version and
  // mtime (the tools round): arm e's Claude Code runs his plugins under his
  // home, where a login shell can find the REAL npm before the refusing stub
  // (the reverify saw one in the parent's arm e tree), so a global add by any
  // path must still show here. Files are read; nothing is run.
  Object.assign(out, globalInstalls(HIS_HOME_OK ? REAL_HOME : null));
  // The three never started (his ruling of 2026-09-30), by `stat` alone: found
  // by name in the inherited PATH and the folders their rows probe, never run.
  for (const p of neverInstalls()) {
    try {
      const s = statSync(p);
      out[`never ${p}`] = `${s.mtime.toISOString()} ${String(s.size)}`;
    } catch (err) {
      out[`never ${p}`] = `unreadable: ${String(err?.code ?? err)}`;
    }
  }
  return out;
}
/** The real paths of every qwen, agy and grok on the inherited PATH and in their rows' own folders. Nothing is run. */
function neverInstalls() {
  const dirs = [...(process.env['PATH'] ?? '').split(':'), ...(HIS_HOME_OK ? [join(REAL_HOME, '.local', 'bin'), join(REAL_HOME, '.grok', 'bin')] : [])];
  const found = new Set();
  for (const d of dirs) {
    if (d === '') continue;
    for (const b of NEVER_BINS) {
      if (!isExec(join(d, b))) continue;
      try {
        found.add(realpathSync(join(d, b)));
      } catch {
        /* a dangling link runs nothing */
      }
    }
  }
  return [...found].sort();
}
/** Gemini's own package.json, found by walking up from its binary's real path. */
function geminiPackage() {
  const r = real['gemini'];
  if (r === undefined || r === null) return null;
  let dir;
  try {
    dir = dirname(realpathSync(r.path));
  } catch {
    return null;
  }
  for (let i = 0; i < 6; i += 1) {
    const p = join(dir, 'package.json');
    if (existsSync(p)) {
      try {
        if (JSON.parse(readFileSync(p, 'utf8')).name === '@google/gemini-cli') return p;
      } catch {
        /* not it */
      }
    }
    dir = dirname(dir);
  }
  return null;
}
/** His Codex shared background server, if running: `ps` alone, read only (SPEC §2.1). */
function codexServerNow() {
  const out = [];
  for (const row of psRead().values()) {
    const c = row.command;
    if (!c.includes('app-server')) continue;
    if (!/(?:^|\/)codex(?:\s|$)/.test(c.split(' app-server')[0] ?? '') && !c.includes('codex app-server')) continue;
    if (c.includes('pid-update-loop') || c.includes('--managed-daemon')) {
      out.push({ pid: row.pid, lstart: row.lstart, kind: c.includes('pid-update-loop') ? 'pid-update-loop' : 'managed-daemon' });
    }
  }
  return out.sort((a, b) => a.pid - b.pid);
}

// ---------------------------------------------------------------------------
// The report and its verdicts
// ---------------------------------------------------------------------------

const report = {
  run: RUN,
  parent: PARENT,
  head: ROOT,
  agents: RUN_AGENTS,
  arms: [...ARMS],
  constants: { HANGUP_GRACE_MS, TERM_GRACE_MS, WATCH_MS, SETTLE_MS, GRACES_MS, QUIT_CEILING_MS, QUIT_NOISE_MS, QUIT_NOISE_SHARE, QUIT_WAIT_MS, QUIT_DELAY_MS },
  order: (process.env['P323_HEAD_FIRST'] ?? '') === '1' ? ['head', 'parent'] : ['parent', 'head'],
  notLaunched: {
    droid: 'not installed (its row carries the planted stand-in)',
    qwen: 'not launched, by his ruling',
    antigravity: 'not launched, by his ruling',
    grok: 'not launched, by his ruling'
  },
  world: {},
  builds: {},
  verdicts: [],
  turns: 0
};
let failures = 0;
let unreadable = 0;
/**
 * ok: true PASS, false FAIL, null UNREADABLE, 'reported' a reading put to him,
 * 'exception' a STATED exception (KNOWN_START_REFUSALS) whose own evidence was
 * read at both builds. Neither of the last two stops the run exiting 0.
 */
function verdict(id, ok, said) {
  report.verdicts.push({ id, ok, said });
  if (ok === false) failures += 1;
  if (ok === null) unreadable += 1;
  say(`${ok === null ? 'UNREADABLE' : ok === 'reported' ? 'REPORTED' : ok === 'exception' ? 'EXCEPTION' : ok ? 'PASS' : 'FAIL'} ${id}: ${said}`);
}

// ---------------------------------------------------------------------------
// Build the world once, for both builds
// ---------------------------------------------------------------------------

let appPath = '';
function buildWorld() {
  for (const d of [HOME, BIN, HIS, WORK, STANDIN_DIR, dirname(FAKE_APP), join(HOME, '.gemini'), join(HOME, '.codex'), join(HOME, '.omp', 'agent')]) {
    mkdirSync(d, { recursive: true });
  }
  for (const p of [RUN, HOME, BIN, HIS, STAND_IN, FAKE_APP, STANDIN_DIR, NPM_LOG]) quoted(p);
  if (HIS_HOME_OK) quoted(REAL_HOME);

  // The real binaries, from his own login shell, in the registry's order.
  for (const id of RUN_AGENTS) {
    real[id] = null;
    for (const bin of AGENT_ROWS[id].bins) {
      const path = loginWhich(bin);
      if (path !== null) {
        real[id] = { bin, path };
        break;
      }
    }
  }

  // A folder holding only this probe's node, for an agent whose own engines
  // range the login PATH's node does not meet (pi). This node runs under the
  // repository's engines range, which is newer than pi's.
  const nodeDir = join(RUN, 'node-only');
  mkdirSync(nodeDir, { recursive: true });
  symlinkSync(process.execPath, join(nodeDir, 'node'));
  quoted(nodeDir);
  report.world.nodeForPi = { version: process.versions.node, needs: null, meets: null };

  // One wrapper per agent. It exec's the real one under the same pid.
  for (const id of RUN_AGENTS) {
    const r = real[id];
    if (r === null) continue;
    const row = AGENT_ROWS[id];
    let pathLine = '';
    if (row.nodeFirst === true) {
      const needs = enginesNodeOf(r.path);
      const meets = needs !== null && atLeast(process.versions.node, needs);
      report.world.nodeForPi = { version: process.versions.node, needs, meets };
      if (meets) pathLine = `PATH=${quoted(nodeDir)}":$PATH"; export PATH`;
    }
    const homeLine =
      row.scratchOnly === true || !HIS_HOME_OK
        ? `HOME=${quoted(HOME)}`
        : `case "$(pwd -P)/" in ${quoted(`${HIS}/`)}*) HOME=${quoted(REAL_HOME)} ;; *) HOME=${quoted(HOME)} ;; esac`;
    const tty = (row.tty ?? []).map(quoted).join(' ');
    writeFileSync(
      join(BIN, r.bin),
      [
        '#!/bin/sh',
        `# probe:p323. The REAL ${r.bin}, exec'd under the same pid, so the pane holds it exactly as the product would.`,
        row.scratchOnly === true
          ? '# ALWAYS the scratch home (his ruling R3): never his.'
          : "# HOME by folder: under the run's his/ folder, his own home; anywhere else, the scratch one.",
        '# The scratch tmux server is hidden from it (Phase 314 R8).',
        'unset TMUX TMUX_PANE',
        pathLine,
        homeLine,
        'export HOME',
        tty === '' ? '' : `if [ -t 0 ] && [ -t 1 ]; then exec ${quoted(r.path)} ${tty} "$@"; fi`,
        `exec ${quoted(r.path)} "$@"`,
        ''
      ]
        .filter((l) => l !== '')
        .join('\n'),
      'utf8'
    );
    chmodSync(join(BIN, r.bin), 0o755);
  }

  // droid: the planted stand-in. NOT droid and not an agent.
  writeFileSync(
    join(BIN, 'droid'),
    [
      '#!/bin/sh',
      '# probe:p323. NOT droid and not an agent: build/p323/stand-in.sh, a planted process.',
      'unset TMUX TMUX_PANE',
      `P323_STANDIN_DIR=${quoted(STANDIN_DIR)}; export P323_STANDIN_DIR`,
      `P323_FAKE_APP=${quoted(FAKE_APP)}; export P323_FAKE_APP`,
      `exec /bin/sh ${quoted(STAND_IN)} "$@"`,
      ''
    ].join('\n'),
    'utf8'
  );
  chmodSync(join(BIN, 'droid'), 0o755);
  // Nothing is installed during this run, whatever anything wants. EVERY call
  // is refused, a registry read included, so nothing reaches the network or
  // the disk through npm; each is logged with its arguments kept apart (the
  // unit separator) so the verdict can tell a read from an install.
  writeFileSync(
    join(BIN, 'npm'),
    [
      '#!/bin/sh',
      `{ printf 'npm'; for a in "$@"; do printf '\\037%s' "$a"; done; printf '\\n'; } >> ${quoted(NPM_LOG)}`,
      'echo "probe:p323 refuses npm: nothing is installed during this run" >&2',
      'exit 1',
      ''
    ].join('\n'),
    'utf8'
  );
  chmodSync(join(BIN, 'npm'), 0o755);
  // The app bundle executable: /bin/sleep reached through a path inside a fake
  // bundle, so its command line names `.app/Contents/MacOS/` exactly as a real
  // bundle's executable does. A LINK, not a copy: a copy of /bin/sleep is
  // killed by the kernel the moment it starts (exit 137, measured on
  // 2026-09-29), because an Apple platform binary is trusted only at its own
  // path, so SPEC §8.1's "a copy" cannot run on this Mac.
  symlinkSync('/bin/sleep', FAKE_APP);

  // The scratch home's settings (SPEC §3, and Phase 314's R8 for Gemini).
  writeFileSync(
    join(HOME, '.gemini', 'settings.json'),
    `${J(
      {
        general: { enableAutoUpdate: false, enableAutoUpdateNotification: false },
        privacy: { usageStatisticsEnabled: false },
        security: { folderTrust: { enabled: true } }
      },
      null,
      2
    )}\n`,
    'utf8'
  );
  writeFileSync(join(HOME, '.codex', 'config.toml'), 'check_for_update_on_startup = false\n\n[features]\ndaemon_auto_start = false\n', 'utf8');
  writeFileSync(join(HOME, '.omp', 'agent', 'config.yml'), 'startup:\n  checkUpdate: false\n  setupWizard: false\n', 'utf8');
  // tmux's execvp reads the LOGIN shell's PATH, and /etc/zprofile's path_helper
  // reorders it, so the scratch bin is put first again after it.
  writeFileSync(join(HOME, '.zprofile'), `export PATH=${quoted(BIN)}":$PATH"\n`, 'utf8');
  writeFileSync(join(HOME, '.zshrc'), `export PATH=${quoted(BIN)}":$PATH"\n`, 'utf8');

  // THE APP'S PATH: the scratch bin first, then the inherited PATH with every
  // folder holding qwen, agy or grok replaced by a folder of links to
  // everything else in it, and every folder that belongs to one of them dropped.
  const dirs = [BIN];
  const shadowed = [];
  const dropped = [];
  let n = 0;
  for (const dir of (process.env['PATH'] ?? '').split(':')) {
    if (dir === '' || dirs.includes(dir)) continue;
    if (NEVER_DIR.test(dir)) {
      dropped.push(dir);
      continue;
    }
    if (NEVER_BINS.some((b) => existsSync(join(dir, b)))) {
      const shadow = join(RUN, 'path', String(n));
      n += 1;
      mkdirSync(shadow, { recursive: true });
      let entries = [];
      try {
        entries = readdirSync(dir);
      } catch {
        entries = [];
      }
      for (const e of entries) {
        if (NEVER_ENTRY.test(e)) continue;
        try {
          symlinkSync(join(dir, e), join(shadow, e));
        } catch {
          /* a name that cannot be linked is simply not on the PATH */
        }
      }
      dirs.push(shadow);
      shadowed.push(dir);
      continue;
    }
    dirs.push(dir);
  }
  appPath = dirs.join(':');
  report.world.path = { shadowed, dropped, dirs: dirs.length };
}

/**
 * The lowest node an installed package's `engines.node` asks for, as
 * `[major, minor, patch]`, found by walking up from its executable to its
 * package.json. Only the `>=X.Y.Z` form is read; anything else is null.
 */
function enginesNodeOf(binPath) {
  let dir;
  try {
    dir = dirname(realpathSync(binPath));
  } catch {
    return null;
  }
  for (let i = 0; i < 8 && dir !== '/'; i += 1) {
    const pkg = join(dir, 'package.json');
    if (existsSync(pkg)) {
      try {
        const want = String(JSON.parse(readFileSync(pkg, 'utf8'))?.engines?.node ?? '');
        // `String.match`, not `RegExp.exec`: gate:background reads a call
        // named `exec(` as a spawner, and this starts nothing.
        const m = want.trim().match(/^>=\s*(\d+)\.(\d+)\.(\d+)$/);
        return m === null ? null : [Number(m[1]), Number(m[2]), Number(m[3])];
      } catch {
        return null;
      }
    }
    dir = dirname(dir);
  }
  return null;
}
function atLeast(version, want) {
  const have = version.split('.').map(Number);
  for (let i = 0; i < 3; i += 1) {
    if ((have[i] ?? 0) !== want[i]) return (have[i] ?? 0) > want[i];
  }
  return true;
}

/** The environment every login shell and every app launch in this run gets. */
function appEnvBase() {
  return { ...STRIPPED, ...GUARDS, HOME, PATH: appPath };
}
function envForSpawn(extra) {
  const env = { ...process.env };
  for (const [k, v] of Object.entries({ ...appEnvBase(), ...extra })) {
    if (v === undefined) delete env[k];
    else env[k] = v;
  }
  return env;
}

/**
 * THE PRECONDITION, before any launch. Asked of the scratch login shell with
 * the app's own environment, and walked through every folder Tortie's resolver
 * adds (src/main/tmux/resolve.ts `extraBinDirsFor`, each agent's
 * `extraProbeDirs`), against the scratch home, because that is the app's home.
 */
function preflight() {
  const env = envForSpawn({});
  const r = spawnSync(SHELL, ['-lic', 'printf "%s" "$PATH"'], { encoding: 'utf8', timeout: 30_000, env });
  const loginPath = (r.stdout ?? '').trim().split('\n').pop() ?? '';
  if (loginPath === '') throw new Stop(`the scratch login shell (${SHELL} -lic) printed no PATH, so what the app would resolve is unknown`);
  const expand = (d) => (d.startsWith('~/') ? join(HOME, d.slice(2)) : d);
  const globbed = (d) => {
    const e = expand(d);
    if (!e.includes('*')) return [e];
    const [head, tail] = e.split('*');
    try {
      return readdirSync(head).map((x) => join(head, x, tail));
    } catch {
      return [];
    }
  };
  const shared = [join(HOME, '.local', 'bin'), '/opt/homebrew/bin', '/usr/local/bin', join(HOME, 'bin'), join(HOME, '.claude', 'local'), join(HOME, '.npm-global', 'bin'), join(HOME, '.bun', 'bin'), join(HOME, '.cursor', 'bin')];
  const walk = (name, probe) => {
    for (const d of [...loginPath.split(':'), ...probe.flatMap(globbed), ...shared]) {
      if (d !== '' && isExec(join(d, name))) return join(d, name);
    }
    return null;
  };
  const reached = [];
  for (const [bin, id] of [['qwen', 'qwen'], ['agy', 'antigravity'], ['grok', 'grok']]) {
    const hit = walk(bin, PROBE_DIRS[id] ?? []);
    if (hit !== null) reached.push(`${bin} at ${hit}`);
    const asked = spawnSync(SHELL, ['-lic', `command -v ${bin} || true`], { encoding: 'utf8', timeout: 30_000, env });
    // Only what `command -v` itself answers counts: a path, an alias or a
    // function name. A banner a shell prints on start is not an answer.
    const said = (asked.stdout ?? '')
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => (isAbsolute(l) && l.endsWith(`/${bin}`)) || l.startsWith(`alias ${bin}=`) || l === bin);
    if (said.length > 0) reached.push(`${bin} (the login shell says ${said.join('; ')})`);
  }
  if (reached.length > 0) {
    throw new Stop(`refusing to launch: the app could reach ${reached.join('; ')}, and qwen, agy and grok are never started, not even for their version`);
  }
  const wrong = [];
  for (const id of [...RUN_AGENTS, 'droid']) {
    const bins = id === 'droid' ? ['droid'] : AGENT_ROWS[id].bins;
    if (id !== 'droid' && real[id] === null) continue;
    let first = null;
    for (const b of bins) {
      first = walk(b, PROBE_DIRS[id] ?? []);
      if (first !== null) break;
    }
    const want = join(BIN, id === 'droid' ? 'droid' : real[id].bin);
    if (first !== want) wrong.push(`${id} resolves to ${String(first)}, not ${want}`);
  }
  if (wrong.length > 0) throw new Stop(`refusing to launch: ${wrong.join('; ')}`);
  report.world.loginPathDirs = loginPath.split(':').length;
  preflightLoginPath = loginPath;
}
let preflightLoginPath = '';

/**
 * His ruling of 2026-09-30, before EITHER launch: each build's OWN overlay
 * parser, merge and resolver, through the pinned tsx, over `neverOverlay()`,
 * resolved against the login shell's PATH, the PATH the app is given and every
 * folder Tortie's resolver adds under the app's (scratch) home. A build whose
 * parser refused the file would fall back to the real binaries, so this finds
 * that before anything starts. It reads files only; nothing is run.
 */
function neverPrecheck() {
  const script = [
    "import { join } from 'node:path';",
    "import { parseAgentOverlay, mergeAgentOverlay } from './src/main/config/overlay.ts';",
    "import { AGENT_REGISTRY } from './src/main/agents/registry.ts';",
    "import { resolveBinaryAllAgainst, extraBinDirsFor } from './src/main/tmux/resolve.ts';",
    `const home = ${J(HOME)};`,
    `const userPath = ${J([preflightLoginPath, appPath].filter(Boolean).join(':'))};`,
    `const parsed = parseAgentOverlay(${J(J(neverOverlay()))});`,
    'const merged = mergeAgentOverlay(parsed.rows, AGENT_REGISTRY);',
    'const rows = {};',
    `for (const id of ${J(HIDDEN_IDS)}) {`,
    '  const e = merged.agents.find((a) => a.id === id);',
    '  if (e === undefined) { rows[id] = null; continue; }',
    "  const dirs = [...e.extraProbeDirs.map((p) => (p.startsWith('~/') ? join(home, p.slice(2)) : p)), ...extraBinDirsFor(home)];",
    '  rows[id] = { binaries: e.binaries, copies: e.binaries.flatMap((b) => resolveBinaryAllAgainst(b, userPath, dirs)).length };',
    '}',
    'process.stdout.write(JSON.stringify({ parseProblems: parsed.problems.length, mergeProblems: merged.problems.length, rows }));',
    ''
  ].join('\n');
  report.world.never = { overlay: neverOverlay(), precheck: {} };
  for (const build of report.order) {
    const checkout = build === 'parent' ? PARENT : ROOT;
    const r = spawnSync(process.execPath, [tsxCli(), '--tsconfig', 'tsconfig.node.json', '-'], {
      cwd: checkout,
      input: script,
      encoding: 'utf8',
      timeout: 120_000,
      env: envForSpawn({})
    });
    let out = null;
    try {
      out = JSON.parse(r.stdout ?? '');
    } catch {
      out = null;
    }
    const v = neverPrecheckVerdict(out);
    report.world.never.precheck[build] = { exit: r.status, ...v };
    verdict(`(guard) ${build}'s own overlay reader hides qwen, antigravity and grok`, v.ok ? true : null, v.said);
    if (!v.ok) throw new Stop(`refusing to launch: ${build}'s own reader would not hide qwen, antigravity and grok (${v.said})`);
  }
}
/** Written into a build's profile before ITS launch; the app reads it once, at boot, before its first scan. */
function writeNeverOverlay(profile) {
  mkdirSync(join(profile, 'gmux', 'config'), { recursive: true });
  writeFileSync(join(profile, 'gmux', 'config', 'agents.json'), `${J(neverOverlay(), null, 1)}\n`, 'utf8');
}
const realOr = (p) => {
  try {
    return realpathSync(p);
  } catch {
    return p;
  }
};

// ---------------------------------------------------------------------------
// One build: its Electron, its two scratch servers, its arms
// ---------------------------------------------------------------------------

const sockets = [];
function killServer(tmux, socket) {
  if (!socket.startsWith('gmux-p323')) return;
  spawnSync(tmux, ['-L', socket, 'kill-server'], { stdio: 'ignore', timeout: 10_000 });
  const file = join(process.env['TMUX_TMPDIR'] ?? '/tmp', `tmux-${String(process.getuid())}`, socket);
  rmSync(file, { force: true });
}

async function attachRenderer(profile, timeoutMs) {
  // Loaded here and not at the top: build/cdp-target.mjs answers --self-test
  // at import time with its own fixtures and exits, which would answer this
  // probe's --self-test with that module's (build/p331/probe-p331.mjs does the same).
  const { pickRendererTarget } = await import('../cdp-target.mjs');
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
    if (Date.now() - started > timeoutMs) throw new Unreadable(`no app window: ${why}`);
    await sleep(300);
  }
}
async function attachMain(handle, timeoutMs) {
  const started = Date.now();
  for (;;) {
    const m = /Debugger listening on (ws:\/\/127\.0\.0\.1:\d+\/[0-9a-f-]+)/i.exec(handle.text());
    if (m !== null) {
      try {
        return await wsConnect(m[1]);
      } catch {
        /* printed a beat before the listener is up */
      }
    }
    if (Date.now() - started > timeoutMs) return null;
    await sleep(300);
  }
}

/**
 * One launch of one build. `opts.rtOnly` is the second launch of arm (C)'s
 * ABBA order: the guard, the keeper, the read costs and the `rt` block only,
 * under its own socket, profile and folders (`opts.suffix`).
 */
async function runBuild(build, checkout, opts = {}) {
  const suffix = opts.suffix ?? '';
  const armsHere = opts.rtOnly === true ? new Set(['rt']) : ARMS;
  const short = `${build === 'parent' ? 'p' : 'h'}${suffix}`;
  const socket = `gmux-p323-${String(process.pid)}-${short}`;
  const xsocket = `gmux-p323x-${String(process.pid)}-${short}`;
  const tmux = TMUX_VENDORED(checkout);
  sockets.push({ socket, tmux }, { socket: xsocket, tmux });
  const harness = join(RUN, `${build}${suffix}`, 'harness');
  const profile = join(harness, 'profile');
  const work = join(WORK, `${build}${suffix}`);
  const his = join(HIS, `${build}${suffix}`);
  mkdirSync(profile, { recursive: true });
  mkdirSync(work, { recursive: true });
  mkdirSync(his, { recursive: true });
  const B = { build, launch: `${build}${suffix}`, rtOnly: opts.rtOnly === true, checkout, socket, rows: {}, arms: {}, world: { moves: [] }, measures: {}, quit: null };
  // `-u` on every read: the pane formats below are tab separated, and a tmux
  // client whose locale is not UTF-8 is sent each tab as `_` (measured on
  // 2026-09-29, tmux 3.6a and 3.7b), which would read every session as having
  // no pane and grade a leak as nothing left.
  const tm = (args) => spawnSync(tmux, ['-u', '-L', socket, ...args], { encoding: 'utf8', timeout: 15_000 });
  const tx = (args, env) => spawnSync(tmux, ['-u', '-L', xsocket, ...args], { encoding: 'utf8', timeout: 15_000, ...(env === undefined ? {} : { env }) });
  say(`${B.launch}: launching ${checkout} on -L ${socket}${B.rtOnly ? ', for arm (C)’s second block only' : ''}`);
  // His ruling of 2026-09-30: THIS build's profile holds the scratch
  // agents.json before THIS launch, so the app never meets it without one.
  writeNeverOverlay(profile);

  await withElectron(
    {
      label: `p323-${B.launch}`,
      userDataDir: profile,
      cwd: checkout,
      tmuxSocket: socket,
      args: ['--remote-debugging-port=0', '--use-mock-keychain', '--inspect=0'],
      env: withoutDevRenderer({
        ...appEnvBase(),
        GMUX_TMUX_SOCKET: socket,
        GMUX_PROBES: '1',
        GMUX_LOG_FILE: '1',
        GMUX_CONFIG_ROOT: join(profile, 'gmux', 'config'),
        GMUX_HARNESS_DIR: harness,
        GMUX_TMUX_BIN: tmux
      }),
      graceMs: 20_000,
      ceilingMs: CEILING_MS
    },
    async (handle) => {
      const cdp = await attachRenderer(profile, 150_000);
      await cdp.call('Runtime.enable');
      let ready = false;
      for (let i = 0; i < 200 && !ready; i += 1) {
        ready = (await cdpEval(cdp, 'window.gmux !== undefined && window.__p293 !== undefined').catch(() => false)) === true;
        if (!ready) await sleep(300);
      }
      if (!ready) throw new Stop(`${build}: the app never exposed window.gmux and the Phase 293 drive, so nothing can be driven`);
      // THE GUARD, READ BACK from the app's own scan before any arm (his ruling
      // of 2026-09-30). A hidden row that resolved means its version probe may
      // already have run, so the run stops here and the other build is never
      // launched.
      let scan = null;
      try {
        scan = JSON.parse(
          await cdpEval(
            cdp,
            'window.gmux.agentsList().then((r) => JSON.stringify(r.agents.map((a) => ({ id: a.id, installed: a.installed, binPath: a.binPath ?? null, version: a.version ?? null }))))',
            90_000
          )
        );
      } catch {
        scan = null;
      }
      const scanned = Array.isArray(scan) ? scan.map((a) => ({ ...a, binPath: typeof a.binPath === 'string' ? realOr(a.binPath) : null })) : scan;
      const guard = neverScanVerdict(scanned, realOr(join(BIN, 'droid')));
      B.scan = { ...guard, installed: Array.isArray(scan) ? scan.filter((a) => a.installed).map((a) => a.id) : null };
      verdict(`(guard) ${build}: the app's own detection`, guard.ok ? true : null, guard.said);
      if (!guard.ok) throw new Stop(`(${build}) the app's own detection was not kept off qwen, antigravity and grok: ${guard.said}`);
      const mainCdp = await attachMain(handle, 60_000);
      let appPid = 0;
      try {
        appPid = handle.appPid();
      } catch {
        appPid = 0;
      }

      // ---- the session helpers ------------------------------------------------
      const listMain = async () =>
        JSON.parse(
          await cdpEval(
            cdp,
            'window.gmux.sessions.list().then((s) => JSON.stringify(s.map((x) => ({ id: x.id, name: x.name, status: x.status, tmuxName: x.tmuxName, capture: x.capture ?? null }))))'
          )
        );
      async function create({ name, agent, folder, extraArgs = [], capture = false }) {
        // The three are refused by id before anything is composed.
        if (NEVER_IDS.has(agent) || NEVER_BINS.includes(agent)) throw new Stop(`refused to create a ${agent} session: never started, by his ruling`);
        mkdirSync(folder, { recursive: true });
        const input = { name, projectPath: folder, cwd: folder, agent, ...(extraArgs.length > 0 ? { extraArgs } : {}), ...(capture ? { capture: true } : {}) };
        const r = await cdpEval(
          cdp,
          `window.gmux.sessions.create(${J(input)}).then((s) => ({ ok: true, id: s.id, name: s.name, tmuxName: s.tmuxName })).catch((e) => ({ ok: false, err: String(e && e.message || e) }))`,
          120_000
        );
        if (r?.ok !== true) {
          if (agent === 'droid') {
            throw new Stop(`the create path refused the droid row (${String(r?.err)}); the planted rows need it, and no real agent is put in its place`);
          }
          throw new Unreadable(`Tortie did not create the ${agent} session ${name}: ${String(r?.err)}`);
        }
        const one = { id: r.id, name: r.name, tmuxName: r.tmuxName, agent, folder };
        for (let i = 0; i < 60 && panesOf(one).length === 0; i += 1) await sleep(200);
        return one;
      }
      function panesOf(one) {
        const r = tm(['list-panes', '-a', '-F', '#{session_name}\t#{pane_id}\t#{pane_pid}\t#{pane_dead}\t#{pane_current_command}']);
        const out = [];
        for (const line of (r.stdout ?? '').split('\n')) {
          const [name, paneId, pid, dead, current] = line.split('\t');
          if (name === one.tmuxName && paneId !== undefined) out.push({ paneId, pid: Number(pid), dead: dead === '1', current: current ?? '' });
        }
        return out;
      }
      const screenOf = (one, wholeHistory = false) => {
        const p = panesOf(one)[0];
        if (p === undefined) return '';
        // A dead pane kept by remain-on-exit shows only tmux's "Pane is dead"
        // line; the agent's own words are in the history above it, so a stated
        // refusal reads the whole history (the tools round's reverify).
        const r = tm(['capture-pane', '-p', '-J', ...(wholeHistory ? ['-S', '-'] : []), '-t', p.paneId]);
        return r.status === 0 ? (r.stdout ?? '') : '';
      };
      const nonblank = (s) => s.split('\n').filter((l) => l.trim() !== '').length;
      function type(one, text, enter = true) {
        const p = panesOf(one)[0];
        if (p === undefined) throw new Unreadable(`${one.name}: no pane to type into`);
        if (text !== '') tm(['send-keys', '-t', p.paneId, '-l', '--', text]);
        if (enter) tm(['send-keys', '-t', p.paneId, 'Enter']);
      }
      const key = (one, name) => {
        const p = panesOf(one)[0];
        if (p !== undefined) tm(['send-keys', '-t', p.paneId, name]);
      };
      /** The probe's own tree read: every live pane of the session and its descendants. */
      function treeRead(one) {
        const panes = panesOf(one).filter((p) => !p.dead);
        const table = psRead();
        const kids = new Map();
        for (const row of table.values()) {
          if (!kids.has(row.ppid)) kids.set(row.ppid, []);
          kids.get(row.ppid).push(row.pid);
        }
        const entries = [];
        const seen = new Set();
        for (const p of panes) {
          const root = table.get(p.pid);
          if (root === undefined) continue;
          // The pane process's OWN group (the rule since the second fix
          // round); the terminal's foreground group is no longer selected.
          const groups = new Set([root.pgid]);
          const stack = [p.pid];
          while (stack.length > 0 && entries.length < 4_096) {
            const pid = stack.pop();
            if (seen.has(pid)) continue;
            seen.add(pid);
            const row = table.get(pid);
            if (row === undefined) continue;
            entries.push({ ...row, bin: binOf(row.command), hangup: groups.has(row.pgid), app: row.command.includes('.app/Contents/MacOS/'), root: pid === p.pid });
            for (const k of kids.get(pid) ?? []) stack.push(k);
          }
        }
        note(entries, build, one.name);
        return entries;
      }
      /** What the report may carry of a tree: never a command line's arguments. */
      const pub = (e) => ({ pid: e.pid, ppid: e.ppid, pgid: e.pgid, tpgid: e.tpgid, stat: e.stat, bin: e.bin, hangup: e.hangup, app: e.app, root: e.root });
      /** A stable first screen, then a stable tree (SPEC §3's census rule). */
      async function waitReady(one, minLines = 2) {
        const t0 = Date.now();
        let last = null;
        let since = Date.now();
        let lines = 0;
        while (Date.now() - t0 < 30_000) {
          const cap = screenOf(one);
          lines = nonblank(cap);
          if (cap !== last) {
            last = cap;
            since = Date.now();
          }
          if (lines >= minLines && Date.now() - since > 2_500) break;
          await sleep(300);
        }
        const screenMs = Date.now() - t0;
        let prev = -1;
        let tsince = Date.now();
        const t1 = Date.now();
        let tree = [];
        while (Date.now() - t1 < 15_000) {
          tree = treeRead(one);
          if (tree.length !== prev) {
            prev = tree.length;
            tsince = Date.now();
          }
          if (Date.now() - tsince > 3_000) break;
          await sleep(500);
        }
        return { tree, screenMs, lines };
      }
      /** A login shell's prompt, with nothing running in front of it. */
      async function waitShell(one) {
        const t0 = Date.now();
        let last = null;
        let since = Date.now();
        while (Date.now() - t0 < 30_000) {
          const p = panesOf(one)[0];
          const cap = screenOf(one);
          if (cap !== last) {
            last = cap;
            since = Date.now();
          }
          if (p !== undefined && /zsh|bash/.test(p.current) && Date.now() - since > 1_500) return;
          await sleep(300);
        }
        throw new Unreadable(`${one.name}: no shell prompt settled in 30 s`);
      }

      // ---- app.log: what the product says it signalled ----------------------
      const logRecords = () => {
        const out = [];
        for (const f of ['app.log.1', 'app.log']) {
          const p = join(profile, 'logs', f);
          if (!existsSync(p)) continue;
          for (const line of readFileSync(p, 'utf8').split('\n')) {
            if (line.trim() === '') continue;
            try {
              out.push(JSON.parse(line));
            } catch {
              /* a line being written */
            }
          }
        }
        return out;
      };
      const ENDED = /^ended (\d+) process\(es\) of "(.*)" that outlived the hang-up: (.*)$/;
      const treeLines = (name, since) =>
        logRecords().filter(
          (r) =>
            typeof r.msg === 'string' &&
            Date.parse(String(r.ts ?? '')) >= since - 2_000 &&
            r.msg.includes(`"${name}"`) &&
            (r.msg.startsWith('ended ') || r.msg.includes('could not be read'))
        );
      // `String.match` rather than `RegExp.exec` in this helper: gate:background
      // discovers a spawner by a call named `exec(` in a function's body, and
      // this helper starts nothing.
      const signalsFor = (name, since) => {
        const out = [];
        for (const r of treeLines(name, since)) {
          const m = String(r.msg).match(ENDED);
          if (m === null || m[2] !== name) continue;
          for (const part of m[3].split(', ')) {
            const pm = part.trim().match(/^(.+) (\d+) (SIGTERM|SIGKILL)$/);
            if (pm !== null) out.push({ bin: pm[1], pid: Number(pm[2]), signal: pm[3] });
          }
        }
        return out;
      };
      const logReadable = () => existsSync(join(profile, 'logs', 'app.log'));

      // ---- End, and what happens after -----------------------------------------
      const endViaBridge = (one) =>
        cdpEval(
          cdp,
          `(async () => { const t = performance.now(); try { await window.gmux.sessions.kill(${J(one.id)}); return { ok: true, ms: performance.now() - t }; } catch (e) { return { ok: false, ms: performance.now() - t, err: String(e && e.message || e) }; } })()`,
          120_000
        );
      /**
       * Watch recorded entries from `t0`: when each stopped being the recorded
       * process. Up to WATCH_MS, and no longer than SETTLE_MS once nothing
       * left is a process this build could still signal (see SETTLE_MS).
       */
      async function watch(entries, t0, windowMs = WATCH_MS) {
        const exits = {};
        let alive = [...entries];
        while (alive.length > 0 && Date.now() - t0 < windowMs) {
          await sleep(100);
          const now = psRead(alive.map((e) => e.pid));
          const still = alive.filter((e) => sameProc(now.get(e.pid), e));
          for (const e of alive) if (!still.includes(e)) exits[e.pid] = Date.now() - t0;
          alive = still;
          if (Date.now() - t0 >= SETTLE_MS && (build === 'parent' || alive.every((e) => e.hangup !== true || e.app === true))) break;
        }
        return { exits, alive };
      }
      /**
       * Lens 2 of the second verify round: the continuation writes its one line
       * a poll after the last exit it caused, so an arm that reads app.log
       * straight after its watch undercounts. Wait for the lines, up to 3 s.
       */
      async function awaitTreeLines(names, t0) {
        const until = Date.now() + 3_000;
        while (Date.now() < until && names.some((n) => treeLines(n, t0).length === 0)) await sleep(250);
      }
      /** Press End through the bridge, watch, read the log, and end what is left by the probe's own hand. */
      async function endAndWatch(one, tree) {
        const t0 = Date.now();
        const rt = await endViaBridge(one);
        const { exits, alive } = await watch(tree, t0);
        // The continuation writes its one line when it returns, a poll after
        // the last exit it caused.
        const late = Object.values(exits).some((ms) => ms >= HANGUP_GRACE_MS - 500);
        if (late || alive.length > 0) {
          const until = Date.now() + 3_000;
          while (Date.now() < until && treeLines(one.name, t0).length === 0) await sleep(250);
        }
        const signals = signalsFor(one.name, t0);
        const readFailed = treeLines(one.name, t0).some((r) => r.msg.includes('could not be read'));
        const probeEnded = alive.length > 0 ? await endOwn(alive) : null;
        const slowest = Object.values(exits).length > 0 ? Math.max(...Object.values(exits)) : null;
        return {
          endOk: rt?.ok === true,
          endErr: rt?.err ?? null,
          endRtMs: round(rt?.ms ?? null),
          exits,
          slowestExitMs: slowest,
          survivors: alive.map(pub),
          signals,
          readFailed,
          probeEnded,
          t0
        };
      }
      /** One census row: ready, read, End, watch. */
      async function measure(label, one, meta, minLines = 2) {
        const ready = await waitReady(one, minLines);
        const tree = treeRead(one);
        // A stated exception (KNOWN_START_REFUSALS): whether the agent's own
        // refusal is on its DEAD pane, read before End. A yes or no only;
        // the screen is never recorded.
        const stated = KNOWN_START_REFUSALS[label];
        const statedRefusalSeen =
          stated === undefined ? undefined : tree.length === 0 && panesOf(one).some((p) => p.dead) && stated.words.test(screenOf(one, true));
        const w = await endAndWatch(one, tree);
        const row = { label, ...meta, screenMs: ready.screenMs, lines: ready.lines, tree: tree.map(pub), ...(statedRefusalSeen === undefined ? {} : { statedRefusalSeen }), ...w };
        delete row.t0;
        B.rows[label] = row;
        say(
          `${build} ${label}: ${String(tree.length)} process(es) [${tree.map((e) => `${e.bin}${e.hangup ? '' : '*'}`).join(' ')}], ` +
            `slowest exit ${String(row.slowestExitMs)} ms, ${String(row.survivors.length)} survivor(s), ${String(row.signals.length)} signal(s), End ${String(row.endRtMs)} ms`
        );
        return row;
      }
      /** A restore through the bridge, its armed line cleared, and `typed` entered line by line. */
      async function restoreAndType(one, typed) {
        const r = await cdpEval(
          cdp,
          `window.gmux.sessions.restore(${J(one.id)}).then((s) => ({ ok: true, tmuxName: s.tmuxName, status: s.status })).catch((e) => ({ ok: false, err: String(e && e.message || e) }))`,
          120_000
        );
        if (r?.ok !== true) throw new Unreadable(`${one.name}: the restore was refused: ${String(r?.err)}`);
        one.tmuxName = r.tmuxName;
        for (let i = 0; i < 60 && panesOf(one).length === 0; i += 1) await sleep(200);
        await waitShell(one);
        // The armed resume is abandoned, never entered.
        key(one, 'C-c');
        await sleep(700);
        for (const line of typed) {
          type(one, line);
          await sleep(1_200);
        }
      }
      /** A planted row: the droid row, its stand-in's hello proving the pane is the stand-in. */
      const hellos = () => {
        if (!existsSync(STANDIN_DIR)) return [];
        const out = [];
        for (const n of readdirSync(STANDIN_DIR)) {
          if (!/^hello-\d+\.json$/.test(n)) continue;
          try {
            out.push(JSON.parse(readFileSync(join(STANDIN_DIR, n), 'utf8')));
          } catch {
            /* being written */
          }
        }
        return out;
      };
      async function planted(name, mode) {
        const before = new Set(hellos().map((h) => h.pid));
        const one = await create({ name, agent: 'droid', folder: join(work, name), extraArgs: [mode] });
        let hello;
        for (let i = 0; i < 75 && hello === undefined; i += 1) {
          hello = hellos().find((h) => !before.has(h.pid) && h.mode === mode);
          if (hello === undefined) await sleep(200);
        }
        const pane = panesOf(one)[0];
        if (hello === undefined || pane === undefined || pane.pid !== hello.pid) {
          if (pane !== undefined) treeRead(one);
          await endViaBridge(one);
          throw new Unreadable(`${name}: the droid pane did not say hello as the stand-in (${mode}); it was ended at once`);
        }
        one.planted = mode;
        return one;
      }

      // ---- the world, arm i ------------------------------------------------------
      let stranger = [];
      const appServer = () => {
        const r = tm(['list-sessions', '-F', '#{pid}']);
        const pid = Number((r.stdout ?? '').trim().split('\n')[0]);
        if (!Number.isInteger(pid) || pid <= 1) return null;
        const row = psRead([pid]).get(pid);
        return row === undefined ? null : { pid, lstart: row.lstart };
      };
      const worldNow = (appGone = false) => ({
        installs: installsNow(),
        codex: codexServerNow(),
        appServer: appServer(),
        electronMain: appGone
          ? null
          : (() => {
              try {
                return handle.appPid();
              } catch {
                return 0;
              }
            })(),
        stranger: (() => {
          const now = psRead(stranger.map((e) => e.pid));
          return stranger.map((e) => ({ pid: e.pid, same: sameProc(now.get(e.pid), e) }));
        })()
      });
      /** The build's own baseline, read once the keeper holds the server up. */
      let base = null;
      let lastCodex = report.world.codexAtStart;
      function checkWorld(label, appGone = false) {
        const now = worldNow(appGone);
        const moved = Object.keys(report.world.installsAtStart).filter((k) => report.world.installsAtStart[k] !== now.installs[k]);
        if (moved.length > 0) {
          report.world.installsMoved = { at: `${build} ${label}`, keys: moved, now: now.installs };
          throw new Stop(`an install MOVED (${moved.join(', ')}) at ${build} ${label}; the run stops`);
        }
        // His own work can move his Codex server; each change is recorded once, where it was first seen.
        if (J(now.codex) !== J(lastCodex)) {
          B.world.moves.push({ at: label, what: 'his Codex server', was: lastCodex, now: now.codex });
          lastCodex = now.codex;
        }
        if (!appGone && J(now.appServer) !== J(base.appServer)) B.world.moves.push({ at: label, what: 'the app’s tmux server', was: base.appServer, now: now.appServer });
        if (!appGone && now.electronMain !== base.electronMain) B.world.moves.push({ at: label, what: 'the Electron main pid', was: base.electronMain, now: now.electronMain });
        const lostStranger = now.stranger.filter((s) => !s.same);
        if (lostStranger.length > 0 && B.arms.a?.lostAt === undefined) {
          B.arms.a = { ...(B.arms.a ?? {}), lostAt: label, lost: lostStranger.map((s) => s.pid) };
        }
      }

      /** One arm: the world before and after, an unreadable precondition caught and named. */
      async function runArm(id, fn) {
        if (!armsHere.has(id)) return;
        checkWorld(`before ${id}`);
        const t0 = Date.now();
        try {
          await fn();
        } catch (err) {
          if (err instanceof Stop) throw err;
          B.arms[id] = { ...(B.arms[id] ?? {}), unreadable: err instanceof Unreadable ? err.message : `it threw: ${String(err?.message ?? err)}` };
          say(`${build} ${id}: ${B.arms[id].unreadable}`);
        } finally {
          // Anything this arm left running under a live pane is ended through
          // the product, then anything left over by the probe's own hand.
          // After f the app has quit, and its bridge is gone with it.
          const live =
            id === 'f'
              ? []
              : (await listMain().catch(() => [])).filter((s) => s.name !== 'keeper' && ['running', 'idle', 'needs_input', 'unknown'].includes(s.status));
          for (const s of live) {
            treeRead({ tmuxName: s.tmuxName, name: s.name });
            await endViaBridge({ id: s.id }).catch(() => undefined);
          }
          if (live.length > 0) await sleep(WATCH_MS);
          const left = stillRecorded(build).filter((e) => !stranger.some((s) => s.pid === e.pid));
          if (left.length > 0) {
            B.arms[id] = { ...(B.arms[id] ?? {}), leftAfterArm: left.length };
            await endOwn(left);
          }
          B.arms[id] = { ...(B.arms[id] ?? {}), ms: Date.now() - t0 };
          checkWorld(`after ${id}`, id === 'f');
        }
      }

      // ---- the keeper and the read costs -----------------------------------------
      const keeper = await create({ name: 'keeper', agent: 'shell', folder: join(work, 'keeper') });
      await waitShell(keeper);
      base = worldNow();
      B.world.base = { codex: base.codex, appServer: base.appServer, electronMain: appPid };
      if (base.appServer === null) throw new Stop(`${build}: the app's tmux server could not be read on -L ${socket}`);
      const psMs = [];
      const paneMs = [];
      const ttyMs = [];
      const keeperTty = (tm(['list-panes', '-s', '-t', keeper.tmuxName, '-F', '#{pane_tty}']).stdout ?? '').trim().split('\n')[0] ?? '';
      for (let i = 0; i < 7; i += 1) {
        let t = process.hrtime.bigint();
        spawnSync('/bin/ps', ['-ww', '-axo', PS_FIELDS], { env: C_ENV, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
        psMs.push(Number(process.hrtime.bigint() - t) / 1e6);
        t = process.hrtime.bigint();
        tm(['list-panes', '-s', '-t', keeper.tmuxName, '-F', '#{pane_pid} #{pane_dead} #{pid} #{pane_tty}']);
        paneMs.push(Number(process.hrtime.bigint() - t) / 1e6);
        if (keeperTty.startsWith('/dev/tty')) {
          t = process.hrtime.bigint();
          spawnSync('/bin/ps', ['-ww', '-o', PS_FIELDS, '-t', keeperTty], { env: C_ENV, encoding: 'utf8' });
          ttyMs.push(Number(process.hrtime.bigint() - t) / 1e6);
        }
      }
      B.measures = { psWideMs: round(median(psMs)), paneReadMs: round(median(paneMs)), psTerminalMs: round(median(ttyMs)) };
      say(
        `${build}: the wide read ${String(B.measures.psWideMs)} ms, the terminal read ${String(B.measures.psTerminalMs)} ms, ` +
          `the pane read ${String(B.measures.paneReadMs)} ms (medians of 7)`
      );

      // ---- a: the stranger, in the probe's own second scratch server ---------------
      const geminiFolder = join(work, 'c1-gemini');
      if (armsHere.has('a') && real['gemini'] !== null && RUN_AGENTS.includes('gemini')) {
        mkdirSync(geminiFolder, { recursive: true });
        const env = envForSpawn({});
        const made = tx(['-f', CONF, 'new-session', '-d', '-s', 'stranger', '-x', '200', '-y', '50', '-c', geminiFolder, '--', join(BIN, 'gemini')], env);
        if (made.status !== 0) {
          B.arms.a = { unreadable: `the stranger's server would not start: ${(made.stderr ?? '').trim()}` };
        } else {
          await sleep(8_000);
          const panes = (tx(['list-panes', '-a', '-F', '#{pane_pid}']).stdout ?? '').split('\n').map(Number).filter((n) => n > 1);
          const table = psRead();
          const kids = new Map();
          for (const row of table.values()) {
            if (!kids.has(row.ppid)) kids.set(row.ppid, []);
            kids.get(row.ppid).push(row.pid);
          }
          const entries = [];
          const stack = [...panes];
          while (stack.length > 0) {
            const pid = stack.pop();
            const row = table.get(pid);
            if (row === undefined || entries.some((e) => e.pid === pid)) continue;
            entries.push({ ...row, bin: binOf(row.command) });
            for (const k of kids.get(pid) ?? []) stack.push(k);
          }
          note(entries, build, 'stranger');
          stranger = entries;
          B.arms.a = { stranger: entries.map((e) => ({ pid: e.pid, bin: e.bin, pgid: e.pgid })) };
          if (entries.length === 0) B.arms.a.unreadable = 'the stranger ran nothing under its pane';
        }
      }

      // ---- C1: the census under the scratch home -----------------------------------
      await runArm('C1', async () => {
        for (const id of RUN_AGENTS) {
          const r = real[id];
          if (r === null) {
            B.rows[`c1-c-${id}`] = { label: `c1-c-${id}`, agent: id, notLaunched: 'not installed' };
            continue;
          }
          const folder = join(work, `c1-${id}`);
          try {
            const one = await create({ name: `c1-${id}`, agent: id, folder });
            await measure(`c1-c-${id}`, one, { agent: id, shape: 'created', home: 'scratch' });
            try {
              await restoreAndType(one, [r.bin]);
              await measure(`c1-r-${id}`, one, { agent: id, shape: 'restored', home: 'scratch' }, 1);
            } catch (err) {
              if (err instanceof Stop) throw err;
              B.rows[`c1-r-${id}`] = { label: `c1-r-${id}`, agent: id, unreadable: String(err?.message ?? err) };
            }
          } catch (err) {
            if (err instanceof Stop) throw err;
            B.rows[`c1-c-${id}`] = { label: `c1-c-${id}`, agent: id, unreadable: String(err?.message ?? err) };
          }
          if (AGENT_ROWS[id].provider) {
            try {
              const w = await create({ name: `c1-w-${id}`, agent: id, folder: join(work, `c1-w-${id}`), capture: true });
              const root = treeRead(w).find((e) => e.root);
              if (root === undefined || !/specstory/.test(root.command.split(' ')[0] ?? '')) {
                await endViaBridge(w);
                throw new Unreadable(`the wrap was declined: the pane runs ${root?.bin ?? 'nothing'}, not specstory`);
              }
              await measure(`c1-w-${id}`, w, { agent: id, shape: 'wrapped', home: 'scratch' });
            } catch (err) {
              if (err instanceof Stop) throw err;
              B.rows[`c1-w-${id}`] = { label: `c1-w-${id}`, agent: id, unreadable: String(err?.message ?? err) };
            }
          }
        }
      });

      // ---- C2: his home, created only ------------------------------------------------
      await runArm('C2', async () => {
        for (const id of RUN_AGENTS) {
          if (id === 'gemini') continue;
          const label = `c2-${id}`;
          if (!HIS_HOME_OK) {
            B.rows[label] = { label, agent: id, unreadable: 'this probe is not running under a login home' };
            continue;
          }
          if (real[id] === null) {
            B.rows[label] = { label, agent: id, notLaunched: 'not installed' };
            continue;
          }
          // A Codex session under his home finds his shared server or STARTS
          // one as its own setsid child (SPEC §2.1). Only the first is his
          // world as it already is, so the row runs only while his is up.
          if (id === 'codex' && report.world.codexAtStart.length === 0) {
            B.rows[label] = { label, agent: id, notLaunched: 'his Codex shared server is not running, and a Codex session under his home would start one' };
            continue;
          }
          try {
            const one = await create({ name: label, agent: id, folder: join(his, label) });
            await measure(label, one, { agent: id, shape: 'created', home: 'his' });
          } catch (err) {
            if (err instanceof Stop) throw err;
            B.rows[label] = { label, agent: id, unreadable: String(err?.message ?? err) };
          }
        }
      });

      // ---- R: Restart a created Gemini row -------------------------------------------
      await runArm('R', async () => {
        if (real['gemini'] === null || !RUN_AGENTS.includes('gemini')) throw new Unreadable('Gemini is not in this run');
        const one = await create({ name: 'r-gemini', agent: 'gemini', folder: join(work, 'r-gemini') });
        const ready = await waitReady(one);
        const old = treeRead(one);
        if (old.length === 0) throw new Unreadable('the Gemini row ran nothing to restart');
        const t0 = Date.now();
        const r = await cdpEval(
          cdp,
          `window.gmux.sessions.restart(${J(one.id)}).then((s) => ({ ok: true, id: s.id, name: s.name, tmuxName: s.tmuxName })).catch((e) => ({ ok: false, err: String(e && e.message || e) }))`,
          120_000
        );
        const restartRtMs = Date.now() - t0;
        if (r?.ok !== true) throw new Unreadable(`the restart was refused: ${String(r?.err)}`);
        const fresh = { id: r.id, name: r.name, tmuxName: r.tmuxName, agent: 'gemini' };
        // The new session's tree, read as soon as it holds its launcher's child,
        // so the comparison below spans the old session's whole ending.
        let newTree = [];
        for (let i = 0; i < 30; i += 1) {
          newTree = treeRead(fresh);
          if (newTree.length >= 2) break;
          await sleep(100);
        }
        const readNewAt = Date.now() - t0;
        const { exits, alive } = await watch(old, t0);
        const now = psRead(newTree.map((e) => e.pid));
        const lost = newTree.filter((e) => !sameProc(now.get(e.pid), e));
        if (build === 'head') await awaitTreeLines(['r-gemini'], t0);
        const signals = signalsFor('r-gemini', t0);
        B.arms.R = {
          screenMs: ready.screenMs,
          old: old.map(pub),
          restartRtMs,
          oldExits: exits,
          oldSurvivors: alive.map(pub),
          goneWithinGraces: alive.length === 0 && Object.values(exits).every((ms) => ms <= GRACES_MS),
          newTree: newTree.map(pub),
          newReadAtMs: readNewAt,
          newLost: lost.map(pub),
          signals
        };
        if (alive.length > 0) B.arms.R.probeEnded = await endOwn(alive);
        await measure('r-new-gemini', fresh, { agent: 'gemini', shape: 'created (the restart’s replacement)', home: 'scratch' });
      });

      // ---- b: two sessions of each agent; End one --------------------------------------
      await runArm('b', async () => {
        B.arms.b = { agents: {} };
        for (const id of RUN_AGENTS) {
          if (real[id] === null) continue;
          try {
            const a = await create({ name: `b-${id}-a`, agent: id, folder: join(work, `b-${id}-a`) });
            const bb = await create({ name: `b-${id}-b`, agent: id, folder: join(work, `b-${id}-b`) });
            await waitReady(a);
            await waitReady(bb);
            const other = treeRead(bb);
            const s1 = screenOf(bb);
            await sleep(3_000);
            const s2 = screenOf(bb);
            const aTree = treeRead(a);
            const w = await endAndWatch(a, aTree);
            const now = psRead(other.map((e) => e.pid));
            const lost = other.filter((e) => !sameProc(now.get(e.pid), e));
            const s3 = screenOf(bb);
            B.arms.b.agents[id] = {
              ended: { tree: aTree.map(pub), survivors: w.survivors, signals: w.signals },
              other: other.map(pub),
              otherLost: lost.map(pub),
              screen: s1 !== s2 ? 'moves on its own' : s3 === s2 ? 'unchanged' : 'CHANGED'
            };
            await endAndWatch(bb, treeRead(bb));
          } catch (err) {
            if (err instanceof Stop) throw err;
            B.arms.b.agents[id] = { unreadable: String(err?.message ?? err) };
          }
        }
      });

      // ---- c: a plain shell (R2) ---------------------------------------------------------
      await runArm('c', async () => {
        const one = await create({ name: 'c-shell', agent: 'shell', folder: join(work, 'c-shell') });
        await waitShell(one);
        type(one, 'nohup /bin/sleep 610 >/dev/null 2>&1 &');
        await sleep(900);
        // `; true` makes the subshell FORK perl: without it zsh execs perl as
        // the background job's group leader, whose setsid() fails, so it
        // stayed on the terminal and ended on the hang-up at BOTH builds (the
        // reverify's arm c; the spec step's census wrote it this way).
        type(one, `( /usr/bin/perl -MPOSIX=setsid -e 'setsid() or die; exec "/bin/sleep", "611"'; true ) &`);
        await sleep(900);
        type(one, `sh -c "trap '' HUP; exec /bin/sleep 612"`);
        await sleep(2_000);
        const tree = treeRead(one);
        const want = ['/bin/sleep 610', '/bin/sleep 611', '/bin/sleep 612'];
        const found = want.map((c) => tree.find((e) => e.command === c) ?? null);
        if (found.some((e) => e === null)) {
          throw new Unreadable(`the shell did not hold all three (${want.filter((_, i) => found[i] === null).join(', ')} missing from its tree)`);
        }
        const w = await endAndWatch(one, tree);
        B.arms.c = {
          tree: tree.map(pub),
          held: found.map((e) => ({ pid: e.pid, pgid: e.pgid, hangup: e.hangup })),
          survived: found.map((e) => w.survivors.some((s) => s.pid === e.pid)),
          signals: w.signals,
          treeLines: treeLines('c-shell', w.t0).length,
          logReadable: logReadable()
        };
      });

      // ---- d1 and d2: restored claude rows -----------------------------------------------
      const restoredClaude = async (name) => {
        if (real['claude'] === null || !RUN_AGENTS.includes('claude')) throw new Unreadable('Claude Code is not in this run');
        const one = await create({ name, agent: 'claude', folder: join(work, name) });
        await waitReady(one);
        await endAndWatch(one, treeRead(one));
        return one;
      };
      await runArm('d1', async () => {
        const one = await restoredClaude('d1-claude');
        await restoreAndType(one, ['nohup /bin/sleep 614 >/dev/null 2>&1 &', real['claude'].bin]);
        await waitReady(one, 1);
        const tree = treeRead(one);
        const job = tree.find((e) => e.command === '/bin/sleep 614');
        if (job === undefined) throw new Unreadable('the nohup job is not in the restored session’s tree');
        const w = await endAndWatch(one, tree);
        B.arms.d1 = { tree: tree.map(pub), job: pub(job), survived: w.survivors.some((s) => s.pid === job.pid), signals: w.signals };
      });
      await runArm('d2', async () => {
        const one = await restoredClaude('d2-claude');
        await restoreAndType(one, [`nohup sh -c "trap '' HUP; exec /bin/sleep 615"`]);
        await sleep(1_500);
        const tree = treeRead(one);
        const job = tree.find((e) => e.command === '/bin/sleep 615');
        if (job === undefined) throw new Unreadable('the foreground nohup is not in the restored session’s tree');
        const w = await endAndWatch(one, tree);
        B.arms.d2 = {
          tree: tree.map(pub),
          job: pub(job),
          survived: w.survivors.some((s) => s.pid === job.pid),
          signal: w.signals.find((s) => s.pid === job.pid)?.signal ?? null
        };
      });

      // ---- e: ONE real Claude Code turn, his home, End while the tool runs -----------------
      await runArm('e', async () => {
        if (!HIS_HOME_OK) throw new Unreadable('this probe is not running under a login home, so Claude Code has no sign-in');
        if (real['claude'] === null || !RUN_AGENTS.includes('claude')) throw new Unreadable('Claude Code is not in this run');
        const TOOL = "perl -e 'select(undef,undef,undef,90)'";
        const one = await create({ name: 'e-claude', agent: 'claude', folder: join(his, 'e-claude'), extraArgs: ['--allowedTools', 'Bash(perl:*)'] });
        await waitReady(one);
        // The folder is new, so Claude Code asks whether to trust it. The probe
        // moves to the "Yes" option and presses Enter only once it reads that
        // option focused, because a bare Enter on "No, exit" ends the session.
        const focused = (s) => s.split('\n').find((l) => /^\s*[❯>]\s/.test(l)) ?? '';
        for (let i = 0; i < 8; i += 1) {
          const s = screenOf(one);
          if (!/trust/i.test(s)) break;
          if (/yes/i.test(focused(s))) {
            key(one, 'Enter');
            await sleep(2_500);
            break;
          }
          key(one, i < 4 ? 'Up' : 'Down');
          await sleep(400);
        }
        await waitReady(one);
        type(one, `Use the Bash tool to run exactly this command and nothing else, then stop: ${TOOL}`);
        report.turns += 1;
        const t0 = Date.now();
        let tool;
        let answered = 0;
        while (Date.now() - t0 < 150_000 && tool === undefined) {
          await sleep(1_000);
          tool = treeRead(one).find((e) => e.command.includes('select(undef,undef,undef,90)') && e.bin === 'perl');
          const s = screenOf(one);
          if (tool === undefined && answered < 3 && /Do you want to proceed/i.test(s) && /yes/i.test(focused(s))) {
            key(one, 'Enter');
            answered += 1;
          }
        }
        if (tool === undefined) throw new Unreadable('the turn never ran the perl tool in 150 s');
        const tree = treeRead(one);
        const agentRoot = tree.find((e) => e.root);
        const w = await endAndWatch(one, tree);
        B.arms.e = {
          tree: tree.map(pub),
          tool: { ...pub(tool), inAgentGroup: agentRoot !== undefined && tool.pgid === agentRoot.pgid, ownGroup: tool.pgid === tool.pid },
          survived: w.survivors.some((s) => s.pid === tool.pid),
          exitMs: w.exits[tool.pid] ?? null,
          signal: w.signals.find((s) => s.pid === tool.pid)?.signal ?? null,
          permissionAnswers: answered
        };
      });

      // ---- k: a shared server and its client ------------------------------------------------
      await runArm('k', async () => {
        const server = await planted('k-server', 'shared-server');
        await waitReady(server, 1);
        const client = await planted('k-client', 'shared-client');
        await waitReady(client, 1);
        const readState = (f) => {
          try {
            return readFileSync(join(STANDIN_DIR, f), 'utf8').trim();
          } catch {
            return null;
          }
        };
        const sTree = treeRead(server);
        const daemon = sTree.find((e) => e.command.includes('-MIO::Select'));
        if (daemon === undefined) throw new Unreadable('the shared server is not in the server row’s tree');
        if (!/^\d+$/.test(readState('shared-client.state') ?? '')) throw new Unreadable('the client never received a byte from the server');
        // The reverify's arm k: `endAndWatch` ends every survivor by the
        // probe's own hand before it returns, the server included, so reading
        // the server after it read the probe's own ending as the product's.
        // The End and the watch are done here, the server and the client are
        // read, and only then does the probe end anything.
        const t0 = Date.now();
        await endViaBridge(server);
        const { alive } = await watch(sTree, t0);
        const now = psRead([daemon.pid]).get(daemon.pid);
        const clientSaid = readState('shared-client.state');
        const fresh = /^\d+$/.test(clientSaid ?? '') && Date.now() / 1000 - Number(clientSaid) <= 3;
        B.arms.k = {
          serverTree: sTree.map(pub),
          daemon: pub(daemon),
          daemonSame: sameProc(now, daemon),
          clientConnected: fresh,
          serverConnections: readState('shared-server.state'),
          signals: signalsFor(server.name, t0),
          watchedMs: Date.now() - t0
        };
        if (alive.length > 0) await endOwn(alive);
        await endAndWatch(client, treeRead(client));
        await endOwn([daemon]);
      });

      // ---- l: the planted modes --------------------------------------------------------------
      await runArm('l', async () => {
        B.arms.l = { modes: {} };
        for (const mode of ['ignore-hup', 'fg-child-ignore-hup', 'ignore-hup-and-term', 'setsid-child', 'app-bundle']) {
          try {
            const one = await planted(`l-${mode}`, mode);
            const row = await measure(`l-${mode}`, one, { agent: 'droid', planted: mode, shape: 'planted', home: 'scratch' }, 1);
            const sleeps = row.tree.filter((e) => e.bin === 'sleep' || e.bin === 'fake');
            B.arms.l.modes[mode] = {
              held: sleeps.map((e) => ({ pid: e.pid, bin: e.bin, hangup: e.hangup, app: e.app })),
              signals: row.signals,
              survivors: row.survivors.map((s) => s.pid)
            };
          } catch (err) {
            if (err instanceof Stop) throw err;
            B.arms.l.modes[mode] = { unreadable: String(err?.message ?? err) };
          }
        }
      });

      // ---- g: a window another session still shows (the second fix round, S10) ---------------
      await runArm('g', async () => {
        B.arms.g = { shapes: {} };
        for (const shape of ['grouped', 'linked']) {
          const one = await planted(`g-${shape}`, 'ignore-hup');
          await waitReady(one, 1);
          const tree = treeRead(one);
          const root = tree.find((e) => e.root);
          if (root === undefined) throw new Unreadable(`g-${shape}: the planted pane ran nothing`);
          const other = `p323-g-${shape}-other`;
          let made;
          if (shape === 'grouped') {
            made = tm(['new-session', '-d', '-t', `=${one.tmuxName}`, '-s', other]);
          } else {
            const win = (tm(['list-windows', '-t', `=${one.tmuxName}`, '-F', '#{window_id}']).stdout ?? '').trim().split('\n')[0] ?? '';
            made = tm(['new-session', '-d', '-s', other, '/bin/sleep 3709']);
            made = made.status === 0 && /^@\d+$/.test(win) ? tm(['link-window', '-s', win, '-t', `=${other}:`]) : { status: 1, stderr: `no window id to link (${win})` };
          }
          if (made.status !== 0) {
            tm(['kill-session', '-t', `=${other}`]);
            await endViaBridge(one);
            throw new Unreadable(`g-${shape}: tmux would not ${shape === 'grouped' ? 'group the session' : 'link its window'}: ${String(made.stderr ?? '').trim()}`);
          }
          const t0 = Date.now();
          await endViaBridge(one);
          // Past the first wait, where a wrong SIGTERM would land.
          const { alive } = await watch(tree, t0, SETTLE_MS);
          const panes = (tm(['list-panes', '-a', '-F', '#{pane_pid} #{pane_dead}']).stdout ?? '').split('\n');
          B.arms.g.shapes[shape] = {
            tree: tree.map(pub),
            root: pub(root),
            rootRan: alive.some((e) => e.pid === root.pid),
            paneShown: panes.includes(`${String(root.pid)} 0`),
            signals: signalsFor(one.name, t0),
            watchedMs: Date.now() - t0
          };
          // The probe's own hand ends what it made: the other session, then
          // what is left of the tree (runArm's finally ends any remainder).
          tm(['kill-session', '-t', `=${other}`]);
          await sleep(300);
          const left = stillRecorded(build).filter((e) => tree.some((t) => t.pid === e.pid));
          if (left.length > 0) await endOwn(left);
        }
      });

      // ---- h: the session manager's batch End of eight Gemini rows ---------------------------
      // The second fix round (Lens 2): ONE sample per build, always parent
      // first, graded against an allowance ten times smaller than the
      // run-to-run spread, read -347 ms in one run and +58 ms in the next. So
      // the batch End is timed H_REPEATS times per build, each repeat's
      // endings watched out before the next starts (so HEAD's continuations
      // never run beside the next batch), and graded by the median against the
      // spread measured here (see grade).
      await runArm('h', async () => {
        if (real['gemini'] === null || !RUN_AGENTS.includes('gemini')) throw new Unreadable('Gemini is not in this run');
        const folder = join(work, 'h');
        mkdirSync(folder, { recursive: true });
        await cdpEval(cdp, `window.__p293.addProject(${J(folder)})`, 30_000);
        const drawn = async () => JSON.parse(await cdpEval(cdp, 'window.__p293.state().then((s) => JSON.stringify({ rows: s.rows.map((r) => ({ id: r.id, checked: r.checked })), batch: s.batch }))', 30_000));
        const click = async (selector) => {
          const box = await cdpEval(
            cdp,
            `(() => { const el = document.querySelector(${J(selector)}); if (!el) return null; el.scrollIntoView({ block: 'nearest' }); const b = el.getBoundingClientRect(); return b.width > 0 && b.height > 0 ? { x: b.left + b.width / 2, y: b.top + b.height / 2, disabled: el.disabled === true } : null; })()`,
            10_000
          );
          if (box === null || box.disabled) return false;
          const m = (t, extra) => cdp.call('Input.dispatchMouseEvent', { type: t, x: Math.round(box.x), y: Math.round(box.y), ...extra });
          await m('mouseMoved', { button: 'none', buttons: 0 });
          await m('mousePressed', { button: 'left', buttons: 1, clickCount: 1 });
          await m('mouseReleased', { button: 'left', buttons: 0, clickCount: 1 });
          await sleep(200);
          return true;
        };
        const esc = { key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 };
        const samples = [];
        for (let rep = 1; rep <= H_REPEATS; rep += 1) {
          const rows = [];
          for (let i = 1; i <= 8; i += 1) rows.push(await create({ name: `h${String(rep)}-gemini-${String(i)}`, agent: 'gemini', folder }));
          for (const one of rows) await waitReady(one);
          const trees = rows.map((one) => treeRead(one));
          await cdpEval(cdp, "window.__p293.open('managed')", 30_000);
          let st = await drawn();
          for (let i = 0; i < 30 && !rows.every((one) => st.rows.some((r) => r.id === one.id)); i += 1) {
            await sleep(300);
            st = await drawn();
          }
          if (!rows.every((one) => st.rows.some((r) => r.id === one.id))) throw new Unreadable(`repeat ${String(rep)}: the session manager did not draw all eight rows`);
          for (const one of rows) {
            if (!(await click(`[data-manage-check="${one.id}"]`))) throw new Unreadable(`repeat ${String(rep)}: the check box of ${one.name} is not drawn`);
          }
          if (!(await click('[data-sm="end-selected"]'))) throw new Unreadable(`repeat ${String(rep)}: End selected is not drawn`);
          for (let i = 0; i < 20 && (st = await drawn()).batch === null; i += 1) await sleep(200);
          const t0 = Date.now();
          if (!(await click('[data-sm="batch-confirm"]'))) throw new Unreadable(`repeat ${String(rep)}: the batch confirmation is not drawn`);
          let done = false;
          while (!done && Date.now() - t0 < 60_000) {
            const now = await listMain();
            done = rows.every((one) => ['exited', 'restorable'].includes(now.find((s) => s.id === one.id)?.status ?? 'exited'));
            if (!done) await sleep(50);
          }
          const batchMs = Date.now() - t0;
          if (!done) throw new Unreadable(`repeat ${String(rep)}: the batch did not end all eight rows in 60 s`);
          await cdp.call('Input.dispatchKeyEvent', { type: 'rawKeyDown', ...esc });
          await cdp.call('Input.dispatchKeyEvent', { type: 'keyUp', ...esc });
          const all = trees.flat();
          const { alive } = await watch(all, t0);
          if (build === 'head') await awaitTreeLines(rows.map((one) => one.name), t0);
          const signals = rows.flatMap((one) => signalsFor(one.name, t0));
          samples.push({ batchMs, processes: all.length, survivors: alive.map(pub), signals: signals.length });
          say(`${build} h repeat ${String(rep)}: batch End ${String(batchMs)} ms, ${String(alive.length)} of ${String(all.length)} left, ${String(signals.length)} signal(s)`);
          if (alive.length > 0) await endOwn(alive);
        }
        B.arms.h = {
          samples,
          batchMs: median(samples.map((x) => x.batchMs)),
          survivors: samples.flatMap((x) => x.survivors),
          signals: samples.reduce((n, x) => n + x.signals, 0)
        };
      });

      // ---- rt: arm (C)'s End round trip, one block of the run's ABBA order --------------------
      // Planted rows that end on the hang-up, as every agent the census
      // measured except Gemini does, so nothing is left for an ending to
      // wait on and the next End is timed on a quiet app.
      await runArm('rt', async () => {
        const samples = [];
        let refused = 0;
        let left = 0;
        for (let i = 1; i <= RT_ROWS; i += 1) {
          const one = await planted(`rt-${String(i)}`, 'plain');
          await sleep(RT_SETTLE_MS);
          const tree = treeRead(one);
          const t0 = Date.now();
          const rt = await endViaBridge(one);
          if (rt?.ok !== true) {
            refused += 1;
            continue;
          }
          samples.push(round(rt.ms));
          const { alive } = await watch(tree, t0, RT_WATCH_MS);
          left += alive.length;
          if (alive.length > 0) await endOwn(alive);
          await sleep(RT_SPACING_MS);
        }
        B.arms.rt = { samples, median: median(samples), refused, left };
        say(`${B.launch} rt: ${String(samples.length)} End(s) timed, median ${String(round(median(samples)))} ms, ${String(refused)} refused, ${String(left)} planted process(es) left after the hang-up`);
      });

      // ---- f: End then quit at once. LAST, because it quits the app. --------------------------
      await runArm('f', async () => {
        if (mainCdp === null) throw new Unreadable('the main process inspector never appeared, so the quit cannot be driven');
        const rows = [];
        if (real['gemini'] !== null && RUN_AGENTS.includes('gemini')) rows.push(await create({ name: 'f-gemini', agent: 'gemini', folder: join(work, 'f-gemini') }));
        rows.push(await planted('f-planted', 'ignore-hup-and-term'));
        for (const one of rows) await waitReady(one, 1);
        const trees = rows.map((one) => treeRead(one));
        const t0 = Date.now();
        const rts = await Promise.all(rows.map((one) => endViaBridge(one)));
        // The quit is SCHEDULED, not run inside the inspector call (the round
        // after his ruling). The first reverify found a Node process with an
        // inspector session attached waiting for it before it exits; the
        // second fix round detached the session after the call returned, and
        // the second reverify then read the parent's quit at 36,647 ms, at
        // least 6.6 s of it inside the call itself. Now the call only arms a
        // timer and returns at once, the session is closed before the timer
        // fires, and the clock starts when the call has returned, so no
        // inspector state is inside the measured quit at either build.
        const QUIT = `(() => { const load = typeof require === 'function' ? require : process.mainModule.require.bind(process.mainModule); const app = load('electron').app; setTimeout(() => app.quit(), ${String(QUIT_DELAY_MS)}); return 'scheduled'; })()`;
        const tAsk = Date.now();
        const asked = await mainCdp
          .call('Runtime.evaluate', { expression: QUIT, includeCommandLineAPI: true, returnByValue: true }, 10_000)
          .catch((err) => ({ failed: String(err?.message ?? err) }));
        const tQuit = Date.now();
        try {
          mainCdp.close();
        } catch {
          /* already gone with the app */
        }
        if (asked?.result?.result?.value !== 'scheduled') {
          throw new Unreadable(`the quit could not be scheduled through the main process inspector (${J(asked?.failed ?? asked?.result?.exceptionDetails?.text ?? asked?.result?.result ?? null).slice(0, 160)})`);
        }
        const exited = await Promise.race([handle.exited.then(() => true), sleep(QUIT_WAIT_MS).then(() => false)]);
        const quitMs = Date.now() - tQuit;
        await sleep(200);
        const all = trees.flat();
        const now = psRead(all.map((e) => e.pid));
        const left = all.filter((e) => sameProc(now.get(e.pid), e));
        B.quit = { exited, quitMs: exited ? quitMs : null, scheduleMs: tQuit - tAsk, endRtMs: rts.map((r) => round(r?.ms ?? null)), processes: all.length, survivors: left.map(pub), sinceEndMs: Date.now() - t0 };
        B.arms.f = { ...B.quit, signals: rows.flatMap((one) => signalsFor(one.name, t0)) };
        if (left.length > 0) B.arms.f.probeEnded = await endOwn(left);
      });

      // The fix round: every line, on any row or arm, that says a read gave
      // up. A row grades its own; this counts the rest (a batch End, a
      // planted row, the restart's new session), because one such line is an
      // ending that ended nothing.
      B.readFailures = logRecords()
        .filter((r) => typeof r.msg === 'string' && r.msg.includes('could not be read'))
        .map((r) => String(r.msg).slice(0, 160));

      try {
        cdp.close();
        mainCdp?.close();
      } catch {
        /* the app has quit under them */
      }
    }
  );

  // Everything this build recorded, ended by the probe's own hand before the
  // next build starts, then both of its scratch servers and their socket files.
  const left = stillRecorded(build);
  B.leftAfterBuild = left.length;
  if (left.length > 0) B.endedAfterBuild = await endOwn(left);
  killServer(tmux, xsocket);
  killServer(tmux, socket);
  return B;
}

// ---------------------------------------------------------------------------
// Grading: HEAD against the parent, row by row (SPEC §8.1, §9)
// ---------------------------------------------------------------------------

/** P323_PRIOR_REPORT: this probe's JSON from a run in the OTHER build order, or null. */
function priorReport() {
  const f = (process.env['P323_PRIOR_REPORT'] ?? '').trim();
  if (f === '') return null;
  try {
    const r = JSON.parse(readFileSync(f, 'utf8'));
    if (!Array.isArray(r.order) || r.order.join() === report.order.join()) {
      say(`P323_PRIOR_REPORT (${f}) is not a run in the other order, so it is not pooled`);
      return null;
    }
    return r;
  } catch (err) {
    say(`P323_PRIOR_REPORT (${f}) could not be read: ${String(err?.message ?? err)}`);
    return null;
  }
}

function grade(P, H, P2, H2) {
  // The fix round: the restart's replacement session (`r-new-gemini`) is
  // graded like a created C1 row. Its End leaked at HEAD in the verifier's
  // run and no verdict saw it.
  const labels = [...new Set([...Object.keys(P.rows), ...Object.keys(H.rows)])].filter((l) => /^(?:c[12]-|r-new-)/.test(l)).sort();
  const arm = (label) => (label.startsWith('c1') ? 'C1' : label.startsWith('c2') ? 'C2' : 'R');
  const rtPairs = [];
  for (const label of labels) {
    const p = P.rows[label];
    const h = H.rows[label];
    if (h?.notLaunched !== undefined) {
      verdict(`(${arm(label)}) ${label}`, 'reported', `${h.agent}: ${h.notLaunched}`);
      continue;
    }
    if (h === undefined || h.unreadable !== undefined || p === undefined || p.unreadable !== undefined) {
      verdict(`(${arm(label)}) ${label}`, null, `parent ${p?.unreadable ?? (p === undefined ? 'not read' : 'read')}; HEAD ${h?.unreadable ?? (h === undefined ? 'not read' : 'read')}`);
      continue;
    }
    // Nothing measured is not a pass (the fix round): an agent that had
    // already exited before the tree was read (SPEC §1.3 item 8). The one
    // way it is not UNREADABLE is a STATED exception whose own words were
    // on its dead pane at both builds (the tools round).
    if (p.tree.length === 0 || h.tree.length === 0) {
      const v = emptyRowVerdict(label, p, h);
      verdict(`(${arm(label)}) ${label}`, v.ok, v.said);
      continue;
    }
    const hup = h.survivors.filter((s) => s.hangup);
    const other = h.survivors.filter((s) => !s.hangup);
    const parentSurvived = p.survivors.length > 0;
    const offTarget = h.signals.filter((sig) => !h.tree.some((e) => e.pid === sig.pid && e.hangup && !e.app));
    const ok = hup.length === 0 && offTarget.length === 0 && (parentSurvived || h.signals.length === 0) && !h.readFailed;
    if (h.endOk && p.endOk) rtPairs.push({ label, parent: p.endRtMs, head: h.endRtMs });
    verdict(
      `(${arm(label)}) ${label}`,
      ok,
      `parent: ${String(p.tree.length)} process(es), slowest exit ${String(p.slowestExitMs)} ms, ${String(p.survivors.length)} survivor(s) [${p.survivors.map((s) => `${s.bin}${s.hangup ? '' : ' (own group)'}`).join(', ')}]; ` +
        `HEAD: ${String(h.signals.length)} signal(s) [${h.signals.map((s) => `${s.bin} ${s.signal}`).join(', ')}], ${String(hup.length)} hang-up-group survivor(s)` +
        (other.length > 0 ? `, ${String(other.length)} that left the terminal and run on, R1's held half (${other.map((s) => s.bin).join(', ')})` : '') +
        (offTarget.length > 0 ? `, ${String(offTarget.length)} SIGNALLED OUTSIDE THE HANG-UP'S GROUPS` : '') +
        (!parentSurvived && h.signals.length > 0 ? ', SIGNALS ON A ROW WHERE NOTHING SURVIVED AT THE PARENT' : '') +
        (h.readFailed ? ', the table could not be read' : '')
    );
  }
  // The fix round: End's read is the pane terminals', started beside the
  // capture, so the allowance is that read, not the wide one.
  const oneRead = (B) => (B?.measures?.psTerminalMs ?? 0) + (B?.measures?.paneReadMs ?? 0);
  // The census rows' round trips, timed in ONE build order: the warm second
  // build is favoured, and rows spread ±40 ms, so since the tools round they
  // are REPORTED and the grade is the ABBA block below.
  if (rtPairs.length > 0) {
    const diff = median(rtPairs.map((r) => r.head - r.parent));
    verdict(
      '(C) the End round trip over the census rows, one order',
      'reported',
      `median HEAD minus parent over ${String(rtPairs.length)} real-agent rows (order ${report.order.join(' then ')}) is ${String(round(diff))} ms, beside one tree read of ${String(round(oneRead(H)))} ms; graded by the ABBA block, not here`
    );
  }
  // (C), graded: the `rt` blocks in balanced ABBA order within this run
  // (the tools round). Both builds' two blocks must have been timed.
  if (ARMS.has('rt')) {
    const launches = {};
    for (const [name, B] of [['parent', P], ['head', H], ['parent2', P2], ['head2', H2]]) {
      if (B !== undefined) launches[name] = { samples: B.arms?.rt?.samples, unreadable: B.arms?.rt?.unreadable, oneReadMs: oneRead(B) };
    }
    const v = abbaVerdict(report.order, launches, RT_ROWS);
    const left = [P, H, P2, H2].reduce((n, B) => n + (B?.arms?.rt?.left ?? 0), 0);
    // REPORTED, not graded (his ruling of 2026-09-30, "Land it with 3 small
    // test fixes"): at 16 Ends a block the grade cannot resolve its own
    // allowance, and one load spike read +29.6 ms where the quiet pair read
    // +4.6 ms, so a correct build passed or failed by chance. The planted
    // processes that outlive their hang-up stay graded: that is correctness.
    verdict('(C) the End round trip, ABBA', 'reported', `${v.said}${v.ok === false ? ' (outside the allowance on this run)' : ''}`);
    verdict('(C) planted Ends leave nothing behind', v.ok === null ? null : left === 0, `${String(left)} planted process(es) outlived their hang-up`);
  }
  const prior = priorReport();

  // R
  if (ARMS.has('R')) {
    const p = P.arms.R;
    const h = H.arms.R;
    if (h === undefined || h.unreadable !== undefined || p === undefined || p.unreadable !== undefined) {
      verdict('(R) Restart a created Gemini row', null, `parent ${p?.unreadable ?? 'read'}; HEAD ${h?.unreadable ?? 'read'}`);
    } else {
      verdict(
        '(R) Restart a created Gemini row',
        h.goneWithinGraces && h.newLost.length === 0,
        `parent: ${String(p.oldSurvivors.length)} of the old session's ${String(p.old.length)} still running beside the new one; ` +
          `HEAD: the old ones ${h.goneWithinGraces ? `gone within ${String(GRACES_MS)} ms` : `NOT all gone within ${String(GRACES_MS)} ms (${String(h.oldSurvivors.length)} left)`}, ` +
          `${String(h.signals.length)} signal(s); the new session's ${String(h.newTree.length)} process(es) ${h.newLost.length === 0 ? 'unchanged by pid and start time' : `LOST ${String(h.newLost.length)}`}`
      );
    }
  }

  // a
  if (ARMS.has('a')) {
    const p = P.arms.a;
    const h = H.arms.a;
    if (h === undefined || h.unreadable !== undefined) verdict('(a) a stranger Gemini on another server', null, `HEAD ${h?.unreadable ?? 'not read'}`);
    else {
      verdict(
        '(a) a stranger Gemini on another server',
        h.lostAt === undefined,
        `parent: ${p?.lostAt === undefined ? 'kept its pids and start times through every End' : `lost at ${String(p.lostAt)}`}; ` +
          `HEAD: ${h.lostAt === undefined ? `its ${String(h.stranger.length)} process(es) kept their pids and start times through every End` : `LOST ${J(h.lost)} at ${String(h.lostAt)}`}`
      );
    }
  }

  // b
  if (ARMS.has('b')) {
    const agents = Object.keys(H.arms.b?.agents ?? {});
    if (H.arms.b === undefined || H.arms.b.unreadable !== undefined || agents.length === 0) verdict('(b) End one of two sessions of an agent', null, `HEAD ${H.arms.b?.unreadable ?? 'not read'}`);
    for (const id of agents) {
      const h = H.arms.b.agents[id];
      if (h.unreadable !== undefined) {
        verdict(`(b) ${id}: End one of two`, null, h.unreadable);
        continue;
      }
      verdict(
        `(b) ${id}: End one of two`,
        h.otherLost.length === 0 && h.screen !== 'CHANGED',
        `the other session's ${String(h.other.length)} process(es) ${h.otherLost.length === 0 ? 'unchanged by pid and start time' : `LOST ${h.otherLost.map((e) => e.bin).join(', ')}`}; its screen ${h.screen}` +
          ` (parent: ${P.arms.b?.agents?.[id]?.otherLost?.length === 0 ? 'unchanged' : 'see the record'})`
      );
    }
  }

  // c
  if (ARMS.has('c')) {
    const h = H.arms.c;
    const p = P.arms.c;
    if (h === undefined || h.unreadable !== undefined) verdict('(c) a plain shell (R2)', null, `HEAD ${h?.unreadable ?? 'not read'}`);
    else {
      verdict(
        '(c) a plain shell (R2)',
        h.survived.every(Boolean) && h.signals.length === 0 && h.treeLines === 0 && h.logReadable,
        `HEAD: the nohup job, the setsid job and the foreground process that ignores the hang-up ${h.survived.map((s) => (s ? 'survived' : 'ENDED')).join(', ')}; ` +
          `${String(h.treeLines)} tree line(s) for it in app.log${h.logReadable ? '' : ' (app.log COULD NOT BE READ)'}; parent: ${p?.survived?.map((s) => (s ? 'survived' : 'ended')).join(', ') ?? 'not read'}`
      );
    }
  }

  // d1, d2
  if (ARMS.has('d1')) {
    const h = H.arms.d1;
    if (h === undefined || h.unreadable !== undefined) verdict('(d1) a restored claude row with a nohup job', null, `HEAD ${h?.unreadable ?? 'not read'}`);
    else {
      verdict(
        '(d1) a restored claude row with a nohup job',
        h.survived && !h.signals.some((s) => s.pid === h.job.pid),
        `the nohup job (group ${String(h.job.pgid)}, ${h.job.hangup ? 'IN' : 'not in'} the hang-up's groups) ${h.survived ? 'survived' : 'was ENDED'} at HEAD; parent ${P.arms.d1?.survived === true ? 'survived' : String(P.arms.d1?.unreadable ?? 'ended')}`
      );
    }
  }
  if (ARMS.has('d2')) {
    const h = H.arms.d2;
    if (h === undefined || h.unreadable !== undefined) verdict('(d2) a restored claude row, a foreground nohup before the resume', null, `HEAD ${h?.unreadable ?? 'not read'}`);
    else {
      // The second fix round: the terminal's foreground group is no longer
      // selected, so his foreground job runs on after End, as it does today.
      verdict(
        '(d2) a restored claude row, a foreground nohup before the resume',
        h.survived && h.signal === null,
        `a foreground nohup in a restored agent session before its armed resume was entered: HEAD ${h.survived ? 'left it running, as today' : `ENDED IT (${String(h.signal)})`}, parent ${P.arms.d2?.survived === true ? 'left it running' : String(P.arms.d2?.unreadable ?? 'ended it')}`
      );
    }
  }

  // e
  if (ARMS.has('e')) {
    const h = H.arms.e;
    const p = P.arms.e;
    if (h === undefined || h.unreadable !== undefined) verdict('(e) a running tool when End is pressed', null, `HEAD ${h?.unreadable ?? 'not read'}`);
    else {
      // Wrong only if the product signalled a tool outside the hang-up's
      // groups, or left one inside them running. A tool its agent ends on the
      // way out is the agent's doing, at both builds.
      const wrong = (h.signal !== null && !h.tool.hangup) || (h.tool.hangup && h.survived);
      verdict(
        '(e) a running tool when End is pressed',
        wrong ? false : 'reported',
        `the perl tool ran as ${h.tool.stat}, group ${String(h.tool.pgid)} (${h.tool.inAgentGroup ? 'the agent’s own group' : h.tool.ownGroup ? 'its own group' : 'another group'}); HEAD ${h.survived ? 'left it running' : `ended it (${String(h.signal ?? 'on the hang-up')})`}; ` +
          `parent ${p?.survived === true ? 'left it running' : p?.unreadable ?? 'ended it'}. REPORTED either way`
      );
    }
  }

  // k
  if (ARMS.has('k')) {
    const h = H.arms.k;
    if (h === undefined || h.unreadable !== undefined) verdict('(k) a shared server and its client', null, `HEAD ${h?.unreadable ?? 'not read'}`);
    else {
      verdict(
        '(k) a shared server and its client',
        h.daemonSame && h.clientConnected && !h.signals.some((s) => s.pid === h.daemon.pid),
        `HEAD: the setsid server ${h.daemonSame ? 'kept its pid and start time' : 'was ENDED OR REPLACED'}, the other session's client ${h.clientConnected ? 'still connected' : 'LOST ITS CONNECTION'}; parent: server ${P.arms.k?.daemonSame === true ? 'kept' : String(P.arms.k?.unreadable ?? 'lost')}`
      );
    }
  }

  // l
  if (ARMS.has('l')) {
    const want = {
      'ignore-hup': { signal: 'SIGTERM' },
      'fg-child-ignore-hup': { signal: 'SIGTERM' },
      'ignore-hup-and-term': { signal: 'SIGKILL' },
      'setsid-child': { spared: true },
      'app-bundle': { spared: true }
    };
    for (const [mode, w] of Object.entries(want)) {
      const h = H.arms.l?.modes?.[mode];
      const p = P.arms.l?.modes?.[mode];
      if (h === undefined || h.unreadable !== undefined) {
        verdict(`(l) planted ${mode}`, null, `HEAD ${h?.unreadable ?? H.arms.l?.unreadable ?? 'not read'}`);
        continue;
      }
      let ok;
      let said;
      if (w.signal !== undefined) {
        const target = h.held.filter((e) => e.hangup && !e.app);
        ok = target.length > 0 && target.every((e) => h.signals.some((s) => s.pid === e.pid && s.signal === w.signal)) && h.survivors.length === 0;
        said = `HEAD: ${h.signals.map((s) => `${s.bin} ${s.signal}`).join(', ') || 'no signal'} (want ${w.signal}), ${String(h.survivors.length)} left`;
      } else {
        const spared = h.held.filter((e) => (mode === 'app-bundle' ? e.app : !e.hangup));
        ok = spared.length > 0 && spared.every((e) => h.survivors.includes(e.pid) && !h.signals.some((s) => s.pid === e.pid));
        said = `HEAD: ${String(spared.length)} process(es) that ${mode === 'app-bundle' ? 'are an application bundle’s executable' : 'left the terminal'} ${ok ? 'never signalled and still running' : 'SIGNALLED OR GONE'}`;
      }
      verdict(`(l) planted ${mode}`, ok, `${said}; parent: ${p?.survivors?.length ?? 'not read'} survivor(s), ${String(p?.signals?.length ?? 0)} signal(s)`);
    }
  }

  // g
  if (ARMS.has('g')) {
    for (const shape of ['grouped', 'linked']) {
      const h = H.arms.g?.shapes?.[shape];
      const p = P.arms.g?.shapes?.[shape];
      if (h === undefined || H.arms.g?.unreadable !== undefined) {
        verdict(`(g) a window another session still shows: ${shape}`, null, `HEAD ${H.arms.g?.unreadable ?? 'not read'}`);
        continue;
      }
      verdict(
        `(g) a window another session still shows: ${shape}`,
        h.paneShown ? h.rootRan && h.signals.length === 0 : null,
        h.paneShown
          ? `HEAD: the pane's process ${h.rootRan ? 'ran on' : 'was ENDED'}, ${String(h.signals.length)} signal(s) after ${String(h.watchedMs)} ms; parent: ${p?.rootRan === true ? 'ran on' : String(P.arms.g?.unreadable ?? 'ended')}`
          : 'the other session no longer showed the pane after End, so the shape was not made'
      );
    }
  }

  // h
  if (ARMS.has('h')) {
    const h = H.arms.h;
    const p = P.arms.h;
    if (h === undefined || h.unreadable !== undefined || p === undefined || p.unreadable !== undefined) {
      verdict('(h) the batch End of eight Gemini rows', null, `parent ${p?.unreadable ?? 'read'}; HEAD ${h?.unreadable ?? 'read'}`);
    } else {
      // The second fix round (Lens 2): medians over H_REPEATS samples per
      // build (and a prior run's, in the other order, when given), against
      // the reads' own cost plus the spread measured here: half the larger
      // build's range. A difference inside that spread is not a regression and
      // not a pass either when the samples cannot tell: UNREADABLE, never PASS.
      const priorH = prior?.builds ?? null;
      const ps = [...(p.samples ?? [{ batchMs: p.batchMs }]), ...(priorH?.parent?.arms?.h?.samples ?? [])].map((x) => x.batchMs);
      const hs = [...(h.samples ?? [{ batchMs: h.batchMs }]), ...(priorH?.head?.arms?.h?.samples ?? [])].map((x) => x.batchMs);
      const reads = 8 * ((H.measures.psTerminalMs ?? 0) + (H.measures.paneReadMs ?? 0));
      const range = (xs) => (xs.length > 0 ? Math.max(...xs) - Math.min(...xs) : 0);
      const noise = Math.max(range(ps), range(hs)) / 2;
      const diff = median(hs) - median(ps);
      const separable = ps.length >= 4 && hs.length >= 4;
      const everyHeadSlower = hs.every((x) => ps.every((y) => x > y + reads));
      let ok;
      if (h.survivors.length > 0) ok = false; // an ending that left a Gemini running
      else if (diff <= reads + noise) ok = true; // inside the reads and the measured spread
      else if (separable && everyHeadSlower) ok = false; // every HEAD sample slower: a regression
      else ok = null; // over the allowance, but the samples overlap or are too few to call
      verdict(
        '(h) the batch End of eight Gemini rows',
        ok,
        `parent ${JSON.stringify(ps)} ms (median ${String(round(median(ps)))}), ${String(p.survivors.length)} left; ` +
          `HEAD ${JSON.stringify(hs)} ms (median ${String(round(median(hs)))}), ${String(h.survivors.length)} left; ` +
          `median difference ${String(round(diff))} ms against ${String(round(reads))} ms of reads plus ${String(round(noise))} ms of measured spread (order ${report.order.join(' then ')}${prior === null ? '' : ', pooled with the other order'})` +
          (ok === null ? '; the samples cannot separate it from noise: run more repeats, or the other order with P323_PRIOR_REPORT' : '')
      );
    }
  }

  // f
  if (ARMS.has('f')) {
    const h = H.arms.f;
    const p = P.arms.f;
    if (h === undefined || h.unreadable !== undefined) verdict('(f) End then quit at once', null, `HEAD ${h?.unreadable ?? 'not read'}`);
    else {
      // The fix round: the quit no longer waits for an ending, so the
      // requirement is no slower than the parent, and nothing more left than
      // the parent leaves.
      const parentRead = p !== undefined && p.unreadable === undefined && p.quitMs !== null && p.quitMs !== undefined;
      // The round after his ruling: graded against the parent alone. SPEC
      // §8.1's 10 s ceiling is recorded, not graded (see QUIT_CEILING_MS).
      const allowance = parentRead ? Math.max(QUIT_NOISE_MS, Math.round(p.quitMs * QUIT_NOISE_SHARE)) : null;
      verdict(
        '(f) End then quit at once',
        !parentRead ? null : h.exited && h.quitMs !== null && h.quitMs <= p.quitMs + allowance && h.survivors.length <= p.survivors.length,
        `HEAD: the quit took ${String(h.quitMs)} ms, ${String(h.survivors.length)} of ${String(h.processes)} left once it completed; ` +
          `parent: ${String(p?.quitMs ?? p?.unreadable ?? 'not read')} ms, ${String(p?.survivors?.length ?? 'unknown')} left (allowed: HEAD within ${String(allowance)} ms of the parent, no more left; ` +
          `the spec's first ${String(QUIT_CEILING_MS)} ms ceiling, recorded only: HEAD ${h.quitMs !== null && h.quitMs <= QUIT_CEILING_MS ? 'within' : 'past'} it)`
      );
    }
  }

  // Every ending at HEAD that gave up on a read, on any row or arm, in either
  // of HEAD's launches.
  const headFailures = H.readFailures === undefined ? undefined : [...H.readFailures, ...(H2?.readFailures ?? [])];
  verdict(
    '(log) no ending at HEAD gave up on a read',
    headFailures === undefined ? null : headFailures.length === 0,
    headFailures === undefined
      ? 'app.log was not read'
      : headFailures.length === 0
        ? 'no line in HEAD’s app.log says a read could not be made'
        : `${String(headFailures.length)} line(s): ${headFailures.slice(0, 3).join(' | ')}`
  );

  // i
  for (const [name, B] of [['parent', P], ['head', H], ['parent2', P2], ['head2', H2]].filter(([, b]) => b !== undefined)) {
    verdict(
      `(i) the world at the ${name.replace(/2$/, ' (arm (C)’s second launch)')}`,
      name.startsWith('head') ? B.world.moves.length === 0 : B.world.moves.length === 0 ? true : 'reported',
      B.world.moves.length === 0
        ? 'his Codex server, the app’s tmux server, the Electron main pid and every install unchanged across every arm'
        : `MOVED: ${B.world.moves.map((m) => `${m.what} at ${m.at}`).join('; ')}`
    );
  }
}

// ---------------------------------------------------------------------------
// Run, and a finally that ends everything this run recorded
// ---------------------------------------------------------------------------

let stopped = null;
const onSignal = (sig) => {
  // Synchronous: a signal handler has no time for a grace period.
  for (const e of stillRecorded(null)) {
    try {
      process.kill(e.pid, 'SIGKILL');
    } catch {
      /* gone */
    }
  }
  for (const s of sockets) killServer(s.tmux, s.socket);
  if (!KEEP) rmSync(RUN, { recursive: true, force: true });
  process.exit(sig === 'SIGINT' ? 130 : 143);
};
for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(sig, () => onSignal(sig));

try {
  buildWorld();
  preflight();
  neverPrecheck();
  report.world.installsAtStart = installsNow();
  report.world.codexAtStart = codexServerNow();
  hisCodex = report.world.codexAtStart;
  report.world.real = Object.fromEntries(RUN_AGENTS.map((id) => [id, real[id] === null ? 'not installed' : real[id].bin]));
  say(`agents ${RUN_AGENTS.join(', ')}; his Codex server ${report.world.codexAtStart.length === 0 ? 'not running' : `running (${String(report.world.codexAtStart.length)} process(es))`}; qwen, agy and grok unreachable`);
  // The second fix round: the order is chosen, and recorded, because the
  // build that runs second runs warm.
  for (const build of report.order) {
    report.builds[build] = await runBuild(build, build === 'parent' ? PARENT : ROOT);
  }
  // Arm (C)'s second half of the ABBA order (the tools round): each build once
  // more, in the other order, for the `rt` block alone.
  if (ARMS.has('rt')) {
    for (const build of [...report.order].reverse()) {
      report.builds[`${build}2`] = await runBuild(build, build === 'parent' ? PARENT : ROOT, { rtOnly: true, suffix: '2' });
    }
  }
  grade(report.builds.parent, report.builds.head, report.builds.parent2, report.builds.head2);
} catch (err) {
  if (err instanceof Stop) {
    stopped = err.message;
    verdict('the run', null, `stopped: ${err.message}`);
  } else {
    verdict('the run', false, `it threw: ${String(err?.stack ?? err?.message ?? err).slice(0, 600)}`);
  }
} finally {
  // Everything any tree read recorded that is still the recorded process,
  // ended by pid, TERM then KILL; then every scratch server and socket file.
  // A `ps` that does not answer here signals nothing further (nothing can be
  // proved the same process) and never stops the servers from being ended.
  try {
    const left = stillRecorded(null);
    report.world.leftAtFinally = left.length;
    if (left.length > 0) report.world.endedAtFinally = await endOwn(left);
  } catch (err) {
    report.world.finallyUnreadable = String(err?.message ?? err);
  }
  for (const s of sockets) killServer(s.tmux, s.socket);
  report.world.socketsLeft = sockets
    .map((s) => s.socket)
    .filter((s) => existsSync(join(process.env['TMUX_TMPDIR'] ?? '/tmp', `tmux-${String(process.getuid())}`, s)));
  report.world.npmCalled = existsSync(NPM_LOG);
  try {
    // The verb and its class only: never a call's arguments.
    report.world.npmCalls = report.world.npmCalled ? npmCallsOf(readFileSync(NPM_LOG, 'utf8')) : [];
  } catch {
    report.world.npmCalls = null;
  }
  try {
    report.world.survivorsAtEnd = stillRecorded(null).length;
  } catch {
    report.world.survivorsAtEnd = null;
  }
  try {
    report.world.installsAtEnd = installsNow();
  } catch {
    /* reported as missing */
  }
  try {
    report.world.codexAtEnd = codexServerNow();
  } catch {
    report.world.codexAtEnd = null;
  }
}

// ---- Electron, counted once, at the end ----------------------------------------
const ps = spawnSync('ps', ['-Ao', 'pid,ppid,rss,comm'], { encoding: 'utf8' });
const electronLines = (ps.stdout ?? '').split('\n').filter((l) => /Electron|Tortie$|chrome_crashpad/.test(l) && !/defunct/.test(l));
const ofThisRun = electronLines.filter((l) => {
  const pid = Number(l.trim().split(/\s+/)[0]);
  const cmd = (spawnSync('ps', ['-p', String(pid), '-o', 'command='], { encoding: 'utf8' }).stdout ?? '').trim();
  return cmd.includes(RUN);
});
verdict('no Electron of this run is left', ofThisRun.length === 0, `${String(electronLines.length)} Electron line(s) on the machine (his own Tortie included), ${String(ofThisRun.length)} of this run`);
verdict('no process of this run is left', report.world.survivorsAtEnd === null || report.world.survivorsAtEnd === undefined ? null : report.world.survivorsAtEnd === 0, report.world.survivorsAtEnd === null || report.world.survivorsAtEnd === undefined ? `ps did not answer at the end, so the survivors could not be counted${report.world.finallyUnreadable === undefined ? '' : ` (${report.world.finallyUnreadable})`}` : `${String(report.world.leftAtFinally ?? 0)} still up at the finally were ended by pid, ${String(report.world.survivorsAtEnd)} left`);
verdict('the scratch sockets are gone', (report.world.socketsLeft ?? []).length === 0, `${String(sockets.length)} named, ${String((report.world.socketsLeft ?? []).length)} still on disk`);
// The fix round: with no start reading (a run stopped in its preflight) there
// is nothing to compare, and that is unread, never "every install MOVED". The
// tools round: a registry read asked of npm is named and never fails the run;
// an install verb does, and so does any install that moved.
if (report.world.npmCalls === null) {
  verdict('nothing was installed', null, 'npm was called and its log could not be read, so an install cannot be told from a read');
} else {
  const v = installVerdict(report.world.npmCalls, report.world.installsAtStart, report.world.installsAtEnd);
  verdict('nothing was installed', v.ok, v.said);
}
say(`model turns spent: ${String(report.turns)}`);

const OUT = join(ROOT, 'out', 'p323');
mkdirSync(OUT, { recursive: true });
const outFile = join(OUT, 'probe-p323.json');
writeFileSync(outFile, `${J(report, null, 1)}\n`, 'utf8');
say(`wrote ${outFile}${KEEP ? `; the run folder is kept at ${RUN}` : ''}`);
if (!KEEP) rmSync(RUN, { recursive: true, force: true });
if (stopped !== null) {
  say(`probe:p323 STOPPED: ${stopped}`);
  process.exit(2);
}
if (failures > 0) {
  say(`probe:p323 FAILED ${String(failures)} verdict(s)${unreadable > 0 ? ` and could not read ${String(unreadable)}` : ''}`);
  process.exit(1);
}
if (unreadable > 0) {
  say(`probe:p323 could not READ ${String(unreadable)} verdict(s); that is not a pass`);
  process.exit(2);
}
const exceptions = report.verdicts.filter((v) => v.ok === 'exception').map((v) => v.id);
say(`probe:p323 OK${exceptions.length === 0 ? '' : ` (${String(exceptions.length)} stated exception(s), graded as such: ${exceptions.join(', ')})`}`);
process.exit(0);
