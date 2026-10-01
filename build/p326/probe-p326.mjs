#!/usr/bin/env node
/**
 * probe-p326.mjs. THE PHASE 326 APP RUN: the first session in a remote tab
 * draws its screen (build/p326/SPEC.md §8, the Phase 326 entry in
 * docs/BACKLOG.md).
 *
 * The defect. When he started the first session in a tab whose folder is on
 * another machine, that session could open on "This session no longer exists"
 * and stay blank while it ran over there. Phase 320's logs held it 16 times in
 * 35 runs, every one carrying the local branch's sentence "This session is no
 * longer running.": the attach asked THIS MAC'S server for a session on another
 * computer, because a list of that machine had run between the create's
 * `new-session` and its `@gmux-id` stamp and counted the new session as one
 * Tortie did not create. This run measures that at a build, arm by arm, with
 * the far side's own command log as the ruler.
 *
 * ## The shape
 *
 * TWO Electrons, one after the other, never at once, through
 * build/electron-run.mjs's `withElectron`, on ONE scratch profile, a scratch
 * HOME and the tmux socket build/harness-socket.mjs hands it, over the LOOPBACK
 * scratch machine build/with-scratch-machine.mjs starts around this file (its
 * own sshd on 127.0.0.1, its own keys and agent, its own TMUX_TMPDIR), the
 * shape `probe:p320` uses. The loopback machine's tmux is
 * build/p326/far-tmux.sh (copied into this run's scratch folder beside a
 * generated far-tmux.env, and named as the machine's `remoteTmuxPath`), which
 * logs every far command with its own clock and can hold the `@gmux-id` stamp
 * or the first list, then `exec`s the real far tmux. Every create goes through
 * the renderer's own create in the Phase 95 drive
 * (src/renderer/terminal/p95-scroll-drive.ts), as a person's would.
 *
 * ## The arms (P326_ARMS, a comma separated subset; all by default)
 *
 * Launch 1 runs, in this order, G, A, B, Ed, C, Eb, Ea, then Ec, whose quit
 * ends the launch; launch 2 on the same profile is D. "Alone" means this file
 * verified that the freshly opened tab held no session before the create and
 * that no other session's pane was on screen while it ran; a create that was
 * not alone is UNREADABLE, never a pass. Two arms read it narrower on purpose
 * (the fix round, from the parent-lens verifier, who found both UNREADABLE at
 * both builds by construction): Ed's second create may find its pair's first on
 * screen, and Eb reads it only up to the switch, because the away tab's own
 * session comes on screen BECAUSE of the switch.
 *
 *   G   20  LOCAL control. `openLocal(<fresh folder>)`, one shell created
 *           alone. HEAD: 0 refusals, 0 stalls (drawn within 30 s of the call).
 *   A   20  THE NATURAL RATE. `openRemote(p326far, <fresh far folder>)`, one
 *           shell created alone, no rule. HEAD: 0 refusals of any code, 0
 *           stalls. The parent's refusals and stalls are counted.
 *   B    8  THE WIDENED WINDOW. As A with `stamp-delay-ms 1500`, so every list
 *           the new session provokes lands inside the window. HEAD: each drawn
 *           within 2,000 ms of first reading bound, 0 refusals.
 *   Ed   2  BACK TO BACK, pairs. One fresh far tab, `stamp-delay-ms 1500`, the
 *           second create started 200 ms into the first, neither awaited.
 *           HEAD: both drawn (the first after selecting it once both settle).
 *   C    2  PAST THE BOUND. As A with `stamp-delay-ms 8500`, longer than the
 *           attach's 7,000 ms wait and shorter than the stamp's own 10,000 ms.
 *           HEAD: the attach refuses TMUX_UNREACHABLE with ATTACH_NOT_HEARD
 *           6,000 to 9,000 ms after the pane mounted, never "This session no
 *           longer exists"; the pane shows "Can't connect to this session" with
 *           that sentence and Try again; a REAL click on Try again after the
 *           row reads bound draws within 5,000 ms. (The overlay itself can only
 *           show once the row leaves `unknown`, because TerminalPane's "Machine
 *           unreachable" branch outranks it; so the 6 to 9 s window is read on
 *           the refusal line, and the overlay on its own time.)
 *   Eb   2  SWITCH AWAY. As B; once the pane is mounted and not drawn,
 *           `openLocal(<G's first folder>)`. HEAD, read by this file's own far
 *           `list-clients` and `ps` once the create has settled plus 2,000 ms:
 *           no client on it and no local ssh attach naming its `$-id`; then
 *           `openRemote` back to its tab draws it.
 *   Ea   2  A STRANGER UNDER THE CREATE'S NAME. `stranger-on-name <name>`: the
 *           wrapper plants an unstamped session of that name, so the create
 *           fails as a duplicate. HEAD: the pane never draws (the only session
 *           under that name over there is the stranger's, whose prompt says
 *           p326); any attach refusal is SESSION_NOT_FOUND and never "This
 *           session is no longer running."; the id leaves the session list; the
 *           far log holds no `set-option`, `attach-session` or `kill-session`
 *           naming the stranger's `$-id` and at most one `show-environment` of
 *           it PER LAUNCH (the foreign memo lives for one process); the
 *           stranger still exists at the end. No unmount deadline: the build
 *           graded one of 7,000 ms and the parent-lens verifier measured the
 *           renderer letting the row go 3.8 to 7.7 s after the mount at BOTH
 *           builds, with "Session not found." at both.
 *   Ec   1  QUIT IN THE WAIT. As B; once mounted and waiting,
 *           `window.gmux.quit()`. HEAD: the app exits on its own (its pid is
 *           gone when the launch's child exits, so the helper's teardown has
 *           nothing to end), and afterwards no far client and no local ssh
 *           attach remains. The quit time is recorded for `--compare`, which
 *           holds HEAD to the parent's plus 1,000 ms.
 *   D    1  RELAUNCH. Launch 2 on the same profile with `first-list-delay-ms
 *           2500`: Ec's far session, on screen at the quit and alone in its
 *           tab, is focused at the relaunch. HEAD: drawn within 30 s of the
 *           mount, never "This session no longer exists". VALID only when the
 *           far log shows launch 2's first `list-sessions` starting after the
 *           pane was first seen mounted, else UNREADABLE. When Ec was not
 *           chosen, launch 1 ends with one far session created alone and a
 *           quit, graded nothing, so D has its session.
 *
 *   F   derived, no creates of its own. Per far arm, the "p326far holds N
 *       session(s) Tortie did not create" lines in the app's output: in A, B,
 *       C, Eb, Ec and Ed, N never exceeds what the arm started with, being the
 *       last count logged before it or, if larger, the unstamped sessions
 *       before the first far create plus every stranger Ea planted before the
 *       arm began (so a stranger first counted inside Ec is not a rise); and
 *       the rescue's "could not account for" sentence appears 0 times there.
 *       Before the first far create this file lists the far server itself
 *       (`#{session_id} #{session_name} #{@gmux-id}`) and records that the one
 *       session there is Tortie's own unstamped `gmux-control`. ONE LIMIT,
 *       stated since the fix round removed the build's deferral: a list that
 *       runs over there after `new-session` and is PARSED before the create's
 *       own answer is parsed cannot know the `$-id`, and handles the session
 *       as the parent does (counted, rescued by its pane environment). The
 *       answer is one tmux client exiting, and such a list is a notification,
 *       an ssh round trip and a far tmux client, so F is PREDICTED to read 0
 *       on loopback; it is not measured, because the build's deferral hid that
 *       sub-window. A rise in F is read against the far log before it is
 *       called the defect.
 *
 * ## Focusing a tab again (SPEC §8, read from the code and stated here)
 *
 * `openRemote(p326far, <an already-open far folder>)` FOCUSES that tab:
 * `addRemoteProjectAdmitted` in src/main/sessions/core.ts upserts the project
 * row and answers `{ ok: true, project, alreadyOpen: true }`, and
 * `addRemoteProject` in src/renderer/state/projects-slice.ts calls
 * `setActiveProject(result.project.id)` on every ok answer. Eb uses it to go
 * back, and falls back to a real click on the tab's own element
 * (`[data-project-id]`) only when the active tab did not become it. D does the
 * OTHER order on purpose: at a relaunch `openRemote` must first list the far
 * folder, which waits for the machine's sign-in, so it would mount the pane
 * after the first list and make D UNREADABLE by construction; D therefore
 * clicks the tab when the restored window shows another one, and says so in
 * its reading.
 *
 * ## Environment
 *
 *   GMUX_TMUX_SOCKET  The scratch socket. build/harness-socket.mjs sets it.
 *   GMUX_HARNESS_DIR  The scratch directory. Set by the same wrapper.
 *   GMUX_CONFIG_ROOT  Where build/with-scratch-machine.mjs wrote the carriage.
 *   P326_CHECKOUT     A BUILT worktree to measure instead of this one.
 *   P326_FAR_TMUX     The far side's real tmux. By default the carriage's own
 *                     (`which tmux`, 3.6a here); build/vendor/tmux/bin/tmux is
 *                     3.7b. Any version is accepted and labels the run.
 *   P326_ARMS         A comma separated subset of G,A,B,Ed,C,Eb,Ea,Ec,D.
 *   P326_OUT_DIR      Where readings and each launch's app output go. Default
 *                     `out/p326`, named by tag and far version; remove it
 *                     before a package.
 *   P326_KEEP=1       Also copy the far log there, for the verifier's
 *                     re-derivation.
 *
 * ## Usage, from the worktree root. BUILD FIRST.
 *
 *   npm run build && npm run -s probe:p326
 *   P326_FAR_TMUX=$PWD/build/vendor/tmux/bin/tmux npm run -s probe:p326
 *   P326_CHECKOUT=/path/to/parent P326_ARMS=A,B npm run -s probe:p326
 *   node build/p326/probe-p326.mjs --self-test          graders only
 *   node build/p326/probe-p326.mjs --compare <parent readings> <head readings>
 *                                                       §9.6's side by side,
 *                                                       launches nothing
 *
 * Exit 0 with no finding, 1 with findings (at the parent the expected refusals
 * of A, B, C, Eb and D are findings, named as expected at the end), 2 on a
 * refusal or an UNREADABLE run.
 *
 * ## What it refuses, before anything starts (exit 2, one sentence)
 *
 *   No GMUX_TMUX_SOCKET; the socket names `gmux` and `default`; a socket that is
 *   not a `gmux-p326` harness socket; no GMUX_HARNESS_DIR; no carriage; a
 *   carriage `tmuxTmp` outside /tmp/; a missing or STALE `out/` in the
 *   checkout it measures (core.ts, remote-sessions.ts, remote-copy.ts,
 *   TerminalPane.tsx, sessions-slice.ts, and far-attach.ts and
 *   create-inflight.ts when present, against the bundle built from them); a
 *   P326_FAR_TMUX that is not an executable file; a path with a quote or a
 *   space; an unknown arm; and a checkout whose own overlay parser does not
 *   hide the five agents below.
 *
 * ## The machine row
 *
 * `<profile>/gmux/config/machines.json` and `known-machines` are written ONCE,
 * before launch 1, as probe:p320 writes them, with the wrapper as the machine's
 * `remoteTmuxPath`. Launch 2 reads what launch 1 left on purpose: accepting a
 * far version nobody measured (the drive's `machineUp` does it the way a person
 * does) is written into that row and moves its confirmation hash, so rewriting
 * the file before the relaunch would take the acceptance back and the machine
 * would never sign in, which is not the relaunch D measures.
 *
 * ## The agents it never starts
 *
 * Before EACH launch it writes `<profile>/gmux/config/agents.json` from
 * build/hidden-agents.mjs, renaming the binaries and launch argv of gemini,
 * qwen, antigravity, grok and droid to `p326-never-<id>`, proves with the
 * checkout's own parser (the pinned tsx) that all five merge with names that
 * resolve nowhere, and reads `window.gmux.agentsList()` back once the window
 * is up: any of the five with a binPath, a version or `installed` true stops
 * the run, exit 2, before any arm.
 *
 * ## SAFETY
 *
 * Both Electrons go through `withElectron`, which ends the tree it started and
 * the local scratch tmux server it was handed in a `finally` whatever happened,
 * and whose Phase 261 census (`liveSessionNames`, `censusFinding`) is the count
 * of the operator's own sessions before and after; this file reads its verdict
 * and names no real socket. Every tmux command this file runs itself is
 * `spawnSync`, names the harness socket and the carriage's TMUX_TMPDIR, and
 * runs the REAL far binary, never the wrapper, so it never enters the far log;
 * it runs only `list-sessions`, `list-clients` and `display-message`. The far
 * tmux server is ended by the pid it reports, in this file's `finally` and on
 * `exit`; build/with-scratch-machine.mjs ends the sshd, the agent and every pid
 * it recorded. The wrapper exports HOME and ZDOTDIR as a scratch folder and
 * unsets HISTFILE, so a far session's shell writes nothing under his home; his
 * ~/.zsh_history is STATTED (modified time and size, never its content) before
 * the first launch and after the last, and both are reported. It types nothing
 * into any session, sends no control bytes, spawns no agent, spends no token,
 * never names `-L gmux` or the default server, and never runs pkill or
 * kill-server.
 */
