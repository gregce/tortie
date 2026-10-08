#!/usr/bin/env node
/**
 * probe:p3332 — Settings then Phone names where the phone app comes from, read
 * in the real app at the parent and at HEAD (Phase 333.2, build/p3332/SPEC.md
 * §6).
 *
 * WHAT IT MEASURES. Phase 333.2 moved one string: the line under the pairing
 * code, `SCAN_LINE`, named tortie.sh/iphone in words, never a link. PHASE
 * 333.1 THEN MOVED THE SECTION ON PURPOSE (build/p3331/SPEC.md D37), so this
 * probe is RE-PINNED, not retired: the three steps sit between the switch row
 * and the pair card, the code face's side column gains `GET_PHONE_APP` ("Get
 * it at tortie.sh/iphone.") under a shorter scan line, the key row gains the
 * publisher's caption, and the rest face draws no Pair with no phone paired
 * (the switch is the first setup's press). The probe reads EVERY rectangle
 * and every word of `section[aria-label="Phone"]` at both builds, with the
 * same script, and the HEAD run compares the two LANDMARK BY LANDMARK: the
 * title, the pair card's block, the key row and the alerts row, every element
 * inside a landmark measured from the landmark's own content box (its padding
 * recorded, the fix round) and compared with the parent's, equal but a NAMED
 * set that may move, each with its reason (`NAMED`, below). A fourth reading
 * forces a 243 px code at 1200 (333.2's SPEC §6.7), the one placement change,
 * which is REPORTED and not failed.
 *
 * THE ARMS, in ONE launch per build, the same script at both:
 *   R    at rest, the window at its own width and 2,000 px tall (the fix
 *        round: a taller section brings a scrollbar at its own height, which
 *        narrows the title): the door off, the first setup's press drawn
 *        (Pair at a build without the steps, the off switch since 333.1),
 *        the key row `Not chosen.`, no alert switch, no link, nothing past
 *        the section
 *   S    the sheet's own first setup press (Pair where it is drawn with the
 *        door off, else the switch, whose on press asks for the code), then
 *        its Allow (probe:p330 A3's presses), until
 *        `[data-phone-stage="showing"]` with no other press; read at 760, at
 *        640 and 1200 through `Emulation.setDeviceMetricsOverride`, then a
 *        243 px code at 1200, then 760 again (a sanity read); then Cancel
 *   K    the door still on, 2,000 px tall again: Choose… (the harness
 *        override answers the scratch key with no panel), the key and the
 *        switch drawn; Forget, both gone; the alert switch is never pressed;
 *        then the door off
 *   CMP  HEAD only, against out/p3332/probe-p3332-parent.json; a reading at
 *        another height or width than the parent's is REFUSED (its
 *        precondition), never compared
 *   RUN  both builds: the stand-ins' preflights, the hidden agents, no real
 *        Tailscale, no forbidden argv, UDP to 127.0.0.1 alone, every DNS
 *        question an A, RD 0, for the name, the sheet asking nothing off the
 *        Mac and nothing naming tortie.sh, Apple's stand-in reached by
 *        nothing, app.log holding no key and no name, the key file gone,
 *        every stand-in ended, no Electron left
 *
 * THE WORDS ARE SPELLED HERE, never read from the tree, so a constant that
 * drifts is caught rather than agreed with. It never presses Get Tailscale,
 * Open Tailscale, Approve in Tailscale or Copy link, and never calls
 * `pocket:setupAction` (build/p3331/SPEC.md D35).
 *
 * THE READER. ONE `cdpEval` on the Settings page, after a frame (the occlusion
 * trap p3321 names): for the section and every element under it, except what
 * is inside `svg.phone-qr` (its modules are the window's one-shot secret; the
 * `svg` itself is read), a structural key, the rectangle relative to the
 * section, and the text of a leaf; and beside the map the facts the graders
 * read. Both reports hold every raw map, so a verifier can re-derive without
 * the grader. BEFORE IT MEASURES, every finite animation on the page ends
 * (`settleAnimations`, the 333.1 reverify's fix): the door switch's knob
 * slides on a transform transition, and a reading taken mid-slide read the
 * knob 10 px from where the next reading found it, so S read UNREADABLE at
 * one build or the other for no reason of either's. The reading records how
 * long it waited and how many it finished (`settled`).
 *
 * THE WORLD, and what it refuses. Every launch goes through
 * build/electron-run.mjs's `withElectron`, on a scratch profile inside a
 * scratch harness directory, a scratch HOME and the tmux socket
 * `gmux-p3332-<pid>` (never `gmux`). Tailscale is Phase 330's STAND-IN behind
 * its preflight and its per-second sampler. DNS is ONE build/p332/dns-standin.mjs
 * IN THIS PROCESS on 127.0.0.1, named by `GMUX_POCKET_NAME_SERVERS`, and main's
 * UDP is sampled every 2 s: any peer that is not 127.0.0.1 fails the run at
 * once and ends the app. Apple is build/p314/apns-stand-in.mjs IN THIS PROCESS
 * on 127.0.0.1, named by `GMUX_HARNESS_ALERTS`'s alerts.json, beside a scratch
 * P-256 key made here, written 0600 and deleted in the `finally` and by an
 * `exit` net; his key is never read and nothing reads his keychain
 * (`--use-mock-keychain`). build/hidden-agents.mjs renames gemini, qwen,
 * antigravity, grok and droid before the launch, checked with the build's own
 * parser first and read back from `agents:list` after; none is ever started.
 * The Settings page's network is collected (`Network.requestWillBeSent`). It
 * never runs `pkill`, `killall` or a pattern, signals no process of the app's
 * (the helper owns the app's teardown), installs nothing, spends no token,
 * makes no request to tortie.sh or anywhere off the Mac, and photographs
 * nothing: every visual claim is a rectangle, a computed value or a label.
 *
 * It imports NO other probe: probe-p3321, probe-p330 and probe-p332 start
 * their run at module top level, so importing one would launch an Electron.
 * The attach and launch functions below are copied from
 * build/p3321/probe-p3321.mjs (`attachMain`, `attachSettings`, `pocket`,
 * `status`, `waitStatus`, `click`, `linesReady`, `allowDoor`,
 * `launchOptions`, `launch`, the UDP sampler and the census), because they
 * close over that file's constants; SPEC §As built names them.
 *
 * VERIFIERS ONLY, under THE LOCK: it starts an Electron. Builders write it and
 * run only `--grader-self-test`, which grades recorded fixtures and starts
 * nothing. Measured on 2026-10-01 under the lock: about 3 s a build, parent and HEAD.
 *
 * BUILD FIRST. It refuses (exit 2) when the checkout it is pointed at has no
 * build. Run the parent first, and build nothing between the two runs: a build
 * empties out/, and the HEAD run then reads CMP as UNREADABLE.
 *
 *   P3332_PARENT_CHECKOUT=/path/to/parent node build/p3332/probe-p3332.mjs   the parent reading
 *   node build/p3332/probe-p3332.mjs                                         HEAD, and CMP
 *   P3332_RUN=/private/tmp/somewhere node build/p3332/probe-p3332.mjs        the scratch world's path
 *   node build/p3332/probe-p3332.mjs --grader-self-test                      the graders, no Electron
 *
 * Exit 0 when every arm passed, 1 when one failed, 2 when it could not run or
 * an arm could not be READ, which is never a pass.
 */

import { spawnSync } from 'node:child_process';
import { generateKeyPairSync } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { withElectron, withoutDevRenderer } from '../electron-run.mjs';
import { wsConnect, cdpEval } from '../cdp-client.mjs';
import { pickRendererTarget } from '../cdp-target.mjs';
import { gradeFixtures } from '../probe-graders.mjs';
import { AGENTS_LIST_EXPR, hiddenAgentsPrecheck, hiddenAgentsScanVerdict, writeHiddenAgents } from '../hidden-agents.mjs';
import { DEFAULT_SCENARIO, endStandinProcesses, makeStandin, preflightStandin, processRows, watchForRealTailscale } from '../p330/tailscale-standin.mjs';
import { NAME_SERVERS_VAR, STANDIN_ADDRESS, loopbackOnlyServers, makeDnsStandin, nameQuestionProblems } from '../p332/dns-standin.mjs';
import { startApnsStandIn } from '../p314/apns-stand-in.mjs';

const HERE = fileURLToPath(import.meta.url);
const ROOT = resolve(dirname(HERE), '..', '..');
const J = JSON.stringify;
const sleepRaw = (ms) => new Promise((done) => setTimeout(done, ms));

// ---------------------------------------------------------------------------
// THE PROBE'S OWN WORDS (SPEC §6.5). Spelled here, never read from the tree.
// ---------------------------------------------------------------------------

/** The parent's scan line: 333.2's, which named the address in the one line. */
export const PARENT_SCAN = 'Scan it with Tortie on your iPhone, from tortie.sh/iphone.';
/** HEAD's scan line (Phase 333.1, D15): shorter, with the address on its own line under it. */
export const HEAD_SCAN = 'Scan with Tortie on your iPhone.';
export const HEAD_GET = 'Get it at tortie.sh/iphone.';
export const CODE_PRIVATE = 'Do not show this code on a shared screen.';
/** The switch's label: the first setup's press at HEAD, where the rest face draws no Pair (D17). */
export const DOOR_LABEL = 'Let my phone reach this Mac';
/** The key row's caption at HEAD, with a key and without one (D14; research 140 §6). */
export const PUBLISHER_ONLY = 'Only Tortie’s publisher can send alerts for now.';
/** The side column's lines at each build, in order. */
export const SIDE_LINES = Object.freeze({ parent: [PARENT_SCAN, CODE_PRIVATE], head: [HEAD_SCAN, HEAD_GET, CODE_PRIVATE] });
/** R and K are read this tall at both builds (the fix round), so no scrollbar narrows the section. */
export const READ_HEIGHT = 2000;
/**
 * The parent's heading over the pair card, which leaves at HEAD because step
 * 3's title says it (build/p3331/SPEC.md §5.4). Every other group label stays,
 * in order, by its words.
 */
export const PAIR_GROUP = 'Pair a phone';
export const KEY_NONE = 'Not chosen.';
export const KEY_ID = 'P3332SCRAT';
export const KEY_KEPT = `Key ${KEY_ID}`;
export const PUSH_LABEL = 'Alert my phone when a session waits';
/** The phone app's topic, which Apple's stand-in accepts (src/shared push topic). */
const TOPIC = 'com.itavero.tortie.phone';

/** The widths S reads, as the window gives them (760) and as the override sets them. */
export const WIDTHS = Object.freeze([640, 760, 1200]);
/** The narrowest a three-pixel-module code is drawn: version 14, 81 modules with the quiet zone (SPEC §6.7). */
export const WIDE_QR_PX = 243;

// ---------------------------------------------------------------------------
// The reader's pure parts, injected into the page by their source text so the
// self-test runs the very function the page runs.
// ---------------------------------------------------------------------------

/**
 * One step of an element's key: its tag, its classes sorted, then its
 * `data-phone-*` attributes sorted by name, each with its value
 * (`[name=value]`, or `[name]` for an empty value). Pure.
 */
export function stepOf(tag, classes, data) {
  const cls = [...classes]
    .filter((c) => c !== '')
    .sort()
    .map((c) => `.${c}`)
    .join('');
  const attrs = [...data]
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .map(([name, value]) => (value === '' ? `[${name}]` : `[${name}=${value}]`))
    .join('');
  return `${tag}${cls}${attrs}`;
}

/**
 * EVERY FINITE ANIMATION ENDS BEFORE THE READ (the 333.1 reverify, 2026-10-08).
 * The door switch's knob slides on a `transform` transition (`--dur-fast`),
 * and a reading taken mid-slide put it at x 475 in one reading and 485 in the
 * next, so S read UNREADABLE at the parent three runs in three and at HEAD one
 * in three, and CMP was never graded. Each running or pending animation whose
 * end is finite is waited for, polling every 25 ms up to `budgetMs`; any still
 * running then is finished, so the reading is of the face at rest and never of
 * a frame between two. An animation with no end (an infinite iteration) is
 * left alone. Answers how many polls it waited and how many it finished.
 * Pure but for what it is handed: the page runs this very source, handed
 * `document.getAnimations`, a timer and the clock; the self-test hands it fakes.
 */
export async function settleAnimations(getAnimations, sleep, now, budgetMs = 2000) {
  const ending = () =>
    getAnimations().filter((a) => {
      if (a.playState !== 'running' && a.pending !== true) return false;
      const timing = a.effect === null || a.effect === undefined ? null : a.effect.getComputedTiming();
      return timing !== null && Number.isFinite(timing.endTime);
    });
  const by = now() + budgetMs;
  let polls = 0;
  while (ending().length > 0 && now() < by) {
    polls += 1;
    await sleep(25);
  }
  let finished = 0;
  for (const a of ending()) {
    try {
      a.finish();
      finished += 1;
    } catch {
      // One that cannot finish is left as it is and counted nowhere.
    }
  }
  return { polls, finished };
}

/** A key's last step names a clock: the code's countdown or the name check's quiet line. */
export function isClockKey(key) {
  const last = String(key).split(' > ').at(-1) ?? '';
  return /\[data-phone-(?:countdown|name-time)(?:=|\])/.test(last);
}

/**
 * The collected request URLs that left the Mac, or that name tortie.sh at all:
 * an `http`, `https`, `ws` or `wss` URL whose host is not `127.0.0.1`,
 * `localhost` or `[::1]`, and any URL holding `tortie.sh`. Pure.
 */
export function offMacUrls(urls) {
  return (Array.isArray(urls) ? urls : []).filter((u) => {
    const s = String(u);
    if (/tortie\.sh/i.test(s)) return true;
    let url;
    try {
      url = new URL(s);
    } catch {
      return /^(?:https?|wss?):/i.test(s);
    }
    if (!['http:', 'https:', 'ws:', 'wss:'].includes(url.protocol)) return false;
    return !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname);
  });
}

const RECT_KEYS = ['x', 'y', 'w', 'h'];
/** Two rectangles within half a pixel on every side. */
export const sameRect = (a, b) => a !== null && b !== null && a !== undefined && b !== undefined && RECT_KEYS.every((k) => Math.abs(a[k] - b[k]) <= 0.5);
const near = (a, b) => Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= 0.5;

/**
 * Two readings of the section, element by element: whether the key sets are
 * identical, how many keys both hold, the keys whose rectangle moved more than
 * 0.5, and the keys whose text or button state differs (`reworded`, clocks
 * included; the caller decides which differences are allowed). Pure.
 */
