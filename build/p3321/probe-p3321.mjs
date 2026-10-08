#!/usr/bin/env node
/**
 * probe:p3321 — the Pair card draws the Mac's name check, driven inside the
 * real app against FOUR loopback DNS stand-ins, measured at the parent and at
 * HEAD (Phase 332.1, build/p3321/SPEC.md §9.3).
 *
 * WHAT IT MEASURES. His first pairing through Funnel waited seven to eight
 * minutes while 1 to 3 of the four `ts.net` servers answered his Mac's name,
 * and Settings then Phone said one sentence that never moved. He asked for
 * the wait to be shown, "delightful and not overwhelming". At the parent
 * (`75edbf5e`) this probe RECORDS his complaint: until Pair, every sample of
 * the card is the one checking sentence. At HEAD the same scripts draw four
 * small dots, one moving line and one quiet line, and the probe grades every
 * one against expectations it RE-DERIVES from the four stand-ins' own logs
 * with words of its own: it reads no composer of the tree. Pair must arrive at
 * the parent's moment, because no rule of when a code shows moves.
 *
 * NO REAL DNS, EVER. The app asks `GMUX_POCKET_NAME_SERVERS`, four
 * `127.0.0.1:<port>` entries joined by commas, each one a
 * build/p332/dns-standin.mjs IN THIS PROCESS answering a SCRIPT for the
 * Tailscale stand-in's made-up `p330-mac.tail00000.ts.net` with `203.0.113.10`
 * (RFC 5737). A development build honours the variable and a packaged one
 * ignores it, which is why no packaged Tortie is ever launched here. Each
 * stand-in preflights its own value and the joined value must name loopback
 * alone and be exactly the four, or nothing launches. Main's UDP sockets are
 * sampled every 2 s (`lsof -a -p <main> -iUDP -n -P`): ANY peer that is not
 * 127.0.0.1 fails the run at once and ends the app.
 *
 * NO REAL TAILSCALE, EVER: build/p330/tailscale-standin.mjs behind its
 * preflight and its sampler, exactly as probe:p332 runs it. NO AGENT STARTS:
 * before the launch the profile's `gmux/config/agents.json` renames the
 * Gemini, Qwen, Antigravity, Grok and Droid binaries to names that exist
 * nowhere, and `agents:list` is read back; a launch where any of them reads
 * installed is refused. NO PHONE, and Pair is NEVER pressed: the ready face
 * is read, not the code. No model turn and no token.
 *
 * THE RECORDER. Before the first arm the Settings page gets ONE recorder:
 * capture listeners on `document` for `transitionrun`, `transitionend`,
 * `transitioncancel`, `animationstart` and `animationend`, and the bridge's
 * `pocket.onChanged`, so the report holds every motion and every push. The
 * card is read every 100 ms while a round is out and every 250 ms otherwise,
 * in ONE `cdpEval`: the stage, the text, the block's title and state, each
 * dot's answer in order, the row's `data-asking`, label, `aria-hidden`,
 * computed opacity and transition duration, both lines and their titles, the
 * rectangles of the dot row, both lines and Pair, whether the block precedes
 * Pair, the card's `getAnimations({ subtree: true })` and `--dur-base`. The app
 * is launched with Chromium's occlusion and backgrounding switched off
 * (probe-p208's three switches), because an occluded window's animation clock
 * does not move and a computed opacity read there photographs the old value
 * (probe-p1812-bar-and-card.mjs's trap).
 *
 * SINCE PHASE 333.1 (build/p3331/SPEC.md §5.4.4, §7.6) the card is step 3's
 * body under the three steps, and draws `POCKET_NAME_WAIT_NOTE` under the
 * block for exactly as long as the block (`[data-phone-name-note]`, read
 * beside the others here and graded by probe:p3331 R9). The switch is pressed
 * through the bridge, as it was, so the sheet asks for no code (D17 sets the
 * wish on the sheet's own press alone) and the ready face still draws Pair,
 * where a first setup through the sheet shows the code by itself.
 *
 * THE ARMS, in ONE launch per build. `P3321_ARMS` picks; the parent runs
 * `P9,P7`, HEAD runs `H9,H7,H8`. The same scripts run at both builds and only
 * the grading differs.
 *   P9/H9  four silent servers, nothing remembered (a network that blocks DNS):
 *          5 s idle first; the door on, Allow, read until Pair and 12 s more.
 *          The parent: one sentence until Pair, then the unreadable line above
 *          it, the line's rectangle unmoved. HEAD: the naming block with no
 *          dots and `Checking now`, then four hollow dots, the unreadable
 *          sentence on the moving line, `Checking again in 20 s` and, 11 s
 *          later, `Checking again in 10 s` (the renderer's tick), and the
 *          dot row's and both lines' rectangles unmoved when Pair appears
 *   P7/H7  his flapping name, five rounds (SPEC §9.3's table): 2 of 4, 1 of 4
 *          with one silent, 3, 2, then 4 of 4 at 157 s. Both builds: the
 *          rounds and Pair at the same moment. The parent: one sentence until
 *          Pair. HEAD: each round's dots, count, label and next check; round
 *          two's breath (`data-asking`, round one's dots, `Checking now`,
 *          opacity 0.5); no animation and one opacity transition on the dot
 *          row over `--dur-base`; `Your Mac’s name is live` and `Took 2 min`
 *          with Pair below and nothing above it moved; app.log saying each
 *          change of verdict once and no port, name or address (read as the
 *          logger writes it, one JSON object a line, by its `msg`:
 *          `logLines`, the 333.1 reverify's fix)
 *   H8    reduced motion: the switch-on round over H7's kept confirmation
 *          answers no, the block appears, round two holds one server to its
 *          deadline and confirms on three; no transition, no animation, the
 *          dim in one frame, `live` after round two
 *   RUN    every preflight, the quiet agents, no real Tailscale, no forbidden
 *          argv, UDP to 127.0.0.1 alone, every question `A`, RD 0, for the
 *          name, app.log holding neither the name nor the address, every
 *          stand-in ended and all four DNS stand-ins closed, no Electron left
 *
 * THE PARENT. `P3321_PARENT_CHECKOUT=<a built checkout at 75edbf5e>` runs P9
 * and P7 against that build and writes out/p3321/probe-p3321-parent.json; the
 * HEAD run reads it and prints P9 beside H9 and P7 beside H7. Both reports hold
 * every raw sample, the recorder's events and pushes, the four stand-ins' full
 * logs and the app.log slice, so a verifier can re-derive without the grader.
 *
 * WHAT IT REFUSES TO DO. Every launch goes through build/electron-run.mjs's
 * `withElectron`, on its own scratch profile, scratch HOME and tmux socket
 * `gmux-p3321-<pid>` (never `gmux`). It signals no process of the app's;
 * every stand-in pid is ended by pid and the four DNS stand-ins are closed in
 * the `finally`. It never runs `pkill`, installs nothing, spends no token,
 * binds nothing but 127.0.0.1, dials nothing but 127.0.0.1, and reads no
 * credential, keychain item or conversation store of the person's. `npm run
 * shot` is not called and nothing is photographed: every visual claim is a
 * rectangle, a label or a computed style.
 *
 * VERIFIERS ONLY, under THE LOCK: it starts an Electron. Builders write it and
 * run only `--grader-self-test`, which grades recorded fixtures and starts
 * nothing. Not yet measured; expected about 4 minutes at the parent and 5 at
 * HEAD.
 *
 * BUILD FIRST. It refuses (exit 2) when the checkout it is pointed at has no build.
 *
 *   npm run -s probe:p3321
 *   P3321_PARENT_CHECKOUT=/path/to/parent npm run -s probe:p3321   the parent reading
 *   P3321_ARMS=H9 npm run -s probe:p3321                           some arms
 *   P3321_KEEP=1 npm run -s probe:p3321                            keep the scratch world
 *   node build/p3321/probe-p3321.mjs --grader-self-test            the graders, no Electron
 *
 * Exit 0 when every arm passed, 1 when one failed, 2 when it could not run or
 * an arm could not be READ, which is never a pass.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { withElectron, withoutDevRenderer } from '../electron-run.mjs';
import { wsConnect, cdpEval } from '../cdp-client.mjs';
import { pickRendererTarget } from '../cdp-target.mjs';
import { gradeFixtures } from '../probe-graders.mjs';
import { DEFAULT_SCENARIO, endStandinProcesses, makeStandin, preflightStandin, processRows, watchForRealTailscale } from '../p330/tailscale-standin.mjs';
import { NAME_SERVERS_VAR, STANDIN_ADDRESS, loopbackOnlyServers, makeDnsStandin, nameQuestionProblems, quietAgentsHeld, writeQuietAgents } from '../p332/dns-standin.mjs';

const HERE = fileURLToPath(import.meta.url);
const ROOT = resolve(dirname(HERE), '..', '..');
const J = JSON.stringify;
const sleepRaw = (ms) => new Promise((done) => setTimeout(done, ms));

// ---------------------------------------------------------------------------
// THE PROBE'S OWN WORDS AND ITS OWN COMPOSER (build/p3321/SPEC.md §5.5.2).
// Spelled here, never read from the tree, so a composer that drifts from the
// SPEC is caught rather than agreed with. The two sentences are the contract's
// (`POCKET_NAME_SENTENCES`), which this phase does not move a byte.
// ---------------------------------------------------------------------------

export const WORDS = Object.freeze({
  checking: 'Pair opens once your Mac’s name is on the internet, which can take a few minutes.',
  unreadable: 'Tortie could not confirm your Mac’s name, so a first scan may fail.',
  publishing: 'Publishing your Mac’s name',
  live: 'Your Mac’s name is live',
  roundRule: 'Pair opens when a round finds your Mac’s name and no server says it is missing.',
  verdict: 'the Mac’s name check read'
});

/** NAME_QUERY_DEADLINE_MS and NAME_CHECK_GAPS_MS, spelled here (src/main/pocket/public-name.ts:89, :105). */
export const ROUND_DEADLINE_MS = 2_000;
export const GAPS_MS = Object.freeze([20_000, 30_000, 45_000, 60_000]);
const MINUTE_MS = 60_000;
const NEXT_STEP_MS = 5_000;

