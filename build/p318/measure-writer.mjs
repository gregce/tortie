#!/usr/bin/env node
/**
 * measure:p318 — THE SHIPPING REPLY WRITER, OUTSIDE ELECTRON, against real
 * tmux (build/p318/SPEC.md §7.5, D26, §Revision R7, R15, R19 a).
 *
 * WHY IT IS A MEASUREMENT AND NOT AN APP RUN. A press is checked and typed in
 * one synchronous stretch, then handed to tmux; how long the digit takes to
 * LAND after the last check is what decides whether a question the agent drew
 * in that window can be answered by mistake. An in-app stamp would need a
 * `GMUX_*` name and move `gate:contract`, which nothing else in Phase 318
 * moves (D26), so the measurement runs the SHIPPING src/main/reply/writer.ts
 * and reader.ts here, through the pinned tsx, with the shipping control client
 * on a scratch transport, against the vendored tmux 3.7b and, when it is
 * installed, Homebrew's 3.6a, and reads the landing off the agent's own log.
 *
 * WHAT IT STARTS, AND ENDS. Per tmux build: a scratch directory under
 * /private/tmp (its TMUX_TMPDIR, HOME, ZDOTDIR, projects, the stand-ins'
 * directory and the wrappers), ONE tmux server on `-L p318-v-<pid>-<label>`
 * under a copy of resources/gmux-tmux.conf, build/p318/stand-in.mjs as Claude
 * Code and Codex in its panes (behind `exec -a` wrappers, so the foreground
 * check reads the agent's name), and the pinned tsx running
 * build/p318/drive-writer.mts. The drive ends its server and its control
 * clients in its own `finally`; THIS FILE ends the server again by its scratch
 * socket name, every stand-in by the pid it wrote in its hello, and removes
 * the directory, in a `finally`, whatever happened. It never names `-L gmux`,
 * the default server or the person's HOME, runs no agent, starts no Electron
 * and spends no token; its HISTFILE is /dev/null and TERM_SESSION_ID is unset.
 *
 * THE ARMS (graded here, from the drive's raw readings; SPEC §7.5)
 *   M1  check-to-land, at least 200 presses per build over the control client,
 *       Claude Code and Codex alternating: every press offered and `done`,
 *       one digit, its own marker, on the screen it was drawn for, no Enter;
 *       p99 UNDER 15 ms (graded). The spawned fallback list is measured
 *       beside it and printed, not graded
 *   M2  the message frames (`hello phone`, `a\;b\\c\`, `-R ls -la;` LF `second
 *       line ; 👍🏽 é` with the é decomposed, `/exit`, `!touch x`, `x;`, 4,096
 *       bytes): each exactly ESC [200~, the bytes with LF as CR, ESC [201~,
 *       CR; submitted once; `list-buffers` empty after each
 *   M3  from copy mode, a press and a message: `#{pane_in_mode}` 1 before and
 *       0 after, the bytes as M2
 *   M4  each final-check refusal (the door stopped; the id moved, the `$`-id
 *       changed or the row stopped waiting during the reading; a mark from
 *       another screen; Yes on a command not said whole; a message over a
 *       draft, while the agent works, or after the id moved): refused for its
 *       own reason, no `onLastCheck`, no act handed to tmux or the control
 *       client, no byte at the agent, every message buffer deleted
 *   M5  the read-back: answered (`done`, the desk funnel once); not taken (a
 *       digit the agent dropped: `failed`, REPLY_NOT_TAKEN); unread (the pane
 *       killed before the read-back: `failed`, REPLY_TYPED_UNREAD)
 *   M6  the say's window: at least 200 messages per build, each `done` and
 *       one exact frame; the reader's last capture to the paste's first byte,
 *       and the last check to it, p50, p99 and max PRINTED, not graded (this
 *       is the window idle-only keeps a question out of, §Revision R15)
 *   M7  a scratch control transport that answers %error to `copy-mode` and
 *       %end to `send-keys` reads the read-back's verdict and never
 *       REPLY_FAILED; the inverse answers REPLY_FAILED (the control)
 *
 * A build whose tmux is not installed (Homebrew's 3.6a) is UNREADABLE, and so
 * is an arm the run could not stage; neither is ever a pass.
 *
 *   npm run -s measure:p318
 *   P318_PRESSES=200 P318_FALLBACK=40 P318_MESSAGES=200   the counts (the
 *                           graded floors stay 200 whatever these say)
 *   P318_TMUX_36A=<path>    another 3.6a than Homebrew's
 *   P318_KEEP=1             keep each scratch directory (the stand-ins' logs,
 *                           every byte they read) for a re-derivation
 *   node build/p318/measure-writer.mjs --self-test   every grader on its
 *                           fixtures, each clause shown red; starts nothing
 *
 * Exit 0 when every arm passed on every build, 1 when one failed, 2 when a
 * build or an arm could not be read.
 */

import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gradeFixtures } from '../probe-graders.mjs';
import { hellos, writeWrappers } from './stand-in.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const TAG = '[p318 measure]';
const J = JSON.stringify;

