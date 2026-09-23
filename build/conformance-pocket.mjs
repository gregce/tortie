#!/usr/bin/env node
/**
 * `npm run conformance:pocket`. The cheap gate on the door (Phase 313).
 *
 * WHAT IT IS FOR. `src/main/pocket/` is the first thing in Tortie that anything
 * outside this Mac can ask a question. Every promise that makes that safe is
 * ONE clause in one module — one `listen`, one address, one closed table, one
 * refusal before a header is read — and every one of them is a line a later
 * round can delete with every other gate in this repository still green. This
 * file is the executable half of those promises, in about a second.
 *
 * WHAT IT STARTS. Nothing. No Electron, no tmux, no ssh, no agent, no token,
 * and NOT ONE SOCKET: it binds nothing, it opens nothing, it reads nothing
 * under the person's home and it writes no file. The attack beside it,
 * `build/p313/hostile-client.mjs`, is the half that drives a live door, and it
 * binds loopback on a port it found for itself and closes it in a `finally`.
 *
 * HOW IT READS. The source, parsed with the TypeScript compiler's own parser,
 * so a comment, a string and a call are each read as what they are. A rule
 * that could be satisfied by a word in a comment is not a rule, and three of
 * the rules below exist because their earlier draft was exactly that.
 *
 * WHAT IT FAILS ON. Every failure is printed as `[p313 <rule>]`, which is what
 * `npm run ablation:p313` reads to prove each rule can go red ON ITS OWN. A
 * rule nothing can redden is decoration and the ablation says so by name.
 *
 * A NOTE ON A MISSING MODULE. Half of this domain is written by one builder and
 * half by another, and a gate that passed while a module was absent would be
 * the worst possible answer: it would go green on the day the door does not
 * exist. So a missing module FAILS the rule that needed it, by name, and says
 * which module and which builder owns it.
 *
 *   node build/conformance-pocket.mjs            the gate
 *   node build/conformance-pocket.mjs --list     the rules, and nothing run
 */

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TAG = '[conformance:pocket]';
const t0 = Date.now();

/**
 * The rules. `owner` is the clause of `build/p313/SPEC.md` or of Phase 313's
 * backlog entry that the rule is the executable half of.
 */
const RULES = [
  ['L1', 'entry, mechanism 1', 'exactly ONE listen call in the whole domain, and it is the door’s own'],
  ['L2', 'entry, mechanism 1', 'the string 0.0.0.0 is nowhere in the domain, and no listen call omits its host'],
  ['L3', 'entry, mechanism 1', 'the host comes from the allowlist function alone: the tailnet range is named in one module and the bind reads no other source'],
  ['L4', 'entry, mechanism 1', 'a taken port refuses: no listen(0) and no second listen after an error, which is the opposite of hooks.ts:230-243'],
  ['R1', 'SPEC §2', 'the route table is CLOSED: frozen, every path an exact string, no pattern, no wildcard, no default arm'],
  ['R2', 'SPEC §2, entry mechanism 4', 'every route is a read, and the ONE route that is not a GET is the pairing route, window-only and unsigned'],
  ['R4', 'the fix round, 2026-09-22', 'the table’s MEMBERSHIP is pinned: the exact set of method-and-path pairs, by sha256, so a fourth route is a visible edit rather than a green build'],
  ['R5', 'entry, mechanism 4', 'the turn limit is clamped AT THE DOOR against the overview store’s own MAX_TURN_LIMIT, which is imported and never re-spelled'],
  ['R3', 'entry, mechanism 4', 'the domain names no write verb, no status setter, no spawn and no credential read'],
  ['A1', 'entry, mechanism 5', 'no Authorization header and no cookie is read or written anywhere in the domain'],
  ['A2', 'entry, mechanism 5, research 127 §7', 'no secret is in a path or a query: no route path interpolates and no 32-hex token is matched out of one'],
  ['A3', 'entry, mechanism 3', '/pair is dead outside its window, and the window is checked before anything is read off the request'],
  ['S1', 'entry, mechanism 5', 'Referrer-Policy: no-referrer is emitted from exactly ONE place'],
  ['S2', 'entry, mechanism 4', 'a request whose source address is the bind address is refused BEFORE any header is read'],
  ['S4', 'the fix round, 2026-09-22', 'isSelfOrigin refuses the RIGHT WAY ROUND: it answers true on equality and true on an unknown source, so the comparison cannot be inverted with every gate green'],
  ['W1', 'the fix round, 2026-09-22', 'every file and directory this domain creates names an owner-only mode, so one write in it cannot drift looser than its sibling'],
  ['B1', 'the judge, 2026-09-22', 'the bridge and the registrar move together: window.gmux carries a pocket member exactly when main registers the pocket channels'],
  ['S3', 'entry, proof; hooks.ts:256-316', 'the disposer owns the listener: admission closes on the first line of the stop, before any await, and the listener is closed there'],
  ['G1', 'entry, proof; hooks.ts:368-385', 'no token, no body, no header value and no line of conversation is reachable from any log call'],
  ['T1', 'the operator, 2026-09-22', 'nothing in this repository binds a real interface: every test and every gate drives the door on loopback'],
  ['H1', 'his ruling, 2026-09-22 (“lets skip the web app”)', 'this domain composes NO HTML document and names no text/html content type: the page was built, could not be reached under mechanism 5’s own refusals, and was removed on his ruling, so a later round that wants one asks him rather than rebuilding it under a green gate'],
  ['N1', 'Phase 314, build/p314/SPEC.md §1.1 row 3', 'NO PUSH ROUTE EXISTS: no route id, path or contract id names push, apns, notify, device, token or alert, and the table’s membership is still Phase 313’s, byte for byte'],
  ['N2', 'Phase 314, build/p314/SPEC.md §6.2', 'THE DEVICE TOKEN HAS ONE DOOR IN AND NONE OUT: the presentation parser takes apt as bounded hex and ape as one of two words or refuses, no renderer-facing type carries a field named like a token, and PocketPushDestination lives in main alone'],
  // PHASE 316.1, the door switched on. Six rules, build/p316/SPEC.md §4 S1
  // "Gates". THE SPEC NAMED TWO OF THEM `T1` AND `L1`, and both ids were already
  // this gate's (T1 is the loopback rule, L1 the one listen call), so they are
  // `T2` and `L5` here — the way the SPEC itself named `H2` because `H1` was
  // taken. The letters still say what the rule is about.
  ['K1', 'build/p316/SPEC.md §4 S1 mechanism 6', 'HIS TAILNET KEY reaches no file, no log and no answer but the one offer whose QR carries it: checked for its prefix and its length before anything moves, held as BYTES in the window, zeroed on cancel, on expiry, on allow and on every refusal, named on no renderer-facing type and on no stored shape, and kept out of the renderer’s storage'],
  ['O1', 'build/p316/SPEC.md §4 S1 mechanism 4; his ruling of 2026-09-22', '`others` is exactly the listed sessions that are not blocked: composed from the same session list and the same blocked set as `rows`, capped at POCKET_OTHERS_MAX imported from the contract and never re-spelled, with the omitted count said'],
  ['F1', 'build/p316/SPEC.md §4 S1 mechanism 6, §2 row 24', 'the QR is v:2 and pins the door’s PUBLIC KEY, from the LISTENING door, never the 397-day certificate, and no window opens while there is nothing to pin'],
  ['T2', 'build/p316/SPEC.md §4 S1 mechanisms 2 and 3', 'every turn the door reads is preceded by the refresh through the one read path (`sessionActivity`), and every turn it answers passes through `toTurnView` once and is built nowhere else'],
  ['L5', 'build/p316/SPEC.md §4 S1 mechanism 5; CLAUDE.md refusal 8', 'the launch step binds only on CONFIRMED fields: `enabled` AND `bindAtLaunch` AND a confirmed hash, one call site binds in the whole of src/main, and it asks the gate before the socket; and (the 316.1 fix round) a switch-off is recorded as the last press before its first await, and the one bind asks whether a later press arrived, with nothing awaited before the socket'],
  ['A4', 'build/p316/SPEC.md §4 S1 Method B; the 316.1 fix round', 'an answer is admitted AGAIN before it is sent: after the answer is composed the handler asks whether the phone it VERIFIED is still paired and whether the door INSTANCE that accepted the request has begun to stop, with nothing awaited before the send; the listener hands the handler that instance; the host answers the phone question from its store, and a Remove writes the store before its first await'],
  ['H2', 'build/p316/SPEC.md §4 S1 mechanism 1, §2 rows 17 and 20', 'no `ssh` hand-off: the kind is gone from the contract, no module in the door composes an ssh link or a tmux attach, and the hand-off answers null for every session in 316'],
  // PHASE 316.1, the reverify's X1b/X1c/X1d/X2b and his ruling of 2026-09-23
  // ("Yes, fix and land."): the door's switch handles one press at a time.
  ['Q1', 'his ruling, 2026-09-23 (“Yes, fix and land.”); the 316.1 reverify', 'THE SWITCH HANDLES ONE PRESS AT A TIME: every start and stop of the door runs through ONE serial queue on PocketHost that chains each job on one tail and never lets a failed job stop the next; the one start and the one stop are each reached only from inside a queued job; both halves of setDoor count themselves as the last press before their first await and reach the door only through the queue; and a start whose press is no longer the last one stops waiting on the sessions, binds nothing, and closes a door that bound under it before its job ends']
];

if (process.argv.includes('--list')) {
  for (const [id, owner, title] of RULES) {
    process.stdout.write(`${id.padEnd(4)} ${owner.padEnd(34)} ${title}\n`);
  }
  process.exit(0);
}

// ---------------------------------------------------------------------------
// The domain, read
// ---------------------------------------------------------------------------

const DOMAIN = join(ROOT, 'src', 'main', 'pocket');
const rel = (path) => relative(ROOT, path);

const failures = new Map(RULES.map(([id]) => [id, []]));
const checks = new Map(RULES.map(([id]) => [id, 0]));
const fail = (id, text) => failures.get(id).push(text);
const checked = (id, n = 1) => checks.set(id, checks.get(id) + n);

/** Every .ts under a directory, tests excluded. */
function sourcesUnder(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  const walk = (d) => {
    for (const name of readdirSync(d)) {
      const path = join(d, name);
      if (statSync(path).isDirectory()) {
        if (name !== '__tests__') walk(path);
        continue;
      }
      if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(path);
    }
  };
  walk(dir);
  return out.sort();
}

const parsed = new Map();
function astOf(path) {
  let sf = parsed.get(path);
  if (sf === undefined) {
    sf = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    parsed.set(path, sf);
  }
  return sf;
}

function nodesOf(path) {
  const out = [];
  const visit = (n) => {
    out.push(n);
    ts.forEachChild(n, visit);
  };
  visit(astOf(path));
  return out;
}

function where(path, node) {
  const sf = astOf(path);
  const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
  return `${rel(path)}:${String(line + 1)}`;
}

/** The name a call is made BY: `foo(` and `a.b.foo(` both answer `foo`. */
function calleeName(call) {
  const e = call.expression;
  if (ts.isIdentifier(e)) return e.text;
  if (ts.isPropertyAccessExpression(e)) return e.name.text;
  return null;
}

/** Every call expression in a file. */
function callsOf(path) {
  return nodesOf(path).filter((n) => ts.isCallExpression(n));
}

/**
 * Every string a file holds AS CODE — literals and template pieces — with
 * comments deliberately excluded, because a rule a comment can satisfy is not a
 * rule and a rule a comment can BREAK is worse: this domain's modules explain
 * their own refusals by quoting the thing they refuse.
 */
function codeStringsOf(path) {
  return nodesOf(path)
    .filter(
      (n) =>
        ts.isStringLiteral(n) ||
        ts.isNoSubstitutionTemplateLiteral(n) ||
        ts.isTemplateHead(n) ||
        ts.isTemplateMiddle(n) ||
        ts.isTemplateTail(n)
    )
    .map((n) => ({ node: n, text: n.text }));
}

/** The source with every comment blanked, for the rules that read text. */
function codeTextOf(path) {
  const text = readFileSync(path, 'utf8');
  const sf = astOf(path);
  const spans = [];
  const collect = (node) => {
    const full = node.getFullStart();
    const start = node.getStart(sf);
    if (full < start) {
      for (const r of ts.getLeadingCommentRanges(text, full) ?? []) spans.push(r);
    }
    ts.forEachChild(node, collect);
  };
  collect(sf);
  const chars = [...text];
  for (const span of spans) {
    for (let i = span.pos; i < span.end && i < chars.length; i += 1) {
      if (chars[i] !== '\n') chars[i] = ' ';
    }
  }
  return chars.join('');
}

const domainFiles = sourcesUnder(DOMAIN);

/** A module this gate needs, or null with the rule failed by name. */
function moduleNamed(basename, ruleId, whoOwnsIt) {
  const direct = join(DOMAIN, `${basename}.ts`);
  if (existsSync(direct)) return direct;
  const found = domainFiles.find((f) => f.endsWith(`/${basename}.ts`));
  if (found !== undefined) return found;
  fail(
    ruleId,
    `src/main/pocket/${basename}.ts does not exist, so this rule read nothing. ` +
      `It is ${whoOwnsIt}. A gate that passed here would go green on the day the door does not exist.`
  );
  return null;
}

// ---------------------------------------------------------------------------
// L — the bind
// ---------------------------------------------------------------------------

function bindRules() {
  if (domainFiles.length === 0) {
    for (const id of ['L1', 'L2', 'L3', 'L4']) {
      fail(id, 'src/main/pocket/ holds no source file at all');
    }
    return;
  }

  // L1. Every `listen(` in the domain, wherever it is.
  const listens = [];
  for (const file of domainFiles) {
    for (const call of callsOf(file)) {
      if (calleeName(call) === 'listen') listens.push({ file, call });
    }
  }
  checked('L1', listens.length + 1);
  if (listens.length === 0) {
    fail('L1', 'the domain holds NO listen call, so there is no door and nothing to hold to one');
  } else if (listens.length > 1) {
    fail(
      'L1',
      `the domain holds ${String(listens.length)} listen calls: ${listens.map((l) => where(l.file, l.call)).join(', ')}. ` +
        'One door means one listener, and a second one is a second address, a second port and a second set of refusals.'
    );
  }

  // L2. The wildcard, by name, and a listen with no host.
  for (const file of domainFiles) {
    for (const { node, text } of codeStringsOf(file)) {
      checked('L2');
      if (text === '0.0.0.0' || text === '::' || text.includes('0.0.0.0')) {
        fail(
          'L2',
          `${where(file, node)} names ${JSON.stringify(text)} as a VALUE. The door binds the Mac's own tailnet address and never a wildcard.`
        );
      }
    }
  }
  for (const { file, call } of listens) {
    checked('L2');
    // `listen(port, host, cb)` — the second argument is the host and it must be
    // there. `listen(port, cb)` binds every interface, which is the wildcard
    // spelled by omission rather than by name.
    const second = call.arguments[1];
    if (second === undefined || ts.isFunctionLike(second)) {
      fail(
        'L2',
        `${where(file, call)} calls listen with no host argument, which binds EVERY interface. That is 0.0.0.0 spelled by omission.`
      );
    }
  }

  // L3. The tailnet range is named in exactly one module, and the host the
  // listener gets is a local binding rather than a literal.
  const rangeFiles = domainFiles.filter((f) =>
    codeStringsOf(f).some(({ text }) => text.includes('100.64'))
  );
  checked('L3', rangeFiles.length + 1);
  if (rangeFiles.length === 0) {
    fail('L3', 'no module in the domain names the tailnet range 100.64.0.0/10, so nothing allowlists the address');
  } else if (rangeFiles.length > 1) {
    fail(
      'L3',
      `${String(rangeFiles.length)} modules name the tailnet range (${rangeFiles.map(rel).join(', ')}). ` +
        'Two spellings of an address rule drift, and the one that drifts is the one nobody reads.'
    );
  }
  for (const { file, call } of listens) {
    const host = call.arguments[1];
    checked('L3');
    if (host !== undefined && ts.isStringLiteral(host)) {
      fail(
        'L3',
        `${where(file, call)} binds the literal ${JSON.stringify(host.text)}. The host is read from the interface table, never written down.`
      );
    }
  }

  // L4. A taken port refuses. `listen(0)` anywhere, or a second listen inside
  // an error handler, is the hook server's fallback and this door's refusal.
  for (const { file, call } of listens) {
    checked('L4');
    const port = call.arguments[0];
    if (port !== undefined && ts.isNumericLiteral(port) && port.text === '0') {
      fail(
        'L4',
        `${where(file, call)} calls listen(0), which takes whatever port is free. A phone was told a number, so a taken port refuses.`
      );
    }
  }
  const bind = moduleNamed('bind', 'L4', "Builder A's");
  if (bind !== null) {
    const text = codeTextOf(bind);
    checked('L4');
    if (!/'port-taken'|"port-taken"/.test(text)) {
      fail(
        'L4',
        `${rel(bind)} names no port-taken refusal, so a taken port has no answer of its own and the door cannot say what went wrong.`
      );
    }
  }
}

