#!/usr/bin/env node
/**
 * probe:p313 — the door SWITCHED ON, and read by a phone that is a node script
 * (Phase 316.1; published through a STAND-IN Tailscale since Phase 330).
 * Phase 313 named this probe and never wrote it; build/p316/SPEC.md §4 "S1 —
 * Proof" is where it is specified, and build/p330/SPEC.md §5.4 re-points it.
 *
 * WHY IT EXISTS. What no plain-node check can reach is the ORDER inside the
 * real app — turn on, confirm, publish, pair, allow — over the real registrar,
 * the real sealed store and confirm record (mock keychain), the real facts
 * composer reading the real session list and the real overview store, and the
 * real launch step on a relaunch. This probe is that run.
 *
 * WHAT IS REAL IN A RUN
 *   - The app's own `pocket:*` channels, pressed through `window.gmux.pocket`
 *     exactly as Settings then Phone presses them, and the door they open: the
 *     door process on 127.0.0.1, its mutual TLS, its closed route table, its
 *     signature check, its pairing window and its facts.
 *   - The Funnel child's start and stop, and the launch step: the second launch
 *     must be publishing with no press, and the third, whose agreement a
 *     Remove withdrew, must not.
 *
 * WHAT IS SUPPLIED, and it is exactly three things:
 *   - TAILSCALE, which is build/p330/tailscale-standin.mjs behind a /bin/sh
 *     wrapper in the scratch world, named by `GMUX_TAILSCALE_BIN`. It answers
 *     `status`, `serve status` and the one funnel shape, and its funnel is a
 *     loopback FORWARDER that writes a PROXY v2 header and pipes to the door,
 *     the way tailscaled does. The PREFLIGHT refuses the launch unless the
 *     variable is that wrapper and the wrapper execs the stand-in byte for
 *     byte, and the process table is sampled through the run: a real
 *     Tailscale program under the app, or run as a command, FAILS the run;
 *   - the PHONE, build/p316/node-phone.mjs, a third implementation of the wire
 *     (the v:3 code, the proof, the three-key fingerprint, the client
 *     certificate and mutual TLS), dialling the forwarder on 127.0.0.1 with
 *     the code's public NAME as the TLS server name and the Host;
 *   - the `claude` on the scratch PATH, a /bin/sh script this probe writes. For
 *     one session it prints the COMMITTED Phase 312 dialog fixture, so the
 *     shipped screen tier reads `needs_input`; for another it plants the
 *     COMMITTED research 63 transcript under the scratch HOME. NO VENDOR
 *     PROCESS RUNS AND NO TOKEN IS SPENT.
 *
 * NO REAL INTERFACE, AND NO REAL TAILSCALE, EVER. The door binds 127.0.0.1
 * only; the code's host is a made-up `.ts.net` name nobody resolves; this
 * probe dials 127.0.0.1 and nothing else, and never runs a `tailscale` command.
 *
 * THE ORDER, one scratch world, three launches ONE AT A TIME
 *   Launch 1 (the order):
 *     C0  the channel census: every `pocket:*` channel of the contract answers
 *         from main (the parent reading is 0 and no `pocket` member at all)
 *     D0  pairing is refused while nothing is published, so the QR's pin can
 *         never be null
 *     D1  turn on: the lines are drawn and nothing is published yet
 *     D2  confirm: publishing through the stand-in at <name>:8443, the child's
 *         forwarder answering
 *     K1  the offer is v:3 read the phone's way: a public name, 8443, no `tk`
 *         and no address; the sheet's view and the status carry no secret
 *     F1  the QR's `fp` is the PUBLIC KEY's hash, re-derived here from the leaf
 *         the door served through the forwarder, and not the certificate's
 *     P1  present, read the three-key fingerprint on both sides, Allow,
 *         present again and take the client certificate, which names the key
 *     P2  after Allow a second phone with the photographed QR is refused, and
 *         once the window shuts a phone with no certificate is closed after
 *         the handshake
 *     B1  `/v1/blocked`: the waiting session is the one row, its title is the
 *         raised word, its age is main's own and re-derived here, it blocked
 *         AFTER it was created, and `others` is exactly every listed session
 *         that is not blocked
 *     S1  `/v1/session` for the planted conversation: counts and a last answer
 *     T1  `/v1/turns` paged back to the first turn
 *     T2  ONE TURN APPENDED TO THE PLANTED RECORD, and the next read shows it
 *     T3  a 4,000-character one-word ask comes back whole
 *     A1  page indexes that go backwards, overlap, are negative or are 2^53
 *     A2  the id of a removed session, and a session with no record
 *   Launch 2 (the relaunch):
 *     R1  publishing with no press, and the paired phone still reads through
 *         the new child's forwarder
 *     A3  a Remove AFTER VERIFY AND BEFORE THE ANSWER IS WRITTEN (the 316.1
 *         reverify's nit 2), placed by a replay: that request must be refused
 *         or cut, never answered, and main must print refusal 7's `unpaired`
 *   Launch 3 (nothing confirmed any more):
 *     L1  `enabled` and `bindAtLaunch` are still true and the agreement is
 *         gone, so the relaunch must NOT publish and must say why
 *     A4  `setDoor` during quit: the app exits, and nothing is published after
 *   After:
 *     K2  the window's one-shot secret `ps` is in no file under the profile,
 *         the harness directory or the HOME and in nothing the app printed,
 *         and no PEM PRIVATE KEY lies under the profile or the HOME
 *     RUN the preflight passed, no real Tailscale was sampled, no forbidden
 *         or refused argv reached the stand-in, no stand-in process is left,
 *         and no Electron of this run is left
 *
 * PHASE 332: THE NAME CHECK, AGAINST A LOOPBACK DNS STAND-IN. A published door
 * now asks the `ts.net` zone's own servers whether its public name answers
 * before a code may show. The app is handed `GMUX_POCKET_NAME_SERVERS`,
 * naming build/p332/dns-standin.mjs IN THIS PROCESS on 127.0.0.1, answering the
 * Tailscale stand-in's made-up name, so no question reaches real DNS; the
 * preflight refuses unless that value names 127.0.0.1 alone and the stand-in
 * answers. K1 waits for main's `pairable` before it asks for the code, and N1
 * grades every question the app asked: an `A` question, RD 0, for that name.
 * Before every launch the profile's agents.json renames the Gemini, Qwen,
 * Antigravity, Grok and Droid binaries and `agents:list` is read back, so no
 * agent's `--version` ever runs.
 *
 * NOT DRIVEN HERE, and why. A REMOTE row's turns need a second machine;
 * `conformance:pocket:hostile` drives the SHIPPING composer's remote arm.
 * `blockedSince` for a row first seen at a wake is Phase 314's.
 *
 * WHAT IT WRITES. `out/p313/probe-p313.json`: per arm a verdict and a
 * sentence, with lengths, counts, digests and the probe's own synthetic
 * names — never the one-shot secret (it is written as its sha256), a
 * signature, a nonce or a private key. With `P313_KEEP=1` the scratch world is
 * kept and `rederive/answers.json` is written INSIDE it for the verifier's
 * independent reader, which this file deliberately does not contain.
 *
 * WHAT IT REFUSES TO DO. Every launch goes through build/electron-run.mjs's
 * `withElectron`, whose kill is in a `finally`, on its own scratch tmux socket
 * (`gmux-p313-<pid>`, never `gmux`). It signals nothing it did not start: the
 * stand-in's processes are ended by pid in the `finally`, and only while their
 * command line names the stand-in. It never runs `pkill`, installs nothing,
 * spends no token, reads no credential, keychain item or conversation store of
 * the person's, and writes nothing under the person's home. `npm run shot` is
 * not called.
 *
 * VERIFIERS ONLY, under THE LOCK: it starts an Electron. Builders write it and
 * never run it.
 *
 * BUILD FIRST. It refuses (exit 2) when the checkout it is pointed at has no build.
 *
 *   npm run -s probe:p313
 *   P313_PARENT_CHECKOUT=/path/to/parent npm run -s probe:p313   the parent reading
 *   P313_KEEP=1 npm run -s probe:p313                            keep the scratch world
 *   node build/probe-p313.mjs --grader-self-test                  the name-question clause, no Electron
 *
 * Exit 0 when every arm passed (or, at the parent, the parent reading was
 * taken), 1 when an arm failed, 2 when it could not run or an arm could not be
 * READ, which is never a pass.
 */