export function compareMaps(p, h) {
  const pk = Object.keys(p?.els ?? {}).sort();
  const hk = Object.keys(h?.els ?? {}).sort();
  const both = hk.filter((k) => p.els[k] !== undefined);
  const moved = both.filter((k) => !sameRect(p.els[k].r, h.els[k].r));
  const reworded = both.filter((k) => p.els[k].t !== h.els[k].t || J(p.els[k].b ?? null) !== J(h.els[k].b ?? null));
  return { keysSame: J(pk) === J(hk), compared: both.length, equal: both.length - moved.length, moved, reworded };
}

/**
 * THE GROUP LABELS, BY THEIR WORDS (the 333.1 reverify, 2026-10-08). A key
 * numbers an element among its like siblings, so when the steps card took the
 * parent's `PAIR_GROUP` heading away, every later heading's key named the one
 * before it ("Phones" read where "Pair a phone" was, "Alerts" where "Phones"
 * was) and the by-key comparison read two words changed that had not. A group
 * label is therefore never compared by key: the labels are read in the order
 * the section draws them, and the parent's, less `PAIR_GROUP`, must be HEAD's.
 */
export const isGroupLabelKey = (k) => /(^|> )div\.set-group-label#\d+$/.test(String(k));
export function groupLabels(reading) {
  return Object.entries(reading?.els ?? {})
    .filter(([k]) => isGroupLabelKey(k))
    .map(([, e]) => e)
    .sort((a, b) => a.r.y - b.r.y || a.r.x - b.r.x)
    .map((e) => e.t);
}
/** HEAD's group labels are the parent's in order, less the pair card's heading, which HEAD never draws. */
export const sameGroupLabels = (p, h) => {
  const hl = groupLabels(h);
  return !hl.includes(PAIR_GROUP) && J(groupLabels(p).filter((t) => t !== PAIR_GROUP)) === J(hl);
};

/** The rightmost edge any element reaches, relative to the section. */
const rightmost = (m) => Math.max(...Object.values(m.els).map((e) => e.r.x + e.r.w));

/**
 * THE LANDMARKS (Phase 333.1, D37): the four elements both builds draw with
 * one identity each. A reading names each one's key (or null when the face
 * does not draw it) and its content box's padding; this builds, per landmark,
 * the map of the elements inside it with every rectangle measured FROM THE
 * LANDMARK'S CONTENT BOX, so a landmark that moved down the section (the
 * steps above it) compares equal inside. Pure.
 */
export const LANDMARKS = Object.freeze(['title', 'pairBlock', 'keyRow', 'alertsRow']);
export function landmarksOf(reading) {
  const out = {};
  for (const name of LANDMARKS) {
    const key = reading?.landmarkKeys?.[name] ?? null;
    const lm = key === null ? undefined : reading.els[key];
    if (key === null || lm === undefined) {
      out[name] = null;
      continue;
    }
    const pad = reading.pads?.[key] ?? { top: 0, left: 0 };
    const els = {};
    const prefix = `${key} > `;
    for (const [k, e] of Object.entries(reading.els)) {
      if (!k.startsWith(prefix)) continue;
      els[k.slice(prefix.length)] = { ...e, r: { x: e.r.x - lm.r.x - pad.left, y: e.r.y - lm.r.y - pad.top, w: e.r.w, h: e.r.h } };
    }
    out[name] = { key, r: lm.r, t: lm.t ?? null, els };
  }
  return out;
}

/**
 * THE NAMED SET (D37, the fix round): inside a landmark, the elements that may
 * differ between the parent and HEAD, each with its reason. A key is RELATIVE
 * to its landmark. Everything else inside a landmark is equal, rectangle and
 * word, or CMP is red.
 */
