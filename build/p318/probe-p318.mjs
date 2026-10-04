#!/usr/bin/env node
/**
 * probe:p318 — THE PHASE 318 APP RUN, the Mac side: a numbered choice
 * answered and one message sent from the phone, through the door's two new
 * writes, `POST /v1/choose` and `POST /v1/say` (build/p318/SPEC.md §7.6).
 *
 * ONE Electron at HEAD through build/electron-run.mjs's `withElectron`, on a
 * scratch profile and a scratch HOME under the harness directory, the tmux
 * socket build/harness-socket.mjs hands it (`gmux-p318…`), and the LOOPBACK
 * scratch machine build/with-scratch-machine.mjs starts around this file (its
 * own sshd on 127.0.0.1, its own keys, its own TMUX_TMPDIR). With
 * `P318_PARENT_CHECKOUT` (a BUILT `c1a5fd38`) a SECOND Electron runs that
 * parent on the same profile, one after the other and never at once: it runs
 * FIRST, so the HEAD launch that follows reads the door's agreement `changed`
 * (R0), the route list being a hashed field (D28).
 *
 * WHAT IS REAL. The door, switched on, confirmed and published through the
 * STAND-IN Tailscale (build/p330/tailscale-standin.mjs behind
 * GMUX_TAILSCALE_BIN, preflighted by sha256, the process table sampled every
 * second: a real Tailscale under the app, or run as a command, FAILS the run).
 * The name check asks build/p332/dns-standin.mjs IN THIS PROCESS on 127.0.0.1.
 * The phones are build/p316/node-phone.mjs, paired through the stand-in's
 * loopback forwarder with mutual TLS, their writes signed over the method, the
 * path and the body (`chooseOption`, `sayText`). THE AGENTS ARE
 * build/p318/stand-in.mjs: the scratch login shell resolves `claude` and
 * `codex` to /bin/bash wrappers that `exec -a <name>` it (the probe REFUSES to
 * start, exit 2, unless both bare names resolve there), so Tortie launches
 * them as it launches the real ones, by bare name, with its own `--settings`
 * hook file for Claude Code; they draw the COMMITTED REAL screens
 * (build/fixtures/reply/, Claude Code 2.1.287 and Codex 0.160.0), post Claude
 * Code's hooks to the URL Tortie wrote, and LOG EVERY BYTE THEY READ with a
 * monotonic stamp and the serial of the screen drawn: that log is the ground
 * truth every arm is graded on, never the writer's report. NO VENDOR PROCESS
 * RUNS AND NO MODEL TURN IS SPENT.
 *
 * THE DESK, AS THE MAC'S OWN TERMINAL SENDS IT (the fix round of 2026-10-04).
 * A keystroke reaches a session only through the attach client of a terminal
 * that is MOUNTED, and each stand-in is in a project of its own, so `front()`
 * first brings the session's project forward (`__gmuxP95.openLocal`, which
 * activates an open project) and then the session (`select`), and reads back
 * that the session is the active one with its terminal drawn. A keystroke is
 * then what TerminalPane's `onData` does with one: `window.gmux.
 * noteTerminalInput(id)`, then `window.gmux.term.sendInput(id, text)`; a pane
 * report is `sendInput` alone, as `sendReport` does. As first written the
 * probe called `select` alone, which only sets the active session of the
 * ACTIVE project, so no desk byte, report or resize reached any stand-in and
 * R9 passed with no desk byte while R11, R13 and R17 could not be read. A
 * question left unanswered is never withdrawn to get back to the prompt
 * (`recover()` lets the stand-in WORK, then idle), because the monitor never
 * lets a withdrawn question leave `needs_input`, which left R5, R14, R15 and
 * R16 refused `unsayable` before they tested anything.
 *
 * THE SESSIONS. Two Claude Code stand-ins (A for the presses and messages, B
 * for the race and the resize), two Codex stand-ins (the same), a third
 * Claude Code stand-in for R12 (it hands its terminal to a non-agent program
 * printing a numbered dialog), a shell, and a shell on the loopback machine;
 * for RN, a waiting and an idle stand-in made at EACH build under the build's
 * own suffix.
 *
 * THE ARMS (SPEC §7.6)
 *   R0  the door reads `changed` (after the parent confirmed it); its lines
 *       name `choose` and `say` and say what the three writes do; the confirm
 *       block draws POCKET_DOOR_HONESTY and both lines before Allow; Allow
 *   R1  Claude, `1` from phone A: 200 `done`; one byte 31 on the question
 *       drawn; `/v1/blocked` read within 50 ms of the answer no longer lists it
 *   R2  Codex, `3` (No): `done`; one byte 33; its command offered as drawn
 *   R3  his ruling 2: Claude `2` and Codex `2` offered and pressed: `done`
 *   R4  a hook command of 250 characters and one carrying a token shape: only
 *       No offered; a hand-made `1` refused `changed`, nothing typed
 *   R5  a message at each stand-in's empty prompt: `done`; exactly the
 *       bracketed frame read, and one `submitted`
 *   R6  mid-turn (§Revision R15): `canSay` false while each works; a hand-made
 *       `say` refused `unsayable` with REPLY_NOT_READY; no byte; once idle the
 *       box is offered again
 *   R7  a `needs_input` row: `canSay` false, a hand-made `say` refused
 *       `unsayable`; the trust-gate screen: nothing pressable, no box
 *   R8  the remote shell: the empty offer; a hand-made `choose` refused
 *       `unpressable` and `say` `unsayable`; its far pane unchanged and no
 *       message buffer on the far server
 *   R9  THE RACE, both agents: a desk `1` at 0, 5, 15, 30, 50, 120, 200 and
 *       400 ms before the phone presses its question's LAST marker, each
 *       question committing into a NEXT question; graded off the stand-ins'
 *       logs: every desk byte REACHED the agent (so no trial passes unstaged),
 *       and every phone byte landed on the question the phone was shown, or
 *       the press was refused `changed` with none (a desk byte on the next
 *       question is the desk's own, printed)
 *   R10 two identical successive questions: the second press with the first's
 *       question id refused `changed`, no byte
 *   R11 the window resized between the read and the press (§Revision R19 f):
 *       when option 2 re-wraps (here: is cut) and the mark moves, the earlier
 *       offer's press refused `changed` with no byte, the next read offers the
 *       Codex approval again at its new mark and draws Claude Code's
 *       unpressable; when nothing re-wraps, the press is `done`; the widths
 *       printed
 *   R12 a numbered dialog printed by a NON-AGENT foreground program in a
 *       Claude Code session, its PermissionRequest posted: nothing pressable;
 *       a hand-made press refused `changed`, the pane unchanged
 *   R13 a draft typed at the Mac into each prompt: `canSay` false; a
 *       hand-made `say` refused `unsayable`; no byte from the phone; the draft
 *       still there
 *   R14 the text arms: `/exit`, `!touch x`, `-R`, `x;`, `a\;` and 4,096 bytes
 *       delivered exactly; ESC [201~, a TAB, a CR and a lone surrogate refused
 *       `character`, 4,097 bytes `long`, the empty string `empty`, none
 *       reaching the agent
 *   R15 replays: the same bytes again 404 and one act; the same write id
 *       fresh-signed the recorded answer and one submit; phone B Removed on
 *       the Mac refused before HTTP; the door switched off while a press reads
 *       back: 200 or a cut, never 404, at most one digit
 *   R15b (§Revision R13) a `say` whose answer this file's relay CUTS once main
 *       logged the act, then the SAME write id and words re-signed: the
 *       recorded `done` and exactly ONE `submitted`; the same words under a
 *       fresh id is a second message, printed
 *   R16 a dialog-shaped message into each stand-in (which echoes it RAW above
 *       its prompt): no `needs_input` for 10 s
 *   R17 pane reports move nothing (§Revision R14): five blurs and focuses of
 *       the Mac's terminal and five returns to the session leave the question
 *       id where it was and a press made on the offer read BEFORE them `done`;
 *       a real keystroke (an arrow) moves it and a stale press is refused
 *       `changed` (the control)
 *   R18 after the app is gone: app.log, every file under the profile and HOME
 *       but the sessions' own saved screens (`<profile>/gmux/snapshots/`, the
 *       scrollback Tortie keeps at quit, which holds a delivered message as
 *       the agent drew it, exactly as it holds words typed at the desk;
 *       counted and printed), and `ps -ww` sampled every 500 ms through R5 to
 *       R16 hold no message canary; no `tortie-say-` buffer left; one log line
 *       per write that acted; src/main/menu.ts as at the snapshot
 *   R19 request-to-land: the node phone's request written to the stand-in's
 *       read, p50 and p99, printed (D26: graded only that it was read)
 *   R20 THE FIX ROUND'S ARM (2026-10-04): an answered press lets the Mac's
 *       `needs_input` go. Six No presses per agent, each after a random wait
 *       of up to 2 s so it lands anywhere in the monitor's tick; every press
 *       `done` with its one digit, and no session left at `needs_input` for
 *       the last 2 s of a 6 s watch while its stand-in sits idle at its prompt
 *       (the run lens measured 11 of 60 stuck before the fix)
 *   RN  no regression: ⌘J's rows and Catch Me Up's lines for the RN sessions
 *       read the same at the parent and at HEAD (names normalized, and each
 *       build's suffix the same length, so a line that wraps on the folder's
 *       path wraps at the same place at both); the
 *       door's `/v1/session` answer time for a waiting Claude Code row at
 *       both, p50 within 150 ms (UNREADABLE with no parent)
 *   RP  with P318_PARENT_CHECKOUT: `POST /v1/choose` and `/v1/say` refused
 *       404 with nothing forwarded; the stand-ins read no byte; the lines name
 *       neither route and one write
 *   RUN both preflights, the quiet agents at every launch, no real Tailscale,
 *       nothing forbidden at the stand-in, every stand-in ended
 *
 * WHAT IT REFUSES TO DO. It never names the person's tmux server or `-L gmux`
 * (it refuses any socket that is not a `gmux-p318` harness socket), binds no
 * real interface and dials nothing but 127.0.0.1, never runs a real
 * `tailscale`, never asks real DNS, reads no keychain and no credential (the
 * app runs `--use-mock-keychain`), and signals only the pids it started or
 * the stand-ins wrote in their hellos, by pid, never by pattern. Every local
 * shell is the scratch HOME's (HISTFILE=/dev/null, TERM_SESSION_ID unset). It
 * takes NO screenshot. Before EVERY launch the profile's agents.json renames
 * the Gemini, Qwen, Antigravity, Grok and Droid binaries and `agents:list` is
 * read back, so no agent's `--version` runs.
 *
 * VERIFIERS ONLY: it starts an Electron. Take the orchestrator's lock.
 *
 *   npm run build && npm run -s probe:p318
 *   P318_PARENT_CHECKOUT=<a BUILT c1a5fd38 checkout> npm run -s probe:p318
 *   P318_KEEP=1                    keep the scratch world (every stand-in's log) for a re-derivation
 *   node build/p318/probe-p318.mjs --grader-self-test   every grader on its fixtures; starts nothing
 *
 * Exit 0 when every arm passed, 1 when one failed, 2 when it could not run or
 * an arm could not be READ.
 */

import { execFile, spawnSync } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createServer as createNetServer, connect as netConnect } from 'node:net';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { withElectron, withoutDevRenderer } from '../electron-run.mjs';
import { cdpEval, wsConnect } from '../cdp-client.mjs';
import { pickRendererTarget } from '../cdp-target.mjs';
import { gradeFixtures } from '../probe-graders.mjs';
import { keyscanText } from '../ssh-run.mjs';
import { chooseOption, freshWriteId, makePhone, pairThrough, readOffer, sayText, signedGet, signedPost } from '../p316/node-phone.mjs';
import { DEFAULT_SCENARIO, endStandinProcesses, makeStandin, preflightStandin, processRows, watchForRealTailscale } from '../p330/tailscale-standin.mjs';
import { NAME_SERVERS_VAR, loopbackOnlyServers, makeDnsStandin, quietAgentsHeld, writeQuietAgents } from '../p332/dns-standin.mjs';
import { codexApprovalScreen, hellos, readLog, readState, sendOps, stripAnsi, writeWrappers } from './stand-in.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const J = JSON.stringify;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const hr = () => process.hrtime.bigint();
const msBetween = (from, to) => Number(BigInt(to) - BigInt(from)) / 1e6;

// ---------------------------------------------------------------------------
// What the run holds the app against, BY VALUE or read from the checkout
// ---------------------------------------------------------------------------

/** The snapshot 318 is built on (build/p318/SPEC.md §4.1): menu.ts must read as it does there. */
export const SNAPSHOT = 'c1a5fd38';
export const MACHINE_ID = 'p318far';
export const ROUTE_LINE = 'Answers these and nothing else: blocked, choose, end, pair, say, session, turns';
export const WRITE_LINE = 'Lets an allowed phone end a session, answer a numbered question and send a session one message';
/** The parent's own lines: one write. */
export const PARENT_WRITE_LINE = 'Lets an allowed phone end a session';
export const LIVE = Object.freeze(['running', 'idle', 'needs_input']);
/** Every phrase a write is logged under (SPEC §5.1.4 step 7). */
export const LOGGED_VERBS = Object.freeze(["the phone's end:", "the phone's choose:", "the phone's say:"]);
/** R9's offsets: the desk's keystroke this long before the phone's press. */
export const RACE_MS = Object.freeze([0, 5, 15, 30, 50, 120, 200, 400]);
/** R20's No presses per agent (the fix round of 2026-10-04). */
export const R20_TRIALS = 6;
/** RN's bound on the door's extra cost (SPEC §7.9). */
export const RN_P50_BOUND_MS = 150;
/** R1's bound on the read after the answer. */
export const BLOCKED_AFTER_MS = 50;

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

/** A write's answer as JSON, or null. */
export function answerOf(reply) {
  try {
    return reply?.status === 200 ? JSON.parse(reply.body) : null;
  } catch {
    return null;
  }
}

/** The route ids the confirm lines' `Answers these and nothing else:` line names, or null. */
export function routeIdsOf(lines) {
  const line = (lines ?? []).find((l) => l.startsWith('Answers these and nothing else:'));
  return line === undefined ? null : line.slice(line.indexOf(':') + 1).split(',').map((s) => s.trim()).filter((s) => s !== '');
}

/**
 * The bytes a message must reach the agent as (research 135 §3.3): ESC
 * [200~, the words with every LF as CR, ESC [201~, one CR, as hex.
 */
export function frameHexOf(text) {
  const body = Buffer.from(String(text), 'utf8');
  return Buffer.concat([Buffer.from('\u001b[200~', 'latin1'), Buffer.from(body.map((b) => (b === 0x0a ? 0x0d : b))), Buffer.from('\u001b[201~\r', 'latin1')]).toString('hex');
}

/** The `q` quantile (nearest rank) of a list of numbers, or null. */
export function quantile(values, q) {
  const xs = values.filter((v) => typeof v === 'number' && Number.isFinite(v)).sort((a, b) => a - b);
  if (xs.length === 0) return null;
  return xs[Math.min(xs.length - 1, Math.max(0, Math.ceil(q * xs.length) - 1))];
}

/**
 * Whether a write ACTED, the way main logs it (SPEC §5.1.4 step 7: once the
 * verb was called, whatever it answered; never for a malformed body, a busy,
 * a ledger repeat or a 404). An answered write says so itself; a CUT write is
 * read by its consequence at the agent (`landed`: the digit committed or the
 * message submitted), and when that cannot tell, it is `unknown`.
 */
export function actedOf(reply, { repeat = false, landed = null } = {}) {
  const a = answerOf(reply);
  if (a !== null) return !repeat && a.outcome !== 'busy' && !(a.outcome === 'refused' && a.reason === 'malformed') ? 'yes' : 'no';
  if (reply?.status === 0) return landed === true ? 'yes' : landed === false ? 'unknown' : 'unknown';
  return 'no';
}

