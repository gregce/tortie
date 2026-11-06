#!/usr/bin/env node
/**
 * `npm run conformance:stoppedlist`. PHASE 357 — A SESSION LIST THAT GOES BAD
 * WHILE TORTIE RUNS ASKS FOR ONE RESTART (build/p357/SPEC.md §7.1).
 *
 * About two seconds. It reads this repository's source with the TypeScript
 * parser (the pinned `typescript` in node_modules) and asserts over it, and it
 * spawns ONE process, the pinned tsx (build/ts-runner.mjs `tsxCli()`), for
 * rule S8's driven half. That process imports three source files and calls
 * functions with environment records it is handed: it starts nothing, opens no
 * database and no socket, and reads no file under any home. The one thing
 * either process writes is S8's scratch folder (a harness folder, a profile
 * inside it and a decoy beside it) under the system's temporary folder,
 * removed in a `finally`.
 *
 * ## The defect it exists for
 *
 * On 2026-11-05 0.114.0's session list stopped reading correctly while it ran:
 * every refresh threw `database disk image is malformed` from a timer, nothing
 * caught it, Electron drew a dialog per throw, app.log said nothing, and the
 * quit crashed inside SQLite's page cache closing the connection. The phase
 * answers it in four builders' files at once (a latch in the store, catches in
 * the core, a quit that never closes a connection whose memory is damaged,
 * crash handlers in main), and every one of those answers is a SHAPE that a
 * later round can undo in one edit while every test still passes, because a
 * test only proves the paths it names. A member added to the store later is the
 * clearest case: it walks past the latch and no test asks about it. So the
 * shapes are rules here.
 *
 * ## The rules
 *
 *   S1  Every member of `class ManifestStore` but the constructor, `close`,
 *       `stoppedReading` and the private helpers is ONE statement calling
 *       `this.through` or `this.quiet` whose first argument is the member's own
 *       name as a string literal; the set of those names equals
 *       `MANIFEST_OPERATIONS` minus `close`; exactly `contentFingerprint`,
 *       `schemaState` and `describeSchema` answer through `quiet`;
 *       `stoppedReading` is one statement reading `this.stopped` and nothing
 *       else; no field is public; and `through` and `quiet` each ask the latch
 *       FIRST, by exactly `this.stopped !== null` (a test that lets one
 *       operation past is red), then run the work inside a `try` whose catch
 *       asks `isBrokenConnectionError`, then calls `this.latch(operation, err)`
 *       as a statement of its own and ends refusing (or answering), so a latch
 *       that stopped asking, or stopped latching, is red too. And (the fix
 *       round) a stopped store's fingerprint never moves and is never null:
 *       `contentFingerprint`'s fallback is `this.<field> ?? <const>`, the const
 *       one string literal at the top of the file, its work is exactly
 *       `() => (this.<field> = fingerprintOrNull(this.db))`, and that private
 *       field is written nowhere else, so a stopped store answers the
 *       fingerprint it last answered. Null there is the backup ring's "take
 *       one": the latch's first build answered it, and with the file fine the
 *       ring took a generation at every poll past its floor and rotated every
 *       generation from before the stop out (fourteen in an hour, five of five
 *       gone, measured by the fix round).
 *   S2  Inside the class, `this.db` and every repository field the constructor
 *       hands `this.db` to appear only in the constructor, in `close` (the
 *       connection alone), in the arrows handed to `through` and `quiet`, and,
 *       for the connection, as the one argument of `held.push(` in `latch`; and
 *       inside those arrows only as the object of an access or the argument of
 *       a call, never handed out of the arrow itself.
 *   S3  The six repository files hold exactly ONE `catch`, in
 *       `insertSession`, whose first statement is
 *       `if (isBrokenConnectionError(err)) throw err;`, the predicate imported
 *       from ../db/integrity and shadowed by nothing; and no promise `.catch(`.
 *   S4  `isBrokenConnectionError` asks `instanceof … SqliteError` and reads
 *       `.code`, never `.message`, `.stack`, a template, `String(` or a
 *       pattern, and its codes are exactly D1's: `=== 'SQLITE_CORRUPT'`,
 *       `=== 'SQLITE_NOTADB'` and `.startsWith('SQLITE_CORRUPT_')`.
 *   S5  `close`, evaluated over the four latch states, closes the connection
 *       on every path but stopped-with-the-file-fine, where no path closes it;
 *       the latch pushes the connection onto `held` exactly when the file is
 *       fine (one push, in `latch`, under `=== 'fine'`); `held` is never
 *       emptied or handed on; `manifestConnectionsLeftOpen` is
 *       `return held.length;`.
 *   S6  `disposeMainCapabilities` asks `manifestConnectionsLeftOpen() > 0`
 *       once, in the statement immediately before its last `return 'proceed'`,
 *       and that branch ends `clearLogRunSentinel(); process.kill(process.pid,
 *       'SIGKILL'); return 'killed';` in that order.
 *   S7  `app.relaunch(` occurs once under src/main, in the `app:relaunch`
 *       handler, after the `hasSaidNotice('manifest-stopped')` return and the
 *       `isHarnessLaunch(process.env)` return, and no file reaches it by its key
 *       or destructures it out of `app`; `relaunch(` is called once under
 *       src/renderer, in the `manifest-stopped` arm's action.
 *   S8  `setManifestFaultHook(` has ONE production caller,
 *       `installManifestFault` in src/main/harness/manifest-fault.ts, after
 *       `manifestFaultPath(…)` answered and `=== null` returned; AND
 *       `manifestFaultPath` is DRIVEN through the pinned tsx over every
 *       environment shape (no harness term, `GMUX_PROBES` at 0 and at every
 *       other value but 1, no `GMUX_HARNESS_DIR`, a profile outside it under
 *       both the `/var` and the `/private/var` spelling, a person's profile)
 *       and must answer null for every one, and the path for all three terms
 *       present under either spelling. The shipped module's export is driven
 *       beside the source text this gate reads, and the two must agree.
 *   S9  src/main/log/crash.ts is the one non-test file under src/main to hand
 *       `process.on` (or `once`, `addListener`, `prependListener`) an
 *       `uncaughtException`, `uncaughtExceptionMonitor` or
 *       `unhandledRejection` listener; no log call the handlers reach names a
 *       message, a stack, or the thrown value itself (`String(err)`, a
 *       template) but through `crashRecordOf`, `crashKeyOf` or
 *       `crashMessageOf`; `crashRecordOf` takes its message
 *       only from `...crashMessageOf(`, which keeps one only for a
 *       `SqliteError`; and the one dialog call sits behind the harness return
 *       and the `isStopped` return.
 *   S10 `GmuxCore.listSessions` catches only through `isManifestStopped` and
 *       rethrows anything else; D20's five (`handleExternalRename`,
 *       `applyDetectedStatus`, `reapDeadSession`, `handleUnexpectedAttachExit`
 *       and the `server-exit` snapshot chain) each hold a catch naming
 *       `isManifestStopped` that rethrows anything else, and no catch there
 *       that does not name it covers a read of the manifest (a `.then(…,
 *       onRejected)` is a catch); the predicate is imported from the store and
 *       shadowed by nothing.
 *
 * THE PROBE REVIEW (2026-11-05, docs/method/HOW-WE-BUILT-THIS.md rule 9) put
 * nineteen hostile copies of its own through this gate by `--root`; twelve were
 * green. The clauses above that name a test, a latch call, an escape, a pinned
 * branch test, a key or a destructure, a stack or the thrown value, and
 * `.then(…, onRejected)` are what it added, each with an ablation below.
 *
 * ## The ablations, run on every invocation
 *
 * The unedited tree is judged first. Then every rule is asked again over
 * in-memory copies of the tree with that rule broken one way at a time (the
 * spec's own ablations, and more), and each copy must read red on the rules it
 * names and on no other: every other rule must read exactly as it read over
 * the unedited tree. One copy, the spec's "a member that reads this.sessions
 * directly", names two rules on purpose, because reaching a repository outside
 * an arrow breaks the one statement shape (S1) and is itself a reach (S2). A
 * CONTROL copy, changed in four of the files these rules read but in nothing
 * they hold, must stay green on all ten. A copy whose edit no longer finds its
 * text fails the gate, because an ablation that cannot be made proves nothing;
 * and a rule with no ablation fails it, because it has never been shown to
 * fail. Nothing is written to disk but S8's scratch folder.
 *
 * Every file is parsed, so a clause written only in a comment never passes.
 *
 * Usage:
 *   node build/conformance-stopped-list.mjs                 this worktree
 *   node build/conformance-stopped-list.mjs --root <dir>    another tree
 *   node build/conformance-stopped-list.mjs --json          one JSON line
 *   node build/conformance-stopped-list.mjs --verbose       each ablation's first finding
 *   node build/conformance-stopped-list.mjs --timing        how long each step took
 */

import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import ts from 'typescript';
import { tsxCli } from './ts-runner.mjs';

const TAG = '[conformance:stoppedlist]';

function argValue(flag) {
  const at = process.argv.indexOf(flag);
  return at === -1 ? null : (process.argv[at + 1] ?? null);
}
const ROOT = resolve(argValue('--root') ?? join(dirname(fileURLToPath(import.meta.url)), '..'));
const AS_JSON = process.argv.includes('--json');

export const FILES = Object.freeze({
  store: 'src/main/manifest/store.ts',
  integrity: 'src/main/db/integrity.ts',
  sessionsRepository: 'src/main/manifest/sessions-repository.ts',
  repositories: Object.freeze([
    'src/main/manifest/sessions-repository.ts',
    'src/main/manifest/projects-repository.ts',
    'src/main/manifest/restore-journal.ts',
    'src/main/manifest/remote-executions.ts',
    'src/main/manifest/remote-folder-pins.ts',
    'src/main/manifest/closed-remote-folders.ts'
  ]),
  capabilities: 'src/main/capabilities.ts',
  crash: 'src/main/log/crash.ts',
  core: 'src/main/sessions/core.ts',
  seam: 'src/main/harness/manifest-fault.ts',
  launchGate: 'src/main/harness/launch-gate.ts',
  foldStub: 'src/main/harness/fold-stub.ts',
  subscriptions: 'src/renderer/state/subscriptions.ts',
  index: 'src/main/index.ts'
});

export const RULES = Object.freeze(['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10']);

/** The three members that answer instead of refusing (D4). */
const QUIET_MEMBERS = Object.freeze(['contentFingerprint', 'schemaState', 'describeSchema']);
/** D1's codes, by the comparison each is read with. */
const D1_EQUALS = Object.freeze(['SQLITE_CORRUPT', 'SQLITE_NOTADB']);
const D1_PREFIX = Object.freeze(['SQLITE_CORRUPT_']);
/** D20's four methods; the fifth is the `server-exit` callback. */
const D20_METHODS = Object.freeze(['handleExternalRename', 'applyDetectedStatus', 'reapDeadSession', 'handleUnexpectedAttachExit']);
/** The listener names S9 holds to crash.ts. */
const PROCESS_EVENTS = Object.freeze(['uncaughtException', 'uncaughtExceptionMonitor', 'unhandledRejection']);
const LISTENER_METHODS = Object.freeze(['on', 'once', 'addListener', 'prependListener', 'prependOnceListener']);
/** The fewest non-test source files the walk may find before it is not trusted (1,434 at this phase's head). */
export const FLOOR = 1_000;

// ---------------------------------------------------------------------------
// The tree, read once: every non-test .ts and .tsx under src/
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
  walk('src');
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

/** `text.includes(needle)`, remembered per text, because forty copies of one tree share all but a file or two. */
const namesCache = new Map();
function names(text, needle) {
  let byText = namesCache.get(needle);
  if (byText === undefined) namesCache.set(needle, (byText = new Map()));
  let hit = byText.get(text);
  if (hit === undefined) byText.set(text, (hit = text.includes(needle)));
  return hit;
}
/** The paths under a folder whose text names `needle`. A text filter only; each kept file is parsed. */
function pathsNaming(tree, prefix, needle) {
  const out = [];
  for (const [rel, text] of tree) if (rel.startsWith(prefix) && names(text, needle)) out.push(rel);
  return out;
}
/** The files under a folder whose text names `needle`, parsed. */
const filesNaming = (tree, prefix, needle) => pathsNaming(tree, prefix, needle).map((rel) => ({ rel, sf: sfOf(tree, rel) }));
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
const isThis = (n) => n !== undefined && n.kind === ts.SyntaxKind.ThisKeyword;
const isThisAccess = (n, name) => ts.isPropertyAccessExpression(n) && isThis(n.expression) && (name === undefined || n.name.text === name);

function memberName(el) {
  const name = el.name;
  if (name === undefined) return '';
  if (ts.isIdentifier(name) || ts.isPrivateIdentifier(name) || ts.isStringLiteral(name)) return name.text;
  return name.getText();
}

/** `x as const`, `(x)`, `x satisfies T` and `Object.freeze(x)`, peeled to `x`. */
function peel(expr) {
  let e = expr;
  for (;;) {
    if (e === undefined) return e;
    if (ts.isAsExpression(e) || ts.isParenthesizedExpression(e) || ts.isSatisfiesExpression(e)) {
      e = e.expression;
      continue;
    }
    if (ts.isCallExpression(e) && e.expression.getText() === 'Object.freeze' && e.arguments.length === 1) {
      e = e.arguments[0];
      continue;
    }
    return e;
  }
}

function classNamed(sf, name) {
  return nodesOf(sf).find((n) => ts.isClassDeclaration(n) && n.name?.text === name) ?? null;
}
function methodOf(cls, name) {
  return cls.members.find((el) => (ts.isMethodDeclaration(el) || ts.isGetAccessor(el) || ts.isSetAccessor(el)) && memberName(el) === name) ?? null;
}
/** Function declarations and `const name = (…) =>` of `name`, at any depth. */
function functionsNamed(sf, name) {
  return nodesOf(sf).filter(
    (n) =>
      (ts.isFunctionDeclaration(n) && n.name?.text === name) ||
      (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === name && n.initializer !== undefined && isFunctionLike(n.initializer))
  );
}
/** The body of a function declaration, or of the arrow a `const` holds. */
function bodyOf(decl) {
  if (ts.isFunctionDeclaration(decl) || ts.isMethodDeclaration(decl) || ts.isGetAccessor(decl) || ts.isSetAccessor(decl) || ts.isConstructorDeclaration(decl)) return decl.body ?? null;
  if (ts.isVariableDeclaration(decl)) return decl.initializer?.body ?? null;
  if (isFunctionLike(decl)) return decl.body ?? null;
  return null;
}
/** The calls whose callee is `name`, bare or as a property (`x.name(`, `x?.name(`). */
function callsOf(node, name) {
  return nodesOf(node).filter(
    (n) =>
      ts.isCallExpression(n) &&
      ((ts.isIdentifier(n.expression) && n.expression.text === name) ||
        (ts.isPropertyAccessExpression(n.expression) && n.expression.name.text === name))
  );
}
/** Every binding of `name` declared in a file: a function, a variable, a parameter or a class. */
function localBindings(sf, name) {
  return nodesOf(sf).filter(
    (n) =>
      ((ts.isFunctionDeclaration(n) || ts.isClassDeclaration(n)) && n.name?.text === name) ||
      ((ts.isVariableDeclaration(n) || ts.isParameter(n) || ts.isBindingElement(n)) && ts.isIdentifier(n.name) && n.name.text === name)
  );
}
/** True when the file imports `name` by value and unrenamed from one of `from`. */
function importsName(sf, name, from) {
  return sf.statements.some(
    (s) =>
      ts.isImportDeclaration(s) &&
      ts.isStringLiteral(s.moduleSpecifier) &&
      from.includes(s.moduleSpecifier.text) &&
      s.importClause?.isTypeOnly !== true &&
      s.importClause?.namedBindings !== undefined &&
      ts.isNamedImports(s.importClause.namedBindings) &&
      s.importClause.namedBindings.elements.some((e) => e.name.text === name && e.propertyName === undefined && !e.isTypeOnly)
  );
}
/** The nearest ancestor (the node itself excluded) passing `test`, or null. */
function ancestor(node, test, stop) {
  for (let p = node.parent; p !== undefined && p !== stop; p = p.parent) if (test(p)) return p;
  return null;
}
/** The class element (method, constructor, property) holding `node`. */
function memberOf(node, cls) {
  for (let p = node; p !== undefined && p.parent !== undefined; p = p.parent) if (p.parent === cls) return p;
  return null;
}
/** The statement list a statement sits in, when it sits directly in a block or a source file. */
const stmtsOf = (block) => (block !== null && block !== undefined && (ts.isBlock(block) || ts.isSourceFile(block)) ? [...block.statements] : null);
/** True when a statement ends its path: a return, or a block whose last statement does. */
function endsInReturn(stmt) {
  if (stmt === undefined) return false;
  if (ts.isReturnStatement(stmt)) return true;
  if (ts.isBlock(stmt)) return stmt.statements.length > 0 && ts.isReturnStatement(stmt.statements[stmt.statements.length - 1]);
  return false;
}
/** True when a statement is exactly `throw <name>;`, bare or as a one statement block. */
function isThrowOf(stmt, name) {
  if (stmt === undefined) return false;
  if (ts.isBlock(stmt)) return stmt.statements.length === 1 && isThrowOf(stmt.statements[0], name);
  return ts.isThrowStatement(stmt) && stmt.expression !== undefined && ts.isIdentifier(stmt.expression) && stmt.expression.text === name;
}
/** `name(<arg>)`, exactly, with one identifier argument. */
function isCallOfWith(expr, name, arg) {
  const e = peel(expr);
  return (
    e !== undefined &&
    ts.isCallExpression(e) &&
    ts.isIdentifier(e.expression) &&
    e.expression.text === name &&
    e.arguments.length === 1 &&
    ts.isIdentifier(e.arguments[0]) &&
    e.arguments[0].text === arg
  );
}

