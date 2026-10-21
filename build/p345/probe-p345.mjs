#!/usr/bin/env node
/**
 * probe:p345 — one iPhone, several Macs, driven in the Simulator against TWO
 * real Macs at once and three doors of node's (Phase 345, build/p345/SPEC.md
 * §5.3: the two-door matrix and the attack). Verifiers only, under ONE lock
 * slot. It is run as `npm run probe:p345`, which runs `--preflight` first and
 * then this file inside `build/harness-socket.mjs --fresh gmux-p345`.
 *
 * WHAT IS REAL IN A RUN
 *   - TWO MACS, TWO ELECTRONS AT ONCE, each through build/electron-run.mjs's
 *     `withElectron` (the second nested inside the first, so each is ended in
 *     its own `finally`), each on its own scratch profile, HOME (with ZDOTDIR
 *     and HISTFILE=/dev/null, so no shell writes a history anywhere else) and
 *     tmux socket (`gmux-p345a-<pid>`, `gmux-p345b-<pid>`, ended by the
 *     helper's teardown), the five hidden agents renamed before each launch
 *     and `agents:list` read back.
 *       Mac A, `p345-studio.tail00000.ts.net`: its door published through its
 *       OWN stand-in Tailscale (build/p330/tailscale-standin.mjs behind a
 *       scratch wrapper named by GMUX_TAILSCALE_BIN, preflighted by sha256),
 *       its name answered by its own build/p332/dns-standin.mjs, and its
 *       ALERTS ARMED as probe:p316's N arms arm them: Phase 314's APNs
 *       stand-in in THIS process, a scratch P-256 key written 0600 under its
 *       harness directory and named by GMUX_HARNESS_ALERTS, chosen through the
 *       bridge and DELETED in the `finally`, the switch on before any window
 *       opens. Sessions: a shell `a-shell` and one `claude` stand-in `a-ask`
 *       (1 waiting).
 *       Mac B, `p345-laptop.tail00000.ts.net`: its own stand-ins, no key;
 *       `b-shell` and two `claude` stand-ins (2 waiting), so every badge is
 *       told apart.
 *     The `claude` on each scratch PATH is a /bin/sh script that prints the
 *     COMMITTED Phase 312 dialog and waits: NO VENDOR PROCESS RUNS AND NO
 *     TOKEN IS SPENT. Each Mac also pairs a node reader
 *     (build/p316/node-phone.mjs) that dials its forwarder DIRECTLY, never
 *     through the relay, so what each door answers is read beside what the
 *     phone draws and the relay's counts are the phone's alone.
 *   - THREE NODE DOORS, build/p316/hostile-door.mjs, each its own process on
 *     loopback, ended in the `finally`: `twin` (--arm twin --name
 *     p345-studio.tail99999.ts.net --alerts: claims alerts, shares A's first
 *     label, lists A's session ids under its own name on `twin-mirror`,
 *     refuses every signed read on `twin-refuse`), C and D (--arm honest
 *     --name p345-cmac.tail00002.ts.net, p345-dmac.tail00003.ts.net). C is
 *     started twice: the second C is a new key and a NEW code for a re-pair.
 *   - THE SNI RELAY, build/p345/sni-relay.mjs, in this process: ONE loopback
 *     port the app dials through `-TortieDebugDoorEndpoint 127.0.0.1:<port>`;
 *     it reads each ClientHello's server name and forwards the bytes whole to
 *     that door's CURRENT backend. Its per-name connection counts are each
 *     Electron door's log of who asked; a node door logs every request with
 *     its route, the session id it names, its SNI and the client pin.
 *   - THE PHONE: HEAD's DEBUG app and, with P345_PARENT_CHECKOUT (a built
 *     checkout of build 10's code: 24097f39 or 5f5efba2), the parent's DEBUG
 *     app, each built by xcodebuildRun into this run's scratch and driven by
 *     its OWN P316DriveUITests/testDrive. Simulators through
 *     build/simulator-run.mjs's withSimulator, ONE AT A TIME: the ORDER
 *     device on iOS 26.3, then the FLOOR device on iOS 18.3, where badges are
 *     read (iOS 26's glass bar gives XCUITest no number). Every drive after
 *     the first on a device sets P345_KEEP_PAIRING=1, so it starts on what the
 *     Keychain kept, on the first Mac (D5).
 *   - NO real Tailscale (a per-second process sample fails the run on one),
 *     no real DNS, no Apple, no vendor agent, no model turn, no photograph:
 *     a visual claim is a frame or a label XCUITest read.
 *
 * THE ARMS (SPEC §5.3's table; exit 0 every arm passed, 1 an arm failed, 2
 * the run could not start or an arm could not be READ)
 *   26.3 and 18.3: U0 upgrade, P1 one-Mac parity, T1 a second Mac, T2
 *   switching, UP Unpair one. 26.3 alone: AL1, T3 (with Pair another Mac's
 *   sheet opened from Settings and cancelled, D16), AL2, S1, S2, CAP, H, HN,
 *   DG, RM, RP. And RUN. Every arm reads the phone's drawn screens (labels and
 *   frames) AND the doors' own answers, counts or logs; a step whose screen
 *   never came is UNREADABLE, never a pass. U0, P1 and DG need P345_PARENT_CHECKOUT: without it
 *   they read UNREADABLE and the run exits 2. The "one corrupt record" row is
 *   MultiMacKeychainTests (`test:ios`), not this probe: it has no way into the
 *   keychain and adds no seam for one.
 *   SINCE PHASE 348 (build/p348/SPEC.md §6): a pairing that finishes lands on
 *   that Mac's SESSIONS (D1), so T1 and RP read the landing there and that
 *   Mac's Needs input after an explicit `tab:needs`, and HEAD's own first
 *   pairing is kept when it lands on Sessions; P1 skips what later phases
 *   changed on purpose (`P1_STATED`: the titles in the iPhone's own bar, Select,
 *   the filter and the "+" in it, the age note and the read line it moved) and
 *   one shift under the bar, and its Settings half is SUPERSEDED by Phase 348's
 *   grouped Settings, which probe:p316's S6, SE4, SA12 and SC1 read. Show is
 *   NOT stated: his ruling of 2026-10-20 ("Top bar (Recommended)") keeps it at
 *   build 11's full width, so a Show drawn otherwise is a difference.
 *
 * ENVIRONMENT
 *   P345_PARENT_CHECKOUT=<dir>   build 10's checkout (its ios/ is built here)
 *   P345_DERIVED_DATA=<dir>      HEAD's derived data (default: the run's scratch)
 *   P345_PARENT_DERIVED_DATA=<dir>  the parent's
 *   P345_DEVICES=order,floor     which devices run (default both)
 *   P345_ARMS=<ids>              which drives run (default every one); an arm
 *                                whose pairing an unselected drive owed reads
 *                                UNREADABLE
 *   P345_KEEP=1                  keep the run directory and the doors' logs
 *   P345_WAIT_S=<s>              each UI step's wait (default 150, probe:p316's for an alert)
 *
 *   node build/p345/probe-p345.mjs --grader-self-test   (starts nothing)
 *   node build/p345/probe-p345.mjs --preflight          (Xcode, the build; starts nothing)
 *   npm run probe:p345                                  (the run, under one lock slot)
 *
 * NOT `--self-test`: build/cdp-target.mjs, imported below, runs ITS fixtures
 * and exits when argv holds that exact word.
 */

import { spawn, spawnSync } from 'node:child_process';
import { createHash, generateKeyPairSync, randomBytes } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { readFile as readFileAsync } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cdpEval, wsConnect } from '../cdp-client.mjs';
import { pickRendererTarget } from '../cdp-target.mjs';
import { withElectron, withoutDevRenderer } from '../electron-run.mjs';
import { RUNTIME_CURRENT, RUNTIME_FLOOR, countDevicesNamed, simulatorHarnessMissing, withSimulator, xcodebuildRun } from '../simulator-run.mjs';
import { startApnsStandIn } from '../p314/apns-stand-in.mjs';
import { DEFAULT_SCENARIO, endStandinProcesses, makeStandin, preflightStandin, watchForRealTailscale } from '../p330/tailscale-standin.mjs';
import { NAME_SERVERS_VAR, loopbackOnlyServers, makeDnsStandin, quietAgentsHeld, writeQuietAgents } from '../p332/dns-standin.mjs';
import { hostileDoorArgv } from '../p316/hostile-door.mjs';
import { fingerprintDigits, makePhone, pairThrough, readOffer, readSessions, screenRead, screenRowText, shaHex, signedGet } from '../p316/node-phone.mjs';
import { sniOf, startSniRelay } from './sni-relay.mjs';
// THE PROBE REVIEW (Phase 348, rule 9): the precondition every probe of this phase asks.
import { manifestSessions, plantedResolve, within } from '../scratch-login.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const TAG = '[p345]';
const J = JSON.stringify;
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
const say = (line) => console.log(`${TAG} ${line}`);

// ---------------------------------------------------------------------------
// The world's names
// ---------------------------------------------------------------------------

const PID = String(process.pid);
export const A_NAME = 'p345-studio.tail00000.ts.net';
export const B_NAME = 'p345-laptop.tail00000.ts.net';
export const TWIN_NAME = 'p345-studio.tail99999.ts.net';
export const C_NAME = 'p345-cmac.tail00002.ts.net';
export const D_NAME = 'p345-dmac.tail00003.ts.net';
/** A public name up to its first dot: today's drawn name (D21). */
export const firstLabel = (name) => String(name).split('.')[0];
/**
 * D21: a Mac's drawn name, among the names kept beside it: its first label, or
 * its WHOLE public name when another kept Mac has the same first label.
 */
export const drawnName = (name, kept) => (kept.filter((n) => n !== name && firstLabel(n) === firstLabel(name)).length > 0 ? name : firstLabel(name));

/** The three tabs' words, read from Copy.swift below; the SPEC's words when it holds none. */
const COPY_SWIFT = (() => {
  try {
    return readFileSync(join(ROOT, 'ios', 'Tortie', 'Style', 'Copy.swift'), 'utf8');
  } catch {
    return '';
  }
})();
const copyOf = (name) => {
  const m = new RegExp(`static let ${name}\\s*=\\s*"((?:[^"\\\\]|\\\\.)*)"`).exec(COPY_SWIFT);
  return m === null ? null : m[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\');
};
export const WORDS = Object.freeze({
  needsInput: copyOf('needsInput') ?? 'Needs input',
  sessions: copyOf('sessions') ?? 'Sessions',
  settings: copyOf('settings') ?? 'Settings',
  notPairedHere: copyOf('notPairedHere') ?? 'This iPhone is not paired with this Mac.',
  macLimit: copyOf('macLimit') ?? 'This iPhone is paired with four Macs. Unpair one to pair another.',
  keyMismatch: copyOf('keyMismatch') ?? 'This Mac’s key is not the one this iPhone paired with. Nothing was read.',
  cannotReachMac: copyOf('cannotReachMac') ?? 'Tortie could not reach your Mac.',
  macDidNotAnswer: copyOf('macDidNotAnswer') ?? 'Your Mac did not answer in time.',
  needsLead: copyOf('needsYourInputLead') ?? 'Needs your input (',
  countClose: copyOf('countClose') ?? ')'
});
/** `Needs your input (n)`, as Copy.needsYourInput composes it. */
export const needsYourInput = (n) => `${WORDS.needsLead}${String(n)}${WORDS.countClose}`;
/** SPEC §3.8: every element under Pair another Mac moves down by Frame.linkRowHeight + Frame.cardGap. */
export const SETTINGS_SHIFT_PT = 66;
/** UP: the idle's 20 s as this process reads its two lines, less a second for the tail's own reading. */
export const IDLE_READ_MS = 19_000;
/** S2: A's Needs input drawn within this of the return to the foreground. */
export const FOREGROUND_DRAWN_MS = 5_000;
/**
 * S2: a return's dial is counted from this long before the probe READ the
 * `banner` line, because the app is activated just after that line is written
 * and the probe reads it up to a tail's tick later. It stays under the two
 * seconds `no-banner:2` spends at Home looking for a banner before writing the
 * line, so no read from before Home can fall inside the window.
 */
export const RETURN_SLACK_MS = 1_900;

// ---------------------------------------------------------------------------
// Reading a dump (the UI test's `screen` lines: id, label and frame)
// ---------------------------------------------------------------------------

export const el = (dump, id) => dump?.elements?.find((e) => e.id === id) ?? null;
const has = (dump, id) => el(dump, id) !== null;
const lastDump = (events, name) => events.filter((e) => e.step === 'screen' && e.name === name).at(-1) ?? null;
const dumpsNamed = (events, name) => events.filter((e) => e.step === 'screen' && e.name === name);
const lineOf = (events, step, from = 0) => events.find((e) => e.step === step && Number(e.seq ?? 0) > from) ?? null;
/** The first dump named `name` after the line numbered `seq`, or null: a step the drive never reached reads as nothing, never as an earlier dump of the same name. */
const dumpAfter = (events, name, seq) => events.find((e) => e.step === 'screen' && e.name === name && Number(e.seq ?? 0) > Number(seq ?? 0)) ?? null;
const markOf = (events, tag) => events.find((e) => e.step === 'sessions-before' && e.tag === tag) ?? null;
const markStart = (events, tag) => markOf(events, tag)?.markDoneAt ?? null;
const markEnd = (events, tag) => markOf(events, tag)?.markAt ?? null;
const linesNamed = (events, step) => events.filter((e) => e.step === step);
/**
 * The request records the relay tallied on `name` between two readings of
 * every name's records (`records` on each line, `recordsAt` and
 * `recordsAfter` on a mark), or null when either did not read it. A
 * Terminal's kept line carries its polls on ONE connection, so a window that
 * counts connections alone cannot see a Terminal left polling after a switch
 * (SPEC §11.2: "the relay should count no request on the old Mac's name").
 */
export const recordsBetween = (from, to, name) => {
  const a = from?.[name];
  const b = to?.[name];
  return typeof a === 'number' && typeof b === 'number' ? b - a : null;
};
const near = (a, b, tol = 0.5) => typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) <= tol;
/** How a session screen is titled: the navigation bar's identifier is its title, or a `session-title` (probe:p316's rule). */
export const titledWith = (dump, name) => el(dump, 'session-title')?.label === name || (dump?.elements ?? []).some((e) => e.id === name);
const onSessionPage = (dump) => has(dump, 'screen-session') || has(dump, 'screen-catch-up') || has(dump, 'screen-screen');

/** The session ids a Needs input dump draws as rows, in order. */
export function needsRowIds(dump) {
  const out = [];
  for (const e of dump?.elements ?? []) {
    const m = /^needs-row-(.+)$/.exec(String(e.id));
    if (m === null || /^(dot|name|machine|age|line)-/.test(m[1]) || out.includes(m[1])) continue;
    out.push(m[1]);
  }
  return out;
}
/** The session ids a Sessions dump draws as rows, in order. */
export function listRowIds(dump) {
  const out = [];
  for (const e of dump?.elements ?? []) {
    const m = /^row-(.+)$/.exec(String(e.id));
    if (m === null || /^(dot|name|machine|age|line|select|outcome)-/.test(m[1]) || out.includes(m[1])) continue;
    out.push(m[1]);
  }
  return out;
}
/** The Macs screen's rows, in order: each one's drawn name, its line, and whether it is ticked. */
export function macsRowsOf(dump) {
  const rows = [];
  for (let i = 0; i < 8; i += 1) {
    const name = el(dump, `macs-row-name-${String(i)}`);
    if (name === null && !has(dump, `macs-row-${String(i)}`)) break;
    rows.push({ i, name: name?.label ?? null, line: el(dump, `macs-row-line-${String(i)}`)?.label ?? null, chosen: has(dump, `macs-row-chosen-${String(i)}`) });
  }
  return rows;
}
/** The local waiting rows a door's `/v1/blocked` answers, by id. */
export const blockedIds = (answer) => (answer?.rows ?? []).filter((r) => r.machine === null || r.machine === undefined).map((r) => r.sessionId);
/** The rows a door's `/v1/sessions` answers, by id. */
export const sessionsIds = (answer) => (answer?.rows ?? []).map((r) => r.sessionId);
const sameSet = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length && [...a].sort().join('\n') === [...b].sort().join('\n');

/**
 * The tab bar's buttons, left to right, from a `tabs` reading: the tab bar's
 * own when it holds three or more, else the labelled buttons along the bottom
 * edge that share the Needs input button's row (iOS 26's glass bar).
 */
export function tabButtonsOf(tabs) {
  if (tabs === null || tabs === undefined || tabs.read === false) return null;
  const byX = (a, b) => (a.frame?.[0] ?? 0) - (b.frame?.[0] ?? 0);
  const inBar = (tabs.inBar ?? []).filter((b) => typeof b.label === 'string' && b.label !== '');
  if (inBar.length >= 3) return [...inBar].sort(byX);
  const bottom = tabs.bottom ?? [];
  const anchor = bottom.find((b) => b.label === WORDS.needsInput);
  if (anchor === undefined) return null;
  const mid = (b) => (b.frame?.[1] ?? 0) + (b.frame?.[3] ?? 0) / 2;
  return bottom.filter((b) => Math.abs(mid(b) - mid(anchor)) <= 16).sort(byX);
}
/**
 * The number a tab's badge carries, as XCUITest reports it, or null: its
 * value, its label with the tab's own name taken out first (a Mac's name
 * holds digits: `p345-laptop`), or a label inside it that is only a number.
 */
export function badgeNumber(badge) {
  if (badge === null || badge === undefined || badge.found === false) return null;
  const value = typeof badge.value === 'string' ? /(\d+)/.exec(badge.value) : null;
  if (value !== null) return Number(value[1]);
  const label = typeof badge.label === 'string' ? badge.label.split(String(badge.tab ?? '')).join(' ') : '';
  const fromLabel = /(?:^|\D)(\d+)(?:\D|$)/.exec(label);
  if (fromLabel !== null) return Number(fromLabel[1]);
  for (const text of Array.isArray(badge.inside) ? badge.inside : []) {
    const m = typeof text === 'string' ? /^\s*(\d+)\s*$/.exec(text) : null;
    if (m !== null) return Number(m[1]);
  }
  return null;
}
/** Whether a badge reading came from iOS 26 or later, whose tab bar gives XCUITest no badge number. */
export const glassBar = (badge) => Number(String(badge?.system ?? '').split('.')[0]) >= 26;

// ---------------------------------------------------------------------------
// One-Mac parity (P1): two dumps of one screen compared element by element
// ---------------------------------------------------------------------------

/**
 * Labels that move with the clock or the terminal's own output, and so are not
 * compared; and About's version line, whose build number moves on purpose
 * (SPEC D27: build 10, then this phase's).
 */
export const VOLATILE_LABEL = /(^|-)age(-|$)|(^|-)read$|^settings-mac-read$|^settings-version$|^screen-row-\d+$|^screen-history-|^screen-cursor$|^terminal-status$|^session-status$|^md-|^turn-/;
/** Frames that move with the terminal's own output, and so are not compared. */
export const VOLATILE_FRAME = /^screen-row-\d+$|^screen-history-|^screen-cursor$|^md-|^turn-/;
/**
 * Frames whose WIDTH moves with the clock (a row's age, `now` then `1m`),
 * drawn against the row's right edge: only that edge (x + width), y and
 * height are compared, never x and width (the ruled round: run 2 read a
 * `now` at x 361 w 25 and a `1m` at x 366.3 w 19.7, the same edge at 386).
 */
export const RIGHT_EDGE_FRAME = /(^|-)age(-|$)/;

/** Every id's elements, in order. */
function byId(dump) {
  const m = new Map();
  for (const e of dump?.elements ?? []) {
    if (!m.has(e.id)) m.set(e.id, []);
    m.get(e.id).push(e);
  }
  return m;
}
const frameEqual = (a, b, dy = 0) => Array.isArray(a) && Array.isArray(b) && near(a[0], b[0]) && near(a[1] + dy, b[1]) && near(a[2], b[2]) && near(a[3], b[3]);
/** RIGHT_EDGE_FRAME's rule: the right edge, y and height alone. */
const rightEdgeEqual = (a, b, dy = 0) => Array.isArray(a) && Array.isArray(b) && near(a[0] + a[2], b[0] + b[2]) && near(a[1] + dy, b[1]) && near(a[3], b[3]);

/**
 * The differences between the parent's dump and HEAD's of one screen: ids
 * one has and the other has not, a label that moved (unless the clock moves
 * it), and a frame that moved (shifted by `shift.dy` at or below `shift.fromY`,
 * for the ids `shift.applies` names; every id when it names none). An id
 * RIGHT_EDGE_FRAME names is compared by its right edge, y and height alone.
 * `allowNew` names HEAD ids the parent never had and need not have.
 */
export function screenDiff(parent, head, { shift = null, allowNew = () => false } = {}) {
  const out = [];
  if (parent === null || head === null) return ['a dump is missing'];
  if (!near(parent.window?.[0], head.window?.[0]) || !near(parent.window?.[1], head.window?.[1])) out.push(`the window is ${J(head.window)}, not ${J(parent.window)}`);
  const p = byId(parent);
  const h = byId(head);
  for (const [id, list] of p) {
    const got = h.get(id) ?? [];
    if (got.length !== list.length) {
      out.push(`${id} is drawn ${String(got.length)} time(s), not ${String(list.length)}`);
      continue;
    }
    list.forEach((e, k) => {
      const g = got[k];
      if (!VOLATILE_LABEL.test(id) && g.label !== e.label) out.push(`${id}'s label is ${J(g.label)}, not ${J(e.label)}`);
      if (VOLATILE_FRAME.test(id)) return;
      const dy = shift !== null && Array.isArray(e.frame) && e.frame[1] >= shift.fromY - 0.5 && (shift.applies === undefined || shift.applies(id)) ? shift.dy : 0;
      const same = RIGHT_EDGE_FRAME.test(id) ? rightEdgeEqual(e.frame, g.frame, dy) : frameEqual(e.frame, g.frame, dy);
      if (!same) out.push(`${id}'s frame is ${J(g.frame)}, not ${J(e.frame)}${dy === 0 ? '' : ` moved ${String(dy)} pt`}${RIGHT_EDGE_FRAME.test(id) ? ' (its right edge, y and height)' : ''}`);
    });
  }
  for (const id of h.keys()) if (!p.has(id) && !allowNew(id)) out.push(`${id} is new`);
  return out;
}

// ---------------------------------------------------------------------------
// Readers: what each arm grades, picked out of ONE drive's lines (pure)
// ---------------------------------------------------------------------------
//
// The run hands each its drive's events and the live relay; the self-test hands
// recorded lines and a relay rebuilt from a recorded log (build/p345/fixtures).
// A reading taken AFTER a named line is looked for after that line alone, so a
// drive that stopped short reads as nothing (UNREADABLE), never as an earlier
// dump of the same name standing in for the one that never came.

/** The first `macs` step after line `from`: its dump when the tab was found, whether it was, and the label it was pressed by. */
export function readMacsStep(events, from = 0) {
  const line = lineOf(events, 'macs', Number(from ?? 0));
  return { macs: line?.found === true ? dumpAfter(events, 'macs', line.seq) : null, macsFound: line === null ? null : line.found === true, macsLabel: line?.label ?? null };
}

/** T2's readings: the Macs on launch, each Mac's lists beside its door, and the relay's two windows by connection AND by request record. */
export function readT2(events, relay) {
  const chooses = dumpsNamed(events, 'choose-mac');
  const tabsSessions = dumpsNamed(events, 'tab-sessions');
  const at = (t) => markStart(events, t);
  const until = (t) => markEnd(events, t);
  return {
    ...readMacsStep(events),
    chooseB: { dump: chooses[0] ?? null, doorIds: chooses[0]?.doors?.B?.blocked ?? null },
    sessionsB: { dump: tabsSessions[0] ?? null, doorIds: tabsSessions[0]?.doors?.B?.sessions ?? null },
    chooseA: { dump: chooses[1] ?? null, doorIds: chooses[1]?.doors?.A?.blocked ?? null },
    placeA: tabsSessions[1] ?? null,
    bWhileA: at('t2-a') === null || until('t2-a-end') === null ? null : relay.between(B_NAME, at('t2-a'), until('t2-a-end')),
    aWhileB: at('t2-b') === null || until('t2-b-end') === null ? null : relay.between(A_NAME, at('t2-b'), until('t2-b-end')),
    bRecordsWhileA: recordsBetween(markOf(events, 't2-a')?.recordsAfter, markOf(events, 't2-a-end')?.recordsAt, B_NAME),
    aRecordsWhileB: recordsBetween(markOf(events, 't2-b')?.recordsAfter, markOf(events, 't2-b-end')?.recordsAt, A_NAME)
  };
}

/** AL2's readings, every one AFTER the alert's own dump: the Macs then, by the sender's name, and the other Mac's Sessions once chosen again. */
export function readAL2(events) {
  const dump = lastDump(events, 'alert');
  const after = dump === null ? { macs: null, macsFound: null, macsLabel: null } : readMacsStep(events, dump.seq);
  return { dump, chosenAfter: after.macs, chosenAfterFound: after.macsFound, chosenAfterLabel: after.macsLabel, otherPlace: dump === null ? null : dumpAfter(events, 'tab-sessions', dump.seq) };
}

