#!/usr/bin/env node
/**
 * probe:p333121 — THE PHASE 333.12.1 APP RUN: "can we make this screen and
 * text more sleek and to the point like how we redesigned the connection
 * screen" (build/p333121/SPEC.md §7). The confirm block in Settings then Phone
 * becomes main's FACE (four labelled lines, or one `New:` line per waiting
 * route), Allow, and DETAILS, shut at rest, holding every hashed line and both
 * warnings byte for byte. This probe reads that block in the real app beside
 * its parent, at the widths the Settings window draws.
 *
 * FOUR BUILDS, TWO WORLDS, FOUR LAUNCHES, ONE ELECTRON AT A TIME:
 *
 *   PARENT          `P333121_PARENT_CHECKOUT`, 576f1908 (Phase 333.12's
 *                   landing), built
 *   PARENT_PLANTED  `P333121_PARENT_PLANTED`, a second 576f1908 copy carrying
 *                   build/p33312/plant.mjs's route (the head shape), built
 *   HEAD            this checkout, built (`npm run build`)
 *   HEAD_PLANTED    `P333121_HEAD_PLANTED`, a copy of this checkout, planted
 *                   and built with the bundler alone
 *
 * Run as `node build/harness-socket.mjs --fresh gmux-p333121 'node build/p333121/probe-p333121.mjs'`
 * (the `probe:p333121` script the main session adds at landing), which hands it
 * GMUX_TMUX_SOCKET (`gmux-p333121-…`, never `gmux`) and GMUX_HARNESS_DIR.
 *
 * A WORLD is one scratch profile under the harness directory, over the one
 * scratch HOME; the parent's world runs first and never beside the head's. Per
 * world, with (B, B_PLANTED) = (PARENT, PARENT_PLANTED), then (HEAD,
 * HEAD_PLANTED):
 *
 *   L1 at B. The stand-in's name is put back to its default. The switch on
 *      through `window.gmux.pocket.setDoor({ on: true })`; lines that may be
 *      allowed, naming the stand-in's name; N read at 640, 760 and 1200 px;
 *      Details opened by ONE trusted Tab from Allow and ONE trusted Enter;
 *      Allow CLICKED on the real element; one node phone (`p333121 phone`)
 *      paired through the code, its presentation and the card's Allow; the
 *      public name moved H9's way (the stand-in's `dnsName` moved, then SIGINT
 *      to the stand-in's own Funnel child, by pid, after re-reading that its
 *      command line names tailscale-standin.mjs); C read; Details by the
 *      keyboard; Allow clicked.
 *   L2 at B_PLANTED, NO PRESS first. The door publishes over the agreement L1
 *      left, with `probe` waiting; W read; Details by the keyboard; Allow
 *      clicked.
 *
 * THE ARMS, graded at HEAD. The parent's reading of the same moment is kept
 * beside each and graded only where a clause says so.
 *   N1 the first-setup face: `Read, then allow`; one block, face `whole`; the
 *      four labels in order; the four values THIS FILE'S OWN composition from
 *      `status.publicName`, `status.publicPort` and the wrapper's path by D4's
 *      rule (re-implemented here, never imported); no route new; and main's
 *      `confirmFace` the drawn words.
 *   N2 the rectangles at 640, 760 and 1200 px: the labels one column, the
 *      values one column at least 12 px right of the widest label and inside
 *      the block, Allow at the block's right edge under the rows, Details under
 *      Allow, nothing scrolling sideways; at 760 px the block shorter than the
 *      parent's.
 *   N3 shut at rest: Details closed with no `open`, as tall as its summary;
 *      the block's innerText holds no hashed line and no warning, its
 *      textContent every one.
 *   N4 the keyboard, and Details byte for byte: Allow focused, one Tab on the
 *      summary, one Enter opens it; with main's status read before and after
 *      the DOM read and equal, every `li` is `confirmLines` in order, the
 *      warnings are the confirm warning and the honesty sentence, and both are
 *      the parent block's own.
 *   N5 Allow: within 10 s no block, `confirmed`, step 2 published.
 *   C1 the moved-name face: `changed`, `Changed since you allowed it`, face
 *      `whole`, Reachable at the moved name and port, Phones the paired phone,
 *      Alerts off; shorter than the parent's block.
 *   C2 Details by the keyboard: `confirmLines` byte for byte, the first naming
 *      the moved name; the parent's lines the same once each key fingerprint
 *      is masked (the two worlds' phones differ).
 *   C3 Allow: within 10 s no block, `confirmed`, published at the moved name.
 *   W1 THE ATTACK, a waiting route with no title row: published with no press,
 *      `confirmed`, `probe` waiting, step 2 Published; one block, face `new`,
 *      no rows; `New: probe` and NO sentence; Allow on the title's line at the
 *      block's right edge; main's `confirmFace` the drawn words; shorter than
 *      the parent's block, which draws today's whole block there.
 *   W2 Details by the keyboard: `confirmLines` byte for byte, the route line
 *      naming `probe`, the honesty sentence today's.
 *   W3 Allow: within 10 s nothing waits, no block, still published, the door
 *      process and the Funnel child not restarted.
 *   RD the reading the three older probes make (D14): on N's block before its
 *      Allow, at BOTH builds, textContent holds the route line, the write line
 *      and the honesty sentence; innerText holds them at the parent and none
 *      at HEAD; and probe:p317, probe:p318 and probe:p337, read as text, read
 *      the block through `.textContent`.
 *   RUN the preflights at every launch, the renamed agents read back at every
 *      launch, no real Tailscale sampled, nothing forbidden or refused at the
 *      stand-in, main's UDP to 127.0.0.1 alone, no Electron or stand-in of this
 *      run left, the scratch socket file gone, his two history files unmoved,
 *      and neither app.log holding a one-shot secret or a PEM line.
 *
 * WIDTHS AND HEIGHTS. Every rectangle is read through
 * `Emulation.setDeviceMetricsOverride` READ_HEIGHT (2,000 px) tall, so the
 * taller parent block never brings a scrollbar that narrows one build alone
 * (probe:p3332's fix round): at 760 px (the window's own width) for every arm,
 * and at 640 and 1200 px for N. The override is then cleared and the page
 * waited back to its own size. A height is compared only between two readings
 * that are both 760 by 2,000.
 *
 * Every verdict is read from OUTSIDE the app's own reports: the Settings
 * page's DOM and `window.gmux.pocket.status()` over CDP, the stand-ins' own
 * logs and `ps`. Presses are the sheet's own: `window.gmux.pocket.*` exactly as
 * Settings then Phone calls it, a click dispatched on the real Allow, and the
 * keyboard as trusted `Input.dispatchKeyEvent` key events.
 *
 * WHAT IS SUPPLIED, and nothing else:
 *   - TAILSCALE: build/p330/tailscale-standin.mjs behind ONE scratch wrapper
 *     for the whole run, named by GMUX_TAILSCALE_BIN, preflighted by sha256
 *     before every launch and sampled every second; a real Tailscale under the
 *     app, or run as a command, fails the run;
 *   - DNS: build/p332/dns-standin.mjs IN THIS PROCESS on 127.0.0.1, named by
 *     GMUX_POCKET_NAME_SERVERS, preflighted before every launch; main's UDP is
 *     sampled with lsof every 2 s and any peer that is not 127.0.0.1 ends the
 *     launch and fails the run;
 *   - THE PHONE: ONE build/p316/node-phone.mjs phone, dialling the stand-in's
 *     loopback forwarder with the code's public name as SNI and Host;
 *   - build/hidden-agents.mjs before EVERY launch, its precheck run against
 *     that launch's own checkout and `agents:list` read back.
 * No APNs stand-in and no scratch key (alerts stay off, SPEC D17), no agent
 * and no session: nothing blocks and no token is spent. It imports from
 * probe:p33312 only what that file exports behind its isMain guard
 * (`checkoutProblems`, `socketPathOf`, `secretHits`, `questionsProblems` and
 * its two made-up names), and from build/p33312/plant.mjs the marker readers
 * and the plan. probe:p33312's `run()` is not exported, so its launch, attach,
 * status, click and pairing helpers are written again below.
 *
 * WHAT IT REFUSES, exit 2 before anything starts: no GMUX_TMUX_SOCKET of the
 * shape `gmux-p333121…-<pid>`; no GMUX_HARNESS_DIR; any of the four checkouts
 * missing, unbuilt, or with an out/ older than its sources; a parent that
 * already draws the face, or a head that does not; a planted checkout without
 * plant.mjs's marker in the head shape, whose sheet files are not its
 * unplanted twin's, or whose planted files are not the plan over that twin;
 * an unplanted checkout carrying the marker; the same checkout named twice; an
 * unknown arm in P333121_ARMS; either stand-in's preflight; his home that
 * cannot be named. His `~/.zsh_history` and `~/.bash_history` are stat'ed
 * (size and modified time, nothing else) at the start and the end, and a move
 * FAILS the run and says so.
 *
 * WHAT IT NEVER DOES: name `-L gmux` or the default server; run `pkill`,
 * `killall` or a pattern; signal a pid it did not start, except the
 * stand-in's Funnel child in the name move and the stand-in pids its own
 * helper ends, each after re-reading its command line; spend a token; read a
 * credential, a keychain item or his live profile; photograph anything.
 *
 * WHAT IT WRITES: out/p333121/probe-p333121.json, per arm a verdict, its title,
 * its failed clauses and the words, rectangles and lines it compared, with
 * every one-shot secret removed and every key fingerprint masked.
 * P333121_KEEP=1 keeps the scratch world and writes <run>/rederive/ (every
 * distinct status and every DOM reading, scrubbed the same way) for the
 * verifier's own reader. P333121_ARMS picks arms (a comma list of N1 to N5, C1
 * to C3, W1 to W3, RD and RUN): L1 always runs in both worlds, L2 only when a
 * W arm is picked, and an arm not picked is driven but not graded.
 *
 * VERIFIERS ONLY, under THE LOCK: it starts Electrons. Builders write it and
 * run only the self-test, which grades recorded fixtures for every arm, each
 * clause shown red on its own break and green on its honest reading, and
 * starts nothing (no Electron, no stand-in, no shell):
 *
 *   node build/p333121/probe-p333121.mjs --grader-self-test
 *
 * NEVER through `npm run`, which would hand the flag to harness-socket.mjs (the
 * probe:p336 lesson). Cost: not yet measured; budget 6 to 10 minutes (four
 * launches, one pairing, one name move), the four builds made first.
 *
 * Exit 0 when every graded arm passed, 1 when one failed, 2 when it could not
 * run or an arm could not be READ, which is never a pass.
 */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { userInfo } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { withElectron, withoutDevRenderer } from '../electron-run.mjs';
import { cdpEval, wsConnect } from '../cdp-client.mjs';
import { pickRendererTarget } from '../cdp-target.mjs';
import { gradeFixtures } from '../probe-graders.mjs';
import { AGENTS_LIST_EXPR, hiddenAgentsPrecheck, hiddenAgentsScanVerdict, writeHiddenAgents } from '../hidden-agents.mjs';
import { DEFAULT_SCENARIO, endStandinProcesses, makeStandin, preflightStandin, processRows, watchForRealTailscale } from '../p330/tailscale-standin.mjs';
import { NAME_SERVERS_VAR, QTYPE, loopbackOnlyServers, makeDnsStandin } from '../p332/dns-standin.mjs';
import { makePhone, pairThrough, readOffer } from '../p316/node-phone.mjs';
import { MOVED_NAME, PUBLIC_NAME, checkoutProblems, questionsProblems, secretHits, socketPathOf } from '../p33312/probe-p33312.mjs';
import { MARKER, PLANT_FILES, markerProblems, planPlant, readMarker, textsOf } from '../p33312/plant.mjs';

const HERE = fileURLToPath(import.meta.url);
const ROOT = resolve(dirname(HERE), '..', '..');
const J = JSON.stringify;
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
const sha256 = (data) => createHash('sha256').update(data).digest('hex');

// ---------------------------------------------------------------------------
// What the run holds the app against, SPELLED HERE, never read from the tree
// at run time, so a constant that drifts is caught rather than agreed with.
// The self-test holds each against the tree.
// ---------------------------------------------------------------------------

/** The Settings window's own width (src/main/settings/window.ts), and the two the face is read at besides. */
export const OWN_WIDTH = 760;
export const WIDTHS = Object.freeze([640, 760, 1200]);
/** Every reading is taken this tall, so no build's section brings a scrollbar (probe:p3332's fix round). */
export const READ_HEIGHT = 2000;
/** N5, C3 and W3: an Allow takes effect within this. */
export const ALLOW_WITHIN_MS = 10_000;
/** The one node phone's label, which the face's Phones line must say. */
export const PHONE_LABEL = 'p333121 phone';
/** The route build/p33312/plant.mjs adds, which has no row in POCKET_NEW_ROUTE_WORDS. */
export const PLANTED = 'probe';
/** Step 2's three state words (src/renderer/settings/phone/steps.ts). */
export const STATE_READ_ALLOW = 'Read, then allow';
export const STATE_CHANGED = 'Changed since you allowed it';
export const STATE_PUBLISHED = 'Published';
/** The face's four rows, by key and by label (SPEC §3.1). */
export const ROW_KEYS = Object.freeze(['reach', 'can', 'phones', 'alerts']);
export const LABELS = Object.freeze(['Reachable at', 'Your phone can', 'Phones', 'Alerts']);
/** `Your phone can` over the eleven routes every build of this phase allows (SPEC §3.1). */
export const CAN_ELEVEN = 'see your sessions, type into them, answer questions, send a message, end a session';
export const NO_PHONE = 'none yet';
export const ALERTS_ON = 'through Apple, never what an agent asks';
export const ALERTS_OFF = 'off';
export const NEW_WORD = 'New';
/** The disclosure's summary (PhoneSection.tsx DISCLOSE_DETAILS) and the button (BTN_ALLOW). */
export const DETAILS_WORD = 'Details';
export const BTN_ALLOW = 'Allow';
/** POCKET_CONFIRM_WARNING, POCKET_DOOR_HONESTY and POCKET_FUNNEL_RIGHT_WARNING, byte for byte (src/shared/ipc/pocket.ts). */
export const CONFIRM_WARNING =
  'This lets a phone you allow ask this Mac what your sessions are doing, over the internet. It reads your session names, your project names and what your agents are saying.';
export const HONESTY =
  'A phone you allow can see what any session’s terminal shows and what it printed before, type into it as you would at this Mac, answer a numbered question, send a session one message and end a session.';
export const FUNNEL_RIGHT = 'Approving Funnel lets any device signed in to your tailnet publish to the internet, not only this Mac.';
/** The route line's and the write line's leads (src/main/pocket/pairing.ts describePocketDoor). */
export const ROUTE_PREFIX = 'Answers these and nothing else:';
export const WRITE_PREFIX = 'Lets an allowed phone ';
/** The three probes whose confirm-block read D14 moved to textContent. */
export const PROBE_FILES = Object.freeze(['build/p317/probe-p317.mjs', 'build/p318/probe-p318.mjs', 'build/p337/probe-p337.mjs']);
/** Every arm, in the order it is graded. */
export const ARM_IDS = Object.freeze(['N1', 'N2', 'N3', 'N4', 'N5', 'C1', 'C2', 'C3', 'W1', 'W2', 'W3', 'RD', 'RUN']);
/** The launch each arm is read in, in each world. RUN is read after all of them. */
export const LAUNCH_OF = Object.freeze({ N1: 'L1', N2: 'L1', N3: 'L1', N4: 'L1', N5: 'L1', C1: 'L1', C2: 'L1', C3: 'L1', W1: 'L2', W2: 'L2', W3: 'L2', RD: 'L1', RUN: null });
/** The arms a clause of which compares HEAD with the parent: without the parent's reading they cannot be read. */
export const NEEDS_PARENT = Object.freeze(['N2', 'N4', 'C1', 'C2', 'W1', 'RD']);
/** The sheet's files that make a build stale besides probe:p33312's list. */
export const STALE_EXTRA = Object.freeze([
  'src/renderer/settings/phone-section.css',
  'src/renderer/settings/settings.css',
  'src/renderer/settings/phone/StepsCard.tsx',
  'src/renderer/settings/SettingsApp.tsx'
]);
/** The files a planted copy must share, byte for byte, with its unplanted twin: the plant touches none of them. */
export const TWIN_FILES = Object.freeze([
  'src/renderer/settings/PhoneSection.tsx',
  'src/renderer/settings/phone-section.css',
  'src/renderer/settings/phone/steps.ts',
  'src/renderer/settings/phone/StepsCard.tsx',
  'src/main/pocket/pairing.ts'
]);
/** The sheet file, and the attribute only a build of this phase draws. */
export const SHEET_FILE = 'src/renderer/settings/PhoneSection.tsx';
export const FACE_MARK = 'data-phone-confirm-details';

/** The selectors every reading uses. */
const SECTION = 'section[aria-label="Phone"]';
export const ALLOW_SEL = `${SECTION} [data-phone-confirm] [data-phone-action="confirm-door"]`;
export const DETAILS_SEL = `${SECTION} [data-phone-confirm] details[data-phone-confirm-details]`;
export const SUMMARY_SEL = `${DETAILS_SEL} > summary`;

// ---------------------------------------------------------------------------
// Pure readers, shared by the run and the self-test
// ---------------------------------------------------------------------------

/**
 * The program as the face names it, D4 RE-IMPLEMENTED HERE and never imported
 * (SPEC §7.3 N1): an app's executable at `/Applications/<Name>.app/Contents/
 * MacOS/<x>` is named `<Name>`; any other path, or an empty one, is itself.
 * Spelled by its path segments rather than the shipping regular expression, so
 * the two are two readings the self-test compares over a corpus.
 */
export function programName(path) {
  if (typeof path !== 'string') return '';
  const parts = path.split('/');
  const isApp =
    parts.length === 6 &&
    parts[0] === '' &&
    parts[1] === 'Applications' &&
    parts[2].length > '.app'.length &&
    parts[2].endsWith('.app') &&
    parts[3] === 'Contents' &&
    parts[4] === 'MacOS' &&
    parts[5] !== '';
  return isApp ? parts[2].slice(0, -'.app'.length) : path;
}

