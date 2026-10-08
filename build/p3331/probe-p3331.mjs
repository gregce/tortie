#!/usr/bin/env node
/**
 * probe:p3331 — a stranger's first run on the Mac: Settings then Phone's three
 * steps, read in the real app at the parent and at HEAD (Phase 333.1,
 * build/p3331/SPEC.md §7.5).
 *
 * WHAT IT MEASURES. The sheet now draws three steps under the switch,
 * Tailscale on this Mac, Publish this Mac and Pair your phone, and coming back
 * to the window asks main to check again by itself (`pocket:recheck`, main's
 * `rechecks()` deciding). This probe drives every Tailscale state the stand-in
 * has through the sheet's own presses, at the parent (`cb8d52a6`) and then at
 * HEAD, with the same script, and grades three things: the per-row matrix of
 * SPEC §7.5.2 (R0 to R14), the presses table of §7.5.3 (HEAD no higher in any
 * row than the parent at its FEWEST), and the attack of §7.5.4 (A1 to A10),
 * each attack asserted on the stand-in's own log or the store's own bytes,
 * never on main's report. RT is the one real return, §7.5.5.
 *
 * THE LAUNCHES, per build, never two Electrons at once (SPEC §7.5.1):
 *   L1  profile F, fresh: A1, R4 with R9 (the first publish, the name not yet
 *       answering), A4, R5 with A2, R6, R1, R2 with RT, R3, R13, R7, R8 (each
 *       of port-taken, busy and failed, with A8), R11, A3, A5a, A5b, A6, A10,
 *       phone B paired (R9's last clause), then A7 at its end: the quit during
 *       a read (at HEAD a return's, at the parent a press's, today's shape)
 *   L2  F relaunched: A7's count first, before the launch, after waiting the
 *       read's hold, the Tailscale deadline and 2 s; then R12 (D34)
 *   L3  S. At the PARENT, L3a makes S (the first setup's press, Allow, the
 *       code, node phone A paired) and L3b relaunches it: confirmed at launch,
 *       or R0 is UNREADABLE; R10 and R14 at the parent. At HEAD, the parent's S
 *       is relaunched with the SAME stand-in wrapper path, the same scenario
 *       and the same scratch HOME (§Attack F16): R0, R10, R14
 *
 * THE ORDER OF L1 IS NOT ARBITRARY. R9 needs the profile's FIRST publish,
 * because switching the door off keeps a confirmed name and the next switch-on
 * shows Pair at once (Phase 332's fix round), so it rides R4's first setup. The
 * name "silent" of SPEC §7.5.2 is the DNS stand-in's `nx` (NXDOMAIN, a name
 * that does not exist yet): a server that answers nothing is `unreadable`
 * (src/main/pocket/public-name.ts, `timeout`), and one unreadable round opens
 * Pair at once (`NAME_UNREADABLE_ROUNDS`), which is not the naming face. Phone
 * B pairs LAST, because a paired phone sets no wish (D17) and the first-setup
 * rows need none paired. R8's `port-taken` is the Funnel child's own refusal
 * (`refuse: 'port-taken'`, probe:p330 A6's): on a PRESS a held stored port is
 * chosen again (`readAtPress`), so a press never refuses it; the held stored
 * port on the RETURN path is A5a's and A5b's (`servedPorts`).
 *
 * WHAT IS REAL: the app's own `pocket:*` channels, the Settings window's Phone
 * section and its presses (Allow, the switch, Try again, Pair), and a return
 * dispatched as the helper documents it (src/renderer/machines/remote-writes.ts,
 * a synthetic `focus` on the Settings page). WHAT IS NOT: Tailscale is
 * build/p330/tailscale-standin.mjs at `GMUX_TAILSCALE_BIN`, preflighted by
 * sha256 before every launch, its new modes (D36) driven here (`setAbsent` for
 * a Tailscale that is not installed, `selfUser` and `account` for step 1's
 * account, `readDelayMs` for a read in flight); DNS is build/p332/dns-standin.mjs
 * IN THIS PROCESS on 127.0.0.1, named by `GMUX_POCKET_NAME_SERVERS`; Apple is
 * build/p314/apns-stand-in.mjs in this process, for R14's scratch key; phones
 * are build/p316/node-phone.mjs, unedited.
 *
 * IT NEVER PRESSES Get Tailscale, Open Tailscale, Approve in Tailscale or Copy
 * link, and NEVER calls `pocket:setupAction` (D35): the press helper refuses
 * those four hooks by name, and RUN counts any attempt. It reads them drawn,
 * and what main LISTS (`setupActions`). Approval is the stand-in's
 * `<dir>/approve`, written by the probe, as a person's one click would be.
 *
 * THE RETURN RECORDER (r2 §Attack F29). Before every arm the probe's OWN
 * listeners for `focus` and `visibilitychange` are on the Settings page
 * (installed through CDP, never in the shipping surface), each event stamped
 * with `performance.now()` and `Date.now()`, and marked caused when the probe
 * dispatched it (a counter held across the synchronous dispatch) or when RT
 * was moving the window. A return the probe did not cause (his clicks, a
 * window passing over, macOS's occlusion) makes the arm run once more, and a
 * second makes it UNREADABLE, never a pass and never a finding. Every read in
 * the stand-in's log is paired with the press, return, launch or mount before
 * it (`attribute`); the verifier re-derives that from the kept records.
 *
 * RT, THE REAL RETURN (D33). The Settings window is hidden and shown
 * inactive from main's inspector (`--inspect=0`), `document.visibilityState`
 * read `hidden` then `visible`, and the stand-in's log counted. A run whose
 * visibility never moved reads RT UNREADABLE, and R2 then goes on with a
 * synthetic return. With `P3331_REAL_FOCUS=1` the window is blurred and focused
 * instead (`document.hasFocus()` false then true), which takes the focus from
 * whatever he is typing into, so it is never the default.
 *
 * THE WORLD, and what it refuses. Every launch goes through
 * build/electron-run.mjs's `withElectron`, on a scratch profile inside a
 * harness directory under `/private/tmp/p3331-probe-<pid>`, a scratch HOME and
 * ZDOTDIR with `HISTFILE=/dev/null` and no `TERM_SESSION_ID`, the socket
 * `gmux-p3331-<pid>`, `GMUX_PROBES=1`, and build/hidden-agents.mjs before every
 * launch, read back through `agents:list`. A real Tailscale in any per-second
 * sample of the process table, a forbidden argv at the stand-in, or a UDP peer
 * of main's that is not 127.0.0.1 (sampled with lsof every 2 s) fails the run
 * and ends the app. It never runs `pkill`, `killall` or a pattern, signals no
 * process it did not start (a stand-in read left alive is ended by its pid in
 * the `finally`), installs nothing, spends no token, makes no request off the
 * Mac and photographs nothing: every visual claim is a rectangle, a hook or a
 * label. It reads nothing under his home: no keychain, no `~/.ssh`, no
 * conversation store, no live profile, and no `.p8` of his (R14's key is a
 * scratch P-256 key made here and deleted in the `finally`).
 *
 * It imports NO other probe: probe-p330, probe-p332, probe-p3321 and
 * probe-p3332 start their run at module top level, so importing one would
 * launch an Electron.
 *
 * VERIFIERS ONLY, under THE LOCK: it starts Electrons. Builders write it and
 * run only `--grader-self-test`, which grades recorded fixtures of every row
 * and attack, each clause shown red on its own break, and starts nothing.
 * MEASURED by the 333.1 verifier at 9 and about 10 minutes for both builds
 * (2026-10-08); the fix round's settle before each launch's first arm adds
 * about one more.
 *
 * THE FIX ROUND (2026-10-08, the verifier's first finding). R11 ends with ONE
 * press on the stand-in's own tailnet, whose read writes the stored tailnet
 * back, so the door the arms after it begin on is confirmed again (left on
 * the moved tailnet, A3 and A5a began `changed` and A5b's store moved under
 * its own read). Every arm that starts from confirmed fields checks it did,
 * and R12 that it started confirmed with phone B paired; a missing premise is
 * UNREADABLE, never a FAIL. R12, phone B and S run ONCE: R12's Remove cannot
 * be undone, and the two pairings count no Tailscale call, so a return the
 * probe did not cause is noted in their reading instead. Every launch waits
 * for its window to settle before its first arm: visible, then 4 s with no
 * focus or visibility event, at least 2 s and at most 30 s.
 *
 * THE PARENT IS REQUIRED. `P3331_PARENT_CHECKOUT` is a built checkout of
 * `cb8d52a6` (`out/main/index.js`); absent or unbuilt, the probe exits 2 before
 * anything starts. HEAD is this checkout, built.
 *
 *   P3331_PARENT_CHECKOUT=/path/to/parent node build/p3331/probe-p3331.mjs   both builds, parent first
 *   P3331_KEEP=1        keep the run folder and write <run>/rederive/ (0600):
 *                       the stand-in's invocations.log, timeline.json (every
 *                       press, return, launch, quit and scenario change with
 *                       its monotonic and wall times), store.json (pocket.json's
 *                       sha256 and mtime after every event) and statuses.json
 *                       (pocket:status after every event)
 *   P3331_REAL_FOCUS=1  RT through blur() and focus() instead of hide() and showInactive()
 *   P3331_RUN=<dir>     the scratch world's path (under /private/tmp)
 *   node build/p3331/probe-p3331.mjs --grader-self-test   the graders, no Electron
 *
 * NEVER `npm run probe:p3331 -- --grader-self-test`: npm hands the flag to
 * whatever the script names, and a script that wraps this file would start the
 * run. The self-test is `node build/p3331/probe-p3331.mjs --grader-self-test`.
 *
 * Exit 0 when every arm passed, 1 when one failed, 2 when it could not run or
 * an arm could not be READ, which is never a pass.
 */

import { spawnSync } from 'node:child_process';
import { createHash, generateKeyPairSync } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import { withElectron, withoutDevRenderer } from '../electron-run.mjs';
import { wsConnect, cdpEval } from '../cdp-client.mjs';
import { pickRendererTarget } from '../cdp-target.mjs';
import { gradeFixtures } from '../probe-graders.mjs';
import { AGENTS_LIST_EXPR, hiddenAgentsPrecheck, hiddenAgentsScanVerdict, writeHiddenAgents } from '../hidden-agents.mjs';
import { DEFAULT_SCENARIO, MADE_UP_ACCOUNT, endStandinProcesses, makeStandin, preflightStandin, processRows, watchForRealTailscale } from '../p330/tailscale-standin.mjs';
import { NAME_SERVERS_VAR, loopbackOnlyServers, makeDnsStandin, nameQuestionProblems } from '../p332/dns-standin.mjs';
import { startApnsStandIn } from '../p314/apns-stand-in.mjs';
import { doorFrom, makePhone, pairThrough, readOffer, signedGet } from '../p316/node-phone.mjs';

const HERE = fileURLToPath(import.meta.url);
const ROOT = resolve(dirname(HERE), '..', '..');
const J = JSON.stringify;
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

// ---------------------------------------------------------------------------
// THE PROBE'S OWN WORDS, spelled here as build/p3331/SPEC.md writes them
// (D14, §5.4), never read from the tree, so a word that drifts fails here.
// ---------------------------------------------------------------------------

export const WORDS = Object.freeze({
  doorLabel: 'Let my phone reach this Mac',
  turnOn: 'Turn it on, then come back.',
  signIn: 'Sign in, then come back.',
  askAdmin: 'Ask your Tailscale admin to approve Funnel.',
  nameWaitNote: 'This can take several minutes. You can leave this open or come back later.',
  approval: 'Tailscale needs your OK, once.',
  publisher: 'Only Tortie’s publisher can send alerts for now.',
  /** `BTN_OPEN_TAILSCALE` at HEAD, the approval page's press (§5.4.3). */
  approveButton: 'Approve in Tailscale',
  /** `BTN_OPEN_TAILSCALE` at the parent. */
  parentApproveButton: 'Open Tailscale'
});

/** The hooks this probe never presses (D35, SPEC §0). */
export const NEVER_PRESSED = Object.freeze(['get-tailscale', 'open-tailscale', 'open-approval', 'copy-link']);
/** The stand-in's made-up tailnet and the one R11 moves it to. */
export const TAILNET = DEFAULT_SCENARIO.tailnet;
export const MOVED = 'moved@example.com';
export const NAME = DEFAULT_SCENARIO.dnsName.replace(/\.$/, '');
/** R14's scratch key's id; its file is `AuthKey_<id>.p8` under the harness. */
export const KEY_ID = 'P3331SCRAT';
/** A7's hold, and the Tailscale deadline it is counted past (src/main/machines/tailscale.ts). */
export const A7_HOLD_MS = 3_000;
export const TAILSCALE_DEADLINE_MS = 5_000;
/** A3's storm: twenty returns, fifty milliseconds apart; and its read's hold. */
export const STORM = Object.freeze({ returns: 20, everyMs: 50, holdMs: 300 });

// ---------------------------------------------------------------------------
// The stand-in's log, read as Tailscale calls. Pure.
// ---------------------------------------------------------------------------

/** Every line that is a call: all but a hold's `held` line and an `exit` line. */
export const callsOf = (log) => (Array.isArray(log) ? log : []).filter((e) => e.kind !== 'held' && e.kind !== 'exit');

/** The Funnel children started, never the decoy. */
export const funnelSpawnsOf = (log) => (Array.isArray(log) ? log : []).filter((e) => e.kind === 'funnel' && e.role !== 'decoy');

/**
 * The reads in a stand-in log. A `status` line opens one; the `serve-status`
 * that follows within a second of its end (and before the next `status`)
 * closes it, so a lone `serve status` (a read-back of the serve config, which
 * a pairing does) is never taken for a read's second half; a `held` line ends
 * the read of the process that wrote it. Answers
 * `[{ start, end, statusPid, servePid, complete, ppid }]`, in order. Pure.
 */
export function readsOf(log) {
  const reads = [];
  for (const e of Array.isArray(log) ? log : []) {
    if (e.kind === 'status') {
      reads.push({ start: e.at, end: e.at, statusPid: e.pid, servePid: null, complete: false, ppid: e.ppid ?? null });
    } else if (e.kind === 'serve-status') {
      const last = reads.at(-1);
      if (last !== undefined && last.servePid === null && e.at - last.end <= 1_000) {
        last.servePid = e.pid;
        last.complete = true;
        last.end = Math.max(last.end, e.at);
      }
    } else if (e.kind === 'held') {
      const owner = reads.find((r) => r.statusPid === e.pid || r.servePid === e.pid);
      if (owner !== undefined) owner.end = Math.max(owner.end, e.at);
    }
  }
  return reads;
}

/** Pairs of reads where the second began before the first ended. Pure. */
export function overlapsOf(reads) {
  const out = [];
  for (let i = 1; i < reads.length; i += 1) if (reads[i].start < reads[i - 1].end) out.push([i - 1, i]);
  return out;
}

/** The returns that arrived while no read was in flight. Pure. */
export const returnsOutsideReads = (returns, reads) => returns.filter((t) => !reads.some((r) => t >= r.start && t <= r.end));

/**
 * Each read paired with the cause before it: the latest press, return,
 * launch, mount or bridge call whose time is at or before the read's start.
 * Answers `[{ read, cause }]`, `cause` null for a read nothing explains. Pure.
 */
export function attribute(reads, causes) {
  const sorted = [...(Array.isArray(causes) ? causes : [])].sort((a, b) => a.at - b.at);
  return reads.map((read) => {
    let cause = null;
    for (const c of sorted) {
      if (c.at <= read.start) cause = c;
      else break;
    }
    return { read, cause };
  });
}

// ---------------------------------------------------------------------------
// The return recorder's verdict. Pure.
// ---------------------------------------------------------------------------

/**
 * Is a recorded event a RETURN the probe did not cause? The helper hears a
 * `focus` on the window and a `visibilitychange` to visible; a change to
 * hidden is no return. `caused` is the recorder's own mark.
 */
export const isUncausedReturn = (e) =>
  e !== null && typeof e === 'object' && e.caused !== true && ((e.type === 'focus' && e.target === 'window') || (e.type === 'visibilitychange' && e.visibility === 'visible'));

// ---------------------------------------------------------------------------
// Readings of a face. Pure.
// ---------------------------------------------------------------------------

const stepOf = (face, id) => face?.steps?.[id] ?? null;
const stepIs = (face, id, key) => stepOf(face, id)?.stateKey === key;
const stepButtons = (face, id) => stepOf(face, id)?.buttons ?? [];
const stepHas = (face, id, action) => stepButtons(face, id).some((b) => b.action === action && b.enabled === true);
const stepLine = (face, id, text) => (stepOf(face, id)?.lines ?? []).includes(text);
const quietRetryIn = (face, id) => stepButtons(face, id).some((b) => b.action === 'retry-door' && b.quiet === true && b.enabled === true);
const drawn = (face, action) => (face?.actions?.[action] ?? []).length > 0;
const anyRetry = (face) => (face?.actions?.['retry-door'] ?? []).some((b) => b.enabled === true);
const oneRead = (reads) => Array.isArray(reads) && reads.length === 1 && reads[0].complete === true;
const RECT_KEYS = [0, 1, 2, 3];
/** Two `[x, y, w, h]` rectangles within half a pixel on every side. */
export const sameRect = (a, b) => Array.isArray(a) && Array.isArray(b) && RECT_KEYS.every((k) => Number.isFinite(a[k]) && Number.isFinite(b[k]) && Math.abs(a[k] - b[k]) <= 0.5);
const sameRects = (a, b) => a !== null && b !== null && typeof a === 'object' && typeof b === 'object' && Object.keys(a).length > 0 && J(Object.keys(a).sort()) === J(Object.keys(b).sort()) && Object.keys(a).every((k) => sameRect(a[k], b[k]));

/** The rows whose presses SPEC §7.5.3 grades, and how. */
export const PRESS_ROWS = Object.freeze({
  lower: ['R1', 'R2', 'R3', 'R6'],
  lowerWithNoPhone: ['R7', 'R8 port-taken', 'R8 busy', 'R8 failed'],
  equal: ['R4', 'R5', 'R9', 'R10']
});

// ---------------------------------------------------------------------------
// THE GRADERS. Pure: each takes the reading an arm collected and answers which
// of its clauses failed. A row's reading is `{ head, parent }`, each the same
// script's reading at that build. `--grader-self-test` runs every one over a
// passing fixture and, for EVERY clause, a fixture broken on that clause
// alone, which must fail on that clause.
// ---------------------------------------------------------------------------