// ---------------------------------------------------------------------------
// S1 and S2: the store's members and its connection
// ---------------------------------------------------------------------------

function storeClass(tree, f) {
  const sf = sfOf(tree, FILES.store);
  if (sf === null) {
    f.push(`${FILES.store} is missing`);
    return null;
  }
  const cls = classNamed(sf, 'ManifestStore');
  if (cls === null) f.push(`${FILES.store} declares no class ManifestStore`);
  return cls === null ? null : { sf, cls };
}

/** `MANIFEST_OPERATIONS`' names, or null when it is not one frozen list of string literals. */
function operationsOf(sf, f) {
  const decls = nodesOf(sf).filter((n) => ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === 'MANIFEST_OPERATIONS');
  if (decls.length !== 1) {
    f.push(`MANIFEST_OPERATIONS is declared ${String(decls.length)} times in ${FILES.store}, not once`);
    return null;
  }
  const list = peel(decls[0].initializer);
  if (list === undefined || !ts.isArrayLiteralExpression(list) || !list.elements.every((e) => ts.isStringLiteral(e))) {
    f.push('MANIFEST_OPERATIONS is not one list of string literals, so it cannot be compared with the class');
    return null;
  }
  const names = list.elements.map((e) => e.text);
  const dupes = names.filter((n, i) => names.indexOf(n) !== i);
  if (dupes.length > 0) f.push(`MANIFEST_OPERATIONS names ${dupes.join(', ')} twice`);
  if (!names.includes('close')) f.push('MANIFEST_OPERATIONS does not name close');
  for (const bad of ['stoppedReading', 'through', 'quiet', 'latch', 'constructor']) {
    if (names.includes(bad)) f.push(`MANIFEST_OPERATIONS names ${bad}, which is not a store operation`);
  }
  return names;
}

/**
 * The latch's own test, whitespace aside. EXACTLY one of these, so a test that
 * lets one operation past a stopped store (`this.stopped !== null && operation
 * !== 'insertSession'`) is not read as asking the latch (the probe review's
 * hostile copy G1, green on this rule before it was added).
 */
const STOPPED_TESTS = Object.freeze(['this.stopped!==null', 'null!==this.stopped', 'this.stopped!=null', 'null!=this.stopped', 'this.stopped']);

/** The latch helper's shape: ask the latch first, then the work inside a try whose catch classifies, latches and refuses. */
function latchFirst(cls, name, f) {
  const m = methodOf(cls, name);
  if (m === null || m.body === undefined) {
    f.push(`ManifestStore has no private ${name}, the helper every member passes through`);
    return;
  }
  if (!hasModifier(m, ts.SyntaxKind.PrivateKeyword)) f.push(`ManifestStore.${name} is not private`);
  const [first, second] = m.body.statements;
  const asks =
    first !== undefined &&
    ts.isIfStatement(first) &&
    STOPPED_TESTS.includes(peel(first.expression).getText().replace(/\s+/g, '')) &&
    first.elseStatement === undefined &&
    (name === 'through' ? ts.isThrowStatement(first.thenStatement) || (ts.isBlock(first.thenStatement) && first.thenStatement.statements.some((s) => ts.isThrowStatement(s))) : endsInReturn(first.thenStatement));
  if (!asks) f.push(`ManifestStore.${name}'s first statement does not ask the latch, exactly \`if (this.stopped !== null)\`, and ${name === 'through' ? 'throw' : 'return'}, so a stopped store would reach SQLite for some operation (${where(FILES.store, m)})`);
  const tried =
    second !== undefined &&
    ts.isTryStatement(second) &&
    callsOf(second.tryBlock, 'run').length > 0 &&
    second.catchClause !== undefined &&
    callsOf(second.catchClause.block, 'isBrokenConnectionError').length > 0;
  if (!tried) {
    f.push(`ManifestStore.${name}'s second statement is not a try that runs the work and asks isBrokenConnectionError in its catch (${where(FILES.store, m)})`);
    return;
  }
  // The catch LATCHES: after the classifier is asked, one statement of its own
  // hands `this.latch` the helper's own operation and the caught error, and the
  // catch then ends refusing (through) or answering (quiet). Asking the
  // classifier and then refusing without latching would refuse this one call
  // and let the next reach the broken connection again (hostile copy G2).
  const block = second.catchClause.block;
  const v = second.catchClause.variableDeclaration !== undefined && ts.isIdentifier(second.catchClause.variableDeclaration.name) ? second.catchClause.variableDeclaration.name.text : null;
  const op = m.parameters[0] !== undefined && ts.isIdentifier(m.parameters[0].name) ? m.parameters[0].name.text : null;
  const stmts = [...block.statements];
  const asked = stmts.findIndex((s) => callsOf(s, 'isBrokenConnectionError').length > 0);
  const latched = stmts.findIndex(
    (s) =>
      ts.isExpressionStatement(s) &&
      ts.isCallExpression(s.expression) &&
      isThisAccess(s.expression.expression, 'latch') &&
      s.expression.arguments.length === 2 &&
      ts.isIdentifier(s.expression.arguments[0]) &&
      s.expression.arguments[0].text === op &&
      ts.isIdentifier(s.expression.arguments[1]) &&
      s.expression.arguments[1].text === v
  );
  const last = stmts[stmts.length - 1];
  const ends = last !== undefined && (name === 'through' ? ts.isThrowStatement(last) : ts.isReturnStatement(last));
  if (v === null || op === null || asked === -1 || latched <= asked || latched !== stmts.length - 2 || !ends) {
    f.push(`ManifestStore.${name}'s catch does not latch: after it asks isBrokenConnectionError it must call \`this.latch(${op ?? 'operation'}, ${v ?? 'err'});\` as its own statement and then ${name === 'through' ? 'throw the refusal' : 'return the fallback'}, so a broken connection stops the store once (${where(FILES.store, m)})`);
  }
}

/** One member's one statement: `this.through('<own name>', () => …)` or `this.quiet('<own name>', fallback, () => …)`. */
function throughShape(el, name) {
  const body = el.body;
  if (body === undefined || body.statements.length !== 1) {
    return { via: null, why: `${name} is ${String(body?.statements.length ?? 0)} statements, not one call through the latch (${where(FILES.store, el)})` };
  }
  const s = body.statements[0];
  const call = ts.isReturnStatement(s) ? s.expression : ts.isExpressionStatement(s) ? s.expression : undefined;
  if (call === undefined || !ts.isCallExpression(call)) return { via: null, why: `${name}'s one statement is not a call (${where(FILES.store, el)})` };
  if (!ts.isPropertyAccessExpression(call.expression) || !isThis(call.expression.expression) || !['through', 'quiet'].includes(call.expression.name.text)) {
    return { via: null, why: `${name} does not call this.through or this.quiet, so it walks past the latch (${where(FILES.store, el)})` };
  }
  const via = call.expression.name.text;
  const first = call.arguments[0];
  if (first === undefined || !ts.isStringLiteral(first)) return { via: null, why: `${name}'s first argument to ${via} is not a string literal (${where(FILES.store, el)})` };
  if (first.text !== name) return { via: null, why: `${name} names itself '${first.text}' to the latch, so its refusal and its log line name another member (${where(FILES.store, el)})` };
  const want = via === 'through' ? 2 : 3;
  if (call.arguments.length !== want || !isFunctionLike(call.arguments[want - 1])) {
    return { via: null, why: `${name} hands ${via} ${String(call.arguments.length)} arguments; the last of ${String(want)} must be the arrow holding its work (${where(FILES.store, el)})` };
  }
  return { via, why: null };
}

export function ruleS1(tree) {
  const f = [];
  const store = storeClass(tree, f);
  if (store === null) return f;
  const { sf, cls } = store;
  const ops = operationsOf(sf, f);
  const members = [];
  const quiet = [];
  let sawClose = false;
  let sawStopped = false;
  for (const el of cls.members) {
    if (ts.isConstructorDeclaration(el) || ts.isSemicolonClassElement(el) || ts.isClassStaticBlockDeclaration(el)) continue;
    const name = memberName(el);
    const hidden = hasModifier(el, ts.SyntaxKind.PrivateKeyword) || hasModifier(el, ts.SyntaxKind.ProtectedKeyword) || (el.name !== undefined && ts.isPrivateIdentifier(el.name));
    if (ts.isPropertyDeclaration(el)) {
      if (!hidden) f.push(`ManifestStore.${name} is a public field; the store's only public surface is its members (${where(FILES.store, el)})`);
      continue;
    }
    if (hidden) continue;
    if (hasModifier(el, ts.SyntaxKind.StaticKeyword)) {
      f.push(`ManifestStore.${name} is static, so it is no store operation and no latch stands in front of it (${where(FILES.store, el)})`);
      continue;
    }
    if (!ts.isMethodDeclaration(el) && !ts.isGetAccessor(el) && !ts.isSetAccessor(el)) {
      f.push(`ManifestStore.${name} is a member of a kind this rule cannot read (${where(FILES.store, el)})`);
      continue;
    }
    if (name === 'close') {
      sawClose = true;
      members.push(name);
      continue;
    }
    if (name === 'stoppedReading') {
      sawStopped = true;
      const body = el.body;
      const ret = body?.statements.length === 1 && ts.isReturnStatement(body.statements[0]) ? body.statements[0].expression : undefined;
      const inner = ret === undefined ? [] : nodesOf(ret);
      const thisReads = inner.filter((n) => ts.isPropertyAccessExpression(n) && isThis(n.expression)).map((n) => n.name.text);
      const ok =
        ret !== undefined &&
        thisReads.length > 0 &&
        thisReads.every((n) => n === 'stopped') &&
        !inner.some((n) => ts.isCallExpression(n) || (ts.isElementAccessExpression(n) && isThis(n.expression)));
      if (!ok) f.push(`stoppedReading is not one statement reading this.stopped and nothing else, so the latch's own read could reach SQLite or throw (${where(FILES.store, el)})`);
      continue;
    }
    members.push(name);
    const shape = throughShape(el, name);
    if (shape.via === null) f.push(shape.why);
    else if (shape.via === 'quiet') quiet.push(name);
  }
  if (!sawClose) f.push('ManifestStore has no close');
  if (!sawStopped) f.push('ManifestStore has no stoppedReading, the read of the latch the core and the door ask');
  if (ops !== null) {
    const missing = ops.filter((n) => !members.includes(n));
    const extra = members.filter((n) => !ops.includes(n));
    if (missing.length > 0) f.push(`MANIFEST_OPERATIONS names ${missing.join(', ')}, which the class does not hold`);
    if (extra.length > 0) f.push(`the class holds ${extra.join(', ')}, which MANIFEST_OPERATIONS does not name, so the seam, the log line and this rule cannot see it`);
  }
  const quietWrong = quiet.filter((n) => !QUIET_MEMBERS.includes(n));
  const quietMissing = QUIET_MEMBERS.filter((n) => !quiet.includes(n));
  if (quietWrong.length > 0) f.push(`${quietWrong.join(', ')} answer a fallback through quiet; only ${QUIET_MEMBERS.join(', ')} may, because every other member must refuse`);
  if (quietMissing.length > 0) f.push(`${quietMissing.join(', ')} no longer answer through quiet (D4)`);
  latchFirst(cls, 'through', f);
  latchFirst(cls, 'quiet', f);
  stoppedFingerprint(sf, cls, f);
  return f;
}

/** True for an assignment of any operator, `++`, `--` or `delete` whose target is `this.<field>`. */
function writesField(n, field) {
  if (ts.isBinaryExpression(n) && n.operatorToken.kind >= ts.SyntaxKind.FirstAssignment && n.operatorToken.kind <= ts.SyntaxKind.LastAssignment) return isThisAccess(peel(n.left), field);
  if ((ts.isPrefixUnaryExpression(n) || ts.isPostfixUnaryExpression(n)) && [ts.SyntaxKind.PlusPlusToken, ts.SyntaxKind.MinusMinusToken].includes(n.operator)) return isThisAccess(peel(n.operand), field);
  if (ts.isDeleteExpression(n)) return isThisAccess(peel(n.expression), field);
  return false;
}

/**
 * S1's fix round clause: the fingerprint a stopped store answers does not move
 * and is never null. Its quiet fallback is `this.<field> ?? <const>` with the
 * const one string literal at the top of the file and bound once; its work is
 * exactly `() => (this.<field> = fingerprintOrNull(this.db))`; and the field
 * is private and written by that work alone. A fallback that can answer null
 * is the backup ring's "take one" at every poll once nothing can change the
 * file, which is the regression the fix round removed.
 */