/** `Reachable at`'s value: `<name>:<port>, by <program>`, the `, by …` left off for an empty program. */
export function reachOf(publicName, publicPort, program) {
  const named = programName(program);
  return `${String(publicName)}:${String(publicPort)}${named === '' ? '' : `, by ${named}`}`;
}

/** The four rows this file composes, as `[key, label, value]`, for the eleven routes and nothing waiting. */
export function ownRows({ publicName, publicPort, program, phones = [], pushAlerts = false }) {
  return [
    ['reach', LABELS[0], reachOf(publicName, publicPort, program)],
    ['can', LABELS[1], CAN_ELEVEN],
    ['phones', LABELS[2], phones.length === 0 ? NO_PHONE : phones.join(', ')],
    ['alerts', LABELS[3], pushAlerts ? ALERTS_ON : ALERTS_OFF]
  ];
}

/** The value drawn for one row key, or null when that row is not drawn exactly once. */
export function valueOf(m, key) {
  const dds = Array.isArray(m?.dds) ? m.dds.filter((d) => d.key === key) : [];
  return dds.length === 1 ? dds[0].text : null;
}

/** The drawn rows as `[key, label, value]`, each label's key and its value's key required to agree. */
export function drawnRows(m) {
  const dts = Array.isArray(m?.dts) ? m.dts : [];
  const dds = Array.isArray(m?.dds) ? m.dds : [];
  if (dts.length !== dds.length) return null;
  return dts.map((dt, i) => [dt.key === dds[i].key ? dt.key : `${String(dt.key)}≠${String(dds[i].key)}`, dt.text, dds[i].text]);
}

/** Every key fingerprint (`key xxxx xxxx xxxx xxxx xxxx xxxx`) masked, so two worlds' phones compare. */
export const maskKeys = (text) => String(text).replace(/key [0-9a-f]{4}(?: [0-9a-f]{4}){5}/g, 'key <fingerprint>');

/** The ids the route line among `lines` names, or null when none is the route line. */
export function routeLineOf(lines) {
  if (!Array.isArray(lines)) return null;
  const line = lines.find((l) => typeof l === 'string' && l.startsWith(ROUTE_PREFIX));
  return line === undefined ? null : line.slice(ROUTE_PREFIX.length).split(',').map((s) => s.trim()).filter((s) => s !== '');
}

/** The line among `lines` that starts with `prefix`, or null. */
export const lineStarting = (lines, prefix) => (Array.isArray(lines) ? (lines.find((l) => typeof l === 'string' && l.startsWith(prefix)) ?? null) : null);

/** Every needle in `text`. False over no needles, or a needle that is not a non-empty string. */
export const allIn = (text, needles) => typeof text === 'string' && Array.isArray(needles) && needles.length > 0 && needles.every((n) => typeof n === 'string' && n !== '' && text.includes(n));
/** No needle in `text`. False over no needles, or a needle that is not a non-empty string. */
export const noneIn = (text, needles) => typeof text === 'string' && Array.isArray(needles) && needles.length > 0 && needles.every((n) => typeof n === 'string' && n !== '' && !text.includes(n));

/** Two lists of lines, both non-empty and byte for byte equal in order. */
export const linesEqual = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length > 0 && J(a) === J(b);
/** `[]` exactly. */
export const isEmptyList = (a) => Array.isArray(a) && a.length === 0;

/** The warnings Details holds, in today's order (SPEC D10). */
export const expectedWarnings = (asksApproval) => (asksApproval ? [CONFIRM_WARNING, HONESTY, FUNNEL_RIGHT] : [CONFIRM_WARNING, HONESTY]);

/** Details opened the keyboard's way: Allow focused, one Tab onto the summary, one Enter opening a shut Details. */
export const kbOpened = (kb) => kb !== null && typeof kb === 'object' && kb.allowFocused === true && kb.afterTab === 'summary' && kb.openBefore === false && kb.openAfterEnter === true;

/** The door process and the Funnel child are the same pids before and after. */
export const samePids = (p) => p !== null && typeof p === 'object' && p.doorBefore > 0 && p.funnelBefore > 0 && p.doorAfter === p.doorBefore && p.funnelAfter === p.funnelBefore;

/**
 * HEAD's block is shorter than the parent's, read the same way: both 760 by
 * READ_HEIGHT, both drawn, HEAD's height above zero. Any other pair is refused
 * rather than compared.
 */
export function shorterThanParent(head, parent) {
  const sized = (m) => m !== null && typeof m === 'object' && m.innerWidth === OWN_WIDTH && m.innerHeight === READ_HEIGHT && m.block !== null && typeof m.block === 'object';
  return sized(head) && sized(parent) && head.block.h > 0 && head.block.h < parent.block.h;
}

/**
 * Main's `confirmFace` is exactly what the sheet drew: each row's key, label
 * and value, then each waiting route's id, title and sentence, in order.
 */
export function faceMatchesDrawn(face, m) {
  if (face === null || typeof face !== 'object' || !Array.isArray(face.rows) || !Array.isArray(face.added)) return false;
  const rows = drawnRows(m);
  const news = Array.isArray(m?.news) ? m.news : null;
  if (rows === null || news === null || rows.length !== face.rows.length || news.length !== face.added.length) return false;
  const rowsOk = face.rows.every((row, i) => J(rows[i]) === J([row.key, row.label, row.value]));
  const addedOk = face.added.every((a, i) => news[i].id === a.id && news[i].title === a.title && news[i].sentence === a.sentence);
  return rowsOk && addedOk;
}

/**
 * THE FACE'S RECTANGLES (SPEC §7.3 N2), as problems by kind, so a verifier can
 * hold its own render to the same rule. `m` is one reading of the block.
 *   labels  every label's left edge the same (±0.5 px), and four of them
 *   values  every value's left edge the same, at least the widest label's
 *           right edge + 12 px (−0.5)
 *   inside  every value inside the block, left and right (±0.5)
 *   allow   Allow's right edge the block's (±1), its top at or below the rows'
 *   details the summary's top at or below Allow's bottom (−0.5)
 *   scroll  the block's scrollWidth no more than its clientWidth
 */
export function faceGeometryProblems(m) {
  const p = { labels: [], values: [], inside: [], allow: [], details: [], scroll: [] };
  const tol = 0.5;
  const isRect = (r) => r !== null && typeof r === 'object' && [r.x, r.y, r.w, r.h, r.r, r.b].every(Number.isFinite);
  if (m === null || typeof m !== 'object' || !isRect(m.block)) {
    for (const k of Object.keys(p)) p[k].push('no block was read');
    return p;
  }
  const dts = Array.isArray(m.dts) ? m.dts : [];
  const dds = Array.isArray(m.dds) ? m.dds : [];
  if (dts.length !== 4 || !dts.every((d) => isRect(d.r))) p.labels.push(`${String(dts.length)} labels read, not four with rectangles`);
  if (dds.length !== 4 || !dds.every((d) => isRect(d.r))) p.values.push(`${String(dds.length)} values read, not four with rectangles`);
  const spread = (xs) => (xs.length === 0 ? Infinity : Math.max(...xs) - Math.min(...xs));
  if (p.labels.length === 0 && spread(dts.map((d) => d.r.x)) > tol) p.labels.push(`the labels' left edges spread ${String(spread(dts.map((d) => d.r.x)))} px`);
  if (p.values.length === 0 && p.labels.length === 0) {
    if (spread(dds.map((d) => d.r.x)) > tol) p.values.push(`the values' left edges spread ${String(spread(dds.map((d) => d.r.x)))} px`);
    const widest = Math.max(...dts.map((d) => d.r.r));
    const left = Math.min(...dds.map((d) => d.r.x));
    if (left < widest + 12 - tol) p.values.push(`the values start ${String(left - widest)} px right of the widest label, not 12`);
  }
  for (const d of dds) {
    if (!isRect(d.r)) continue;
    if (d.r.x < m.block.x - tol || d.r.r > m.block.r + tol) p.inside.push(`the ${String(d.key)} value spans ${String(d.r.x)} to ${String(d.r.r)}, outside the block's ${String(m.block.x)} to ${String(m.block.r)}`);
  }
  if (dds.length === 0) p.inside.push('no value was read');
  const allow = m.allow?.r;
  if (!isRect(allow)) p.allow.push('no Allow was read');
  else {
    if (Math.abs(allow.r - m.block.r) > 1) p.allow.push(`Allow's right edge is ${String(allow.r)}, the block's ${String(m.block.r)}`);
    if (!isRect(m.dl) || allow.y < m.dl.b - tol) p.allow.push(`Allow's top ${String(allow.y)} is above the rows' bottom ${String(m.dl?.b)}`);
  }
  const summary = m.summary?.r;
  if (!isRect(summary)) p.details.push('no summary was read');
  else if (!isRect(allow) || summary.y < allow.b - tol) p.details.push(`the summary's top ${String(summary.y)} is above Allow's bottom ${String(allow?.b)}`);
  if (!(Number.isFinite(m.scrollWidth) && Number.isFinite(m.clientWidth) && m.scrollWidth <= m.clientWidth)) p.scroll.push(`the block scrolls sideways (${String(m.scrollWidth)} over ${String(m.clientWidth)})`);
  return p;
}

/** Every width's problems of one kind, empty when all three widths are clean. */
export const geometryAt = (at, kind) => WIDTHS.flatMap((w) => faceGeometryProblems(at?.[String(w)] ?? null)[kind].map((x) => `${String(w)} px: ${x}`));

/**
 * How a probe file reads the confirm block's text (RD, SPEC D14): every line
 * that queries `[data-phone-confirm]` through `document.querySelector(`, how
 * many there are, whether each returns `b.textContent`, and whether any names
 * `.innerText`.
 */
export function confirmReadsOf(text) {
  const rows = String(text ?? '')
    .split('\n')
    .filter((l) => l.includes('[data-phone-confirm]') && l.includes('document.querySelector('));
  return { count: rows.length, textContent: rows.length > 0 && rows.every((l) => /\bb\.textContent\b/.test(l)), innerText: rows.some((l) => /\.innerText\b/.test(l)) };
}

/** Why a checkout cannot stand for its role by the face it draws: `want` says whether it must draw it. */
export function faceBuildProblems(dir, sheetText, want) {
  if (typeof sheetText !== 'string') return [`${dir} has no ${SHEET_FILE}`];
  const has = sheetText.includes(FACE_MARK);
  if (want && !has) return [`${dir}'s ${SHEET_FILE} draws no confirm face (no ${FACE_MARK}), so it is not a build of Phase 333.12.1`];
  if (!want && has) return [`${dir}'s ${SHEET_FILE} already draws the confirm face, so it cannot stand for the parent 576f1908`];
  return [];
}

/**
 * Why a planted copy is not its unplanted twin's build (pure over two maps of
 * repository path to text): the sheet's files must be byte for byte the
 * twin's, and every planted file exactly the plan over the twin. A planted
 * copy made before the twin's last edit fails here.
 */
export function twinProblemsOf(unplanted, planted) {
  const problems = [];
  for (const file of TWIN_FILES) {
    const a = unplanted.get(file) ?? null;
    const b = planted.get(file) ?? null;
    if (a === null || b === null) problems.push(`${file} is missing from the ${a === null ? 'unplanted' : 'planted'} checkout`);
    else if (a !== b) problems.push(`${file} differs between the planted copy and its unplanted twin`);
  }
  const plan = planPlant(new Map(PLANT_FILES.map((f) => [f, unplanted.get(f) ?? null])));
  if (!plan.ok) problems.push(`the plant does not plan over the unplanted twin: ${plan.problems.join('; ')}`);
  else for (const [file, text] of plan.out) if ((planted.get(file) ?? null) !== text) problems.push(`${file} in the planted copy is not the plan over its unplanted twin`);
  return problems;
}

/**
 * A checkout's out/ older than one of the sheet's files probe:p33312's list
 * does not name. `fs` is for the self-test; the run hands nothing.
 */
export function staleExtraProblems(dir, fs = { exists: existsSync, mtimeMs: (path) => statSync(path).mtimeMs }) {
  const bundle = join(dir, 'out', 'main', 'index.js');
  if (!fs.exists(bundle)) return [];
  const built = fs.mtimeMs(bundle);
  const newer = STALE_EXTRA.filter((s) => fs.exists(join(dir, s)) && fs.mtimeMs(join(dir, s)) > built);
  return newer.length === 0 ? [] : [`${dir}'s out/ is older than ${newer.join(', ')}; build it again`];
}

/** The launches the picked arms need, in each world. L1 always; L2 for a W arm. */
export function launchesFor(arms) {
  return arms.some((id) => LAUNCH_OF[id] === 'L2') ? ['L1', 'L2'] : ['L1'];
}

// ---------------------------------------------------------------------------
// THE GRADERS: pure, over a recorded reading `{ head, parent }`, each clause
// shown to fail. A reading's `head` is HEAD's world, `parent` the parent's.
// ---------------------------------------------------------------------------

/** The rows N1 holds the face to: the stand-in's name, the status's port, the wrapper's path, no phone, alerts off. */
const firstSetupRows = (r) => ownRows({ publicName: r.head.status.publicName, publicPort: r.head.status.publicPort, program: r.head.program }).map(([k, , v]) => [k, v]);
const drawnValues = (m) => (Array.isArray(m?.dds) ? m.dds.map((d) => [d.key, d.text]) : null);
const shut = (m) => m?.details?.open === false && m?.details?.hasOpenAttr === false && m?.detailsCount === 1;

