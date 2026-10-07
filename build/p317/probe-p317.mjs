#!/usr/bin/env node
/**
 * probe:p317 — THE PHASE 317 APP RUN, the Mac side: End from the
 * phone, through the door's two writes (build/p317/SPEC.md §7.4).
 *
 * ONE Electron at HEAD through build/electron-run.mjs's `withElectron`, on a
 * scratch profile and a scratch HOME under the harness directory, the tmux
 * socket build/harness-socket.mjs hands it (`gmux-p317…`), and the LOOPBACK
 * scratch machine build/with-scratch-machine.mjs starts around this file (its
 * own sshd on 127.0.0.1, its own keys and agent, its own TMUX_TMPDIR). With
 * `P317_PARENT_CHECKOUT` a SECOND Electron runs that BUILT parent checkout on
 * the same profile, one after the other and never at once: it runs FIRST, so
 * the HEAD launch that follows reads the door's agreement `changed` (W1), the
 * route list being a hashed field.
 *
 * WHAT IS REAL. The door, switched on, confirmed and published through the
 * STAND-IN Tailscale (build/p330/tailscale-standin.mjs, named by
 * GMUX_TAILSCALE_BIN and preflighted by sha256; the process table is sampled
 * every second and a real Tailscale under the app, or run as a command, FAILS
 * the run). The name check asks build/p332/dns-standin.mjs, IN THIS PROCESS on
 * 127.0.0.1, named by GMUX_POCKET_NAME_SERVERS. The phones are
 * build/p316/node-phone.mjs, paired through the stand-in's loopback forwarder
 * with mutual TLS, their writes signed over the method, the path and the body
 * (`signedPost`, `endSession`). The sessions are this run's:
 * local shells, one `claude` whose binary is a /bin/sh printing the committed
 * Phase 312 dialog (a `needs_input` row with a process tree), and shells on the
 * loopback machine. NO VENDOR PROCESS RUNS AND NO MODEL TURN IS SPENT.
 *
 * THE ARMS (SPEC §7.4)
 *   W1  the door reads `changed` (after the parent confirmed it; `never` on a
 *       fresh profile, which has nothing to change); its lines hold
 *       `Answers these and nothing else: blocked, choose, end, pair, say,
 *       session, sessions, turns` and `Lets an allowed phone end a session,
 *       answer a numbered question and send a session one message` (the union
 *       with Phases 318 and 316.7, ROUTE_LINE and WRITE_LINE below);
 *       Settings then Phone draws POCKET_DOOR_HONESTY and both lines INSIDE
 *       ITS CONFIRM BLOCK, read while that block is drawn and before Allow,
 *       because PhoneSection.tsx draws the sentence there and nowhere else
 *       (the tests round: the reverify found the sheet read after Allow,
 *       where the block is gone); Allow listens
 *   W2  `/v1/blocked`: every row's `end` is the offer its status and machine
 *       say (the probe's own reading of the two gates); `/v1/session`'s
 *       `endConfirm` equals the probe's own composition from the row's facts
 *       (SPEC §7.6 method 2), and a row End is not offered on carries none
 *   W3  End a local shell from A: 200 `done` with its id; the tmux session gone
 *       on the scratch socket; main reads it exited; one `the phone's end:
 *       done` line in app.log
 *   W4  End the `needs_input` stand-in: `done`; its pid and its children gone
 *       within Phase 323's bound (HANGUP_GRACE_MS + TERM_GRACE_MS, read from
 *       the checkout's own source)
 *   W5  End the remote shell: `done`; the far tmux session gone, read on the
 *       machine's own server
 *   W6a THE MAC BATCH'S CASE. The machine's entry dropped from the scratch
 *       machines file and `machines:reload` invoked; read back: no machine row
 *       holds that id and the remote row is still listed with its machine.
 *       Its `end` reads `{ state: 'offered', batch: false }`; a `batch: true`
 *       End is refused `unreachable` with nothing ended; the single End is
 *       offered and NOT pressed. A row no longer listed after the reload is
 *       UNREADABLE (SPEC §13 item 7), never a pass. The entry is put back.
 *   W6b A MACHINE THAT STOPS ANSWERING. The scratch machine's sshd listener and
 *       its per-connection children, found by the configuration file
 *       build/with-scratch-machine.mjs started it with (read with `ps -ww`,
 *       whose command is never cut short, under either name: as started, or
 *       as macOS's sshd renames its listener, `sshd: <that command line>
 *       [listener] …`; `isScratchSshd`) and RECORDED, are
 *       paused with SIGSTOP and resumed with SIGCONT in a `finally` (and on
 *       exit); the row reads `unknown`, its `end` is `unreachable` with
 *       END_UNREACHABLE_TITLE, single and batch are refused `unreachable`,
 *       and nothing was ended
 *   W7  the attack, each on its reason: removed between read and press
 *       (`removed`, main's sentence); exited (`ended`); an id nothing holds
 *       (`gone`, `Session not found.`); the same bytes again (404); the same
 *       write id fresh-signed (the recorded body, one act by the log); A and B
 *       on one session at once (`busy`; UNREADABLE if the two never
 *       overlapped); End from a phone Removed on the Mac (refused before
 *       HTTP); a fourth body key (`malformed`, its id echoed); `?x=1` on
 *       `/v1/end` (404, nothing forwarded); and THE DOOR SWITCHED OFF DURING
 *       AN END, twice (the tests round). `unpublish()` stops the Funnel child
 *       FIRST (src/main/pocket/ipc.ts), so the connection is cut at once and
 *       an act already started completes; the reverify measured an act at 32
 *       to 44 ms and the cut 1 to 2 ms after the send. So: switched off once
 *       main has LOGGED the act, the answer is 200 `done` with its id and one
 *       act, never a 404 (SPEC D4: after the act nothing replaces the answer;
 *       a cut there, the stop beating the answer across the forwarder, is
 *       UNREADABLE); and switched off at the SEND, graded on the measured
 *       order (`offAtSendCase`): 200 `done` with one act, a cut with one act
 *       and the session gone, a cut with no act and the session still there,
 *       or a 404 with no act; never a 404 after an act, a second act, a
 *       `done` with no act, or a log that disagrees with tmux
 *   W8  THE UNPAIR THE FIX ROUND TOOK OUT IS NO ROUTE: B's signed POST to
 *       `/v1/unpair` is refused 404 with nothing forwarded (main logs no
 *       write); B still reads; the Phones list still names B and the door
 *       stays confirmed; A reads with no Allow (build/p317/SPEC.md "§Fix
 *       round": the phone waited on that write before it could forget a Mac
 *       that did not answer, which made Unpair slower than today)
 *   W9  app.log and every file under the profile and HOME hold no write id
 *       (so no body, which carries it) and no nonce (every write is sent
 *       with a nonce this file chose, the stand-in for its signed headers,
 *       which a log of the headers would carry); one log line per write that
 *       ACTED, the way main logs them (SPEC §5.3.4 step 7: one line per write
 *       that reached the act, whatever it answered, and none for a malformed
 *       body, a busy, a ledger repeat or a 404): an answered write acted when
 *       its 200 is not busy, not the strict parse's malformed and not a
 *       repeat, and a write whose answer was CUT (W7's door switched off)
 *       acted when its session is gone on tmux, read there and never on the
 *       log this arm counts (`actedOf`; the reverify's W9 counted answers, so
 *       the act W7 cut read as a line too many)
 *   W10 `src/main/menu.ts` unchanged against the snapshot `551312f7`; Pair a
 *       Phone… still under Settings… (MENU1); the Mac sheet's End confirm for
 *       a twin session reads the moved words (window.__p293's inline panel),
 *       and with a parent run, byte for byte the parent's
 *   WP  with P317_PARENT_CHECKOUT: `POST /v1/end` and `/v1/unpair` refused
 *       404 with nothing forwarded (main logs no write); the session still
 *       running; the lines name neither route
 *   RUN both preflights, the quiet agents at every launch, no real Tailscale,
 *       nothing forbidden at the stand-in, every stand-in ended, every paused
 *       pid resumed
 *
 * WHAT IT REFUSES TO DO. It never names the person's tmux server or `-L gmux`
 * (it refuses any socket that is not a `gmux-p317` harness socket), never
 * binds a real interface and dials nothing but 127.0.0.1, never runs a real
 * `tailscale`, never asks real DNS, reads no keychain and no credential of his
 * (the app runs `--use-mock-keychain`), and signals only the pids it started
 * or RECORDED for W6b, the scratch machine's own sshd, by pid, never by
 * pattern. It takes NO screenshot. Before EVERY launch the profile's
 * agents.json renames the Gemini, Qwen, Antigravity, Grok and Droid binaries
 * and `agents:list` is read back, so no agent's `--version` runs.
 *
 * VERIFIERS ONLY: it starts an Electron. Take the orchestrator's lock.
 *
 *   npm run build && npm run -s probe:p317
 *   P317_PARENT_CHECKOUT=<a BUILT parent checkout> npm run -s probe:p317
 *   P317_KEEP=1                    keep the scratch world for a re-derivation
 *   node build/p317/probe-p317.mjs --grader-self-test   every grader on its fixtures; starts nothing
 *
 * Exit 0 when every arm passed, 1 when one failed, 2 when it could not run or
 * an arm could not be READ.
 */

import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { withElectron, withoutDevRenderer } from '../electron-run.mjs';
import { cdpEval, wsConnect } from '../cdp-client.mjs';
import { pickRendererTarget } from '../cdp-target.mjs';
import { gradeFixtures } from '../probe-graders.mjs';
import { keyscanText } from '../ssh-run.mjs';
import { endSession, freshWriteId, makePhone, pairThrough, readOffer, signedGet, signedPost } from '../p316/node-phone.mjs';
import { DEFAULT_SCENARIO, endStandinProcesses, makeStandin, preflightStandin, processRows, watchForRealTailscale } from '../p330/tailscale-standin.mjs';
import { NAME_SERVERS_VAR, loopbackOnlyServers, makeDnsStandin, quietAgentsHeld, writeQuietAgents } from '../p332/dns-standin.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const J = JSON.stringify;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// What the run holds the app against, BY VALUE or read from the checkout
// ---------------------------------------------------------------------------

/** The snapshot 317 is built on (build/p317/SPEC.md §4.1): menu.ts must read as it does there. */
export const SNAPSHOT = '551312f7';
export const MACHINE_ID = 'p317far';
/*
 * Phase 318 added two writes beside End (build/p318/SPEC.md §4.2, §5.1.7), so
 * the route line names `choose` and `say` too and the write line names all
 * three clauses; End's arms below read nothing else of them. Phase 316.7's
 * `sessions` joined the route line when it landed second, Phase 337's
 * `screen` and `keys` joined both lines (build/p337/SPEC.md D1, D35), and
 * Phase 337.1's `scrollback` read joined the route line alone, eleven routes,
 * no write clause moving (build/p3371/SPEC.md D1, D35, §Attack B7).
 */