/** S2's readings: the return, the Mac on screen's dial in the bound, the silent Mac held, and the Macs read AFTER the idle alone. */
export function readS2(events, relay) {
  const banner = lineOf(events, 'banner');
  const drawn = lastDump(events, 'no-banner');
  const from = markStart(events, 's2hold');
  const idleEnd = lineOf(events, 'idle-end');
  const macs = idleEnd === null ? null : dumpAfter(events, 'macs', idleEnd.seq);
  return {
    drawn,
    aRows: drawn?.doors?.A?.blocked ?? null,
    drawnMs: banner === null || drawn === null ? null : drawn.receivedAt - banner.receivedAt,
    aDialled: banner === null ? null : relay.between(A_NAME, banner.receivedAt - RETURN_SLACK_MS, banner.receivedAt + FOREGROUND_DRAWN_MS),
    held: from === null ? null : relay.between(B_NAME, from, macs?.receivedAt ?? Infinity),
    macs
  };
}

/** DG's readings: the parent's relaunch and Settings, then this build's Macs after ITS relaunch. */
export function readDG(events) {
  const relaunches = dumpsNamed(events, 'relaunch-keep');
  const parent = relaunches[0] ?? null;
  const head = relaunches.length >= 2 ? readMacsStep(events, relaunches[1].seq) : { macs: null, macsFound: null };
  return { parent, aRows: parent?.doors?.A?.blocked ?? null, parentSettings: parent === null ? null : dumpAfter(events, 'settings', parent.seq), head: head.macs, headFound: head.macsFound };
}

/** RM's readings: the list after the Remove, and A's Needs input from the SECOND choose (the first is B's, before the Remove). */
export function readRM(events) {
  const chooses = dumpsNamed(events, 'choose-mac');
  return { fail: lastDump(events, 'setup-failure-rm'), aAfter: chooses[1] ?? null, aRows: chooses[1]?.doors?.A?.blocked ?? null };
}

/** UP's readings: where Unpair landed, the idle, the Macs after the FIRST relaunch, and the bar and Settings after the SECOND alone. */
export function readUP(events, relay) {
  const landed = lineOf(events, 'unpair-landed');
  const unpaired = dumpsNamed(events, 'unpair-one')[0] ?? null;
  const idleStart = lineOf(events, 'idle-start');
  const idleEnd = lineOf(events, 'idle-end');
  const relaunches = dumpsNamed(events, 'relaunch-keep');
  const first = relaunches[0] ?? null;
  const afterRelaunch = first === null ? null : lineOf(events, 'macs', Number(first.seq));
  const last = relaunches.length >= 2 ? relaunches[1] : null;
  const finalLine = last === null ? null : lineOf(events, 'macs', Number(last.seq));
  return {
    landed,
    unpaired,
    aRows: unpaired?.doors?.A?.blocked ?? null,
    idleDialled: idleStart === null || idleEnd === null ? null : relay.between(B_NAME, idleStart.receivedAt, idleEnd.receivedAt),
    idleMs: idleStart === null || idleEnd === null ? 0 : idleEnd.receivedAt - idleStart.receivedAt,
    relaunch: afterRelaunch?.found === true ? dumpAfter(events, 'macs', afterRelaunch.seq) : null,
    relaunchAbsent: afterRelaunch?.found === false,
    finalFound: finalLine === null ? null : finalLine.found === true,
    finalTabs: finalLine?.tabs ?? null,
    finalSettings: last === null ? null : dumpAfter(events, 'settings', last.seq)
  };
}

/**
 * The dumps a drive wrote where a step's screen never came (`<step>-missing`):
 * the UI test stops there, so nothing after it was read.
 */
export const stuckOf = (events) => (events ?? []).filter((e) => e.step === 'screen' && /-missing$/.test(String(e.name))).map((e) => e.name);

/**
 * CAP's first drive, read (the ruled round). The twin is a node door that
 * allows at once, so it can pair and close its sheet between two of the UI
 * test's polls: the drive then stops at `pair-another-missing` right after
 * C's closed line while the app KEPT the twin (both reverify runs that failed
 * CAP, 2026-10-15). `twinPairs` is the twin door's own log of `POST /pair`.
 * When C's sheet closed, the drive stopped at the next sheet and the twin
 * answered a `POST /pair` with 200, the twin is counted as kept from that
 * log and D's and C2's steps are owed a drive of their own (`resume`), whose
 * readings the Macs at four then check. Any other stop is `stuck`, and CAP
 * reads UNREADABLE, never FAIL.
 */
export function capFirstDrive(events, twinPairs) {
  const lines = linesNamed(events ?? [], 'pair-another');
  const c = lines[0] ?? null;
  const missed = lines.length === 1 && c?.closed === true && dumpAfter(events, 'pair-another-missing', c.seq) !== null;
  const allowed = (twinPairs ?? []).filter((e) => e?.status === 200).length;
  if (missed && allowed > 0) {
    const twin = { closed: true, line: null, again: false, fromLog: `its sheet closed between two polls; counted from its own ${String(allowed)} POST /pair 200` };
    return { resume: true, lines: [c, twin], stuck: [] };
  }
  return { resume: false, lines, stuck: stuckOf(events) };
}

/** CAP's lines and stops: the first drive's, then (when it was resumed) the rest drive's after them. */
export function capLines(first, restEvents = null) {
  if (!first.resume || restEvents === null) return { lines: first.lines, stuck: first.resume ? ['cap-rest never ran'] : first.stuck };
  return { lines: [...first.lines, ...linesNamed(restEvents, 'pair-another')], stuck: stuckOf(restEvents) };
}

/**
 * The arms each device grades, as the header lists them: 26.3 and 18.3 grade
 * U0, P1, T1, T2 and UP; 26.3 alone grades the rest.
 */
export const DEVICE_ARMS = Object.freeze({ order: ['U0', 'P1', 'AL1', 'T1', 'T2', 'T3', 'AL2', 'S1', 'S2', 'CAP', 'H', 'HN', 'DG', 'RM', 'RP', 'UP'], floor: ['U0', 'P1', 'T1', 'T2', 'UP'] });
/**
 * The arms a run asked for (`devices` and `arms`, Sets) and never graded on a
 * device (`graded`: device key to the Set of arm ids it gave a verdict), each
 * `{ key, id }`. A device that threw, or never started, leaves its arms here,
 * and each reads UNREADABLE: an arm that was never graded is never a pass.
 */
