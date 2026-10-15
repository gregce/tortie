#!/usr/bin/env node
/**
 * probe:p33312 — THE PHASE 333.12 APP RUN: "a Mac update that adds a door
 * route silently turns off every paired phone until Allow" (build/p33312/SPEC.md
 * §7, §9.3). One scratch profile, RELAUNCHED across four builds, ONE Electron at
 * a time:
 *
 *   PARENT          `P33312_PARENT_CHECKOUT`, the release v0.111.1, built
 *   PARENT_PLANTED  `P33312_PARENT_PLANTED`, a second v0.111.1 copy with
 *                   build/p33312/plant.mjs's twelfth route, built
 *   HEAD            this checkout, built (`npm run build`)
 *   HEAD_PLANTED    `P33312_HEAD_PLANTED`, a copy of this checkout, planted and
 *                   built with the bundler alone
 *
 * Run as `node build/harness-socket.mjs --fresh gmux-p33312 'node build/p33312/probe-p33312.mjs'`
 * (the `probe:p33312` script the main session adds at landing), which hands it
 * GMUX_TMUX_SOCKET (`gmux-p33312-…`, never `gmux`) and GMUX_HARNESS_DIR.
 *
 * THE SIX LAUNCHES AND THEIR ARMS (SPEC §7.3), in this order:
 *
 *   L1 PARENT, the stranger's Mac (setup). Door on, its lines, Allow; published
 *      through the stand-in; the scratch key kept through the override; alerts
 *      on, Allow; phones A and B paired (v:3, the proof, each presenting an
 *      alert address); both read /v1/blocked 200; a session newly blocks and
 *      the APNs stand-in records an alert.
 *      B1  grades it. No arm after it is readable unless L1 reached two paired,
 *          reading phones with an alert recorded.
 *   L2 HEAD, the update that fixes it, NO PRESS.
 *      U1  published; `confirmed`; nothing waiting; the eleven allowed; the
 *          agreement's hash L1's byte for byte; no `[data-phone-confirm]` in
 *          Settings then Phone; both phones read; a new block sends an alert.
 *   L3 PARENT_PLANTED, the parent measured, NO PRESS.
 *      M1  `changed`; never published; no `funnel` argv at the stand-in this
 *          launch; no door process under the app; both phones refused at the
 *          last forwarder port; a new block sends nothing in 45 s; and the
 *          sealed pocket.json and config-confirmations.json byte for byte what
 *          L2 left.
 *   L4 HEAD_PLANTED, a route waits.
 *      H1  published with no press; `confirmed`; `probe` waiting; the eleven
 *          allowed; the door process and the Funnel child found
 *      H2  both phones read /v1/blocked and /v1/screen; a `keys` write of
 *          `p33312` into a scratch shell answers `done` and this file's own
 *          `capture-pane -p` shows it; a new block sends an alert
 *      H3  phone A's signed GET /v1/probe answers 404 with no body, three times
 *      H4  Settings then Phone: step 2 `published` holding exactly ONE
 *          `[data-phone-confirm]`, its lines main's `confirmLines`, its route
 *          line naming `probe`, its honesty line today's sentence byte for byte
 *      H5  his answer 10: phone C paired through the pairing card, whose lines
 *          do NOT name `probe`; `probe` still waits and still reads 404 after
 *      H6  his answer 10: alerts off by the sheet's own switch: still
 *          `confirmed` with no Allow, `probe` still waits and reads 404, the
 *          door and Funnel pids unchanged, a new block sends nothing in 45 s
 *      H7  the Allow, clicked on the real `confirm-door` element over lines that
 *          name `probe`: nothing waits within 10 s, /v1/probe answers 200
 *          `{"planted":true}`, the door and Funnel pids unchanged
 *      H8  his answer 9: Remove of phone C by the sheet's own button: A and B
 *          read 200 within 5 s and every read after, C is refused at the
 *          handshake, still `confirmed`, pids unchanged
 *      H9  the control: a moved public name still shuts the door, and the name
 *          put back and Try again publishes it again with no Allow
 *   L5 PARENT, the downgrade.
 *      DG1 `changed` (the record holds twelve routes, the parent hashes
 *          eleven), never published, both phones refused; then the switch off
 *          and on (the parent writes its store, dropping `allowedRoutes`),
 *          still never published; /v1/probe never answered
 *   L6 HEAD_PLANTED, the upgrade back.
 *      DG2 `changed`, never published and /v1/probe never answered before the
 *          Allow; the Allow over lines naming `probe` publishes it, and
 *          /v1/probe answers 200. Never wider than what a person allowed.
 *      DG1 and DG2 are READ ONLY FROM A TWELVE-ROUTE AGREEMENT: L4 must end on
 *          a confirmed door that allows `probe` with nothing waiting
 *          (`downgradeReadable`). Otherwise both are UNREADABLE and L5 and L6
 *          are not launched, because a downgrade from an eleven-route record,
 *          or from none, measures nothing this phase claims and would report
 *          a defect an L4 arm already reported as a downgrade's.
 *   RUN the preflights at every launch, the renamed agents read back at every
 *       launch, no real Tailscale sampled, nothing forbidden or refused at the
 *       stand-in, main's UDP to 127.0.0.1 alone, the APNs stand-in on
 *       127.0.0.1 alone, no Electron, stand-in or scratch key of this run left,
 *       the scratch socket file gone, his two history files unmoved, and
 *       app.log holding no token, nonce, signature, PEM line or alert address.
 *
 * Every verdict is read from OUTSIDE the app: the node phones, the stand-ins'
 * own logs and records, `ps`, this file's own `capture-pane -p` on the scratch
 * socket, and `window.gmux.pocket.status()` over CDP. Never from a report the
 * app wrote about itself. Presses are the sheet's own: `window.gmux.pocket.*`
 * exactly as Settings then Phone calls it, and, where the arm is about the
 * BUTTON (H6, H7, H8, DG2), a click dispatched on the real element.
 *
 * TWO PRESSES THE SHEET DOES NOT DRAW, said here so nobody reads them as
 * shortcuts. H9's moved name is seen by the door only when it reads Tailscale
 * again, and Try again on a published, confirmed door reads nothing
 * (`setDoor`'s first line returns), so the moved field is made to matter the
 * way probe:p330's A8 and probe:p332's H5 make a moved tailnet matter: this
 * file sends SIGINT to the stand-in's own Funnel child, by pid, after
 * re-reading that its command line names build/p330/tailscale-standin.mjs, and
 * the door's restart reads the moved name. The name put back, Try again is
 * `window.gmux.pocket.setDoor({ on: true })`, which is exactly what the sheet's
 * Try again calls (`onRetryDoor`); on a `changed` face the sheet draws the
 * confirm block instead of that button, which H9 records as `retryDrawn`.
 *
 * WHAT IS SUPPLIED, and nothing else (the shared pieces, IMPORTED):
 *   - TAILSCALE: build/p330/tailscale-standin.mjs behind a scratch wrapper named
 *     by GMUX_TAILSCALE_BIN, preflighted by sha256 before every launch and
 *     sampled every second; a real Tailscale under the app, or run as a
 *     command, fails the run, and one a live process outside the run owns (his
 *     own Tortie's door) is reported by pid;
 *   - DNS: build/p332/dns-standin.mjs IN THIS PROCESS on 127.0.0.1, named by
 *     GMUX_POCKET_NAME_SERVERS, preflighted before every launch; main's UDP is
 *     sampled with lsof every 2 s and any peer that is not 127.0.0.1 ends the
 *     launch and fails the run;
 *   - APPLE: build/p314/apns-stand-in.mjs IN THIS PROCESS on 127.0.0.1, named
 *     by GMUX_HARNESS_ALERTS's alerts.json beside a scratch P-256 key made here,
 *     written 0600 and deleted in the `finally` and by an `exit` net; his key
 *     is never read and nothing reads his keychain (`--use-mock-keychain`);
 *   - THE PHONES: build/p316/node-phone.mjs, dialling the stand-in's loopback
 *     forwarder with the code's public name as SNI and Host;
 *   - THE AGENT: the `claude` on the scratch PATH is a /bin/sh script this file
 *     writes, printing the COMMITTED Phase 312 dialog fixture, so a session
 *     blocks with no vendor process and no token;
 *   - build/hidden-agents.mjs before EVERY launch, its precheck run against
 *     that launch's own checkout and `agents:list` read back, so gemini, qwen,
 *     antigravity, grok and droid are never started.
 * It imports probe:p3167's route-line prefix. It imports nothing of
 * probe:p313's or probe:p3332's: both start their run at module top level, so
 * importing either would launch an Electron (probe:p3332's header says the
 * same of the probes it learned from); their attach, press and launch shapes
 * are written again here over the shared modules above.
 *
 * WHAT IT REFUSES, exit 2 before anything starts: no GMUX_TMUX_SOCKET of the
 * shape `gmux-p33312…-<pid>`; no GMUX_HARNESS_DIR; any of the four checkouts
 * missing, unbuilt, or with an out/ older than its sources (probe:p340's
 * rule); a parent checkout that already holds this phase's route ledger, or a
 * head checkout that does not; a planted checkout without plant.mjs's marker in
 * its own shape, or whose planted files no longer read what the plant wrote; an
 * unplanted checkout carrying the marker; the same checkout named twice; an
 * unknown arm in P33312_ARMS; any stand-in's preflight; his home that cannot
 * be named. His `~/.zsh_history` and `~/.bash_history` are stat'ed (size and
 * modified time, nothing else) at the start and the end, and a move FAILS the
 * run and says so.
 *
 * WHAT IT NEVER DOES: name `-L gmux` or the default server; run `pkill`,
 * `killall` or a pattern; signal a pid it did not start, except the stand-in's
 * Funnel child in H9 and the stand-in pids its own helper ends, each after
 * re-reading its command line; spend a token; read a credential, a keychain
 * item or his live profile; photograph anything.
 *
 * WHAT IT WRITES: out/p33312/probe-p33312.json, per arm a verdict, its failed
 * clauses and its reading (pids, hashes and counts; never a key, a token, a
 * signature, a nonce or a one-shot secret). P33312_KEEP=1 keeps the scratch
 * world and writes <run>/rederive/ with every distinct status and every phone
 * answer, for the verifier's own reader. P33312_ARMS picks arms (comma list of
 * B1, U1, M1, H1 to H9, DG1, DG2, RUN): the launches a picked arm depends on
 * still run as setup, and an arm not picked is driven but not graded.
 *
 * VERIFIERS ONLY, under THE LOCK: it starts Electrons. Builders write it and
 * run only the self-test, which grades recorded fixtures for every arm, each
 * shown red on its own break and green on its honest reading, and starts
 * nothing (no Electron, no stand-in, no shell):
 *
 *   node build/p33312/probe-p33312.mjs --grader-self-test
 *
 * NEVER through `npm run`, which would hand the flag to harness-socket.mjs (the
 * probe:p336 lesson). Cost: not yet measured; budget 15 to 25 minutes (six
 * launches and three 45-second quiet waits), the four builds made first.
 *
 * Exit 0 when every graded arm passed, 1 when one failed, 2 when it could not
 * run or an arm could not be READ, which is never a pass.
 */

import { spawnSync } from 'node:child_process';
import { createHash, generateKeyPairSync, randomBytes } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { userInfo } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { withElectron, withoutDevRenderer } from '../electron-run.mjs';
import { cdpEval, wsConnect } from '../cdp-client.mjs';
import { pickRendererTarget } from '../cdp-target.mjs';
import { gradeFixtures } from '../probe-graders.mjs';
import { AGENTS_LIST_EXPR, hiddenAgentsPrecheck, hiddenAgentsScanVerdict, writeHiddenAgents } from '../hidden-agents.mjs';
import { DEFAULT_SCENARIO, endStandinProcesses, makeStandin, preflightStandin, processRows, watchForRealTailscale } from '../p330/tailscale-standin.mjs';
import { NAME_SERVERS_VAR, QTYPE, loopbackOnlyServers, makeDnsStandin, nameQuestionProblems, sameName } from '../p332/dns-standin.mjs';
import { STAND_IN_HOST, startApnsStandIn } from '../p314/apns-stand-in.mjs';
import { makePhone, pairThrough, readOffer, request, screenTarget, signedHeaders, signedHeadersFor, writeAnswerOf, writeBodyOf } from '../p316/node-phone.mjs';
import { ROUTE_PREFIX } from '../p3167/probe-p3167.mjs';
import { EDITS, LEDGER_FILE, MARKER, markerProblems, pathRefusal, planPlant, readMarker, textsOf } from './plant.mjs';

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

/** The eleven routes every 0.111.x Mac answered, sorted (LEGACY_ALLOWED_ROUTES, launch.wire.json). */
export const ELEVEN = Object.freeze(['blocked', 'choose', 'end', 'keys', 'pair', 'say', 'screen', 'scrollback', 'session', 'sessions', 'turns']);
/** The route build/p33312/plant.mjs adds. */
export const PLANTED = 'probe';
/** POCKET_DOOR_HONESTY, byte for byte (src/shared/ipc/pocket.ts). */
export const HONESTY =
  'A phone you allow can see what any session’s terminal shows and what it printed before, ' +
  'type into it as you would at this Mac, answer a numbered question, send a session one message and end a session.';
/** The alerts switch's label (PhoneSection.tsx PUSH_LABEL). */
export const PUSH_LABEL = 'Alert my phone when a session waits';
/** The stand-in's public name, and the name H9 moves it to. Both made up. */
export const PUBLIC_NAME = DEFAULT_SCENARIO.dnsName.replace(/\.$/, '');
export const MOVED_NAME = 'p33312-moved.tail00000.ts.net';
/** Ten capitals or digits, the shape of Apple's own key file name. A scratch key's, never his. */
export const KEY_ID = 'P33312SCRT';
/** The phone app's bundle id, the topic Apple's stand-in accepts (src/main/alerts/key-file.ts PHONE_APP_TOPIC). */
export const TOPIC = 'com.itavero.tortie.phone';
/** A quiet wait: a block that must send nothing is watched this long (SPEC §7.3). */
export const QUIET_MS = 45_000;
/** H7: the Allow takes effect within this. */
export const ALLOW_WITHIN_MS = 10_000;
/** H8: the other phones read within this. */
export const READ_WITHIN_MS = 5_000;
/** The text H2 types, which the scratch shell's prompt (`q % `) never draws. */
export const KEYS_TEXT = 'p33312';
/** Every arm, in the order it is graded. */
export const ARM_IDS = Object.freeze(['B1', 'U1', 'M1', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'H7', 'H8', 'H9', 'DG1', 'DG2', 'RUN']);
/** The launch each arm is read in. RUN is read after all of them. */
export const LAUNCH_OF = Object.freeze({ B1: 'L1', U1: 'L2', M1: 'L3', H1: 'L4', H2: 'L4', H3: 'L4', H4: 'L4', H5: 'L4', H6: 'L4', H7: 'L4', H8: 'L4', H9: 'L4', DG1: 'L5', DG2: 'L6', RUN: null });
/** The sources whose change makes a build stale (probe:p340's rule), where a checkout has them. */
export const STALE_SOURCES = Object.freeze([
  'src/main/pocket/ipc.ts',
  'src/main/pocket/pairing.ts',
  'src/main/pocket/server.ts',
  'src/main/pocket/writes.ts',
  'src/main/pocket/bind.ts',
  'src/main/pocket/door/wire.ts',
  'src/main/pocket/door/listener.ts',
  'src/main/pocket/door/table.ts',
  'src/main/pocket/allowed-routes.ts',
  'src/main/pocket/route-ledger.ts',
  'src/main/capabilities.ts',
  'src/shared/ipc/pocket.ts',
  'src/renderer/settings/PhoneSection.tsx',
  'src/renderer/settings/phone/steps.ts'
]);

// ---------------------------------------------------------------------------
// Pure readers, shared by the run and the self-test
// ---------------------------------------------------------------------------

