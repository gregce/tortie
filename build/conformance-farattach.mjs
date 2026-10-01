#!/usr/bin/env node
/**
 * `npm run conformance:farattach`. The cheap gate that keeps Phase 326's
 * promises executable rather than asserted (build/p326/SPEC.md §7, the Phase
 * 326 entry in docs/BACKLOG.md).
 *
 * ## The defect it exists for
 *
 * The first session a person started in a tab on another machine could open on
 * "This session no longer exists" and stay blank while it ran over there. The
 * attach asked THIS MAC'S tmux server for a session on another computer
 * (16 of 16 refusals in Phase 320's logs carried the local branch's own
 * sentence), and it did so because a pass of that machine's list had counted
 * the new session as one Tortie did not create while its `@gmux-id` stamp was
 * still in flight. The phase closes both halves: an attach to a far record
 * never reaches the local branch and waits, bounded, for its create or one
 * fresh list; and a pass never counts, rescues or writes over a session a
 * create in this process is binding, decided by `$-id` and by the list's age,
 * never by name.
 *
 * ## The eleven rules
 *
 *   FA1  In `attachSessionAdmitted`, an `if` testing `remoteRecordOf(` and
 *        `isRemoteRecord(` whose block returns comes before
 *        `this.mustGetSession(` and `tmux.listSessions(`. far-attach.ts imports
 *        nothing from `../tmux` and names no `listSessions(`.
 *   FA2  `this.attachTickets.take(` is the FIRST statement of
 *        `attachSessionAdmitted`, before any `await` and before
 *        `remoteSessionRow(`; `detachSession` calls `invalidate(`;
 *        `beginShutdown` calls `shutdown(`; both holders (`attachTickets`,
 *        `farAttachDeps`) are lazy getters over `…Slot` fields.
 *   FA3  In `attachFarUnbound`, after the statement of its LAST `await`, an
 *        `attachStillWanted(` check precedes `this.attachListedRemote(` with no
 *        `await` between them; `attachStillWanted` reads `holds(`,
 *        `isDestroyed()`, `shuttingDown` and `disposed`.
 *   FA4  `this.attachHost.attach({` carrying `machine` appears exactly once in
 *        core.ts, inside `attachListedRemote`; the immediate branch of
 *        `attachSessionAdmitted` calls `attachListedRemote(`.
 *   FA5  In `remoteCreate`, `beginRemoteCreate(` precedes `noteIssuedRemoteId(`
 *        and `writeRemoteRow(`; ONE `try` block holds `writeRemoteRow(`, the
 *        new-session `execOn(ctx, args`, `for (const option of REMOTE_STAMPS)`
 *        and `startMachineFeed(`, and its `finally` calls `.end()` on that
 *        flight; `.answered(` sits after the `startsWith('$')` test's block and
 *        before the stamp loop.
 *   FA6  In `onePass`, `remoteCreateFlightsFor(` is called with `snapshotAt`
 *        after the list's `await execOn(` and before the parse loop; inside the
 *        `parsed.gmuxId.length === 0` block the `beingBound` test reads
 *        `parsed.tmuxId`, names neither `tmuxName` nor `.name`, and ends in
 *        `continue` before `foreign += 1`, and it is the ONLY way out of that
 *        block before the count (the fix round removed the build's deferral,
 *        which held back another session's rescue; nothing may name
 *        `awaitingAnswer` again); no `seen.set(` occurs in that block; and
 *        `rescuePending` is `unclaimed.length > 0` alone, as at the parent.
 *   FA7  `remoteRecordStatus` answers `'unknown'` on `remoteCreateInFlight(`;
 *        `writeBackCompletedPass` tests `flights.owns(` before
 *        `noteRemoteRowSeen(record.id, pass.absentStatus`;
 *        `dropProvenAbsentCreates` tests `.owns(` before `clearIssuedRemoteId(`.
 *   FA8  The core.ts methods (and functions) that call `isRemoteSessionId(` or
 *        `remoteSessionRow(` and call none of `remoteRecordOf(`,
 *        `isRemoteRecord(` or a `machineId !==` test are a SUBSET of
 *        {handleUnexpectedAttachExit, renameSessionAdmitted, killSessionAdmitted,
 *        resumeSessionInPlace}, and `attachSessionAdmitted` is not among them.
 *        Pinned BY METHOD NAME, never by line, so a rebase that moves lines
 *        cannot turn it red and a new feed-only method cannot pass. It can
 *        shrink; it cannot grow.
 *   FA9  `REMOTE_ATTACH_BIND_WAIT_MS` <= `MUTATION_JOIN_DEADLINE_MS` and
 *        >= 3,000; `FLIGHT_MEMORY_MS` >= 2 x `REMOTE_POLL_TIMEOUT_MS`. All four
 *        are read from their OWN files as numeric literals, by value.
 *   FA10 `ATTACH_NOT_HEARD` is exported from remote-copy.ts, is used exactly
 *        once under src/main (imports and re-exports aside), in far-attach.ts,
 *        as the message of a `'TMUX_UNREACHABLE'` error; it holds none of
 *        pane, window, prefix, tmux, server; and build/assert-bundle-refusals.mjs
 *        pins it as `machine.attach-not-heard` with fragments it contains.
 *   FA11 create-inflight.ts has no runtime import (type imports only), and
 *        pane-env-rescue.ts names no flight function.
 *
 * ## How it reads
 *
 * Every file is read with its comments blanked first (`stripComments` from
 * build/scan-source.mjs, which keeps every offset), so a clause left only in
 * prose never passes. Function bodies are read by matching braces
 * (`functionBodyOf`, `blockAt`, `closeOf`); class methods are read by the
 * method reader below, which skips a TypeScript return type before it looks for
 * the body, and which is proved on its own fixtures at the top of every run.
 *
 * `build/p326/ablation.mjs` (`npm run ablation:p326`) is the attack beside it:
 * it breaks the shipping source one clause at a time in a clone and requires
 * the rule that owns the clause red and every other rule as it was.
 *
 * About one second. It spawns nothing, opens no socket, starts no tmux, no ssh
 * and no Electron, and reads nothing outside the tree it is pointed at.
 *
 * Usage:
 *   node build/conformance-farattach.mjs                 this worktree
 *   node build/conformance-farattach.mjs --root <dir>    another tree (the
 *                                                        ablation's clone)
 *   node build/conformance-farattach.mjs --json          one JSON line of
 *                                                        {rule: [problems]}
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  blockAt,
  callArguments,
  closeOf,
  functionBodyOf,
  statementEnd,
  stripComments
} from './scan-source.mjs';

const TAG = '[conformance:farattach]';

function argValue(flag) {
  const at = process.argv.indexOf(flag);
  return at === -1 ? null : (process.argv[at + 1] ?? null);
}
const ROOT = resolve(argValue('--root') ?? join(dirname(fileURLToPath(import.meta.url)), '..'));
const AS_JSON = process.argv.includes('--json');

export const FILES = Object.freeze({
  core: 'src/main/sessions/core.ts',
  far: 'src/main/sessions/far-attach.ts',
  ledger: 'src/main/sessions/mutation-ledger.ts',
  remote: 'src/main/machines/remote-sessions.ts',
  inflight: 'src/main/machines/create-inflight.ts',
  copy: 'src/main/machines/remote-copy.ts',
  rescue: 'src/main/machines/pane-env-rescue.ts',
  refusals: 'build/assert-bundle-refusals.mjs'
});

export const RULES = ['FA1', 'FA2', 'FA3', 'FA4', 'FA5', 'FA6', 'FA7', 'FA8', 'FA9', 'FA10', 'FA11'];

/** The four feed-only methods that remain, pinned by NAME (SPEC §2 item 12). */
export const FEED_ONLY_ALLOWED = Object.freeze([
  'handleUnexpectedAttachExit',
  'renameSessionAdmitted',
  'killSessionAdmitted',
  'resumeSessionInPlace'
]);

