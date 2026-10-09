#!/usr/bin/env node
/**
 * assert-door-only-adds.mjs, `npm run gate:onlyadd` (Phase 333.11, "the
 * door's answers only add", build/p33311/SPEC.md §6).
 *
 * WHY IT EXISTS. The phone and the Mac update separately, so a phone on an
 * older build talks to a newer Mac and the reverse. The launch phone in
 * strangers' hands will call the same eleven routes, send the same requests
 * and refuse an answer the same way for as long as it is installed, and
 * `ios/Tortie/Door/Contract.swift` refuses a WHOLE answer when a key it
 * requires is missing. Nothing stopped a Mac release from removing or
 * renaming one, or a route the phone uses. The rule this gate enforces is
 * Paseo's (research 140 §4): "Never flip optional to required, remove a
 * field, or narrow a type." Adding a route, an optional key or a field the
 * phone ignores is allowed; adding a WORD to a closed set the phone refuses
 * outside of, raising a cap past a frozen phone bound, or lowering a limit
 * an old phone's requests fit inside is a narrowing and is not (§3).
 *
 * WHAT IT READS. Every frozen set under `ios/TortieTests/Fixtures/frozen/`:
 * `<label>.wire.json` (written by `--freeze`, never by hand, sealed) and
 * `<label>.vectors.json` (a byte copy of `vectors.json` at the freeze). The
 * phone's shapes in a set were read from the phone's own Swift by
 * `build/p33311/swift-wire.mjs`, never guessed from the Mac's composer (D1).
 *
 * THE CLAUSES, each counting what it checked; a count of zero where the set
 * holds items is red, so a scanner that stopped finding is never taken for a
 * clean tree. `npm run ablation:p33311` plants one break per clause.
 *
 *   F1  every wire parses, its `format` is one this gate reads, its seal holds
 *   F2  its vectors file is byte for byte the one its seal names
 *   F3  at least FROZEN_SETS_FLOOR sets; each holds together (answers typed,
 *       membership hashed, kinds resolved, instances and arms resolve), and
 *       its arms and unarmed list are EXACTLY what the freeze's own generator
 *       makes from its sealed types, formats and instances (the fix round:
 *       a seal anyone can recompute does not stop a resealed edit, so the
 *       arms are re-derived rather than trusted)
 *   F4  the gate and the phone half are wired (package.json's build,
 *       verification-checks, test-ios.mjs's P33311_SUITES and P33311_PROOF,
 *       DoorFrozenTests.swift, conformance:ios rule j's vectors.mjs --check)
 *
 *   A NEW MAC WITH AN OLD PHONE
 *   R1  every frozen route is a row of the shipping POCKET_ROUTES, unchanged
 *   R2  every frozen request replays through the SHIPPING route match, URL
 *       parse, verifier at its own clock, query readers and write path
 *   R3  the frozen presentations open under the SHIPPING opener, their proof
 *       holding over the shipping proof text
 *   R4  the Mac's request and connection limits are at least the frozen ones,
 *       and every word the phone sends is still a word the Mac reads
 *   R5  main still answers every frozen read route, DRIVEN (the fix round):
 *       every frozen read request goes through the SHIPPING server.ts handler
 *       into ipc.ts's own read switch, cut out by the parser and transpiled
 *       in memory over a recording `routes`, and must reach routes.<id> once
 *       with every frozen query word and be answered 200 with what it
 *       answered; every frozen /pair answer goes through server.ts's pair
 *       arm; and every frozen write is a write route
 *   R6  phoneIdOf, pairFingerprint, pairingBinding, clientKeyPinOf and
 *       spkiPinOf compute what the old phone computed
 *   A1  today's vectors still hold an instance of every frozen route that had
 *       one, and reach every type the frozen ones reached through required keys
 *   A2  every instance in today's vectors conforms to the frozen phone: keys,
 *       nulls, kinds, closed words, cases, formats and bounds
 *   A3  the Mac's TypeScript answer types still promise every frozen required
 *       key, admit null only where the phone does, and keep every closed
 *       union inside its frozen set (a branch the vectors never compose)
 *   A4  the Mac's caps stay inside the frozen phone's bounds
 *   A5  every status the door answers is one the frozen phone reads
 *
 *   AN OLD MAC WITH A NEW PHONE, read as text
 *   P0  the reader reads today's phone whole, and reads the same bytes the
 *       same way (byte-identical files give an equal projection)
 *   P1  nothing is required today that the frozen phone did not require
 *   P2  no frozen path is narrowed (kind, null, word, case, open to closed)
 *   P3  no phone bound below its frozen value; version, ports and statuses kept
 *   P4  printed, never red: whether today's wire EQUALS each frozen set
 *
 * MODES. `--freeze <label>` reads today's phone and vectors, builds the set,
 * runs every clause against it (F4 is printed and does not block a freeze,
 * because a set is frozen before the gate is wired) and writes both files;
 * it refuses an existing label unless `--replace --why "<sentence>"`, which
 * appends the replaced seal and the reason to `history` and prints every
 * projection line that moved. `--into <dir>` reads and writes the sets in
 * `dir`; `--root <dir>` judges another tree (the ablation's clone); `--json`
 * ends with one `GATE_ONLYADD:{…}` line.
 *
 * WHAT IT DOES NOT DO. It opens no socket, binds nothing, starts nothing but
 * the pinned tsx once, and reads nothing under the person's home. Its one
 * Program is `src/shared/ipc/pocket.ts` and `src/main/pocket/pairing.ts`;
 * every other file is parsed alone. It runs itself under the pinned tsx
 * (`build/ts-runner.mjs`) so it can import the shipping TypeScript.
 */

import { spawnSync } from 'node:child_process';
import { createHash, createPublicKey, verify as verifyWith } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = fileURLToPath(import.meta.url);
const REPO = resolve(dirname(HERE), '..');
const TAG = '[gate:onlyadd]';
const argv = process.argv.slice(2);
const has = (flag) => argv.includes(flag);
const valueOf = (flag) => {
  const at = argv.indexOf(flag);
  return at === -1 ? null : (argv[at + 1] ?? null);
};
const ROOT = valueOf('--root') !== null ? resolve(valueOf('--root')) : REPO;

if (process.env.P33311_GATE_INNER !== '1') {
  // THE OUTER RUN: this file again, under the repository's pinned tsx.
  const { tsxCli } = await import('./ts-runner.mjs');
  const run = spawnSync(
    process.execPath,
    [tsxCli(), '--tsconfig', join(ROOT, 'tsconfig.node.json'), HERE, ...argv],
    {
      cwd: ROOT,
      encoding: 'utf8',
      timeout: 60_000,
      maxBuffer: 32 * 1024 * 1024,
      env: { ...process.env, P33311_GATE_INNER: '1' }
    }
  );
  process.stdout.write(run.stdout ?? '');
  process.stderr.write(run.stderr ?? '');
  if (run.error !== undefined) {
    process.stdout.write(`${TAG} FAIL: ${String(run.error.message)}\n`);
    process.exit(1);
  }
  process.exit(run.status ?? 1);
}

// ---------------------------------------------------------------------------
// THE INNER RUN, under tsx
// ---------------------------------------------------------------------------

const { createRequire } = await import('node:module');
const ts = createRequire(import.meta.url)('typescript');
const reader = await import('./p33311/swift-wire.mjs');

/** A commit that adds a set raises this; a ruled retirement lowers it and names the label. */
const FROZEN_SETS_FLOOR = 1;
/** Every wire format this gate reads. A later vocabulary writes 2 and keeps reading 1 (§4.1). */
const FORMATS_READ = [1];
const FROZEN_DIR = valueOf('--into') !== null ? resolve(valueOf('--into')) : join(ROOT, 'ios', 'TortieTests', 'Fixtures', 'frozen');
const VECTORS_PATH = join(ROOT, 'ios', 'TortieTests', 'Fixtures', 'vectors.json');
const JSON_OUT = has('--json');
const FREEZE = valueOf('--freeze');
const REPLACE = has('--replace');
const WHY = valueOf('--why');
const MAX_FINDINGS = 25;
/** The made-up door the frozen requests are replayed at. */
const BASE = 'https://p33311-mac.tail00000.ts.net:8443';
// Written in sentence case on purpose: the file lives under ios/, where
// conformance:ios rule (f) refuses every token shaped like a NetworkExtension
// class (`NE` and two letters, the first a capital) in any JSON file, and an
// upper-case "never" is one.
const aboutOf = (label) =>
  `The wire Tortie's phone spoke when this set was frozen: the routes it calls, what it requires of each answer, the words and bounds it holds the Mac to, and the arms that prove it. Written by node build/assert-door-only-adds.mjs --freeze ${label}. Never edit it by hand: gate:onlyadd checks the seal on every build.`;

/** The Mac's request and connection limits an old phone was built to fit (§2.4, D5): today >= frozen. */
const MAC_LIMITS = [
  { mac: 'POCKET_KEYS_MAX_ITEMS', file: 'src/shared/ipc/pocket.ts' },
  { mac: 'POCKET_KEYS_MAX_TEXT_BYTES', file: 'src/shared/ipc/pocket.ts' },
  { mac: 'POCKET_SCROLLBACK_MAX_COUNT', file: 'src/shared/ipc/pocket.ts' },
  { mac: 'POCKET_WRITE_BODY_CAPS.end', file: 'src/main/pocket/door/limits.ts' },
  { mac: 'POCKET_WRITE_BODY_CAPS.choose', file: 'src/main/pocket/door/limits.ts' },
  { mac: 'POCKET_WRITE_BODY_CAPS.say', file: 'src/main/pocket/door/limits.ts' },
  { mac: 'POCKET_WRITE_BODY_CAPS.keys', file: 'src/main/pocket/door/limits.ts' },
  { mac: 'POCKET_PAIR_BODY_CAP_BYTES', file: 'src/main/pocket/door/limits.ts' },
  { mac: 'PER_SOURCE_MAX', file: 'src/main/pocket/door/limits.ts' },
  { mac: 'KEEP_ALIVE_TIMEOUT_MS', file: 'src/main/pocket/door/limits.ts' }
];

const ARM_OPS = { remove: ['refuse'], kind: ['refuse'], null: ['refuse'], fraction: ['refuse', 'accept'], word: ['refuse', 'accept'], add: ['refuse'], format: ['refuse'], older: ['accept'], unknown: ['accept'] };

const CLAUSES = {
  F1: 'every frozen wire parses, its format is read here, and its seal holds',
  F2: 'every frozen vectors file is the one its wire names, byte for byte',
  F3: `at least ${String(FROZEN_SETS_FLOOR)} frozen set(s), each holding together`,
  F4: 'the gate and the phone half are wired',
  R1: 'every frozen route is a row of the shipping table, unchanged',
  R2: 'every frozen request replays through the shipping door',
  R3: 'the frozen presentations open under the shipping opener',
  R4: "the Mac's limits are at least the frozen ones, and every word the phone sends is still read",
  R5: 'main still answers every frozen route',
  R6: 'the identities an old phone computes are the ones the Mac computes',
  A1: "today's vectors still cover every frozen route and every required type",
  A2: "every answer in today's vectors conforms to the frozen phone",
  A3: "the Mac's types promise every frozen key and keep every closed word inside its set",
  A4: "the Mac's caps stay inside the frozen phone's bounds",
  A5: 'every status the door answers is one the frozen phone reads',
  P0: "the reader reads today's phone whole, and the same bytes the same way",
  P1: 'nothing is required today that the frozen phone did not require',
  P2: 'no frozen path is narrowed today',
  P3: 'no phone bound below its frozen value; version, ports and statuses kept',
  P4: "today's phone wire against each frozen set (printed, never red)"
};
const state = Object.fromEntries(Object.keys(CLAUSES).map((c) => [c, { checked: 0, findings: [], expects: false, notes: [] }]));
const checked = (c, n = 1) => {
  state[c].checked += n;
};
const fail = (c, msg) => {
  state[c].findings.push(msg);
};
const expects = (c) => {
  state[c].expects = true;
};
const note = (c, msg) => {
  state[c].notes.push(msg);
};

const sha256hex = (data) => createHash('sha256').update(data).digest('hex');
const relPath = (p) => relative(ROOT, p).split(sep).join('/');
const sealOf = (wire) => {
  const { seal: _seal, ...body } = wire;
  void _seal;
  return sha256hex(reader.canonical(body));
};
/**
 * A closed word set's type is `{ words: [ … ] }`; a discriminated object's
 * `words` is `"open"` or `"closed"` (§4.2). Only the first is a word set.
 */
const isWords = (def) => Array.isArray(def?.words);
const routeOfAnswer = (name) => {
  const at = name.indexOf('-');
  return at === -1 ? name : name.slice(0, at);
};
const membershipOf = (routes) => sha256hex(routes.map((r) => `${r.method} ${r.path}`).sort().join('\n'));
const quietly = async (fn) => {
  // The write path logs one line per write to the console; the gate's own
  // output is its clauses, so those lines are held back while it replays.
  const saved = { log: console.log, warn: console.warn, info: console.info };
  console.log = () => {};
  console.warn = () => {};
  console.info = () => {};
  try {
    return await fn();
  } finally {
    Object.assign(console, saved);
  }
};

// ---------------------------------------------------------------------------
// The shipping modules
// ---------------------------------------------------------------------------

async function load(rel) {
  try {
    return await import(pathToFileURL(join(ROOT, rel)).href);
  } catch (err) {
    return { loadError: `${rel}: ${String(err?.message ?? err)}` };
  }
}
const pairing = await load('src/main/pocket/pairing.ts');
const routesMod = await load('src/main/pocket/routes.ts');
const writesMod = await load('src/main/pocket/writes.ts');
const tableMod = await load('src/main/pocket/door/table.ts');
const limitsMod = await load('src/main/pocket/door/limits.ts');
const serverMod = await load('src/main/pocket/server.ts');

// ---------------------------------------------------------------------------
// TypeScript: one Program, every other file parsed alone, constants folded
// ---------------------------------------------------------------------------

