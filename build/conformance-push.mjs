#!/usr/bin/env node
/**
 * `npm run conformance:push`. The gate on the push (Phase 314).
 *
 * WHAT IT IS FOR. `src/main/push/` holds a credential — the APNs provider key,
 * with which anything can alert any phone the app is on — and it sends the
 * person's words (session names, project names) to a vendor. Every promise that
 * makes that safe is one clause in one module: one place Apple's hosts are
 * spelled, one refusal before a socket, one allowlist of fields, one age
 * function, one wake window. Every one of them is a line a later round can
 * delete with every other gate green. This file is the executable half of
 * `build/p314/SPEC.md` §2 and §3, twenty-three rules in all.
 *
 * PHASE 316.5 COMPOSES IT FOR A PERSON (build/p3165/SPEC.md §6.2). The engine
 * and the sender are built outside a harness for the first time, in
 * `src/main/alerts/index.ts`, and the four promises that make that safe are
 * rules here: H2 is raised from zero to EXACTLY ONE `allowRemote`, in that
 * module, whose value is `!isHarnessLaunch(process.env)` read by the parser;
 * P1, the production composition, built once and only after the core and a
 * second ask; P2, its place in the ordered quit; and G1 and W1 read
 * `src/main/alerts/` too. H3 reads the new tests and `probe:p316`. Its fix
 * round widened P1 (each token's environment picks Apple's host through the
 * origin's OWN parameter, and a dead token reaches the door's durable drop:
 * a verifier ablated each with every gate green) and added P3 (a harness
 * launch never opens the file panel: probe:p313's census opened one on his
 * screen and never finished). Twenty-six rules in all.
 *
 * TWO HALVES, AND THEY ARE TWO METHODS.
 *
 *   - THE STATIC HALF, here: the source read with the TypeScript compiler's own
 *     parser, as `conformance:pocket` reads, so a comment, a string and a call
 *     are each read as what they are. It STARTS NOTHING.
 *   - THE DRIVEN HALF, `build/p314/push-conformance.mts`, run through the
 *     pinned tsx: the SHIPPING sender, composer and engine with an injected
 *     clock and scheduler against the loopback APNs stand-in
 *     (`build/p314/apns-stand-in.mjs`), which it starts on `127.0.0.1` and
 *     closes in its own `finally`, behind a fence that refuses any socket to
 *     anything but `127.0.0.1` BEFORE it is made.
 *
 * WHAT IT STARTS. One plain node through `tsxCli()`, which listens on two
 * loopback ports for a few seconds and ends. No Electron, no tmux, no ssh, no
 * agent, no token, no real interface, NO NETWORK, and nothing under the
 * person's home is read or written.
 *
 * WHAT IT FAILS ON. Every failure is printed as `[p314 <rule>]`, which is what
 * `npm run ablation:p314` reads to prove each rule can go red ON ITS OWN. A
 * missing module FAILS the rules that needed it, by name, with the builder who
 * owns it: a gate that passed while `src/main/push/` was absent would go green
 * on the day the push does not exist.
 *
 *   node build/conformance-push.mjs            the gate
 *   node build/conformance-push.mjs --list     the rules, and nothing run
 */

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { tsxCli } from './ts-runner.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TAG = '[conformance:push]';
const t0 = Date.now();

/** The rules. `owner` is the clause of `build/p314/SPEC.md` the rule is the executable half of. */
const RULES = [
  ['H1', 'SPEC §2.5', 'Apple’s two hosts are each spelled ONCE in src/, inside apnsOrigin in src/main/push/apns.ts, and apnsOrigin maps the two environments to them'],
  ['H2', 'SPEC §2.5, §5.2; build/p3165/SPEC.md §6.2', 'the sender refuses cleartext to anything but 127.0.0.1/[::1] and any origin off this Mac without allowRemote, BEFORE any socket; EXACTLY ONE site in src/ passes allowRemote, in src/main/alerts/index.ts, inside its createApnsSender call, and its value is !isHarnessLaunch(process.env) with isHarnessLaunch imported from the launch gate'],
  ['H3', 'SPEC §6.3, the hard rules', 'every test, gate and probe aims the sender at loopback: no non-loopback origin literal reaches createApnsSender or connect, no allowRemote in any of them, and the driven half’s fence saw no dial'],
  ['J1', 'SPEC §2.6', 'the provider token’s signing input byte for byte, base64url with no padding, and a 64-byte ieee-p1363 signature that verifies under the scratch public key'],
  ['J2', 'SPEC §2.6', 'reuse under 50 minutes, re-mint at 50, NO re-mint when the clock went backwards, one re-mint and one retry on ExpiredProviderToken and never a third'],
  ['A1', 'SPEC §2.3', 'the three shapes byte for byte, in key order, the allowlist of keys and nothing else, at most 4096 bytes'],
  ['A2', 'SPEC §2.1, research 127 §6', 'the composer reads only the seven allowlisted row fields (AST), and driven canaries in the question, the choices, the dot and the agent never reach a payload or a header'],
  ['A3', 'SPEC §2.4', 'the ceiling: every payload at most 4096 bytes, clipped by the pinned rule exactly, deterministic, valid UTF-8'],
  ['A4', 'SPEC §2.5', 'the headers of an alert and of a badge-only send, and a device token that is not lowercase hex refused before a path is composed'],
  ['C1', 'SPEC §2.1', 'every string alert.ts draws is Tortie’s: NEEDS_YOUR_INPUT, PUSH_WAKE_SEEN, the separator, the brackets and the ellipsis; the single title is exactly `${row.name} ${row.statusLabel}`'],
  ['E1', 'SPEC §3.5, research 127 §4', 'nothing rises for working or idle, ever, and no badge rises without an alert'],
  ['E2', 'SPEC §3.5, §1.2 row 12', 'nothing rises for, and nothing counts, a row whose machine is not null'],
  ['E3', 'SPEC §3.5', 'twenty joins are one request per destination; the 30 s floor; a join-and-leave is not announced; a fall is a badge-only send'],
  ['E4', 'SPEC §1.2 row 5', 'a re-block carries the same apns-collapse-id and thread-id, so it replaces its own card; the clear between is one badge-only 0'],
  ['E5', 'SPEC §3.3', 'THE WAKE: one alert per destination saying “Seen when your Mac woke”, both edges of the window, the pending fold, the eight-hour re-mint'],
  ['E6', 'SPEC §1.2 row 16', 'the first observe seeds silently: a launch with rows already blocked sends nothing'],
  ['E7', 'SPEC §2.7', 'Apple’s answers, every row driven: drop, stop, reauth, later, retry exactly once, and a removed destination never asked'],
  ['E8', 'SPEC §3.6', 'inert: no key read, no connection and no timer with no destination; with no key, no send and one sentence'],
  ['E9', 'SPEC §7, 313’s disposer shape', 'beginShutdown closes admission on its first line before any await and cancels timers; join is bounded'],
  ['G1', 'SPEC §2.6, §3.6; build/p3165/SPEC.md §6.2', 'no key, JWT, token, payload, title, body, question or answer reaches any log call in src/main/push/, src/main/alerts/ or the seam'],
  ['W1', 'SPEC §6.4; build/p3165/SPEC.md §6.2', 'src/main/push/ names no main/logins/ and imports main/credentials/ and main/pocket/ by import type only; src/main/alerts/ names no main/logins/; src/main/pocket/ names no main/push/'],
  ['Y1', 'SPEC §3.1', 'seenAtWake is computed only by blockedAge, WAKE_WINDOW_MS is declared once, and nothing in src/main/push/ compares a stamp with a resume time'],
  ['S1', 'SPEC §1.1 row 1', 'the seam’s one status word equals statusVisual’s needs_input label in src/shared/status-words.ts, byte for byte, and the seam spells no other'],
  ['P1', 'build/p3165/SPEC.md §6.2, §5.1; its fix round', 'THE PRODUCTION COMPOSITION: createPushEngine and createApnsSender are called outside tests only in src/main/push/, the push seam and src/main/alerts/index.ts, exactly once each in the last; there the engine is built only in the function that first awaited deps.ready() and then read pushDestinations().length; the sender’s origin is a function of one parameter whose every apnsOrigin call is handed THAT parameter, so each token’s environment picks Apple’s host; the engine’s drop hands its destination’s tokenDigest to dropPushToken; and nothing under src/main/alerts/ names getGmuxCore'],
  ['P2', 'build/p3165/SPEC.md §6.2, §5.1', 'THE QUIT: in disposeMainCapabilities, beginPhoneAlertsShutdown() is called before its first await, and await joinPhoneAlerts() comes after await joinPocketDoor() and before await shutdownGmuxCore()'],
  ['P3', 'build/p3165/SPEC.md §As built, its fix round', 'THE PANEL: under src/main/alerts/ the native file panel (showOpenDialog) is opened only in src/main/alerts/index.ts, and every call to it sits in a function that FIRST returns on isHarnessLaunch(process.env), so a harness launch never meets a panel, override or none']
];