export function ungradedArms(devices, arms, graded) {
  const out = [];
  for (const key of ['order', 'floor']) {
    if (!devices.has(key)) continue;
    for (const id of DEVICE_ARMS[key]) if (arms.has(id) && !(graded[key]?.has(id) ?? false)) out.push({ key, id });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Verdicts
// ---------------------------------------------------------------------------

/** One verdict: `ok` true, false, or null for UNREADABLE (exit 2, never a pass). */
const verdict = (ok, said) => ({ ok, said });
/** Problems first (a FAIL), then what could not be read (UNREADABLE), then the pass. */
const decide = (problems, unreadable, green) =>
  problems.length > 0 ? verdict(false, problems.join('; ')) : unreadable.length > 0 ? verdict(null, unreadable.join('; ')) : verdict(true, green);

/** U0: the parent paired A; its app upgraded in place keeps the pairing, reads on, and makes no second phone. */
export function gradeU0(r) {
  const p = [];
  const u = [];
  if (r.paired === null) u.push('the parent\'s drive printed no "pair-end" dump');
  else if (!has(r.paired, 'screen-needs-input')) u.push('the parent never paired A, so there was nothing to upgrade');
  if (!Array.isArray(r.install) || r.install.length === 0) u.push('HEAD\'s app was never installed over the parent\'s');
  else if (r.install.some((i) => i.code !== 0)) u.push(`installing HEAD's app over the parent's exited ${J(r.install.map((i) => i.code))}`);
  if (r.relaunch === null) u.push('no "relaunch-keep" dump after the upgrade');
  else {
    if (has(r.relaunch, 'screen-pairing')) p.push('the upgraded app drew Pairing: the pairing was not kept');
    else if (!has(r.relaunch, 'screen-needs-input')) p.push('the upgraded app drew no Needs input');
  }
  if (r.readsAfter === null) u.push('the relay was not counted after the upgrade');
  else if (r.readsAfter === 0) p.push('A was not dialled once after the upgrade: its reads did not carry on');
  if (r.phonesBefore === null || r.phonesAfter === null) u.push('A\'s phones could not be read around the upgrade');
  else if (!sameSet(r.phonesBefore, r.phonesAfter)) p.push(`A listed ${String(r.phonesBefore.length)} phone(s) before the upgrade and ${String(r.phonesAfter.length)} after: a second phone appeared`);
  return decide(p, u, `the parent paired A; HEAD installed over it relaunched onto Needs input with no Pairing; ${String(r.readsAfter)} connection(s) to A after the upgrade; A lists the same ${String(r.phonesAfter?.length ?? 0)} phone(s)`);
}

/**
 * Settings' one row, as P1 and UP compare it: Settings' OWN content
 * (`settings-` ids) at or below the row moves down by the row and its gap; the
 * tab bar's buttons and the system's overlay are fixed to the window and do
 * not (the fix round: the first live run read the bar moved and failed P1 on
 * both runtimes while the app was right).
 */
export const settingsShift = (row) => ({
  shift: { fromY: row.frame[1], dy: SETTINGS_SHIFT_PT, applies: (id) => id.startsWith('settings-') },
  allowNew: (id) => id.startsWith('settings-pair-another')
});

/**
 * WHAT LATER PHASES CHANGED ON PURPOSE on the screens P1 holds to build 10,
 * by id (build/p348/SPEC.md §6, items 4 and 5): each is skipped on both sides
 * and named in P1's verdict, never read as a difference. Phase 346's "+"
 * (`start-open`); Phase 348's tab roots, whose titles are the iPhone's own bar
 * (D15) with Select, the filter and the "+" in it (D16; his ruling of
 * 2026-10-20 put the "+" back there after the fix round had moved it to the
 * list's first line); and the age note gone from every list's foot (item 4),
 * which moves the foot's read line up.
 */
export const P1_STATED = Object.freeze({
  needs: Object.freeze({
    'needs-input-title': 'Phase 348 (D15): the title is the iPhone\'s own bar',
    'needs-list-age-note': 'Phase 348 (item 4): no age note',
    'needs-list-read': 'Phase 348 (item 4): the foot\'s read line moves up with the note gone'
  }),
  sessions: Object.freeze({
    'list-title': 'Phase 348 (D15): the title is the iPhone\'s own bar',
    'list-select': 'Phase 348 (D16): Select in the bar',
    'list-menu': 'Phase 348 (D16): the filter in the bar',
    'start-open': 'Phase 346\'s "+", alone at the bar\'s trailing edge since Phase 348 (D16; his ruling of 2026-10-20)',
    'list-age-note': 'Phase 348 (item 4): no age note',
    'list-read': 'Phase 348 (item 4): the foot\'s read line moves up with the note gone'
  })
});
/**
 * Where each list's content starts under its bar (Phase 348, D15): everything
 * at or below build 10's title moves by ONE amount, read off the first element
 * both builds draw under it (`pivot`), so a row that moved anything else is
 * still a difference.
 */
const P1_PIVOTS = Object.freeze({
  needs: { title: 'needs-input-title', pivot: (d) => [...(d?.elements ?? [])].filter((e) => /^needs-row-/.test(String(e.id)) && !/^needs-row-(?:dot|name|machine|age|line)-/.test(String(e.id))).sort((x, y) => (x.frame?.[1] ?? 0) - (y.frame?.[1] ?? 0))[0]?.id ?? null },
  sessions: { title: 'list-title', pivot: () => 'list-show' }
});
/**
 * THE PROBE REVIEW (Phase 348, rule 9): the most the one shift under the bar
 * may be. The large title costs the list 74.5 to 74.67 pt on iOS 26.3 and
 * 55 pt on 18.3 (build/p348/SPEC.md §2.5, read (4)); a shift taken out with
 * no bound read ANY uniform move as "what Phase 348 moved", content pushed
 * far down or drawn up under the bar among it. (The fix round's first-line
 * "+" took it to 96; his ruling of 2026-10-20 put the "+" back in the bar, and
 * the review's 80 with it.)
 */
export const P1_SHIFT_MAX = 80;
/** The shells a `shell` session may run: the system's, and the login shell this probe was given. */
const SYSTEM_SHELLS_345 = new Set(['/bin/zsh', '/bin/bash', '/bin/sh', (process.env['SHELL'] ?? '').trim()].filter((x) => x !== ''));
/**
 * THE PROBE REVIEW (Phase 348, rule 9; probe:p313's and probe:p348's RUN
 * clause), pure: `manifest` is build/scratch-login.mjs `manifestSessions`'
 * answer, read once the apps are gone. A shell row runs a system shell (or
 * names none); every other row ran an agent, whose argv[0] must be under
 * `run`. A manifest not read is UNREADABLE, never a pass. `{ ok, said, reading }`.
 */
export function manifestProgramsVerdict({ manifest, run, shells = SYSTEM_SHELLS_345 }) {
  if (manifest?.read !== true) return { ok: null, said: `the manifest could not be read after the app was gone (${String(manifest?.why ?? 'no reading')})`, reading: { read: false } };
  const agents = manifest.rows.filter((r) => r.agent !== 'shell');
  const outside = agents.filter((r) => !within(run, r.argv0));
  const oddShells = manifest.rows.filter((r) => r.agent === 'shell' && r.argv0 !== null && !shells.has(r.argv0));
  const said = `${String(manifest.rows.length)} row(s), ${String(agents.length)} agent row(s), ${outside.length === 0 ? 'every one this run\'s stand-in' : `${String(outside.length)} OUTSIDE the run: ${J(outside)}`}; ${oddShells.length === 0 ? 'every shell row a system shell' : `${String(oddShells.length)} shell row(s) not a system shell: ${J(oddShells)}`}`;
  return { ok: outside.length === 0 && oddShells.length === 0, said, reading: { read: true, rows: manifest.rows.length, agents: agents.map((r) => ({ name: r.name, agent: r.agent, argv0: r.argv0 })), outside, oddShells } };
}

/** The one shift under the bar for `key`'s screen, from build 10's dump to HEAD's, or null when none is read or none is needed. */
export function p1ShiftOf(key, parent, head) {
  const at = P1_PIVOTS[key];
  if (at === undefined) return null;
  const title = el(parent, at.title);
  const id = at.pivot(parent);
  const from = id === null ? null : el(parent, id);
  const to = id === null ? null : el(head, id);
  if (title === null || from === null || to === null || !Array.isArray(title.frame) || !Array.isArray(from.frame) || !Array.isArray(to.frame)) return null;
  const dy = to.frame[1] - from.frame[1];
  return dy === 0 ? null : { fromY: title.frame[1] + title.frame[3], dy };
}

/**
 * P1: with one Mac kept, every screen as build 10 draws it but what later
 * phases changed on purpose (P1_STATED, and one shift under the bar), and
 * nothing else on the relay. SETTINGS IS SUPERSEDED for P1 (Phase 348, item
 * 3, build/p348/SPEC.md §6): Settings is grouped as the iPhone's own Settings
 * now, every row in today's order and at least today's height, which
 * probe:p316's S6, SE4, SA12 and SC1 read, so its dumps are printed here and
 * not compared with build 10's.
 */
export function gradeP1(r) {
  const p = [];
  const u = [];
  const stated = [];
  for (const key of ['needs', 'sessions', 'terminal', 'catchUp']) {
    const a = r.before?.[key] ?? null;
    const b = r.after?.[key] ?? null;
    if (a === null || b === null) {
      u.push(`no ${key} dump ${a === null ? 'from the parent' : 'from HEAD'}`);
      continue;
    }
    const named = P1_STATED[key] ?? {};
    for (const id of Object.keys(named)) if (!stated.includes(id) && [a, b].some((x) => has(x, id))) stated.push(id);
    const skip = (x) => ({ ...x, elements: (x.elements ?? []).filter((e) => !Object.hasOwn(named, e.id)) });
    const shift = p1ShiftOf(key, a, b);
    // THE PROBE REVIEW: the shift is the large title's cost, down and at most P1_SHIFT_MAX, or it is a difference.
    if (shift !== null && !(shift.dy > 0 && shift.dy <= P1_SHIFT_MAX)) p.push(`${key}: everything under the bar moved ${String(shift.dy)} pt, outside the large title's cost (above 0, at most ${String(P1_SHIFT_MAX)})`);
    const d = screenDiff(skip(a), skip(b), { shift });
    if (d.length > 0) p.push(`${key}: ${d.slice(0, 4).join(', ')}${d.length > 4 ? ` and ${String(d.length - 4)} more` : ''}`);
  }
  const tabs = tabButtonsOf(r.tabs);
  if (tabs === null) u.push('HEAD\'s tab bar was not read with one Mac kept');
  else if (J(tabs.map((t) => t.label)) !== J([WORDS.needsInput, WORDS.sessions, WORDS.settings])) p.push(`with one Mac the bar holds ${J(tabs.map((t) => t.label))}, not the three tabs`);
  if (r.macsDrawn === true) p.push('a Macs screen was drawn with one Mac kept');
  if (r.otherNames === null) u.push('the relay was not read');
  else if (r.otherNames > 0) p.push(`${String(r.otherNames)} connection(s) named a door that is not A`);
  return decide(p, u, `Needs input, Sessions, the Terminal and Catch Me Up equal to build 10's element by element (ages and the terminal's rows aside), but what later phases changed on purpose (${stated.length === 0 ? 'none drawn' : stated.join(', ')}) and one shift under the bar; Settings superseded by Phase 348's grouped Settings (probe:p316's S6, SE4, SA12, SC1); three tabs; no Macs screen; no connection to any other door`);
}

/** AL1, AL2: an alert's tap opens the session it names, on the Mac that sent it. */
export function gradeAlertOpens(r) {
  const p = [];
  const u = [];
  if (r.mainBlocked !== true) u.push(`main never read ${String(r.name)} blocked`);
  if (r.delivered === null) u.push('no body was delivered (the stand-in recorded no send for the phone)');
  else if (r.delivered.code !== 0) u.push(`the delivery exited ${String(r.delivered.code)}`);
  if (r.banner === null) u.push('no banner was found to tap');
  if (r.dump === null) u.push('no dump after the tap');
  else if (!onSessionPage(r.dump)) p.push('the tap drew no session');
  else if (!titledWith(r.dump, r.name)) p.push(`the session drawn is not ${String(r.name)}`);
  if (r.chosenAfter !== undefined) {
    const rows = macsRowsOf(r.chosenAfter);
    // The Macs tab is pressed by the SENDER's drawn name: no such tab is the
    // sender not on screen (or no Macs tab with two Macs kept), which is an
    // answer, never a reading that did not come.
    if (r.chosenAfterFound === false) p.push(`after the tap no Macs tab is named ${J(r.chosenAfterLabel ?? null)}: the Mac that sent is not on screen`);
    else if (r.chosenAfter === null || rows.length === 0) u.push('the Macs screen was not read after the tap');
    else if (!rows[r.senderIndex]?.chosen) p.push(`the Mac ticked after the tap is ${J(rows.find((x) => x.chosen)?.name ?? null)}, not the one that sent`);
  }
  if (r.otherPlace !== undefined) {
    if (r.otherPlace === null) u.push('the other Mac\'s Sessions were not read after');
    else if (!onSessionPage(r.otherPlace)) p.push('the other Mac\'s Sessions lost the session it had open: its paths moved');
  }
  return decide(p, u, `the alert for ${String(r.name)} was delivered and tapped, and the tap opened ${String(r.name)}${r.chosenAfter === undefined ? '' : ' on the Mac that sent it, which is now ticked'}${r.otherPlace === undefined ? '' : ', the other Mac\'s place kept'}`);
}

/** T1: a second Mac paired from the sheet: its fingerprint, its Sessions, then its Needs input by a tab press (Phase 348, D1), four tabs, and (18.3) both badges. */
export function gradeT1(r) {
  const p = [];
  const u = [];
  if (r.drawn === null) u.push('the sheet printed no fingerprint');
  else if (r.macFingerprint === null) u.push('the Mac\'s sheet was never read');
  else if (fingerprintDigits(r.drawn) !== fingerprintDigits(r.macFingerprint) || fingerprintDigits(r.drawn).length !== 24) p.push('the fingerprint the phone drew is not the Mac\'s');
  // Allow is pressed only once the two fingerprints matched. A sheet that never
  // drew one is already read above (UNREADABLE, or a FAIL by its line); matched
  // and not taken is the Mac failing its part, never the phone's.
  const matched = r.drawn !== null && r.macFingerprint !== null && fingerprintDigits(r.drawn) === fingerprintDigits(r.macFingerprint) && fingerprintDigits(r.drawn).length === 24;
  if (matched && r.allowed !== true) {
    // A sheet left waiting for an Allow the Mac never took did nothing wrong.
    u.push('the fingerprints matched and the Mac did not take Allow, so nothing the phone drew after it can be judged');
    return decide(p, u, '');
  }
  // Phase 348 (D1): the sheet closes onto the second Mac's SESSIONS (`landed`,
  // its own dump), and its Needs input is read after an explicit tab press
  // (`end`, the `tab-needs` dump, beside the doors).
  if (r.line === null || r.landed === null || r.landed === undefined) u.push('no "pair-another" line or dump');
  else {
    if (r.line.closed !== true) p.push(`the sheet did not close (its line: ${J(r.line.line)})`);
    if (!has(r.landed, 'screen-list')) p.push(`the sheet did not close onto that Mac's Sessions (it drew ${J((r.landed.elements ?? []).find((e) => String(e.id).startsWith('screen-'))?.id ?? null)})`);
    if (r.end === null || r.end === undefined) u.push('the second Mac\'s Needs input was not read after the tab press');
    else if (!has(r.end, 'screen-needs-input')) p.push('the tab press drew no Needs input');
    else if (r.doorRows === null) u.push('the second Mac\'s door was not read');
    else if (!sameSet(needsRowIds(r.end), r.doorRows)) p.push(`Needs input draws ${J(needsRowIds(r.end))}, the second Mac's door answers ${J(r.doorRows)}`);
  }
  const tabs = tabButtonsOf(r.tabs);
  if (tabs === null) u.push('the tab bar was not read');
  else if (J(tabs.map((t) => t.label)) !== J([WORDS.needsInput, WORDS.sessions, WORDS.settings, r.label])) p.push(`the bar holds ${J(tabs.map((t) => t.label))}, not the three tabs and ${J(r.label)}`);
  let badges = 'badges not graded on this runtime';
  if (r.readBadges === true) {
    if (r.needsBadge === null || r.macsBadge === null) u.push('the badges were not read');
    else if (glassBar(r.needsBadge)) u.push('the badges were read on iOS 26, whose bar gives XCUITest no number');
    else {
      const n = badgeNumber(r.needsBadge);
      const m = badgeNumber(r.macsBadge);
      if (n !== r.expectNeeds) p.push(`Needs input's badge reads ${J(n)}, not ${String(r.expectNeeds)}`);
      if (m !== r.expectMacs) p.push(`the Macs tab's badge reads ${J(m)}, not ${String(r.expectMacs)}`);
      badges = `Needs input's badge ${String(n)}, the Macs tab's ${String(m)}`;
    }
  }
  return decide(p, u, `the sheet's fingerprint was the Mac's; Allow pressed; the sheet closed onto the second Mac's Sessions, and its Needs input (pressed) drew ${String(r.doorRows?.length ?? 0)} row(s), the door's; four tabs, the fourth ${J(r.label)}; ${badges}`);
}

/** T2: one tap switches the whole app; each Mac's lists are that Mac's, its key its own, its place kept, and nothing reads the Mac not on screen. */
export function gradeT2(r) {
  const p = [];
  const u = [];
  const rows = macsRowsOf(r.macs);
  if (r.macsFound === false) p.push(`with two Macs kept no Macs tab is named ${J(r.macsLabel ?? null)}, the first Mac's, on a launch`);
  else if (r.macs === null) u.push('the Macs screen was not read');
  else {
    if (rows.length !== r.expectRows.length) p.push(`the Macs screen draws ${String(rows.length)} row(s), not ${String(r.expectRows.length)}`);
    r.expectRows.forEach((want, i) => {
      const got = rows[i];
      if (got === undefined) return;
      if (got.name !== want.name) p.push(`row ${String(i)} is named ${J(got.name)}, not ${J(want.name)}`);
      if (got.line !== want.line) p.push(`row ${String(i)} says ${J(got.line)}, not ${J(want.line)}`);
      if (got.chosen !== (i === r.chosenIndex)) p.push(`row ${String(i)} is ${got.chosen ? '' : 'not '}ticked`);
    });
  }
  for (const [label, dump, door, ids] of [
    ['the second Mac\'s Needs input', r.chooseB?.dump ?? null, r.chooseB?.doorIds ?? null, needsRowIds],
    ['the second Mac\'s Sessions', r.sessionsB?.dump ?? null, r.sessionsB?.doorIds ?? null, listRowIds],
    ['the first Mac\'s Needs input', r.chooseA?.dump ?? null, r.chooseA?.doorIds ?? null, needsRowIds]
  ]) {
    if (dump === null || door === null) u.push(`${label} was not read beside its door`);
    else if (!sameSet(ids(dump), door)) p.push(`${label} draws ${J(ids(dump))}, its door answers ${J(door)}`);
  }
  if (r.placeA === null) u.push('the first Mac\'s Sessions were not read on the way back');
  else if (!onSessionPage(r.placeA)) p.push('back on the first Mac, its Sessions did not keep the Terminal it had open');
  if (r.keyA === null) u.push('the first Mac\'s pane was not read after the key');
  else if (r.keyA !== true) p.push('the key did not reach the first Mac\'s pane');
  if (r.keyB === true) p.push('the key reached the second Mac\'s pane');
  if (r.bWhileA === null || r.aWhileB === null) u.push('the relay was not counted between the marks');
  else {
    if (r.bWhileA > 0) p.push(`${String(r.bWhileA)} connection(s) to the second Mac while the first was chosen and no Macs tab appeared`);
    if (r.aWhileB > 0) p.push(`${String(r.aWhileB)} connection(s) to the first Mac after the switch away from it (a Terminal's lines left open)`);
  }
  if (r.bRecordsWhileA == null || r.aRecordsWhileB == null) u.push('the relay\'s request records were not read at the marks');
  else {
    if (r.bRecordsWhileA > 0) p.push(`${String(r.bRecordsWhileA)} request record(s) to the second Mac while the first was chosen`);
    if (r.aRecordsWhileB > 0) p.push(`${String(r.aRecordsWhileB)} request record(s) to the first Mac after the switch away from it, on a line it kept (a Terminal left polling)`);
  }
  return decide(p, u, `the Macs rows in order with each one's waiting count and the tick on the Mac on screen; each Mac's Needs input and Sessions are its own door's answers; the key reached the first Mac's pane alone; nothing dialled the Mac not on screen between the marks; back on the first Mac its Terminal was still open`);
}

/** T3: Settings shows the Mac on screen: its name, address, fingerprint, its Alerts card only where it sends, and Pair another Mac. */
export function gradeT3(r) {
  const p = [];
  const u = [];
  for (const side of ['a', 'b']) {
    const d = r[side];
    const want = r.want[side];
    if (d === null) {
      u.push(`no Settings dump for ${want.name}`);
      continue;
    }
    if (el(d, 'settings-mac-name')?.label !== want.drawn) p.push(`${want.name}: the card names ${J(el(d, 'settings-mac-name')?.label ?? null)}, not ${J(want.drawn)}`);
    if (!String(el(d, 'settings-mac-address')?.label ?? '').startsWith(`${want.name}:`)) p.push(`${want.name}: the address reads ${J(el(d, 'settings-mac-address')?.label ?? null)}`);
    if (want.fingerprint === null) u.push(`${want.name}'s pairing fingerprint was never read`);
    else if (fingerprintDigits(el(d, 'settings-fingerprint')?.label) !== fingerprintDigits(want.fingerprint)) p.push(`${want.name}: the fingerprint is not the one its pairing drew`);
    if (has(d, 'settings-alerts') !== want.alerts) p.push(`${want.name}: the Alerts card is ${want.alerts ? 'missing' : 'drawn'}`);
    if (!has(d, 'settings-pair-another')) p.push(`${want.name}: no Pair another Mac`);
  }
  // D16: Pair another Mac opens the sheet over the lists, says this iPhone is
  // not paired with THIS Mac, offers no See a sample, and its Cancel changes nothing.
  if (r.sheet === null || r.afterCancel === null) u.push('Pair another Mac\'s sheet was not read');
  else {
    if (!has(r.sheet, 'pair-another-sheet') || !has(r.sheet, 'pair-another-cancel')) p.push('Pair another Mac opened no sheet with a Cancel');
    if (el(r.sheet, 'pairing-line')?.label !== WORDS.notPairedHere) p.push(`the sheet's line is ${J(el(r.sheet, 'pairing-line')?.label ?? null)}, not ${J(WORDS.notPairedHere)}`);
    if (has(r.sheet, 'pairing-see-sample')) p.push('the sheet offers See a sample');
    if (has(r.afterCancel, 'pair-another-sheet')) p.push('Cancel left the sheet up');
    else if (r.b !== null && el(r.afterCancel, 'settings-mac-name')?.label !== el(r.b, 'settings-mac-name')?.label) p.push('after Cancel Settings shows another Mac');
  }
  return decide(p, u, `each Mac's Settings names it, its address and the fingerprint its pairing drew; the Alerts card only for the Mac that sends; Pair another Mac on both, its sheet saying ${J(WORDS.notPairedHere)} with no See a sample, and Cancel changing nothing`);
}

/** S1: a Mac whose door is off blanks itself alone, says why, and draws again once it is back. */
export function gradeS1(r) {
  const p = [];
  const u = [];
  if (r.fail === null) u.push('no dump of the list with the door off');
  else {
    if (has(r.fail, 'screen-pairing')) p.push('a door off drew Pairing');
    const f = el(r.fail, 'list-failure') ?? el(r.fail, 'needs-list-failure');
    if (f?.label !== WORDS.cannotReachMac) p.push(`the list says ${J(f?.label ?? null)}, not ${J(WORDS.cannotReachMac)}`);
    if (!String(el(r.fail, `${f?.id ?? 'list-failure'}-note`)?.label ?? '').length) p.push('the failure has no note under it');
  }
  const off = macsRowsOf(r.macsOff);
  const on = macsRowsOf(r.macsOn);
  const row = (rows, name) => rows.find((x) => x.name === name) ?? null;
  if (r.macsOff === null) u.push('the Macs screen was not read with the door off');
  else {
    if (row(off, r.bDrawn)?.line !== WORDS.cannotReachMac) p.push(`with the door off its Macs row says ${J(row(off, r.bDrawn)?.line ?? null)}`);
    if (row(off, r.aDrawn)?.line !== needsYourInput(r.aWaiting)) p.push(`the other Mac's row says ${J(row(off, r.aDrawn)?.line ?? null)}, not ${J(needsYourInput(r.aWaiting))}`);
  }
  if (r.macsOn === null) u.push('the Macs screen was not read with the door on again');
  else if (row(on, r.bDrawn)?.line !== needsYourInput(r.bWaiting)) p.push(`with the door on again its row says ${J(row(on, r.bDrawn)?.line ?? null)}, not ${J(needsYourInput(r.bWaiting))}`);
  if (r.pulled === null) u.push('the list was not read after the door came back');
  else if (has(r.pulled, 'list-failure') || listRowIds(r.pulled).length === 0) p.push('the list did not draw again once the door was back');
  return decide(p, u, `the door off: its list said ${J(WORDS.cannotReachMac)} with its note and its Macs row the same; the other Mac read on; the door on: it drew again`);
}

/** S2: a Mac that never answers holds nothing up: the Mac on screen draws at once, and the silent one says so after 15 s. */
export function gradeS2(r) {
  const p = [];
  const u = [];
  if (r.drawn === null) u.push('no dump after the return to the foreground');
  else {
    if (!has(r.drawn, 'screen-needs-input')) p.push('the return drew no Needs input');
    else if (r.aRows === null) u.push('the Mac on screen\'s door was not read beside the return');
    else if (!sameSet(needsRowIds(r.drawn), r.aRows)) p.push(`the Mac on screen draws ${J(needsRowIds(r.drawn))}, its door answers ${J(r.aRows)}`);
    if (r.drawnMs === null) u.push('the return was not timed');
    else if (r.drawnMs > FOREGROUND_DRAWN_MS) p.push(`the Mac on screen was drawn ${String(r.drawnMs)} ms after the return, over ${String(FOREGROUND_DRAWN_MS)}`);
  }
  // The Needs input drawn after a return is the list drawn before it until its
  // read answers, so the rows and the time alone pass an app that waits on the
  // silent Mac: the Mac on screen's own read must reach its door in the bound.
  if (r.aDialled == null) u.push('the Mac on screen was not counted at the relay after the return');
  else if (r.aDialled === 0) p.push(`the Mac on screen was not dialled within ${String(FOREGROUND_DRAWN_MS)} ms of the return: its read waited`);
  if (r.held === null || r.held === 0) u.push('the silent Mac was never dialled, so nothing waited on it');
  const row = (name) => macsRowsOf(r.macs).find((x) => x.name === name) ?? null;
  if (r.macs === null) u.push('the Macs screen was not read after 15 s');
  else {
    if (row(r.bDrawn)?.line !== WORDS.macDidNotAnswer) p.push(`after 15 s the silent Mac's row says ${J(row(r.bDrawn)?.line ?? null)}, not ${J(WORDS.macDidNotAnswer)}`);
    if (row(r.aDrawn)?.line !== needsYourInput(r.aWaiting)) p.push(`the Mac on screen's row says ${J(row(r.aDrawn)?.line ?? null)}`);
  }
  return decide(p, u, `the Mac on screen drawn ${String(r.drawnMs)} ms after the return while ${String(r.held)} connection(s) to the silent Mac were held; after 15 s its row said ${J(WORDS.macDidNotAnswer)}`);
}

/** CAP: four Macs, a fifth refused at the code with nothing presented, and a kept Mac re-paired at four. */
export function gradeCap(r) {
  // A drive that stopped short read nothing after its stop: UNREADABLE, never
  // a FAIL by the readings it never reached (the probe's rule, header).
  if ((r.stuck ?? []).length > 0) return verdict(null, `the drive stopped at ${J(r.stuck)}, so nothing after it was read`);
  const p = [];
  const u = [];
  for (const [name, end] of [['C', r.c], ['twin', r.twin]]) {
    if (end === null) u.push(`no pair-another line for ${name}`);
    else if (end.closed !== true) p.push(`${name} did not pair (its line: ${J(end.line)})`);
  }
  if (r.d === null) u.push('no pair-another line for D');
  else {
    if (r.d.line !== WORDS.macLimit) p.push(`D's sheet says ${J(r.d.line)}, not ${J(WORDS.macLimit)}`);
    if (r.d.again !== true) p.push('D\'s sheet offers no Pair again');
  }
  if (r.dPairs === null) u.push('D\'s door was not read');
  else if (r.dPairs > 0) p.push(`D logged ${String(r.dPairs)} POST /pair: the cap was not held at the code`);
  if (r.cAgain === null) u.push('no pair-another line for C\'s new code');
  else if (r.cAgain.closed !== true) p.push(`C's new code did not re-pair at four (its line: ${J(r.cAgain.line)})`);
  if (r.cAgainPairs === null) u.push('the second C was not read');
  else if (r.cAgainPairs === 0) p.push('the second C saw no POST /pair');
  const rows = macsRowsOf(r.macs);
  if (r.macsFound === false) p.push(`with four Macs kept no Macs tab is named ${J(r.macsLabel ?? null)}`);
  else if (r.macs === null) u.push('the Macs screen was not read at four');
  else if (rows.length !== 4) p.push(`the Macs screen draws ${String(rows.length)} row(s) at four`);
  else if (J(rows.map((x) => x.name)) !== J(r.expectNames)) p.push(`the Macs are ${J(rows.map((x) => x.name))}, not ${J(r.expectNames)}`);
  return decide(p, u, `C and twin paired${typeof r.twin?.fromLog === 'string' ? ` (twin: ${r.twin.fromLog}; D and C2 on a drive of their own)` : ''}; D's code drew ${J(WORDS.macLimit)} with Pair again and D logged no POST /pair; C's new code re-paired at four; the Macs ${J(r.expectNames)}`);
}

/** H: a hostile second Mac is held to its own space: names whole, its reads its own, A's key A's, a tap it claims never guessed, its refusal its own. */
export function gradeH(r) {
  const p = [];
  const u = [];
  const rows = macsRowsOf(r.macs);
  if (r.macs === null) u.push('the Macs screen was not read');
  else {
    if (rows[0]?.name !== A_NAME) p.push(`A is drawn ${J(rows[0]?.name ?? null)}, not its whole name`);
    if (rows[r.twinIndex]?.name !== TWIN_NAME) p.push(`twin is drawn ${J(rows[r.twinIndex]?.name ?? null)}, not its whole name`);
  }
  // A drive that never reached its first step read no bar at all: that is no reading, not a tab missing.
  if (r.labelFound === null) u.push('the Macs tab was never looked for');
  else if (r.labelFound !== true) p.push(`the Macs tab was not found by A's whole name ${J(A_NAME)}`);
  if (r.twinOpens === null) u.push('twin\'s log was not read');
  else if (r.twinOpens === 0) u.push('opening the session on twin made no request at twin');
  if (r.aDuringTwin === null || r.twinDuringA === null) u.push('the relay or twin\'s log was not counted between the marks');
  else {
    if (r.aDuringTwin > 0) p.push(`${String(r.aDuringTwin)} connection(s) to A while the session was opened on twin`);
    if (r.twinDuringA > 0) p.push(`${String(r.twinDuringA)} request(s) at twin while the session was opened on A`);
  }
  if (r.aRecordsDuringTwin == null) u.push('the relay\'s request records on A were not read at the marks');
  else if (r.aRecordsDuringTwin > 0) p.push(`${String(r.aRecordsDuringTwin)} request record(s) to A while the session was opened on twin`);
  if (r.aOpens === null) u.push('A was not counted while its session opened');
  else if (r.aOpens === 0) p.push('opening the session on A made no connection to A');
  if (r.keyA === null) u.push('A\'s pane was not read after the key');
  else if (r.keyA !== true) p.push('the key did not reach A\'s pane');
  if (r.twinKeys === null) u.push('twin\'s log was not read for keys');
  else if (r.twinKeys > 0) p.push(`twin logged ${String(r.twinKeys)} POST /v1/keys`);
  if (r.alert === null) u.push('the alert was not tapped');
  else {
    if (r.alert.mainBlocked !== true) u.push('main never read the alert\'s session blocked');
    else if (r.alert.delivered?.code !== 0) u.push('the alert was not delivered');
    else if (r.alert.dump === null) u.push('no dump after the tap');
    else {
      if (onSessionPage(r.alert.dump)) p.push('with two Macs saying they send, the tap pushed a session: a guess');
      if (!has(r.alert.dump, 'screen-needs-input')) p.push('the tap did not land on Needs input');
    }
    if (r.alert.twinAsked === null) u.push('twin\'s log was not read after the tap');
    else if (r.alert.twinAsked > 0) p.push(`twin logged ${String(r.alert.twinAsked)} /v1/session for the tapped id`);
  }
  if (r.refused === null) u.push('twin was not read after twin-refuse');
  else {
    if (has(r.refused, 'screen-pairing')) p.push('twin\'s refusal drew Pairing');
    const f = el(r.refused, 'needs-list-failure') ?? el(r.refused, 'list-failure');
    if (f?.label !== WORDS.notPairedHere) p.push(`twin's list says ${J(f?.label ?? null)}, not ${J(WORDS.notPairedHere)}`);
  }
  if (r.aAfter === null) u.push('A was not read after twin refused');
  else if (r.aRows === null) u.push('A\'s door was not read beside it after twin refused');
  else if (!sameSet(needsRowIds(r.aAfter), r.aRows)) p.push(`after twin refused A draws ${J(needsRowIds(r.aAfter))}, its door answers ${J(r.aRows)}`);
  return decide(p, u, `A and twin drawn whole; twin's open logged at twin alone and A's at A alone; A's key at A's pane and none at twin; the tap twin also claims landed on Needs input with nothing pushed or read at twin; refused, twin drew ${J(WORDS.notPairedHere)} and A read on. STATED, not failed: twin was handed the phone's DEBUG alert address, as one hostile Mac is today`);
}

/** HN: a code naming A's whole name with twin's pin is refused at the handshake, and nothing kept moves. */
export function gradeHN(r) {
  const p = [];
  const u = [];
  if (r.line === null) u.push('no pair-another line');
  else {
    if (r.line.line !== WORDS.keyMismatch) p.push(`the sheet says ${J(r.line.line)}, not ${J(WORDS.keyMismatch)}`);
    if (r.line.closed === true) p.push('the forged code paired');
  }
  if (r.before === null || r.after === null) u.push('the Macs were not read before and after');
  else if (J(macsRowsOf(r.before).map((x) => x.name)) !== J(macsRowsOf(r.after).map((x) => x.name))) p.push(`the Macs moved from ${J(macsRowsOf(r.before).map((x) => x.name))} to ${J(macsRowsOf(r.after).map((x) => x.name))}`);
  if (r.aAfter === null) u.push('A was not read after');
  else if (r.aRows === null) u.push('A\'s door was not read beside it');
  else if (!sameSet(needsRowIds(r.aAfter), r.aRows)) p.push(`A draws ${J(needsRowIds(r.aAfter))} after, its door answers ${J(r.aRows)}`);
  return decide(p, u, `the forged code drew ${J(WORDS.keyMismatch)}; the Macs and A's lists unmoved`);
}

/** DG: build 10 installed over this build reads the first Mac alone; this build again reads every Mac. */
export function gradeDG(r) {
  const p = [];
  const u = [];
  if (r.install.length !== 2 || r.install.some((i) => i.code !== 0)) u.push(`the two installs exited ${J(r.install.map((i) => i.code))}`);
  if (r.parent === null) u.push('the parent drew nothing after the downgrade');
  else {
    if (has(r.parent, 'screen-pairing')) p.push('the parent drew Pairing over this build\'s records');
    else if (r.aRows === null) u.push('A\'s door was not read beside the parent\'s list');
    else if (!sameSet(needsRowIds(r.parent), r.aRows)) p.push(`the parent draws ${J(needsRowIds(r.parent))}, A answers ${J(r.aRows)}`);
  }
  if (r.parentSettings === null) u.push('the parent\'s Settings were not read');
  else if (el(r.parentSettings, 'settings-mac-name')?.label !== firstLabel(A_NAME)) p.push(`the parent's Settings names ${J(el(r.parentSettings, 'settings-mac-name')?.label ?? null)}, not A`);
  else if (r.parentReference !== null) {
    const d = screenDiff(r.parentReference, r.parentSettings);
    if (d.length > 0) p.push(`the parent's Settings differ from its Settings in U0: ${d.slice(0, 3).join(', ')}`);
  }
  const rows = macsRowsOf(r.head);
  // No Macs tab after this build is back is this build drawing one Mac: an
  // answer (it lost Macs), never a reading that did not come.
  if (r.headFound === false) {
    if (r.expectCount > 1) p.push(`this build again draws no Macs tab, with ${String(r.expectCount)} Macs kept: it lost Macs`);
  } else if (r.head === null) u.push('this build was not read again after');
  else if (rows.length !== r.expectCount) p.push(`this build again draws ${String(rows.length)} Mac(s), not ${String(r.expectCount)}`);
  return decide(p, u, `the parent drew A alone, as in U0; this build again drew all ${String(r.expectCount)} Macs`);
}

/** RM: Remove on one Mac blanks that Mac alone, never Pairing. */
export function gradeRM(r) {
  const p = [];
  const u = [];
  if (r.removed !== true) u.push('the phone was not removed on the Mac');
  // The fix round: a Remove that stopped the door is allowed again before the
  // phone reads; a door that never answered again cannot refuse the phone.
  if (r.doorBack != null && r.doorBack.ok !== true) u.push(`the Mac's door did not answer again after the Remove (${String(r.doorBack.why ?? '')}), so the phone could only say it could not reach it`);
  if (r.fail === null) u.push('the list was not read after the Remove');
  else {
    if (has(r.fail, 'screen-pairing')) p.push('a Remove drew Pairing');
    const f = el(r.fail, 'list-failure') ?? el(r.fail, 'needs-list-failure');
    if (f?.label !== WORDS.notPairedHere) p.push(`the list says ${J(f?.label ?? null)}, not ${J(WORDS.notPairedHere)}`);
  }
  if (r.aAfter === null) u.push('A was not read after');
  else if (r.aRows === null) u.push('A\'s door was not read beside it');
  else if (!sameSet(needsRowIds(r.aAfter), r.aRows)) p.push(`A draws ${J(needsRowIds(r.aAfter))}, its door answers ${J(r.aRows)}`);
  return decide(p, u, `Remove on the Mac drew ${J(WORDS.notPairedHere)} on that Mac alone; A read on`);
}

/** RP: a re-pair lands on the Mac's Sessions and draws its Needs input again by a tab press (Phase 348, D1), the same count of Macs, and it moves to the end (D9, stated). */
export function gradeRP(r) {
  const p = [];
  const u = [];
  // Phase 348 (D1): the re-pair lands on that Mac's Sessions (`landed`), and
  // its Needs input is read after an explicit tab press (`end`).
  if (r.line === null || r.landed === null || r.landed === undefined) u.push('no pair-another line or dump');
  else {
    if (r.line.closed !== true) p.push(`the re-pair did not close the sheet (its line: ${J(r.line.line)})`);
    if (!has(r.landed, 'screen-list')) p.push('the re-pair did not land on that Mac\'s Sessions');
    if (r.end === null || r.end === undefined) u.push('the re-paired Mac\'s Needs input was not read after the tab press');
    // THE PROBE REVIEW (Phase 348, rule 9): as T1's, the tab press must DRAW Needs input; a screen with no needs rows
    // over a door with none read as equal sets before it.
    else if (!has(r.end, 'screen-needs-input')) p.push('the tab press drew no Needs input');
    else if (r.doorRows === null) u.push('the re-paired Mac\'s door was not read beside it');
    else if (!sameSet(needsRowIds(r.end), r.doorRows)) p.push(`it draws ${J(needsRowIds(r.end))}, its door answers ${J(r.doorRows)}`);
  }
  const rows = macsRowsOf(r.macs);
  if (r.macs === null) u.push('the Macs screen was not read');
  else {
    if (rows.length !== r.expectCount) p.push(`${String(rows.length)} Mac(s) after the re-pair, not ${String(r.expectCount)}`);
    if (rows.at(-1)?.name !== r.lastName) p.push(`the last Mac is ${J(rows.at(-1)?.name ?? null)}, not the re-paired ${J(r.lastName)}`);
  }
  return decide(p, u, `the re-paired Mac drew again; ${String(r.expectCount)} Macs, it now last (D9, stated)`);
}

/** UP: Unpair forgets the Mac on screen alone, dials it no more, keeps the rest, and one Mac draws as P1's HEAD dump. */
export function gradeUP(r) {
  const p = [];
  const u = [];
  if (r.landed === null || r.unpaired === null) u.push('Unpair was not read');
  else {
    if (r.landed.where !== 'needs-input') p.push(`Unpair landed on ${J(r.landed.where)}, not Needs input`);
    if (r.aRows === null) u.push('the first Mac\'s door was not read beside where Unpair landed');
    else if (!sameSet(needsRowIds(r.unpaired), r.aRows)) p.push(`it landed on ${J(needsRowIds(r.unpaired))}, the first Mac answers ${J(r.aRows)}`);
  }
  if (r.idleDialled === null) u.push('the relay was not counted over the idle');
  // The two lines are stamped when this process read them (a quarter second's tail at most each).
  else if (r.idleMs < IDLE_READ_MS) u.push(`only ${String(r.idleMs)} ms were counted between the idle's two lines, under ${String(IDLE_READ_MS)}`);
  else if (r.idleDialled > 0) p.push(`the unpaired Mac was dialled ${String(r.idleDialled)} time(s) in the 20 s after`);
  const rows = macsRowsOf(r.relaunch);
  if (r.relaunchAbsent === true) {
    if (r.expectAfterRelaunch.length > 1) p.push('after the relaunch the Macs tab is gone, with Macs still kept');
  } else if (r.relaunch === null) u.push('the Macs were not read after the relaunch');
  else if (J(rows.map((x) => x.name)) !== J(r.expectAfterRelaunch)) p.push(`after the relaunch the Macs are ${J(rows.map((x) => x.name))}, not ${J(r.expectAfterRelaunch)}`);
  if (r.stillListed === null) u.push('the unpaired Mac\'s phones were not read');
  else if (r.stillListed !== true) p.push('the unpaired Mac no longer lists the phone (its half is Remove)');
  const tabs = tabButtonsOf(r.finalTabs);
  if (r.finalFound === true) p.push('with one Mac left a Macs tab is still found');
  else if (r.finalFound !== false) u.push('the bar was not read for a Macs tab at one Mac after the last relaunch');
  if (tabs === null) u.push('the tab bar was not read at one Mac');
  else if (J(tabs.map((t) => t.label)) !== J([WORDS.needsInput, WORDS.sessions, WORDS.settings])) p.push(`at one Mac the bar holds ${J(tabs.map((t) => t.label))}`);
  if (r.finalSettings === null || r.reference === null) u.push(`no Settings ${r.finalSettings === null ? 'at one Mac' : 'from P1\'s HEAD dump'}`);
  else {
    const d = screenDiff(r.reference, r.finalSettings);
    if (d.length > 0) p.push(`Settings at one Mac differ from P1's HEAD dump: ${d.slice(0, 3).join(', ')}`);
  }
  return decide(p, u, `Unpair landed on the first Mac's Needs input; 0 connections to the unpaired Mac in ${String(r.idleMs)} ms; after the relaunch ${J(r.expectAfterRelaunch)}; the unpaired Mac still lists the phone; at one Mac three tabs and Settings as P1's HEAD dump`);
}

/** RUN: nothing real reached, everything this run started ended, his history unmoved. */
export function gradeRun(r) {
  const p = [];
  const u = [];
  if (r.preflights.length === 0) u.push('no stand-in was preflighted, so the run never started');
  else if (!r.preflights.every((x) => x === true)) p.push(`a stand-in preflight refused ${J(r.preflights)}`);
  if (r.samples === 0) u.push('the process table was never sampled');
  if (r.realTailscale > 0) p.push(`${String(r.realTailscale)} real Tailscale process(es) under the run`);
  if (r.forbidden > 0) p.push(`${String(r.forbidden)} forbidden argv at a stand-in`);
  if (r.standinsLeft > 0) p.push(`${String(r.standinsLeft)} stand-in pid(s) left`);
  if (r.doorsLeft > 0) p.push(`${String(r.doorsLeft)} node door(s) left`);
  if (r.electronsLeft > 0) p.push(`${String(r.electronsLeft)} Electron line(s) of this run left`);
  if (r.devices === null) u.push('the Simulators could not be counted');
  else if (r.devices.named > 0 || r.devices.booted > 0) p.push(`${String(r.devices.named)} of this run's devices left, ${String(r.devices.booted)} booted`);
  if (r.history === null) u.push('his shell history could not be stat\'d');
  else if (r.history.moved) p.push(`his shell history moved across the run: ${J(r.history.before)} then ${J(r.history.after)}`);
  if (r.dnsPreflights.length === 0) u.push('no DNS stand-in was preflighted, so the run never started');
  else if (!r.dnsPreflights.every((x) => x === true)) p.push(`a DNS preflight refused ${J(r.dnsPreflights)}`);
  // No app armed its bridge (a build that failed, a launch that timed out):
  // the agents were never read back, which is a run that did not start.
  if (r.agentsHeld.length === 0) u.push('no app armed its bridge, so the renamed agents were never read back');
  else if (!r.agentsHeld.every((x) => x === true)) p.push(`the renamed agents ${J(r.agentsHeld)}`);
  return decide(p, u, `no real Tailscale in ${String(r.samples)} sample(s); nothing forbidden; every stand-in, door, relay and Electron ended; 0 of this run's devices; his history unmoved`);
}

// ---------------------------------------------------------------------------
// --grader-self-test: every grader on readings written here; starts nothing
// ---------------------------------------------------------------------------

/** One element of a made-up dump. */
const E = (id, label = '', frame = [0, 0, 10, 10]) => ({ id, label, frame });
const D = (name, elements, window = [402, 874]) => ({ step: 'screen', name, window, elements });

function selfTest() {
  const results = [];
  const check = (name, got, want) => {
    const ok = got.ok === want;
    results.push(ok);
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${name.padEnd(56)} ${got.ok === null ? 'UNREADABLE' : got.ok ? 'PASS' : 'FAIL'}: ${String(got.said).slice(0, 150)}`);
  };
  const is = (name, cond, said = '') => {
    results.push(cond);
    console.log(`${cond ? 'ok  ' : 'FAIL'} ${name.padEnd(56)} ${said}`);
  };
  const A_ID = 'aaaaaaaa-0000-4000-8000-00000000000a';
  const B1 = 'bbbbbbbb-0000-4000-8000-0000000000b1';
  const B2 = 'bbbbbbbb-0000-4000-8000-0000000000b2';
  const FP = 'a1b2 c3d4 e5f6 a7b8 c9d0 e1f2';
  const tabs3 = { read: true, inBar: [], bottom: [{ label: 'Needs input', frame: [0, 800, 100, 50] }, { label: 'Sessions', frame: [134, 800, 100, 50] }, { label: 'Settings', frame: [268, 800, 100, 50] }] };
  const tabs4 = (label) => ({ read: true, inBar: [], bottom: [...tabs3.bottom.map((b) => ({ ...b, frame: [b.frame[0] * 0.75, 800, 80, 50] })), { label, frame: [320, 800, 80, 50] }] });

  // The readers.
  is('drawnName: one first label', drawnName(A_NAME, [A_NAME, B_NAME]) === 'p345-studio');
  is('drawnName: a shared first label draws the whole name', drawnName(A_NAME, [A_NAME, B_NAME, TWIN_NAME]) === A_NAME && drawnName(TWIN_NAME, [A_NAME, TWIN_NAME]) === TWIN_NAME);
  is('needsRowIds leaves the row\'s parts out', J(needsRowIds(D('x', [E(`needs-row-${A_ID}`), E(`needs-row-name-${A_ID}`), E(`needs-row-age-${A_ID}`)]))) === J([A_ID]));
  is('listRowIds leaves the row\'s parts out', J(listRowIds(D('x', [E(`row-${B1}`), E(`row-dot-${B1}`), E(`row-${B2}`)]))) === J([B1, B2]));
  is('macsRowsOf', J(macsRowsOf(D('macs', [E('macs-row-0'), E('macs-row-name-0', 'p345-studio'), E('macs-row-chosen-0'), E('macs-row-line-0', needsYourInput(1)), E('macs-row-1'), E('macs-row-name-1', 'p345-laptop')]))) === J([{ i: 0, name: 'p345-studio', line: needsYourInput(1), chosen: true }, { i: 1, name: 'p345-laptop', line: null, chosen: false }]));
  is('tabButtonsOf reads the bar when it is one', J(tabButtonsOf({ read: true, inBar: [{ label: 'Sessions', frame: [134, 0, 1, 1] }, { label: 'Needs input', frame: [0, 0, 1, 1] }, { label: 'Settings', frame: [268, 0, 1, 1] }], bottom: [] }).map((t) => t.label)) === J(['Needs input', 'Sessions', 'Settings']));
  is('tabButtonsOf reads the bottom row on a glass bar', J(tabButtonsOf(tabs4('p345-laptop')).map((t) => t.label)) === J(['Needs input', 'Sessions', 'Settings', 'p345-laptop']));
  is('tabButtonsOf leaves a button off the bar\'s row out', J(tabButtonsOf({ ...tabs3, bottom: [...tabs3.bottom, { label: 'Send', frame: [300, 740, 40, 40] }] }).map((t) => t.label)) === J(['Needs input', 'Sessions', 'Settings']));
  is('badgeNumber reads the value', badgeNumber({ tab: 'p345-laptop', label: 'p345-laptop', value: '1 item', found: true }) === 1);
  is('badgeNumber never reads the Mac\'s own digits', badgeNumber({ tab: 'p345-laptop', label: 'p345-laptop', value: null, inside: ['p345-laptop'], found: true }) === null && badgeNumber({ tab: 'p345-laptop', label: 'p345-laptop, 2', value: null, found: true }) === 2);
  is('glassBar', glassBar({ system: '26.3' }) && !glassBar({ system: '18.3' }));
  is('sniOf is the relay\'s (imported)', typeof sniOf === 'function');

  // screenDiff
  const base = D('settings', [E('screen-settings', '', [0, 0, 402, 874]), E('settings-mac-name', 'p345-studio', [16, 100, 300, 20]), E('settings-unpair', 'Unpair this iPhone', [16, 400, 370, 54]), E('settings-mac-read', 'Read now', [16, 130, 300, 14])]);
  const moved = D('settings', [E('screen-settings', '', [0, 0, 402, 874]), E('settings-mac-name', 'p345-studio', [16, 100, 300, 20]), E('settings-pair-another', 'Pair another Mac', [16, 400, 370, 54]), E('settings-unpair', 'Unpair this iPhone', [16, 466, 370, 54]), E('settings-mac-read', 'Read 1m ago', [16, 130, 300, 14])]);
  const shiftOf = (head) => settingsShift(el(head, 'settings-pair-another'));
  is('screenDiff: the row added, the rest 66 pt lower, a read line\'s clock aside', screenDiff(base, moved, shiftOf(moved)).length === 0, J(screenDiff(base, moved, shiftOf(moved))));
  const moved65 = D('settings', moved.elements.map((e) => (e.id === 'settings-unpair' ? { ...e, frame: [16, 465, 370, 54] } : e)));
  is('screenDiff: 65 pt lower is a difference', screenDiff(base, moved65, shiftOf(moved65)).length === 1);
  const renamed = D('settings', moved.elements.map((e) => (e.id === 'settings-mac-name' ? { ...e, label: 'p345-studio.tail00000.ts.net' } : e)));
  is('screenDiff: a name drawn otherwise is a difference', screenDiff(base, renamed, shiftOf(renamed)).length === 1);
  const extra = D('settings', [...moved.elements, E('settings-stranger', 'x')]);
  is('screenDiff: a new element is a difference', screenDiff(base, extra, shiftOf(extra)).length === 1);
  // The fix round: the tab bar's buttons and the system's overlay are fixed to
  // the window, below the row, and do not move (run 1's dumps, both runtimes).
  const bar = [E('bell', '', [60, 795, 99.67, 54]), E('bell.fill', '', [97, 801, 26.33, 28]), E('gearshape', '', [243.33, 795, 99.67, 54]), E('AdditionalDimmingOverlay', '', [-120, 731, 642, 286])];
  const baseBar = D('settings', [...base.elements, ...bar]);
  const movedBar = D('settings', [...moved.elements, ...bar]);
  is('screenDiff: the bar and the overlay stay where they were below the row', screenDiff(baseBar, movedBar, shiftOf(movedBar)).length === 0, J(screenDiff(baseBar, movedBar, shiftOf(movedBar))));
  const barMoved = D('settings', [...moved.elements, ...bar.map((e) => ({ ...e, frame: [e.frame[0], e.frame[1] + SETTINGS_SHIFT_PT, e.frame[2], e.frame[3]] }))]);
  is('screenDiff: the bar moved with the content is a difference', screenDiff(baseBar, barMoved, shiftOf(barMoved)).length === bar.length);
  const unshifted = D('settings', moved.elements.map((e) => (e.id === 'settings-unpair' ? { ...e, frame: [16, 400, 370, 54] } : e)));
  is('screenDiff: Settings\' own content left where it was is a difference', screenDiff(base, D('settings', [...unshifted.elements]), shiftOf(unshifted)).length === 1);

  // U0
  const relaunch = D('relaunch-keep', [E('screen-needs-input'), E(`needs-row-${A_ID}`)]);
  const u0 = { paired: D('pair-end', [E('screen-needs-input')]), install: [{ code: 0 }], relaunch, readsAfter: 2, phonesBefore: ['r', 'p'], phonesAfter: ['p', 'r'] };
  check('U0 pass', gradeU0(u0), true);
  check('U0 fail: Pairing after the upgrade', gradeU0({ ...u0, relaunch: D('relaunch-keep', [E('screen-pairing')]) }), false);
  check('U0 fail: no read after the upgrade', gradeU0({ ...u0, readsAfter: 0 }), false);
  check('U0 fail: a second phone appeared', gradeU0({ ...u0, phonesAfter: ['p', 'r', 'q'] }), false);
  check('U0 unreadable: the install failed', gradeU0({ ...u0, install: [{ code: 1 }] }), null);

  // P1
  const scr = (name, extraEls = []) => D(name, [E(`screen-${name}`), E('x-1', 'a', [0, 10, 10, 10]), ...extraEls]);
  const p1 = {
    before: { needs: scr('needs-input', [E(`needs-row-age-${A_ID}`, '2m')]), sessions: scr('list'), terminal: scr('screen', [E('screen-row-0', '$ ')]), catchUp: scr('catch-up'), settings: base },
    after: { needs: scr('needs-input', [E(`needs-row-age-${A_ID}`, '3m')]), sessions: scr('list'), terminal: scr('screen', [E('screen-row-0', '$ ls')]), catchUp: scr('catch-up'), settings: moved },
    tabs: tabs3,
    macsDrawn: false,
    otherNames: 0
  };
  check('P1 pass', gradeP1(p1), true);
  check('P1 fail: a fourth tab with one Mac', gradeP1({ ...p1, tabs: tabs4('p345-studio') }), false);
  check('P1 fail: Sessions moved', gradeP1({ ...p1, after: { ...p1.after, sessions: D('list', [E('screen-list'), E('x-1', 'a', [0, 12, 10, 10])]) } }), false);
  check('P1 fail: another door dialled', gradeP1({ ...p1, otherNames: 1 }), false);
  // Phase 348 (item 3): Settings is SUPERSEDED for P1, so a Settings drawn otherwise than build 10's is not P1's to grade.
  check('P1 pass: Settings superseded (no Pair another Mac read as a difference)', gradeP1({ ...p1, after: { ...p1.after, settings: base } }), true);
  // Phase 348 (D15, D16, item 4; his ruling of 2026-10-20): build 10's Sessions with its title row and its note, and
  // HEAD's with the title in the bar, Select, the filter and the "+" in it, no note, Show at its full width, and every
  // element under the old title 75 pt lower.
  const p1Parent = D('list', [E('screen-list', '', [0, 0, 402, 874]), E('list-title', 'Sessions', [16, 106.17, 115, 33.67]), E('list-menu', '', [268.33, 117.33, 19.67, 19]), E('list-select', 'Select', [304, 114.67, 48, 24.33]), E('start-open', 'New session', [354, 102, 46, 46]), E('list-show', '', [16, 148, 370, 32]), E('list-show-all', 'All', [18, 150, 122, 28]), E(`row-${A_ID}`, '', [0, 223, 402, 57]), E('list-age-note', 'note', [16, 501, 357, 33.67]), E('list-read', 'read 9:41', [305.33, 540.67, 80.67, 15.67])]);
  const p1Head = D('list', [E('screen-list', '', [0, 0, 402, 874]), E('list-menu', '', [98, 120, 58, 36]), E('list-select', 'Select', [20, 120, 62, 36]), E('start-open', 'New session', [332, 120, 50, 36]), E('list-show', '', [16, 223, 370, 32]), E('list-show-all', 'All', [18, 225, 122, 28]), E(`row-${A_ID}`, '', [0, 298, 402, 57]), E('list-read', 'read 9:42', [305.33, 596, 80.67, 15.67])]);
  check('P1 pass: HEAD\'s Sessions under the bar, what Phase 348 moved stated', gradeP1({ ...p1, before: { ...p1.before, sessions: p1Parent }, after: { ...p1.after, sessions: p1Head } }), true);
  check('P1 fail: HEAD\'s Sessions with a row moved more than the bar moved everything', gradeP1({ ...p1, before: { ...p1.before, sessions: p1Parent }, after: { ...p1.after, sessions: D('list', p1Head.elements.map((e) => (e.id === `row-${A_ID}` ? { ...e, frame: [0, 300, 402, 57] } : e))) } }), false);
  check('P1 fail: HEAD\'s Sessions pushed down past the large title\'s cost', gradeP1({ ...p1, before: { ...p1.before, sessions: p1Parent }, after: { ...p1.after, sessions: D('list', p1Head.elements.map((e) => (/^(?:row-|list-show|list-read)/.test(e.id) ? { ...e, frame: [e.frame[0], e.frame[1] + 10, e.frame[2], e.frame[3]] } : e))) } }), false);
  // His ruling of 2026-10-20 ("Top bar (Recommended)"): Show keeps build 11's full width, so the fix round's Show,
  // narrowed beside a first-line "+", is a difference P1 names, never a stated one.
  check('P1 fail: HEAD\'s Show narrowed beside a first-line "+" (the fix round\'s construction)', gradeP1({ ...p1, before: { ...p1.before, sessions: p1Parent }, after: { ...p1.after, sessions: D('list', p1Head.elements.map((e) => (e.id === 'list-show' ? { ...e, frame: [16, 223, 306, 32] } : e.id === 'list-show-all' ? { ...e, frame: [18, 225, 100.67, 28] } : e))) } }), false);
  check('P1 fail: HEAD\'s Sessions with a row build 10 did not draw', gradeP1({ ...p1, before: { ...p1.before, sessions: p1Parent }, after: { ...p1.after, sessions: D('list', [...p1Head.elements, E('row-stranger', '', [0, 360, 402, 57])]) } }), false);
  check('P1 unreadable: no parent', gradeP1({ ...p1, before: {} }), null);
  // The ruled round: an age is drawn against the row's right edge and its
  // width moves with the clock (run 2's `now` and `1m`): the edge, y and
  // height are compared, never x and width; any other id still is.
  const ageId = `needs-row-age-${A_ID}`;
  const ageNow = D('needs-input', [E('screen-needs-input'), E(ageId, 'now', [361, 114.16666666666666, 25, 15.666666666666657])]);
  const age1m = D('needs-input', [E('screen-needs-input'), E(ageId, '1m', [366.3333333333333, 114.16666666666666, 19.666666666666686, 15.666666666666657])]);
  is('screenDiff: an age\'s width moves with the clock, its right edge 386 held', screenDiff(ageNow, age1m).length === 0, J(screenDiff(ageNow, age1m)));
  const ageMoved = D('needs-input', [E('screen-needs-input'), E(ageId, '1m', [364, 114.16666666666666, 19.666666666666686, 15.666666666666657])]);
  is('screenDiff: an age whose right edge moved is a difference', screenDiff(ageNow, ageMoved).length === 1, J(screenDiff(ageNow, ageMoved)));
  const ageLower = D('needs-input', [E('screen-needs-input'), E(ageId, '1m', [366.3333333333333, 116, 19.666666666666686, 15.666666666666657])]);
  is('screenDiff: an age drawn lower is a difference', screenDiff(ageNow, ageLower).length === 1);
  const nameNow = D('needs-input', [E('screen-needs-input'), E(`needs-row-name-${A_ID}`, 'a-ask', [361, 114, 25, 15])]);
  const nameNarrow = D('needs-input', [E('screen-needs-input'), E(`needs-row-name-${A_ID}`, 'a-ask', [366.3333333333333, 114, 19.666666666666686, 15])]);
  is('screenDiff: a name is still compared by x and width', screenDiff(nameNow, nameNarrow).length === 1);
  check('P1 pass: the age read now, then 1m', gradeP1({ ...p1, before: { ...p1.before, needs: ageNow }, after: { ...p1.after, needs: age1m } }), true);

  // AL1 / AL2
  const al = { mainBlocked: true, delivered: { code: 0 }, banner: 'Tortie, a-ask2', name: 'a-ask2', dump: D('alert', [E('screen-catch-up'), E('session-title', 'a-ask2')]) };
  check('AL1 pass', gradeAlertOpens(al), true);
  check('AL1 fail: the list, not the session', gradeAlertOpens({ ...al, dump: D('alert', [E('screen-needs-input')]) }), false);
  check('AL1 fail: another session', gradeAlertOpens({ ...al, dump: D('alert', [E('screen-catch-up'), E('session-title', 'a-ask')]) }), false);
  check('AL1 unreadable: never blocked', gradeAlertOpens({ ...al, mainBlocked: false }), null);
  const al2 = { ...al, name: 'a-ask3', dump: D('alert', [E('screen-catch-up'), E('session-title', 'a-ask3')]), chosenAfter: D('macs', [E('macs-row-0'), E('macs-row-name-0', 'p345-studio'), E('macs-row-chosen-0'), E('macs-row-1'), E('macs-row-name-1', 'p345-laptop')]), senderIndex: 0, otherPlace: D('tab-sessions', [E('screen-session'), E('screen-screen')]) };
  check('AL2 pass', gradeAlertOpens(al2), true);
  check('AL2 fail: the other Mac lost its place', gradeAlertOpens({ ...al2, otherPlace: D('tab-sessions', [E('screen-list')]) }), false);
  check('AL2 fail: the sender is not ticked', gradeAlertOpens({ ...al2, chosenAfter: D('macs', [E('macs-row-0'), E('macs-row-name-0', 'p345-studio'), E('macs-row-1'), E('macs-row-chosen-1')]) }), false);

  // T1
  // Phase 348 (D1): the sheet closes onto B's Sessions (`landed`), and B's Needs input is read after a tab press (`end`).
  const t1 = { drawn: FP, macFingerprint: FP, allowed: true, line: { closed: true, line: '' }, landed: D('pair-another-end', [E('screen-list'), E(`row-${B1}`), E(`row-${B2}`)]), end: D('tab-needs', [E('screen-needs-input'), E(`needs-row-${B1}`), E(`needs-row-${B2}`)]), doorRows: [B2, B1], tabs: tabs4('p345-laptop'), label: 'p345-laptop', readBadges: true, needsBadge: { tab: 'Needs input', value: '2', system: '18.3', found: true }, macsBadge: { tab: 'p345-laptop', value: '1', system: '18.3', found: true }, expectNeeds: 2, expectMacs: 1 };
  check('T1 pass', gradeT1(t1), true);
  check('T1 fail: the fingerprint is not the Mac\'s', gradeT1({ ...t1, macFingerprint: 'ffff ffff ffff ffff ffff ffff' }), false);
  check('T1 fail: the first Mac\'s rows', gradeT1({ ...t1, end: D('tab-needs', [E('screen-needs-input'), E(`needs-row-${A_ID}`)]) }), false);
  check('T1 fail: the sheet closed onto Needs input, build 10\'s landing (Phase 348, D1)', gradeT1({ ...t1, landed: D('pair-another-end', [E('screen-needs-input'), E(`needs-row-${B1}`), E(`needs-row-${B2}`)]) }), false);
  check('T1 unreadable: no Needs input read after the tab press', gradeT1({ ...t1, end: null }), null);
  check('T1 fail: the tab press drew no Needs input', gradeT1({ ...t1, end: D('tab-needs', [E('screen-list')]) }), false);
  check('T1 fail: three tabs', gradeT1({ ...t1, tabs: tabs3 }), false);
  check('T1 fail: the Macs badge counts the Mac on screen', gradeT1({ ...t1, macsBadge: { tab: 'p345-laptop', value: '3', system: '18.3', found: true } }), false);
  check('T1 unreadable: badges on a glass bar', gradeT1({ ...t1, needsBadge: { ...t1.needsBadge, system: '26.3' } }), null);
  check('T1 pass on 26.3 with badges not graded', gradeT1({ ...t1, readBadges: false }), true);

  // T2
  const t2macs = D('macs', [E('macs-row-0'), E('macs-row-name-0', 'p345-studio'), E('macs-row-chosen-0'), E('macs-row-line-0', needsYourInput(1)), E('macs-row-1'), E('macs-row-name-1', 'p345-laptop'), E('macs-row-line-1', needsYourInput(2))]);
  const t2 = {
    macs: t2macs,
    expectRows: [{ name: 'p345-studio', line: needsYourInput(1) }, { name: 'p345-laptop', line: needsYourInput(2) }],
    chosenIndex: 0,
    chooseB: { dump: D('choose-mac', [E('screen-needs-input'), E(`needs-row-${B1}`), E(`needs-row-${B2}`)]), doorIds: [B1, B2] },
    sessionsB: { dump: D('tab-sessions', [E('screen-list'), E(`row-${B1}`), E(`row-${B2}`)]), doorIds: [B1, B2] },
    chooseA: { dump: D('choose-mac', [E('screen-needs-input'), E(`needs-row-${A_ID}`)]), doorIds: [A_ID] },
    placeA: D('tab-sessions', [E('screen-session'), E('screen-screen')]),
    keyA: true,
    keyB: false,
    bWhileA: 0,
    aWhileB: 0,
    bRecordsWhileA: 0,
    aRecordsWhileB: 0
  };
  check('T2 pass', gradeT2(t2), true);
  check('T2 fail: a Terminal\'s kept line still polling the first Mac', gradeT2({ ...t2, aRecordsWhileB: 3 }), false);
  check('T2 fail: no Macs tab named after the first Mac', gradeT2({ ...t2, macs: null, macsFound: false, macsLabel: 'p345-studio' }), false);
  check('T2 fail: the second Mac draws the first\'s rows', gradeT2({ ...t2, chooseB: { ...t2.chooseB, dump: D('choose-mac', [E('screen-needs-input'), E(`needs-row-${A_ID}`)]) } }), false);
  check('T2 fail: the key reached the second Mac', gradeT2({ ...t2, keyB: true }), false);
  check('T2 fail: a Terminal\'s line left open', gradeT2({ ...t2, aWhileB: 2 }), false);
  check('T2 fail: the tick on the wrong row', gradeT2({ ...t2, chosenIndex: 1 }), false);
  check('T2 fail: the place not kept', gradeT2({ ...t2, placeA: D('tab-sessions', [E('screen-list')]) }), false);
  check('T2 unreadable: the relay not counted', gradeT2({ ...t2, bWhileA: null }), null);

  // T3
  const sett = (name, host, fp, alerts) => D('settings', [E('screen-settings'), E('settings-mac-name', name), E('settings-mac-address', `${host}:8443`), E('settings-fingerprint', fp), ...(alerts ? [E('settings-alerts')] : []), E('settings-pair-another')]);
  const sheet = D('pair-another-sheet', [E('pair-another-sheet'), E('pair-another-cancel', 'Cancel'), E('screen-pairing'), E('pairing-line', WORDS.notPairedHere)]);
  const t3 = { sheet, afterCancel: sett('p345-laptop', B_NAME, 'f1f2 f3f4 f5f6 f7f8 f9f0 f1f2', false), a: sett('p345-studio', A_NAME, FP, true), b: sett('p345-laptop', B_NAME, 'f1f2 f3f4 f5f6 f7f8 f9f0 f1f2', false), want: { a: { name: A_NAME, drawn: 'p345-studio', fingerprint: FP, alerts: true }, b: { name: B_NAME, drawn: 'p345-laptop', fingerprint: 'f1f2 f3f4 f5f6 f7f8 f9f0 f1f2', alerts: false } } };
  check('T3 pass', gradeT3(t3), true);
  check('T3 fail: B shows A\'s card', gradeT3({ ...t3, b: sett('p345-studio', A_NAME, FP, true) }), false);
  check('T3 fail: an Alerts card on the Mac that does not send', gradeT3({ ...t3, b: sett('p345-laptop', B_NAME, 'f1f2 f3f4 f5f6 f7f8 f9f0 f1f2', true) }), false);
  check('T3 fail: the sheet says today\'s not-paired line', gradeT3({ ...t3, sheet: D('pair-another-sheet', [E('pair-another-sheet'), E('pair-another-cancel'), E('pairing-line', 'This iPhone is not paired with a Mac.')]) }), false);
  check('T3 fail: the sheet offers See a sample', gradeT3({ ...t3, sheet: D('pair-another-sheet', [...sheet.elements, E('pairing-see-sample')]) }), false);
  check('T3 fail: Cancel left the sheet up', gradeT3({ ...t3, afterCancel: sheet }), false);

  // S1
  const macsWith = (aLine, bLine) => D('macs-pull', [E('macs-row-0'), E('macs-row-name-0', 'p345-studio'), E('macs-row-line-0', aLine), E('macs-row-1'), E('macs-row-name-1', 'p345-laptop'), E('macs-row-chosen-1'), E('macs-row-line-1', bLine)]);
  const s1 = { fail: D('setup-failure-s1off', [E('screen-list'), E('list-failure', WORDS.cannotReachMac), E('list-failure-note', 'If Tortie…')]), macsOff: macsWith(needsYourInput(1), WORDS.cannotReachMac), macsOn: macsWith(needsYourInput(1), needsYourInput(2)), pulled: D('sessions-pull', [E('screen-list'), E(`row-${B1}`)]), aDrawn: 'p345-studio', bDrawn: 'p345-laptop', aWaiting: 1, bWaiting: 2 };
  check('S1 pass', gradeS1(s1), true);
  check('S1 fail: Pairing', gradeS1({ ...s1, fail: D('x', [E('screen-pairing')]) }), false);
  check('S1 fail: the other Mac blanked too', gradeS1({ ...s1, macsOff: macsWith(WORDS.cannotReachMac, WORDS.cannotReachMac) }), false);
  check('S1 fail: never drew again', gradeS1({ ...s1, pulled: D('sessions-pull', [E('screen-list'), E('list-failure', WORDS.cannotReachMac)]) }), false);

  // S2
  const s2 = { drawn: D('no-banner', [E('screen-needs-input'), E(`needs-row-${A_ID}`)]), aRows: [A_ID], drawnMs: 1_200, aDialled: 1, held: 2, macs: macsWith(needsYourInput(1), WORDS.macDidNotAnswer), aDrawn: 'p345-studio', bDrawn: 'p345-laptop', aWaiting: 1 };
  check('S2 pass', gradeS2(s2), true);
  check('S2 fail: the silent Mac held the one on screen', gradeS2({ ...s2, drawnMs: 15_400 }), false);
  check('S2 fail: the silent Mac says nothing after 15 s', gradeS2({ ...s2, macs: macsWith(needsYourInput(1), needsYourInput(2)) }), false);
  check('S2 unreadable: the silent Mac never dialled', gradeS2({ ...s2, held: 0 }), null);
  check('S2 fail: the Mac on screen not dialled in the bound', gradeS2({ ...s2, aDialled: 0 }), false);
  check('S2 unreadable: the Mac on screen\'s door not read', gradeS2({ ...s2, aRows: null }), null);

  // CAP
  const four = D('macs', ['p345-studio.tail00000.ts.net', 'p345-laptop', 'p345-studio.tail99999.ts.net', 'p345-cmac'].flatMap((n, i) => [E(`macs-row-${String(i)}`), E(`macs-row-name-${String(i)}`, n)]));
  const cap = { c: { closed: true }, twin: { closed: true }, d: { closed: false, line: WORDS.macLimit, again: true }, dPairs: 0, cAgain: { closed: true }, cAgainPairs: 2, macs: four, expectNames: ['p345-studio.tail00000.ts.net', 'p345-laptop', 'p345-studio.tail99999.ts.net', 'p345-cmac'] };
  check('CAP pass', gradeCap(cap), true);
  check('CAP fail: D presented', gradeCap({ ...cap, dPairs: 1 }), false);
  check('CAP fail: D paired as a fifth', gradeCap({ ...cap, d: { closed: true, line: '', again: false } }), false);
  check('CAP fail: C\'s re-pair refused at four', gradeCap({ ...cap, cAgain: { closed: false, line: WORDS.macLimit } }), false);
  // The ruled round: the twin's sheet missed (both failed reverify runs'
  // lines, 2026-10-15), resumed from the twin's own POST /pair 200, and a
  // drive stuck with nothing to resume from read UNREADABLE, never FAIL.
  const L = (seq, step, extra = {}) => ({ seq, step, ...extra });
  const missedFirst = [L(1, 'fingerprint', { for: 'pair-another', text: FP }), L(2, 'notifications', { asked: false }), L(3, 'pair-another', { closed: true, again: false, line: null }), { ...D('pair-another-end', [E('screen-needs-input')]), seq: 4 }, { ...D('pair-another-missing', [E('screen-needs-input')]), seq: 5 }, L(6, 'alive', { state: 4 }), L(7, 'done')];
  const restLines = [L(1, 'fingerprint', { for: 'pair-another', text: null }), L(2, 'pair-another', { closed: false, again: true, line: WORDS.macLimit }), { ...D('pair-another-end', [E('pair-another-sheet')]), seq: 3 }, L(4, 'pair-another-cancelled', { gone: true }), L(5, 'sessions-before', { tag: 'c-new' }), L(6, 'fingerprint', { for: 'pair-another', text: FP }), L(7, 'pair-another', { closed: true, again: false, line: null }), { ...D('pair-another-end', [E('screen-needs-input')]), seq: 8 }, L(9, 'done')];
  const capOf = (first, rest) => {
    const { lines, stuck } = capLines(first, rest);
    return gradeCap({ ...cap, stuck, c: lines[0] ?? null, twin: lines[1] ?? null, d: lines[2] ?? null, cAgain: lines[3] ?? null });
  };
  const resumed = capFirstDrive(missedFirst, [{ route: 'POST /pair', status: 200 }, { route: 'POST /pair', status: 200 }]);
  is('CAP resume: the twin\'s sheet missed and its POST /pair 200 logged', resumed.resume === true && resumed.lines.length === 2 && resumed.lines[1].closed === true && resumed.stuck.length === 0, J(resumed));
  check('CAP pass: resumed, D and C2 on a drive of their own', capOf(resumed, restLines), true);
  check('CAP fail: resumed, and D paired as a fifth', capOf(resumed, restLines.map((e) => (e.seq === 2 ? { ...e, closed: true, again: false, line: null } : e))), false);
  check('CAP unreadable: resumed, the rest drive stuck at C2', capOf(resumed, [...restLines.slice(0, 5), { ...D('pair-another-missing', []), seq: 6 }, L(7, 'done')]), null);
  check('CAP unreadable: resumed, the rest drive never ran', capOf(resumed, null), null);
  const noTwin = capFirstDrive(missedFirst, []);
  is('CAP stuck: the twin\'s sheet missed and no POST /pair logged', noTwin.resume === false && J(noTwin.stuck) === J(['pair-another-missing']));
  // Run 1's own reading: the second C saw no POST /pair and A drawn whole
  // had no tab by its first label. Both are the stop's, so UNREADABLE.
  check('CAP unreadable: stuck, never FAIL by what it never reached', gradeCap({ ...cap, stuck: noTwin.stuck, c: noTwin.lines[0], twin: null, d: null, cAgain: null, cAgainPairs: 0, macs: null, macsFound: false, macsLabel: 'p345-studio' }), null);
  is('CAP stuck: a twin POST /pair that was not 200 resumes nothing', capFirstDrive(missedFirst, [{ route: 'POST /pair', status: 'cut' }]).resume === false);
  is('CAP stuck: C\'s own sheet missed resumes nothing', capFirstDrive([{ ...D('pair-another-missing', []), seq: 1 }, L(2, 'done')], [{ route: 'POST /pair', status: 200 }]).resume === false);
  is('CAP stuck: C refused, then a sheet missed, resumes nothing', capFirstDrive(missedFirst.map((e) => (e.step === 'pair-another' ? { ...e, closed: false, again: true, line: WORDS.keyMismatch } : e)), [{ route: 'POST /pair', status: 200 }]).resume === false);
  const whole = capFirstDrive([...missedFirst.slice(0, 4), L(5, 'pair-another', { closed: true }), L(6, 'pair-another', { closed: false, again: true, line: WORDS.macLimit }), L(7, 'pair-another', { closed: true }), L(8, 'done')], [{ route: 'POST /pair', status: 200 }]);
  is('CAP: a whole first drive is read as it came', whole.resume === false && whole.lines.length === 4 && whole.stuck.length === 0);
  check('CAP pass: a whole first drive', capOf(whole, null), true);

  // H
  const h = {
    macs: four,
    twinIndex: 2,
    labelFound: true,
    twinOpens: 3,
    aDuringTwin: 0,
    aRecordsDuringTwin: 0,
    twinDuringA: 0,
    aOpens: 2,
    keyA: true,
    twinKeys: 0,
    alert: { mainBlocked: true, delivered: { code: 0 }, dump: D('alert', [E('screen-needs-input')]), twinAsked: 0 },
    refused: D('choose-mac', [E('screen-needs-input'), E('needs-list-failure', WORDS.notPairedHere)]),
    aAfter: D('choose-mac', [E('screen-needs-input'), E(`needs-row-${A_ID}`)]),
    aRows: [A_ID]
  };
  check('H pass', gradeH(h), true);
  check('H fail: twin\'s open read A', gradeH({ ...h, aDuringTwin: 1 }), false);
  check('H fail: A written to on a kept line while twin\'s session opened', gradeH({ ...h, aRecordsDuringTwin: 2 }), false);
  check('H unreadable: A\'s door not read after twin refused', gradeH({ ...h, aRows: null }), null);
  check('H fail: the tap guessed a session', gradeH({ ...h, alert: { ...h.alert, dump: D('alert', [E('screen-catch-up'), E('session-title', 'a-ask4')]) } }), false);
  check('H fail: twin asked for the tapped id', gradeH({ ...h, alert: { ...h.alert, twinAsked: 1 } }), false);
  check('H fail: the key went to twin', gradeH({ ...h, twinKeys: 1 }), false);
  check('H fail: twin\'s refusal drew Pairing', gradeH({ ...h, refused: D('x', [E('screen-pairing')]) }), false);
  check('H fail: the first labels drawn alone', gradeH({ ...h, macs: D('macs', ['p345-studio', 'p345-laptop', 'p345-studio', 'p345-cmac'].flatMap((n, i) => [E(`macs-row-${String(i)}`), E(`macs-row-name-${String(i)}`, n)])) }), false);

  // HN
  const hn = { line: { closed: false, line: WORDS.keyMismatch, again: true }, before: four, after: four, aAfter: D('tab-needs', [E('screen-needs-input'), E(`needs-row-${A_ID}`)]), aRows: [A_ID] };
  check('HN pass', gradeHN(hn), true);
  check('HN fail: the forged code paired', gradeHN({ ...hn, line: { closed: true, line: '' } }), false);
  check('HN fail: the Macs moved', gradeHN({ ...hn, after: D('macs', [E('macs-row-0'), E('macs-row-name-0', 'p345-studio')]) }), false);

  // DG
  const dg = { install: [{ code: 0 }, { code: 0 }], parent: D('relaunch-keep', [E('screen-needs-input'), E(`needs-row-${A_ID}`)]), aRows: [A_ID], parentSettings: D('settings', [E('settings-mac-name', 'p345-studio')]), parentReference: D('settings', [E('settings-mac-name', 'p345-studio')]), head: four, expectCount: 4 };
  check('DG pass', gradeDG(dg), true);
  check('DG fail: the parent drew Pairing', gradeDG({ ...dg, parent: D('relaunch-keep', [E('screen-pairing')]) }), false);
  check('DG fail: HEAD lost Macs after the downgrade', gradeDG({ ...dg, head: D('macs', [E('macs-row-0'), E('macs-row-name-0', 'p345-studio')]) }), false);

  // RM
  const rm = { removed: true, fail: D('setup-failure-rm', [E('screen-list'), E('list-failure', WORDS.notPairedHere)]), aAfter: D('choose-mac', [E('screen-needs-input'), E(`needs-row-${A_ID}`)]), aRows: [A_ID] };
  check('RM pass', gradeRM(rm), true);
  check('RM pass: the door allowed again after the Remove', gradeRM({ ...rm, doorBack: { ok: true } }), true);
  check('RM unreadable: the door never answered again, so no refusal could be drawn', gradeRM({ ...rm, doorBack: { ok: false, why: 'x' } }), null);
  check('RM fail: Pairing', gradeRM({ ...rm, fail: D('x', [E('screen-pairing')]) }), false);
  check('RM fail: today\'s not-paired line', gradeRM({ ...rm, fail: D('x', [E('screen-list'), E('list-failure', 'This iPhone is not paired with a Mac.')]) }), false);

  // RP
  const rpMacs = D('macs', ['p345-studio.tail00000.ts.net', 'p345-studio.tail99999.ts.net', 'p345-cmac', 'p345-laptop'].flatMap((n, i) => [E(`macs-row-${String(i)}`), E(`macs-row-name-${String(i)}`, n)]));
  const rp = { line: { closed: true }, landed: D('pair-another-end', [E('screen-list'), E(`row-${B1}`)]), end: D('tab-needs', [E('screen-needs-input'), E(`needs-row-${B1}`)]), doorRows: [B1], macs: rpMacs, lastName: 'p345-laptop', expectCount: 4 };
  check('RP pass', gradeRP(rp), true);
  check('RP fail: the re-pair landed on Needs input, build 10\'s landing (Phase 348, D1)', gradeRP({ ...rp, landed: D('pair-another-end', [E('screen-needs-input'), E(`needs-row-${B1}`)]) }), false);
  check('RP unreadable: no Needs input read after the tab press', gradeRP({ ...rp, end: null }), null);
  check('RP fail: not moved to the end', gradeRP({ ...rp, macs: four, lastName: 'p345-laptop' }), false);
  // The fix round: the count is the kept list's (two when RP runs without CAP).
  const rpTwo = D('macs', ['p345-studio', 'p345-laptop'].flatMap((n, i) => [E(`macs-row-${String(i)}`), E(`macs-row-name-${String(i)}`, n)]));
  check('RP pass: two Macs kept, two drawn', gradeRP({ ...rp, macs: rpTwo, expectCount: 2 }), true);
  check('RP fail: a Mac lost by the re-pair', gradeRP({ ...rp, expectCount: 5 }), false);

  // UP
  const up = { landed: { where: 'needs-input' }, unpaired: D('unpair-one', [E('screen-needs-input'), E(`needs-row-${A_ID}`)]), aRows: [A_ID], idleDialled: 0, idleMs: 20_100, relaunch: D('macs', ['p345-studio.tail00000.ts.net', 'p345-studio.tail99999.ts.net', 'p345-cmac'].flatMap((n, i) => [E(`macs-row-${String(i)}`), E(`macs-row-name-${String(i)}`, n)])), relaunchAbsent: false, expectAfterRelaunch: ['p345-studio.tail00000.ts.net', 'p345-studio.tail99999.ts.net', 'p345-cmac'], stillListed: true, finalFound: false, finalTabs: tabs3, finalSettings: moved, reference: moved };
  check('UP pass', gradeUP(up), true);
  check('UP fail: Unpair landed on Pairing', gradeUP({ ...up, landed: { where: 'pairing' } }), false);
  check('UP fail: the unpaired Mac dialled', gradeUP({ ...up, idleDialled: 1 }), false);
  check('UP fail: the unpaired Mac came back', gradeUP({ ...up, relaunch: four }), false);
  check('UP fail: a Macs tab at one Mac', gradeUP({ ...up, finalFound: true }), false);
  check('UP unreadable: the idle too short', gradeUP({ ...up, idleMs: 9_000 }), null);
  check('UP unreadable: the bar never read at one Mac', gradeUP({ ...up, finalFound: null, finalTabs: null }), null);

  const v10 = D('settings', [...base.elements, E('settings-version', '1.0.0 (10)', [16, 700, 300, 14])]);
  const v11 = D('settings', [...moved.elements, E('settings-version', '1.0.0 (11)', [16, 766, 300, 14])]);
  is('screenDiff: About\'s build number moves on purpose, its frame still held', screenDiff(v10, v11, shiftOf(v11)).length === 0 && screenDiff(v10, D('settings', v11.elements.map((e) => (e.id === 'settings-version' ? { ...e, frame: [16, 700, 300, 14] } : e))), shiftOf(v11)).length === 1);

  // RUN
  const run = { preflights: [true, true], samples: 40, realTailscale: 0, forbidden: 0, standinsLeft: 0, doorsLeft: 0, electronsLeft: 0, devices: { named: 0, booted: 0 }, history: { moved: false }, dnsPreflights: [true, true], agentsHeld: [true, true] };
  check('RUN pass', gradeRun(run), true);
  check('RUN fail: a real Tailscale', gradeRun({ ...run, realTailscale: 1 }), false);
  check('RUN fail: his history moved', gradeRun({ ...run, history: { moved: true, before: [1, 1], after: [2, 2] } }), false);
  check('RUN fail: a device left', gradeRun({ ...run, devices: { named: 1, booted: 0 } }), false);

  // Arms never graded (the review): a device that threw leaves its arms UNREADABLE.
  const askedAll = new Set(DEVICE_ARMS.order);
  const gradedAll = { order: new Set(DEVICE_ARMS.order), floor: new Set(DEVICE_ARMS.floor) };
  is('ungradedArms: every arm graded on both devices', ungradedArms(new Set(['order', 'floor']), askedAll, gradedAll).length === 0);
  is('ungradedArms: the order device threw after T1', J(ungradedArms(new Set(['order']), askedAll, { order: new Set(['U0', 'P1', 'AL1', 'T1']), floor: new Set() }).map((x) => x.id)) === J(['T2', 'T3', 'AL2', 'S1', 'S2', 'CAP', 'H', 'HN', 'DG', 'RM', 'RP', 'UP']));
  is('ungradedArms: the floor device never ran', J(ungradedArms(new Set(['order', 'floor']), askedAll, { order: gradedAll.order, floor: new Set() })) === J(DEVICE_ARMS.floor.map((id) => ({ key: 'floor', id }))));
  is('ungradedArms: only the arms asked for', J(ungradedArms(new Set(['floor']), new Set(['UP', 'H']), { order: new Set(), floor: new Set() })) === J([{ key: 'floor', id: 'UP' }]));

  // THE REVIEW'S RECORDED FIXTURES (build/p345/fixtures, HOW-WE-BUILT-THIS.md
  // rule 9): each drive's lines read through the SAME reader the run calls and
  // composed as its call site composes them, then graded; each other grader on
  // its recorded readings. The relay is rebuilt from its recorded log with the
  // relay's own `between` rule. A fixture file that does not read fails.
  const FIX = join(ROOT, 'build', 'p345', 'fixtures');
  const relayOf = (log) => ({ between: (name, from = 0, to = Infinity) => log.filter((x) => (name === null ? x.name !== null : x.name === String(name).toLowerCase()) && x.at >= from && x.at < to && x.outcome !== 'unknown-name').length });
  const wantOf = { pass: true, fail: false, unreadable: null };
  const COMPOSE = {
    T2: (d, relay) => gradeT2({ ...readT2(d.events, relay), ...d.context }),
    AL2: (d) => gradeAlertOpens({ mainBlocked: d.context.mainBlocked, delivered: d.context.delivered, banner: lineOf(d.events, 'banner')?.label ?? null, name: 'a-ask3', ...readAL2(d.events), senderIndex: d.context.senderIndex }),
    S2: (d, relay) => gradeS2({ ...readS2(d.events, relay), ...d.context }),
    DG: (d) => gradeDG({ install: d.context.install, ...readDG(d.events), parentReference: d.context.parentReference, expectCount: d.context.expectCount }),
    RM: (d) => gradeRM({ removed: d.context.removed, ...readRM(d.events) }),
    UP: (d, relay) => gradeUP({ ...readUP(d.events, relay), ...d.context })
  };
  const GRADERS = { U0: gradeU0, P1: gradeP1, AL: gradeAlertOpens, T1: gradeT1, T3: gradeT3, S1: gradeS1, CAP: gradeCap, H: gradeH, HN: gradeHN, RP: gradeRP, RUN: gradeRun };
  let recorded = null;
  try {
    recorded = { drives: JSON.parse(readFileSync(join(FIX, 'drives.json'), 'utf8')).drives, graders: JSON.parse(readFileSync(join(FIX, 'graders.json'), 'utf8')).graders };
  } catch (err) {
    is('the recorded fixtures read', false, String(err?.message ?? err));
  }
  if (recorded !== null) {
    const both = (list, key, names) => names.every((n) => list.some((x) => x[key] === n && x.want === 'pass') && list.some((x) => x[key] === n && x.want !== 'pass'));
    is('recorded: every reader arm has an honest drive and a broken one', both(recorded.drives, 'arm', Object.keys(COMPOSE)), `${String(recorded.drives.length)} drives`);
    is('recorded: every other grader has an honest reading and a broken one', both(recorded.graders, 'grader', Object.keys(GRADERS)), `${String(recorded.graders.length)} readings`);
    for (const d of recorded.drives) check(`${d.arm} recorded: ${d.name}`, COMPOSE[d.arm](d, relayOf(d.relayLog)), wantOf[d.want]);
    for (const g of recorded.graders) check(`${g.grader} recorded: ${g.name}`, GRADERS[g.grader](g.reading), wantOf[g.want]);
  }
  // THE PROBE REVIEW (Phase 348, rule 9): the manifest's programs, each Mac's, after the apps are gone.
  {
    const run = '/private/tmp/p345-probe-1';
    const honestM = { read: true, rows: [{ id: 'a', name: 'a-shell', agent: 'shell', argv0: '/bin/zsh' }, { id: 'b', name: 'a-ask', agent: 'claude', argv0: `${run}/a/home/.local/bin/claude` }], why: null };
    const mv = (m) => manifestProgramsVerdict({ manifest: m, run, shells: new Set(['/bin/zsh']) });
    check('RUN (the review) every program this run\'s', mv(honestM), true);
    check('RUN (the review) a claude row on his real Claude Code', mv({ ...honestM, rows: [...honestM.rows, { id: 'x', name: 'b-ask1', agent: 'claude', argv0: '/Users/gdc/.local/bin/claude' }] }), false);
    check('RUN (the review) a shell row that is no system shell', mv({ ...honestM, rows: [{ id: 'y', name: 'x', agent: 'shell', argv0: '/opt/homebrew/bin/fish' }] }), false);
    check('RUN (the review) a manifest not read', mv({ read: false, rows: [], why: 'locked' }), null);
  }
  // THE PROBE REVIEW'S OWN RECORDED READINGS (Phase 348, docs/method/HOW-WE-BUILT-THIS.md rule 9), in
  // build/p348/fixtures/reviewer/p345.json: T1, RP and P1 as Phase 348 moved them, in the shape the run assembles
  // them, each honest reading beside readings ONE thing away from it, answering exactly PASS, FAIL or UNREADABLE.
  {
    let review = null;
    try {
      review = JSON.parse(readFileSync(join(ROOT, 'build', 'p348', 'fixtures', 'reviewer', 'p345.json'), 'utf8')).graders;
    } catch (err) {
      is('the review\'s Phase 348 readings read', false, String(err?.message ?? err));
    }
    if (review !== null) {
      for (const g of review) {
        if (GRADERS[g.grader] === undefined) is(`the review's ${g.name}`, false, `no grader ${String(g.grader)}`);
        else check(`${g.grader} the review: ${g.name}`, GRADERS[g.grader](g.reading), wantOf[g.want]);
      }
      const reached = ['T1', 'RP', 'P1'].filter((id) => review.some((g) => g.grader === id && g.want === 'pass') && review.some((g) => g.grader === id && g.want !== 'pass'));
      is('the review\'s readings reach T1, RP and P1, honest and broken', reached.length === 3, J(reached));
    }
  }

  const bad = results.filter((x) => !x).length;
  console.log(bad === 0 ? `${TAG} grader self-test PASS: ${String(results.length)} cases, every grader red on its broken reading and green on its own.` : `${TAG} grader self-test FAIL: ${String(bad)} of ${String(results.length)}.`);
  process.exit(bad === 0 ? 0 : 1);
}