export const ROUTE_LINE = 'Answers these and nothing else: blocked, choose, end, keys, pair, say, screen, scrollback, session, sessions, turns';
export const WRITE_LINE = 'Lets an allowed phone end a session, answer a numbered question, send a session one message and type into any session as you would at this Mac';
/** HEAD's door honesty sentence, by value for the fixtures (build/p3371/SPEC.md D35: the terminal and what it printed before); the run reads the tree's own. */
export const HONESTY_LINE = 'A phone you allow can see what any session’s terminal shows and what it printed before, type into it as you would at this Mac, answer a numbered question, send a session one message and end a session.';
export const LIVE = Object.freeze(['running', 'idle', 'needs_input']);
export const DONE_LINE = "the phone's end: done";
export const WRITE_LINE_PREFIX = "the phone's ";
/** Every phrase this run's writes are logged under (SPEC §5.3.4 step 7). */
export const LOGGED_VERBS = Object.freeze(["the phone's end:", "the phone's unpair:"]);
/* The unpair phrase stays listed on purpose: a line under it is a write the
   fix round took out, and W8 and W9 must see it if one ever comes back. */

/** A string literal's value: `NAME = '…'` (or with a type), joined across `+` pieces and a line break. */
export function constWord(src, name) {
  const at = new RegExp(`\\b${name}\\s*(?::[^=]*)?=\\s*`).exec(String(src ?? ''));
  if (at === null) return null;
  let rest = src.slice(at.index + at[0].length);
  const out = [];
  for (;;) {
    const m = /^\s*(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)")/.exec(rest);
    if (m === null) break;
    out.push((m[1] ?? m[2]).replace(/\\(.)/g, '$1'));
    rest = rest.slice(m[0].length);
    const plus = /^\s*\+/.exec(rest);
    if (plus === null) break;
    rest = rest.slice(plus[0].length);
  }
  return out.length === 0 ? null : out.join('');
}

/**
 * The offer the probe EXPECTS on a row, from its own reading of the two gates
 * (SPEC §5.4 and D14): `unknown` is unreachable with the Mac's title; a live
 * row is offered, batch false only on a machine Tortie holds no row for;
 * anything else (exited, restorable) is offered nothing.
 */
export function expectedOffer({ status, remote, machineKnown }, title) {
  if (status === 'unknown') return { state: 'unreachable', title };
  if (LIVE.includes(status)) return { state: 'offered', batch: !(remote === true && machineKnown === false) };
  return { state: 'none' };
}

/**
 * The End confirmation, composed by THIS FILE from the row's facts (SPEC §7.6
 * method 2): the three bodies are this file's own reading of the rule, never
 * an import of it. `resumable` is main's `resumeCapture` and `resumeArgv` read
 * the way the readiness reads them.
 */
export function composeEndConfirm({ name, machineLabel, resumeCapture, resumeArgv, agent }) {
  const armed = Array.isArray(resumeArgv) && resumeArgv.length > 0;
  const resumable = resumeCapture === 'armed' ? armed : resumeCapture === undefined || resumeCapture === null ? armed : false;
  void agent;
  let body;
  if (typeof machineLabel === 'string') {
    body = `This stops what is running in it on ${machineLabel}. Tortie saves a copy of what it printed first, so you can read that copy here afterwards. Bringing it back always returns the folder, and it returns the conversation only when Tortie recorded one for this agent.`;
  } else if (resumable) {
    body = 'This stops what is running in it. The scrollback and the conversation are saved first, so you can restore this session later.';
  } else {
    body = 'This stops what is running in it. The scrollback is saved first, so you can restore this session later.';
  }
  return { title: `End '${name}'?`, body, confirmLabel: 'End session' };
}

/** A write's answer as JSON, or null. */
export function answerOf(reply) {
  try {
    return reply?.status === 200 ? JSON.parse(reply.body) : null;
  } catch {
    return null;
  }
}

const deepEqual = (a, b) => J(a) === J(b);
/** The route ids the confirm lines' `Answers these and nothing else:` line names, or null. */
export function routeIdsOf(lines) {
  const line = (lines ?? []).find((l) => l.startsWith('Answers these and nothing else:'));
  return line === undefined ? null : line.slice(line.indexOf(':') + 1).split(',').map((s) => s.trim()).filter((s) => s !== '');
}
const sorted = (xs) => [...xs].sort();

/**
 * Is `command` (one `ps -ww` row's, never cut short) the scratch machine's
 * sshd listener? As build/with-scratch-machine.mjs started it, or as macOS's
 * sshd renames its listener once it is up: `sshd: <that command line>
 * [listener] 0 of 10-100 startups`. The configuration path must be followed
 * by the end of the line or by ` [listener]`, so a sibling path that only
 * begins with it, the person's own sshd and a per-connection child are never
 * taken for it (the tests round: the reverify found the shipping reader, `ps
 * -ax` and the first spelling alone, found nothing to pause).
 */
export function isScratchSshd(command, conf) {
  const started = `/usr/sbin/sshd -D -f ${String(conf)}`;
  const c = String(command ?? '');
  return c === started || c.startsWith(`sshd: ${started} [listener]`);
}

/**
 * Whether a write acted, the way main logs it (SPEC §5.3.4 step 7: after the
 * act, whatever the act answered; never for a malformed body, a busy, a
 * ledger repeat or a 404). An answer says so itself. A write whose answer was
 * CUT is read by its consequence, `goneAfter`: the End's session gone on tmux
 * once the cut settled. Anything else did not act.
 */
export function actedOf(reply, { repeat = false, goneAfter = null } = {}) {
  const a = answerOf(reply);
  if (a !== null) return !repeat && a.outcome !== 'busy' && !(a.outcome === 'refused' && a.reason === 'malformed');
  return reply?.status === 0 && goneAfter === true;
}

/**
 * The door switched off at a write's SEND, graded on the order the tree
 * keeps (the tests round): `unpublish()` stops the Funnel child first, so the
 * connection is usually cut before any answer, and an act already started
 * completes. The honest endings, each with the log (`acts`) and tmux
 * (`alive`) agreeing: the answer arrived (200 done, one act, the session
 * gone); cut after the act (one act, gone); cut before the door read it (no
 * act, alive); or refused by a stopping door (404, no act, alive). Answers
 * which, or null for anything else: a 404 after an act, a second act, a
 * `done` with no act, or a log that disagrees with tmux.
 */
export function offAtSendCase({ status, outcome, echoed, acts, alive }) {
  if (status === 200 && outcome === 'done' && echoed === true && acts === 1 && alive === false) return 'answered';
  if (status === 0 && acts === 1 && alive === false) return 'cut after the act';
  if (status === 0 && acts === 0 && alive === true) return 'cut before the door read it';
  if (status === 404 && acts === 0 && alive === true) return 'refused by a stopping door';
  return null;
}

// ---------------------------------------------------------------------------
// The graders: pure, over a recorded reading, each clause shown to fail
// ---------------------------------------------------------------------------

