#!/usr/bin/env node
/**
 * `npm run conformance:ownwords`. PHASE 325.1 — TORTIE KNOWS HIS OWN WORDS BY
 * WHAT HE TYPED, NOT BY WHEN (build/p3251/SPEC.md §4.6, D3251-12; the Phase
 * 325.1 entry in docs/BACKLOG.md, mechanism 5).
 *
 * About a second. It launches no Electron, starts no tmux server, spawns
 * NOTHING (not even the pinned tsx), makes no request, spends no token and
 * reads nothing under the person's home. It reads this repository's own source
 * with the TypeScript parser, which is a module and not a process, and asserts
 * over it. Comments are trivia to the parser, so no clause is satisfied or
 * broken by prose.
 *
 * ## What this gate is for
 *
 * CLAUDE.md's UI rule: "needs input" may only be triggered by session
 * behaviour, never by the user's own input to that session. Phase 325.1 keeps
 * it with a RECORD of what he has typed and not sent (src/main/activity/
 * own-words.ts), fed by five writers (the fix round added the phone's
 * message's closing Enter), and a RULE beside the dialog line that
 * reads a numbered dialog as his when his own lines drew the rows that make it
 * one. The behaviour is driven in src/main/activity/__tests__/own-words.test.ts
 * and p3251-own-words.test.ts. This gate is the STRUCTURAL half: the clauses no
 * green test can keep in place, because a round can change a rule and its test
 * in one edit, and the ones that keep his words out of every log, file and
 * process but main's memory.
 *
 * ## The clauses
 *
 *    O1  the writers and no other: the monitor's `noteOwnWords` called four
 *        times, by core.ts's attach-host `onInput` arrow and capabilities.ts's
 *        keys and paste arrows, each handing on its own two parameters, and
 *        (the fix round) by the reply writer's `say`, handing its closing
 *        Enter alone and never his words; core's arrow is exactly the bump
 *        and the note, so nothing else is handed his chunk; the phone verbs'
 *        `deps.noteOwnWords?.(` once each; `noteReplayedScreen(` once, in
 *        core.ts, after `const { info } = outcome;` and before
 *        `this.liveIds.set(…)` with nothing awaited between; `noteOwnWordsOn(`
 *        and `noteReplayedOn(` only in monitor.ts, once each
 *    O2  the tap: attach-host.ts calls `onInput` once, handing `req.sessionId`
 *        and the very chunk `pty.write` was handed, after that write, under
 *        Phase 318's local and no-report guard, and the option is typed
 *        `(sessionId: string, data: string) => void`
 *    O3  no clock: own-words.ts names no time, and (the fix round) no global
 *        but the few its reader and match compute with (`OWN_GLOBALS`, an
 *        allowlist, so `process`, `globalThis`, `Intl` or a clock not yet
 *        thought of reads red by name); `dialogIsHisWords` takes the screen and
 *        the record and nothing else; the `own` line names the numbered
 *        verdict, the shapes, the state, the screen and the record; and (the
 *        probe review) the monitor's two writers are each the one statement
 *        that hands the record on, so a key stamps no clock and moves nothing
 *        else
 *    O4  never logged, never leaves main: own-words.ts names no log call and
 *        imports the screen alone; no log call on the record's paths names his
 *        bytes; (the probe review) no log call anywhere names the record or the
 *        replayed rows, the house's `<domain>Log` bindings included; no
 *        renderer, preload, shared, door, push or alerts file names the record
 *    O5  the record forgets: one cap of 16,384; a carriage return outside a
 *        paste, Ctrl-C and (the fix round) Ctrl-U each clear it; it is a field
 *        of `SessionState` made in
 *        `freshState`, and no module-level map, set or `let` holds one; and
 *        (the probe review) it is named nowhere but that member, `freshState`,
 *        the `own` line and the monitor's two writers, so a clear on a clock or
 *        a copy into another field reads red; and (his ruled round, the
 *        reverify's window by count) own-words.ts builds no object or array
 *        at module level, runs no call when it loads, and writes to no member
 *        of a name declared there, so a `const` holder bumped by the rule, or
 *        a counter an IIFE keeps, reads red; and (the ruled round's probe
 *        review) it keeps no `var` outside a function, reassigns no name
 *        declared there, writes to no member of a global, of `this` in a
 *        static member or of a local that names any of these, and uses a
 *        regex with the `g` flag only through `replace`, `replaceAll` or
 *        `split` and one with `y` not at all, beside honest copies that keep
 *        nothing between calls and must read green
 *    O6  whole lines only: the match compares by `startsWith` over successive
 *        rows ending at the line's length, with no substring search, and its
 *        mark holds no letter (`\p{L}`) and no digit (`\p{N}`)
 *    O7  beside the verdict: the dialog line unchanged, `own` the statement
 *        after it, read once by the arm `dialog && !own`; own-words.ts asks
 *        `detectDialogRows` once and never `detectDialog` or `detectShapes`,
 *        and (the fix round) `dialogEvidenceRows` once, which nothing else in
 *        production reads; `dialogIsHisWords` writes nothing through its
 *        parameters
 *    O8  the replay's rows: restore.ts's `REPLAY_TAIL_ROWS` is the verdict's
 *        `DIALOG_ROWS`, and `replayedTail` is set only once the replay was
 *        typed
 *    O9  the phone's bytes: keys.ts's named-key table has exactly the
 *        contract's key names; each phone verb hands the record once, after its
 *        one `noteUserInput(`, inside the act's success test, in a try of its
 *        own, the keys only for a session on this Mac
 *    O10 the exempt, named: every production file that calls the desk's funnel
 *        `noteUserInput(` hands the record too, or is named in `OWN_EXEMPT`
 *        with its reason
 *
 * EACH CARRIES ITS OWN ATTACK: the clause is asked again over in-memory copies
 * of the tree with its rule broken, one way at a time, and every copy must
 * read red; and over an unedited copy it must read green. `npm run
 * ablation:p3251` is the attack on the rule's BEHAVIOUR beside it.
 *
 * THE INTEGRATOR'S SEAMS. O1, O4 and O10 read core.ts's and capabilities.ts's
 * wiring (build/p3251/SPEC.md §4.5, S1 to S3). Until those land, the live tree
 * reads red there, by name; the self-tests plant the seams in the spec's shape
 * over a copy, so every clause is shown to pass on a correct wiring and to
 * fail on a broken one before the integrator lands it.
 *
 * Usage: node build/conformance-ownwords.mjs [--verbose]
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const TAG = '[conformance:ownwords]';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const say = (l) => process.stdout.write(`${TAG} ${l}\n`);
/** `--verbose` prints what each self-test was caught by, so a reader can see it is red for its own reason. */
const VERBOSE = process.argv.includes('--verbose');

const OWN = 'src/main/activity/own-words.ts';
const STATE = 'src/main/activity/state-machine.ts';
const MONITOR = 'src/main/activity/monitor.ts';
const SCREEN = 'src/main/activity/screen.ts';
const HOST = 'src/main/attach/attach-host.ts';
const CORE = 'src/main/sessions/core.ts';
const CAPS = 'src/main/capabilities.ts';
const KEYS = 'src/main/screen/keys.ts';
const PASTE = 'src/main/screen/paste.ts';
const RESTORE = 'src/main/restore/restore.ts';
const CONTRACT = 'src/shared/ipc/pocket.ts';
/** Where the record may never be named: everything that is not main's activity, its writers or its wiring. */
const NEVER_DIRS = ['src/renderer', 'src/preload', 'src/shared', 'src/main/pocket', 'src/main/push', 'src/main/alerts'];
const RECORD_NAMES = ['ownWords', 'OwnWords', 'noteOwnWords', 'noteReplayedScreen', 'replayedTail', 'dialogIsHisWords'];
/** What a log call on the record's paths may never name (O4). */
const HIS_BYTES = ['data', 'text', 'ownWords', 'replayedTail', 'input'];
/** The words that would make the rule a clock (O3). */
const CLOCK = ['Date', 'performance', 'setTimeout', 'setInterval', 'now', 'activityAt', 'QUIET_MS'];
/** The lines the probe review's self-tests plant beside (O3, O5): the monitor's two writers and the verdict's quiet line. */
const MONITOR_WRITER = '    noteOwnWordsOn(this.ensureState(sessionId).ownWords, data);';
const MONITOR_REPLAY = '    noteReplayedOn(this.ensureState(sessionId).ownWords, text);';
const VERDICT_QUIET = '  const quiet = ctx.now - pane.activityAt > QUIET_MS;';
/** The rule's first test of the record, which the O5 plants of the ruled round's probe review write after. */
const RULE_LINE = '  if (lines.length === 0) return false;\n';

/**
 * A production file that calls the desk's funnel `noteUserInput(` and hands
 * the record nothing, each with the reason his words cannot stay unsent on the
 * screen through it (O10, D3251-9). An exemption that excuses no file any more
 * is itself a finding. Phase 318's reply writer left this list in the fix
 * round: its say hands the record its closing Enter (O1), and its press types
 * the agent's own single digit, of which no row can be made.
 */
const OWN_EXEMPT = {
  'src/main/ipc.ts':
    "the renderer's release (`activity:noteInput`), asked only while a row reads needs input; the desk's words reach the record through the attach host's tap, which sees every byte of them"
};
const WRITER = 'src/main/reply/writer.ts';
/** The one thing the reply writer's say hands the record (O1): its closing Enter, a submit, and never his words. */
const SAY_SUBMIT = "core.activity.noteOwnWords?.(id, '\\r')";
/**
 * THE GLOBALS own-words.ts MAY NAME (O3, the fix round): what its reader and
 * its match compute with. An allowlist, because a denylist of clocks let a
 * window read through `process.uptime()` pass every clause: anything else it
 * names that it does not declare or import, a clock, a timer, `process`,
 * `globalThis`, `Intl`, `Temporal`, `Atomics`, `performance`, reads red.
 */
const OWN_GLOBALS = new Set(['Math', 'Set', 'Map', 'String', 'Number', 'Array', 'Object', 'undefined', 'Infinity', 'NaN']);

// ---------------------------------------------------------------------------
// Reading and parsing
// ---------------------------------------------------------------------------

const read = (rel) => {
  try {
    return readFileSync(join(ROOT, rel), 'utf8');
  } catch {
    return null;
  }
};

/** Every production source under a directory, tests and fixtures excluded, as `[rel, text]`. */
function productionFiles(dir) {
  const out = [];
  const walk = (rel) => {
    let entries;
    try {
      entries = readdirSync(join(ROOT, rel)).sort();
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry === '__tests__' || entry === 'fixtures' || entry === 'node_modules') continue;
      const path = `${rel}/${entry}`;
      if (statSync(join(ROOT, path)).isDirectory()) walk(path);
      else if (/\.(?:ts|tsx|mts)$/.test(entry) && !/\.test\.tsx?$/.test(entry) && !/\.d\.ts$/.test(entry)) out.push([path, read(path) ?? '']);
    }
  };
  walk(dir);
  return out;
}

