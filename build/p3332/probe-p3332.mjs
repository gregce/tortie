#!/usr/bin/env node
/**
 * probe:p3332 — Settings then Phone names where the phone app comes from, read
 * in the real app at the parent and at HEAD (Phase 333.2, build/p3332/SPEC.md
 * §6).
 *
 * WHAT IT MEASURES. One string moves: the line under the pairing code,
 * `SCAN_LINE`, says "Scan it with Tortie on your iPhone, from
 * tortie.sh/iphone." in words, never a link. The probe reads EVERY rectangle
 * and every word of `section[aria-label="Phone"]` at both builds, with the
 * same script, and the HEAD run compares the two: at rest, with the code
 * showing at 640, 760 and 1200 pixels wide, and through Choose… and Forget of
 * a scratch key. The only rectangles that may move are the scan line's and
 * its column's, in width alone (SPEC §6.6). A fourth reading forces a 243 px
 * code at 1200 (SPEC §6.7), the one placement change, which is REPORTED and
 * not failed.
 *
 * THE ARMS, in ONE launch per build, the same script at both:
 *   R    at rest: the door off, Pair drawn, the key row `Not chosen.`, no
 *        alert switch, no link, nothing past the section
 *   S    the sheet's own Pair, then its Allow (probe:p330 A3's presses), until
 *        `[data-phone-stage="showing"]` with no other press; read at 760, at
 *        640 and 1200 through `Emulation.setDeviceMetricsOverride`, then a
 *        243 px code at 1200, then 760 again (a sanity read); then Cancel
 *   K    the door still on: Choose… (the harness override answers the scratch
 *        key with no panel), the key and the switch drawn; Forget, both gone;
 *        the alert switch is never pressed; then the door off
 *   CMP  HEAD only, against out/p3332/probe-p3332-parent.json
 *   RUN  both builds: the stand-ins' preflights, the hidden agents, no real
 *        Tailscale, no forbidden argv, UDP to 127.0.0.1 alone, every DNS
 *        question an A, RD 0, for the name, the sheet asking nothing off the
 *        Mac and nothing naming tortie.sh, Apple's stand-in reached by
 *        nothing, app.log holding no key and no name, the key file gone,
 *        every stand-in ended, no Electron left
 *
 * THE WORDS ARE SPELLED HERE, never read from the tree, so a constant that
 * drifts is caught rather than agreed with.
 *
 * THE READER. ONE `cdpEval` on the Settings page, after a frame (the occlusion
 * trap p3321 names): for the section and every element under it, except what
 * is inside `svg.phone-qr` (its modules are the window's one-shot secret; the
 * `svg` itself is read), a structural key, the rectangle relative to the
 * section, and the text of a leaf; and beside the map the facts the graders
 * read. Both reports hold every raw map, so a verifier can re-derive without
 * the grader.
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

export const PARENT_SCAN = 'Scan it with Tortie on your iPhone.';
export const HEAD_SCAN = 'Scan it with Tortie on your iPhone, from tortie.sh/iphone.';
export const CODE_PRIVATE = 'Do not show this code on a shared screen.';
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

/** The rightmost edge any element reaches, relative to the section. */
const rightmost = (m) => Math.max(...Object.values(m.els).map((e) => e.r.x + e.r.w));

// ---------------------------------------------------------------------------
// THE GRADERS (SPEC §6.5). Pure: each takes the reading an arm collected and
// answers which of its clauses failed. `--grader-self-test` runs every one
// over a passing fixture and, for EVERY clause, a fixture broken on that
// clause alone, which must fail on that clause.
// ---------------------------------------------------------------------------