if (process.argv.includes('--list')) {
  for (const [id, owner, title] of RULES) {
    process.stdout.write(`${id.padEnd(3)} ${owner.padEnd(30)} ${title}\n`);
  }
  process.exit(0);
}

const DRIVEN = ['H1', 'H2', 'H3', 'J1', 'J2', 'A1', 'A2', 'A3', 'A4', 'E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7', 'E8', 'E9', 'Y1'];

const failures = new Map(RULES.map(([id]) => [id, []]));
const checks = new Map(RULES.map(([id]) => [id, 0]));
const fail = (id, text) => failures.get(id).push(text);
const checked = (id, n = 1) => checks.set(id, checks.get(id) + n);
const rel = (path) => relative(ROOT, path).split(sep).join('/');

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

/** Every source under a directory. Tests excluded unless `tests` is true. */
function sourcesUnder(dir, { tests = false, exts = /\.tsx?$/ } = {}) {
  const out = [];
  if (!existsSync(dir)) return out;
  const walk = (d) => {
    for (const name of readdirSync(d)) {
      const path = join(d, name);
      if (statSync(path).isDirectory()) {
        if (name === 'node_modules') continue;
        if (name === '__tests__' && !tests) continue;
        walk(path);
        continue;
      }
      if (!exts.test(name)) continue;
      if (!tests && /\.test\.tsx?$/.test(name)) continue;
      out.push(path);
    }
  };
  walk(dir);
  return out.sort();
}

const parsed = new Map();
function astOf(path) {
  let sf = parsed.get(path);
  if (sf === undefined) {
    const kind = /\.m?js$/.test(path) ? ts.ScriptKind.JS : /\.tsx$/.test(path) ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
    sf = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true, kind);
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

/** The name a call is made BY: `foo(`, `a.b.foo(` and `foo!(` all answer `foo`. */
function calleeName(call) {
  let e = call.expression;
  while (ts.isNonNullExpression(e) || ts.isParenthesizedExpression(e)) e = e.expression;
  if (ts.isIdentifier(e)) return e.text;
  if (ts.isPropertyAccessExpression(e)) return e.name.text;
  return null;
}

/** Is this node inside a type, where a literal is a type and not a value? */
function inType(node) {
  for (let p = node.parent; p !== undefined; p = p.parent) {
    if (ts.isTypeNode(p) && !ts.isExpressionWithTypeArguments(p)) return true;
    if (ts.isInterfaceDeclaration(p) || ts.isTypeAliasDeclaration(p)) return true;
  }
  return false;
}

/** Is this literal a module specifier? */
function isSpecifier(node) {
  const p = node.parent;
  if (p === undefined) return false;
  if ((ts.isImportDeclaration(p) || ts.isExportDeclaration(p)) && p.moduleSpecifier === node) return true;
  if (ts.isCallExpression(p) && (p.expression.kind === ts.SyntaxKind.ImportKeyword || calleeName(p) === 'require')) return true;
  if (ts.isExternalModuleReference(p)) return true;
  return false;
}

/** Every string a file holds AS CODE, comments excluded. */
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
    .map((node) => ({ node, text: node.text }));
}

/** The enclosing function's name, for a node. */
function enclosingFunctionName(node) {
  for (let p = node.parent; p !== undefined; p = p.parent) {
    if (ts.isFunctionDeclaration(p) && p.name !== undefined) return p.name.text;
    if (ts.isMethodDeclaration(p) && ts.isIdentifier(p.name)) return p.name.text;
    if ((ts.isArrowFunction(p) || ts.isFunctionExpression(p)) && p.parent !== undefined) {
      if (ts.isVariableDeclaration(p.parent) && ts.isIdentifier(p.parent.name)) return p.parent.name.text;
      if (ts.isPropertyAssignment(p.parent) && ts.isIdentifier(p.parent.name)) return p.parent.name.text;
    }
  }
  return null;
}

/** The src-relative path a specifier names, or null for a package. */
function targetOf(fromFile, spec) {
  if (spec.startsWith('@shared/')) return `shared/${spec.slice('@shared/'.length)}`;
  if (!spec.startsWith('.')) return null;
  const r = relative(join(ROOT, 'src'), resolve(dirname(fromFile), spec)).split(sep).join('/');
  return r.startsWith('..') ? null : r;
}

/** Every import-like edge of a file: static, re-export, dynamic, require. */
function importsOf(path) {
  const out = [];
  for (const n of nodesOf(path)) {
    if (ts.isImportDeclaration(n) && ts.isStringLiteral(n.moduleSpecifier)) {
      const clause = n.importClause;
      let typeOnly = clause !== undefined && clause.isTypeOnly;
      if (!typeOnly && clause !== undefined && clause.name === undefined && clause.namedBindings !== undefined && ts.isNamedImports(clause.namedBindings)) {
        typeOnly = clause.namedBindings.elements.length > 0 && clause.namedBindings.elements.every((e) => e.isTypeOnly);
      }
      out.push({ node: n, spec: n.moduleSpecifier.text, typeOnly, kind: 'import' });
    } else if (ts.isExportDeclaration(n) && n.moduleSpecifier !== undefined && ts.isStringLiteral(n.moduleSpecifier)) {
      out.push({ node: n, spec: n.moduleSpecifier.text, typeOnly: n.isTypeOnly, kind: 'export' });
    } else if (ts.isCallExpression(n) && n.arguments.length > 0 && ts.isStringLiteral(n.arguments[0])) {
      if (n.expression.kind === ts.SyntaxKind.ImportKeyword || calleeName(n) === 'require') {
        out.push({ node: n, spec: n.arguments[0].text, typeOnly: false, kind: 'dynamic' });
      }
    } else if (ts.isImportTypeNode(n) && ts.isLiteralTypeNode(n.argument) && ts.isStringLiteral(n.argument.literal)) {
      out.push({ node: n, spec: n.argument.literal.text, typeOnly: true, kind: 'import-type' });
    }
  }
  return out;
}