if (process.argv.includes('--grader-self-test')) selfTest();

// ---------------------------------------------------------------------------
// B0, the preflight, asked once before anything is started or served
// ---------------------------------------------------------------------------

const PARENT = (process.env['P345_PARENT_CHECKOUT'] ?? '').trim();
const PROJECT = join(ROOT, 'ios', 'Tortie.xcodeproj');
const DEVICES = new Set(((process.env['P345_DEVICES'] ?? '').trim() || 'order,floor').split(',').map((s) => s.trim()));
const RUNTIMES = [...(DEVICES.has('order') ? [RUNTIME_CURRENT] : []), ...(DEVICES.has('floor') ? [RUNTIME_FLOOR] : [])];

function preflight() {
  if (!existsSync(join(ROOT, 'out', 'main', 'index.js'))) {
    console.error(`${TAG} this checkout has no build at out/main/index.js. Run npm run build first.`);
    process.exit(2);
  }
  if (!existsSync(PROJECT)) {
    console.error(`${TAG} there is no ios/Tortie.xcodeproj, so there is no app to drive.`);
    process.exit(2);
  }
  const missing = simulatorHarnessMissing({ runtimes: RUNTIMES.length > 0 ? RUNTIMES : [RUNTIME_CURRENT] });
  if (missing !== null) {
    console.error(`${TAG} ${missing}`);
    process.exit(2);
  }
  if (PARENT !== '' && !existsSync(join(resolve(PARENT), 'ios', 'Tortie.xcodeproj'))) {
    console.error(`${TAG} P345_PARENT_CHECKOUT names ${PARENT}, which holds no ios/Tortie.xcodeproj.`);
    process.exit(2);
  }
}
preflight();
if (process.argv.includes('--preflight')) {
  say('preflight passed: the build, Xcode, the runtimes and the device type are here');
  process.exit(0);
}