export const GRADERS = {
  N1: {
    title: 'the first-setup face: four labelled lines in this file’s own words, from the proposal the lines come from',
    clauses: [
      ['step 2 reads Read, then allow', (r) => r.head.m.publishState === 'confirm' && r.head.m.stateWord === STATE_READ_ALLOW],
      ['exactly one confirm block, inside step 2, its face whole', (r) => r.head.m.blocks === 1 && r.head.m.inPublish === 1 && r.head.m.face === 'whole' && r.head.m.blockInDetails === false],
      ['the four labels in order', (r) => J(r.head.m.dts.map((d) => [d.key, d.text])) === J(ROW_KEYS.map((k, i) => [k, LABELS[i]]))],
      ['the four values are this file’s own composition', (r) => r.head.status.publicName === PUBLIC_NAME && J(drawnValues(r.head.m)) === J(firstSetupRows(r))],
      ['the program it names is the one the lines publish with', (r) => typeof r.head.program === 'string' && r.head.program.startsWith('/') && r.head.status.confirmLines.includes(`Publishes it with ${r.head.program}`)],
      ['no route drawn as new', (r) => isEmptyList(r.head.m.news)],
      ['main’s confirmFace is the drawn words', (r) => faceMatchesDrawn(r.head.status.confirmFace, r.head.m) && isEmptyList(r.head.status.confirmFace.added)]
    ]
  },
  N2: {
    title: 'the face’s rectangles at 640, 760 and 1200 px, and a block shorter than the parent’s',
    clauses: [
      ['read at 640, 760 and 1200 px, each 2,000 px tall', (r) => WIDTHS.every((w) => r.head.at[String(w)]?.innerWidth === w && r.head.at[String(w)]?.innerHeight === READ_HEIGHT)],
      ['the labels share one left edge', (r) => isEmptyList(geometryAt(r.head.at, 'labels'))],
      ['the values share one left edge, at least 12 px right of the widest label', (r) => isEmptyList(geometryAt(r.head.at, 'values'))],
      ['every value inside the block', (r) => isEmptyList(geometryAt(r.head.at, 'inside'))],
      ['Allow at the block’s right edge, below the rows', (r) => isEmptyList(geometryAt(r.head.at, 'allow'))],
      ['Details below Allow', (r) => isEmptyList(geometryAt(r.head.at, 'details'))],
      ['nothing scrolls sideways', (r) => isEmptyList(geometryAt(r.head.at, 'scroll'))],
      ['at 760 px the block is shorter than the parent’s', (r) => shorterThanParent(r.head.at['760'], r.parent.m)]
    ]
  },
  N3: {
    title: 'Details shut at rest: the block draws no hashed line and no warning, and holds every one',
    clauses: [
      ['Details is shut, with no open attribute, and is the block’s one disclosure', (r) => shut(r.head.m)],
      ['Details is as tall as its summary', (r) => r.head.m.summary?.r?.h > 0 && Math.abs(r.head.m.details.r.h - r.head.m.summary.r.h) <= 1],
      ['its summary says Details and comes first', (r) => r.head.m.summary?.text === DETAILS_WORD && r.head.m.summary?.first === true],
      ['the block’s drawn text holds no hashed line and no warning', (r) => r.head.status.confirmLines.length >= 5 && noneIn(r.head.m.innerText, [...r.head.status.confirmLines, CONFIRM_WARNING, HONESTY])],
      ['the block’s text holds every one', (r) => r.head.status.confirmLines.length >= 5 && allIn(r.head.m.textContent, [...r.head.status.confirmLines, CONFIRM_WARNING, HONESTY])]
    ]
  },
  N4: {
    title: 'the keyboard opens Details, and its lines are main’s and the parent block’s, byte for byte',
    clauses: [
      ['Allow took the focus', (r) => r.head.kb.allowFocused === true],
      ['one trusted Tab put the focus on Details’ summary', (r) => r.head.kb.afterTab === 'summary'],
      ['one trusted Enter opened it', (r) => r.head.kb.openBefore === false && r.head.kb.openAfterEnter === true],
      ['main’s status did not move across the read', (r) => r.head.kb.statusSame === true],
      ['every line in Details is confirmLines, byte for byte, in order', (r) => linesEqual(r.head.kb.lines, r.head.kb.statusLines)],
      ['the warnings are the confirm warning and the honesty sentence', (r) => J(r.head.kb.warnings) === J(expectedWarnings(r.head.kb.asksApproval === true))],
      ['both are the parent block’s own, byte for byte', (r) => linesEqual(r.head.kb.lines, r.parent.lines) && J(r.head.kb.warnings) === J(r.parent.warnings)]
    ]
  },
  N5: {
    title: 'Allow takes the block away and the door publishes',
    clauses: [
      ['Allow was clicked on the real element', (r) => r.head.clicked === true],
      ['no confirm block after it', (r) => r.head.blocks === 0],
      ['confirmed, and step 2 published', (r) => r.head.confirmState === 'confirmed' && r.head.publishState === 'published'],
      ['within 10 s', (r) => typeof r.head.ms === 'number' && r.head.ms <= ALLOW_WITHIN_MS]
    ]
  },
  C1: {
    title: 'the moved-name face: the four lines say the new name, the paired phone and alerts off',
    clauses: [
      ['the moved name reads changed, and step 2 says so', (r) => r.head.status.confirmState === 'changed' && r.head.m.publishState === 'changed' && r.head.m.stateWord === STATE_CHANGED],
      ['exactly one confirm block, its face whole, the four labels in order', (r) => r.head.m.blocks === 1 && r.head.m.face === 'whole' && J(r.head.m.dts.map((d) => d.text)) === J(LABELS)],
      ['Reachable at names the moved name and the port', (r) => r.head.status.publicName === MOVED_NAME && valueOf(r.head.m, 'reach') === reachOf(MOVED_NAME, r.head.status.publicPort, r.head.program)],
      ['Phones is the paired phone', (r) => valueOf(r.head.m, 'phones') === PHONE_LABEL],
      ['Alerts off', (r) => valueOf(r.head.m, 'alerts') === ALERTS_OFF],
      ['main’s confirmFace is the drawn words', (r) => faceMatchesDrawn(r.head.status.confirmFace, r.head.m)],
      ['at 760 px the block is shorter than the parent’s', (r) => shorterThanParent(r.head.m, r.parent.m)]
    ]
  },
  C2: {
    title: 'Details on the moved name: main’s lines byte for byte, and the parent’s once each key is masked',
    clauses: [
      ['opened by the keyboard', (r) => kbOpened(r.head.kb)],
      ['every line in Details is confirmLines, byte for byte', (r) => r.head.kb.statusSame === true && linesEqual(r.head.kb.lines, r.head.kb.statusLines)],
      ['the first line names the moved name', (r) => typeof r.head.kb.lines?.[0] === 'string' && r.head.kb.lines[0].includes(`https://${MOVED_NAME}:`)],
      ['the parent’s block holds the same lines, each key masked', (r) => Array.isArray(r.parent.lines) && Array.isArray(r.head.kb.lines) && r.parent.lines.length === r.head.kb.lines.length && linesEqual(r.head.kb.lines.map(maskKeys), r.parent.lines.map(maskKeys))]
    ]
  },
  C3: {
    title: 'Allow on the moved name: the block goes and the door publishes there',
    clauses: [
      ['Allow was clicked on the real element', (r) => r.head.clicked === true],
      ['no confirm block after it', (r) => r.head.blocks === 0],
      ['confirmed and published at the moved name', (r) => r.head.confirmState === 'confirmed' && r.head.state === 'listening' && r.head.publicName === MOVED_NAME],
      ['within 10 s', (r) => typeof r.head.ms === 'number' && r.head.ms <= ALLOW_WITHIN_MS]
    ]
  },
  W1: {
    title: 'THE ATTACK: a waiting route with no title row is drawn by its id, on one line beside Allow',
    clauses: [
      ['published at launch with no press', (r) => isEmptyList(r.head.presses) && r.head.published === true],
      ['confirmed, with probe waiting', (r) => r.head.status.confirmState === 'confirmed' && J(r.head.status.routesWaiting) === J([PLANTED])],
      ['step 2 reads Published, with one block in it', (r) => r.head.m.publishState === 'published' && r.head.m.stateWord === STATE_PUBLISHED && r.head.m.blocks === 1 && r.head.m.inPublish === 1],
      ['the face is new, with no rows', (r) => r.head.m.face === 'new' && r.head.m.dl === null && isEmptyList(r.head.m.dts) && isEmptyList(r.head.m.dds)],
      ['New: probe, and no sentence', (r) => r.head.m.news.length === 1 && r.head.m.news[0].id === PLANTED && r.head.m.news[0].title === `${NEW_WORD}: ${PLANTED}` && r.head.m.news[0].sentence === null],
      ['Allow on the title’s line, at the block’s right edge', (r) => {
        const t = r.head.m.news[0]?.titleR;
        const a = r.head.m.allow?.r;
        return t !== null && t !== undefined && a !== null && a !== undefined && a.y < t.b && a.b > t.y && Math.abs(a.r - r.head.m.block.r) <= 1;
      }],
      ['main’s confirmFace is the drawn words', (r) => {
        const f = r.head.status.confirmFace;
        return isEmptyList(f?.rows) && f.added.length === 1 && f.added[0].id === PLANTED && f.added[0].title === `${NEW_WORD}: ${PLANTED}` && f.added[0].sentence === null && faceMatchesDrawn(f, r.head.m);
      }],
      ['shorter than the parent’s block', (r) => shorterThanParent(r.head.m, r.parent.m)]
    ]
  },
  W2: {
    title: 'Details while a route waits: main’s lines byte for byte, naming probe, and today’s honesty sentence',
    clauses: [
      ['opened by the keyboard', (r) => kbOpened(r.head.kb)],
      ['every line in Details is confirmLines, byte for byte', (r) => r.head.kb.statusSame === true && linesEqual(r.head.kb.lines, r.head.kb.statusLines)],
      ['the route line names probe', (r) => (routeLineOf(r.head.kb.lines) ?? []).includes(PLANTED)],
      ['the warnings are the confirm warning and today’s honesty sentence', (r) => J(r.head.kb.warnings) === J(expectedWarnings(r.head.kb.asksApproval === true))]
    ]
  },
  W3: {
    title: 'Allow for the waiting route: nothing waits, the block goes, and nothing restarts',
    clauses: [
      ['Allow was clicked on the real element', (r) => r.head.clicked === true],
      ['nothing waits within 10 s', (r) => isEmptyList(r.head.routesWaiting) && typeof r.head.ms === 'number' && r.head.ms <= ALLOW_WITHIN_MS],
      ['no block, and still published', (r) => r.head.blocks === 0 && r.head.state === 'listening' && r.head.confirmState === 'confirmed' && r.head.publishState === 'published'],
      ['the door and the Funnel child did not restart', (r) => samePids(r.head.pids)]
    ]
  },
  RD: {
    title: 'the three older probes read the block through textContent, which holds its words at both builds',
    clauses: [
      ['textContent holds the route line, the write line and the honesty sentence at both builds', (r) => ['head', 'parent'].every((b) => Array.isArray(r[b].needles) && r[b].needles.length === 3 && allIn(r[b].textContent, r[b].needles))],
      ['innerText holds all three at the parent', (r) => allIn(r.parent.innerText, r.parent.needles)],
      ['innerText holds none of them at HEAD', (r) => noneIn(r.head.innerText, r.head.needles)],
      ['probe:p317, probe:p318 and probe:p337 read the block through textContent', (r) => Array.isArray(r.probes) && r.probes.length === PROBE_FILES.length && r.probes.every((p) => p.count === 1 && p.textContent === true && p.innerText === false)]
    ]
  },
  RUN: {
    title: 'no real Tailscale or DNS, no agent, nothing left, his history unmoved',
    clauses: [
      ['the Tailscale preflight held at every launch', (r) => r.launches > 0 && r.tailscalePreflights.length === r.launches && r.tailscalePreflights.every((x) => x === true)],
      ['the DNS preflight held at every launch', (r) => r.launches > 0 && r.dnsPreflights.length === r.launches && r.dnsPreflights.every((x) => x === true)],
      ['the hidden agents were renamed and read back at every launch', (r) => r.launches > 0 && r.agentsPrecheck.length === r.launches && r.agentsScan.length === r.launches && [...r.agentsPrecheck, ...r.agentsScan].every((x) => x === true)],
      ['no real Tailscale in any sample, nothing forbidden or refused at the stand-in', (r) => r.samples > 0 && r.realTailscale === 0 && r.forbidden === 0 && r.refusedArgv === 0],
      ['main’s UDP went to 127.0.0.1 alone, and every name question was an A, RD 0, for the stand-in’s names', (r) => r.udpSamples > 0 && r.udpLeaks === 0 && isEmptyList(r.questionProblems)],
      ['no Electron or stand-in of this run is left', (r) => r.electronLeft === 0 && r.standinLeft === 0],
      ['the scratch socket file is gone', (r) => r.socketGone === true],
      ['his two history files did not move', (r) => r.historySame === true],
      ['no app.log holds a one-shot secret or a PEM line', (r) => r.profilesLaunched > 0 && r.appLogsRead === r.profilesLaunched && r.appLogHits === 0]
    ]
  }
};

/** One arm's verdict: `{ ok, failed }`. A clause that throws is a failed clause. */
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
// The fixtures: each grader's honest reading, and one break per clause. The
// rectangles come from a MODEL of the reader's answer (never the claim): a
// 240 px left edge, the step body's width per window width, and the CSS's row
// heights, so a break moves one number and the rest still reads honest.
// ---------------------------------------------------------------------------

const rect = (x, y, w, h) => ({ x, y, w, h, r: x + w, b: y + h });
const shift = (r, dx, dy = 0) => Object.assign(r, { x: r.x + dx, r: r.r + dx, y: r.y + dy, b: r.b + dy });
/** The step body's width at each window width (SPEC §2.1). */
const BODY = Object.freeze({ 640: 344, 760: 464, 1200: 512 });
const X0 = 240;
const LABEL_W = Object.freeze([72, 86, 40, 36]);

/**
 * One reading of the block as the run's reader answers it. `kind`: `whole`
 * (four rows, Allow under them), `new` (waiting routes, Allow on the first
 * one's line), `parent` (today's block: every line and both warnings drawn,
 * no Details), or `none` (no block).
 */
export function modelMeasure({ kind, width = OWN_WIDTH, lines = [], warnings = [CONFIRM_WARNING, HONESTY], rows = [], news = [], publishState = null, stateWord = null }) {
  const bw = BODY[width] ?? BODY[OWN_WIDTH];
  const base = { drawn: true, innerWidth: width, innerHeight: READ_HEIGHT, publishState, stateWord, active: null };
  const nothing = { face: null, block: null, scrollWidth: null, clientWidth: null, dl: null, dts: [], dds: [], news: [], allow: null, details: null, detailsCount: 0, blockInDetails: null, summary: null, lines: [], warnings: [], detailsLines: null, detailsWarnings: null, innerText: null, textContent: null };
  if (kind === 'none') return { ...base, blocks: 0, inPublish: 0, ...nothing };
  if (kind === 'parent') {
    const block = rect(X0, 200, bw, Math.round((380 * BODY[OWN_WIDTH]) / bw));
    return {
      ...base,
      ...nothing,
      blocks: 1,
      inPublish: 1,
      block,
      scrollWidth: bw,
      clientWidth: bw,
      allow: { r: rect(X0, block.b - 28, 60, 28), disabled: false, text: BTN_ALLOW, inDetails: false },
      blockInDetails: false,
      lines: [...lines],
      warnings: [...warnings],
      innerText: [...lines, ...warnings, BTN_ALLOW].join('\n'),
      textContent: [...lines, ...warnings, BTN_ALLOW].join('')
    };
  }
  let y = 200;
  const dts = [];
  const dds = [];
  for (const [i, [key, label, value]] of rows.entries()) {
    const h = key === 'can' && width < 1200 ? 36 : 18;
    dts.push({ key, text: label, r: rect(X0, y, LABEL_W[i] ?? 40, 18) });
    dds.push({ key, text: value, r: rect(X0 + 98, y, bw - 98, h) });
    y += h + 4;
  }
  const dl = rows.length === 0 ? null : rect(X0, 200, bw, y - 4 - 200);
  let top = dl === null ? 200 : dl.b + 6;
  const drawnNews = news.map((n) => {
    const titleR = rect(X0, top, 90, 18);
    top = titleR.b + (n.sentence === null ? 0 : 20) + 6;
    return { id: n.id, title: n.title, titleR, sentence: n.sentence };
  });
  const faceBottom = drawnNews.length === 0 ? (dl?.b ?? 200) : top - 6;
  const allow = kind === 'new' ? rect(X0 + bw - 60, 200, 60, 28) : rect(X0 + bw - 60, faceBottom + 6, 60, 28);
  const above = Math.max(allow.b, faceBottom);
  const summary = rect(X0, above + 6, 52, 18);
  const details = rect(X0, above + 6, bw, 18);
  const newsText = news.flatMap((n) => (n.sentence === null ? [n.title] : [n.title, n.sentence]));
  return {
    ...base,
    blocks: 1,
    inPublish: 1,
    face: kind,
    block: rect(X0, 200, bw, details.b - 200),
    scrollWidth: bw,
    clientWidth: bw,
    dl,
    dts,
    dds,
    news: drawnNews,
    allow: { r: allow, disabled: false, text: BTN_ALLOW, inDetails: false },
    details: { open: false, hasOpenAttr: false, r: details, last: true },
    detailsCount: 1,
    blockInDetails: false,
    summary: { text: DETAILS_WORD, r: summary, first: true },
    lines: [...lines],
    warnings: [...warnings],
    detailsLines: [...lines],
    detailsWarnings: [...warnings],
    innerText: [...rows.map(([, l, v]) => `${l}\n${v}`), ...newsText, BTN_ALLOW, DETAILS_WORD].join('\n'),
    textContent: [...rows.flatMap(([, l, v]) => [l, v]), ...newsText, BTN_ALLOW, DETAILS_WORD, ...lines, ...warnings].join('')
  };
}

const WRAPPER = '/private/tmp/h/p333121/standin/tailscale';
const APP_PROGRAM = '/Applications/Tailscale.app/Contents/MacOS/Tailscale';
const FP_HEAD = '1a2b 3c4d 5e6f 7081 92a3 b4c5';
const FP_PARENT = 'c0ff ee00 1234 5678 9abc def0';
const ELEVEN_LINE = `${ROUTE_PREFIX} blocked, choose, end, keys, pair, say, screen, scrollback, session, sessions, turns`;
const TWELVE_LINE = `${ROUTE_PREFIX} blocked, choose, end, keys, pair, probe, say, screen, scrollback, session, sessions, turns`;
const WRITE_LINE = `${WRITE_PREFIX}end a session, answer a numbered question, send a session one message and type into any session as you would at this Mac`;
const linesOf = ({ name = PUBLIC_NAME, routes = ELEVEN_LINE, fp = null } = {}) => [
  `Answers on the internet at https://${name}:8443, through Tailscale Funnel on standin@example.com`,
  `Publishes it with ${WRAPPER}`,
  'Starts answering when Tortie starts',
  routes,
  WRITE_LINE,
  'Tells your phone nothing through Apple',
  fp === null ? 'Allows no phone yet' : `Allows the phone "${PHONE_LABEL}", key ${fp}`
];
const LINES_N = linesOf();
const LINES_C_HEAD = linesOf({ name: MOVED_NAME, fp: FP_HEAD });
const LINES_C_PARENT = linesOf({ name: MOVED_NAME, fp: FP_PARENT });
const LINES_W = linesOf({ name: MOVED_NAME, routes: TWELVE_LINE, fp: FP_HEAD });
const WARNINGS = Object.freeze([CONFIRM_WARNING, HONESTY]);
const ROWS_N = ownRows({ publicName: PUBLIC_NAME, publicPort: 8443, program: WRAPPER });
const ROWS_C = ownRows({ publicName: MOVED_NAME, publicPort: 8443, program: WRAPPER, phones: [PHONE_LABEL] });
const faceOf = (rows, added = []) => ({ rows: rows.map(([key, label, value]) => ({ key, label, value })), added });
const NEW_PROBE = Object.freeze({ id: PLANTED, title: `${NEW_WORD}: ${PLANTED}`, sentence: null });
const statusFixture = ({ state, name, confirmState, lines, face, waiting = [] }) => ({ state, publicName: name, publicPort: 8443, confirmState, confirmLines: [...lines], confirmHash: 'a'.repeat(64), confirmFace: face, routesWaiting: waiting, pushAlerts: false, funnel: { asksApproval: false } });
const STATUS_N = statusFixture({ state: 'refused', name: PUBLIC_NAME, confirmState: 'never', lines: LINES_N, face: faceOf(ROWS_N) });
const STATUS_C = statusFixture({ state: 'refused', name: MOVED_NAME, confirmState: 'changed', lines: LINES_C_HEAD, face: faceOf(ROWS_C) });
const STATUS_W = statusFixture({ state: 'listening', name: MOVED_NAME, confirmState: 'confirmed', lines: LINES_W, face: faceOf([], [{ ...NEW_PROBE }]), waiting: [PLANTED] });
const MODEL = {
  n: (width = OWN_WIDTH) => modelMeasure({ kind: 'whole', width, rows: ROWS_N, lines: LINES_N, publishState: 'confirm', stateWord: STATE_READ_ALLOW }),
  nParent: () => modelMeasure({ kind: 'parent', lines: LINES_N, publishState: 'confirm', stateWord: STATE_READ_ALLOW }),
  c: () => modelMeasure({ kind: 'whole', rows: ROWS_C, lines: LINES_C_HEAD, publishState: 'changed', stateWord: STATE_CHANGED }),
  cParent: () => modelMeasure({ kind: 'parent', lines: LINES_C_PARENT, publishState: 'changed', stateWord: STATE_CHANGED }),
  w: () => modelMeasure({ kind: 'new', news: [NEW_PROBE], lines: LINES_W, publishState: 'published', stateWord: STATE_PUBLISHED }),
  wParent: () => modelMeasure({ kind: 'parent', lines: LINES_W, publishState: 'published', stateWord: STATE_PUBLISHED })
};
const KB = (lines) => ({ allowFocused: true, afterTab: 'summary', openBefore: false, openAfterEnter: true, statusSame: true, statusLines: [...lines], lines: [...lines], warnings: [...WARNINGS], asksApproval: false });
const PIDS = Object.freeze({ doorBefore: 501, doorAfter: 501, funnelBefore: 502, funnelAfter: 502 });
const STALE_HONESTY = 'A phone you allow can see what any session’s screen shows and type into it as you would at this Mac, answer a numbered question, send a session one message and end a session.';

