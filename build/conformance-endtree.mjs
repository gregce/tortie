#!/usr/bin/env node
/**
 * `npm run conformance:endtree`. PHASE 323 — END ENDS WHAT THE HANG-UP LEAVES
 * RUNNING, AND NOTHING ELSE.
 *
 * About 1 s. It launches no Electron, starts no tmux server, spawns NOTHING —
 * not even the pinned tsx — makes no request and reads nothing under the
 * person's home. It reads this repository's own source with the TypeScript
 * parser (a module, not a process) and asserts over it.
 *
 * ## What it holds, and why each rule is a rule
 *
 * Phase 323 (build/p323/SPEC.md) moves a signal into the product for the first
 * time since Tortie stopped sending one: after his End, the processes of that
 * session that outlived tmux's hang-up are sent SIGTERM, then SIGKILL. A signal
 * sent to the wrong process loses someone's work, and CLAUDE.md's tmux safety
 * rule is that Tortie never ends what it did not create. So every clause that
 * makes that safe is written down here as a property of the tree, because a
 * round can change a clause and its test in one edit and every test stays
 * green.
 *
 *   E1  THE ORDER IS THE PROMISE. In `killSessionAdmitted`: the tree read is
 *       STARTED before the capture and not awaited there, so the two reads run
 *       at once (the fix round: one after the other they made every End answer
 *       about 57 ms later); it is awaited once, after the capture and before
 *       the hang-up; then the broadcast, then the continuation as the last
 *       statement. The tree read sits inside the `target !== undefined` block,
 *       and the continuation is NOT awaited, so the End answers the window
 *       before the waits (SPEC §4.2, §As built).
 *   E2  The root is the `$-id` `liveIds` holds, never `rec.panePid`, a
 *       `tmuxName` or a name (research 21 §6, fix F1; SPEC §1.3 item 3).
 *   E3  A plain `shell` row reads no tree at all (his ruling R2).
 *   E4  `session-tree.ts` signals one pid at a time and only a pid the
 *       identity re-read just produced: no negative pid, no `killpg`,
 *       `pkill`, `killall`, `pgrep`, no `SIGHUP`, exactly two `kill(` call
 *       sites, both in `endHangupSurvivors`, each looping over a variable
 *       assigned from `stillTheSame(` with no `await` between the two. And
 *       (the fix round) that variable starts as `tree.targets` and is only
 *       ever narrowed by `stillTheSame(` over itself, and the function never
 *       names `.all`: R1's held half at the signal, not only at the selection.
 *   E5  Identity is pid, group, start time AND the WHOLE command line, each
 *       compared as the plain field on both sides.
 *   E6  THE SELECTION IS THE PANE PROCESS'S OWN GROUP AND NO WIDER. This is
 *       R1's held half written as a rule (SPEC §2.2): a process that called
 *       `setsid` or moved to its own group is never a target, because
 *       Codex's shared background server and Gemini's self-update live
 *       there, and neither is an `.app/Contents/MacOS/` executable. Since the
 *       second fix round the terminal's foreground group is not selected
 *       either: in a restored row it is whatever a person put in front of the
 *       shell, and ending his foreground `nohup` job was worse than today
 *       (attack d2), while every agent the census launched that way ends on
 *       the hang-up by itself. A root counts only if it is a LIVE pane whose
 *       process is the answering server's own child and leads its own group.
 *       Widening it is a question for him, not a refactor, so a later round
 *       must come back through him.
 *   E7  The module's importers are exactly core.ts, scratch.ts and the
 *       harness runner (SPEC §4.6).
 *   E8  "Tortie never auto-ends a session", as text: nothing on
 *       `reapDeadSession`, `refresh`, reconcile, `boot`, `dispose`,
 *       `shutdownGmuxCore` or a timer callback in core.ts reaches the module
 *       or the two methods, followed call by call through the class, and the
 *       continuation is started from exactly one place.
 *   E9  THE GRACES ARE AN AGENT'S OWN ORDERLY EXIT (the second fix round).
 *       The first wait is at least twice the 5 s orderly exit the verifier
 *       planted (S9: at 4 s its exit was cut, today it completes) and so
 *       above every exit the census measured; the two together outlast
 *       Claude Code's own shutdown failsafe, 65 s at the most, because a
 *       SIGKILL before it cuts an exit today completes; the quick re-reads
 *       cover the census's slowest orderly exit; a failed re-read is asked
 *       again for longer than the longest stall measured on his Mac (9 s);
 *       and `ENDING_WORST_MS`, which the conformance closing check waits, is
 *       both waits each overrun by the whole retry window, one poll and the
 *       two reads a signal waits for.
 *   E10 THE QUIT DOES NOT WAIT FOR THE ENDING (the fix round). Joining it made
 *       a quit after an End 4.8 to 6.6 s slower than today, with the window on
 *       screen. `endAfterHangup` hands its work to nothing a quit waits on,
 *       and the ledger is the parent's again: no `follow`, a `join` that does
 *       not loop.
 *   E11 `build/harness-socket.mjs` reads the tree BEFORE `kill-server` and
 *       ends the survivors AFTER it, in both its teardown and its reap of a
 *       dead run, through the ONE runner, handing it the socket so its pane
 *       check asks that server; the runner's `end` is given longer than the
 *       longest an ending can run; neither it nor the runner signals anything
 *       itself.
 *   E12 Every `ps` the module runs is under `LC_ALL=C` and `-ww`, because
 *       `lstart` is locale-dependent (SPEC §1.2) and a truncated command line
 *       is not an identity. Every `-p` names ONE pid, because `ps -p a,b`
 *       costs about 200 ms and such calls queue, which ended nothing in a
 *       batch End (the fix round). End's own read is the pane terminals', never
 *       the whole table, and its pane read is bounded by the module's read
 *       bound (the verifier's X7: without it the tmux layer's 10 s default
 *       held the End's hang-up). PANE_ROOT_FORMAT holds no tab, which a client
 *       whose locale is not UTF-8 is sent as `_`, and every tmux the harness
 *       runner starts carries `-u` (the integration round).
 *   E13 The remote branch reaches none of it (SPEC §15: nothing for sessions
 *       on another machine).
 *   E14 A re-read that fails is asked again and is never read as the end,
 *       and a signal only ever follows a re-read that answered (the fix round:
 *       one slow read had ended the whole ending, leaking a created Gemini).
 *   E15 THE PANE CHECK (the second fix round, the verifier's S10). Before each
 *       signal the ending asks the server that answered the tree read for the
 *       panes it still shows, and drops every target whose pane is one of
 *       them: `kill-session` leaves the pane of a window another session
 *       shows (a grouped session, a linked window) alive and hung up nothing,
 *       and the build before this round sent SIGTERM to that live pane's
 *       process. The check is asked only at a step that may signal; a check
 *       that does not answer signals nothing; only a CONFIRMED "no server
 *       running" reads as no pane shown; and each of the three callers asks
 *       its own server within the read bound.
 *
 * E5 and E6 are also asked of the module's BEHAVIOUR, over planted process
 * tables, by transpiling it in memory (`ts.transpileModule`) and importing it
 * from a `data:` URL. That is still no process: the module and `ps.ts` are
 * pure at import time and only their pure functions are called. It is there
 * because "a selection wider than the hang-up's groups" is a property of what
 * the function RETURNS, and a text rule can be satisfied by a comparison that
 * never decides anything.
 *
 * EVERY RULE CARRIES ITS OWN ATTACK. Each rule is asked once over the tree
 * and then over in-memory copies with the rule broken one way at a time, and
 * every copy MUST read red beside the unmutated control, which must read
 * green. `npm run ablation:p323` is the attack on the shipping source beside
 * it, thirty-six arms, each of which must turn its owner red.
 *
 *   node build/conformance-endtree.mjs               this repository
 *   node build/conformance-endtree.mjs --root <dir>   a clone (the ablation)
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, posix, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { stripComments } from './scan-source.mjs';

const TAG = '[conformance:endtree]';
const HERE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const at = argv.indexOf('--root');
if (at >= 0 && (argv[at + 1] ?? '') === '') {
  process.stderr.write(`${TAG} --root needs a directory\n`);
  process.exit(2);
}
const ROOT = at >= 0 ? resolve(argv[at + 1]) : HERE;
const say = (l) => process.stdout.write(`${TAG} ${l}\n`);

const TREE = 'src/main/proc/session-tree.ts';
const CORE = 'src/main/sessions/core.ts';
const LEDGER = 'src/main/sessions/mutation-ledger.ts';
const HARNESS = 'build/harness-socket.mjs';
const CLI = 'build/session-tree-cli.mts';
const SCRATCH = 'src/main/conformance/scratch.ts';
const RESUME = 'src/main/conformance/resume.ts';

/** SPEC §4.6: the module's importers outside tests, and nothing else. */
const IMPORTERS = [CORE, SCRATCH, CLI];
/** The two methods §4.2 adds to GmuxCore. */
const METHODS = ['readEndTree', 'endAfterHangup'];
/**
 * E9's measurement, build/p323/SPEC.md §3: the slowest orderly exit on the
 * hang-up the census measured, restored Gemini under four-way concurrency. The
 * quick re-reads must cover it, so an agent that exits the way every agent in
 * the census did is seen gone and the ending returns.
 */
const SLOWEST_ORDERLY_EXIT_MS = 1_534;
/**
 * E9's attack measurement, the second fix round's verifier (Lens 1, S9,
 * 2026-09-30): a process that ends itself on the hang-up in 5 s and lets
 * SIGTERM end it at once. The 4 s grace cut it; today it completes. The first
 * wait must be at least twice it.
 */
const PLANTED_SLOW_EXIT_MS = 5_000;
/**
 * E9's reading of Claude Code 2.1.285's own shutdown (the second fix round,
 * from the installed binary, never run): on the hang-up it runs a person's
 * SessionEnd hooks with the longest configured timeout, capped at 60 s, and
 * arms its own failsafe at that plus 5 s; a SIGTERM that arrives meanwhile is
 * ignored. A SIGKILL before the failsafe cuts an exit today completes, so the
 * two graces together must outlast it, with a margin of 5 s.
 */
const AGENT_OWN_FAILSAFE_MAX_MS = 65_000;
/**
 * E9's second measurement, the fix round's verifier (Lens 2, 2026-09-30): the
 * longest stall of a 1 s poll on his Mac under its own load, 9 s. A re-read
 * that fails is asked again for at least this long.
 */
const LONGEST_STALL_MS = 9_000;
/**
 * The most E9 lets one ending run, so the closing check and the harness
 * runner's `end` that wait for it are bounded. Raised from 60 s by the second
 * fix round, whose graces are 10 s and 60 s (94.5 s worst case).
 */
const ENDING_CEILING_MS = 120_000;

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

const readText = (rel) => {
  try {
    return readFileSync(join(ROOT, rel), 'utf8');
  } catch {
    return null;
  }
};

const kindOf = (rel) => (/\.m?js$|\.cjs$/.test(rel) ? ts.ScriptKind.JS : ts.ScriptKind.TS);
const parse = (rel, text) => ts.createSourceFile(rel, text, ts.ScriptTarget.Latest, true, kindOf(rel));
const norm = (s) => s.replace(/\s+/g, ' ').trim();

/** Every node under `node`, depth first and in source order, the node itself included. */
function nodesOf(node) {
  const out = [];
  const visit = (n) => {
    out.push(n);
    ts.forEachChild(n, visit);
  };
  if (node !== undefined) visit(node);
  return out;
}

/** The name a call is made by: `f(` is f, `a.b.f(` is f. */
function calleeName(call) {
  const e = call.expression;
  if (ts.isIdentifier(e)) return e.text;
  if (ts.isPropertyAccessExpression(e)) return e.name.text;
  return null;
}
const callsNamed = (node, name) => nodesOf(node).filter((n) => ts.isCallExpression(n) && calleeName(n) === name);
const identifiersIn = (node) => nodesOf(node).filter((n) => ts.isIdentifier(n)).map((n) => n.text);
const within = (inner, outer) => inner.getStart() >= outer.getStart() && inner.getEnd() <= outer.getEnd();

/** Every method of every class in the file with this name. */
function methodsNamed(sf, name) {
  return nodesOf(sf).filter(
    (n) => ts.isMethodDeclaration(n) && n.body !== undefined && ts.isIdentifier(n.name) && n.name.text === name
  );
}
/** Top-level function declarations and `const f = (…) => …` / `function` expressions, by name. */
function functionsNamed(sf, name) {
  const out = [];
  for (const n of nodesOf(sf)) {
    if (ts.isFunctionDeclaration(n) && n.name?.text === name && n.body !== undefined) out.push(n);
    if (
      ts.isVariableDeclaration(n) &&
      ts.isIdentifier(n.name) &&
      n.name.text === name &&
      n.initializer !== undefined &&
      (ts.isArrowFunction(n.initializer) || ts.isFunctionExpression(n.initializer))
    ) {
      out.push(n.initializer);
    }
  }
  return out;
}
const one = (list) => (list.length === 1 ? list[0] : null);

/** The names a module exports, functions and constants alike. */
function exportedNames(sf) {
  const out = new Set();
  for (const s of sf.statements) {
    const exported = (s.modifiers ?? []).some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
    if (!exported) continue;
    if ((ts.isFunctionDeclaration(s) || ts.isClassDeclaration(s)) && s.name !== undefined) out.add(s.name.text);
    if (ts.isVariableStatement(s)) {
      for (const d of s.declarationList.declarations) if (ts.isIdentifier(d.name)) out.add(d.name.text);
    }
  }
  return out;
}

/**
 * Module-level declarations a node reaches through its identifiers, followed
 * transitively: a helper a function calls, a constant it reads. The text of
 * each is what a rule about "does this function, or anything it uses, say X"
 * asks.
 */
function reachedDeclarations(sf, start) {
  const decls = new Map();
  for (const s of sf.statements) {
    if (ts.isFunctionDeclaration(s) && s.name !== undefined) decls.set(s.name.text, s);
    if (ts.isVariableStatement(s)) {
      for (const d of s.declarationList.declarations) if (ts.isIdentifier(d.name)) decls.set(d.name.text, d);
    }
  }
  const seen = new Set();
  const out = [start];
  const queue = [start];
  while (queue.length > 0) {
    const node = queue.pop();
    for (const name of identifiersIn(node)) {
      if (seen.has(name) || !decls.has(name)) continue;
      seen.add(name);
      const d = decls.get(name);
      if (d === start || within(start, d)) continue;
      out.push(d);
      queue.push(d);
    }
  }
  return out;
}