/**
 * The fewest members the reader may find in core.ts before it is not trusted.
 * 85 at this phase's head (the class's own members and the file's functions,
 * nested helpers folded into the member that holds them); a reader that broke
 * would find a handful.
 */
const MEMBER_FLOOR = 60;

/** Words a person must never read about a session (CLAUDE.md, UI rules). */
const TMUX_WORDS = ['pane', 'window', 'prefix', 'tmux', 'server'];

// ---------------------------------------------------------------------------
// The readers
// ---------------------------------------------------------------------------

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * The index of the `{` that opens the body of a function or method whose
 * parameter list closes at `closeParen`, or -1. A TypeScript return type is
 * skipped: angle brackets are counted (an arrow's `>` never closes one), and an
 * object type written at the top of the annotation is skipped by its braces.
 */
export function bodyOpenAfter(code, closeParen) {
  let i = closeParen + 1;
  while (i < code.length && /\s/.test(code[i])) i += 1;
  if (code[i] === '{') return i;
  if (code[i] !== ':') return -1;
  i += 1;
  let angle = 0;
  let depth = 0;
  let sawType = false;
  for (; i < code.length; i += 1) {
    const c = code[i];
    if (/\s/.test(c)) continue;
    if (c === '{') {
      if (angle === 0 && depth === 0 && sawType) return i;
      // An object type literal inside the annotation: skip it whole.
      const end = closeOf(code, i);
      if (end === -1) return -1;
      i = end;
      sawType = true;
      continue;
    }
    if (c === '(' || c === '[') depth += 1;
    else if (c === ')' || c === ']') depth -= 1;
    else if (c === '<') angle += 1;
    else if (c === '>' && code[i - 1] !== '=' && angle > 0) angle -= 1;
    else if ((c === ';' || c === '}') && angle === 0 && depth === 0) return -1;
    if (depth < 0) return -1;
    sawType = true;
  }
  return -1;
}

const MEMBER_HEADER =
  /^[ \t]+(?:(?:private|public|protected|static|async|override|readonly)\s+)*(?:(?:get|set)\s+)?([A-Za-z_$][\w$]*)\s*(?:<[^>\n]*>)?\s*\(/gm;
const FUNCTION_HEADER = /^(?:export\s+)?(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)\s*(?:<[^>\n]*>)?\s*\(/gm;
const NOT_MEMBERS = new Set(['if', 'for', 'while', 'switch', 'catch', 'return', 'function', 'await', 'typeof', 'new', 'throw', 'else', 'do', 'super', 'void']);

/**
 * Every method (class member at any indentation) and every top-level function
 * declaration in `code`, as `{ name, start, open, body }`, where `body` is the
 * text between the matching braces and `open` is the index of the `{`. A header
 * that turns out to be a call statement (`foo(x);`) is skipped, because no body
 * follows its parameter list.
 */
export function membersOf(code) {
  const out = [];
  for (const re of [MEMBER_HEADER, FUNCTION_HEADER]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(code)) !== null) {
      const name = m[1];
      if (NOT_MEMBERS.has(name)) continue;
      const paren = m.index + m[0].length - 1;
      const close = closeOf(code, paren);
      if (close === -1) continue;
      const open = bodyOpenAfter(code, close);
      if (open === -1) continue;
      const body = innerOf(code, open);
      if (body === null) continue;
      if (out.some((o) => o.open === open)) continue;
      out.push({ name, start: m.index, open, body });
    }
  }
  out.sort((a, b) => a.start - b.start);
  // A header inside another member's body (an object literal's method, a
  // nested helper) belongs to that member: its calls are the outer member's
  // calls, and it is not a member of its own.
  return out.filter((m) => !out.some((o) => o !== m && m.start > o.open && m.start < o.open + o.body.length + 1));
}

/**
 * The text between the brace at `open` and the one matching it, quotes
 * respected, or null. `blockAt` counts a brace inside a string (`'{'`) and so
 * runs past the end of a body that holds one; `closeOf` does not.
 */
export function innerOf(code, open) {
  const close = closeOf(code, open);
  return close === -1 ? null : code.slice(open + 1, close);
}

/**
 * The body text of ONE named method or function, or null. The quote-aware
 * member reader answers first; `functionBodyOf` is asked for a declaration
 * shape it does not read.
 */
export function bodyOf(code, name) {
  const one = membersOf(code).find((m) => m.name === name);
  if (one !== undefined) return one.body;
  const fn = functionBodyOf(code, name);
  return fn === null ? null : fn.slice(1, -1);
}

/**
 * Every `if (` in `code` as `{ at, cond, then, thenStart, end }`: the condition
 * text, the consequence (a block's inner text, or the single statement), and
 * the index just past the consequence.
 */
export function ifStatements(code) {
  const out = [];
  const re = /\bif\s*\(/g;
  let m;
  while ((m = re.exec(code)) !== null) {
    const paren = m.index + m[0].length - 1;
    const close = closeOf(code, paren);
    if (close === -1) continue;
    const cond = code.slice(paren + 1, close);
    let i = close + 1;
    while (i < code.length && /\s/.test(code[i])) i += 1;
    if (code[i] === '{') {
      const end = closeOf(code, i);
      if (end === -1) continue;
      out.push({ at: m.index, cond, then: code.slice(i + 1, end), thenStart: i, end: end + 1 });
    } else {
      const end = statementEnd(code, i);
      if (end === -1) continue;
      out.push({ at: m.index, cond, then: code.slice(i, end), thenStart: i, end });
    }
  }
  return out;
}

/** The numeric value of `export const NAME = <literal>;` in `code`, or null when it is not a literal. */
export function numericConst(code, name) {
  const m = new RegExp(`\\bconst\\s+${escapeRe(name)}\\s*(?::\\s*number\\s*)?=\\s*([0-9][0-9_]*)\\s*;`).exec(code);
  if (m === null) return null;
  const n = Number(m[1].replace(/_/g, ''));
  return Number.isFinite(n) ? n : null;
}

/** The concatenated string literal assigned to `export const NAME`, or null. */
export function stringConst(raw, name) {
  const m = new RegExp(`\\bexport\\s+const\\s+${escapeRe(name)}\\s*(?::\\s*string\\s*)?=`).exec(raw);
  if (m === null) return null;
  const end = statementEnd(raw, m.index + m[0].length);
  if (end === -1) return null;
  const rhs = raw.slice(m.index + m[0].length, end - 1);
  const pieces = [];
  const lit = /'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"|`((?:[^`\\$]|\\.)*)`/g;
  let p;
  let rest = rhs;
  while ((p = lit.exec(rhs)) !== null) {
    pieces.push((p[1] ?? p[2] ?? p[3]).replace(/\\(.)/g, '$1'));
    rest = rest.replace(p[0], '');
  }
  // Only literals joined by `+` count; anything else is not a sentence this gate can read.
  if (!/^[\s+]*$/.test(rest)) return null;
  return pieces.length === 0 ? null : pieces.join('');
}

/** The index of the nearest `(` before `at` that is still open at `at`, or -1. */
function enclosingParen(code, at) {
  let depth = 0;
  for (let i = at - 1; i >= 0; i -= 1) {
    const c = code[i];
    if (c === ')') depth += 1;
    else if (c === '(') {
      if (depth === 0) return i;
      depth -= 1;
    }
  }
  return -1;
}

/** The nearest `{` before `at` that is still open at `at`, or -1. */
function enclosingBrace(code, at) {
  let depth = 0;
  for (let i = at - 1; i >= 0; i -= 1) {
    const c = code[i];
    if (c === '}') depth += 1;
    else if (c === '{') {
      if (depth === 0) return i;
      depth -= 1;
    }
  }
  return -1;
}

/** Remove import statements and `export … from` re-exports, so a count reads uses only. */
function withoutImports(code) {
  return code
    .replace(/\bimport\s+(?:type\s+)?[\s\S]*?\bfrom\s*['"][^'"]+['"]\s*;?/g, (s) => ' '.repeat(s.length))
    .replace(/\bexport\s+(?:type\s+)?\{[\s\S]*?\}\s*from\s*['"][^'"]+['"]\s*;?/g, (s) => ' '.repeat(s.length));
}

// ---------------------------------------------------------------------------
// The rules. Each takes the stripped sources and answers a list of problems.
// ---------------------------------------------------------------------------

const has = (text, needle) => text.includes(needle);

function ruleFA1(src) {
  const out = [];
  const body = bodyOf(src.core, 'attachSessionAdmitted');
  if (body === null) return ['core.ts declares no attachSessionAdmitted'];
  const must = body.indexOf('this.mustGetSession(');
  const list = body.indexOf('tmux.listSessions(');
  if (must === -1 || list === -1) {
    out.push('attachSessionAdmitted no longer holds the local branch (this.mustGetSession( and tmux.listSessions()), which D1 keeps byte-identical');
  }
  const recAt = body.indexOf('remoteRecordOf(');
  const guard = ifStatements(body).find(
    (s) =>
      has(s.cond, 'isRemoteRecord(') &&
      (has(s.cond, 'remoteRecordOf(') || (recAt !== -1 && recAt < s.at)) &&
      /\breturn\b/.test(s.then)
  );
  if (guard === undefined) {
    out.push('attachSessionAdmitted has no `if` testing remoteRecordOf( and isRemoteRecord( whose block returns, so a session on another machine can reach this Mac\'s own list');
  } else {
    if (must !== -1 && guard.end > must) out.push('the far-record `if` in attachSessionAdmitted does not end before this.mustGetSession(');
    if (list !== -1 && guard.end > list) out.push('the far-record `if` in attachSessionAdmitted does not end before tmux.listSessions(');
  }
  if (src.far === null) {
    out.push(`${FILES.far} does not exist`);
  } else {
    if (/\bfrom\s*['"]\.\.\/tmux(?:\/[^'"]*)?['"]|\b(?:import|require)\s*\(\s*['"]\.\.\/tmux/.test(src.far)) {
      out.push('far-attach.ts imports from ../tmux, which is this Mac\'s server');
    }
    if (/\blistSessions\s*\(/.test(src.far)) out.push('far-attach.ts names listSessions(');
  }
  return out;
}

function lazyHolder(core, holder, slot, type) {
  const out = [];
  if (!new RegExp(`\\b${slot}\\s*:\\s*${type}\\s*\\|\\s*null\\s*=\\s*null\\s*;`).test(core)) {
    out.push(`core.ts has no \`${slot}: ${type} | null = null\` field`);
  }
  const getter = membersOf(core).find((m) => m.name === holder && new RegExp(`\\bget\\s+${holder}\\s*\\(`).test(core.slice(m.start, m.open)));
  if (getter === undefined) {
    out.push(`core.ts has no lazy getter \`get ${holder}()\``);
  } else if (!new RegExp(`this\\.${slot}\\s*(?:\\?\\?=|=)`).test(getter.body) || !new RegExp(`this\\.${slot}\\b`).test(getter.body)) {
    out.push(`the ${holder} getter does not fill this.${slot} on first use`);
  }
  if (new RegExp(`^[ \\t]+(?:(?:private|public|protected|readonly)\\s+)*${holder}\\s*(?::[^=\\n]*)?=\\s*new\\b`, 'm').test(core)) {
    out.push(`core.ts initialises ${holder} in a field, which an Object.create seam object never runs`);
  }
  return out;
}

function ruleFA2(src) {
  const out = [];
  const body = bodyOf(src.core, 'attachSessionAdmitted');
  if (body === null) return ['core.ts declares no attachSessionAdmitted'];
  const first = /^\s*(?:(?:const|let)\s+[A-Za-z_$][\w$]*\s*=\s*)?this\.attachTickets\.take\(/.test(body);
  if (!first) out.push('this.attachTickets.take( is not the first statement of attachSessionAdmitted');
  const take = body.indexOf('this.attachTickets.take(');
  const awaitAt = body.search(/\bawait\b/);
  const rowAt = body.indexOf('remoteSessionRow(');
  if (take === -1) out.push('attachSessionAdmitted takes no attach ticket');
  else {
    if (awaitAt !== -1 && awaitAt < take) out.push('an await in attachSessionAdmitted comes before its ticket is taken');
    if (rowAt !== -1 && rowAt < take) out.push('remoteSessionRow( in attachSessionAdmitted comes before its ticket is taken');
  }
  const detach = bodyOf(src.core, 'detachSession');
  if (detach === null || !has(detach, 'this.attachTickets.invalidate(')) out.push('detachSession does not call this.attachTickets.invalidate(');
  const shutdown = bodyOf(src.core, 'beginShutdown');
  if (shutdown === null || !has(shutdown, 'this.attachTickets.shutdown(')) out.push('beginShutdown does not call this.attachTickets.shutdown(');
  out.push(...lazyHolder(src.core, 'attachTickets', 'attachTicketsSlot', 'AttachTickets'));
  out.push(...lazyHolder(src.core, 'farAttachDeps', 'farAttachDepsSlot', 'FarAttachDeps'));
  return out;
}

function ruleFA3(src) {
  const out = [];
  const body = bodyOf(src.core, 'attachFarUnbound');
  if (body === null) return ['core.ts declares no attachFarUnbound'];
  const awaits = [...body.matchAll(/\bawait\b/g)].map((m) => m.index);
  if (awaits.length === 0) out.push('attachFarUnbound awaits nothing, so it does not wait');
  const lastAwait = awaits.length === 0 ? 0 : awaits[awaits.length - 1];
  const after = statementEnd(body, lastAwait);
  const from = after === -1 ? lastAwait : after;
  const tail = body.slice(from);
  const check = tail.indexOf('attachStillWanted(');
  const attach = tail.indexOf('this.attachListedRemote(');
  if (attach === -1) out.push('attachFarUnbound does not call this.attachListedRemote( after its last await');
  if (check === -1) out.push('attachFarUnbound checks attachStillWanted( nowhere after its last await');
  if (check !== -1 && attach !== -1 && check > attach) out.push('attachFarUnbound calls attachListedRemote( before its attachStillWanted( check');
  if (check !== -1 && attach !== -1 && /\bawait\b/.test(tail.slice(check, attach))) out.push('an await sits between the attachStillWanted( check and attachListedRemote(');
  const guard = ifStatements(tail).find((s) => has(s.cond, 'attachStillWanted('));
  if (check !== -1 && guard === undefined) out.push('the attachStillWanted( call after the last await is not the condition of an `if`');
  else if (guard !== undefined && !/\breturn\b/.test(guard.then)) out.push('the attachStillWanted( guard does not return');
  const wanted = bodyOf(src.core, 'attachStillWanted');
  if (wanted === null) out.push('core.ts declares no attachStillWanted');
  else {
    for (const needle of ['holds(', 'isDestroyed()', 'shuttingDown', 'disposed']) {
      if (!has(wanted, needle)) out.push(`attachStillWanted does not read ${needle}`);
    }
  }
  return out;
}

function ruleFA4(src) {
  const out = [];
  const core = src.core;
  const attaches = [];
  const re = /this\.attachHost\.attach\(\s*\{/g;
  let m;
  while ((m = re.exec(core)) !== null) {
    const open = m.index + m[0].length - 1;
    const inner = innerOf(core, open) ?? blockAt(core, open) ?? '';
    if (/\bmachine\b/.test(inner)) attaches.push(m.index);
  }
  if (attaches.length !== 1) {
    out.push(`this.attachHost.attach({ … machine … }) appears ${String(attaches.length)} times in core.ts, not exactly once`);
  }
  const listed = membersOf(core).find((x) => x.name === 'attachListedRemote');
  if (listed === undefined) out.push('core.ts declares no attachListedRemote');
  else if (attaches.length >= 1 && !attaches.every((at) => at > listed.open && at < listed.open + listed.body.length + 1)) {
    out.push('the remote attach composition is not inside attachListedRemote');
  }
  const body = bodyOf(core, 'attachSessionAdmitted');
  if (body === null) out.push('core.ts declares no attachSessionAdmitted');
  else {
    const rowAt = body.indexOf('remoteSessionRow(');
    const call = body.indexOf('this.attachListedRemote(');
    const local = body.indexOf('this.mustGetSession(');
    if (call === -1) out.push('the immediate remote branch of attachSessionAdmitted does not call attachListedRemote(');
    else if (rowAt === -1 || call < rowAt || (local !== -1 && call > local)) out.push('attachListedRemote( in attachSessionAdmitted is not in the remoteSessionRow branch');
  }
  return out;
}

/** The try statement's pieces starting at the `try` keyword `at`. */
function tryStatement(code, at) {
  const open = code.indexOf('{', at);
  if (open === -1) return null;
  const close = closeOf(code, open);
  if (close === -1) return null;
  const block = code.slice(open + 1, close);
  let i = close + 1;
  const skip = () => {
    while (i < code.length && /\s/.test(code[i])) i += 1;
  };
  skip();
  if (code.startsWith('catch', i)) {
    i += 5;
    skip();
    if (code[i] === '(') {
      const c = closeOf(code, i);
      if (c === -1) return null;
      i = c + 1;
      skip();
    }
    if (code[i] !== '{') return null;
    const c = closeOf(code, i);
    if (c === -1) return null;
    i = c + 1;
    skip();
  }
  let fin = null;
  if (code.startsWith('finally', i)) {
    i += 7;
    skip();
    if (code[i] === '{') {
      const c = closeOf(code, i);
      if (c !== -1) fin = code.slice(i + 1, c);
    }
  }
  return { at, block, fin };
}

function ruleFA5(src) {
  const out = [];
  const body = bodyOf(src.remote, 'remoteCreate');
  if (body === null) return ['remote-sessions.ts declares no remoteCreate'];
  const flightMatch = /\b(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*beginRemoteCreate\(/.exec(body);
  const begin = body.indexOf('beginRemoteCreate(');
  const note = body.indexOf('noteIssuedRemoteId(');
  const write = body.indexOf('writeRemoteRow(');
  if (begin === -1 || flightMatch === null) return ['remoteCreate registers no flight with `const <name> = beginRemoteCreate(`'];
  const flight = flightMatch[1];
  if (note === -1 || begin > note) out.push('beginRemoteCreate( does not come before noteIssuedRemoteId( in remoteCreate');
  if (write === -1 || begin > write) out.push('beginRemoteCreate( does not come before writeRemoteRow( in remoteCreate');
  const needles = [
    ['writeRemoteRow(', /\bwriteRemoteRow\(/],
    ['the new-session execOn(ctx, args', /\bexecOn\(\s*ctx\s*,\s*args\b/],
    ['for (const option of REMOTE_STAMPS)', /\bfor\s*\(\s*const\s+option\s+of\s+REMOTE_STAMPS\s*\)/],
    ['startMachineFeed(', /\bstartMachineFeed\(/]
  ];
  const tries = [...body.matchAll(/\btry\s*\{/g)].map((m) => tryStatement(body, m.index)).filter((t) => t !== null);
  const holding = tries.filter((t) => needles.every(([, re]) => re.test(t.block)));
  if (holding.length === 0) {
    out.push(`no one try block in remoteCreate holds all of ${needles.map(([n]) => n).join(', ')}`);
  } else if (!holding.some((t) => t.fin !== null && new RegExp(`\\b${escapeRe(flight)}\\.end\\(\\s*\\)`).test(t.fin))) {
    out.push(`the try block holding the create has no finally calling ${flight}.end()`);
  }
  const answered = body.indexOf(`${flight}.answered(`);
  const dollar = ifStatements(body).find((s) => /startsWith\(\s*'\$'\s*\)/.test(s.cond));
  const stamps = body.search(/\bfor\s*\(\s*const\s+option\s+of\s+REMOTE_STAMPS\s*\)/);
  if (answered === -1) out.push(`remoteCreate never calls ${flight}.answered(`);
  else {
    if (dollar === undefined) out.push("remoteCreate has no `startsWith('$')` test");
    else if (answered < dollar.end) out.push(`${flight}.answered( does not sit after the startsWith('$') test's block`);
    if (stamps === -1 || answered > stamps) out.push(`${flight}.answered( does not sit before the stamp loop`);
  }
  return out;
}

function ruleFA6(src) {
  const out = [];
  const body = bodyOf(src.remote, 'onePass');
  if (body === null) return ['remote-sessions.ts declares no onePass'];
  const listAt = body.search(/\bawait\s+execOn\(\s*ctx\s*,\s*remoteListArgs\(/);
  const parseAt = body.search(/\bfor\s*\(\s*const\s+line\s+of\s+printed\.split\(/);
  const flightsAt = body.indexOf('remoteCreateFlightsFor(');
  if (flightsAt === -1) out.push('onePass never asks remoteCreateFlightsFor(');
  else {
    const args = callArguments(body, body.indexOf('(', flightsAt));
    if (!args.some((a) => /^snapshotAt$/.test(a))) out.push('remoteCreateFlightsFor( in onePass is not called with snapshotAt');
    if (listAt === -1 || flightsAt < listAt) out.push("remoteCreateFlightsFor( is read before the list's await execOn(");
    if (parseAt === -1 || flightsAt > parseAt) out.push('remoteCreateFlightsFor( is read after the parse loop begins');
  }
  const blockIf = ifStatements(body).find((s) => /\bparsed\.gmuxId\.length\s*===\s*0\b/.test(s.cond));
  if (blockIf === undefined) return [...out, 'onePass has no `parsed.gmuxId.length === 0` block'];
  const block = blockIf.then;
  const foreignAt = block.search(/\bforeign\s*\+=\s*1\b/);
  if (foreignAt === -1) out.push('the unstamped block no longer counts foreign += 1');
  const ifs = ifStatements(block);
  const bound = ifs.find((s) => has(s.cond, '.beingBound'));
  if (bound === undefined) out.push('the unstamped block has no beingBound test');
  else {
    const hasAt = bound.cond.indexOf('.beingBound.has(');
    const arg = hasAt === -1 ? [] : callArguments(bound.cond, bound.cond.indexOf('(', hasAt + '.beingBound.has'.length));
    if (arg.length !== 1 || arg[0] !== 'parsed.tmuxId') out.push(`the beingBound test reads ${JSON.stringify(arg.join(', '))}, not parsed.tmuxId`);
    if (/\btmuxName\b|\.name\b/.test(bound.cond)) out.push('the beingBound test names tmuxName or .name, which is deciding by name');
    if (!/\bcontinue\b/.test(bound.then)) out.push('the beingBound test does not end in continue');
    if (foreignAt !== -1 && bound.at > foreignAt) out.push('the beingBound test comes after foreign += 1');
  }
  // THE FIX ROUND. The build also DEFERRED every never-probed row while a create
  // on the machine awaited its answer, and that held back the rescue of another
  // lost-answer session of this run by up to the waiting create's timeout, which
  // is worse than the parent. It was removed rather than repaired, so the skip
  // above is the ONLY arm that may leave this block before `foreign += 1`: any
  // other early `continue` there is a deferral coming back.
  if (foreignAt !== -1) {
    const early = ifs.filter((s) => s.at < foreignAt && s !== bound && /\bcontinue\b/.test(s.then));
    for (const one of early) out.push(`the unstamped block skips a row before foreign += 1 on \`${one.cond.replace(/\s+/g, ' ').trim().slice(0, 80)}\`, which is a deferral; the beingBound test is the only skip`);
    // A `continue` before the count that sits in no `if` at all skips every row.
    let bare = block.slice(0, foreignAt);
    for (const one of ifs.filter((s) => s.at < foreignAt)) bare = `${bare.slice(0, one.at)}${' '.repeat(Math.min(one.end, bare.length) - one.at)}${bare.slice(Math.min(one.end, bare.length))}`;
    if (/\bcontinue\b/.test(bare)) out.push('a bare continue leaves the unstamped block before foreign += 1');
  }
  for (const [label, text] of [['remote-sessions.ts', src.remote], ['create-inflight.ts', src.inflight]]) {
    if (text !== null && /\bawaitingAnswer\b/.test(text)) out.push(`${label} names awaitingAnswer, the deferral the fix round removed`);
  }
  if (/\bseen\.set\(/.test(block)) out.push('seen.set( occurs inside the unstamped block, so an unstamped row could be shown');
  const pending = /\bconst\s+rescuePending\s*=\s*([^;]+);/.exec(body);
  if (pending === null) out.push('onePass has no `const rescuePending = …;`');
  else if (!/^\s*unclaimed\.length\s*>\s*0\s*$/.test(pending[1])) {
    out.push(`rescuePending reads \`${pending[1].replace(/\s+/g, ' ').trim()}\`, not \`unclaimed.length > 0\` alone as at the parent`);
  }
  return out;
}

function ruleFA7(src) {
  const out = [];
  const status = bodyOf(src.remote, 'remoteRecordStatus');
  if (status === null) out.push('remote-sessions.ts declares no remoteRecordStatus');
  else if (!ifStatements(status).some((s) => has(s.cond, 'remoteCreateInFlight(') && /\breturn\s+'unknown'/.test(s.then))) {
    out.push("remoteRecordStatus does not answer 'unknown' on remoteCreateInFlight(");
  }
  const write = bodyOf(src.remote, 'writeBackCompletedPass');
  if (write === null) out.push('remote-sessions.ts declares no writeBackCompletedPass');
  else {
    const owns = write.search(/\bflights\.owns\(/);
    const absent = write.search(/\bnoteRemoteRowSeen\(\s*record\.id\s*,\s*pass\.absentStatus\b/);
    if (absent === -1) out.push('writeBackCompletedPass no longer writes pass.absentStatus over a record');
    if (owns === -1) out.push('writeBackCompletedPass never tests flights.owns(');
    else if (absent !== -1 && owns > absent) out.push('flights.owns( is tested after the absent write in writeBackCompletedPass');
    const skip = ifStatements(write).find((s) => /\bflights\.owns\(/.test(s.cond));
    if (owns !== -1 && (skip === undefined || !/\bcontinue\b/.test(skip.then))) out.push('the flights.owns( test in writeBackCompletedPass does not skip with continue');
  }
  const drop = bodyOf(src.remote, 'dropProvenAbsentCreates');
  if (drop === null) out.push('remote-sessions.ts declares no dropProvenAbsentCreates');
  else {
    const owns = drop.search(/\.owns\(/);
    const clear = drop.indexOf('clearIssuedRemoteId(');
    if (clear === -1) out.push('dropProvenAbsentCreates no longer clears an issued id');
    if (owns === -1) out.push('dropProvenAbsentCreates never tests .owns(');
    else if (clear !== -1 && owns > clear) out.push('.owns( is tested after clearIssuedRemoteId( in dropProvenAbsentCreates');
    const skip = ifStatements(drop).find((s) => /\.owns\(/.test(s.cond));
    if (owns !== -1 && (skip === undefined || !/\bcontinue\b/.test(skip.then))) out.push('the .owns( test in dropProvenAbsentCreates does not skip with continue');
  }
  return out;
}

/** The FA8 set: members that decide remote-ness from the feed maps alone. */
export function feedOnlyMembers(core) {
  const names = new Set();
  for (const m of membersOf(core)) {
    const feed = /\bisRemoteSessionId\(|\bremoteSessionRow\(/.test(m.body);
    const record = /\bremoteRecordOf\(|\bisRemoteRecord\(|\bmachineId\s*!==/.test(m.body);
    if (feed && !record) names.add(m.name);
  }
  return [...names];
}

function ruleFA8(src) {
  const out = [];
  const members = membersOf(src.core);
  // The reader must find what is known to be there, or a reader that found
  // nothing would read as "the set is empty" and pass.
  // Not the four allowed names: the set may shrink, and a method that leaves
  // the file must not turn this rule red.
  for (const known of ['attachSessionAdmitted', 'detachSession', 'beginShutdown', 'removeSession', 'restoreSessionAdmitted']) {
    if (!members.some((m) => m.name === known)) out.push(`the method reader found no ${known} in core.ts, so it cannot be trusted to find a new one`);
  }
  if (members.length < MEMBER_FLOOR) out.push(`the method reader found ${String(members.length)} members in core.ts, fewer than the floor of ${String(MEMBER_FLOOR)}`);
  const set = feedOnlyMembers(src.core);
  const extra = set.filter((n) => !FEED_ONLY_ALLOWED.includes(n));
  if (extra.length > 0) out.push(`core.ts decides remote-ness from the feed maps alone in ${extra.join(', ')}; the set may shrink and may not grow`);
  if (set.includes('attachSessionAdmitted')) out.push('attachSessionAdmitted decides remote-ness from the feed maps alone');
  return out;
}

function ruleFA9(src) {
  const out = [];
  const bound = src.far === null ? null : numericConst(src.far, 'REMOTE_ATTACH_BIND_WAIT_MS');
  const join = numericConst(src.ledger, 'MUTATION_JOIN_DEADLINE_MS');
  const memory = src.inflight === null ? null : numericConst(src.inflight, 'FLIGHT_MEMORY_MS');
  const poll = numericConst(src.remote, 'REMOTE_POLL_TIMEOUT_MS');
  if (bound === null) out.push('REMOTE_ATTACH_BIND_WAIT_MS is not a numeric literal in far-attach.ts');
  if (join === null) out.push('MUTATION_JOIN_DEADLINE_MS is not a numeric literal in mutation-ledger.ts');
  if (memory === null) out.push('FLIGHT_MEMORY_MS is not a numeric literal in create-inflight.ts');
  if (poll === null) out.push('REMOTE_POLL_TIMEOUT_MS is not a numeric literal in remote-sessions.ts');
  if (bound !== null && join !== null && bound > join) out.push(`REMOTE_ATTACH_BIND_WAIT_MS ${String(bound)} is more than MUTATION_JOIN_DEADLINE_MS ${String(join)}, so a waiting attach could hold a quit`);
  if (bound !== null && bound < 3000) out.push(`REMOTE_ATTACH_BIND_WAIT_MS ${String(bound)} is under 3,000`);
  if (memory !== null && poll !== null && memory < 2 * poll) out.push(`FLIGHT_MEMORY_MS ${String(memory)} is under twice REMOTE_POLL_TIMEOUT_MS ${String(poll)}`);
  return out;
}

function listTs(dir) {
  const out = [];
  let names = [];
  try {
    names = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of names) {
    const path = join(dir, name);
    let st;
    try {
      st = statSync(path);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      if (name === '__tests__' || name === 'node_modules') continue;
      out.push(...listTs(path));
    } else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) && !/\.d\.ts$/.test(name)) out.push(path);
  }
  return out;
}

function ruleFA10(src, raw) {
  const out = [];
  const sentence = stringConst(raw.copy ?? '', 'ATTACH_NOT_HEARD');
  if (sentence === null) return ['remote-copy.ts exports no ATTACH_NOT_HEARD sentence made of string literals'];
  for (const word of TMUX_WORDS) {
    if (new RegExp(`\\b${word}`, 'i').test(sentence)) out.push(`ATTACH_NOT_HEARD holds the word "${word}"`);
  }
  const uses = [];
  for (const path of listTs(join(ROOT, 'src', 'main'))) {
    const rel = relative(ROOT, path);
    const text = readFileSync(path, 'utf8');
    if (!text.includes('ATTACH_NOT_HEARD')) continue;
    const code = withoutImports(stripComments(text));
    const re = /\bATTACH_NOT_HEARD\b/g;
    let m;
    while ((m = re.exec(code)) !== null) {
      // The declaration itself is not a use.
      if (rel === FILES.copy && /export\s+const\s+$/.test(code.slice(Math.max(0, m.index - 20), m.index))) continue;
      uses.push({ rel, at: m.index, code });
    }
  }
  if (uses.length !== 1) out.push(`ATTACH_NOT_HEARD is used ${String(uses.length)} times under src/main (${[...new Set(uses.map((u) => u.rel))].join(', ') || 'nowhere'}), not exactly once`);
  const one = uses.find((u) => u.rel === FILES.far);
  if (one === undefined) out.push('ATTACH_NOT_HEARD is not used in far-attach.ts');
  else {
    const paren = enclosingParen(one.code, one.at);
    const args = paren === -1 ? [] : callArguments(one.code, paren);
    if (args[0] !== "'TMUX_UNREACHABLE'" || args[1] !== 'ATTACH_NOT_HEARD') {
      out.push(`ATTACH_NOT_HEARD is not the message of a 'TMUX_UNREACHABLE' error in far-attach.ts (the call reads ${JSON.stringify(args.slice(0, 2))})`);
    }
  }
  const pins = raw.refusals ?? '';
  const idAt = pins.indexOf("id: 'machine.attach-not-heard'");
  if (idAt === -1) out.push('build/assert-bundle-refusals.mjs has no entry machine.attach-not-heard');
  else {
    const open = enclosingBrace(pins, idAt);
    const entry = open === -1 ? '' : (innerOf(pins, open) ?? '');
    if (!/source:\s*'src\/main\/machines\/remote-copy\.ts'/.test(entry)) out.push('the machine.attach-not-heard entry does not name src/main/machines/remote-copy.ts as its source');
    const fragAt = entry.indexOf('fragments:');
    const arrOpen = fragAt === -1 ? -1 : entry.indexOf('[', fragAt);
    const arrClose = arrOpen === -1 ? -1 : closeOf(entry, arrOpen);
    const arr = arrClose === -1 ? '' : entry.slice(arrOpen + 1, arrClose);
    const fragments = [...arr.matchAll(/'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"/g)].map((f) => (f[1] ?? f[2]).replace(/\\(.)/g, '$1'));
    if (fragments.length === 0) out.push('the machine.attach-not-heard entry names no fragments');
    for (const f of fragments) {
      if (!sentence.includes(f)) out.push(`the pinned fragment ${JSON.stringify(f)} is not in ATTACH_NOT_HEARD`);
    }
  }
  return out;
}

/**
 * Every static import statement in `code`, with whether it is type-only:
 * `import type …`, or `import { type A, type B } from …` with every specifier
 * typed. A side-effect import (`import './x'`) is a runtime import.
 */
export function importClauses(code) {
  const out = [];
  const re = /(?:^|[;\n])\s*(import\b(?!\s*\()\s*([\s\S]*?)(?:\bfrom\s*)?(['"])[^'"\n]+\3)/g;
  let m;
  while ((m = re.exec(code)) !== null) {
    const clause = m[2].trim();
    let typeOnly = false;
    if (/^type\b/.test(clause)) typeOnly = true;
    else if (/^\{[\s\S]*\}$/.test(clause)) {
      const specs = clause.slice(1, -1).split(',').map((s) => s.trim()).filter((s) => s !== '');
      typeOnly = specs.length > 0 && specs.every((s) => /^type\s/.test(s));
    }
    out.push({ text: m[1], typeOnly });
  }
  return out;
}

const FLIGHT_NAMES = ['beginRemoteCreate', 'remoteCreateInFlight', 'remoteCreateFlightsFor', 'awaitRemoteCreateSettled', 'create-inflight'];

function ruleFA11(src) {
  const out = [];
  if (src.inflight === null) out.push(`${FILES.inflight} does not exist`);
  else {
    const code = src.inflight;
    for (const one of importClauses(code)) {
      if (!one.typeOnly) out.push(`create-inflight.ts has a runtime import: ${JSON.stringify(one.text.replace(/\s+/g, ' ').slice(0, 100))}`);
    }
    if (/\brequire\s*\(|\bimport\s*\(/.test(code)) out.push('create-inflight.ts loads a module at run time');
    for (const m of code.matchAll(/\bexport\s+(?!type\b)(\*|\{[^}]*\})\s*from\b/g)) {
      out.push(`create-inflight.ts re-exports at run time: ${JSON.stringify(m[0].slice(0, 80))}`);
    }
  }
  for (const name of FLIGHT_NAMES) {
    if (new RegExp(`\\b${escapeRe(name)}\\b`).test(src.rescue)) out.push(`pane-env-rescue.ts names ${name}`);
  }
  return out;
}

// ---------------------------------------------------------------------------
// The readers, proved before they are trusted
// ---------------------------------------------------------------------------

function selfProof() {
  const problems = [];
  const fixture = [
    'export class X {',
    '  private slotA: A | null = null;',
    '  private get a(): A {',
    '    this.slotA ??= new A();',
    '    return this.slotA;',
    '  }',
    '  private async withType(id: string): Promise<{ ok: boolean }> {',
    '    return { ok: id === "{" };',
    '  }',
    '  plain(x: number): void {',
    '    foo(x);',
    '    const o = {',
    '      nested(y: number) {',
    '        return y;',
    '      }',
    '    };',
    '    if (x > 1) return;',
    '  }',
    '  generic<T>(v: T): Map<string, () => void> {',
    '    return new Map();',
    '  }',
    '}',
    'export async function top(a: string): Promise<void> {',
    '  await a;',
    '}',
    ''
  ].join('\n');
  const members = membersOf(stripComments(fixture));
  const names = members.map((m) => m.name).sort();
  const want = ['a', 'generic', 'plain', 'top', 'withType'];
  if (JSON.stringify(names) !== JSON.stringify(want)) problems.push(`the method reader read ${JSON.stringify(names)} from its fixture, not ${JSON.stringify(want)}`);
  const withType = members.find((m) => m.name === 'withType');
  if (withType === undefined || !withType.body.includes('ok: id')) problems.push('the method reader did not skip a return type holding an object type');
  const generic = members.find((m) => m.name === 'generic');
  if (generic === undefined || !generic.body.includes('new Map()')) problems.push('the method reader did not skip a return type holding an arrow type');
  if (members.some((m) => m.name === 'foo')) problems.push('the method reader read a call statement as a method');
  if (members.some((m) => m.name === 'nested')) problems.push('the method reader read a method nested inside another member as a member of its own');
  const imports = importClauses("import type { A } from './a';\nimport { type B, type C } from './b';\nimport { D } from './d';\nimport './e';\n");
  if (JSON.stringify(imports.map((i) => i.typeOnly)) !== JSON.stringify([true, true, false, false])) problems.push(`importClauses misread its fixture: ${JSON.stringify(imports)}`);
  if (statementEnd('await f(a, { b: 1 }); next();', 0) !== 'await f(a, { b: 1 });'.length) problems.push('statementEnd does not stop at the first top-level ;');
  const ifs = ifStatements('if (a) return; if (b) { c(); continue; }');
  if (ifs.length !== 2 || ifs[0].then.trim() !== 'return;' || !ifs[1].then.includes('continue')) problems.push('ifStatements misread its fixture');
  if (numericConst('export const N = 7_000;', 'N') !== 7000 || numericConst('export const N = A * 2;', 'N') !== null) problems.push('numericConst misread its fixture');
  if (stringConst("export const S =\n  'a b ' +\n  'c';", 'S') !== 'a b c' || stringConst('export const S = x + "y";', 'S') !== null) problems.push('stringConst misread its fixture');
  return problems;
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

function readOrNull(rel) {
  const path = join(ROOT, rel);
  return existsSync(path) ? readFileSync(path, 'utf8') : null;
}

export function runRules() {
  const raw = Object.fromEntries(Object.entries(FILES).map(([k, rel]) => [k, readOrNull(rel)]));
  const src = Object.fromEntries(Object.entries(raw).map(([k, text]) => [k, text === null ? null : stripComments(text)]));
  const results = {};
  const missingCore = ['core', 'remote', 'ledger', 'copy', 'rescue', 'refusals'].filter((k) => src[k] === null);
  if (missingCore.length > 0) {
    for (const r of RULES) results[r] = [`the tree at ${ROOT} has no ${missingCore.map((k) => FILES[k]).join(', ')}`];
    return results;
  }
  const table = { FA1: ruleFA1, FA2: ruleFA2, FA3: ruleFA3, FA4: ruleFA4, FA5: ruleFA5, FA6: ruleFA6, FA7: ruleFA7, FA8: ruleFA8, FA9: ruleFA9, FA10: ruleFA10, FA11: ruleFA11 };
  for (const r of RULES) {
    try {
      results[r] = table[r](src, raw);
    } catch (err) {
      results[r] = [`the rule threw: ${err instanceof Error ? err.message : String(err)}`];
    }
  }
  return results;
}

const isMain = process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const started = Date.now();
  const proof = selfProof();
  const results = runRules();
  if (proof.length > 0) results.SELF = proof;
  if (AS_JSON) {
    process.stdout.write(`${JSON.stringify(results)}\n`);
    process.exit(Object.values(results).every((p) => p.length === 0) ? 0 : 1);
  }
  let red = 0;
  for (const [rule, problems] of Object.entries(results)) {
    if (problems.length === 0) {
      process.stdout.write(`${TAG} ${rule.padEnd(5)} ok\n`);
      continue;
    }
    red += 1;
    process.stdout.write(`${TAG} ${rule.padEnd(5)} RED\n`);
    for (const p of problems) process.stdout.write(`${TAG}         - ${p}\n`);
  }
  const ms = Date.now() - started;
  if (red > 0) {
    process.stdout.write(`${TAG} FAIL: ${String(red)} of ${String(Object.keys(results).length)} rules red in ${String(ms)} ms over ${ROOT}.\n`);
    process.exit(1);
  }
  process.stdout.write(
    `${TAG} PASS: ${String(RULES.length)} rules green in ${String(ms)} ms. An attach to a session on another machine never lists this Mac's server, ` +
      'waits bounded for its create or one fresh list, and spawns nothing for a pane that has gone; a pass never counts, rescues or writes over a ' +
      'session a create in this process is binding. Spawned nothing.\n'
  );
  process.exit(0);
}