export const GRADERS = {
  W1: {
    title: 'the door asks again over its new route list, in words',
    clauses: [
      ['the lines name every route, the one write among them', (r) => r.lines.includes(ROUTE_LINE)],
      ['the lines say what the write does', (r) => r.lines.includes(WRITE_LINE)],
      ['Settings then Phone draws the door honesty sentence in its confirm block, before Allow', (r) => typeof r.honesty === 'string' && r.honesty.length > 0 && typeof r.confirmBlock === 'string' && r.confirmBlock.includes(r.honesty)],
      ['the confirm block draws both lines before Allow', (r) => typeof r.confirmBlock === 'string' && r.confirmBlock.includes(ROUTE_LINE) && r.confirmBlock.includes(WRITE_LINE)],
      ['the agreement read changed after the parent confirmed it, and anything but confirmed on a fresh profile', (r) => (r.parentRanFirst ? r.confirmStateBefore === 'changed' : r.confirmStateBefore !== 'confirmed')],
      ['Allow listened', (r) => r.listening === true]
    ]
  },
  W2: {
    title: 'every row is offered what its two gates say, with the Mac\'s own confirmation',
    clauses: [
      ['every row of this run is offered what its status and machine say', (r) => r.rows.length > 0 && r.rows.every((x) => deepEqual(x.end, x.want))],
      ['every offered row carries the Mac\'s own confirmation, composed here from its facts', (r) => r.confirms.length > 0 && r.confirms.every((x) => deepEqual(x.got, x.want))],
      ['a row End is not offered on carries none', (r) => r.unoffered.every((x) => x.got === null)]
    ]
  },
  W3: {
    title: 'End a local shell from the phone',
    clauses: [
      ['200 done with its id echoed', (r) => r.status === 200 && r.outcome === 'done' && r.echoed === true],
      ['the tmux session is gone from the scratch socket', (r) => r.tmuxBefore === true && r.tmuxAfter === false],
      ['main reads it exited', (r) => r.mainStatus === 'exited'],
      ['one done line in app.log', (r) => r.doneLines === 1]
    ]
  },
  W4: {
    title: 'End the waiting agent, and its process tree goes',
    clauses: [
      ['it was waiting, with a tree, before the press', (r) => r.statusBefore === 'needs_input' && r.pidsBefore.length > 0],
      ['200 done', (r) => r.status === 200 && r.outcome === 'done'],
      ['its pid and its children are gone within the bound', (r) => r.pidsLeft.length === 0 && r.goneMs !== null && r.goneMs <= r.boundMs]
    ]
  },
  W5: {
    title: 'End a shell on the loopback machine',
    clauses: [
      ['200 done', (r) => r.status === 200 && r.outcome === 'done'],
      ['the far tmux session is gone from the machine\'s own server', (r) => r.farBefore === true && r.farAfter === false]
    ]
  },
  W6a: {
    title: 'a machine Tortie holds no row for: End alone, never End these',
    clauses: [
      ['the machine row is gone and the remote row is still listed with its machine', (r) => r.machineRowGone === true && r.rowListed === true && r.rowMachineSet === true],
      ['the row is offered End alone', (r) => deepEqual(r.offer, { state: 'offered', batch: false })],
      ['a batch End is refused unreachable, with the Mac\'s title', (r) => r.batch.status === 200 && r.batch.outcome === 'refused' && r.batch.reason === 'unreachable' && r.batch.sentence === r.title],
      ['nothing was ended', (r) => r.doneLines === 0 && r.farAfter === true]
    ]
  },
  W6b: {
    title: 'a machine that stops answering: no End at all',
    clauses: [
      ['the listener and its children were paused, then resumed', (r) => r.paused > 0 && r.resumed === r.paused],
      ['the row read unknown', (r) => r.unknownSeen === true],
      ['its End is unreachable, with the Mac\'s title', (r) => deepEqual(r.offer, { state: 'unreachable', title: r.title })],
      ['single and batch are both refused unreachable', (r) => [r.single, r.batch].every((a) => a.status === 200 && a.outcome === 'refused' && a.reason === 'unreachable')],
      ['nothing was ended', (r) => r.doneLines === 0 && r.farAfter === true]
    ]
  },
  W7: {
    title: 'the attack, each refused on its own reason',
    clauses: [
      ['removed between read and press: refused removed, with main\'s sentence', (r) => r.removed.reason === 'removed' && r.removed.sentence === r.words.removed],
      ['exited: refused ended, with the press rule\'s sentence', (r) => r.exited.reason === 'ended' && r.exited.sentence === r.words.changed],
      ['an id nothing holds: refused gone, Session not found.', (r) => r.nothing.reason === 'gone' && r.nothing.sentence === r.words.notFound],
      ['the same bytes again: 404, and one act', (r) => r.replay.first === 200 && r.replay.again === 404 && r.replay.doneLines === 1],
      ['the same write id fresh-signed: the recorded body, one act', (r) => r.reused.first === 200 && r.reused.second === 200 && r.reused.sameBody === true && r.reused.doneLines === 1],
      ['two phones on one session at once: one done, the other busy', (r) => deepEqual(sorted(r.twoPhones.outcomes), ['busy', 'done'])],
      ['a phone Removed on the Mac is refused before HTTP', (r) => r.removedPhone.status === 0 && r.removedPhone.wasPaired === true],
      ['the door switched off once main logged the act: 200 done with its id, one act, never replaced', (r) => r.offAfterAct.logged === true && r.offAfterAct.status === 200 && r.offAfterAct.outcome === 'done' && r.offAfterAct.echoed === true && r.offAfterAct.acts === 1],
      ['the door switched off at the send: an honest ending, at most one act, the log and tmux agreeing', (r) => offAtSendCase(r.offAtSend) !== null],
      ['a fourth body key: refused malformed, its id echoed', (r) => r.fourthKey.status === 200 && r.fourthKey.outcome === 'refused' && r.fourthKey.reason === 'malformed' && r.fourthKey.echoed === true],
      ['a query on /v1/end: 404, and nothing forwarded', (r) => r.query.status === 404 && r.query.writeLines === 0 && r.query.stillRunning === true]
    ]
  },
  W8: {
    title: 'the unpair the fix round took out is no route',
    clauses: [
      ['a signed POST to /v1/unpair is refused 404', (r) => r.status === 404],
      ['nothing was forwarded: main logs no write', (r) => r.writeLines === 0],
      ['the phone still reads', (r) => r.nextStatus === 200],
      ['the Phones list still names it, and the agreement stands', (r) => r.listed === true && r.confirmState === 'confirmed'],
      ['the other phone reads with no Allow', (r) => r.otherAfter === 200]
    ]
  },
  W9: {
    title: 'no write id, body or signature kept anywhere, and one log line per write that acted',
    clauses: [
      ['app.log was read', (r) => r.appLogRead === true],
      ['no file under the profile or HOME holds a write id, a body or a signature', (r) => r.filesScanned > 0 && r.hits.length === 0],
      ['one log line per write that acted, an answered one by its answer and a cut one by tmux', (r) => r.acted > 0 && r.logLines === r.acted]
    ]
  },
  W10: {
    title: 'the menus do not move, and the Mac sheet reads the moved words',
    clauses: [
      ['menu.ts is the snapshot\'s, byte for byte', (r) => r.menuSame === true],
      ['Pair a Phone… is still right under Settings…', (r) => r.pairUnderSettings === true],
      ['the sheet\'s End confirm reads the moved words', (r) => typeof r.inline === 'string' && r.want.every((w) => r.inline.includes(w))],
      ['the same words as the parent\'s sheet, when a parent ran', (r) => r.parentInline === null || r.parentInline === r.inline]
    ]
  },
  WP: {
    title: 'the parent has no write route',
    clauses: [
      ['both writes refused 404', (r) => r.end === 404 && r.unpair === 404],
      ['nothing was forwarded: main logs no write', (r) => r.writeLines === 0],
      ['the session is still running', (r) => LIVE.includes(r.status)],
      ['the lines name neither route', (r) => routeIdsOf(r.lines) !== null && !routeIdsOf(r.lines).includes('end') && !routeIdsOf(r.lines).includes('unpair') && !r.lines.some((l) => l.startsWith('Lets an allowed phone'))]
    ]
  },
  RUN: {
    title: 'no real Tailscale, no real DNS, no agent, nothing left',
    clauses: [
      ['the Tailscale preflight passed', (r) => r.tailscalePreflight === true],
      ['the DNS preflight passed at every launch', (r) => r.dnsPreflights.length > 0 && r.dnsPreflights.every(Boolean)],
      ['the quiet agents held at every launch', (r) => r.agentsHeld.length > 0 && r.agentsHeld.every(Boolean)],
      ['no real Tailscale in any sample', (r) => r.realTailscale === 0 && r.samples > 0],
      ['nothing forbidden reached the stand-in', (r) => r.forbidden === 0],
      ['every stand-in ended', (r) => r.standinLeft === 0],
      ['every paused pid was resumed', (r) => r.stillStopped === 0]
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

const TITLE = 'Tortie cannot see whether this session is running, so it cannot end it.';
const WORDS = { removed: 'This session was removed, so there is nothing to end. Nothing was changed.', changed: 'This session changed. Nothing was done.', notFound: 'Session not found.' };
const okAnswer = { status: 200, outcome: 'done', reason: null, sentence: null };

/** Each grader's honest reading, and one break per clause (build/probe-graders.mjs). */
export const GRADER_FIXTURES = {
  W1: {
    pass: { lines: ['Publishes https://x.ts.net:8443', ROUTE_LINE, WRITE_LINE], honesty: HONESTY_LINE, confirmBlock: `Publishes https://x.ts.net:8443\n${ROUTE_LINE}\n${WRITE_LINE}\n${HONESTY_LINE}\nAllow`, parentRanFirst: true, confirmStateBefore: 'changed', listening: true },
    breaks: {
      'the lines name every route, the one write among them': (r) => void (r.lines = r.lines.filter((l) => l !== ROUTE_LINE)),
      'the lines say what the write does': (r) => void (r.lines = r.lines.filter((l) => l !== WRITE_LINE)),
      'Settings then Phone draws the door honesty sentence in its confirm block, before Allow': (r) => void (r.confirmBlock = `${ROUTE_LINE}\n${WRITE_LINE}\nAllow`),
      'the confirm block draws both lines before Allow': (r) => void (r.confirmBlock = `${HONESTY_LINE}\nAllow`),
      'the agreement read changed after the parent confirmed it, and anything but confirmed on a fresh profile': (r) => void (r.confirmStateBefore = 'confirmed'),
      'Allow listened': (r) => void (r.listening = false)
    },
    refused: [
      { what: 'a fresh profile that read confirmed before any Allow', clause: 'the agreement read changed after the parent confirmed it, and anything but confirmed on a fresh profile', edit: (r) => void Object.assign(r, { parentRanFirst: false, confirmStateBefore: 'confirmed' }) },
      // The reverify's reading: the section read after Allow, its confirm
      // block gone, so the sentence was nowhere to be found.
      { what: 'the sheet read after Allow, with no confirm block drawn (the reverify\'s W1)', clause: 'Settings then Phone draws the door honesty sentence in its confirm block, before Allow', edit: (r) => void (r.confirmBlock = null) }
    ]
  },
  W2: {
    pass: {
      rows: [
        { sessionId: 'a', end: { state: 'offered', batch: true }, want: { state: 'offered', batch: true } },
        { sessionId: 'b', end: { state: 'none' }, want: { state: 'none' } }
      ],
      confirms: [{ sessionId: 'a', got: { title: "End 'a'?", body: 'x', confirmLabel: 'End session' }, want: { title: "End 'a'?", body: 'x', confirmLabel: 'End session' } }],
      unoffered: [{ sessionId: 'b', got: null }]
    },
    breaks: {
      'every row of this run is offered what its status and machine say': (r) => void (r.rows[1].end = { state: 'offered', batch: true }),
      'every offered row carries the Mac\'s own confirmation, composed here from its facts': (r) => void (r.confirms[0].got = { ...r.confirms[0].got, body: 'The agent stops.' }),
      'a row End is not offered on carries none': (r) => void (r.unoffered[0].got = { title: 'x' })
    }
  },
  W3: {
    pass: { status: 200, outcome: 'done', echoed: true, tmuxBefore: true, tmuxAfter: false, mainStatus: 'exited', doneLines: 1 },
    breaks: {
      '200 done with its id echoed': (r) => void (r.echoed = false),
      'the tmux session is gone from the scratch socket': (r) => void (r.tmuxAfter = true),
      'main reads it exited': (r) => void (r.mainStatus = 'running'),
      'one done line in app.log': (r) => void (r.doneLines = 2)
    }
  },
  W4: {
    pass: { statusBefore: 'needs_input', pidsBefore: [11, 12], status: 200, outcome: 'done', pidsLeft: [], goneMs: 900, boundMs: 75_000 },
    breaks: {
      'it was waiting, with a tree, before the press': (r) => void (r.pidsBefore = []),
      '200 done': (r) => void (r.outcome = 'failed'),
      'its pid and its children are gone within the bound': (r) => void (r.pidsLeft = [12])
    }
  },
  W5: {
    pass: { status: 200, outcome: 'done', farBefore: true, farAfter: false },
    breaks: {
      '200 done': (r) => void (r.status = 404),
      'the far tmux session is gone from the machine\'s own server': (r) => void (r.farAfter = true)
    }
  },
  W6a: {
    pass: { machineRowGone: true, rowListed: true, rowMachineSet: true, offer: { state: 'offered', batch: false }, batch: { status: 200, outcome: 'refused', reason: 'unreachable', sentence: TITLE }, title: TITLE, doneLines: 0, farAfter: true },
    breaks: {
      'the machine row is gone and the remote row is still listed with its machine': (r) => void (r.machineRowGone = false),
      'the row is offered End alone': (r) => void (r.offer = { state: 'offered', batch: true }),
      'a batch End is refused unreachable, with the Mac\'s title': (r) => void (r.batch = okAnswer),
      'nothing was ended': (r) => void (r.farAfter = false)
    }
  },
  W6b: {
    pass: { paused: 3, resumed: 3, unknownSeen: true, offer: { state: 'unreachable', title: TITLE }, title: TITLE, single: { status: 200, outcome: 'refused', reason: 'unreachable' }, batch: { status: 200, outcome: 'refused', reason: 'unreachable' }, doneLines: 0, farAfter: true },
    breaks: {
      'the listener and its children were paused, then resumed': (r) => void (r.resumed = 2),
      'the row read unknown': (r) => void (r.unknownSeen = false),
      'its End is unreachable, with the Mac\'s title': (r) => void (r.offer = { state: 'none' }),
      'single and batch are both refused unreachable': (r) => void (r.single = okAnswer),
      'nothing was ended': (r) => void (r.doneLines = 1)
    }
  },
  W7: {
    pass: {
      words: WORDS,
      removed: { reason: 'removed', sentence: WORDS.removed },
      exited: { reason: 'ended', sentence: WORDS.changed },
      nothing: { reason: 'gone', sentence: WORDS.notFound },
      replay: { first: 200, again: 404, doneLines: 1 },
      reused: { first: 200, second: 200, sameBody: true, doneLines: 1 },
      twoPhones: { outcomes: ['done', 'busy'] },
      removedPhone: { status: 0, wasPaired: true },
      offAfterAct: { logged: true, status: 200, outcome: 'done', echoed: true, acts: 1 },
      // The reverify's H19, measured: cut 1 to 2 ms after the send, the act done once.
      offAtSend: { status: 0, outcome: null, echoed: false, acts: 1, alive: false },
      fourthKey: { status: 200, outcome: 'refused', reason: 'malformed', echoed: true },
      query: { status: 404, writeLines: 0, stillRunning: true }
    },
    breaks: {
      'removed between read and press: refused removed, with main\'s sentence': (r) => void (r.removed.sentence = WORDS.changed),
      'exited: refused ended, with the press rule\'s sentence': (r) => void (r.exited.reason = 'gone'),
      'an id nothing holds: refused gone, Session not found.': (r) => void (r.nothing.sentence = 'Tortie could not end this session.'),
      'the same bytes again: 404, and one act': (r) => void (r.replay.doneLines = 2),
      'the same write id fresh-signed: the recorded body, one act': (r) => void (r.reused.sameBody = false),
      'two phones on one session at once: one done, the other busy': (r) => void (r.twoPhones.outcomes = ['done', 'done']),
      'a phone Removed on the Mac is refused before HTTP': (r) => void (r.removedPhone.status = 404),
      // D4's defect: the answer after the act replaced by a 404.
      'the door switched off once main logged the act: 200 done with its id, one act, never replaced': (r) => void Object.assign(r.offAfterAct, { status: 404, outcome: null, echoed: false }),
      // A 404 after an act: the stop answered for a write that acted.
      'the door switched off at the send: an honest ending, at most one act, the log and tmux agreeing': (r) => void (r.offAtSend.status = 404),
      'a fourth body key: refused malformed, its id echoed': (r) => void (r.fourthKey.echoed = false),
      'a query on /v1/end: 404, and nothing forwarded': (r) => void (r.query.writeLines = 1)
    },
    refused: [
      { what: 'switched off at the send: a second act', clause: 'the door switched off at the send: an honest ending, at most one act, the log and tmux agreeing', edit: (r) => void (r.offAtSend.acts = 2) },
      { what: 'switched off at the send: a cut whose log says one act while tmux still holds the session', clause: 'the door switched off at the send: an honest ending, at most one act, the log and tmux agreeing', edit: (r) => void (r.offAtSend.alive = true) },
      { what: 'switched off at the send: done answered with no act', clause: 'the door switched off at the send: an honest ending, at most one act, the log and tmux agreeing', edit: (r) => void Object.assign(r.offAtSend, { status: 200, outcome: 'done', echoed: true, acts: 0, alive: true }) },
      { what: 'switched off once logged: a second act', clause: 'the door switched off once main logged the act: 200 done with its id, one act, never replaced', edit: (r) => void (r.offAfterAct.acts = 2) },
      { what: 'switched off once logged: another write id echoed', clause: 'the door switched off once main logged the act: 200 done with its id, one act, never replaced', edit: (r) => void (r.offAfterAct.echoed = false) }
    ]
  },
  W8: {
    pass: { status: 404, writeLines: 0, nextStatus: 200, listed: true, confirmState: 'confirmed', otherAfter: 200 },
    breaks: {
      'a signed POST to /v1/unpair is refused 404': (r) => void (r.status = 200),
      'nothing was forwarded: main logs no write': (r) => void (r.writeLines = 1),
      'the phone still reads': (r) => void (r.nextStatus = 0),
      'the Phones list still names it, and the agreement stands': (r) => void (r.confirmState = 'changed'),
      'the other phone reads with no Allow': (r) => void (r.otherAfter = 0)
    }
  },
  W9: {
    // The reverify's run, read the corrected way: 13 lines, 12 answered acts and the one W7 cut.
    pass: { appLogRead: true, filesScanned: 40, hits: [], logLines: 13, acted: 13 },
    breaks: {
      'app.log was read': (r) => void (r.appLogRead = false),
      'no file under the profile or HOME holds a write id, a body or a signature': (r) => void (r.hits = [{ file: 'logs/app.log', kind: 'write id' }]),
      'one log line per write that acted, an answered one by its answer and a cut one by tmux': (r) => void (r.logLines = 14)
    },
    refused: [
      { what: 'a line missing for an act (a write that acted and logged nothing)', clause: 'one log line per write that acted, an answered one by its answer and a cut one by tmux', edit: (r) => void (r.logLines = 12) },
      { what: 'no write acted at all, which reads nothing', clause: 'one log line per write that acted, an answered one by its answer and a cut one by tmux', edit: (r) => void Object.assign(r, { logLines: 0, acted: 0 }) }
    ]
  },
  W10: {
    pass: { menuSame: true, pairUnderSettings: true, inline: "End 'p317-w10-twin'? This stops what is running in it. End session", want: ["End 'p317-w10-twin'?", 'This stops what is running in it.', 'End session'], parentInline: null },
    breaks: {
      'menu.ts is the snapshot\'s, byte for byte': (r) => void (r.menuSame = false),
      'Pair a Phone… is still right under Settings…': (r) => void (r.pairUnderSettings = false),
      'the sheet\'s End confirm reads the moved words': (r) => void (r.inline = "End 'p317-w10-twin'?"),
      'the same words as the parent\'s sheet, when a parent ran': (r) => void (r.parentInline = 'something else')
    }
  },
  WP: {
    pass: { end: 404, unpair: 404, writeLines: 0, status: 'running', lines: ['Answers these and nothing else: blocked, pair, session, turns'] },
    breaks: {
      'both writes refused 404': (r) => void (r.end = 200),
      'nothing was forwarded: main logs no write': (r) => void (r.writeLines = 1),
      'the session is still running': (r) => void (r.status = 'exited'),
      'the lines name neither route': (r) => void (r.lines = [ROUTE_LINE])
    }
  },
  RUN: {
    pass: { tailscalePreflight: true, dnsPreflights: [true, true], agentsHeld: [true, true], realTailscale: 0, samples: 600, forbidden: 0, standinLeft: 0, stillStopped: 0 },
    breaks: {
      'the Tailscale preflight passed': (r) => void (r.tailscalePreflight = false),
      'the DNS preflight passed at every launch': (r) => void (r.dnsPreflights = [true, false]),
      'the quiet agents held at every launch': (r) => void (r.agentsHeld = []),
      'no real Tailscale in any sample': (r) => void (r.realTailscale = 1),
      'nothing forbidden reached the stand-in': (r) => void (r.forbidden = 1),
      'every stand-in ended': (r) => void (r.standinLeft = 1),
      'every paused pid was resumed': (r) => void (r.stillStopped = 1)
    }
  }
};

/** Every grader on its fixtures, and the pure readers on texts of their own. Starts nothing. */
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
  // HONESTY_LINE against the tree's own (Phase 337, build/p337/SPEC.md D35), so a phase that rewords it turns this red too.
  say(constWord(readFileSync(join(ROOT, 'src', 'shared', 'ipc', 'pocket.ts'), 'utf8'), 'POCKET_DOOR_HONESTY') === HONESTY_LINE, "HONESTY_LINE is the tree's POCKET_DOOR_HONESTY, byte for byte");
  // The probe's own reading of the two gates.
  say(deepEqual(expectedOffer({ status: 'running', remote: false, machineKnown: true }, TITLE), { state: 'offered', batch: true }), 'a live local row is offered End and End these');
  say(deepEqual(expectedOffer({ status: 'idle', remote: true, machineKnown: false }, TITLE), { state: 'offered', batch: false }), 'a live row on a machine with no row is offered End alone');
  say(deepEqual(expectedOffer({ status: 'unknown', remote: true, machineKnown: true }, TITLE), { state: 'unreachable', title: TITLE }), 'an unknown row is unreachable with the title');
  say(deepEqual(expectedOffer({ status: 'exited', remote: false, machineKnown: true }, TITLE), { state: 'none' }), 'an exited row is offered nothing');
  // The probe's own composition of the three bodies.
  say(composeEndConfirm({ name: 'a', machineLabel: 'Mac Pro' }).body.startsWith('This stops what is running in it on Mac Pro.'), 'a remote row\'s body names its machine');
  say(composeEndConfirm({ name: 'a', resumeCapture: 'armed', resumeArgv: ['claude', '--resume', 'x'] }).body.includes('the conversation are saved first'), 'an armed row\'s body names the conversation');
  say(composeEndConfirm({ name: 'a', resumeCapture: 'none', resumeArgv: [] }).body === 'This stops what is running in it. The scrollback is saved first, so you can restore this session later.', 'a shell\'s body names the scrollback alone');
  say(composeEndConfirm({ name: 'a', resumeCapture: 'armed', resumeArgv: [] }).body.includes('The scrollback is saved first'), 'an armed row with no argv is not resumable');
  // The word reader and the route reader.
  const src = "export const A = 'one';\nexport const B: string =\n  'two, ' +\n  \"three.\";\n";
  say(constWord(src, 'A') === 'one' && constWord(src, 'B') === 'two, three.' && constWord(src, 'C') === null, 'constWord reads a literal and a concatenation over a line break');
  say(deepEqual(routeIdsOf([ROUTE_LINE]), ['blocked', 'choose', 'end', 'keys', 'pair', 'say', 'screen', 'scrollback', 'session', 'sessions', 'turns']) && routeIdsOf(['x']) === null, 'routeIdsOf reads the route line');
  say(answerOf({ status: 200, body: '{"outcome":"done"}' })?.outcome === 'done' && answerOf({ status: 404, body: '' }) === null && answerOf({ status: 200, body: 'x' }) === null, 'answerOf reads a 200 answer and nothing else');
  say(deepEqual(descendantsOf(new Map([[1, [2, 3]], [3, [4]]]), 1), [2, 4, 3]), 'descendantsOf walks a tree deepest first');
  // The tests round: W6b's listener, both ways.
  const conf = '/var/folders/x/T/gmux-p317-1/p71-scratch-sshd-one.conf';
  say(isScratchSshd(`/usr/sbin/sshd -D -f ${conf}`, conf), 'isScratchSshd takes the listener as it was started');
  say(isScratchSshd(`sshd: /usr/sbin/sshd -D -f ${conf} [listener] 0 of 10-100 startups`, conf), 'isScratchSshd takes macOS\'s renamed listener (the reverify\'s reading)');
  say(!isScratchSshd(`sshd: /usr/sbin/sshd -D -f ${conf}2 [listener] 0 of 10-100 startups`, conf), 'isScratchSshd refuses a sibling configuration whose path begins with ours');
  say(!isScratchSshd('sshd: /usr/sbin/sshd -D [listener] 0 of 10-100 startups', conf), 'isScratchSshd refuses the person\'s own sshd');
  say(!isScratchSshd(`/usr/sbin/sshd -D -f ${conf.slice(0, 30)}`, conf), 'isScratchSshd refuses a command ps cut short (why the table is read with -ww)');
  say(!isScratchSshd('sshd-session: gdc [priv]', conf), 'isScratchSshd refuses a per-connection child, which the listener\'s descendants carry');
  // W9's count, the way main logs: both ways.
  const done = { status: 200, body: '{"outcome":"done","reason":null}' };
  say(actedOf(done) === true && actedOf({ status: 200, body: '{"outcome":"refused","reason":"gone"}' }) === true, 'actedOf counts a done and a refusal the verb made, both logged after the act');
  say(actedOf({ status: 200, body: '{"outcome":"busy","reason":null}' }) === false && actedOf({ status: 200, body: '{"outcome":"refused","reason":"malformed"}' }) === false && actedOf(done, { repeat: true }) === false, 'actedOf counts no busy, no malformed and no ledger repeat');
  say(actedOf({ status: 404, body: '' }) === false && actedOf({ status: 404, body: '' }, { goneAfter: true }) === false, 'actedOf counts no 404, whatever tmux says');
  say(actedOf({ status: 0, body: '' }, { goneAfter: true }) === true && actedOf({ status: 0, body: '' }, { goneAfter: false }) === false && actedOf({ status: 0, body: '' }) === false, 'actedOf reads a cut write by its session on tmux, and by nothing else');
  // W7's door off at the send: every honest ending passes, each named.
  say(offAtSendCase({ status: 200, outcome: 'done', echoed: true, acts: 1, alive: false }) === 'answered', 'offAtSendCase: the answer arrived');
  say(offAtSendCase({ status: 0, outcome: null, echoed: false, acts: 1, alive: false }) === 'cut after the act', 'offAtSendCase: cut after the act (the reverify\'s H19)');
  say(offAtSendCase({ status: 0, outcome: null, echoed: false, acts: 0, alive: true }) === 'cut before the door read it', 'offAtSendCase: cut before the door read it');
  say(offAtSendCase({ status: 404, outcome: null, echoed: false, acts: 0, alive: true }) === 'refused by a stopping door', 'offAtSendCase: refused by a stopping door');
  say(offAtSendCase({ status: 404, outcome: null, echoed: false, acts: 1, alive: false }) === null, 'offAtSendCase refuses a 404 after an act');
  say(offAtSendCase({ status: 0, outcome: null, echoed: false, acts: 0, alive: false }) === null, 'offAtSendCase refuses a session gone with no act logged');
  say(offAtSendCase({ status: 200, outcome: 'done', echoed: false, acts: 1, alive: false }) === null, 'offAtSendCase refuses a done that echoes another id');
  process.stdout.write(failures === 0 ? `[p317] grader self-test PASS: ${String(Object.keys(GRADERS).length)} graders, ${String(clauses)} clauses, each shown to go red on its own break.\n` : `[p317] grader self-test FAIL: ${String(failures)}.\n`);
  return failures === 0;
}

/** Every descendant of `pid` in a parent→children map, deepest first. */
export function descendantsOf(children, pid) {
  const out = [];
  const walk = (one) => {
    for (const child of children.get(one) ?? []) {
      walk(child);
      out.push(child);
    }
  };
  walk(pid);
  return out;
}

/**
 * The process table as a parent→children map and a pid→command map, read with
 * `ps -ww -ax` (never a pattern): `-ww` so no command line is cut short at the
 * terminal's width, which hid the scratch sshd's configuration path.
 */
function processTable() {
  const r = spawnSync('/bin/ps', ['-ww', '-ax', '-o', 'pid=,ppid=,stat=,command='], { encoding: 'utf8', timeout: 10_000, maxBuffer: 64 * 1024 * 1024 });
  const children = new Map();
  const rows = new Map();
  for (const line of String(r.stdout ?? '').split('\n')) {
    const m = /^\s*(\d+)\s+(\d+)\s+(\S+)\s+(.*)$/.exec(line);
    if (m === null) continue;
    const pid = Number(m[1]);
    const ppid = Number(m[2]);
    rows.set(pid, { pid, ppid, stat: m[3], command: m[4] });
    children.set(ppid, [...(children.get(ppid) ?? []), pid]);
  }
  return { children, rows };
}

if (process.argv.includes('--grader-self-test')) process.exit(graderSelfTest() ? 0 : 1);

// ---------------------------------------------------------------------------
// The refusals, in the order they are asked
// ---------------------------------------------------------------------------

const TAG = '[p317]';
const t0 = Date.now();
const say = (l) => console.log(`${TAG} ${((Date.now() - t0) / 1000).toFixed(1).padStart(6)}s ${l}`);
const refuse = (why) => {
  console.error(`${TAG} REFUSED. ${why}`);
  process.exit(2);
};
const SOCKET = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
if (SOCKET === '') refuse('no GMUX_TMUX_SOCKET. Run `npm run probe:p317`, which wraps this file in build/harness-socket.mjs and build/with-scratch-machine.mjs.');
if (SOCKET === 'gmux' || SOCKET === 'default' || !SOCKET.startsWith('gmux-p317')) refuse(`"${SOCKET}" is not a gmux-p317 harness socket.`);
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
/** The scratch machine's sshd configuration file, which is what identifies its listener in the process table. */
const SSHD_CONF = join(CONFIG_ROOT, 'p71-scratch-sshd-one.conf');
if (!existsSync(SSHD_CONF)) refuse(`${SSHD_CONF} does not exist, so the scratch machine's sshd cannot be told from any other.`);

const PARENT = (process.env['P317_PARENT_CHECKOUT'] ?? '').trim();
const KEEP = (process.env['P317_KEEP'] ?? '') === '1';
/** The sources a HEAD reading is made of; out/ older than any of them is refused. */
const SOURCES = ['src/main/pocket/writes.ts', 'src/main/pocket/routes.ts', 'src/main/pocket/server.ts', 'src/main/pocket/bind.ts', 'src/main/pocket/door/listener.ts', 'src/main/sessions/pocket-writes.ts', 'src/shared/session-gates.ts', 'src/shared/lifecycle-words.ts'];
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

mkdirSync(join(HARNESS_DIR, 'p317'), { recursive: true });
const RUN = realpathSync(join(HARNESS_DIR, 'p317'));
const HOME = join(RUN, 'home');
const PROFILE = join(RUN, 'profile');
const PROJECT = join(RUN, 'project');
const FAR = join(RUN, 'far');
const BIN = join(HOME, '.local', 'bin');
/** OUTSIDE the profile, so the helper's profile sweep never takes the stand-in's children for the app's. */
const STANDIN_DIR = join(RUN, 'standin');
const STOP = join(RUN, 'fake-stop');
const APP_LOG = join(PROFILE, 'logs', 'app.log');
const MACHINES_JSON = join(PROFILE, 'gmux', 'config', 'machines.json');
const PUBLIC_NAME = DEFAULT_SCENARIO.dnsName.replace(/\.$/, '');
const DIALOG = join(ROOT, 'src/main/activity/__tests__/fixtures/claude-permission-prompt.txt');
const FAR_ENV = { ...process.env, TMUX_TMPDIR: carriage.tmuxTmp };
const OUT = join(ROOT, 'out', 'p317');
const N = {
  w3: 'p317-w3',
  w4: 'p317-w4',
  w5: 'p317-w5',
  w6a: 'p317-w6a',
  w6b: 'p317-w6b',
  removed: 'p317-w7-removed',
  exited: 'p317-w7-exited',
  replay: 'p317-w7-replay',
  reused: 'p317-w7-reused',
  busy: 'p317-w7-busy',
  off: 'p317-w7-off',
  offLogged: 'p317-w7-off-logged',
  query: 'p317-w7-query',
  twin: 'p317-w10-twin',
  wp: 'p317-wp'
};

/** The words main says, read from the checkout's own source (never typed here twice). */
function wordsOf(checkout) {
  const src = (rel) => {
    try {
      return readFileSync(join(checkout, rel), 'utf8');
    } catch {
      return '';
    }
  };
  const lifecycle = src('src/shared/lifecycle-words.ts');
  const gate = src('src/main/sessions/lifecycle-gate.ts');
  const pocket = src('src/shared/ipc/pocket.ts');
  const tree = src('src/main/proc/session-tree.ts');
  const ms = (name, fallback) => {
    const m = new RegExp(`\\b${name}\\s*=\\s*([0-9_]+)`).exec(tree);
    return m === null ? fallback : Number(m[1].replace(/_/g, ''));
  };
  return {
    removed: constWord(gate, 'END_REFUSED_REMOVED'),
    changed: constWord(lifecycle, 'LIFECYCLE_SESSION_CHANGED'),
    notFound: constWord(lifecycle, 'SESSION_NOT_FOUND'),
    title: constWord(lifecycle, 'END_UNREACHABLE_TITLE'),
    honesty: constWord(pocket, 'POCKET_DOOR_HONESTY'),
    boundMs: ms('HANGUP_GRACE_MS', 10_000) + ms('TERM_GRACE_MS', 60_000) + 5_000
  };
}
const WORDS_HEAD = wordsOf(ROOT);

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
// The guards: the stand-ins, the sampler, and the paused pids
// ---------------------------------------------------------------------------

let standin = null;
let dns = null;
let watch = null;
let lastShim = 0;
let lastApp = 0;
let tailscalePreflight = false;
const dnsPreflights = [];
const agentsHeld = [];
/** W6b's paused pids, each resumed in the `finally` and on exit. */
const stopped = new Set();
function resumeStopped() {
  for (const pid of [...stopped]) {
    try {
      process.kill(pid, 'SIGCONT');
    } catch {
      /* gone */
    }
    stopped.delete(pid);
  }
}
process.on('exit', resumeStopped);

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
/** Settings then Phone, as a person opens it. */
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
        await sleep(200);
      }
      throw new Error('Settings opened and never drew the Phone section');
    }
    if (Date.now() - started > timeoutMs) throw new Error('no Settings window');
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
/** Main's sessions, with the facts the gates and the confirmation read. */
async function sessions(cdp) {
  const got = await bridge(cdp, 'window.gmux.sessions.list().then((l) => l.map((s) => ({ id: s.id, name: s.name, tmuxName: s.tmuxName, status: s.status, agent: s.agent, machine: s.machine ? { id: s.machine.id, label: s.machine.label } : null, resumeCapture: s.resumeCapture ?? null, resumeArgv: s.resumeArgv ?? null })))');
  return got.ok ? got.value : [];
}
const byName = async (cdp, name) => (await sessions(cdp)).find((s) => s.name === name) ?? null;

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