/** The ids the door's route line names, or null when no line is the route line. */
export function routeLineOf(lines) {
  if (!Array.isArray(lines)) return null;
  const line = lines.find((l) => typeof l === 'string' && l.startsWith(ROUTE_PREFIX));
  if (line === undefined) return null;
  return line
    .slice(ROUTE_PREFIX.length)
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s !== '');
}
/** Does the route line among `lines` name `id` as one of its items? */
export const routeLineNames = (lines, id) => (routeLineOf(lines) ?? []).includes(id);
/** Two lists holding the same distinct strings. */
export const sameSet = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length && new Set(a).size === a.length && a.every((x) => b.includes(x));
/** `[]` exactly. */
export const isEmptyList = (a) => Array.isArray(a) && a.length === 0;
/** `['probe']` exactly. */
export const waitsForProbe = (a) => Array.isArray(a) && a.length === 1 && a[0] === PLANTED;

/**
 * Is `typed` on a prompt line of `pane`, after the scratch shell's prompt
 * (zsh draws `q % `, bash the literal `q %# `)? H2 reads its keys write by
 * this and never by the text anywhere on the pane, because every scratch path
 * this run makes holds `p33312` too, so a pane that printed one would read as
 * typed (the probe review, Phase 333.12).
 */
export function typedOnPrompt(pane, typed) {
  if (typeof pane !== 'string' || typeof typed !== 'string' || typed === '') return false;
  return pane.split('\n').some((line) => {
    const m = /^q %#? (.*)$/.exec(line);
    return m !== null && m[1].includes(typed);
  });
}

/**
 * Can DG1 and DG2 be read from the status L4 ended on? Only when that door is
 * confirmed, allows the planted route and has nothing waiting: the one outside
 * reading that says the agreement on record holds twelve routes, which is what
 * the downgrade is measured against (the probe review, Phase 333.12).
 */
export function downgradeReadable(status) {
  if (status === null || typeof status !== 'object') return { ok: false, why: 'L4 left no status to read' };
  if (status.confirmState !== 'confirmed') return { ok: false, why: `L4 ended ${String(status.confirmState)}` };
  if (!Array.isArray(status.routesAllowed) || !status.routesAllowed.includes(PLANTED)) return { ok: false, why: `L4 ended allowing ${J(status.routesAllowed ?? null)}, without ${PLANTED}` };
  if (!isEmptyList(status.routesWaiting)) return { ok: false, why: `L4 ended with ${J(status.routesWaiting ?? null)} waiting` };
  return { ok: true, why: '' };
}

/**
 * How many of `needles` are in `text`. A needle shorter than 12 characters is
 * not one this file can tell from an ordinary word, so it is never counted.
 */
export function secretHits(text, needles) {
  if (typeof text !== 'string' || text === '') return 0;
  let hits = 0;
  for (const needle of new Set(needles)) {
    if (typeof needle !== 'string' || needle.length < 12) continue;
    if (text.includes(needle)) hits += 1;
  }
  return hits;
}

/**
 * The name questions the app asked, held to Phase 332's clause over the two
 * names this run ever gives the stand-in (H9 moves it): every one an A, RD 0,
 * for one of them; at least one question in all. An empty list is a pass.
 */
export function questionsProblems(rows, names = [PUBLIC_NAME, MOVED_NAME]) {
  if (!Array.isArray(rows) || rows.length === 0) return ['the DNS stand-in was asked nothing, so no name check reached it'];
  const problems = [];
  const [first, ...rest] = names;
  const ofRest = rows.filter((r) => rest.some((n) => sameName(r.qname, n)));
  const ofFirst = rows.filter((r) => !rest.some((n) => sameName(r.qname, n)));
  if (ofFirst.length > 0) problems.push(...nameQuestionProblems(ofFirst, first));
  for (const n of rest) {
    const mine = ofRest.filter((r) => sameName(r.qname, n));
    if (mine.length > 0) problems.push(...nameQuestionProblems(mine, n));
  }
  return problems;
}

/** The scratch socket's file, where tmux puts it. */
export function socketPathOf(socket, env = process.env, uid = process.getuid?.() ?? 0) {
  const base = (env['TMUX_TMPDIR'] ?? '').trim() || '/private/tmp';
  return join(base, `tmux-${String(uid)}`, socket);
}

/**
 * A `/v1/screen` answer body exactly as the door sent it to phone A in the
 * Phase 333.12 verify's run 1 (lens 2's kept `answers.json`, launch L4,
 * `A screen`): synthetic, a scratch shell this probe made. The self-test reads
 * {@link keysContextOf} over it.
 */
const REAL_SCREEN_ANSWER = '{"sessionId":"1fcf81b4-5c0e-4cff-bdde-2a072fed600e","revision":"12777d0bd06f","at":1792042771277,"unchanged":false,"screen":{"cols":80,"rows":24,"cursor":{"x":4,"y":0,"visible":true},"alternate":false,"ground":"#131417","ink":"#d8dbe2","caret":"#e8eaed","styles":[{"fg":"#d8dbe2","bg":null,"bold":false,"dim":false,"italic":false,"underline":false,"strike":false}],"lines":[[{"text":"q %","style":0,"cells":3}],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[]],"turn":"73a1aaf155390ed2-0","asking":false,"dialog":null,"typable":true,"depth":1,"space":"f38ed86ce5f4"},"why":null,"sentence":null}';

/**
 * What a keys write must carry, read from a `/v1/screen` answer as the phone
 * reads it: the picture's own `turn` and `dialog`, which the door answers
 * INSIDE `screen` (the `ScreenPicture` of src/shared/ipc/pocket.ts; probe:p337
 * reads `pic?.turn` the same way). Null when the answer holds no picture or no
 * turn, so H2 reads as not readable rather than sending a write the Mac must
 * refuse. THE FIX ROUND (lens 2): H2 read both from the top of the answer, so
 * its keys body carried no turn and the Mac rightly answered `malformed`.
 */
export function keysContextOf(answer) {
  const pic = answer !== null && typeof answer === 'object' ? answer.screen : null;
  if (pic === null || typeof pic !== 'object' || typeof pic.turn !== 'string' || pic.turn.length === 0) return null;
  const dialog = pic.dialog ?? null;
  return { turn: pic.turn, dialog: typeof dialog === 'string' ? dialog : null };
}

/** What makes one checkout unusable for its role. Reads files, starts nothing. */
export function checkoutProblems(dir, { planted = null, ledger } = {}) {
  const problems = [];
  const bundle = join(dir, 'out', 'main', 'index.js');
  if (!existsSync(dir)) return [`${dir} does not exist`];
  if (!existsSync(bundle)) problems.push(`${bundle} is missing; build that checkout first`);
  else {
    const built = statSync(bundle).mtimeMs;
    const newer = STALE_SOURCES.filter((s) => existsSync(join(dir, s)) && statSync(join(dir, s)).mtimeMs > built);
    if (newer.length > 0) problems.push(`${dir}'s out/ is older than ${newer.join(', ')}; build it again`);
  }
  const hasLedger = existsSync(join(dir, LEDGER_FILE));
  if (ledger === true && !hasLedger) problems.push(`${dir} has no ${LEDGER_FILE}, so it is not a build of this phase`);
  if (ledger === false && hasLedger) problems.push(`${dir} already holds ${LEDGER_FILE}, so it is not the parent (v0.111.1)`);
  if (planted === null) {
    if (existsSync(join(dir, MARKER))) problems.push(`${dir} carries ${MARKER}, so it is planted and cannot stand for an unplanted build`);
  } else {
    problems.push(...markerProblems(dir, planted));
  }
  return problems;
}