export const GRADERS = {
  R0: {
    title: 'his already-set-up Mac, updated: published at launch, no Allow, every step done',
    clauses: [
      ['published at launch with no press', (r) => r.head.listening === true && r.head.presses === 0],
      ['no Allow asked: confirmed, with the parent’s own hash', (r) =>
        r.head.confirmState === 'confirmed' && typeof r.head.hash === 'string' && r.head.hash.length > 0 && r.head.hash === r.parent.hash && r.parent.confirmState === 'confirmed' && r.head.confirmSeen === false],
      ['step 1 done, with the tailnet', (r) => stepOf(r.head.face, 'tailscale')?.done === true && String(stepOf(r.head.face, 'tailscale')?.state ?? '').includes(TAILNET)],
      ['step 2 done, Published', (r) => stepOf(r.head.face, 'publish')?.done === true && stepIs(r.head.face, 'publish', 'published')],
      ['step 3 done, Paired, with Pair', (r) => stepOf(r.head.face, 'pair')?.done === true && stepIs(r.head.face, 'pair', 'paired') && (r.head.face.actions?.pair ?? []).some((b) => b.enabled === true)],
      ['phone A reads /v1/blocked', (r) => r.head.blocked === 200]
    ]
  },
  R1: {
    title: 'Tailscale not installed: Get Tailscale, then a return after the install reads once and the code shows by itself',
    clauses: [
      ['Not installed, Get Tailscale listed and drawn, and the quiet Try again', (r) =>
        stepIs(r.head.missing, 'tailscale', 'missing') && r.head.status.tailscale === 'missing' && r.head.status.setupActions.includes('get-tailscale') && stepHas(r.head.missing, 'tailscale', 'get-tailscale') && quietRetryIn(r.head.missing, 'tailscale')],
      ['nothing ran while Tailscale was absent', (r) => r.head.absentCalls === 0 && r.parent.absentCalls === 0],
      ['one return, one read: status then serve status', (r) => oneRead(r.head.reads)],
      ['step 1 done, then the lines and Allow', (r) => stepOf(r.head.after, 'tailscale')?.done === true && r.head.after.confirm.drawn === true && r.head.after.confirm.allowEnabled === true],
      ['the code by itself after Allow', (r) => r.head.reached === true && !r.head.pressList.includes('Pair') && r.head.pressList.includes('Allow')],
      ['the parent: its sentence and Try again, and no read on the return', (r) => r.parent.sentence === true && r.parent.retry === true && r.parent.returnReads === 0]
    ]
  },
  R2: {
    title: 'Tailscale not running: the turn-on line, then the return reads once and the code shows by itself',
    clauses: [
      ['Not running, the turn-on line, no Open Tailscale under the override, and the quiet Try again', (r) =>
        stepIs(r.head.stopped, 'tailscale', 'stopped') && stepLine(r.head.stopped, 'tailscale', WORDS.turnOn) && !r.head.status.setupActions.includes('open-tailscale') && !drawn(r.head.stopped, 'open-tailscale') && quietRetryIn(r.head.stopped, 'tailscale')],
      ['one return, one read: status then serve status', (r) => oneRead(r.head.reads)],
      ['step 1 done, then the lines and Allow', (r) => stepOf(r.head.after, 'tailscale')?.done === true && r.head.after.confirm.drawn === true && r.head.after.confirm.allowEnabled === true],
      ['the code by itself after Allow', (r) => r.head.reached === true && !r.head.pressList.includes('Pair') && r.head.pressList.includes('Allow')],
      ['the parent: its sentence and Try again, and no read on the return', (r) => r.parent.sentence === true && r.parent.retry === true && r.parent.returnReads === 0]
    ]
  },
  R3: {
    title: 'signed out, NeedsLogin then NeedsMachineAuth: the sign-in line, then a return after signing in reads and the code shows by itself',
    clauses: [
      ['NeedsLogin: Signed out, the sign-in line, no Open Tailscale, and the quiet Try again', (r) =>
        stepIs(r.head.signedOut, 'tailscale', 'signed-out') && stepLine(r.head.signedOut, 'tailscale', WORDS.signIn) && !r.head.status.setupActions.includes('open-tailscale') && !drawn(r.head.signedOut, 'open-tailscale') && quietRetryIn(r.head.signedOut, 'tailscale')],
      ['NeedsMachineAuth: a return reads once, still Signed out', (r) => Array.isArray(r.head.machineAuthReads) && r.head.machineAuthReads.length === 1 && stepIs(r.head.machineAuth, 'tailscale', 'signed-out')],
      ['signed in: a return reads once, status then serve status', (r) => oneRead(r.head.reads)],
      ['step 1 done, then the lines and Allow', (r) => stepOf(r.head.after, 'tailscale')?.done === true && r.head.after.confirm.drawn === true && r.head.after.confirm.allowEnabled === true],
      ['the code by itself after Allow', (r) => r.head.reached === true && !r.head.pressList.includes('Pair') && r.head.pressList.includes('Allow')],
      ['the parent: its sentence and Try again, and no read on either return', (r) => r.parent.sentence === true && r.parent.retry === true && r.parent.returnReads === 0]
    ]
  },
  R4: {
    title: 'a first setup with Tailscale ready: today’s confirm block, byte for byte, then Allow',
    clauses: [
      ['the confirm block drawn whole at HEAD, outside any disclosure', (r) => r.head.confirm.drawn === true && r.head.confirm.inDetails === false && r.head.confirm.allowEnabled === true],
      ['its words byte-equal to the parent’s', (r) => typeof r.head.confirm.text === 'string' && r.head.confirm.text.length > 0 && r.head.confirm.text === r.parent.confirm.text],
      ['confirmLines byte-equal to the parent’s', (r) => Array.isArray(r.head.lines) && r.head.lines.length > 0 && J(r.head.lines) === J(r.parent.lines)],
      ['confirmHash equal to the parent’s', (r) => typeof r.head.hash === 'string' && r.head.hash.length > 0 && r.head.hash === r.parent.hash],
      ['one stand-in path at both builds, named in the lines', (r) => r.head.program === r.parent.program && r.head.lines.some((l) => l.includes(r.head.program))],
      ['Allow pressed at both builds', (r) => r.head.allowed === true && r.parent.allowed === true]
    ]
  },
  R5: {
    title: 'Funnel not approved yet, the wait: Approve in Tailscale drawn and never pressed, and the approval publishes by itself',
    clauses: [
      ['after Allow: Waiting for Tailscale, the approval sentence, and Approve in Tailscale', (r) =>
        stepIs(r.head.waiting, 'publish', 'approval') && r.head.waiting.approval.drawn === true && String(r.head.waiting.approval.text ?? '').includes(WORDS.approval) && r.head.waiting.approval.openApproval?.text === WORDS.approveButton && r.head.waiting.approval.openApproval.enabled === true],
      ['What this allows is shut, and no second copy of the right', (r) =>
        r.head.waiting.approval.whatAllows !== null && r.head.waiting.approval.whatAllows.open === false && r.head.waiting.approval.funnelRightInApproval === false && r.head.waiting.approval.funnelRightAnywhere === 0],
      ['Approve in Tailscale never pressed', (r) => r.head.openPressed === false && r.parent.openPressed === false],
      ['the approval publishes with no press', (r) => r.head.listening === true && r.head.pressesAfterApprove === 0],
      ['the code by itself', (r) => r.head.reached === true && !r.head.pressList.includes('Pair')],
      ['the parent: its approval button, and the approval publishes', (r) => r.parent.openApproval === true && r.parent.listening === true]
    ]
  },
  A2: {
    title: 'a return during the approval wait: zero calls, the child alive, and the approval still publishes',
    clauses: [
      ['a return during the wait makes zero calls', (r) => r.head.calls === 0 && r.head.heard >= 1],
      ['the funnel child is still alive', (r) => r.head.childPid > 0 && r.head.childAlive === true],
      ['the approval still publishes', (r) => r.head.listening === true],
      ['the parent: zero calls too', (r) => r.parent.calls === 0]
    ]
  },
  R6: {
    title: 'not the tailnet’s admin: the ask with Copy link listed, a return before the grant reads and starts nothing, and after it publishes by itself',
    clauses: [
      ['Waiting for your admin, the ask, Copy link listed and drawn, and the quiet Try again', (r) =>
        stepIs(r.head.admin, 'publish', 'admin') && stepLine(r.head.admin, 'publish', WORDS.askAdmin) && r.head.adminStatus.setupActions.includes('copy-admin-link') && stepHas(r.head.admin, 'publish', 'copy-link') && quietRetryIn(r.head.admin, 'publish')],
      ['a return before the grant: one read', (r) => r.head.before.reads === 1],
      ['and zero door forks and zero funnel spawns', (r) => r.head.before.spawns === 0 && r.head.before.doorProcesses === 0],
      ['Copy link still listed after it', (r) => r.head.before.copyListed === true],
      ['the grant and one return publish with no press', (r) => r.head.after.listening === true && r.head.after.presses === 0 && r.head.after.spawns === 1],
      ['the code by itself', (r) => r.head.reached === true && !r.head.pressList.includes('Pair')],
      ['the parent: a dead end, its sentence and Try again, and no Copy link', (r) => r.parent.sentence === true && r.parent.retry === true && r.parent.copyLink === false]
    ]
  },
  R7: {
    title: 'shields up: main’s sentence and Try again, a return makes zero calls, and Try again publishes once it is cleared',
    clauses: [
      ['main’s sentence and Try again', (r) => typeof r.head.refusal === 'string' && r.head.refusal.length > 0 && r.head.sentenceDrawn === true && r.head.retry === true],
      ['no Open Tailscale under the override', (r) => !r.head.listed.includes('open-tailscale') && r.head.openDrawn === false],
      ['a return makes zero calls', (r) => r.head.returnCalls === 0 && r.head.heard >= 1],
      ['cleared, Try again publishes', (r) => r.head.publishedAfterTry === true],
      ['the parent: the same sentence and Try again', (r) => r.parent.sentenceDrawn === true && r.parent.retry === true && r.parent.refusal === r.head.refusal]
    ]
  },
  R8: {
    title: 'port taken, busy and failed: each main’s sentence and Try again, unchanged, and a return makes zero calls',
    clauses: [
      ['port-taken, busy and failed each driven', (r) => J(r.rows.map((x) => x.word)) === J(['port-taken', 'busy', 'failed'])],
      ['each: main’s sentence and Try again, as the parent says it', (r) =>
        r.rows.every((x) => typeof x.head.refusal === 'string' && x.head.refusal.length > 0 && x.head.sentenceDrawn === true && x.head.retry === true && x.head.refusal === x.parent.refusal && x.parent.sentenceDrawn === true)],
      ['each: a return makes zero calls', (r) => r.rows.every((x) => x.head.returnCalls === 0 && x.head.heard >= 1)],
      ['each: cleared, Try again publishes', (r) => r.rows.every((x) => x.head.publishedAfterTry === true)]
    ]
  },
  R9: {
    title: 'the name not answering yet: 332.1’s block with the wait note, nothing above it moves, and the code shows by itself',
    clauses: [
      ['naming: the block and the wait note', (r) => r.head.naming.stage === 'naming' && r.head.naming.nameBlock === true && r.head.naming.nameNote === WORDS.nameWaitNote],
      ['the note drawn exactly while the block is', (r) => r.head.samples.length >= 3 && r.head.samples.every((x) => x.nameBlock === (x.nameNote !== null))],
      ['the rectangles above the pair card unmoved', (r) => sameRects(r.head.rectsNaming, r.head.rectsShowing)],
      ['the code by itself', (r) => r.head.reached === true && !r.head.pressList.includes('Pair')],
      ['nameProgress keeps the parent’s members', (r) => r.head.progressKeys.length > 0 && J(r.head.progressKeys) === J(r.parent.progressKeys)],
      ['phone B scans and is allowed', (r) => r.head.phoneB.paired === true && r.head.phoneB.blocked === 200],
      ['the parent: the same block, and the code after its Pair with the door off', (r) => r.parent.naming.nameBlock === true && r.parent.reached === true && r.parent.firstPress === 'pair']
    ]
  },
  R10: {
    title: 'his set-up Mac with the door off: Pair gives a code, no Allow asked',
    clauses: [
      ['step 3 done, Paired, Pair drawn with the door off', (r) =>
        stepOf(r.head.rest, 'pair')?.done === true && stepIs(r.head.rest, 'pair', 'paired') && (r.head.rest.actions?.pair ?? []).some((b) => b.enabled === true) && r.head.rest.stage === 'start'],
      ['Pair gives a code after the start', (r) => r.head.reached === true],
      ['no Allow asked, one press', (r) => r.head.confirmSeen === false && r.head.presses === 1],
      ['the parent: Pair gives the same', (r) => r.parent.reached === true && r.parent.confirmSeen === false && r.parent.presses === 1]
    ]
  },
  R11: {
    title: 'the tailnet moved under a confirmed door, Tailscale stopped then running: a return reads and asks again, and starts nothing',
    clauses: [
      ['a return reads', (r) => r.head.returnReads >= 1],
      ['Changed since you allowed it, the new lines and Allow', (r) =>
        stepIs(r.head.changed, 'publish', 'changed') && r.head.status.confirmState === 'changed' && r.head.status.confirmLines.some((l) => l.includes(MOVED)) && r.head.changed.confirm.allowEnabled === true],
      ['zero door forks and zero funnel spawns', (r) => r.head.spawns === 0 && r.head.doorProcesses === 0],
      ['the parent: no read on the return; its lines and Allow after a press', (r) => r.parent.returnReads === 0 && r.parent.afterPress.confirmState === 'changed' && r.parent.afterPress.allow === true]
    ]
  },
  R12: {
    title: 'relaunched confirmed with Tailscale stopped, then Remove and Tailscale running: a return reads nothing (not pressed this run)',
    clauses: [
      ['relaunched confirmed, Tailscale stopped', (r) => r.head.launch.confirmState === 'confirmed' && r.head.launch.tailscale === 'stopped'],
      ['Remove withdrew the agreement', (r) => r.head.afterRemove.confirmState !== 'confirmed' && r.head.afterRemove.phones === 0],
      ['Running, then a return: zero stand-in calls', (r) => r.head.returnCalls === 0 && r.head.heard >= 1],
      ['Try again reads', (r) => r.head.tryReads >= 1],
      ['the parent: zero calls on the return, and Try again reads', (r) => r.parent.returnCalls === 0 && r.parent.tryReads >= 1]
    ]
  },
  R13: {
    title: 'step 1’s account: the self user and the tailnet, the tailnet alone, and one value drawn once',
    clauses: [
      ['with the self user: the account and the tailnet', (r) =>
        r.head.withUser.line === `${MADE_UP_ACCOUNT} · ${TAILNET}` && r.head.withUser.done === true && r.head.withUser.account === MADE_UP_ACCOUNT && r.head.withUser.tailnet === TAILNET],
      ['with no User map: the tailnet alone', (r) => r.head.noUser.line === TAILNET && r.head.noUser.account === null && r.head.noUser.done === true],
      ['an account equal to the tailnet: drawn once', (r) => r.head.same.line === TAILNET && r.head.same.account === TAILNET],
      ['the parent draws no step 1', (r) => r.parent.steps === false]
    ]
  },
  R14: {
    title: 'the Alerts card says only Tortie’s publisher can send alerts, with and without a key',
    clauses: [
      ['the publisher line with no key', (r) => r.head.k0 === WORDS.publisher],
      ['with a key kept, still the publisher line', (r) => r.head.keyKept === true && r.head.k1 === WORDS.publisher],
      ['the parent draws no such line', (r) => r.parent.k0 === null && r.parent.k1 === null && r.parent.keyKept === true]
    ]
  },
  RT: {
    title: 'the real return: the window hidden and shown again, and HEAD reads once where the parent reads nothing',
    clauses: [
      ['the window really went away and came back', (r) => r.head.moved === true && r.parent.moved === true],
      ['one read after it at HEAD', (r) => oneRead(r.head.reads)],
      ['none at the parent', (r) => Array.isArray(r.parent.reads) && r.parent.reads.length === 0]
    ]
  },
  A1: {
    title: 'a return with the switch off: zero calls',
    clauses: [
      ['zero calls at HEAD, the return heard', (r) => r.head.calls === 0 && r.head.heard >= 1],
      ['zero calls at the parent', (r) => r.parent.calls === 0]
    ]
  },
  A3: {
    title: 'twenty returns in a second over a held read: reads never overlap, and a return during a read adds none',
    clauses: [
      ['twenty returns inside a second and a half', (r) => r.head.returns.length === STORM.returns && r.head.returns.at(-1) - r.head.returns[0] <= 1_500],
      ['at least one read', (r) => r.head.reads.length >= 1],
      ['reads never overlap', (r) => overlapsOf(r.head.reads).length === 0],
      ['every read follows a return', (r) => r.head.reads.every((x) => r.head.returns.some((t) => t <= x.start))],
      ['a return during a read adds none', (r) => r.head.reads.length <= returnsOutsideReads(r.head.returns, r.head.reads).length],
      ['the parent: no read', (r) => r.parent.reads.length === 0]
    ]
  },
  A4: {
    title: 'a return while published: zero calls',
    clauses: [
      ['zero calls at HEAD, published, the return heard', (r) => r.head.calls === 0 && r.head.listening === true && r.head.heard >= 1],
      ['zero calls at the parent', (r) => r.parent.calls === 0]
    ]
  },
  A5a: {
    title: 'confirmed fields, the stored port held: a return refuses port-taken and changes nothing',
    clauses: [
      ['port-taken, said with the port', (r) => r.head.status.funnel.refused === 'port-taken' && typeof r.head.status.refusal === 'string' && r.head.status.refusal.includes(String(r.head.port))],
      ['pocket.json unchanged', (r) => typeof r.head.shaBefore === 'string' && r.head.shaBefore === r.head.shaAfter],
      ['zero door forks and zero funnel spawns', (r) => r.head.spawns === 0 && r.head.doorProcesses === 0],
      ['the parent: zero calls on the return', (r) => r.parent.calls === 0]
    ]
  },
  A5b: {
    title: 'unconfirmed fields pressed this run, the stored port held: no Allow over it, and Try again moves the port',
    clauses: [
      ['port-taken kept as the read’s: not confirmable', (r) => r.head.status.funnel.refused === 'port-taken' && r.head.status.confirmable === false],
      ['no Allow in the section; its sentence and Try again', (r) => !drawn(r.head.face, 'confirm-door') && typeof r.head.status.refusal === 'string' && String(r.head.face.text).includes(r.head.status.refusal) && anyRetry(r.head.face)],
      ['pocket.json unchanged', (r) => typeof r.head.shaBefore === 'string' && r.head.shaBefore === r.head.shaAfter],
      ['zero door forks and zero funnel spawns', (r) => r.head.spawns === 0 && r.head.doorProcesses === 0],
      ['Try again chooses the other port and draws Allow', (r) => Number.isInteger(r.head.afterTry.port) && r.head.afterTry.port !== r.head.port && r.head.afterTry.allow === true],
      ['the parent: zero calls on the return', (r) => r.parent.calls === 0]
    ]
  },
  A6: {
    title: 'a return racing an off press: the off wins',
    clauses: [
      ['the off within 50 ms of the return', (r) => r.head.gapMs >= 0 && r.head.gapMs <= 50],
      ['the off wins: the door off, nothing published', (r) => r.head.state === 'off' && r.head.listening === false],
      ['no funnel child alive, none spawned', (r) => r.head.liveFunnels === 0 && r.head.spawns === 0]
    ]
  },
  A7: {
    title: 'the quit during a read: nothing of the run left, and the read’s own process ends by itself',
    clauses: [
      ['the quit came while a return’s read was held', (r) => r.head.readStart > 0 && r.head.quitAt > r.head.readStart && (r.head.readEnd === null || r.head.readEnd > r.head.quitAt)],
      ['counted after the hold, the deadline and two seconds', (r) => r.head.waitedMs >= r.head.holdMs + TAILSCALE_DEADLINE_MS + 2_000],
      ['no funnel child left', (r) => r.head.funnelsLeft === 0],
      ['no Electron of the run left', (r) => r.head.electronLeft === 0],
      ['the read’s own process ended by itself', (r) => r.head.readPid > 0 && r.head.readPidAlive === false],
      ['the parent’s press read at the quit ends the same', (r) => r.parent.funnelsLeft === 0 && r.parent.electronLeft === 0 && r.parent.readPidAlive === false]
    ]
  },
  A8: {
    title: 'a return after shields-up, port-taken, busy and failed: zero calls each',
    clauses: [
      ['the four refusals driven', (r) => J(r.head.map((x) => x.word)) === J(['shields-up', 'port-taken', 'busy', 'failed'])],
      ['zero calls after each at HEAD', (r) => r.head.every((x) => x.calls === 0)],
      ['zero calls after each at the parent', (r) => r.parent.length === 4 && r.parent.every((x) => x.calls === 0)]
    ]
  },
  A9: {
    title: 'what main lists: Open Tailscale never under the override, Get Tailscale exactly while missing',
    clauses: [
      ['open-tailscale never listed under the development override', (r) => r.samples.every((s) => !s.setupActions.includes('open-tailscale'))],
      ['get-tailscale listed exactly while Tailscale is missing', (r) => r.samples.every((s) => s.setupActions.includes('get-tailscale') === (s.tailscale === 'missing'))],
      ['sampled across the run, missing among them', (r) => r.samples.length >= 30 && r.samples.some((s) => s.tailscale === 'missing') && r.samples.some((s) => s.tailscale === 'ready')]
    ]
  },
  A10: {
    title: 'a start refused not-approved with Funnel’s capabilities present: one return starts once, then nothing until a press',
    clauses: [
      ['the start refused not-approved with the capabilities present', (r) => r.head.refused === 'not-approved' && r.head.asksApproval === false],
      ['the first return: one read and one funnel spawn', (r) => r.head.returns[0]?.reads === 1 && r.head.returns[0]?.spawns === 1],
      ['returns two to five: zero calls', (r) => r.head.returns.length === 5 && r.head.returns.slice(1).every((x) => x.calls === 0)],
      ['Try again reads again', (r) => r.head.afterTry.reads >= 1],
      ['the parent: no return reads', (r) => r.parent.returns.length === 5 && r.parent.returns.every((x) => x.calls === 0)]
    ]
  },
  PRESSES: {
    title: 'the presses from each row’s start to the code: HEAD no higher than the parent at its fewest',
    clauses: [
      ['every row counted to the code at both builds', (r) =>
        r.rows.length >= 12 && r.rows.every((x) => Number.isInteger(x.parent) && Number.isInteger(x.head) && x.parentReached === true && x.headReached === true)],
      ['HEAD no higher in any row', (r) => r.rows.every((x) => x.head <= x.parent)],
      ['lower in R1, R2, R3 and R6', (r) => PRESS_ROWS.lower.every((id) => r.rows.some((x) => x.row === id && x.head < x.parent))],
      ['R7 and R8: lower with no phone paired, equal with one', (r) =>
        PRESS_ROWS.lowerWithNoPhone.every((id) => r.rows.some((x) => x.row === id && (x.phoneAtStart ? x.head === x.parent : x.head < x.parent)))],
      ['equal in R4, R5, R9 and R10', (r) => PRESS_ROWS.equal.every((id) => r.rows.some((x) => x.row === id && x.head === x.parent))]
    ]
  },
  RUN: {
    title: 'no real Tailscale, no real DNS, no agent, no setup press, nothing to Apple, nothing left',
    clauses: [
      ['the Tailscale preflight before every launch', (r) => r.tailscalePreflights.length >= 7 && r.tailscalePreflights.every((x) => x === true)],
      ['the DNS preflight before every launch, loopback alone', (r) => r.dnsPreflights.length >= 7 && r.dnsPreflights.every((x) => x === true)],
      ['the hidden agents resolve nowhere', (r) => r.agentsPrecheck.length >= 7 && r.agentsPrecheck.every((x) => x === true) && r.agentsScan.length >= 7 && r.agentsScan.every((x) => x === true)],
      ['no real Tailscale', (r) => r.realTailscale === 0 && r.samples > 0],
      ['no forbidden argv', (r) => r.forbidden === 0 && r.refusedArgv === 0],
      ['UDP to 127.0.0.1 alone', (r) => r.udpLeaks === 0 && r.udpSamples > 0],
      ['every DNS question an A, RD 0, for the name', (r) => r.totalQuestions > 0 && r.questionProblems.length === 0],
      ['no setup press, and setupAction never called', (r) => r.setupPresses === 0],
      ['nothing reached Apple’s stand-in', (r) => r.apnsRequests === 0 && r.apnsConnections.development === 0 && r.apnsConnections.production === 0],
      ['the key file is gone', (r) => r.keyFileGone === true],
      ['every stand-in ended', (r) => r.standinLeft === 0 && r.dnsClosed === true && r.apnsClosed === true],
      ['no Electron left', (r) => r.electronLeft === 0],
      ['no node phone left', (r) => r.phoneProcesses === 0]
    ]
  }
};

/** Grade one arm's reading. */
export function grade(id, reading) {
  const failed = [];
  for (const [name, predicate] of GRADERS[id].clauses) {
    let ok = false;
    try {
      ok = predicate(reading) === true;
    } catch {
      ok = false;
    }
    if (!ok) failed.push(name);
  }
  return { ok: failed.length === 0, failed };
}

// ---------------------------------------------------------------------------
// THE FIXTURES. A face and a read of each kind the run collects, and every
// grader's passing reading built from them. A fixture is a reading, never the
// claim: what HEAD draws is read by the run.
// ---------------------------------------------------------------------------

