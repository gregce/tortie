#!/usr/bin/env node
/**
 * rederive.mjs. Phase 303's independent method: the lifecycle partition,
 * RE-DERIVED from three sources with readers of this file's own.
 *
 * ## What it is for
 *
 * The lifecycle control before the State dropdown draws `Active` as
 * `row.gates.live || row.gates.unknown` and `Ended` as `row.gates.ended`, the
 * four booleans `sessionActionGates` already computes for every row. That is
 * one clause in `rowPasses` and it is deliberately NOT a table, because "live"
 * is already spelled three times in the tree and the entry refused a fourth.
 * So the risk is not the clause; it is main and the renderer drifting apart,
 * and the one disagreement on the face, the dot, being widened by accident.
 * This script reads all three with its own parser walks, none shared with
 * `build/p293/conformance-manager.mjs`, and holds them to each other:
 *
 *   Reader 0  `SESSION_STATUSES` in src/shared/types.ts, the alphabet, as the
 *             strings of its array literal.
 *   Reader 1  MAIN. `removeRefusal` in src/main/sessions/lifecycle-gate.ts:
 *             its switch, clause by clause, fall-through honoured. A clause
 *             whose return is an IDENTIFIER (a refusal sentence) is REFUSED;
 *             one whose return is the `null` keyword is PASSED.
 *   Reader 2  THE RENDERER. `sessionActionGates` in src/renderer/state/
 *             resume.ts: for the declarations named `unknown`, `ended` and
 *             `live`, every string on the right of a `===` in the initializer.
 *   Reader 3  THE DOT. `statusVisual` in src/renderer/app/status.ts: for each
 *             case, the `dot` of the FIRST return's object literal (for
 *             `exited` that is the `!endedBadly` branch, `ended`; for
 *             `restorable`, the first arm of its conditional, `idle`).
 *
 * The assertions, each printed with the sets it compared:
 *
 *   (a) every reader saw the seven statuses, each exactly once;
 *   (b) REFUSED equals live ∪ unknown as sets, which is what Active draws;
 *   (c) PASSED minus discarded equals ended, which is what Ended draws;
 *   (d) the statuses Active by (b) whose dot is 'ended' are EXACTLY {unknown}.
 *       The disagreement the entry states is asserted AS a disagreement, so a
 *       reader that read nothing cannot pass it.
 *
 * ## What it starts
 *
 * Nothing. Plain node, the TypeScript parser, four files read under src/.
 * No Electron, no tmux, no ssh, no agent, no token, nothing under the
 * person's home. It writes nothing into the tree: `--self-test` copies the
 * three files into a mkdtemp under the system temporary directory, breaks one
 * at a time with the others pristine, requires red each time, and removes the
 * copies in a `finally`.
 *
 * ## Exit codes
 *
 *   0  green         1  red         2  a reader found nothing to read
 *
 * ## Usage, from the worktree root
 *
 *   node build/p303/rederive.mjs                 the readers over this checkout
 *   node build/p303/rederive.mjs --root <dir>    over another checkout, e.g. the parent
 *   node build/p303/rederive.mjs --self-test     the readers proved able to go red
 *
 * Not in package.json this phase: a new script must be classified in
 * build/verification-checks.mjs for gate:checks, and the verifier runs it by
 * hand. It reaches no Electron, so HELPER_USER_FLOOR does not move.
 */

import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const TAG = '[p303-rederive]';
const say = (line) => process.stdout.write(`${TAG} ${line}\n`);
const J = (v) => JSON.stringify(v);
const sorted = (set) => [...set].sort();

const argv = process.argv.slice(2);
const rootArg = argv.indexOf('--root');
const ROOT =
  rootArg !== -1 && argv[rootArg + 1] !== undefined
    ? resolve(argv[rootArg + 1])
    : resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** The four sources, by role, under a root. */
const sourcesUnder = (root) => ({
  types: join(root, 'src', 'shared', 'types.ts'),
  gate: join(root, 'src', 'main', 'sessions', 'lifecycle-gate.ts'),
  resume: join(root, 'src', 'renderer', 'state', 'resume.ts'),
  // Phase 316.1 moved `statusVisual` to src/shared/status-words.ts; a parent
  // checkout from before that still has it in the renderer.
  status: existsSync(join(root, 'src', 'shared', 'status-words.ts'))
    ? join(root, 'src', 'shared', 'status-words.ts')
    : join(root, 'src', 'renderer', 'app', 'status.ts')
});

// ---------------------------------------------------------------------------
// The parser, and two walks
// ---------------------------------------------------------------------------

function parse(path) {
  return ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
}