/** `N of M see it`, after the publishing words. */
export function expectLine(dots) {
  if (dots.length === 0) return WORDS.publishing;
  return `${WORDS.publishing} · ${String(dots.filter((d) => d === 'record').length)} of ${String(dots.length)} see it`;
}
/** The dot row's label. */
export function expectLabel(dots) {
  return `${String(dots.filter((d) => d === 'record').length)} of ${String(dots.length)} name servers see your Mac’s name`;
}
/** The quiet line while the check runs: whole minutes from one on, then the next check rounded up to 5 s. */
export function expectTime(elapsedMs, nextMs) {
  const parts = [];
  if (elapsedMs >= MINUTE_MS) parts.push(`${String(Math.floor(elapsedMs / MINUTE_MS))} min`);
  parts.push(nextMs === null || !(nextMs > 0) ? 'checking now' : `checking again in ${String(Math.ceil(nextMs / NEXT_STEP_MS) * (NEXT_STEP_MS / 1000))} s`);
  const line = parts.join(' · ');
  return line.charAt(0).toUpperCase() + line.slice(1);
}
/** The quiet line once the name is live. */
export function expectTook(ms) {
  return ms >= MINUTE_MS ? `Took ${String(Math.floor(ms / MINUTE_MS))} min` : 'Took under a minute';
}
/** The gap the check sleeps after its k-th round (1-based). */
export const gapAfter = (k) => GAPS_MS[Math.min(Math.max(k, 1), GAPS_MS.length) - 1];

// ---------------------------------------------------------------------------
// The stand-ins' logs, read into rounds by this file alone
// ---------------------------------------------------------------------------

export const SERVERS = Object.freeze(['A', 'B', 'C', 'D']);

/** What a stand-in's reply makes of a dot: the record, a miss, or nothing readable. */
export function dotOf(answered) {
  if (answered === 'record') return 'record';
  if (answered === 'nx' || answered === 'nodata') return 'negative';
  return 'unreadable';
}

/** A round's verdict and reason, by SPEC §4's rule, spelled here: any miss is no, else any record is yes. */
export function verdictOf(answered) {
  const miss = answered.find((a) => a === 'nx' || a === 'nodata');
  if (miss !== undefined) return { verdict: 'no', reason: miss === 'nx' ? 'nxdomain' : 'no-record' };
  if (answered.some((a) => a === 'record')) return { verdict: 'yes', reason: 'record' };
  return { verdict: 'unreadable', reason: null };
}

/**
 * Every question the four stand-ins logged, grouped into rounds: a question
 * more than 5 s after a round's first starts the next (rounds are 20 s or more
 * apart, and a round's four questions leave together). A round with a silent
 * server ends at its deadline; one with none ends at its last answer.
 */
export function roundsOf(logs, { splitMs = 5_000, deadlineMs = ROUND_DEADLINE_MS } = {}) {
  const rows = SERVERS.flatMap((s) => (Array.isArray(logs?.[s]) ? logs[s] : []).map((row) => ({ ...row, server: s }))).sort((a, b) => a.at - b.at);
  const groups = [];
  for (const row of rows) {
    const cur = groups.at(-1);
    if (cur === undefined || row.at - cur.start > splitMs) groups.push({ start: row.at, rows: [row] });
    else cur.rows.push(row);
  }
  return groups.map((g) => {
    const by = SERVERS.map((s) => g.rows.filter((x) => x.server === s));
    const answered = by.map((list) => list[0]?.answered ?? null);
    const last = Math.max(...g.rows.map((x) => x.at));
    const silent = answered.some((a) => a === null || a === 'silent' || a === 'held');
    return {
      start: g.start,
      end: silent ? last + deadlineMs : last,
      complete: by.every((list) => list.length === 1),
      answered,
      dots: answered.map(dotOf),
      rows: g.rows
    };
  });
}

/** Each change of verdict, as the host's one log line says it. */
export function verdictChanges(rounds) {
  const out = [];
  let last = null;
  for (const r of rounds) {
    const v = verdictOf(r.answered);
    if (v.verdict !== last) out.push(`${WORDS.verdict} ${v.verdict}: ${String(v.reason)}`);
    last = v.verdict;
  }
  return out;
}

/**
 * app.log's lines, each as what it SAYS and as what the leak scan reads (the
 * 333.1 reverify, 2026-10-08). The logger writes one JSON object a line (`ts`,
 * `level`, `scope`, `pid`, `proctype`, `msg`, and any field a call adds), so a
 * verdict sliced from the raw line kept the object's closing `"}` and H7 read
 * red over a log that said each change once. A line that parses as an object
 * with a string `msg` says its `msg`, and the scan reads every field but `ts`
 * and `pid`, whose digits after a colon are a clock and a process, never a
 * stand-in's port; any other line is read whole, both ways, as the logger once
 * wrote it. Pure.
 */
export function logLines(text) {
  return String(text ?? '')
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line) => {
      let o = null;
      try {
        o = JSON.parse(line);
      } catch {
        o = null;
      }
      if (o === null || typeof o !== 'object' || Array.isArray(o) || typeof o.msg !== 'string') return { says: line, scan: line };
      const rest = { ...o };
      delete rest.ts;
      delete rest.pid;
      return { says: o.msg, scan: JSON.stringify(rest) };
    });
}

/** `0.16s`, `160ms` → 160. */
export function durMs(text) {
  const first = String(text ?? '').split(',')[0].trim();
  const m = /^(-?[0-9.]+)(ms|s)$/.exec(first);
  if (m === null) return null;
  return m[2] === 's' ? Math.round(Number(m[1]) * 1000) : Math.round(Number(m[1]));
}

const RECT_KEYS = ['x', 'y', 'w', 'h'];
/** Two rectangles within half a pixel on every side. */
export const sameRect = (a, b) => a !== null && b !== null && a !== undefined && b !== undefined && RECT_KEYS.every((k) => Math.abs(a[k] - b[k]) <= 0.5);
const within = (value, lo, hi) => Number.isFinite(value) && value >= lo && value <= hi;
const firstAfter = (samples, t, pred = () => true) => samples.find((s) => s.at >= t && pred(s)) ?? null;
const sameList = (a, b) => Array.isArray(a) && Array.isArray(b) && J(a) === J(b);
const loopbackPeer = (peer) => /^127\.0\.0\.1:\d+$/.test(String(peer));
const allRows = (logs) => SERVERS.flatMap((s) => (Array.isArray(logs?.[s]) ? logs[s] : []));

// ---------------------------------------------------------------------------
// The scripts (SPEC §9.3), in server order A, B, C, D
// ---------------------------------------------------------------------------

export const SILENT_SCRIPTS = Object.freeze({ A: ['silent'], B: ['silent'], C: ['silent'], D: ['silent'] });
/** His flapping name: every server flaps, every round of the flap holds 1 to 3 records, and all four agree at 157 s. */
export const H7_SCRIPTS = Object.freeze({
  A: ['record', 'nx', 'record', 'nx', 'record'],
  B: ['nx', 'silent', 'record', 'record', 'record'],
  C: ['record', 'record', 'nx', 'record', 'record'],
  D: ['nx', 'nx', 'record', 'nx', 'record']
});
/** Where each round starts, from the first: the gaps measured from the END of a round, round two ending at its deadline. */
export const H7_STARTS_MS = Object.freeze([0, 20_000, 52_000, 97_000, 157_000]);
export const H8_SCRIPTS = Object.freeze({ A: ['nx', 'silent'], B: ['nx', 'record'], C: ['nx', 'record'], D: ['nx', 'record'] });

// ---------------------------------------------------------------------------
// THE GRADERS. Pure: each takes the reading an arm collected and answers which
// of its clauses failed. `--grader-self-test` runs every one over a passing
// fixture and, for EVERY clause, a fixture broken on that clause alone, which
// must fail on that clause: a grader nobody has seen fail proves nothing.
// ---------------------------------------------------------------------------

const TOL_MS = 1_000;

/** The naming samples a grader reads before Pair: after the first question has had time to be drawn. */
const beforePair = (r, settleMs = 300) => {
  const first = roundsOf(r.logs)[0];
  return r.samples.filter((s) => s.stage === 'naming' && first !== undefined && s.at >= first.start + settleMs && s.at < r.pairableAt);
};
/**
 * The first sample after a round's end that has heard the end: no round out,
 * and the round's dots drawn. HEARD_MS after the end, because a round on
 * loopback ends a millisecond after it starts and a sample in the few ms
 * before its two pushes are drawn reads the round before as it stood (SPEC
 * §9.5's attack names that window; the verifier's re-derivation reads it).
 */
export const HEARD_MS = 150;
const afterEnd = (r, round, count = 4) => firstAfter(r.samples, round.end + HEARD_MS, (s) => s.asking === 'false' && s.dots.length === count);

const commonSilent = [
  ['idle 5 s with the sheet open: the stand-ins were asked nothing', (r) => r.idleQuestions === 0 && r.idleMs >= 5_000],
  ['the first round reached all four, each silent', (r) => {
    const first = roundsOf(r.logs)[0];
    return first !== undefined && first.complete && first.answered.every((a) => a === 'silent');
  }],
  ['every question is A, RD 0, for the name', (r) => nameQuestionProblems(allRows(r.logs), r.name).length === 0],
  ['pairable within 3 s of listening', (r) => within(r.pairableAt - r.listeningAt, 0, 3_000)]
];

const commonFlap = [
  ['five rounds, each reaching all four stand-ins', (r) => {
    const rounds = roundsOf(r.logs);
    return rounds.length === 5 && rounds.every((x) => x.complete);
  }],
  ['every question is A, RD 0, for the name', (r) => nameQuestionProblems(allRows(r.logs), r.name).length === 0],
  ['the rounds start at 0, 20, 52, 97 and 157 s', (r) => {
    const rounds = roundsOf(r.logs);
    return rounds.length === H7_STARTS_MS.length && rounds.every((x, i) => Math.abs(x.start - rounds[0].start - H7_STARTS_MS[i]) <= TOL_MS);
  }],
  ['each round answered as its script says, in server order', (r) => {
    const rounds = roundsOf(r.logs);
    return rounds.length === 5 && rounds.every((x, k) => SERVERS.every((s, i) => x.answered[i] === H7_SCRIPTS[s][k]));
  }],
  ['pairable within 1 s of round five’s end', (r) => {
    const r5 = roundsOf(r.logs)[4];
    return r5 !== undefined && within(r.pairableAt - r5.end, 0, TOL_MS);
  }]
];