import { spawnSync } from 'node:child_process';
import {
  accessSync,
  constants as fsConstants,
  copyFileSync,
  chmodSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { withElectron, withoutDevRenderer } from '../electron-run.mjs';
import { cdpEval, wsConnect } from '../cdp-client.mjs';
import { keyscanText } from '../ssh-run.mjs';
import * as hidden from '../hidden-agents.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const HERE = dirname(fileURLToPath(import.meta.url));
const TAG = '[p326]';
const CALLER = 'build/p326/probe-p326.mjs';
const t0 = Date.now();
const say = (l) => console.log(`${TAG} ${((Date.now() - t0) / 1000).toFixed(1).padStart(6)}s ${l}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const J = (v) => JSON.stringify(v);

// ---------------------------------------------------------------------------
// The numbers this run holds the app against, BY VALUE. None is imported from
// the source it judges: a probe that read them from there would agree with a
// wrong one.
// ---------------------------------------------------------------------------
export const ALL_ARMS = ['G', 'A', 'B', 'Ed', 'C', 'Eb', 'Ea', 'Ec', 'D'];
export const FAR_ARMS = ['A', 'B', 'Ed', 'C', 'Eb', 'Ea', 'Ec', 'D'];
/** The arms F is graded over: no stranger exists in them. */
export const F_ARMS = ['A', 'B', 'C', 'Eb', 'Ec', 'Ed'];
/** Creates per launch (Ed counts pairs). */
export const COUNTS = Object.freeze({ G: 20, A: 20, B: 8, Ed: 2, C: 2, Eb: 2, Ea: 2, Ec: 1, D: 1 });
export const HOLD_MS = 1500;
export const C_HOLD_MS = 8500;
export const D_FIRST_LIST_MS = 2500;
export const ED_OFFSET_MS = 200;
export const STALL_MS = 30_000;
export const B_DRAW_AFTER_BOUND_MS = 2_000;
export const C_REFUSAL_FROM_MS = 6_000;
export const C_REFUSAL_TO_MS = 9_000;
export const C_RETRY_DRAW_MS = 5_000;
/**
 * How long arm Ea waits after its create has returned, so the renderer has let
 * the failed create's row go before the kit is read. A WAIT, not a grade: the
 * parent-lens verifier measured the pane unmounting 3.8 to 7.7 s after the mount
 * at BOTH builds, so the build's 7,000 ms grade failed the parent and HEAD
 * alike on the renderer's own pace and measured nothing about the attach.
 */
export const EA_WAIT_MS = 7_000;
export const EB_AFTER_SETTLE_MS = 2_000;
export const EC_EXIT_MS = 30_000;
/** The Phase 95 drive's own wait after the renderer's create resolves. */
export const DRIVE_CREATE_WAIT_MS = 2_500;
/** §9.6's tolerances. */
export const SIDE_MEDIAN_MS = 250;
export const SIDE_SLOWEST_MS = 1_000;
export const SIDE_QUIT_MS = 1_000;

export const ATTACH_NOT_HEARD = 'That machine has not told Tortie about this session yet. It may still be starting there.';
export const REMOTE_ABSENT = 'This session is not running right now.';
export const LOCAL_GONE = 'This session is no longer running.';
export const TITLE_GONE = 'This session no longer exists';
export const TITLE_CANT = "Can't connect to this session";
export const TRY_AGAIN = 'Try again';
export const ATTACH_REFUSAL = "Error occurred in handler for 'sessions:attach'";
export const FOREIGN_LINE = /(\S+) holds (\d+) session\(s\) Tortie did not create/;
export const RESCUE_LINE = /(\S+) held (\d+) session\(s\) Tortie created and could not account for/;
const INTERESTING = /Error occurred in handler for 'sessions:attach'|Tortie did not create|could not account for|\[gmux-socket\]/;
export const MACHINE_ID = 'p326far';
const PREFIX = 'p326';

/** Statuses that say the feed has bound the row. */
const UNBOUND = new Set(['unknown', 'restorable', 'exited', '(gone)']);

// ---------------------------------------------------------------------------
// The graders. Pure, exported, and proved both ways under --self-test.
// ---------------------------------------------------------------------------

/** One POSIX single-quoted word. */
export function shq(s) {
  return `'${String(s).replace(/'/g, `'\\''`)}'`;
}

/** The far-tmux.env text the wrapper sources. */
export function farEnvText({ real, log, rules, farHome }) {
  return `REAL=${shq(real)}\nLOG=${shq(log)}\nRULES=${shq(rules)}\nFARHOME=${shq(farHome)}\n`;
}

/** Split a line of zsh `${(qq)@}` words back into the words. */
export function shellWords(text) {
  const words = [];
  let cur = '';
  let inWord = false;
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (quoted) {
      if (c === "'") quoted = false;
      else cur += c;
      continue;
    }
    if (c === "'") {
      quoted = true;
      inWord = true;
      continue;
    }
    if (c === '\\' && i + 1 < text.length) {
      cur += text[i + 1];
      i += 1;
      inWord = true;
      continue;
    }
    if (c === ' ') {
      if (inWord) words.push(cur);
      cur = '';
      inWord = false;
      continue;
    }
    cur += c;
    inWord = true;
  }
  if (inWord) words.push(cur);
  return words;
}

/** The leading global options, the verb and the rest of one far argv. */
export function farVerb(argv) {
  let i = 0;
  while (i < argv.length) {
    const a = argv[i];
    if (['-L', '-S', '-f', '-T', '-c'].includes(a)) i += 2;
    else if (a === '--') {
      i += 1;
      break;
    } else if (a.startsWith('-')) i += 1;
    else break;
  }
  return { globals: argv.slice(0, i), verb: argv[i] ?? '', rest: argv.slice(i + 1) };
}

/** The far log's lines as `{ t, pid, argv }` for an invocation and `{ t, pid, note }` for a note. */
export function parseFarLog(text) {
  const out = [];
  for (const line of String(text).split('\n')) {
    const m = /^(\d+) (\d+) (.*)$/.exec(line);
    if (m === null) continue;
    const t = Number(m[1]);
    const pid = Number(m[2]);
    if (m[3].startsWith('# ')) out.push({ t, pid, note: m[3].slice(2).split(' ') });
    else out.push({ t, pid, argv: shellWords(m[3]) });
  }
  return out;
}

/**
 * Every invocation with its verb and the instant it really ran: `eff` is its
 * own time, or the time the wrapper released it when a rule held it.
 */
export function farTimeline(records) {
  const out = [];
  for (let i = 0; i < records.length; i += 1) {
    const r = records[i];
    if (r.argv === undefined) continue;
    let eff = r.t;
    let held = null;
    for (let j = i + 1; j < records.length; j += 1) {
      const n = records[j];
      if (n.pid !== r.pid) continue;
      if (n.argv !== undefined) break;
      if (n.note[0] === 'held') held = n.note[1];
      if (n.note[0] === 'released') {
        eff = n.t;
        break;
      }
    }
    out.push({ t: r.t, eff, pid: r.pid, held, ...farVerb(r.argv) });
  }
  return out;
}

/** The value after `flag` in `rest`, or null. */
export function flagValue(rest, flag) {
  const at = rest.indexOf(flag);
  return at === -1 || at + 1 >= rest.length ? null : rest[at + 1];
}

/** The strangers the wrapper planted, `{ name, tmuxId, t }`. */
export function strangersIn(records) {
  return records.filter((r) => r.note !== undefined && r.note[0] === 'stranger').map((r) => ({ name: r.note[1], tmuxId: r.note[2], t: r.t }));
}

/**
 * The far side's own account of one create, from its log alone: when
 * `new-session` ran, when the first `@gmux-id` stamp naming its session id ran,
 * the `$-id` that stamp named, and every `list-sessions` that STARTED inside
 * that window.
 */
export function farCreateFacts(timeline, { tmuxName, sessionId }) {
  const candidates = timeline.filter((e) => (e.verb === 'new-session' || e.verb === 'new') && flagValue(e.rest, '-s') === tmuxName);
  const ns = candidates.find((e) => sessionId !== null && e.rest.includes(`GMUX_SESSION_ID=${sessionId}`)) ?? candidates[0] ?? null;
  if (ns === null) return { seen: false, newSessionAt: null, stampAt: null, tmuxId: null, windowMs: null, listsInWindow: [] };
  const stamp =
    sessionId === null
      ? null
      : (timeline.find((e) => (e.verb === 'set-option' || e.verb === 'set') && e.eff >= ns.eff && e.rest.includes('@gmux-id') && e.rest.includes(sessionId)) ?? null);
  const until = stamp === null ? Number.POSITIVE_INFINITY : stamp.eff;
  const lists = timeline.filter((e) => (e.verb === 'list-sessions' || e.verb === 'ls') && e.eff >= ns.eff && e.eff <= until).map((e) => e.eff);
  return {
    seen: true,
    newSessionAt: ns.eff,
    stampAt: stamp === null ? null : stamp.eff,
    tmuxId: stamp === null ? null : flagValue(stamp.rest, '-t'),
    windowMs: stamp === null ? null : stamp.eff - ns.eff,
    listsInWindow: stamp === null ? [] : lists
  };
}

/** Far commands that name one `$-id` as their target, by verb. */
export function farTouches(timeline, tmuxId) {
  const out = { 'set-option': 0, 'attach-session': 0, 'kill-session': 0, 'show-environment': 0 };
  const names = new Set([tmuxId, `=${tmuxId}`]);
  const canon = { set: 'set-option', attach: 'attach-session', a: 'attach-session', 'kill-ses': 'kill-session', showenv: 'show-environment' };
  for (const e of timeline) {
    const verb = canon[e.verb] ?? e.verb;
    if (!(verb in out)) continue;
    if (names.has(flagValue(e.rest, '-t') ?? '')) out[verb] += 1;
  }
  return out;
}

/** One `sessions:attach` refusal from an app line: `{ code, message, detail }`, or null. */
export function parseRefusal(line) {
  const at = String(line).indexOf(ATTACH_REFUSAL);
  if (at === -1) return null;
  const open = line.indexOf('{', at);
  const close = line.lastIndexOf('}');
  if (open !== -1 && close > open) {
    try {
      const p = JSON.parse(line.slice(open, close + 1));
      return { code: p.code ?? null, message: p.message ?? null, detail: p.detail ?? null };
    } catch {
      /* fall through */
    }
  }
  return { code: null, message: null, detail: null, raw: line.slice(at, at + 300) };
}

const nameRe = (name) => new RegExp(`(^|[^\\w-])${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^\\w-])`);

/**
 * Which create a refusal belongs to: by its tmux name or its id in the detail,
 * else by the one create whose pane was mounted at that instant. `creates` is
 * `[{ key, tmuxName, id, intervals: [[from, to]] }]`. Answers the key or null.
 */
export function attributeRefusal(ref, creates) {
  const detail = `${ref.detail ?? ''} ${ref.message ?? ''}`;
  const byName = creates.filter((c) => (c.tmuxName !== null && c.tmuxName !== undefined && nameRe(c.tmuxName).test(detail)) || (c.id && detail.includes(c.id)));
  if (byName.length === 1) return byName[0].key;
  // The recorder reads every 50 ms, so a mount or an unmount is placed up to
  // one tick late; 100 ms either side covers that and no more.
  const mounted = creates.filter((c) => (c.intervals ?? []).some(([a, b]) => ref.t >= a - 100 && ref.t <= (b ?? Number.POSITIVE_INFINITY) + 100));
  return mounted.length === 1 ? mounted[0].key : null;
}

/** The mounted intervals of one watched session. */
export function mountIntervals(w) {
  const out = [];
  const mounts = w?.mounts ?? [];
  const unmounts = w?.unmounts ?? [];
  for (let i = 0; i < mounts.length; i += 1) out.push([mounts[i], unmounts.find((u) => u >= mounts[i]) ?? null]);
  return out;
}

/** The first status that says the feed bound the row, after it was held. */
export function boundAt(statuses) {
  const s = (statuses ?? []).find((x) => !UNBOUND.has(x.s));
  return s === undefined ? null : s.t;
}

/**
 * Whether a create was alone: nothing but `allowed` on screen before, and only
 * `allowed` panes during. `allowed` is the create's own id, and for Ed its
 * pair's too: the second of a pair starts 200 ms into the first ON PURPOSE, so
 * the first's pane on screen before it is the arm, not a neighbour (the fix
 * round; the build read every Ed second UNREADABLE at both builds).
 */
export function aloneVerdict(c, allowed) {
  const before = (c.panesBefore ?? []).filter((p) => !allowed.includes(p));
  const during = c.panesDuring ?? [];
  if (before.length > 0) return { alone: false, why: `the tab showed ${before.join(', ')} before the create` };
  const others = during.filter((p) => !allowed.includes(p));
  if (others.length > 0) return { alone: false, why: `${others.join(', ')} was on screen while it ran` };
  return { alone: true, why: null };
}

const first = (list, from = Number.NEGATIVE_INFINITY) => (list ?? []).find((t) => t >= from) ?? null;
const hasTitle = (r, title) => (r.overlays ?? []).some((o) => o.title === title);

/**
 * HEAD's grading of one create, per arm. `r` is the assembled reading. Answers
 * a list of findings, each naming the create.
 */
