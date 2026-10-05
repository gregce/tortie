#!/usr/bin/env node
/**
 * probe:p3167 — THE PHASE 316.7 APP RUN, the Mac's door: `GET /v1/sessions`
 * over a 2,000-row world (build/p3167/SPEC.md §9.3). No Simulator.
 *
 * ONE Electron at HEAD through build/electron-run.mjs's `withElectron`, on a
 * scratch profile and a scratch HOME under the harness directory, the tmux
 * socket build/harness-socket.mjs hands it (`gmux-p3167…`), and the LOOPBACK
 * scratch machine build/with-scratch-machine.mjs starts around this file (its
 * own sshd on 127.0.0.1, its own keys and agent, its own TMUX_TMPDIR, ended
 * there in a `finally`). With `P3167_PARENT_CHECKOUT` a SECOND Electron runs
 * that BUILT parent checkout (`da1138de`, main before this phase landed;
 * `c1a5fd38` when it was built) on the same profile, FIRST, one after the
 * other and never at once, so the HEAD launch that follows reads the door's
 * agreement `changed` (Q6), the route list being a hashed field.
 *
 * THE WORLD. BEFORE any launch build/p3167/seed-sessions.mts (`--shape
 * probe`) writes 2,000 sessions into the scratch manifest through the
 * SHIPPING `ManifestStore.insertSession`: ended and live-RECORDED rows over
 * 60 folders, two local folders named `app`, a 300-character name carrying
 * U+202E and U+2066 to U+2069, three rows with no creation clock, a closed
 * tab's name on a folder's SECOND member, and the agents claude, codex and
 * shell. Records only: main's boot reconcile reads each recorded-live row
 * whose tmux session is absent as restorable, and nothing of theirs runs.
 * Then, through the bridge: twelve live shells (four in each local `app`
 * folder, four in a third), one `claude` whose binary is a /bin/sh printing
 * the committed Phase 312 dialog (a waiting row the poll stamps), and two
 * shells in a folder named `app` on the loopback machine. NO VENDOR PROCESS
 * RUNS AND NO MODEL TURN IS SPENT.
 *
 * WHAT IS REAL. The door, switched on, confirmed and published through the
 * STAND-IN Tailscale (build/p330/tailscale-standin.mjs, named by
 * GMUX_TAILSCALE_BIN, preflighted by sha256; the process table is sampled
 * every second and a real Tailscale under the app, or run as a command, FAILS
 * the run). The name check asks build/p332/dns-standin.mjs, IN THIS PROCESS on
 * 127.0.0.1, named by GMUX_POCKET_NAME_SERVERS. The phone is
 * build/p316/node-phone.mjs, paired through the stand-in's loopback forwarder
 * with mutual TLS, its reads spelled the phone's way (`sessionsTarget`) and
 * judged by the phone's own refusals re-derived there
 * (`sessionsAnswerProblems`), never by the door's composer.
 *
 * THE ARMS (SPEC §9.3)
 *   Q1  every Show × Group × Sort, with and without each agent filter and
 *       each machine filter: each answer 200 and drawn by the phone's
 *       refusals (each row once, every `group` in range, groups together under
 *       Project and in the order their first row is emitted, each count its
 *       drawn rows plus its `omitted`, the group omitted summing to no more
 *       than the answer's, `asked` echoed); the rows and groups under the
 *       byte budget and the row cap; `total` every listed session and the
 *       rows plus the omitted what the words keep (a project whose every row
 *       the caps left out is in no group, so the counts may sum to less, SPEC
 *       "§As built"), by THIS FILE's own reading of main's list
 *       (Active is running, idle, needs input or unknown; Ended is exited or
 *       restorable); the waiting session in every answer whose words keep it,
 *       its group marked waiting (§15 F2, F3); a group the same id, label,
 *       machine and folder in every answer, and a folder only when another
 *       group shares its label and machine (D7); a closed tab's name on a
 *       folder's second member labels its group (§15 F12); `collapsed` only
 *       under All, exactly over the groups none of whose kept rows is active
 *       (D8); no clock read as an age; and THE THREE `app` GROUPS DISTINCT:
 *       the two local ones each with its folder, the loopback machine's with
 *       its badge and NO folder (§15 F10)
 *   Q2  §8.2's query set live through the stand-in's forwarder: every cased,
 *       doubled, empty, key-only, unknown, percent-encoded non-word, NUL,
 *       over-long and malformed-id query 404; a percent-encoded closed word
 *       ANSWERED as that word; a well-formed id naming nothing 200 with no
 *       rows and `omitted` 0; `/v1/sessions/` 404; a `/v1/blocked` signature
 *       replayed on `/v1/sessions` 404; and the door's log holds the word
 *       `route`
 *   Q3  200 list reads from the node phone while the probe removes 50 ended
 *       sessions through the bridge: no id twice in an answer, no count
 *       disagreeing with its rows, and no session in an answer main composed
 *       (`at`) after its removal answered here
 *   Q4  the route's time at 2,000 rows: the median request-to-answer at the
 *       node phone over 20 reads, less the median of a control read that
 *       composes nothing (`/v1/session` for an id nothing holds), is main's
 *       composing time; ABOVE 250 ms IT FAILS, which is SPEC D4's fallback
 *       (the row cap drops to 1,000 in the fix round)
 *   Q5  `/v1/blocked` answers the parent's shape: its keys, the waiting rows,
 *       `others` capped at 200 and `othersOmitted` the rest
 *   Q6  the confirm lines read `Answers these and nothing else: blocked,
 *       choose, end, pair, say, session, sessions, turns` before Allow (eight
 *       routes: Phase 318's two writes landed first); after a parent run on
 *       this profile the agreement reads `changed`, and on a fresh profile
 *       anything but `confirmed`
 *   Q7  the app.log text written while the door was open holds no query value
 *       Q2 sent, and the door's own lines (scope `pocket`, or its utility
 *       process) no seeded session name and no seeded folder
 *   PARENT  with P3167_PARENT_CHECKOUT: `/v1/sessions` answers 404, and
 *       `/v1/blocked` reads 200 others and `othersOmitted` the rest
 *   RUN both preflights, the quiet agents at every launch, no real Tailscale,
 *       nothing forbidden at the stand-in, every stand-in ended
 *
 * WHAT IT REFUSES TO DO. It never names the person's tmux server or `-L gmux`
 * (it refuses any socket that is not a `gmux-p3167` harness socket), never
 * binds a real interface and dials nothing but 127.0.0.1, never runs a real
 * `tailscale`, never asks real DNS, reads no keychain and no credential of
 * his (the app runs `--use-mock-keychain`), NEVER READS HIS MANIFEST (the
 * world is seed-sessions.mts', SPEC §15 F20), and signals no process at all:
 * the stand-ins are ended by their own helper. It takes NO screenshot. Before
 * EVERY launch the profile's agents.json renames the Gemini, Qwen,
 * Antigravity, Grok and Droid binaries and `agents:list` is read back, so no
 * agent's `--version` runs.
 *
 * VERIFIERS ONLY: it starts an Electron. Take the orchestrator's lock.
 *
 *   npm run build && npm run -s probe:p3167
 *   P3167_PARENT_CHECKOUT=<a BUILT da1138de checkout> npm run -s probe:p3167
 *   P3167_KEEP=1                 keep the scratch world, with every answer Q1
 *                                read in <run>/answers/, for the verifier's
 *                                re-derivation (SPEC §9.6)
 *   node build/p3167/probe-p3167.mjs --grader-self-test   every grader on its fixtures; starts nothing
 *
 * Exit 0 when every arm passed, 1 when one failed, 2 when it could not run or
 * an arm could not be READ.
 */

import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { withElectron, withoutDevRenderer } from '../electron-run.mjs';
import { cdpEval, wsConnect } from '../cdp-client.mjs';
import { pickRendererTarget } from '../cdp-target.mjs';
import { gradeFixtures } from '../probe-graders.mjs';
import { keyscanText } from '../ssh-run.mjs';
import { tsxCli } from '../ts-runner.mjs';
import {
  ANSWER_MAX_BYTES,
  SESSIONS_BUDGET_BYTES,
  SESSIONS_GROUP,
  SESSIONS_MAX_ROWS,
  SESSIONS_SHOW,
  SESSIONS_SORT,
  askedOf,
  makePhone,
  pairThrough,
  readOffer,
  readSessions,
  request,
  sessionsAnswerProblems,
  sessionsBudgetBytes,
  sessionsTarget,
  signedGet,
  signedHeaders
} from '../p316/node-phone.mjs';
import { DEFAULT_SCENARIO, endStandinProcesses, makeStandin, preflightStandin, processRows, watchForRealTailscale } from '../p330/tailscale-standin.mjs';
import { NAME_SERVERS_VAR, loopbackOnlyServers, makeDnsStandin, quietAgentsHeld, writeQuietAgents } from '../p332/dns-standin.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const J = JSON.stringify;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// What the run holds the app against, BY VALUE
// ---------------------------------------------------------------------------

/**
 * The route list HEAD's door is confirmed over: eight routes, this phase's
 * `sessions` beside Phase 318's `choose` and `say`, which landed first
 * (build/p3167/SPEC.md §12 and the replay's fix round).
 */
export const ROUTE_LINE = 'Answers these and nothing else: blocked, choose, end, pair, say, session, sessions, turns';
/** The parent's line: main before this phase, seven routes and no `sessions`. */
export const PARENT_ROUTE_LINE = 'Answers these and nothing else: blocked, choose, end, pair, say, session, turns';
export const ROUTE_PREFIX = 'Answers these and nothing else:';
export const MACHINE_ID = 'p3167far';
export const MACHINE_LABEL = 'p3167 loopback';
/** The keys a `/v1/blocked` answer carries at the parent (src/main/pocket/routes.ts `blocked()`, c1a5fd38 and da1138de alike). */
export const BLOCKED_KEYS = Object.freeze(['rows', 'others', 'othersOmitted', 'at', 'emptyLine', 'ageNote']);
export const OTHERS_MAX = 200;
/** SPEC D4: above this median, main's composing time sends the row cap to 1,000 in the fix round. */
export const Q4_LIMIT_MS = 250;
/** The closed-tab name seed-sessions.mts puts on a folder's second member (its `CLOSED_TAB_NAME`). */
export const CLOSED_TAB_NAME = 'Payments service';
export const LIVE = Object.freeze(['running', 'idle', 'needs_input']);

/** This file's own reading of the lifecycle partition (D8), from main's statuses: never the door's. */
export function keptBy(show, status) {
  const active = LIVE.includes(status) || status === 'unknown';
  const ended = status === 'exited' || status === 'restorable';
  return show === 'all' ? status !== 'discarded' : show === 'active' ? active : ended;
}
/** The machine a listed session is on, as the query names it: `local` for this Mac. */
export const machineOf = (s) => s?.machine?.id ?? 'local';