const parsed = new Map();
function parse(rel, text) {
  const key = `${rel}\u0000${text}`;
  let sf = parsed.get(key);
  if (sf === undefined) {
    sf = ts.createSourceFile(rel, text, ts.ScriptTarget.Latest, true, rel.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    parsed.set(key, sf);
  }
  return sf;
}

/** Every node under `node` (itself included) that `pred` holds of. */
function findAll(node, pred) {
  const out = [];
  const visit = (n) => {
    if (pred(n)) out.push(n);
    ts.forEachChild(n, visit);
  };
  visit(node);
  return out;
}
const calleeName = (c) =>
  ts.isIdentifier(c.expression) ? c.expression.text : ts.isPropertyAccessExpression(c.expression) ? c.expression.name.text : '';
const callsNamed = (node, name) => findAll(node, (n) => ts.isCallExpression(n) && calleeName(n) === name);
const flat = (t) => t.replace(/\s+/g, ' ').trim();
const within = (inner, outer) => inner.getStart() >= outer.getStart() && inner.getEnd() <= outer.getEnd();
const functionNamed = (sf, name) => findAll(sf, (n) => ts.isFunctionDeclaration(n) && n.name?.text === name)[0] ?? null;
const methodNamed = (sf, name) => findAll(sf, (n) => ts.isMethodDeclaration(n) && n.name.getText() === name)[0] ?? null;

/** The nearest `if` above a node, inside its function, whose then-branch holds it, or null. */
function enclosingIf(node) {
  for (let n = node; n.parent !== undefined; n = n.parent) {
    if (ts.isIfStatement(n.parent) && n.parent.thenStatement === n) return n.parent;
    if (ts.isFunctionLike(n.parent)) return null;
  }
  return null;
}

/** The statement a node sits in, directly inside `block`, or null. */
function statementIn(node, block) {
  for (let n = node; n.parent !== undefined; n = n.parent) if (n.parent === block) return n;
  return null;
}

/** An `await` in a node, not inside a function nested in it. */
function awaits(node) {
  let found = false;
  const visit = (n) => {
    if (found) return;
    if (ts.isAwaitExpression(n)) {
      found = true;
      return;
    }
    if (n !== node && ts.isFunctionLike(n)) return;
    ts.forEachChild(n, visit);
  };
  visit(node);
  return found;
}

// ---------------------------------------------------------------------------
// Log calls
// ---------------------------------------------------------------------------

/** Every name a file binds to `getLog(…)`, discovered, plus the loggers spelled everywhere. */
function loggersOf(sf) {
  const names = new Set(['console', 'log', 'logger']);
  for (const d of findAll(sf, ts.isVariableDeclaration)) {
    if (ts.isIdentifier(d.name) && d.initializer !== undefined && ts.isCallExpression(d.initializer) && calleeName(d.initializer) === 'getLog') names.add(d.name.text);
  }
  return names;
}

/** A call on something that logs: a logger's method, `getLog(…)`'s, or a bare log function. */
function isLogCall(c, loggers) {
  const e = c.expression;
  if (ts.isIdentifier(e)) return ['log', 'logLine', 'appLog', 'debugLog'].includes(e.text);
  if (!ts.isPropertyAccessExpression(e)) return false;
  const recv = e.expression;
  if (ts.isIdentifier(recv)) return loggers.has(recv.text) || /Log$/.test(recv.text);
  if (ts.isPropertyAccessExpression(recv)) return loggers.has(recv.name.text) || /Log$/.test(recv.name.text);
  if (ts.isCallExpression(recv)) return calleeName(recv) === 'getLog';
  return false;
}

const logCallsIn = (scope, sf) => {
  const loggers = loggersOf(sf);
  return findAll(scope, (n) => ts.isCallExpression(n) && isLogCall(n, loggers));
};

/** The log calls in a scope that name one of `words` as a value (an object key alone is no value). */
function logsNaming(scope, sf, words = HIS_BYTES) {
  const out = [];
  for (const c of logCallsIn(scope, sf)) {
    const named = new Set();
    for (const a of c.arguments) {
      for (const id of findAll(a, ts.isIdentifier)) {
        if (ts.isPropertyAssignment(id.parent) && id.parent.name === id) continue;
        if (words.includes(id.text)) named.add(id.text);
      }
    }
    if (named.size > 0) out.push(`${flat(c.getText()).slice(0, 70)} names ${[...named].join(', ')}`);
  }
  return out;
}

// ---------------------------------------------------------------------------
// The tree these clauses read
// ---------------------------------------------------------------------------

/** Every production source the clauses read, one map, so an attack edits or adds a file in one place. */
function liveTree() {
  const files = new Map();
  for (const dir of ['src/main', 'src/preload', 'src/renderer', 'src/shared']) for (const [rel, text] of productionFiles(dir)) files.set(rel, text);
  return { files };
}
const textOf = (t, rel) => t.files.get(rel) ?? '';
const sfOf = (t, rel) => parse(rel, textOf(t, rel));
const withFile = (t, rel, text) => ({ files: new Map(t.files).set(rel, text) });

/** The tree with `from` replaced by `to` once in one file, or null when `from` is not there. */
function edit(t, rel, from, to) {
  const text = textOf(t, rel);
  if (!text.includes(from)) return null;
  return withFile(t, rel, text.replace(from, () => to));
}

/** The tree with one node's text replaced, or null when the node was not found. */
function replaceNode(t, rel, node, to) {
  if (node === null || node === undefined) return null;
  const text = textOf(t, rel);
  return withFile(t, rel, text.slice(0, node.getStart()) + to + text.slice(node.getEnd()));
}

/**
 * The reverify's window by COUNT (build/p3251/SPEC.md §As built, his ruled
 * round), planted over a copy: a field stamped by the reader, a module-level
 * `const READS = { n: 0 }` the rule bumps, and `gate` the line that decides.
 */
function countWindow(t, gate) {
  let a = edit(t, OWN, '  replayed: boolean;\n}', '  replayed: boolean;\n  keyTick: number;\n}');
  a = a && edit(a, OWN, 'inPaste: false, escAlone: false, replayed: false };', 'inPaste: false, escAlone: false, replayed: false, keyTick: 0 };');
  a = a && edit(a, OWN, 'const TILE_BUDGET = 50_000;', 'const TILE_BUDGET = 50_000;\nconst READS = { n: 0 };');
  a = a && edit(a, OWN, 'export function noteOwnWordsOn(words: OwnWords, data: string): void {\n', 'export function noteOwnWordsOn(words: OwnWords, data: string): void {\n  words.keyTick = READS.n;\n');
  return a && edit(a, OWN, '  if (lines.length === 0) return false;\n', `  if (lines.length === 0) return false;\n  READS.n += 1;\n${gate}`);
}

/** The arrow core.ts hands the attach host as `onInput`, or null. */
function coreOnInput(t) {
  const sf = sfOf(t, CORE);
  return (
    findAll(
      sf,
      (n) => ts.isPropertyAssignment(n) && n.name.getText() === 'onInput' && n.initializer !== undefined && ts.isArrowFunction(n.initializer)
    )[0]?.initializer ?? null
  );
}

/** The object literal capabilities.ts hands one phone verb's builder, or null. */
function verbDeps(t, verb) {
  const built = callsNamed(sfOf(t, CAPS), verb);
  const lit = built.length === 1 ? built[0].arguments[0] : undefined;
  return lit !== undefined && ts.isObjectLiteralExpression(lit) ? lit : null;
}

/** The `noteOwnWords` property of one phone verb's deps in capabilities.ts, or null. */
function verbWriter(t, verb) {
  const lit = verbDeps(t, verb);
  return lit?.properties.find((p) => ts.isPropertyAssignment(p) && p.name.getText() === 'noteOwnWords') ?? null;
}

/** The statement `const { info } = outcome;` in core.ts, or null. */
function infoStatement(sf) {
  return (
    findAll(
      sf,
      (n) =>
        ts.isVariableStatement(n) &&
        n.declarationList.declarations.length === 1 &&
        flat(n.declarationList.declarations[0].getText()) === '{ info } = outcome'
    )[0] ?? null
  );
}

/**
 * The tree with the integrator's three seams in build/p3251/SPEC.md §4.5's
 * shape when the live core.ts and capabilities.ts do not carry them yet, so
 * the clauses that read them can be shown to pass on a correct wiring and to
 * fail on a broken one before the integrator lands it. Each seam is planted
 * only where it is missing; null when the files moved too far for it.
 */
function seamed(t) {
  let s = t;
  const arrow = coreOnInput(s);
  if (arrow === null) return null;
  if (callsNamed(arrow, 'noteOwnWords').length === 0) {
    if (arrow.parameters.length !== 1 || !ts.isBlock(arrow.body)) return null;
    const id = arrow.parameters[0].name.getText();
    const body = arrow.body.statements.map((st) => st.getText()).join('\n        ');
    s = replaceNode(s, CORE, arrow, `(${id}, data) => {\n        ${body}\n        this.activity.noteOwnWords(${id}, data);\n      }`);
  }
  if (callsNamed(sfOf(s, CORE), 'noteReplayedScreen').length === 0) {
    const info = infoStatement(sfOf(s, CORE));
    if (info === null) return null;
    const text = textOf(s, CORE);
    const at = info.getEnd();
    s = withFile(
      s,
      CORE,
      `${text.slice(0, at)}\n      if (outcome.kind !== 'shell_only' && outcome.replayedTail !== undefined) this.activity.noteReplayedScreen(rec.id, outcome.replayedTail);${text.slice(at)}`
    );
  }
  for (const verb of ['createScreenKeys', 'createScreenPaste']) {
    if (verbWriter(s, verb) !== null) continue;
    const lit = verbDeps(s, verb);
    const first = lit?.properties[0];
    if (first === undefined) return null;
    const text = textOf(s, CAPS);
    const at = first.getStart();
    s = withFile(s, CAPS, `${text.slice(0, at)}noteOwnWords: (sessionId, data) => pocketCore?.activity.noteOwnWords(sessionId, data),\n    ${text.slice(at)}`);
  }
  return s;
}

// ---------------------------------------------------------------------------
// The clauses, each a function of a tree answering its findings
// ---------------------------------------------------------------------------

/** Whether an arrow of two parameters hands both, in order, to one `<receiver>.noteOwnWords(` call, and calls it once. */
function handsItsTwo(arrow, receiver) {
  if (arrow === null || !ts.isArrowFunction(arrow) || arrow.parameters.length !== 2) return false;
  const [a, b] = arrow.parameters.map((p) => p.name.getText());
  const calls = callsNamed(arrow, 'noteOwnWords');
  return calls.length === 1 && flat(calls[0].getText()) === `${receiver}.noteOwnWords(${a}, ${b})`;
}

/** O1. The writers and no other. */
function writersFindings(t) {
  const out = [];
  const monitor = [];
  const verbs = [];
  for (const [rel, text] of t.files) {
    if (!rel.startsWith('src/') || !/\bnoteOwnWords\b/.test(text)) continue;
    const sf = parse(rel, text);
    for (const c of callsNamed(sf, 'noteOwnWords')) {
      const recv = ts.isPropertyAccessExpression(c.expression) ? flat(c.expression.expression.getText()) : '';
      if (/(?:^|\.|\?\.)activity$/.test(recv)) monitor.push({ rel, c });
      else if (recv === 'deps' && (rel === KEYS || rel === PASTE)) verbs.push({ rel, c });
      else out.push(`${rel} calls noteOwnWords (${flat(c.getText()).slice(0, 60)}): a writer of the record that is none of the four the spec names`);
    }
  }
  // The desk: core.ts's attach-host `onInput`, an arrow of two, handing both on.
  const arrow = coreOnInput(t);
  const host = arrow === null ? null : arrow.parent?.parent?.parent;
  const inHost = host !== null && host !== undefined && ts.isNewExpression(host) && /AttachHost$/.test(host.expression.getText());
  if (!handsItsTwo(arrow, 'this.activity') || !inHost) {
    out.push(
      `${CORE}'s attach-host onInput is ${JSON.stringify(arrow === null ? 'absent' : flat(arrow.getText()).slice(0, 90))}; S1 is ` +
        "`(sessionId, data) => { replyTurns.bump(sessionId, 'desk'); this.activity.noteOwnWords(sessionId, data); }` (build/p3251/SPEC.md §4.5, the integrator's seam)"
    );
  } else {
    // The fix round: the arrow is EXACTLY the bump and the note, so his chunk
    // reaches no third place from it (a broadcast to the renderer read red only
    // through a test's ReferenceError before).
    const [id, chunk] = arrow.parameters.map((p) => p.name.getText());
    const body = ts.isBlock(arrow.body) ? arrow.body.statements.map((st) => flat(st.getText())) : [flat(arrow.body.getText())];
    const want = [`replyTurns.bump(${id}, 'desk');`, `this.activity.noteOwnWords(${id}, ${chunk});`];
    if (JSON.stringify(body) !== JSON.stringify(want)) {
      out.push(`${CORE}'s attach-host onInput holds ${JSON.stringify(body)}; it is exactly Phase 318's bump and then the note, ${JSON.stringify(want)}, so his chunk goes nowhere else`);
    }
  }
  // The phone: capabilities.ts's two arrows.
  const wired = [];
  for (const verb of ['createScreenKeys', 'createScreenPaste']) {
    const prop = verbWriter(t, verb);
    if (prop === null || !handsItsTwo(prop.initializer, 'pocketCore?.activity')) {
      out.push(
        `${CAPS} hands ${verb}( ${prop === null ? 'no noteOwnWords' : `noteOwnWords as ${JSON.stringify(flat(prop.initializer.getText()))}`}; ` +
          'S3 is `noteOwnWords: (sessionId, data) => pocketCore?.activity.noteOwnWords(sessionId, data)` (the integrator\'s seam)'
      );
    } else wired.push(prop);
  }
  // The reply writer's say (the fix round): its closing Enter, a submit, and
  // never his words, once the paste landed, in a try of its own.
  const say = functionNamed(sfOf(t, WRITER), 'say');
  const sayNotes = monitor.filter(({ rel, c }) => rel === WRITER && say !== null && within(c, say));
  for (const { c } of sayNotes) {
    const landed = say === null ? undefined : findAll(say, (n) => ts.isExpressionStatement(n) && flat(n.getText()) === 'pasted = true;')[0];
    let tryStmt = c.parent;
    while (tryStmt !== undefined && !ts.isTryStatement(tryStmt) && !ts.isFunctionLike(tryStmt)) tryStmt = tryStmt.parent;
    const ownTry = tryStmt !== undefined && ts.isTryStatement(tryStmt) && tryStmt.tryBlock.statements.length === 1 && within(c, tryStmt.tryBlock);
    if (flat(c.getText()) !== SAY_SUBMIT) out.push(`${WRITER}'s say hands the record ${JSON.stringify(flat(c.getText()))}; it hands its closing Enter alone, \`${SAY_SUBMIT}\`, and never his words`);
    if (landed === undefined || landed.getEnd() > c.getStart()) out.push(`${WRITER}'s say hands the record its Enter before \`pasted = true;\`: a message the record forgets must have landed`);
    if (!ownTry) out.push(`${WRITER}'s say hands the record its Enter outside a try of its own: a record that throws must leave the message answered as it is`);
  }
  const placed = monitor.filter(
    ({ rel, c }) =>
      (rel === CORE && arrow !== null && within(c, arrow)) || (rel === CAPS && wired.some((p) => within(c, p))) || sayNotes.some((x) => x.c === c)
  );
  if (monitor.length !== 4 || placed.length !== monitor.length || sayNotes.length !== 1) {
    out.push(
      `the monitor's noteOwnWords is called ${String(monitor.length)} time(s) (${monitor.map(({ rel }) => rel).join(', ') || 'nowhere'}), ` +
        `${String(placed.length)} of them in their four places; exactly four, the desk's tap, the phone's keys and paste, and the phone's message's Enter`
    );
  }
  for (const rel of [KEYS, PASTE]) {
    const n = verbs.filter((v) => v.rel === rel).length;
    if (n !== 1) out.push(`${rel} calls deps.noteOwnWords ${String(n)} time(s); once (O9 reads where)`);
  }
  // The restore: noteReplayedScreen once, in core.ts, between the outcome's
  // `info` and the live id, with nothing awaited between.
  const replays = [];
  for (const [rel, text] of t.files) {
    if (!rel.startsWith('src/') || !text.includes('noteReplayedScreen')) continue;
    for (const c of callsNamed(parse(rel, text), 'noteReplayedScreen')) replays.push({ rel, c });
  }
  if (replays.length !== 1 || replays[0].rel !== CORE) {
    out.push(
      `noteReplayedScreen( is called ${String(replays.length)} time(s) (${replays.map(({ rel }) => rel).join(', ') || 'nowhere'}); ` +
        'once, in core.ts, after the restore (S2, the integrator\'s seam)'
    );
  } else {
    const call = replays[0].c;
    const sf = sfOf(t, CORE);
    const info = infoStatement(sf);
    const block = info?.parent;
    const stmt = block === undefined ? null : statementIn(call, block);
    const live = block === undefined ? undefined : block.statements.find((st) => flat(st.getText()) === 'this.liveIds.set(sessionId, info.sessionId);');
    const i = block?.statements.indexOf(info) ?? -1;
    const s = stmt === null || block === undefined ? -1 : block.statements.indexOf(stmt);
    const l = live === undefined || block === undefined ? -1 : block.statements.indexOf(live);
    if (!(i >= 0 && s > i && l > s)) {
      out.push("core.ts's noteReplayedScreen is not between `const { info } = outcome;` and `this.liveIds.set(sessionId, info.sessionId);` in one block");
    } else if (block.statements.slice(i + 1, l).some((st) => awaits(st))) {
      out.push("something is awaited between core.ts's `const { info } = outcome;` and `this.liveIds.set(…)`, so a tick could read the session before its record holds the replay");
    }
    const args = call.arguments.map((a) => flat(a.getText()));
    if (flat(call.expression.getText()) !== 'this.activity.noteReplayedScreen' || !['rec.id', 'sessionId'].includes(args[0] ?? '') || args[1] !== 'outcome.replayedTail') {
      out.push(`core.ts calls ${flat(call.getText()).slice(0, 80)}; S2 hands this.activity.noteReplayedScreen the session and outcome.replayedTail`);
    }
  }
  // The reader and the replay entry, called by the monitor alone.
  for (const name of ['noteOwnWordsOn', 'noteReplayedOn']) {
    const sites = [];
    for (const [rel, text] of t.files) {
      if (rel === OWN || !rel.startsWith('src/') || !text.includes(name)) continue;
      for (const c of callsNamed(parse(rel, text), name)) sites.push(rel);
    }
    if (sites.length !== 1 || sites[0] !== MONITOR) out.push(`${name}( is called from ${sites.join(', ') || 'nowhere'}; once, from ${MONITOR}`);
  }
  return out;
}

/** O2. The tap. */
function tapFindings(t) {
  const out = [];
  const sf = sfOf(t, HOST);
  const on = findAll(
    sf,
    (n) =>
      ts.isCallExpression(n) &&
      ts.isPropertyAccessExpression(n.expression) &&
      n.expression.expression.getText() === 'ipcMain' &&
      n.expression.name.text === 'on' &&
      n.arguments[0]?.getText() === 'inputChannel'
  )[0];
  const name = on?.arguments[1]?.getText();
  const decl = findAll(sf, (n) => ts.isVariableDeclaration(n) && n.name.getText() === name && n.initializer !== undefined && ts.isArrowFunction(n.initializer))[0];
  const listener = decl?.initializer ?? null;
  if (listener === null) return [`${HOST} hands ipcMain.on(inputChannel, …) no arrow listener`];
  const writes = findAll(listener, (n) => ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && n.expression.name.text === 'write' && /pty$/.test(n.expression.expression.getText()));
  const taps = findAll(sf, (n) => ts.isCallExpression(n) && calleeName(n) === 'onInput' && ts.isPropertyAccessExpression(n.expression) && /(?:^|\.)opts$/.test(n.expression.expression.getText()));
  if (writes.length !== 1) out.push(`the term:input listener writes to the pty ${String(writes.length)} times; once`);
  if (taps.length !== 1) return [...out, `${HOST} calls this.opts.onInput ${String(taps.length)} times; once`];
  const tap = taps[0];
  const write = writes[0];
  if (!within(tap, listener)) out.push('the tap is not inside the term:input listener');
  if (write !== undefined && write.getStart() > tap.getStart()) out.push('the tap is called before the write; the bytes are written first, exactly as before');
  const guard = enclosingIf(tap);
  const cond = flat(guard?.expression.getText() ?? '');
  if (!/\breq\.machine === undefined\b/.test(cond) || !/!isPaneReport\(data\)/.test(cond)) {
    out.push(`the tap's guard is ${JSON.stringify(cond)}, not Phase 318's req.machine === undefined && !isPaneReport(data) (conformance:pocket Y17)`);
  }
  const written = write?.arguments[0]?.getText();
  const args = tap.arguments.map((a) => a.getText());
  if (args.length !== 2 || args[0] !== 'req.sessionId' || written === undefined || args[1] !== written) {
    out.push(`the tap is handed (${args.join(', ')}), not req.sessionId and ${written ?? 'the chunk'} the pty was handed`);
  }
  const option = findAll(sf, (n) => ts.isPropertySignature(n) && n.name.getText() === 'onInput')[0];
  if (option === undefined || flat(option.type?.getText() ?? '') !== '(sessionId: string, data: string) => void') {
    out.push(`the tap's type is ${JSON.stringify(flat(option?.type?.getText() ?? 'absent'))}, not (sessionId: string, data: string) => void`);
  }
  return out;
}

/** The `own` declaration in `inferredVerdict`, and the function, or nulls. */
function ownOf(t) {
  const sf = sfOf(t, STATE);
  const verdict = functionNamed(sf, 'inferredVerdict');
  const decls = verdict === null ? [] : findAll(verdict, (n) => ts.isVariableDeclaration(n) && n.name.getText() === 'own');
  return { sf, verdict, decls };
}

/** Every name a file binds: its imports, declarations, parameters and destructured names. */
function declaredIn(sf) {
  const names = new Set();
  const bind = (name) => {
    if (name === undefined) return;
    if (ts.isIdentifier(name)) names.add(name.text);
    else if (ts.isObjectBindingPattern(name) || ts.isArrayBindingPattern(name)) {
      for (const el of name.elements) if (!ts.isOmittedExpression(el)) bind(el.name);
    }
  };
  for (const n of findAll(sf, () => true)) {
    if (ts.isVariableDeclaration(n) || ts.isParameter(n) || ts.isBindingElement(n)) bind(n.name);
    else if (
      ts.isFunctionDeclaration(n) ||
      ts.isFunctionExpression(n) ||
      ts.isClassDeclaration(n) ||
      ts.isInterfaceDeclaration(n) ||
      ts.isTypeAliasDeclaration(n) ||
      ts.isEnumDeclaration(n) ||
      ts.isTypeParameterDeclaration(n) ||
      ts.isImportSpecifier(n) ||
      ts.isImportClause(n) ||
      ts.isNamespaceImport(n)
    ) {
      bind(n.name);
    }
  }
  return names;
}

/** Whether a node sits in a type, where nothing is ever read at run time. */
function inType(node) {
  for (let p = node.parent; p !== undefined; p = p.parent) if (ts.isTypeNode(p)) return true;
  return false;
}

/**
 * The globals a file names: every identifier read as a VALUE that the file
 * neither declares nor imports (a member after a dot, a key, a label and
 * anything in a type are names, not reads).
 */
function globalsOf(sf) {
  const declared = declaredIn(sf);
  const out = new Set();
  for (const id of findAll(sf, ts.isIdentifier)) {
    const p = id.parent;
    if (declared.has(id.text)) continue;
    if (ts.isPropertyAccessExpression(p) && p.name === id) continue;
    if ((ts.isPropertyAssignment(p) || ts.isPropertySignature(p) || ts.isPropertyDeclaration(p) || ts.isMethodDeclaration(p) || ts.isEnumMember(p) || ts.isNamedTupleMember(p)) && p.name === id) continue;
    if (ts.isLabeledStatement(p) || ts.isBreakOrContinueStatement(p)) continue;
    if (inType(id)) continue;
    out.add(id.text);
  }
  return out;
}

/** O3. No clock. */
function clockFindings(t) {
  const out = [];
  const sf = sfOf(t, OWN);
  for (const id of findAll(sf, ts.isIdentifier)) {
    if (CLOCK.includes(id.text) || /_MS$/.test(id.text)) out.push(`${OWN} names ${id.text}; the record and the rule read no time`);
  }
  // The fix round: an ALLOWLIST of the globals it computes with, so a clock
  // read through a name nobody listed (process.uptime(), globalThis, Intl,
  // Temporal, Atomics) reads red by name.
  for (const name of globalsOf(sf)) {
    if (!OWN_GLOBALS.has(name)) out.push(`${OWN} reads the global ${name}; it reads only ${[...OWN_GLOBALS].join(', ')}, and no clock, timer or process by any name`);
  }
  const fn = functionNamed(sf, 'dialogIsHisWords');
  const params = fn?.parameters.map((p) => p.name.getText()) ?? [];
  if (fn === null || params.length !== 2) out.push(`dialogIsHisWords takes (${params.join(', ')}); exactly the screen and the record`);
  const { decls } = ownOf(t);
  const init = decls[0]?.initializer;
  if (decls.length !== 1 || init === undefined) return [...out, `inferredVerdict declares own ${String(decls.length)} time(s); once`];
  const allowed = new Set(['numbered', 'shaped', 'st', 'state', 'screen', 'dialogIsHisWords', 'ownWords']);
  const ids = findAll(init, ts.isIdentifier).map((n) => n.text);
  const extra = [...new Set(ids.filter((x) => !allowed.has(x)))];
  if (extra.length > 0) out.push(`the own line names ${extra.join(', ')}; it names the numbered verdict, the shapes, the state, the screen and the record and nothing else (no clock)`);
  const literals = findAll(init, (n) => ts.isStringLiteral(n) || ts.isNumericLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)).map((n) => n.getText());
  if (literals.some((l) => l !== "'needs_input'")) out.push(`the own line holds ${literals.join(', ')}; its one literal is 'needs_input'`);
  const text = flat(init.getText());
  for (const need of ['numbered', '!shaped', "st.state !== 'needs_input'", 'screen', 'dialogIsHisWords(screen, st.ownWords)']) {
    if (!text.includes(need)) out.push(`the own line does not hold ${need}`);
  }
  // The probe review: the monitor's two writers stamp no time and move nothing
  // else in the session's state. Each is the ONE statement that hands the
  // record to own-words.ts, so a key that stamps a clock, zeroes the dialog
  // count or sets a timer (a hold by his typing, the time rule by another
  // door) has nowhere to go but here, where it reads red.
  const monitor = sfOf(t, MONITOR);
  for (const [method, reader] of [['noteOwnWords', 'noteOwnWordsOn'], ['noteReplayedScreen', 'noteReplayedOn']]) {
    const m = methodNamed(monitor, method);
    const params = m?.parameters.map((p) => p.name.getText()) ?? [];
    const want = params.length === 2 ? `${reader}(this.ensureState(${params[0]}).ownWords, ${params[1]});` : `${reader}(this.ensureState(sessionId).ownWords, …);`;
    const body = m?.body?.statements ?? [];
    if (m === null || params.length !== 2 || body.length !== 1 || flat(body[0].getText()) !== want) {
      out.push(`${MONITOR}'s ${method} is ${JSON.stringify(m === null ? 'absent' : flat(m.body?.getText() ?? '').slice(0, 100))}; it is the one statement \`${want}\`, and stamps no time and moves nothing else`);
    }
  }
  return out;
}