// ---------------------------------------------------------------------------
// R — the route table
// ---------------------------------------------------------------------------

/** The `POCKET_ROUTES` initialiser, or null. */
function routeTable() {
  const routes = moduleNamed('routes', 'R1', "Builder B's");
  if (routes === null) return null;
  for (const node of nodesOf(routes)) {
    if (!ts.isVariableDeclaration(node)) continue;
    if (!ts.isIdentifier(node.name) || node.name.text !== 'POCKET_ROUTES') continue;
    return { file: routes, init: node.initializer ?? null };
  }
  fail(
    'R1',
    `${rel(routes)} declares no POCKET_ROUTES. The table is what makes the door closed, and a gate cannot read a table that has no name.`
  );
  return null;
}

function routeRules() {
  const table = routeTable();
  if (table === null) {
    fail('R2', 'there is no POCKET_ROUTES to read, so nothing proves the routes are reads');
    return;
  }
  const { file, init } = table;
  checked('R1');
  if (init === null) {
    fail('R1', `${rel(file)}'s POCKET_ROUTES has no initialiser`);
    return;
  }
  // Frozen. A closed table a later round can push onto is not closed.
  const frozen =
    ts.isCallExpression(init) &&
    calleeName(init) === 'freeze' &&
    ts.isPropertyAccessExpression(init.expression) &&
    ts.isIdentifier(init.expression.expression) &&
    init.expression.expression.text === 'Object';
  checked('R1');
  if (!frozen) {
    fail(
      'R1',
      `${where(file, init)}: POCKET_ROUTES is not Object.freeze(...). A table anything can push a route onto at run time is not a closed table, and "the route table is closed" is one of this phase's promises.`
    );
  }
  const array = frozen ? init.arguments[0] : init;
  checked('R1');
  if (array === undefined || !ts.isArrayLiteralExpression(array)) {
    fail('R1', `${where(file, init)}: POCKET_ROUTES is not an array literal, so its rows cannot be read here`);
    return;
  }

  const rows = [];
  for (const element of array.elements) {
    if (!ts.isObjectLiteralExpression(element)) {
      checked('R1');
      fail('R1', `${where(file, element)}: a row of POCKET_ROUTES is not an object literal`);
      continue;
    }
    const row = {};
    for (const prop of element.properties) {
      if (!ts.isPropertyAssignment(prop) || !ts.isIdentifier(prop.name)) continue;
      row[prop.name.text] = prop.initializer;
    }
    rows.push({ node: element, row });
  }
  checked('R1');
  if (rows.length === 0) fail('R1', `${rel(file)}: POCKET_ROUTES is empty`);

  for (const { node, row } of rows) {
    checked('R1', 2);
    const path = row['path'];
    if (path === undefined || !ts.isStringLiteral(path)) {
      fail(
        'R1',
        `${where(file, node)}: a row's path is not an exact string literal. A pattern, a template or a computed path is a table nothing can enumerate.`
      );
    } else if (path.text.includes('*') || path.text.includes(':') || path.text.includes('$')) {
      fail(
        'R1',
        `${where(file, node)}: the path ${JSON.stringify(path.text)} holds a wildcard or a parameter. The session id rides in the QUERY so the table stays a set of exact strings.`
      );
    }
    // R2. THE PROMISE IS "ZERO WRITE ROUTES", and the table says so in its own
    // fields rather than in a comment: every row declares `reads: true`. The
    // one row that is not a GET is the pairing route, and it is the only row
    // allowed to be unsigned or window-only — which is what makes "/pair is
    // dead outside its window" a property of the table rather than of a branch
    // somebody has to find.
    checked('R2', 3);
    const method = row['method'];
    const reads = row['reads'];
    const signed = row['signed'];
    const windowOnly = row['windowOnly'];
    const isPair =
      path !== undefined && ts.isStringLiteral(path) && path.text === '/pair';
    if (reads === undefined || reads.kind !== ts.SyntaxKind.TrueKeyword) {
      fail(
        'R2',
        `${where(file, node)}: the row does not declare reads: true. Phase 313 has ZERO write routes, and a row that does not say it is a read is one nobody can check.`
      );
    }
    if (method === undefined || !ts.isStringLiteral(method)) {
      fail('R2', `${where(file, node)}: a row declares no method as a literal`);
    } else if (method.text !== 'GET' && !isPair) {
      fail(
        'R2',
        `${where(file, node)}: the method is ${JSON.stringify(method.text)} on ${JSON.stringify(path === undefined ? '?' : path.text)}. ` +
          'The only non-GET row this door has is the pairing route.'
      );
    }
    if (isPair) {
      if (windowOnly === undefined || windowOnly.kind !== ts.SyntaxKind.TrueKeyword) {
        fail('R2', `${where(file, node)}: the pairing row is not windowOnly: true, so /pair is a route for the door's whole life`);
      }
      if (signed === undefined || signed.kind !== ts.SyntaxKind.FalseKeyword) {
        fail('R2', `${where(file, node)}: the pairing row does not declare signed: false, and a phone that has not paired has no key to sign with`);
      }
    } else {
      if (signed === undefined || signed.kind !== ts.SyntaxKind.TrueKeyword) {
        fail(
          'R2',
          `${where(file, node)}: ${JSON.stringify(path === undefined ? '?' : path.text)} is not signed: true. Every route but the pairing one is signed, and there is no bearer to fall back on.`
        );
      }
      if (windowOnly !== undefined && windowOnly.kind === ts.SyntaxKind.TrueKeyword) {
        fail('R2', `${where(file, node)}: a read route is windowOnly, which would make the door answer nothing once the window shuts`);
      }
    }
  }
  checked('R2');
  const pairRows = rows.filter(
    ({ row: r }) => r['path'] !== undefined && ts.isStringLiteral(r['path']) && r['path'].text === '/pair'
  );
  if (pairRows.length > 1) {
    fail('R2', `the table holds ${String(pairRows.length)} pairing rows; there is one window and one route into it`);
  }

  // No pattern dispatch anywhere in the module: the lookup is an exact match.
  const text = codeTextOf(file);
  for (const [needle, why] of [
    ['startsWith(', 'a prefix match admits every path under it'],
    ['RegExp(', 'a pattern is not a closed table'],
    ['.test(', 'a pattern is not a closed table'],
    ['default:', 'a default arm is the wildcard a closed table exists to refuse']
  ]) {
    checked('R1');
    if (text.includes(needle)) {
      fail('R1', `${rel(file)} holds ${JSON.stringify(needle)}: ${why}.`);
    }
  }
}

// ---------------------------------------------------------------------------
// R4 — the table's MEMBERSHIP, pinned
// ---------------------------------------------------------------------------

/**
 * The exact set of routes, by sha256 of its sorted `METHOD path` lines.
 *
 * WHY A PIN AND NOT ANOTHER SHAPE RULE. R1 pins the table's SHAPE — frozen,
 * exact strings, no wildcard — and R2 pins each row's FIELDS. Neither says
 * which paths exist, and the fix round measured what that costs: a fourth GET
 * added to the table under an existing route id left `conformance:pocket`,
 * `conformance:pocket:hostile` AND `gate:contract` all green, because
 * `pocketRouteIdsAgree()` compares only the id SET. "The route table is closed"
 * is a promise about WHICH PATHS EXIST, so the set of them is what has to be
 * pinned.
 *
 * Moving a route is then a two-line edit — the table and this constant — in one
 * commit, which is the point. `node build/conformance-pocket.mjs
 * --write-route-pin` rewrites the constant below on purpose, the way
 * `conformance:arch --write-skeleton-pin` regenerates its drafted bytes.
 */
const ROUTE_PIN = 'ad9ce8210eeed186d5c2458c3d3e06176171004e9b4fc75a36da5d793f94d080';

/** The `METHOD path` line of every row of POCKET_ROUTES, sorted. */
function routeLines(file) {
  const lines = [];
  for (const node of nodesOf(file)) {
    if (!ts.isVariableDeclaration(node)) continue;
    if (!ts.isIdentifier(node.name) || node.name.text !== 'POCKET_ROUTES') continue;
    let init = node.initializer ?? null;
    if (init !== null && ts.isCallExpression(init) && calleeName(init) === 'freeze') {
      init = init.arguments[0] ?? null;
    }
    if (init === null || !ts.isArrayLiteralExpression(init)) return null;
    for (const element of init.elements) {
      if (!ts.isObjectLiteralExpression(element)) return null;
      let method = null;
      let path = null;
      for (const prop of element.properties) {
        if (!ts.isPropertyAssignment(prop) || !ts.isIdentifier(prop.name)) continue;
        if (prop.name.text === 'method' && ts.isStringLiteral(prop.initializer)) {
          method = prop.initializer.text;
        }
        if (prop.name.text === 'path' && ts.isStringLiteral(prop.initializer)) {
          path = prop.initializer.text;
        }
      }
      if (method === null || path === null) return null;
      lines.push(`${method} ${path}`);
    }
    return lines.sort();
  }
  return null;
}

function routeMembershipRule() {
  const routes = moduleNamed('routes', 'R4', "Builder B's");
  if (routes === null) return;
  const lines = routeLines(routes);
  checked('R4');
  if (lines === null) {
    fail('R4', `${rel(routes)}: POCKET_ROUTES could not be read as a list of literal method/path rows, so its membership cannot be pinned`);
    return;
  }
  checked('R4');
  if (lines.length === 0) {
    fail('R4', `${rel(routes)}: POCKET_ROUTES is empty`);
    return;
  }
  const got = createHash('sha256').update(lines.join('\n')).digest('hex');
  if (process.argv.includes('--write-route-pin')) {
    const self = fileURLToPath(import.meta.url);
    const text = readFileSync(self, 'utf8');
    writeFileSync(self, text.replace(`const ROUTE_PIN = '${ROUTE_PIN}'`, `const ROUTE_PIN = '${got}'`));
    process.stdout.write(`${TAG} route pin rewritten: ${got}\n  ${lines.join('\n  ')}\n`);
    process.exit(0);
  }
  checked('R4', lines.length);
  if (got !== ROUTE_PIN) {
    fail(
      'R4',
      `${rel(routes)}: the route table's membership moved. It now holds ${String(lines.length)} route(s):\n` +
        lines.map((l) => `      ${l}`).join('\n') +
        `\n    Its pin is ${got} and this gate holds ${ROUTE_PIN}. ` +
        'A route added, removed or re-pathed is a change to what the phone can ask for, and it is meant to be a visible edit to this gate in the same commit. ' +
        'If the move is deliberate: node build/conformance-pocket.mjs --write-route-pin'
    );
  }
}

// ---------------------------------------------------------------------------
// R5 — the turn limit is clamped at the door
// ---------------------------------------------------------------------------

/**
 * The one route that answers a person's own conversation caps what it asks for.
 *
 * MEASURED IN THE FIX ROUND, which is why this rule exists: the door computed
 * `Math.floor(asked)` for any finite positive number and handed it straight on —
 * `?limit=999999999` answered 999999999 — while the module's own comment said
 * "the store clamps it". The store does not. `listTurns` puts the number into a
 * SQL `LIMIT ?` unchanged and `MAX_TURN_LIMIT` is applied in
 * `src/main/overview/service.ts` and `timeline.ts`, neither of which this door
 * goes through. Nothing else in this phase's proof list would have caught it.
 */
function turnLimitRule() {
  const routes = moduleNamed('routes', 'R5', "Builder B's");
  if (routes === null) return;
  let imported = false;
  for (const node of nodesOf(routes)) {
    if (!ts.isImportDeclaration(node)) continue;
    if (!ts.isStringLiteral(node.moduleSpecifier)) continue;
    if (!/overview\/turn-view$/.test(node.moduleSpecifier.text)) continue;
    const clause = node.importClause?.namedBindings;
    if (clause === undefined || !ts.isNamedImports(clause)) continue;
    if (clause.elements.some((e) => e.name.text === 'MAX_TURN_LIMIT')) imported = true;
  }
  checked('R5');
  if (!imported) {
    fail(
      'R5',
      `${rel(routes)} does not import MAX_TURN_LIMIT from ../overview/turn-view. ` +
        'The ceiling belongs to the module that owns it; a second literal here is a second answer to the same question, and the one that drifts is the one on the network.'
    );
  }
  let clamped = 0;
  for (const call of callsOf(routes)) {
    if (calleeName(call) !== 'min') continue;
    const e = call.expression;
    if (!ts.isPropertyAccessExpression(e) || !ts.isIdentifier(e.expression) || e.expression.text !== 'Math') continue;
    if (call.arguments.some((a) => ts.isIdentifier(a) && a.text === 'MAX_TURN_LIMIT')) clamped += 1;
  }
  checked('R5');
  if (clamped === 0) {
    fail(
      'R5',
      `${rel(routes)} never calls Math.min(..., MAX_TURN_LIMIT). A limit taken from a query and passed on unclamped lets one request read a whole session into memory, ` +
        'and "one wide range cannot read a whole session into memory" is the protection this phase claims on the one route that answers a person’s own words.'
    );
  }
  // And the number is not re-spelled: no literal 200 in the module.
  checked('R5');
  for (const node of nodesOf(routes)) {
    if (!ts.isNumericLiteral(node)) continue;
    if (node.text !== '200') continue;
    fail('R5', `${where(routes, node)}: the literal 200 is the ceiling written a second time. Import MAX_TURN_LIMIT instead.`);
  }
}

// ---------------------------------------------------------------------------
// S4 — the self-origin comparison points the right way
// ---------------------------------------------------------------------------

/**
 * S2 reads WHERE the destroy is. This reads WHICH WAY THE COMPARISON POINTS.
 *
 * The fix round inverted `isSelfOrigin`'s one `===` to `!==` in the shipping
 * source and both `conformance:pocket` and `conformance:pocket:hostile` stayed
 * green, while a live door then ADMITTED the local socket — the drive went from
 * ECONNRESET to a 404 with the whole handler run. A refusal whose direction no
 * gate reads is a refusal a one-character edit removes.
 */
function selfOriginDirectionRule() {
  const bind = moduleNamed('bind', 'S4', "Builder A's");
  if (bind === null) return;
  const sf = astOf(bind);
  let fn = null;
  for (const node of nodesOf(bind)) {
    if (ts.isFunctionDeclaration(node) && node.name?.text === 'isSelfOrigin') fn = node;
  }
  checked('S4');
  if (fn === null || fn.body === undefined) {
    fail('S4', `${rel(bind)} declares no isSelfOrigin function, so nothing here reads which way its comparison points`);
    return;
  }
  const returns = [];
  const walk = (n) => {
    if (ts.isReturnStatement(n)) returns.push(n);
    ts.forEachChild(n, walk);
  };
  walk(fn.body);
  checked('S4');
  if (returns.length < 2) {
    fail(
      'S4',
      `${where(bind, fn)}: isSelfOrigin has ${String(returns.length)} return statement(s). It needs two: the fail-closed guard for a source it could not read, and the equality.`
    );
    return;
  }
  // The guard fails CLOSED: an unknown source is treated as this machine.
  checked('S4');
  const guard = returns[0];
  if (guard.expression === undefined || guard.expression.kind !== ts.SyntaxKind.TrueKeyword) {
    fail(
      'S4',
      `${where(bind, guard)}: isSelfOrigin's first return is not \`true\`. A source address the door could not read must be treated as this machine, never as a stranger, or an unreadable socket is admitted.`
    );
  }
  // The answer is an EQUALITY. `!==` here admits every local process and
  // refuses every phone, and it is one character.
  checked('S4');
  const last = returns[returns.length - 1];
  const expr = last.expression;
  const isEquality =
    expr !== undefined &&
    ts.isBinaryExpression(expr) &&
    expr.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken;
  if (!isEquality) {
    fail(
      'S4',
      `${where(bind, last)}: isSelfOrigin's answer is not a \`===\` comparison. It answers "is this request from this machine", so an inverted or negated comparison admits every local process and refuses every phone — with every other rule in this gate still green.`
    );
  }
  checked('S4');
  if (/!==/.test(fn.getText(sf))) {
    fail('S4', `${where(bind, fn)}: isSelfOrigin holds a \`!==\`. The only comparison in it is the equality that decides the refusal, and it is not written inverted.`);
  }
}

// ---------------------------------------------------------------------------
// W1 — nothing this domain creates is wider than its owner
// ---------------------------------------------------------------------------

/**
 * Every write and every mkdir in the domain names a mode.
 *
 * THE ASYMMETRY IS THE DEFECT, not the bytes. `tls.ts` wrote its sealed
 * identity at `0o600` and `pairing.ts` wrote the sealed phone store beside it
 * with no mode at all — measured at `0o644` under the operator's umask, with
 * the directory at `0755`. Both payloads are safeStorage ciphertext behind the
 * login keychain's ACL, so under his own uid the mode changes nothing today;
 * what it changes is tomorrow, when one unexplained looser write in a domain is
 * the precedent the next write copies. Dropping `mode: 0o600` from `tls.ts` left
 * both gates green, which is the reason this rule is here rather than in a
 * comment.
 */