/** The floors the graders hold, whatever the counts asked for. */
export const PRESS_FLOOR = 200;
export const MESSAGE_FLOOR = 200;
/** D26: the check-to-land p99 a press must land under, over the control client. */
export const CHECK_TO_LAND_P99_MS = 15;
/** How many messages M2 sends: seven texts, each to both agents. */
export const M2_MESSAGES = 14;
/** How many final-check refusals M4 stages. */
export const M4_ARMS = 10;

// ---------------------------------------------------------------------------
// The pure readers
// ---------------------------------------------------------------------------

/** The `q` quantile of a list of numbers (nearest rank), or null. */
export function quantile(values, q) {
  const xs = values.filter((v) => typeof v === 'number' && Number.isFinite(v)).sort((a, b) => a - b);
  if (xs.length === 0) return null;
  return xs[Math.min(xs.length - 1, Math.max(0, Math.ceil(q * xs.length) - 1))];
}

/** p50, p99 and max of a list, rounded to 0.01 ms. */
export function spread(values) {
  const r = (v) => (v === null ? null : Math.round(v * 100) / 100);
  const xs = values.filter((v) => typeof v === 'number' && Number.isFinite(v));
  return { n: xs.length, p50: r(quantile(xs, 0.5)), p99: r(quantile(xs, 0.99)), max: r(xs.length === 0 ? null : Math.max(...xs)) };
}

/**
 * The bytes a message must reach the agent as (research 135 §3.3, the
 * judge's measured bytes): ESC [200~, the words with every LF as CR, ESC
 * [201~, then one CR, as hex.
 */
export function frameHexOf(textHex) {
  const body = Buffer.from(String(textHex), 'hex');
  const crs = Buffer.from(body.map((b) => (b === 0x0a ? 0x0d : b)));
  return Buffer.concat([Buffer.from('\u001b[200~', 'latin1'), crs, Buffer.from('\u001b[201~\r', 'latin1')]).toString('hex');
}

/** A press landed honestly: offered, done, exactly one digit (its marker) on its own screen, no Enter. */
export function pressLanded(p) {
  if (p?.ok !== true || p.outcome?.outcome !== 'done') return false;
  const digit = Buffer.from(String(p.marker), 'latin1').toString('hex');
  return p.readHex === digit && p.landedHex === digit && p.enters === 0 && Array.isArray(p.commits) && p.commits.length === 1 && p.commits[0].marker === p.marker && p.commits[0].serial === p.serial;
}

/** A message arrived honestly: done, the exact frame and nothing else, one submit of its words, no buffer left. */
export function messageLanded(m) {
  return m?.outcome?.outcome === 'done' && m.readHex === frameHexOf(m.textHex) && m.submits === 1 && m.submittedHex === m.textHex && Array.isArray(m.buffersAfter) && m.buffersAfter.length === 0;
}

/** M1's reading from the drive's presses. */
export function summarizeM1(presses, fallback) {
  const xs = presses ?? [];
  const landed = spread(xs.filter(pressLanded).map((p) => p.checkToLandMs));
  return {
    n: xs.length,
    landed: landed.n,
    p50: landed.p50,
    p99: landed.p99,
    max: landed.max,
    unoffered: xs.filter((p) => p?.ok !== true).length,
    notDone: xs.filter((p) => p?.ok === true && p.outcome?.outcome !== 'done').length,
    wrongLanding: xs.filter((p) => p?.ok === true && p.outcome?.outcome === 'done' && !pressLanded(p)).length,
    agents: [...new Set(xs.map((p) => p?.agent).filter((a) => typeof a === 'string'))].sort(),
    fallback: spread((fallback ?? []).filter(pressLanded).map((p) => p.checkToLandMs)),
    fallbackLanded: (fallback ?? []).filter(pressLanded).length,
    fallbackTried: (fallback ?? []).length
  };
}

/** M2's reading. */
export function summarizeM2(messages) {
  const xs = messages ?? [];
  return {
    n: xs.length,
    notDone: xs.filter((m) => m?.outcome?.outcome !== 'done').map((m) => `${m?.what} (${m?.agent})`),
    frameMismatch: xs.filter((m) => m?.readHex !== frameHexOf(m?.textHex)).map((m) => `${m?.what} (${m?.agent})`),
    submitMismatch: xs.filter((m) => m?.submits !== 1 || m?.submittedHex !== m?.textHex).map((m) => `${m?.what} (${m?.agent})`),
    buffersLeft: xs.reduce((n, m) => n + (Array.isArray(m?.buffersAfter) ? m.buffersAfter.length : 1), 0),
    longest: Math.max(0, ...xs.map((m) => m?.bytes ?? 0))
  };
}

/** M3's reading. */
export function summarizeM3(m3) {
  const p = m3?.press ?? null;
  const s = m3?.say ?? null;
  const digit = p?.marker === null || p?.marker === undefined ? null : Buffer.from(String(p.marker), 'latin1').toString('hex');
  return {
    press: p === null ? null : { before: p.before, after: p.after, done: p.outcome?.outcome === 'done', oneDigit: digit !== null && p.readHex === digit && (p.commits ?? []).length === 1 },
    say: s === null ? null : { before: s.before, after: s.after, landed: messageLanded(s) }
  };
}