const SRC = join(ROOT, 'src');
const PUSH_DIR = join(SRC, 'main', 'push');
const APNS = join(PUSH_DIR, 'apns.ts');
const ALERT = join(PUSH_DIR, 'alert.ts');
const ENGINE = join(PUSH_DIR, 'engine.ts');
const ATTENTION = join(SRC, 'main', 'tray', 'attention.ts');
const PUSH_COPY = join(SRC, 'shared', 'push-copy.ts');
const SEAM = join(SRC, 'main', 'harness', 'push-seam.ts');
// RE-POINTED IN PHASE 316.1: `statusVisual` MOVED, byte for byte, from
// src/renderer/app/status.ts to src/shared/status-words.ts so main can answer
// the phone every session's word. The renderer re-exports it; the cases this
// rule reads live here now.
const STATUS = join(SRC, 'shared', 'status-words.ts');
const POCKET_DIR = join(SRC, 'main', 'pocket');
// PHASE 316.5: the composition that builds the engine and the sender for a
// person, and the ordered disposer it joins.
const ALERTS_DIR = join(SRC, 'main', 'alerts');
const ALERTS = join(ALERTS_DIR, 'index.ts');
const CAPABILITIES = join(SRC, 'main', 'capabilities.ts');

const allSrc = sourcesUnder(SRC);
const pushFiles = sourcesUnder(PUSH_DIR);
const alertsFiles = sourcesUnder(ALERTS_DIR);

/** A module a rule needs, or null with the rule failed by name. */
function needed(path, ruleIds, owner) {
  if (existsSync(path)) return path;
  for (const id of ruleIds) {
    fail(id, `${rel(path)} does not exist, so this rule read nothing. It is ${owner}. A gate that passed here would go green on the day the push does not exist.`);
  }
  return null;
}