/** Numeric value of `export const NAME = 4_000`, or null. */
function constantValue(sf, name) {
  for (const s of sf.statements) {
    if (!ts.isVariableStatement(s)) continue;
    for (const d of s.declarationList.declarations) {
      if (!ts.isIdentifier(d.name) || d.name.text !== name || d.initializer === undefined) continue;
      let e = d.initializer;
      while (ts.isAsExpression(e) || ts.isParenthesizedExpression(e) || ts.isSatisfiesExpression(e)) e = e.expression;
      if (ts.isNumericLiteral(e)) return Number(e.text.replace(/_/g, ''));
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// The tree these rules read
// ---------------------------------------------------------------------------

/** Every file under `dir` (relative to ROOT) matching `keep`, tests and vendor skipped. */
function filesUnder(dir, keep) {
  const out = [];
  const walk = (rel) => {
    let entries;
    try {
      entries = readdirSync(join(ROOT, rel));
    } catch {
      return;
    }
    for (const entry of entries.sort()) {
      if (entry === '__tests__' || entry === 'node_modules' || entry === 'vendor' || entry === 'fixtures' || entry.startsWith('.')) continue;
      const r = `${rel}/${entry}`;
      let st;
      try {
        st = statSync(join(ROOT, r));
      } catch {
        continue;
      }
      if (st.isDirectory()) walk(r);
      else if (keep(entry)) out.push(r);
    }
  };
  walk(dir);
  return out;
}

/**
 * The texts the rules read, and every OTHER source file that names
 * `session-tree` at all (E7's candidates). The text filter is only a filter;
 * each file it keeps is parsed.
 */
function shippingTree() {
  const t = {
    tree: readText(TREE),
    core: readText(CORE),
    ledger: readText(LEDGER),
    harness: readText(HARNESS),
    cli: readText(CLI),
    scratch: readText(SCRATCH),
    resume: readText(RESUME),
    ps: readText('src/main/proc/ps.ts'),
    guarded: readText('src/main/proc/guarded.ts'),
    others: []
  };
  const src = filesUnder('src', (e) => /\.tsx?$/.test(e) && !/\.test\.tsx?$/.test(e));
  const build = filesUnder('build', (e) => /\.(mjs|mts|cjs|js|ts)$/.test(e));
  for (const rel of [...src, ...build]) {
    if (rel === TREE || rel === CORE || rel === CLI || rel === SCRATCH) continue;
    const text = readText(rel);
    if (text !== null && text.includes('session-tree')) t.others.push({ rel, text });
  }
  return t;
}

const missing = (t) =>
  [
    [TREE, t.tree],
    [CORE, t.core],
    [LEDGER, t.ledger],
    [HARNESS, t.harness],
    [CLI, t.cli],
    [SCRATCH, t.scratch],
    [RESUME, t.resume]
  ]
    .filter(([, text]) => text === null)
    .map(([rel]) => `${rel} could not be read`);

// ---------------------------------------------------------------------------
// E1 — the order in killSessionAdmitted
// ---------------------------------------------------------------------------

function endBody(t) {
  const sf = parse(CORE, t.core ?? '');
  const m = one(methodsNamed(sf, 'killSessionAdmitted'));
  return { sf, m };
}

function hasAwaitAbove(node, stop) {
  for (let p = node.parent; p !== undefined && p !== stop; p = p.parent) {
    if (ts.isAwaitExpression(p)) return true;
  }
  return false;
}

/** The variable a call's value is held in (`const x = …call…`, `x = …call…`), or null. */
function heldIn(call, stop) {
  for (let p = call.parent; p !== undefined && p !== stop; p = p.parent) {
    if (ts.isVariableDeclaration(p) && ts.isIdentifier(p.name)) return p.name.text;
    if (ts.isBinaryExpression(p) && p.operatorToken.kind === ts.SyntaxKind.EqualsToken && ts.isIdentifier(p.left)) return p.left.text;
    if (ts.isBlock(p) || ts.isExpressionStatement(p)) return null;
  }
  return null;
}
/** The one `await` of the variable the tree read is held in, or null. */
function treeAwaitsOf(body, held) {
  if (held === null) return [];
  return nodesOf(body).filter((n) => ts.isAwaitExpression(n) && identifiersIn(n.expression).includes(held));
}

function e1(t) {
  const out = [];
  const { m } = endBody(t);
  if (m === null) return ['killSessionAdmitted is not one method of core.ts'];
  const capture = callsNamed(m.body, 'captureSessionSnapshot');
  const read = callsNamed(m.body, 'readEndTree');
  const hang = nodesOf(m.body).filter(
    (n) => ts.isCallExpression(n) && norm(n.expression.getText()) === 'tmux.killSession' && n.arguments.length === 1 && n.arguments[0].getText() === 'target'
  );
  const bcast = callsNamed(m.body, 'broadcastSessions');
  const after = callsNamed(m.body, 'endAfterHangup');
  if (capture.length !== 1) out.push(`captureSessionSnapshot( is called ${String(capture.length)} times, not once`);
  if (read.length !== 1) out.push(`readEndTree( is called ${String(read.length)} times, not once`);
  if (hang.length !== 1) out.push(`tmux.killSession(target) is called ${String(hang.length)} times, not once`);
  if (after.length !== 1) out.push(`endAfterHangup( is called ${String(after.length)} times, not once`);
  if (bcast.length === 0) out.push('broadcastSessions( is never called');
  if (out.length > 0) return out;
  const [c, r, h, a] = [capture[0], read[0], hang[0], after[0]];
  // The local branch's broadcast is the last one; the remote branch has its own above it.
  const b = bcast[bcast.length - 1];
  // THE FIX ROUND. The tree read is started, not awaited where it starts, and
  // before the capture, so the capture does not wait for it; its value is held
  // and awaited once, after the capture and before the hang-up.
  if (hasAwaitAbove(r, m.body)) {
    out.push('readEndTree( is awaited where it starts, so the capture waits for it and every End answers one read later (the fix round measured +57 ms on his Mac)');
  }
  const held = heldIn(r, m.body);
  if (held === null) out.push('readEndTree( is not held in a variable, so nothing awaits it before the hang-up');
  if (stmtOf(r).getStart() >= c.getStart()) out.push('the tree read does not start before the capture, so the two reads do not run at once');
  const awaits = treeAwaitsOf(m.body, held);
  if (held !== null && awaits.length !== 1) out.push(`the tree read (\`${held}\`) is awaited ${String(awaits.length)} times, not once`);
  if (out.length > 0) return out;
  const w = awaits[0];
  const order = [
    ['captureSessionSnapshot(', c],
    [`await ${held}`, w],
    ['tmux.killSession(target)', h],
    ['broadcastSessions()', b],
    ['endAfterHangup(', a]
  ];
  for (let i = 1; i < order.length; i += 1) {
    if (order[i - 1][1].getStart() >= order[i][1].getStart()) {
      out.push(`${order[i - 1][0]} does not come before ${order[i][0]}`);
    }
  }
  const guard = nodesOf(m.body).find(
    (n) => ts.isIfStatement(n) && norm(n.expression.getText()) === 'target !== undefined'
  );
  if (guard === undefined) out.push('there is no `if (target !== undefined)` block');
  else {
    if (!within(r, guard.thenStatement)) out.push('readEndTree( is not inside the `target !== undefined` block');
    if (!within(w, guard.thenStatement)) out.push('the tree read is not awaited inside the `target !== undefined` block');
  }
  const last = m.body.statements[m.body.statements.length - 1];
  if (last === undefined || !within(a, last)) out.push('endAfterHangup( is not in the last statement of the method');
  if (hasAwaitAbove(a, m.body)) out.push('endAfterHangup( is awaited, so the End would wait out the grace periods in band');
  if (ts.isReturnStatement(last ?? m.body)) out.push('the continuation is returned, so a caller could await it');
  return out;
}

// ---------------------------------------------------------------------------
// E2 — the root is liveIds' `$-id`
// ---------------------------------------------------------------------------

function e2(t) {
  const out = [];
  const { sf, m } = endBody(t);
  if (m === null) return ['killSessionAdmitted is not one method of core.ts'];
  const decl = nodesOf(m.body).find((n) => ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === 'target');
  if (decl === undefined || decl.initializer === undefined || norm(decl.initializer.getText()) !== 'this.liveIds.get(sessionId)') {
    out.push('`target` is not `this.liveIds.get(sessionId)`');
  }
  const read = one(callsNamed(m.body, 'readEndTree'));
  if (read === null) return [...out, 'readEndTree( is not called once'];
  if (read.arguments.length < 1 || !ts.isIdentifier(read.arguments[0]) || read.arguments[0].text !== 'target') {
    out.push(`readEndTree is handed ${read.arguments[0]?.getText() ?? 'nothing'} as its root, not \`target\``);
  }
  for (const w of ['panePid', 'tmuxName']) {
    if (identifiersIn(read).includes(w)) out.push(`the readEndTree call names ${w}`);
  }
  const rm = one(methodsNamed(sf, 'readEndTree'));
  if (rm === null) return [...out, 'readEndTree is not one method of core.ts'];
  const param = rm.parameters[0]?.name;
  const second = rm.parameters[1]?.name;
  const panes = callsNamed(rm.body, 'sessionPanesArgv');
  if (panes.length !== 1) out.push(`readEndTree calls sessionPanesArgv( ${String(panes.length)} times, not once`);
  else if (param === undefined || !ts.isIdentifier(param) || !identifiersIn(panes[0]).slice(1).includes(param.text)) {
    out.push('readEndTree does not hand its `target` parameter to sessionPanesArgv(');
  }
  for (const method of [rm, one(methodsNamed(sf, 'endAfterHangup'))]) {
    if (method === null) continue;
    for (const w of ['panePid', 'tmuxName']) {
      if (identifiersIn(method.body).includes(w)) out.push(`${method.name.getText()} names ${w}`);
    }
  }
  for (const call of [...panes, ...callsNamed(rm.body, 'execTmux')]) {
    const names = identifiersIn(call).slice(1);
    if (names.includes('rec') || (second !== undefined && ts.isIdentifier(second) && names.includes(second.text))) {
      out.push(`a name reaches an argv: ${norm(call.getText()).slice(0, 80)}`);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// E3 — the shell guard (R2)
// ---------------------------------------------------------------------------

const SHELL_GUARDS = new Set(["rec.agent !== 'shell'", "'shell' !== rec.agent"]);
function conjuncts(e) {
  const out = [];
  const walk = (x) => {
    while (ts.isParenthesizedExpression(x)) x = x.expression;
    if (ts.isBinaryExpression(x) && x.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) {
      walk(x.left);
      walk(x.right);
    } else out.push(norm(x.getText()));
  };
  walk(e);
  return out;
}
function e3(t) {
  const { m } = endBody(t);
  if (m === null) return ['killSessionAdmitted is not one method of core.ts'];
  const read = one(callsNamed(m.body, 'readEndTree'));
  if (read === null) return ['readEndTree( is not called once'];
  for (let p = read.parent; p !== undefined && p !== m.body; p = p.parent) {
    if (ts.isConditionalExpression(p) && within(read, p.whenTrue) && conjuncts(p.condition).some((c) => SHELL_GUARDS.has(c))) return [];
    if (ts.isIfStatement(p) && within(read, p.thenStatement) && conjuncts(p.expression).some((c) => SHELL_GUARDS.has(c))) return [];
  }
  return ["readEndTree( is not guarded by `rec.agent !== 'shell'`, so a plain shell session would have its tree read (R2)"];
}

// ---------------------------------------------------------------------------
// E4 — one pid at a time, behind the re-read
// ---------------------------------------------------------------------------

const BANNED = ['kill(-', 'killpg', 'pkill', 'killall', 'pgrep', 'SIGHUP'];

/** Whether a statement can never fall through to the one after it. */
function terminates(s) {
  if (s === undefined) return false;
  if (ts.isReturnStatement(s) || ts.isThrowStatement(s) || ts.isBreakStatement(s) || ts.isContinueStatement(s)) return true;
  if (ts.isBlock(s)) return terminates(s.statements[s.statements.length - 1]);
  if (ts.isIfStatement(s)) return s.elseStatement !== undefined && terminates(s.thenStatement) && terminates(s.elseStatement);
  return false;
}
const isLoop = (s) => ts.isForStatement(s) || ts.isWhileStatement(s) || ts.isDoStatement(s) || ts.isForOfStatement(s) || ts.isForInStatement(s);
/** Whether `s` assigns `name` from a call to `stillTheSame(`; 'other' when it assigns it from anything else. */
function assigns(s, name) {
  let verdict = null;
  for (const n of nodesOf(s)) {
    let target = null;
    let value = null;
    if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === name) {
      target = n.name;
      value = n.initializer ?? null;
    } else if (
      ts.isBinaryExpression(n) &&
      n.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      ts.isIdentifier(n.left) &&
      n.left.text === name
    ) {
      target = n.left;
      value = n.right;
    }
    if (target === null) continue;
    let v = value;
    while (v !== null && (ts.isAwaitExpression(v) || ts.isParenthesizedExpression(v) || ts.isAsExpression(v))) v = v.expression;
    verdict = v !== null && ts.isCallExpression(v) && calleeName(v) === 'stillTheSame' ? 'same' : 'other';
  }
  return verdict;
}
const hasAwait = (node) => nodesOf(node).some((n) => ts.isAwaitExpression(n) || (ts.isForOfStatement(n) && n.awaitModifier !== undefined));
/** Breaks that leave `loop` (not ones inside a nested loop or switch). */
function breaksOf(loop) {
  const out = [];
  const visit = (n, depth) => {
    if (n !== loop && (isLoop(n) || ts.isSwitchStatement(n))) depth += 1;
    if (ts.isBreakStatement(n) && depth === 0 && n.label === undefined) out.push(n);
    if (ts.isFunctionLike(n) && n !== loop) return;
    ts.forEachChild(n, (c) => visit(c, depth));
  };
  ts.forEachChild(loop, (c) => visit(c, 0));
  return out;
}

/**
 * Walk BACKWARDS in control flow from a statement to the most recent
 * assignment of `name`, and answer the problems on every path that reaches it:
 * an `await` crossed, an assignment from anything but `stillTheSame(`, or no
 * assignment in the same loop step at all. It follows the shapes a polling loop
 * is written in: a sibling `if` that cannot fall through, a loop left by
 * `break` or by its condition, nested blocks and `try`.
 *
 * `before(s)` asks about every path arriving at the START of `s`; `through(s)`
 * about every path leaving `s` at its END and then going back through it.
 */
function flow(name, fnBody) {
  const seen = new Set();
  const NO_STEP = `${name} is not re-read by stillTheSame( in the same loop step before the signal`;
  const before = (s) => {
    const parent = s.parent;
    if (parent === undefined) return [NO_STEP];
    if (ts.isBlock(parent)) {
      const i = parent.statements.indexOf(s);
      if (i > 0) return through(parent.statements[i - 1]);
      if (parent === fnBody) return [NO_STEP];
      return before(parent);
    }
    if (ts.isIfStatement(parent)) {
      if (hasAwait(parent.expression)) return ['an `if` condition between the re-read and the signal awaits'];
      return before(parent);
    }
    if (isLoop(parent)) return [NO_STEP];
    if (ts.isTryStatement(parent) || ts.isLabeledStatement(parent) || ts.isCatchClause(parent)) return before(parent);
    return [NO_STEP];
  };
  const through = (s) => {
    if (seen.has(s)) return [];
    seen.add(s);
    if (ts.isReturnStatement(s) || ts.isThrowStatement(s) || ts.isBreakStatement(s) || ts.isContinueStatement(s)) return [];
    if (ts.isBlock(s)) return s.statements.length === 0 ? before(s) : through(s.statements[s.statements.length - 1]);
    if (ts.isIfStatement(s)) {
      if (hasAwait(s.expression)) return ['an `if` condition between the re-read and the signal awaits'];
      const out = [];
      if (!terminates(s.thenStatement)) out.push(...through(s.thenStatement));
      if (s.elseStatement !== undefined) {
        if (!terminates(s.elseStatement)) out.push(...through(s.elseStatement));
      } else out.push(...before(s));
      return out;
    }
    if (isLoop(s)) {
      if (ts.isForOfStatement(s) || ts.isForInStatement(s)) {
        if (s.awaitModifier !== undefined) return ['a for-await loop stands between the re-read and the signal'];
        if (hasAwait(s.statement)) return ['a loop between the re-read and the signal awaits'];
        if (assigns(s.statement, name) !== null) return [`${name} is reassigned inside a loop before the signal`];
        return before(s);
      }
      const out = [];
      for (const br of breaksOf(s)) out.push(...before(br));
      const cond = ts.isForStatement(s) ? s.condition : s.expression;
      if (cond !== undefined) {
        if (hasAwait(cond)) out.push('a loop condition between the re-read and the signal awaits');
        out.push(...through(s.statement));
        if (!ts.isDoStatement(s)) out.push(...before(s));
      }
      return out;
    }
    if (ts.isTryStatement(s)) {
      if (hasAwait(s) && assigns(s, name) === null) return ['an await inside a `try` sits between the re-read and the signal'];
      return s.finallyBlock !== undefined ? through(s.finallyBlock) : through(s.tryBlock);
    }
    const a = assigns(s, name);
    if (a === 'same') return hasAwaitAfterAssignment(s, name) ? ['an await sits between the stillTheSame( assignment and the signal'] : [];
    if (a === 'other') return [`${name} is assigned from something other than stillTheSame( before the signal`];
    if (hasAwait(s)) return [`an await (${norm(s.getText()).slice(0, 60)}) sits between the re-read and the signal`];
    return before(s);
  };
  return before;
}
function hasAwaitAfterAssignment(s, name) {
  const nodes = nodesOf(s);
  const assign = nodes.filter(
    (n) =>
      (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === name) ||
      (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.EqualsToken && ts.isIdentifier(n.left) && n.left.text === name)
  );
  const last = assign[assign.length - 1];
  return last !== undefined && nodes.some((n) => ts.isAwaitExpression(n) && n.getStart() > last.getEnd());
}

/** The statement a kill call's loop is, and the variable it iterates, or why not. */
function killLoopOf(call, fnBody) {
  for (let p = call.parent; p !== undefined && p !== fnBody; p = p.parent) {
    if (ts.isForOfStatement(p)) {
      const e = p.expression;
      if (ts.isIdentifier(e)) return { stmt: p, name: e.text };
      return { why: `the loop around a kill( iterates \`${norm(e.getText())}\`, not a variable assigned from stillTheSame(` };
    }
    if (ts.isCallExpression(p) && ts.isPropertyAccessExpression(p.expression) && ['forEach', 'map'].includes(p.expression.name.text)) {
      const recv = p.expression.expression;
      let stmt = p;
      while (stmt.parent !== undefined && !ts.isBlock(stmt.parent)) stmt = stmt.parent;
      if (ts.isIdentifier(recv)) return { stmt, name: recv.text };
      return { why: `the loop around a kill( iterates \`${norm(recv.getText())}\`, not a variable assigned from stillTheSame(` };
    }
  }
  return { why: 'a kill( is not inside a loop over the re-read' };
}

/** The kill( calls of a file, with the one pure forwarding in defaultEndDeps set aside. */
function killCalls(sf) {
  const deps = functionsNamed(sf, 'defaultEndDeps');
  const all = nodesOf(sf).filter((n) => ts.isCallExpression(n) && calleeName(n) === 'kill');
  const forwarding = [];
  const rest = [];
  for (const c of all) {
    const inDeps = deps.some((d) => within(c, d));
    // `kill: (pid, signal) => process.kill(pid, signal)`: the injected KillFn's
    // production binding, which forwards its own two parameters and decides
    // nothing. SPEC §4.1 names it ("process.kill") beside the two sites E4 counts.
    const fn = c.parent !== undefined && ts.isArrowFunction(c.parent) ? c.parent : c.parent?.parent?.parent;
    const params = fn !== undefined && ts.isFunctionLike(fn) ? fn.parameters.map((p) => p.name.getText()) : [];
    const forwards =
      inDeps &&
      norm(c.expression.getText()) === 'process.kill' &&
      c.arguments.length === 2 &&
      params.length === 2 &&
      c.arguments.map((a) => a.getText()).join(',') === params.join(',');
    (forwards ? forwarding : rest).push(c);
  }
  return { forwarding, rest };
}

function e4(t) {
  const out = [];
  const code = stripComments(t.tree ?? '');
  for (const w of BANNED) if (code.includes(w)) out.push(`session-tree.ts names ${w}`);
  const sf = parse(TREE, t.tree ?? '');
  for (const n of nodesOf(sf)) {
    if (ts.isPrefixUnaryExpression(n) && n.operator === ts.SyntaxKind.MinusToken) {
      const o = n.operand;
      const isPid = (ts.isIdentifier(o) && /pid$/i.test(o.text)) || (ts.isPropertyAccessExpression(o) && /pid$/i.test(o.name.text));
      if (isPid) out.push(`a negative pid: ${norm(n.parent.getText()).slice(0, 60)}`);
    }
    if (ts.isCallExpression(n) && calleeName(n) === 'kill' && n.arguments[0] !== undefined && ts.isPrefixUnaryExpression(n.arguments[0])) {
      out.push(`a kill( of a negative number: ${norm(n.getText()).slice(0, 60)}`);
    }
  }
  const fns = functionsNamed(sf, 'endHangupSurvivors');
  if (fns.length !== 1) return [...out, `endHangupSurvivors is defined ${String(fns.length)} times, not once`];
  const fn = fns[0];
  const { forwarding, rest } = killCalls(sf);
  if (forwarding.length > 1) out.push('defaultEndDeps forwards to process.kill more than once');
  if (rest.length !== 2) out.push(`session-tree.ts has ${String(rest.length)} kill( call sites, not two`);
  for (const c of rest) {
    if (!within(c, fn.body)) {
      out.push(`a kill( outside endHangupSurvivors: ${norm(c.getText()).slice(0, 60)}`);
      continue;
    }
    const loop = killLoopOf(c, fn.body);
    if (loop.why !== undefined) {
      out.push(loop.why);
      continue;
    }
    // A later pass of the loop crosses everything in it, so the loop itself may hold no await.
    if (hasAwait(loop.stmt)) out.push(`${norm(c.getText()).slice(0, 50)}: the loop that signals awaits, so a later pid is signalled on a stale re-read`);
    for (const p of [...new Set(flow(loop.name, fn.body)(loop.stmt))]) out.push(`${norm(c.getText()).slice(0, 50)}: ${p}`);
  }
  // THE FIX ROUND: R1's held half at the signal, not only at the selection.
  // What is signalled starts as `tree.targets` and is only ever narrowed by
  // `stillTheSame(` over itself, and `.all`, which holds what left the
  // terminal, is never named here.
  if (nodesOf(fn.body).some((n) => ts.isPropertyAccessExpression(n) && n.name.text === 'all')) {
    out.push('endHangupSurvivors names `.all`, which holds what left the terminal (R1’s held half is his to widen)');
  }
  const signalled = new Set(rest.filter((c) => within(c, fn.body)).map((c) => killLoopOf(c, fn.body).name).filter((x) => x !== undefined));
  for (const name of signalled) {
    const decls = nodesOf(fn.body).filter((n) => ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === name);
    if (decls.length !== 1) {
      out.push(`${name} is declared ${String(decls.length)} times in endHangupSurvivors, not once`);
      continue;
    }
    const init = decls[0].initializer;
    const ids = init === undefined ? [] : identifiersIn(init);
    if (init === undefined || !ids.includes('targets') || ids.some((i) => i !== 'tree' && i !== 'targets')) {
      out.push(`${name} does not start as tree.targets alone: ${init === undefined ? 'no initial value' : norm(init.getText())}`);
    }
    for (const n of nodesOf(fn.body)) {
      if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.EqualsToken && ts.isIdentifier(n.left) && n.left.text === name) {
        const v = n.right;
        const narrows = ts.isCallExpression(v) && calleeName(v) === 'stillTheSame' && v.arguments[0] !== undefined && ts.isIdentifier(v.arguments[0]) && v.arguments[0].text === name;
        if (!narrows) out.push(`${name} is assigned from something other than stillTheSame(${name}, …): ${norm(n.getText()).slice(0, 60)}`);
      }
    }
  }
  // Every call that signals takes a pid, not a group, pattern or name.
  for (const n of nodesOf(sf)) {
    if (ts.isCallExpression(n) && /^(execFile|spawn|exec|spawnSync|execFileSync|execSync|runGuarded)$/.test(calleeName(n) ?? '')) {
      const program = n.arguments[0];
      if (program !== undefined && ts.isStringLiteralLike(program) && !['/bin/ps'].includes(program.text)) {
        out.push(`session-tree.ts runs ${program.text}; the only program it may run is /bin/ps`);
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// E5 — identity: pid, pgid, lstart and command
// ---------------------------------------------------------------------------

const IDENTITY = ['pid', 'pgid', 'lstart', 'command'];
/**
 * The identity fields compared as the PLAIN field on both sides, `a.f === b.f`.
 * The fix round's verifier compared the command by its first word only and
 * every rule and row stayed green, so a comparison through a call or an index
 * (`a.command.split(' ')[0]`) no longer counts.
 */
function fieldsCompared(fn) {
  const found = new Set();
  const plain = (side, f) => ts.isPropertyAccessExpression(side) && side.name.text === f && ts.isIdentifier(side.expression);
  for (const n of nodesOf(fn)) {
    if (!ts.isBinaryExpression(n)) continue;
    const k = n.operatorToken.kind;
    if (![ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken, ts.SyntaxKind.EqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsToken].includes(k)) continue;
    for (const f of IDENTITY) if (plain(n.left, f) && plain(n.right, f)) found.add(f);
  }
  // The pid may be compared by the lookup itself: `table.get(e.pid)`.
  for (const c of callsNamed(fn, 'get')) {
    if (c.arguments.length === 1 && ts.isPropertyAccessExpression(c.arguments[0]) && c.arguments[0].name.text === 'pid') found.add('pid');
  }
  return found;
}
function e5Static(t) {
  const sf = parse(TREE, t.tree ?? '');
  const fn = one(functionsNamed(sf, 'stillTheSame'));
  if (fn === null) return ['stillTheSame is not one function of session-tree.ts'];
  const found = fieldsCompared(fn);
  return IDENTITY.filter((f) => !found.has(f)).map((f) => `stillTheSame never compares the plain ${f} with ${f}`);
}

// ---------------------------------------------------------------------------
// The module, loaded in memory: E5's and E6's behaviour
// ---------------------------------------------------------------------------

/**
 * Transpile the module and what it imports relatively, rewrite each relative
 * specifier to a `data:` URL of the transpiled sibling, and import it. No
 * process starts and nothing is written. A relative import that cannot be
 * found is a finding, so a module that grew an Electron import says so here.
 */
async function loadTree(t) {
  const texts = new Map([
    [TREE, t.tree ?? ''],
    ['src/main/proc/ps.ts', t.ps],
    ['src/main/proc/guarded.ts', t.guarded]
  ]);
  const urls = new Map();
  const failures = [];
  const urlOf = (rel, depth) => {
    if (urls.has(rel)) return urls.get(rel);
    if (depth > 6) {
      failures.push(`${rel}: imports nested deeper than six`);
      return null;
    }
    const text = texts.has(rel) ? texts.get(rel) : readText(rel);
    if (text === null || text === undefined) {
      failures.push(`${rel} could not be read`);
      return null;
    }
    const js = ts.transpileModule(text, {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
      fileName: rel
    }).outputText;
    const rewritten = js.replace(/(\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)(['"])(\.{1,2}\/[^'"]+)\2/g, (whole, pre, q, spec) => {
      const base = posix.normalize(posix.join(posix.dirname(rel), spec));
      const candidates = [`${base}.ts`, `${base}/index.ts`, base.replace(/\.js$/, '.ts'), base];
      const hit = candidates.find((c) => texts.has(c) || existsSync(join(ROOT, c)));
      if (hit === undefined) {
        failures.push(`${rel} imports ${spec}, which is not there`);
        return whole;
      }
      const url = urlOf(hit, depth + 1);
      return url === null ? whole : `${pre}${q}${url}${q}`;
    });
    const url = `data:text/javascript;base64,${Buffer.from(rewritten, 'utf8').toString('base64')}`;
    urls.set(rel, url);
    return url;
  };
  const url = urlOf(TREE, 0);
  if (url === null || failures.length > 0) return { mod: null, why: failures.join('; ') || 'the module could not be built' };
  try {
    return { mod: await import(url), why: '' };
  } catch (err) {
    return { mod: null, why: `the module did not load: ${String(err?.message ?? err).slice(0, 200)}` };
  }
}

const LSTART = 'Tue Sep 29 17:41:36 2026';
const row = (pid, ppid, pgid, tpgid, command, lstart = LSTART, stat = 'S+') => ({ pid, ppid, pgid, tpgid, stat, lstart, command });

/**
 * The planted world E6 asks the selection about. Every census shape is here
 * with the answer SPEC §2.2 gives it:
 *   server 50; this process 77, planted as a descendant it must never be
 *   created Gemini  100 (the pane, its group) and 101 (its child, same group): targets
 *                   102: a `setsid` child of 101 in its own group: NEVER
 *                   103: an `.app/Contents/MacOS/` executable in the pane's group: NEVER
 *   restored        200 (-zsh, the pane): a target
 *                   210 (the foreground job, the terminal's foreground group
 *                   through tpgid, which is his in a restored row, attack d2)
 *                   and 211 (its helper, same group): NEVER targets since the
 *                   second fix round
 *                   220: a background job in a group of its own: NEVER
 *                   230: Codex's shared server shape, a setsid child of 210: NEVER
 *   a dead pane     300 (pane_dead 1): dropped before any read
 *   a reused pid    400: a live pane pid whose process is not the server's child: dropped
 *   a hostile pane  500, under which the table claims this process (77) and,
 *                   through a cycle, pid 1 and the server: 77, 1 and 50 NEVER
 *   not a leader    600: a live pane pid, the server's child, in ANOTHER
 *                   group (601), which no pane process can be: dropped, and
 *                   602 under it NEVER
 */
function plantedWorld() {
  const rows = [
    row(1, 0, 1, 0, '/sbin/launchd', LSTART, 'Ss'),
    row(50, 1, 50, 0, 'tmux -L gmux-scratch new-session', LSTART, 'Ss'),
    row(100, 50, 100, 100, 'node /opt/gemini/bin/gemini', LSTART, 'Ss+'),
    row(101, 100, 100, 100, 'node /opt/gemini/bundle/gemini.js'),
    row(102, 101, 102, 0, 'bun run mcp-server.ts', LSTART, 'Ss'),
    row(103, 100, 100, 100, '/Applications/Fake.app/Contents/MacOS/fake --flag'),
    row(200, 50, 200, 210, '-zsh', LSTART, 'Ss'),
    row(210, 200, 210, 210, 'claude'),
    row(211, 210, 210, 210, 'claude helper'),
    row(220, 200, 220, 210, 'sleep 600', LSTART, 'SN'),
    row(230, 210, 230, 0, 'codex app-server daemon pid-update-loop', LSTART, 'Ss'),
    row(231, 230, 230, 0, 'codex app-server --listen unix:// --managed-daemon', LSTART, 'S'),
    row(400, 999, 400, 400, 'sleep 1', LSTART, 'Ss+'),
    row(401, 400, 400, 400, 'sleep 2'),
    row(999, 1, 999, 0, 'someone else'),
    row(600, 50, 601, 601, 'sh -c not-a-pane-process', LSTART, 'S+'),
    row(602, 600, 601, 601, 'sleep 3')
  ];
  // A hostile pane: the table claims this process (77) as its child and pid 1
  // under it, a cycle through the server. Neither may ever be read; whether
  // the hostile root itself is kept is the module's choice.
  rows.push(row(500, 50, 500, 500, 'sh -c x', LSTART, 'Ss+'));
  rows.push(row(77, 500, 77, 0, 'Electron', LSTART, 'S'));
  const table = new Map(rows.map((r) => [r.pid, r]));
  table.set(1, { ...table.get(1), ppid: 500 });
  const paneStdout =
    '100 0 50 /dev/ttys100\n200 0 50 /dev/ttys200\n300 1 50 /dev/ttys300\n400 0 50 /dev/ttys400\n' +
    'not-a-pid 0 50 /dev/ttys600\n500 0 50 /dev/ttys500\n700 0 50 not-a-terminal\n600 0 50 /dev/ttys601\n';
  return {
    table,
    paneStdout,
    wantRoots: [100, 200, 400, 500, 600],
    wantTargets: [100, 101, 200],
    mayTarget: [500],
    wantAll: [100, 101, 102, 103, 200, 210, 211, 220, 230, 231],
    never: [1, 50, 77, 300, 400, 401, 600, 602, 999]
  };
}
const sorted = (xs) => [...new Set(xs)].sort((a, b) => a - b);
const same = (a, b) => JSON.stringify(sorted(a)) === JSON.stringify(sorted(b));

async function e6Behaviour(t) {
  const { mod, why } = await loadTree(t);
  if (mod === null) return [why];
  const out = [];
  const w = plantedWorld();
  let roots;
  try {
    roots = mod.parsePaneRoots(w.paneStdout);
  } catch (err) {
    return [`parsePaneRoots threw: ${String(err?.message ?? err)}`];
  }
  const rootPids = (roots ?? []).map((r) => r.pid);
  if (!same(rootPids, w.wantRoots)) out.push(`parsePaneRoots kept ${JSON.stringify(sorted(rootPids))}, want ${JSON.stringify(w.wantRoots)} (a dead pane is dropped)`);
  let tree;
  try {
    tree = mod.readSessionTree(w.table, roots, 77);
  } catch (err) {
    return [...out, `readSessionTree threw: ${String(err?.message ?? err)}`];
  }
  const targets = (tree?.targets ?? []).map((e) => e.pid);
  const all = (tree?.all ?? []).map((e) => e.pid);
  const wider = sorted(targets).filter((p) => !w.wantTargets.includes(p) && !w.mayTarget.includes(p));
  if (wider.length > 0) {
    out.push(
      `the selection is WIDER than the pane process's own group: ${JSON.stringify(wider)} ` +
        '(a setsid child, a background job, Codex’s shared server shape, an app bundle executable, the terminal’s foreground job in a restored row, or a root that is not the server’s child or not its own group’s leader) — widening is his to rule on'
    );
  }
  const narrower = w.wantTargets.filter((p) => !targets.includes(p));
  if (narrower.length > 0) out.push(`the selection misses ${JSON.stringify(narrower)}, which the hang-up was aimed at`);
  const strays = sorted(all).filter((p) => w.never.includes(p));
  if (strays.length > 0) out.push(`the tree includes ${JSON.stringify(strays)}: pid 1, the server, this process, or a root that is not the server’s child`);
  const lost = w.wantAll.filter((p) => !all.includes(p));
  if (lost.length > 0) out.push(`the tree's \`all\` misses ${JSON.stringify(lost)}`);
  return out;
}

async function e5Behaviour(t) {
  const { mod, why } = await loadTree(t);
  if (mod === null) return [why];
  const entry = { pid: 100, pgid: 100, lstart: LSTART, command: 'node /opt/gemini/bin/gemini' };
  const base = row(100, 50, 100, 100, 'node /opt/gemini/bin/gemini');
  const cases = [
    ['the same process', base, true],
    ['a reused pid (a different start time)', { ...base, lstart: 'Tue Sep 29 17:41:37 2026' }, false],
    ['a process that exec’d another program', { ...base, command: 'sleep 600' }, false],
    ['a process that exec’d the same program with other arguments', { ...base, command: 'node /opt/gemini/bin/gemini --resume' }, false],
    ['a process that left its group', { ...base, pgid: 101 }, false],
    ['a process that has exited', null, false]
  ];
  const out = [];
  for (const [name, r, kept] of cases) {
    const table = new Map(r === null ? [] : [[100, r]]);
    let got;
    try {
      got = mod.stillTheSame([entry], table);
    } catch (err) {
      out.push(`stillTheSame threw on ${name}: ${String(err?.message ?? err)}`);
      continue;
    }
    const isKept = Array.isArray(got) && got.some((e) => e.pid === 100);
    if (isKept !== kept) out.push(`stillTheSame ${isKept ? 'keeps' : 'drops'} ${name}`);
  }
  return out;
}

async function e5(t) {
  return [...e5Static(t), ...(await e5Behaviour(t))];
}

function e6Static(t) {
  const out = [];
  const sf = parse(TREE, t.tree ?? '');
  const fn = one(functionsNamed(sf, 'readSessionTree'));
  if (fn === null) return ['readSessionTree is not one function of session-tree.ts'];
  const reach = reachedDeclarations(sf, fn);
  const text = reach.map((n) => stripComments(n.getText())).join('\n');
  const compares = (a, b) =>
    reach.some((d) =>
      nodesOf(d).some((n) => {
        if (!ts.isBinaryExpression(n)) return false;
        const k = n.operatorToken.kind;
        if (k !== ts.SyntaxKind.EqualsEqualsEqualsToken && k !== ts.SyntaxKind.EqualsEqualsToken) return false;
        const l = norm(n.left.getText());
        const r = norm(n.right.getText());
        const has = (s, w) => new RegExp(`(^|\\.)${w}$`).test(s) || s === w;
        return (has(l, a) && has(r, b)) || (has(l, b) && has(r, a));
      })
    );
  // The groups may be compared directly or collected into a set the entry's
  // group is looked up in; either way both of the root's groups are read and
  // the entry's group is what is asked. The planted world below pins what the
  // selection RETURNS, which is the part a text rule cannot.
  const props = new Set(reach.flatMap((d) => nodesOf(d).filter((n) => ts.isPropertyAccessExpression(n)).map((n) => n.name.text)));
  const pgidAsked = compares('pgid', 'pgid');
  if (!props.has('pgid') || !pgidAsked) out.push('readSessionTree never asks an entry’s pgid against the root’s own group');
  // THE SECOND FIX ROUND (attack d2): the terminal's foreground group is not
  // selected. In a restored row it is whatever a person ran in front of the
  // shell, and every agent the census launched that way ends on the hang-up.
  if (props.has('tpgid')) out.push('readSessionTree reads a terminal’s foreground group (tpgid): a person’s foreground job in a restored row is his (attack d2), and widening is his ruling');
  if (!compares('ppid', 'serverPid')) out.push('readSessionTree never requires a root’s ppid to be the server that answered');
  if (!compares('pgid', 'pid')) out.push('readSessionTree never requires a root to lead its own group, which the pane check reads a target’s group as');
  if (!text.includes('.app/Contents/MacOS/')) out.push('readSessionTree never excludes an `.app/Contents/MacOS/` executable');
  const format = one(nodesOf(sf).filter((n) => ts.isVariableDeclaration(n) && n.name.getText() === 'PANE_ROOT_FORMAT'));
  if (format === null || !(format.initializer?.getText() ?? '').includes('#{pane_dead}')) out.push('PANE_ROOT_FORMAT does not ask for #{pane_dead}');
  if (format !== null && !(format.initializer?.getText() ?? '').includes('#{pid}')) out.push('PANE_ROOT_FORMAT does not ask for the server’s own #{pid}');
  return out;
}

async function e6(t) {
  return [...e6Static(t), ...(await e6Behaviour(t))];
}

// ---------------------------------------------------------------------------
// E7 — the importers
// ---------------------------------------------------------------------------

function importsTree(rel, text) {
  const sf = parse(rel, text);
  const specs = [];
  for (const n of nodesOf(sf)) {
    if ((ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) && n.moduleSpecifier !== undefined && ts.isStringLiteralLike(n.moduleSpecifier)) {
      if (!(ts.isImportDeclaration(n) && n.importClause?.isTypeOnly === true)) specs.push(n.moduleSpecifier.text);
    }
    if (ts.isCallExpression(n) && (n.expression.kind === ts.SyntaxKind.ImportKeyword || calleeName(n) === 'require') && n.arguments[0] !== undefined && ts.isStringLiteralLike(n.arguments[0])) {
      specs.push(n.arguments[0].text);
    }
  }
  return specs.some((s) => {
    if (s.startsWith('.')) {
      const p = posix.normalize(posix.join(posix.dirname(rel), s)).replace(/\.(ts|js|mjs)$/, '');
      return p === TREE.replace(/\.ts$/, '');
    }
    return /(^|\/)proc\/session-tree(\.ts|\.js)?$/.test(s);
  });
}
function e7(t) {
  const out = [];
  const candidates = [
    { rel: CORE, text: t.core ?? '' },
    { rel: CLI, text: t.cli ?? '' },
    { rel: SCRATCH, text: t.scratch ?? '' },
    ...t.others
  ];
  const found = sorted([]);
  const importers = candidates.filter((f) => importsTree(f.rel, f.text)).map((f) => f.rel);
  for (const rel of importers) if (!IMPORTERS.includes(rel)) out.push(`${rel} imports the module; SPEC §4.6 names only ${IMPORTERS.join(', ')}`);
  for (const rel of IMPORTERS) if (!importers.includes(rel)) out.push(`${rel} does not import the module`);
  void found;
  return out;
}

// ---------------------------------------------------------------------------
// E8 — nothing Tortie does on its own reaches it
// ---------------------------------------------------------------------------

function e8(t) {
  const out = [];
  const sf = parse(CORE, t.core ?? '');
  const treeSf = parse(TREE, t.tree ?? '');
  const forbidden = new Set([...exportedNames(treeSf), ...METHODS, 'killSessionAdmitted', 'killSession']);
  const methods = new Map();
  for (const n of nodesOf(sf)) {
    if (ts.isMethodDeclaration(n) && n.body !== undefined && ts.isIdentifier(n.name)) {
      const list = methods.get(n.name.text) ?? [];
      list.push(n);
      methods.set(n.name.text, list);
    }
  }
  const roots = [];
  for (const [name, list] of methods) {
    if (name === 'reapDeadSession' || name === 'refresh' || name === 'dispose' || /reconcile/i.test(name) || /^boot/i.test(name)) {
      for (const m of list) roots.push([`${name}`, m.body]);
    }
  }
  for (const f of functionsNamed(sf, 'shutdownGmuxCore')) roots.push(['shutdownGmuxCore', f.body ?? f]);
  for (const c of nodesOf(sf).filter((n) => ts.isCallExpression(n) && ['setTimeout', 'setInterval'].includes(calleeName(n) ?? ''))) {
    if (c.arguments[0] !== undefined) roots.push([`a ${calleeName(c)} callback at line ${String(sf.getLineAndCharacterOfPosition(c.getStart()).line + 1)}`, c.arguments[0]]);
  }
  for (const want of ['reapDeadSession', 'refresh', 'dispose', 'shutdownGmuxCore']) {
    if (!roots.some(([n]) => n === want)) out.push(`${want} was not found in core.ts, so it was not asked`);
  }
  // Follow `this.m(` and `core.m(` through the class, from each root.
  for (const [label, start] of roots) {
    const seen = new Set();
    const queue = [[start, label]];
    while (queue.length > 0) {
      const [node, path] = queue.pop();
      for (const n of nodesOf(node)) {
        if (ts.isIdentifier(n) && forbidden.has(n.text) && !(ts.isPropertyAccessExpression(n.parent) && n.parent.name === n && norm(n.parent.expression.getText()) === 'tmux')) {
          out.push(`${path} reaches ${n.text}`);
        }
        if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression)) {
          const recv = norm(n.expression.expression.getText());
          const name = n.expression.name.text;
          if ((recv === 'this' || recv === 'core') && methods.has(name) && !seen.has(name)) {
            seen.add(name);
            for (const m of methods.get(name)) queue.push([m.body, `${path} → ${name}`]);
          }
        }
      }
    }
  }
  const everywhere = callsNamed(sf, 'endAfterHangup');
  if (everywhere.length !== 1) out.push(`endAfterHangup( is called ${String(everywhere.length)} times in core.ts, not once`);
  const endM = one(methodsNamed(sf, 'killSessionAdmitted'));
  if (everywhere.length === 1 && endM !== null && !within(everywhere[0], endM.body)) out.push('the one endAfterHangup( is not in killSessionAdmitted');
  return [...new Set(out)];
}

// ---------------------------------------------------------------------------
// E9 — the waits fit
// ---------------------------------------------------------------------------

async function e9(t) {
  const out = [];
  const sf = parse(TREE, t.tree ?? '');
  const H = constantValue(sf, 'HANGUP_GRACE_MS');
  const T = constantValue(sf, 'TERM_GRACE_MS');
  const R = constantValue(sf, 'TREE_READ_TIMEOUT_MS');
  const P = constantValue(sf, 'POLL_MS');
  const RETRY = constantValue(sf, 'READ_RETRY_MS');
  const Q = constantValue(sf, 'QUICK_POLLS_MS');
  for (const [n, v] of [['HANGUP_GRACE_MS', H], ['TERM_GRACE_MS', T], ['TREE_READ_TIMEOUT_MS', R], ['POLL_MS', P], ['READ_RETRY_MS', RETRY], ['QUICK_POLLS_MS', Q]]) {
    if (v === null) out.push(`${n} is not a numeric constant`);
  }
  if (out.length > 0) return out;
  if (H < 2 * PLANTED_SLOW_EXIT_MS) {
    out.push(`HANGUP_GRACE_MS is ${String(H)}, under twice the 5 s orderly exit the verifier planted (S9): a process that ends itself on the hang-up would be cut by SIGTERM, which today it is not`);
  }
  if (H + T < AGENT_OWN_FAILSAFE_MAX_MS + 5_000) {
    out.push(`HANGUP_GRACE_MS + TERM_GRACE_MS is ${String(H + T)}, under Claude Code's own shutdown failsafe (${String(AGENT_OWN_FAILSAFE_MAX_MS)} ms) plus 5 s: its own orderly exit, which ignores SIGTERM, would be cut by SIGKILL`);
  }
  if (Q < SLOWEST_ORDERLY_EXIT_MS || Q >= H) {
    out.push(`QUICK_POLLS_MS is ${String(Q)}, not between the census's slowest orderly exit (${String(SLOWEST_ORDERLY_EXIT_MS)} ms) and the first wait: an ordinary exit would not be seen, or the quick re-reads never end`);
  }
  if (RETRY < LONGEST_STALL_MS) {
    out.push(`READ_RETRY_MS is ${String(RETRY)}, under the longest stall measured on his Mac (${String(LONGEST_STALL_MS)} ms): a stall that long would end the ending and leave its targets running`);
  }
  if (P <= 0 || P >= H) out.push(`POLL_MS is ${String(P)}, not inside the first wait`);
  // The TRUE worst case: each grace, overrun by its whole retry window, one
  // poll, and the two reads a signal waits for (the pane check and the
  // re-read), each finishing just inside its bound (the unit row "ends by
  // ENDING_WORST_MS" drives it). The closing check waits this long.
  const worst = H + T + 2 * (RETRY + P + 2 * R);
  const { mod, why } = await loadTree(t);
  if (mod === null) return [...out, why];
  if (worst > ENDING_CEILING_MS) {
    out.push(`the ending can run ${String(worst)} ms, over ${String(ENDING_CEILING_MS)}: a closing check that waits for it would wait that long for one End`);
  }
  if (mod.ENDING_WORST_MS !== worst) {
    out.push(
      `ENDING_WORST_MS is ${String(mod.ENDING_WORST_MS)}, not HANGUP_GRACE_MS + TERM_GRACE_MS + 2 × (READ_RETRY_MS + POLL_MS + 2 × TREE_READ_TIMEOUT_MS) = ${String(worst)} ms: ` +
        'the closing check would stop waiting before the last signal'
    );
  }
  const scratch = parse(SCRATCH, t.scratch ?? '');
  const lb = one(functionsNamed(scratch, 'leftBehind'));
  if (lb === null) out.push('scratch.ts has no one leftBehind');
  else if (!identifiersIn(lb.body).includes('ENDING_WORST_MS')) {
    out.push('the closing check (leftBehind) does not wait ENDING_WORST_MS for the product’s Ends, which a quit no longer waits for');
  }
  return out;
}

// ---------------------------------------------------------------------------
// E10 — the ledger
// ---------------------------------------------------------------------------

/** Names that would hand the ending to something a quit waits on. */
const QUIT_WAITS_ON = ['ledger', 'admit', 'follow', 'track', 'inFlight', 'pending'];
function e10(t) {
  const out = [];
  const sf = parse(CORE, t.core ?? '');
  const m = one(methodsNamed(sf, 'endAfterHangup'));
  if (m === null) return ['endAfterHangup is not one method of core.ts'];
  const ids = identifiersIn(m.body);
  for (const w of QUIT_WAITS_ON) {
    if (ids.includes(w)) out.push(`endAfterHangup names ${w}, so a quit would wait out the graces (the fix round measured 4.8 to 6.6 s, against no wait today)`);
  }
  if (nodesOf(m.body).some((n) => ts.isReturnStatement(n) && n.expression !== undefined)) out.push('endAfterHangup returns its work, so a caller could wait for it');
  if (m.type === undefined || m.type.getText() !== 'void') out.push('endAfterHangup is not declared `void`');
  for (const n of nodesOf(m.body)) {
    if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.EqualsToken && norm(n.left.getText()).startsWith('this.')) {
      out.push(`endAfterHangup keeps its work on this: ${norm(n.getText()).slice(0, 60)}`);
    }
    if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && ['add', 'push', 'set', 'join'].includes(n.expression.name.text) && norm(n.expression.expression.getText()).startsWith('this.')) {
      out.push(`endAfterHangup hands its work to a collection on this: ${norm(n.getText()).slice(0, 60)}`);
    }
  }
  // The ledger is the parent's: nothing added for the ending, a join that
  // waits once.
  const lsf = parse(LEDGER, t.ledger ?? '');
  if (methodsNamed(lsf, 'follow').length > 0) out.push('the ledger has a `follow` again, the verb that made a quit wait for an ending');
  const join = one(methodsNamed(lsf, 'join'));
  if (join === null) out.push('the ledger has no one `join` method');
  else if (nodesOf(join.body).some((n) => ts.isWhileStatement(n) || ts.isDoStatement(n) || ts.isForStatement(n))) {
    out.push('the ledger’s join loops, so work added while a quit waits would hold the quit');
  }
  return out;
}

// ---------------------------------------------------------------------------
// E11 — the harness backstop
// ---------------------------------------------------------------------------

/**
 * The local functions of harness-socket.mjs that run the ONE runner
 * (`session-tree-cli.mts`), with the mode each one hard-codes, if any.
 */
function runners(sf) {
  const decls = new Map();
  for (const n of nodesOf(sf)) {
    if (ts.isFunctionDeclaration(n) && n.name !== undefined && n.body !== undefined) decls.set(n.name.text, n);
    if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer !== undefined && (ts.isArrowFunction(n.initializer) || ts.isFunctionExpression(n.initializer))) {
      decls.set(n.name.text, n.initializer);
    }
  }
  const reachesCli = new Map();
  const reaches = (name, seen = new Set()) => {
    if (reachesCli.has(name)) return reachesCli.get(name);
    if (seen.has(name)) return false;
    seen.add(name);
    const d = decls.get(name);
    if (d === undefined) return false;
    const text = d.getText();
    let r = text.includes('session-tree-cli');
    if (!r) for (const c of nodesOf(d).filter((x) => ts.isCallExpression(x) && ts.isIdentifier(x.expression))) if (reaches(c.expression.text, seen)) r = true;
    reachesCli.set(name, r);
    return r;
  };
  for (const name of decls.keys()) reaches(name);
  return { decls, isRunner: (name) => reachesCli.get(name) === true };
}
const literalsIn = (node) => nodesOf(node).filter((n) => ts.isStringLiteralLike(n)).map((n) => n.text);
/** The events a function body produces, in source order, with local calls expanded. */
function eventsOf(node, r, depth = 0, stack = new Set()) {
  const out = [];
  if (depth > 5) return out;
  const visit = (n) => {
    if (ts.isCallExpression(n)) {
      const name = ts.isIdentifier(n.expression) ? n.expression.text : null;
      const lits = literalsIn(n);
      if (lits.includes('kill-server')) {
        out.push('kill');
        return;
      }
      const direct = n.getText().includes('session-tree-cli');
      if (direct || (name !== null && r.isRunner(name))) {
        let mode = lits.includes('read') ? 'read' : lits.includes('end') ? 'end' : null;
        if (mode === null && name !== null) {
          const own = literalsIn(r.decls.get(name) ?? n);
          const hasRead = own.includes('read');
          const hasEnd = own.includes('end');
          mode = hasRead && !hasEnd ? 'read' : hasEnd && !hasRead ? 'end' : null;
        }
        if (mode !== null) {
          out.push(mode);
          return;
        }
      }
      if (name !== null && r.decls.has(name) && !stack.has(name) && !r.isRunner(name)) {
        const d = r.decls.get(name);
        if (literalsIn(d).includes('kill-server') || r.isRunner(name) || nodesOf(d).some((x) => ts.isCallExpression(x) && ts.isIdentifier(x.expression) && r.isRunner(x.expression.text))) {
          ts.forEachChild(n, visit);
          stack.add(name);
          out.push(...eventsOf(d.body ?? d, r, depth + 1, stack));
          stack.delete(name);
          return;
        }
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(node);
  return out;
}
async function e11(t) {
  const out = [];
  const sf = parse(HARNESS, t.harness ?? '');
  const r = runners(sf);
  // THE SECOND FIX ROUND. The runner's `end` is given longer than the longest
  // an ending can run (its graces are 10 s and 60 s now), or a teardown's
  // spawnSync would cut the runner mid-ending, and it is handed the socket so
  // its pane check asks THAT server.
  const bound = constantValue(sf, 'END_RUNNER_TIMEOUT_MS');
  const { mod, why } = await loadTree(t);
  if (mod === null) out.push(why);
  else if (bound === null || !(bound > mod.ENDING_WORST_MS)) {
    out.push(`the runner's end is bounded at ${String(bound)} ms, not above ENDING_WORST_MS (${String(mod.ENDING_WORST_MS)} ms), so a teardown would cut an ending short`);
  }
  const runnerFn = one(functionsNamed(sf, 'sessionTreeCli'));
  if (runnerFn === null || !identifiersIn(runnerFn.body).includes('END_RUNNER_TIMEOUT_MS')) out.push('sessionTreeCli does not bound the end runner by END_RUNNER_TIMEOUT_MS');
  for (const c of nodesOf(sf).filter((n) => ts.isCallExpression(n) && calleeName(n) === 'sessionTreeCli')) {
    const [mode, args] = c.arguments;
    if (mode === undefined || !ts.isStringLiteralLike(mode) || mode.text !== 'end') continue;
    if (args === undefined || !ts.isArrayLiteralExpression(args) || args.elements.length !== 1) {
      out.push(`the runner's end is not handed the socket, so its pane check asks no server: ${norm(c.getText()).slice(0, 70)}`);
    }
  }
  for (const fnName of ['teardown', 'reapDeadRuns']) {
    const fn = one(functionsNamed(sf, fnName));
    if (fn === null) {
      out.push(`harness-socket.mjs has no one ${fnName}`);
      continue;
    }
    const ev = eventsOf(fn.body, r);
    const kills = ev.map((e, i) => [e, i]).filter(([e]) => e === 'kill');
    if (kills.length === 0) out.push(`${fnName} sends no kill-server`);
    for (const [, i] of kills) {
      if (!ev.slice(0, i).includes('read')) out.push(`${fnName}: the runner's read does not precede kill-server`);
      if (!ev.slice(i + 1).includes('end')) out.push(`${fnName}: the runner's end does not follow kill-server`);
    }
  }
  // Nothing but the liveness probe and the child's own forwarding signals anything.
  for (const c of nodesOf(sf).filter((n) => ts.isCallExpression(n) && calleeName(n) === 'kill')) {
    const recv = ts.isPropertyAccessExpression(c.expression) ? norm(c.expression.expression.getText()) : '';
    const probe = recv === 'process' && c.arguments.length === 2 && c.arguments[1].getText() === '0';
    const forward = recv === 'child' && c.arguments.length === 1 && ts.isIdentifier(c.arguments[0]);
    if (!probe && !forward) out.push(`harness-socket.mjs signals a process: ${norm(c.getText()).slice(0, 60)}`);
  }
  if (/\bpkill\b|\bkillall\b|\bpgrep\b/.test(stripComments(t.harness ?? ''))) out.push('harness-socket.mjs names pkill, killall or pgrep');
  // THE FIX ROUND. `holdsAPane` is what decides whether the backstop runs at
  // all, and the verifier's arm that made it always answer no stayed green in
  // every battery. It is asked here with a stand-in `spawnSync`: nothing runs.
  out.push(...holdsAPaneAnswers(sf));
  const cli = parse(CLI, t.cli ?? '');
  for (const c of nodesOf(cli).filter((n) => ts.isCallExpression(n) && calleeName(n) === 'kill')) {
    out.push(`session-tree-cli.mts calls ${norm(c.getText()).slice(0, 60)}; it signals nothing itself`);
  }
  if (stripComments(t.cli ?? '').includes('process.kill')) out.push('session-tree-cli.mts names process.kill');
  return out;
}

/** Drive harness-socket's `holdsAPane` over a stand-in `spawnSync`; its problems. */
function holdsAPaneAnswers(sf) {
  const fn = one(functionsNamed(sf, 'holdsAPane'));
  if (fn === null) return ['harness-socket.mjs has no one holdsAPane'];
  const decl = ts.isFunctionDeclaration(fn) ? fn.getText() : `const holdsAPane = ${fn.getText()};`;
  let holds;
  const asked = [];
  let answer = { status: 0, stdout: '' };
  try {
    // eslint-disable-next-line no-new-func
    holds = new Function('spawnSync', `${decl}\nreturn holdsAPane;`)((bin, args) => {
      asked.push([bin, ...args]);
      return answer;
    });
  } catch (err) {
    return [`holdsAPane could not be built: ${String(err?.message ?? err)}`];
  }
  const out = [];
  const cases = [
    ['a server with a live pane', { status: 0, stdout: '%3\n%7\n' }, true],
    ['a server with no pane', { status: 0, stdout: '' }, false],
    ['no server at all', { status: 1, stdout: '', stderr: 'no server running' }, false]
  ];
  for (const [name, a, want] of cases) {
    answer = a;
    asked.length = 0;
    let got;
    try {
      got = holds('gmux-selftest');
    } catch (err) {
      out.push(`holdsAPane threw on ${name}: ${String(err?.message ?? err)}`);
      continue;
    }
    if (got !== want) out.push(`holdsAPane answers ${String(got)} for ${name}, so the backstop ${want ? 'never runs where it must' : 'runs where there is nothing'}`);
    const argv = asked[0] ?? [];
    if (want && !(argv[0] === 'tmux' && argv.includes('-L') && argv.includes('gmux-selftest') && argv.includes('list-panes'))) {
      out.push(`holdsAPane does not ask tmux -L <socket> list-panes: ${JSON.stringify(argv)}`);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// E12 — the C locale and -ww
// ---------------------------------------------------------------------------

function e12(t) {
  const out = [];
  const sf = parse(TREE, t.tree ?? '');
  const ps = nodesOf(sf).filter((n) => ts.isCallExpression(n) && n.arguments[0] !== undefined && ts.isStringLiteralLike(n.arguments[0]) && /(^|\/)ps$/.test(n.arguments[0].text));
  if (ps.length === 0) out.push('session-tree.ts runs no ps, so E12 found nothing to ask');
  for (const c of ps) {
    const reach = c.arguments.slice(1).flatMap((a) => reachedDeclarations(sf, a));
    const locale = reach.some((d) =>
      nodesOf(d).some((n) => ts.isPropertyAssignment(n) && n.name.getText().replace(/['"]/g, '') === 'LC_ALL' && ts.isStringLiteralLike(n.initializer) && n.initializer.text === 'C')
    );
    if (!locale) out.push(`a ps runs without LC_ALL: 'C': ${norm(c.getText()).slice(0, 70)}`);
  }
  const args = one(nodesOf(sf).filter((n) => ts.isVariableDeclaration(n) && n.name.getText() === 'TREE_PS_ARGS'));
  if (args === null || !literalsIn(args).includes('-ww')) out.push('TREE_PS_ARGS does not hold -ww');
  const ident = one(functionsNamed(sf, 'identityPsArgs'));
  if (ident === null || !reachedDeclarations(sf, ident).some((d) => literalsIn(d).includes('-ww'))) out.push('identityPsArgs does not hold -ww');
  if (ident !== null && ident.parameters.length !== 1) out.push('identityPsArgs does not take exactly one pid');
  const term = one(functionsNamed(sf, 'terminalPsArgs'));
  if (term === null || !reachedDeclarations(sf, term).some((d) => literalsIn(d).includes('-ww')) || !literalsIn(term).includes('-t')) {
    out.push('terminalPsArgs does not read one terminal (`-t`) with -ww');
  }
  // THE FIX ROUND. Every `-p` in the module names ONE pid, `String(<pid>)`:
  // `ps -p a,b` costs about 200 ms of system time where one pid costs 2, and
  // such calls run one at a time, so a batch End's re-reads ran out of time
  // and ended nothing.
  for (const arr of nodesOf(sf).filter((n) => ts.isArrayLiteralExpression(n))) {
    const i = arr.elements.findIndex((e) => ts.isStringLiteralLike(e) && e.text === '-p');
    if (i < 0) continue;
    const v = arr.elements[i + 1];
    const one1 = v !== undefined && ts.isCallExpression(v) && ts.isIdentifier(v.expression) && v.expression.text === 'String' && v.arguments.length === 1 && ts.isIdentifier(v.arguments[0]);
    if (!one1) out.push(`a ps -p names more than one pid: ${norm(arr.getText()).slice(0, 70)}`);
  }
  // End's own read is the pane terminals', never the whole table.
  const core = parse(CORE, t.core ?? '');
  const ret = one(methodsNamed(core, 'readEndTree'));
  if (ret === null) out.push('readEndTree is not one method of core.ts');
  else {
    const names = identifiersIn(ret.body);
    if (!names.includes('readTerminals')) out.push('readEndTree does not read the panes’ terminals');
    if (names.includes('readTable')) out.push('readEndTree reads the whole table, about 60 ms the hang-up would wait for');
    // THE SECOND FIX ROUND (the verifier's X7): the pane read carries the
    // module's read bound. Without it the tmux layer's own 10 s default holds
    // the End's hang-up, and every rule and row stayed green.
    const paneRead = nodesOf(ret.body).find(
      (n) => ts.isCallExpression(n) && norm(n.expression.getText()) === 'tmux.execTmux' && n.arguments[0] !== undefined && ts.isCallExpression(n.arguments[0]) && calleeName(n.arguments[0]) === 'sessionPanesArgv'
    );
    const opts = paneRead?.arguments[1];
    const bounded =
      opts !== undefined &&
      ts.isObjectLiteralExpression(opts) &&
      opts.properties.some((p) => ts.isPropertyAssignment(p) && p.name.getText() === 'timeoutMs' && norm(p.initializer.getText()) === 'TREE_READ_TIMEOUT_MS');
    if (paneRead === undefined) out.push('readEndTree does not read the panes through tmux.execTmux(sessionPanesArgv(…))');
    else if (!bounded) out.push('readEndTree’s pane read is not bounded by TREE_READ_TIMEOUT_MS, so a stuck tmux holds the End for the tmux layer’s 10 s default');
  }
  // The pane format holds no tab (a client whose locale is not UTF-8 is sent
  // one as `_`) and names the pane's terminal.
  const fmt = one(nodesOf(sf).filter((n) => ts.isVariableDeclaration(n) && n.name.getText() === 'PANE_ROOT_FORMAT'));
  const fmtText = fmt !== null && fmt.initializer !== undefined && ts.isStringLiteralLike(fmt.initializer) ? fmt.initializer.text : null;
  if (fmtText === null) out.push('PANE_ROOT_FORMAT is not one string');
  else {
    if (fmtText.includes('\t')) out.push('PANE_ROOT_FORMAT holds a tab, which tmux sends a C-locale client as `_`, so no pane would be read');
    if (!fmtText.includes('#{pane_tty}')) out.push('PANE_ROOT_FORMAT does not name #{pane_tty}');
  }
  // The integration round's clause, the other locale hazard. PANE_ROOT_FORMAT
  // is tab separated, and tmux (3.6a and the vendored 3.7b, measured
  // 2026-09-29) sends a client whose locale is not UTF-8 every tab as `_`, so
  // the harness runner under `LC_ALL=C` read no pane at all and ended nothing,
  // silently. Every tmux the runner starts carries `-u` in its argv.
  const cli = parse(CLI, t.cli ?? '');
  const tmuxCalls = nodesOf(cli).filter(
    (n) => ts.isCallExpression(n) && n.arguments[0] !== undefined && ts.isStringLiteralLike(n.arguments[0]) && /(^|\/)tmux$/.test(n.arguments[0].text)
  );
  if (tmuxCalls.length === 0) out.push('session-tree-cli.mts starts no tmux, so the -u clause found nothing to ask');
  for (const c of tmuxCalls) {
    const argv = c.arguments[1];
    if (argv === undefined || !ts.isArrayLiteralExpression(argv) || !argv.elements.some((e) => ts.isStringLiteralLike(e) && e.text === '-u')) {
      out.push(`the runner's tmux runs without -u, so a C-locale run reads every tab as _ and finds no pane: ${norm(c.getText()).slice(0, 70)}`);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// E13 — nothing on the remote branch
// ---------------------------------------------------------------------------

function e13(t) {
  const { m } = endBody(t);
  if (m === null) return ['killSessionAdmitted is not one method of core.ts'];
  const branch = nodesOf(m.body).find((n) => ts.isIfStatement(n) && norm(n.expression.getText()) === 'isRemoteSessionId(sessionId)');
  if (branch === undefined) return ['the `isRemoteSessionId(sessionId)` branch was not found'];
  const forbidden = new Set([...exportedNames(parse(TREE, t.tree ?? '')), ...METHODS]);
  return identifiersIn(branch.thenStatement)
    .filter((n) => forbidden.has(n))
    .map((n) => `the remote branch names ${n}`);
}

// ---------------------------------------------------------------------------
// E14 — a failed re-read is asked again, and never read as the end
// ---------------------------------------------------------------------------

/**
 * A fake world for the loaded module: one target that ignores every signal
 * but SIGKILL, a clock that moves only when the ending sleeps, a server that
 * shows no pane, and a `ps` that fails on the re-reads `fails` names:
 * `fails(n, t, termSent)`, the re-read's 1-based number, the clock, and
 * whether SIGTERM has been sent.
 */
function fakeEnding(fails) {
  let t = 0;
  let n = 0;
  let lastAnswered = null;
  const kills = [];
  let gone = false;
  const row = { pid: 812, ppid: 50, pgid: 812, tpgid: 812, stat: 'Ss+', lstart: LSTART, command: 'node gemini' };
  const deps = {
    readTable: () => Promise.reject(new Error('not asked')),
    readTerminals: () => Promise.reject(new Error('not asked')),
    livePanes: () => Promise.resolve(new Set()),
    reread: (pids) => {
      n += 1;
      if (fails(n, t, kills.length > 0)) {
        lastAnswered = false;
        return Promise.resolve(null);
      }
      lastAnswered = true;
      return Promise.resolve(new Map(gone || !pids.includes(812) ? [] : [[812, row]]));
    },
    kill: (pid, signal) => {
      kills.push({ pid, signal, at: t, afterAnswer: lastAnswered === true });
      if (signal === 'SIGKILL') gone = true;
    },
    sleep: (ms) => {
      t += ms;
      return Promise.resolve();
    },
    now: () => t
  };
  const entry = { pid: 812, pgid: 812, lstart: LSTART, command: 'node gemini' };
  return { deps, kills, clock: () => t, tree: { all: [entry], targets: [entry] } };
}

async function e14(t) {
  const { mod, why } = await loadTree(t);
  if (mod === null) return [why];
  const out = [];
  const H = mod.HANGUP_GRACE_MS;
  const RETRY = mod.READ_RETRY_MS;
  const P = mod.POLL_MS;
  const cases = [
    ['the first three re-reads fail', () => (n) => n <= 3],
    ['the re-read at the end of the grace fails, and the next', () => (_n, at, termSent) => !termSent && at >= H && at <= H + P],
    ['a re-read after SIGTERM fails', () => {
      let once = false;
      return (_n, _at, termSent) => {
        if (!termSent || once) return false;
        once = true;
        return true;
      };
    }]
  ];
  for (const [name, make] of cases) {
    const fails = make();
    const w = fakeEnding(fails);
    let report;
    try {
      report = await mod.endHangupSurvivors(w.tree, w.deps);
    } catch (err) {
      out.push(`endHangupSurvivors threw when ${name}: ${String(err?.message ?? err)}`);
      continue;
    }
    const signals = w.kills.map((k) => k.signal).join(',');
    if (signals !== 'SIGTERM,SIGKILL') out.push(`when ${name}, it signalled [${signals}], not SIGTERM then SIGKILL: a failed re-read ended the ending`);
    if (w.kills.some((k) => !k.afterAnswer)) out.push(`when ${name}, a signal followed a re-read that did not answer`);
    if (report?.readFailed !== false) out.push(`when ${name}, it reported readFailed`);
  }
  const never = fakeEnding(() => true);
  const report = await mod.endHangupSurvivors(never.tree, never.deps).catch(() => null);
  if (never.kills.length > 0) out.push('it signalled with no re-read ever answering');
  if (report?.readFailed !== true) out.push('it did not report readFailed when no re-read ever answered');
  if (never.clock() < H + RETRY) out.push(`it gave up at ${String(never.clock())} ms, before the grace and its retry window (${String(H + RETRY)} ms)`);
  if (never.clock() >= H + RETRY + P) out.push(`it was still asking at ${String(never.clock())} ms, past the grace and its retry window`);
  return out;
}

// ---------------------------------------------------------------------------
// E15 — the pane check (the second fix round, the verifier's S10)
// ---------------------------------------------------------------------------

/** The argument of each `defaultEndDeps(` call in one file. */
function depsArgs(rel, text) {
  const sf = parse(rel, text ?? '');
  return { sf, calls: nodesOf(sf).filter((n) => ts.isCallExpression(n) && calleeName(n) === 'defaultEndDeps') };
}
/** Whether `node` is `livePanesVia(<ask naming execTmux with the read bound>, <a no-server verdict>)`. */
function boundedServerCheck(node) {
  if (node === undefined || !ts.isCallExpression(node) || calleeName(node) !== 'livePanesVia') return false;
  const [ask, gone] = node.arguments;
  if (ask === undefined || gone === undefined) return false;
  const askText = norm(ask.getText());
  const goneText = norm(gone.getText());
  return (
    askText.includes('tmux.execTmux(argv') &&
    /timeoutMs:\s*TREE_READ_TIMEOUT_MS/.test(askText) &&
    goneText.includes('tmux.serverProbeVerdict(err)') &&
    goneText.includes("=== 'no-server'")
  );
}
function e15Static(t) {
  const out = [];
  const sf = parse(TREE, t.tree ?? '');
  const fn = one(functionsNamed(sf, 'endHangupSurvivors'));
  if (fn === null) return ['endHangupSurvivors is not one function of session-tree.ts'];
  // Every narrowing of the signalled list passes the re-read through
  // hungUpOnly( with the panes the pane check answered.
  const signalled = new Set(killCalls(sf).rest.filter((c) => within(c, fn.body)).map((c) => killLoopOf(c, fn.body).name).filter((x) => x !== undefined));
  if (signalled.size === 0) out.push('endHangupSurvivors signals nothing E15 could follow');
  for (const name of signalled) {
    const narrowings = nodesOf(fn.body).filter((n) => ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.EqualsToken && ts.isIdentifier(n.left) && n.left.text === name);
    if (narrowings.length < 2) out.push(`${name} is narrowed ${String(narrowings.length)} time(s), not once before each signal`);
    for (const n of narrowings) {
      const table = ts.isCallExpression(n.right) ? n.right.arguments[1] : undefined;
      const passes = table !== undefined && ts.isCallExpression(table) && calleeName(table) === 'hungUpOnly' && table.arguments[1]?.getText() === name && table.arguments[2] !== undefined && ts.isIdentifier(table.arguments[2]);
      if (!passes) out.push(`a narrowing of ${name} does not pass the re-read through hungUpOnly(table, ${name}, panes): ${norm(n.getText()).slice(0, 70)}`);
    }
  }
  // The pane check is asked once in each wait, and only at a step that may signal.
  const asks = nodesOf(fn.body).filter((n) => ts.isCallExpression(n) && norm(n.expression.getText()) === 'deps.livePanes');
  if (asks.length !== 2) out.push(`endHangupSurvivors asks the pane check ${String(asks.length)} time(s), not once in each wait`);
  for (const a of asks) {
    let p = a.parent;
    while (p !== undefined && (ts.isAwaitExpression(p) || ts.isParenthesizedExpression(p))) p = p.parent;
    if (p === undefined || !ts.isConditionalExpression(p) || !within(a, p.whenTrue)) out.push('the pane check is asked at a step that cannot signal, so every poll would ask tmux');
  }
  const hung = one(functionsNamed(sf, 'hungUpOnly'));
  if (hung === null) out.push('hungUpOnly is not one function of session-tree.ts');
  else {
    const text = norm(hung.body?.getText() ?? '');
    if (!text.includes('panes.has(e.pgid)') || !text.includes('.delete(e.pid)')) out.push('hungUpOnly does not drop the row of each recorded process whose group, its pane’s process, the server still shows');
  }
  const via = one(functionsNamed(sf, 'livePanesVia'));
  if (via === null || !norm(via.getText()).includes('serverGone(err) ? new Set<number>() : null')) out.push('livePanesVia does not read a failure as unknown unless the server is confirmed gone');
  // The three callers each ask their own server, bounded.
  const core = depsArgs(CORE, t.core);
  if (core.calls.length !== 1 || !boundedServerCheck(core.calls[0].arguments[0])) {
    out.push('core.ts does not build End’s deps with a pane check asking its own server through tmux.execTmux within TREE_READ_TIMEOUT_MS, with only a confirmed no-server read as no pane');
  }
  const scratch = depsArgs(SCRATCH, t.scratch);
  if (scratch.calls.length !== 1 || !boundedServerCheck(scratch.calls[0].arguments[0])) {
    out.push('scratch.ts does not build its deps with a pane check asking the run’s server within TREE_READ_TIMEOUT_MS');
  }
  const cli = depsArgs(CLI, t.cli);
  if (cli.calls.length === 0) out.push('session-tree-cli.mts builds no deps');
  const panesOn = one(functionsNamed(cli.sf, 'panesOn'));
  const cliText = panesOn === null ? '' : norm(panesOn.getText());
  if (panesOn === null || !cliText.includes('livePanesVia(') || !cliText.includes("'-L', socket") || !cliText.includes('timeout: TREE_READ_TIMEOUT_MS') || !cliText.includes('no server running')) {
    out.push('session-tree-cli.mts has no panesOn(socket) asking that server through livePanesVia within TREE_READ_TIMEOUT_MS');
  }
  for (const c of cli.calls) {
    const a = c.arguments[0];
    if (a === undefined || !ts.isCallExpression(a) || calleeName(a) !== 'panesOn') out.push(`the runner builds deps without its server’s pane check: ${norm(c.getText()).slice(0, 70)}`);
  }
  return out;
}
async function e15Behaviour(t) {
  const { mod, why } = await loadTree(t);
  if (mod === null) return [why];
  const out = [];
  const world = (shown) => {
    let clock = 0;
    const kills = [];
    const row = (pid, pgid) => ({ pid, ppid: 50, pgid, tpgid: pgid, stat: 'S+', lstart: LSTART, command: `sleep ${String(pid)}` });
    const rows = new Map([[812, row(812, 812)], [813, row(813, 812)], [900, row(900, 900)]]);
    const deps = {
      readTable: () => Promise.reject(new Error('not asked')),
      readTerminals: () => Promise.reject(new Error('not asked')),
      livePanes: () => Promise.resolve(shown(clock)),
      reread: (pids) => Promise.resolve(new Map([...rows].filter(([p]) => pids.includes(p)))),
      kill: (pid, signal) => {
        kills.push({ pid, signal });
        rows.delete(pid);
      },
      sleep: (ms) => {
        clock += ms;
        return Promise.resolve();
      },
      now: () => clock
    };
    const e = (pid, pgid) => ({ pid, pgid, lstart: LSTART, command: `sleep ${String(pid)}` });
    return { deps, kills, tree: { all: [e(812, 812), e(813, 812), e(900, 900)], targets: [e(812, 812), e(813, 812), e(900, 900)] } };
  };
  const cases = [
    ['a grouped session still showing pane 812', () => new Set([812]), [900]],
    ['a linked window still showing panes 812 and 900', () => new Set([812, 900, 4242]), []],
    ['no pane shown', () => new Set(), [812, 813, 900]]
  ];
  for (const [name, shown, want] of cases) {
    const w = world(shown);
    try {
      await mod.endHangupSurvivors(w.tree, w.deps);
    } catch (err) {
      out.push(`endHangupSurvivors threw with ${name}: ${String(err?.message ?? err)}`);
      continue;
    }
    const got = sorted(w.kills.map((k) => k.pid));
    if (!same(got, want)) out.push(`with ${name} it signalled ${JSON.stringify(got)}, want ${JSON.stringify(want)}: a pane the hang-up never closed is not End’s`);
  }
  const unknown = world(() => null);
  const report = await mod.endHangupSurvivors(unknown.tree, unknown.deps).catch(() => null);
  if (unknown.kills.length > 0) out.push('it signalled while the pane check never answered');
  if (report?.readFailed !== true) out.push('it did not report readFailed when the pane check never answered');
  // livePanesVia over a stand-in tmux.
  const via = (answer, gone) => mod.livePanesVia(() => (answer instanceof Error ? Promise.reject(answer) : Promise.resolve(answer)), gone);
  const okSet = await via('812\n900\n', () => false)();
  if (!(okSet instanceof Set) || !same([...okSet], [812, 900])) out.push('livePanesVia does not read every pane pid');
  if ((await via(new Error('no server running on /x'), (e) => /no server running/.test(e.message))())?.size !== 0) out.push('livePanesVia does not read a confirmed gone server as no pane shown');
  if ((await via(new Error('timed out'), () => false)()) !== null) out.push('livePanesVia reads a failure that confirms nothing as an answer');
  if ((await via('812\n%3\n', () => false)()) !== null) out.push('livePanesVia reads an answer it does not understand as an answer');
  return out;
}
async function e15(t) {
  return [...e15Static(t), ...(await e15Behaviour(t))];
}

// ---------------------------------------------------------------------------
// The attacks: one in-memory copy of the tree per way to break a rule
// ---------------------------------------------------------------------------

const splice = (text, from, to, what) => text.slice(0, from) + what + text.slice(to);
const spliceNode = (text, node, what) => splice(text, node.getStart(), node.getEnd(), what);
/** A copy with one file's text changed, or null when the change could not be built. */
function withText(t, key, change) {
  const text = t[key];
  if (text === null || text === undefined) return null;
  const next = change(text);
  return next === null || next === text ? null : { ...t, [key]: next };
}
const stmtOf = (node) => {
  let s = node;
  while (s.parent !== undefined && !ts.isBlock(s.parent) && !ts.isSourceFile(s.parent)) s = s.parent;
  return s;
};
/** Move the statement holding `a` to just before the statement holding `b`. */
function moveBefore(text, a, b) {
  const sa = stmtOf(a);
  const sb = stmtOf(b);
  if (sa === sb) return null;
  const moved = sa.getText();
  if (sa.getStart() > sb.getStart()) {
    const t1 = splice(text, sa.getStart(), sa.getEnd(), '');
    return splice(t1, sb.getStart(), sb.getStart(), `${moved}\n`);
  }
  const t1 = splice(text, sb.getStart(), sb.getStart(), `${moved}\n`);
  return splice(t1, sa.getStart(), sa.getEnd(), '');
}
/** Move the statement holding `a` to just after the statement holding `b`. */
function moveAfter(text, a, b) {
  const sa = stmtOf(a);
  const sb = stmtOf(b);
  if (sa === sb) return null;
  const moved = sa.getText();
  if (sa.getStart() > sb.getStart()) {
    const t1 = splice(text, sa.getStart(), sa.getEnd(), '');
    return splice(t1, sb.getEnd(), sb.getEnd(), `\n${moved}`);
  }
  const t1 = splice(text, sb.getEnd(), sb.getEnd(), `\n${moved}`);
  return splice(t1, sa.getStart(), sa.getEnd(), '');
}
const coreAt = (text) => {
  const sf = parse(CORE, text);
  const m = one(methodsNamed(sf, 'killSessionAdmitted'));
  if (m === null) return null;
  const pick = (name) => one(callsNamed(m.body, name));
  const hang = one(nodesOf(m.body).filter((n) => ts.isCallExpression(n) && norm(n.expression.getText()) === 'tmux.killSession' && n.arguments[0]?.getText() === 'target'));
  const read = pick('readEndTree');
  const awaitTree = read === null ? null : one(treeAwaitsOf(m.body, heldIn(read, m.body)));
  return { sf, m, capture: pick('captureSessionSnapshot'), read, awaitTree, after: pick('endAfterHangup'), hang };
};
const treeAt = (text) => parse(TREE, text);
/** Insert `code` as the first statement of a function's body. */
function atTop(text, fn, code) {
  const body = fn.body;
  if (body === undefined || !ts.isBlock(body)) return null;
  return splice(text, body.getStart() + 1, body.getStart() + 1, `\n${code}\n`);
}

const ATTACKS = {
  E1: [
    ['the tree read awaited where it starts, so the capture waits for it', (t) => withText(t, 'core', (s) => { const c = coreAt(s); return c?.read ? spliceNode(s, c.read, `await ${c.read.getText()}`) : null; })],
    ['the tree read started after the capture', (t) => withText(t, 'core', (s) => { const c = coreAt(s); return c?.read && c.capture ? moveAfter(s, c.read, c.capture) : null; })],
    ['the tree read awaited below the hang-up', (t) => withText(t, 'core', (s) => { const c = coreAt(s); return c?.awaitTree && c.hang ? moveAfter(s, c.awaitTree, c.hang) : null; })],
    ['the tree read never awaited', (t) => withText(t, 'core', (s) => { const c = coreAt(s); return c?.awaitTree ? spliceNode(s, c.awaitTree, 'null') : null; })],
    ['the continuation moved above the hang-up', (t) => withText(t, 'core', (s) => { const c = coreAt(s); return c?.after && c.hang ? moveBefore(s, c.after, c.hang) : null; })],
    ['the continuation awaited', (t) => withText(t, 'core', (s) => { const c = coreAt(s); return c?.after ? spliceNode(s, c.after, `await ${c.after.getText()}`) : null; })],
    ['a statement after the continuation', (t) => withText(t, 'core', (s) => { const c = coreAt(s); if (!c?.after) return null; const st = stmtOf(c.after); return splice(s, st.getEnd(), st.getEnd(), '\n    this.broadcastSessions();'); })]
  ],
  E2: [
    ['the root from rec.panePid', (t) => withText(t, 'core', (s) => { const c = coreAt(s); return c?.read?.arguments[0] ? spliceNode(s, c.read.arguments[0], 'String(rec.panePid)') : null; })],
    ['target from a name', (t) => withText(t, 'core', (s) => { const c = coreAt(s); const d = c === null ? undefined : nodesOf(c.m.body).find((n) => ts.isVariableDeclaration(n) && n.name.getText() === 'target'); return d?.initializer ? spliceNode(s, d.initializer, 'rec.tmuxName') : null; })],
    ['the pane read by the row’s name', (t) => withText(t, 'core', (s) => { const sf = parse(CORE, s); const rm = one(methodsNamed(sf, 'readEndTree')); const call = rm === null ? null : one(callsNamed(rm.body, 'sessionPanesArgv')); const second = rm?.parameters[1]?.name.getText(); return call && second && call.arguments[0] ? spliceNode(s, call.arguments[0], second) : null; })]
  ],
  E3: [
    ['the shell guard removed', (t) => withText(t, 'core', (s) => s.includes("rec.agent !== 'shell'") ? s.replace("rec.agent !== 'shell'", 'true') : null)],
    ['a different row guarded', (t) => withText(t, 'core', (s) => s.includes("rec.agent !== 'shell'") ? s.replace("rec.agent !== 'shell'", "rec.agent !== 'codex'") : null)]
  ],
  E4: [
    ['a kill of a negative pid', (t) => withText(t, 'tree', (s) => { const k = killCalls(treeAt(s)).rest[0]; return k?.arguments[0] ? spliceNode(s, k.arguments[0], `-${k.arguments[0].getText()}`) : null; })],
    ['a third kill( site', (t) => withText(t, 'tree', (s) => { const fn = one(functionsNamed(treeAt(s), 'endHangupSurvivors')); return fn === null ? null : atTop(s, fn, 'for (const e of tree.targets) deps.kill(e.pid, "SIGTERM");'); })],
    ['SIGTERM over the recorded targets without the re-read', (t) => withText(t, 'tree', (s) => { const k = killCalls(treeAt(s)).rest[0]; if (k === undefined) return null; for (let p = k.parent; p !== undefined; p = p.parent) { if (ts.isForOfStatement(p)) return spliceNode(s, p.expression, 'tree.targets'); if (ts.isCallExpression(p) && ts.isPropertyAccessExpression(p.expression) && p.expression.name.text === 'forEach') return spliceNode(s, p.expression.expression, 'tree.targets'); } return null; })],
    ['an await between the re-read and the signal', (t) => withText(t, 'tree', (s) => { const k = killCalls(treeAt(s)).rest[0]; if (k === undefined) return null; const fn = one(functionsNamed(treeAt(s), 'endHangupSurvivors')); const loop = fn === null ? {} : killLoopOf(k, fn.body); return loop.stmt === undefined ? null : splice(s, loop.stmt.getStart(), loop.stmt.getStart(), 'await deps.sleep(0);\n'); })],
    ['an await inside the loop that signals', (t) => withText(t, 'tree', (s) => { const k = killCalls(treeAt(s)).rest[1]; if (k === undefined) return null; const st = stmtOf(k); return splice(s, st.getStart(), st.getStart(), 'await deps.sleep(0);\n'); })],
    ['a group signal named', (t) => withText(t, 'tree', (s) => `${s}\nexport const selfTestGroup = 'pkill';\n`)],
    ['the hang-up sent again', (t) => withText(t, 'tree', (s) => (s.includes("'SIGTERM'") ? s.replace("'SIGTERM'", "'SIGHUP'") : null))],
    ['the signalled list starts as tree.all (R1 in full, at the signal)', (t) => withText(t, 'tree', (s) => (s.includes('[...tree.targets]') ? s.replace('[...tree.targets]', '[...tree.all]') : null))],
    ['SIGKILL over a second list re-read from tree.all', (t) => withText(t, 'tree', (s) => {
      const k = killCalls(treeAt(s)).rest[1];
      if (k === undefined) return null;
      const fn = one(functionsNamed(treeAt(s), 'endHangupSurvivors'));
      const loop = fn === null ? {} : killLoopOf(k, fn.body);
      if (loop.stmt === undefined) return null;
      const renamed = splice(s, loop.stmt.expression.getStart(), loop.stmt.expression.getEnd(), 'everything');
      return splice(renamed, loop.stmt.getStart(), loop.stmt.getStart(), 'const everything = stillTheSame(tree.all, table);\n');
    })]
  ],
  E5: [
    ['the command compared by its first word only', (t) => withText(t, 'tree', (s) => (s.includes('row.command === e.command') ? s.replace('row.command === e.command', "row.command.split(' ')[0] === e.command.split(' ')[0]") : null))]
  ].concat(IDENTITY.filter((f) => f !== 'pid').map((f) => [
    `identity without ${f}`,
    (t) => withText(t, 'tree', (s) => {
      const fn = one(functionsNamed(treeAt(s), 'stillTheSame'));
      if (fn === null) return null;
      const cmp = nodesOf(fn).filter((n) => ts.isBinaryExpression(n) && [ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.EqualsEqualsToken].includes(n.operatorToken.kind) && n.left.getText().includes(`.${f}`) && n.right.getText().includes(`.${f}`));
      let out = s;
      for (const c of [...cmp].sort((a, b) => b.getStart() - a.getStart())) out = spliceNode(out, c, 'true');
      return cmp.length === 0 ? null : out;
    })
  ])),
  E6: [
    ['targets = all (R1 in full)', (t) => withText(t, 'tree', (s) => {
      const fn = one(functionsNamed(treeAt(s), 'readSessionTree'));
      if (fn === null) return null;
      const obj = nodesOf(fn).filter((n) => ts.isObjectLiteralExpression(n) && n.properties.some((p) => p.name?.getText() === 'targets') && n.properties.some((p) => p.name?.getText() === 'all')).pop();
      if (obj === undefined) return null;
      const all = obj.properties.find((p) => p.name?.getText() === 'all');
      const targets = obj.properties.find((p) => p.name?.getText() === 'targets');
      const allExpr = ts.isShorthandPropertyAssignment(all) ? 'all' : all.initializer.getText();
      return spliceNode(s, targets, `targets: ${allExpr}`);
    })],
    ['the app bundle exclusion removed', (t) => withText(t, 'tree', (s) => (s.includes('.app/Contents/MacOS/') ? s.split('.app/Contents/MacOS/').join('\\u0000never\\u0000') : null))],
    ['the ppid === serverPid root check removed', (t) => withText(t, 'tree', (s) => {
      const sf = treeAt(s);
      const cmp = nodesOf(sf).filter((n) => ts.isBinaryExpression(n) && /ppid/.test(n.getText()) && /serverPid/.test(n.getText()) && [ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken].includes(n.operatorToken.kind));
      let out = s;
      for (const c of [...cmp].sort((a, b) => b.getStart() - a.getStart())) out = spliceNode(out, c, c.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken ? 'true' : 'false');
      return cmp.length === 0 ? null : out;
    })],
    ['the terminal’s foreground group selected again (attack d2)', (t) => withText(t, 'tree', (s) => (s.includes('row.pgid === rootRow.pgid &&') ? s.replace('row.pgid === rootRow.pgid &&', '(row.pgid === rootRow.pgid || row.pgid === rootRow.tpgid) &&') : null))],
    ['a root that does not lead its own group counted', (t) => withText(t, 'tree', (s) => (s.includes(' &&\n      rootRow.pgid === root.pid;') ? s.replace(' &&\n      rootRow.pgid === root.pid;', ';') : null))],
    ['a dead pane kept', (t) => withText(t, 'tree', (s) => {
      const fn = one(functionsNamed(treeAt(s), 'parsePaneRoots'));
      if (fn === null) return null;
      const cmp = nodesOf(fn).filter((n) => ts.isBinaryExpression(n) && [ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken].includes(n.operatorToken.kind) && /^['"]?[01]['"]?$/.test(n.right.getText()));
      let out = s;
      for (const c of [...cmp].sort((a, b) => b.getStart() - a.getStart())) out = spliceNode(out, c, c.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken ? (c.right.getText().includes('1') ? 'false' : 'true') : (c.right.getText().includes('1') ? 'true' : 'false'));
      return cmp.length === 0 ? null : out;
    })]
  ],
  E7: [
    ['resume.ts imports the module itself', (t) => ({ ...t, others: [...t.others, { rel: RESUME, text: "import { leftBehind } from './scratch';\nimport { readSessionTree } from '../proc/session-tree';\n" }] })],
    ['the reconcile plan imports it', (t) => ({ ...t, others: [...t.others, { rel: 'src/main/sessions/reconcile-plan.ts', text: "export { endHangupSurvivors } from '../proc/session-tree';\n" }] })],
    ['core.ts no longer imports it', (t) => withText(t, 'core', (s) => s.replace(/from ['"]\.\.\/proc\/session-tree['"]/g, "from '../proc/session-tree-gone'"))]
  ],
  E8: [
    ['reapDeadSession calls endAfterHangup', (t) => withText(t, 'core', (s) => { const m = one(methodsNamed(parse(CORE, s), 'reapDeadSession')); return m === null ? null : atTop(s, m, 'this.endAfterHangup(null as never, "");'); })],
    ['a timer reads a tree', (t) => withText(t, 'core', (s) => { const m = one(methodsNamed(parse(CORE, s), 'dispose')); return m === null ? null : atTop(s, m, 'setTimeout(() => { void this.readEndTree("$1", ""); }, 1);'); })],
    ['refresh reaches it through a helper', (t) => withText(t, 'core', (s) => {
      const sf = parse(CORE, s);
      const m = one(methodsNamed(sf, 'refresh'));
      const endM = one(methodsNamed(sf, 'killSessionAdmitted'));
      if (m === null || endM === null) return null;
      const helper = '\n  private selfTestSweep(): void {\n    this.endAfterHangup(null as never, "");\n  }\n';
      const withHelper = splice(s, endM.getStart(), endM.getStart(), `${helper}\n  `);
      const m2 = one(methodsNamed(parse(CORE, withHelper), 'refresh'));
      return m2 === null ? null : atTop(withHelper, m2, 'this.selfTestSweep();');
    })],
    ['shutdownGmuxCore ends trees', (t) => withText(t, 'core', (s) => { const f = one(functionsNamed(parse(CORE, s), 'shutdownGmuxCore')); return f === null ? null : atTop(s, f, 'void endHangupSurvivors(null as never, null as never);'); })]
  ],
  E9: [
    ['a first wait shorter than twice the slowest exit', (t) => withText(t, 'tree', (s) => s.replace(/(HANGUP_GRACE_MS\s*=\s*)[0-9_]+/, '$13_000'))],
    ['the first wait back at 4 s (S9: a 5 s orderly exit cut by SIGTERM)', (t) => withText(t, 'tree', (s) => s.replace(/(HANGUP_GRACE_MS\s*=\s*)[0-9_]+/, '$14_000'))],
    ['the second wait back at 2.5 s (Claude Code’s own shutdown cut by SIGKILL)', (t) => withText(t, 'tree', (s) => s.replace(/(TERM_GRACE_MS\s*=\s*)[0-9_]+/, '$12_500'))],
    ['quick re-reads shorter than the slowest orderly exit', (t) => withText(t, 'tree', (s) => s.replace(/(QUICK_POLLS_MS\s*=\s*)[0-9_]+/, '$1500'))],
    ['a worst case that leaves the pane check out', (t) => withText(t, 'tree', (s) => (s.includes('2 * (READ_RETRY_MS + POLL_MS + 2 * TREE_READ_TIMEOUT_MS)') ? s.replace('2 * (READ_RETRY_MS + POLL_MS + 2 * TREE_READ_TIMEOUT_MS)', '2 * (READ_RETRY_MS + POLL_MS + TREE_READ_TIMEOUT_MS)') : null))],
    ['a retry window shorter than the longest stall measured', (t) => withText(t, 'tree', (s) => s.replace(/(READ_RETRY_MS\s*=\s*)[0-9_]+/, '$12_000'))],
    ['a retry window with no end in sight', (t) => withText(t, 'tree', (s) => s.replace(/(READ_RETRY_MS\s*=\s*)[0-9_]+/, '$160_000_000'))],
    ['a worst case that leaves the retry windows out', (t) => withText(t, 'tree', (s) => (s.includes('2 * (READ_RETRY_MS + POLL_MS + 2 * TREE_READ_TIMEOUT_MS)') ? s.replace('2 * (READ_RETRY_MS + POLL_MS + 2 * TREE_READ_TIMEOUT_MS)', '2 * (POLL_MS + 2 * TREE_READ_TIMEOUT_MS)') : null))],
    ['the closing check waiting a fixed second instead', (t) => withText(t, 'scratch', (s) => {
      const lb = one(functionsNamed(parse(SCRATCH, s), 'leftBehind'));
      if (lb === null) return null;
      const ids = nodesOf(lb.body).filter((n) => ts.isIdentifier(n) && n.text === 'ENDING_WORST_MS');
      let out = s;
      for (const x of [...ids].sort((a, b) => b.getStart() - a.getStart())) out = spliceNode(out, x, '1_000');
      return ids.length === 0 ? null : out;
    })]
  ],
  E10: [
    ['the ending handed to the ledger, which a quit waits for', (t) => withText(t, 'core', (s) => (s.includes('void endHangupSurvivors(tree, this.endTreeDeps)') ? s.replace('void endHangupSurvivors(tree, this.endTreeDeps)', "void this.ledger.admit('endAfterHangup', () => endHangupSurvivors(tree, this.endTreeDeps))") : null))],
    ['the ending kept on this for the quit', (t) => withText(t, 'core', (s) => { const m = one(methodsNamed(parse(CORE, s), 'endAfterHangup')); return m === null ? null : atTop(s, m, 'this.endingsInFlight.add(Promise.resolve());'); })],
    ['the ending returned to a caller', (t) => withText(t, 'core', (s) => { const m = one(methodsNamed(parse(CORE, s), 'endAfterHangup')); return m === null ? null : atTop(s, m, 'return endHangupSurvivors(tree, this.endTreeDeps) as never;'); })],
    ['a follow back in the ledger', (t) => withText(t, 'ledger', (s) => { const m = one(methodsNamed(parse(LEDGER, s), 'join')); return m === null ? null : splice(s, m.getStart(), m.getStart(), 'follow(work: Promise<unknown>): void {\n    this.admitted.add(work);\n  }\n\n  '); })],
    ['a join that loops again', (t) => withText(t, 'ledger', (s) => { const m = one(methodsNamed(parse(LEDGER, s), 'join')); return m === null ? null : atTop(s, m, 'while (this.admitted.size > 0) await Promise.all([...this.admitted]);'); })]
  ],
  E11: [
    ['the end moved above kill-server in teardown', (t) => withText(t, 'harness', (s) => {
      const sf = parse(HARNESS, s);
      const r = runners(sf);
      const fn = one(functionsNamed(sf, 'teardown'));
      if (fn === null) return null;
      const calls = nodesOf(fn.body).filter((n) => ts.isCallExpression(n));
      const kill = calls.find((c) => literalsIn(c).includes('kill-server'));
      const end = calls.find((c) => eventsOf(c, r).includes('end') && !literalsIn(c).includes('kill-server'));
      return kill && end ? moveBefore(s, end, kill) : null;
    })],
    ['the runner never ends anything', (t) => withText(t, 'harness', (s) => (/(['"])end\1/.test(s) ? s.replace(/(['"])end\1/g, "'read'") : null))],
    ['harness-socket signals a process', (t) => withText(t, 'harness', (s) => `${s}\nexport function selfTestSignal(pid) { process.kill(pid, 'SIGTERM'); }\n`)],
    ['the runner signals a process', (t) => withText(t, 'cli', (s) => `${s}\nexport function selfTestSignal(pid: number): void { process.kill(pid, 'SIGKILL'); }\n`)],
    ['holdsAPane always answers no, so the backstop never runs', (t) => withText(t, 'harness', (s) => { const fn = one(functionsNamed(parse(HARNESS, s), 'holdsAPane')); return fn === null ? null : atTop(s, fn, 'return false;'); })],
    ['holdsAPane always answers yes', (t) => withText(t, 'harness', (s) => { const fn = one(functionsNamed(parse(HARNESS, s), 'holdsAPane')); return fn === null ? null : atTop(s, fn, 'return true;'); })],
    ['the end runner bounded under the longest ending', (t) => withText(t, 'harness', (s) => s.replace(/(END_RUNNER_TIMEOUT_MS\s*=\s*)[0-9_]+/, '$115_000'))],
    ['the end runner not handed the socket', (t) => withText(t, 'harness', (s) => (s.includes("sessionTreeCli('end', [socket], tree)") ? s.replace("sessionTreeCli('end', [socket], tree)", "sessionTreeCli('end', [], tree)") : null))]
  ],
  E12: [
    ['LC_ALL removed', (t) => withText(t, 'tree', (s) => { const sf = treeAt(s); const p = nodesOf(sf).filter((n) => ts.isPropertyAssignment(n) && n.name.getText().replace(/['"]/g, '') === 'LC_ALL'); let out = s; for (const x of [...p].sort((a, b) => b.getStart() - a.getStart())) out = spliceNode(out, x, "LANG: 'fr_FR.UTF-8'"); return p.length === 0 ? null : out; })],
    ['-ww dropped from the wide read', (t) => withText(t, 'tree', (s) => { const d = one(nodesOf(treeAt(s)).filter((n) => ts.isVariableDeclaration(n) && n.name.getText() === 'TREE_PS_ARGS')); const lit = d === null ? undefined : nodesOf(d).find((n) => ts.isStringLiteralLike(n) && n.text === '-ww'); return lit === undefined ? null : spliceNode(s, lit, "'-w'"); })],
    ["the runner's tmux without -u", (t) => withText(t, 'cli', (s) => (s.includes("['-u', ") ? s.replace("['-u', ", '[') : null))],
    ['the identity re-read names every pid in one ps', (t) => withText(t, 'tree', (s) => (s.includes('readPs(identityPsArgs(pid), true, left)') ? s.replace('readPs(identityPsArgs(pid), true, left)', "readPs(['-ww', '-o', TREE_FIELDS, '-p', pids.join(',')], true, left)") : null))],
    ['identityPsArgs taking a list again', (t) => withText(t, 'tree', (s) => (s.includes('export function identityPsArgs(pid: number): string[] {') ? s.replace('export function identityPsArgs(pid: number): string[] {', 'export function identityPsArgs(pid: number, more: readonly number[] = []): string[] {') : null))],
    ['End’s read from the whole table', (t) => withText(t, 'core', (s) => { const m = one(methodsNamed(parse(CORE, s), 'readEndTree')); const call = m === null ? undefined : nodesOf(m.body).find((n) => ts.isCallExpression(n) && calleeName(n) === 'readTerminals'); return call === undefined ? null : spliceNode(s, call, 'this.endTreeDeps.readTable()'); })],
    ['a tab back in the pane format', (t) => withText(t, 'tree', (s) => (s.includes("'#{pane_pid} #{pane_dead} #{pid} #{pane_tty}'") ? s.replace("'#{pane_pid} #{pane_dead} #{pid} #{pane_tty}'", "'#{pane_pid}\\t#{pane_dead}\\t#{pid}\\t#{pane_tty}'") : null))],
    ['-ww dropped from the terminal read', (t) => withText(t, 'tree', (s) => { const fn = one(functionsNamed(treeAt(s), 'terminalPsArgs')); const lit = fn === null ? undefined : nodesOf(fn).find((n) => ts.isStringLiteralLike(n) && n.text === '-ww'); return lit === undefined ? null : spliceNode(s, lit, "'-w'"); })],
    ['End’s pane read with no bound (the verifier’s X7)', (t) => withText(t, 'core', (s) => {
      const m = one(methodsNamed(parse(CORE, s), 'readEndTree'));
      const call = m === null ? undefined : nodesOf(m.body).find((n) => ts.isCallExpression(n) && norm(n.expression.getText()) === 'tmux.execTmux');
      return call === undefined || call.arguments.length < 2 ? null : spliceNode(s, call, `tmux.execTmux(${call.arguments[0].getText()})`);
    })]
  ],
  E13: [
    ['the remote branch reads a tree', (t) => withText(t, 'core', (s) => {
      const c = coreAt(s);
      const branch = c === null ? undefined : nodesOf(c.m.body).find((n) => ts.isIfStatement(n) && norm(n.expression.getText()) === 'isRemoteSessionId(sessionId)');
      if (branch === undefined || !ts.isBlock(branch.thenStatement)) return null;
      return splice(s, branch.thenStatement.getStart() + 1, branch.thenStatement.getStart() + 1, '\n      void this.readEndTree(sessionId, "");');
    })]
  ],
  E16: [
    ['the closing code left out of the merge', (t) => withText(t, 'resume', (s) => (s.includes('Math.max(exitCodeFor(results, cfg.strict), leftCode)') ? s.replace('Math.max(exitCodeFor(results, cfg.strict), leftCode)', 'exitCodeFor(results, cfg.strict)') : null))],
    ['the run exits with the cases\u2019 code alone', (t) => withText(t, 'resume', (s) => (s.includes("    app.exit(code);\n  } catch") ? s.replace("    app.exit(code);\n  } catch", "    app.exit(exitCodeFor(results, cfg.strict));\n  } catch") : null))],
    ['the closing check not awaited for a code', (t) => withText(t, 'resume', (s) => (s.includes('const leftCode = await closingCheck();') ? s.replace('const leftCode = await closingCheck();', 'const leftCode = 0; void closingCheck();') : null))]
  ],
  E15: [
    ['the pane check dropped from the SIGTERM step', (t) => withText(t, 'tree', (s) => (s.includes('alive = stillTheSame(alive, hungUpOnly(table, alive, panes));') ? s.replace('alive = stillTheSame(alive, hungUpOnly(table, alive, panes));', 'alive = stillTheSame(alive, table);') : null))],
    ['the pane check never asked', (t) => withText(t, 'tree', (s) => (s.includes('due ? await deps.livePanes() : NO_PANES') ? s.split('due ? await deps.livePanes() : NO_PANES').join('NO_PANES') : null))],
    ['the pane check asked on every poll', (t) => withText(t, 'tree', (s) => (s.includes('due ? await deps.livePanes() : NO_PANES') ? s.split('due ? await deps.livePanes() : NO_PANES').join('await deps.livePanes()') : null))],
    ['hungUpOnly keeps every row', (t) => withText(t, 'tree', (s) => { const fn = one(functionsNamed(treeAt(s), 'hungUpOnly')); return fn === null ? null : atTop(s, fn, 'return table;'); })],
    ['livePanesVia reads every failure as no pane shown', (t) => withText(t, 'tree', (s) => (s.includes('return serverGone(err) ? new Set<number>() : null;') ? s.replace('return serverGone(err) ? new Set<number>() : null;', 'return new Set<number>();') : null))],
    ['core.ts reads any tmux failure as a gone server', (t) => withText(t, 'core', (s) => (s.includes("(err) => tmux.serverProbeVerdict(err) === 'no-server'") ? s.replace("(err) => tmux.serverProbeVerdict(err) === 'no-server'", '() => true') : null))],
    ['scratch.ts asks with no bound', (t) => withText(t, 'scratch', (s) => (s.includes('(argv) => tmux.execTmux(argv, { timeoutMs: TREE_READ_TIMEOUT_MS })') ? s.replace('(argv) => tmux.execTmux(argv, { timeoutMs: TREE_READ_TIMEOUT_MS })', '(argv) => tmux.execTmux(argv)') : null))],
    ['the runner’s end asks no server', (t) => withText(t, 'cli', (s) => (s.includes('defaultEndDeps(panesOn(socket)))') ? s.replace('defaultEndDeps(panesOn(socket)))', 'defaultEndDeps(() => Promise.resolve(new Set<number>())))') : null))]
  ],
  E14: [
    ['a failed re-read ends the ending (the retry removed)', (t) => withText(t, 'tree', (s) => (s.includes('} else if (deps.now() >= hangupEnds + READ_RETRY_MS) {') ? s.replace('} else if (deps.now() >= hangupEnds + READ_RETRY_MS) {', '} else {') : null))],
    ['a failed re-read after SIGTERM ends it', (t) => withText(t, 'tree', (s) => (s.includes('} else if (deps.now() >= termEnds + READ_RETRY_MS) {') ? s.replace('} else if (deps.now() >= termEnds + READ_RETRY_MS) {', '} else {') : null))],
    ['a signal after a re-read that did not answer', (t) => withText(t, 'tree', (s) => {
      const needle = "      if (table !== null && panes !== null) {\n        alive = stillTheSame(alive, hungUpOnly(table, alive, panes));\n        if (alive.length === 0) return finish(false);\n        if (due) {\n          for (const e of alive) {\n            if (e.pid <= 1) continue;\n            try {\n              deps.kill(e.pid, 'SIGTERM');";
      return s.includes(needle)
        ? s.replace(needle, "      if ((table !== null && panes !== null) || due) {\n        if (table !== null && panes !== null) alive = stillTheSame(alive, hungUpOnly(table, alive, panes));\n        if (alive.length === 0) return finish(false);\n        if (due) {\n          for (const e of alive) {\n            if (e.pid <= 1) continue;\n            try {\n              deps.kill(e.pid, 'SIGTERM');")
        : null;
    })]
  ]
};


// ---------------------------------------------------------------------------
// E16 — the closing check's code reaches the run's exit (the tools round's reverify)
// ---------------------------------------------------------------------------

/**
 * The closing check can only make a run red if its code reaches `app.exit`.
 * A37 to A42 pin the verdict and the recording; nothing pinned the merge, so
 * a run could print "could not look" and still exit 0. Read as text, spacing
 * folded: the closing check is awaited, its code is merged with the cases'
 * code by Math.max after it, and the merged code is the one the run exits with.
 */
function e16(t) {
  const out = [];
  if (typeof t.resume !== 'string') return [`${RESUME} could not be read`];
  const flat = t.resume.replace(/\s+/g, ' ');
  const took = flat.indexOf('const leftCode = await closingCheck();');
  const merged = flat.indexOf('const code = Math.max(exitCodeFor(results, cfg.strict), leftCode);');
  const exits = merged < 0 ? -1 : flat.indexOf('app.exit(code);', merged);
  if (took < 0) out.push('the run no longer awaits the closing check for its code (`const leftCode = await closingCheck();`)');
  if (merged < 0) out.push('the exit code no longer merges the closing check (`Math.max(exitCodeFor(results, cfg.strict), leftCode)`)');
  if (took >= 0 && merged >= 0 && took > merged) out.push('the exit code is composed before the closing check runs');
  if (merged >= 0 && exits < 0) out.push('the run does not exit with the merged code');
  return out;
}

const RULES = [
  ['E1', 'the order is the promise: capture, tree read, hang-up, broadcast, then the continuation, not awaited', e1],
  ['E2', 'the root is the `$-id` liveIds holds, never a pane pid or a name', e2],
  ['E3', "a plain shell row reads no tree (R2): `rec.agent !== 'shell'`", e3],
  ['E4', 'one pid at a time, behind the identity re-read; no group, pattern or name', e4],
  ['E5', 'identity is pid, pgid, lstart and command, all four', e5],
  ['E6', "the selection is the hang-up's own groups and no wider (R1's held half), from live panes the server owns", e6],
  ['E7', 'the module’s importers are exactly core.ts, scratch.ts and the harness runner', e7],
  ['E8', 'nothing on reap, refresh, reconcile, boot, dispose, quit or a timer reaches it', e8],
  ['E9', 'the graces outlast an agent’s own orderly exit (S9, Claude Code’s failsafe), a failed read is asked again past the longest stall, and the closing check waits the true worst case', e9],
  ['E10', 'a quit does not wait for the ending: nothing a quit joins holds it, and the ledger is the parent’s', e10],
  ['E11', 'harness-socket reads before kill-server and ends after it, through the one runner, handed the socket and given longer than any ending, signalling nothing itself', e11],
  ['E12', 'every ps is under LC_ALL=C and -ww, every -p names one pid, End reads the pane terminals within the read bound, the pane format holds no tab, and the runner asks tmux with -u', e12],
  ['E13', 'the remote branch names none of it', e13],
  ['E14', 'a failed re-read is asked again and never read as the end, and a signal only follows a re-read that answered', e14],
  ['E15', 'before each signal the server that answered is asked for its panes, and nothing whose pane it still shows is signalled', e15],
  ['E16', "the closing check's code reaches the run's exit: awaited, merged by Math.max after it, and the code the run exits with", e16]
];

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

const problems = [];
const control = shippingTree();
for (const m of missing(control)) problems.push(m);

let attacksRed = 0;
let green = 0;
for (const [id, name, rule] of RULES) {
  const found = problems.length > 0 && missing(control).length > 0 ? ['a file the rules read is missing'] : await rule(control);
  if (found.length === 0) {
    green += 1;
    say(`ok    ${id.padEnd(3)}  ${name}`);
  } else {
    problems.push(`${id} "${name}": ${found.join('; ')}`);
    say(`RED   ${id.padEnd(3)}  ${name}`);
  }
  const attacks = ATTACKS[id] ?? [];
  if (attacks.length === 0) problems.push(`${id} carries no self-test, so it has never been shown to fail`);
  for (const [attack, build] of attacks) {
    let broken = null;
    try {
      broken = build(control);
    } catch (err) {
      broken = null;
      problems.push(`${id} self-test "${attack}" threw while it was built: ${String(err?.message ?? err)}`);
    }
    if (broken === null) {
      problems.push(`${id} self-test "${attack}" could not be built over this tree, so the rule was not shown to fail`);
      say(`RED   ${id}!  self-test "${attack}" could not be built`);
      continue;
    }
    let redAgain;
    try {
      redAgain = (await rule(broken)).length > 0;
    } catch {
      redAgain = true;
    }
    if (!redAgain) {
      problems.push(`${id} self-test "${attack}": the rule read GREEN over a copy with it broken, so it has stopped asking`);
      say(`RED   ${id}!  self-test "${attack}" stayed green`);
      continue;
    }
    attacksRed += 1;
  }
}

if (problems.length > 0) {
  for (const p of problems) process.stderr.write(`${TAG} ${p}\n`);
  process.stderr.write(`${TAG} FAILED: ${String(RULES.length - green)} of ${String(RULES.length)} rules red, ${String(problems.length)} finding(s), over ${ROOT}.\n`);
  process.exit(1);
}
say(
  `PASS: all ${String(RULES.length)} rules hold over ${ROOT === HERE ? 'this repository' : ROOT}, and ${String(attacksRed)} self-tests, ` +
    'each a copy of the tree with one rule broken, read red as they must. `npm run ablation:p323` is the attack on the shipping source beside it.'
);
process.exit(0);