/** One signed read as JSON, or null. */
async function readJson(phone, door, target) {
  const a = await signedGet(phone, door, target);
  try {
    return a.status === 200 ? JSON.parse(a.body) : null;
  } catch {
    return null;
  }
}

/** One write's reading: its status, its answer's words, and whether it echoed `write`. */
function writeReading(reply, write) {
  const a = answerOf(reply);
  return { status: reply.status, outcome: a?.outcome ?? null, reason: a?.reason ?? null, sentence: a?.sentence ?? null, echoed: a !== null && a.write === write, body: reply.status === 200 ? reply.body : null, error: reply.error ?? null };
}

const appLogText = () => {
  try {
    return readFileSync(APP_LOG, 'utf8');
  } catch {
    return null;
  }
};
const countLog = (needle) => (appLogText() ?? '').split('\n').filter((l) => l.includes(needle)).length;
const writeLines = () => LOGGED_VERBS.reduce((n, v) => n + countLog(v), 0);
/** The acts main logged on one session: its `the phone's end:` lines, each carrying `{"session":"<id>"}`. */
const actsOn = (sessionId) => (appLogText() ?? '').split('\n').filter((l) => l.includes(LOGGED_VERBS[0]) && l.includes(sessionId)).length;

/** Is `name` a session on the local scratch server? */
const tmuxHas = (name) => spawnSync('tmux', ['-L', SOCKET, 'has-session', '-t', `=${name}`], { encoding: 'utf8', timeout: 10_000 }).status === 0;
/** Is `name` a session on the loopback machine's own server? */
const farHas = (name) => spawnSync(FAR_TMUX, ['-L', SOCKET, '-f', '/dev/null', 'has-session', '-t', `=${name}`], { encoding: 'utf8', env: FAR_ENV, timeout: 10_000 }).status === 0;
/** The pane's pid of a local session, and its descendants. */
function treeOf(tmuxName) {
  const r = spawnSync('tmux', ['-L', SOCKET, 'display-message', '-p', '-t', `=${tmuxName}:`, '#{pane_pid}'], { encoding: 'utf8', timeout: 10_000 });
  const pane = Number(String(r.stdout ?? '').trim());
  if (!Number.isInteger(pane) || pane <= 1) return [];
  return [pane, ...descendantsOf(processTable().children, pane)];
}
const alive = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