/** O4. Never logged, never leaves main. */
function keptFindings(t) {
  const out = [];
  const own = sfOf(t, OWN);
  for (const c of logCallsIn(own, own)) out.push(`${OWN} names a log call (${flat(c.getText()).slice(0, 50)}); it names none at all`);
  for (const s of own.statements) {
    if (ts.isImportDeclaration(s) && s.moduleSpecifier.getText() !== "'./screen'") out.push(`${OWN} imports ${s.moduleSpecifier.getText()}; it imports ./screen alone`);
    if (ts.isImportEqualsDeclaration(s)) out.push(`${OWN} imports with require`);
  }
  if (callsNamed(own, 'require').length > 0 || findAll(own, (n) => ts.isCallExpression(n) && n.expression.kind === ts.SyntaxKind.ImportKeyword).length > 0) {
    out.push(`${OWN} loads a module at run time`);
  }
  // The record's paths: no log call there names his bytes.
  const scopes = [];
  const host = sfOf(t, HOST);
  const on = findAll(host, (n) => ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && n.expression.expression.getText() === 'ipcMain' && n.arguments[0]?.getText() === 'inputChannel')[0];
  const listener = findAll(host, (n) => ts.isVariableDeclaration(n) && n.name.getText() === on?.arguments[1]?.getText())[0]?.initializer;
  if (listener !== undefined) scopes.push([HOST, host, listener, 'the term:input listener']);
  const core = sfOf(t, CORE);
  const arrow = coreOnInput(t);
  if (arrow !== null) scopes.push([CORE, core, arrow, "core.ts's onInput arrow"]);
  const s2 = callsNamed(core, 'noteReplayedScreen')[0];
  let holder = s2;
  while (holder !== undefined && !ts.isMethodDeclaration(holder) && !ts.isFunctionDeclaration(holder)) holder = holder.parent;
  if (holder !== undefined) scopes.push([CORE, core, holder, 'the core method holding the restore\'s note']);
  const monitor = sfOf(t, MONITOR);
  for (const m of ['noteOwnWords', 'noteReplayedScreen']) {
    const node = methodNamed(monitor, m);
    if (node !== null) scopes.push([MONITOR, monitor, node, `monitor.ts's ${m}`]);
  }
  const caps = sfOf(t, CAPS);
  for (const verb of ['createScreenKeys', 'createScreenPaste']) {
    const prop = verbWriter(t, verb);
    if (prop !== null) scopes.push([CAPS, caps, prop, `capabilities.ts's ${verb} writer`]);
  }
  const restore = sfOf(t, RESTORE);
  const tail = functionNamed(restore, 'replayTailOf');
  if (tail !== null) scopes.push([RESTORE, restore, tail, "restore.ts's replayTailOf"]);
  for (const [, sf, node, what] of scopes) for (const f of logsNaming(node, sf)) out.push(`a log call in ${what} names his bytes: ${f}`);
  // The probe review: and ANYWHERE in production, no log call names the record
  // or the replayed rows, through any logger, the house's `<domain>Log`
  // bindings included. The scopes above read his bytes under their common names
  // (`data`, `text`, `input`) where those names are his; these two names are
  // his wherever they are.
  for (const [rel, text] of t.files) {
    if (!rel.startsWith('src/') || !/\b(?:ownWords|replayedTail|ownBytesOf|replayTailOf)\b/.test(text)) continue;
    const sf = parse(rel, text);
    for (const f of logsNaming(sf, sf, ['ownWords', 'replayedTail', 'ownBytesOf', 'replayTailOf'])) out.push(`a log call in ${rel} names his record: ${f}`);
  }
  // The probe review: the two other makers of a copy of his words, the
  // phone's keys spelled as bytes (`ownBytesOf`) and the replayed screen's rows
  // (`replayTailOf`), are exported for their tests alone and called in
  // production only by their own module, so no second copy of his words is
  // made anywhere else.
  for (const [name, home] of [['ownBytesOf', KEYS], ['replayTailOf', RESTORE]]) {
    for (const [rel, text] of t.files) {
      if (rel === home || !rel.startsWith('src/') || !text.includes(name)) continue;
      const calls = callsNamed(parse(rel, text), name);
      if (calls.length > 0) out.push(`${rel} calls ${name}( (${flat(calls[0].getText()).slice(0, 60)}); a copy of his words is made only in ${home}`);
    }
  }
  // Never leaves main.
  const pattern = new RegExp(`\\b(?:${RECORD_NAMES.join('|')})\\b`);
  for (const [rel, text] of t.files) {
    if (!NEVER_DIRS.some((d) => rel.startsWith(`${d}/`)) || !pattern.test(text)) continue;
    const sf = parse(rel, text);
    const named = findAll(sf, (n) => (ts.isIdentifier(n) || ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) && RECORD_NAMES.includes(n.text));
    if (named.length > 0) out.push(`${rel} names ${[...new Set(named.map((n) => n.text))].join(', ')}: his words never leave main's activity domain`);
  }
  return out;
}