const fxBtn = (action, over = {}) => ({ action, text: '', enabled: true, quiet: false, primary: false, ...over });
const fxStep = (id, stateKey, over = {}) => ({ id, stateKey, done: false, current: false, title: '', state: null, hover: null, num: null, check: false, lines: [], buttons: [], disclosures: [], body: '', ...over });
function fxFace(over = {}) {
  const base = {
    at: 0,
    stage: 'start',
    steps: { tailscale: fxStep('tailscale', 'installed'), publish: fxStep('publish', null), pair: fxStep('pair', null) },
    confirm: { drawn: false, text: null, inDetails: false, allow: false, allowEnabled: false, funnelRight: false },
    approval: { drawn: false, text: null, openApproval: null, whatAllows: null, funnelRightInApproval: false, funnelRightAnywhere: 0 },
    actions: {},
    links: 0,
    nameBlock: false,
    nameNote: null,
    publisher: null,
    keyLine: null,
    switchOn: 'false',
    switchEnabled: true,
    doorLine: null,
    text: ''
  };
  const out = { ...base, ...over };
  out.steps = over.steps === null ? null : { ...base.steps, ...(over.steps ?? {}) };
  return out;
}
const fxRead = (start, complete = true) => ({ start, end: start + 60, statusPid: 1_000 + start, servePid: complete ? 2_000 + start : null, complete, ppid: 99 });
const fxConfirm = (text = 'Answers on the internet at https://p330-mac.tail00000.ts.net:8443 …') => ({ drawn: true, text, inDetails: false, allow: true, allowEnabled: true, funnelRight: false });
const PROGRAM = '/private/tmp/p3331-probe-1/standin/tailscale';
const LINES = [`Answers on the internet at https://${NAME}:8443, through Tailscale Funnel on ${TAILNET}.`, `Publishes it with ${PROGRAM}.`, 'Allows no phone yet.'];
const readyFace = () =>
  fxFace({ stage: 'waiting', steps: { tailscale: fxStep('tailscale', 'ready', { done: true, state: TAILNET }), publish: fxStep('publish', 'confirm', { body: '' }) }, confirm: fxConfirm(), actions: { 'confirm-door': [fxBtn('confirm-door', { primary: true })] } });

export const GRADER_FIXTURES = {
  R0: {
    pass: {
      head: {
        listening: true,
        presses: 0,
        confirmState: 'confirmed',
        hash: 'h'.repeat(64),
        confirmSeen: false,
        blocked: 200,
        face: fxFace({
          stage: 'ready',
          steps: {
            tailscale: fxStep('tailscale', 'ready', { done: true, state: TAILNET }),
            publish: fxStep('publish', 'published', { done: true, state: 'Published' }),
            pair: fxStep('pair', 'paired', { done: true, state: 'Paired' })
          },
          actions: { pair: [fxBtn('pair', { primary: true })] }
        })
      },
      parent: { confirmState: 'confirmed', hash: 'h'.repeat(64) }
    },
    breaks: {
      'published at launch with no press': (r) => void (r.head.presses = 1),
      'no Allow asked: confirmed, with the parent’s own hash': (r) => void (r.head.hash = 'g'.repeat(64)),
      'step 1 done, with the tailnet': (r) => void (r.head.face.steps.tailscale.state = 'Installed'),
      'step 2 done, Published': (r) => void (r.head.face.steps.publish.stateKey = 'confirm'),
      'step 3 done, Paired, with Pair': (r) => void (r.head.face.actions = {}),
      'phone A reads /v1/blocked': (r) => void (r.head.blocked = 0)
    },
    refused: [
      { what: 'the confirm block drawn while it published', clause: 'no Allow asked: confirmed, with the parent’s own hash', edit: (r) => void (r.head.confirmSeen = true) },
      { what: 'a parent that read changed at its own relaunch', clause: 'no Allow asked: confirmed, with the parent’s own hash', edit: (r) => void (r.parent.confirmState = 'changed') },
      { what: 'not listening at launch', clause: 'published at launch with no press', edit: (r) => void (r.head.listening = false) },
      { what: 'step 1 not done', clause: 'step 1 done, with the tailnet', edit: (r) => void (r.head.face.steps.tailscale.done = false) }
    ]
  },
  R1: {
    pass: {
      head: {
        missing: fxFace({
          stage: 'waiting',
          steps: { tailscale: fxStep('tailscale', 'missing', { state: 'Not installed', buttons: [fxBtn('get-tailscale', { primary: true }), fxBtn('retry-door', { quiet: true })] }) },
          actions: { 'get-tailscale': [fxBtn('get-tailscale')], 'retry-door': [fxBtn('retry-door', { quiet: true })] }
        }),
        status: { tailscale: 'missing', setupActions: ['get-tailscale'], state: 'refused' },
        absentCalls: 0,
        reads: [fxRead(100)],
        after: readyFace(),
        reached: true,
        pressList: ['switch', 'Allow']
      },
      parent: { sentence: true, retry: true, absentCalls: 0, returnReads: 0 }
    },
    breaks: {
      'Not installed, Get Tailscale listed and drawn, and the quiet Try again': (r) => void (r.head.status.setupActions = []),
      'nothing ran while Tailscale was absent': (r) => void (r.head.absentCalls = 1),
      'one return, one read: status then serve status': (r) => void r.head.reads.push(fxRead(900)),
      'step 1 done, then the lines and Allow': (r) => void (r.head.after.confirm.allowEnabled = false),
      'the code by itself after Allow': (r) => void r.head.pressList.push('Pair'),
      'the parent: its sentence and Try again, and no read on the return': (r) => void (r.parent.returnReads = 1)
    },
    refused: [
      { what: 'Get Tailscale listed but not drawn', clause: 'Not installed, Get Tailscale listed and drawn, and the quiet Try again', edit: (r) => void (r.head.missing.steps.tailscale.buttons = [fxBtn('retry-door', { quiet: true })]) },
      { what: 'Try again not quiet', clause: 'Not installed, Get Tailscale listed and drawn, and the quiet Try again', edit: (r) => void (r.head.missing.steps.tailscale.buttons = [fxBtn('get-tailscale'), fxBtn('retry-door')]) },
      { what: 'a read that never reached serve status', clause: 'one return, one read: status then serve status', edit: (r) => void (r.head.reads = [fxRead(100, false)]) },
      { what: 'no read at all', clause: 'one return, one read: status then serve status', edit: (r) => void (r.head.reads = []) },
      { what: 'the code never shown', clause: 'the code by itself after Allow', edit: (r) => void (r.head.reached = false) },
      { what: 'the stand-in ran at the parent while absent', clause: 'nothing ran while Tailscale was absent', edit: (r) => void (r.parent.absentCalls = 2) }
    ]
  },
  R2: {
    pass: {
      head: {
        stopped: fxFace({
          stage: 'waiting',
          steps: { tailscale: fxStep('tailscale', 'stopped', { state: 'Not running', lines: [WORDS.turnOn], buttons: [fxBtn('retry-door', { quiet: true })] }) },
          actions: { 'retry-door': [fxBtn('retry-door', { quiet: true })] }
        }),
        status: { tailscale: 'stopped', setupActions: [], state: 'refused' },
        reads: [fxRead(100)],
        after: readyFace(),
        reached: true,
        pressList: ['switch', 'Allow']
      },
      parent: { sentence: true, retry: true, returnReads: 0 }
    },
    breaks: {
      'Not running, the turn-on line, no Open Tailscale under the override, and the quiet Try again': (r) => void (r.head.stopped.steps.tailscale.lines = []),
      'one return, one read: status then serve status': (r) => void (r.head.reads = []),
      'step 1 done, then the lines and Allow': (r) => void (r.head.after.steps.tailscale.done = false),
      'the code by itself after Allow': (r) => void (r.head.reached = false),
      'the parent: its sentence and Try again, and no read on the return': (r) => void (r.parent.sentence = false)
    },
    refused: [
      { what: 'Open Tailscale listed under the override', clause: 'Not running, the turn-on line, no Open Tailscale under the override, and the quiet Try again', edit: (r) => void (r.head.status.setupActions = ['open-tailscale']) },
      { what: 'Open Tailscale drawn', clause: 'Not running, the turn-on line, no Open Tailscale under the override, and the quiet Try again', edit: (r) => void (r.head.stopped.actions['open-tailscale'] = [fxBtn('open-tailscale')]) },
      { what: 'the step read as signed out', clause: 'Not running, the turn-on line, no Open Tailscale under the override, and the quiet Try again', edit: (r) => void (r.head.stopped.steps.tailscale.stateKey = 'signed-out') },
      { what: 'two reads for one return', clause: 'one return, one read: status then serve status', edit: (r) => void (r.head.reads = [fxRead(100), fxRead(500)]) }
    ]
  },
  R3: {
    pass: {
      head: {
        signedOut: fxFace({
          stage: 'waiting',
          steps: { tailscale: fxStep('tailscale', 'signed-out', { state: 'Signed out', lines: [WORDS.signIn], buttons: [fxBtn('retry-door', { quiet: true })] }) },
          actions: { 'retry-door': [fxBtn('retry-door', { quiet: true })] }
        }),
        status: { tailscale: 'signed-out', setupActions: [], state: 'refused' },
        machineAuthReads: [fxRead(50, false)],
        machineAuth: fxFace({ steps: { tailscale: fxStep('tailscale', 'signed-out', { lines: [WORDS.signIn] }) } }),
        reads: [fxRead(100)],
        after: readyFace(),
        reached: true,
        pressList: ['switch', 'Allow']
      },
      parent: { sentence: true, retry: true, returnReads: 0 }
    },
    breaks: {
      'NeedsLogin: Signed out, the sign-in line, no Open Tailscale, and the quiet Try again': (r) => void (r.head.signedOut.steps.tailscale.lines = [WORDS.turnOn]),
      'NeedsMachineAuth: a return reads once, still Signed out': (r) => void (r.head.machineAuthReads = []),
      'signed in: a return reads once, status then serve status': (r) => void (r.head.reads = [fxRead(100, false)]),
      'step 1 done, then the lines and Allow': (r) => void (r.head.after.confirm.drawn = false),
      'the code by itself after Allow': (r) => void r.head.pressList.push('Pair'),
      'the parent: its sentence and Try again, and no read on either return': (r) => void (r.parent.retry = false)
    },
    refused: [{ what: 'NeedsMachineAuth read as ready', clause: 'NeedsMachineAuth: a return reads once, still Signed out', edit: (r) => void (r.head.machineAuth.steps.tailscale.stateKey = 'ready') }]
  },
  R4: {
    pass: {
      head: { confirm: fxConfirm('the block'), lines: [...LINES], hash: 'c'.repeat(64), program: PROGRAM, allowed: true },
      parent: { confirm: fxConfirm('the block'), lines: [...LINES], hash: 'c'.repeat(64), program: PROGRAM, allowed: true }
    },
    breaks: {
      'the confirm block drawn whole at HEAD, outside any disclosure': (r) => void (r.head.confirm.inDetails = true),
      'its words byte-equal to the parent’s': (r) => void (r.head.confirm.text = 'the block.'),
      'confirmLines byte-equal to the parent’s': (r) => void r.head.lines.pop(),
      'confirmHash equal to the parent’s': (r) => void (r.head.hash = 'd'.repeat(64)),
      'one stand-in path at both builds, named in the lines': (r) => void (r.head.program = '/elsewhere/tailscale'),
      'Allow pressed at both builds': (r) => void (r.parent.allowed = false)
    },
    refused: [
      { what: 'an empty block at both builds', clause: 'its words byte-equal to the parent’s', edit: (r) => Object.assign(r, { head: { ...r.head, confirm: { ...r.head.confirm, text: '' } }, parent: { ...r.parent, confirm: { ...r.parent.confirm, text: '' } } }) },
      { what: 'no lines at either build', clause: 'confirmLines byte-equal to the parent’s', edit: (r) => Object.assign(r, { head: { ...r.head, lines: [] }, parent: { ...r.parent, lines: [] } }) },
      { what: 'Allow drawn but not pressable', clause: 'the confirm block drawn whole at HEAD, outside any disclosure', edit: (r) => void (r.head.confirm.allowEnabled = false) }
    ]
  },
  R5: {
    pass: {
      head: {
        waiting: fxFace({
          stage: 'waiting',
          steps: { tailscale: fxStep('tailscale', 'ready', { done: true }), publish: fxStep('publish', 'approval', { state: 'Waiting for Tailscale' }) },
          approval: { drawn: true, text: `${WORDS.approval} ${WORDS.approveButton}`, openApproval: fxBtn('open-approval', { text: WORDS.approveButton, primary: true }), whatAllows: { open: false, text: 'What this allows' }, funnelRightInApproval: false, funnelRightAnywhere: 0 }
        }),
        openPressed: false,
        listening: true,
        pressesAfterApprove: 0,
        reached: true,
        pressList: ['switch', 'Allow']
      },
      parent: { openApproval: true, openPressed: false, listening: true }
    },
    breaks: {
      'after Allow: Waiting for Tailscale, the approval sentence, and Approve in Tailscale': (r) => void (r.head.waiting.approval.openApproval.text = WORDS.parentApproveButton),
      'What this allows is shut, and no second copy of the right': (r) => void (r.head.waiting.approval.whatAllows.open = true),
      'Approve in Tailscale never pressed': (r) => void (r.head.openPressed = true),
      'the approval publishes with no press': (r) => void (r.head.pressesAfterApprove = 1),
      'the code by itself': (r) => void r.head.pressList.push('Pair'),
      'the parent: its approval button, and the approval publishes': (r) => void (r.parent.openApproval = false)
    },
    refused: [
      { what: 'the right drawn twice, once in the approval face', clause: 'What this allows is shut, and no second copy of the right', edit: (r) => void (r.head.waiting.approval.funnelRightInApproval = true) },
      { what: 'no disclosure at all', clause: 'What this allows is shut, and no second copy of the right', edit: (r) => void (r.head.waiting.approval.whatAllows = null) },
      { what: 'the old approval sentence', clause: 'after Allow: Waiting for Tailscale, the approval sentence, and Approve in Tailscale', edit: (r) => void (r.head.waiting.approval.text = 'Tailscale needs your OK to publish this door.') }
    ]
  },
  A2: {
    pass: { head: { calls: 0, heard: 1, childPid: 4321, childAlive: true, listening: true }, parent: { calls: 0 } },
    breaks: {
      'a return during the wait makes zero calls': (r) => void (r.head.calls = 2),
      'the funnel child is still alive': (r) => void (r.head.childAlive = false),
      'the approval still publishes': (r) => void (r.head.listening = false),
      'the parent: zero calls too': (r) => void (r.parent.calls = 1)
    },
    refused: [{ what: 'a return that was never heard', clause: 'a return during the wait makes zero calls', edit: (r) => void (r.head.heard = 0) }]
  },
  R6: {
    pass: {
      head: {
        admin: fxFace({
          steps: { tailscale: fxStep('tailscale', 'ready', { done: true }), publish: fxStep('publish', 'admin', { state: 'Waiting for your admin', lines: [WORDS.askAdmin], buttons: [fxBtn('copy-link'), fxBtn('retry-door', { quiet: true })] }) }
        }),
        adminStatus: { setupActions: ['copy-admin-link'] },
        before: { reads: 1, spawns: 0, doorProcesses: 0, copyListed: true },
        after: { listening: true, presses: 0, spawns: 1 },
        reached: true,
        pressList: ['switch', 'Allow']
      },
      parent: { sentence: true, retry: true, copyLink: false }
    },
    breaks: {
      'Waiting for your admin, the ask, Copy link listed and drawn, and the quiet Try again': (r) => void (r.head.adminStatus.setupActions = []),
      'a return before the grant: one read': (r) => void (r.head.before.reads = 0),
      'and zero door forks and zero funnel spawns': (r) => void (r.head.before.spawns = 1),
      'Copy link still listed after it': (r) => void (r.head.before.copyListed = false),
      'the grant and one return publish with no press': (r) => void (r.head.after.presses = 1),
      'the code by itself': (r) => void (r.head.reached = false),
      'the parent: a dead end, its sentence and Try again, and no Copy link': (r) => void (r.parent.copyLink = true)
    },
    refused: [
      { what: 'a door process forked by the return', clause: 'and zero door forks and zero funnel spawns', edit: (r) => void (r.head.before.doorProcesses = 1) },
      { what: 'the ask in other words', clause: 'Waiting for your admin, the ask, Copy link listed and drawn, and the quiet Try again', edit: (r) => void (r.head.admin.steps.publish.lines = ['Ask your admin.']) },
      { what: 'two spawns after the grant', clause: 'the grant and one return publish with no press', edit: (r) => void (r.head.after.spawns = 2) }
    ]
  },
  R7: {
    pass: { head: { refusal: 'shields', sentenceDrawn: true, retry: true, listed: [], openDrawn: false, returnCalls: 0, heard: 1, publishedAfterTry: true }, parent: { refusal: 'shields', sentenceDrawn: true, retry: true } },
    breaks: {
      'main’s sentence and Try again': (r) => void (r.head.retry = false),
      'no Open Tailscale under the override': (r) => void (r.head.openDrawn = true),
      'a return makes zero calls': (r) => void (r.head.returnCalls = 1),
      'cleared, Try again publishes': (r) => void (r.head.publishedAfterTry = false),
      'the parent: the same sentence and Try again': (r) => void (r.parent.refusal = 'other')
    },
    refused: [{ what: 'Open Tailscale listed', clause: 'no Open Tailscale under the override', edit: (r) => void (r.head.listed = ['open-tailscale']) }]
  },
  R8: {
    pass: {
      rows: ['port-taken', 'busy', 'failed'].map((word) => ({
        word,
        head: { refusal: `s-${word}`, sentenceDrawn: true, retry: true, returnCalls: 0, heard: 1, publishedAfterTry: true },
        parent: { refusal: `s-${word}`, sentenceDrawn: true }
      }))
    },
    breaks: {
      'port-taken, busy and failed each driven': (r) => void r.rows.pop(),
      'each: main’s sentence and Try again, as the parent says it': (r) => void (r.rows[1].head.refusal = 'reworded'),
      'each: a return makes zero calls': (r) => void (r.rows[2].head.returnCalls = 2),
      'each: cleared, Try again publishes': (r) => void (r.rows[0].head.publishedAfterTry = false)
    }
  },
  R9: {
    pass: {
      head: {
        naming: { stage: 'naming', nameBlock: true, nameNote: WORDS.nameWaitNote },
        samples: [
          { nameBlock: true, nameNote: WORDS.nameWaitNote },
          { nameBlock: true, nameNote: WORDS.nameWaitNote },
          { nameBlock: false, nameNote: null }
        ],
        rectsNaming: { title: [0, 0, 300, 24], switchCard: [0, 56, 300, 50], tailscale: [1, 116, 298, 30], publish: [1, 148, 298, 30], pairHead: [1, 180, 298, 30] },
        rectsShowing: { title: [0, 0, 300, 24], switchCard: [0, 56, 300, 50], tailscale: [1, 116, 298, 30], publish: [1, 148, 298, 30], pairHead: [1, 180, 298, 30] },
        reached: true,
        pressList: ['switch', 'Allow'],
        progressKeys: ['answers', 'checks', 'nextAt', 'startedAt'],
        phoneB: { paired: true, blocked: 200 }
      },
      parent: { naming: { stage: 'naming', nameBlock: true, nameNote: null }, reached: true, firstPress: 'pair', progressKeys: ['answers', 'checks', 'nextAt', 'startedAt'] }
    },
    breaks: {
      'naming: the block and the wait note': (r) => void (r.head.naming.nameNote = null),
      'the note drawn exactly while the block is': (r) => void (r.head.samples[2].nameNote = WORDS.nameWaitNote),
      'the rectangles above the pair card unmoved': (r) => void (r.head.rectsShowing.publish[1] = 152),
      'the code by itself': (r) => void r.head.pressList.push('Pair'),
      'nameProgress keeps the parent’s members': (r) => void r.head.progressKeys.push('text'),
      'phone B scans and is allowed': (r) => void (r.head.phoneB.paired = false),
      'the parent: the same block, and the code after its Pair with the door off': (r) => void (r.parent.firstPress = 'switch')
    },
    refused: [
      { what: 'the note left after the block went', clause: 'the note drawn exactly while the block is', edit: (r) => void r.head.samples.push({ nameBlock: false, nameNote: WORDS.nameWaitNote }) },
      { what: 'the block with no note', clause: 'the note drawn exactly while the block is', edit: (r) => void r.head.samples.push({ nameBlock: true, nameNote: null }) },
      { what: 'too few samples to say', clause: 'the note drawn exactly while the block is', edit: (r) => void (r.head.samples = [{ nameBlock: true, nameNote: WORDS.nameWaitNote }]) },
      { what: 'a rectangle missing at one reading', clause: 'the rectangles above the pair card unmoved', edit: (r) => void delete r.head.rectsShowing.tailscale },
      { what: 'not the naming face', clause: 'naming: the block and the wait note', edit: (r) => void (r.head.naming.stage = 'ready') }
    ]
  },
  R10: {
    pass: {
      head: { rest: fxFace({ stage: 'start', steps: { pair: fxStep('pair', 'paired', { done: true }) }, actions: { pair: [fxBtn('pair', { primary: true })] } }), reached: true, confirmSeen: false, presses: 1 },
      parent: { reached: true, confirmSeen: false, presses: 1 }
    },
    breaks: {
      'step 3 done, Paired, Pair drawn with the door off': (r) => void (r.head.rest.actions = {}),
      'Pair gives a code after the start': (r) => void (r.head.reached = false),
      'no Allow asked, one press': (r) => void (r.head.confirmSeen = true),
      'the parent: Pair gives the same': (r) => void (r.parent.presses = 2)
    },
    refused: [{ what: 'two presses', clause: 'no Allow asked, one press', edit: (r) => void (r.head.presses = 2) }]
  },
  R11: {
    pass: {
      head: {
        returnReads: 1,
        changed: fxFace({ steps: { publish: fxStep('publish', 'changed', { state: 'Changed since you allowed it' }) }, confirm: fxConfirm() }),
        status: { confirmState: 'changed', confirmLines: [`Answers on the internet at https://${NAME}:8443, through Tailscale Funnel on ${MOVED}.`] },
        spawns: 0,
        doorProcesses: 0
      },
      parent: { returnReads: 0, afterPress: { confirmState: 'changed', allow: true } }
    },
    breaks: {
      'a return reads': (r) => void (r.head.returnReads = 0),
      'Changed since you allowed it, the new lines and Allow': (r) => void (r.head.status.confirmLines = LINES),
      'zero door forks and zero funnel spawns': (r) => void (r.head.spawns = 1),
      'the parent: no read on the return; its lines and Allow after a press': (r) => void (r.parent.returnReads = 1)
    },
    refused: [
      { what: 'a door process forked', clause: 'zero door forks and zero funnel spawns', edit: (r) => void (r.head.doorProcesses = 1) },
      { what: 'read as confirmed', clause: 'Changed since you allowed it, the new lines and Allow', edit: (r) => void (r.head.status.confirmState = 'confirmed') }
    ]
  },
  R12: {
    pass: {
      head: { launch: { confirmState: 'confirmed', tailscale: 'stopped' }, afterRemove: { confirmState: 'unconfirmed', phones: 0 }, returnCalls: 0, heard: 1, tryReads: 1 },
      parent: { returnCalls: 0, tryReads: 1 }
    },
    breaks: {
      'relaunched confirmed, Tailscale stopped': (r) => void (r.head.launch.tailscale = 'ready'),
      'Remove withdrew the agreement': (r) => void (r.head.afterRemove.confirmState = 'confirmed'),
      'Running, then a return: zero stand-in calls': (r) => void (r.head.returnCalls = 2),
      'Try again reads': (r) => void (r.head.tryReads = 0),
      'the parent: zero calls on the return, and Try again reads': (r) => void (r.parent.tryReads = 0)
    },
    refused: [{ what: 'a phone left after Remove', clause: 'Remove withdrew the agreement', edit: (r) => void (r.head.afterRemove.phones = 1) }]
  },
  R13: {
    pass: {
      head: {
        withUser: { line: `${MADE_UP_ACCOUNT} · ${TAILNET}`, done: true, account: MADE_UP_ACCOUNT, tailnet: TAILNET },
        noUser: { line: TAILNET, done: true, account: null, tailnet: TAILNET },
        same: { line: TAILNET, done: true, account: TAILNET, tailnet: TAILNET }
      },
      parent: { steps: false }
    },
    breaks: {
      'with the self user: the account and the tailnet': (r) => void (r.head.withUser.line = TAILNET),
      'with no User map: the tailnet alone': (r) => void (r.head.noUser.account = MADE_UP_ACCOUNT),
      'an account equal to the tailnet: drawn once': (r) => void (r.head.same.line = `${TAILNET} · ${TAILNET}`),
      'the parent draws no step 1': (r) => void (r.parent.steps = true)
    },
    refused: [{ what: 'the account drawn after the tailnet', clause: 'with the self user: the account and the tailnet', edit: (r) => void (r.head.withUser.line = `${TAILNET} · ${MADE_UP_ACCOUNT}`) }]
  },
  R14: {
    pass: { head: { k0: WORDS.publisher, k1: WORDS.publisher, keyKept: true }, parent: { k0: null, k1: null, keyKept: true } },
    breaks: {
      'the publisher line with no key': (r) => void (r.head.k0 = null),
      'with a key kept, still the publisher line': (r) => void (r.head.k1 = null),
      'the parent draws no such line': (r) => void (r.parent.k1 = WORDS.publisher)
    },
    refused: [{ what: 'the line in other words', clause: 'the publisher line with no key', edit: (r) => void (r.head.k0 = 'Only Tortie can send alerts.') }]
  },
  RT: {
    pass: { head: { moved: true, reads: [fxRead(100)] }, parent: { moved: true, reads: [] } },
    breaks: {
      'the window really went away and came back': (r) => void (r.head.moved = false),
      'one read after it at HEAD': (r) => void (r.head.reads = []),
      'none at the parent': (r) => void (r.parent.reads = [fxRead(100)])
    }
  },
  A1: {
    pass: { head: { calls: 0, heard: 1 }, parent: { calls: 0 } },
    breaks: { 'zero calls at HEAD, the return heard': (r) => void (r.head.calls = 1), 'zero calls at the parent': (r) => void (r.parent.calls = 1) },
    refused: [{ what: 'a return never heard', clause: 'zero calls at HEAD, the return heard', edit: (r) => void (r.head.heard = 0) }]
  },
  A3: {
    pass: {
      head: {
        returns: Array.from({ length: STORM.returns }, (_, i) => 1_000 + i * 55),
        reads: [
          { start: 1_010, end: 1_340, statusPid: 1, servePid: null, complete: false, ppid: 9 },
          { start: 1_400, end: 1_730, statusPid: 2, servePid: null, complete: false, ppid: 9 },
          { start: 1_790, end: 2_120, statusPid: 3, servePid: null, complete: false, ppid: 9 }
        ]
      },
      parent: { reads: [] }
    },
    breaks: {
      'twenty returns inside a second and a half': (r) => void r.head.returns.pop(),
      'at least one read': (r) => void (r.head.reads = []),
      'reads never overlap': (r) => void (r.head.reads[1].start = 1_300),
      'every read follows a return': (r) => void r.head.reads.unshift({ start: 500, end: 520, statusPid: 7, servePid: null, complete: false, ppid: 9 }),
      'a return during a read adds none': (r) => {
        // Twelve reads for twenty returns of which only three arrived outside a read.
        r.head.reads = Array.from({ length: 12 }, (_, i) => ({ start: 1_001 + i * 90, end: 1_090 + i * 90, statusPid: 10 + i, servePid: null, complete: false, ppid: 9 }));
      },
      'the parent: no read': (r) => void (r.parent.reads = [fxRead(1_000)])
    },
    refused: [{ what: 'the storm spread over three seconds', clause: 'twenty returns inside a second and a half', edit: (r) => void (r.head.returns = r.head.returns.map((t, i) => 1_000 + i * 160)) }]
  },
  A4: {
    pass: { head: { calls: 0, listening: true, heard: 1 }, parent: { calls: 0 } },
    breaks: { 'zero calls at HEAD, published, the return heard': (r) => void (r.head.calls = 2), 'zero calls at the parent': (r) => void (r.parent.calls = 2) },
    refused: [{ what: 'not published', clause: 'zero calls at HEAD, published, the return heard', edit: (r) => void (r.head.listening = false) }]
  },
  A5a: {
    pass: {
      head: { status: { funnel: { refused: 'port-taken' }, refusal: 'Tailscale on this Mac already uses port 8443 for something else.', confirmable: true }, port: 8443, shaBefore: 'a'.repeat(64), shaAfter: 'a'.repeat(64), spawns: 0, doorProcesses: 0 },
      parent: { calls: 0 }
    },
    breaks: {
      'port-taken, said with the port': (r) => void (r.head.status.funnel.refused = 'busy'),
      'pocket.json unchanged': (r) => void (r.head.shaAfter = 'b'.repeat(64)),
      'zero door forks and zero funnel spawns': (r) => void (r.head.spawns = 1),
      'the parent: zero calls on the return': (r) => void (r.parent.calls = 1)
    },
    refused: [
      { what: 'a store that could not be read', clause: 'pocket.json unchanged', edit: (r) => Object.assign(r.head, { shaBefore: null, shaAfter: null }) },
      { what: 'the sentence naming another port', clause: 'port-taken, said with the port', edit: (r) => void (r.head.port = 10000) }
    ]
  },
  A5b: {
    pass: {
      head: {
        status: { funnel: { refused: 'port-taken' }, refusal: 'Tailscale on this Mac already uses port 8443 for something else.', confirmable: false },
        face: fxFace({ text: 'Publish this Mac\nTailscale on this Mac already uses port 8443 for something else.\nTry again', actions: { 'retry-door': [fxBtn('retry-door')] } }),
        port: 8443,
        shaBefore: 'a'.repeat(64),
        shaAfter: 'a'.repeat(64),
        spawns: 0,
        doorProcesses: 0,
        afterTry: { port: 10000, allow: true }
      },
      parent: { calls: 0 }
    },
    breaks: {
      'port-taken kept as the read’s: not confirmable': (r) => void (r.head.status.confirmable = true),
      'no Allow in the section; its sentence and Try again': (r) => void (r.head.face.actions['confirm-door'] = [fxBtn('confirm-door')]),
      'pocket.json unchanged': (r) => void (r.head.shaAfter = 'c'.repeat(64)),
      'zero door forks and zero funnel spawns': (r) => void (r.head.doorProcesses = 1),
      'Try again chooses the other port and draws Allow': (r) => void (r.head.afterTry.port = 8443),
      'the parent: zero calls on the return': (r) => void (r.parent.calls = 3)
    },
    refused: [
      { what: 'no Try again drawn', clause: 'no Allow in the section; its sentence and Try again', edit: (r) => void (r.head.face.actions = {}) },
      { what: 'the sentence not drawn', clause: 'no Allow in the section; its sentence and Try again', edit: (r) => void (r.head.face.text = 'Publish this Mac') },
      { what: 'no Allow after Try again', clause: 'Try again chooses the other port and draws Allow', edit: (r) => void (r.head.afterTry.allow = false) }
    ]
  },
  A6: {
    pass: { head: { gapMs: 6, state: 'off', listening: false, liveFunnels: 0, spawns: 0 } },
    breaks: {
      'the off within 50 ms of the return': (r) => void (r.head.gapMs = 120),
      'the off wins: the door off, nothing published': (r) => void (r.head.state = 'listening'),
      'no funnel child alive, none spawned': (r) => void (r.head.liveFunnels = 1)
    },
    refused: [{ what: 'a spawn after the off', clause: 'no funnel child alive, none spawned', edit: (r) => void (r.head.spawns = 1) }]
  },
  A7: {
    pass: {
      head: { readStart: 1_000, readEnd: null, quitAt: 1_400, holdMs: A7_HOLD_MS, waitedMs: A7_HOLD_MS + TAILSCALE_DEADLINE_MS + 2_100, funnelsLeft: 0, electronLeft: 0, readPid: 4242, readPidAlive: false },
      parent: { funnelsLeft: 0, electronLeft: 0, readPidAlive: false }
    },
    breaks: {
      'the quit came while a return’s read was held': (r) => void (r.head.readEnd = 1_200),
      'counted after the hold, the deadline and two seconds': (r) => void (r.head.waitedMs = 4_000),
      'no funnel child left': (r) => void (r.head.funnelsLeft = 1),
      'no Electron of the run left': (r) => void (r.head.electronLeft = 1),
      'the read’s own process ended by itself': (r) => void (r.head.readPidAlive = true),
      'the parent’s press read at the quit ends the same': (r) => void (r.parent.electronLeft = 2)
    },
    refused: [
      { what: 'no read pid', clause: 'the read’s own process ended by itself', edit: (r) => void (r.head.readPid = 0) },
      { what: 'the quit before the read began', clause: 'the quit came while a return’s read was held', edit: (r) => void (r.head.quitAt = 900) }
    ]
  },
  A8: {
    pass: { head: ['shields-up', 'port-taken', 'busy', 'failed'].map((word) => ({ word, calls: 0 })), parent: ['shields-up', 'port-taken', 'busy', 'failed'].map((word) => ({ word, calls: 0 })) },
    breaks: {
      'the four refusals driven': (r) => void r.head.pop(),
      'zero calls after each at HEAD': (r) => void (r.head[0].calls = 1),
      'zero calls after each at the parent': (r) => void (r.parent[3].calls = 1)
    }
  },
  A9: {
    pass: {
      samples: [
        ...Array.from({ length: 20 }, () => ({ tailscale: 'ready', setupActions: [] })),
        ...Array.from({ length: 6 }, () => ({ tailscale: 'missing', setupActions: ['get-tailscale'] })),
        ...Array.from({ length: 6 }, () => ({ tailscale: 'stopped', setupActions: [] })),
        { tailscale: 'installed', setupActions: ['copy-admin-link'] }
      ]
    },
    breaks: {
      'open-tailscale never listed under the development override': (r) => void (r.samples[25].setupActions = ['open-tailscale']),
      'get-tailscale listed exactly while Tailscale is missing': (r) => void (r.samples[0].setupActions = ['get-tailscale']),
      'sampled across the run, missing among them': (r) => void (r.samples = r.samples.filter((s) => s.tailscale !== 'missing'))
    },
    refused: [{ what: 'missing with no Get Tailscale', clause: 'get-tailscale listed exactly while Tailscale is missing', edit: (r) => void (r.samples[20].setupActions = []) }]
  },
  A10: {
    pass: {
      head: {
        refused: 'not-approved',
        asksApproval: false,
        returns: [{ reads: 1, spawns: 1, calls: 3 }, { reads: 0, spawns: 0, calls: 0 }, { reads: 0, spawns: 0, calls: 0 }, { reads: 0, spawns: 0, calls: 0 }, { reads: 0, spawns: 0, calls: 0 }],
        afterTry: { reads: 1 }
      },
      parent: { returns: Array.from({ length: 5 }, () => ({ reads: 0, spawns: 0, calls: 0 })) }
    },
    breaks: {
      'the start refused not-approved with the capabilities present': (r) => void (r.head.asksApproval = true),
      'the first return: one read and one funnel spawn': (r) => void (r.head.returns[0].spawns = 0),
      'returns two to five: zero calls': (r) => void (r.head.returns[3].calls = 3),
      'Try again reads again': (r) => void (r.head.afterTry.reads = 0),
      'the parent: no return reads': (r) => void (r.parent.returns[0].calls = 1)
    },
    refused: [{ what: 'only four returns', clause: 'returns two to five: zero calls', edit: (r) => void r.head.returns.pop() }]
  },
  PRESSES: {
    pass: {
      rows: [
        { row: 'R1', parent: 4, head: 2 },
        { row: 'R2', parent: 4, head: 2 },
        { row: 'R3', parent: 4, head: 2 },
        { row: 'R4', parent: 2, head: 2 },
        { row: 'R5', parent: 2, head: 2 },
        { row: 'R6', parent: 4, head: 2 },
        { row: 'R7', parent: 3, head: 2 },
        { row: 'R8 port-taken', parent: 3, head: 2 },
        { row: 'R8 busy', parent: 3, head: 2 },
        { row: 'R8 failed', parent: 3, head: 3, phoneAtStart: true },
        { row: 'R9', parent: 2, head: 2 },
        { row: 'R10', parent: 1, head: 1, phoneAtStart: true }
      ].map((x) => ({ phoneAtStart: false, parentReached: true, headReached: true, ...x }))
    },
    breaks: {
      'every row counted to the code at both builds': (r) => void (r.rows[3].headReached = false),
      'HEAD no higher in any row': (r) => void (r.rows[10].head = 3),
      'lower in R1, R2, R3 and R6': (r) => void (r.rows[5].head = 4),
      'R7 and R8: lower with no phone paired, equal with one': (r) => void (r.rows[6].head = 3),
      'equal in R4, R5, R9 and R10': (r) => void (r.rows[4].head = 1)
    },
    refused: [
      { what: 'a paired row that came in lower than the parent', clause: 'R7 and R8: lower with no phone paired, equal with one', edit: (r) => void (r.rows[9].head = 2) },
      { what: 'a row missing from the table', clause: 'every row counted to the code at both builds', edit: (r) => void r.rows.splice(0, 1) },
      { what: 'a count that is not a number', clause: 'every row counted to the code at both builds', edit: (r) => void (r.rows[1].parent = null) }
    ]
  },
  RUN: {
    pass: {
      tailscalePreflights: Array.from({ length: 7 }, () => true),
      dnsPreflights: Array.from({ length: 7 }, () => true),
      agentsPrecheck: Array.from({ length: 7 }, () => true),
      agentsScan: Array.from({ length: 7 }, () => true),
      realTailscale: 0,
      samples: 2_400,
      forbidden: 0,
      refusedArgv: 0,
      udpLeaks: 0,
      udpSamples: 1_200,
      totalQuestions: 40,
      questionProblems: [],
      setupPresses: 0,
      apnsRequests: 0,
      apnsConnections: { development: 0, production: 0 },
      keyFileGone: true,
      standinLeft: 0,
      dnsClosed: true,
      apnsClosed: true,
      electronLeft: 0,
      phoneProcesses: 0
    },
    breaks: {
      'the Tailscale preflight before every launch': (r) => void (r.tailscalePreflights[3] = false),
      'the DNS preflight before every launch, loopback alone': (r) => void r.dnsPreflights.splice(0, 2),
      'the hidden agents resolve nowhere': (r) => void (r.agentsScan[0] = false),
      'no real Tailscale': (r) => void (r.realTailscale = 1),
      'no forbidden argv': (r) => void (r.forbidden = 1),
      'UDP to 127.0.0.1 alone': (r) => void (r.udpLeaks = 1),
      'every DNS question an A, RD 0, for the name': (r) => void r.questionProblems.push('an AAAA question'),
      'no setup press, and setupAction never called': (r) => void (r.setupPresses = 1),
      'nothing reached Apple’s stand-in': (r) => void (r.apnsConnections.production = 1),
      'the key file is gone': (r) => void (r.keyFileGone = false),
      'every stand-in ended': (r) => void (r.standinLeft = 1),
      'no Electron left': (r) => void (r.electronLeft = 1),
      'no node phone left': (r) => void (r.phoneProcesses = 1)
    },
    refused: [
      { what: 'a sampler that never sampled', clause: 'no real Tailscale', edit: (r) => void (r.samples = 0) },
      { what: 'no DNS question at all', clause: 'every DNS question an A, RD 0, for the name', edit: (r) => void (r.totalQuestions = 0) },
      { what: 'a refused argv', clause: 'no forbidden argv', edit: (r) => void (r.refusedArgv = 1) }
    ]
  }
};