/** Every node under one, depth first, the node itself first. */
function walk(node) {
  const out = [];
  const visit = (n) => {
    out.push(n);
    ts.forEachChild(n, visit);
  };
  visit(node);
  return out;
}

/** The function declaration of a name in a file, or null. */
function functionNamed(sf, name) {
  return walk(sf).find((n) => ts.isFunctionDeclaration(n) && n.name !== undefined && n.name.text === name) ?? null;
}

// ---------------------------------------------------------------------------
// The four readers. Each answers what it read and, when it could not read,
// why, so a missing shape is exit 2 and never a quiet empty set.
// ---------------------------------------------------------------------------

/** Reader 0. The alphabet. */
export function readStatuses(path) {
  const sf = parse(path);
  const decl = walk(sf).find((n) => ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === 'SESSION_STATUSES');
  if (decl === undefined) return { statuses: [], why: 'no variable declaration named SESSION_STATUSES' };
  const array = walk(decl).find((n) => ts.isArrayLiteralExpression(n));
  if (array === undefined) return { statuses: [], why: 'SESSION_STATUSES is not initialised with an array literal' };
  return { statuses: array.elements.filter((e) => ts.isStringLiteral(e)).map((e) => e.text), why: null };
}

/**
 * Reader 1. Main's switch. Clauses with no statements fall through to the
 * next clause that has some, and share its return.
 */
export function readRefusal(path) {
  const sf = parse(path);
  const fn = functionNamed(sf, 'removeRefusal');
  if (fn === null) return { refused: [], passed: [], unread: [], why: 'no function declaration named removeRefusal' };
  const sw = walk(fn).find((n) => ts.isSwitchStatement(n));
  if (sw === undefined) return { refused: [], passed: [], unread: [], why: 'removeRefusal holds no switch statement' };
  const refused = [];
  const passed = [];
  const unread = [];
  let pending = [];
  for (const clause of sw.caseBlock.clauses) {
    if (ts.isCaseClause(clause) && ts.isStringLiteral(clause.expression)) pending.push(clause.expression.text);
    if (clause.statements.length === 0) continue;
    const ret = walk(clause).find((n) => ts.isReturnStatement(n));
    const expr = ret === undefined ? undefined : ret.expression;
    if (expr !== undefined && ts.isIdentifier(expr)) refused.push(...pending);
    else if (expr !== undefined && expr.kind === ts.SyntaxKind.NullKeyword) passed.push(...pending);
    else unread.push(...pending);
    pending = [];
  }
  if (pending.length > 0) unread.push(...pending);
  return { refused, passed, unread, why: null };
}

/** Reader 2. The renderer's four booleans, three of which name statuses. */
export function readGates(path) {
  const sf = parse(path);
  const fn = functionNamed(sf, 'sessionActionGates');
  if (fn === null) return { live: [], unknown: [], ended: [], why: 'no function declaration named sessionActionGates' };
  const out = { live: [], unknown: [], ended: [], why: null };
  for (const name of ['live', 'unknown', 'ended']) {
    const decl = walk(fn).find((n) => ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === name);
    if (decl === undefined || decl.initializer === undefined) {
      out.why = `sessionActionGates declares no ${name}`;
      continue;
    }
    for (const n of walk(decl.initializer)) {
      if (!ts.isBinaryExpression(n) || n.operatorToken.kind !== ts.SyntaxKind.EqualsEqualsEqualsToken) continue;
      if (ts.isStringLiteral(n.right)) out[name].push(n.right.text);
    }
  }
  return out;
}

/** Reader 3. The dot each status is drawn with, from the first return of its case. */
export function readDots(path) {
  const sf = parse(path);
  const fn = functionNamed(sf, 'statusVisual');
  if (fn === null) return { dots: {}, why: 'no function declaration named statusVisual' };
  const sw = walk(fn).find((n) => ts.isSwitchStatement(n));
  if (sw === undefined) return { dots: {}, why: 'statusVisual holds no switch statement' };
  const dots = {};
  for (const clause of sw.caseBlock.clauses) {
    if (!ts.isCaseClause(clause) || !ts.isStringLiteral(clause.expression)) continue;
    const ret = walk(clause).find((n) => ts.isReturnStatement(n));
    const object = ret === undefined ? undefined : walk(ret).find((n) => ts.isObjectLiteralExpression(n));
    const dot = object?.properties.find((p) => ts.isPropertyAssignment(p) && ts.isIdentifier(p.name) && p.name.text === 'dot');
    dots[clause.expression.text] = dot !== undefined && ts.isStringLiteral(dot.initializer) ? dot.initializer.text : null;
  }
  return { dots, why: null };
}