/** A string literal a module binds to a const, by name, or null. */
function constString(path, name) {
  for (const n of nodesOf(path)) {
    if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === name && n.initializer !== undefined) {
      if (ts.isStringLiteral(n.initializer) || ts.isNoSubstitutionTemplateLiteral(n.initializer)) return n.initializer.text;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// H — the hosts, and the refusals
// ---------------------------------------------------------------------------

function hostRules() {
  const apns = needed(APNS, ['H1', 'H2'], 'Builder B’s sender');
  const hosts = [
    ['api.push.apple.com', (t) => t.includes('api.push.apple.com')],
    ['api.sandbox.push.apple.com', (t) => t.includes('api.sandbox.push.apple.com')]
  ];
  for (const [host, has] of hosts) {
    const found = [];
    for (const file of allSrc) {
      for (const { node, text } of codeStringsOf(file)) {
        if (has(text)) found.push({ file, node });
      }
    }
    checked('H1', found.length + 1);
    if (found.length !== 1) {
      fail('H1', `${host} is spelled ${String(found.length)} time(s) as code in src/ (${found.map((f) => where(f.file, f.node)).join(', ') || 'nowhere'}); it is spelled ONCE, inside apnsOrigin`);
      continue;
    }
    const [{ file, node }] = found;
    if (file !== APNS || enclosingFunctionName(node) !== 'apnsOrigin') {
      fail('H1', `${host} is spelled at ${where(file, node)}, inside ${String(enclosingFunctionName(node))}; the one spelling lives inside apnsOrigin in src/main/push/apns.ts`);
    }
  }

  // H2, static: EXACTLY ONE site in src/ passes allowRemote (Phase 316.5
  // raised it from the zero Phase 314 pinned), and the refusal is code.
  const passes = [];
  for (const file of allSrc) {
    for (const n of nodesOf(file)) {
      if ((ts.isPropertyAssignment(n) || ts.isShorthandPropertyAssignment(n)) && ts.isIdentifier(n.name) && n.name.text === 'allowRemote') {
        passes.push({ file, node: n });
      }
    }
  }
  checked('H2', allSrc.length);
  if (passes.length !== 1) {
    fail('H2', `allowRemote is passed at ${passes.map((p) => where(p.file, p.node)).join(', ') || 'no site'}. It is passed at EXACTLY ONE site, the production sender in src/main/alerts/index.ts, computed from !isHarnessLaunch(process.env)`);
  }
  for (const { file, node } of passes) {
    checked('H2');
    if (file !== ALERTS) {
      fail('H2', `${where(file, node)} passes allowRemote. The one site is the production sender in src/main/alerts/index.ts; a second sender that can leave this Mac is a second place his key can be sent from that nobody reviewed`);
      continue;
    }
    // Its value, READ BY THE PARSER: the negation of a call of isHarnessLaunch
    // on process.env, and nothing else.
    const init = ts.isPropertyAssignment(node) ? node.initializer : null;
    const call =
      init !== null && ts.isPrefixUnaryExpression(init) && init.operator === ts.SyntaxKind.ExclamationToken && ts.isCallExpression(init.operand)
        ? init.operand
        : null;
    const arg = call?.arguments[0];
    const exact =
      call !== null &&
      ts.isIdentifier(call.expression) &&
      call.expression.text === 'isHarnessLaunch' &&
      call.arguments.length === 1 &&
      arg !== undefined &&
      ts.isPropertyAccessExpression(arg) &&
      ts.isIdentifier(arg.expression) &&
      arg.expression.text === 'process' &&
      arg.name.text === 'env';
    if (!exact) {
      fail('H2', `${where(file, node)}: allowRemote is ${JSON.stringify(init === null ? '(shorthand)' : init.getText(astOf(file)))}, not !isHarnessLaunch(process.env). A harness launch must never be able to reach Apple, and a person's launch must`);
    }
    // Inside the createApnsSender call's own argument, so it is the sender's.
    let p = node.parent;
    while (p !== undefined && !ts.isCallExpression(p)) p = p.parent;
    if (p === undefined || calleeName(p) !== 'createApnsSender') {
      fail('H2', `${where(file, node)}: allowRemote is not a property of the createApnsSender call's own argument`);
    }
    // And the isHarnessLaunch it calls is the launch gate's, not a local one.
    const gate = importsOf(file).some(
      (i) => targetOf(file, i.spec) === 'main/harness/launch-gate' && !i.typeOnly && /\bisHarnessLaunch\b/.test(i.node.getText(astOf(file)))
    );
    const shadowed = nodesOf(file).some(
      (n) => (ts.isFunctionDeclaration(n) || ts.isVariableDeclaration(n)) && n.name !== undefined && ts.isIdentifier(n.name) && n.name.text === 'isHarnessLaunch'
    );
    if (!gate || shadowed) {
      fail('H2', `${rel(file)} does not take isHarnessLaunch from src/main/harness/launch-gate.ts${shadowed ? ', or declares one of its own' : ''}, so what the value reads is not what the launch gate decides`);
    }
  }
  if (apns !== null) {
    checked('H2');
    const code = codeTextOf(apns);
    if (!/allowRemote\s*!==\s*true/.test(code) && !/allowRemote\s*===\s*true/.test(code)) {
      fail('H2', 'src/main/push/apns.ts compares allowRemote with true nowhere, so an origin off this Mac is not refused by default');
    }
    if (!/['"]127\.0\.0\.1['"]/.test(code)) {
      fail('H2', 'src/main/push/apns.ts names no 127.0.0.1 literal, so the loopback test is not the literal-address test SPEC §2.5 pins');
    }
    if (/['"]localhost['"]/.test(code)) {
      fail('H2', 'src/main/push/apns.ts names localhost as a value; a NAME is never loopback to this sender');
    }
  }
}

/** The source with every comment blanked, for the rules that read text. */
function codeTextOf(path) {
  const text = readFileSync(path, 'utf8');
  const sf = astOf(path);
  const spans = [];
  const seen = new Set();
  const collect = (node) => {
    for (const r of ts.getLeadingCommentRanges(text, node.getFullStart()) ?? []) {
      if (!seen.has(r.pos)) {
        seen.add(r.pos);
        spans.push(r);
      }
    }
    for (const r of ts.getTrailingCommentRanges(text, node.getEnd()) ?? []) {
      if (!seen.has(r.pos)) {
        seen.add(r.pos);
        spans.push(r);
      }
    }
    ts.forEachChild(node, collect);
  };
  collect(sf);
  // Comment ranges are UTF-16 positions, so the text is blanked by UTF-16
  // unit rather than by code point.
  const units = text.split('');
  for (const span of spans) {
    for (let i = span.pos; i < span.end && i < units.length; i += 1) {
      if (units[i] !== '\n') units[i] = ' ';
    }
  }
  return units.join('');
}

// ---------------------------------------------------------------------------
// H3 — every test, gate and probe aims at loopback
// ---------------------------------------------------------------------------

function loopbackRule() {
  const files = [
    ...sourcesUnder(join(PUSH_DIR, '__tests__'), { tests: true }),
    ...sourcesUnder(join(ROOT, 'build', 'p314'), { tests: true, exts: /\.(?:mjs|mts|ts)$/ }),
    ...['conformance-push.mjs', 'ablation-p314.mjs', 'probe-p314.mjs'].map((f) => join(ROOT, 'build', f)).filter((f) => existsSync(f)),
    // PHASE 316.5: the alerts' tests, the override's, and the phone's app run.
    ...sourcesUnder(join(ALERTS_DIR, '__tests__'), { tests: true }),
    ...[
      join(SRC, 'main', 'harness', '__tests__', 'alerts-override.test.ts'),
      join(ROOT, 'build', 'p316', 'probe-p316.mjs')
    ].filter((f) => existsSync(f))
  ];
  checked('H3');
  if (!files.some((f) => f.endsWith('push-conformance.mts'))) {
    fail('H3', 'build/p314/push-conformance.mts is missing, so the one file that drives the sender was not read');
  }
  const LOOPBACK = new Set(['127.0.0.1', '[::1]', '::1']);
  const hostOfUrl = (text) => {
    const m = /^[a-z][a-z0-9+.-]*:\/\/(\[[^\]]*\]|[^/:?#]*)/i.exec(text);
    return m === null ? null : m[1];
  };
  for (const file of files) {
    const nodes = nodesOf(file);
    // The ONE exemption: the elements of an array bound to HOSTILE_ORIGINS.
    const exempt = new Set();
    for (const n of nodes) {
      if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === 'HOSTILE_ORIGINS' && n.initializer !== undefined) {
        const walk = (x) => {
          if (ts.isStringLiteral(x) || ts.isNoSubstitutionTemplateLiteral(x)) exempt.add(x);
          ts.forEachChild(x, walk);
        };
        walk(n.initializer);
      }
    }
    const consts = new Map();
    for (const n of nodes) {
      if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer !== undefined && (ts.isStringLiteral(n.initializer) || ts.isNoSubstitutionTemplateLiteral(n.initializer))) {
        consts.set(n.name.text, n.initializer);
      }
    }
    for (const n of nodes) {
      // No allowRemote in any test, gate or probe, whatever it is set to but false.
      if ((ts.isPropertyAssignment(n) || ts.isShorthandPropertyAssignment(n)) && ts.isIdentifier(n.name) && n.name.text === 'allowRemote') {
        checked('H3');
        const v = ts.isPropertyAssignment(n) ? n.initializer : null;
        if (v === null || v.kind !== ts.SyntaxKind.FalseKeyword) {
          fail('H3', `${where(file, n)} passes allowRemote. Nothing in a test, gate or probe of this phase may build a sender that can leave this Mac`);
        }
      }
      if (!ts.isCallExpression(n)) continue;
      const name = calleeName(n);
      if (name !== 'createApnsSender' && name !== 'connect') continue;
      checked('H3');
      const seen = [];
      const walk = (x) => {
        if (ts.isStringLiteral(x) || ts.isNoSubstitutionTemplateLiteral(x) || ts.isTemplateHead(x)) seen.push(x);
        if (ts.isIdentifier(x) && consts.has(x.text)) seen.push(consts.get(x.text));
        ts.forEachChild(x, walk);
      };
      for (const arg of n.arguments) walk(arg);
      for (const lit of seen) {
        if (exempt.has(lit)) continue;
        const host = hostOfUrl(lit.text) ?? (/^(?:\d{1,3}\.){3}\d{1,3}$|^localhost$/.test(lit.text) ? lit.text : null);
        if (host === null || LOOPBACK.has(host)) continue;
        fail('H3', `${where(file, n)} hands ${JSON.stringify(lit.text)} to ${name}(). Every test, gate and probe aims the sender at the loopback stand-in and nothing else`);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// A2, C1 — what the composer reads and what it says
// ---------------------------------------------------------------------------

function composerRules() {
  const alert = needed(ALERT, ['A2', 'C1'], 'Builder B’s composer');
  const engine = needed(ENGINE, ['A2'], 'Builder B’s engine');
  const FORBIDDEN = new Set(['question', 'choices', 'statusDot', 'blockedSince', 'catchUp', 'lastAnswer', 'turnCount', 'handoff', 'agent']);
  const ALLOWED = new Set(['sessionId', 'name', 'project', 'machine', 'agentLabel', 'statusLabel', 'seenAtWake']);
  for (const file of [alert, engine].filter((f) => f !== null)) {
    let allowedReads = 0;
    for (const n of nodesOf(file)) {
      let named = null;
      if (ts.isPropertyAccessExpression(n)) named = n.name.text;
      else if (ts.isElementAccessExpression(n) && ts.isStringLiteral(n.argumentExpression)) named = n.argumentExpression.text;
      else if (ts.isBindingElement(n) && ts.isObjectBindingPattern(n.parent)) {
        named = n.propertyName !== undefined && ts.isIdentifier(n.propertyName) ? n.propertyName.text : ts.isIdentifier(n.name) ? n.name.text : null;
      }
      if (named === null) continue;
      checked('A2');
      if (ALLOWED.has(named)) allowedReads += 1;
      if (FORBIDDEN.has(named)) {
        fail('A2', `${where(file, n)} reads ${JSON.stringify(named)}. The alert reads sessionId, name, project, machine, agentLabel, statusLabel and seenAtWake and nothing else: a native alert is JSON Apple reads`);
      }
    }
    if (file === alert && allowedReads < 3) {
      fail('A2', `${rel(file)} reads ${String(allowedReads)} allowlisted row field(s), so this rule read no composer at all`);
    }
  }

  if (alert === null) return;
  // C1 (a): the single title, exactly, once.
  const code = codeTextOf(alert);
  const title = '`${row.name} ${row.statusLabel}`';
  const titles = code.split(title).length - 1;
  checked('C1');
  if (titles !== 1) {
    fail('C1', `the single title ${title} appears ${String(titles)} time(s) in src/main/push/alert.ts; it is the approved mock’s first line, exactly once (build/p311/copy-drift.mjs owns it)`);
  }
  // C1 (b): every value literal is one of Tortie's pieces.
  const PIECES = new Set([' · ', '…', ' (', ')', ' ', '', 'default', 'tortie-waiting', 'utf8', 'single', 'count', 'badge']);
  for (const { node, text } of codeStringsOf(alert)) {
    if (isSpecifier(node) || inType(node)) continue;
    const p = node.parent;
    if (p !== undefined && (ts.isPropertyAssignment(p) || ts.isPropertySignature(p)) && p.name === node) continue;
    checked('C1');
    if (!PIECES.has(text)) {
      fail('C1', `${where(alert, node)} draws ${JSON.stringify(text)}. Every word an alert says is NEEDS_YOUR_INPUT, PUSH_WAKE_SEEN, a session’s own name, main’s status word, the separator, the brackets or the ellipsis — never a new word`);
    }
  }
  // C1 (c): the two words come from their owners, and say what SPEC §2.1 pins.
  const imports = importsOf(alert);
  checked('C1', 2);
  if (!imports.some((i) => targetOf(alert, i.spec) === 'main/tray/attention' && /\bNEEDS_YOUR_INPUT\b/.test(i.node.getText(astOf(alert))))) {
    fail('C1', 'src/main/push/alert.ts does not import NEEDS_YOUR_INPUT from src/main/tray/attention.ts, the tray’s own header');
  }
  if (!imports.some((i) => targetOf(alert, i.spec) === 'shared/push-copy' && /\bPUSH_WAKE_SEEN\b/.test(i.node.getText(astOf(alert))))) {
    fail('C1', 'src/main/push/alert.ts does not import PUSH_WAKE_SEEN from src/shared/push-copy.ts');
  }
  if (existsSync(ATTENTION) && constString(ATTENTION, 'NEEDS_YOUR_INPUT') !== 'Needs your input') {
    fail('C1', 'NEEDS_YOUR_INPUT in src/main/tray/attention.ts is not "Needs your input", the words ⌘J’s header draws');
  }
  if (existsSync(PUSH_COPY) && constString(PUSH_COPY, 'PUSH_WAKE_SEEN') !== 'Seen when your Mac woke') {
    fail('C1', 'PUSH_WAKE_SEEN in src/shared/push-copy.ts is not "Seen when your Mac woke" (SPEC §1.2 row 11)');
  }
}

// ---------------------------------------------------------------------------
// E9 — the disposer shape
// ---------------------------------------------------------------------------

function shutdownRule() {
  const engine = needed(ENGINE, ['E9'], 'Builder B’s engine');
  if (engine === null) return;
  let found = 0;
  for (const n of nodesOf(engine)) {
    let fn = null;
    if (ts.isMethodDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === 'beginShutdown') fn = n;
    if (ts.isPropertyAssignment(n) && ts.isIdentifier(n.name) && n.name.text === 'beginShutdown' && (ts.isArrowFunction(n.initializer) || ts.isFunctionExpression(n.initializer))) fn = n.initializer;
    if (ts.isFunctionDeclaration(n) && n.name?.text === 'beginShutdown') fn = n;
    if (fn === null || fn.body === undefined || !ts.isBlock(fn.body)) continue;
    found += 1;
    checked('E9');
    const first = fn.body.statements[0];
    const closes =
      first !== undefined &&
      ts.isExpressionStatement(first) &&
      ts.isBinaryExpression(first.expression) &&
      first.expression.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      first.expression.right.kind === ts.SyntaxKind.TrueKeyword;
    if (!closes) {
      fail('E9', `${where(engine, fn)}: beginShutdown’s FIRST statement is not the admission flag set to true. Admission closes on the first line, before anything else runs (313’s disposer shape)`);
    }
    const isAsync = (fn.modifiers ?? []).some((m) => m.kind === ts.SyntaxKind.AsyncKeyword);
    let awaits = false;
    const walk = (x) => {
      if (ts.isAwaitExpression(x)) awaits = true;
      ts.forEachChild(x, walk);
    };
    walk(fn.body);
    if (isAsync || awaits) fail('E9', `${where(engine, fn)}: beginShutdown is async or awaits; admission closes before any await`);
  }
  checked('E9');
  if (found === 0) fail('E9', 'src/main/push/engine.ts declares no beginShutdown with a body, so nothing owns the engine’s shutdown');
}

// ---------------------------------------------------------------------------
// G1 — no secret, no payload and no word of an alert in any log call
// ---------------------------------------------------------------------------

function logRule() {
  const POISON = /\b(?:tokens?|keys?|jwt|bearer|pem|p8|apt|pushToken|deviceToken|payloads?|title|body|question|answers?|authorization|signature|secret|prompt|transcript)\b/i;
  const files = [...pushFiles, ...alertsFiles, ...(existsSync(SEAM) ? [SEAM] : [])];
  checked('G1');
  if (alertsFiles.length === 0) {
    fail('G1', 'src/main/alerts/ holds no source file, so the production composition’s log calls were not read. It is Phase 316.5 builder mac’s');
  }
  if (pushFiles.length === 0) {
    fail('G1', 'src/main/push/ holds no source file, so this rule read nothing. It is Builder B’s');
    return;
  }
  for (const file of files) {
    for (const n of nodesOf(file)) {
      if (!ts.isCallExpression(n)) continue;
      const name = calleeName(n);
      if (name === null || !/^(?:debug|info|warn|error|log|trace)$/.test(name)) continue;
      for (const arg of n.arguments) {
        checked('G1');
        if (ts.isStringLiteral(arg) || ts.isNoSubstitutionTemplateLiteral(arg)) continue;
        const text = arg.getText(astOf(file));
        if (/^(?:'[^']*'|"[^"]*")(?:\s*\+\s*(?:'[^']*'|"[^"]*"))*$/s.test(text.trim())) continue;
        const hit = POISON.exec(text);
        if (hit !== null) {
          fail('G1', `${where(file, n)} hands ${JSON.stringify(text.slice(0, 80))} to ${name}(), which names ${JSON.stringify(hit[0])}. The log takes a sentence and never a value: no key, no provider token, no device token, no payload and no word of an alert`);
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// W1 — the walls
// ---------------------------------------------------------------------------

function wallRule() {
  checked('W1');
  if (pushFiles.length === 0) {
    fail('W1', 'src/main/push/ holds no source file, so this rule read nothing. It is Builder B’s');
  }
  for (const file of pushFiles) {
    for (const edge of importsOf(file)) {
      const target = targetOf(file, edge.spec);
      checked('W1');
      if (target === null) continue;
      if (target.startsWith('main/logins/') || target === 'main/logins') {
        fail('W1', `${where(file, edge.node)} names ${edge.spec}. The push names no module of the logins domain`);
      }
      if ((target.startsWith('main/credentials/') || target === 'main/credentials' || target.startsWith('main/pocket/') || target === 'main/pocket') && !edge.typeOnly) {
        fail('W1', `${where(file, edge.node)} names ${edge.spec} by value (${edge.kind}). src/main/push/ reads the credentials and pocket domains by import type ONLY; what it needs arrives injected`);
      }
    }
  }
  // PHASE 316.5: the composition that holds the sender and the key names no
  // module of the logins domain either.
  for (const file of alertsFiles) {
    for (const edge of importsOf(file)) {
      const target = targetOf(file, edge.spec);
      checked('W1');
      if (target !== null && (target.startsWith('main/logins/') || target === 'main/logins')) {
        fail('W1', `${where(file, edge.node)} names ${edge.spec}. The alerts' composition names no module of the logins domain`);
      }
    }
  }
  for (const file of sourcesUnder(POCKET_DIR)) {
    for (const edge of importsOf(file)) {
      const target = targetOf(file, edge.spec);
      checked('W1');
      if (target !== null && (target.startsWith('main/push/') || target === 'main/push')) {
        fail('W1', `${where(file, edge.node)} names ${edge.spec}. The door speaks to a phone and nothing else, and cannot name the sender`);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Y1 — the one age function
// ---------------------------------------------------------------------------

function ageRule() {
  const attention = needed(ATTENTION, ['Y1'], 'Builder A’s wake rule');
  const declared = [];
  const resumedReads = [];
  const computed = [];
  for (const file of allSrc) {
    for (const n of nodesOf(file)) {
      if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === 'WAKE_WINDOW_MS' && n.initializer !== undefined) {
        declared.push(where(file, n));
      }
      if (ts.isPropertyAccessExpression(n) && (n.name.text === 'resumedAt' || n.name.text === 'suspendedAt')) {
        const inAge = file === attention && enclosingFunctionName(n) === 'blockedAge';
        const ownField = ts.isPropertyAccessExpression(n) && n.expression.kind === ts.SyntaxKind.ThisKeyword;
        if (!inAge && !ownField) resumedReads.push(where(file, n));
      }
      if (ts.isPropertyAssignment(n) && ts.isIdentifier(n.name) && n.name.text === 'seenAtWake') {
        const init = n.initializer;
        const fromAge =
          ts.isPropertyAccessExpression(init) &&
          init.name.text === 'seenAtWake' &&
          (ts.isCallExpression(init.expression) ? calleeName(init.expression) === 'blockedAge' : true);
        if (!fromAge) computed.push(where(file, n));
      }
      if (ts.isShorthandPropertyAssignment(n) && n.name.text === 'seenAtWake') {
        if (!(file === attention && enclosingFunctionName(n) === 'blockedAge')) computed.push(where(file, n));
      }
    }
  }
  checked('Y1', 3);
  if (declared.length !== 1 || !declared[0].startsWith('src/main/tray/attention.ts:')) {
    fail('Y1', `WAKE_WINDOW_MS is declared at ${declared.join(', ') || 'nowhere'}; it is declared ONCE, in src/main/tray/attention.ts`);
  }
  if (resumedReads.length > 0) {
    fail('Y1', `a stamp is compared with a wake outside blockedAge: ${resumedReads.join(', ')}. blockedAge is the only place in src/ that reads a resume time`);
  }
  if (computed.length > 0) {
    fail('Y1', `seenAtWake is computed rather than read from blockedAge at ${computed.join(', ')}. Every surface that draws an age reads ONE function’s answer`);
  }
  for (const file of pushFiles) {
    checked('Y1');
    for (const n of nodesOf(file)) {
      if (ts.isIdentifier(n) && n.text === 'blockedAge') {
        fail('Y1', `${where(file, n)} names blockedAge. The alert reads row.seenAtWake off the door’s own row and never recomputes it, so the two cannot disagree`);
        break;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// S1 — the seam's one status word
// ---------------------------------------------------------------------------

function statusWordRule() {
  const seam = needed(SEAM, ['S1'], 'Builder C’s harness seam');
  const status = needed(STATUS, ['S1'], 'the renderer’s status table');
  if (seam === null || status === null) return;
  const labels = new Map();
  for (const n of nodesOf(status)) {
    if (!ts.isCaseClause(n) || !ts.isStringLiteral(n.expression)) continue;
    const fn = enclosingFunctionName(n);
    if (fn !== 'statusVisual') continue;
    const walk = (x) => {
      if (ts.isPropertyAssignment(x) && ts.isIdentifier(x.name) && x.name.text === 'label' && ts.isStringLiteral(x.initializer)) {
        if (!labels.has(n.expression.text)) labels.set(n.expression.text, x.initializer.text);
      }
      ts.forEachChild(x, walk);
    };
    for (const s of n.statements) walk(s);
  }
  const want = labels.get('needs_input');
  const got = constString(seam, 'SEAM_STATUS_WORD');
  checked('S1', 2);
  if (want === undefined) {
    fail('S1', 'statusVisual in src/shared/status-words.ts has no case \'needs_input\' with a literal label, so there is nothing to hold the seam’s word to');
    return;
  }
  if (got !== want) {
    fail('S1', `the seam spells the status word ${JSON.stringify(got)} where statusVisual’s needs_input arm says ${JSON.stringify(want)}. Two spellings held equal by a gate are only as good as the gate (SPEC §1.1 row 1)`);
  }
  const code = codeTextOf(seam);
  if (!/label:\s*SEAM_STATUS_WORD\b/.test(code)) {
    fail('S1', 'src/main/harness/push-seam.ts does not answer statusWord with SEAM_STATUS_WORD');
  }
  const others = new Set([...labels.entries()].filter(([k]) => k !== 'needs_input').map(([, v]) => v));
  for (const { node, text } of codeStringsOf(seam)) {
    checked('S1');
    if (others.has(text)) {
      fail('S1', `${where(seam, node)} spells ${JSON.stringify(text)}, another of statusVisual’s words. The seam spells only the one word a blocked row can have`);
    }
  }
}

// ---------------------------------------------------------------------------
// P1 — the production composition (Phase 316.5)
// ---------------------------------------------------------------------------

/** Is this node `await deps.ready()`, the door's own beforeOpen, read by the parser? */
function isAwaitedDepsReady(n) {
  if (!ts.isAwaitExpression(n) || !ts.isCallExpression(n.expression)) return false;
  const e = n.expression.expression;
  return ts.isPropertyAccessExpression(e) && e.name.text === 'ready' && ts.isIdentifier(e.expression) && e.expression.text === 'deps';
}

/**
 * Is this node an await of the core, either `await deps.ready()` itself or
 * `await ready()` where the file's own `ready` awaits `deps.ready()` (the
 * composition counts the steps parked on it, so a quit need not wait for one).
 */
function isAwaitedReady(n, wrapperAwaitsDeps) {
  if (isAwaitedDepsReady(n)) return true;
  if (!ts.isAwaitExpression(n) || !ts.isCallExpression(n.expression)) return false;
  return ts.isIdentifier(n.expression.expression) && n.expression.expression.text === 'ready' && wrapperAwaitsDeps;
}

/** Does the file declare a `ready` whose own body awaits `deps.ready()`? */
function readyWrapperAwaitsDeps(file) {
  for (const n of nodesOf(file)) {
    if (!ts.isVariableDeclaration(n) || !ts.isIdentifier(n.name) || n.name.text !== 'ready' || n.initializer === undefined) continue;
    let found = false;
    const look = (x) => {
      if (isAwaitedDepsReady(x)) found = true;
      ts.forEachChild(x, look);
    };
    look(n.initializer);
    return found;
  }
  return false;
}

/** Is this node a read of `<x>.pushDestinations().length`? */
function isDestinationCount(n) {
  return (
    ts.isPropertyAccessExpression(n) &&
    n.name.text === 'length' &&
    ts.isCallExpression(n.expression) &&
    calleeName(n.expression) === 'pushDestinations'
  );
}

/** The nearest enclosing function-like node, or null. */
function enclosingFunction(node) {
  for (let p = node.parent; p !== undefined; p = p.parent) {
    if (ts.isFunctionDeclaration(p) || ts.isMethodDeclaration(p) || ts.isArrowFunction(p) || ts.isFunctionExpression(p)) return p;
  }
  return null;
}

function compositionRule() {
  const COMPOSERS = ['createPushEngine', 'createApnsSender'];
  const sites = new Map(COMPOSERS.map((c) => [c, []]));
  for (const file of allSrc) {
    for (const n of nodesOf(file)) {
      if (!ts.isCallExpression(n)) continue;
      const name = calleeName(n);
      if (name === null || !sites.has(name)) continue;
      checked('P1');
      sites.get(name).push({ file, node: n });
      const allowed = file.startsWith(PUSH_DIR + sep) || file === SEAM || file === ALERTS;
      if (!allowed) {
        fail('P1', `${where(file, n)} calls ${name}(). Outside tests the engine and the sender are built in src/main/push/, the push seam and src/main/alerts/index.ts, and nowhere else`);
      }
    }
  }
  const alerts = needed(ALERTS, ['P1'], 'Phase 316.5 builder mac’s composition');
  if (alerts === null) return;
  for (const name of COMPOSERS) {
    const inAlerts = sites.get(name).filter((s) => s.file === ALERTS);
    checked('P1');
    if (inAlerts.length !== 1) {
      fail('P1', `src/main/alerts/index.ts calls ${name}() ${String(inAlerts.length)} time(s). The production composition builds ONE ${name === 'createPushEngine' ? 'engine' : 'sender'}`);
    }
  }
  // THE ENGINE IS BUILT ONLY AFTER THE CORE AND A SECOND ASK, in its own function.
  for (const { node } of sites.get('createPushEngine').filter((s) => s.file === ALERTS)) {
    checked('P1');
    const fn = enclosingFunction(node);
    if (fn === null || fn.body === undefined) {
      fail('P1', `${where(alerts, node)}: createPushEngine is not called inside a function`);
      continue;
    }
    let readyAt = -1;
    let askedAt = -1;
    const wrapper = readyWrapperAwaitsDeps(alerts);
    const walk = (x) => {
      // Not into a nested function: an await in a callback is not this one's.
      if (x !== fn.body && (ts.isArrowFunction(x) || ts.isFunctionExpression(x) || ts.isFunctionDeclaration(x))) return;
      if (readyAt === -1 && isAwaitedReady(x, wrapper)) readyAt = x.getStart(astOf(alerts));
      if (readyAt !== -1 && askedAt === -1 && isDestinationCount(x) && x.getStart(astOf(alerts)) > readyAt) askedAt = x.getStart(astOf(alerts));
      ts.forEachChild(x, walk);
    };
    walk(fn.body);
    const builtAt = node.getStart(astOf(alerts));
    if (readyAt === -1 || readyAt > builtAt) {
      fail('P1', `${where(alerts, node)}: the engine is built ${readyAt === -1 ? 'in a function that never awaits deps.ready()' : 'BEFORE deps.ready() is awaited'}. The composition waits for the core through the door's own beforeOpen, first, and never builds anything before it`);
    } else if (askedAt === -1 || askedAt > builtAt) {
      fail('P1', `${where(alerts, node)}: after awaiting deps.ready() the engine is built without reading pushDestinations().length again. A Remove, alerts off or a changed agreement may have landed while it waited`);
    }
  }
  // THE SENDER'S ORIGIN IS APPLE'S, BY EACH TOKEN'S ENVIRONMENT (widened by
  // the fix round: `apnsOrigin('production')` named apnsOrigin and sent every
  // development token to the production host with this rule green).
  for (const { node } of sites.get('createApnsSender').filter((s) => s.file === ALERTS)) {
    checked('P1', 2);
    const arg = node.arguments[0];
    const origin =
      arg !== undefined && ts.isObjectLiteralExpression(arg)
        ? arg.properties.find((p) => ts.isPropertyAssignment(p) && ts.isIdentifier(p.name) && p.name.text === 'origin')
        : undefined;
    const fn = origin?.initializer;
    const param =
      fn !== undefined && (ts.isArrowFunction(fn) || ts.isFunctionExpression(fn)) && fn.parameters.length === 1 && ts.isIdentifier(fn.parameters[0].name)
        ? fn.parameters[0].name.text
        : null;
    const calls = [];
    const look = (x) => {
      if (ts.isCallExpression(x) && calleeName(x) === 'apnsOrigin') calls.push(x);
      ts.forEachChild(x, look);
    };
    if (fn !== undefined) look(fn);
    if (calls.length === 0) {
      fail('P1', `${where(alerts, node)}: the sender's origin does not name apnsOrigin, so the host is not chosen by each token's environment in the one place Apple's hosts are spelled`);
    } else if (param === null) {
      fail('P1', `${where(alerts, node)}: the sender's origin is not a function of one parameter, so the environment each request asks for does not choose its host`);
    } else {
      const handed = calls.filter((c) => c.arguments.length === 1 && ts.isIdentifier(c.arguments[0]) && c.arguments[0].text === param);
      if (handed.length !== calls.length) {
        fail('P1', `${where(alerts, node)}: apnsOrigin is called with something other than the origin's own parameter \`${param}\`, so a token's environment does not pick Apple's host: a development token would be sent to the production host (or the reverse), answered BadDeviceToken and dropped`);
      }
    }
  }
  // A TOKEN APPLE CALLS DEAD REACHES THE DOOR'S DURABLE DROP, by its digest
  // (the fix round: `drop: () => undefined` was green everywhere, and the
  // engine's in-run dead set hid it until a relaunch).
  for (const { node } of sites.get('createPushEngine').filter((s) => s.file === ALERTS)) {
    checked('P1');
    const arg = node.arguments[0];
    const drop =
      arg !== undefined && ts.isObjectLiteralExpression(arg)
        ? arg.properties.find((p) => (ts.isPropertyAssignment(p) || ts.isMethodDeclaration(p)) && ts.isIdentifier(p.name) && p.name.text === 'drop')
        : undefined;
    const fn = drop === undefined ? undefined : ts.isMethodDeclaration(drop) ? drop : drop.initializer;
    const param =
      fn !== undefined && (ts.isArrowFunction(fn) || ts.isFunctionExpression(fn) || ts.isMethodDeclaration(fn)) && fn.parameters.length === 1 && ts.isIdentifier(fn.parameters[0].name)
        ? fn.parameters[0].name.text
        : null;
    let reaches = false;
    const look = (x) => {
      if (
        ts.isCallExpression(x) &&
        ts.isPropertyAccessExpression(x.expression) &&
        x.expression.name.text === 'dropPushToken' &&
        x.arguments.length === 1 &&
        ts.isPropertyAccessExpression(x.arguments[0]) &&
        x.arguments[0].name.text === 'tokenDigest' &&
        ts.isIdentifier(x.arguments[0].expression) &&
        x.arguments[0].expression.text === param
      ) {
        reaches = true;
      }
      ts.forEachChild(x, look);
    };
    if (fn !== undefined && param !== null) look(fn);
    if (!reaches) {
      fail('P1', `${where(alerts, node)}: the engine's drop does not hand its destination's tokenDigest to dropPushToken, so a token Apple called dead is forgotten only until the next launch, after which Tortie sends to it again`);
    }
  }
  // NOTHING UNDER src/main/alerts/ NAMES THE CORE'S GETTER.
  checked('P1');
  if (alertsFiles.length === 0) fail('P1', 'src/main/alerts/ holds no source file');
  for (const file of alertsFiles) {
    for (const n of nodesOf(file)) {
      if (ts.isIdentifier(n) && n.text === 'getGmuxCore') {
        checked('P1');
        fail('P1', `${where(file, n)} names getGmuxCore. The alerts wait for the core through the door's beforeOpen and never boot it`);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// P3 — the panel (Phase 316.5's fix round)
// ---------------------------------------------------------------------------

/** Is this statement `if (isHarnessLaunch(process.env)) return …;`? */
function returnsOnHarness(stmt) {
  if (!ts.isIfStatement(stmt)) return false;
  const c = stmt.expression;
  const test =
    ts.isCallExpression(c) &&
    ts.isIdentifier(c.expression) &&
    c.expression.text === 'isHarnessLaunch' &&
    c.arguments.length === 1 &&
    ts.isPropertyAccessExpression(c.arguments[0]) &&
    c.arguments[0].name.text === 'env' &&
    ts.isIdentifier(c.arguments[0].expression) &&
    c.arguments[0].expression.text === 'process';
  if (!test || stmt.elseStatement !== undefined) return false;
  const then = stmt.thenStatement;
  return ts.isReturnStatement(then) || (ts.isBlock(then) && then.statements.length === 1 && ts.isReturnStatement(then.statements[0]));
}

function panelRule() {
  const alerts = needed(ALERTS, ['P3'], 'Phase 316.5 builder mac’s composition');
  if (alerts === null) return;
  let panels = 0;
  for (const file of alertsFiles) {
    for (const n of nodesOf(file)) {
      if (!ts.isCallExpression(n) || calleeName(n) !== 'showOpenDialog') continue;
      panels += 1;
      checked('P3');
      if (file !== ALERTS) {
        fail('P3', `${where(file, n)} opens the file panel. Under src/main/alerts/ it is opened only in index.ts, behind the harness return`);
        continue;
      }
      const fn = enclosingFunction(n);
      const body = fn?.body;
      if (body === undefined || !ts.isBlock(body)) {
        fail('P3', `${where(file, n)}: the file panel is opened outside a function body that could first return on a harness launch`);
        continue;
      }
      const at = n.getStart(astOf(file));
      const guard = body.statements.find((st) => returnsOnHarness(st) && st.getStart(astOf(file)) < at);
      if (guard === undefined) {
        fail('P3', `${where(file, n)}: the file panel is opened in a function that does not FIRST return on isHarnessLaunch(process.env), so a harness launch with no override (probe:p313's census) opens a real panel on the person's screen that nothing answers`);
      }
    }
  }
  checked('P3');
  if (panels === 0) fail('P3', 'src/main/alerts/ opens no file panel at all, so this rule read nothing: a person chooses the Apple push key through it');
}

// ---------------------------------------------------------------------------
// P2 — the quit (Phase 316.5)
// ---------------------------------------------------------------------------

function quitRule() {
  const capabilities = needed(CAPABILITIES, ['P2'], 'the composition root’s');
  if (capabilities === null) return;
  let fn = null;
  for (const n of nodesOf(capabilities)) {
    if (ts.isFunctionDeclaration(n) && n.name?.text === 'disposeMainCapabilities' && n.body !== undefined) fn = n;
  }
  checked('P2');
  if (fn === null) {
    fail('P2', 'src/main/capabilities.ts declares no disposeMainCapabilities with a body');
    return;
  }
  const sf = astOf(capabilities);
  let firstAwait = -1;
  const begins = [];
  const joins = [];
  let pocketJoin = -1;
  let coreDown = -1;
  const walk = (x) => {
    if (ts.isArrowFunction(x) || ts.isFunctionExpression(x)) return;
    if (ts.isAwaitExpression(x)) {
      const at = x.getStart(sf);
      if (firstAwait === -1 || at < firstAwait) firstAwait = at;
      const name = ts.isCallExpression(x.expression) ? calleeName(x.expression) : null;
      if (name === 'joinPhoneAlerts') joins.push(at);
      if (name === 'joinPocketDoor') pocketJoin = at;
      if (name === 'shutdownGmuxCore') coreDown = at;
    } else if (ts.isCallExpression(x) && calleeName(x) === 'beginPhoneAlertsShutdown') {
      begins.push(x.getStart(sf));
    } else if (ts.isCallExpression(x) && calleeName(x) === 'joinPhoneAlerts' && !ts.isAwaitExpression(x.parent)) {
      joins.push(-2);
    }
    ts.forEachChild(x, walk);
  };
  walk(fn.body);
  checked('P2', 3);
  if (begins.length !== 1 || firstAwait === -1 || begins[0] > firstAwait) {
    fail('P2', `disposeMainCapabilities calls beginPhoneAlertsShutdown() ${String(begins.length)} time(s)${begins.length === 1 ? ', after an await' : ''}. It is called once, synchronously, before the first await, beside the door's own admission`);
  }
  if (joins.length !== 1 || joins[0] < 0) {
    fail('P2', `disposeMainCapabilities joins the phone alerts ${String(joins.length)} time(s)${joins.includes(-2) ? ', one of them not awaited' : ''}; it awaits joinPhoneAlerts() exactly once`);
  } else if (pocketJoin === -1 || coreDown === -1 || !(joins[0] > pocketJoin && joins[0] < coreDown)) {
    fail('P2', `await joinPhoneAlerts() is not between await joinPocketDoor() and await shutdownGmuxCore(). A flush in flight reads its rows through the core, so it settles before the core closes`);
  }
}

// ---------------------------------------------------------------------------
// The driven half
// ---------------------------------------------------------------------------

function drivenHalf() {
  const file = join('build', 'p314', 'push-conformance.mts');
  if (!existsSync(join(ROOT, file))) {
    for (const id of DRIVEN) fail(id, `${file} is missing, so nothing was driven`);
    return;
  }
  const run = spawnSync(process.execPath, [tsxCli(), '--tsconfig', 'tsconfig.node.json', file], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    timeout: 80_000
  });
  const out = run.stdout ?? '';
  const line = out.split('\n').find((l) => l.startsWith('P314_PUSH:'));
  if (line === undefined) {
    const tail = `${out}${run.stderr ?? ''}`.trim().split('\n').slice(-12).join(' / ');
    for (const id of DRIVEN) {
      fail(id, `the driven half printed no answer (exit ${String(run.status)}${run.signal ? `, ${run.signal}` : ''}): ${tail.slice(0, 600)}`);
    }
    return;
  }
  const report = JSON.parse(line.slice('P314_PUSH:'.length));
  for (const [id] of RULES) {
    checked(id, report.checks?.[id] ?? 0);
    for (const f of report.failures?.[id] ?? []) fail(id, `(driven) ${f}`);
  }
  for (const id of DRIVEN) {
    if ((report.checks?.[id] ?? 0) === 0 && failures.get(id).length === 0) {
      fail(id, 'the driven half made no check under this rule, so it proved nothing');
    }
  }
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

const PHASES = [
  ['the hosts', hostRules, 'H1'],
  ['the loopback rule', loopbackRule, 'H3'],
  ['the composer', composerRules, 'A2'],
  ['the shutdown', shutdownRule, 'E9'],
  ['the log', logRule, 'G1'],
  ['the walls', wallRule, 'W1'],
  ['the age function', ageRule, 'Y1'],
  ['the status word', statusWordRule, 'S1'],
  ['the production composition', compositionRule, 'P1'],
  ['the quit', quitRule, 'P2'],
  ['the panel', panelRule, 'P3'],
  ['the driven half', drivenHalf, 'E1']
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
  process.stdout.write(`${ok ? 'ok  ' : 'FAIL'} ${id.padEnd(3)} ${String(n).padStart(4)} check(s)  ${owner}: ${title}\n`);
}
const seconds = ((Date.now() - t0) / 1000).toFixed(2);
if (red > 0) {
  process.stdout.write('\n');
  for (const [id, owner] of RULES) {
    for (const f of failures.get(id)) process.stdout.write(`  - [p314 ${id}] ${owner}: ${f}\n`);
  }
  process.stdout.write(`\n${TAG} FAIL: ${String(red)} of ${String(RULES.length)} rules red, ${String(total)} checks, ${seconds} s.\n`);
  process.exit(1);
}
process.stdout.write(
  `\n${TAG} PASS: ${String(RULES.length)} rules, ${String(total)} checks, ${seconds} s. ` +
    'One plain node through the pinned tsx and two loopback listeners, both closed. No Electron, no tmux, ' +
    'no ssh, no agent, no network, nothing under the person’s home.\n'
);
process.exit(0);