// ---------------------------------------------------------------------------
// The self-test: every grader, and the pure readers the graders stand on.
// ---------------------------------------------------------------------------

function graderSelfTest() {
  let failures = 0;
  let checks = 0;
  const say = (ok, text) => {
    checks += 1;
    if (!ok) failures += 1;
    process.stdout.write(`${ok ? 'ok  ' : 'FAIL'} ${text}\n`);
  };
  const clauses = gradeFixtures({ graders: GRADERS, fixtures: GRADER_FIXTURES, grade, clone: (pass) => structuredClone(pass), say, J });

  // The stand-in log reader, over lines the stand-in writes (its `logLine`).
  const line = (kind, at, pid, extra = {}) => ({ at, pid, ppid: 77, kind, ...extra });
  const log = [
    line('status', 1_000, 11),
    line('serve-status', 1_040, 12),
    line('status', 2_000, 13),
    line('held', 2_300, 13, { of: 'status' }),
    line('serve-status', 2_330, 14),
    line('held', 2_640, 14, { of: 'serve-status' }),
    line('status', 3_000, 15),
    line('serve-status', 6_000, 16),
    line('funnel', 6_100, 17, { role: 'child' }),
    line('funnel', 6_200, 18, { role: 'decoy' }),
    line('exit', 6_300, 17)
  ];
  const reads = readsOf(log);
  say(reads.length === 3 && reads[0].complete && reads[0].end === 1_040, `readsOf closes a read with its serve status (${J(reads[0])})`);
  say(reads[1].complete && reads[1].end === 2_640 && reads[1].start === 2_000, `readsOf ends a held read at its last held line (${J(reads[1])})`);
  say(reads[2].complete === false && reads[2].end === 3_000, `readsOf never takes a lone serve status three seconds later for a read's half (${J(reads[2])})`);
  say(callsOf(log).length === 8, `callsOf counts every call and no held or exit line (${String(callsOf(log).length)})`);
  say(funnelSpawnsOf(log).length === 1, 'funnelSpawnsOf leaves the decoy out');
  say(overlapsOf([fxRead(0), { start: 50, end: 70 }]).length === 1 && overlapsOf([fxRead(0), { start: 61, end: 70 }]).length === 0, 'overlapsOf finds a read that began before the last one ended, and only that');
  say(J(returnsOutsideReads([5, 20, 100], [{ start: 10, end: 30 }])) === J([5, 100]), 'returnsOutsideReads leaves out a return inside a read');
  const paired = attribute([{ start: 150 }, { start: 50 }, { start: 400 }], [{ kind: 'return', at: 100 }, { kind: 'press', at: 300 }]);
  say(paired[0].cause?.kind === 'return' && paired[1].cause === null && paired[2].cause?.kind === 'press', `attribute pairs a read with the cause before it, and none with nothing before it (${J(paired.map((x) => x.cause?.kind ?? null))})`);

  // The recorder's verdict.
  say(isUncausedReturn({ type: 'focus', target: 'window', caused: false }), 'a focus the probe did not cause is a return it did not cause');
  say(!isUncausedReturn({ type: 'focus', target: 'window', caused: true }), 'a focus the probe dispatched is its own');
  say(!isUncausedReturn({ type: 'visibilitychange', visibility: 'hidden', caused: false }), 'going hidden is no return');
  say(isUncausedReturn({ type: 'visibilitychange', visibility: 'visible', caused: false }), 'coming visible unasked is a return the probe did not cause');
  say(!isUncausedReturn({ type: 'focus', target: 'other', caused: false }), 'an element’s own focus is no return');

  // The words the probe spells, as SPEC D14 writes them.
  say(WORDS.publisher === 'Only Tortie’s publisher can send alerts for now.' && WORDS.approveButton === 'Approve in Tailscale' && WORDS.nameWaitNote.startsWith('This can take several minutes.'), 'the words are SPEC D14’s');
  say(J(NEVER_PRESSED) === J(['get-tailscale', 'open-tailscale', 'open-approval', 'copy-link']), 'the four hooks it never presses');
  say(sameRect([0, 0, 10, 10], [0.4, 0, 10, 10.5]) && !sameRect([0, 0, 10, 10], [0, 0.6, 10, 10]), 'sameRect allows half a pixel and no more');

  process.stdout.write(
    failures === 0
      ? `[p3331] grader self-test PASS: ${String(Object.keys(GRADERS).length)} graders, ${String(clauses)} clauses, each shown to go red on its own break; ${String(checks)} checks.\n`
      : `[p3331] grader self-test FAIL: ${String(failures)} of ${String(checks)}.\n`
  );
  return failures === 0;
}

if (process.argv.includes('--grader-self-test')) {
  process.exit(graderSelfTest() ? 0 : 1);
}

// ===========================================================================
// THE RUN. Everything below starts processes; builders never reach it.
// ===========================================================================

const TAG = '[p3331]';
const say = (line) => console.log(`${TAG} ${line}`);
class Unreadable extends Error {}

const PARENT_RAW = (process.env['P3331_PARENT_CHECKOUT'] ?? '').trim();
if (PARENT_RAW === '') {
  console.error(`${TAG} P3331_PARENT_CHECKOUT names no parent. The parent is required: a built checkout of cb8d52a6 (SPEC §7.5). Nothing was started.`);
  process.exit(2);
}
const PARENT = resolve(PARENT_RAW);
if (PARENT === ROOT) {
  console.error(`${TAG} P3331_PARENT_CHECKOUT is this checkout; the parent must be a checkout of cb8d52a6 of its own. Nothing was started.`);
  process.exit(2);
}
for (const [what, checkout] of [['the parent', PARENT], ['HEAD', ROOT]]) {
  if (!existsSync(join(checkout, 'out', 'main', 'index.js'))) {
    console.error(`${TAG} ${what} (${checkout}) has no build at out/main/index.js. Run npm run build there first. Nothing was started.`);
    process.exit(2);
  }
}
const KEEP = (process.env['P3331_KEEP'] ?? '') === '1';
const REAL_FOCUS = (process.env['P3331_REAL_FOCUS'] ?? '') === '1';