function stoppedFingerprint(sf, cls, f) {
  const m = methodOf(cls, 'contentFingerprint');
  const s = m?.body?.statements.length === 1 ? m.body.statements[0] : undefined;
  const e = s !== undefined && ts.isReturnStatement(s) ? s.expression : undefined;
  const call = e !== undefined && ts.isCallExpression(e) && isThisAccess(e.expression, 'quiet') && e.arguments.length === 3 ? e : null;
  if (call === null) {
    f.push(`contentFingerprint is not one return of this.quiet with a fallback and its work, so the fingerprint a stopped store answers cannot be read (${m === null ? FILES.store : where(FILES.store, m)})`);
    return;
  }
  const at = where(FILES.store, call);
  const fallback = peel(call.arguments[1]);
  let field = null;
  let constName = null;
  if (fallback !== undefined && ts.isBinaryExpression(fallback) && fallback.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken) {
    const left = peel(fallback.left);
    const right = peel(fallback.right);
    if (left !== undefined && isThisAccess(left)) field = left.name.text;
    if (right !== undefined && ts.isIdentifier(right)) constName = right.text;
  }
  const constDecl =
    constName === null
      ? undefined
      : sf.statements
          .filter((st) => ts.isVariableStatement(st) && (st.declarationList.flags & ts.NodeFlags.Const) !== 0)
          .flatMap((st) => [...st.declarationList.declarations])
          .find((d) => ts.isIdentifier(d.name) && d.name.text === constName);
  const literal = constDecl?.initializer === undefined ? undefined : peel(constDecl.initializer);
  const constOk = literal !== undefined && ts.isStringLiteralLike(literal) && localBindings(sf, constName).length === 1;
  if (field === null || !constOk) {
    f.push(`contentFingerprint's fallback is \`${call.arguments[1].getText().slice(0, 60)}\`, not \`this.<field> ?? <a const holding one string>\`, so a stopped store can answer null, which the backup ring reads as "take one" at every poll past its floor: with the file fine that rotated every generation from before the stop out of the ring (the fix round, ${at})`);
    return;
  }
  const work = call.arguments[2];
  const body = isFunctionLike(work) && !ts.isBlock(work.body) ? peel(work.body) : undefined;
  const value = body !== undefined && ts.isBinaryExpression(body) ? peel(body.right) : undefined;
  const remembers =
    body !== undefined &&
    ts.isBinaryExpression(body) &&
    body.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
    isThisAccess(peel(body.left), field) &&
    value !== undefined &&
    ts.isCallExpression(value) &&
    ts.isIdentifier(value.expression) &&
    value.expression.text === 'fingerprintOrNull' &&
    value.arguments.length === 1 &&
    isThisAccess(peel(value.arguments[0]), 'db');
  if (!remembers) f.push(`contentFingerprint's work is not \`() => (this.${field} = fingerprintOrNull(this.db))\`, so the fingerprint a stopped store answers is not the one it last answered (${at})`);
  const decl = cls.members.find((el) => ts.isPropertyDeclaration(el) && memberName(el) === field);
  if (decl === undefined || !hasModifier(decl, ts.SyntaxKind.PrivateKeyword)) f.push(`ManifestStore.${field}, the fingerprint a stopped store answers, is not a private field of the class (${at})`);
  const writes = nodesOf(cls).filter((n) => writesField(n, field));
  if (writes.length !== 1) f.push(`this.${field} is written ${String(writes.length)} times in the class (${writes.map((n) => where(FILES.store, n)).join(', ') || 'nowhere'}); only contentFingerprint's work may write it, or what a stopped store answers can move after the stop`);
}

/** The fields the constructor hands the connection to: `this.X = new Y(…this.db…)`. */
function repositoryFields(cls) {
  const ctor = cls.members.find((el) => ts.isConstructorDeclaration(el));
  const out = new Set();
  if (ctor?.body === undefined) return out;
  for (const n of nodesOf(ctor.body)) {
    if (
      ts.isBinaryExpression(n) &&
      n.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      isThisAccess(n.left) &&
      ts.isNewExpression(n.right) &&
      (n.right.arguments ?? []).some((a) => isThisAccess(a, 'db'))
    ) {
      out.add(n.left.name.text);
    }
  }
  return out;
}
/** True when `node` sits in an arrow or function handed to `this.through(` or `this.quiet(`. */
function insideLatchArrow(node, cls) {
  for (let p = node.parent; p !== undefined && p !== cls; p = p.parent) {
    if (
      isFunctionLike(p) &&
      p.parent !== undefined &&
      ts.isCallExpression(p.parent) &&
      p.parent.arguments.includes(p) &&
      ts.isPropertyAccessExpression(p.parent.expression) &&
      isThis(p.parent.expression.expression) &&
      ['through', 'quiet'].includes(p.parent.expression.name.text)
    ) {
      return true;
    }
  }
  return false;
}
/**
 * True when a guarded field inside a latch arrow LEAVES it: anything but the
 * object of a property or element access (`this.sessions.listSessions()`) or an
 * argument of a call (`readSchemaState(this.db)`). An arrow that answers
 * `this.sessions` itself hands every caller a repository the latch no longer
 * stands in front of (the probe review's hostile copy G3, a member listed in
 * MANIFEST_OPERATIONS and one statement through the latch, green before this).
 */
function escapesArrow(n) {
  let node = n;
  let p = n.parent;
  while (p !== undefined && (ts.isParenthesizedExpression(p) || ts.isAsExpression(p) || ts.isNonNullExpression(p) || ts.isSatisfiesExpression(p))) {
    node = p;
    p = p.parent;
  }
  if (p === undefined) return true;
  if ((ts.isPropertyAccessExpression(p) || ts.isElementAccessExpression(p)) && p.expression === node) return false;
  if (ts.isCallExpression(p) && p.arguments.includes(node)) return false;
  return true;
}
/** `held.push(this.db)`, the connection its one argument. */
const isHeldPush = (n) =>
  n.parent !== undefined &&
  ts.isCallExpression(n.parent) &&
  n.parent.arguments.length === 1 &&
  n.parent.arguments[0] === n &&
  n.parent.expression.getText() === 'held.push';

export function ruleS2(tree) {
  const f = [];
  const store = storeClass(tree, f);
  if (store === null) return f;
  const { cls } = store;
  const repos = repositoryFields(cls);
  if (repos.size === 0) f.push('the constructor hands this.db to no repository, so this rule cannot see one');
  const guarded = new Set(['db', ...repos]);
  for (const el of cls.members) {
    if (ts.isPropertyDeclaration(el) && guarded.has(memberName(el)) && !hasModifier(el, ts.SyntaxKind.PrivateKeyword)) {
      f.push(`ManifestStore.${memberName(el)} is not private, so code outside the class can reach it past the latch (${where(FILES.store, el)})`);
    }
  }
  for (const n of nodesOf(cls)) {
    let name = null;
    if (ts.isPropertyAccessExpression(n) && isThis(n.expression) && guarded.has(n.name.text)) name = n.name.text;
    else if (ts.isElementAccessExpression(n) && isThis(n.expression) && ts.isStringLiteralLike(n.argumentExpression) && guarded.has(n.argumentExpression.text)) name = n.argumentExpression.text;
    else if (ts.isVariableDeclaration(n) && n.initializer !== undefined && isThis(n.initializer) && ts.isObjectBindingPattern(n.name)) {
      const taken = n.name.elements.map((e) => (e.propertyName ?? e.name).getText()).filter((x) => guarded.has(x));
      if (taken.length > 0) f.push(`this is destructured for ${taken.join(', ')} (${where(FILES.store, n)}), which hands the connection out of reach of the latch`);
      continue;
    } else continue;
    // A field's own declaration is not a reach.
    if (ts.isPropertyDeclaration(n.parent) && n.parent.name === n) continue;
    const member = memberOf(n, cls);
    if (member === null) continue;
    const owner = memberName(member);
    if (ts.isConstructorDeclaration(member)) continue;
    if (owner === 'close' && name === 'db') continue;
    if (insideLatchArrow(n, cls)) {
      if (escapesArrow(n)) f.push(`${owner === '' ? 'a member' : owner} hands this.${name} itself out of the arrow it gives through or quiet (${where(FILES.store, n)}), so its callers reach it past the latch`);
      continue;
    }
    if (name === 'db' && owner === 'latch' && isHeldPush(n)) continue;
    f.push(`${owner === '' ? 'a member' : owner} reaches this.${name} outside the arrow it hands to through or quiet (${where(FILES.store, n)})`);
  }
  return f;
}

// ---------------------------------------------------------------------------
// S3 and S4: the one catch, and the classifier
// ---------------------------------------------------------------------------

/**
 * True for `insertSession` itself, and for a private method of its class that
 * only `insertSession` calls: the catch sits in `insertSessionRow`, which the
 * repository split out so the statement and its wrapping both sit inside the
 * durable transaction (sessions-repository.ts, its comment says why).
 */
function insertSessionOwns(method) {
  const name = memberName(method);
  if (name === 'insertSession') return true;
  if (!hasModifier(method, ts.SyntaxKind.PrivateKeyword)) return false;
  const cls = method.parent;
  if (cls === undefined || !ts.isClassDeclaration(cls)) return false;
  const calls = nodesOf(cls).filter((x) => ts.isCallExpression(x) && isThisAccess(x.expression, name));
  return calls.length > 0 && calls.every((c) => memberName(memberOf(c, cls) ?? cls) === 'insertSession');
}

export function ruleS3(tree) {
  const f = [];
  const catches = [];
  for (const rel of FILES.repositories) {
    const sf = sfOf(tree, rel);
    if (sf === null) {
      f.push(`${rel} is missing`);
      continue;
    }
    for (const n of nodesOf(sf)) {
      if (ts.isCatchClause(n)) catches.push({ rel, n });
      if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && n.expression.name.text === 'catch') {
        f.push(`${where(rel, n)} hands a promise to .catch(, which would hold a broken connection away from the latch`);
      }
    }
  }
  if (catches.length !== 1) {
    f.push(`the six repository files hold ${String(catches.length)} catch clauses; exactly one may, in insertSession (${catches.map((c) => where(c.rel, c.n)).join(', ')})`);
  }
  for (const { rel, n } of catches) {
    const method = ancestor(n, (p) => ts.isMethodDeclaration(p));
    if (rel !== FILES.sessionsRepository || method === null || !insertSessionOwns(method)) {
      f.push(`${where(rel, n)} is a catch outside insertSession, so an error it holds never reaches the store's latch`);
      continue;
    }
    const v = n.variableDeclaration !== undefined && ts.isIdentifier(n.variableDeclaration.name) ? n.variableDeclaration.name.text : null;
    const first = n.block.statements[0];
    const ok =
      v !== null &&
      first !== undefined &&
      ts.isIfStatement(first) &&
      first.elseStatement === undefined &&
      isCallOfWith(first.expression, 'isBrokenConnectionError', v) &&
      isThrowOf(first.thenStatement, v);
    if (!ok) f.push(`insertSession's catch does not begin \`if (isBrokenConnectionError(${v ?? 'err'})) throw ${v ?? 'err'};\` (${where(rel, n)}), so a broken connection is wrapped as INVALID_INPUT and its code never reaches the latch (§0.1 item 6)`);
  }
  const repo = sfOf(tree, FILES.sessionsRepository);
  if (repo !== null) {
    if (!importsName(repo, 'isBrokenConnectionError', ['../db/integrity'])) f.push(`${FILES.sessionsRepository} does not import isBrokenConnectionError from ../db/integrity`);
    const local = localBindings(repo, 'isBrokenConnectionError');
    if (local.length > 0) f.push(`${where(FILES.sessionsRepository, local[0])} declares its own isBrokenConnectionError, which shadows the classifier`);
  }
  return f;
}

/** The string literals a function reads, with the consts at the top of its file it names resolved once. */
function literalsOf(sf, body) {
  const out = [...nodesOf(body).filter((n) => ts.isStringLiteralLike(n))];
  const names = new Set(nodesOf(body).filter((n) => ts.isIdentifier(n)).map((n) => n.text));
  for (const s of sf.statements) {
    if (!ts.isVariableStatement(s)) continue;
    for (const d of s.declarationList.declarations) {
      if (ts.isIdentifier(d.name) && names.has(d.name.text) && d.initializer !== undefined && !isFunctionLike(d.initializer)) {
        out.push(...nodesOf(d.initializer).filter((n) => ts.isStringLiteralLike(n)));
      }
    }
  }
  return out;
}

export function ruleS4(tree) {
  const f = [];
  const sf = sfOf(tree, FILES.integrity);
  if (sf === null) return [`${FILES.integrity} is missing`];
  const decls = functionsNamed(sf, 'isBrokenConnectionError');
  if (decls.length !== 1) return [`isBrokenConnectionError is declared ${String(decls.length)} times in ${FILES.integrity}, not once`];
  const decl = decls[0];
  const exported = ts.isFunctionDeclaration(decl) ? hasModifier(decl, ts.SyntaxKind.ExportKeyword) : hasModifier(decl.parent.parent, ts.SyntaxKind.ExportKeyword);
  if (!exported) f.push('isBrokenConnectionError is not exported');
  const body = bodyOf(decl);
  if (body === null) return [...f, 'isBrokenConnectionError has no body'];
  const nodes = nodesOf(body);
  const instance = nodes.some((n) => ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.InstanceOfKeyword && /SqliteError$/.test(n.right.getText()));
  if (!instance) f.push(`isBrokenConnectionError does not ask \`instanceof … SqliteError\`, so a typed error of Tortie's carrying the code would latch the store (${where(FILES.integrity, decl)})`);
  if (!nodes.some((n) => ts.isPropertyAccessExpression(n) && n.name.text === 'code')) f.push('isBrokenConnectionError does not read .code');
  for (const n of nodes) {
    const bad =
      (ts.isPropertyAccessExpression(n) && ['message', 'stack', 'toString', 'includes', 'match', 'matchAll', 'test', 'search'].includes(n.name.text)) ||
      (ts.isElementAccessExpression(n) && ts.isStringLiteralLike(n.argumentExpression) && ['message', 'stack'].includes(n.argumentExpression.text)) ||
      ts.isTemplateExpression(n) ||
      ts.isRegularExpressionLiteral(n) ||
      (ts.isCallExpression(n) && ['String', 'JSON.stringify'].includes(n.expression.getText()));
    if (bad) f.push(`isBrokenConnectionError reads \`${n.getText().slice(0, 60)}\` (${where(FILES.integrity, n)}); it is decided by the class and the code, never by text`);
  }
  const eq = new Set();
  const prefix = new Set();
  for (const lit of literalsOf(sf, body)) {
    const p = lit.parent;
    const typeofSide =
      p !== undefined && ts.isBinaryExpression(p) && [ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.EqualsEqualsToken].includes(p.operatorToken.kind) &&
      (ts.isTypeOfExpression(p.left) || ts.isTypeOfExpression(p.right));
    if (typeofSide && ['string', 'object'].includes(lit.text)) continue;
    if (p !== undefined && ts.isBinaryExpression(p) && [ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.EqualsEqualsToken].includes(p.operatorToken.kind)) {
      eq.add(lit.text);
      continue;
    }
    if (p !== undefined && ts.isCallExpression(p) && ts.isPropertyAccessExpression(p.expression) && p.expression.name.text === 'startsWith' && p.arguments[0] === lit) {
      prefix.add(lit.text);
      continue;
    }
    f.push(`isBrokenConnectionError reads the literal '${lit.text}' outside an equality or a startsWith (${where(FILES.integrity, lit)})`);
  }
  const same = (a, b) => a.size === b.length && b.every((x) => a.has(x));
  if (!same(eq, D1_EQUALS)) f.push(`isBrokenConnectionError compares the code with ${[...eq].join(', ') || 'nothing'}; D1 is exactly ${D1_EQUALS.join(' and ')} (an I/O error is out on purpose, D2)`);
  if (!same(prefix, D1_PREFIX)) f.push(`isBrokenConnectionError asks the prefix ${[...prefix].join(', ') || 'nothing'}; D1 is exactly ${D1_PREFIX.join(', ')}`);
  return f;
}

// ---------------------------------------------------------------------------
// S5: close, the held connections, the count
// ---------------------------------------------------------------------------

/**
 * One expression's value over one latch state: `{ b: true|false|'?' }` for a
 * truth, `{ v: … }` for a value, `{ v: '?' }` when it cannot be known.
 */