// ---------------------------------------------------------------------------
// The run's world
// ---------------------------------------------------------------------------

const ARMS = new Set(((process.env['P345_ARMS'] ?? '').trim() || 'U0,P1,AL1,T1,T2,T3,AL2,S1,S2,CAP,H,HN,DG,RM,RP,UP').split(',').map((s) => s.trim()));
const KEEP = (process.env['P345_KEEP'] ?? '') === '1';
const WAIT_S = (process.env['P345_WAIT_S'] ?? '').trim() || '150';
const SCHEME = 'Tortie';
const BUNDLE_ID = 'com.itavero.tortie.phone';
const UI_TEST = 'TortieUITests/P316DriveUITests/testDrive';
const RUN = `/private/tmp/p345-probe-${PID}`;
const XCODE = join(RUN, 'xcode');
const DD = resolve((process.env['P345_DERIVED_DATA'] ?? '').trim() || join(XCODE, 'dd'));
const PARENT_DD = resolve((process.env['P345_PARENT_DERIVED_DATA'] ?? '').trim() || join(XCODE, 'dd-parent'));
const HEAD_APP = join(DD, 'Build', 'Products', 'Debug-iphonesimulator', 'Tortie.app');
const PARENT_APP = join(PARENT_DD, 'Build', 'Products', 'Debug-iphonesimulator', 'Tortie.app');
const DIALOG = join(ROOT, 'src/main/activity/__tests__/fixtures/claude-permission-prompt.txt');
const KEY_ID = 'P345SCRATC';
const TOPIC = BUNDLE_ID;
/** Each device's own alert address: a DEBUG seam value, never Apple's. */
const TOKENS = Object.freeze({ order: randomBytes(32).toString('hex'), floor: randomBytes(32).toString('hex') });
const deviceDigest = (token) => shaHex(String(token).toLowerCase()).slice(0, 8);
const OWN_DEVICES = `p316-p345-${PID}-`;
const INHERITED_CLAUDE = Object.fromEntries(Object.keys(process.env).filter((n) => /^(?:CLAUDECODE|CLAUDE_)/.test(n)).map((n) => [n, undefined]));