export const GRADER_FIXTURES = {
  N1: {
    pass: { head: { m: MODEL.n(), status: STATUS_N, program: WRAPPER }, parent: { m: MODEL.nParent(), status: { ...STATUS_N, confirmFace: undefined } } },
    breaks: {
      'step 2 reads Read, then allow': (r) => void (r.head.m.stateWord = STATE_CHANGED),
      'exactly one confirm block, inside step 2, its face whole': (r) => void (r.head.m.blocks = 2),
      'the four labels in order': (r) => void (r.head.m.dts[1].text = 'Your phone may'),
      'the four values are this file’s own composition': (r) => void (r.head.m.dds[1].text = 'see your sessions'),
      'the program it names is the one the lines publish with': (r) => void (r.head.program = '/opt/homebrew/bin/tailscale'),
      'no route drawn as new': (r) => void r.head.m.news.push({ ...NEW_PROBE, titleR: rect(X0, 320, 90, 18) }),
      'main’s confirmFace is the drawn words': (r) => void (r.head.status.confirmFace.rows[2].value = '1 phone')
    },
    refused: [
      // §Attack A2: the draft read literally names a program by its basename.
      { what: 'the wrapper named by its basename (the draft read literally)', clause: 'the four values are this file’s own composition', edit: (r) => void (r.head.m.dds[0].text = `${PUBLIC_NAME}:8443, by tailscale`) },
      {
        what: 'the app’s program named by its whole path where D4 names the app',
        clause: 'the four values are this file’s own composition',
        edit: (r) => {
          r.head.program = APP_PROGRAM;
          r.head.status.confirmLines[1] = `Publishes it with ${APP_PROGRAM}`;
          r.head.m.dds[0].text = `${PUBLIC_NAME}:8443, by ${APP_PROGRAM}`;
        }
      },
      { what: 'a face with no Alerts row', clause: 'the four labels in order', edit: (r) => void (r.head.m.dts.pop(), r.head.m.dds.pop()) },
      { what: 'a status naming another name than the stand-in’s', clause: 'the four values are this file’s own composition', edit: (r) => void (r.head.status.publicName = MOVED_NAME) },
      { what: 'the block drawn inside a disclosure', clause: 'exactly one confirm block, inside step 2, its face whole', edit: (r) => void (r.head.m.blockInDetails = true) }
    ]
  },
  N2: {
    pass: { head: { at: { 640: MODEL.n(640), 760: MODEL.n(760), 1200: MODEL.n(1200) } }, parent: { m: MODEL.nParent() } },
    breaks: {
      'read at 640, 760 and 1200 px, each 2,000 px tall': (r) => void (r.head.at['640'].innerWidth = 652),
      'the labels share one left edge': (r) => void shift(r.head.at['640'].dts[2].r, 3),
      'the values share one left edge, at least 12 px right of the widest label': (r) => void shift(r.head.at['1200'].dds[1].r, -10),
      'every value inside the block': (r) => void (r.head.at['640'].dds[1].r.r = r.head.at['640'].block.r + 40),
      'Allow at the block’s right edge, below the rows': (r) => void shift(r.head.at['760'].allow.r, -100),
      'Details below Allow': (r) => void shift(r.head.at['760'].summary.r, 0, -40),
      'nothing scrolls sideways': (r) => void (r.head.at['640'].scrollWidth = r.head.at['640'].clientWidth + 40),
      'at 760 px the block is shorter than the parent’s': (r) => void (r.parent.m.block.h = 100)
    },
    refused: [
      { what: 'a 760 reading only 560 px tall', clause: 'read at 640, 760 and 1200 px, each 2,000 px tall', edit: (r) => void (r.head.at['760'].innerHeight = 560) },
      { what: 'a parent read at another width, which is never compared', clause: 'at 760 px the block is shorter than the parent’s', edit: (r) => void (r.parent.m.innerWidth = 1200) },
      {
        what: '64 phones of 64 characters running past the block at 640 px',
        clause: 'every value inside the block',
        edit: (r) => {
          const dd = r.head.at['640'].dds[2];
          dd.text = Array.from({ length: 64 }, (_, i) => `phone ${String(i).padStart(2, '0')} ${'x'.repeat(55)}`).join(', ');
          dd.r.r = r.head.at['640'].block.r + 300;
        }
      },
      { what: 'Allow drawn above the rows', clause: 'Allow at the block’s right edge, below the rows', edit: (r) => void shift(r.head.at['1200'].allow.r, 0, -120) },
      { what: 'every value in one column only 6 px right of the widest label', clause: 'the values share one left edge, at least 12 px right of the widest label', edit: (r) => r.head.at['760'].dds.forEach((d) => void shift(d.r, -6)) },
      { what: 'a face with three rows at 1200 px', clause: 'the labels share one left edge', edit: (r) => void r.head.at['1200'].dts.pop() }
    ]
  },
  N3: {
    pass: { head: { m: MODEL.n(), status: STATUS_N } },
    breaks: {
      'Details is shut, with no open attribute, and is the block’s one disclosure': (r) => void (r.head.m.details.open = true),
      'Details is as tall as its summary': (r) => void (r.head.m.details.r.h = 140),
      'its summary says Details and comes first': (r) => void (r.head.m.summary.text = 'Show details'),
      'the block’s drawn text holds no hashed line and no warning': (r) => void (r.head.m.innerText += `\n${LINES_N[3]}`),
      'the block’s text holds every one': (r) => void (r.head.m.textContent = r.head.m.textContent.replace(HONESTY, ''))
    },
    refused: [
      { what: 'Details drawn with an open attribute', clause: 'Details is shut, with no open attribute, and is the block’s one disclosure', edit: (r) => void (r.head.m.details.hasOpenAttr = true) },
      { what: 'a second disclosure in the block', clause: 'Details is shut, with no open attribute, and is the block’s one disclosure', edit: (r) => void (r.head.m.detailsCount = 2) },
      { what: 'the confirm warning drawn at rest', clause: 'the block’s drawn text holds no hashed line and no warning', edit: (r) => void (r.head.m.innerText += `\n${CONFIRM_WARNING}`) },
      { what: 'a status with no lines to look for', clause: 'the block’s drawn text holds no hashed line and no warning', edit: (r) => void (r.head.status.confirmLines = []) }
    ]
  },
  N4: {
    pass: { head: { kb: KB(LINES_N) }, parent: { lines: [...LINES_N], warnings: [...WARNINGS] } },
    breaks: {
      'Allow took the focus': (r) => void (r.head.kb.allowFocused = false),
      'one trusted Tab put the focus on Details’ summary': (r) => void (r.head.kb.afterTab = 'button'),
      'one trusted Enter opened it': (r) => void (r.head.kb.openAfterEnter = false),
      'main’s status did not move across the read': (r) => void (r.head.kb.statusSame = false),
      'every line in Details is confirmLines, byte for byte, in order': (r) => void (r.head.kb.lines = LINES_N.slice(0, 3)),
      'the warnings are the confirm warning and the honesty sentence': (r) => void (r.head.kb.warnings = [HONESTY, CONFIRM_WARNING]),
      'both are the parent block’s own, byte for byte': (r) => void (r.parent.lines = LINES_N.slice(1))
    },
    refused: [
      { what: 'Details already open before the Enter', clause: 'one trusted Enter opened it', edit: (r) => void (r.head.kb.openBefore = true) },
      { what: 'an empty Details', clause: 'every line in Details is confirmLines, byte for byte, in order', edit: (r) => Object.assign(r.head.kb, { lines: [], statusLines: [] }) },
      { what: 'the Funnel right left out while Funnel asks approval', clause: 'the warnings are the confirm warning and the honesty sentence', edit: (r) => void (r.head.kb.asksApproval = true) },
      { what: 'a parent whose honesty sentence differs', clause: 'both are the parent block’s own, byte for byte', edit: (r) => void (r.parent.warnings = [CONFIRM_WARNING, STALE_HONESTY]) }
    ]
  },
  N5: {
    pass: { head: { clicked: true, done: true, ms: 1_400, blocks: 0, confirmState: 'confirmed', publishState: 'published', state: 'listening', publicName: PUBLIC_NAME, routesWaiting: [] } },
    breaks: {
      'Allow was clicked on the real element': (r) => void (r.head.clicked = false),
      'no confirm block after it': (r) => void (r.head.blocks = 1),
      'confirmed, and step 2 published': (r) => void (r.head.confirmState = 'never'),
      'within 10 s': (r) => void (r.head.ms = 12_000)
    },
    refused: [
      { what: 'an Allow that never took effect', clause: 'within 10 s', edit: (r) => Object.assign(r.head, { done: false, ms: null }) },
      { what: 'step 2 still asking', clause: 'confirmed, and step 2 published', edit: (r) => void (r.head.publishState = 'confirm') }
    ]
  },
  C1: {
    pass: { head: { m: MODEL.c(), status: STATUS_C, program: WRAPPER }, parent: { m: MODEL.cParent() } },
    breaks: {
      'the moved name reads changed, and step 2 says so': (r) => void (r.head.status.confirmState = 'confirmed'),
      'exactly one confirm block, its face whole, the four labels in order': (r) => void (r.head.m.face = 'new'),
      'Reachable at names the moved name and the port': (r) => void (r.head.m.dds[0].text = reachOf(PUBLIC_NAME, 8443, WRAPPER)),
      'Phones is the paired phone': (r) => void (r.head.m.dds[2].text = NO_PHONE),
      'Alerts off': (r) => void (r.head.m.dds[3].text = ALERTS_ON),
      'main’s confirmFace is the drawn words': (r) => void (r.head.status.confirmFace.rows[0].value = 'x'),
      'at 760 px the block is shorter than the parent’s': (r) => void (r.parent.m.block.h = 120)
    },
    refused: [
      { what: 'step 2 reading Read, then allow over a changed door', clause: 'the moved name reads changed, and step 2 says so', edit: (r) => void (r.head.m.stateWord = STATE_READ_ALLOW) },
      { what: 'a Phones row drawn twice', clause: 'Phones is the paired phone', edit: (r) => void r.head.m.dds.push({ ...r.head.m.dds[2] }) }
    ]
  },
  C2: {
    pass: { head: { kb: KB(LINES_C_HEAD) }, parent: { lines: [...LINES_C_PARENT] } },
    breaks: {
      'opened by the keyboard': (r) => void (r.head.kb.afterTab = 'allow'),
      'every line in Details is confirmLines, byte for byte': (r) => void (r.head.kb.lines = LINES_C_HEAD.slice(1)),
      'the first line names the moved name': (r) => void (r.head.kb.lines[0] = r.head.kb.statusLines[0] = LINES_N[0]),
      'the parent’s block holds the same lines, each key masked': (r) => void (r.parent.lines = r.parent.lines.slice(0, -1))
    },
    refused: [{ what: 'the parent’s lines differing in more than a key', clause: 'the parent’s block holds the same lines, each key masked', edit: (r) => void (r.parent.lines[2] = 'Answers only after you turn it on') }]
  },
  C3: {
    pass: { head: { clicked: true, done: true, ms: 2_100, blocks: 0, confirmState: 'confirmed', state: 'listening', publicName: MOVED_NAME, publishState: 'published', routesWaiting: [] } },
    breaks: {
      'Allow was clicked on the real element': (r) => void (r.head.clicked = false),
      'no confirm block after it': (r) => void (r.head.blocks = 1),
      'confirmed and published at the moved name': (r) => void (r.head.publicName = PUBLIC_NAME),
      'within 10 s': (r) => void (r.head.ms = 15_000)
    },
    refused: [{ what: 'the door still shut after the Allow', clause: 'confirmed and published at the moved name', edit: (r) => void (r.head.state = 'refused') }]
  },
  W1: {
    pass: { head: { presses: [], published: true, m: MODEL.w(), status: STATUS_W }, parent: { m: MODEL.wParent() } },
    breaks: {
      'published at launch with no press': (r) => void (r.head.presses = ['click Allow']),
      'confirmed, with probe waiting': (r) => void (r.head.status.routesWaiting = []),
      'step 2 reads Published, with one block in it': (r) => void (r.head.m.stateWord = STATE_READ_ALLOW),
      'the face is new, with no rows': (r) => void (r.head.m.face = 'whole'),
      'New: probe, and no sentence': (r) => void (r.head.m.news[0].sentence = 'Your phone could start Claude Code or Codex in a project here.'),
      'Allow on the title’s line, at the block’s right edge': (r) => void shift(r.head.m.allow.r, 0, 60),
      'main’s confirmFace is the drawn words': (r) => void (r.head.status.confirmFace.added[0].title = 'New: Probe'),
      'shorter than the parent’s block': (r) => void (r.parent.m.block.h = 40)
    },
    refused: [
      // THE ATTACK (SPEC §Attack A6): a route with no title row must still be named.
      { what: 'the waiting route left off the face', clause: 'New: probe, and no sentence', edit: (r) => void (r.head.m.news = []) },
      { what: 'the id fallback dropped, `New: ` and nothing', clause: 'New: probe, and no sentence', edit: (r) => void (r.head.m.news[0].title = `${NEW_WORD}: `) },
      { what: 'the parent’s whole block under Published', clause: 'the face is new, with no rows', edit: (r) => void (r.head.m = MODEL.wParent()) },
      { what: 'Allow at the block’s left', clause: 'Allow on the title’s line, at the block’s right edge', edit: (r) => void shift(r.head.m.allow.r, -300) },
      { what: 'a status where main composed rows for a confirmed door', clause: 'main’s confirmFace is the drawn words', edit: (r) => void (r.head.status.confirmFace = faceOf(ROWS_C, [{ ...NEW_PROBE }])) }
    ]
  },
  W2: {
    pass: { head: { kb: KB(LINES_W) } },
    breaks: {
      'opened by the keyboard': (r) => void (r.head.kb.openAfterEnter = false),
      'every line in Details is confirmLines, byte for byte': (r) => void (r.head.kb.lines = [...LINES_C_HEAD]),
      'the route line names probe': (r) => Object.assign(r.head.kb, { lines: [...LINES_C_HEAD], statusLines: [...LINES_C_HEAD] }),
      'the warnings are the confirm warning and today’s honesty sentence': (r) => void (r.head.kb.warnings = [CONFIRM_WARNING, STALE_HONESTY])
    },
    refused: [{ what: 'an honesty sentence with a clause added for the waiting route', clause: 'the warnings are the confirm warning and today’s honesty sentence', edit: (r) => void (r.head.kb.warnings[1] = HONESTY.replace(' and end a session.', ', end a session and probe one.')) }]
  },
  W3: {
    pass: { head: { clicked: true, done: true, ms: 800, routesWaiting: [], blocks: 0, state: 'listening', confirmState: 'confirmed', publishState: 'published', publicName: MOVED_NAME, pids: { ...PIDS } } },
    breaks: {
      'Allow was clicked on the real element': (r) => void (r.head.clicked = false),
      'nothing waits within 10 s': (r) => void (r.head.routesWaiting = [PLANTED]),
      'no block, and still published': (r) => void (r.head.blocks = 1),
      'the door and the Funnel child did not restart': (r) => void (r.head.pids.funnelAfter = 999)
    },
    refused: [
      { what: 'the door process restarted by the Allow', clause: 'the door and the Funnel child did not restart', edit: (r) => void (r.head.pids.doorAfter = 777) },
      { what: 'pids never read', clause: 'the door and the Funnel child did not restart', edit: (r) => void (r.head.pids = { doorBefore: 0, doorAfter: 0, funnelBefore: 0, funnelAfter: 0 }) },
      { what: 'the door shut after the Allow', clause: 'no block, and still published', edit: (r) => void (r.head.state = 'refused') }
    ]
  },
  RD: {
    pass: {
      head: { needles: [ELEVEN_LINE, WRITE_LINE, HONESTY], innerText: MODEL.n().innerText, textContent: MODEL.n().textContent },
      parent: { needles: [ELEVEN_LINE, WRITE_LINE, HONESTY], innerText: MODEL.nParent().innerText, textContent: MODEL.nParent().textContent },
      probes: PROBE_FILES.map((file) => ({ file, count: 1, textContent: true, innerText: false }))
    },
    breaks: {
      'textContent holds the route line, the write line and the honesty sentence at both builds': (r) => void (r.parent.textContent = r.parent.textContent.replace(WRITE_LINE, '')),
      'innerText holds all three at the parent': (r) => void (r.parent.innerText = BTN_ALLOW),
      'innerText holds none of them at HEAD': (r) => void (r.head.innerText += `\n${HONESTY}`),
      'probe:p317, probe:p318 and probe:p337 read the block through textContent': (r) => void Object.assign(r.probes[1], { textContent: false, innerText: true })
    },
    refused: [
      { what: 'a status with no route line to look for', clause: 'textContent holds the route line, the write line and the honesty sentence at both builds', edit: (r) => void (r.head.needles = [WRITE_LINE, HONESTY]) },
      { what: 'a probe whose read of the block is gone', clause: 'probe:p317, probe:p318 and probe:p337 read the block through textContent', edit: (r) => void (r.probes[2].count = 0) },
      { what: 'a probe that reads the block twice', clause: 'probe:p317, probe:p318 and probe:p337 read the block through textContent', edit: (r) => void (r.probes[0].count = 2) },
      { what: 'two probes, not three', clause: 'probe:p317, probe:p318 and probe:p337 read the block through textContent', edit: (r) => void r.probes.pop() }
    ]
  },
  RUN: {
    pass: {
      launches: 4,
      tailscalePreflights: [true, true, true, true],
      dnsPreflights: [true, true, true, true],
      agentsPrecheck: [true, true, true, true],
      agentsScan: [true, true, true, true],
      samples: 300,
      realTailscale: 0,
      forbidden: 0,
      refusedArgv: 0,
      udpSamples: 150,
      udpLeaks: 0,
      questionProblems: [],
      electronLeft: 0,
      standinLeft: 0,
      socketGone: true,
      historySame: true,
      profilesLaunched: 2,
      appLogsRead: 2,
      appLogHits: 0
    },
    breaks: {
      'the Tailscale preflight held at every launch': (r) => void (r.tailscalePreflights[2] = false),
      'the DNS preflight held at every launch': (r) => void (r.dnsPreflights[0] = false),
      'the hidden agents were renamed and read back at every launch': (r) => void (r.agentsScan[3] = false),
      'no real Tailscale in any sample, nothing forbidden or refused at the stand-in': (r) => void (r.realTailscale = 1),
      'main’s UDP went to 127.0.0.1 alone, and every name question was an A, RD 0, for the stand-in’s names': (r) => void (r.udpLeaks = 1),
      'no Electron or stand-in of this run is left': (r) => void (r.electronLeft = 2),
      'the scratch socket file is gone': (r) => void (r.socketGone = false),
      'his two history files did not move': (r) => void (r.historySame = false),
      'no app.log holds a one-shot secret or a PEM line': (r) => void (r.appLogHits = 1)
    },
    refused: [
      { what: 'a launch with no Tailscale preflight', clause: 'the Tailscale preflight held at every launch', edit: (r) => void r.tailscalePreflights.pop() },
      { what: 'a recursive name question', clause: 'main’s UDP went to 127.0.0.1 alone, and every name question was an A, RD 0, for the stand-in’s names', edit: (r) => void (r.questionProblems = ['1 question(s) asked for recursion']) },
      { what: 'one profile’s app.log never read', clause: 'no app.log holds a one-shot secret or a PEM line', edit: (r) => void (r.appLogsRead = 1) },
      { what: 'a stand-in left running', clause: 'no Electron or stand-in of this run is left', edit: (r) => void (r.standinLeft = 1) },
      { what: 'no sample of the process table at all', clause: 'no real Tailscale in any sample, nothing forbidden or refused at the stand-in', edit: (r) => void (r.samples = 0) }
    ]
  }
};