/**
 * R9's verdict over one trial, read off the stand-in's log: the phone's byte
 * (its marker, the question's LAST) landed on the question the phone was
 * shown (`shown`, its serial), or the press was refused `changed` and no byte
 * of the phone's reached the agent at all. Answers `'on the question shown'`,
 * `'refused, none landed'`, or null for a defect (a phone byte on another
 * question, or a refusal with a byte).
 */
export function raceCase({ phoneMarker, shown, outcome, reason, phoneBytes }) {
  const mine = (phoneBytes ?? []).filter((b) => b.marker === phoneMarker);
  if (outcome === 'refused' && reason === 'changed') return mine.length === 0 ? 'refused, none landed' : null;
  if (mine.length === 0) return null;
  return mine.every((b) => b.serial === shown) ? 'on the question shown' : null;
}

/** ⌘J's rows and Catch Me Up's lines with each build's suffix taken out, so two builds' readings compare. */
export function normalizeRn(reading, suffix) {
  // The build's suffix, and every clock time (`started 14:24`): the two
  // builds' sessions are made minutes apart, so a start time is never the
  // same, and is not what RN compares (the fixer's with-parent run, 2026-10-04).
  const strip = (s) => String(s ?? '').split(suffix).join('<build>').replace(/\b\d{1,2}:\d{2}\b/g, '<time>');
  return {
    rows: (reading?.rows ?? []).map((r) => ({ name: strip(r.name), label: strip(r.label), excerpt: strip(r.excerpt) })).sort((a, b) => a.name.localeCompare(b.name)),
    lines: (reading?.lines ?? []).map(strip).sort()
  };
}

// ---------------------------------------------------------------------------
// The graders: pure, over a recorded reading, each clause shown to fail
// ---------------------------------------------------------------------------

const deepEqual = (a, b) => J(a) === J(b);
const refusedWith = (a, reason, sentence) => a?.status === 200 && a.outcome === 'refused' && a.reason === reason && (sentence === undefined || a.sentence === sentence);
const doneEchoed = (a) => a?.status === 200 && a.outcome === 'done' && a.echoed === true;