/** O5. The record forgets. */
function forgetFindings(t) {
  const out = [];
  const own = sfOf(t, OWN);
  const caps = [];
  for (const [rel, text] of t.files) {
    if (!rel.startsWith('src/') || !text.includes('OWN_WORDS_MAX')) continue;
    for (const d of findAll(parse(rel, text), (n) => ts.isVariableDeclaration(n) && n.name.getText() === 'OWN_WORDS_MAX')) caps.push([rel, d]);
  }
  if (caps.length !== 1 || caps[0][0] !== OWN || flat(caps[0][1].initializer?.getText() ?? '') !== '16_384') {
    out.push(`OWN_WORDS_MAX is declared ${String(caps.length)} time(s) (${caps.map(([rel, d]) => `${rel}: ${flat(d.getText())}`).join('; ') || 'nowhere'}); once, in ${OWN}, as 16_384`);
  }
  const reader = functionNamed(own, 'noteOwnWordsOn');
  if (reader === null) return [...out, `${OWN} declares no noteOwnWordsOn`];
  const clears = (name) =>
    findAll(reader, (n) => ts.isIfStatement(n) && flat(n.expression.getText()) === `cp === ${name}` && callsNamed(n.thenStatement, 'clear').length > 0).filter((n) => {
      // On the path outside a paste: not inside a branch taken only while a paste is open.
      for (let p = n.parent; p !== undefined && p !== reader; p = p.parent) {
        if (ts.isIfStatement(p) && /inPaste/.test(p.expression.getText()) && !/!\s*words\.inPaste/.test(p.expression.getText())) return false;
      }
      return true;
    });
  if (clears('CR').length !== 1) out.push('the reader has no `if (cp === CR)` branch, outside a paste, that clears the record: his sent words would stay his');
  if (clears('ETX').length !== 1) out.push('the reader has no `if (cp === ETX)` branch, outside a paste, that clears the record: Ctrl-C would not forget');
  // The fix round: Ctrl-U empties at least the line in every line editor, so a
  // line he erased with it is never kept as his.
  if (clears('NAK').length !== 1) out.push('the reader has no `if (cp === NAK)` branch, outside a paste, that clears the record: a line erased with Ctrl-U would stay his and could hold a real question');
  const clear = functionNamed(own, 'clear');
  const lines = clear === null ? [] : findAll(clear, (n) => ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.EqualsToken && flat(n.left.getText()) === 'words.lines');
  if (lines.length !== 1 || flat(lines[0].right.getText()) !== '[[]]') out.push('clear() does not set the record\'s lines to one empty line');
  // The cap is asked: `full` compares the size with it, and a character or a
  // line break that would pass it clears the record first.
  const full = functionNamed(own, 'full');
  const compares = full === null ? [] : findAll(full, (n) => ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.GreaterThanToken && flat(n.right.getText()) === 'OWN_WORDS_MAX');
  if (compares.length !== 1) out.push('full() does not compare the record\'s size with OWN_WORDS_MAX: the cap is never asked');
  for (const name of ['insert', 'breakLine']) {
    const fn = functionNamed(own, name);
    const asks = fn === null ? [] : findAll(fn, (n) => ts.isIfStatement(n) && callsNamed(n.expression, 'full').length === 1 && callsNamed(n.thenStatement, 'clear').length === 1);
    if (asks.length !== 1) out.push(`${name}() does not clear the record when one more character would pass the cap`);
  }
  // A field of SessionState, made in freshState.
  const state = sfOf(t, STATE);
  const iface = findAll(state, (n) => ts.isInterfaceDeclaration(n) && n.name.text === 'SessionState')[0];
  const member = iface?.members.find((m) => m.name?.getText() === 'ownWords');
  if (member === undefined || flat(member.type?.getText() ?? '') !== 'OwnWords') out.push('SessionState has no `ownWords: OwnWords`');
  const fresh = functionNamed(state, 'freshState');
  const made = fresh === null ? [] : findAll(fresh, (n) => ts.isPropertyAssignment(n) && n.name.getText() === 'ownWords' && flat(n.initializer.getText()) === 'freshOwnWords()');
  if (made.length !== 1) out.push('freshState does not make the record (`ownWords: freshOwnWords()`)');
  // The probe review: the record is NAMED nowhere but where it is declared,
  // made, read and written, being the SessionState member, freshState, the own
  // line and the monitor's two writers. A clear on a clock (his words amber
  // again once it fires), a copy into a field that rides the wire (the
  // session's question) and a second reader beside the rule each need its
  // name somewhere else, and read red there.
  const ownInit = ownOf(t).decls[0]?.initializer;
  const monitorSf = sfOf(t, MONITOR);
  const writers = ['noteOwnWords', 'noteReplayedScreen'].map((m) => methodNamed(monitorSf, m)).filter((m) => m !== null);
  for (const [rel, text] of t.files) {
    if (!rel.startsWith('src/') || !text.includes('ownWords')) continue;
    const sf = parse(rel, text);
    const named = findAll(sf, (n) => (ts.isIdentifier(n) || ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) && n.text === 'ownWords');
    for (const n of named) {
      const allowed =
        (rel === STATE && ((member !== undefined && within(n, member)) || (made.length === 1 && within(n, made[0])) || (ownInit !== undefined && within(n, ownInit)))) ||
        (rel === MONITOR && writers.some((w) => within(n, w)));
      if (!allowed) {
        out.push(`${rel} names the record (${JSON.stringify(flat(n.parent.getText()).slice(0, 70))}) outside the SessionState member, freshState, the own line and the monitor's two writers: a clear on a clock, a copy or a second reader of his words`);
      }
    }
  }
  // No module-level holder.
  for (const rel of [OWN, MONITOR]) {
    const sf = sfOf(t, rel);
    for (const s of sf.statements) {
      if (!ts.isVariableStatement(s)) continue;
      const isLet = (s.declarationList.flags & (ts.NodeFlags.Let | ts.NodeFlags.Const)) === 0 || (s.declarationList.flags & ts.NodeFlags.Let) !== 0;
      const textS = s.getText();
      const holds = /\bOwnWords\b|\bownWords\b/.test(textS);
      const container = /\bnew\s+(?:Map|Set|WeakMap)\b/.test(textS);
      if (rel === OWN && (isLet || container)) out.push(`${OWN} keeps module-level state (${flat(textS).slice(0, 50)}); the record lives in the session's state alone`);
      else if (rel === MONITOR && holds && (isLet || container)) out.push(`${MONITOR} keeps a record at module level (${flat(textS).slice(0, 50)})`);
    }
  }
  out.push(...moduleStateFindings(sfOf(t, OWN), t));
  return out;
}

/**
 * HIS RULED ROUND (the reverify's count window): no state at module level in
 * own-words.ts by any other spelling. A `const` holding an object let a window
 * by COUNT, with no clock and no global, pass every clause: `const READS = { n:
 * 0 }` bumped by the rule, so his words were his for three numbered reads, or
 * any dialog was held for three. So an object or array literal evaluated at
 * module level is refused whatever binds it, and so is a call, a `new` or a
 * tagged template run when the module loads (an IIFE can keep a counter in a
 * closure with neither), and any write to a member of a name declared at
 * module level (a const, a function, a class, an import): an assignment, `++`
 * or `--`, `delete`, a mutating method, or `Object.assign` and its kin.
 *
 * THE RULED ROUND'S PROBE REVIEW (docs/method/HOW-WE-BUILT-THIS.md rule 9):
 * the same window by count, spelled eight more ways, passed every clause, each
 * planted over a copy of the tree and read by this gate: a `var` declared in a
 * block at module level (hoisted to the module's scope, so `plantedReads += 1`
 * writes no member), a property kept on an allowlisted global (`Math.n`,
 * `Object.assign(Number, …)`, which O3 lets the module name), a class's static
 * counter written through `this`, a member written through a local that names a
 * module-level function, a regex with the `g` or `y` flag whose `lastIndex`
 * `.test` or `.exec` advances, and a module-level function's binding
 * reassigned. So the writes are now asked of every root that outlives a call:
 * a name declared at module level, a global, `this` in a static member, and a
 * local that names any of these (to a fixpoint); a bare name declared at module
 * level, or a global, is never reassigned; no `var` sits outside a function;
 * and a module-level or imported regex with the `g` flag is used only as the
 * first argument of `replace`, `replaceAll` or `split`, which reset its
 * `lastIndex`, and one with `y` not at all. What a syntax rule cannot follow
 * (state reached through `.call`, `.apply` or `Reflect` on a computed
 * receiver, an alias built by a call) is the behaviour tests', which read a
 * window by count red (the reverify's plants: 26 and 18 rows).
 */