/** One Mac's world. */
function macWorld(key, name, socket, { alerts, shells, waiting }) {
  const dir = join(RUN, key.toLowerCase());
  const harness = join(dir, 'harness');
  return {
    key,
    name,
    first: firstLabel(name),
    socket,
    alerts,
    shells,
    waiting,
    dir,
    home: join(dir, 'home'),
    harness,
    profile: join(harness, 'profile'),
    work: join(dir, 'project'),
    bin: join(dir, 'home', '.local', 'bin'),
    // THE PROBE REVIEW (Phase 348, rule 9): ONE `node` link for the Electron shim, and nothing else of that folder.
    nodeBin: join(dir, 'nodebin'),
    stop: join(dir, 'stop'),
    alertsDir: join(harness, 'alerts'),
    keyFile: join(harness, 'alerts', `AuthKey_${KEY_ID}.p8`),
    standinDir: join(dir, 'standin'),
    standin: null,
    dns: null,
    cdp: null,
    shimPid: 0,
    appPid: 0,
    reader: null,
    readerDoor: null,
    ids: {},
    extra: []
  };
}
/**
 * THE LOGIN PATH AND THE APP'S OWN PATH (the Phase 348 probe review,
 * docs/method/HOW-WE-BUILT-THIS.md rule 9; the rule probe:p313, probe:p346
 * and probe:p348 keep): each Mac's stand-ins, one `node` link, the system
 * folders, and NOTHING of whoever ran the probe. Before the review each app
 * inherited the verifier's PATH and its scratch `.zprofile` put that PATH
 * behind the stand-in, so Tortie's detection scan could run the person's own
 * Cursor, Muse, pi, OpenCode and DeepSeek CLIs, and the copies of Claude Code
 * and Codex behind the stand-ins, with `--version` from his own folders.
 */
const loginPathOf = (mac) => `${mac.bin}:/usr/bin:/bin:/usr/sbin:/sbin`;
const appPathOf = (mac) => `${mac.bin}:${mac.nodeBin}:/usr/bin:/bin:/usr/sbin:/sbin`;
/** The variables the registry's rows name in their own install folders (`$NVM_BIN`…), read as text; no app is handed one. */
const ROW_DIR_UNSET = (() => {
  let src = '';
  try {
    src = readFileSync(join(ROOT, 'src', 'main', 'agents', 'registry.ts'), 'utf8');
  } catch {
    src = '';
  }
  const names = new Set(['NVM_BIN']);
  for (const m of src.matchAll(/extraProbeDirs:\s*\[([^\]]*)\]/g)) for (const v of m[1].matchAll(/\$\{?([A-Za-z_][A-Za-z0-9_]*)\}?/g)) names.add(v[1]);
  return Object.freeze(Object.fromEntries([...names].map((n) => [n, undefined])));
})();
const MAC_A = macWorld('A', A_NAME, `gmux-p345a-${PID}`, { alerts: true, shells: ['a-shell'], waiting: ['a-ask'] });
const MAC_B = macWorld('B', B_NAME, `gmux-p345b-${PID}`, { alerts: false, shells: ['b-shell'], waiting: ['b-ask1', 'b-ask2'] });
const MACS = [MAC_A, MAC_B];

