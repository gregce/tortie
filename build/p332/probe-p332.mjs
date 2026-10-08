#!/usr/bin/env node
/**
 * probe:p332 — pairing waits for the Mac's public name, driven inside the real
 * app against a LOOPBACK DNS stand-in, measured at the parent and at HEAD
 * (Phase 332, build/p332/SPEC.md §8.3).
 *
 * WHAT IT MEASURES. His first pairing failed because the code showed the moment
 * Tailscale first published the door, eight minutes before his Mac's public name
 * reached public DNS; a phone that scanned early kept the miss for 300 s, longer
 * than the code's three minutes. At the parent (`a8e06fe7`) this probe
 * REPRODUCES that: the code shows at once, the phone's first lookup misses, and
 * every lookup after the record exists is still the cached miss. At HEAD the
 * same script shows the checking line and no Pair until the name answers, and
 * the phone pairs on its first scan.
 *
 * NO REAL DNS, EVER. The app asks `GMUX_POCKET_NAME_SERVERS=127.0.0.1:<port>`,
 * which is build/p332/dns-standin.mjs IN THIS PROCESS, answering for the
 * Tailscale stand-in's made-up `p330-mac.tail00000.ts.net` with `203.0.113.10`
 * (RFC 5737). A development build honours the variable and a packaged one
 * ignores it, which is why no packaged Tortie is ever launched here. The DNS
 * preflight refuses a launch unless that value is this stand-in's and names
 * 127.0.0.1 alone, and a question for the name is answered on loopback. Main's
 * UDP sockets are sampled every 2 s (`lsof -a -p <main> -iUDP -n -P`): ANY peer
 * that is not 127.0.0.1 fails the run at once and ends the app, so a broken
 * build sends at most one sample's worth of real traffic. No live arm drives a
 * broken override, because a build that failed D7 would itself send real
 * packets (SPEC §8.3); `conformance:pocket` D7 and `ablation:p313` D7b prove it.
 *
 * NO REAL TAILSCALE, EVER: build/p330/tailscale-standin.mjs behind its
 * preflight and its sampler, exactly as probe:p330 runs it. NO AGENT STARTS:
 * before every launch the profile's `gmux/config/agents.json` renames the
 * Gemini, Qwen, Antigravity, Grok and Droid binaries to names that exist
 * nowhere, and `agents:list` is read back; a launch where any of them reads
 * installed is refused. The phone is build/p316/node-phone.mjs, unedited, and
 * its resolver is `makeResolverModel`: it asks every 2 s, as the Swift phone
 * presents (`Pairing.swift:299`), keeps a miss for 300 s (O4), and dials the
 * stand-in's loopback forwarder only after an answer.
 *
 * THE ARMS. `P332_ARMS` picks; the parent runs `H0,P1`, HEAD runs
 * `H0,P1,H2,H3,H4,H5,H6`, and at HEAD P1 is graded as H1.
 *   H0  the door never on, Settings then Phone open, 30 s idle: the stand-in is
 *       asked nothing, main's UDP sockets are the parent's, and at HEAD
 *       `nameCheck` is `none` and `pairable` false
 *   P1  (parent) the first setup's press with the door off (Pair where the
 *       sheet draws it, since Phase 333.1 the switch, `pressFirstSetup`) and
 *       Allow on the sheet; the
 *       stand-in answers NXDOMAIN until 110 s after `listening`: the code shows
 *       at once, the phone's first lookup misses, every lookup after the record
 *       is the cached miss, nothing presents, the window shuts, and the sheet
 *       says `CODE_EXPIRED CODE_FIRST_NAME`. The failed first scan, reproduced
 *   H1  (HEAD, the same script) the `naming` face and no Pair until
 *       `pairable`; `beginPairing` refused 5 s after `listening` with nothing
 *       opened; one `A` question per round, RD 0, 20, 30, 45 and 60 s apart,
 *       `no` before the record and `yes` once after it; `pairable` within 1 s
 *       of that `yes`; the code with no other press; the phone's first lookup
 *       answers, it presents at once, Allow pairs it, and `/v1/blocked`
 *       answers 200 through the forwarder
 *   H2  THE OFF KEEPS A CONFIRMATION (the fix round): off then on while the
 *       name answers shows Pair within 1 s of `listening`, before its one
 *       held question is answered, and asks nothing after it; then the
 *       switch-on round meets NXDOMAIN, which forgets it; then an off with the next
 *       round held open writes nothing and asks nothing for 120 s, and the
 *       next on, its first round held, reads `checking`; on, off, on inside
 *       5 s asks one question per round at 0, 20 and 50 s and never two
 *       within 1 s
 *   H3  Remove then Allow over a kept confirmation: `pairable` within 1 s of
 *       `listening`, before the one held question is answered, and nothing
 *       more; forgetDoor then Allow against NXDOMAIN: `checking`, no Pair, then
 *       one `yes` round 20 s later and `pairable`
 *   H4  a relaunch: published with no press, `pairable` within 1 s, one held
 *       question and nothing after it
 *   H5  a moved tailnet (the Funnel child SIGKILLed by pid; the restart's read
 *       finds the move): the gate reads `changed`, Allow, `checking` while its
 *       one round is held, and Pair within 1 s of that round's `yes`
 *   H6  silence: after the switch-on round's NXDOMAIN, ONE silent question
 *       20 s later opens Pair at its 2 s deadline, with `unreadable` and the
 *       sheet's line above Pair
 *   RUN both preflights, the quiet agents at every launch, no real Tailscale,
 *       nothing forbidden, UDP to 127.0.0.1 alone, app.log holding neither the
 *       name nor the address, every stand-in ended and closed, no Electron left
 *
 * THE PARENT. `P332_PARENT_CHECKOUT=<a built checkout at a8e06fe7>` runs H0 and
 * P1 against that build and writes out/p332/probe-p332-parent.json; the HEAD
 * run reads it for H0's comparison and prints P1 beside H1.
 *
 * WHAT IT REFUSES TO DO. Every launch goes through build/electron-run.mjs's
 * `withElectron`, one at a time, on its own scratch profile, scratch HOME and
 * tmux socket `gmux-p332-<pid>` (never `gmux`). It signals only a Funnel child
 * whose command line names the Tailscale stand-in (H5), never the shim and
 * never the app; every stand-in pid is ended by pid and the DNS stand-in is
 * closed in the `finally`. It never runs `pkill`, installs nothing, spends no
 * token, binds nothing but 127.0.0.1, dials nothing but 127.0.0.1, and reads no
 * credential, keychain item or conversation store of the person's. `npm run
 * shot` is not called.
 *
 * VERIFIERS ONLY, under THE LOCK: it starts an Electron. Builders write it and
 * run only `--grader-self-test`, which grades recorded fixtures and starts
 * nothing. It costs about 5 minutes at the parent and about 15 at HEAD.
 *
 * BUILD FIRST. It refuses (exit 2) when the checkout it is pointed at has no build.
 *
 *   npm run -s probe:p332
 *   P332_PARENT_CHECKOUT=/path/to/parent npm run -s probe:p332   the parent reading
 *   P332_ARMS=H0,P1 npm run -s probe:p332                        some arms
 *   P332_KEEP=1 npm run -s probe:p332                            keep the scratch world
 *   node build/p332/probe-p332.mjs --grader-self-test            the graders, no Electron
 *
 * Exit 0 when every arm passed, 1 when one failed, 2 when it could not run or
 * an arm could not be READ, which is never a pass.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { withElectron, withoutDevRenderer } from '../electron-run.mjs';
import { wsConnect, cdpEval } from '../cdp-client.mjs';
import { pickRendererTarget } from '../cdp-target.mjs';
import { gradeFixtures } from '../probe-graders.mjs';
import { doorFrom, makePhone, pairThrough, readOffer, signedGet } from '../p316/node-phone.mjs';
import { DEFAULT_SCENARIO, endStandinProcesses, makeStandin, preflightStandin, processRows, watchForRealTailscale } from '../p330/tailscale-standin.mjs';
import { NAME_SERVERS_VAR, STANDIN_ADDRESS, loopbackOnlyServers, makeDnsStandin, makeResolverModel, nameQuestionProblems, quietAgentsHeld, writeQuietAgents } from './dns-standin.mjs';

const HERE = fileURLToPath(import.meta.url);
const ROOT = resolve(dirname(HERE), '..', '..');
const J = JSON.stringify;
const sleepRaw = (ms) => new Promise((done) => setTimeout(done, ms));

// ---------------------------------------------------------------------------
// The words, read from the checkout's own source, with SPEC §4.11's text and
// the parent's as the fallback the report names
// ---------------------------------------------------------------------------

/** A run of quoted literals joined by `+`, starting at `from`, or null. */
function literalsAt(text, from) {
  const re = /\s*(?:'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)")\s*(\+)?/y;
  const parts = [];
  let at = from;
  for (;;) {
    re.lastIndex = at;
    const m = re.exec(text);
    if (m === null) break;
    parts.push((m[1] ?? m[2]).replace(/\\(.)/g, '$1'));
    at = re.lastIndex;
    if (m[3] === undefined) break;
  }
  return parts.length === 0 ? null : parts.join('');
}

/** `const NAME = '…' + '…';` → the text, or null. */
export function constWord(src, name) {
  const m = new RegExp(`\\bconst\\s+${name}\\b[^=;]*=`).exec(src);
  return m === null ? null : literalsAt(src, m.index + m[0].length);
}

/** `TABLE … = { key: '…' }` → the key's text, or null. */
export function tableWord(src, table, key) {
  const m = new RegExp(`\\b${table}\\b[^=;]*=\\s*\\{`).exec(src);
  if (m === null) return null;
  const k = new RegExp(`\\b${key}\\s*:`, 'g');
  k.lastIndex = m.index + m[0].length;
  const hit = k.exec(src);
  if (hit === null || hit.index - m.index > 800) return null;
  return literalsAt(src, hit.index + hit[0].length);
}

/** The words SPEC §4.11 (as its fix round left `unreadable`) and the parent's sheet say, for any the source does not yield. */
export const SPEC_WORDS = Object.freeze({
  // Phase 333.1: the switch's label, for the first setup's press where the
  // sheet draws no Pair with the door off (build/p3331/SPEC.md §7.6).
  doorLabel: 'Let my phone reach this Mac',
  checking: 'Pair opens once your Mac’s name is on the internet, which can take a few minutes.',
  unreadable: 'Tortie could not confirm your Mac’s name, so a first scan may fail.',
  expired: 'The code expired. Nothing was paired.',
  firstName: 'The first time, your Mac’s name can take several minutes to reach your phone. Press Pair again.'
});

export function wordsFrom(contractSrc, sheetSrc) {
  const from = {};
  const pick = (key, value) => {
    from[key] = value === null ? 'spec' : 'source';
    return value ?? SPEC_WORDS[key];
  };
  return {
    checking: pick('checking', tableWord(contractSrc, 'POCKET_NAME_SENTENCES', 'checking')),
    unreadable: pick('unreadable', tableWord(contractSrc, 'POCKET_NAME_SENTENCES', 'unreadable')),
    expired: pick('expired', constWord(sheetSrc, 'CODE_EXPIRED')),
    firstName: pick('firstName', constWord(sheetSrc, 'CODE_FIRST_NAME')),
    doorLabel: pick('doorLabel', constWord(sheetSrc, 'DOOR_LABEL')),
    from
  };
}

// ---------------------------------------------------------------------------
// THE GRADERS. Pure: each takes the reading an arm collected and answers which
// of its clauses failed. `--grader-self-test` runs every one over a passing
// fixture and, for EVERY clause, a fixture broken on that clause alone, which
// must fail on that clause: a grader nobody has seen fail proves nothing.
// ---------------------------------------------------------------------------

/** The record's delay after the probe first sees `listening` (SPEC §3 row 2). */
export const RECORD_DELAY_MS = 110_000;
/** Round-to-round gaps H1 expects: the check's schedule; the first yes confirms (the fix round). */
export const H1_GAPS = Object.freeze([20_000, 30_000, 45_000, 60_000]);
/** H6: the switch-on round's no, then the silent round 20 s after it. */
export const H6_GAPS = Object.freeze([20_000]);
const TOLERANCE_MS = 1_000;

export const gapsOf = (rows) => rows.slice(1).map((r, i) => r.at - rows[i].at);
export const gapsMatch = (gaps, want, tol = TOLERANCE_MS) => gaps.length === want.length && gaps.every((g, i) => Math.abs(g - want[i]) <= tol);
const within = (value, lo, hi) => Number.isFinite(value) && value >= lo && value <= hi;
const sameList = (a, b) => Array.isArray(a) && Array.isArray(b) && J([...a].sort()) === J([...b].sort());
const loopbackPeer = (peer) => /^127\.0\.0\.1:\d+$/.test(String(peer));

export const GRADERS = {
  H0: {
    title: 'the door never on: nothing asked, nothing new in main’s UDP sockets',
    clauses: [
      ['Settings then Phone was open, and idle for 30 s', (r) => r.sheetOpened === true && r.idleMs >= 30_000],
      ['the DNS stand-in was asked nothing', (r) => r.dnsQuestions === 0],
      ['no UDP peer but 127.0.0.1', (r) => r.udpPeers.every(loopbackPeer)],
      ['main’s UDP sockets are the parent’s', (r) => r.parentUdp === null || sameList(r.udp, r.parentUdp)],
      ['at HEAD, nameCheck is none', (r) => !r.atHead || r.nameCheck === 'none'],
      ['at HEAD, pairable is false', (r) => !r.atHead || r.pairable === false]
    ]
  },
  P1: {
    title: 'the parent: the code at once, and the first scan fails',
    clauses: [
      ['the code shows within 5 s of listening', (r) => within(r.codeAt - r.listeningAt, 0, 5_000)],
      ['the phone’s first lookup, within 3 s of the code, misses', (r) => r.firstLookup !== null && within(r.firstLookup.at - r.codeAt, 0, 3_000) && r.firstLookup.verdict === 'miss'],
      ['every lookup after the record is still a miss', (r) => r.afterRecord.length > 0 && r.afterRecord.every((v) => v === 'miss')],
      ['nothing presents', (r) => r.presented === false && r.attempts === 0],
      ['the window shuts', (r) => r.windowShut === true],
      ['the sheet says the code expired and why', (r) => r.notice === `${r.words.expired} ${r.words.firstName}`],
      ['the DNS stand-in was asked nothing', (r) => r.dnsQuestions === 0]
    ]
  },
  H1: {
    title: 'HEAD: the code waits for the name, and the first scan pairs',
    clauses: [
      [
        'the sheet wears naming, the checking line and no Pair until pairable',
        (r) => {
          const mid = r.samples.filter((s) => s.at > r.listeningAt + 1_000 && s.at < r.pairableAt - 1_000);
          return mid.length > 0 && mid.every((s) => s.stage === 'naming' && s.checking === true && s.pairButton === false);
        }
      ],
      ['beginPairing through the bridge is refused with the sentence', (r) => r.refused.ok === false && String(r.refused.error).includes(`${r.words.checking} No code was shown.`)],
      ['the refusal opened no window', (r) => r.stateAfterRefusal === 'idle'],
      ['every question is A, RD 0, for the name', (r) => nameQuestionProblems(r.questions, r.name).length === 0],
      ['the rounds are 20, 30, 45 then 60 s apart', (r) => gapsMatch(gapsOf(r.questions), H1_GAPS)],
      ['no before the record, yes once after it', (r) => r.questions.filter((q) => q.at < r.recordAt).every((q) => q.answered === 'nx') && r.questions.filter((q) => q.at >= r.recordAt).map((q) => q.answered).join(',') === 'record'],
      ['pairable within 1 s of the yes', (r) => r.questions.length > 0 && within(r.pairableAt - r.questions[r.questions.length - 1].at, 0, 1_000)],
      ['the code shows with no other press', (r) => within(r.codeAt - r.pairableAt, 0, 5_000) && r.extraPresses === 0],
      ['the phone’s first lookup answers', (r) => r.firstLookup !== null && r.firstLookup.verdict === 'answer'],
      ['it presents on its first attempt', (r) => r.attempts === 1 && ['pending', 'allowed'].includes(r.firstWord)],
      ['Allow pairs it', (r) => r.paired === true],
      ['/v1/blocked answers 200 through the forwarder', (r) => r.blocked === 200]
    ]
  },
  H2: {
    title: 'off then on keeps the name; an off with a round held open writes nothing; on, off, on keeps one timer',
    clauses: [
      ['off then on while the name answers: pairable within 1 s of listening, before the held answer', (r) => r.keep !== null && within(r.keep.pairableAt - r.keep.listeningAt, 0, 1_000) && r.keep.pairableAt < r.keep.releasedAt],
      ['off then on asks once, and nothing in the 25 s after it; still confirmed', (r) => r.keep !== null && r.keep.heldQuestions === 1 && r.keep.afterRelease === 0 && r.keep.quietMs >= 25_000 && r.keep.nameCheckAfter === 'confirmed'],
      ['the switch-on round answered no, so checking began', (r) => r.firstAnswered === 'nx' && r.forgot === true],
      ['the switch went off while the second round was held', (r) => r.heldAt > 0 && within(r.offAt - r.heldAt, 0, 1_500)],
      ['the release came 0.5 s later, inside the 2 s deadline', (r) => within(r.releasedAt - r.offAt, 400, 1_500) && r.releasedAt - r.heldAt < 2_000],
      ['no question in the 120 s after the off', (r) => r.afterOff === 0 && r.quietMs >= 120_000],
      ['on again reads checking, not confirmed', (r) => r.nameCheckOn === 'checking' && r.pairableOn === false],
      ['on, off, on: one question per round at 0, 20 and 50 s', (r) => r.toggle.length >= 3 && r.toggle.length <= 4 && gapsMatch(gapsOf(r.toggle.slice(-3)), [20_000, 30_000]) && r.pressesSpanMs <= 5_000],
      ['never two questions within 1 s', (r) => gapsOf(r.toggle).every((g) => g >= 1_000)]
    ]
  },
  H3: {
    title: 'the switch-on round: Pair at once over a kept confirmation, and a no forgets it',
    clauses: [
      ['Remove closed the door', (r) => r.removedClosed === true],
      ['pairable within 1 s of listening, before the held answer', (r) => within(r.pairableAt - r.listeningAt, 0, 1_000) && r.pairableAt < r.releasedAt],
      ['exactly one question while it was held', (r) => r.heldQuestions === 1],
      ['no further question in 30 s', (r) => r.afterRelease === 0 && r.quietMs >= 30_000],
      ['forgetDoor then Allow: one question, answered NXDOMAIN', (r) => r.forget.firstAnswers.join(',') === 'nx'],
      ['nameCheck reads checking and Pair leaves', (r) => r.forget.nameCheck === 'checking' && r.forget.stage === 'naming' && r.forget.pairButton === false],
      [
        'one yes round 20 s after the no, then pairable',
        (r) => {
          const rows = r.forget.recordRows;
          return rows.length === 1 && rows[0].answered === 'record' && gapsMatch([rows[0].at - r.forget.nxAt], [20_000]) && within(r.forget.pairableAt - rows[0].at, 0, 1_000);
        }
      ]
    ]
  },
  H4: {
    title: 'a relaunch: Pair at once, one question in the background',
    clauses: [
      ['published with no press', (r) => r.publishedWithoutPress === true],
      ['pairable within 1 s of listening', (r) => within(r.pairableAt - r.listeningAt, 0, 1_000)],
      ['exactly one question', (r) => r.heldQuestions === 1],
      ['nothing more after the release', (r) => r.afterRelease === 0 && r.quietMs >= 15_000],
      ['still confirmed', (r) => r.nameCheckAfter === 'confirmed']
    ]
  },
  H5: {
    title: 'a moved tailnet: the old confirmation no longer counts',
    clauses: [
      ['the gate read changed', (r) => r.confirmState === 'changed'],
      ['the sheet drew the new lines', (r) => r.sheetHasMoved === true],
      ['Allow listened again', (r) => r.stateAfterAllow === 'listening'],
      ['the old confirmation no longer counts', (r) => r.nameCheckAtListening === 'checking' && r.pairableAtListening === false && r.pairableWhileHeld === false],
      [
        'Pair waited for its one round',
        (r) => r.rows.length === 1 && r.rows[0].answered === 'record' && within(r.pairableAt - r.releasedAt, 0, 1_000)
      ]
    ]
  },
  H6: {
    title: 'silence: one unreadable round opens Pair, with its line',
    clauses: [
      ['after the no, one silent question 20 s later', (r) => r.rows.length === 2 && r.rows[0].answered === 'nx' && r.rows[1].answered === 'silent' && gapsMatch(gapsOf(r.rows), H6_GAPS)],
      ['pairable at its deadline, reading unreadable', (r) => r.pairable === true && r.nameCheck === 'unreadable' && r.rows.length === 2 && within(r.pairableAt - r.rows[1].at, 1_500, 3_500)],
      ['the ready face draws the unreadable line above Pair', (r) => r.stage === 'ready' && r.unreadableLine === r.words.unreadable && r.lineAbovePair === true && r.pairButton === true]
    ]
  },
  RUN: {
    title: 'no real DNS, no real Tailscale, no agent, nothing left',
    clauses: [
      ['the Tailscale preflight passed', (r) => r.tailscalePreflight === true],
      ['the DNS preflight passed at every launch', (r) => r.dnsPreflights.length > 0 && r.dnsPreflights.every((p) => p === true)],
      ['the quiet agents held at every launch', (r) => r.agentsHeld.length > 0 && r.agentsHeld.every((p) => p === true)],
      ['no real Tailscale in any sample', (r) => r.realTailscale === 0 && r.samples > 0],
      ['no forbidden or refused argv reached the stand-in', (r) => r.forbidden === 0 && r.refusedArgv === 0],
      ['UDP to 127.0.0.1 alone', (r) => r.udpLeaks === 0 && r.udpSamples > 0],
      ['at HEAD every question is A, RD 0, for the name; the parent asked none', (r) => (r.atHead ? r.questionProblems.length === 0 : r.totalQuestions === 0)],
      ['app.log holds neither the name nor the address', (r) => r.appLogRead === true && r.appLogName === false && r.appLogAddress === false],
      ['every stand-in ended and the DNS stand-in closed', (r) => r.standinLeft === 0 && r.dnsClosed === true],
      ['no Electron of this run is left', (r) => r.electronLeft === 0]
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

const FIX_NAME = DEFAULT_SCENARIO.dnsName.replace(/\.$/, '');
const W = wordsFrom('', '');
const q = (at, answered, extra = {}) => ({ at, rd: 0, qtype: 1, qname: FIX_NAME, answered, ...extra });
/** H1's honest rounds, from a listening at 0: the record at 110 s, answered at the round at 155 s. */
const H1_ROWS = [q(100, 'nx'), q(20_100, 'nx'), q(50_150, 'nx'), q(95_200, 'nx'), q(155_300, 'record')];

export const GRADER_FIXTURES = {
  H0: {
    pass: { sheetOpened: true, idleMs: 30_400, dnsQuestions: 0, udp: [], udpPeers: [], parentUdp: [], atHead: true, nameCheck: 'none', pairable: false },
    breaks: {
      'Settings then Phone was open, and idle for 30 s': (r) => void (r.idleMs = 12_000),
      'the DNS stand-in was asked nothing': (r) => void (r.dnsQuestions = 1),
      'no UDP peer but 127.0.0.1': (r) => void (r.udpPeers = ['1.1.1.1:53']),
      'main’s UDP sockets are the parent’s': (r) => void (r.udp = ['*:*']),
      'at HEAD, nameCheck is none': (r) => void (r.nameCheck = 'checking'),
      'at HEAD, pairable is false': (r) => void (r.pairable = true)
    }
  },
  P1: {
    pass: { listeningAt: 1_000, codeAt: 1_900, firstLookup: { at: 2_300, verdict: 'miss' }, afterRecord: ['miss', 'miss', 'miss'], presented: false, attempts: 0, windowShut: true, notice: `${W.expired} ${W.firstName}`, words: W, dnsQuestions: 0 },
    breaks: {
      'the code shows within 5 s of listening': (r) => void (r.codeAt = 9_000),
      'the phone’s first lookup, within 3 s of the code, misses': (r) => void (r.firstLookup = { at: 2_300, verdict: 'answer' }),
      'every lookup after the record is still a miss': (r) => void (r.afterRecord = ['miss', 'answer']),
      'nothing presents': (r) => void (r.presented = true),
      'the window shuts': (r) => void (r.windowShut = false),
      'the sheet says the code expired and why': (r) => void (r.notice = W.expired),
      'the DNS stand-in was asked nothing': (r) => void (r.dnsQuestions = 2)
    }
  },
  H1: {
    pass: {
      listeningAt: 0,
      pairableAt: 155_600,
      samples: [
        { at: 2_000, stage: 'naming', checking: true, pairButton: false },
        { at: 90_000, stage: 'naming', checking: true, pairButton: false },
        { at: 156_000, stage: 'ready', checking: false, pairButton: true }
      ],
      refused: { ok: false, error: `Error invoking remote method 'pocket:beginPairing': ${W.checking} No code was shown.` },
      stateAfterRefusal: 'idle',
      questions: H1_ROWS,
      name: FIX_NAME,
      recordAt: 110_000,
      codeAt: 156_200,
      extraPresses: 0,
      firstLookup: { at: 156_700, verdict: 'answer' },
      attempts: 1,
      firstWord: 'pending',
      paired: true,
      blocked: 200,
      words: W
    },
    breaks: {
      'the sheet wears naming, the checking line and no Pair until pairable': (r) => void (r.samples[1] = { at: 90_000, stage: 'ready', checking: false, pairButton: true }),
      'beginPairing through the bridge is refused with the sentence': (r) => void (r.refused = { ok: true, error: null }),
      'the refusal opened no window': (r) => void (r.stateAfterRefusal = 'waiting'),
      'every question is A, RD 0, for the name': (r) => void (r.questions = r.questions.map((x, i) => (i === 2 ? { ...x, rd: 1 } : x))),
      'the rounds are 20, 30, 45 then 60 s apart': (r) => void (r.questions = r.questions.map((x, i) => (i === 3 ? { ...x, at: 80_000 } : x))),
      'no before the record, yes once after it': (r) => void r.questions.push(q(175_350, 'record')),
      'pairable within 1 s of the yes': (r) => void (r.pairableAt = 158_000),
      'the code shows with no other press': (r) => void (r.extraPresses = 1),
      'the phone’s first lookup answers': (r) => void (r.firstLookup = { at: 156_700, verdict: 'miss' }),
      'it presents on its first attempt': (r) => void (r.attempts = 2),
      'Allow pairs it': (r) => void (r.paired = false),
      '/v1/blocked answers 200 through the forwarder': (r) => void (r.blocked = 0)
    }
  },
  H2: {
    pass: {
      keep: { listeningAt: 1_000, pairableAt: 1_100, releasedAt: 2_300, heldQuestions: 1, afterRelease: 0, quietMs: 25_100, nameCheckAfter: 'confirmed' },
      firstAnswered: 'nx', forgot: true, heldAt: 20_000, offAt: 20_300, releasedAt: 20_850, afterOff: 0, quietMs: 120_200, nameCheckOn: 'checking', pairableOn: false, toggle: [{ at: 1_000 }, { at: 4_500 }, { at: 24_600 }, { at: 54_700 }], pressesSpanMs: 3_100 },
    breaks: {
      'off then on while the name answers: pairable within 1 s of listening, before the held answer': (r) => void (r.keep = { ...r.keep, pairableAt: 21_100 }),
      'off then on asks once, and nothing in the 25 s after it; still confirmed': (r) => void (r.keep = { ...r.keep, heldQuestions: 2 }),
      'the switch-on round answered no, so checking began': (r) => void (r.forgot = false),
      'the switch went off while the second round was held': (r) => void (r.offAt = 19_000),
      'the release came 0.5 s later, inside the 2 s deadline': (r) => void (r.releasedAt = 22_500),
      'no question in the 120 s after the off': (r) => void (r.afterOff = 1),
      'on again reads checking, not confirmed': (r) => void (r.nameCheckOn = 'confirmed'),
      'on, off, on: one question per round at 0, 20 and 50 s': (r) => void r.toggle.push({ at: 74_800 }),
      'never two questions within 1 s': (r) => void (r.toggle = [{ at: 1_000 }, { at: 4_500 }, { at: 24_600 }, { at: 24_900 }, { at: 54_700 }])
    }
  },
  H3: {
    pass: {
      removedClosed: true,
      listeningAt: 10_000,
      pairableAt: 10_250,
      releasedAt: 11_300,
      heldQuestions: 1,
      afterRelease: 0,
      quietMs: 30_100,
      forget: { firstAnswers: ['nx'], nameCheck: 'checking', stage: 'naming', pairButton: false, nxAt: 50_000, recordRows: [{ at: 70_100, answered: 'record' }], pairableAt: 70_400 }
    },
    breaks: {
      'Remove closed the door': (r) => void (r.removedClosed = false),
      'pairable within 1 s of listening, before the held answer': (r) => void (r.pairableAt = 11_500),
      'exactly one question while it was held': (r) => void (r.heldQuestions = 2),
      'no further question in 30 s': (r) => void (r.afterRelease = 1),
      'forgetDoor then Allow: one question, answered NXDOMAIN': (r) => void (r.forget.firstAnswers = ['record']),
      'nameCheck reads checking and Pair leaves': (r) => void (r.forget.pairButton = true),
      'one yes round 20 s after the no, then pairable': (r) => void (r.forget.recordRows = [{ at: 70_100, answered: 'record' }, { at: 90_200, answered: 'record' }])
    }
  },
  H4: {
    pass: { publishedWithoutPress: true, listeningAt: 5_000, pairableAt: 5_000, heldQuestions: 1, afterRelease: 0, quietMs: 15_300, nameCheckAfter: 'confirmed' },
    breaks: {
      'published with no press': (r) => void (r.publishedWithoutPress = false),
      'pairable within 1 s of listening': (r) => void (r.pairableAt = 7_000),
      'exactly one question': (r) => void (r.heldQuestions = 0),
      'nothing more after the release': (r) => void (r.afterRelease = 1),
      'still confirmed': (r) => void (r.nameCheckAfter = 'checking')
    }
  },
  H5: {
    pass: { confirmState: 'changed', sheetHasMoved: true, stateAfterAllow: 'listening', nameCheckAtListening: 'checking', pairableAtListening: false, pairableWhileHeld: false, rows: [{ at: 1_000, answered: 'record' }], releasedAt: 2_050, pairableAt: 2_300 },
    breaks: {
      'the gate read changed': (r) => void (r.confirmState = 'confirmed'),
      'the sheet drew the new lines': (r) => void (r.sheetHasMoved = false),
      'Allow listened again': (r) => void (r.stateAfterAllow = 'refused'),
      'the old confirmation no longer counts': (r) => void (r.pairableWhileHeld = true),
      'Pair waited for its one round': (r) => void (r.pairableAt = 900)
    }
  },
  H6: {
    pass: { rows: [{ at: 0, answered: 'nx' }, { at: 20_050, answered: 'silent' }], pairable: true, pairableAt: 22_200, nameCheck: 'unreadable', stage: 'ready', unreadableLine: W.unreadable, lineAbovePair: true, pairButton: true, words: W },
    breaks: {
      'after the no, one silent question 20 s later': (r) => void r.rows.push({ at: 42_100, answered: 'silent' }),
      'pairable at its deadline, reading unreadable': (r) => void (r.pairableAt = 41_000),
      'the ready face draws the unreadable line above Pair': (r) => void (r.lineAbovePair = false)
    }
  },
  RUN: {
    pass: { tailscalePreflight: true, dnsPreflights: [true, true], agentsHeld: [true, true], realTailscale: 0, samples: 600, forbidden: 0, refusedArgv: 0, udpLeaks: 0, udpSamples: 300, atHead: true, questionProblems: [], totalQuestions: 40, appLogRead: true, appLogName: false, appLogAddress: false, standinLeft: 0, dnsClosed: true, electronLeft: 0 },
    breaks: {
      'the Tailscale preflight passed': (r) => void (r.tailscalePreflight = false),
      'the DNS preflight passed at every launch': (r) => void (r.dnsPreflights = [true, false]),
      'the quiet agents held at every launch': (r) => void (r.agentsHeld = [false]),
      'no real Tailscale in any sample': (r) => void (r.realTailscale = 1),
      'no forbidden or refused argv reached the stand-in': (r) => void (r.refusedArgv = 1),
      'UDP to 127.0.0.1 alone': (r) => void (r.udpLeaks = 1),
      'at HEAD every question is A, RD 0, for the name; the parent asked none': (r) => void (r.questionProblems = ['1 question(s) asked for recursion']),
      'app.log holds neither the name nor the address': (r) => void (r.appLogAddress = true),
      'every stand-in ended and the DNS stand-in closed': (r) => void (r.dnsClosed = false),
      'no Electron of this run is left': (r) => void (r.electronLeft = 1)
    },
    // The parent's side of the one clause that reads differently there.
    refused: [{ what: 'a parent that asked the stand-in anything', clause: 'at HEAD every question is A, RD 0, for the name; the parent asked none', edit: (r) => void Object.assign(r, { atHead: false, totalQuestions: 1 }) }]
  }
};

/** A fixture's reading, cloned, with its words (which hold nothing but text) handed across whole. */
function cloneReading(pass) {
  return structuredClone(pass);
}

function graderSelfTest() {
  let failures = 0;
  const say = (ok, text) => {
    if (!ok) failures += 1;
    process.stdout.write(`${ok ? 'ok  ' : 'FAIL'} ${text}\n`);
  };
  const clauses = gradeFixtures({ graders: GRADERS, fixtures: GRADER_FIXTURES, grade, clone: cloneReading, say, J });
  // The parent's H0 and P1 read no field the parent lacks.
  const parentH0 = { ...cloneReading(GRADER_FIXTURES.H0.pass), atHead: false, nameCheck: undefined, pairable: undefined };
  say(grade('H0', parentH0).ok, 'H0 passes a parent reading, which has no nameCheck and no pairable');
  // The word readers, over texts of their own.
  const src = "export const CODE_EXPIRED = 'The code expired. Nothing was paired.';\nexport const CODE_FIRST_NAME =\n  'The first time, ' + \"it’s slow.\";\nexport const POCKET_NAME_SENTENCES: Readonly<Record<'checking' | 'unreadable', string>> = {\n  checking: 'Pair opens once.',\n  unreadable: 'Could not check.'\n};\n";
  say(constWord(src, 'CODE_EXPIRED') === 'The code expired. Nothing was paired.', 'constWord reads one literal');
  say(constWord(src, 'CODE_FIRST_NAME') === 'The first time, it’s slow.', `constWord reads a concatenation over a line break (${J(constWord(src, 'CODE_FIRST_NAME'))})`);
  say(tableWord(src, 'POCKET_NAME_SENTENCES', 'checking') === 'Pair opens once.' && tableWord(src, 'POCKET_NAME_SENTENCES', 'unreadable') === 'Could not check.', 'tableWord reads both keys of the sentence table');
  const w = wordsFrom(src, src);
  say(w.from.checking === 'source' && w.from.firstName === 'source' && wordsFrom('', '').from.checking === 'spec', 'wordsFrom takes the source first and names the SPEC fallback');
  say(normalizeUdp('127.0.0.1:52001->127.0.0.1:60137') === '127.0.0.1:*->127.0.0.1:*' && udpPeerOf('*:5353') === null && udpPeerOf('10.0.0.2:5->1.1.1.1:53') === '1.1.1.1:53', 'the UDP reader normalises ports and finds a peer');
  process.stdout.write(failures === 0 ? `[p332] grader self-test PASS: ${String(Object.keys(GRADERS).length)} graders, ${String(clauses)} clauses, each shown to go red on its own break.\n` : `[p332] grader self-test FAIL: ${String(failures)}.\n`);
  return failures === 0;
}

// ---------------------------------------------------------------------------
// Main's UDP sockets, read with lsof (pure readers, used by the self-test too)
// ---------------------------------------------------------------------------

/** `a:1->b:2` → `b:2`, or null for a socket with no peer. */
export function udpPeerOf(name) {
  const i = String(name).indexOf('->');
  return i < 0 ? null : String(name).slice(i + 2);
}
/** Every port as `*`, so two runs' socket lists compare by address alone. */
export function normalizeUdp(name) {
  return String(name).replace(/:(\d+|\*)(?=->|$)/g, ':*');
}
/** `lsof -a -p <pid> -iUDP -n -P`, as its name fields. */
function udpOf(pid) {
  if (!(pid > 0)) return [];
  const r = spawnSync('/usr/sbin/lsof', ['-a', '-p', String(pid), '-iUDP', '-n', '-P', '-F', 'n'], { encoding: 'utf8', timeout: 10_000 });
  return (r.stdout ?? '').split('\n').filter((l) => l.startsWith('n')).map((l) => l.slice(1));
}

if (process.argv.includes('--grader-self-test')) {
  process.exit(graderSelfTest() ? 0 : 1);
}

// ===========================================================================
// THE RUN. Everything below starts processes; builders never reach it.
// ===========================================================================

const CHECKOUT = resolve((process.env['P332_PARENT_CHECKOUT'] ?? '').trim() || ROOT);
const AT_PARENT = CHECKOUT !== ROOT;
const TAG = `[p332 ${AT_PARENT ? 'parent' : 'head'}]`;
const say = (line) => console.log(`${TAG} ${line}`);
const ARMS = new Set(((process.env['P332_ARMS'] ?? '').trim() || (AT_PARENT ? 'H0,P1' : 'H0,P1,H2,H3,H4,H5,H6')).split(',').map((s) => s.trim()));
const KEEP = (process.env['P332_KEEP'] ?? '') === '1';

if (!existsSync(join(CHECKOUT, 'out', 'main', 'index.js'))) {
  console.error(`${TAG} ${CHECKOUT} has no build at out/main/index.js. Run npm run build there first.`);
  process.exit(2);
}

const sourceOf = (file) => {
  const path = join(CHECKOUT, file);
  return existsSync(path) ? readFileSync(path, 'utf8') : '';
};
const WORDS = wordsFrom(sourceOf('src/shared/ipc/pocket.ts'), sourceOf('src/renderer/settings/PhoneSection.tsx'));

const RUN = resolve((process.env['P332_RUN'] ?? '').trim() || `/private/tmp/p332-probe-${String(process.pid)}`);
if (!RUN.startsWith('/private/tmp/')) {
  console.error(`${TAG} the scratch world must be under /private/tmp; ${RUN} is not`);
  process.exit(2);
}
const HOME = join(RUN, 'home');
const HARNESS = join(RUN, 'harness');
const PROFILE = join(HARNESS, 'profile');
const PROJECT = join(RUN, 'project');
/** OUTSIDE the profile, so the helper's profile sweep never takes the stand-in's children for the app's. */
const STANDIN_DIR = join(RUN, 'standin');
const SOCKET = `gmux-p332-${String(process.pid)}`;
const APP_LOG = join(PROFILE, 'logs', 'app.log');
const NAME = DEFAULT_SCENARIO.dnsName.replace(/\.$/, '');
const MOVED = 'moved@example.com';
const OUT = join(ROOT, 'out', 'p332');

const report = { checkout: CHECKOUT, atParent: AT_PARENT, arms: [], readings: {}, words: WORDS.from };
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
let lastShim = 0;
let lastApp = 0;
let tailscalePreflight = false;
const dnsPreflights = [];
const agentsHeld = [];
const launches = [];

/** Main's UDP, sampled every 2 s; a peer that is not 127.0.0.1 ends the run. */
const udp = { samples: 0, leaks: [], seen: new Set() };
function sampleUdp() {
  const pid = lastApp;
  if (!(pid > 0)) return;
  udp.samples += 1;
  for (const name of udpOf(pid)) {
    udp.seen.add(normalizeUdp(name));
    const peer = udpPeerOf(name);
    if (peer !== null && !loopbackPeer(peer)) udp.leaks.push({ at: Date.now(), name });
  }
}
const udpTimer = setInterval(sampleUdp, 2_000);
udpTimer.unref?.();

/** Every wait in the run asks this first: a leak ends the app through the helper's teardown. */
function stopIfLeaked() {
  if (udp.leaks.length > 0) throw new Error(`main sent UDP to something that is not 127.0.0.1: ${J(udp.leaks.slice(0, 3))}. The run stops here and the app is ended.`);
}
async function sleep(ms) {
  const until = Date.now() + ms;
  for (;;) {
    stopIfLeaked();
    const left = until - Date.now();
    if (left <= 0) return;
    await sleepRaw(Math.min(left, 250));
  }
}
async function waitFor(test, ms, every = 200) {
  const started = Date.now();
  for (;;) {
    stopIfLeaked();
    const v = await test();
    if (v) return true;
    if (Date.now() - started >= ms) return false;
    await sleepRaw(every);
  }
}

const questionsFrom = (i) => dns.log().slice(i);

// ---------------------------------------------------------------------------
// The app, its main window and its Settings window
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
async function attachSettings(main, timeoutMs = 30_000) {
  await cdpEval(main, 'window.gmux.openSettings().then(() => true)');
  const started = Date.now();
  for (;;) {
    const t = (await targets()).find((x) => x.type === 'page' && /\/renderer\/settings\/index\.html/.test(String(x.url)) && typeof x.webSocketDebuggerUrl === 'string');
    if (t !== undefined) {
      const cdp = await wsConnect(t.webSocketDebuggerUrl);
      await cdp.call('Runtime.enable');
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
/** Fire a bridge call and do not wait for it: the arms that must act inside a round's deadline. */
async function fire(cdp, method, arg) {
  await cdpEval(cdp, `(() => { void window.gmux.pocket[${J(method)}](${arg === undefined ? '' : J(arg)}).catch(() => undefined); return true; })()`);
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
/** The pairing card, as a person sees it; since Phase 332.1 the checking sentence is the name block's hover (`nameTitle`), so H1 reads either. */
async function card(settings) {
  return JSON.parse(
    await cdpEval(
      settings,
      `(() => { const s = document.querySelector('section[aria-label="Phone"]'); const c = s === null ? null : s.querySelector('[data-phone-stage]'); const pair = c === null ? null : c.querySelector('[data-phone-action="pair"]'); const line = c === null ? null : c.querySelector('[data-phone-name-unreadable]'); const notice = c === null ? null : c.querySelector('.phone-notice'); const block = c === null ? null : c.querySelector('[data-phone-name]'); return JSON.stringify({ stage: c === null ? null : c.getAttribute('data-phone-stage'), text: c === null ? '' : c.innerText, nameTitle: block === null ? null : block.getAttribute('title'), sheet: s === null ? '' : s.innerText, pairButton: pair !== null, unreadableLine: line === null ? null : line.innerText.trim(), lineAbovePair: line !== null && pair !== null && (line.compareDocumentPosition(pair) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0, notice: notice === null ? null : notice.innerText.trim() }); })()`
    )
  );
}
/** Click one element of the Phone section by selector; false when it is not there or disabled. */
async function click(settings, selector) {
  return (
    (await cdpEval(settings, `(() => { const b = document.querySelector(${J(selector)}); if (b === null || b.disabled) return false; b.click(); return true; })()`)) === true
  );
}
/**
 * A FIRST SETUP'S PRESS from rest (Phase 333.1, build/p3331/SPEC.md §7.6, D17):
 * Pair where the sheet draws it with the door off (the parent always; a build
 * with the three steps only with a phone paired), else the switch, whose on
 * press asks for the code, so at both builds the code shows by itself once
 * the name answers. Answers 'pair', 'switch' or false.
 */
async function pressFirstSetup(settings) {
  if (await click(settings, '[data-phone-action="pair"]')) return 'pair';
  const on =
    (await cdpEval(
      settings,
      `(() => { const s = document.querySelector('section[aria-label="Phone"]'); if (s === null) return false; const b = [...s.querySelectorAll('button[role="switch"]')].find((x) => x.getAttribute('aria-label') === ${J(WORDS.doorLabel)} && x.getAttribute('aria-checked') === 'false' && !x.disabled); if (b === undefined) return false; b.click(); return true; })()`
    )) === true;
  return on ? 'switch' : false;
}
const linesReady = (s) => s.confirmable === true && s.state !== 'opening' && s.publicName === NAME && s.confirmState !== 'confirmed' && s.confirmLines.some((l) => l.includes(`https://${NAME}:${String(s.publicPort)}`));
/** Press the sheet's Allow for the door once its lines are ready (probe:p330's shape). */
async function allowDoor(settings, main, ms = 20_000) {
  const ready = await waitStatus(main, linesReady, ms);
  if (!ready.ok) return false;
  if (!(await waitFor(async () => (await cdpEval(settings, `(() => { const a = document.querySelector('[data-phone-action="confirm-door"]'); return a !== null && !a.disabled; })()`)) === true, 10_000))) return false;
  return click(settings, '[data-phone-action="confirm-door"]');
}
/** Allow again after a withdrawal: the lines if they are drawn, else the switch on first. */
async function allowAgain(settings, main) {
  if (await allowDoor(settings, main, 6_000)) return true;
  await pocket(main, 'setDoor', { on: true });
  return allowDoor(settings, main, 25_000);
}
/** The phone's Allow, on the sheet, when main says a phone presented. */
async function allowPhoneFromSheet(settings, main) {
  const v = await pocket(main, 'pairingState');
  if (!v.ok || v.value.state !== 'presented') return;
  if (!(await click(settings, '[data-phone-action="allow-phone"]'))) await pocket(main, 'allowPhone', { linesRead: v.value.lines, hashRead: v.value.hash });
}
async function setOff(main) {
  await pocket(main, 'setDoor', { on: false });
  return waitStatus(main, (s) => s.state === 'off', 20_000);
}
async function setOnListening(main) {
  await pocket(main, 'setDoor', { on: true });
  return waitStatus(main, (s) => s.state === 'listening', 45_000);
}
/** Wait until the stand-in logs a question after `from` matching `test`, polling fast. */
async function waitQuestion(from, test, ms) {
  let hit = null;
  await waitFor(() => {
    hit = questionsFrom(from).find(test) ?? null;
    return hit !== null;
  }, ms, 50);
  return hit;
}

function launchOptions(label) {
  return {
    label,
    userDataDir: PROFILE,
    cwd: CHECKOUT,
    tmuxSocket: SOCKET,
    args: ['--remote-debugging-port=0', '--use-mock-keychain'],
    env: withoutDevRenderer({
      ...INHERITED_CLAUDE,
      HOME,
      GMUX_TMUX_SOCKET: SOCKET,
      GMUX_PROBES: '1',
      GMUX_LOG_FILE: '1',
      GMUX_SPECSTORY_NO_CLOUD: '1',
      GMUX_CONFIG_ROOT: join(PROFILE, 'gmux', 'config'),
      GMUX_HARNESS_DIR: HARNESS,
      // THE STAND-INS. A development build honours both and a packaged one
      // ignores both, which is why no packaged Tortie is ever launched here.
      GMUX_TAILSCALE_BIN: standin.binPath,
      [NAME_SERVERS_VAR]: dns.servers
    }),
    graceMs: 8_000,
    ceilingMs: 2_400_000
  };
}

/**
 * One launch through the helper, after both preflights and the quiet agents,
 * with the pids recorded whatever happened.
 */
async function launch(label, body) {
  const pre = preflightStandin(standin, standin.binPath);
  if (!pre.ok) throw new Error(`the Tailscale preflight refused the launch: ${pre.problems.join('; ')}`);
  const value = launchOptions(label).env[NAME_SERVERS_VAR];
  const dnsPre = await dns.preflight(value);
  dnsPreflights.push(dnsPre.ok && loopbackOnlyServers(value));
  if (!dnsPre.ok) throw new Error(`the DNS preflight refused the launch: ${dnsPre.problems.join('; ')}`);
  writeQuietAgents(PROFILE);
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
        // NO AGENT STARTS: the five renamed rows must read not installed, or nothing goes on.
        const list = JSON.parse(await cdpEval(main, 'window.gmux.agentsList().then((r) => JSON.stringify(r))'));
        const held = quietAgentsHeld(list);
        agentsHeld.push(held.ok);
        if (!held.ok) throw new Error(`agents:list says the renamed agents are not all absent: ${held.problems.join('; ')}`);
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

const appLog = () => {
  try {
    return readFileSync(APP_LOG, 'utf8');
  } catch {
    return null;
  }
};

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

let phone = null;

try {
  rmSync(RUN, { recursive: true, force: true });
  for (const dir of [HOME, HARNESS, PROFILE, PROJECT]) mkdirSync(dir, { recursive: true });
  standin = makeStandin({ dir: STANDIN_DIR, scenario: { ...DEFAULT_SCENARIO } });
  const pre = preflightStandin(standin, standin.binPath);
  tailscalePreflight = pre.ok;
  if (!pre.ok) throw new Error(`the Tailscale preflight refused: ${pre.problems.join('; ')}`);
  // NXDOMAIN until P1 first sees `listening`.
  dns = await makeDnsStandin({ name: NAME, mode: { nxUntil: null } });
  say(`the DNS stand-in answers for ${NAME} on ${dns.servers}`);
  watch = watchForRealTailscale({ roots: () => [lastShim, lastApp].filter((p) => p > 0), everyMs: 1_000 });

  let parent = null;
  if (!AT_PARENT) {
    try {
      parent = JSON.parse(readFileSync(join(OUT, 'probe-p332-parent.json'), 'utf8'));
    } catch {
      parent = null;
    }
  }

  // ======================================================================
  // LAUNCH 1 — H0, P1/H1, and at HEAD H2, H3, H5 and H6
  // ======================================================================
  await launch('p332-order', async (handle, main, appPidNow) => {
    let settings = null;
    try {
      settings = await attachSettings(main);
      await sleep(2_000);

      // ---- H0: the door never on, the sheet open, 30 s ----------------------
      if (ARMS.has('H0')) {
        const t0 = Date.now();
        await sleep(30_000);
        sampleUdp();
        const now = udpOf(appPidNow());
        const s = await status(main);
        arm('H0', {
          sheetOpened: settings !== null,
          idleMs: Date.now() - t0,
          dnsQuestions: dns.log().length,
          udp: now.map(normalizeUdp).sort(),
          udpPeers: now.map(udpPeerOf).filter((p) => p !== null),
          parentUdp: Array.isArray(parent?.readings?.H0?.udp) ? parent.readings.H0.udp : null,
          atHead: !AT_PARENT,
          nameCheck: s?.nameCheck,
          pairable: s?.pairable
        });
        if (!AT_PARENT && parent === null) say('H0: no parent reading at out/p332/probe-p332-parent.json, so main’s UDP sockets were not compared');
      }

      // ---- P1 / H1: the same script at both builds ------------------------
      const from1 = dns.log().length;
      // Phase 333.1: the switch where the sheet draws no Pair with the door off.
      const pressed = await pressFirstSetup(settings);
      if (!pressed) throw new Error('the sheet drew no Pair button and no enabled off switch to press with the door off');
      say(`P1: the first setup's press was ${pressed}`);
      if (!(await allowDoor(settings, main))) throw new Error('the lines were never ready to Allow after Pair');
      const listening = await waitStatus(main, (s) => s.state === 'listening', 60_000);
      if (!listening.ok) throw new Error(`the door never listened after Allow: ${J({ state: listening.status?.state, refusal: listening.status?.refusal })}`);
      const listeningAt = listening.at;
      const recordAt = listeningAt + RECORD_DELAY_MS;
      dns.setMode({ nxUntil: recordAt });
      const model = makeResolverModel({ zoneAnswers: (at) => at >= recordAt });
      say(`listening; the record appears at +${String(RECORD_DELAY_MS / 1000)} s`);

      // Until the code shows: the card every second, main every 250 ms, and at
      // HEAD one bridge press 5 s in, which must be refused.
      const samples = [];
      let pairableAt = null;
      let refused = null;
      let stateAfterRefusal = null;
      let codeAt = null;
      let lastCard = 0;
      const codeBy = listeningAt + (AT_PARENT ? 30_000 : 300_000);
      while (Date.now() < codeBy) {
        stopIfLeaked();
        const s = await status(main);
        if (pairableAt === null && s?.pairable === true) pairableAt = Date.now();
        if (Date.now() - lastCard >= 1_000) {
          lastCard = Date.now();
          const c = await card(settings);
          samples.push({ at: lastCard, stage: c.stage, checking: c.text.includes(WORDS.checking) || c.nameTitle === WORDS.checking, pairButton: c.pairButton });
          if (c.stage === 'showing') {
            codeAt = lastCard;
            break;
          }
        }
        if (!AT_PARENT && refused === null && Date.now() >= listeningAt + 5_000) {
          refused = await pocket(main, 'beginPairing');
          const v = await pocket(main, 'pairingState');
          stateAfterRefusal = v.ok ? v.value.state : null;
        }
        await sleepRaw(250);
      }
      if (codeAt === null) throw new Error(`no code showed within ${String((codeBy - listeningAt) / 1000)} s of listening (${J({ pairable: pairableAt !== null, last: samples.at(-1) })})`);

      // The probe's own payload, a fresh 3:00 from now; the phone uses it.
      const offered = await pocket(main, 'beginPairing');
      const read = offered.ok ? readOffer(offered.value.payload) : { ok: false, why: offered.error };
      if (!read.ok) throw new Error(`the probe's own code does not read the phone's way: ${read.why}`);
      const offer = read.offer;
      phone = makePhone('p332 phone', offer.dx);
      const doorNow = () => doorFrom(offer, standin.readFunnel()[0]?.forwarderPort ?? 0);
      const deadline = Date.now() + 180_000 + 3_000;
      let presented = false;
      let attempts = 0;
      let firstWord = null;
      let paired = false;
      while (Date.now() < deadline) {
        stopIfLeaked();
        const v = await pocket(main, 'pairingState');
        if (v.ok && v.value.state === 'presented') presented = true;
        if (model.lookup(NAME) === 'answer') {
          attempts += 1;
          const got = await pairThrough(doorNow(), offer, phone, { tries: 20, everyMs: 500, between: () => allowPhoneFromSheet(settings, main) });
          firstWord = got.words[0] ?? null;
          paired = got.ok;
          presented = true;
          break;
        }
        await sleep(2_000);
      }
      const lookups = model.lookups();
      if (AT_PARENT || !paired) await sleep(4_000);
      const shut = await pocket(main, 'pairingState');
      const face = await card(settings);
      const blocked = paired ? await signedGet(phone, doorNow(), '/v1/blocked') : { status: 0 };
      const firstLookup = lookups[0] === undefined ? null : { at: lookups[0].at, verdict: lookups[0].verdict };
      if (AT_PARENT) {
        if (ARMS.has('P1')) {
          arm('P1', {
            listeningAt,
            codeAt,
            firstLookup,
            afterRecord: lookups.filter((l) => l.at >= recordAt).map((l) => l.verdict),
            presented,
            attempts,
            windowShut: shut.ok && shut.value.state !== 'waiting' && shut.value.state !== 'presented',
            notice: face.notice,
            words: WORDS,
            dnsQuestions: dns.log().length
          });
        }
        return;
      }
      const questions = questionsFrom(from1).filter((x) => pairableAt === null || x.at <= pairableAt + 500);
      if (ARMS.has('P1')) {
        arm('H1', {
          listeningAt,
          pairableAt: pairableAt ?? -1,
          samples,
          refused: refused ?? { ok: true, error: null },
          stateAfterRefusal,
          questions,
          name: NAME,
          recordAt,
          codeAt,
          extraPresses: 0,
          firstLookup,
          attempts,
          firstWord,
          paired,
          blocked: blocked.status,
          words: WORDS
        });
      }
      report.readings.sideBySide = {
        parent: parent?.readings?.P1 === undefined ? null : { codeAfterListeningS: (parent.readings.P1.codeAt - parent.readings.P1.listeningAt) / 1000, firstLookup: parent.readings.P1.firstLookup?.verdict ?? null, afterRecord: parent.readings.P1.afterRecord, presented: parent.readings.P1.presented, notice: parent.readings.P1.notice },
        head: { codeAfterListeningS: (codeAt - listeningAt) / 1000, firstLookup: firstLookup?.verdict ?? null, paired, blocked: blocked.status }
      };

      // ---- H2: an off with a round held open --------------------------------
      if (ARMS.has('H2')) {
        // OFF THEN ON WHILE THE NAME ANSWERS (the fix round's row): H1 confirmed
        // the name and the off KEEPS it, so Pair shows as soon as the door
        // listens, as it did before this phase, and one question is asked in
        // the background; it is held here, so Pair cannot be its answer.
        if (!(await setOff(main)).ok) throw new Error('H2: the door did not go off before the kept switch-on');
        dns.setMode('hold');
        const fromK = dns.log().length;
        await pocket(main, 'setDoor', { on: true });
        const lK = await waitStatus(main, (s) => s.state === 'listening', 45_000, 100);
        const pK = await waitStatus(main, (s) => s.pairable === true, 5_000, 100);
        const heldK = await waitQuestion(fromK, (x) => x.answered === 'held', 5_000);
        await sleepRaw(heldK === null ? 0 : Math.max(0, heldK.at + 1_000 - Date.now()));
        const heldQuestionsK = questionsFrom(fromK).length;
        const releasedAtK = Date.now();
        dns.release('record');
        const afterK = dns.log().length;
        const quietK = Date.now();
        await sleep(25_000);
        const keptAfter = await status(main);
        const keep = lK.ok
          ? { listeningAt: lK.at, pairableAt: pK.ok ? pK.at : -1, releasedAt: releasedAtK, heldQuestions: heldQuestionsK, afterRelease: questionsFrom(afterK).length, quietMs: Date.now() - quietK, nameCheckAfter: keptAfter?.nameCheck ?? null }
          : null;
        // Then the switch-on round meets NXDOMAIN, which forgets the name and
        // starts checking; the round after it is the one held across the off.
        if (!(await setOff(main)).ok) throw new Error('H2: the door did not go off');
        dns.setMode('nx');
        const from2 = dns.log().length;
        if (!(await setOnListening(main)).ok) throw new Error('H2: the door did not publish again after on');
        const first = await waitQuestion(from2, () => true, 10_000);
        await waitFor(() => (questionsFrom(from2)[0]?.answered ?? 'held') !== 'held', 3_000, 50);
        const forgot = await waitStatus(main, (s) => s.nameCheck === 'checking' && s.pairable === false, 5_000, 100);
        dns.setMode('hold');
        const held = await waitQuestion(from2, (x) => x.answered === 'held', 30_000);
        if (held === null) throw new Error('H2: no second round came to hold');
        const offAt = Date.now();
        await fire(main, 'setDoor', { on: false });
        await sleepRaw(Math.max(0, offAt + 500 - Date.now()));
        const releasedAt = Date.now();
        dns.release('record');
        const quietFrom = Date.now();
        const afterFrom = dns.log().length;
        await sleep(120_000);
        const afterOff = questionsFrom(afterFrom).length;
        const quietMs = Date.now() - quietFrom;
        // On again with its first round held: a late yes that had been written
        // would make this a switch-on round, reading confirmed and pairable.
        dns.setMode('hold');
        const on = await setOnListening(main);
        const readOn = await status(main);
        dns.release('nx');
        // On, off, on inside 5 s, against NXDOMAIN, so every round asks again.
        if (!(await setOff(main)).ok) throw new Error('H2: the door did not go off before the toggle');
        dns.setMode('nx');
        const from3 = dns.log().length;
        const p0 = Date.now();
        await fire(main, 'setDoor', { on: true });
        await sleepRaw(1_500);
        await fire(main, 'setDoor', { on: false });
        await sleepRaw(1_500);
        await fire(main, 'setDoor', { on: true });
        const pressesSpanMs = Date.now() - p0;
        await sleep(8_000);
        const settled = await waitStatus(main, (s) => s.state === 'listening', 30_000);
        await sleep(Math.max(0, 62_000 - (Date.now() - settled.at)));
        arm('H2', {
          keep,
          firstAnswered: first?.answered ?? null,
          forgot: forgot.ok,
          heldAt: held.at,
          offAt,
          releasedAt,
          afterOff,
          quietMs,
          nameCheckOn: on.ok ? readOn?.nameCheck : null,
          pairableOn: on.ok ? readOn?.pairable : null,
          toggle: questionsFrom(from3).filter((x) => x.at <= settled.at + 62_000).map((x) => ({ at: x.at, answered: x.answered })),
          pressesSpanMs
        });
      }

      // ---- H3: the switch-on round over a kept confirmation -----------------
      if (ARMS.has('H3')) {
        dns.setMode('record');
        await setOff(main);
        await setOnListening(main);
        const confirmed = await waitStatus(main, (s) => s.pairable === true && s.nameCheck === 'confirmed', 45_000);
        if (!confirmed.ok) throw new Error(`H3: the door never confirmed its name before the Remove: ${J({ nameCheck: confirmed.status?.nameCheck })}`);
        if (phone === null || !(confirmed.status.phones ?? []).some((p) => p.id === phone.id)) {
          cannotRead('H3', 'no phone of this run is paired, so there is nothing to Remove');
        } else {
          if (!(await click(settings, `[data-phone-id="${phone.id}"] [data-phone-action="remove-phone"]`))) await pocket(main, 'removePhone', phone.id);
          const closed = await waitStatus(main, (s) => s.state !== 'listening' && s.confirmState !== 'confirmed', 20_000);
          dns.setMode('hold');
          const from4 = dns.log().length;
          if (!(await allowDoor(settings, main))) throw new Error('H3: the lines were never ready to Allow after the Remove');
          const l3 = await waitStatus(main, (s) => s.state === 'listening', 45_000, 100);
          const p3 = await waitStatus(main, (s) => s.pairable === true, 5_000, 100);
          const heldRow = await waitQuestion(from4, (x) => x.answered === 'held', 5_000);
          await sleepRaw(heldRow === null ? 0 : Math.max(0, heldRow.at + 1_000 - Date.now()));
          const heldQuestions = questionsFrom(from4).length;
          const releasedAt = Date.now();
          dns.release('record');
          const afterFrom = dns.log().length;
          const quietFrom = Date.now();
          await sleep(30_000);
          const afterRelease = questionsFrom(afterFrom).length;
          const quietMs = Date.now() - quietFrom;
          // forgetDoor, NXDOMAIN, then Allow: the kept confirmation meets a no.
          await pocket(main, 'forgetDoor');
          await waitStatus(main, (s) => s.state !== 'listening' && s.confirmState !== 'confirmed', 20_000);
          dns.setMode('nx');
          const from5 = dns.log().length;
          if (!(await allowAgain(settings, main))) throw new Error('H3: the lines were never ready to Allow after forgetDoor');
          await waitStatus(main, (s) => s.state === 'listening', 45_000);
          const nx = await waitQuestion(from5, (x) => x.answered === 'nx', 10_000);
          await waitStatus(main, (s) => s.nameCheck === 'checking', 5_000, 100);
          await sleep(1_000);
          const afterNo = await status(main);
          const face = await card(settings);
          const firstAnswers = questionsFrom(from5).map((x) => x.answered);
          dns.setMode('record');
          const p5 = await waitStatus(main, (s) => s.pairable === true, 60_000, 100);
          arm('H3', {
            removedClosed: closed.ok,
            listeningAt: l3.at,
            pairableAt: p3.ok ? p3.at : -1,
            releasedAt,
            heldQuestions,
            afterRelease,
            quietMs,
            forget: {
              firstAnswers,
              nameCheck: afterNo?.nameCheck,
              stage: face.stage,
              pairButton: face.pairButton,
              nxAt: nx?.at ?? -1,
              recordRows: questionsFrom(from5).filter((x) => x.answered === 'record' && x.at <= (p5.ok ? p5.at : Infinity)).map((x) => ({ at: x.at, answered: x.answered })),
              pairableAt: p5.ok ? p5.at : -1
            }
          });
        }
      }

      // ---- H5: a moved tailnet ----------------------------------------------
      if (ARMS.has('H5')) {
        dns.setMode('record');
        const ready = await waitStatus(main, (s) => s.state === 'listening' && s.pairable === true, 60_000);
        const child = standin.readFunnel()[0] ?? null;
        if (!ready.ok || child === null) {
          cannotRead('H5', `the door was not published and pairable before the move (${J({ state: ready.status?.state, pairable: ready.status?.pairable, child: child !== null })})`);
        } else if (!(spawnSync('/bin/ps', ['-ww', '-p', String(child.pid), '-o', 'command='], { encoding: 'utf8' }).stdout ?? '').includes('tailscale-standin.mjs')) {
          cannotRead('H5', `pid ${String(child.pid)} no longer names the Tailscale stand-in, so it is not signalled`);
        } else {
          const reads = standin.readLog().filter((e) => e.kind === 'status' && e.verdict === 'answered').length;
          standin.setScenario({ tailnetAfterReads: { n: reads, name: MOVED } });
          process.kill(child.pid, 'SIGKILL');
          const moved = await waitStatus(main, (s) => s.confirmState === 'changed', 30_000);
          await waitFor(async () => (await card(settings)).sheet.includes(MOVED), 10_000);
          const sheetHasMoved = (await card(settings)).sheet.includes(MOVED);
          standin.setScenario({ tailnet: MOVED, tailnetAfterReads: null });
          // The Allow's one round is HELD: one yes confirms (the fix round), and
          // on loopback it would land before main could be asked what it says.
          dns.setMode('hold');
          const from6 = dns.log().length;
          await allowAgain(settings, main);
          const l5 = await waitStatus(main, (s) => s.state === 'listening', 45_000, 100);
          const atL = await status(main);
          await waitQuestion(from6, (x) => x.answered === 'held', 5_000);
          await sleep(1_000);
          const whileHeld = await status(main);
          const releasedAt = Date.now();
          dns.release('record');
          const p6 = await waitStatus(main, (s) => s.pairable === true, 10_000, 100);
          arm('H5', {
            confirmState: moved.status?.confirmState,
            sheetHasMoved,
            stateAfterAllow: l5.status?.state,
            nameCheckAtListening: atL?.nameCheck,
            pairableAtListening: atL?.pairable,
            pairableWhileHeld: whileHeld?.pairable,
            rows: questionsFrom(from6).filter((x) => x.at <= (p6.ok ? p6.at : Infinity)).map((x) => ({ at: x.at, answered: x.answered })),
            releasedAt,
            pairableAt: p6.ok ? p6.at : -1
          });
        }
      }

      // ---- H6: silence --------------------------------------------------------
      if (ARMS.has('H6')) {
        // The off keeps H5's confirmation (the fix round), so the switch-on
        // round meets NXDOMAIN first, which forgets it; then the zone goes quiet.
        await setOff(main);
        dns.setMode('nx');
        const from7 = dns.log().length;
        const on6 = await setOnListening(main);
        if (!on6.ok) {
          const again = await allowAgain(settings, main);
          if (!again) throw new Error('H6: the door did not publish after on');
        }
        await waitQuestion(from7, (x) => x.answered === 'nx', 10_000);
        await waitStatus(main, (s) => s.nameCheck === 'checking' && s.pairable === false, 5_000, 100);
        dns.setMode('silent');
        const p7 = await waitStatus(main, (s) => s.pairable === true, 60_000, 100);
        await sleep(1_000);
        const s7 = await status(main);
        const face = await card(settings);
        arm('H6', {
          rows: questionsFrom(from7).filter((x) => x.at <= (p7.ok ? p7.at : Infinity)).map((x) => ({ at: x.at, answered: x.answered })),
          pairable: s7?.pairable === true,
          pairableAt: p7.ok ? p7.at : -1,
          nameCheck: s7?.nameCheck,
          stage: face.stage,
          unreadableLine: face.unreadableLine,
          lineAbovePair: face.lineAbovePair,
          pairButton: face.pairButton,
          words: WORDS
        });
      }

      // ---- ready for H4: confirmed, then quit ---------------------------------
      if (ARMS.has('H4')) {
        await setOff(main);
        dns.setMode('record');
        const on = await setOnListening(main);
        if (!on.ok) await allowAgain(settings, main);
        const confirmed = await waitStatus(main, (s) => s.nameCheck === 'confirmed' && s.pairable === true, 60_000);
        report.readings.beforeRelaunch = { nameCheck: confirmed.status?.nameCheck, pairable: confirmed.status?.pairable };
        dns.setMode('hold');
        await cdpEval(main, '(() => { try { window.gmux.quit(); } catch {} return true; })()', 10_000).catch(() => null);
        await Promise.race([handle.exited, sleepRaw(40_000)]);
      }
    } finally {
      settings?.close();
    }
  });

  // ======================================================================
  // LAUNCH 2 — H4, the relaunch
  // ======================================================================
  if (ARMS.has('H4') && !AT_PARENT) {
    const from8 = dns.log().length;
    await launch('p332-relaunch', async (handle, main) => {
      const l8 = await waitStatus(main, (s) => s.state === 'listening', 90_000, 100);
      const p8 = await waitStatus(main, (s) => s.pairable === true, 5_000, 100);
      const heldRow = await waitQuestion(from8, (x) => x.answered === 'held', 5_000);
      await sleepRaw(heldRow === null ? 0 : Math.max(0, heldRow.at + 1_000 - Date.now()));
      const heldQuestions = questionsFrom(from8).length;
      dns.release('record');
      const afterFrom = dns.log().length;
      const quietFrom = Date.now();
      await sleep(15_000);
      const after = await status(main);
      arm('H4', {
        publishedWithoutPress: l8.ok,
        listeningAt: l8.at,
        pairableAt: p8.ok ? p8.at : -1,
        heldQuestions,
        afterRelease: questionsFrom(afterFrom).length,
        quietMs: Date.now() - quietFrom,
        nameCheckAfter: after?.nameCheck
      });
      await cdpEval(main, '(() => { try { window.gmux.quit(); } catch {} return true; })()', 10_000).catch(() => null);
      await Promise.race([handle.exited, sleepRaw(30_000)]);
    });
  }
} catch (err) {
  cannotRead('the run', `it threw: ${String(err?.stack ?? err)}`);
} finally {
  // Everything this run started, by pid, whatever happened.
  clearInterval(udpTimer);
  const ended = standin === null ? { ended: [], left: [] } : endStandinProcesses(STANDIN_DIR, 1_500);
  const findings = watch?.stop() ?? [];
  const log = standin?.readLog() ?? [];
  const questions = dns?.log() ?? [];
  if (dns !== null) await dns.close();
  const text = appLog();
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
    dnsPreflights,
    agentsHeld,
    realTailscale: findings.length,
    samples: watch?.samples() ?? 0,
    forbidden: log.filter((e) => e.forbidden === true).length,
    refusedArgv: log.filter((e) => e.verdict === 'refused').length,
    udpLeaks: udp.leaks.length,
    udpSamples: udp.samples,
    atHead: !AT_PARENT,
    questionProblems: AT_PARENT ? [] : nameQuestionProblems(questions, NAME),
    totalQuestions: questions.length,
    appLogRead: text !== null,
    appLogName: text !== null && text.toLowerCase().includes(NAME),
    appLogAddress: text !== null && text.includes(STANDIN_ADDRESS),
    standinLeft: ended.left.length,
    dnsClosed: dns === null || dns.closed(),
    electronLeft: ours.length
  });
  report.readings.udpSeen = [...udp.seen].sort();
  report.readings.udpLeaks = udp.leaks;
  report.readings.realTailscaleFindings = findings;
  report.readings.dnsQuestions = questions;
  report.readings.standinEnded = ended;
  report.readings.processRowsAtEnd = processRows().filter((r) => r.command.includes('tailscale-standin.mjs')).length;
  if (!KEEP) rmSync(RUN, { recursive: true, force: true });
}

mkdirSync(OUT, { recursive: true });
const outFile = join(OUT, `probe-p332${AT_PARENT ? '-parent' : ''}.json`);
const strip = (r) => (r !== null && typeof r === 'object' && 'words' in r ? { ...r, words: undefined } : r);
writeFileSync(outFile, `${J({ ...report, readings: Object.fromEntries(Object.entries(report.readings).map(([k, v]) => [k, strip(v)])) }, null, 1)}\n`, 'utf8');
say(`wrote ${outFile}${KEEP ? `; kept the scratch world at ${RUN}` : ''}`);
if (!AT_PARENT && report.readings.sideBySide !== undefined) {
  const { parent: p, head: h } = report.readings.sideBySide;
  say('SIDE BY SIDE, the first pairing on a name that is not yet public:');
  say(`  parent: ${p === null ? 'no parent reading' : `code ${String(p.codeAfterListeningS)} s after listening; first lookup ${String(p.firstLookup)}; lookups after the record ${J(p.afterRecord)}; presented ${String(p.presented)}; the sheet said ${J(p.notice)}`}`);
  say(`  HEAD:   code ${String(h.codeAfterListeningS)} s after listening; first lookup ${String(h.firstLookup)}; paired ${String(h.paired)}; /v1/blocked ${String(h.blocked)}`);
}
if (failures > 0) {
  say(`probe:p332 FAILED ${String(failures)} arm(s)`);
  process.exit(1);
}
if (unreadable > 0) {
  say(`probe:p332 could not READ ${String(unreadable)} arm(s); that is not a pass`);
  process.exit(2);
}
say(AT_PARENT ? 'probe:p332 at the parent: the parent reading is taken' : 'probe:p332 OK');
process.exit(0);