export function gradeCreate(r) {
  const out = [];
  const who = `${r.arm} ${r.name}`;
  const refusals = r.refusals ?? [];
  const draw = first(r.draws, r.callAt);
  const localGone = refusals.filter((x) => x.message === LOCAL_GONE);
  if (localGone.length > 0) out.push(`${who}: the attach took THIS MAC's branch and refused "${LOCAL_GONE}" ${String(localGone.length)} time(s)`);
  if (['G', 'A', 'B', 'Ed', 'Eb', 'D'].includes(r.arm)) {
    const other = refusals.filter((x) => x.message !== LOCAL_GONE);
    if (other.length > 0) out.push(`${who}: the attach refused ${other.map((x) => `${String(x.code)} ${J(x.message)}`).join('; ')}`);
  }
  if (['G', 'A', 'B'].includes(r.arm) || (r.arm === 'Ed' && (r.selectAt === undefined || r.selectAt === null))) {
    if (draw === null || draw - r.callAt > STALL_MS) out.push(`${who}: its screen did not draw within ${String(STALL_MS / 1000)} s of the create (a stall)`);
  }
  if (r.arm === 'B' && draw !== null) {
    const bound = boundAt(r.statuses);
    if (bound === null) out.push(`${who}: the row never read bound`);
    else if (draw - bound > B_DRAW_AFTER_BOUND_MS) out.push(`${who}: drawn ${String(draw - bound)} ms after first reading bound, over ${String(B_DRAW_AFTER_BOUND_MS)} ms`);
  }
  if (r.arm === 'Ed' && r.selectAt !== undefined && r.selectAt !== null) {
    const after = first(r.draws, r.selectAt);
    if (after === null || after - r.selectAt > STALL_MS) out.push(`${who}: selected once both of its pair had settled, it did not draw within ${String(STALL_MS / 1000)} s`);
  }
  // Ea is not here: its session really does not exist, so SESSION_NOT_FOUND's
  // own title is the honest one there, and it is graded on its sentence below.
  if (['C', 'D', 'Eb', 'A', 'B', 'Ed'].includes(r.arm) && hasTitle(r, TITLE_GONE)) {
    out.push(`${who}: the pane said "${TITLE_GONE}"`);
  }
  if (r.arm === 'C') {
    const mount = first(r.mounts);
    const hit = refusals.find((x) => x.code === 'TMUX_UNREACHABLE' && x.message === ATTACH_NOT_HEARD);
    if (hit === undefined) out.push(`${who}: the attach never refused TMUX_UNREACHABLE with "${ATTACH_NOT_HEARD}"`);
    else if (mount !== null && (hit.t - mount < C_REFUSAL_FROM_MS || hit.t - mount > C_REFUSAL_TO_MS)) {
      out.push(`${who}: the refusal came ${String(hit.t - mount)} ms after the mount, outside ${String(C_REFUSAL_FROM_MS)} to ${String(C_REFUSAL_TO_MS)} ms`);
    }
    const shown = (r.overlays ?? []).find((o) => o.title === TITLE_CANT && o.detail === ATTACH_NOT_HEARD && o.action === TRY_AGAIN);
    if (shown === undefined) out.push(`${who}: the pane never showed "${TITLE_CANT}" with the sentence and ${TRY_AGAIN}`);
    if (r.clickAt === null || r.clickAt === undefined) out.push(`${who}: ${TRY_AGAIN} was never pressed, so its draw was not read`);
    else {
      const redraw = first(r.draws, r.clickAt);
      if (redraw === null || redraw - r.clickAt > C_RETRY_DRAW_MS) out.push(`${who}: ${TRY_AGAIN} did not draw within ${String(C_RETRY_DRAW_MS)} ms`);
    }
  }
  if (r.arm === 'Eb') {
    if ((r.clientsAfter ?? 0) > 0) out.push(`${who}: ${String(r.clientsAfter)} far client(s) on it after the switch away`);
    if ((r.sshAfter ?? 0) > 0) out.push(`${who}: ${String(r.sshAfter)} local ssh attach(es) naming its $-id after the switch away`);
    const back = first(r.draws, r.backAt ?? Number.POSITIVE_INFINITY);
    if (back === null || back - r.backAt > STALL_MS) out.push(`${who}: going back to its tab did not draw it within ${String(STALL_MS / 1000)} s`);
  }
  if (r.arm === 'Ea') {
    // THE FIX ROUND (the parent-lens verifier). The build graded an unmount
    // within 7,000 ms and at most one read of the stranger per RUN, and both
    // failed the parent and HEAD alike: the renderer lets the row go 3.8 to
    // 7.7 s after the mount whatever the attach did, and the rescue's foreign
    // memo lives for one PROCESS, so a two-launch run reads the stranger once
    // per launch. What the arm is for is identity: the failed create never
    // shows the stranger's screen, never acts on it, and goes away.
    if ((r.draws ?? []).length > 0) out.push(`${who}: its pane drew a screen, and the only session under its name over there is the stranger's`);
    const wrong = refusals.filter((x) => x.code !== 'SESSION_NOT_FOUND');
    if (wrong.length > 0) out.push(`${who}: the attach refused ${wrong.map((x) => `${String(x.code)} ${J(x.message)}`).join('; ')}, where a session that does not exist is SESSION_NOT_FOUND`);
    if (r.presentAtEnd === true) out.push(`${who}: the failed create's id is still in the session list`);
    if (r.stranger === null || r.stranger === undefined) out.push(`${who}: the wrapper recorded no stranger, so the attack did not happen`);
    else {
      const t = r.strangerTouches ?? {};
      for (const verb of ['set-option', 'attach-session', 'kill-session']) {
        if ((t[verb] ?? 0) > 0) out.push(`${who}: Tortie sent ${verb} naming the stranger ${r.stranger.tmuxId} ${String(t[verb])} time(s)`);
      }
      const reads = Array.isArray(r.strangerReadsPerLaunch) ? r.strangerReadsPerLaunch : [t['show-environment'] ?? 0];
      reads.forEach((n, i) => {
        if (n > 1) out.push(`${who}: Tortie read the stranger's environment ${String(n)} times in launch ${String(i + 1)}, more than once`);
      });
      if (r.strangerAtEnd !== true) out.push(`${who}: the stranger ${r.stranger.tmuxId} was not there at the end`);
    }
  }
  if (r.arm === 'Ec') {
    if (r.exitedOnItsOwn !== true) out.push(`${who}: the app did not exit on its own within ${String(EC_EXIT_MS / 1000)} s of the quit`);
    if ((r.clientsAfter ?? 0) > 0) out.push(`${who}: ${String(r.clientsAfter)} far client(s) remained after the quit`);
    if ((r.sshAfter ?? 0) > 0) out.push(`${who}: ${String(r.sshAfter)} local ssh attach(es) remained after the quit`);
  }
  if (r.arm === 'D') {
    const mount = first(r.mounts);
    const drawn = first(r.draws, mount ?? Number.NEGATIVE_INFINITY);
    if (mount === null || drawn === null || drawn - mount > STALL_MS) out.push(`${who}: after the relaunch it did not draw within ${String(STALL_MS / 1000)} s of the mount`);
  }
  return out;
}

/**
 * Whether a reading can be graded at all. A create that was not alone, a far
 * create the far log never saw, an Eb that drew before the switch, and a D
 * whose first list ran before the pane mounted are UNREADABLE.
 */
export function readable(r) {
  if (r.arm !== 'D' && r.alone === false) return { ok: false, why: `not alone: ${r.aloneWhy}` };
  if (['A', 'B', 'C', 'Eb', 'Ec', 'Ed'].includes(r.arm) && r.far?.seen !== true) return { ok: false, why: 'the far log never saw its new-session' };
  if (r.arm === 'Eb' && (r.drawnBeforeSwitch === true || r.mountedBeforeSwitch !== true)) return { ok: false, why: 'it was not mounted and waiting when the tab was switched away' };
  if (r.arm === 'D') {
    const mount = first(r.mounts);
    if (mount === null) return { ok: false, why: 'its pane was never seen mounted after the relaunch' };
    if (r.firstListAt === null || r.firstListAt === undefined) return { ok: false, why: 'the far log holds no list after the relaunch' };
    if (r.firstListAt <= mount) return { ok: false, why: `the first list ran ${String(mount - r.firstListAt)} ms before the pane was seen mounted` };
  }
  return { ok: true, why: null };
}

/**
 * F, per arm window: the foreign count never above what the arm started with,
 * and no rescue sentence. `lines` are `{ t, line }`.
 *
 * What an arm starts with is the larger of the last count logged before it and,
 * when `expected` is given, the unstamped sessions the far server held before
 * the first far create (`expected.floor`, Tortie's own gmux-control) plus every
 * stranger arm Ea planted before the arm began (`expected.strangers`, their
 * far-log instants). THE FIX ROUND: the build read only the last logged line,
 * so a stranger planted in Ea and first counted a pass later, inside Ec, read
 * as a rise in Ec, which is a stranger being counted correctly, not the new
 * session being miscounted. A stranger planted INSIDE an arm raises nothing.
 */
export function gradeF(windows, lines, machineId = MACHINE_ID, expected = null) {
  const out = [];
  const counts = lines
    .map((l) => ({ t: l.t, m: FOREIGN_LINE.exec(l.line) }))
    .filter((x) => x.m !== null && x.m[1] === machineId)
    .map((x) => ({ t: x.t, n: Number(x.m[2]) }));
  const rescues = lines.map((l) => ({ t: l.t, m: RESCUE_LINE.exec(l.line) })).filter((x) => x.m !== null && x.m[1] === machineId);
  const report = {};
  for (const arm of F_ARMS) {
    const w = windows[arm];
    if (w === undefined) continue;
    const before = counts.filter((c) => c.t < w.start);
    const logged = before.length === 0 ? 0 : before[before.length - 1].n;
    const planted = expected === null || typeof expected.floor !== 'number' ? 0 : expected.floor + (expected.strangers ?? []).filter((t) => t < w.start).length;
    const baseline = Math.max(logged, planted);
    const inside = counts.filter((c) => c.t >= w.start && c.t <= (w.end ?? Number.POSITIVE_INFINITY));
    const peak = inside.reduce((m, c) => Math.max(m, c.n), baseline);
    const rescued = rescues.filter((x) => x.t >= w.start && x.t <= (w.end ?? Number.POSITIVE_INFINITY)).length;
    report[arm] = { baseline, peak, rescued };
    if (peak > baseline) out.push(`F ${arm}: ${machineId} was counted holding ${String(peak)} session(s) Tortie did not create, above the ${String(baseline)} read before the arm`);
    if (rescued > 0) out.push(`F ${arm}: the rescue said it "could not account for" a session ${String(rescued)} time(s)`);
  }
  return { findings: out, report };
}

/** The P326_ARMS subset in launch order, any case; unknown names are refused. */
export function chooseArms(raw) {
  const text = String(raw ?? '').trim();
  if (text === '') return { arms: [...ALL_ARMS], bad: [] };
  const names = text.split(',').map((s) => s.trim()).filter((s) => s !== '');
  const canon = (s) => ALL_ARMS.find((a) => a.toLowerCase() === s.toLowerCase()) ?? null;
  const bad = names.filter((n) => canon(n) === null);
  const wanted = new Set(names.map(canon).filter((n) => n !== null));
  return { arms: ALL_ARMS.filter((a) => wanted.has(a)), bad };
}

/** The staleness grader, p292's and p320's by value. */
export function staleSentence(sources, bundle) {
  if (bundle === null) return 'out/ holds no bundle for the sources this run reads; build first.';
  const newer = sources.filter(([, mtime]) => mtime > bundle[1]).map(([path, mtime]) => `${path} is ${((mtime - bundle[1]) / 1000).toFixed(1)} s newer than ${bundle[0]}`);
  if (newer.length === 0) return null;
  return `out/ is older than the sources this run reads; build first (${newer.join('; ')}).`;
}