const MODE_CALLS = new Set(['writeFileSync', 'appendFileSync', 'mkdirSync', 'createWriteStream', 'openSync']);

function fileModeRule() {
  if (domainFiles.length === 0) {
    fail('W1', 'src/main/pocket/ holds no source file at all');
    return;
  }
  let seen = 0;
  for (const file of domainFiles) {
    for (const call of callsOf(file)) {
      const name = calleeName(call);
      if (name === null || !MODE_CALLS.has(name)) continue;
      seen += 1;
      checked('W1');
      const options = call.arguments.find((a) => ts.isObjectLiteralExpression(a));
      const mode =
        options === undefined
          ? undefined
          : options.properties.find(
              (p) => ts.isPropertyAssignment(p) && ts.isIdentifier(p.name) && p.name.text === 'mode'
            );
      if (mode === undefined) {
        fail(
          'W1',
          `${where(file, call)}: ${name}(...) names no mode. Every file and directory this door creates holds key material or a person’s agreement, and one write in the domain that is looser than its sibling is the one a later round copies.`
        );
        continue;
      }
      const value = mode.initializer;
      checked('W1');
      const octal = ts.isNumericLiteral(value) ? value.getText(astOf(file)) : '';
      if (!/^0o[0-7]{3}$/.test(octal)) {
        fail('W1', `${where(file, call)}: ${name}(...) declares a mode that is not an octal literal (${JSON.stringify(value.getText(astOf(file)))}).`);
        continue;
      }
      const digits = octal.slice(2);
      if (digits[1] !== '0' || digits[2] !== '0') {
        fail(
          'W1',
          `${where(file, call)}: ${name}(...) declares mode ${octal}, which grants the group or the world. Everything under this door's directory is owner-only.`
        );
      }
    }
  }
  checked('W1');
  if (seen === 0) {
    fail(
      'W1',
      'no write or mkdir was found anywhere in src/main/pocket/. This door seals an identity and a phone store to disk, so a rule that reads nothing has stopped reading rather than found nothing to read.'
    );
  }
}

// ---------------------------------------------------------------------------
// B1 — the bridge and the registrar move together
// ---------------------------------------------------------------------------

/**
 * `window.gmux.pocket` exists exactly when main serves the `pocket:*` channels.
 *
 * THIS RULE IS THE JUDGE'S, and it is the one thing the round did that was
 * measurably worse than the build before it: the preload installed a `pocket`
 * member carrying nine methods while `registerPocketIpc` was called from
 * nowhere, so all eight invokes rejected in the running app with "No handler
 * registered for pocket:status". The existing ipc-invoke-closure check cannot
 * see that, because it counts `handle(` calls inside a function nobody calls.
 *
 * It is asserted in BOTH directions, so neither half of the wiring round can
 * land on its own, and it reads three files: the preload's assembly, the shared
 * contract's `InstalledGmuxApi` (which is what MAKES the member compulsory) and
 * every call site under src/main/.
 */
function bridgeRule() {
  const preload = join(ROOT, 'src', 'preload', 'index.ts');
  const shared = join(ROOT, 'src', 'shared', 'ipc', 'index.ts');
  const ipcModule = join(DOMAIN, 'ipc.ts');
  checked('B1');
  if (!existsSync(preload) || !existsSync(shared)) {
    fail('B1', 'src/preload/index.ts or src/shared/ipc/index.ts is missing, so this rule read nothing');
    return;
  }

  // 1. Does the bridge INSTALL the member? An import of './pocket' in the
  //    assembly, or a `pocket` key in an object literal there.
  let installs = false;
  for (const node of nodesOf(preload)) {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier) && node.moduleSpecifier.text === './pocket') {
      installs = true;
    }
    if ((ts.isShorthandPropertyAssignment(node) || ts.isPropertyAssignment(node)) && ts.isIdentifier(node.name) && node.name.text === 'pocket') {
      installs = true;
    }
  }

  // 2. Does the shared contract make it COMPULSORY?
  const declared = /GmuxPocketExtras/.test(codeTextOf(shared));

  // 3. Does anything under src/main/ CALL the registrar, other than the module
  //    that declares it?
  const mainDir = join(ROOT, 'src', 'main');
  let registered = 0;
  const walk = (d) => {
    for (const name of readdirSync(d)) {
      const path = join(d, name);
      if (statSync(path).isDirectory()) {
        if (name !== '__tests__' && name !== 'node_modules') walk(path);
        continue;
      }
      if (!/\.tsx?$/.test(name) || /\.test\.tsx?$/.test(name)) continue;
      if (path === ipcModule) continue;
      if (/\bregisterPocketIpc\s*\(/.test(codeTextOf(path))) registered += 1;
    }
  };
  if (existsSync(mainDir)) walk(mainDir);

  checked('B1', 3);
  if (installs && registered === 0) {
    fail(
      'B1',
      'src/preload/index.ts installs a `pocket` member on window.gmux and nothing under src/main/ calls registerPocketIpc. ' +
        'Every invoke on that member rejects at run time with "No handler registered", which is a bridge advertising a surface that throws — strictly worse than not having it. ' +
        'The member and the registration land in one commit.'
    );
  }
  if (!installs && registered > 0) {
    fail(
      'B1',
      `${String(registered)} file(s) under src/main/ call registerPocketIpc and src/preload/index.ts installs no \`pocket\` member. ` +
        'Handlers nothing can reach are the same drift the other way round.'
    );
  }
  if (installs !== declared) {
    fail(
      'B1',
      `src/preload/index.ts ${installs ? 'installs' : 'does not install'} the pocket member while src/shared/ipc/index.ts ${declared ? 'names' : 'does not name'} GmuxPocketExtras. ` +
        'The annotation on the preload’s `api` const is what makes the member compulsory, so the two lines move together or the type is describing a bridge that is not there.'
    );
  }
}

/** The words a read-only door may not name, and why each one is here. */
const FORBIDDEN = [
  ['killSession', 'a write verb'],
  ['removeSession', 'a write verb'],
  ['restartSession', 'a write verb'],
  ['resumeInPlace', 'a write verb'],
  ['createSession', 'a write verb, and refusal 8: nothing may start a process'],
  ['renameSession', 'a write verb'],
  ['restoreSession', 'a write verb'],
  ['noteHookEvent', 'a status setter, and CLAUDE.md refusal 5'],
  ['noteUserInput', 'a status setter, and CLAUDE.md refusal 5'],
  ['applyDetectedStatus', 'a status setter, and CLAUDE.md refusal 5'],
  ['sendInput', 'attach bytes, which a phone can never be the sender of'],
  ['send-keys', 'typing into a pane, which is not in this phase'],
  ['spawn', 'refusal 8: nothing may start a process'],
  ['execFile', 'refusal 8: nothing may start a process'],
  // BOTH SPELLINGS. `build/assert-import-boundaries.mjs`'s wall row matches on
  // the src-relative path, so it catches either; a text rule that named only
  // the absolute-looking form would miss `../credentials/vault`, which is how
  // the import would actually be written from inside this domain.
  ['main/credentials/', 'the credential wall'],
  ['main/logins/', 'the credential wall'],
  ['../credentials/', 'the credential wall, written the way a sibling import is'],
  ['../logins/', 'the credential wall, written the way a sibling import is'],
  ['@shared/logins', 'the credential wall: the login vocabulary is not this door\u2019s'],
  ['safeStorage', 'a credential read; the seal is reached through config/seal.ts alone'],
  // PHASE 314. The door speaks to a phone and nothing else, and cannot name the
  // sender that speaks to Apple. The push reads the door's CONFIRMED fields
  // through a narrow host method; the door never reaches the other way.
  ['main/push/', 'the push sender: the door speaks to a phone and nothing else'],
  ['../push/', 'the push sender, written the way a sibling import is'],
  ['node:http2', 'the client Apple is reached with; this door opens no connection outward'],
  ['push.apple.com', 'Apple\u2019s host, which only the sender in main/push/ may spell']
];

function forbiddenRules() {
  if (domainFiles.length === 0) {
    fail('R3', 'src/main/pocket/ holds no source file at all');
    return;
  }
  for (const file of domainFiles) {
    const text = codeTextOf(file);
    for (const [word, why] of FORBIDDEN) {
      checked('R3');
      if (text.includes(word)) {
        fail(
          'R3',
          `${rel(file)} names ${JSON.stringify(word)} in its CODE, which is ${why}. ` +
            'A door that only answers may not spell it, comments excepted.'
        );
      }
    }
  }
}

// ---------------------------------------------------------------------------
// A — what proves who is asking, and what never travels
// ---------------------------------------------------------------------------