// ---------------------------------------------------------------------------
// THE SELF-TEST. Grades recorded fixtures, reads the tree, starts nothing.
// ---------------------------------------------------------------------------

/** The single-quoted literals of `export const <name> = …;` in `text`, joined, or null (probe:p33312's reader). */
function constLiteral(text, name) {
  const at = text.indexOf(`export const ${name} =`);
  if (at < 0) return null;
  const end = text.indexOf(';', at);
  const body = text.slice(at, end < 0 ? undefined : end).replace(/\/\*[\s\S]*?\*\//g, '');
  const parts = [...body.matchAll(/'((?:[^'\\]|\\.)*)'/g)].map((m) => m[1]);
  return parts.length === 0 ? null : parts.join('');
}

/** `POCKET_FACE_CLAUSES`' entries as `[id, clause | null]`, in the tree's key order, or null. */
function faceClausesOf(text) {
  const at = text.indexOf('export const POCKET_FACE_CLAUSES');
  if (at < 0) return null;
  const open = text.indexOf('Object.freeze({', at);
  const close = open < 0 ? -1 : text.indexOf('});', open);
  if (open < 0 || close < 0) return null;
  const body = text.slice(open + 'Object.freeze({'.length, close).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  return [...body.matchAll(/(\w+):\s*(?:'([^']*)'|null)/g)].map((m) => [m[1], m[2] ?? null]);
}

/** The shipping face program rule, read as its regular expression literal out of the tree's text, or null. */
function shippedProgramRule(text) {
  const m = /export function pocketFaceProgram\(path: string\): string \{\s*const app = \/(.+)\/\.exec\(path\);\s*return app === null \? path : \(app\[1\] \?\? path\);/.exec(text);
  if (m === null) return null;
  const re = new RegExp(m[1]);
  return (path) => {
    const app = re.exec(path);
    return app === null ? path : (app[1] ?? path);
  };
}

function graderSelfTest() {
  let failures = 0;
  let checks = 0;
  const say = (ok, text) => {
    checks += 1;
    if (!ok) failures += 1;
    process.stdout.write(`${ok ? 'ok  ' : 'FAIL'} ${text}\n`);
  };
  // 1. Every grader on its fixtures: honest green, each clause red on its own break.
  const clauses = gradeFixtures({ graders: GRADERS, fixtures: GRADER_FIXTURES, grade, clone: (x) => structuredClone(x), say, J });
  say(J(Object.keys(GRADERS)) === J(ARM_IDS), `a grader for every arm, in order (${ARM_IDS.join(', ')})`);
  say(ARM_IDS.every((id) => Object.hasOwn(LAUNCH_OF, id)) && NEEDS_PARENT.every((id) => ARM_IDS.includes(id)), 'every arm names the launch it is read in, and every arm that needs the parent is an arm');

  // 2. The pure readers on cases of their own.
  const corpus = [
    APP_PROGRAM,
    '/Applications/Tailscale.app/Contents/MacOS/tailscale',
    '/Applications/My Tools.app/Contents/MacOS/x',
    '/opt/homebrew/bin/tailscale',
    '/usr/local/bin/tailscale',
    WRAPPER,
    '',
    '/Applications/.app/Contents/MacOS/x',
    '/Applications/Tailscale.app/Contents/MacOS/sub/Tailscale',
    '/Applications/Tailscale.app/Contents/MacOS/',
    'Applications/Tailscale.app/Contents/MacOS/Tailscale',
    '/Users/x/Applications/Tailscale.app/Contents/MacOS/Tailscale',
    '/Applications/Tailscale.application/Contents/MacOS/Tailscale',
    '/Applications/Tail.app.app/Contents/MacOS/Tailscale'
  ];
  say(programName(APP_PROGRAM) === 'Tailscale' && programName('/opt/homebrew/bin/tailscale') === '/opt/homebrew/bin/tailscale' && programName('/usr/local/bin/tailscale') !== programName('/opt/homebrew/bin/tailscale') && programName('') === '' && programName(null) === '', 'programName: the app by its name, any other path whole, so a move between /usr/local and /opt/homebrew shows (D4, §Attack A2)');
  say(reachOf(PUBLIC_NAME, 8443, APP_PROGRAM) === `${PUBLIC_NAME}:8443, by Tailscale` && reachOf(PUBLIC_NAME, 10000, '') === `${PUBLIC_NAME}:10000` && reachOf(PUBLIC_NAME, 8443, WRAPPER) === `${PUBLIC_NAME}:8443, by ${WRAPPER}`, 'reachOf: name, port, and `, by` only with a program');
  const contract = readTree('src/shared/ipc/pocket.ts');
  const shipped = shippedProgramRule(contract);
  const disagree = shipped === null ? corpus : corpus.filter((p) => shipped(p) !== programName(p));
  say(shipped !== null && disagree.length === 0, `this file's D4 and the tree's pocketFaceProgram agree over ${String(corpus.length)} paths (${shipped === null ? 'the tree has no pocketFaceProgram of the expected shape yet' : `disagreeing on ${J(disagree)}`})`);
  say(maskKeys(LINES_C_HEAD[6]) === maskKeys(LINES_C_PARENT[6]) && LINES_C_HEAD[6] !== LINES_C_PARENT[6] && maskKeys('key 1a2b 3c4d') === 'key 1a2b 3c4d' && maskKeys(LINES_N[0]) === LINES_N[0], 'maskKeys masks a whole six-group key and nothing else');
  say(J(routeLineOf(LINES_W)) === J(['blocked', 'choose', 'end', 'keys', 'pair', 'probe', 'say', 'screen', 'scrollback', 'session', 'sessions', 'turns']) && !(routeLineOf(LINES_N) ?? []).includes(PLANTED) && routeLineOf(['no route line']) === null, 'routeLineOf reads the route line’s items');
  say(lineStarting(LINES_N, WRITE_PREFIX) === WRITE_LINE && lineStarting(LINES_N, 'nothing') === null && lineStarting(null, WRITE_PREFIX) === null, 'lineStarting finds the write line');
  say(allIn('a b c', ['a', 'c']) && !allIn('a b', ['a', 'z']) && !allIn('a', []) && !allIn('a', ['']) && !allIn(null, ['a']) && noneIn('a b', ['z']) && !noneIn('a b', ['b']) && !noneIn('a', []) && !noneIn(null, ['z']), 'allIn and noneIn: never true over no needles, an empty needle or no text');
  say(linesEqual(['a'], ['a']) && !linesEqual([], []) && !linesEqual(['a'], ['b']) && !linesEqual(null, ['a']), 'linesEqual: non-empty and byte for byte');
  say(samePids({ ...PIDS }) && !samePids({ ...PIDS, doorAfter: 9 }) && !samePids({ doorBefore: 0, doorAfter: 0, funnelBefore: 0, funnelAfter: 0 }) && !samePids(null), 'samePids: both found, neither moved');
  say(shorterThanParent(MODEL.n(), MODEL.nParent()) && !shorterThanParent(MODEL.n(640), MODEL.nParent()) && !shorterThanParent(MODEL.n(), { ...MODEL.nParent(), innerHeight: 560 }) && !shorterThanParent(MODEL.n(), MODEL.n()) && !shorterThanParent(MODEL.n(), null), 'shorterThanParent compares only two 760 by 2,000 readings, and only shorter');
  say(WIDTHS.every((w) => Object.values(faceGeometryProblems(MODEL.n(w))).every((v) => v.length === 0)) && Object.values(faceGeometryProblems(MODEL.c())).every((v) => v.length === 0), 'faceGeometryProblems: the model face is clean at every width');
  say(Object.values(faceGeometryProblems(null)).every((v) => v.length > 0) && Object.values(faceGeometryProblems(MODEL.nParent())).some((v) => v.length > 0), 'faceGeometryProblems: no block, or today’s block, is never a clean face');
  say(faceMatchesDrawn(faceOf(ROWS_N), MODEL.n()) && faceMatchesDrawn(faceOf([], [{ ...NEW_PROBE }]), MODEL.w()) && !faceMatchesDrawn(faceOf(ROWS_C), MODEL.n()) && !faceMatchesDrawn(faceOf(ROWS_N, [{ ...NEW_PROBE }]), MODEL.n()) && !faceMatchesDrawn(undefined, MODEL.n()) && !faceMatchesDrawn(faceOf(ROWS_N), MODEL.nParent()), 'faceMatchesDrawn: rows and waiting routes, both ways, and no face at the parent');
  const kb = KB(LINES_N);
  say(kbOpened(kb) && !kbOpened({ ...kb, allowFocused: false }) && !kbOpened({ ...kb, afterTab: 'allow' }) && !kbOpened({ ...kb, openBefore: true }) && !kbOpened({ ...kb, openBefore: null }) && !kbOpened({ ...kb, openAfterEnter: false }) && !kbOpened(null), 'kbOpened: Allow focused, Tab on the summary, a shut Details opened by Enter, each required');
  const swapped = MODEL.n();
  swapped.dds[0].key = 'can';
  say(!faceMatchesDrawn(faceOf([], [{ ...NEW_PROBE, title: `${NEW_WORD}: other` }]), MODEL.w()) && !faceMatchesDrawn(faceOf([], [{ ...NEW_PROBE, sentence: 'x' }]), MODEL.w()) && !faceMatchesDrawn(faceOf(ROWS_N), swapped) && valueOf(swapped, 'reach') === null, 'faceMatchesDrawn reads each waiting route’s title and sentence, and a value under another row’s key');
  const files = new Map([['/c/out/main/index.js', 100], ['/c/src/renderer/settings/phone-section.css', 50], ['/c/src/renderer/settings/settings.css', 150]]);
  const fakeFs = { exists: (path) => files.has(path), mtimeMs: (path) => files.get(path) };
  const staleRead = staleExtraProblems('/c', fakeFs);
  say(staleRead.length === 1 && staleRead[0].includes('src/renderer/settings/settings.css') && !staleRead[0].includes('phone-section.css') && isEmptyList(staleExtraProblems('/none', fakeFs)), 'staleExtraProblems names a sheet file newer than the bundle, and nothing for an unbuilt checkout (checkoutProblems refuses that)');
  say(J(launchesFor(['N1'])) === J(['L1']) && J(launchesFor(['W2'])) === J(['L1', 'L2']) && J(launchesFor(ARM_IDS)) === J(['L1', 'L2']) && J(launchesFor(['RUN', 'RD'])) === J(['L1']), 'launchesFor runs L1 always and L2 only for a W arm');
  say(J(expectedWarnings(false)) === J([CONFIRM_WARNING, HONESTY]) && J(expectedWarnings(true)) === J([CONFIRM_WARNING, HONESTY, FUNNEL_RIGHT]), 'expectedWarnings: today’s order, the Funnel right only while it asks');
  say(socketPathOf('gmux-p333121-x-1', {}, 501) === '/private/tmp/tmux-501/gmux-p333121-x-1', 'socketPathOf (probe:p33312’s) names tmux’s own place for the socket');
  const row = { at: 1, id: 7, rd: 0, qname: PUBLIC_NAME, qtype: QTYPE.A, qclass: 1, answered: 'record' };
  say(isEmptyList(questionsProblems([row, { ...row, qname: MOVED_NAME, answered: 'nx' }])) && questionsProblems([{ ...row, rd: 1 }]).length > 0, 'questionsProblems (probe:p33312’s) takes A, RD 0, for the stand-in’s name and the moved one');
  const secret = 'e'.repeat(43);
  say(secretHits(`x ${secret} y`, [secret]) === 1 && secretHits('nothing', [secret]) === 0, 'secretHits (probe:p33312’s) counts a long needle');

  // 3. The three probes D14 moved, read as text, and the reader on its own breaks.
  for (const file of PROBE_FILES) {
    const reads = confirmReadsOf(readTree(file));
    say(reads.count === 1 && reads.textContent && !reads.innerText, `${file} reads [data-phone-confirm] once, through textContent and never innerText (${J(reads)})`);
  }
  const line = "            const text = await cdpEval(settings, `(() => { const b = document.querySelector('section[aria-label=\"Phone\"] [data-phone-confirm]'); return b === null ? null : b.textContent; })()`);";
  const old = line.replace('b.textContent', 'b.innerText');
  say(J(confirmReadsOf(line)) === J({ count: 1, textContent: true, innerText: false }) && confirmReadsOf(old).innerText === true && confirmReadsOf(old).textContent === false && confirmReadsOf(`${line}\n${line}`).count === 2 && confirmReadsOf('').count === 0, 'confirmReadsOf sees innerText, a second read and no read at all');

  // The page expressions compile as JavaScript (they are parsed, never run: there is no page here).
  const compiles = (expr) => {
    try {
      // eslint-disable-next-line no-new-func
      new Function(`return ${expr};`);
      return true;
    } catch {
      return false;
    }
  };
  say([MEASURE, ACTIVE_IS, FOCUS_ALLOW, DETAILS_OPEN].every(compiles) && !compiles('(() => { const a = ; })()'), 'the four page expressions the run evaluates over CDP compile');
  say(MEASURE.includes(J(SECTION)) && ACTIVE_IS.includes(J(SUMMARY_SEL)) && ACTIVE_IS.includes(J(ALLOW_SEL)) && FOCUS_ALLOW.includes(J(ALLOW_SEL)) && DETAILS_OPEN.includes(J(DETAILS_SEL)) && KEYS.Tab.windowsVirtualKeyCode === 9 && KEYS.Enter.windowsVirtualKeyCode === 13 && KEYS.Enter.text === '\r' && KEYS.Tab.text === undefined, 'the page expressions name the block’s selectors, and the two keys are Tab (9, no text) and Enter (13, carrying \\r)');

  // 4. The words spelled here against the tree they stand for.
  const sheet = readTree(SHEET_FILE);
  const steps = readTree('src/renderer/settings/phone/steps.ts');
  const pairing = readTree('src/main/pocket/pairing.ts');
  const words = [
    ['CONFIRM_WARNING', CONFIRM_WARNING, constLiteral(contract, 'POCKET_CONFIRM_WARNING')],
    ['HONESTY', HONESTY, constLiteral(contract, 'POCKET_DOOR_HONESTY')],
    ['FUNNEL_RIGHT', FUNNEL_RIGHT, constLiteral(contract, 'POCKET_FUNNEL_RIGHT_WARNING')],
    ['LABELS[0]', LABELS[0], constLiteral(contract, 'POCKET_FACE_REACH')],
    ['LABELS[1]', LABELS[1], constLiteral(contract, 'POCKET_FACE_CAN')],
    ['LABELS[2]', LABELS[2], constLiteral(contract, 'POCKET_FACE_PHONES')],
    ['LABELS[3]', LABELS[3], constLiteral(contract, 'POCKET_FACE_ALERTS')],
    ['NO_PHONE', NO_PHONE, constLiteral(contract, 'POCKET_FACE_NO_PHONE')],
    ['ALERTS_ON', ALERTS_ON, constLiteral(contract, 'POCKET_FACE_ALERTS_ON')],
    ['ALERTS_OFF', ALERTS_OFF, constLiteral(contract, 'POCKET_FACE_ALERTS_OFF')],
    ['NEW_WORD', NEW_WORD, constLiteral(contract, 'POCKET_FACE_NEW')],
    ['DETAILS_WORD', DETAILS_WORD, constLiteral(sheet, 'DISCLOSE_DETAILS')],
    ['BTN_ALLOW', BTN_ALLOW, constLiteral(sheet, 'BTN_ALLOW')],
    ['STATE_READ_ALLOW', STATE_READ_ALLOW, constLiteral(steps, 'STATE_READ_ALLOW')],
    ['STATE_CHANGED', STATE_CHANGED, constLiteral(steps, 'STATE_CHANGED')],
    ['STATE_PUBLISHED', STATE_PUBLISHED, constLiteral(steps, 'STATE_PUBLISHED')]
  ];
  for (const [name, mine, tree] of words) say(mine === tree, `${name} is the tree’s word byte for byte (${tree === null ? 'not found in the tree' : `${String(tree.length)} characters`})`);
  const clausesTree = faceClausesOf(contract);
  const legacy = ['blocked', 'choose', 'end', 'keys', 'pair', 'say', 'screen', 'scrollback', 'session', 'sessions', 'turns'];
  const canTree = clausesTree === null ? null : [...new Set(clausesTree.filter(([id, c]) => c !== null && legacy.includes(id)).map(([, c]) => c))].join(', ');
  say(canTree === CAN_ELEVEN && clausesTree.length === legacy.length && legacy.every((id) => clausesTree.some(([k]) => k === id)), `CAN_ELEVEN is POCKET_FACE_CLAUSES over the eleven, each clause once in key order (${canTree === null ? 'no table in the tree yet' : J(canTree)})`);
  say(pairing.includes(`lines.push(\`${ROUTE_PREFIX} \${`) && pairing.includes(`lines.push(\`${WRITE_PREFIX}\${`), 'ROUTE_PREFIX and WRITE_PREFIX lead describePocketDoor’s two lines');
  say(PUBLIC_NAME === DEFAULT_SCENARIO.dnsName.replace(/\.$/, '') && MOVED_NAME.endsWith('.ts.net') && MOVED_NAME !== PUBLIC_NAME, 'the stand-in’s name and the moved one are probe:p33312’s two made-up names');
  say(readTree('src/main/settings/window.ts').includes(`remembered?.width ?? ${String(OWN_WIDTH)}`) && readTree('src/main/settings/window.ts').includes('minWidth: 640'), 'OWN_WIDTH is the Settings window’s own width, and 640 its narrowest');
  say(sheet.includes(`data-phone-confirm-face={status.confirmFace.rows.length > 0 ? 'whole' : 'new'}`) && sheet.includes('<details className="set-disclosure phone-confirm-details" data-phone-confirm-details>') && sheet.includes('data-phone-face-new={route.id}') && sheet.includes('data-phone-face-value={row.key}') && sheet.includes('data-phone-face-label={row.key}'), 'the attributes the reader reads are the ones the sheet draws');

  // 5. The refusals before a launch, over this tree in memory.
  say(isEmptyList(faceBuildProblems('HEAD', sheet, true)) && faceBuildProblems('HEAD', sheet, false).length === 1 && faceBuildProblems('PARENT', sheet.split(FACE_MARK).join('data-x'), false).length === 0 && faceBuildProblems('X', null, true).length === 1, 'faceBuildProblems: a head must draw the face, a parent must not, a checkout with no sheet is refused');
  const twinFiles = [...new Set([...TWIN_FILES, ...PLANT_FILES])];
  const mine = new Map(twinFiles.map((f) => [f, readTreeOrNull(f)]));
  const plan = planPlant(new Map(PLANT_FILES.map((f) => [f, mine.get(f) ?? null])));
  if (plan.ok) {
    const planted = new Map([...mine, ...plan.out]);
    say(isEmptyList(twinProblemsOf(mine, planted)), `twinProblemsOf: this tree planted in memory is its own twin (${String(plan.out.size)} planted files)`);
    const drifted = new Map(planted);
    drifted.set(SHEET_FILE, `${planted.get(SHEET_FILE)}\n// later\n`);
    say(twinProblemsOf(mine, drifted).some((p) => p.includes(SHEET_FILE)), 'twinProblemsOf: a planted copy whose sheet moved is refused by name');
    say(twinProblemsOf(mine, mine).some((p) => p.includes('not the plan')), 'twinProblemsOf: an unplanted copy is not the plan');
    const stale = new Map(planted);
    stale.set('src/shared/ipc/pocket.ts', `${planted.get('src/shared/ipc/pocket.ts')}\n`);
    say(twinProblemsOf(mine, stale).some((p) => p.includes('src/shared/ipc/pocket.ts')), 'twinProblemsOf: a planted file that is not the plan over the twin is refused by name');
  } else {
    say(false, `the plant does not plan over this tree: ${plan.problems.join('; ')}`);
  }
  say(checkoutProblems(ROOT, { planted: null, ledger: true }).every((p) => !p.includes(MARKER)) && readMarker(ROOT) === null && markerProblems('/nonexistent-p333121', 'head').length > 0, 'this checkout carries no plant marker, and a checkout with none is refused as planted');
  say(textsOf(ROOT) instanceof Map, 'plant.mjs reads a checkout’s plant files');

  process.stdout.write(
    failures === 0
      ? `[p333121] grader self-test PASS: ${String(Object.keys(GRADERS).length)} graders, ${String(clauses)} clauses, ${String(checks)} checks, each clause shown red on its own break; nothing was started.\n`
      : `[p333121] grader self-test FAIL: ${String(failures)} of ${String(checks)} checks.\n`
  );
  return failures === 0;
}

/** A file of this tree as text, '' when absent. */
function readTree(rel) {
  try {
    return readFileSync(join(ROOT, rel), 'utf8');
  } catch {
    return '';
  }
}
/** A file of this tree as text, null when absent. */
function readTreeOrNull(rel) {
  try {
    return readFileSync(join(ROOT, rel), 'utf8');
  } catch {
    return null;
  }
}


// ===========================================================================
// THE RUN. Everything below starts processes; builders never reach it.
// ===========================================================================

/** The page-side reader: every word and rectangle of the confirm block, in one evaluation. */
const MEASURE = `(() => {
  const out = { drawn: false, innerWidth, innerHeight };
  const s = document.querySelector(${J(SECTION)});
  if (s === null) return JSON.stringify(out);
  const rect = (el) => {
    if (el === null || el === undefined) return null;
    const b = el.getBoundingClientRect();
    return { x: b.left, y: b.top, w: b.width, h: b.height, r: b.right, b: b.bottom };
  };
  const all = (sel, root) => (root === null || root === undefined ? [] : [...root.querySelectorAll(sel)]);
  const publish = s.querySelector('[data-phone-step="publish"]');
  const blocks = [...s.querySelectorAll('[data-phone-confirm]')];
  const b = blocks[0] ?? null;
  const details = b === null ? null : b.querySelector('details[data-phone-confirm-details]');
  const summary = details === null ? null : details.querySelector(':scope > summary');
  const allow = b === null ? null : b.querySelector('[data-phone-action="confirm-door"]');
  const dl = b === null ? null : b.querySelector('dl[data-phone-face]');
  const a = document.activeElement;
  Object.assign(out, {
    drawn: true,
    publishState: publish === null ? null : publish.getAttribute('data-phone-step-state'),
    stateWord: publish === null ? null : (publish.querySelector('.phone-step-state')?.textContent ?? null),
    blocks: blocks.length,
    inPublish: publish === null ? 0 : publish.querySelectorAll('[data-phone-confirm]').length,
    face: b === null ? null : b.getAttribute('data-phone-confirm-face'),
    block: rect(b),
    scrollWidth: b === null ? null : b.scrollWidth,
    clientWidth: b === null ? null : b.clientWidth,
    dl: rect(dl),
    dts: all('dt', b).map((e) => ({ key: e.getAttribute('data-phone-face-label'), text: e.textContent, r: rect(e) })),
    dds: all('dd', b).map((e) => ({ key: e.getAttribute('data-phone-face-value'), text: e.textContent, r: rect(e) })),
    news: all('[data-phone-face-new]', b).map((e) => {
      const t = e.querySelector('.phone-face-title');
      const se = e.querySelector('.phone-face-sentence');
      return { id: e.getAttribute('data-phone-face-new'), title: t === null ? null : t.textContent, titleR: rect(t), sentence: se === null ? null : se.textContent };
    }),
    allow: allow === null ? null : { r: rect(allow), disabled: allow.disabled, text: allow.textContent, inDetails: allow.closest('details') !== null },
    details: details === null ? null : { open: details.open, hasOpenAttr: details.hasAttribute('open'), r: rect(details), last: b.lastElementChild === details },
    detailsCount: b === null ? 0 : b.querySelectorAll('details').length,
    blockInDetails: b === null ? null : b.parentElement !== null && b.parentElement.closest('details') !== null,
    summary: summary === null ? null : { text: summary.textContent, r: rect(summary), first: details.firstElementChild === summary },
    lines: all('li', b).map((e) => e.textContent),
    warnings: all('p.set-config-warning', b).map((e) => e.textContent),
    detailsLines: details === null ? null : all('li', details).map((e) => e.textContent),
    detailsWarnings: details === null ? null : all('p.set-config-warning', details).map((e) => e.textContent),
    innerText: b === null ? null : b.innerText,
    textContent: b === null ? null : b.textContent,
    active: a === null ? null : summary !== null && a === summary ? 'summary' : allow !== null && a === allow ? 'allow' : a.tagName.toLowerCase()
  });
  return JSON.stringify(out);
})()`;

/** Where the keyboard's focus is, by name: `summary`, `allow`, or the element's tag. */
const ACTIVE_IS = `(() => {
  const a = document.activeElement;
  if (a === null || a === undefined) return null;
  if (a.matches(${J(SUMMARY_SEL)})) return 'summary';
  if (a.matches(${J(ALLOW_SEL)})) return 'allow';
  return a.tagName.toLowerCase();
})()`;
const FOCUS_ALLOW = `(() => { const a = document.querySelector(${J(ALLOW_SEL)}); if (a === null || a.disabled) return false; a.focus(); return document.activeElement === a; })()`;
const DETAILS_OPEN = `(() => { const d = document.querySelector(${J(DETAILS_SEL)}); return d === null ? null : d.open; })()`;
/** The two keys, as Chromium's own key events: Tab carries no text, Enter carries `\\r` so <summary> sees its keypress. */
const KEYS = Object.freeze({
  Tab: { key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9 },
  Enter: { key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13, text: '\r', unmodifiedText: '\r' }
});

async function run() {
  const TAG = '[p333121]';
  const t0 = Date.now();
  const say = (line) => console.log(`${TAG} ${((Date.now() - t0) / 1000).toFixed(1).padStart(7)}s ${line}`);
  const refuse = (why) => {
    console.error(`${TAG} REFUSED. ${why}`);
    process.exit(2);
  };

  // ---- the refusals, in the order they are asked ----------------------------
  const SOCKET = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
  const SOCKET_SHAPE = /^gmux-p333121[a-z0-9-]*-\d+$/;
  if (SOCKET === '') refuse("no GMUX_TMUX_SOCKET. Run node build/harness-socket.mjs --fresh gmux-p333121 'node build/p333121/probe-p333121.mjs'.");
  if (SOCKET === 'gmux' || SOCKET === 'default' || !SOCKET_SHAPE.test(SOCKET)) refuse(`"${SOCKET}" is not a gmux-p333121 harness socket ending in its pid.`);
  const HARNESS_DIR_GIVEN = (process.env['GMUX_HARNESS_DIR'] ?? '').trim();
  if (HARNESS_DIR_GIVEN === '' || !existsSync(HARNESS_DIR_GIVEN)) refuse('no GMUX_HARNESS_DIR, so there is nowhere scratch to put the HOME and the profiles.');
  const REAL_HOME = (() => {
    try {
      return userInfo().homedir;
    } catch {
      return '';
    }
  })();
  if (REAL_HOME === '') refuse('his home could not be named, so his history could not be watched.');
  const historyStat = () =>
    ['.zsh_history', '.bash_history']
      .map((name) => {
        try {
          const s = statSync(join(REAL_HOME, name));
          return `${String(s.size)} ${String(Math.floor(s.mtimeMs / 1000))}`;
        } catch {
          return 'absent';
        }
      })
      .join('|');
  const HISTORY_BEFORE = historyStat();

  const named = (name) => {
    const v = (process.env[name] ?? '').trim();
    if (v === '') refuse(`${name} is not set. The run needs all four builds (SPEC §7.2).`);
    try {
      return realpathSync(v);
    } catch {
      return refuse(`${name}=${v} does not exist.`);
    }
  };
  const HEAD = realpathSync(ROOT);
  const PARENT = named('P333121_PARENT_CHECKOUT');
  const PARENT_PLANTED = named('P333121_PARENT_PLANTED');
  const HEAD_PLANTED = named('P333121_HEAD_PLANTED');
  const BUILDS = { PARENT, PARENT_PLANTED, HEAD, HEAD_PLANTED };
  if (new Set(Object.values(BUILDS)).size !== 4) refuse(`the four builds must be four checkouts: ${J(BUILDS)}`);
  const readAt = (dir, rel) => {
    try {
      return readFileSync(join(dir, rel), 'utf8');
    } catch {
      return null;
    }
  };
  const textsAt = (dir) => new Map([...new Set([...TWIN_FILES, ...PLANT_FILES])].map((f) => [f, readAt(dir, f)]));
  const buildProblems = [
    ...checkoutProblems(PARENT, { planted: null, ledger: true }).map((p) => `PARENT: ${p}`),
    ...checkoutProblems(PARENT_PLANTED, { planted: 'head', ledger: true }).map((p) => `PARENT_PLANTED: ${p}`),
    ...checkoutProblems(HEAD, { planted: null, ledger: true }).map((p) => `HEAD: ${p}`),
    ...checkoutProblems(HEAD_PLANTED, { planted: 'head', ledger: true }).map((p) => `HEAD_PLANTED: ${p}`),
    ...Object.entries(BUILDS).flatMap(([k, dir]) => staleExtraProblems(dir).map((p) => `${k}: ${p}`)),
    ...faceBuildProblems('PARENT', readAt(PARENT, SHEET_FILE), false),
    ...faceBuildProblems('PARENT_PLANTED', readAt(PARENT_PLANTED, SHEET_FILE), false),
    ...faceBuildProblems('HEAD', readAt(HEAD, SHEET_FILE), true),
    ...faceBuildProblems('HEAD_PLANTED', readAt(HEAD_PLANTED, SHEET_FILE), true),
    ...twinProblemsOf(textsAt(PARENT), textsAt(PARENT_PLANTED)).map((p) => `PARENT_PLANTED: ${p}`),
    ...twinProblemsOf(textsAt(HEAD), textsAt(HEAD_PLANTED)).map((p) => `HEAD_PLANTED: ${p}`)
  ];
  if (buildProblems.length > 0) refuse(buildProblems.join('\n  '));
  const versionOf = (dir) => {
    try {
      return JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')).version ?? null;
    } catch {
      return null;
    }
  };
  const ARMS = (process.env['P333121_ARMS'] ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const unknownArms = ARMS.filter((id) => !ARM_IDS.includes(id));
  if (unknownArms.length > 0) refuse(`P333121_ARMS names ${J(unknownArms)}, which are not arms of this probe (${ARM_IDS.join(', ')}).`);
  const PICKED = ARMS.length === 0 ? [...ARM_IDS] : [...new Set([...ARMS, 'RUN'])];
  const wants = (id) => PICKED.includes(id);
  const LAUNCHES = launchesFor(PICKED);
  const KEEP = (process.env['P333121_KEEP'] ?? '') === '1';
  const TMUX = existsSync(join(HEAD, 'build', 'vendor', 'tmux', 'bin', 'tmux')) ? join(HEAD, 'build', 'vendor', 'tmux', 'bin', 'tmux') : 'tmux';

  // ---- the scratch world ----------------------------------------------------
  const HARNESS = realpathSync(HARNESS_DIR_GIVEN);
  const RUN = join(HARNESS, 'p333121');
  rmSync(RUN, { recursive: true, force: true });
  mkdirSync(RUN, { recursive: true, mode: 0o700 });
  const HOME = join(RUN, 'home');
  /** One profile per world, INSIDE the harness directory, the parent's first. */
  const PROFILES = Object.freeze({ parent: join(RUN, 'profile-parent'), head: join(RUN, 'profile-head') });
  /** OUTSIDE the profiles, so the helper's profile sweep never takes the stand-in's children for the app's. */
  const STANDIN_DIR = join(RUN, 'standin');
  const OUT = join(ROOT, 'out', 'p333121');
  const WORLDS = Object.freeze([
    { key: 'parent', B: PARENT, BP: PARENT_PLANTED, profile: PROFILES.parent },
    { key: 'head', B: HEAD, BP: HEAD_PLANTED, profile: PROFILES.head }
  ]);

  const report = { root: ROOT, builds: Object.fromEntries(Object.entries(BUILDS).map(([k, v]) => [k, { dir: v, version: versionOf(v) }])), picked: PICKED, launches: [], arms: [], readings: {} };
  let failures = 0;
  let unreadable = 0;
  const graded = new Set();

  // ---- what the report must never carry, and app.log must never hold ---------
  const SECRETS = new Set();
  const remember = (value) => {
    if (typeof value === 'string' && value.length >= 12) SECRETS.add(value);
  };
  const unsecret = (text) => [...SECRETS].reduce((t, s) => t.split(s).join('<secret>'), String(text));
  /** Every written byte: one-shot secrets removed and every key fingerprint masked. */
  const scrub = (text) => maskKeys(unsecret(text));

  const arm = (id, reading) => {
    if (!wants(id)) {
      report.readings[id] = reading;
      say(`not asked ${id} (P333121_ARMS); its reading is kept`);
      return;
    }
    const g = grade(id, reading);
    graded.add(id);
    report.arms.push({ id, ok: g.ok, failed: g.failed, title: GRADERS[id].title });
    report.readings[id] = reading;
    if (!g.ok) failures += 1;
    say(`${g.ok ? 'PASS' : 'FAIL'} ${id}: ${GRADERS[id].title}${g.ok ? '' : `; FAILED ${J(g.failed)}`}`);
  };
  const cannotRead = (id, why, reading = undefined) => {
    if (!wants(id) || graded.has(id)) return;
    graded.add(id);
    unreadable += 1;
    report.arms.push({ id, ok: null, said: why });
    if (reading !== undefined) report.readings[id] = reading;
    say(`UNREADABLE ${id}: ${why}`);
  };

  // ---- the guards -------------------------------------------------------------
  let standin = null;
  let dns = null;
  let watch = null;
  let lastShim = 0;
  let lastApp = 0;
  /** The profile of the launch now up, for its DevToolsActivePort. */
  let currentProfile = PROFILES.parent;
  const tailscalePreflights = [];
  const dnsPreflights = [];
  const agentsPrecheck = [];
  const agentsScan = [];
  const launchRecords = [];
  const presses = [];
  const statuses = [];
  const doms = [];
  const strays = [];
  const udp = { samples: 0, leaks: [], seen: new Set() };
  const udpPeerOf = (name) => {
    const i = String(name).indexOf('->');
    return i < 0 ? null : String(name).slice(i + 2);
  };
  const sampleUdp = () => {
    const pid = lastApp;
    if (!(pid > 0)) return;
    const r = spawnSync('/usr/sbin/lsof', ['-a', '-p', String(pid), '-iUDP', '-n', '-P', '-F', 'n'], { encoding: 'utf8', timeout: 10_000 });
    udp.samples += 1;
    for (const name of (r.stdout ?? '').split('\n').filter((l) => l.startsWith('n')).map((l) => l.slice(1))) {
      udp.seen.add(name.replace(/:(\d+|\*)(?=->|$)/g, ':*'));
      const peer = udpPeerOf(name);
      if (peer !== null && !/^127\.0\.0\.1:\d+$/.test(peer)) udp.leaks.push({ at: Date.now(), name });
    }
  };
  const udpTimer = setInterval(sampleUdp, 2_000);
  udpTimer.unref?.();
  const stopIfLeaked = () => {
    if (udp.leaks.length > 0) throw new Error(`main sent UDP to something that is not 127.0.0.1: ${J(udp.leaks.slice(0, 3))}. The launch is ended here.`);
  };
  const waitFor = async (test, ms, every = 300) => {
    const started = Date.now();
    for (;;) {
      stopIfLeaked();
      const v = await test();
      if (v !== null && v !== undefined && v !== false) return v;
      if (Date.now() - started >= ms) return null;
      await sleep(every);
    }
  };
  const commandOfPid = (pid) => (spawnSync('/bin/ps', ['-ww', '-p', String(pid), '-o', 'command='], { encoding: 'utf8' }).stdout ?? '').trim();

  // ---- the stand-in's forwarder and the door the phone dials ---------------------
  /** The door's name, public port and pin, from the code this world's phone scanned. */
  let doorInfo = null;
  const forwarderNow = () => {
    const live = standin?.readFunnel() ?? [];
    return live[live.length - 1] ?? null;
  };
  const doorNow = () => ({
    get port() {
      return forwarderNow()?.forwarderPort ?? 0;
    },
    name: doorInfo?.name ?? PUBLIC_NAME,
    publicPort: doorInfo?.publicPort ?? 8443,
    pin: doorInfo?.pin ?? null
  });
  const funnelPidNow = () => forwarderNow()?.pid ?? 0;

  // ---- the app, driven through its own bridge ------------------------------------
  const INHERITED_CLAUDE = Object.fromEntries(Object.keys(process.env).filter((n) => /^(?:CLAUDECODE|CLAUDE_)/.test(n)).map((n) => [n, undefined]));
  const devtoolsPort = () => {
    try {
      return Number(readFileSync(join(currentProfile, 'DevToolsActivePort'), 'utf8').split('\n')[0].trim());
    } catch {
      return 0;
    }
  };
  const targets = async () => {
    const port = devtoolsPort();
    if (!(port > 0)) return [];
    try {
      return await (await fetch(`http://127.0.0.1:${String(port)}/json/list`)).json();
    } catch {
      return [];
    }
  };
  const attachMain = async (timeoutMs = 150_000) => {
    const started = Date.now();
    let why = 'no DevToolsActivePort yet';
    for (;;) {
      const picked = pickRendererTarget(await targets());
      if (picked.target !== null) {
        const cdp = await wsConnect(picked.target.webSocketDebuggerUrl);
        await cdp.call('Runtime.enable');
        for (let i = 0; i < 200; i += 1) {
          if ((await cdpEval(cdp, 'window.gmux !== undefined && window.gmux.pocket !== undefined')) === true) return cdp;
          await sleep(300);
        }
        cdp.close();
        throw new Error('the app never armed window.gmux.pocket');
      }
      why = picked.why;
      if (Date.now() - started > timeoutMs) throw new Error(`no app window: ${why}`);
      await sleep(300);
    }
  };
  const attachSettings = async (main, timeoutMs = 30_000) => {
    await cdpEval(main, 'window.gmux.openSettings().then(() => true)');
    const started = Date.now();
    for (;;) {
      const t = (await targets()).find((x) => x.type === 'page' && /\/renderer\/settings\/index\.html/.test(String(x.url)) && typeof x.webSocketDebuggerUrl === 'string');
      if (t !== undefined) {
        const cdp = await wsConnect(t.webSocketDebuggerUrl);
        await cdp.call('Runtime.enable');
        await cdpEval(cdp, "(() => { location.hash = 'phone'; return true; })()");
        for (let i = 0; i < 100; i += 1) {
          if ((await cdpEval(cdp, `document.querySelector(${J(SECTION)}) !== null`)) === true) return cdp;
          await sleep(200);
        }
        cdp.close();
        throw new Error('Settings opened and never drew the Phone section');
      }
      if (Date.now() - started > timeoutMs) throw new Error('no Settings window');
      await sleep(300);
    }
  };
  const callPocket = async (cdp, method, arg) => {
    const call = arg === undefined ? `window.gmux.pocket[${J(method)}]()` : `window.gmux.pocket[${J(method)}](${J(arg)})`;
    return JSON.parse(await cdpEval(cdp, `(async () => { try { const v = await ${call}; return JSON.stringify({ ok: true, value: v === undefined ? null : v }); } catch (e) { return JSON.stringify({ ok: false, error: String((e && e.message) || e) }); } })()`));
  };
  /** A press of the sheet's own bridge call, recorded against its launch. */
  const press = async (ctx, cdp, method, arg) => {
    presses.push({ launch: ctx.launch, what: method, at: Date.now() });
    return callPocket(cdp, method, arg);
  };
  let lastStatusText = null;
  const statusNow = async (ctx, cdp) => {
    const got = await callPocket(cdp, 'status');
    if (!got.ok) return null;
    const text = J(got.value);
    if (text !== lastStatusText) {
      lastStatusText = text;
      statuses.push({ launch: ctx.launch, at: Date.now(), status: got.value });
    }
    return got.value;
  };
  const waitStatus = async (ctx, cdp, test, ms, every = 300) => {
    const started = Date.now();
    let last = null;
    for (;;) {
      stopIfLeaked();
      last = await statusNow(ctx, cdp);
      if (last !== null && test(last)) return { ok: true, status: last, ms: Date.now() - started };
      if (Date.now() - started >= ms) return { ok: false, status: last, ms: Date.now() - started };
      await sleep(every);
    }
  };
  /** The status fields an arm keeps. */
  const pick = (s) =>
    s === null || s === undefined
      ? null
      : {
          state: s.state ?? null,
          publicName: s.publicName ?? null,
          publicPort: s.publicPort ?? null,
          confirmState: s.confirmState ?? null,
          confirmLines: Array.isArray(s.confirmLines) ? [...s.confirmLines] : [],
          confirmHash: s.confirmHash ?? null,
          confirmFace: s.confirmFace ?? null,
          routesWaiting: s.routesWaiting ?? null,
          routesAllowed: s.routesAllowed ?? null,
          routesOffered: s.routesOffered ?? null,
          pushAlerts: s.pushAlerts ?? null,
          funnel: { asksApproval: s.funnel?.asksApproval === true }
        };

  /** One reading of the block, recorded for the re-derivation. */
  const measure = async (ctx, settings, label) => {
    let m;
    try {
      m = JSON.parse(await cdpEval(settings, MEASURE, 20_000));
    } catch (err) {
      m = { drawn: false, error: String(err?.message ?? err) };
    }
    doms.push({ launch: ctx.launch, label, at: Date.now(), m });
    return m;
  };
  const pageSize = async (settings) => JSON.parse(await cdpEval(settings, 'JSON.stringify([innerWidth, innerHeight])'));
  /**
   * The block read at each width READ_HEIGHT tall through the override, then
   * the override cleared and the page waited back to its own size.
   */
  const readAtWidths = async (ctx, settings, label, widths = WIDTHS) => {
    const own = await pageSize(settings);
    const at = {};
    try {
      for (const w of widths) {
        await settings.call('Emulation.setDeviceMetricsOverride', { width: w, height: READ_HEIGHT, deviceScaleFactor: 0, mobile: false }, 10_000);
        await waitFor(async () => (J(await pageSize(settings)) === J([w, READ_HEIGHT]) ? true : null), 5_000, 100);
        at[String(w)] = await measure(ctx, settings, `${label} at ${String(w)}`);
      }
    } finally {
      await settings.call('Emulation.clearDeviceMetricsOverride', {}, 10_000).catch(() => undefined);
    }
    const restored = (await waitFor(async () => (J(await pageSize(settings)) === J(own) ? true : null), 5_000, 100)) === true;
    return { own, at, restored };
  };
  /** A click on the real element, recorded against its launch. False when it is absent or disabled. */
  const clickIn = async (ctx, settings, selector, what) => {
    const ok = (await cdpEval(settings, `(() => { const b = document.querySelector(${J(selector)}); if (b === null || b.disabled) return false; b.click(); return true; })()`)) === true;
    if (ok) presses.push({ launch: ctx.launch, what: `click ${what}`, at: Date.now() });
    return ok;
  };
  const pressesIn = (launch) => presses.filter((p) => p.launch === launch).map((p) => p.what);
  /** One trusted key, down and up, to whatever holds the Settings page's keyboard. */
  const pressKey = async (settings, name) => {
    const { text, unmodifiedText, ...base } = KEYS[name];
    const down = await settings.call('Input.dispatchKeyEvent', { type: 'keyDown', ...base, ...(text === undefined ? {} : { text, unmodifiedText }) }, 5_000);
    const up = await settings.call('Input.dispatchKeyEvent', { type: 'keyUp', ...base }, 5_000);
    // CDP answers a refused event with an error rather than throwing; it is kept so a reading says why.
    return [down, up].filter((r) => r?.error !== undefined).map((r) => `${name}: ${String(r.error.message ?? J(r.error))}`);
  };
  /**
   * DETAILS BY THE KEYBOARD (N4, C2, W2): Allow focused, ONE Tab, then, only
   * when the focus is on the summary, ONE Enter; then main's status read, the
   * block read, and main's status read again. At the parent there is no
   * Details, so the Tab lands elsewhere and nothing opens; that reading is
   * kept and not graded.
   */
  const keyboardRead = async (ctx, main, settings, label) => {
    const kb = { allowFocused: false, afterTab: null, openBefore: null, openAfterEnter: null, statusSame: false, statusLines: null, lines: null, warnings: null, asksApproval: null, keyErrors: [] };
    // The Settings window may sit behind the main one; the page is told it has the focus, as a person's would.
    await settings.call('Emulation.setFocusEmulationEnabled', { enabled: true }, 5_000).catch(() => undefined);
    kb.allowFocused = (await cdpEval(settings, FOCUS_ALLOW)) === true;
    kb.openBefore = await cdpEval(settings, DETAILS_OPEN);
    if (kb.allowFocused) {
      kb.keyErrors.push(...(await pressKey(settings, 'Tab')));
      kb.afterTab = await cdpEval(settings, ACTIVE_IS);
    }
    if (kb.afterTab === 'summary') {
      kb.keyErrors.push(...(await pressKey(settings, 'Enter')));
      kb.openAfterEnter = (await waitFor(async () => ((await cdpEval(settings, DETAILS_OPEN)) === true ? true : null), 2_000, 100)) === true;
    }
    const before = await statusNow(ctx, main);
    const m = await measure(ctx, settings, `${label} Details`);
    const after = await statusNow(ctx, main);
    const facts = (s) => J([s?.confirmLines ?? null, s?.confirmHash ?? null, s?.confirmState ?? null]);
    kb.statusSame = before !== null && after !== null && facts(before) === facts(after);
    kb.statusLines = after?.confirmLines ?? null;
    kb.lines = m.detailsLines ?? null;
    kb.warnings = m.detailsWarnings ?? null;
    kb.asksApproval = after?.funnel?.asksApproval === true;
    return { kb, m };
  };
  /**
   * Allow CLICKED on the real element, then main's status and the block read
   * until `done(status, reading)` holds, for up to `ms`. `ms` in the answer is
   * the time from the click to the reading that held, or null.
   */
  const allowAndWait = async (ctx, main, settings, label, done, ms = ALLOW_WITHIN_MS + 20_000) => {
    const at = Date.now();
    const clicked = await clickIn(ctx, settings, ALLOW_SEL, 'Allow');
    let got = null;
    if (clicked) {
      got = await waitFor(async () => {
        const st = await statusNow(ctx, main);
        const mm = await measure(ctx, settings, `${label} after Allow`);
        return st !== null && done(st, mm) ? { st, mm, ms: Date.now() - at } : null;
      }, ms, 200);
    }
    const s = got?.st ?? (await statusNow(ctx, main));
    const m = got?.mm ?? (await measure(ctx, settings, `${label} after Allow, not done`));
    return {
      clicked,
      done: got !== null,
      ms: got?.ms ?? null,
      blocks: m?.blocks ?? -1,
      publishState: m?.publishState ?? null,
      state: s?.state ?? null,
      confirmState: s?.confirmState ?? null,
      publicName: s?.publicName ?? null,
      routesWaiting: s?.routesWaiting ?? null
    };
  };

  /** Every descendant of `root`, from one read of the table. */
  const descendantsOf = (root, rows = processRows()) => {
    const kids = new Map();
    for (const r of rows) {
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
  };
  /** The door process: a `utilityProcess` under the app whose environment says TORTIE_DOOR. */
  const doorPidOf = (appPid) => {
    if (!(appPid > 0)) return 0;
    const services = descendantsOf(appPid).filter((r) => r.command.includes('--utility-sub-type=node.mojom.NodeService'));
    const door = services.filter((r) => /(?:^|\s)TORTIE_DOOR=/.test((spawnSync('/bin/ps', ['-E', '-ww', '-p', String(r.pid), '-o', 'command='], { encoding: 'utf8' }).stdout ?? '').trim()));
    return door[0]?.pid ?? 0;
  };

  // ---- one launch ---------------------------------------------------------------
  const launchOptions = (label, checkout, profile) => ({
    label,
    userDataDir: profile,
    cwd: checkout,
    tmuxSocket: SOCKET,
    // Chromium's occlusion and backgrounding OFF (probe:p3332's three
    // switches): Settings is read while it may sit behind the main window.
    args: ['--remote-debugging-port=0', '--use-mock-keychain', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding', '--disable-background-timer-throttling'],
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
      [NAME_SERVERS_VAR]: dns.servers
    }),
    graceMs: 8_000,
    ceilingMs: 900_000
  });
  const launch = async (name, checkout, profile, body) => {
    const pre = preflightStandin(standin, standin.binPath);
    tailscalePreflights.push(pre.ok);
    if (!pre.ok) throw new Error(`the Tailscale preflight refused ${name}: ${pre.problems.join('; ')}`);
    const dnsPre = await dns.preflight(dns.servers);
    dnsPreflights.push(dnsPre.ok && loopbackOnlyServers(dns.servers));
    if (!dnsPre.ok) throw new Error(`the DNS preflight refused ${name}: ${dnsPre.problems.join('; ')}`);
    writeHiddenAgents(profile, 'p333121');
    const precheck = hiddenAgentsPrecheck({ checkout, prefix: 'p333121', home: HOME, userPath: process.env.PATH ?? '' });
    agentsPrecheck.push(precheck.ok);
    if (!precheck.ok) throw new Error(`the hidden-agents precheck refused ${name}: ${precheck.said}`);
    currentProfile = profile;
    const ctx = { launch: name, checkout, startedAt: Date.now() };
    const rec = { launch: name, checkout, profile, shim: 0, app: 0, startedAt: ctx.startedAt, endedAt: 0 };
    launchRecords.push(rec);
    say(`${name}: launching ${checkout} on ${profile}`);
    try {
      return await withElectron(launchOptions(`p333121-${name}`, checkout, profile), async (handle) => {
        rec.shim = handle.pid;
        lastShim = handle.pid;
        const appPid = () => {
          try {
            rec.app = handle.appPid() || rec.app;
          } catch {
            /* not up yet */
          }
          lastApp = rec.app;
          return rec.app;
        };
        appPid();
        const main = await attachMain();
        appPid();
        try {
          const scan = hiddenAgentsScanVerdict(JSON.parse(await cdpEval(main, AGENTS_LIST_EXPR)));
          agentsScan.push(scan.ok);
          if (!scan.ok) throw new Error(`agents:list at ${name}: ${scan.said}`);
          return await body({ main, handle, ctx, appPid });
        } finally {
          main.close();
          appPid();
        }
      });
    } finally {
      rec.endedAt = Date.now();
      say(`${name}: ended`);
      // Nothing of the stand-in may outlive a launch into the next one (by
      // pid, each command line re-read by the helper); what this ends is kept
      // for the report, because the app's own quit should have ended it.
      const ended = endStandinProcesses(STANDIN_DIR, 1_500);
      if (ended.ended.length > 0) strays.push({ after: name, ended: ended.ended, left: ended.left });
    }
  };

  /** The door's lines as they stand, naming `name`, and agreeable now. */
  const linesReadyFor = (name) => (s) => s.confirmable === true && s.state !== 'opening' && s.publicName === name && s.confirmState !== 'confirmed' && Array.isArray(s.confirmLines) && s.confirmLines.some((l) => l.includes(`https://${name}:`));
  const pairableNow = (s) => s.state === 'listening' && s.confirmState === 'confirmed' && (s.pairable === true || s.pairable === undefined);

  /** Pair THE phone through a code main shows, Allow pressed over the card's own lines (the sheet's own calls). */
  const pairPhone = async (ctx, main) => {
    const offered = await press(ctx, main, 'beginPairing');
    if (!offered.ok) return { ok: false, why: `beginPairing: ${offered.error.slice(0, 200)}` };
    const read = readOffer(offered.value?.payload);
    if (!read.ok) return { ok: false, why: `the code does not read the phone's way: ${read.why}` };
    remember(read.offer.ps);
    doorInfo = { name: read.offer.host, publicPort: read.offer.port, pin: read.offer.fp };
    const phone = makePhone(PHONE_LABEL, read.offer.dx);
    let allowed = null;
    const paired = await pairThrough(doorNow(), read.offer, phone, {
      tries: 20,
      everyMs: 500,
      between: async () => {
        if (allowed !== null) return;
        const sheet = await callPocket(main, 'pairingState');
        if (sheet.ok && sheet.value?.state === 'presented') allowed = await press(ctx, main, 'allowPhone', { linesRead: sheet.value.lines, hashRead: sheet.value.hash });
      }
    });
    await press(ctx, main, 'cancelPairing');
    const ok = paired.ok && allowed?.ok === true && allowed.value?.allowed !== false;
    return { ok, why: ok ? '' : `pairing answered ${J(paired.words)} (${paired.why}); Allow ${allowed === null ? 'never pressed' : allowed.ok ? `answered allowed=${String(allowed.value?.allowed)}` : `threw ${allowed.error}`}` };
  };

  // ---- THE RUN ------------------------------------------------------------------
  /** Per arm, per world: the reading, or why it could not be taken. */
  const readings = {};
  const whyNot = {};
  const put = (world, id, part) => {
    (readings[id] ??= {})[world] = part;
  };
  const miss = (world, ids, why) => {
    for (const id of ids) {
      whyNot[id] ??= {};
      if (whyNot[id][world] === undefined && readings[id]?.[world] === undefined) whyNot[id][world] = why;
    }
  };
  const N_IDS = ['N1', 'N2', 'N3', 'N4', 'N5', 'RD'];
  const C_IDS = ['C1', 'C2', 'C3'];
  const W_IDS = ['W1', 'W2', 'W3'];
  let probesRead = null;

  const runWorld = async (world) => {
    // The stand-in's name put back to its default (SPEC §7.3): the parent's
    // world left it moved.
    standin.setScenario({ ...DEFAULT_SCENARIO }, { merge: false });
    doorInfo = null;
    let l1Ok = false;
    try {
      await launch(`L1-${world.key}`, world.B, world.profile, async ({ main, ctx }) => {
        const settings = await attachSettings(main);
        try {
          // ---- N: the first setup ---------------------------------------------------
          const on = await press(ctx, main, 'setDoor', { on: true });
          if (!on.ok) return miss(world.key, [...N_IDS, ...C_IDS, ...W_IDS], `the switch did not take: ${on.error.slice(0, 200)}`);
          const ready = await waitStatus(ctx, main, linesReadyFor(PUBLIC_NAME), 45_000);
          if (!ready.ok) return miss(world.key, [...N_IDS, ...C_IDS, ...W_IDS], `the lines never named ${PUBLIC_NAME}: ${J({ state: ready.status?.state, confirmState: ready.status?.confirmState, refusal: ready.status?.refusal })}`);
          const drawn = await waitFor(async () => {
            const m = await measure(ctx, settings, 'N drawn?');
            return m.blocks === 1 && m.publishState === 'confirm' ? m : null;
          }, 20_000, 250);
          if (drawn === null) return miss(world.key, [...N_IDS, ...C_IDS, ...W_IDS], 'Settings then Phone never drew one confirm block under Read, then allow');
          const sN = pick(await statusNow(ctx, main));
          const wide = await readAtWidths(ctx, settings, 'N');
          const m = wide.at[String(OWN_WIDTH)];
          put(world.key, 'N1', { m, status: sN, program: standin.binPath });
          put(world.key, 'N2', { m, at: wide.at, own: wide.own, restored: wide.restored });
          put(world.key, 'N3', { m, status: sN });
          put(world.key, 'RD', { needles: [lineStarting(sN?.confirmLines, ROUTE_PREFIX), lineStarting(sN?.confirmLines, WRITE_PREFIX), HONESTY], innerText: m?.innerText ?? null, textContent: m?.textContent ?? null });
          const n4 = await keyboardRead(ctx, main, settings, 'N');
          put(world.key, 'N4', { kb: n4.kb, lines: m?.lines ?? null, warnings: m?.warnings ?? null });
          const n5 = await allowAndWait(ctx, main, settings, 'N', (s, mm) => s.confirmState === 'confirmed' && mm.blocks === 0 && mm.publishState === 'published');
          put(world.key, 'N5', n5);
          if (!n5.done) return miss(world.key, [...C_IDS, ...W_IDS], 'the first Allow never published the door, so no phone could pair');

          // ---- the phone ------------------------------------------------------------
          const pairable = await waitStatus(ctx, main, pairableNow, 90_000);
          if (!pairable.ok) return miss(world.key, [...C_IDS, ...W_IDS], `the door never read pairable: ${J({ state: pairable.status?.state, pairable: pairable.status?.pairable, nameCheck: pairable.status?.nameCheck })}`);
          const paired = await pairPhone(ctx, main);
          if (!paired.ok) return miss(world.key, [...C_IDS, ...W_IDS], `the phone did not pair: ${paired.why}`);
          const withPhone = await waitStatus(ctx, main, (s) => s.state === 'listening' && s.confirmState === 'confirmed' && Array.isArray(s.phones) && s.phones.length === 1, 20_000);
          if (!withPhone.ok) return miss(world.key, [...C_IDS, ...W_IDS], 'the paired phone never read in main’s status');

          // ---- the name moved, H9's way ------------------------------------------------
          const child = forwarderNow();
          standin.setScenario({ dnsName: `${MOVED_NAME}.` });
          let signalled = false;
          if (child !== null && commandOfPid(child.pid).includes('tailscale-standin.mjs')) {
            try {
              process.kill(child.pid, 'SIGINT');
              signalled = true;
            } catch {
              signalled = false;
            }
          }
          if (!signalled) return miss(world.key, [...C_IDS, ...W_IDS], 'no Funnel child of the stand-in to signal, so the name could not be moved');
          const moved = await waitStatus(ctx, main, (s) => s.confirmState === 'changed' && linesReadyFor(MOVED_NAME)(s), 60_000);
          if (!moved.ok) return miss(world.key, [...C_IDS, ...W_IDS], `the moved name never read changed with lines naming it: ${J({ state: moved.status?.state, confirmState: moved.status?.confirmState, publicName: moved.status?.publicName })}`);
          const drawnC = await waitFor(async () => {
            const mm = await measure(ctx, settings, 'C drawn?');
            return mm.blocks === 1 && mm.publishState === 'changed' ? mm : null;
          }, 20_000, 250);
          if (drawnC === null) return miss(world.key, [...C_IDS, ...W_IDS], 'Settings then Phone never drew one confirm block under Changed since you allowed it');

          // ---- C: the moved name ---------------------------------------------------------
          const sC = pick(await statusNow(ctx, main));
          const mC = (await readAtWidths(ctx, settings, 'C', [OWN_WIDTH])).at[String(OWN_WIDTH)];
          put(world.key, 'C1', { m: mC, status: sC, program: standin.binPath });
          const c2 = await keyboardRead(ctx, main, settings, 'C');
          put(world.key, 'C2', { kb: c2.kb, lines: mC?.lines ?? null, warnings: mC?.warnings ?? null });
          const c3 = await allowAndWait(ctx, main, settings, 'C', (s, mm) => s.confirmState === 'confirmed' && s.state === 'listening' && s.publicName === MOVED_NAME && mm.blocks === 0);
          put(world.key, 'C3', c3);
          if (!c3.done) return miss(world.key, W_IDS, 'the Allow on the moved name never published the door, so L2 has no agreement to read a waiting route over');
          l1Ok = true;
          return undefined;
        } finally {
          settings.close();
        }
      });
    } catch (err) {
      miss(world.key, [...N_IDS, ...C_IDS, ...W_IDS], `L1 at the ${world.key} stopped: ${scrub(String(err?.message ?? err))}`);
      throw err;
    }
    if (!LAUNCHES.includes('L2')) return;
    if (!l1Ok) {
      miss(world.key, W_IDS, `L1 at the ${world.key} did not end on an allowed door`);
      return;
    }

    // ---- L2: the planted route waits (NO PRESS first). The stand-in keeps the
    // moved name, which is the name the agreement on record names. -----------------
    try {
      await launch(`L2-${world.key}`, world.BP, world.profile, async ({ main, ctx, appPid }) => {
        const up = await waitStatus(ctx, main, (s) => s.state === 'listening' && s.confirmState === 'confirmed' && Array.isArray(s.routesWaiting) && s.routesWaiting.length > 0, 90_000);
        const funnel = forwarderNow();
        const settings = await attachSettings(main);
        try {
          const drawn = await waitFor(async () => {
            const mm = await measure(ctx, settings, 'W drawn?');
            return mm.blocks === 1 && mm.publishState === 'published' ? mm : null;
          }, 20_000, 250);
          if (!up.ok || drawn === null) return miss(world.key, W_IDS, `no published door with a route waiting and its block drawn: ${J({ state: up.status?.state, confirmState: up.status?.confirmState, routesWaiting: up.status?.routesWaiting, drawn: drawn !== null })}`);
          const sW = pick(await statusNow(ctx, main));
          const mW = (await readAtWidths(ctx, settings, 'W', [OWN_WIDTH])).at[String(OWN_WIDTH)];
          put(world.key, 'W1', { presses: pressesIn(ctx.launch), published: up.ok && funnel !== null && funnel.at >= ctx.startedAt, m: mW, status: sW });
          const w2 = await keyboardRead(ctx, main, settings, 'W');
          put(world.key, 'W2', { kb: w2.kb, lines: mW?.lines ?? null, warnings: mW?.warnings ?? null });
          const before = { door: doorPidOf(appPid()), funnel: funnelPidNow() };
          const w3 = await allowAndWait(ctx, main, settings, 'W', (s, mm) => isEmptyList(s.routesWaiting) && mm.blocks === 0);
          const after = { door: doorPidOf(appPid()), funnel: funnelPidNow() };
          put(world.key, 'W3', { ...w3, pids: { doorBefore: before.door, doorAfter: after.door, funnelBefore: before.funnel, funnelAfter: after.funnel } });
          return undefined;
        } finally {
          settings.close();
        }
      });
    } catch (err) {
      miss(world.key, W_IDS, `L2 at the ${world.key} stopped: ${scrub(String(err?.message ?? err))}`);
      throw err;
    }
  };

  let stopped = null;
  try {
    for (const dir of [HOME, PROFILES.parent, PROFILES.head]) mkdirSync(dir, { recursive: true, mode: 0o700 });
    // A quiet scratch shell for anything the app starts: no history anywhere.
    writeFileSync(join(HOME, '.zshrc'), "PS1='q %# '\nHISTFILE=/dev/null\nSAVEHIST=0\n", 'utf8');
    writeFileSync(join(HOME, '.bash_profile'), "PS1='q %# '\nHISTFILE=/dev/null\n", 'utf8');
    writeFileSync(join(HOME, '.bashrc'), "PS1='q %# '\nHISTFILE=/dev/null\n", 'utf8');
    writeFileSync(join(HOME, '.hushlogin'), '');

    standin = makeStandin({ dir: STANDIN_DIR, scenario: { ...DEFAULT_SCENARIO } });
    // The `finally` ends them; this net is for a run the helper ends with
    // process.exit, which skips it. Synchronous, by pid, naming the stand-in only.
    process.once('exit', () => endStandinProcesses(STANDIN_DIR, 500));
    const pre = preflightStandin(standin, standin.binPath);
    if (!pre.ok) throw new Error(`the Tailscale preflight refused: ${pre.problems.join('; ')}`);
    dns = await makeDnsStandin({ name: PUBLIC_NAME, mode: 'record' });
    watch = watchForRealTailscale({ roots: () => [lastShim, lastApp].filter((p) => p > 0), everyMs: 1_000 });
    probesRead = PROBE_FILES.map((file) => ({ file, ...confirmReadsOf(readAt(HEAD, file) ?? '') }));
    say(`the builds: ${J(report.builds)}; socket ${SOCKET}; arms ${PICKED.join(',')}; launches per world ${LAUNCHES.join(',')}`);
    for (const world of WORLDS) await runWorld(world);
  } catch (err) {
    stopped = scrub(String(err?.message ?? err));
    report.error = scrub(String(err?.stack ?? err));
    say(`the run stopped: ${stopped}`);
  } finally {
    // Everything this run started, by pid or by handle, whatever happened.
    clearInterval(udpTimer);
    const ended = standin === null ? { ended: [], left: [] } : endStandinProcesses(STANDIN_DIR, 1_500);
    const findings = watch?.stop() ?? [];
    const log = standin?.readLog() ?? [];
    const questions = dns?.log() ?? [];
    if (dns !== null) await dns.close();
    // THE SCRATCH SOCKET, the server and then the FILE (probe:p33312's fix
    // round): tmux 3.7b leaves its socket FILE after kill-server, so the file is
    // unlinked by its exact name, and only while the name has this run's shape.
    const socketFile = socketPathOf(SOCKET);
    const ownSocket = SOCKET_SHAPE.test(SOCKET);
    if (existsSync(socketFile) && ownSocket) {
      spawnSync(TMUX, ['-L', SOCKET, 'kill-server'], { stdio: 'ignore', timeout: 10_000 });
      await sleep(1_000);
    }
    const socketExistedAfterTeardown = existsSync(socketFile);
    if (ownSocket) rmSync(socketFile, { force: true });
    const socketGone = !existsSync(socketFile);
    // Both profiles' logs, and their rolled-over halves.
    const launchedProfiles = [...new Set(launchRecords.map((l) => l.profile))];
    let appLogsRead = 0;
    let appLogHits = 0;
    for (const profile of launchedProfiles) {
      const read = (path) => {
        try {
          return readFileSync(path, 'utf8');
        } catch {
          return null;
        }
      };
      const text = read(join(profile, 'logs', 'app.log'));
      if (text === null) continue;
      appLogsRead += 1;
      const logged = `${read(join(profile, 'logs', 'app.log.1')) ?? ''}\n${text}`;
      appLogHits += secretHits(logged, [...SECRETS]) + (logged.includes('-----BEGIN') ? 1 : 0);
    }
    const ours = (spawnSync('/bin/ps', ['-Ao', 'pid=,ppid=,comm='], { encoding: 'utf8' }).stdout ?? '')
      .split('\n')
      .filter((l) => /Electron|Tortie$|chrome_crashpad/.test(l) && !/defunct/.test(l))
      .filter((l) => {
        const [pid, ppid] = l.trim().split(/\s+/).map(Number);
        const command = commandOfPid(pid);
        return launchRecords.some((x) => [x.shim, x.app].filter((p) => p > 0).some((p) => pid === p || ppid === p)) || command.includes(PROFILES.parent) || command.includes(PROFILES.head);
      });
    const historyAfter = historyStat();

    // ---- THE GRADES, every world read -------------------------------------------
    for (const id of ARM_IDS) {
      if (id === 'RUN') continue;
      const got = readings[id] ?? {};
      const why = whyNot[id] ?? {};
      if (got.head === undefined) {
        cannotRead(id, why.head ?? (stopped !== null ? `not reached at HEAD: ${stopped}` : 'not reached at HEAD'), got);
        continue;
      }
      if (NEEDS_PARENT.includes(id) && got.parent === undefined) {
        cannotRead(id, `the parent's reading, which a clause compares with, was not taken: ${why.parent ?? stopped ?? 'not reached'}`, got);
        continue;
      }
      arm(id, id === 'RD' ? { ...got, probes: probesRead } : { head: got.head, parent: got.parent ?? null });
    }
    arm('RUN', {
      launches: launchRecords.length,
      tailscalePreflights,
      dnsPreflights,
      agentsPrecheck,
      agentsScan,
      samples: watch?.samples() ?? 0,
      realTailscale: findings.length,
      notThisRun: watch?.notOurs() ?? [],
      forbidden: log.filter((e) => e.forbidden === true).length,
      refusedArgv: log.filter((e) => e.verdict === 'refused').length,
      udpSamples: udp.samples,
      udpLeaks: udp.leaks.length,
      questionProblems: questionsProblems(questions),
      questions: questions.length,
      electronLeft: ours.length,
      standinLeft: ended.left.length,
      straysBetweenLaunches: strays,
      socketExistedAfterTeardown,
      socketGone,
      historySame: historyAfter === HISTORY_BEFORE,
      history: { before: HISTORY_BEFORE, after: historyAfter },
      profilesLaunched: launchedProfiles.length,
      appLogsRead,
      appLogHits
    });
    if (historyAfter !== HISTORY_BEFORE) say(`HIS HISTORY MOVED: ${HISTORY_BEFORE} became ${historyAfter}. The run fails; tell the operator.`);
    report.launches = launchRecords.map((l) => ({ launch: l.launch, checkout: l.checkout, shim: l.shim, app: l.app, seconds: l.endedAt > 0 ? Math.round((l.endedAt - l.startedAt) / 1000) : null }));
    report.presses = presses;
    report.raw = { udpSeen: [...udp.seen].sort(), udpLeaks: udp.leaks, standinEnded: ended, strays, realTailscaleFindings: findings, electronLeft: ours, questions: questions.length };
    if (KEEP) {
      const dir = join(RUN, 'rederive');
      mkdirSync(dir, { recursive: true, mode: 0o700 });
      writeFileSync(join(dir, 'statuses.json'), `${scrub(J({ note: 'Every distinct pocket.status() this run read, in order, by launch. Key fingerprints masked.', statuses }, null, 1))}\n`, { mode: 0o600 });
      writeFileSync(join(dir, 'dom.json'), `${scrub(J({ note: 'Every reading of the Settings page’s confirm block, in order, by launch and label. Key fingerprints masked.', doms }, null, 1))}\n`, { mode: 0o600 });
      say(`kept the scratch world at ${RUN}; the re-derivation reads ${dir}`);
    } else {
      rmSync(RUN, { recursive: true, force: true });
    }
    mkdirSync(OUT, { recursive: true });
    writeFileSync(join(OUT, 'probe-p333121.json'), `${scrub(J(report, null, 1))}\n`, 'utf8');
    say(`wrote ${join(OUT, 'probe-p333121.json')}`);
  }

  say(`${String(report.arms.filter((a) => a.ok === true).length)} arm(s) passed, ${String(failures)} failed, ${String(unreadable)} could not be read`);
  process.exit(failures > 0 ? 1 : unreadable > 0 ? 2 : 0);
}

// LAST IN THE FILE, ON PURPOSE: the page expressions above `run()` are
// module-level consts, and a call made before their lines would meet them
// uninitialised.
const isMain = process.argv[1] !== undefined && resolve(process.argv[1]) === HERE;
if (isMain && process.argv.includes('--grader-self-test')) process.exit(graderSelfTest() ? 0 : 1);
if (isMain) await run();