const median = (xs) => {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/**
 * §9.6, the side by side. For every arm, the call-to-drawn times of the creates
 * that drew without a refusal at each build: HEAD's median may not exceed the
 * parent's by more than 250 ms, and HEAD's slowest may not exceed the parent's
 * slowest by more than 1,000 ms. Ec's quit time may not exceed the parent's by
 * more than 1,000 ms. Answers `{ findings, table }`.
 */
export function sideBySide(parent, head) {
  const times = (readings, arm) =>
    readings
      .filter((r) => r.arm === arm && (r.refusals ?? []).length === 0)
      .map((r) => {
        const d = first(r.draws, r.callAt);
        return d === null ? null : d - r.callAt;
      })
      .filter((x) => x !== null);
  const findings = [];
  const table = [];
  for (const arm of ['G', 'A', 'B', 'Ed']) {
    const p = times(parent, arm);
    const h = times(head, arm);
    if (p.length === 0 || h.length === 0) {
      table.push({ arm, parent: p.length, head: h.length, note: 'nothing to compare' });
      continue;
    }
    const row = { arm, parentMedian: median(p), headMedian: median(h), parentSlowest: Math.max(...p), headSlowest: Math.max(...h), parent: p.length, head: h.length };
    table.push(row);
    if (row.headMedian - row.parentMedian > SIDE_MEDIAN_MS) findings.push(`${arm}: HEAD's median call to drawn ${String(row.headMedian)} ms is ${String(row.headMedian - row.parentMedian)} ms over the parent's ${String(row.parentMedian)} ms`);
    if (row.headSlowest - row.parentSlowest > SIDE_SLOWEST_MS) findings.push(`${arm}: HEAD's slowest ${String(row.headSlowest)} ms is ${String(row.headSlowest - row.parentSlowest)} ms over the parent's slowest ${String(row.parentSlowest)} ms`);
  }
  const quit = (readings) => readings.find((r) => r.arm === 'Ec' && typeof r.quitMs === 'number')?.quitMs ?? null;
  const pq = quit(parent);
  const hq = quit(head);
  table.push({ arm: 'Ec', parentQuitMs: pq, headQuitMs: hq });
  if (pq !== null && hq !== null && hq - pq > SIDE_QUIT_MS) findings.push(`Ec: HEAD's quit took ${String(hq)} ms, ${String(hq - pq)} ms over the parent's ${String(pq)} ms`);
  return { findings, table };
}

/** The far `list-sessions -F '#{session_id} #{session_name} #{@gmux-id}'` answer as rows. */
export function parseFarSessions(text) {
  const out = [];
  for (const line of String(text).split('\n')) {
    if (line.trim() === '') continue;
    const parts = line.split(' ');
    out.push({ tmuxId: parts[0], name: parts.slice(1, -1).join(' '), gmuxId: parts[parts.length - 1] ?? '' });
  }
  return out;
}

/** Local ssh attach command lines naming one `$-id`, from `ps -axo pid=,command=`. */
export function sshAttaches(psText, tmuxId) {
  return String(psText)
    .split('\n')
    .filter((l) => /\bssh\b/.test(l) && l.includes('attach-session') && l.includes(`=${tmuxId}'`));
}

// ---------------------------------------------------------------------------
// --self-test. Every grader on a HEAD shaped reading and on a parent shaped one.
// ---------------------------------------------------------------------------
async function selfTest() {
  const log = [
    "1000 11 '-L' 'gmux-p326-x' '-f' '/dev/null' '-C' 'new-session' '-A' '-s' 'gmux-control'",
    "2000 12 '-L' 'gmux-p326-x' '-f' '/dev/null' 'list-sessions' '-F' '#{session_id} #{q:session_name}'",
    "2100 13 '-L' 'gmux-p326-x' '-f' '/dev/null' 'new-session' '-d' '-P' '-F' '#{session_id}' '-s' 'p326-b-01' '-e' 'GMUX_SESSION_ID=u-1'",
    "2150 14 '-L' 'gmux-p326-x' '-f' '/dev/null' 'set-option' '-t' '$3' '@gmux-id' 'u-1'",
    '2150 14 # held stamp-delay-ms 1500',
    "2400 15 '-L' 'gmux-p326-x' '-f' '/dev/null' 'list-sessions' '-F' '#{session_id}'",
    '3650 14 # released stamp-delay-ms 1500',
    "3700 16 '-L' 'gmux-p326-x' '-f' '/dev/null' 'set-option' '-t' '$3' '@gmux-name' 'it'\\''s'",
    "3800 17 '-L' 'gmux-p326-x' '-f' '/dev/null' 'list-sessions' '-F' '#{session_id}'",
    "4000 18 '-L' 'gmux-p326-x' '-f' '/dev/null' 'new-session' '-d' '-P' '-F' '#{session_id}' '-s' 'p326-ea-1' '-e' 'GMUX_SESSION_ID=u-2'",
    '4001 18 # stranger p326-ea-1 $4',
    "4100 19 '-L' 'gmux-p326-x' '-f' '/dev/null' 'show-environment' '-t' '$4' 'GMUX_SESSION_ID'",
    "4200 20 '-L' 'gmux-p326-x' '-f' '/dev/null' '-u' 'attach-session' '-t' '=$3'",
    ''
  ].join('\n');
  const records = parseFarLog(log);
  const tl = farTimeline(records);
  const facts = farCreateFacts(tl, { tmuxName: 'p326-b-01', sessionId: 'u-1' });
  const base = { name: 'p326-a-01', callAt: 10_000, refusals: [], statuses: [{ t: 10_100, s: 'unknown' }, { t: 11_000, s: 'running' }], mounts: [10_200], unmounts: [], draws: [11_100], overlays: [] };
  const refusal = (code, message, t) => ({ code, message, detail: 'p326-a-01', t });
  const fixtures = [
    ['shellWords undoes zsh (qq), a quote inside a word included', () => shellWords("'a b' 'it'\\''s' '#{x}' ''"), ['a b', "it's", '#{x}', '']],
    ['farVerb skips -L, -f and -u', () => farVerb(['-L', 's', '-f', '/dev/null', '-u', 'attach-session', '-t', '=$3']), { globals: ['-L', 's', '-f', '/dev/null', '-u'], verb: 'attach-session', rest: ['-t', '=$3'] }],
    ['parseFarLog reads invocations and notes', () => records.map((r) => (r.argv ? 'i' : 'n')).join(''), 'iiiininiiinii'],
    ['farTimeline places a held stamp at its release', () => tl.find((e) => e.pid === 14).eff, 3650],
    ['farCreateFacts: window, $-id and the list inside it', () => facts, { seen: true, newSessionAt: 2100, stampAt: 3650, tmuxId: '$3', windowMs: 1550, listsInWindow: [2400] }],
    ['farCreateFacts: a create the log never saw', () => farCreateFacts(tl, { tmuxName: 'p326-a-09', sessionId: 'u-9' }).seen, false],
    ['strangersIn reads the wrapper note', () => strangersIn(records), [{ name: 'p326-ea-1', tmuxId: '$4', t: 4001 }]],
    ['farTouches counts by target, =$ and bare', () => farTouches(tl, '$3'), { 'set-option': 2, 'attach-session': 1, 'kill-session': 0, 'show-environment': 0 }],
    ['farTouches: the stranger read once', () => farTouches(tl, '$4')['show-environment'], 1],
    ['parseRefusal reads the payload', () => parseRefusal(`Error occurred in handler for 'sessions:attach': Error: {"code":"SESSION_NOT_FOUND","message":"${LOCAL_GONE}","detail":"p320-fs"}`), { code: 'SESSION_NOT_FOUND', message: LOCAL_GONE, detail: 'p320-fs' }],
    ['parseRefusal ignores other lines', () => parseRefusal('[gmux-socket] local tmux socket: x'), null],
    ['attribute by name, never a longer name', () => attributeRefusal({ detail: 'p326far p326-a-1: waited', t: 5 }, [{ key: 'x', tmuxName: 'p326-a-10', intervals: [] }, { key: 'y', tmuxName: 'p326-a-1', intervals: [] }]), 'y'],
    ['attribute by the one pane mounted then', () => attributeRefusal({ detail: 'status: exited', t: 500 }, [{ key: 'x', tmuxName: 'a', intervals: [[100, 300]] }, { key: 'y', tmuxName: 'b', intervals: [[450, null]] }]), 'y'],
    ['attribute: two panes mounted then is nobody', () => attributeRefusal({ detail: 'status: exited', t: 500 }, [{ key: 'x', tmuxName: 'a', intervals: [[100, null]] }, { key: 'y', tmuxName: 'b', intervals: [[450, null]] }]), null],
    ['boundAt skips unknown and restorable', () => boundAt([{ t: 1, s: 'unknown' }, { t: 2, s: 'restorable' }, { t: 3, s: 'running' }]), 3],
    ['alone: an empty tab and only its own pane', () => aloneVerdict({ panesBefore: [], panesDuring: ['id1'] }, ['id1']).alone, true],
    ['alone: another pane during the create is not alone', () => aloneVerdict({ panesBefore: [], panesDuring: ['id1', 'other'] }, ['id1']).alone, false],
    ["alone: Ed's second may find its pair's first on screen before it", () => aloneVerdict({ panesBefore: ['idA'], panesDuring: ['idA', 'idB'] }, ['idB', 'idA']).alone, true],
    ['alone: a stranger pane before the create is still not alone', () => aloneVerdict({ panesBefore: ['other'], panesDuring: ['id1'] }, ['id1']).alone, false],
    ['A HEAD: drawn, no refusal', () => gradeCreate({ ...base, arm: 'A' }), []],
    ['A parent: the local sentence and a stall', () => gradeCreate({ ...base, arm: 'A', draws: [], refusals: [refusal('SESSION_NOT_FOUND', LOCAL_GONE, 10_300)], overlays: [{ title: TITLE_GONE }] }).length, 3],
    ['G parent-free: a local stall is a finding', () => gradeCreate({ ...base, arm: 'G', name: 'p326-g-01', draws: [45_000] }).length, 1],
    ['B HEAD: drawn 100 ms after bound', () => gradeCreate({ ...base, arm: 'B' }), []],
    ['B: drawn 2.5 s after bound is a finding', () => gradeCreate({ ...base, arm: 'B', draws: [13_500] }).length, 1],
    ['Ed: the one selected after the pair settled is graded from its select', () => gradeCreate({ ...base, arm: 'Ed', pairRole: 'first', selectAt: 20_000, draws: [20_400] }), []],
    ['Ed: the one the tab showed and never drew is a stall', () => gradeCreate({ ...base, arm: 'Ed', pairRole: 'second', draws: [] }).length, 1],
    [
      'C HEAD: refusal at 7 s, the overlay, and Try again draws',
      () =>
        gradeCreate({
          ...base,
          arm: 'C',
          mounts: [10_200],
          draws: [21_000],
          refusals: [refusal('TMUX_UNREACHABLE', ATTACH_NOT_HEARD, 17_250)],
          overlays: [{ title: 'Machine unreachable' }, { title: TITLE_CANT, detail: ATTACH_NOT_HEARD, action: TRY_AGAIN }],
          clickAt: 20_000
        }),
      []
    ],
    ['C parent: no Try again, the local sentence', () => gradeCreate({ ...base, arm: 'C', draws: [], refusals: [refusal('SESSION_NOT_FOUND', LOCAL_GONE, 10_300)], overlays: [{ title: TITLE_GONE }], clickAt: null }).length, 5],
    ['Eb HEAD: nothing left behind, drawn on return', () => gradeCreate({ ...base, arm: 'Eb', clientsAfter: 0, sshAfter: 0, backAt: 20_000, draws: [20_900] }), []],
    ['Eb: a client left behind is named', () => gradeCreate({ ...base, arm: 'Eb', clientsAfter: 1, sshAfter: 1, backAt: 20_000, draws: [20_900] }).length, 2],
    [
      'Ea HEAD, as measured at both builds: "Session not found.", unmounted at 7.6 s, the stranger read once per launch',
      () =>
        gradeCreate({
          ...base,
          arm: 'Ea',
          draws: [],
          unmounts: [17_800],
          refusals: [refusal('SESSION_NOT_FOUND', 'Session not found.', 11_000)],
          presentAtEnd: false,
          stranger: { tmuxId: '$4' },
          strangerTouches: { 'set-option': 0, 'attach-session': 0, 'kill-session': 0, 'show-environment': 2 },
          strangerReadsPerLaunch: [1, 1],
          strangerAtEnd: true
        }),
      []
    ],
    [
      'Ea: the remote sentence is as good',
      () =>
        gradeCreate({
          ...base,
          arm: 'Ea',
          draws: [],
          refusals: [refusal('SESSION_NOT_FOUND', REMOTE_ABSENT, 11_000)],
          presentAtEnd: false,
          stranger: { tmuxId: '$4' },
          strangerTouches: { 'set-option': 0, 'attach-session': 0, 'kill-session': 0, 'show-environment': 1 },
          strangerAtEnd: true
        }),
      []
    ],
    [
      "Ea: the stranger's screen drawn, a Try again refusal, and two reads in one launch are three findings",
      () =>
        gradeCreate({
          ...base,
          arm: 'Ea',
          draws: [12_000],
          refusals: [refusal('TMUX_UNREACHABLE', ATTACH_NOT_HEARD, 11_000)],
          presentAtEnd: false,
          stranger: { tmuxId: '$4' },
          strangerTouches: { 'set-option': 0, 'attach-session': 0, 'kill-session': 0, 'show-environment': 2 },
          strangerReadsPerLaunch: [2, 0],
          strangerAtEnd: true
        }).length,
      3
    ],
    [
      'Ea parent: the local sentence, and a stranger stamped and read twice',
      () =>
        gradeCreate({
          ...base,
          arm: 'Ea',
          draws: [],
          refusals: [refusal('SESSION_NOT_FOUND', LOCAL_GONE, 11_000)],
          presentAtEnd: false,
          stranger: { tmuxId: '$4' },
          strangerTouches: { 'set-option': 4, 'attach-session': 0, 'kill-session': 0, 'show-environment': 2 },
          strangerAtEnd: true
        }).length,
      3
    ],
    ['Ec HEAD: exited on its own, nothing left', () => gradeCreate({ ...base, arm: 'Ec', exitedOnItsOwn: true, clientsAfter: 0, sshAfter: 0 }), []],
    ['D HEAD: drawn after the relaunch', () => gradeCreate({ ...base, arm: 'D', mounts: [1000], draws: [4000] }), []],
    ['D readable only when the first list ran after the mount', () => [readable({ arm: 'D', mounts: [1000], firstListAt: 2500 }).ok, readable({ arm: 'D', mounts: [1000], firstListAt: 900 }).ok], [true, false]],
    ['a far create the far log never saw is UNREADABLE', () => readable({ arm: 'A', alone: true, far: { seen: false } }).ok, false],
    [
      'F HEAD: the count holds and nothing is rescued',
      () => gradeF({ A: { start: 100, end: 200 } }, [{ t: 50, line: `${MACHINE_ID} holds 1 session(s) Tortie did not create. x` }, { t: 150, line: `${MACHINE_ID} holds 1 session(s) Tortie did not create.` }]).findings,
      []
    ],
    [
      'F parent: the count rises and the rescue speaks',
      () =>
        gradeF({ A: { start: 100, end: 200 } }, [
          { t: 50, line: `${MACHINE_ID} holds 1 session(s) Tortie did not create.` },
          { t: 150, line: `${MACHINE_ID} holds 2 session(s) Tortie did not create.` },
          { t: 160, line: `${MACHINE_ID} held 1 session(s) Tortie created and could not account for, and they are back on the list with their names.` }
        ]).findings.length,
      2
    ],
    [
      'F: a stranger Ea planted before Ec raises what Ec starts with',
      () =>
        gradeF({ Ec: { start: 500, end: 600 } }, [
          { t: 50, line: `${MACHINE_ID} holds 1 session(s) Tortie did not create.` },
          { t: 550, line: `${MACHINE_ID} holds 3 session(s) Tortie did not create.` }
        ], MACHINE_ID, { floor: 1, strangers: [200, 300] }).findings,
      []
    ],
    [
      'F: the same line without the strangers is a rise',
      () =>
        gradeF({ Ec: { start: 500, end: 600 } }, [
          { t: 50, line: `${MACHINE_ID} holds 1 session(s) Tortie did not create.` },
          { t: 550, line: `${MACHINE_ID} holds 3 session(s) Tortie did not create.` }
        ]).findings.length,
      1
    ],
    [
      'F: a stranger planted INSIDE the arm raises nothing',
      () =>
        gradeF({ Ec: { start: 500, end: 600 } }, [
          { t: 50, line: `${MACHINE_ID} holds 1 session(s) Tortie did not create.` },
          { t: 560, line: `${MACHINE_ID} holds 2 session(s) Tortie did not create.` }
        ], MACHINE_ID, { floor: 1, strangers: [550] }).findings.length,
      1
    ],
    ['arms: empty means all nine in launch order', () => chooseArms(''), { arms: ALL_ARMS, bad: [] }],
    ['arms: a subset keeps launch order, any case', () => chooseArms('b, a,ED'), { arms: ['A', 'B', 'Ed'], bad: [] }],
    ['arms: an unknown name is named', () => chooseArms('A,E'), { arms: ['A'], bad: ['E'] }],
    ['stale: a newer build is fresh', () => staleSentence([['a.ts', 1000]], ['out/main/index.js', 2000]), null],
    ['stale: no bundle is a refusal', () => staleSentence([['a.ts', 1000]], null), 'out/ holds no bundle for the sources this run reads; build first.'],
    [
      'side by side: HEAD within the tolerances',
      () => sideBySide([{ arm: 'A', callAt: 0, draws: [1000], refusals: [] }, { arm: 'Ec', quitMs: 3000 }], [{ arm: 'A', callAt: 0, draws: [1200], refusals: [] }, { arm: 'Ec', quitMs: 3500 }]).findings,
      []
    ],
    [
      'side by side: a slower HEAD and a longer quit are named',
      () => sideBySide([{ arm: 'A', callAt: 0, draws: [1000], refusals: [] }, { arm: 'Ec', quitMs: 3000 }], [{ arm: 'A', callAt: 0, draws: [2500], refusals: [] }, { arm: 'Ec', quitMs: 4500 }]).findings.length,
      3
    ],
    ['far sessions: an unstamped row reads an empty id', () => parseFarSessions('$0 gmux-control \n$3 p326-a-01 u-1\n'), [{ tmuxId: '$0', name: 'gmux-control', gmuxId: '' }, { tmuxId: '$3', name: 'p326-a-01', gmuxId: 'u-1' }]],
    ['ssh attaches: by the quoted exact target only', () => sshAttaches("1 /usr/bin/ssh -t x 'tmux' -u attach-session -t '=$3'\n2 /usr/bin/ssh -t x attach-session -t '=$31'\n", '$3').length, 1],
    ['the env file quotes a quote', () => farEnvText({ real: "/a'b", log: '/l', rules: '/r', farHome: '/h' }).split('\n')[0], "REAL='/a'\\''b'"],
    ['hidden agents: the overlay renames binaries and argv', () => hidden.hiddenAgentsOverlay('p326').agents.every((a) => a.binaries[0] === `p326-never-${a.id}` && a.launch.argv[0] === a.binaries[0]), true],
    ['hidden agents: a clean scan passes', () => hidden.hiddenAgentsScanVerdict([{ id: 'claude', installed: true, binPath: '/x' }, { id: 'gemini', installed: false, binPath: null, version: null }]).ok, true],
    ['hidden agents: a resolved gemini stops the run', () => hidden.hiddenAgentsScanVerdict([{ id: 'gemini', installed: true, binPath: '/opt/homebrew/bin/gemini' }]).ok, false],
    ['hidden agents: a version alone stops the run', () => hidden.hiddenAgentsScanVerdict([{ id: 'grok', installed: false, binPath: null, version: '1.0' }]).ok, false],
    ['hidden agents: no list is not a pass', () => hidden.hiddenAgentsScanVerdict(null).ok, false],
    [
      'hidden agents: the precheck refuses a copy found',
      () => hidden.hiddenAgentsPrecheckVerdict({ parseProblems: 0, mergeProblems: 0, rows: Object.fromEntries(hidden.HIDDEN_AGENT_IDS.map((id) => [id, { binaries: [`p326-never-${id}`], copies: id === 'qwen' ? 1 : 0 }])) }, 'p326').ok,
      false
    ]
  ];
  let ok = true;
  for (const [label, run, want] of fixtures) {
    let got;
    try {
      got = run();
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

// ---------------------------------------------------------------------------
// --compare. §9.6 over two readings files. Launches nothing.
// ---------------------------------------------------------------------------
function compare(parentPath, headPath) {
  const read = (p) => JSON.parse(readFileSync(p, 'utf8')).readings.creates ?? [];
  const { findings, table } = sideBySide(read(parentPath), read(headPath));
  for (const row of table) say(`side by side ${J(row)}`);
  if (findings.length > 0) {
    for (const f of findings) process.stderr.write(`${TAG}   ${f}\n`);
    process.stderr.write(`${TAG} SIDE BY SIDE FAILED: ${String(findings.length)} scenario(s) worse at HEAD.\n`);
    return 1;
  }
  say('side by side PASS: no scenario the probe measures is worse at HEAD');
  return 0;
}

/** A reading that cannot be graded at all: the run exits 2 rather than pass or fail it. */
class Unreadable extends Error {}

const isMain = process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain && process.argv.includes('--self-test')) process.exit((await selfTest()) ? 0 : 1);
if (isMain && process.argv.includes('--compare')) {
  const at = process.argv.indexOf('--compare');
  const [p, h] = [process.argv[at + 1], process.argv[at + 2]];
  if (!p || !h) {
    console.error(`${TAG} usage: --compare <parent readings.json> <head readings.json>`);
    process.exit(2);
  }
  process.exit(compare(p, h));
}
if (isMain) await main();

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

async function main() {
  const refuse = (why) => {
    console.error(`${TAG} REFUSED. ${why}`);
    process.exit(2);
  };
  const socket = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
  if (socket === '') refuse('no GMUX_TMUX_SOCKET. Run `npm run probe:p326`, which wraps this file in build/harness-socket.mjs and build/with-scratch-machine.mjs.');
  if (socket === 'gmux' || socket === 'default') refuse(`"${socket}" is not a harness socket.`);
  if (!socket.startsWith('gmux-p326')) refuse(`"${socket}" is not a gmux-p326 harness socket.`);
  const harnessDir = (process.env['GMUX_HARNESS_DIR'] ?? '').trim();
  if (harnessDir === '') refuse('no GMUX_HARNESS_DIR, so there is nowhere scratch to put the HOME and the profile.');
  const { arms: chosen, bad: badArms } = chooseArms(process.env['P326_ARMS']);
  if (badArms.length > 0) refuse(`P326_ARMS names ${badArms.join(', ')}; the arms are ${ALL_ARMS.join(', ')}.`);
  if (chosen.length === 0) refuse('P326_ARMS chose nothing.');
  const on = (arm) => chosen.includes(arm);
  const wantsMachine = chosen.some((a) => FAR_ARMS.includes(a));

  const otherCheckout = (process.env['P326_CHECKOUT'] ?? '').trim();
  const checkout = otherCheckout !== '' ? resolve(otherCheckout) : REPO;
  const tag = otherCheckout !== '' ? 'checkout' : 'head';
  if (!existsSync(join(checkout, 'out', 'main', 'index.js'))) refuse(`${join(checkout, 'out', 'main', 'index.js')} is missing. Build that checkout first.`);

  const RENDERER_SOURCES = [join('src', 'renderer', 'terminal', 'TerminalPane.tsx'), join('src', 'renderer', 'state', 'sessions-slice.ts')];
  const MAIN_SOURCES = [
    join('src', 'main', 'sessions', 'core.ts'),
    join('src', 'main', 'machines', 'remote-sessions.ts'),
    join('src', 'main', 'machines', 'remote-copy.ts'),
    join('src', 'main', 'sessions', 'far-attach.ts'),
    join('src', 'main', 'machines', 'create-inflight.ts')
  ];
  {
    const present = (rel) => existsSync(join(checkout, rel));
    const stat = (rel) => [rel, statSync(join(checkout, rel)).mtimeMs];
    const assets = join(checkout, 'out', 'renderer', 'assets');
    let renderer = null;
    if (existsSync(assets)) {
      for (const name of readdirSync(assets)) {
        if (!/^index-[^.]+\.(?:css|js)$/.test(name)) continue;
        const mtime = statSync(join(assets, name)).mtimeMs;
        if (renderer === null || mtime > renderer[1]) renderer = [join('out', 'renderer', 'assets', name), mtime];
      }
    }
    const mainPath = join(checkout, 'out', 'main', 'index.js');
    const stale =
      staleSentence(RENDERER_SOURCES.filter(present).map(stat), renderer) ??
      staleSentence(MAIN_SOURCES.filter(present).map(stat), [join('out', 'main', 'index.js'), statSync(mainPath).mtimeMs]);
    if (stale !== null) refuse(`${tag} ${checkout}: ${stale}`);
  }
  const executable = (name, path) => {
    try {
      accessSync(path, fsConstants.X_OK);
      if (!statSync(path).isFile()) throw new Error('not a file');
    } catch {
      refuse(`${name} ${path} is not an executable file.`);
    }
  };

  let carriage = null;
  const configRoot = (process.env['GMUX_CONFIG_ROOT'] ?? '').trim();
  if (wantsMachine) {
    try {
      carriage = JSON.parse(readFileSync(join(configRoot, 'p69-carriage.json'), 'utf8'));
    } catch {
      carriage = null;
    }
    if (configRoot === '' || carriage === null) refuse('a far arm was chosen and there is no p69-carriage.json inside GMUX_CONFIG_ROOT. Run me inside node build/with-scratch-machine.mjs, which `npm run probe:p326` does.');
    if (typeof carriage.tmuxTmp !== 'string' || !carriage.tmuxTmp.startsWith('/tmp/')) refuse(`the carriage names ${J(carriage.tmuxTmp)} as the machine's own TMUX_TMPDIR, which is not a scratch directory under /tmp.`);
  }
  const farReal = (process.env['P326_FAR_TMUX'] ?? '').trim() || (carriage?.remoteTmuxPath ?? '');
  if (wantsMachine) executable('P326_FAR_TMUX', farReal);
  const farVersion = wantsMachine ? (spawnSync(farReal, ['-V'], { encoding: 'utf8' }).stdout ?? '').trim() : null;
  const farLabel = (farVersion ?? 'none').replace(/^tmux\s+/, '').replace(/[^A-Za-z0-9.-]/g, '-');
  const outDir = resolve(REPO, (process.env['P326_OUT_DIR'] ?? '').trim() || join('out', 'p326'));
  mkdirSync(outDir, { recursive: true });
  const keep = (process.env['P326_KEEP'] ?? '').trim() === '1';

  // -------------------------------------------------------------------------
  // The scratch world.
  // -------------------------------------------------------------------------
  mkdirSync(join(harnessDir, 'p326'), { recursive: true });
  const root = realpathSync(join(harnessDir, 'p326'));
  const home = join(root, 'h');
  const farHome = join(root, 'far-home');
  const localDir = join(root, 'local');
  const farDir = join(root, 'far');
  const wrapDir = join(root, 'wrap');
  const profile = join(root, `p-${tag}`);
  for (const d of [home, farHome, localDir, farDir, wrapDir, profile]) {
    rmSync(d, { recursive: true, force: true });
    mkdirSync(d, { recursive: true });
  }
  writeFileSync(join(home, '.zshrc'), "PS1='p326 %# '\nunset HISTFILE\n");
  writeFileSync(join(home, '.hushlogin'), '');
  writeFileSync(join(farHome, '.zshrc'), "PS1='p326 %# '\nunset HISTFILE\n");
  writeFileSync(join(farHome, '.hushlogin'), '');
  const wrapper = join(wrapDir, 'far-tmux.sh');
  const farLog = join(wrapDir, 'far.log');
  const rules = join(wrapDir, 'rules');
  for (const p of [root, wrapper, farLog, rules, farHome, farReal, localDir, farDir]) {
    if (/['"\s]/.test(p)) refuse(`${p} holds a quote or a space, and it is written into a shell file and a machine row as one word.`);
  }
  if (wantsMachine) {
    copyFileSync(join(HERE, 'far-tmux.sh'), wrapper);
    chmodSync(wrapper, 0o755);
    writeFileSync(join(wrapDir, 'far-tmux.env'), farEnvText({ real: farReal, log: farLog, rules, farHome }));
    writeFileSync(farLog, '');
  }
  const writeRules = (lines) => {
    writeFileSync(`${rules}.tmp`, lines.length === 0 ? '' : `${lines.join('\n')}\n`);
    renameSync(`${rules}.tmp`, rules);
    rmSync(`${rules}.first-list`, { recursive: true, force: true });
  };
  writeRules([]);
  if (wantsMachine) {
    const configDir = join(profile, 'gmux', 'config');
    mkdirSync(configDir, { recursive: true, mode: 0o700 });
    writeFileSync(
      join(configDir, 'machines.json'),
      `${J({ schema: 1, machines: [{ id: MACHINE_ID, label: 'p326 loopback', host: carriage.host, user: carriage.user, port: carriage.port, remoteTmuxPath: wrapper }] })}\n`,
      'utf8'
    );
    const knownMachines = join(profile, 'gmux', 'machines', 'known-machines');
    mkdirSync(dirname(knownMachines), { recursive: true });
    writeFileSync(knownMachines, keyscanText({ host: carriage.host, port: carriage.port, caller: CALLER }), 'utf8');
  }

  // The five agents, hidden by this checkout's own parser, before anything starts.
  const pre = hidden.hiddenAgentsPrecheck({ checkout, prefix: PREFIX, home, userPath: process.env['PATH'] ?? '' });
  if (!pre.ok) refuse(`${checkout}'s own overlay parser does not hide the five agents: ${pre.said}`);

  const historyPath = join(homedir(), '.zsh_history');
  const statHistory = () => {
    try {
      const s = statSync(historyPath);
      return { mtimeMs: s.mtimeMs, size: s.size };
    } catch {
      return null;
    }
  };

  const findings = [];
  const unreadable = [];
  const readings = { tag, checkout, socket, arms: chosen, farReal: wantsMachine ? farReal : null, farVersion, notes: [], launches: [], creates: [] };
  readings.historyBefore = statHistory();
  readings.hiddenPrecheck = pre;
  const note = (l) => {
    readings.notes.push(l);
    say(`note: ${l}`);
  };
  say(`${tag}: measuring ${checkout}, arms ${chosen.join(',')}, socket ${socket}`);
  if (wantsMachine) say(`${tag}: the loopback machine on ${String(carriage.host)}:${String(carriage.port)} runs ${farReal} (${String(farVersion)}) behind ${wrapper}, sessions under ${String(carriage.tmuxTmp)}`);

  // -------------------------------------------------------------------------
  // The far side, read by this file with the REAL binary. Never the wrapper.
  // -------------------------------------------------------------------------
  const farTmux = (args) =>
    spawnSync(farReal, ['-L', socket, '-f', '/dev/null', ...args], { encoding: 'utf8', timeout: 10_000, env: { ...process.env, TMUX_TMPDIR: carriage.tmuxTmp } });
  const farSessions = () => {
    const r = farTmux(['list-sessions', '-F', '#{session_id} #{session_name} #{@gmux-id}']);
    return r.status === 0 ? parseFarSessions(r.stdout) : [];
  };
  const farClients = () => {
    const r = farTmux(['list-clients', '-F', '#{session_id} #{client_session}']);
    return r.status === 0 ? r.stdout.split('\n').filter((l) => l.trim() !== '').map((l) => ({ tmuxId: l.split(' ')[0], session: l.split(' ').slice(1).join(' ') })) : [];
  };
  const psText = () => spawnSync('/bin/ps', ['-axo', 'pid=,command='], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }).stdout ?? '';
  let farEnded = false;
  const endFarServer = () => {
    if (farEnded || !wantsMachine || carriage === null) return;
    farEnded = true;
    const asked = farTmux(['display-message', '-p', '#{pid}']);
    const pid = Number((asked.stdout ?? '').trim());
    if (!Number.isInteger(pid) || pid <= 1) return;
    try {
      process.kill(pid, 'SIGKILL');
      say(`ended the loopback machine's tmux server, pid ${String(pid)}`);
    } catch {
      /* already gone */
    }
  };
  process.on('exit', endFarServer);
  const farRecords = () => parseFarLog(existsSync(farLog) ? readFileSync(farLog, 'utf8') : '');

  // -------------------------------------------------------------------------
  // The page kit. One expression, the same text at every checkout, that puts
  // this probe's readers and a 50 ms recorder on window.__p326. No product file
  // gains a hook: a pane's Terminal is found through the React fiber of its
  // `.gmux-terminal-mount`, the walk build/p320/probe-p320.mjs wrote (after
  // probe:p292), here started from ONE pane's mount rather than the first.
  // -------------------------------------------------------------------------
  const PAGE_KIT = String.raw`
(() => {
  if (window.__p326 && window.__p326.timer) clearInterval(window.__p326.timer);
  const termOf = (mount) => {
    if (!mount) return null;
    const key = Object.keys(mount).find((k) => k.startsWith('__reactFiber$'));
    if (!key) return null;
    let f = mount[key];
    for (let depth = 0; f && depth < 60; depth += 1, f = f.return) {
      let h = f.memoizedState;
      let n = 0;
      while (h && typeof h === 'object' && n < 300) {
        const ms = h.memoizedState;
        if (ms && typeof ms === 'object' && 'current' in ms) {
          const c = ms.current;
          if (c && typeof c === 'object' && c.buffer && typeof c.write === 'function' && typeof c.rows === 'number' && typeof c.cols === 'number') return c;
        }
        h = h.next;
        n += 1;
      }
    }
    return null;
  };
  const paneOf = (id) => document.querySelector('.gmux-terminal-pane[data-session-id="' + CSS.escape(id) + '"]');
  const drawnIn = (pane) => {
    const term = termOf(pane.querySelector('.gmux-terminal-mount'));
    if (!term) return false;
    const b = term.buffer.active;
    for (let i = 0; i < term.rows; i += 1) {
      const l = b.getLine(b.viewportY + i);
      const s = l ? l.translateToString(true) : '';
      if (s.trim() !== '' && s.includes('p326')) return true;
    }
    return false;
  };
  const text = (el) => (el ? (el.textContent || '').replace(/\s+/g, ' ').trim() : null);
  const kit = { watched: {}, creates: {}, timer: null, busy: false, ticks: 0, errors: 0, startedAt: Date.now() };
  kit.panes = () => [...document.querySelectorAll('.gmux-terminal-pane')].map((p) => p.getAttribute('data-session-id'));
  kit.watch = (name, id) => {
    if (!kit.watched[name]) {
      kit.watched[name] = { name, id: id || null, tmuxName: null, machineId: null, heldAt: null, present: false, goneAt: null, statuses: [], mounts: [], unmounts: [], draws: [], overlays: [], overlayKey: null, mounted: false, drawn: false, during: false, panesDuring: [] };
    }
    return kit.watched[name];
  };
  kit.tick = async () => {
    const st = await window.__gmuxP95.state();
    const now = Date.now();
    const panes = kit.panes();
    for (const w of Object.values(kit.watched)) {
      const row = st.sessions.find((s) => (w.id !== null ? s.id === w.id : s.name === w.name));
      if (row) {
        if (w.id === null) w.id = row.id;
        w.tmuxName = row.tmuxName;
        w.machineId = row.machineId;
        if (w.heldAt === null) w.heldAt = now;
        w.present = true;
        const last = w.statuses[w.statuses.length - 1];
        if (!last || last.s !== row.status) w.statuses.push({ t: now, s: row.status });
      } else if (w.present) {
        w.present = false;
        w.goneAt = now;
        w.statuses.push({ t: now, s: '(gone)' });
      }
      if (w.during) for (const p of panes) if (!w.panesDuring.includes(p)) w.panesDuring.push(p);
      if (w.id === null) continue;
      const pane = paneOf(w.id);
      if (pane) {
        if (!w.mounted) { w.mounted = true; w.drawn = false; w.mounts.push(now); }
        const t = text(pane.querySelector('.gmux-terminal-overlay-title'));
        const d = text(pane.querySelector('.gmux-terminal-overlay-detail'));
        const a = text(pane.querySelector('.gmux-terminal-overlay button'));
        const key = JSON.stringify([t, d, a]);
        if (key !== w.overlayKey) { w.overlayKey = key; w.overlays.push({ t: now, title: t, detail: d, action: a }); }
        if (!w.drawn && drawnIn(pane)) { w.drawn = true; w.draws.push(now); }
      } else if (w.mounted) {
        w.mounted = false;
        w.drawn = false;
        w.unmounts.push(now);
      }
    }
  };
  kit.start = () => {
    if (kit.timer) return true;
    kit.timer = setInterval(() => {
      if (kit.busy) return;
      kit.busy = true;
      kit.ticks += 1;
      kit.tick().catch(() => { kit.errors += 1; }).finally(() => { kit.busy = false; });
    }, 50);
    return true;
  };
  kit.stop = () => { if (kit.timer) clearInterval(kit.timer); kit.timer = null; return true; };
  kit.create = (spec) => {
    const w = kit.watch(spec.name);
    const rec = { name: spec.name, callAt: Date.now(), returnedAt: null, error: null, panesBefore: kit.panes() };
    kit.creates[spec.name] = rec;
    w.during = true;
    window.__gmuxP95.create(spec).then(
      () => { rec.returnedAt = Date.now(); w.during = false; },
      (e) => { rec.returnedAt = Date.now(); rec.error = String(e); w.during = false; }
    );
    return rec.callAt;
  };
  kit.pair = (a, b, ms) => { kit.create(a); setTimeout(() => kit.create(b), ms); return Date.now(); };
  kit.freeze = (name) => { const w = kit.watched[name]; if (!w) return null; w.during = false; return [...w.panesDuring]; };
  kit.one = (name) => kit.watched[name] || null;
  kit.made = (name) => kit.creates[name] || null;
  kit.dump = () => JSON.stringify({ watched: kit.watched, creates: kit.creates, ticks: kit.ticks, errors: kit.errors, startedAt: kit.startedAt });
  kit.center = (el) => { if (!el) return null; el.scrollIntoView({ block: 'nearest', inline: 'nearest' }); const r = el.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2), text: text(el) }; };
  kit.actionBox = (id) => { const pane = paneOf(id); return pane ? kit.center(pane.querySelector('.gmux-terminal-overlay button')) : null; };
  kit.tabBox = (projectId) => kit.center(document.querySelector('[data-project-id="' + CSS.escape(projectId) + '"]'));
  window.__p326 = kit;
  kit.start();
  return true;
})()
`;

  // -------------------------------------------------------------------------
  // The DevTools side.
  // -------------------------------------------------------------------------
  async function cdpForAppWindow(profileDir, timeoutMs, every) {
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
            const a = await cdpEval(cdp, `typeof window.gmux === 'object' && typeof window.__gmuxP95 === 'object' ? location.href : null`, 5000);
            if (typeof a === 'string') return { cdp, url: a };
            cdp.close();
          } catch {
            if (cdp) {
              try {
                cdp.close();
              } catch {
                /* already closed */
              }
            }
          }
        }
      }
      if (Date.now() - started > timeoutMs) throw new Unreadable('no app window carrying the Phase 95 drive');
      await sleep(every);
    }
  }
  async function waitFor(what, test, ms, every = 100) {
    const started = Date.now();
    for (;;) {
      const got = await test();
      if (got) return got;
      if (Date.now() - started > ms) throw new Error(`${what} did not happen within ${String(ms / 1000)} s`);
      await sleep(every);
    }
  }
  const lineCatcher = (sink) => {
    let carry = '';
    return (b) => {
      const t = Date.now();
      carry += b.toString();
      const parts = carry.split('\n');
      carry = parts.pop() ?? '';
      for (const line of parts) if (INTERESTING.test(line)) sink.push({ t, line });
    };
  };
  const appEnv = () =>
    withoutDevRenderer({
      HOME: home,
      ZDOTDIR: undefined,
      HISTFILE: undefined,
      GMUX_TMUX_SOCKET: socket,
      GMUX_PROBES: '1',
      GMUX_SPECSTORY_NO_CLOUD: '1',
      ...(configRoot !== '' ? { GMUX_CONFIG_ROOT: configRoot } : {}),
      ...(carriage !== null && typeof carriage.authSock === 'string' ? { SSH_AUTH_SOCK: carriage.authSock } : {})
    });
  const launchOptions = (label) => ({
    label,
    userDataDir: profile,
    tmuxSocket: socket,
    cwd: checkout,
    args: ['--remote-debugging-port=0', '--use-mock-keychain', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding', '--disable-background-timer-throttling'],
    env: appEnv(),
    graceMs: 8_000
  });

  /** One launch's shared tools, bound to its DevTools connection. */
  const tools = (cdp) => {
    const d = (method, ...args) =>
      cdpEval(cdp, `(async () => { const d = window.__gmuxP95; if (d === undefined) return { missing: true }; return await d.${method}(${args.map((a) => J(a)).join(', ')}); })()`, 120_000);
    const kit = (expr, ms = 10_000) => cdpEval(cdp, `window.__p326.${expr}`, ms);
    const click = async (box) => {
      await cdp.call('Input.dispatchMouseEvent', { type: 'mouseMoved', x: box.x, y: box.y });
      await cdp.call('Input.dispatchMouseEvent', { type: 'mousePressed', x: box.x, y: box.y, button: 'left', buttons: 1, clickCount: 1 });
      await cdp.call('Input.dispatchMouseEvent', { type: 'mouseReleased', x: box.x, y: box.y, button: 'left', buttons: 0, clickCount: 1 });
    };
    const readAgents = async () => {
      let scan = null;
      try {
        scan = JSON.parse(await cdpEval(cdp, hidden.AGENTS_LIST_EXPR, 90_000));
      } catch {
        scan = null;
      }
      return hidden.hiddenAgentsScanVerdict(scan);
    };
    return { d, kit, click, readAgents };
  };

  // -------------------------------------------------------------------------
  // Launch 1: G, A, B, Ed, C, Eb, Ea, Ec.
  // -------------------------------------------------------------------------
  const plan = [];
  const armWindows = {};
  const openArm = (arm) => {
    armWindows[arm] = { start: Date.now(), end: null };
  };
  const closeArm = (arm) => {
    if (armWindows[arm] !== undefined) armWindows[arm].end = Date.now();
  };
  const launch1Lines = [];
  const launch2Lines = [];
  let launch1Kit = null;
  let launch2Kit = null;
  let dSession = null;
  let censusNote = null;
  const needsLaunch1 = chosen.length > 0;

  const mkLocal = (name) => {
    const p = join(localDir, name);
    mkdirSync(p, { recursive: true });
    writeFileSync(join(p, 'README.md'), `# ${name}\n`);
    return p;
  };
  const mkFar = (name) => {
    const p = join(farDir, name);
    mkdirSync(p, { recursive: true });
    writeFileSync(join(p, 'README.md'), `# ${name}, on the loopback machine\n`);
    return p;
  };

  hidden.writeHiddenAgents(profile, PREFIX);
  try {
    if (needsLaunch1) {
      await withElectron(launchOptions(`p326-${tag}-1`), async (handle) => {
        handle.child.stdout.on('data', lineCatcher(launch1Lines));
        handle.child.stderr.on('data', lineCatcher(launch1Lines));
        const { cdp, url } = await cdpForAppWindow(profile, 90_000, 250);
        const { d, kit, click, readAgents } = tools(cdp);
        say(`${tag}: launch 1 window at ${url}, pid ${String(handle.appPid())}`);
        let stage = 'launch';
        let quitHappened = false;
        try {
          await cdp.call('Runtime.enable');
          await cdp.call('Emulation.setFocusEmulationEnabled', { enabled: true }).catch(() => undefined);
          await waitFor('the page load', async () => (await cdpEval(cdp, `performance.getEntriesByType('navigation')[0].loadEventEnd`)) > 0, 30_000, 50);
          const agents = await readAgents();
          readings.agentsLaunch1 = agents;
          if (!agents.ok) throw new Unreadable(`the app's own detection was not kept off the five agents: ${agents.said}`);
          await cdp.call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
          await sleep(600);
          await cdpEval(cdp, PAGE_KIT);

          const state = () => d('state');
          const activePath = async () => {
            const st = await state();
            return st.projects.find((p) => p.id === st.activeProjectId)?.path ?? null;
          };
          const waitPanesEmpty = async () => {
            try {
              await waitFor('the fresh tab to show no session', async () => (await kit('panes()')).length === 0, 3_000, 50);
              return true;
            } catch {
              return false;
            }
          };
          const openFar = async (folder) => {
            let opened = null;
            for (let attempt = 1; attempt <= 6; attempt += 1) {
              opened = await d('openRemote', MACHINE_ID, folder);
              if (opened?.result?.ok === true) break;
              await sleep(2000);
            }
            if (opened?.result?.ok !== true) throw new Error(`the far folder ${folder} did not open: ${J(opened?.result ?? null).slice(0, 300)}`);
            return opened.result.project;
          };
          /** The create's watched record, once it has returned (or `ms` passed). */
          const waitReturned = async (name, ms = 60_000) => waitFor(`the create of ${name} to return`, async () => ((await kit(`made(${J(name)})`))?.returnedAt ?? null) !== null, ms, 100);
          const watchOf = (name) => kit(`one(${J(name)})`);
          const waitDrawnOrStall = async (name, callAt, until = STALL_MS) => {
            try {
              await waitFor(`${name} to draw`, async () => ((await watchOf(name))?.draws ?? []).some((t) => t >= callAt), until, 100);
            } catch {
              /* a stall is a reading, not an error */
            }
          };
          const waitMountedWaiting = async (name, ms = 15_000) =>
            waitFor(`${name} to be mounted and not drawn`, async () => {
              const w = await watchOf(name);
              return w !== null && w.mounts.length > 0 ? w : null;
            }, ms, 50);

          // --------------------------------------------------------- the machine
          if (wantsMachine) {
            stage = 'machine';
            const up = await d('machineUp', MACHINE_ID);
            readings.machine = up;
            if (!(up.rows ?? []).some((r) => r.id === MACHINE_ID && r.usable)) throw new Unreadable(`the loopback machine is not usable: ${J(up).slice(0, 600)}`);
          }

          // ------------------------------------------------------------------ G
          let gFirst = null;
          if (on('G')) {
            stage = 'G';
            openArm('G');
            for (let k = 1; k <= COUNTS.G; k += 1) {
              const name = `p326-g-${String(k).padStart(2, '0')}`;
              const folder = mkLocal(`g-${String(k).padStart(2, '0')}`);
              if (gFirst === null) gFirst = folder;
              await d('openLocal', folder);
              const fresh = (await activePath()) === folder && (await waitPanesEmpty());
              const callAt = await kit(`create(${J({ name, agent: 'shell' })})`);
              await waitReturned(name);
              await waitDrawnOrStall(name, callAt);
              plan.push({ arm: 'G', launch: 1, name, folder, rule: null, fresh });
              say(`G ${name}: ${J((await watchOf(name))?.draws ?? [])}`);
            }
            closeArm('G');
          }

          // --------------------------------------------- far creates, one alone
          if (wantsMachine && (on('A') || on('B') || on('Ed') || on('C') || on('Eb') || on('Ea') || on('Ec') || on('D'))) {
            stage = 'far-before';
            const rows = farSessions();
            readings.farBefore = rows;
            const unstamped = rows.filter((r) => r.gmuxId === '');
            if (!(unstamped.length === 1 && unstamped[0].name === 'gmux-control')) {
              note(`before the first far create the far server held ${J(rows)}, not exactly Tortie's own unstamped gmux-control`);
            } else {
              note("before the first far create the far server holds one unstamped session, Tortie's own gmux-control, which is the 1 the far count starts at");
            }
          }
          const farAlone = async (arm, name, folderName, rule) => {
            writeRules(rule === null ? [] : [rule]);
            const folder = mkFar(folderName);
            const project = await openFar(folder);
            const fresh = (await activePath()) === project.path && (await waitPanesEmpty());
            const callAt = await kit(`create(${J({ name, agent: 'shell', machineId: MACHINE_ID })})`);
            const entry = { arm, launch: 1, name, folder, projectId: project.id, rule, fresh, callAt };
            plan.push(entry);
            return entry;
          };

          for (const [arm, hold] of [['A', null], ['B', HOLD_MS]]) {
            if (!on(arm)) continue;
            stage = arm;
            openArm(arm);
            for (let k = 1; k <= COUNTS[arm]; k += 1) {
              const name = `p326-${arm.toLowerCase()}-${String(k).padStart(2, '0')}`;
              const e = await farAlone(arm, name, `${arm.toLowerCase()}-${String(k).padStart(2, '0')}`, hold === null ? null : `stamp-delay-ms ${String(hold)}`);
              await waitReturned(name);
              await waitDrawnOrStall(name, e.callAt);
              const w = await watchOf(name);
              say(`${arm} ${name}: statuses ${J((w?.statuses ?? []).map((s) => s.s))}, overlays ${J((w?.overlays ?? []).map((o) => o.title))}, drawn ${w?.draws?.[0] ? `${String(w.draws[0] - e.callAt)} ms` : 'NO'}`);
            }
            closeArm(arm);
          }

          if (on('Ed')) {
            stage = 'Ed';
            openArm('Ed');
            writeRules([`stamp-delay-ms ${String(HOLD_MS)}`]);
            for (let k = 1; k <= COUNTS.Ed; k += 1) {
              const folder = mkFar(`ed-${String(k)}`);
              const project = await openFar(folder);
              const fresh = (await activePath()) === project.path && (await waitPanesEmpty());
              const a = `p326-ed-${String(k)}a`;
              const b = `p326-ed-${String(k)}b`;
              await kit(`pair(${J({ name: a, agent: 'shell', machineId: MACHINE_ID })}, ${J({ name: b, agent: 'shell', machineId: MACHINE_ID })}, ${String(ED_OFFSET_MS)})`);
              await sleep(ED_OFFSET_MS + 100);
              await waitReturned(a);
              await waitReturned(b);
              // Whichever of the two the tab shows once both have settled is
              // graded from its own create; the other is then selected once,
              // and graded from that press.
              const ids = { [a]: (await watchOf(a))?.id ?? null, [b]: (await watchOf(b))?.id ?? null };
              const panes = await kit('panes()');
              const shown = panes.includes(ids[a]) && !panes.includes(ids[b]) ? a : b;
              const other = shown === a ? b : a;
              const callShown = (await kit(`made(${J(shown)})`)).callAt;
              await waitDrawnOrStall(shown, callShown);
              const selectAt = Date.now();
              await d('select', ids[other] ?? '');
              await waitDrawnOrStall(other, selectAt);
              const rule = `stamp-delay-ms ${String(HOLD_MS)}`;
              plan.push({ arm: 'Ed', launch: 1, name: a, folder, projectId: project.id, rule, fresh, pairRole: 'first', pairOf: b, ...(other === a ? { selectAt } : {}) });
              plan.push({ arm: 'Ed', launch: 1, name: b, folder, projectId: project.id, rule, fresh, pairRole: 'second', pairOf: a, ...(other === b ? { selectAt } : {}) });
              say(`Ed pair ${String(k)}: shown ${shown}, then ${other} selected; ${a} ${J((await watchOf(a))?.draws ?? [])}, ${b} ${J((await watchOf(b))?.draws ?? [])}`);
            }
            closeArm('Ed');
          }

          if (on('C')) {
            stage = 'C';
            openArm('C');
            for (let k = 1; k <= COUNTS.C; k += 1) {
              const name = `p326-c-${String(k)}`;
              const e = await farAlone('C', name, `c-${String(k)}`, `stamp-delay-ms ${String(C_HOLD_MS)}`);
              await waitReturned(name, 60_000);
              let box = null;
              try {
                await waitFor(`${name} to read bound`, async () => boundAt((await watchOf(name))?.statuses) !== null, 20_000, 100);
                box = await waitFor(`${name}'s ${TRY_AGAIN}`, async () => {
                  const w = await watchOf(name);
                  const b = w?.id ? await kit(`actionBox(${J(w.id)})`) : null;
                  return b !== null && b.text === TRY_AGAIN ? b : null;
                }, 6_000, 100);
              } catch (err) {
                note(`C ${name}: ${err instanceof Error ? err.message : String(err)}, so ${TRY_AGAIN} was not pressed`);
              }
              if (box !== null) {
                e.clickAt = Date.now();
                await click(box);
                await waitDrawnOrStall(name, e.clickAt, C_RETRY_DRAW_MS + 3_000);
              } else e.clickAt = null;
              say(`C ${name}: overlays ${J(((await watchOf(name))?.overlays ?? []).map((o) => [o.title, o.action]))}`);
            }
            writeRules([]);
            closeArm('C');
          }

          if (on('Eb')) {
            stage = 'Eb';
            openArm('Eb');
            const away = gFirst ?? mkLocal('eb-away');
            for (let k = 1; k <= COUNTS.Eb; k += 1) {
              const name = `p326-eb-${String(k)}`;
              const e = await farAlone('Eb', name, `eb-${String(k)}`, `stamp-delay-ms ${String(HOLD_MS)}`);
              let w = null;
              try {
                w = await waitMountedWaiting(name);
              } catch (err) {
                note(`Eb ${name}: ${err instanceof Error ? err.message : String(err)}`);
              }
              e.mountedBeforeSwitch = w !== null;
              e.drawnBeforeSwitch = (w?.draws ?? []).length > 0;
              // THE FIX ROUND. Aloneness is read up to the switch: the away
              // tab's own session comes on screen BECAUSE of the switch, and
              // the build counted it as a neighbour, so every Eb read
              // UNREADABLE at both builds.
              e.panesAtSwitch = await kit(`freeze(${J(name)})`);
              e.switchAt = Date.now();
              await d('openLocal', away);
              await waitReturned(name);
              const made = await kit(`made(${J(name)})`);
              const settledAt = made.returnedAt - DRIVE_CREATE_WAIT_MS;
              const wait = settledAt + EB_AFTER_SETTLE_MS - Date.now();
              if (wait > 0) await sleep(wait);
              const tmuxId = farSessions().find((r) => r.name === (w?.tmuxName ?? name))?.tmuxId ?? null;
              e.tmuxIdSeen = tmuxId;
              e.clientsAfter = tmuxId === null ? null : farClients().filter((c) => c.tmuxId === tmuxId).length;
              e.sshAfter = tmuxId === null ? null : sshAttaches(psText(), tmuxId).length;
              e.readAfterAt = Date.now();
              e.backAt = Date.now();
              const project = await openFar(e.folder);
              if ((await activePath()) !== project.path) {
                const box = await kit(`tabBox(${J(project.id)})`);
                if (box !== null) await click(box);
                e.backBy = 'a click on its tab';
              } else e.backBy = 'openRemote';
              await waitDrawnOrStall(name, e.backAt);
              say(`Eb ${name}: ${String(e.clientsAfter)} far client(s) and ${String(e.sshAfter)} ssh attach(es) on ${String(tmuxId)} after the switch; back by ${e.backBy}`);
            }
            closeArm('Eb');
          }

          if (on('Ea')) {
            stage = 'Ea';
            openArm('Ea');
            for (let k = 1; k <= COUNTS.Ea; k += 1) {
              const name = `p326-ea-${String(k)}`;
              await farAlone('Ea', name, `ea-${String(k)}`, `stranger-on-name ${name}`);
              await waitReturned(name);
              await sleep(EA_WAIT_MS + 500);
              writeRules([]);
              say(`Ea ${name}: ${J(((await watchOf(name))?.statuses ?? []).map((s) => s.s))}; refusal read at the end`);
            }
            closeArm('Ea');
          }

          const quitDuringWait = async (arm, name, folderName) => {
            const e = await farAlone(arm, name, folderName, `stamp-delay-ms ${String(HOLD_MS)}`);
            let w = null;
            try {
              w = await waitMountedWaiting(name);
            } catch (err) {
              note(`${arm} ${name}: ${err instanceof Error ? err.message : String(err)}`);
            }
            e.mountedBeforeQuit = w !== null;
            launch1Kit = JSON.parse(await kit('dump()'));
            const appPid = handle.appPid();
            e.quitAt = Date.now();
            quitHappened = true;
            await cdpEval(cdp, 'window.gmux.quit(), true', 3_000).catch(() => undefined);
            const code = await Promise.race([handle.exited, sleep(EC_EXIT_MS).then(() => 'timeout')]);
            e.exitedAt = code === 'timeout' ? null : Date.now();
            e.quitMs = e.exitedAt === null ? null : e.exitedAt - e.quitAt;
            await sleep(500);
            let alive = false;
            try {
              if (appPid > 0) process.kill(appPid, 0);
              alive = appPid > 0;
            } catch {
              alive = false;
            }
            e.exitedOnItsOwn = e.exitedAt !== null && !alive;
            await sleep(1000);
            const tmuxId = farSessions().find((r) => r.name === (w?.tmuxName ?? name))?.tmuxId ?? null;
            e.tmuxIdSeen = tmuxId;
            const clients = farClients();
            e.clientsTotalAfter = clients.length;
            e.clientsAfter = tmuxId === null ? clients.length : clients.filter((c) => c.tmuxId === tmuxId).length;
            e.sshAfter = tmuxId === null ? null : sshAttaches(psText(), tmuxId).length;
            say(`${arm} ${name}: quit to exit ${String(e.quitMs)} ms, on its own ${String(e.exitedOnItsOwn)}; ${String(e.clientsTotalAfter)} far client(s) left`);
            return { e, w };
          };

          if (on('Ec')) {
            stage = 'Ec';
            openArm('Ec');
            const { e, w } = await quitDuringWait('Ec', 'p326-ec-1', 'ec-1');
            dSession = { name: e.name, id: w?.id ?? null, folder: e.folder, projectId: e.projectId };
            closeArm('Ec');
          } else if (on('D')) {
            stage = 'D-seed';
            const { e, w } = await quitDuringWait('D-seed', 'p326-d-seed', 'd-seed');
            dSession = { name: e.name, id: w?.id ?? null, folder: e.folder, projectId: e.projectId };
          }
          if (!quitHappened) launch1Kit = JSON.parse(await kit('dump()'));
          stage = 'done';
        } catch (err) {
          if (err instanceof Unreadable) {
            unreadable.push(`launch 1 ${stage}: ${err.message}`);
          } else findings.push(`RUN launch 1 stopped during ${stage}: ${err instanceof Error ? err.message : String(err)}`);
          if (!quitHappened && launch1Kit === null) {
            try {
              launch1Kit = JSON.parse(await kit('dump()'));
            } catch {
              /* the page is gone */
            }
          }
        } finally {
          try {
            writeFileSync(join(outDir, `app-${tag}-${farLabel}-L1.log`), handle.text());
          } catch {
            /* the readings are the evidence; this is the footnote */
          }
          try {
            cdp.close();
          } catch {
            /* already closed by the quit */
          }
        }
      });
    }

    // -----------------------------------------------------------------------
    // Launch 2: D.
    // -----------------------------------------------------------------------
    if (on('D') && dSession !== null && unreadable.length === 0) {
      writeRules([`first-list-delay-ms ${String(D_FIRST_LIST_MS)}`]);
      hidden.writeHiddenAgents(profile, PREFIX);
      // Launch 1's port file would send the first connection attempts to a
      // port nothing listens on any more; the relaunch writes its own.
      rmSync(join(profile, 'DevToolsActivePort'), { force: true });
      openArm('D');
      const dEntry = { arm: 'D', launch: 2, name: dSession.name, id: dSession.id, folder: dSession.folder, projectId: dSession.projectId, rule: `first-list-delay-ms ${String(D_FIRST_LIST_MS)}`, fresh: true };
      plan.push(dEntry);
      await withElectron(launchOptions(`p326-${tag}-2`), async (handle) => {
        dEntry.launchAt = Date.now();
        handle.child.stdout.on('data', lineCatcher(launch2Lines));
        handle.child.stderr.on('data', lineCatcher(launch2Lines));
        const { cdp } = await cdpForAppWindow(profile, 90_000, 100);
        const { d, kit, click, readAgents } = tools(cdp);
        let stage = 'relaunch';
        try {
          await cdp.call('Runtime.enable');
          await cdpEval(cdp, PAGE_KIT);
          await kit(`watch(${J(dSession.name)}, ${J(dSession.id)})`);
          dEntry.kitAt = Date.now();
          const agents = await readAgents();
          readings.agentsLaunch2 = agents;
          if (!agents.ok) throw new Unreadable(`the app's own detection was not kept off the five agents at the relaunch: ${agents.said}`);
          const st = await d('state');
          const active = st.projects.find((p) => p.id === st.activeProjectId) ?? null;
          dEntry.restoredTab = active?.path ?? null;
          if (active === null || active.id !== dSession.projectId) {
            const box = await kit(`tabBox(${J(dSession.projectId)})`);
            if (box !== null) {
              await click(box);
              dEntry.focusedBy = 'a click on its tab';
            } else {
              await d('openRemote', MACHINE_ID, dSession.folder);
              dEntry.focusedBy = 'openRemote';
            }
          } else dEntry.focusedBy = 'the restored window';
          stage = 'D';
          try {
            await waitFor('the relaunched session to draw', async () => ((await kit(`one(${J(dSession.name)})`))?.draws ?? []).length > 0, STALL_MS + 5_000, 100);
          } catch {
            /* a stall is a reading */
          }
          launch2Kit = JSON.parse(await kit('dump()'));
          say(`D ${dSession.name}: focused by ${String(dEntry.focusedBy)}, ${J(launch2Kit.watched[dSession.name] ?? null).slice(0, 300)}`);
        } catch (err) {
          if (err instanceof Unreadable) unreadable.push(`launch 2 ${stage}: ${err.message}`);
          else findings.push(`RUN launch 2 stopped during ${stage}: ${err instanceof Error ? err.message : String(err)}`);
          try {
            launch2Kit = JSON.parse(await kit('dump()'));
          } catch {
            /* the page is gone */
          }
        } finally {
          try {
            writeFileSync(join(outDir, `app-${tag}-${farLabel}-L2.log`), handle.text());
          } catch {
            /* footnote */
          }
          cdp.close();
        }
      });
      closeArm('D');
    }
  } catch (err) {
    const text = err instanceof Error ? err.message : String(err);
    if (/APPEARED on |WENT from /.test(text)) censusNote = text;
    findings.push(`RUN a launch did not complete: ${text}`);
  } finally {
    // The far side's end-of-run facts are read while the server still runs.
    try {
      if (wantsMachine) readings.farAtEnd = farSessions();
    } catch {
      /* the server is gone */
    }
    endFarServer();
  }
  readings.historyAfter = statHistory();
  if (censusNote !== null) findings.push(`RUN the operator's census moved: ${censusNote}`);

  // -------------------------------------------------------------------------
  // The readings, per create, from the kit, the app's lines and the far log.
  // -------------------------------------------------------------------------
  const records = wantsMachine ? farRecords() : [];
  const timeline = farTimeline(records);
  const strangers = strangersIn(records);
  const refusalsOf = (lines) =>
    lines
      .map((l) => {
        const p = parseRefusal(l.line);
        return p === null ? null : { t: l.t, ...p };
      })
      .filter((x) => x !== null);
  const assembled = [];
  for (const [launch, kitDump, lines] of [
    [1, launch1Kit, launch1Lines],
    [2, launch2Kit, launch2Lines]
  ]) {
    const entries = plan.filter((p) => p.launch === launch);
    if (entries.length === 0) continue;
    const refusals = refusalsOf(lines);
    const keyed = entries.map((p) => {
      const w = kitDump?.watched?.[p.name] ?? null;
      return { key: `${String(launch)}:${p.name}`, tmuxName: w?.tmuxName ?? p.name, id: w?.id ?? p.id ?? null, intervals: mountIntervals(w) };
    });
    const owned = new Map();
    const unattributed = [];
    for (const ref of refusals) {
      const key = attributeRefusal(ref, keyed);
      if (key === null) unattributed.push(ref);
      else owned.set(key, [...(owned.get(key) ?? []), ref]);
    }
    if (unattributed.length > 0) note(`launch ${String(launch)}: ${String(unattributed.length)} attach refusal(s) belong to no create this run made: ${J(unattributed).slice(0, 400)}`);
    for (const p of entries) {
      const w = kitDump?.watched?.[p.name] ?? null;
      const made = kitDump?.creates?.[p.name] ?? null;
      const id = w?.id ?? p.id ?? null;
      const r = {
        arm: p.arm,
        launch,
        name: p.name,
        id,
        tmuxName: w?.tmuxName ?? null,
        folder: p.folder,
        build: tag,
        farVersion,
        rule: p.rule,
        callAt: made?.callAt ?? p.callAt ?? p.launchAt ?? null,
        returnedAt: made?.returnedAt ?? null,
        settleMs: made?.returnedAt ? made.returnedAt - made.callAt - DRIVE_CREATE_WAIT_MS : null,
        createError: made?.error ?? null,
        heldAt: w?.heldAt ?? null,
        mounts: w?.mounts ?? [],
        unmounts: w?.unmounts ?? [],
        draws: w?.draws ?? [],
        statuses: w?.statuses ?? [],
        overlays: (w?.overlays ?? []).map(({ t, title, detail, action }) => ({ t, title, detail, action })),
        presentAtEnd: w?.present ?? false,
        refusals: owned.get(`${String(launch)}:${p.name}`) ?? [],
        panesBefore: made?.panesBefore ?? [],
        panesDuring: w?.panesDuring ?? [],
        ...Object.fromEntries(Object.entries(p).filter(([k]) => !['arm', 'launch', 'name', 'folder', 'rule', 'callAt', 'id'].includes(k)))
      };
      r.boundAt = boundAt(r.statuses);
      if (FAR_ARMS.includes(p.arm) || p.arm === 'D-seed') {
        r.far = farCreateFacts(timeline, { tmuxName: r.tmuxName ?? p.name, sessionId: id });
        r.tmuxId = r.far.tmuxId;
      }
      if (p.arm === 'Ed') {
        const other = kitDump?.watched?.[p.pairOf]?.id ?? null;
        const v = aloneVerdict(r, [id, other].filter((x) => x !== null));
        r.alone = p.fresh === true && v.alone;
        r.aloneWhy = p.fresh !== true ? 'the tab was not fresh' : v.why;
      } else if (p.arm !== 'D') {
        const v = aloneVerdict(r, id === null ? [] : [id]);
        r.alone = p.fresh === true && v.alone;
        r.aloneWhy = p.fresh !== true ? 'the tab was not fresh' : v.why;
      }
      if (p.arm === 'Ea') {
        r.stranger = strangers.find((s) => s.name === p.name) ?? null;
        r.strangerTouches = r.stranger === null ? null : farTouches(timeline, r.stranger.tmuxId);
        // The foreign memo lives for one process, so the stranger's environment
        // is read at most once PER LAUNCH, and graded that way.
        const relaunchAt = plan.find((q) => q.launch === 2)?.launchAt ?? null;
        r.strangerReadsPerLaunch =
          r.stranger === null
            ? null
            : relaunchAt === null
              ? [r.strangerTouches['show-environment']]
              : [
                  farTouches(timeline.filter((e) => e.t < relaunchAt), r.stranger.tmuxId)['show-environment'],
                  farTouches(timeline.filter((e) => e.t >= relaunchAt), r.stranger.tmuxId)['show-environment']
                ];
        r.strangerAtEnd = r.stranger === null ? false : (readings.farAtEnd ?? []).some((f) => f.tmuxId === r.stranger.tmuxId && f.gmuxId === '');
      }
      if (p.arm === 'D') {
        const after = timeline.filter((e) => (e.verb === 'list-sessions' || e.verb === 'ls') && e.t >= (p.launchAt ?? 0));
        r.firstListAt = after.length === 0 ? null : after[0].eff;
        r.firstListHeld = after.length === 0 ? null : after[0].held;
      }
      assembled.push(r);
    }
  }
  readings.creates = assembled;
  readings.armWindows = armWindows;
  readings.strangers = strangers;
  readings.appLines = { launch1: launch1Lines, launch2: launch2Lines };

  // -------------------------------------------------------------------------
  // The grading.
  // -------------------------------------------------------------------------
  const perArm = {};
  for (const r of assembled) {
    if (r.arm === 'D-seed') continue;
    const v = readable(r);
    const row = (perArm[r.arm] ??= { creates: 0, valid: 0, refused: 0, stalled: 0, drawn: 0, findings: 0 });
    row.creates += 1;
    r.valid = v.ok;
    if (!v.ok) {
      unreadable.push(`${r.arm} ${r.name}: ${v.why}`);
      continue;
    }
    row.valid += 1;
    if (r.refusals.length > 0) row.refused += 1;
    const d = first(r.draws, r.callAt ?? 0);
    if (d !== null) row.drawn += 1;
    if (['G', 'A', 'B'].includes(r.arm) && (d === null || d - r.callAt > STALL_MS)) row.stalled += 1;
    const f = gradeCreate(r);
    row.findings += f.length;
    findings.push(...f);
  }
  const lines = [...launch1Lines, ...launch2Lines];
  const farBeforeRows = Array.isArray(readings.farBefore) ? readings.farBefore : null;
  const F = gradeF(armWindows, lines, MACHINE_ID, farBeforeRows === null ? null : { floor: farBeforeRows.filter((row) => row.gmuxId === '').length, strangers: strangers.map((one) => one.t) });
  readings.F = F.report;
  if (wantsMachine) findings.push(...F.findings);
  readings.perArm = perArm;

  // The windows, re-derivable by the verifier from the far log alone.
  for (const r of assembled) {
    if (r.far?.seen) r.windowHeldList = (r.far.listsInWindow ?? []).length > 0;
  }

  const suffix = `${tag}-${farLabel}`;
  if (keep && wantsMachine && existsSync(farLog)) copyFileSync(farLog, join(outDir, `far-${suffix}.log`));
  const readingsPath = join(outDir, `readings-${suffix}.json`);
  writeFileSync(readingsPath, `${J({ findings, unreadable, readings })}\n`);

  say('');
  say(`arm   ${tag.toUpperCase()}${wantsMachine ? `, the loopback machine on ${String(farVersion)}` : ''}`);
  for (const arm of ALL_ARMS) {
    const row = perArm[arm];
    if (!on(arm)) {
      say(`${arm.padEnd(4)} not run`);
      continue;
    }
    if (row === undefined) {
      say(`${arm.padEnd(4)} no readings`);
      continue;
    }
    say(`${arm.padEnd(4)} ${String(row.valid)} of ${String(row.creates)} valid; refused ${String(row.refused)}, stalled ${String(row.stalled)}, drawn ${String(row.drawn)}; ${row.findings === 0 ? 'PASS' : `FAIL ${String(row.findings)}`}`);
  }
  if (wantsMachine) say(`F     ${J(F.report)}`);
  const hb = readings.historyBefore;
  const ha = readings.historyAfter;
  say(`his ~/.zsh_history, statted only: before ${J(hb)}, after ${J(ha)}${hb !== null && ha !== null && (hb.mtimeMs !== ha.mtimeMs || hb.size !== ha.size) ? ' — IT MOVED during this run (he may have typed in his own terminal; the far wrapper exports a scratch HOME)' : ''}`);
  say(`readings: ${readingsPath}`);
  if (tag === 'checkout') say('this run measured ANOTHER checkout. At the parent the refusals of A, B, C, Eb and D, and C\'s missing Try again, are EXPECTED findings.');
  for (const f of findings) process.stderr.write(`${TAG}   ${tag.toUpperCase()} ${f}\n`);
  for (const u of unreadable) process.stderr.write(`${TAG}   UNREADABLE ${u}\n`);
  if (unreadable.length > 0) {
    process.stderr.write(`${TAG} UNREADABLE: ${String(unreadable.length)} reading(s) could not be graded.\n`);
    process.exit(2);
  }
  if (findings.length > 0) {
    process.stderr.write(`${TAG} ${tag === 'checkout' ? `${checkout} FAILED` : 'FAILED'}: ${String(findings.length)} finding(s).\n`);
    process.exit(1);
  }
  say(`PASS: ${tag} has 0 findings on ${chosen.join(', ')}.`);
  process.exit(0);
}