const MUTATORS = new Set(['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse', 'fill', 'copyWithin', 'set', 'add', 'delete', 'clear', 'compile']);
const OBJECT_WRITERS = new Set(['assign', 'defineProperty', 'defineProperties', 'setPrototypeOf', 'set', 'deleteProperty']);
function moduleStateFindings(sf, t) {
  const out = [];
  const names = new Set();
  const bind = (name) => {
    if (ts.isIdentifier(name)) names.add(name.text);
    else for (const e of name.elements ?? []) if (!ts.isOmittedExpression(e)) bind(e.name);
  };
  for (const s of sf.statements) {
    if (ts.isVariableStatement(s)) for (const d of s.declarationList.declarations) bind(d.name);
    else if ((ts.isFunctionDeclaration(s) || ts.isClassDeclaration(s) || ts.isEnumDeclaration(s)) && s.name !== undefined) names.add(s.name.text);
    else if (ts.isImportDeclaration(s) && s.importClause !== undefined) {
      if (s.importClause.name !== undefined) names.add(s.importClause.name.text);
      const nb = s.importClause.namedBindings;
      if (nb !== undefined && ts.isNamespaceImport(nb)) names.add(nb.name.text);
      else if (nb !== undefined) for (const e of nb.elements) names.add(e.name.text);
    }
  }
  // The probe review: a `var` outside every function is hoisted to the
  // module's scope, so a block, an `if` or a `for` at module level declares
  // module state with it, and a bare write to it touches no member.
  const BLOCK_SCOPED = ts.NodeFlags.BlockScoped ?? (ts.NodeFlags.Let | ts.NodeFlags.Const);
  const scopeOf = (n) => ts.isFunctionLike(n) || (ts.isClassStaticBlockDeclaration !== undefined && ts.isClassStaticBlockDeclaration(n));
  const inAFunction = (n) => {
    for (let p = n.parent; p !== undefined; p = p.parent) if (scopeOf(p)) return true;
    return false;
  };
  for (const list of findAll(sf, ts.isVariableDeclarationList)) {
    if ((list.flags & BLOCK_SCOPED) !== 0 || inAFunction(list)) continue;
    for (const d of list.declarations) bind(d.name);
    // A `var` statement at the top is refused already, with `let`, in forgetFindings.
    if (!(ts.isVariableStatement(list.parent) && list.parent.parent === sf)) {
      out.push(`${OWN} declares a var outside every function (${flat(list.getText()).slice(0, 50)}): it is hoisted to the module's scope, which keeps it between calls, and the record and the rule keep no state of their own`);
    }
  }
  // An object or array literal evaluated once, when the module loads: not inside a function.
  // And a call, a `new` or a tagged template evaluated then, which can hand back
  // state a closure keeps (an IIFE's counter) with no literal and no member written.
  const atLoad = (n, inFunction) => {
    if (!inFunction && (ts.isObjectLiteralExpression(n) || ts.isArrayLiteralExpression(n))) {
      out.push(`${OWN} builds an object or array at module level (${flat(n.getText()).slice(0, 50)}); the record and the rule keep no state of their own`);
      return;
    }
    if (!inFunction && (ts.isCallExpression(n) || ts.isNewExpression(n) || ts.isTaggedTemplateExpression(n))) {
      out.push(`${OWN} runs a call when the module loads (${flat(n.getText()).slice(0, 50)}); what it hands back can keep state the session does not own`);
      return;
    }
    const inside = inFunction || ts.isFunctionLike(n);
    ts.forEachChild(n, (c) => atLoad(c, inside));
  };
  for (const s of sf.statements) atLoad(s, false);
  // A write to a member of anything declared at module level, anywhere in the file.
  const unwrap = (e) =>
    ts.isParenthesizedExpression(e) || ts.isAsExpression(e) || ts.isNonNullExpression(e) || ts.isTypeAssertionExpression(e) || (ts.isSatisfiesExpression !== undefined && ts.isSatisfiesExpression(e))
      ? unwrap(e.expression)
      : e;
  const isMember = (e) => {
    const x = unwrap(e);
    return ts.isPropertyAccessExpression(x) || ts.isElementAccessExpression(x);
  };
  // What a member chain is rooted at: a name (`{ id }`), `this` (`{ self }`), or nothing a write can keep.
  const rootOf = (e) => {
    let x = unwrap(e);
    while (ts.isPropertyAccessExpression(x) || ts.isElementAccessExpression(x)) x = unwrap(x.expression);
    if (ts.isIdentifier(x)) return { id: x };
    if (x.kind === ts.SyntaxKind.ThisKeyword) return { self: x };
    return null;
  };
  // The probe review: which declaration a name reads. A parameter or a
  // declaration of an enclosing function (its nested functions' own left out)
  // is the call's own; else a name declared at module level; else a global.
  const bindsName = (name, text) => (ts.isIdentifier(name) ? name.text === text : (name.elements ?? []).some((e) => !ts.isOmittedExpression(e) && bindsName(e.name, text)));
  const bindingIn = (fn, text) => {
    for (const p of fn.parameters ?? []) if (bindsName(p.name, text)) return p;
    let found = null;
    const visit = (n) => {
      if (found !== null) return;
      if ((ts.isFunctionDeclaration(n) || ts.isClassDeclaration(n)) && n.name?.text === text) {
        found = n;
        return;
      }
      if (scopeOf(n) || ts.isClassLike(n)) return;
      if ((ts.isVariableDeclaration(n) || ts.isBindingElement(n)) && bindsName(n.name, text)) {
        found = n;
        return;
      }
      ts.forEachChild(n, visit);
    };
    if (fn.body !== undefined) visit(fn.body);
    return found;
  };
  const resolve = (id) => {
    for (let p = id.parent; p !== undefined; p = p.parent) {
      if (!scopeOf(p)) continue;
      const b = bindingIn(p, id.text);
      if (b !== null) return { kind: 'local', decl: b };
    }
    return { kind: names.has(id.text) ? 'module' : 'global' };
  };
  // `this` a class keeps: in a static member or a static block (or at module level).
  const staticThis = (node) => {
    for (let p = node.parent; p !== undefined; p = p.parent) {
      if (ts.isArrowFunction(p)) continue;
      if (ts.isClassStaticBlockDeclaration !== undefined && ts.isClassStaticBlockDeclaration(p)) return true;
      if ((ts.isMethodDeclaration(p) || ts.isPropertyDeclaration(p) || ts.isGetAccessorDeclaration(p) || ts.isSetAccessorDeclaration(p)) && (ts.getCombinedModifierFlags(p) & ts.ModifierFlags.Static) !== 0) return true;
      if (ts.isFunctionLike(p) || ts.isClassLike(p)) return false;
    }
    return true;
  };
  const aliases = new Set();
  // What a root keeps between calls (`module`, `global`, `this`, `alias`), or
  // null when it is the call's own.
  const stateOf = (r) => {
    if (r === null) return null;
    if (r.self !== undefined) return staticThis(r.self) ? { kind: 'this', said: '`this` in a static member of a class' } : null;
    const at = resolve(r.id);
    if (at.kind === 'local') return aliases.has(at.decl) ? { kind: 'alias', said: `${r.id.text}, a local that names state the module keeps` } : null;
    if (at.kind === 'module') return { kind: 'module', said: `a name declared at module level, ${r.id.text}` };
    return { kind: 'global', said: `the global ${r.id.text}` };
  };
  // A local that names a root kept between calls is that root, to a fixpoint.
  const locals = findAll(sf, (n) => ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer !== undefined && inAFunction(n));
  for (let grew = true; grew; ) {
    grew = false;
    for (const d of locals) {
      if (aliases.has(d) || stateOf(rootOf(d.initializer)) === null) continue;
      aliases.add(d);
      grew = true;
    }
  }
  const member = (kept) => (kept === null ? null : { ...kept, member: true });
  const stateMember = (e) => (isMember(e) ? member(stateOf(rootOf(e))) : null);
  // A bare name reassigned: one declared at module level (a function's or a var's binding), or a global.
  const stateBare = (e) => {
    const x = unwrap(e);
    if (!ts.isIdentifier(x)) return null;
    const kept = stateOf({ id: x });
    return kept === null || kept.kind === 'alias' ? null : { ...kept, member: false };
  };
  const ASSIGN = new Set([
    ts.SyntaxKind.EqualsToken, ts.SyntaxKind.PlusEqualsToken, ts.SyntaxKind.MinusEqualsToken, ts.SyntaxKind.AsteriskEqualsToken,
    ts.SyntaxKind.AsteriskAsteriskEqualsToken, ts.SyntaxKind.SlashEqualsToken, ts.SyntaxKind.PercentEqualsToken,
    ts.SyntaxKind.LessThanLessThanEqualsToken, ts.SyntaxKind.GreaterThanGreaterThanEqualsToken, ts.SyntaxKind.GreaterThanGreaterThanGreaterThanEqualsToken,
    ts.SyntaxKind.AmpersandEqualsToken, ts.SyntaxKind.BarEqualsToken, ts.SyntaxKind.CaretEqualsToken,
    ts.SyntaxKind.BarBarEqualsToken, ts.SyntaxKind.AmpersandAmpersandEqualsToken, ts.SyntaxKind.QuestionQuestionEqualsToken
  ]);
  const writeOf = (n) => {
    if (ts.isBinaryExpression(n) && ASSIGN.has(n.operatorToken.kind)) return stateMember(n.left) ?? stateBare(n.left);
    if ((ts.isPrefixUnaryExpression(n) || ts.isPostfixUnaryExpression(n)) && (n.operator === ts.SyntaxKind.PlusPlusToken || n.operator === ts.SyntaxKind.MinusMinusToken)) return stateMember(n.operand) ?? stateBare(n.operand);
    if (ts.isDeleteExpression(n)) return stateMember(n.expression);
    if (ts.isCallExpression(n)) {
      const callee = unwrap(n.expression);
      if (!ts.isPropertyAccessExpression(callee)) return null;
      if (MUTATORS.has(callee.name.text)) {
        const kept = member(stateOf(rootOf(callee.expression)));
        if (kept !== null) return kept;
      }
      const holder = unwrap(callee.expression);
      if (ts.isIdentifier(holder) && (holder.text === 'Object' || holder.text === 'Reflect') && OBJECT_WRITERS.has(callee.name.text)) {
        const first = n.arguments[0];
        return first === undefined ? null : member(stateOf(rootOf(first)));
      }
    }
    return null;
  };
  for (const n of findAll(sf, () => true)) {
    const kept = writeOf(n);
    if (kept === null) continue;
    const text = flat(n.getText()).slice(0, 60);
    out.push(
      kept.member && kept.kind === 'module'
        ? `${OWN} writes to a member of a name declared at module level (${text}); that name becomes state the session does not own`
        : kept.member
          ? `${OWN} writes to a member of ${kept.said} (${text}); it outlives the call, so it is state the session does not own`
          : `${OWN} reassigns ${kept.said} (${text}); its binding outlives the call, so it is state the session does not own`
    );
  }
  // The probe review: a regex's `lastIndex` is state. One with the sticky flag
  // is read and written by every use; one with the global flag by `test` and
  // `exec`, while `replace`, `replaceAll` and `split` leave it as they found
  // it. Module-level literals, and the screen's own, read where it declares
  // them.
  const flagsOf = (lit) => lit.text.slice(lit.text.lastIndexOf('/') + 1);
  const regexes = new Map();
  for (const s of sf.statements) {
    if (!ts.isVariableStatement(s)) continue;
    for (const d of s.declarationList.declarations) {
      const init = d.initializer === undefined ? undefined : unwrap(d.initializer);
      if (ts.isIdentifier(d.name) && init !== undefined && ts.isRegularExpressionLiteral(init)) regexes.set(d.name.text, flagsOf(init));
    }
  }
  const screen = t === undefined ? null : sfOf(t, SCREEN);
  for (const s of sf.statements) {
    const nb = ts.isImportDeclaration(s) ? s.importClause?.namedBindings : undefined;
    if (screen === null || nb === undefined || !ts.isNamedImports(nb) || s.moduleSpecifier.getText() !== "'./screen'") continue;
    for (const e of nb.elements) {
      const exported = (e.propertyName ?? e.name).text;
      const d = findAll(screen, (n) => ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === exported && n.parent?.parent?.parent === screen)[0];
      const init = d?.initializer === undefined ? undefined : unwrap(d.initializer);
      if (init !== undefined && ts.isRegularExpressionLiteral(init)) regexes.set(e.name.text, flagsOf(init));
    }
  }
  for (const [name, flags] of regexes) {
    const sticky = flags.includes('y');
    if (!sticky && !flags.includes('g')) continue;
    for (const id of findAll(sf, (n) => ts.isIdentifier(n) && n.text === name)) {
      const p = id.parent;
      if (ts.isImportSpecifier(p) || (ts.isVariableDeclaration(p) && p.name === id) || (ts.isPropertyAccessExpression(p) && p.name === id) || inType(id)) continue;
      if (resolve(id).kind === 'local') continue;
      const callee = ts.isCallExpression(p) ? unwrap(p.expression) : null;
      const resets = !sticky && callee !== null && p.arguments[0] === id && ts.isPropertyAccessExpression(callee) && ['replace', 'replaceAll', 'split'].includes(callee.name.text);
      if (!resets) {
        out.push(
          sticky
            ? `${OWN} uses ${name}, a regular expression with the sticky y flag (${flat(p.getText()).slice(0, 50)}): every use reads and writes its lastIndex, state the module keeps between calls`
            : `${OWN} uses ${name}, a regular expression with the global g flag, other than as the first argument of replace, replaceAll or split (${flat(p.getText()).slice(0, 50)}): test and exec advance its lastIndex, state the module keeps between calls`
        );
      }
    }
  }
  return out;
}

/** O6. Whole lines only. */
function wholeLineFindings(t) {
  const out = [];
  const own = sfOf(t, OWN);
  for (const c of findAll(own, (n) => ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression))) {
    const m = c.expression.name.text;
    if (['includes', 'indexOf', 'lastIndexOf', 'search', 'match', 'matchAll', 'endsWith'].includes(m)) out.push(`${OWN} calls ${m}( (${flat(c.getText()).slice(0, 50)}): a line of his is never found inside a row, nor a row inside it`);
  }
  const tile = functionNamed(own, 'tileFrom');
  if (tile === null) return [...out, `${OWN} declares no tileFrom`];
  const starts = findAll(tile, (n) => ts.isCallExpression(n) && calleeName(n) === 'startsWith' && ts.isPropertyAccessExpression(n.expression) && n.expression.expression.getText() === 'line');
  // The probe review: the comparison is pinned by its text, so a row compared
  // by a piece of itself (`rest.slice(0, 1)`) cannot pass as a whole row.
  if (starts.length !== 1 || flat(starts[0].getText()) !== 'line.startsWith(rest, pos)') out.push('tileFrom does not compare by line.startsWith(rest, pos) once');
  const ends = findAll(tile, (n) => ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken && flat(n.right.getText()) === 'line.length');
  if (ends.length !== 1) out.push('tileFrom does not end a tile at a position equal to the line\'s length');
  if (callsNamed(tile, 'tileFrom').length !== 1) out.push('tileFrom does not continue the line onto the next row (one call of itself)');
  const mark = functionNamed(own, 'markMaxOf');
  const used = mark === null ? [] : findAll(mark, ts.isIdentifier).map((n) => n.text);
  const regexName = used.find((name) => {
    const d = findAll(own, (n) => ts.isVariableDeclaration(n) && n.name.getText() === name && n.initializer !== undefined && ts.isRegularExpressionLiteral(n.initializer))[0];
    const src = d?.initializer.getText() ?? '';
    return src.includes('\\p{L}') && src.includes('\\p{N}') && /\/[a-z]*u[a-z]*$/.test(src);
  });
  if (regexName === undefined) out.push('the mark test (markMaxOf) does not read a /[\\p{L}\\p{N}]/u test: a mark could hold a letter or a digit');
  return out;
}

/** O7. Beside the verdict. */
function besideFindings(t) {
  const out = [];
  const { verdict, decls } = ownOf(t);
  if (verdict === null || verdict.body === undefined) return [`${STATE} declares no inferredVerdict`];
  const body = verdict.body.statements;
  const dialogAt = body.findIndex((s) => flat(s.getText()) === 'const dialog = numbered || shaped;');
  if (dialogAt < 0) out.push('`const dialog = numbered || shaped;` is not in inferredVerdict byte for byte');
  if (decls.length !== 1) return [...out, `own is declared ${String(decls.length)} times in inferredVerdict; once`];
  const ownStmt = body.findIndex((s) => s === decls[0].parent?.parent);
  if (ownStmt < 0 || ownStmt !== dialogAt + 1) out.push('own is not the statement right after the dialog line');
  const uses = findAll(verdict, (n) => ts.isIdentifier(n) && n.text === 'own' && n !== decls[0].name);
  const arms = findAll(verdict, (n) => ts.isIfStatement(n) && flat(n.expression.getText()) === 'dialog && !own');
  if (uses.length !== 1 || arms.length !== 1 || !within(uses[0], arms[0].expression)) {
    out.push(`own is read ${String(uses.length)} time(s); once, by the dialog arm \`if (dialog && !own)\`, so it can only withhold a count`);
  }
  const own = sfOf(t, OWN);
  if (callsNamed(own, 'detectDialogRows').length !== 1) out.push(`${OWN} calls detectDialogRows ${String(callsNamed(own, 'detectDialogRows').length)} times; once, the one spelling of the predicate`);
  for (const name of ['detectDialog', 'detectShapes']) if (callsNamed(own, name).length > 0) out.push(`${OWN} calls ${name}; never (conformance:choices clause 3 allows one production caller of detectDialog)`);
  // The fix round: the rows the verdict reads as a question's, asked once, by
  // the rule alone, so the window and the classes stay the verdict's own.
  const evidence = [];
  for (const [rel, text] of t.files) {
    if (!rel.startsWith('src/') || !text.includes('dialogEvidenceRows')) continue;
    for (const c of callsNamed(parse(rel, text), 'dialogEvidenceRows')) evidence.push(rel);
  }
  if (evidence.length !== 1 || evidence[0] !== OWN) out.push(`dialogEvidenceRows( is called from ${evidence.join(', ') || 'nowhere'}; once, by ${OWN}'s rule`);
  const fn = functionNamed(own, 'dialogIsHisWords');
  if (fn !== null) {
    const params = fn.parameters.map((p) => p.name.getText());
    const root = (e) => {
      let x = e;
      while (ts.isPropertyAccessExpression(x) || ts.isElementAccessExpression(x) || ts.isNonNullExpression(x) || ts.isParenthesizedExpression(x)) x = x.expression;
      return ts.isIdentifier(x) ? x.text : '';
    };
    const assignOps = [ts.SyntaxKind.EqualsToken, ts.SyntaxKind.PlusEqualsToken, ts.SyntaxKind.MinusEqualsToken, ts.SyntaxKind.QuestionQuestionEqualsToken, ts.SyntaxKind.BarBarEqualsToken, ts.SyntaxKind.AmpersandAmpersandEqualsToken];
    for (const n of findAll(fn, (x) => ts.isBinaryExpression(x) && assignOps.includes(x.operatorToken.kind))) {
      if (params.includes(root(n.left))) out.push(`dialogIsHisWords writes through its parameter (${flat(n.getText()).slice(0, 50)})`);
    }
    for (const n of findAll(fn, (x) => ts.isPrefixUnaryExpression(x) || ts.isPostfixUnaryExpression(x))) {
      if ([ts.SyntaxKind.PlusPlusToken, ts.SyntaxKind.MinusMinusToken].includes(n.operator) && params.includes(root(n.operand))) out.push(`dialogIsHisWords writes through its parameter (${flat(n.getText())})`);
    }
    for (const c of findAll(fn, (x) => ts.isCallExpression(x) && ts.isPropertyAccessExpression(x.expression))) {
      if (['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse', 'fill', 'copyWithin', 'set', 'delete', 'clear'].includes(c.expression.name.text) && params.includes(root(c.expression.expression))) {
        out.push(`dialogIsHisWords changes its parameter (${flat(c.getText()).slice(0, 50)})`);
      }
    }
  }
  return out;
}