/** The launches the picked arms need, in order. L1 always; DG arms need L4 and L5. */
export function launchesFor(arms) {
  const want = new Set(arms);
  const any = (...ids) => ids.some((id) => want.has(id));
  const out = ['L1'];
  if (any('U1', 'M1')) out.push('L2');
  if (any('M1')) out.push('L3');
  if (any('H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'H7', 'H8', 'H9', 'DG1', 'DG2')) out.push('L4');
  if (any('DG1', 'DG2')) out.push('L5');
  if (any('DG2')) out.push('L6');
  return out;
}

// ---------------------------------------------------------------------------
// THE GRADERS: pure, over a recorded reading, each clause shown to fail
// ---------------------------------------------------------------------------

const samePids = (p) => p !== null && typeof p === 'object' && p.doorBefore > 0 && p.funnelBefore > 0 && p.doorAfter === p.doorBefore && p.funnelAfter === p.funnelBefore;

export const GRADERS = {
  B1: {
    title: 'the stranger’s Mac at v0.111.1: published, two phones paired with alerts, an alert sent',
    clauses: [
      ['the parent’s door listened after its Allow', (r) => r.doorListened === true],
      ['the scratch key was kept through the override', (r) => r.keyKept === true],
      ['alerts on, allowed again, and the door listened', (r) => r.alertsAllowed === true],
      ['two phones paired with an alert address, and each read /v1/blocked 200', (r) => Array.isArray(r.phones) && r.phones.length === 2 && r.phones.every((p) => p.paired === true && p.alertAddress === true && p.read === 200)],
      ['a session newly blocked and the APNs stand-in recorded an alert', (r) => r.blocked === true && r.alerts >= 1],
      ['the agreement reads confirmed, with a hash to compare', (r) => r.confirmState === 'confirmed' && typeof r.confirmHash === 'string' && r.confirmHash.length > 0]
    ]
  },
  U1: {
    title: 'the update over it, with no press: every phone and its alerts keep working',
    clauses: [
      ['published at launch with no press', (r) => isEmptyList(r.presses) && r.published === true],
      ['confirmed, nothing waiting, the eleven allowed', (r) => r.confirmState === 'confirmed' && isEmptyList(r.routesWaiting) && sameSet(r.routesAllowed, ELEVEN)],
      ['the agreement is L1’s byte for byte', (r) => typeof r.confirmHash === 'string' && r.confirmHash.length > 0 && r.confirmHash === r.parentHash],
      ['Settings then Phone draws no confirm block', (r) => r.sheetRead === true && r.confirmBlocks === 0],
      ['both phones read /v1/blocked 200', (r) => r.reads?.A === 200 && r.reads?.B === 200],
      ['a new block sent an alert', (r) => r.blocked === true && r.alerts >= 1]
    ]
  },
  M1: {
    title: 'the parent with a route planted: the whole door and every alert go dark',
    clauses: [
      ['the agreement reads changed', (r) => r.confirmState === 'changed'],
      ['never published', (r) => r.everListening === false && r.forwarderSeen === false],
      ['the stand-in saw no funnel argv this launch', (r) => r.funnelArgv === 0],
      // The app's pid must be known, or no process was looked at and the
      // clause would pass on nothing (the probe review).
      ['no door process under the app', (r) => r.appPid > 0 && r.doorProcesses === 0],
      ['both phones are refused at the last forwarder port', (r) => r.lastForwarderPort > 0 && r.phones?.A === 0 && r.phones?.B === 0],
      ['a new block sent nothing in 45 s', (r) => r.blocked === true && r.requests === 0 && r.waitedMs >= QUIET_MS],
      ['the sealed store and the record are byte for byte what L2 left', (r) => r.files?.pocketSame === true && r.files?.confirmationsSame === true]
    ]
  },
  H1: {
    title: 'the head with a route planted, with no press: published, and only the new route waits',
    clauses: [
      ['published with no press', (r) => isEmptyList(r.presses) && r.published === true],
      ['confirmed, probe waiting, the eleven allowed', (r) => r.confirmState === 'confirmed' && waitsForProbe(r.routesWaiting) && sameSet(r.routesAllowed, ELEVEN)],
      ['the door process and the Funnel child were found', (r) => r.doorPid > 0 && r.funnelPid > 0]
    ]
  },
  H2: {
    title: 'reads, keys and alerts keep working while a route waits',
    clauses: [
      ['both phones read /v1/blocked and /v1/screen', (r) => ['A', 'B'].every((p) => r.reads?.[p]?.blocked === 200 && r.reads?.[p]?.screen === 200)],
      ['a keys write answered done and the pane shows it', (r) => r.keys?.outcome === 'done' && r.keys?.before === false && r.keys?.captured === true],
      ['a new block sent an alert', (r) => r.blocked === true && r.alerts >= 1]
    ]
  },
  H3: {
    title: 'the waiting route answers 404 with no body, as an older Mac does',
    clauses: [
      ['three reads of /v1/probe', (r) => Array.isArray(r.statuses) && r.statuses.length === 3],
      ['each answered 404 with no body', (r) => Array.isArray(r.statuses) && r.statuses.length > 0 && r.statuses.every((s) => s === 404) && Array.isArray(r.bodyBytes) && r.bodyBytes.every((b) => b === 0)]
    ]
  },
  H4: {
    title: 'Settings then Phone: today’s block under Published, its lines naming the waiting route',
    clauses: [
      ['step 2 reads published', (r) => r.publishState === 'published'],
      ['exactly one confirm block, inside step 2', (r) => r.confirmBlocks === 1 && r.confirmInPublish === 1],
      ['its lines are main’s confirmLines', (r) => Array.isArray(r.lines) && r.lines.length > 0 && J(r.lines) === J(r.statusLines)],
      ['its route line names probe', (r) => routeLineNames(r.lines, PLANTED)],
      ['its honesty line is today’s sentence byte for byte', (r) => Array.isArray(r.warnings) && r.warnings[1] === HONESTY]
    ]
  },
  H5: {
    title: 'his answer 10: the pairing Allow never allows the waiting route',
    clauses: [
      ['phone C paired through the pairing card', (r) => r.paired === true],
      ['the card’s route line does not name probe', (r) => routeLineOf(r.cardLines) !== null && !routeLineNames(r.cardLines, PLANTED)],
      ['probe still waits after the pairing Allow', (r) => r.confirmState === 'confirmed' && waitsForProbe(r.routesWaiting)],
      ['/v1/probe still reads 404', (r) => r.probe === 404]
    ]
  },
  H6: {
    title: 'his answer 10: alerts off never allows the waiting route, and restarts nothing',
    clauses: [
      ['the sheet’s switch turned alerts off', (r) => r.clicked === true && r.pushAlerts === false],
      ['still confirmed with no Allow pressed', (r) => r.confirmState === 'confirmed' && r.allowPressed === false],
      ['probe still waits and reads 404', (r) => waitsForProbe(r.routesWaiting) && r.probe === 404],
      ['the door and the Funnel child did not restart', (r) => samePids(r.pids)],
      ['a new block sent nothing in 45 s', (r) => r.blocked === true && r.requests === 0 && r.waitedMs >= QUIET_MS]
    ]
  },
  H7: {
    title: 'only the Allow whose lines name the route allows it, with no restart',
    clauses: [
      ['Allow was pressed over lines that name probe', (r) => r.clicked === true && r.linesNamedProbe === true],
      ['nothing waits within 10 s', (r) => isEmptyList(r.routesWaiting) && typeof r.waitedMs === 'number' && r.waitedMs <= ALLOW_WITHIN_MS],
      ['/v1/probe answers 200 {"planted":true} within 10 s', (r) => r.probe?.status === 200 && r.probe?.planted === true && r.probe?.ms <= ALLOW_WITHIN_MS],
      ['the door and the Funnel child did not restart', (r) => samePids(r.pids)]
    ]
  },
  H8: {
    title: 'his answer 9: Remove of one phone keeps the others reading, with no Allow',
    clauses: [
      ['the sheet’s Remove took phone C', (r) => r.clicked === true && typeof r.removedId === 'string' && r.removedId.length > 0 && Array.isArray(r.phoneIds) && !r.phoneIds.includes(r.removedId) && r.phoneIds.length === 2],
      ['A and B read 200 within 5 s and every read after', (r) => ['A', 'B'].every((p) => typeof r.firstOkMs?.[p] === 'number' && r.firstOkMs[p] <= READ_WITHIN_MS && r.afterFirst?.[p] === true)],
      ['phone C is refused at the handshake', (r) => r.removedRead === 0],
      ['still confirmed, and nothing restarted', (r) => r.confirmState === 'confirmed' && samePids(r.pids)]
    ]
  },
  H9: {
    title: 'the control: a moved public name still shuts the door, and comes back with no Allow',
    clauses: [
      ['a moved name reads changed, the Funnel child gone and the phones refused', (r) => r.signalled === true && r.movedState === 'changed' && r.funnelGone === true && r.refused?.A === 0 && r.refused?.B === 0],
      ['the name put back and Try again: published with no Allow', (r) => r.retried === true && r.restored?.state === 'listening' && r.restored?.confirmState === 'confirmed' && r.allowPressed === false],
      ['phone A reads again', (r) => r.readAfter === 200]
    ]
  },
  DG1: {
    title: 'the downgrade: the parent reads the twelve-route agreement as changed, and opens nothing',
    clauses: [
      ['the parent reads changed', (r) => r.confirmState === 'changed'],
      ['never published, and both phones refused', (r) => r.everListening === false && r.forwarderSeen === false && r.funnelArgv === 0 && r.phones?.A === 0 && r.phones?.B === 0],
      ['the switch off and on wrote the store and still published nothing', (r) => r.switched === true && r.storeMoved === true && r.afterSwitch?.everListening === false && r.afterSwitch?.confirmState !== 'confirmed'],
      ['/v1/probe never answered', (r) => r.probeAnswered === false && r.probeTries > 0]
    ]
  },
  DG2: {
    title: 'the upgrade back: changed until a person allows, never wider',
    clauses: [
      ['changed, and never published before the Allow', (r) => r.confirmState === 'changed' && r.everListening === false && r.forwarderSeen === false],
      ['/v1/probe never answered before the Allow', (r) => r.probeAnsweredBefore === false && r.probeTries > 0],
      ['the Allow over lines that name probe publishes it', (r) => r.clicked === true && r.linesNamedProbe === true && r.after?.state === 'listening' && r.after?.confirmState === 'confirmed' && isEmptyList(r.after?.routesWaiting)],
      ['/v1/probe answers 200 after it', (r) => r.probe?.status === 200 && r.probe?.planted === true]
    ]
  },
  RUN: {
    title: 'no real Tailscale, DNS or Apple, no agent, nothing left, his history unmoved',
    clauses: [
      ['the Tailscale preflight held at every launch', (r) => r.launches > 0 && r.tailscalePreflights.length === r.launches && r.tailscalePreflights.every((x) => x === true)],
      ['the DNS preflight held at every launch', (r) => r.launches > 0 && r.dnsPreflights.length === r.launches && r.dnsPreflights.every((x) => x === true)],
      ['the hidden agents were renamed and read back at every launch', (r) => r.launches > 0 && r.agentsPrecheck.length === r.launches && r.agentsScan.length === r.launches && [...r.agentsPrecheck, ...r.agentsScan].every((x) => x === true)],
      ['no real Tailscale in any sample, nothing forbidden or refused at the stand-in', (r) => r.samples > 0 && r.realTailscale === 0 && r.forbidden === 0 && r.refusedArgv === 0],
      ['main’s UDP went to 127.0.0.1 alone, and every name question was an A, RD 0, for the stand-in’s names', (r) => r.udpSamples > 0 && r.udpLeaks === 0 && isEmptyList(r.questionProblems)],
      ['the APNs stand-in listened on 127.0.0.1 alone', (r) => r.apnsLoopback === true],
      ['no Electron, stand-in or scratch key of this run is left', (r) => r.electronLeft === 0 && r.standinLeft === 0 && r.keyFileGone === true],
      ['the scratch socket file is gone', (r) => r.socketGone === true],
      ['his two history files did not move', (r) => r.historySame === true],
      ['app.log holds no token, nonce, signature, PEM line or alert address', (r) => r.appLogRead === true && r.appLogHits === 0]
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
// The fixtures: each grader's honest reading, and one break per clause
// ---------------------------------------------------------------------------

const HASH = 'a'.repeat(64);
const PIDS = { doorBefore: 501, doorAfter: 501, funnelBefore: 502, funnelAfter: 502 };
const ROUTE_LINE_12 = `${ROUTE_PREFIX} blocked, choose, end, keys, pair, probe, say, screen, scrollback, session, sessions, turns`;
const ROUTE_LINE_11 = `${ROUTE_PREFIX} blocked, choose, end, keys, pair, say, screen, scrollback, session, sessions, turns`;

export const GRADER_FIXTURES = {
  B1: {
    pass: {
      doorListened: true,
      keyKept: true,
      alertsAllowed: true,
      phones: [
        { label: 'A', paired: true, alertAddress: true, read: 200 },
        { label: 'B', paired: true, alertAddress: true, read: 200 }
      ],
      blocked: true,
      alerts: 2,
      confirmState: 'confirmed',
      confirmHash: HASH
    },
    breaks: {
      'the parent’s door listened after its Allow': (r) => void (r.doorListened = false),
      'the scratch key was kept through the override': (r) => void (r.keyKept = false),
      'alerts on, allowed again, and the door listened': (r) => void (r.alertsAllowed = false),
      'two phones paired with an alert address, and each read /v1/blocked 200': (r) => void (r.phones[1].read = 0),
      'a session newly blocked and the APNs stand-in recorded an alert': (r) => void (r.alerts = 0),
      'the agreement reads confirmed, with a hash to compare': (r) => void (r.confirmState = 'changed')
    },
    refused: [
      { what: 'one phone paired, not two', clause: 'two phones paired with an alert address, and each read /v1/blocked 200', edit: (r) => void r.phones.pop() },
      { what: 'a phone paired with no alert address', clause: 'two phones paired with an alert address, and each read /v1/blocked 200', edit: (r) => void (r.phones[0].alertAddress = false) }
    ]
  },
  U1: {
    pass: { presses: [], published: true, confirmState: 'confirmed', routesWaiting: [], routesAllowed: [...ELEVEN].reverse(), confirmHash: HASH, parentHash: HASH, sheetRead: true, confirmBlocks: 0, reads: { A: 200, B: 200 }, blocked: true, alerts: 1 },
    breaks: {
      'published at launch with no press': (r) => void (r.presses = ['confirmDoor']),
      'confirmed, nothing waiting, the eleven allowed': (r) => void (r.confirmState = 'changed'),
      'the agreement is L1’s byte for byte': (r) => void (r.confirmHash = 'b'.repeat(64)),
      'Settings then Phone draws no confirm block': (r) => void (r.confirmBlocks = 1),
      'both phones read /v1/blocked 200': (r) => void (r.reads.B = 0),
      'a new block sent an alert': (r) => void (r.alerts = 0)
    },
    refused: [
      // The outage itself, as the parent's update would read it.
      { what: 'a door that never published', clause: 'published at launch with no press', edit: (r) => void (r.published = false) },
      { what: 'a twelfth route allowed by itself on update', clause: 'confirmed, nothing waiting, the eleven allowed', edit: (r) => void (r.routesAllowed = [...ELEVEN, PLANTED]) },
      { what: 'a route waiting where none was added', clause: 'confirmed, nothing waiting, the eleven allowed', edit: (r) => void (r.routesWaiting = [PLANTED]) },
      { what: 'a sheet never read', clause: 'Settings then Phone draws no confirm block', edit: (r) => void (r.sheetRead = false) }
    ]
  },
  M1: {
    pass: { confirmState: 'changed', everListening: false, forwarderSeen: false, funnelArgv: 0, statusAsked: 0, appPid: 4242, doorProcesses: 0, nodeServices: 0, lastForwarderPort: 50111, phones: { A: 0, B: 0 }, blocked: true, requests: 0, waitedMs: 45_100, files: { pocketSame: true, confirmationsSame: true } },
    breaks: {
      'the agreement reads changed': (r) => void (r.confirmState = 'confirmed'),
      'never published': (r) => void (r.everListening = true),
      'the stand-in saw no funnel argv this launch': (r) => void (r.funnelArgv = 1),
      'no door process under the app': (r) => void (r.doorProcesses = 1),
      'both phones are refused at the last forwarder port': (r) => void (r.phones.A = 200),
      'a new block sent nothing in 45 s': (r) => void (r.requests = 1),
      'the sealed store and the record are byte for byte what L2 left': (r) => void (r.files.pocketSame = false)
    },
    refused: [
      { what: 'a quiet wait cut short', clause: 'a new block sent nothing in 45 s', edit: (r) => void (r.waitedMs = 30_000) },
      { what: 'no forwarder port to dial', clause: 'both phones are refused at the last forwarder port', edit: (r) => void (r.lastForwarderPort = 0) },
      { what: 'the record rewritten by the parent', clause: 'the sealed store and the record are byte for byte what L2 left', edit: (r) => void (r.files.confirmationsSame = false) },
      { what: 'an app whose pid was never found, so no process was looked at', clause: 'no door process under the app', edit: (r) => void (r.appPid = 0) }
    ]
  },
  H1: {
    pass: { presses: [], published: true, confirmState: 'confirmed', routesWaiting: [PLANTED], routesAllowed: [...ELEVEN], doorPid: 501, funnelPid: 502 },
    breaks: {
      'published with no press': (r) => void (r.presses = ['setDoor']),
      'confirmed, probe waiting, the eleven allowed': (r) => void (r.routesWaiting = []),
      'the door process and the Funnel child were found': (r) => void (r.doorPid = 0)
    },
    refused: [
      { what: 'the new route served on update', clause: 'confirmed, probe waiting, the eleven allowed', edit: (r) => void (r.routesAllowed = [...ELEVEN, PLANTED]) },
      { what: 'the door shut on update', clause: 'confirmed, probe waiting, the eleven allowed', edit: (r) => void (r.confirmState = 'changed') }
    ]
  },
  H2: {
    pass: { reads: { A: { blocked: 200, screen: 200 }, B: { blocked: 200, screen: 200 } }, keys: { outcome: 'done', before: false, captured: true }, blocked: true, alerts: 1 },
    breaks: {
      'both phones read /v1/blocked and /v1/screen': (r) => void (r.reads.B.screen = 404),
      'a keys write answered done and the pane shows it': (r) => void (r.keys.captured = false),
      'a new block sent an alert': (r) => void (r.alerts = 0)
    },
    refused: [
      { what: 'the text already on the pane before the write', clause: 'a keys write answered done and the pane shows it', edit: (r) => void (r.keys.before = true) },
      { what: 'a keys write refused', clause: 'a keys write answered done and the pane shows it', edit: (r) => void (r.keys.outcome = 'refused') }
    ]
  },
  H3: {
    pass: { statuses: [404, 404, 404], bodyBytes: [0, 0, 0] },
    breaks: {
      'three reads of /v1/probe': (r) => void r.statuses.pop(),
      'each answered 404 with no body': (r) => void (r.statuses[2] = 200)
    },
    refused: [{ what: 'a 404 carrying a body', clause: 'each answered 404 with no body', edit: (r) => void (r.bodyBytes[0] = 17) }]
  },
  H4: {
    pass: {
      publishState: 'published',
      confirmBlocks: 1,
      confirmInPublish: 1,
      lines: ['Publishes https://p330-mac.tail00000.ts.net:8443', ROUTE_LINE_12],
      statusLines: ['Publishes https://p330-mac.tail00000.ts.net:8443', ROUTE_LINE_12],
      warnings: ['the confirm warning', HONESTY]
    },
    breaks: {
      'step 2 reads published': (r) => void (r.publishState = 'changed'),
      'exactly one confirm block, inside step 2': (r) => void (r.confirmBlocks = 2),
      'its lines are main’s confirmLines': (r) => void (r.lines = [r.lines[0]]),
      'its route line names probe': (r) => void (r.lines = r.statusLines = ['Publishes https://p330-mac.tail00000.ts.net:8443', ROUTE_LINE_11]),
      'its honesty line is today’s sentence byte for byte': (r) => void (r.warnings[1] = `${HONESTY} It can also read a planted probe.`)
    },
    refused: [
      { what: 'a block drawn outside step 2', clause: 'exactly one confirm block, inside step 2', edit: (r) => void (r.confirmInPublish = 0) },
      { what: 'a route named only as a word inside another line', clause: 'its route line names probe', edit: (r) => void (r.lines = r.statusLines = ['Publishes https://probe.tail00000.ts.net:8443', ROUTE_LINE_11]) }
    ]
  },
  H5: {
    pass: { paired: true, cardLines: ['Publishes https://p330-mac.tail00000.ts.net:8443', ROUTE_LINE_11, 'Phone p33312 C'], confirmState: 'confirmed', routesWaiting: [PLANTED], probe: 404 },
    breaks: {
      'phone C paired through the pairing card': (r) => void (r.paired = false),
      'the card’s route line does not name probe': (r) => void (r.cardLines[1] = ROUTE_LINE_12),
      'probe still waits after the pairing Allow': (r) => void (r.routesWaiting = []),
      '/v1/probe still reads 404': (r) => void (r.probe = 200)
    },
    refused: [{ what: 'a card with no route line at all', clause: 'the card’s route line does not name probe', edit: (r) => void (r.cardLines = ['Phone p33312 C']) }]
  },
  H6: {
    pass: { clicked: true, pushAlerts: false, confirmState: 'confirmed', allowPressed: false, routesWaiting: [PLANTED], probe: 404, pids: { ...PIDS }, blocked: true, requests: 0, waitedMs: 45_100 },
    breaks: {
      'the sheet’s switch turned alerts off': (r) => void (r.pushAlerts = true),
      'still confirmed with no Allow pressed': (r) => void (r.confirmState = 'changed'),
      'probe still waits and reads 404': (r) => void (r.routesWaiting = []),
      'the door and the Funnel child did not restart': (r) => void (r.pids.doorAfter = 777),
      'a new block sent nothing in 45 s': (r) => void (r.requests = 1)
    },
    refused: [
      // Today's sheet confirms the narrower door itself; with a route waiting
      // that self-confirm would agree to the proposal and serve the route.
      { what: 'the old self-confirm allowing the waiting route', clause: 'probe still waits and reads 404', edit: (r) => void Object.assign(r, { routesWaiting: [], probe: 200 }) },
      { what: 'the door restarted by the press', clause: 'the door and the Funnel child did not restart', edit: (r) => void (r.pids.funnelAfter = 778) },
      { what: 'an Allow pressed to get back', clause: 'still confirmed with no Allow pressed', edit: (r) => void (r.allowPressed = true) }
    ]
  },
  H7: {
    pass: { clicked: true, linesNamedProbe: true, routesWaiting: [], waitedMs: 600, probe: { status: 200, planted: true, ms: 900 }, pids: { ...PIDS } },
    breaks: {
      'Allow was pressed over lines that name probe': (r) => void (r.linesNamedProbe = false),
      'nothing waits within 10 s': (r) => void (r.waitedMs = 12_000),
      '/v1/probe answers 200 {"planted":true} within 10 s': (r) => void (r.probe.status = 404),
      'the door and the Funnel child did not restart': (r) => void (r.pids.funnelAfter = 0)
    },
    refused: [{ what: 'an answer that is not the planted one', clause: '/v1/probe answers 200 {"planted":true} within 10 s', edit: (r) => void (r.probe.planted = false) }]
  },
  H8: {
    pass: { clicked: true, removedId: 'c'.repeat(32), phoneIds: ['a'.repeat(32), 'b'.repeat(32)], firstOkMs: { A: 120, B: 140 }, afterFirst: { A: true, B: true }, removedRead: 0, confirmState: 'confirmed', pids: { ...PIDS } },
    breaks: {
      'the sheet’s Remove took phone C': (r) => void r.phoneIds.push(r.removedId),
      'A and B read 200 within 5 s and every read after': (r) => void (r.firstOkMs.B = null),
      'phone C is refused at the handshake': (r) => void (r.removedRead = 200),
      'still confirmed, and nothing restarted': (r) => void (r.confirmState = 'never')
    },
    refused: [
      // Today's Remove withdraws the agreement: every other phone goes dark.
      { what: 'the others dark until Allow (today)', clause: 'A and B read 200 within 5 s and every read after', edit: (r) => void Object.assign(r, { firstOkMs: { A: null, B: null }, afterFirst: { A: false, B: false } }) },
      { what: 'a read that came back late', clause: 'A and B read 200 within 5 s and every read after', edit: (r) => void (r.firstOkMs.A = 6_000) },
      { what: 'a read that failed after the first', clause: 'A and B read 200 within 5 s and every read after', edit: (r) => void (r.afterFirst.A = false) },
      // A Remove that names no phone cannot show that phone C left (the probe review).
      { what: 'a reading that names no removed phone', clause: 'the sheet’s Remove took phone C', edit: (r) => void delete r.removedId }
    ]
  },
  H9: {
    pass: { signalled: true, movedState: 'changed', funnelGone: true, refused: { A: 0, B: 0 }, retried: true, retryDrawn: false, restored: { state: 'listening', confirmState: 'confirmed' }, allowPressed: false, readAfter: 200 },
    breaks: {
      'a moved name reads changed, the Funnel child gone and the phones refused': (r) => void (r.movedState = 'confirmed'),
      'the name put back and Try again: published with no Allow': (r) => void (r.restored.state = 'refused'),
      'phone A reads again': (r) => void (r.readAfter = 0)
    },
    refused: [
      { what: 'a moved name the door still answered on', clause: 'a moved name reads changed, the Funnel child gone and the phones refused', edit: (r) => void (r.refused.A = 200) },
      { what: 'an Allow pressed to come back', clause: 'the name put back and Try again: published with no Allow', edit: (r) => void (r.allowPressed = true) }
    ]
  },
  DG1: {
    pass: { confirmState: 'changed', everListening: false, forwarderSeen: false, funnelArgv: 0, phones: { A: 0, B: 0 }, switched: true, storeMoved: true, afterSwitch: { everListening: false, confirmState: 'changed' }, probeAnswered: false, probeTries: 6 },
    breaks: {
      'the parent reads changed': (r) => void (r.confirmState = 'confirmed'),
      'never published, and both phones refused': (r) => void (r.phones.B = 200),
      'the switch off and on wrote the store and still published nothing': (r) => void (r.afterSwitch.everListening = true),
      '/v1/probe never answered': (r) => void (r.probeAnswered = true)
    },
    refused: [{ what: 'a switch that wrote nothing', clause: 'the switch off and on wrote the store and still published nothing', edit: (r) => void (r.storeMoved = false) }]
  },
  DG2: {
    pass: { confirmState: 'changed', everListening: false, forwarderSeen: false, probeAnsweredBefore: false, probeTries: 6, clicked: true, linesNamedProbe: true, after: { state: 'listening', confirmState: 'confirmed', routesWaiting: [] }, probe: { status: 200, planted: true } },
    breaks: {
      'changed, and never published before the Allow': (r) => void (r.everListening = true),
      '/v1/probe never answered before the Allow': (r) => void (r.probeAnsweredBefore = true),
      'the Allow over lines that name probe publishes it': (r) => void (r.after.state = 'refused'),
      '/v1/probe answers 200 after it': (r) => void (r.probe.status = 404)
    },
    refused: [
      // Wider than allowed: the upgrade back serving the route before a person agreed again.
      { what: 'the route served on the upgrade back', clause: 'changed, and never published before the Allow', edit: (r) => void (r.confirmState = 'confirmed') },
      { what: 'an Allow over lines that did not name the route', clause: 'the Allow over lines that name probe publishes it', edit: (r) => void (r.linesNamedProbe = false) }
    ]
  },
  RUN: {
    pass: {
      launches: 6,
      tailscalePreflights: [true, true, true, true, true, true],
      dnsPreflights: [true, true, true, true, true, true],
      agentsPrecheck: [true, true, true, true, true, true],
      agentsScan: [true, true, true, true, true, true],
      samples: 900,
      realTailscale: 0,
      forbidden: 0,
      refusedArgv: 0,
      udpSamples: 400,
      udpLeaks: 0,
      questionProblems: [],
      apnsLoopback: true,
      electronLeft: 0,
      standinLeft: 0,
      keyFileGone: true,
      socketGone: true,
      historySame: true,
      appLogRead: true,
      appLogHits: 0
    },
    breaks: {
      'the Tailscale preflight held at every launch': (r) => void (r.tailscalePreflights[3] = false),
      'the DNS preflight held at every launch': (r) => void r.dnsPreflights.pop(),
      'the hidden agents were renamed and read back at every launch': (r) => void (r.agentsScan[5] = false),
      'no real Tailscale in any sample, nothing forbidden or refused at the stand-in': (r) => void (r.realTailscale = 1),
      'main’s UDP went to 127.0.0.1 alone, and every name question was an A, RD 0, for the stand-in’s names': (r) => void (r.udpLeaks = 1),
      'the APNs stand-in listened on 127.0.0.1 alone': (r) => void (r.apnsLoopback = false),
      'no Electron, stand-in or scratch key of this run is left': (r) => void (r.electronLeft = 1),
      'the scratch socket file is gone': (r) => void (r.socketGone = false),
      'his two history files did not move': (r) => void (r.historySame = false),
      'app.log holds no token, nonce, signature, PEM line or alert address': (r) => void (r.appLogHits = 1)
    },
    refused: [
      { what: 'a recursive name question', clause: 'main’s UDP went to 127.0.0.1 alone, and every name question was an A, RD 0, for the stand-in’s names', edit: (r) => void (r.questionProblems = ['1 question(s) asked for recursion']) },
      { what: 'a forbidden argv at the stand-in', clause: 'no real Tailscale in any sample, nothing forbidden or refused at the stand-in', edit: (r) => void (r.forbidden = 1) },
      { what: 'the scratch key left on disk', clause: 'no Electron, stand-in or scratch key of this run is left', edit: (r) => void (r.keyFileGone = false) },
      { what: 'an app.log never read', clause: 'app.log holds no token, nonce, signature, PEM line or alert address', edit: (r) => void (r.appLogRead = false) },
      { what: 'a sampler that never sampled', clause: 'no real Tailscale in any sample, nothing forbidden or refused at the stand-in', edit: (r) => void (r.samples = 0) }
    ]
  }
};

// ---------------------------------------------------------------------------
// THE SELF-TEST. Grades recorded fixtures, reads the tree, starts nothing.
// ---------------------------------------------------------------------------

/** The single-quoted literals of `const <name> = …;` in `text`, joined, or null. */
function constLiteral(text, name) {
  const at = text.indexOf(`export const ${name} =`);
  if (at < 0) return null;
  const end = text.indexOf(';', at);
  const body = text.slice(at, end < 0 ? undefined : end).replace(/\/\*[\s\S]*?\*\//g, '');
  const parts = [...body.matchAll(/'((?:[^'\\]|\\.)*)'/g)].map((m) => m[1]);
  return parts.length === 0 ? null : parts.join('');
}
/** The single-quoted strings of `const <name> = [ … ]`, or null. */
function constList(text, name) {
  const at = text.indexOf(`export const ${name} = [`);
  if (at < 0) return null;
  const end = text.indexOf(']', at);
  const body = text.slice(at, end).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  return [...body.matchAll(/'([^']*)'/g)].map((m) => m[1]);
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
  say(ARM_IDS.every((id) => Object.hasOwn(LAUNCH_OF, id)), 'every arm names the launch it is read in');

  // 2. The pure readers on cases of their own.
  say(routeLineNames(['x', ROUTE_LINE_12], PLANTED) && !routeLineNames(['x', ROUTE_LINE_11], PLANTED) && !routeLineNames(['x', ROUTE_LINE_12], 'prob') && routeLineOf(['no route line']) === null, 'routeLineNames reads the route line’s items, not words inside other lines');
  say(sameSet(['a', 'b'], ['b', 'a']) && !sameSet(['a', 'a'], ['a', 'b']) && !sameSet(['a'], ['a', 'b']) && !sameSet(null, []), 'sameSet: the same distinct strings, any order');
  say(waitsForProbe([PLANTED]) && !waitsForProbe([]) && !waitsForProbe([PLANTED, 'x']) && isEmptyList([]) && !isEmptyList(undefined), 'waitsForProbe and isEmptyList read exactly their lists');
  const token = 'f'.repeat(64);
  say(secretHits(`x ${token} y`, [token, 'short']) === 1 && secretHits('nothing here', [token]) === 0 && secretHits('short short', ['short']) === 0 && secretHits('', [token]) === 0, 'secretHits counts a long needle and never a short one');
  const row = { at: 1, id: 7, rd: 0, qname: PUBLIC_NAME, qtype: QTYPE.A, qclass: 1, answered: 'record' };
  say(isEmptyList(questionsProblems([row, { ...row, qname: MOVED_NAME }])), 'questionsProblems: A, RD 0, for either of the run’s names is clean');
  say(questionsProblems([row, { ...row, qname: 'p33312-other.tail00000.ts.net' }]).length > 0 && questionsProblems([{ ...row, rd: 1 }]).length > 0 && questionsProblems([{ ...row, qtype: QTYPE.NS }]).length > 0 && questionsProblems([]).length > 0, 'questionsProblems: another name, a recursive or NS question, or none at all is a problem');
  say(J(launchesFor(['B1'])) === J(['L1']) && J(launchesFor(['M1'])) === J(['L1', 'L2', 'L3']) && J(launchesFor(['DG2'])) === J(['L1', 'L4', 'L5', 'L6']) && J(launchesFor(ARM_IDS)) === J(['L1', 'L2', 'L3', 'L4', 'L5', 'L6']), 'launchesFor runs L1 always and every launch a picked arm depends on');
  say(typedOnPrompt('q % p33312', KEYS_TEXT) && typedOnPrompt('\nq %# p33312\n', KEYS_TEXT) && !typedOnPrompt('q % ', KEYS_TEXT) && !typedOnPrompt('q %', KEYS_TEXT) && !typedOnPrompt('/private/tmp/h/p33312/project\nq % ', KEYS_TEXT) && !typedOnPrompt('zsh: no such file /x/p33312/home/.zshrc', KEYS_TEXT) && !typedOnPrompt(null, KEYS_TEXT), 'typedOnPrompt reads the typed text after the prompt, never a scratch path elsewhere on the pane');
  const endOk = { state: 'listening', confirmState: 'confirmed', routesAllowed: [...ELEVEN, PLANTED], routesWaiting: [] };
  say(downgradeReadable(endOk).ok && !downgradeReadable(null).ok && !downgradeReadable({ ...endOk, confirmState: 'never' }).ok && !downgradeReadable({ ...endOk, confirmState: 'changed' }).ok && !downgradeReadable({ ...endOk, routesAllowed: [...ELEVEN] }).ok && !downgradeReadable({ ...endOk, routesWaiting: [PLANTED] }).ok && downgradeReadable({ ...endOk, state: 'refused' }).ok, 'downgradeReadable: only a confirmed agreement allowing probe with nothing waiting can be downgraded from');
  say(socketPathOf('gmux-p33312-x-1', {}, 501) === '/private/tmp/tmux-501/gmux-p33312-x-1' && socketPathOf('s', { TMUX_TMPDIR: '/tmp/t' }, 7) === '/tmp/t/tmux-7/s', 'socketPathOf: tmux’s own place for a -L socket');
  // A REAL /v1/screen answer (the fix round, lens 2): the body phone A was
  // answered in the Phase 333.12 verify's run 1, a scratch shell this probe
  // made, its session id and revision that run's own. H2 read its turn from
  // the top of this object and sent no turn; the hand-written fixtures above
  // never held a picture, so nothing here could see it.
  const realScreen = JSON.parse(REAL_SCREEN_ANSWER);
  const screenCtx = keysContextOf(realScreen);
  say(screenCtx !== null && screenCtx.turn === '73a1aaf155390ed2-0' && screenCtx.dialog === null && realScreen.turn === undefined, `keysContextOf reads the turn and dialog from inside a real /v1/screen answer's picture (${J(screenCtx)}), where the top of the answer has none`);
  say(keysContextOf({ ...realScreen, screen: { ...realScreen.screen, dialog: 'a1b2c3d4e5f6' } })?.dialog === 'a1b2c3d4e5f6' && keysContextOf({ ...realScreen, screen: null }) === null && keysContextOf({ ...realScreen, screen: { ...realScreen.screen, turn: '' } }) === null && keysContextOf({ turn: 'x-0', dialog: null }) === null && keysContextOf(null) === null, 'keysContextOf: a dialog is carried, and no picture, an empty turn or a turn only at the top reads as nothing to write');

  // 3. The words spelled here against the tree they stand for.
  const read = (rel) => {
    try {
      return readFileSync(join(ROOT, rel), 'utf8');
    } catch {
      return '';
    }
  };
  const contract = read('src/shared/ipc/pocket.ts');
  const honesty = constLiteral(contract, 'POCKET_DOOR_HONESTY');
  say(honesty === HONESTY, `HONESTY is POCKET_DOOR_HONESTY byte for byte (${honesty === null ? 'not found in the tree' : `${String(honesty.length)} characters`})`);
  const legacy = constList(contract, 'LEGACY_ALLOWED_ROUTES');
  say(legacy !== null && J(legacy) === J(ELEVEN), `ELEVEN is LEGACY_ALLOWED_ROUTES in its order (${J(legacy)})`);
  let frozen = null;
  try {
    frozen = JSON.parse(read('ios/TortieTests/Fixtures/frozen/launch.wire.json')).routes.map((r) => r.id).sort();
  } catch {
    frozen = null;
  }
  say(frozen !== null && J(frozen) === J(ELEVEN), 'ELEVEN is launch.wire.json’s frozen route ids');
  const sheet = read('src/renderer/settings/PhoneSection.tsx');
  say(constLiteral(sheet, 'PUSH_LABEL') === PUSH_LABEL, 'PUSH_LABEL is PhoneSection.tsx’s');
  say(read('src/main/alerts/key-file.ts').includes(`PHONE_APP_TOPIC = '${TOPIC}'`), 'TOPIC is the phone app’s topic');
  say(/^[A-Z0-9]{10}$/.test(KEY_ID), 'the scratch key id has the shape of Apple’s key file name');
  say(PUBLIC_NAME.endsWith('.ts.net') && MOVED_NAME.endsWith('.ts.net') && PUBLIC_NAME !== MOVED_NAME, 'the stand-in’s name and the moved name are two made-up .ts.net names');
  say(ROUTE_PREFIX === 'Answers these and nothing else:', 'the route line prefix is probe:p3167’s');

  // 4. The plant, planned over this tree's own text in memory. Nothing is written.
  const texts = textsOf(ROOT);
  const head = planPlant(texts);
  say(head.ok && head.shape === 'head' && head.edits.length === EDITS.length + 1 && head.out.size === 5, `the plant finds every head-shape anchor in this tree exactly once (${head.ok ? `${String(head.edits.length)} edits in ${String(head.out.size)} files` : head.problems.join('; ')})`);
  const parentShaped = new Map(texts);
  parentShaped.delete(LEDGER_FILE);
  const parent = planPlant(parentShaped);
  say(parent.ok && parent.shape === 'parent' && parent.edits.length === EDITS.length && parent.out.size === 4, 'without the ledger the same tree reads the parent’s shape, five edits in four files');
  if (head.ok) {
    const out = head.out;
    say(routeLineNames([`${ROUTE_PREFIX} ${(/POCKET_ROUTE_IDS = \[([\s\S]*?)\] as const/.exec(out.get('src/shared/ipc/pocket.ts'))?.[1] ?? '').replace(/\/\*[\s\S]*?\*\//g, '').match(/'[a-z]+'/g)?.map((s) => s.slice(1, -1)).join(', ') ?? ''}`], PLANTED), 'the planted contract lists probe among POCKET_ROUTE_IDS');
    say(out.get(LEDGER_FILE).includes("{ id: 'probe', method: 'GET', path: '/v1/probe', reads: true, signed: true, windowOnly: false, bodyCap: 1024, clause: null }"), 'the planted ledger carries the probe row of SPEC §7.2');
    say(out.get('src/main/pocket/ipc.ts').includes("case 'probe':\n            return { planted: true };\n          case 'pair':"), 'the planted read switch answers { planted: true } before pair');
    const again = planPlant(new Map([...texts, ...out]));
    say(!again.ok && again.problems.some((p) => p.includes('already names the probe route')), 'a tree already planted is refused whole');
  }
  const doubled = new Map(texts);
  doubled.set('src/main/pocket/door/wire.ts', `${texts.get('src/main/pocket/door/wire.ts') ?? ''}\n// ${"'screen' | 'scrollback'>;"}\n`);
  const twice = planPlant(doubled);
  say(!twice.ok && twice.out.size === 0 && twice.problems.some((p) => p.includes('DoorSignedRoute') && p.includes('2 time(s)')), 'an anchor matched twice refuses the plan and names it, with nothing to write');
  const missing = new Map(texts);
  missing.set('src/main/pocket/ipc.ts', (texts.get('src/main/pocket/ipc.ts') ?? '').replace("          case 'pair':\n", "          case 'pear':\n"));
  const none = planPlant(missing);
  say(!none.ok && none.out.size === 0 && none.problems.some((p) => p.includes("read switch") && p.includes('0 time(s)')), 'an anchor not found refuses the plan and names it');
  say(pathRefusal('/Users/gdc/gmux', '/Users/gdc/gmux', { home: '/Users/x' }) !== null && pathRefusal('/etc', '/private/etc') !== null && pathRefusal('/private/tmp/wt-x', '/private/tmp/wt-x', { ownRoot: '/private/tmp/wt-x' }) !== null && pathRefusal('/private/tmp/p33312-parent', '/private/tmp/p33312-parent', { ownRoot: '/private/tmp/wt-x', home: '/Users/x' }) === null && pathRefusal('/private/tmp/y', '', {}) !== null, 'the plant refuses his checkout, anything outside /private/tmp, its own checkout and a missing path, and takes a scratch copy');
  say(readMarker('/nonexistent-p33312') === null && markerProblems('/nonexistent-p33312', 'head').length > 0, 'a checkout with no marker is refused by the probe');
  say(checkoutProblems(ROOT, { planted: null, ledger: true }).every((p) => !p.includes(MARKER)), 'this checkout carries no plant marker');

  process.stdout.write(
    failures === 0
      ? `[p33312] grader self-test PASS: ${String(Object.keys(GRADERS).length)} graders, ${String(clauses)} clauses, ${String(checks)} checks, each clause shown red on its own break; nothing was started.\n`
      : `[p33312] grader self-test FAIL: ${String(failures)} of ${String(checks)} checks.\n`
  );
  return failures === 0;
}

const isMain = process.argv[1] !== undefined && resolve(process.argv[1]) === HERE;
if (isMain && process.argv.includes('--grader-self-test')) process.exit(graderSelfTest() ? 0 : 1);
if (isMain) await run();

// ===========================================================================
// THE RUN. Everything below starts processes; builders never reach it.
// ===========================================================================

async function run() {
  const TAG = '[p33312]';
  const t0 = Date.now();
  const say = (line) => console.log(`${TAG} ${((Date.now() - t0) / 1000).toFixed(1).padStart(7)}s ${line}`);
  const refuse = (why) => {
    console.error(`${TAG} REFUSED. ${why}`);
    process.exit(2);
  };

  // ---- the refusals, in the order they are asked ----------------------------
  const SOCKET = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
  if (SOCKET === '') refuse("no GMUX_TMUX_SOCKET. Run node build/harness-socket.mjs --fresh gmux-p33312 'node build/p33312/probe-p33312.mjs'.");
  if (SOCKET === 'gmux' || SOCKET === 'default' || !/^gmux-p33312[a-z0-9-]*-\d+$/.test(SOCKET)) refuse(`"${SOCKET}" is not a gmux-p33312 harness socket ending in its pid.`);
  const HARNESS_DIR_GIVEN = (process.env['GMUX_HARNESS_DIR'] ?? '').trim();
  if (HARNESS_DIR_GIVEN === '' || !existsSync(HARNESS_DIR_GIVEN)) refuse('no GMUX_HARNESS_DIR, so there is nowhere scratch to put the HOME and the profile.');
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
    if (v === '') refuse(`${name} is not set. The run relaunches one profile across four builds and needs all of them (SPEC §7.2).`);
    try {
      return realpathSync(v);
    } catch {
      return refuse(`${name}=${v} does not exist.`);
    }
  };
  const HEAD = realpathSync(ROOT);
  const PARENT = named('P33312_PARENT_CHECKOUT');
  const PARENT_PLANTED = named('P33312_PARENT_PLANTED');
  const HEAD_PLANTED = named('P33312_HEAD_PLANTED');
  const BUILDS = { PARENT, PARENT_PLANTED, HEAD, HEAD_PLANTED };
  if (new Set(Object.values(BUILDS)).size !== 4) refuse(`the four builds must be four checkouts: ${J(BUILDS)}`);
  const buildProblems = [
    ...checkoutProblems(PARENT, { planted: null, ledger: false }).map((p) => `PARENT: ${p}`),
    ...checkoutProblems(PARENT_PLANTED, { planted: 'parent', ledger: false }).map((p) => `PARENT_PLANTED: ${p}`),
    ...checkoutProblems(HEAD, { planted: null, ledger: true }).map((p) => `HEAD: ${p}`),
    ...checkoutProblems(HEAD_PLANTED, { planted: 'head', ledger: true }).map((p) => `HEAD_PLANTED: ${p}`)
  ];
  if (buildProblems.length > 0) refuse(buildProblems.join('\n  '));
  const versionOf = (dir) => {
    try {
      return JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')).version ?? null;
    } catch {
      return null;
    }
  };
  const ARMS = (process.env['P33312_ARMS'] ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const unknownArms = ARMS.filter((id) => !ARM_IDS.includes(id));
  if (unknownArms.length > 0) refuse(`P33312_ARMS names ${J(unknownArms)}, which are not arms of this probe (${ARM_IDS.join(', ')}).`);
  const PICKED = ARMS.length === 0 ? [...ARM_IDS] : [...new Set([...ARMS, 'RUN'])];
  const wants = (id) => PICKED.includes(id);
  const LAUNCHES = launchesFor(PICKED);
  const KEEP = (process.env['P33312_KEEP'] ?? '') === '1';
  const DIALOG = join(HEAD, 'src/main/activity/__tests__/fixtures/claude-permission-prompt.txt');
  if (!existsSync(DIALOG)) refuse(`no committed Phase 312 dialog fixture at ${DIALOG}.`);
  const TMUX = existsSync(join(HEAD, 'build', 'vendor', 'tmux', 'bin', 'tmux')) ? join(HEAD, 'build', 'vendor', 'tmux', 'bin', 'tmux') : 'tmux';

  // ---- the scratch world ----------------------------------------------------
  const HARNESS = realpathSync(HARNESS_DIR_GIVEN);
  const RUN = join(HARNESS, 'p33312');
  rmSync(RUN, { recursive: true, force: true });
  mkdirSync(RUN, { recursive: true, mode: 0o700 });
  const HOME = join(RUN, 'home');
  /** INSIDE the harness directory: the alerts override refuses a profile outside it. */
  const PROFILE = join(RUN, 'profile');
  const PROJECT = join(RUN, 'project');
  const BIN = join(HOME, '.local', 'bin');
  /** OUTSIDE the profile, so the helper's profile sweep never takes the stand-in's children for the app's. */
  const STANDIN_DIR = join(RUN, 'standin');
  const ALERTS_DIR = join(RUN, 'alerts');
  const KEY_FILE = join(ALERTS_DIR, `AuthKey_${KEY_ID}.p8`);
  const ALERTS_JSON = join(ALERTS_DIR, 'alerts.json');
  const STOP = join(RUN, 'fake-stop');
  const APP_LOG = join(PROFILE, 'logs', 'app.log');
  const STORE_FILE = join(PROFILE, 'gmux', 'pocket.json');
  const RECORD_FILE = join(PROFILE, 'gmux', 'config-confirmations.json');
  const OUT = join(ROOT, 'out', 'p33312');

  const report = { root: ROOT, builds: Object.fromEntries(Object.entries(BUILDS).map(([k, v]) => [k, { dir: v, version: versionOf(v) }])), picked: PICKED, launches: [], arms: [], readings: {} };
  let failures = 0;
  let unreadable = 0;
  const graded = new Set();
  const arm = (id, reading) => {
    if (!wants(id)) {
      report.readings[id] = reading;
      say(`not asked ${id} (P33312_ARMS); its reading is kept`);
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

  // ---- what the report must never carry, and app.log must never hold ---------
  const SECRETS = new Set();
  const remember = (value) => {
    if (typeof value === 'string' && value.length >= 12) SECRETS.add(value);
  };
  const unsecret = (text) => [...SECRETS].reduce((t, s) => t.split(s).join('<secret>'), String(text));

  // ---- the guards -------------------------------------------------------------
  let standin = null;
  let dns = null;
  let watch = null;
  let apns = null;
  let apnsClosed = false;
  let lastShim = 0;
  let lastApp = 0;
  const tailscalePreflights = [];
  const dnsPreflights = [];
  const agentsPrecheck = [];
  const agentsScan = [];
  const launchRecords = [];
  const presses = [];
  const statuses = [];
  const answers = [];
  const alerts = { pemLines: [] };
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

  // ---- the phones and the wire --------------------------------------------------
  const TOKENS = Object.freeze({ A: randomBytes(32).toString('hex'), B: randomBytes(32).toString('hex'), C: randomBytes(32).toString('hex') });
  const ENVIRONMENTS = Object.freeze({ A: 'production', B: 'development', C: 'development' });
  for (const t of Object.values(TOKENS)) remember(t);
  const phones = { A: null, B: null, C: null };
  /** The door's name, public port and pin, from the first code; every later code must agree. */
  let doorInfo = null;
  let lastForwarderPort = 0;
  const forwarderNow = () => {
    const live = standin?.readFunnel() ?? [];
    const f = live[live.length - 1] ?? null;
    if (f !== null && f.forwarderPort > 0) lastForwarderPort = f.forwarderPort;
    return f;
  };
  const doorNow = () => ({
    get port() {
      return forwarderNow()?.forwarderPort ?? 0;
    },
    name: doorInfo?.name ?? PUBLIC_NAME,
    publicPort: doorInfo?.publicPort ?? 8443,
    pin: doorInfo?.pin ?? null
  });
  const doorAt = (port) => ({ port, name: doorInfo?.name ?? PUBLIC_NAME, publicPort: doorInfo?.publicPort ?? 8443, pin: doorInfo?.pin ?? null });
  const parseBody = (a) => {
    try {
      return a.status === 200 ? JSON.parse(a.body) : null;
    } catch {
      return null;
    }
  };
  /** One signed GET, its nonce and signature remembered so app.log can be searched for them. */
  const readAs = async (launch, label, phone, door, target) => {
    if (phone === null || phone === undefined) return { status: 0, body: '', bytes: 0, error: 'no such phone' };
    const port = door.port;
    if (!(port > 0)) {
      answers.push({ launch, label, phone: phone.label, target, status: 0, error: 'nothing is published' });
      return { status: 0, body: '', bytes: 0, error: 'nothing is published' };
    }
    const headers = signedHeaders(phone, target);
    remember(headers['x-tortie-nonce']);
    remember(headers['x-tortie-signature']);
    const answer = await request({ door: { ...doorAt(port), name: door.name, publicPort: door.publicPort, pin: door.pin }, method: 'GET', target, headers, identity: phone.certPem === null ? null : phone, timeoutMs: 20_000 });
    answers.push({ launch, label, phone: phone.label, target, status: answer.status, bytes: answer.bytes ?? 0, handshook: answer.handshook === true, error: answer.error ?? null, body: answer.body ?? '' });
    return answer;
  };
  /** One `keys` write the phone's way, its nonce and signature remembered. */
  const keysAs = async (launch, phone, door, sessionId, keys, { turn, dialog }) => {
    const write = randomBytes(16).toString('hex');
    const body = writeBodyOf({ dialog: dialog ?? null, keys, session: sessionId, turn, write });
    const headers = { ...signedHeadersFor(phone, 'POST', '/v1/keys', body), 'content-type': 'application/json', 'content-length': String(body.length) };
    remember(headers['x-tortie-nonce']);
    remember(headers['x-tortie-signature']);
    const port = door.port;
    if (!(port > 0)) return { outcome: null, why: 'nothing is published' };
    const answer = await request({ door: { ...doorAt(port), name: door.name, publicPort: door.publicPort, pin: door.pin }, method: 'POST', target: '/v1/keys', headers, body, identity: phone });
    const read = writeAnswerOf(answer, write, 'keys');
    answers.push({ launch, label: 'keys write', phone: phone.label, target: '/v1/keys', status: answer.status, body: answer.body ?? '' });
    return { outcome: read.ok ? read.answer.outcome : null, reason: read.ok ? read.answer.reason : null, why: read.why };
  };

  // ---- the app, driven through its own bridge ------------------------------------
  const INHERITED_CLAUDE = Object.fromEntries(Object.keys(process.env).filter((n) => /^(?:CLAUDECODE|CLAUDE_)/.test(n)).map((n) => [n, undefined]));
  const devtoolsPort = () => {
    try {
      return Number(readFileSync(join(PROFILE, 'DevToolsActivePort'), 'utf8').split('\n')[0].trim());
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
  const attachMain = async (needsDrive, timeoutMs = 150_000) => {
    const started = Date.now();
    let why = 'no DevToolsActivePort yet';
    for (;;) {
      const picked = pickRendererTarget(await targets());
      if (picked.target !== null) {
        const cdp = await wsConnect(picked.target.webSocketDebuggerUrl);
        await cdp.call('Runtime.enable');
        const ready = needsDrive ? 'window.gmux !== undefined && window.gmux.pocket !== undefined && window.__gmuxP93 !== undefined' : 'window.gmux !== undefined && window.gmux.pocket !== undefined';
        for (let i = 0; i < 200; i += 1) {
          if ((await cdpEval(cdp, ready)) === true) return cdp;
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
          if ((await cdpEval(cdp, `document.querySelector('section[aria-label="Phone"]') !== null`)) === true) return cdp;
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
  const bridge = async (cdp, expr, ms = 120_000) => JSON.parse(await cdpEval(cdp, `(async () => { try { const v = await (${expr}); return JSON.stringify({ ok: true, value: v === undefined ? null : v }); } catch (e) { return JSON.stringify({ ok: false, error: String((e && e.message) || e) }); } })()`, ms));
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
  const SHEET_FACTS = `(() => {
    const s = document.querySelector('section[aria-label="Phone"]');
    if (s === null) return JSON.stringify({ drawn: false });
    const publish = s.querySelector('[data-phone-step="publish"]');
    const blocks = [...s.querySelectorAll('[data-phone-confirm]')];
    const block = blocks[0] ?? null;
    const allow = s.querySelector('[data-phone-action="confirm-door"]');
    const sw = [...s.querySelectorAll('button[role="switch"]')].find((x) => x.getAttribute('aria-label') === ${J(PUSH_LABEL)}) ?? null;
    return JSON.stringify({
      drawn: true,
      publishState: publish === null ? null : publish.getAttribute('data-phone-step-state'),
      confirmBlocks: blocks.length,
      confirmInPublish: publish === null ? 0 : publish.querySelectorAll('[data-phone-confirm]').length,
      lines: block === null ? [] : [...block.querySelectorAll('li')].map((li) => li.textContent),
      warnings: block === null ? [] : [...block.querySelectorAll('p.set-config-warning')].map((p) => p.textContent),
      allow: allow === null ? null : { disabled: allow.disabled },
      retryDrawn: s.querySelector('[data-phone-action="retry-door"]') !== null,
      alerts: sw === null ? null : { checked: sw.getAttribute('aria-checked'), disabled: sw.disabled },
      phoneIds: [...s.querySelectorAll('[data-phone-id]')].map((r) => r.getAttribute('data-phone-id'))
    });
  })()`;
  const sheetFacts = async (settings) => {
    try {
      return JSON.parse(await cdpEval(settings, SHEET_FACTS));
    } catch {
      return { drawn: false };
    }
  };
  /** A click on the real element, recorded against its launch. False when it is absent or disabled. */
  const clickIn = async (ctx, settings, selector, what) => {
    const ok = (await cdpEval(settings, `(() => { const b = document.querySelector(${J(selector)}); if (b === null || b.disabled) return false; b.click(); return true; })()`)) === true;
    if (ok) presses.push({ launch: ctx.launch, what: `click ${what}`, at: Date.now() });
    return ok;
  };
  const enabledIn = (settings, selector) => cdpEval(settings, `(() => { const b = document.querySelector(${J(selector)}); return b !== null && !b.disabled; })()`).then((v) => v === true);
  const pressesIn = (launch, from = 0) => presses.filter((p) => p.launch === launch && p.at >= from).map((p) => p.what);
  const ALLOW_PRESSES = (what) => what === 'confirmDoor' || what === 'click Allow' || what === 'allowPhone';

  /** Main's listed sessions, with what this file reads. */
  const sessionsOf = async (cdp) => {
    const got = await bridge(cdp, 'window.gmux.sessions.list().then((l) => l.map((s) => ({ id: s.id, name: s.name, status: s.status, agent: s.agent, tmuxName: s.tmuxName })))');
    return got.ok ? got.value : [];
  };
  const tmux = (...args) => {
    if (!SOCKET.startsWith('gmux-p33312')) throw new Error(`refusing tmux on ${SOCKET}`);
    const r = spawnSync(TMUX, ['-L', SOCKET, ...args], { encoding: 'utf8', timeout: 10_000 });
    return r.status === 0 ? String(r.stdout ?? '') : null;
  };
  const appLogText = () => {
    try {
      return readFileSync(APP_LOG, 'utf8');
    } catch {
      return null;
    }
  };
  const fileSha = (path) => {
    try {
      return sha256(readFileSync(path));
    } catch {
      return null;
    }
  };
  const fileShas = () => ({ pocket: fileSha(STORE_FILE), confirmations: fileSha(RECORD_FILE) });

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
  const doorProcessesOf = (appPid) => {
    if (!(appPid > 0)) return { door: [], nodeServices: 0 };
    const services = descendantsOf(appPid).filter((r) => r.command.includes('--utility-sub-type=node.mojom.NodeService'));
    const door = services.filter((r) => /(?:^|\s)TORTIE_DOOR=/.test((spawnSync('/bin/ps', ['-E', '-ww', '-p', String(r.pid), '-o', 'command='], { encoding: 'utf8' }).stdout ?? '').trim()));
    return { door: door.map((r) => r.pid), nodeServices: services.length };
  };
  const funnelPidNow = () => forwarderNow()?.pid ?? 0;

  // ---- one launch ---------------------------------------------------------------
  const launchOptions = (label, checkout) => ({
    label,
    userDataDir: PROFILE,
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
      GMUX_CONFIG_ROOT: join(PROFILE, 'gmux', 'config'),
      GMUX_HARNESS_DIR: HARNESS,
      // THE STAND-INS. A development build honours them and a packaged one
      // ignores them, which is why no packaged Tortie is ever launched here.
      GMUX_TAILSCALE_BIN: standin.binPath,
      [NAME_SERVERS_VAR]: dns.servers,
      GMUX_HARNESS_ALERTS: ALERTS_DIR,
      P33312_STOP: STOP,
      P33312_DIALOG: DIALOG
    }),
    graceMs: 8_000,
    ceilingMs: 1_200_000
  });
  const launch = async (name, checkout, body) => {
    const pre = preflightStandin(standin, standin.binPath);
    tailscalePreflights.push(pre.ok);
    if (!pre.ok) throw new Error(`the Tailscale preflight refused ${name}: ${pre.problems.join('; ')}`);
    const dnsPre = await dns.preflight(dns.servers);
    dnsPreflights.push(dnsPre.ok && loopbackOnlyServers(dns.servers));
    if (!dnsPre.ok) throw new Error(`the DNS preflight refused ${name}: ${dnsPre.problems.join('; ')}`);
    writeHiddenAgents(PROFILE, 'p33312');
    const precheck = hiddenAgentsPrecheck({ checkout, prefix: 'p33312', home: HOME, userPath: process.env.PATH ?? '' });
    agentsPrecheck.push(precheck.ok);
    if (!precheck.ok) throw new Error(`the hidden-agents precheck refused ${name}: ${precheck.said}`);
    const ctx = { launch: name, checkout, startedAt: Date.now(), logFrom: (appLogText() ?? '').length };
    const rec = { launch: name, checkout, shim: 0, app: 0, startedAt: ctx.startedAt, endedAt: 0 };
    launchRecords.push(rec);
    say(`${name}: launching ${checkout}`);
    try {
      return await withElectron(launchOptions(`p33312-${name}`, checkout), async (handle) => {
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
        const main = await attachMain(name === 'L1');
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
    }
  };

  /** Pair one node phone through a code main shows, Allow pressed over the card's own lines. */
  const pairPhone = async (ctx, main, label) => {
    const offered = await press(ctx, main, 'beginPairing');
    if (!offered.ok) return { ok: false, why: `beginPairing: ${offered.error.slice(0, 200)}` };
    const read = readOffer(offered.value.payload);
    if (!read.ok) return { ok: false, why: `the code does not read the phone's way: ${read.why}` };
    remember(read.offer.ps);
    const info = { name: read.offer.host, publicPort: read.offer.port, pin: read.offer.fp };
    if (doorInfo === null) doorInfo = info;
    const sameDoor = J(info) === J(doorInfo);
    const phone = makePhone(`p33312 ${label}`, read.offer.dx);
    let cardLines = null;
    let allowed = null;
    const paired = await pairThrough(doorNow(), read.offer, phone, {
      tries: 20,
      everyMs: 500,
      sealOptions: { pushToken: TOKENS[label], pushEnvironment: ENVIRONMENTS[label] },
      between: async () => {
        if (allowed !== null) return;
        const sheet = await callPocket(main, 'pairingState');
        if (sheet.ok && sheet.value?.state === 'presented') {
          cardLines = sheet.value.lines;
          allowed = await press(ctx, main, 'allowPhone', { linesRead: sheet.value.lines, hashRead: sheet.value.hash });
        }
      }
    });
    await press(ctx, main, 'cancelPairing');
    const ok = paired.ok && allowed?.ok === true && allowed.value?.allowed !== false && sameDoor;
    return { ok, phone, cardLines, sameDoor, why: ok ? '' : `pairing answered ${J(paired.words)} (${paired.why}); Allow ${allowed === null ? 'never pressed' : allowed.ok ? `answered allowed=${String(allowed.value?.allowed)}` : `threw ${allowed.error}`}; the same door ${String(sameDoor)}` };
  };

  /** The door's lines as they stand, Allowed through the bridge (the sheet's own call), then listening. */
  const linesReady = (s) => s.confirmable === true && s.state !== 'opening' && s.publicName === PUBLIC_NAME && s.confirmState !== 'confirmed' && s.confirmLines.some((l) => l.includes(`https://${PUBLIC_NAME}:`));
  const listeningNow = (s) => s.state === 'listening' && s.confirmState === 'confirmed';
  const pairableNow = (s) => listeningNow(s) && (s.pairable === true || s.pairable === undefined);
  const allowDoor = async (ctx, main) => {
    const ready = await waitStatus(ctx, main, linesReady, 45_000);
    if (!ready.ok) return { ok: false, why: `the lines never named ${PUBLIC_NAME}: ${J({ state: ready.status?.state, confirmState: ready.status?.confirmState, refusal: ready.status?.refusal })}` };
    const c = await press(ctx, main, 'confirmDoor', { linesRead: ready.status.confirmLines, hashRead: ready.status.confirmHash });
    if (!c.ok || c.value?.allowed !== true) return { ok: false, why: c.ok ? `confirm allowed=${String(c.value?.allowed)} (${String(c.value?.refusal)})` : c.error };
    const l = await waitStatus(ctx, main, pairableNow, 90_000);
    return { ok: l.ok, status: l.status, why: l.ok ? '' : `never listening and pairable: ${J({ state: l.status?.state, pairable: l.status?.pairable })}` };
  };

  const TOKEN_OF = new Map(Object.entries(TOKENS).map(([label, t]) => [t, label]));
  /**
   * A session newly blocks, and the APNs stand-in is read. `want`: wait for an
   * alert (alerts armed first), else watch QUIET_MS for nothing.
   */
  let blockCount = 0;
  const newBlock = async (ctx, main, { want }) => {
    const armed = want ? (await waitFor(() => (appLogText() ?? '').slice(ctx.logFrom).includes('phone alerts armed'), 60_000, 500)) !== null : null;
    const mark = apns.requests.length;
    blockCount += 1;
    const name = `p33312-ask-${ctx.launch}-${String(blockCount)}`;
    const made = await bridge(main, `window.gmux.sessions.create(${J({ name, projectPath: PROJECT, cwd: PROJECT, agent: 'claude' })}).then((s) => s.id)`);
    if (!made.ok) return { blocked: false, armed, why: `${name} was not created: ${made.error}` };
    const blockedAt = await waitFor(async () => ((await sessionsOf(main)).find((s) => s.id === made.value)?.status === 'needs_input' ? Date.now() : null), 90_000, 1_000);
    if (blockedAt === null) return { blocked: false, armed, why: `${name} never read needs_input in main within 90 s` };
    if (want) await waitFor(() => apns.since(mark).some((r) => r.status === 200 && TOKEN_OF.has(r.token)), QUIET_MS, 500);
    else await sleep(QUIET_MS + 100);
    const since = apns.since(mark);
    const byPhone = Object.fromEntries(Object.keys(TOKENS).map((label) => [label, since.filter((r) => r.token === TOKENS[label] && r.status === 200).length]));
    return { blocked: true, armed, sessionId: made.value, alerts: since.filter((r) => r.status === 200 && TOKEN_OF.has(r.token)).length, requests: since.length, byPhone, waitedMs: Date.now() - blockedAt };
  };
  /** Status sampled for `ms`: was the door ever listening, did a Funnel child of this launch appear. */
  const sampleClosed = async (ctx, main, ms) => {
    const states = new Set();
    let everListening = false;
    let forwarderSeen = false;
    let last = null;
    const until = Date.now() + ms;
    while (Date.now() < until) {
      stopIfLeaked();
      last = await statusNow(ctx, main);
      if (last !== null) {
        states.add(`${String(last.state)}/${String(last.confirmState)}`);
        if (last.state === 'listening') everListening = true;
      }
      if ((standin.readFunnel() ?? []).some((f) => f.at >= ctx.startedAt)) forwarderSeen = true;
      await sleep(500);
    }
    return { everListening, forwarderSeen, states: [...states], last };
  };
  const funnelArgvSince = (from) => standin.readLog().filter((e) => e.kind === 'funnel' && e.at >= from).length;
  const statusAskedSince = (from) => standin.readLog().filter((e) => e.kind === 'status' && e.at >= from).length;
  /** Phone A's /v1/probe, through the live forwarder and the last one seen: any 200 is an answer. */
  const probeTries = [];
  const probeTry = async (ctx, label) => {
    const now = await readAs(ctx.launch, `${label} live`, phones.A, doorNow(), '/v1/probe');
    const last = lastForwarderPort > 0 ? await readAs(ctx.launch, `${label} last`, phones.A, doorAt(lastForwarderPort), '/v1/probe') : { status: 0 };
    probeTries.push({ launch: ctx.launch, label, live: now.status, last: last.status });
    return now.status === 200 || last.status === 200;
  };

  // ---- THE RUN ------------------------------------------------------------------
  let parentHash = null;
  let afterL2 = null;
  /** The status L4 ended on, which decides whether the downgrade can be read. */
  let l4End = null;
  let stopped = false;
  try {
    for (const dir of [HOME, PROFILE, PROJECT, BIN, ALERTS_DIR]) mkdirSync(dir, { recursive: true, mode: 0o700 });
    writeFileSync(join(PROJECT, 'README.md'), '# Phase 333.12, a scratch folder\n');
    // The fake claude: prints the committed Phase 312 dialog and waits. Not Claude Code.
    const CLAUDE_STAND_IN = [
      '#!/bin/sh',
      '# probe:p33312. Not Claude Code. It prints a committed fixture and waits.',
      'case "$1" in',
      '  -v|--version) echo "2.1.238 (Claude Code)"; exit 0;;',
      'esac',
      'sleep 2',
      'cat "$P33312_DIALOG"',
      'while [ ! -f "$P33312_STOP" ]; do sleep 1; done',
      'exit 0',
      ''
    ].join('\n');
    writeFileSync(join(BIN, 'claude'), CLAUDE_STAND_IN, 'utf8');
    chmodSync(join(BIN, 'claude'), 0o755);
    // A quiet scratch shell: no history, a prompt that never draws KEYS_TEXT.
    writeFileSync(join(HOME, '.zprofile'), `export PATH="${BIN}:$PATH"\n`, 'utf8');
    writeFileSync(join(HOME, '.zshrc'), `export PATH="${BIN}:$PATH"\nPS1='q %# '\nHISTFILE=/dev/null\nSAVEHIST=0\n`, 'utf8');
    // The same for a person whose shell is bash (the app starts $SHELL).
    writeFileSync(join(HOME, '.bash_profile'), `export PATH="${BIN}:$PATH"\nPS1='q %# '\nHISTFILE=/dev/null\n`, 'utf8');
    writeFileSync(join(HOME, '.bashrc'), `PS1='q %# '\nHISTFILE=/dev/null\n`, 'utf8');
    writeFileSync(join(HOME, '.hushlogin'), '');

    standin = makeStandin({ dir: STANDIN_DIR, scenario: { ...DEFAULT_SCENARIO } });
    // The `finally` ends them; this net is for a run the helper ends with
    // process.exit, which skips it. Synchronous, by pid, naming the stand-in only.
    process.once('exit', () => endStandinProcesses(STANDIN_DIR, 500));
    const pre = preflightStandin(standin, standin.binPath);
    if (!pre.ok) throw new Error(`the Tailscale preflight refused: ${pre.problems.join('; ')}`);
    dns = await makeDnsStandin({ name: PUBLIC_NAME, mode: 'record' });
    watch = watchForRealTailscale({ roots: () => [lastShim, lastApp].filter((p) => p > 0), everyMs: 1_000 });

    // THE SCRATCH KEY, made here and deleted in the `finally` whatever happened.
    const keyPair = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
    const pem = keyPair.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
    alerts.pemLines = pem.split('\n').filter((l) => l.length >= 16 && !l.startsWith('-----'));
    for (const l of alerts.pemLines) remember(l);
    writeFileSync(KEY_FILE, pem, { mode: 0o600 });
    process.once('exit', () => rmSync(KEY_FILE, { force: true }));
    // APPLE is the stand-in, in this process, seeded with each phone's token
    // in the environment it was minted in.
    apns = await startApnsStandIn({ publicKey: keyPair.publicKey, topic: TOPIC, devices: Object.fromEntries(Object.entries(TOKENS).map(([label, t]) => [t, ENVIRONMENTS[label]])) });
    writeFileSync(ALERTS_JSON, `${J({ origins: apns.origins, keyFile: KEY_FILE })}\n`, { mode: 0o600 });
    say(`the builds: ${J(report.builds)}; socket ${SOCKET}; arms ${PICKED.join(',')}; launches ${LAUNCHES.join(',')}`);

    // =========================================================================
    // L1 — PARENT, the stranger's Mac
    // =========================================================================
    const b1 = { doorListened: false, keyKept: false, alertsAllowed: false, phones: [], blocked: false, alerts: 0, confirmState: null, confirmHash: null };
    let b1Why = null;
    await launch('L1', PARENT, async ({ main, ctx }) => {
      await bridge(main, `window.__gmuxP93.setup(${J({ path: PROJECT, names: ['p33312-shell-L1'] })}).then(() => true)`);
      const on = await press(ctx, main, 'setDoor', { on: true });
      const first = on.ok ? await allowDoor(ctx, main) : { ok: false, why: on.error };
      b1.doorListened = first.ok;
      if (!first.ok) {
        b1Why = `the parent's door never listened: ${first.why}`;
        return;
      }
      forwarderNow();
      await press(ctx, main, 'choosePushKey');
      b1.keyKept = (await waitStatus(ctx, main, (s) => s.pushKeyId === KEY_ID, 20_000)).ok;
      const alertsOn = await press(ctx, main, 'setPushAlerts', { on: true });
      const onRead = alertsOn.ok ? await waitStatus(ctx, main, (s) => s.pushAlerts === true, 15_000) : { ok: false };
      const second = onRead.ok ? await allowDoor(ctx, main) : { ok: false, why: alertsOn.ok ? 'pushAlerts never read on' : alertsOn.error };
      b1.alertsAllowed = second.ok && second.status?.pushAlerts === true;
      for (const label of ['A', 'B']) {
        await waitStatus(ctx, main, pairableNow, 75_000);
        const p = await pairPhone(ctx, main, label);
        phones[label] = p.ok ? p.phone : null;
        const read = p.ok ? await readAs('L1', `${label} blocked`, p.phone, doorNow(), '/v1/blocked') : { status: 0 };
        const st = await statusNow(ctx, main);
        b1.phones.push({ label, paired: p.ok, alertAddress: p.ok && st?.phones?.find((x) => x.id === p.phone.id)?.alerts === 'on', read: read.status, why: p.why });
      }
      const block = await newBlock(ctx, main, { want: true });
      b1.blocked = block.blocked;
      b1.alerts = block.alerts ?? 0;
      b1.armed = block.armed;
      b1.byPhone = block.byPhone ?? null;
      if (!block.blocked) b1Why = block.why;
      const last = await statusNow(ctx, main);
      b1.confirmState = last?.confirmState ?? null;
      b1.confirmHash = last?.confirmHash ?? null;
      parentHash = b1.confirmHash;
      forwarderNow();
    });
    if (b1Why !== null && !b1.doorListened) cannotRead('B1', b1Why, b1);
    else if (!b1.blocked) cannotRead('B1', b1Why ?? 'no session blocked', b1);
    else arm('B1', b1);
    const b1Ok = b1.blocked && grade('B1', b1).ok;
    if (!b1Ok || phones.A === null || phones.B === null) {
      stopped = true;
      say('L1 did not reach two paired, reading phones with an alert recorded; no later arm is readable');
    }

    // =========================================================================
    // L2 — HEAD, the update that fixes it (NO PRESS)
    // =========================================================================
    if (!stopped && LAUNCHES.includes('L2')) {
      const u1 = { presses: null, published: false };
      let u1Why = null;
      await launch('L2', HEAD, async ({ main, ctx }) => {
        const up = await waitStatus(ctx, main, listeningNow, 90_000);
        const funnel = forwarderNow();
        const s = up.status;
        let sheet = null;
        let settings = null;
        try {
          settings = await attachSettings(main);
          sheet = (await waitFor(async () => {
            const f = await sheetFacts(settings);
            return f.publishState === 'published' ? f : null;
          }, 20_000)) ?? (await sheetFacts(settings));
        } catch (err) {
          // Read as no sheet, which U1's sheet clause fails on; the other clauses still read.
          sheet = { drawn: false, error: String(err?.message ?? err) };
        } finally {
          settings?.close();
        }
        const reads = { A: (await readAs('L2', 'A blocked', phones.A, doorNow(), '/v1/blocked')).status, B: (await readAs('L2', 'B blocked', phones.B, doorNow(), '/v1/blocked')).status };
        const block = await newBlock(ctx, main, { want: true });
        if (!block.blocked) u1Why = block.why;
        Object.assign(u1, {
          presses: pressesIn('L2'),
          published: up.ok && funnel !== null && funnel.at >= ctx.startedAt,
          state: s?.state ?? null,
          confirmState: s?.confirmState ?? null,
          routesWaiting: s?.routesWaiting,
          routesAllowed: s?.routesAllowed,
          confirmHash: s?.confirmHash ?? null,
          parentHash,
          sheetRead: sheet?.publishState === 'published',
          publishState: sheet?.publishState ?? null,
          confirmBlocks: sheet?.confirmBlocks ?? -1,
          reads,
          blocked: block.blocked,
          armed: block.armed,
          alerts: block.alerts ?? 0,
          byPhone: block.byPhone ?? null
        });
      });
      afterL2 = fileShas();
      if (u1Why !== null) cannotRead('U1', u1Why, u1);
      else arm('U1', u1);
    }

    // =========================================================================
    // L3 — PARENT_PLANTED, the parent measured (NO PRESS)
    // =========================================================================
    if (!stopped && LAUNCHES.includes('L3')) {
      const m1 = {};
      let m1Why = null;
      await launch('L3', PARENT_PLANTED, async ({ main, ctx, appPid }) => {
        const seen = await sampleClosed(ctx, main, 20_000);
        const m1App = appPid();
        const procs = doorProcessesOf(m1App);
        const phonesRead = {
          A: (await readAs('L3', 'A blocked last forwarder', phones.A, doorAt(lastForwarderPort), '/v1/blocked')).status,
          B: (await readAs('L3', 'B blocked last forwarder', phones.B, doorAt(lastForwarderPort), '/v1/blocked')).status
        };
        const block = wants('M1') ? await newBlock(ctx, main, { want: false }) : { blocked: false, why: 'M1 was not asked, so the quiet wait was skipped' };
        if (!block.blocked) m1Why = block.why;
        Object.assign(m1, {
          presses: pressesIn('L3'),
          confirmState: seen.last?.confirmState ?? null,
          states: seen.states,
          everListening: seen.everListening,
          forwarderSeen: seen.forwarderSeen,
          funnelArgv: funnelArgvSince(ctx.startedAt),
          statusAsked: statusAskedSince(ctx.startedAt),
          appPid: m1App,
          doorProcesses: procs.door.length,
          nodeServices: procs.nodeServices,
          lastForwarderPort,
          phones: phonesRead,
          blocked: block.blocked,
          requests: block.requests ?? null,
          waitedMs: block.waitedMs ?? 0
        });
      });
      const afterL3 = fileShas();
      m1.files = {
        pocketSame: afterL2 !== null && afterL2.pocket !== null && afterL3.pocket === afterL2.pocket,
        confirmationsSame: afterL2 !== null && afterL2.confirmations !== null && afterL3.confirmations === afterL2.confirmations,
        afterL2,
        afterL3
      };
      if (m1Why !== null) cannotRead('M1', m1Why, m1);
      else arm('M1', m1);
    }

    // =========================================================================
    // L4 — HEAD_PLANTED, a route waits
    // =========================================================================
    if (!stopped && LAUNCHES.includes('L4')) {
      const H_IDS = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'H7', 'H8', 'H9'];
      const notReached = (from, why) => {
        for (const id of H_IDS.slice(H_IDS.indexOf(from))) cannotRead(id, why);
      };
      await launch('L4', HEAD_PLANTED, async ({ main, ctx, appPid }) => {
        // ---- H1 -----------------------------------------------------------------
        const up = await waitStatus(ctx, main, listeningNow, 90_000);
        const funnel = forwarderNow();
        const pids = { door: doorProcessesOf(appPid()).door[0] ?? 0, funnel: funnel?.pid ?? 0 };
        const h1 = {
          presses: pressesIn('L4'),
          published: up.ok && funnel !== null && funnel.at >= ctx.startedAt,
          state: up.status?.state ?? null,
          confirmState: up.status?.confirmState ?? null,
          routesWaiting: up.status?.routesWaiting,
          routesAllowed: up.status?.routesAllowed,
          confirmLines: up.status?.confirmLines ?? [],
          doorPid: pids.door,
          funnelPid: pids.funnel
        };
        arm('H1', h1);
        if (!grade('H1', h1).ok) {
          notReached('H2', 'H1 did not read a published door with probe waiting, so nothing after it can be read');
          return;
        }
        const pidsNow = () => ({ door: doorProcessesOf(appPid()).door[0] ?? 0, funnel: funnelPidNow() });
        const pidsFrom = (after) => ({ doorBefore: pids.door, doorAfter: after.door, funnelBefore: pids.funnel, funnelAfter: after.funnel });

        // ---- H2 -----------------------------------------------------------------
        {
          const made = await bridge(main, `window.gmux.sessions.create(${J({ name: 'p33312-keys', projectPath: PROJECT, cwd: PROJECT, agent: 'shell' })}).then((s) => ({ id: s.id, tmuxName: s.tmuxName }))`);
          const shell = made.ok ? made.value : null;
          const target = shell === null ? null : `=${shell.tmuxName}:`;
          const prompt = target === null ? null : await waitFor(() => (String(tmux('capture-pane', '-p', '-t', target) ?? '').includes('q %') ? true : null), 30_000, 250);
          const reads = {};
          for (const label of ['A', 'B']) {
            const blocked = await readAs('L4', `${label} blocked`, phones[label], doorNow(), '/v1/blocked');
            const screen = shell === null ? { status: 0 } : await readAs('L4', `${label} screen`, phones[label], doorNow(), screenTarget(shell.id));
            reads[label] = { blocked: blocked.status, screen: screen.status, screenAnswer: parseBody(screen) };
          }
          let keys = { outcome: null, before: null, captured: false };
          const picture = keysContextOf(reads.A.screenAnswer);
          if (shell !== null && prompt !== null && picture !== null) {
            const before = typedOnPrompt(String(tmux('capture-pane', '-p', '-t', target) ?? ''), KEYS_TEXT);
            const wrote = await keysAs('L4', phones.A, doorNow(), shell.id, [{ t: KEYS_TEXT }], picture);
            const captured = (await waitFor(() => (typedOnPrompt(String(tmux('capture-pane', '-p', '-t', target) ?? ''), KEYS_TEXT) ? true : null), 5_000, 200)) === true;
            keys = { outcome: wrote.outcome, reason: wrote.reason ?? null, why: wrote.why ?? null, before, captured };
          }
          const block = wants('H2') ? await newBlock(ctx, main, { want: true }) : { blocked: true, alerts: 0, why: null };
          const h2 = { reads: { A: { blocked: reads.A.blocked, screen: reads.A.screen }, B: { blocked: reads.B.blocked, screen: reads.B.screen } }, keys, picture, shellMade: shell !== null, prompt: prompt !== null, blocked: block.blocked, armed: block.armed ?? null, alerts: block.alerts ?? 0, byPhone: block.byPhone ?? null };
          if (shell === null || prompt === null) cannotRead('H2', `the scratch shell ${shell === null ? `was not created (${made.error})` : 'never drew its prompt'}`, h2);
          else if (picture === null && reads.A.screen === 200) cannotRead('H2', 'phone A’s /v1/screen answer carried no picture with a turn, so no keys write could be composed from it', h2);
          else if (!block.blocked) cannotRead('H2', block.why, h2);
          else arm('H2', h2);
        }

        // ---- H3 -----------------------------------------------------------------
        {
          const statuses3 = [];
          const bodyBytes = [];
          for (let i = 0; i < 3; i += 1) {
            const a = await readAs('L4', `probe ${String(i)}`, phones.A, doorNow(), '/v1/probe');
            statuses3.push(a.status);
            bodyBytes.push(Buffer.byteLength(a.body ?? '', 'utf8'));
          }
          arm('H3', { statuses: statuses3, bodyBytes });
        }

        // ---- H4 -----------------------------------------------------------------
        let settings = null;
        try {
          settings = await attachSettings(main);
        } catch (err) {
          notReached('H4', `Settings then Phone could not be opened: ${String(err?.message ?? err)}`);
          return;
        }
        try {
          const shown = await waitFor(async () => {
            const f = await sheetFacts(settings);
            return f.publishState === 'published' && f.confirmBlocks > 0 ? f : null;
          }, 20_000);
          const facts = shown ?? (await sheetFacts(settings));
          const st = await statusNow(ctx, main);
          arm('H4', { publishState: facts.publishState ?? null, confirmBlocks: facts.confirmBlocks ?? 0, confirmInPublish: facts.confirmInPublish ?? 0, lines: facts.lines ?? [], statusLines: st?.confirmLines ?? null, warnings: facts.warnings ?? [] });

          // ---- H5: the pairing Allow ------------------------------------------------
          {
            await waitStatus(ctx, main, pairableNow, 75_000);
            const p = await pairPhone(ctx, main, 'C');
            phones.C = p.ok ? p.phone : null;
            const after = await statusNow(ctx, main);
            const probe = await readAs('L4', 'probe after pairing', phones.A, doorNow(), '/v1/probe');
            arm('H5', { paired: p.ok, why: p.why, cardLines: p.cardLines, confirmState: after?.confirmState ?? null, routesWaiting: after?.routesWaiting, probe: probe.status });
          }

          // ---- H6: alerts off, the sheet's own switch ----------------------------------
          {
            const from = Date.now();
            const sel = `section[aria-label="Phone"] button[role="switch"][aria-label=${J(PUSH_LABEL)}][aria-checked="true"]`;
            const ready = (await waitFor(() => enabledIn(settings, sel), 15_000)) === true;
            const clicked = ready && (await clickIn(ctx, settings, sel, 'alerts off'));
            const off = await waitStatus(ctx, main, (s) => s.pushAlerts === false, 15_000);
            // Long enough for the sheet's own follow-up, which today confirmed
            // the narrower door by itself, to have run if it still does.
            await sleep(2_000);
            const st = await statusNow(ctx, main);
            const probe = await readAs('L4', 'probe after alerts off', phones.A, doorNow(), '/v1/probe');
            const after = pidsNow();
            const block = wants('H6') ? await newBlock(ctx, main, { want: false }) : { blocked: false, why: 'H6 was not asked, so the quiet wait was skipped' };
            const h6 = { clicked, pushAlerts: off.status?.pushAlerts ?? null, confirmState: st?.confirmState ?? null, allowPressed: pressesIn('L4', from).some(ALLOW_PRESSES), routesWaiting: st?.routesWaiting, probe: probe.status, pids: pidsFrom(after), blocked: block.blocked, requests: block.requests ?? null, waitedMs: block.waitedMs ?? 0 };
            if (!block.blocked) cannotRead('H6', block.why, h6);
            else arm('H6', h6);
          }

          // ---- H7: the Allow whose lines name the route -------------------------------
          {
            const allowSel = 'section[aria-label="Phone"] [data-phone-confirm] [data-phone-action="confirm-door"]';
            await waitFor(() => enabledIn(settings, allowSel), 20_000);
            const facts7 = await sheetFacts(settings);
            const clickedAt = Date.now();
            const clicked = await clickIn(ctx, settings, allowSel, 'Allow');
            const w = await waitStatus(ctx, main, (s) => isEmptyList(s.routesWaiting), ALLOW_WITHIN_MS + 5_000, 200);
            const waitedMs = w.ok ? Date.now() - clickedAt : null;
            let probe = { status: 0, planted: false, ms: null };
            await waitFor(async () => {
              const a = await readAs('L4', 'probe after Allow', phones.A, doorNow(), '/v1/probe');
              probe = { status: a.status, planted: parseBody(a)?.planted === true, ms: Date.now() - clickedAt };
              return a.status === 200 ? true : null;
            }, ALLOW_WITHIN_MS + 5_000, 250);
            const after = pidsNow();
            const later = await sheetFacts(settings);
            arm('H7', { clicked, linesNamedProbe: routeLineNames(facts7.lines, PLANTED), lines: facts7.lines, routesWaiting: w.status?.routesWaiting, waitedMs, probe, pids: pidsFrom(after), honestyAfter: later.warnings?.[1] ?? null, confirmBlocksAfter: later.confirmBlocks ?? null });
          }

          // ---- H8: Remove of one of three ------------------------------------------------
          {
            if (phones.C === null) {
              cannotRead('H8', 'phone C never paired, so there is no third phone to remove');
            } else {
              const removedId = phones.C.id;
              const sel = `section[aria-label="Phone"] [data-phone-id="${removedId}"] [data-phone-action="remove-phone"]`;
              await waitFor(() => enabledIn(settings, sel), 15_000);
              const at = Date.now();
              const clicked = await clickIn(ctx, settings, sel, 'Remove');
              const trace = { A: [], B: [] };
              while (Date.now() - at < 10_000) {
                for (const label of ['A', 'B']) {
                  const a = await readAs('L4', `${label} after Remove`, phones[label], doorNow(), '/v1/blocked');
                  trace[label].push({ ms: Date.now() - at, status: a.status });
                }
                await sleep(400);
              }
              const firstOkMs = {};
              const afterFirst = {};
              for (const label of ['A', 'B']) {
                const i = trace[label].findIndex((x) => x.status === 200);
                firstOkMs[label] = i < 0 ? null : trace[label][i].ms;
                afterFirst[label] = i >= 0 && trace[label].slice(i).every((x) => x.status === 200);
              }
              const removed = await readAs('L4', 'C after Remove', phones.C, doorNow(), '/v1/blocked');
              const st = await statusNow(ctx, main);
              const after = pidsNow();
              arm('H8', { clicked, removedId, phoneIds: (st?.phones ?? []).map((p) => p.id), firstOkMs, afterFirst, trace, removedRead: removed.status, removedHandshook: removed.handshook === true, confirmState: st?.confirmState ?? null, pids: pidsFrom(after) });
            }
          }

          // ---- H9: the control, a moved public name ----------------------------------------
          {
            const from = Date.now();
            const child = forwarderNow();
            let signalled = false;
            standin.setScenario({ dnsName: `${MOVED_NAME}.` });
            if (child !== null && (spawnSync('/bin/ps', ['-ww', '-p', String(child.pid), '-o', 'command='], { encoding: 'utf8' }).stdout ?? '').includes('tailscale-standin.mjs')) {
              process.kill(child.pid, 'SIGINT');
              signalled = true;
            }
            const moved = await waitStatus(ctx, main, (s) => s.confirmState === 'changed', 45_000);
            const gone = (await waitFor(() => ((standin.readFunnel() ?? []).length === 0 ? true : null), 30_000, 300)) === true;
            const facts9 = await sheetFacts(settings);
            const refused = {
              A: (await readAs('L4', 'A while moved', phones.A, doorAt(lastForwarderPort), '/v1/blocked')).status,
              B: (await readAs('L4', 'B while moved', phones.B, doorAt(lastForwarderPort), '/v1/blocked')).status
            };
            standin.setScenario({ dnsName: DEFAULT_SCENARIO.dnsName });
            // Try again: the sheet's `onRetryDoor`, which is `setDoor(true)`.
            const retry = await press(ctx, main, 'setDoor', { on: true });
            const restored = await waitStatus(ctx, main, listeningNow, 90_000);
            const readAfter = await readAs('L4', 'A after the name came back', phones.A, doorNow(), '/v1/blocked');
            arm('H9', {
              signalled,
              movedState: moved.status?.confirmState ?? null,
              funnelGone: gone,
              refused,
              retried: retry.ok,
              retryDrawn: facts9.retryDrawn ?? null,
              restored: { state: restored.status?.state ?? null, confirmState: restored.status?.confirmState ?? null },
              allowPressed: pressesIn('L4', from).some(ALLOW_PRESSES),
              readAfter: readAfter.status
            });
          }
          l4End = await statusNow(ctx, main);
        } finally {
          settings.close();
        }
      });
    }

    // =========================================================================
    // L5 — PARENT, the downgrade
    // =========================================================================
    // THE DOWNGRADE NEEDS A TWELVE-ROUTE AGREEMENT TO DOWNGRADE FROM (the
    // probe review): without one, DG1 and DG2 cannot be read, and L5 and L6
    // are not launched.
    const dgRead = downgradeReadable(l4End);
    report.readings.L4End = l4End === null ? null : { state: l4End.state ?? null, confirmState: l4End.confirmState ?? null, routesAllowed: l4End.routesAllowed ?? null, routesWaiting: l4End.routesWaiting ?? null };
    const downgrade = !stopped && dgRead.ok;
    if (!stopped && LAUNCHES.includes('L5') && !dgRead.ok) {
      for (const id of ['DG1', 'DG2']) cannotRead(id, `${dgRead.why}, so there is no twelve-route agreement on record to downgrade from; L5 and L6 were not launched`);
    }
    if (downgrade && LAUNCHES.includes('L5')) {
      await launch('L5', PARENT, async ({ main, ctx }) => {
        let answered = await probeTry(ctx, 'L5 start');
        const seen = await sampleClosed(ctx, main, 20_000);
        const phonesRead = {
          A: (await readAs('L5', 'A blocked last forwarder', phones.A, doorAt(lastForwarderPort), '/v1/blocked')).status,
          B: (await readAs('L5', 'B blocked last forwarder', phones.B, doorAt(lastForwarderPort), '/v1/blocked')).status
        };
        answered = (await probeTry(ctx, 'L5 after the sample')) || answered;
        const storeBefore = fileSha(STORE_FILE);
        const off = await press(ctx, main, 'setDoor', { on: false });
        await waitStatus(ctx, main, (s) => s.state === 'off', 15_000);
        const on = await press(ctx, main, 'setDoor', { on: true });
        const afterSwitch = await sampleClosed(ctx, main, 20_000);
        const storeAfter = fileSha(STORE_FILE);
        answered = (await probeTry(ctx, 'L5 after the switch')) || answered;
        arm('DG1', {
          confirmState: seen.last?.confirmState ?? null,
          states: seen.states,
          everListening: seen.everListening,
          forwarderSeen: seen.forwarderSeen,
          funnelArgv: funnelArgvSince(ctx.startedAt),
          phones: phonesRead,
          switched: off.ok && on.ok,
          storeMoved: storeBefore !== null && storeAfter !== null && storeBefore !== storeAfter,
          afterSwitch: { everListening: afterSwitch.everListening || afterSwitch.forwarderSeen, confirmState: afterSwitch.last?.confirmState ?? null, states: afterSwitch.states },
          probeAnswered: answered,
          probeTries: probeTries.filter((t) => t.launch === 'L5').length
        });
      });
    }

    // =========================================================================
    // L6 — HEAD_PLANTED, the upgrade back
    // =========================================================================
    if (downgrade && LAUNCHES.includes('L6')) {
      await launch('L6', HEAD_PLANTED, async ({ main, ctx }) => {
        let answered = await probeTry(ctx, 'L6 start');
        const seen = await sampleClosed(ctx, main, 20_000);
        answered = (await probeTry(ctx, 'L6 after the sample')) || answered;
        const settings = await attachSettings(main);
        try {
          const allowSel = 'section[aria-label="Phone"] [data-phone-confirm] [data-phone-action="confirm-door"]';
          await waitFor(() => enabledIn(settings, allowSel), 30_000);
          const facts = await sheetFacts(settings);
          answered = (await probeTry(ctx, 'L6 just before the Allow')) || answered;
          const l5Answered = probeTries.filter((t) => t.launch === 'L5').some((t) => t.live === 200 || t.last === 200);
          const clicked = await clickIn(ctx, settings, allowSel, 'Allow');
          const after = await waitStatus(ctx, main, listeningNow, 90_000);
          let probe = { status: 0, planted: false };
          await waitFor(async () => {
            const a = await readAs('L6', 'probe after the Allow', phones.A, doorNow(), '/v1/probe');
            probe = { status: a.status, planted: parseBody(a)?.planted === true };
            return a.status === 200 ? true : null;
          }, 15_000, 250);
          arm('DG2', {
            confirmState: seen.last?.confirmState ?? null,
            states: seen.states,
            everListening: seen.everListening,
            forwarderSeen: seen.forwarderSeen,
            probeAnsweredBefore: answered || l5Answered,
            probeTries: probeTries.filter((t) => t.launch === 'L5' || t.launch === 'L6').length,
            clicked,
            lines: facts.lines,
            linesNamedProbe: routeLineNames(facts.lines, PLANTED),
            after: { state: after.status?.state ?? null, confirmState: after.status?.confirmState ?? null, routesWaiting: after.status?.routesWaiting, routesAllowed: after.status?.routesAllowed },
            probe
          });
        } finally {
          settings.close();
        }
      });
    }
  } catch (err) {
    report.error = unsecret(String(err?.stack ?? err));
    say(`the run stopped: ${unsecret(String(err?.message ?? err))}`);
  } finally {
    // Everything this run started, by pid or by handle, whatever happened.
    clearInterval(udpTimer);
    try {
      writeFileSync(STOP, 'stop\n', 'utf8');
    } catch {
      /* the world may already be gone */
    }
    rmSync(KEY_FILE, { force: true });
    const keyFileGone = !existsSync(KEY_FILE);
    const ended = standin === null ? { ended: [], left: [] } : endStandinProcesses(STANDIN_DIR, 1_500);
    const findings = watch?.stop() ?? [];
    const log = standin?.readLog() ?? [];
    const questions = dns?.log() ?? [];
    if (dns !== null) await dns.close();
    const apnsSummary = apns === null ? null : { requests: apns.requests.length, ok: apns.requests.filter((r) => r.status === 200).length, connections: { ...apns.connections }, origins: apns.origins };
    const jwts = apns === null ? [] : apns.requests.map((r) => r.authorization).filter((a) => typeof a === 'string');
    for (const j of jwts) remember(j);
    if (apns !== null) {
      await apns.close().catch(() => undefined);
      apnsClosed = true;
    }
    // THE SCRATCH SOCKET, the server and then the FILE (the fix round, lens 2,
    // probe:p321's block and probe:p261's lesson): each launch's teardown ended
    // the server, and tmux 3.7b leaves its socket FILE after kill-server, so
    // the file is unlinked here by its exact name. The name was composed by the
    // harness and checked at the top; the guard asks that shape again, so
    // nothing else can ever be the target.
    const socketFile = socketPathOf(SOCKET);
    const ownSocket = /^gmux-p33312[a-z0-9-]*-\d+$/.test(SOCKET);
    if (existsSync(socketFile) && ownSocket) {
      spawnSync(TMUX, ['-L', SOCKET, 'kill-server'], { stdio: 'ignore', timeout: 10_000 });
      await sleep(1_000);
    }
    const socketExistedAfterTeardown = existsSync(socketFile);
    if (ownSocket) rmSync(socketFile, { force: true });
    const socketGone = !existsSync(socketFile);
    const text = appLogText();
    // The log is bounded and rolls over into app.log.1 (src/main/log/index.ts),
    // so six launches can push early lines there: both are read (the probe review).
    const older = (() => {
      try {
        return readFileSync(`${APP_LOG}.1`, 'utf8');
      } catch {
        return '';
      }
    })();
    const logged = `${older}\n${text ?? ''}`;
    // Every long secret this run held (each phone's alert address, every
    // nonce and signature it sent, every one-shot pairing secret, every bearer
    // token Apple's stand-in saw, the scratch key's lines), and any PEM block.
    const appLogHits = text === null ? 0 : secretHits(logged, [...SECRETS]) + (logged.includes('-----BEGIN') ? 1 : 0);
    const commandOfPid = (pid) => (spawnSync('/bin/ps', ['-ww', '-p', String(pid), '-o', 'command='], { encoding: 'utf8' }).stdout ?? '').trim();
    const ours = (spawnSync('/bin/ps', ['-Ao', 'pid=,ppid=,comm='], { encoding: 'utf8' }).stdout ?? '')
      .split('\n')
      .filter((l) => /Electron|Tortie$|chrome_crashpad/.test(l) && !/defunct/.test(l))
      .filter((l) => {
        const [pid, ppid] = l.trim().split(/\s+/).map(Number);
        return launchRecords.some((x) => [x.shim, x.app].filter((p) => p > 0).some((p) => pid === p || ppid === p)) || commandOfPid(pid).includes(PROFILE);
      });
    const historyAfter = historyStat();
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
      apnsLoopback: apns !== null && Object.values(apns.origins ?? {}).every((o) => String(o).startsWith(`http://${STAND_IN_HOST}:`)),
      apnsClosed,
      electronLeft: ours.length,
      standinLeft: ended.left.length,
      keyFileGone,
      socketExistedAfterTeardown,
      socketGone,
      historySame: historyAfter === HISTORY_BEFORE,
      history: { before: HISTORY_BEFORE, after: historyAfter },
      appLogRead: text !== null,
      appLogRolled: older !== '',
      appLogHits
    });
    if (historyAfter !== HISTORY_BEFORE) say(`HIS HISTORY MOVED: ${HISTORY_BEFORE} became ${historyAfter}. The run fails; tell the operator.`);
    report.launches = launchRecords.map((l) => ({ launch: l.launch, checkout: l.checkout, shim: l.shim, app: l.app, seconds: l.endedAt > 0 ? Math.round((l.endedAt - l.startedAt) / 1000) : null }));
    report.presses = presses;
    report.probeTries = probeTries;
    report.apns = apnsSummary;
    report.raw = { udpSeen: [...udp.seen].sort(), udpLeaks: udp.leaks, standinEnded: ended, realTailscaleFindings: findings, electronLeft: ours, questions: questions.length };
    for (const id of PICKED) if (!graded.has(id)) cannotRead(id, stopped ? 'not reached: L1 did not set the world up' : 'not reached: the run stopped before this arm');
    if (KEEP) {
      const dir = join(RUN, 'rederive');
      mkdirSync(dir, { recursive: true, mode: 0o700 });
      writeFileSync(join(dir, 'statuses.json'), `${unsecret(J({ note: 'Every distinct pocket.status() this run read, in order, by launch.', statuses }, null, 1))}\n`, { mode: 0o600 });
      writeFileSync(join(dir, 'answers.json'), `${unsecret(J({ note: 'Every phone request this run made, with its answer. Synthetic: every session and phone is this run’s own.', answers }, null, 1))}\n`, { mode: 0o600 });
      writeFileSync(join(dir, 'apns.json'), `${unsecret(J({ note: 'What Apple’s stand-in recorded, tokens and bearer tokens removed.', requests: (apns?.requests ?? []).map((r) => ({ seq: r.seq, at: r.at, origin: r.origin, phone: TOKEN_OF.get(r.token) ?? 'unknown', status: r.status, reason: r.reason, bodyBytes: r.bodyBytes, verifies: r.jwt?.verifies ?? null })) }, null, 1))}\n`, { mode: 0o600 });
      say(`kept the scratch world at ${RUN}; the re-derivation reads ${dir}`);
    } else {
      rmSync(RUN, { recursive: true, force: true });
    }
    mkdirSync(OUT, { recursive: true });
    writeFileSync(join(OUT, 'probe-p33312.json'), `${unsecret(J(report, null, 1))}\n`, 'utf8');
    say(`wrote ${join(OUT, 'probe-p33312.json')}`);
  }

  say(`${String(report.arms.filter((a) => a.ok === true).length)} arm(s) passed, ${String(failures)} failed, ${String(unreadable)} could not be read`);
  process.exit(failures > 0 ? 1 : unreadable > 0 ? 2 : 0);
}