/** The two builds, the parent FIRST (SPEC §7.5): never two Electrons at once. */
const BUILDS = Object.freeze([
  Object.freeze({ name: 'parent', checkout: PARENT, atParent: true }),
  Object.freeze({ name: 'head', checkout: ROOT, atParent: false })
]);

const RUN = resolve((process.env['P3331_RUN'] ?? '').trim() || `/private/tmp/p3331-probe-${String(process.pid)}`);
if (!RUN.startsWith('/private/tmp/')) {
  console.error(`${TAG} the scratch world must be under /private/tmp; ${RUN} is not. Nothing was started.`);
  process.exit(2);
}
const HOME = join(RUN, 'home');
const HARNESS = join(RUN, 'harness');
/** Every profile INSIDE the harness directory: the alerts override refuses one outside it. */
const PROFILES = Object.freeze({ parentF: join(HARNESS, 'f-parent'), headF: join(HARNESS, 'f-head'), S: join(HARNESS, 's') });
/** OUTSIDE every profile, so the helper's profile sweep never takes the stand-in's children for the app's. */
const STANDIN_DIR = join(RUN, 'standin');
const ALERTS_DIR = join(HARNESS, 'alerts');
const KEY_FILE = join(ALERTS_DIR, `AuthKey_${KEY_ID}.p8`);
const ALERTS_JSON = join(ALERTS_DIR, 'alerts.json');
const SOCKET = `gmux-p3331-${String(process.pid)}`;
const OUT = join(ROOT, 'out', 'p3331');
const REDERIVE = join(RUN, 'rederive');
/** The phone app's topic, which Apple's stand-in accepts. */
const TOPIC = 'com.itavero.tortie.phone';

const report = { root: ROOT, parent: PARENT, startedAt: new Date().toISOString(), arms: [], readings: {}, presses: [], unreadableRows: {}, raw: {} };
let failures = 0;
let unreadable = 0;
function arm(id, reading) {
  const g = grade(id, reading);
  const said = g.ok ? GRADERS[id].title : `${GRADERS[id].title}; FAILED ${J(g.failed)}`;
  report.arms.push({ id, ok: g.ok, failed: g.failed, said });
  report.readings[id] = reading;
  if (!g.ok) failures += 1;
  say(`${g.ok ? 'PASS' : 'FAIL'} ${id}: ${said}`);
}
function cannotRead(id, why) {
  unreadable += 1;
  report.arms.push({ id, ok: null, said: why });
  say(`UNREADABLE ${id}: ${why}`);
}

// ---------------------------------------------------------------------------
// The world's guards and records
// ---------------------------------------------------------------------------

let standin = null;
let dns = null;
let apns = null;
let apnsClosed = false;
let watch = null;
let lastShim = 0;
let lastApp = 0;
let setupPresses = 0;
const tailscalePreflights = [];
const dnsPreflights = [];
const agentsPrecheck = [];
const agentsScan = [];
const launches = [];
/** Every press, return, launch, mount, quit, bridge call and scenario change. */
const timeline = [];
/** The ones a read can follow, for `attribute`. */
const causes = [];
/** pocket.json's sha256 and mtime, and pocket:status, after every event (the re-derivation's). */
const storeSeries = [];
const statusSeries = [];
/** HEAD's every status read, for A9. */
const samples = [];
/** Each build's row readings, by row. */
const rows = { parent: {}, head: {} };
/** The phones, by build: B on F, A on S (the parent's, carried to HEAD). */
const phones = { parent: { B: null }, head: { B: null } };
let phoneA = null;
let offerA = null;
const pemLines = [];

const udp = { samples: 0, leaks: [], seen: new Set() };
/** `a:1->b:2` to `b:2`, or null for a socket with no peer. */
const udpPeerOf = (name) => {
  const i = String(name).indexOf('->');
  return i < 0 ? null : String(name).slice(i + 2);
};
function udpOf(pid) {
  if (!(pid > 0)) return [];
  const r = spawnSync('/usr/sbin/lsof', ['-a', '-p', String(pid), '-iUDP', '-n', '-P', '-F', 'n'], { encoding: 'utf8', timeout: 10_000 });
  return (r.stdout ?? '').split('\n').filter((l) => l.startsWith('n')).map((l) => l.slice(1));
}
const loopbackPeer = (peer) => /^127\.0\.0\.1:\d+$/.test(String(peer));
function sampleUdp() {
  const pid = lastApp;
  if (!(pid > 0)) return;
  udp.samples += 1;
  for (const name of udpOf(pid)) {
    udp.seen.add(name.replace(/:(\d+|\*)(?=->|$)/g, ':*'));
    const peer = udpPeerOf(name);
    if (peer !== null && !loopbackPeer(peer)) udp.leaks.push({ at: Date.now(), name });
  }
}
const udpTimer = setInterval(sampleUdp, 2_000);
udpTimer.unref?.();

function stopIfLeaked() {
  if (udp.leaks.length > 0) throw new Error(`main sent UDP to something that is not 127.0.0.1: ${J(udp.leaks.slice(0, 3))}. The run stops here and the app is ended.`);
  const found = watch?.findings() ?? [];
  if (found.length > 0) throw new Error(`a real Tailscale was in the process table: ${J(found.slice(0, 2))}. The run stops here and the app is ended.`);
  const forbidden = (standin?.readLog() ?? []).filter((e) => e.forbidden === true);
  if (forbidden.length > 0) throw new Error(`a forbidden argv reached the stand-in: ${J(forbidden[0].argv ?? null)}. The run stops here and the app is ended.`);
}
async function waitFor(test, ms, every = 200) {
  const started = Date.now();
  for (;;) {
    stopIfLeaked();
    if (await test()) return true;
    if (Date.now() - started >= ms) return false;
    await sleep(every);
  }
}

function isAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 1) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return err?.code === 'EPERM';
  }
}
const commandOfPid = (pid) => (spawnSync('/bin/ps', ['-ww', '-p', String(pid), '-o', 'command='], { encoding: 'utf8' }).stdout ?? '').trim();
/** Every descendant of `root`, from one read of the table. */
function descendantsOf(root, table = processRows()) {
  const kids = new Map();
  for (const r of table) {
    if (!kids.has(r.ppid)) kids.set(r.ppid, []);
    kids.get(r.ppid).push(r);
  }
  const out = [];
  const stack = [root];
  while (stack.length > 0) {
    const p = stack.pop();
    for (const r of kids.get(p) ?? []) {
      out.push(r);
      stack.push(r.pid);
    }
  }
  return out;
}
/** Tortie's door process: Electron's spelling for a `utilityProcess` (probe:p330's). */
const doorProcessesOf = (appPid) => (appPid > 0 ? descendantsOf(appPid).filter((r) => r.command.includes('--utility-sub-type=node.mojom.NodeService')).length : 0);
/** The stand-in's Funnel children alive anywhere in the table. */
const funnelProcesses = () => processRows().filter((r) => r.command.includes('tailscale-standin.mjs') && / funnel /.test(` ${r.command} `));
/** CLAUDE.md's count, narrowed to this run's launches and profiles. */
function electronsOfRun() {
  const table = (spawnSync('/bin/ps', ['-Ao', 'pid=,ppid=,rss=,comm='], { encoding: 'utf8' }).stdout ?? '').split('\n');
  return table
    .filter((l) => /Electron|Tortie$|chrome_crashpad/.test(l) && !/defunct/.test(l))
    .filter((l) => {
      const [pid, ppid] = l.trim().split(/\s+/).map(Number);
      return launches.some((x) => [x.shim, x.app].filter((p) => p > 0).some((p) => pid === p || ppid === p)) || commandOfPid(pid).includes(HARNESS);
    });
}
/** The door-process count's highest reading over a window, sampled every 150 ms. */
function doorSampler(L) {
  let max = 0;
  const tick = () => {
    max = Math.max(max, doorProcessesOf(L.appPid()));
  };
  tick();
  const timer = setInterval(tick, 150);
  return {
    stop: () => {
      clearInterval(timer);
      tick();
      return max;
    }
  };
}
const storeFacts = (profile) => {
  const path = join(profile, 'gmux', 'pocket.json');
  try {
    const bytes = readFileSync(path);
    return { sha256: createHash('sha256').update(bytes).digest('hex'), mtimeMs: statSync(path).mtimeMs, size: bytes.length };
  } catch {
    return { sha256: null, mtimeMs: null, size: null };
  }
};
const fwdPort = () => standin.readFunnel()[0]?.forwarderPort ?? 0;
const mark = () => standin.readLog().length;
const since = (i) => standin.readLog().slice(i);

// ---------------------------------------------------------------------------
// The app, its main page, its Settings page and its main process
// ---------------------------------------------------------------------------

const INHERITED_CLAUDE = Object.fromEntries(Object.keys(process.env).filter((n) => /^(?:CLAUDECODE|CLAUDE_)/.test(n)).map((n) => [n, undefined]));

function devtoolsPort(profile) {
  try {
    return Number(readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0].trim());
  } catch {
    return 0;
  }
}
async function targets(profile) {
  const port = devtoolsPort(profile);
  if (!(port > 0)) return [];
  try {
    return await (await fetch(`http://127.0.0.1:${String(port)}/json/list`)).json();
  } catch {
    return [];
  }
}
async function attachMain(profile, timeoutMs = 150_000) {
  const started = Date.now();
  let why = 'no DevToolsActivePort yet';
  for (;;) {
    const picked = pickRendererTarget(await targets(profile));
    if (picked.target !== null) {
      const cdp = await wsConnect(picked.target.webSocketDebuggerUrl);
      await cdp.call('Runtime.enable');
      for (let i = 0; i < 200; i += 1) {
        if ((await cdpEval(cdp, 'window.gmux !== undefined && window.gmux.pocket !== undefined')) === true) return cdp;
        await sleep(300);
      }
      throw new Error('the app never armed window.gmux.pocket');
    }
    why = picked.why;
    if (Date.now() - started > timeoutMs) throw new Error(`no app window: ${why}`);
    await sleep(300);
  }
}
/** The Settings page on its Phone section. */
async function attachSettings(L, timeoutMs = 30_000) {
  await cdpEval(L.main, 'window.gmux.openSettings().then(() => true)');
  const started = Date.now();
  for (;;) {
    const t = (await targets(L.profile)).find((x) => x.type === 'page' && /\/renderer\/settings\/index\.html/.test(String(x.url)) && typeof x.webSocketDebuggerUrl === 'string');
    if (t !== undefined) {
      const cdp = await wsConnect(t.webSocketDebuggerUrl, { collect: ['Network.requestWillBeSent', 'Runtime.exceptionThrown'] });
      await cdp.call('Runtime.enable');
      await cdpEval(cdp, "(() => { location.hash = 'phone'; return true; })()");
      for (let i = 0; i < 100; i += 1) {
        if ((await cdpEval(cdp, `document.querySelector('section[aria-label="Phone"]') !== null`)) === true) return cdp;
        await sleep(200);
      }
      throw new Error('Settings opened and never drew the Phone section');
    }
    if (Date.now() - started > timeoutMs) throw new Error('no Settings window');
    await sleep(300);
  }
}
/** MAIN's node inspector, whose url the app printed because it started with `--inspect=0` (probe:p321's). */
async function mainInspector(L, timeoutMs = 30_000) {
  if (L.inspector !== null) return L.inspector;
  const started = Date.now();
  for (;;) {
    const m = /Debugger listening on (ws:\/\/127\.0\.0\.1:\d+\/[0-9a-f-]+)/i.exec(L.handle.text());
    if (m !== null) {
      try {
        L.inspector = await wsConnect(m[1]);
        return L.inspector;
      } catch {
        /* the port is printed a beat before the listener is up */
      }
    }
    if (Date.now() - started > timeoutMs) throw new Unreadable('the main process inspector never appeared');
    await sleep(300);
  }
}
/** One statement on the Settings window, in main. Never a page of his: this run's Settings window alone. */
async function onSettingsWindow(L, verb) {
  const insp = await mainInspector(L);
  const expression = `(async () => {
    const load = typeof require === 'function' ? require : process.mainModule.require.bind(process.mainModule);
    const { app, BrowserWindow } = load('electron');
    const w = BrowserWindow.getAllWindows().find((x) => !x.isDestroyed() && /\\/renderer\\/settings\\/index\\.html/.test(x.webContents.getURL()));
    if (w === undefined) return 'no settings window';
    void app;
    ${verb}
  })()`;
  const got = await insp.call('Runtime.evaluate', { expression, includeCommandLineAPI: true, returnByValue: true, awaitPromise: true });
  return String(got.result?.result?.value ?? J(got.error ?? got.result ?? null)).slice(0, 200);
}

async function pocketCall(L, method, arg) {
  const call = arg === undefined ? `window.gmux.pocket[${J(method)}]()` : `window.gmux.pocket[${J(method)}](${J(arg)})`;
  return JSON.parse(await cdpEval(L.main, `(async () => { try { const v = await ${call}; return JSON.stringify({ ok: true, value: v === undefined ? null : v }); } catch (e) { return JSON.stringify({ ok: false, error: String((e && e.message) || e) }); } })()`));
}
/** Main's status; HEAD's every read kept for A9. */
async function st(L) {
  const got = await pocketCall(L, 'status');
  const s = got.ok ? got.value : null;
  if (s !== null && !L.build.atParent) samples.push({ at: Date.now(), launch: L.label, tailscale: s.tailscale ?? null, setupActions: Array.isArray(s.setupActions) ? s.setupActions : [] });
  return s;
}
async function waitSt(L, test, ms, every = 250) {
  const started = Date.now();
  let last = null;
  for (;;) {
    stopIfLeaked();
    last = await st(L);
    if (last !== null && test(last)) return { ok: true, status: last, at: Date.now() };
    if (Date.now() - started >= ms) return { ok: false, status: last, at: Date.now() };
    await sleep(every);
  }
}
const linesReady = (s) =>
  s.confirmable === true && s.state !== 'opening' && s.publicName === NAME && s.confirmState !== 'confirmed' && Array.isArray(s.confirmLines) && s.confirmLines.some((l) => l.includes(`https://${NAME}:${String(s.publicPort)}`));
const refusedNow = (s) => s.state === 'refused' && typeof s.refusal === 'string' && s.refusal.length > 0;

// ---------------------------------------------------------------------------
// THE FACE READER: one evaluation of the Phone section, by its hooks
// ---------------------------------------------------------------------------

const FACE_READER = `(() => {
  const s = document.querySelector('section[aria-label="Phone"]');
  if (s === null) return JSON.stringify({ missing: true, steps: null, actions: {}, confirm: {}, approval: {}, text: '' });
  const txt = (e) => (e === null || e === undefined ? null : String(e.innerText ?? e.textContent ?? '').trim());
  const shut = (e) => { for (let p = e.parentElement; p !== null && p !== s; p = p.parentElement) if (p.tagName === 'DETAILS' && !p.open) return true; return false; };
  const btn = (b) => ({ action: b.getAttribute('data-phone-action'), text: txt(b), enabled: !b.disabled, quiet: b.classList.contains('set-inline-btn'), primary: b.classList.contains('btn-primary') });
  const stepOf = (el) => el === null ? null : ({
    id: el.getAttribute('data-phone-step'),
    stateKey: el.getAttribute('data-phone-step-state') || null,
    done: el.getAttribute('data-done') === 'true',
    current: el.getAttribute('data-current') === 'true',
    title: txt(el.querySelector('.phone-step-title')),
    state: txt(el.querySelector('.phone-step-state')),
    hover: el.querySelector('.phone-step-state') === null ? null : el.querySelector('.phone-step-state').getAttribute('title'),
    num: txt(el.querySelector('.phone-step-num')),
    check: el.querySelector('.phone-step-done') !== null,
    lines: [...el.querySelectorAll('.phone-step-body p.phone-line')].filter((p) => p.closest('details') === null).map(txt),
    buttons: [...el.querySelectorAll('.phone-step-body button')].filter((b) => !shut(b)).map(btn),
    disclosures: [...el.querySelectorAll('.phone-step-body details')].map((d) => ({ whatsThis: d.hasAttribute('data-phone-whats-this'), whatAllows: d.hasAttribute('data-phone-what-allows'), open: d.open })),
    body: txt(el.querySelector('.phone-step-body'))
  });
  const hasSteps = s.querySelector('[data-phone-step]') !== null;
  const steps = {};
  for (const id of ['tailscale', 'publish', 'pair']) steps[id] = stepOf(s.querySelector('[data-phone-step="' + id + '"]'));
  const confirm = s.querySelector('[data-phone-confirm]');
  const allow = confirm === null ? null : confirm.querySelector('[data-phone-action="confirm-door"]');
  const approval = s.querySelector('[data-phone-approval]');
  const open = s.querySelector('[data-phone-action="open-approval"]');
  const wa = s.querySelector('[data-phone-what-allows]');
  const stage = s.querySelector('[data-phone-stage]');
  const sw = [...s.querySelectorAll('button[role="switch"]')].find((x) => x.getAttribute('aria-label') === ${J(WORDS.doorLabel)});
  const actions = {};
  for (const b of s.querySelectorAll('button[data-phone-action]')) {
    if (shut(b)) continue;
    const a = b.getAttribute('data-phone-action');
    (actions[a] = actions[a] || []).push(btn(b));
  }
  return JSON.stringify({
    at: Date.now(),
    stage: stage === null ? null : stage.getAttribute('data-phone-stage'),
    steps: hasSteps ? steps : null,
    confirm: { drawn: confirm !== null, text: txt(confirm), inDetails: confirm !== null && confirm.closest('details') !== null, allow: allow !== null, allowEnabled: allow !== null && !allow.disabled, funnelRight: confirm !== null && confirm.querySelector('[data-phone-funnel-right]') !== null },
    approval: { drawn: approval !== null, text: txt(approval), openApproval: open === null ? null : btn(open), whatAllows: wa === null ? null : { open: wa.open === true }, funnelRightInApproval: approval !== null && approval.querySelector('[data-phone-funnel-right]') !== null, funnelRightAnywhere: s.querySelectorAll('[data-phone-funnel-right]').length },
    actions,
    links: s.querySelectorAll('a, [href]').length,
    nameBlock: s.querySelector('[data-phone-name]') !== null,
    nameNote: txt(s.querySelector('[data-phone-name-note]')),
    publisher: txt(s.querySelector('[data-phone-publisher]')),
    keyLine: txt(s.querySelector('[data-phone-key-line]')),
    switchOn: sw === undefined ? null : sw.getAttribute('aria-checked'),
    switchEnabled: sw !== undefined && !sw.disabled,
    doorLine: txt(s.querySelector('[data-phone-door-line]')),
    text: txt(s)
  });
})()`;
async function face(L) {
  return JSON.parse(await cdpEval(L.settings, FACE_READER, 20_000));
}
async function waitFace(L, test, ms, every = 250) {
  const started = Date.now();
  let last = null;
  for (;;) {
    stopIfLeaked();
    last = await face(L);
    if (test(last)) return { ok: true, face: last };
    if (Date.now() - started >= ms) return { ok: false, face: last };
    await sleep(every);
  }
}
/** R9's rectangles above the pair card, relative to the section, `[x, y, w, h]`. */
const RECTS_READER = `(() => {
  const s = document.querySelector('section[aria-label="Phone"]');
  if (s === null) return JSON.stringify(null);
  const b = s.getBoundingClientRect();
  const r = (e) => { if (e === null) return null; const x = e.getBoundingClientRect(); return [x.x - b.x, x.y - b.y, x.width, x.height].map((n) => Math.round(n * 100) / 100); };
  return JSON.stringify({
    title: r(s.querySelector('h1')),
    switchCard: r(s.querySelector('.set-card')),
    tailscale: r(s.querySelector('[data-phone-step="tailscale"]')),
    publish: r(s.querySelector('[data-phone-step="publish"]')),
    pairHead: r(s.querySelector('[data-phone-step="pair"] .phone-step-head'))
  });
})()`;
const rectsOf = async (L) => JSON.parse(await cdpEval(L.settings, RECTS_READER));

// ---------------------------------------------------------------------------
// THE RETURN RECORDER (§7.5.1), and the one return the probe dispatches
// ---------------------------------------------------------------------------

const RECORDER = `(() => {
  if (window.__p3331Rec !== undefined) return 'kept';
  const rec = { events: [], causing: 0, expectReal: false };
  const note = (type, e) => rec.events.push({
    type,
    trusted: e.isTrusted === true,
    target: e.target === window ? 'window' : e.target === document ? 'document' : 'other',
    visibility: document.visibilityState,
    focused: document.hasFocus(),
    mono: performance.now(),
    origin: performance.timeOrigin,
    wall: Date.now(),
    caused: rec.causing > 0 || rec.expectReal === true
  });
  window.addEventListener('focus', (e) => note('focus', e));
  document.addEventListener('visibilitychange', (e) => note('visibilitychange', e));
  window.__p3331Rec = rec;
  return 'installed';
})()`;
/** The helper's own trigger, a synthetic focus on the window, marked the probe's while it is dispatched. */
const DISPATCH_FOCUS = `(() => { const r = window.__p3331Rec; if (r !== undefined) r.causing += 1; try { window.dispatchEvent(new Event('focus')); } finally { if (r !== undefined) r.causing -= 1; } return true; })()`;
const recCount = async (L) => Number(await cdpEval(L.settings, '(window.__p3331Rec === undefined ? 0 : window.__p3331Rec.events.length)'));
const recSince = async (L, from) => JSON.parse(await cdpEval(L.settings, `JSON.stringify(window.__p3331Rec === undefined ? [] : window.__p3331Rec.events.slice(${String(from)}))`));
const heardOwn = (events) => events.filter((e) => e.type === 'focus' && e.caused === true).length;

/** Record one event; a cause for `attribute` when a read can follow it; the store and the status after it. */
async function event(L, kind, what, { snapshot = true, at = Date.now() } = {}) {
  const e = { build: L?.build.name ?? null, launch: L?.label ?? null, kind, what, at, mono: performance.now() };
  timeline.push(e);
  if (['press', 'return', 'real-return', 'launch', 'mount', 'bridge'].includes(kind)) causes.push(e);
  if (snapshot && L !== null && L !== undefined) {
    storeSeries.push({ event: timeline.length - 1, at: Date.now(), ...storeFacts(L.profile) });
    const s = await st(L).catch(() => null);
    statusSeries.push({ event: timeline.length - 1, at: Date.now(), status: s });
  }
  return e;
}
async function returnOnce(L, { snapshot = true } = {}) {
  const at = Date.now();
  await cdpEval(L.settings, DISPATCH_FOCUS);
  return event(L, 'return', 'focus', { snapshot, at });
}
function setScenario(L, next, { merge = true } = {}) {
  standin.setScenario(next, { merge });
  timeline.push({ build: L?.build.name ?? null, launch: L?.label ?? null, kind: 'scenario', what: J(merge ? next : { replace: next }), at: Date.now(), mono: performance.now() });
}
function work(L, what) {
  timeline.push({ build: L?.build.name ?? null, launch: L?.label ?? null, kind: 'work', what, at: Date.now(), mono: performance.now() });
}
async function bridge(L, method, arg) {
  const got = await pocketCall(L, method, arg);
  await event(L, 'bridge', method, { snapshot: false });
  return got;
}