/** M4's reading: each arm's verdict against the reason it is owed. */
export function summarizeM4(arms, words) {
  const xs = arms ?? [];
  const owed = (a) => {
    if (/door stopped/.test(a.what)) return { reason: 'stopped', sentence: words?.stopped };
    if (a.verb === 'say') return { reason: 'unsayable', sentence: words?.notReady };
    return { reason: 'changed', sentence: words?.changed };
  };
  return {
    arms: xs.length,
    unstaged: xs.filter((a) => typeof a.unreadable === 'string').map((a) => a.what),
    wrongReason: xs.filter((a) => a.unreadable === undefined && (a.outcome?.outcome !== 'refused' || a.outcome.reason !== owed(a).reason || a.outcome.sentence !== owed(a).sentence)).map((a) => `${a.what}: ${J(a.outcome)}`),
    acted: xs.filter((a) => a.unreadable === undefined && (a.lastChecks !== 0 || a.controlLines !== 0 || (a.actsAfterReads ?? []).length !== 0)).map((a) => a.what),
    bytes: xs.filter((a) => a.unreadable === undefined && a.bytesRead !== 0).map((a) => a.what),
    buffersLeft: xs.reduce((n, a) => n + (Array.isArray(a.buffersAfter) ? a.buffersAfter.length : 0), 0)
  };
}

/** M5's reading. */
export function summarizeM5(m5) {
  const a = m5?.answered ?? null;
  const n = m5?.notTaken ?? null;
  const u = m5?.unread ?? null;
  return {
    answered: a === null ? null : { done: a.outcome?.outcome === 'done', landed: pressLanded(a), noted: a.noted === true },
    notTaken: n === null ? null : { staged: n.staged !== false && n.dropped > 0 && (n.commits ?? []).length === 0, outcome: n.outcome ?? null },
    unread: u === null ? null : { offered: u.offered === true, outcome: u.outcome ?? null }
  };
}

/** M6's reading. */
export function summarizeM6(messages) {
  const xs = messages ?? [];
  return {
    n: xs.length,
    notLanded: xs.filter((m) => !messageLanded(m)).length,
    captureToLand: spread(xs.filter(messageLanded).map((m) => m.captureToLandMs)),
    checkToLand: spread(xs.filter(messageLanded).map((m) => m.checkToLandMs))
  };
}

/** M7's reading. */
export function summarizeM7(m7) {
  const pick = (r) =>
    r === null || r === undefined || typeof r.unreadable === 'string'
      ? null
      : { outcome: r.outcome?.outcome ?? null, sentence: r.outcome?.sentence ?? null, lines: (r.fakeLines ?? []).map((l) => String(l).split(' ')[0]), digits: (r.readHex ?? '').length / 2 };
  return { copyError: pick(m7?.['copy-error']), sendError: pick(m7?.['send-error']) };
}

// ---------------------------------------------------------------------------
// The graders: pure, over a summarized reading, each clause shown to fail
// ---------------------------------------------------------------------------

