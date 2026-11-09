#!/usr/bin/env node
/**
 * probe:p357 — THE PHASE 357 APP RUN (build/p357/SPEC.md §8): a session list
 * that goes bad while Tortie runs shows a dialog per refresh and crashes the
 * quit at the PARENT, and at HEAD says so once, offers a restart, keeps the
 * last clean list, refuses a create with its sentence, answers the phone in
 * words, and quits clean without closing the damaged connection.
 *
 * TWO ELECTRONS PER ARM AT MOST, ONE AT A TIME AND NEVER AT ONCE, each through
 * build/electron-run.mjs's `withElectron` on its OWN scratch profile, a scratch
 * HOME (ZDOTDIR the same, HISTFILE=/dev/null, no TERM_SESSION_ID) and the
 * socket build/harness-socket.mjs hands this file (`gmux-p357…`). The PARENT is
 * `P357_PARENT_CHECKOUT` (a BUILT `32180e60`, 357 as landed, since Phase 357.1;
 * required: `--preflight` refuses without it), and that one parent serves every
 * parent arm. Arms PA and CS-parent run at the parent; HA, HQ, HB, HD, HC,
 * CS-head and RUN at HEAD.
 *
 * WHAT IS REAL. Live shells created from the window on a scratch tmux server
 * of this run's own, seeded with his recorded shape through
 * `build/p3167/seed-sessions.mts --shape his` (counts only, no manifest of his
 * is read). The DAMAGE is real, on the SCRATCH profile's own manifest: one
 * `sessions` leaf's type byte written over on disk after a checkpoint, and a
 * second connection's write to make the live connection read again. The phone
 * is `build/p316/node-phone.mjs`, paired through the STAND-IN Tailscale
 * (`build/p330/tailscale-standin.mjs` behind GMUX_TAILSCALE_BIN, preflighted
 * by sha256, the process table sampled every second: a real Tailscale under
 * the app, or run as a command, FAILS the run) and the DNS stand-in in this
 * process (`build/p332/dns-standin.mjs`); the pairing sequence is
 * probe:p349.mjs's. The uncaught counter is `build/p357/counter.cjs`, loaded
 * with NODE_OPTIONS into MAIN at both builds, ONE FILE PER LAUNCH, its control
 * exception heard or the run is UNREADABLE.
 *
 * HB IS THE MEMORY-SHAPED CASE real page damage cannot make: a connection that
 * stops reading while its file is fine. It is armed through the harness-only
 * seam (src/main/harness/manifest-fault.ts), reachable only in a harness
 * launch (build/conformance-stopped-list.mjs rule S8 proves it), which throws
 * one real SqliteError at the next `listSessions`. HB then clicks the toast's
 * Restart in the DOM and reads the quit (the harness launch is not relaunched,
 * D14, so it quits by the hard exit), and relaunches on that profile to read
 * the gate. HD is the phone's door in HB's launch, graded apart so a pairing
 * that did not take reads UNREADABLE without hiding HB's quit. HQ holds HEAD's
 * quit in HA to the parent's quit in PA.
 *
 * SINCE PHASE 357.1: every quit now ends by the will-quit SIGKILL rather than
 * exit 0 (D1: the manifest is held at EVERY quit, the damaged file included),
 * so HA's and HB's quit read a signal, not code 0, and HQ compares HEAD's
 * signal quit to the parent's clean one. CS IS THE CRASH'S OWN STATE (research
 * 143 §2.3): a page line taken over by a zero-filled 4 KB block, planted by the
 * scratch checking better-sqlite3 (reused from P3571_BS3 or the spec step's
 * build, else built in scratch from P3571_R143_KEEP; loaded by path through
 * hook-bs3.cjs, never into any node_modules), over a manifest-shaped connection.
 * NO read fails, so 357's latch never trips: at the PARENT (CS-parent) the quit
 * faults in pcache1EnforceMaxPage (his report's frame, SIGSEGV, exit 139); at
 * HEAD (CS-head) the held connection is never closed, the will-quit SIGKILL
 * skips teardown, and the relaunch keeps every session, the localStorage keys
 * and the Settings bounds with no unclean-exit notice.
 *
 * THE MENU'S 3 S FALLBACK QUITS ONLY WHEN NO QUIT HAS BEGUN (Phase 362). Every
 * arm here quits through the core's dispose, which holds the connection. Since
 * Phase 362, requestQuit()'s 3 s fallback app.quit() (src/main/menu.ts) no
 * longer cuts a quit that has begun, so a long menu quit (his live-session
 * count with their scrollback) runs its disposer to that dispose and ends by the
 * same will-quit hard exit. The long-quit and crash-state menu arms live in
 * probe:p362 (build/p362/probe-p362.mjs, its CM arms F1's, ported), and no arm
 * here drives them.
 *
 * THE PROBE REVIEW (2026-11-06, docs/method/HOW-WE-BUILT-THIS.md rule 9), by
 * someone who did not write it. PA describes THIS run's parent, 357 as landed
 * (it described `0547383e` and failed by construction, so HQ could never be
 * read). RUN's socket clause reads only this run's socket, by whether a server
 * still answers on it: tmux 3.7b keeps the socket FILE after `kill-server`
 * (measured), so the `.run` filter alone still failed every live run. The
 * stopped-words guard tests every sentence of the copy and the shared phrase,
 * not whole values only. Every quit read as "the will-quit SIGKILL" is
 * UNREADABLE when Phase 36's wedged-watcher escape printed its line. CS reads
 * the frame and address from the checker's own SEGV line, WHICH connection the
 * checker planted (the session list's own, or the preload's), that the list
 * never stopped, that the preload moved Settings, that app.log logged both
 * launches, and that the relaunch lists every session listed before the quit.
 *
 * NO AGENT RUNS, not even for a version: every launch hides every probed
 * registry row (`writeHiddenAgents(profile, prefix, hiddenAgentsBesides([]))`)
 * and reads `agents:list` back (`standInsOnlyVerdict(list, { standIns: [] })`);
 * a run whose answer is not ok is UNREADABLE. Every arm here runs shells, so no
 * stand-in agent is needed. This probe never runs `app.relaunch()` (it clicks
 * the product's Restart, which refuses to relaunch a harness launch) and never
 * holds main's inspector across a quit (§0).
 *
 * THREE VERDICTS, AND A MISSING READING IS NEVER A PASS (the probe review,
 * docs/method/HOW-WE-BUILT-THIS.md rule 9). Each arm names the fields it
 * reads (`reads`), the preconditions without which nothing it says can be
 * trusted (`needs`: the counter heard its control, the agents held, the damage
 * changed a byte, the seam armed, the phone answered before the fault) and its
 * clauses. A field that is absent, or a need that does not hold, answers
 * UNREADABLE (exit 2); only a clause answers FAIL. Every reading the live run
 * derives from raw text (app.log lines, the counter's file, the shim's output,
 * an IPC rejection's message, the manifest's rows) is derived by ONE pure
 * function, and `--grader-self-test` drives those same functions over recorded
 * raw fixtures as well as grading recorded readings.
 *
 * VERIFIERS ONLY: it starts an Electron. Take the orchestrator's lock.
 *
 *   npm run build && P357_PARENT_CHECKOUT=<a BUILT parent> npm run -s probe:p357
 *   P357_ARMS=HA,HB,…         the arms to run (default PA,HA,HB,HC,CS; HQ with PA and HA, HD with HB;
 *                             CS runs CS-parent then CS-head, parent first; RUN is always read)
 *   P357_KEEP=1               keep the run folder and every answer for a re-derivation
 *   P3571_BS3=<dir>           a built checking better-sqlite3 to reuse for CS (else the spec step's, else build it)
 *   P3571_R143_KEEP=<dir>     research 143's kept sources, for building the checking build when none is reused
 *   P3571_HOOK_BS3=<file>     research 143's hook-bs3.cjs, if not under P3571_R143_KEEP's default
 *   node build/p357/probe-p357.mjs --grader-self-test   every grader on build/p357/fixtures/; starts nothing
 *   node build/p357/probe-p357.mjs --preflight          the parent and out/; starts nothing
 *
 * Exit 0 when every arm passed, 1 when one failed, 2 when it could not run or
 * an arm could not be READ.
 */

import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import {
  appendFileSync,
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  readSync,
  readdirSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync,
  writeSync
} from 'node:fs';
import { homedir, userInfo } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
// The build helpers this run USES, imported statically so gate:electron counts
// this probe among build/electron-run.mjs's users (obligation 1; usesHelper
// matches `from '../electron-run.mjs'`, not a dynamic import). Every one of
// these modules only DEFINES functions when imported — none starts a process,
// opens a socket or reads a home — so `--grader-self-test` and `--preflight`
// below still start nothing, and they exit before any of these is called.
import { withElectron, withoutDevRenderer } from '../electron-run.mjs';
import { cdpEval, wsConnect } from '../cdp-client.mjs';
import { pickRendererTarget } from '../cdp-target.mjs';
import { AGENTS_LIST_EXPR, hiddenAgentsBesides, standInsOnlyVerdict, writeHiddenAgents } from '../hidden-agents.mjs';
import { makePhone, pairThrough, readOffer, signedGet } from '../p316/node-phone.mjs';
import { DEFAULT_SCENARIO, endStandinProcesses, makeStandin, preflightStandin, watchForRealTailscale } from '../p330/tailscale-standin.mjs';
import { NAME_SERVERS_VAR, loopbackOnlyServers, makeDnsStandin } from '../p332/dns-standin.mjs';

const HERE = fileURLToPath(import.meta.url);
const ROOT = resolve(dirname(HERE), '..', '..');
const J = JSON.stringify;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// What this run holds the app against, by value
// ---------------------------------------------------------------------------

export const SNAPSHOT = '32180e60';
/** His exact crash stack, the frames from the inside out (§2.2, his screenshot). */
export const HIS_STACK = Object.freeze(['SessionsRepository.listSessions', 'ManifestStore.listSessions', 'GmuxCore.listSessions', 'GmuxCore.broadcastSessions']);
/** The one sentence the Mac's sticky notice draws (src/shared/manifest-stopped-copy.ts). */
export const MANIFEST_STOPPED_NOTICE = "Tortie's session list stopped reading correctly. Your sessions are still running. Restart Tortie to load it again.";
/** The refusal a create or a rename on a stopped store carries. */
export const MANIFEST_STOPPED_REFUSAL = "Tortie's session list stopped reading correctly. Restart Tortie, then try again.";
/** The notice's one action. */
export const MANIFEST_STOPPED_RESTART = 'Restart';
/** The phone's Needs input list while the Mac's list is stopped. */
export const MANIFEST_STOPPED_PHONE_LINE = "Tortie's session list stopped reading correctly on your Mac. Restart Tortie there.";
/** The three shells each launch's world holds, created from the window. */
export const SHELL_NAMES = Object.freeze(['p357-a', 'p357-b', 'p357-c']);
/** The counter's own control codes (build/p357/counter.cjs): never a finding, always the instrument. */
export const CONTROL_CODES = Object.freeze(['P357_CONTROL', 'P357_CONTROL_REJECTION']);
/** The counter's control MESSAGES. app.log may carry neither (D16: never a message but SQLite's), so each is a planted canary. */
export const CONTROL_MESSAGES = Object.freeze(['p357-control-exception', 'p357-control-rejection']);
/** The disposer's line before its hard exit (src/main/capabilities.ts), written to stdout with writeSync, so it lands before the signal. */
export const LEFT_OPEN_QUIT_LINE = /left open; ending the process without closing it/;
/** The store's close when it holds the connection (src/main/manifest/store.ts). A console line, which may not land before the signal: PRINTED, never graded. */
export const CLOSE_HELD_LINE = /the session list connection is left open so nothing closes a damaged cache/;
/** The Restart handler's harness answer (registerRelaunchIpc, src/main/capabilities.ts), on stdout or in app.log. */
export const NOT_RELAUNCHED_LINE = /restart asked: a harness launch is not relaunched/;
/** The Electron shim's line when the app it started ended by a signal (node_modules/electron/cli.js), after which the shim exits 1. */
export const SHIM_SIGNAL_LINE = /exited with signal (SIG[A-Z0-9]+)/;
/**
 * HQ's floor. The spec bounds HEAD's quit by twice the parent's; the parent's own
 * quits spread from 591 to 2,783 ms at one build (SPEC §2.2), so a bound of twice
 * one reading alone would fail a quit no person could tell apart. Two seconds
 * more than the parent's, whichever is longer.
 */
export const QUIT_SLACK_MS = 2_000;
/** The identity columns HB compares just before the fault and after the first process is gone. */
export const IDENTITY_COLUMNS = Object.freeze(['id', 'name', 'tmux_name', 'project_path', 'cwd', 'agent', 'argv', 'created_at']);
/** Where the spec step left its checking better-sqlite3 (reused when present; P3571_BS3 overrides). */
export const CHECKING_BS3_DEFAULT = '/private/var/tmp/tortie-wt/scratch/p3571/crash/bs3';
/** Research 143's kept sources, from which a checking build is made when none is reused (P3571_R143_KEEP overrides). */
export const R143_KEEP_DEFAULT = '/private/var/tmp/tortie-wt/scratch/p3571/r143-keep';
/** The frame the crash-state quit faults in, at the parent, his report's own (research 143 §2.2, SPEC §2.1). */
export const CRASH_FRAME = 'pcache1EnforceMaxPage';
/** The address his crash read through: `pCache->nRecyclable` of a null `pCache` (research 143 §2.1). */
export const CRASH_ADDRESS = '0x34';
/** The checker's SIGSEGV line, which exits 139 before any macOS crash report is written. */
export const CRASH_SEGV_LINE = /\[p358adv-SEGV\]/;
/**
 * The checker's SIGSEGV line, read for its parts (adv-churn/tools/pcache-check-append.c,
 * `p358adv_segv`): `[p358adv-SEGV] signal 11 at address 0x34, pc 0x… = pcache1EnforceMaxPage+0x68 in …`.
 * THE PROBE REVIEW: the first build asked only whether the frame's NAME was
 * anywhere in the launch's output, so a fault in another frame beside a line
 * that merely named this one read as his crash.
 */
export const CRASH_SEGV_PARTS = /\[p358adv-SEGV\] signal (\d+) at address (0x[0-9a-f]+), pc 0x[0-9a-f]+ = ([^+\s]+)\+0x([0-9a-f]+) in /;
/** The checker's plant line and its violation lines, read for WHICH connection was planted (cache pointer, then the file a violation names for it). */
export const PLANT_LINE = /\[p358adv-PLANT\] crash-state at check \d+ op=\S+ cache=(0x[0-9a-f]+)/;
export const VIOLATION_LINE = /\[p358adv-VIOLATION\] [^\n]* file=(\S+) cache=(0x[0-9a-f]+)/g;
/**
 * Phase 36's wedged-watcher escape in the disposer (src/main/capabilities.ts,
 * written to stdout by `logQuit` immediately before its own SIGKILL). A quit
 * that printed it ended by THAT SIGKILL, not the will-quit handler's, so no
 * quit clause that reads "the will-quit SIGKILL" can be read from it (the
 * probe review: the first build read every SIGKILL as the will-quit one).
 */
export const WEDGED_QUIT_LINE = /still pending after 15 s more; ending the process hard because environment teardown would abort/;
/** The Settings-window bounds the crash preload moves to, so the relaunch can read that they survived the hard exit. */
export const SETTINGS_MOVED_BOUNDS = Object.freeze({ x: 233, y: 141, width: 802, height: 611 });
/** The three gmux.* localStorage keys the CS arms write in turn before the quit, the last one immediately before it. */
export const CS_LOCAL_STORAGE_KEYS = Object.freeze(['gmux.p3571.early', 'gmux.p3571.mid', 'gmux.p3571.late']);

// ---------------------------------------------------------------------------
// The readers: ONE pure function per reading the run derives from raw text.
// The live arms call these and nothing else; --grader-self-test drives them
// over recorded raw fixtures, so a reader that miscounts is shown to.
// ---------------------------------------------------------------------------

const arraysEqual = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((x, i) => x === b[i]);