// ---------------------------------------------------------------------------
// The assertions
// ---------------------------------------------------------------------------

/**
 * Read the four sources and hold them to each other. Answers the exit code
 * and every line it would print, so the self-test can run it over a broken
 * copy without printing the copy's lines as this checkout's.
 */
export function derive(sources) {
  const lines = [];
  const problems = [];
  const alphabet = readStatuses(sources.types);
  const main = readRefusal(sources.gate);
  const gates = readGates(sources.resume);
  const dots = readDots(sources.status);
  for (const [who, read] of [['reader 0 (types.ts)', alphabet], ['reader 1 (lifecycle-gate.ts)', main], ['reader 2 (resume.ts)', gates], ['reader 3 (status.ts)', dots]]) {
    if (read.why !== null) return { code: 2, lines: [`${who} found nothing to read: ${read.why}`] };
  }
  const statuses = new Set(alphabet.statuses);
  const refused = new Set(main.refused);
  const passed = new Set(main.passed);
  const live = new Set(gates.live);
  const unknown = new Set(gates.unknown);
  const ended = new Set(gates.ended);
  const active = new Set([...live, ...unknown]);
  const dotted = new Set(Object.keys(dots.dots));

  lines.push(`reader 0  SESSION_STATUSES        ${J(alphabet.statuses)}`);
  lines.push(`reader 1  removeRefusal REFUSED   ${J(sorted(refused))}`);
  lines.push(`reader 1  removeRefusal PASSED    ${J(sorted(passed))}`);
  lines.push(`reader 2  gates.live              ${J(sorted(live))}`);
  lines.push(`reader 2  gates.unknown           ${J(sorted(unknown))}`);
  lines.push(`reader 2  gates.ended             ${J(sorted(ended))}`);
  lines.push(`reader 3  statusVisual dot        ${J(dots.dots)}`);

  // (a) Seven, each once, in every reader.
  const once = (label, list) => {
    const seen = new Set(list);
    const dup = list.filter((s, i) => list.indexOf(s) !== i);
    if (dup.length > 0) problems.push(`(a) ${label} names ${J(dup)} more than once`);
    const missing = [...statuses].filter((s) => !seen.has(s));
    const extra = [...seen].filter((s) => !statuses.has(s));
    if (missing.length > 0) problems.push(`(a) ${label} never names ${J(missing)}`);
    if (extra.length > 0) problems.push(`(a) ${label} names ${J(extra)}, which is not a status`);
  };
  if (alphabet.statuses.length !== 7) problems.push(`(a) SESSION_STATUSES holds ${String(alphabet.statuses.length)} statuses, want 7`);
  once('reader 1 (refused + passed)', [...main.refused, ...main.passed, ...main.unread]);
  if (main.unread.length > 0) problems.push(`(a) reader 1 could not classify ${J(main.unread)}: its clause returns neither an identifier nor null`);
  // The renderer's three sets, with discarded (its fourth boolean, `removed`)
  // as the one status none of them names.
  once('reader 2 (live + unknown + ended + discarded)', [...gates.live, ...gates.unknown, ...gates.ended, 'discarded']);
  once('reader 3 (statusVisual cases)', [...dotted]);
  for (const [status, dot] of Object.entries(dots.dots)) {
    if (dot === null) problems.push(`(a) reader 3 read no dot for ${status}`);
  }

  // (b) Active is main's refusal set.
  const same = (a, b) => J(sorted(a)) === J(sorted(b));
  lines.push(`(b) REFUSED ${J(sorted(refused))} against live ∪ unknown ${J(sorted(active))}`);
  if (!same(refused, active)) problems.push(`(b) main refuses to remove ${J(sorted(refused))} while the renderer's Active is ${J(sorted(active))}`);

  // (c) Ended is main's pass set less discarded.
  const passedLessDiscarded = new Set([...passed].filter((s) => s !== 'discarded'));
  lines.push(`(c) PASSED minus discarded ${J(sorted(passedLessDiscarded))} against ended ${J(sorted(ended))}`);
  if (!same(passedLessDiscarded, ended)) problems.push(`(c) main passes ${J(sorted(passedLessDiscarded))} while the renderer's Ended is ${J(sorted(ended))}`);

  // (d) The one disagreement on the face, asserted as exactly one.
  const activeWithEndedDot = new Set([...active].filter((s) => dots.dots[s] === 'ended'));
  lines.push(`(d) Active by (b) drawn with the ended dot ${J(sorted(activeWithEndedDot))} against ${J(['unknown'])}`);
  if (!same(activeWithEndedDot, new Set(['unknown']))) {
    problems.push(`(d) the statuses Active by (b) and drawn with the ended dot are ${J(sorted(activeWithEndedDot))}, want exactly ["unknown"]: the entry states that one disagreement and no other`);
  }

  return { code: problems.length === 0 ? 0 : 1, lines, problems };
}