/**
 * The Q2 query set (SPEC §8.2), each a raw target and what the door must
 * answer. Every refused one 404s with no body; the two well-formed ones
 * answer 200. `needle` is what Q7 looks for in app.log afterwards: the query
 * as sent, or a value distinctive enough to be found nowhere else.
 */
export function hostileQueries() {
  const id33 = `a${'b'.repeat(32)}`;
  const q = (what, target, extra = {}) => ({ what, target, want: 404, needle: target.slice(target.indexOf('?') + 1), ...extra });
  const rows = [
    q('Show cased', '/v1/sessions?show=Active'),
    q('Group by cased', '/v1/sessions?group=Project'),
    q('Sort by cased', '/v1/sessions?sort=Recent'),
    q('a word doubled', '/v1/sessions?show=active&show=ended'),
    q('an empty word', '/v1/sessions?show='),
    q('a key with no value', '/v1/sessions?show'),
    q('an unknown parameter', '/v1/sessions?limit=31670'),
    q('a percent-encoded non-word', '/v1/sessions?show=%41ctive'),
    q('a NUL after a word', '/v1/sessions?show=active%00'),
    q('a target past the door\'s 1,024-character bound', `/v1/sessions?show=active&agent=${'a'.repeat(2_000)}`, { needle: 'a'.repeat(2_000) }),
    q('a 10 KB target', `/v1/sessions?show=active&agent=${'z'.repeat(10_000)}`, { needle: 'z'.repeat(10_000), wantNot200: true }),
    q('an agent id in capitals', '/v1/sessions?agent=Claude'),
    q('an agent id starting with a digit', '/v1/sessions?agent=9x'),
    q('an agent id of 33 characters', `/v1/sessions?agent=${id33}`, { needle: id33 }),
    q('an agent id with a slash', '/v1/sessions?agent=a%2Fb'),
    q('an agent id of two dots', '/v1/sessions?agent=..'),
    q('a machine id in capitals', '/v1/sessions?machine=Claude'),
    q('a machine id starting with a digit', '/v1/sessions?machine=9x'),
    q('a machine id of 33 characters', `/v1/sessions?machine=${id33}`, { needle: id33 }),
    q('a machine id with a slash', '/v1/sessions?machine=a%2Fb'),
    q('a machine id of two dots', '/v1/sessions?machine=..'),
    q('a trailing slash on the path', '/v1/sessions/'),
    { what: 'a percent-encoded closed word, answered as that word', target: '/v1/sessions?show=%61ctive', want: 200, asked: { show: 'active' }, needle: 'show=%61ctive' },
    { what: 'a well-formed id that names nothing', target: '/v1/sessions?agent=nobody3167', want: 200, asked: { agent: 'nobody3167' }, empty: true, needle: 'nobody3167' },
    { what: 'a /v1/blocked signature replayed on /v1/sessions', target: '/v1/sessions', want: 404, replay: true, needle: null }
  ];
  return rows;
}

/** Whether one Q2 reading is what its row wants. */
export function queryCase(row, reading) {
  if (row.want === 404) return row.wantNot200 === true ? reading.status !== 200 && reading.body === '' : reading.status === 404 && reading.body === '';
  if (reading.status !== 200 || reading.answer === null) return false;
  if (sessionsAnswerProblems(reading.answer, askedOf(row.asked ?? {})).length > 0) return false;
  return row.empty !== true || (reading.answer.rows.length === 0 && reading.answer.omitted === 0);
}

const median = (xs) => {
  const s = [...xs].filter((x) => typeof x === 'number').sort((a, b) => a - b);
  return s.length === 0 ? null : s[Math.floor(s.length / 2)];
};

/**
 * Q1's reading of ONE answer, by this file's rules over main's own list:
 * `listed` is main's sessions (`sessions.list()`), `query` the words sent.
 * Answers the problems; [] is an answer Q1 passes.
 */
export function q1Problems({ query, status, answer, wireBytes, listed, waitingIds }) {
  const problems = [];
  if (status !== 200 || answer === null) return [`${sessionsTarget(query)} answered ${String(status)}`];
  for (const p of sessionsAnswerProblems(answer, askedOf(query))) problems.push(`refused by the phone's rules: ${p}`);
  if (answer.rows.length > SESSIONS_MAX_ROWS) problems.push(`${String(answer.rows.length)} rows, past the cap`);
  const budget = sessionsBudgetBytes(answer);
  if (budget > SESSIONS_BUDGET_BYTES) problems.push(`the rows and groups take ${String(budget)} bytes, past the budget`);
  if (wireBytes > ANSWER_MAX_BYTES) problems.push(`${String(wireBytes)} bytes on the wire, past what the phone reads`);
  if (answer.total !== listed.length) problems.push(`total ${String(answer.total)} is not main's ${String(listed.length)} listed sessions`);
  const kept = listed.filter((s) => keptBy(query.show ?? 'active', s.status) && (query.agent == null || s.agent === query.agent) && (query.machine == null || machineOf(s) === query.machine));
  // The rows plus the omitted are what the words keep. The groups' counts sum
  // to that too, unless the caps left out every row of a project, which is
  // then in no group (SPEC "§As built"); and the phone's rules above already
  // hold each count to its drawn rows plus its omitted, with the groups'
  // omitted never above the answer's, so the counts can never sum to more and
  // this one comparison is the whole check.
  if (answer.rows.length + answer.omitted !== kept.length) problems.push(`the rows plus the omitted are ${String(answer.rows.length + answer.omitted)}, and main's list keeps ${String(kept.length)} under these words`);
  const keptIds = new Set(kept.map((s) => s.id));
  for (const r of answer.rows) if (!keptIds.has(r.sessionId)) problems.push(`row ${r.sessionId} is not one these words keep`);
  for (const id of waitingIds) {
    if (!keptIds.has(id)) continue;
    const row = answer.rows.find((r) => r.sessionId === id);
    if (row === undefined) problems.push(`the waiting session ${id} is kept by these words and NOT drawn (§15 F2)`);
    else if (answer.groups[row.group]?.waiting !== true) problems.push(`the waiting session's group reads waiting ${J(answer.groups[row.group]?.waiting)} (§15 F3)`);
  }
  const byId = new Map(listed.map((s) => [s.id, s]));
  if ((query.show ?? 'active') !== 'all' && answer.groups.some((g) => g.collapsed)) problems.push('a group is collapsed under a Show that is not All');
  if ((query.show ?? 'active') === 'all' && answer.omitted === 0) {
    answer.groups.forEach((g, k) => {
      const anyActive = answer.rows.some((r) => r.group === k && keptBy('active', byId.get(r.sessionId)?.status));
      if (g.collapsed === anyActive) problems.push(`group ${g.id} reads collapsed ${String(g.collapsed)} with ${anyActive ? 'an' : 'no'} active row`);
    });
  }
  for (const r of answer.rows) {
    const s = byId.get(r.sessionId);
    if (s !== undefined && !(s.createdAt > 0) && r.ageText !== null && !LIVE.includes(s.status)) problems.push(`row ${r.sessionId} has no creation clock and reads the age ${J(r.ageText)}`);
    if ((query.sort ?? 'recent') === 'oldest' && r.ageText !== null && !r.ageText.endsWith(' old')) problems.push(`row ${r.sessionId} under Oldest first reads ${J(r.ageText)}, not a creation age`);
  }
  return problems;
}

/**
 * Q1's reading ACROSS answers: one group reads the same under every choice,
 * a folder is sent exactly when another group shares its label and machine,
 * the closed tab's name labels its group, and the three `app` groups are
 * distinct (§15 F10). `groupsSeen` maps a group id to every reading of it.
 */
export function q1Across({ groupsSeen, allProject }) {
  const problems = [];
  const union = new Map();
  for (const [id, readings] of groupsSeen) {
    const first = readings[0];
    for (const g of readings) {
      if (g.label !== first.label || g.machine !== first.machine || g.folder !== first.folder) problems.push(`group ${id} reads ${J([g.label, g.machine, g.folder])} in one answer and ${J([first.label, first.machine, first.folder])} in another`);
    }
    union.set(id, first);
  }
  for (const [id, g] of union) {
    const twin = [...union].some(([other, h]) => other !== id && h.label === g.label && h.machine === g.machine);
    if ((g.folder !== null) !== twin) problems.push(`group ${id} (${J(g.label)}) ${g.folder === null ? 'carries no folder although another group shares its label and machine' : 'carries a folder although no other group shares its label and machine'}`);
  }
  const apps = [...union.values()].filter((g) => g.label === 'app');
  const localApps = apps.filter((g) => g.machine === null && typeof g.folder === 'string' && g.folder !== '');
  const remoteApps = apps.filter((g) => g.machine === MACHINE_LABEL && g.folder === null);
  if (apps.length !== 3 || localApps.length !== 2 || remoteApps.length !== 1 || localApps[0]?.folder === localApps[1]?.folder) problems.push(`the app groups are ${J(apps.map((g) => [g.machine, g.folder]))}, not two local ones each with its own folder and the loopback machine's with its badge and no folder`);
  if (![...union.values()].some((g) => g.label === CLOSED_TAB_NAME)) problems.push(`no group is labelled ${J(CLOSED_TAB_NAME)}, the closed tab's name its folder's second member carries (§15 F12)`);
  if (allProject !== null && allProject.groups.some((g) => g.label === '' )) problems.push('a group with an empty label');
  return problems;
}

/**
 * Q1's `apps` reading, from every group the answers named (`groupsSeen`, a
 * group id to its readings): how many local `app` groups carry a folder,
 * whether the loopback machine's `app` group was seen, and ITS folder AS SENT.
 * Only an absent group reads the sentence. The fix round (2026-10-03) took
 * this out of the arm: it wrote `remoteApp?.folder ?? '…'`, and `??` turned
 * the correct null into the sentence, so Q1 failed on every honest run while
 * the self-test, which set `apps` by hand, stayed green.
 */
export function appsReading(groupsSeen) {
  const union = new Map([...groupsSeen].map(([id, readings]) => [id, readings[0]]));
  const apps = [...union.values()].filter((g) => g.label === 'app');
  const remoteApp = apps.find((g) => g.machine === MACHINE_LABEL) ?? null;
  return {
    local: apps.filter((g) => g.machine === null && g.folder !== null).length,
    remote: remoteApp === null ? 0 : 1,
    remoteFolder: remoteApp === null ? 'no remote app group' : remoteApp.folder
  };
}

/** The answers Q3 read, judged: no id twice, every count its rows, nothing composed after its removal answered. */
export function q3Problems({ reads, removedAt }) {
  const problems = [];
  for (const r of reads) {
    if (r.status !== 200 || r.answer === null) {
      problems.push(`a read answered ${String(r.status)}${r.error ? ` (${r.error})` : ''}`);
      continue;
    }
    for (const p of sessionsAnswerProblems(r.answer, askedOf(r.query))) problems.push(`an answer at ${String(r.answer.at)}: ${p}`);
    for (const row of r.answer.rows) {
      const at = removedAt.get(row.sessionId);
      if (at !== undefined && r.answer.at > at) problems.push(`${row.sessionId} is in an answer composed at ${String(r.answer.at)}, after its removal answered at ${String(at)}`);
    }
  }
  return problems;
}

