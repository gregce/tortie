#!/usr/bin/env node
/**
 * `npm run conformance:createanswer`. PHASE 360 — A CREATE THAT STARTED A
 * SESSION ANSWERS THAT SESSION (build/p360/SPEC.md §7.1, D16).
 *
 * About a second. It reads this repository's source with the TypeScript parser
 * (the pinned `typescript` in node_modules) and asserts over it, and it spawns
 * ONE process, the pinned tsx (build/ts-runner.mjs `tsxCli()`), for rule CA4's
 * driven half. That process evaluates the text of `createdTmuxIdOf` and
 * `answerLineCount` (and of whatever top-level declarations of their own file
 * they read) over ten answers a far `new-session` could print, and imports the
 * shipped `create-confirmation.ts` beside it: it starts nothing, opens no
 * database and no socket, and reads no file under any home. Nothing is written
 * anywhere.
 *
 * ## The defect it exists for
 *
 * Measured at the parent (build/p360/SPEC.md §2.1 and §2.2): every step a
 * create runs after its session was started could still throw into the
 * create's answer. On this Mac the record write, the broadcast, the read-back,
 * the notices and the id capture each answered a failure for a session tmux
 * had made; on another machine a far answer whose first line was not a `$` id
 * (a login file that prints, §2.3) dropped the only record of a running
 * session and said "Nothing was changed.", and a session the create's own list
 * had not shown yet was answered the same way. A person reads the failure,
 * presses Create again and gets a second session. The phase answers it with
 * guards and an identity read, and, by his ruling of 2026-11-14, with the
 * parent's own refusal for the one create it does not answer with its session
 * (the session list stopped while it ran). Every one of those is a SHAPE a
 * later round can undo in one edit while every test still passes, because a
 * test only proves the paths it names. So the shapes are rules here.
 *
 * ## "Safe", the one definition CA1 to CA3 use
 *
 * A statement is SAFE when it is one of: an expression statement whose every
 * call (and `new`) is on the rule's allowlist, outside an arrow or function
 * handed to `afterSpawn` or `afterSpawnRead` (calls inside such an arrow are
 * the guard's business); a `const`/`let` whose initializers call only
 * allowlisted callees; an `if` whose condition calls only allowlisted callees
 * and whose branches are safe; a block of safe statements; an empty statement;
 * a `try` whose `catch` exists and whose catch and finally hold no `throw`
 * outside a nested function; a `for … of REMOTE_STAMPS` whose body is one such
 * `try`; and a `return` whose expression calls only allowlisted callees. No
 * safe statement holds an `await` or a `yield` outside such a `try` (a
 * rejection is a throw), and no safe statement holds a `throw`. Anything else
 * is not safe. The allowlists name only calls that cannot throw: map and set
 * writes, log calls (src/main/log/index.ts's `write` "never throws"), pure
 * string helpers, and the guards themselves.
 *
 * ## The rules
 *
 *   CA1 In `createLocalSession`, the spawn is the ONE top-level `try` whose
 *       block calls `tmux.createSession(`, and every later top-level statement
 *       is safe with the allowlist {faultPoint, deps.liveIds.set,
 *       deps.byTmuxId.set, deps.createsInFlight.delete, afterSpawn,
 *       afterSpawnRead, recordLaunchContext, toSession, sessionsLog.warn}.
 *       Inside the spawn's try nothing follows the statement holding the spawn,
 *       and a finally on it is safe with the same allowlist, because that
 *       try's catch removes the row and rethrows (the probe review added this
 *       on 2026-11-08, after a step planted there left the rule green while the
 *       phase's own vitest went red).
 *       `afterSpawn` and `afterSpawnRead` are declared in the file, each body
 *       ONE `try` whose catch holds no `throw` and exactly one log call, which
 *       names `AFTER_SPAWN_WORDS[` and `failureCodeOf(` and never `.message`;
 *       `afterSpawn`'s try runs its step (its third parameter) and
 *       `afterSpawnRead`'s returns its read and falls back to its fourth.
 *       `failureCodeOf` reads no message, no stack and no `String(` of the
 *       error. `AFTER_SPAWN_WORDS` is exported, frozen, holds exactly §5's
 *       seven keys as string literals, every guard call names one of them, and
 *       every one is named.
 *   CA2 In the `if (machineId !== undefined)` block of `createLocalSession`,
 *       every statement after the one holding `remoteCreate(` is safe with the
 *       allowlist {afterSpawn, openTabsForRemoteCreate}, the last being
 *       `return <the session it bound>;`; `openTabsForRemoteCreate`
 *       (remote-rehome.ts) calls `manifest.` only inside a `try` whose catch
 *       holds no `throw`.
 *   CA3 In `remoteCreate`, every statement after `<flight>.answered(` inside
 *       the ONE try block that holds the create (FA5's) is safe with the
 *       allowlist {clearIssuedRemoteId, <flight>.leftToRescue,
 *       machineRouteEpoch, machinesLog.warn, machinesLog.info,
 *       remoteSessionRow, remoteCreateAnswer, oneLine, String}, and that try's
 *       finally, which runs after the answer, is safe with {<flight>.end}
 *       (the probe review, 2026-11-08);
 *       `startMachineFeed(` sits inside a `try` whose catch holds no `throw`
 *       but ONE: HIS THIRD RULED ROUND (2026-11-17, "360 a then ship 115.0";
 *       build/p360/SPEC.md D27) that catch BEGINS `if (isManifestStopped(<e>))
 *       throw <e>;`, `<e>` its own binding, no else, before anything it logs,
 *       with `isManifestStopped` taken from ./remote-record under its own name
 *       (the machine layer's one door to the manifest, Phase 72's rule) and
 *       declared nowhere in remote-sessions.ts, and remote-record.ts
 *       re-exporting the store's own (`export { isManifestStopped } from
 *       '../manifest/store'`) and declaring none. So the stopped list's
 *       own refusal, which the create's feed meets when the list stopped
 *       before that machine's create returned, goes through as it did at the
 *       parent ("Restart Tortie, then try again", the window kept on the
 *       session in use), and every other error the feed meets is still logged
 *       once and the session answered. No other try after the answer may let
 *       anything through (seven ablations: the pass-through removed, made
 *       unconditional, asking another predicate, throwing another error, moved
 *       after the log line, a predicate of remote-sessions.ts's own, and one of
 *       remote-record.ts's own). And what it lets through reaches the answer:
 *       the feed's try sits in remoteCreate's own body and no try enclosing it
 *       there has a catch (the probe review of his third ruled round: a catch
 *       around it undid D27 with every rule green; two ablations, the feed's
 *       statement wrapped in a swallowing try and a catch on the one try);
 *       the env notice (`postDurabilityNotice(`) and its `envMissing`
 *       composition (`.sort(`, `new Set(`) sit inside a `try`; and
 *       `remoteCreateAnswer` is safe throughout with {machinesLog.warn,
 *       machinesLog.info, oneLine, String}, calls `remoteSessionMachine(` only
 *       inside a `try`, and ends returning a composition that holds no call.
 *   CA4 In `remoteCreate`, the new-session `execOn(ctx, args` answer is read
 *       only by `createdTmuxIdOf(` and `answerLineCount(` (no `.split(` of
 *       it, nothing else); the `if` testing `startsWith('$')` calls
 *       `settleUnansweredCreate(` with `kind: 'unread'` and neither drops the
 *       row nor throws; in `settleUnansweredCreate`, `confirmCreate(` comes
 *       before `dropRemoteRow(` and before `markRemoteCreateUnconfirmed(`, and
 *       no `gmuxError(` call names the answer; AND `createdTmuxIdOf` and
 *       `answerLineCount` are DRIVEN through the pinned tsx over
 *       {@link READER_TABLE}, the text the gate read and the shipped module's
 *       exports both, and must agree with the table and with each other.
 *   CA5 (his ruled round, 2026-11-14, "360 a"; build/p360/SPEC.md D24) In
 *       `GmuxCore`, `createSession`'s admitted body is exactly three
 *       statements, in this order: `const <s> = await createLocalSession(<input>, …)`,
 *       `<input>` being createSession's own parameter; an `if` with no else
 *       whose condition is `this.manifest.stoppedReading() &&
 *       (createMachineIdFor(<input>) === undefined || remoteSessionRow(<s>.id)
 *       === null)` (either order of either operator, either side of each
 *       comparison) and whose branch is ONE `throw manifestStoppedError('<an
 *       operation>')`; and `return <s>;`. So a create during which the session
 *       list stopped answers the stopped list's own refusal, as the parent
 *       does, exactly when main would not open the session it started: ON
 *       THIS MAC always, and ON ANOTHER MACHINE when no list of that machine
 *       has shown it; the decision is main's, read from the store's latch once
 *       the create has ended: never before it, never from anything a window
 *       heard, and never swallowed. HIS SECOND RULING (2026-11-16, D25): a
 *       create on another machine that a list has shown answers its session,
 *       as the parent does; the machine is decided by the create's own rule,
 *       `createMachineIdFor` imported from ./launch-plan under its own name,
 *       and the row read is `remoteSessionRow` from ../machines/remote-sessions
 *       under its own name, neither spelled again in core.ts (nine ablations:
 *       the machine test removed, turned around, read from `input.machineId`
 *       alone, handed another object, and a copy of the rule of core.ts's own;
 *       D26's unlisted test removed, turned around, asked of the input, and a
 *       row read of core.ts's own). A parameter or a destructured binding
 *       named after either rule is a spelling too, and the admitted function
 *       takes no parameter at all, since the ledger hands it none (the probe
 *       review of his second ruled round, 2026-11-16: a defaulted parameter
 *       shadowing the row read, the machine rule or createSession's input read
 *       green in four plants; four ablations). `createSession` itself is ONE `return` of that admit call,
 *       with nothing chained on it and nothing around it, so no catch outside
 *       the admitted body can swallow or replace the refusal either.
 *       `this.lastCleanList` is written (assigned or mutated) in exactly
 *       `listSessions`, as at the parent, read over every member of the class,
 *       a property's initializer included, and no member of any kind is named
 *       `keepCreatedSession`: the fix round's keep, which grew that list, went
 *       with the answer it served. (The probe review of his ruled round added
 *       the `return` clause and the members' reach, 2026-11-14, after a
 *       `.catch(` on the admit, a `try` around it, and the keep put back as an
 *       arrow property each read green.)
 *   CA6 `remoteCreate` and `settleUnansweredCreate` call no `noRemoteRowFor(`;
 *       `remoteCreateNotStarted` is exported from remote-copy.ts and named
 *       exactly once under src/main (declaration, imports and re-exports
 *       aside), as the message of a `gmuxError('SPAWN_FAILED', …)` in
 *       `settleUnansweredCreate`'s drop arm (after a `dropRemoteRow(` in a
 *       block holding it); no string literal after `<flight>.answered(` in
 *       `remoteCreate` holds "Nothing was changed"; and the new sentence holds
 *       none of pane, window, prefix, tmux, server.
 *
 *   THERE IS NO CA7 SINCE HIS RULED ROUND. The fix round's CA7 held a flag in
 *   the window (src/renderer/state/sessions-slice.ts) that kept a create
 *   answered while the list was stopped from moving the window, set when the
 *   window heard the stopped notice. Its reverify measured the create's answer
 *   overtaking that notice in a busy window, the window moving in 7 of 7, so
 *   the decision moved to main (CA5) and the window's two files went back to
 *   the parent's bytes. probe:p360's L1 and L2 hold the window at both builds,
 *   in a busy window.
 *
 *   The fix round also widened three rules after the attack lens's own
 *   ablations left them green: CA1 reads the answer's `tmuxName:
 *   <spawn>.tmuxName` after every spread (D5) and `failureCodeOf` as ONE try
 *   whose catch returns; CA4 reads every `dropRemoteRow(` in
 *   `settleUnansweredCreate` inside the `'dropRow'` arm. And CA1 reads lens A's
 *   minor (D21): the record write's guard hands its answer to a name and
 *   `recordLaunchContext(` runs only under an `if` asking it.
 *
 * ## The ablations, run on every invocation
 *
 * The unedited tree is judged first. Then every rule is asked again over
 * in-memory copies of the tree with that rule broken one way at a time (the
 * spec's own ablations, and more), and each copy must read red on the rule it
 * names and on no other: every other rule must read exactly as it read over
 * the unedited tree. A CONTROL copy, a comment added to each of the seven files
 * naming the broken shapes in prose, must stay green on all six. A copy whose
 * edit no longer finds its text fails the gate, because an ablation that
 * cannot be made proves nothing; and a rule with no ablation fails it, because
 * it has never been shown to fail. The safe-statement reader is proved on
 * fixtures of its own before it is trusted.
 *
 * Every file is parsed, so a clause written only in a comment never passes.
 *
 * Usage:
 *   node build/conformance-create-answer.mjs                 this worktree
 *   node build/conformance-create-answer.mjs --root <dir>    another tree
 *   node build/conformance-create-answer.mjs --json          one JSON line
 *   node build/conformance-create-answer.mjs --verbose       each ablation's first finding
 *   node build/conformance-create-answer.mjs --timing        how long each step took
 */

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import ts from 'typescript';
import { tsxCli } from './ts-runner.mjs';

const TAG = '[conformance:createanswer]';

function argValue(flag) {
  const at = process.argv.indexOf(flag);
  return at === -1 ? null : (process.argv[at + 1] ?? null);
}
const ROOT = resolve(argValue('--root') ?? join(dirname(fileURLToPath(import.meta.url)), '..'));
const AS_JSON = process.argv.includes('--json');

export const FILES = Object.freeze({
  local: 'src/main/sessions/create-local.ts',
  remote: 'src/main/machines/remote-sessions.ts',
  confirm: 'src/main/machines/create-confirmation.ts',
  copy: 'src/main/machines/remote-copy.ts',
  core: 'src/main/sessions/core.ts',
  rehome: 'src/main/machines/remote-rehome.ts',
  // His third ruled round (D27): the machine layer's one door to the manifest, which re-exports the store's stopped predicate.
  record: 'src/main/machines/remote-record.ts'
});

export const RULES = Object.freeze(['CA1', 'CA2', 'CA3', 'CA4', 'CA5', 'CA6']);

/** §5's seven step words, by key (D2, D3 to D9). */
export const AFTER_SPAWN_KEYS = Object.freeze(['record', 'login-notice', 'env-notice', 'id-capture', 'capture-notice', 'broadcast', 'read-back']);

/** The two guards (D2). Calls inside an arrow handed to either are the guard's business. */
const GUARDS = Object.freeze(['afterSpawn', 'afterSpawnRead']);

/** CA1's allowlist: the calls after the spawn that cannot throw (SPEC §7.1, D8). */
export const CA1_ALLOW = Object.freeze([
  'faultPoint',
  'deps.liveIds.set',
  'deps.byTmuxId.set',
  'deps.createsInFlight.delete',
  'afterSpawn',
  'afterSpawnRead',
  'recordLaunchContext',
  'toSession',
  'sessionsLog.warn'
]);
/** CA2's: the two calls the branch makes after its answer (the capture notice's log line sits inside its guard). */
export const CA2_ALLOW = Object.freeze(['afterSpawn', 'openTabsForRemoteCreate']);
/** CA3's, with `<flight>` replaced by the flight's own name. */
export const CA3_ALLOW = Object.freeze([
  'clearIssuedRemoteId',
  '<flight>.leftToRescue',
  'machineRouteEpoch',
  'machinesLog.warn',
  'machinesLog.info',
  'remoteSessionRow',
  'remoteCreateAnswer',
  'oneLine',
  'String'
]);
/** remoteCreateAnswer's: log calls and the pure string helpers. */
export const ANSWER_ALLOW = Object.freeze(['machinesLog.warn', 'machinesLog.info', 'oneLine', 'String']);

/**
 * CA4's driven table: what a far `new-session -P -F '#{session_id}'` could
 * print, the `$` id the reader must answer (`''` when the answer is not ONE
 * session id), and the non-blank line count. The first ten rows are the
 * spec's (§7.1 CA4); the line counts follow D10's "the non-blank lines".
 */
export const READER_TABLE = Object.freeze([
  ['$4\n', '$4', 1],
  ['$4', '$4', 1],
  [' $4 \r\n', '$4', 1],
  ['\n$4\n\n', '$4', 1],
  ['noise\n$4\n', '', 2],
  ['$3\n$5\n', '', 2],
  ['', '', 0],
  ['$', '', 1],
  ['$4 extra', '', 1],
  ['4', '', 1]
]);

/** Words a person must never read about a session (CLAUDE.md, UI rules). */
const TMUX_WORDS = Object.freeze(['pane', 'window', 'prefix', 'tmux', 'server']);

/** The fewest non-test source files under src/main the walk may find before it is not trusted (691 at this phase's parent). */
export const FLOOR = 500;

// ---------------------------------------------------------------------------
// The tree, read once: every non-test .ts and .tsx under src/main
// ---------------------------------------------------------------------------

const isTest = (rel) => rel.includes('/__tests__/') || /\.test\.tsx?$/.test(rel);