/** O8. The replay's rows. */
function replayFindings(t) {
  const out = [];
  const literal = (rel, name) => {
    const d = findAll(sfOf(t, rel), (n) => ts.isVariableDeclaration(n) && n.name.getText() === name);
    return d.length === 1 && d[0].initializer !== undefined && ts.isNumericLiteral(d[0].initializer) ? Number(d[0].initializer.text) : null;
  };
  const tail = literal(RESTORE, 'REPLAY_TAIL_ROWS');
  const rows = literal(SCREEN, 'DIALOG_ROWS');
  if (tail === null || rows === null || tail !== rows) out.push(`${RESTORE}'s REPLAY_TAIL_ROWS is ${String(tail)} and ${SCREEN}'s DIALOG_ROWS ${String(rows)}; one literal, declared once each, the same value`);
  const sf = sfOf(t, RESTORE);
  const fn = functionNamed(sf, 'restoreSessionInTmux');
  if (fn === null) return [...out, `${RESTORE} declares no restoreSessionInTmux`];
  const replay = findAll(fn, (n) => ts.isAwaitExpression(n) && ts.isCallExpression(n.expression) && calleeName(n.expression) === 'typeIntoPane' && n.expression.arguments.some((a) => ts.isCallExpression(a) && calleeName(a) === 'buildSnapshotReplayCommand'))[0];
  let stmt = replay;
  while (stmt !== undefined && stmt.parent !== undefined && !ts.isBlock(stmt.parent)) stmt = stmt.parent;
  const block = stmt?.parent;
  const after = stmt === undefined || block === undefined ? -1 : block.statements.indexOf(stmt);
  if (replay === undefined || block === undefined || after < 0) return [...out, 'the replay\'s `await typeIntoPane(…, buildSnapshotReplayCommand(…), …)` is not a statement of a block'];
  const writes = findAll(fn, (n) => ts.isBinaryExpression(n) && ts.isIdentifier(n.left) && n.left.text === 'replayedTail' && n.operatorToken.kind >= ts.SyntaxKind.FirstAssignment && n.operatorToken.kind <= ts.SyntaxKind.LastAssignment);
  if (writes.length === 0) out.push('replayedTail is never set after the replay');
  for (const w of writes) {
    const stmt = statementIn(w, block);
    if (stmt === null || block.statements.indexOf(stmt) <= after) out.push(`replayedTail is set (${flat(w.getText()).slice(0, 50)}) somewhere other than after the replay's typeIntoPane resolved, in its block`);
  }
  const decl = findAll(fn, (n) => ts.isVariableDeclaration(n) && n.name.getText() === 'replayedTail');
  if (decl.length !== 1 || (decl[0].initializer !== undefined && decl[0].initializer.getText() !== 'undefined')) out.push('replayedTail is declared with a value before the replay');
  return out;
}

/** The contract's key names, read from its array literal. */
function contractKeyNames(t) {
  const d = findAll(sfOf(t, CONTRACT), (n) => ts.isVariableDeclaration(n) && n.name.getText() === 'POCKET_SCREEN_KEY_NAMES')[0];
  let init = d?.initializer;
  while (init !== undefined && (ts.isAsExpression(init) || ts.isSatisfiesExpression?.(init))) init = init.expression;
  return init !== undefined && ts.isArrayLiteralExpression(init) ? init.elements.filter(ts.isStringLiteral).map((e) => e.text) : [];
}

/** O9. The phone's bytes. */
function phoneFindings(t) {
  const out = [];
  const keys = sfOf(t, KEYS);
  const names = contractKeyNames(t);
  if (names.length === 0) out.push(`${CONTRACT}'s POCKET_SCREEN_KEY_NAMES cannot be read`);
  const imported = keys.statements.some(
    (s) =>
      ts.isImportDeclaration(s) &&
      s.moduleSpecifier.getText() === "'@shared/ipc/pocket'" &&
      /\b(?:PocketScreenKeyName|POCKET_SCREEN_KEY_NAMES)\b/.test(s.importClause?.getText() ?? '')
  );
  const spell = functionNamed(keys, 'ownBytesOf');
  const tableName = spell === null ? undefined : findAll(spell, ts.isElementAccessExpression).map((e) => e.expression.getText())[0];
  const table = findAll(keys, (n) => ts.isVariableDeclaration(n) && n.name.getText() === tableName)[0];
  const init = table?.initializer;
  const lit = init !== undefined && ts.isCallExpression(init) && flat(init.expression.getText()) === 'Object.freeze' ? init.arguments[0] : undefined;
  if (spell === null || lit === undefined || !ts.isObjectLiteralExpression(lit)) {
    out.push(`${KEYS}'s ownBytesOf does not read a frozen named-key table`);
  } else {
    const have = lit.properties.map((p) => (ts.isPropertyAssignment(p) ? (ts.isStringLiteral(p.name) ? p.name.text : p.name.getText()) : '?'));
    const missing = names.filter((n) => !have.includes(n));
    const extra = have.filter((n) => !names.includes(n));
    if (missing.length > 0 || extra.length > 0 || have.length !== names.length) {
      out.push(`the named-key table ${missing.length > 0 ? `lacks ${missing.join(', ')}` : ''}${extra.length > 0 ? ` names ${extra.join(', ')} the contract does not` : ''}; exactly the contract's ${String(names.length)}`);
    }
    if (!imported) out.push(`${KEYS} does not take the key names from the contract (@shared/ipc/pocket)`);
  }
  for (const [rel, guardWords] of [[KEYS, ['result.any', 'machine === null']], [PASTE, ['pasted']]]) {
    const sf = sfOf(t, rel);
    const calls = findAll(sf, (n) => ts.isCallExpression(n) && calleeName(n) === 'noteOwnWords' && ts.isPropertyAccessExpression(n.expression) && n.expression.expression.getText() === 'deps');
    if (calls.length !== 1) {
      out.push(`${rel} calls deps.noteOwnWords ${String(calls.length)} time(s); once, after its act`);
      continue;
    }
    const call = calls[0];
    const funnels = callsNamed(sf, 'noteUserInput');
    if (funnels.length !== 1 || funnels[0].getStart() > call.getStart()) out.push(`${rel}'s record writer is not after its one noteUserInput(`);
    const guard = enclosingIf(call);
    const cond = flat(guard?.expression.getText() ?? '');
    if (guard === null || guardWords.some((w) => !cond.includes(w))) out.push(`${rel}'s record writer is asked under ${JSON.stringify(cond || 'no condition')}; under the act's success test (${guardWords.join(' && ')})`);
    let tryStmt = call.parent;
    while (tryStmt !== undefined && !ts.isTryStatement(tryStmt) && !ts.isFunctionLike(tryStmt)) tryStmt = tryStmt.parent;
    const own = tryStmt !== undefined && ts.isTryStatement(tryStmt) && tryStmt.tryBlock.statements.length === 1 && within(call, tryStmt.tryBlock) && tryStmt.catchClause !== undefined;
    if (!own) out.push(`${rel}'s record writer is not in a try of its own: a record that throws must leave the act answered as it is`);
  }
  return out;
}

/** O10. The exempt, named. */
function exemptFindings(t) {
  const out = [];
  const callers = new Set();
  for (const [rel, text] of t.files) {
    if (!rel.startsWith('src/') || rel === MONITOR || !text.includes('noteUserInput')) continue;
    const sf = parse(rel, text);
    if (callsNamed(sf, 'noteUserInput').length === 0) continue;
    callers.add(rel);
    if (OWN_EXEMPT[rel] !== undefined) continue;
    if (callsNamed(sf, 'noteOwnWords').length === 0) {
      out.push(`${rel} calls the desk's funnel noteUserInput( and hands the record nothing: what reaches a session there is his, so hand it to noteOwnWords, or name the file in OWN_EXEMPT with its reason`);
    }
  }
  for (const rel of Object.keys(OWN_EXEMPT)) if (!callers.has(rel)) out.push(`OWN_EXEMPT names ${rel}, which calls no noteUserInput( any more, so the exemption excuses nothing`);
  return out;
}

// ---------------------------------------------------------------------------
// The attacks: each clause over copies of the tree with its rule broken
// ---------------------------------------------------------------------------

/** The tree with the statement holding a call removed, or null. */
function dropStatementOf(t, rel, call) {
  if (call === undefined || call === null) return null;
  let stmt = call;
  while (stmt.parent !== undefined && !ts.isBlock(stmt.parent) && !ts.isSourceFile(stmt.parent)) stmt = stmt.parent;
  return replaceNode(t, rel, stmt, '');
}
const coreCall = (t, name) => callsNamed(sfOf(t, CORE), name)[0];