// ---------------------------------------------------------------------------
// The presses: the sheet's own buttons, by their hooks. Counted unless setup.
// ---------------------------------------------------------------------------

const PRESS_NAMES = Object.freeze({ 'confirm-door': 'Allow', 'retry-door': 'Try again', pair: 'Pair' });
async function pressHook(L, action, { count = true, scope = null } = {}) {
  if (NEVER_PRESSED.includes(action)) {
    setupPresses += 1;
    throw new Error(`the probe refuses to press ${action} (SPEC D35)`);
  }
  const root = scope === null ? 's' : `s.querySelector(${J(scope)})`;
  const ok =
    (await cdpEval(
      L.settings,
      `(() => { const s = document.querySelector('section[aria-label="Phone"]'); if (s === null) return false; const root = ${root}; if (root === null) return false; const shut = (e) => { for (let p = e.parentElement; p !== null; p = p.parentElement) if (p.tagName === 'DETAILS' && !p.open) return true; return false; }; const b = [...root.querySelectorAll('button[data-phone-action=${J(action)}]')].find((x) => !x.disabled && !shut(x)); if (b === undefined) return false; b.click(); return true; })()`
    )) === true;
  if (ok && count) L.presses.push(PRESS_NAMES[action] ?? action);
  if (ok) await event(L, 'press', action);
  return ok;
}
async function pressSwitch(L, on) {
  const ok =
    (await cdpEval(
      L.settings,
      `(() => { const s = document.querySelector('section[aria-label="Phone"]'); if (s === null) return false; const b = [...s.querySelectorAll('button[role="switch"]')].find((x) => x.getAttribute('aria-label') === ${J(WORDS.doorLabel)} && x.getAttribute('aria-checked') === ${J(on ? 'false' : 'true')} && !x.disabled); if (b === undefined) return false; b.click(); return true; })()`
    )) === true;
  if (ok) {
    L.presses.push('switch');
    await event(L, 'press', on ? 'switch on' : 'switch off');
  }
  return ok;
}
/**
 * A first setup's press from rest, the FEWEST at each build: Pair where the
 * sheet draws it with the door off (the parent always; HEAD with a phone
 * paired), which carries the wish through Allow, else the switch, whose on
 * press asks for the code at HEAD (D17).
 */
async function firstPress(L) {
  const rest = await waitFace(L, (x) => x.stage === 'start' && x.switchEnabled === true && x.switchOn === 'false', 20_000);
  if (!rest.ok) throw new Unreadable('the sheet never came to rest with the door off');
  if ((rest.face.actions.pair ?? []).some((b) => b.enabled)) {
    if (await pressHook(L, 'pair')) return 'pair';
  }
  if (await pressSwitch(L, true)) return 'switch';
  throw new Unreadable('neither Pair nor the switch could be pressed at rest');
}
/** Allow, once main's lines are ready and the sheet's Allow can be pressed. */
async function allowWhenReady(L, ms = 30_000) {
  const ready = await waitSt(L, linesReady, ms);
  if (!ready.ok) return false;
  if (!(await waitFor(async () => (await face(L)).confirm.allowEnabled === true, 10_000))) return false;
  return pressHook(L, 'confirm-door');
}
/**
 * On to the code, the way a person goes at each build's fewest: Allow when
 * the lines are drawn, and Pair only once the code has not come by itself
 * within ten seconds of the door answering with its name confirmed.
 */
async function toCode(L, { maxMs = 150_000, graceMs = 10_000 } = {}) {
  const started = Date.now();
  let readySince = null;
  for (;;) {
    stopIfLeaked();
    const f = await face(L);
    if (f.stage === 'showing') return { reached: true };
    const s = await st(L);
    if (s !== null && f.confirm.allowEnabled === true && linesReady(s)) {
      await pressHook(L, 'confirm-door');
      readySince = null;
      await sleep(500);
      continue;
    }
    if (f.stage === 'ready') {
      readySince ??= Date.now();
      if (Date.now() - readySince >= graceMs && (f.actions.pair ?? []).some((b) => b.enabled)) {
        await pressHook(L, 'pair');
        readySince = null;
      }
    } else readySince = null;
    if (Date.now() - started > maxMs) return { reached: false, stage: f.stage, state: s?.state ?? null };
    await sleep(300);
  }
}
async function cancelCode(L) {
  const f = await face(L);
  if (f.stage === 'showing' || f.stage === 'match') await bridge(L, 'cancelPairing');
}
/** The press with the Phone section's own Allow on a presented phone, else the bridge's. */
async function allowPhone(L) {
  const v = await pocketCall(L, 'pairingState');
  if (v.ok && v.value?.state === 'presented') {
    if (!(await pressHook(L, 'allow-phone', { count: false }))) await pocketCall(L, 'allowPhone', { linesRead: v.value.lines, hashRead: v.value.hash });
  }
}

/** Until the stand-in has been quiet for `quietMs` and main is not mid-read, from log index `from`. */
async function settleCalls(L, from, { quietMs = 2_000, maxMs = 30_000, busyOk = false } = {}) {
  const started = Date.now();
  let lastLen = -1;
  let lastChange = Date.now();
  for (;;) {
    stopIfLeaked();
    const len = standin.readLog().length;
    if (len !== lastLen) {
      lastLen = len;
      lastChange = Date.now();
    }
    const s = await st(L);
    const f = s?.funnel?.state ?? 'idle';
    const busy = s === null || s.state === 'opening' || f === 'reading' || f === 'starting';
    if ((busyOk || !busy) && Date.now() - lastChange >= quietMs) return { ok: true, status: s, from };
    if (Date.now() - started > maxMs) return { ok: false, status: s, from };
    await sleep(200);
  }
}

/**
 * A row's start: the door off, with or without its agreement, the stand-in's
 * scenario whole, the approval file as asked, Tailscale present, the name
 * answering as asked, and no code on screen. Setup, never counted.
 */
async function startState(L, { forget = false, scenario = {}, approve = true, dnsMode = 'record' } = {}) {
  await cancelCode(L).catch(() => undefined);
  await bridge(L, 'setDoor', { on: false });
  await waitSt(L, (s) => s.state === 'off', 20_000);
  await waitFor(async () => funnelProcesses().length === 0, 10_000);
  if (forget) {
    await bridge(L, 'forgetDoor');
    await waitSt(L, (s) => s.confirmState !== 'confirmed', 10_000);
  }
  if (standin.absent()) standin.setAbsent(false);
  setScenario(L, { ...DEFAULT_SCENARIO, ...scenario }, { merge: false });
  if (approve) standin.approve();
  else standin.unapprove();
  dns.setMode(dnsMode);
  await sleep(300);
}

/** How long a launch's window must be quiet before the first arm, and the bounds on the wait (the fix round). */
const SETTLE = Object.freeze({ quietMs: 4_000, minMs: 2_000, maxMs: 30_000 });

/**
 * Wait for the Settings window to settle: visible, then SETTLE.quietMs with
 * no focus or visibility event the recorder heard, at least SETTLE.minMs and
 * at most SETTLE.maxMs. Answers what it saw; a window that never settled is
 * said, and the arms' own recorder still reads any return that follows.
 */
async function settleWindow(L) {
  const t0 = Date.now();
  let count = await recCount(L).catch(() => 0);
  let lastChange = t0;
  for (;;) {
    const now = Date.now();
    const visible = (await cdpEval(L.settings, 'document.visibilityState').catch(() => null)) === 'visible';
    const n = await recCount(L).catch(() => count);
    if (n !== count) {
      count = n;
      lastChange = now;
    }
    if (visible && now - t0 >= SETTLE.minMs && now - lastChange >= SETTLE.quietMs) return { settled: true, ms: now - t0, events: count };
    if (now - t0 >= SETTLE.maxMs) {
      say(`${L.build.name} ${L.label}: the window did not settle in ${String(SETTLE.maxMs)} ms (visible ${String(visible)}, ${String(count)} event(s))`);
      return { settled: false, ms: now - t0, events: count, visible };
    }
    await sleep(250);
  }
}

/**
 * One arm, run once more if a return the probe did not cause was heard, then
 * UNREADABLE (§7.5.1). An arm whose start cannot be made again (`rerun:
 * false`: R12's Remove, phone B's and S's pairings) runs ONCE (the fix round:
 * R12 run again after a stray return began unconfirmed with no phone and read
 * FAIL). An arm that counts no Tailscale call (`strayNoted`: the two
 * pairings) is not made unreadable by a stray return: the return is noted in
 * its reading instead.
 */
async function inArm(L, id, fn, { rerun = true, strayNoted = false } = {}) {
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const from = await recCount(L).catch(() => 0);
    const t0 = Date.now();
    let reading;
    try {
      reading = await fn(attempt);
    } catch (err) {
      const why = err instanceof Unreadable ? err.message : `it threw: ${String(err?.stack ?? err).slice(0, 600)}`;
      if (!(err instanceof Unreadable) && /real Tailscale|forbidden argv|UDP to something/.test(String(err?.message))) throw err;
      say(`${L.build.name} ${id}: ${why}`);
      return { unreadable: why };
    }
    const heard = await recSince(L, from).catch(() => []);
    const strays = heard.filter(isUncausedReturn);
    if (strays.length === 0) return reading;
    const where = `${String(strays.length)} return(s) the probe did not cause, the first ${String(strays[0].wall - t0)} ms into the arm`;
    if (strayNoted) {
      say(`${L.build.name} ${id}: heard ${where}; it counts no Tailscale call, so it is noted and kept`);
      return reading !== null && typeof reading === 'object' ? { ...reading, strayReturns: where } : reading;
    }
    if (attempt === 1 && rerun) {
      say(`${L.build.name} ${id}: heard ${where}; running it once more`);
      continue;
    }
    return { unreadable: `heard ${where}${rerun ? ', twice' : ''}; it cannot say which read was whose` };
  }
  return { unreadable: 'unreachable' };
}

// ---------------------------------------------------------------------------
// THE LAUNCH: the preflights, the hidden agents, the helper, the attach
// ---------------------------------------------------------------------------