function readTree(root) {
  const tree = new Map();
  const walk = (rel) => {
    for (const entry of readdirSync(join(root, rel), { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      const child = `${rel}/${entry.name}`;
      if (entry.isDirectory()) walk(child);
      else if (/\.tsx?$/.test(entry.name) && !entry.name.endsWith('.d.ts') && !isTest(child)) {
        tree.set(child, readFileSync(join(root, child), 'utf8'));
      }
    }
  };
  if (existsSync(join(root, 'src', 'main'))) walk('src/main');
  return tree;
}

const sfCache = new Map();
/** The parsed file, cached by its text, or null when the tree does not hold it. */
function sfOf(tree, rel) {
  const text = tree.get(rel);
  if (text === undefined) return null;
  const kind = rel.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const key = `${String(kind)}\u0000${text}`;
  let sf = sfCache.get(key);
  if (sf === undefined) {
    sf = ts.createSourceFile(rel, text, ts.ScriptTarget.Latest, true, kind);
    sfCache.set(key, sf);
  }
  return sf;
}
/** The paths under src/main whose text names `needle`. A text filter only; each kept file is parsed. */
function pathsNaming(tree, needle) {
  const out = [];
  for (const [rel, text] of tree) if (text.includes(needle)) out.push(rel);
  return out;
}
/** One number per distinct text, so a rule's inputs can be keyed without hashing a file twice. */
const textIds = new Map();
function textId(text) {
  if (text === undefined) return -1;
  let id = textIds.get(text);
  if (id === undefined) textIds.set(text, (id = textIds.size));
  return id;
}

// ---------------------------------------------------------------------------
// AST helpers
// ---------------------------------------------------------------------------

const nodesCache = new WeakMap();
function nodesOf(node) {
  const hit = nodesCache.get(node);
  if (hit !== undefined) return hit;
  const out = [];
  const visit = (n) => {
    out.push(n);
    ts.forEachChild(n, visit);
  };
  visit(node);
  nodesCache.set(node, out);
  return out;
}
const lineOf = (node) => node.getSourceFile().getLineAndCharacterOfPosition(node.getStart()).line + 1;
const where = (rel, node) => `${rel}:${String(lineOf(node))}`;
const hasModifier = (node, kind) => (ts.getModifiers?.(node) ?? node.modifiers ?? []).some((m) => m.kind === kind);
const isFunctionLike = (n) => ts.isArrowFunction(n) || ts.isFunctionExpression(n);
const isFunctionScope = (n) => isFunctionLike(n) || ts.isFunctionDeclaration(n) || ts.isMethodDeclaration(n) || ts.isGetAccessor(n) || ts.isSetAccessor(n) || ts.isConstructorDeclaration(n);
const squash = (s) => s.replace(/\s+/g, '');
const short = (node) => node.getText().replace(/\s+/g, ' ').trim().slice(0, 90);

/** `x as T`, `(x)`, `x satisfies T`, `x!` peeled to `x`. */
function peel(expr) {
  let e = expr;
  for (;;) {
    if (e === undefined) return e;
    if (ts.isAsExpression(e) || ts.isParenthesizedExpression(e) || ts.isSatisfiesExpression(e) || ts.isNonNullExpression(e) || ts.isTypeAssertionExpression?.(e)) {
      e = e.expression;
      continue;
    }
    return e;
  }
}

/** A callee as one comparable word: whitespace gone, `?.` read as `.`, `!` dropped. */
function calleeKey(call) {
  if (ts.isNewExpression(call)) return `new ${squash(call.expression.getText()).replace(/\?\./g, '.').replace(/!/g, '')}`;
  if (ts.isTaggedTemplateExpression(call)) return `tag ${squash(call.tag.getText())}`;
  return squash(call.expression.getText()).replace(/\?\./g, '.').replace(/!/g, '');
}
const isCallish = (n) => ts.isCallExpression(n) || ts.isNewExpression(n) || ts.isTaggedTemplateExpression(n);
/** The calls whose callee key is `key` exactly, or ends `.key` when `tail` is true. */
function callsNamed(node, key, { tail = false } = {}) {
  return nodesOf(node).filter((n) => ts.isCallExpression(n) && (calleeKey(n) === key || (tail && calleeKey(n).endsWith(`.${key}`))));
}

/** Top-level function declarations, and `const name = (…) =>`, of `name`. */
function functionNamed(sf, name) {
  for (const st of sf.statements) {
    if (ts.isFunctionDeclaration(st) && st.name?.text === name && st.body !== undefined) return st;
    if (ts.isVariableStatement(st)) {
      for (const d of st.declarationList.declarations) {
        if (ts.isIdentifier(d.name) && d.name.text === name && d.initializer !== undefined && isFunctionLike(peel(d.initializer))) return peel(d.initializer);
      }
    }
  }
  return null;
}
/** The body statements of a function, or of an arrow whose body is a block; null otherwise. */
function bodyStatements(fn) {
  if (fn === null || fn === undefined) return null;
  const body = fn.body;
  if (body === undefined || !ts.isBlock(body)) return null;
  return [...body.statements];
}
function classNamed(sf, name) {
  return nodesOf(sf).find((n) => ts.isClassDeclaration(n) && n.name?.text === name) ?? null;
}
function memberName(el) {
  const name = el.name;
  if (name === undefined) return '';
  if (ts.isIdentifier(name) || ts.isPrivateIdentifier(name) || ts.isStringLiteral(name)) return name.text;
  return name.getText();
}
function methodOf(cls, name) {
  return cls.members.find((el) => (ts.isMethodDeclaration(el) || ts.isGetAccessor(el) || ts.isSetAccessor(el)) && memberName(el) === name) ?? null;
}
/** The nearest function scope around `node` (itself excluded), or null. */
function enclosingFunction(node) {
  for (let p = node.parent; p !== undefined; p = p.parent) if (isFunctionScope(p)) return p;
  return null;
}
/** The bare names an `if` condition's top-level `&&` chain is made of. */
function andChainNames(expr) {
  const e = peel(expr);
  if (e === undefined) return [];
  if (ts.isBinaryExpression(e) && e.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) return [...andChainNames(e.left), ...andChainNames(e.right)];
  return ts.isIdentifier(e) ? [e.text] : [];
}
/** True when `node` sits in the then branch of an `if`, inside `stop`, whose `&&` chain holds `name` (CA1's D21 clause). */
function landsOnlyBy(node, name, stop) {
  for (let p = node.parent; p !== undefined && p !== stop; p = p.parent) {
    if (ts.isIfStatement(p) && nodesOf(p.thenStatement).includes(node) && andChainNames(p.expression).includes(name)) return true;
  }
  return false;
}
/** True when a `throw` inside `root` would leave `root` itself: not inside a function nested in it. */
function throwsOut(root) {
  const scope = isFunctionScope(root) ? root : enclosingFunction(root);
  return nodesOf(root).some((n) => ts.isThrowStatement(n) && enclosingFunction(n) === scope);
}
/** A literal's text: string, no-substitution template, or template parts joined with `<x>` for each value. */
function literalText(expr) {
  const e = peel(expr);
  if (e === undefined) return null;
  if (ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e)) return e.text;
  if (ts.isTemplateExpression(e)) return e.head.text + e.templateSpans.map((s) => `<x>${s.literal.text}`).join('');
  if (ts.isBinaryExpression(e) && e.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    const a = literalText(e.left);
    const b = literalText(e.right);
    return a === null || b === null ? null : a + b;
  }
  return null;
}

// ---------------------------------------------------------------------------
// The safe-statement reader (SPEC §7.1 "Safe"), proved on fixtures below
// ---------------------------------------------------------------------------

/**
 * Every call, `new`, tagged template, `await` and `yield` in `node`, skipping
 * the body of a function handed to a guard. Answers `{ calls, awaits, throws }`
 * where `calls` are `{ key, node }`.
 */
function effectsOf(node) {
  const calls = [];
  let awaits = 0;
  let throws = 0;
  const visit = (n) => {
    if (isFunctionLike(n) && n.parent !== undefined && ts.isCallExpression(n.parent) && n.parent.arguments.includes(n) && GUARDS.includes(calleeKey(n.parent))) return;
    if (isCallish(n)) calls.push({ key: calleeKey(n), node: n });
    if (ts.isAwaitExpression(n) || ts.isYieldExpression(n) || (ts.isForOfStatement(n) && n.awaitModifier !== undefined)) awaits += 1;
    if (ts.isThrowStatement(n)) throws += 1;
    ts.forEachChild(n, visit);
  };
  visit(node);
  return { calls, awaits, throws };
}

/**
 * HIS THIRD RULED ROUND (2026-11-17, D27). The one statement a catch may begin
 * with and still be quiet: `if (isManifestStopped(<e>)) throw <e>;`, `<e>`
 * being that catch's own binding, with no else and nothing else in its
 * branch. It lets the stopped list's own refusal through, the error the catch
 * met and no other, and only that. Null when `stmt` is not exactly that.
 */
export function stoppedPassThrough(stmt, clause) {
  const v = clause?.variableDeclaration !== undefined && ts.isIdentifier(clause.variableDeclaration.name) ? clause.variableDeclaration.name.text : null;
  if (v === null || stmt === undefined || !ts.isIfStatement(stmt) || stmt.elseStatement !== undefined) return null;
  const cond = peel(stmt.expression);
  const asks = cond !== undefined && ts.isCallExpression(cond) && calleeKey(cond) === 'isManifestStopped' && cond.arguments.length === 1 && ts.isIdentifier(peel(cond.arguments[0])) && peel(cond.arguments[0]).text === v;
  const only = onlyStatement(stmt.thenStatement);
  const rethrows = only !== null && ts.isThrowStatement(only) && only.expression !== undefined && ts.isIdentifier(peel(only.expression)) && peel(only.expression).text === v;
  return asks && rethrows ? stmt : null;
}
/**
 * True when a `throw` in `block` (a catch's) would leave it, the one
 * pass-through of {@link stoppedPassThrough} as its FIRST statement aside when
 * `allowPass` holds.
 */
function catchThrowsOut(clause, allowPass) {
  const pass = allowPass ? stoppedPassThrough(clause.block.statements[0], clause) : null;
  const scope = enclosingFunction(clause.block);
  return nodesOf(clause.block).some((n) => ts.isThrowStatement(n) && enclosingFunction(n) === scope && (pass === null || !nodesOf(pass).includes(n)));
}

/**
 * Why `stmt` is not safe under `allow`, or null when it is. `forOfStamps` is
 * whether the stamp loop's shape is accepted (CA3 alone has one); `passThrough`
 * is the set of try statements whose catch may begin with the stopped list's
 * pass-through (CA3's feed start alone, his third ruled round).
 */
export function unsafeWhy(stmt, allow, { forOfStamps = false, passThrough = null } = {}) {
  const allowed = new Set(allow);
  const callsOk = (node, what) => {
    const fx = effectsOf(node);
    const bad = fx.calls.filter((c) => !allowed.has(c.key));
    if (bad.length > 0) return `${what} calls ${[...new Set(bad.map((c) => c.key))].join(', ')}, which can throw and is on no allowlist`;
    if (fx.awaits > 0) return `${what} awaits outside a try, and a rejection is a throw`;
    if (fx.throws > 0) return `${what} throws`;
    return null;
  };
  if (ts.isEmptyStatement(stmt)) return null;
  if (ts.isExpressionStatement(stmt)) return callsOk(stmt.expression, 'the statement');
  if (ts.isVariableStatement(stmt)) {
    for (const d of stmt.declarationList.declarations) {
      if (d.initializer === undefined) continue;
      const why = callsOk(d.initializer, `the initializer of ${d.name.getText()}`);
      if (why !== null) return why;
    }
    return null;
  }
  if (ts.isIfStatement(stmt)) {
    const cond = callsOk(stmt.expression, 'the condition');
    if (cond !== null) return cond;
    const then = unsafeWhy(stmt.thenStatement, allow, { forOfStamps, passThrough });
    if (then !== null) return then;
    return stmt.elseStatement === undefined ? null : unsafeWhy(stmt.elseStatement, allow, { forOfStamps, passThrough });
  }
  if (ts.isBlock(stmt)) {
    for (const s of stmt.statements) {
      const why = unsafeWhy(s, allow, { forOfStamps, passThrough });
      if (why !== null) return why;
    }
    return null;
  }
  if (ts.isTryStatement(stmt)) {
    if (stmt.catchClause === undefined) return 'a try with no catch';
    if (catchThrowsOut(stmt.catchClause, passThrough !== null && passThrough.has(stmt))) return 'a try whose catch throws';
    if (stmt.finallyBlock !== undefined && throwsOut(stmt.finallyBlock)) return 'a try whose finally throws';
    return null;
  }
  if (ts.isForOfStatement(stmt) && forOfStamps && stmt.awaitModifier === undefined && squash(stmt.expression.getText()) === 'REMOTE_STAMPS') {
    const body = ts.isBlock(stmt.statement) ? [...stmt.statement.statements] : [stmt.statement];
    if (body.length !== 1 || !ts.isTryStatement(body[0])) return 'the stamp loop’s body is not one try';
    return unsafeWhy(body[0], allow, { forOfStamps, passThrough });
  }
  if (ts.isReturnStatement(stmt)) return stmt.expression === undefined ? null : callsOk(stmt.expression, 'the return');
  if (ts.isThrowStatement(stmt)) return 'a throw';
  return `a ${ts.SyntaxKind[stmt.kind]}, which is not a safe shape`;
}

/** The first statement in `stmts` that is not safe, as a finding, or null. */
function firstUnsafe(rel, stmts, allow, opts) {
  for (const s of stmts) {
    const why = unsafeWhy(s, allow, opts);
    if (why !== null) return `${where(rel, s)}: \`${short(s)}\` is not safe: ${why}`;
  }
  return null;
}

// ---------------------------------------------------------------------------
// The pieces the rules and the ablations both find
// ---------------------------------------------------------------------------

/** `createLocalSession`'s body, the index of the spawn try in it, and the tail after it. */
function localShape(sf) {
  const fn = functionNamed(sf, 'createLocalSession');
  const stmts = bodyStatements(fn);
  if (stmts === null) return { fn: null, stmts: null, spawn: -1, tail: [], branch: null, why: 'create-local.ts declares no createLocalSession with a body' };
  const spawns = stmts.map((s, i) => [s, i]).filter(([s]) => ts.isTryStatement(s) && callsNamed(s.tryBlock, 'tmux.createSession').length > 0);
  const branch = stmts.find((s) => ts.isIfStatement(s) && squash(s.expression.getText()) === 'machineId!==undefined') ?? null;
  if (spawns.length !== 1) return { fn, stmts, spawn: -1, tail: [], branch, why: `createLocalSession has ${String(spawns.length)} top-level try statements calling tmux.createSession(, not one` };
  const spawn = spawns[0][1];
  return { fn, stmts, spawn, tail: stmts.slice(spawn + 1), branch, why: null };
}

/** The remote branch's statements after the one holding `remoteCreate(`, and that statement. */
function branchTail(branch) {
  if (branch === null || !ts.isBlock(branch.thenStatement)) return null;
  const stmts = [...branch.thenStatement.statements];
  const at = stmts.findIndex((s) => callsNamed(s, 'remoteCreate').length > 0);
  if (at === -1) return null;
  return { holder: stmts[at], tail: stmts.slice(at + 1) };
}

/** `remoteCreate`, its flight's name, the one try holding the create, and the statements after the answer. */
function remoteShape(sf) {
  const fn = functionNamed(sf, 'remoteCreate');
  if (fn === null) return { why: 'remote-sessions.ts declares no remoteCreate' };
  const flightDecl = nodesOf(fn).find((n) => ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer !== undefined && ts.isCallExpression(peel(n.initializer)) && calleeKey(peel(n.initializer)) === 'beginRemoteCreate');
  if (flightDecl === undefined) return { fn, why: 'remoteCreate registers no flight with `const <name> = beginRemoteCreate(`' };
  const flight = flightDecl.name.text;
  const holds = (block) =>
    callsNamed(block, 'writeRemoteRow').length > 0 &&
    newSessionExecs(block).length > 0 &&
    nodesOf(block).some((n) => ts.isForOfStatement(n) && squash(n.expression.getText()) === 'REMOTE_STAMPS') &&
    callsNamed(block, 'startMachineFeed').length > 0;
  const tries = nodesOf(fn).filter((n) => ts.isTryStatement(n) && holds(n.tryBlock));
  // The innermost: a try nested in another that also holds all four is the one.
  const one = tries.find((t) => !tries.some((u) => u !== t && nodesOf(t.tryBlock).includes(u)));
  if (one === undefined) return { fn, flight, why: 'no one try block in remoteCreate holds writeRemoteRow(, the new-session execOn(ctx, args, the stamp loop and startMachineFeed(' };
  const stmts = [...one.tryBlock.statements];
  const at = stmts.findIndex((s) => callsNamed(s, `${flight}.answered`).length > 0);
  if (at === -1) return { fn, flight, one, why: `the try holding the create has no statement calling ${flight}.answered(` };
  return { fn, flight, one, answered: stmts[at], after: stmts.slice(at + 1), why: null };
}
/**
 * HIS THIRD RULED ROUND (D27): the first statement of the catch around
 * `remoteCreate`'s feed start when it is the stopped list's pass-through, or
 * null. The ablations find the statement they break through it.
 */
function feedPassThrough(sf) {
  const shape = remoteShape(sf);
  if (shape.why !== null) return null;
  const call = shape.after.flatMap((s) => callsNamed(s, 'startMachineFeed'))[0];
  if (call === undefined) return null;
  for (let p = call.parent; p !== undefined && p !== shape.one; p = p.parent) {
    if (ts.isTryStatement(p) && nodesOf(p.tryBlock).includes(call)) {
      return p.catchClause === undefined ? null : stoppedPassThrough(p.catchClause.block.statements[0], p.catchClause);
    }
  }
  return null;
}
/** The new-session `execOn(ctx, args, …)` calls in `node`. */
function newSessionExecs(node) {
  return nodesOf(node).filter(
    (n) => ts.isCallExpression(n) && calleeKey(n) === 'execOn' && n.arguments.length >= 2 && ts.isIdentifier(n.arguments[0]) && n.arguments[0].text === 'ctx' && ts.isIdentifier(n.arguments[1]) && n.arguments[1].text === 'args'
  );
}
/** The name the new-session answer is bound to in `remoteCreate`, or null when it is not bound to a name. */
function answerBinding(exec) {
  let p = exec.parent;
  while (p !== undefined && (ts.isAwaitExpression(p) || ts.isParenthesizedExpression(p) || ts.isAsExpression(p))) p = p.parent;
  if (p === undefined) return { name: null, node: null, direct: null };
  if (ts.isVariableDeclaration(p) && ts.isIdentifier(p.name)) return { name: p.name.text, node: p.name, direct: null };
  if (ts.isBinaryExpression(p) && p.operatorToken.kind === ts.SyntaxKind.EqualsToken && ts.isIdentifier(p.left)) return { name: p.left.text, node: p.left, direct: null };
  return { name: null, node: null, direct: p };
}

/** The `if` in `remoteCreate` whose condition asks `startsWith('$')`. */
function dollarIf(fn) {
  return (
    nodesOf(fn).find(
      (n) =>
        ts.isIfStatement(n) &&
        nodesOf(n.expression).some((c) => ts.isCallExpression(c) && calleeKey(c).endsWith('.startsWith') && c.arguments.length >= 1 && ts.isStringLiteralLike(c.arguments[0]) && c.arguments[0].text === '$')
    ) ?? null
  );
}
/** True when `call` hands an object literal whose `kind` is the string `kind`. */
function passesKind(call, kind) {
  return call.arguments.some(
    (a) => ts.isObjectLiteralExpression(peel(a)) && peel(a).properties.some((p) => ts.isPropertyAssignment(p) && memberName(p) === 'kind' && ts.isStringLiteralLike(peel(p.initializer)) && peel(p.initializer).text === kind)
  );
}

// ---------------------------------------------------------------------------
// CA1: the create on this Mac, after its spawn
// ---------------------------------------------------------------------------

/** The message, the stack, or the thrown value spelled whole: never in a log line or a code. */
function readsMessage(node, names) {
  return nodesOf(node).some(
    (n) =>
      (ts.isPropertyAccessExpression(n) && ['message', 'stack'].includes(n.name.text)) ||
      (ts.isElementAccessExpression(n) && ts.isStringLiteralLike(n.argumentExpression) && ['message', 'stack'].includes(n.argumentExpression.text)) ||
      (ts.isCallExpression(n) && ['String', 'JSON.stringify'].includes(calleeKey(n)) && n.arguments.some((a) => ts.isIdentifier(peel(a)) && names.includes(peel(a).text))) ||
      (ts.isCallExpression(n) && calleeKey(n).endsWith('.toString') && ts.isPropertyAccessExpression(n.expression) && ts.isIdentifier(peel(n.expression.expression)) && names.includes(peel(n.expression.expression).text)) ||
      (ts.isTemplateSpan(n) && ts.isIdentifier(peel(n.expression)) && names.includes(peel(n.expression).text))
  );
}
const isLogCall = (n) => ts.isCallExpression(n) && /(^|\.)[A-Za-z]*[Ll]og\.(warn|error|info|debug)$/.test(calleeKey(n));

function guardShape(sf, name, f) {
  const fn = functionNamed(sf, name);
  const stmts = bodyStatements(fn);
  if (stmts === null) {
    f.push(`${FILES.local} declares no ${name} with a body (D2)`);
    return;
  }
  const at = where(FILES.local, fn);
  const t = stmts.length === 1 && ts.isTryStatement(stmts[0]) ? stmts[0] : null;
  if (t === null) {
    f.push(`${name}'s body is ${String(stmts.length)} statement(s), not ONE try (${at})`);
    return;
  }
  if (t.catchClause === undefined) {
    f.push(`${name}'s try has no catch, so a step that throws reaches the create's answer (${at})`);
    return;
  }
  if (throwsOut(t.catchClause.block)) f.push(`${name}'s catch throws, so a step that throws still reaches the create's answer (${at})`);
  if (t.finallyBlock !== undefined && throwsOut(t.finallyBlock)) f.push(`${name}'s finally throws (${at})`);
  const v = t.catchClause.variableDeclaration !== undefined && ts.isIdentifier(t.catchClause.variableDeclaration.name) ? t.catchClause.variableDeclaration.name.text : null;
  const logs = nodesOf(t.catchClause.block).filter(isLogCall);
  if (logs.length !== 1) f.push(`${name}'s catch writes ${String(logs.length)} log lines, not one (${at})`);
  for (const log of logs) {
    const args = log.arguments.flatMap((a) => nodesOf(a));
    if (!args.some((n) => ts.isElementAccessExpression(n) && squash(n.expression.getText()) === 'AFTER_SPAWN_WORDS')) f.push(`${name}'s log line does not name AFTER_SPAWN_WORDS[, so the step is not said in its own words (${where(FILES.local, log)})`);
    if (!args.some((n) => ts.isCallExpression(n) && calleeKey(n) === 'failureCodeOf')) f.push(`${name}'s log line does not name failureCodeOf( (${where(FILES.local, log)})`);
  }
  if (readsMessage(t.catchClause.block, v === null ? [] : [v])) f.push(`${name}'s catch reads the error's message, stack or whole text, which can carry payload (D2) (${at})`);
  // The guard runs its step: afterSpawn calls its third parameter; afterSpawnRead returns it and falls back to its fourth.
  const param = (i) => (fn.parameters[i] !== undefined && ts.isIdentifier(fn.parameters[i].name) ? fn.parameters[i].name.text : null);
  const step = param(2);
  if (name === 'afterSpawn') {
    if (step === null || callsNamed(t.tryBlock, step).length !== 1) f.push(`afterSpawn's try does not call its step (its third parameter) exactly once, so a guarded step would not run (${at})`);
  } else {
    const fallback = param(3);
    const ret = [...t.tryBlock.statements].some((s) => ts.isReturnStatement(s) && s.expression !== undefined && ts.isCallExpression(peel(s.expression)) && step !== null && calleeKey(peel(s.expression)) === step);
    if (!ret) f.push(`afterSpawnRead's try does not return its read (its third parameter) (${at})`);
    const cs = [...t.catchClause.block.statements];
    const last = cs[cs.length - 1];
    if (fallback === null || last === undefined || !ts.isReturnStatement(last) || last.expression === undefined || !ts.isIdentifier(peel(last.expression)) || peel(last.expression).text !== fallback) {
      f.push(`afterSpawnRead's catch does not end returning its fallback (its fourth parameter) (${at})`);
    }
  }
}

/** The name the spawn's answer is assigned to (`info = await tmux.createSession(…)`), or null. */
function spawnBinding(spawnTry) {
  for (const s of spawnTry.tryBlock.statements) {
    if (callsNamed(s, 'tmux.createSession').length === 0) continue;
    const e = ts.isExpressionStatement(s) ? peel(s.expression) : undefined;
    if (e !== undefined && ts.isBinaryExpression(e) && e.operatorToken.kind === ts.SyntaxKind.EqualsToken && ts.isIdentifier(peel(e.left))) return peel(e.left).text;
    if (ts.isVariableStatement(s)) {
      const d = s.declarationList.declarations.find((x) => x.initializer !== undefined && callsNamed(x.initializer, 'tmux.createSession').length > 0);
      if (d !== undefined && ts.isIdentifier(d.name)) return d.name.text;
    }
  }
  return null;
}

/**
 * Why the create's return does not answer `toSession({ …, tmuxName: <spawn>.tmuxName })`
 * with the name AFTER every spread, so that it wins over the row's own; or null.
 */
function overlayWhy(ret, binding) {
  const call = ret.expression === undefined ? undefined : peel(ret.expression);
  if (call === undefined || !ts.isCallExpression(call) || calleeKey(call) !== 'toSession' || call.arguments.length !== 1) return `the create's return \`${short(ret)}\` is not toSession( of one composition`;
  const obj = peel(call.arguments[0]);
  if (obj === undefined || !ts.isObjectLiteralExpression(obj)) return 'the create answers toSession( of something that is not one object literal, so the name tmux applied cannot be read in it';
  if (binding === null) return "the spawn's answer is not assigned to a name, so the answer cannot carry the name tmux applied";
  const props = [...obj.properties];
  const at = props.findIndex(
    (p) => ts.isPropertyAssignment(p) && memberName(p) === 'tmuxName' && ts.isPropertyAccessExpression(peel(p.initializer)) && peel(p.initializer).name.text === 'tmuxName' && ts.isIdentifier(peel(peel(p.initializer).expression)) && peel(peel(p.initializer).expression).text === binding
  );
  if (at === -1) return `the create's answer does not carry \`tmuxName: ${binding}.tmuxName\`, the name tmux applied`;
  if (props.slice(at + 1).some((p) => ts.isSpreadAssignment(p))) return `a spread comes after \`tmuxName: ${binding}.tmuxName\` in the create's answer, so the row's own name wins over the one tmux applied`;
  return null;
}

function wordsTable(sf, f) {
  const decls = sf.statements.filter((s) => ts.isVariableStatement(s) && s.declarationList.declarations.some((d) => ts.isIdentifier(d.name) && d.name.text === 'AFTER_SPAWN_WORDS'));
  if (decls.length !== 1) {
    f.push(`AFTER_SPAWN_WORDS is declared ${String(decls.length)} times at the top of ${FILES.local}, not once (D2)`);
    return null;
  }
  const st = decls[0];
  if (!hasModifier(st, ts.SyntaxKind.ExportKeyword)) f.push(`AFTER_SPAWN_WORDS is not exported (D2, §9.2) (${where(FILES.local, st)})`);
  const d = st.declarationList.declarations.find((x) => x.name.getText() === 'AFTER_SPAWN_WORDS');
  let init = d.initializer;
  while (init !== undefined && (ts.isAsExpression(init) || ts.isParenthesizedExpression(init) || ts.isSatisfiesExpression(init))) init = init.expression;
  const frozen = init !== undefined && ts.isCallExpression(init) && calleeKey(init) === 'Object.freeze' && init.arguments.length === 1;
  if (!frozen) f.push(`AFTER_SPAWN_WORDS is not Object.freeze({ … }) (D2) (${where(FILES.local, st)})`);
  const obj = frozen ? peel(init.arguments[0]) : peel(init);
  if (obj === undefined || !ts.isObjectLiteralExpression(obj)) {
    f.push(`AFTER_SPAWN_WORDS is not one object literal, so its keys cannot be read (${where(FILES.local, st)})`);
    return null;
  }
  const keys = [];
  for (const p of obj.properties) {
    if (!ts.isPropertyAssignment(p) || literalText(p.initializer) === null || ts.isTemplateExpression(peel(p.initializer))) {
      f.push(`AFTER_SPAWN_WORDS holds \`${short(p)}\`, which is not a key with one string literal (${where(FILES.local, p)})`);
      continue;
    }
    keys.push(memberName(p));
  }
  const missing = AFTER_SPAWN_KEYS.filter((k) => !keys.includes(k));
  const extra = keys.filter((k) => !AFTER_SPAWN_KEYS.includes(k));
  if (missing.length > 0) f.push(`AFTER_SPAWN_WORDS has no ${missing.join(', ')}, which §5 names`);
  if (extra.length > 0) f.push(`AFTER_SPAWN_WORDS holds ${extra.join(', ')}, which §5 does not name`);
  return keys;
}

export function ruleCA1(tree) {
  const f = [];
  const sf = sfOf(tree, FILES.local);
  if (sf === null) return [`${FILES.local} is missing`];
  const shape = localShape(sf);
  if (shape.why !== null) return [shape.why];
  if (shape.tail.length === 0) f.push('createLocalSession has no statement after its spawn, so it answers nothing');
  const unsafe = firstUnsafe(FILES.local, shape.tail, CA1_ALLOW);
  if (unsafe !== null) f.push(`after the spawn, ${unsafe}`);
  // The spawn's own try (the probe review, 2026-11-08). Its catch removes the
  // row and rethrows, which is true only while nothing has run, so nothing may
  // follow the spawn inside it, and a finally runs after the spawn answered.
  // A broadcast moved there, or into a finally, left this rule green while the
  // phase's own vitest went red (9 of 33) in a cp -Rc clone.
  const spawnTry = shape.stmts[shape.spawn];
  const inTry = [...spawnTry.tryBlock.statements];
  const holder = inTry.findIndex((s) => callsNamed(s, 'tmux.createSession').length > 0);
  for (const s of inTry.slice(holder + 1)) {
    f.push(`${where(FILES.local, s)}: \`${short(s)}\` sits in the spawn's try after the spawn answered, and that try's catch removes the row and rethrows, so a failure there answers a failure for a running session and deletes its row`);
  }
  if (spawnTry.finallyBlock !== undefined) {
    const fin = firstUnsafe(FILES.local, [...spawnTry.finallyBlock.statements], CA1_ALLOW);
    if (fin !== null) f.push(`in the spawn's finally, which runs after the spawn answered, ${fin}`);
  }
  const last = shape.tail[shape.tail.length - 1];
  if (last !== undefined && !ts.isReturnStatement(last)) f.push(`createLocalSession's last statement is \`${short(last)}\`, not the return of the session it started`);
  else if (last !== undefined) {
    // THE FIX ROUND (the attack lens's ablation X2, which left this gate green):
    // the answer carries the name tmux APPLIED. A record write that failed left
    // the row with the predicted name, so without the overlay the create would
    // answer a name tmux never gave (D5).
    const why = overlayWhy(last, spawnBinding(shape.stmts[shape.spawn]));
    if (why !== null) f.push(`${where(FILES.local, last)}: ${why} (D5)`);
  }
  guardShape(sf, 'afterSpawn', f);
  guardShape(sf, 'afterSpawnRead', f);
  // THE FIX ROUND (D21, lens A's minor): the advisory launch context is not
  // tried after the record write could not be made, because its own write is
  // synchronous and behind a held write lock it waited out the busy timeout
  // again before the create answered (15.4 s against the parent's 10.4 s).
  const recordGuard = nodesOf(shape.fn).find((n) => ts.isCallExpression(n) && calleeKey(n) === 'afterSpawn' && n.arguments[0] !== undefined && ts.isStringLiteralLike(n.arguments[0]) && n.arguments[0].text === 'record');
  const recordedName =
    recordGuard !== undefined && ts.isBinaryExpression(recordGuard.parent) && recordGuard.parent.operatorToken.kind === ts.SyntaxKind.EqualsToken && ts.isIdentifier(peel(recordGuard.parent.left)) ? peel(recordGuard.parent.left).text : null;
  if (recordedName === null) f.push("the record write's guard does not hand its answer to a name, so the launch context cannot ask whether that write was made (D21)");
  for (const c of shape.tail.flatMap((s) => callsNamed(s, 'recordLaunchContext'))) {
    if (recordedName === null || !landsOnlyBy(c, recordedName, shape.fn)) {
      f.push(`${where(FILES.local, c)}: recordLaunchContext( is tried with no test of whether the record write was made, so behind a held write lock its own write waits out the busy timeout again before the create answers (D21)`);
    }
  }
  const code = functionNamed(sf, 'failureCodeOf');
  if (code === null) f.push(`${FILES.local} declares no failureCodeOf (D2)`);
  else {
    const names = code.parameters.filter((p) => ts.isIdentifier(p.name)).map((p) => p.name.text);
    if (readsMessage(code.body, names)) f.push(`failureCodeOf reads the error's message, stack or whole text; it answers a code or a name and never the message (D2) (${where(FILES.local, code)})`);
    // THE FIX ROUND (the attack lens's plant LT4): the guards call it from their
    // catches, and reading `code` or `name` runs a getter, so its body is ONE try
    // whose catch neither throws nor falls through.
    const cs = bodyStatements(code);
    const tr = cs !== null && cs.length === 1 && ts.isTryStatement(cs[0]) ? cs[0] : null;
    const tail = tr?.catchClause?.block.statements.at(-1);
    if (tr === null || tr.catchClause === undefined || throwsOut(tr.catchClause.block) || tail === undefined || !ts.isReturnStatement(tail)) {
      f.push(`failureCodeOf is not ONE try whose catch returns and holds no throw, so a getter that throws while it reads the error leaves a guard's catch and answers a failure for a running session (${where(FILES.local, code)})`);
    }
  }
  const keys = wordsTable(sf, f);
  if (keys !== null) {
    const used = new Set();
    for (const call of nodesOf(sf).filter((n) => ts.isCallExpression(n) && GUARDS.includes(calleeKey(n)))) {
      const first = call.arguments[0];
      if (first === undefined || !ts.isStringLiteralLike(first)) {
        f.push(`${where(FILES.local, call)}: ${calleeKey(call)}( is not handed its step as a string literal`);
        continue;
      }
      if (!keys.includes(first.text)) f.push(`${where(FILES.local, call)}: ${calleeKey(call)}('${first.text}') names a step AFTER_SPAWN_WORDS does not hold`);
      used.add(first.text);
    }
    const unused = AFTER_SPAWN_KEYS.filter((k) => keys.includes(k) && !used.has(k));
    if (unused.length > 0) f.push(`no guard names ${unused.join(', ')}, so a step §3.1 or §3.2 guards is no longer guarded under its own words`);
  }
  return f;
}

// ---------------------------------------------------------------------------
// CA2: the local create's remote branch, and the tab open it calls
// ---------------------------------------------------------------------------

export function ruleCA2(tree) {
  const f = [];
  const sf = sfOf(tree, FILES.local);
  if (sf === null) return [`${FILES.local} is missing`];
  const shape = localShape(sf);
  if (shape.branch === null) return ['createLocalSession has no `if (machineId !== undefined) { … }` block'];
  const bt = branchTail(shape.branch);
  if (bt === null) return ['the remote branch of createLocalSession holds no statement calling remoteCreate('];
  const unsafe = firstUnsafe(FILES.local, bt.tail, CA2_ALLOW);
  if (unsafe !== null) f.push(`in the remote branch, after remoteCreate( answered, ${unsafe}`);
  const bound = nodesOf(bt.holder).find((n) => ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer !== undefined && callsNamed(n.initializer, 'remoteCreate').length > 0);
  const last = bt.tail[bt.tail.length - 1];
  const returnsIt = last !== undefined && ts.isReturnStatement(last) && last.expression !== undefined && bound !== undefined && ts.isIdentifier(peel(last.expression)) && peel(last.expression).text === bound.name.text;
  if (!returnsIt) f.push(`the remote branch does not end \`return ${bound?.name.text ?? '<session>'};\`, the session remoteCreate answered`);
  const rsf = sfOf(tree, FILES.rehome);
  if (rsf === null) return [...f, `${FILES.rehome} is missing`];
  const open = functionNamed(rsf, 'openTabsForRemoteCreate');
  if (open === null) return [...f, `${FILES.rehome} declares no openTabsForRemoteCreate`];
  const writes = nodesOf(open).filter((n) => ts.isCallExpression(n) && calleeKey(n).startsWith('manifest.'));
  if (writes.length === 0) f.push('openTabsForRemoteCreate makes no manifest. call, so this rule cannot read its guards');
  for (const w of writes) {
    let guard = null;
    for (let p = w.parent; p !== undefined && p !== open; p = p.parent) {
      if (ts.isTryStatement(p) && nodesOf(p.tryBlock).includes(w)) {
        guard = p;
        break;
      }
    }
    if (guard === null || guard.catchClause === undefined) f.push(`${where(FILES.rehome, w)}: ${calleeKey(w)}( in openTabsForRemoteCreate sits in no try with a catch`);
    else if (throwsOut(guard.catchClause.block)) f.push(`${where(FILES.rehome, w)}: the catch around ${calleeKey(w)}( in openTabsForRemoteCreate throws, so a tab that could not be written fails a session already running`);
  }
  return f;
}

// ---------------------------------------------------------------------------
// CA3: the create on another machine, after its answer
// ---------------------------------------------------------------------------

/**
 * True when `node` sits in the try block (not the catch, not the finally) of a
 * try inside `stop` whose catch holds no throw; with `allowPass`, a catch may
 * begin with the stopped list's pass-through ({@link stoppedPassThrough}).
 */
function insideQuietTry(node, stop, allowPass = false) {
  for (let p = node.parent; p !== undefined && p !== stop; p = p.parent) {
    if (ts.isTryStatement(p) && nodesOf(p.tryBlock).includes(node) && p.catchClause !== undefined && !catchThrowsOut(p.catchClause, allowPass)) return true;
  }
  return false;
}
/** The innermost try statement inside `stop` whose try block holds `node`, or null. */
function tryHolding(node, stop) {
  for (let p = node.parent; p !== undefined && p !== stop; p = p.parent) {
    if (ts.isTryStatement(p) && nodesOf(p.tryBlock).includes(node)) return p;
  }
  return null;
}

export function ruleCA3(tree) {
  const f = [];
  const sf = sfOf(tree, FILES.remote);
  if (sf === null) return [`${FILES.remote} is missing`];
  const shape = remoteShape(sf);
  if (shape.why !== null) return [shape.why];
  const allow = CA3_ALLOW.map((k) => k.replace('<flight>', shape.flight));
  // HIS THIRD RULED ROUND (D27): the try holding the feed start is the one try
  // after the answer whose catch may begin by letting the stopped list's own
  // refusal through, as the parent did. No other may.
  const feedCalls = shape.after.flatMap((s) => callsNamed(s, 'startMachineFeed'));
  const feedTries = new Set(feedCalls.map((c) => tryHolding(c, shape.one)).filter((t) => t !== null));
  const unsafe = firstUnsafe(FILES.remote, shape.after, allow, { forOfStamps: true, passThrough: feedTries });
  if (unsafe !== null) f.push(`after ${shape.flight}.answered(, ${unsafe}`);
  // The create's finally runs after the answer too, and a throw there replaces
  // the answer (the probe review, 2026-11-08: the env notice moved there left
  // this rule green while the phase's own vitest went red, 3 of 20). FA5 asks
  // that it end the flight; this asks that it do nothing that can throw.
  if (shape.one.finallyBlock !== undefined) {
    const fin = firstUnsafe(FILES.remote, [...shape.one.finallyBlock.statements], [`${shape.flight}.end`]);
    if (fin !== null) f.push(`in remoteCreate's finally, which runs after the answer, ${fin}`);
  }
  const tail = shape.after;
  const feed = feedCalls;
  if (feed.length === 0) f.push(`no statement after ${shape.flight}.answered( calls startMachineFeed(`);
  for (const c of feed) {
    if (!insideQuietTry(c, shape.one, true)) {
      f.push(`${where(FILES.remote, c)}: startMachineFeed( sits in no try whose catch holds no throw but the stopped list's pass-through, so its pass's manifest writes reach the create's answer (§2.2 R6b)`);
      continue;
    }
    // HIS THIRD RULED ROUND (2026-11-17, "360 a then ship 115.0"; D27): and
    // that catch BEGINS by letting the stopped list's own refusal through,
    // before it logs anything, as the parent's unguarded feed start did. The
    // list stopped before that machine's create returned, and there the
    // parent answered "Restart Tortie, then try again" and the window stayed
    // on the session in use; answering the session landed the window on one
    // drawn "Machine unreachable" that took none of his keys and lost the
    // session in use (the reverify's RF and RFL, 3 of 3 each).
    const t = tryHolding(c, shape.one);
    const first = t?.catchClause?.block.statements[0];
    if (t === null || t.catchClause === undefined || stoppedPassThrough(first, t.catchClause) === null) {
      f.push(
        `${where(FILES.remote, c)}: the catch around startMachineFeed( does not begin \`if (isManifestStopped(<err>)) throw <err>;\` with its own binding, ` +
          "so a create on another machine during which the session list stopped before that machine's create returned answers its session, where the parent answered the stopped list's refusal and kept the window on the session in use (his third ruling, D27)"
      );
    }
    // THE PROBE REVIEW OF HIS THIRD RULED ROUND (2026-11-17): and nothing in
    // remoteCreate catches it again. What the pass-through rethrows has to
    // leave remoteCreate to be the create's answer, so the feed's try sits in
    // remoteCreate's own body and no try enclosing it there has a catch. A
    // catch around it (a try wrapped round the feed's statement, a catch added
    // to the one try that holds the create, or a try round that one) took the
    // refusal and the create answered its session, D27 undone, while all six
    // rules read green: the review's plants c01, c02, c05 and c07, over each of
    // which the phase's own vitest went red on the RF and RN shapes.
    if (t !== null) {
      if (enclosingFunction(t) !== shape.fn) {
        f.push(`${where(FILES.remote, t)}: the try around startMachineFeed( sits in a function nested in remoteCreate, so what its catch lets through is not the create's answer (D27)`);
      }
      for (let p = t.parent; p !== undefined && p !== shape.fn; p = p.parent) {
        if (ts.isTryStatement(p) && p.catchClause !== undefined && nodesOf(p.tryBlock).includes(t)) {
          f.push(`${where(FILES.remote, p)}: a catch in remoteCreate encloses the try around startMachineFeed(, so the stopped list's refusal its catch lets through is caught again and never reaches the create's answer (D27)`);
        }
      }
    }
  }
  // D27: the refusal is the store's own, read by its code through the store's
  // one predicate, never a second spelling that could answer for the store. It
  // reaches remote-sessions.ts through the machine layer's one door to the
  // manifest (remote-record.ts, Phase 72's rule, which
  // __tests__/remote-sessions.test.ts holds as an import list), which takes it
  // from the store under its own name and declares none of its own.
  if (!importedFrom(sf, 'isManifestStopped', './remote-record')) {
    f.push(`${FILES.remote} does not take isManifestStopped from ./remote-record under its own name, or declares one of its own, so the feed's catch may not let exactly the stopped list's refusal through (D27)`);
  }
  const rsf = sfOf(tree, FILES.record);
  if (rsf === null) f.push(`${FILES.record} is missing`);
  else if (!reExportedFrom(rsf, 'isManifestStopped', '../manifest/store')) {
    f.push(`${FILES.record} does not re-export isManifestStopped from ../manifest/store under its own name, or declares one of its own, so the predicate remote-sessions.ts asks may not be the store's (D27)`);
  }
  const notices = tail.flatMap((s) => callsNamed(s, 'postDurabilityNotice'));
  if (notices.length === 0) f.push(`no statement after ${shape.flight}.answered( raises the env notice (postDurabilityNotice()`);
  for (const c of notices) if (!insideQuietTry(c, shape.one)) f.push(`${where(FILES.remote, c)}: the env notice sits in no try whose catch holds no throw`);
  const compose = tail.flatMap((s) => nodesOf(s).filter((n) => (ts.isCallExpression(n) && calleeKey(n).endsWith('.sort')) || (ts.isNewExpression(n) && calleeKey(n) === 'new Set')));
  for (const c of compose) if (!insideQuietTry(c, shape.one)) f.push(`${where(FILES.remote, c)}: the envMissing composition (\`${short(c)}\`) sits in no try whose catch holds no throw`);
  const ret = tail[tail.length - 1];
  if (ret === undefined || !ts.isReturnStatement(ret) || ret.expression === undefined || !ts.isCallExpression(peel(ret.expression)) || calleeKey(peel(ret.expression)) !== 'remoteCreateAnswer') {
    f.push(`remoteCreate's try does not end \`return remoteCreateAnswer(…)\` (D13)`);
  }
  // remoteCreateAnswer never throws.
  const answer = functionNamed(sf, 'remoteCreateAnswer');
  const stmts = bodyStatements(answer);
  if (stmts === null) return [...f, `${FILES.remote} declares no remoteCreateAnswer with a body (D13)`];
  const inAnswer = firstUnsafe(FILES.remote, stmts, ANSWER_ALLOW);
  if (inAnswer !== null) f.push(`in remoteCreateAnswer, ${inAnswer}`);
  const last = stmts[stmts.length - 1];
  if (last === undefined || !ts.isReturnStatement(last) || last.expression === undefined || effectsOf(last.expression).calls.length > 0) {
    f.push(`remoteCreateAnswer does not end returning a composition that holds no call (D12, D13) (${where(FILES.remote, answer)})`);
  }
  const machine = callsNamed(answer, 'remoteSessionMachine');
  if (machine.length === 0) f.push('remoteCreateAnswer never calls remoteSessionMachine(, so a session no list has shown carries no machine (D12)');
  for (const c of machine) if (!insideQuietTry(c, answer)) f.push(`${where(FILES.remote, c)}: remoteSessionMachine( sits in no try in remoteCreateAnswer`);
  return f;
}

// ---------------------------------------------------------------------------
// CA4: the far answer, read by its id and never by its text
// ---------------------------------------------------------------------------

/** Driven answers, by variant source: `[{ printed, id, lines, threw }]`, or a string saying why it could not be driven. */
const driven = new Map();
let drivenModule = null;
let drivenWhy = '';

/**
 * The source the driven half evaluates for one tree's create-confirmation.ts:
 * the two readers and every top-level declaration of their own file they read,
 * transitively, `export` dropped. A reader that reads an import gets a
 * ReferenceError when driven, which is what "pure, no import" (D10) means here.
 */
export function readerSource(sf) {
  if (sf === null) return null;
  const decls = new Map();
  for (const st of sf.statements) {
    if (ts.isFunctionDeclaration(st) && st.name !== undefined) decls.set(st.name.text, st);
    else if (ts.isVariableStatement(st)) for (const d of st.declarationList.declarations) if (ts.isIdentifier(d.name)) decls.set(d.name.text, st);
  }
  if (!decls.has('createdTmuxIdOf')) return null;
  const keep = new Set();
  const queue = ['createdTmuxIdOf', 'answerLineCount'].filter((n) => decls.has(n));
  while (queue.length > 0) {
    const name = queue.shift();
    const st = decls.get(name);
    if (st === undefined || keep.has(st)) continue;
    keep.add(st);
    for (const n of nodesOf(st)) if (ts.isIdentifier(n) && decls.has(n.text) && !keep.has(decls.get(n.text))) queue.push(n.text);
  }
  return sf.statements
    .filter((s) => keep.has(s))
    .map((s) => s.getText().replace(/^export\s+(?:default\s+)?/, ''))
    .join('\n');
}

function driveReaders(sources) {
  const variants = [...sources];
  const table = READER_TABLE.map(([printed]) => printed);
  const runner = [
    `const TABLE: string[] = ${JSON.stringify(table)};`,
    'type Readers = { created: unknown; lines: unknown };',
    'const run = (r: Readers) => TABLE.map((printed) => {',
    '  const one: { printed: string; id?: unknown; lines?: unknown; threw?: string } = { printed };',
    "  try { one.id = typeof r.created === 'function' ? (r.created as (p: string) => unknown)(printed) : 'createdTmuxIdOf is not a function'; } catch (err) { one.threw = `createdTmuxIdOf: ${String((err as Error)?.message ?? err).slice(0, 200)}`; }",
    "  try { one.lines = typeof r.lines === 'function' ? (r.lines as (p: string) => unknown)(printed) : 'answerLineCount is not a function'; } catch (err) { one.threw = `${one.threw ?? ''} answerLineCount: ${String((err as Error)?.message ?? err).slice(0, 200)}`; }",
    '  return one;',
    '});',
    'const variants: Readers[] = [',
    ...variants.map((t) => `  (() => {\n${t}\n  return { created: typeof createdTmuxIdOf === 'function' ? createdTmuxIdOf : undefined, lines: typeof answerLineCount === 'function' ? answerLineCount : undefined };\n  })(),`),
    '];',
    'const out: { variants: unknown[]; module: unknown } = { variants: variants.map(run), module: null };',
    "try { const m = await import('./src/main/machines/create-confirmation.ts'); out.module = run({ created: (m as Record<string, unknown>).createdTmuxIdOf, lines: (m as Record<string, unknown>).answerLineCount }); }",
    'catch (err) { out.module = `the module did not import: ${String((err as Error)?.message ?? err).slice(0, 300)}`; }',
    "console.log('P360_CA4:' + JSON.stringify(out));"
  ].join('\n');
  const tsconfig = existsSync(join(ROOT, 'tsconfig.node.json')) ? ['--tsconfig', 'tsconfig.node.json'] : [];
  const run = spawnSync(process.execPath, [tsxCli(), ...tsconfig, '-'], {
    cwd: ROOT,
    input: runner,
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
    timeout: 90_000,
    // electron's index.js answers a path string and never downloads when this is set (vitest.config.ts says why).
    env: { ...process.env, ELECTRON_OVERRIDE_DIST_PATH: join(ROOT, 'node_modules', 'electron', 'dist') }
  });
  const line = (run.stdout ?? '').split('\n').find((l) => l.startsWith('P360_CA4:'));
  if (line === undefined) {
    drivenWhy = `the pinned tsx printed no answer (exit ${String(run.status)}${run.signal ? `, ${run.signal}` : ''}): ${`${run.stdout ?? ''}${run.stderr ?? ''}`.trim().split('\n').slice(-6).join(' / ').slice(0, 600)}`;
    return;
  }
  const out = JSON.parse(line.slice('P360_CA4:'.length));
  variants.forEach((t, i) => driven.set(t, out.variants[i] ?? []));
  if (Array.isArray(out.module)) drivenModule = out.module;
  else drivenWhy = String(out.module);
}

/** The table's verdict over one driven answer list. */
function tableProblems(results, label) {
  const out = [];
  if (!Array.isArray(results) || results.length !== READER_TABLE.length) return [`${label}: ${String(results?.length ?? 0)} answers for ${String(READER_TABLE.length)} rows`];
  READER_TABLE.forEach(([printed, id, lines], i) => {
    const r = results[i];
    if (r.threw !== undefined) out.push(`${label}: ${JSON.stringify(printed)} threw (${r.threw.trim()}), so the reader is not pure or not total`);
    else {
      if (r.id !== id) out.push(`${label}: createdTmuxIdOf(${JSON.stringify(printed)}) answered ${JSON.stringify(r.id)}, must answer ${JSON.stringify(id)}`);
      if (r.lines !== lines) out.push(`${label}: answerLineCount(${JSON.stringify(printed)}) answered ${JSON.stringify(r.lines)}, must answer ${String(lines)}`);
    }
  });
  return out;
}

export function ruleCA4(tree) {
  const f = [];
  const sf = sfOf(tree, FILES.remote);
  if (sf === null) return [`${FILES.remote} is missing`];
  const fn = functionNamed(sf, 'remoteCreate');
  if (fn === null) return ['remote-sessions.ts declares no remoteCreate'];
  const execs = newSessionExecs(fn);
  let binding = null;
  if (execs.length !== 1) f.push(`remoteCreate holds ${String(execs.length)} new-session execOn(ctx, args calls, not one`);
  else {
    const b = answerBinding(execs[0]);
    if (b.name === null) {
      const direct = b.direct;
      const ok = direct !== null && ts.isCallExpression(direct) && ['createdTmuxIdOf', 'answerLineCount'].includes(calleeKey(direct));
      if (!ok) f.push(`the new-session answer is read by \`${direct === null ? 'nothing' : short(direct)}\`, not by createdTmuxIdOf( (D10)`);
    } else {
      binding = b.name;
      const refs = nodesOf(fn).filter((n) => ts.isIdentifier(n) && n.text === b.name && n !== b.node && !(ts.isPropertyAccessExpression(n.parent) && n.parent.name === n) && !(ts.isVariableDeclaration(n.parent) && n.parent.name === n));
      let readers = 0;
      for (const r of refs) {
        const p = r.parent;
        const byReader = ts.isCallExpression(p) && p.arguments.includes(r) && ['createdTmuxIdOf', 'answerLineCount'].includes(calleeKey(p));
        if (byReader) {
          if (calleeKey(p) === 'createdTmuxIdOf') readers += 1;
          continue;
        }
        const split = ts.isPropertyAccessExpression(p) && p.name.text === 'split';
        f.push(`${where(FILES.remote, r)}: the new-session answer \`${b.name}\` is read by \`${short(p)}\`${split ? ', a .split( of its text,' : ''} and not by createdTmuxIdOf( or answerLineCount( (D10)`);
      }
      if (readers === 0) f.push(`the new-session answer \`${b.name}\` never reaches createdTmuxIdOf( (D10)`);
    }
  }
  const dollar = dollarIf(fn);
  if (dollar === null) f.push("remoteCreate has no `if` asking startsWith('$') (FA5's test)");
  else {
    const settles = callsNamed(dollar.thenStatement, 'settleUnansweredCreate');
    if (!settles.some((c) => passesKind(c, 'unread'))) f.push("the startsWith('$') block does not hand settleUnansweredCreate( `{ kind: 'unread', … }` (D11)");
    if (callsNamed(dollar.thenStatement, 'dropRemoteRow').length > 0) f.push("the startsWith('$') block drops the row, which deletes the only record of a session the far command started (§2.3)");
    if (throwsOut(dollar.thenStatement)) f.push("the startsWith('$') block throws, so an answer that is not one id is answered before the identity read");
  }
  const settle = functionNamed(sf, 'settleUnansweredCreate');
  if (settle === null) f.push(`${FILES.remote} declares no settleUnansweredCreate (D11)`);
  else {
    const first = (key) => {
      const c = callsNamed(settle, key);
      return c.length === 0 ? null : Math.min(...c.map((x) => x.getStart()));
    };
    const confirm = first('confirmCreate');
    const drop = first('dropRemoteRow');
    const mark = first('markRemoteCreateUnconfirmed');
    if (confirm === null) f.push('settleUnansweredCreate never calls confirmCreate(, so nothing reads the session by its id');
    if (drop === null) f.push('settleUnansweredCreate never calls dropRemoteRow(, so a proven absence keeps a row for nothing (D11)');
    if (mark === null) f.push('settleUnansweredCreate never calls markRemoteCreateUnconfirmed(, so an unread answer is not kept unknown (D11)');
    if (confirm !== null && drop !== null && drop < confirm) f.push('settleUnansweredCreate drops the row before confirmCreate( reads the session by its id');
    if (confirm !== null && mark !== null && mark < confirm) f.push('settleUnansweredCreate marks the row unknown before confirmCreate( reads it');
    // THE FIX ROUND (the attack lens's ablation X3, which left this rule green and
    // only conformance:machines' caller count red): the row is dropped only in the
    // arm where tmux itself answered that nothing runs. An answer that could not
    // be read, whose identity read could not be made either, keeps its row
    // unknown exactly as a lost answer does (D11), or the only record of a
    // session that may be running is deleted.
    for (const c of callsNamed(settle, 'dropRemoteRow')) {
      if (!insideDropArm(c, settle)) f.push(`${where(FILES.remote, c)}: settleUnansweredCreate drops the row outside the arm where tmux answered that nothing runs ('dropRow'), so a session whose read could not be made loses the only record of it (D11)`);
    }
    if (binding !== null) {
      for (const g of callsNamed(settle, 'gmuxError')) {
        if (nodesOf(g).some((n) => (ts.isIdentifier(n) || ts.isPrivateIdentifier(n)) && n.text === binding)) f.push(`${where(FILES.remote, g)}: a gmuxError( in settleUnansweredCreate names \`${binding}\`, the far answer's text (D10)`);
      }
    }
  }
  // The driven half.
  const src = readerSource(sfOf(tree, FILES.confirm));
  if (src === null) f.push(`${FILES.confirm} declares no createdTmuxIdOf to drive (D10)`);
  else {
    const results = driven.get(src);
    if (results === undefined) f.push(`createdTmuxIdOf was not driven: ${drivenWhy || 'the driven half printed no answer'}`);
    else f.push(...tableProblems(results, '(driven)'));
  }
  return f;
}

/** True when `node` sits in the then branch of an `if` (inside `stop`) whose condition compares with the literal 'dropRow'. */
function insideDropArm(node, stop) {
  for (let p = node.parent; p !== undefined && p !== stop; p = p.parent) {
    if (!ts.isIfStatement(p) || !nodesOf(p.thenStatement).includes(node)) continue;
    const e = peel(p.expression);
    const eq = e !== undefined && ts.isBinaryExpression(e) && [ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.EqualsEqualsToken].includes(e.operatorToken.kind);
    if (eq && [e.left, e.right].some((side) => ts.isStringLiteralLike(peel(side)) && peel(side).text === 'dropRow')) return true;
  }
  return false;
}

/** The shipped module's exports, driven beside the text. Asked once, of the unedited tree. */
function moduleAgreement(tree) {
  const src = readerSource(sfOf(tree, FILES.confirm));
  if (src === null) return [];
  if (drivenModule === null) return [`(driven) the shipped create-confirmation.ts could not be driven: ${drivenWhy || 'no answer'}`];
  const out = tableProblems(drivenModule, '(driven, the shipped module)');
  const fromText = driven.get(src);
  if (Array.isArray(fromText)) {
    drivenModule.forEach((m, i) => {
      const t = fromText[i];
      if (t !== undefined && (m.id !== t.id || m.lines !== t.lines)) out.push(`(driven) the shipped module answers ${JSON.stringify([m.id, m.lines])} for ${JSON.stringify(m.printed)} where the text this gate read answers ${JSON.stringify([t.id, t.lines])}`);
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// CA5: a create during which the list stopped answers the parent's refusal
// ---------------------------------------------------------------------------

const MUTATORS = Object.freeze(['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse', 'fill', 'copyWithin', 'length']);
const isThisField = (n, field) => n !== undefined && ts.isPropertyAccessExpression(n) && n.expression.kind === ts.SyntaxKind.ThisKeyword && n.name.text === field;

/** True when `n` writes `this.<field>`: any assignment to it or an element of it, a delete, or a mutating call on it. */
function writesField(n, field) {
  if (ts.isBinaryExpression(n) && n.operatorToken.kind >= ts.SyntaxKind.FirstAssignment && n.operatorToken.kind <= ts.SyntaxKind.LastAssignment) {
    const left = peel(n.left);
    return isThisField(left, field) || (left !== undefined && ts.isElementAccessExpression(left) && isThisField(peel(left.expression), field)) || (left !== undefined && ts.isPropertyAccessExpression(left) && isThisField(peel(left.expression), field) && left.name.text === 'length');
  }
  if (ts.isDeleteExpression(n)) return isThisField(peel(n.expression), field);
  if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && MUTATORS.includes(n.expression.name.text)) return isThisField(peel(n.expression.expression), field);
  return false;
}

/** `const <name> = await createLocalSession(…)`: the name, or null. */
function awaitedCreateName(stmt) {
  if (!ts.isVariableStatement(stmt) || stmt.declarationList.declarations.length !== 1) return null;
  const d = stmt.declarationList.declarations[0];
  const init = d.initializer === undefined ? undefined : peel(d.initializer);
  if (init === undefined || !ts.isAwaitExpression(init)) return null;
  const call = peel(init.expression);
  if (call === undefined || !ts.isCallExpression(call) || calleeKey(call) !== 'createLocalSession') return null;
  return ts.isIdentifier(d.name) ? d.name.text : null;
}
/** The one statement an `if` branch is: the statement itself, or a block's only statement. */
function onlyStatement(branch) {
  if (ts.isBlock(branch)) return branch.statements.length === 1 ? branch.statements[0] : null;
  return branch;
}
/** `throw manifestStoppedError('<an operation>')`: the operation, or null. */
function stoppedThrowOperation(stmt) {
  if (stmt === null || !ts.isThrowStatement(stmt)) return null;
  const e = peel(stmt.expression);
  if (e === undefined || !ts.isCallExpression(e) || calleeKey(e) !== 'manifestStoppedError' || e.arguments.length !== 1) return null;
  const arg = peel(e.arguments[0]);
  return arg !== undefined && ts.isStringLiteralLike(arg) ? arg.text : null;
}

/**
 * HIS SECOND RULING (2026-11-16): `createMachineIdFor(<input>) === undefined`,
 * either side of the `===`, where `<input>` is `createSession`'s own parameter,
 * the very object the create decides its machine from. The one rule, so the
 * check covers exactly the creates that run on this Mac.
 */
function onThisMacTest(expr, inputName) {
  const e = peel(expr);
  if (e === undefined || !ts.isBinaryExpression(e) || e.operatorToken.kind !== ts.SyntaxKind.EqualsEqualsEqualsToken) return false;
  const isUndefined = (x) => x !== undefined && ts.isIdentifier(x) && x.text === 'undefined';
  const left = peel(e.left);
  const right = peel(e.right);
  const call = isUndefined(right) ? left : isUndefined(left) ? right : undefined;
  if (call === undefined || !ts.isCallExpression(call) || calleeKey(call) !== 'createMachineIdFor' || call.arguments.length !== 1) return false;
  const arg = peel(call.arguments[0]);
  return inputName !== null && arg !== undefined && ts.isIdentifier(arg) && arg.text === inputName;
}
/** `this.manifest.stoppedReading()`, the store's own latch, which touches no SQLite. */
const isLatch = (expr) => expr !== undefined && squash(peel(expr).getText()) === 'this.manifest.stoppedReading()';
/**
 * D26 (his second ruled round's measurement): `remoteSessionRow(<session>.id) === null`,
 * either side of the `===`: no list of that machine has shown the session the
 * create answered, so main would not open it while the list is stopped.
 */
function unlistedTest(expr, sessionName) {
  const e = peel(expr);
  if (e === undefined || !ts.isBinaryExpression(e) || e.operatorToken.kind !== ts.SyntaxKind.EqualsEqualsEqualsToken) return false;
  const isNull = (x) => x !== undefined && x.kind === ts.SyntaxKind.NullKeyword;
  const left = peel(e.left);
  const right = peel(e.right);
  const call = isNull(right) ? left : isNull(left) ? right : undefined;
  if (call === undefined || !ts.isCallExpression(call) || calleeKey(call) !== 'remoteSessionRow' || call.arguments.length !== 1) return false;
  return sessionName !== null && squash(peel(call.arguments[0]).getText()) === `${sessionName}.id`;
}
/**
 * The check's condition: the latch `&&` (the on-this-Mac test `||` the
 * unlisted test), in either order of either operator: on this Mac main opens
 * no session while the list is stopped; on another machine it opens one a
 * list has shown, from memory.
 */
function ca5Condition(expr, inputName, sessionName) {
  const e = peel(expr);
  if (e === undefined || !ts.isBinaryExpression(e) || e.operatorToken.kind !== ts.SyntaxKind.AmpersandAmpersandToken) return false;
  const opens = (x) => {
    const o = peel(x);
    if (o === undefined || !ts.isBinaryExpression(o) || o.operatorToken.kind !== ts.SyntaxKind.BarBarToken) return false;
    return (onThisMacTest(o.left, inputName) && unlistedTest(o.right, sessionName)) || (onThisMacTest(o.right, inputName) && unlistedTest(o.left, sessionName));
  };
  return (isLatch(e.left) && opens(e.right)) || (isLatch(e.right) && opens(e.left));
}
/** True when core.ts takes `name` from `module` under its own name and declares none of its own. */
function importedFrom(sf, name, module) {
  const imported = sf.statements.some(
    (s) =>
      ts.isImportDeclaration(s) &&
      ts.isStringLiteral(s.moduleSpecifier) &&
      s.moduleSpecifier.text === module &&
      s.importClause?.isTypeOnly !== true &&
      s.importClause?.namedBindings !== undefined &&
      ts.isNamedImports(s.importClause.namedBindings) &&
      s.importClause.namedBindings.elements.some((el) => el.isTypeOnly !== true && el.name.text === name && (el.propertyName === undefined || el.propertyName.text === name))
  );
  // THE PROBE REVIEW OF HIS SECOND RULED ROUND (2026-11-16): a parameter and a
  // destructured binding are spellings too. A defaulted parameter of the
  // admitted function or of createSession named after either rule shadows the
  // import inside the check (`async (remoteSessionRow = () => null) => …`
  // refuses every create on another machine, his first ruling's core), and this
  // read green over four such plants while the phase's own vitest went red.
  const ownDeclaration = nodesOf(sf).some(
    (n) =>
      (ts.isFunctionDeclaration(n) || ts.isVariableDeclaration(n) || ts.isClassDeclaration(n) || ts.isParameter(n) || ts.isBindingElement(n)) &&
      n.name !== undefined &&
      ts.isIdentifier(n.name) &&
      n.name.text === name
  );
  return imported && !ownDeclaration;
}
/**
 * HIS THIRD RULED ROUND (D27): `export { <name> } from '<module>'` in `sf`,
 * under its own name, with no declaration, parameter or binding of that name
 * in `sf` (the spelling `importedFrom` refuses).
 */
function reExportedFrom(sf, name, module) {
  const exported = sf.statements.some(
    (s) =>
      ts.isExportDeclaration(s) &&
      s.isTypeOnly !== true &&
      s.moduleSpecifier !== undefined &&
      ts.isStringLiteral(s.moduleSpecifier) &&
      s.moduleSpecifier.text === module &&
      s.exportClause !== undefined &&
      ts.isNamedExports(s.exportClause) &&
      s.exportClause.elements.some((el) => el.isTypeOnly !== true && el.name.text === name && (el.propertyName === undefined || el.propertyName.text === name))
  );
  const ownDeclaration = nodesOf(sf).some(
    (n) =>
      (ts.isFunctionDeclaration(n) || ts.isVariableDeclaration(n) || ts.isClassDeclaration(n) || ts.isParameter(n) || ts.isBindingElement(n)) &&
      n.name !== undefined &&
      ts.isIdentifier(n.name) &&
      n.name.text === name
  );
  return exported && !ownDeclaration;
}
/** The create's own machine rule, and the machines layer's own row read (D25, D26). */
const machineRuleImported = (sf) => importedFrom(sf, 'createMachineIdFor', './launch-plan');
const rowReadImported = (sf) => importedFrom(sf, 'remoteSessionRow', '../machines/remote-sessions');

/** `createSession`'s `this.ledger.admit('createSession', …)` call in `sf`, or undefined. */
function ca5Admit(sf) {
  const cls = classNamed(sf, 'GmuxCore');
  const create = cls === null ? null : methodOf(cls, 'createSession');
  return create === null ? undefined : nodesOf(create).find((n) => ts.isCallExpression(n) && calleeKey(n).endsWith('.admit'));
}
/** `createSession`'s admitted body's statements in `sf`, or null. */
function ca5Body(sf) {
  const admit = ca5Admit(sf);
  const body = admit === undefined ? undefined : peel(admit.arguments[1]);
  return body !== undefined && isFunctionLike(body) && ts.isBlock(body.body) ? [...body.body.statements] : null;
}

export function ruleCA5(tree) {
  const f = [];
  const sf = sfOf(tree, FILES.core);
  if (sf === null) return [`${FILES.core} is missing`];
  const cls = classNamed(sf, 'GmuxCore');
  if (cls === null) return [`${FILES.core} declares no class GmuxCore`];
  const create = methodOf(cls, 'createSession');
  const admit = create === null ? undefined : nodesOf(create).find((n) => ts.isCallExpression(n) && calleeKey(n).endsWith('.admit') && ts.isStringLiteralLike(n.arguments[0]) && n.arguments[0].text === 'createSession');
  const body = admit === undefined ? undefined : peel(admit.arguments[1]);
  if (body === undefined || !isFunctionLike(body) || !ts.isBlock(body.body)) {
    f.push("GmuxCore.createSession does not admit a block-bodied function under 'createSession' (D24)");
  } else {
    const at = where(FILES.core, body);
    const stmts = [...body.body.statements];
    // THE PROBE REVIEW OF HIS SECOND RULED ROUND: the ledger calls the admitted
    // function with nothing, so a parameter of it can only be a defaulted one,
    // and a default named like createSession's input hands the create and the
    // check another object than the window sent, with every name below intact.
    if (body.parameters.length > 0) f.push(`the admitted function takes ${String(body.parameters.length)} parameter(s), and the ledger hands it none: a defaulted one can shadow createSession's input or either rule the check asks (${at})`);
    const name = stmts.length === 0 ? null : awaitedCreateName(stmts[0]);
    if (name === null) f.push(`the admitted body's first statement is not \`const <session> = await createLocalSession(…)\`, so the decision is not made after the create ended (${at})`);
    // HIS SECOND RULING: the machine is read from createSession's own
    // parameter, the object handed to the create, by the create's own rule.
    const param = create.parameters[0];
    const inputName = param !== undefined && ts.isIdentifier(param.name) ? param.name.text : null;
    const awaited = stmts.length === 0 || !ts.isVariableStatement(stmts[0]) ? undefined : peel(peel(stmts[0].declarationList.declarations[0]?.initializer)?.expression);
    const createArg = awaited !== undefined && ts.isCallExpression(awaited) ? peel(awaited.arguments[0]) : undefined;
    if (name !== null && (inputName === null || createArg === undefined || !ts.isIdentifier(createArg) || createArg.text !== inputName)) {
      f.push(`the create is not handed createSession's own input, so the machine the check reads may not be the machine the create ran on (${at})`);
    }
    // The decision: the store's own latch, read once the create has ended,
    // for a create on this Mac alone (his second ruling), answered with the
    // stopped list's own refusal and never swallowed.
    const check = stmts[1];
    const asks = check !== undefined && ts.isIfStatement(check) && check.elseStatement === undefined && ca5Condition(check.expression, inputName, name);
    const operation = asks ? stoppedThrowOperation(onlyStatement(check.thenStatement)) : null;
    if (!asks) {
      f.push(
        `the admitted body's second statement is not \`if (this.manifest.stoppedReading() && (createMachineIdFor(${inputName ?? 'input'}) === undefined || remoteSessionRow(${name ?? 'session'}.id) === null))\` with no else: ` +
          'without the latch a create on this Mac during which the session list stopped answers its session and the window lands on one main will not open; ' +
          'without the machine test a create on another machine during which the list stopped after that machine answered says "Restart Tortie, then try again" for a session running there, which the parent answered; ' +
          `without the unlisted test a create on another machine no list has shown lands the window on a session main will not open, where the parent answered a failure (${at})`
      );
    } else if (operation === null) {
      f.push(`the stopped branch is not ONE \`throw manifestStoppedError('<operation>')\`, so a create during which the list stopped does not answer the parent's refusal (${where(FILES.core, check)})`);
    }
    const ret = stmts[2];
    const returns = ret !== undefined && ts.isReturnStatement(ret) && ret.expression !== undefined && name !== null && ts.isIdentifier(peel(ret.expression)) && peel(ret.expression).text === name;
    if (!returns) f.push(`the admitted body's third statement does not return ${name ?? 'the session'} (${at})`);
    if (stmts.length !== 3) f.push(`the admitted body is ${String(stmts.length)} statement(s), not the three the decision is (${at})`);
    // Nothing inside the body swallows the refusal on its way out.
    for (const t of nodesOf(body.body).filter((n) => ts.isTryStatement(n))) f.push(`${where(FILES.core, t)}: a try inside the admitted body, which could swallow the stopped refusal`);
    // THE PROBE REVIEW OF HIS RULED ROUND (2026-11-14): nor on its way out of
    // createSession. A `.catch(` chained on the admit, or a `try` around it in
    // an async createSession, swallowed or replaced the refusal with the three
    // statements above intact, and this rule read green over both, each a
    // create during which the list stopped answering something other than the
    // parent's refusal (both are ablations below).
    const outer = create.body?.statements ?? [];
    const soleReturn = outer.length === 1 && ts.isReturnStatement(outer[0]) && outer[0].expression !== undefined && peel(outer[0].expression) === admit;
    if (!soleReturn) f.push(`createSession is not ONE \`return this.ledger.admit('createSession', …)\` with nothing chained on the admit and nothing around it, so a catch outside the admitted body can swallow or replace the stopped refusal (${where(FILES.core, create)})`);
  }
  // HIS SECOND RULING: the machine test is the create's own rule, never a
  // second spelling of it that could disagree about which creates run here.
  if (!machineRuleImported(sf)) f.push(`${FILES.core} does not take createMachineIdFor from ./launch-plan under its own name, or declares one of its own, so the stopped check may not ask about the machine the create decided`);
  // D26: and the row read is the one main's attach reads, never a second spelling.
  if (!rowReadImported(sf)) f.push(`${FILES.core} does not take remoteSessionRow from ../machines/remote-sessions under its own name, or declares one of its own, so the stopped check may not ask the row main opens a session on another machine from`);
  // Every member, a property's initializer included: the fix round's keep put
  // back as an arrow property (an ablation below) was never read by a walk
  // that skipped property declarations, and the rule read green over it. The
  // field's own declaration
  // (`private lastCleanList: Session[] | null = null`) holds no assignment
  // expression, so it is not a writer.
  const writers = new Set();
  for (const el of cls.members) {
    if (nodesOf(el).some((n) => writesField(n, 'lastCleanList'))) writers.add(memberName(el) || '(a member with no name)');
  }
  const want = ['listSessions'];
  const got = [...writers].sort();
  if (JSON.stringify(got) !== JSON.stringify(want)) f.push(`this.lastCleanList is written in ${got.join(', ') || 'nothing'}, not exactly in ${want.join(' and ')}: a create during which the list stopped is not added to the list the windows draw, as at the parent`);
  // The old keep is gone with the answer it served, as a method or as a property.
  if (cls.members.some((el) => memberName(el) === 'keepCreatedSession')) f.push('GmuxCore still declares keepCreatedSession, which grew the stopped list for an answer the create no longer gives');
  return f;
}

// ---------------------------------------------------------------------------
// CA6: the words a remote create says
// ---------------------------------------------------------------------------

export function ruleCA6(tree) {
  const f = [];
  const sf = sfOf(tree, FILES.remote);
  if (sf === null) return [`${FILES.remote} is missing`];
  const create = functionNamed(sf, 'remoteCreate');
  const settle = functionNamed(sf, 'settleUnansweredCreate');
  for (const [name, fn] of [['remoteCreate', create], ['settleUnansweredCreate', settle]]) {
    if (fn === null) {
      f.push(`${FILES.remote} declares no ${name}`);
      continue;
    }
    for (const c of callsNamed(fn, 'noRemoteRowFor')) f.push(`${where(FILES.remote, c)}: ${name} calls noRemoteRowFor(, which says "Nothing was changed." for a create whose far command ran`);
  }
  // The new sentence.
  const csf = sfOf(tree, FILES.copy);
  if (csf === null) return [...f, `${FILES.copy} is missing`];
  const decl = csf.statements.find(
    (s) =>
      (ts.isFunctionDeclaration(s) && s.name?.text === 'remoteCreateNotStarted') ||
      (ts.isVariableStatement(s) && s.declarationList.declarations.some((d) => ts.isIdentifier(d.name) && d.name.text === 'remoteCreateNotStarted'))
  );
  if (decl === undefined || !hasModifier(decl, ts.SyntaxKind.ExportKeyword)) f.push(`${FILES.copy} does not export remoteCreateNotStarted (D18)`);
  else {
    const fn = functionNamed(csf, 'remoteCreateNotStarted');
    const ret = fn === null ? undefined : ts.isBlock(fn.body) ? [...fn.body.statements].find((s) => ts.isReturnStatement(s))?.expression : fn.body;
    const sentence = ret === undefined ? null : literalText(ret);
    if (sentence === null) f.push(`remoteCreateNotStarted does not return one sentence of literals, so its words cannot be read (${where(FILES.copy, decl)})`);
    else for (const w of TMUX_WORDS) if (new RegExp(`\\b${w}`, 'i').test(sentence)) f.push(`remoteCreateNotStarted says "${w}", a word a person never reads about a session`);
  }
  // Named exactly once under src/main, in settleUnansweredCreate's drop arm.
  const uses = [];
  for (const rel of pathsNaming(tree, 'remoteCreateNotStarted')) {
    const one = sfOf(tree, rel);
    for (const n of nodesOf(one)) {
      if (!ts.isIdentifier(n) || n.text !== 'remoteCreateNotStarted') continue;
      const p = n.parent;
      if (rel === FILES.copy && ((ts.isFunctionDeclaration(p) && p.name === n) || (ts.isVariableDeclaration(p) && p.name === n))) continue;
      if (ts.isImportSpecifier(p) || ts.isExportSpecifier(p) || ts.isImportClause(p)) continue;
      uses.push({ rel, n });
    }
  }
  if (uses.length !== 1) f.push(`remoteCreateNotStarted is named ${String(uses.length)} times under src/main (${uses.map((u) => where(u.rel, u.n)).join(', ') || 'nowhere'}), not exactly once`);
  for (const u of uses) {
    const call = ts.isCallExpression(u.n.parent) && u.n.parent.expression === u.n ? u.n.parent : null;
    const err = call !== null && ts.isCallExpression(call.parent) && call.parent.arguments[1] === call && calleeKey(call.parent) === 'gmuxError' && ts.isStringLiteralLike(call.parent.arguments[0]) && call.parent.arguments[0].text === 'SPAWN_FAILED' ? call.parent : null;
    const inSettle = u.rel === FILES.remote && settle !== null && nodesOf(settle).includes(u.n);
    if (err === null || !inSettle) {
      f.push(`${where(u.rel, u.n)}: remoteCreateNotStarted is not the message of a gmuxError('SPAWN_FAILED', …) in settleUnansweredCreate`);
      continue;
    }
    let dropped = false;
    for (let p = err.parent; p !== undefined && p !== settle; p = p.parent) {
      if (ts.isBlock(p) && callsNamed(p, 'dropRemoteRow').some((d) => d.getStart() < err.getStart())) {
        dropped = true;
        break;
      }
    }
    if (!dropped) f.push(`${where(u.rel, u.n)}: remoteCreateNotStarted is said where no dropRemoteRow( came before it, so it is not the proven-absent arm`);
  }
  // No literal after the answer says nothing changed.
  if (create !== null) {
    const shape = remoteShape(sf);
    if (shape.why === null) {
      const from = shape.answered.getEnd();
      for (const n of nodesOf(create)) {
        if (n.getStart() < from) continue;
        const text = ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n) || ts.isTemplateHead(n) || ts.isTemplateMiddle(n) || ts.isTemplateTail(n) ? n.text : null;
        if (text !== null && /nothing was changed/i.test(text)) f.push(`${where(FILES.remote, n)}: a literal after ${shape.flight}.answered( says "Nothing was changed." while the session may be running`);
      }
    }
  }
  return f;
}

export const RULE_FNS = Object.freeze({ CA1: ruleCA1, CA2: ruleCA2, CA3: ruleCA3, CA4: ruleCA4, CA5: ruleCA5, CA6: ruleCA6 });

// ---------------------------------------------------------------------------
// The ablations: in-memory copies, each with one rule broken
// ---------------------------------------------------------------------------

/** A copy of the tree with one file's text replaced, or null when the edit found nothing. */
function withFile(tree, rel, edit) {
  const text = tree.get(rel);
  if (text === undefined) return null;
  const next = edit(text, sfOf(tree, rel));
  if (next === null || next === undefined || next === text) return null;
  const copy = new Map(tree);
  copy.set(rel, next);
  return copy;
}
const splice = (text, node, replacement) => text.slice(0, node.getStart()) + replacement + text.slice(node.getEnd());
const insertBefore = (text, node, insertion) => text.slice(0, node.getStart()) + insertion + text.slice(node.getStart());
const insertAfter = (text, node, insertion) => text.slice(0, node.getEnd()) + insertion + text.slice(node.getEnd());
const append = (insertion) => (text) => `${text}\n${insertion}\n`;
/** The text a guard call's step becomes when the guard is taken away. */
function stepText(call) {
  const arrow = call.arguments.find((a) => isFunctionLike(a));
  if (arrow === undefined) return null;
  if (ts.isBlock(arrow.body)) return arrow.body.statements.map((s) => s.getText()).join('\n    ');
  return `${arrow.body.getText()};`;
}
/** The read a guarded read becomes when the guard is taken away. */
function readText(call) {
  const arrow = call.arguments.find((a) => isFunctionLike(a));
  if (arrow === undefined) return null;
  if (!ts.isBlock(arrow.body)) return arrow.body.getText();
  const r = arrow.body.statements.find((s) => ts.isReturnStatement(s) && s.expression !== undefined);
  return r === undefined ? null : r.expression.getText();
}
/** The guard call naming `step` among `stmts` (expression statements, at any depth), or null. */
function guardCall(stmts, key, step) {
  for (const s of stmts) {
    const hit = nodesOf(s).find((n) => ts.isCallExpression(n) && calleeKey(n) === key && n.arguments[0] !== undefined && ts.isStringLiteralLike(n.arguments[0]) && n.arguments[0].text === step);
    if (hit !== undefined) return hit;
  }
  return null;
}
/**
 * The statement a guard call stands in: the call itself as a statement, or its
 * answer assigned to a name (`recorded = afterSpawn('record', …)`, the fix
 * round's D21). Null for any other shape.
 */
function guardHolder(call) {
  if (ts.isExpressionStatement(call.parent)) return call.parent;
  const p = call.parent;
  if (ts.isBinaryExpression(p) && p.operatorToken.kind === ts.SyntaxKind.EqualsToken && p.right === call && ts.isExpressionStatement(p.parent)) return p.parent;
  return null;
}
/** The local tail's guard on `step`, unguarded: the statement holding it replaced by the step's own text. */
const unguardLocal = (step) => (t) =>
  withFile(t, FILES.local, (s, sf) => {
    const shape = localShape(sf);
    const call = guardCall(shape.tail, 'afterSpawn', step);
    const holder = call === null ? null : guardHolder(call);
    if (holder === null) return null;
    const text = stepText(call);
    return text === null ? null : splice(s, holder, text);
  });
/** The remote branch's guard on `step`, unguarded. */
const unguardBranch = (step) => (t) =>
  withFile(t, FILES.local, (s, sf) => {
    const bt = branchTail(localShape(sf).branch);
    const call = bt === null ? null : guardCall(bt.tail, 'afterSpawn', step);
    if (call === null || !ts.isExpressionStatement(call.parent)) return null;
    const text = stepText(call);
    return text === null ? null : splice(s, call.parent, text);
  });
/** A `throw` added as the last statement of `clause`'s catch. */
function rethrowIn(text, clause) {
  const v = clause.variableDeclaration !== undefined && ts.isIdentifier(clause.variableDeclaration.name) ? clause.variableDeclaration.name.text : null;
  const block = clause.block;
  return text.slice(0, block.getEnd() - 1) + `  throw ${v ?? "new Error('p360 ablation')"};\n    ` + text.slice(block.getEnd() - 1);
}
/** The try statement in `stmts` (at any depth) whose try block holds a call `key`, hoisted: replaced by its try block's statements. */
function hoistTry(text, root, key, stop) {
  const call = nodesOf(root).find((n) => ts.isCallExpression(n) && calleeKey(n) === key);
  if (call === undefined) return null;
  for (let p = call.parent; p !== undefined && p !== stop; p = p.parent) {
    if (ts.isTryStatement(p) && nodesOf(p.tryBlock).includes(call)) return splice(text, p, p.tryBlock.statements.map((x) => x.getText()).join('\n    '));
  }
  return null;
}

export const ABLATIONS = [
  // CA1, the spec's seven and five more
  ['CA1', 'the broadcast unguarded', unguardLocal('broadcast')],
  ['CA1', 'the record write unguarded', unguardLocal('record')],
  ['CA1', 'the read-back as a bare deps.manifest.getSession(id)', (t) => withFile(t, FILES.local, (s, sf) => {
    const call = guardCall(localShape(sf).tail, 'afterSpawnRead', 'read-back');
    const text = call === null ? null : readText(call);
    return text === null ? null : splice(s, call, text);
  })],
  ['CA1', 'startIdCapture unguarded', unguardLocal('id-capture')],
  ['CA1', 'the env notice unguarded', unguardLocal('env-notice')],
  ['CA1', 'the login notice unguarded', unguardLocal('login-notice')],
  ['CA1', 'the capture notice unguarded', unguardLocal('capture-notice')],
  ['CA1', "a throw in afterSpawn's catch", (t) => withFile(t, FILES.local, (s, sf) => {
    const stmts = bodyStatements(functionNamed(sf, 'afterSpawn'));
    const tr = stmts?.[0];
    return tr === undefined || !ts.isTryStatement(tr) || tr.catchClause === undefined ? null : rethrowIn(s, tr.catchClause);
  })],
  ['CA1', "a throw in afterSpawnRead's catch", (t) => withFile(t, FILES.local, (s, sf) => {
    const stmts = bodyStatements(functionNamed(sf, 'afterSpawnRead'));
    const tr = stmts?.[0];
    return tr === undefined || !ts.isTryStatement(tr) || tr.catchClause === undefined ? null : rethrowIn(s, tr.catchClause);
  })],
  ['CA1', "the mirror's catch rethrowing", (t) => withFile(t, FILES.local, (s, sf) => {
    const mirror = localShape(sf).tail.find((x) => ts.isTryStatement(x) && callsNamed(x.tryBlock, 'tmux.setSessionOption').length > 0);
    return mirror === undefined || mirror.catchClause === undefined ? null : rethrowIn(s, mirror.catchClause);
  })],
  ['CA1', "afterSpawn's log line carrying the error's message", (t) => withFile(t, FILES.local, (s, sf) => {
    const fn = functionNamed(sf, 'afterSpawn');
    const code = fn === null ? undefined : nodesOf(fn).find((n) => ts.isCallExpression(n) && calleeKey(n) === 'failureCodeOf');
    return code === undefined ? null : splice(s, code, `String((${code.arguments[0]?.getText() ?? 'err'} as Error).message)`);
  })],
  ['CA1', 'failureCodeOf answering the message', (t) => withFile(t, FILES.local, (s, sf) => {
    const fn = functionNamed(sf, 'failureCodeOf');
    const p = fn?.parameters[0]?.name.getText();
    const first = fn?.body?.statements?.[0];
    return first === undefined || p === undefined ? null : insertBefore(s, first, `if (${p} instanceof Error) return ${p}.message;\n  `);
  })],
  ['CA1', 'afterSpawn no longer running its step', (t) => withFile(t, FILES.local, (s, sf) => {
    const tr = bodyStatements(functionNamed(sf, 'afterSpawn'))?.[0];
    return tr === undefined || !ts.isTryStatement(tr) ? null : splice(s, tr.tryBlock, '{\n    /* p360 ablation: the step is dropped */\n  }');
  })],
  ['CA1', "a step's words dropped from AFTER_SPAWN_WORDS", (t) => withFile(t, FILES.local, (s, sf) => {
    const prop = nodesOf(sf).find((n) => ts.isPropertyAssignment(n) && memberName(n) === 'read-back' && nodesOf(sf).some((d) => ts.isVariableDeclaration(d) && d.name.getText() === 'AFTER_SPAWN_WORDS' && nodesOf(d).includes(n)));
    if (prop === undefined) return null;
    const end = s.slice(prop.getEnd()).match(/^\s*,/);
    return s.slice(0, prop.getStart()) + s.slice(prop.getEnd() + (end === null ? 0 : end[0].length));
  })],
  ['CA1', 'a new manifest read after the spawn, unguarded', (t) => withFile(t, FILES.local, (s, sf) => {
    const last = localShape(sf).tail.at(-1);
    return last === undefined ? null : insertBefore(s, last, 'deps.manifest.listSessions();\n  ');
  })],
  ['CA1', 'afterSpawnRead no longer falling back', (t) => withFile(t, FILES.local, (s, sf) => {
    const tr = bodyStatements(functionNamed(sf, 'afterSpawnRead'))?.[0];
    const last = tr !== undefined && ts.isTryStatement(tr) && tr.catchClause !== undefined ? tr.catchClause.block.statements.at(-1) : undefined;
    return last === undefined || !ts.isReturnStatement(last) ? null : splice(s, last, 'return undefined as never;');
  })],
  ["CA1", "the create's answer dropped", (t) => withFile(t, FILES.local, (s, sf) => {
    const last = localShape(sf).tail.at(-1);
    return last === undefined || !ts.isReturnStatement(last) || last.expression === undefined ? null : splice(s, last, `void ${last.expression.getText()};`);
  })],
  // The probe review's two (2026-11-08): the spawn's own try, whose catch removes the row and rethrows.
  ['CA1', "a step moved into the spawn's try, after the spawn", (t) => withFile(t, FILES.local, (s, sf) => {
    const shape = localShape(sf);
    const last = shape.spawn === -1 ? undefined : shape.stmts[shape.spawn].tryBlock.statements.at(-1);
    return last === undefined ? null : insertAfter(s, last, '\n    deps.broadcastSessions();');
  })],
  ['CA1', "a finally added to the spawn's try", (t) => withFile(t, FILES.local, (s, sf) => {
    const shape = localShape(sf);
    const tr = shape.spawn === -1 ? undefined : shape.stmts[shape.spawn];
    return tr === undefined || tr.finallyBlock !== undefined ? null : insertAfter(s, tr, ' finally {\n    deps.broadcastSessions();\n  }');
  })],
  // The fix round's (the attack lens's ablation X2 and plant LT4, both green here before).
  ['CA1', "the answer's tmuxName overlay dropped", (t) => withFile(t, FILES.local, (s, sf) => {
    const ret = localShape(sf).tail.at(-1);
    const obj = ret !== undefined && ts.isReturnStatement(ret) && ret.expression !== undefined && ts.isCallExpression(peel(ret.expression)) ? peel(peel(ret.expression).arguments[0]) : undefined;
    const prop = obj !== undefined && ts.isObjectLiteralExpression(obj) ? obj.properties.find((p) => ts.isPropertyAssignment(p) && memberName(p) === 'tmuxName') : undefined;
    if (prop === undefined) return null;
    const before = s.slice(0, prop.getStart()).match(/,\s*$/);
    return before === null ? null : s.slice(0, prop.getStart() - before[0].length) + s.slice(prop.getEnd());
  })],
  ['CA1', "the answer's tmuxName overlay put before the row's spread", (t) => withFile(t, FILES.local, (s, sf) => {
    const ret = localShape(sf).tail.at(-1);
    const obj = ret !== undefined && ts.isReturnStatement(ret) && ret.expression !== undefined && ts.isCallExpression(peel(ret.expression)) ? peel(peel(ret.expression).arguments[0]) : undefined;
    if (obj === undefined || !ts.isObjectLiteralExpression(obj)) return null;
    const props = [...obj.properties];
    const prop = props.find((p) => ts.isPropertyAssignment(p) && memberName(p) === 'tmuxName');
    const spread = props.find((p) => ts.isSpreadAssignment(p));
    return prop === undefined || spread === undefined ? null : splice(s, obj, `{ ${prop.getText()}, ${spread.getText()} }`);
  })],
  ['CA1', 'failureCodeOf no longer one try', (t) => withFile(t, FILES.local, (s, sf) => {
    const fn = functionNamed(sf, 'failureCodeOf');
    return fn === null ? null : hoistTry(s, fn, 'FAILURE_WORD.test', fn);
  })],
  ['CA1', 'the launch context tried after a record write that failed', (t) => withFile(t, FILES.local, (s, sf) => {
    const hit = localShape(sf).tail.find((x) => ts.isIfStatement(x) && callsNamed(x.thenStatement, 'recordLaunchContext').length > 0);
    if (hit === undefined) return null;
    const inner = ts.isBlock(hit.thenStatement) ? hit.thenStatement.statements.map((x) => x.getText()).join('\n  ') : hit.thenStatement.getText();
    return splice(s, hit, inner);
  })],
  // CA2
  ["CA2", "the branch's broadcast unguarded", unguardBranch('broadcast')],
  ["CA2", "the branch's capture notice unguarded", unguardBranch('capture-notice')],
  ['CA2', 'a rethrow in openTabsForRemoteCreate', (t) => withFile(t, FILES.rehome, (s, sf) => {
    const fn = functionNamed(sf, 'openTabsForRemoteCreate');
    const c = fn === null ? undefined : nodesOf(fn).find((n) => ts.isCatchClause(n));
    return c === undefined ? null : rethrowIn(s, c);
  })],
  ['CA2', 'a tab write taken out of its try', (t) => withFile(t, FILES.rehome, (s, sf) => {
    const fn = functionNamed(sf, 'openTabsForRemoteCreate');
    return fn === null ? null : hoistTry(s, fn, 'manifest.clearProjectTabClosed', fn);
  })],
  // CA3
  ['CA3', 'the feed start outside its try', (t) => withFile(t, FILES.remote, (s, sf) => {
    const shape = remoteShape(sf);
    return shape.why !== null ? null : hoistTry(s, shape.one.tryBlock, 'startMachineFeed', shape.one);
  })],
  ['CA3', "item 6's throw gmuxError('SPAWN_FAILED', …) put back", (t) => withFile(t, FILES.remote, (s, sf) => {
    const shape = remoteShape(sf);
    const last = shape.why === null ? shape.after.at(-1) : undefined;
    return last === undefined ? null : insertBefore(s, last, "if (remoteSessionRow(sessionId) === null) {\n      throw gmuxError('SPAWN_FAILED', 'p360 ablation', `${input.machineId} did not list it back`);\n    }\n    ");
  })],
  ['CA3', 'a stamp loop catch rethrowing', (t) => withFile(t, FILES.remote, (s, sf) => {
    const shape = remoteShape(sf);
    const loop = shape.why === null ? shape.after.find((x) => ts.isForOfStatement(x) && squash(x.expression.getText()) === 'REMOTE_STAMPS') : undefined;
    const c = loop === undefined ? undefined : nodesOf(loop).find((n) => ts.isCatchClause(n));
    return c === undefined ? null : rethrowIn(s, c);
  })],
  ['CA3', 'the env notice unguarded', (t) => withFile(t, FILES.remote, (s, sf) => {
    const shape = remoteShape(sf);
    return shape.why !== null ? null : hoistTry(s, shape.one.tryBlock, 'postDurabilityNotice', shape.one);
  })],
  ['CA3', "remoteCreateAnswer's machine taken out of its try", (t) => withFile(t, FILES.remote, (s, sf) => {
    const fn = functionNamed(sf, 'remoteCreateAnswer');
    return fn === null ? null : hoistTry(s, fn, 'remoteSessionMachine', fn);
  })],
  ['CA3', "a throw in remoteCreateAnswer's catch", (t) => withFile(t, FILES.remote, (s, sf) => {
    const fn = functionNamed(sf, 'remoteCreateAnswer');
    const c = fn === null ? undefined : nodesOf(fn).find((n) => ts.isCatchClause(n));
    return c === undefined ? null : rethrowIn(s, c);
  })],
  ['CA3', 'remoteCreate answering projectRow directly again', (t) => withFile(t, FILES.remote, (s, sf) => {
    const shape = remoteShape(sf);
    const last = shape.why === null ? shape.after.at(-1) : undefined;
    return last === undefined || !ts.isReturnStatement(last) ? null : splice(s, last, 'return projectRow(remoteSessionRow(sessionId), stateOf(input.machineId));');
  })],
  // The probe review's (2026-11-08): the create's finally runs after the answer.
  ['CA3', "the env notice moved into the create's finally", (t) => withFile(t, FILES.remote, (s, sf) => {
    const shape = remoteShape(sf);
    const last = shape.why === null ? shape.one.finallyBlock?.statements.at(-1) : undefined;
    return last === undefined ? null : insertAfter(s, last, "\n    postDurabilityNotice({ kind: 'env-unresolved', sessionId, sessionName: oneLine(input.name), names: [], probeFailed: false });");
  })],
  // His third ruled round (2026-11-17, D27): the feed start's catch lets the stopped list's own refusal through first.
  ['CA3', "his third ruling undone: the feed start's catch swallows the stopped list's refusal again, so a create whose list stopped before that machine's create returned answers its session", (t) => withFile(t, FILES.remote, (s, sf) => {
    const pass = feedPassThrough(sf);
    return pass === null ? null : splice(s, pass, '');
  })],
  ['CA3', "the feed start's catch rethrowing every error, so a feed that could not write (R6b) answers a failure for a running session", (t) => withFile(t, FILES.remote, (s, sf) => {
    const pass = feedPassThrough(sf);
    const v = pass === null ? null : pass.parent.parent.variableDeclaration?.name.getText();
    return pass === null || v === undefined ? null : splice(s, pass, `throw ${v};`);
  })],
  ['CA3', 'the pass-through asking something other than the stopped refusal', (t) => withFile(t, FILES.remote, (s, sf) => {
    const pass = feedPassThrough(sf);
    const call = pass === null ? null : peel(pass.expression);
    return call === null || call === undefined ? null : splice(s, call, `${call.arguments[0].getText()} instanceof Error`);
  })],
  ['CA3', 'the pass-through throwing another error than the one the feed met', (t) => withFile(t, FILES.remote, (s, sf) => {
    const pass = feedPassThrough(sf);
    const thrown = pass === null ? null : onlyStatement(pass.thenStatement);
    return thrown === null || !ts.isThrowStatement(thrown) ? null : splice(s, thrown, "throw new Error('p360 ablation: not the refusal the feed met');");
  })],
  ['CA3', 'the pass-through moved after the log line, so the stopped case writes a line the parent never did', (t) => withFile(t, FILES.remote, (s, sf) => {
    const pass = feedPassThrough(sf);
    const last = pass === null ? undefined : pass.parent.statements.at(-1);
    if (pass === null || last === undefined || last === pass) return null;
    return s.slice(0, pass.getStart()) + s.slice(pass.getEnd(), last.getEnd()) + `\n        ${pass.getText()}` + s.slice(last.getEnd());
  })],
  ['CA3', "an isManifestStopped of remote-sessions.ts's own that answers yes for every error", (t) => withFile(t, FILES.remote, append('function isManifestStopped(_err: unknown): boolean {\n  return true;\n}'))],
  ['CA3', "remote-record.ts handing remote-sessions.ts an isManifestStopped of its own that answers yes for every error", (t) => withFile(t, FILES.record, (s) => {
    const line = "export { isManifestStopped } from '../manifest/store';";
    return s.includes(line) ? s.replace(line, 'export function isManifestStopped(_err: unknown): boolean {\n  return true;\n}') : null;
  })],
  // The probe review of his third ruled round (2026-11-17): the pass-through kept, and what it rethrows caught
  // again inside remoteCreate, so the create answers its session (the review's plants c01 and c05).
  ['CA3', "the feed start's statement wrapped in a try whose catch swallows what the pass-through rethrows", (t) => withFile(t, FILES.remote, (s, sf) => {
    const shape = remoteShape(sf);
    const stmt = shape.why === null ? shape.after.find((x) => callsNamed(x, 'startMachineFeed').length > 0) : undefined;
    return stmt === undefined ? null : splice(s, stmt, `try {\n    ${stmt.getText()}\n    } catch (p360Outer) {\n      machinesLog.warn('p360 ablation: the stopped refusal swallowed');\n    }`);
  })],
  ['CA3', 'a catch added to the one try that holds the create, answering for whatever reaches it', (t) => withFile(t, FILES.remote, (s, sf) => {
    const shape = remoteShape(sf);
    if (shape.why !== null || shape.one.catchClause !== undefined) return null;
    return insertAfter(s, shape.one.tryBlock, " catch (p360Late) {\n    machinesLog.warn('p360 ablation: the stopped refusal swallowed');\n    return undefined as never;\n  }");
  })],
  // CA4
  ["CA4", "printed.split('\\n')[0] put back", (t) => withFile(t, FILES.remote, (s, sf) => {
    const fn = functionNamed(sf, 'remoteCreate');
    const reader = fn === null ? undefined : nodesOf(fn).find((n) => ts.isCallExpression(n) && calleeKey(n) === 'createdTmuxIdOf');
    const arg = reader?.arguments[0];
    return arg === undefined ? null : splice(s, reader, `(${arg.getText()}.split('\\n')[0] ?? '').trim()`);
  })],
  ["CA4", "the unread error's detail naming the far answer", (t) => withFile(t, FILES.remote, (s, sf) => {
    const fn = functionNamed(sf, 'remoteCreate');
    const exec = fn === null ? [] : newSessionExecs(fn);
    const name = exec.length === 1 ? answerBinding(exec[0]).name : null;
    const settle = functionNamed(sf, 'settleUnansweredCreate');
    const err = settle === null ? undefined : callsNamed(settle, 'gmuxError').find((g) => g.arguments[1] !== undefined && ts.isCallExpression(g.arguments[1]) && calleeKey(g.arguments[1]) === 'remoteCreateNotStarted');
    return err === undefined || name === null || err.arguments[2] === undefined ? null : splice(s, err.arguments[2], `\`\${input.machineId} answered \${JSON.stringify(${name})}\``);
  })],
  ['CA4', 'the reader taking the first line', (t) => withFile(t, FILES.confirm, (s, sf) => {
    const fn = functionNamed(sf, 'createdTmuxIdOf');
    const p = fn?.parameters[0]?.name.getText();
    return fn === null || p === undefined || fn.body === undefined ? null : splice(s, fn.body, `{\n  return (${p}.split('\\n')[0] ?? '').trim();\n}`);
  })],
  ['CA4', 'dropRemoteRow( before confirmCreate(', (t) => withFile(t, FILES.remote, (s, sf) => {
    const settle = functionNamed(sf, 'settleUnansweredCreate');
    const drop = settle === null ? undefined : callsNamed(settle, 'dropRemoteRow')[0];
    const first = settle?.body?.statements?.[0];
    return drop === undefined || first === undefined ? null : insertBefore(s, first, `${drop.getText()};\n  `);
  })],
  ["CA4", "the unread block's old drop put back", (t) => withFile(t, FILES.remote, (s, sf) => {
    const fn = functionNamed(sf, 'remoteCreate');
    const d = fn === null ? null : dollarIf(fn);
    const first = d !== null && ts.isBlock(d.thenStatement) ? d.thenStatement.statements[0] : undefined;
    return first === undefined ? null : insertBefore(s, first, 'dropRemoteRow(sessionId);\n      ');
  })],
  ["CA4", "the unread block throwing before the identity read", (t) => withFile(t, FILES.remote, (s, sf) => {
    const fn = functionNamed(sf, 'remoteCreate');
    const d = fn === null ? null : dollarIf(fn);
    const first = d !== null && ts.isBlock(d.thenStatement) ? d.thenStatement.statements[0] : undefined;
    return first === undefined ? null : insertBefore(s, first, "throw gmuxError('SPAWN_FAILED', 'p360 ablation', 'no identity read');\n      ");
  })],
  ['CA4', 'answerLineCount counting blank lines', (t) => withFile(t, FILES.confirm, (s, sf) => {
    const fn = functionNamed(sf, 'answerLineCount');
    const p = fn?.parameters[0]?.name.getText();
    return fn === null || p === undefined || fn.body === undefined ? null : splice(s, fn.body, `{\n  return ${p}.split('\\n').length;\n}`);
  })],
  // The fix round's (the attack lens's ablation X3, green here before).
  ['CA4', 'an unread answer whose read could not be made drops the row', (t) => withFile(t, FILES.remote, (s, sf) => {
    const settle = functionNamed(sf, 'settleUnansweredCreate');
    const mark = settle === null ? undefined : callsNamed(settle, 'markRemoteCreateUnconfirmed')[0];
    const stmt = mark === undefined ? undefined : mark.parent;
    return stmt === undefined || !ts.isExpressionStatement(stmt) ? null : insertBefore(s, stmt, "if (why.kind === 'unread') dropRemoteRow(sessionId);\n    ");
  })],
  // CA5, his ruled round's (D24)
  ['CA5', 'the stopped check removed: a create during which the list stopped answers its session', (t) => withFile(t, FILES.core, (s, sf) => {
    const check = ca5Body(sf)?.[1];
    return check === undefined || !ts.isIfStatement(check) ? null : splice(s, check, '');
  })],
  ['CA5', 'the check asked before the create ran, so a stop during it answers the session', (t) => withFile(t, FILES.core, (s, sf) => {
    const stmts = ca5Body(sf);
    if (stmts === null || stmts.length < 2 || !ts.isIfStatement(stmts[1])) return null;
    const moved = stmts[1].getText();
    return insertBefore(splice(s, stmts[1], ''), stmts[0], `${moved}\n      `);
  })],
  ['CA5', 'the stopped branch answering the session instead of the refusal', (t) => withFile(t, FILES.core, (s, sf) => {
    const stmts = ca5Body(sf);
    const name = stmts === null ? null : awaitedCreateName(stmts[0]);
    const check = stmts?.[1];
    return check === undefined || name === null || !ts.isIfStatement(check) ? null : splice(s, check.thenStatement, `return ${name};`);
  })],
  ['CA5', 'the stopped branch throwing another error, not the stopped list\'s refusal', (t) => withFile(t, FILES.core, (s, sf) => {
    const check = ca5Body(sf)?.[1];
    return check === undefined || !ts.isIfStatement(check) ? null : splice(s, check.thenStatement, "throw gmuxError('SPAWN_FAILED', 'p360 ablation', 'not the stopped refusal');");
  })],
  ['CA5', 'the check asking something other than the store\'s own latch', (t) => withFile(t, FILES.core, (s, sf) => {
    const check = ca5Body(sf)?.[1];
    const latch = check === undefined || !ts.isIfStatement(check) ? undefined : nodesOf(check.expression).find((n) => ts.isCallExpression(n) && calleeKey(n) === 'this.manifest.stoppedReading');
    return latch === undefined ? null : splice(s, latch, '(this.lastCleanList === null)');
  })],
  // His second ruling (2026-11-16): the check is a create on this Mac's alone.
  ['CA5', 'his second ruling undone: the check asked of a create on another machine too', (t) => withFile(t, FILES.core, (s, sf) => {
    const check = ca5Body(sf)?.[1];
    return check === undefined || !ts.isIfStatement(check) ? null : splice(s, check.expression, 'this.manifest.stoppedReading()');
  })],
  ['CA5', 'the machine test turned around: only a create on another machine refused', (t) => withFile(t, FILES.core, (s, sf) => {
    const check = ca5Body(sf)?.[1];
    const test = check === undefined || !ts.isIfStatement(check) ? undefined : nodesOf(check.expression).find((n) => ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken);
    return test === undefined ? null : splice(s, test, `${test.left.getText()} !== ${test.right.getText()}`);
  })],
  ['CA5', 'the machine read from input.machineId alone, not the create\'s own rule', (t) => withFile(t, FILES.core, (s, sf) => {
    const check = ca5Body(sf)?.[1];
    const call = check === undefined || !ts.isIfStatement(check) ? undefined : nodesOf(check.expression).find((n) => ts.isCallExpression(n) && calleeKey(n) === 'createMachineIdFor');
    return call === undefined ? null : splice(s, call, `${call.arguments[0].getText()}.machineId`);
  })],
  ['CA5', 'the machine rule handed something other than the create\'s own input', (t) => withFile(t, FILES.core, (s, sf) => {
    const check = ca5Body(sf)?.[1];
    const call = check === undefined || !ts.isIfStatement(check) ? undefined : nodesOf(check.expression).find((n) => ts.isCallExpression(n) && calleeKey(n) === 'createMachineIdFor');
    return call === undefined ? null : splice(s, call.arguments[0], '{}');
  })],
  ['CA5', 'a createMachineIdFor of core.ts\'s own that reads the machine field alone', (t) => withFile(t, FILES.core, (s, sf) => {
    const imp = sf.statements.find((x) => ts.isImportDeclaration(x) && ts.isStringLiteral(x.moduleSpecifier) && x.moduleSpecifier.text === './launch-plan');
    const named = imp?.importClause?.namedBindings;
    const el = named !== undefined && ts.isNamedImports(named) ? named.elements.find((e) => e.name.text === 'createMachineIdFor') : undefined;
    if (el === undefined) return null;
    const rest = named.elements.filter((e) => e !== el).map((e) => e.getText());
    const replaced = rest.length === 0 ? '' : `import { ${rest.join(', ')} } from './launch-plan';`;
    return `${splice(s, imp, replaced)}\nfunction createMachineIdFor(input: { readonly machineId?: string }): string | undefined {\n  return input.machineId !== undefined && input.machineId !== 'local' ? input.machineId : undefined;\n}\n`;
  })],
  // D26, his second ruled round's measurement: on another machine the check is asked of the create no list has shown.
  ['CA5', 'the unlisted test removed: a create on another machine no list has shown answers its session while the list is stopped', (t) => withFile(t, FILES.core, (s, sf) => {
    const check = ca5Body(sf)?.[1];
    const or = check === undefined || !ts.isIfStatement(check) ? undefined : nodesOf(check.expression).find((n) => ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.BarBarToken);
    const machine = or === undefined ? undefined : [or.left, or.right].find((x) => nodesOf(x).some((n) => ts.isCallExpression(n) && calleeKey(n) === 'createMachineIdFor'));
    return or === undefined || machine === undefined ? null : splice(s, or, machine.getText());
  })],
  ['CA5', 'the unlisted test turned around: only a create a list has shown refused', (t) => withFile(t, FILES.core, (s, sf) => {
    const check = ca5Body(sf)?.[1];
    const call = check === undefined || !ts.isIfStatement(check) ? undefined : nodesOf(check.expression).find((n) => ts.isCallExpression(n) && calleeKey(n) === 'remoteSessionRow');
    const test = call === undefined ? undefined : call.parent;
    return test === undefined || !ts.isBinaryExpression(test) ? null : splice(s, test, `${test.left.getText()} !== ${test.right.getText()}`);
  })],
  ['CA5', 'the row asked of the create’s input, not of the session it answered', (t) => withFile(t, FILES.core, (s, sf) => {
    const check = ca5Body(sf)?.[1];
    const call = check === undefined || !ts.isIfStatement(check) ? undefined : nodesOf(check.expression).find((n) => ts.isCallExpression(n) && calleeKey(n) === 'remoteSessionRow');
    return call === undefined ? null : splice(s, call.arguments[0], 'input.name');
  })],
  ['CA5', 'a remoteSessionRow of core.ts’s own that never finds a row', (t) => withFile(t, FILES.core, append('function remoteSessionRow(_id: string): null {\n  return null;\n}'))],
  // The probe review of his second ruled round: four shadowing shapes the rule read green (plants w02 to w05).
  ['CA5', 'the row read shadowed by a defaulted parameter of the admitted function: every create on another machine read as unlisted', (t) => withFile(t, FILES.core, (s, sf) => {
    const fn = peel(ca5Admit(sf)?.arguments[1]);
    const open = fn === undefined || !isFunctionLike(fn) ? undefined : fn.getChildren().find((c) => c.kind === ts.SyntaxKind.OpenParenToken);
    return open === undefined ? null : insertAfter(s, open, 'remoteSessionRow: (id: string) => null = () => null');
  })],
  ['CA5', 'the machine rule shadowed by a defaulted second parameter of createSession: every create read as this Mac’s', (t) => withFile(t, FILES.core, (s, sf) => {
    const cls = classNamed(sf, 'GmuxCore');
    const create = cls === null ? null : methodOf(cls, 'createSession');
    const first = create?.parameters[0];
    return first === undefined ? null : insertAfter(s, first, ', createMachineIdFor: (i: unknown) => undefined = () => undefined');
  })],
  ['CA5', 'the row read shadowed by a destructured, defaulted parameter of createSession', (t) => withFile(t, FILES.core, (s, sf) => {
    const cls = classNamed(sf, 'GmuxCore');
    const create = cls === null ? null : methodOf(cls, 'createSession');
    const first = create?.parameters[0];
    return first === undefined ? null : insertAfter(s, first, ', { remoteSessionRow }: { remoteSessionRow: (id: string) => null } = { remoteSessionRow: () => null }');
  })],
  ['CA5', 'createSession’s input shadowed by a defaulted parameter of the admitted function: the create and the check handed another object', (t) => withFile(t, FILES.core, (s, sf) => {
    const cls = classNamed(sf, 'GmuxCore');
    const create = cls === null ? null : methodOf(cls, 'createSession');
    const input = create?.parameters[0]?.name.getText();
    const fn = peel(ca5Admit(sf)?.arguments[1]);
    const open = fn === undefined || !isFunctionLike(fn) ? undefined : fn.getChildren().find((c) => c.kind === ts.SyntaxKind.OpenParenToken);
    return open === undefined || input === undefined ? null : insertAfter(s, open, `${input}: CreateSessionInput = { name: 'p360 ablation', projectPath: '/', agent: 'shell' }`);
  })],
  ['CA5', 'the refusal swallowed: the check inside a try whose catch returns the session', (t) => withFile(t, FILES.core, (s, sf) => {
    const stmts = ca5Body(sf);
    const name = stmts === null ? null : awaitedCreateName(stmts[0]);
    const check = stmts?.[1];
    return check === undefined || name === null || !ts.isIfStatement(check) ? null : splice(s, check, `try {\n        ${check.getText()}\n      } catch {\n        return ${name};\n      }`);
  })],
  ['CA5', 'a step put between the create and the check', (t) => withFile(t, FILES.core, (s, sf) => {
    const check = ca5Body(sf)?.[1];
    return check === undefined ? null : insertBefore(s, check, 'this.broadcastSessions();\n      ');
  })],
  ['CA5', 'the fix round\'s keep put back: a second writer of lastCleanList', (t) => withFile(t, FILES.core, (s, sf) => {
    const cls = classNamed(sf, 'GmuxCore');
    const create = cls === null ? null : methodOf(cls, 'createSession');
    return create === null ? null : insertAfter(s, create, '\n\n  private keepCreatedSession(session: Session): void {\n    if (!this.manifest.stoppedReading()) return;\n    this.lastCleanList = [...(this.lastCleanList ?? []), session];\n  }');
  })],
  // The probe review of his ruled round (2026-11-14): three shapes the rule read green.
  ['CA5', 'the refusal replaced outside the admitted body: a .catch chained on the admit answers a session', (t) => withFile(t, FILES.core, (s, sf) => {
    const admit = ca5Admit(sf);
    return admit === undefined ? null : insertAfter(s, admit, '.catch((err: unknown) => {\n      if (isManifestStopped(err)) return this.listSessions()[0] as Session;\n      throw err;\n    })');
  })],
  ['CA5', 'the refusal swallowed outside the admitted body: a try around the admit in an async createSession', (t) => withFile(t, FILES.core, (s, sf) => {
    const cls = classNamed(sf, 'GmuxCore');
    const create = cls === null ? null : methodOf(cls, 'createSession');
    const admit = ca5Admit(sf);
    if (create === null || admit === undefined) return null;
    return splice(s, create, `async createSession(input: CreateSessionInput): Promise<Session> {\n    try {\n      return await ${admit.getText()};\n    } catch (err) {\n      if (isManifestStopped(err)) return this.listSessions()[0] as Session;\n      throw err;\n    }\n  }`);
  })],
  ['CA5', 'the fix round\'s keep put back as an arrow property: a second writer of lastCleanList', (t) => withFile(t, FILES.core, (s, sf) => {
    const cls = classNamed(sf, 'GmuxCore');
    const create = cls === null ? null : methodOf(cls, 'createSession');
    return create === null ? null : insertAfter(s, create, '\n\n  private keepCreatedSession = (session: Session): void => {\n    if (!this.manifest.stoppedReading()) return;\n    this.lastCleanList = [...(this.lastCleanList ?? []), session];\n  };');
  })],
  // CA6
  ['CA6', 'noRemoteRowFor( put back after the answer', (t) => withFile(t, FILES.remote, (s, sf) => {
    const shape = remoteShape(sf);
    return shape.why !== null ? null : insertAfter(s, shape.answered, '\n    try {\n      machinesLog.warn(noRemoteRowFor(input.name));\n    } catch {\n      /* p360 ablation */\n    }');
  })],
  ['CA6', 'the sentence called twice', (t) => withFile(t, FILES.copy, append("export function p360AblationTwice(): string {\n  return remoteCreateNotStarted('x');\n}"))],
  ['CA6', 'the unread arm saying nothing changed again', (t) => withFile(t, FILES.remote, (s, sf) => {
    const settle = functionNamed(sf, 'settleUnansweredCreate');
    const c = settle === null ? undefined : callsNamed(settle, 'remoteCreateNotStarted')[0];
    return c === undefined ? null : splice(s, c.expression, 'noRemoteRowFor');
  })],
  ['CA6', 'a literal after the answer saying nothing changed', (t) => withFile(t, FILES.remote, (s, sf) => {
    const shape = remoteShape(sf);
    return shape.why !== null ? null : insertAfter(s, shape.answered, "\n    const p360Ablation = 'Nothing was changed.';\n    void p360Ablation;");
  })],
  ['CA6', 'the new sentence naming tmux', (t) => withFile(t, FILES.copy, (s, sf) => {
    const fn = functionNamed(sf, 'remoteCreateNotStarted');
    const lit = fn === null ? undefined : nodesOf(fn).find((n) => ts.isTemplateHead(n) || ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n));
    if (lit === undefined) return null;
    const raw = lit.getText();
    const at = lit.getStart() + 1;
    return `${s.slice(0, at)}tmux server: ${s.slice(at, lit.getStart() + raw.length)}${s.slice(lit.getStart() + raw.length)}`;
  })]
];

/** A comment added to each of the seven files, naming the broken shapes in prose only: every rule must read as it did. */
export const CONTROL = [
  'a comment beside every clause, in prose only',
  (t) => {
    let copy = withFile(t, FILES.local, append("// control: deps.broadcastSessions(); deps.manifest.getSession(id); throw err; afterSpawn('nope', id, () => x());"));
    copy = copy === null ? null : withFile(copy, FILES.remote, append("// control: noRemoteRowFor(input.name) Nothing was changed. printed.split('\\n')[0] dropRemoteRow(sessionId); throw gmuxError('SPAWN_FAILED', 'x');"));
    copy = copy === null ? null : withFile(copy, FILES.confirm, append("// control: return printed.split('\\n')[0];"));
    copy = copy === null ? null : withFile(copy, FILES.copy, append("// control: remoteCreateNotStarted('a tmux server pane window prefix');"));
    copy = copy === null ? null : withFile(copy, FILES.core, append('// control: this.lastCleanList = null; return session; if (this.manifest.stoppedReading()) return session; createMachineIdFor(input) !== undefined; function createMachineIdFor() {}'));
    copy = copy === null ? null : withFile(copy, FILES.rehome, append('// control: throw err; manifest.upsertRemoteProject(x);'));
    copy = copy === null ? null : withFile(copy, FILES.record, append('// control: export function isManifestStopped() { return true; }'));
    return copy;
  }
];

// ---------------------------------------------------------------------------
// The safe reader, proved on fixtures before it is trusted
// ---------------------------------------------------------------------------

export function selfProof() {
  const problems = [];
  const one = (src) => ts.createSourceFile('fixture.ts', `async function f() {\n${src}\n}`, ts.ScriptTarget.Latest, true).statements[0].body.statements[0];
  const allow = ['afterSpawn', 'log.warn', 'm.set'];
  const cases = [
    ['an allowlisted call', 'm.set(a, b);', true],
    ['a guarded step', "afterSpawn('record', id, () => deps.manifest.updateSession(id, {}));", true],
    ['a guarded block step', "afterSpawn('broadcast', id, () => { deps.broadcastSessions(); });", true],
    ['an unguarded call', 'deps.broadcastSessions();', false],
    ['a call inside a non-guard arrow', 'm.set(a, () => deps.x());', false],
    ['an await', 'await m.set(a, b);', false],
    ['a new', 'const s = new Set(xs);', false],
    ['a throw', "throw new Error('x');", false],
    ['an if over a safe branch', 'if (a !== b) { m.set(a, b); }', true],
    ['an if whose branch throws', 'if (a) { throw x; }', false],
    ['an if whose condition calls', 'if (deps.read()) m.set(a, b);', false],
    ['a try with a quiet catch', 'try { await deps.x(); } catch (err) { log.warn(String(err)); }', true],
    ['a try whose catch rethrows', 'try { deps.x(); } catch (err) { throw err; }', false],
    ['a try whose catch throws only in a nested function', 'try { deps.x(); } catch (err) { const f = () => { throw err; }; void f; }', true],
    ['a try with no catch', 'try { deps.x(); } finally { m.set(a, b); }', false],
    ['a return of an allowlisted call', 'return m.set(a, b);', true],
    ['a return of another call', 'return deps.read();', false],
    ['a while loop', 'while (a) m.set(a, b);', false]
  ];
  for (const [name, src, want] of cases) {
    let got;
    try {
      got = unsafeWhy(one(src), allow) === null;
    } catch (err) {
      got = `threw ${String(err?.message ?? err)}`;
    }
    if (got !== want) problems.push(`the safe reader read "${name}" (${src}) as ${String(got)}, not ${String(want)}`);
  }
  const loop = one("for (const option of REMOTE_STAMPS) { try { await x(option); } catch (err) { log.warn('y'); } }");
  if (unsafeWhy(loop, allow, { forOfStamps: true }) !== null) problems.push('the safe reader refused the stamp loop with a quiet try');
  if (unsafeWhy(loop, allow) === null) problems.push('the safe reader accepted a stamp loop where the rule has none');
  const bad = one("for (const option of REMOTE_STAMPS) { try { await x(option); } catch (err) { throw err; } }");
  if (unsafeWhy(bad, allow, { forOfStamps: true }) === null) problems.push('the safe reader accepted a stamp loop whose catch rethrows');
  // HIS THIRD RULED ROUND (D27): the stopped list's pass-through, admitted only
  // for the try it is allowed on, only as its catch's first statement, only
  // asking isManifestStopped of the catch's own binding and rethrowing that.
  const passCases = [
    ['the pass-through first, allowed', "try { await f(); } catch (err) { if (isManifestStopped(err)) throw err; log.warn('x'); }", true, true],
    ['the pass-through first, in a block, allowed', "try { await f(); } catch (err) { if (isManifestStopped(err)) { throw err; } log.warn('x'); }", true, true],
    ['the pass-through first, NOT allowed for this try', "try { await f(); } catch (err) { if (isManifestStopped(err)) throw err; log.warn('x'); }", false, false],
    ['a pass-through throwing another error', "try { await f(); } catch (err) { if (isManifestStopped(err)) throw new Error('x'); }", true, false],
    ['a pass-through asking another predicate', 'try { await f(); } catch (err) { if (isGmuxError(err)) throw err; }', true, false],
    ['a pass-through asking of another value', 'try { await f(); } catch (err) { const other = err; if (isManifestStopped(other)) throw other; }', true, false],
    ['the pass-through after a log line', "try { await f(); } catch (err) { log.warn('x'); if (isManifestStopped(err)) throw err; }", true, false],
    ['the pass-through with an else', "try { await f(); } catch (err) { if (isManifestStopped(err)) throw err; else log.warn('x'); }", true, false],
    ['the pass-through and a second throw', "try { await f(); } catch (err) { if (isManifestStopped(err)) throw err; throw err; }", true, false],
    ['an unconditional rethrow, allowed or not', 'try { await f(); } catch (err) { throw err; }', true, false]
  ];
  for (const [name, src, allowed, want] of passCases) {
    const st = one(src);
    const got = unsafeWhy(st, allow, { passThrough: allowed ? new Set([st]) : null }) === null;
    if (got !== want) problems.push(`the safe reader read "${name}" (${src}) as ${String(got)}, not ${String(want)}`);
  }
  if (literalText(ts.createSourceFile('x.ts', 'const s = `a ${b} c` + \'d\';', ts.ScriptTarget.Latest, true).statements[0].declarationList.declarations[0].initializer) !== 'a <x> cd') problems.push('literalText misread its fixture');
  return problems;
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

/** The files each rule reads. A copy that changed none of them is answered from the first reading. */
const RULE_INPUTS = Object.freeze({
  CA1: () => [FILES.local],
  CA2: () => [FILES.local, FILES.rehome],
  CA3: () => [FILES.remote, FILES.record],
  CA4: () => [FILES.remote, FILES.confirm],
  CA5: () => [FILES.core],
  CA6: (t) => [FILES.remote, FILES.copy, ...pathsNaming(t, 'remoteCreateNotStarted')]
});
const ruleCache = new Map();
function judge(tree) {
  const verdict = {};
  for (const id of RULES) {
    const inputs = RULE_INPUTS[id](tree);
    const key = `${id}|${inputs.map((rel) => `${rel}=${String(textId(tree.get(rel)))}`).join('|')}`;
    let findings = ruleCache.get(key);
    if (findings === undefined) {
      try {
        findings = RULE_FNS[id](tree);
      } catch (err) {
        findings = [`the rule threw while reading the tree: ${String(err?.stack ?? err).split('\n').slice(0, 3).join(' / ')}`];
      }
      ruleCache.set(key, findings);
    }
    verdict[id] = findings;
  }
  return verdict;
}

function main() {
  const timing = process.argv.includes('--timing');
  const started = performance.now();
  const clock = { at: started };
  const lap = (what) => {
    if (timing) process.stderr.write(`${TAG} ${what}: ${String(Math.round(performance.now() - clock.at))} ms\n`);
    clock.at = performance.now();
  };
  const tree = readTree(ROOT);
  lap('read the tree');
  const problems = [];
  if (tree.size < FLOOR) problems.push(`the walk found ${String(tree.size)} non-test source files under src/main, below the floor of ${String(FLOOR)}, so it is not trusted`);
  for (const p of selfProof()) problems.push(`SELF ${p}`);
  // Every copy is built first, so CA4's driven half drives every distinct reader text in one process.
  const built = ABLATIONS.map(([rule, name, build]) => {
    let copy = null;
    try {
      copy = build(tree);
    } catch (err) {
      problems.push(`${rule} ablation "${name}" threw while it was built: ${String(err?.message ?? err)}`);
    }
    return { rule, name, copy };
  });
  const control = CONTROL[1](tree);
  const sources = new Set([tree, control, ...built.map((b) => b.copy)].filter((x) => x !== null).map((x) => readerSource(sfOf(x, FILES.confirm))).filter((x) => x !== null));
  lap('built the copies');
  if (sources.size > 0) driveReaders(sources);
  lap('drove createdTmuxIdOf');

  const base = judge(tree);
  const extra = moduleAgreement(tree);
  if (extra.length > 0) base.CA4 = [...base.CA4, ...extra];
  lap('judged the tree');
  const red = (v, id) => v[id].length > 0;
  for (const id of RULES) if (red(base, id)) for (const p of base[id]) problems.push(`${id} ${p}`);
  const ablations = [];
  for (const { rule, name, copy } of built) {
    if (copy === null) {
      problems.push(`${rule} ablation "${name}" could not be built over this tree, so the rule was not shown to fail`);
      ablations.push({ rule, name, built: false });
      continue;
    }
    const v = judge(copy);
    const wrong = RULES.filter((id) => (id === rule ? !red(v, id) : red(v, id) !== red(base, id)));
    if (wrong.length > 0) problems.push(`${rule} ablation "${name}" must read red on ${rule} alone and leave every other rule as it was; ${wrong.map((id) => `${id} read ${red(v, id) ? 'red' : 'green'}`).join(', ')}`);
    ablations.push({ rule, name, built: true, ok: wrong.length === 0 });
    if (process.argv.includes('--verbose')) process.stdout.write(`${TAG}   ${rule} "${name}" -> ${(v[rule][0] ?? '(green)').slice(0, 240)}\n`);
  }
  lap('judged the copies');
  for (const id of RULES) if (!ABLATIONS.some(([rule]) => rule === id)) problems.push(`${id} carries no ablation, so it has never been shown to fail`);
  let controlOk = false;
  if (control === null) problems.push('the control copy could not be built');
  else {
    const v = judge(control);
    const moved = RULES.filter((id) => red(v, id) !== red(base, id));
    controlOk = moved.length === 0;
    if (!controlOk) problems.push(`the control copy, changed in nothing a rule holds, moved ${moved.join(', ')}: ${moved.map((id) => v[id][0]).join(' / ')}`);
  }
  const ms = Math.round(performance.now() - started);
  const report = {
    root: ROOT,
    files: tree.size,
    rules: Object.fromEntries(RULES.map((id) => [id, base[id].length === 0 ? 'green' : 'red'])),
    driven: { rows: READER_TABLE.length, variants: driven.size, module: drivenModule === null ? drivenWhy : 'driven' },
    ablations: { total: ablations.length, ok: ablations.filter((a) => a.ok).length },
    control: controlOk,
    ms,
    problems
  };
  if (AS_JSON) process.stdout.write(`${JSON.stringify(report)}\n`);
  else {
    for (const id of RULES) process.stdout.write(`${TAG} ${base[id].length === 0 ? 'PASS' : 'FAIL'} ${id}${base[id].length === 0 ? '' : ` (${String(base[id].length)})`}\n`);
    process.stdout.write(`${TAG} CA4 drove createdTmuxIdOf and answerLineCount over ${String(READER_TABLE.length)} answers, ${String(driven.size)} source variants and the shipped module\n`);
    process.stdout.write(`${TAG} ablations: ${String(report.ablations.ok)} of ${String(report.ablations.total)} read red on exactly the rule they break; the control ${controlOk ? 'stayed green' : 'moved'}\n`);
    for (const p of problems) process.stderr.write(`${TAG} ${p}\n`);
  }
  if (problems.length > 0) {
    if (!AS_JSON) process.stderr.write(`${TAG} FAILED: ${String(problems.length)} problem(s) over ${ROOT}\n`);
    process.exit(1);
  }
  if (!AS_JSON) {
    process.stdout.write(
      `${TAG} PASS: six rules over ${String(tree.size)} files under src/main, ${String(report.ablations.total)} ablations each red on its own rule alone and a control, ` +
        `createdTmuxIdOf driven over ${String(READER_TABLE.length)} answers in ${String(ms)} ms. A create answers the session it started: after the spawn's answer no ` +
        'statement that can throw sits outside a guard, a far answer that is not one session id is read by its id and never by its text, and a create ' +
        "during which the session list stopped answers the parent's own refusal when main would not open the session it started (on this Mac always, on " +
        "another machine when no list has shown it), decided by main from its store's latch once the create has ended, and on another machine whose list " +
        "stopped before its create returned the feed lets that refusal through, as the parent did. Spawned only the pinned tsx.\n"
    );
  }
  process.exit(0);
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