/** The S readings a clause reads: the three real widths, then all five. */
const realWidths = (r) => WIDTHS.map((w) => r.at[String(w)]);
const everyS = (r) => [...realWidths(r), r.wide, r.again];

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
    title: 'at rest: the door off, Pair, the key row with no key, no alert switch, no link, nothing past the section',
    clauses: [
      ['stage start', (r) => r.stage === 'start'],
      ['Pair drawn', (r) => r.pair.drawn === true && r.pair.disabled === false],
      ['the key row drawn', (r) => r.keyRow === true && r.keyLine === KEY_NONE],
      ['no switch without a key', (r) => r.alerts.drawn === false],
      ['no link', (r) => r.link === false],
      ['inside the section', (r) => r.scrollWidth <= r.clientWidth]
    ]
  },
  S: {
    title: 'the code: the scan line’s words, text only, one line, inside the section, at 640, 760 and 1200',
    clauses: [
      ['stage showing at every width', (r) => everyS(r).every((m) => m.stage === 'showing')],
      ['the scan line’s words', (r) => everyS(r).every((m) => m.scanText === (r.atParent ? PARENT_SCAN : HEAD_SCAN))],
      ['text only', (r) => everyS(r).every((m) => m.scanTag === 'P' && m.scanChildElements === 0 && m.tortieControl === false)],
      ['the private line after it', (r) => everyS(r).every((m) => m.nextLineText === CODE_PRIVATE)],
      ['one line at every width', (r) => realWidths(r).every((m) => Number.isFinite(m.scanLineHeight) && m.els[m.scanKey].r.h <= m.scanLineHeight + 0.5)],
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
    title: 'the parent against HEAD: every rectangle and word equal but the scan line’s words and its and its column’s widths',
    clauses: [
      ['the parent reading is the parent’s', (r) =>
        r.parent.atParent === true && typeof r.parent.checkout === 'string' && r.parent.checkout !== r.root && everyS(r.parent.S).every((m) => m.scanText === PARENT_SCAN)],
      ['the same elements', (r) => cmpPairs(r).every(([, p, h]) => compareMaps(p, h).keysSame)],
      ['rest unchanged', (r) => {
        const c = compareMaps(r.parent.R, r.head.R);
        return c.keysSame && c.compared > 0 && c.moved.length === 0 && c.reworded.length === 0;
      }],
      ['only the scan line and its column widen', (r) =>
        WIDTHS.every((w) => {
          const P = r.parent.S.at[String(w)];
          const H = r.head.S.at[String(w)];
          const want = [H.scanKey, H.sideKey].sort();
          const c = compareMaps(P, H);
          return (
            P.scanKey === H.scanKey &&
            P.sideKey === H.sideKey &&
            J([...c.moved].sort()) === J(want) &&
            want.every((k) => ['x', 'y', 'h'].every((d) => near(P.els[k].r[d], H.els[k].r[d]))) &&
            H.els[H.scanKey].r.w > P.els[P.scanKey].r.w + 0.5 &&
            near(H.els[H.sideKey].r.w, H.els[H.scanKey].r.w)
          );
        })],
      ['the words unchanged but the scan line', (r) =>
        cmpPairs(r).every(([, p, h]) => compareMaps(p, h).reworded.every((k) => isClockKey(k) || (h.scanKey !== null && h.scanKey !== undefined && k === h.scanKey)))],
      ['the same placement at every real width', (r) => WIDTHS.every((w) => typeof r.head.S.at[String(w)].beside === 'boolean' && r.parent.S.at[String(w)].beside === r.head.S.at[String(w)].beside)],
      ['the key arm unchanged', (r) =>
        ['k0', 'k1', 'k2'].every((k) => {
          const c = compareMaps(r.parent.K[k], r.head.K[k]);
          return c.keysSame && c.compared > 0 && c.moved.length === 0 && c.reworded.every(isClockKey);
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
  return null;
}

// ---------------------------------------------------------------------------
// THE FIXTURES: a model of the section at each build, by SPEC §6.6's geometry.
// The numbers are CoreText's widths; the model is a fixture, never the claim.
// ---------------------------------------------------------------------------

const MODEL = Object.freeze({ nav: 248, cap: 560, inset: 26, qrPx: 308, gap: 16, scan: { parent: 192.82, head: 318.49 }, privateW: 240.41, countdownW: 96.43, cancelW: 64, line: 18, rowGap: 6, buttonH: 28, qrModules: 69 });

/** One element of a model reading. */
const el = (r, t = null, b = undefined) => ({ r: { ...r }, t, ...(b === undefined ? {} : { b }) });
const button = (label, disabled = false, extra = {}) => ({ checked: extra.checked ?? null, label: extra.label ?? null, disabled });

/**
 * A model reading of the section. `face` is `rest`, `showing`, `k0`, `k1` or
 * `k2`; `build` is `parent` or `head`; `width` the window's; `qrPx` the code's.
 */
export function modelReading({ face, build, width = 760, qrPx = MODEL.qrPx }) {
  const secW = Math.min(MODEL.cap, width - MODEL.nav);
  const S = 'section.phone-section#0';
  const els = {};
  const put = (key, e) => (els[key] = e);
  put(S, el({ x: 0, y: 0, w: secW, h: 0 }));
  put(`${S} > h1.set-title#0`, el({ x: 0, y: 0, w: secW, h: 24 }, 'Phone'));
  put(`${S} > div.set-section-caption#0`, el({ x: 0, y: 30, w: secW, h: 18 }, 'Your phone reaches this Mac through Tailscale Funnel. Only a phone you pair gets an answer.'));
  const on = face !== 'rest';
  put(`${S} > div.set-card#0`, el({ x: 0, y: 56, w: secW, h: 50 }));
  put(`${S} > div.set-card#0 > div.set-row.tall#0 > button.set-switch${on ? '.on' : ''}#0`, el({ x: secW - 44, y: 70, w: 32, h: 18 }, null, button('switch', false, { checked: String(on), label: 'Let my phone reach this Mac' })));
  const card = `${S} > div.set-card#1`;
  let y = 116;
  let scanKey = null;
  let sideKey = null;
  let qrKey = null;
  let beside = null;
  let stage;
  if (face === 'showing') {
    stage = 'showing';
    const content = secW - MODEL.inset;
    const scanW = MODEL.scan[build];
    const sideW = Math.max(scanW, MODEL.privateW, MODEL.countdownW, MODEL.cancelW);
    const sideH = 3 * MODEL.line + 3 * MODEL.rowGap + MODEL.buttonH;
    beside = qrPx + MODEL.gap + sideW <= content;
    const x0 = 13;
    const y0 = y + 12;
    const side = beside ? { x: x0 + qrPx + MODEL.gap, y: y0 + (qrPx - sideH) / 2 } : { x: x0, y: y0 + qrPx + MODEL.gap };
    const blockH = (beside ? qrPx : qrPx + MODEL.gap + sideH) + 24;
    const block = `${card} > div.phone-block.phone-showing[data-phone-stage=showing]#0`;
    put(card, el({ x: 0, y, w: secW, h: blockH + 2 }));
    put(block, el({ x: 1, y: y + 1, w: secW - 2, h: blockH }));
    qrKey = `${block} > svg.phone-qr#0`;
    put(qrKey, el({ x: x0, y: y0, w: qrPx, h: qrPx }));
    sideKey = `${block} > div.phone-qr-side#0`;
    put(sideKey, el({ x: side.x, y: side.y, w: sideW, h: sideH }));
    scanKey = `${sideKey} > p.phone-line#0`;
    put(scanKey, el({ x: side.x, y: side.y, w: scanW, h: MODEL.line }, build === 'parent' ? PARENT_SCAN : HEAD_SCAN));
    put(`${sideKey} > p.phone-line#1`, el({ x: side.x, y: side.y + 24, w: MODEL.privateW, h: MODEL.line }, CODE_PRIVATE));
    put(`${sideKey} > p.phone-countdown[data-phone-countdown]#0`, el({ x: side.x, y: side.y + 48, w: MODEL.countdownW, h: MODEL.line }, 'Shuts in 2:41'));
    put(`${sideKey} > button.btn.btn-secondary[data-phone-action=cancel-pairing]#0`, el({ x: side.x, y: side.y + 72, w: MODEL.cancelW, h: MODEL.buttonH }, 'Cancel', button('Cancel')));
    y += blockH + 12;
  } else {
    stage = face === 'rest' ? 'start' : 'ready';
    const block = `${card} > div.phone-block[data-phone-stage=${stage}]#0`;
    put(card, el({ x: 0, y, w: secW, h: 54 }));
    put(block, el({ x: 1, y: y + 1, w: secW - 2, h: 52 }));
    put(`${block} > button.btn.btn-primary[data-phone-action=pair]#0`, el({ x: 13, y: y + 13, w: 48, h: MODEL.buttonH }, 'Pair', button('Pair')));
    y += 64;
  }
  const alertsCard = `${S} > div.set-card#2`;
  const keyRow = `${alertsCard} > div.set-row.tall[data-phone-key]#0`;
  const kept = face === 'k1';
  put(alertsCard, el({ x: 0, y, w: secW, h: kept ? 110 : 54 }));
  put(keyRow, el({ x: 1, y: y + 1, w: secW - 2, h: 52 }));
  put(`${keyRow} > div.set-row-text#0 > span.set-row-label#0`, el({ x: 13, y: y + 9, w: 92, h: 18 }, 'Apple push key'));
  put(`${keyRow} > div.set-row-text#0 > span.set-row-caption[data-phone-key-line]#0`, el({ x: 13, y: y + 27, w: kept ? 98 : 70, h: 16 }, kept ? KEY_KEPT : KEY_NONE));
  put(`${keyRow} > div.phone-key-actions#0 > button.btn.btn-secondary[data-phone-action=choose-key]#0`, el({ x: secW - (kept ? 150 : 80), y: y + 13, w: 68, h: MODEL.buttonH }, 'Choose…', button('Choose…')));
  if (kept) {
    put(`${keyRow} > div.phone-key-actions#0 > button.btn.btn-secondary[data-phone-action=forget-key]#0`, el({ x: secW - 76, y: y + 13, w: 64, h: MODEL.buttonH }, 'Forget', button('Forget')));
    const row = `${alertsCard} > div.set-row.tall[data-phone-alerts]#0`;
    put(row, el({ x: 1, y: y + 55, w: secW - 2, h: 54 }));
    put(`${row} > div.set-row-text#0 > span.set-row-label#0`, el({ x: 13, y: y + 63, w: 230, h: 18 }, PUSH_LABEL));
    put(`${row} > button.set-switch#0`, el({ x: secW - 44, y: y + 73, w: 32, h: 18 }, null, button('switch', false, { checked: 'false', label: PUSH_LABEL })));
  }
  const h = y + (kept ? 110 : 54);
  els[S].r.h = h;
  return {
    at: 0,
    innerWidth: width,
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
    nextLineText: scanKey === null ? null : CODE_PRIVATE,
    link: false,
    tortieControl: false,
    beside,
    pair: { drawn: face !== 'showing', disabled: false },
    keyRow: true,
    keyLine: kept ? KEY_KEPT : KEY_NONE,
    alerts: kept ? { drawn: true, label: PUSH_LABEL, switchLabel: PUSH_LABEL, checked: 'false', disabled: false } : { drawn: false, label: null, switchLabel: null, checked: null, disabled: null },
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
      'Pair drawn': (r) => void (r.pair.disabled = true),
      'the key row drawn': (r) => void (r.keyLine = KEY_KEPT),
      'no switch without a key': (r) => void (r.alerts.drawn = true),
      'no link': (r) => void (r.link = true),
      'inside the section': (r) => void (r.scrollWidth = r.clientWidth + 12)
    },
    refused: [
      { what: 'a key row that is not drawn', clause: 'the key row drawn', edit: (r) => void (r.keyRow = false) },
      { what: 'Pair not drawn at all', clause: 'Pair drawn', edit: (r) => void (r.pair.drawn = false) }
    ]
  },
  S: {
    pass: modelS('head'),
    breaks: {
      'stage showing at every width': (r) => void (r.again.stage = 'ready'),
      'the scan line’s words': (r) => void (r.at['640'].scanText = PARENT_SCAN),
      'text only': (r) => void (r.at['1200'].scanChildElements = 1),
      'the private line after it': (r) => void (r.wide.nextLineText = 'Shuts in 2:41'),
      'one line at every width': (r) => void (r.at['640'].els[r.at['640'].scanKey].r.h = 36),
      'inside the section at every width': (r) => nudge(r.at['640'], r.at['640'].scanKey, 'w', 120),
      'the same code at every width': (r) => void (r.at['1200'].qrModules = 73)
    },
    refused: [
      { what: 'the parent’s words at HEAD', clause: 'the scan line’s words', edit: (r) => Object.values(r.at).forEach((m) => void (m.scanText = PARENT_SCAN)) },
      { what: 'HEAD’s words in a parent reading', clause: 'the scan line’s words', edit: (r) => void (r.atParent = true) },
      { what: 'the address in a button', clause: 'text only', edit: (r) => void (r.at['760'].tortieControl = true) },
      { what: 'the scan line drawn in a span', clause: 'text only', edit: (r) => void (r.wide.scanTag = 'SPAN') },
      { what: 'a section that scrolls sideways at 1200', clause: 'inside the section at every width', edit: (r) => void (r.at['1200'].scrollWidth = r.at['1200'].clientWidth + 1) },
      { what: 'no code drawn', clause: 'the same code at every width', edit: (r) => everyS(r).forEach((m) => void (m.qrModules = null)) },
      { what: 'a line height that could not be read', clause: 'one line at every width', edit: (r) => void (r.at['760'].scanLineHeight = Number.NaN) }
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
      'the same elements': (r) => void delete r.head.K.k1.els[firstKey(r.head.K.k1, /forget-key/)],
      'rest unchanged': (r) => nudge(r.head.R, firstKey(r.head.R, /data-phone-key-line/), 'y', 3),
      'only the scan line and its column widen': (r) => nudge(r.head.S.at['760'], r.head.S.at['760'].scanKey, 'x', 2),
      'the words unchanged but the scan line': (r) => void (r.head.S.at['640'].els[firstKey(r.head.S.at['640'], /p\.phone-line#1$/)].t = 'Keep this code private.'),
      'the same placement at every real width': (r) => void (r.head.S.at['640'].beside = true),
      'the key arm unchanged': (r) => nudge(r.head.K.k2, firstKey(r.head.K.k2, /choose-key/), 'x', -4)
    },
    refused: [
      { what: 'a parent reading taken from HEAD’s own tree', clause: 'the parent reading is the parent’s', edit: (r) => void (r.parent.checkout = r.root) },
      { what: 'HEAD’s words in the parent reading', clause: 'the parent reading is the parent’s', edit: (r) => void (r.parent.S.wide.scanText = HEAD_SCAN) },
      { what: 'a third rectangle moved at 1200', clause: 'only the scan line and its column widen', edit: (r) => nudge(r.head.S.at['1200'], firstKey(r.head.S.at['1200'], /cancel-pairing/), 'y', 18) },
      { what: 'the scan line grown taller (two lines)', clause: 'only the scan line and its column widen', edit: (r) => nudge(r.head.S.at['640'], r.head.S.at['640'].scanKey, 'h', 18) },
      { what: 'the column not following the scan line', clause: 'only the scan line and its column widen', edit: (r) => nudge(r.head.S.at['760'], r.head.S.at['760'].sideKey, 'w', 20) },
      { what: 'HEAD’s scan line no wider than the parent’s', clause: 'only the scan line and its column widen', edit: (r) => {
        for (const w of WIDTHS) {
          const H = r.head.S.at[String(w)];
          const P = r.parent.S.at[String(w)];
          H.els[H.scanKey].r.w = P.els[P.scanKey].r.w;
          H.els[H.sideKey].r.w = P.els[P.sideKey].r.w;
        }
      } },
      { what: 'a word changed in the key arm', clause: 'the words unchanged but the scan line', edit: (r) => void (r.head.K.k0.els[firstKey(r.head.K.k0, /set-row-label#0$/)].t = 'Apple key') },
      { what: 'a button disabled at one build', clause: 'the words unchanged but the scan line', edit: (r) => void (r.head.R.els[firstKey(r.head.R, /data-phone-action=pair/)].b.disabled = true) },
      { what: 'a placement read as nothing', clause: 'the same placement at every real width', edit: (r) => WIDTHS.forEach((w) => { r.head.S.at[String(w)].beside = null; r.parent.S.at[String(w)].beside = null; }) }
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

function graderSelfTest() {
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
  say(cmp.parent.S.wide.beside === true && cmp.head.S.wide.beside === false, 'the model’s 243 px code has the column beside it at the parent and under it at HEAD (SPEC §6.7)');
  say(cmpPrecondition(cmp.parent, cmp.head) === null, 'CMP’s precondition holds over the model');
  const narrow = modelCmp();
  narrow.head.S.at['760'].innerWidth = 762;
  say(cmpPrecondition(narrow.parent, narrow.head) !== null, 'CMP’s precondition refuses a window that was not 760 wide');
  const otherCode = modelCmp();
  otherCode.parent.S.at['760'].qrModules = 73;
  say(cmpPrecondition(otherCode.parent, otherCode.head) !== null, 'CMP’s precondition refuses two codes of different sizes');

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
  say(HEAD_SCAN === 'Scan it with Tortie on your iPhone, from tortie.sh/iphone.' && !HEAD_SCAN.includes('://'), 'HEAD’s scan line is the SPEC’s, with no scheme');
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
  process.exit(graderSelfTest() ? 0 : 1);
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

const SECTION_READER = `(async () => {
  await Promise.race([new Promise((r) => requestAnimationFrame(() => r())), new Promise((r) => setTimeout(r, 50))]);
  const stepOf = ${stepOf.toString()};
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
  return JSON.stringify({
    at: Date.now(),
    innerWidth,
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
async function readSection(settings) {
  return JSON.parse(await cdpEval(settings, SECTION_READER, 20_000));
}

/** Set the Settings page's layout width, and wait until the page says it is that width. */
async function atWidth(settings, width) {
  await settings.call('Emulation.setDeviceMetricsOverride', { width, height: 560, deviceScaleFactor: 0, mobile: false });
  return waitFor(async () => (await cdpEval(settings, 'innerWidth')) === width, 5_000, 100);
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
      await waitFor(() => sheetIs(settings, `const p = s.querySelector('[data-phone-action="pair"]'); return p !== null && !p.disabled && s.querySelector('[data-phone-key]') !== null;`), 20_000);
      arm('R', await readSection(settings));

      // ---- S: the code ----------------------------------------------------------
      let S = null;
      if (!(await click(settings, '[data-phone-action="pair"]'))) {
        cannotRead('S', 'the sheet drew no Pair to press');
      } else if (!(await allowDoor(settings, main, 45_000))) {
        cannotRead('S', 'main never drew door lines to Allow after Pair');
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
        await settings.call('Emulation.clearDeviceMetricsOverride');
        await waitFor(async () => (await cdpEval(settings, 'innerWidth')) === first.innerWidth, 5_000, 100);
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