export const NAMED = Object.freeze({
  // The code face's side column gains GET_PHONE_APP (D15): the column, and
  // everything in it, re-flows; its scan line is reworded.
  sideColumn: (k) => /(^|> )div\.phone-qr-side(\.|\[|#)/.test(k),
  // The rest face's Pair and its actions row (the parent draws Pair with the
  // door off; HEAD draws none with no phone paired, D17).
  restPair: (k) => /\[data-phone-action=pair\]/.test(k) || /(^|> )div\.set-config-actions(\.|\[|#)/.test(k),
  // The key row gains the publisher's caption (D14), HEAD's alone; its actions
  // column, centred in a taller row, moves (MOVES, below), and the buttons in
  // it move with it but keep their words and their state.
  keyRow: (k) => /\[data-phone-publisher/.test(k) || /^div\.phone-key-actions#\d+$/.test(k)
});
const namedFor = { title: () => false, pairBlock: (k) => NAMED.sideColumn(k) || NAMED.restPair(k), keyRow: NAMED.keyRow, alertsRow: () => false };
/**
 * Inside a landmark, the elements that may MOVE but never be reworded: the key
 * row's buttons, carried by their centred column. A Choose… or Forget that
 * reads other words or another state at HEAD is a finding.
 */
export const MOVES = Object.freeze({ keyRow: (k) => /^div\.phone-key-actions#\d+ > /.test(k) });
const movesFor = { title: () => false, pairBlock: () => false, keyRow: MOVES.keyRow, alertsRow: () => false };
/**
 * Inside a landmark, the elements that may GROW DOWNWARD and nothing else (the
 * 333.1 reverify, 2026-10-08): the key row's text column, which holds the
 * publisher's caption at HEAD (D14) under the label and the key line, so it
 * read 38 px tall at the parent and 56 at HEAD in every face, and CMP read it
 * as moved. Its place and width are the parent's to the half pixel; its height
 * may only be the parent's or more. What it holds is compared element by
 * element as before.
 */
export const GROWS = Object.freeze({ keyRow: (k) => k === 'div.set-row-text#0' });
const growsFor = { title: () => false, pairBlock: () => false, keyRow: GROWS.keyRow, alertsRow: () => false };
/** HEAD's rectangle is the parent's grown downward: the same x, y and width, a height no smaller. */
export const grewOnly = (a, b) => a !== null && b !== null && a !== undefined && b !== undefined && near(a.x, b.x) && near(a.y, b.y) && near(a.w, b.w) && Number.isFinite(b.h) && b.h >= a.h - 0.5;

/**
 * One landmark of the parent against HEAD: equal when both are absent; when
 * both are present, every key outside the named set exists at both builds
 * with the same rectangle and words (clocks excepted), but those MOVES lets
 * move and those GROWS lets grow downward; the named set may be absent at
 * either build, moved or reworded. Answers the differences found.
 */
export function compareLandmark(name, p, h) {
  if (p === null && h === null) return { ok: true, why: [] };
  if (p === null || h === null) return { ok: false, why: [`${name} drawn at ${p === null ? 'HEAD alone' : 'the parent alone'}`] };
  const named = namedFor[name];
  const why = [];
  const pk = Object.keys(p.els).filter((k) => !named(k)).sort();
  const hk = Object.keys(h.els).filter((k) => !named(k)).sort();
  if (J(pk) !== J(hk)) why.push(`${name}: the elements differ outside the named set (${J(pk.filter((k) => !hk.includes(k)))} parent only, ${J(hk.filter((k) => !pk.includes(k)))} HEAD only)`);
  const moves = movesFor[name];
  const grows = growsFor[name];
  for (const k of pk.filter((k) => hk.includes(k))) {
    if (!sameRect(p.els[k].r, h.els[k].r) && !moves(k) && !(grows(k) && grewOnly(p.els[k].r, h.els[k].r))) why.push(`${name}: ${k} moved`);
    if (!isClockKey(k) && (p.els[k].t !== h.els[k].t || J(p.els[k].b ?? null) !== J(h.els[k].b ?? null))) why.push(`${name}: ${k} reworded`);
  }
  if (name === 'title' && (!sameRect(p.r, h.r) || p.t !== h.t)) why.push('the title moved or was reworded');
  return { ok: why.length === 0, why };
}
/** Every landmark of two readings, by name. */
export function compareLandmarks(p, h) {
  const P = landmarksOf(p);
  const H = landmarksOf(h);
  const why = [];
  for (const name of LANDMARKS) why.push(...compareLandmark(name, P[name], H[name]).why);
  return { ok: why.length === 0, why };
}

// ---------------------------------------------------------------------------
// THE GRADERS (SPEC §6.5). Pure: each takes the reading an arm collected and
// answers which of its clauses failed. `--grader-self-test` runs every one
// over a passing fixture and, for EVERY clause, a fixture broken on that
// clause alone, which must fail on that clause.
// ---------------------------------------------------------------------------

/** The S readings a clause reads: the three real widths, then all five. */
const realWidths = (r) => WIDTHS.map((w) => r.at[String(w)]);
const everyS = (r) => [...realWidths(r), r.wide, r.again];
/** The side column's lines at a build, as SIDE_LINES spells them. */
const sideLinesAt = (r) => SIDE_LINES[r.atParent ? 'parent' : 'head'];
/** The first setup's press, drawn: Pair enabled, or the switch off and enabled (D17). */
const firstPressDrawn = (r) => (r.pair.drawn === true && r.pair.disabled === false) || (r.doorSwitch?.drawn === true && r.doorSwitch.checked === 'false' && r.doorSwitch.disabled === false);

/** The pairs CMP compares, by name: R, S's four, K's three. */
function cmpPairs(r) {
  const pairs = [['R', r.parent.R, r.head.R]];
  for (const w of WIDTHS) pairs.push([`S ${String(w)}`, r.parent.S.at[String(w)], r.head.S.at[String(w)]]);
  pairs.push(['S wide', r.parent.S.wide, r.head.S.wide]);
  for (const k of ['k0', 'k1', 'k2']) pairs.push([`K ${k}`, r.parent.K[k], r.head.K[k]]);
  return pairs;
}

export const GRADERS = {
  R: {
    title: 'at rest: the door off, the first setup’s press drawn, the key row with no key, no alert switch, no link, nothing past the section',
    clauses: [
      ['stage start', (r) => r.stage === 'start'],
      ['the first setup’s press drawn', firstPressDrawn],
      ['the key row drawn', (r) => r.keyRow === true && r.keyLine === KEY_NONE],
      ['no switch without a key', (r) => r.alerts.drawn === false],
      ['no link', (r) => r.link === false],
      ['inside the section', (r) => r.scrollWidth <= r.clientWidth]
    ]
  },
  S: {
    title: 'the code: the side column’s lines, text only, one line each, inside the section, at 640, 760 and 1200',
    clauses: [
      ['stage showing at every width', (r) => everyS(r).every((m) => m.stage === 'showing')],
      ['the side column’s lines, in order', (r) => everyS(r).every((m) => J(m.sideLines) === J(sideLinesAt(r)) && m.scanText === sideLinesAt(r)[0])],
      ['text only', (r) => everyS(r).every((m) => m.scanTag === 'P' && m.scanChildElements === 0 && m.sideLineTags?.every((x) => x === 'P') === true && m.sideLineChildElements?.every((n) => n === 0) === true && m.tortieControl === false)],
      ['the private line last', (r) => everyS(r).every((m) => m.sideLines?.at(-1) === CODE_PRIVATE)],
      ['one line each at every width', (r) => realWidths(r).every((m) => Number.isFinite(m.scanLineHeight) && m.sideLineKeys?.every((k) => m.els[k].r.h <= m.scanLineHeight + 0.5) === true)],
      ['inside the section at every width', (r) => realWidths(r).every((m) => rightmost(m) <= m.sectionW + 0.5 && m.scrollWidth <= m.clientWidth)],
      ['the same code at every width', (r) => {
        const all = everyS(r).map((m) => m.qrModules);
        return all.every((n) => Number.isInteger(n) && n > 0 && n === all[0]);
      }]
    ]
  },
  K: {
    title: 'the key: no switch before it, the key and the switch with it, neither after Forget, no new Allow',
    clauses: [
      ['no switch before a key', (r) => r.k0.keyLine === KEY_NONE && r.k0.alerts.drawn === false && r.s0.pushKeyId === null],
      ['the key kept', (r) => r.k1.keyLine === KEY_KEPT && r.s1.pushKeyId === KEY_ID],
      ['the switch with a key', (r) =>
        r.k1.alerts.drawn === true &&
        r.k1.alerts.label === PUSH_LABEL &&
        r.k1.alerts.switchLabel === PUSH_LABEL &&
        r.k1.alerts.checked === 'false' &&
        r.k1.alerts.disabled === false &&
        r.s1.state === 'listening'],
      ['no switch after Forget', (r) => r.k2.keyLine === KEY_NONE && r.k2.alerts.drawn === false && r.s2.pushKeyId === null],
      ['no new Allow', (r) => typeof r.s0.confirmState === 'string' && r.s0.confirmState === r.s1.confirmState && r.s1.confirmState === r.s2.confirmState]
    ]
  },
  CMP: {
    title: 'the parent against HEAD, landmark by landmark: every rectangle and word inside a landmark equal but the named set (D37)',
    clauses: [
      ['the parent reading is the parent’s', (r) =>
        r.parent.atParent === true && typeof r.parent.checkout === 'string' && r.parent.checkout !== r.root && everyS(r.parent.S).every((m) => m.scanText === PARENT_SCAN)],
      ['the same landmarks at every face', (r) =>
        cmpPairs(r).every(([, p, h]) => LANDMARKS.every((n) => (landmarksOf(p)[n] === null) === (landmarksOf(h)[n] === null)))],
      ['rest equal inside each landmark but the named set', (r) => {
        const L = landmarksOf(r.head.R);
        return compareLandmarks(r.parent.R, r.head.R).ok && L.pairBlock !== null && L.keyRow !== null && L.title !== null;
      }],
      ['the code face equal inside each landmark but the side column', (r) =>
        WIDTHS.every((w) => {
          const P = r.parent.S.at[String(w)];
          const H = r.head.S.at[String(w)];
          const lp = landmarksOf(P).pairBlock;
          const lh = landmarksOf(H).pairBlock;
          // The code, by its key RELATIVE to the block (the block's own key
          // moved: the steps card sits before it at HEAD), at the same place.
          const qr = lh === null ? undefined : Object.keys(lh.els).find((k) => /^svg\.phone-qr/.test(k));
          return (
            compareLandmarks(P, H).ok &&
            lp !== null &&
            lh !== null &&
            qr !== undefined &&
            lp.els[qr] !== undefined &&
            sameRect(lp.els[qr].r, lh.els[qr].r) &&
            Object.keys(lh.els).some(NAMED.sideColumn)
          );
        })],
      // The group labels by their words, in order, never by key (the reverify).
      ['the words unchanged but the side column', (r) =>
        cmpPairs(r).every(([, p, h]) => compareMaps(p, h).reworded.every((k) => isClockKey(k) || NAMED.sideColumn(k) || isGroupLabelKey(k)) && sameGroupLabels(p, h))],
      ['the same placement at every real width', (r) => WIDTHS.every((w) => typeof r.head.S.at[String(w)].beside === 'boolean' && r.parent.S.at[String(w)].beside === r.head.S.at[String(w)].beside)],
      ['the key arm equal inside each landmark but the named set', (r) =>
        ['k0', 'k1', 'k2'].every((k) => {
          const L = landmarksOf(r.head.K[k]);
          return compareLandmarks(r.parent.K[k], r.head.K[k]).ok && L.keyRow !== null && Object.keys(L.keyRow.els).length > 0 && (k !== 'k1' || L.alertsRow !== null);
        })],
      ['the publisher’s caption in the key row at HEAD alone', (r) =>
        ['R', 'k0', 'k1', 'k2'].every((k) => {
          const h = k === 'R' ? r.head.R : r.head.K[k];
          const p = k === 'R' ? r.parent.R : r.parent.K[k];
          const hk = Object.entries(landmarksOf(h).keyRow?.els ?? {}).filter(([key]) => /\[data-phone-publisher/.test(key));
          const pk = Object.keys(landmarksOf(p).keyRow?.els ?? {}).filter((key) => /\[data-phone-publisher/.test(key));
          return hk.length === 1 && hk[0][1].t === PUBLISHER_ONLY && pk.length === 0;
        })]
    ]
  },
  RUN: {
    title: 'no real Tailscale, no real DNS, no agent, nothing off the Mac, nothing to Apple, nothing left',
    clauses: [
      ['the Tailscale preflight', (r) => r.tailscalePreflight === true],
      ['the DNS preflight, loopback alone', (r) => r.dnsPreflight === true && r.joinedOk === true],
      ['the hidden agents resolve nowhere', (r) => r.agentsPrecheck.length > 0 && r.agentsPrecheck.every((x) => x === true) && r.agentsScan.length > 0 && r.agentsScan.every((x) => x === true)],
      ['no real Tailscale', (r) => r.realTailscale === 0 && r.samples > 0],
      ['no forbidden argv', (r) => r.forbidden === 0 && r.refusedArgv === 0],
      ['UDP to 127.0.0.1 alone', (r) => r.udpLeaks === 0 && r.udpSamples > 0],
      ['every DNS question an A, RD 0, for the name', (r) => r.totalQuestions > 0 && r.questionProblems.length === 0],
      ['the sheet asked nothing off the Mac', (r) => r.networkRead === true && offMacUrls(r.urls).length === 0],
      ['nothing reached Apple’s stand-in', (r) => r.apnsRequests === 0 && r.apnsConnections.development === 0 && r.apnsConnections.production === 0],
      ['app.log holds no key and no name', (r) => r.appLogRead === true && r.appLogBegin === false && r.appLogPemLine === false && r.appLogName === false && r.appLogAddress === false],
      ['the key file is gone', (r) => r.keyFileGone === true],
      ['every stand-in ended', (r) => r.standinLeft === 0 && r.dnsClosed === true && r.apnsClosed === true],
      ['no Electron left', (r) => r.electronLeft === 0]
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

/**
 * CMP's precondition, not a clause (SPEC §6.5): both 760 readings were laid
 * out at 760 and drew the same code. Null when it holds, else the sentence.
 */
export function cmpPrecondition(parent, head) {
  const p = parent?.S?.at?.['760'];
  const h = head?.S?.at?.['760'];
  if (p === undefined || h === undefined) return 'a 760 reading is missing at one build';
  if (p.innerWidth !== 760 || h.innerWidth !== 760) return `the window was ${String(p.innerWidth)} px wide at the parent and ${String(h.innerWidth)} at HEAD, not 760 at both`;
  if (!Number.isInteger(p.qrModules) || p.qrModules !== h.qrModules) return `the code was ${String(p.qrModules)} modules at the parent and ${String(h.qrModules)} at HEAD`;
  // The reverify: every code reading at the same height at both builds, so a
  // first reading taken while R's override still held at one build alone is
  // refused rather than compared (its section 10 px wider, with no scrollbar).
  for (const [name, P, H] of [...WIDTHS.map((w) => [`S ${String(w)}`, parent.S.at[String(w)], head.S.at[String(w)]]), ['S wide', parent.S.wide, head.S.wide]]) {
    if (P === undefined || H === undefined || P === null || H === null) return `the ${name} reading is missing at one build`;
    if (P.innerHeight !== H.innerHeight) return `the ${name} reading was ${String(P.innerHeight)} px tall at the parent and ${String(H.innerHeight)} at HEAD`;
  }
  // The fix round: R and K are read at the window's own width and READ_HEIGHT
  // tall at both builds, so no scrollbar narrows one build's section; a
  // reading at another height or width is refused, never compared.
  for (const [name, P, H] of [['R', parent?.R, head?.R], ['K k0', parent?.K?.k0, head?.K?.k0], ['K k1', parent?.K?.k1, head?.K?.k1], ['K k2', parent?.K?.k2, head?.K?.k2]]) {
    if (P === undefined || H === undefined || P === null || H === null) return `the ${name} reading is missing at one build`;
    if (P.innerHeight !== READ_HEIGHT || H.innerHeight !== READ_HEIGHT) return `the ${name} reading was ${String(P.innerHeight)} px tall at the parent and ${String(H.innerHeight)} at HEAD, not ${String(READ_HEIGHT)} at both`;
    if (P.innerWidth !== H.innerWidth) return `the ${name} reading was ${String(P.innerWidth)} px wide at the parent and ${String(H.innerWidth)} at HEAD`;
  }
  return null;
}

// ---------------------------------------------------------------------------
// THE FIXTURES: a model of the section at each build, by SPEC §6.6's geometry.
// The numbers are CoreText's widths; the model is a fixture, never the claim.
// ---------------------------------------------------------------------------

const MODEL = Object.freeze({ nav: 248, cap: 560, inset: 26, qrPx: 308, gap: 16, scan: { parent: 318.49, head: 192.82 }, getW: 160.2, privateW: 240.41, countdownW: 96.43, cancelW: 64, line: 18, rowGap: 6, buttonH: 28, qrModules: 69, stepsH: 210, publisherW: 272.6 });

/** One element of a model reading. */
const el = (r, t = null, b = undefined) => ({ r: { ...r }, t, ...(b === undefined ? {} : { b }) });
const button = (label, disabled = false, extra = {}) => ({ checked: extra.checked ?? null, label: extra.label ?? null, disabled });

/**
 * A model reading of the section. `face` is `rest`, `showing`, `k0`, `k1` or
 * `k2`; `build` is `parent` or `head`; `width` the window's; `qrPx` the code's;
 * `height` the window's (R and K are read READ_HEIGHT tall, S at the S height).
 * The parent is cb8d52a6's section (Phase 333.2's scan line, Pair with the
 * door off); HEAD has the three steps between the switch row and the pair
 * card, a side column of three lines, the publisher's caption in the key row,
 * and no Pair at rest (build/p3331/SPEC.md §5.4, D37).
 */
export function modelReading({ face, build, width = 760, qrPx = MODEL.qrPx, height = undefined }) {
  const head = build === 'head';
  const secW = Math.min(MODEL.cap, width - MODEL.nav);
  const S = 'section.phone-section#0';
  const els = {};
  const pads = {};
  const put = (key, e) => (els[key] = e);
  put(S, el({ x: 0, y: 0, w: secW, h: 0 }));
  const titleKey = `${S} > h1.set-title#0`;
  put(titleKey, el({ x: 0, y: 0, w: secW, h: 24 }, 'Phone'));
  let y;
  if (head) {
    y = 30;
  } else {
    put(`${S} > div.set-section-caption#0`, el({ x: 0, y: 30, w: secW, h: 18 }, 'Your phone reaches this Mac through Tailscale Funnel. Only a phone you pair gets an answer.'));
    y = 56;
  }
  const on = face !== 'rest';
  const switchRow = `${S} > div.set-card#0`;
  put(switchRow, el({ x: 0, y, w: secW, h: head ? 66 : 50 }));
  if (head) put(`${switchRow} > div.set-row.tall#0 > div.set-row-text#0 > span.set-row-caption#0`, el({ x: 13, y: y + 36, w: 340, h: 16 }, 'Your iPhone needs only the Tortie app. This Mac needs Tailscale (free).'));
  put(`${switchRow} > div.set-row.tall#0 > button.set-switch${on ? '.on' : ''}#0`, el({ x: secW - 44, y: y + 14, w: 32, h: 18 }, null, button('switch', false, { checked: String(on), label: DOOR_LABEL })));
  y += (head ? 66 : 50) + 10;
  let cardIndex = 1;
  if (head) {
    // The steps card (D1): three headers, step 1's shut disclosure, and the
    // pair card as step 3's body, which is the landmark.
    const steps = `${S} > div.set-card.phone-steps#1`;
    put(steps, el({ x: 0, y, w: secW, h: MODEL.stepsH }));
    put(`${steps} > div.phone-step[data-phone-step=tailscale][data-phone-step-state=installed]#0 > div.phone-step-head#0 > span.phone-step-title#0`, el({ x: 45, y: y + 12, w: 140, h: 18 }, 'Tailscale on this Mac'));
    put(`${steps} > div.phone-step[data-phone-step=publish][data-phone-step-state=]#0 > div.phone-step-head#0 > span.phone-step-title#0`, el({ x: 45, y: y + 82, w: 110, h: 18 }, 'Publish this Mac'));
    put(`${steps} > div.phone-step[data-phone-step=pair][data-phone-step-state=]#0 > div.phone-step-head#0 > span.phone-step-title#0`, el({ x: 45, y: y + 140, w: 100, h: 18 }, 'Pair your phone'));
    y += MODEL.stepsH + 10;
    cardIndex = 2;
  }
  // The group labels (the reverify): the parent heads its pair card with
  // PAIR_GROUP, which HEAD leaves to step 3's title, so every later label's key
  // numbers one fewer at HEAD; "Phones" and "Alerts" are the same words at both.
  let groupIndex = 0;
  const groupLabel = (text) => {
    put(`${S} > div.set-group-label#${String(groupIndex)}`, el({ x: 0, y, w: secW, h: 20 }, text));
    groupIndex += 1;
    y += 26;
  };
  if (!head) groupLabel(PAIR_GROUP);
  const card = `${S} > div.set-card#${String(cardIndex)}`;
  let scanKey = null;
  let sideKey = null;
  let qrKey = null;
  let beside = null;
  let stage;
  let blockKey;
  const sideLines = SIDE_LINES[build];
  const sideLineKeys = [];
  if (face === 'showing') {
    stage = 'showing';
    const content = secW - MODEL.inset;
    const scanW = MODEL.scan[build];
    const sideW = Math.max(scanW, head ? MODEL.getW : 0, MODEL.privateW, MODEL.countdownW, MODEL.cancelW);
    const sideH = sideLines.length * MODEL.line + sideLines.length * MODEL.rowGap + MODEL.line + MODEL.rowGap + MODEL.buttonH;
    beside = qrPx + MODEL.gap + sideW <= content;
    const x0 = 13;
    const y0 = y + 12;
    const side = beside ? { x: x0 + qrPx + MODEL.gap, y: y0 + (qrPx - sideH) / 2 } : { x: x0, y: y0 + qrPx + MODEL.gap };
    const blockH = (beside ? qrPx : qrPx + MODEL.gap + sideH) + 24;
    blockKey = `${card} > div.phone-block.phone-showing[data-phone-stage=showing]#0`;
    put(card, el({ x: 0, y, w: secW, h: blockH + 2 }));
    put(blockKey, el({ x: 1, y: y + 1, w: secW - 2, h: blockH }));
    pads[blockKey] = { top: 11, left: 12 };
    qrKey = `${blockKey} > svg.phone-qr#0`;
    put(qrKey, el({ x: x0, y: y0, w: qrPx, h: qrPx }));
    sideKey = `${blockKey} > div.phone-qr-side#0`;
    put(sideKey, el({ x: side.x, y: side.y, w: sideW, h: sideH }));
    let ly = side.y;
    const widths = head ? [scanW, MODEL.getW, MODEL.privateW] : [scanW, MODEL.privateW];
    sideLines.forEach((text, i) => {
      const k = `${sideKey} > p.phone-line${i === 1 && head ? '[data-phone-get-app=true]' : ''}#${String(i === 2 && head ? 1 : i === 1 && head ? 0 : i)}`;
      put(k, el({ x: side.x, y: ly, w: widths[i], h: MODEL.line }, text));
      sideLineKeys.push(k);
      ly += MODEL.line + MODEL.rowGap;
    });
    scanKey = sideLineKeys[0];
    put(`${sideKey} > p.phone-countdown[data-phone-countdown]#0`, el({ x: side.x, y: ly, w: MODEL.countdownW, h: MODEL.line }, 'Shuts in 2:41'));
    ly += MODEL.line + MODEL.rowGap;
    put(`${sideKey} > button.btn.btn-secondary[data-phone-action=cancel-pairing]#0`, el({ x: side.x, y: ly, w: MODEL.cancelW, h: MODEL.buttonH }, 'Cancel', button('Cancel')));
    y += blockH + 12;
  } else {
    stage = face === 'rest' ? 'start' : 'ready';
    blockKey = `${card} > div.phone-block[data-phone-stage=${stage}]#0`;
    // HEAD draws no Pair at rest with no phone paired (D17): an empty block.
    const drawsPair = !(head && face === 'rest');
    const blockH = drawsPair ? 52 : 24;
    put(card, el({ x: 0, y, w: secW, h: blockH + 2 }));
    put(blockKey, el({ x: 1, y: y + 1, w: secW - 2, h: blockH }));
    pads[blockKey] = { top: 11, left: 12 };
    if (drawsPair) {
      put(`${blockKey} > div.set-config-actions#0`, el({ x: 13, y: y + 13, w: secW - 26, h: MODEL.buttonH }));
      put(`${blockKey} > div.set-config-actions#0 > button.btn.btn-primary[data-phone-action=pair]#0`, el({ x: 13, y: y + 13, w: 48, h: MODEL.buttonH }, 'Pair', button('Pair')));
    }
    y += blockH + 12;
  }
  groupLabel('Phones');
  const phonesCard = `${S} > div.set-card#${String(cardIndex + 1)}`;
  put(phonesCard, el({ x: 0, y, w: secW, h: 46 }));
  put(`${phonesCard} > div.set-empty-line#0`, el({ x: 1, y: y + 1, w: secW - 2, h: 44 }, 'No phone yet.'));
  y += 46 + 16;
  groupLabel('Alerts');
  const alertsCard = `${S} > div.set-card#${String(cardIndex + 2)}`;
  const keyRow = `${alertsCard} > div.set-row.tall[data-phone-key]#0`;
  const kept = face === 'k1';
  const keyRowH = head ? 70 : 52;
  put(alertsCard, el({ x: 0, y, w: secW, h: keyRowH + 2 + (kept ? 56 : 0) }));
  put(keyRow, el({ x: 1, y: y + 1, w: secW - 2, h: keyRowH }));
  pads[keyRow] = { top: 8, left: 12 };
  // The text column (the reverify): the same place and width at both builds,
  // taller at HEAD by the publisher's caption it holds (GROWS).
  put(`${keyRow} > div.set-row-text#0`, el({ x: 13, y: y + 9, w: secW - 122, h: head ? 50 : 34 }));
  put(`${keyRow} > div.set-row-text#0 > span.set-row-label#0`, el({ x: 13, y: y + 9, w: 92, h: 18 }, 'Apple push key'));
  put(`${keyRow} > div.set-row-text#0 > span.set-row-caption[data-phone-key-line]#0`, el({ x: 13, y: y + 27, w: kept ? 98 : 70, h: 16 }, kept ? KEY_KEPT : KEY_NONE));
  if (head) put(`${keyRow} > div.set-row-text#0 > span.set-row-caption[data-phone-publisher=true]#0`, el({ x: 13, y: y + 43, w: MODEL.publisherW, h: 16 }, PUBLISHER_ONLY));
  const actionsY = y + 1 + (keyRowH - MODEL.buttonH) / 2;
  put(`${keyRow} > div.phone-key-actions#0`, el({ x: secW - (kept ? 150 : 80), y: actionsY, w: kept ? 136 : 68, h: MODEL.buttonH }));
  put(`${keyRow} > div.phone-key-actions#0 > button.btn.btn-secondary[data-phone-action=choose-key]#0`, el({ x: secW - (kept ? 150 : 80), y: actionsY, w: 68, h: MODEL.buttonH }, 'Choose…', button('Choose…')));
  let alertsRowKey = null;
  if (kept) {
    put(`${keyRow} > div.phone-key-actions#0 > button.btn.btn-secondary[data-phone-action=forget-key]#0`, el({ x: secW - 76, y: actionsY, w: 64, h: MODEL.buttonH }, 'Forget', button('Forget')));
    alertsRowKey = `${alertsCard} > div.set-row.tall[data-phone-alerts]#0`;
    put(alertsRowKey, el({ x: 1, y: y + 1 + keyRowH + 1, w: secW - 2, h: 54 }));
    pads[alertsRowKey] = { top: 8, left: 12 };
    put(`${alertsRowKey} > div.set-row-text#0 > span.set-row-label#0`, el({ x: 13, y: y + keyRowH + 10, w: 230, h: 18 }, PUSH_LABEL));
    put(`${alertsRowKey} > button.set-switch#0`, el({ x: secW - 44, y: y + keyRowH + 20, w: 32, h: 18 }, null, button('switch', false, { checked: 'false', label: PUSH_LABEL })));
  }
  const h = y + keyRowH + 2 + (kept ? 56 : 0);
  els[S].r.h = h;
  const drawsPairNow = face === 'showing' ? false : !(head && face === 'rest');
  return {
    at: 0,
    innerWidth: width,
    innerHeight: height ?? (face === 'showing' ? 560 : READ_HEIGHT),
    sectionW: secW,
    scrollWidth: secW,
    clientWidth: secW,
    stage,
    qrModules: face === 'showing' ? MODEL.qrModules : null,
    scanKey,
    sideKey,
    qrKey,
    scanText: scanKey === null ? null : els[scanKey].t,
    scanTag: scanKey === null ? null : 'P',
    scanChildElements: scanKey === null ? null : 0,
    scanLineHeight: scanKey === null ? null : MODEL.line,
    sideLines: scanKey === null ? [] : [...sideLines],
    sideLineKeys,
    sideLineTags: sideLineKeys.map(() => 'P'),
    sideLineChildElements: sideLineKeys.map(() => 0),
    nextLineText: scanKey === null ? null : sideLines[1],
    link: false,
    tortieControl: false,
    beside,
    pair: { drawn: drawsPairNow, disabled: drawsPairNow ? false : null },
    doorSwitch: { drawn: true, checked: String(on), disabled: false },
    keyRow: true,
    keyLine: kept ? KEY_KEPT : KEY_NONE,
    alerts: kept ? { drawn: true, label: PUSH_LABEL, switchLabel: PUSH_LABEL, checked: 'false', disabled: false } : { drawn: false, label: null, switchLabel: null, checked: null, disabled: null },
    landmarkKeys: { title: titleKey, pairBlock: blockKey, keyRow, alertsRow: alertsRowKey },
    pads,
    els
  };
}

/** An S reading of the model at one build. */
function modelS(build) {
  const at = Object.fromEntries(WIDTHS.map((w) => [String(w), modelReading({ face: 'showing', build, width: w })]));
  return { atParent: build === 'parent', at, wide: modelReading({ face: 'showing', build, width: 1200, qrPx: WIDE_QR_PX }), again: modelReading({ face: 'showing', build, width: 760 }) };
}
/** A K reading of the model. */
const modelK = (build) => ({
  k0: modelReading({ face: 'k0', build }),
  k1: modelReading({ face: 'k1', build }),
  k2: modelReading({ face: 'k2', build }),
  s0: { state: 'listening', pushKeyId: null, confirmState: 'confirmed' },
  s1: { state: 'listening', pushKeyId: KEY_ID, confirmState: 'confirmed' },
  s2: { state: 'listening', pushKeyId: null, confirmState: 'confirmed' }
});
const FIX_ROOT = '/private/tmp/wt-head';
const modelCmp = () => ({
  root: FIX_ROOT,
  parent: { atParent: true, checkout: '/private/tmp/p3332-parent', R: modelReading({ face: 'rest', build: 'parent' }), S: modelS('parent'), K: modelK('parent') },
  head: { R: modelReading({ face: 'rest', build: 'head' }), S: modelS('head'), K: modelK('head') }
});

/** Edit one element's rectangle. */
const nudge = (m, key, d, by) => void (m.els[key].r[d] += by);
const firstKey = (m, re) => Object.keys(m.els).find((k) => re.test(k));

export const GRADER_FIXTURES = {
  R: {
    pass: modelReading({ face: 'rest', build: 'head' }),
    breaks: {
      'stage start': (r) => void (r.stage = 'ready'),
      'the first setup’s press drawn': (r) => void (r.doorSwitch.disabled = true),
      'the key row drawn': (r) => void (r.keyLine = KEY_KEPT),
      'no switch without a key': (r) => void (r.alerts.drawn = true),
      'no link': (r) => void (r.link = true),
      'inside the section': (r) => void (r.scrollWidth = r.clientWidth + 12)
    },
    refused: [
      { what: 'a key row that is not drawn', clause: 'the key row drawn', edit: (r) => void (r.keyRow = false) },
      { what: 'the switch already on at rest, and no Pair', clause: 'the first setup’s press drawn', edit: (r) => void (r.doorSwitch.checked = 'true') },
      { what: 'no switch and no Pair', clause: 'the first setup’s press drawn', edit: (r) => void (r.doorSwitch.drawn = false) },
      { what: 'Pair drawn but disabled, the switch on', clause: 'the first setup’s press drawn', edit: (r) => { r.pair = { drawn: true, disabled: true }; r.doorSwitch.checked = 'true'; } }
    ]
  },
  S: {
    pass: modelS('head'),
    breaks: {
      'stage showing at every width': (r) => void (r.again.stage = 'ready'),
      'the side column’s lines, in order': (r) => void (r.at['640'].scanText = PARENT_SCAN),
      'text only': (r) => void (r.at['1200'].scanChildElements = 1),
      'the private line last': (r) => void (r.wide.sideLines[r.wide.sideLines.length - 1] = 'Shuts in 2:41'),
      'one line each at every width': (r) => void (r.at['640'].els[r.at['640'].scanKey].r.h = 36),
      // HEAD's scan line is short (D15), so the break widens it past the section.
      'inside the section at every width': (r) => nudge(r.at['640'], r.at['640'].scanKey, 'w', 400),
      'the same code at every width': (r) => void (r.at['1200'].qrModules = 73)
    },
    refused: [
      { what: 'the parent’s words at HEAD', clause: 'the side column’s lines, in order', edit: (r) => Object.values(r.at).forEach((m) => { m.scanText = PARENT_SCAN; m.sideLines = [...SIDE_LINES.parent]; }) },
      { what: 'HEAD’s words in a parent reading', clause: 'the side column’s lines, in order', edit: (r) => void (r.atParent = true) },
      { what: 'the address line missing at HEAD', clause: 'the side column’s lines, in order', edit: (r) => void (r.at['760'].sideLines = [HEAD_SCAN, CODE_PRIVATE]) },
      { what: 'the address line after the private line', clause: 'the side column’s lines, in order', edit: (r) => void (r.wide.sideLines = [HEAD_SCAN, CODE_PRIVATE, HEAD_GET]) },
      { what: 'the address in a button', clause: 'text only', edit: (r) => void (r.at['760'].tortieControl = true) },
      { what: 'the scan line drawn in a span', clause: 'text only', edit: (r) => void (r.wide.scanTag = 'SPAN') },
      { what: 'the address line drawn in a span', clause: 'text only', edit: (r) => void (r.at['640'].sideLineTags[1] = 'SPAN') },
      { what: 'a section that scrolls sideways at 1200', clause: 'inside the section at every width', edit: (r) => void (r.at['1200'].scrollWidth = r.at['1200'].clientWidth + 1) },
      { what: 'no code drawn', clause: 'the same code at every width', edit: (r) => everyS(r).forEach((m) => void (m.qrModules = null)) },
      { what: 'a line height that could not be read', clause: 'one line each at every width', edit: (r) => void (r.at['760'].scanLineHeight = Number.NaN) },
      { what: 'the address line wrapped to two lines at 640', clause: 'one line each at every width', edit: (r) => void (r.at['640'].els[r.at['640'].sideLineKeys[1]].r.h = 36) }
    ]
  },
  K: {
    pass: modelK('head'),
    breaks: {
      'no switch before a key': (r) => void (r.k0.alerts.drawn = true),
      'the key kept': (r) => void (r.s1.pushKeyId = null),
      'the switch with a key': (r) => void (r.k1.alerts.checked = 'true'),
      'no switch after Forget': (r) => void (r.k2.alerts.drawn = true),
      'no new Allow': (r) => void (r.s1.confirmState = 'changed')
    },
    refused: [
      { what: 'a switch that cannot be pressed with the door on', clause: 'the switch with a key', edit: (r) => void (r.k1.alerts.disabled = true) },
      { what: 'the switch named something else', clause: 'the switch with a key', edit: (r) => void (r.k1.alerts.switchLabel = 'Alerts') },
      { what: 'the key line still naming the key after Forget', clause: 'no switch after Forget', edit: (r) => void (r.k2.keyLine = KEY_KEPT) },
      { what: 'a key main says it holds before Choose…', clause: 'no switch before a key', edit: (r) => void (r.s0.pushKeyId = KEY_ID) }
    ]
  },
  CMP: {
    pass: modelCmp(),
    breaks: {
      'the parent reading is the parent’s': (r) => void (r.parent.atParent = false),
      'the same landmarks at every face': (r) => void (r.head.K.k1.landmarkKeys.alertsRow = null),
      'rest equal inside each landmark but the named set': (r) => nudge(r.head.R, firstKey(r.head.R, /data-phone-key-line/), 'y', 3),
      'the code face equal inside each landmark but the side column': (r) => nudge(r.head.S.at['760'], r.head.S.at['760'].qrKey, 'x', 2),
      // Outside every landmark, so only this clause reads it: the switch's own name.
      'the words unchanged but the side column': (r) => void (r.head.K.k0.els[firstKey(r.head.K.k0, /button\.set-switch/)].b.label = 'Let my Mac be reached'),
      'the same placement at every real width': (r) => void (r.head.S.at['640'].beside = true),
      'the key arm equal inside each landmark but the named set': (r) => nudge(r.head.K.k2, firstKey(r.head.K.k2, /data-phone-key-line/), 'x', -4),
      'the publisher’s caption in the key row at HEAD alone': (r) => void delete r.head.R.els[firstKey(r.head.R, /data-phone-publisher/)]
    },
    refused: [
      { what: 'a parent reading taken from HEAD’s own tree', clause: 'the parent reading is the parent’s', edit: (r) => void (r.parent.checkout = r.root) },
      { what: 'HEAD’s words in the parent reading', clause: 'the parent reading is the parent’s', edit: (r) => void (r.parent.S.wide.scanText = HEAD_SCAN) },
      { what: 'the code moved inside its block at 1200', clause: 'the code face equal inside each landmark but the side column', edit: (r) => nudge(r.head.S.at['1200'], r.head.S.at['1200'].qrKey, 'y', 18) },
      { what: 'the code’s block holding no side column at HEAD', clause: 'the code face equal inside each landmark but the side column', edit: (r) => { const H = r.head.S.at['640']; for (const k of Object.keys(H.els)) if (NAMED.sideColumn(k)) delete H.els[k]; } },
      { what: 'the title narrowed at HEAD by a scrollbar', clause: 'the key arm equal inside each landmark but the named set', edit: (r) => nudge(r.head.K.k0, r.head.K.k0.landmarkKeys.title, 'w', -10) },
      { what: 'the key row’s label moved by the caption', clause: 'rest equal inside each landmark but the named set', edit: (r) => nudge(r.head.R, firstKey(r.head.R, /data-phone-key\]#0 > div\.set-row-text#0 > span\.set-row-label#0$/), 'y', 8) },
      { what: 'the alerts row’s switch moved at HEAD', clause: 'the key arm equal inside each landmark but the named set', edit: (r) => nudge(r.head.K.k1, firstKey(r.head.K.k1, /data-phone-alerts\]#0 > button\.set-switch#0$/), 'x', -3) },
      { what: 'a second publisher caption at HEAD', clause: 'the publisher’s caption in the key row at HEAD alone', edit: (r) => void (r.head.K.k0.els[`${r.head.K.k0.landmarkKeys.keyRow} > div.set-row-text#0 > span.set-row-caption[data-phone-publisher=true]#1`] = el({ x: 13, y: 0, w: 10, h: 16 }, PUBLISHER_ONLY)) },
      { what: 'the caption reworded at HEAD', clause: 'the publisher’s caption in the key row at HEAD alone', edit: (r) => void (r.head.K.k2.els[firstKey(r.head.K.k2, /data-phone-publisher/)].t = 'Only the publisher can send alerts.') },
      { what: 'the caption drawn at the parent too', clause: 'the publisher’s caption in the key row at HEAD alone', edit: (r) => void (r.parent.R.els[`${r.parent.R.landmarkKeys.keyRow} > div.set-row-text#0 > span.set-row-caption[data-phone-publisher=true]#0`] = el({ x: 13, y: 0, w: 10, h: 16 }, PUBLISHER_ONLY)) },
      // Inside the key row, whose key sits under another card index at HEAD,
      // so the landmark's own comparison is the clause that reads them.
      { what: 'a word changed in the key arm', clause: 'the key arm equal inside each landmark but the named set', edit: (r) => void (r.head.K.k2.els[firstKey(r.head.K.k2, /data-phone-key\]#0 > div\.set-row-text#0 > span\.set-row-label#0$/)].t = 'Apple key') },
      { what: 'a button disabled at one build', clause: 'the key arm equal inside each landmark but the named set', edit: (r) => void (r.head.K.k0.els[firstKey(r.head.K.k0, /choose-key/)].b.disabled = true) },
      { what: 'Forget reworded in its moving column', clause: 'the key arm equal inside each landmark but the named set', edit: (r) => void (r.head.K.k1.els[firstKey(r.head.K.k1, /forget-key/)].t = 'Remove') },
      { what: 'the switch named otherwise at rest', clause: 'the words unchanged but the side column', edit: (r) => void (r.head.R.els[firstKey(r.head.R, /button\.set-switch/)].b.label = 'Let my Mac be reached') },
      { what: 'a landmark the parent did not draw', clause: 'the same landmarks at every face', edit: (r) => { r.head.R.landmarkKeys.alertsRow = `${r.head.R.landmarkKeys.keyRow.replace(/ > [^>]*$/, '')} > div.set-row.tall[data-phone-alerts]#0`; r.head.R.els[r.head.R.landmarkKeys.alertsRow] = el({ x: 1, y: 300, w: 100, h: 54 }); } },
      { what: 'a placement read as nothing', clause: 'the same placement at every real width', edit: (r) => WIDTHS.forEach((w) => { r.head.S.at[String(w)].beside = null; r.parent.S.at[String(w)].beside = null; }) },
      // The reverify's two gaps, closed without opening a hole: the key row's
      // text column may grow downward and nothing else, and a group label is
      // read by its words.
      { what: 'the key row’s text column moved sideways at HEAD', clause: 'rest equal inside each landmark but the named set', edit: (r) => nudge(r.head.R, firstKey(r.head.R, /data-phone-key\]#0 > div\.set-row-text#0$/), 'x', 4) },
      { what: 'the key row’s text column narrowed at HEAD', clause: 'the key arm equal inside each landmark but the named set', edit: (r) => nudge(r.head.K.k1, firstKey(r.head.K.k1, /data-phone-key\]#0 > div\.set-row-text#0$/), 'w', -30) },
      { what: 'the key row’s text column shorter at HEAD than at the parent', clause: 'rest equal inside each landmark but the named set', edit: (r) => void (r.head.R.els[firstKey(r.head.R, /data-phone-key\]#0 > div\.set-row-text#0$/)].r.h = 20) },
      { what: 'the key row’s text column pushed down at HEAD', clause: 'the key arm equal inside each landmark but the named set', edit: (r) => nudge(r.head.K.k2, firstKey(r.head.K.k2, /data-phone-key\]#0 > div\.set-row-text#0$/), 'y', 6) },
      { what: 'a group label reworded at HEAD', clause: 'the words unchanged but the side column', edit: (r) => void (r.head.K.k0.els[firstKey(r.head.K.k0, /div\.set-group-label#\d+$/)].t = 'Phone') },
      { what: 'the pair card’s heading still drawn at HEAD', clause: 'the words unchanged but the side column', edit: (r) => { const H = r.head.S.at['760']; H.els['section.phone-section#0 > div.set-group-label#9'] = el({ x: 0, y: 40, w: 100, h: 20 }, PAIR_GROUP); } },
      { what: 'a group label gone at HEAD', clause: 'the words unchanged but the side column', edit: (r) => void delete r.head.R.els[Object.keys(r.head.R.els).filter(isGroupLabelKey).at(-1)] },
      { what: 'two group labels drawn in the other order at HEAD', clause: 'the words unchanged but the side column', edit: (r) => { const ks = Object.keys(r.head.S.wide.els).filter(isGroupLabelKey); const [a, b] = [r.head.S.wide.els[ks[0]], r.head.S.wide.els[ks[1]]]; [a.t, b.t] = [b.t, a.t]; } }
    ]
  },
  RUN: {
    pass: {
      tailscalePreflight: true,
      dnsPreflight: true,
      joinedOk: true,
      agentsPrecheck: [true],
      agentsScan: [true],
      realTailscale: 0,
      samples: 120,
      forbidden: 0,
      refusedArgv: 0,
      udpLeaks: 0,
      udpSamples: 60,
      totalQuestions: 3,
      questionProblems: [],
      networkRead: true,
      urls: ['file:///private/tmp/wt/out/renderer/settings/index.html', 'gmux-asset://font/inter.woff2', 'http://127.0.0.1:9222/json', 'ws://localhost:9222/devtools', 'http://[::1]:3000/x'],
      apnsRequests: 0,
      apnsConnections: { development: 0, production: 0 },
      appLogRead: true,
      appLogBegin: false,
      appLogPemLine: false,
      appLogName: false,
      appLogAddress: false,
      keyFileGone: true,
      standinLeft: 0,
      dnsClosed: true,
      apnsClosed: true,
      electronLeft: 0
    },
    breaks: {
      'the Tailscale preflight': (r) => void (r.tailscalePreflight = false),
      'the DNS preflight, loopback alone': (r) => void (r.joinedOk = false),
      'the hidden agents resolve nowhere': (r) => void (r.agentsScan = [false]),
      'no real Tailscale': (r) => void (r.realTailscale = 1),
      'no forbidden argv': (r) => void (r.forbidden = 1),
      'UDP to 127.0.0.1 alone': (r) => void (r.udpLeaks = 1),
      'every DNS question an A, RD 0, for the name': (r) => void (r.questionProblems = ['1 question(s) asked for recursion']),
      'the sheet asked nothing off the Mac': (r) => void r.urls.push('https://tortie.sh/iphone'),
      'nothing reached Apple’s stand-in': (r) => void (r.apnsRequests = 1),
      'app.log holds no key and no name': (r) => void (r.appLogPemLine = true),
      'the key file is gone': (r) => void (r.keyFileGone = false),
      'every stand-in ended': (r) => void (r.apnsClosed = false),
      'no Electron left': (r) => void (r.electronLeft = 1)
    },
    refused: [
      { what: 'a request off the Mac that does not name tortie.sh', clause: 'the sheet asked nothing off the Mac', edit: (r) => void r.urls.push('https://example.com/badge.svg') },
      { what: 'tortie.sh named by a URL on no network scheme', clause: 'the sheet asked nothing off the Mac', edit: (r) => void r.urls.push('file:///tortie.sh/iphone') },
      { what: 'a sheet whose network was never read', clause: 'the sheet asked nothing off the Mac', edit: (r) => void (r.networkRead = false) },
      { what: 'one connection to Apple’s stand-in with no request', clause: 'nothing reached Apple’s stand-in', edit: (r) => void (r.apnsConnections.production = 1) },
      { what: 'the PEM’s first line in app.log', clause: 'app.log holds no key and no name', edit: (r) => void (r.appLogBegin = true) },
      { what: 'the stand-in’s name in app.log', clause: 'app.log holds no key and no name', edit: (r) => void (r.appLogName = true) },
      { what: 'a run that asked the DNS stand-in nothing', clause: 'every DNS question an A, RD 0, for the name', edit: (r) => void (r.totalQuestions = 0) },
      { what: 'a hidden-agents precheck that refused', clause: 'the hidden agents resolve nowhere', edit: (r) => void (r.agentsPrecheck = [false]) },
      { what: 'the DNS stand-in left open', clause: 'every stand-in ended', edit: (r) => void (r.dnsClosed = false) },
      { what: 'a sampler that never sampled UDP', clause: 'UDP to 127.0.0.1 alone', edit: (r) => void (r.udpSamples = 0) }
    ]
  }
};

async function graderSelfTest() {
  let failures = 0;
  const say = (ok, text) => {
    if (!ok) failures += 1;
    process.stdout.write(`${ok ? 'ok  ' : 'FAIL'} ${text}\n`);
  };
  const clauses = gradeFixtures({ graders: GRADERS, fixtures: GRADER_FIXTURES, grade, clone: (pass) => structuredClone(pass), say, J });

  // The honest variations CMP must allow: the clocks move, the scan line's words move.
  const clocks = modelCmp();
  for (const w of WIDTHS) {
    const H = clocks.head.S.at[String(w)];
    H.els[firstKey(H, /data-phone-countdown/)].t = 'Shuts in 2:07';
  }
  say(grade('CMP', clocks).ok, 'CMP allows the countdown to read another second at HEAD');
  const parentS = modelS('parent');
  say(grade('S', parentS).ok, 'S passes the parent’s own words at the parent');
  // The model is the SPEC's prediction: under the code at every real width, and at the wide reading beside at the parent, under at HEAD.
  const cmp = modelCmp();
  say(WIDTHS.every((w) => cmp.parent.S.at[String(w)].beside === false && cmp.head.S.at[String(w)].beside === false), 'the model puts the column under the code at 640, 760 and 1200 at both builds (SPEC §6.6)');
  // 333.2's SPEC §6.7 put the column beside the 243 px code at its parent and under it at its HEAD, because its line grew; Phase 333.1's line is shorter again (D15), so the placement turns back: under at this parent (333.2's), beside at HEAD. Reported, never failed.
  say(cmp.parent.S.wide.beside === false && cmp.head.S.wide.beside === true, 'the model’s 243 px code has the column under it at the parent and beside it at HEAD (333.2 SPEC §6.7, turned by D15’s shorter line)');
  say(cmpPrecondition(cmp.parent, cmp.head) === null, 'CMP’s precondition holds over the model');
  const narrow = modelCmp();
  narrow.head.S.at['760'].innerWidth = 762;
  say(cmpPrecondition(narrow.parent, narrow.head) !== null, 'CMP’s precondition refuses a window that was not 760 wide');
  // The fix round: R and K at READ_HEIGHT and the window's own width at both builds, or refused.
  const short = modelCmp();
  short.head.R.innerHeight = 560;
  say(cmpPrecondition(short.parent, short.head) !== null, `CMP’s precondition refuses a rest reading that was not ${String(READ_HEIGHT)} px tall`);
  const shortK = modelCmp();
  shortK.parent.K.k1.innerHeight = 1200;
  say(cmpPrecondition(shortK.parent, shortK.head) !== null, 'CMP’s precondition refuses a key reading at another height at the parent');
  const otherWidth = modelCmp();
  otherWidth.head.K.k0.innerWidth = 1024;
  say(cmpPrecondition(otherWidth.parent, otherWidth.head) !== null, 'CMP’s precondition refuses a key reading at another width than the parent’s');
  const noK = modelCmp();
  noK.head.K.k2 = null;
  say(cmpPrecondition(noK.parent, noK.head) !== null, 'CMP’s precondition refuses a key reading that is missing');
  // The reverify: a first code reading taken while R's override still held.
  const tallS = modelCmp();
  tallS.parent.S.at['760'].innerHeight = READ_HEIGHT;
  say(cmpPrecondition(tallS.parent, tallS.head) !== null, 'CMP’s precondition refuses a code reading taken at another height at one build');
  const tallWide = modelCmp();
  tallWide.head.S.wide.innerHeight = 900;
  say(cmpPrecondition(tallWide.parent, tallWide.head) !== null, 'CMP’s precondition refuses the 243 px reading at another height at one build');
  // The honest differences D37 names compare EQUAL inside the landmarks: the
  // parent's Pair at rest against HEAD's none, the side column's new line and
  // its re-flow, the key row's caption and its centred actions column, and the
  // landmarks themselves lower down the section under the steps.
  const L = landmarksOf(cmp.head.R);
  say(L.pairBlock !== null && Object.keys(L.pairBlock.els).length === 0 && Object.keys(landmarksOf(cmp.parent.R).pairBlock.els).some(NAMED.restPair) && compareLandmark('pairBlock', landmarksOf(cmp.parent.R).pairBlock, L.pairBlock).ok, 'the parent’s Pair at rest and HEAD’s empty block compare equal (the named set)');
  say(!sameRect(landmarksOf(cmp.parent.R).keyRow.r, L.keyRow.r) && compareLandmark('keyRow', landmarksOf(cmp.parent.R).keyRow, L.keyRow).ok, 'the key row, lower and taller at HEAD, compares equal inside but its actions column');
  const S760 = { p: landmarksOf(cmp.parent.S.at['760']).pairBlock, h: landmarksOf(cmp.head.S.at['760']).pairBlock };
  say(Object.keys(S760.h.els).filter(NAMED.sideColumn).length === Object.keys(S760.p.els).filter(NAMED.sideColumn).length + 1 && compareLandmark('pairBlock', S760.p, S760.h).ok, 'the side column with its new line compares equal inside the code’s block');
  const sideMoved = modelCmp();
  nudge(sideMoved.head.S.at['760'], sideMoved.head.S.at['760'].sideKey, 'y', 30);
  say(grade('CMP', sideMoved).ok, 'CMP allows the side column itself to move inside the block');
  const actionsMoved = modelCmp();
  nudge(actionsMoved.head.K.k1, firstKey(actionsMoved.head.K.k1, /forget-key/), 'y', 9);
  say(grade('CMP', actionsMoved).ok, 'CMP allows the key row’s actions column to move with the caption');
  const outsideMoved = modelCmp();
  nudge(outsideMoved.head.K.k1, firstKey(outsideMoved.head.K.k1, /data-phone-alerts\]#0 > div\.set-row-text#0 > span\.set-row-label#0$/), 'y', 2);
  say(!grade('CMP', outsideMoved).ok, 'CMP refuses the alerts row’s label moving inside its row');
  const otherCode = modelCmp();
  otherCode.parent.S.at['760'].qrModules = 73;
  say(cmpPrecondition(otherCode.parent, otherCode.head) !== null, 'CMP’s precondition refuses two codes of different sizes');
  // The reverify's two gaps (2026-10-08), as the live section drew them: the
  // key row's text column 38 px tall at the parent and 56 at HEAD, and the
  // group labels one key apart because the parent's PAIR_GROUP left.
  const col = (m) => landmarksOf(m).keyRow.els['div.set-row-text#0'].r;
  say(
    ['R', 'k0', 'k1', 'k2'].every((k) => {
      const p = k === 'R' ? cmp.parent.R : cmp.parent.K[k];
      const h = k === 'R' ? cmp.head.R : cmp.head.K[k];
      return col(h).h > col(p).h && !sameRect(col(p), col(h)) && grewOnly(col(p), col(h)) && compareLandmark('keyRow', landmarksOf(p).keyRow, landmarksOf(h).keyRow).ok;
    }),
    'the key row’s text column, taller at HEAD by the publisher’s caption, compares equal (GROWS), at rest and in every key face'
  );
  say(
    J(groupLabels(cmp.parent.R)) === J([PAIR_GROUP, 'Phones', 'Alerts']) &&
      J(groupLabels(cmp.head.R)) === J(['Phones', 'Alerts']) &&
      compareMaps(cmp.parent.R, cmp.head.R).reworded.filter(isGroupLabelKey).length === 2 &&
      grade('CMP', cmp).ok,
    'the group labels, two keys reworded by their index alone, compare equal by their words in order'
  );
  say(!grewOnly({ x: 0, y: 0, w: 10, h: 10 }, { x: 0, y: 0, w: 10, h: 9 }) && grewOnly({ x: 0, y: 0, w: 10, h: 10 }, { x: 0.4, y: 0, w: 10, h: 30 }) && !grewOnly({ x: 0, y: 0, w: 10, h: 10 }, { x: 0, y: 1, w: 10, h: 30 }), 'grewOnly takes a taller rectangle at the same place and width, and nothing else');

  // The settle the page runs before it measures (the reverify), over fake
  // animations on a fake clock: a transition that ends by itself is waited
  // for, one that never ends is finished at the budget, and an infinite or a
  // paused one is never touched.
  const fakeWorld = (anims) => {
    let clock = 0;
    const list = anims.map((a) => ({
      playState: a.state,
      pending: a.pending === true,
      endsAt: a.endsAt,
      finishedBy: null,
      effect: a.noEffect === true ? null : { getComputedTiming: () => ({ endTime: a.endTime }) },
      finish() {
        this.playState = 'finished';
        this.finishedBy = 'finish';
      }
    }));
    return {
      list,
      getAnimations: () => list,
      now: () => clock,
      sleep: async (ms) => {
        clock += ms;
        for (const a of list) if (a.endsAt !== undefined && clock >= a.endsAt && a.playState === 'running') a.playState = 'finished';
      }
    };
  };
  const knob = fakeWorld([{ state: 'running', endTime: 120, endsAt: 75 }, { state: 'running', endTime: Infinity }, { state: 'paused', endTime: 300 }, { state: 'running', endTime: 50, noEffect: true }]);
  const knobSettled = await settleAnimations(knob.getAnimations, knob.sleep, knob.now);
  say(J(knobSettled) === J({ polls: 3, finished: 0 }) && knob.list[0].playState === 'finished' && knob.list[0].finishedBy === null && knob.list[1].playState === 'running' && knob.list[2].playState === 'paused', `a transition that ends by itself is waited for, three polls, and an infinite or a paused animation is left alone (${J(knobSettled)})`);
  const stuck = fakeWorld([{ state: 'running', endTime: 5000 }, { state: 'paused', endTime: 10, pending: true }]);
  const stuckSettled = await settleAnimations(stuck.getAnimations, stuck.sleep, stuck.now, 2000);
  say(J(stuckSettled) === J({ polls: 80, finished: 2 }) && stuck.list.every((a) => a.finishedBy === 'finish'), `one that is still running at the budget, and one pending, are finished, after 2 s of polls (${J(stuckSettled)})`);
  const quiet = fakeWorld([]);
  say(J(await settleAnimations(quiet.getAnimations, quiet.sleep, quiet.now)) === J({ polls: 0, finished: 0 }), 'nothing running is no wait');
  const reader = sectionReader();
  say(reader.includes(settleAnimations.toString()) && reader.indexOf('await settleAnimations(') > -1 && reader.indexOf('await settleAnimations(') < reader.indexOf('getBoundingClientRect') && /settled,/.test(reader), 'the page runs this very settle, before it measures anything, and records what it did');

  // The page's pure parts.
  const rows = [
    [stepOf('button', ['btn-secondary', 'btn'], [['data-phone-action', 'pair']]), 'button.btn.btn-secondary[data-phone-action=pair]'],
    [stepOf('p', [], [['data-phone-countdown', '']]), 'p[data-phone-countdown]'],
    [stepOf('div', ['set-row', 'tall', ''], [['data-phone-key', ''], ['data-phone-alerts', '']]), 'div.set-row.tall[data-phone-alerts][data-phone-key]'],
    [stepOf('svg', ['phone-qr'], []), 'svg.phone-qr'],
    [String(isClockKey('section#0 > div#1 > p.phone-countdown[data-phone-countdown]#0')), 'true'],
    // React draws a bare data attribute as the string "true", so the live key reads this way.
    [String(isClockKey('section.phone-section#0 > div.phone-qr-side#0 > p.phone-countdown[data-phone-countdown=true]#0')), 'true'],
    [String(isClockKey('section.phone-section#0 > div.phone-name[data-phone-name=true]#0 > span[data-phone-name-time=true]#0')), 'true'],
    [String(isClockKey('section#0 > div.phone-name[data-phone-name=true] > span[data-phone-name-time]#0')), 'true'],
    [String(isClockKey('section#0 > p[data-phone-countdown]#0 > span#0')), 'false'],
    [String(isClockKey('section#0 > p.phone-line#0')), 'false'],
    [J(offMacUrls(['http://127.0.0.1:1/', 'http://localhost/', 'http://[::1]:3/', 'ws://127.0.0.1:9/x', 'file:///a', 'gmux-asset://x', 'data:text/plain,hi', 'devtools://devtools/x'])), '[]'],
    [J(offMacUrls(['https://tortie.sh/iphone', 'https://example.com/', 'wss://203.0.113.10/', 'file:///x/TORTIE.SH'])), J(['https://tortie.sh/iphone', 'https://example.com/', 'wss://203.0.113.10/', 'file:///x/TORTIE.SH'])]
  ];
  for (const [got, want] of rows) say(got === want, `the reader’s pure parts read ${J(want)} (${J(got)})`);
  // The words, spelled here, as the SPEC writes them.
  say(HEAD_SCAN === 'Scan with Tortie on your iPhone.' && HEAD_GET === 'Get it at tortie.sh/iphone.' && !HEAD_GET.includes('://') && PARENT_SCAN.includes('tortie.sh/iphone'), 'HEAD’s two lines are the SPEC’s (build/p3331/SPEC.md D15), with no scheme, and the parent’s one line names the address');
  process.stdout.write(
    failures === 0
      ? `[p3332] grader self-test PASS: ${String(Object.keys(GRADERS).length)} graders, ${String(clauses)} clauses, each shown to go red on its own break.\n`
      : `[p3332] grader self-test FAIL: ${String(failures)}.\n`
  );
  return failures === 0;
}

// ---------------------------------------------------------------------------
// Main's UDP sockets, read with lsof (p3321's sampler)
// ---------------------------------------------------------------------------

/** `a:1->b:2` → `b:2`, or null for a socket with no peer. */
export function udpPeerOf(name) {
  const i = String(name).indexOf('->');
  return i < 0 ? null : String(name).slice(i + 2);
}
function udpOf(pid) {
  if (!(pid > 0)) return [];
  const r = spawnSync('/usr/sbin/lsof', ['-a', '-p', String(pid), '-iUDP', '-n', '-P', '-F', 'n'], { encoding: 'utf8', timeout: 10_000 });
  return (r.stdout ?? '').split('\n').filter((l) => l.startsWith('n')).map((l) => l.slice(1));
}
const loopbackPeer = (peer) => /^127\.0\.0\.1:\d+$/.test(String(peer));

if (process.argv.includes('--grader-self-test')) {
  process.exit((await graderSelfTest()) ? 0 : 1);
}

// ===========================================================================
// THE RUN. Everything below starts processes; builders never reach it.
// ===========================================================================

const CHECKOUT = resolve((process.env['P3332_PARENT_CHECKOUT'] ?? '').trim() || ROOT);
const AT_PARENT = CHECKOUT !== ROOT;
const TAG = `[p3332 ${AT_PARENT ? 'parent' : 'head'}]`;
const say = (line) => console.log(`${TAG} ${line}`);

if (!existsSync(join(CHECKOUT, 'out', 'main', 'index.js'))) {
  console.error(`${TAG} ${CHECKOUT} has no build at out/main/index.js. Run npm run build there first.`);
  process.exit(2);
}

const RUN = resolve((process.env['P3332_RUN'] ?? '').trim() || `/private/tmp/p3332-probe-${String(process.pid)}`);
if (!RUN.startsWith('/private/tmp/')) {
  console.error(`${TAG} the scratch world must be under /private/tmp; ${RUN} is not`);
  process.exit(2);
}
const HOME = join(RUN, 'home');
const HARNESS = join(RUN, 'harness');
/** INSIDE the harness directory: the alerts override refuses a profile outside it. */
const PROFILE = join(HARNESS, 'profile');
/** OUTSIDE the profile, so the helper's profile sweep never takes the stand-in's children for the app's. */
const STANDIN_DIR = join(RUN, 'standin');
const ALERTS_DIR = join(HARNESS, 'alerts');
const KEY_FILE = join(ALERTS_DIR, `AuthKey_${KEY_ID}.p8`);
const ALERTS_JSON = join(ALERTS_DIR, 'alerts.json');
const SOCKET = `gmux-p3332-${String(process.pid)}`;
const APP_LOG = join(PROFILE, 'logs', 'app.log');
const NAME = DEFAULT_SCENARIO.dnsName.replace(/\.$/, '');
const OUT = join(ROOT, 'out', 'p3332');

const report = { checkout: CHECKOUT, root: ROOT, atParent: AT_PARENT, arms: [], readings: {}, raw: {} };
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
// The world's guards: the DNS stand-in, the Tailscale stand-in, main's UDP
// ---------------------------------------------------------------------------

let dns = null;
let standin = null;
let watch = null;
let apns = null;
let apnsClosed = false;
let lastShim = 0;
let lastApp = 0;
let tailscalePreflight = false;
let dnsPreflight = false;
let joinedOk = false;
const agentsPrecheck = [];
const agentsScan = [];
const launches = [];
const alerts = { pemLines: [] };
const network = { read: false, urls: [] };

const udp = { samples: 0, leaks: [], seen: new Set() };
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
}
async function waitFor(test, ms, every = 200) {
  const started = Date.now();
  for (;;) {
    stopIfLeaked();
    if (await test()) return true;
    if (Date.now() - started >= ms) return false;
    await sleepRaw(every);
  }
}

// ---------------------------------------------------------------------------
// The app, its main window and its Settings window (copied from p3321)
// ---------------------------------------------------------------------------

const INHERITED_CLAUDE = Object.fromEntries(Object.keys(process.env).filter((n) => /^(?:CLAUDECODE|CLAUDE_)/.test(n)).map((n) => [n, undefined]));

const devtoolsPort = () => {
  try {
    return Number(readFileSync(join(PROFILE, 'DevToolsActivePort'), 'utf8').split('\n')[0].trim());
  } catch {
    return 0;
  }
};
async function targets() {
  const port = devtoolsPort();
  if (!(port > 0)) return [];
  try {
    return await (await fetch(`http://127.0.0.1:${String(port)}/json/list`)).json();
  } catch {
    return [];
  }
}
async function attachMain(timeoutMs = 150_000) {
  const started = Date.now();
  let why = 'no DevToolsActivePort yet';
  for (;;) {
    const picked = pickRendererTarget(await targets());
    if (picked.target !== null) {
      const cdp = await wsConnect(picked.target.webSocketDebuggerUrl);
      await cdp.call('Runtime.enable');
      for (let i = 0; i < 200; i += 1) {
        if ((await cdpEval(cdp, 'window.gmux !== undefined && window.gmux.pocket !== undefined')) === true) return cdp;
        await sleepRaw(300);
      }
      throw new Error('the app never armed window.gmux.pocket');
    }
    why = picked.why;
    if (Date.now() - started > timeoutMs) throw new Error(`no app window: ${why}`);
    await sleepRaw(300);
  }
}
/** The Settings page on its Phone section, its network collected from the attach on. */
async function attachSettings(main, timeoutMs = 30_000) {
  await cdpEval(main, 'window.gmux.openSettings().then(() => true)');
  const started = Date.now();
  for (;;) {
    const t = (await targets()).find((x) => x.type === 'page' && /\/renderer\/settings\/index\.html/.test(String(x.url)) && typeof x.webSocketDebuggerUrl === 'string');
    if (t !== undefined) {
      const cdp = await wsConnect(t.webSocketDebuggerUrl, { collect: ['Network.requestWillBeSent', 'Runtime.exceptionThrown'] });
      await cdp.call('Runtime.enable');
      await cdp.call('Network.enable');
      network.read = true;
      await cdpEval(cdp, "(() => { location.hash = 'phone'; return true; })()");
      for (let i = 0; i < 100; i += 1) {
        if ((await cdpEval(cdp, `document.querySelector('section[aria-label="Phone"]') !== null`)) === true) return cdp;
        await sleepRaw(200);
      }
      throw new Error('Settings opened and never drew the Phone section');
    }
    if (Date.now() - started > timeoutMs) throw new Error('no Settings window');
    await sleepRaw(300);
  }
}
async function pocket(cdp, method, arg) {
  const call = arg === undefined ? `window.gmux.pocket[${J(method)}]()` : `window.gmux.pocket[${J(method)}](${J(arg)})`;
  return JSON.parse(await cdpEval(cdp, `(async () => { try { const v = await ${call}; return JSON.stringify({ ok: true, value: v === undefined ? null : v }); } catch (e) { return JSON.stringify({ ok: false, error: String((e && e.message) || e) }); } })()`));
}
async function status(cdp) {
  const got = await pocket(cdp, 'status');
  return got.ok ? got.value : null;
}
async function waitStatus(cdp, test, ms, every = 250) {
  const started = Date.now();
  let last = null;
  for (;;) {
    stopIfLeaked();
    last = await status(cdp);
    if (last !== null && test(last)) return { ok: true, status: last, at: Date.now() };
    if (Date.now() - started >= ms) return { ok: false, status: last, at: Date.now() };
    await sleepRaw(every);
  }
}
async function click(settings, selector) {
  return (await cdpEval(settings, `(() => { const b = document.querySelector(${J(selector)}); if (b === null || b.disabled) return false; b.click(); return true; })()`)) === true;
}
const linesReady = (s) => s.confirmable === true && s.state !== 'opening' && s.publicName === NAME && s.confirmState !== 'confirmed' && s.confirmLines.some((l) => l.includes(`https://${NAME}:${String(s.publicPort)}`));
/** Press the sheet's Allow for the door once its lines are ready (probe:p330's shape). */
async function allowDoor(settings, main, ms = 20_000) {
  const ready = await waitStatus(main, linesReady, ms);
  if (!ready.ok) return false;
  if (!(await waitFor(async () => (await cdpEval(settings, `(() => { const a = document.querySelector('[data-phone-action="confirm-door"]'); return a !== null && !a.disabled; })()`)) === true, 10_000))) return false;
  return click(settings, '[data-phone-action="confirm-door"]');
}
/** A sheet condition, as one expression over the Phone section `s`. */
const sheetIs = (settings, body) => cdpEval(settings, `(() => { const s = document.querySelector('section[aria-label="Phone"]'); if (s === null) return false; ${body} })()`).then((v) => v === true);
/** Main's facts the K grader reads. */
const keyFacts = (s) => ({ state: s?.state ?? null, pushKeyId: s === null ? undefined : s.pushKeyId, confirmState: s?.confirmState ?? null });

// ---------------------------------------------------------------------------
// THE READER (SPEC §6.3): ONE evaluation, after a frame
// ---------------------------------------------------------------------------

// A hoisted function rather than a const, so the self-test, which runs above
// this line, reads the very source the page runs (the reverify).
function sectionReader() {
  return `(async () => {
  await Promise.race([new Promise((r) => requestAnimationFrame(() => r())), new Promise((r) => setTimeout(r, 50))]);
  const stepOf = ${stepOf.toString()};
  const settleAnimations = ${settleAnimations.toString()};
  // Every finite animation ends before anything is measured (the reverify).
  const settled = await settleAnimations(() => document.getAnimations(), (ms) => new Promise((r) => setTimeout(r, ms)), () => Date.now());
  const section = document.querySelector('section[aria-label="Phone"]');
  if (section === null) return JSON.stringify({ missing: true, innerWidth });
  const base = section.getBoundingClientRect();
  const r2 = (n) => Math.round(n * 100) / 100;
  const rel = (el) => { const b = el.getBoundingClientRect(); return { x: r2(b.x - base.x), y: r2(b.y - base.y), w: r2(b.width), h: r2(b.height) }; };
  const stepEl = (e) => stepOf(e.tagName.toLowerCase(), (e.getAttribute('class') || '').split(/\\s+/), [...e.attributes].filter((a) => a.name.startsWith('data-phone-')).map((a) => [a.name, a.value]));
  const keys = new Map();
  const keyOf = (e) => {
    if (keys.has(e)) return keys.get(e);
    const step = stepEl(e);
    let n = 0;
    for (let s = e.previousElementSibling; s !== null; s = s.previousElementSibling) if (stepEl(s) === step) n += 1;
    const own = step + '#' + n;
    const key = e === section ? own : keyOf(e.parentElement) + ' > ' + own;
    keys.set(e, key);
    return key;
  };
  const qr = section.querySelector('svg.phone-qr');
  const els = {};
  for (const e of [section, ...section.querySelectorAll('*')]) {
    if (qr !== null && e !== qr && qr.contains(e)) continue;
    const row = { r: rel(e), t: e.childElementCount === 0 ? e.textContent.trim() : null };
    if (e.tagName === 'BUTTON') row.b = { checked: e.getAttribute('aria-checked'), label: e.getAttribute('aria-label'), disabled: e.disabled };
    els[keyOf(e)] = row;
  }
  const side = section.querySelector('.phone-qr-side');
  const lines = side === null ? [] : [...side.querySelectorAll('p.phone-line')];
  const scan = lines[0] ?? null;
  const card = section.querySelector('[data-phone-stage]');
  const pair = section.querySelector('[data-phone-action="pair"]');
  const keyLine = section.querySelector('[data-phone-key-line]');
  const alertsRow = section.querySelector('[data-phone-alerts]');
  const sw = alertsRow === null ? null : alertsRow.querySelector('button[role="switch"]');
  const label = alertsRow === null ? null : alertsRow.querySelector('.set-row-label');
  const holds = (e) => [e.textContent || '', e.getAttribute('href') || '', e.getAttribute('aria-label') || '', e.getAttribute('title') || ''].join(' ').includes('tortie.sh');
  const qb = qr === null ? null : qr.getBoundingClientRect();
  const sb = side === null ? null : side.getBoundingClientRect();
  // Phase 333.1 (D37): the four landmarks both builds draw, by their own
  // hooks, and each one's padding, so every element inside one is measured
  // from its content box (the fix round: the step body zeroes the block's).
  const titleEl = section.querySelector('h1.set-title');
  const keyEl = section.querySelector('[data-phone-key]');
  const landmarkKeys = { title: titleEl === null ? null : keyOf(titleEl), pairBlock: card === null ? null : keyOf(card), keyRow: keyEl === null ? null : keyOf(keyEl), alertsRow: alertsRow === null ? null : keyOf(alertsRow) };
  const pads = {};
  for (const e of [titleEl, card, keyEl, alertsRow]) {
    if (e === null) continue;
    const cs = getComputedStyle(e);
    pads[keyOf(e)] = { top: r2(parseFloat(cs.paddingTop) || 0), left: r2(parseFloat(cs.paddingLeft) || 0) };
  }
  // The first setup's press at a build with the three steps: the door's own switch (D17).
  const doorSw = [...section.querySelectorAll('button[role="switch"]')].find((b) => b.getAttribute('aria-label') === ${J(DOOR_LABEL)}) ?? null;
  return JSON.stringify({
    at: Date.now(),
    innerWidth,
    innerHeight,
    settled,
    landmarkKeys,
    pads,
    sideLines: lines.map((e) => e.textContent.trim()),
    sideLineKeys: lines.map((e) => keyOf(e)),
    sideLineTags: lines.map((e) => e.tagName),
    sideLineChildElements: lines.map((e) => e.childElementCount),
    doorSwitch: { drawn: doorSw !== null, checked: doorSw === null ? null : doorSw.getAttribute('aria-checked'), disabled: doorSw === null ? null : doorSw.disabled },
    sectionW: r2(base.width),
    scrollWidth: section.scrollWidth,
    clientWidth: section.clientWidth,
    stage: card === null ? null : card.getAttribute('data-phone-stage'),
    qrModules: qr === null || qr.getAttribute('data-qr-modules') === null ? null : Number(qr.getAttribute('data-qr-modules')),
    qrStyleWidth: qr === null ? null : qr.style.width,
    scanKey: scan === null ? null : keyOf(scan),
    sideKey: side === null ? null : keyOf(side),
    qrKey: qr === null ? null : keyOf(qr),
    scanText: scan === null ? null : scan.textContent.trim(),
    scanTag: scan === null ? null : scan.tagName,
    scanChildElements: scan === null ? null : scan.childElementCount,
    scanLineHeight: scan === null ? null : parseFloat(getComputedStyle(scan).lineHeight),
    nextLineText: lines[1] === undefined ? null : lines[1].textContent.trim(),
    link: section.querySelector('a, [href]') !== null,
    tortieControl: [...section.querySelectorAll('a, [href], button')].some(holds),
    beside: qb === null || sb === null ? null : sb.left >= qb.right - 0.5,
    pair: { drawn: pair !== null, disabled: pair === null ? null : pair.disabled },
    keyRow: section.querySelector('[data-phone-key]') !== null,
    keyLine: keyLine === null ? null : keyLine.textContent.trim(),
    alerts: {
      drawn: alertsRow !== null,
      label: label === null ? null : label.textContent.trim(),
      switchLabel: sw === null ? null : sw.getAttribute('aria-label'),
      checked: sw === null ? null : sw.getAttribute('aria-checked'),
      disabled: sw === null ? null : sw.disabled
    },
    els
  });
})()`;
}
async function readSection(settings) {
  return JSON.parse(await cdpEval(settings, sectionReader(), 20_000));
}

/** Set the Settings page's layout width, and wait until the page says it is that width. */
async function atWidth(settings, width) {
  await settings.call('Emulation.setDeviceMetricsOverride', { width, height: 560, deviceScaleFactor: 0, mobile: false });
  return waitFor(async () => (await cdpEval(settings, 'innerWidth')) === width, 5_000, 100);
}

/**
 * R and K's size (Phase 333.1's fix round): the window's own width and
 * READ_HEIGHT tall, at both builds, so the taller three-step section never
 * brings a scrollbar that narrows it at one build alone. Waits until the page
 * says it is that size.
 */
async function atReadSize(settings, width) {
  await settings.call('Emulation.setDeviceMetricsOverride', { width, height: READ_HEIGHT, deviceScaleFactor: 0, mobile: false });
  return waitFor(async () => J(JSON.parse(await cdpEval(settings, 'JSON.stringify([innerWidth, innerHeight])'))) === J([width, READ_HEIGHT]), 5_000, 100);
}

/** The page's own size, as `[innerWidth, innerHeight]`. */
const pageSize = async (settings) => JSON.parse(await cdpEval(settings, 'JSON.stringify([innerWidth, innerHeight])'));
/**
 * The override cleared, and the page back at its own size, BOTH sides (the
 * reverify, 2026-10-08). Waiting on the width alone returned at once, because
 * the override kept the window's width, and one build's first code reading was
 * then taken still 2,000 px tall while the other's was at the window's height
 * with a scrollbar, 10 px narrower: CMP compared two layouts. Answers whether
 * the page said it was `own` within 5 s.
 */
async function backToOwnSize(settings, own) {
  await settings.call('Emulation.clearDeviceMetricsOverride');
  return waitFor(async () => J(await pageSize(settings)) === J(own), 5_000, 100);
}

/**
 * The first setup's press, from rest (Phase 333.1, D17): Pair where the sheet
 * draws it with the door off (a build without the three steps), else the
 * door's own switch, whose on press asks for the code. Answers which, or false.
 */
async function pressFirstSetup(settings) {
  if (await click(settings, '[data-phone-action="pair"]')) return 'pair';
  const on = await cdpEval(
    settings,
    `(() => { const s = document.querySelector('section[aria-label="Phone"]'); if (s === null) return false; const b = [...s.querySelectorAll('button[role="switch"]')].find((x) => x.getAttribute('aria-label') === ${J(DOOR_LABEL)} && x.getAttribute('aria-checked') === 'false' && !x.disabled); if (b === undefined) return false; b.click(); return true; })()`
  );
  return on === true ? 'switch' : false;
}

function launchOptions(label) {
  return {
    label,
    userDataDir: PROFILE,
    cwd: CHECKOUT,
    tmuxSocket: SOCKET,
    // Chromium's occlusion and backgrounding OFF (probe-p208's three
    // switches): an occluded window draws no frame, and the reader waits on one.
    args: ['--remote-debugging-port=0', '--use-mock-keychain', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding', '--disable-background-timer-throttling'],
    env: withoutDevRenderer({
      ...INHERITED_CLAUDE,
      HOME,
      GMUX_TMUX_SOCKET: SOCKET,
      GMUX_PROBES: '1',
      GMUX_LOG_FILE: '1',
      GMUX_SPECSTORY_NO_CLOUD: '1',
      GMUX_CONFIG_ROOT: join(PROFILE, 'gmux', 'config'),
      GMUX_HARNESS_DIR: HARNESS,
      // THE STAND-INS. A development build honours them and a packaged one
      // ignores them, which is why no packaged Tortie is ever launched here.
      GMUX_TAILSCALE_BIN: standin.binPath,
      [NAME_SERVERS_VAR]: dns.servers,
      GMUX_HARNESS_ALERTS: ALERTS_DIR
    }),
    graceMs: 8_000,
    ceilingMs: 600_000
  };
}

/** One launch through the helper, after every preflight and the hidden agents. */
async function launch(label, body) {
  const pre = preflightStandin(standin, standin.binPath);
  if (!pre.ok) throw new Error(`the Tailscale preflight refused the launch: ${pre.problems.join('; ')}`);
  const value = launchOptions(label).env[NAME_SERVERS_VAR];
  const p = await dns.preflight(value);
  dnsPreflight = p.ok;
  if (!p.ok) throw new Error(`the DNS preflight of ${String(value)} refused the launch: ${p.problems.join('; ')}`);
  joinedOk = loopbackOnlyServers(value) && value === dns.servers;
  if (!joinedOk) throw new Error(`${NAME_SERVERS_VAR}=${J(value)} is not the one loopback stand-in`);
  writeHiddenAgents(PROFILE, 'p3332');
  const precheck = hiddenAgentsPrecheck({ checkout: CHECKOUT, prefix: 'p3332', home: HOME, userPath: process.env.PATH ?? '' });
  agentsPrecheck.push(precheck.ok);
  if (!precheck.ok) throw new Error(`the hidden-agents precheck refused the launch: ${precheck.said}`);
  return withElectron(launchOptions(label), async (handle) => {
    lastShim = handle.pid;
    const rec = { label, shim: handle.pid, app: 0 };
    launches.push(rec);
    const appPidNow = () => {
      try {
        rec.app = handle.appPid() || rec.app;
      } catch {
        /* not up yet */
      }
      lastApp = rec.app;
      return rec.app;
    };
    try {
      appPidNow();
      const main = await attachMain();
      appPidNow();
      try {
        const scan = hiddenAgentsScanVerdict(JSON.parse(await cdpEval(main, AGENTS_LIST_EXPR)));
        agentsScan.push(scan.ok);
        if (!scan.ok) throw new Error(`agents:list: ${scan.said}`);
        await body(handle, main, appPidNow);
      } finally {
        main.close();
      }
    } finally {
      appPidNow();
      rec.text = handle.text();
    }
  });
}

const appLogText = () => {
  try {
    return readFileSync(APP_LOG, 'utf8');
  } catch {
    return null;
  }
};

/** The side by side HEAD prints, one line per reading. */
function sideBySide(parent, head) {
  const rect = (m, key) => (key === null || m.els[key] === undefined ? 'none' : `x ${String(m.els[key].r.x)} y ${String(m.els[key].r.y)} w ${String(m.els[key].r.w)} h ${String(m.els[key].r.h)}`);
  const rows = [...WIDTHS.map((w) => [String(w), parent.S.at[String(w)], head.S.at[String(w)]]), ['wide (243 px code at 1200)', parent.S.wide, head.S.wide]];
  for (const [name, p, h] of rows) {
    const c = compareMaps(p, h);
    say(`  ${name}: ${String(c.compared)} rectangles compared, ${String(c.equal)} equal; beside parent ${String(p.beside)} | HEAD ${String(h.beside)}`);
    say(`    scan line   parent ${rect(p, p.scanKey)} | HEAD ${rect(h, h.scanKey)}`);
    say(`    its column  parent ${rect(p, p.sideKey)} | HEAD ${rect(h, h.sideKey)}`);
  }
  for (const [name, p, h] of [['R', parent.R, head.R], ['K k0', parent.K.k0, head.K.k0], ['K k1', parent.K.k1, head.K.k1], ['K k2', parent.K.k2, head.K.k2]]) {
    const c = compareMaps(p, h);
    say(`  ${name}: ${String(c.compared)} rectangles compared, ${String(c.equal)} equal`);
  }
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

try {
  rmSync(RUN, { recursive: true, force: true });
  for (const dir of [HOME, HARNESS, PROFILE]) mkdirSync(dir, { recursive: true });
  standin = makeStandin({ dir: STANDIN_DIR, scenario: { ...DEFAULT_SCENARIO } });
  // The `finally` ends them; this net is for a run the helper ends with
  // process.exit, which skips it. Synchronous, by pid, naming this file only.
  process.once('exit', () => endStandinProcesses(STANDIN_DIR, 500));
  const pre = preflightStandin(standin, standin.binPath);
  tailscalePreflight = pre.ok;
  if (!pre.ok) throw new Error(`the Tailscale preflight refused: ${pre.problems.join('; ')}`);
  dns = await makeDnsStandin({ name: NAME, mode: 'record' });
  say(`one DNS stand-in answers for ${NAME} on ${dns.servers}`);
  watch = watchForRealTailscale({ roots: () => [lastShim, lastApp].filter((p) => p > 0), everyMs: 1_000 });

  // THE SCRATCH KEY, made here and deleted in the `finally` whatever happened.
  // His key is never read. The `exit` net is for a run that ends by a signal
  // the helper answers with process.exit, which skips a `finally`.
  const keyPair = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const pem = keyPair.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
  alerts.pemLines = pem.split('\n').filter((l) => l.length >= 16 && !l.startsWith('-----'));
  mkdirSync(ALERTS_DIR, { recursive: true, mode: 0o700 });
  writeFileSync(KEY_FILE, pem, { mode: 0o600 });
  process.once('exit', () => rmSync(KEY_FILE, { force: true }));
  // APPLE is the stand-in, in this process, knowing no device: nothing may reach it.
  apns = await startApnsStandIn({ publicKey: keyPair.publicKey, topic: TOPIC, devices: {} });
  writeFileSync(ALERTS_JSON, `${J({ origins: apns.origins, keyFile: KEY_FILE })}\n`, { mode: 0o600 });

  await launch('p3332', async (handle, main) => {
    let settings = null;
    try {
      settings = await attachSettings(main);

      // ---- R: at rest ---------------------------------------------------------
      // The first setup's press drawn: Pair with the door off at a build
      // without the three steps, the off switch since 333.1 (D17).
      await waitFor(
        () =>
          sheetIs(
            settings,
            `const p = s.querySelector('[data-phone-action="pair"]'); const w = [...s.querySelectorAll('button[role="switch"]')].find((x) => x.getAttribute('aria-label') === ${J(DOOR_LABEL)}); return ((p !== null && !p.disabled) || (w !== undefined && w.getAttribute('aria-checked') === 'false' && !w.disabled)) && s.querySelector('[data-phone-key]') !== null;`
          ),
        20_000
      );
      // At the window's own width and READ_HEIGHT tall (the fix round).
      const ownSize = await pageSize(settings);
      const ownWidth = Number(ownSize[0]);
      if (!(await atReadSize(settings, ownWidth))) say(`the page never read ${String(ownWidth)} by ${String(READ_HEIGHT)} under the override; R is read as it is and CMP's precondition says so`);
      arm('R', await readSection(settings));
      // Back at its own width AND height before the code is read (the reverify).
      if (!(await backToOwnSize(settings, ownSize))) say(`the page never read its own ${J(ownSize)} again after R; S is read as it is and CMP's precondition says so`);

      // ---- S: the code ----------------------------------------------------------
      let S = null;
      const firstPress = await pressFirstSetup(settings);
      report.readings.firstPress = firstPress;
      if (firstPress === false) {
        cannotRead('S', 'the sheet drew no Pair and no off switch to press');
      } else if (!(await allowDoor(settings, main, 45_000))) {
        cannotRead('S', `main never drew door lines to Allow after the first setup's press (${firstPress})`);
      } else if (!(await waitFor(() => sheetIs(settings, `const c = s.querySelector('[data-phone-stage="showing"] [data-phone-action="cancel-pairing"]'); return c !== null && !c.disabled;`), 75_000, 250))) {
        // Cancel pressable too: it is disabled while a press is under way, and
        // a reading taken then would differ between the builds for no reason
        // of this phase's.
        cannotRead('S', 'the code never showed, with Cancel pressable, within 75 s of Allow');
      } else {
        const first = await readSection(settings);
        const at = { 760: first };
        let why = null;
        for (const w of [640, 1200]) {
          if (!(await atWidth(settings, w))) {
            why = `the page never read ${String(w)} px wide under the override`;
            break;
          }
          const m = await readSection(settings);
          if (m.innerWidth !== w) {
            why = `the ${String(w)} reading was taken at ${String(m.innerWidth)} px`;
            break;
          }
          at[w] = m;
        }
        let wide = null;
        if (why === null) {
          // Still at 1200: the narrowest three-pixel-module code, then its own width back.
          const was = await cdpEval(settings, `(() => { const q = document.querySelector('section[aria-label="Phone"] svg.phone-qr'); if (q === null) return null; const w = q.style.width; q.style.width = ${J(`${String(WIDE_QR_PX)}px`)}; return w; })()`);
          if (typeof was !== 'string') why = 'no code to narrow at 1200';
          else {
            wide = await readSection(settings);
            await cdpEval(settings, `(() => { const q = document.querySelector('section[aria-label="Phone"] svg.phone-qr'); if (q !== null) q.style.width = ${J(was)}; return true; })()`);
          }
        }
        if (!(await backToOwnSize(settings, [first.innerWidth, first.innerHeight]))) say(`the page never read the first code reading's ${J([first.innerWidth, first.innerHeight])} again; the sanity reading says so`);
        const again = await readSection(settings);
        if (why === null) {
          const c = compareMaps(first, again);
          if (!c.keysSame || c.moved.length > 0 || c.reworded.some((k) => !isClockKey(k))) why = `the window back at its own width does not read as it first did: ${J({ keysSame: c.keysSame, moved: c.moved, reworded: c.reworded.filter((k) => !isClockKey(k)) })}`;
        }
        S = { atParent: AT_PARENT, at, wide, again };
        if (why !== null) {
          report.readings.S = S;
          cannotRead('S', why);
        } else arm('S', S);
        if (!(await click(settings, '[data-phone-action="cancel-pairing"]'))) say('Cancel could not be pressed; the code is left to shut on its own');
      }

      // ---- K: the key ------------------------------------------------------------
      const ready = await waitFor(() => sheetIs(settings, `const c = s.querySelector('[data-phone-action="choose-key"]'); return s.querySelector('[data-phone-stage="ready"]') !== null && c !== null && !c.disabled;`), 20_000);
      if (!ready) {
        cannotRead('K', 'the sheet never came back to Pair with Choose… pressable, with the door on');
      } else {
        // At the window's own width and READ_HEIGHT tall, as R (the fix round).
        if (!(await atReadSize(settings, ownWidth))) say(`the page never read ${String(ownWidth)} by ${String(READ_HEIGHT)} under the override; K is read as it is and CMP's precondition says so`);
        const s0 = await status(main);
        const k0 = await readSection(settings);
        if (!(await click(settings, '[data-phone-action="choose-key"]'))) {
          cannotRead('K', 'Choose… could not be pressed');
        } else {
          const kept = await waitStatus(main, (s) => s.pushKeyId === KEY_ID, 20_000);
          // Choose… pressable again: main's broadcast can redraw the row while
          // the press is still under way, and every button is disabled then.
          await waitFor(() => sheetIs(settings, `const l = s.querySelector('[data-phone-key-line]'); const c = s.querySelector('[data-phone-action="choose-key"]'); return l !== null && l.textContent.trim() === ${J(KEY_KEPT)} && s.querySelector('[data-phone-alerts]') !== null && c !== null && !c.disabled;`), 10_000);
          const s1 = await status(main);
          const k1 = await readSection(settings);
          if (!(await click(settings, '[data-phone-action="forget-key"]'))) {
            report.readings.K = { k0, k1, s0: keyFacts(s0), s1: keyFacts(s1), keptSeen: kept.ok };
            cannotRead('K', 'Forget could not be pressed');
          } else {
            await waitStatus(main, (s) => s.pushKeyId === null, 20_000);
            await waitFor(() => sheetIs(settings, `const l = s.querySelector('[data-phone-key-line]'); const c = s.querySelector('[data-phone-action="choose-key"]'); return l !== null && l.textContent.trim() === ${J(KEY_NONE)} && s.querySelector('[data-phone-alerts]') === null && c !== null && !c.disabled;`), 10_000);
            const s2 = await status(main);
            const k2 = await readSection(settings);
            arm('K', { k0, k1, k2, s0: keyFacts(s0), s1: keyFacts(s1), s2: keyFacts(s2) });
          }
        }
      }
      await settings.call('Emulation.clearDeviceMetricsOverride').catch(() => undefined);
      await pocket(main, 'setDoor', { on: false });
      const off = await waitStatus(main, (s) => s.state === 'off', 20_000);
      if (!off.ok) say('the door did not read off within 20 s; the helper ends the app regardless');
    } finally {
      // The sheet's requests are read whatever happened above, so a run that
      // threw part way still has every request it made graded by RUN.
      if (settings !== null) {
        network.urls = settings.events().filter((e) => e.method === 'Network.requestWillBeSent').map((e) => String(e.params?.request?.url ?? ''));
        report.raw.exceptions = settings.events().filter((e) => e.method === 'Runtime.exceptionThrown').map((e) => e.params?.exceptionDetails?.exception?.description ?? e.params?.exceptionDetails?.text ?? '');
        settings.close();
      }
    }
  });
} catch (err) {
  cannotRead('the run', `it threw: ${String(err?.stack ?? err)}`);
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
  const text = appLogText();
  const commandOfPid = (pid) => (spawnSync('/bin/ps', ['-ww', '-p', String(pid), '-o', 'command='], { encoding: 'utf8' }).stdout ?? '').trim();
  const ours = (spawnSync('/bin/ps', ['-Ao', 'pid=,ppid=,comm='], { encoding: 'utf8' }).stdout ?? '')
    .split('\n')
    .filter((l) => /Electron|Tortie$|chrome_crashpad/.test(l) && !/defunct/.test(l))
    .filter((l) => {
      const [pid, ppid] = l.trim().split(/\s+/).map(Number);
      return launches.some((x) => [x.shim, x.app].filter((p) => p > 0).some((p) => pid === p || ppid === p)) || commandOfPid(pid).includes(PROFILE);
    });
  arm('RUN', {
    tailscalePreflight,
    dnsPreflight,
    joinedOk,
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
    networkRead: network.read,
    urls: network.urls,
    apnsRequests,
    apnsConnections,
    appLogRead: text !== null,
    appLogBegin: text !== null && text.includes('-----BEGIN'),
    appLogPemLine: text !== null && alerts.pemLines.some((l) => text.includes(l)),
    appLogName: text !== null && text.toLowerCase().includes(NAME),
    appLogAddress: text !== null && text.includes(STANDIN_ADDRESS),
    keyFileGone,
    standinLeft: ended.left.length,
    dnsClosed: dns !== null && dns.closed(),
    apnsClosed,
    electronLeft: ours.length
  });
  report.raw = {
    ...report.raw,
    dnsLog: questions,
    servers: dns?.servers ?? null,
    udpSeen: [...udp.seen].sort(),
    udpLeaks: udp.leaks,
    realTailscaleFindings: findings,
    standinEnded: ended,
    standinRowsAtEnd: processRows().filter((r) => r.command.includes('tailscale-standin.mjs')).length,
    electronLeft: ours,
    launches: launches.map((l) => ({ label: l.label, shim: l.shim, app: l.app }))
  };
  rmSync(RUN, { recursive: true, force: true });
}

// ---- CMP: HEAD against the parent ------------------------------------------------
if (!AT_PARENT) {
  let parent = null;
  try {
    parent = JSON.parse(readFileSync(join(OUT, 'probe-p3332-parent.json'), 'utf8'));
  } catch {
    parent = null;
  }
  const head = { R: report.readings.R, S: report.readings.S, K: report.readings.K };
  // An arm either build could not READ is missing, whatever reading it left behind.
  const unreadAt = (arms, id) => (Array.isArray(arms) ? arms : []).find((a) => a.id === id)?.ok === null;
  const missing = ['R', 'S', 'K'].filter((id) => unreadAt(report.arms, id) || unreadAt(parent?.arms, id) || head[id] === undefined || parent?.readings?.[id] === undefined);
  if (parent === null) cannotRead('CMP', `no parent reading at ${join(OUT, 'probe-p3332-parent.json')}; run the parent first and build nothing between the runs`);
  else if (missing.length > 0) cannotRead('CMP', `no reading of ${missing.join(', ')} at one build`);
  else {
    const p = { atParent: parent.atParent, checkout: parent.checkout, R: parent.readings.R, S: parent.readings.S, K: parent.readings.K };
    const why = cmpPrecondition(p, head);
    if (why !== null) cannotRead('CMP', `the two builds were not laid out alike for a reason outside this phase: ${why}`);
    else {
      arm('CMP', { root: ROOT, parent: p, head });
      say('SIDE BY SIDE, the same script at both builds:');
      sideBySide(p, head);
    }
  }
}

mkdirSync(OUT, { recursive: true });
const outFile = join(OUT, `probe-p3332-${AT_PARENT ? 'parent' : 'head'}.json`);
writeFileSync(outFile, `${J(report, null, 1)}\n`, 'utf8');
say(`wrote ${outFile}`);
if (failures > 0) {
  say(`probe:p3332 FAILED ${String(failures)} arm(s)`);
  process.exit(1);
}
if (unreadable > 0) {
  say(`probe:p3332 could not READ ${String(unreadable)} arm(s); that is not a pass`);
  process.exit(2);
}
say(AT_PARENT ? 'probe:p3332 at the parent: the parent reading is taken' : 'probe:p3332 OK');
process.exit(0);