// ---------------------------------------------------------------------------
// The self-test: each reader proved able to go red, one edit per file, the
// other two pristine, in copies this script removes in a `finally`.
// ---------------------------------------------------------------------------

function selfTest() {
  const real = sourcesUnder(ROOT);
  const scratch = mkdtempSync(join(tmpdir(), 'p303-rederive-'));
  const copyOf = (role) => {
    const at = join(scratch, `${role}.ts`);
    writeFileSync(at, readFileSync(real[role]));
    return at;
  };
  /** One exact edit on one copy; a shape not found is a failure of the fixture itself. */
  const edited = (role, edits) => {
    const at = copyOf(role);
    let text = readFileSync(at, 'utf8');
    for (const [from, to] of edits) {
      if (!text.includes(from)) throw new Error(`the self-test's edit to ${role} did not find ${J(from)}; the shape moved and this fixture moves with it`);
      text = text.replace(from, () => to);
    }
    writeFileSync(at, text, 'utf8');
    return at;
  };
  const fixtures = [
    {
      name: 'the pristine sources are green',
      make: () => real,
      want: 0
    },
    {
      name: "resume.ts: 'idle' moved from live to ended, so (b) and (c) both break",
      make: () => ({
        ...real,
        resume: edited('resume', [
          ["const ended = status === 'exited' || status === 'restorable';", "const ended = status === 'exited' || status === 'restorable' || status === 'idle';"],
          ["status === 'running' || status === 'idle' || status === 'needs_input';", "status === 'running' || status === 'needs_input';"]
        ])
      }),
      want: 1
    },
    {
      name: "lifecycle-gate.ts: case 'unknown' moved under return null, so (b) and (c) both break",
      make: () => ({
        ...real,
        gate: edited('gate', [
          ["    case 'unknown':\n      return REMOVE_REFUSED_UNKNOWN;\n", ''],
          ["    case 'exited':\n", "    case 'exited':\n    case 'unknown':\n"]
        ])
      }),
      want: 1
    },
    {
      name: "status.ts: unknown's dot changed to 'idle', so (d) reads no disagreement and breaks",
      make: () => ({
        ...real,
        status: edited('status', [["return { dot: 'ended', label: 'unreachable' };", "return { dot: 'idle', label: 'unreachable' };"]])
      }),
      want: 1
    },
    {
      name: 'a file with none of the shapes is exit 2, never a quiet green',
      make: () => {
        const empty = join(scratch, 'empty.ts');
        writeFileSync(empty, 'export const nothing = 1;\n', 'utf8');
        return { ...real, gate: empty };
      },
      want: 2
    }
  ];
  let ok = true;
  try {
    for (const one of fixtures) {
      let got;
      let detail = '';
      try {
        const r = derive(one.make());
        got = r.code;
        detail = r.code === 0 ? '' : ` — ${(r.problems ?? r.lines).join(' // ')}`;
      } catch (err) {
        got = `THREW ${err instanceof Error ? err.message : String(err)}`;
      }
      const good = got === one.want;
      ok = ok && good;
      say(`${good ? 'ok  ' : 'BAD '} ${one.name}: exit ${String(got)}, want ${String(one.want)}${detail.slice(0, 300)}`);
    }
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
  say(ok ? `self-test PASS: ${String(fixtures.length)} fixtures behaved, the copies are gone` : 'self-test FAIL');
  return ok;
}

if (argv.includes('--self-test')) process.exit(selfTest() ? 0 : 1);

const r = derive(sourcesUnder(ROOT));
for (const line of r.lines) say(line);
if (r.code === 2) {
  say(`NOTHING TO READ under ${ROOT}: ${r.lines[r.lines.length - 1]}`);
  process.exit(2);
}
if (r.code !== 0) {
  for (const p of r.problems) say(`  - ${p}`);
  say(`FAIL: ${String(r.problems.length)} problem(s). Main, the gates and the dot do not agree the way the Phase 303 entry says they do.`);
  process.exit(1);
}
say('PASS: main refuses exactly what the renderer calls Active, passes exactly what it calls Ended plus discarded, and the one disagreement on the face is unknown\'s ended dot and nothing else. No Electron, no tmux, no ssh, no agent, nothing under the person\'s home.');
process.exit(0);