function admissionRules() {
  if (domainFiles.length === 0) {
    for (const id of ['A1', 'A2', 'A3']) fail(id, 'src/main/pocket/ holds no source file at all');
    return;
  }
  for (const file of domainFiles) {
    const text = codeTextOf(file).toLowerCase();
    for (const [needle, why] of [
      ['authorization', 'research 127 §10 forbids a bearer outright'],
      ['bearer', 'research 127 §10 forbids a bearer outright'],
      ['set-cookie', 'the door sets no cookie'],
      ['cookie', 'the door reads and sets no cookie']
    ]) {
      checked('A1');
      if (text.includes(needle)) {
        fail(
          'A1',
          `${rel(file)} names ${JSON.stringify(needle)} in its CODE. ${why}: a credential a request carries whole is captured by whoever holds the port next.`
        );
      }
    }
  }

  // A2. Nothing secret in a URL. A route path that interpolates, or a matcher
  // that pulls a long hex run out of a path, is the shape research 127 §7
  // measured leaking through a referrer and a log.
  for (const file of domainFiles) {
    for (const node of nodesOf(file)) {
      if (!ts.isTemplateExpression(node)) continue;
      const head = node.head.text;
      if (!head.startsWith('/')) continue;
      // A VALUE IN THE QUERY IS THE DESIGN. The table is a set of exact paths
      // BECAUSE every value rides in the query, so `/v1/session?id=${…}` is the
      // shape this phase chose and `/v1/session/${…}` is the shape it refuses.
      if (head.includes('?')) continue;
      checked('A2');
      fail(
        'A2',
        `${where(file, node)} builds a path by interpolation (${JSON.stringify(`${head}\${…}`)}). ` +
          'Every route path is an exact string and every value rides in the query, so nothing secret can be in a path by construction.'
      );
    }
    // A TOKEN MATCHER IS A REGEX LITERAL, NOT A STRING, and the first draft of
    // this rule read only strings — so `const TOKEN_PATH = /^\/h\/([0-9a-f]{32})$/`
    // was invisible to it and the ablation that plants exactly that shape left
    // this rule green. Both kinds are read now.
    const tokenish = [
      ...codeStringsOf(file),
      ...nodesOf(file)
        .filter((n) => n.kind === ts.SyntaxKind.RegularExpressionLiteral)
        .map((n) => ({ node: n, text: n.getText(astOf(file)) }))
    ];
    for (const { node, text } of tokenish) {
      checked('A2');
      if (/\/h\/|\/u\//.test(text) && /[0-9a-f]/i.test(text) && /\{(?:16|32|64)\}/.test(text)) {
        fail(
          'A2',
          `${where(file, node)} matches the hook server's token-in-the-path shape (${JSON.stringify(text.slice(0, 60))}). ` +
            'That is the one design this door replaced: a URL-borne secret leaves by Referer the first time a client follows an outbound link, and a signature in a URL cannot be taken back once it has been sent somewhere else.'
        );
        continue;
      }
      if (/\[0-9a-f\]\{(?:16|32|64)\}/.test(text) || /\[a-f0-9\]\{(?:16|32|64)\}/.test(text)) {
        fail(
          'A2',
          `${where(file, node)} matches a long hex run out of a URL (${JSON.stringify(text)}), which is the hook server's token-in-the-path shape. This door has no token in any URL.`
        );
      }
    }
  }

  // A3. The window gate comes first, WHEREVER THE DISPATCH IS.
  //
  // The rule does not name a module, because the route table and the thing that
  // answers a request are two files and either could hold the branch. It finds
  // the dispatch by its one identifying call — whatever asks the table for a
  // row — and reads the ORDER inside it. The first draft asked `pairing.ts` for
  // the literal `/pair`, which that module has no reason to hold: the path is in
  // the table and the window predicate is what pairing owns.
  const dispatchers = domainFiles.filter((f) => codeTextOf(f).includes('matchPocketRoute('));
  checked('A3');
  if (dispatchers.length === 0) {
    fail(
      'A3',
      'no module in the domain asks the route table for a row, so nothing dispatches and the window gate cannot be placed at all'
    );
  }
  for (const file of dispatchers) {
    const text = codeTextOf(file);
    checked('A3', 2);
    const windowAt = text.search(/windowOnly/);
    if (windowAt === -1) {
      fail(
        'A3',
        `${rel(file)} dispatches but never reads a route's windowOnly flag, so the pairing route is live for the door's whole life`
      );
      continue;
    }
    // Everything that touches the request's PAYLOAD must come after it. A dead
    // route reads nothing, because reading is what an attacker measures.
    for (const [pattern, what] of [
      [/readBody\(/, 'the body is read'],
      [/\.on\(\s*'data'/, "the request's data event is subscribed"],
      [/JSON\.parse\(/, 'a body is parsed']
    ]) {
      const at = text.search(pattern);
      if (at !== -1 && at < windowAt) {
        fail(
          'A3',
          `${rel(file)}: ${what} at offset ${String(at)}, BEFORE the windowOnly test at ${String(windowAt)}. Outside its window /pair is not a route and reads nothing.`
        );
      }
    }
  }

  // And the window's own owner must be able to shut, and must destroy the
  // secret when it does: a window that only expires leaves the one-shot secret
  // in memory for a photographed screen to be worth something.
  const pairing = moduleNamed('pairing', 'A3', "Builder B's");
  if (pairing === null) return;
  const text = codeTextOf(pairing);
  checked('A3', 2);
  if (!/windowOpen|windowIsOpen|isWindowOpen/.test(text)) {
    fail('A3', `${rel(pairing)} exports no predicate saying whether the window is open, so the dispatch has nothing to ask`);
  }
  if (!/POCKET_PAIRING_WINDOW_MS|WINDOW_MS|windowMs/.test(text)) {
    fail('A3', `${rel(pairing)} names no window length, so the window is unbounded`);
  }
}

// ---------------------------------------------------------------------------
// S — the shape of every answer, and the shutdown
// ---------------------------------------------------------------------------

function serverRules() {
  if (domainFiles.length === 0) {
    for (const id of ['S1', 'S2', 'S3', 'G1']) fail(id, 'src/main/pocket/ holds no source file at all');
    return;
  }

  // S1. One place emits it.
  const sites = [];
  for (const file of domainFiles) {
    for (const { node, text } of codeStringsOf(file)) {
      if (text.toLowerCase() === 'referrer-policy') sites.push({ file, node });
    }
  }
  checked('S1', sites.length + 1);
  if (sites.length === 0) {
    fail(
      'S1',
      'no module in the domain emits Referrer-Policy. A header emitted nowhere is a header the one route that forgot it does not send, and every answer this door writes goes through one function so that it cannot be forgotten.'
    );
  } else if (sites.length > 1) {
    fail(
      'S1',
      `${String(sites.length)} places emit Referrer-Policy (${sites.map((s) => where(s.file, s.node)).join(', ')}). ` +
        'One header, one place: two is how a route gets added without one.'
    );
  }
  const values = [];
  for (const file of domainFiles) {
    for (const { text } of codeStringsOf(file)) {
      if (text === 'no-referrer') values.push(text);
    }
  }
  checked('S1');
  if (sites.length > 0 && values.length === 0) {
    fail('S1', 'Referrer-Policy is emitted but its value is not the literal no-referrer');
  }

  // S2. The self-origin refusal is on the CONNECTION, not on the request: a
  // request handler has already read a header by the time it runs.
  const bind = moduleNamed('bind', 'S2', "Builder A's");
  if (bind !== null) {
    // THE RULE IS THAT THE CALL IS INSIDE THE CONNECTION LISTENER, and the
    // first draft asked only whether the file NAMED `isSelfOrigin`. Replacing
    // the whole condition with `if (false)` left the import, the declaration
    // and the export in place and the gate green — the ablation found it,
    // which is what an ablation is for.
    const sf = astOf(bind);
    let listeners = 0;
    let calledInside = 0;
    let destroyedOnSelf = 0;
    // A `destroy()` call reached from `node`, found as a CALL so a comment
    // naming one satisfies nothing.
    const destroysIn = (node) => {
      let found = false;
      const walk = (n) => {
        if (
          ts.isCallExpression(n) &&
          ts.isPropertyAccessExpression(n.expression) &&
          n.expression.name.text === 'destroy'
        ) {
          found = true;
        }
        if (!found) ts.forEachChild(n, walk);
      };
      walk(node);
      return found;
    };
    for (const call of callsOf(bind)) {
      if (calleeName(call) !== 'on') continue;
      const event = call.arguments[0];
      if (event === undefined || !ts.isStringLiteral(event)) continue;
      if (event.text !== 'connection') continue;
      listeners += 1;
      const handler = call.arguments[1];
      if (handler === undefined) continue;
      // The CALL, not the word: an `isSelfOrigin` that is imported and never
      // asked is a refusal that never happens.
      if (/\bisSelfOrigin\s*\(/.test(handler.getText(sf))) calledInside += 1;
      // And the answer to it must be the destroy. This asked the whole FILE
      // for a `socket.destroy()` until the Phase 313 checker read it: the
      // shutdown arm and the clientError listener both destroy a socket, so a
      // self-origin branch that no longer did anything left this rule green.
      const walkIfs = (n) => {
        if (
          ts.isIfStatement(n) &&
          /\bisSelfOrigin\s*\(/.test(n.expression.getText(sf)) &&
          destroysIn(n.thenStatement)
        ) {
          destroyedOnSelf += 1;
        }
        ts.forEachChild(n, walkIfs);
      };
      walkIfs(handler);
    }
    checked('S2', 3);
    if (listeners === 0) {
      fail(
        'S2',
        `${rel(bind)} subscribes to no 'connection' event. A request handler has already parsed a request line and a header block by the time it runs, and "before any header is read" is the promise.`
      );
    }
    if (calledInside === 0) {
      fail(
        'S2',
        `${rel(bind)} never CALLS isSelfOrigin inside a 'connection' listener. A same-uid process on this Mac reaching the door through its own tailnet address is a program borrowing the phone's reach, and the socket is destroyed before a header is read for exactly that reason.`
      );
    }
    if (destroyedOnSelf === 0) {
      fail(
        'S2',
        `${rel(bind)} asks isSelfOrigin inside a 'connection' listener and does not destroy the socket when it answers yes, so nothing is refused before a header is read`
      );
    }
  }

  // S3. The stop closes admission on its FIRST line, before any await.
  if (bind !== null) {
    let stops = 0;
    for (const node of nodesOf(bind)) {
      // EVERY METHOD THAT CLOSES ADMISSION, not only one called `stop`. This
      // door splits the shutdown in two — `beginShutdown()` sets the flag and
      // `stop()` joins — and a rule that read only `stop` left the method that
      // actually owns the flag unguarded: an `await` planted in front of it
      // reddened nothing.
      const isShutdown =
        (ts.isMethodDeclaration(node) || ts.isFunctionDeclaration(node)) &&
        node.name !== undefined &&
        ts.isIdentifier(node.name) &&
        node.body !== undefined &&
        /(?:shuttingDown|shutdown|admission)\s*=\s*true/i.test(node.body.getText(astOf(bind)));
      if (!isShutdown || node.body === undefined) continue;
      stops += 1;
      checked('S3', 2);
      // THE PROMISE IS "BEFORE ANY AWAIT", not "on line one". `hooks.ts:256`'s
      // own wording is the first line, but what makes it a resource owner is
      // that nothing which could yield, and nothing which touches the listener
      // or an accepted request, happens before admission closes. A clock read
      // is neither, and the first draft of this rule failed `bind.ts` on a
      // `Date.now()` that starts the stop's own timer.
      const statements = node.body.statements;
      const sf = astOf(bind);
      const closesAt = statements.findIndex((s) =>
        /(?:shuttingDown|shutdown|admission)\s*=\s*true/i.test(s.getText(sf))
      );
      if (closesAt === -1) {
        fail(
          'S3',
          `${where(bind, node)}: stop() never closes admission. From the instant a stop begins no request may be admitted, and a stop that only closes a socket is a socket somebody closed rather than a resource owner.`
        );
      } else {
        for (let i = 0; i < closesAt; i += 1) {
          const text = statements[i].getText(sf);
          if (/\bawait\b|this\.server|this\.inFlight|\breq\b|\bsocket\b/.test(text)) {
            fail(
              'S3',
              `${where(bind, statements[i])}: ${JSON.stringify(text.slice(0, 80))} runs BEFORE admission closes. ` +
                'Anything that can yield, or that reads the listener or an accepted request, before that line is work the shutdown did not stop.'
            );
          }
        }
      }
      const body = node.body.getText(astOf(bind));
      // Only the JOINER has to close the listener; the method that merely
      // closes admission is allowed to start nothing, which is the whole
      // reason this door split the two.
      const joins = /\bawait\b/.test(body);
      if (joins && !body.includes('close(')) {
        fail('S3', `${where(bind, node)}: the shutdown joins but never closes the listener, so a stopped door is still bound`);
      }
    }
    checked('S3');
    if (stops === 0) {
      fail('S3', `${rel(bind)} declares no stop(), so nothing in the ordered disposer owns the listener`);
    }
  }

  // G1. Nothing that could be a secret, a body or a line of conversation is an
  // argument to a log call.
  //
  // THE TWO PRECISIONS ARE THE RULE. A CONSTANT STRING is never a value that
  // came off the wire — a refusal sentence is a reason and the log's whole job
  // is to carry one — so a literal argument is skipped, and the first draft of
  // this rule failed `pairing.ts`'s honest sentence about the OS keystore on
  // the letters `key` inside the word. And the words are matched at WORD
  // BOUNDARIES for the same reason: `keyId` names a key and is not one.
  // PHASE 314 widened it by six: a device token, the provider key's PEM, the
  // JWT signed with it and the bearer it travels as, and the pairing
  // presentation's own key for the token, `apt`.
  const LOGGABLE_POISON =
    /\b(?:tokens?|secrets?|keys?|signatures?|nonces?|body|payload|question|answer|prompt|transcript|contents|authorization|jwt|bearer|pem|apt|pushToken|deviceToken)\b/i;
  for (const file of domainFiles) {
    for (const call of callsOf(file)) {
      const name = calleeName(call);
      if (name === null || !/^(?:debug|info|warn|error|log)$/.test(name)) continue;
      for (const arg of call.arguments) {
        checked('G1');
        if (ts.isStringLiteral(arg) || ts.isNoSubstitutionTemplateLiteral(arg)) continue;
        if (ts.isBinaryExpression(arg) && ts.isStringLiteral(arg.left) && ts.isStringLiteral(arg.right)) {
          continue;
        }
        const text = arg.getText(astOf(file));
        // A joined pair of literals, which is how a long sentence is written.
        if (/^(?:'[^']*'|"[^"]*")(?:\s*\+\s*(?:'[^']*'|"[^"]*"))*$/s.test(text.trim())) continue;
        const hit = LOGGABLE_POISON.exec(text);
        if (hit !== null) {
          fail(
            'G1',
            `${where(file, call)} hands ${JSON.stringify(text.slice(0, 80))} to ${name}(), which names ${JSON.stringify(hit[0])}. ` +
              'The log takes a reason and never a value: 500 anonymous posts wrote 500 lines in 47 ms on the hook route, and app.log holds 2 MiB with one archive.'
          );
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// T — nothing binds a real interface
// ---------------------------------------------------------------------------

/**
 * A host that is not loopback, anywhere a pocket file names one.
 *
 * THE RULE IS ABOUT A HOST AND NOT ABOUT A DOTTED QUAD, and the first draft of
 * it was the other thing: it read every four-octet run in the text and failed
 * `tls.ts` on the OIDs `2.5.29.17` and `1.3.6.1.5.5.7.3.1`, which are X.509
 * extension identifiers and not addresses, and failed this gate on its own
 * refusal sentences. So a literal is judged by WHERE IT IS: an argument to
 * `listen`, `connect`, `createConnection` or `request`, or the value of a
 * property or variable called host, hostname, address or bind. Everything else
 * — a certificate's subject alternative name, a documented range, a sentence —
 * is a value and not a bind.
 */
function loopbackRule() {
  const LOOPBACK = new Set(['127.0.0.1', '::1', 'localhost', '::ffff:127.0.0.1']);
  // `host` and `hostname` only. `address` and `bindAddress` are DATA FIELDS —
  // an interface row, a confirm field, a phone's recorded address — and reading
  // them as bind targets failed seven fixtures that bind nothing. What actually
  // binds is a call, and that is caught below.
  const HOST_NAMES = /^(?:host|hostname)$/i;
  const HOST_CALLS = new Set(['listen', 'connect', 'createConnection', 'request', 'get']);
  const IPV4 = /^(?:\d{1,3}\.){3}\d{1,3}$/;
  const roots = [join(ROOT, 'build'), join(ROOT, 'src', 'main', 'pocket')];
  const seen = [];
  for (const root of roots) {
    if (!existsSync(root)) continue;
    const walk = (d) => {
      for (const name of readdirSync(d)) {
        const path = join(d, name);
        if (statSync(path).isDirectory()) {
          if (name !== 'node_modules' && name !== 'vendor') walk(path);
          continue;
        }
        if (!/\.(?:mjs|mts|ts)$/.test(name)) continue;
        // THE PATH, NOT THE BASENAME. `build/p313/hostile-client.mts` names
        // neither word in its file name and was skipped by the first draft, so
        // the one check that actually dials the door sat outside this rule —
        // the ablation found it by pointing that client at a real address and
        // watching this gate stay green.
        // The REPOSITORY-RELATIVE path, because the absolute one holds the
        // worktree's own name and a worktree called `wt-p313` made this rule
        // read all 1,346 production files and fail on a fixture's example URL.
        if (!/pocket|p313/i.test(rel(path))) continue;
        seen.push(path);
      }
    };
    walk(root);
  }
  checked('T1');
  if (seen.length === 0) {
    fail('T1', 'no pocket file was found under build/ or src/main/pocket/, so this rule read nothing');
    return;
  }
  /**
   * Is this string literal in a position that decides what a socket binds?
   *
   * A `{ host, port }` pair is a bind target. An `{ address, family, netmask,
   * internal }` row is what `os.networkInterfaces()` ANSWERS, and a fixture of
   * those is what every unit test of the chooser is made of — that is a value
   * being judged, not an address being dialled, and the first draft of this
   * rule failed six of them.
   */
  const isHostPosition = (node) => {
    const parent = node.parent;
    if (parent === undefined) return false;
    if (ts.isPropertyAssignment(parent) && ts.isIdentifier(parent.name)) {
      return HOST_NAMES.test(parent.name.text);
    }
    if (ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) {
      return HOST_NAMES.test(parent.name.text);
    }
    if (ts.isCallExpression(parent)) {
      const name = calleeName(parent);
      return name !== null && HOST_CALLS.has(name) && parent.arguments.includes(node);
    }
    return false;
  };
  for (const path of seen) {
    for (const { node, text } of codeStringsOf(path)) {
      // An ADDRESS, not any string with a colon in it. A URL is not a bind
      // host, and reading one as a host failed a fixture's `https://api.example`.
      if (!IPV4.test(text) && text !== 'localhost' && !/^(?:\[?[0-9a-f:]+\]?)$/i.test(text)) continue;
      checked('T1');
      if (LOOPBACK.has(text)) continue;
      if (!isHostPosition(node)) continue;
      fail(
        'T1',
        `${where(path, node)} hands ${JSON.stringify(text)} to something that binds or dials. ` +
          'Every test and every gate drives the door on 127.0.0.1, and nothing in this repository may bind a real interface.'
      );
    }
  }
}

function noHtmlRule() {
  // H1. No HTML document, no text/html. His ruling of 2026-09-22 — "lets skip
  // the web app" — made a property of the tree rather than a paragraph in it.
  // P2 and P3 asserted this as a side effect of judging the page's own
  // stylesheet and markup, and they left with the page they judged, so nothing
  // said it any more: a later round could have reintroduced a page with every
  // gate green. Now it cannot.
  for (const file of domainFiles) {
    checked('H1');
    const code = codeTextOf(file);
    if (/<!doctype|<html[\s>]/i.test(code)) {
      fail(
        'H1',
        `${rel(file)} composes an HTML document. The page this phase built could not be ` +
          'reached under mechanism 5 and was removed on his ruling of 2026-09-22; a round ' +
          'that wants one asks him for an admission a browser can satisfy first.'
      );
    }
    if (/text\/html/i.test(code)) {
      fail(
        'H1',
        `${rel(file)} names the text/html content type. Every answer this door writes is ` +
          'application/json, and a page is not this phase to serve.'
      );
    }
  }
}

// ---------------------------------------------------------------------------
// N — the push (Phase 314): no route for it, and one door in for the token
// ---------------------------------------------------------------------------

/**
 * The words a route may not carry. A route that names any of them is the push
 * reaching the door, and Phase 314 refuses that outright: the device token
 * arrives inside the sealed pairing presentation, and nothing about the push is
 * a thing a phone can ASK for.
 */
const PUSH_ROUTE_WORDS = /push|apns|notify|device|token|alert/i;

/**
 * The membership pin Phase 313 landed, spelled a second time on purpose. R4
 * holds the table to `ROUTE_PIN`, which `--write-route-pin` rewrites; this
 * holds it to Phase 313's own value, which nothing rewrites. So a route added
 * for the push has to move BOTH, in the same commit, and says so twice.
 */
const PHASE_313_ROUTE_PIN = 'ad9ce8210eeed186d5c2458c3d3e06176171004e9b4fc75a36da5d793f94d080';

/** Every string element of the `POCKET_ROUTE_IDS` array literal in a file, or null. */
function contractRouteIds(file) {
  for (const node of nodesOf(file)) {
    if (!ts.isVariableDeclaration(node)) continue;
    if (!ts.isIdentifier(node.name) || node.name.text !== 'POCKET_ROUTE_IDS') continue;
    let init = node.initializer ?? null;
    while (init !== null && (ts.isAsExpression(init) || ts.isSatisfiesExpression?.(init))) init = init.expression;
    if (init === null || !ts.isArrayLiteralExpression(init)) return null;
    return init.elements.filter((e) => ts.isStringLiteral(e)).map((e) => ({ node: e, text: e.text }));
  }
  return null;
}

function noPushRouteRule() {
  const routes = moduleNamed('routes', 'N1', "Phase 313's");
  if (routes !== null) {
    // Every id and every path of the table.
    for (const node of nodesOf(routes)) {
      if (!ts.isVariableDeclaration(node)) continue;
      if (!ts.isIdentifier(node.name) || node.name.text !== 'POCKET_ROUTES') continue;
      for (const lit of nodesOf(routes).filter(
        (n) =>
          ts.isStringLiteral(n) &&
          n.getStart() >= node.getStart() &&
          n.getEnd() <= node.getEnd() &&
          ts.isPropertyAssignment(n.parent) &&
          ts.isIdentifier(n.parent.name) &&
          (n.parent.name.text === 'id' || n.parent.name.text === 'path')
      )) {
        checked('N1');
        if (PUSH_ROUTE_WORDS.test(lit.text)) {
          fail(
            'N1',
            `${where(routes, lit)}: the route ${lit.parent.name.text} ${JSON.stringify(lit.text)} names the push. ` +
              'The token rides inside the sealed pairing presentation and nothing about the push is a route a phone can ask for.'
          );
        }
      }
    }
    const lines = routeLines(routes);
    checked('N1');
    if (lines === null) {
      fail('N1', `${rel(routes)}: POCKET_ROUTES could not be read as literal rows, so nothing says no push route was added`);
    } else {
      const got = createHash('sha256').update(lines.join('\n')).digest('hex');
      if (got !== PHASE_313_ROUTE_PIN) {
        fail(
          'N1',
          `${rel(routes)}: the table's membership is no longer Phase 313's (${got.slice(0, 12)} against ${PHASE_313_ROUTE_PIN.slice(0, 12)}). ` +
            'Phase 314 adds no route, no write route and no token-refresh route; a later route is its own entry with its own tier.'
        );
      }
    }
    checked('N1');
    if (ROUTE_PIN !== PHASE_313_ROUTE_PIN) {
      fail('N1', `R4's pin is ${ROUTE_PIN.slice(0, 12)}, not Phase 313's ${PHASE_313_ROUTE_PIN.slice(0, 12)}, so the route table was re-pinned after Phase 313.`);
    }
  }
  const contract = join(ROOT, 'src', 'shared', 'ipc', 'pocket.ts');
  checked('N1');
  if (!existsSync(contract)) {
    fail('N1', 'src/shared/ipc/pocket.ts does not exist, so the contract’s route ids cannot be read');
    return;
  }
  const ids = contractRouteIds(contract);
  if (ids === null) {
    fail('N1', `${rel(contract)} declares no POCKET_ROUTE_IDS array literal`);
    return;
  }
  for (const { node, text } of ids) {
    checked('N1');
    if (PUSH_ROUTE_WORDS.test(text)) {
      fail('N1', `${where(contract, node)}: the contract names a route ${JSON.stringify(text)}, which names the push.`);
    }
  }
}

/** The types a renderer is handed, and nothing on them may be named like a token. */
const RENDERER_FACING = [
  'PocketStatus',
  'PocketPhoneView',
  'PocketPairingView',
  'PocketBlockedRow',
  'PocketSessionDetail',
  'PocketAllowResult'
];
const TOKEN_LIKE = /token|jwt|bearer|secret|^apt$|^ape$|^p8$|pem$/i;

function tokenDoorRule() {
  const pairing = moduleNamed('pairing', 'N2', "Phase 313's");
  if (pairing !== null) {
    // (a) The presentation parser READS apt and ape, and hands them to a check
    // that is bounded hex and two words, and refuses the whole body when it
    // answers null.
    let opener = null;
    for (const node of nodesOf(pairing)) {
      if (ts.isMethodDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === 'openPresentation') {
        opener = node;
      }
    }
    checked('N2');
    if (opener === null || opener.body === undefined) {
      fail('N2', `${rel(pairing)} declares no openPresentation method, so nothing reads what a phone presented`);
    } else {
      // COMMENTS BLANKED, so a sentence about the call is not the call.
      const text = codeTextOf(pairing).slice(opener.body.getStart(astOf(pairing)), opener.body.getEnd());
      checked('N2');
      if (!/presentedPush\s*\(\s*inner\s*\)/.test(text) || !/if\s*\(\s*push\s*===\s*null\s*\)\s*return null;/.test(text)) {
        fail(
          'N2',
          `${where(pairing, opener)}: openPresentation does not hand the inner body to presentedPush and refuse the WHOLE presentation on its null. ` +
            'A token that is not the shape must be refused with the one word every other refusal answers, never kept beside a good label.'
        );
      }
    }
    const fnText = (name) => {
      for (const node of nodesOf(pairing)) {
        if (ts.isFunctionDeclaration(node) && node.name?.text === name && node.body !== undefined) {
          return codeTextOf(pairing).slice(node.getStart(astOf(pairing)), node.getEnd());
        }
      }
      return null;
    };
    const presented = fnText('presentedPush');
    const shape = fnText('pushFieldsOf');
    checked('N2', 2);
    if (presented === null || !/'apt'/.test(presented) || !/'ape'/.test(presented)) {
      fail('N2', `${rel(pairing)}: presentedPush does not read the presentation's 'apt' and 'ape' keys`);
    }
    const regexText = codeTextOf(pairing);
    const bounded = /const PUSH_TOKEN_RE = \/\^\[0-9a-fA-F\]\{32,256\}\$\/;/.test(regexText);
    checked('N2');
    if (!bounded) {
      fail('N2', `${rel(pairing)}: PUSH_TOKEN_RE is not /^[0-9a-fA-F]{32,256}$/, so a device token is not held to bounded hex`);
    }
    checked('N2');
    if (
      shape === null ||
      !/PUSH_TOKEN_RE\.test\(token\)/.test(shape) ||
      !/environment !== 'development' && environment !== 'production'\) return null;/.test(shape)
    ) {
      fail(
        'N2',
        `${rel(pairing)}: pushFieldsOf does not test the token against PUSH_TOKEN_RE and refuse any environment but 'development' and 'production'.`
      );
    }
    // (c) The destination, which carries the token, is declared here.
    checked('N2');
    const declares = nodesOf(pairing).some(
      (n) => ts.isInterfaceDeclaration(n) && n.name.text === 'PocketPushDestination'
    );
    if (!declares) {
      fail('N2', `${rel(pairing)} declares no PocketPushDestination, so the one type that carries the token lives somewhere this gate does not read`);
    }
  }
  // (b) and (c): the shared contract.
  const shared = join(ROOT, 'src', 'shared');
  const sharedFiles = sourcesUnder(shared);
  for (const file of sharedFiles) {
    checked('N2');
    if (/\bPocketPushDestination\b/.test(codeTextOf(file))) {
      fail('N2', `${rel(file)} names PocketPushDestination. The type carries the token and lives in src/main/pocket/pairing.ts alone.`);
    }
  }
  const contract = join(shared, 'ipc', 'pocket.ts');
  if (!existsSync(contract)) {
    fail('N2', 'src/shared/ipc/pocket.ts does not exist, so the renderer-facing types cannot be read');
    return;
  }
  const found = new Set();
  for (const node of nodesOf(contract)) {
    if (!ts.isInterfaceDeclaration(node) || !RENDERER_FACING.includes(node.name.text)) continue;
    found.add(node.name.text);
    for (const member of node.members) {
      checked('N2');
      const name = member.name !== undefined && (ts.isIdentifier(member.name) || ts.isStringLiteral(member.name))
        ? member.name.text
        : null;
      if (name !== null && TOKEN_LIKE.test(name)) {
        fail(
          'N2',
          `${where(contract, member)}: ${node.name.text}.${name} is named like a token. ` +
            'The device token decides where his words go and never reaches the renderer; the sheet reads `alerts` and nothing more.'
        );
      }
    }
  }
  for (const name of RENDERER_FACING) {
    checked('N2');
    if (!found.has(name)) fail('N2', `${rel(contract)} declares no interface ${name}, so this rule read nothing for it`);
  }
}

// ---------------------------------------------------------------------------
// PHASE 316.1 — the door switched on
// ---------------------------------------------------------------------------

/**
 * Every declaration of a function called `name` in a file, whatever its shape:
 * a function, a class method, an object method, or a property or variable
 * whose value is an arrow or a function expression. Answers the node whose
 * text is the function (for a property, the initializer).
 */
function functionsNamed(file, name) {
  const out = [];
  for (const node of nodesOf(file)) {
    if ((ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) && node.name !== undefined) {
      const n = ts.isIdentifier(node.name) || ts.isStringLiteral(node.name) ? node.name.text : null;
      if (n === name && node.body !== undefined) out.push(node);
      continue;
    }
    if ((ts.isPropertyAssignment(node) || ts.isVariableDeclaration(node)) && node.initializer !== undefined) {
      const n = node.name !== undefined && (ts.isIdentifier(node.name) || ts.isStringLiteral(node.name)) ? node.name.text : null;
      if (n !== name) continue;
      let init = node.initializer;
      while (ts.isParenthesizedExpression(init) || ts.isAsExpression(init)) init = init.expression;
      if (ts.isArrowFunction(init) || ts.isFunctionExpression(init)) out.push(init);
    }
  }
  return out;
}

/** The method `name` of class `className` in a file, or null. */
function methodOf(file, className, name) {
  for (const node of nodesOf(file)) {
    if (!ts.isClassDeclaration(node) || node.name?.text !== className) continue;
    for (const member of node.members) {
      if (ts.isMethodDeclaration(member) && member.name !== undefined && ts.isIdentifier(member.name) && member.name.text === name && member.body !== undefined) {
        return member;
      }
    }
  }
  return null;
}

/** The comment-blanked text of one node. */
function codeOfNode(file, node) {
  return codeTextOf(file).slice(node.getStart(astOf(file)), node.getEnd());
}

/** The nearest enclosing function-like declaration's name, or null. */
function enclosingName(node) {
  let n = node.parent;
  while (n !== undefined) {
    if ((ts.isFunctionDeclaration(n) || ts.isMethodDeclaration(n)) && n.name !== undefined && ts.isIdentifier(n.name)) {
      return n.name.text;
    }
    if ((ts.isArrowFunction(n) || ts.isFunctionExpression(n)) && n.parent !== undefined) {
      const p = n.parent;
      if ((ts.isPropertyAssignment(p) || ts.isVariableDeclaration(p)) && ts.isIdentifier(p.name)) return p.name.text;
    }
    n = n.parent;
  }
  return null;
}

/** An interface declared in a file, or null. */
function interfaceOf(file, name) {
  for (const node of nodesOf(file)) {
    if (ts.isInterfaceDeclaration(node) && node.name.text === name) return node;
  }
  return null;
}

/** A member's name, whatever it is spelled as. */
const memberName = (member) =>
  member.name !== undefined && (ts.isIdentifier(member.name) || ts.isStringLiteral(member.name)) ? member.name.text : null;

/** The numeric value a `const NAME = <number>` in a file holds, or null. */
function constNumber(file, name) {
  for (const node of nodesOf(file)) {
    if (!ts.isVariableDeclaration(node) || !ts.isIdentifier(node.name) || node.name.text !== name) continue;
    const init = node.initializer;
    if (init !== undefined && ts.isNumericLiteral(init)) return Number(init.text.replace(/_/g, ''));
  }
  return null;
}

/** Every file of the renderer's Settings then Phone surface (Phase 316.1 builder C). */
function phoneSurfaceFiles() {
  const out = [];
  const section = join(ROOT, 'src', 'renderer', 'settings', 'PhoneSection.tsx');
  if (existsSync(section)) out.push(section);
  out.push(...sourcesUnder(join(ROOT, 'src', 'renderer', 'settings', 'phone')));
  return out;
}

// ---------------------------------------------------------------------------
// K1 — his tailnet key
// ---------------------------------------------------------------------------

/** A NAME that says it holds the key: a field, a member, a property, a binding. */
const KEY_NAME = /tailnet|tskey|^tk$/i;

/**
 * The identifiers an expression names, and not its words. A log line whose
 * TEXT says "the tailnet door" is a reason; an argument that READS `tailnetKey`
 * or `input.tk` is a value. The first draft of this rule matched the text and
 * failed three honest refusal lines on the word "tailnet".
 */
function identifiersOf(node) {
  const out = [];
  const walk = (n) => {
    if (ts.isIdentifier(n) || ts.isPrivateIdentifier(n)) out.push(n.text);
    if (ts.isStringLiteral(n) && ts.isElementAccessExpression(n.parent) && n.parent.argumentExpression === n) out.push(n.text);
    ts.forEachChild(n, walk);
  };
  walk(node);
  return out;
}
const namesTheKey = (node) => identifiersOf(node).some((name) => KEY_NAME.test(name));

/**
 * HIS TAILNET KEY, and it is the one credential of his that crosses this door.
 *
 * WHY IT IS A RULE AND NOT A SENTENCE. He mints the key by hand in his own
 * admin console, pastes it into the sheet, and the phone joins his tailnet with
 * it once. Main holds it for at most the pairing window and puts it in exactly
 * one place, the QR. Every other place it could go — `pocket.json`, the confirm
 * record, `app.log`, the sheet's view, the status broadcast every window
 * receives, the renderer's storage — is ONE LINE a later round could write with
 * every other rule in this gate green, because G1's words are `key` and `token`
 * at word boundaries and `tailnetKey` has neither. So the key has its own rule.
 */
function tailnetKeyRule() {
  const pairing = moduleNamed('pairing', 'K1', "Phase 316.1 builder B's");
  if (pairing === null) return;
  const sf = astOf(pairing);

  // (a) THE SHAPE, checked before anything moves. One spelling of the prefix
  // in the whole domain, a reader that asks it, and a length bound of 256.
  const prefixSites = [];
  for (const file of domainFiles) {
    for (const s of codeStringsOf(file)) if (s.text === 'tskey-auth-') prefixSites.push(where(file, s.node));
  }
  checked('K1', 2);
  if (prefixSites.length !== 1) {
    fail(
      'K1',
      `the prefix 'tskey-auth-' is spelled ${String(prefixSites.length)} time(s) in the domain (${prefixSites.join(', ') || 'nowhere'}). ` +
        'One module checks what a tailnet auth key looks like, and a second spelling is a second answer to it.'
    );
  }
  const readers = functionsNamed(pairing, 'tailnetKeyOf');
  if (readers.length !== 1) {
    fail('K1', `${rel(pairing)} declares ${String(readers.length)} tailnetKeyOf function(s); the key's shape is checked by exactly one reader, before a window opens`);
  } else {
    const text = codeOfNode(pairing, readers[0]);
    checked('K1', 3);
    if (!/\.startsWith\(\s*(?:TAILNET_AUTH_KEY_PREFIX|'tskey-auth-')\s*\)/.test(text)) {
      fail('K1', `${where(pairing, readers[0])}: tailnetKeyOf never asks startsWith('tskey-auth-'), so an API key or an OAuth secret pasted by mistake would ride to the phone as a join key`);
    }
    const bounds = [...text.matchAll(/\.length\s*>\s*([A-Z_][A-Z0-9_]*)/g)].map((m) => constNumber(pairing, m[1]));
    if (!bounds.includes(256)) {
      fail('K1', `${where(pairing, readers[0])}: tailnetKeyOf compares no length with a constant of 256, so a 10 KB paste would be carried into the QR and the window`);
    }
    if (!/Buffer\.from\(/.test(text)) {
      fail('K1', `${where(pairing, readers[0])}: tailnetKeyOf does not answer BYTES. A string cannot be zeroed, so a key held as one outlives the window by as long as the collector likes`);
    }
  }

  // (b) THE WINDOW HOLDS BYTES.
  const win = interfaceOf(pairing, 'OpenWindow');
  const keyMember = win?.members.find((m) => memberName(m) === 'tailnetKey') ?? null;
  checked('K1');
  if (keyMember === null) {
    fail('K1', `${rel(pairing)}: OpenWindow holds no tailnetKey member, so the key lives somewhere this rule does not read`);
  } else if (!/\bBuffer\b/.test(keyMember.type?.getText(sf) ?? '')) {
    fail('K1', `${where(pairing, keyMember)}: OpenWindow.tailnetKey is typed ${JSON.stringify(keyMember.type?.getText(sf) ?? '?')}, not Buffer, so nothing can zero it`);
  }

  // (c) ZEROED on cancel, on expiry and on allow: each of those three either
  // fills the key itself or calls a function in this module that does. And
  // open's own refusal zeroes the bytes it read before a window held them.
  const zeroes = (text) => /tailnetKey\??\.fill\(\s*0\s*\)/.test(text);
  const shredders = new Set();
  for (const node of nodesOf(pairing)) {
    if (!ts.isFunctionDeclaration(node) || node.name === undefined || node.body === undefined) continue;
    if (zeroes(codeOfNode(pairing, node.body))) shredders.add(node.name.text);
  }
  for (const name of ['cancel', 'sweep', 'allow']) {
    const method = methodOf(pairing, 'PocketPairing', name);
    checked('K1');
    if (method === null) {
      fail('K1', `${rel(pairing)}: PocketPairing declares no ${name}(), so nothing here reads whether it zeroes the key`);
      continue;
    }
    const text = codeOfNode(pairing, method.body);
    const calls = [...shredders].some((s) => new RegExp(`\\b${s}\\s*\\(`).test(text));
    if (!zeroes(text) && !calls) {
      fail(
        'K1',
        `${where(pairing, method)}: PocketPairing.${name}() neither zeroes the window's tailnetKey nor calls a function that does (${[...shredders].join(', ') || 'none found'}). ` +
          'His key must be gone from memory on cancel, on expiry and on allow, like the one-shot secret beside it.'
      );
    }
  }
  const open = methodOf(pairing, 'PocketPairing', 'open');
  checked('K1');
  if (open === null) {
    fail('K1', `${rel(pairing)}: PocketPairing declares no open()`);
  } else {
    let zeroedInCatch = false;
    const walk = (n) => {
      if (ts.isCatchClause(n) && /\.fill\(\s*0\s*\)/.test(codeOfNode(pairing, n.block))) zeroedInCatch = true;
      ts.forEachChild(n, walk);
    };
    walk(open.body);
    if (!zeroedInCatch) {
      fail('K1', `${where(pairing, open)}: open() has no catch that zeroes the key it read, so a refusal after the key was read (no address, nothing listening) leaves his key in memory with no window to shred it`);
    }
  }

  // (d) NO FILE. The stored shape names no key, and no write in the domain is
  // handed anything that names one.
  const store = interfaceOf(pairing, 'PocketStore');
  checked('K1');
  if (store === null) {
    fail('K1', `${rel(pairing)} declares no PocketStore, so nothing here reads what pocket.json holds`);
  } else {
    for (const member of store.members) {
      checked('K1');
      const name = memberName(member);
      if (name !== null && KEY_NAME.test(name)) {
        fail('K1', `${where(pairing, member)}: PocketStore.${name} would write his tailnet key into pocket.json. It lives in the window and nowhere else.`);
      }
    }
  }
  const WRITES = new Set(['writePocketStore', 'writeFileSync', 'appendFileSync', 'writeConfirmRecords', 'createWriteStream', 'write']);
  for (const file of domainFiles) {
    for (const call of callsOf(file)) {
      const name = calleeName(call);
      if (name === null || !WRITES.has(name)) continue;
      for (const arg of call.arguments) {
        checked('K1');
        if (namesTheKey(arg)) {
          fail('K1', `${where(file, call)}: ${name}(...) is handed ${JSON.stringify(arg.getText(astOf(file)).slice(0, 80))}, which names his tailnet key. It is never written anywhere.`);
        }
      }
    }
  }

  // (e) NO LOG, in the door, in the capability that wires it, and on the
  // surface that takes the paste. A literal is a reason and is skipped, as G1
  // skips it; anything else that names the key is a value.
  const capabilities = join(ROOT, 'src', 'main', 'capabilities.ts');
  const logFiles = [...domainFiles, ...(existsSync(capabilities) ? [capabilities] : []), ...phoneSurfaceFiles()];
  for (const file of logFiles) {
    for (const call of callsOf(file)) {
      const name = calleeName(call);
      if (name === null || !/^(?:debug|info|warn|error|log|trace)$/.test(name)) continue;
      for (const arg of call.arguments) {
        checked('K1');
        if (namesTheKey(arg)) {
          const text = arg.getText(astOf(file));
          fail('K1', `${where(file, call)} hands ${JSON.stringify(text.slice(0, 80))} to ${name}(). His tailnet key is never in a log line, and G1 cannot see it: 'tailnetKey' holds no word boundary before 'Key'.`);
        }
      }
    }
  }

  // (f) NO ANSWER BUT THE OFFER. No shared type carries a member named like it
  // except the one INPUT the sheet sends; inside the domain the window's key is
  // read only where the QR is composed and where it is zeroed; and `tk` is
  // composed in open() and nowhere else.
  const contract = join(ROOT, 'src', 'shared', 'ipc', 'pocket.ts');
  if (existsSync(contract)) {
    for (const node of nodesOf(contract)) {
      if (!ts.isInterfaceDeclaration(node) || node.name.text === 'PocketPairingInput') continue;
      for (const member of node.members) {
        checked('K1');
        const name = memberName(member);
        if (name !== null && KEY_NAME.test(name)) {
          fail('K1', `${where(contract, member)}: ${node.name.text}.${name} carries his tailnet key on a shape main hands out. The key goes in and comes out only inside the one offer's payload.`);
        }
      }
    }
  }
  const KEY_READERS = new Set(['open', 'holdsTailnetKey', 'tailnetKeyOf', ...shredders]);
  for (const file of domainFiles) {
    for (const node of nodesOf(file)) {
      if (ts.isPropertyAccessExpression(node) && node.name.text === 'tailnetKey') {
        checked('K1');
        const owner = enclosingName(node);
        const zeroing =
          ts.isPropertyAccessExpression(node.parent) && node.parent.name.text === 'fill';
        const optionalZeroing =
          node.parent !== undefined && ts.isPropertyAccessExpression(node.parent) && node.parent.questionDotToken !== undefined && node.parent.name.text === 'fill';
        if (file !== pairing || (!KEY_READERS.has(owner ?? '') && !zeroing && !optionalZeroing)) {
          fail('K1', `${where(file, node)}: the tailnet key is read in ${owner ?? 'module scope'}. It is read to compose the QR and to zero it, and nowhere else, so no view, status or broadcast can carry it.`);
        }
      }
      if ((ts.isPropertyAssignment(node) || ts.isShorthandPropertyAssignment(node)) && memberName(node) === 'tk') {
        checked('K1');
        if (file !== pairing || enclosingName(node) !== 'open') {
          fail('K1', `${where(file, node)}: a \`tk\` is composed outside PocketPairing.open(). The QR is the one place his key is put.`);
        }
      }
    }
  }

  // (g) THE SURFACE THAT TAKES THE PASTE keeps nothing: no browser storage,
  // and the field is a password field, so it is never drawn in the clear.
  const surface = phoneSurfaceFiles();
  checked('K1');
  if (surface.length === 0) {
    fail('K1', 'src/renderer/settings/PhoneSection.tsx does not exist, so nothing here reads where the key is pasted. It is Phase 316.1 builder C’s.');
  }
  let passwordField = false;
  for (const file of surface) {
    const code = codeTextOf(file);
    checked('K1');
    for (const needle of ['localStorage', 'sessionStorage', 'indexedDB', 'document.cookie']) {
      if (code.includes(needle)) {
        fail('K1', `${rel(file)} names ${needle}. The surface that takes his tailnet key keeps nothing in the renderer's storage.`);
      }
    }
    if (/type\s*=\s*\{?\s*["']password["']/.test(code)) passwordField = true;
  }
  checked('K1');
  if (surface.length > 0 && !passwordField) {
    fail('K1', 'no field on Settings then Phone is type="password", so the key he pastes is drawn in the clear (build/p316/SPEC.md §4 S1 mechanism 7: "a password field for the key")');
  }
}

// ---------------------------------------------------------------------------
// O1 — others is exactly the listed sessions that are not blocked
// ---------------------------------------------------------------------------

/** The method `name` of the object literal a function returns, or null. */
function returnedMethod(file, factoryName, name) {
  for (const fn of functionsNamed(file, factoryName)) {
    let found = null;
    const walk = (n) => {
      if (found !== null) return;
      if (ts.isReturnStatement(n) && n.expression !== undefined && ts.isObjectLiteralExpression(n.expression)) {
        for (const p of n.expression.properties) {
          if (memberName(p) !== name) continue;
          if (ts.isMethodDeclaration(p) && p.body !== undefined) found = p;
          if (ts.isPropertyAssignment(p) && (ts.isArrowFunction(p.initializer) || ts.isFunctionExpression(p.initializer))) found = p.initializer;
        }
      }
      ts.forEachChild(n, walk);
    };
    walk(fn.body ?? fn);
    if (found !== null) return found;
  }
  return null;
}

/**
 * HIS RULING, 2026-09-22: "Yes it should be able to open anything." A phone
 * that may open any session needs to FIND any session, and the blocked list
 * names only the ones waiting on him. `others` is the rest, and "the rest" is a
 * set identity that one careless line breaks two ways: a second read of the
 * session list (two lists that disagree about a session that moved between
 * them), or a filter that is not the complement of the blocked set (a session
 * drawn twice, or never). And it is bounded, by the contract's own number.
 * The hostile client drives the shipping composer over 205 sessions; this reads
 * that no source can take either promise back.
 */
function othersRule() {
  const routes = moduleNamed('routes', 'O1', "Phase 316.1 builder A's");
  const contract = join(ROOT, 'src', 'shared', 'ipc', 'pocket.ts');
  checked('O1');
  if (!existsSync(contract) || constNumber(contract, 'POCKET_OTHERS_MAX') !== 200) {
    fail('O1', 'src/shared/ipc/pocket.ts does not declare POCKET_OTHERS_MAX = 200, so the cap on others is nowhere a phone and the Mac both read');
  }
  if (routes === null) return;
  // The cap is IMPORTED from the contract, never re-spelled.
  let imported = false;
  for (const node of nodesOf(routes)) {
    if (!ts.isImportDeclaration(node) || !ts.isStringLiteral(node.moduleSpecifier)) continue;
    if (!/shared\/ipc\/pocket$/.test(node.moduleSpecifier.text)) continue;
    const clause = node.importClause?.namedBindings;
    if (clause !== undefined && ts.isNamedImports(clause) && clause.elements.some((e) => e.name.text === 'POCKET_OTHERS_MAX')) imported = true;
  }
  checked('O1');
  if (!imported) {
    fail('O1', `${rel(routes)} does not import POCKET_OTHERS_MAX from the contract, so the cap a phone is told and the cap the door applies can drift apart`);
  }
  const blocked = returnedMethod(routes, 'createPocketRoutes', 'blocked');
  checked('O1');
  if (blocked === null) {
    fail('O1', `${rel(routes)}: createPocketRoutes answers no blocked() this rule can read`);
    return;
  }
  const text = codeOfNode(routes, blocked.body);
  // ONE read of the session list, for both lists.
  const reads = (text.match(/facts\.sessions\(\)/g) ?? []).length;
  checked('O1');
  if (reads !== 1) {
    fail('O1', `${where(routes, blocked)}: blocked() reads facts.sessions() ${String(reads)} time(s). Both lists are cut from ONE read, or a session that moves between two reads is drawn twice or never.`);
  }
  // The complement: a set filled in the rows loop, and a filter that is its
  // negation by id.
  const sets = [...text.matchAll(/(\w+)\.add\(\s*\w+\.id\s*\)/g)].map((m) => m[1]);
  const complement = sets.some((set) =>
    new RegExp(`\\.filter\\(\\s*\\(?\\s*(\\w+)\\s*\\)?\\s*=>\\s*!\\s*${set}\\.has\\(\\s*\\1\\.id\\s*\\)\\s*\\)`).test(text)
  );
  checked('O1');
  if (!complement) {
    fail('O1', `${where(routes, blocked)}: others is not the complement of the blocked set by id (a set filled as the rows are built, and a filter that is its negation), so a session can be in both lists or in neither`);
  }
  checked('O1', 2);
  if (!/\.slice\(\s*0\s*,\s*POCKET_OTHERS_MAX\s*\)/.test(text)) {
    fail('O1', `${where(routes, blocked)}: others is not cut to POCKET_OTHERS_MAX, so a person with a thousand sessions is handed an answer of unbounded size`);
  }
  if (!/othersOmitted\s*:\s*\w+\.length\s*-\s*\w+\.length/.test(text)) {
    fail('O1', `${where(routes, blocked)}: othersOmitted is not the count the cap left out, so a phone cannot say how many it is not showing`);
  }
}

// ---------------------------------------------------------------------------
// T2 — fresh before read, and one turn shape
// ---------------------------------------------------------------------------

/**
 * The overview store is written only when Catch Me Up opens a project, the fold
 * runs or the session manager asks for counts (`../overview/service.ts`), so a
 * bare read answers stale for exactly the sessions a phone asks about
 * (build/p316/SPEC.md §2 row 7). The route asks the refresh FIRST; the one
 * production composer supplies it through `sessionActivity`, the one read path;
 * and every turn it answers goes through `toTurnView`, where the clip lives, so
 * clipping stays in one place. `probe:p313` T2 appends a turn to a real record
 * and reads it back through the door; this reads that no source can skip it.
 */
function turnReadRule() {
  const routes = moduleNamed('routes', 'T2', "Phase 316.1 builder A's");
  const facts = moduleNamed('facts', 'T2', "Phase 316.1 builder A's");
  if (routes !== null) {
    for (const [name, reads] of [
      ['session', /facts\.(?:catchUp|lastTurn)\(/],
      ['turns', /facts\.turns\(/]
    ]) {
      const method = returnedMethod(routes, 'createPocketRoutes', name);
      checked('T2');
      if (method === null) {
        fail('T2', `${rel(routes)}: createPocketRoutes answers no ${name}() this rule can read`);
        continue;
      }
      const text = codeOfNode(routes, method.body);
      const refreshAt = text.search(/await\s+refresh\(/);
      const readAt = text.search(reads);
      checked('T2');
      if (readAt === -1) {
        fail('T2', `${where(routes, method)}: ${name}() reads no conversation, so this rule cannot place the refresh before it`);
      } else if (refreshAt === -1 || refreshAt > readAt) {
        fail(
          'T2',
          `${where(routes, method)}: ${name}() reads the store before it awaits refresh(). The store is written only when Catch Me Up, the fold or the counts ask, so this answers what the conversation WAS.`
        );
      }
    }
    // The route's refresh asks the composer's.
    const helper = functionsNamed(routes, 'refresh');
    checked('T2');
    if (helper.length === 0 || !helper.some((fn) => /facts\.refresh\(/.test(codeOfNode(routes, fn)))) {
      fail('T2', `${rel(routes)} declares no refresh() that asks facts.refresh(), so the route's refresh brings nothing up to date`);
    }
  }
  if (facts === null) return;
  // The production composer SUPPLIES the refresh, through the one read path.
  const refresh = returnedMethod(facts, 'createPocketFacts', 'refresh');
  checked('T2');
  if (refresh === null) {
    fail('T2', `${rel(facts)}: createPocketFacts supplies no refresh, and the member is optional on PocketFacts, so the routes would read the store as they find it`);
  } else if (!/\bsessionActivity\(\s*[\w.]+\s*,\s*\{\s*sessionIds:\s*\[\s*\w+\s*\]\s*\}\s*\)/.test(codeOfNode(facts, refresh.body))) {
    fail('T2', `${where(facts, refresh)}: the composer's refresh does not call sessionActivity(deps, { sessionIds: [id] }), the one read path that brings a row up to date`);
  }
  // Every function that reads turns out of the store shapes them through
  // toTurnView, directly or through the one function that does.
  const shapers = new Set(['toTurnView']);
  for (const node of nodesOf(facts)) {
    if (!ts.isFunctionDeclaration(node) || node.name === undefined || node.body === undefined) continue;
    const calls = (codeOfNode(facts, node.body).match(/\btoTurnView\(/g) ?? []).length;
    if (calls === 1) shapers.add(node.name.text);
  }
  checked('T2');
  if (!shapers.has('pocketTurnOf')) {
    fail('T2', `${rel(facts)}: pocketTurnOf does not call toTurnView exactly once, so the turns the phone reads are clipped somewhere else, or twice, or not at all`);
  }
  for (const file of domainFiles) {
    for (const call of callsOf(file)) {
      const name = calleeName(call);
      if (name !== 'listTurns' && name !== 'listTurnsBetween') continue;
      checked('T2');
      // Walk up to the nearest function and ask whether it shapes what it read.
      let fn = call.parent;
      while (fn !== undefined && !ts.isFunctionLike(fn)) fn = fn.parent;
      const body = fn === undefined ? '' : codeOfNode(file, fn);
      const shaped = [...shapers].some((s) => new RegExp(`\\b${s}\\(`).test(body));
      const isProbe = /\.length\s*>\s*0/.test(call.parent?.getText?.(astOf(file)) ?? '') || /,\s*1\s*\)\s*\.length/.test(body);
      if (!shaped && !(isProbe && name === 'listTurnsBetween')) {
        fail('T2', `${where(file, call)}: ${name}() is read in a function that shapes nothing through toTurnView, so a turn reaches the phone unclipped`);
      }
    }
  }
  // No turn is BUILT anywhere else: an object carrying askText is composed only
  // by a function that shapes through toTurnView.
  for (const file of domainFiles) {
    for (const node of nodesOf(file)) {
      if (!ts.isObjectLiteralExpression(node)) continue;
      if (!node.properties.some((p) => memberName(p) === 'askText')) continue;
      checked('T2');
      const owner = enclosingName(node);
      if (owner === null || !shapers.has(owner) || owner === 'toTurnView') {
        if (owner !== null && shapers.has(owner)) continue;
        fail('T2', `${where(file, node)}: a turn is built in ${owner ?? 'module scope'}, which does not shape it through toTurnView. One definition clips the conversation.`);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// F1 — the QR pins the key
// ---------------------------------------------------------------------------

/**
 * The QR pins the door's PUBLIC KEY, from the door that is LISTENING.
 *
 * v:1 carried `fp` from `certificateFingerprint`, the sha256 of a certificate
 * `./tls.ts` renews from the same key every 397 days, so every phone paired
 * under it would have stopped trusting the door thirteen months later with
 * nothing on either screen saying why (build/p316/SPEC.md §2 row 24). The key
 * outlives the certificate. The hostile client re-derives the pin from the leaf
 * the door serves, the Swift way; this reads that no source can put the old
 * thing back.
 */
function qrPinRule() {
  const pairing = moduleNamed('pairing', 'F1', "Phase 316.1 builder B's");
  if (pairing === null) return;
  const open = methodOf(pairing, 'PocketPairing', 'open');
  checked('F1');
  if (open === null) {
    fail('F1', `${rel(pairing)}: PocketPairing declares no open(), so nothing composes the QR`);
    return;
  }
  // The payload literal is the argument of the JSON.stringify inside open().
  let payload = null;
  const walk = (n) => {
    if (ts.isCallExpression(n) && calleeName(n) === 'stringify' && n.arguments[0] !== undefined && ts.isObjectLiteralExpression(n.arguments[0])) {
      payload = n.arguments[0];
    }
    if (payload === null) ts.forEachChild(n, walk);
  };
  walk(open.body);
  checked('F1');
  if (payload === null) {
    fail('F1', `${where(pairing, open)}: open() composes no JSON.stringify({...}) payload this rule can read`);
    return;
  }
  const prop = (name) =>
    payload.properties.find((p) => ts.isPropertyAssignment(p) && memberName(p) === name) ?? null;
  const v = prop('v');
  const fp = prop('fp');
  checked('F1', 2);
  const vValue =
    v === null
      ? null
      : ts.isNumericLiteral(v.initializer)
        ? Number(v.initializer.text)
        : ts.isIdentifier(v.initializer)
          ? constNumber(pairing, v.initializer.text)
          : null;
  if (vValue !== 2) {
    fail('F1', `${where(pairing, payload)}: the QR's v is ${JSON.stringify(vValue)}, not 2. A phone reads v to know the pin is the KEY's; v:1 meant the certificate's.`);
  }
  if (fp === null) {
    fail('F1', `${where(pairing, payload)}: the QR carries no fp, so a phone has nothing to pin`);
    return;
  }
  const fpText = fp.initializer.getText(astOf(pairing));
  checked('F1');
  if (/certificate/i.test(fpText)) {
    fail('F1', `${where(pairing, fp)}: the QR's fp is ${JSON.stringify(fpText)}, the CERTIFICATE's hash. It is renewed every 397 days and every paired phone would stop trusting the door.`);
  }
  // The fp is a value that was asked of the door and refused when null, BEFORE
  // the window exists.
  const openText = codeOfNode(pairing, open.body);
  const pinVar = /const\s+(\w+)\s*=\s*this\.deps\.publicKeyPin\(\)/.exec(openText)?.[1] ?? null;
  checked('F1', 2);
  if (pinVar === null) {
    fail('F1', `${where(pairing, open)}: open() never asks this.deps.publicKeyPin(), so the QR's pin does not come from the listening door's key`);
  } else {
    if (fpText !== pinVar) {
      fail('F1', `${where(pairing, fp)}: fp is ${JSON.stringify(fpText)}, not the pin open() asked the door for (${pinVar})`);
    }
    const guard = new RegExp(`if\\s*\\(\\s*${pinVar}\\s*===\\s*null\\s*\\)\\s*throw\\b`).exec(openText);
    const windowAt = openText.search(/this\.window\s*=\s*\{/);
    if (guard === null || windowAt === -1 || guard.index > windowAt) {
      fail('F1', `${where(pairing, open)}: open() does not refuse a null pin before it makes the window, so a QR could carry fp: null and a phone would pin nothing`);
    }
  }
  // Nothing in the module can reach the certificate's hash any more.
  checked('F1');
  if (/certificateFingerprint/.test(codeTextOf(pairing))) {
    fail('F1', `${rel(pairing)} still names certificateFingerprint in its code. The pairing owner pins the key and has no use for the certificate's hash.`);
  }
  // The wiring: the host hands the pairing owner the LISTENING door's key pin.
  const ipc = moduleNamed('ipc', 'F1', "Phase 316.1 builder B's");
  if (ipc === null) return;
  let wiring = null;
  for (const node of nodesOf(ipc)) {
    if (ts.isPropertyAssignment(node) && memberName(node) === 'publicKeyPin') wiring = node;
  }
  checked('F1');
  if (wiring === null) {
    fail('F1', `${rel(ipc)} hands the pairing owner no publicKeyPin, so the QR's pin comes from nowhere this rule reads`);
  } else {
    const text = codeOfNode(ipc, wiring.initializer);
    if (/certificate/i.test(text) || !/publicKeyFingerprint/.test(text) || !/listening/.test(text) || !/spkiPinOf\(/.test(text)) {
      fail(
        'F1',
        `${where(ipc, wiring)}: publicKeyPin is ${JSON.stringify(text.replace(/\s+/g, ' ').slice(0, 120))}. It must be spkiPinOf(the door's publicKeyFingerprint), and null unless the door is listening.`
      );
    }
  }
}

// ---------------------------------------------------------------------------
// L5 — the launch step binds only on confirmed fields
// ---------------------------------------------------------------------------

/** Every non-test .ts under src/main. */
function mainSources() {
  return sourcesUnder(join(ROOT, 'src', 'main'));
}

/**
 * CLAUDE.md refusal 8: nothing may cause a process to start on a
 * configuration change alone. Binding a listener a person confirmed is not
 * that; binding one because a file says `bindAtLaunch: true` is exactly that.
 * So the launch step asks THREE things — the switch, the at-launch flag and a
 * confirmed hash — and the one function that binds asks the gate again before
 * it reaches a socket. A later round that "simplifies" either half away turns
 * a hand-edited store into a door on his tailnet.
 */
function launchRule() {
  const ipc = moduleNamed('ipc', 'L5', "Phase 316.1 builder B's");
  if (ipc === null) return;

  // (a) ONE call site binds, in the whole of src/main, and it is the host's
  // own openNow() — the start as it runs inside the switch's one queue (Q1).
  const sites = [];
  for (const file of mainSources()) {
    for (const call of callsOf(file)) {
      if (calleeName(call) === 'startPocketDoor') sites.push({ file, call });
    }
  }
  checked('L5', sites.length + 1);
  if (sites.length !== 1 || sites[0].file !== ipc || enclosingName(sites[0].call) !== 'openNow') {
    fail(
      'L5',
      `startPocketDoor is called at ${sites.map((s) => `${where(s.file, s.call)} in ${enclosingName(s.call) ?? 'module scope'}`).join(', ') || 'no site at all'}. ` +
        'Exactly one call site binds the door, PocketHost.openNow(), so there is one place the gate is asked.'
    );
  }

  // (b) start() asks the gate BEFORE the socket — directly, or through one of
  // the host's own methods whose body asks it — and NOTHING YIELDS between the
  // last time it asks and the bind. A gate asked before an await answers for a
  // world that may have moved by the time the socket opens: the person may have
  // switched the door off, or a field may have moved, while it waited.
  const start = methodOf(ipc, 'PocketHost', 'openNow');
  checked('L5', 2);
  if (start === null) {
    fail('L5', `${rel(ipc)}: PocketHost declares no openNow(), the start as it runs inside the switch's queue`);
  } else {
    const gates = ['assertPocketDoorMayBind'];
    for (const node of nodesOf(ipc)) {
      if (!ts.isMethodDeclaration(node) || node.body === undefined || !ts.isIdentifier(node.name)) continue;
      if (/\bassertPocketDoorMayBind\(/.test(codeOfNode(ipc, node.body)) && node.name.text !== 'openNow') gates.push(`this.${node.name.text}`);
    }
    const text = codeOfNode(ipc, start.body);
    const bindAt = text.search(/startPocketDoor\(/);
    let gateAt = -1;
    let gateEnd = -1;
    for (const gate of gates) {
      const re = new RegExp(`${gate.replace('.', '\\.')}\\(`, 'g');
      for (const m of text.matchAll(re)) {
        if (bindAt !== -1 && m.index < bindAt && m.index > gateAt) {
          gateAt = m.index;
          gateEnd = m.index + m[0].length;
        }
      }
    }
    if (gateAt === -1 || bindAt === -1) {
      fail(
        'L5',
        `${where(ipc, start)}: PocketHost.openNow() does not ask the gate (${gates.join(', ')}) before startPocketDoor, so a door nobody confirmed could reach a socket`
      );
    } else if (/\bawait\b/.test(text.slice(gateEnd, bindAt).replace(/await\s*$/, ''))) {
      fail(
        'L5',
        `${where(ipc, start)}: something is awaited between the last gate and the bind in PocketHost.openNow(), so the answer the gate gave is about a world that may have moved before the socket opens`
      );
    }
  }

  // (e) THE SWITCH-OFF, the 316.1 fix round (the attack's X1). A start that
  // was already past its gate when the switch went off used to re-read the
  // switch inside the off's own stop, find it still on, and bind a door the
  // sheet then called off. So the off counts itself as the LAST PRESS and
  // writes the store BEFORE its first await, and openNow() asks whether a
  // later press arrived with nothing awaited between the asking and the bind.
  const setDoor = methodOf(ipc, 'PocketHost', 'setDoor');
  checked('L5', 2);
  if (setDoor === null) {
    fail('L5', `${rel(ipc)}: PocketHost declares no setDoor(), so this rule cannot read the switch-off`);
  } else {
    const offBranch = nodesOf(ipc).find(
      (n) =>
        ts.isIfStatement(n) &&
        n.pos >= setDoor.pos &&
        n.end <= setDoor.end &&
        /^!\s*on$/.test(codeOfNode(ipc, n.expression).trim())
    );
    const offText = offBranch === undefined ? '' : codeOfNode(ipc, offBranch.thenStatement);
    const firstAwait = offText.search(/\bawait\b/);
    const counted = offText.search(/this\.pressed\(\)/);
    const written = offText.search(/writePocketStore\(/);
    if (offBranch === undefined) {
      fail('L5', `${where(ipc, setDoor)}: setDoor() has no \`if (!on)\` branch, so this rule cannot read where the switch-off is recorded`);
    } else if (counted === -1 || written === -1 || firstAwait === -1 || counted > firstAwait || written > firstAwait) {
      fail(
        'L5',
        `${where(ipc, offBranch)}: the switch-off does not both count itself as the last press (this.pressed()) and write the store BEFORE its first await, so a switch-on already waiting on the sessions re-reads a switch that still says on and binds a door the sheet calls off`
      );
    }
  }
  if (start !== null) {
    // ASKED ONE LAST TIME, AS THE STATEMENT IMMEDIATELY BEFORE THE BIND. An
    // earlier ask with no await after it reads the same today, and it is the
    // first thing a later round puts an await after; so the rule reads the
    // one statement the bind follows, which is what the code says it is.
    const statements = start.body.statements;
    const bindIndex = statements.findIndex((st) => /\bstartPocketDoor\(/.test(codeOfNode(ipc, st)));
    const before = bindIndex > 0 ? codeOfNode(ipc, statements[bindIndex - 1]).trim() : '';
    checked('L5');
    if (bindIndex === -1 || !/^if\s*\(\s*this\.superseded\(\s*press\s*\)\s*\)\s*return\s*;?$/.test(before)) {
      fail('L5', `${where(ipc, start)}: the statement immediately before startPocketDoor in PocketHost.openNow() is not \`if (this.superseded(press)) return;\` (it is ${JSON.stringify(before.replace(/\s+/g, ' ').slice(0, 100))}), so a start already past its gate binds after the person switched the door off`);
    }
  }

  // (c) the launch step: it returns before start() unless the person turned
  // the door on AND asked for it at launch. The CONFIRMED hash is (b)'s, and
  // (b) holds on every path to the bind, this one included.
  const launch = methodOf(ipc, 'PocketHost', 'openAtLaunch');
  checked('L5');
  if (launch === null) {
    fail('L5', `${rel(ipc)}: PocketHost declares no openAtLaunch(), so there is no launch step this rule can read`);
  } else {
    const statements = launch.body.statements;
    const startAt = statements.findIndex((s) => /\bthis\.start\(/.test(codeOfNode(ipc, s)));
    const before = startAt === -1 ? [] : statements.slice(0, startAt);
    const guards = before.filter((s) => ts.isIfStatement(s) && /\breturn\b/.test(codeOfNode(ipc, s.thenStatement)));
    const guardText = guards.map((g) => codeOfNode(ipc, g.expression)).join('\n');
    checked('L5', 2);
    if (startAt === -1) {
      fail('L5', `${where(ipc, launch)}: openAtLaunch() never reaches this.start() at its top level, so this rule cannot read what guards it`);
    } else if (!/!\s*[\w.?]*\benabled\b/.test(guardText) || !/!\s*[\w.?]*\bbindAtLaunch\b/.test(guardText)) {
      fail(
        'L5',
        `${where(ipc, launch)}: the launch step does not return before start() unless BOTH enabled and bindAtLaunch are true, so a door a person turned off, or never asked for at launch, would open when Tortie starts`
      );
    }
  }

  // (d) the capability calls the launch step and nothing that skips it.
  const capabilities = join(ROOT, 'src', 'main', 'capabilities.ts');
  checked('L5');
  if (!existsSync(capabilities)) {
    fail('L5', 'src/main/capabilities.ts does not exist');
  } else {
    const text = codeTextOf(capabilities);
    if (!/\.openAtLaunch\(/.test(text)) {
      fail('L5', 'src/main/capabilities.ts never calls openAtLaunch(), so the door never comes up with the app however a person set it');
    }
    if (/\bstartPocketDoor\s*\(/.test(text) || /\b\w*(?:pocket|host)\w*\.start\(/i.test(text)) {
      fail('L5', 'src/main/capabilities.ts starts the door directly rather than through openAtLaunch(), which is the one launch path that asks for a confirmed hash');
    }
  }
}

// ---------------------------------------------------------------------------
// A4 — an answer is admitted again before it is sent (the 316.1 fix round)
// ---------------------------------------------------------------------------

/**
 * The attack's R1: a phone removed while its request was inside the refresh
 * still got its answer, read from the store AFTER the person pressed Remove,
 * because the handler re-asked only the quit after the answer composed and the
 * door's stop JOINS a handler rather than refusing it. Four clauses, one per
 * module, because each is one line a later round can delete and the hostile
 * client drives only the first two.
 */
function answerReadmitRule() {
  // (a) server.ts: between the answer's await and the one send of it, the
  // verified phone and the door instance are asked, and nothing is awaited.
  const server = moduleNamed('server', 'A4', "Phase 313 builder A's");
  if (server !== null) {
    // The handler is whatever function awaits the composer, however it is
    // declared: today it is the named function expression the factory returns.
    const handler = nodesOf(server).find(
      (n) =>
        (ts.isFunctionExpression(n) || ts.isFunctionDeclaration(n) || ts.isArrowFunction(n)) &&
        /await\s+deps\.answer\(/.test(codeOfNode(server, n)) &&
        !nodesOf(server).some(
          (inner) =>
            inner !== n &&
            inner.pos >= n.pos &&
            inner.end <= n.end &&
            (ts.isFunctionExpression(inner) || ts.isArrowFunction(inner)) &&
            /await\s+deps\.answer\(/.test(codeOfNode(server, inner))
        )
    );
    checked('A4', 3);
    if (handler === undefined) {
      fail('A4', `${rel(server)}: no request handler awaits deps.answer(, so this rule cannot read what is asked before the send`);
    } else {
      const text = codeOfNode(server, handler);
      const answerAt = text.search(/await\s+deps\.answer\(/);
      let sendAt = -1;
      for (const m of text.matchAll(/sendPocket\(\s*res\s*,\s*200\b/g)) sendAt = m.index;
      const between = sendAt > answerAt ? text.slice(answerAt, sendAt).replace(/^await\s+deps\.answer\(/, '') : '';
      if (sendAt === -1 || sendAt < answerAt) {
        fail('A4', `${where(server, handler)}: the composed answer is not sent after deps.answer(, so this rule cannot read the last ask`);
      } else {
        if (!/deps\.stillPaired\(\s*\w+\s*\)/.test(between)) {
          fail('A4', `${where(server, handler)}: nothing between the composed answer and its send asks deps.stillPaired( of the phone the request was verified for, so a phone Removed while its request was in flight is answered from the store as it stood after the press`);
        }
        if (!/\.stopping\(\)|\bclosing\(\)/.test(between) || !/door\?\.stopping\(\)|door\.stopping\(\)/.test(text)) {
          fail('A4', `${where(server, handler)}: nothing between the composed answer and its send asks the door INSTANCE that accepted the request whether it has begun to stop, so an answer composed inside a switch-off's join leaves a door the person closed`);
        }
        if (/\bawait\b/.test(between)) {
          fail('A4', `${where(server, handler)}: something is awaited between the last ask and the send, so the ask answers for a world that may have moved before the answer leaves`);
        }
      }
      const verified = /\w+\s*=\s*verdict\.phoneId\b/.test(text);
      checked('A4');
      if (!verified) {
        fail('A4', `${where(server, handler)}: the handler never keeps the phone its verify answered (verdict.phoneId), so the last ask cannot be about the phone this request came from`);
      }
    }
  }

  // (b) bind.ts: the listener hands each handler the door that accepted it.
  const bind = moduleNamed('bind', 'A4', "Phase 313 builder A's");
  if (bind !== null) {
    const text = codeTextOf(bind);
    checked('A4', 2);
    const handed = callsOf(bind).some(
      (c) =>
        ts.isPropertyAccessExpression(c.expression) &&
        c.expression.name.text === 'handle' &&
        c.arguments.length === 3
    );
    if (!handed) {
      fail('A4', `${rel(bind)}: the listener calls its handler with fewer than three arguments, so no handler can ask the door that accepted its request whether it is stopping`);
    }
    if (!/stopping\s*:\s*\(\)\s*=>\s*this\.shuttingDown\b/.test(text)) {
      fail('A4', `${rel(bind)}: the admission handed to a handler does not answer from THIS door's shuttingDown, so a stop that drops the module's door first leaves the handler asking about nothing`);
    }
  }

  // (c) ipc.ts: the host answers the phone question from its store, and the
  // verify it hands the handler names the phone.
  const ipc = moduleNamed('ipc', 'A4', "Phase 316.1 builder B's");
  if (ipc !== null) {
    const paired = functionsNamed(ipc, 'stillPaired');
    checked('A4', 2);
    if (paired.length !== 1) {
      fail('A4', `${rel(ipc)} declares ${String(paired.length)} stillPaired answers where the host hands the handler exactly one`);
    } else {
      const body = codeOfNode(ipc, paired[0]);
      if (!/\bphones\b/.test(body) || !/readStore\(|fields\(/.test(body) || !/phoneId/.test(body)) {
        fail('A4', `${where(ipc, paired[0])}: stillPaired does not look the phone up in the store's phones (${JSON.stringify(body.replace(/\s+/g, ' ').slice(0, 90))}), so the last ask answers something other than "is this phone still allowed"`);
      }
    }
    if (!/phoneId\s*:\s*verdict\.phone\.id\b/.test(codeTextOf(ipc))) {
      fail('A4', `${rel(ipc)}: the verify the host hands the handler does not name the phone it verified (phoneId: verdict.phone.id)`);
    }
    // (d) the premise: a Remove writes the store before its first await, so
    // the handler's last ask already sees the phone gone.
    const remove = methodOf(ipc, 'PocketHost', 'removePhone');
    checked('A4');
    if (remove === null) {
      fail('A4', `${rel(ipc)}: PocketHost declares no removePhone()`);
    } else {
      const text = codeOfNode(ipc, remove);
      const writeAt = text.search(/writePocketStore\(/);
      const awaitAt = text.search(/\bawait\b/);
      if (writeAt === -1 || (awaitAt !== -1 && awaitAt < writeAt)) {
        fail('A4', `${where(ipc, remove)}: removePhone() awaits before it writes the phone out of the store, so a request in flight is asked about a phone that is still there`);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// H2 — no ssh hand-off
// ---------------------------------------------------------------------------

/**
 * The phone's tailnet node is private to the app, so no other app on the phone
 * can dial through it, and the grant he pastes allows only the door's port: an
 * `ssh://` link could never reach anything (build/p316/SPEC.md §2 row 17). And
 * "Open in Claude" is unmeasured (§2 row 20), so the hand-off answers null.
 */
function handoffRule() {
  const contract = join(ROOT, 'src', 'shared', 'ipc', 'pocket.ts');
  const handoff = existsSync(contract) ? interfaceOf(contract, 'PocketHandoff') : null;
  checked('H2');
  if (handoff === null) {
    fail('H2', 'src/shared/ipc/pocket.ts declares no PocketHandoff, so nothing here reads its kinds');
  } else {
    const kind = handoff.members.find((m) => memberName(m) === 'kind');
    const kinds = [];
    const collect = (n) => {
      if (ts.isLiteralTypeNode(n) && ts.isStringLiteral(n.literal)) kinds.push(n.literal.text);
      ts.forEachChild(n, collect);
    };
    if (kind?.type !== undefined) collect(kind.type);
    checked('H2');
    if (kinds.includes('ssh')) {
      fail('H2', `${where(contract, kind)}: PocketHandoff.kind still admits 'ssh'. Nothing on the phone can dial ssh through the app's own node, and the grant allows the door's port alone.`);
    }
  }
  for (const file of domainFiles) {
    for (const { node, text } of codeStringsOf(file)) {
      checked('H2');
      if (/ssh:\/\//i.test(text) || /\battach(?:-session)?\s+-t\b/.test(text)) {
        fail('H2', `${where(file, node)} composes ${JSON.stringify(text.slice(0, 60))}, an ssh or tmux hand-off. The door hands off nothing in Phase 316.`);
      }
    }
  }
  const facts = moduleNamed('facts', 'H2', "Phase 316.1 builder A's");
  if (facts === null) return;
  const answers = functionsNamed(facts, 'handoff');
  checked('H2');
  if (answers.length === 0) {
    fail('H2', `${rel(facts)} answers no handoff member, so this rule cannot read that it is null`);
    return;
  }
  for (const fn of answers) {
    checked('H2');
    const body = fn.body;
    const isNull = (e) => e !== undefined && e.kind === ts.SyntaxKind.NullKeyword;
    const answersNull =
      body !== undefined &&
      (isNull(body) ||
        (ts.isBlock(body) &&
          body.statements.length === 1 &&
          ts.isReturnStatement(body.statements[0]) &&
          isNull(body.statements[0].expression)));
    if (!answersNull) {
      fail('H2', `${where(facts, fn)}: the hand-off answers ${JSON.stringify(codeOfNode(facts, fn).replace(/\s+/g, ' ').slice(0, 100))}. It answers null for every session in Phase 316: "Open in Claude" waits for a phase that measures where the URL is recorded.`);
    }
  }
}

// ---------------------------------------------------------------------------
// Q1 — the switch handles one press at a time (his ruling, 2026-09-23)
// ---------------------------------------------------------------------------

/**
 * The 316.1 reverify: on, off, on, off inside one turn left the sealed store
 * and the sheet saying OFF and the door LISTENING, and a paired phone read 200.
 * The second on waited inside `./bind.ts` for the first on's socket, the second
 * off found no door to stop, and the second on bound after it. His ruling was
 * one narrow fix: every start and stop goes through ONE serial queue owned by
 * PocketHost, and the last press decides. Every clause below is one line a
 * later "simplification" deletes with every unit test that does not interleave
 * presses still green, which is why each is read here rather than trusted.
 */
function switchQueueRule() {
  const ipc = moduleNamed('ipc', 'Q1', "Phase 316.1 builder B's");
  if (ipc === null) return;
  const serially = methodOf(ipc, 'PocketHost', 'serially');
  const openNow = methodOf(ipc, 'PocketHost', 'openNow');
  const closeNow = methodOf(ipc, 'PocketHost', 'closeNow');
  const closeNowUnless = methodOf(ipc, 'PocketHost', 'closeNowUnlessConfirmed');
  const pressed = methodOf(ipc, 'PocketHost', 'pressed');
  const setDoor = methodOf(ipc, 'PocketHost', 'setDoor');
  checked('Q1', 6);
  for (const [name, node] of [
    ['serially', serially],
    ['openNow', openNow],
    ['closeNow', closeNow],
    ['closeNowUnlessConfirmed', closeNowUnless],
    ['pressed', pressed],
    ['setDoor', setDoor]
  ]) {
    if (node === null) fail('Q1', `${rel(ipc)}: PocketHost declares no ${name}(), so there is no switch this rule can read`);
  }
  if (serially === null || openNow === null || closeNow === null || closeNowUnless === null || pressed === null || setDoor === null) return;

  // (a) THE QUEUE. The job is chained on ONE tail, and the tail is replaced by
  // one that swallows the job's rejection, so a failed press cannot stop the
  // next one. A queue that ran the job at once is no queue at all.
  const job = serially.parameters[0]?.name;
  const jobName = job !== undefined && ts.isIdentifier(job) ? job.text : null;
  const body = codeOfNode(ipc, serially.body);
  const chained = jobName === null ? null : new RegExp(`const\\s+(\\w+)\\s*=\\s*this\\.(\\w+)\\.then\\(\\s*${jobName}\\s*\\)`).exec(body);
  checked('Q1');
  if (chained === null) {
    fail('Q1', `${where(ipc, serially)}: serially() does not chain its job on the queue's tail (\`const run = this.<tail>.then(job)\`), so two presses can be inside the door at once`);
  } else {
    const [, run, tail] = chained;
    const replaced = new RegExp(`this\\.${tail}\\s*=\\s*${run}\\.then\\(\\s*\\(\\)\\s*=>\\s*undefined\\s*,\\s*\\(\\)\\s*=>\\s*undefined\\s*\\)`).test(body);
    const returned = new RegExp(`return\\s+${run}\\b`).test(body);
    const assignedElsewhere = nodesOf(ipc).filter(
      (n) =>
        ts.isBinaryExpression(n) &&
        n.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
        ts.isPropertyAccessExpression(n.left) &&
        n.left.expression.kind === ts.SyntaxKind.ThisKeyword &&
        n.left.name.text === tail &&
        !(n.pos >= serially.pos && n.end <= serially.end)
    );
    checked('Q1', 3);
    if (!replaced) fail('Q1', `${where(ipc, serially)}: serially() does not replace the tail with one that swallows the job's rejection, so one failed press would stop every press after it`);
    if (!returned) fail('Q1', `${where(ipc, serially)}: serially() does not answer the job itself, so a caller cannot wait for its own press`);
    for (const n of assignedElsewhere) fail('Q1', `${where(ipc, n)}: the queue's tail (this.${tail}) is assigned outside serially(), which cuts the queue in two`);
  }

  // (b) THE ONE STOP. stopPocketDoor is called once in src/main, inside
  // closeNow() (the one start, inside openNow(), is L5's first clause).
  const stops = [];
  for (const file of mainSources()) {
    if (file.endsWith(`${join('pocket', 'bind.ts')}`)) continue;
    for (const call of callsOf(file)) if (calleeName(call) === 'stopPocketDoor') stops.push({ file, call });
  }
  checked('Q1');
  if (stops.length !== 1 || stops[0].file !== ipc || enclosingName(stops[0].call) !== 'closeNow') {
    fail('Q1', `stopPocketDoor is called at ${stops.map((x) => `${where(x.file, x.call)} in ${enclosingName(x.call) ?? 'module scope'}`).join(', ') || 'no site at all'}. Exactly one call site stops the door, PocketHost.closeNow(), and it runs inside the queue.`);
  }

  // (c) REACHED ONLY FROM INSIDE A QUEUED JOB. Every call of the start and the
  // stops is an argument of this.serially(...), or is made by openNow() or
  // closeNowUnlessConfirmed() themselves, which only ever run inside one.
  const insideJob = new Set(['openNow', 'closeNowUnlessConfirmed']);
  const viaQueue = { openNow: 0, closeNow: 0, closeNowUnlessConfirmed: 0 };
  for (const call of callsOf(ipc)) {
    const e = call.expression;
    if (!ts.isPropertyAccessExpression(e) || e.expression.kind !== ts.SyntaxKind.ThisKeyword) continue;
    const name = e.name.text;
    if (!(name in viaQueue)) continue;
    checked('Q1');
    let n = call.parent;
    let verdict = null;
    while (n !== undefined && verdict === null) {
      if (
        ts.isCallExpression(n) &&
        ts.isPropertyAccessExpression(n.expression) &&
        n.expression.expression.kind === ts.SyntaxKind.ThisKeyword &&
        n.expression.name.text === 'serially' &&
        n.arguments.some((a) => call.pos >= a.pos && call.end <= a.end)
      ) {
        verdict = 'queue';
      } else if (ts.isMethodDeclaration(n) && n.name !== undefined && ts.isIdentifier(n.name)) {
        verdict = insideJob.has(n.name.text) ? 'job' : `method ${n.name.text}()`;
      }
      n = n.parent;
    }
    if (verdict === 'queue') viaQueue[name] += 1;
    else if (verdict !== 'job') {
      fail('Q1', `${where(ipc, call)}: this.${name}() is called from ${verdict ?? 'module scope'} outside this.serially(...), so a start or a stop can run beside another press`);
    }
  }
  checked('Q1', 2);
  if (viaQueue.openNow === 0) fail('Q1', `${rel(ipc)}: nothing reaches openNow() through this.serially(...), so the queue holds no start and this rule proved nothing`);
  if (viaQueue.closeNow === 0) fail('Q1', `${rel(ipc)}: nothing reaches closeNow() through this.serially(...), so the queue holds no stop and this rule proved nothing`);

  // (d) BOTH HALVES OF THE SWITCH count themselves as the last press before
  // their first await, and their first await is the queue.
  const offBranch = nodesOf(ipc).find(
    (n) => ts.isIfStatement(n) && n.pos >= setDoor.pos && n.end <= setDoor.end && /^!\s*on$/.test(codeOfNode(ipc, n.expression).trim())
  );
  checked('Q1', 2);
  if (offBranch === undefined) {
    fail('Q1', `${where(ipc, setDoor)}: setDoor() has no \`if (!on)\` branch, so this rule cannot read the two halves of the switch`);
  } else {
    const halves = [
      ['the off', codeOfNode(ipc, offBranch.thenStatement)],
      ['the on', codeTextOf(ipc).slice(offBranch.getEnd(), setDoor.body.getEnd())]
    ];
    for (const [half, text] of halves) {
      const counted = text.search(/this\.pressed\(\)/);
      const firstAwait = text.search(/\bawait\b/);
      if (counted === -1 || firstAwait === -1 || counted > firstAwait) {
        fail('Q1', `${where(ipc, setDoor)}: ${half} half of setDoor() does not count itself as the last press (this.pressed()) before its first await, so a start of an earlier press cannot tell it no longer decides`);
      } else if (!/^await\s+this\.serially\(/.test(text.slice(firstAwait))) {
        fail('Q1', `${where(ipc, setDoor)}: ${half} half of setDoor() awaits something other than this.serially(...) first, so it reaches the door outside the queue`);
      }
    }
  }

  // (e) THE LAST PRESS DECIDES. pressed() settles the previous press before it
  // replaces it; openNow() races the wait on the sessions against its press, and
  // after the bind a superseded press closes what it opened before its job ends.
  const pressedText = codeOfNode(ipc, pressed.body);
  const settles = pressedText.search(/\.supersede\(\)/);
  const replaces = pressedText.search(/this\.\w+\s*=\s*pressNumbered\(/);
  checked('Q1', 3);
  if (settles === -1 || replaces === -1 || settles > replaces) {
    fail('Q1', `${where(ipc, pressed)}: pressed() does not settle the previous press (supersede()) before it replaces it, so a start waiting on the sessions keeps waiting after a later press arrived`);
  }
  const openText = codeTextOf(ipc).slice(openNow.body.getStart(astOf(ipc)), openNow.body.getEnd());
  if (!/Promise\.race\(\s*\[\s*this\.deps\.beforeOpen\(\)\s*,\s*press\.superseded\s*\]\s*\)/.test(openText)) {
    fail('Q1', `${where(ipc, openNow)}: openNow() does not race the wait on the sessions against its press's superseded promise, so every press queued behind a start waits for the sessions to come up`);
  }
  const bindAt = openText.search(/startPocketDoor\(/);
  const after = bindAt === -1 ? '' : openText.slice(bindAt);
  const askAfter = after.search(/if\s*\(\s*this\.superseded\(\s*press\s*\)\s*\)/);
  const closeAfter = after.search(/this\.closeNow\(/);
  const refusalAfter = after.search(/this\.lastRefusal\s*=/);
  if (askAfter === -1 || closeAfter === -1 || closeAfter < askAfter || (refusalAfter !== -1 && closeAfter > refusalAfter)) {
    fail('Q1', `${where(ipc, openNow)}: after startPocketDoor, openNow() does not ask whether a later press arrived and close what it opened (this.closeNow()) before it says anything, so a door that bound under a superseded start is still listening when the next press runs`);
  }
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

const PHASES = [
  ['the bind', bindRules, 'L1'],
  ['the route table', routeRules, 'R1'],
  ['the table’s membership', routeMembershipRule, 'R4'],
  ['the turn limit', turnLimitRule, 'R5'],
  ['the forbidden words', forbiddenRules, 'R3'],
  ['admission', admissionRules, 'A1'],
  ['the server', serverRules, 'S1'],
  ['the self-origin direction', selfOriginDirectionRule, 'S4'],
  ['the file modes', fileModeRule, 'W1'],
  ['the bridge', bridgeRule, 'B1'],
  ['no html', noHtmlRule, 'H1'],
  ['the loopback rule', loopbackRule, 'T1'],
  ['no push route', noPushRouteRule, 'N1'],
  ['the token’s one door', tokenDoorRule, 'N2'],
  ['his tailnet key', tailnetKeyRule, 'K1'],
  ['the others', othersRule, 'O1'],
  ['the QR’s pin', qrPinRule, 'F1'],
  ['the turn reads', turnReadRule, 'T2'],
  ['the launch step', launchRule, 'L5'],
  ['the last ask before a send', answerReadmitRule, 'A4'],
  ['no ssh hand-off', handoffRule, 'H2'],
  ['one press at a time', switchQueueRule, 'Q1']
];

for (const [name, run, onError] of PHASES) {
  try {
    run();
  } catch (err) {
    fail(onError, `${name} could not be read: ${err instanceof Error ? err.message : String(err)}`);
  }
}

let red = 0;
let total = 0;
for (const [id, owner, title] of RULES) {
  const n = checks.get(id);
  total += n;
  const ok = failures.get(id).length === 0;
  if (!ok) red += 1;
  process.stdout.write(`${ok ? 'ok  ' : 'FAIL'} ${id.padEnd(4)} ${String(n).padStart(4)} check(s)  ${owner}: ${title}\n`);
}
const seconds = ((Date.now() - t0) / 1000).toFixed(2);
if (red > 0) {
  process.stdout.write('\n');
  for (const [id, owner] of RULES) {
    for (const f of failures.get(id)) process.stdout.write(`  - [p313 ${id}] ${owner}: ${f}\n`);
  }
  process.stdout.write(`\n${TAG} FAIL: ${String(red)} of ${String(RULES.length)} rules red, ${String(total)} checks, ${seconds} s.\n`);
  process.exit(1);
}
process.stdout.write(
  `\n${TAG} PASS: ${String(RULES.length)} rules, ${String(total)} checks, ${seconds} s. ` +
    'No Electron, no tmux, no ssh, no agent, no socket, nothing under the person’s home.\n'
);
process.exit(0);