const ATTACKS = {
  O1: [
    ["S1 dropped: the desk's chunk never reaches the record", (t) => dropStatementOf(t, CORE, callsNamed(coreOnInput(t) ?? sfOf(t, CORE), 'noteOwnWords')[0])],
    ['S1 handing a fixed string, not the chunk', (t) => replaceNode(t, CORE, callsNamed(coreOnInput(t) ?? sfOf(t, CORE), 'noteOwnWords')[0]?.arguments[1], "''")],
    ['S2 removed: a replayed question reads as the agent asking', (t) => dropStatementOf(t, CORE, coreCall(t, 'noteReplayedScreen'))],
    ['S2 with an await before the live id', (t) => {
      const info = infoStatement(sfOf(t, CORE));
      const text = textOf(t, CORE);
      return info === null ? null : withFile(t, CORE, `${text.slice(0, info.getEnd())}\n      await Promise.resolve();${text.slice(info.getEnd())}`);
    }],
    ['S2 moved after the live id', (t) => {
      const call = coreCall(t, 'noteReplayedScreen');
      const a = dropStatementOf(t, CORE, call);
      return a === null || call === undefined ? null : edit(a, CORE, 'this.liveIds.set(sessionId, info.sessionId);', `this.liveIds.set(sessionId, info.sessionId);\n      ${flat(call.getText())};`);
    }],
    ["the paste verb's writer unwired in capabilities.ts", (t) => replaceNode(t, CAPS, verbWriter(t, 'createScreenPaste'), "noteRepaint: () => undefined")],
    ['a fifth writer of the record', (t) => withFile(t, 'src/main/sessions/planted.ts', "export function plant(core: { activity: { noteOwnWords(id: string, d: string): void } }): void {\n  core.activity.noteOwnWords('s', 'x');\n}\n")],
    // The fix round: the desk's arrow is exactly the bump and the note, and the
    // message hands its Enter alone, once it landed, in a try of its own.
    ["a third statement in the desk's arrow: his chunk handed on as well", (t) => edit(t, CORE, 'this.activity.noteOwnWords(sessionId, data);', "this.activity.noteOwnWords(sessionId, data);\n        this.broadcast('activity:typed', data);")],
    ["the message's Enter handing his words instead", (t) => edit(t, WRITER, "core.activity.noteOwnWords?.(id, '\\r');", 'core.activity.noteOwnWords?.(id, input.text);')],
    ["the message's Enter handed before the paste landed", (t) => {
      const call = callsNamed(functionNamed(sfOf(t, WRITER), 'say') ?? sfOf(t, WRITER), 'noteOwnWords')[0];
      const a = dropStatementOf(t, WRITER, call);
      return a === null ? null : edit(a, WRITER, '      pasted = true;\n', "      core.activity.noteOwnWords?.(id, '\\r');\n      pasted = true;\n");
    }],
    ['the reader called outside the monitor', (t) => withFile(t, STATE, `${textOf(t, STATE)}\nexport function planted(st: SessionState): void {\n  noteOwnWordsOn(st.ownWords, 'x');\n}\n`)],
    ['a second note of a replay', (t) => withFile(t, CAPS, `${textOf(t, CAPS)}\nexport function planted(c: { activity: { noteReplayedScreen(a: string, b: string): void } }): void {\n  c.activity.noteReplayedScreen('s', 'x');\n}\n`)]
  ],
  O2: [
    ['the tap handed nothing of the chunk', (t) => edit(t, HOST, 'this.opts.onInput?.(req.sessionId, data);', "this.opts.onInput?.(req.sessionId, '');")],
    ['the tap called before the write', (t) => {
      const a = edit(t, HOST, '        client.pty.write(data);\n', '        this.opts.onInput?.(req.sessionId, data);\n        client.pty.write(data);\n');
      return a === null ? null : edit(a, HOST, '          this.opts.onInput?.(req.sessionId, data);\n', '');
    }],
    ['the pane-report filter dropped', (t) => edit(t, HOST, 'if (req.machine === undefined && !isPaneReport(data)) {', 'if (req.machine === undefined) {')],
    ["the tap's type back to one parameter", (t) => edit(t, HOST, 'onInput?: (sessionId: string, data: string) => void;', 'onInput?: (sessionId: string) => void;')],
    ['a second tap call', (t) => edit(t, HOST, '        client.pty.write(data);\n', '        client.pty.write(data);\n        this.opts.onInput?.(req.sessionId, data);\n')]
  ],
  O3: [
    ['a time window put back in the own line', (t) => edit(t, STATE, 'dialogIsHisWords(screen, st.ownWords);', 'dialogIsHisWords(screen, st.ownWords) && ctx.now - pane.activityAt <= QUIET_MS;')],
    ['own-words.ts reading a clock', (t) => withFile(t, OWN, `${textOf(t, OWN)}\nexport const plantedAt = (): number => Date.now();\n`)],
    ['a quiet window in own-words.ts', (t) => withFile(t, OWN, `${textOf(t, OWN)}\nconst QUIET_WINDOW_MS = 2_000;\nvoid QUIET_WINDOW_MS;\n`)],
    ['dialogIsHisWords handed the time too', (t) => edit(t, OWN, 'export function dialogIsHisWords(screen: string, words: OwnWords): boolean {', 'export function dialogIsHisWords(screen: string, words: OwnWords, at = 0): boolean {\n  void at;')],
    // The probe review: a hold or a clock through the monitor's writer.
    ["a key zeroing the dialog count in the monitor's writer (a hold by his typing)", (t) => edit(t, MONITOR, MONITOR_WRITER, `    this.ensureState(sessionId).dialogTicks = 0;\n${MONITOR_WRITER}`)],
    ["the monitor's writer stamping the time of his key", (t) => edit(t, MONITOR, MONITOR_WRITER, `    (this.ensureState(sessionId) as unknown as { ownAt: number }).ownAt = this.now();\n${MONITOR_WRITER}`)],
    ["the replay's writer clearing the record on a timer", (t) => edit(t, MONITOR, MONITOR_REPLAY, `${MONITOR_REPLAY}\n    setTimeout(() => {\n      this.ensureState(sessionId).ownWords.lines = [[]];\n    }, 30_000);`)],
    // The fix round: clocks no denylist named, each caught by the allowlist.
    ['own-words.ts reading process.uptime()', (t) => withFile(t, OWN, `${textOf(t, OWN)}\nexport const plantedUptime = (): number => process.uptime();\n`)],
    ['own-words.ts reading globalThis', (t) => withFile(t, OWN, `${textOf(t, OWN)}\nexport const plantedGlobal = (): unknown => globalThis;\n`)],
    ['own-words.ts reading Intl', (t) => withFile(t, OWN, `${textOf(t, OWN)}\nexport const plantedIntl = (): unknown => Intl;\n`)]
  ],
  O4: [
    ['a log call in own-words.ts naming nothing', (t) => withFile(t, OWN, `${textOf(t, OWN)}\nfunction planted(): void {\n  console.log('fixed-word');\n}\nvoid planted;\n`)],
    ['own-words.ts importing a logger', (t) => withFile(t, OWN, `import { getLog } from '../log';\n${textOf(t, OWN)}\nvoid getLog;\n`)],
    ['the record logged in noteOwnWords (A3)', (t) => edit(t, MONITOR, '    noteOwnWordsOn(this.ensureState(sessionId).ownWords, data);', "    const { ownWords } = this.ensureState(sessionId);\n    getLog('activity').info('own', { ownWords });\n    noteOwnWordsOn(ownWords, data);")],
    ['a log call in the tap naming the chunk', (t) => edit(t, HOST, '        client.pty.write(data);\n', '        client.pty.write(data);\n        attachLog.info(`typed ${data}`);\n')],
    ["a log call in core.ts's onInput arrow naming the chunk", (t) => {
      const call = callsNamed(coreOnInput(t) ?? sfOf(t, CORE), 'noteOwnWords')[0];
      return call === undefined ? null : replaceNode(t, CORE, call, `${call.getText()};\n        sessionsLog.info('typed', data)`);
    }],
    ["a log call in restore.ts's replayTailOf naming the text", (t) => {
      const fn = functionNamed(sfOf(t, RESTORE), 'replayTailOf');
      const open = fn?.body?.getStart();
      if (open === undefined) return null;
      const text = textOf(t, RESTORE);
      return withFile(t, RESTORE, `${text.slice(0, open + 1)}\n  const text = path;\n  restoreLog.info('tail', text);${text.slice(open + 1)}`);
    }],
    ["a log call in capabilities.ts's keys writer naming the bytes", (t) => replaceNode(t, CAPS, verbWriter(t, 'createScreenKeys'), "noteOwnWords: (sessionId, data) => { console.log('keys', data); pocketCore?.activity.noteOwnWords(sessionId, data); }")],
    ['a renderer file naming the record', (t) => withFile(t, 'src/renderer/planted.ts', 'export function planted(s: { ownWords: string }): string {\n  return s.ownWords;\n}\n')],
    ["the phone's door naming the replay", (t) => withFile(t, 'src/main/pocket/planted.ts', "export const planted = 'replayedTail';\n")],
    // The probe review: the house's own logger binding, anywhere.
    ['the record logged from the state machine through a logger bound as activityLog', (t) => withFile(t, STATE, `${textOf(t, STATE)}\nconst activityLog = getLog('activity');\nexport function planted(st: SessionState): void {\n  activityLog.debug('verdict', { kept: st.ownWords });\n}\n`)],
    ["the restore's rows logged from core.ts", (t) => edit(t, CORE, 'const { info } = outcome;', "const { info } = outcome;\n      sessionsLog.info('restored', { tail: outcome.replayedTail });")],
    ["the phone's keys spelled as bytes again in the door", (t) => withFile(t, 'src/main/pocket/planted.ts', "import { ownBytesOf } from '../screen/keys';\nexport const planted = (k: never[]): string => ownBytesOf(k);\n")],
    ["the replayed rows read again outside restore.ts", (t) => withFile(t, 'src/main/sessions/planted.ts', "import { replayTailOf } from '../restore/restore';\nexport const planted = (p: string): string | undefined => replayTailOf(p);\n")],
    ["a copy of his keys logged inside keys.ts", (t) => withFile(t, KEYS, `${textOf(t, KEYS)}\nexport function planted(k: never[]): void {\n  console.log('typed', ownBytesOf(k));\n}\n`)]
  ],
  O5: [
    ['the cap moved', (t) => edit(t, OWN, 'export const OWN_WORDS_MAX = 16_384;', 'export const OWN_WORDS_MAX = 32_768;')],
    ['a second cap', (t) => withFile(t, MONITOR, `${textOf(t, MONITOR)}\nconst OWN_WORDS_MAX = 16_384;\nvoid OWN_WORDS_MAX;\n`)],
    ['a carriage return outside a paste no longer clearing (A4)', (t) => {
      const reader = functionNamed(sfOf(t, OWN), 'noteOwnWordsOn');
      const branch = reader === null ? undefined : findAll(reader, (n) => ts.isIfStatement(n) && flat(n.expression.getText()) === 'cp === CR')[0];
      return branch === undefined ? null : replaceNode(t, OWN, branch.thenStatement, '{\n      // planted: nothing\n    }');
    }],
    ['Ctrl-C no longer clearing (A11)', (t) => {
      const reader = functionNamed(sfOf(t, OWN), 'noteOwnWordsOn');
      const branch = reader === null ? undefined : findAll(reader, (n) => ts.isIfStatement(n) && flat(n.expression.getText()) === 'cp === ETX')[0];
      return branch === undefined ? null : replaceNode(t, OWN, branch.thenStatement, '{\n      // planted: nothing\n    }');
    }],
    ['Ctrl-U no longer clearing (the fix round, A22)', (t) => {
      const reader = functionNamed(sfOf(t, OWN), 'noteOwnWordsOn');
      const branch = reader === null ? undefined : findAll(reader, (n) => ts.isIfStatement(n) && flat(n.expression.getText()) === 'cp === NAK')[0];
      return branch === undefined ? null : replaceNode(t, OWN, branch.thenStatement, '{\n      // planted: nothing\n    }');
    }],
    ['clear() keeping the lines', (t) => edit(t, OWN, '  words.lines = [[]];\n', '')],
    ['the cap never asked (A10)', (t) => edit(t, OWN, '  return words.size + 1 > OWN_WORDS_MAX;', '  return false;')],
    ['a line break that passes the cap kept', (t) => {
      const fn = functionNamed(sfOf(t, OWN), 'breakLine');
      const ask = fn === null ? undefined : findAll(fn, (n) => ts.isIfStatement(n) && callsNamed(n.expression, 'full').length === 1)[0];
      return ask === undefined ? null : replaceNode(t, OWN, ask, '');
    }],
    ['the record kept in a module-level map', (t) => withFile(t, MONITOR, `${textOf(t, MONITOR)}\nconst plantedRecords = new Map<string, OwnWords>();\nvoid plantedRecords;\n`)],
    ['module-level state in own-words.ts', (t) => withFile(t, OWN, `${textOf(t, OWN)}\nlet plantedLast = '';\nvoid plantedLast;\n`)],
    ['the record no longer made in freshState', (t) => edit(t, STATE, '    ownWords: freshOwnWords()', '    ownWords: undefined as never')],
    ['the record no longer a field of SessionState', (t) => edit(t, STATE, '  ownWords: OwnWords;\n', '')],
    // The probe review: a clear on a clock, and a copy that rides the wire.
    ['the record forgotten after 30 s of quiet (a time window put back in the verdict)', (t) => edit(t, STATE, VERDICT_QUIET, `${VERDICT_QUIET}\n  if (ctx.now - pane.activityAt > 30_000) st.ownWords = freshOwnWords();`)],
    ["his record copied into the session's question, which rides the wire", (t) => edit(t, STATE, VERDICT_QUIET, `${VERDICT_QUIET}\n  if (st.state === 'needs_input') st.question = st.ownWords.lines.map((l) => l.join('')).join('\\n');`)],
    ['a second reader of the record in the monitor', (t) => withFile(t, MONITOR, `${textOf(t, MONITOR)}\nexport function planted(st: { ownWords: { size: number } }): number {\n  return st.ownWords.size;\n}\n`)],
    // His ruled round: the reverify's two windows by COUNT, no clock and no
    // global, each of which passed every clause, and the other spellings of
    // state at module level.
    ["a count window at module level (the reverify's RV-P2): a const object the rule bumps, his words his for three reads", (t) => countWindow(t, '  if (READS.n - words.keyTick > 3) return false;\n')],
    ["a count hold at module level (the reverify's RV-P3): any numbered dialog his for three reads of his last key", (t) => countWindow(t, '  if (READS.n - words.keyTick <= 3) return true;\n')],
    ['a module-level object literal alone', (t) => withFile(t, OWN, `${textOf(t, OWN)}\nconst plantedState = { n: 0 };\nvoid plantedState;\n`)],
    ['a module-level array literal', (t) => withFile(t, OWN, `${textOf(t, OWN)}\nconst plantedSeen: string[] = [];\nvoid plantedSeen;\n`)],
    ['a member of a module-level function written by the rule', (t) => edit(t, OWN, '  if (lines.length === 0) return false;\n', '  if (lines.length === 0) return false;\n  (dialogIsHisWords as unknown as { seen: number }).seen = 1;\n')],
    ["a module-level regex's lastIndex written", (t) => edit(t, OWN, '  if (lines.length === 0) return false;\n', '  if (lines.length === 0) return false;\n  LETTER_OR_DIGIT.lastIndex = 0;\n')],
    ['Object.assign onto an import', (t) => edit(t, OWN, '  if (lines.length === 0) return false;\n', '  if (lines.length === 0) return false;\n  Object.assign(NUMBERED, { seen: 1 });\n')],
    ['a counter kept in a closure at module level (an IIFE), bumped by the rule', (t) => {
      const a = withFile(t, OWN, `${textOf(t, OWN)}\nconst plantedTick = ((): (() => number) => {\n  let n = 0;\n  return () => (n += 1);\n})();\n`);
      return edit(a, OWN, '  if (lines.length === 0) return false;\n', '  if (lines.length === 0) return false;\n  if (plantedTick() > 3) return false;\n');
    }],
    // The ruled round's probe review: the same window by count, spelled eight
    // more ways, each of which read green before it.
    ["a var in a block at module level, hoisted to the module's scope, bumped by the rule", (t) => {
      const a = withFile(t, OWN, `${textOf(t, OWN)}\n{\n  // eslint-disable-next-line no-var\n  var plantedReads = 0;\n}\n`);
      return edit(a, OWN, RULE_LINE, `${RULE_LINE}  plantedReads += 1;\n  if (plantedReads > 3) return false;\n`);
    }],
    ['a counter kept on an allowlisted global, Math, written by the rule', (t) => edit(t, OWN, RULE_LINE, `${RULE_LINE}  const plantedSeen = ((Math as unknown as { plantedSeen?: number }).plantedSeen ?? 0) + 1;\n  (Math as unknown as { plantedSeen: number }).plantedSeen = plantedSeen;\n  if (plantedSeen > 3) return false;\n`)],
    ['Object.assign onto an allowlisted global, Number', (t) => edit(t, OWN, RULE_LINE, `${RULE_LINE}  Object.assign(Number, { plantedSeen: ((Number as unknown as { plantedSeen?: number }).plantedSeen ?? 0) + 1 });\n  if ((Number as unknown as { plantedSeen: number }).plantedSeen > 3) return false;\n`)],
    ["a class's static counter written through this in a static method", (t) => {
      const a = withFile(t, OWN, `${textOf(t, OWN)}\nclass PlantedReads {\n  static n = 0;\n  static bump(): number {\n    this.n += 1;\n    return this.n;\n  }\n}\n`);
      return edit(a, OWN, RULE_LINE, `${RULE_LINE}  if (PlantedReads.bump() > 3) return false;\n`);
    }],
    ['a member of a module-level function written through a local that names it', (t) => edit(t, OWN, RULE_LINE, `${RULE_LINE}  const plantedHeld = clear as unknown as { reads?: number };\n  plantedHeld.reads = (plantedHeld.reads ?? 0) + 1;\n  if (plantedHeld.reads > 3) return false;\n`)],
    ["a module-level regex with the g flag whose lastIndex .test advances, his words his three reads in four", (t) => {
      const a = withFile(t, OWN, `${textOf(t, OWN)}\nconst PLANTED_TICK = /./g;\n`);
      return edit(a, OWN, RULE_LINE, `${RULE_LINE}  if (!PLANTED_TICK.test('...')) return false;\n`);
    }],
    ['a module-level regex with the sticky y flag, read by .exec', (t) => {
      const a = withFile(t, OWN, `${textOf(t, OWN)}\nconst PLANTED_STICKY = /./y;\n`);
      return edit(a, OWN, RULE_LINE, `${RULE_LINE}  if (PLANTED_STICKY.exec('...') === null) return false;\n`);
    }],
    ["a module-level function's binding reassigned by the rule, a counter in its closure", (t) => {
      const a = withFile(t, OWN, `${textOf(t, OWN)}\nfunction plantedTick(): number {\n  return 0;\n}\n`);
      return edit(a, OWN, RULE_LINE, `${RULE_LINE}  const plantedNow = plantedTick() + 1;\n  // @ts-expect-error a function's binding reassigned\n  plantedTick = (): number => plantedNow;\n  if (plantedNow > 3) return false;\n`);
    }]
  ],
  O6: [
    ['the tile loosened to a substring (A5)', (t) => edit(t, OWN, '!line.startsWith(rest, pos)', '!line.includes(rest)')],
    ['the mark test reading no letters (A7)', (t) => edit(t, OWN, 'const LETTER_OR_DIGIT = /[\\p{L}\\p{N}]/u;', 'const LETTER_OR_DIGIT = /[\\p{N}]/u;')],
    ['an indexOf in own-words.ts', (t) => withFile(t, OWN, `${textOf(t, OWN)}\nexport const planted = (a: string, b: string): boolean => a.indexOf(b) >= 0;\n`)],
    ["the tile's end no longer the line's length", (t) => edit(t, OWN, 'if (pos + rest.length === line.length) {', 'if (pos + rest.length >= line.length - 1) {')],
    // The probe review: a row compared by a piece of itself.
    ['the tile comparing only the first character of the row', (t) => edit(t, OWN, '!line.startsWith(rest, pos)', '!line.startsWith(rest.slice(0, 1), pos)')]
  ],
  O7: [
    ['the dialog line changed', (t) => edit(t, STATE, '  const dialog = numbered || shaped;', '  const dialog = (numbered || shaped) && !false;')],
    ['own read a second time', (t) => edit(t, STATE, '  if (dialog && !own) {', '  if (own) st.quietTicks = 0;\n  if (dialog && !own) {')],
    ['the arm no longer asking own (the parent\'s line back)', (t) => edit(t, STATE, '  if (dialog && !own) {', '  if (dialog) {')],
    ['own-words.ts asking detectDialog', (t) => {
      const a = edit(t, OWN, 'import { BORDER, ', 'import { BORDER, detectDialog, ');
      return a === null ? null : withFile(a, OWN, `${textOf(a, OWN)}\nexport const planted = (s: string): boolean => detectDialog(s);\n`);
    }],
    ['own-words.ts asking detectDialogRows twice', (t) => withFile(t, OWN, `${textOf(t, OWN)}\nexport const planted = (s: string): boolean => detectDialogRows(s).atChoice;\n`)],
    ['own-words.ts reading the evidence rows twice', (t) => withFile(t, OWN, `${textOf(t, OWN)}\nexport const planted = (s: string): boolean[] => dialogEvidenceRows(s);\n`)],
    ['the evidence rows read outside own-words.ts', (t) => withFile(t, 'src/main/activity/planted.ts', "import { dialogEvidenceRows } from './screen';\nexport const planted = (s: string): boolean[] => dialogEvidenceRows(s);\n")],
    ['dialogIsHisWords writing through its parameter', (t) => edit(t, OWN, '  if (lines.length === 0) return false;', '  words.col = 0;\n  if (lines.length === 0) return false;')]
  ],
  O8: [
    ['REPLAY_TAIL_ROWS off the verdict\'s window', (t) => edit(t, RESTORE, 'REPLAY_TAIL_ROWS = 24;', 'REPLAY_TAIL_ROWS = 25;')],
    ['replayedTail set before the replay was typed', (t) => {
      const fn = functionNamed(sfOf(t, RESTORE), 'restoreSessionInTmux');
      const w = fn === null ? undefined : findAll(fn, (n) => ts.isBinaryExpression(n) && ts.isIdentifier(n.left) && n.left.text === 'replayedTail' && n.operatorToken.kind === ts.SyntaxKind.EqualsToken)[0];
      if (w === undefined) return null;
      const line = `${w.getText()};`;
      const a = dropStatementOf(t, RESTORE, w);
      return a === null ? null : edit(a, RESTORE, '      await typeIntoPane(target, buildSnapshotReplayCommand(snapshot), true);', `      ${line}\n      await typeIntoPane(target, buildSnapshotReplayCommand(snapshot), true);`);
    }],
    ['replayedTail given a value at its declaration', (t) => edit(t, RESTORE, '  let replayedTail: string | undefined;', "  let replayedTail: string | undefined = '';")]
  ],
  O9: [
    ['the named-key table without NPage', (t) => edit(t, KEYS, "  NPage: '\\u001b[6~'\n", '')],
    ["the keys' writer before the funnel", (t) => {
      const sf = sfOf(t, KEYS);
      const call = findAll(sf, (n) => ts.isCallExpression(n) && calleeName(n) === 'noteOwnWords')[0];
      const funnel = callsNamed(sf, 'noteUserInput')[0];
      if (call === undefined || funnel === undefined) return null;
      const a = replaceNode(t, KEYS, call, 'void 0');
      const f2 = callsNamed(sfOf(a, KEYS), 'noteUserInput')[0];
      return a === null || f2 === undefined ? null : replaceNode(a, KEYS, f2, `${call.getText()};\n          ${f2.getText()}`);
    }],
    ["the keys' writer for a session on another machine too", (t) => edit(t, KEYS, 'if (result.any && machine === null) {', 'if (result.any) {')],
    ["the paste's writer outside its success test", (t) => {
      const sf = sfOf(t, PASTE);
      const call = findAll(sf, (n) => ts.isCallExpression(n) && calleeName(n) === 'noteOwnWords')[0];
      if (call === undefined) return null;
      const a = dropStatementOf(t, PASTE, call);
      return a === null ? null : edit(a, PASTE, '      try {\n        deps.watch.nudge(id, mark);', `      ${call.getText()};\n      try {\n        deps.watch.nudge(id, mark);`);
    }],
    ["the paste's writer sharing the funnel's try", (t) => {
      const sf = sfOf(t, PASTE);
      const call = findAll(sf, (n) => ts.isCallExpression(n) && calleeName(n) === 'noteOwnWords')[0];
      const funnel = callsNamed(sf, 'noteUserInput')[0];
      if (call === undefined || funnel === undefined) return null;
      const a = dropStatementOf(t, PASTE, call);
      const f2 = a === null ? undefined : callsNamed(sfOf(a, PASTE), 'noteUserInput')[0];
      return f2 === undefined ? null : replaceNode(a, PASTE, f2, `${f2.getText()};\n          ${call.getText()}`);
    }],
    ["the paste's writer called twice", (t) => {
      const call = findAll(sfOf(t, PASTE), (n) => ts.isCallExpression(n) && calleeName(n) === 'noteOwnWords')[0];
      return call === undefined ? null : replaceNode(t, PASTE, call, `${call.getText()};\n          ${call.getText()}`);
    }]
  ],
  O10: [
    ['a new caller of the funnel that hands the record nothing', (t) => withFile(t, 'src/main/screen/planted.ts', "export function plant(deps: { noteUserInput(id: string): void }): void {\n  deps.noteUserInput('s');\n}\n")],
    ['an exemption that excuses nothing', (t) => {
      const files = new Map(t.files);
      files.delete('src/main/ipc.ts');
      return { files };
    }],
    ['capabilities.ts handing the phone verbs no writer', (t) => {
      let s = t;
      for (const verb of ['createScreenKeys', 'createScreenPaste']) {
        const p = verbWriter(s, verb);
        if (p === null) return null;
        s = replaceNode(s, CAPS, p, 'noteRepaint: () => undefined');
      }
      return s;
    }]
  ]
};