const POCKET_TS = join(ROOT, 'src', 'shared', 'ipc', 'pocket.ts');
const PAIRING_TS = join(ROOT, 'src', 'main', 'pocket', 'pairing.ts');
let programCache = null;
function program() {
  if (programCache !== null) return programCache;
  const configPath = join(ROOT, 'tsconfig.node.json');
  const config = ts.readConfigFile(configPath, ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(config.config ?? {}, ts.sys, ROOT);
  const p = ts.createProgram({ rootNames: [POCKET_TS, PAIRING_TS], options: { ...parsed.options, noEmit: true } });
  programCache = { program: p, checker: p.getTypeChecker() };
  return programCache;
}

const parsedFiles = new Map();
/** One file's AST, parsed alone (never compiled). Null when it does not exist. */
function astOf(abs) {
  if (parsedFiles.has(abs)) return parsedFiles.get(abs);
  const sf = existsSync(abs) ? ts.createSourceFile(abs, readFileSync(abs, 'utf8'), ts.ScriptTarget.Latest, true) : null;
  parsedFiles.set(abs, sf);
  return sf;
}

function eachNode(node, visit) {
  visit(node);
  ts.forEachChild(node, (child) => eachNode(child, visit));
}

/** The top-level `const NAME = …` declaration of a file. */
function constDecl(sf, name) {
  for (const st of sf.statements) {
    if (!ts.isVariableStatement(st)) continue;
    for (const d of st.declarationList.declarations) if (ts.isIdentifier(d.name) && d.name.text === name) return d;
  }
  return null;
}

/** Where an import of a module specifier from `file` lives, or null. */
function moduleFile(fromFile, spec) {
  let base = null;
  if (spec.startsWith('@shared/')) base = join(ROOT, 'src', 'shared', spec.slice('@shared/'.length));
  else if (spec.startsWith('.')) base = resolve(dirname(fromFile), spec);
  if (base === null) return null;
  for (const candidate of [base, `${base}.ts`, join(base, 'index.ts')]) if (existsSync(candidate) && candidate.endsWith('.ts')) return candidate;
  return null;
}

/**
 * Fold an expression to a value (§6.1): numeric literals with `_`, `+ - *`,
 * parentheses, `as const`, `satisfies`, `Object.freeze({ … })`, a readonly
 * tuple or object of literals, a member of one, and an identifier that names
 * such a constant in the same file or one it imports. Anything else throws
 * an Error naming what could not be read.
 */
function foldExpr(node, file, depth = 0) {
  if (depth > 20) throw new Error('a constant that refers to itself');
  const sf = astOf(file);
  if (ts.isNumericLiteral(node)) return Number(node.getText(sf).replace(/_/g, ''));
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isSatisfiesExpression?.(node) || ts.isTypeAssertionExpression?.(node)) {
    return foldExpr(node.expression, file, depth + 1);
  }
  if (ts.isPrefixUnaryExpression(node) && node.operator === ts.SyntaxKind.MinusToken) return -foldExpr(node.operand, file, depth + 1);
  if (ts.isBinaryExpression(node)) {
    const a = foldExpr(node.left, file, depth + 1);
    const b = foldExpr(node.right, file, depth + 1);
    if (node.operatorToken.kind === ts.SyntaxKind.AsteriskToken) return a * b;
    if (node.operatorToken.kind === ts.SyntaxKind.PlusToken) return a + b;
    if (node.operatorToken.kind === ts.SyntaxKind.MinusToken) return a - b;
  }
  if (ts.isArrayLiteralExpression(node)) return node.elements.map((e) => foldExpr(e, file, depth + 1));
  if (ts.isObjectLiteralExpression(node)) {
    const out = {};
    for (const p of node.properties) {
      if (!ts.isPropertyAssignment(p)) throw new Error(`a property this gate cannot fold: ${p.getText(sf)}`);
      out[p.name.getText(sf).replace(/^['"]|['"]$/g, '')] = foldExpr(p.initializer, file, depth + 1);
    }
    return out;
  }
  if (ts.isCallExpression(node) && node.expression.getText(sf) === 'Object.freeze' && node.arguments.length === 1) {
    return foldExpr(node.arguments[0], file, depth + 1);
  }
  if (ts.isPropertyAccessExpression(node)) {
    const base = foldExpr(node.expression, file, depth + 1);
    if (base === null || typeof base !== 'object' || !(node.name.text in base)) throw new Error(`${node.getText(sf)} names no member`);
    return base[node.name.text];
  }
  if (ts.isIdentifier(node)) return foldName(file, node.text, depth + 1);
  throw new Error(`\`${node.getText(sf)}\` is not a literal, an arithmetic of literals or a constant this gate can fold`);
}

/** The value of exported constant `name` (`A.b` for a member) as `file` sees it. */
function foldName(file, name, depth = 0) {
  const [head, ...members] = name.split('.');
  const sf = astOf(file);
  if (sf === null) throw new Error(`${relPath(file)} does not exist`);
  const decl = constDecl(sf, head);
  let value;
  if (decl !== null && decl.initializer !== undefined) {
    value = foldExpr(decl.initializer, file, depth + 1);
  } else {
    // An import of that name.
    let found = false;
    for (const st of sf.statements) {
      if (!ts.isImportDeclaration(st) || st.importClause?.namedBindings === undefined) continue;
      const bindings = st.importClause.namedBindings;
      if (!ts.isNamedImports(bindings)) continue;
      for (const el of bindings.elements) {
        if (el.name.text !== head) continue;
        const target = moduleFile(file, st.moduleSpecifier.text);
        if (target === null) throw new Error(`${head} is imported from ${st.moduleSpecifier.text}, which this gate cannot find`);
        value = foldName(target, (el.propertyName ?? el.name).text, depth + 1);
        found = true;
      }
    }
    if (!found) throw new Error(`${relPath(file)} declares no constant ${head}`);
  }
  for (const m of members) {
    if (value === null || typeof value !== 'object' || !(m in value)) throw new Error(`${head} has no member ${m}`);
    value = value[m];
  }
  return value;
}

/** A Mac constant's value, or `{ error }` naming it (§6.1). */
function macConstant(fileRel, name) {
  const abs = join(ROOT, fileRel);
  try {
    return { value: foldName(abs, name) };
  } catch (err) {
    return { error: `${fileRel}: ${name}: ${String(err.message)}` };
  }
}

/** The words of a Mac list (`array`, a folded constant) or a type alias of string literals (`union`). */
function macWords(fileRel, name, form) {
  if (form === 'array') {
    const c = macConstant(fileRel, name);
    if (c.error !== undefined) return c;
    return Array.isArray(c.value) && c.value.every((w) => typeof w === 'string') ? { value: c.value } : { error: `${name} is not a list of words` };
  }
  const sf = astOf(join(ROOT, fileRel));
  const alias = sf?.statements.find((s) => ts.isTypeAliasDeclaration(s) && s.name.text === name);
  if (alias === undefined) return { error: `${fileRel} declares no type ${name}` };
  const words = [];
  const collect = (n) => {
    if (ts.isUnionTypeNode(n)) n.types.forEach(collect);
    else if (ts.isLiteralTypeNode(n) && ts.isStringLiteral(n.literal)) words.push(n.literal.text);
    else throw new Error(`${name} is not a union of string literals`);
  };
  try {
    collect(alias.type);
  } catch (err) {
    return { error: String(err.message) };
  }
  return { value: words };
}

// ---------------------------------------------------------------------------
// The frozen sets, today's vectors, instances
// ---------------------------------------------------------------------------

function loadSets(dir) {
  const sets = [];
  if (!existsSync(dir)) return sets;
  for (const name of readdirSync(dir).filter((n) => n.endsWith('.wire.json')).sort()) {
    const path = join(dir, name);
    const set = { name, path, wire: null, error: null, vectorsBytes: null, vectors: null };
    try {
      set.wire = JSON.parse(readFileSync(path, 'utf8'));
    } catch (err) {
      set.error = String(err.message);
    }
    const vf = set.wire?.vectors?.file;
    if (typeof vf === 'string' && !vf.includes('/') && existsSync(join(dir, vf))) {
      set.vectorsBytes = readFileSync(join(dir, vf));
      try {
        set.vectors = JSON.parse(set.vectorsBytes.toString('utf8'));
      } catch {
        set.vectors = null;
      }
    }
    sets.push(set);
  }
  return sets;
}

/** Every instance a vectors file holds, by id, in name order: answers, `/pair` answers, QR payloads. */
function instancesOf(vectors) {
  const out = new Map();
  if (vectors === null || typeof vectors !== 'object') return out;
  const ids = [];
  for (const [name, a] of Object.entries(vectors.answers ?? {})) ids.push([`answers/${name}`, { route: routeOfAnswer(name), text: a?.json, unknownText: a?.withUnknown }]);
  for (const [name, text] of Object.entries(vectors.pairAnswers ?? {})) ids.push([`pairAnswers/${name}`, { route: 'pair', text }]);
  for (const q of vectors.qr ?? []) ids.push([`qr/${String(q?.name)}`, { route: 'qr', text: q?.payload }]);
  ids.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  for (const [id, inst] of ids) out.set(id, inst);
  return out;
}

const rootTypeOf = (wire, route) => (route === 'qr' ? (wire.qr?.answer ?? null) : (wire.routes ?? []).find((r) => r.id === route)?.answer ?? null);

/** The fields an object of `typeName` reads, given the object itself (its tag picks the case). */
function fieldsFor(wire, typeName, value, out = [], seen = new Set()) {
  if (seen.has(typeName)) return out;
  seen.add(typeName);
  const def = wire.types?.[typeName];
  if (def === undefined || isWords(def)) return out;
  if (def.tag !== undefined) {
    out.push({ owner: typeName, key: def.tag, f: { presence: 'required', null: false, kind: 'string' }, isTag: true, def });
    const word = value?.[def.tag];
    const cased = typeof word === 'string' ? def.cases?.[word] : undefined;
    for (const [key, f] of Object.entries(cased ?? {})) out.push({ owner: typeName, key, f, caseWord: word });
  }
  for (const [key, f] of Object.entries(def.fields ?? {})) out.push({ owner: typeName, key, f });
  for (const flat of def.flattens ?? []) fieldsFor(wire, flat, value, out, seen);
  return out;
}

// ---------------------------------------------------------------------------
// Formats and bounds, mirrored from the Swift each row names
// ---------------------------------------------------------------------------

function b64uStrict(text) {
  if (typeof text !== 'string' || !/^[A-Za-z0-9_-]*$/.test(text) || text.length % 4 === 1) return null;
  return Buffer.from(text, 'base64url');
}
function isPublicName(text) {
  if (typeof text !== 'string' || Buffer.byteLength(text) > 253 || !text.endsWith('.ts.net')) return false;
  const labels = text.split('.');
  return labels.length >= 3 && labels.every((l) => l.length >= 1 && l.length <= 63 && /^[a-z0-9-]+$/.test(l) && !l.startsWith('-') && !l.endsWith('-'));
}
const SPKI_HEADERS = { ed25519Spki: '302a300506032b6570032100', x25519Spki: '302a300506032b656e032100' };
const boundValue = (wire, phone) => (wire.bounds ?? []).find((b) => b.phone === phone)?.value;

function formatHolds(wire, format, v) {
  switch (format) {
    case 'mark':
      return typeof v === 'string' && /^[0-9a-f]{12}$/.test(v);
    case 'questionId':
      return typeof v === 'string' && /^[0-9a-f]{16}-(0|[1-9][0-9]{0,15})$/.test(v);
    case 'certificate': {
      const der = b64uStrict(v);
      return der !== null && der.length > 0;
    }
    case 'version':
      return v === boundValue(wire, 'PairingOffer.version');
    case 'port':
      return (boundValue(wire, 'DoorEndpoint.publicPorts') ?? []).includes(v);
    case 'publicName':
      return isPublicName(v);
    case 'pin': {
      const raw = b64uStrict(v);
      return raw !== null && raw.length === 32 && raw.toString('base64url') === v;
    }
    case 'ed25519Spki':
    case 'x25519Spki': {
      const der = b64uStrict(v);
      return der !== null && der.length === 44 && der.subarray(0, 12).toString('hex') === SPKI_HEADERS[format];
    }
    case 'secret': {
      const raw = b64uStrict(v);
      return raw !== null && raw.length >= 16 && raw.length <= 64;
    }
    case 'positive':
      return typeof v === 'number' && Number.isFinite(v) && v > 0;
    default:
      return false;
  }
}

/** A replacement outside a format, for its refuse arm (§8.2). */
function outsideFormat(format, v) {
  switch (format) {
    case 'mark':
      return '0123456789abc';
    case 'certificate':
      return '!';
    case 'version':
      return typeof v === 'number' ? v + 1 : 0;
    case 'port':
      return 443;
    case 'positive':
      return -1;
    default:
      return 'p33311';
  }
}

// ---------------------------------------------------------------------------
// Conformance (A2): an instance against the frozen phone
// ---------------------------------------------------------------------------

function kindHolds(kind, v) {
  switch (kind) {
    case 'string':
      return typeof v === 'string';
    case 'bool':
      return typeof v === 'boolean';
    case 'double':
      return typeof v === 'number' && Number.isFinite(v);
    case 'int':
      return typeof v === 'number' && Number.isInteger(v);
    case 'count':
      return typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
    case 'color':
      return typeof v === 'string' && /^#[0-9a-f]{6}$/.test(v);
    default:
      return false;
  }
}

function conform(wire, v, kind, path, out, stats) {
  if (typeof kind === 'string') {
    if (!kindHolds(kind, v)) out.push(`${path}: ${JSON.stringify(v)?.slice(0, 60)} is not a ${kind} the phone reads`);
    return;
  }
  if (kind?.array !== undefined) {
    if (!Array.isArray(v)) {
      out.push(`${path}: not an array`);
      return;
    }
    v.forEach((e, i) => conform(wire, e, kind.array, `${path}/${String(i)}`, out, stats));
    return;
  }
  const typeName = kind?.words ?? kind?.type;
  const def = wire.types?.[typeName];
  if (def === undefined) {
    out.push(`${path}: the frozen set has no type ${String(typeName)}`);
    return;
  }
  if (isWords(def)) {
    if (typeof v !== 'string' || !def.words.includes(v)) out.push(`${path}: ${JSON.stringify(v)} is not one of ${typeName}'s words (${def.words.join(', ')})`);
    return;
  }
  if (v === null || typeof v !== 'object' || Array.isArray(v)) {
    out.push(`${path}: not an object of ${typeName}`);
    return;
  }
  if (def.tag !== undefined) {
    const word = v[def.tag];
    if (typeof word !== 'string') out.push(`${path}/${def.tag}: the tag is missing or not a string`);
    else if (def.cases?.[word] === undefined && def.words === 'closed') out.push(`${path}/${def.tag}: ${JSON.stringify(word)} is not one of ${typeName}'s closed cases (${Object.keys(def.cases ?? {}).join(', ')})`);
  }
  for (const { owner, key, f, isTag, caseWord } of fieldsFor(wire, typeName, v)) {
    if (isTag) continue;
    stats.fields += 1;
    const p = `${path}/${key}`;
    const present = Object.hasOwn(v, key);
    if (f.presence === 'absent') {
      if (present) out.push(`${p}: sent where the phone refuses it (${owner}, case ${String(caseWord)})`);
      continue;
    }
    if (!present) {
      if (f.presence === 'required') out.push(`${p}: missing, and the phone requires it (${owner})`);
      continue;
    }
    const x = v[key];
    if (x === null) {
      if (!f.null) out.push(`${p}: null, and the phone does not accept null (${owner})`);
      continue;
    }
    conform(wire, x, f.kind, p, out, stats);
    for (const row of wire.formats ?? []) {
      if (row.type !== owner || row.key !== key || (row.case !== undefined && row.case !== caseWord)) continue;
      stats.formats += 1;
      if (!formatHolds(wire, row.format, x)) out.push(`${p}: ${JSON.stringify(x)?.slice(0, 40)} is not a ${row.format} (${row.swift})`);
    }
    for (const row of wire.bounds ?? []) {
      if (!(row.applies ?? []).includes(`${owner}.${key}`)) continue;
      const measured = row.measure === 'length' ? (Array.isArray(x) ? x.length : null) : row.measure === 'decoded' ? (b64uStrict(x)?.length ?? null) : typeof x === 'number' ? x : null;
      stats.bounds += 1;
      if (measured === null || measured < (row.min ?? 0) || measured > row.value) out.push(`${p}: ${String(measured)} is outside ${String(row.min ?? 0)} to ${row.phone} (${String(row.value)})`);
    }
  }
}

/** One instance's whole check: parse, its root type, the byte bounds. */
function conformInstance(wire, id, inst, text, out, stats) {
  const root = rootTypeOf(wire, inst.route);
  if (root === null) {
    out.push(`${id}: the frozen set names no route ${inst.route}`);
    return;
  }
  let value;
  try {
    value = JSON.parse(text);
  } catch {
    out.push(`${id}: not JSON`);
    return;
  }
  conform(wire, value, { type: root }, id, out, stats);
  for (const row of wire.bounds ?? []) {
    if (row.measure !== 'bytes') continue;
    const applies = inst.route === 'qr' ? row.applies.includes('qr') : row.applies.includes('answer');
    if (!applies) continue;
    stats.bounds += 1;
    const bytes = Buffer.byteLength(text, 'utf8');
    if (bytes > row.value) out.push(`${id}: ${String(bytes)} bytes, over ${row.phone} (${String(row.value)})`);
  }
}

// ---------------------------------------------------------------------------
// The arms (§8.2), generated at the freeze and sealed
// ---------------------------------------------------------------------------

const ptr = (key) => String(key).replace(/~/g, '~0').replace(/\//g, '~1');

function generateArms(wire, instances) {
  const arms = [];
  const done = new Set();
  const carried = new Set();
  const once = (id) => {
    if (done.has(id)) return false;
    done.add(id);
    return true;
  };
  const add = (arm) => arms.push({ id: `A${String(arms.length + 1).padStart(4, '0')}`, ...arm });
  for (const [instance, inst] of instances) {
    const root = rootTypeOf(wire, inst.route);
    let value;
    try {
      value = JSON.parse(inst.text);
    } catch {
      continue;
    }
    const walk = (v, kind, pointer) => {
      if (kind?.array !== undefined) {
        if (Array.isArray(v) && v.length > 0) walk(v[0], kind.array, `${pointer}/0`);
        return;
      }
      const typeName = kind?.type;
      const def = typeName === undefined ? undefined : wire.types?.[typeName];
      if (def === undefined || isWords(def) || v === null || typeof v !== 'object' || Array.isArray(v)) return;
      const optional = [];
      for (const { owner, key, f, isTag, def: tagDef, caseWord } of fieldsFor(wire, typeName, v)) {
        const fid = `${owner}.${key}`;
        const p = `${pointer}/${ptr(key)}`;
        const present = Object.hasOwn(v, key);
        if (f.presence === 'absent') {
          if (!present && once(`${fid}|add`)) add({ instance, pointer: p, op: 'add', value: 'p33311', expect: 'refuse' });
          continue;
        }
        if (!present) continue;
        if (f.presence === 'optional') optional.push(key);
        const x = v[key];
        if (x === null) continue;
        carried.add(fid);
        if (f.presence === 'required' && once(`${fid}|remove`)) add({ instance, pointer: p, op: 'remove', expect: 'refuse' });
        if (once(`${fid}|kind`)) {
          const replacement = typeof x === 'string' ? 0 : typeof x === 'number' || typeof x === 'boolean' ? 'p33311' : Array.isArray(x) ? {} : [];
          add({ instance, pointer: p, op: 'kind', value: replacement, expect: 'refuse' });
        }
        if (f.presence === 'required' && !f.null && once(`${fid}|null`)) add({ instance, pointer: p, op: 'null', value: null, expect: 'refuse' });
        if (typeof x === 'number' && ['int', 'count', 'double'].includes(f.kind) && once(`${fid}|fraction`)) {
          add({ instance, pointer: p, op: 'fraction', value: x + 0.5, expect: f.kind === 'double' ? 'accept' : 'refuse' });
        }
        if (isTag && once(`${fid}|word`)) add({ instance, pointer: p, op: 'word', value: 'p33311-unknown', expect: tagDef.words === 'closed' ? 'refuse' : 'accept' });
        if (!isTag && f.kind?.words !== undefined && once(`${fid}|word`)) add({ instance, pointer: p, op: 'word', value: 'p33311-unknown', expect: 'refuse' });
        for (const row of wire.formats ?? []) {
          if (row.type !== owner || row.key !== key || (row.case !== undefined && row.case !== caseWord)) continue;
          if (once(`${fid}|format|${row.format}`)) add({ instance, pointer: p, op: 'format', format: row.format, value: outsideFormat(row.format, x), expect: 'refuse' });
        }
        walk(x, f.kind, p);
      }
      if (optional.length > 0 && once(`${typeName}|older`)) add({ instance, pointer, op: 'older', keys: [...optional].sort(), expect: 'accept' });
    };
    if (root !== null) walk(value, { type: root }, '');
    add({ instance, pointer: '', op: 'unknown', key: 'p33311Unknown', value: { nested: [1] }, expect: 'accept' });
  }
  const unarmed = new Set();
  for (const [typeName, def] of Object.entries(wire.types ?? {})) {
    if (isWords(def)) continue;
    const all = [...Object.entries(def.fields ?? {}), ...Object.values(def.cases ?? {}).flatMap((c) => Object.entries(c))];
    for (const [key, f] of all) if (f.presence !== 'absent' && !carried.has(`${typeName}.${key}`)) unarmed.add(`${typeName}.${key}`);
  }
  return { arms, unarmed: [...unarmed].sort() };
}

/** Resolve a JSON pointer in a value: `{ parent, key, found, value }`. */
function resolvePointer(value, pointer) {
  if (pointer === '') return { parent: null, key: null, found: true, value };
  const parts = pointer.split('/').slice(1).map((p) => p.replace(/~1/g, '/').replace(/~0/g, '~'));
  let cur = value;
  for (let i = 0; i < parts.length - 1; i += 1) {
    if (cur === null || typeof cur !== 'object' || !Object.hasOwn(cur, parts[i])) return { found: false, parentFound: false };
    cur = cur[parts[i]];
  }
  const key = parts[parts.length - 1];
  const parentFound = cur !== null && typeof cur === 'object';
  return { parent: cur, key, parentFound, found: parentFound && Object.hasOwn(cur, key), value: parentFound ? cur[key] : undefined };
}

// ---------------------------------------------------------------------------
// P1/P2: today's phone against a frozen phone, structurally
// ---------------------------------------------------------------------------

function comparePhones(frozen, today, findings) {
  const seen = new Set();
  const fTypes = frozen.types ?? {};
  const tTypes = today.types ?? {};
  const fieldsIn = (types, name, word, acc = {}, guard = new Set()) => {
    const def = types[name];
    if (def === undefined || guard.has(name)) return acc;
    guard.add(name);
    Object.assign(acc, def.fields ?? {});
    if (word !== null && def.cases?.[word] !== undefined) Object.assign(acc, def.cases[word]);
    for (const flat of def.flattens ?? []) fieldsIn(types, flat, word, acc, guard);
    return acc;
  };
  /** Whether today's kind accepts every value the frozen kind accepted; pairs of types are compared as they are met. */
  const covers = (tk, fk, path) => {
    if (typeof fk === 'string' || typeof tk === 'string') {
      if (typeof tk === 'string' && typeof fk === 'string') return tk === fk || (fk === 'color' && tk === 'string') || (fk === 'count' && (tk === 'int' || tk === 'double')) || (fk === 'int' && tk === 'double');
      if (tk === 'string' && fk?.words !== undefined) return true;
      return false;
    }
    if (fk?.array !== undefined) return tk?.array !== undefined && covers(tk.array, fk.array, `${path}[]`);
    if (fk?.words !== undefined) {
      const fw = fTypes[fk.words]?.words ?? [];
      const tw = tk?.words !== undefined ? tTypes[tk.words]?.words : null;
      if (tw === null || tw === undefined) return false;
      const lost = fw.filter((w) => !tw.includes(w));
      if (lost.length > 0) findings.p2.push(`${path}: the phone no longer accepts ${lost.join(', ')}`);
      return true;
    }
    if (fk?.type !== undefined) {
      if (tk?.type === undefined) return false;
      pair(fk.type, tk.type, path);
      return true;
    }
    return false;
  };
  const pair = (fName, tName, path) => {
    const key = `${fName}|${tName}`;
    if (seen.has(key)) return;
    seen.add(key);
    const f = fTypes[fName];
    const t = tTypes[tName];
    if (f === undefined || t === undefined) {
      if (t === undefined) findings.p2.push(`${path}: today's phone reads no type ${tName}`);
      return;
    }
    if (isWords(f)) {
      if (!isWords(t)) findings.p2.push(`${path}: ${tName} is no longer a word set`);
      else {
        const lost = f.words.filter((w) => !t.words.includes(w));
        if (lost.length > 0) findings.p2.push(`${path}: the phone no longer accepts ${lost.join(', ')}`);
      }
      return;
    }
    // Discriminants: a frozen case is still a case; open never becomes closed.
    if (f.tag !== undefined) {
      if (t.tag !== f.tag) findings.p2.push(`${path}: discriminated by ${String(t.tag)} today, by ${f.tag} when frozen`);
      else {
        for (const w of Object.keys(f.cases ?? {})) if (t.cases?.[w] === undefined) findings.p2.push(`${path}: ${w} is no longer a case of ${tName}`);
        if (f.words === 'open' && t.words === 'closed') findings.p2.push(`${path}: ${tName}'s words were open and are closed today`);
      }
    } else if (t.tag !== undefined && t.words === 'closed') {
      findings.p2.push(`${path}: ${tName} is a closed discriminated set today and was not when frozen`);
    }
    const fCases = f.tag !== undefined ? Object.keys(f.cases ?? {}) : [null];
    const tCases = t.tag !== undefined ? Object.keys(t.cases ?? {}) : [null];
    // P1: nothing required today that the frozen phone did not require (same case).
    for (const w of tCases) {
      const tFields = fieldsIn(tTypes, tName, w);
      const frozenWord = f.tag !== undefined ? (w !== null && f.cases?.[w] !== undefined ? w : undefined) : null;
      if (frozenWord === undefined) continue;
      const fFields = fieldsIn(fTypes, fName, frozenWord);
      for (const [k, tf] of Object.entries(tFields)) {
        if (tf.presence !== 'required') continue;
        const ff = fFields[k];
        if (ff === undefined || ff.presence !== 'required') {
          findings.p1.push(`${path}/${k}${w === null ? '' : ` (case ${w})`}: required today, ${ff === undefined ? 'not read' : ff.presence} when frozen`);
        }
      }
    }
    // P2: every frozen path still accepts what it accepted.
    for (const w of fCases) {
      const fFields = fieldsIn(fTypes, fName, w);
      const todayWord = t.tag !== undefined ? (w !== null && t.cases?.[w] !== undefined ? w : undefined) : null;
      if (todayWord === undefined) continue;
      const tFields = fieldsIn(tTypes, tName, todayWord);
      for (const [k, ff] of Object.entries(fFields)) {
        if (ff.presence === 'absent') continue;
        const tf = tFields[k];
        const p = `${path}/${k}${w === null ? '' : ` (case ${w})`}`;
        if (tf === undefined) continue;
        if (tf.presence === 'absent') {
          findings.p2.push(`${p}: refused today, accepted when frozen`);
          continue;
        }
        if (ff.null && !tf.null) findings.p2.push(`${p}: null was accepted when frozen and is not today`);
        if (!covers(tf.kind, ff.kind, p)) findings.p2.push(`${p}: narrowed from ${JSON.stringify(ff.kind)} to ${JSON.stringify(tf.kind)}`);
      }
    }
  };
  for (const fr of frozen.routes ?? []) {
    const tr = (today.routes ?? []).find((r) => r.method === fr.method && r.path === fr.path);
    if (tr === undefined) {
      // A phone that stops calling a route asks nothing more of an old Mac.
      // A READER that stopped seeing a call is P0's: every `<x>Target` the
      // network file spells must be accounted for (swift-wire.mjs).
      findings.notes.push(`${fr.method} ${fr.path}: today's phone calls it no more, so its answer is not compared`);
      continue;
    }
    findings.pairs += 1;
    if (tr.signed !== fr.signed) findings.p2.push(`${fr.method} ${fr.path}: signed ${String(tr.signed)} today, ${String(fr.signed)} when frozen`);
    pair(fr.answer, tr.answer, `${fr.method} ${fr.path}`);
  }
  if (frozen.qr?.answer !== undefined && today.qr?.answer !== null && today.qr?.answer !== undefined) {
    findings.pairs += 1;
    pair(frozen.qr.answer, today.qr.answer, 'qr');
  }
}

// ---------------------------------------------------------------------------
// A3: the Mac's TypeScript types against the frozen phone
// ---------------------------------------------------------------------------

function tsChecks(wire, findings, counts) {
  const { program: p, checker } = program();
  const F = ts.TypeFlags;
  const partsOf = (t) => (t.isUnion() ? t.types : [t]);
  const nonNull = (t) => partsOf(t).filter((x) => (x.flags & (F.Null | F.Undefined | F.Void)) === 0);
  const hasNull = (t) => partsOf(t).some((x) => (x.flags & F.Null) !== 0);
  const hasUndefined = (t) => partsOf(t).some((x) => (x.flags & (F.Undefined | F.Void)) !== 0);
  const exported = (file, name) => {
    const sf = p.getSourceFile(file);
    const mod = sf === undefined ? undefined : checker.getSymbolAtLocation(sf);
    if (mod === undefined) return null;
    let sym = checker.getExportsOfModule(mod).find((s) => s.name === name);
    if (sym === undefined) return null;
    if ((sym.flags & ts.SymbolFlags.Alias) !== 0) sym = checker.getAliasedSymbol(sym);
    return checker.getDeclaredTypeOfSymbol(sym);
  };
  const elementOf = (t) => {
    if (checker.isArrayType(t) || checker.isTupleType(t)) return checker.getTypeArguments(t)[0] ?? null;
    return t.getNumberIndexType?.() ?? null;
  };
  const seen = new Set();
  const kindCheck = (t, kind, path) => {
    counts.paths += 1;
    const ps = nonNull(t);
    if (ps.length === 0) {
      findings.push(`${path}: never anything but null`);
      return;
    }
    if (kind === 'string' || kind === 'color') {
      if (!ps.every((x) => (x.flags & F.StringLike) !== 0)) findings.push(`${path}: ${checker.typeToString(t)} is not a string`);
      return;
    }
    if (kind === 'bool') {
      if (!ps.every((x) => (x.flags & F.BooleanLike) !== 0)) findings.push(`${path}: ${checker.typeToString(t)} is not a boolean`);
      return;
    }
    if (kind === 'double' || kind === 'int' || kind === 'count') {
      if (!ps.every((x) => (x.flags & F.NumberLike) !== 0)) findings.push(`${path}: ${checker.typeToString(t)} is not a number`);
      return;
    }
    if (kind?.array !== undefined) {
      for (const x of ps) {
        const e = elementOf(x);
        if (e === null) findings.push(`${path}: ${checker.typeToString(x)} is not an array`);
        else kindCheck(e, kind.array, `${path}[]`);
      }
      return;
    }
    const typeName = kind?.words ?? kind?.type;
    const def = wire.types?.[typeName];
    if (def === undefined) {
      findings.push(`${path}: the frozen set has no type ${String(typeName)}`);
      return;
    }
    if (isWords(def)) {
      counts.words += 1;
      for (const x of ps) {
        if (!x.isStringLiteral()) findings.push(`${path}: ${checker.typeToString(x)} where the phone holds the closed set ${typeName} (${def.words.join(', ')}): a Mac that may send any string`);
        else if (!def.words.includes(x.value)) findings.push(`${path}: '${x.value}' is a word the frozen phone refuses (${typeName}: ${def.words.join(', ')})`);
      }
      return;
    }
    for (const x of ps) objectCheck(x, typeName, path);
  };
  const objectCheck = (t, typeName, path) => {
    const key = `${typeName}|${String(t.id)}`;
    if (seen.has(key)) return;
    seen.add(key);
    const def = wire.types[typeName];
    let word = null;
    if (def.tag !== undefined) {
      const tagProp = checker.getPropertyOfType(t, def.tag);
      if (tagProp === undefined) {
        findings.push(`${path}: ${checker.typeToString(t)} carries no ${def.tag}`);
        return;
      }
      const tagType = checker.getTypeOfSymbol(tagProp);
      const words = nonNull(tagType).filter((x) => x.isStringLiteral()).map((x) => x.value);
      if (words.length !== nonNull(tagType).length) {
        if (def.words === 'closed') findings.push(`${path}/${def.tag}: ${checker.typeToString(tagType)} where the phone holds a closed set of cases`);
      }
      for (const w of words) {
        if (def.cases?.[w] === undefined) {
          if (def.words === 'closed') findings.push(`${path}/${def.tag}: '${w}' is a case the frozen phone refuses (${Object.keys(def.cases ?? {}).join(', ')})`);
          continue;
        }
        word = w;
      }
      if (words.length !== 1) word = null;
    }
    const fields = {};
    const gather = (name, guard = new Set()) => {
      if (guard.has(name)) return;
      guard.add(name);
      const d = wire.types[name];
      if (d === undefined) return;
      for (const [k, f] of Object.entries(d.fields ?? {})) fields[k] = f;
      if (word !== null) for (const [k, f] of Object.entries(d.cases?.[word] ?? {})) fields[k] = f;
      for (const flat of d.flattens ?? []) gather(flat, guard);
    };
    gather(typeName);
    for (const [k, f] of Object.entries(fields)) {
      const prop = checker.getPropertyOfType(t, k);
      const p2 = `${path}/${k}`;
      counts.paths += 1;
      if (f.presence === 'absent') {
        if (prop !== undefined && (prop.flags & ts.SymbolFlags.Optional) === 0) findings.push(`${p2}: the Mac's type carries a key the phone refuses here`);
        continue;
      }
      if (prop === undefined) {
        if (f.presence === 'required') findings.push(`${p2}: the Mac's type no longer has it, and the frozen phone requires it`);
        continue;
      }
      const pt = checker.getTypeOfSymbol(prop);
      if (f.presence === 'required' && ((prop.flags & ts.SymbolFlags.Optional) !== 0 || hasUndefined(pt))) {
        findings.push(`${p2}: optional in the Mac's type (${checker.typeToString(pt)}), and the frozen phone requires it`);
      }
      if (hasNull(pt) && !f.null) findings.push(`${p2}: the Mac's type admits null (${checker.typeToString(pt)}), and the frozen phone does not`);
      kindCheck(pt, f.kind, p2);
    }
  };
  // The answer type of every frozen route, as the Mac declares it.
  const routesAst = astOf(join(ROOT, 'src', 'main', 'pocket', 'routes.ts'));
  const composer = routesAst?.statements.find((s) => ts.isFunctionDeclaration(s) && s.name?.text === 'createPocketRoutes');
  const members = new Map();
  if (composer?.type !== undefined && ts.isTypeLiteralNode(composer.type)) {
    for (const m of composer.type.members) {
      if (!ts.isMethodSignature(m) || m.type === undefined) continue;
      let n = m.type;
      if (ts.isTypeReferenceNode(n) && n.typeName.getText(routesAst) === 'Promise' && n.typeArguments?.length === 1) n = n.typeArguments[0];
      if (ts.isUnionTypeNode(n)) {
        const rest = n.types.filter((x) => !(ts.isLiteralTypeNode(x) && x.literal.kind === ts.SyntaxKind.NullKeyword));
        if (rest.length === 1) n = rest[0];
      }
      members.set(m.name.getText(routesAst), ts.isTypeReferenceNode(n) && ts.isIdentifier(n.typeName) ? n.typeName.text : null);
    }
  } else {
    findings.push('src/main/pocket/routes.ts: createPocketRoutes declares no return type literal this gate can read');
  }
  for (const route of wire.routes ?? []) {
    let file = POCKET_TS;
    let name;
    if (route.id === 'pair') {
      file = PAIRING_TS;
      name = 'PocketPairAnswer';
    } else if (route.reads === false) {
      name = 'PocketWriteAnswer';
    } else {
      name = members.get(route.id);
      if (name === undefined || name === null) {
        findings.push(`${route.id}: createPocketRoutes declares no member answering it with a named type`);
        continue;
      }
    }
    const t = exported(file, name);
    if (t === null) {
      findings.push(`${route.id}: ${relPath(file)} exports no ${name}`);
      continue;
    }
    counts.routes += 1;
    kindCheck(t, { type: route.answer }, `${route.id} (${name})`);
  }
}

// ---------------------------------------------------------------------------
// The clauses
// ---------------------------------------------------------------------------

function clauseF(sets, inMemory) {
  if (!inMemory) {
    expects('F3');
    checked('F3');
    if (sets.length < FROZEN_SETS_FLOOR) fail('F3', `${String(sets.length)} frozen set(s) under ${relPath(FROZEN_DIR)}, below the floor of ${String(FROZEN_SETS_FLOOR)}: a frozen phone was removed or never written`);
  }
  for (const set of sets) {
    expects('F1');
    expects('F2');
    checked('F1');
    if (set.wire === null) {
      fail('F1', `${set.name}: not JSON (${String(set.error)})`);
      continue;
    }
    const w = set.wire;
    if (!FORMATS_READ.includes(w.format)) fail('F1', `${set.name}: format ${JSON.stringify(w.format)} is not one this gate reads (${FORMATS_READ.join(', ')})`);
    if (typeof w.seal !== 'string' || w.seal !== sealOf(w)) fail('F1', `${set.name}: its seal does not hold: the file was edited without --freeze (sealed ${String(w.seal)}, its body hashes to ${sealOf(w)})`);
    checked('F2');
    if (set.vectorsBytes === null) fail('F2', `${set.name}: its vectors file ${String(w.vectors?.file)} does not exist beside it`);
    else if (sha256hex(set.vectorsBytes) !== w.vectors?.sha256) fail('F2', `${set.name}: ${String(w.vectors?.file)} hashes to ${sha256hex(set.vectorsBytes)}, not the ${String(w.vectors?.sha256)} its wire names`);
    // F3: the set holds together.
    expects('F3');
    const types = w.types ?? {};
    for (const r of w.routes ?? []) {
      checked('F3');
      if (types[r.answer] === undefined) fail('F3', `${set.name}: route ${String(r.id)}'s answer ${String(r.answer)} is not one of its types`);
    }
    checked('F3');
    if (membershipOf(w.routes ?? []) !== w.routeMembership) fail('F3', `${set.name}: routeMembership ${String(w.routeMembership)} is not the sha256 of its own routes (${membershipOf(w.routes ?? [])})`);
    if (w.qr?.answer === undefined || types[w.qr.answer] === undefined) fail('F3', `${set.name}: qr.answer ${String(w.qr?.answer)} is not one of its types`);
    const named = (kind, where) => {
      if (kind === null || typeof kind !== 'object') return;
      if (kind.array !== undefined) return named(kind.array, where);
      const n = kind.type ?? kind.words;
      checked('F3');
      if (types[n] === undefined) fail('F3', `${set.name}: ${where} names ${String(n)}, which is not one of its types`);
    };
    for (const [tn, def] of Object.entries(types)) {
      for (const [k, f] of Object.entries(def.fields ?? {})) named(f.kind, `${tn}.${k}`);
      for (const [w2, c] of Object.entries(def.cases ?? {})) for (const [k, f] of Object.entries(c)) named(f.kind, `${tn}.${k} (case ${w2})`);
      for (const flat of def.flattens ?? []) named({ type: flat }, `${tn}'s flatten`);
    }
    if (set.vectors === null) {
      fail('F3', `${set.name}: its vectors cannot be read, so no instance or arm resolves`);
      continue;
    }
    const insts = instancesOf(set.vectors);
    const frozenIds = new Set(Object.keys(w.instances ?? {}));
    for (const [id, route] of Object.entries(w.instances ?? {})) {
      checked('F3');
      const inst = insts.get(id);
      if (inst === undefined) fail('F3', `${set.name}: instance ${id} is not in its vectors`);
      else if (inst.route !== route) fail('F3', `${set.name}: instance ${id} names route ${route}, its vectors say ${inst.route}`);
      if (route !== 'qr' && !(w.routes ?? []).some((r) => r.id === route)) fail('F3', `${set.name}: instance ${id} names ${route}, which is not a frozen route`);
    }
    for (const id of insts.keys()) if (!frozenIds.has(id)) fail('F3', `${set.name}: its vectors hold ${id}, which its instances do not name`);
    // THE ARMS ARE RE-DERIVED, NEVER TRUSTED (the fix round of 2026-10-08).
    // The seal is a sha256 anyone can recompute, so a file whose refuse arms
    // were deleted and then resealed passed F1, and test:ios, which asks for
    // exactly the sealed arms, would have wanted fewer rows with nothing red.
    // The arms are a function of what is sealed beside them (the types, the
    // formats, the routes, the QR's type) and of the vectors F2 holds, so the
    // freeze's own generator is run again here and must give the sealed list
    // back exactly, arm by arm, and the same unarmed fields. `generateArms`
    // is part of format 1: a later change to what it makes is a format 2,
    // which keeps format 1's generator for the sets written with it.
    checked('F3');
    const regenerated = generateArms(w, insts);
    const sealedArms = Array.isArray(w.arms) ? w.arms : [];
    if (reader.canonical(regenerated.arms) !== reader.canonical(sealedArms)) {
      const byId = new Map(sealedArms.map((a) => [a?.id, a]));
      const wantIds = new Set(regenerated.arms.map((a) => a.id));
      const differs = regenerated.arms.filter((a) => reader.canonical(byId.get(a.id) ?? null) !== reader.canonical(a)).map((a) => a.id);
      const extra = sealedArms.filter((a) => !wantIds.has(a?.id)).map((a) => String(a?.id));
      fail(
        'F3',
        `${set.name}: its ${String(sealedArms.length)} sealed arm(s) are not the ${String(regenerated.arms.length)} its own types, formats and instances make (${String(differs.length)} missing or changed${differs.length > 0 ? `, first ${differs.slice(0, 5).join(', ')}` : ''}; ${String(extra.length)} not made${extra.length > 0 ? `, first ${extra.slice(0, 5).join(', ')}` : ''}): the arms were edited by hand and resealed, and the phone's proof of the freeze would shrink with nothing red`
      );
    }
    if (reader.canonical(regenerated.unarmed) !== reader.canonical(w.unarmed ?? null)) fail('F3', `${set.name}: its unarmed list is not the ${String(regenerated.unarmed.length)} field(s) its own instances leave unarmed`);
    for (const arm of w.arms ?? []) {
      checked('F3');
      const inst = insts.get(arm.instance);
      const allowed = ARM_OPS[arm.op];
      if (allowed === undefined) {
        fail('F3', `${set.name}: arm ${String(arm.id)} has op ${String(arm.op)}, which is not one of ${Object.keys(ARM_OPS).join(', ')}`);
        continue;
      }
      if (!allowed.includes(arm.expect)) fail('F3', `${set.name}: arm ${String(arm.id)} expects ${String(arm.expect)}, which ${arm.op} never expects`);
      if (inst === undefined) {
        fail('F3', `${set.name}: arm ${String(arm.id)}'s instance ${String(arm.instance)} is not in its vectors`);
        continue;
      }
      let value;
      try {
        value = JSON.parse(inst.text);
      } catch {
        fail('F3', `${set.name}: arm ${String(arm.id)}'s instance is not JSON`);
        continue;
      }
      const at = resolvePointer(value, arm.pointer ?? '');
      if (arm.op === 'unknown') {
        if (arm.pointer !== '' || typeof arm.key !== 'string') fail('F3', `${set.name}: arm ${String(arm.id)} (unknown) must name a key at the root`);
      } else if (arm.op === 'older') {
        const obj = at.found ? at.value : null;
        if (obj === null || typeof obj !== 'object' || !Array.isArray(arm.keys) || !arm.keys.every((k) => Object.hasOwn(obj, k))) fail('F3', `${set.name}: arm ${String(arm.id)} (older) does not resolve at ${String(arm.pointer)}`);
      } else if (arm.op === 'add') {
        if (!at.parentFound || at.found) fail('F3', `${set.name}: arm ${String(arm.id)} (add) at ${String(arm.pointer)}: the key is already there or its object is not`);
      } else if (!at.found) {
        fail('F3', `${set.name}: arm ${String(arm.id)} (${arm.op}) points at ${String(arm.pointer)}, which ${arm.instance} does not hold`);
      }
    }
  }
}

function clauseF4() {
  expects('F4');
  const read = (rel) => (existsSync(join(ROOT, rel)) ? readFileSync(join(ROOT, rel), 'utf8') : null);
  checked('F4');
  let build = '';
  try {
    build = JSON.parse(read('package.json') ?? '{}').scripts?.build ?? '';
  } catch {
    build = '';
  }
  if (!build.includes('build/assert-door-only-adds.mjs')) fail('F4', "package.json's build does not run build/assert-door-only-adds.mjs");
  checked('F4');
  if (!(read('build/verification-checks.mjs') ?? '').includes("'gate:onlyadd'")) fail('F4', 'build/verification-checks.mjs does not classify gate:onlyadd');
  checked('F4');
  const testIos = read('build/p316/test-ios.mjs') ?? '';
  const suites = /export\s+const\s+P33311_SUITES\s*=\s*([^\n;]*)/.exec(testIos);
  if (suites === null || !suites[1].includes('DoorFrozenTests')) fail('F4', 'build/p316/test-ios.mjs exports no P33311_SUITES naming DoorFrozenTests');
  if (!testIos.includes('P33311_PROOF')) fail('F4', 'build/p316/test-ios.mjs does not pass P33311_PROOF');
  checked('F4');
  const swift = read('ios/TortieTests/DoorFrozenTests.swift');
  if (swift === null) fail('F4', 'ios/TortieTests/DoorFrozenTests.swift does not exist: the phone half that decodes the frozen answers is gone');
  else if (!swift.includes('Fixtures/frozen') && !(swift.includes('"frozen"') && swift.includes('"Fixtures"'))) fail('F4', 'ios/TortieTests/DoorFrozenTests.swift names no Fixtures/frozen');
  checked('F4');
  const ios = read('build/conformance-ios.mjs') ?? '';
  const j = ios.indexOf('// (j)');
  const k = ios.indexOf('// (k)', j);
  const block = j < 0 ? '' : ios.slice(j, k < 0 ? j + 2000 : k);
  if (!(block.includes('spawnSync') && block.includes("'vectors.mjs'") && block.includes("'--check'"))) fail('F4', "build/conformance-ios.mjs's rule j no longer spawns build/p316/vectors.mjs --check, so vectors.json may drift from the shipping TypeScript");
}

/** The shipping table's rows, read with the parser as conformance:pocket R4 reads them. */
function tableRows() {
  const sf = astOf(join(ROOT, 'src', 'main', 'pocket', 'door', 'table.ts'));
  const decl = sf === null ? null : constDecl(sf, 'POCKET_ROUTES');
  let init = decl?.initializer ?? null;
  if (init !== null && ts.isCallExpression(init) && init.expression.getText(sf) === 'Object.freeze') init = init.arguments[0] ?? null;
  if (init === null || !ts.isArrayLiteralExpression(init)) return null;
  const rows = [];
  for (const el of init.elements) {
    if (!ts.isObjectLiteralExpression(el)) return null;
    const row = {};
    for (const p of el.properties) {
      if (!ts.isPropertyAssignment(p) || !ts.isIdentifier(p.name)) continue;
      const v = p.initializer;
      if (ts.isStringLiteral(v)) row[p.name.text] = v.text;
      else if (v.kind === ts.SyntaxKind.TrueKeyword) row[p.name.text] = true;
      else if (v.kind === ts.SyntaxKind.FalseKeyword) row[p.name.text] = false;
    }
    rows.push(row);
  }
  return rows;
}

function clauseR1(sets) {
  const rows = tableRows();
  const ids = macConstant('src/shared/ipc/pocket.ts', 'POCKET_ROUTE_IDS');
  for (const set of sets) {
    for (const fr of set.wire?.routes ?? []) {
      expects('R1');
      checked('R1');
      if (rows === null) {
        fail('R1', 'src/main/pocket/door/table.ts: POCKET_ROUTES could not be read as a list of literal rows');
        return;
      }
      const row = rows.find((r) => r.id === fr.id);
      if (row === undefined) {
        fail('R1', `${fr.id} (${fr.method} ${fr.path}): no row of the shipping POCKET_ROUTES, so every old phone's ${fr.path} is refused`);
        continue;
      }
      for (const k of ['method', 'path', 'signed', 'windowOnly', 'reads']) {
        if (row[k] !== fr[k]) fail('R1', `${fr.id}: ${k} is ${JSON.stringify(row[k])} in the shipping table, ${JSON.stringify(fr[k])} when frozen`);
      }
      if (ids.error !== undefined) fail('R1', ids.error);
      else if (!ids.value.includes(fr.id)) fail('R1', `${fr.id} is not one of the shipping POCKET_ROUTE_IDS`);
    }
  }
}

const PKCS8 = { ed25519: '302e020100300506032b657004220420', x25519: '302e020100300506032b656e04220420' };
/** The frozen identity, opened by the SHIPPING reader over the frozen Mac seeds; the phone as its fields. */
function frozenParties(vectors) {
  const k = vectors.keys;
  const mac = pairing.openIdentity({
    signPrivate: Buffer.concat([Buffer.from(PKCS8.ed25519, 'hex'), Buffer.from(k.macSigningSeed, 'hex')]).toString('base64url'),
    exchangePrivate: Buffer.concat([Buffer.from(PKCS8.x25519, 'hex'), Buffer.from(k.macExchangeSeed, 'hex')]).toString('base64url')
  });
  const phone = {
    id: vectors.identity.phoneId,
    label: vectors.seal?.label ?? '',
    signingKey: k.phoneSigningKey,
    exchangeKey: k.phoneExchangeKey,
    clientKey: k.clientKey,
    pushToken: '',
    pushEnvironment: ''
  };
  return { mac, phone };
}

async function clauseR2(sets) {
  for (const set of sets) {
    const w = set.wire;
    const v = set.vectors;
    if (w === null || v === null) continue;
    const requests = v.requests ?? [];
    if (requests.length > 0) expects('R2');
    if (pairing.loadError !== undefined || tableMod.loadError !== undefined || routesMod.loadError !== undefined || writesMod.loadError !== undefined || limitsMod.loadError !== undefined) {
      fail('R2', `the shipping door could not be loaded: ${[pairing, tableMod, routesMod, writesMod, limitsMod].map((m) => m.loadError).filter(Boolean).join('; ')}`);
      return;
    }
    let parties;
    try {
      parties = frozenParties(v);
    } catch (err) {
      fail('R2', `${set.name}: the shipping openIdentity cannot open the frozen Mac seeds: ${String(err.message)}`);
      continue;
    }
    for (const r of requests) {
      checked('R2');
      const where = `${set.name} request ${String(r.name)}`;
      const pathname = String(r.target).split('?')[0];
      const facts = { method: r.method, target: r.target, bodySha256: sha256hex(Buffer.from(r.body ?? '', 'utf8')), timestamp: r.timestamp, nonce: r.nonce, binding: v.identity.binding };
      if (pairing.canonicalRequestText(facts) !== r.canonical) fail('R2', `${where}: the shipping canonicalRequestText no longer writes the text the old phone signed`);
      const fr = (w.routes ?? []).find((x) => x.method === r.method && x.path === pathname);
      if (fr === undefined || !fr.signed) continue; // a request on no signed route: its canonical text is its whole check
      const route = tableMod.matchPocketRoute(r.method, pathname);
      if (route === null || route.id !== fr.id) {
        fail('R2', `${where}: the shipping matchPocketRoute finds ${route === null ? 'no route' : route.id} for ${r.method} ${pathname}, not ${fr.id}`);
        continue;
      }
      const url = new URL(r.target, BASE);
      if (`${url.pathname}${url.search}` !== r.target) fail('R2', `${where}: the door's URL parser reads ${url.pathname}${url.search}`);
      if (r.id !== null && r.id !== undefined && url.searchParams.get('id') !== r.id) fail('R2', `${where}: the door reads another id`);
      const verifier = new pairing.PocketRequestVerifier({ identity: () => parties.mac, phones: () => [parties.phone], now: () => Number(r.timestamp) });
      const verdict = verifier.verify({
        method: r.method,
        target: r.target,
        body: Buffer.from(r.body ?? '', 'utf8'),
        channel: parties.phone.id,
        headers: { 'x-tortie-phone': parties.phone.id, 'x-tortie-timestamp': r.timestamp, 'x-tortie-nonce': r.nonce, 'x-tortie-signature': r.signature }
      });
      if (!verdict.ok) fail('R2', `${where}: the shipping verifier refuses it (${verdict.reason})`);
      const q = url.searchParams;
      if (fr.id === 'sessions') {
        const read = routesMod.readSessionsQuery(q);
        if (!read.ok) fail('R2', `${where}: the shipping readSessionsQuery refuses it (${read.reason})`);
        else if (r.asked !== undefined && reader.canonical(read.asked) !== reader.canonical(r.asked)) fail('R2', `${where}: the shipping readSessionsQuery reads ${JSON.stringify(read.asked)}, not ${JSON.stringify(r.asked)}`);
      } else if (fr.id === 'screen') {
        const read = routesMod.readScreenQuery(q);
        if (!read.ok) fail('R2', `${where}: the shipping readScreenQuery refuses it (${read.reason})`);
        else if (read.id !== q.get('id') || read.since !== q.get('since')) fail('R2', `${where}: the shipping readScreenQuery reads ${JSON.stringify({ id: read.id, since: read.since })}, not the id and since the target spells`);
      } else if (fr.id === 'scrollback') {
        const read = routesMod.readScrollbackQuery(q);
        if (!read.ok) fail('R2', `${where}: the shipping readScrollbackQuery refuses it (${read.reason})`);
        else if (r.page !== undefined && reader.canonical({ id: read.id, ...read.ask }) !== reader.canonical(r.page)) fail('R2', `${where}: the shipping readScrollbackQuery reads ${JSON.stringify({ id: read.id, ...read.ask })}`);
      } else if (fr.id === 'turns') {
        const read = routesMod.readTurnRange({ limit: q.get('limit'), from: q.get('from'), to: q.get('to') });
        const limit = Number(q.get('limit') ?? '');
        if (!read.ok) fail('R2', `${where}: the shipping readTurnRange refuses it (${read.reason})`);
        else if (q.get('to') !== null && read.to !== Number(q.get('to'))) fail('R2', `${where}: the shipping readTurnRange reads to=${String(read.to)}`);
        if (q.get('limit') !== null && !(Number.isFinite(limit) && limit > 0)) fail('R2', `${where}: its limit is not one the route keeps`);
      }
      if (fr.reads === false) {
        const cap = limitsMod.POCKET_WRITE_BODY_CAPS?.[fr.id];
        const bytes = Buffer.byteLength(r.body ?? '', 'utf8');
        if (typeof cap !== 'number' || bytes > cap) fail('R2', `${where}: its ${String(bytes)}-byte body is over the shipping cap ${String(cap)}`);
        const calls = [];
        const writes = {
          end: async (input) => (calls.push({ verb: 'end', input }), { outcome: 'done' }),
          choose: async (input) => (calls.push({ verb: 'choose', input }), { outcome: 'done' }),
          say: async (input) => (calls.push({ verb: 'say', input }), { outcome: 'done' }),
          keys: async (input) => (calls.push({ verb: 'keys', input }), { outcome: 'done' })
        };
        const handler = writesMod.createPocketWriteHandler({ shuttingDown: () => false, stillPaired: () => true, writes, now: () => Number(r.timestamp) });
        const answer = await quietly(() => handler(route, Buffer.from(r.body ?? '', 'utf8'), parties.phone.id, { stopping: () => false }));
        let body = null;
        try {
          body = JSON.parse(r.body);
        } catch {
          body = null;
        }
        const want = body === null ? null : {
          end: { sessionId: body.session, batch: body.batch },
          choose: { sessionId: body.session, question: body.question, mark: body.mark, marker: body.marker },
          say: { sessionId: body.session, text: body.text },
          keys: { sessionId: body.session, keys: body.keys, turn: body.turn, dialog: body.dialog }
        }[fr.id];
        if (answer?.status !== 200) fail('R2', `${where}: the shipping write path answers ${String(answer?.status)}`);
        if (calls.length !== 1 || calls[0].verb !== fr.id) fail('R2', `${where}: the shipping write path reached ${calls.map((c) => c.verb).join(', ') || 'no verb'}, not exactly ${fr.id}`);
        else if (want !== null && reader.canonical(calls[0].input) !== reader.canonical(want)) fail('R2', `${where}: the shipping write path handed the verb ${JSON.stringify(calls[0].input).slice(0, 120)}, not the frozen body's fields`);
        const out = [];
        if (typeof answer?.body === 'string') {
          conformInstance(w, `${where} answer`, { route: fr.id }, answer.body, out, { fields: 0, formats: 0, bounds: 0 });
          const parsed = JSON.parse(answer.body);
          if (parsed.verb !== fr.id || parsed.outcome !== 'done' || (body !== null && parsed.write !== body.write)) out.push(`${where}: answered ${answer.body.slice(0, 120)}`);
        } else out.push(`${where}: the shipping write path answered no body`);
        for (const o of out) fail('R2', o);
      }
    }
  }
}

function clauseR3(sets) {
  for (const set of sets) {
    const v = set.vectors;
    if (v === null || set.wire === null) continue;
    const bodies = [
      ['seal.fromPhone', v.seal?.fromPhone?.body, null],
      ['pushSeal', v.pushSeal?.body, v.pushSeal]
    ].filter(([, body]) => typeof body === 'string');
    if (bodies.length > 0) expects('R3');
    if (pairing.loadError !== undefined) {
      fail('R3', pairing.loadError);
      return;
    }
    let parties;
    try {
      parties = frozenParties(v);
    } catch (err) {
      fail('R3', `${set.name}: ${String(err.message)}`);
      continue;
    }
    const secret = Buffer.from(v.seal.secret, 'base64url');
    if (pairing.pairingChallengeOf(secret) !== v.seal.challenge) fail('R3', `${set.name}: the shipping pairingChallengeOf no longer derives the window's challenge the old phone signs over`);
    let routeIds = [];
    try {
      routeIds = macConstant('src/shared/ipc/pocket.ts', 'POCKET_ROUTE_IDS').value ?? [];
    } catch {
      routeIds = [];
    }
    const opener = new pairing.PocketPairing({
      identity: () => parties.mac,
      fieldsNow: () => ({ funnelProgram: '/p33311/gate/tailscale', tailnet: 'p33311-gate.example', publicName: 'p33311-mac.tail00000.ts.net', publicPort: 8443, bindAtLaunch: false, routes: [...routeIds], phones: [], pushAlerts: false }),
      savePhones: () => true,
      publicKeyPin: () => v.pins?.[0]?.pin ?? '',
      issueCertificate: () => v.client?.certificateDer ?? '',
      now: () => 1_790_000_000_000
    });
    for (const [name, body, push] of bodies) {
      checked('R3');
      const where = `${set.name} ${name}`;
      let outer;
      try {
        outer = JSON.parse(body);
      } catch {
        fail('R3', `${where}: its body is not JSON`);
        continue;
      }
      let opened = null;
      try {
        opened = opener.openPresentation(secret, outer);
      } catch (err) {
        fail('R3', `${where}: the shipping opener threw: ${String(err.message)}`);
        continue;
      }
      if (opened === null) {
        fail('R3', `${where}: the shipping openPresentation refuses the presentation the old phone sends, so it can never pair`);
        continue;
      }
      const want = { label: v.seal.label, signingKey: v.keys.phoneSigningKey, exchangeKey: v.keys.phoneExchangeKey, clientKey: v.keys.clientKey };
      for (const [k, x] of Object.entries(want)) if (opened[k] !== x) fail('R3', `${where}: opens to ${k} ${JSON.stringify(opened[k])?.slice(0, 40)}, not the frozen one`);
      if (push !== null && (opened.pushToken !== push.token || opened.pushEnvironment !== push.environment)) fail('R3', `${where}: opens to another alert address`);
      let proof = false;
      try {
        const text = pairing.presentationProofText(v.seal.challenge, outer.iv, outer.ct, outer.tag);
        proof = verifyWith(null, Buffer.from(text, 'utf8'), createPublicKey({ key: Buffer.from(outer.ek, 'base64url'), format: 'der', type: 'spki' }), Buffer.from(outer.sig, 'base64url'));
      } catch {
        proof = false;
      }
      if (!proof) fail('R3', `${where}: its signature does not hold over the shipping presentationProofText`);
    }
  }
}

function clauseR4(sets) {
  for (const set of sets) {
    for (const row of set.wire?.macLimits ?? []) {
      expects('R4');
      checked('R4');
      const now = macConstant(row.file, row.mac);
      if (now.error !== undefined) fail('R4', `${row.mac}: ${now.error}`);
      else if (typeof now.value !== 'number' || now.value < row.value) fail('R4', `${row.mac} is ${String(now.value)} today, below the ${String(row.value)} an old phone's requests were built to fit (${row.file})`);
    }
    for (const row of set.wire?.sends ?? []) {
      expects('R4');
      checked('R4');
      const now = macWords(row.macFile, row.mac, row.macForm);
      if (now.error !== undefined) {
        fail('R4', `${row.mac}: ${now.error}`);
        continue;
      }
      const lost = (row.words ?? []).filter((w) => !now.value.includes(w));
      if (lost.length > 0) fail('R4', `${row.mac} no longer reads ${lost.join(', ')}, which the frozen phone sends as ${row.phone}`);
    }
  }
}

/**
 * Main's read switch, found by the parser: the `answer:` arrow in
 * src/main/pocket/ipc.ts whose body switches on `route.id`.
 */
function readSwitchOf(ipc) {
  let arrow = null;
  let sw = null;
  if (ipc === null) return { arrow, sw };
  eachNode(ipc, (n) => {
    if (sw !== null || !ts.isPropertyAssignment(n) || n.name.getText(ipc) !== 'answer' || !ts.isArrowFunction(n.initializer)) return;
    eachNode(n.initializer, (m) => {
      if (sw === null && ts.isSwitchStatement(m) && m.expression.getText(ipc) === 'route.id') sw = m;
    });
    if (sw !== null) arrow = n.initializer;
  });
  return { arrow, sw };
}

/**
 * THE READ SWITCH, MADE CALLABLE (R5, the fix round of 2026-10-08). The
 * verifier added `|| query.get('v') === null` to the turns arm and
 * `query.get('v') === null ? null :` to the blocked arm: every launch phone's
 * /v1/turns and /v1/blocked (its main list) would answer 404, and this clause,
 * which read the switch as TEXT, passed both. So the arrow main runs is cut
 * out of the file by the parser, transpiled in memory and closed over a
 * `routes` the caller hands it, and the very code main runs decides what each
 * frozen request reaches, whatever shape the condition takes. It is handed
 * `routes`, `route`, `query` and `closing` and nothing else; an arm that names
 * anything else throws when driven, which is red with what it named, never
 * skipped. The text made into a function is the judged checkout's own
 * source, which this gate already runs by importing routes.ts and writes.ts;
 * `conformance:pocket` makes its tick table callable the same way.
 */
function callableReadSwitch(ipc, arrow) {
  const src = `function p33311AnswerOver(routes) {\n  return (${arrow.getText(ipc)});\n}\n`;
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.None, target: ts.ScriptTarget.ES2022 } }).outputText;
  return new Function(`${js}\nreturn p33311AnswerOver;`)();
}

/** A `routes` that answers every member with a fresh marker and records the call. */
function recordingRoutes() {
  const calls = [];
  const routes = new Proxy(
    {},
    {
      get: (_target, member) =>
        typeof member !== 'string' || member === 'then'
          ? undefined
          : (...args) => {
              const answer = { p33311Answer: calls.length };
              calls.push({ member, args, answer });
              return answer;
            }
    }
  );
  return { routes, calls };
}

/** Does a frozen query word reach a route's arguments, whatever shape the arm hands it in? */
function wordReaches(args, name, value) {
  return args.some((a) => {
    if (a instanceof URLSearchParams) return a.getAll(name).includes(value);
    if (typeof a === 'string' || typeof a === 'number') return String(a) === value;
    if (a !== null && typeof a === 'object' && Object.hasOwn(a, name) && a[name] !== null && a[name] !== undefined) return String(a[name]) === value;
    return false;
  });
}

async function clauseR5(sets) {
  const ipc = astOf(join(ROOT, 'src', 'main', 'pocket', 'ipc.ts'));
  const { arrow, sw } = readSwitchOf(ipc);
  let answerOver = null;
  let unmade = null;
  if (arrow !== null) {
    try {
      answerOver = callableReadSwitch(ipc, arrow);
    } catch (err) {
      unmade = String(err?.message ?? err);
    }
  }
  const arms = new Map();
  if (sw !== null) {
    const clauses = sw.caseBlock.clauses;
    clauses.forEach((c, i) => {
      if (!ts.isCaseClause(c) || !ts.isStringLiteral(c.expression)) return;
      let j = i;
      while (j < clauses.length && clauses[j].statements.length === 0) j += 1;
      arms.set(c.expression.text, clauses[j] ?? null);
    });
  }
  const writes = macConstant('src/shared/ipc/pocket.ts', 'POCKET_WRITE_ROUTE_IDS');
  const serverLoaded = serverMod.loadError === undefined && typeof serverMod.createPocketHandler === 'function';
  const door = { stopping: () => false };
  for (const set of sets) {
    const w = set.wire;
    const v = set.vectors;
    if (w === null) continue;
    // The verifier the door is handed, as ipc.ts hands it: the SHIPPING one,
    // over the frozen Mac seeds and the frozen phone, at each request's own
    // clock (R2 owns what it refuses; here it only lets the request through).
    let parties = null;
    try {
      parties = v === null || pairing.loadError !== undefined ? null : frozenParties(v);
    } catch {
      parties = null;
    }
    /** One request through the SHIPPING server.ts handler, its `answer` the read switch over `routes`. */
    const throughDoor = async (request, deps) => {
      if (!serverLoaded) throw new Error(`src/main/pocket/server.ts could not be loaded${serverMod.loadError === undefined ? ' (it exports no createPocketHandler)' : `: ${serverMod.loadError}`}`);
      const handle = serverMod.createPocketHandler({
        shuttingDown: () => false,
        pairingWindowOpen: () => false,
        present: () => {
          throw new Error('a read is never a presentation');
        },
        stillPaired: () => true,
        answer: async () => null,
        ...deps
      });
      return quietly(() => handle(request, door));
    };
    for (const fr of w.routes ?? []) {
      expects('R5');
      checked('R5');
      if (fr.reads === false) {
        if (writes.error !== undefined) fail('R5', writes.error);
        else if (!writes.value.includes(fr.id)) fail('R5', `${fr.id} is not one of the shipping POCKET_WRITE_ROUTE_IDS, so the one write path never answers it`);
        continue;
      }
      if (fr.id === 'pair') {
        // Every frozen /pair answer, handed to server.ts's pair arm as the
        // pairing owner's state, must leave as an answer the frozen phone
        // reads, in its own state.
        const answers = Object.entries(v?.pairAnswers ?? {});
        if (answers.length === 0) note('R5', `${set.name}: no frozen /pair answer to drive; pair is held by R1 alone`);
        for (const [name, text] of answers) {
          checked('R5');
          const where = `${set.name} pairAnswers/${name}`;
          let given = null;
          try {
            given = JSON.parse(text);
            const res = await throughDoor({ route: 'pair', presentation: {} }, { pairingWindowOpen: () => true, present: () => given });
            const out = [];
            if (res?.status !== 200 || typeof res?.body !== 'string') out.push(`${where}: server.ts answers ${String(res?.status)} to a pairing in a window, so no old phone can pair`);
            else {
              conformInstance(w, where, { route: 'pair' }, res.body, out, { fields: 0, formats: 0, bounds: 0 });
              if (JSON.parse(res.body).state !== given?.state) out.push(`${where}: server.ts answers ${res.body.slice(0, 80)}, not the state ${String(given?.state)} the pairing owner gave it`);
            }
            for (const o of out) fail('R5', o);
          } catch (err) {
            fail('R5', `${where}: server.ts's pair arm could not be driven: ${String(err?.message ?? err)}`);
          }
        }
        continue;
      }
      if (sw === null) {
        fail('R5', "src/main/pocket/ipc.ts: the read switch (the answer: arrow's switch on route.id) cannot be found");
        return;
      }
      const arm = arms.get(fr.id);
      if (arm === undefined || arm === null) {
        fail('R5', `${fr.id}: main's read switch has no case '${fr.id}', so the door answers every old phone's ${fr.path} 404`);
        continue;
      }
      let answers = false;
      eachNode(arm, (m) => {
        if (ts.isReturnStatement(m) && m.expression !== undefined) {
          eachNode(m.expression, (c) => {
            if (ts.isCallExpression(c) && c.expression.getText(ipc) === `routes.${fr.id}`) answers = true;
          });
        }
      });
      if (!answers) fail('R5', `${fr.id}: main's case '${fr.id}' returns no routes.${fr.id}(…)`);
      // DRIVEN: every frozen request of this route, through server.ts into the
      // read switch main runs. It must reach routes.<id> exactly once, hand it
      // every word of the frozen query, and be answered 200 with what
      // routes.<id> answered. A condition that answers an old phone's query
      // null (a newly required name, a refused value) is a 404 to that phone.
      const requests = (v?.requests ?? []).filter((r) => r.method === fr.method && String(r.target).split('?')[0] === fr.path);
      if (requests.length === 0) {
        note('R5', `${set.name}: no frozen request on ${fr.method} ${fr.path} to drive; its arm is held as text alone`);
        continue;
      }
      if (answerOver === null) {
        fail('R5', `src/main/pocket/ipc.ts: the read switch cannot be made callable${unmade === null ? '' : `: ${unmade}`}`);
        continue;
      }
      for (const r of requests) {
        checked('R5');
        const where = `${set.name} request ${String(r.name)}`;
        const { routes, calls } = recordingRoutes();
        let res;
        try {
          const answer = answerOver(routes);
          const verifier = parties === null ? null : new pairing.PocketRequestVerifier({ identity: () => parties.mac, phones: () => [parties.phone], now: () => Number(r.timestamp) });
          res = await throughDoor(
            {
              route: fr.id,
              method: r.method,
              target: r.target,
              headers: { 'x-tortie-phone': v.identity?.phoneId, 'x-tortie-timestamp': r.timestamp, 'x-tortie-nonce': r.nonce, 'x-tortie-signature': r.signature },
              body: Buffer.from(r.body ?? '', 'utf8'),
              channel: v.identity?.phoneId ?? null
            },
            {
              verify: (input) => {
                if (verifier === null) return { ok: true, phoneId: String(v.identity?.phoneId) };
                const verdict = verifier.verify(input);
                return verdict.ok ? { ok: true, phoneId: verdict.phone.id } : { ok: false, reason: verdict.reason };
              },
              answer: (route, query, closing) => answer(route, query, closing)
            }
          );
        } catch (err) {
          fail('R5', `${where}: main's read switch could not be driven: ${String(err?.message ?? err)}`);
          continue;
        }
        const reached = calls.filter((c) => c.member === fr.id);
        if (calls.length !== 1 || reached.length !== 1) {
          fail('R5', `${where}: main's read switch reached ${calls.length === 0 ? 'no route' : calls.map((c) => `routes.${c.member}`).join(', ')} for ${r.method} ${String(r.target).slice(0, 80)}, not routes.${fr.id} once, so the door answers this old phone's request ${res?.status === 200 ? 'with something else' : '404'}`);
          continue;
        }
        if (res?.status !== 200 || res?.body !== JSON.stringify(reached[0].answer)) {
          fail('R5', `${where}: the door answers ${String(res?.status)}${typeof res?.body === 'string' ? ` ${res.body.slice(0, 60)}` : ''}, not 200 with what routes.${fr.id} answered`);
          continue;
        }
        const at = String(r.target).indexOf('?');
        for (const [name, value] of new URLSearchParams(at === -1 ? '' : String(r.target).slice(at + 1))) {
          if (!wordReaches(reached[0].args, name, value)) fail('R5', `${where}: its ${name}=${value.slice(0, 40)} does not reach routes.${fr.id}: main's read switch drops or renames a word the old phone sends`);
        }
      }
    }
  }
}

function clauseR6(sets) {
  for (const set of sets) {
    const v = set.vectors;
    if (v === null || set.wire === null) continue;
    expects('R6');
    if (pairing.loadError !== undefined) {
      fail('R6', pairing.loadError);
      return;
    }
    const k = v.keys;
    const id = v.identity;
    const checks = [
      ['phoneIdOf', () => pairing.phoneIdOf(k.phoneSigningKey), id.phoneId],
      ['pairFingerprint', () => pairing.pairFingerprint(k.phoneSigningKey, k.phoneExchangeKey, k.clientKey), id.fingerprint],
      ['pairingBinding', () => {
        const { mac, phone } = frozenParties(v);
        return pairing.pairingBinding(mac, phone);
      }, id.binding],
      ['clientKeyPinOf', () => pairing.clientKeyPinOf(k.clientKey), id.clientPin],
      ...(v.pins ?? []).map((p) => [`spkiPinOf(${String(p.name)})`, () => pairing.spkiPinOf(p.publicKeyFingerprint), p.pin])
    ];
    for (const [name, compute, want] of checks) {
      checked('R6');
      let got;
      try {
        got = compute();
      } catch (err) {
        got = `threw ${String(err.message)}`;
      }
      if (got !== want) fail('R6', `${set.name}: the shipping ${name} computes ${String(got).slice(0, 48)}, not the ${String(want).slice(0, 48)} the old phone computed`);
    }
  }
}

/** Types reached from each instance's root through REQUIRED, non-null keys with a value (A1 b). */
function reachedTypes(wire, instances, requiredOnly) {
  const reached = new Set();
  const walk = (v, kind) => {
    if (kind?.array !== undefined) {
      if (Array.isArray(v)) for (const e of v) walk(e, kind.array);
      return;
    }
    const name = kind?.type;
    if (name === undefined || v === null || typeof v !== 'object') return;
    reached.add(name);
    for (const { owner, key, f } of fieldsFor(wire, name, v)) {
      reached.add(owner);
      if (f.presence === 'absent' || !Object.hasOwn(v, key) || v[key] === null) continue;
      if (requiredOnly && (f.presence !== 'required' || f.null)) continue;
      walk(v[key], f.kind);
    }
  };
  for (const inst of instances.values()) {
    const root = rootTypeOf(wire, inst.route);
    if (root === null) continue;
    try {
      walk(JSON.parse(inst.text), { type: root });
    } catch {
      /* A2 names a broken instance */
    }
  }
  return reached;
}

function clauseA(sets, todayVectors, stats) {
  const todayInstances = instancesOf(todayVectors);
  for (const set of sets) {
    const w = set.wire;
    if (w === null || set.vectors === null) continue;
    const frozenInstances = instancesOf(set.vectors);
    // A1 (a): every frozen route that had an instance still has one.
    const frozenRoutes = [...new Set([...frozenInstances.values()].map((i) => i.route))].sort();
    for (const route of frozenRoutes) {
      expects('A1');
      checked('A1');
      if (![...todayInstances.values()].some((i) => i.route === route)) fail('A1', `${route}: the frozen vectors hold an answer to it and today's vectors hold none, so nothing shows a new Mac still answers it the way the old phone reads`);
    }
    // A1 (b): every type reached through required keys is still reached.
    const fr = reachedTypes(w, frozenInstances, true);
    const tr = reachedTypes(w, new Map([...todayInstances].filter(([, i]) => i.route === 'qr' || (w.routes ?? []).some((r) => r.id === i.route))), true);
    for (const t of [...fr].sort()) {
      checked('A1');
      if (!tr.has(t)) fail('A1', `${t}: the frozen vectors reach it through required keys and today's do not`);
    }
    const fAny = reachedTypes(w, frozenInstances, false);
    const tAny = reachedTypes(w, todayInstances, false);
    for (const t of [...fAny].sort()) if (!fr.has(t) && !tAny.has(t)) note('A1', `${t}: no instance in today's vectors (reached only through an optional key): A3 alone holds it now`);
    // A2: every instance of a frozen route in today's vectors conforms.
    for (const [id, inst] of todayInstances) {
      if (inst.route !== 'qr' && !(w.routes ?? []).some((r) => r.id === inst.route)) continue;
      expects('A2');
      checked('A2');
      stats.instances += 1;
      stats.routes.add(inst.route);
      const out = [];
      conformInstance(w, id, inst, inst.text, out, stats);
      if (typeof inst.unknownText === 'string') conformInstance(w, `${id}+unknown`, inst, inst.unknownText, out, stats);
      for (const o of out) fail('A2', `${set.name}: ${o}`);
    }
  }
}

function clauseA3(sets) {
  for (const set of sets) {
    if (set.wire === null) continue;
    expects('A3');
    const findings = [];
    const counts = { routes: 0, paths: 0, words: 0 };
    try {
      tsChecks(set.wire, findings, counts);
    } catch (err) {
      findings.push(`the Mac's types could not be walked: ${String(err.message)}`);
    }
    checked('A3', counts.paths);
    if (counts.routes === 0) fail('A3', `${set.name}: no frozen route's TypeScript answer type was found`);
    for (const f of findings) fail('A3', `${set.name}: ${f}`);
  }
}

function clauseA4(sets) {
  for (const set of sets) {
    for (const row of set.wire?.bounds ?? []) {
      for (const mac of row.mac ?? []) {
        expects('A4');
        checked('A4');
        const now = macConstant(row.macFile, mac);
        if (now.error !== undefined) {
          fail('A4', `${mac}: ${now.error}`);
          continue;
        }
        const x = now.value;
        if (row.rule === 'mac<=phone' && !(typeof x === 'number' && x <= row.value)) fail('A4', `${mac} is ${String(x)}, past ${row.phone} (${String(row.value)}): every old phone refuses what it composes at that size`);
        if (row.rule === 'mac<phone*1000' && !(typeof x === 'number' && x < row.value * 1000)) fail('A4', `${mac} is ${String(x)} ms, not under ${row.phone} (${String(row.value)} s): an old phone gives up before the answer`);
        if (row.rule === 'equal' && x !== row.value) fail('A4', `${mac} is ${JSON.stringify(x)}, not the ${JSON.stringify(row.value)} the frozen phone reads (${row.phone})`);
        if (row.rule === 'mac-in-phone' && !(Array.isArray(x) && x.every((p) => row.value.includes(p)))) fail('A4', `${mac} is ${JSON.stringify(x)}, and the frozen phone dials only ${JSON.stringify(row.value)}`);
      }
    }
  }
}

function clauseA5(sets) {
  const statuses = [...new Set(sets.flatMap((s) => s.wire?.statuses ?? []))];
  if (sets.length === 0) return;
  expects('A5');
  // Every status a frozen phone reads: the INTERSECTION, so no phone is answered one it does not read.
  const readByAll = statuses.filter((x) => sets.every((s) => (s.wire?.statuses ?? []).includes(x)));
  const unionOf = (typeNode, sf, where) => {
    const out = [];
    const collect = (n) => {
      if (ts.isUnionTypeNode(n)) n.types.forEach(collect);
      else if (ts.isLiteralTypeNode(n) && ts.isNumericLiteral(n.literal)) out.push(Number(n.literal.text));
      else out.push(`\`${n.getText(sf)}\``);
    };
    collect(typeNode);
    checked('A5');
    const bad = out.filter((x) => typeof x !== 'number' || !readByAll.includes(x));
    if (bad.length > 0) fail('A5', `${where}: status ${bad.join(' | ')}, and the frozen phone reads only ${readByAll.join(', ')}`);
  };
  const bind = astOf(join(ROOT, 'src', 'main', 'pocket', 'bind.ts'));
  const answerIf = bind?.statements.find((s) => ts.isInterfaceDeclaration(s) && s.name.text === 'DoorAnswer');
  const statusProp = answerIf?.members.find((m) => ts.isPropertySignature(m) && m.name.getText(bind) === 'status');
  if (statusProp?.type === undefined) fail('A5', "src/main/pocket/bind.ts: DoorAnswer's status cannot be read");
  else unionOf(statusProp.type, bind, 'src/main/pocket/bind.ts DoorAnswer');
  const wire = astOf(join(ROOT, 'src', 'main', 'pocket', 'door', 'wire.ts'));
  const toDoor = wire?.statements.find((s) => ts.isTypeAliasDeclaration(s) && s.name.text === 'ToDoor');
  let found = 0;
  if (toDoor !== undefined) {
    eachNode(toDoor.type, (n) => {
      if (ts.isPropertySignature(n) && n.name.getText(wire) === 'status' && n.type !== undefined) {
        found += 1;
        unionOf(n.type, wire, 'src/main/pocket/door/wire.ts ToDoor');
      }
    });
  }
  if (found === 0) fail('A5', "src/main/pocket/door/wire.ts: the wire answer's status cannot be read");
  const doorDir = join(ROOT, 'src', 'main', 'pocket', 'door');
  const files = existsSync(doorDir) ? readdirSync(doorDir).filter((n) => n.endsWith('.ts')).sort() : [];
  let calls = 0;
  for (const name of files) {
    const sf = astOf(join(doorDir, name));
    eachNode(sf, (n) => {
      if (!ts.isCallExpression(n) || n.expression.getText(sf) !== 'sendPocket') return;
      calls += 1;
      checked('A5');
      const arg = n.arguments[1];
      const line = sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
      if (arg !== undefined && ts.isNumericLiteral(arg)) {
        if (!readByAll.includes(Number(arg.text))) fail('A5', `src/main/pocket/door/${name}:${String(line)}: sendPocket answers ${arg.text}, and the frozen phone reads only ${readByAll.join(', ')}`);
      } else if (!(arg !== undefined && ts.isPropertyAccessExpression(arg) && arg.name.text === 'status')) {
        fail('A5', `src/main/pocket/door/${name}:${String(line)}: sendPocket answers \`${arg?.getText(sf) ?? '?'}\`, neither a status literal nor the answer's typed status`);
      }
    });
  }
  if (calls === 0) fail('A5', 'no sendPocket( call under src/main/pocket/door/ was found');
}

function clauseP(sets, today) {
  expects('P0');
  checked('P0');
  for (const u of today.unread) fail('P0', `${u.file === '' ? '' : `${u.file}:${String(u.line)}: `}${u.why}`);
  const todayProjection = reader.projection(today);
  const p4 = [];
  for (const set of sets) {
    const w = set.wire;
    if (w === null) continue;
    // P0's consistency: the same phone bytes must read the same way.
    const phoneFiles = Object.entries(w.read ?? {}).filter(([path]) => path.startsWith('ios/'));
    const same = phoneFiles.length > 0 && phoneFiles.every(([path, hash]) => existsSync(join(ROOT, path)) && sha256hex(readFileSync(join(ROOT, path))) === hash);
    const equal = reader.projection(w) === todayProjection;
    checked('P0');
    if (same && !equal) {
      const d = reader.differingPaths(w, today, 10);
      fail('P0', `${set.name}: every phone file it read is byte-identical today, and today's reading differs from the frozen one at ${String(d.count)} path(s): ${d.paths.join(', ')}. Either the reader reads the same bytes two ways or the frozen file is not what --freeze wrote; the phone did not move`);
    }
    // P1, P2.
    expects('P1');
    expects('P2');
    const findings = { p1: [], p2: [], notes: [], pairs: 0 };
    comparePhones(w, today, findings);
    checked('P1', findings.pairs);
    checked('P2', findings.pairs);
    for (const f of findings.p1) fail('P1', `${set.name}: ${f}`);
    for (const f of findings.p2) fail('P2', `${set.name}: ${f}`);
    for (const n of findings.notes) note('P2', `${set.name}: ${n}`);
    // P3.
    for (const row of w.bounds ?? []) {
      expects('P3');
      checked('P3');
      const t = today.bounds.find((b) => b.phone === row.phone);
      if (t === undefined || t.value === null) {
        fail('P3', `${set.name}: today's phone has no ${row.phone}`);
        continue;
      }
      if (row.rule === 'equal' && t.value !== row.value) fail('P3', `${set.name}: ${row.phone} is ${JSON.stringify(t.value)} today, ${JSON.stringify(row.value)} when frozen`);
      else if (row.rule === 'mac-in-phone' && !(Array.isArray(t.value) && row.value.every((x) => t.value.includes(x)))) fail('P3', `${set.name}: ${row.phone} is ${JSON.stringify(t.value)} today and no longer holds all of ${JSON.stringify(row.value)}`);
      else if (!['equal', 'mac-in-phone'].includes(row.rule) && !(typeof t.value === 'number' && t.value >= row.value)) fail('P3', `${set.name}: ${row.phone} is ${String(t.value)} today, below the ${String(row.value)} it was frozen at`);
    }
    checked('P3');
    const lostStatuses = (w.statuses ?? []).filter((x) => !today.statuses.includes(x));
    if (lostStatuses.length > 0) fail('P3', `${set.name}: today's phone no longer reads status ${lostStatuses.join(', ')}`);
    // P4.
    checked('P4');
    if (equal) p4.push({ label: w.label, equal: true });
    else {
      const d = reader.differingPaths(w, today, 10);
      p4.push({ label: w.label, equal: false, count: d.count, paths: d.paths });
    }
  }
  return p4;
}

// ---------------------------------------------------------------------------
// The freeze (§9)
// ---------------------------------------------------------------------------

function pretty(value, indent = '') {
  const flat = JSON.stringify(value);
  if (flat.length + indent.length <= 140 || value === null || typeof value !== 'object') return flat;
  const inner = `${indent}  `;
  if (Array.isArray(value)) return `[\n${value.map((v) => `${inner}${pretty(v, inner)}`).join(',\n')}\n${indent}]`;
  return `{\n${Object.keys(value).map((k) => `${inner}${JSON.stringify(k)}: ${pretty(value[k], inner)}`).join(',\n')}\n${indent}}`;
}

function buildWire(label, today, vectorsBytes, previous) {
  const problems = [];
  const vectors = JSON.parse(vectorsBytes.toString('utf8'));
  const rows = tableRows();
  if (rows === null) problems.push('src/main/pocket/door/table.ts: POCKET_ROUTES cannot be read');
  const routes = [];
  for (const r of today.routes) {
    const row = (rows ?? []).find((x) => x.method === r.method && x.path === r.path);
    if (row === undefined) {
      problems.push(`the phone calls ${r.method} ${r.path}, which the door's table does not hold`);
      continue;
    }
    if (row.signed !== r.signed) problems.push(`${r.method} ${r.path}: the phone ${r.signed ? 'signs' : 'does not sign'} it and the table says signed ${String(row.signed)}`);
    routes.push({ id: row.id, method: row.method, path: row.path, signed: row.signed, windowOnly: row.windowOnly, reads: row.reads, answer: r.answer });
  }
  routes.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const notCalled = (rows ?? []).filter((x) => !routes.some((r) => r.id === x.id)).map((x) => x.id);
  const macLimits = MAC_LIMITS.map((row) => {
    const c = macConstant(row.file, row.mac);
    if (c.error !== undefined || typeof c.value !== 'number') problems.push(`${row.mac}: ${c.error ?? 'not a number'}`);
    return { mac: row.mac, file: row.file, value: c.value ?? null, rule: 'now>=frozen' };
  });
  const pbx = existsSync(join(ROOT, 'ios', 'Tortie.xcodeproj', 'project.pbxproj')) ? readFileSync(join(ROOT, 'ios', 'Tortie.xcodeproj', 'project.pbxproj'), 'utf8') : '';
  const uniq = (re) => [...new Set([...pbx.matchAll(re)].map((m) => m[1]))].join(',');
  let macVersion = null;
  try {
    macVersion = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version ?? null;
  } catch {
    macVersion = null;
  }
  const readHashes = { ...today.read };
  readHashes['src/main/pocket/door/table.ts'] = sha256hex(readFileSync(join(ROOT, 'src', 'main', 'pocket', 'door', 'table.ts')));
  readHashes['ios/TortieTests/Fixtures/vectors.json'] = sha256hex(vectorsBytes);
  const sortedRead = Object.fromEntries(Object.keys(readHashes).sort().map((k) => [k, readHashes[k]]));
  const draft = {
    about: aboutOf(label),
    format: 1,
    label,
    phoneBuild: uniq(/CURRENT_PROJECT_VERSION = ([^;]+);/g),
    phoneVersion: uniq(/MARKETING_VERSION = ([^;]+);/g),
    macVersion,
    read: sortedRead,
    vectors: { file: `${label}.vectors.json`, sha256: sha256hex(vectorsBytes) },
    routes,
    routeMembership: membershipOf(routes),
    qr: { answer: today.qr.answer },
    types: today.types,
    formats: today.formats,
    bounds: today.bounds.map(({ phone, value, applies, measure, min, mac, macFile, rule, swift }) => ({ phone, value, applies, measure, min, mac, macFile, rule, swift })),
    macLimits,
    sends: today.sends.map(({ phone, words, mac, macFile, macForm }) => ({ phone, words, mac, macFile, macForm })),
    statuses: today.statuses
  };
  const instances = instancesOf(vectors);
  draft.instances = Object.fromEntries([...instances].map(([id, inst]) => [id, inst.route]));
  for (const [id, route] of Object.entries(draft.instances)) {
    if (route !== 'qr' && !routes.some((r) => r.id === route)) problems.push(`${id}: its route ${route} is not a route the phone calls`);
  }
  const { arms, unarmed } = generateArms(draft, instances);
  draft.arms = arms;
  draft.unarmed = unarmed;
  draft.history = [...(previous?.history ?? [])];
  if (previous !== null) draft.history.push({ seal: previous.seal, phoneBuild: previous.phoneBuild, macVersion: previous.macVersion, why: WHY });
  draft.seal = sealOf(draft);
  return { wire: draft, problems, notCalled };
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

function printClauses(order) {
  let red = 0;
  for (const id of order) {
    const s = state[id];
    if (s.expects && s.checked === 0 && s.findings.length === 0) s.findings.push('checked nothing where the frozen set holds items: a scanner that stopped finding is not a clean tree');
    const ok = s.findings.length === 0;
    if (!ok && id !== 'P4') red += 1;
    process.stdout.write(`  ${ok ? 'ok  ' : 'FAIL'} ${id}  ${CLAUSES[id]} (${String(s.checked)} checked)\n`);
    for (const f of s.findings.slice(0, MAX_FINDINGS)) process.stdout.write(`         - ${f}\n`);
    if (s.findings.length > MAX_FINDINGS) process.stdout.write(`         … and ${String(s.findings.length - MAX_FINDINGS)} more\n`);
    for (const n of s.notes.slice(0, 10)) process.stdout.write(`         · ${n}\n`);
  }
  return red;
}

const t0 = performance.now();
const proof = reader.proveReader(join(REPO, 'build', 'p33311', 'fixtures'));
if (proof.problems.length > 0) {
  process.stdout.write(`${TAG} FAIL: the reader of the phone does not read its own fixtures (${String(proof.files)} read), so nothing it reads of the phone is trusted:\n`);
  for (const p of proof.problems) process.stdout.write(`  - ${p}\n`);
  if (JSON_OUT) process.stdout.write(`GATE_ONLYADD:${JSON.stringify({ ok: false, fixtures: proof.problems })}\n`);
  process.exit(1);
}
let today;
try {
  today = reader.readPhoneWire(ROOT);
} catch (err) {
  process.stdout.write(`${TAG} FAIL: P0: the reader threw over today's phone: ${String(err?.stack ?? err)}\n`);
  if (JSON_OUT) process.stdout.write(`GATE_ONLYADD:${JSON.stringify({ ok: false, reader: String(err?.message ?? err) })}\n`);
  process.exit(1);
}
const todayBytes = existsSync(VECTORS_PATH) ? readFileSync(VECTORS_PATH) : null;
let todayVectors = null;
try {
  todayVectors = todayBytes === null ? null : JSON.parse(todayBytes.toString('utf8'));
} catch {
  todayVectors = null;
}

let sets;
let freezeResult = null;
if (FREEZE !== null) {
  if (!/^[a-z][a-z0-9-]{0,31}$/.test(FREEZE)) {
    process.stdout.write(`${TAG} FAIL: --freeze takes a label of lowercase letters, digits and -, not ${JSON.stringify(FREEZE)}\n`);
    process.exit(1);
  }
  if (today.unread.length > 0) {
    process.stdout.write(`${TAG} FAIL: the phone has ${String(today.unread.length)} statement(s) the reader cannot read, so it cannot be frozen:\n`);
    for (const u of today.unread) process.stdout.write(`  - ${u.file === '' ? '' : `${u.file}:${String(u.line)}: `}${u.why}\n`);
    process.exit(1);
  }
  if (todayBytes === null || todayVectors === null) {
    process.stdout.write(`${TAG} FAIL: ${relPath(VECTORS_PATH)} cannot be read\n`);
    process.exit(1);
  }
  const target = join(FROZEN_DIR, `${FREEZE}.wire.json`);
  let previous = null;
  if (existsSync(target)) {
    if (!REPLACE) {
      process.stdout.write(`${TAG} FAIL: ${relPath(target)} exists. A frozen set is replaced only on purpose: --replace --why "<sentence>", and the commit names every moved line\n`);
      process.exit(1);
    }
    if (WHY === null || WHY.trim() === '' || WHY.startsWith('--')) {
      process.stdout.write(`${TAG} FAIL: --replace needs --why "<sentence>": the reason is kept in the set's history\n`);
      process.exit(1);
    }
    previous = JSON.parse(readFileSync(target, 'utf8'));
  } else if (REPLACE) {
    process.stdout.write(`${TAG} FAIL: --replace, and ${relPath(target)} does not exist\n`);
    process.exit(1);
  }
  freezeResult = buildWire(FREEZE, today, todayBytes, previous);
  if (freezeResult.problems.length > 0) {
    process.stdout.write(`${TAG} FAIL: the set cannot be frozen:\n`);
    for (const p of freezeResult.problems) process.stdout.write(`  - ${p}\n`);
    process.exit(1);
  }
  const others = loadSets(FROZEN_DIR).filter((s) => s.name !== `${FREEZE}.wire.json`);
  sets = [...others, { name: `${FREEZE}.wire.json`, path: target, wire: freezeResult.wire, error: null, vectorsBytes: todayBytes, vectors: todayVectors }];
} else {
  sets = loadSets(FROZEN_DIR);
}

/**
 * A clause that throws is red with what it threw, and the others still run:
 * a frozen file resealed with a section of the wrong shape must turn the
 * gate red, never crash it into saying nothing.
 */
async function guarded(clause, fn) {
  try {
    return await fn();
  } catch (err) {
    expects(clause);
    fail(clause, `threw: ${String(err?.message ?? err)}`);
    return undefined;
  }
}
await guarded('F3', () => clauseF(sets, false));
if (FREEZE === null) await guarded('F4', () => clauseF4());
const usable = sets.filter((s) => s.wire !== null && s.vectors !== null);
await guarded('R1', () => clauseR1(usable));
await guarded('R2', () => clauseR2(usable));
await guarded('R3', () => clauseR3(usable));
await guarded('R4', () => clauseR4(usable));
await guarded('R5', () => clauseR5(usable));
await guarded('R6', () => clauseR6(usable));
const aStats = { instances: 0, routes: new Set(), fields: 0, formats: 0, bounds: 0 };
if (todayVectors === null) {
  expects('A2');
  fail('A2', `${relPath(VECTORS_PATH)} cannot be read`);
} else await guarded('A2', () => clauseA(usable, todayVectors, aStats));
await guarded('A3', () => clauseA3(usable));
await guarded('A4', () => clauseA4(usable));
await guarded('A5', () => clauseA5(usable));
const p4 = (await guarded('P0', () => clauseP(usable, today))) ?? [];
if (FREEZE !== null) await guarded('F4', () => clauseF4());

process.stdout.write(`${TAG} ${String(sets.length)} frozen set(s) under ${relPath(FROZEN_DIR) || '.'}; the reader proved itself on ${String(proof.files)} fixture(s) and read ${String(today.files)} Swift file(s), ${String(Object.keys(today.types).length)} type(s)\n`);
const order = Object.keys(CLAUSES);
const red = printClauses(order);
const blocking = FREEZE !== null ? order.filter((id) => id !== 'F4' && id !== 'P4' && state[id].findings.length > 0) : order.filter((id) => id !== 'P4' && state[id].findings.length > 0);
for (const p of p4) {
  process.stdout.write(
    p.equal
      ? `${TAG} P4: the phone's wire today EQUALS ${p.label}.\n`
      : `${TAG} P4: the phone's wire today DIFFERS from ${p.label} at ${String(p.count)} path(s): ${p.paths.join(', ')}\n`
  );
}
const ms = Math.round(performance.now() - t0);
const summary = {
  ok: blocking.length === 0,
  ms,
  sets: usable.map((s) => s.wire.label),
  clauses: Object.fromEntries(order.map((id) => [id, { ok: state[id].findings.length === 0, checked: state[id].checked, findings: state[id].findings.slice(0, MAX_FINDINGS) }])),
  p4
};

if (FREEZE !== null) {
  if (blocking.length > 0) {
    process.stdout.write(`${TAG} FAIL: the set would not pass its own clauses (${blocking.join(', ')}); nothing was written\n`);
    if (JSON_OUT) process.stdout.write(`GATE_ONLYADD:${JSON.stringify(summary)}\n`);
    process.exit(1);
  }
  const w = freezeResult.wire;
  const target = join(FROZEN_DIR, `${FREEZE}.wire.json`);
  if (REPLACE && existsSync(target)) {
    const old = JSON.parse(readFileSync(target, 'utf8'));
    const before = new Set([...reader.leafLines(reader.projectionOf(old)), ...reader.leafLines({ macLimits: old.macLimits ?? [] }).map((l) => `macLimits${l}`)]);
    const after = new Set([...reader.leafLines(reader.projectionOf(w)), ...reader.leafLines({ macLimits: w.macLimits }).map((l) => `macLimits${l}`)]);
    const gone = [...before].filter((l) => !after.has(l)).sort();
    const added = [...after].filter((l) => !before.has(l)).sort();
    process.stdout.write(`${TAG} --replace ${FREEZE}: ${String(gone.length + added.length)} line(s) moved. Name every one in the commit body, and why:\n`);
    for (const l of gone) process.stdout.write(`  - ${l}\n`);
    for (const l of added) process.stdout.write(`  + ${l}\n`);
  }
  mkdirSync(FROZEN_DIR, { recursive: true });
  writeFileSync(join(FROZEN_DIR, w.vectors.file), todayBytes);
  writeFileSync(target, `${pretty(w)}\n`, 'utf8');
  if (freezeResult.notCalled.length > 0) process.stdout.write(`${TAG} routes of the door's table the phone calls no target for, not frozen: ${freezeResult.notCalled.join(', ')}\n`);
  process.stdout.write(`${TAG} froze ${FREEZE}: phone build ${w.phoneBuild}, Mac ${String(w.macVersion)}, ${String(w.routes.length)} routes, ${String(Object.keys(w.types).length)} types, ${String(w.arms.length)} arms, ${String(w.unarmed.length)} unarmed (${String(ms)} ms)\n`);
  if (JSON_OUT) process.stdout.write(`GATE_ONLYADD:${JSON.stringify(summary)}\n`);
  process.exit(0);
}

if (blocking.length > 0) {
  process.stdout.write(`${TAG} FAIL: ${String(red)} clause(s) red (${blocking.join(', ')}) in ${String(ms)} ms\n`);
  if (JSON_OUT) process.stdout.write(`GATE_ONLYADD:${JSON.stringify(summary)}\n`);
  process.exit(1);
}
const describe = usable.map((s) => `${s.wire.label}: phone build ${s.wire.phoneBuild}, Mac ${String(s.wire.macVersion)}`).join('; ');
const unarmed = usable.reduce((n, s) => n + (s.wire.unarmed?.length ?? 0), 0);
const limits = usable.reduce((n, s) => n + (s.wire.macLimits?.length ?? 0), 0);
const equalLine = p4.map((p) => (p.equal ? `EQUALS ${p.label}` : `DIFFERS from ${p.label} at ${String(p.count)} paths: ${p.paths.join(', ')}`)).join('; ');
process.stdout.write(`${TAG} every clause held in ${String(ms)} ms\n`);
process.stdout.write(
  `${TAG} PASS: ${String(usable.length)} frozen set${usable.length === 1 ? '' : 's'} (${describe}); ${String(state.R1.checked)} routes served, ${String(state.R2.checked)} requests replayed, ${String(state.R3.checked)} presentations opened, ${String(aStats.instances)} instances over ${String(aStats.routes.size)} routes conform, ${String(limits)} Mac limits held, ${String(unarmed)} fields unarmed; the phone's wire today ${equalLine}.\n`
);
if (JSON_OUT) process.stdout.write(`GATE_ONLYADD:${JSON.stringify(summary)}\n`);
process.exit(0);