import { spawnSync } from 'node:child_process';
import { X509Certificate, createHash, randomBytes } from 'node:crypto';
import { appendFileSync, chmodSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { connect as netConnect } from 'node:net';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { withElectron, withoutDevRenderer } from './electron-run.mjs';
import { wsConnect, cdpEval } from './cdp-client.mjs';
import { pickRendererTarget } from './cdp-target.mjs';
import { DEFAULT_SCENARIO, endStandinProcesses, makeStandin, preflightStandin, watchForRealTailscale } from './p330/tailscale-standin.mjs';
import { NAME_SERVERS_VAR, loopbackOnlyServers, makeDnsStandin, nameQuestionsSelfTest, nameQuestionsVerdict, quietAgentsHeld, writeQuietAgents } from './p332/dns-standin.mjs';
import {
  adoptCertificate,
  b64u,
  doorFrom,
  makePhone,
  pairAnswerOf,
  pinOfPeer,
  readOffer,
  request,
  sealPresentation,
  signedGet as phoneGet,
  signedHeaders
} from './p316/node-phone.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
/** The checkout whose APP is launched. The helper, the stand-in and the phone are always this tree's. */
const CHECKOUT = resolve((process.env['P313_PARENT_CHECKOUT'] ?? '').trim() || ROOT);
const AT_PARENT = CHECKOUT !== ROOT;
const TAG = `[p313 ${AT_PARENT ? 'parent' : 'head'}]`;
const say = (line) => console.log(`${TAG} ${line}`);
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
const J = JSON.stringify;
const sha = (data) => createHash('sha256').update(data).digest('hex');

// Phase 332's clause, graded on its own cases with nothing launched.
if (process.argv.includes('--grader-self-test')) {
  const ok = nameQuestionsSelfTest(DEFAULT_SCENARIO.dnsName.replace(/\.$/, ''));
  console.log(`[p313] grader self-test ${ok ? 'PASS' : 'FAIL'}: the name-question clause (N1).`);
  process.exit(ok ? 0 : 1);
}

if (!existsSync(join(CHECKOUT, 'out', 'main', 'index.js'))) {
  console.error(`${TAG} ${CHECKOUT} has no build at out/main/index.js. Run npm run build there first.`);
  process.exit(2);
}

// ---------------------------------------------------------------------------
// What the SHIPPING source says, read out of it rather than copied.
// ---------------------------------------------------------------------------

function sourceOf(...files) {
  for (const file of files) {
    const path = join(CHECKOUT, file);
    if (existsSync(path)) return readFileSync(path, 'utf8');
  }
  return '';
}
function numberIn(text, name) {
  const hit = new RegExp(`${name}\\s*=\\s*([0-9_]+)`).exec(text);
  return hit === null ? null : Number(hit[1].replace(/_/g, ''));
}
function stringIn(text, name) {
  const hit = new RegExp(`${name}\\s*=\\s*'([^']*)'`).exec(text);
  return hit === null ? null : hit[1];
}

const CONTRACT_SRC = sourceOf('src/shared/ipc/pocket.ts');
const ROUTES_SRC = sourceOf('src/main/pocket/door/table.ts', 'src/main/pocket/routes.ts');
const COPY_SRC = sourceOf('src/shared/overview-copy.ts', 'src/renderer/overview/copy.ts');
const OTHERS_MAX = numberIn(CONTRACT_SRC, 'POCKET_OTHERS_MAX');
const AGE_NOTE = stringIn(CONTRACT_SRC, 'POCKET_AGE_HONESTY');
const ABSENCES = ['NOT_ANSWERED_YET', 'STOPPED_BEFORE_ANSWER', 'ANSWER_NOT_IN_RECORD'].map((name) => stringIn(COPY_SRC, name)).filter((s) => s !== null);
/** Every `pocket:*` channel the contract declares, from its channel map's own keys. */
const CONTRACT_CHANNELS = [...CONTRACT_SRC.matchAll(/^\s*'(pocket:[A-Za-z]+)':\s*\{\s*req:/gm)].map((m) => m[1]);
/** The route table's rows, read as literals, for the write routes. */
const ROUTE_ROWS = [...ROUTES_SRC.matchAll(/\{\s*id:\s*'(\w+)',\s*method:\s*'(\w+)',\s*path:\s*'([^']+)',\s*reads:\s*(true|false)(?:,\s*windowOnly:\s*(true|false),\s*signed:\s*(true|false))?/g)].map((m) => ({ id: m[1], method: m[2], path: m[3], reads: m[4] === 'true', windowOnly: m[5] === 'true', signed: m[6] === 'true' }));
const WRITE_ROWS = ROUTE_ROWS.filter((r) => !r.reads || (r.method !== 'GET' && r.path !== '/pair'));
const WRITE_ROUTES = WRITE_ROWS.length;
/**
 * PHASE 317 GAVE THE DOOR ONE WRITE, and its fix round took a second out; PHASE
 * 318 ADDED TWO (build/p318/SPEC.md §5.1): the write rows are EXACTLY `end`,
 * `choose` and `say`, in that order, each a signed POST to `/v1/<id>` alive
 * outside any window, as conformance:pocket R2 holds them. Until Phase 317
 * this arm read "no write route", which that phase made false on purpose, and
 * until Phase 318's fix round it read 317's one write, which 318 made false on
 * purpose (the run lens found C0 red at HEAD on 2026-10-04).
 */
const WRITE_IDS = Object.freeze(['end', 'choose', 'say']);
const WRITES_ARE_318S = WRITE_ROWS.length === WRITE_IDS.length && WRITE_ROWS.every((r, i) => r.id === WRITE_IDS[i] && r.method === 'POST' && r.path === `/v1/${r.id}` && r.reads === false && r.signed === true && r.windowOnly === false);

// ---------------------------------------------------------------------------
// The scratch world. Outside the repository and outside the person's home.
// ---------------------------------------------------------------------------

const RUN = resolve((process.env['P313_RUN'] ?? '').trim() || `/private/tmp/p313-probe-${String(process.pid)}`);
if (!RUN.startsWith('/private/tmp/')) {
  console.error(`${TAG} the scratch world must be under /private/tmp; ${RUN} is not`);
  process.exit(2);
}
const HOME = join(RUN, 'home');
const HARNESS = join(RUN, 'harness');
const PROFILE = join(HARNESS, 'profile');
const PROJECT = join(RUN, 'project');
const BIN = join(HOME, '.local', 'bin');
/** OUTSIDE the profile, so the helper's profile sweep never takes the stand-in's children for the app's. */
const STANDIN_DIR = join(RUN, 'standin');
const SOCKET = `gmux-p313-${String(process.pid)}`;
const KEEP = (process.env['P313_KEEP'] ?? '') === '1';

const NEXT = join(RUN, 'fake-next');
const STOP = join(RUN, 'fake-stop');
const TALK_SID = join(RUN, 'talk-sid');
const DIALOG = join(CHECKOUT, 'src/main/activity/__tests__/fixtures/claude-permission-prompt.txt');
const STORE_SRC = join(CHECKOUT, 'docs/research/assets/63-fixtures/claude-session.jsonl');
const FIXTURE_SID = '11111111-2222-4333-8444-555555555555';
const FIXTURE_CWD = '/Users/dev/demo-app';
for (const file of [DIALOG, STORE_SRC]) {
  if (existsSync(file)) continue;
  console.error(`${TAG} no committed fixture at ${file}`);
  process.exit(2);
}

/** The session names. Every one is this run's own. */
const N = { shell: 'p313-shell', gone: 'p313-gone', talk: 'p313-talk', ask: 'p313-ask' };
const PUBLIC_NAME = DEFAULT_SCENARIO.dnsName.replace(/\.$/, '');

// ---------------------------------------------------------------------------
// The report
// ---------------------------------------------------------------------------

/** Every one-shot secret a window of this run carried. The report never holds them. */
const SECRETS = [];
const unsecret = (text) => SECRETS.reduce((t, s) => t.split(s).join('<the one-shot secret>'), String(text));

const report = {
  checkout: CHECKOUT,
  atParent: AT_PARENT,
  constants: { OTHERS_MAX, AGE_NOTE, absences: ABSENCES.length, contractChannels: CONTRACT_CHANNELS, writeRoutes: WRITE_ROUTES },
  arms: [],
  readings: {}
};
let failures = 0;
const arm = (id, ok, said) => {
  const text = unsecret(said);
  report.arms.push({ id, ok, said: text });
  if (ok === false) failures += 1;
  say(`${ok === null ? 'UNREADABLE' : ok ? 'PASS' : 'FAIL'} ${id}: ${text}`);
};
/** Every door answer this run received, for the verifier's re-derivation. */
const answers = [];

// ---------------------------------------------------------------------------
// The wire: the stand-in's forwarder on 127.0.0.1, and nothing else, ever
// ---------------------------------------------------------------------------

let standin = null;
/** The QR this run pins, read the phone's way. */
let offer = null;
/** What the last handshake presented, for F1's re-derivation. */
let lastLeaf = null;

/** The live Funnel child's forwarder, or null while nothing is published. */
const forwarder = () => standin?.readFunnel()[0] ?? null;
/** The door to dial: the forwarder now, with the code's name and pin. */
const DOOR = () => (offer === null ? null : doorFrom(offer, forwarder()?.forwarderPort ?? 0));

/** Is anything published, and does its forwarder accept? A plain TCP connect, nothing sent. */
function published() {
  const f = forwarder();
  if (f === null) return Promise.resolve(false);
  return new Promise((done) => {
    const socket = netConnect({ host: '127.0.0.1', port: f.forwarderPort });
    const finish = (value) => {
      socket.destroy();
      done(value);
    };
    socket.setTimeout(3_000, () => finish(false));
    socket.once('connect', () => finish(true));
    socket.once('error', () => finish(false));
  });
}

/** One request through the forwarder; a refusal that arrives as a dead socket is itself a reading. */
function ask(method, target, headers, body, { identity = null, timeoutMs = 20_000, onWritten } = {}) {
  const door = DOOR();
  if (door === null || door.port === 0) return Promise.resolve({ status: 0, body: '', error: 'nothing is published' });
  return request({ door, method, target, headers: body === null ? headers : { ...headers, 'content-length': String(body.length) }, body, identity, timeoutMs, onWritten }).then((a) => a);
}
function signedGet(phone, target, options = {}) {
  const door = DOOR();
  if (door === null || door.port === 0) return Promise.resolve({ status: 0, body: '', error: 'nothing is published' });
  return phoneGet(phone, door, target, options);
}

/**
 * ONE signed GET whose headers can be sent TWICE (arm A3). The second sending
 * is a replay: same timestamp, same nonce, same signature. The door spends a
 * nonce only AFTER the signature holds, so when it refuses one of the two
 * sendings `replay`, the other has passed verify and is inside the composition.
 */
function signedTwice(phone, target) {
  const headers = signedHeaders(phone, target);
  const send = () => {
    const out = { settled: false, answer: null, written: null };
    let wrote = () => undefined;
    out.written = new Promise((done) => {
      wrote = done;
    });
    out.answer = ask('GET', target, headers, null, { identity: phone, timeoutMs: 30_000, onWritten: () => wrote() }).then((a) => {
      out.settled = true;
      wrote();
      return a;
    });
    return out;
  };
  return { send };
}

const verdictOf = (answer) => (answer.status === 200 ? 'ok' : answer.status === 0 ? `nosocket-${answer.error ?? '?'}` : `refused-${String(answer.status)}`);
const parse = (answer) => {
  try {
    return JSON.parse(answer.body);
  } catch {
    return null;
  }
};
async function read(phone, target, label) {
  const answer = await signedGet(phone, target);
  answers.push({ label, target, status: answer.status, body: answer.body });
  return answer;
}
async function pageBack(phone, sessionId, limit, label) {
  const pages = [];
  let to = null;
  for (let i = 0; i < 400; i += 1) {
    const target = `/v1/turns?id=${encodeURIComponent(sessionId)}&limit=${String(limit)}${to === null ? '' : `&to=${String(to)}`}`;
    const answer = await read(phone, target, `${label} page ${String(i)}`);
    const body = parse(answer);
    if (answer.status !== 200 || body === null) return { ok: false, pages, why: `page ${String(i)} answered ${verdictOf(answer)}` };
    pages.push(body);
    if (!Array.isArray(body.turns)) return { ok: false, pages, why: `page ${String(i)} carries no turns array` };
    if (body.more !== true) return { ok: true, pages, why: '' };
    if (body.turns.length === 0) return { ok: false, pages, why: `page ${String(i)} says more and carries nothing, which would page forever` };
    to = body.turns[0].index - 1;
  }
  return { ok: false, pages, why: 'more than 400 pages' };
}

/** The door's leaf through the forwarder, for F1: one TLS handshake, no request. */
async function leafThroughForwarder() {
  const { connect } = await import('node:tls');
  const door = DOOR();
  return new Promise((done) => {
    const s = connect({ host: '127.0.0.1', port: door.port, servername: door.name, minVersion: 'TLSv1.3', rejectUnauthorized: false });
    s.setTimeout(10_000, () => {
      s.destroy();
      done(null);
    });
    s.once('secureConnect', () => {
      const peer = s.getPeerCertificate();
      s.destroy();
      done(peer);
    });
    s.once('error', () => done(null));
  });
}

// ---------------------------------------------------------------------------
// The app, driven through its own bridge
// ---------------------------------------------------------------------------

const INHERITED_CLAUDE = Object.fromEntries(Object.keys(process.env).filter((name) => /^(?:CLAUDECODE|CLAUDE_)/.test(name)).map((name) => [name, undefined]));

async function attach(timeoutMs) {
  const started = Date.now();
  let why = 'no DevToolsActivePort yet';
  for (;;) {
    try {
      const port = Number(readFileSync(join(PROFILE, 'DevToolsActivePort'), 'utf8').split('\n')[0].trim());
      if (Number.isFinite(port) && port > 0) {
        const list = await (await fetch(`http://127.0.0.1:${String(port)}/json/list`)).json();
        const picked = pickRendererTarget(list);
        if (picked.target !== null) return await wsConnect(picked.target.webSocketDebuggerUrl);
        why = picked.why;
      }
    } catch (err) {
      why = String(err?.message ?? err);
    }
    if (Date.now() - started > timeoutMs) throw new Error(`no app window: ${why}`);
    await sleep(300);
  }
}
async function armed(cdp) {
  await cdp.call('Runtime.enable');
  for (let i = 0; i < 200; i += 1) {
    const ready = await cdpEval(cdp, 'window.gmux !== undefined && window.__gmuxP93 !== undefined && window.__gmuxP202 !== undefined');
    if (ready === true) {
      // NO AGENT STARTS (Phase 332): the renamed rows must read not installed.
      const held = quietAgentsHeld(JSON.parse(await cdpEval(cdp, 'window.gmux.agentsList().then((r) => JSON.stringify(r))')));
      agentsHeld.push(held.ok);
      if (!held.ok) throw new Error(`agents:list says the renamed agents are not all absent: ${held.problems.join('; ')}`);
      return true;
    }
    await sleep(300);
  }
  return false;
}
async function pocket(cdp, method, arg) {
  const call = arg === undefined ? `window.gmux.pocket[${J(method)}]()` : `window.gmux.pocket[${J(method)}](${J(arg)})`;
  const text = await cdpEval(cdp, `(async () => { try { const v = await ${call}; return JSON.stringify({ ok: true, value: v === undefined ? null : v }); } catch (e) { return JSON.stringify({ ok: false, error: String((e && e.message) || e) }); } })()`);
  return JSON.parse(text);
}
async function mainSessions(cdp) {
  return JSON.parse(await cdpEval(cdp, 'window.gmux.sessions.list().then((s) => JSON.stringify(s.map((x) => ({ id: x.id, name: x.name, status: x.status, createdAt: x.createdAt, agent: x.agent, agentSessionId: x.agentSessionId ?? null }))))'));
}
async function waitStatus(cdp, test, ms) {
  const started = Date.now();
  let last = null;
  for (;;) {
    const got = await pocket(cdp, 'status');
    last = got.ok ? got.value : null;
    if (last !== null && test(last)) return { ok: true, status: last };
    if (Date.now() - started >= ms) return { ok: false, status: last };
    await sleep(500);
  }
}

// ---------------------------------------------------------------------------
// The planted conversation
// ---------------------------------------------------------------------------

function talkRecordPath() {
  if (!existsSync(TALK_SID)) return null;
  const sid = readFileSync(TALK_SID, 'utf8').trim();
  if (sid === '') return null;
  const dir = join(HOME, '.claude', 'projects', PROJECT.replace(/[^a-zA-Z0-9]/g, '-'));
  return { sid, file: join(dir, `${sid}.jsonl`) };
}

/** One more exchange on the scratch COPY. The committed fixture is never touched. */
function appendTurn(record, nth, askText, answerText) {
  const at = new Date().toISOString();
  const base = { isSidechain: false, userType: 'external', entrypoint: 'cli', cwd: PROJECT, sessionId: record.sid, version: '2.1.238', gitBranch: 'main' };
  const pad = String(nth).padStart(4, '0');
  const lines = [J({ parentUuid: null, ...base, type: 'user', message: { role: 'user', content: askText }, uuid: `3130${pad}-1111-4111-8111-111111111111`, timestamp: at, promptSource: 'typed', promptId: `p313-${pad}`, origin: { kind: 'human' } })];
  if (answerText !== null) {
    lines.push(
      J({
        parentUuid: null,
        ...base,
        message: { model: 'claude-opus-5', id: `msg_p313${pad}`, type: 'message', role: 'assistant', content: [{ type: 'text', text: answerText }] },
        requestId: `req_p313${pad}`,
        type: 'assistant',
        uuid: `3131${pad}-1111-4111-8111-111111111111`,
        timestamp: at
      })
    );
  }
  appendFileSync(record.file, `${lines.join('\n')}\n`, 'utf8');
}

// ---------------------------------------------------------------------------
// The scan: the one-shot secret, and any private key
// ---------------------------------------------------------------------------

/** Every regular file under `root` whose bytes hold any needle. Symlinks are not followed. */
function filesHolding(root, needles) {
  const hits = [];
  let files = 0;
  const walk = (dir) => {
    let entries = [];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const name of entries) {
      const path = join(dir, name);
      let st;
      try {
        st = lstatSync(path);
      } catch {
        continue;
      }
      if (st.isSymbolicLink()) continue;
      if (st.isDirectory()) {
        walk(path);
        continue;
      }
      if (!st.isFile()) continue;
      files += 1;
      let bytes;
      try {
        bytes = readFileSync(path);
      } catch {
        continue;
      }
      for (const [needle, what] of needles) {
        if (bytes.indexOf(needle) !== -1) hits.push(`${relative(RUN, path)} (${what})`);
      }
    }
  };
  if (existsSync(root)) walk(root);
  return { hits, files };
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

let appText = '';
const launches = [];
let lastShim = 0;
let lastApp = 0;
let ran = false;
let preflightOk = false;
let watch = null;
/** The name check's zone servers (Phase 332), in this process on 127.0.0.1. */
let dns = null;
const dnsPreflights = [];
const agentsHeld = [];

const launchOptions = (label) => ({
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
    // THE STAND-IN TAILSCALE (Phase 330). A development build honours this and
    // runs it; a packaged one ignores it, which is why no packaged Tortie is
    // launched here. The door itself binds 127.0.0.1 and nothing else.
    GMUX_TAILSCALE_BIN: standin.binPath,
    // THE DNS STAND-IN (Phase 332): the name check asks it and nothing else.
    // A parent build ignores the variable.
    [NAME_SERVERS_VAR]: dns.servers,
    P313_NEXT: NEXT,
    P313_STOP: STOP,
    P313_TALK_SID: TALK_SID,
    P313_DIALOG: DIALOG,
    P313_STORE: STORE_SRC
  }),
  graceMs: 8_000,
  ceilingMs: 600_000
});

/** Record what a launch printed and which pids it started, whatever happened. */
async function launch(label, body) {
  const pre = preflightStandin(standin, standin.binPath);
  if (!pre.ok) throw new Error(`the preflight refused the launch: ${pre.problems.join('; ')}`);
  // Phase 332: the name check's servers are the loopback stand-in's, or nothing launches.
  const value = launchOptions(label).env[NAME_SERVERS_VAR];
  const dnsPre = await dns.preflight(value);
  dnsPreflights.push(dnsPre.ok && loopbackOnlyServers(value));
  if (!dnsPre.ok) throw new Error(`the DNS preflight refused the launch: ${dnsPre.problems.join('; ')}`);
  writeQuietAgents(PROFILE);
  await withElectron(launchOptions(label), async (handle) => {
    const rec = { shim: handle.pid, app: 0 };
    launches.push(rec);
    lastShim = handle.pid;
    const appNow = () => {
      try {
        rec.app = handle.appPid() || rec.app;
      } catch {
        /* not up */
      }
      lastApp = rec.app;
    };
    try {
      appNow();
      await body(handle, appNow);
    } finally {
      appText += `\n${handle.text()}`;
      appNow();
    }
  });
}

let phone = null;
let sessionsSeen = [];

try {
  // ---- the world ----------------------------------------------------------
  rmSync(RUN, { recursive: true, force: true });
  for (const dir of [HOME, HARNESS, PROFILE, PROJECT, BIN, join(HOME, '.claude')]) mkdirSync(dir, { recursive: true });
  standin = makeStandin({ dir: STANDIN_DIR, scenario: { ...DEFAULT_SCENARIO } });
  const pre = preflightStandin(standin, standin.binPath);
  preflightOk = pre.ok;
  if (!pre.ok) throw new Error(`the preflight refused: ${pre.problems.join('; ')}`);
  dns = await makeDnsStandin({ name: PUBLIC_NAME, mode: 'record' });
  watch = watchForRealTailscale({ roots: () => [lastShim, lastApp].filter((p) => p > 0), everyMs: 1_000 });

  writeFileSync(
    join(BIN, 'claude'),
    `#!/bin/sh
# probe:p313. Not Claude Code. It prints a committed fixture and waits.
case "$1" in
  -v|--version) echo "2.1.238 (Claude Code)"; exit 0;;
esac
sid=""
prev=""
for a in "$@"; do
  if [ "$prev" = "--session-id" ] || [ "$prev" = "--resume" ]; then sid="$a"; fi
  prev="$a"
done
mode=""
if [ -n "$P313_NEXT" ] && [ -f "$P313_NEXT" ]; then
  mode=$(cat "$P313_NEXT")
  rm -f "$P313_NEXT"
fi
if [ "$mode" = "talk" ] && [ -n "$sid" ]; then
  slug=$(printf '%s' "$PWD" | sed 's|[^a-zA-Z0-9]|-|g')
  d="$HOME/.claude/projects/$slug"
  mkdir -p "$d"
  if [ ! -f "$d/$sid.jsonl" ]; then
    sed -e "s|${FIXTURE_SID}|$sid|g" -e "s|${FIXTURE_CWD}|$PWD|g" "$P313_STORE" > "$d/$sid.jsonl"
  fi
  printf '%s\\n' "$sid" > "$P313_TALK_SID"
  echo "p313 a planted conversation; nothing is being asked here"
fi
if [ "$mode" = "ask" ]; then
  sleep 2
  cat "$P313_DIALOG"
fi
while [ ! -f "$P313_STOP" ]; do sleep 1; done
exit 0
`,
    'utf8'
  );
  chmodSync(join(BIN, 'claude'), 0o755);
  writeFileSync(join(HOME, '.zprofile'), `export PATH="${BIN}:$PATH"\n`, 'utf8');
  writeFileSync(join(HOME, '.zshrc'), `export PATH="${BIN}:$PATH"\n`, 'utf8');
  const git = (args) => spawnSync('git', args, { cwd: PROJECT, encoding: 'utf8', env: { ...process.env, HOME } });
  git(['init', '-q']);
  writeFileSync(join(PROJECT, 'note.txt'), 'hello\n');
  git(['add', '-A']);
  git(['-c', 'user.email=p@x', '-c', 'user.name=p', 'commit', '-qm', 'seed']);

  // ======================================================================
  // LAUNCH 1 — the order
  // ======================================================================
  await launch('p313-order', async () => {
    const cdp = await attach(150_000);
    try {
      if (!(await armed(cdp))) {
        arm('the run', null, 'the app never armed its bridge and the harness drives');
        return;
      }
      const hasPocket = await cdpEval(cdp, "typeof window.gmux.pocket === 'object' && window.gmux.pocket !== null");

      // ---- C0: the channel census ---------------------------------------
      // Each channel is pressed with an input main refuses or ignores, so the
      // census changes nothing. `openApproval` with no approval pending opens
      // nothing: main opens only a URL it holds, and it holds none here.
      const HARMLESS = {
        status: undefined,
        pairingState: undefined,
        cancelPairing: undefined,
        removePhone: 'p313-no-such-phone',
        allowPhone: { linesRead: [], hashRead: 'p313-not-a-hash' },
        confirmDoor: { linesRead: [], hashRead: 'p313-not-a-hash' },
        forgetDoor: undefined,
        setPushAlerts: { on: false },
        setDoor: { on: false },
        beginPairing: undefined,
        openApproval: undefined,
        // Phase 316.5: a harness launch never opens the file panel; with no
        // GMUX_HARNESS_ALERTS it answers "nothing chosen" at once (the 316.5
        // fix round, conformance:push P3), and a scratch profile holds no key
        // to forget.
        choosePushKey: undefined,
        forgetPushKey: undefined
      };
      const census = {};
      if (hasPocket === true) {
        for (const channel of CONTRACT_CHANNELS) {
          const method = channel.slice('pocket:'.length);
          const exists = await cdpEval(cdp, `typeof window.gmux.pocket[${J(method)}] === 'function'`);
          if (exists !== true) {
            census[channel] = 'no bridge method';
            continue;
          }
          const got = await pocket(cdp, method, HARMLESS[method]);
          census[channel] = got.ok ? 'answered' : /No handler registered/i.test(got.error) ? 'not registered' : 'refused by main';
        }
      }
      const registered = Object.values(census).filter((v) => v === 'answered' || v === 'refused by main').length;
      report.readings.census = census;
      report.readings.registeredChannels = registered;
      if (AT_PARENT) {
        report.readings.parent = { pocketMember: hasPocket === true, registered, writeRoutes: WRITE_ROUTES, published: await published() };
        arm('C0 the parent reading', true, `window.gmux.pocket is ${hasPocket === true ? 'present' : 'absent'}; ${String(registered)} pocket channel(s) registered; ${String(WRITE_ROUTES)} write route(s) in the table`);
        return;
      }
      arm(
        'C0 every pocket channel answers from main',
        hasPocket === true && CONTRACT_CHANNELS.length > 0 && registered === CONTRACT_CHANNELS.length && WRITES_ARE_318S,
        `${String(registered)} of ${String(CONTRACT_CHANNELS.length)} contract channels registered (${J(census)}); the write routes are ${J(WRITE_ROWS.map((r) => `${r.method} ${r.path}${r.signed ? ' signed' : ''}`))}, exactly POST /v1/end, /v1/choose and /v1/say, each signed`
      );
      if (hasPocket !== true) return;

      // ---- the sessions, first, so the waiting one has time to block -----
      await cdpEval(cdp, `window.__gmuxP93.setup(${J({ path: PROJECT, names: [N.shell, N.gone] })}).then(() => true)`);
      writeFileSync(NEXT, 'talk', 'utf8');
      await cdpEval(cdp, `window.__gmuxP202.createSession(${J(N.talk)}, 'claude').then(() => true).catch(() => false)`);
      for (let i = 0; i < 60 && talkRecordPath() === null; i += 1) await sleep(500);
      rmSync(NEXT, { force: true });
      writeFileSync(NEXT, 'ask', 'utf8');
      await cdpEval(cdp, `window.__gmuxP202.createSession(${J(N.ask)}, 'claude').then(() => true).catch(() => false)`);

      // ---- D0: nothing to pin, nothing published --------------------------
      const early = await pocket(cdp, 'beginPairing');
      const earlyView = await pocket(cdp, 'pairingState');
      arm(
        'D0 pairing is refused while the door is not published',
        early.ok === false && earlyView.ok && earlyView.value.state === 'idle' && !(await published()) && standin.readLog().filter((e) => e.kind === 'funnel').length === 0,
        `beginPairing answered ${early.ok ? 'an offer' : `a refusal (${early.error.slice(0, 160)})`}; the window is ${earlyView.value?.state ?? '?'}; ${String(standin.readFunnel().length)} Funnel child(ren)`
      );

      // ---- D1: turn it on, and nothing is published yet --------------------
      const on = await pocket(cdp, 'setDoor', { on: true });
      // THE READ FIRST (the Phase 330 fix round): the switch answers once its
      // read is queued, with lines over empty fields (`https://:0`) that are
      // never empty, so `confirmLines.length > 0` was true before anything was
      // read. Main's own `confirmable` and a line naming the stand-in are.
      const drawn = await waitStatus(
        cdp,
        (s) =>
          s.confirmState !== 'confirmed' &&
          s.confirmable === true &&
          s.state !== 'opening' &&
          s.confirmLines.some((l) => l.includes(`https://${PUBLIC_NAME}:`)),
        20_000
      );
      await sleep(1_000);
      arm(
        'D1 turning on reads Tailscale, draws the lines and publishes nothing',
        on.ok && drawn.ok && drawn.status.state !== 'listening' && typeof drawn.status.confirmHash === 'string' && !(await published()) &&
          drawn.status.confirmLines.some((l) => l.includes(`https://${PUBLIC_NAME}:8443`)) && standin.readLog().filter((e) => e.kind === 'funnel').length === 0,
        `setDoor on answered ${on.ok ? 'a status' : `a refusal (${on.error})`}; state ${J(drawn.status?.state)}, confirmState ${J(drawn.status?.confirmState)}, ${String(drawn.status?.confirmLines?.length ?? 0)} line(s); ${String(standin.readFunnel().length)} Funnel child(ren)`
      );

      // ---- D2: confirm, and it is published --------------------------------
      const confirmed = drawn.ok ? await pocket(cdp, 'confirmDoor', { linesRead: drawn.status.confirmLines, hashRead: drawn.status.confirmHash }) : { ok: false, error: 'no status to confirm from' };
      const listening = await waitStatus(cdp, (s) => s.state === 'listening', 30_000);
      const child = standin.readFunnel()[0] ?? null;
      report.readings.listening = listening.status === null ? null : { state: listening.status.state, publicName: listening.status.publicName, publicPort: listening.status.publicPort, child: child === null ? null : { publicPort: child.publicPort } };
      arm(
        'D2 the confirm publishes the door through the stand-in',
        confirmed.ok && listening.ok && listening.status.publicName === PUBLIC_NAME && listening.status.publicPort === 8443 && child !== null && child.publicPort === 8443 && (await published()),
        `confirmDoor ${confirmed.ok ? 'answered' : `threw ${confirmed.error}`}; status ${J(report.readings.listening)}`
      );
      if (!listening.ok || child === null) return;

      // ---- K1: the offer ---------------------------------------------------
      // Phase 332: a code may show once main says the name answers, one
      // round of the stand-in; a parent answers no `pairable`.
      await waitStatus(cdp, (s) => s.pairable === true || (s.pairable === undefined && s.state === 'listening'), 75_000);
      const offered = await pocket(cdp, 'beginPairing');
      if (!offered.ok) {
        arm('K1 the offer', false, `beginPairing refused while published: ${offered.error.slice(0, 200)}`);
        return;
      }
      const readBack = readOffer(offered.value.payload);
      if (!readBack.ok) {
        arm('K1 the offer', false, `the code does not read the phone's way: ${readBack.why}`);
        return;
      }
      offer = readBack.offer;
      SECRETS.push(offer.ps);
      const viewAfterOffer = await pocket(cdp, 'pairingState');
      const statusAfterOffer = await pocket(cdp, 'status');
      arm(
        'K1 the offer is v:3: the public name and port, the pin, no tailnet key and no address; nothing the sheet reads carries the secret',
        offer.host === PUBLIC_NAME && offer.port === 8443 && !Object.hasOwn(offer, 'tk') && viewAfterOffer.ok && !J(viewAfterOffer.value).includes(offer.ps) && statusAfterOffer.ok && !J(statusAfterOffer.value).includes(offer.ps),
        `payload keys ${J(Object.keys(offer))}, host ${J(offer.host)}, port ${J(offer.port)}; the window view ${J(viewAfterOffer.value ?? {}).includes(offer.ps) ? 'CARRIES the secret' : 'does not carry the secret'}; the status ${J(statusAfterOffer.value ?? {}).includes(offer.ps) ? 'CARRIES it' : 'does not'}`
      );

      // ---- F1: the pin is the public key's -----------------------------------
      lastLeaf = await leafThroughForwarder();
      const certSha = lastLeaf?.raw ? createHash('sha256').update(lastLeaf.raw).digest() : null;
      const x509Pin = lastLeaf?.raw ? b64u(createHash('sha256').update(new X509Certificate(lastLeaf.raw).publicKey.export({ type: 'spki', format: 'der' })).digest()) : null;
      arm(
        'F1 the QR pins the door’s PUBLIC KEY, not its certificate, through the forwarder',
        pinOfPeer(lastLeaf) === offer.fp && x509Pin === offer.fp && certSha !== null && offer.fp !== b64u(certSha) && offer.fp.toLowerCase() !== certSha.toString('hex'),
        `fp is ${String(offer.fp).length} characters; the leaf's point hashed the phone's way ${pinOfPeer(lastLeaf) === offer.fp ? 'matches' : 'DOES NOT match'}, node's own SPKI export ${x509Pin === offer.fp ? 'matches' : 'DOES NOT match'}, and the certificate's own hash ${certSha !== null && (offer.fp === b64u(certSha) || offer.fp.toLowerCase() === certSha.toString('hex')) ? 'IS what the QR pins' : 'is not'}`
      );

      // ---- P1: present, match, allow, take the certificate -------------------
      phone = makePhone('p313 phone', offer.dx);
      const presented = await ask('POST', '/pair', { 'content-type': 'application/json' }, sealPresentation(offer.ps, phone));
      const state0 = pairAnswerOf(presented).state ?? 'none';
      const sheet = await pocket(cdp, 'pairingState');
      const allowed = sheet.ok && sheet.value.state === 'presented' ? await pocket(cdp, 'allowPhone', { linesRead: sheet.value.lines, hashRead: sheet.value.hash }) : { ok: false, error: 'nothing presented' };
      const again = pairAnswerOf(await ask('POST', '/pair', { 'content-type': 'application/json' }, sealPresentation(offer.ps, phone)));
      const adopted = again.state === 'allowed' ? adoptCertificate(phone, again.cert) : { ok: false, why: `answered ${J(again.state)}` };
      arm(
        'P1 present, match the three-key fingerprint on both screens, Allow, and take the client certificate',
        state0 === 'pending' && sheet.ok && sheet.value.fingerprint === phone.fingerprint && allowed.ok && again.state === 'allowed' && J(again.keys) === J(['cert', 'state']) && adopted.ok,
        `presenting answered ${J(state0)}; the sheet's fingerprint ${sheet.value?.fingerprint === phone.fingerprint ? 'equals' : 'DIFFERS FROM'} the one the phone computed; Allow ${allowed.ok ? 'answered' : `threw ${allowed.error}`}; presenting again answered ${J(again.state)} with ${J(again.keys)}; the certificate ${adopted.ok ? 'names the phone’s client key' : `was refused: ${adopted.why}`}`
      );

      // ---- P2: the photographed QR after Allow --------------------------------
      const viewAfterAllow = await pocket(cdp, 'pairingState');
      const stranger = makePhone('a photographed screen', offer.dx);
      const late = pairAnswerOf(await ask('POST', '/pair', { 'content-type': 'application/json' }, sealPresentation(offer.ps, stranger)));
      const strangerRead = await signedGet(stranger, '/v1/blocked');
      const phonesNow = await pocket(cdp, 'status');
      await pocket(cdp, 'cancelPairing');
      const dead = await ask('POST', '/pair', { 'content-type': 'application/json' }, sealPresentation(offer.ps, stranger));
      const listed = phonesNow.ok && Array.isArray(phonesNow.value.phones) ? phonesNow.value.phones.map((p) => p.id) : [];
      arm(
        'P2 after Allow the QR is worth nothing: a second phone is refused, and once the window shuts no certificate means no HTTP',
        viewAfterAllow.ok && !J(viewAfterAllow.value).includes(offer.ps) && late.state === 'refused' && strangerRead.status !== 200 && J(listed) === J([phone.id]) && dead.status === 0 && dead.handshook === true,
        `a second phone with the same QR inside the window was answered ${J(late.state)} and its read ${verdictOf(strangerRead)}; the sheet lists ${J(listed.length)} phone(s)${J(listed) === J([phone.id]) ? ', the allowed one' : ', NOT just the allowed one'}; after the window shut, /pair with no certificate ${dead.status === 0 ? `was closed after the handshake (${dead.error ?? ''})` : `answered ${verdictOf(dead)}`}`
      );

      // ---- B1: the blocked list, with others ------------------------------
      let blockedAnswer = null;
      let sessions = [];
      const waitStarted = Date.now();
      for (;;) {
        sessions = await mainSessions(cdp);
        const askRow = sessions.find((s) => s.name === N.ask);
        if (askRow?.status === 'needs_input') break;
        if (Date.now() - waitStarted > 90_000) break;
        await sleep(1_000);
      }
      sessionsSeen = sessions;
      const askRow = sessions.find((s) => s.name === N.ask);
      const blocked = await read(phone, '/v1/blocked', 'blocked');
      blockedAnswer = parse(blocked);
      if (askRow?.status !== 'needs_input') {
        arm('B1 the blocked list', null, `${N.ask} never read needs_input in main within 90 s (it read ${J(askRow?.status)}); not a door reading`);
      } else if (blocked.status !== 200 || blockedAnswer === null) {
        arm('B1 the blocked list', false, `/v1/blocked answered ${verdictOf(blocked)}`);
      } else {
        const rows = Array.isArray(blockedAnswer.rows) ? blockedAnswer.rows : [];
        const others = Array.isArray(blockedAnswer.others) ? blockedAnswer.others : [];
        const row = rows.find((r) => r.sessionId === askRow.id);
        const blockedIds = new Set(rows.map((r) => r.sessionId));
        const wantOthers = sessions.filter((s) => !blockedIds.has(s.id)).map((s) => s.id).sort();
        const gotOthers = others.map((r) => r.sessionId).sort();
        const raised = (label) => (typeof label === 'string' && label.length > 0 ? label[0].toUpperCase() + label.slice(1) : label);
        const age = (since, now) => {
          const minutes = Math.floor(Math.max(0, now - since) / 60_000);
          if (minutes < 1) return 'now';
          if (minutes < 60) return `${String(minutes)}m`;
          const hours = Math.floor(minutes / 60);
          return hours < 24 ? `${String(hours)}h` : `${String(Math.floor(hours / 24))}d`;
        };
        report.readings.blocked = { rows: rows.length, others: others.length, othersOmitted: blockedAnswer.othersOmitted, statusTitle: row?.statusTitle, ageText: row?.ageText, choices: row?.choices?.length ?? 0, blockedSinceMinusCreatedAt: row === undefined ? null : row.blockedSince - askRow.createdAt, ageNote: blockedAnswer.ageNote };
        arm(
          'B1 the waiting session is the one row, in main’s words',
          row !== undefined && rows.length === 1 && row.statusLabel === 'needs input' && row.statusTitle === raised(row.statusLabel) && row.statusTitle === 'Needs input' && (row.seenAtWake === true || row.ageText === age(row.blockedSince, blockedAnswer.at)) && Array.isArray(row.choices) && row.choices.length > 0,
          `${String(rows.length)} row(s); ${N.ask} ${row === undefined ? 'is NOT one of them' : `reads ${J(row.statusLabel)} titled ${J(row.statusTitle)}, age ${J(row.ageText)} against ${J(age(row.blockedSince, blockedAnswer.at))} re-derived here, ${String(row.choices?.length ?? 0)} choice(s)`}`
        );
        arm('B1b it blocked AFTER it was created, and the age says so', row !== undefined && typeof askRow.createdAt === 'number' && row.blockedSince > askRow.createdAt, row === undefined ? 'no row' : `blockedSince − createdAt = ${String(row.blockedSince - askRow.createdAt)} ms`);
        arm(
          'O1 others is exactly every listed session that is not blocked',
          J(gotOthers) === J(wantOthers) && gotOthers.every((id) => !blockedIds.has(id)) && (OTHERS_MAX === null || others.length <= OTHERS_MAX) && blockedAnswer.othersOmitted === Math.max(0, wantOthers.length - (OTHERS_MAX ?? Infinity)) && (AGE_NOTE === null || blockedAnswer.ageNote === AGE_NOTE),
          `main lists ${String(sessions.length)} session(s), ${String(rows.length)} blocked; others holds ${String(others.length)} (${gotOthers.length === wantOthers.length ? 'the same count' : `WANT ${String(wantOthers.length)}`}), ${J(gotOthers) === J(wantOthers) ? 'the same ids' : 'DIFFERENT ids'}; othersOmitted ${J(blockedAnswer.othersOmitted)}`
        );
      }

      // ---- S1 and T1: the planted conversation ------------------------------
      const record = talkRecordPath();
      const talk = sessions.find((s) => s.name === N.talk);
      if (record === null || talk === undefined) {
        arm('S1 the planted conversation', null, `the fake claude never planted the record (${record === null ? 'no session id file' : 'no session row'})`);
      } else {
        report.readings.talk = { sessionId: talk.id, agentSessionId: talk.agentSessionId, recordMatches: talk.agentSessionId === record.sid };
        const detailAnswer = await read(phone, `/v1/session?id=${encodeURIComponent(talk.id)}`, 'session talk');
        const detail = parse(detailAnswer)?.session ?? null;
        arm(
          'S1 one session, with its counts and its last answer',
          detailAnswer.status === 200 && detail !== null && detail.turnCount > 0 && detail.activity !== null && typeof detail.activity === 'object' && (detail.lastAnswer === null || typeof detail.lastAnswer === 'string') && detail.handoff === null && (detail.lastMessageText === null) === (detail.activity.lastMessageAt === null),
          `/v1/session answered ${verdictOf(detailAnswer)}: ${detail === null ? 'no body' : `${String(detail.turnCount)} turn(s), last answer ${typeof detail.lastAnswer === 'string' ? `${String(detail.lastAnswer.length)} characters` : J(detail.lastAnswer)}`}`
        );
        const paged = await pageBack(phone, talk.id, 2, 'turns talk');
        const turns = paged.pages.slice().reverse().flatMap((p) => p.turns);
        const indexes = turns.map((t) => t.index);
        const contiguous = indexes.every((ix, i) => i === 0 || ix === indexes[i - 1] + 1);
        const overlapFree = new Set(indexes).size === indexes.length;
        const absenceOk = turns.every((t) => (t.answerText === null ? ABSENCES.includes(t.absence) : t.absence === null));
        report.readings.paged = { pages: paged.pages.length, turns: turns.length, first: indexes[0] ?? null, last: indexes[indexes.length - 1] ?? null, turnCount: detail?.turnCount ?? null };
        arm(
          'T1 paged back to the first turn, the count drawn equals the turn count',
          paged.ok && detail !== null && turns.length === detail.turnCount && contiguous && overlapFree && paged.pages[paged.pages.length - 1]?.more === false && absenceOk,
          `${String(paged.pages.length)} page(s) of at most 2, ${String(turns.length)} turn(s) against turnCount ${J(detail?.turnCount)}; indexes ${contiguous ? 'contiguous' : 'NOT contiguous'} and ${overlapFree ? 'never repeated' : 'REPEATED'}${paged.ok ? '' : `; ${paged.why}`}`
        );

        const marker = `p313 appended ask ${randomBytes(4).toString('hex')}`;
        const reply = `p313 appended answer ${randomBytes(4).toString('hex')}, read back through the door`;
        appendTurn(record, 1, marker, reply);
        const fresh = await read(phone, `/v1/turns?id=${encodeURIComponent(talk.id)}&limit=1`, 'turns talk after append');
        const newest = parse(fresh)?.turns?.[0] ?? null;
        const again2 = parse(await read(phone, `/v1/session?id=${encodeURIComponent(talk.id)}`, 'session talk after append'))?.session ?? null;
        arm(
          'T2 a turn appended to the record is on the very next read, of the turns and of the session',
          fresh.status === 200 && newest !== null && newest.askText === marker && newest.answerText === reply && again2 !== null && again2.lastAnswer === reply && detail !== null && again2.turnCount === detail.turnCount + 1,
          `the next /v1/turns answered ${verdictOf(fresh)} and its newest ask ${newest?.askText === marker ? 'IS the appended one' : 'is NOT'}; turnCount ${J(again2?.turnCount)} after ${J(detail?.turnCount)}`
        );

        const word = `p313${'w'.repeat(4_000 - 4)}`;
        appendTurn(record, 2, word, null);
        const long = await read(phone, `/v1/turns?id=${encodeURIComponent(talk.id)}&limit=1`, 'turns talk long ask');
        const longTurn = parse(long)?.turns?.[0] ?? null;
        arm(
          'T3 a 4,000-character one-word ask comes back whole, and its absence is said',
          long.status === 200 && longTurn !== null && longTurn.askText === word && longTurn.askClipped === false && longTurn.answerText === null && ABSENCES.includes(longTurn.absence),
          `answered ${verdictOf(long)}; the ask is ${String(longTurn?.askText?.length ?? 0)} characters (${longTurn?.askText === word ? 'byte for byte' : 'NOT the one written'}), absence ${J(longTurn?.absence)}`
        );

        const hostile = [];
        for (const [name, query, want] of [
          ['backwards', 'from=5&to=2', 'refused-404'],
          ['negative to', 'to=-5', 'refused-404'],
          ['negative from', 'from=-3&to=2', 'refused-404'],
          ['2^53', `to=${String(2 ** 53)}`, 'refused-404'],
          ['2^53 from', `from=${String(2 ** 53)}&to=${String(2 ** 53 + 2)}`, 'refused-404'],
          ['not a number', 'to=abc', 'refused-404'],
          ['a limit of 2^53', `limit=${String(2 ** 53)}`, 'ok']
        ]) {
          const got = await read(phone, `/v1/turns?id=${encodeURIComponent(talk.id)}&${query}`, `turns hostile ${name}`);
          const body = parse(got);
          hostile.push({ name, want, verdict: verdictOf(got), turns: Array.isArray(body?.turns) ? body.turns.length : null, bounded: body === null || !Array.isArray(body.turns) || body.turns.length <= 200, sane: body === null || !Array.isArray(body.turns) || body.turns.every((t) => Number.isSafeInteger(t.index) && t.index >= 0) });
        }
        const pageA = parse(await read(phone, `/v1/turns?id=${encodeURIComponent(talk.id)}&limit=3&to=4`, 'turns overlap a'));
        const pageB = parse(await read(phone, `/v1/turns?id=${encodeURIComponent(talk.id)}&limit=3&to=5`, 'turns overlap b'));
        const shared = (pageA?.turns ?? []).filter((t) => (pageB?.turns ?? []).some((u) => u.index === t.index));
        const agree = shared.every((t) => J(t) === J((pageB?.turns ?? []).find((u) => u.index === t.index)));
        report.readings.hostilePages = { hostile, overlapShared: shared.length, overlapAgree: agree };
        arm(
          'A1 page indexes an attacker chooses are refused, a huge limit is clamped, and overlapping pages agree',
          hostile.every((h) => h.verdict === h.want && h.bounded && h.sane) && shared.length > 0 && agree,
          `${hostile.map((h) => `${h.name}: ${h.verdict}${h.verdict === h.want ? '' : ` (WANT ${h.want})`}`).join('; ')}; two overlapping pages share ${String(shared.length)} turn(s) and ${agree ? 'agree byte for byte' : 'DISAGREE'}`
        );
      }

      // ---- A2: a removed session, and a session with no record -------------
      const shell = sessions.find((s) => s.name === N.shell);
      const gone = sessions.find((s) => s.name === N.gone);
      if (gone !== undefined) {
        await cdpEval(cdp, `window.gmux.sessions.kill(${J(gone.id)}).then(() => true).catch(() => false)`);
        await sleep(1_500);
        await cdpEval(cdp, `window.gmux.sessions.discard(${J(gone.id)}).then(() => true).catch(() => false)`);
        await sleep(1_000);
      }
      const goneListed = (await mainSessions(cdp)).some((s) => s.id === gone?.id);
      const goneSession = gone === undefined ? null : await read(phone, `/v1/session?id=${encodeURIComponent(gone.id)}`, 'session removed');
      const goneTurns = gone === undefined ? null : await read(phone, `/v1/turns?id=${encodeURIComponent(gone.id)}`, 'turns removed');
      const shellTurns = shell === undefined ? null : await read(phone, `/v1/turns?id=${encodeURIComponent(shell.id)}`, 'turns shell');
      const shellBody = shellTurns === null ? null : parse(shellTurns);
      arm(
        'A2 a removed session is refused, and a session with no record answers an empty page',
        gone !== undefined && !goneListed && verdictOf(goneSession) === 'refused-404' && verdictOf(goneTurns) === 'refused-404' && shellTurns !== null && shellTurns.status === 200 && Array.isArray(shellBody?.turns) && shellBody.turns.length === 0,
        `${N.gone} is ${goneListed ? 'STILL LISTED' : 'no longer listed'}; its /v1/session answered ${goneSession === null ? '?' : verdictOf(goneSession)} and its /v1/turns ${goneTurns === null ? '?' : verdictOf(goneTurns)}; ${N.shell}'s /v1/turns answered ${shellTurns === null ? '?' : verdictOf(shellTurns)}`
      );
      arm('A2b a remote row’s turns', true, 'NOT DRIVEN HERE: no harness makes a second machine. conformance:pocket:hostile drives the shipping composer with a remote row');
    } finally {
      cdp.close();
    }
  });
  if (AT_PARENT || phone === null || phone.certPem === null) {
    ran = true;
  } else {
    // ======================================================================
    // LAUNCH 2 — the relaunch
    // ======================================================================
    await launch('p313-relaunch', async (handle) => {
      const cdp = await attach(150_000);
      try {
        if (!(await armed(cdp))) {
          arm('R1 the relaunch', null, 'the app never armed its bridge');
          return;
        }
        const up = await waitStatus(cdp, (s) => s.state === 'listening', 45_000);
        const reread = await read(phone, '/v1/blocked', 'blocked after relaunch');
        arm(
          'R1 the relaunch is publishing with no press, and the paired phone still reads through the new child',
          up.ok && up.status.confirmState === 'confirmed' && standin.readFunnel().length === 1 && reread.status === 200,
          `status ${J({ state: up.status?.state, confirmState: up.status?.confirmState, refusal: up.status?.refusal })}; ${String(standin.readFunnel().length)} Funnel child(ren); /v1/blocked answered ${verdictOf(reread)}`
        );

        // ---- A3: a Remove INSIDE the composition, and refusal 7's reason ------
        const sessions = await mainSessions(cdp);
        const talk = sessions.find((s) => s.name === N.talk);
        const askRow = sessions.find((s) => s.name === N.ask);
        const REPLAY_LINE = /refused a request (?:on the tailnet door|at the door): replay/;
        const UNPAIRED_LINE = /refused a request (?:on the tailnet door|at the door): unpaired/;
        const readable = [talk, askRow].filter((s) => typeof s?.agentSessionId === 'string' && s.agentSessionId.length > 0);
        if (talk === undefined || readable.length < 2) {
          arm('A3 a Remove inside the composition', null, `the chain needs two sessions with a conversation id to yield between (${J(readable.map((s) => s.name))}), so the Remove could not be placed`);
        } else {
          const ids = readable.map((s) => s.id);
          const flood = (n) => `(() => { const ids = ${J(ids)}; const at = performance.now(); window.__p313flood = Promise.all(Array.from({ length: ${String(n)} }, () => window.gmux.overview.activity({ sessionIds: ids }).catch(() => null))).then(() => performance.now() - at); return true; })()`;
          const CALIBRATE = 1_000;
          await cdpEval(cdp, flood(CALIBRATE));
          const calibrationMs = Number(await cdpEval(cdp, 'window.__p313flood', 60_000));
          const perCall = Math.max(0.02, calibrationMs / CALIBRATE);
          const TARGET_MS = Number(process.env['P313_A3_HOLD_MS'] ?? '') || 1_200;
          const calls = Math.min(20_000, Math.max(200, Math.ceil(TARGET_MS / perCall)));
          const target = `/v1/turns?id=${encodeURIComponent(talk.id)}&limit=200`;
          const twice = signedTwice(phone, target);
          const textBefore = handle.text().length;
          await cdpEval(cdp, flood(calls));
          const first = twice.send();
          await first.written;
          const second = twice.send();
          let replayed = false;
          try {
            await handle.waitForLine(REPLAY_LINE, Math.max(5_000, TARGET_MS * 3));
            replayed = REPLAY_LINE.test(handle.text().slice(textBefore));
          } catch {
            replayed = false;
          }
          if (replayed) {
            const waitedFrom = Date.now();
            while (first.settled === second.settled && Date.now() - waitedFrom < 3_000) await sleep(5);
          }
          const pendingAtPress = [first, second].filter((x) => !x.settled);
          const removing = pocket(cdp, 'removePhone', phone.id);
          const [removed, a1, a2] = await Promise.all([removing, first.answer, second.answer]);
          const floodMs = Number(await cdpEval(cdp, 'window.__p313flood', 120_000).catch(() => NaN));
          const composed = pendingAtPress.length === 1 ? (pendingAtPress[0] === first ? a1 : a2) : null;
          let reason = false;
          try {
            await handle.waitForLine(UNPAIRED_LINE, 10_000);
            reason = UNPAIRED_LINE.test(handle.text().slice(textBefore));
          } catch {
            reason = false;
          }
          answers.push({ label: 'turns composed while Remove was pressed', target, status: composed?.status ?? null, body: composed?.body ?? '' });
          const after = await read(phone, '/v1/blocked', 'blocked after remove');
          const statusAfter = await pocket(cdp, 'status');
          report.readings.a3 = { calibrationMs, calls, floodMs, replayed, pendingAtPress: pendingAtPress.length, first: verdictOf(a1), second: verdictOf(a2), composed: composed === null ? null : verdictOf(composed), refusal7Reason: reason };
          const placed = replayed && pendingAtPress.length === 1;
          const said =
            `the chain held ${String(calls)} activity call(s) for ${Number.isFinite(floodMs) ? `${String(Math.round(floodMs))} ms` : '?'}; ` +
            `the replay was ${replayed ? 'refused, so one sending had passed verify' : 'NOT seen'}; ${String(pendingAtPress.length)} sending(s) in flight at the press; ` +
            `removePhone ${removed.ok ? 'answered' : `threw ${removed.error}`}; the composed one ${composed === null ? 'is unknown' : verdictOf(composed)}; ` +
            `main ${reason ? 'printed' : 'did NOT print'} refusal 7's reason (unpaired); the next /v1/blocked answered ${verdictOf(after)}; ` +
            `the sheet lists ${J(statusAfter.value?.phones?.length ?? null)} phone(s), state ${J(statusAfter.value?.state)}, ${String(standin.readFunnel().length)} Funnel child(ren)`;
          if (!placed) {
            arm('A3 a Remove inside the composition', null, `the Remove could not be PLACED after verify on this run: ${said}`);
          } else {
            const settled = composed.status === 404 || (composed.status === 0 && !/timed out/.test(composed.error ?? ''));
            arm(
              'A3 a Remove after verify and before the answer: refused by refusal 7 for its own reason, never answered',
              removed.ok && settled && reason && verdictOf(after) !== 'ok' && statusAfter.ok && Array.isArray(statusAfter.value.phones) && statusAfter.value.phones.length === 0 && statusAfter.value.state !== 'listening' && statusAfter.value.confirmState !== 'confirmed',
              said
            );
          }
        }
      } finally {
        cdp.close();
      }
    });

    // ======================================================================
    // LAUNCH 3 — nothing is confirmed any more
    // ======================================================================
    let exitedCleanly = null;
    await launch('p313-unconfirmed', async (handle) => {
      const cdp = await attach(150_000);
      try {
        if (!(await armed(cdp))) {
          arm('L1 the unconfirmed relaunch', null, 'the app never armed its bridge');
          return;
        }
        await sleep(6_000);
        const got = await pocket(cdp, 'status');
        const s = got.ok ? got.value : null;
        const up = await published();
        arm(
          'L1 enabled and bindAtLaunch with no agreement: the relaunch publishes nothing, and says why',
          s !== null && s.bindAtLaunch === true && s.state === 'refused' && s.confirmState !== 'confirmed' && typeof s.refusal === 'string' && s.refusal.length > 0 && !up && standin.readFunnel().length === 0,
          `status ${J({ state: s?.state, bindAtLaunch: s?.bindAtLaunch, confirmState: s?.confirmState, refusal: s?.refusal })}; ${String(standin.readFunnel().length)} Funnel child(ren)`
        );
        await cdpEval(
          cdp,
          `(() => { try { window.gmux.quit(); } catch {} ; window.gmux.pocket.setDoor({ on: false }).catch(() => null); window.gmux.pocket.setDoor({ on: true }).catch(() => null); window.gmux.pocket.confirmDoor(${J({ linesRead: s?.confirmLines ?? [], hashRead: s?.confirmHash ?? '' })}).catch(() => null); return true; })()`,
          10_000
        ).catch(() => null);
        exitedCleanly = await Promise.race([handle.exited, sleep(30_000).then(() => null)]);
      } finally {
        cdp.close();
      }
    });
    await sleep(1_000);
    const afterQuit = await published();
    arm('A4 setDoor during quit: the app exits and nothing is published afterwards', exitedCleanly !== null && !afterQuit && standin.readFunnel().length === 0, `the app ${exitedCleanly === null ? 'did NOT exit on its own within 30 s' : `exited with ${String(exitedCleanly)}`}; ${String(standin.readFunnel().length)} Funnel child(ren) afterwards`);
    ran = true;
  }
} catch (err) {
  arm('the run', null, `it threw: ${String(err?.stack ?? err)}`);
} finally {
  try {
    writeFileSync(STOP, 'stop\n', 'utf8');
  } catch {
    /* the world may already be gone */
  }
  // Every stand-in process this run left, by pid, whatever happened.
  const ended = standin === null ? { ended: [], left: [] } : endStandinProcesses(STANDIN_DIR, 1_500);
  const findings = watch?.stop() ?? [];
  const log = standin?.readLog() ?? [];
  const nameRows = dns?.log() ?? [];
  if (dns !== null) await dns.close();
  report.readings.run = { preflight: preflightOk, realTailscale: findings, notThisRun: watch?.notOurs() ?? [], samples: watch?.samples() ?? 0, forbidden: log.filter((e) => e.forbidden === true).length, refused: log.filter((e) => e.verdict === 'refused').length, ended: ended.ended.length, left: ended.left.length };
  if (standin !== null) {
    arm(
      'RUN no real Tailscale, nothing forbidden, no stand-in left',
      preflightOk && findings.length === 0 && (watch?.samples() ?? 0) > 0 && report.readings.run.forbidden === 0 && report.readings.run.refused === 0 && ended.left.length === 0,
      `preflight ${preflightOk ? 'passed' : 'REFUSED'}; ${String(watch?.samples() ?? 0)} sample(s), ${String(findings.length)} real Tailscale process(es) seen; ${String(report.readings.run.forbidden)} forbidden and ${String(report.readings.run.refused)} refused argv at the stand-in; ${String(ended.ended.length)} stand-in pid(s) ended here, ${String(ended.left.length)} left`
    );
  }
  // ---- N1 (Phase 332): the name check asked the loopback stand-in, and rightly --
  if (dns !== null) {
    const verdict = nameQuestionsVerdict({ expect: !AT_PARENT && log.some((e) => e.kind === 'funnel'), rows: nameRows, name: PUBLIC_NAME });
    report.readings.nameQuestions = nameRows;
    arm(
      'N1 the name check asked only the DNS stand-in, an A question with RD 0 for the stand-in’s name, and no agent was started',
      verdict.ok && dnsPreflights.length > 0 && dnsPreflights.every((x) => x === true) && agentsHeld.length > 0 && agentsHeld.every((x) => x === true),
      `${verdict.said}; the DNS preflight ${J(dnsPreflights)} at each launch; the renamed agents ${J(agentsHeld)} absent at each launch`
    );
  }
}

// ---- K2: the one-shot secret's bytes, and any private key, anywhere --------
if (!AT_PARENT && ran && SECRETS.length > 0) {
  const needles = SECRETS.flatMap((s) => [
    [Buffer.from(s, 'utf8'), 'a window’s secret as text'],
    [Buffer.from(s, 'base64url'), 'a window’s secret as bytes']
  ]);
  needles.push([Buffer.from('PRIVATE KEY-----', 'utf8'), 'a PEM private key']);
  const scanned = [HARNESS, HOME].map((root) => filesHolding(root, needles));
  const hits = scanned.flatMap((s) => s.hits);
  const files = scanned.reduce((n, s) => n + s.files, 0);
  const printed = SECRETS.some((s) => appText.includes(s)) || appText.includes('PRIVATE KEY-----');
  report.readings.secretScan = { files, hits, printed, windows: SECRETS.length };
  arm(
    'K2 the window’s secret and any private key are in no file and in nothing the app printed',
    files > 0 && hits.length === 0 && !printed,
    `${String(files)} file(s) under the profile, the harness directory and the scratch HOME read for ${String(SECRETS.length)} window secret(s) and any PEM private key; ${hits.length === 0 ? 'none holds either' : `found in ${J(hits)}`}; the app's own output ${printed ? 'CARRIES one' : 'does not'}`
  );
}

if (KEEP) {
  mkdirSync(join(RUN, 'rederive'), { recursive: true });
  writeFileSync(
    join(RUN, 'rederive', 'answers.json'),
    `${J({ note: 'Synthetic: every session, turn and phone here is this run’s own.', profile: PROFILE, home: HOME, sessions: sessionsSeen, answers: answers.map((a) => ({ ...a, body: unsecret(a.body) })) }, null, 1)}\n`,
    { mode: 0o600 }
  );
  say(`kept the scratch world at ${RUN}; the re-derivation reads ${join(RUN, 'rederive', 'answers.json')}`);
} else {
  rmSync(RUN, { recursive: true, force: true });
}

// ---- Electron, counted once, at the end ------------------------------------------
const commandOf = (pid) => (spawnSync('ps', ['-p', String(pid), '-o', 'command='], { encoding: 'utf8' }).stdout ?? '').trim();
const ps = spawnSync('ps', ['-Ao', 'pid,ppid,rss,comm'], { encoding: 'utf8' });
const electronLines = (ps.stdout ?? '').split('\n').filter((l) => /Electron|Tortie$|chrome_crashpad/.test(l) && !/defunct/.test(l));
const ours = electronLines.filter((l) => {
  const [pid, ppid] = l.trim().split(/\s+/).map(Number);
  if (launches.some((x) => [x.shim, x.app].filter((p) => p > 0).some((p) => pid === p || ppid === p))) return true;
  return commandOf(pid).includes(PROFILE);
});
report.readings.electron = { lines: electronLines.length, ofThisRun: ours.length };
arm('no Electron of this run is left', ours.length === 0, `${String(electronLines.length)} Electron line(s) on the machine (the operator’s own Tortie included), ${String(ours.length)} of this run`);

const OUT = join(ROOT, 'out', 'p313');
mkdirSync(OUT, { recursive: true });
const outFile = join(OUT, `probe-p313${AT_PARENT ? '-parent' : ''}.json`);
writeFileSync(outFile, `${unsecret(J(report, null, 1))}\n`, 'utf8');
say(`wrote ${outFile}`);
const unreadable = report.arms.filter((a) => a.ok === null).length;
if (AT_PARENT && failures === 0) {
  say('probe:p313 at the parent: the parent reading is taken');
  process.exit(0);
}
if (ran && failures === 0 && unreadable > 0) {
  say(`probe:p313 could not READ ${String(unreadable)} arm(s) at this build; that is not a pass`);
  process.exit(2);
}
say(!ran ? 'probe:p313 did not complete' : failures === 0 ? 'probe:p313 OK' : `probe:p313 FAILED ${String(failures)} arm(s)`);
process.exit(ran && failures === 0 ? 0 : 1);