export const GRADERS = {
  P9: {
    title: 'the parent, four silent servers: one sentence, then the unreadable line above Pair',
    clauses: [
      ...commonSilent,
      ['until Pair, the card is the one checking sentence and no Pair', (r) => {
        const mid = beforePair(r);
        return mid.length > 0 && mid.every((s) => s.text === WORDS.checking && s.pairButton === false);
      }],
      ['after, the unreadable line above Pair', (r) => {
        const s = firstAfter(r.samples, r.pairableAt, (x) => x.pairButton);
        return s !== null && s.lineUnreadable === true && s.line === WORDS.unreadable && s.blockBeforePair === true;
      }],
      ['the line’s rectangle before equals the unreadable line’s after', (r) => {
        const before = beforePair(r).at(-1);
        const after = firstAfter(r.samples, r.pairableAt, (x) => x.pairButton);
        return before !== undefined && after !== null && sameRect(before.rects.line, after.rects.line);
      }]
    ]
  },
  H9: {
    title: 'HEAD, four silent servers: the block, four hollow dots, the unreadable sentence, nothing above Pair moved',
    clauses: [
      ...commonSilent,
      ['no slower than the parent, within 1 s', (r) => r.parent === null || Math.abs(r.pairableAt - r.listeningAt - r.parent.pairableAfterListeningMs) <= TOL_MS],
      ['before Pair: the naming block, the checking sentence on its hover, no dots, Publishing your Mac’s name, Checking now', (r) => {
        const mid = beforePair(r);
        return (
          mid.length > 0 &&
          mid.every(
            (s) =>
              s.block === true &&
              s.state === 'checking' &&
              s.nameTitle === WORDS.checking &&
              !s.text.includes(WORDS.checking) &&
              s.dots.length === 0 &&
              s.ariaHidden === 'true' &&
              s.role === null &&
              s.line === WORDS.publishing &&
              s.time === expectTime(s.at - roundsOf(r.logs)[0].start, null) &&
              s.pairButton === false
          )
        );
      }],
      ['after: four hollow dots, the unreadable sentence on the moving line, the block before Pair', (r) => {
        const s = firstAfter(r.samples, r.pairableAt, (x) => x.pairButton);
        return (
          s !== null &&
          sameList(s.dots, ['unreadable', 'unreadable', 'unreadable', 'unreadable']) &&
          s.label === expectLabel(s.dots) &&
          s.role === 'img' &&
          s.line === WORDS.unreadable &&
          s.lineUnreadable === true &&
          s.state === 'unreadable' &&
          s.blockBeforePair === true
        );
      }],
      ['the dot row’s and both lines’ rectangles equal before and after Pair appears', (r) => {
        const before = beforePair(r).filter((s) => s.block).at(-1);
        const after = firstAfter(r.samples, r.pairableAt, (x) => x.pairButton);
        return before !== undefined && after !== null && ['row', 'line', 'time'].every((k) => sameRect(before.rects[k], after.rects[k]));
      }],
      ['Checking again in 20 s within 1 s of the round’s end', (r) => {
        const r1 = roundsOf(r.logs)[0];
        const s = r1 === undefined ? null : afterEnd(r, r1);
        return s !== null && s.at - r1.end <= TOL_MS && s.time === expectTime(s.at - r1.start, gapAfter(1) - (s.at - r1.end)) && s.time === 'Checking again in 20 s';
      }],
      ['Checking again in 10 s 11 s later, the renderer’s own tick', (r) => {
        const r1 = roundsOf(r.logs)[0];
        if (r1 === undefined) return false;
        const s = firstAfter(r.samples, r1.end + 11_000);
        return s !== null && s.at - (r1.end + 11_000) <= 900 && s.time === expectTime(s.at - r1.start, gapAfter(1) - 11_000) && s.time === 'Checking again in 10 s';
      }]
    ]
  },
  P7: {
    title: 'the parent, his flapping name: one sentence for the whole wait',
    clauses: [
      ...commonFlap,
      ['until Pair, every sample is the one checking sentence and no Pair', (r) => {
        const mid = r.samples.filter((s) => s.stage === 'naming' && s.at >= r.listeningAt + 500 && s.at < r.pairableAt - 100);
        return mid.length > 0 && new Set(mid.map((s) => s.text)).size === 1 && mid[0].text === WORDS.checking && mid.every((s) => s.pairButton === false);
      }]
    ]
  },
  H7: {
    title: 'HEAD, his flapping name: the dots per round, one breath a round, live, and Pair at the parent’s moment',
    clauses: [
      ...commonFlap,
      ['each round’s dots, count and label, in server order, within 1 s of its end', (r) => {
        const rounds = roundsOf(r.logs);
        return rounds.length === 5 && rounds.slice(0, 4).every((x) => {
          const s = afterEnd(r, x);
          return s !== null && s.at - x.end <= TOL_MS && sameList(s.dots, x.dots) && s.label === expectLabel(x.dots) && s.role === 'img' && s.line === expectLine(x.dots) && s.state === 'checking';
        });
      }],
      ['the quiet line after each round: 20, 30, 45 s, then a minute and 60 s', (r) => {
        const rounds = roundsOf(r.logs);
        return rounds.length === 5 && rounds.slice(0, 4).every((x, k) => {
          const s = afterEnd(r, x);
          return s !== null && s.time === expectTime(s.at - rounds[0].start, gapAfter(k + 1) - (s.at - x.end));
        });
      }],
      ['while round two waited out its silent server: asking, round one’s dots, Checking now, and opacity 0.5', (r) => {
        const [r1, r2] = roundsOf(r.logs);
        if (r2 === undefined) return false;
        const mid = r.samples.filter((s) => s.at >= r2.start + 300 && s.at <= r2.end - 150);
        return mid.length > 0 && mid.every((s) => s.asking === 'true' && sameList(s.dots, r1.dots) && s.time === expectTime(s.at - r1.start, null)) && mid.some((s) => s.opacity === 0.5);
      }],
      ['no animation, and every transition in the card is the dot row’s opacity over --dur-base', (r) => {
        const inCard = r.events.filter((e) => e.inCard);
        const runs = inCard.filter((e) => e.type === 'transitionrun');
        const drawn = r.samples.filter((s) => s.block);
        return (
          inCard.every((e) => e.type !== 'animationstart') &&
          runs.length > 0 &&
          runs.every((e) => e.property === 'opacity' && e.target === 'dots') &&
          drawn.length > 0 &&
          drawn.every((s) => durMs(s.transitionDuration) !== null && durMs(s.transitionDuration) === durMs(s.durBase))
        );
      }],
      ['nothing running 500 ms into round two', (r) => {
        const r2 = roundsOf(r.logs)[1];
        const s = r2 === undefined ? null : firstAfter(r.samples, r2.start + 500);
        return s !== null && s.at - (r2.start + 500) <= 400 && s.anims.length === 0;
      }],
      ['after round five, within 1 s: live, Took N min, four filled dots, Pair below', (r) => {
        const rounds = roundsOf(r.logs);
        const r5 = rounds[4];
        const s = r5 === undefined ? null : firstAfter(r.samples, r5.end, (x) => x.state === 'live');
        return (
          s !== null &&
          s.at - r5.end <= TOL_MS &&
          s.line === WORDS.live &&
          s.time === expectTook(r5.end - rounds[0].start) &&
          sameList(s.dots, ['record', 'record', 'record', 'record']) &&
          s.pairButton === true &&
          s.blockBeforePair === true
        );
      }],
      ['the block’s rectangles after round four equal those after Pair appears', (r) => {
        const r4 = roundsOf(r.logs)[3];
        const a = r4 === undefined ? null : afterEnd(r, r4);
        const b = firstAfter(r.samples, r.pairableAt, (x) => x.pairButton);
        return a !== null && b !== null && ['row', 'line', 'time'].every((k) => sameRect(a.rects[k], b.rects[k]));
      }],
      ['pairable no later than 1 s after the parent’s moment', (r) => {
        const first = roundsOf(r.logs)[0];
        return r.parent === null || (first !== undefined && r.pairableAt - first.start - r.parent.pairableFromFirstMs <= TOL_MS);
      }],
      ['app.log says each change of verdict once, and no port, name or address', (r) => {
        // Each line by what it says, the JSON object's msg (the reverify).
        const read = logLines(r.appLog);
        const lines = read.map((l) => l.says).filter((l) => l.includes(WORDS.verdict)).map((l) => l.slice(l.indexOf(WORDS.verdict)).trim());
        const leaks = read
          .map((l) => l.scan)
          .filter((l) => l.toLowerCase().includes(r.name) || l.includes(STANDIN_ADDRESS) || r.ports.some((p) => l.includes(`127.0.0.1:${String(p)}`) || new RegExp(`:${String(p)}(?![0-9])`).test(l)));
        return r.appLogRead === true && sameList(lines, verdictChanges(roundsOf(r.logs))) && leaks.length === 0;
      }]
    ]
  },
  H8: {
    title: 'HEAD, reduced motion: the block after the switch-on round, the dim in one frame, nothing moves, live',
    clauses: [
      ['reduced motion matched', (r) => r.reducedMotion === true],
      ['the switch-on round re-asked a kept confirmation and answered no on all four', (r) => {
        const r0 = roundsOf(r.logs)[0];
        return r0 !== undefined && r0.complete && r0.answered.every((a) => a === 'nx') && (r.keptOwed !== true || r.kept === true);
      }],
      ['the block appeared after it, 0 of 4, and not before', (r) => {
        const r0 = roundsOf(r.logs)[0];
        if (r0 === undefined) return false;
        const s = firstAfter(r.samples, r0.end, (x) => x.block);
        return (
          r.samples.filter((x) => x.at < r0.start).every((x) => x.block === false) &&
          s !== null &&
          s.at - r0.end <= TOL_MS &&
          sameList(s.dots, ['negative', 'negative', 'negative', 'negative']) &&
          s.line === expectLine(s.dots) &&
          s.label === expectLabel(s.dots)
        );
      }],
      ['round two 20 s later: A held to its deadline, the others the record', (r) => {
        const [r0, r1] = roundsOf(r.logs);
        return r1 !== undefined && r1.complete && sameList(r1.answered, ['silent', 'record', 'record', 'record']) && Math.abs(r1.start - r0.end - gapAfter(1)) <= TOL_MS;
      }],
      ['the row read opacity 0.5 in the first sample after round two’s push', (r) => {
        const r1 = roundsOf(r.logs)[1];
        const s = r1 === undefined ? null : firstAfter(r.samples, r1.start, (x) => x.asking === 'true');
        return s !== null && s.at <= r1.end && s.opacity === 0.5;
      }],
      ['no transition anywhere, no animation in the card, nothing running', (r) => {
        return r.events.every((e) => e.type !== 'transitionrun') && r.events.filter((e) => e.inCard).every((e) => e.type !== 'animationstart') && r.samples.every((s) => s.anims.length === 0);
      }],
      ['live after round two', (r) => {
        const r1 = roundsOf(r.logs)[1];
        const s = r1 === undefined ? null : firstAfter(r.samples, r1.end, (x) => x.state === 'live');
        return s !== null && s.at - r1.end <= TOL_MS && s.line === WORDS.live && s.pairButton === true;
      }]
    ]
  },
  RUN: {
    title: 'no real DNS, no real Tailscale, no agent, nothing left',
    clauses: [
      ['the Tailscale preflight passed', (r) => r.tailscalePreflight === true],
      ['the four DNS preflights passed and the joined value names loopback alone', (r) => r.dnsPreflights.length === 4 && r.dnsPreflights.every((p) => p === true) && r.joinedOk === true],
      ['the quiet agents held', (r) => r.agentsHeld.length > 0 && r.agentsHeld.every((p) => p === true)],
      ['no real Tailscale in any sample', (r) => r.realTailscale === 0 && r.samples > 0],
      ['no forbidden or refused argv reached the stand-in', (r) => r.forbidden === 0 && r.refusedArgv === 0],
      ['UDP to 127.0.0.1 alone', (r) => r.udpLeaks === 0 && r.udpSamples > 0],
      ['every question any stand-in logged is A, RD 0, for the name', (r) => r.totalQuestions > 0 && r.questionProblems.length === 0],
      ['app.log holds neither the name nor the address', (r) => r.appLogRead === true && r.appLogName === false && r.appLogAddress === false],
      ['every stand-in ended and the four DNS stand-ins closed', (r) => r.standinLeft === 0 && r.dnsClosed.length === 4 && r.dnsClosed.every((c) => c === true)],
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

// ---------------------------------------------------------------------------
// THE FIXTURES: a model of the card at each build, driven by the same scripts.
// A push reaches the card LAT ms after it is sent; a breath takes BREATH ms.
// ---------------------------------------------------------------------------

const FIX_NAME = DEFAULT_SCENARIO.dnsName.replace(/\.$/, '');
const LAT = 50;
const BREATH = 160;
const RECTS = Object.freeze({ row: { x: 24, y: 120, w: 36, h: 6 }, line: { x: 72, y: 114, w: 520, h: 18 }, time: { x: 72, y: 134, w: 520, h: 16 }, pair: { x: 24, y: 162, w: 60, h: 28 } });
const PORTS = Object.freeze([53_101, 53_102, 53_103, 53_104]);

/** The four stand-ins' logs for a script, round k starting at `t0 + starts[k]`. */
function fixtureLogs(scripts, starts, t0) {
  const logs = {};
  SERVERS.forEach((s, i) => {
    logs[s] = starts.map((at, k) => ({ at: t0 + at + 1 + i, id: 100 + k * 4 + i, rd: 0, qname: FIX_NAME, qtype: 1, qclass: 1, answered: scripts[s][Math.min(k, scripts[s].length - 1)], step: k }));
  });
  return logs;
}

const BLANK = Object.freeze({ block: false, nameTitle: null, state: null, dots: [], asking: null, role: null, label: null, ariaHidden: null, opacity: null, transitionDuration: null, line: null, lineUnreadable: false, time: null, timeTitle: null, pairButton: false, blockBeforePair: false, anims: [] });
const rectsOf = (pair, block = true) => ({ row: block ? { ...RECTS.row } : null, line: { ...RECTS.line }, time: block ? { ...RECTS.time } : null, pair: pair ? { ...RECTS.pair } : null });

/** HEAD's card at time t, by SPEC §5.5's model. */
function headCardAt(t, m) {
  const base = { at: t, ...BLANK, dots: [], anims: [], durBase: m.reduced ? '1ms' : '160ms', reducedMotion: m.reduced, rects: { row: null, line: null, time: null, pair: null } };
  if (t < m.listeningAt) return { ...base, stage: 'waiting', text: 'The code shows once this Mac is answering.' };
  const started = m.rounds.filter((r) => r.start + LAT <= t);
  const ended = m.rounds.filter((r) => r.end + LAT <= t);
  if (m.reaskFirst && ended.length === 0) return { ...base, stage: 'ready', text: 'Pair', pairButton: true, rects: rectsOf(true, false) };
  const pairable = t >= m.pairableAt;
  const asking = started.length > ended.length;
  const last = ended.at(-1) ?? null;
  const dots = last === null ? [] : [...last.dots];
  const live = pairable && m.outcome === 'live';
  let line;
  let time;
  let state;
  if (live) {
    state = 'live';
    line = WORDS.live;
    time = expectTook(m.rounds.at(-1).end - m.rounds[0].start);
  } else {
    time = expectTime(t - m.rounds[0].start, asking || last === null ? null : gapAfter(ended.length) - (t - last.end));
    state = pairable && m.outcome === 'unreadable' ? 'unreadable' : 'checking';
    line = state === 'unreadable' ? WORDS.unreadable : expectLine(dots);
  }
  const pushes = [...started.map((r) => r.start + LAT), ...ended.map((r) => r.end + LAT)].filter((p) => p <= t);
  const lastPush = pushes.length === 0 ? -Infinity : Math.max(...pushes);
  const moving = !m.reduced && !live && t - lastPush < BREATH;
  const opacity = live ? 1 : moving ? 0.75 : asking ? 0.5 : 1;
  return {
    ...base,
    stage: pairable ? 'ready' : 'naming',
    text: [line, time, pairable ? 'Pair' : null].filter((x) => x !== null).join('\n'),
    block: true,
    nameTitle: pairable ? null : WORDS.checking,
    state,
    dots,
    asking: asking && !live ? 'true' : 'false',
    role: dots.length > 0 ? 'img' : null,
    label: dots.length > 0 ? expectLabel(dots) : null,
    ariaHidden: dots.length > 0 ? null : 'true',
    opacity,
    transitionDuration: m.reduced ? '0.001s' : '0.16s',
    line,
    lineUnreadable: state === 'unreadable',
    time,
    timeTitle: live ? null : WORDS.roundRule,
    pairButton: pairable,
    blockBeforePair: pairable,
    anims: moving ? [['CSSTransition', 'opacity']] : [],
    rects: rectsOf(pairable)
  };
}

/** The parent's card at time t: one sentence, then the unreadable line (or Pair alone) above Pair. */
function parentCardAt(t, m) {
  const base = { at: t, ...BLANK, dots: [], anims: [], durBase: '160ms', reducedMotion: false, rects: { row: null, line: null, time: null, pair: null } };
  if (t < m.listeningAt) return { ...base, stage: 'waiting', text: 'The code shows once this Mac is answering.' };
  if (t < m.pairableAt) return { ...base, stage: 'naming', text: WORDS.checking, line: WORDS.checking, rects: rectsOf(false, false) };
  if (m.outcome === 'unreadable') {
    return { ...base, stage: 'ready', text: `${WORDS.unreadable}\nPair`, line: WORDS.unreadable, lineUnreadable: true, pairButton: true, blockBeforePair: true, rects: rectsOf(true, false) };
  }
  return { ...base, stage: 'ready', text: 'Pair', pairButton: true, rects: { row: null, line: null, time: null, pair: { ...RECTS.pair } } };
}

/** Samples every 100 ms from before listening to `until`. */
function samplesOf(cardAt, m, until) {
  const out = [];
  for (let t = m.listeningAt - 400; t <= until; t += 100) out.push(cardAt(t, m));
  return out;
}

/** The recorder's events for a model at HEAD with motion on: one transition per push on the dot row. */
function eventsOf(m) {
  if (m.reduced) return [];
  const out = [];
  for (const r of m.rounds) {
    out.push({ type: 'transitionrun', property: 'opacity', animationName: null, target: 'dots', inCard: true, t: r.start + LAT });
    if (r.end - r.start < BREATH) out.push({ type: 'transitioncancel', property: 'opacity', animationName: null, target: 'dots', inCard: true, t: r.end + LAT });
    else out.push({ type: 'transitionend', property: 'opacity', animationName: null, target: 'dots', inCard: true, t: r.start + LAT + BREATH });
    out.push({ type: 'transitionrun', property: 'opacity', animationName: null, target: 'dots', inCard: true, t: r.end + LAT });
    out.push({ type: 'transitionend', property: 'opacity', animationName: null, target: 'dots', inCard: true, t: r.end + LAT + BREATH });
  }
  // The switch outside the card moves; it is not the card's.
  out.push({ type: 'transitionrun', property: 'transform', animationName: null, target: 'switch-thumb', inCard: false, t: m.listeningAt - 300 });
  return out;
}

function silentFixture(atParent) {
  const t0 = 1_000_000;
  const logs = fixtureLogs(SILENT_SCRIPTS, [0], t0);
  const rounds = roundsOf(logs);
  const m = { rounds, listeningAt: t0 - 30, pairableAt: rounds[0].end + 60, outcome: 'unreadable', reaskFirst: false, reduced: false };
  const samples = samplesOf(atParent ? parentCardAt : headCardAt, m, m.pairableAt + 12_500);
  return { idleQuestions: 0, idleMs: 5_040, logs, name: FIX_NAME, listeningAt: m.listeningAt, pairableAt: m.pairableAt, samples, parent: atParent ? null : { pairableAfterListeningMs: m.pairableAt - m.listeningAt + 120 } };
}

/**
 * One line as the logger writes it today, a JSON object, with a `pid` equal to
 * a stand-in's port and a clock full of colons, neither of which is a leak
 * (the reverify, 2026-10-08).
 */
const jsonLine = (msg, extra = {}) => JSON.stringify({ ts: '2026-10-08T18:14:18.041Z', level: 'info', scope: 'pocket', pid: PORTS[0], proctype: 'main', msg, ...extra });
/** The fixture's plain lines (`date time level scope words`) as JSON lines. */
const asJsonLines = (text) =>
  String(text)
    .split('\n')
    .map((l) => {
      const m = /^\S+ \S+ \S+ \S+ (.*)$/.exec(l);
      return jsonLine(m === null ? l : m[1]);
    })
    .join('\n');

function flapFixture(atParent) {
  const t0 = 2_000_000;
  const logs = fixtureLogs(H7_SCRIPTS, H7_STARTS_MS, t0);
  const rounds = roundsOf(logs);
  const m = { rounds, listeningAt: t0 - 40, pairableAt: rounds[4].end + 70, outcome: 'live', reaskFirst: false, reduced: false };
  const samples = samplesOf(atParent ? parentCardAt : headCardAt, m, m.pairableAt + 10_000);
  const appLog = ['2026-09-30 14:19:02 info pocket checking the Mac’s name before pairing', `2026-09-30 14:19:02 info pocket ${WORDS.verdict} no: nxdomain`, `2026-09-30 14:21:39 info pocket ${WORDS.verdict} yes: record`, '2026-09-30 14:21:39 info pocket the Mac’s name answers, so pairing is open'].join('\n');
  return {
    logs,
    name: FIX_NAME,
    listeningAt: m.listeningAt,
    pairableAt: m.pairableAt,
    samples,
    events: atParent ? [] : eventsOf(m),
    appLog,
    appLogRead: true,
    ports: [...PORTS],
    parent: atParent ? null : { pairableFromFirstMs: m.pairableAt - rounds[0].start + 150 }
  };
}

function reducedFixture() {
  const t0 = 3_000_000;
  const logs = fixtureLogs(H8_SCRIPTS, [0, 20_000], t0);
  const rounds = roundsOf(logs);
  const m = { rounds, listeningAt: t0 - 60, pairableAt: rounds[1].end + 40, outcome: 'live', reaskFirst: true, reduced: true };
  return { reducedMotion: true, kept: true, keptOwed: true, logs, name: FIX_NAME, samples: samplesOf(headCardAt, m, m.pairableAt + 3_000), events: [] };
}

/** Shift one round's rows, every server, by `ms`. */
const shiftRound = (r, k, ms) => SERVERS.forEach((s) => (r.logs[s][k].at += ms));
const editSamples = (r, from, to, edit) => r.samples.forEach((s) => (s.at >= from && s.at <= to ? edit(s) : undefined));
const R = (r) => roundsOf(r.logs);

const silentBreaks = {
  'idle 5 s with the sheet open: the stand-ins were asked nothing': (r) => void (r.idleQuestions = 1),
  'the first round reached all four, each silent': (r) => void (r.logs.C[0].answered = 'record'),
  'every question is A, RD 0, for the name': (r) => void (r.logs.B[0].qtype = 28),
  'pairable within 3 s of listening': (r) => void (r.pairableAt = r.listeningAt + 4_000)
};
const flapBreaks = {
  'five rounds, each reaching all four stand-ins': (r) => void r.logs.C.splice(2, 1),
  'every question is A, RD 0, for the name': (r) => void (r.logs.A[1].rd = 1),
  'the rounds start at 0, 20, 52, 97 and 157 s': (r) => shiftRound(r, 3, 3_000),
  'each round answered as its script says, in server order': (r) => void (r.logs.D[2].answered = 'nx'),
  'pairable within 1 s of round five’s end': (r) => void (r.pairableAt += 2_500)
};

export const GRADER_FIXTURES = {
  P9: {
    pass: silentFixture(true),
    breaks: {
      ...silentBreaks,
      'until Pair, the card is the one checking sentence and no Pair': (r) => editSamples(r, R(r)[0].start + 900, R(r)[0].start + 1_100, (s) => void (s.text = WORDS.publishing)),
      'after, the unreadable line above Pair': (r) => editSamples(r, r.pairableAt, r.pairableAt + 200, (s) => void (s.blockBeforePair = false)),
      'the line’s rectangle before equals the unreadable line’s after': (r) => editSamples(r, r.pairableAt, Infinity, (s) => void (s.rects.line.y += 18))
    }
  },
  H9: {
    pass: silentFixture(false),
    breaks: {
      ...silentBreaks,
      'no slower than the parent, within 1 s': (r) => void (r.parent.pairableAfterListeningMs += 2_500),
      'before Pair: the naming block, the checking sentence on its hover, no dots, Publishing your Mac’s name, Checking now': (r) => editSamples(r, R(r)[0].start + 900, R(r)[0].start + 1_100, (s) => void (s.nameTitle = null)),
      'after: four hollow dots, the unreadable sentence on the moving line, the block before Pair': (r) => editSamples(r, r.pairableAt, r.pairableAt + 200, (s) => void (s.lineUnreadable = false)),
      'the dot row’s and both lines’ rectangles equal before and after Pair appears': (r) => editSamples(r, r.pairableAt, Infinity, (s) => void (s.rects.row.x += 3)),
      'Checking again in 20 s within 1 s of the round’s end': (r) => editSamples(r, R(r)[0].end, R(r)[0].end + 1_000, (s) => void (s.time = 'Checking again in 15 s')),
      'Checking again in 10 s 11 s later, the renderer’s own tick': (r) => editSamples(r, R(r)[0].end + 10_900, R(r)[0].end + 12_000, (s) => void (s.time = 'Checking again in 15 s'))
    }
  },
  P7: {
    pass: flapFixture(true),
    breaks: {
      ...flapBreaks,
      'until Pair, every sample is the one checking sentence and no Pair': (r) => editSamples(r, R(r)[1].end, R(r)[1].end + 300, (s) => void (s.text = `${WORDS.publishing} · 1 of 4 see it`))
    }
  },
  H7: {
    pass: flapFixture(false),
    breaks: {
      ...flapBreaks,
      'each round’s dots, count and label, in server order, within 1 s of its end': (r) => editSamples(r, R(r)[1].end, R(r)[2].start, (s) => void (s.dots = [...s.dots].reverse())),
      'the quiet line after each round: 20, 30, 45 s, then a minute and 60 s': (r) => editSamples(r, R(r)[3].end, R(r)[4].start, (s) => void (s.time = s.time.replace('60 s', '45 s'))),
      'while round two waited out its silent server: asking, round one’s dots, Checking now, and opacity 0.5': (r) => editSamples(r, R(r)[1].start + 300, R(r)[1].end, (s) => void (s.opacity = 1)),
      'no animation, and every transition in the card is the dot row’s opacity over --dur-base': (r) => void r.events.push({ type: 'animationstart', property: null, animationName: 'pulse', target: 'phone-name-dot', inCard: true, t: R(r)[2].start }),
      'nothing running 500 ms into round two': (r) => editSamples(r, R(r)[1].start + 500, R(r)[1].start + 900, (s) => void (s.anims = [['CSSAnimation', 'pulse']])),
      'after round five, within 1 s: live, Took N min, four filled dots, Pair below': (r) => editSamples(r, R(r)[4].end, Infinity, (s) => void (s.time = 'Took 3 min')),
      'the block’s rectangles after round four equal those after Pair appears': (r) => editSamples(r, r.pairableAt, Infinity, (s) => void (s.rects.line.y += 4)),
      'pairable no later than 1 s after the parent’s moment': (r) => void (r.parent.pairableFromFirstMs -= 3_000),
      'app.log says each change of verdict once, and no port, name or address': (r) => void (r.appLog += `\n2026-09-30 14:20:00 info pocket ${WORDS.verdict} no: nxdomain`)
    },
    refused: [
      { what: 'a log line naming a stand-in’s port', clause: 'app.log says each change of verdict once, and no port, name or address', edit: (r) => void (r.appLog += `\nasked 127.0.0.1:${String(PORTS[2])}`) },
      { what: 'a log line naming the Mac’s name', clause: 'app.log says each change of verdict once, and no port, name or address', edit: (r) => void (r.appLog += `\nasked ${FIX_NAME}`) },
      // The logger's JSON lines (the reverify): read by their msg, never let through.
      { what: 'app.log as JSON lines, saying a change of verdict twice', clause: 'app.log says each change of verdict once, and no port, name or address', edit: (r) => void (r.appLog = `${asJsonLines(r.appLog)}\n${jsonLine(`${WORDS.verdict} no: nxdomain`)}`) },
      { what: 'app.log as JSON lines, missing a change of verdict', clause: 'app.log says each change of verdict once, and no port, name or address', edit: (r) => void (r.appLog = asJsonLines(r.appLog.split('\n').filter((l) => !l.includes(`${WORDS.verdict} yes`)).join('\n'))) },
      { what: 'a JSON line whose message names a stand-in’s port', clause: 'app.log says each change of verdict once, and no port, name or address', edit: (r) => void (r.appLog = `${asJsonLines(r.appLog)}\n${jsonLine(`asked 127.0.0.1:${String(PORTS[1])}`)}`) },
      { what: 'a JSON line naming the Mac’s name in a field of its own', clause: 'app.log says each change of verdict once, and no port, name or address', edit: (r) => void (r.appLog = `${asJsonLines(r.appLog)}\n${jsonLine('asked', { host: FIX_NAME })}`) },
      { what: 'a transition on something in the card that is not the dot row', clause: 'no animation, and every transition in the card is the dot row’s opacity over --dur-base', edit: (r) => void r.events.push({ type: 'transitionrun', property: 'height', animationName: null, target: 'phone-name', inCard: true, t: R(r)[2].start }) },
      { what: 'a breath that is not --dur-base', clause: 'no animation, and every transition in the card is the dot row’s opacity over --dur-base', edit: (r) => r.samples.forEach((s) => void (s.transitionDuration = s.block ? '0.4s' : s.transitionDuration)) },
      { what: 'a card that never breathed', clause: 'no animation, and every transition in the card is the dot row’s opacity over --dur-base', edit: (r) => void (r.events = r.events.filter((e) => !e.inCard)) }
    ]
  },
  H8: {
    pass: reducedFixture(),
    breaks: {
      'reduced motion matched': (r) => void (r.reducedMotion = false),
      'the switch-on round re-asked a kept confirmation and answered no on all four': (r) => void (r.kept = false),
      'the block appeared after it, 0 of 4, and not before': (r) => editSamples(r, -Infinity, R(r)[0].start - 1, (s) => void (s.block = true)),
      'round two 20 s later: A held to its deadline, the others the record': (r) => void (r.logs.B[1].answered = 'nx'),
      'the row read opacity 0.5 in the first sample after round two’s push': (r) => editSamples(r, R(r)[1].start, R(r)[1].start + 200, (s) => void (s.opacity = 0.75)),
      'no transition anywhere, no animation in the card, nothing running': (r) => void r.events.push({ type: 'transitionrun', property: 'transform', animationName: null, target: 'switch-thumb', inCard: false, t: 1 }),
      'live after round two': (r) => editSamples(r, R(r)[1].end, Infinity, (s) => void (s.state = 'checking'))
    },
    refused: [
      { what: 'an animation in the card under reduced motion', clause: 'no transition anywhere, no animation in the card, nothing running', edit: (r) => void r.events.push({ type: 'animationstart', property: null, animationName: 'pulse', target: 'phone-name-dot', inCard: true, t: 1 }) },
      { what: 'a running animation sampled', clause: 'no transition anywhere, no animation in the card, nothing running', edit: (r) => void (r.samples[5].anims = [['CSSTransition', 'opacity']]) }
    ]
  },
  RUN: {
    pass: { tailscalePreflight: true, dnsPreflights: [true, true, true, true], joinedOk: true, agentsHeld: [true], realTailscale: 0, samples: 300, forbidden: 0, refusedArgv: 0, udpLeaks: 0, udpSamples: 150, totalQuestions: 40, questionProblems: [], appLogRead: true, appLogName: false, appLogAddress: false, standinLeft: 0, dnsClosed: [true, true, true, true], electronLeft: 0 },
    breaks: {
      'the Tailscale preflight passed': (r) => void (r.tailscalePreflight = false),
      'the four DNS preflights passed and the joined value names loopback alone': (r) => void (r.joinedOk = false),
      'the quiet agents held': (r) => void (r.agentsHeld = [false]),
      'no real Tailscale in any sample': (r) => void (r.realTailscale = 1),
      'no forbidden or refused argv reached the stand-in': (r) => void (r.forbidden = 1),
      'UDP to 127.0.0.1 alone': (r) => void (r.udpLeaks = 1),
      'every question any stand-in logged is A, RD 0, for the name': (r) => void (r.questionProblems = ['1 question(s) asked for recursion']),
      'app.log holds neither the name nor the address': (r) => void (r.appLogName = true),
      'every stand-in ended and the four DNS stand-ins closed': (r) => void (r.dnsClosed = [true, true, false, true]),
      'no Electron of this run is left': (r) => void (r.electronLeft = 1)
    },
    refused: [
      { what: 'three DNS preflights where four were owed', clause: 'the four DNS preflights passed and the joined value names loopback alone', edit: (r) => void (r.dnsPreflights = [true, true, true]) },
      { what: 'a run that asked the stand-ins nothing', clause: 'every question any stand-in logged is A, RD 0, for the name', edit: (r) => void (r.totalQuestions = 0) }
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
  // The probe's own composer, row by row against SPEC §5.5.2's words.
  const rows = [
    [expectTime(5_000, 20_000), 'Checking again in 20 s'],
    [expectTime(5_000, 19_999), 'Checking again in 20 s'],
    [expectTime(5_000, 15_001), 'Checking again in 20 s'],
    [expectTime(5_000, 15_000), 'Checking again in 15 s'],
    [expectTime(5_000, 1), 'Checking again in 5 s'],
    [expectTime(5_000, 0), 'Checking now'],
    [expectTime(5_000, null), 'Checking now'],
    [expectTime(59_999, 9_000), 'Checking again in 10 s'],
    [expectTime(60_000, 9_000), '1 min · checking again in 10 s'],
    [expectTime(97_400, 59_600), '1 min · checking again in 60 s'],
    [expectTime(180_000, null), '3 min · checking now'],
    [expectTook(59_999), 'Took under a minute'],
    [expectTook(157_000), 'Took 2 min'],
    [expectLine([]), 'Publishing your Mac’s name'],
    [expectLine(['record', 'negative', 'record', 'negative']), 'Publishing your Mac’s name · 2 of 4 see it'],
    [expectLabel(['negative', 'unreadable', 'record', 'negative']), '1 of 4 name servers see your Mac’s name'],
    [J(verdictOf(['record', 'nx', 'silent', 'record'])), J({ verdict: 'no', reason: 'nxdomain' })],
    [J(verdictOf(['record', 'silent', 'record', 'record'])), J({ verdict: 'yes', reason: 'record' })],
    [J(verdictOf(['silent', 'silent', 'silent', 'silent'])), J({ verdict: 'unreadable', reason: null })],
    [String(durMs('0.16s')), '160'],
    [String(durMs('160ms')), '160'],
    [String(durMs('0.001s, 0s')), '1']
  ];
  for (const [got, want] of rows) say(got === want, `the probe's composer reads ${J(want)} (${J(got)})`);
  // Rounds out of a log: the flap's five, with round two ending at its deadline, and the verdict lines.
  const flap = roundsOf(fixtureLogs(H7_SCRIPTS, H7_STARTS_MS, 0));
  say(flap.length === 5 && flap[1].end === flap[1].start + 3 + ROUND_DEADLINE_MS && flap[0].end === flap[0].start + 3, `roundsOf reads five rounds and ends round two at its deadline (${J(flap.map((x) => [x.start, x.end]))})`);
  say(J(flap.map((x) => x.dots.filter((d) => d === 'record').length)) === J([2, 1, 3, 2, 4]), 'the flap sees 2, 1, 3, 2 then 4 of 4, his measurement');
  say(J(verdictChanges(flap)) === J([`${WORDS.verdict} no: nxdomain`, `${WORDS.verdict} yes: record`]), 'the flap says two changes of verdict, no then yes');
  // The reverify (2026-10-08): app.log is one JSON object a line. The line his
  // run wrote, byte for byte, reads as its msg; a plain line reads whole; and
  // the H7 fixture written as JSON lines, its pid one of the stand-ins' ports
  // and its clock full of colons, passes the clause the plain one passes.
  const hisLine = '{"ts":"2026-10-08T18:14:18.041Z","level":"info","scope":"pocket","pid":5241,"proctype":"main","msg":"the Mac’s name check read no: nxdomain"}';
  say(J(logLines(`${hisLine}\nplain words\n`)) === J([{ says: 'the Mac’s name check read no: nxdomain', scan: '{"level":"info","scope":"pocket","proctype":"main","msg":"the Mac’s name check read no: nxdomain"}' }, { says: 'plain words', scan: 'plain words' }]), 'logLines reads a JSON line as its msg, scans it without ts and pid, and reads a plain line whole');
  const jsonH7 = structuredClone(GRADER_FIXTURES.H7.pass);
  jsonH7.appLog = asJsonLines(jsonH7.appLog);
  say(jsonH7.appLog.split('\n').every((l) => JSON.parse(l).pid === PORTS[0]) && grade('H7', jsonH7).ok, 'H7 passes the flap’s app.log written as JSON lines, a pid equal to a stand-in’s port and a clock of colons included');
  say(J(flap.map((x, i) => x.start - flap[0].start)) === J(H7_STARTS_MS.map((s, i) => s + 0 * i)), 'the fixture rounds start where SPEC §9.3’s table says');
  // Each script's round k answers its k-th entry, as the stand-in's script mode does.
  const h8 = roundsOf(fixtureLogs(H8_SCRIPTS, [0, 20_000], 0));
  say(J(h8.map((x) => x.answered)) === J([['nx', 'nx', 'nx', 'nx'], ['silent', 'record', 'record', 'record']]), 'H8’s two rounds answer no on four, then hold A and confirm on three');
  process.stdout.write(failures === 0 ? `[p3321] grader self-test PASS: ${String(Object.keys(GRADERS).length)} graders, ${String(clauses)} clauses, each shown to go red on its own break.\n` : `[p3321] grader self-test FAIL: ${String(failures)}.\n`);
  return failures === 0;
}

// ---------------------------------------------------------------------------
// Main's UDP sockets, read with lsof
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

if (process.argv.includes('--grader-self-test')) {
  process.exit(graderSelfTest() ? 0 : 1);
}

// ===========================================================================
// THE RUN. Everything below starts processes; builders never reach it.
// ===========================================================================

const CHECKOUT = resolve((process.env['P3321_PARENT_CHECKOUT'] ?? '').trim() || ROOT);
const AT_PARENT = CHECKOUT !== ROOT;
const TAG = `[p3321 ${AT_PARENT ? 'parent' : 'head'}]`;
const say = (line) => console.log(`${TAG} ${line}`);
const ARMS = new Set(((process.env['P3321_ARMS'] ?? '').trim() || (AT_PARENT ? 'P9,P7' : 'H9,H7,H8')).split(',').map((s) => s.trim()));
const KEEP = (process.env['P3321_KEEP'] ?? '') === '1';
const RUN_9 = ARMS.has('P9') || ARMS.has('H9');
const RUN_7 = ARMS.has('P7') || ARMS.has('H7');
const RUN_8 = ARMS.has('H8') && !AT_PARENT;

if (!existsSync(join(CHECKOUT, 'out', 'main', 'index.js'))) {
  console.error(`${TAG} ${CHECKOUT} has no build at out/main/index.js. Run npm run build there first.`);
  process.exit(2);
}

const RUN = resolve((process.env['P3321_RUN'] ?? '').trim() || `/private/tmp/p3321-probe-${String(process.pid)}`);
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
const SOCKET = `gmux-p3321-${String(process.pid)}`;
const APP_LOG = join(PROFILE, 'logs', 'app.log');
const NAME = DEFAULT_SCENARIO.dnsName.replace(/\.$/, '');
const OUT = join(ROOT, 'out', 'p3321');

const report = { checkout: CHECKOUT, atParent: AT_PARENT, arms: [], readings: {}, summary: {} };
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
// The world's guards: four DNS stand-ins, the Tailscale stand-in, main's UDP
// ---------------------------------------------------------------------------

/** The four DNS stand-ins, in server order A, B, C, D. */
const dns = [];
let standin = null;
let watch = null;
let lastShim = 0;
let lastApp = 0;
let tailscalePreflight = false;
const dnsPreflights = [];
let joinedOk = false;
const agentsHeld = [];
const launches = [];

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
    if (await test()) return true;
    if (Date.now() - started >= ms) return false;
    await sleepRaw(every);
  }
}

const joinedServers = () => dns.map((d) => d.servers).join(',');
const marks = () => dns.map((d) => d.log().length);
const logsFrom = (from) => Object.fromEntries(SERVERS.map((s, i) => [s, dns[i].log().slice(from[i])]));
const newQuestions = (from) => dns.reduce((n, d, i) => n + d.log().length - from[i], 0);
const lastQuestionAt = () => Math.max(0, ...dns.map((d) => d.log().at(-1)?.at ?? 0));
function setScripts(scripts) {
  SERVERS.forEach((s, i) => dns[i].setMode({ script: [...scripts[s]] }));
}

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
async function setOff(main) {
  await pocket(main, 'setDoor', { on: false });
  return waitStatus(main, (s) => s.state === 'off', 20_000);
}
/** The switch on; Allow on the sheet only when the door's lines need it (the agreement survives an off). */
async function switchOn(settings, main) {
  await pocket(main, 'setDoor', { on: true });
  const first = await waitStatus(main, (s) => s.state === 'listening' || linesReady(s), 45_000, 100);
  if (first.ok && first.status.state !== 'listening' && !(await allowDoor(settings, main))) return false;
  return (await waitStatus(main, (s) => s.state === 'listening', 45_000, 100)).ok;
}

/**
 * THE RECORDER, installed once on the Settings page: every transition and
 * animation event on the document, and every status main pushes, each with the
 * renderer's own wall-clock time.
 */
const RECORDER = `(() => {
  if (window.__p3321 !== undefined) return 'already';
  const events = [];
  const pushes = [];
  window.__p3321 = { events, pushes };
  const inCard = (el) => el instanceof Element && el.closest('section[aria-label="Phone"] [data-phone-stage]') !== null;
  const targetOf = (el) => (el instanceof Element ? (el.matches('[data-phone-name-dots]') ? 'dots' : String(el.className || el.tagName.toLowerCase())) : String(el));
  for (const type of ['transitionrun', 'transitionend', 'transitioncancel', 'animationstart', 'animationend']) {
    document.addEventListener(type, (e) => {
      events.push({ type, property: e.propertyName ?? null, animationName: e.animationName ?? null, target: targetOf(e.target), inCard: inCard(e.target), t: Date.now() });
    }, true);
  }
  try {
    window.gmux.pocket.onChanged((s) => {
      pushes.push({ t: Date.now(), state: s && s.state, nameCheck: s && s.nameCheck, pairable: s && s.pairable, nameProgress: s && s.nameProgress !== undefined ? s.nameProgress : 'absent' });
    });
  } catch (e) {
    pushes.push({ t: Date.now(), error: String(e) });
  }
  return 'installed';
})()`;
async function drainRecorder(settings) {
  return JSON.parse(await cdpEval(settings, `JSON.stringify(window.__p3321 === undefined ? { events: [], pushes: [] } : { events: window.__p3321.events.splice(0), pushes: window.__p3321.pushes.splice(0) })`));
}

/** The pairing card, read in ONE evaluation, one frame after the last change (the occlusion trap). */
const CARD_READER = `(async () => {
  await Promise.race([new Promise((r) => requestAnimationFrame(() => r())), new Promise((r) => setTimeout(r, 50))]);
  const rect = (el) => { if (el === null) return null; const b = el.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; };
  const s = document.querySelector('section[aria-label="Phone"]');
  const c = s === null ? null : s.querySelector('[data-phone-stage]');
  const q = (sel) => (c === null ? null : c.querySelector(sel));
  const block = q('[data-phone-name]');
  const row = q('[data-phone-name-dots]');
  const line = q('[data-phone-name-line]') ?? q('[data-phone-name-unreadable]') ?? q('.phone-line');
  const time = q('[data-phone-name-time]');
  // Phase 333.1 (build/p3331/SPEC.md §5.4.4): the card is step 3's body, and
  // POCKET_NAME_WAIT_NOTE is drawn under the block for exactly as long as the
  // block; read beside the others, graded by probe:p3331 R9.
  const note = q('[data-phone-name-note]');
  const pair = q('[data-phone-action="pair"]');
  const cs = row === null ? null : getComputedStyle(row);
  const first = block ?? line;
  return JSON.stringify({
    at: Date.now(),
    stage: c === null ? null : c.getAttribute('data-phone-stage'),
    text: c === null ? '' : c.innerText.trim(),
    block: block !== null,
    nameTitle: block === null ? null : block.getAttribute('title'),
    state: block === null ? null : block.getAttribute('data-phone-name-state'),
    dots: row === null ? [] : [...row.querySelectorAll('[data-answer]')].map((d) => d.getAttribute('data-answer')),
    dotTitles: row === null ? [] : [...row.querySelectorAll('[data-answer]')].map((d) => d.getAttribute('title')),
    asking: row === null ? null : row.getAttribute('data-asking'),
    role: row === null ? null : row.getAttribute('role'),
    label: row === null ? null : row.getAttribute('aria-label'),
    ariaHidden: row === null ? null : row.getAttribute('aria-hidden'),
    opacity: cs === null ? null : Number(cs.opacity),
    transitionDuration: cs === null ? null : cs.transitionDuration,
    transitionProperty: cs === null ? null : cs.transitionProperty,
    line: line === null ? null : line.innerText.trim(),
    lineUnreadable: line !== null && line.hasAttribute('data-phone-name-unreadable'),
    lineLive: line !== null && line.getAttribute('aria-live'),
    time: time === null ? null : time.innerText.trim(),
    timeTitle: time === null ? null : time.getAttribute('title'),
    note: note === null ? null : note.innerText.trim(),
    rects: { row: rect(row), line: rect(line), time: rect(time), note: rect(note), pair: rect(pair), card: rect(c) },
    pairButton: pair !== null,
    blockBeforePair: first !== null && pair !== null && (first.compareDocumentPosition(pair) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0,
    anims: c === null ? [] : c.getAnimations({ subtree: true }).map((a) => [a.constructor.name, a.transitionProperty ?? a.animationName ?? null]),
    durBase: getComputedStyle(document.documentElement).getPropertyValue('--dur-base').trim(),
    reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
    width: innerWidth
  });
})()`;
async function card(settings) {
  return JSON.parse(await cdpEval(settings, CARD_READER, 10_000));
}

/**
 * Read the card and main until `done` says so or `timeoutMs` passes: the card
 * every 100 ms while a round is out (a question in the last 2.6 s) and every
 * 250 ms otherwise, main's status every pass, kept when it changed.
 */
async function readArm(settings, main, { done, timeoutMs }) {
  const samples = [];
  const statuses = [];
  let listeningAt = null;
  let pairableAt = null;
  let lastKey = '';
  let lastCard = 0;
  const t0 = Date.now();
  for (;;) {
    stopIfLeaked();
    const s = await status(main);
    const at = Date.now();
    if (s !== null) {
      const row = { state: s.state, pairable: s.pairable, nameCheck: s.nameCheck, nameProgress: s.nameProgress === undefined ? 'absent' : s.nameProgress };
      const key = J(row);
      if (key !== lastKey) statuses.push({ at, ...row });
      lastKey = key;
      if (listeningAt === null && s.state === 'listening') listeningAt = at;
      if (listeningAt !== null && pairableAt === null && s.pairable === true && s.state === 'listening') pairableAt = at;
    }
    const fast = Date.now() - lastQuestionAt() < 2_600 || Date.now() - t0 < 3_000;
    if (Date.now() - lastCard >= (fast ? 100 : 250)) {
      lastCard = Date.now();
      samples.push(await card(settings));
    }
    if (done({ listeningAt, pairableAt, samples, now: Date.now() })) break;
    if (Date.now() - t0 > timeoutMs) break;
    await sleepRaw(fast ? 30 : 80);
  }
  return { samples, statuses, listeningAt, pairableAt };
}

function launchOptions(label) {
  return {
    label,
    userDataDir: PROFILE,
    cwd: CHECKOUT,
    tmuxSocket: SOCKET,
    // Chromium's occlusion and backgrounding OFF (probe-p208's three switches):
    // an occluded window's animation clock does not move, and the breath this
    // probe reads would photograph its starting value.
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
      // THE STAND-INS. A development build honours both and a packaged one
      // ignores both, which is why no packaged Tortie is ever launched here.
      GMUX_TAILSCALE_BIN: standin.binPath,
      [NAME_SERVERS_VAR]: joinedServers()
    }),
    graceMs: 8_000,
    ceilingMs: 1_200_000
  };
}

/** One launch through the helper, after every preflight and the quiet agents. */
async function launch(label, body) {
  const pre = preflightStandin(standin, standin.binPath);
  if (!pre.ok) throw new Error(`the Tailscale preflight refused the launch: ${pre.problems.join('; ')}`);
  const value = launchOptions(label).env[NAME_SERVERS_VAR];
  // EACH stand-in preflights its OWN value, and the joined value names loopback alone and is exactly the four.
  for (const d of dns) {
    const p = await d.preflight(d.servers);
    dnsPreflights.push(p.ok);
    if (!p.ok) throw new Error(`the DNS preflight of ${d.servers} refused the launch: ${p.problems.join('; ')}`);
  }
  joinedOk = dns.length === 4 && loopbackOnlyServers(value) && value === dns.map((d) => d.servers).join(',') && new Set(value.split(',')).size === 4;
  if (!joinedOk) throw new Error(`${NAME_SERVERS_VAR}=${J(value)} is not exactly the four loopback stand-ins`);
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

const appLogBytes = () => {
  try {
    return readFileSync(APP_LOG);
  } catch {
    return null;
  }
};
const appLogSize = () => {
  try {
    return statSync(APP_LOG).size;
  } catch {
    return 0;
  }
};

/** What the side-by-side prints for one arm. */
function summaryOf(reading) {
  const rounds = roundsOf(reading.logs);
  const first = rounds[0];
  const naming = reading.samples.filter((s) => s.stage === 'naming');
  return {
    pairableAfterListeningMs: reading.pairableAt - reading.listeningAt,
    pairableFromFirstMs: first === undefined ? null : reading.pairableAt - first.start,
    distinctNamingTexts: [...new Set(naming.map((s) => s.text))],
    atEachRoundEnd: rounds.map((r) => {
      const s = firstAfter(reading.samples, r.end + 300);
      return { endsAtS: first === undefined ? null : Math.round((r.end - first.start) / 100) / 10, answered: r.answered, card: s === null ? null : s.text };
    }),
    width: reading.samples.at(-1)?.width ?? null
  };
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

try {
  rmSync(RUN, { recursive: true, force: true });
  for (const dir of [HOME, HARNESS, PROFILE, PROJECT]) mkdirSync(dir, { recursive: true });
  standin = makeStandin({ dir: STANDIN_DIR, scenario: { ...DEFAULT_SCENARIO } });
  const pre = preflightStandin(standin, standin.binPath);
  tailscalePreflight = pre.ok;
  if (!pre.ok) throw new Error(`the Tailscale preflight refused: ${pre.problems.join('; ')}`);
  // FOUR stand-ins, server order A, B, C, D, each silent until an arm sets its script.
  for (let i = 0; i < 4; i += 1) dns.push(await makeDnsStandin({ name: NAME, mode: { script: ['silent'] } }));
  say(`four DNS stand-ins answer for ${NAME} on ${joinedServers()}`);
  watch = watchForRealTailscale({ roots: () => [lastShim, lastApp].filter((p) => p > 0), everyMs: 1_000 });

  let parent = null;
  if (!AT_PARENT) {
    try {
      parent = JSON.parse(readFileSync(join(OUT, 'probe-p3321-parent.json'), 'utf8'));
    } catch {
      parent = null;
    }
    if (parent === null) say('no parent reading at out/p3321/probe-p3321-parent.json, so H9 and H7 are not compared with it');
  }

  await launch('p3321', async (handle, main) => {
    let settings = null;
    try {
      settings = await attachSettings(main);
      await cdpEval(settings, RECORDER);
      await sleep(1_500);
      let h7Ran = false;

      // ---- P9 / H9: four silent servers, nothing remembered ---------------
      if (RUN_9) {
        const id = AT_PARENT ? 'P9' : 'H9';
        const idleFrom = marks();
        const idleT0 = Date.now();
        await sleep(5_000);
        const idleQuestions = newQuestions(idleFrom);
        const idleMs = Date.now() - idleT0;
        setScripts(SILENT_SCRIPTS);
        const from = marks();
        await drainRecorder(settings);
        await pocket(main, 'setDoor', { on: true });
        if (!(await allowDoor(settings, main, 45_000))) throw new Error(`${id}: the door's lines were never ready to Allow`);
        const got = await readArm(settings, main, { done: (c) => c.pairableAt !== null && c.now >= c.pairableAt + 12_000, timeoutMs: 90_000 });
        const rec = await drainRecorder(settings);
        if (got.listeningAt === null || got.pairableAt === null) {
          cannotRead(id, `the door ${got.listeningAt === null ? 'never listened' : 'listened and never turned pairable'} within 90 s`);
        } else {
          arm(id, {
            idleQuestions,
            idleMs,
            logs: logsFrom(from),
            name: NAME,
            listeningAt: got.listeningAt,
            pairableAt: got.pairableAt,
            samples: got.samples,
            statuses: got.statuses,
            events: rec.events,
            pushes: rec.pushes,
            parent: AT_PARENT || parent?.summary?.P9 === undefined ? null : { pairableAfterListeningMs: parent.summary.P9.pairableAfterListeningMs }
          });
          report.summary[id] = summaryOf(report.readings[id]);
        }
        if (!(await setOff(main)).ok) throw new Error(`${id}: the door did not go off`);
      }

      // ---- P7 / H7: his flapping name ----------------------------------------
      if (RUN_7) {
        const id = AT_PARENT ? 'P7' : 'H7';
        setScripts(H7_SCRIPTS);
        const from = marks();
        const logFrom = appLogSize();
        await drainRecorder(settings);
        if (!(await switchOn(settings, main))) throw new Error(`${id}: the door did not listen after the switch`);
        const got = await readArm(settings, main, { done: (c) => c.pairableAt !== null && c.now >= c.pairableAt + 10_000, timeoutMs: 260_000 });
        const rec = await drainRecorder(settings);
        await sleep(500);
        const bytes = appLogBytes();
        if (got.listeningAt === null || got.pairableAt === null) {
          cannotRead(id, `the door ${got.listeningAt === null ? 'never listened' : 'listened and never turned pairable'} within 260 s`);
        } else {
          arm(id, {
            logs: logsFrom(from),
            name: NAME,
            listeningAt: got.listeningAt,
            pairableAt: got.pairableAt,
            samples: got.samples,
            statuses: got.statuses,
            events: rec.events,
            pushes: rec.pushes,
            appLog: bytes === null ? '' : bytes.subarray(logFrom).toString('utf8'),
            appLogRead: bytes !== null,
            ports: dns.map((d) => d.port),
            parent: AT_PARENT || parent?.summary?.P7 === undefined ? null : { pairableFromFirstMs: parent.summary.P7.pairableFromFirstMs }
          });
          report.summary[id] = summaryOf(report.readings[id]);
          h7Ran = true;
        }
      }

      // ---- H8: reduced motion -----------------------------------------------
      if (RUN_8) {
        await settings.call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
        const reducedMotion = (await cdpEval(settings, "matchMedia('(prefers-reduced-motion: reduce)').matches")) === true;
        const off = await setOff(main);
        if (!off.ok) throw new Error('H8: the door did not go off');
        // THE KEPT CONFIRMATION, read with the door off: the switch-on round on
        // loopback answers within milliseconds of listening, faster than a poll.
        const keptBefore = off.status.nameCheck === 'confirmed';
        setScripts(H8_SCRIPTS);
        const from = marks();
        await drainRecorder(settings);
        await pocket(main, 'setDoor', { on: true });
        const listening = await waitStatus(main, (s) => s.state === 'listening', 45_000, 50);
        let liveAt = null;
        const got = await readArm(settings, main, {
          done: (c) => {
            if (liveAt === null && c.samples.at(-1)?.state === 'live') liveAt = c.now;
            return liveAt !== null && c.now >= liveAt + 3_000;
          },
          timeoutMs: 90_000
        });
        const rec = await drainRecorder(settings);
        arm('H8', {
          reducedMotion,
          kept: keptBefore || (listening.ok && listening.status.nameCheck === 'confirmed'),
          keptOwed: h7Ran,
          logs: logsFrom(from),
          name: NAME,
          samples: got.samples,
          statuses: got.statuses,
          events: rec.events,
          pushes: rec.pushes
        });
      }
    } finally {
      settings?.close();
    }
  });
} catch (err) {
  cannotRead('the run', `it threw: ${String(err?.stack ?? err)}`);
} finally {
  // Everything this run started, by pid, whatever happened.
  clearInterval(udpTimer);
  const ended = standin === null ? { ended: [], left: [] } : endStandinProcesses(STANDIN_DIR, 1_500);
  const findings = watch?.stop() ?? [];
  const log = standin?.readLog() ?? [];
  const questions = Object.fromEntries(SERVERS.map((s, i) => [s, dns[i]?.log() ?? []]));
  for (const d of dns) await d.close();
  const bytes = appLogBytes();
  const text = bytes === null ? null : bytes.toString('utf8');
  const commandOfPid = (pid) => (spawnSync('/bin/ps', ['-ww', '-p', String(pid), '-o', 'command='], { encoding: 'utf8' }).stdout ?? '').trim();
  const ours = (spawnSync('/bin/ps', ['-Ao', 'pid=,ppid=,comm='], { encoding: 'utf8' }).stdout ?? '')
    .split('\n')
    .filter((l) => /Electron|Tortie$|chrome_crashpad/.test(l) && !/defunct/.test(l))
    .filter((l) => {
      const [pid, ppid] = l.trim().split(/\s+/).map(Number);
      return launches.some((x) => [x.shim, x.app].filter((p) => p > 0).some((p) => pid === p || ppid === p)) || commandOfPid(pid).includes(PROFILE);
    });
  const every = allRows(questions);
  arm('RUN', {
    tailscalePreflight,
    dnsPreflights: dnsPreflights.slice(-4),
    joinedOk,
    agentsHeld,
    realTailscale: findings.length,
    samples: watch?.samples() ?? 0,
    forbidden: log.filter((e) => e.forbidden === true).length,
    refusedArgv: log.filter((e) => e.verdict === 'refused').length,
    udpLeaks: udp.leaks.length,
    udpSamples: udp.samples,
    totalQuestions: every.length,
    questionProblems: nameQuestionProblems(every, NAME),
    appLogRead: text !== null,
    appLogName: text !== null && text.toLowerCase().includes(NAME),
    appLogAddress: text !== null && text.includes(STANDIN_ADDRESS),
    standinLeft: ended.left.length,
    dnsClosed: dns.length === 4 ? dns.map((d) => d.closed()) : [],
    electronLeft: ours.length
  });
  report.raw = {
    dnsLogs: questions,
    servers: dns.map((d) => d.servers),
    udpSeen: [...udp.seen].sort(),
    udpLeaks: udp.leaks,
    realTailscaleFindings: findings,
    standinEnded: ended,
    standinRowsAtEnd: processRows().filter((r) => r.command.includes('tailscale-standin.mjs')).length
  };
  if (!KEEP) rmSync(RUN, { recursive: true, force: true });
}

mkdirSync(OUT, { recursive: true });
const outFile = join(OUT, `probe-p3321-${AT_PARENT ? 'parent' : 'head'}.json`);
writeFileSync(outFile, `${J(report, null, 1)}\n`, 'utf8');
say(`wrote ${outFile}${KEEP ? `; kept the scratch world at ${RUN}` : ''}`);
if (!AT_PARENT) {
  let parent = null;
  try {
    parent = JSON.parse(readFileSync(join(OUT, 'probe-p3321-parent.json'), 'utf8'));
  } catch {
    parent = null;
  }
  const line = (label, s) => (s === undefined ? `${label}: no reading` : `${label}: Pair ${String(s.pairableAfterListeningMs)} ms after listening (${String(s.pairableFromFirstMs)} ms after the first question); ${String(s.distinctNamingTexts.length)} distinct text(s) before Pair; width ${String(s.width)}`);
  say('SIDE BY SIDE, the same scripts at both builds:');
  for (const [p, h] of [['P9', 'H9'], ['P7', 'H7']]) {
    say(`  ${line(`parent ${p}`, parent?.summary?.[p])}`);
    say(`  ${line(`HEAD   ${h}`, report.summary[h])}`);
    const pr = parent?.summary?.[p]?.atEachRoundEnd ?? [];
    const hr = report.summary[h]?.atEachRoundEnd ?? [];
    for (let i = 0; i < Math.max(pr.length, hr.length); i += 1) {
      say(`    round ${String(i + 1)} at ${String(hr[i]?.endsAtS ?? pr[i]?.endsAtS)} s ${J(hr[i]?.answered ?? pr[i]?.answered)}: parent ${J(pr[i]?.card ?? null)} | HEAD ${J(hr[i]?.card ?? null)}`);
    }
  }
  const h7 = report.readings.H7;
  if (h7 !== undefined) {
    const cancels = h7.events.filter((e) => e.inCard && e.type === 'transitioncancel').length;
    say(`  H7 pushes: ${String(h7.pushes.length)} over ${String(roundsOf(h7.logs).length)} rounds; transitions in the card: ${String(h7.events.filter((e) => e.inCard && e.type === 'transitionrun').length)} run, ${String(cancels)} cancelled (SPEC §12 concerns 3 and 5)`);
  }
}
if (failures > 0) {
  say(`probe:p3321 FAILED ${String(failures)} arm(s)`);
  process.exit(1);
}
if (unreadable > 0) {
  say(`probe:p3321 could not READ ${String(unreadable)} arm(s); that is not a pass`);
  process.exit(2);
}
say(AT_PARENT ? 'probe:p3321 at the parent: the parent reading is taken' : 'probe:p3321 OK');
process.exit(0);