function valueOf(e, stopped) {
  const UNKNOWN = { v: '?' };
  if (ts.isParenthesizedExpression(e)) return valueOf(e.expression, stopped);
  if (e.kind === ts.SyntaxKind.NullKeyword) return { v: null };
  if (ts.isIdentifier(e) && e.text === 'undefined') return { v: undefined };
  if (ts.isStringLiteralLike(e)) return { v: e.text };
  if (e.kind === ts.SyntaxKind.TrueKeyword) return { v: true };
  if (e.kind === ts.SyntaxKind.FalseKeyword) return { v: false };
  if (isThisAccess(e, 'stopped')) return { v: stopped };
  if (ts.isPropertyAccessExpression(e) && isThisAccess(e.expression, 'stopped') && e.name.text === 'file') {
    if (stopped === null) return e.questionDotToken !== undefined ? { v: undefined } : UNKNOWN;
    return { v: stopped.file };
  }
  if (ts.isPrefixUnaryExpression(e) && e.operator === ts.SyntaxKind.ExclamationToken) {
    const t = truth(e.operand, stopped);
    return { v: t === '?' ? '?' : !t };
  }
  if (ts.isBinaryExpression(e)) {
    const op = e.operatorToken.kind;
    if (op === ts.SyntaxKind.AmpersandAmpersandToken || op === ts.SyntaxKind.BarBarToken) {
      const l = truth(e.left, stopped);
      if (op === ts.SyntaxKind.AmpersandAmpersandToken && l === false) return { v: false };
      if (op === ts.SyntaxKind.BarBarToken && l === true) return { v: true };
      const r = truth(e.right, stopped);
      if (l === '?' || r === '?') {
        if (op === ts.SyntaxKind.AmpersandAmpersandToken && r === false) return { v: false };
        if (op === ts.SyntaxKind.BarBarToken && r === true) return { v: true };
        return UNKNOWN;
      }
      return { v: r };
    }
    const eqOps = [ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken, ts.SyntaxKind.EqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsToken];
    if (eqOps.includes(op)) {
      const l = valueOf(e.left, stopped);
      const r = valueOf(e.right, stopped);
      if (l.v === '?' || r.v === '?') return UNKNOWN;
      const loose = op === ts.SyntaxKind.EqualsEqualsToken || op === ts.SyntaxKind.ExclamationEqualsToken;
      const same = loose ? l.v == r.v : l.v === r.v; // eslint-disable-line eqeqeq
      const negated = op === ts.SyntaxKind.ExclamationEqualsEqualsToken || op === ts.SyntaxKind.ExclamationEqualsToken;
      // An object compared with a literal is never equal; the comparison is known.
      return { v: negated ? !same : same };
    }
  }
  return UNKNOWN;
}
function truth(e, stopped) {
  const v = valueOf(e, stopped).v;
  if (v === '?') return '?';
  return Boolean(v);
}
const isDbClose = (e) => e !== undefined && ts.isCallExpression(e) && e.arguments.length === 0 && e.expression.getText() === 'this.db.close';

/** Every path through `stmts` under one latch state: `{ closed, ended }`, or a reason it cannot be read. */
function pathsOf(stmts, stopped, start = [{ closed: false, ended: false }]) {
  let paths = start;
  for (const s of stmts) {
    const next = [];
    for (const p of paths) {
      if (p.ended) {
        next.push(p);
        continue;
      }
      const r = stepOf(s, stopped, p);
      if (typeof r === 'string') return r;
      next.push(...r);
    }
    paths = next;
  }
  return paths;
}
function stepOf(s, stopped, p) {
  const names = s.getText().includes('this.db.close');
  if (ts.isBlock(s)) return pathsOf(s.statements, stopped, [p]);
  if (ts.isExpressionStatement(s)) {
    if (isDbClose(s.expression)) return [{ ...p, closed: true }];
    return names ? `close reaches this.db.close other than as a statement of its own (\`${s.getText().slice(0, 60)}\`)` : [p];
  }
  if (ts.isReturnStatement(s)) {
    if (s.expression !== undefined && isDbClose(s.expression)) return [{ closed: true, ended: true }];
    return names ? 'close returns through this.db.close in a way this rule cannot read' : [{ ...p, ended: true }];
  }
  if (ts.isThrowStatement(s)) return [{ ...p, ended: true }];
  if (ts.isIfStatement(s)) {
    const t = truth(s.expression, stopped);
    const out = [];
    for (const branch of t === '?' ? [true, false] : [t]) {
      const stmt = branch ? s.thenStatement : s.elseStatement;
      if (stmt === undefined) {
        out.push(p);
        continue;
      }
      const r = pathsOf([stmt], stopped, [p]);
      if (typeof r === 'string') return r;
      out.push(...r);
    }
    return out;
  }
  if (ts.isVariableStatement(s) || ts.isEmptyStatement(s)) return names ? 'close names this.db.close inside a declaration' : [p];
  return names ? `close reaches this.db.close inside a ${ts.SyntaxKind[s.kind]}, which this rule cannot read` : [p];
}

const LATCH_STATES = Object.freeze([
  { label: 'not stopped', stopped: null, closes: true },
  { label: 'stopped with the file damaged', stopped: { file: 'damaged' }, closes: true },
  { label: 'stopped with the file unreadable', stopped: { file: 'unreadable' }, closes: true },
  { label: 'stopped with the file fine', stopped: { file: 'fine' }, closes: false }
]);

export function ruleS5(tree) {
  const f = [];
  const store = storeClass(tree, f);
  if (store === null) return f;
  const { sf, cls } = store;
  const close = methodOf(cls, 'close');
  if (close === null || close.body === undefined) f.push('ManifestStore has no close with a body');
  else {
    for (const state of LATCH_STATES) {
      const paths = pathsOf(close.body.statements, state.stopped);
      if (typeof paths === 'string') {
        f.push(`${paths} (${where(FILES.store, close)})`);
        break;
      }
      const all = paths.every((x) => x.closed);
      const none = paths.every((x) => !x.closed);
      if (state.closes && !all) f.push(`close does not close the connection on every path when ${state.label}, which today's quit does (D11)`);
      if (!state.closes && !none) f.push(`close closes the connection on some path when ${state.label}; that close walks the damaged page cache and is what crashed his quit (D10)`);
    }
  }
  // `held`: declared once at the top of the file, pushed once in latch under === 'fine', read once for its length.
  const heldDecls = sf.statements.filter((s) => ts.isVariableStatement(s) && s.declarationList.declarations.some((d) => ts.isIdentifier(d.name) && d.name.text === 'held'));
  if (heldDecls.length !== 1) f.push(`held is declared ${String(heldDecls.length)} times at the top of ${FILES.store}, not once`);
  else if ((heldDecls[0].declarationList.flags & ts.NodeFlags.Const) === 0) f.push('held is not a const, so it can be replaced and its connections collected');
  const uses = nodesOf(sf).filter((n) => ts.isIdentifier(n) && n.text === 'held' && !(ts.isVariableDeclaration(n.parent) && n.parent.name === n));
  let pushes = 0;
  let lengths = 0;
  for (const u of uses) {
    const p = u.parent;
    if (ts.isPropertyAccessExpression(p) && p.expression === u && p.name.text === 'push' && ts.isCallExpression(p.parent) && p.parent.expression === p) {
      pushes += 1;
      const call = p.parent;
      const owner = ancestor(call, (x) => ts.isMethodDeclaration(x));
      const guard = ancestor(call, (x) => ts.isIfStatement(x), owner ?? undefined);
      const argOk = call.arguments.length === 1 && isThisAccess(call.arguments[0], 'db');
      const guardOk =
        guard !== null &&
        guard.elseStatement === undefined &&
        (guard.thenStatement === call.parent || (ts.isBlock(guard.thenStatement) && nodesOf(guard.thenStatement).includes(call))) &&
        isFineTest(guard.expression);
      if (owner === null || memberName(owner) !== 'latch' || !argOk) f.push(`held.push( at ${where(FILES.store, call)} is not the latch's push of this.db`);
      else if (!guardOk) f.push(`the latch pushes the connection onto held for every verdict, not only when the file is fine (${where(FILES.store, call)}); a damaged file's connection must close at quit as today (D11)`);
      continue;
    }
    if (ts.isPropertyAccessExpression(p) && p.expression === u && p.name.text === 'length' && !(ts.isBinaryExpression(p.parent) && p.parent.left === p)) {
      lengths += 1;
      continue;
    }
    f.push(`held is used at ${where(FILES.store, u)} (\`${p.getText().slice(0, 50)}\`), and nothing may empty it or hand it on, or the collector closes a damaged connection anyway`);
  }
  if (pushes !== 1) f.push(`held is pushed ${String(pushes)} times, not once`);
  const left = functionsNamed(sf, 'manifestConnectionsLeftOpen');
  const body = left.length === 1 ? bodyOf(left[0]) : null;
  const ret = body !== null && ts.isBlock(body) && body.statements.length === 1 && ts.isReturnStatement(body.statements[0]) ? body.statements[0].expression : undefined;
  if (left.length !== 1 || ret === undefined || ret.getText() !== 'held.length') f.push('manifestConnectionsLeftOpen is not one function answering `return held.length;`');
  else if (lengths !== 1) f.push(`held.length is read ${String(lengths)} times, not once`);
  return f;
}
/** `<x> === 'fine'` or `'fine' === <x>`, alone or in an `&&` chain with no `||`. */
function isFineTest(e) {
  const x = peel(e);
  if (ts.isBinaryExpression(x) && x.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) return isFineTest(x.left) || isFineTest(x.right);
  return (
    ts.isBinaryExpression(x) &&
    x.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken &&
    ((ts.isStringLiteralLike(x.right) && x.right.text === 'fine') || (ts.isStringLiteralLike(x.left) && x.left.text === 'fine')) &&
    !x.getText().includes('||')
  );
}

// ---------------------------------------------------------------------------
// S6 and S7: the quit's last branch, and the one relaunch
// ---------------------------------------------------------------------------

export function ruleS6(tree) {
  const f = [];
  const sf = sfOf(tree, FILES.capabilities);
  if (sf === null) return [`${FILES.capabilities} is missing`];
  const fns = functionsNamed(sf, 'disposeMainCapabilities');
  if (fns.length !== 1) return [`disposeMainCapabilities is declared ${String(fns.length)} times, not once`];
  const body = bodyOf(fns[0]);
  const stmts = stmtsOf(body);
  if (stmts === null || stmts.length < 2) return ['disposeMainCapabilities has no statements to read'];
  const last = stmts[stmts.length - 1];
  if (!(ts.isReturnStatement(last) && last.expression !== undefined && ts.isStringLiteralLike(last.expression) && last.expression.text === 'proceed')) {
    f.push("disposeMainCapabilities does not end `return 'proceed';`");
    return f;
  }
  const asks = callsOf(fns[0], 'manifestConnectionsLeftOpen');
  if (asks.length !== 1) f.push(`disposeMainCapabilities asks manifestConnectionsLeftOpen() ${String(asks.length)} times, not once`);
  const inFile = callsOf(sf, 'manifestConnectionsLeftOpen');
  if (inFile.length !== asks.length) f.push(`${FILES.capabilities} asks manifestConnectionsLeftOpen() outside the disposer too`);
  const branch = stmts[stmts.length - 2];
  const isBranch = ts.isIfStatement(branch) && callsOf(branch.expression, 'manifestConnectionsLeftOpen').length === 1 && branch.elseStatement === undefined;
  if (!isBranch) {
    f.push(`the statement immediately before disposeMainCapabilities' last \`return 'proceed'\` is not the branch that asks manifestConnectionsLeftOpen() (${where(FILES.capabilities, branch)}), so the hard exit does not come after every other step of the disposer (D12)`);
    return f;
  }
  // The branch asks for ANY connection left open. `> 1` would close his one
  // held connection at environment teardown (the probe review's hostile copy G7,
  // green on this rule before it was added; the relaunch-and-quit test holds it
  // too, with one connection held).
  const LEFT_OPEN_TESTS = ['manifestConnectionsLeftOpen()>0', 'manifestConnectionsLeftOpen()!==0', 'manifestConnectionsLeftOpen()>=1', '0<manifestConnectionsLeftOpen()'];
  if (!LEFT_OPEN_TESTS.includes(peel(branch.expression).getText().replace(/\s+/g, ''))) {
    f.push(`the branch asks \`${branch.expression.getText().slice(0, 60)}\`, not \`manifestConnectionsLeftOpen() > 0\` (${where(FILES.capabilities, branch)}), so one connection left open would be closed at teardown`);
  }
  const inner = ts.isBlock(branch.thenStatement) ? [...branch.thenStatement.statements] : [branch.thenStatement];
  const tail = inner.slice(-3).map((s) => s.getText().replace(/\s+/g, ''));
  const want = ['clearLogRunSentinel();', "process.kill(process.pid,'SIGKILL');", "return'killed';"];
  if (tail.length !== 3 || tail.some((t, i) => t !== want[i])) {
    f.push(`the branch does not end \`clearLogRunSentinel(); process.kill(process.pid, 'SIGKILL'); return 'killed';\` in that order (${where(FILES.capabilities, branch)}); without the clear the next launch says Tortie crashed, and without the kill something closes the damaged connection`);
  }
  return f;
}

/** The `handle(ipcMain, '<channel>', <fn>)` registration's handler, or null. */
function handlerFor(sf, channel) {
  for (const n of nodesOf(sf)) {
    if (!ts.isCallExpression(n)) continue;
    const at = n.arguments.findIndex((a) => ts.isStringLiteralLike(a) && a.text === channel);
    if (at === -1) continue;
    const fn = n.arguments.slice(at + 1).find((a) => isFunctionLike(a));
    if (fn !== undefined) return fn;
  }
  return null;
}
/** True when `stmt` is `if (<cond>) …return…` with no else and `test(cond)`. */
const isReturnGuard = (stmt, test) => stmt !== undefined && ts.isIfStatement(stmt) && stmt.elseStatement === undefined && endsInReturn(stmt.thenStatement) && test(peel(stmt.expression));