/**
 * THE RULED ROUND'S PROBE REVIEW: copies of the tree that change own-words.ts
 * and keep NO state from one call to the next, each of which its clause must
 * read GREEN, so the widened O5 is shown to refuse state that outlives a call,
 * and never a shape that only looks like it.
 */
const HONEST = {
  O5: [
    ['a local object written inside the rule', (t) => edit(t, OWN, RULE_LINE, `${RULE_LINE}  const plantedTally = { n: 0 };\n  plantedTally.n += lines.length;\n  if (plantedTally.n < 0) return false;\n`)],
    ['a local array filled inside the rule', (t) => edit(t, OWN, RULE_LINE, `${RULE_LINE}  const plantedSeen: string[] = [];\n  plantedSeen.push(first ?? '');\n  if (plantedSeen.length > 1_000_000) return false;\n`)],
    ['a module-level number the rule reads', (t) => {
      const a = withFile(t, OWN, `${textOf(t, OWN)}\nconst PLANTED_LIMIT = 3;\n`);
      return edit(a, OWN, RULE_LINE, `${RULE_LINE}  if (lines.length > PLANTED_LIMIT * 1_000_000) return false;\n`);
    }],
    ['a module-level regex with neither g nor y, read by .test', (t) => {
      const a = withFile(t, OWN, `${textOf(t, OWN)}\nconst PLANTED_DIGIT = /\\d/u;\n`);
      return edit(a, OWN, RULE_LINE, `${RULE_LINE}  if (PLANTED_DIGIT.test('') && lines.length < 0) return false;\n`);
    }],
    ['a module-level regex with g used only by replace and split, which reset it', (t) => {
      const a = withFile(t, OWN, `${textOf(t, OWN)}\nconst PLANTED_SPACES = /\\s/gu;\n`);
      return edit(a, OWN, RULE_LINE, `${RULE_LINE}  if (' a '.replace(PLANTED_SPACES, '') === '' || 'a b'.split(PLANTED_SPACES).length < 0) return false;\n`);
    }],
    ['a class instance made inside the rule, its instance method writing this', (t) => {
      const a = withFile(t, OWN, `${textOf(t, OWN)}\nclass PlantedWalker {\n  n = 0;\n  step(): number {\n    this.n += 1;\n    return this.n;\n  }\n}\n`);
      return edit(a, OWN, RULE_LINE, `${RULE_LINE}  if (new PlantedWalker().step() > 1) return false;\n`);
    }],
    ["a local naming the record, written by the reader (the record is the session's own state)", (t) => edit(t, OWN, '  const cps = codePointsOf(data);\n', '  const cps = codePointsOf(data);\n  const rec = words;\n  rec.size = rec.size + 0;\n')]
  ]
};

const CLAUSES = [
  ['O1', 'the writers and no other: the desk, the phone\'s keys, paste and message\'s Enter, and a restore, each once', writersFindings,
    'the record must hear every byte of his and nothing that is not his: without a writer his words read as the agent\'s question again, and a writer more is a door his words could leave by (build/p3251/SPEC.md D3251-1, D3251-7 to D3251-10).'],
  ['O2', 'the tap hands the chunk it wrote, after the write, under Phase 318\'s guard', tapFindings,
    'every byte he sends a local session enters main at this listener, and the record must read exactly those bytes, never a report the pane sent and never a session on another machine (D3251-7).'],
  ['O3', 'no clock: the record and the rule read no time', clockFindings,
    'a real question is never held by timing alone (his ruling "2. a"): a time window back in the rule is Phase 325\'s miss back (§0.1 item 4).'],
  ['O4', 'never logged, never leaves main', keptFindings,
    'what he types is held only in main\'s memory, never logged, written, or sent to the renderer, the phone or a push (the entry\'s mechanism 4).'],
  ['O5', 'the record forgets: one cap, cleared on submit and Ctrl-C, held in the session\'s state alone', forgetFindings,
    'a question that repeats words he typed long ago is still the agent\'s, and his words go when the session goes (the entry\'s mechanism 3, D3251-1, D3251-3); state the module keeps of its own is a window by count (his ruled round).'],
  ['O6', 'whole lines only, behind a mark that holds no letter or digit', wholeLineFindings,
    'a line of his is on the screen only when rows spell the whole of it: a substring would let his short words hold a real question (D3251-4, §2.5).'],
  ['O7', 'beside the verdict, read once, by the arm; the predicate asked once', besideFindings,
    'the numbered verdict\'s line and the shapes do not move (conformance:choices), and the rule can only withhold a count (D3251-5, D3251-6).'],
  ['O8', 'the replay hands the verdict\'s own 24 rows, once it was typed', replayFindings,
    'a restore\'s replayed question is his record\'s only when the replay really printed it (D3251-10).'],
  ['O9', 'the phone hands what it typed: the contract\'s key names, once, after the act, in a try of its own', phoneFindings,
    'his words from his iPhone reach the session through tmux, never through the tap, and are his (§0.1 item 7, D3251-8).'],
  ['O10', 'every caller of the desk\'s funnel hands the record, or is exempt by name', exemptFindings,
    'a new path that types for him and hands the record nothing reads his words as the agent\'s question again (D3251-9).']
];

// ---------------------------------------------------------------------------

/**
 * Ends the run with `code` once stdout and stderr have handed on every byte
 * written to them (Phase 361.1). The callbacks of an empty write run only
 * after every earlier write to that stream. The promise never settles, so
 * nothing after the caller's await runs, as after process.exit. gate:checks
 * clause 9 pins this function's text byte for byte, so change both together,
 * and ablation:p3251 reads this gate through a pipe (Phase 325.1, his ruled
 * round).
 */
function exitWhenWritten(code) {
  process.exitCode = code;
  let open = 2;
  const done = () => {
    open -= 1;
    if (open === 0) process.exit(code);
  };
  process.stdout.write('', done);
  process.stderr.write('', done);
  return new Promise(() => {});
}

const tree = liveTree();
const seam = seamed(tree);
const problems = [];
let attacksRed = 0;
let honestGreen = 0;
const liveRed = [];
if (seam === null) problems.push("the integrator's seams S1 to S3 could not be planted over this core.ts and capabilities.ts in the spec's shape, so the clauses that read them were shown neither to pass nor to fail");
else if (seam !== tree) say("note  the integrator's seams S1 to S3 are planted over a COPY for the self-tests: the live core.ts and capabilities.ts do not carry them yet");
for (const [id, name, findingsOf, why] of CLAUSES) {
  const found = findingsOf(tree);
  if (found.length === 0) say(`ok    ${id.padEnd(3)}  ${name}`);
  else {
    say(`RED   ${id.padEnd(3)}  ${name}`);
    liveRed.push(id);
    problems.push(`${id} "${name}": ${why} Found: ${found.join('; ')}.`);
  }
  if (seam === null) continue;
  // The control: over the tree with the seams in the spec's shape, green.
  if (seam !== tree) {
    const control = findingsOf(seam);
    if (control.length > 0) {
      problems.push(`${id} control: over the tree with the seams planted in the spec's shape it reads RED (${control.join('; ')}), so the clause would refuse a correct wiring`);
      say(`RED   ${id.padEnd(3)}~ the control, the seams planted, reads red`);
    }
  }
  const attacks = ATTACKS[id] ?? [];
  if (attacks.length === 0) problems.push(`${id} carries no self-test, so it has never been shown to fail`);
  for (const [attack, build] of attacks) {
    const broken = build(seam);
    if (broken === null) {
      problems.push(`${id} self-test "${attack}" could not be built over this tree, so the clause was not shown to fail`);
      say(`RED   ${id.padEnd(3)}! self-test "${attack}" could not be built`);
      continue;
    }
    const caught = findingsOf(broken);
    if (caught.length === 0) {
      problems.push(`${id} self-test "${attack}": the clause read GREEN over a copy with its rule broken, so it has stopped asking`);
      say(`RED   ${id.padEnd(3)}! self-test "${attack}" stayed green`);
      continue;
    }
    if (VERBOSE) say(`      ${id.padEnd(3)}! "${attack}" → red: ${caught[0].slice(0, 150)}`);
    attacksRed += 1;
  }
  // The ruled round's probe review: what the clause must let through.
  for (const [honest, build] of HONEST[id] ?? []) {
    const copy = build(seam);
    if (copy === null) {
      problems.push(`${id} honest control "${honest}" could not be built over this tree, so the clause was not shown to let it through`);
      say(`RED   ${id.padEnd(3)}~ honest control "${honest}" could not be built`);
      continue;
    }
    const caught = findingsOf(copy);
    if (caught.length > 0) {
      problems.push(`${id} honest control "${honest}" reads RED (${caught[0].slice(0, 150)}), so the clause refuses a shape that keeps nothing between calls`);
      say(`RED   ${id.padEnd(3)}~ honest control "${honest}" reads red`);
      continue;
    }
    if (VERBOSE) say(`      ${id.padEnd(3)}= "${honest}" → green, as it must be`);
    honestGreen += 1;
  }
}

if (problems.length > 0) {
  for (const p of problems) process.stderr.write(`${TAG} ${p}\n`);
  const seamsOnly = seam !== tree && liveRed.length > 0 && problems.length === liveRed.length;
  process.stderr.write(
    `${TAG} FAILED: ${String(problems.length)} finding(s) over ${String(CLAUSES.length)} clauses` +
      (seamsOnly ? ` (red on the live tree: ${liveRed.join(', ')}, while the integrator's seams S1 to S3 are not in it; every self-test, ${String(attacksRed)}, read red over the seamed copy)` : '') +
      '.\n'
  );
  await exitWhenWritten(1);
}
say(
  `PASS: all ${String(CLAUSES.length)} clauses hold, and ${String(attacksRed)} self-tests, each a copy of the tree with one rule ` +
    `broken, read red as they must, beside ${String(honestGreen)} honest copies that keep no state and read green. ` +
    'The behaviour is driven in own-words.test.ts and p3251-own-words.test.ts; ' +
    '`npm run ablation:p3251` is the attack on it.'
);
await exitWhenWritten(0);