function launchOptions(build, label, profile, alerts) {
  return {
    label: `p3331-${build.name}-${label}`,
    userDataDir: profile,
    cwd: build.checkout,
    tmuxSocket: SOCKET,
    // Chromium's occlusion and backgrounding OFF (probe:p3332's switches), so a
    // window his own windows pass over is never marked hidden: the return
    // recorder still hears any return that does happen. `--inspect=0` is RT's.
    args: ['--remote-debugging-port=0', '--use-mock-keychain', '--inspect=0', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding', '--disable-background-timer-throttling'],
    env: withoutDevRenderer({
      ...INHERITED_CLAUDE,
      HOME,
      ZDOTDIR: HOME,
      HISTFILE: '/dev/null',
      TERM_SESSION_ID: undefined,
      GMUX_TMUX_SOCKET: SOCKET,
      GMUX_PROBES: '1',
      GMUX_LOG_FILE: '1',
      GMUX_SPECSTORY_NO_CLOUD: '1',
      GMUX_CONFIG_ROOT: join(profile, 'gmux', 'config'),
      GMUX_HARNESS_DIR: HARNESS,
      // THE STAND-INS. A development build honours them and a packaged one
      // ignores them, which is why no packaged Tortie is ever launched here.
      GMUX_TAILSCALE_BIN: standin.binPath,
      [NAME_SERVERS_VAR]: dns.servers,
      ...(alerts ? { GMUX_HARNESS_ALERTS: ALERTS_DIR } : {})
    }),
    graceMs: 8_000,
    ceilingMs: 2_400_000
  };
}

async function launch(build, label, profile, { alerts = false } = {}, body) {
  mkdirSync(profile, { recursive: true });
  const pre = preflightStandin(standin, standin.binPath);
  tailscalePreflights.push(pre.ok);
  if (!pre.ok) throw new Error(`the Tailscale preflight refused ${build.name} ${label}: ${pre.problems.join('; ')}`);
  const value = launchOptions(build, label, profile, alerts).env[NAME_SERVERS_VAR];
  const p = await dns.preflight(value);
  dnsPreflights.push(p.ok && loopbackOnlyServers(value) && value === dns.servers);
  if (!p.ok) throw new Error(`the DNS preflight of ${String(value)} refused ${build.name} ${label}: ${p.problems.join('; ')}`);
  writeHiddenAgents(profile, 'p3331');
  const precheck = hiddenAgentsPrecheck({ checkout: build.checkout, prefix: 'p3331', home: HOME, userPath: process.env.PATH ?? '' });
  agentsPrecheck.push(precheck.ok);
  if (!precheck.ok) throw new Error(`the hidden-agents precheck refused ${build.name} ${label}: ${precheck.said}`);
  say(`${build.name} ${label}: launching on ${profile}`);
  return withElectron(launchOptions(build, label, profile, alerts), async (handle) => {
    lastShim = handle.pid;
    const rec = { build: build.name, label, shim: handle.pid, app: 0 };
    launches.push(rec);
    const appPid = () => {
      try {
        rec.app = handle.appPid() || rec.app;
      } catch {
        /* not up yet */
      }
      lastApp = rec.app;
      return rec.app;
    };
    const L = { build, label, profile, handle, main: null, settings: null, inspector: null, presses: [], startedAt: Date.now(), appPid };
    try {
      appPid();
      timeline.push({ build: build.name, launch: label, kind: 'launch', what: profile, at: L.startedAt, mono: performance.now() });
      causes.push(timeline.at(-1));
      L.main = await attachMain(profile);
      appPid();
      const scan = hiddenAgentsScanVerdict(JSON.parse(await cdpEval(L.main, AGENTS_LIST_EXPR)));
      agentsScan.push(scan.ok);
      if (!scan.ok) throw new Error(`agents:list: ${scan.said}`);
      L.settings = await attachSettings(L);
      // The mount: a section drawn with the window focused asks main once (D16).
      await event(L, 'mount', 'Phone section drawn', { snapshot: false });
      await cdpEval(L.settings, RECORDER);
      // The window settles before the first arm (the fix round): a launch's
      // own window shows itself and takes the focus as it comes up, and R0's
      // arm heard that 20 ms and 239 ms in (the 333.1 verifier, 2 of 2 runs).
      L.settle = await settleWindow(L);
      timeline.push({ build: build.name, launch: label, kind: 'settled', what: J(L.settle), at: Date.now(), mono: performance.now() });
      return await body(L);
    } finally {
      for (const c of [L.settings, L.inspector, L.main]) {
        try {
          c?.close();
        } catch {
          /* the app is gone */
        }
      }
      appPid();
      rec.text = handle.text().slice(-4_000);
      timeline.push({ build: build.name, launch: label, kind: 'launch-end', what: profile, at: Date.now(), mono: performance.now() });
    }
  });
}

// ---------------------------------------------------------------------------
// THE ROWS AND THE ATTACKS. Each returns its build's reading, or throws
// Unreadable with the reason; the same script runs at both builds.
// ---------------------------------------------------------------------------

const presses = (L, from, extra = {}) => ({ count: L.presses.length - from, list: L.presses.slice(from), ...extra });

/** A1: a return with the switch off. */
async function armA1(L) {
  await startState(L, {});
  const i = mark();
  const h = await recCount(L);
  await returnOnce(L);
  await sleep(2_500);
  return { calls: callsOf(since(i)).length, heard: heardOwn(await recSince(L, h)) };
}

/**
 * R4 and R9 in one drive: the profile's FIRST setup and FIRST publish, the
 * name not answering yet (`nx`), so the naming face is the one a stranger
 * sees. R4's block is read before Allow; R9's after it.
 */
async function rowR4R9(L) {
  await startState(L, { dnsMode: 'nx' });
  const from = L.presses.length;
  const first = await firstPress(L);
  const lines = await waitSt(L, linesReady, 30_000);
  if (!lines.ok) throw new Unreadable(`main never drew lines naming https://${NAME}: ${J({ state: lines.status?.state, refusal: lines.status?.refusal })}`);
  const ready = await waitFace(L, (f) => f.confirm.drawn === true && f.confirm.allowEnabled === true, 10_000);
  if (!ready.ok) throw new Unreadable('the confirm block never drew a pressable Allow');
  const R4 = { confirm: ready.face.confirm, lines: lines.status.confirmLines, hash: lines.status.confirmHash, program: standin.binPath, allowed: false };
  R4.allowed = await pressHook(L, 'confirm-door');
  const naming = await waitFace(L, (f) => f.stage === 'naming', 60_000);
  if (!naming.ok) throw new Unreadable(`the first publish never drew the naming face: stage ${J(naming.face?.stage)}`);
  const sampled = [];
  const take = (f) => sampled.push({ at: f.at, stage: f.stage, nameBlock: f.nameBlock, nameNote: f.nameNote });
  for (let k = 0; k < 8; k += 1) {
    take(await face(L));
    await sleep(500);
  }
  const rectsNaming = await rectsOf(L);
  const progressKeys = Object.keys((await st(L))?.nameProgress ?? {}).sort();
  dns.setMode('record');
  work(L, 'the name answers');
  let shown = false;
  const deadline = Date.now() + 150_000;
  while (Date.now() < deadline) {
    const f = await face(L);
    take(f);
    if (f.stage === 'showing') {
      shown = true;
      break;
    }
    if (f.stage === 'ready') break;
    await sleep(500);
  }
  const code = shown ? { reached: true } : await toCode(L);
  const rectsShowing = code.reached ? await rectsOf(L) : null;
  await cancelCode(L);
  return {
    R4,
    R9: {
      firstPress: first,
      naming: { stage: naming.face.stage, nameBlock: naming.face.nameBlock, nameNote: naming.face.nameNote },
      samples: sampled,
      rectsNaming,
      rectsShowing,
      progressKeys,
      reached: code.reached,
      pressList: L.presses.slice(from)
    },
    presses: presses(L, from, { reached: code.reached, phoneAtStart: false, work: ['the name answers'] })
  };
}

/** A4: a return while published. */
async function armA4(L) {
  let s = await st(L);
  if (s?.state !== 'listening') {
    await bridge(L, 'setDoor', { on: true });
    s = (await waitSt(L, (x) => x.state === 'listening', 45_000)).status;
  }
  if (s?.state !== 'listening') throw new Unreadable('the door never published for A4');
  const i = mark();
  const h = await recCount(L);
  await returnOnce(L);
  await sleep(2_500);
  return { calls: callsOf(since(i)).length, listening: (await st(L))?.state === 'listening', heard: heardOwn(await recSince(L, h)) };
}

/** R5 with A2: Funnel not approved, the approval WAITED for. */
async function rowR5(L) {
  await startState(L, { forget: true, scenario: { caps: false, approval: 'wait' }, approve: false });
  const from = L.presses.length;
  await firstPress(L);
  if (!(await allowWhenReady(L))) throw new Unreadable('the approval scenario never drew lines to Allow');
  const waiting = await waitSt(L, (s) => s.funnel?.state === 'approval', 30_000);
  if (!waiting.ok) throw new Unreadable(`the start never waited on approval: ${J(waiting.status?.funnel ?? null)}`);
  await sleep(700);
  const f = await face(L);
  // A2: a return during the wait.
  const child = funnelSpawnsOf(standin.readLog()).at(-1) ?? null;
  const i = mark();
  const h = await recCount(L);
  await returnOnce(L);
  await sleep(3_000);
  const A2 = { calls: callsOf(since(i)).length, heard: heardOwn(await recSince(L, h)), childPid: child?.pid ?? 0, childAlive: child !== null && isAlive(child.pid), listening: false };
  const before = L.presses.length;
  standin.approve();
  work(L, 'approved in Tailscale');
  const pub = await waitSt(L, (s) => s.state === 'listening', 45_000);
  A2.listening = pub.ok;
  const pressesAfterApprove = L.presses.length - before;
  const code = await toCode(L);
  await cancelCode(L);
  return {
    R5: { waiting: f, openPressed: false, openApproval: f.approval.openApproval !== null, listening: pub.ok, pressesAfterApprove, reached: code.reached, pressList: L.presses.slice(from) },
    A2,
    presses: presses(L, from, { reached: code.reached, phoneAtStart: false, work: ['approves in Tailscale'] })
  };
}

/** R6: Funnel not approved and the child gave up (not the admin). */
async function rowR6(L) {
  await startState(L, { forget: true, scenario: { caps: false, approval: 'exit0' }, approve: false });
  const from = L.presses.length;
  await firstPress(L);
  if (!(await allowWhenReady(L))) throw new Unreadable('the non-admin scenario never drew lines to Allow');
  const refused = await waitSt(L, refusedNow, 30_000);
  if (!refused.ok) throw new Unreadable(`the start never refused: ${J({ state: refused.status?.state, funnel: refused.status?.funnel })}`);
  await sleep(700);
  const admin = await face(L);
  const adminStatus = await st(L);
  const i = mark();
  const sampler = doorSampler(L);
  await returnOnce(L);
  await settleCalls(L, i, { quietMs: 2_000, maxMs: 20_000 });
  const before = { reads: readsOf(since(i)).length, spawns: funnelSpawnsOf(since(i)).length, doorProcesses: sampler.stop(), copyListed: ((await st(L))?.setupActions ?? []).includes('copy-admin-link') };
  standin.approve();
  work(L, 'the admin approves');
  const p0 = L.presses.length;
  const j = mark();
  await returnOnce(L);
  let after;
  if (!L.build.atParent) {
    const pub = await waitSt(L, (s) => s.state === 'listening', 45_000);
    after = { listening: pub.ok, presses: L.presses.length - p0, spawns: funnelSpawnsOf(since(j)).length };
  } else {
    await sleep(2_500);
    const returnCalls = callsOf(since(j)).length;
    await pressHook(L, 'retry-door');
    const pub = await waitSt(L, (s) => s.state === 'listening', 45_000);
    after = { listening: pub.ok, presses: L.presses.length - p0, returnCalls };
  }
  const code = await toCode(L);
  await cancelCode(L);
  const refusal = refused.status?.refusal ?? null;
  return {
    R6: {
      admin,
      adminStatus: { setupActions: adminStatus?.setupActions ?? [] },
      before,
      after,
      reached: code.reached,
      pressList: L.presses.slice(from),
      sentence: typeof refusal === 'string' && String(admin.text).includes(refusal),
      retry: anyRetry(admin),
      copyLink: drawn(admin, 'copy-link')
    },
    presses: presses(L, from, { reached: code.reached, phoneAtStart: false, work: ['the admin approves'] })
  };
}

/**
 * A first setup that waits on Tailscale (R1 not installed, R2 not running,
 * R3 signed out): the first press, the step's face, the person's work outside
 * Tortie, then a return (at HEAD it reads; at the parent it reads nothing and
 * Try again does), then on to the code. `steps` are the scenario changes, each
 * followed by one return.
 */
async function waitsOnTailscale(L, { scenario, absent = false, work: fixes, faceKey }) {
  await startState(L, { forget: true, scenario });
  const from = L.presses.length;
  const i0 = mark();
  if (absent) {
    standin.setAbsent(true);
    work(L, 'Tailscale is not installed');
  }
  await firstPress(L);
  const refused = await waitSt(L, refusedNow, 20_000);
  if (!refused.ok) throw new Unreadable(`the first press never settled into a refusal: ${J({ state: refused.status?.state })}`);
  await sleep(600);
  const waiting = await face(L);
  const status = await st(L);
  const absentCalls = absent ? callsOf(since(i0)).length : 0;
  const returns = [];
  let rt = null;
  for (const [n, fix] of fixes.entries()) {
    if (fix.absent === false) standin.setAbsent(false);
    if (fix.scenario !== undefined) setScenario(L, fix.scenario);
    work(L, fix.what);
    const i = mark();
    if (fix.real === true) {
      rt = await realReturn(L);
      if (!rt.moved) await returnOnce(L);
    } else await returnOnce(L);
    await settleCalls(L, i, { quietMs: 2_000, maxMs: 20_000 });
    returns.push({ reads: readsOf(since(i)), face: n < fixes.length - 1 ? await face(L) : null });
  }
  const last = returns.at(-1);
  let after = await face(L);
  if (!L.build.atParent) {
    const ready = await waitFace(L, (f) => f.confirm.allowEnabled === true, 10_000);
    after = ready.face;
  } else {
    await pressHook(L, 'retry-door');
  }
  const code = await toCode(L);
  await cancelCode(L);
  const refusal = refused.status?.refusal ?? null;
  const reading = {
    [faceKey]: waiting,
    status: { tailscale: status?.tailscale ?? null, setupActions: Array.isArray(status?.setupActions) ? status.setupActions : [], state: status?.state ?? null },
    absentCalls,
    reads: last.reads,
    after,
    reached: code.reached,
    pressList: L.presses.slice(from),
    sentence: typeof refusal === 'string' && String(waiting.text).includes(refusal),
    retry: anyRetry(waiting),
    returnReads: returns.reduce((n, r) => n + r.reads.length, 0)
  };
  return { reading, returns, rt, presses: presses(L, from, { reached: code.reached, phoneAtStart: false, work: fixes.map((f) => f.what) }) };
}

/**
 * RT (D33): the Settings window hidden and shown inactive from main, or with
 * P3331_REAL_FOCUS=1 blurred and focused, the recorder told the events are the
 * probe's while it moves the window.
 */
async function realReturn(L) {
  const seen = [];
  const vis = async () => String(await cdpEval(L.settings, REAL_FOCUS ? 'String(document.hasFocus())' : 'document.visibilityState'));
  try {
    await cdpEval(L.settings, '(() => { if (window.__p3331Rec !== undefined) window.__p3331Rec.expectReal = true; return true; })()');
    seen.push(await vis());
    const away = await onSettingsWindow(L, REAL_FOCUS ? "w.blur(); return 'blurred';" : "w.hide(); return 'hidden';");
    const gone = await waitFor(async () => {
      const v = await vis();
      if (seen.at(-1) !== v) seen.push(v);
      return v === (REAL_FOCUS ? 'false' : 'hidden');
    }, 4_000, 100);
    const at = Date.now();
    const back = await onSettingsWindow(L, REAL_FOCUS ? "app.focus({ steal: true }); w.focus(); return 'focused';" : "w.showInactive(); return 'shown inactive';");
    await event(L, 'real-return', REAL_FOCUS ? 'blur then focus' : 'hide then showInactive', { snapshot: false, at });
    const came = await waitFor(async () => {
      const v = await vis();
      if (seen.at(-1) !== v) seen.push(v);
      return v === (REAL_FOCUS ? 'true' : 'visible');
    }, 4_000, 100);
    await sleep(400);
    return { moved: gone && came, how: REAL_FOCUS ? 'blur, focus' : 'hide, showInactive', away, back, seen, at };
  } catch (err) {
    return { moved: false, how: 'refused', why: String(err?.message ?? err).slice(0, 200), seen };
  } finally {
    await cdpEval(L.settings, '(() => { if (window.__p3331Rec !== undefined) window.__p3331Rec.expectReal = false; return true; })()').catch(() => null);
  }
}

async function rowR1(L) {
  const r = await waitsOnTailscale(L, { scenario: {}, absent: true, faceKey: 'missing', work: [{ absent: false, what: 'installs Tailscale' }] });
  return { R1: r.reading, presses: r.presses };
}
async function rowR2(L) {
  const r = await waitsOnTailscale(L, { scenario: { backendState: 'Stopped' }, faceKey: 'stopped', work: [{ scenario: { backendState: 'Running' }, what: 'starts Tailscale', real: true }] });
  return { R2: r.reading, RT: { moved: r.rt?.moved === true, reads: r.rt?.moved === true ? r.reading.reads : [], how: r.rt?.how ?? null, seen: r.rt?.seen ?? [], why: r.rt?.why ?? null }, presses: r.presses };
}
async function rowR3(L) {
  const r = await waitsOnTailscale(L, {
    scenario: { backendState: 'NeedsLogin' },
    faceKey: 'signedOut',
    work: [
      { scenario: { backendState: 'NeedsMachineAuth' }, what: 'signs in, the machine not yet authorized' },
      { scenario: { backendState: 'Running' }, what: 'the machine authorized' }
    ]
  });
  return { R3: { ...r.reading, machineAuthReads: r.returns[0].reads, machineAuth: r.returns[0].face }, presses: r.presses };
}

/** R13: step 1's account under three answers, each read with the door on. */
async function rowR13(L) {
  const readUnder = async (scenario) => {
    await startState(L, { scenario });
    await bridge(L, 'setDoor', { on: true });
    await waitSt(L, (x) => x.state === 'listening' || linesReady(x) || refusedNow(x), 45_000);
    await sleep(700);
    const f = await face(L);
    const s = await st(L);
    return { line: stepOf(f, 'tailscale')?.state ?? null, done: stepOf(f, 'tailscale')?.done === true, account: s?.account ?? null, tailnet: s?.tailnet ?? null, steps: f.steps !== null };
  };
  const withUser = await readUnder({ selfUser: true });
  const noUser = await readUnder({ selfUser: false });
  const same = await readUnder({ selfUser: true, account: TAILNET });
  await startState(L, {});
  return { R13: { withUser, noUser, same, steps: withUser.steps || noUser.steps || same.steps } };
}

/** R7 and R8: a start Tailscale refuses, a return, the refusal cleared, Try again. */
async function rowRefusal(L, word) {
  await startState(L, { scenario: { refuse: word } });
  const phoneAtStart = ((await st(L))?.phones ?? []).length > 0;
  const from = L.presses.length;
  await firstPress(L);
  let got = await waitSt(L, (s) => refusedNow(s) || linesReady(s), 30_000);
  if (got.ok && linesReady(got.status)) {
    await allowWhenReady(L);
    got = await waitSt(L, refusedNow, 30_000);
  }
  if (!got.ok) throw new Unreadable(`the ${word} start never settled into a refusal: ${J({ state: got.status?.state, funnel: got.status?.funnel })}`);
  await sleep(700);
  const f = await face(L);
  const s = await st(L);
  const i = mark();
  const h = await recCount(L);
  await returnOnce(L);
  await sleep(3_000);
  const returnCalls = callsOf(since(i)).length;
  const heard = heardOwn(await recSince(L, h));
  setScenario(L, { refuse: null });
  work(L, `the ${word} refusal is cleared`);
  await pressHook(L, 'retry-door');
  const pub = await waitSt(L, (x) => x.state === 'listening', 45_000);
  const code = await toCode(L);
  await cancelCode(L);
  const refusal = s?.refusal ?? null;
  return {
    reading: {
      word,
      refusal,
      sentenceDrawn: typeof refusal === 'string' && String(f.text).includes(refusal),
      retry: anyRetry(f),
      listed: Array.isArray(s?.setupActions) ? s.setupActions : [],
      openDrawn: drawn(f, 'open-tailscale'),
      returnCalls,
      heard,
      publishedAfterTry: pub.ok
    },
    a8: { word, calls: returnCalls },
    presses: presses(L, from, { reached: code.reached, phoneAtStart, work: [`clears the ${word} refusal`] })
  };
}

/** A confirmed door switched on with Tailscale stopped: refused `not-running`, which a return re-checks. */
async function confirmedButStopped(L, extra = {}) {
  await startState(L, { scenario: { backendState: 'Stopped', ...extra } });
  await bridge(L, 'setDoor', { on: true });
  const got = await waitSt(L, refusedNow, 20_000);
  if (!got.ok) throw new Unreadable(`a confirmed door with Tailscale stopped never refused: ${J({ state: got.status?.state, confirmState: got.status?.confirmState })}`);
  // The premise of every arm that starts here (the fix round): CONFIRMED
  // fields. A door left `changed` by an arm before it is UNREADABLE here,
  // never a finding.
  if (got.status?.confirmState !== 'confirmed') throw new Unreadable(`the door was not confirmed when the arm began (${String(got.status?.confirmState ?? null)})`);
  await sleep(800);
  return got.status;
}

/** R11: the tailnet moves under the confirmed door while Tailscale was stopped. */
async function rowR11(L) {
  await confirmedButStopped(L);
  const n = standin.readLog().filter((e) => e.kind === 'status' && e.verdict === 'answered').length;
  setScenario(L, { backendState: 'Running', tailnetAfterReads: { n, name: MOVED } });
  work(L, 'Tailscale runs, on another tailnet');
  const i = mark();
  const sampler = doorSampler(L);
  await returnOnce(L);
  await settleCalls(L, i, { quietMs: 2_000, maxMs: 20_000 });
  const returnReads = readsOf(since(i)).length;
  let changed = null;
  let status = null;
  let afterPress = null;
  if (!L.build.atParent) {
    status = (await waitSt(L, (s) => s.confirmState === 'changed', 10_000)).status;
    changed = (await waitFace(L, (f) => f.confirm.allowEnabled === true, 10_000)).face;
  } else {
    await pressHook(L, 'retry-door', { count: false });
    const c = await waitSt(L, (s) => s.confirmState === 'changed', 20_000);
    const f = await waitFace(L, (x) => x.confirm.allowEnabled === true, 10_000);
    afterPress = { confirmState: c.status?.confirmState ?? null, allow: f.ok };
  }
  const spawns = funnelSpawnsOf(since(i)).length;
  const doorProcesses = sampler.stop();
  // Back to the tailnet the agreement names, and ONE press on it (the fix
  // round): the press's read writes the stored tailnet back, so the gate reads
  // `confirmed` again and the arms after this one begin on the door they
  // name. Without the press the store kept the moved tailnet: A3 and A5a began
  // `changed`, and A5b's store moved under its own read (the 333.1 verifier,
  // both builds, 2 of 2 runs). Setup, never counted.
  setScenario(L, { tailnetAfterReads: null });
  await startState(L, {});
  await bridge(L, 'setDoor', { on: true });
  const restored = await waitSt(L, (s) => s.confirmState === 'confirmed' && s.state === 'listening', 45_000);
  await startState(L, {});
  return { R11: { returnReads, changed, status: { confirmState: status?.confirmState ?? null, confirmLines: status?.confirmLines ?? [] }, spawns, doorProcesses, afterPress, restored: restored.ok } };
}

/** A3: twenty returns in a second over a held, failing read. */
async function armA3(L) {
  await confirmedButStopped(L);
  setScenario(L, { readDelayMs: STORM.holdMs });
  const i = mark();
  const returns = [];
  for (let k = 0; k < STORM.returns; k += 1) {
    returns.push(Date.now());
    await cdpEval(L.settings, DISPATCH_FOCUS);
    await sleep(STORM.everyMs);
  }
  for (const at of returns) {
    timeline.push({ build: L.build.name, launch: L.label, kind: 'return', what: 'focus (storm)', at, mono: null });
    causes.push(timeline.at(-1));
  }
  await settleCalls(L, i, { quietMs: 2_000, maxMs: 30_000 });
  const reads = readsOf(since(i));
  setScenario(L, { readDelayMs: 0 });
  return { returns, reads };
}

/** A5a: confirmed fields, the stored port held by another serve, a return. */
async function armA5a(L) {
  const s0 = await confirmedButStopped(L);
  const port = s0.publicPort;
  setScenario(L, { backendState: 'Running', servedPorts: [port] });
  work(L, `Tailscale runs, ${String(port)} held by another serve`);
  const shaBefore = storeFacts(L.profile).sha256;
  const i = mark();
  const sampler = doorSampler(L);
  await returnOnce(L, { snapshot: false });
  await settleCalls(L, i, { quietMs: 2_000, maxMs: 20_000 });
  const s = await st(L);
  const shaAfter = storeFacts(L.profile).sha256;
  const reading = { status: { funnel: { refused: s?.funnel?.refused ?? null }, refusal: s?.refusal ?? null, confirmable: s?.confirmable ?? null }, port, shaBefore, shaAfter, spawns: funnelSpawnsOf(since(i)).length, doorProcesses: sampler.stop(), calls: callsOf(since(i)).length };
  setScenario(L, { servedPorts: [] });
  return { A5a: reading };
}

/** A5b: the same on fields nobody allowed, pressed this run; then Try again and Allow. */
async function armA5b(L) {
  // Its premise (the fix round): the door the arms before it left is
  // confirmed, so the store's tailnet is the stand-in's and a read on this
  // arm has nothing of its own to write back. Begun on a moved tailnet (R11's,
  // before R11 put it back), `pocket.json unchanged` read the read's
  // legitimate rewrite as a finding: that is UNREADABLE, never a FAIL.
  const pre = await st(L);
  if (pre?.confirmState !== 'confirmed') throw new Unreadable(`A5b did not start on a confirmed door (${J({ confirmState: pre?.confirmState ?? null })}), so the store's tailnet may move under its read`);
  await startState(L, { forget: true, scenario: { backendState: 'Stopped' } });
  await bridge(L, 'setDoor', { on: true });
  const s0 = (await waitSt(L, refusedNow, 20_000)).status;
  await sleep(800);
  const port = s0?.publicPort ?? 0;
  if (!(port > 0)) throw new Unreadable('no stored port to hold');
  setScenario(L, { backendState: 'Running', servedPorts: [port] });
  work(L, `Tailscale runs, ${String(port)} held by another serve`);
  const shaBefore = storeFacts(L.profile).sha256;
  const i = mark();
  const sampler = doorSampler(L);
  await returnOnce(L, { snapshot: false });
  await settleCalls(L, i, { quietMs: 2_000, maxMs: 20_000 });
  const s = await st(L);
  const f = await face(L);
  const shaAfter = storeFacts(L.profile).sha256;
  const spawns = funnelSpawnsOf(since(i)).length;
  const doorProcesses = sampler.stop();
  const calls = callsOf(since(i)).length;
  await pressHook(L, 'retry-door', { count: false });
  const moved = await waitSt(L, (x) => linesReady(x) && x.publicPort !== port, 20_000);
  const allow = await waitFace(L, (x) => x.confirm.allowEnabled === true, 10_000);
  const afterTry = { port: moved.status?.publicPort ?? null, allow: allow.ok };
  // Agree to the moved port, so the rows after this read a confirmed door.
  if (allow.ok) await pressHook(L, 'confirm-door', { count: false });
  await waitSt(L, (x) => x.state === 'listening', 45_000);
  setScenario(L, { servedPorts: [] });
  return { A5b: { status: { funnel: { refused: s?.funnel?.refused ?? null }, refusal: s?.refusal ?? null, confirmable: s?.confirmable ?? null }, face: f, port, shaBefore, shaAfter, spawns, doorProcesses, calls, afterTry } };
}

/** A6: a return, then the switch off within 50 ms, over a held read. */
async function armA6(L) {
  await confirmedButStopped(L);
  setScenario(L, { backendState: 'Running', readDelayMs: 300 });
  const i = mark();
  const tReturn = Date.now();
  await cdpEval(L.settings, DISPATCH_FOCUS);
  const tOff = Date.now();
  const off = pocketCall(L, 'setDoor', { on: false });
  timeline.push({ build: L.build.name, launch: L.label, kind: 'return', what: 'focus', at: tReturn, mono: null });
  causes.push(timeline.at(-1));
  timeline.push({ build: L.build.name, launch: L.label, kind: 'bridge', what: 'setDoor off', at: tOff, mono: null });
  causes.push(timeline.at(-1));
  await off;
  await waitFor(async () => funnelProcesses().length === 0, 10_000);
  await sleep(2_000);
  const s = await st(L);
  setScenario(L, { readDelayMs: 0 });
  return { A6: { gapMs: tOff - tReturn, state: s?.state ?? null, listening: s?.state === 'listening', liveFunnels: funnelProcesses().length, spawns: funnelSpawnsOf(since(i)).length } };
}

/** A10: a start refused not-approved with Funnel's capabilities present, five returns, then Try again. */
async function armA10(L) {
  await startState(L, { scenario: { refuse: 'not-approved' } });
  await bridge(L, 'setDoor', { on: true });
  const first = await waitSt(L, refusedNow, 30_000);
  if (!first.ok) throw new Unreadable('the not-approved start never refused');
  await sleep(700);
  const t = mark();
  await pressHook(L, 'retry-door', { count: false });
  await settleCalls(L, t, { quietMs: 2_000, maxMs: 30_000 });
  const s0 = await st(L);
  const returns = [];
  for (let k = 0; k < 5; k += 1) {
    const i = mark();
    await returnOnce(L);
    await settleCalls(L, i, { quietMs: 2_500, maxMs: 30_000 });
    returns.push({ reads: readsOf(since(i)).length, spawns: funnelSpawnsOf(since(i)).length, calls: callsOf(since(i)).length });
  }
  const j = mark();
  await pressHook(L, 'retry-door', { count: false });
  await settleCalls(L, j, { quietMs: 2_500, maxMs: 30_000 });
  const afterTry = { reads: readsOf(since(j)).length };
  await startState(L, {});
  return { A10: { refused: s0?.funnel?.refused ?? null, asksApproval: s0?.funnel?.asksApproval ?? null, refusal: s0?.refusal ?? null, returns, afterTry } };
}

/** R9's last clause: phone B pairs on F, LAST, so no first-setup row had a phone paired. */
async function pairPhoneB(L) {
  await startState(L, {});
  await bridge(L, 'setDoor', { on: true });
  const pub = await waitSt(L, (s) => s.state === 'listening' && s.pairable === true, 90_000);
  if (!pub.ok) throw new Unreadable('the door never answered with its name for phone B');
  const offered = await bridge(L, 'beginPairing');
  const read = offered.ok ? readOffer(offered.value.payload) : { ok: false, why: offered.error };
  if (!read.ok) throw new Unreadable(`the code does not read the phone’s way: ${read.why}`);
  const phone = makePhone(`p3331 phone B (${L.build.name})`, read.offer.dx);
  const paired = await pairThrough(doorFrom(read.offer, fwdPort()), read.offer, phone, { tries: 30, everyMs: 500, between: () => allowPhone(L) });
  const blocked = paired.ok ? await signedGet(phone, doorFrom(read.offer, fwdPort()), '/v1/blocked') : { status: 0 };
  if (paired.ok) phones[L.build.name].B = phone;
  await waitSt(L, (s) => s.state === 'listening' && s.confirmState === 'confirmed', 30_000);
  return { phoneB: { paired: paired.ok, blocked: blocked.status, words: paired.words } };
}

/**
 * A7, L1's end: a confirmed door with Tailscale stopped, then running with
 * every read held 3 s; at HEAD a return starts the read, at the parent Try
 * again does (today's shape), and the app is quit while it is held.
 */
async function armA7(L) {
  await confirmedButStopped(L);
  setScenario(L, { backendState: 'Running', readDelayMs: A7_HOLD_MS });
  const i = mark();
  if (!L.build.atParent) await returnOnce(L, { snapshot: false });
  else await pressHook(L, 'retry-door', { count: false });
  const began = await waitFor(async () => since(i).some((e) => e.kind === 'status'), 10_000, 50);
  const line = since(i).find((e) => e.kind === 'status') ?? null;
  const quitAt = Date.now();
  timeline.push({ build: L.build.name, launch: L.label, kind: 'quit', what: 'during the read', at: quitAt, mono: performance.now() });
  await cdpEval(L.main, '(() => { try { window.gmux.quit(); } catch {} return true; })()', 10_000).catch(() => null);
  const code = await Promise.race([L.handle.exited, sleep(30_000).then(() => null)]);
  return { began, readStart: line?.at ?? 0, readPid: line?.pid ?? 0, quitAt, endAt: Date.now(), exitCode: code, holdMs: A7_HOLD_MS };
}
/** A7's count, at L2's start, after the hold, the Tailscale deadline and two seconds from L1's end. */
async function countAfterQuit(a7) {
  if (a7 === null || a7 === undefined || a7.unreadable !== undefined) return a7 ?? { unreadable: 'A7 never ran' };
  const until = a7.endAt + a7.holdMs + TAILSCALE_DEADLINE_MS + 2_000;
  if (Date.now() < until) await sleep(until - Date.now());
  const held = standin.readLog().find((e) => e.kind === 'held' && e.pid === a7.readPid) ?? null;
  return { ...a7, readEnd: held?.at ?? null, waitedMs: Date.now() - a7.endAt, funnelsLeft: funnelProcesses().length, electronLeft: electronsOfRun().length, readPidAlive: isAlive(a7.readPid) };
}

/** R12, L2: relaunched confirmed with Tailscale stopped; Remove; Tailscale running; a return; Try again. */
async function rowR12(L) {
  const at = await waitSt(L, refusedNow, 60_000);
  if (!at.ok) throw new Unreadable(`the relaunch never settled into a refusal: ${J({ state: at.status?.state })}`);
  await sleep(2_500);
  const s0 = await st(L);
  const phone = phones[L.build.name].B;
  if (phone === null) throw new Unreadable('phone B was never paired on F');
  // Its start is its premise (the fix round): confirmed with phone B paired.
  // Without it the arm reads UNREADABLE, never a finding about the build.
  if (s0?.confirmState !== 'confirmed' || !(s0?.phones ?? []).some((p) => p.id === phone.id)) {
    throw new Unreadable(`R12 did not start confirmed with phone B paired (${J({ confirmState: s0?.confirmState ?? null, phones: (s0?.phones ?? []).length })})`);
  }
  await bridge(L, 'removePhone', phone.id);
  const removed = await waitSt(L, (s) => s.confirmState !== 'confirmed' && s.phones.length === 0, 20_000);
  setScenario(L, { backendState: 'Running' });
  work(L, 'Tailscale runs');
  const i = mark();
  const h = await recCount(L);
  await returnOnce(L);
  await sleep(3_000);
  const returnCalls = callsOf(since(i)).length;
  const heard = heardOwn(await recSince(L, h));
  const j = mark();
  await pressHook(L, 'retry-door', { count: false });
  await settleCalls(L, j, { quietMs: 2_000, maxMs: 20_000 });
  return {
    R12: {
      launch: { confirmState: s0?.confirmState ?? null, tailscale: s0?.tailscale ?? null, refusal: s0?.refusal ?? null },
      afterRemove: { confirmState: removed.status?.confirmState ?? null, phones: removed.status?.phones?.length ?? -1 },
      returnCalls,
      heard,
      tryReads: readsOf(since(j)).length
    }
  };
}

/** L3a, the parent alone: S made the way a person makes it, and node phone A paired. */
async function makeS(L) {
  await startState(L, {});
  await firstPress(L);
  if (!(await allowWhenReady(L))) throw new Unreadable('S’s first setup never drew lines to Allow');
  const pub = await waitSt(L, (s) => s.state === 'listening' && s.pairable === true, 90_000);
  if (!pub.ok) throw new Unreadable('S never answered with its name');
  await waitFace(L, (f) => f.stage === 'showing', 30_000);
  await bridge(L, 'cancelPairing');
  const offered = await bridge(L, 'beginPairing');
  const read = offered.ok ? readOffer(offered.value.payload) : { ok: false, why: offered.error };
  if (!read.ok) throw new Unreadable(`S’s code does not read the phone’s way: ${read.why}`);
  const phone = makePhone('p3331 phone A', read.offer.dx);
  const paired = await pairThrough(doorFrom(read.offer, fwdPort()), read.offer, phone, { tries: 30, everyMs: 500, between: () => allowPhone(L) });
  if (!paired.ok) throw new Unreadable(`phone A did not pair on S: ${paired.why}`);
  phoneA = phone;
  offerA = read.offer;
  await waitSt(L, (s) => s.state === 'listening' && s.confirmState === 'confirmed' && s.phones.length === 1, 30_000);
  return { paired: true };
}

/** R0, HEAD's L3: the parent's S relaunched after the update. */
async function rowR0(L) {
  let confirmSeen = false;
  let up = null;
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    stopIfLeaked();
    const s = await st(L);
    const f = await face(L);
    if (f.confirm.drawn === true) confirmSeen = true;
    if (s?.state === 'listening' && stepIs(f, 'publish', 'published') && stepIs(f, 'pair', 'paired')) {
      up = s;
      break;
    }
    await sleep(300);
  }
  await sleep(1_000);
  const f = await face(L);
  const s = await st(L);
  const blocked = up !== null && phoneA !== null && offerA !== null ? await signedGet(phoneA, doorFrom(offerA, fwdPort()), '/v1/blocked') : { status: 0 };
  return { R0: { listening: up !== null && s?.state === 'listening', presses: L.presses.length, confirmState: s?.confirmState ?? null, hash: s?.confirmHash ?? null, confirmSeen, face: f, blocked: blocked.status } };
}