/** His shell history's size and time, the only thing ever read of it. */
function historyStat() {
  const out = [];
  for (const f of ['.zsh_history', '.bash_history']) {
    try {
      const st = statSync(join(homedir(), f));
      out.push([st.size, Math.floor(st.mtimeMs / 1000)]);
    } catch {
      out.push(null);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// The report
// ---------------------------------------------------------------------------

const report = { arms: [], readings: {}, devices: [...DEVICES], parent: PARENT === '' ? null : PARENT, modelTurns: 0 };
let failures = 0;
const SECRETS = [];
const unsecret = (text) => SECRETS.reduce((t, s) => (typeof s === 'string' && s.length > 8 ? t.split(s).join('<secret>') : t), String(text));
/** Which arms each device gave a verdict, by the arm's first word; the device being driven now. */
const graded = { order: new Set(), floor: new Set() };
let gradingOn = null;
const arm = (id, v) => {
  const text = unsecret(v.said);
  if (gradingOn !== null) graded[gradingOn].add(String(id).split(' ')[0]);
  report.arms.push({ id, ok: v.ok, said: text });
  if (v.ok === false) failures += 1;
  say(`${v.ok === null ? 'UNREADABLE' : v.ok ? 'PASS' : 'FAIL'} ${id}: ${text}`);
};
const unreadableArm = (id, why) => arm(id, verdict(null, why));

// ---------------------------------------------------------------------------
// The Macs, through their own bridges
// ---------------------------------------------------------------------------

async function attach(mac, timeoutMs) {
  const started = Date.now();
  let why = 'no DevToolsActivePort yet';
  for (;;) {
    try {
      const port = Number(readFileSync(join(mac.profile, 'DevToolsActivePort'), 'utf8').split('\n')[0].trim());
      if (Number.isFinite(port) && port > 0) {
        const list = await (await fetch(`http://127.0.0.1:${String(port)}/json/list`)).json();
        const picked = pickRendererTarget(list);
        if (picked.target !== null) return await wsConnect(picked.target.webSocketDebuggerUrl);
        why = picked.why;
      }
    } catch (err) {
      why = String(err?.message ?? err);
    }
    if (Date.now() - started > timeoutMs) throw new Error(`${mac.key}: no app window: ${why}`);
    await sleep(300);
  }
}

const agentsHeld = [];
async function armed(cdp) {
  await cdp.call('Runtime.enable');
  for (let i = 0; i < 200; i += 1) {
    if ((await cdpEval(cdp, 'window.gmux !== undefined && window.gmux.pocket !== undefined && window.__gmuxP93 !== undefined && window.__gmuxP202 !== undefined')) === true) {
      const held = quietAgentsHeld(JSON.parse(await cdpEval(cdp, 'window.gmux.agentsList().then((r) => JSON.stringify(r))')));
      agentsHeld.push(held.ok);
      if (!held.ok) throw new Error(`agents:list says the renamed agents are not all absent: ${held.problems.join('; ')}`);
      return true;
    }
    await sleep(300);
  }
  return false;
}

async function pocket(mac, method, arg) {
  const call = arg === undefined ? `window.gmux.pocket[${J(method)}]()` : `window.gmux.pocket[${J(method)}](${J(arg)})`;
  return JSON.parse(await cdpEval(mac.cdp, `(async () => { try { const v = await ${call}; return JSON.stringify({ ok: true, value: v === undefined ? null : v }); } catch (e) { return JSON.stringify({ ok: false, error: String((e && e.message) || e) }); } })()`));
}

async function mainSessions(mac) {
  return JSON.parse(await cdpEval(mac.cdp, 'window.gmux.sessions.list().then((s) => JSON.stringify(s.map((x) => ({ id: x.id, name: x.name, status: x.status }))))'));
}

async function waitStatus(mac, test, ms) {
  const started = Date.now();
  let last = null;
  for (;;) {
    const got = await pocket(mac, 'status');
    last = got.ok ? got.value : null;
    if (last !== null && test(last)) return { ok: true, status: last };
    if (Date.now() - started >= ms) return { ok: false, status: last };
    await sleep(400);
  }
}

const pairableNow = (s) => s.pairable === true || (s.pairable === undefined && s.state === 'listening');

/** Confirm the door as it stands, once its lines name this Mac's stand-in name, and wait until a code may show. */
async function confirmListening(mac) {
  const now = await waitStatus(
    mac,
    (s) => (s.state === 'listening' && s.confirmState === 'confirmed') || (s.confirmable === true && s.state !== 'opening' && s.confirmLines.some((l) => l.includes(`https://${mac.name}:${String(s.publicPort)}`))),
    30_000
  );
  if (!now.ok) return { ok: false, why: `the lines never named ${mac.name}: ${J({ state: now.status?.state, confirmable: now.status?.confirmable, refusal: now.status?.refusal })}` };
  if (now.status.state === 'listening' && now.status.confirmState === 'confirmed') {
    const p = await waitStatus(mac, pairableNow, 65_000);
    return { ok: p.ok, why: `already confirmed, pairable ${String(p.status?.pairable)}` };
  }
  const c = await pocket(mac, 'confirmDoor', { linesRead: now.status.confirmLines, hashRead: now.status.confirmHash });
  const l = await waitStatus(mac, pairableNow, 65_000);
  return { ok: c.ok && c.value.allowed === true && l.ok, why: c.ok ? `confirm allowed=${String(c.value.allowed)}, state ${String(l.status?.state)}` : c.error };
}

/**
 * The door answering again (the fix round): on, confirmed as it stands, and
 * published, with its forwarder up, when it is not so already. A door that is
 * listening and confirmed is left alone, so a base where a Remove keeps the
 * door answering is driven exactly as before.
 */
async function doorBack(mac) {
  const now = await waitStatus(mac, (s) => s.state === 'listening' && s.confirmState === 'confirmed', 1_000);
  if (now.ok && forwarderPortOf(mac) !== 0) return { ok: true, why: 'already listening', moved: false };
  if (now.status?.state === 'off') await pocket(mac, 'setDoor', { on: true });
  const c = await confirmListening(mac);
  const l = await waitStatus(mac, (s) => s.state === 'listening' && s.confirmState === 'confirmed', 30_000);
  for (let i = 0; i < 40 && forwarderPortOf(mac) === 0; i += 1) await sleep(250);
  return { ok: c.ok && l.ok && forwarderPortOf(mac) !== 0, why: `${c.why}; state ${String(l.status?.state)}, confirm ${String(l.status?.confirmState)}, forwarder ${String(forwarderPortOf(mac))}`, moved: true };
}

/** A pairing window on `mac`: its code must read the phone's way and name this Mac. */
async function openWindow(mac) {
  const offered = await pocket(mac, 'beginPairing');
  if (!offered.ok) return { ok: false, why: offered.error.slice(0, 200) };
  const read = readOffer(offered.value.payload);
  if (!read.ok) return { ok: false, why: `the code does not read the phone's way: ${read.why}` };
  if (read.offer.host !== mac.name) return { ok: false, why: `the code names ${J(read.offer.host)}, not ${mac.name}` };
  SECRETS.push(read.offer.ps);
  return { ok: true, payload: offered.value.payload, offer: read.offer };
}

/** The Mac's live Funnel forwarder, or 0 while nothing is published. */
const forwarderPortOf = (mac) => mac.standin?.readFunnel()[0]?.forwarderPort ?? 0;

/** A `claude` stand-in session that blocks on the committed dialog; resolves once main reads it waiting. */
async function blockNew(mac, name) {
  await cdpEval(mac.cdp, `window.__gmuxP202.createSession(${J(name)}, 'claude').then(() => true).catch(() => false)`);
  let found = null;
  for (let i = 0; i < 90; i += 1) {
    found = (await mainSessions(mac)).find((x) => x.name === name) ?? null;
    if (found?.status === 'needs_input') break;
    await sleep(1_000);
  }
  if (found !== null) mac.ids[name] = found.id;
  return { mainBlocked: found?.status === 'needs_input', sessionId: found?.id ?? null };
}

/** End a session this run made, and remove its row. */
async function endOne(mac, id) {
  if (id === null || id === undefined) return;
  await cdpEval(mac.cdp, `window.gmux.sessions.kill(${J(id)}).catch(() => 0).then(() => window.gmux.sessions.discard(${J(id)}).catch(() => 0)).then(() => true)`);
}

/** What one Mac's door answers now, read by its own node reader on its forwarder (never the relay). */
async function doorRead(mac, target) {
  if (mac.reader === null) return null;
  const a = await signedGet(mac.reader, mac.readerDoor, target);
  try {
    return a.status === 200 ? JSON.parse(a.body) : null;
  } catch {
    return null;
  }
}
const doorBlocked = (mac) => doorRead(mac, '/v1/blocked');
const doorSessions = async (mac) => (mac.reader === null ? null : (await readSessions(mac.reader, mac.readerDoor, {})).answer ?? null);
/** Whether `needle` is on the screen of `mac`'s session `id`, as its door composes it. */
async function paneHolds(mac, id, needle) {
  if (mac.reader === null || id === undefined) return null;
  const got = await screenRead(mac.reader, mac.readerDoor, id);
  const lines = got.answer?.screen?.lines;
  if (!Array.isArray(lines)) return null;
  return lines.some((l) => screenRowText(l).includes(needle));
}
async function phonesOf(mac) {
  const s = await pocket(mac, 'status');
  return s.ok ? (s.value?.phones ?? []).map((p) => p.id) : null;
}

/** Boot one Mac inside its launch: sessions, the door published and confirmed, its alerts, its node reader. */
async function bootMac(mac, handle) {
  mac.shimPid = handle.pid;
  mac.cdp = await attach(mac, 150_000);
  try {
    mac.appPid = handle.appPid();
  } catch {
    mac.appPid = 0;
  }
  if (!(await armed(mac.cdp))) throw new Error(`${mac.key}: the app never armed its bridge`);
  await cdpEval(mac.cdp, `window.__gmuxP93.setup(${J({ path: mac.work, names: mac.shells })}).then(() => true)`);
  for (const s of await mainSessions(mac)) if (mac.shells.includes(s.name)) mac.ids[s.name] = s.id;
  const blocked = [];
  for (const name of mac.waiting) blocked.push(await blockNew(mac, name));
  const on = await pocket(mac, 'setDoor', { on: true });
  const opened = on.ok ? await confirmListening(mac) : { ok: false, why: on.error };
  const listening = await waitStatus(mac, (s) => s.state === 'listening', 20_000);
  relay.setBackend(mac.name, () => forwarderPortOf(mac));
  const boot = { opened: opened.ok, why: opened.why, publicName: listening.status?.publicName ?? null, forwarder: forwarderPortOf(mac) > 0, blocked: blocked.map((b) => b.mainBlocked) };
  if (!opened.ok || !listening.ok || listening.status.publicName !== mac.name || forwarderPortOf(mac) === 0) throw new Error(`${mac.key}: the door did not publish: ${J(boot)}`);
  if (mac.alerts) {
    // As probe:p316's N1 and N2: the key through the bridge, then the switch, then the lines confirmed again.
    await pocket(mac, 'choosePushKey');
    const keyed = await waitStatus(mac, (s) => s.pushKeyId === KEY_ID, 15_000);
    const sw = await pocket(mac, 'setPushAlerts', { on: true });
    const swOn = sw.ok ? await waitStatus(mac, (s) => s.pushAlerts === true, 15_000) : { ok: false };
    const again = swOn.ok ? await confirmListening(mac) : { ok: false, why: 'pushAlerts never read on' };
    boot.alerts = { keyed: keyed.ok, on: swOn.ok, confirmed: again.ok };
    if (!keyed.ok || !swOn.ok || !again.ok) throw new Error(`${mac.key}: alerts did not arm: ${J(boot.alerts)}`);
  }
  // The node reader, on the forwarder directly, so the relay counts the phone alone.
  const w = await openWindow(mac);
  if (!w.ok) throw new Error(`${mac.key}: no window for the node reader: ${w.why}`);
  const reader = makePhone(`p345 reader ${mac.key}`, w.offer.dx);
  const readerDoor = {
    get port() {
      return forwarderPortOf(mac);
    },
    name: w.offer.host,
    publicPort: w.offer.port,
    pin: w.offer.fp
  };
  const paired = await pairThrough(readerDoor, w.offer, reader, {
    tries: 30,
    everyMs: 500,
    between: async () => {
      const sheet = await pocket(mac, 'pairingState');
      if (sheet.ok && sheet.value.state === 'presented') await pocket(mac, 'allowPhone', { linesRead: sheet.value.lines, hashRead: sheet.value.hash });
    }
  });
  await pocket(mac, 'cancelPairing');
  if (!paired.ok) throw new Error(`${mac.key}: the node reader did not pair: ${paired.why}`);
  mac.reader = reader;
  mac.readerDoor = readerDoor;
  mac.readerPhoneId = ((await phonesOf(mac)) ?? []).at(-1) ?? null;
  report.readings[`boot-${mac.key}`] = boot;
}

// ---------------------------------------------------------------------------
// The node doors
// ---------------------------------------------------------------------------

const doorChildren = new Set();
/** Start one node door as a child under tsx; resolves with its first line and a live event list. */
function startDoor(argv, label) {
  return new Promise((done) => {
    const child = spawn(process.execPath, hostileDoorArgv(['serve', ...argv]), { cwd: ROOT, env: { ...process.env, P316_HOSTILE_INNER: '1' }, stdio: ['pipe', 'pipe', 'pipe'] });
    doorChildren.add(child);
    const events = [];
    let buf = '';
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      done(value);
    };
    const timer = setTimeout(() => finish({ label, child, facts: null, events, why: 'the door printed nothing in 90 s' }), 90_000);
    child.stdout.on('data', (c) => {
      buf += c.toString('utf8');
      let at;
      while ((at = buf.indexOf('\n')) !== -1) {
        const line = buf.slice(0, at);
        buf = buf.slice(at + 1);
        if (line.startsWith('P316_DOOR_EVENT:')) events.push({ ...JSON.parse(line.slice('P316_DOOR_EVENT:'.length)), seenAt: Date.now() });
        else if (line.startsWith('P316_DOOR:')) {
          clearTimeout(timer);
          finish({ label, child, facts: JSON.parse(line.slice('P316_DOOR:'.length)), events, why: null, say: (text) => child.stdin.write(`${text}\n`) });
        }
      }
    });
    child.stderr.on('data', () => undefined);
    child.on('exit', (code) => {
      clearTimeout(timer);
      finish({ label, child, facts: null, events, why: `the door exited ${String(code)} before it served` });
    });
  });
}
/** End a node door: close its stdin, SIGTERM, then SIGKILL. */
async function endDoor(child) {
  if (child === null || child === undefined || child.exitCode !== null || child.signalCode !== null) return;
  try {
    child.stdin.end();
  } catch {
    /* already closed */
  }
  child.kill('SIGTERM');
  const deadline = Date.now() + 3_000;
  while (child.exitCode === null && child.signalCode === null && Date.now() < deadline) await sleep(100);
  if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
}
const doorRequests = (door, test = () => true, from = 0, to = Infinity) => (door?.events ?? []).filter((e) => e.kind === 'request' && e.seenAt >= from && e.seenAt < to && test(e));

// ---------------------------------------------------------------------------
// One drive of the UI test, its lines read live
// ---------------------------------------------------------------------------

/** Every known name's request records now (the relay's tally), for a window's two ends. */
const recordsNow = () => (relay === null ? {} : Object.fromEntries(relay.names().map((n) => [n, relay.counts(n).requests])));

let runCounter = 0;
/**
 * One `P316DriveUITests/testDrive` on `sim`, its lines read from stdout and
 * the file it appends to, each handed to the reactions as it arrives, each
 * stamped with when this process read it and the relay's counts then.
 */
async function drive(sim, { label, steps, parent = false, keep = true, payload = '', device, reactions = {} }) {
  runCounter += 1;
  const run = `${PID}-${String(runCounter)}`;
  const marker = `P316|${run}|`;
  const acks = join(XCODE, `acks-${run}`);
  mkdirSync(acks, { recursive: true });
  const linesFile = join(XCODE, `lines-${run}.txt`);
  rmSync(linesFile, { force: true });
  const events = [];
  const pending = [];
  const errors = [];
  const seen = new Set();
  const take = (line) => {
    const at = line.indexOf(marker);
    if (at === -1) return;
    let event;
    try {
      event = JSON.parse(line.slice(at + marker.length).trim());
    } catch {
      return;
    }
    if (event === null || typeof event !== 'object') return;
    if (event.seq !== undefined) {
      if (seen.has(event.seq)) return;
      seen.add(event.seq);
    }
    event.receivedAt = Date.now();
    event.relay = relay.snapshot();
    event.records = recordsNow();
    events.push(event);
    pending.push(Promise.resolve().then(() => react(event)).catch((err) => errors.push(String(err?.message ?? err))));
  };
  const ack = (name) => writeFileSync(join(acks, name), 'ok\n');
  const react = async (event) => {
    if (event.step === 'fingerprint' && typeof reactions.fingerprint === 'function') await reactions.fingerprint(event, events);
    if (event.step === 'sessions-before') {
      const tag = String(event.tag);
      event.markAt = Date.now();
      event.recordsAt = recordsNow();
      try {
        event.markResult = typeof reactions.marks?.[tag] === 'function' ? await reactions.marks[tag]() : null;
      } finally {
        event.markDoneAt = Date.now();
        event.relayAfter = relay.snapshot();
        event.recordsAfter = recordsNow();
        ack(`sessions-${String(event.seq)}`);
      }
    }
    if (event.step === 'setup-failure-before') {
      const tag = String(event.tag);
      try {
        event.markResult = typeof reactions.marks?.[`setup:${tag}`] === 'function' ? await reactions.marks[`setup:${tag}`]() : null;
      } finally {
        ack(`setup-${tag}`);
      }
    }
    // A key of the bar waits on its own acknowledgement as a typed line does
    // (the fix round: T2 puts the keyboard away with `screen-key:hide`).
    if (event.step === 'screen-type-ready' || event.step === 'screen-key-ready') ack(`screen-${String(event.seq)}`);
    if (event.step === 'ready-for-alert') {
      const item = (reactions.alerts ?? []).shift() ?? null;
      if (item === null) return;
      let body = null;
      try {
        body = await item.prepare();
      } catch (err) {
        item.why = String(err?.message ?? err);
      }
      if (body === null) return;
      const sent = await sim.push(BUNDLE_ID, body).catch((err) => ({ code: -1, stderr: String(err?.message ?? err) }));
      item.delivered = { code: sent.code, bytes: Buffer.byteLength(body), sha: shaHex(body).slice(0, 12) };
    }
    if (event.step === 'screen' && typeof reactions.dump === 'function') await reactions.dump(event);
    if (typeof reactions.any === 'function') await reactions.any(event);
  };
  let offset = 0;
  let partial = '';
  const readNew = async () => {
    let buf;
    try {
      buf = await readFileAsync(linesFile);
    } catch {
      return;
    }
    if (buf.length <= offset) return;
    partial += buf.subarray(offset).toString('utf8');
    offset = buf.length;
    let at;
    while ((at = partial.indexOf('\n')) !== -1) {
      take(partial.slice(0, at));
      partial = partial.slice(at + 1);
    }
  };
  let tailing = true;
  const tail = (async () => {
    while (tailing) {
      await readNew();
      await sleep(250);
    }
    await readNew();
  })();
  let r;
  try {
    r = await sim.xcodebuild(['test-without-building', '-project', parent ? join(resolve(PARENT), 'ios', 'Tortie.xcodeproj') : PROJECT, '-scheme', SCHEME, `-only-testing:${UI_TEST}`], {
      label: `${label}-${device.key}`,
      timeoutMs: 2_400_000,
      derivedDataPath: parent ? PARENT_DD : DD,
      testEnv: {
        P316_RUN: run,
        P316_LINES: linesFile,
        P316_STEPS: steps.join(','),
        P316_WAIT_S: WAIT_S,
        P316_PAYLOAD: payload,
        P316_ACKS: acks,
        P330_DOOR_ENDPOINT: `127.0.0.1:${String(relay.port)}`,
        P316_PUSH_TOKEN: device.token,
        P316_NOTIFICATIONS: 'allow',
        ...(keep ? { P345_KEEP_PAIRING: '1' } : {})
      },
      onLine: take
    });
  } finally {
    tailing = false;
    await tail;
  }
  await Promise.all(pending);
  events.sort((a, b) => Number(a?.seq ?? 0) - Number(b?.seq ?? 0));
  const result = { label, code: r.code, ms: r.ms, events, errors, steps };
  report.readings.drives ??= [];
  report.readings.drives.push({ device: device.key, label, code: r.code, ms: r.ms, lines: events.length, stuck: stuckOf(events), unknown: events.filter((e) => e.step === 'unknown-step').map((e) => e.name), errors });
  say(`drive ${label} on ${device.key}: exited ${String(r.code)} in ${String(r.ms)} ms, ${String(events.length)} line(s)`);
  return result;
}

/**
 * The reaction to a `fingerprint` line: the Mac whose window is open is read
 * until its sheet is presented (with the phone's alert line when the phone was
 * asked and allowed, as probe:p316 waits for it), the digits compared, and
 * Allow pressed. A node door allows on its own.
 */
function fingerprintReactor(queue, record) {
  return async (event, events) => {
    const target = queue.shift() ?? null;
    const entry = { target: target?.label ?? null, drawn: typeof event.text === 'string' ? event.text : null, macFingerprint: null, allowed: false, lines: null, at: Date.now() };
    record.push(entry);
    if (target === null || target.kind !== 'mac' || entry.drawn === null) return;
    // The phone's word on iOS's question first (a person answers iOS before the Mac).
    let notice = null;
    for (let i = 0; i < 60 && notice === null; i += 1) {
      notice = events.find((e) => e.step === 'notifications' && Number(e.seq) > Number(event.seq) && (e.answered !== undefined || e.asked === false)) ?? null;
      if (notice === null) await sleep(500);
    }
    const want = notice?.answered === 'allow' && target.mac.alerts ? `device ${deviceDigest(target.token)}` : null;
    const by = Date.now() + 20_000;
    for (let i = 0; i < 120; i += 1) {
      const v = await pocket(target.mac, 'pairingState');
      if (v.ok && v.value.state === 'presented') {
        const named = want === null || (v.value.lines ?? []).some((l) => String(l).endsWith(want));
        if (!named && Date.now() < by) {
          await sleep(500);
          continue;
        }
        entry.macFingerprint = v.value.fingerprint;
        entry.lines = (v.value.lines ?? []).length;
        if (fingerprintDigits(entry.macFingerprint) === fingerprintDigits(entry.drawn) && fingerprintDigits(entry.drawn).length === 24) {
          const a = await pocket(target.mac, 'allowPhone', { linesRead: v.value.lines, hashRead: v.value.hash });
          entry.allowed = a.ok && a.value.allowed === true;
        }
        return;
      }
      await sleep(500);
    }
  };
}

/** The doors' answers beside a dump: each Mac's waiting rows and its sessions, by id. */
async function doorsNow() {
  const out = {};
  for (const mac of MACS) {
    const b = await doorBlocked(mac);
    const s = await doorSessions(mac);
    out[mac.key] = { blocked: b === null ? null : blockedIds(b), sessions: s === null ? null : sessionsIds(s) };
  }
  return out;
}
const READ_BESIDE = /^(pair-end|pair-another-end|choose-mac|tab-needs|tab-sessions|relaunch-keep|no-banner|sessions-pull|alert|unpair-one|setup-failure-.*)$/;

/** An alert queued for a drive's `ready-for-alert`: a new session blocks on `mac`, and the stand-in's body for `token` is delivered. */
function alertFor(mac, name, token) {
  const item = { name, mainBlocked: false, sessionId: null, delivered: null, why: null };
  item.prepare = async () => {
    const from = apns.requests.length;
    const b = await blockNew(mac, name);
    item.mainBlocked = b.mainBlocked;
    item.sessionId = b.sessionId;
    if (b.sessionId !== null) mac.extra.push(b.sessionId);
    if (!b.mainBlocked) return null;
    let rec = null;
    for (let i = 0; i < 90 && rec === null; i += 1) {
      rec = apns.since(from).find((x) => x.token === token && x.status === 200 && String(x.body).includes(b.sessionId)) ?? null;
      if (rec === null) await sleep(1_000);
    }
    return rec?.body ?? null;
  };
  return item;
}

// ---------------------------------------------------------------------------
// One device's arms, in the SPEC's order
// ---------------------------------------------------------------------------

const b64 = (text) => Buffer.from(String(text), 'utf8').toString('base64url');
/**
 * A node door's code with its expiry moved on. A node door writes its code
 * once, when it starts, three minutes ahead, and a drive that pairs four of
 * them can pass that; `exp` is in no seal, signature or proof (the secret is
 * `ps`), so a code handed later is the same code with a later expiry. The
 * key order is kept, which the phone's reader requires.
 */
const freshCode = (payload, ms = 20 * 60_000) => J({ ...JSON.parse(payload), exp: Date.now() + ms });
const stepsLine = (lines) => lines.filter((x) => typeof x === 'string' && x !== '');
const readBeside = async (event) => {
  // A pairing that ended shuts every window, as probe:p316 shuts its own once
  // the phone has read with its certificate: nobody else is answered "allowed".
  if (/^pair(-another)?-end$/.test(String(event.name))) for (const mac of MACS) await pocket(mac, 'cancelPairing');
  if (READ_BESIDE.test(String(event.name))) event.doors = await doorsNow();
};

/** A window on `mac` for the phone to pair through, with the Mac's phones before it. */
async function macPairing(mac, device) {
  const phonesBefore = await phonesOf(mac);
  const w = await openWindow(mac);
  if (!w.ok) return { ok: false, why: w.why };
  return { ok: true, mac, payload: w.payload, offer: w.offer, phonesBefore, target: { kind: 'mac', mac, token: device.token, label: mac.key } };
}
/** After a drive that paired `p`: the window shut, the new phone's id and the drawn fingerprint kept. */
async function afterMacPairing(p, device, record) {
  await pocket(p.mac, 'cancelPairing');
  const after = await phonesOf(p.mac);
  const id = (after ?? []).find((x) => !(p.phonesBefore ?? []).includes(x)) ?? null;
  if (id !== null) device.phoneIds[p.mac.key] = id;
  const fp = record.find((x) => x.target === p.mac.key) ?? null;
  if (fp?.drawn) device.fingerprints[p.mac.name] = fp.drawn;
  return { phoneId: id, fp };
}
/** A node door, started once and named in the relay. */
async function nodeDoor(key, argv) {
  if (doors[key]?.facts) return doors[key];
  const d = await startDoor(argv, key);
  doors[key] = d;
  if (d.facts === null) throw new Error(`the node door ${key} did not start: ${d.why}`);
  SECRETS.push(JSON.parse(d.facts.payload).ps);
  return d;
}
/** Runs one arm's drive and grade; anything thrown is that arm UNREADABLE, never the run's end. */
async function armBlock(ids, body) {
  try {
    await body();
  } catch (err) {
    for (const id of ids) unreadableArm(id, `the drive threw: ${String(err?.message ?? err).slice(0, 300)}`);
  }
}

async function runDevice(sim, device, parentBuilt) {
  const tag = (id) => `${id} (iOS ${sim.runtime})`;
  const kept = device.kept;
  const labelOf = (name) => drawnName(name, kept);
  const aShell = MAC_A.ids['a-shell'];
  const aAsk = MAC_A.ids['a-ask'];
  const bShell = MAC_B.ids['b-shell'];
  const order = device.key === 'order';
  const waitingA = () => MAC_A.waiting.length;
  const waitingB = () => MAC_B.waiting.length;

  // Each device starts with both doors answering, whatever the device before
  // it left (the fix round: the floor device inherited B's door stopped by
  // the order device's Remove, and read T1, T2 and UP UNREADABLE).
  for (const mac of [MAC_A, MAC_B]) {
    const back = await doorBack(mac);
    if (!back.ok) say(`${mac.name}'s door is not answering at the start of the ${device.key} device: ${back.why}`);
  }

  // ---- U0 (the parent pairs A, then HEAD installed over it) or the first pairing --
  const first = await macPairing(MAC_A, device);
  if (!first.ok) throw new Error(`A opened no window for the phone: ${first.why}`);
  let p1 = null;
  if (parentBuilt) {
    const queue = [first.target];
    const record = [];
    const install = [];
    let phonesAtMark = null;
    const steps = ['pair', 'tab:needs', 'tab:sessions', `terminal-open:${aShell}`, 'catch-up', 'settings', 'sessions-mark:upgrade', 'relaunch-keep', 'tab:needs', 'tab:sessions', `terminal-open:${aShell}`, 'catch-up', 'settings'];
    const started = Date.now();
    const unknownAt = relay.unknown();
    const r = await drive(sim, {
      label: 'u0',
      steps,
      parent: true,
      keep: false,
      payload: first.payload,
      device,
      reactions: {
        fingerprint: fingerprintReactor(queue, record),
        dump: readBeside,
        marks: {
          upgrade: async () => {
            await pocket(MAC_A, 'cancelPairing');
            phonesAtMark = await phonesOf(MAC_A);
            const got = await sim.simctl('install', HEAD_APP);
            install.push({ code: got.code, err: String(got.stderr ?? '').trim().slice(0, 200) });
          }
        }
      }
    });
    const ended = Date.now();
    await afterMacPairing(first, device, record);
    const mark = markOf(r.events, 'upgrade');
    const before = mark === null ? r.events : r.events.filter((e) => Number(e.seq) < Number(mark.seq));
    const after = mark === null ? [] : r.events.filter((e) => Number(e.seq) > Number(mark.seq));
    const paired = lastDump(before, 'pair-end');
    if (paired !== null && has(paired, 'screen-needs-input')) kept.push(A_NAME);
    const phonesAfter = await phonesOf(MAC_A);
    // The relay's phone reads A again only after the mark; the reader dials the forwarder directly.
    const readsAfter = mark?.markDoneAt === undefined ? null : relay.between(A_NAME, mark.markDoneAt, ended);
    if (ARMS.has('U0')) arm(tag('U0 build 10 upgraded in place keeps its pairing and reads on'), gradeU0({ paired, install, relaunch: lastDump(after, 'relaunch-keep'), readsAfter, phonesBefore: phonesAtMark, phonesAfter }));
    device.parentSettings = lastDump(before, 'settings');
    device.oneMacSettings = lastDump(after, 'settings');
    p1 = {
      started,
      unknownAt,
      before: { needs: lastDump(before, 'tab-needs'), sessions: lastDump(before, 'tab-sessions'), terminal: lastDump(before, 'terminal'), catchUp: lastDump(before, 'catch-up'), settings: lastDump(before, 'settings') },
      after: { needs: lastDump(after, 'tab-needs'), sessions: lastDump(after, 'tab-sessions'), terminal: lastDump(after, 'terminal'), catchUp: lastDump(after, 'catch-up'), settings: lastDump(after, 'settings') }
    };
  } else {
    for (const id of ['U0', 'P1']) if (ARMS.has(id)) unreadableArm(tag(id), PARENT === '' ? 'P345_PARENT_CHECKOUT names no parent checkout, so build 10 was never measured' : 'the parent did not build');
    const queue = [first.target];
    const record = [];
    const r = await drive(sim, { label: 'pair-a', steps: ['pair', 'settings'], keep: false, payload: first.payload, device, reactions: { fingerprint: fingerprintReactor(queue, record), dump: readBeside } });
    await afterMacPairing(first, device, record);
    const paired = lastDump(r.events, 'pair-end');
    // Phase 348 (D1): HEAD's pairing lands on Sessions (build 10's, above, on Needs input).
    if (paired !== null && has(paired, 'screen-list')) kept.push(A_NAME);
    device.oneMacSettings = lastDump(r.events, 'settings');
  }
  if (!kept.includes(A_NAME)) {
    for (const id of order ? ['AL1', 'T1', 'T2', 'T3', 'AL2', 'S1', 'S2', 'CAP', 'H', 'HN', 'DG', 'RM', 'RP', 'UP'] : ['T1', 'T2', 'UP']) if (ARMS.has(id)) unreadableArm(tag(id), 'the phone never paired A, so no Mac was kept to build on');
    return;
  }

  // ---- P1's tab bar with one Mac, and AL1 (order) ------------------------------
  await armBlock([tag('P1'), tag('AL1')], async () => {
    const al1 = order && ARMS.has('AL1') ? alertFor(MAC_A, 'a-ask2', device.token) : null;
    const r = await drive(sim, { label: 'one-mac', steps: stepsLine([`macs:${b64(labelOf(A_NAME))}`, al1 === null ? '' : 'alert']), device, reactions: { dump: readBeside, alerts: al1 === null ? [] : [al1] } });
    const macsLine = lineOf(r.events, 'macs');
    if (p1 !== null && ARMS.has('P1')) {
      const others = relay.names().filter((n) => n !== A_NAME).reduce((n, name) => n + relay.between(name, p1.started, Date.now()), 0) + (relay.unknown() - p1.unknownAt);
      arm(tag('P1 one Mac kept: every screen as build 10 draws it but Settings\' one row'), gradeP1({ ...p1, tabs: macsLine?.tabs ?? null, macsDrawn: r.events.some((e) => e.step === 'screen' && e.name === 'macs') || macsLine?.found === true, otherNames: others }));
    }
    if (al1 !== null) {
      arm(tag('AL1 one Mac\'s alert opens its session'), gradeAlertOpens({ mainBlocked: al1.mainBlocked, delivered: al1.delivered, banner: lineOf(r.events, 'banner')?.label ?? null, name: 'a-ask2', dump: lastDump(r.events, 'alert') }));
      await endOne(MAC_A, al1.sessionId);
      MAC_A.extra = MAC_A.extra.filter((x) => x !== al1.sessionId);
    }
  });

  // ---- T1: a second Mac from the sheet ----------------------------------------
  await armBlock([tag('T1')], async () => {
    const p = await macPairing(MAC_B, device);
    if (!p.ok) return unreadableArm(tag('T1'), `B opened no window: ${p.why}`);
    const queue = [p.target];
    const record = [];
    const label = drawnName(B_NAME, [...kept, B_NAME]);
    // Phase 348 (D1): the sheet closes onto B's Sessions; B's Needs input is read after an explicit tab press.
    const r = await drive(sim, { label: 't1', steps: [`pair-another:${b64(p.payload)}`, 'tab:needs', `macs:${b64(label)}`], device, reactions: { fingerprint: fingerprintReactor(queue, record), dump: readBeside } });
    await afterMacPairing(p, device, record);
    const line = lineOf(r.events, 'pair-another');
    const landed = lastDump(r.events, 'pair-another-end');
    const end = lastDump(r.events, 'tab-needs');
    if (line?.closed === true) kept.push(B_NAME);
    const macsLine = lineOf(r.events, 'macs');
    const fp = record.find((x) => x.target === 'B') ?? null;
    if (ARMS.has('T1'))
      arm(
        tag('T1 a second Mac paired from the sheet'),
        gradeT1({ drawn: fp?.drawn ?? null, macFingerprint: fp?.macFingerprint ?? null, allowed: fp?.allowed ?? false, line, landed, end, doorRows: end?.doors?.B?.blocked ?? null, tabs: line?.tabs ?? null, label, readBadges: !order, needsBadge: macsLine?.needsBadge ?? null, macsBadge: macsLine?.macsBadge ?? null, expectNeeds: waitingB(), expectMacs: waitingA() })
      );
  });
  if (!kept.includes(B_NAME)) {
    for (const id of order ? ['T2', 'T3', 'AL2', 'S1', 'S2', 'CAP', 'H', 'HN', 'DG', 'RM', 'RP', 'UP'] : ['T2', 'UP']) if (ARMS.has(id)) unreadableArm(tag(id), 'B was never paired from the sheet');
    return;
  }

  // ---- T2: switching --------------------------------------------------------
  if (ARMS.has('T2'))
    await armBlock([tag('T2')], async () => {
      const needle = `p345k${PID}`;
      const keys = { a: null, b: null };
      const steps = [
        `macs:${b64(labelOf(A_NAME))}`,
        'sessions-mark:t2-a',
        `terminal-open:${aShell}`,
        `screen-type:${b64(`echo ${needle}`)}`,
        'sessions-mark:t2-a-end',
        // The typed line raised the keyboard over the bar; its own hide key
        // puts it away so the bar's Macs tab can be pressed (the fix round:
        // the first live run pressed under the keyboard and read UNREADABLE).
        'screen-key:hide',
        `macs:${b64(labelOf(A_NAME))}`,
        `choose-mac:${String(kept.indexOf(B_NAME))}`,
        'sessions-mark:t2-b',
        'idle:10',
        'sessions-mark:t2-b-end',
        'tab:sessions',
        `macs:${b64(labelOf(B_NAME))}`,
        `choose-mac:${String(kept.indexOf(A_NAME))}`,
        'tab:sessions'
      ];
      const r = await drive(sim, {
        label: 't2',
        steps,
        device,
        reactions: {
          dump: readBeside,
          marks: {
            't2-a-end': async () => {
              await sleep(1_500);
              keys.a = await paneHolds(MAC_A, aShell, needle);
              keys.b = await paneHolds(MAC_B, bShell, needle);
            }
          }
        }
      });
      arm(
        tag('T2 one tap switches the whole app, each Mac its own space'),
        gradeT2({
          ...readT2(r.events, relay),
          expectRows: kept.map((n) => ({ name: labelOf(n), line: needsYourInput(n === A_NAME ? waitingA() : waitingB()) })),
          chosenIndex: kept.indexOf(A_NAME),
          keyA: keys.a,
          keyB: keys.b
        })
      );
    });

  // ---- T3: Settings per Mac (order) ----------------------------------------------
  if (order && ARMS.has('T3'))
    await armBlock([tag('T3')], async () => {
      const r = await drive(sim, { label: 't3', steps: ['settings', `macs:${b64(labelOf(A_NAME))}`, `choose-mac:${String(kept.indexOf(B_NAME))}`, 'settings', 'pair-another-press'], device, reactions: { dump: readBeside } });
      const s = dumpsNamed(r.events, 'settings');
      arm(
        tag('T3 Settings shows the Mac on screen'),
        gradeT3({
          a: s[0] ?? null,
          b: s[1] ?? null,
          sheet: lastDump(r.events, 'pair-another-sheet'),
          afterCancel: lastDump(r.events, 'pair-another-settings'),
          want: {
            a: { name: A_NAME, drawn: labelOf(A_NAME), fingerprint: device.fingerprints[A_NAME] ?? null, alerts: true },
            b: { name: B_NAME, drawn: labelOf(B_NAME), fingerprint: device.fingerprints[B_NAME] ?? null, alerts: false }
          }
        })
      );
    });

  // ---- AL2: an alert from the Mac not on screen (order) --------------------------
  if (order && ARMS.has('AL2'))
    await armBlock([tag('AL2')], async () => {
      const al = alertFor(MAC_A, 'a-ask3', device.token);
      const steps = [`macs:${b64(labelOf(A_NAME))}`, `choose-mac:${String(kept.indexOf(B_NAME))}`, 'tab:sessions', `terminal-open:${bShell}`, 'tab:needs', 'alert', `macs:${b64(labelOf(A_NAME))}`, `choose-mac:${String(kept.indexOf(B_NAME))}`, 'tab:sessions'];
      const r = await drive(sim, { label: 'al2', steps, device, reactions: { dump: readBeside, alerts: [al] } });
      arm(
        tag('AL2 an alert from the Mac not on screen opens its session there, the other Mac\'s place kept'),
        gradeAlertOpens({ mainBlocked: al.mainBlocked, delivered: al.delivered, banner: lineOf(r.events, 'banner')?.label ?? null, name: 'a-ask3', ...readAL2(r.events), senderIndex: kept.indexOf(A_NAME) })
      );
      await endOne(MAC_A, al.sessionId);
      MAC_A.extra = MAC_A.extra.filter((x) => x !== al.sessionId);
    });

  // ---- S1: asleep, its door off (order) ---------------------------------------
  if (order && ARMS.has('S1'))
    await armBlock([tag('S1')], async () => {
      try {
        const steps = [`macs:${b64(labelOf(A_NAME))}`, `choose-mac:${String(kept.indexOf(B_NAME))}`, 'setup-failure:s1off', `macs:${b64(labelOf(B_NAME))}`, 'macs-pull', 'sessions-mark:s1on', 'macs-pull', 'sessions-pull'];
        const r = await drive(sim, {
          label: 's1',
          steps,
          device,
          reactions: {
            dump: readBeside,
            marks: {
              'setup:s1off': async () => {
                await pocket(MAC_B, 'setDoor', { on: false });
                await waitStatus(MAC_B, (s) => s.state !== 'listening', 20_000);
                for (let i = 0; i < 40 && forwarderPortOf(MAC_B) !== 0; i += 1) await sleep(250);
              },
              s1on: async () => {
                await pocket(MAC_B, 'setDoor', { on: true });
                await confirmListening(MAC_B);
                await waitStatus(MAC_B, (s) => s.state === 'listening', 30_000);
                for (let i = 0; i < 40 && forwarderPortOf(MAC_B) === 0; i += 1) await sleep(250);
              }
            }
          }
        });
        const pulls = dumpsNamed(r.events, 'macs-pull');
        arm(tag('S1 a Mac asleep, its door off, blanks itself alone and draws again'), gradeS1({ fail: lastDump(r.events, 'setup-failure-s1off'), macsOff: pulls[0] ?? null, macsOn: pulls[1] ?? null, pulled: lastDump(r.events, 'sessions-pull'), aDrawn: labelOf(A_NAME), bDrawn: labelOf(B_NAME), aWaiting: waitingA(), bWaiting: waitingB() }));
      } finally {
        if ((await waitStatus(MAC_B, (s) => s.state === 'listening', 1_000)).ok === false) {
          await pocket(MAC_B, 'setDoor', { on: true });
          await confirmListening(MAC_B);
        }
      }
    });

  // ---- S2: asleep, no answer (order) --------------------------------------------
  if (order && ARMS.has('S2'))
    await armBlock([tag('S2')], async () => {
      try {
        const steps = ['sessions-mark:s2hold', 'no-banner:2', `macs:${b64(labelOf(A_NAME))}`, 'idle:17', `macs:${b64(labelOf(A_NAME))}`, 'sessions-mark:s2pass'];
        const r = await drive(sim, { label: 's2', steps, device, reactions: { dump: readBeside, marks: { s2hold: async () => relay.setMode(B_NAME, 'hold'), s2pass: async () => relay.setMode(B_NAME, 'pass') } } });
        arm(
          tag('S2 a Mac that never answers holds nothing up and says so after 15 s'),
          gradeS2({ ...readS2(r.events, relay), aDrawn: labelOf(A_NAME), bDrawn: labelOf(B_NAME), aWaiting: waitingA() })
        );
      } finally {
        relay.setMode(B_NAME, 'pass');
      }
    });

  if (!order) {
    if (ARMS.has('UP')) await upArm(sim, device, tag);
    return;
  }

  // ---- CAP: four Macs, a fifth refused at the code, a kept one re-paired at four --
  await armBlock([tag('CAP')], async () => {
    const C = await nodeDoor('C', ['--arm', 'honest', '--name', C_NAME]);
    const twin = await nodeDoor('twin', ['--arm', 'twin', '--name', TWIN_NAME, '--alerts']);
    const Dd = await nodeDoor('D', ['--arm', 'honest', '--name', D_NAME]);
    const C2 = await nodeDoor('C2', ['--arm', 'honest', '--name', C_NAME]);
    relay.setBackend(C_NAME, C.facts.port);
    relay.setBackend(TWIN_NAME, twin.facts.port);
    relay.setBackend(D_NAME, Dd.facts.port);
    const record = [];
    const queue = [{ kind: 'door', label: 'C' }, { kind: 'door', label: 'twin' }, { kind: 'door', label: 'D' }, { kind: 'door', label: 'C2' }];
    const steps = [`pair-another:${b64(freshCode(C.facts.payload))}`, `pair-another:${b64(freshCode(twin.facts.payload))}`, `pair-another:${b64(freshCode(Dd.facts.payload))}`, 'sessions-mark:c-new', `pair-another:${b64(freshCode(C2.facts.payload))}`];
    const r1 = await drive(sim, { label: 'cap', steps, device, reactions: { fingerprint: fingerprintReactor(queue, record), dump: readBeside, marks: { 'c-new': async () => relay.setBackend(C_NAME, C2.facts.port) } } });
    // The ruled round: the twin can pair and close its sheet between two of
    // the UI test's polls, which stops the drive at `pair-another-missing`
    // with the twin kept. Counted from the twin's own POST /pair 200, the
    // twin is kept here too, and D's and C2's steps run on a drive of their own.
    const first = capFirstDrive(r1.events, doorRequests(twin, (e) => e.route === 'POST /pair'));
    let rest = null;
    if (first.resume) {
      say(`CAP: the twin's sheet was not seen; ${first.lines[1].fromLog}; D and C2 on a drive of their own`);
      rest = await drive(sim, {
        label: 'cap-rest',
        steps: [`pair-another:${b64(freshCode(Dd.facts.payload))}`, 'sessions-mark:c-new', `pair-another:${b64(freshCode(C2.facts.payload))}`],
        device,
        reactions: { fingerprint: fingerprintReactor([{ kind: 'door', label: 'D' }, { kind: 'door', label: 'C2' }], record), dump: readBeside, marks: { 'c-new': async () => relay.setBackend(C_NAME, C2.facts.port) } }
      });
    }
    const { lines, stuck } = capLines(first, rest?.events ?? null);
    const [c, tw, d, cAgain] = [lines[0] ?? null, lines[1] ?? null, lines[2] ?? null, lines[3] ?? null];
    if (c?.closed === true) kept.push(C_NAME);
    if (tw?.closed === true) kept.push(TWIN_NAME);
    if (cAgain?.closed === true && kept.includes(C_NAME)) {
      kept.splice(kept.indexOf(C_NAME), 1);
      kept.push(C_NAME);
    }
    for (const x of record) if (x.drawn) device.fingerprints[{ C: C_NAME, twin: TWIN_NAME, C2: C_NAME }[x.target] ?? x.target] = x.drawn;
    // The Macs at four, read on a drive of their own so the label is the chosen Mac's as kept now.
    const r2 = await drive(sim, { label: 'cap-macs', steps: [`macs:${b64(labelOf(A_NAME))}`], device, reactions: { dump: readBeside } });
    if (ARMS.has('CAP'))
      arm(
        tag('CAP four Macs, a fifth refused at its code, a kept one re-paired at four'),
        gradeCap({ stuck: [...stuck, ...stuckOf(r2.events)], c, twin: tw, d, dPairs: doorRequests(Dd, (e) => e.route === 'POST /pair').length, cAgain, cAgainPairs: doorRequests(C2, (e) => e.route === 'POST /pair').length, ...readMacsStep(r2.events), expectNames: kept.map(labelOf) })
      );
    report.readings.capOrder = kept.map(labelOf);
  });

  // ---- H: the attack -----------------------------------------------------------
  if (ARMS.has('H'))
    await armBlock([tag('H')], async () => {
      if (!kept.includes(TWIN_NAME) || !doors.twin?.facts) return unreadableArm(tag('H'), 'twin was never paired');
      const twin = doors.twin;
      twin.say(`twin-mirror ${b64(J([{ id: aShell, name: 'a-shell' }, { id: aAsk, name: 'a-ask' }]))}`);
      await sleep(500);
      const needle = `p345h${PID}`;
      const al = alertFor(MAC_A, 'a-ask4', device.token);
      let keyA = null;
      const ti = kept.indexOf(TWIN_NAME);
      const ai = kept.indexOf(A_NAME);
      const steps = [
        `macs:${b64(labelOf(A_NAME))}`,
        `choose-mac:${String(ti)}`,
        'sessions-mark:h-twin',
        `terminal-open:${aAsk}`,
        'sessions-mark:h-twin-end',
        `macs:${b64(labelOf(TWIN_NAME))}`,
        `choose-mac:${String(ai)}`,
        'sessions-mark:h-a',
        `terminal-open:${aAsk}`,
        'sessions-mark:h-a-end',
        `terminal-open:${aShell}`,
        `screen-type:${b64(`echo ${needle}`)}`,
        'sessions-mark:h-key',
        'alert',
        'sessions-mark:h-refuse',
        `macs:${b64(labelOf(A_NAME))}`,
        `choose-mac:${String(ti)}`,
        `macs:${b64(labelOf(TWIN_NAME))}`,
        `choose-mac:${String(ai)}`
      ];
      const r = await drive(sim, {
        label: 'h',
        steps,
        device,
        reactions: {
          dump: readBeside,
          alerts: [al],
          marks: {
            'h-key': async () => {
              await sleep(1_500);
              keyA = await paneHolds(MAC_A, aShell, needle);
            },
            'h-refuse': async () => {
              twin.say('twin-refuse');
              await sleep(500);
            }
          }
        }
      });
      const s = (t) => markStart(r.events, t);
      const e = (t) => markEnd(r.events, t);
      const chooses = dumpsNamed(r.events, 'choose-mac');
      const firstMacs = lineOf(r.events, 'macs');
      arm(
        tag('H a hostile second Mac is held to its own space'),
        gradeH({
          macs: dumpsNamed(r.events, 'macs')[0] ?? null,
          twinIndex: ti,
          labelFound: firstMacs === null ? null : firstMacs.found === true && firstMacs.label === A_NAME,
          twinOpens: s('h-twin') === null || e('h-twin-end') === null ? null : doorRequests(twin, (x) => x.sessionId === aAsk, s('h-twin'), e('h-twin-end')).length,
          aDuringTwin: s('h-twin') === null || e('h-twin-end') === null ? null : relay.between(A_NAME, s('h-twin'), e('h-twin-end')),
          aRecordsDuringTwin: recordsBetween(markOf(r.events, 'h-twin')?.recordsAfter, markOf(r.events, 'h-twin-end')?.recordsAt, A_NAME),
          twinDuringA: s('h-a') === null || e('h-a-end') === null ? null : doorRequests(twin, () => true, s('h-a'), e('h-a-end')).length,
          aOpens: s('h-a') === null || e('h-a-end') === null ? null : relay.between(A_NAME, s('h-a'), e('h-a-end')),
          keyA,
          twinKeys: doorRequests(twin, (x) => x.route === 'POST /v1/keys').length,
          alert: { mainBlocked: al.mainBlocked, delivered: al.delivered, dump: lastDump(r.events, 'alert'), twinAsked: al.sessionId === null ? null : doorRequests(twin, (x) => x.sessionId === al.sessionId).length },
          refused: chooses[2] ?? null,
          aAfter: chooses[3] ?? null,
          aRows: chooses[3]?.doors?.A?.blocked ?? null
        })
      );
      report.readings.twinGotAddress = { stated: 'twin was handed the phone\'s DEBUG alert address, as one hostile Mac is today', pendingSaidAlerts: doorRequests(twin, (x) => x.route === 'POST /pair' && x.alerts === true).length };
      await endOne(MAC_A, al.sessionId);
      MAC_A.extra = MAC_A.extra.filter((x) => x !== al.sessionId);
    });

  // ---- HN: a forged name --------------------------------------------------------
  if (ARMS.has('HN'))
    await armBlock([tag('HN')], async () => {
      if (!doors.twin?.facts) return unreadableArm(tag('HN'), 'twin never started, so there is no pin to forge with');
      const t = JSON.parse(doors.twin.facts.payload);
      const forged = freshCode(J({ ...t, host: A_NAME }));
      const steps = [`macs:${b64(labelOf(A_NAME))}`, `pair-another:${b64(forged)}`, `macs:${b64(labelOf(A_NAME))}`, 'tab:needs'];
      const r = await drive(sim, { label: 'hn', steps, device, reactions: { fingerprint: fingerprintReactor([{ kind: 'forged', label: 'forged' }], []), dump: readBeside } });
      const m = dumpsNamed(r.events, 'macs');
      const aAfter = lastDump(r.events, 'tab-needs');
      arm(tag('HN a code naming A with another key is refused, and nothing kept moves'), gradeHN({ line: lineOf(r.events, 'pair-another'), before: m[0] ?? null, after: m[1] ?? null, aAfter, aRows: aAfter?.doors?.A?.blocked ?? null }));
    });

  // ---- DG: downgrade ------------------------------------------------------------
  if (ARMS.has('DG'))
    await armBlock([tag('DG')], async () => {
      if (!parentBuilt) return unreadableArm(tag('DG'), PARENT === '' ? 'P345_PARENT_CHECKOUT names no parent checkout' : 'the parent did not build');
      const install = [];
      const steps = ['sessions-mark:dg-parent', 'relaunch-keep', 'settings', 'sessions-mark:dg-head', 'relaunch-keep', `macs:${b64(labelOf(A_NAME))}`];
      const r = await drive(sim, {
        label: 'dg',
        steps,
        device,
        reactions: {
          dump: readBeside,
          marks: {
            'dg-parent': async () => {
              const got = await sim.simctl('install', PARENT_APP);
              install.push({ code: got.code });
            },
            'dg-head': async () => {
              const got = await sim.simctl('install', HEAD_APP);
              install.push({ code: got.code });
            }
          }
        }
      });
      arm(tag('DG build 10 over this build reads the first Mac alone; this build again reads every Mac'), gradeDG({ install, ...readDG(r.events), parentReference: device.parentSettings ?? null, expectCount: kept.length }));
    });

  // ---- RM: Remove on one --------------------------------------------------------
  if (ARMS.has('RM'))
    await armBlock([tag('RM')], async () => {
      let removed = false;
      let rmDoor = null;
      const steps = [`macs:${b64(labelOf(A_NAME))}`, `choose-mac:${String(kept.indexOf(B_NAME))}`, 'setup-failure:rm', `macs:${b64(labelOf(B_NAME))}`, `choose-mac:${String(kept.indexOf(A_NAME))}`];
      const r = await drive(sim, {
        label: 'rm',
        steps,
        device,
        reactions: {
          dump: readBeside,
          marks: {
            'setup:rm': async () => {
              const id = device.phoneIds.B ?? null;
              if (id === null) return;
              const got = await pocket(MAC_B, 'removePhone', id);
              removed = got.ok;
              // At 24097f39 a Remove moves the door's confirmation (every
              // phone's client key is in its hash), so B stops answering until
              // it is allowed again, and the phone could only say it could not
              // reach B. Allowed again here, B answers and no longer knows the
              // phone: the refusal this row is about (the fix round; on a base
              // where a Remove keeps the door answering this does nothing).
              rmDoor = await doorBack(MAC_B);
            }
          }
        }
      });
      arm(tag('RM Remove on one Mac blanks that Mac alone'), gradeRM({ removed, doorBack: rmDoor, ...readRM(r.events) }));
    });

  // ---- RP: re-pair --------------------------------------------------------------
  if (ARMS.has('RP'))
    await armBlock([tag('RP')], async () => {
      const p = await macPairing(MAC_B, device);
      if (!p.ok) return unreadableArm(tag('RP'), `B opened no window: ${p.why}`);
      const record = [];
      // Phase 348 (D1): the re-pair lands on B's Sessions; its Needs input is read after an explicit tab press.
      const r = await drive(sim, { label: 'rp', steps: [`pair-another:${b64(p.payload)}`, 'tab:needs', `macs:${b64(labelOf(B_NAME))}`], device, reactions: { fingerprint: fingerprintReactor([p.target], record), dump: readBeside } });
      await afterMacPairing(p, device, record);
      const line = lineOf(r.events, 'pair-another');
      if (line?.closed === true) {
        kept.splice(kept.indexOf(B_NAME), 1);
        kept.push(B_NAME);
      }
      const landed = lastDump(r.events, 'pair-another-end');
      const end = lastDump(r.events, 'tab-needs');
      arm(tag('RP a re-pair lands on the Mac\'s Sessions, draws it again and moves it to the end'), gradeRP({ line, landed, end, doorRows: end?.doors?.B?.blocked ?? null, macs: lastDump(r.events, 'macs'), lastName: labelOf(B_NAME), expectCount: kept.length }));
    });

  if (ARMS.has('UP')) await upArm(sim, device, tag);
}

/** UP: Unpair one, from B down to A alone. */
async function upArm(sim, device, tag) {
  const kept = device.kept;
  const labelOf = (name) => drawnName(name, kept);
  await armBlock([tag('UP')], async () => {
    if (!kept.includes(B_NAME)) return unreadableArm(tag('UP'), 'B is not kept, so there is nothing to unpair');
    const steps = [`macs:${b64(labelOf(A_NAME))}`, `choose-mac:${String(kept.indexOf(B_NAME))}`, 'unpair-one', 'idle:20', 'relaunch-keep'];
    const left = kept.filter((n) => n !== B_NAME);
    steps.push(`macs:${b64(drawnName(A_NAME, left))}`);
    // The rest unpaired one by one, the first Mac last, so it ends at one Mac.
    let now = [...left];
    for (const name of left.filter((n) => n !== A_NAME)) {
      steps.push(`choose-mac:${String(now.indexOf(name))}`, 'unpair-one');
      now = now.filter((n) => n !== name);
      steps.push(`macs:${b64(drawnName(A_NAME, now))}`);
    }
    // At one Mac: the bar and Settings read, then read again after a relaunch. D23 may
    // forget the alert address when the Mac unpaired held it (twin, which claimed it),
    // and the app asks for it again at its next launch: the first Settings is printed
    // as a reading, the relaunched one is graded against P1's HEAD dump.
    steps.push(`macs:${b64(firstLabel(A_NAME))}`, 'settings', 'relaunch-keep', `macs:${b64(firstLabel(A_NAME))}`, 'settings');
    const r = await drive(sim, { label: 'up', steps, device, reactions: { dump: readBeside } });
    // The first `macs` after the first relaunch (a dump when two or more were
    // kept, `found: false` at one), and the bar and Settings after the second.
    const read = readUP(r.events, relay);
    const phones = await phonesOf(MAC_B);
    if (read.landed?.where === 'needs-input') kept.splice(kept.indexOf(B_NAME), 1);
    const settingsDumps = dumpsNamed(r.events, 'settings');
    report.readings[`up-${device.key}`] = {
      unpaired: linesNamed(r.events, 'unpair-landed').map((x) => x.where),
      settingsBeforeRelaunch: settingsDumps.length >= 2 && device.oneMacSettings ? screenDiff(device.oneMacSettings, settingsDumps.at(-2)) : null
    };
    arm(
      tag('UP Unpair forgets the Mac on screen alone, and at one Mac the app is today\'s'),
      gradeUP({
        ...read,
        expectAfterRelaunch: left.map((n) => drawnName(n, left)),
        stillListed: phones === null || device.phoneIds.B === undefined ? null : phones.includes(device.phoneIds.B),
        reference: device.oneMacSettings ?? null
      })
    );
  });
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

const historyBefore = historyStat();
let relay = null;
let apns = null;
let watch = null;
let ran = false;
const preflights = [];
const dnsPreflights = [];
const doors = { twin: null, C: null, C2: null, D: null };
/** One-Mac HEAD Settings per device, P1's and UP's reference. */
const headSettings = {};

try {
  rmSync(RUN, { recursive: true, force: true });
  mkdirSync(XCODE, { recursive: true });
  SECRETS.push(TOKENS.order, TOKENS.floor);
  relay = await startSniRelay({});
  watch = watchForRealTailscale({ roots: () => MACS.flatMap((m) => [m.shimPid, m.appPid]).filter((p) => p > 0), everyMs: 1_000 });

  // ---- the scratch key, Apple's stand-in, deleted in the finally ----------
  const keyPair = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const pem = keyPair.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
  for (const line of pem.split('\n').filter((l) => l.length >= 16 && !l.startsWith('-----'))) SECRETS.push(line);
  mkdirSync(MAC_A.alertsDir, { recursive: true, mode: 0o700 });
  writeFileSync(MAC_A.keyFile, pem, { mode: 0o600 });
  process.once('exit', () => rmSync(MAC_A.keyFile, { force: true }));
  apns = await startApnsStandIn({ publicKey: keyPair.publicKey, topic: TOPIC, devices: { [TOKENS.order]: 'development', [TOKENS.floor]: 'development' } });
  if (!Object.values(apns.origins).every((o) => /^http:\/\/127\.0\.0\.1:[0-9]{1,5}$/.test(o))) throw new Error('the APNs stand-in is not on loopback');
  writeFileSync(join(MAC_A.alertsDir, 'alerts.json'), `${J({ origins: apns.origins, keyFile: MAC_A.keyFile })}\n`, { mode: 0o600 });

  // ---- each Mac's scratch world -------------------------------------------
  for (const mac of MACS) {
    for (const d of [mac.home, mac.harness, mac.profile, mac.work, mac.bin, join(mac.home, '.claude')]) mkdirSync(d, { recursive: true });
    mac.standin = makeStandin({ dir: mac.standinDir, scenario: { ...DEFAULT_SCENARIO, dnsName: `${mac.name}.` } });
    const pre = preflightStandin(mac.standin, mac.standin.binPath);
    preflights.push(pre.ok);
    if (!pre.ok) throw new Error(`${mac.key}: the Tailscale preflight refused: ${pre.problems.join('; ')}`);
    mac.dns = await makeDnsStandin({ name: mac.name, mode: 'record' });
    const dnsPre = await mac.dns.preflight(mac.dns.servers);
    dnsPreflights.push(dnsPre.ok && loopbackOnlyServers(mac.dns.servers));
    if (!dnsPre.ok) throw new Error(`${mac.key}: the DNS preflight refused: ${dnsPre.problems.join('; ')}`);
    writeFileSync(
      join(mac.bin, 'claude'),
      `#!/bin/sh
# probe:p345. Not Claude Code: it prints the committed Phase 312 dialog and waits.
case "$1" in
  -v|--version) echo "2.1.238 (Claude Code)"; exit 0;;
esac
sleep 2
cat "$P345_DIALOG"
while [ ! -f "$P345_STOP" ]; do sleep 1; done
exit 0
`,
      'utf8'
    );
    chmodSync(join(mac.bin, 'claude'), 0o755);
    // THE PROBE REVIEW (Phase 348, rule 9): a `codex` that is not Codex, so the bare name resolves to a stand-in
    // here too. No session of this probe starts it; it answers its version and waits.
    writeFileSync(
      join(mac.bin, 'codex'),
      `#!/bin/sh
# probe:p345. Not Codex: it answers its version and waits. No session of this probe starts it.
case "$1" in
  -V|--version) echo "codex-cli 0.0.0"; exit 0;;
esac
while [ ! -f "$P345_STOP" ]; do sleep 1; done
exit 0
`,
      'utf8'
    );
    chmodSync(join(mac.bin, 'codex'), 0o755);
    mkdirSync(mac.nodeBin, { recursive: true });
    symlinkSync(process.execPath, join(mac.nodeBin, 'node'));
    // THE PROBE REVIEW: the login PATH is the scratch bin and the system folders, never `$PATH` after them.
    writeFileSync(join(mac.home, '.zprofile'), `export PATH="${loginPathOf(mac)}"\n`, 'utf8');
    writeFileSync(join(mac.home, '.zshrc'), `export PATH="${loginPathOf(mac)}"\nexport HISTFILE=/dev/null\n`, 'utf8');
    // THE PRECONDITION (the probe review; Phase 346's ruled round's rule): the login shell this Mac's app will ask,
    // with the environment it will be given, resolves `claude` and `codex` to this file's stand-ins, or nothing is
    // launched (UNREADABLE, exit 2).
    {
      const asked = plantedResolve({ home: mac.home, bin: mac.bin, names: ['claude', 'codex'], env: { ...INHERITED_CLAUDE, ...ROW_DIR_UNSET, PATH: appPathOf(mac) } });
      report.readings[`resolves${mac.key}`] = asked.resolved;
      if (!asked.ok) {
        unreadableArm(`the run (${mac.key})`, `REFUSED: ${asked.said}, so a session would start a real agent. Nothing is launched.`);
        throw new Error(`${mac.key}: a planted agent does not resolve to its stand-in`);
      }
      say(`${mac.key}: ${asked.said}`);
    }
    const git = (args) => spawnSync('git', args, { cwd: mac.work, encoding: 'utf8', env: { ...process.env, HOME: mac.home } });
    git(['init', '-q']);
    writeFileSync(join(mac.work, 'note.txt'), `p345 ${mac.key}\n`);
    git(['add', '-A']);
    git(['-c', 'user.email=p@x', '-c', 'user.name=p', 'commit', '-qm', 'seed']);
    writeQuietAgents(mac.profile);
  }

  // ---- B1: the builds, before anything serves -----------------------------
  const built = await xcodebuildRun({ label: 'p345-head', scratch: XCODE, derivedDataPath: DD, args: ['build-for-testing', '-project', PROJECT, '-scheme', SCHEME, '-configuration', 'Debug', '-destination', 'generic/platform=iOS Simulator'] });
  report.readings.builds = { head: { code: built.code, ms: built.ms } };
  if (built.code !== 0 || !existsSync(HEAD_APP)) throw new Error(`HEAD's app did not build (exit ${String(built.code)}; ${built.logFile})`);
  let parentBuilt = false;
  if (PARENT !== '') {
    const pb = await xcodebuildRun({ label: 'p345-parent', scratch: XCODE, derivedDataPath: PARENT_DD, args: ['build-for-testing', '-project', join(resolve(PARENT), 'ios', 'Tortie.xcodeproj'), '-scheme', SCHEME, '-configuration', 'Debug', '-destination', 'generic/platform=iOS Simulator'] });
    report.readings.builds.parent = { code: pb.code, ms: pb.ms };
    parentBuilt = pb.code === 0 && existsSync(PARENT_APP);
    if (!parentBuilt) say(`the parent did not build (exit ${String(pb.code)}; ${pb.logFile}): U0, P1 and DG will read UNREADABLE`);
  }

  // ---- two Macs, two Electrons at once -------------------------------------
  const launchOf = (mac) => ({
    label: `p345-${mac.key.toLowerCase()}`,
    userDataDir: mac.profile,
    cwd: ROOT,
    tmuxSocket: mac.socket,
    args: ['--remote-debugging-port=0', '--use-mock-keychain'],
    env: withoutDevRenderer({
      ...INHERITED_CLAUDE,
      // THE PROBE REVIEW (Phase 348, rule 9): no row folder's variable (`NVM_BIN`), and the app's own closed PATH.
      ...ROW_DIR_UNSET,
      PATH: appPathOf(mac),
      HOME: mac.home,
      ZDOTDIR: mac.home,
      HISTFILE: '/dev/null',
      GMUX_TMUX_SOCKET: mac.socket,
      GMUX_PROBES: '1',
      GMUX_LOG_FILE: '1',
      GMUX_SPECSTORY_NO_CLOUD: '1',
      GMUX_CONFIG_ROOT: join(mac.profile, 'gmux', 'config'),
      GMUX_HARNESS_DIR: mac.harness,
      GMUX_TAILSCALE_BIN: mac.standin.binPath,
      [NAME_SERVERS_VAR]: mac.dns.servers,
      ...(mac.alerts ? { GMUX_HARNESS_ALERTS: mac.alertsDir } : {}),
      P345_DIALOG: DIALOG,
      P345_STOP: mac.stop
    }),
    graceMs: 8_000,
    ceilingMs: 6 * 3_600_000
  });
  await withElectron(launchOf(MAC_A), async (handleA) => {
    await bootMac(MAC_A, handleA);
    await withElectron(launchOf(MAC_B), async (handleB) => {
      await bootMac(MAC_B, handleB);
      ran = true;
      for (const key of ['order', 'floor']) {
        if (!DEVICES.has(key)) continue;
        const device = { key, runtime: key === 'order' ? RUNTIME_CURRENT : RUNTIME_FLOOR, token: TOKENS[key], kept: [], fingerprints: {}, phoneIds: {} };
        gradingOn = key;
        await withSimulator({ label: `p345-${key}`, runtime: device.runtime, runId: `p345-${PID}-${key === 'order' ? '1' : '2'}`, scratch: join(XCODE, `sim-${key}`), derivedDataPath: DD, keep: KEEP }, async (sim) => {
          await runDevice(sim, device, parentBuilt);
        });
        gradingOn = null;
        // A's extra waiting sessions end, so the next device meets one waiting on A again.
        for (const id of MAC_A.extra.splice(0)) await endOne(MAC_A, id);
      }
    });
  });
} catch (err) {
  say(`the run stopped: ${String(err?.stack ?? err)}`);
  report.readings.stopped = String(err?.message ?? err);
} finally {
  for (const mac of MACS) {
    try {
      writeFileSync(mac.stop, 'stop\n');
    } catch {
      /* the directory may be gone */
    }
  }
  for (const child of doorChildren) await endDoor(child);
  await relay?.close();
  await apns?.close?.();
  for (const mac of MACS) await mac.dns?.close?.();
  rmSync(MAC_A.keyFile, { force: true });
}

// ---- RUN: counted once, at the end -----------------------------------------
{
  const findings = watch?.stop() ?? [];
  const forbidden = MACS.reduce((n, m) => n + (m.standin?.forbidden().length ?? 0), 0);
  let standinsLeft = 0;
  for (const mac of MACS) if (mac.standin !== null) standinsLeft += endStandinProcesses(mac.standin.dir).left.length;
  const doorsLeft = [...doorChildren].filter((c) => c.exitCode === null && c.signalCode === null).length;
  const ps = spawnSync('ps', ['-Ao', 'pid,ppid,rss,comm'], { encoding: 'utf8' });
  const roots = MACS.flatMap((m) => [m.shimPid, m.appPid]).filter((p) => p > 0);
  const electronsLeft = (ps.stdout ?? '')
    .split('\n')
    .filter((l) => /Electron|Tortie$|chrome_crashpad/.test(l) && !/defunct/.test(l))
    .filter((l) => {
      const [pid, ppid] = l.trim().split(/\s+/).map(Number);
      return roots.includes(pid) || roots.includes(ppid);
    }).length;
  const devices = countDevicesNamed(OWN_DEVICES);
  const historyAfter = historyStat();
  arm(
    'RUN nothing real reached, everything this run started ended, his history unmoved',
    gradeRun({
      preflights,
      samples: watch?.samples() ?? 0,
      realTailscale: findings.length,
      forbidden,
      standinsLeft,
      doorsLeft,
      electronsLeft,
      devices: devices.readable ? devices : null,
      history: { moved: J(historyBefore) !== J(historyAfter), before: historyBefore, after: historyAfter },
      dnsPreflights,
      agentsHeld
    })
  );
}
// Every arm this run was asked for, on every device it was asked for, has a
// verdict: a device that threw or never started leaves arms with none, and a
// run with an arm never graded is not a pass (it was, before the review: a
// first window that did not open ended the device with no arm and exit 0).
gradingOn = null;
for (const { key, id } of ungradedArms(DEVICES, ARMS, graded)) unreadableArm(`${id} (iOS ${key === 'order' ? RUNTIME_CURRENT : RUNTIME_FLOOR})`, `never graded: the ${key} device stopped before it${report.readings.stopped === undefined ? '' : ` (${String(report.readings.stopped).slice(0, 200)})`}`);
// THE PROBE REVIEW (Phase 348, rule 9): every session each Mac's manifest holds ran a program of this run, read from
// a COPY beside its WAL once the apps are gone: a shell row a system shell, every other row's argv[0] under this
// run's folder. The precondition says what the login shell would resolve; this says what the sessions DID run.
if (ran) {
  for (const mac of MACS) {
    const v = manifestProgramsVerdict({ manifest: manifestSessions(join(mac.profile, 'gmux', 'manifest.db')), run: RUN });
    report.readings[`manifestPrograms${mac.key}`] = v.reading;
    arm(`RUN ${mac.key}'s sessions ran programs of this run`, verdict(v.ok, v.said));
  }
}
if (!KEEP) rmSync(RUN, { recursive: true, force: true });
const OUT = join(ROOT, 'out', 'p345');
mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'probe-p345.json'), `${unsecret(J(report, null, 1))}\n`, 'utf8');
say(`wrote ${join(OUT, 'probe-p345.json')}`);
const unreadable = report.arms.filter((a) => a.ok === null).length;
if (ran && failures === 0 && unreadable > 0) {
  say(`probe:p345 could not READ ${String(unreadable)} arm(s); that is not a pass`);
  process.exit(2);
}
say(failures > 0 ? `probe:p345 FAILED ${String(failures)} arm(s)` : !ran ? 'probe:p345 did not complete' : 'probe:p345 OK');
process.exit(failures > 0 ? 1 : ran ? 0 : 2);