export function ruleS7(tree) {
  const f = [];
  // The main half: one app.relaunch( under src/main.
  const mainCalls = [];
  for (const { rel, sf } of filesNaming(tree, 'src/main/', 'relaunch')) {
    for (const n of nodesOf(sf)) {
      if (ts.isPropertyAccessExpression(n) && n.name.text === 'relaunch' && /(^|\.)app$/.test(n.expression.getText())) {
        const called = ts.isCallExpression(n.parent) && n.parent.expression === n;
        if (called) mainCalls.push({ rel, n: n.parent });
        else f.push(`${where(rel, n)} names app.relaunch other than to call it, so a second caller could hide behind a name`);
      }
      // The two spellings that reach it without a property access (the probe
      // review's hostile copies G8a and G8b, green on this rule before them).
      if (ts.isElementAccessExpression(n) && ts.isStringLiteralLike(n.argumentExpression) && n.argumentExpression.text === 'relaunch' && /(^|\.)app$/.test(n.expression.getText())) {
        f.push(`${where(rel, n)} reaches app['relaunch'] by its key, so a second caller could hide behind the spelling`);
      }
      if (ts.isBindingElement(n) && (n.propertyName ?? n.name).getText() === 'relaunch') {
        const decl = ancestor(n, (p) => ts.isVariableDeclaration(p));
        if (decl !== null && decl.initializer !== undefined && /(^|\.)app$/.test(peel(decl.initializer).getText())) {
          f.push(`${where(rel, n)} destructures relaunch out of app, so a second caller could hide behind a name`);
        }
      }
    }
  }
  if (mainCalls.length !== 1) {
    f.push(`app.relaunch( is called ${String(mainCalls.length)} times under src/main (${mainCalls.map((c) => where(c.rel, c.n)).join(', ')}); exactly one may, in the app:relaunch handler, because no other surface may become a restart (D13)`);
  }
  const caps = sfOf(tree, FILES.capabilities);
  const handler = caps === null ? null : handlerFor(caps, 'app:relaunch');
  if (handler === null) f.push(`${FILES.capabilities} registers no app:relaunch handler`);
  else {
    const stmts = stmtsOf(handler.body);
    const call = mainCalls.find((c) => c.rel === FILES.capabilities && ancestor(c.n, (p) => p === handler) !== null);
    if (stmts === null || call === undefined) f.push('the one app.relaunch( is not inside the app:relaunch handler');
    else {
      const at = stmts.findIndex((s) => nodesOf(s).includes(call.n));
      const before = stmts.slice(0, at);
      const noticeGuard = before.some((s) =>
        isReturnGuard(s, (c) => ts.isPrefixUnaryExpression(c) && c.operator === ts.SyntaxKind.ExclamationToken && /^hasSaidNotice\((['"])manifest-stopped\1\)$/.test(peel(c.operand).getText()))
      );
      const harnessGuard = before.some((s) => isReturnGuard(s, (c) => c.getText().replace(/\s+/g, '') === 'isHarnessLaunch(process.env)'));
      if (!noticeGuard) f.push("the app:relaunch handler relaunches without first returning when `!hasSaidNotice('manifest-stopped')`, so any caller could restart the app (D13)");
      if (!harnessGuard) f.push('the app:relaunch handler relaunches without first returning on `isHarnessLaunch(process.env)`; a relaunch outlives every harness teardown (§2.4, D14)');
    }
    if (!importsName(caps, 'hasSaidNotice', ['./notice']) || localBindings(caps, 'hasSaidNotice').length > 0) f.push(`${FILES.capabilities} does not import hasSaidNotice from ./notice, unshadowed`);
    if (!importsName(caps, 'isHarnessLaunch', ['./harness/launch-gate']) || localBindings(caps, 'isHarnessLaunch').length > 0) f.push(`${FILES.capabilities} does not import isHarnessLaunch from ./harness/launch-gate, unshadowed`);
  }
  // The renderer half: one relaunch( under src/renderer, in the manifest-stopped arm's action.
  const rendererCalls = [];
  for (const { rel, sf } of filesNaming(tree, 'src/renderer/', 'relaunch')) {
    for (const n of callsOf(sf, 'relaunch')) rendererCalls.push({ rel, n });
  }
  if (rendererCalls.length !== 1) {
    f.push(`relaunch( is called ${String(rendererCalls.length)} times under src/renderer (${rendererCalls.map((c) => where(c.rel, c.n)).join(', ')}); exactly one may, the notice's Restart`);
  }
  for (const { rel, n } of rendererCalls) {
    const run = ancestor(n, (p) => ts.isPropertyAssignment(p) && memberName(p) === 'run');
    const action = run === null ? null : ancestor(run, (p) => ts.isPropertyAssignment(p) && memberName(p) === 'action');
    const arm = ancestor(
      n,
      (p) =>
        (ts.isIfStatement(p) && nodesOf(p.expression).some((x) => ts.isStringLiteralLike(x) && x.text === 'manifest-stopped')) ||
        (ts.isCaseClause(p) && ts.isStringLiteralLike(p.expression) && p.expression.text === 'manifest-stopped')
    );
    if (run === null || action === null || arm === null) f.push(`${where(rel, n)} calls relaunch( outside the manifest-stopped arm's action`);
  }
  return f;
}

// ---------------------------------------------------------------------------
// S8: the seam's one setter, and its refusals DRIVEN
// ---------------------------------------------------------------------------

/** The source text of `manifestFaultPath` in a tree, `export` taken off, or null. */
function faultPathText(tree) {
  const sf = sfOf(tree, FILES.seam);
  if (sf === null) return null;
  const decls = functionsNamed(sf, 'manifestFaultPath').filter((d) => ts.isFunctionDeclaration(d));
  if (decls.length !== 1) return null;
  return decls[0].getText().replace(/^export\s+/, '');
}

/** What the driven half answered, by the function text it drove. Filled once, before any rule runs. */
const driven = new Map();
let drivenModule = null;
let drivenWhy = '';
let drivenCases = [];

export function ruleS8(tree) {
  const f = [];
  // The one setter.
  const callers = [];
  for (const { rel, sf } of filesNaming(tree, 'src/', 'setManifestFaultHook')) {
    for (const n of nodesOf(sf)) {
      if (!ts.isIdentifier(n) || n.text !== 'setManifestFaultHook') continue;
      const p = n.parent;
      if (rel === FILES.store && ts.isFunctionDeclaration(p) && p.name === n) continue;
      if (rel === FILES.seam && ts.isImportSpecifier(p)) continue;
      if (ts.isCallExpression(p) && p.expression === n) {
        callers.push({ rel, n: p });
        continue;
      }
      f.push(`${where(rel, n)} names setManifestFaultHook other than to call it, so a second setter could hide behind a name`);
    }
  }
  const store = sfOf(tree, FILES.store);
  if (store !== null && functionsNamed(store, 'setManifestFaultHook').length !== 1) f.push(`${FILES.store} does not declare setManifestFaultHook once`);
  if (callers.length !== 1 || callers[0].rel !== FILES.seam) {
    f.push(`setManifestFaultHook( has ${String(callers.length)} production callers (${callers.map((c) => where(c.rel, c.n)).join(', ')}); exactly one may, installManifestFault, behind the seam's refusals`);
  }
  const seam = sfOf(tree, FILES.seam);
  if (seam === null) return [...f, `${FILES.seam} is missing`];
  const installs = functionsNamed(seam, 'installManifestFault');
  const install = installs.length === 1 ? installs[0] : null;
  const stmts = install === null ? null : stmtsOf(bodyOf(install));
  if (stmts === null) f.push('installManifestFault is not declared once with a body');
  else {
    const first = stmts[0];
    const second = stmts[1];
    const pathVar =
      first !== undefined && ts.isVariableStatement(first) && first.declarationList.declarations.length === 1 && ts.isIdentifier(first.declarationList.declarations[0].name)
        ? first.declarationList.declarations[0]
        : null;
    const asks = pathVar !== null && pathVar.initializer !== undefined && /^manifestFaultPath\(process\.env,app\.getPath\((['"])userData\1\)\)$/.test(pathVar.initializer.getText().replace(/\s+/g, ''));
    const name = pathVar?.name.text ?? '';
    const returns = isReturnGuard(second, (c) => ts.isBinaryExpression(c) && c.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken && c.left.getText() === name && c.right.kind === ts.SyntaxKind.NullKeyword);
    const setIdx = stmts.findIndex((s) => ts.isExpressionStatement(s) && ts.isCallExpression(s.expression) && s.expression.expression.getText() === 'setManifestFaultHook');
    if (!asks || !returns) f.push("installManifestFault does not begin `const <path> = manifestFaultPath(process.env, app.getPath('userData')); if (<path> === null) return;`");
    if (setIdx < 2) f.push('installManifestFault does not set the hook as a statement of its own after the refusals answered, so a launch the seam refuses could still arm it');
    const allSets = callsOf(install, 'setManifestFaultHook');
    if (allSets.length !== 1) f.push(`installManifestFault calls setManifestFaultHook ${String(allSets.length)} times, not once`);
  }
  // manifestFaultPath reads only its parameters, its own locals and the two predicates, so the text driven is the function that ships.
  const fp = functionsNamed(seam, 'manifestFaultPath');
  if (fp.length !== 1 || !ts.isFunctionDeclaration(fp[0])) f.push('manifestFaultPath is not declared once as a function');
  else {
    const fn = fp[0];
    const own = new Set([...fn.parameters.map((p) => p.name.getText()), ...nodesOf(fn).filter((n) => ts.isVariableDeclaration(n)).map((n) => n.name.getText())]);
    const allowed = new Set(['isIsolatedLaunch', 'isInside', 'undefined']);
    for (const n of nodesOf(fn.body)) {
      if (!ts.isIdentifier(n)) continue;
      const p = n.parent;
      if ((ts.isPropertyAccessExpression(p) && p.name === n) || (ts.isVariableDeclaration(p) && p.name === n)) continue;
      if (!own.has(n.text) && !allowed.has(n.text)) f.push(`manifestFaultPath reads ${n.text} (${where(FILES.seam, n)}), which is neither its own nor one of the two predicates, so the text this rule drives may not be the function that ships`);
    }
    if (!importsName(seam, 'isIsolatedLaunch', ['./launch-gate'])) f.push(`${FILES.seam} does not import isIsolatedLaunch from ./launch-gate`);
    if (!importsName(seam, 'isInside', ['./fold-stub'])) f.push(`${FILES.seam} does not import isInside from ./fold-stub`);
  }
  // The driven half.
  const text = faultPathText(tree);
  if (text === null) f.push('there is no manifestFaultPath to drive');
  else {
    const results = driven.get(text);
    if (results === undefined) f.push(`manifestFaultPath was not driven: ${drivenWhy || 'the driven half printed no answer'}`);
    else {
      for (const r of results) {
        if (r.got !== r.want) f.push(`(driven) ${r.case}: answered ${JSON.stringify(r.got)}, must answer ${JSON.stringify(r.want)}`);
      }
      if (results.length < 12) f.push(`(driven) only ${String(results.length)} environment shapes were driven`);
    }
  }
  return f;
}

/** The shipped tree's own export, driven beside its text. Asked once, of the unedited tree. */
function moduleAgreement(tree) {
  const text = faultPathText(tree);
  const fromText = text === null ? undefined : driven.get(text);
  if (drivenModule === null) return [`(driven) the shipped module could not be driven: ${drivenWhy || 'no answer'}`];
  if (fromText === undefined) return [];
  const out = [];
  for (const r of drivenModule) {
    const twin = fromText.find((x) => x.case === r.case);
    if (twin === undefined || twin.got !== r.got) out.push(`(driven) the shipped manifestFaultPath answers ${JSON.stringify(r.got)} for "${r.case}" where its source text answers ${JSON.stringify(twin?.got)}`);
  }
  return out;
}

/**
 * Drive every distinct `manifestFaultPath` text in ONE pinned tsx, over every
 * environment shape, in a scratch folder this function makes and removes.
 */
function driveFaultPaths(texts) {
  const scratch = realpathSync(mkdtempSync(join(tmpdir(), 'p357-s8-')));
  try {
    const harness = join(scratch, 'run');
    const profile = join(harness, 'profile');
    const decoy = join(`${harness}-elsewhere`, 'profile');
    mkdirSync(profile, { recursive: true });
    mkdirSync(decoy, { recursive: true });
    const fault = join(harness, 'fault.json');
    const alias = (p) => (p.startsWith('/private/var/') ? p.slice('/private'.length) : null);
    const base = { GMUX_HARNESS_MANIFEST_FAULT: fault, GMUX_HARNESS_DIR: harness };
    const cases = [
      ['no harness term', { ...base }, profile, null],
      ['GMUX_PROBES=0', { ...base, GMUX_PROBES: '0' }, profile, null],
      ['GMUX_PROBES empty', { ...base, GMUX_PROBES: '' }, profile, null],
      ['GMUX_PROBES=true', { ...base, GMUX_PROBES: 'true' }, profile, null],
      ['GMUX_PROBES=" 1"', { ...base, GMUX_PROBES: ' 1' }, profile, null],
      ['GMUX_UPDATE_REHEARSAL alone', { ...base, GMUX_UPDATE_REHEARSAL: '1' }, profile, null],
      ['no GMUX_HARNESS_DIR', { GMUX_HARNESS_MANIFEST_FAULT: fault, GMUX_PROBES: '1' }, profile, null],
      ['an empty GMUX_HARNESS_DIR', { ...base, GMUX_HARNESS_DIR: '', GMUX_PROBES: '1' }, profile, null],
      ['no fault file named', { GMUX_HARNESS_DIR: harness, GMUX_PROBES: '1' }, profile, null],
      ['a profile outside it (a sibling whose name starts with it)', { ...base, GMUX_PROBES: '1' }, decoy, null],
      ['a profile outside it (its parent)', { ...base, GMUX_PROBES: '1' }, scratch, null],
      ["a person's profile", { ...base, GMUX_SMOKE: 'basic' }, '/Users/somebody/Library/Application Support/Tortie', null],
      ['all three present, GMUX_PROBES=1', { ...base, GMUX_PROBES: '1' }, profile, fault],
      ['all three present, GMUX_SMOKE', { ...base, GMUX_SMOKE: 'basic' }, profile, fault],
      ['all three present, GMUX_SHOT', { ...base, GMUX_SHOT: join(scratch, 'x.png') }, profile, fault]
    ];
    if (alias(harness) !== null) {
      cases.push(
        ['a profile outside it, under the /var spelling', { ...base, GMUX_HARNESS_DIR: alias(harness), GMUX_PROBES: '1' }, alias(decoy), null],
        ['a profile outside it, under the /private/var spelling', { ...base, GMUX_HARNESS_DIR: alias(harness), GMUX_PROBES: '1' }, decoy, null],
        ['all three present, the harness folder under the /var spelling', { ...base, GMUX_HARNESS_DIR: alias(harness), GMUX_PROBES: '1' }, profile, fault],
        ['all three present, the profile under the /var spelling', { ...base, GMUX_PROBES: '1' }, alias(profile), fault]
      );
    }
    drivenCases = cases.map(([name]) => name);
    const variants = [...texts];
    const source = [
      "import { isIsolatedLaunch } from './src/main/harness/launch-gate.ts';",
      "import { isInside } from './src/main/harness/fold-stub.ts';",
      `const CASES: [string, Record<string, string>, string, string | null][] = ${JSON.stringify(cases)};`,
      'const variants: ((env: NodeJS.ProcessEnv, userDataDir: string) => string | null)[] = [',
      ...variants.map((t) => `  (() => { ${t}\n  return manifestFaultPath; })(),`),
      '];',
      'const run = (fn: (env: NodeJS.ProcessEnv, userDataDir: string) => string | null) => CASES.map(([name, env, dir, want]) => {',
      '  let got: string | null | { threw: string };',
      '  try { got = fn(env, dir); } catch (err) { got = { threw: String((err as Error)?.message ?? err) }; }',
      '  return { case: name, got, want };',
      '});',
      'const out: { variants: unknown[]; module: unknown } = { variants: variants.map(run), module: null };',
      "try { const m = await import('./src/main/harness/manifest-fault.ts'); out.module = typeof m.manifestFaultPath === 'function' ? run(m.manifestFaultPath) : 'manifestFaultPath is not exported'; }",
      'catch (err) { out.module = `the module did not import: ${String((err as Error)?.message ?? err).slice(0, 300)}`; }',
      "console.log('P357_S8:' + JSON.stringify(out));"
    ].join('\n');
    const run = spawnSync(process.execPath, [tsxCli(), '--tsconfig', 'tsconfig.node.json', '-'], {
      cwd: ROOT,
      input: source,
      encoding: 'utf8',
      maxBuffer: 16 * 1024 * 1024,
      timeout: 90_000,
      // electron's index.js answers a path string and never downloads when this is set (vitest.config.ts says why).
      env: { ...process.env, ELECTRON_OVERRIDE_DIST_PATH: join(ROOT, 'node_modules', 'electron', 'dist') }
    });
    const line = (run.stdout ?? '').split('\n').find((l) => l.startsWith('P357_S8:'));
    if (line === undefined) {
      drivenWhy = `the pinned tsx printed no answer (exit ${String(run.status)}${run.signal ? `, ${run.signal}` : ''}): ${`${run.stdout ?? ''}${run.stderr ?? ''}`.trim().split('\n').slice(-6).join(' / ').slice(0, 600)}`;
      return;
    }
    const out = JSON.parse(line.slice('P357_S8:'.length));
    variants.forEach((t, i) => driven.set(t, out.variants[i] ?? []));
    if (Array.isArray(out.module)) drivenModule = out.module;
    else drivenWhy = String(out.module);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------
// S9: the two process handlers
// ---------------------------------------------------------------------------

/** A read of an error's message: `.message`, `['message']`, or a call handed the key `'message'`. */
const isMessageRead = (n) =>
  (ts.isPropertyAccessExpression(n) && n.name.text === 'message') ||
  (ts.isElementAccessExpression(n) && ts.isStringLiteralLike(n.argumentExpression) && n.argumentExpression.text === 'message') ||
  (ts.isCallExpression(n) && n.arguments.some((a) => ts.isStringLiteralLike(a) && a.text === 'message'));

/**
 * A read of an error's STACK, whose first line is `<name>: <message>`: `.stack`,
 * `['stack']`, or a call handed the key `'stack'` (crash.ts's own `read(err,
 * 'stack')`). The probe review's hostile copies G10a and G10d put one in the
 * crash record, green on this rule before it was added.
 */
const isStackRead = (n) =>
  (ts.isPropertyAccessExpression(n) && n.name.text === 'stack') ||
  (ts.isElementAccessExpression(n) && ts.isStringLiteralLike(n.argumentExpression) && n.argumentExpression.text === 'stack') ||
  (ts.isCallExpression(n) && n.arguments.some((a) => ts.isStringLiteralLike(a) && a.text === 'stack'));
/**
 * The thrown value's names at a log call: every parameter typed `unknown`, or
 * not typed, of every function around the call (`noteCrash`'s `err`, a
 * listener's own). A log call may reach the thrown value only through the
 * record makers below, so `String(err)`, `text(err)` and `${err}`, each the
 * message with a name in front, are red (hostile copies G10b and G10c).
 */
function thrownNamesAt(call) {
  const out = new Set();
  for (let p = call.parent; p !== undefined; p = p.parent) {
    if (ts.isFunctionDeclaration(p) || ts.isFunctionExpression(p) || ts.isArrowFunction(p) || ts.isMethodDeclaration(p)) {
      for (const prm of p.parameters) if (ts.isIdentifier(prm.name) && (prm.type === undefined || prm.type.kind === ts.SyntaxKind.UnknownKeyword)) out.add(prm.name.text);
    }
  }
  return out;
}
/** The functions a thrown value may be handed on its way into a record: the record, its key, its message half. */
const RECORD_MAKERS = Object.freeze(['crashRecordOf', 'crashMessageOf', 'crashKeyOf']);
/** True when `x`, inside the reached expression `root`, sits in the arguments of a call to a record maker. */
function insideRecordMaker(x, root) {
  for (let p = x.parent; p !== undefined; p = p.parent) {
    if (ts.isCallExpression(p) && ts.isIdentifier(p.expression) && RECORD_MAKERS.includes(p.expression.text) && p.arguments.some((a) => a === x || nodesOf(a).includes(x))) return true;
    if (p === root) break;
  }
  return false;
}

/** The file's top level functions, by name. */
function topFunctions(sf) {
  const out = new Map();
  for (const s of sf.statements) {
    if (ts.isFunctionDeclaration(s) && s.name !== undefined) out.set(s.name.text, s);
    if (ts.isVariableStatement(s)) {
      for (const d of s.declarationList.declarations) if (ts.isIdentifier(d.name) && d.initializer !== undefined && isFunctionLike(d.initializer)) out.set(d.name.text, d);
    }
  }
  return out;
}
/** The functions reachable from `roots` by name, within one file. */
function reachable(sf, roots) {
  const fns = topFunctions(sf);
  const seen = new Set();
  const stack = roots.filter((r) => fns.has(r));
  while (stack.length > 0) {
    const name = stack.pop();
    if (seen.has(name)) continue;
    seen.add(name);
    for (const n of nodesOf(fns.get(name))) if (ts.isIdentifier(n) && fns.has(n.text) && !seen.has(n.text)) stack.push(n.text);
  }
  return [...seen].map((name) => ({ name, node: fns.get(name) }));
}
/** A call that writes a log: the injected `log`, `logEvent`, a scoped logger, the console, or a raw write. */
function isLogCall(n) {
  if (!ts.isCallExpression(n)) return false;
  const callee = n.expression;
  if (ts.isIdentifier(callee)) return ['logEvent', 'writeSync'].includes(callee.text);
  if (!ts.isPropertyAccessExpression(callee)) return false;
  const name = callee.name.text;
  const on = callee.expression.getText();
  if (name === 'log' && on !== 'console') return true;
  if (on === 'console') return ['log', 'error', 'warn', 'info', 'debug'].includes(name);
  if (/^process\.(stderr|stdout)$/.test(on)) return name === 'write';
  if (/getLog\(/.test(on)) return ['error', 'warn', 'info', 'debug'].includes(name);
  return false;
}
/** The guards that stand in front of `call` in its function: `{ cond, negated }` each. */
function guardsOf(call, fn) {
  const out = [];
  for (let node = call; node !== undefined && node !== fn; node = node.parent) {
    const p = node.parent;
    if (p === undefined) break;
    if (ts.isIfStatement(p) && p.thenStatement === node) out.push({ cond: peel(p.expression), negated: false });
    const siblings = stmtsOf(p);
    if (siblings !== null) {
      for (const s of siblings.slice(0, siblings.indexOf(node))) {
        if (ts.isIfStatement(s) && s.elseStatement === undefined && endsInReturn(s.thenStatement)) out.push({ cond: peel(s.expression), negated: true });
      }
    }
  }
  return out;
}

export function ruleS9(tree) {
  const f = [];
  // (a) The listeners, across src/main.
  const listeners = new Set(PROCESS_EVENTS.flatMap((e) => pathsNaming(tree, 'src/main/', e)));
  for (const rel of listeners) {
    const sf = sfOf(tree, rel);
    for (const n of nodesOf(sf)) {
      if (!ts.isCallExpression(n) || !ts.isPropertyAccessExpression(n.expression)) continue;
      if (n.expression.expression.getText() !== 'process' || !LISTENER_METHODS.includes(n.expression.name.text)) continue;
      const event = n.arguments[0];
      if (event === undefined || !ts.isStringLiteralLike(event) || !PROCESS_EVENTS.includes(event.text)) continue;
      if (rel !== FILES.crash) f.push(`${where(rel, n)} hands process.${n.expression.name.text} a '${event.text}' listener; src/main/log/crash.ts is the one file that may, so every such error is written once and shown once`);
    }
  }
  const sf = sfOf(tree, FILES.crash);
  if (sf === null) return [...f, `${FILES.crash} is missing`];
  const listened = nodesOf(sf).filter(
    (n) =>
      ts.isCallExpression(n) &&
      n.expression.getText() === 'process.on' &&
      n.arguments[0] !== undefined &&
      ts.isStringLiteralLike(n.arguments[0]) &&
      ['uncaughtException', 'unhandledRejection'].includes(n.arguments[0].text)
  );
  const heard = new Set(listened.map((n) => n.arguments[0].text));
  if (!heard.has('uncaughtException') || !heard.has('unhandledRejection')) f.push(`${FILES.crash} does not hand process.on both an uncaughtException and an unhandledRejection listener`);
  // (b) No log call the handlers reach names a message.
  const fns = reachable(sf, ['installCrashHandlers', 'flushCrashRepeats']);
  if (!fns.some((x) => x.name === 'installCrashHandlers') || !fns.some((x) => x.name === 'flushCrashRepeats')) f.push(`${FILES.crash} does not declare installCrashHandlers and flushCrashRepeats`);
  for (const { name, node } of fns) {
    if (name === 'crashMessageOf') continue;
    const consts = new Map();
    for (const d of nodesOf(node).filter((x) => ts.isVariableDeclaration(x) && ts.isIdentifier(x.name) && x.initializer !== undefined)) consts.set(d.name.text, d.initializer);
    for (const call of nodesOf(node).filter(isLogCall)) {
      const reached = [...call.arguments];
      for (const a of call.arguments) for (const id of nodesOf(a).filter((x) => ts.isIdentifier(x) && consts.has(x.text))) reached.push(consts.get(id.text));
      const thrown = thrownNamesAt(call);
      const hit = reached
        .flatMap((root) => nodesOf(root).map((x) => ({ x, root })))
        .find(
          ({ x, root }) =>
            isMessageRead(x) ||
            isStackRead(x) ||
            (ts.isCallExpression(x) && x.expression.getText() === 'messageTextOf') ||
            (ts.isIdentifier(x) && thrown.has(x.text) && !(ts.isPropertyAccessExpression(x.parent) && x.parent.name === x) && !insideRecordMaker(x, root))
        )?.x;
      if (hit !== undefined) f.push(`a log call in ${name} names a message, a stack or the thrown value itself (\`${hit.getText().slice(0, 60)}\`, ${where(FILES.crash, hit)}); only crashMessageOf may carry a message, and only SQLite's`);
    }
  }
  // (c) crashRecordOf takes its message from crashMessageOf alone, and crashMessageOf keeps one only for a SqliteError.
  const rec = functionsNamed(sf, 'crashRecordOf');
  if (rec.length !== 1) f.push('crashRecordOf is not declared once');
  else {
    const nodes = nodesOf(rec[0]);
    const read = nodes.find((x) => isMessageRead(x));
    if (read !== undefined) f.push(`crashRecordOf reads a message itself (\`${read.getText().slice(0, 60)}\`, ${where(FILES.crash, read)}); it is crashMessageOf's to read`);
    const named = nodes.filter((x) => (ts.isPropertyAssignment(x) || ts.isShorthandPropertyAssignment(x)) && ['message', 'messageChars'].includes(memberName(x)));
    if (named.length > 0) f.push(`crashRecordOf names the field ${memberName(named[0])} itself (${where(FILES.crash, named[0])})`);
    if (!nodes.some((x) => ts.isSpreadAssignment(x) && ts.isCallExpression(x.expression) && x.expression.expression.getText() === 'crashMessageOf')) f.push('crashRecordOf does not spread crashMessageOf(…) into the record');
  }
  const msg = functionsNamed(sf, 'crashMessageOf');
  if (msg.length !== 1) f.push('crashMessageOf is not declared once');
  else {
    const fns2 = topFunctions(sf);
    const asksClass = (cond) =>
      nodesOf(cond).some(
        (x) =>
          (ts.isBinaryExpression(x) && x.operatorToken.kind === ts.SyntaxKind.InstanceOfKeyword && /SqliteError$/.test(x.right.getText())) ||
          (ts.isCallExpression(x) &&
            ts.isIdentifier(x.expression) &&
            fns2.has(x.expression.text) &&
            nodesOf(fns2.get(x.expression.text)).some((y) => ts.isBinaryExpression(y) && y.operatorToken.kind === ts.SyntaxKind.InstanceOfKeyword && /SqliteError$/.test(y.right.getText())))
      );
    const keeps = nodesOf(msg[0]).filter((x) => ts.isReturnStatement(x) && x.expression !== undefined && nodesOf(x.expression).some((y) => ts.isPropertyAssignment(y) && memberName(y) === 'message'));
    if (keeps.length === 0) f.push('crashMessageOf never keeps a message, so a SqliteError would lose SQLite’s own words');
    for (const k of keeps) {
      const guard = ancestor(k, (p) => ts.isIfStatement(p) && nodesOf(p.thenStatement).includes(k), msg[0]);
      if (guard === null || !asksClass(guard.expression)) f.push(`crashMessageOf keeps a message without asking the SqliteError class (${where(FILES.crash, k)}); any other message can hold a person's data (D16)`);
    }
  }
  // (d) The one dialog, behind the harness return and the isStopped return.
  const dialogs = callsOf(sf, 'showErrorBox');
  if (dialogs.length !== 1) f.push(`${FILES.crash} calls showErrorBox ${String(dialogs.length)} times, not once`);
  for (const d of dialogs) {
    const fn = ancestor(d, (p) => ts.isFunctionDeclaration(p) || isFunctionLike(p));
    const guards = guardsOf(d, fn ?? undefined);
    const fns3 = topFunctions(sf);
    const namesHarness = (c) => nodesOf(c).some((x) => (ts.isIdentifier(x) && x.text === 'harness') || (ts.isPropertyAccessExpression(x) && x.name.text === 'harness'));
    const namesStopped = (c) =>
      nodesOf(c).some(
        (x) =>
          ts.isCallExpression(x) &&
          ((ts.isPropertyAccessExpression(x.expression) && x.expression.name.text === 'isStopped') ||
            (ts.isIdentifier(x.expression) && (x.expression.text === 'isStopped' || (fns3.has(x.expression.text) && callsOf(fns3.get(x.expression.text), 'isStopped').length > 0))))
      );
    const isNot = (g) => (g.negated ? true : ts.isPrefixUnaryExpression(g.cond) && g.cond.operator === ts.SyntaxKind.ExclamationToken);
    if (!guards.some((g) => isNot(g) && namesHarness(g.cond))) f.push(`the dialog at ${where(FILES.crash, d)} is not behind a return on the harness flag, so a probe's launch would leave one on his screen`);
    if (!guards.some((g) => isNot(g) && namesStopped(g.cond))) f.push(`the dialog at ${where(FILES.crash, d)} is not behind a return on isStopped, so the session list's own refusal would draw a dialog per refresh (D18)`);
  }
  return f;
}

// ---------------------------------------------------------------------------
// S10: the core's catches
// ---------------------------------------------------------------------------

/** Every catch in a scope: `{ node, handler, binding, region }`, a catch clause or a promise `.catch(` handed a function. */
function catchesIn(scope) {
  const out = [];
  for (const n of nodesOf(scope)) {
    if (ts.isCatchClause(n)) {
      const binding = n.variableDeclaration !== undefined && ts.isIdentifier(n.variableDeclaration.name) ? n.variableDeclaration.name.text : null;
      out.push({ node: n, handler: n.block, binding, region: n.parent.tryBlock });
    } else if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && n.expression.name.text === 'catch' && n.arguments[0] !== undefined && isFunctionLike(n.arguments[0])) {
      const cb = n.arguments[0];
      const p0 = cb.parameters[0];
      out.push({ node: n, handler: cb.body, binding: p0 !== undefined && ts.isIdentifier(p0.name) ? p0.name.text : null, region: n.expression.expression });
    } else if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && n.expression.name.text === 'then' && n.arguments[1] !== undefined && isFunctionLike(n.arguments[1])) {
      // `.then(onFulfilled, onRejected)` catches too: its second function holds
      // every rejection of what it is chained to (the probe review's hostile copy
      // G11, a swallowing `.then(…, () => undefined)` in the server-exit chain,
      // green on this rule before it was read).
      const cb = n.arguments[1];
      const p0 = cb.parameters[0];
      out.push({ node: n, handler: cb.body, binding: p0 !== undefined && ts.isIdentifier(p0.name) ? p0.name.text : null, region: n.expression.expression });
    }
  }
  return out;
}
const MANIFEST_REACH = /this\.manifest\b|this\.(listSessions|broadcastSessions|snapshotAllSessions)\(|\bsnapshotAllSessions\(/;
/** Shape A: `if (!isManifestStopped(v)) throw v;` first. Shape B: `if (isManifestStopped(v)) …return…` first and `throw v;` last. */
function rethrowsTheRest(c) {
  const v = c.binding;
  const body = c.handler;
  if (v === null || body === undefined || !ts.isBlock(body)) return false;
  const stmts = body.statements;
  const first = stmts[0];
  if (first === undefined || !ts.isIfStatement(first) || first.elseStatement !== undefined) return false;
  const cond = peel(first.expression);
  if (ts.isPrefixUnaryExpression(cond) && cond.operator === ts.SyntaxKind.ExclamationToken && isCallOfWith(cond.operand, 'isManifestStopped', v)) {
    return isThrowOf(first.thenStatement, v);
  }
  if (isCallOfWith(cond, 'isManifestStopped', v)) return endsInReturn(first.thenStatement) && isThrowOf(stmts[stmts.length - 1], v);
  return false;
}

export function ruleS10(tree) {
  const f = [];
  const sf = sfOf(tree, FILES.core);
  if (sf === null) return [`${FILES.core} is missing`];
  if (!importsName(sf, 'isManifestStopped', ['../manifest/store', '../manifest'])) f.push(`${FILES.core} does not import isManifestStopped from the store`);
  const shadow = localBindings(sf, 'isManifestStopped');
  if (shadow.length > 0) f.push(`${where(FILES.core, shadow[0])} declares its own isManifestStopped, which would answer for the store`);
  const cls = classNamed(sf, 'GmuxCore');
  if (cls === null) return [...f, `${FILES.core} declares no class GmuxCore`];
  const scopes = [];
  const list = methodOf(cls, 'listSessions');
  if (list === null) f.push('GmuxCore has no listSessions');
  else scopes.push({ label: 'GmuxCore.listSessions', node: list, only: true });
  for (const name of D20_METHODS) {
    const m = methodOf(cls, name);
    if (m === null) f.push(`GmuxCore has no ${name}`);
    else scopes.push({ label: `GmuxCore.${name}`, node: m, only: false });
  }
  const exits = nodesOf(cls).filter(
    (n) => ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && n.expression.name.text === 'on' && n.arguments[0] !== undefined && ts.isStringLiteralLike(n.arguments[0]) && n.arguments[0].text === 'server-exit' && n.arguments[1] !== undefined && isFunctionLike(n.arguments[1])
  );
  if (exits.length !== 1) f.push(`GmuxCore registers ${String(exits.length)} server-exit callbacks, not one`);
  else scopes.push({ label: 'the server-exit snapshot chain', node: exits[0].arguments[1], only: false });
  for (const s of scopes) {
    const all = catchesIn(s.node);
    const named = all.filter((c) => callsOf(c.handler ?? c.node, 'isManifestStopped').length > 0);
    if (named.length === 0) f.push(`${s.label} holds no catch through isManifestStopped, so the store's refusal ${s.only ? 'escapes every broadcast from a timer' : 'is thrown out of an event path uncaught'} (${where(FILES.core, s.node)})`);
    for (const c of named) if (!rethrowsTheRest(c)) f.push(`the catch at ${where(FILES.core, c.node)} in ${s.label} does not rethrow every error that is not the store's refusal`);
    for (const c of all.filter((x) => !named.includes(x))) {
      const covers = c.region !== undefined && MANIFEST_REACH.test(c.region.getText());
      if (s.only || covers) f.push(`the catch at ${where(FILES.core, c.node)} in ${s.label} does not ask isManifestStopped${covers ? ' and covers a read of the manifest, so it swallows every error there' : ''}`);
    }
  }
  return f;
}

export const RULE_FNS = Object.freeze({ S1: ruleS1, S2: ruleS2, S3: ruleS3, S4: ruleS4, S5: ruleS5, S6: ruleS6, S7: ruleS7, S8: ruleS8, S9: ruleS9, S10: ruleS10 });

// ---------------------------------------------------------------------------
// The ablations: in-memory copies, each with one rule broken
// ---------------------------------------------------------------------------

/** A copy of the tree with one file's text replaced, or null when the edit found nothing. */
function withFile(tree, rel, edit) {
  const text = tree.get(rel);
  if (text === undefined) return null;
  const next = edit(text, sfOf(tree, rel));
  if (next === null || next === text) return null;
  const copy = new Map(tree);
  copy.set(rel, next);
  return copy;
}
const splice = (text, node, replacement) => text.slice(0, node.getStart()) + replacement + text.slice(node.getEnd());
const insertBefore = (text, node, insertion) => text.slice(0, node.getStart()) + insertion + text.slice(node.getStart());
const append = (insertion) => (text) => `${text}\n${insertion}\n`;
/** A class's closing brace, for a member inserted at its end. */
const beforeClassEnd = (text, cls, insertion) => text.slice(0, cls.getEnd() - 1) + insertion + text.slice(cls.getEnd() - 1);
/** The one statement of a store member, or null. */
function storeMember(sf, name) {
  const cls = classNamed(sf, 'ManifestStore');
  return cls === null ? null : methodOf(cls, name);
}
function storeCallOf(sf, name) {
  const m = storeMember(sf, name);
  const s = m?.body?.statements[0];
  const call = s === undefined ? undefined : ts.isReturnStatement(s) ? s.expression : ts.isExpressionStatement(s) ? s.expression : undefined;
  return call !== undefined && ts.isCallExpression(call) ? call : null;
}
function coreMethod(sf, name) {
  const cls = classNamed(sf, 'GmuxCore');
  return cls === null ? null : methodOf(cls, name);
}
/** The statement in `block` that holds `node`. */
const statementHolding = (block, node) => block.statements.find((s) => nodesOf(s).includes(node)) ?? null;

export const ABLATIONS = [
  // S1
  ['S1', ['S1', 'S2'], 'a member that reads this.sessions directly', (t) => withFile(t, FILES.store, (s, sf) => {
    const m = storeMember(sf, 'getSession');
    return m?.body === undefined ? null : splice(s, m.body, '{\n    return this.sessions.getSession(id);\n  }');
  })],
  ['S1', ['S1'], "a member naming another member's name", (t) => withFile(t, FILES.store, (s, sf) => {
    const c = storeCallOf(sf, 'getSession');
    return c === null ? null : splice(s, c.arguments[0], "'listSessions'");
  })],
  ['S1', ['S1'], 'a new member absent from the list', (t) => withFile(t, FILES.store, (s, sf) => {
    const m = storeMember(sf, 'listSessions');
    return m === null ? null : insertBefore(s, m, "countSessions(): number {\n    return this.through('countSessions', () => this.sessions.listSessions().length);\n  }\n\n  ");
  })],
  ['S1', ['S1'], 'a fourth member answering a fallback through quiet', (t) => withFile(t, FILES.store, (s, sf) => {
    const c = storeCallOf(sf, 'insertSession');
    if (c === null || c.arguments.length !== 2) return null;
    return splice(s, c, `this.quiet('insertSession', record, ${c.arguments[1].getText()})`);
  })],
  ['S1', ['S1'], 'through no longer asking the latch first', (t) => withFile(t, FILES.store, (s, sf) => {
    const m = storeMember(sf, 'through');
    const first = m?.body?.statements[0];
    return first === undefined ? null : splice(s, first, '');
  })],
  ['S1', ['S1'], 'stoppedReading reading another field', (t) => withFile(t, FILES.store, (s, sf) => {
    const m = storeMember(sf, 'stoppedReading');
    return m?.body === undefined ? null : splice(s, m.body, '{\n    return this.stopped !== null && this.leftOpenSaid;\n  }');
  })],
  ['S1', ['S1'], 'a member dropped from MANIFEST_OPERATIONS', (t) => withFile(t, FILES.store, (s) => (s.includes("  'getSession',\n") ? s.replace("  'getSession',\n", '') : null))],
  // The probe review's (2026-11-05): each was green on S1 before the clause it names.
  ['S1', ['S1'], 'through’s latch asked for every operation but one', (t) => withFile(t, FILES.store, (s, sf) => {
    const first = storeMember(sf, 'through')?.body?.statements[0];
    return first === undefined || !ts.isIfStatement(first) ? null : splice(s, first.expression, `${first.expression.getText()} && operation !== 'insertSession'`);
  })],
  ['S1', ['S1'], 'through asks the classifier and never latches', (t) => withFile(t, FILES.store, (s, sf) => {
    const tried = storeMember(sf, 'through')?.body?.statements[1];
    if (tried === undefined || !ts.isTryStatement(tried) || tried.catchClause === undefined) return null;
    const latch = tried.catchClause.block.statements.find((x) => x.getText().startsWith('this.latch('));
    return latch === undefined ? null : splice(s, latch, '');
  })],
  // The fix round's (F1): the fingerprint a stopped store answers. The first is
  // the latch's first build, which the main session found rotating the ring.
  ['S1', ['S1'], 'the stopped fingerprint answering null again', (t) => withFile(t, FILES.store, (s, sf) => {
    const c = storeCallOf(sf, 'contentFingerprint');
    return c === null || c.arguments.length !== 3 ? null : splice(s, c.arguments[1], 'null');
  })],
  ['S1', ['S1'], 'the stopped fingerprint answering only what it remembered, null before the first', (t) => withFile(t, FILES.store, (s, sf) => {
    const c = storeCallOf(sf, 'contentFingerprint');
    const fb = c === null || c.arguments.length !== 3 ? undefined : peel(c.arguments[1]);
    return fb === undefined || !ts.isBinaryExpression(fb) ? null : splice(s, c.arguments[1], fb.left.getText());
  })],
  ['S1', ['S1'], 'the fingerprint no longer remembered', (t) => withFile(t, FILES.store, (s, sf) => {
    const c = storeCallOf(sf, 'contentFingerprint');
    return c === null || c.arguments.length !== 3 ? null : splice(s, c.arguments[2], '() => fingerprintOrNull(this.db)');
  })],
  ['S1', ['S1'], 'the remembered fingerprint cleared when the store stops', (t) => withFile(t, FILES.store, (s, sf) => {
    const first = storeMember(sf, 'latch')?.body?.statements[0];
    const c = storeCallOf(sf, 'contentFingerprint');
    const fb = c === null || c.arguments.length !== 3 ? undefined : peel(c.arguments[1]);
    return first === undefined || fb === undefined || !ts.isBinaryExpression(fb) ? null : insertBefore(s, first, `${fb.left.getText()} = null;\n    `);
  })],
  // S2
  ['S2', ['S2'], 'this.db.prepare in a new method body', (t) => withFile(t, FILES.store, (s, sf) => {
    const m = storeMember(sf, 'through');
    return m === null ? null : insertBefore(s, m, "private peek(): unknown {\n    return this.db.prepare('SELECT 1').get();\n  }\n\n  ");
  })],
  ['S2', ['S2'], 'a repository reached from a private helper', (t) => withFile(t, FILES.store, (s, sf) => {
    const m = storeMember(sf, 'through');
    return m === null ? null : insertBefore(s, m, 'private peekSessions(): unknown {\n    return this.sessions.listSessions();\n  }\n\n  ');
  })],
  ['S2', ['S2'], 'the connection destructured out of this', (t) => withFile(t, FILES.store, (s, sf) => {
    const m = storeMember(sf, 'through');
    return m === null ? null : insertBefore(s, m, 'private grab(): unknown {\n    const { db } = this;\n    return db;\n  }\n\n  ');
  })],
  // The probe review's: a member that is one statement through the latch, named on
  // the list, and answers the repository itself, green on S2 before escapesArrow.
  ['S2', ['S2'], 'a listed member that hands the repository itself out of its arrow', (t) => withFile(t, FILES.store, (s, sf) => {
    const m = storeMember(sf, 'getSession');
    const decl = nodesOf(sf).find((n) => ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === 'MANIFEST_OPERATIONS');
    const list = decl === undefined ? undefined : peel(decl.initializer);
    if (m === null || list === undefined || !ts.isArrayLiteralExpression(list) || list.elements.length === 0) return null;
    const lastEl = list.elements[list.elements.length - 1];
    if (lastEl.getEnd() > m.getStart()) return null;
    // The later edit first, so the earlier one's offsets still hold.
    const withMember = insertBefore(s, m, "sessionsRepository(): SessionsRepository {\n    return this.through('sessionsRepository', () => this.sessions);\n  }\n\n  ");
    return `${withMember.slice(0, lastEl.getEnd())},\n  'sessionsRepository'${withMember.slice(lastEl.getEnd())}`;
  })],
  // S3
  ['S3', ['S3'], 'a second catch, in another repository', (t) => withFile(t, 'src/main/manifest/projects-repository.ts', (s, sf) => {
    const cls = nodesOf(sf).find((n) => ts.isClassDeclaration(n));
    return cls === undefined ? null : beforeClassEnd(s, cls, '\n  selfTestCount(): number {\n    try {\n      return 1;\n    } catch {\n      return 0;\n    }\n  }\n');
  })],
  ['S3', ['S3'], "the classifier's line moved below the wrap", (t) => withFile(t, FILES.sessionsRepository, (s, sf) => {
    const c = nodesOf(sf).find((n) => ts.isCatchClause(n));
    if (c === undefined || c.block.statements.length < 2) return null;
    const [first, ...rest] = c.block.statements;
    return splice(s, c.block, `{\n      ${rest.map((x) => x.getText()).join('\n      ')}\n      ${first.getText()}\n    }`);
  })],
  ['S3', ['S3'], 'the classifier shadowed in the repository', (t) => withFile(t, FILES.sessionsRepository, append('const isBrokenConnectionError = (_err: unknown): boolean => false;\nvoid isBrokenConnectionError;'))],
  // S4
  ['S4', ['S4'], "a message.includes('malformed')", (t) => withFile(t, FILES.integrity, (s, sf) => {
    const d = functionsNamed(sf, 'isBrokenConnectionError')[0];
    const ret = d === undefined ? undefined : nodesOf(d).find((n) => ts.isReturnStatement(n));
    return ret?.expression === undefined ? null : splice(s, ret.expression, `${ret.expression.getText()} || String((err as Error).message).includes('malformed')`);
  })],
  ['S4', ['S4'], 'an I/O error latching too', (t) => withFile(t, FILES.integrity, (s, sf) => {
    const d = functionsNamed(sf, 'isBrokenConnectionError')[0];
    const ret = d === undefined ? undefined : nodesOf(d).find((n) => ts.isReturnStatement(n));
    return ret?.expression === undefined ? null : splice(s, ret.expression, `${ret.expression.getText()} || (err instanceof Database.SqliteError && err.code === 'SQLITE_IOERR_READ')`);
  })],
  ['S4', ['S4'], 'the class no longer asked', (t) => withFile(t, FILES.integrity, (s, sf) => {
    const d = functionsNamed(sf, 'isBrokenConnectionError')[0];
    const inst = d === undefined ? undefined : nodesOf(d).find((n) => ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.InstanceOfKeyword);
    return inst === undefined ? null : splice(s, inst, "typeof err === 'object'");
  })],
  // S5
  ['S5', ['S5'], 'close calling this.db.close() unconditionally', (t) => withFile(t, FILES.store, (s, sf) => {
    const m = storeMember(sf, 'close');
    return m?.body === undefined ? null : splice(s, m.body, '{\n    this.db.close();\n  }');
  })],
  ['S5', ['S5'], 'the push made for every verdict', (t) => withFile(t, FILES.store, (s, sf) => {
    const push = nodesOf(sf).find((n) => ts.isCallExpression(n) && n.expression.getText() === 'held.push');
    const guard = push === undefined ? null : ancestor(push, (p) => ts.isIfStatement(p));
    return guard === null ? null : splice(s, guard, 'held.push(this.db);');
  })],
  ['S5', ['S5'], 'held emptied in close', (t) => withFile(t, FILES.store, (s, sf) => {
    const m = storeMember(sf, 'close');
    const first = m?.body?.statements[0];
    return first === undefined ? null : insertBefore(s, first, 'held.splice(0);\n    ');
  })],
  // S6
  ['S6', ['S6'], 'the branch above shutdownGmuxCore()', (t) => withFile(t, FILES.capabilities, (s, sf) => {
    const fn = functionsNamed(sf, 'disposeMainCapabilities')[0];
    const body = fn === undefined ? null : bodyOf(fn);
    const stmts = stmtsOf(body);
    if (stmts === null || stmts.length < 2) return null;
    const branch = stmts[stmts.length - 2];
    const shut = callsOf(fn, 'shutdownGmuxCore')[0];
    const holder = shut === undefined ? null : statementHolding(body, shut);
    if (!ts.isIfStatement(branch) || holder === null) return null;
    const without = splice(s, branch, '');
    return without.slice(0, holder.getStart()) + `${branch.getText()}\n  ` + without.slice(holder.getStart());
  })],
  ['S6', ['S6'], 'the sentinel line removed', (t) => withFile(t, FILES.capabilities, (s, sf) => {
    const fn = functionsNamed(sf, 'disposeMainCapabilities')[0];
    const stmts = fn === undefined ? null : stmtsOf(bodyOf(fn));
    const branch = stmts === null ? undefined : stmts[stmts.length - 2];
    if (branch === undefined || !ts.isIfStatement(branch) || !ts.isBlock(branch.thenStatement)) return null;
    const clear = branch.thenStatement.statements.find((x) => x.getText().startsWith('clearLogRunSentinel('));
    return clear === undefined ? null : splice(s, clear, '');
  })],
  // The probe review's: green on S6 before the branch's test was pinned.
  ['S6', ['S6'], 'the branch asks for more than one connection left open', (t) => withFile(t, FILES.capabilities, (s, sf) => {
    const fn = functionsNamed(sf, 'disposeMainCapabilities')[0];
    const stmts = fn === undefined ? null : stmtsOf(bodyOf(fn));
    const branch = stmts === null ? undefined : stmts[stmts.length - 2];
    return branch === undefined || !ts.isIfStatement(branch) ? null : splice(s, branch.expression, 'manifestConnectionsLeftOpen() > 1');
  })],
  // S7
  ['S7', ['S7'], 'a second caller of app.relaunch(', (t) => withFile(t, FILES.capabilities, append('export function selfTestRelaunch(): void {\n  app.relaunch();\n}'))],
  ['S7', ['S7'], 'the notice check removed', (t) => withFile(t, FILES.capabilities, (s, sf) => {
    const h = handlerFor(sf, 'app:relaunch');
    const guard = h === null ? undefined : stmtsOf(h.body)?.find((x) => ts.isIfStatement(x) && x.expression.getText().includes('hasSaidNotice'));
    return guard === undefined ? null : splice(s, guard, '');
  })],
  ['S7', ['S7'], 'the harness return removed', (t) => withFile(t, FILES.capabilities, (s, sf) => {
    const h = handlerFor(sf, 'app:relaunch');
    const guard = h === null ? undefined : stmtsOf(h.body)?.find((x) => ts.isIfStatement(x) && x.expression.getText().includes('isHarnessLaunch'));
    return guard === undefined ? null : splice(s, guard, '');
  })],
  ['S7', ['S7'], 'a second caller of relaunch( in the window', (t) => withFile(t, FILES.subscriptions, append('export function selfTestRelaunch(bridge: { relaunch: () => Promise<void> }): void {\n  void bridge.relaunch();\n}'))],
  // The probe review's: both green on S7 before the two spellings were read.
  ['S7', ['S7'], 'a relaunch destructured out of app', (t) => withFile(t, FILES.capabilities, append('export function selfTestRelaunchQuietly(): void {\n  const { relaunch } = app;\n  relaunch();\n}'))],
  ['S7', ['S7'], "a relaunch reached by its key, app['relaunch']", (t) => withFile(t, FILES.capabilities, append("export function selfTestRelaunchByKey(): void {\n  app['relaunch']();\n}"))],
  // S8
  ['S8', ['S8'], 'the probe term widened to any value', (t) => withFile(t, FILES.seam, (s) => (s.includes("env['GMUX_PROBES'] !== '1'") ? s.replace("env['GMUX_PROBES'] !== '1'", "(env['GMUX_PROBES'] ?? '') === ''") : null))],
  ['S8', ['S8'], 'the profile check removed', (t) => withFile(t, FILES.seam, (s, sf) => {
    const fn = functionsNamed(sf, 'manifestFaultPath')[0];
    const guard = fn === undefined ? undefined : stmtsOf(bodyOf(fn))?.find((x) => ts.isIfStatement(x) && x.expression.getText().includes('isInside'));
    return guard === undefined ? null : splice(s, guard, '');
  })],
  ['S8', ['S8'], 'a second setter of the hook', (t) => withFile(t, FILES.index, append("import { setManifestFaultHook } from './manifest/store';\nexport function selfTestHook(): void {\n  setManifestFaultHook(null);\n}"))],
  ['S8', ['S8'], 'the hook set before the refusals answered', (t) => withFile(t, FILES.seam, (s, sf) => {
    const fn = functionsNamed(sf, 'installManifestFault')[0];
    const body = fn === undefined ? null : bodyOf(fn);
    const stmts = stmtsOf(body);
    const set = stmts?.find((x) => x.getText().startsWith('setManifestFaultHook('));
    if (stmts === null || set === undefined) return null;
    const without = splice(s, set, '');
    return insertBefore(without, stmts[0], `${set.getText()}\n  `);
  })],
  // S9
  ['S9', ['S9'], 'a log field message: err.message', (t) => withFile(t, FILES.crash, (s, sf) => {
    const fn = functionsNamed(sf, 'noteCrash')[0];
    const log = fn === undefined ? undefined : nodesOf(fn).find((n) => isLogCall(n) && n.arguments.some((a) => ts.isObjectLiteralExpression(a)));
    const obj = log?.arguments.find((a) => ts.isObjectLiteralExpression(a));
    return obj === undefined ? null : splice(s, obj, `${obj.getText().replace(/\s*\}$/, '')}, message: (err as Error).message }`);
  })],
  ['S9', ['S9'], 'a second uncaughtException listener in main', (t) => withFile(t, FILES.index, append("process.on('uncaughtException', () => undefined);"))],
  // The probe review's: a stack and the thrown value itself, each the message with
  // a name in front, both green on S9 before isStackRead and thrownNamesAt.
  ['S9', ['S9'], 'the crash record carrying the error’s stack', (t) => withFile(t, FILES.crash, (s, sf) => {
    const fn = functionsNamed(sf, 'noteCrash')[0];
    const log = fn === undefined ? undefined : nodesOf(fn).find((n) => isLogCall(n) && n.arguments.some((a) => ts.isObjectLiteralExpression(a)));
    const obj = log?.arguments.find((a) => ts.isObjectLiteralExpression(a));
    return obj === undefined ? null : splice(s, obj, `${obj.getText().replace(/\s*\}$/, '')}, stack: read(err, 'stack') }`);
  })],
  ['S9', ['S9'], 'the stderr line carrying String(err)', (t) => withFile(t, FILES.crash, (s, sf) => {
    const fn = functionsNamed(sf, 'noteCrash')[0];
    const line = fn === undefined ? undefined : nodesOf(fn).find((n) => isLogCall(n) && n.expression.getText() === 'console.error');
    const arg = line?.arguments[0];
    return arg === undefined || !ts.isTemplateExpression(arg) ? null : splice(s, arg, `\`${arg.getText().slice(1, -1)} \${String(err)}\``);
  })],
  ['S9', ['S9'], 'the dialog drawn in a harness launch', (t) => withFile(t, FILES.crash, (s, sf) => {
    const d = callsOf(sf, 'showErrorBox')[0];
    const fn = d === undefined ? null : ancestor(d, (p) => ts.isFunctionDeclaration(p));
    const guard = fn === null ? undefined : nodesOf(fn).find((n) => ts.isIfStatement(n) && endsInReturn(n.thenStatement) && /\.harness\b|\bharness\b/.test(n.expression.getText()));
    return guard === undefined ? null : splice(s, guard, '');
  })],
  ['S9', ['S9'], 'the dialog drawn for the session list’s refusal', (t) => withFile(t, FILES.crash, (s, sf) => {
    const d = callsOf(sf, 'showErrorBox')[0];
    const fn = d === undefined ? null : ancestor(d, (p) => ts.isFunctionDeclaration(p));
    const guard = fn === null ? undefined : nodesOf(fn).find((n) => ts.isIfStatement(n) && endsInReturn(n.thenStatement) && /Stopped/.test(n.expression.getText()));
    return guard === undefined ? null : splice(s, guard, '');
  })],
  ['S9', ['S9'], 'every message kept, not only SQLite’s', (t) => withFile(t, FILES.crash, (s, sf) => {
    const fn = functionsNamed(sf, 'crashMessageOf')[0];
    const guard = fn === undefined ? undefined : nodesOf(fn).find((n) => ts.isIfStatement(n) && nodesOf(n.thenStatement).some((y) => ts.isPropertyAssignment(y) && memberName(y) === 'message'));
    return guard === undefined ? null : splice(s, guard, guard.thenStatement.getText());
  })],
  // S10
  ['S10', ['S10'], 'a bare catch {} swallowing every error', (t) => withFile(t, FILES.core, (s, sf) => {
    const m = coreMethod(sf, 'handleExternalRename');
    const c = m === null ? undefined : nodesOf(m).find((n) => ts.isCatchClause(n) && callsOf(n.block, 'isManifestStopped').length > 0);
    return c === undefined ? null : splice(s, c, 'catch {\n      /* swallowed */\n    }');
  })],
  ['S10', ['S10'], 'listSessions answering the last list on any error', (t) => withFile(t, FILES.core, (s, sf) => {
    const m = coreMethod(sf, 'listSessions');
    const c = m === null ? undefined : nodesOf(m).find((n) => ts.isCatchClause(n));
    const guard = c?.block.statements.find((x) => x.getText().includes('isManifestStopped'));
    return guard === undefined ? null : splice(s, guard, '');
  })],
  ['S10', ['S10'], 'the server-exit chain without its catch', (t) => withFile(t, FILES.core, (s, sf) => {
    const exit = nodesOf(sf).find((n) => ts.isCallExpression(n) && n.arguments[0] !== undefined && ts.isStringLiteralLike(n.arguments[0]) && n.arguments[0].text === 'server-exit');
    const c = exit === undefined ? undefined : nodesOf(exit).find((n) => ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && n.expression.name.text === 'catch');
    return c === undefined ? null : splice(s, c, c.expression.expression.getText());
  })],
  ['S10', ['S10'], 'a local isManifestStopped that answers yes', (t) => withFile(t, FILES.core, append('const isManifestStopped = (_err: unknown): boolean => true;\nvoid isManifestStopped;'))],
  // The probe review's: green on S10 before `.then(…, onRejected)` was read as a catch.
  ['S10', ['S10'], 'the server-exit chain swallowing every rejection with .then(…, …)', (t) => withFile(t, FILES.core, (s, sf) => {
    const exit = nodesOf(sf).find((n) => ts.isCallExpression(n) && n.arguments[0] !== undefined && ts.isStringLiteralLike(n.arguments[0]) && n.arguments[0].text === 'server-exit' && n.arguments[1] !== undefined && isFunctionLike(n.arguments[1]));
    const snap = exit === undefined ? undefined : nodesOf(exit.arguments[1]).find((n) => ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && n.expression.name.text === 'snapshotAllSessions');
    return snap === undefined ? null : splice(s, snap, `${snap.getText()}.then(() => undefined, () => undefined)`);
  })]
];

/** Changed in four of the files the rules read, in nothing they hold: every rule must read as it did. */
export const CONTROL = [
  'a helper and a comment beside every clause',
  (t) => {
    let copy = withFile(t, FILES.store, append('export function selfTestControl(): number {\n  return MANIFEST_OPERATIONS.length;\n}'));
    copy = copy === null ? null : withFile(copy, FILES.core, append('// a control comment that names isManifestStopped( and this.manifest.listSessions( in prose only'));
    copy = copy === null ? null : withFile(copy, FILES.crash, append("export const SELF_TEST_CONTROL = 'process.on uncaughtException';"));
    copy = copy === null ? null : withFile(copy, FILES.capabilities, append('export function selfTestControlQuit(): string {\n  return "app.relaunch() is named in a string only";\n}'));
    return copy;
  }
];

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

/**
 * The files each rule reads. A rule's answer is a function of these texts
 * alone, so a copy that changed none of them is answered from the first
 * reading: forty copies cost a few readings each rather than ten.
 */
const RULE_INPUTS = Object.freeze({
  S1: () => [FILES.store],
  S2: () => [FILES.store],
  S3: () => [...FILES.repositories],
  S4: () => [FILES.integrity],
  S5: () => [FILES.store],
  S6: () => [FILES.capabilities],
  S7: (t) => [FILES.capabilities, ...pathsNaming(t, 'src/main/', 'relaunch'), ...pathsNaming(t, 'src/renderer/', 'relaunch')],
  S8: (t) => [FILES.store, FILES.seam, ...pathsNaming(t, 'src/', 'setManifestFaultHook')],
  S9: (t) => [FILES.crash, ...PROCESS_EVENTS.flatMap((e) => pathsNaming(t, 'src/main/', e))],
  S10: () => [FILES.core]
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
  const clock = { at: performance.now() };
  const lap = (what) => {
    if (timing) process.stderr.write(`${TAG} ${what}: ${String(Math.round(performance.now() - clock.at))} ms\n`);
    clock.at = performance.now();
  };
  const tree = readTree(ROOT);
  lap('read the tree');
  const problems = [];
  if (tree.size < FLOOR) problems.push(`the walk found ${String(tree.size)} non-test source files under src/, below the floor of ${String(FLOOR)}, so it is not trusted`);
  // Every copy is built first, so S8's driven half drives every distinct text in one process.
  const built = ABLATIONS.map(([rule, expects, name, build]) => {
    let copy = null;
    try {
      copy = build(tree);
    } catch (err) {
      problems.push(`${rule} ablation "${name}" threw while it was built: ${String(err?.message ?? err)}`);
    }
    return { rule, expects, name, copy };
  });
  const control = CONTROL[1](tree);
  const texts = new Set([tree, control, ...built.map((b) => b.copy)].filter((x) => x !== null).map((x) => faultPathText(x)).filter((x) => x !== null));
  lap('built the copies');
  if (texts.size > 0) driveFaultPaths(texts);
  lap('drove manifestFaultPath');

  const base = judge(tree);
  lap('judged the tree');
  const extra = moduleAgreement(tree);
  if (extra.length > 0) base.S8 = [...base.S8, ...extra];
  const red = (v, id) => v[id].length > 0;
  for (const id of RULES) {
    if (red(base, id)) for (const p of base[id]) problems.push(`${id} ${p}`);
  }
  const ablations = [];
  for (const { rule, expects, name, copy } of built) {
    if (copy === null) {
      problems.push(`${rule} ablation "${name}" could not be built over this tree, so the rule was not shown to fail`);
      ablations.push({ rule, name, built: false });
      continue;
    }
    const v = judge(copy);
    const wrong = RULES.filter((id) => (expects.includes(id) ? !red(v, id) : red(v, id) !== red(base, id)));
    if (wrong.length > 0) {
      const said = wrong.map((id) => `${id} read ${red(v, id) ? 'red' : 'green'}`).join(', ');
      problems.push(`${rule} ablation "${name}" must read red on ${expects.join(' and ')} and leave every other rule as it was; ${said}`);
    }
    ablations.push({ rule, name, built: true, red: RULES.filter((id) => red(v, id)), ok: wrong.length === 0 });
    if (process.argv.includes('--verbose')) {
      for (const id of expects) process.stdout.write(`${TAG}   ${rule} "${name}" -> ${id}: ${(v[id][0] ?? '(green)').slice(0, 220)}\n`);
    }
  }
  lap('judged the copies');
  for (const id of RULES) {
    if (!ABLATIONS.some(([rule]) => rule === id)) problems.push(`${id} carries no ablation, so it has never been shown to fail`);
  }
  let controlOk = false;
  if (control === null) problems.push('the control copy could not be built');
  else {
    const v = judge(control);
    const moved = RULES.filter((id) => red(v, id) !== red(base, id));
    controlOk = moved.length === 0;
    if (!controlOk) problems.push(`the control copy, changed in nothing a rule holds, moved ${moved.join(', ')}: ${moved.map((id) => v[id][0]).join(' / ')}`);
  }
  const report = {
    root: ROOT,
    files: tree.size,
    rules: Object.fromEntries(RULES.map((id) => [id, base[id].length === 0 ? 'green' : 'red'])),
    driven: { cases: drivenCases.length, variants: driven.size, module: drivenModule === null ? drivenWhy : 'agrees' },
    ablations: { total: ablations.length, ok: ablations.filter((a) => a.ok).length },
    control: controlOk,
    problems
  };
  if (AS_JSON) {
    process.stdout.write(`${JSON.stringify(report)}\n`);
  } else {
    for (const id of RULES) process.stdout.write(`${TAG} ${base[id].length === 0 ? 'PASS' : 'FAIL'} ${id}${base[id].length === 0 ? '' : ` (${String(base[id].length)})`}\n`);
    process.stdout.write(`${TAG} S8 drove manifestFaultPath over ${String(drivenCases.length)} environment shapes, ${String(driven.size)} source variants and the shipped export\n`);
    process.stdout.write(`${TAG} ablations: ${String(report.ablations.ok)} of ${String(report.ablations.total)} read red on exactly the rules they break; the control ${controlOk ? 'stayed green' : 'moved'}\n`);
    for (const p of problems) process.stderr.write(`${TAG} ${p}\n`);
  }
  if (problems.length > 0) {
    if (!AS_JSON) process.stderr.write(`${TAG} FAILED: ${String(problems.length)} problem(s)\n`);
    process.exit(1);
  }
  if (!AS_JSON) process.stdout.write(`${TAG} PASS: ten rules over ${String(tree.size)} files, ${String(report.ablations.total)} ablations and a control\n`);
  process.exit(0);
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