/** One counter file's lines, parsed. A line that does not parse is kept as `{ unparsed: true }`, so it cannot pass as an empty file. */
export function counterOf(lines) {
  return (Array.isArray(lines) ? lines : [])
    .filter((l) => typeof l === 'string' && l.trim() !== '')
    .map((l) => {
      try {
        const o = JSON.parse(l);
        return o !== null && typeof o === 'object' ? o : { unparsed: true };
      } catch {
        return { unparsed: true };
      }
    });
}
/** The counter's events for one launch, the installed line aside. */
const uncaughtEvents = (r) => (Array.isArray(r) ? r.filter((x) => x && x.n !== undefined) : []);
/** Every uncaught exception the counter heard that is not its own control. */
export const nonControl = (r) => uncaughtEvents(r).filter((e) => !CONTROL_CODES.includes(e.code));
/** The control exception, heard how many times. */
export function controlHeard(r) {
  return uncaughtEvents(r).filter((e) => e.code === 'P357_CONTROL').length;
}
/** The counter said it was installed in Electron's main process, and every line of its file parsed. */
export function counterInstalled(r) {
  return Array.isArray(r) && r.some((x) => x && x.installed === true && x.type === 'browser') && !r.some((x) => x && x.unparsed === true);
}
/** True when a counted event is his broken-list stack, inside out. */
export function isHisStack(event) {
  if (event === null || typeof event !== 'object') return false;
  const names = (event.frames ?? []).map((f) => String(f).replace(/^at\s+/, '').split(/[\s(]/)[0]);
  // Every frame of his stack appears, in order, somewhere in the first frames.
  let at = 0;
  for (const want of HIS_STACK) {
    const found = names.indexOf(want, at);
    if (found === -1) return false;
    at = found + 1;
  }
  return event.code === 'SQLITE_CORRUPT' && String(event.message).includes('malformed');
}
/** How many of a counter's events are his stack. */
export const hisStackCount = (r) => uncaughtEvents(r).filter((e) => isHisStack(e)).length;

/** Words every one of the stopped list's sentences holds; kept as the fallback when the copy file cannot be read. */
export const STOPPED_WORDS = 'session list stopped reading';
/**
 * The sentences `src/shared/manifest-stopped-copy.ts` actually holds, read from
 * that file so this check tests the real copy rather than one hardcoded phrase
 * (Phase 357.1, Gap 3c). A quiet refusal carries NONE of them. Read once at
 * load; if the file cannot be read, `STOPPED_WORDS` stands in, so the check
 * never passes a record it should catch.
 */
export function stoppedCopyValues(root = ROOT) {
  try {
    const src = readFileSync(join(root, 'src', 'shared', 'manifest-stopped-copy.ts'), 'utf8');
    const out = [];
    const re = /export const MANIFEST_STOPPED_\w+\s*=\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g;
    for (let m = re.exec(src); m !== null; m = re.exec(src)) {
      const lit = m[1];
      try {
        out.push(lit[0] === '"' ? JSON.parse(lit) : lit.slice(1, -1).replace(/\\(['"\\])/g, '$1'));
      } catch {
        /* a literal that does not parse is skipped */
      }
    }
    if (out.length > 0) return Object.freeze(out);
  } catch {
    /* fall through to the fallback below */
  }
  return Object.freeze([STOPPED_WORDS]);
}
/** The four `MANIFEST_STOPPED_*` sentences, read once. */
export const STOPPED_COPY = stoppedCopyValues();
/**
 * What a quiet refusal may not carry: every whole value of the copy, EVERY
 * SENTENCE of each (split at its full stops), and the phrase every one of them
 * shares. THE PROBE REVIEW: the first widening tested whole values only, so a
 * record carrying one sentence of a value ("Restart Tortie, then try again.",
 * "Your sessions are still running.") or the phrase alone, which the parent's
 * check caught, read as quiet. Pure over the values.
 */
export function stoppedCopyNeedles(values) {
  const out = new Set([STOPPED_WORDS]);
  for (const v of Array.isArray(values) ? values : []) {
    if (typeof v !== 'string' || v.trim() === '') continue;
    out.add(v);
    for (const s of v.split(/(?<=[.!?])\s+/)) if (s.trim() !== '') out.add(s.trim());
  }
  return Object.freeze([...out]);
}
/** The needles over the copy this checkout holds. */
export const STOPPED_NEEDLES = stoppedCopyNeedles(STOPPED_COPY);
/**
 * One matcher per needle. A needle of several words is a substring; a needle
 * of ONE word (`MANIFEST_STOPPED_RESTART`, "Restart") is a whole word, so a
 * stack frame of code that names it inside an identifier (`armRestart`,
 * `RestartHost`, `localBeforeRestart` are all in src/main) is not the copy.
 */
export const stoppedNeedleMatcher = (needle) => {
  if (/\s/.test(needle)) return (text) => text.includes(needle);
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const word = new RegExp(`(^|[^A-Za-z0-9_$])${escaped}([^A-Za-z0-9_$]|$)`);
  return (text) => word.test(text);
};
const STOPPED_MATCHERS = STOPPED_NEEDLES.map(stoppedNeedleMatcher);
/**
 * THE FIX ROUND (F2), WIDENED (Phase 357.1, Gap 3c). A `crash.rejection` record
 * of the stopped store's own refusal that carries no user-facing words: event
 * `crash.rejection`, code `MANIFEST_STOPPED`, no `message` field, and NONE of
 * the four sentences of `src/shared/manifest-stopped-copy.ts` (STOPPED_COPY,
 * read from the file) anywhere in its JSON — not the single hardcoded
 * `STOPPED_WORDS` substring, so a change to the copy cannot leave this testing a
 * stale phrase. It is the D18 backstop working as built (SPEC T13, D17, D18):
 * boot's id-harvest rescue watches read one row when their 20 s settle, with no
 * catch, so on the 'his' seed a read after the stop is refused and reaches the
 * handler as an unhandled rejection, logged once per key with a repeat count;
 * at the parent the same reads were raw SqliteError rejections that nothing
 * logged. Any other crash record is still a finding: an uncaught exception of
 * any code, a rejection of another code or of none, and a stopped refusal
 * carrying a message field, any whole value of the copy, any one of its
 * sentences, or the phrase they share (STOPPED_NEEDLES).
 */
export function isQuietStoppedRejection(o) {
  if (o === null || typeof o !== 'object') return false;
  if (o.event !== 'crash.rejection' || o.code !== 'MANIFEST_STOPPED') return false;
  if (Object.prototype.hasOwnProperty.call(o, 'message')) return false;
  const text = JSON.stringify(o);
  return !STOPPED_MATCHERS.some((matches) => matches(text));
}

/**
 * app.log's lines (app.log.1 first, then app.log), read as records. `rowCanaries`
 * are strings no `manifest.stopped` record may carry (a shell's name, the
 * project's path). Pure over the lines.
 */
export function readAppLog(lines, { rowCanaries = [] } = {}) {
  const kept = (Array.isArray(lines) ? lines : []).filter((l) => typeof l === 'string' && l.trim() !== '');
  const parsed = kept.map((l) => {
    try {
      const o = JSON.parse(l);
      return o !== null && typeof o === 'object' ? o : {};
    } catch {
      return {};
    }
  });
  // Boots per pid (§8 RUN): one `macOS login session` line is logged per core
  // boot (src/main/tmux/supervisor.ts). A pid that logged more than one boot
  // booted a second core while it ran, which §0.1 item 8 is about. PRINTED,
  // not graded: it is older than this phase (§12, §13 owe it an entry).
  const bootPids = {};
  for (const o of parsed) if (o.scope === 'tmux' && typeof o.msg === 'string' && o.msg.startsWith('macOS login session')) bootPids[String(o.pid)] = (bootPids[String(o.pid)] ?? 0) + 1;
  const crash = parsed.filter((o) => o.scope === 'crash');
  const stopped = parsed.filter((o) => o.event === 'manifest.stopped');
  const canaries = rowCanaries.filter((c) => typeof c === 'string' && c !== '');
  const notices = parsed.filter((o) => o.event === 'notice.shown');
  return {
    lines: kept.length,
    crashScope: crash.length,
    // A crash record that is not the counter's own control: an uncaught exception
    // or a rejection this run did not plant, the D18 backstop's included.
    // PRINTED since the fix round; HA and HB grade `crashUnexpected`.
    crashOther: crash.filter((o) => (o.event === 'crash.uncaught' || o.event === 'crash.rejection') && !CONTROL_CODES.includes(o.code)).length,
    // The stopped store's own refusals that reached the crash handler as
    // rejections with no message text (isQuietStoppedRejection). PRINTED.
    crashStopped: crash.filter((o) => isQuietStoppedRejection(o)).length,
    // The fix round's F2: every crash record that is neither the counter's own
    // control nor such a refusal. HA and HB hold it to zero.
    crashUnexpected: crash.filter((o) => (o.event === 'crash.uncaught' || o.event === 'crash.rejection') && !CONTROL_CODES.includes(o.code) && !isQuietStoppedRejection(o)).length,
    // A line carrying a control's MESSAGE: app.log keeps no message but SQLite's (D16).
    canaryLines: kept.filter((l) => CONTROL_MESSAGES.some((m) => l.includes(m))).length,
    malformed: kept.filter((l) => l.includes('malformed')).length,
    // PRINTED, not graded: today's refresh warns once per failed refresh, and the
    // attack lens holds HEAD to at most one line per distinct error (SPEC §10.2).
    refreshFailed: parsed.filter((o) => typeof o.msg === 'string' && o.msg.startsWith('refresh failed')).length,
    stopped,
    stoppedRowData: stopped.some((o) => canaries.some((c) => JSON.stringify(o).includes(c))),
    notices,
    crash,
    uncleanExit: notices.filter((o) => o.notice === 'unclean-exit').length,
    quarantined: notices.filter((o) => o.notice === 'manifest-quarantined').length,
    unreadableNotices: notices.filter((o) => o.notice === 'manifest-unreadable').length,
    notRelaunchedLine: parsed.some((o) => o.scope === 'quit' && typeof o.msg === 'string' && NOT_RELAUNCHED_LINE.test(o.msg)),
    gateLines: kept.filter((l) => /quarantin|integrity|rebuilt|damaged|recover|unclean/.test(l)).map((l) => l.slice(0, 200)),
    bootPids,
    // Every main process that wrote a record (the envelope's `pid` and
    // `proctype`, src/main/log/format.ts): one per launch that logged at all.
    // The `macOS login session` line above needs SECURITYSESSIONID, so it is no
    // count of launches; this is.
    mainPids: [...new Set(parsed.filter((o) => o.proctype === 'main' && Number.isInteger(o.pid)).map((o) => o.pid))]
  };
}
export function stoppedFact(al) {
  const s = al.stopped ?? [];
  return { count: s.length, operation: s[0]?.operation ?? null, code: s[0]?.code ?? null, file: s[0]?.file ?? null, rowData: al.stoppedRowData === true };
}
export function noticeFact(al) {
  const n = (al.notices ?? []).filter((o) => o.notice === 'manifest-stopped');
  return { count: n.length, kind: n[0]?.notice ?? null };
}
/** HA's and HB's app.log readings, from one app.log read. */
export function applyAppLog(reading, al) {
  reading.appLog = al;
  reading.stopped = stoppedFact(al);
  reading.notice = noticeFact(al);
  return reading;
}

/**
 * The renderer's own parse of a main process rejection (`errorPayload`,
 * src/renderer/state/errors.ts), by value: from the first `{`, a JSON
 * GmuxErrorPayload whose `message` is a string, or null. An `ipcRenderer.invoke`
 * rejection reads `Error invoking remote method '<channel>': Error: {…}`, so the
 * sentence a person is shown is this payload's message, never the raw text.
 */
export function errorPayloadOf(raw) {
  if (typeof raw !== 'string') return null;
  const start = raw.indexOf('{');
  if (start === -1) return null;
  try {
    const p = JSON.parse(raw.slice(start));
    return p !== null && typeof p === 'object' && typeof p.message === 'string' ? p : null;
  } catch {
    return null;
  }
}
/** A create's answer over the bridge, and whether a tmux session of that name appeared across it. */
export function createReading(answer, namesBefore, namesAfter, name) {
  const answered = answer !== null && typeof answer === 'object' && typeof answer.ok === 'boolean';
  const ok = answered && answer.ok === true;
  const raw = !answered || ok ? null : typeof answer.error === 'string' ? answer.error : null;
  const payload = errorPayloadOf(raw);
  return {
    answered,
    ok,
    raw,
    // What the window's toast says (`errorText`): the payload's message, else the raw text.
    error: payload?.message ?? raw,
    code: payload?.code ?? null,
    spawned: Array.isArray(namesBefore) && Array.isArray(namesAfter) && !namesBefore.includes(name) && namesAfter.includes(name)
  };
}
/** What a launch's whole output (the shim's and the app's) says about how it ended. */
export function exitReading(text, code) {
  const t = typeof text === 'string' ? text : '';
  const sig = SHIM_SIGNAL_LINE.exec(t);
  return {
    code,
    signal: sig === null ? null : sig[1],
    notRelaunchedLine: NOT_RELAUNCHED_LINE.test(t),
    heldOpenLine: LEFT_OPEN_QUIT_LINE.test(t),
    closeHeldLine: CLOSE_HELD_LINE.test(t),
    // Phase 36's own SIGKILL said its line first (WEDGED_QUIT_LINE).
    wedgedExit: WEDGED_QUIT_LINE.test(t)
  };
}
/** HA's quit: whether the disposer said it held a connection open, the shim's signal if any, and whether Phase 36's escape ended it. */
export function quitTextReading(text) {
  const e = exitReading(text, null);
  return { heldOpen: e.heldOpenLine, signal: e.signal, wedgedExit: e.wedgedExit };
}
/**
 * The crash-state quit, read from the launch's whole output and its exit code:
 * whether the checker's SEGV handler fired (`segv`), the frame, offset and
 * address ITS line names, whether that is his report's (`crashFrame`:
 * `pcache1EnforceMaxPage` reading through 0x34), the shim's signal, Phase 36's
 * escape, and the exit code. At the parent the fault exits 139 with
 * `segv`/`crashFrame`; at HEAD the process ends by the will-quit SIGKILL with
 * neither.
 */
export function crashStateQuit(text, code) {
  const t = typeof text === 'string' ? text : '';
  const sig = SHIM_SIGNAL_LINE.exec(t);
  const parts = CRASH_SEGV_PARTS.exec(t);
  const segvFrame = parts === null ? null : parts[3];
  const segvAddress = parts === null ? null : parts[2];
  return {
    code,
    signal: sig === null ? null : sig[1],
    segv: CRASH_SEGV_LINE.test(t),
    segvFrame,
    segvOffset: parts === null ? null : `0x${parts[4]}`,
    segvAddress,
    crashFrame: segvFrame === CRASH_FRAME && segvAddress === CRASH_ADDRESS,
    wedgedExit: WEDGED_QUIT_LINE.test(t)
  };
}
/**
 * WHICH connection the checker planted, from its own output: the cache pointer
 * its plant line names, then the file the first violation line naming that
 * cache gives. `sessionList` is the arm's own manifest (the app's session list
 * connection, his crash's), `preloadDir` the folder the crash preload opens its
 * manifest-shaped db in. Pure over the text and the two real paths.
 */
export function plantTargetOf(text, { sessionList, preloadDir } = {}) {
  const t = typeof text === 'string' ? text : '';
  const plant = PLANT_LINE.exec(t);
  if (plant === null) return { target: null, file: null };
  const after = t.slice(plant.index);
  let file = null;
  for (const m of after.matchAll(VIOLATION_LINE)) {
    if (m[2] === plant[1]) {
      file = m[1];
      break;
    }
  }
  if (file === null) return { target: null, file: null };
  if (typeof sessionList === 'string' && sessionList !== '' && file === sessionList) return { target: 'session-list', file };
  if (typeof preloadDir === 'string' && preloadDir !== '' && file.startsWith(`${preloadDir}/`)) return { target: 'preload', file };
  return { target: 'other', file };
}
/**
 * RUN's socket reading (Phase 357.1 Gap 3a, completed by the probe review),
 * pure over the socket directory's names. Only THIS run's socket can be this
 * run's leftover (another run's `gmux-p357` socket, a second verifier's, is not
 * this run's state), build/harness-socket.mjs's `<socket>.run` marker is never
 * a socket, and a socket FILE is not a server: tmux 3.7b keeps the file after
 * `kill-server` (measured by the probe review) and the harness unlinks it by
 * name once this run exits. So a socket is LEFT only when a server still
 * answers on it. `names` null means the directory could not be read.
 */
export function socketsLeftOf(names, socket, answers) {
  if (!Array.isArray(names) || typeof socket !== 'string' || socket === '') return { read: false, left: null, files: [], marker: null };
  const files = names.filter((n) => n === socket);
  return { read: true, left: files.filter((n) => answers(n) === true).length, files, marker: names.includes(`${socket}.run`) };
}
/** Whether the checker said it planted the crash state (its own line, never the preload's marker). */
export const plantedOf = (text) => typeof text === 'string' && /\[p358adv-PLANT\] crash-state/.test(text);
/** Two id lists as sets: every id of one is in the other and neither repeats one the other lacks. */
export function sameIdSet(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length === 0) return false;
  const A = new Set(a);
  const B = new Set(b);
  return A.size === B.size && [...A].every((x) => B.has(x));
}
/** How many of the CS keys' values read back as the run's nonce. */
export function localStorageKept(values, nonce) {
  if (!Array.isArray(values) || typeof nonce !== 'string' || nonce === '') return null;
  return values.filter((v) => v === nonce).length;
}
/** True when a window's bounds are the probe's moved size (macOS may nudge the origin, never the size it was given). */
export const boundsMatch = (b) => b !== null && typeof b === 'object' && b.width === SETTINGS_MOVED_BOUNDS.width && b.height === SETTINGS_MOVED_BOUNDS.height;
/** HB's rows just before the fault against the rows after the first process ended. */
export function compareRows(before, after) {
  if (before?.read !== true || after?.read !== true || !Array.isArray(before.rows) || !Array.isArray(after.rows)) {
    return { read: false, why: `rows unread: ${J({ before: before?.why ?? null, after: after?.why ?? null })}` };
  }
  const byId = new Map(after.rows.map((r) => [r.id, r]));
  const beforeIds = new Set(before.rows.map((r) => r.id));
  const mismatched = [];
  let statusMoved = 0;
  for (const b of before.rows) {
    const a = byId.get(b.id);
    if (a === undefined) continue;
    for (const col of IDENTITY_COLUMNS) if (a[col] !== b[col]) mismatched.push({ id: b.id, col });
    if (a.status !== b.status || a.last_seen !== b.last_seen) statusMoved += 1;
  }
  const added = after.rows.map((r) => r.id).filter((id) => !beforeIds.has(id));
  const gone = before.rows.map((r) => r.id).filter((id) => !byId.has(id));
  return {
    read: true,
    // A row added or gone is a write after the latch: nothing in HB's script makes or removes one.
    sameIds: added.length === 0 && gone.length === 0,
    identityUnchanged: mismatched.length === 0,
    added: added.slice(0, 20),
    gone: gone.slice(0, 20),
    mismatched: mismatched.slice(0, 20),
    // PRINTED, never graded: an ordinary write may move them between the read and the latch.
    statusMoved,
    before: before.rows.length,
    after: after.rows.length
  };
}
/** The next launch's list against the rows a launch lists: every row that is not removed (`core.listSessions` skips `discarded`). */
export function listedReading(rowsAfter, listedIds) {
  if (rowsAfter?.read !== true || !Array.isArray(rowsAfter.rows) || !Array.isArray(listedIds)) return { read: false };
  const kept = rowsAfter.rows.filter((r) => r.status !== 'discarded').map((r) => r.id);
  const listed = new Set(listedIds);
  const keptSet = new Set(kept);
  const missing = kept.filter((id) => !listed.has(id));
  const extra = [...listed].filter((id) => !keptSet.has(id));
  return { read: true, kept: kept.length, listed: listed.size, equal: missing.length === 0 && extra.length === 0, missing: missing.slice(0, 10), extra: extra.slice(0, 10) };
}
/** HC's crash records, from one app.log read: the control's records by their codes, its repeats by its OWN key. */
export function crashReadingOf(al) {
  const crash = Array.isArray(al?.crash) ? al.crash : [];
  const uncaught = crash.filter((o) => o.event === 'crash.uncaught' && o.code === 'P357_CONTROL');
  const rejection = crash.filter((o) => o.event === 'crash.rejection' && o.code === 'P357_CONTROL_REJECTION');
  const repeatRecords = crash.filter((o) => o.event === 'crash.repeats');
  const key = typeof uncaught[0]?.key === 'string' ? uncaught[0].key : null;
  const entry = repeatRecords.flatMap((o) => (Array.isArray(o.repeats) ? o.repeats : [])).find((x) => x !== null && typeof x === 'object' && key !== null && x.key === key);
  return {
    uncaughtRecords: uncaught.length,
    uncaughtName: uncaught[0]?.name ?? null,
    uncaughtCode: uncaught[0]?.code ?? null,
    uncaughtHasMessage: uncaught[0] === undefined ? null : uncaught[0].message !== undefined,
    uncaughtMessageChars: uncaught[0]?.messageChars ?? null,
    rejectionRecords: rejection.length,
    repeatsRecords: repeatRecords.length,
    repeats: { count: entry?.count ?? null, key: entry?.key ?? null, sameKey: entry !== undefined }
  };
}
/** HC's reading of one app.log read. */
export function hcFromAppLog(al) {
  return { appLog: { lines: al.lines, crashOther: al.crashOther, canaryLines: al.canaryLines }, ...crashReadingOf(al) };
}

/** p349's history rule, by value: unmoved, held, his terminal, or unread. */
export function historyHeld(history) {
  if (history?.before === history?.after) return 'unmoved';
  if (history?.quiet === null || history?.quiet === undefined || typeof history.quiet.again !== 'string') return 'unread';
  return history.quiet.again !== history.after ? 'his terminal' : 'held';
}

// ---------------------------------------------------------------------------
// The graders (pure, over a reading): used live and in --grader-self-test
// ---------------------------------------------------------------------------

/** The counter at boot and at the end of one launch: installed, every line parsed, its control heard. */
const counterHeldNeed = (name, times = 1) => [
  name,
  (r) => counterInstalled(r.counter) && controlHeard(r.counter) >= times && counterInstalled(r.counterEnd) && controlHeard(r.counterEnd) >= times
];
const AGENTS_NEED = ['the agents:list answer resolved nothing but the stand-ins (none)', (r) => r.agents.ok === true];
/** The crash-state arms' need: the scratch checking better-sqlite3 was built or reused (never node_modules). */
const CS_BS3_NEED = ['the scratch checking better-sqlite3 was built or reused (never a checkout’s node_modules)', (r) => r.bs3Built === true];
/**
 * THE PROBE REVIEW. Every quit clause since Phase 357.1 reads "the will-quit
 * SIGKILL" from the shim's signal alone, and Phase 36's wedged-watcher escape
 * ends a quit by SIGKILL too, before the windows close and without the flush.
 * A quit that printed that escape's line cannot say whether the will-quit
 * handler ran, so it is UNREADABLE, never a pass (and never the product's FAIL).
 */
const NOT_WEDGED_NEED = (at) => [
  'the quit did not take Phase 36’s wedged-watcher escape, so a SIGKILL is the will-quit handler’s',
  (r) => (at === 'restart' ? r.restart.wedgedExit : r.quit.wedgedExit) === false
];
/**
 * THE PROBE REVIEW. The crash's own state raises no error, so the session list
 * must NOT have stopped: a `manifest.stopped` record means 357's latch, not the
 * quit hold, explains HEAD's quit (and would make the parent hold too).
 */
const CS_NO_LATCH_NEED = ['the session list never stopped (no manifest.stopped record), so the crash state raised no error and 357’s latch explains nothing', (r) => r.stopped.count === 0];
/** THE PROBE REVIEW. The plant landed in the app's own session list connection or in the preload's manifest-shaped one, read from the checker's own lines. */
const CS_TARGET_NEED = ['the checker planted the session list’s own connection or the preload’s manifest-shaped one, read from its own lines', (r) => r.plantedIn === 'session-list' || r.plantedIn === 'preload'];
const SHELLS_NEED = ['the list read before the damage, holding the three shells', (r) => r.listBefore.ok === true && SHELL_NAMES.every((n) => (r.listBefore.names ?? []).includes(n))];
/**
 * HA's and HB's crash clause, one definition so the two say it word for word
 * (the fix round's F2, narrowed from "no crash record but the counter's own
 * controls"): the counter's controls and the stopped store's own refusals as
 * rejections with no message text are expected (isQuietStoppedRejection);
 * every other crash record fails it.
 */
const CRASH_CLAUSE = [
  'app.log holds no crash record but the counter’s own controls and the stopped list’s own refusals as rejections with no message text, and no control message text',
  (r) => r.appLog.crashUnexpected === 0 && r.appLog.canaryLines === 0
];

export const GRADERS = {
  // THE PROBE REVIEW re-scoped PA to THIS phase's parent. It described 357's
  // own parent `0547383e` (an uncaught exception per rename, a raw SqliteError
  // for a create it spawned, no crash scope) while SNAPSHOT and the spec name
  // 357 as landed (`32180e60`), which fixed every one of those, so PA failed by
  // construction against the one parent the run is handed and HQ, which times
  // PA's quit, could never be read (the integrator's F1). At 357 as landed real
  // damage latches exactly as HEAD's HA does, and the quit CLOSES the damaged
  // file and exits 0 (357's D11): that clean quit is what HQ holds HEAD's
  // will-quit SIGKILL to.
  PA: {
    title: 'the parent (357 as landed), real page damage: one stop and its notice, a refused create, no uncaught exception, and a quit that closes the damaged file and exits 0',
    reads: ['counter', 'counterEnd', 'agents.ok', 'damage.changed', 'listBefore.ok', 'listBefore.names', 'uncaughtAtEnd', 'stopped.count', 'stopped.code', 'stopped.file', 'notice.count', 'create.ok', 'create.error', 'create.code', 'create.spawned', 'appLog.crashUnexpected', 'appLog.canaryLines', 'quit.code', 'quit.signal', 'quit.wedgedExit'],
    needs: [counterHeldNeed('the counter was installed in main and heard its own control exception, at boot and at the end'), AGENTS_NEED, ['the damage changed a byte of the scratch manifest', (r) => r.damage.changed === true], SHELLS_NEED, NOT_WEDGED_NEED('quit')],
    clauses: [
      ['no uncaught exception reached the counter from the launch to its exit', (r) => r.uncaughtAtEnd === 0],
      ['one manifest.stopped record, SQLITE_CORRUPT, file damaged', (r) => r.stopped.count === 1 && r.stopped.code === 'SQLITE_CORRUPT' && r.stopped.file === 'damaged'],
      ['one notice.shown manifest-stopped, and no second one', (r) => r.notice.count === 1],
      ['the create was refused with the stopped sentence (MANIFEST_STOPPED) and nothing spawned', (r) => r.create.ok === false && r.create.code === 'MANIFEST_STOPPED' && r.create.error === MANIFEST_STOPPED_REFUSAL && r.create.spawned === false],
      CRASH_CLAUSE,
      ['the quit exited 0 by no signal: at the parent a damaged file closes at quit (357’s D11)', (r) => r.quit.code === 0 && r.quit.signal === null]
    ]
  },
  HA: {
    title: 'HEAD, real page damage: one notice, the last clean list, a refused create, no uncaught exception, a clean quit',
    reads: ['counter', 'counterEnd', 'agents.ok', 'damage.changed', 'listBefore.ok', 'listBefore.ids', 'listBefore.names', 'uncaughtAtEnd', 'stopped.count', 'stopped.operation', 'stopped.code', 'stopped.file', 'stopped.rowData', 'notice.count', 'listAfter.ok', 'create.ok', 'create.error', 'create.code', 'create.spawned', 'renamesTried', 'renamesLandedInTmux', 'renameUncaught', 'appLog.crashUnexpected', 'appLog.canaryLines', 'quit.signal', 'quit.wedgedExit', 'relaunch.ran', 'relaunch.quarantined', 'relaunch.rows'],
    needs: [counterHeldNeed('the counter was installed in main and heard its own control exception, at boot and at the end'), AGENTS_NEED, ['the damage changed a byte of the scratch manifest', (r) => r.damage.changed === true], SHELLS_NEED, ['the relaunch on that profile ran', (r) => r.relaunch.ran === true], NOT_WEDGED_NEED('quit')],
    clauses: [
      ['no uncaught exception reached the counter from the launch to its exit', (r) => r.uncaughtAtEnd === 0],
      ['one manifest.stopped record, naming the operation and SQLITE_CORRUPT, file damaged', (r) => r.stopped.count === 1 && typeof r.stopped.operation === 'string' && r.stopped.code === 'SQLITE_CORRUPT' && r.stopped.file === 'damaged'],
      ['that record carries no row data (no shell name, no project path)', (r) => r.stopped.rowData === false],
      ['one notice.shown manifest-stopped, and no second one', (r) => r.notice.count === 1],
      ['sessions:list answered the last clean list: the ids and names it answered before the damage', (r) => r.listAfter.ok === true && arraysEqual(r.listAfter.ids, r.listBefore.ids) && arraysEqual(r.listAfter.names, r.listBefore.names)],
      ['the create was refused with the stopped sentence (MANIFEST_STOPPED) and nothing spawned', (r) => r.create.ok === false && r.create.code === 'MANIFEST_STOPPED' && r.create.error === MANIFEST_STOPPED_REFUSAL && r.create.spawned === false],
      ['each external rename landed in tmux and in no uncaught exception', (r) => r.renamesTried >= 2 && r.renamesLandedInTmux === r.renamesTried && r.renameUncaught === 0],
      CRASH_CLAUSE,
      ['the quit ended by the will-quit SIGKILL, never a crash (Phase 357.1 D1: the manifest is held at every quit, the damaged file included)', (r) => r.quit.signal === 'SIGKILL'],
      ['the relaunch’s gate quarantined the damaged file and the relaunch read rows back', (r) => r.relaunch.quarantined === true && r.relaunch.rows > 0]
    ]
  },
  HQ: {
    title: 'HEAD’s quit after real page damage, against the parent’s',
    reads: ['parentMs', 'parentCode', 'parentWedged', 'headMs', 'headSignal', 'headWedged'],
    needs: [
      [
        'both quits were timed; the parent exited 0 and HEAD ended by the will-quit SIGKILL (Phase 357.1 D1)',
        (r) => r.parentCode === 0 && r.headSignal === 'SIGKILL' && Number.isFinite(r.parentMs) && r.parentMs > 0 && Number.isFinite(r.headMs) && r.headMs > 0
      ],
      // THE PROBE REVIEW: a quit Phase 36's escape ended waited out its late
      // drain first, so its time says nothing about the will-quit SIGKILL.
      ['neither quit took Phase 36’s wedged-watcher escape', (r) => r.parentWedged === false && r.headWedged === false]
    ],
    clauses: [['HEAD’s quit took at most twice the parent’s, or two seconds more, whichever is longer', (r) => r.headMs <= Math.max(2 * r.parentMs, r.parentMs + QUIT_SLACK_MS)]]
  },
  HB: {
    title: 'HEAD, the memory-shaped seam: the file is fine, Restart ends the process without closing it, the next launch does not quarantine, and every row is kept',
    reads: ['counter', 'counterEnd', 'agents.ok', 'seamInstalled', 'armed', 'listBefore.ok', 'rows.read', 'uncaughtAtEnd', 'stopped.count', 'stopped.operation', 'stopped.code', 'stopped.file', 'stopped.rowData', 'notice.count', 'toast', 'create.ok', 'create.error', 'create.code', 'create.spawned', 'restart.clicked', 'restart.code', 'restart.signal', 'restart.wedgedExit', 'restart.notRelaunchedLine', 'restart.walBefore', 'restart.walAfter', 'restart.sentinelBefore', 'restart.sentinelAfter', 'relaunch.ran', 'relaunch.quarantined', 'relaunch.unreadableNotices', 'relaunch.uncleanExit', 'relaunch.inodeBefore', 'relaunch.inodeAfter', 'relaunch.listed.read', 'appLog.crashUnexpected', 'appLog.canaryLines'],
    needs: [
      counterHeldNeed('the counter was installed in main and heard its own control exception, at boot and at the end'),
      AGENTS_NEED,
      ['the seam was installed and armed its one fault, said on stdout', (r) => r.seamInstalled === true && r.armed === true],
      SHELLS_NEED,
      ['the rows were read just before the fault (by SQLite, read only) and after the first process ended (a copy)', (r) => r.rows.read === true],
      ['the relaunch on that profile ran', (r) => r.relaunch.ran === true],
      NOT_WEDGED_NEED('restart')
    ],
    clauses: [
      ['no uncaught exception reached the counter from the launch to its hard exit', (r) => r.uncaughtAtEnd === 0],
      ['one manifest.stopped record: listSessions, SQLITE_CORRUPT, file FINE (the case real damage cannot make)', (r) => r.stopped.count === 1 && r.stopped.operation === 'listSessions' && r.stopped.code === 'SQLITE_CORRUPT' && r.stopped.file === 'fine'],
      ['that record carries no row data (no shell name, no project path)', (r) => r.stopped.rowData === false],
      ['one notice, drawn in the window with its sentence and a Restart button', (r) => r.notice.count === 1 && r.toast !== null && r.toast.text === MANIFEST_STOPPED_NOTICE && r.toast.button === MANIFEST_STOPPED_RESTART],
      ['the create was refused with the stopped sentence (MANIFEST_STOPPED) and nothing spawned', (r) => r.create.ok === false && r.create.code === 'MANIFEST_STOPPED' && r.create.error === MANIFEST_STOPPED_REFUSAL && r.create.spawned === false],
      ['Restart was pressed, the harness launch was not relaunched, and the app ended by SIGKILL, never a crash', (r) => r.restart.clicked === true && r.restart.notRelaunchedLine === true && r.restart.signal === 'SIGKILL' && r.restart.code === 1],
      ['the quit closed nothing: the -wal on disk before and after, the run sentinel there before and cleared after by the will-quit handler (Phase 357.1 D2)', (r) => r.restart.walBefore === true && r.restart.walAfter === true && r.restart.sentinelBefore === true && r.restart.sentinelAfter === false],
      ['nothing was written after the latch: the same session rows, every identity column unchanged', (r) => r.rows.sameIds === true && r.rows.identityUnchanged === true],
      ['the next launch kept the same file (no quarantine, no unreadable notice) and posted no unclean-exit notice', (r) => r.relaunch.quarantined === 0 && r.relaunch.unreadableNotices === 0 && r.relaunch.uncleanExit === 0 && Number.isInteger(r.relaunch.inodeBefore) && r.relaunch.inodeBefore === r.relaunch.inodeAfter],
      ['the next launch listed exactly the rows that are not removed', (r) => r.relaunch.listed.read === true && r.relaunch.listed.equal === true],
      CRASH_CLAUSE
    ]
  },
  HD: {
    title: 'HEAD, the phone’s door in HB’s launch: Needs input says the one sentence, its other reads 404 where they answered before',
    reads: ['before.blockedStatus', 'before.blockedLine', 'before.sessions', 'before.oneSession', 'after.blockedStatus', 'after.blockedLine', 'after.blockedRows', 'after.blockedOthers', 'after.sessions', 'after.oneSession'],
    needs: [['the phone paired and read the door before the fault: Needs input, Sessions and one session each 200', (r) => r.before.blockedStatus === 200 && r.before.sessions === 200 && r.before.oneSession === 200]],
    clauses: [
      ['Needs input said the one sentence with no rows after the fault', (r) => r.after.blockedStatus === 200 && r.after.blockedLine === MANIFEST_STOPPED_PHONE_LINE && r.after.blockedRows === 0 && r.after.blockedOthers === 0],
      ['Sessions answered 404 after the fault, where it answered 200 before', (r) => r.after.sessions === 404],
      ['one session answered 404 after the fault, where it answered 200 before', (r) => r.after.oneSession === 404],
      ['before the fault Needs input did not say the stopped sentence', (r) => r.before.blockedLine !== MANIFEST_STOPPED_PHONE_LINE]
    ]
  },
  HC: {
    title: 'HEAD, the crash handlers: one record per distinct error, the repeats counted under its key, no message text, no dialog in a harness launch',
    reads: ['counter', 'counterEnd', 'agents.ok', 'uncaughtRecords', 'uncaughtName', 'uncaughtCode', 'uncaughtHasMessage', 'uncaughtMessageChars', 'rejectionRecords', 'repeats.count', 'repeats.key', 'repeats.sameKey', 'appLog.canaryLines', 'mainAnswered.ok', 'mainAnswered.controlsBefore', 'quit.signal', 'quit.wedgedExit'],
    needs: [counterHeldNeed('the counter was installed in main and heard BOTH control exceptions, at boot and at the end', 2), AGENTS_NEED, NOT_WEDGED_NEED('quit')],
    clauses: [
      ['one crash.uncaught record for the two identical exceptions (name Error, code P357_CONTROL, its length and never its text)', (r) => r.uncaughtRecords === 1 && r.uncaughtName === 'Error' && r.uncaughtCode === 'P357_CONTROL' && r.uncaughtHasMessage === false && r.uncaughtMessageChars === CONTROL_MESSAGES[0].length],
      ['one crash.rejection record, the control rejection’s', (r) => r.rejectionRecords === 1],
      ['crash.repeats at quit counts 2 under the uncaught record’s own key', (r) => r.repeats.sameKey === true && r.repeats.count === 2 && typeof r.repeats.key === 'string' && /^[0-9a-f]{64}$/.test(r.repeats.key)],
      ['no control message text anywhere in app.log', (r) => r.appLog.canaryLines === 0],
      // Phase 357.1's integrator: HEAD's quit no longer exits 0 (D1 holds the
      // manifest at every quit and D2 ends the process by the will-quit
      // SIGKILL), so reaching that SIGKILL is what says no dialog held the quit,
      // read from the shim's own line exactly as HA's quit is.
      ['no dialog held main: it answered an IPC after both control exceptions, and the quit reached the will-quit SIGKILL (Phase 357.1 D1/D2)', (r) => r.mainAnswered.ok === true && r.mainAnswered.controlsBefore >= 2 && r.quit.signal === 'SIGKILL']
    ]
  },
  'CS-parent': {
    title: 'the parent, the crash’s own state: no read fails, and the quit crashes in pcache1EnforceMaxPage (SIGSEGV, exit 139), his report’s frame',
    reads: ['bs3Built', 'agents.ok', 'planted', 'plantedIn', 'readsOk', 'stopped.count', 'quit.code', 'quit.segv', 'quit.crashFrame', 'quit.wedgedExit'],
    needs: [
      CS_BS3_NEED,
      AGENTS_NEED,
      ['the checker planted the crash state and no read failed before the quit', (r) => r.planted === true && r.readsOk === true],
      CS_TARGET_NEED,
      CS_NO_LATCH_NEED,
      NOT_WEDGED_NEED('quit')
    ],
    clauses: [
      ['the quit faulted with SIGSEGV in pcache1EnforceMaxPage reading through 0x34 (the checker’s own report, no macOS dump)', (r) => r.quit.segv === true && r.quit.crashFrame === true],
      ['the faulting process exited 139, not cleanly', (r) => r.quit.code === 139]
    ]
  },
  'CS-head': {
    title: 'HEAD, the crash’s own state: no read fails, the held connection is never closed, the quit ends by the will-quit SIGKILL with no crash, and the relaunch keeps everything',
    reads: ['bs3Built', 'agents.ok', 'planted', 'plantedIn', 'readsOk', 'stopped.count', 'settingsMoved', 'listBefore.ok', 'quit.signal', 'quit.segv', 'quit.wedgedExit', 'relaunch.ran', 'relaunch.bootsLogged', 'relaunch.unclean', 'relaunch.shellsKept', 'relaunch.sameIds', 'relaunch.localStorage.kept', 'relaunch.bounds'],
    needs: [
      CS_BS3_NEED,
      AGENTS_NEED,
      ['the checker planted the crash state and no read failed before the quit', (r) => r.planted === true && r.readsOk === true],
      CS_TARGET_NEED,
      CS_NO_LATCH_NEED,
      NOT_WEDGED_NEED('quit'),
      // THE PROBE REVIEW: a Settings window the preload never moved has no
      // bounds of the probe's to keep, so a lost size is the probe's, not a FAIL.
      ['the preload moved the Settings window to the probe’s bounds before the quit', (r) => r.settingsMoved === true],
      ['the window listed the sessions before the quit', (r) => r.listBefore.ok === true],
      ['the relaunch on that profile ran', (r) => r.relaunch.ran === true],
      // THE PROBE REVIEW: no unclean-exit notice in an app.log that never logged
      // the relaunch's boot is no reading at all, not a clean relaunch.
      ['app.log recorded both launches’ boots, so its notices can be read', (r) => r.relaunch.bootsLogged >= 2]
    ],
    clauses: [
      ['the quit did NOT crash: no SIGSEGV, and the process ended by the will-quit SIGKILL (Phase 357.1 D1/D2)', (r) => r.quit.segv === false && r.quit.signal === 'SIGKILL'],
      ['the relaunch posted no unclean-exit notice, so the will-quit handler cleared the run sentinel', (r) => r.relaunch.unclean === 0],
      ['the relaunch read every seeded shell back', (r) => r.relaunch.shellsKept === true],
      ['the relaunch listed every session the window listed before the quit, and no other', (r) => r.relaunch.sameIds === true],
      ['localStorage survived, 3 of 3 (the synchronous flushStorageData kept it)', (r) => r.relaunch.localStorage.kept === 3],
      ['the Settings window bounds survived the hard exit', (r) => r.relaunch.bounds === true]
    ]
  },
  RUN: {
    title: 'the preflights held, the hidden agents held, every launch clean, his history unmoved',
    reads: ['tailscalePreflight', 'realTailscale', 'dnsPreflights', 'agentsHeld', 'countersHeard', 'serverRead', 'serverGone', 'socketsRead', 'socketsLeft', 'processTableRead', 'electronsLeft', 'history.before', 'history.after'],
    needs: [
      ['the process table and the scratch server were read at the end', (r) => r.processTableRead === true && r.serverRead === true],
      ['at least one launch reached its window', (r) => r.agentsHeld.length > 0],
      // THE PROBE REVIEW: an unreadable socket directory used to read as no socket left.
      ['the socket directory tmux and the harness use was read', (r) => r.socketsRead === true]
    ],
    clauses: [
      ['the Tailscale preflight passed at every launch and no real Tailscale was ever seen', (r) => r.tailscalePreflight === true && r.realTailscale === 0],
      ['the DNS preflight passed at every launch and named loopback only', (r) => r.dnsPreflights.length > 0 && r.dnsPreflights.every((x) => x === true)],
      ['every launch’s agents:list resolved nothing but the stand-ins (none)', (r) => r.agentsHeld.length > 0 && r.agentsHeld.every((x) => x === true)],
      ['the counter was loaded and heard its control exception at every launch', (r) => r.countersHeard.length > 0 && r.countersHeard.every((x) => x >= 1)],
      ['the scratch tmux server is gone and no server answers on this run’s socket (its file is the harness’s to unlink)', (r) => r.serverGone === true && r.socketsLeft === 0],
      ['every Electron this run started is gone', (r) => r.electronsLeft === 0],
      ['his shell history did not move across the run', (r) => historyHeld(r.history) === 'unmoved' || historyHeld(r.history) === 'his terminal']
    ]
  }
};

/** True when `path` (dots) names a value that is not undefined. */
function present(reading, path) {
  let o = reading;
  for (const k of String(path).split('.')) {
    if (o === null || o === undefined || typeof o !== 'object') return false;
    o = o[k];
  }
  return o !== undefined;
}
const holds = (predicate, reading) => {
  try {
    return predicate(reading) === true;
  } catch {
    return false;
  }
};
/** The words a missing field is named by in a verdict. */
export const missingField = (path) => `the reading has no ${path}`;

/**
 * One arm's verdict: `{ verdict: 'pass'|'fail'|'unreadable', ok, failed, missing }`.
 * A field the arm reads that is absent, or a need that does not hold, is
 * UNREADABLE and no clause is asked; a clause that throws is a failed clause.
 */
export function grade(id, reading) {
  const g = GRADERS[id];
  const missing = g.reads.filter((path) => !present(reading, path)).map(missingField);
  if (missing.length === 0) for (const [name, predicate] of g.needs) if (!holds(predicate, reading)) missing.push(name);
  if (missing.length > 0) return { verdict: 'unreadable', ok: null, failed: [], missing };
  const failed = g.clauses.filter(([, predicate]) => !holds(predicate, reading)).map(([name]) => name);
  return { verdict: failed.length === 0 ? 'pass' : 'fail', ok: failed.length === 0, failed, missing: [] };
}

// ---------------------------------------------------------------------------
// --grader-self-test: every grader and every reader on build/p357/fixtures/graders.json
// ---------------------------------------------------------------------------

export const GRADER_FIXTURES = join(ROOT, 'build', 'p357', 'fixtures', 'graders.json');

function at(obj, path) {
  const keys = String(path).split('.');
  let o = obj;
  for (const k of keys.slice(0, -1)) o = o[/^\d+$/.test(k) ? Number(k) : k];
  const last = keys[keys.length - 1];
  return { o, k: /^\d+$/.test(last) ? Number(last) : last };
}
export function applyOps(reading, ops) {
  for (const op of ops) {
    if (op.set !== undefined) {
      const { o, k } = at(reading, op.set);
      o[k] = structuredClone(op.value);
    } else if (op.delete !== undefined) {
      const { o, k } = at(reading, op.delete);
      if (Array.isArray(o)) o.splice(k, 1);
      else delete o[k];
    } else if (op.push !== undefined) {
      const { o, k } = at(reading, op.push);
      o[k].push(structuredClone(op.value));
    } else throw new Error(`an op this reader does not know: ${J(op)}`);
  }
  return reading;
}

/**
 * A raw fixture's reading: the honest reading of its arm with each sub-reading
 * named in `derive` REPLACED by what the live run's own reader makes of the raw
 * input. The arms below call exactly these functions on the same kinds of input.
 */
export function deriveReading(arm, base, derive) {
  const reading = structuredClone(base);
  const d = derive ?? {};
  if (d.counterEnd !== undefined) {
    reading.counterEnd = counterOf(d.counterEnd);
    if (arm === 'HA' || arm === 'HB' || arm === 'PA') reading.uncaughtAtEnd = nonControl(reading.counterEnd).length;
  }
  if (d.counterDuring !== undefined) reading.hisStack = hisStackCount(counterOf(d.counterDuring));
  if (d.appLog !== undefined) {
    const al = readAppLog(d.appLog, { rowCanaries: d.rowCanaries ?? [...SHELL_NAMES] });
    if (arm === 'HC') Object.assign(reading, hcFromAppLog(al));
    else applyAppLog(reading, al);
  }
  if (d.create !== undefined) reading.create = createReading(d.create.answer, d.create.namesBefore, d.create.namesAfter, d.create.name ?? 'p357-after');
  if (d.quitText !== undefined) reading.quit = { ...reading.quit, ...quitTextReading(d.quitText) };
  if (d.csQuit !== undefined) {
    reading.quit = { ...reading.quit, ...crashStateQuit(d.csQuit.text, d.csQuit.code) };
    // The plant and its connection, read from the same output, when the fixture names the arm's two paths.
    if (d.csQuit.paths !== undefined) {
      reading.planted = plantedOf(d.csQuit.text);
      reading.plantedIn = plantTargetOf(d.csQuit.text, d.csQuit.paths).target;
    }
  }
  if (d.exit !== undefined) {
    const e = exitReading(d.exit.text, d.exit.code);
    reading.restart = { ...reading.restart, code: e.code, signal: e.signal, heldOpenLine: e.heldOpenLine, wedgedExit: e.wedgedExit, notRelaunchedLine: e.notRelaunchedLine || d.exit.appLogNotRelaunched === true };
  }
  if (d.sockets !== undefined) {
    const answering = new Set(d.sockets.answering ?? []);
    const s = socketsLeftOf(d.sockets.names, d.sockets.socket, (n) => answering.has(n));
    reading.socketsRead = s.read;
    reading.socketsLeft = s.left;
  }
  // The CS arms' app.log: the first launch's for the latch, both launches' for the relaunch.
  if (d.csAppLog !== undefined) reading.stopped = stoppedFact(readAppLog(d.csAppLog));
  if (d.csRelaunchLog !== undefined) {
    const al = readAppLog(d.csRelaunchLog);
    reading.relaunch = { ...reading.relaunch, unclean: al.uncleanExit, bootsLogged: al.mainPids.length };
  }
  if (d.localStorage !== undefined) reading.relaunch = { ...reading.relaunch, localStorage: { ...(reading.relaunch?.localStorage ?? {}), kept: localStorageKept(d.localStorage.values, d.localStorage.nonce) } };
  if (d.bounds !== undefined) {
    if (d.bounds.moved !== undefined) reading.settingsMoved = boundsMatch(d.bounds.moved);
    if (d.bounds.saved !== undefined) reading.relaunch = { ...reading.relaunch, bounds: boundsMatch(d.bounds.saved) };
  }
  if (d.ids !== undefined) reading.relaunch = { ...reading.relaunch, sameIds: sameIdSet(d.ids.before, d.ids.after) };
  if (d.rowsBefore !== undefined) reading.rows = compareRows(d.rowsBefore, d.rowsAfter);
  if (d.listedIds !== undefined) reading.relaunch = { ...reading.relaunch, listed: listedReading(d.rowsAfter, d.listedIds) };
  return reading;
}

function graderSelfTest() {
  let failures = 0;
  const say = (ok, text) => {
    if (!ok) failures += 1;
    process.stdout.write(`${ok ? 'ok  ' : 'FAIL'} ${text}\n`);
  };
  let fixtures = null;
  try {
    fixtures = JSON.parse(readFileSync(GRADER_FIXTURES, 'utf8'));
  } catch (err) {
    say(false, `${GRADER_FIXTURES.slice(ROOT.length + 1)} does not read: ${String(err?.message ?? err)}`);
    process.stdout.write('[p357] grader self-test FAIL.\n');
    return false;
  }
  const honest = fixtures.honest ?? {};
  const broken = Array.isArray(fixtures.broken) ? fixtures.broken : [];
  const unread = Array.isArray(fixtures.unreadable) ? fixtures.unreadable : [];
  const raw = Array.isArray(fixtures.raw) ? fixtures.raw : [];
  // 0. The stopped-words guard reads THIS checkout's copy, all four values, and
  // a copy it cannot read leaves the parent's phrase, never nothing (the probe review).
  const copyWant = [MANIFEST_STOPPED_NOTICE, MANIFEST_STOPPED_RESTART, MANIFEST_STOPPED_REFUSAL, MANIFEST_STOPPED_PHONE_LINE];
  say(STOPPED_COPY.length === copyWant.length && copyWant.every((w) => STOPPED_COPY.includes(w)), `the stopped-words guard read the four values of src/shared/manifest-stopped-copy.ts (${String(STOPPED_COPY.length)} values, ${String(STOPPED_NEEDLES.length)} needles: every value, every sentence and the shared phrase)`);
  const unreadCopy = stoppedCopyValues(join(ROOT, 'build', 'p357', 'fixtures', 'no-such-root'));
  say(unreadCopy.length === 1 && unreadCopy[0] === STOPPED_WORDS && stoppedCopyNeedles(unreadCopy).includes(STOPPED_WORDS), 'a copy that cannot be read leaves the shared phrase as the needle, never nothing');
  const count = Object.keys(honest).length + broken.length + unread.length + raw.length;
  say(count === fixtures.readings, `the fixtures hold ${String(count)} readings, as their own count says (${String(fixtures.readings)})`);
  const sole = new Map(Object.keys(GRADERS).map((id) => [id, new Set()]));
  const soleMiss = new Map(Object.keys(GRADERS).map((id) => [id, new Set()]));
  const known = (arm, names, kind) => {
    const list = kind === 'clause' ? GRADERS[arm].clauses.map(([n]) => n) : [...GRADERS[arm].needs.map(([n]) => n), ...GRADERS[arm].reads.map(missingField)];
    return (names ?? []).filter((n) => !list.includes(n));
  };
  /** One fixture's verdict against what it says it must answer. */
  const judge = (c, reading) => {
    if (GRADERS[c.arm] === undefined) {
      say(false, `the fixture "${String(c.name)}" names ${J(c.arm)}, which is no arm`);
      return;
    }
    const expect = c.expect ?? (c.mustMiss !== undefined ? 'unreadable' : c.mustFail !== undefined ? 'fail' : 'pass');
    const unknown = [...known(c.arm, c.mustFail, 'clause'), ...known(c.arm, c.mustMiss, 'need')];
    if (unknown.length > 0) {
      say(false, `${c.arm} "${c.name}" names ${J(unknown)}, which its grader does not`);
      return;
    }
    let g;
    try {
      g = grade(c.arm, reading());
    } catch (err) {
      say(false, `${c.arm} "${c.name}" could not be read: ${String(err?.message ?? err)}`);
      return;
    }
    if (expect === 'pass') {
      say(g.verdict === 'pass', `${c.arm} passes: ${c.name}${g.verdict === 'pass' ? '' : ` (${g.verdict}: ${J(g.verdict === 'fail' ? g.failed : g.missing)})`}`);
      return;
    }
    const want = J([...(expect === 'fail' ? c.mustFail : c.mustMiss)].sort());
    const got = J([...(expect === 'fail' ? g.failed : g.missing)].sort());
    const right = g.verdict === expect && want === got;
    say(right, `${c.arm} answers ${expect.toUpperCase()} on exactly ${want} for: ${c.name}${right ? '' : ` (answered ${g.verdict}: ${J(g.verdict === 'fail' ? g.failed : g.missing)})`}`);
    if (right && expect === 'fail' && c.mustFail.length === 1) sole.get(c.arm).add(c.mustFail[0]);
    if (right && expect === 'unreadable' && c.mustMiss.length === 1) soleMiss.get(c.arm).add(c.mustMiss[0]);
  };
  // 1. Every grader's honest reading passes.
  for (const id of Object.keys(GRADERS)) {
    if (honest[id] === undefined) say(false, `${id} has no honest reading`);
    else judge({ arm: id, name: 'its honest reading', expect: 'pass' }, () => structuredClone(honest[id]));
  }
  // 2. Every broken reading FAILS exactly the clauses it names.
  for (const c of broken) judge({ ...c, expect: 'fail' }, () => applyOps(structuredClone(honest[c.arm]), c.ops ?? []));
  // 3. Every unreadable reading answers UNREADABLE on exactly the needs it names.
  for (const c of unread) judge({ ...c, expect: 'unreadable' }, () => applyOps(structuredClone(honest[c.arm]), c.ops ?? []));
  // 4. Every raw fixture, through the live run's own readers.
  for (const c of raw) judge(c, () => applyOps(deriveReading(c.arm, honest[c.arm], c.derive), c.ops ?? []));
  // 5. A MISSING READING IS NEVER A PASS: every field an arm reads, deleted alone, answers UNREADABLE naming it.
  let swept = 0;
  for (const [id, g] of Object.entries(GRADERS)) {
    if (honest[id] === undefined) continue;
    for (const path of g.reads) {
      swept += 1;
      const r = structuredClone(honest[id]);
      const parts = path.split('.');
      let o = r;
      for (const k of parts.slice(0, -1)) o = o?.[k];
      if (o !== null && typeof o === 'object') delete o[parts[parts.length - 1]];
      const v = grade(id, r);
      if (!(v.verdict === 'unreadable' && v.missing.includes(missingField(path)))) say(false, `${id} without ${path} answered ${v.verdict}${v.verdict === 'unreadable' ? ` without naming the field (${J(v.missing)})` : ', not UNREADABLE'}`);
    }
  }
  say(swept > 0, `a missing reading is never a pass: ${String(swept)} fields, each deleted alone, each answered UNREADABLE`);
  // 6. Every clause shown red alone, and every need shown unreadable alone.
  let clauses = 0;
  let needs = 0;
  for (const [id, g] of Object.entries(GRADERS)) {
    for (const [name] of g.clauses) {
      clauses += 1;
      say(sole.get(id).has(name), `${id} clause shown red alone: ${name}`);
    }
    for (const [name] of g.needs) {
      needs += 1;
      say(soleMiss.get(id).has(name), `${id} need shown unreadable alone: ${name}`);
    }
  }
  process.stdout.write(
    failures === 0
      ? `[p357] grader self-test PASS: ${String(Object.keys(GRADERS).length)} graders, ${String(clauses)} clauses each shown red alone, ${String(needs)} needs each shown unreadable alone, ${String(swept)} fields that answer UNREADABLE when missing, ${String(raw.length)} raw fixtures through the run's own readers.\n`
      : `[p357] grader self-test FAIL: ${String(failures)}.\n`
  );
  return failures === 0;
}

if (process.argv.includes('--grader-self-test')) process.exit(graderSelfTest() ? 0 : 1);

// ---------------------------------------------------------------------------
// --preflight
// ---------------------------------------------------------------------------

const PARENT = (process.env['P357_PARENT_CHECKOUT'] ?? '').trim();
function preflightProblems() {
  const p = [];
  if (PARENT === '') p.push(`P357_PARENT_CHECKOUT is not set. PA, HQ and CS-parent need the parent (${SNAPSHOT}, 357 as landed, built): its clean quit after real damage and its crash on the crash's own state`);
  else if (!existsSync(join(resolve(PARENT), 'out', 'main', 'index.js'))) p.push(`${resolve(PARENT)}/out/main/index.js is missing: build the parent checkout first`);
  const bundle = join(ROOT, 'out', 'main', 'index.js');
  if (!existsSync(bundle)) p.push(`${bundle} is missing: npm run build first`);
  for (const f of ['build/p357/counter.cjs', 'build/p3167/seed-sessions.mts', 'build/p316/node-phone.mjs', 'build/p330/tailscale-standin.mjs', 'build/p332/dns-standin.mjs']) if (!existsSync(join(ROOT, f))) p.push(`${f} is missing`);
  if (!existsSync('/usr/bin/sqlite3')) p.push("/usr/bin/sqlite3 is missing, which reads the manifest's own copy");
  return p;
}
if (process.argv.includes('--preflight')) {
  const p = preflightProblems();
  for (const x of p) process.stderr.write(`[p357] REFUSED. ${x}\n`);
  if (p.length === 0) process.stdout.write(`[p357] preflight PASS: the parent ${resolve(PARENT)} is built and out/ is here\n`);
  process.exit(p.length === 0 ? 0 : 2);
}

// ---------------------------------------------------------------------------
// The run: the refusals, the scratch world (the helpers are imported at the top)
// ---------------------------------------------------------------------------

const TAG = '[p357]';
const t0 = Date.now();
const say = (l) => console.log(`${TAG} ${((Date.now() - t0) / 1000).toFixed(1).padStart(6)}s ${l}`);
const refuse = (why) => {
  console.error(`${TAG} REFUSED. ${why}`);
  process.exit(2);
};

const SOCKET = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
if (SOCKET === '' || SOCKET === 'gmux' || SOCKET === 'default' || !SOCKET.startsWith('gmux-p357')) {
  refuse(`"${SOCKET}" is not a gmux-p357 harness socket. Run \`npm run probe:p357\`, which wraps this file in build/harness-socket.mjs.`);
}
const HARNESS_DIR = (process.env['GMUX_HARNESS_DIR'] ?? '').trim();
if (HARNESS_DIR === '') refuse('no GMUX_HARNESS_DIR, so there is nowhere scratch to put the HOME and the profile.');
{
  const p = preflightProblems();
  if (p.length > 0) refuse(p.join('; '));
}

const KEEP = (process.env['P357_KEEP'] ?? '') === '1';
const ARMS = new Set(((process.env['P357_ARMS'] ?? '').trim() || 'PA,HA,HB,HC,CS').split(',').map((x) => x.trim()).filter((x) => x !== ''));
const on = (id) => ARMS.has(id);

mkdirSync(join(HARNESS_DIR, 'p357'), { recursive: true });
const RUN = realpathSync(join(HARNESS_DIR, 'p357'));
const OUT = join(ROOT, 'out', 'p357');
/** The vendored tmux the development app runs, so its client and server agree (3.7b). */
const TMUX = join(ROOT, 'build', 'vendor', 'tmux', 'bin', 'tmux');
const PUBLIC_NAME = DEFAULT_SCENARIO.dnsName.replace(/\.$/, '');
const require_ = createRequire(join(ROOT, 'package.json'));
const parentRequire = PARENT === '' ? null : createRequire(join(resolve(PARENT), 'package.json'));
const COUNTER_CJS = join(ROOT, 'build', 'p357', 'counter.cjs');
/** Research 143's require-hook that redirects `better-sqlite3` to the checking build, by path only (P3571_HOOK_BS3 overrides, else under P3571_R143_KEEP). */
const HOOK_BS3 = (process.env['P3571_HOOK_BS3'] ?? '').trim() || join((process.env['P3571_R143_KEEP'] ?? '').trim() || R143_KEEP_DEFAULT, 'adv-churn', 'tools', 'hook-bs3.cjs');

const report = { checkout: ROOT, parent: resolve(PARENT), socket: SOCKET, arms: [], readings: {}, printed: {} };
let failures = 0;
let unreadable = 0;
function cannotRead(id, why) {
  unreadable += 1;
  report.arms.push({ id, ok: null, said: why });
  say(`UNREADABLE ${id}: ${why}`);
}
function arm(id, reading) {
  report.readings[id] = reading;
  const g = grade(id, reading);
  if (g.verdict === 'unreadable') {
    cannotRead(id, `${GRADERS[id].title}; could not read ${J(g.missing)}`);
    return;
  }
  report.arms.push({ id, ok: g.ok, failed: g.failed, title: GRADERS[id].title });
  if (!g.ok) failures += 1;
  say(`${g.ok ? 'PASS' : 'FAIL'} ${id}: ${GRADERS[id].title}${g.ok ? '' : `; FAILED ${J(g.failed)}`}`);
}

// ---------------------------------------------------------------------------
// The stand-ins, the watcher, the launch bookkeeping
// ---------------------------------------------------------------------------

let standin = null;
let dns = null;
let watch = null;
let tailscalePreflight = false;
const dnsPreflights = [];
const agentsHeld = [];
const countersHeard = [];
const shims = new Set();
const apps = new Set();

const HISTORY_FILES = ['.zsh_history', '.bash_history'];
const historyStat = () =>
  HISTORY_FILES.map((n) => {
    try {
      const s = statSync(join(userInfo().homedir, n));
      return `${String(s.size)} ${String(Math.floor(s.mtimeMs / 1000))}`;
    } catch {
      return 'none';
    }
  }).join('|');
const HISTORY_BEFORE = historyStat();
/** How long a moved history is waited on, starting nothing, before it is read again (his rule of 2026-10-20). */
const HISTORY_QUIET_MS = 180_000;

/** tmux on THIS run's scratch socket only, ever. */
function tmux(...args) {
  if (!SOCKET.startsWith('gmux-p357')) throw new Error('refusing a socket that is not this run');
  const r = spawnSync(TMUX, ['-L', SOCKET, ...args], { encoding: 'utf8' });
  return { status: r.status, out: (r.stdout ?? '').trim(), err: (r.stderr ?? '').trim() };
}
const tmuxNames = () =>
  (tmux('list-sessions', '-F', '#{session_id} #{session_name}').out || '')
    .split('\n')
    .map((l) => l.split(' ').slice(1).join(' '))
    .filter((x) => x !== '');

function processTable() {
  const r = spawnSync('/bin/ps', ['-ww', '-ax', '-o', 'pid=,ppid=,command='], { encoding: 'utf8', timeout: 10_000, maxBuffer: 64 * 1024 * 1024 });
  const rows = new Map();
  for (const line of String(r.stdout ?? '').split('\n')) {
    const m = /^\s*(\d+)\s+(\d+)\s+(.*)$/.exec(line);
    if (m !== null) rows.set(Number(m[1]), { pid: Number(m[1]), ppid: Number(m[2]), command: m[3] });
  }
  return rows;
}

// ---------------------------------------------------------------------------
// The app, over its renderer
// ---------------------------------------------------------------------------

function paths(label) {
  const base = join(RUN, label);
  return {
    base,
    profile: join(base, 'profile'),
    home: join(base, 'home'),
    proj: join(base, 'proj'),
    manifest: join(base, 'profile', 'gmux', 'manifest.db'),
    appLog: join(base, 'profile', 'logs', 'app.log'),
    appLogOld: join(base, 'profile', 'logs', 'app.log.1'),
    runSentinel: join(base, 'profile', 'logs', 'run.json')
  };
}
/** ONE counter file per launch: a launch's verdict reads its own file and never a file an earlier launch of the profile wrote. */
const counterFileOf = (p, label) => join(p.base, `uncaught-${label}.jsonl`);

function launchOptions(label, checkout, p, counter, { seam = null, crash = null } = {}) {
  const env = {
    HOME: p.home,
    ZDOTDIR: p.home,
    HISTFILE: '/dev/null',
    TERM_SESSION_ID: undefined,
    GMUX_TMUX_SOCKET: SOCKET,
    GMUX_PROBES: '1',
    GMUX_LOG_FILE: '1',
    GMUX_SPECSTORY_NO_CLOUD: '1',
    GMUX_HARNESS_DIR: HARNESS_DIR,
    GMUX_TAILSCALE_BIN: standin.binPath,
    [NAME_SERVERS_VAR]: dns.servers,
    // The crash arm loads hook-bs3 FIRST (it redirects `better-sqlite3` to the
    // scratch checking build), then the counter, then the crash preload; the
    // checker's env arms the crash-state plant. No checkout's node_modules is
    // touched: the hook resolves `better-sqlite3` to P358ADV_BS3 by path.
    NODE_OPTIONS: crash === null ? `--require=${COUNTER_CJS}` : `--require=${HOOK_BS3} --require=${COUNTER_CJS} --require=${crash.preload}`,
    P357_COUNTER_FILE: counter,
    P357_COUNTER_CONTROL: '1',
    ...(seam !== null ? { GMUX_HARNESS_MANIFEST_FAULT: seam } : {}),
    ...(crash !== null
      ? {
          P358ADV_BS3: crash.bs3,
          P358ADV_PLANT: 'crash-state',
          P358ADV_PLANT_AT: '500',
          P358ADV_STEP_EVERY: '8',
          P358ADV_SEGV_EXIT: '1',
          P3571_CS_OUT: crash.out,
          P3571_CS_SCRATCH: crash.scratch
        }
      : {})
  };
  return {
    label,
    userDataDir: p.profile,
    cwd: checkout,
    tmuxSocket: SOCKET,
    args: ['--remote-debugging-port=0', '--use-mock-keychain'],
    env: withoutDevRenderer(env),
    graceMs: 8_000
  };
}

/** One counter file, parsed; a file that is not there reads as no lines. */
const counterLines = (path) => {
  try {
    return counterOf(readFileSync(path, 'utf8').split('\n'));
  } catch {
    return [];
  }
};
/** app.log.1 then app.log, as lines; the pair is what one rotation leaves (src/main/log/transport.ts). */
function appLogLines(p) {
  const out = [];
  for (const f of [p.appLogOld, p.appLog]) {
    try {
      out.push(...readFileSync(f, 'utf8').split('\n'));
    } catch {
      /* not there */
    }
  }
  return out;
}
const inodeOf = (path) => {
  try {
    return statSync(path).ino;
  } catch {
    return null;
  }
};
const devtoolsPort = (p) => {
  try {
    return Number(readFileSync(join(p.profile, 'DevToolsActivePort'), 'utf8').split('\n')[0].trim());
  } catch {
    return 0;
  }
};
async function attachWindow(p, timeoutMs = 120_000) {
  const started = Date.now();
  for (;;) {
    const port = devtoolsPort(p);
    if (port > 0) {
      try {
        const list = await (await fetch(`http://127.0.0.1:${String(port)}/json/list`)).json();
        const picked = pickRendererTarget(list);
        if (picked.target !== null) {
          const cdp = await wsConnect(picked.target.webSocketDebuggerUrl);
          await cdp.call('Runtime.enable');
          for (let i = 0; i < 200; i += 1) {
            if ((await cdpEval(cdp, "typeof window.gmux === 'object' && typeof window.gmux.sessions === 'object' && typeof window.gmux.pocket === 'object'")) === true) return cdp;
            await sleep(300);
          }
        }
      } catch {
        /* not up yet */
      }
    }
    if (Date.now() - started > timeoutMs) throw new Error('no app window');
    await sleep(300);
  }
}
const list = (win) => cdpEval(win, 'window.gmux.sessions.list().then((l) => ({ ok: true, ids: l.map((s) => s.id), names: l.map((s) => s.name) }), (e) => ({ ok: false, error: String(e && e.message).slice(0, 200) }))');
/** A create over the bridge: its id, or the WHOLE rejection message, which `createReading` parses as the window does. */
const createExpr = (name, proj) =>
  `window.gmux.sessions.create({ name: ${J(name)}, projectPath: ${J(proj)}, agent: 'shell' }).then((s) => ({ ok: true, id: s.id, status: s.status }), (e) => ({ ok: false, error: String(e && e.message).slice(0, 2000) }))`;
const createShell = (win, name, p) => cdpEval(win, createExpr(name, p.proj), 60_000);
/** The id `list` answered for a name, or null. */
const idOfName = (l, name) => {
  const at = (l?.names ?? []).indexOf(name);
  return at === -1 ? null : ((l?.ids ?? [])[at] ?? null);
};

// ---------------------------------------------------------------------------
// The world: the seed, the project, the three shells
// ---------------------------------------------------------------------------

function seed(p) {
  mkdirSync(join(p.profile, 'gmux'), { recursive: true });
  const tsx = require_.resolve('tsx/cli');
  const r = spawnSync(
    process.execPath,
    [tsx, '--tsconfig', join(ROOT, 'tsconfig.node.json'), join(ROOT, 'build/p3167/seed-sessions.mts'), '--manifest', p.manifest, '--shape', 'his', '--root', join(p.profile, 'seed-folders')],
    { cwd: ROOT, encoding: 'utf8', env: { ...process.env, HOME: p.home }, timeout: 120_000 }
  );
  return { status: r.status, out: (r.stdout ?? '').trim().slice(0, 400), err: (r.stderr ?? '').trim().slice(0, 400) };
}

const ROW_COLUMNS = [...IDENTITY_COLUMNS, 'status', 'last_seen'].join(', ');
/** Every session row's identity columns (plus status and last_seen) from a COPY of the manifest, the app gone. */
function manifestRows(manifest) {
  if (!existsSync(manifest)) return { read: false, why: 'no manifest' };
  const dir = join(RUN, `copy-${String(Date.now())}-${String(Math.floor(Math.random() * 1e6))}`);
  mkdirSync(dir, { recursive: true });
  try {
    const copy = join(dir, 'manifest.db');
    for (const side of ['', '-wal', '-shm']) if (existsSync(`${manifest}${side}`)) writeFileSync(`${copy}${side}`, readFileSync(`${manifest}${side}`));
    const r = spawnSync('/usr/bin/sqlite3', ['-json', copy, `select ${ROW_COLUMNS} from sessions order by id;`], { encoding: 'utf8', timeout: 20_000, maxBuffer: 32 * 1024 * 1024 });
    if (r.status !== 0) return { read: false, why: String(r.stderr ?? '').trim().slice(0, 160) };
    return { read: true, rows: JSON.parse(String(r.stdout ?? '').trim() || '[]') };
  } catch (err) {
    return { read: false, why: String(err?.message ?? err) };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
/**
 * The same rows WHILE THE APP RUNS, read by SQLite itself through a READ ONLY
 * connection of the checkout's own better-sqlite3, so the snapshot is one
 * commit. A read only connection never checkpoints and is never the last
 * connection while the app holds its own, so it changes nothing on disk.
 */
function manifestRowsLive(manifest, req) {
  if (!existsSync(manifest)) return { read: false, why: 'no manifest' };
  let db = null;
  try {
    const Database = req('better-sqlite3');
    db = new Database(manifest, { readonly: true, fileMustExist: true });
    return { read: true, rows: db.prepare(`select ${ROW_COLUMNS} from sessions order by id`).all() };
  } catch (err) {
    return { read: false, why: String(err?.message ?? err).slice(0, 160) };
  } finally {
    try {
      db?.close();
    } catch {
      /* a close that throws leaves nothing of ours open */
    }
  }
}

// ---------------------------------------------------------------------------
// The real damage: one sessions leaf's type byte, after a checkpoint
// ---------------------------------------------------------------------------

function readAt(path, offset, length) {
  const fd = openSync(path, 'r');
  try {
    const b = Buffer.alloc(length);
    readSync(fd, b, 0, length, offset);
    return b;
  } finally {
    closeSync(fd);
  }
}
function writeAt(path, offset, bytes) {
  const fd = openSync(path, 'r+');
  try {
    writeSync(fd, bytes, 0, bytes.length, offset);
  } finally {
    closeSync(fd);
  }
}
/**
 * Damage ONE sessions leaf on disk and poke a second connection so the live
 * one reads again (§2.2). Uses the checkout's own better-sqlite3, through a
 * SECOND connection, which never touches the app's.
 */
function damageSessionsLeaf(manifest, req) {
  const Database = req('better-sqlite3');
  const w = new Database(manifest);
  try {
    w.pragma('wal_checkpoint(TRUNCATE)');
    const pageSize = w.pragma('page_size', { simple: true });
    const leaves = w.prepare("SELECT pageno FROM dbstat WHERE name = 'sessions' AND pagetype = 'leaf' ORDER BY path").all();
    const target = leaves[0];
    if (target === undefined) return { ok: false, why: 'no sessions leaf page' };
    const off = (target.pageno - 1) * pageSize + (target.pageno === 1 ? 100 : 0);
    const before = readAt(manifest, off, 1)[0];
    writeAt(manifest, off, Buffer.from([0x00]));
    const after = readAt(manifest, off, 1)[0];
    const poked = w.prepare('UPDATE projects SET name = name').run().changes;
    return { ok: true, pageno: target.pageno, leaves: leaves.length, before, after, poked };
  } finally {
    w.close();
  }
}

function crashReports(sinceMs) {
  const dir = join(homedir(), 'Library', 'Logs', 'DiagnosticReports');
  try {
    return readdirSync(dir).filter((n) => /^(Electron|Tortie)/.test(n)).filter((n) => {
      try {
        return statSync(join(dir, n)).mtimeMs >= sinceMs;
      } catch {
        return false;
      }
    });
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// The phone, paired the way probe:p349 pairs
// ---------------------------------------------------------------------------

async function pocket(win, method, argStr) {
  const call = argStr === undefined ? `window.gmux.pocket[${J(method)}]()` : `window.gmux.pocket[${J(method)}](${argStr})`;
  return JSON.parse(await cdpEval(win, `(async () => { try { const v = await ${call}; return JSON.stringify({ ok: true, value: v === undefined ? null : v }); } catch (e) { return JSON.stringify({ ok: false, error: String((e && e.message) || e) }); } })()`, 120_000));
}
const forwarderPort = () => standin?.readFunnel().at(-1)?.forwarderPort ?? 0;
async function statusOf(win) {
  const got = await pocket(win, 'status');
  return got.ok ? got.value : null;
}
async function waitStatus(win, test, ms) {
  const started = Date.now();
  let last = null;
  for (;;) {
    last = await statusOf(win);
    if (last !== null && test(last)) return { ok: true, status: last };
    if (Date.now() - started >= ms) return { ok: false, status: last };
    await sleep(300);
  }
}
async function pairPhone(win) {
  const now = await waitStatus(win, (s) => (s.state === 'listening' && s.confirmState === 'confirmed') || (s.confirmable === true && s.state !== 'opening' && (s.confirmLines ?? []).some((l) => l.includes(`https://${PUBLIC_NAME}:`))), 40_000);
  if (!now.ok) return { ok: false, why: `the lines never named ${PUBLIC_NAME}: ${J({ state: now.status?.state })}` };
  if (!(now.status.state === 'listening' && now.status.confirmState === 'confirmed')) {
    const c = await pocket(win, 'confirmDoor', J({ linesRead: now.status.confirmLines, hashRead: now.status.confirmHash }));
    if (!c.ok || c.value.allowed !== true) return { ok: false, why: c.ok ? `confirm allowed=${String(c.value.allowed)}` : c.error };
  }
  const ok = await waitStatus(win, (s) => s.pairable === true || (s.pairable === undefined && s.state === 'listening'), 70_000);
  if (!ok.ok) return { ok: false, why: `never pairable: ${J({ state: ok.status?.state })}` };
  const offered = await pocket(win, 'beginPairing');
  if (!offered.ok) return { ok: false, why: offered.error.slice(0, 200) };
  const read = readOffer(offered.value.payload);
  if (!read.ok) return { ok: false, why: `the code does not read: ${read.why}` };
  const phone = makePhone('p357 phone', read.offer.dx);
  const door = { get port() { return forwarderPort(); }, name: read.offer.host, publicPort: read.offer.port, pin: read.offer.fp };
  const paired = await pairThrough(door, read.offer, phone, {
    tries: 20,
    everyMs: 500,
    between: async () => {
      const sheet = await pocket(win, 'pairingState');
      if (sheet.ok && sheet.value.state === 'presented') await pocket(win, 'allowPhone', J({ linesRead: sheet.value.lines, hashRead: sheet.value.hash }));
    }
  });
  await pocket(win, 'cancelPairing');
  if (!paired.ok) return { ok: false, why: `pairing answered ${J(paired.words)} (${paired.why})` };
  const first = await signedGet(phone, door, '/v1/blocked');
  return first.status === 200 ? { ok: true, phone, door } : { ok: false, why: `the first read answered ${String(first.status)}` };
}
/** The phone's three reads: Needs input, Sessions, one session. Read before the fault AND after, so a 404 after means something. */
async function doorReads(phone, door, oneId) {
  const blocked = await signedGet(phone, door, '/v1/blocked');
  let blockedBody = null;
  try {
    blockedBody = JSON.parse(blocked.body);
  } catch {
    blockedBody = null;
  }
  const sessions = await signedGet(phone, door, '/v1/sessions');
  const oneSession = await signedGet(phone, door, `/v1/session?id=${encodeURIComponent(oneId ?? 'nope')}`);
  return {
    blockedStatus: blocked.status,
    blockedLine: blockedBody?.emptyLine ?? null,
    blockedRows: Array.isArray(blockedBody?.rows) ? blockedBody.rows.length : null,
    blockedOthers: Array.isArray(blockedBody?.others) ? blockedBody.others.length : null,
    sessions: sessions.status,
    oneSession: oneSession.status,
    oneId: oneId ?? null
  };
}

// ---------------------------------------------------------------------------
// One launch, after the preflights, the hidden agents and the counter check
// ---------------------------------------------------------------------------

async function launch(label, checkout, p, opts, body) {
  mkdirSync(p.home, { recursive: true });
  mkdirSync(p.proj, { recursive: true });
  const pre = preflightStandin(standin, standin.binPath);
  if (!pre.ok) throw new Error(`the Tailscale preflight refused: ${pre.problems.join('; ')}`);
  tailscalePreflight = pre.ok;
  const dnsPre = await dns.preflight(dns.servers);
  dnsPreflights.push(dnsPre.ok && loopbackOnlyServers(dns.servers));
  if (!dnsPre.ok) throw new Error(`the DNS preflight refused: ${dnsPre.problems.join('; ')}`);
  writeHiddenAgents(p.profile, 'p357', hiddenAgentsBesides([]));
  const counter = counterFileOf(p, label);
  rmSync(counter, { force: true });
  return withElectron(launchOptions(label, checkout, p, counter, opts), async (handle) => {
    shims.add(handle.pid);
    const appNow = () => {
      try {
        const a = handle.appPid();
        if (a > 0) apps.add(a);
      } catch {
        /* not up yet */
      }
    };
    const win = await attachWindow(p);
    appNow();
    // The counter heard its control exception (its timers fire at 3 and 4 s after main started).
    await sleep(4_500);
    appNow();
    const boot = counterLines(counter);
    const heard = controlHeard(boot);
    countersHeard.push(heard);
    if (!counterInstalled(boot) || heard < 1) throw new Error('the counter did not hear its own control exception, so nothing it says can be trusted');
    const agents = standInsOnlyVerdict(JSON.parse(await cdpEval(win, AGENTS_LIST_EXPR, 120_000)), { standIns: [] });
    agentsHeld.push(agents.ok);
    if (!agents.ok) throw new Error(`an agent resolved: ${agents.said}`);
    return body(win, handle, { boot, agents, counter: () => counterLines(counter), counterFile: counter });
  });
}

/** Add the project and the three shells; answer the list before any damage. */
async function buildWorld(win, p) {
  await cdpEval(win, `window.gmux.projects.add(${J(p.proj)}).then((x) => x && x.path, () => null)`);
  for (const name of SHELL_NAMES) await createShell(win, name, p);
  await sleep(3_000);
  return list(win);
}

/** Quit through the window's own quit, with no main inspector held; answer the exit. */
async function quitAndRead(win, handle) {
  const quitAt = Date.now();
  await cdpEval(win, 'window.gmux.quit().then(() => true, () => false)').catch(() => null);
  const code = await Promise.race([handle.exited, sleep(90_000).then(() => 'still running after 90 s')]);
  const ms = Date.now() - quitAt;
  // The shim's last line can follow its exit event on the pipe.
  await sleep(500);
  return { code, ms, appText: handle.text().slice(-8_000), crashReports: crashReports(quitAt - 1_000) };
}

// ---------------------------------------------------------------------------
// The arms
// ---------------------------------------------------------------------------

/** PA and HA share the real-damage script; `checkout` and `req` say which build. */
async function realDamageArm(id, checkout, req) {
  const p = paths(id);
  const seedOut = seed(p);
  if (seedOut.status !== 0) throw new Error(`the seed failed: ${J(seedOut)}`);
  report.printed[`${id}-seed`] = seedOut.out;
  const reading = {};
  let counterFile = null;
  await launch(`${id}-app`, checkout, p, {}, async (win, handle, pre) => {
    counterFile = pre.counterFile;
    reading.counter = pre.boot;
    reading.agents = pre.agents;
    const before = await buildWorld(win, p);
    reading.listBefore = before;
    /** Uncaught exceptions so far, the control exceptions apart. */
    const uncaughtNow = () => nonControl(pre.counter()).length;
    reading.beforeDamage = uncaughtNow();
    // THE DAMAGE, then a read from the live connection so it meets a damaged page.
    const damage = damageSessionsLeaf(p.manifest, req);
    report.printed[`${id}-damage`] = damage;
    reading.damage = { changed: damage.ok === true && damage.before !== damage.after, pageno: damage.pageno ?? null, leaves: damage.leaves ?? null };
    if (!reading.damage.changed) throw new Error(`the damage did not change a byte: ${J(damage)}`);
    await sleep(1_500);
    report.printed[`${id}-probe`] = await cdpEval(win, 'window.gmux.sessions.list().then(() => ({ ok: true }), (e) => ({ ok: false, error: String(e && e.message).slice(0, 200) }))');
    // A create: at the parent it spawns then the broadcast throws; at HEAD it is refused before the spawn.
    const namesBeforeCreate = tmuxNames();
    const created = await cdpEval(win, createExpr('p357-after', p.proj), 60_000);
    await sleep(2_500);
    reading.create = createReading(created, namesBeforeCreate, tmuxNames(), 'p357-after');
    // Two renames from OUTSIDE the app, by exact name: each a broadcast at the parent (his stack), caught at HEAD.
    const beforeRenames = uncaughtNow();
    let renamesTried = 0;
    let renamesLanded = 0;
    for (const [from, to] of [['p357-b', 'p357-b2'], ['p357-b2', 'p357-b3']]) {
      renamesTried += 1;
      const r = tmux('rename-session', '-t', `=${from}`, to);
      await sleep(3_000);
      if (r.status === 0 && tmuxNames().includes(to)) renamesLanded += 1;
    }
    reading.renamesTried = renamesTried;
    reading.renamesLandedInTmux = renamesLanded;
    reading.renameUncaught = uncaughtNow() - beforeRenames;
    // A pane ending.
    tmux('send-keys', '-t', '=p357-c', 'exit', 'Enter');
    await sleep(4_000);
    reading.listAfter = await list(win);
    reading.uncaught = uncaughtNow();
    reading.hisStack = hisStackCount(pre.counter());
    reading.quit = await quitAndRead(win, handle);
  });
  // Read once the app is gone: the counter's whole file and app.log, this launch's only.
  reading.counterEnd = counterLines(counterFile);
  reading.uncaughtAtEnd = nonControl(reading.counterEnd).length;
  applyAppLog(reading, readAppLog(appLogLines(p), { rowCanaries: [...SHELL_NAMES, p.proj] }));
  report.printed[`${id}-bootsPerPid`] = reading.appLog.bootPids;
  Object.assign(reading.quit, quitTextReading(reading.quit.appText));
  // One relaunch on the same profile, to read what the gate does with the file.
  const relaunch = { ran: false, quarantined: null, rows: null };
  try {
    await launch(`${id}-relaunch`, checkout, p, {}, async (win, handle) => {
      const l = await list(win);
      relaunch.listOk = l.ok === true;
      relaunch.rows = (l.ids ?? []).length;
      const q = await quitAndRead(win, handle);
      relaunch.quitCode = q.code;
      relaunch.ran = true;
    });
    const al = readAppLog(appLogLines(p));
    relaunch.quarantined = al.quarantined > 0;
    relaunch.uncleanExit = al.uncleanExit > 0;
    relaunch.gateLines = al.gateLines.slice(-6);
  } catch (err) {
    relaunch.why = String(err?.message ?? err);
  }
  reading.relaunch = relaunch;
  return reading;
}

let phonePaired = null;

/** HB: the memory-shaped seam, the file fine, Restart, the next launch. HD: the door in the same launch. */
async function seamArm(req) {
  const p = paths('HB');
  const seedOut = seed(p);
  if (seedOut.status !== 0) throw new Error(`the seed failed: ${J(seedOut)}`);
  report.printed['HB-seed'] = seedOut.out;
  const seam = join(RUN, 'HB', 'manifest-fault.json');
  mkdirSync(dirname(seam), { recursive: true });
  const reading = {};
  const door = {};
  let counterFile = null;
  /** @type {{ read: boolean, rows?: object[], why?: string }} */
  let rowsBefore = { read: false, why: 'not read' };
  await launch('HB-app', ROOT, p, { seam }, async (win, handle, pre) => {
    counterFile = pre.counterFile;
    reading.counter = pre.boot;
    reading.agents = pre.agents;
    reading.seamInstalled = await waitForLine(handle, /manifest fault seam installed/, 5_000);
    const before = await buildWorld(win, p);
    reading.listBefore = before;
    // Turn the door on before pairing (Phase 357.1, Gap 3b), the shape probe:p349 uses
    // (build/p349/probe-p349.mjs): without it the door never listens and pairPhone's
    // confirm wait times out, which is why HD stayed UNREADABLE in Phase 357.
    await pocket(win, 'setDoor', J({ on: true }));
    // Pair the phone and read the door BEFORE the fault, so its 404s after it mean something.
    const paired = await pairPhone(win);
    if (!paired.ok) report.printed['HB-pair'] = paired.why;
    else phonePaired = paired;
    const oneId = idOfName(before, SHELL_NAMES[0]);
    if (phonePaired !== null) door.before = await doorReads(phonePaired.phone, phonePaired.door, oneId);
    // The rows JUST BEFORE the fault, after the boot and the shells: a boot pass can no longer read as a write after the latch.
    rowsBefore = manifestRowsLive(p.manifest, req);
    // ARM the seam: one listSessions fault, the file stays fine.
    writeFileSync(seam, `${J({ seq: 1, fail: { operation: 'listSessions', code: 'SQLITE_CORRUPT' } })}\n`);
    reading.armed = await waitForLine(handle, /manifest fault armed: seq=1 listSessions SQLITE_CORRUPT/, 8_000);
    // Make a read happen and wait for the latch's notice.
    await cdpEval(win, 'window.gmux.sessions.list().then(() => null, () => null)');
    await sleep(2_500);
    // The toast in the DOM.
    reading.toast = await readToast(win);
    // The create, refused before the spawn.
    const namesBefore = tmuxNames();
    const created = await cdpEval(win, createExpr('p357-after', p.proj), 60_000);
    await sleep(2_000);
    reading.create = createReading(created, namesBefore, tmuxNames(), 'p357-after');
    // The phone's three reads after the fault.
    if (phonePaired !== null) door.after = await doorReads(phonePaired.phone, phonePaired.door, oneId);
    reading.uncaught = nonControl(pre.counter()).length;
    // Press Restart in the DOM. It refuses to relaunch a harness launch, so the app quits by the hard exit.
    const walBefore = existsSync(`${p.manifest}-wal`);
    const sentinelBefore = existsSync(p.runSentinel);
    const quitAt = Date.now();
    const clicked = await clickRestart(win);
    const code = await Promise.race([handle.exited, sleep(90_000).then(() => 'still running after 90 s')]);
    // The shim's signal line can follow its exit on the pipe, and ReportCrash writes a report seconds after a crash.
    await sleep(5_000);
    const e = exitReading(handle.text(), code);
    reading.restart = {
      clicked: clicked === true,
      code: e.code,
      signal: e.signal,
      wedgedExit: e.wedgedExit,
      notRelaunchedLine: e.notRelaunchedLine,
      heldOpenLine: e.heldOpenLine,
      closeHeldLine: e.closeHeldLine,
      walBefore,
      walAfter: existsSync(`${p.manifest}-wal`),
      walBytes: (() => {
        try {
          return statSync(`${p.manifest}-wal`).size;
        } catch {
          return null;
        }
      })(),
      sentinelBefore,
      sentinelAfter: existsSync(p.runSentinel),
      // PRINTED, never graded: other phases' Electrons write reports under the same names, and the shim's signal is this launch's own.
      crashReportsAfter: crashReports(quitAt)
    };
  });
  reading.counterEnd = counterLines(counterFile);
  reading.uncaughtAtEnd = nonControl(reading.counterEnd).length;
  const hbLog = readAppLog(appLogLines(p), { rowCanaries: [...SHELL_NAMES, p.proj] });
  applyAppLog(reading, hbLog);
  // The handler's line may also be in app.log, whose file transport is not raced by the signal the way stdout is.
  reading.restart.notRelaunchedLine = reading.restart.notRelaunchedLine === true || hbLog.notRelaunchedLine === true;
  report.printed['HB-bootsPerPid'] = hbLog.bootPids;
  // The rows AFTER the first process is gone, from a copy, against the rows just before the fault.
  const rowsAfter = manifestRows(p.manifest);
  reading.rows = compareRows(rowsBefore, rowsAfter);
  if (KEEP) report.printed['HB-rows'] = { before: rowsBefore, after: rowsAfter };
  // The next launch: the same file, no quarantine, no unclean-exit, every row that is not removed listed.
  const relaunch = { ran: false, inodeBefore: inodeOf(p.manifest) };
  try {
    const listedIds = [];
    await launch('HB-relaunch', ROOT, p, {}, async (win, handle) => {
      const l = await list(win);
      if (l.ok === true) listedIds.push(...(l.ids ?? []));
      relaunch.listOk = l.ok === true;
      relaunch.quit = await quitAndRead(win, handle);
      relaunch.ran = true;
    });
    relaunch.inodeAfter = inodeOf(p.manifest);
    const al = readAppLog(appLogLines(p));
    relaunch.quarantined = al.quarantined;
    relaunch.unreadableNotices = al.unreadableNotices;
    relaunch.uncleanExit = al.uncleanExit;
    relaunch.gateLines = al.gateLines.slice(-6);
    relaunch.listed = relaunch.listOk === true ? listedReading(rowsAfter, listedIds) : { read: true, equal: false, why: 'sessions:list rejected' };
  } catch (err) {
    relaunch.why = String(err?.message ?? err);
  }
  reading.relaunch = relaunch;
  return { hb: reading, hd: door };
}

/** HC: the crash handlers over the counter's own control exceptions and rejection. */
async function crashArm() {
  const p = paths('HC');
  const reading = {};
  let counterFile = null;
  await launch('HC-app', ROOT, p, {}, async (win, handle, pre) => {
    counterFile = pre.counterFile;
    reading.counter = pre.boot;
    reading.agents = pre.agents;
    // The counter throws its control exception twice (3 and 4 s) and leaves a rejection at 4.5 s; wait past it.
    await sleep(3_000);
    // A dialog drawn in main is modal and holds main, so main answering an IPC after both throws says none was drawn.
    const askedAt = Date.now();
    const answered = await Promise.race([
      cdpEval(win, 'window.gmux.sessions.list().then(() => true, () => true)').catch(() => false),
      sleep(10_000).then(() => false)
    ]);
    reading.mainAnswered = { ok: answered === true, ms: Date.now() - askedAt, controlsBefore: controlHeard(pre.counter()) };
    reading.quit = await quitAndRead(win, handle);
  });
  reading.counterEnd = counterLines(counterFile);
  // The quit's signal, read from the shim's own line by the reader HA's quit uses.
  if (reading.quit !== undefined && reading.quit !== null) Object.assign(reading.quit, quitTextReading(reading.quit.appText));
  const al = readAppLog(appLogLines(p));
  report.printed['HC-bootsPerPid'] = al.bootPids;
  Object.assign(reading, hcFromAppLog(al));
  // Electron's own dialog title on stdout would mean a dialog's text was printed; PRINTED (showErrorBox prints nothing on macOS).
  reading.dialogTitleOnStdout = /A JavaScript error occurred in the main process/.test(reading.quit.appText ?? '');
  return reading;
}

// ---------------------------------------------------------------------------
// CS: the crash's OWN state (research 143 §2.3), reproduced with the scratch
// checking better-sqlite3. No read fails, so 357's latch never trips. At the
// PARENT the quit faults in pcache1EnforceMaxPage (his report's frame); at HEAD
// the manifest is held and the will-quit SIGKILL skips teardown, so nothing
// closes the damaged cache and the relaunch keeps everything.
// ---------------------------------------------------------------------------

/** A built checking better-sqlite3 directory `require()` can load and that holds the native module. */
function checkingBs3Ok(dir) {
  return typeof dir === 'string' && dir !== '' && existsSync(join(dir, 'build', 'Release', 'better_sqlite3.node')) && existsSync(join(dir, 'lib', 'index.js'));
}
/** Reuse a built checking better-sqlite3 (P3571_BS3, then the spec step's), or build one in scratch; never a checkout's node_modules. */
function ensureCheckingBs3() {
  if (!existsSync(HOOK_BS3)) throw new Error(`hook-bs3.cjs is not at ${HOOK_BS3}; set P3571_HOOK_BS3 or P3571_R143_KEEP to research 143's kept sources`);
  const given = (process.env['P3571_BS3'] ?? '').trim();
  for (const cand of [given, CHECKING_BS3_DEFAULT]) {
    if (cand !== '' && checkingBs3Ok(cand)) {
      say(`crash-state: reusing the checking better-sqlite3 at ${cand}`);
      return realpathSync(cand);
    }
  }
  const dir = join(RUN, 'bs3');
  say(`crash-state: no built checking better-sqlite3 to reuse; building one in ${dir}`);
  buildCheckingBs3(dir);
  if (!checkingBs3Ok(dir)) throw new Error(`the checking better-sqlite3 did not build at ${dir}`);
  return realpathSync(dir);
}
/**
 * Build a checking better-sqlite3 13.0.3 in `dir`: a `cp -Rc` of the checkout's
 * own package (never edited in place), research 143's page-cache checker
 * appended to the amalgamation, the two breadcrumb calls patched into the
 * objects, and `node-gyp rebuild` with every cache under this run's scratch.
 */
function buildCheckingBs3(dir) {
  const keep = (process.env['P3571_R143_KEEP'] ?? '').trim() || R143_KEEP_DEFAULT;
  const appendC = join(keep, 'adv-churn', 'tools', 'pcache-check-append.c');
  if (!existsSync(appendC)) throw new Error(`research 143's pcache-check-append.c is not at ${appendC}; set P3571_BS3 to a built checking build or P3571_R143_KEEP to the kept sources`);
  const srcPkg = join(ROOT, 'node_modules', 'better-sqlite3');
  if (!existsSync(srcPkg)) throw new Error(`${srcPkg} is missing`);
  rmSync(dir, { recursive: true, force: true });
  const cp = spawnSync('cp', ['-Rc', srcPkg, dir], { encoding: 'utf8', timeout: 120_000 });
  if (cp.status !== 0) throw new Error(`cp -Rc better-sqlite3 failed: ${String(cp.stderr ?? '').slice(0, 300)}`);
  const sqlite = join(dir, 'deps', 'sqlite3', 'sqlite3.c');
  if (!readFileSync(sqlite, 'utf8').includes('p358adv_on_entry')) appendFileSync(sqlite, `\n${readFileSync(appendC, 'utf8')}\n`);
  const EXTERN = 'extern "C" void p358adv_on_entry(const char*, sqlite3*, sqlite3_stmt*);\n';
  const patch = (rel, anchor, breadcrumb) => {
    const file = join(dir, rel);
    let text = readFileSync(file, 'utf8');
    if (text.includes('p358adv_on_entry')) return;
    if (!text.includes(anchor)) throw new Error(`cannot patch ${rel}: anchor not found`);
    text = EXTERN + text.replace(anchor, `${breadcrumb}\n${anchor}`);
    writeFileSync(file, text);
  };
  // The two breadcrumbs the checker is driven by: iterate() and the close.
  patch('src/objects/statement-iterator.cpp', '\tdb_state->busy = true;', '\tp358adv_on_entry("StatementIterator::next", NULL, handle);');
  patch('src/objects/database.cpp', '\t\tint status = sqlite3_close(db_handle);', '\t\tp358adv_on_entry("Database::close", db_handle, NULL);');
  const gyp = require_.resolve('node-gyp/bin/node-gyp.js');
  const home = join(RUN, 'bs3-home');
  mkdirSync(home, { recursive: true });
  const r = spawnSync(process.execPath, [gyp, 'rebuild', '--release', '--', '-Dforce_build=1'], {
    cwd: dir,
    encoding: 'utf8',
    timeout: 480_000,
    env: { ...process.env, HOME: home, npm_config_cache: join(RUN, 'npm-cache'), npm_config_devdir: join(RUN, 'gyp-devdir') }
  });
  if (r.status !== 0) throw new Error(`node-gyp rebuild failed (exit ${String(r.status)}): ${`${r.stdout ?? ''}${r.stderr ?? ''}`.slice(-800)}`);
}

/**
 * The crash-state preload, written to scratch and loaded into MAIN after
 * hook-bs3 and the counter. With the checking build (hook-redirected) it opens
 * a manifest-shaped scratch db, drives iterate() until the checker plants the
 * crash's own header state, proves no read fails, writes a marker and holds the
 * connection off the collector. It also moves the Settings window once. It does
 * nothing outside Electron's main process and changes nothing Tortie decides.
 */
const CRASH_PRELOAD = `'use strict';
// Phase 357.1 crash-state preload. SCRATCH ONLY. Generated by probe-p357.mjs.
const fs = require('node:fs');
const path = require('node:path');
if (process.type !== 'browser') return;
const OUT = process.env.P3571_CS_OUT;
const SCRATCH = process.env.P3571_CS_SCRATCH;
const MOVED = ${JSON.stringify(SETTINGS_MOVED_BOUNDS)};
const marker = { planted: false, readsOk: false, settingsMoved: null };
const flush = () => { try { fs.writeFileSync(OUT, JSON.stringify({ t: Date.now(), ...marker })); } catch { /* never break the app */ } };
flush();
// Open the manifest-shaped db and drive the plant, a little after boot so the app has settled.
setTimeout(() => {
  let Database;
  try { Database = require('better-sqlite3'); } catch (err) { marker.requireFailed = String(err && err.message).slice(0, 200); flush(); return; }
  try {
    const dir = fs.mkdtempSync(path.join(SCRATCH, 'el-'));
    const db = new Database(path.join(dir, 'manifest.db'));
    db.pragma('journal_mode = WAL');
    db.exec('CREATE TABLE sessions (id TEXT PRIMARY KEY, name TEXT, created_at INTEGER, last_seen INTEGER, status TEXT, payload TEXT)');
    const ins = db.prepare('INSERT INTO sessions VALUES (?, ?, ?, ?, ?, ?)');
    db.transaction(() => { for (let i = 0; i < 354; i += 1) ins.run('id-' + i, 'n' + i, 1e12 + i, 0, 'idle', 'p'.repeat(12000 + (i % 5000))); })();
    db.prepare('SELECT * FROM sessions ORDER BY created_at ASC').all();
    for (let k = 0; k < 4000; k += 1) { for (const row of db.prepare('SELECT * FROM sessions ORDER BY 1,2,3,4,5,6').raw(true).iterate()) void row; }
    let ok = true;
    try { db.prepare('SELECT * FROM sessions ORDER BY created_at ASC').all(); db.prepare('SELECT * FROM sessions WHERE id = ?').get('id-3'); } catch { ok = false; }
    globalThis.__p3571CrashDb = db;
    marker.planted = true;
    marker.readsOk = ok;
    flush();
  } catch (err) { marker.armFailed = String(err && err.message).slice(0, 200); flush(); }
}, 12000);
// Move the Settings window once, so the relaunch's no-regression read is real.
setImmediate(() => {
  let electron;
  try { electron = require('electron'); } catch { return; }
  const { app } = electron;
  const move = (win) => { try { win.setBounds(MOVED); marker.settingsMoved = win.getBounds(); flush(); } catch { /* cosmetic */ } };
  app.on('browser-window-created', (_e, win) => {
    win.webContents.on('did-finish-load', () => { if (/settings/.test(String(win.webContents.getURL()))) setTimeout(() => move(win), 300); });
  });
});
`;

/** Poll the crash preload's marker until the plant loop has run (or failed), bounded. */
async function waitForMarker(file, ms) {
  const until = Date.now() + ms;
  for (;;) {
    try {
      const o = JSON.parse(readFileSync(file, 'utf8'));
      if (o.planted === true || o.requireFailed !== undefined || o.armFailed !== undefined) return o;
    } catch {
      /* not written yet */
    }
    if (Date.now() >= until) break;
    await sleep(300);
  }
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}
/** Poll the marker until the preload says it moved the Settings window, bounded; the last marker read either way. */
async function waitForMove(file, ms) {
  const until = Date.now() + ms;
  let last = null;
  for (;;) {
    try {
      last = JSON.parse(readFileSync(file, 'utf8'));
      if (last?.settingsMoved !== null && last?.settingsMoved !== undefined) return last;
    } catch {
      /* not written yet */
    }
    if (Date.now() >= until) return last;
    await sleep(300);
  }
}
const realOrSelf = (path) => {
  try {
    return realpathSync(path);
  } catch {
    return path;
  }
};

/**
 * CS-parent (`checkout` the parent) and CS-head (`checkout` HEAD). Each: seed
 * the world, launch with the checking build and the crash preload, build the
 * project and three shells, write three gmux.* keys, open and move Settings,
 * wait for the plant, then quit. CS-head then relaunches and reads back what
 * survived.
 */
async function crashStateArm(id, checkout, bs3) {
  const p = paths(id);
  const seedOut = seed(p);
  if (seedOut.status !== 0) throw new Error(`the seed failed: ${J(seedOut)}`);
  report.printed[`${id}-seed`] = seedOut.out;
  const csScratch = join(p.base, 'cs');
  mkdirSync(csScratch, { recursive: true });
  const preloadFile = join(p.base, 'crash-preload.cjs');
  writeFileSync(preloadFile, CRASH_PRELOAD, { mode: 0o600 });
  const marker = join(p.base, 'cs-armed.json');
  rmSync(marker, { force: true });
  const nonce = `${id}-${String(Date.now())}`;
  const reading = { bs3Built: true };
  let text = '';
  await launch(`${id}-app`, checkout, p, { crash: { preload: preloadFile, bs3, out: marker, scratch: csScratch } }, async (win, handle, pre) => {
    reading.counter = pre.boot;
    reading.agents = pre.agents;
    // The list before the quit, which the relaunch must answer again (the probe review: it was read and dropped).
    reading.listBefore = await buildWorld(win, p);
    await cdpEval(win, `(localStorage.setItem(${J(CS_LOCAL_STORAGE_KEYS[0])}, ${J(nonce)}), true)`);
    await cdpEval(win, 'window.gmux.openSettings().then(() => true, () => false)');
    await sleep(1_500);
    await cdpEval(win, `(localStorage.setItem(${J(CS_LOCAL_STORAGE_KEYS[1])}, ${J(nonce)}), true)`);
    const armed = await waitForMarker(marker, 90_000);
    report.printed[`${id}-armed`] = armed;
    reading.readsOk = armed?.readsOk === true;
    // The move is the preload's own, read from its marker once it says so: a
    // window the preload never moved has no bounds of the probe's to keep.
    const moved = await waitForMove(marker, 10_000);
    reading.settingsMoved = boundsMatch(moved?.settingsMoved ?? null);
    await cdpEval(win, `(localStorage.setItem(${J(CS_LOCAL_STORAGE_KEYS[2])}, ${J(nonce)}), true)`);
    // The quit: at the parent this faults in pcache1EnforceMaxPage; at HEAD the will-quit SIGKILL skips teardown.
    const quitAt = Date.now();
    await cdpEval(win, 'window.gmux.quit().then(() => true, () => false)').catch(() => null);
    const code = await Promise.race([handle.exited, sleep(90_000).then(() => 'still running after 90 s')]);
    // The checker's SEGV report and the shim's exit line can follow the exit on the pipe.
    await sleep(2_500);
    text = handle.text();
    reading.quit = { ...crashStateQuit(text, code), ms: Date.now() - quitAt };
    // Names and mtimes only; none opened (the checker exits 139 before any macOS report).
    report.printed[`${id}-crashReports`] = crashReports(quitAt - 1_000);
    reading.quitTail = text.slice(-2_000);
  });
  reading.counterEnd = counterLines(counterFileOf(p, `${id}-app`));
  // The plant and WHICH connection it took, from the checker's own lines (the probe review).
  reading.planted = plantedOf(text);
  const target = plantTargetOf(text, { sessionList: realOrSelf(p.manifest), preloadDir: realOrSelf(csScratch) });
  reading.plantedIn = target.target;
  report.printed[`${id}-plantedFile`] = target.file;
  // The first launch's app.log alone: the crash state raises no error, so nothing may have stopped the list.
  reading.stopped = stoppedFact(readAppLog(appLogLines(p)));
  if (id === 'CS-head') {
    const relaunch = { ran: false };
    try {
      await launch('CS-head-relaunch', ROOT, p, {}, async (win, handle) => {
        const l = await list(win);
        relaunch.sessions = (l.ids ?? []).length;
        relaunch.shellsKept = l.ok === true && SHELL_NAMES.every((n) => (l.names ?? []).includes(n));
        relaunch.sameIds = l.ok === true && sameIdSet(reading.listBefore?.ids, l.ids);
        // The page answers the raw values; the count is this file's pure reader's.
        const values = JSON.parse(await cdpEval(win, `JSON.stringify(${J(CS_LOCAL_STORAGE_KEYS)}.map((x) => localStorage.getItem(x)))`));
        relaunch.localStorage = { early: values[0], mid: values[1], late: values[2], kept: localStorageKept(values, nonce) };
        let settings = null;
        try {
          settings = JSON.parse(readFileSync(join(p.profile, 'settings.json'), 'utf8'));
        } catch {
          /* none */
        }
        relaunch.savedBounds = settings?.settingsWindowBounds ?? null;
        relaunch.bounds = boundsMatch(relaunch.savedBounds);
        const q = await quitAndRead(win, handle);
        relaunch.quitCode = q.code;
        relaunch.ran = true;
      });
      const al = readAppLog(appLogLines(p));
      relaunch.unclean = al.uncleanExit;
      // Every main process that wrote app.log: both launches logged, or the notices are unread.
      relaunch.bootsLogged = al.mainPids.length;
      relaunch.gateLines = al.gateLines.slice(-6);
    } catch (err) {
      relaunch.why = String(err?.message ?? err);
    }
    reading.relaunch = relaunch;
  }
  return reading;
}

// ---------------------------------------------------------------------------
// The DOM helpers (the toast and its Restart)
// ---------------------------------------------------------------------------

const TOAST_READ = `(() => {
  const t = [...document.querySelectorAll('.toast')].find((el) => el.querySelector('.toast-text')?.textContent?.includes('session list stopped reading'));
  if (t === undefined) return null;
  const btn = [...t.querySelectorAll('button')].find((b) => b.className.includes('btn-text'));
  return JSON.stringify({ text: t.querySelector('.toast-text')?.textContent ?? null, button: btn?.textContent ?? null });
})()`;
async function readToast(win) {
  for (let i = 0; i < 40; i += 1) {
    const raw = await cdpEval(win, TOAST_READ);
    if (typeof raw === 'string') return JSON.parse(raw);
    await sleep(300);
  }
  return null;
}
async function clickRestart(win) {
  return cdpEval(win, `(() => {
    const t = [...document.querySelectorAll('.toast')].find((el) => el.querySelector('.toast-text')?.textContent?.includes('session list stopped reading'));
    const btn = t === undefined ? undefined : [...t.querySelectorAll('button')].find((b) => b.className.includes('btn-text'));
    if (btn === undefined) return false;
    btn.click();
    return true;
  })()`);
}
async function waitForLine(handle, re, ms) {
  const started = Date.now();
  while (Date.now() - started < ms) {
    if (re.test(handle.text())) return true;
    await sleep(150);
  }
  return re.test(handle.text());
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

standin = makeStandin({ dir: join(RUN, 'tailscale'), scenario: { ...DEFAULT_SCENARIO } });
dns = await makeDnsStandin({ name: PUBLIC_NAME, mode: 'record' });
watch = watchForRealTailscale({ roots: () => [...shims, ...apps].filter((p) => p > 0), everyMs: 1_000 });
say(`measuring ${ROOT} against the parent ${resolve(PARENT)}; socket ${SOCKET}`);

try {
  if (on('PA')) {
    if (parentRequire === null) cannotRead('PA', 'P357_PARENT_CHECKOUT is not set');
    else {
      try {
        arm('PA', await realDamageArm('PA', resolve(PARENT), parentRequire));
      } catch (err) {
        cannotRead('PA', `the arm stopped: ${String(err?.message ?? err)}`);
      }
    }
  }
  if (on('HA')) {
    try {
      phonePaired = null;
      arm('HA', await realDamageArm('HA', ROOT, require_));
    } catch (err) {
      cannotRead('HA', `the arm stopped: ${String(err?.message ?? err)}`);
    }
    // HQ: HEAD's quit against the parent's, both after real page damage. Absent either, UNREADABLE.
    const pa = report.readings.PA?.quit;
    const ha = report.readings.HA?.quit;
    arm('HQ', { parentMs: pa?.ms, parentCode: pa?.code, parentWedged: pa?.wedgedExit, headMs: ha?.ms, headSignal: ha?.signal, headWedged: ha?.wedgedExit });
  }
  if (on('HB')) {
    let read = null;
    try {
      phonePaired = null;
      read = await seamArm(require_);
    } catch (err) {
      cannotRead('HB', `the arm stopped: ${String(err?.message ?? err)}`);
      cannotRead('HD', `HB's launch stopped: ${String(err?.message ?? err)}`);
    }
    if (read !== null) {
      arm('HB', read.hb);
      arm('HD', read.hd);
    }
  }
  if (on('HC')) {
    try {
      arm('HC', await crashArm());
    } catch (err) {
      cannotRead('HC', `the arm stopped: ${String(err?.message ?? err)}`);
    }
  }
  if (on('CS')) {
    let bs3 = null;
    try {
      bs3 = ensureCheckingBs3();
    } catch (err) {
      const why = `the checking better-sqlite3 could not be made: ${String(err?.message ?? err)}`;
      cannotRead('CS-parent', why);
      cannotRead('CS-head', why);
    }
    if (bs3 !== null) {
      // CS-parent first: it must fault, at the parent, exactly as his report did.
      if (parentRequire === null) cannotRead('CS-parent', 'P357_PARENT_CHECKOUT is not set');
      else {
        try {
          arm('CS-parent', await crashStateArm('CS-parent', resolve(PARENT), bs3));
        } catch (err) {
          cannotRead('CS-parent', `the arm stopped: ${String(err?.message ?? err)}`);
        }
      }
      try {
        arm('CS-head', await crashStateArm('CS-head', ROOT, bs3));
      } catch (err) {
        cannotRead('CS-head', `the arm stopped: ${String(err?.message ?? err)}`);
      }
    }
  }
} catch (err) {
  report.error = String(err?.stack ?? err);
  say(`the run stopped: ${report.error.slice(0, 300)}`);
} finally {
  const safely = (label, fn, fallback = null) => {
    try {
      return fn();
    } catch (err) {
      (report.ending ??= []).push(`${label}: ${String(err?.message ?? err)}`);
      return fallback;
    }
  };
  const leaked = watch === null ? [] : safely('the Tailscale watcher', () => watch.stop(), []);
  if (standin !== null) safely('the Tailscale stand-in', () => endStandinProcesses(standin.dir, 1_500));
  if (dns !== null) await dns.close().catch((err) => (report.ending ??= []).push(`the DNS stand-in: ${String(err?.message ?? err)}`));
  // The scratch server: end it on this run's socket, which the helper also does.
  const serverBefore = tmux('list-sessions', '-F', '#{session_id}');
  tmux('kill-server');
  await sleep(500);
  const after = processTable();
  const electronsLeft = [...after.values()].filter((r) => [...shims, ...apps].includes(r.pid) && /[Ee]lectron|Tortie/.test(r.command)).length;
  const serverNow = tmux('list-sessions');
  // tmux answers a dead server with a refusal of its own; no status at all means it could not be asked.
  const serverRead = serverNow.status !== null;
  const serverGone = serverRead && serverNow.status !== 0 && /no server running|error connecting|No such file or directory/i.test(serverNow.err);
  // THIS run's socket, in the directory tmux and build/harness-socket.mjs both
  // use ($TMUX_TMPDIR or /tmp), never another run's, never the harness's own
  // `<socket>.run` marker, and never the socket FILE alone, which tmux keeps
  // after kill-server and the harness unlinks by name once this run exits: a
  // socket is left when a server still answers on it (socketsLeftOf). An
  // unreadable directory is no reading (the probe review; it read as 0).
  const socketDir = join(process.env['TMUX_TMPDIR'] ?? '/tmp', `tmux-${String(process.getuid())}`);
  let socketNames = null;
  try {
    socketNames = readdirSync(socketDir);
  } catch {
    socketNames = null;
  }
  const sockets = socketsLeftOf(socketNames, SOCKET, (n) => n === SOCKET && tmux('list-sessions').status === 0);
  report.printed['RUN-sockets'] = { dir: socketDir, files: sockets.files, marker: sockets.marker, left: sockets.left };
  // His history: read now, and again after a quiet wait if it moved.
  const history = { before: HISTORY_BEFORE, after: historyStat(), quiet: null };
  if (history.after !== history.before) {
    say(`his shell history moved (${history.before} to ${history.after}); starting nothing for ${String(HISTORY_QUIET_MS / 1000)} s and reading it again`);
    await sleep(HISTORY_QUIET_MS);
    history.quiet = { again: historyStat(), waitedMs: HISTORY_QUIET_MS };
  }
  arm('RUN', {
    tailscalePreflight,
    dnsPreflights,
    agentsHeld,
    countersHeard,
    realTailscale: leaked.length,
    serverRead,
    serverGone,
    serverBefore: serverBefore.out,
    socketsRead: sockets.read,
    socketsLeft: sockets.left,
    processTableRead: after.size > 0,
    electronsLeft,
    history
  });
  safely('the report', () => {
    mkdirSync(OUT, { recursive: true });
    writeFileSync(join(OUT, 'probe-p357.json'), `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 });
  });
  if (!KEEP) safely('the scratch world', () => rmSync(RUN, { recursive: true, force: true }));
  else say(`kept ${RUN} (P357_KEEP=1); every reading in ${OUT}`);
}

say(`${String(report.arms.filter((a) => a.ok === true).length)} arm(s) passed, ${String(failures)} failed, ${String(unreadable)} could not be read`);
process.exit(failures > 0 ? 1 : unreadable > 0 ? 2 : 0);