export const GRADERS = {
  R0: {
    title: 'the door asks again over its new route list, in words',
    clauses: [
      ['the lines name every route, choose and say among them', (r) => r.lines.includes(ROUTE_LINE)],
      ['the lines say what the three writes do', (r) => r.lines.includes(WRITE_LINE)],
      ['Settings then Phone draws the honesty sentence and both lines in its confirm block, before Allow', (r) => typeof r.honesty === 'string' && r.honesty.length > 0 && typeof r.confirmBlock === 'string' && r.confirmBlock.includes(r.honesty) && r.confirmBlock.includes(ROUTE_LINE) && r.confirmBlock.includes(WRITE_LINE)],
      ['the agreement read changed after the parent confirmed it, and anything but confirmed on a fresh profile', (r) => (r.parentRanFirst ? r.confirmStateBefore === 'changed' : r.confirmStateBefore !== 'confirmed')],
      ['Allow listened', (r) => r.listening === true]
    ]
  },
  R1: {
    title: 'one tap on a waiting Claude Code question',
    clauses: [
      ['200 done, its id echoed', (r) => doneEchoed(r.answer)],
      ['one byte, 31, on the question drawn, and no Enter', (r) => r.bytes === '31' && deepEqual(r.commits, [{ marker: '1', serial: r.shown }]) && r.enters === 0],
      ['/v1/blocked read within 50 ms of the answer no longer lists the row', (r) => typeof r.blockedLagMs === 'number' && r.blockedLagMs <= BLOCKED_AFTER_MS && r.stillListed === false]
    ]
  },
  R2: {
    title: 'No on a Codex approval, under the command it draws',
    clauses: [
      ['the command was offered as Codex drew it', (r) => typeof r.command === 'string' && r.command === r.drawnCommand],
      ['200 done, its id echoed', (r) => doneEchoed(r.answer)],
      ['one byte, 33, on the approval drawn', (r) => r.bytes === '33' && deepEqual(r.commits, [{ marker: '3', serial: r.shown }])]
    ]
  },
  R3: {
    title: 'his ruling 2: the options that widen the agent\'s room are buttons',
    clauses: [
      ['Claude Code\'s 2 and Codex\'s 2 were offered', (r) => r.claude.pressable.includes('2') && r.codex.pressable.includes('2')],
      ['both presses done, one byte 32 each', (r) => [r.claude, r.codex].every((x) => doneEchoed(x.answer) && x.bytes === '32')]
    ]
  },
  R4: {
    title: 'a command not said whole offers No alone',
    clauses: [
      ['a 250-character command and a token-shaped one each offer No alone', (r) => r.long.pressable.length === 1 && r.long.pressable[0] === r.long.deny && r.token.pressable.length === 1 && r.token.pressable[0] === r.token.deny],
      ['a hand-made 1 on each is refused changed', (r) => refusedWith(r.long.forced, 'changed', r.words.changed) && refusedWith(r.token.forced, 'changed', r.words.changed)],
      ['nothing was typed', (r) => r.long.bytes === '' && r.token.bytes === '']
    ]
  },
  R5: {
    title: 'one message at each empty prompt',
    clauses: [
      ['each message done, its id echoed', (r) => r.messages.length === 2 && r.messages.every((m) => doneEchoed(m.answer))],
      ['each stand-in read exactly the bracketed frame and nothing else', (r) => r.messages.every((m) => m.bytes === frameHexOf(m.text))],
      ['each submitted it once, its own words', (r) => r.messages.every((m) => m.submits.length === 1 && m.submits[0] === Buffer.from(m.text, 'utf8').toString('hex'))]
    ]
  },
  R6: {
    title: 'no message while the agent works (his ruling, "Only when idle at its prompt")',
    clauses: [
      ['the box is not offered while each works', (r) => r.agents.length === 2 && r.agents.every((a) => a.working === true && a.canSayWorking === false)],
      ['a hand-made say is refused unsayable, in the Mac\'s sentence', (r) => r.agents.every((a) => refusedWith(a.forced, 'unsayable', r.words.notReady))],
      ['no byte reached the agent', (r) => r.agents.every((a) => a.bytes === '')],
      ['once idle again, the box is offered again', (r) => r.agents.every((a) => a.canSayIdle === true)]
    ]
  },
  R7: {
    title: 'no message on a waiting row, and no press on a gate',
    clauses: [
      ['a waiting row offers no box', (r) => r.waiting.status === 'needs_input' && r.waiting.canSay === false],
      ['a hand-made say on it is refused unsayable', (r) => refusedWith(r.waiting.forced, 'unsayable', r.words.notReady) && r.waiting.bytes === ''],
      ['the trust gate, waiting, offers no press and no box', (r) => r.gate.waiting === true && r.gate.pressable.length === 0 && r.gate.canSay === false]
    ]
  },
  R8: {
    title: 'a shell on another machine is offered nothing and reached by nothing',
    clauses: [
      ['the remote shell carries the empty offer', (r) => deepEqual(r.offer, { question: null, mark: null, pressable: [], command: null, canSay: false })],
      ['a hand-made press is refused unpressable and a message unsayable', (r) => refusedWith(r.press, 'unpressable') && refusedWith(r.say, 'unsayable')],
      ['the far pane is unchanged and the far server holds no message buffer', (r) => r.farSame === true && r.farBuffers === 0]
    ]
  },
  R9: {
    title: 'the race: a phone byte lands on the question it was shown, or nowhere',
    clauses: [
      ['every trial was staged, on both agents', (r) => r.trials.length === RACE_MS.length * 2 && r.trials.every((t) => t.staged === true)],
      // The fix round: as first written no desk byte reached any stand-in, and
      // every trial read `refused, none landed` with nothing raced at all.
      ['every trial\'s desk byte reached the agent, so the race was run', (r) => r.trials.every((t) => Array.isArray(t.deskBytes) && t.deskBytes.length > 0)],
      ['every phone byte landed on the question the phone was shown, or the press was refused changed with none', (r) => r.trials.every((t) => raceCase(t) !== null)]
    ]
  },
  R10: {
    title: 'two identical questions in a row: the first id answers the first',
    clauses: [
      // An identical next question drawn in the same window cannot be told from
      // the same question by the screen, so a press there may honestly read
      // not-taken (REPLY_NOT_TAKEN's own reason, SPEC §5.1.6); what must hold
      // is that its one digit landed on the first question.
      ['the first press of each landed its one digit on the first question, and read done or the not-taken sentence', (r) => r.agents.length === 2 && r.agents.every((a) => deepEqual(a.firstCommits, [{ marker: a.marker, serial: a.shown }]) && (doneEchoed(a.first) || (a.first?.status === 200 && a.first.outcome === 'failed' && a.first.sentence === r.words.notTaken)))],
      ['the second press with the first\'s question id was refused changed, with no byte', (r) => r.agents.every((a) => refusedWith(a.second, 'changed') && a.secondBytes === '')]
    ]
  },
  R11: {
    title: 'a resize between the read and the press',
    clauses: [
      ['a resize that moved the mark refused the earlier press, with no byte', (r) => r.moved.every((m) => m.markMoved === true && refusedWith(m.press, 'changed') && m.bytes === '')],
      ['the next read offers the Codex approval again at its new mark, and Claude Code\'s unpressable', (r) => r.reoffer.codex === true && r.reoffer.claude === false],
      ['a resize that moved nothing let the press through', (r) => r.still.length > 0 && r.still.every((s) => s.markMoved === false && doneEchoed(s.press))]
    ]
  },
  R12: {
    title: 'a numbered dialog a program that is not the agent draws is nobody\'s to press',
    clauses: [
      ['the session read waiting, a program that is not the agent holding its terminal', (r) => r.status === 'needs_input' && r.foregroundIsAgent === false],
      ['nothing is offered', (r) => r.pressable.length === 0],
      ['a hand-made press is refused changed and the pane is unchanged', (r) => refusedWith(r.forced, 'changed') && r.paneSame === true]
    ]
  },
  R13: {
    title: 'a draft typed at the Mac is never typed over',
    clauses: [
      ['a draft at each prompt offers no box', (r) => r.agents.length === 2 && r.agents.every((a) => a.drafted === true && a.canSay === false)],
      ['a hand-made say on each is refused unsayable', (r) => r.agents.every((a) => refusedWith(a.forced, 'unsayable', r.words.notReady))],
      ['no byte from the phone reached either, and the draft is still there', (r) => r.agents.every((a) => a.phoneBytes === '' && a.typedAfter > 0)]
    ]
  },
  R14: {
    title: 'his words exactly, or refused for their own reason',
    clauses: [
      ['the texts that may go were delivered exactly and submitted once', (r) => r.delivered.length === 6 && r.delivered.every((d) => doneEchoed(d.answer) && d.bytes === frameHexOf(d.text) && d.submits === 1)],
      ['each refused text was refused for its own reason', (r) => r.refused.length === 6 && r.refused.every((d) => refusedWith(d.answer, d.want))],
      ['no refused text reached the agent', (r) => r.refused.every((d) => d.bytes === '')]
    ]
  },
  R15: {
    title: 'a write happens once or not at all',
    clauses: [
      ['the same bytes again: 404, and one act', (r) => r.replay.first === 200 && r.replay.again === 404 && r.replay.submits === 1],
      ['the same write id fresh-signed: the recorded answer, one submit', (r) => r.reused.first === 200 && r.reused.second === 200 && r.reused.sameBody === true && r.reused.submits === 1],
      ['a phone Removed on the Mac is refused before HTTP', (r) => r.removedPhone.status === 0 && r.removedPhone.wasPaired === true],
      ['the door switched off while a press read back: 200 or a cut, never 404, at most one digit', (r) => (r.offDuringPress.status === 200 || r.offDuringPress.status === 0) && r.offDuringPress.digits <= 1]
    ]
  },
  R15b: {
    title: 'the kept say: a message whose answer did not come is sent once',
    clauses: [
      ['the cut came after main logged the act', (r) => r.cutStatus === 0 && r.loggedBeforeCut === true],
      ['the same id and words re-signed answered the recorded done', (r) => doneEchoed(r.resent)],
      ['the stand-in submitted it once', (r) => r.submitsAfterResend === 1]
    ]
  },
  R16: {
    title: 'a dialog-shaped message raises no question',
    clauses: [
      ['each dialog-shaped message was done and echoed raw', (r) => r.agents.length === 2 && r.agents.every((a) => doneEchoed(a.answer) && a.echoed === true)],
      ['neither session read needs_input for 10 s', (r) => r.agents.every((a) => a.samples >= 10 && a.waitingSamples === 0)]
    ]
  },
  R17: {
    title: 'pane reports move nothing, and a keystroke does',
    clauses: [
      ['five blurs and focuses and five returns sent reports and left the question id where it was', (r) => r.reportsSent > 0 && r.questionBefore !== null && r.questionAfter === r.questionBefore],
      ['the press made on the offer read before them was done', (r) => doneEchoed(r.stalePress)],
      ['a real keystroke moved the id and the stale press was refused changed, with no digit', (r) => r.arrowReached === true && refusedWith(r.control, 'changed') && r.controlDigits === 0]
    ]
  },
  R18: {
    title: 'no word of a message kept anywhere, no buffer left, one line per act, the menus unmoved',
    clauses: [
      ['app.log and every file under the profile and HOME but the sessions\' own saved screens hold no canary', (r) => r.appLogRead === true && r.filesScanned > 0 && r.hits.length === 0 && r.hits.every((h) => !String(h.file).includes('/gmux/snapshots/'))],
      ['no process sample held a canary', (r) => r.psSamples > 0 && r.psHits === 0],
      ['no tortie-say buffer was left', (r) => r.buffersLeft === 0],
      ['one log line per write that acted', (r) => r.acted > 0 && r.logLines >= r.acted && r.logLines <= r.acted + r.unknown],
      ['menu.ts is the snapshot\'s, byte for byte', (r) => r.menuSame === true]
    ]
  },
  R19: {
    title: 'request-to-land, printed (D26)',
    clauses: [['request-to-land was read for presses and messages', (r) => r.presses.n > 0 && r.messages.n > 0]]
  },
  R20: {
    title: 'an answered press lets the Mac\'s needs-input go (the fix round)',
    clauses: [
      ['every trial was staged, on both agents', (r) => r.trials.length === R20_TRIALS * 2 && r.trials.every((t) => t.staged === true) && ['claude', 'codex'].every((a) => r.trials.some((t) => t.agent === a))],
      ['every press was done and its one digit committed', (r) => r.trials.every((t) => t.outcome === 'done' && t.landed === 1)],
      ['no session was left at needs_input while its stand-in sat idle at its prompt', (r) => r.trials.every((t) => t.stuck === false && t.mode === 'idle')]
    ]
  },
  RN: {
    title: 'no regression against the parent',
    clauses: [
      ['⌘J\'s rows read the same at the parent and HEAD', (r) => deepEqual(r.parent.rows, r.head.rows) && r.head.rows.length > 0],
      ['Catch Me Up\'s lines read the same', (r) => deepEqual(r.parent.lines, r.head.lines)],
      ['/v1/session\'s p50 at HEAD is within 150 ms of the parent\'s', (r) => typeof r.parentP50 === 'number' && typeof r.headP50 === 'number' && r.headP50 - r.parentP50 < RN_P50_BOUND_MS]
    ]
  },
  RP: {
    title: 'the parent has no reply route',
    clauses: [
      ['both writes refused 404 with nothing forwarded', (r) => r.choose === 404 && r.say === 404 && r.writeLines === 0],
      ['the stand-ins read no byte', (r) => r.bytes === ''],
      ['the lines name neither route, and one write', (r) => routeIdsOf(r.lines) !== null && !routeIdsOf(r.lines).includes('choose') && !routeIdsOf(r.lines).includes('say') && r.lines.includes(PARENT_WRITE_LINE)]
    ]
  },
  RUN: {
    title: 'no real Tailscale, no real DNS, no agent, nothing left',
    clauses: [
      ['the Tailscale preflight passed', (r) => r.tailscalePreflight === true],
      ['the DNS preflight passed at every launch', (r) => r.dnsPreflights.length > 0 && r.dnsPreflights.every(Boolean)],
      ['the quiet agents held at every launch', (r) => r.agentsHeld.length > 0 && r.agentsHeld.every(Boolean)],
      ['every bare name resolved to the stand-in', (r) => r.resolved === true],
      ['no real Tailscale in any sample', (r) => r.realTailscale === 0 && r.samples > 0],
      ['nothing forbidden reached the stand-in', (r) => r.forbidden === 0],
      ['every stand-in ended', (r) => r.standinLeft === 0 && r.agentsLeft === 0]
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
// The fixtures: each grader's honest reading and one break per clause
// ---------------------------------------------------------------------------

const WORDS = {
  changed: 'This session changed. Nothing was done.',
  notReady: 'This session is not ready for a message. Nothing was sent.',
  honesty: 'A phone you allow can end a session, answer a numbered question and send a session one message. It can change nothing else on this Mac.'
};
const done = { status: 200, outcome: 'done', reason: null, sentence: null, echoed: true };
const refused = (reason, sentence = 'x') => ({ status: 200, outcome: 'refused', reason, sentence, echoed: true });
const hex = (s) => Buffer.from(s, 'utf8').toString('hex');

export const GRADER_FIXTURES = {
  R0: {
    pass: { lines: ['Publishes https://x.ts.net:8443', ROUTE_LINE, WRITE_LINE], honesty: WORDS.honesty, confirmBlock: `${ROUTE_LINE}\n${WRITE_LINE}\n${WORDS.honesty}\nAllow`, parentRanFirst: true, confirmStateBefore: 'changed', listening: true },
    breaks: {
      'the lines name every route, choose and say among them': (r) => void (r.lines = ['Answers these and nothing else: blocked, end, pair, session, turns', WRITE_LINE]),
      'the lines say what the three writes do': (r) => void (r.lines = [ROUTE_LINE, PARENT_WRITE_LINE]),
      'Settings then Phone draws the honesty sentence and both lines in its confirm block, before Allow': (r) => void (r.confirmBlock = null),
      'the agreement read changed after the parent confirmed it, and anything but confirmed on a fresh profile': (r) => void (r.confirmStateBefore = 'confirmed'),
      'Allow listened': (r) => void (r.listening = false)
    },
    refused: [{ what: 'the old honesty sentence ("Nothing on it can type into a session")', clause: 'Settings then Phone draws the honesty sentence and both lines in its confirm block, before Allow', edit: (r) => void (r.confirmBlock = `${ROUTE_LINE}\n${WRITE_LINE}\nA phone you allow can end a session. Nothing on it can type into a session.\nAllow`) }]
  },
  R1: {
    pass: { answer: done, bytes: '31', commits: [{ marker: '1', serial: 4 }], shown: 4, enters: 0, blockedLagMs: 12, stillListed: false },
    breaks: {
      '200 done, its id echoed': (r) => void (r.answer = { ...done, echoed: false }),
      'one byte, 31, on the question drawn, and no Enter': (r) => void (r.bytes = '310d'),
      '/v1/blocked read within 50 ms of the answer no longer lists the row': (r) => void (r.stillListed = true)
    },
    refused: [
      { what: 'the digit committing the NEXT question', clause: 'one byte, 31, on the question drawn, and no Enter', edit: (r) => void (r.commits = [{ marker: '1', serial: 5 }]) },
      { what: 'an Enter read at the question', clause: 'one byte, 31, on the question drawn, and no Enter', edit: (r) => void (r.enters = 1) },
      { what: 'a blocked read made 400 ms after the answer', clause: '/v1/blocked read within 50 ms of the answer no longer lists the row', edit: (r) => void (r.blockedLagMs = 400) }
    ]
  },
  R2: {
    pass: { command: 'touch p318-r2.txt', drawnCommand: 'touch p318-r2.txt', answer: done, bytes: '33', commits: [{ marker: '3', serial: 9 }], shown: 9 },
    breaks: {
      'the command was offered as Codex drew it': (r) => void (r.command = null),
      '200 done, its id echoed': (r) => void (r.answer = refused('changed')),
      'one byte, 33, on the approval drawn': (r) => void (r.bytes = '31')
    }
  },
  R3: {
    pass: { claude: { pressable: ['1', '2', '3', '4'], answer: done, bytes: '32' }, codex: { pressable: ['1', '2', '3'], answer: done, bytes: '32' } },
    breaks: {
      'Claude Code\'s 2 and Codex\'s 2 were offered': (r) => void (r.claude.pressable = ['1', '4']),
      'both presses done, one byte 32 each': (r) => void (r.codex.bytes = '')
    },
    refused: [{ what: 'the entry\'s default, widening options unpressable', clause: 'Claude Code\'s 2 and Codex\'s 2 were offered', edit: (r) => void (r.codex.pressable = ['1', '3']) }]
  },
  R4: {
    pass: { words: WORDS, long: { pressable: ['4'], deny: '4', forced: refused('changed', WORDS.changed), bytes: '' }, token: { pressable: ['4'], deny: '4', forced: refused('changed', WORDS.changed), bytes: '' } },
    breaks: {
      'a 250-character command and a token-shaped one each offer No alone': (r) => void (r.token.pressable = ['1', '2', '3', '4']),
      'a hand-made 1 on each is refused changed': (r) => void (r.long.forced = done),
      'nothing was typed': (r) => void (r.long.bytes = '31')
    }
  },
  R5: {
    pass: { messages: [{ text: 'hello', answer: done, bytes: frameHexOf('hello'), submits: [hex('hello')] }, { text: 'x;', answer: done, bytes: frameHexOf('x;'), submits: [hex('x;')] }] },
    breaks: {
      'each message done, its id echoed': (r) => void (r.messages[1].answer = refused('unsayable')),
      'each stand-in read exactly the bracketed frame and nothing else': (r) => void (r.messages[1].bytes = hex('x;\r')),
      'each submitted it once, its own words': (r) => void r.messages[0].submits.push(hex('hello'))
    }
  },
  R6: {
    pass: { words: WORDS, agents: [{ working: true, canSayWorking: false, forced: refused('unsayable', WORDS.notReady), bytes: '', canSayIdle: true }, { working: true, canSayWorking: false, forced: refused('unsayable', WORDS.notReady), bytes: '', canSayIdle: true }] },
    breaks: {
      'the box is not offered while each works': (r) => void (r.agents[0].canSayWorking = true),
      'a hand-made say is refused unsayable, in the Mac\'s sentence': (r) => void (r.agents[1].forced = done),
      'no byte reached the agent': (r) => void (r.agents[0].bytes = frameHexOf('m')),
      'once idle again, the box is offered again': (r) => void (r.agents[1].canSayIdle = false)
    },
    refused: [{ what: 'a stand-in that never read as working (the arm staged nothing)', clause: 'the box is not offered while each works', edit: (r) => void (r.agents[0].working = false) }]
  },
  R7: {
    pass: { words: WORDS, waiting: { status: 'needs_input', canSay: false, forced: refused('unsayable', WORDS.notReady), bytes: '' }, gate: { waiting: true, pressable: [], canSay: false } },
    breaks: {
      'a waiting row offers no box': (r) => void (r.waiting.canSay = true),
      'a hand-made say on it is refused unsayable': (r) => void (r.waiting.forced = done),
      'the trust gate, waiting, offers no press and no box': (r) => void (r.gate.pressable = ['1'])
    },
    refused: [{ what: 'a gate that never read as waiting (nothing was tested)', clause: 'the trust gate, waiting, offers no press and no box', edit: (r) => void (r.gate.waiting = false) }]
  },
  R8: {
    pass: { offer: { question: null, mark: null, pressable: [], command: null, canSay: false }, press: refused('unpressable'), say: refused('unsayable'), farSame: true, farBuffers: 0 },
    breaks: {
      'the remote shell carries the empty offer': (r) => void (r.offer = { ...r.offer, canSay: true }),
      'a hand-made press is refused unpressable and a message unsayable': (r) => void (r.say = refused('changed')),
      'the far pane is unchanged and the far server holds no message buffer': (r) => void (r.farBuffers = 1)
    }
  },
  R9: {
    pass: {
      trials: [...RACE_MS.map((ms) => ({ agent: 'claude', ms, staged: true, phoneMarker: '4', shown: 3, outcome: 'refused', reason: 'changed', phoneBytes: [], deskBytes: [{ marker: '1', serial: 3, kind: 'commit' }] })), ...RACE_MS.map((ms) => ({ agent: 'codex', ms, staged: true, phoneMarker: '3', shown: 7, outcome: 'done', reason: null, phoneBytes: [{ marker: '3', serial: 7 }], deskBytes: [{ marker: '1', serial: 8, kind: 'commit' }] }))]
    },
    breaks: {
      'every trial was staged, on both agents': (r) => void (r.trials[2].staged = false),
      // The run lens's reading of the first probe: no desk byte anywhere.
      'every trial\'s desk byte reached the agent, so the race was run': (r) => void (r.trials[5].deskBytes = []),
      // The race the phase exists to close: the phone's byte on the NEXT question.
      'every phone byte landed on the question the phone was shown, or the press was refused changed with none': (r) => void (r.trials[9].phoneBytes = [{ marker: '3', serial: 8 }])
    },
    refused: [
      { what: 'a refusal with the phone\'s byte at the agent', clause: 'every phone byte landed on the question the phone was shown, or the press was refused changed with none', edit: (r) => void (r.trials[0].phoneBytes = [{ marker: '4', serial: 4 }]) },
      { what: 'a done whose byte never reached the agent', clause: 'every phone byte landed on the question the phone was shown, or the press was refused changed with none', edit: (r) => void (r.trials[9].phoneBytes = []) },
      { what: 'a trial missing', clause: 'every trial was staged, on both agents', edit: (r) => void r.trials.pop() }
    ]
  },
  R10: {
    pass: {
      words: { ...WORDS, notTaken: 'Your answer was typed and the question is still there.' },
      agents: [
        { marker: '1', shown: 3, firstCommits: [{ marker: '1', serial: 3 }], first: done, second: refused('changed'), secondBytes: '' },
        { marker: '1', shown: 6, firstCommits: [{ marker: '1', serial: 6 }], first: { status: 200, outcome: 'failed', reason: null, sentence: 'Your answer was typed and the question is still there.', echoed: true }, second: refused('changed'), secondBytes: '' }
      ]
    },
    breaks: {
      'the first press of each landed its one digit on the first question, and read done or the not-taken sentence': (r) => void (r.agents[0].firstCommits = [{ marker: '1', serial: 4 }]),
      'the second press with the first\'s question id was refused changed, with no byte': (r) => void (r.agents[1].second = done)
    }
  },
  R11: {
    pass: {
      moved: [{ agent: 'codex', markMoved: true, press: refused('changed'), bytes: '' }, { agent: 'claude', markMoved: true, press: refused('changed'), bytes: '' }],
      reoffer: { codex: true, claude: false },
      still: [{ agent: 'codex', markMoved: false, press: done }]
    },
    breaks: {
      'a resize that moved the mark refused the earlier press, with no byte': (r) => void (r.moved[0].press = done),
      'the next read offers the Codex approval again at its new mark, and Claude Code\'s unpressable': (r) => void (r.reoffer.claude = true),
      'a resize that moved nothing let the press through': (r) => void (r.still[0].press = refused('changed'))
    }
  },
  R12: {
    pass: { status: 'needs_input', foregroundIsAgent: false, pressable: [], forced: refused('changed'), paneSame: true },
    breaks: {
      'the session read waiting, a program that is not the agent holding its terminal': (r) => void (r.foregroundIsAgent = true),
      'nothing is offered': (r) => void (r.pressable = ['1', '2']),
      'a hand-made press is refused changed and the pane is unchanged': (r) => void (r.paneSame = false)
    }
  },
  R13: {
    pass: { words: WORDS, agents: [{ drafted: true, canSay: false, forced: refused('unsayable', WORDS.notReady), phoneBytes: '', typedAfter: 5 }, { drafted: true, canSay: false, forced: refused('unsayable', WORDS.notReady), phoneBytes: '', typedAfter: 5 }] },
    breaks: {
      'a draft at each prompt offers no box': (r) => void (r.agents[0].canSay = true),
      'a hand-made say on each is refused unsayable': (r) => void (r.agents[1].forced = done),
      'no byte from the phone reached either, and the draft is still there': (r) => void (r.agents[0].typedAfter = 0)
    }
  },
  R14: {
    pass: {
      delivered: ['/exit', '!touch x', '-R', 'x;', 'a\\;', 'y'.repeat(4096)].map((text) => ({ text, answer: done, bytes: frameHexOf(text), submits: 1 })),
      refused: [['esc', 'character'], ['tab', 'character'], ['cr', 'character'], ['surrogate', 'character'], ['4097', 'long'], ['empty', 'empty']].map(([what, want]) => ({ what, want, answer: refused(want), bytes: '' }))
    },
    breaks: {
      'the texts that may go were delivered exactly and submitted once': (r) => void (r.delivered[3].bytes = hex('x\r')),
      'each refused text was refused for its own reason': (r) => void (r.refused[0].answer = refused('long')),
      'no refused text reached the agent': (r) => void (r.refused[1].bytes = '09')
    }
  },
  R15: {
    pass: { replay: { first: 200, again: 404, submits: 1 }, reused: { first: 200, second: 200, sameBody: true, submits: 1 }, removedPhone: { status: 0, wasPaired: true }, offDuringPress: { status: 200, digits: 1 } },
    breaks: {
      'the same bytes again: 404, and one act': (r) => void (r.replay.submits = 2),
      'the same write id fresh-signed: the recorded answer, one submit': (r) => void (r.reused.submits = 2),
      'a phone Removed on the Mac is refused before HTTP': (r) => void (r.removedPhone.status = 404),
      'the door switched off while a press read back: 200 or a cut, never 404, at most one digit': (r) => void (r.offDuringPress.status = 404)
    },
    refused: [{ what: 'the door off and two digits typed', clause: 'the door switched off while a press read back: 200 or a cut, never 404, at most one digit', edit: (r) => void (r.offDuringPress.digits = 2) }]
  },
  R15b: {
    pass: { cutStatus: 0, loggedBeforeCut: true, resent: done, submitsAfterResend: 1, freshSubmits: 2 },
    breaks: {
      'the cut came after main logged the act': (r) => void (r.loggedBeforeCut = false),
      'the same id and words re-signed answered the recorded done': (r) => void (r.resent = { ...done, echoed: false }),
      // §Revision R13's defect: the same paste submitted twice.
      'the stand-in submitted it once': (r) => void (r.submitsAfterResend = 2)
    }
  },
  R16: {
    pass: { agents: [{ answer: done, echoed: true, samples: 20, waitingSamples: 0 }, { answer: done, echoed: true, samples: 20, waitingSamples: 0 }] },
    breaks: {
      'each dialog-shaped message was done and echoed raw': (r) => void (r.agents[1].echoed = false),
      'neither session read needs_input for 10 s': (r) => void (r.agents[0].waitingSamples = 1)
    }
  },
  R17: {
    pass: { mounted: true, reportsSent: 20, questionBefore: 'aa-5', questionAfter: 'aa-5', stalePress: done, control: refused('changed'), controlDigits: 0, arrowReached: true },
    breaks: {
      // §Revision R14's defect: a focus report bumped the id and cleared the hook's question.
      'five blurs and focuses and five returns sent reports and left the question id where it was': (r) => void (r.questionAfter = 'aa-6'),
      'the press made on the offer read before them was done': (r) => void (r.stalePress = refused('changed')),
      'a real keystroke moved the id and the stale press was refused changed, with no digit': (r) => void (r.control = done)
    },
    refused: [
      { what: 'no report sent at all (nothing was tested)', clause: 'five blurs and focuses and five returns sent reports and left the question id where it was', edit: (r) => void (r.reportsSent = 0) },
      // The run lens's reading of the first probe: the arrow never reached the stand-in, so the control proved nothing.
      { what: 'the control\'s arrow never reached the agent', clause: 'a real keystroke moved the id and the stale press was refused changed, with no digit', edit: (r) => void (r.arrowReached = false) }
    ]
  },
  R18: {
    pass: { appLogRead: true, filesScanned: 120, hits: [], snapshotHits: 3, psSamples: 300, psHits: 0, buffersLeft: 0, logLines: 41, acted: 40, unknown: 1, menuSame: true },
    breaks: {
      'app.log and every file under the profile and HOME but the sessions\' own saved screens hold no canary': (r) => void (r.hits = [{ file: 'profile/logs/app.log', canary: 'p318c-1' }]),
      'no process sample held a canary': (r) => void (r.psHits = 1),
      'no tortie-say buffer was left': (r) => void (r.buffersLeft = 1),
      'one log line per write that acted': (r) => void (r.logLines = 39),
      'menu.ts is the snapshot\'s, byte for byte': (r) => void (r.menuSame = false)
    },
    refused: [
      { what: 'a line for a write that never acted', clause: 'one log line per write that acted', edit: (r) => void (r.logLines = 43) },
      { what: 'a canary under the saved screens that the scan was meant to skip, counted as a hit anyway', clause: 'app.log and every file under the profile and HOME but the sessions\' own saved screens hold no canary', edit: (r) => void (r.hits = [{ file: 'profile/gmux/snapshots/abc.txt.000001', canary: 'p318c-1' }]) }
    ]
  },
  R19: {
    pass: { presses: { n: 6, p50: 30, p99: 60 }, messages: { n: 4, p50: 35, p99: 70 } },
    breaks: { 'request-to-land was read for presses and messages': (r) => void (r.messages.n = 0) }
  },
  R20: {
    pass: { trials: ['claude', 'codex'].flatMap((agent) => Array.from({ length: R20_TRIALS }, (_, i) => ({ agent, i, staged: true, outcome: 'done', reason: null, landed: 1, mode: 'idle', stuck: false }))) },
    breaks: {
      'every trial was staged, on both agents': (r) => void (r.trials[3].staged = false),
      'every press was done and its one digit committed': (r) => void (r.trials[7].landed = 0),
      // The run lens's finding: the phone answered done, and the Mac stayed at needs input.
      'no session was left at needs_input while its stand-in sat idle at its prompt': (r) => void (r.trials[1].stuck = true)
    },
    refused: [
      { what: 'one agent never staged', clause: 'every trial was staged, on both agents', edit: (r) => void (r.trials = r.trials.map((t) => ({ ...t, agent: 'claude' }))) },
      { what: 'a press refused changed', clause: 'every press was done and its one digit committed', edit: (r) => void (r.trials[0].outcome = 'refused') },
      { what: 'a stand-in not back at its prompt, so a stuck status could not be told', clause: 'no session was left at needs_input while its stand-in sat idle at its prompt', edit: (r) => void (r.trials[9].mode = 'press') }
    ]
  },
  RN: {
    pass: { parent: { rows: [{ name: 'p318-rn-wait-<build>', label: 'x', excerpt: 'Bash ls' }], lines: ['The agent is waiting for you'] }, head: { rows: [{ name: 'p318-rn-wait-<build>', label: 'x', excerpt: 'Bash ls' }], lines: ['The agent is waiting for you'] }, parentP50: 40, headP50: 90 },
    breaks: {
      '⌘J\'s rows read the same at the parent and HEAD': (r) => void (r.head.rows[0].excerpt = 'Do you want to proceed?'),
      'Catch Me Up\'s lines read the same': (r) => void (r.head.lines = []),
      '/v1/session\'s p50 at HEAD is within 150 ms of the parent\'s': (r) => void (r.headP50 = 190)
    }
  },
  RP: {
    pass: { choose: 404, say: 404, writeLines: 0, bytes: '', lines: ['Answers these and nothing else: blocked, end, pair, session, turns', PARENT_WRITE_LINE] },
    breaks: {
      'both writes refused 404 with nothing forwarded': (r) => void (r.say = 200),
      'the stand-ins read no byte': (r) => void (r.bytes = '31'),
      'the lines name neither route, and one write': (r) => void (r.lines = [ROUTE_LINE, WRITE_LINE])
    }
  },
  RUN: {
    pass: { tailscalePreflight: true, dnsPreflights: [true, true], agentsHeld: [true, true], resolved: true, realTailscale: 0, samples: 900, forbidden: 0, standinLeft: 0, agentsLeft: 0 },
    breaks: {
      'the Tailscale preflight passed': (r) => void (r.tailscalePreflight = false),
      'the DNS preflight passed at every launch': (r) => void (r.dnsPreflights = [true, false]),
      'the quiet agents held at every launch': (r) => void (r.agentsHeld = []),
      'every bare name resolved to the stand-in': (r) => void (r.resolved = false),
      'no real Tailscale in any sample': (r) => void (r.realTailscale = 1),
      'nothing forbidden reached the stand-in': (r) => void (r.forbidden = 1),
      'every stand-in ended': (r) => void (r.agentsLeft = 1)
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
  // The pure readers.
  say(constWord("export const A = 'one';\nexport const B: string =\n  'two, ' +\n  \"three.\";\n", 'B') === 'two, three.', 'constWord reads a concatenation over a line break');
  say(deepEqual(routeIdsOf([ROUTE_LINE]), ['blocked', 'choose', 'end', 'pair', 'say', 'session', 'turns']) && routeIdsOf(['x']) === null, 'routeIdsOf reads the route line');
  say(frameHexOf('a\nb') === Buffer.from('\u001b[200~a\rb\u001b[201~\r', 'latin1').toString('hex'), 'frameHexOf writes LF as CR inside the paste marks and ends with one CR');
  say(quantile([1, 2, 3, 4], 0.5) === 2 && quantile([], 0.5) === null, 'quantile reads the nearest rank');
  say(actedOf({ status: 200, body: '{"outcome":"refused","reason":"character"}' }) === 'yes', 'actedOf counts a refusal the verb made (logged after step 5)');
  say(actedOf({ status: 200, body: '{"outcome":"refused","reason":"malformed"}' }) === 'no' && actedOf({ status: 200, body: '{"outcome":"busy","reason":null}' }) === 'no', 'actedOf counts no malformed body and no busy');
  say(actedOf({ status: 200, body: '{"outcome":"done","reason":null}' }, { repeat: true }) === 'no' && actedOf({ status: 404, body: '' }) === 'no', 'actedOf counts no ledger repeat and no 404');
  say(actedOf({ status: 0, body: '' }, { landed: true }) === 'yes' && actedOf({ status: 0, body: '' }, { landed: false }) === 'unknown', 'actedOf reads a cut write by what reached the agent, and says unknown when nothing tells');
  // R9's case, each way.
  say(raceCase({ phoneMarker: '4', shown: 3, outcome: 'done', reason: null, phoneBytes: [{ marker: '4', serial: 3 }] }) === 'on the question shown', 'raceCase: the phone\'s byte on the question shown');
  say(raceCase({ phoneMarker: '4', shown: 3, outcome: 'refused', reason: 'changed', phoneBytes: [{ marker: '1', serial: 3 }] }) === 'refused, none landed', 'raceCase: refused, the desk\'s byte alone at the agent');
  say(raceCase({ phoneMarker: '4', shown: 3, outcome: 'done', reason: null, phoneBytes: [{ marker: '4', serial: 4 }] }) === null, 'raceCase refuses the phone\'s byte on the NEXT question');
  say(raceCase({ phoneMarker: '4', shown: 3, outcome: 'refused', reason: 'changed', phoneBytes: [{ marker: '4', serial: 3 }] }) === null, 'raceCase refuses a refusal with the phone\'s byte at the agent');
  say(raceCase({ phoneMarker: '4', shown: 3, outcome: 'failed', reason: null, phoneBytes: [{ marker: '4', serial: 3 }] }) === 'on the question shown', 'raceCase takes a not-taken press whose byte landed on the question shown (the desk answered first)');
  // RN's normalizer.
  const rn = normalizeRn({ rows: [{ name: 'p318-rn-wait-head', label: 'p318-rn-wait-head waiting', excerpt: 'Bash ls' }], lines: ['p318-rn-wait-head: The agent is waiting for you'] }, 'head');
  say(rn.rows[0].name === 'p318-rn-wait-<build>' && rn.lines[0] === 'p318-rn-wait-<build>: The agent is waiting for you', 'normalizeRn takes the build\'s suffix out of names, labels and lines');
  {
    const a = normalizeRn({ rows: [], lines: ['p318-rn-idle-parent :: idle · now :: started 14:24, nothing asked yet'] }, 'parent');
    const b = normalizeRn({ rows: [], lines: ['p318-rn-idle-headrn :: idle · now :: started 14:32, nothing asked yet'] }, 'headrn');
    say(deepEqual(a, b) && a.lines[0].includes('started <time>'), 'normalizeRn takes the clock time out, so two builds\' sessions made minutes apart compare');
  }
  // The stand-in's Codex screen, which R11 sizes its widths from.
  const rows = codexApprovalScreen('touch p318-r11.txt');
  say(rows.some((r) => stripAnsi(r).trim() === 'Would you like to run the following command?') && rows.some((r) => /^\s*2\. Yes, and don't ask again/.test(stripAnsi(r))), 'the stand-in\'s Codex approval holds the question row and option 2 R11 sizes from');
  process.stdout.write(failures === 0 ? `[p318] grader self-test PASS: ${String(Object.keys(GRADERS).length)} graders, ${String(clauses)} clauses, each shown to go red on its own break.\n` : `[p318] grader self-test FAIL: ${String(failures)}.\n`);
  return failures === 0;
}

if (process.argv.includes('--grader-self-test')) process.exit(graderSelfTest() ? 0 : 1);

// ---------------------------------------------------------------------------
// The refusals, in the order they are asked
// ---------------------------------------------------------------------------

const TAG = '[p318]';
const t0 = Date.now();
const say = (l) => console.log(`${TAG} ${((Date.now() - t0) / 1000).toFixed(1).padStart(6)}s ${l}`);
const refuse = (why) => {
  console.error(`${TAG} REFUSED. ${why}`);
  process.exit(2);
};
const SOCKET = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
if (SOCKET === '') refuse('no GMUX_TMUX_SOCKET. Run `npm run probe:p318`, which wraps this file in build/harness-socket.mjs and build/with-scratch-machine.mjs.');
if (SOCKET === 'gmux' || SOCKET === 'default' || !SOCKET.startsWith('gmux-p318')) refuse(`"${SOCKET}" is not a gmux-p318 harness socket.`);
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

const PARENT = (process.env['P318_PARENT_CHECKOUT'] ?? '').trim();
const KEEP = (process.env['P318_KEEP'] ?? '') === '1';
/** The sources a HEAD reading is made of; out/ older than any of them is refused. */
const SOURCES = [
  'src/main/reply/writer.ts',
  'src/main/reply/reader.ts',
  'src/main/reply/press-shapes.ts',
  'src/main/reply/input-row.ts',
  'src/main/pocket/writes.ts',
  'src/main/pocket/routes.ts',
  'src/main/pocket/door/table.ts',
  'src/main/sessions/core.ts',
  'src/main/attach/attach-host.ts',
  'src/main/activity/monitor.ts'
];
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

mkdirSync(join(HARNESS_DIR, 'p318'), { recursive: true });
const RUN = realpathSync(join(HARNESS_DIR, 'p318'));
const HOME = join(RUN, 'home');
const PROFILE = join(RUN, 'profile');
const PROJECTS = join(RUN, 'projects');
const FAR = join(RUN, 'far');
const BIN = join(HOME, '.local', 'bin');
/** OUTSIDE the profile, so the helper's profile sweep never takes the stand-ins for the app's. */
const STANDIN_DIR = join(RUN, 'standin');
const APP_LOG = join(PROFILE, 'logs', 'app.log');
const MACHINES_JSON = join(PROFILE, 'gmux', 'config', 'machines.json');
const PUBLIC_NAME = DEFAULT_SCENARIO.dnsName.replace(/\.$/, '');
const FAR_ENV = { ...process.env, TMUX_TMPDIR: carriage.tmuxTmp };
const OUT = join(ROOT, 'out', 'p318');
/** Each stand-in session in its own folder: Codex's idle title is its folder's name. */
const N = {
  claudeA: 'p318-claude-a',
  claudeB: 'p318-claude-b',
  codexA: 'p318-codex-a',
  codexB: 'p318-codex-b',
  claudeC: 'p318-claude-c',
  shell: 'p318-shell',
  far: 'p318-far',
  rnWait: 'p318-rn-wait',
  rnIdle: 'p318-rn-idle'
};
/**
 * RN's two builds' suffixes, THE SAME LENGTH: a Catch Me Up option line names
 * the session's folder, and a line wraps at a point that moves with the
 * path's length, so `parent` against `head` made the lines differ by a wrap.
 */
const RN_SUFFIX = Object.freeze({ parent: 'parent', head: 'headrn' });


/** The words main says, read from the checkout's own source (never typed here twice). */
function wordsOf(checkout) {
  const src = (rel) => {
    try {
      return readFileSync(join(checkout, rel), 'utf8');
    } catch {
      return '';
    }
  };
  return {
    changed: constWord(src('src/shared/lifecycle-words.ts'), 'LIFECYCLE_SESSION_CHANGED'),
    notReady: constWord(src('src/shared/reply-copy.ts'), 'REPLY_NOT_READY'),
    honesty: constWord(src('src/shared/ipc/pocket.ts'), 'POCKET_DOOR_HONESTY')
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
function cannotRead(id, why, reading) {
  unreadable += 1;
  report.arms.push({ id, ok: null, said: why });
  if (reading !== undefined) report.readings[id] = reading;
  say(`UNREADABLE ${id}: ${why}`);
}
/** Run one arm's body; a body that throws is that arm's UNREADABLE, and the run goes on. */
async function armSafely(id, body) {
  try {
    await body();
  } catch (err) {
    cannotRead(id, `the arm stopped: ${String(err?.message ?? err)}`);
  }
}

// ---------------------------------------------------------------------------
// The guards: the stand-ins, the samplers
// ---------------------------------------------------------------------------

let standin = null;
let dns = null;
let watch = null;
let relay = null;
let psSampler = null;
let lastShim = 0;
let lastApp = 0;
let tailscalePreflight = false;
let resolvedOk = false;
const dnsPreflights = [];
const agentsHeld = [];

/**
 * The forwarder the stand-in's NEWEST live Funnel child listens on, or 0.
 * `readFunnel()` lists the live children oldest first, and for a moment after
 * the door is switched off and on (R15's last block) the child being stopped
 * is still alive beside the new one; as first written this read the OLDEST,
 * so R15b's relay dialled the stopped child's forwarder and its write never
 * reached the door (the fixer's run, 2026-10-04: cut answered 0, no cut, no act).
 */
const forwarderPort = () => standin?.readFunnel().at(-1)?.forwarderPort ?? 0;
/** Until the stand-in holds ONE live Funnel child (the door's own), bounded. */
const steadyFunnel = () => waitFor(() => ((standin?.readFunnel().length ?? 0) === 1 ? true : null), 15_000, 100);

/**
 * R15b's relay: the node phone dials it and it pipes to the CURRENT forwarder.
 * In `cut` mode it holds back the door's answer and, once `cutWhen()` says so
 * (main logged the act), destroys both sockets, so the phone sees no answer
 * for a write the Mac acted on. Closed, with every socket, in the `finally`.
 */
function makeRelay() {
  const sockets = new Set();
  let mode = 'pass';
  let cutWhen = () => false;
  /** Set by the phone's own `onWritten`: the request has left in full, so what the door sends now is its answer. */
  let holding = false;
  let heldSince = 0;
  let cuts = 0;
  const server = createNetServer((client) => {
    sockets.add(client);
    const upstream = netConnect({ host: '127.0.0.1', port: forwarderPort() });
    sockets.add(upstream);
    const held = [];
    let timer = null;
    const end = () => {
      if (timer !== null) clearInterval(timer);
      client.destroy();
      upstream.destroy();
      sockets.delete(client);
      sockets.delete(upstream);
    };
    client.on('data', (b) => upstream.write(b));
    // The handshake passes both ways (TLS 1.3 sends no application byte
    // before it completes); once the request has left, the answer is held.
    upstream.on('data', (b) => (mode === 'cut' && holding ? held.push(b) : client.write(b)));
    client.on('error', end);
    upstream.on('error', end);
    client.on('close', end);
    upstream.on('close', end);
    timer = setInterval(() => {
      if (mode !== 'cut' || !holding) return;
      // Cut once main has logged the act, or after 15 s whatever it logged.
      if (cutWhen() || Date.now() - heldSince > 15_000) {
        cuts += 1;
        end();
      }
    }, 5);
  });
  return new Promise((resolveRelay) => {
    server.listen(0, '127.0.0.1', () => {
      resolveRelay({
        port: server.address().port,
        cut(when) {
          mode = 'cut';
          cutWhen = when;
          holding = false;
        },
        hold() {
          if (!holding) heldSince = Date.now();
          holding = true;
        },
        pass() {
          mode = 'pass';
          cutWhen = () => false;
          holding = false;
        },
        cuts: () => cuts,
        close() {
          for (const s of sockets) s.destroy();
          server.close();
        }
      });
    });
  });
}

/**
 * R18's process sampler: `ps -ww -ax -o command=` every 500 ms (never cut
 * short), each sample searched for every canary sent so far. Asynchronous, so
 * it never stops the probe's own clock; stopped in the `finally`.
 */
function startPsSampler(canaries) {
  let samples = 0;
  const hits = [];
  let busy = false;
  const timer = setInterval(() => {
    if (busy) return;
    busy = true;
    execFile('/bin/ps', ['-ww', '-ax', '-o', 'command='], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 5_000 }, (err, stdout) => {
      busy = false;
      if (err !== null) return;
      samples += 1;
      for (const c of canaries) if (String(stdout).includes(c)) hits.push(c);
    });
  }, 500);
  return {
    stop: () => clearInterval(timer),
    samples: () => samples,
    hits: () => hits.length
  };
}

// ---------------------------------------------------------------------------
// The app
// ---------------------------------------------------------------------------

const INHERITED = Object.fromEntries(Object.keys(process.env).filter((n) => /^(?:CLAUDECODE|CLAUDE_|CODEX_)/.test(n) || n === 'TERM_SESSION_ID').map((n) => [n, undefined]));

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
        if ((await cdpEval(cdp, "window.gmux !== undefined && window.gmux.pocket !== undefined && typeof window.__p293 === 'object' && typeof window.__gmuxP95 === 'object' && typeof window.__gmuxP93 === 'object'")) === true) return cdp;
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
/** Main's sessions, with the facts the arms read. */
async function sessions(cdp) {
  const got = await bridge(cdp, 'window.gmux.sessions.list().then((l) => l.map((s) => ({ id: s.id, name: s.name, tmuxName: s.tmuxName, status: s.status, agent: s.agent, machine: s.machine ? { id: s.machine.id } : null })))');
  return got.ok ? got.value : [];
}
const byName = async (cdp, name) => (await sessions(cdp)).find((s) => s.name === name) ?? null;
const statusOf = async (cdp, id) => (await sessions(cdp)).find((s) => s.id === id)?.status ?? null;

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
  // The same phone through R15b's relay: one door, a second port.
  const viaRelay = { get port() { return relay?.port ?? 0; }, name: read.offer.host, publicPort: read.offer.port, pin: read.offer.fp };
  return { ok: first.status === 200, why: first.status === 200 ? '' : `the first read answered ${String(first.status)}`, phone, door, viaRelay };
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
/** The door's answer for one session, and its reply offer (absent reads the empty offer). */
const NO_REPLY = Object.freeze({ question: null, mark: null, pressable: [], command: null, canSay: false });
async function detailOf(P, id) {
  const d = (await readJson(P.phone, P.door, `/v1/session?id=${encodeURIComponent(id)}`))?.session ?? null;
  return d === null ? null : { ...d, reply: d.reply ?? NO_REPLY };
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
/** The acts main logged on one session under one verb: `the phone's <verb>:` lines carrying its id. */
const actsOn = (verb, sessionId) => (appLogText() ?? '').split('\n').filter((l) => l.includes(`the phone's ${verb}:`) && l.includes(sessionId)).length;

/** One tmux read on the run's own scratch socket. */
const tmuxOut = (...args) => {
  const r = spawnSync('tmux', ['-L', SOCKET, ...args], { encoding: 'utf8', timeout: 10_000 });
  return r.status === 0 ? String(r.stdout ?? '') : null;
};
const farOut = (...args) => {
  const r = spawnSync(FAR_TMUX, ['-L', SOCKET, '-f', '/dev/null', ...args], { encoding: 'utf8', env: FAR_ENV, timeout: 10_000 });
  return r.status === 0 ? String(r.stdout ?? '') : null;
};
const sayBuffers = (out) => String(out ?? '').split('\n').filter((l) => l.startsWith('tortie-say-')).length;

function writeMachines(withMachine, path = MACHINES_JSON) {
  if (!path.startsWith(`${RUN}/`) && !path.startsWith(`${CONFIG_ROOT}/`)) throw new Error(`the machines file ${path} is outside this run's scratch world; nothing is written there`);
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const machines = withMachine ? [{ id: MACHINE_ID, label: 'p318 loopback', host: carriage.host, user: carriage.user, port: carriage.port, remoteTmuxPath: FAR_TMUX }] : [];
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
      ...INHERITED,
      HOME,
      ZDOTDIR: HOME,
      HISTFILE: '/dev/null',
      GMUX_TMUX_SOCKET: SOCKET,
      GMUX_PROBES: '1',
      GMUX_LOG_FILE: '1',
      GMUX_SPECSTORY_NO_CLOUD: '1',
      GMUX_CONFIG_ROOT: CONFIG_ROOT,
      GMUX_HARNESS_DIR: HARNESS_DIR,
      // THE STAND-INS. A development build honours both; a packaged one ignores them.
      GMUX_TAILSCALE_BIN: standin.binPath,
      [NAME_SERVERS_VAR]: dns.servers,
      ...(typeof carriage.authSock === 'string' ? { SSH_AUTH_SOCK: carriage.authSock } : {})
    }),
    graceMs: 8_000,
    ceilingMs: 3_600_000
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
      // NO AGENT STARTS but the stand-ins: the renamed rows must read not installed.
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

// ---------------------------------------------------------------------------
// The stand-ins, through their own files
// ---------------------------------------------------------------------------

/** The stand-in a session runs now: the newest hello naming its id. */
function standinOf(sessionId) {
  const mine = hellos(STANDIN_DIR).filter((h) => h.session === sessionId);
  mine.sort((a, b) => Number(a.at) - Number(b.at));
  return mine[mine.length - 1] ?? null;
}
const seqs = new Map();
/** Whether a pid is a live process (signal 0). */
function pidAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
/** Remove the scratch HOME's Claude registry files whose process is gone; how many. */
function sweepDeadRegistry() {
  const dir = join(HOME, '.claude', 'sessions');
  let swept = 0;
  let names = [];
  try {
    names = readdirSync(dir);
  } catch {
    return 0;
  }
  for (const name of names) {
    const m = /^([0-9]+)\.json$/.exec(name);
    if (m === null || pidAlive(Number(m[1]))) continue;
    rmSync(join(dir, name), { force: true });
    swept += 1;
  }
  return swept;
}

/** Tell a session's stand-in some ops and wait until it applied them. */
async function tell(sessionId, ops) {
  const s = standinOf(sessionId);
  if (s === null) throw new Error(`no stand-in said hello for ${sessionId}`);
  const seq = (seqs.get(s.pid) ?? 0) + 1;
  seqs.set(s.pid, seq);
  sendOps(STANDIN_DIR, s.pid, seq, ops);
  const ok = await waitFor(() => Number(readState(STANDIN_DIR, s.pid)?.seq ?? 0) >= seq, 5_000, 25);
  if (ok === null) throw new Error(`the stand-in ${String(s.pid)} never applied seq ${String(seq)}`);
  return s;
}
const stateOf = (sessionId) => {
  const s = standinOf(sessionId);
  return s === null ? null : readState(STANDIN_DIR, s.pid);
};
/** A stand-in's log lines from `from` (a hrtime stamp of this process, the same clock). */
function logFrom(sessionId, from) {
  const s = standinOf(sessionId);
  return s === null ? [] : readLog(STANDIN_DIR, s.pid).filter((l) => l.t >= BigInt(from));
}
const bytesFrom = (sessionId, from) => logFrom(sessionId, from).filter((l) => l.kind === 'read').map((l) => String(l.hex)).join('');
const commitsFrom = (sessionId, from) => logFrom(sessionId, from).filter((l) => l.kind === 'commit').map((l) => ({ marker: String(l.marker), serial: Number(l.serial) }));
const submitsFrom = (sessionId, from) => logFrom(sessionId, from).filter((l) => l.kind === 'submitted').map((l) => String(l.hex));
/** Every digit the stand-in READ from `from`, committed or dropped or late, with the screen it was read under. */
function digitsFrom(sessionId, from) {
  const out = [];
  for (const l of logFrom(sessionId, from)) {
    if (l.kind === 'commit' || l.kind === 'dropped' || l.kind === 'late-digit' || l.kind === 'not-a-marker') out.push({ marker: String(l.marker), serial: Number(l.serial), kind: l.kind });
  }
  return out;
}

/** An agent session made the way a person makes one, and its stand-in's hello. */
async function agentSession(main, name, agent, project) {
  mkdirSync(project, { recursive: true });
  writeFileSync(join(project, 'README.md'), `# ${name}\n`);
  await bridge(main, `window.__p293.addProject(${J(project)})`);
  const made = await bridge(main, `window.gmux.sessions.create(${J({ name, projectPath: project, cwd: project, agent })}).then((s) => s.id)`);
  if (!made.ok || typeof made.value !== 'string') throw new Error(`${name} was not created: ${J(made)}`);
  const id = made.value;
  projectOf.set(id, project);
  const hello = await waitFor(() => standinOf(id), 60_000, 250);
  if (hello === null) throw new Error(`${name}'s stand-in never said hello, so Tortie launched something else as ${agent}`);
  await tell(id, [{ op: 'afterSubmit', then: { op: 'work', ms: 400 } }]);
  return id;
}
/** A shell, made through the session manager's drive, local or on the machine. */
async function shell(cdp, path, name, machineId) {
  const got = await bridge(cdp, `window.__p293.createSession(${J(machineId === undefined ? { path, name } : { path, name, machineId })})`);
  if (!got.ok || typeof got.value !== 'string') throw new Error(`${name} was not created: ${J(got)}`);
  return got.value;
}

/** Draw a press screen and wait until the door offers it (SPEC §5.4.5: one tick to bind, bounded). */
async function pressReady(main, P, id, command, extra = {}, { wantPressable = true } = {}) {
  const before = Number(stateOf(id)?.serial ?? 0);
  await tell(id, [{ op: 'press', command, ...extra }]);
  const drew = await waitFor(() => {
    const s = stateOf(id);
    return s !== null && s.mode === 'press' && Number(s.serial) > before ? s : null;
  }, 5_000, 25);
  if (drew === null) throw new Error(`the stand-in for ${id} never drew its press screen`);
  const waiting = await waitFor(async () => ((await statusOf(main, id)) === 'needs_input' ? true : null), 20_000, 250);
  const detail = await waitFor(async () => {
    const d = await detailOf(P, id);
    return d !== null && (!wantPressable || d.reply.pressable.length > 0) ? d : null;
  }, 12_000, 300);
  return { shown: Number(drew.serial), waiting: waiting === true, detail, reply: detail?.reply ?? NO_REPLY };
}
/**
 * The stand-in back at its empty prompt, and main reading it idle. A question
 * still on the screen, or a status still at `needs_input`, is left the way an
 * agent leaves it, by WORKING (busy in Claude Code's registry, a braille title
 * for Codex) and then going idle; never by withdrawing the question straight
 * to the prompt, which the monitor answers by keeping `needs_input` for good
 * (`commitVerdict` refuses `needs_input` to `idle`; the run lens measured 3 of
 * 3 stuck at both builds). The fix round of 2026-10-04.
 */
async function recover(main, id) {
  if ((await statusOf(main, id)) === 'needs_input' || stateOf(id)?.mode !== 'idle') {
    await tell(id, [{ op: 'work', ms: 1_500 }]);
    await waitFor(async () => ((await statusOf(main, id)) !== 'needs_input' ? true : null), 20_000, 250);
    await waitFor(() => (stateOf(id)?.mode === 'idle' ? true : null), 10_000, 100);
  }
  await waitFor(async () => ((await statusOf(main, id)) === 'idle' ? true : null), 15_000, 250);
}
/** Wait until the door offers the message box on `id` (or `false`: until it does not). */
const canSayBecomes = (P, id, want, ms = 15_000) => waitFor(async () => ((await detailOf(P, id))?.reply.canSay === want ? true : null), ms, 300);

/** Each session's project folder, so `front()` can bring its project forward. */
const projectOf = new Map();
/** The session active in its project (`select` alone moves nothing in another project's tab). */
const select = (main, id) => bridge(main, `window.__gmuxP95.select(${J(id)})`);
/**
 * The session IN FRONT at the Mac, its terminal mounted, so its attach client
 * is the one a keystroke, a report or a resize goes through: its project
 * forward (`openLocal` activates a project already open), then the session.
 * Answers whether the drive reads it active with a terminal drawn.
 */
async function front(main, id) {
  const path = projectOf.get(id);
  if (path !== undefined) await bridge(main, `window.__gmuxP95.openLocal(${J(path)})`);
  const st = await select(main, id);
  return st.ok === true && st.value?.activeSessionId === id && st.value?.terminal === true;
}
/** Whether the drive reads `id` in front, with its terminal drawn. */
async function inFront(main, id) {
  const st = await bridge(main, 'window.__gmuxP95.state()');
  return st.ok === true && st.value?.activeSessionId === id && st.value?.terminal === true;
}
/**
 * A desk KEYSTROKE, as TerminalPane's `onData` sends one: the desk's own
 * funnel (`noteTerminalInput`), then the bytes down the Mac's own terminal
 * channel, so it passes the attach host's input listener. The session must be
 * in front (`front()`), which this does not do, so a race arm's timing holds.
 */
const desk = (main, id, text) => cdpEval(main, `(window.gmux.noteTerminalInput(${J(id)}), window.gmux.term.sendInput(${J(id)}, ${J(text)}), true)`);
/** A PANE REPORT, as `sendReport` sends one: the bytes alone, no funnel. */
const report_ = (main, id, text) => cdpEval(main, `(window.gmux.term.sendInput(${J(id)}, ${J(text)}), true)`);

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

/** Every write this run sent: its id, for R18's count. */
let acted = 0;
let actedUnknown = 0;
/** A canary in every message that can carry one, for R18's scan. */
const canaries = new Set();
const canary = () => {
  const c = `p318c${randomBytes(6).toString('hex')}`;
  canaries.add(c);
  return c;
};
function noteWrite(reply, { repeat = false, landed = null } = {}) {
  const a = actedOf(reply, { repeat, landed });
  if (a === 'yes') acted += 1;
  else if (a === 'unknown') actedUnknown += 1;
}
const nonce = () => randomUUID().replace(/-/g, '');
/** A press from a phone: its reading, the request's written stamp (R19), and what the stand-in read. */
async function press(P, id, reply, marker, { door = P.door, repeat = false, write, question, mark } = {}) {
  let writtenAt = null;
  const from = hr();
  const w = write ?? freshWriteId();
  const r = await chooseOption(P.phone, door, id, {
    question: question ?? reply.question ?? '0123456789abcdef-1',
    mark: mark ?? reply.mark ?? 'a1b2c3d4e5f6',
    marker,
    write: w,
    nonce: nonce(),
    onWritten: () => {
      writtenAt ??= hr();
    }
  });
  await sleep(150);
  const digits = digitsFrom(id, from);
  noteWrite(r, { repeat, landed: r.status === 0 ? digits.some((d) => d.kind === 'commit') : null });
  return { ...writeReading(r, w), write: w, from, writtenAt, digits, bytes: bytesFrom(id, from) };
}
/** A message from a phone. */
async function message(P, id, text, { door = P.door, repeat = false, write } = {}) {
  let writtenAt = null;
  const from = hr();
  const w = write ?? freshWriteId();
  const r = await sayText(P.phone, door, id, text, {
    write: w,
    nonce: nonce(),
    onWritten: () => {
      writtenAt ??= hr();
    }
  });
  await sleep(250);
  const submits = submitsFrom(id, from);
  noteWrite(r, { repeat, landed: r.status === 0 ? submits.length > 0 : null });
  return { ...writeReading(r, w), write: w, from, writtenAt, bytes: bytesFrom(id, from), submits };
}
/** The first byte a stand-in read after a request was written, in ms (R19). */
function requestToLand(sessionId, writtenAt) {
  if (writtenAt === null) return null;
  const first = logFrom(sessionId, writtenAt).find((l) => l.kind === 'read');
  return first === undefined ? null : msBetween(writtenAt, first.t);
}

/** ⌘J's rows and Catch Me Up's lines, for the sessions whose names end in `suffix`. */
async function readRn(main, id, suffix) {
  await select(main, id);
  await cdpEval(main, 'window.__gmuxP93.openPanel()');
  await sleep(700);
  const rows = JSON.parse(await cdpEval(main, `JSON.stringify([...document.querySelectorAll('.attention-row')].map((row) => ({ name: row.querySelector('.attention-session')?.textContent ?? '', label: (row.getAttribute('aria-label') ?? '').trim(), excerpt: row.querySelector('.attention-excerpt')?.textContent ?? '' })))`));
  await cdpEval(main, 'window.__gmuxP93.closePanel()');
  await sleep(300);
  await cdpEval(main, "window.__gmuxShotDrive({ overview: { level: 'project' } })");
  await sleep(1_400);
  const lines = JSON.parse(await cdpEval(main, `JSON.stringify([...document.querySelectorAll('.overview-line')].map((el) => [el.querySelector('.overview-line-name-text')?.textContent ?? '', el.querySelector('.overview-line-state')?.textContent ?? '', el.querySelector('.overview-line-outcome')?.textContent ?? '', el.querySelector('.overview-line-question')?.textContent ?? '', [...el.querySelectorAll('.overview-line-option-text')].map((o) => o.textContent ?? '').join(' | ')].join(' :: ')))`));
  await cdpEval(main, "window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); 1");
  await sleep(400);
  return normalizeRn({ rows: rows.filter((r) => r.name.endsWith(suffix)), lines: lines.filter((l) => l.split(' :: ')[0].endsWith(suffix)) }, suffix);
}
/** The door's answer time for one session, 20 reads, p50 (RN). */
async function sessionReadP50(P, id) {
  const times = [];
  for (let i = 0; i < 20; i += 1) {
    const s = hr();
    await detailOf(P, id);
    times.push(msBetween(s, hr()));
  }
  return quantile(times, 0.5);
}
/** RN's sessions at one build, waiting and idle, read. */
async function rnAt(main, P, suffix) {
  const project = join(PROJECTS, `rn-${suffix}`);
  const wait = await agentSession(main, `${N.rnWait}-${suffix}`, 'claude', project);
  await agentSession(main, `${N.rnIdle}-${suffix}`, 'codex', project);
  await pressReady(main, P, wait, 'ls', {}, { wantPressable: false });
  await sleep(2_500);
  const reading = await readRn(main, wait, suffix);
  return { reading, p50: await sessionReadP50(P, wait) };
}

const HEAD_READINGS = {};
const rnParent = { reading: null, p50: null };
const r19 = { presses: [], messages: [] };

try {
  rmSync(RUN, { recursive: true, force: true });
  for (const dir of [HOME, PROFILE, PROJECTS, FAR, BIN, STANDIN_DIR]) mkdirSync(dir, { recursive: true });
  writeFileSync(join(FAR, 'README.md'), '# Phase 318, the far folder\n');
  writeWrappers({ dir: RUN, bin: BIN, standinDir: STANDIN_DIR });
  // tmux's execvp reads the LOGIN shell's PATH, so the scratch bin goes on it.
  writeFileSync(join(HOME, '.zprofile'), `export PATH="${BIN}:$PATH"\n`, 'utf8');
  writeFileSync(join(HOME, '.zshrc'), `export PATH="${BIN}:$PATH"\nexport HISTFILE=/dev/null\nPS1='p318 %# '\n`, 'utf8');
  writeFileSync(join(HOME, '.hushlogin'), '');
  writeMachines(true);
  {
    const known = join(PROFILE, 'gmux', 'machines', 'known-machines');
    mkdirSync(dirname(known), { recursive: true });
    writeFileSync(known, keyscanText({ host: carriage.host, port: carriage.port, caller: 'build/p318/probe-p318.mjs' }), 'utf8');
  }
  // THE PRECONDITION: both bare names are the stand-in, asked of the login
  // shell the app will ask, with the environment the app will be given.
  {
    const shellEnv = { ...process.env, HOME, ZDOTDIR: HOME, HISTFILE: '/dev/null' };
    for (const name of Object.keys(INHERITED)) delete shellEnv[name];
    const loginShell = (process.env['SHELL'] ?? '').trim() || '/bin/zsh';
    const resolved = {};
    for (const bare of ['claude', 'codex']) {
      const r = spawnSync(loginShell, ['-lic', `command -v ${bare}`], { encoding: 'utf8', timeout: 30_000, env: shellEnv });
      resolved[bare] = (String(r.stdout ?? '').trim().split('\n').pop() ?? '') === join(BIN, bare);
    }
    report.readings.resolvesToStandIn = resolved;
    resolvedOk = Object.values(resolved).every(Boolean);
    if (!resolvedOk) {
      unreadable += 1;
      throw new Error(`the scratch login shell resolves ${J(resolved)}: a bare name is not the stand-in, so nothing is launched`);
    }
  }
  standin = makeStandin({ dir: join(RUN, 'tailscale'), scenario: { ...DEFAULT_SCENARIO } });
  const pre = preflightStandin(standin, standin.binPath);
  tailscalePreflight = pre.ok;
  if (!pre.ok) throw new Error(`the Tailscale preflight refused: ${pre.problems.join('; ')}`);
  dns = await makeDnsStandin({ name: PUBLIC_NAME, mode: 'record' });
  watch = watchForRealTailscale({ roots: () => [lastShim, lastApp].filter((p) => p > 0), everyMs: 1_000 });
  relay = await makeRelay();
  say(`measuring ${ROOT}${PARENT === '' ? '' : ` after the parent ${PARENT}`}; socket ${SOCKET}; the loopback machine on ${String(carriage.host)}:${String(carriage.port)}`);

  // ======================================================================
  // RP and RN's parent half — the parent, FIRST, on the same profile
  // ======================================================================
  if (PARENT !== '') {
    await launch('p318-parent', resolve(PARENT), async (main) => {
      await pocket(main, 'setDoor', { on: true });
      const door = await confirmDoor(main);
      if (!door.ok) return cannotRead('RP', `the parent's door never listened: ${door.why}`);
      const P = await pairPhone(main, 'p318 parent phone');
      if (!P.ok) return cannotRead('RP', `no phone paired with the parent: ${P.why}`);
      const rn = await rnAt(main, P, RN_SUFFIX.parent);
      rnParent.reading = rn.reading;
      rnParent.p50 = rn.p50;
      const wait = (await byName(main, `${N.rnWait}-${RN_SUFFIX.parent}`))?.id ?? null;
      const idle = (await byName(main, `${N.rnIdle}-${RN_SUFFIX.parent}`))?.id ?? null;
      const before = writeLines();
      const from = hr();
      const c = await chooseOption(P.phone, P.door, wait, { question: '0123456789abcdef-1', mark: 'a1b2c3d4e5f6', marker: '1', nonce: nonce() });
      const s = await sayText(P.phone, P.door, idle, `parent ${canary()}`, { nonce: nonce() });
      await sleep(1_000);
      const st = await status(main);
      arm('RP', { choose: c.status, say: s.status, writeLines: writeLines() - before, bytes: bytesFrom(wait, from) + bytesFrom(idle, from), lines: st?.confirmLines ?? [] });
    });
    // THE PARENT'S CLAUDE STAND-INS' REGISTRY FILES, once their process is gone
    // (the fixer, 2026-10-04). The helper ends the scratch tmux server with the
    // launch, so the HEAD launch's panes are numbered from %1 again, and a
    // stand-in ended hard leaves `<pid>.json` saying `waiting` for a pane id a
    // HEAD session is then given: Tortie's Claude registry reader keys by pane
    // id and asks no pid, so that HEAD session read needs input with its
    // stand-in idle, and every message arm on it was refused `unsayable` (the
    // kept run: the parent's 50322 and HEAD's claude-a both on %1). Claude Code
    // deletes its own file on exit, which is what this does for a process that
    // can no longer; it is a pre-existing reading, the parent's too, and is
    // reported, not graded.
    report.readings.registrySweptAfterParent = sweepDeadRegistry();
    say(`swept ${String(report.readings.registrySweptAfterParent)} registry file(s) the parent's ended Claude stand-ins left behind`);
  }

  // ======================================================================
  // HEAD — R0 to R17, R19 and RN's head half, one launch
  // ======================================================================
  await launch('p318-head', ROOT, async (main) => {
    const ids = {};
    // ---- the sessions ------------------------------------------------------
    ids.claudeA = await agentSession(main, N.claudeA, 'claude', join(PROJECTS, 'claude-a'));
    ids.claudeB = await agentSession(main, N.claudeB, 'claude', join(PROJECTS, 'claude-b'));
    ids.codexA = await agentSession(main, N.codexA, 'codex', join(PROJECTS, 'codex-a'));
    ids.codexB = await agentSession(main, N.codexB, 'codex', join(PROJECTS, 'codex-b'));
    ids.claudeC = await agentSession(main, N.claudeC, 'claude', join(PROJECTS, 'claude-c'));
    mkdirSync(join(PROJECTS, 'shell'), { recursive: true });
    await bridge(main, `window.__p293.addProject(${J(join(PROJECTS, 'shell'))})`);
    ids.shell = await shell(main, join(PROJECTS, 'shell'), N.shell);
    projectOf.set(ids.shell, join(PROJECTS, 'shell'));
    const up = await bridge(main, `window.__gmuxP95.machineUp(${J(MACHINE_ID)})`);
    if (!(up.ok && (up.value?.rows ?? []).some((row) => row.id === MACHINE_ID && row.usable))) throw new Error(`the loopback machine is not usable: ${J(up).slice(0, 400)}`);
    for (let attempt = 1; attempt <= 6; attempt += 1) {
      const opened = await bridge(main, `window.__gmuxP95.openRemote(${J(MACHINE_ID)}, ${J(FAR)})`);
      if (opened.ok && opened.value?.result?.ok === true) break;
      await sleep(3_000);
    }
    ids.far = await shell(main, FAR, N.far, MACHINE_ID);
    const live = await waitFor(async () => {
      const list = await sessions(main);
      return Object.values(ids).every((id) => list.some((s) => s.id === id && LIVE.includes(s.status))) ? list : null;
    }, 90_000);
    if (live === null) throw new Error('the sessions never all read live');
    say(`sessions made: ${J(ids)}`);

    // ---- R0: the door asks again ------------------------------------------
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
      arm('R0', { lines: door.lines, honesty: WORDS_HEAD.honesty, confirmBlock, parentRanFirst: PARENT !== '', confirmStateBefore: door.before, listening: door.ok && st?.state === 'listening' });
      if (!door.ok) throw new Error(`the door never listened: ${door.why}`);
    } finally {
      settings?.close();
    }

    // ---- the phones ---------------------------------------------------------
    const A = await pairPhone(main, 'p318 phone A');
    if (!A.ok) throw new Error(`phone A did not pair: ${A.why}`);
    const B = await pairPhone(main, 'p318 phone B');
    if (!B.ok) throw new Error(`phone B did not pair: ${B.why}`);

    // ---- R1: Claude Code, 1 ----------------------------------------------------
    await armSafely('R1', async () => {
      const p = await pressReady(main, A, ids.claudeA, 'ls');
      if (p.reply.pressable.length === 0) return cannotRead('R1', `the door never offered the press (${J(p.reply)}, waiting ${String(p.waiting)})`);
      // Not through press(): the blocked read is started the moment the answer lands.
      const from = hr();
      const write = freshWriteId();
      let writtenAt = null;
      const reply = await chooseOption(A.phone, A.door, ids.claudeA, { question: p.reply.question, mark: p.reply.mark, marker: '1', write, nonce: nonce(), onWritten: () => { writtenAt ??= hr(); } });
      const answeredAt = hr();
      const blockedRead = signedGet(A.phone, A.door, '/v1/blocked');
      const lag = msBetween(answeredAt, hr());
      const blockedReply = await blockedRead;
      let blocked = null;
      try {
        blocked = blockedReply.status === 200 ? JSON.parse(blockedReply.body) : null;
      } catch {
        blocked = null;
      }
      await sleep(200);
      noteWrite(reply);
      const r = writeReading(reply, write);
      r19.presses.push(requestToLand(ids.claudeA, writtenAt));
      const commits = commitsFrom(ids.claudeA, from);
      arm('R1', { answer: r, bytes: bytesFrom(ids.claudeA, from), commits, shown: p.shown, enters: logFrom(ids.claudeA, from).filter((l) => l.kind === 'enter').length, blockedLagMs: lag, blockedStatus: blockedReply.status, stillListed: blocked === null ? null : (blocked.rows ?? []).some((x) => x.sessionId === ids.claudeA) });
      await recover(main, ids.claudeA);
    });

    // ---- R2: Codex, 3 (No) ---------------------------------------------------
    await armSafely('R2', async () => {
      const command = 'touch p318-r2.txt';
      const p = await pressReady(main, A, ids.codexA, command);
      if (p.reply.pressable.length === 0) return cannotRead('R2', `the door never offered the approval (${J(p.reply)})`);
      const r = await press(A, ids.codexA, p.reply, '3');
      r19.presses.push(requestToLand(ids.codexA, r.writtenAt));
      arm('R2', { command: p.reply.command, drawnCommand: command, answer: r, bytes: r.bytes, commits: r.digits.filter((d) => d.kind === 'commit').map((d) => ({ marker: d.marker, serial: d.serial })), shown: p.shown });
      await recover(main, ids.codexA);
    });

    // ---- R3: his ruling 2 ------------------------------------------------------
    await armSafely('R3', async () => {
      const out = {};
      for (const [key, id] of [['claude', ids.claudeA], ['codex', ids.codexA]]) {
        const p = await pressReady(main, A, id, `touch p318-r3-${key}.txt`);
        const r = p.reply.pressable.includes('2') ? await press(A, id, p.reply, '2') : { status: -1, bytes: '' };
        if (r.writtenAt !== undefined) r19.presses.push(requestToLand(id, r.writtenAt));
        out[key] = { pressable: [...p.reply.pressable], answer: r, bytes: r.bytes };
        await recover(main, id);
      }
      arm('R3', out);
    });

    // ---- R4: a command not said whole ----------------------------------------
    await armSafely('R4', async () => {
      const out = { words: WORDS_HEAD };
      const longCommand = `printf %s ${'x'.repeat(250 - 'printf %s '.length)}`;
      // A token's shape, built here and never committed: the redactor names it, so the question is not said whole.
      const token = ['gh', 'p_', 'A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8'].join('');
      for (const [key, command] of [['long', longCommand], ['token', `curl -H "Authorization: token ${token}" https://example.invalid`]]) {
        const p = await pressReady(main, A, ids.claudeA, command);
        const forced = await press(A, ids.claudeA, p.reply, '1');
        // Claude Code 2.1.287's No is option 4 (build/fixtures/reply/claude-bash-2.1.287.txt).
        out[key] = { pressable: [...p.reply.pressable], deny: '4', forced, bytes: forced.bytes };
        await recover(main, ids.claudeA);
      }
      arm('R4', out);
    });

    // ---- R20: an answered press lets the Mac's needs-input go (the fix round) ----
    await armSafely('R20', async () => {
      const trials = [];
      // Claude Code 2.1.287's No is 4 and Codex 0.160.0's is 3: after a No both
      // real agents go from the question straight to idle with no hook, which is
      // the case the writer's release skipped whenever a tick landed inside the
      // read-back (the run lens, 11 of 60).
      for (const [agent, id, no] of [['claude', ids.claudeA, '4'], ['codex', ids.codexA, '3']]) {
        for (let i = 0; i < R20_TRIALS; i += 1) {
          await recover(main, id);
          const p = await pressReady(main, A, id, `touch p318-r20-${agent}-${String(i)}.txt`);
          if (!p.reply.pressable.includes(no)) {
            trials.push({ agent, i, staged: false, why: J(p.reply) });
            continue;
          }
          // Anywhere in the monitor's tick, as a person's tap lands.
          await sleep(Math.floor(Math.random() * 2_000));
          const r = await press(A, id, p.reply, no);
          const samples = [];
          for (let k = 0; k < 24; k += 1) {
            await sleep(250);
            samples.push(await statusOf(main, id));
          }
          const mode = stateOf(id)?.mode ?? null;
          const stuck = samples.slice(-8).every((x) => x === 'needs_input') && mode === 'idle';
          trials.push({ agent, i, staged: true, outcome: r.outcome, reason: r.reason, landed: r.digits.filter((d) => d.kind === 'commit').length, mode, stuck, samples });
        }
      }
      say(`R20: ${J(trials.map((t) => `${t.agent}${String(t.i)} ${String(t.outcome)}${t.stuck ? ' STUCK' : ''}`))}`);
      arm('R20', { trials });
    });

    // The process sampler runs from R5 to R16 (R18).
    psSampler = startPsSampler(canaries);

    // ---- R5: one message at each empty prompt ---------------------------------
    await armSafely('R5', async () => {
      const messages = [];
      for (const id of [ids.claudeA, ids.codexA]) {
        await recover(main, id);
        await canSayBecomes(A, id, true);
        const text = `hello phone ${canary()}`;
        const m = await message(A, id, text);
        r19.messages.push(requestToLand(id, m.writtenAt));
        messages.push({ text, answer: m, bytes: m.bytes, submits: m.submits });
        await recover(main, id);
      }
      arm('R5', { messages });
    });

    // ---- R6: no message while the agent works ----------------------------------
    await armSafely('R6', async () => {
      const agents = [];
      for (const id of [ids.claudeA, ids.codexA]) {
        await tell(id, [{ op: 'work', ms: 9_000 }]);
        const working = await waitFor(async () => ((await statusOf(main, id)) === 'running' ? true : null), 8_000, 250);
        const d = await detailOf(A, id);
        const forced = await message(A, id, `mid-turn ${canary()}`);
        const canSayIdle = await canSayBecomes(A, id, true, 20_000);
        agents.push({ working: working === true, canSayWorking: d?.reply.canSay ?? null, forced, bytes: forced.bytes, canSayIdle: canSayIdle === true });
      }
      arm('R6', { words: WORDS_HEAD, agents });
    });

    // ---- R7: a waiting row, and a gate ------------------------------------------
    await armSafely('R7', async () => {
      const p = await pressReady(main, A, ids.claudeA, 'ls -la', {}, { wantPressable: false });
      const forced = await message(A, ids.claudeA, `on a question ${canary()}`);
      const waiting = { status: await statusOf(main, ids.claudeA), canSay: p.reply.canSay, forced, bytes: forced.bytes };
      await recover(main, ids.claudeA);
      // The gate fires no hook, so no Bash ask names this wait: no shape reads it.
      await tell(ids.claudeA, [{ op: 'screen', fixture: 'claude-trust-2-1-280.txt', waiting: true }]);
      const gateWaiting = await waitFor(async () => ((await statusOf(main, ids.claudeA)) === 'needs_input' ? true : null), 15_000, 250);
      await sleep(2_500);
      const g = await detailOf(A, ids.claudeA);
      arm('R7', { words: WORDS_HEAD, waiting, gate: { waiting: gateWaiting === true, pressable: [...(g?.reply.pressable ?? ['?'])], canSay: g?.reply.canSay ?? null } });
      await recover(main, ids.claudeA);
    });

    // ---- R8: the remote shell ---------------------------------------------------
    await armSafely('R8', async () => {
      const far = (await sessions(main)).find((s) => s.id === ids.far);
      const before = far === undefined ? null : farOut('capture-pane', '-p', '-t', `=${far.tmuxName}:`);
      const d = await detailOf(A, ids.far);
      const p = await press(A, ids.far, NO_REPLY, '1');
      const m = await message(A, ids.far, `to the far shell ${canary()}`);
      await sleep(500);
      const after = far === undefined ? null : farOut('capture-pane', '-p', '-t', `=${far.tmuxName}:`);
      arm('R8', { offer: d?.reply ?? null, press: p, say: m, farSame: before !== null && before === after, farBuffers: sayBuffers(farOut('list-buffers', '-F', '#{buffer_name}')) });
    });

    // ---- R9: the race --------------------------------------------------------------
    await armSafely('R9', async () => {
      const trials = [];
      for (const [agent, id, last] of [['claude', ids.claudeB, '4'], ['codex', ids.codexB, '3']]) {
        await recover(main, id);
        await front(main, id);
        for (const ms of RACE_MS) {
          await recover(main, id);
          if (!(await inFront(main, id))) await front(main, id);
          const p = await pressReady(main, A, id, `touch p318-r9-${agent}-${String(ms)}.txt`, { onCommit: { op: 'press', command: `touch p318-r9-${agent}-${String(ms)}-next.txt` } });
          if (!p.reply.pressable.includes(last)) {
            trials.push({ agent, ms, staged: false, why: J(p.reply) });
            continue;
          }
          const from = hr();
          const deskSent = desk(main, id, '1');
          if (ms > 0) await sleep(ms);
          const r = await press(A, id, p.reply, last);
          await deskSent;
          await sleep(400);
          const all = digitsFrom(id, from);
          trials.push({ agent, ms, staged: true, phoneMarker: last, shown: p.shown, outcome: r.outcome, reason: r.reason, phoneBytes: all.filter((d) => d.marker === last), deskBytes: all.filter((d) => d.marker === '1') });
          // The NEXT question the desk's 1 drew is answered at the Mac with its No, as a person would.
          if ((await statusOf(main, id)) === 'needs_input' || stateOf(id)?.mode === 'press') {
            await desk(main, id, last);
            await sleep(400);
          }
        }
      }
      for (const t of trials) if (t.staged) say(`R9 ${t.agent} desk ${String(t.ms)} ms before: phone ${String(t.outcome)}${t.reason ? ` ${t.reason}` : ''}, ${String(raceCase(t))}; desk bytes ${J(t.deskBytes)}`);
      arm('R9', { trials });
    });

    // ---- R10: two identical questions in a row -----------------------------------
    await armSafely('R10', async () => {
      const agents = [];
      for (const [id, marker] of [[ids.claudeA, '1'], [ids.codexA, '1']]) {
        const command = 'touch p318-r10.txt';
        const p = await pressReady(main, A, id, command, { onCommit: { op: 'press', command } });
        const first = await press(A, id, p.reply, marker);
        await sleep(2_500);
        const second = await press(A, id, p.reply, marker);
        agents.push({ marker, shown: p.shown, firstCommits: first.digits.filter((d) => d.kind === 'commit').map((d) => ({ marker: d.marker, serial: d.serial })), first, second, secondBytes: second.bytes });
        await recover(main, id);
      }
      arm('R10', { words: { ...WORDS_HEAD, notTaken: constWord(readFileSync(join(ROOT, 'src', 'shared', 'reply-copy.ts'), 'utf8'), 'REPLY_NOT_TAKEN') }, agents });
    });

    // ---- R11: a resize between the read and the press -----------------------------
    await armSafely('R11', async () => {
      const paneOf = (id) => standinOf(id)?.pane ?? '';
      const colsOf = (id) => Number(String(tmuxOut('display-message', '-p', '-t', paneOf(id), '#{pane_width}') ?? '').trim());
      const setCols = async (id, want) => {
        let width = Number(await cdpEval(main, 'window.innerWidth'));
        for (let i = 0; i < 8; i += 1) {
          const now = colsOf(id);
          if (now === want || (now > 0 && Math.abs(now - want) <= 1)) return now;
          width = Math.max(400, Math.round(width * (want / Math.max(1, now))));
          await main.call('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false });
          await sleep(900);
        }
        return colsOf(id);
      };
      // The fix round: the window alone stops narrowing the terminal at about 79
      // columns (the app's own minimum widths), wider than option 2, so the pane
      // is narrowed the rest of the way the way a person does it, with the
      // terminal's own zoom (⌘+ on its focused textarea: a bigger font, fewer
      // columns, the pane re-fitted and told to tmux), and put back with ⌘0.
      const zoomKey = (code, key) => cdpEval(main, `(() => { const t = document.querySelector('.xterm-helper-textarea') ?? document.body; if (typeof t.focus === 'function') t.focus(); t.dispatchEvent(new KeyboardEvent('keydown', { code: ${J(code)}, key: ${J(key)}, metaKey: true, bubbles: true, cancelable: true })); return true; })()`);
      let zoomed = 0;
      const narrowTo = async (id, lo, hi) => {
        let cols = await setCols(id, lo);
        for (let i = 0; i < 8 && cols > hi; i += 1) {
          await zoomKey('Equal', '=');
          zoomed += 1;
          await sleep(900);
          cols = colsOf(id);
        }
        for (let i = 0; i < 4 && cols > 0 && cols < lo; i += 1) {
          await zoomKey('Minus', '-');
          await sleep(900);
          cols = colsOf(id);
        }
        return cols;
      };
      const unzoom = async () => {
        if (zoomed > 0) await zoomKey('Digit0', '0');
        zoomed = 0;
        await sleep(900);
      };
      // The widths, from the stand-in's own Codex screen: one that cuts option 2
      // and keeps the question row whole, and one wider than every row.
      const rows = codexApprovalScreen('touch p318-r11.txt').map((r) => stripAnsi(r));
      const question = rows.find((r) => r.trim() === 'Would you like to run the following command?') ?? '';
      const option2 = rows.find((r) => /^\s*2\. Yes, and don't ask again/.test(r)) ?? '';
      const cut = Math.max(question.length, 30) + 3;
      const wide = Math.max(...rows.map((r) => r.length)) + 6;
      if (!(cut < option2.length)) return cannotRead('R11', `no width cuts option 2 (${String(option2.length)} cells) and keeps the question row (${String(question.length)})`);
      const moved = [];
      const still = [];
      const reoffer = { codex: null, claude: null };
      for (const [agent, id] of [['codex', ids.codexB], ['claude', ids.claudeB]]) {
        await recover(main, id);
        await front(main, id);
        const startCols = await setCols(id, wide);
        const p = await pressReady(main, A, id, 'touch p318-r11.txt');
        const narrowCols = await narrowTo(id, cut, option2.length - 1);
        await sleep(2_500);
        const d = await detailOf(A, id);
        const markMoved = d !== null && d.reply.mark !== p.reply.mark;
        const r = await press(A, id, p.reply, '1');
        moved.push({ agent, widths: [startCols, narrowCols], markMoved, press: r, bytes: r.bytes });
        // The next read: Codex offered again at its new mark, Claude Code unpressable (§13 item 8 b).
        const again = await detailOf(A, id);
        reoffer[agent] = (again?.reply.pressable.length ?? 0) > 0;
        await recover(main, id);
        await unzoom();
        await main.call('Emulation.clearDeviceMetricsOverride');
        await sleep(900);
      }
      // A resize that moves nothing: both widths wider than every row of Codex's approval.
      {
        await recover(main, ids.codexB);
        await front(main, ids.codexB);
        const a = await setCols(ids.codexB, wide);
        const p = await pressReady(main, A, ids.codexB, 'touch p318-r11-still.txt');
        const b = await setCols(ids.codexB, wide + 8);
        await sleep(2_500);
        const d = await detailOf(A, ids.codexB);
        const r = await press(A, ids.codexB, p.reply, '1');
        still.push({ agent: 'codex', widths: [a, b], markMoved: d !== null && d.reply.mark !== p.reply.mark, press: r });
        await recover(main, ids.codexB);
        await main.call('Emulation.clearDeviceMetricsOverride');
      }
      say(`R11 widths: cut option 2 at ${String(cut)} columns (it is ${String(option2.length)}), wide ${String(wide)}; ${J(moved.map((m) => ({ agent: m.agent, widths: m.widths, moved: m.markMoved })))}; still ${J(still.map((s) => s.widths))}`);
      if (moved.some((m) => !(m.widths[1] < option2.length && m.widths[1] > question.length))) return cannotRead('R11', `the pane never narrowed to between ${String(question.length + 1)} and ${String(option2.length - 1)} columns, which cuts option 2 and keeps the question row (${J(moved.map((m) => m.widths))})`, { moved, still, reoffer });
      arm('R11', { moved, reoffer, still });
    });

    // ---- R12: a numbered dialog a non-agent program draws -----------------------------
    await armSafely('R12', async () => {
      await tell(ids.claudeC, [{ op: 'handoff', fixture: 'non-agent-proceed-reconstructed.txt', hookFirst: 'ls' }]);
      const waiting = await waitFor(async () => ((await statusOf(main, ids.claudeC)) === 'needs_input' ? true : null), 20_000, 250);
      await sleep(2_500);
      const s = (await sessions(main)).find((x) => x.id === ids.claudeC);
      const pane = s === undefined ? null : String(tmuxOut('display-message', '-p', '-t', `=${s.tmuxName}:`, '#{pane_id}') ?? '').trim();
      const command = pane === null ? '' : String(tmuxOut('display-message', '-p', '-t', pane, '#{pane_current_command}') ?? '').trim();
      const d = await detailOf(A, ids.claudeC);
      const before = pane === null ? null : tmuxOut('capture-pane', '-p', '-t', pane);
      const forced = await press(A, ids.claudeC, d?.reply ?? NO_REPLY, '1', { question: d?.reply.question ?? '0123456789abcdef-1' });
      const after = pane === null ? null : tmuxOut('capture-pane', '-p', '-t', pane);
      // The runner execs `cat` then `sleep` in the stand-in's place (stand-in.mjs's hand-off).
      arm('R12', { status: waiting === true ? 'needs_input' : await statusOf(main, ids.claudeC), foregroundIsAgent: !['sleep', 'cat'].includes(command), currentCommand: command, pressable: [...(d?.reply.pressable ?? [])], forced, paneSame: before !== null && before === after });
    });

    // ---- R13: a draft typed at the Mac -------------------------------------------------
    await armSafely('R13', async () => {
      const agents = [];
      for (const id of [ids.claudeA, ids.codexA]) {
        await recover(main, id);
        await canSayBecomes(A, id, true);
        const inFrontNow = await front(main, id);
        await desk(main, id, 'draft');
        const drafted = await waitFor(() => (Number(stateOf(id)?.typedBytes ?? 0) > 0 ? true : null), 5_000, 50);
        await sleep(2_500);
        const d = await detailOf(A, id);
        const forced = await message(A, id, `over a draft ${canary()}`);
        agents.push({ inFront: inFrontNow, drafted: drafted === true, canSay: d?.reply.canSay ?? null, forced, phoneBytes: forced.bytes, typedAfter: Number(stateOf(id)?.typedBytes ?? 0) });
        await desk(main, id, '\u0015');
        await recover(main, id);
      }
      arm('R13', { words: WORDS_HEAD, agents });
    });

    // ---- R14: the text arms --------------------------------------------------------------
    await armSafely('R14', async () => {
      const id = ids.claudeA;
      const delivered = [];
      const refusedArms = [];
      const tail = canary();
      const long = `${'y'.repeat(4_096 - Buffer.byteLength(tail, 'utf8'))}${tail}`;
      // A backslash then a semicolon, the escape `send-keys -l` ate (research
      // 135 §3.1). The literal is 'a\\;': written 'a\;' it is `a;` in JavaScript.
      for (const text of ['/exit', '!touch x', '-R', 'x;', 'a\\;', long]) {
        await canSayBecomes(A, id, true);
        const m = await message(A, id, text);
        delivered.push({ text, answer: m, bytes: m.bytes, submits: m.submits.length });
        await recover(main, id);
      }
      const esc = String.fromCharCode(0x1b);
      const lone = String.fromCharCode(0xd800);
      for (const [what, text, want] of [
        ['ESC [201~', `a${esc}[201~b`, 'character'],
        ['a TAB', `a${String.fromCharCode(9)}b`, 'character'],
        ['a CR', `a${String.fromCharCode(13)}b`, 'character'],
        ['a lone surrogate', `a${lone}b`, 'character'],
        ['4,097 bytes', `${'z'.repeat(4_097)}`, 'long'],
        ['the empty string', '', 'empty']
      ]) {
        await canSayBecomes(A, id, true);
        const m = await message(A, id, text);
        refusedArms.push({ what, want, answer: m, bytes: m.bytes });
      }
      arm('R14', { delivered, refused: refusedArms });
    });

    // ---- R15: replays ------------------------------------------------------------------------
    await armSafely('R15', async () => {
      const id = ids.codexA;
      const out = {};
      {
        await canSayBecomes(A, id, true);
        const write = freshWriteId();
        const once = nonce();
        const timestamp = String(Date.now());
        const text = `replayed ${canary()}`;
        const from = hr();
        const first = await sayText(A.phone, A.door, id, text, { write, nonce: once, timestamp });
        const again = await sayText(A.phone, A.door, id, text, { write, nonce: once, timestamp });
        noteWrite(first);
        noteWrite(again, { repeat: true });
        await sleep(600);
        out.replay = { first: first.status, again: again.status, submits: submitsFrom(id, from).length };
        await recover(main, id);
      }
      {
        await canSayBecomes(A, id, true);
        const write = freshWriteId();
        const text = `re-signed ${canary()}`;
        const from = hr();
        const first = await message(A, id, text, { write });
        const second = await message(A, id, text, { write, repeat: true });
        out.reused = { first: first.status, second: second.status, sameBody: first.body !== null && first.body === second.body, submits: submitsFrom(id, from).length };
        await recover(main, id);
      }
      {
        const C = await pairPhone(main, 'p318 phone C');
        const st = await status(main);
        const row = (st?.phones ?? []).find((p) => p.label === 'p318 phone C');
        if (C.ok && row !== undefined) await pocket(main, 'removePhone', row.id);
        await sleep(1_500);
        const again = await confirmDoor(main);
        if (!again.ok) throw new Error(`the door did not listen again after a Remove: ${again.why}`);
        const reply = C.ok ? await sayText(C.phone, C.door, id, `removed ${canary()}`, { nonce: nonce() }) : { status: -1 };
        const control = (await signedGet(A.phone, A.door, '/v1/blocked')).status;
        out.removedPhone = { status: reply.status, wasPaired: C.ok && row !== undefined && control === 200, control };
      }
      {
        // The door switched off while a press reads back: once the digit has landed.
        const p = await pressReady(main, A, ids.claudeA, 'touch p318-r15-off.txt');
        const from = hr();
        let offAsked = null;
        const watchDigit = waitFor(() => (digitsFrom(ids.claudeA, from).some((d) => d.kind === 'commit') ? true : null), 10_000, 5).then((hit) => {
          if (hit === true) offAsked ??= pocket(main, 'setDoor', { on: false });
          return hit === true;
        });
        const r = await press(A, ids.claudeA, p.reply, '4');
        const sawDigit = await watchDigit;
        await offAsked;
        await sleep(800);
        out.offDuringPress = { status: r.status, outcome: r.outcome, digits: digitsFrom(ids.claudeA, from).filter((d) => d.kind === 'commit').length, sawDigit };
        await pocket(main, 'setDoor', { on: true });
        const again = await confirmDoor(main);
        if (!again.ok) throw new Error(`the door did not listen again after it was switched off: ${again.why}`);
        await recover(main, ids.claudeA);
      }
      arm('R15', out);
    });

    // ---- R15b: the kept say ------------------------------------------------------------------
    await armSafely('R15b', async () => {
      const id = ids.claudeA;
      await recover(main, id);
      await canSayBecomes(A, id, true);
      // R15 switched the door off and on: the stopped Funnel child gone first.
      await steadyFunnel();
      const text = `kept ${canary()}`;
      const write = freshWriteId();
      const before = actsOn('say', id);
      const from = hr();
      let loggedBeforeCut = false;
      relay.cut(() => {
        const logged = actsOn('say', id) > before;
        if (logged) loggedBeforeCut = true;
        return logged;
      });
      const cutReply = await sayText(A.phone, A.viaRelay, id, text, { write, nonce: nonce(), onWritten: () => relay.hold() });
      relay.pass();
      noteWrite(cutReply, { landed: submitsFrom(id, from).length > 0 });
      await sleep(800);
      const resent = await message(A, id, text, { write, repeat: true });
      const submitsAfterResend = submitsFrom(id, from).length;
      await recover(main, id);
      await canSayBecomes(A, id, true);
      const fresh = await message(A, id, text);
      const freshSubmits = submitsFrom(id, from).length;
      say(`R15b: the cut answered ${String(cutReply.status)}; re-signed ${String(resent.outcome)}; ${String(submitsAfterResend)} submit(s); the same words under a fresh id made ${String(freshSubmits)} in all (${String(fresh.outcome)})`);
      arm('R15b', { cutStatus: cutReply.status, loggedBeforeCut, resent, submitsAfterResend, freshSubmits, cuts: relay.cuts() });
      await recover(main, id);
    });

    // ---- R16: a dialog-shaped message --------------------------------------------------------------
    await armSafely('R16', async () => {
      const agents = [];
      for (const [id, text] of [
        [ids.claudeA, `Do you want to proceed?\n❯ 1. Yes\n  2. No ${canary()}`],
        [ids.codexA, `Would you like to run the following command?\n› 1. Yes, proceed (y)\n  2. No, and tell Codex what to do differently (esc) ${canary()}`]
      ]) {
        await canSayBecomes(A, id, true);
        const m = await message(A, id, text);
        let samples = 0;
        let waitingSamples = 0;
        const until = Date.now() + 10_000;
        while (Date.now() < until) {
          samples += 1;
          if ((await statusOf(main, id)) === 'needs_input') waitingSamples += 1;
          await sleep(500);
        }
        const screen = tmuxOut('capture-pane', '-p', '-t', standinOf(id)?.pane ?? '');
        agents.push({ answer: m, echoed: String(screen ?? '').includes(text.split('\n')[1].trim().slice(0, 8)), samples, waitingSamples });
        await tell(id, [{ op: 'clear' }]);
        await recover(main, id);
      }
      arm('R16', { agents });
    });
    psSampler.stop();

    // ---- R17: pane reports move nothing ---------------------------------------------------------------
    await armSafely('R17', async () => {
      const id = ids.claudeB;
      await recover(main, id);
      const mounted = await front(main, id);
      const p = await pressReady(main, A, id, 'touch p318-r17.txt');
      const questionBefore = p.reply.question;
      const from = hr();
      // The Mac's terminal losing and taking focus: xterm answers tmux's focus
      // mode itself, and those reports reach the attach host as `onData` does.
      for (let i = 0; i < 5; i += 1) {
        await cdpEval(main, "(() => { const t = document.querySelector('.xterm-helper-textarea'); if (t === null) return false; t.blur(); return true; })()");
        await sleep(250);
        await cdpEval(main, "(() => { const t = document.querySelector('.xterm-helper-textarea'); if (t === null) return false; t.focus(); return true; })()");
        await sleep(250);
      }
      // The same reports and a device-attributes answer down the report road
      // (`sendReport`), so the arm does not rest on tmux's focus mode alone.
      for (let i = 0; i < 5; i += 1) {
        await report_(main, id, '\u001b[O');
        await sleep(120);
        await report_(main, id, '\u001b[I');
        await sleep(120);
      }
      await report_(main, id, '\u001b[?62;22c');
      // Five returns to the session, each a fresh attach of its terminal.
      for (let i = 0; i < 5; i += 1) {
        await front(main, ids.shell);
        await front(main, id);
      }
      await sleep(2_500);
      const reportsSent = logFrom(id, from).filter((l) => l.kind === 'read').length;
      const after = await detailOf(A, id);
      const stalePress = await press(A, id, p.reply, '1');
      await recover(main, id);
      // The control: a real keystroke (an arrow, which the dialog ignores) moves the id.
      const q = await pressReady(main, A, id, 'touch p318-r17-control.txt');
      if (!(await inFront(main, id))) await front(main, id);
      const arrowFrom = hr();
      await desk(main, id, '\u001b[B');
      await sleep(400);
      const arrowReached = bytesFrom(id, arrowFrom).includes('1b5b42');
      const control = await press(A, id, q.reply, '1');
      arm('R17', { mounted, reportsSent, questionBefore, questionAfter: after?.reply.question ?? null, stalePress, control, controlDigits: control.digits.filter((d) => d.marker === '1').length, arrowReached });
      await recover(main, id);
    });

    // ---- R19: request-to-land, printed -------------------------------------------------------------------
    {
      const spread = (xs) => ({ n: xs.filter((x) => typeof x === 'number').length, p50: quantile(xs, 0.5), p99: quantile(xs, 0.99) });
      const reading = { presses: spread(r19.presses), messages: spread(r19.messages) };
      say(`R19 request-to-land, printed and not graded on time (D26): presses ${J(reading.presses)}, messages ${J(reading.messages)} ms`);
      arm('R19', reading);
    }

    // ---- RN: no regression against the parent --------------------------------------------------------------
    await armSafely('RN', async () => {
      const head = await rnAt(main, A, RN_SUFFIX.head);
      if (rnParent.reading === null) return cannotRead('RN', 'no parent ran (P318_PARENT_CHECKOUT unset), so there is nothing to compare HEAD with', { head });
      const reading = { parent: rnParent.reading, head: head.reading, parentP50: rnParent.p50, headP50: head.p50 };
      say(`RN /v1/session p50: parent ${String(rnParent.p50)} ms, HEAD ${String(head.p50)} ms`);
      arm('RN', reading);
    });
    HEAD_READINGS.done = true;
  });
} catch (err) {
  failures += 1;
  report.error = String(err?.message ?? err);
  say(`the run stopped: ${report.error}`);
} finally {
  psSampler?.stop();
  relay?.close();
  const leaked = watch === null ? [] : watch.stop();
  const ended = standin === null ? { ended: [], left: [] } : endStandinProcesses(standin.dir, 1_500);
  if (dns !== null) await dns.close();
  // Every agent stand-in and every program one handed its terminal to (R12's
  // sleeper runs as the runner's pid), by the pids the stand-ins wrote.
  const agentPids = hellos(STANDIN_DIR).flatMap((h) => [Number(h.pid), Number(h.runnerPid)]).filter((p) => Number.isInteger(p) && p > 1);
  const alive = (pid) => {
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  };
  for (const pid of agentPids) {
    try {
      process.kill(pid, 'SIGTERM');
    } catch {
      /* gone with its pane */
    }
  }
  for (let i = 0; i < 20 && agentPids.some(alive); i += 1) await sleep(100);
  for (const pid of agentPids.filter(alive)) {
    try {
      process.kill(pid, 'SIGKILL');
    } catch {
      /* gone */
    }
  }
  const agentsLeft = agentPids.filter(alive).length;
  // R18, after the app has gone: nothing it kept holds a word of a message.
  if (HEAD_READINGS.done === true) {
    const text = appLogText();
    const hits = [];
    const snapshotHits = [];
    const SNAPSHOTS = `${join(PROFILE, 'gmux', 'snapshots')}/`;
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
          for (const c of canaries) {
            if (!s.includes(c)) continue;
            // The sessions' own saved screens (snapshotAllSessions('app-quit')):
            // a delivered message as the agent drew it, exactly as words typed
            // at the desk are kept there. Counted and printed, never graded.
            if (p.startsWith(SNAPSHOTS)) snapshotHits.push({ file: p.slice(RUN.length + 1), canary: c });
            else hits.push({ file: p.slice(RUN.length + 1), canary: c });
          }
        }
      }
    };
    walk(PROFILE);
    walk(HOME);
    const menuNow = readFileSync(join(ROOT, 'src', 'main', 'menu.ts'), 'utf8');
    const menuThen = spawnSync('git', ['-C', ROOT, 'show', `${SNAPSHOT}:src/main/menu.ts`], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
    arm('R18', {
      appLogRead: text !== null,
      filesScanned,
      hits,
      snapshotHits: snapshotHits.length,
      psSamples: psSampler?.samples() ?? 0,
      psHits: psSampler?.hits() ?? 0,
      buffersLeft: sayBuffers(tmuxOut('list-buffers', '-F', '#{buffer_name}')),
      logLines: writeLines(),
      acted,
      unknown: actedUnknown,
      menuSame: menuThen.status === 0 && menuThen.stdout === menuNow
    });
  }
  arm('RUN', {
    tailscalePreflight,
    dnsPreflights,
    agentsHeld,
    resolved: resolvedOk,
    realTailscale: leaked.length,
    samples: watch?.samples() ?? 0,
    forbidden: standin === null ? 0 : standin.forbidden().length,
    standinLeft: ended.left.length,
    agentsLeft
  });
  report.readings.processRowsAtEnd = processRows().filter((r) => r.command.includes('tailscale-standin.mjs') || r.command.includes('build/p318/stand-in.mjs')).length;
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, `probe-p318${PARENT === '' ? '' : '-with-parent'}.json`), `${J(report, (_k, v) => (typeof v === 'bigint' ? String(v) : v), 2)}\n`);
  if (!KEEP) rmSync(RUN, { recursive: true, force: true });
  else say(`kept ${RUN} (P318_KEEP=1): every stand-in's log under ${STANDIN_DIR}`);
}

say(`${String(report.arms.filter((a) => a.ok === true).length)} arm(s) passed, ${String(failures)} failed, ${String(unreadable)} could not be read`);
process.exit(failures > 0 ? 1 : unreadable > 0 ? 2 : 0);