/**
 * Write the scratch machines file, with or without the loopback machine: the
 * path the app itself reports (`machines:rows`), refused unless it is inside
 * this run's scratch world.
 */
function writeMachines(withMachine, path = MACHINES_JSON) {
  if (!path.startsWith(`${RUN}/`) && !path.startsWith(`${CONFIG_ROOT}/`)) throw new Error(`the machines file ${path} is outside this run's scratch world; nothing is written there`);
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const machines = withMachine ? [{ id: MACHINE_ID, label: 'p317 loopback', host: carriage.host, user: carriage.user, port: carriage.port, remoteTmuxPath: FAR_TMUX }] : [];
  writeFileSync(path, `${J({ schema: 1, machines })}\n`, 'utf8');
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
      P317_STOP: STOP,
      P317_DIALOG: DIALOG
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

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

/** Every write this run sent: its id and the nonce it was signed with, for W9's scan. */
const sent = { ids: new Set(), nonces: new Set() };
/** How many writes ACTED (`actedOf`), for W9's one line per write that acted. */
let acted = 0;
/** A nonce this run chose and keeps, so W9 can look for it. */
const nonce = () => {
  const n = randomUUID().replace(/-/g, '');
  sent.nonces.add(n);
  return n;
};
/**
 * Record a write the run sent, and whether it acted (`actedOf`): by its
 * answer, or, for a write whose answer was cut, by `goneAfter`, its session
 * read on tmux once the cut settled.
 */
function noteWrite(reply, write, { repeat = false, goneAfter = null } = {}) {
  if (typeof write === 'string' && write !== '') sent.ids.add(write);
  if (actedOf(reply, { repeat, goneAfter })) acted += 1;
}
const HEAD_READINGS = {};
let parentInline = null;

try {
  rmSync(RUN, { recursive: true, force: true });
  for (const dir of [HOME, PROFILE, PROJECT, FAR, BIN, STANDIN_DIR]) mkdirSync(dir, { recursive: true });
  writeFileSync(join(PROJECT, 'README.md'), '# Phase 317, the project\n');
  writeFileSync(join(FAR, 'README.md'), '# Phase 317, the far folder\n');
  // The fake claude: prints the committed Phase 312 dialog and waits.
  writeFileSync(
    join(BIN, 'claude'),
    `#!/bin/sh
# probe:p317. Not Claude Code. It prints a committed fixture and waits.
case "$1" in
  -v|--version) echo "2.1.238 (Claude Code)"; exit 0;;
esac
sleep 2
cat "$P317_DIALOG"
while [ ! -f "$P317_STOP" ]; do sleep 1; done
exit 0
`,
    'utf8'
  );
  chmodSync(join(BIN, 'claude'), 0o755);
  writeFileSync(join(HOME, '.zprofile'), `export PATH="${BIN}:$PATH"\n`, 'utf8');
  writeFileSync(join(HOME, '.zshrc'), `export PATH="${BIN}:$PATH"\nPS1='p317 %# '\n`, 'utf8');
  writeFileSync(join(HOME, '.hushlogin'), '');
  writeMachines(true);
  {
    const known = join(PROFILE, 'gmux', 'machines', 'known-machines');
    mkdirSync(dirname(known), { recursive: true });
    writeFileSync(known, keyscanText({ host: carriage.host, port: carriage.port, caller: 'build/p317/probe-p317.mjs' }), 'utf8');
  }
  standin = makeStandin({ dir: STANDIN_DIR, scenario: { ...DEFAULT_SCENARIO } });
  const pre = preflightStandin(standin, standin.binPath);
  tailscalePreflight = pre.ok;
  if (!pre.ok) throw new Error(`the Tailscale preflight refused: ${pre.problems.join('; ')}`);
  dns = await makeDnsStandin({ name: PUBLIC_NAME, mode: 'record' });
  watch = watchForRealTailscale({ roots: () => [lastShim, lastApp].filter((p) => p > 0), everyMs: 1_000 });
  say(`measuring ${ROOT}${PARENT === '' ? '' : ` after the parent ${PARENT}`}; socket ${SOCKET}; the loopback machine on ${String(carriage.host)}:${String(carriage.port)}`);

  // ======================================================================
  // WP — the parent, FIRST, on the same profile (its door is confirmed over
  // the old route list, so the HEAD launch that follows reads `changed`)
  // ======================================================================
  if (PARENT !== '') {
    await launch('p317-parent', resolve(PARENT), async (main) => {
      await bridge(main, `window.__p293.addProject(${J(PROJECT)})`);
      const id = await shell(main, PROJECT, N.wp);
      await pocket(main, 'setDoor', { on: true });
      const door = await confirmDoor(main);
      if (!door.ok) return cannotRead('WP', `the parent's door never listened: ${door.why}`);
      const paired = await pairPhone(main, 'p317 parent phone');
      if (!paired.ok) return cannotRead('WP', `no phone paired with the parent: ${paired.why}`);
      const before = writeLines();
      const write = freshWriteId();
      const end = await endSession(paired.phone, paired.door, id, { write });
      const unpair = await signedPost(paired.phone, paired.door, '/v1/unpair', { write: freshWriteId() });
      await sleep(1_000);
      const s = await byName(main, N.wp);
      const st = await status(main);
      // The parent's sheet, for W10's byte for byte.
      await bridge(main, "window.__p293.open('managed')");
      // runMenuItem presses an item menuItemsFor read for that row.
      await bridge(main, `window.__p293.menuItemsFor(${J(id)})`);
      await bridge(main, `window.__p293.runMenuItem(${J(id)}, 'End session…')`);
      await sleep(500);
      const inline = await bridge(main, 'window.__p293.state().then((s) => s.inline)');
      parentInline = inline.ok && inline.value !== null ? inline.value.text : null;
      arm('WP', { end: end.status, unpair: unpair.status, writeLines: writeLines() - before, status: s?.status ?? null, lines: st?.confirmLines ?? [] });
    });
  }

  // ======================================================================
  // HEAD — W1 to W8 and W10, one launch
  // ======================================================================
  await launch('p317-head', ROOT, async (main) => {
    const ids = {};
    // ---- the sessions ------------------------------------------------------
    await bridge(main, `window.__p293.addProject(${J(PROJECT)})`);
    for (const key of ['w3', 'removed', 'exited', 'replay', 'reused', 'busy', 'off', 'offLogged', 'query', 'twin']) ids[key] = await shell(main, PROJECT, N[key]);
    {
      const made = await bridge(main, `window.gmux.sessions.create(${J({ name: N.w4, projectPath: PROJECT, cwd: PROJECT, agent: 'claude' })}).then((s) => s.id)`);
      if (!made.ok) throw new Error(`the waiting agent was not created: ${made.error}`);
      ids.w4 = made.value;
    }
    const up = await bridge(main, `window.__gmuxP95.machineUp(${J(MACHINE_ID)})`);
    if (!(up.ok && (up.value?.rows ?? []).some((row) => row.id === MACHINE_ID && row.usable))) throw new Error(`the loopback machine is not usable: ${J(up).slice(0, 400)}`);
    for (let attempt = 1; attempt <= 6; attempt += 1) {
      const opened = await bridge(main, `window.__gmuxP95.openRemote(${J(MACHINE_ID)}, ${J(FAR)})`);
      if (opened.ok && opened.value?.result?.ok === true) break;
      await sleep(3_000);
    }
    for (const key of ['w5', 'w6a', 'w6b']) ids[key] = await shell(main, FAR, N[key], MACHINE_ID);
    const live = await waitFor(async () => {
      const list = await sessions(main);
      return ['w3', 'w5', 'w6a', 'w6b', 'removed', 'exited'].every((k) => list.some((s) => s.id === ids[k] && LIVE.includes(s.status))) ? list : null;
    }, 60_000);
    if (live === null) throw new Error('the sessions never all read live');
    // Exited and removed, through the Mac's own verbs.
    await bridge(main, `window.gmux.sessions.kill(${J(ids.exited)})`);
    await bridge(main, `window.gmux.sessions.kill(${J(ids.removed)})`);
    await waitFor(async () => (await sessions(main)).filter((s) => s.id === ids.exited || s.id === ids.removed).every((s) => s.status === 'exited'), 30_000);
    await bridge(main, `window.gmux.sessions.discard(${J(ids.removed)})`);
    say(`sessions made: ${J(ids)}`);

    // ---- W1: the door asks again ------------------------------------------
    // The sheet is read WHILE ITS CONFIRM BLOCK IS DRAWN, before Allow:
    // PhoneSection.tsx draws POCKET_DOOR_HONESTY and the lines inside
    // `[data-phone-confirm]` alone, and that block goes once the door is
    // allowed (the tests round; the reverify found the sheet read after Allow).
    let settings = null;
    try {
      settings = await attachSettings(main);
      await pocket(main, 'setDoor', { on: true });
      const asking = await waitStatus(main, (s) => s.confirmable === true && s.state !== 'opening' && s.confirmState !== 'confirmed' && s.confirmLines.some((l) => l.includes(`https://${PUBLIC_NAME}:`)), 40_000);
      const confirmBlock = asking.ok
        ? await waitFor(async () => {
            const text = await cdpEval(settings, `(() => { const b = document.querySelector('section[aria-label="Phone"] [data-phone-confirm]'); return b === null ? null : b.innerText; })()`);
            return typeof text === 'string' && text.length > 0 ? text : null;
          }, 10_000, 200)
        : null;
      const door = await confirmDoor(main);
      const st = await status(main);
      arm('W1', { lines: door.lines, honesty: WORDS_HEAD.honesty, confirmBlock, parentRanFirst: PARENT !== '', confirmStateBefore: door.before, listening: door.ok && st?.state === 'listening' });
      if (!door.ok) throw new Error(`the door never listened: ${door.why}`);
    } finally {
      settings?.close();
    }

    // ---- the phones ---------------------------------------------------------
    const A = await pairPhone(main, 'p317 phone A');
    if (!A.ok) throw new Error(`phone A did not pair: ${A.why}`);
    const B = await pairPhone(main, 'p317 phone B');
    if (!B.ok) throw new Error(`phone B did not pair: ${B.why}`);
    const end = async (phone, door, sessionId, options = {}) => {
      const { repeat = false, ...rest } = options;
      const write = rest.write ?? freshWriteId();
      const reply = await endSession(phone, door, sessionId, { nonce: nonce(), ...rest, write });
      noteWrite(reply, write, { repeat });
      return { reply, write, r: writeReading(reply, write) };
    };

    // ---- W2: every row's offer and confirmation ----------------------------
    {
      // The waiting agent must be waiting before it is read.
      await waitFor(async () => (await byName(main, N.w4))?.status === 'needs_input', 90_000);
      const blocked = await readJson(A.phone, A.door, '/v1/blocked');
      const mine = await sessions(main);
      const machineRows = await bridge(main, 'window.gmux.machines.rows()');
      const known = new Set(machineRows.ok ? (machineRows.value?.rows ?? []).map((m) => m.id) : []);
      const rowsAll = [...(blocked?.rows ?? []), ...(blocked?.others ?? [])].filter((row) => String(row.name).startsWith('p317-w'));
      const rows = [];
      const confirms = [];
      const unoffered = [];
      for (const row of rowsAll) {
        const s = mine.find((x) => x.id === row.sessionId);
        if (s === undefined) continue;
        const want = expectedOffer({ status: s.status, remote: s.machine !== null, machineKnown: s.machine === null || known.has(s.machine.id) }, WORDS_HEAD.title);
        rows.push({ sessionId: row.sessionId, name: s.name, status: s.status, end: row.end ?? null, want });
        const detail = await readJson(A.phone, A.door, `/v1/session?id=${encodeURIComponent(row.sessionId)}`);
        const got = detail?.session?.endConfirm ?? null;
        if (want.state === 'offered') confirms.push({ sessionId: row.sessionId, got, want: composeEndConfirm({ name: s.name, machineLabel: s.machine?.label, resumeCapture: s.resumeCapture, resumeArgv: s.resumeArgv, agent: s.agent }) });
        else unoffered.push({ sessionId: row.sessionId, got });
      }
      arm('W2', { rows, confirms, unoffered });
    }

    // ---- W3: a local shell ------------------------------------------------
    {
      const s = await byName(main, N.w3);
      const tmuxBefore = tmuxHas(s.tmuxName);
      const before = countLog(DONE_LINE);
      const e = await end(A.phone, A.door, ids.w3);
      await waitFor(async () => (await byName(main, N.w3))?.status === 'exited', 20_000);
      await sleep(1_000);
      arm('W3', { ...e.r, tmuxBefore, tmuxAfter: tmuxHas(s.tmuxName), mainStatus: (await byName(main, N.w3))?.status ?? null, doneLines: countLog(DONE_LINE) - before });
    }

    // ---- W4: the waiting agent and its tree --------------------------------
    {
      const s = await byName(main, N.w4);
      const pidsBefore = s === null ? [] : treeOf(s.tmuxName);
      const e = await end(A.phone, A.door, ids.w4);
      const pressedAt = Date.now();
      const gone = await waitFor(() => pidsBefore.every((p) => !alive(p)), WORDS_HEAD.boundMs, 250);
      arm('W4', { statusBefore: s?.status ?? null, pidsBefore, status: e.r.status, outcome: e.r.outcome, pidsLeft: pidsBefore.filter(alive), goneMs: gone === null ? null : Date.now() - pressedAt, boundMs: WORDS_HEAD.boundMs });
    }

    // ---- W5: a shell on the loopback machine ------------------------------
    {
      const s = await byName(main, N.w5);
      const farBefore = farHas(s.tmuxName);
      const e = await end(A.phone, A.door, ids.w5);
      await waitFor(() => !farHas(s.tmuxName), 20_000);
      arm('W5', { status: e.r.status, outcome: e.r.outcome, farBefore, farAfter: farHas(s.tmuxName) });
    }

    // ---- W6a: the machine's entry dropped, and reloaded --------------------
    {
      const s = await byName(main, N.w6a);
      const where = await bridge(main, 'window.gmux.machines.rows()');
      const machinesPath = where.ok && typeof where.value?.path === 'string' ? where.value.path : MACHINES_JSON;
      writeMachines(false, machinesPath);
      const reload = await bridge(main, 'window.gmux.machines.reload()');
      await sleep(2_000);
      const rows = await bridge(main, 'window.gmux.machines.rows()');
      const machineRowGone = rows.ok && !(rows.value?.rows ?? []).some((m) => m.id === MACHINE_ID);
      const after = await byName(main, N.w6a);
      if (after === null) {
        cannotRead('W6a', `the remote row was no longer listed after machines:reload (reload ${reload.ok ? 'answered' : `threw ${reload.error}`}), so the batch narrowing has no row to read here; the vitest carries the predicate (SPEC §13 item 7)`);
      } else {
        const blocked = await readJson(A.phone, A.door, '/v1/blocked');
        const row = [...(blocked?.rows ?? []), ...(blocked?.others ?? [])].find((x) => x.sessionId === ids.w6a);
        const before = countLog(DONE_LINE);
        const batch = await end(A.phone, A.door, ids.w6a, { batch: true });
        await sleep(1_000);
        arm('W6a', { machineRowGone, rowListed: true, rowMachineSet: after.machine !== null, offer: row?.end ?? null, batch: batch.r, title: WORDS_HEAD.title, doneLines: countLog(DONE_LINE) - before, farAfter: farHas(s.tmuxName) });
      }
      writeMachines(true, machinesPath);
      await bridge(main, 'window.gmux.machines.reload()');
      await bridge(main, `window.__gmuxP95.machineUp(${J(MACHINE_ID)})`);
    }

    // ---- W6b: the machine stops answering ------------------------------------
    {
      const s = await byName(main, N.w6b);
      const table = processTable();
      const listener = [...table.rows.values()].find((r) => isScratchSshd(r.command, SSHD_CONF)) ?? null;
      if (listener === null) cannotRead('W6b', `no process in the table is the scratch machine's sshd (/usr/sbin/sshd -D -f ${SSHD_CONF}, or sshd: … [listener] as macOS renames it), so nothing of ours could be paused`);
      else {
        const recorded = [listener.pid, ...descendantsOf(table.children, listener.pid)];
        let paused = 0;
        let resumed = 0;
        let reading = null;
        try {
          for (const pid of recorded) {
            try {
              process.kill(pid, 'SIGSTOP');
              stopped.add(pid);
              paused += 1;
            } catch {
              /* gone */
            }
          }
          const unknown = await waitFor(async () => (await byName(main, N.w6b))?.status === 'unknown', 120_000, 1_000);
          const blocked = await readJson(A.phone, A.door, '/v1/blocked');
          const row = [...(blocked?.rows ?? []), ...(blocked?.others ?? [])].find((x) => x.sessionId === ids.w6b);
          const before = countLog(DONE_LINE);
          const single = await end(A.phone, A.door, ids.w6b);
          const batch = await end(A.phone, A.door, ids.w6b, { batch: true });
          reading = { unknownSeen: unknown !== null, offer: row?.end ?? null, title: WORDS_HEAD.title, single: single.r, batch: batch.r, doneLines: countLog(DONE_LINE) - before };
        } finally {
          for (const pid of [...stopped]) {
            try {
              process.kill(pid, 'SIGCONT');
              resumed += 1;
            } catch {
              /* gone */
            }
            stopped.delete(pid);
          }
        }
        await sleep(2_000);
        arm('W6b', { ...reading, paused, resumed, farAfter: farHas(s.tmuxName) });
      }
    }

    // ---- W7: the attack ---------------------------------------------------
    {
      const w = { words: { removed: WORDS_HEAD.removed, changed: WORDS_HEAD.changed, notFound: WORDS_HEAD.notFound } };
      w.removed = (await end(A.phone, A.door, ids.removed)).r;
      w.exited = (await end(A.phone, A.door, ids.exited)).r;
      w.nothing = (await end(A.phone, A.door, randomUUID())).r;
      // The same bytes again: one write, its nonce and clock captured, sent twice.
      {
        const before = countLog(DONE_LINE);
        const write = freshWriteId();
        const once = nonce();
        const timestamp = String(Date.now());
        const fields = { batch: false, session: ids.replay, write };
        const first = await signedPost(A.phone, A.door, '/v1/end', fields, { nonce: once, timestamp });
        const again = await signedPost(A.phone, A.door, '/v1/end', fields, { nonce: once, timestamp });
        noteWrite(first, write);
        noteWrite(again, write, { repeat: true });
        await sleep(500);
        w.replay = { first: first.status, again: again.status, doneLines: countLog(DONE_LINE) - before };
      }
      // The same write id, fresh-signed.
      {
        const before = countLog(DONE_LINE);
        const write = freshWriteId();
        const first = await end(A.phone, A.door, ids.reused, { write });
        const second = await end(A.phone, A.door, ids.reused, { write, repeat: true });
        await sleep(500);
        w.reused = { first: first.r.status, second: second.r.status, sameBody: first.r.body !== null && first.r.body === second.r.body, doneLines: countLog(DONE_LINE) - before };
      }
      // A and B on one session at once.
      {
        const [a, b] = await Promise.all([end(A.phone, A.door, ids.busy), end(B.phone, B.door, ids.busy)]);
        w.twoPhones = { outcomes: [a.r.outcome, b.r.outcome], reasons: [a.r.reason, b.r.reason] };
      }
      // A fourth body key, its id well formed.
      {
        const write = freshWriteId();
        const reply = await signedPost(A.phone, A.door, '/v1/end', { batch: false, session: ids.off, write, face: true }, { nonce: nonce() });
        noteWrite(reply, write);
        w.fourthKey = writeReading(reply, write);
      }
      // A query on the write's path.
      {
        const before = writeLines();
        const write = freshWriteId();
        const reply = await signedPost(A.phone, A.door, '/v1/end?x=1', { batch: false, session: ids.query, write }, { nonce: nonce() });
        sent.ids.add(write);
        await sleep(500);
        w.query = { status: reply.status, writeLines: writeLines() - before, stillRunning: LIVE.includes((await byName(main, N.query))?.status) };
      }
      // THE DOOR SWITCHED OFF DURING AN END (the tests round). unpublish()
      // stops the Funnel child first, so the stand-in's forwarder drops the
      // connection at once, and an act already started completes. Each press
      // is read on what it can show, the act counted on the log by session and
      // the session read on tmux, and the door is let in again after each.
      const doorOffDuring = async (key, pressAt) => {
        const s = await byName(main, N[key]);
        const before = actsOn(ids[key]);
        const write = freshWriteId();
        let offAsked = null;
        const pressOff = () => {
          offAsked ??= pocket(main, 'setDoor', { on: false });
        };
        // `logged`: main wrote the act's line, polled every 5 ms, and the press follows it.
        const watch = pressAt === 'logged' ? waitFor(() => (actsOn(ids[key]) > before ? true : null), 15_000, 5).then((hit) => (hit === true ? (pressOff(), true) : false)) : null;
        const reply = await endSession(A.phone, A.door, ids[key], { write, nonce: nonce(), ...(pressAt === 'send' ? { onWritten: pressOff } : {}) });
        const logged = watch === null ? null : await watch;
        await offAsked;
        // Let a cut settle: the act it may have started is read once it is logged, or after 5 s.
        await waitFor(() => (actsOn(ids[key]) > before ? true : null), 5_000, 100);
        await sleep(500);
        const alive = s === null ? null : tmuxHas(s.tmuxName);
        noteWrite(reply, write, { goneAfter: alive === false });
        const r = writeReading(reply, write);
        const reading = { status: r.status, outcome: r.outcome, echoed: r.echoed, acts: actsOn(ids[key]) - before, alive, ...(logged === null ? {} : { logged }), error: r.error };
        await pocket(main, 'setDoor', { on: true });
        const again = await confirmDoor(main);
        if (!again.ok) throw new Error(`the door did not listen again after it was switched off: ${again.why}`);
        return reading;
      };
      w.offAfterAct = await doorOffDuring('offLogged', 'logged');
      w.offAtSend = await doorOffDuring('off', 'send');
      say(`W7 door off: once logged ${J(w.offAfterAct)}; at the send ${J(w.offAtSend)}, ${String(offAtSendCase(w.offAtSend))}`);
      // A phone Removed on the Mac. The door is allowed again FIRST, so the
      // refusal is the removed key's and never a closed door's, and A's read
      // beside it is the control.
      {
        const C = await pairPhone(main, 'p317 phone C');
        const st = await status(main);
        const row = (st?.phones ?? []).find((p) => p.label === 'p317 phone C');
        if (C.ok && row !== undefined) await pocket(main, 'removePhone', row.id);
        await sleep(1_500);
        const again = await confirmDoor(main);
        if (!again.ok) throw new Error(`the door did not listen again after a Remove: ${again.why}`);
        const write = freshWriteId();
        const reply = C.ok ? await endSession(C.phone, C.door, ids.twin, { write, nonce: nonce() }) : { status: -1 };
        sent.ids.add(write);
        const control = (await signedGet(A.phone, A.door, '/v1/blocked')).status;
        w.removedPhone = { status: reply.status, wasPaired: C.ok && row !== undefined && control === 200, control };
      }
      // The two that may not be readable, said so rather than graded.
      if (!(w.twoPhones.outcomes.includes('busy') || w.twoPhones.outcomes.every((o) => o === 'done'))) {
        cannotRead('W7', `the two phones' writes never overlapped (${J(w.twoPhones)}), so busy could not be read; the hostile client carries it`);
      } else if (w.offAfterAct.logged !== true) {
        cannotRead('W7', `main never logged the act of the End the door was to be switched off after (${J(w.offAfterAct)}), so the answer after an act could not be read`);
      } else if (w.offAfterAct.status === 0 && w.offAfterAct.acts === 1 && w.offAfterAct.alive === false) {
        cannotRead('W7', 'the Funnel child stopped before the logged act\'s answer crossed the forwarder: a cut with the act done once, honest (SPEC D6), but the answer that must not be replaced could not be read');
      } else arm('W7', w);
    }

    // ---- W8: the unpair the fix round took out is no route ----------------
    {
      const st0 = await status(main);
      const bRow = (st0?.phones ?? []).find((p) => p.label === 'p317 phone B');
      const before = writeLines();
      const write = freshWriteId();
      const reply = await signedPost(B.phone, B.door, '/v1/unpair', { write }, { nonce: nonce() });
      noteWrite(reply, write);
      await sleep(2_000);
      const next = await signedGet(B.phone, B.door, '/v1/blocked');
      const st = await status(main);
      const otherAfter = (await signedGet(A.phone, A.door, '/v1/blocked')).status;
      arm('W8', {
        status: reply.status,
        writeLines: writeLines() - before,
        nextStatus: next.status,
        listed: bRow !== undefined && (st?.phones ?? []).some((p) => p.id === bRow.id),
        confirmState: st?.confirmState ?? null,
        otherAfter
      });
    }

    // ---- W10: the menus, and the Mac sheet's End confirm ----------------------
    {
      const menuNow = readFileSync(join(ROOT, 'src', 'main', 'menu.ts'), 'utf8');
      const menuThen = spawnSync('git', ['-C', ROOT, 'show', `${SNAPSHOT}:src/main/menu.ts`], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
      const settingsAt = menuNow.indexOf("'Settings…'");
      const pairAt = menuNow.indexOf("'Pair a Phone…'");
      const between = settingsAt === -1 || pairAt === -1 ? '' : menuNow.slice(settingsAt, pairAt);
      await bridge(main, "window.__p293.open('managed')");
      await bridge(main, `window.__p293.menuItemsFor(${J(ids.twin)})`);
      await bridge(main, `window.__p293.runMenuItem(${J(ids.twin)}, 'End session…')`);
      await sleep(500);
      const inline = await bridge(main, 'window.__p293.state().then((s) => s.inline)');
      const s = await byName(main, N.twin);
      const want = composeEndConfirm({ name: N.twin, machineLabel: s?.machine?.label, resumeCapture: s?.resumeCapture, resumeArgv: s?.resumeArgv });
      arm('W10', {
        menuSame: menuThen.status === 0 && menuThen.stdout === menuNow,
        pairUnderSettings: pairAt > settingsAt && settingsAt !== -1 && (between.match(/label:/g) ?? []).length <= 1,
        inline: inline.ok && inline.value !== null ? inline.value.text : null,
        want: [want.title, want.body, want.confirmLabel],
        parentInline: parentInline === null ? null : parentInline.replace(N.wp, N.twin)
      });
    }
    HEAD_READINGS.done = true;
  });
} catch (err) {
  failures += 1;
  report.error = String(err?.message ?? err);
  say(`the run stopped: ${report.error}`);
} finally {
  resumeStopped();
  try {
    writeFileSync(STOP, 'stop\n');
  } catch {
    /* the world is gone */
  }
  const leaked = watch === null ? [] : watch.stop();
  const ended = standin === null ? { ended: [], left: [] } : endStandinProcesses(STANDIN_DIR, 1_500);
  if (dns !== null) await dns.close();
  // W9, after the app has gone: nothing it kept holds a write id, a body or a signature.
  {
    const text = appLogText();
    const needles = [...[...sent.ids].map((v) => ({ v, kind: 'write id' })), ...[...sent.nonces].map((v) => ({ v, kind: 'nonce' }))];
    const hits = [];
    let filesScanned = 0;
    const walk = (dir) => {
      let names = [];
      try {
        names = readdirSync(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const e of names) {
        const p = join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else if (e.isFile()) {
          filesScanned += 1;
          let buf;
          try {
            buf = readFileSync(p);
          } catch {
            continue;
          }
          const s = buf.toString('latin1');
          for (const n of needles) if (s.includes(n.v)) hits.push({ file: p.slice(RUN.length + 1), kind: n.kind });
        }
      }
    };
    if (sent.ids.size > 0) {
      walk(PROFILE);
      walk(HOME);
    }
    if (HEAD_READINGS.done === true) arm('W9', { appLogRead: text !== null, filesScanned, hits, logLines: writeLines(), acted });
  }
  arm('RUN', {
    tailscalePreflight,
    dnsPreflights,
    agentsHeld,
    realTailscale: leaked.length,
    samples: watch?.samples() ?? 0,
    forbidden: standin === null ? 0 : standin.forbidden().length,
    standinLeft: ended.left.length,
    stillStopped: stopped.size
  });
  report.readings.processRowsAtEnd = processRows().filter((r) => r.command.includes('tailscale-standin.mjs')).length;
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, `probe-p317${PARENT === '' ? '' : '-with-parent'}.json`), `${J(report, null, 2)}\n`);
  if (!KEEP) rmSync(RUN, { recursive: true, force: true });
}

say(`${String(report.arms.filter((a) => a.ok === true).length)} arm(s) passed, ${String(failures)} failed, ${String(unreadable)} could not be read`);
process.exit(failures > 0 ? 1 : unreadable > 0 ? 2 : 0);