export const GRADERS = {
  M1: {
    title: 'check-to-land over the control client',
    clauses: [
      ['at least 200 presses were measured, on both agents', (r) => r.n >= PRESS_FLOOR && r.agents.includes('claude') && r.agents.includes('codex')],
      ['every press was offered and answered done', (r) => r.unoffered === 0 && r.notDone === 0],
      ['every press landed one digit, its own marker, on the screen it was drawn for, and no Enter', (r) => r.wrongLanding === 0 && r.n > 0],
      ['p99 check-to-land is under 15 ms', (r) => typeof r.p99 === 'number' && r.p99 < CHECK_TO_LAND_P99_MS]
    ]
  },
  M2: {
    title: 'every message reaches the agent as one bracketed paste and one Return',
    clauses: [
      ['every message of the list was sent to both agents and answered done', (r) => r.n === M2_MESSAGES && r.notDone.length === 0],
      ['every frame is ESC [200~, the words with LF as CR, ESC [201~ and one CR, and nothing else', (r) => r.frameMismatch.length === 0],
      ['each was submitted once, its own words', (r) => r.submitMismatch.length === 0],
      ['no buffer is left after any message', (r) => r.buffersLeft === 0],
      ['the 4,096-byte message was among them', (r) => r.longest === 4_096]
    ]
  },
  M3: {
    title: 'a press and a message from copy mode',
    clauses: [
      ['the press: in a mode before, out after, done, one digit', (r) => r.press !== null && r.press.before === '1' && r.press.after === '0' && r.press.done && r.press.oneDigit],
      ['the message: in a mode before, out after, its frame exact', (r) => r.say !== null && r.say.before === '1' && r.say.after === '0' && r.say.landed]
    ]
  },
  M4: {
    title: 'every final-check refusal types nothing',
    clauses: [
      ['every refusal was staged', (r) => r.arms >= M4_ARMS && r.unstaged.length === 0],
      ['each was refused for its own reason, in its own sentence', (r) => r.wrongReason.length === 0],
      ['none reached the last check, wrote a control line or handed tmux an act', (r) => r.acted.length === 0],
      ['no agent read a byte', (r) => r.bytes.length === 0],
      ['every message buffer was deleted', (r) => r.buffersLeft === 0]
    ]
  },
  M5: {
    title: 'the read-back decides by the screen, never by a keystroke',
    clauses: [
      ['answered: done, one digit, the desk funnel called', (r) => r.answered !== null && r.answered.done && r.answered.landed && r.answered.noted],
      ['not taken: a digit the agent dropped reads failed, in the not-taken sentence', (r) => r.notTaken !== null && r.notTaken.staged && r.notTaken.outcome?.outcome === 'failed' && r.notTaken.outcome.sentence === r.words.notTaken],
      ['unread: the pane gone before the read-back reads failed, typed and unread', (r) => r.unread !== null && r.unread.offered && r.unread.outcome?.outcome === 'failed' && r.unread.outcome.sentence === r.words.unread]
    ]
  },
  M6: {
    title: 'the say\'s window, at least 200 messages (printed, not graded on time)',
    clauses: [
      ['at least 200 messages were measured', (r) => r.n >= MESSAGE_FLOOR],
      ['every one answered done and arrived as one exact frame', (r) => r.notLanded === 0 && r.n > 0],
      ['both windows were read for every one', (r) => r.captureToLand.n === r.n && r.checkToLand.n === r.n]
    ]
  },
  M7: {
    title: 'the press\'s outcome is the send-keys line\'s',
    clauses: [
      ['both lines reached the transport, copy-mode first', (r) => r.copyError !== null && r.copyError.lines[0] === 'copy-mode' && r.copyError.lines[1] === 'send-keys'],
      ['a refused copy-mode beside a taken send-keys reads the read-back\'s verdict, never could-not-type', (r) => r.copyError !== null && r.copyError.outcome === 'failed' && r.copyError.sentence === r.words.notTaken && r.copyError.sentence !== r.words.failed],
      ['the control: a refused send-keys reads could-not-type', (r) => r.sendError !== null && r.sendError.outcome === 'failed' && r.sendError.sentence === r.words.failed]
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

/** Every summarized reading of one build, from the drive's raw readings. */
export function summarize(raw) {
  const words = raw?.words ?? {};
  return {
    M1: summarizeM1(raw?.M1, raw?.M1fallback),
    M2: summarizeM2(raw?.M2),
    M3: summarizeM3(raw?.M3),
    M4: summarizeM4(raw?.M4, words),
    M5: { ...summarizeM5(raw?.M5), words },
    M6: summarizeM6(raw?.M6),
    M7: { ...summarizeM7(raw?.M7), words }
  };
}

/** Why an arm could not be READ (as opposed to failing), or null. */
export function unreadableOf(id, summary) {
  if (id === 'M5' && summary.notTaken !== null && summary.notTaken.staged === false) return 'the agent took the digit every time, so a press it does not take was never staged';
  if (id === 'M7' && (summary.copyError === null || summary.sendError === null)) return 'a scratch control transport never connected';
  return null;
}

// ---------------------------------------------------------------------------
// The fixtures: an honest reading per grader and one break per clause
// ---------------------------------------------------------------------------

const WORDS = {
  notTaken: 'Your answer was typed and the question is still there.',
  unread: 'Your answer was typed, and Tortie could not read the session after it.',
  failed: 'Tortie could not type into this session.',
  notReady: 'This session is not ready for a message. Nothing was sent.',
  changed: 'This session changed. Nothing was done.',
  stopped: 'Your Mac stopped answering this phone. Nothing was done.'
};

export const GRADER_FIXTURES = {
  M1: {
    pass: { n: 200, unoffered: 0, notDone: 0, wrongLanding: 0, agents: ['claude', 'codex'], p50: 1.4, p99: 3.1, max: 6.2 },
    breaks: {
      'at least 200 presses were measured, on both agents': (r) => void (r.n = 199),
      'every press was offered and answered done': (r) => void (r.notDone = 1),
      'every press landed one digit, its own marker, on the screen it was drawn for, and no Enter': (r) => void (r.wrongLanding = 1),
      'p99 check-to-land is under 15 ms': (r) => void (r.p99 = 15)
    },
    refused: [
      { what: 'presses on one agent alone', clause: 'at least 200 presses were measured, on both agents', edit: (r) => void (r.agents = ['claude']) },
      { what: 'a press never offered', clause: 'every press was offered and answered done', edit: (r) => void (r.unoffered = 1) },
      { what: 'no landing read at all', clause: 'p99 check-to-land is under 15 ms', edit: (r) => void (r.p99 = null) },
      // The adversary's spawned list under load, §Revision R7: p99 10 to 61 ms.
      { what: 'the spawned list\'s p99 under load', clause: 'p99 check-to-land is under 15 ms', edit: (r) => void (r.p99 = 24.3) }
    ]
  },
  M2: {
    pass: { n: 14, notDone: [], frameMismatch: [], submitMismatch: [], buffersLeft: 0, longest: 4_096 },
    breaks: {
      'every message of the list was sent to both agents and answered done': (r) => void (r.notDone = ['x; (claude)']),
      'every frame is ESC [200~, the words with LF as CR, ESC [201~ and one CR, and nothing else': (r) => void (r.frameMismatch = ['x; (codex)']),
      'each was submitted once, its own words': (r) => void (r.submitMismatch = ['hello phone (claude)']),
      'no buffer is left after any message': (r) => void (r.buffersLeft = 1),
      'the 4,096-byte message was among them': (r) => void (r.longest = 4_093)
    },
    refused: [{ what: 'a list one message short', clause: 'every message of the list was sent to both agents and answered done', edit: (r) => void (r.n = 13) }]
  },
  M3: {
    pass: { press: { before: '1', after: '0', done: true, oneDigit: true }, say: { before: '1', after: '0', landed: true } },
    breaks: {
      'the press: in a mode before, out after, done, one digit': (r) => void (r.press.after = '1'),
      'the message: in a mode before, out after, its frame exact': (r) => void (r.say.landed = false)
    },
    refused: [
      { what: 'a press that never started in copy mode', clause: 'the press: in a mode before, out after, done, one digit', edit: (r) => void (r.press.before = '0') },
      { what: 'a message left in copy mode', clause: 'the message: in a mode before, out after, its frame exact', edit: (r) => void (r.say.after = '1') }
    ]
  },
  M4: {
    pass: { arms: 10, unstaged: [], wrongReason: [], acted: [], bytes: [], buffersLeft: 0 },
    breaks: {
      'every refusal was staged': (r) => void (r.unstaged = ['a press with a mark from another screen']),
      'each was refused for its own reason, in its own sentence': (r) => void (r.wrongReason = ['a message while the agent works: {"outcome":"done"}']),
      'none reached the last check, wrote a control line or handed tmux an act': (r) => void (r.acted = ['a press after the door stopped']),
      'no agent read a byte': (r) => void (r.bytes = ['a message over a draft typed at the Mac']),
      'every message buffer was deleted': (r) => void (r.buffersLeft = 1)
    },
    refused: [{ what: 'fewer arms than the SPEC names', clause: 'every refusal was staged', edit: (r) => void (r.arms = 9) }]
  },
  M5: {
    pass: {
      answered: { done: true, landed: true, noted: true },
      notTaken: { staged: true, outcome: { outcome: 'failed', reason: null, sentence: WORDS.notTaken } },
      unread: { offered: true, outcome: { outcome: 'failed', reason: null, sentence: WORDS.unread } },
      words: WORDS
    },
    breaks: {
      'answered: done, one digit, the desk funnel called': (r) => void (r.answered.noted = false),
      'not taken: a digit the agent dropped reads failed, in the not-taken sentence': (r) => void (r.notTaken.outcome = { outcome: 'done', reason: null, sentence: null }),
      'unread: the pane gone before the read-back reads failed, typed and unread': (r) => void (r.unread.outcome = { outcome: 'failed', reason: null, sentence: WORDS.failed })
    },
    refused: [
      // §Revision R3: a keystroke is never an answer, so a press read as answered with the window unchanged is the defect.
      { what: 'a not-taken press read as could-not-type', clause: 'not taken: a digit the agent dropped reads failed, in the not-taken sentence', edit: (r) => void (r.notTaken.outcome.sentence = WORDS.failed) },
      { what: 'an answered press that typed two digits', clause: 'answered: done, one digit, the desk funnel called', edit: (r) => void (r.answered.landed = false) }
    ]
  },
  M6: {
    pass: { n: 200, notLanded: 0, captureToLand: { n: 200, p50: 6.1, p99: 19.8, max: 31.2 }, checkToLand: { n: 200, p50: 5.2, p99: 18.9, max: 30.4 } },
    breaks: {
      'at least 200 messages were measured': (r) => void (r.n = 150),
      'every one answered done and arrived as one exact frame': (r) => void (r.notLanded = 1),
      'both windows were read for every one': (r) => void (r.captureToLand.n = 199)
    }
  },
  M7: {
    pass: {
      copyError: { outcome: 'failed', sentence: WORDS.notTaken, lines: ['copy-mode', 'send-keys'], digits: 0 },
      sendError: { outcome: 'failed', sentence: WORDS.failed, lines: ['copy-mode', 'send-keys'], digits: 0 },
      words: WORDS
    },
    breaks: {
      'both lines reached the transport, copy-mode first': (r) => void (r.copyError.lines = ['send-keys', 'copy-mode']),
      // §Revision R19 a's defect: Promise.all read the refused copy-mode as could-not-type.
      'a refused copy-mode beside a taken send-keys reads the read-back\'s verdict, never could-not-type': (r) => void (r.copyError.sentence = WORDS.failed),
      'the control: a refused send-keys reads could-not-type': (r) => void (r.sendError.sentence = WORDS.notTaken)
    }
  }
};

/** Every grader on its fixtures, and the pure readers on inputs of their own. Starts nothing. */
function selfTest() {
  let failures = 0;
  const say = (ok, text) => {
    if (!ok) failures += 1;
    process.stdout.write(`${ok ? 'ok  ' : 'FAIL'} ${text}\n`);
  };
  const clauses = gradeFixtures({ graders: GRADERS, fixtures: GRADER_FIXTURES, grade, clone: (x) => structuredClone(x), say, J });
  // The frame, re-derived from bytes this file writes.
  say(frameHexOf(Buffer.from('a\nb', 'utf8').toString('hex')) === Buffer.from('\u001b[200~a\rb\u001b[201~\r', 'latin1').toString('hex'), 'frameHexOf writes LF as CR between the paste marks and ends with one CR');
  say(frameHexOf(Buffer.from('x;', 'utf8').toString('hex')).endsWith('1b5b3230317e0d') && frameHexOf(Buffer.from('x;', 'utf8').toString('hex')).startsWith('1b5b3230307e783b'), 'frameHexOf keeps a trailing semicolon, which send-keys -l would have eaten');
  // The quantiles.
  const hundred = Array.from({ length: 100 }, (_, i) => i + 1);
  say(quantile(hundred, 0.5) === 50 && quantile(hundred, 0.99) === 99 && quantile([], 0.5) === null, 'quantile reads the nearest rank, and nothing from nothing');
  say(J(spread([3, 1, 2])) === J({ n: 3, p50: 2, p99: 3, max: 3 }), 'spread answers n, p50, p99 and max');
  // A press, read the drive's way, both ways.
  const press = { ok: true, agent: 'claude', marker: '1', serial: 7, outcome: { outcome: 'done', reason: null, sentence: null }, checkToLandMs: 1.2, landedHex: '31', commits: [{ marker: '1', serial: 7 }], dropped: 0, enters: 0, readHex: '31' };
  say(pressLanded(press), 'pressLanded takes one digit, its own marker, on its own screen');
  say(!pressLanded({ ...press, readHex: '310d' }), 'pressLanded refuses a digit followed by an Enter');
  say(!pressLanded({ ...press, commits: [{ marker: '1', serial: 8 }] }), 'pressLanded refuses a digit that landed on the next question');
  say(!pressLanded({ ...press, readHex: '32', landedHex: '32', commits: [{ marker: '2', serial: 7 }] }), 'pressLanded refuses another digit than the one pressed');
  const m1 = summarizeM1([press, { ...press, agent: 'codex', checkToLandMs: 2.5 }, { ok: false, why: 'no press offered' }], []);
  say(m1.n === 3 && m1.unoffered === 1 && m1.wrongLanding === 0 && J(m1.agents) === J(['claude', 'codex']) && m1.p50 === 1.2 && m1.p99 === 2.5, 'summarizeM1 counts an unoffered press apart from the ones that landed, and times only the ones that landed');
  // A message, read the drive's way, both ways.
  const textHex = Buffer.from('x;', 'utf8').toString('hex');
  const message = { what: 'x', agent: 'codex', bytes: 2, textHex, outcome: { outcome: 'done' }, readHex: frameHexOf(textHex), submittedHex: textHex, submits: 1, buffersAfter: [] };
  say(messageLanded(message), 'messageLanded takes the exact frame, one submit and no buffer');
  say(!messageLanded({ ...message, readHex: Buffer.from('x\r', 'latin1').toString('hex') }), 'messageLanded refuses words typed rather than pasted (send-keys -l ate the semicolon)');
  say(!messageLanded({ ...message, buffersAfter: ['tortie-say-0123'] }), 'messageLanded refuses a message that left its buffer behind');
  say(!messageLanded({ ...message, submits: 2 }), 'messageLanded refuses a message submitted twice');
  // M4's owed reasons.
  const m4 = summarizeM4(
    [
      { what: 'a press after the door stopped', verb: 'choose', outcome: { outcome: 'refused', reason: 'stopped', sentence: WORDS.stopped }, lastChecks: 0, controlLines: 0, actsAfterReads: [], bytesRead: 0, buffersAfter: [] },
      { what: 'a message while the agent works', verb: 'say', outcome: { outcome: 'refused', reason: 'unsayable', sentence: WORDS.notReady }, lastChecks: 0, controlLines: 0, actsAfterReads: [], bytesRead: 0, buffersAfter: [] },
      { what: 'a press with a mark from another screen', verb: 'choose', outcome: { outcome: 'refused', reason: 'changed', sentence: WORDS.changed }, lastChecks: 0, controlLines: 0, actsAfterReads: [], bytesRead: 0, buffersAfter: [] }
    ],
    WORDS
  );
  say(m4.wrongReason.length === 0 && m4.acted.length === 0 && m4.bytes.length === 0, 'summarizeM4 owes stopped to the door, unsayable to a message and changed to a press');
  const m4bad = summarizeM4([{ what: 'a press with a mark from another screen', verb: 'choose', outcome: { outcome: 'refused', reason: 'changed', sentence: WORDS.changed }, lastChecks: 1, controlLines: 2, actsAfterReads: [], bytesRead: 1, buffersAfter: [] }], WORDS);
  say(m4bad.acted.length === 1 && m4bad.bytes.length === 1, 'summarizeM4 names an arm that reached the last check and typed');
  // The unreadable rules.
  say(unreadableOf('M5', { notTaken: { staged: false } }) !== null && unreadableOf('M5', { notTaken: { staged: true } }) === null, 'M5 is unreadable, never failed, when the agent took the digit every time');
  say(unreadableOf('M7', { copyError: null, sendError: {} }) !== null, 'M7 is unreadable when a scratch transport never connected');
  process.stdout.write(failures === 0 ? `${TAG} self-test PASS: ${String(Object.keys(GRADERS).length)} graders, ${String(clauses)} clauses, each shown to go red on its own break, and the readers.\n` : `${TAG} self-test FAIL: ${String(failures)}.\n`);
  return failures === 0;
}


// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

const say = (line) => console.log(`${TAG} ${line}`);
const count = (name, fallback) => {
  const v = Number(process.env[name] ?? '');
  return Number.isInteger(v) && v > 0 ? v : fallback;
};
const PRESSES = count('P318_PRESSES', PRESS_FLOOR);
const FALLBACK = count('P318_FALLBACK', 40);
const MESSAGES = count('P318_MESSAGES', MESSAGE_FLOOR);
const KEEP = (process.env['P318_KEEP'] ?? '') === '1';

/** The tmux builds to measure: the vendored one, and Homebrew's 3.6a when it is installed. */
function builds() {
  const version = (bin) => {
    if (!existsSync(bin)) return null;
    const r = spawnSync(bin, ['-V'], { encoding: 'utf8', timeout: 10_000 });
    return r.status === 0 ? String(r.stdout ?? '').trim() : null;
  };
  const vendored = join(ROOT, 'build', 'vendor', 'tmux', 'bin', 'tmux');
  const homebrew = (process.env['P318_TMUX_36A'] ?? '').trim() || ['/opt/homebrew/bin/tmux', '/usr/local/bin/tmux'].find((p) => existsSync(p)) || '';
  const out = [];
  const v = version(vendored);
  out.push(v === null ? { label: '37b', bin: vendored, unreadable: `the vendored tmux ${vendored} is not built (npm run vendor:tmux)` } : { label: '37b', bin: vendored, version: v });
  const h = homebrew === '' ? null : version(homebrew);
  out.push(h === null ? { label: '36a', bin: homebrew, unreadable: 'Homebrew\'s tmux 3.6a is not installed' } : /3\.6a/.test(h) ? { label: '36a', bin: homebrew, version: h } : { label: '36a', bin: homebrew, unreadable: `${homebrew} is ${h}, not 3.6a` });
  return out;
}

/** End every stand-in this run's directory names, by the pid it wrote in its hello, and nothing else. */
async function endStandins(standinDir) {
  const pids = hellos(standinDir).map((h) => Number(h.pid)).filter((p) => Number.isInteger(p) && p > 1);
  for (const pid of pids) {
    try {
      process.kill(pid, 'SIGTERM');
    } catch {
      /* gone with its pane */
    }
  }
  const alive = (pid) => {
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  };
  for (let i = 0; i < 30 && pids.some(alive); i += 1) await new Promise((r) => setTimeout(r, 100));
  for (const pid of pids.filter(alive)) {
    try {
      process.kill(pid, 'SIGKILL');
    } catch {
      /* gone */
    }
  }
  return pids.filter(alive).length;
}

/** The measurement itself: every build, graded, and the report. */
async function run() {
  const report = { checkout: ROOT, at: new Date().toISOString(), counts: { presses: PRESSES, fallback: FALLBACK, messages: MESSAGES }, builds: [] };
  let failures = 0;
  let unreadable = 0;

  for (const build of builds()) {
    if (build.unreadable !== undefined) {
      unreadable += 1;
      say(`UNREADABLE ${build.label}: ${build.unreadable}`);
      report.builds.push({ label: build.label, unreadable: build.unreadable });
      continue;
    }
    const socket = `p318-v-${String(process.pid)}-${build.label}`;
    // A SHORT path: the socket lives under TMUX_TMPDIR and a Unix socket path is about 104 bytes at most.
    const dir = realpathSync(mkdtempSync(`/private/tmp/p318-measure-${build.label}-`));
    const tmuxTmp = join(dir, 't');
    const home = join(dir, 'home');
    const standinDir = join(dir, 'standin');
    const bin = join(dir, 'bin');
    const projects = { claude: join(dir, 'proj-claude'), codex: join(dir, 'proj-codex'), unread: join(dir, 'proj-unread') };
    const conf = join(dir, 'gmux-tmux.conf');
    const tmuxEnv = { PATH: '/usr/bin:/bin:/usr/sbin:/sbin', HOME: home, TMUX_TMPDIR: tmuxTmp };
    let left = 0;
    try {
      for (const d of [tmuxTmp, home, standinDir, bin, ...Object.values(projects)]) mkdirSync(d, { recursive: true, mode: 0o700 });
      writeFileSync(join(home, '.hushlogin'), '');
      copyFileSync(join(ROOT, 'resources', 'gmux-tmux.conf'), conf);
      writeWrappers({ dir, bin, standinDir });
      const planPath = join(dir, 'plan.json');
      const logFile = join(dir, 'drive.log');
      writeFileSync(planPath, J({ label: build.label, tmux: build.bin, socket, conf, tmuxTmp, home, standinDir, bin, projects, presses: PRESSES, fallback: FALLBACK, messages: MESSAGES, logFile }));
      say(`${build.label}: ${build.version} on -L ${socket}, ${String(PRESSES)} presses, ${String(FALLBACK)} on the spawned list, ${String(MESSAGES)} messages; scratch ${dir}`);
      const env = { ...process.env, HOME: home, ZDOTDIR: home, HISTFILE: '/dev/null', TMUX_TMPDIR: tmuxTmp };
      for (const name of Object.keys(env)) if (name === 'TERM_SESSION_ID' || name === 'TMUX' || name === 'TMUX_PANE' || /^(?:CLAUDECODE|CLAUDE_)/.test(name)) delete env[name];
      const { tsxCli } = await import('../ts-runner.mjs');
      const drive = spawnSync(process.execPath, [tsxCli(), '--tsconfig', 'tsconfig.node.json', join('build', 'p318', 'drive-writer.mts'), planPath], {
        cwd: ROOT,
        env,
        encoding: 'utf8',
        timeout: 40 * 60_000,
        maxBuffer: 512 * 1024 * 1024
      });
      const line = String(drive.stdout ?? '').split('\n').find((l) => l.startsWith('P318_MEASURE:'));
      if (line === undefined) {
        unreadable += 1;
        const tail = `${String(drive.stderr ?? '')}`.trim().split('\n').slice(-12).join('\n');
        say(`UNREADABLE ${build.label}: the drive printed no reading (exit ${String(drive.status)}${drive.error ? `, ${String(drive.error.message)}` : ''})\n${tail}`);
        report.builds.push({ label: build.label, unreadable: 'the drive printed no reading', exit: drive.status });
        continue;
      }
      const raw = JSON.parse(line.slice('P318_MEASURE:'.length));
      if (raw.ok !== true) {
        unreadable += 1;
        say(`UNREADABLE ${build.label}: the drive stopped: ${String(raw.error ?? 'no reason')}`);
        try {
          for (const l of readFileSync(logFile, 'utf8').trim().split('\n').slice(-6)) say(`  ${l}`);
        } catch {
          /* no log */
        }
      }
      const summary = summarize(raw);
      const arms = [];
      for (const id of Object.keys(GRADERS)) {
        if (raw.ok !== true && raw[id] === undefined) {
          arms.push({ id, ok: null, said: 'not reached' });
          continue;
        }
        const why = unreadableOf(id, summary[id]);
        if (why !== null) {
          unreadable += 1;
          arms.push({ id, ok: null, said: why });
          say(`UNREADABLE ${build.label} ${id}: ${why}`);
          continue;
        }
        const g = grade(id, summary[id]);
        if (!g.ok) failures += 1;
        arms.push({ id, ok: g.ok, failed: g.failed });
        say(`${g.ok ? 'PASS' : 'FAIL'} ${build.label} ${id}: ${GRADERS[id].title}${g.ok ? '' : `; FAILED ${J(g.failed)}`}`);
      }
      const m1 = summary.M1;
      const m6 = summary.M6;
      say(`${build.label} M1 check-to-land over the control client: n=${String(m1.n)} p50=${String(m1.p50)} p99=${String(m1.p99)} max=${String(m1.max)} ms (graded: p99 under ${String(CHECK_TO_LAND_P99_MS)} ms)`);
      say(`${build.label} M1 the spawned fallback list, printed and not graded: ${String(m1.fallbackLanded)} of ${String(m1.fallbackTried)} landed, p50=${String(m1.fallback.p50)} p99=${String(m1.fallback.p99)} max=${String(m1.fallback.max)} ms`);
      say(`${build.label} M6 the say's window, printed and not graded: capture to land p50=${String(m6.captureToLand.p50)} p99=${String(m6.captureToLand.p99)} max=${String(m6.captureToLand.max)} ms; last check to land p50=${String(m6.checkToLand.p50)} p99=${String(m6.checkToLand.p99)} max=${String(m6.checkToLand.max)} ms, over ${String(m6.n)} messages`);
      report.builds.push({ label: build.label, version: build.version, socket, arms, summary, raw: KEEP ? raw : undefined });
    } finally {
      // The server, by its scratch socket name, whatever the drive managed; then
      // every stand-in by the pid it wrote, then the directory (the socket with it).
      spawnSync(build.bin, ['-L', socket, 'kill-server'], { env: tmuxEnv, encoding: 'utf8', timeout: 10_000 });
      left = await endStandins(standinDir);
      if (left > 0) {
        failures += 1;
        say(`FAIL ${build.label}: ${String(left)} stand-in process(es) outlived the run`);
      }
      if (!KEEP) rmSync(dir, { recursive: true, force: true });
      else say(`${build.label}: kept ${dir} (P318_KEEP=1): the stand-ins' logs hold every byte they read`);
    }
  }

  const out = join('/private/tmp', `p318-measure-${String(process.pid)}.json`);
  writeFileSync(out, `${J(report, null, 2)}\n`, { mode: 0o600 });
  say(`report: ${out}`);
  if (failures > 0) {
    say(`FAIL: ${String(failures)} arm(s) failed${unreadable > 0 ? `, ${String(unreadable)} unreadable` : ''}.`);
    process.exit(1);
  }
  if (unreadable > 0) {
    say(`UNREADABLE: ${String(unreadable)} build(s) or arm(s) could not be read; nothing failed.`);
    process.exit(2);
  }
  say('PASS: every arm on every build. No Electron, no door, no agent, no token; every tmux server and stand-in ended.');
  process.exit(0);
}

/**
 * This file run as the entry point, however the path that named it was
 * spelled. Importing it (a grader, a re-derivation) runs NOTHING: on
 * 2026-10-03 the proof builder imported it to read one grader and started a
 * live measurement, a tmux server and two stand-ins it then had to end by
 * hand, so the run is behind this test and never at the top level.
 */
function isEntry() {
  try {
    return process.argv[1] !== undefined && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}
if (isEntry()) {
  if (process.argv.includes('--self-test')) process.exit(selfTest() ? 0 : 1);
  await run();
}