// ---------------------------------------------------------------------------
// The graders: pure, over a recorded reading, each clause shown to fail
// ---------------------------------------------------------------------------

export const GRADERS = {
  Q1: {
    title: 'every combination and each filter, each answer drawn and bounded, the groups one rule with the Mac',
    clauses: [
      ['every combination and filter was read', (r) => r.combinations >= 18 && r.read === r.combinations],
      ['each answer passes the phone\'s rules, the caps and main\'s own list', (r) => r.problems.length === 0],
      ['a group reads the same in every answer, and its folder only beside a twin', (r) => r.across.length === 0],
      ['the cap was met: some answer left rows out, and kept the waiting session', (r) => r.maxOmitted > 0 && r.waitingSeen === true],
      ['the three app groups are distinct, the loopback machine\'s with no folder', (r) => r.apps.local === 2 && r.apps.remote === 1 && r.apps.remoteFolder === null]
    ]
  },
  Q2: {
    title: 'the hostile query set, each refused or answered on its own terms, the log naming the word route',
    clauses: [
      ['every refused query answered 404 with no body', (r) => r.cases.filter((c) => c.want === 404).every((c) => c.ok)],
      ['the percent-encoded closed word and the id naming nothing were answered', (r) => r.cases.filter((c) => c.want === 200).length === 2 && r.cases.filter((c) => c.want === 200).every((c) => c.ok)],
      ['the door\'s log names the word route', (r) => r.routeLogged === true],
      ['the door answered an honest read after the set', (r) => r.control === 200]
    ]
  },
  Q3: {
    title: '200 reads while 50 sessions are removed: no id twice, no count off, nothing back after its removal',
    clauses: [
      ['200 reads and 50 removals ran, side by side', (r) => r.reads === 200 && r.removed === 50 && r.overlapped === true],
      ['every answer holds together and nothing removed comes back', (r) => r.problems.length === 0]
    ]
  },
  Q4: {
    title: 'main composes 2,000 rows inside SPEC D4\'s 250 ms',
    clauses: [
      ['the reads were timed', (r) => typeof r.sessionsMs === 'number' && typeof r.controlMs === 'number' && r.rows >= SESSIONS_MAX_ROWS],
      ['the median composing time is inside 250 ms (else D4\'s fallback: the cap drops to 1,000)', (r) => r.sessionsMs - r.controlMs <= Q4_LIMIT_MS]
    ]
  },
  Q5: {
    title: '/v1/blocked keeps the parent\'s shape',
    clauses: [
      ['its keys are the parent\'s', (r) => J(r.keys) === J(BLOCKED_KEYS)],
      ['the waiting rows are main\'s waiting sessions', (r) => r.waitingRows === r.waitingMain],
      ['others is capped at 200 and othersOmitted is the rest', (r) => r.others === Math.min(OTHERS_MAX, r.listed - r.waitingRows) && r.othersOmitted === r.listed - r.waitingRows - r.others]
    ]
  },
  Q6: {
    title: 'the door asks again over eight routes',
    clauses: [
      ['the lines read before Allow name the eight routes', (r) => r.lines.includes(ROUTE_LINE)],
      ['the agreement read changed after the parent confirmed it, and anything but confirmed on a fresh profile', (r) => (r.parentRanFirst ? r.confirmStateBefore === 'changed' : r.confirmStateBefore !== 'confirmed')],
      ['Allow listened', (r) => r.listening === true]
    ]
  },
  Q7: {
    title: 'what the door logged holds no session name, folder or query value',
    clauses: [
      ['app.log was read over the door\'s life', (r) => r.read === true && r.characters > 0],
      ['no seeded session name in it', (r) => r.names === 0],
      ['no seeded folder in it', (r) => r.folders === 0],
      ['no query value Q2 sent in it', (r) => r.queries === 0]
    ]
  },
  PARENT: {
    title: 'the parent has no sessions route and caps its others at 200',
    clauses: [
      ['/v1/sessions answers 404', (r) => r.sessions === 404],
      ['/v1/blocked answers 200 others and othersOmitted the rest', (r) => r.blocked === 200 && r.others === Math.min(OTHERS_MAX, r.listed - r.waiting) && r.othersOmitted === r.listed - r.waiting - r.others],
      ['the parent\'s lines name no sessions route', (r) => r.lines.some((l) => l.startsWith(ROUTE_PREFIX)) && !r.lines.some((l) => l.startsWith(ROUTE_PREFIX) && l.includes('sessions'))]
    ]
  },
  RUN: {
    title: 'no real Tailscale, no real DNS, no agent, nothing left',
    clauses: [
      ['the Tailscale preflight passed', (r) => r.tailscalePreflight === true],
      ['the DNS preflight passed at every launch', (r) => r.dnsPreflights.length > 0 && r.dnsPreflights.every(Boolean)],
      ['the quiet agents held at every launch', (r) => r.agentsHeld.length > 0 && r.agentsHeld.every(Boolean)],
      ['the world was seeded through the shipping store', (r) => r.seeded === true],
      ['no real Tailscale in any sample', (r) => r.realTailscale === 0 && r.samples > 0],
      ['nothing forbidden reached the stand-in', (r) => r.forbidden === 0],
      ['every stand-in ended', (r) => r.standinLeft === 0]
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

/** Each grader's honest reading, and one break per clause (build/probe-graders.mjs). */
export const GRADER_FIXTURES = {
  Q1: {
    pass: { combinations: 162, read: 162, problems: [], across: [], maxOmitted: 15, waitingSeen: true, apps: { local: 2, remote: 1, remoteFolder: null } },
    breaks: {
      'every combination and filter was read': (r) => void (r.read = 161),
      'each answer passes the phone\'s rules, the caps and main\'s own list': (r) => void (r.problems = ['show=all&group=project&sort=recent: the counts sum to 2015, and main\'s list keeps 2016 under these words']),
      'a group reads the same in every answer, and its folder only beside a twin': (r) => void (r.across = ['group X carries a folder although no other group shares its label and machine']),
      'the cap was met: some answer left rows out, and kept the waiting session': (r) => void (r.maxOmitted = 0),
      'the three app groups are distinct, the loopback machine\'s with no folder': (r) => void (r.apps.remoteFolder = '/tmp/p3167/remote/app')
    },
    refused: [
      // §15 F2: a waiting row cut under a cap while idle rows are drawn.
      { what: 'a waiting session no answer drew', clause: 'the cap was met: some answer left rows out, and kept the waiting session', edit: (r) => void (r.waitingSeen = false) },
      // §15 F10: the spec's first reading wanted a folder on all three.
      { what: 'three app groups each carrying a folder (the reading §15 F10 corrected)', clause: 'the three app groups are distinct, the loopback machine\'s with no folder', edit: (r) => void Object.assign(r.apps, { remote: 0, remoteFolder: '/srv/app' }) }
    ]
  },
  Q2: {
    pass: { cases: [{ want: 404, ok: true }, { want: 404, ok: true }, { want: 200, ok: true }, { want: 200, ok: true }], routeLogged: true, control: 200 },
    breaks: {
      'every refused query answered 404 with no body': (r) => void (r.cases[0].ok = false),
      'the percent-encoded closed word and the id naming nothing were answered': (r) => void (r.cases[2].ok = false),
      'the door\'s log names the word route': (r) => void (r.routeLogged = false),
      'the door answered an honest read after the set': (r) => void (r.control = 0)
    }
  },
  Q3: {
    pass: { reads: 200, removed: 50, overlapped: true, problems: [] },
    breaks: {
      '200 reads and 50 removals ran, side by side': (r) => void (r.overlapped = false),
      'every answer holds together and nothing removed comes back': (r) => void (r.problems = ['x is in an answer composed at 2, after its removal answered at 1'])
    }
  },
  Q4: {
    pass: { sessionsMs: 120, controlMs: 20, blockedMs: 70, rows: 2000 },
    breaks: {
      'the reads were timed': (r) => void (r.sessionsMs = null),
      'the median composing time is inside 250 ms (else D4\'s fallback: the cap drops to 1,000)': (r) => void (r.sessionsMs = 400)
    }
  },
  Q5: {
    pass: { keys: [...BLOCKED_KEYS], waitingRows: 1, waitingMain: 1, others: 200, othersOmitted: 1815, listed: 2016 },
    breaks: {
      'its keys are the parent\'s': (r) => void r.keys.push('groups'),
      'the waiting rows are main\'s waiting sessions': (r) => void (r.waitingRows = 0),
      'others is capped at 200 and othersOmitted is the rest': (r) => void (r.others = 2015)
    }
  },
  Q6: {
    pass: { lines: ['Publishes https://x.ts.net:8443', ROUTE_LINE], parentRanFirst: true, confirmStateBefore: 'changed', listening: true },
    breaks: {
      'the lines read before Allow name the eight routes': (r) => void (r.lines = [PARENT_ROUTE_LINE]),
      'the agreement read changed after the parent confirmed it, and anything but confirmed on a fresh profile': (r) => void (r.confirmStateBefore = 'confirmed'),
      'Allow listened': (r) => void (r.listening = false)
    },
    refused: [{ what: 'a fresh profile that read confirmed before any Allow', clause: 'the agreement read changed after the parent confirmed it, and anything but confirmed on a fresh profile', edit: (r) => void Object.assign(r, { parentRanFirst: false, confirmStateBefore: 'confirmed' }) }]
  },
  Q7: {
    pass: { read: true, characters: 4096, names: 0, folders: 0, queries: 0 },
    breaks: {
      'app.log was read over the door\'s life': (r) => void (r.read = false),
      'no seeded session name in it': (r) => void (r.names = 1),
      'no seeded folder in it': (r) => void (r.folders = 1),
      'no query value Q2 sent in it': (r) => void (r.queries = 1)
    }
  },
  PARENT: {
    pass: { sessions: 404, blocked: 200, others: 200, othersOmitted: 1815, listed: 2016, waiting: 1, lines: [PARENT_ROUTE_LINE] },
    breaks: {
      '/v1/sessions answers 404': (r) => void (r.sessions = 200),
      '/v1/blocked answers 200 others and othersOmitted the rest': (r) => void (r.othersOmitted = 0),
      'the parent\'s lines name no sessions route': (r) => void (r.lines = [ROUTE_LINE])
    }
  },
  RUN: {
    pass: { tailscalePreflight: true, dnsPreflights: [true, true], agentsHeld: [true, true], seeded: true, realTailscale: 0, samples: 600, forbidden: 0, standinLeft: 0 },
    breaks: {
      'the Tailscale preflight passed': (r) => void (r.tailscalePreflight = false),
      'the DNS preflight passed at every launch': (r) => void (r.dnsPreflights = [true, false]),
      'the quiet agents held at every launch': (r) => void (r.agentsHeld = []),
      'the world was seeded through the shipping store': (r) => void (r.seeded = false),
      'no real Tailscale in any sample': (r) => void (r.realTailscale = 1),
      'nothing forbidden reached the stand-in': (r) => void (r.forbidden = 1),
      'every stand-in ended': (r) => void (r.standinLeft = 1)
    }
  }
};

/** Every grader on its fixtures, and the pure readers on cases of their own. Starts nothing. */
function graderSelfTest() {
  let failures = 0;
  const say = (ok, text) => {
    if (!ok) failures += 1;
    process.stdout.write(`${ok ? 'ok  ' : 'FAIL'} ${text}\n`);
  };
  const clauses = gradeFixtures({ graders: GRADERS, fixtures: GRADER_FIXTURES, grade, clone: (x) => structuredClone(x), say, J });
  // ROUTE_LINE against the tree's own POCKET_ROUTE_IDS, so a phase that adds a route turns this self-test red
  // rather than the live confirm arm (the replay of 316.7 beside 318 left this line naming one route too few).
  const treeIds = [...(/POCKET_ROUTE_IDS = \[([\s\S]*?)\] as const/.exec(readFileSync(join(ROOT, 'src', 'shared', 'ipc', 'pocket.ts'), 'utf8'))?.[1] ?? '').replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/'([a-z]+)'/g)].map((m) => m[1]).sort();
  say(treeIds.length > 0 && J(ROUTE_LINE.slice(ROUTE_LINE.indexOf(':') + 1).split(',').map((s) => s.trim())) === J(treeIds), `ROUTE_LINE names exactly the tree's POCKET_ROUTE_IDS (${treeIds.join(', ')})`);
  // This file's own partition and machine reading.
  say(keptBy('active', 'unknown') && keptBy('active', 'needs_input') && !keptBy('active', 'restorable') && keptBy('ended', 'exited') && !keptBy('ended', 'idle') && keptBy('all', 'exited') && !keptBy('all', 'discarded'), 'keptBy: Active is live or unknown, Ended exited or restorable, All every listed session');
  say(machineOf({}) === 'local' && machineOf({ machine: { id: 'far' } }) === 'far', 'machineOf: local for this Mac, the machine id elsewhere');
  // Q1 over a small honest answer, and its breaks.
  const listed = [
    { id: 'w', status: 'needs_input', agent: 'claude', createdAt: 5 },
    { id: 'a', status: 'idle', agent: 'shell', createdAt: 4 },
    { id: 'e', status: 'exited', agent: 'codex', createdAt: 0 }
  ];
  const row = (id, group, extra = {}) => ({ sessionId: id, name: id, group, machine: null, statusDot: 'idle', statusTitle: 'Idle', ageText: '3d old', waiting: id === 'w', question: null, end: { state: 'none' }, ...extra });
  const group = (id, count, extra = {}) => ({ id, label: id, machine: null, folder: null, count, omitted: 0, waiting: false, collapsed: false, ...extra });
  const honest = {
    asked: { show: 'all', group: 'project', sort: 'oldest', agent: null, machine: null },
    rows: [row('w', 0), row('a', 0), row('e', 1, { ageText: null })],
    groups: [group('g1', 2, { waiting: true }), group('g2', 1, { collapsed: true })],
    agents: [],
    machines: [],
    total: 3,
    omitted: 0,
    at: 1,
    ageNote: ''
  };
  const base = { query: { show: 'all', group: 'project', sort: 'oldest' }, status: 200, answer: honest, wireBytes: 900, listed, waitingIds: ['w'] };
  say(q1Problems(base).length === 0, `q1Problems passes an honest answer (${J(q1Problems(base))})`);
  const broken = (fn) => {
    const r = structuredClone(base);
    fn(r);
    return q1Problems(r).length > 0;
  };
  say(broken((r) => r.answer.rows.splice(0, 1, row('a', 0))), 'q1Problems refuses a row twice');
  say(broken((r) => (r.answer.groups[0].waiting = false)), 'q1Problems refuses a waiting session\'s group not marked waiting (§15 F3)');
  say(broken((r) => { r.answer.rows.shift(); r.answer.groups[0].count = 1; r.answer.groups[0].waiting = false; }), 'q1Problems refuses an answer that dropped the waiting session (§15 F2)');
  say(broken((r) => (r.answer.total = 4)), 'q1Problems refuses a total that is not main\'s listed count');
  say(broken((r) => (r.answer.groups[1].collapsed = false)), 'q1Problems refuses an all-ended group not collapsed under All (D8)');
  say(broken((r) => (r.answer.rows[2].ageText = '20728d old')), 'q1Problems refuses an age on a row with no creation clock (D11)');
  say(broken((r) => (r.answer.rows[1].ageText = '4m')), 'q1Problems refuses an output age under Oldest first');
  say(broken((r) => (r.listed = r.listed.slice(0, 2))), 'q1Problems refuses counts that do not sum to what main\'s list keeps');
  say(broken((r) => (r.answer.asked.sort = 'name')), 'q1Problems refuses an answer to another question');
  // One case per clause of q1Problems, each breaking that clause alone.
  {
    const many = (n, extra = {}) => ({
      query: { show: 'all', group: 'project', sort: 'oldest' },
      status: 200,
      wireBytes: 1_000,
      listed: Array.from({ length: n }, (_, k) => ({ id: `s${String(k)}`, status: 'idle', agent: 'shell', createdAt: 5 })),
      waitingIds: [],
      answer: {
        asked: { show: 'all', group: 'project', sort: 'oldest', agent: null, machine: null },
        rows: Array.from({ length: n }, (_, k) => row(`s${String(k)}`, 0)),
        groups: [group('g1', n)],
        agents: [],
        machines: [],
        total: n,
        omitted: 0,
        at: 1,
        ageNote: ''
      },
      ...extra
    });
    say(q1Problems(many(SESSIONS_MAX_ROWS + 1)).some((p) => p.includes('past the cap')), 'q1Problems refuses more rows than the cap');
    const fat = many(10);
    for (const r of fat.answer.rows) r.name = 'x'.repeat(120_000);
    say(q1Problems(fat).length === 1 && q1Problems(fat)[0].includes('past the budget'), 'q1Problems refuses rows and groups past the byte budget, and only that');
    say(J(q1Problems(many(3, { wireBytes: ANSWER_MAX_BYTES + 1 })).map((p) => p.includes('on the wire'))) === '[true]', 'q1Problems refuses an answer past what the phone reads, and only that');
    const notKept = structuredClone(base);
    notKept.query = { show: 'active', group: 'project', sort: 'oldest' };
    notKept.answer.asked.show = 'active';
    notKept.answer.rows = [row('w', 0), row('e', 0, { ageText: null })];
    notKept.answer.groups = [group('g1', 2, { waiting: true })];
    say(J(q1Problems(notKept).map((p) => p.includes('is not one these words keep'))) === '[true]', 'q1Problems refuses a row the words do not keep, and only that');
    const waitingCut = structuredClone(base);
    waitingCut.answer.rows = [row('a', 0), row('e', 1, { ageText: null })];
    waitingCut.answer.groups = [group('g1', 2, { omitted: 1 }), group('g2', 1, { collapsed: true })];
    waitingCut.answer.omitted = 1;
    say(J(q1Problems(waitingCut).map((p) => p.includes('NOT drawn'))) === '[true]', 'q1Problems refuses a kept waiting session the caps left out, and only that (§15 F2)');
    const unmarked = structuredClone(base);
    unmarked.answer.rows[0].waiting = false;
    unmarked.answer.groups[0].waiting = false;
    say(J(q1Problems(unmarked).map((p) => p.includes('group reads waiting'))) === '[true]', 'q1Problems refuses main\'s waiting session in a group not marked waiting, and only that (§15 F3)');
    const uncounted = structuredClone(base);
    uncounted.listed.push({ id: 'x', status: 'idle', agent: 'shell', createdAt: 3 });
    uncounted.answer.total = 4;
    say(J(q1Problems(uncounted).map((p) => p.includes('the rows plus the omitted are'))) === '[true]', 'q1Problems refuses an answer that leaves out a session the words keep, and only that');
    const collapsedActive = structuredClone(base);
    collapsedActive.query = { show: 'active', group: 'project', sort: 'oldest' };
    collapsedActive.answer.asked.show = 'active';
    collapsedActive.answer.rows = collapsedActive.answer.rows.slice(0, 2);
    collapsedActive.answer.groups = [group('g1', 2, { waiting: true, collapsed: true })];
    say(J(q1Problems(collapsedActive).map((p) => p.includes('collapsed under a Show'))) === '[true]', 'q1Problems refuses a collapsed group under a Show that is not All, and only that (D8)');
  }
  // q1Across.
  const g = (label, machine, folder) => ({ label, machine, folder });
  const seen = new Map([
    ['l1', [g('app', null, '~/one/app')]],
    ['l2', [g('app', null, '~/two/app')]],
    ['r1', [g('app', MACHINE_LABEL, null)]],
    ['c1', [g(CLOSED_TAB_NAME, null, null)]]
  ]);
  say(q1Across({ groupsSeen: seen, allProject: null }).length === 0, `q1Across passes the honest groups (${J(q1Across({ groupsSeen: seen, allProject: null }))})`);
  const across = (fn) => {
    const m = new Map([...seen].map(([k, v]) => [k, structuredClone(v)]));
    fn(m);
    return q1Across({ groupsSeen: m, allProject: null }).length > 0;
  };
  say(across((m) => (m.get('r1')[0].folder = '/srv/app')), 'q1Across refuses a folder on the loopback machine\'s app group (§15 F10)');
  say(across((m) => (m.get('l1')[0].folder = null)), 'q1Across refuses a local app group without its folder');
  say(across((m) => m.get('l1').push(g('app', null, '~/elsewhere'))), 'q1Across refuses a group that reads differently in two answers');
  say(across((m) => m.delete('c1')), 'q1Across refuses a world whose closed tab names no group (§15 F12)');
  say(across((m) => (m.get('c1')[0].folder = '~/x')), 'q1Across refuses a folder on a group with no twin');
  say(J(q1Across({ groupsSeen: new Map([...seen, ['l3', [g('app', null, '~/three/app')]]]), allProject: null })) !== '[]' && q1Across({ groupsSeen: new Map([...seen, ['l3', [g('app', null, '~/three/app')]]]), allProject: null }).every((p) => p.includes('the app groups are')), 'q1Across refuses a fourth app group, and only for that');
  say(J(q1Across({ groupsSeen: seen, allProject: { groups: [{ label: '' }] } })) === J(['a group with an empty label']), 'q1Across refuses a group with an empty label');
  // Q1's apps reading, built from a recorded union exactly as the arm builds
  // it (the fix round: the arm's own `??` read a null folder as the sentence,
  // and a fixture that set `apps` by hand could never see it).
  {
    const withApps = (apps) => ({ ...structuredClone(GRADER_FIXTURES.Q1.pass), apps });
    const honestApps = appsReading(seen);
    say(J(honestApps) === J({ local: 2, remote: 1, remoteFolder: null }), `appsReading reads the loopback machine's app group with its folder null (${J(honestApps)})`);
    say(grade('Q1', withApps(honestApps)).ok, `Q1 passes the apps reading of an honest recorded union (${J(grade('Q1', withApps(honestApps)).failed)})`);
    const noRemote = appsReading(new Map([...seen].filter(([id]) => id !== 'r1')));
    say(noRemote.remote === 0 && noRemote.remoteFolder === 'no remote app group' && !grade('Q1', withApps(noRemote)).ok, 'appsReading says so when no loopback app group was seen, and Q1 is red on it');
    const foldered = appsReading(new Map([...seen, ['r1', [g('app', MACHINE_LABEL, '/srv/app')]]]));
    say(foldered.remoteFolder === '/srv/app' && !grade('Q1', withApps(foldered)).ok, 'appsReading reads a folder sent on the loopback app group as sent, and Q1 is red on it (§15 F10)');
  }
  // Q2's cases and the query set.
  const queries = hostileQueries();
  say(queries.filter((x) => x.want === 200).length === 2 && queries.length === 25, `hostileQueries holds ${String(queries.length)} rows, two of them answered`);
  say(queryCase(queries[0], { status: 404, body: '' }) && !queryCase(queries[0], { status: 200, body: '{}' }) && !queryCase(queries[0], { status: 404, body: 'x' }), 'queryCase: a refused query is a 404 with no body');
  const tenKb = queries.find((x) => x.wantNot200 === true);
  say(queryCase(tenKb, { status: 0, body: '' }) && queryCase(tenKb, { status: 404, body: '' }) && !queryCase(tenKb, { status: 200, body: '{}' }), 'queryCase: the 10 KB target is anything but an answer (the parser\'s refusal or the door\'s)');
  const nobody = queries.find((x) => x.empty === true);
  const emptyAnswer = { ...honest, asked: { show: 'active', group: 'project', sort: 'recent', agent: 'nobody3167', machine: null }, rows: [], groups: [], total: 3, omitted: 0 };
  say(queryCase(nobody, { status: 200, answer: emptyAnswer }) && !queryCase(nobody, { status: 200, answer: { ...emptyAnswer, omitted: 1 } }), 'queryCase: an id naming nothing is 200 with no rows and omitted 0');
  // Q3.
  const at = new Map([['a', 100]]);
  say(q3Problems({ reads: [{ status: 200, query: {}, answer: { ...honest, asked: askedOf({}), rows: [], groups: [], omitted: 0, at: 200 } }], removedAt: at }).length === 0, 'q3Problems passes an answer without the removed row');
  say(q3Problems({ reads: [{ status: 200, query: { show: 'all', group: 'project', sort: 'oldest' }, answer: { ...honest, at: 200 } }], removedAt: at }).length > 0, 'q3Problems refuses a removed row in an answer composed after its removal');
  say(q3Problems({ reads: [{ status: 200, query: { show: 'all', group: 'project', sort: 'oldest' }, answer: { ...honest, at: 50 } }], removedAt: at }).length === 0, 'q3Problems keeps a removed row in an answer composed before its removal');
  say(J(q3Problems({ reads: [{ status: 0, query: {}, answer: null, error: 'socket hang up' }], removedAt: at })) === J(['a read answered 0 (socket hang up)']), 'q3Problems refuses a read that was not answered');
  say(q3Problems({ reads: [{ status: 200, query: { show: 'all', group: 'project', sort: 'oldest' }, answer: { ...honest, at: 50, rows: [honest.rows[0], honest.rows[0], honest.rows[2]] } }], removedAt: new Map() }).some((p) => p.includes('listed twice')), 'q3Problems refuses an answer the phone\'s rules refuse (a row twice)');
  say(median([3, 1, 2]) === 2 && median([]) === null, 'median');
  // The node phone's re-derived refusals (build/p316/node-phone.mjs
  // `sessionsAnswerProblems`, SPEC §6.4.5): an honest answer has none, and each
  // break below is refused, every refusal by a case of its own.
  {
    const r0 = (id, g, extra = {}) => ({ sessionId: id, name: id, group: g, machine: null, statusDot: 'idle', statusTitle: 'Idle', ageText: null, waiting: false, question: null, end: { state: 'none' }, ...extra });
    const g0 = (id, count, extra = {}) => ({ id, label: id, machine: null, folder: null, count, omitted: 0, waiting: false, collapsed: false, ...extra });
    const fresh = () => ({ asked: { show: 'active', group: 'project', sort: 'recent', agent: null, machine: null }, rows: [r0('a', 0, { waiting: true }), r0('b', 0), r0('c', 1)], groups: [g0('g0', 2, { waiting: true }), g0('g1', 1)], agents: [{ id: 'claude', label: 'Claude Code' }], machines: [{ id: 'local', label: null }], total: 9, omitted: 0, at: 5, ageNote: '' });
    const asked0 = askedOf({});
    say(sessionsAnswerProblems(fresh(), asked0).length === 0, `sessionsAnswerProblems draws an honest answer (${J(sessionsAnswerProblems(fresh(), asked0))})`);
    const refuses = [
      ['an answer that is not an object', () => null],
      ['no asked', (a) => void (a.asked = null)],
      ['a Show word the Mac never says', (a) => void (a.asked.show = 'everything'), true],
      ['a Group by word the Mac never says', (a) => void (a.asked.group = 'tree'), true],
      ['a Sort by word the Mac never says', (a) => void (a.asked.sort = 'size'), true],
      ['an agent filter that is neither an id nor null', (a) => void (a.asked.agent = 7), true],
      ['an answer to another question', (a) => void (a.asked.sort = 'name')],
      ['rows that are not a list', (a) => void (a.rows = {})],
      ['a total that is not a count', (a) => void (a.total = -1)],
      ['an at that is not a time', (a) => void (a.at = 'now')],
      ['an ageNote that is not a string', (a) => void (a.ageNote = null)],
      ['a choice that is not { id, label }', (a) => void (a.agents = [{ id: 1 }])],
      ['a group that is not an object', (a) => void (a.groups.push(null), a.rows.push(r0('d', 2)))],
      ['a group with no id', (a) => void (a.groups[1].id = '')],
      ['two groups with one id', (a) => void (a.groups[1].id = 'g0')],
      ['a group label that is not a string', (a) => void (a.groups[1].label = 3)],
      ['a group folder that is neither a string nor null', (a) => void (a.groups[1].folder = 3)],
      ['a group count that is not a count', (a) => void (a.groups[1].count = 1.5)],
      ['a group collapsed that is not a Bool', (a) => void (a.groups[1].collapsed = 'no')],
      ['a row that is not an object', (a) => void a.rows.push(null)],
      ['a row with no sessionId', (a) => void (a.rows[2].sessionId = '')],
      ['a row id twice', (a) => void (a.rows[1].sessionId = 'a')],
      ['a row name that is not a string', (a) => void (a.rows[2].name = 4)],
      ['a row age that is neither a string nor null', (a) => void (a.rows[2].ageText = 4)],
      ['a row waiting that is not a Bool', (a) => void (a.rows[2].waiting = 'no')],
      ['a row with no End offer', (a) => void (a.rows[2].end = null)],
      ['a row whose group is outside groups', (a) => void a.rows.push(r0('d', 2))],
      ['a group whose rows are not together under Project', (a) => void a.rows.splice(1, 2, a.rows[2], a.rows[1])],
      ['a group reading waiting false over a waiting row', (a) => void (a.groups[0].waiting = false)],
      ['a group no row names', (a) => void a.groups.push(g0('g2', 0))],
      ['groups not in the order their first row is emitted', (a) => void (a.rows = [r0('c', 1), r0('a', 0, { waiting: true }), r0('b', 0)])],
      ['a count that is not its drawn rows plus its omitted', (a) => void (a.groups[1].count = 2)],
      ['group omitted that overflow the checked sum', (a) => Object.assign(a, { groups: [g0('g0', 2 + 2 ** 52, { waiting: true, omitted: 2 ** 52 }), g0('g1', 1 + 2 ** 52, { omitted: 2 ** 52 })] })],
      ['group omitted that sum above the answer\'s', (a) => Object.assign(a.groups[1], { omitted: 1, count: 2 })],
      ['a total below the rows plus the omitted', (a) => void (a.total = 2)]
    ];
    // `echo`: the question asked is the answer's own words, so only the word's own refusal can fire.
    for (const [what, edit, echo] of refuses) {
      const a = fresh();
      const got = edit(a);
      const answer = got === null ? null : a;
      const problems = sessionsAnswerProblems(answer, echo === true ? { ...a.asked } : asked0);
      say(problems.length > 0, `sessionsAnswerProblems refuses ${what} (${J(problems.slice(0, 2))})`);
    }
    // A project whose every row the caps left out is in no group, so the
    // groups' omitted sum to LESS than the answer's: main's own answer past
    // the cap, which the phone draws (SPEC "§As built").
    const wholeCut = Object.assign(fresh(), { omitted: 4, total: 9 });
    say(sessionsAnswerProblems(wholeCut, asked0).length === 0, `sessionsAnswerProblems draws an answer whose groups' omitted sum below the answer's (${J(sessionsAnswerProblems(wholeCut, asked0))})`);
  }
  process.stdout.write(failures === 0 ? `[p3167] grader self-test PASS: ${String(Object.keys(GRADERS).length)} graders, ${String(clauses)} clauses, each shown to go red on its own break.\n` : `[p3167] grader self-test FAIL: ${String(failures)}.\n`);
  return failures === 0;
}

// The run, only when this file is the program: importing it (a verifier's
// re-derivation, a dry run over the shipping composer) reads the graders and
// starts nothing.
const isMain = process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain && process.argv.includes('--grader-self-test')) process.exit(graderSelfTest() ? 0 : 1);
if (isMain) await run();

async function run() {

  // ---------------------------------------------------------------------------
  // The refusals, in the order they are asked
  // ---------------------------------------------------------------------------

  const TAG = '[p3167]';
  const t0 = Date.now();
  const say = (l) => console.log(`${TAG} ${((Date.now() - t0) / 1000).toFixed(1).padStart(6)}s ${l}`);
  const refuse = (why) => {
    console.error(`${TAG} REFUSED. ${why}`);
    process.exit(2);
  };
  const SOCKET = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
  if (SOCKET === '') refuse('no GMUX_TMUX_SOCKET. Run `npm run probe:p3167`, which wraps this file in build/harness-socket.mjs and build/with-scratch-machine.mjs.');
  if (SOCKET === 'gmux' || SOCKET === 'default' || !SOCKET.startsWith('gmux-p3167')) refuse(`"${SOCKET}" is not a gmux-p3167 harness socket.`);
  const HARNESS_DIR = (process.env['GMUX_HARNESS_DIR'] ?? '').trim();
  if (HARNESS_DIR === '') refuse('no GMUX_HARNESS_DIR, so there is nowhere scratch to put the HOME and the profile.');
  const CONFIG_ROOT = (process.env['GMUX_CONFIG_ROOT'] ?? '').trim();
  let carriage = null;
  try {
    carriage = JSON.parse(readFileSync(join(CONFIG_ROOT, 'p69-carriage.json'), 'utf8'));
  } catch {
    carriage = null;
  }
  if (CONFIG_ROOT === '' || carriage === null) refuse('there is no p69-carriage.json inside GMUX_CONFIG_ROOT. Run me inside node build/with-scratch-machine.mjs.');
  if (typeof carriage.tmuxTmp !== 'string' || !carriage.tmuxTmp.startsWith('/tmp/')) refuse(`the carriage names ${J(carriage.tmuxTmp)} as the machine's TMUX_TMPDIR, which is not a scratch directory under /tmp.`);
  const FAR_TMUX = String(carriage.remoteTmuxPath ?? '');
  if (!existsSync(FAR_TMUX)) refuse(`the carriage's tmux ${J(FAR_TMUX)} does not exist.`);

  const PARENT = (process.env['P3167_PARENT_CHECKOUT'] ?? '').trim();
  const KEEP = (process.env['P3167_KEEP'] ?? '') === '1';
  /** The sources a HEAD reading is made of; out/ older than any of them is refused. */
  const SOURCES = ['src/main/pocket/routes.ts', 'src/main/pocket/ipc.ts', 'src/main/pocket/door/table.ts', 'src/main/pocket/door/wire.ts', 'src/shared/session-list.ts', 'src/shared/ipc/pocket.ts'];
  for (const checkout of [ROOT, ...(PARENT === '' ? [] : [resolve(PARENT)])]) {
    const bundle = join(checkout, 'out', 'main', 'index.js');
    if (!existsSync(bundle)) refuse(`${bundle} is missing. Build that checkout first.`);
    if (checkout === ROOT) {
      const newer = SOURCES.filter((s) => existsSync(join(ROOT, s)) && statSync(join(ROOT, s)).mtimeMs > statSync(bundle).mtimeMs);
      if (newer.length > 0) refuse(`out/ is older than ${newer.join(', ')}; build first.`);
    }
  }

  // ---------------------------------------------------------------------------
  // The scratch world
  // ---------------------------------------------------------------------------

  mkdirSync(join(HARNESS_DIR, 'p3167'), { recursive: true });
  const RUN = realpathSync(join(HARNESS_DIR, 'p3167'));
  const HOME = join(RUN, 'home');
  const PROFILE = join(RUN, 'profile');
  /** Every seeded folder is under this, so Q7 finds any of them by the one segment. */
  const SEED_ROOT = join(RUN, 'p3167-seed');
  const SEED_OUT = join(RUN, 'seed.json');
  const MANIFEST = join(PROFILE, 'gmux', 'manifest.db');
  /** The live shells' folders: both seeded `app` folders and one of their own. */
  const LIVE_FOLDERS = [join(SEED_ROOT, 'one', 'app'), join(SEED_ROOT, 'two', 'app'), join(RUN, 'live-work')];
  /** The loopback machine's `app` folder. */
  const FAR = join(RUN, 'remote', 'app');
  const BIN = join(HOME, '.local', 'bin');
  /** OUTSIDE the profile, so the helper's profile sweep never takes the stand-in's children for the app's. */
  const STANDIN_DIR = join(RUN, 'standin');
  const STOP = join(RUN, 'fake-stop');
  const APP_LOG = join(PROFILE, 'logs', 'app.log');
  const MACHINES_JSON = join(PROFILE, 'gmux', 'config', 'machines.json');
  const PUBLIC_NAME = DEFAULT_SCENARIO.dnsName.replace(/\.$/, '');
  const DIALOG = join(ROOT, 'src/main/activity/__tests__/fixtures/claude-permission-prompt.txt');
  const OUT = join(ROOT, 'out', 'p3167');

  const report = { checkout: ROOT, parent: PARENT === '' ? null : resolve(PARENT), arms: [], readings: {} };
  let failures = 0;
  let unreadable = 0;
  function arm(id, reading) {
    const g = grade(id, reading);
    report.arms.push({ id, ok: g.ok, failed: g.failed, title: GRADERS[id].title });
    report.readings[id] = reading;
    if (!g.ok) failures += 1;
    say(`${g.ok ? 'PASS' : 'FAIL'} ${id}: ${GRADERS[id].title}${g.ok ? '' : `; FAILED ${J(g.failed)}`}`);
  }
  function cannotRead(id, why) {
    unreadable += 1;
    report.arms.push({ id, ok: null, said: why });
    say(`UNREADABLE ${id}: ${why}`);
  }

  // ---------------------------------------------------------------------------
  // The guards: the stand-ins and the sampler
  // ---------------------------------------------------------------------------

  let standin = null;
  let dns = null;
  let watch = null;
  let lastShim = 0;
  let lastApp = 0;
  let tailscalePreflight = false;
  let seeded = false;
  const dnsPreflights = [];
  const agentsHeld = [];
  /** The forwarder the stand-in's Funnel child listens on now, or 0. */
  const forwarderPort = () => standin?.readFunnel()[0]?.forwarderPort ?? 0;

  // ---------------------------------------------------------------------------
  // The app
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
  /** The app window, once its bridge and the drives this run uses are armed. */
  async function attachMain(timeoutMs = 150_000) {
    const started = Date.now();
    let why = 'no DevToolsActivePort yet';
    for (;;) {
      const picked = pickRendererTarget(await targets());
      if (picked.target !== null) {
        const cdp = await wsConnect(picked.target.webSocketDebuggerUrl);
        await cdp.call('Runtime.enable');
        for (let i = 0; i < 200; i += 1) {
          if ((await cdpEval(cdp, "window.gmux !== undefined && window.gmux.pocket !== undefined && typeof window.__p293 === 'object' && typeof window.__gmuxP95 === 'object'")) === true) return cdp;
          await sleep(300);
        }
        throw new Error('the app never armed window.gmux.pocket and the drives');
      }
      why = picked.why;
      if (Date.now() - started > timeoutMs) throw new Error(`no app window: ${why}`);
      await sleep(300);
    }
  }
  async function pocket(cdp, method, arg) {
    const call = arg === undefined ? `window.gmux.pocket[${J(method)}]()` : `window.gmux.pocket[${J(method)}](${J(arg)})`;
    return JSON.parse(await cdpEval(cdp, `(async () => { try { const v = await ${call}; return JSON.stringify({ ok: true, value: v === undefined ? null : v }); } catch (e) { return JSON.stringify({ ok: false, error: String((e && e.message) || e) }); } })()`));
  }
  async function bridge(cdp, expr) {
    return JSON.parse(await cdpEval(cdp, `(async () => { try { const v = await (${expr}); return JSON.stringify({ ok: true, value: v === undefined ? null : v }); } catch (e) { return JSON.stringify({ ok: false, error: String((e && e.message) || e) }); } })()`, 180_000));
  }
  async function status(cdp) {
    const got = await pocket(cdp, 'status');
    return got.ok ? got.value : null;
  }
  async function waitStatus(cdp, test, ms) {
    const started = Date.now();
    let last = null;
    for (;;) {
      last = await status(cdp);
      if (last !== null && test(last)) return { ok: true, status: last };
      if (Date.now() - started >= ms) return { ok: false, status: last };
      await sleep(300);
    }
  }
  async function waitFor(test, ms, every = 300) {
    const started = Date.now();
    for (;;) {
      const v = await test();
      if (v) return v;
      if (Date.now() - started >= ms) return null;
      await sleep(every);
    }
  }
  /** Main's listed sessions, with what this file's own readings need. */
  async function sessions(cdp) {
    const got = await bridge(cdp, 'window.gmux.sessions.list().then((l) => l.map((s) => ({ id: s.id, name: s.name, status: s.status, agent: s.agent, createdAt: s.createdAt, projectPath: s.projectPath, machine: s.machine ? { id: s.machine.id, label: s.machine.label } : null })))');
    return got.ok ? got.value.filter((s) => s.status !== 'discarded') : [];
  }

  /**
   * Confirm the door as it stands and wait until a code may show (Phase 332's
   * `pairable`; a parent answers none, and listening is its word). Returns the
   * lines and the agreement state it read before the Allow.
   */
  async function confirmDoor(cdp) {
    const now = await waitStatus(
      cdp,
      (s) => (s.state === 'listening' && s.confirmState === 'confirmed') || (s.confirmable === true && s.state !== 'opening' && s.confirmLines.some((l) => l.includes(`https://${PUBLIC_NAME}:`))),
      40_000
    );
    if (!now.ok) return { ok: false, why: `the lines never named ${PUBLIC_NAME}: ${J({ state: now.status?.state, refusal: now.status?.refusal })}`, lines: now.status?.confirmLines ?? [], before: now.status?.confirmState ?? null };
    const before = now.status.confirmState;
    const lines = now.status.confirmLines;
    if (!(now.status.state === 'listening' && now.status.confirmState === 'confirmed')) {
      const c = await pocket(cdp, 'confirmDoor', { linesRead: lines, hashRead: now.status.confirmHash });
      if (!c.ok || c.value.allowed !== true) return { ok: false, why: c.ok ? `confirm allowed=${String(c.value.allowed)}` : c.error, lines, before };
    }
    const l = await waitStatus(cdp, (s) => s.pairable === true || (s.pairable === undefined && s.state === 'listening'), 70_000);
    return { ok: l.ok, why: l.ok ? '' : `never pairable: ${J({ state: l.status?.state, pairable: l.status?.pairable })}`, lines, before };
  }

  /** A node phone, paired through the forwarder and allowed through the bridge. */
  async function pairPhone(cdp, label) {
    const offered = await pocket(cdp, 'beginPairing');
    if (!offered.ok) return { ok: false, why: offered.error.slice(0, 200) };
    const read = readOffer(offered.value.payload);
    if (!read.ok) return { ok: false, why: `the code does not read the phone's way: ${read.why}` };
    const phone = makePhone(label, read.offer.dx);
    const door = { get port() { return forwarderPort(); }, name: read.offer.host, publicPort: read.offer.port, pin: read.offer.fp };
    const paired = await pairThrough(door, read.offer, phone, {
      tries: 20,
      everyMs: 500,
      between: async () => {
        const sheet = await pocket(cdp, 'pairingState');
        if (sheet.ok && sheet.value.state === 'presented') await pocket(cdp, 'allowPhone', { linesRead: sheet.value.lines, hashRead: sheet.value.hash });
      }
    });
    await pocket(cdp, 'cancelPairing');
    if (!paired.ok) return { ok: false, why: `pairing answered ${J(paired.words)} (${paired.why})` };
    const first = await signedGet(phone, door, '/v1/blocked');
    return { ok: first.status === 200, why: first.status === 200 ? '' : `the first read answered ${String(first.status)}`, phone, door };
  }

  /** One signed read as JSON, with its status. */
  async function readJson(phone, door, target) {
    const a = await signedGet(phone, door, target);
    let body = null;
    try {
      body = a.status === 200 ? JSON.parse(a.body) : null;
    } catch {
      body = null;
    }
    return { status: a.status, body };
  }

  const appLogText = () => {
    try {
      return readFileSync(APP_LOG, 'utf8');
    } catch {
      return null;
    }
  };

  /**
   * Write the scratch machines file with the loopback machine: the path the app
   * itself reports when it can, refused unless it is inside this run's world.
   */
  function writeMachines(path = MACHINES_JSON) {
    if (!path.startsWith(`${RUN}/`) && !path.startsWith(`${CONFIG_ROOT}/`)) throw new Error(`the machines file ${path} is outside this run's scratch world; nothing is written there`);
    mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    writeFileSync(path, `${J({ schema: 1, machines: [{ id: MACHINE_ID, label: MACHINE_LABEL, host: carriage.host, user: carriage.user, port: carriage.port, remoteTmuxPath: FAR_TMUX }] })}\n`, 'utf8');
  }

  function launchOptions(label, checkout) {
    return {
      label,
      userDataDir: PROFILE,
      cwd: checkout,
      tmuxSocket: SOCKET,
      args: ['--remote-debugging-port=0', '--use-mock-keychain'],
      env: withoutDevRenderer({
        ...INHERITED_CLAUDE,
        HOME,
        GMUX_TMUX_SOCKET: SOCKET,
        GMUX_PROBES: '1',
        GMUX_LOG_FILE: '1',
        GMUX_SPECSTORY_NO_CLOUD: '1',
        GMUX_CONFIG_ROOT: CONFIG_ROOT,
        GMUX_HARNESS_DIR: HARNESS_DIR,
        // THE STAND-INS. A development build honours both; a packaged one ignores them.
        GMUX_TAILSCALE_BIN: standin.binPath,
        [NAME_SERVERS_VAR]: dns.servers,
        ...(typeof carriage.authSock === 'string' ? { SSH_AUTH_SOCK: carriage.authSock } : {}),
        P3167_STOP: STOP,
        P3167_DIALOG: DIALOG
      }),
      graceMs: 8_000,
      ceilingMs: 3_000_000
    };
  }

  /** One launch through the helper, after both preflights and the quiet agents. */
  async function launch(label, checkout, body) {
    const pre = preflightStandin(standin, standin.binPath);
    if (!pre.ok) throw new Error(`the Tailscale preflight refused the launch: ${pre.problems.join('; ')}`);
    const dnsPre = await dns.preflight(dns.servers);
    dnsPreflights.push(dnsPre.ok && loopbackOnlyServers(dns.servers));
    if (!dnsPre.ok) throw new Error(`the DNS preflight refused the launch: ${dnsPre.problems.join('; ')}`);
    writeQuietAgents(PROFILE);
    return withElectron(launchOptions(label, checkout), async (handle) => {
      lastShim = handle.pid;
      const appNow = () => {
        try {
          lastApp = handle.appPid() || lastApp;
        } catch {
          /* not up yet */
        }
        return lastApp;
      };
      appNow();
      const main = await attachMain();
      appNow();
      try {
        // NO AGENT STARTS: the renamed rows must read not installed, or nothing goes on.
        const list = JSON.parse(await cdpEval(main, 'window.gmux.agentsList().then((r) => JSON.stringify(r))'));
        const held = quietAgentsHeld(list);
        agentsHeld.push(held.ok);
        if (!held.ok) throw new Error(`agents:list says the renamed agents are not all absent: ${held.problems.join('; ')}`);
        await body(main, handle);
      } finally {
        main.close();
        appNow();
      }
    });
  }

  /** A shell, made through the session manager's drive (probe:p293's), local or on the machine. */
  async function shell(cdp, path, name, machineId) {
    const got = await bridge(cdp, `window.__p293.createSession(${J(machineId === undefined ? { path, name } : { path, name, machineId })})`);
    if (!got.ok || typeof got.value !== 'string') throw new Error(`${name} was not created: ${J(got)}`);
    return got.value;
  }

  /** The waiting session main reads, by name; its id and whether main reads it needs input. */
  const waitingOf = async (main, name) => (await sessions(main)).find((s) => s.name === name) ?? null;

  // ---------------------------------------------------------------------------
  // The run
  // ---------------------------------------------------------------------------

  let seed = null;
  let headDone = false;
  /** Where app.log stood when HEAD's door was switched on: Q7 reads what came after. */
  let logFrom = null;
  const sentNeedles = [];

  try {
    rmSync(RUN, { recursive: true, force: true });
    for (const dir of [HOME, PROFILE, BIN, STANDIN_DIR, FAR, ...LIVE_FOLDERS]) mkdirSync(dir, { recursive: true });
    for (const dir of [FAR, ...LIVE_FOLDERS]) writeFileSync(join(dir, 'README.md'), '# Phase 316.7, a scratch folder\n');
    // ---- the seeded world, through the shipping store, before any launch ------
    {
      mkdirSync(dirname(MANIFEST), { recursive: true });
      const r = spawnSync(process.execPath, [tsxCli(), '--tsconfig', 'tsconfig.node.json', join(ROOT, 'build', 'p3167', 'seed-sessions.mts'), '--manifest', MANIFEST, '--shape', 'probe', '--root', SEED_ROOT, '--out', SEED_OUT], { cwd: ROOT, encoding: 'utf8', timeout: 300_000, maxBuffer: 16 * 1024 * 1024, env: { ...process.env, HOME } });
      const line = String(r.stdout ?? '').trim().split('\n').filter((l) => l.startsWith('{')).pop() ?? null;
      report.readings.seed = line === null ? { status: r.status, stderr: String(r.stderr ?? '').slice(0, 400) } : JSON.parse(line);
      seeded = r.status === 0 && line !== null && report.readings.seed.listedBack === 2000;
      if (!seeded) throw new Error(`the seed did not write 2,000 rows: exit ${String(r.status)} ${String(r.stderr ?? '').slice(0, 300)}`);
      seed = JSON.parse(readFileSync(SEED_OUT, 'utf8'));
    }
    // The fake claude: prints the committed Phase 312 dialog and waits.
    writeFileSync(
      join(BIN, 'claude'),
      `#!/bin/sh
  # probe:p3167. Not Claude Code. It prints a committed fixture and waits.
  case "$1" in
    -v|--version) echo "2.1.238 (Claude Code)"; exit 0;;
  esac
  sleep 2
  cat "$P3167_DIALOG"
  while [ ! -f "$P3167_STOP" ]; do sleep 1; done
  exit 0
  `,
      'utf8'
    );
    chmodSync(join(BIN, 'claude'), 0o755);
    writeFileSync(join(HOME, '.zprofile'), `export PATH="${BIN}:$PATH"\n`, 'utf8');
    writeFileSync(join(HOME, '.zshrc'), `export PATH="${BIN}:$PATH"\nPS1='p3167 %# '\nHISTFILE=/dev/null\n`, 'utf8');
    writeFileSync(join(HOME, '.hushlogin'), '');
    writeMachines();
    {
      const known = join(PROFILE, 'gmux', 'machines', 'known-machines');
      mkdirSync(dirname(known), { recursive: true });
      writeFileSync(known, keyscanText({ host: carriage.host, port: carriage.port, caller: 'build/p3167/probe-p3167.mjs' }), 'utf8');
    }
    standin = makeStandin({ dir: STANDIN_DIR, scenario: { ...DEFAULT_SCENARIO } });
    const pre = preflightStandin(standin, standin.binPath);
    tailscalePreflight = pre.ok;
    if (!pre.ok) throw new Error(`the Tailscale preflight refused: ${pre.problems.join('; ')}`);
    dns = await makeDnsStandin({ name: PUBLIC_NAME, mode: 'record' });
    watch = watchForRealTailscale({ roots: () => [lastShim, lastApp].filter((p) => p > 0), everyMs: 1_000 });
    say(`measuring ${ROOT}${PARENT === '' ? '' : ` after the parent ${PARENT}`}; socket ${SOCKET}; ${String(seed.listedBack)} seeded rows; the loopback machine on ${String(carriage.host)}:${String(carriage.port)}`);

    // ======================================================================
    // PARENT — FIRST, on the same profile (its door is confirmed over seven
    // routes, so the HEAD launch that follows reads `changed`)
    // ======================================================================
    if (PARENT !== '') {
      await launch('p3167-parent', resolve(PARENT), async (main) => {
        await pocket(main, 'setDoor', { on: true });
        const door = await confirmDoor(main);
        if (!door.ok) return cannotRead('PARENT', `the parent's door never listened: ${door.why}`);
        const paired = await pairPhone(main, 'p3167 parent phone');
        if (!paired.ok) return cannotRead('PARENT', `no phone paired with the parent: ${paired.why}`);
        const s = await readSessions(paired.phone, paired.door, {});
        const b = await readJson(paired.phone, paired.door, '/v1/blocked');
        const listed = await sessions(main);
        arm('PARENT', { sessions: s.status, blocked: b.status, others: b.body?.others?.length ?? null, othersOmitted: b.body?.othersOmitted ?? null, listed: listed.length, waiting: b.body?.rows?.length ?? 0, lines: door.lines });
      });
    }

    // ======================================================================
    // HEAD — Q6, Q1, Q5, Q2, Q4 and Q3, one launch
    // ======================================================================
    await launch('p3167-head', ROOT, async (main) => {
      // ---- the live sessions -------------------------------------------------
      for (const folder of LIVE_FOLDERS) await bridge(main, `window.__p293.addProject(${J(folder)})`);
      const liveIds = [];
      for (let k = 0; k < 12; k += 1) liveIds.push(await shell(main, LIVE_FOLDERS[k % LIVE_FOLDERS.length], `p3167-live-${String(k)}`));
      const waitingName = 'p3167-waiting';
      {
        const made = await bridge(main, `window.gmux.sessions.create(${J({ name: waitingName, projectPath: LIVE_FOLDERS[2], cwd: LIVE_FOLDERS[2], agent: 'claude' })}).then((s) => s.id)`);
        if (!made.ok) throw new Error(`the waiting agent was not created: ${made.error}`);
      }
      const up = await bridge(main, `window.__gmuxP95.machineUp(${J(MACHINE_ID)})`);
      if (!(up.ok && (up.value?.rows ?? []).some((row) => row.id === MACHINE_ID && row.usable))) throw new Error(`the loopback machine is not usable: ${J(up).slice(0, 400)}`);
      for (let attempt = 1; attempt <= 6; attempt += 1) {
        const opened = await bridge(main, `window.__gmuxP95.openRemote(${J(MACHINE_ID)}, ${J(FAR)})`);
        if (opened.ok && opened.value?.result?.ok === true) break;
        await sleep(3_000);
      }
      for (let k = 0; k < 2; k += 1) liveIds.push(await shell(main, FAR, `p3167-far-${String(k)}`, MACHINE_ID));
      const live = await waitFor(async () => {
        const list = await sessions(main);
        return liveIds.every((id) => list.some((s) => s.id === id && LIVE.includes(s.status))) && list.find((s) => s.name === waitingName)?.status === 'needs_input' ? list : null;
      }, 120_000, 1_000);
      if (live === null) throw new Error('the live sessions and the waiting agent never all read live and waiting');
      const waiting = await waitingOf(main, waitingName);
      say(`the world: ${String(live.length)} listed, ${String(live.filter((s) => LIVE.includes(s.status)).length)} live, the waiting session ${String(waiting?.id)}`);

      // ---- Q6: the door asks again over eight routes --------------------------
      logFrom = (appLogText() ?? '').length;
      await pocket(main, 'setDoor', { on: true });
      const door = await confirmDoor(main);
      const st = await status(main);
      arm('Q6', { lines: door.lines, parentRanFirst: PARENT !== '', confirmStateBefore: door.before, listening: door.ok && st?.state === 'listening' });
      if (!door.ok) throw new Error(`the door never listened: ${door.why}`);
      const A = await pairPhone(main, 'p3167 phone');
      if (!A.ok) throw new Error(`the phone did not pair: ${A.why}`);

      // ---- Q1: every combination and each filter -------------------------------
      {
        const listed = await sessions(main);
        const waitingIds = listed.filter((s) => s.status === 'needs_input').map((s) => s.id);
        const agents = [...new Set(listed.map((s) => s.agent))];
        const machines = [...new Set(listed.map(machineOf))];
        const filters = [{}, ...agents.map((agent) => ({ agent })), ...machines.map((machine) => ({ machine }))];
        const problems = [];
        const groupsSeen = new Map();
        let read = 0;
        let combinations = 0;
        let maxOmitted = 0;
        let waitingSeen = false;
        let allProject = null;
        const keep = KEEP ? join(RUN, 'answers') : null;
        if (keep !== null) mkdirSync(keep, { recursive: true, mode: 0o700 });
        for (const show of SESSIONS_SHOW) {
          for (const group of SESSIONS_GROUP) {
            for (const sort of SESSIONS_SORT) {
              for (const filter of filters) {
                combinations += 1;
                const query = { show, group, sort, ...filter };
                const got = await readSessions(A.phone, A.door, query);
                if (got.status === 200) read += 1;
                for (const p of q1Problems({ query, status: got.status, answer: got.answer, wireBytes: got.bytes, listed, waitingIds })) problems.push(`${sessionsTarget(query)}: ${p}`);
                if (got.answer !== null) {
                  maxOmitted = Math.max(maxOmitted, got.answer.omitted);
                  if (got.answer.omitted > 0 && waitingIds.every((id) => got.answer.rows.some((r) => r.sessionId === id))) waitingSeen = true;
                  for (const g of got.answer.groups) groupsSeen.set(g.id, [...(groupsSeen.get(g.id) ?? []), { label: g.label, machine: g.machine, folder: g.folder }]);
                  if (show === 'all' && group === 'project' && sort === 'recent' && filter.agent === undefined && filter.machine === undefined) allProject = got.answer;
                  if (keep !== null) writeFileSync(join(keep, `${String(combinations).padStart(3, '0')}.json`), `${J({ query, target: got.target, answer: got.answer })}\n`, { mode: 0o600 });
                }
              }
            }
          }
        }
        const across = q1Across({ groupsSeen, allProject });
        if (keep !== null) writeFileSync(join(keep, 'listed.json'), `${J({ listed, waitingIds })}\n`, { mode: 0o600 });
        arm('Q1', {
          combinations,
          read,
          problems: problems.slice(0, 40),
          problemCount: problems.length,
          across,
          maxOmitted,
          waitingSeen,
          apps: appsReading(groupsSeen),
          groups: groupsSeen.size
        });
      }

      // ---- Q5: /v1/blocked keeps the parent's shape ---------------------------
      {
        const listed = await sessions(main);
        const b = await readJson(A.phone, A.door, '/v1/blocked');
        arm('Q5', { keys: Object.keys(b.body ?? {}), waitingRows: b.body?.rows?.length ?? -1, waitingMain: listed.filter((s) => s.status === 'needs_input').length, others: b.body?.others?.length ?? -1, othersOmitted: b.body?.othersOmitted ?? -1, listed: listed.length });
      }

      // ---- Q2: the hostile query set, live --------------------------------------
      {
        const cases = [];
        for (const row of hostileQueries()) {
          if (row.needle !== null) sentNeedles.push(row.needle);
          let reply;
          if (row.replay === true) {
            // Signed for /v1/blocked, sent to /v1/sessions.
            reply = await request({ door: A.door, method: 'GET', target: row.target, headers: signedHeaders(A.phone, '/v1/blocked'), identity: A.phone });
          } else {
            reply = await signedGet(A.phone, A.door, row.target);
          }
          let answer = null;
          try {
            answer = reply.status === 200 ? JSON.parse(reply.body) : null;
          } catch {
            answer = null;
          }
          const reading = { status: reply.status, body: reply.body ?? '', answer };
          cases.push({ what: row.what, want: row.want, status: reply.status, bytes: reply.bytes ?? 0, ok: queryCase(row, reading), error: reply.error ?? null });
        }
        const control = (await readSessions(A.phone, A.door, {})).status;
        await sleep(1_000);
        const text = (appLogText() ?? '').slice(logFrom ?? 0);
        arm('Q2', { cases, routeLogged: text.includes('refused a request at the door: route') || (appLogText() ?? '').includes('refused a request at the door: route'), control });
      }

      // ---- Q4: the route's time at 2,000 rows -------------------------------------
      {
        const all = { show: 'all', group: 'project', sort: 'recent' };
        const times = { sessions: [], control: [], blocked: [] };
        let rows = 0;
        const nothing = '00000000-0000-4000-8000-000000000000';
        for (let i = 0; i < 21; i += 1) {
          const s = await readSessions(A.phone, A.door, all);
          rows = Math.max(rows, s.answer?.rows?.length ?? 0);
          const c0 = Date.now();
          await signedGet(A.phone, A.door, `/v1/session?id=${nothing}`);
          const c1 = Date.now();
          await signedGet(A.phone, A.door, '/v1/blocked');
          const c2 = Date.now();
          if (i === 0) continue;
          times.sessions.push(s.ms);
          times.control.push(c1 - c0);
          times.blocked.push(c2 - c1);
        }
        arm('Q4', { sessionsMs: median(times.sessions), controlMs: median(times.control), blockedMs: median(times.blocked), rows, samples: times.sessions.length, composingMs: median(times.sessions) - median(times.control) });
      }

      // ---- Q3: 200 reads while 50 ended sessions are removed --------------------
      {
        const listed = await sessions(main);
        const victims = listed.filter((s) => s.status === 'exited' || s.status === 'restorable').slice(0, 50).map((s) => s.id);
        const removedAt = new Map();
        const reads = [];
        const query = { show: 'all', group: 'project', sort: 'recent' };
        let readsStarted = null;
        let removalsDone = null;
        const reader = async (lane) => {
          for (let i = lane; i < 200; i += 2) {
            readsStarted ??= Date.now();
            const got = await readSessions(A.phone, A.door, query);
            reads.push({ query, status: got.status, answer: got.answer, error: got.error, at: Date.now() });
          }
        };
        const remover = async () => {
          for (const id of victims) {
            const r = await bridge(main, `window.gmux.sessions.discard(${J(id)})`);
            if (r.ok) removedAt.set(id, Date.now());
            await sleep(150);
          }
          removalsDone = Date.now();
        };
        await Promise.all([reader(0), reader(1), remover()]);
        const lastRead = Math.max(...reads.map((r) => r.at));
        const problems = q3Problems({ reads, removedAt });
        arm('Q3', { reads: reads.length, removed: removedAt.size, overlapped: readsStarted !== null && removalsDone !== null && lastRead > Math.min(...removedAt.values()) && readsStarted < removalsDone, problems: problems.slice(0, 20), problemCount: problems.length });
      }
      headDone = true;
    });
  } catch (err) {
    failures += 1;
    report.error = String(err?.message ?? err);
    say(`the run stopped: ${report.error}`);
  } finally {
    try {
      writeFileSync(STOP, 'stop\n');
    } catch {
      /* the world is gone */
    }
    const leaked = watch === null ? [] : watch.stop();
    const ended = standin === null ? { ended: [], left: [] } : endStandinProcesses(STANDIN_DIR, 1_500);
    if (dns !== null) await dns.close();
    // ---- Q7, after the app has gone: what the door logged -----------------------
    if (headDone && seed !== null) {
      const whole = appLogText();
      const text = whole === null ? '' : whole.slice(logFrom ?? 0);
      // The door's own lines: app.log is NDJSON, and the door logs under the
      // scope `pocket` (main) or from its utility process. A session name or a
      // folder is looked for there, because main's own verbs (Q3's removals)
      // may name a session they act on; a query value is looked for in every
      // line, because only the door was ever sent one.
      const doorText = text
        .split('\n')
        .filter((l) => {
          try {
            const rec = JSON.parse(l);
            return rec.scope === 'pocket' || rec.proctype === 'utility';
          } catch {
            return false;
          }
        })
        .join('\n');
      const names = seed.names.filter((n) => n.length >= 8 && doorText.includes(n)).length;
      const folders = doorText.split('\n').filter((l) => l.includes('p3167-seed')).length;
      const queries = sentNeedles.filter((n) => text.includes(n)).length;
      arm('Q7', { read: whole !== null, characters: text.length, doorCharacters: doorText.length, names, folders, queries });
    }
    arm('RUN', {
      tailscalePreflight,
      dnsPreflights,
      agentsHeld,
      seeded,
      realTailscale: leaked.length,
      samples: watch?.samples() ?? 0,
      forbidden: standin === null ? 0 : standin.forbidden().length,
      standinLeft: ended.left.length
    });
    report.readings.processRowsAtEnd = processRows().filter((r) => r.command.includes('tailscale-standin.mjs')).length;
    mkdirSync(OUT, { recursive: true });
    writeFileSync(join(OUT, `probe-p3167${PARENT === '' ? '' : '-with-parent'}.json`), `${J(report, null, 2)}\n`);
    if (!KEEP) rmSync(RUN, { recursive: true, force: true });
  }

  say(`${String(report.arms.filter((a) => a.ok === true).length)} arm(s) passed, ${String(failures)} failed, ${String(unreadable)} could not be read`);
  process.exit(failures > 0 ? 1 : unreadable > 0 ? 2 : 0);
}