/** R10: the door off on S, then Pair. */
async function rowR10(L) {
  await bridge(L, 'setDoor', { on: false });
  await waitSt(L, (s) => s.state === 'off', 20_000);
  const rest = await waitFace(L, (f) => f.stage === 'start' && (f.actions.pair ?? []).some((b) => b.enabled), 15_000);
  if (!rest.ok) throw new Unreadable('S with the door off drew no Pair');
  const from = L.presses.length;
  await pressHook(L, 'pair');
  let confirmSeen = false;
  const reached = await waitFor(async () => {
    const f = await face(L);
    if (f.confirm.drawn === true) confirmSeen = true;
    return f.stage === 'showing';
  }, 90_000, 250);
  await cancelCode(L);
  return { R10: { rest: rest.face, reached, confirmSeen, presses: L.presses.length - from }, presses: presses(L, from, { reached, phoneAtStart: true, work: [] }) };
}

/** R14: the Alerts card, before and with a kept scratch key, then the key forgotten. */
async function rowR14(L) {
  const f0 = await face(L);
  if (!(await pressHook(L, 'choose-key', { count: false }))) throw new Unreadable('Choose… could not be pressed');
  const kept = await waitSt(L, (s) => s.pushKeyId === KEY_ID, 20_000);
  await waitFor(async () => (await face(L)).keyLine === `Key ${KEY_ID}`, 10_000);
  const f1 = await face(L);
  if (await pressHook(L, 'forget-key', { count: false })) await waitSt(L, (s) => s.pushKeyId === null, 20_000);
  return { R14: { k0: f0.publisher, k1: f1.publisher, keyKept: kept.ok, keyLine: f1.keyLine } };
}

// ---------------------------------------------------------------------------
// ONE BUILD: L1, the A7 count, L2, L3
// ---------------------------------------------------------------------------

async function runBuild(build) {
  const R = rows[build.name];
  const F = build.atParent ? PROFILES.parentF : PROFILES.headF;
  say(`=== ${build.name} (${build.checkout}) ===`);
  let a7 = null;
  await launch(build, 'L1', F, {}, async (L) => {
    R.A1 = await inArm(L, 'A1', () => armA1(L));
    // The profile's first publish: a rerun could not see it again.
    R.R4R9 = await inArm(L, 'R4 and R9', () => rowR4R9(L), { rerun: false });
    R.A4 = await inArm(L, 'A4', () => armA4(L));
    R.R5 = await inArm(L, 'R5 and A2', () => rowR5(L));
    R.R6 = await inArm(L, 'R6', () => rowR6(L));
    R.R1 = await inArm(L, 'R1', () => rowR1(L));
    R.R2 = await inArm(L, 'R2 and RT', () => rowR2(L));
    R.R3 = await inArm(L, 'R3', () => rowR3(L));
    R.R13 = await inArm(L, 'R13', () => rowR13(L));
    R.R7 = await inArm(L, 'R7', () => rowRefusal(L, 'shields-up'));
    R.R8 = [];
    for (const word of ['port-taken', 'busy', 'failed']) R.R8.push(await inArm(L, `R8 ${word}`, () => rowRefusal(L, word)));
    R.R11 = await inArm(L, 'R11', () => rowR11(L));
    R.A3 = await inArm(L, 'A3', () => armA3(L));
    R.A5a = await inArm(L, 'A5a', () => armA5a(L));
    R.A5b = await inArm(L, 'A5b', () => armA5b(L));
    R.A6 = await inArm(L, 'A6', () => armA6(L));
    R.A10 = await inArm(L, 'A10', () => armA10(L));
    // Never run twice (the fix round): a second pairing is a second phone.
    R.phoneB = await inArm(L, 'phone B', () => pairPhoneB(L), { rerun: false, strayNoted: true });
    // Not through inArm: a quit cannot be run twice.
    try {
      a7 = await armA7(L);
    } catch (err) {
      a7 = { unreadable: `it threw: ${String(err?.message ?? err).slice(0, 300)}` };
    }
  });
  R.A7 = await countAfterQuit(a7);
  // L2 starts confirmed with Tailscale stopped (D34).
  standin.setScenario({ ...DEFAULT_SCENARIO, backendState: 'Stopped' }, { merge: false });
  await launch(build, 'L2', F, {}, async (L) => {
    // ONCE (the fix round): its Remove cannot be undone, so a second run would
    // begin unconfirmed with no phone; a stray return makes it UNREADABLE.
    R.R12 = await inArm(L, 'R12', () => rowR12(L), { rerun: false });
  });
  standin.setScenario({ ...DEFAULT_SCENARIO }, { merge: false });
  if (build.atParent) {
    await launch(build, 'L3a', PROFILES.S, { alerts: true }, async (L) => {
      R.S = await inArm(L, 'S made', () => makeS(L), { rerun: false, strayNoted: true });
    });
    await launch(build, 'L3b', PROFILES.S, { alerts: true }, async (L) => {
      const pub = await waitSt(L, (s) => s.state === 'listening', 90_000);
      const s = await st(L);
      R.relaunch = { confirmed: pub.ok && s?.confirmState === 'confirmed', confirmState: s?.confirmState ?? null, hash: s?.confirmHash ?? null };
      R.R10 = await inArm(L, 'R10', () => rowR10(L));
      R.R14 = await inArm(L, 'R14', () => rowR14(L));
    });
  } else {
    await launch(build, 'L3', PROFILES.S, { alerts: true }, async (L) => {
      R.R0 = await inArm(L, 'R0', () => rowR0(L), { rerun: false });
      R.R10 = await inArm(L, 'R10', () => rowR10(L));
      R.R14 = await inArm(L, 'R14', () => rowR14(L));
    });
  }
}

// ---------------------------------------------------------------------------
// THE GRADES: HEAD beside the parent, row by row
// ---------------------------------------------------------------------------

function gradeRows() {
  const P = rows.parent;
  const H = rows.head;
  const why = (x) => (x === undefined || x === null ? 'never ran' : x.unreadable);
  const pair = (id, h, p, pick) => {
    if (h === undefined || h === null || h.unreadable !== undefined) return cannotRead(id, `HEAD: ${why(h)}`);
    if (p === undefined || p === null || p.unreadable !== undefined) return cannotRead(id, `the parent: ${why(p)}`);
    const head = pick(h);
    const parent = pick(p);
    if (head === undefined || parent === undefined) return cannotRead(id, 'a reading is missing a part');
    return arm(id, { head, parent });
  };
  // R0: HEAD's reading of the parent's set-up Mac. UNREADABLE, never a finding,
  // when the parent's own relaunch would not read confirmed (§7.5.1).
  if (P.relaunch === undefined || P.relaunch.confirmed !== true) cannotRead('R0', `the parent's own relaunch of S did not read confirmed (${J(P.relaunch ?? null)}), so HEAD's reading of it says nothing about this phase`);
  else if (H.R0 === undefined || H.R0.unreadable !== undefined) cannotRead('R0', `HEAD: ${why(H.R0)}`);
  else arm('R0', { head: H.R0.R0, parent: { confirmState: P.relaunch.confirmState, hash: P.relaunch.hash } });
  pair('R1', H.R1, P.R1, (x) => x.R1);
  pair('R2', H.R2, P.R2, (x) => x.R2);
  pair('RT', H.R2, P.R2, (x) => x.RT);
  pair('R3', H.R3, P.R3, (x) => x.R3);
  pair('R4', H.R4R9, P.R4R9, (x) => x.R4);
  pair('R5', H.R5, P.R5, (x) => x.R5);
  pair('A2', H.R5, P.R5, (x) => x.A2);
  pair('R6', H.R6, P.R6, (x) => x.R6);
  pair('R7', H.R7, P.R7, (x) => x.reading);
  const r8ok = [0, 1, 2].every((k) => H.R8?.[k]?.reading !== undefined && P.R8?.[k]?.reading !== undefined);
  if (!r8ok) cannotRead('R8', `a refusal was not read at one build: ${J([...(H.R8 ?? []), ...(P.R8 ?? [])].filter((x) => x?.unreadable !== undefined).map((x) => x.unreadable))}`);
  else arm('R8', { rows: [0, 1, 2].map((k) => ({ word: H.R8[k].reading.word, head: H.R8[k].reading, parent: P.R8[k].reading })) });
  if (H.R4R9?.R9 === undefined || P.R4R9?.R9 === undefined) cannotRead('R9', `the first publish was not read: ${J([why(H.R4R9), why(P.R4R9)])}`);
  else if (H.phoneB === undefined || H.phoneB.unreadable !== undefined) cannotRead('R9', `phone B: ${why(H.phoneB)}`);
  else arm('R9', { head: { ...H.R4R9.R9, phoneB: H.phoneB.phoneB }, parent: P.R4R9.R9 });
  pair('R10', H.R10, P.R10, (x) => x.R10);
  pair('R11', H.R11, P.R11, (x) => x.R11);
  pair('R12', H.R12, P.R12, (x) => x.R12);
  pair('R13', H.R13, P.R13, (x) => x.R13);
  pair('R14', H.R14, P.R14, (x) => x.R14);
  pair('A1', H.A1, P.A1, (x) => x);
  pair('A3', H.A3, P.A3, (x) => x);
  pair('A4', H.A4, P.A4, (x) => x);
  pair('A5a', H.A5a, P.A5a, (x) => x.A5a);
  pair('A5b', H.A5b, P.A5b, (x) => x.A5b);
  if (H.A6 === undefined || H.A6.unreadable !== undefined) cannotRead('A6', `HEAD: ${why(H.A6)}`);
  else arm('A6', { head: H.A6.A6, parent: P.A6?.A6 ?? null });
  pair('A7', H.A7, P.A7, (x) => x);
  const a8 = (R) => [R.R7, ...(R.R8 ?? [])].map((x) => x?.a8 ?? null);
  if ([...a8(H), ...a8(P)].some((x) => x === null)) cannotRead('A8', 'a refusal row was not read at one build');
  else arm('A8', { head: a8(H), parent: a8(P) });
  if (samples.length === 0) cannotRead('A9', 'HEAD read no status');
  else arm('A9', { samples });
  pair('A10', H.A10, P.A10, (x) => x.A10);
  // THE PRESSES TABLE (§7.5.3), printed whole with each build's path.
  const table = [
    ['R1', (R) => R.R1],
    ['R2', (R) => R.R2],
    ['R3', (R) => R.R3],
    ['R4', (R) => R.R4R9],
    ['R5', (R) => R.R5],
    ['R6', (R) => R.R6],
    ['R7', (R) => R.R7],
    ['R8 port-taken', (R) => R.R8?.[0]],
    ['R8 busy', (R) => R.R8?.[1]],
    ['R8 failed', (R) => R.R8?.[2]],
    ['R9', (R) => R.R4R9],
    ['R10', (R) => R.R10]
  ];
  const pressRows = [];
  for (const [row, pick] of table) {
    const h = pick(H)?.presses;
    const p = pick(P)?.presses;
    if (h === undefined || p === undefined) continue;
    pressRows.push({ row, parent: p.count, head: h.count, parentReached: p.reached === true, headReached: h.reached === true, phoneAtStart: h.phoneAtStart === true, parentPath: p.list, headPath: h.list, work: h.work ?? [] });
  }
  report.presses = pressRows;
  say('THE PRESSES TABLE, each row from its start to the code (the person’s work outside Tortie is listed, not counted):');
  for (const x of pressRows) say(`  ${x.row.padEnd(14)} parent ${String(x.parent)} [${x.parentPath.join(', ')}]  HEAD ${String(x.head)} [${x.headPath.join(', ')}]${x.work.length > 0 ? `  work: ${x.work.join('; ')}` : ''}${x.phoneAtStart ? '  (a phone paired)' : ''}`);
  if (pressRows.length < table.length) cannotRead('PRESSES', `${String(table.length - pressRows.length)} row(s) were not counted at one build`);
  else arm('PRESSES', { rows: pressRows });
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

try {
  rmSync(RUN, { recursive: true, force: true });
  for (const dir of [HOME, HARNESS, PROFILES.parentF, PROFILES.headF, PROFILES.S]) mkdirSync(dir, { recursive: true });
  standin = makeStandin({ dir: STANDIN_DIR, scenario: { ...DEFAULT_SCENARIO } });
  // The `finally` ends them; this net is for a run the helper ends with
  // process.exit, which skips it. Synchronous, by pid, naming this file only.
  process.once('exit', () => endStandinProcesses(STANDIN_DIR, 500));
  const pre = preflightStandin(standin, standin.binPath);
  if (!pre.ok) throw new Error(`the Tailscale preflight refused: ${pre.problems.join('; ')}`);
  dns = await makeDnsStandin({ name: NAME, mode: 'record' });
  say(`one DNS stand-in answers for ${NAME} on ${dns.servers}`);
  watch = watchForRealTailscale({ roots: () => [lastShim, lastApp].filter((p) => p > 0), everyMs: 1_000 });

  // THE SCRATCH KEY, made here and deleted in the `finally` whatever happened.
  // His key is never read. The `exit` net is for a run that ends by a signal
  // the helper answers with process.exit, which skips a `finally`.
  const keyPair = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const pem = keyPair.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
  pemLines.push(...pem.split('\n').filter((l) => l.length >= 16 && !l.startsWith('-----')));
  mkdirSync(ALERTS_DIR, { recursive: true, mode: 0o700 });
  writeFileSync(KEY_FILE, pem, { mode: 0o600 });
  process.once('exit', () => rmSync(KEY_FILE, { force: true }));
  // APPLE is the stand-in, in this process, knowing no device: nothing may reach it.
  apns = await startApnsStandIn({ publicKey: keyPair.publicKey, topic: TOPIC, devices: {} });
  writeFileSync(ALERTS_JSON, `${J({ origins: apns.origins, keyFile: KEY_FILE })}\n`, { mode: 0o600 });

  for (const build of BUILDS) await runBuild(build);
  gradeRows();
} catch (err) {
  cannotRead('the run', `it threw: ${String(err?.stack ?? err).slice(0, 1_500)}`);
} finally {
  // Everything this run started, by pid or by handle, whatever happened.
  clearInterval(udpTimer);
  rmSync(KEY_FILE, { force: true });
  const keyFileGone = !existsSync(KEY_FILE);
  const ended = standin === null ? { ended: [], left: [] } : endStandinProcesses(STANDIN_DIR, 1_500);
  const findings = watch?.stop() ?? [];
  const log = standin?.readLog() ?? [];
  const questions = dns?.log() ?? [];
  if (dns !== null) await dns.close();
  const apnsRequests = apns?.requests.length ?? 0;
  const apnsConnections = apns === null ? { development: 0, production: 0 } : { ...apns.connections };
  if (apns !== null) {
    await apns.close().catch(() => undefined);
    apnsClosed = true;
  }
  arm('RUN', {
    tailscalePreflights,
    dnsPreflights,
    agentsPrecheck,
    agentsScan,
    realTailscale: findings.length,
    samples: watch?.samples() ?? 0,
    forbidden: log.filter((e) => e.forbidden === true).length,
    refusedArgv: log.filter((e) => e.verdict === 'refused').length,
    udpLeaks: udp.leaks.length,
    udpSamples: udp.samples,
    totalQuestions: questions.length,
    questionProblems: nameQuestionProblems(questions, NAME),
    setupPresses,
    apnsRequests,
    apnsConnections,
    keyFileGone,
    standinLeft: ended.left.length,
    dnsClosed: dns !== null && dns.closed(),
    apnsClosed,
    electronLeft: electronsOfRun().length,
    phoneProcesses: processRows().filter((r) => r.command.includes('node-phone.mjs')).length
  });
  // Every read the run caused, paired with what caused it, for the report and the verifier.
  const paired = attribute(readsOf(log), causes);
  report.raw = {
    readsWithNoCause: paired.filter((x) => x.cause === null).map((x) => x.read),
    reads: paired.map((x) => ({ start: x.read.start, complete: x.read.complete, cause: x.cause === null ? null : `${String(x.cause.build)} ${String(x.cause.launch)} ${x.cause.kind} ${String(x.cause.what)}` })),
    udpSeen: [...udp.seen].sort(),
    udpLeaks: udp.leaks,
    realTailscaleFindings: findings,
    standinEnded: ended,
    launches: launches.map((l) => ({ build: l.build, label: l.label, shim: l.shim, app: l.app })),
    dnsQuestions: questions.length,
    appLogsHoldKey: [PROFILES.parentF, PROFILES.headF, PROFILES.S].some((p) => {
      try {
        const text = readFileSync(join(p, 'logs', 'app.log'), 'utf8');
        return text.includes('-----BEGIN') || pemLines.some((l) => text.includes(l));
      } catch {
        return false;
      }
    })
  };
  report.unreadableRows = Object.fromEntries(
    ['parent', 'head'].map((b) => [b, Object.fromEntries(Object.entries(rows[b]).filter(([, v]) => v?.unreadable !== undefined).map(([k, v]) => [k, v.unreadable]))])
  );
  if (KEEP) {
    try {
      mkdirSync(REDERIVE, { recursive: true, mode: 0o700 });
      if (existsSync(join(STANDIN_DIR, 'invocations.log'))) copyFileSync(join(STANDIN_DIR, 'invocations.log'), join(REDERIVE, 'invocations.log'));
      for (const [file, value] of [['timeline.json', timeline], ['store.json', storeSeries], ['statuses.json', statusSeries]]) writeFileSync(join(REDERIVE, file), `${J(value, null, 1)}\n`, { mode: 0o600 });
      for (const file of ['invocations.log']) if (existsSync(join(REDERIVE, file))) writeFileSync(join(REDERIVE, file), readFileSync(join(REDERIVE, file)), { mode: 0o600 });
      say(`P3331_KEEP=1: the run folder is kept at ${RUN}, its records under ${REDERIVE}`);
    } catch (err) {
      say(`the re-derivation records could not be written: ${String(err?.message ?? err)}`);
    }
  } else {
    rmSync(RUN, { recursive: true, force: true });
  }
}

mkdirSync(OUT, { recursive: true });
const outFile = join(OUT, 'probe-p3331.json');
writeFileSync(outFile, `${J(report, null, 1)}\n`, 'utf8');
say(`wrote ${outFile}`);
if (failures > 0) {
  say(`probe:p3331 FAILED ${String(failures)} arm(s)`);
  process.exit(1);
}
if (unreadable > 0) {
  say(`probe:p3331 could not READ ${String(unreadable)} arm(s); that is not a pass`);
  process.exit(2);
}
say('probe:p3331 OK');
process.exit(0);
