#!/usr/bin/env node
/**
 * `npm run conformance:diagnostic`. The gate on the diagnostic Tortie (Phase 364,
 * build/p364/SPEC.md §7.1).
 *
 * WHAT IT IS FOR. Phase 364 builds a second Tortie for one person to run as his
 * everyday app: his sessions, his session list, and a better-sqlite3 whose SQLite
 * carries a page-cache checker (build/diagnostic/sqlite-checker.c). Two promises
 * make that safe, and each is a handful of lines a later round can undo with
 * every other gate green:
 *
 *   - THE NORMAL APP DOES NOT CHANGE. Every diagnostic line of JavaScript sits
 *     behind ONE build-time flag, read only as the whole test of an `if`
 *     statement, because rollup drops a dead `if` and the module behind it and
 *     keeps a dead ternary (SPEC §0.1 item 6, §2.5).
 *   - THE SHIPPED CHECKER CANNOT PLANT, AND CANNOT FAULT. The plant, the signal
 *     handler and every `[p358adv-` line exist only in the TEST variant, behind
 *     `#ifdef TCHK_PLANT`; the diagnostic variant reads one variable, opens one
 *     file, and reads memory through a pointer it found in memory only after
 *     asking the kernel the memory is there (SPEC D4, D6, D10).
 *
 * THE RULES, each a function of the files' text, asked once over the tree and
 * then again over in-memory copies with it broken one way at a time. Every copy
 * must read RED on its own rule and every control copy (a change that keeps the
 * promise) must read green, or the rule is shown not to ask what it says. 35
 * clauses, 176 attacks, a control or more each (`--list`):
 *
 *   D1  the define: named only in flag.ts, as the define itself or behind
 *       build-info.ts's `typeof` guard; set from TORTIE_DIAGNOSTIC === '1', in
 *       main alone; false under vitest
 *   D2  DIAGNOSTIC_BUILD read only as the whole test of an else-less `if`,
 *       never inside a try block (rollup keeps a try block's statements, so
 *       the guard and the module behind it stayed in the normal bundle: the
 *       probe review, measured); imported by name; the checker's and the
 *       events' exports called only inside such an `if`'s consequent; and
 *       (the fix round) the updater never starts in the diagnostic build:
 *       initUpdater's guard comes after only its latch, logs §5's line and
 *       returns, and checkForUpdatesNow answers `unsupported` first
 *   D3  menu.ts and build-info.ts name neither; the About mark only under the
 *       define's own test; the three diagnostic modules run nothing on import
 *   D4  the C: the plant behind `#ifdef TCHK_PLANT`; one variable read and then
 *       removed; one file opened, write-only, to append; the allocator installed
 *       once, in the constructor, after reading the default, SQLite never
 *       initialised; no variant defined by the C itself; the measured guard and
 *       floor
 *   D5  the C's walk, as the diagnostic variant compiles it: every read through
 *       a PgHdr1, PCache1, PGroup, PgHdr, Btree, BtShared, Pager, PCache, Db or
 *       sqlite3 pointer, or a table of such pointers (`p->`, `(p)->`, `*p`,
 *       `p[…]`, `ap[h]`, a memcpy or memcmp of it, or a
 *       cast read through directly) follows a tchkReadable of that pointer in
 *       the same function, a loop's own assignments taken back at its head, a
 *       parameter proved only when every caller passed a checked one
 *   D6  the build scripts: the lockfile's version, the amalgamation's sha256 and
 *       the four anchors pinned; --devdir required and no home folder read;
 *       nothing written or run under node_modules; #define only for --variant
 *       test; the close breadcrumb carrying the op the C walks at every close;
 *       the after-pack's one write, its refusals before it and the normal
 *       after-pack after it; the package's --publish never, null publish,
 *       diagnostic after-pack, -diagnostic- name, unsigned unless --notarize
 *       (in the config file it hands electron-builder, which reads
 *       `-c.publish=null` as the string "null"), and its Developer ID refusal
 *   D7  release.yml: tag push or a dispatch with one boolean input; the release
 *       job push-only and otherwise PINNED by hash (`--print-release-pin`); the
 *       diagnostic job dispatch-only, contents: read, the release job's own
 *       action pins, an artifact kept at most 14 days, and no route to a
 *       release, a tag or a feed: gh, a publish mode, git tag or push, an update
 *       feed, a blockmap, an attestation, a writing token, the GitHub API, or
 *       electron-builder run by hand; the diagnostic variant built, after
 *       typecheck, test and build
 *   D8  a built module (`--node`, its variant read from the build beside it,
 *       never from its bytes): a diagnostic one holds no P358ADV, no [p358adv-
 *       and no sigaction import, and holds the checker; a test one holds all
 *       three. With no --node, the shipped prebuild stands in
 *
 * WHAT IT READS, and why it reads each the way it does. TypeScript and the
 * build scripts through the TypeScript compiler's own parser, so a comment is
 * trivia and never satisfies or breaks a rule. The C through a lexer and a
 * reading of its `#if` groups written here (no C toolchain is run). The
 * workflow through js-yaml. A built module through a Mach-O reader written
 * here, which reads the symbol table, dyld's bind streams and the chained
 * fixups, where `nm -u` and dyld find an import; on 2026-11-09 it listed the
 * same imports as `nm -u` for five real binaries (the prebuild, the checker
 * builder's diagnostic and test modules, the spec step's diagnostic module, and
 * /bin/ls's arm64e slice through its chained fixups), and `--print-imports`
 * prints what it reads so that comparison can be made again. The pinned
 * better-sqlite3 in node_modules, read only, so the amalgamation's hash and the
 * four anchors are RE-DERIVED here rather than trusted from the script that
 * pins them.
 *
 * WHAT IT STARTS. Nothing: no process, no compiler, no Electron, no network.
 * It writes nothing.
 *
 * ITS READERS ARE PROVED FIRST, on build/diagnostic-fixtures/: the C lexer and
 * its `#if` reading, the walk rule, the flag's shapes, what runs on import, and
 * the Mach-O reader on the pinned prebuild, whose import count `nm -u`
 * measured. Then the clause list itself: a clause taken out, or the attacks
 * falling below their floor, is red.
 *
 * WHAT IT FOUND ON ITS FIRST RUN. The spec step's own rebuilt checker
 * (scratch/p364/spec/checker/tortie-pcache-check.c, the C SPEC §2 measured)
 * set `f.szPage = c->szPage` in tchkWalkDb after tchkWalkCache had failed,
 * including the failure "the cache cannot be read": a damaged cache pointer
 * would have faulted the app instead of writing its line. D5 names that line;
 * the tree's checker carries the page size in TchkFail, set after the check,
 * and D5 reads it green.
 *
 * WHAT IT CANNOT PROVE, said so nobody reads more into a pass. It reads text,
 * so it holds the SHAPES that keep the normal build byte for byte and the
 * shipped checker inert; the bytes themselves are measured by the phase's
 * lenses (`out/` and the unsigned package against the parent's, SPEC §10.1
 * A1), and whether rollup folds build-info.ts's `typeof` guard is one of them.
 * D4 and D5 read the C as written: a plant word split across a macro, or a read
 * hidden inside one, is beyond them (D8 reads the built bytes). D5 is lexical,
 * as the spec asks, so a check whose failing branch carries on reads as a
 * check. D8 reads only the modules it is handed.
 *
 *   node build/conformance-diagnostic.mjs                    the gate
 *   node build/conformance-diagnostic.mjs --node <file> …    and D8 on built modules
 *   node build/conformance-diagnostic.mjs --list             the clauses, nothing run
 *   node build/conformance-diagnostic.mjs --verbose          every attack's first finding
 *   node build/conformance-diagnostic.mjs --root <dir>       read another checkout
 *   node build/conformance-diagnostic.mjs --print-release-pin     the release job's hash
 *   node build/conformance-diagnostic.mjs --print-imports <file>  a Mach-O's imports, as read
 */

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, dirname, join, posix, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { load as loadYaml } from 'js-yaml';
import ts from 'typescript';

const HERE = dirname(fileURLToPath(import.meta.url));
const TAG = '[conformance:diagnostic]';
const t0 = Date.now();

// ---------------------------------------------------------------------------
// Arguments
// ---------------------------------------------------------------------------

const opts = { list: false, root: resolve(HERE, '..'), nodes: [], printReleasePin: false, printImports: null, verbose: false };
{
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--list') opts.list = true;
    else if (a === '--verbose') opts.verbose = true;
    else if (a === '--print-release-pin') opts.printReleasePin = true;
    else if (a === '--print-imports' && i + 1 < argv.length) opts.printImports = resolve(argv[(i += 1)]);
    else if (a === '--root' && i + 1 < argv.length) opts.root = resolve(argv[(i += 1)]);
    else if (a.startsWith('--root=')) opts.root = resolve(a.slice('--root='.length));
    else if (a === '--node' && i + 1 < argv.length) opts.nodes.push(resolve(argv[(i += 1)]));
    else if (a.startsWith('--node=')) opts.nodes.push(resolve(a.slice('--node='.length)));
    else {
      process.stderr.write(
        `${TAG} unknown argument ${a}\n` +
          'usage: node build/conformance-diagnostic.mjs [--node <file>]… [--root <dir>] [--list] [--print-release-pin] [--print-imports <file>] [--verbose]\n'
      );
      process.exit(2);
    }
  }
}
const ROOT = opts.root;

const say = (line) => process.stdout.write(`${TAG} ${line}\n`);
const sha256 = (data) => createHash('sha256').update(data).digest('hex');

// ---------------------------------------------------------------------------
// The files, and the builder that owns each (SPEC §9.1)
// ---------------------------------------------------------------------------

const F = {
  flag: 'src/main/diagnostic-build/flag.ts',
  checker: 'src/main/diagnostic-build/checker.ts',
  events: 'src/main/diagnostic-build/events.ts',
  menu: 'src/main/menu.ts',
  buildInfo: 'src/main/build-info.ts',
  vite: 'electron.vite.config.ts',
  vitest: 'vitest.config.ts',
  c: 'build/diagnostic/sqlite-checker.c',
  buildChecker: 'build/diagnostic/build-checker.mjs',
  afterPack: 'build/diagnostic/after-pack.cjs',
  normalAfterPack: 'build/after-pack.cjs',
  packageMjs: 'build/diagnostic/package.mjs',
  release: '.github/workflows/release.yml',
  updater: 'src/main/updates/updater.ts'
};
const OWNER = {
  [F.flag]: 'main',
  [F.checker]: 'main',
  [F.events]: 'main',
  [F.menu]: 'nobody: it never moves',
  [F.buildInfo]: 'nobody: it never moves',
  [F.vite]: 'package',
  [F.vitest]: 'the integrator',
  [F.c]: 'checker',
  [F.buildChecker]: 'checker',
  [F.afterPack]: 'package',
  [F.normalAfterPack]: 'nobody: it never moves',
  [F.packageMjs]: 'package',
  [F.release]: 'package',
  [F.updater]: 'main'
};

/** The pinned better-sqlite3, read only (SPEC §3: "Read, never edited"). */
const BS3 = 'node_modules/better-sqlite3';
const AMALGAMATION = `${BS3}/deps/sqlite3/sqlite3.c`;
const PREBUILD = `${BS3}/prebuilds/darwin-arm64.node`;

/** The names the rules are about. */
const DEFINE = '__TORTIE_DIAGNOSTIC__';
const FLAG = 'DIAGNOSTIC_BUILD';
const ENV_NAME = 'TORTIE_DIAGNOSTIC';
const FLAG_MODULE = 'src/main/diagnostic-build/flag';
const GUARDED_MODULES = ['src/main/diagnostic-build/checker', 'src/main/diagnostic-build/events'];
const MODULE_DIR = 'src/main/diagnostic-build/';
const STAMP_MARK = ' Diagnostic';

// ---------------------------------------------------------------------------
// The tree: every file the rules read, in memory, so a rule can be asked again
// over a copy with one thing broken. Nothing here writes to disk.
// ---------------------------------------------------------------------------

function readText(rel) {
  try {
    return readFileSync(join(ROOT, rel), 'utf8');
  } catch {
    return null;
  }
}

/** Every production source under src/: no `__tests__`, no `*.test.*`, not src/test/. */
function productionSources() {
  const out = [];
  const walk = (relDir) => {
    let names;
    try {
      names = readdirSync(join(ROOT, relDir)).sort();
    } catch {
      return;
    }
    for (const name of names) {
      if (name === '__tests__' || name === 'node_modules') continue;
      const rel = `${relDir}/${name}`;
      let st;
      try {
        st = statSync(join(ROOT, rel));
      } catch {
        continue;
      }
      if (st.isDirectory()) {
        if (rel !== 'src/test') walk(rel);
        continue;
      }
      if (!/\.(ts|tsx|mts|cts|js|cjs|mjs)$/.test(name)) continue;
      if (/\.test\.[cm]?[jt]sx?$/.test(name)) continue;
      out.push(rel);
    }
  };
  walk('src');
  return out;
}

/** A production file is in scope for D1 to D3 when it names one of these at all; each kept file is then parsed. */
const SCOPE_WORDS = [DEFINE, FLAG, 'diagnostic-build'];
/** A production source: under src/, not a test, not src/test/. */
const isProduction = (rel) =>
  rel.startsWith('src/') && !rel.startsWith('src/test/') && !rel.includes('/__tests__/') && !/\.test\.[cm]?[jt]sx?$/.test(rel);

function loadTree() {
  const text = new Map();
  for (const rel of Object.values(F)) text.set(rel, readText(rel));
  const src = [];
  for (const rel of productionSources()) {
    const t = rel in text ? text.get(rel) : readText(rel);
    if (t === null) continue;
    if (SCOPE_WORDS.some((w) => t.includes(w)) || Object.values(F).includes(rel)) {
      text.set(rel, t);
      src.push(rel);
    }
  }
  for (const rel of [F.flag, F.checker, F.events, F.menu, F.buildInfo]) if (!src.includes(rel)) src.push(rel);
  let amalgamationSha = null;
  try {
    amalgamationSha = sha256(readFileSync(join(ROOT, AMALGAMATION)));
  } catch {
    /* reported by D6 */
  }
  const bs3 = {
    installed: (() => {
      try {
        return JSON.parse(readFileSync(join(ROOT, BS3, 'package.json'), 'utf8')).version ?? null;
      } catch {
        return null;
      }
    })(),
    locked: (() => {
      try {
        const lock = JSON.parse(readFileSync(join(ROOT, 'package-lock.json'), 'utf8'));
        return lock.packages?.['node_modules/better-sqlite3']?.version ?? null;
      } catch {
        return null;
      }
    })(),
    sources: Object.fromEntries(
      Object.values(ANCHOR_SITES).map((s) => [s.file, readText(`${BS3}/${s.file}`)])
    )
  };
  return { text, src, amalgamationSha, bs3 };
}

/** A copy of the tree with one file's text changed by `change`; null when the change could not be made. */
function withText(tree, rel, change) {
  const before = tree.text.get(rel);
  if (before === null || before === undefined) return null;
  const after = change(before);
  if (after === null || after === undefined || after === before) return null;
  const text = new Map(tree.text);
  text.set(rel, after);
  return { ...tree, text };
}

/** A copy of the tree with one more production file. */
function withSource(tree, rel, body) {
  const text = new Map(tree.text);
  text.set(rel, body);
  return { ...tree, text, src: [...tree.src, rel] };
}

/** Insert `add` after the first occurrence of `anchor` in `text`, or null. */
function after(text, anchor, add) {
  const at = text.indexOf(anchor);
  return at === -1 ? null : text.slice(0, at + anchor.length) + add + text.slice(at + anchor.length);
}
/** Replace the first occurrence of `from` in `text`, or null. */
function swap(text, from, to) {
  const at = text.indexOf(from);
  return at === -1 ? null : text.slice(0, at) + to + text.slice(at + from.length);
}

/** The missing files a clause needs, as findings naming their builder. */
function missing(tree, ...rels) {
  return rels
    .filter((rel) => tree.text.get(rel) === null || tree.text.get(rel) === undefined)
    .map((rel) => `${rel} does not exist (builder: ${OWNER[rel] ?? 'unknown'})`);
}

// ---------------------------------------------------------------------------
// Reading TypeScript and the build scripts
// ---------------------------------------------------------------------------

const parsed = new Map();
function sfOf(rel, text) {
  let byText = parsed.get(rel);
  if (byText === undefined) parsed.set(rel, (byText = new Map()));
  let sf = byText.get(text);
  if (sf === undefined) {
    const kind = /\.tsx$/.test(rel)
      ? ts.ScriptKind.TSX
      : /\.[cm]?js$/.test(rel)
        ? ts.ScriptKind.JS
        : ts.ScriptKind.TS;
    sf = ts.createSourceFile(rel, text, ts.ScriptTarget.Latest, true, kind);
    byText.set(text, sf);
  }
  return sf;
}

const nodeLists = new WeakMap();
function nodesOf(root) {
  let out = nodeLists.get(root);
  if (out === undefined) {
    out = [];
    const visit = (n) => {
      out.push(n);
      ts.forEachChild(n, visit);
    };
    visit(root);
    nodeLists.set(root, out);
  }
  return out;
}

const lineOf = (node) => {
  const sf = node.getSourceFile();
  return sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
};
const at = (rel, node) => `${rel}:${String(lineOf(node))}`;

/** `(x)`, `x as T`, `x satisfies T`, `x!`, peeled to `x`. */
function peel(expr) {
  let e = expr;
  while (
    e !== undefined &&
    (ts.isParenthesizedExpression(e) || ts.isAsExpression(e) || ts.isSatisfiesExpression(e) || ts.isNonNullExpression(e) || ts.isTypeAssertionExpression(e))
  ) {
    e = e.expression;
  }
  return e;
}

/** Is this identifier read as a value (not a declaration's name, a property name, an import's name or a type)? */
function isValueRef(id) {
  const p = id.parent;
  if (p === undefined) return false;
  if (ts.isImportSpecifier(p) || ts.isImportClause(p) || ts.isNamespaceImport(p) || ts.isExportSpecifier(p)) return false;
  if (ts.isPropertyAccessExpression(p) && p.name === id) return false;
  if (ts.isQualifiedName(p)) return false;
  if (
    (ts.isPropertyAssignment(p) ||
      ts.isPropertyDeclaration(p) ||
      ts.isMethodDeclaration(p) ||
      ts.isPropertySignature(p) ||
      ts.isMethodSignature(p) ||
      ts.isGetAccessorDeclaration(p) ||
      ts.isSetAccessorDeclaration(p) ||
      ts.isEnumMember(p) ||
      ts.isVariableDeclaration(p) ||
      ts.isFunctionDeclaration(p) ||
      ts.isFunctionExpression(p) ||
      ts.isClassDeclaration(p) ||
      ts.isClassExpression(p) ||
      ts.isInterfaceDeclaration(p) ||
      ts.isTypeAliasDeclaration(p) ||
      ts.isEnumDeclaration(p) ||
      ts.isModuleDeclaration(p) ||
      ts.isParameter(p) ||
      ts.isBindingElement(p)) &&
    p.name === id
  ) {
    return false;
  }
  if (ts.isLabeledStatement(p) || ts.isBreakStatement(p) || ts.isContinueStatement(p)) return false;
  if (ts.isJsxAttribute(p)) return false;
  for (let q = p; q !== undefined; q = q.parent) {
    if (ts.isTypeNode(q) && !ts.isExpressionWithTypeArguments(q)) return false;
  }
  return true;
}

/** Is this identifier the NAME of a declaration (a variable, function, parameter or binding)? */
function isDeclName(id) {
  const p = id.parent;
  return (
    p !== undefined &&
    (ts.isVariableDeclaration(p) || ts.isFunctionDeclaration(p) || ts.isParameter(p) || ts.isBindingElement(p) || ts.isClassDeclaration(p)) &&
    p.name === id
  );
}

/** The repository-relative module a specifier names, without extension, or null for a package. */
function moduleOf(fromRel, spec) {
  if (spec.startsWith('@shared/')) return `src/shared/${spec.slice('@shared/'.length)}`.replace(/\.[cm]?[jt]sx?$/, '');
  if (!spec.startsWith('.')) return null;
  return posix.normalize(posix.join(posix.dirname(fromRel), spec)).replace(/\.[cm]?[jt]sx?$/, '').replace(/\/index$/, '');
}

/** Every import-like edge of a file: static, re-export, dynamic, require. */
function edgesOf(rel, sf) {
  const out = [];
  for (const n of nodesOf(sf)) {
    if (ts.isImportDeclaration(n) && ts.isStringLiteral(n.moduleSpecifier)) {
      out.push({ kind: 'import', node: n, module: moduleOf(rel, n.moduleSpecifier.text) });
    } else if (ts.isExportDeclaration(n) && n.moduleSpecifier !== undefined && ts.isStringLiteral(n.moduleSpecifier)) {
      out.push({ kind: 'export', node: n, module: moduleOf(rel, n.moduleSpecifier.text) });
    } else if (ts.isCallExpression(n) && n.arguments.length > 0) {
      const a = n.arguments[0];
      const isImport = n.expression.kind === ts.SyntaxKind.ImportKeyword;
      const isRequire = ts.isIdentifier(n.expression) && n.expression.text === 'require';
      if ((isImport || isRequire) && (ts.isStringLiteral(a) || ts.isNoSubstitutionTemplateLiteral(a))) {
        out.push({ kind: 'dynamic', node: n, module: moduleOf(rel, a.text) });
      } else if ((isImport || isRequire) && !ts.isStringLiteral(a)) {
        out.push({ kind: 'dynamic', node: n, module: null, computed: true });
      }
    }
  }
  return out;
}

/** Every string a file holds AS CODE: literals and template pieces, comments excluded. */
function codeStrings(sf) {
  return nodesOf(sf)
    .filter(
      (n) =>
        ts.isStringLiteral(n) ||
        ts.isNoSubstitutionTemplateLiteral(n) ||
        ts.isTemplateHead(n) ||
        ts.isTemplateMiddle(n) ||
        ts.isTemplateTail(n) ||
        ts.isRegularExpressionLiteral(n)
    )
    .map((node) => ({ node, text: ts.isRegularExpressionLiteral(node) ? node.text : node.text }));
}

/** Is `node` inside the THEN branch of `if (DIAGNOSTIC_BUILD)` with no else, crossing functions? */
function guardOf(node) {
  for (let child = node, p = node.parent; p !== undefined; child = p, p = p.parent) {
    if (ts.isIfStatement(p) && p.thenStatement === child && isWholeFlagTest(p)) return p;
  }
  return null;
}
function isWholeFlagTest(ifStmt) {
  return ts.isIdentifier(ifStmt.expression) && ifStmt.expression.text === FLAG && ifStmt.elseStatement === undefined;
}
/**
 * The `try` statement whose TRY BLOCK holds `node`, crossing functions, or null.
 * Rollup keeps every statement of a try block (its try-catch deoptimization):
 * `if (DIAGNOSTIC_BUILD) armChecker();` inside one became `if (DIAGNOSTIC_BUILD) ;`
 * in the normal bundle, with the flag's const AND armChecker's whole body kept,
 * while the same statement in a catch or a finally block was dropped (the probe
 * review measured it with the tree's rollup 4.62.4, 2026-11-09; the `main`
 * builder measured the try case first, SPEC §As built). Crossing functions is
 * the cautious reading: a callback declared in a try block is not measured.
 */
function enclosingTryBlock(node) {
  for (let child = node, p = node.parent; p !== undefined; child = p, p = p.parent) {
    if (ts.isTryStatement(p) && p.tryBlock === child) return p;
  }
  return null;
}

/** `export default <call>(<object>)`, the object; or the object itself. */
function configObject(sf) {
  for (const st of sf.statements) {
    if (!ts.isExportAssignment(st)) continue;
    let e = peel(st.expression);
    if (ts.isCallExpression(e) && e.arguments.length >= 1) e = peel(e.arguments[0]);
    if (e !== undefined && ts.isObjectLiteralExpression(e)) return e;
  }
  return null;
}
/** A property of an object literal, by name: its PropertyAssignment, or null. */
function propOf(obj, name) {
  if (obj === null || obj === undefined || !ts.isObjectLiteralExpression(obj)) return null;
  for (const p of obj.properties) {
    if (ts.isPropertyAssignment(p) && p.name !== undefined && propName(p.name) === name) return p;
  }
  return null;
}
function propName(name) {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNoSubstitutionTemplateLiteral(name) || ts.isNumericLiteral(name)) return name.text;
  return null;
}
/** Every top-level `const NAME = <init>` of a file. */
function topConsts(sf) {
  const out = new Map();
  for (const st of sf.statements) {
    if (!ts.isVariableStatement(st)) continue;
    for (const d of st.declarationList.declarations) {
      if (ts.isIdentifier(d.name) && d.initializer !== undefined) out.set(d.name.text, d.initializer);
    }
  }
  return out;
}
const isStr = (e, value) => e !== undefined && (ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e)) && (value === undefined || e.text === value);

/** `process.env.TORTIE_DIAGNOSTIC` or `process.env['TORTIE_DIAGNOSTIC']`. */
function isEnvRead(expr) {
  const e = peel(expr);
  if (e === undefined) return false;
  const objIsEnv = (o) => {
    const x = peel(o);
    return x !== undefined && ts.isPropertyAccessExpression(x) && x.name.text === 'env' && ts.isIdentifier(x.expression) && x.expression.text === 'process';
  };
  if (ts.isPropertyAccessExpression(e)) return e.name.text === ENV_NAME && objIsEnv(e.expression);
  if (ts.isElementAccessExpression(e)) return isStr(peel(e.argumentExpression), ENV_NAME) && objIsEnv(e.expression);
  return false;
}
/** `process.env.TORTIE_DIAGNOSTIC === '1'`, either way round, directly or through a top-level const. */
function isEnvTest(expr, consts, seen = new Set()) {
  const e = peel(expr);
  if (e === undefined) return false;
  if (ts.isIdentifier(e) && consts.has(e.text) && !seen.has(e.text)) {
    seen.add(e.text);
    return isEnvTest(consts.get(e.text), consts, seen);
  }
  if (ts.isBinaryExpression(e) && e.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken) {
    const a = peel(e.left);
    const b = peel(e.right);
    return (isEnvRead(a) && isStr(b, '1')) || (isEnvRead(b) && isStr(a, '1'));
  }
  return false;
}
/** `JSON.stringify(<x>)`'s argument, or null. */
function stringifyArg(expr) {
  const e = peel(expr);
  if (e === undefined || !ts.isCallExpression(e) || e.arguments.length !== 1) return null;
  const c = e.expression;
  if (!ts.isPropertyAccessExpression(c) || c.name.text !== 'stringify' || !ts.isIdentifier(c.expression) || c.expression.text !== 'JSON') return null;
  return e.arguments[0];
}

// ---------------------------------------------------------------------------
// D1 — the define
// ---------------------------------------------------------------------------

/** D1.a: `__TORTIE_DIAGNOSTIC__` is named, as code, in no production file under src/ but flag.ts. */
function d1a(tree) {
  const out = [];
  for (const rel of tree.src) {
    const text = tree.text.get(rel);
    if (!isProduction(rel) || typeof text !== 'string' || !text.includes(DEFINE) || rel === F.flag) continue;
    const sf = sfOf(rel, text);
    for (const n of nodesOf(sf)) {
      const named = (ts.isIdentifier(n) && n.text === DEFINE) || ((ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n) || ts.isTemplateHead(n) || ts.isTemplateMiddle(n) || ts.isTemplateTail(n)) && n.text.includes(DEFINE));
      if (named) {
        out.push(`${at(rel, n)} names ${DEFINE}; only ${F.flag} may, so the build has one flag and one place it becomes DIAGNOSTIC_BUILD`);
      }
    }
  }
  return out;
}

/**
 * The two spellings of the flag's value: the define itself (SPEC §4.2), or the
 * define behind the `typeof` guard build-info.ts gives its own define, so a
 * module importing flag.ts where no define exists (a test, a tsx script) reads
 * false instead of throwing. After the define is replaced, both are a constant
 * rollup can fold; the bytes of the normal `out/` are what prove it (§10.1 A1).
 */
function isFlagInit(init) {
  const e = peel(init);
  if (e === undefined) return false;
  if (ts.isIdentifier(e)) return e.text === DEFINE;
  if (!ts.isBinaryExpression(e) || e.operatorToken.kind !== ts.SyntaxKind.AmpersandAmpersandToken) return false;
  const l = peel(e.left);
  const r = peel(e.right);
  if (l === undefined || r === undefined || !ts.isBinaryExpression(l) || l.operatorToken.kind !== ts.SyntaxKind.EqualsEqualsEqualsToken) return false;
  const t = peel(l.left);
  return t !== undefined && ts.isTypeOfExpression(t) && ts.isIdentifier(peel(t.expression) ?? t) && peel(t.expression).text === DEFINE && isStr(peel(l.right), 'boolean') && ts.isIdentifier(r) && r.text === DEFINE;
}

/** D1.b: flag.ts is exactly the declaration and the one export. */
function d1b(tree) {
  const gone = missing(tree, F.flag);
  if (gone.length > 0) return gone;
  const sf = sfOf(F.flag, tree.text.get(F.flag));
  const out = [];
  const st = sf.statements;
  const hasMod = (s, kind) => (ts.canHaveModifiers(s) ? ts.getModifiers(s) ?? [] : []).some((m) => m.kind === kind);
  const okDeclare =
    st.length >= 1 &&
    ts.isVariableStatement(st[0]) &&
    hasMod(st[0], ts.SyntaxKind.DeclareKeyword) &&
    (st[0].declarationList.flags & ts.NodeFlags.Const) !== 0 &&
    st[0].declarationList.declarations.length === 1 &&
    ts.isIdentifier(st[0].declarationList.declarations[0].name) &&
    st[0].declarationList.declarations[0].name.text === DEFINE &&
    st[0].declarationList.declarations[0].initializer === undefined &&
    st[0].declarationList.declarations[0].type !== undefined &&
    st[0].declarationList.declarations[0].type.kind === ts.SyntaxKind.BooleanKeyword;
  if (!okDeclare) out.push(`${F.flag} must begin with \`declare const ${DEFINE}: boolean;\``);
  const d = st.length >= 2 && ts.isVariableStatement(st[1]) ? st[1].declarationList.declarations : [];
  const okExport =
    st.length >= 2 &&
    ts.isVariableStatement(st[1]) &&
    hasMod(st[1], ts.SyntaxKind.ExportKeyword) &&
    (st[1].declarationList.flags & ts.NodeFlags.Const) !== 0 &&
    d.length === 1 &&
    ts.isIdentifier(d[0].name) &&
    d[0].name.text === FLAG &&
    (d[0].type === undefined || d[0].type.kind === ts.SyntaxKind.BooleanKeyword) &&
    d[0].initializer !== undefined &&
    isFlagInit(d[0].initializer);
  if (!okExport) {
    out.push(
      `${F.flag}'s second statement must be \`export const ${FLAG}: boolean = ${DEFINE};\` (or build-info.ts's \`typeof ${DEFINE} === 'boolean' && ${DEFINE}\`): ` +
        `the define read whole, nothing beside it, so rollup can fold every \`if (${FLAG})\``
    );
  }
  if (st.length !== 2) {
    out.push(`${F.flag} holds ${String(st.length)} statements; it holds the declaration and the export and nothing else (SPEC §4.2)`);
  }
  return out;
}

/** D1.c: electron.vite.config.ts sets the define from `TORTIE_DIAGNOSTIC === '1'`, in main alone. */
function d1c(tree) {
  const gone = missing(tree, F.vite);
  if (gone.length > 0) return gone;
  const sf = sfOf(F.vite, tree.text.get(F.vite));
  const out = [];
  const consts = topConsts(sf);
  const cfg = configObject(sf);
  if (cfg === null) return [`${F.vite} has no \`export default defineConfig({ … })\` object this gate can read`];
  const named = nodesOf(sf).filter((n) => (ts.isIdentifier(n) || isStr(n)) && n.text === DEFINE);
  const mainDefine = peel(propOf(peel(propOf(cfg, 'main')?.initializer), 'define')?.initializer);
  const prop = propOf(mainDefine, DEFINE);
  if (prop === null) {
    out.push(`${F.vite}: main's \`define\` does not set ${DEFINE}`);
  } else {
    const arg = stringifyArg(prop.initializer);
    if (arg === null || !isEnvTest(arg, consts)) {
      out.push(
        `${at(F.vite, prop)}: ${DEFINE} must be \`JSON.stringify(process.env.${ENV_NAME} === '1')\` (directly or through one top-level const), so only the package step's TORTIE_DIAGNOSTIC=1 turns it on`
      );
    }
  }
  if (named.length !== 1 || (prop !== null && named[0] !== prop.name)) {
    for (const n of named) {
      if (prop !== null && n === prop.name) continue;
      out.push(`${at(F.vite, n)} names ${DEFINE} outside main's define; the preload and the renderers never see it`);
    }
  }
  for (const n of nodesOf(sf)) {
    if (!isEnvRead(n)) continue;
    let p = n.parent;
    while (p !== undefined && ts.isParenthesizedExpression(p)) p = p.parent;
    const ok = p !== undefined && ts.isBinaryExpression(p) && p.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken && (isStr(peel(p.left), '1') || isStr(peel(p.right), '1'));
    if (!ok) out.push(`${at(F.vite, n)} reads ${ENV_NAME} other than as \`=== '1'\`; one spelling, so a typo cannot turn the diagnostic on`);
  }
  return out;
}

/** D1.d: vitest.config.ts defines the flag false. */
function d1d(tree) {
  const gone = missing(tree, F.vitest);
  if (gone.length > 0) return gone;
  const sf = sfOf(F.vitest, tree.text.get(F.vitest));
  const cfg = configObject(sf);
  if (cfg === null) return [`${F.vitest} has no \`export default defineConfig({ … })\` object this gate can read`];
  const prop = propOf(peel(propOf(cfg, 'define')?.initializer), DEFINE);
  if (prop === null) {
    return [`${F.vitest} does not define ${DEFINE} in its top-level \`define\`, so a test importing flag.ts throws and no test runs the normal build's flag (SPEC §6)`];
  }
  const v = peel(prop.initializer);
  const isFalse =
    isStr(v, 'false') || v.kind === ts.SyntaxKind.FalseKeyword || (() => {
      const a = stringifyArg(v);
      return a !== null && peel(a).kind === ts.SyntaxKind.FalseKeyword;
    })();
  return isFalse ? [] : [`${at(F.vitest, prop)}: ${DEFINE} must be false under vitest ('false', false or JSON.stringify(false))`];
}

// ---------------------------------------------------------------------------
// D2 — the flag's reads, and the guarded calls
// ---------------------------------------------------------------------------

/** D2.a: DIAGNOSTIC_BUILD is read only as the whole test of an else-less `if`, imported by name from flag.ts. */
function d2a(tree) {
  const out = [];
  for (const rel of tree.src) {
    const text = tree.text.get(rel);
    if (!isProduction(rel) || typeof text !== 'string' || (!text.includes(FLAG) && !text.includes('diagnostic-build'))) continue;
    const sf = sfOf(rel, text);
    for (const e of edgesOf(rel, sf)) {
      if (e.module !== FLAG_MODULE) continue;
      if (e.kind === 'export') {
        out.push(`${at(rel, e.node)} re-exports from flag.ts; the flag is imported by name where it is read, and nowhere else`);
        continue;
      }
      if (e.kind === 'dynamic') {
        out.push(`${at(rel, e.node)} loads flag.ts at run time; the flag is a static import, or rollup cannot fold it`);
        continue;
      }
      const clause = e.node.importClause;
      if (clause === undefined) continue;
      if (clause.name !== undefined) out.push(`${at(rel, e.node)} imports flag.ts by default; it has one named export`);
      const nb = clause.namedBindings;
      if (nb !== undefined && ts.isNamespaceImport(nb)) {
        out.push(`${at(rel, e.node)} imports flag.ts as a namespace; import \`{ ${FLAG} }\` by name`);
      }
      if (nb !== undefined && ts.isNamedImports(nb)) {
        for (const s of nb.elements) {
          const imported = (s.propertyName ?? s.name).text;
          if (imported !== FLAG) out.push(`${at(rel, s)} imports ${imported} from flag.ts, which exports only ${FLAG}`);
          else if (s.propertyName !== undefined) out.push(`${at(rel, s)} renames ${FLAG}; one name, so every read is found`);
        }
      }
    }
    for (const n of nodesOf(sf)) {
      if (ts.isExportSpecifier(n) && (n.propertyName ?? n.name).text === FLAG) {
        out.push(`${at(rel, n)} re-exports ${FLAG}`);
      }
      if (!ts.isIdentifier(n) || n.text !== FLAG) continue;
      if (isDeclName(n)) {
        if (rel !== F.flag) out.push(`${at(rel, n)} declares its own ${FLAG}`);
        continue;
      }
      if (ts.isShorthandPropertyAssignment(n.parent)) {
        out.push(`${at(rel, n)} puts ${FLAG} in an object; it is read only as the whole test of an \`if\``);
        continue;
      }
      if (!isValueRef(n)) continue;
      const p = n.parent;
      if (ts.isIfStatement(p) && p.expression === n) {
        if (p.elseStatement !== undefined) {
          out.push(`${at(rel, n)} \`if (${FLAG})\` has an else; the normal build would keep the else and the diagnostic build would drop it, so nothing may hang on the false side`);
        }
        const inTry = enclosingTryBlock(p);
        if (inTry !== null) {
          out.push(
            `${at(rel, n)} \`if (${FLAG})\` sits inside the try block at ${at(rel, inTry)}; rollup keeps every statement of a try block, so the normal bundle would keep the test, the flag and the module behind it (put the statement above the try, as updater.ts and ui.ts do)`
          );
        }
        continue;
      }
      out.push(
        `${at(rel, n)} reads ${FLAG} inside ${ts.SyntaxKind[p.kind]}, not as the whole test of an \`if\`; rollup keeps a dead conditional, a logical expression, an argument or an assignment in the normal bundle (SPEC §0.1 item 6)`
      );
    }
  }
  return out;
}

/** D2.b: every export of checker.ts and events.ts is called only inside an `if (DIAGNOSTIC_BUILD)`'s consequent. */
function d2b(tree) {
  const out = [];
  for (const rel of tree.src) {
    if (rel.startsWith(MODULE_DIR) || !isProduction(rel)) continue;
    const text = tree.text.get(rel);
    if (typeof text !== 'string' || !text.includes('diagnostic-build')) continue;
    const sf = sfOf(rel, text);
    const locals = new Map();
    for (const e of edgesOf(rel, sf)) {
      if (e.computed === true) continue;
      if (!GUARDED_MODULES.includes(e.module)) continue;
      const which = `${e.module.slice(MODULE_DIR.length)}.ts`;
      if (e.kind === 'export') {
        out.push(`${at(rel, e.node)} re-exports ${which}; its exports are called where they are guarded, and nowhere else`);
        continue;
      }
      if (e.kind === 'dynamic') {
        out.push(`${at(rel, e.node)} loads ${which} at run time; a static import inside the guard's file, called inside the guard`);
        continue;
      }
      const clause = e.node.importClause;
      if (clause === undefined) {
        out.push(`${at(rel, e.node)} imports ${which} for its side effects; it has none, and the normal build must not load it`);
        continue;
      }
      if (clause.isTypeOnly) continue;
      if (clause.name !== undefined) locals.set(clause.name.text, which);
      const nb = clause.namedBindings;
      if (nb !== undefined && ts.isNamespaceImport(nb)) {
        out.push(`${at(rel, e.node)} imports ${which} as a namespace; import each function by name, so each call is found`);
      }
      if (nb !== undefined && ts.isNamedImports(nb)) {
        for (const s of nb.elements) if (!s.isTypeOnly) locals.set(s.name.text, which);
      }
    }
    if (locals.size === 0) continue;
    for (const n of nodesOf(sf)) {
      if (ts.isExportSpecifier(n) && locals.has((n.propertyName ?? n.name).text)) {
        out.push(`${at(rel, n)} re-exports ${(n.propertyName ?? n.name).text}`);
        continue;
      }
      if (!ts.isIdentifier(n) || !locals.has(n.text) || !isValueRef(n)) continue;
      const p = n.parent;
      const isCallee = ts.isCallExpression(p) && p.expression === n;
      if (!isCallee) {
        out.push(`${at(rel, n)} uses ${n.text} (${locals.get(n.text)}) without calling it; each export is CALLED, inside the guard, and never handed on`);
        continue;
      }
      if (guardOf(p) === null) {
        out.push(
          `${at(rel, n)} calls ${n.text} (${locals.get(n.text)}) outside \`if (${FLAG}) { … }\`; the normal build would keep the call and the module behind it`
        );
      }
    }
  }
  return out;
}

/** The words the diagnostic build's updater logs once, at init (SPEC §5); assert-bundle-refusals.mjs reads them in the bundle. */
const UPDATES_OFF_LINE = 'updates are off in this diagnostic build';
/** The calls initUpdater's diagnostic guard may make before its return: a log line, and nothing that wires anything. */
const GUARD_LOG_CALLS = new Set(['logInfo', 'logUpdateEvent']);

/**
 * D2.c (the fix round, lens B's ablation 3): the diagnostic build's updater never
 * starts. initUpdater's `if (DIAGNOSTIC_BUILD)` comes before anything is wired,
 * after only its once-only latch, and holds one log line (§5's words) and then a
 * bare `return`; checkForUpdatesNow's FIRST statement answers `unsupported` under
 * the same test. Deleting initUpdater's block left `.checkForUpdates(` in a
 * diagnostic bundle that every other rule of this gate read green, and
 * assert-bundle-refusals.mjs read as a normal bundle.
 */
function d2c(tree) {
  const gone = missing(tree, F.updater);
  if (gone.length > 0) return gone;
  const sf = sfOf(F.updater, tree.text.get(F.updater));
  const fnNamed = (name) => sf.statements.find((s) => ts.isFunctionDeclaration(s) && s.name?.text === name && s.body !== undefined) ?? null;
  const out = [];
  const isId = (e, name) => e !== undefined && ts.isIdentifier(peel(e)) && peel(e).text === name;
  // `if (initialized) return;` and `initialized = true;`, the latch initUpdater has always opened with.
  const isLatch = (s) =>
    (ts.isIfStatement(s) && isId(s.expression, 'initialized') && s.elseStatement === undefined && ts.isReturnStatement(ts.isBlock(s.thenStatement) && s.thenStatement.statements.length === 1 ? s.thenStatement.statements[0] : s.thenStatement)) ||
    (ts.isExpressionStatement(s) && ts.isBinaryExpression(s.expression) && s.expression.operatorToken.kind === ts.SyntaxKind.EqualsToken && isId(s.expression.left, 'initialized') && s.expression.right.kind === ts.SyntaxKind.TrueKeyword);
  const init = fnNamed('initUpdater');
  if (init === null) out.push(`${F.updater} declares no function initUpdater, the one place the updater is wired`);
  else {
    const body = init.body.statements;
    const i = body.findIndex((s) => ts.isIfStatement(s) && isWholeFlagTest(s));
    if (i === -1) out.push(`${at(F.updater, init)} initUpdater has no \`if (${FLAG}) { …; return; }\`, so the diagnostic build wires the updater and its first check runs 30 s after launch (SPEC D11, updater.ts rule 7)`);
    else {
      const guard = body[i];
      for (const s of body.slice(0, i)) {
        if (!isLatch(s)) out.push(`${at(F.updater, s)} initUpdater runs this statement before its diagnostic guard; only the once-only latch may come first, so nothing is wired in the diagnostic build`);
      }
      const inner = ts.isBlock(guard.thenStatement) ? [...guard.thenStatement.statements] : [guard.thenStatement];
      const last = inner[inner.length - 1];
      if (last === undefined || !ts.isReturnStatement(last) || last.expression !== undefined) {
        out.push(`${at(F.updater, guard)} initUpdater's diagnostic guard does not end in a bare \`return;\`, so the wiring below it runs in the diagnostic build`);
      }
      let saysOff = false;
      for (const s of inner.slice(0, -1)) {
        const call = ts.isExpressionStatement(s) ? peel(s.expression) : undefined;
        const callee = call !== undefined && ts.isCallExpression(call) && ts.isIdentifier(call.expression) ? call.expression.text : null;
        if (callee === null || !GUARD_LOG_CALLS.has(callee)) {
          out.push(`${at(F.updater, s)} initUpdater's diagnostic guard does something besides log one line before it returns`);
          continue;
        }
        if (call.arguments.some((a) => isStr(peel(a), UPDATES_OFF_LINE))) saysOff = true;
      }
      if (!saysOff) out.push(`${at(F.updater, guard)} initUpdater's diagnostic guard does not log ${JSON.stringify(UPDATES_OFF_LINE)} (SPEC §5), the line assert-bundle-refusals.mjs reads in the diagnostic bundle`);
    }
  }
  const now = fnNamed('checkForUpdatesNow');
  if (now === null) out.push(`${F.updater} declares no function checkForUpdatesNow, which "Check for Updates…" asks`);
  else {
    const first = now.body.statements[0];
    const answer = (() => {
      if (first === undefined || !ts.isIfStatement(first) || !isWholeFlagTest(first)) return null;
      const t = first.thenStatement;
      const ret = ts.isBlock(t) ? (t.statements.length === 1 ? t.statements[0] : undefined) : t;
      if (ret === undefined || !ts.isReturnStatement(ret) || ret.expression === undefined) return null;
      const obj = peel(ret.expression);
      if (!ts.isObjectLiteralExpression(obj) || obj.properties.length !== 1) return null;
      const kind = propOf(obj, 'kind');
      return kind !== null && isStr(peel(kind.initializer), 'unsupported') ? kind : null;
    })();
    if (answer === null) out.push(`${at(F.updater, now)} checkForUpdatesNow's first statement is not \`if (${FLAG}) return { kind: 'unsupported' };\`, so "Check for Updates…" could start a check in the diagnostic build`);
  }
  return out;
}

// ---------------------------------------------------------------------------
// D3 — the normal app's two files, the About mark, and nothing at import
// ---------------------------------------------------------------------------

/** D3.a: menu.ts and build-info.ts name neither flag and import nothing from the diagnostic modules. */
function d3a(tree) {
  const out = missing(tree, F.menu, F.buildInfo);
  for (const rel of [F.menu, F.buildInfo]) {
    const text = tree.text.get(rel);
    if (typeof text !== 'string') continue;
    const sf = sfOf(rel, text);
    for (const n of nodesOf(sf)) {
      if (ts.isIdentifier(n) && (n.text === FLAG || n.text === DEFINE)) {
        out.push(`${at(rel, n)} names ${n.text}; About's mark rides in the build stamp, so ${rel} stays byte for byte (SPEC D3)`);
      }
      if ((ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) && (n.text.includes(FLAG) || n.text.includes(DEFINE))) {
        out.push(`${at(rel, n)} spells a diagnostic flag in a string`);
      }
    }
    for (const e of edgesOf(rel, sf)) {
      if (e.module !== null && e.module.startsWith(MODULE_DIR.slice(0, -1))) {
        out.push(`${at(rel, e.node)} imports ${e.module}; ${rel} never moves for the diagnostic build`);
      }
    }
  }
  return out;
}

/** D3.b: the stamp ends in " Diagnostic" only under the same test as the define, in main alone. */
function d3b(tree) {
  const gone = missing(tree, F.vite);
  if (gone.length > 0) return gone;
  const sf = sfOf(F.vite, tree.text.get(F.vite));
  const consts = topConsts(sf);
  const cfg = configObject(sf);
  if (cfg === null) return [`${F.vite} has no config object this gate can read`];
  const out = [];
  const marks = codeStrings(sf).filter((s) => s.text.includes('Diagnostic'));
  const mainDefine = peel(propOf(peel(propOf(cfg, 'main')?.initializer), 'define')?.initializer);
  const stamp = propOf(mainDefine, '__TORTIE_BUILD_COMMIT__');
  if (stamp === null) return [`${F.vite}: main's define has no __TORTIE_BUILD_COMMIT__, the stamp About reads`];
  const arg = peel(stringifyArg(stamp.initializer) ?? undefined);
  let cond = null;
  if (arg !== undefined && ts.isBinaryExpression(arg) && arg.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    const left = peel(arg.left);
    const right = peel(arg.right);
    const leftIsCommit = left !== undefined && ts.isCallExpression(left) && ts.isIdentifier(left.expression) && left.expression.text === 'buildCommit' && left.arguments.length === 0;
    if (leftIsCommit && right !== undefined && ts.isConditionalExpression(right)) cond = right;
  }
  if (cond === null) {
    out.push(`${at(F.vite, stamp)}: the stamp must be \`JSON.stringify(buildCommit() + (<the define's test> ? '${STAMP_MARK}' : ''))\`, so the normal stamp is today's string`);
  } else {
    if (!isEnvTest(cond.condition, consts)) out.push(`${at(F.vite, cond)}: the mark's condition is not the define's own test, \`process.env.${ENV_NAME} === '1'\``);
    if (!isStr(peel(cond.whenTrue), STAMP_MARK)) out.push(`${at(F.vite, cond)}: the mark is '${STAMP_MARK}' exactly`);
    if (!isStr(peel(cond.whenFalse), '')) out.push(`${at(F.vite, cond)}: the normal side adds nothing ('')`);
  }
  for (const m of marks) {
    if (cond !== null && m.node === peel(cond.whenTrue)) continue;
    out.push(`${at(F.vite, m.node)} spells 'Diagnostic' outside the stamp's one conditional`);
  }
  const stampNames = nodesOf(sf).filter((n) => (ts.isIdentifier(n) || isStr(n)) && n.text === '__TORTIE_BUILD_COMMIT__');
  if (stampNames.length !== 1) out.push(`${F.vite} names __TORTIE_BUILD_COMMIT__ ${String(stampNames.length)} times; once, in main's define`);
  return out;
}

/** D3.c: the three diagnostic modules run nothing when they are imported. */
function d3c(tree) {
  const out = missing(tree, F.flag, F.checker, F.events);
  for (const rel of [F.flag, F.checker, F.events]) {
    const text = tree.text.get(rel);
    if (typeof text !== 'string') continue;
    const sf = sfOf(rel, text);
    for (const st of sf.statements) {
      const why = runsAtImport(st);
      if (why !== null) {
        out.push(
          `${at(rel, st)} ${why} at the top level of ${rel}; rollup keeps a module's top-level effects even when nothing it exports is called, so the normal build would change`
        );
      }
    }
  }
  return out;
}
/** Why a top-level statement runs code when its module is imported, or null. */
function runsAtImport(st) {
  if (ts.isImportDeclaration(st)) return st.importClause === undefined ? 'imports a module for its side effects' : null;
  if (ts.isInterfaceDeclaration(st) || ts.isTypeAliasDeclaration(st) || ts.isFunctionDeclaration(st)) return null;
  if (ts.isExportDeclaration(st)) return st.moduleSpecifier === undefined ? null : 're-exports another module';
  if (ts.isEnumDeclaration(st)) {
    const mods = ts.getModifiers(st) ?? [];
    return mods.some((m) => m.kind === ts.SyntaxKind.ConstKeyword || m.kind === ts.SyntaxKind.DeclareKeyword) ? null : 'declares an enum, which compiles to a call';
  }
  if (ts.isVariableStatement(st)) {
    const mods = ts.getModifiers(st) ?? [];
    if (mods.some((m) => m.kind === ts.SyntaxKind.DeclareKeyword)) return null;
    for (const d of st.declarationList.declarations) {
      if (d.initializer !== undefined && !isInert(d.initializer)) return `initialises ${d.name.getText()} by running code`;
    }
    return null;
  }
  if (ts.isClassDeclaration(st)) {
    if ((ts.getDecorators?.(st) ?? []).length > 0) return 'decorates a class';
    for (const m of st.members) {
      if (ts.isClassStaticBlockDeclaration(m)) return 'runs a static block';
      const mods = ts.canHaveModifiers(m) ? ts.getModifiers(m) ?? [] : [];
      if (ts.isPropertyDeclaration(m) && m.initializer !== undefined && mods.some((x) => x.kind === ts.SyntaxKind.StaticKeyword) && !isInert(m.initializer)) {
        return 'initialises a static field by running code';
      }
    }
    return null;
  }
  if (ts.isModuleDeclaration(st)) return null;
  if (ts.isEmptyStatement(st)) return null;
  return `holds a ${ts.SyntaxKind[st.kind]}`;
}
/** A value that is computed without calling anything. */
function isInert(expr) {
  const e = peel(expr);
  if (e === undefined) return true;
  if (
    ts.isLiteralExpression(e) ||
    ts.isNoSubstitutionTemplateLiteral(e) ||
    ts.isIdentifier(e) ||
    ts.isArrowFunction(e) ||
    ts.isFunctionExpression(e) ||
    e.kind === ts.SyntaxKind.TrueKeyword ||
    e.kind === ts.SyntaxKind.FalseKeyword ||
    e.kind === ts.SyntaxKind.NullKeyword
  ) {
    return true;
  }
  if (ts.isPrefixUnaryExpression(e) && ts.isNumericLiteral(e.operand)) return true;
  if (ts.isPrefixUnaryExpression(e) && e.operator === ts.SyntaxKind.ExclamationToken) return isInert(e.operand);
  if (ts.isTypeOfExpression(e)) return isInert(e.expression);
  if (
    ts.isBinaryExpression(e) &&
    [ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken, ts.SyntaxKind.AmpersandAmpersandToken, ts.SyntaxKind.BarBarToken].includes(e.operatorToken.kind)
  ) {
    return isInert(e.left) && isInert(e.right);
  }
  if (ts.isArrayLiteralExpression(e)) return e.elements.every((x) => isInert(x));
  if (ts.isObjectLiteralExpression(e)) {
    return e.properties.every(
      (p) =>
        (ts.isPropertyAssignment(p) && !ts.isComputedPropertyName(p.name) && isInert(p.initializer)) ||
        ts.isShorthandPropertyAssignment(p) ||
        (ts.isMethodDeclaration(p) && !ts.isComputedPropertyName(p.name))
    );
  }
  return false;
}

// ---------------------------------------------------------------------------
// Reading the C (D4, D5). A lexer, a reading of the `#if` groups, the
// functions, and the walk's reads. No C toolchain is run.
// ---------------------------------------------------------------------------

const PLANT_MACRO = 'TCHK_PLANT';
const ABLATE_PREFIX = 'TCHK_ABLATE_';
const C_PUNCT3 = new Set(['...', '<<=', '>>=']);
const C_PUNCT2 = new Set(['->', '++', '--', '<<', '>>', '<=', '>=', '==', '!=', '&&', '||', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '##']);

/**
 * Tokens and directives. A token is `{ t, v, line, dir }`: `t` is id, num, str,
 * chr or p; a string's `v` is its body as written (escapes kept); `dir` is the
 * index of the directive the token sits in, or -1 for code. Comments are
 * dropped, so a comment can neither satisfy nor break a rule.
 */
function lexC(text) {
  const toks = [];
  const directives = [];
  const n = text.length;
  let i = 0;
  let line = 1;
  let lineHasCode = false;
  let dir = null;
  const add = (t, v, l) => {
    const tok = { t, v, line: l, s: i, dir: dir === null ? -1 : dir.index };
    toks.push(tok);
    if (dir !== null) dir.toks.push(tok);
  };
  while (i < n) {
    const c = text[i];
    if (c === '\n') {
      if (dir !== null) {
        dir.endLine = line;
        dir = null;
      }
      line += 1;
      i += 1;
      lineHasCode = false;
      continue;
    }
    if (c === '\\' && text[i + 1] === '\n') {
      i += 2;
      line += 1;
      continue;
    }
    if (c === ' ' || c === '\t' || c === '\r' || c === '\f' || c === '\v') {
      i += 1;
      continue;
    }
    if (c === '/' && text[i + 1] === '*') {
      const e = text.indexOf('*/', i + 2);
      const stop = e === -1 ? n : e + 2;
      for (let k = i; k < stop; k += 1) if (text[k] === '\n') line += 1;
      i = stop;
      continue;
    }
    if (c === '/' && text[i + 1] === '/') {
      while (i < n && text[i] !== '\n') i += 1;
      continue;
    }
    if (c === '#' && !lineHasCode && dir === null) {
      dir = { index: directives.length, line, endLine: line, name: '', toks: [], s: i };
      directives.push(dir);
      i += 1;
      while (i < n && (text[i] === ' ' || text[i] === '\t')) i += 1;
      let j = i;
      while (j < n && /\w/.test(text[j])) j += 1;
      dir.name = text.slice(i, j);
      i = j;
      lineHasCode = true;
      continue;
    }
    lineHasCode = true;
    if (c === '"' || c === "'") {
      const l = line;
      let j = i + 1;
      let raw = '';
      while (j < n && text[j] !== c) {
        if (text[j] === '\\' && j + 1 < n) {
          if (text[j + 1] === '\n') {
            j += 2;
            line += 1;
            continue;
          }
          raw += text[j] + text[j + 1];
          j += 2;
          continue;
        }
        if (text[j] === '\n') break;
        raw += text[j];
        j += 1;
      }
      add(c === '"' ? 'str' : 'chr', raw, l);
      i = j + 1;
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      let j = i + 1;
      while (j < n && /\w/.test(text[j])) j += 1;
      const id = text.slice(i, j);
      if ((id === 'L' || id === 'u' || id === 'U' || id === 'u8') && (text[j] === '"' || text[j] === "'")) {
        i = j;
        continue;
      }
      add('id', id, line);
      i = j;
      continue;
    }
    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(text[i + 1] ?? ''))) {
      let j = i + 1;
      while (j < n && (/[\w.]/.test(text[j]) || ((text[j] === '+' || text[j] === '-') && /[eEpP]/.test(text[j - 1])))) j += 1;
      add('num', text.slice(i, j), line);
      i = j;
      continue;
    }
    const three = text.slice(i, i + 3);
    if (C_PUNCT3.has(three)) {
      add('p', three, line);
      i += 3;
      continue;
    }
    const two = text.slice(i, i + 2);
    if (C_PUNCT2.has(two)) {
      add('p', two, line);
      i += 2;
      continue;
    }
    add('p', c, line);
    i += 1;
  }
  if (dir !== null) dir.endLine = line;
  return { toks, directives, lines: line };
}

/**
 * One condition of an `#if`/`#elif`, read for TCHK_PLANT and TCHK_ABLATE_*:
 * `plant` 'pos' when the branch needs TCHK_PLANT, 'neg' when it needs it
 * undefined; `ablate` 'pos' when the diagnostic variant (which defines none of
 * them) can never take the branch; `single` when the whole condition is one
 * term, which is what lets an `#else` be read as its opposite.
 */
function readCondition(dir) {
  const v = dir.toks.map((t) => t.v);
  const ours = (m) => m === PLANT_MACRO || (typeof m === 'string' && m.startsWith(ABLATE_PREFIX));
  const base = { plant: null, ablate: null, single: false, zero: false, mixed: false };
  if (dir.name === 'ifdef' || dir.name === 'ifndef') {
    const positive = dir.name === 'ifdef';
    const m = v[0];
    return {
      ...base,
      single: true,
      plant: m === PLANT_MACRO ? (positive ? 'pos' : 'neg') : null,
      ablate: typeof m === 'string' && m.startsWith(ABLATE_PREFIX) ? (positive ? 'pos' : 'neg') : null
    };
  }
  if (dir.name === 'else') return { ...base, isElse: true };
  if (v.length === 1 && v[0] === '0') return { ...base, single: true, zero: true };
  const closes = (c) => {
    let d = 0;
    for (let i = 0; i < c.length; i += 1) {
      if (c[i] === '(') d += 1;
      if (c[i] === ')') {
        d -= 1;
        if (d === 0) return i === c.length - 1;
      }
    }
    return false;
  };
  const strip = (c) => {
    let x = c;
    while (x.length >= 2 && x[0] === '(' && closes(x)) x = x.slice(1, -1);
    return x;
  };
  const split = (c, op) => {
    const parts = [[]];
    let d = 0;
    for (const w of c) {
      if (w === '(') d += 1;
      if (w === ')') d -= 1;
      if (d === 0 && w === op) parts.push([]);
      else parts[parts.length - 1].push(w);
    }
    return parts;
  };
  const termOf = (c0) => {
    let c = strip(c0);
    let positive = true;
    if (c[0] === '!') {
      positive = false;
      c = strip(c.slice(1));
    }
    let macro = null;
    if (c.length === 4 && c[0] === 'defined' && c[1] === '(' && c[3] === ')') macro = c[2];
    else if (c.length === 2 && c[0] === 'defined') macro = c[1];
    else if (c.length === 1 && /^[A-Za-z_]\w*$/.test(c[0])) macro = c[0];
    return macro === null ? null : { macro, positive };
  };
  const deadInDiag = (c) =>
    split(strip(c), '||').every((d) => {
      const t = termOf(d);
      return t !== null && t.positive && ours(t.macro);
    });
  const mentions = (c) => c.some((w) => ours(w));
  const whole = strip(v);
  if (split(whole, '||').length > 1) {
    const dead = deadInDiag(whole);
    return { ...base, ablate: dead ? 'pos' : null, mixed: mentions(whole) && !dead };
  }
  const conj = split(whole, '&&');
  const out = { ...base, single: conj.length === 1 };
  for (const c of conj) {
    const t = termOf(c);
    if (t !== null && t.macro === PLANT_MACRO) out.plant = t.positive ? 'pos' : 'neg';
    else if (t !== null && t.macro.startsWith(ABLATE_PREFIX)) out.ablate = t.positive ? 'pos' : 'neg';
    else if (t === null && split(strip(c), '||').length > 1 && deadInDiag(c)) out.ablate = 'pos';
    else if (mentions(c)) out.mixed = true;
  }
  return out;
}

/**
 * Every line's place in the two variants: `plant` is 'plant' (compiled only
 * with TCHK_PLANT), 'diag' (only without it) or 'both'; `diag` is whether the
 * DIAGNOSTIC variant compiles the line (TCHK_PLANT and every TCHK_ABLATE_*
 * undefined, any other macro either way).
 */
function regionsOf(lex) {
  const byLine = new Map(lex.directives.map((d) => [d.line, d]));
  const status = new Array(lex.lines + 2);
  const stack = [];
  const fold = () => {
    let plant = 'both';
    let diag = true;
    for (const f of stack) {
      if (f.cur.plant === 'plant') plant = 'plant';
      else if (f.cur.plant === 'diag' && plant !== 'plant') plant = 'diag';
      if (f.cur.diag === false) diag = false;
    }
    return { plant, diag };
  };
  const branch = (f, cond) => {
    let plant = 'both';
    if (cond.plant === 'pos') plant = 'plant';
    else if (cond.plant === 'neg') plant = 'diag';
    else if (f.sawPlantPos) plant = 'diag';
    else if (f.sawPlantNeg) plant = 'plant';
    let diag = true;
    if (f.sawDiagCertain || cond.zero || cond.plant === 'pos' || cond.ablate === 'pos') diag = false;
    if (cond.single && cond.plant === 'pos') f.sawPlantPos = true;
    if (cond.single && cond.plant === 'neg') f.sawPlantNeg = true;
    if (cond.single && (cond.plant === 'neg' || cond.ablate === 'neg') && !f.sawDiagCertain && diag) f.sawDiagCertain = true;
    f.cur = { plant, diag };
  };
  for (let l = 1; l <= lex.lines; l += 1) {
    const d = byLine.get(l);
    if (d !== undefined) {
      if (d.name === 'if' || d.name === 'ifdef' || d.name === 'ifndef') {
        const f = { sawPlantPos: false, sawPlantNeg: false, sawDiagCertain: false, cur: null };
        status[l] = fold();
        branch(f, readCondition(d));
        stack.push(f);
        continue;
      }
      if ((d.name === 'elif' || d.name === 'else') && stack.length > 0) {
        branch(stack[stack.length - 1], readCondition(d));
        status[l] = fold();
        continue;
      }
      if (d.name === 'endif' && stack.length > 0) {
        stack.pop();
        status[l] = fold();
        continue;
      }
    }
    status[l] = fold();
  }
  return status;
}

/** Top-level function definitions over a token list (directives excluded). */
function functionsOf(toks) {
  const fns = [];
  let depth = 0;
  let stmtStart = 0;
  const matchBack = (close) => {
    let d = 0;
    for (let k = close; k >= 0; k -= 1) {
      if (toks[k].t === 'p' && toks[k].v === ')') d += 1;
      if (toks[k].t === 'p' && toks[k].v === '(') {
        d -= 1;
        if (d === 0) return k;
      }
    }
    return -1;
  };
  const matchForward = (open) => {
    let d = 0;
    for (let k = open; k < toks.length; k += 1) {
      if (toks[k].t === 'p' && toks[k].v === '{') d += 1;
      if (toks[k].t === 'p' && toks[k].v === '}') {
        d -= 1;
        if (d === 0) return k;
      }
    }
    return toks.length - 1;
  };
  for (let i = 0; i < toks.length; i += 1) {
    const t = toks[i];
    if (t.t !== 'p') continue;
    if (t.v === '{') {
      if (depth === 0 && i > 0 && toks[i - 1].t === 'p' && toks[i - 1].v === ')') {
        const open = matchBack(i - 1);
        const name = open > 0 ? toks[open - 1] : null;
        let hasEq = false;
        for (let k = stmtStart; k < open; k += 1) if (toks[k].t === 'p' && toks[k].v === '=') hasEq = true;
        if (name !== null && name.t === 'id' && !hasEq) {
          const end = matchForward(i);
          fns.push({ name: name.v, line: name.line, prefix: [stmtStart, open - 1], params: [open + 1, i - 2], body: [i + 1, end - 1] });
          i = end;
          stmtStart = end + 1;
          continue;
        }
      }
      depth += 1;
    } else if (t.v === '}') {
      depth -= 1;
    } else if (t.v === ';' && depth === 0) {
      stmtStart = i + 1;
    }
  }
  return fns;
}

/** The function a token index sits in, or null. */
const fnAt = (fns, i) => fns.find((f) => i >= f.body[0] && i <= f.body[1]) ?? null;

/** The tokens of a call's arguments, split at top-level commas: `toks[open]` is the `(`. */
function callArgs(toks, open) {
  const args = [[]];
  let d = 0;
  for (let k = open; k < toks.length; k += 1) {
    const t = toks[k];
    if (t.t === 'p' && (t.v === '(' || t.v === '[' || t.v === '{')) {
      d += 1;
      if (d === 1) continue;
    }
    if (t.t === 'p' && (t.v === ')' || t.v === ']' || t.v === '}')) {
      d -= 1;
      if (d === 0) return { args: args[0].length === 0 && args.length === 1 ? [] : args, close: k };
    }
    if (d === 1 && t.t === 'p' && t.v === ',') {
      args.push([]);
      continue;
    }
    args[args.length - 1].push({ ...t, k });
  }
  return { args, close: toks.length - 1 };
}

/** A C reading: tokens, directives, line regions, code tokens, functions (whole file and diagnostic-only). */
function readC(text) {
  const lex = lexC(text);
  const status = regionsOf(lex);
  const code = lex.toks.filter((t) => t.dir === -1);
  const diagCode = code.filter((t) => status[t.line]?.diag !== false);
  return { lex, status, code, fns: functionsOf(code), diagCode, diagFns: functionsOf(diagCode) };
}

/** Adjacent string literals joined, as the compiler joins them, with their first token's line. */
function cStrings(toks) {
  const out = [];
  for (let k = 0; k < toks.length; k += 1) {
    if (toks[k].t !== 'str') continue;
    let v = toks[k].v;
    let j = k + 1;
    while (j < toks.length && toks[j].t === 'str' && toks[j].dir === toks[k].dir) {
      v += toks[j].v;
      j += 1;
    }
    out.push({ v, line: toks[k].line, k });
    k = j - 1;
  }
  return out;
}

const isCall = (toks, k) => toks[k].t === 'id' && toks[k + 1]?.t === 'p' && toks[k + 1].v === '(' && !(toks[k - 1]?.t === 'p' && (toks[k - 1].v === '.' || toks[k - 1].v === '->'));

// ---------------------------------------------------------------------------
// D4 — the C
// ---------------------------------------------------------------------------

/** Calls that are the test variant's alone: the plant's allocations, its handler, its exit. */
const PLANT_ONLY_CALLS = [
  'malloc', 'calloc', 'realloc', 'reallocf', 'valloc', 'free', 'posix_memalign', 'aligned_alloc',
  'malloc_zone_malloc', 'malloc_zone_calloc', 'malloc_zone_realloc', 'malloc_zone_free', 'malloc_zone_valloc', 'malloc_zone_memalign',
  'signal', 'raise', 'kill', 'pthread_kill', 'abort', 'exit', '_exit', '_Exit'
];
const PLANT_STRINGS = ['P358ADV', '[p358adv-'];
const ENV_READS = ['getenv', 'secure_getenv', '_NSGetEnviron'];
const ENV_WRITES = ['setenv', 'putenv', 'unsetenv'];
// `popen` since the probe review (2026-11-09): a stream opened to a process is a stream fopen's family opens, and a
// hostile copy of the C calling it outside the plant read green on every clause.
const FILE_OPENS = [
  'open', 'openat', 'open_dprotected_np', 'fopen', 'freopen', 'fdopen', 'popen', 'creat', 'mkstemp', 'mkostemp', 'mkstemps', 'mkostemps', 'mkdtemp',
  'tmpfile', 'opendir', 'dlopen', 'socket', 'shm_open', 'sqlite3_open', 'sqlite3_open16', 'sqlite3_open_v2'
];
const CHECKER_VARIABLE = 'TORTIE_CHECKER';

/** D4.a: every piece of the plant sits inside `#ifdef TCHK_PLANT`. */
function d4a(tree) {
  const gone = missing(tree, F.c);
  if (gone.length > 0) return gone;
  const r = readC(tree.text.get(F.c));
  const out = [];
  const outside = (line) => r.status[line]?.plant !== 'plant';
  for (const s of cStrings(r.lex.toks)) {
    for (const w of PLANT_STRINGS) {
      if (s.v.includes(w) && outside(s.line)) out.push(`${F.c}:${String(s.line)} holds the string "${s.v.slice(0, 40)}" outside #ifdef ${PLANT_MACRO}, so the diagnostic build would carry it`);
    }
  }
  const toks = r.lex.toks;
  for (let k = 0; k < toks.length; k += 1) {
    const t = toks[k];
    if (t.t !== 'id' || !outside(t.line)) continue;
    if (t.v === 'sigaction') out.push(`${F.c}:${String(t.line)} names sigaction outside #ifdef ${PLANT_MACRO}; the diagnostic build installs no signal handler`);
    else if (PLANT_ONLY_CALLS.includes(t.v) && isCall(toks, k)) {
      out.push(`${F.c}:${String(t.line)} calls ${t.v}() outside #ifdef ${PLANT_MACRO}; the diagnostic build never allocates, frees, signals or exits on its own`);
    } else if (t.v === 'tchkOrig' && toks[k + 1]?.v === '.' && toks[k + 2]?.v === 'xFree' && toks[k + 3]?.v === '(') {
      const fn = fnAt(r.fns, r.code.indexOf(t));
      if (fn === null || fn.name !== 'tchkFree') out.push(`${F.c}:${String(t.line)} frees through the default allocator outside tchkFree and outside #ifdef ${PLANT_MACRO}`);
    } else if (t.v.startsWith('P358ADV')) {
      out.push(`${F.c}:${String(t.line)} names ${t.v} outside #ifdef ${PLANT_MACRO}`);
    }
  }
  return out;
}

/** D4.b: outside the plant, one environment read, TORTIE_CHECKER, removed after it in the same function. */
function d4b(tree) {
  const gone = missing(tree, F.c);
  if (gone.length > 0) return gone;
  const r = readC(tree.text.get(F.c));
  const out = [];
  const toks = r.code;
  const reads = [];
  for (let k = 0; k < toks.length; k += 1) {
    const t = toks[k];
    if (t.t !== 'id' || r.status[t.line]?.plant === 'plant') continue;
    if ((ENV_READS.includes(t.v) && isCall(toks, k)) || t.v === 'environ') {
      const { args } = t.v === 'environ' ? { args: [] } : callArgs(toks, k + 1);
      const arg = args[0] ?? [];
      const names = arg.length === 1 && arg[0].t === 'str' ? arg[0].v : null;
      if (t.v !== 'getenv' || names !== CHECKER_VARIABLE) {
        out.push(`${F.c}:${String(t.line)} reads the environment (${t.v}${names === null ? '' : ` "${names}"`}) outside #ifdef ${PLANT_MACRO}; the diagnostic build reads ${CHECKER_VARIABLE} and nothing else`);
      } else {
        reads.push(k);
      }
    }
    if (ENV_WRITES.includes(t.v) && isCall(toks, k)) {
      const { args } = callArgs(toks, k + 1);
      const arg = args[0] ?? [];
      const ok = t.v === 'unsetenv' && arg.length === 1 && arg[0].t === 'str' && arg[0].v === CHECKER_VARIABLE;
      if (!ok) out.push(`${F.c}:${String(t.line)} calls ${t.v}() outside #ifdef ${PLANT_MACRO}; the C side only removes ${CHECKER_VARIABLE}`);
    }
  }
  if (reads.length !== 1) {
    out.push(`${F.c} reads ${CHECKER_VARIABLE} ${String(reads.length)} times; once, in the function that arms the checker (SPEC D7)`);
  }
  for (const k of reads) {
    const fn = fnAt(r.fns, k);
    let removed = false;
    for (let j = k + 1; fn !== null && j <= fn.body[1]; j += 1) {
      if (toks[j].v === 'unsetenv' && isCall(toks, j)) {
        const a = callArgs(toks, j + 1).args[0] ?? [];
        if (a.length === 1 && a[0].t === 'str' && a[0].v === CHECKER_VARIABLE) removed = true;
      }
    }
    if (!removed) {
      out.push(`${F.c}:${String(toks[k].line)}: ${fn === null ? 'the read' : fn.name} does not unsetenv("${CHECKER_VARIABLE}") after reading it, so a process the app starts later could inherit it`);
    }
  }
  return out;
}

/** D4.c: the C side opens one file, the one TORTIE_CHECKER names, to append. */
function d4c(tree) {
  const gone = missing(tree, F.c);
  if (gone.length > 0) return gone;
  const r = readC(tree.text.get(F.c));
  const out = [];
  const toks = r.code;
  const opens = [];
  for (let k = 0; k < toks.length; k += 1) {
    if (toks[k].t === 'id' && FILE_OPENS.includes(toks[k].v) && isCall(toks, k)) opens.push(k);
  }
  const plainOpens = opens.filter((k) => toks[k].v === 'open');
  for (const k of opens) {
    if (toks[k].v !== 'open') out.push(`${F.c}:${String(toks[k].line)} calls ${toks[k].v}(); the C side opens one file and nothing else`);
  }
  if (plainOpens.length !== 1) out.push(`${F.c} calls open() ${String(plainOpens.length)} times; once, for app.log`);
  const armK = toks.findIndex((t, k) => t.v === 'getenv' && isCall(toks, k) && (callArgs(toks, k + 1).args[0] ?? [])[0]?.v === CHECKER_VARIABLE);
  const armFn = armK === -1 ? null : fnAt(r.fns, armK);
  for (const k of plainOpens) {
    const { args } = callArgs(toks, k + 1);
    const path = args[0] ?? [];
    const flags = new Set((args[1] ?? []).filter((t) => t.t === 'id').map((t) => t.v));
    if (path.length !== 1 || path[0].t !== 'id') {
      out.push(`${F.c}:${String(toks[k].line)} opens something other than the one buffer ${CHECKER_VARIABLE} fills`);
      continue;
    }
    if (!flags.has('O_APPEND') || !flags.has('O_WRONLY') || flags.has('O_RDWR') || flags.has('O_RDONLY') || flags.has('O_TRUNC')) {
      out.push(`${F.c}:${String(toks[k].line)} opens ${path[0].v} with ${[...flags].join('|')}; write-only and O_APPEND, never O_TRUNC, so electron-log's lines and the checker's never overwrite each other`);
    }
    const buf = path[0].v;
    const writers = [];
    for (let j = 0; j < toks.length; j += 1) {
      const t = toks[j];
      if (t.t !== 'id' || t.v !== buf) continue;
      const prev = toks[j - 1];
      const next = toks[j + 1];
      const firstArgOf = prev?.v === '(' && toks[j - 2]?.t === 'id' && ['memcpy', 'memmove', 'strcpy', 'strncpy', 'strlcpy', 'strcat', 'strncat', 'strlcat', 'sprintf', 'snprintf', 'vsprintf', 'vsnprintf'].includes(toks[j - 2].v);
      const assigned = next?.v === '=' || (next?.v === '[' && (() => {
        let d = 0;
        for (let q = j + 1; q < toks.length; q += 1) {
          if (toks[q].v === '[') d += 1;
          if (toks[q].v === ']') {
            d -= 1;
            if (d === 0) return toks[q + 1]?.v === '=';
          }
        }
        return false;
      })());
      if (firstArgOf || assigned) writers.push(j);
    }
    if (writers.length === 0) out.push(`${F.c}: nothing fills ${buf}, so the file it opens is not the one ${CHECKER_VARIABLE} names`);
    for (const j of writers) {
      const fn = fnAt(r.fns, j);
      if (armFn === null || fn !== armFn) {
        out.push(`${F.c}:${String(toks[j].line)} writes ${buf} in ${fn === null ? 'no function' : fn.name}, not where ${CHECKER_VARIABLE} is read; the file opened is the one the variable names`);
      }
    }
  }
  return out;
}

/** D4.d: SQLITE_CONFIG_MALLOC once, in the constructor, after GETMALLOC; no sqlite3_initialize; no other sqlite3_config. */
function d4d(tree) {
  const gone = missing(tree, F.c);
  if (gone.length > 0) return gone;
  const r = readC(tree.text.get(F.c));
  const out = [];
  const toks = r.code;
  const ctors = r.fns.filter((f) => {
    const pre = toks.slice(f.prefix[0], f.prefix[1] + 1).map((t) => t.v);
    const a = pre.indexOf('__attribute__');
    return a !== -1 && pre.slice(a).includes('constructor');
  });
  if (ctors.length !== 1) out.push(`${F.c} has ${String(ctors.length)} __attribute__((constructor)) functions; one installs the guard at load`);
  const ctor = ctors[0] ?? null;
  let get = -1;
  let set = -1;
  for (let k = 0; k < toks.length; k += 1) {
    const t = toks[k];
    if (t.t === 'id' && t.v === 'sqlite3_initialize' && isCall(toks, k)) {
      out.push(`${F.c}:${String(t.line)} calls sqlite3_initialize(); the checker never initialises SQLite, so better-sqlite3's own configuration runs first as today (SPEC D2)`);
    }
    if (t.t === 'id' && t.v === 'SQLITE_CONFIG_MALLOC') {
      const callK = k - 2;
      const ok = toks[k - 1]?.v === '(' && toks[callK]?.v === 'sqlite3_config' && ctor !== null && fnAt(r.fns, callK) === ctor;
      if (!ok || set !== -1) out.push(`${F.c}:${String(t.line)} names SQLITE_CONFIG_MALLOC ${ok ? 'a second time' : 'outside the constructor\'s sqlite3_config'}; the allocator is installed once, at load`);
      else set = k;
    }
    if (t.t === 'id' && t.v === 'sqlite3_config' && isCall(toks, k)) {
      if (ctor === null || fnAt(r.fns, k) !== ctor) out.push(`${F.c}:${String(t.line)} calls sqlite3_config() outside the constructor; nothing changes SQLite's configuration after load`);
      if (toks[k + 2]?.v === 'SQLITE_CONFIG_GETMALLOC' && get === -1) get = k;
    }
  }
  if (set === -1) out.push(`${F.c} never installs its allocator with sqlite3_config(SQLITE_CONFIG_MALLOC, …) in the constructor`);
  if (get === -1 || (set !== -1 && get > set)) out.push(`${F.c}: the constructor must read the default allocator (SQLITE_CONFIG_GETMALLOC) before it installs the guard, so the guard wraps it`);
  return out;
}

/** D4.e: the C never defines TCHK_PLANT or a TCHK_ABLATE_* itself; build-checker.mjs does, for the test variant alone. */
function d4e(tree) {
  const gone = missing(tree, F.c);
  if (gone.length > 0) return gone;
  const r = readC(tree.text.get(F.c));
  const out = [];
  for (const d of r.lex.directives) {
    const name = d.toks[0]?.v ?? '';
    if ((d.name === 'define' || d.name === 'undef') && (name === PLANT_MACRO || name.startsWith(ABLATE_PREFIX))) {
      out.push(`${F.c}:${String(d.line)} #${d.name}s ${name}; the variant is chosen by build-checker.mjs, never by the C, so the diagnostic build cannot be given the plant by a line in this file`);
    }
  }
  return out;
}

/** D4.f: the measured constants: a 16-byte guard "tortie-guard-364" and a 25 ms floor. */
function d4f(tree) {
  const gone = missing(tree, F.c);
  if (gone.length > 0) return gone;
  const r = readC(tree.text.get(F.c));
  const out = [];
  const defineOf = (name) => r.lex.directives.find((d) => d.name === 'define' && d.toks[0]?.v === name) ?? null;
  const guard = defineOf('TCHK_GUARD');
  if (guard === null || guard.toks.length !== 2 || Number(guard.toks[1].v) !== 16) {
    out.push(`${F.c}: TCHK_GUARD must be 16, the size measured to keep a 4,368-byte line in the 4,600 class (SPEC §0.1 item 2)`);
  }
  const floor = defineOf('TCHK_FLOOR_MS');
  if (floor === null || floor.toks.length !== 2 || Number(floor.toks[1].v) !== 25) {
    out.push(`${F.c}: TCHK_FLOOR_MS must default to 25, the floor whose cost was measured (SPEC D5, §2.4)`);
  }
  let pattern = null;
  const toks = r.code;
  for (let k = 0; k < toks.length && pattern === null; k += 1) {
    if (toks[k].v !== '=' || toks[k + 1]?.v !== '{') continue;
    const bytes = [];
    let j = k + 2;
    while (j < toks.length && toks[j].v !== '}') {
      if (toks[j].t === 'num') bytes.push(Number(toks[j].v));
      else if (toks[j].v !== ',') break;
      j += 1;
    }
    if (toks[j]?.v === '}' && bytes.length === 16 && bytes.every((b) => Number.isInteger(b) && b >= 0 && b < 256)) {
      const s = String.fromCharCode(...bytes);
      if (s.startsWith('tortie-guard')) pattern = s;
    }
  }
  if (pattern === null) {
    const s = cStrings(r.code).find((x) => x.v.startsWith('tortie-guard'));
    if (s !== undefined) pattern = s.v;
  }
  if (pattern !== 'tortie-guard-364') {
    out.push(`${F.c}: the guard's bytes must be "tortie-guard-364" (found ${pattern === null ? 'none' : JSON.stringify(pattern)}), neither zero nor a free-list entry, which is what lets a reading tell them apart (SPEC D2, D8)`);
  }
  return out;
}

// ---------------------------------------------------------------------------
// D5 — the walk: every read through a pcache pointer after tchkReadable
// ---------------------------------------------------------------------------

// `Db` and `sqlite3` since the fix round (lens B: an array read through a pointer read from memory, `aDb[i]` and
// the hash table's `ap[h]`, was in no rule's reach; with its tchkReadable deleted the walk faulted the app and
// this gate read green).
const WALK_TYPES = new Set(['PgHdr1', 'PCache1', 'PGroup', 'PgHdr', 'Btree', 'BtShared', 'Pager', 'PCache', 'Db', 'sqlite3']);
const QUALIFIERS = new Set(['const', 'volatile', 'static', 'register', 'struct']);
const MEM_READS = { memcpy: [1], memmove: [1], memcmp: [0, 1] };

/** The listed-type pointer parameters of a function, by index. */
function walkParams(toks, fn) {
  const out = [];
  const { args } = callArgs(toks, fn.params[0] - 1);
  args.forEach((p, idx) => {
    const v = p.map((t) => t.v);
    const ti = v.findIndex((w) => WALK_TYPES.has(w));
    if (ti === -1) return;
    if (v[ti + 1] === '*' && v[ti + 2] !== '*' && p[ti + 2]?.t === 'id' && ti + 3 === v.length) out.push({ name: v[ti + 2], idx });
  });
  return out;
}

const DECLARATOR_QUALIFIERS = new Set(['const', 'volatile', 'restrict', '__restrict']);

/**
 * The locals a body declares with a listed type: `names` holds those declared
 * as ONE pointer to it (`PgHdr1 *p`) or as a pointer to such pointers, a table
 * (`PgHdr1 *const *ap`, whose `ap[h]` reads the table: the fix round), `declAt`
 * the index of every declarator's name, which is a declaration and never a read
 * (`*prev` in `PgHdr1 *a, *prev;`).
 */
function walkLocals(toks, fn) {
  const names = new Set();
  const declAt = new Set();
  for (let k = fn.body[0]; k <= fn.body[1]; k += 1) {
    if (!(toks[k].t === 'id' && WALK_TYPES.has(toks[k].v))) continue;
    let b = k - 1;
    while (b >= fn.body[0] && QUALIFIERS.has(toks[b].v)) b -= 1;
    const before = b < fn.body[0] ? '{' : toks[b].v;
    const forInit = before === '(' && toks[b - 1]?.v === 'for';
    if (!(before === ';' || before === '{' || before === '}' || forInit)) continue;
    let j = k + 1;
    for (;;) {
      let stars = 0;
      while (toks[j]?.v === '*' || DECLARATOR_QUALIFIERS.has(toks[j]?.v)) {
        if (toks[j].v === '*') stars += 1;
        j += 1;
      }
      if (toks[j]?.t !== 'id' || j > fn.body[1]) break;
      declAt.add(j);
      if (stars === 1 || stars === 2) names.add(toks[j].v);
      j += 1;
      let d = 0;
      while (j <= fn.body[1]) {
        const v = toks[j].v;
        if (v === '(' || v === '[' || v === '{') d += 1;
        if (v === ')' || v === ']' || v === '}') d -= 1;
        if (d === 0 && (v === ',' || v === ';')) break;
        if (d < 0) break;
        j += 1;
      }
      if (toks[j]?.v !== ',') break;
      j += 1;
    }
  }
  return { names, declAt };
}

/** The extent of the statement that starts at `k`: the index of its last token. */
function stmtEnd(toks, k, limit) {
  const v = toks[k]?.v;
  const matchParen = (open) => {
    let d = 0;
    for (let q = open; q <= limit; q += 1) {
      if (toks[q].v === '(') d += 1;
      if (toks[q].v === ')') {
        d -= 1;
        if (d === 0) return q;
      }
    }
    return limit;
  };
  if (v === '{') {
    let d = 0;
    for (let q = k; q <= limit; q += 1) {
      if (toks[q].v === '{') d += 1;
      if (toks[q].v === '}') {
        d -= 1;
        if (d === 0) return q;
      }
    }
    return limit;
  }
  if (v === 'if') {
    let e = stmtEnd(toks, matchParen(k + 1) + 1, limit);
    if (toks[e + 1]?.v === 'else') e = stmtEnd(toks, e + 2, limit);
    return e;
  }
  if (v === 'for' || v === 'while' || v === 'switch') return stmtEnd(toks, matchParen(k + 1) + 1, limit);
  if (v === 'do') {
    const body = stmtEnd(toks, k + 1, limit);
    const close = matchParen(body + 2);
    return toks[close + 1]?.v === ';' ? close + 1 : close;
  }
  let d = 0;
  for (let q = k; q <= limit; q += 1) {
    const w = toks[q].v;
    if (w === '(' || w === '[' || w === '{') d += 1;
    if (w === ')' || w === ']' || w === '}') d -= 1;
    if (d === 0 && w === ';') return q;
    if (d < 0) return q - 1;
  }
  return limit;
}

/** The loops of a body: `[start, end, assigned names]`. */
function loopsOf(toks, fn) {
  const loops = [];
  for (let k = fn.body[0]; k <= fn.body[1]; k += 1) {
    const v = toks[k].v;
    if (toks[k].t !== 'id' || (v !== 'for' && v !== 'while' && v !== 'do')) continue;
    if (v === 'while' && loops.some((l) => l.isDo && l.end >= k && l.whileAt === k)) continue;
    const end = stmtEnd(toks, k, fn.body[1]);
    const assigned = new Set();
    for (let q = k; q <= end; q += 1) {
      const t = toks[q];
      if (t.t !== 'id' || toks[q - 1]?.v === '.' || toks[q - 1]?.v === '->') continue;
      const nx = toks[q + 1]?.v;
      if (nx === '=' || nx === '++' || nx === '--' || nx === '+=' || nx === '-=' || toks[q - 1]?.v === '++' || toks[q - 1]?.v === '--') assigned.add(t.v);
    }
    const loop = { start: k, end, assigned, isDo: v === 'do' };
    if (v === 'do') loop.whileAt = (() => {
      const body = stmtEnd(toks, k + 1, fn.body[1]);
      return body + 1;
    })();
    loops.push(loop);
  }
  return loops;
}

/**
 * One function's reads, in source order. `entry` is the set of parameters
 * proved checked by every caller. Returns the reads through an unchecked
 * pointer, the reads of a parameter that still holds what it was called with
 * (proved, or not, by its callers), and every call this function makes.
 */
function walkReads(toks, fn, fnNames, entry) {
  const params = walkParams(toks, fn);
  const locals = walkLocals(toks, fn);
  const listed = new Set([...locals.names, ...params.map((p) => p.name)]);
  const loops = loopsOf(toks, fn);
  const checked = new Set(entry);
  const original = new Set(params.map((p) => p.name));
  const bad = [];
  const pending = [];
  const calls = [];
  const assigns = [];
  const stack = [];
  const isRef = (q) => toks[q].t === 'id' && listed.has(toks[q].v) && toks[q - 1]?.v !== '.' && toks[q - 1]?.v !== '->';
  const read = (q, how) => {
    const name = toks[q].v;
    if (checked.has(name)) return;
    if (original.has(name)) pending.push({ name, line: toks[q].line, how });
    else bad.push({ name, line: toks[q].line, how });
  };
  for (let k = fn.body[0]; k <= fn.body[1]; k += 1) {
    for (const l of loops) {
      if (l.start === k) {
        for (const a of l.assigned) {
          checked.delete(a);
          original.delete(a);
        }
        stack.push({ end: l.end, saved: new Set(checked) });
      }
    }
    const t = toks[k];
    while (assigns.length > 0 && assigns[assigns.length - 1].at <= k) {
      const a = assigns.pop();
      if (a.becomes) checked.add(a.name);
      else checked.delete(a.name);
      original.delete(a.name);
    }
    if (t.t === 'id' && t.v === 'tchkReadable' && toks[k + 1]?.v === '(') {
      const arg = (callArgs(toks, k + 1).args[1] ?? []).map((x) => x);
      let a = arg;
      while (a.length > 1 && a[0].v === '(') {
        let d = 0;
        let close = -1;
        for (let q = 0; q < a.length; q += 1) {
          if (a[q].v === '(') d += 1;
          if (a[q].v === ')') {
            d -= 1;
            if (d === 0) {
              close = q;
              break;
            }
          }
        }
        if (close === -1 || close === a.length - 1) break;
        a = a.slice(close + 1);
      }
      if (a.length === 1 && a[0].t === 'id') checked.add(a[0].v);
    }
    if (isRef(k)) {
      const nx = toks[k + 1]?.v;
      if (locals.declAt.has(k)) {
        /* a declarator's name, not a read */
      } else if (nx === '->') read(k, `${t.v}->`);
      else if (nx === '[') read(k, `${t.v}[…]`);
      else if (toks[k - 1]?.v === '*' && !['id', 'num'].includes(toks[k - 2]?.t ?? '') && ![')', ']'].includes(toks[k - 2]?.v ?? '')) read(k, `*${t.v}`);
      if (nx === '=' && toks[k + 2]?.v !== '=') {
        const e = (() => {
          let d = 0;
          for (let q = k + 2; q <= fn.body[1]; q += 1) {
            const w = toks[q].v;
            if (w === '(' || w === '[' || w === '{') d += 1;
            if (w === ')' || w === ']' || w === '}') {
              d -= 1;
              if (d < 0) return q;
            }
            if (d === 0 && (w === ';' || w === ',')) return q;
          }
          return fn.body[1];
        })();
        const rhs = toks.slice(k + 2, e);
        let becomes = false;
        if (rhs.length === 1 && rhs[0].t === 'id' && checked.has(rhs[0].v)) becomes = true;
        if (rhs[0]?.v === '&' && rhs[1]?.t === 'id' && rhs[2]?.v === '->' && checked.has(rhs[1].v) && rhs.slice(3).every((x) => x.t === 'id' || x.v === '.')) becomes = true;
        assigns.push({ at: e, name: t.v, becomes });
        assigns.sort((x, y) => y.at - x.at);
      }
      if (nx === '++' || nx === '--' || nx === '+=' || nx === '-=' || toks[k - 1]?.v === '++' || toks[k - 1]?.v === '--') {
        assigns.push({ at: k + 1, name: t.v, becomes: false });
        assigns.sort((x, y) => y.at - x.at);
      }
    }
    if (t.t === 'p' && t.v === '->' && toks[k - 1]?.v === ')') {
      let d = 0;
      let open = -1;
      for (let q = k - 1; q >= fn.body[0]; q -= 1) {
        if (toks[q].v === ')') d += 1;
        if (toks[q].v === '(') {
          d -= 1;
          if (d === 0) {
            open = q;
            break;
          }
        }
      }
      const innerToks = open === -1 ? [] : toks.slice(open + 1, k - 1);
      const inner = innerToks.map((x) => x.v);
      let s = 0;
      while (inner[s] === '(') s += 1;
      while (QUALIFIERS.has(inner[s])) s += 1;
      if (open !== -1 && WALK_TYPES.has(inner[s]) && inner[s + 1] === '*') bad.push({ name: `(${inner[s]}*)`, line: t.line, how: `a ${inner[s]}* cast read through directly` });
      const bare = innerToks.filter((x) => x.v !== '(' && x.v !== ')');
      if (bare.length === 1 && bare[0].t === 'id' && listed.has(bare[0].v)) {
        const name = bare[0].v;
        if (!checked.has(name)) (original.has(name) ? pending : bad).push({ name, line: t.line, how: `(${name})->` });
      }
    }
    if (t.t === 'id' && MEM_READS[t.v] !== undefined && isCall(toks, k)) {
      const { args } = callArgs(toks, k + 1);
      for (const idx of MEM_READS[t.v]) {
        const a = args[idx] ?? [];
        if (a.length === 1 && a[0].t === 'id' && listed.has(a[0].v)) {
          const name = a[0].v;
          if (!checked.has(name)) (original.has(name) ? pending : bad).push({ name, line: a[0].line, how: `${t.v}(…${name}…)` });
        }
      }
    }
    if (t.t === 'id' && fnNames.has(t.v) && isCall(toks, k) && t.v !== fn.name) {
      const { args } = callArgs(toks, k + 1);
      calls.push({
        callee: t.v,
        line: t.line,
        args: args.map((a) => (a.length === 1 && a[0].t === 'id' ? { name: a[0].v, checked: checked.has(a[0].v) } : null))
      });
    }
    while (stack.length > 0 && stack[stack.length - 1].end === k) {
      const s = stack.pop();
      checked.clear();
      for (const x of s.saved) checked.add(x);
    }
  }
  return { params, bad, pending, calls };
}

/** How many reads through a pcache pointer the diagnostic variant makes, and in how many functions. */
function walkCount(toks, fns) {
  let reads = 0;
  let inFns = 0;
  for (const f of fns) {
    const { names, declAt } = walkLocals(toks, f);
    const listed = new Set([...names, ...walkParams(toks, f).map((p) => p.name)]);
    let n = 0;
    for (let k = f.body[0]; k <= f.body[1]; k += 1) {
      const t = toks[k];
      if (t.t !== 'id' || !listed.has(t.v) || declAt.has(k) || toks[k - 1]?.v === '.' || toks[k - 1]?.v === '->') continue;
      if (toks[k + 1]?.v === '->' || toks[k + 1]?.v === '[') n += 1;
    }
    reads += n;
    if (n > 0) inFns += 1;
  }
  return { reads, inFns };
}

/** Every read through an unchecked pcache pointer in the diagnostic variant's functions. */
function walkFindings(toks, fns) {
  const names = new Set(fns.map((f) => f.name));
  let proven = new Map(fns.map((f) => [f.name, new Set()]));
  let results = null;
  for (let round = 0; round <= fns.length + 1; round += 1) {
    results = new Map(fns.map((f) => [f.name, walkReads(toks, f, names, proven.get(f.name))]));
    const next = new Map(fns.map((f) => [f.name, new Set()]));
    for (const f of fns) {
      for (const p of results.get(f.name).params) {
        const sites = [];
        for (const g of fns) for (const c of results.get(g.name).calls) if (c.callee === f.name) sites.push(c);
        if (sites.length > 0 && sites.every((c) => c.args[p.idx]?.checked === true)) next.get(f.name).add(p.name);
      }
    }
    const same = fns.every((f) => [...next.get(f.name)].sort().join() === [...proven.get(f.name)].sort().join());
    proven = next;
    if (same) break;
  }
  const out = [];
  for (const f of fns) {
    const r = results.get(f.name);
    for (const b of r.bad) {
      out.push({ fn: f.name, line: b.line, text: `${f.name}: ${b.how} reads through ${b.name} with no tchkReadable of ${b.name} before it in ${f.name}` });
    }
    for (const p of r.pending) {
      if (proven.get(f.name).has(p.name)) continue;
      out.push({ fn: f.name, line: p.line, text: `${f.name}: ${p.how} reads through the parameter ${p.name}, which neither ${f.name} nor every caller checked with tchkReadable` });
    }
  }
  return out;
}

/** D5: in the diagnostic variant, every read through a pcache pointer follows a tchkReadable of it. */
function d5(tree) {
  const gone = missing(tree, F.c);
  if (gone.length > 0) return gone;
  const r = readC(tree.text.get(F.c));
  if (!r.diagFns.some((f) => f.name === 'tchkReadable')) return [`${F.c} defines no tchkReadable in the diagnostic variant, so the walk asks the kernel nothing before it reads`];
  const walking = r.diagFns.filter((f) => f.name !== 'tchkReadable' && f.name !== 'tchkRegionAt');
  return walkFindings(r.diagCode, walking).map((x) => `${F.c}:${String(x.line)} ${x.text}; a damaged link would fault the app instead of writing its line (SPEC D4, §0.1 item 4)`);
}

// ---------------------------------------------------------------------------
// Reading the build scripts (D6): bindings, constant strings, and the paths a
// write names
// ---------------------------------------------------------------------------

/** Does a binding name (identifier or pattern) bind `name`? */
function bindsName(bn, name) {
  if (ts.isIdentifier(bn)) return bn.text === name;
  if (ts.isObjectBindingPattern(bn) || ts.isArrayBindingPattern(bn)) {
    return bn.elements.some((e) => !ts.isOmittedExpression(e) && bindsName(e.name, name));
  }
  return false;
}

/**
 * The innermost binding of `name` visible from `node`: its initializer when it
 * is a plain `const`/`let`/`var` with one, the string 'opaque' for a parameter,
 * a destructured name, an import or a function, and undefined when none is.
 */
function bindingOf(node, name) {
  for (let p = node.parent; p !== undefined; p = p.parent) {
    if (ts.isFunctionDeclaration(p) || ts.isFunctionExpression(p) || ts.isArrowFunction(p) || ts.isMethodDeclaration(p)) {
      for (const prm of p.parameters) if (bindsName(prm.name, name)) return 'opaque';
    }
    if ((ts.isForOfStatement(p) || ts.isForInStatement(p) || ts.isForStatement(p)) && p.initializer !== undefined && ts.isVariableDeclarationList(p.initializer)) {
      for (const d of p.initializer.declarations) if (bindsName(d.name, name)) return 'opaque';
    }
    if (ts.isCatchClause(p) && p.variableDeclaration !== undefined && bindsName(p.variableDeclaration.name, name)) return 'opaque';
    const statements = ts.isSourceFile(p) || ts.isBlock(p) || ts.isModuleBlock(p) ? p.statements : ts.isCaseClause(p) || ts.isDefaultClause(p) ? p.statements : null;
    if (statements === null) continue;
    for (const st of statements) {
      if (ts.isVariableStatement(st)) {
        for (const d of st.declarationList.declarations) {
          if (ts.isIdentifier(d.name) && d.name.text === name) return d.initializer ?? 'opaque';
          if (!ts.isIdentifier(d.name) && bindsName(d.name, name)) return 'opaque';
        }
      }
      if ((ts.isFunctionDeclaration(st) || ts.isClassDeclaration(st)) && st.name?.text === name) return 'opaque';
      if (ts.isImportDeclaration(st) && st.importClause !== undefined) {
        const c = st.importClause;
        if (c.name?.text === name) return 'opaque';
        if (c.namedBindings !== undefined && ts.isNamespaceImport(c.namedBindings) && c.namedBindings.name.text === name) return 'opaque';
        if (c.namedBindings !== undefined && ts.isNamedImports(c.namedBindings) && c.namedBindings.elements.some((e) => e.name.text === name)) return 'opaque';
      }
    }
  }
  return undefined;
}

/** The one string an expression always is, or null: literals, templates, `+`, `[…].join(…)` and consts. */
function foldString(expr, depth = 0) {
  const e = peel(expr);
  if (e === undefined || depth > 16) return null;
  if (ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e)) return e.text;
  if (ts.isTemplateExpression(e)) {
    let s = e.head.text;
    for (const span of e.templateSpans) {
      const v = foldString(span.expression, depth + 1);
      if (v === null) return null;
      s += v + span.literal.text;
    }
    return s;
  }
  if (ts.isBinaryExpression(e) && e.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    const a = foldString(e.left, depth + 1);
    const b = a === null ? null : foldString(e.right, depth + 1);
    return a === null || b === null ? null : a + b;
  }
  if (ts.isIdentifier(e)) {
    const b = bindingOf(e, e.text);
    return b === undefined || typeof b === 'string' ? null : foldString(b, depth + 1);
  }
  if (ts.isCallExpression(e) && ts.isPropertyAccessExpression(e.expression) && e.expression.name.text === 'join') {
    const arr = peel(e.expression.expression);
    if (arr !== undefined && ts.isArrayLiteralExpression(arr)) {
      const sep = e.arguments.length === 0 ? ',' : foldString(e.arguments[0], depth + 1);
      if (sep === null) return null;
      const parts = [];
      for (const el of arr.elements) {
        const v = foldString(el, depth + 1);
        if (v === null) return null;
        parts.push(v);
      }
      return parts.join(sep);
    }
  }
  return null;
}

/** The array literal an expression is (through consts and Object.freeze), or null. */
function arrayOf(expr, depth = 0) {
  let e = peel(expr);
  if (e === undefined || depth > 8) return null;
  if (ts.isCallExpression(e) && e.expression.getText() === 'Object.freeze' && e.arguments.length === 1) e = peel(e.arguments[0]);
  if (e !== undefined && ts.isArrayLiteralExpression(e)) return e;
  if (e !== undefined && ts.isIdentifier(e)) {
    const b = bindingOf(e, e.text);
    return b === undefined || typeof b === 'string' ? null : arrayOf(b, depth + 1);
  }
  return null;
}

/** Every string a script can be shown to hold: each literal, template and `+` chain, folded. */
function scriptConstants(sf) {
  const out = [];
  for (const n of nodesOf(sf)) {
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n) || ts.isTemplateExpression(n) || (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.PlusToken)) {
      const v = foldString(n);
      if (v !== null) out.push({ node: n, text: v, regex: null });
    } else if (ts.isRegularExpressionLiteral(n)) {
      const m = /^\/(.*)\/([a-z]*)$/s.exec(n.text);
      if (m !== null) {
        try {
          out.push({ node: n, text: null, regex: new RegExp(m[1], m[2].includes('g') ? m[2] : `${m[2]}g`) });
        } catch {
          /* not a pattern this reading can run */
        }
      }
    }
  }
  return out;
}

/**
 * The paths an expression can name, each as a pattern: the segments this
 * reading can know, and `*` for any it cannot. A conditional names both of
 * its sides; `null` names no path.
 */
function pathPatterns(expr, depth = 0) {
  const e = peel(expr);
  if (e === undefined || depth > 16) return ['*'];
  if (e.kind === ts.SyntaxKind.NullKeyword || (ts.isIdentifier(e) && e.text === 'undefined')) return [];
  if (ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e)) return [e.text];
  if (ts.isTemplateExpression(e)) {
    let alts = [e.head.text];
    for (const span of e.templateSpans) {
      const parts = pathPatterns(span.expression, depth + 1);
      const next = [];
      for (const a of alts) for (const p of parts.length === 0 ? ['*'] : parts) next.push(`${a}${p}${span.literal.text}`);
      alts = next.slice(0, 16);
    }
    return alts;
  }
  if (ts.isConditionalExpression(e)) return [...pathPatterns(e.whenTrue, depth + 1), ...pathPatterns(e.whenFalse, depth + 1)];
  if (ts.isBinaryExpression(e) && (e.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken || e.operatorToken.kind === ts.SyntaxKind.BarBarToken)) {
    return [...pathPatterns(e.left, depth + 1), ...pathPatterns(e.right, depth + 1)];
  }
  if (ts.isIdentifier(e)) {
    const b = bindingOf(e, e.text);
    return b === undefined || typeof b === 'string' ? ['*'] : pathPatterns(b, depth + 1);
  }
  if (ts.isCallExpression(e)) {
    const callee = ts.isIdentifier(e.expression) ? e.expression.text : ts.isPropertyAccessExpression(e.expression) ? e.expression.name.text : null;
    if (callee === 'join' || callee === 'resolve') {
      let alts = [''];
      for (const a of e.arguments) {
        let parts;
        if (ts.isSpreadElement(a)) {
          const arr = arrayOf(a.expression);
          parts = arr === null ? ['*'] : [arr.elements.map((x) => (pathPatterns(x, depth + 1)[0] ?? '*')).join('/')];
        } else {
          parts = pathPatterns(a, depth + 1);
          if (parts.length === 0) parts = ['*'];
        }
        const next = [];
        for (const x of alts) for (const p of parts) next.push(x === '' ? p : `${x}/${p}`);
        alts = next.slice(0, 16);
      }
      return alts;
    }
    if (callee === 'dirname' && e.arguments.length === 1) {
      return pathPatterns(e.arguments[0], depth + 1).map((p) => (p.includes('/') ? p.slice(0, p.lastIndexOf('/')) : '*'));
    }
  }
  return ['*'];
}
const segmentsOf = (pattern) => pattern.split('/').filter((s) => s !== '' && s !== '.');

/** The local names a file binds to `node:fs` (or `fs`, `node:fs/promises`) functions, by the function's own name. */
function fsNames(sf) {
  const local = new Map();
  const namespaces = new Set();
  const isFs = (s) => /^(node:)?fs(\/promises)?$/.test(s);
  for (const n of nodesOf(sf)) {
    if (ts.isImportDeclaration(n) && ts.isStringLiteral(n.moduleSpecifier) && isFs(n.moduleSpecifier.text) && n.importClause !== undefined) {
      const c = n.importClause;
      if (c.name !== undefined) namespaces.add(c.name.text);
      if (c.namedBindings !== undefined && ts.isNamespaceImport(c.namedBindings)) namespaces.add(c.namedBindings.name.text);
      if (c.namedBindings !== undefined && ts.isNamedImports(c.namedBindings)) {
        for (const s of c.namedBindings.elements) local.set(s.name.text, (s.propertyName ?? s.name).text);
      }
    }
    if (ts.isVariableDeclaration(n) && n.initializer !== undefined) {
      const init = peel(n.initializer);
      const req = init !== undefined && ts.isCallExpression(init) && ts.isIdentifier(init.expression) && init.expression.text === 'require' && init.arguments.length === 1 && isStr(init.arguments[0]) && isFs(init.arguments[0].text);
      if (!req) continue;
      if (ts.isIdentifier(n.name)) namespaces.add(n.name.text);
      if (ts.isObjectBindingPattern(n.name)) {
        for (const el of n.name.elements) if (ts.isIdentifier(el.name)) local.set(el.name.text, el.propertyName !== undefined && ts.isIdentifier(el.propertyName) ? el.propertyName.text : el.name.text);
      }
    }
  }
  return { local, namespaces };
}

/** The fs calls that change the disk, with the argument (or arguments) naming what they change. */
const FS_WRITES = {
  writeFileSync: [0], writeFile: [0], appendFileSync: [0], appendFile: [0], copyFileSync: [1], copyFile: [1], cpSync: [1], cp: [1],
  rmSync: [0], rm: [0], rmdirSync: [0], rmdir: [0], unlinkSync: [0], unlink: [0], renameSync: [0, 1], rename: [0, 1],
  mkdirSync: [0], mkdir: [0], mkdtempSync: [0], mkdtemp: [0], symlinkSync: [1], symlink: [1], linkSync: [1], link: [1],
  chmodSync: [0], chmod: [0], chownSync: [0], chown: [0], lchownSync: [0], utimesSync: [0], utimes: [0], lutimesSync: [0],
  truncateSync: [0], truncate: [0], createWriteStream: [0], openSync: [0], open: [0]
};
/** Commands whose last argument is where they write, and those whose every path argument is. */
const CMD_TO_LAST = new Set(['cp', 'mv', 'ditto', 'ln', 'install', 'rsync']);
const CMD_EVERY = new Set(['rm', 'mkdir', 'touch', 'chmod', 'chown', 'tee', 'truncate', 'rmdir']);

/** Every place a script writes: fs calls, file-moving commands, and a child's working folder. */
function writesOf(sf) {
  const { local, namespaces } = fsNames(sf);
  const out = [];
  const procNames = new Set();
  for (const n of nodesOf(sf)) {
    if (ts.isImportDeclaration(n) && ts.isStringLiteral(n.moduleSpecifier) && /^(node:)?child_process$/.test(n.moduleSpecifier.text) && n.importClause?.namedBindings !== undefined && ts.isNamedImports(n.importClause.namedBindings)) {
      for (const s of n.importClause.namedBindings.elements) procNames.add(s.name.text);
    }
  }
  for (const n of nodesOf(sf)) {
    if (!ts.isCallExpression(n)) continue;
    let fn = null;
    if (ts.isIdentifier(n.expression) && local.has(n.expression.text)) fn = local.get(n.expression.text);
    if (ts.isPropertyAccessExpression(n.expression) && ts.isIdentifier(n.expression.expression) && namespaces.has(n.expression.expression.text)) fn = n.expression.name.text;
    if (fn !== null && FS_WRITES[fn] !== undefined) {
      if ((fn === 'openSync' || fn === 'open') && n.arguments.length >= 2) {
        const flag = foldString(n.arguments[1]);
        if (flag === 'r' || flag === 'rs') continue;
      }
      if ((fn === 'openSync' || fn === 'open') && n.arguments.length < 2) continue;
      for (const idx of FS_WRITES[fn]) if (n.arguments[idx] !== undefined) out.push({ node: n, how: `${fn}()`, patterns: pathPatterns(n.arguments[idx]) });
      continue;
    }
    const callee = ts.isIdentifier(n.expression) ? n.expression.text : null;
    if (callee === null || !procNames.has(callee)) continue;
    const cmd = n.arguments.length > 0 ? foldString(n.arguments[0]) : null;
    const argArr = n.arguments.length > 1 ? arrayOf(n.arguments[1]) : null;
    const optsArg = n.arguments.find((a, i) => i > 0 && ts.isObjectLiteralExpression(peel(a)));
    const cwd = optsArg === undefined ? null : propOf(peel(optsArg), 'cwd');
    if (cwd !== null) out.push({ node: n, how: `${callee}()'s working folder`, patterns: pathPatterns(cwd.initializer) });
    const base = cmd === null ? null : basename(cmd);
    if (base !== null && (CMD_TO_LAST.has(base) || CMD_EVERY.has(base))) {
      if (argArr === null) {
        out.push({ node: n, how: `${base} with arguments this reading cannot see`, patterns: ['*'] });
        continue;
      }
      const args = argArr.elements.filter((el) => !(isStr(peel(el)) && peel(el).text.startsWith('-')));
      const targets = CMD_TO_LAST.has(base) ? args.slice(-1) : args;
      for (const t of targets) out.push({ node: n, how: `${base}'s ${CMD_TO_LAST.has(base) ? 'destination' : 'path'}`, patterns: pathPatterns(t) });
    }
  }
  return out;
}

/** The function (declaration or expression) a node sits in, or null. */
function enclosingFn(node) {
  for (let p = node.parent; p !== undefined; p = p.parent) {
    if (ts.isFunctionDeclaration(p) || ts.isFunctionExpression(p) || ts.isArrowFunction(p) || ts.isMethodDeclaration(p)) return p;
  }
  return null;
}
/** Does a statement (or expression) hold a `throw`, or a call that is not a plain read? */
const holdsThrow = (node) => nodesOf(node).some((x) => ts.isThrowStatement(x));
const holdsRefusal = (node) => nodesOf(node).some((x) => ts.isThrowStatement(x) || (ts.isCallExpression(x) && /^(refuse|fail|die|exit|abort)$/i.test(ts.isIdentifier(x.expression) ? x.expression.text : ts.isPropertyAccessExpression(x.expression) ? x.expression.name.text : '')));

// ---------------------------------------------------------------------------
// D6 — the build scripts
// ---------------------------------------------------------------------------

/**
 * The four breadcrumbs of D1, each where better-sqlite3 13.0.3 holds it: the
 * file, a word the anchor must hold, and the stretch of the file it must sit
 * in (from one definition to the next).
 */
const ANCHOR_SITES = {
  next: { file: 'src/objects/statement-iterator.cpp', key: 'db_state->busy = true', from: 'Napi::Value StatementIterator::Next(', to: 'Napi::Value StatementIterator::Return(' },
  close: { file: 'src/objects/database.cpp', key: 'sqlite3_close(db_handle)', from: 'void Database::CloseHandles()', to: 'void Database::ThrowDatabaseError(' },
  start: { file: 'src/util/query-macros.cpp', key: 'STATEMENT_START', from: '#define STATEMENT_START(x, y)', to: '#define DOES_NOT_MUTATE' },
  exec: { file: 'src/objects/database.cpp', key: 'db->busy = true', from: 'NODE_METHOD(Database::JS_exec)', to: 'NODE_METHOD(Database::JS_backup)' }
};

/** Does an expression read a version (`x.version`, or a const bound to one)? */
function readsVersion(expr, depth = 0) {
  const e = peel(expr);
  if (e === undefined || depth > 6) return false;
  if (ts.isPropertyAccessExpression(e)) return e.name.text === 'version';
  if (ts.isIdentifier(e)) {
    const b = bindingOf(e, e.text);
    return b !== undefined && typeof b !== 'string' && readsVersion(b, depth + 1);
  }
  return false;
}
/** Every `a !== b` / `a === b` in a file whose one side folds to `value`, with the other side. */
function comparisonsTo(sf, value) {
  const out = [];
  for (const n of nodesOf(sf)) {
    if (!ts.isBinaryExpression(n)) continue;
    const op = n.operatorToken.kind;
    if (op !== ts.SyntaxKind.EqualsEqualsEqualsToken && op !== ts.SyntaxKind.ExclamationEqualsEqualsToken) continue;
    if (foldString(n.right) === value) out.push({ node: n, other: n.left });
    else if (foldString(n.left) === value) out.push({ node: n, other: n.right });
  }
  return out;
}
/** Is a comparison the test of an `if` whose consequent refuses (throws, or calls a refusal)? */
function refusesOn(cmp) {
  for (let p = cmp.parent; p !== undefined; p = p.parent) {
    if (ts.isIfStatement(p)) return nodesOf(p.expression).includes(cmp) && holdsRefusal(p.thenStatement);
    if (ts.isConditionalExpression(p)) return nodesOf(p.condition).includes(cmp);
    if (ts.isBlock(p) || ts.isSourceFile(p)) return false;
  }
  return false;
}

/** D6.a: build-checker.mjs refuses any better-sqlite3 but the one the lockfile pins. */
function d6a(tree) {
  const gone = missing(tree, F.buildChecker);
  if (gone.length > 0) return gone;
  if (tree.bs3.locked === null) return ['package-lock.json pins no node_modules/better-sqlite3, so there is no version to hold the script to'];
  const sf = sfOf(F.buildChecker, tree.text.get(F.buildChecker));
  const ok = comparisonsTo(sf, tree.bs3.locked).some((c) => readsVersion(c.other) && refusesOn(c.node));
  return ok ? [] : [`${F.buildChecker} does not refuse a better-sqlite3 other than the locked ${tree.bs3.locked}: no \`<package>.version !== '${tree.bs3.locked}'\` that refuses`];
}

/** D6.b: build-checker.mjs pins the amalgamation's sha256, which this gate re-derives from node_modules. */
function d6b(tree) {
  const gone = missing(tree, F.buildChecker);
  if (gone.length > 0) return gone;
  if (tree.amalgamationSha === null) return [`${AMALGAMATION} cannot be read, so its hash cannot be re-derived`];
  const sf = sfOf(F.buildChecker, tree.text.get(F.buildChecker));
  const cmps = comparisonsTo(sf, tree.amalgamationSha);
  const pinned = scriptConstants(sf).some((s) => s.text === tree.amalgamationSha);
  if (!pinned) {
    const other = scriptConstants(sf).find((s) => s.text !== null && /^[0-9a-f]{64}$/.test(s.text));
    return [
      `${F.buildChecker} does not pin the amalgamation's sha256: node_modules' sqlite3.c hashes to ${tree.amalgamationSha}${other === undefined ? '' : `, and the script holds ${other.text}`}`
    ];
  }
  return cmps.some((c) => refusesOn(c.node)) ? [] : [`${F.buildChecker} holds the amalgamation's sha256 and never refuses on it`];
}

/** D6.c: the four anchors, each found exactly once where its breadcrumb goes, re-derived over the pinned sources. */
function d6c(tree) {
  const gone = missing(tree, F.buildChecker);
  if (gone.length > 0) return gone;
  const sf = sfOf(F.buildChecker, tree.text.get(F.buildChecker));
  const consts = scriptConstants(sf);
  const out = [];
  for (const [name, site] of Object.entries(ANCHOR_SITES)) {
    const source = tree.bs3.sources[site.file];
    if (typeof source !== 'string') {
      out.push(`${BS3}/${site.file} cannot be read, so the ${name} anchor cannot be re-derived`);
      continue;
    }
    const lo = source.indexOf(site.from);
    const hi = source.indexOf(site.to, lo + 1);
    if (lo === -1 || hi === -1) {
      out.push(`${BS3}/${site.file} no longer holds ${site.from} then ${site.to}, so it is not the pinned 13.0.3 this gate reads`);
      continue;
    }
    const pinned = consts.some((c) => {
      if (c.text !== null) {
        if (!c.text.includes(site.key)) return false;
        const first = source.indexOf(c.text);
        return first !== -1 && source.indexOf(c.text, first + 1) === -1 && first >= lo && first < hi;
      }
      const all = [...source.matchAll(c.regex)];
      return all.length === 1 && all[0][0].includes(site.key) && all[0].index >= lo && all[0].index < hi;
    });
    if (!pinned) {
      out.push(
        `${F.buildChecker} pins no ${name} anchor: no string holding "${site.key}" occurs exactly once in ${site.file}, between ${site.from} and ${site.to}`
      );
    }
  }
  return out;
}

/** D6.d: build-checker.mjs requires --devdir, hands it to node-gyp, and never falls back to a home folder. */
function d6d(tree) {
  const gone = missing(tree, F.buildChecker);
  if (gone.length > 0) return gone;
  const sf = sfOf(F.buildChecker, tree.text.get(F.buildChecker));
  const out = [];
  const isDevdir = (e) => {
    const x = peel(e);
    return x !== undefined && ((ts.isPropertyAccessExpression(x) && x.name.text === 'devdir') || (ts.isIdentifier(x) && x.text === 'devdir'));
  };
  const absentTest = (cond) => {
    const c = peel(cond);
    if (c === undefined) return false;
    if (ts.isPrefixUnaryExpression(c) && c.operator === ts.SyntaxKind.ExclamationToken) return isDevdir(c.operand);
    if (ts.isBinaryExpression(c) && [ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.EqualsEqualsToken].includes(c.operatorToken.kind)) {
      const nil = (x) => peel(x)?.kind === ts.SyntaxKind.NullKeyword || (ts.isIdentifier(peel(x) ?? c) && peel(x).text === 'undefined');
      return (isDevdir(c.left) && nil(c.right)) || (isDevdir(c.right) && nil(c.left));
    }
    return false;
  };
  const refusal = nodesOf(sf).some(
    (n) => ts.isIfStatement(n) && absentTest(n.expression) && holdsRefusal(n.thenStatement) && codeStrings(n.thenStatement).some((s) => s.text.includes('--devdir'))
  );
  if (!refusal) out.push(`${F.buildChecker} does not refuse a run with no --devdir, naming the flag; Electron's headers are never fetched into a home folder by default`);
  const gypArgv = nodesOf(sf).filter((n) => ts.isArrayLiteralExpression(n) && n.elements.some((el) => foldString(el) === 'rebuild'));
  const handsDevdir = gypArgv.some((arr) =>
    arr.elements.some((el) => {
      const x = peel(el);
      return x !== undefined && ((ts.isTemplateExpression(x) && x.head.text === '--devdir=') || (foldString(x) ?? '').startsWith('--devdir='));
    })
  );
  if (!handsDevdir) out.push(`${F.buildChecker}: node-gyp's \`rebuild\` command line carries no --devdir=, so node-gyp would pick its own header folder`);
  for (const n of nodesOf(sf)) {
    if (ts.isCallExpression(n) && ((ts.isIdentifier(n.expression) && n.expression.text === 'homedir') || (ts.isPropertyAccessExpression(n.expression) && n.expression.name.text === 'homedir'))) {
      out.push(`${at(F.buildChecker, n)} asks for the home folder; the script never reads or writes his home`);
    }
    if ((ts.isPropertyAccessExpression(n) && n.name.text === 'HOME' && peel(n.expression)?.getText() === 'process.env') || (ts.isElementAccessExpression(n) && isStr(peel(n.argumentExpression), 'HOME') && peel(n.expression)?.getText() === 'process.env')) {
      out.push(`${at(F.buildChecker, n)} reads process.env.HOME; the script never reads or writes his home`);
    }
  }
  return out;
}

/** D6.e: build-checker.mjs writes nothing under any node_modules, and runs nothing there. */
function d6e(tree) {
  const gone = missing(tree, F.buildChecker);
  if (gone.length > 0) return gone;
  const sf = sfOf(F.buildChecker, tree.text.get(F.buildChecker));
  const out = [];
  const writes = writesOf(sf);
  if (writes.length === 0) out.push(`${F.buildChecker}: this reading finds no write at all, so it is not reading the script`);
  for (const w of writes) {
    for (const p of w.patterns) {
      if (segmentsOf(p).includes('node_modules')) out.push(`${at(F.buildChecker, w.node)}: ${w.how} names ${p}, under node_modules; the copy is built in --out, never in place`);
    }
  }
  return out;
}

/** D6.f: build-checker.mjs writes `#define …` into the copy only for the test variant. */
function d6f(tree) {
  const gone = missing(tree, F.buildChecker);
  if (gone.length > 0) return gone;
  const sf = sfOf(F.buildChecker, tree.text.get(F.buildChecker));
  const out = [];
  const isTestCheck = (cond) => {
    const c = peel(cond);
    if (c === undefined || !ts.isBinaryExpression(c) || c.operatorToken.kind !== ts.SyntaxKind.EqualsEqualsEqualsToken) return false;
    const side = (x) => {
      const y = peel(x);
      return y !== undefined && ((ts.isPropertyAccessExpression(y) && y.name.text === 'variant') || (ts.isIdentifier(y) && y.text === 'variant'));
    };
    return (side(c.left) && isStr(peel(c.right), 'test')) || (side(c.right) && isStr(peel(c.left), 'test'));
  };
  const testOnly = (node) => {
    for (let child = node, p = node.parent; p !== undefined; child = p, p = p.parent) {
      if (ts.isConditionalExpression(p) && p.whenTrue === child && isTestCheck(p.condition)) return true;
      if (ts.isIfStatement(p) && p.thenStatement === child && isTestCheck(p.expression)) return true;
      if (ts.isBinaryExpression(p) && p.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken && p.right === child && isTestCheck(p.left)) return true;
    }
    return false;
  };
  let defines = 0;
  for (const n of nodesOf(sf)) {
    const isDefine =
      ((ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) && /^\s*#\s*define\b/.test(n.text)) ||
      (ts.isTemplateExpression(n) && /^\s*#\s*define\b/.test(n.head.text));
    if (!isDefine) continue;
    defines += 1;
    if (!testOnly(n)) out.push(`${at(F.buildChecker, n)} writes a #define outside a \`variant === 'test'\` branch; TCHK_PLANT and the ablations are the test variant's alone (SPEC D10)`);
  }
  if (!nodesOf(sf).some((n) => (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) && /#\s*define\s+TCHK_PLANT\b/.test(n.text))) {
    out.push(`${F.buildChecker} never writes #define ${PLANT_MACRO}, so no build of it is the test variant`);
  }
  if (defines === 0) out.push(`${F.buildChecker} writes no #define at all`);
  return out;
}

/** D6.g: the close breadcrumb carries the op the C always walks at. */
function d6g(tree) {
  const gone = missing(tree, F.buildChecker, F.c);
  if (gone.length > 0) return gone;
  const r = readC(tree.text.get(F.c));
  const entry = r.fns.find((f) => f.name === 'p358adv_on_entry');
  let closeOp = null;
  if (entry !== undefined) {
    for (let k = entry.body[0]; k <= entry.body[1]; k += 1) {
      const t = r.code[k];
      if (t.v === 'strcmp' && r.code[k + 1]?.v === '(' && r.code[k + 2]?.v === 'op' && r.code[k + 3]?.v === ',' && r.code[k + 4]?.t === 'str') {
        closeOp = r.code[k + 4].v;
        break;
      }
    }
  }
  if (closeOp === null) return [`${F.c}: p358adv_on_entry names no op it treats as a close (strcmp(op, "…")), so nothing says the close is always walked`];
  const sf = sfOf(F.buildChecker, tree.text.get(F.buildChecker));
  const crumb = `p358adv_on_entry("${closeOp}"`;
  const placed = scriptConstants(sf).some((c) => c.text !== null && c.text.includes(crumb) && c.text.indexOf(crumb) < c.text.indexOf('sqlite3_close(db_handle)'));
  return placed ? [] : [`${F.buildChecker} puts no ${crumb}, …) before sqlite3_close(db_handle), the op the C walks at every close; the close would be walked only by the floor`];
}

/** The packed module's path inside the app, by its segments (SPEC D12). */
const PACKED_SUFFIX = 'Contents/Resources/app.asar.unpacked/node_modules/better-sqlite3/prebuilds/darwin-arm64.node';

/** The function `exports.default` / `module.exports.default` is, or null. */
function exportedDefault(sf) {
  for (const st of sf.statements) {
    if (!ts.isExpressionStatement(st) || !ts.isBinaryExpression(st.expression) || st.expression.operatorToken.kind !== ts.SyntaxKind.EqualsToken) continue;
    const lhs = st.expression.left.getText();
    if (lhs !== 'exports.default' && lhs !== 'module.exports.default') continue;
    const rhs = peel(st.expression.right);
    if (rhs !== undefined && (ts.isFunctionExpression(rhs) || ts.isArrowFunction(rhs))) return rhs;
  }
  return null;
}
/** The functions declared at a file's top level, by name. */
function topFunctions(sf) {
  const out = new Map();
  for (const st of sf.statements) if (ts.isFunctionDeclaration(st) && st.name !== undefined) out.set(st.name.text, st);
  return out;
}

/** D6.h: after-pack.cjs writes only the packed module, refuses first, and runs the normal after-pack after. */
function d6h(tree) {
  const gone = missing(tree, F.afterPack);
  if (gone.length > 0) return gone;
  const sf = sfOf(F.afterPack, tree.text.get(F.afterPack));
  const out = [];
  const writes = writesOf(sf);
  if (writes.length === 0) out.push(`${F.afterPack} writes nothing, so it swaps nothing`);
  for (const w of writes) {
    for (const p of w.patterns.length === 0 ? ['*'] : w.patterns) {
      if (!p.endsWith(PACKED_SUFFIX) || p.slice(0, -PACKED_SUFFIX.length).includes(PACKED_SUFFIX)) {
        out.push(`${at(F.afterPack, w.node)}: ${w.how} names ${p}; the one path it writes is the packed app's ${PACKED_SUFFIX}`);
      }
    }
  }
  const writers = new Set(writes.map((w) => enclosingFn(w.node)).filter((f) => f !== null));
  for (const fn of writers) {
    const firstWrite = Math.min(...writes.filter((w) => enclosingFn(w.node) === fn).map((w) => w.node.getStart()));
    const before = nodesOf(fn).filter((n) => ts.isIfStatement(n) && n.getEnd() <= firstWrite && holdsThrow(n.thenStatement));
    const envRefusal = before.some((n) => nodesOf(n.expression).some((x) => ts.isPropertyAccessExpression(x) && x.name.text === ENV_NAME) && codeStrings(n.expression).some((s) => s.text === '1'));
    if (!envRefusal) out.push(`${F.afterPack}: no refusal of a TORTIE_DIAGNOSTIC that is not '1' before the first write, so a normal package could reach the swap`);
    const plantArrays = new Set();
    for (const n of nodesOf(sf)) {
      if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer !== undefined) {
        const arr = arrayOf(n.initializer);
        const words = arr === null ? [] : arr.elements.map((x) => foldString(x));
        if (PLANT_STRINGS.every((w) => words.includes(w))) plantArrays.add(n.name.text);
      }
    }
    const namesPlant = (node) =>
      nodesOf(node).some((x) => (ts.isIdentifier(x) && plantArrays.has(x.text)) || ((ts.isStringLiteral(x) || ts.isNoSubstitutionTemplateLiteral(x)) && PLANT_STRINGS.includes(x.text)));
    const plantRefusal = before.some((n) => {
      if (namesPlant(n.expression)) return true;
      return nodesOf(n.expression).some((x) => {
        if (!ts.isIdentifier(x)) return false;
        const b = bindingOf(x, x.text);
        return b !== undefined && typeof b !== 'string' && namesPlant(b);
      });
    });
    if (!plantRefusal) out.push(`${F.afterPack}: no refusal of a module holding ${PLANT_STRINGS.join(' or ')} before the first write, so the test variant could be packed (SPEC D10)`);
  }
  const def = exportedDefault(sf);
  if (def === null) return [...out, `${F.afterPack} sets no exports.default function, so electron-builder runs nothing`];
  const body = ts.isBlock(def.body) ? def.body.statements : [];
  const fns = topFunctions(sf);
  const writesIn = (st) =>
    nodesOf(st).some(
      (x) =>
        writes.some((w) => w.node === x) ||
        (ts.isCallExpression(x) && ts.isIdentifier(x.expression) && fns.has(x.expression.text) && writes.some((w) => enclosingFn(w.node) === fns.get(x.expression.text)))
    );
  const swapAt = body.findIndex((st) => writesIn(st));
  const isNormal = (e) => {
    const call = peel(e);
    if (call === undefined || !ts.isCallExpression(call) || !ts.isPropertyAccessExpression(call.expression) || call.expression.name.text !== 'default') return false;
    let target = peel(call.expression.expression);
    if (target !== undefined && ts.isIdentifier(target)) {
      const b = bindingOf(target, target.text);
      target = b === undefined || typeof b === 'string' ? undefined : peel(b);
    }
    if (target === undefined || !ts.isCallExpression(target) || !ts.isIdentifier(target.expression) || target.expression.text !== 'require') return false;
    const spec = foldString(target.arguments[0]);
    return spec !== null && posix.normalize(posix.join(posix.dirname(F.afterPack), spec)) === F.normalAfterPack;
  };
  const normalAt = body.findIndex(
    (st) =>
      (ts.isExpressionStatement(st) && ts.isAwaitExpression(st.expression) && isNormal(st.expression.expression)) ||
      (ts.isReturnStatement(st) && st.expression !== undefined && (isNormal(st.expression) || (ts.isAwaitExpression(st.expression) && isNormal(st.expression.expression))))
  );
  if (swapAt === -1) out.push(`${F.afterPack}: exports.default never reaches the swap`);
  if (normalAt === -1) {
    out.push(`${F.afterPack}: exports.default does not await ${F.normalAfterPack}'s default as a statement of its own, so the arm64 assertion and the nested signing could be skipped`);
  } else if (swapAt !== -1 && normalAt <= swapAt) {
    out.push(`${F.afterPack}: the normal after-pack runs before the swap, so its arm64 assertion and nested signing never see the swapped module`);
  }
  return out;
}

/**
 * Every array literal that reads as an electron-builder command line: it
 * holds '--publish' and either a `-c.` override or `--config`. (package.mjs
 * hands the overrides over in a config file that extends electron-builder.yml,
 * because electron-builder reads `-c.publish=null` as the string "null".)
 */
const builderArgvs = (sf) =>
  nodesOf(sf).filter(
    (n) =>
      ts.isArrayLiteralExpression(n) &&
      n.elements.some((el) => foldString(el) === '--publish' || (foldString(el) ?? '').startsWith('--publish=')) &&
      n.elements.some((el) => (foldString(el) ?? '').startsWith('-c.') || foldString(el) === '--config')
  );
/** The one object package.mjs writes as electron-builder's config (it extends electron-builder.yml), or null. */
function diagnosticConfig(sf) {
  const found = nodesOf(sf).filter((n) => ts.isObjectLiteralExpression(n) && foldString(propOf(n, 'extends')?.initializer) === 'electron-builder.yml');
  return found.length === 1 ? found[0] : null;
}
const isNullLit = (e) => peel(e)?.kind === ts.SyntaxKind.NullKeyword;
/** The one electron-builder command line a script holds, or null. */
function builderArgv(sf) {
  const found = builderArgvs(sf);
  return found.length === 1 ? found[0] : null;
}

/**
 * D6.i: package.mjs hands electron-builder --publish never, a null publish,
 * the diagnostic after-pack and a -diagnostic- name, unsigned unless
 * --notarize; through `--config` and an object extending electron-builder.yml
 * (as it does), or through `-c.` overrides (as SPEC §4.4 first wrote it).
 */
function d6i(tree) {
  const gone = missing(tree, F.packageMjs);
  if (gone.length > 0) return gone;
  const sf = sfOf(F.packageMjs, tree.text.get(F.packageMjs));
  const out = [];
  const argv = builderArgv(sf);
  if (argv === null) return [`${F.packageMjs} holds ${String(builderArgvs(sf).length)} electron-builder command lines (an array holding '--publish' and a -c. override or --config); one`];
  const flat = [];
  const visit = (el, cond) => {
    const e = peel(el);
    if (e !== undefined && ts.isSpreadElement(e)) {
      const inner = peel(e.expression);
      if (inner !== undefined && ts.isConditionalExpression(inner)) {
        for (const [side, which] of [[inner.whenTrue, 'true'], [inner.whenFalse, 'false']]) {
          const arr = arrayOf(side);
          if (arr !== null) for (const x of arr.elements) visit(x, { test: inner.condition, side: which });
        }
        return;
      }
      const arr = arrayOf(inner);
      if (arr !== null) for (const x of arr.elements) visit(x, cond);
      return;
    }
    flat.push({ value: foldString(e), node: e, cond });
  };
  for (const el of argv.elements) visit(el, null);
  const values = flat.map((f) => f.value);
  const pub = values.indexOf('--publish');
  if (pub === -1 || values[pub + 1] !== 'never') out.push(`${at(F.packageMjs, argv)}: '--publish' is not followed by 'never'`);
  for (const f of flat) {
    if (f.value !== null && (/^(always|onTag|onTagOrDraft)$/.test(f.value) || /^--publish=/.test(f.value) || /^-c\.publish\.provider=/.test(f.value))) {
      out.push(`${at(F.packageMjs, f.node)}: ${f.value} would publish; the diagnostic build is never published`);
    }
    if (f.value === null && !(values[flat.indexOf(f) - 1] === '--config')) out.push(`${at(F.packageMjs, f.node)}: an electron-builder argument this reading cannot fold to a string`);
  }
  for (const f of flat) {
    if (f.value !== null && /^-c\.mac\.identity=(?!null$)./.test(f.value)) out.push(`${at(F.packageMjs, f.node)} hands electron-builder a signing identity; the lane's keychain decides, never the script`);
  }
  if (values.includes('--config')) {
    const cfg = diagnosticConfig(sf);
    if (cfg === null) {
      out.push(`${at(F.packageMjs, argv)} hands electron-builder --config, and ${F.packageMjs} holds no one object that extends electron-builder.yml, so the app's id and files are not the normal app's`);
      return out;
    }
    const pub = propOf(cfg, 'publish');
    if (pub === null || !isNullLit(pub.initializer)) out.push(`${at(F.packageMjs, cfg)}: the config's publish is ${pub === null ? 'not set' : pub.initializer.getText()}, not null, so electron-builder would write latest-mac.yml and app-update.yml`);
    if (foldString(propOf(cfg, 'afterPack')?.initializer) !== F.afterPack) out.push(`${at(F.packageMjs, cfg)}: the config's afterPack is not ${F.afterPack}, so the packed module is never swapped`);
    const name = foldString(propOf(cfg, 'artifactName')?.initializer);
    if (name === null || !name.includes('-diagnostic-')) out.push(`${at(F.packageMjs, cfg)}: the config's artifactName ${name === null ? 'is not a string this reading can fold' : `is ${name}`}; it says -diagnostic-, so the DMG is never taken for a release`);
    const mac = peel(propOf(cfg, 'mac')?.initializer);
    const unsignedObj = (o) => o !== undefined && ts.isObjectLiteralExpression(o) && propOf(o, 'identity') !== null && isNullLit(propOf(o, 'identity').initializer);
    const unsignedOk =
      unsignedObj(mac) ||
      (mac !== undefined && ts.isConditionalExpression(mac) && /notarize/.test(mac.condition.getText()) && unsignedObj(peel(mac.whenFalse)) && propOf(peel(mac.whenTrue), 'identity') === null);
    if (!unsignedOk) out.push(`${at(F.packageMjs, cfg)}: the config's mac is not { identity: null } whenever --notarize is not, so an unsigned run could find his Developer ID`);
    for (const n of nodesOf(cfg)) {
      if (ts.isPropertyAssignment(n) && propName(n.name) === 'identity' && !isNullLit(n.initializer)) out.push(`${at(F.packageMjs, n)}: the config names a signing identity; the lane's keychain decides, never the script`);
    }
    return out;
  }
  if (!values.includes('-c.publish=null')) out.push(`${at(F.packageMjs, argv)}: no '-c.publish=null' and no --config, so electron-builder would write latest-mac.yml and app-update.yml from electron-builder.yml`);
  const name = values.find((v) => v !== null && v.startsWith('-c.artifactName='));
  if (name === undefined || !name.includes('-diagnostic-')) out.push(`${at(F.packageMjs, argv)}: the artifact name ${name === undefined ? 'is not set' : `is ${name}`}; it says -diagnostic-, so the DMG is never taken for a release`);
  if (!values.includes(`-c.afterPack=${F.afterPack}`)) out.push(`${at(F.packageMjs, argv)}: no -c.afterPack=${F.afterPack}, so the packed module is never swapped`);
  const unsigned = flat.filter((f) => f.value === '-c.mac.identity=null');
  const unsignedOk = unsigned.length > 0 && unsigned.every((f) => f.cond === null || (f.cond.side === 'false' && /notarize/.test(f.cond.test.getText())));
  if (!unsignedOk) out.push(`${at(F.packageMjs, argv)}: '-c.mac.identity=null' is not passed whenever --notarize is not, so an unsigned run could find his Developer ID`);
  return out;
}

/** D6.j: package.mjs refuses an unsigned run whose log names a Developer ID. */
function d6j(tree) {
  const gone = missing(tree, F.packageMjs);
  if (gone.length > 0) return gone;
  const sf = sfOf(F.packageMjs, tree.text.get(F.packageMjs));
  const tests = nodesOf(sf).filter((n) => {
    if (!ts.isCallExpression(n) || !ts.isPropertyAccessExpression(n.expression)) return false;
    const m = n.expression.name.text;
    const recv = peel(n.expression.expression);
    if (m === 'test' && recv !== undefined && ts.isRegularExpressionLiteral(recv)) return /Developer ID/.test(recv.text);
    if (m === 'includes' || m === 'match' || m === 'search') return n.arguments.some((a) => (foldString(a) ?? '').includes('Developer ID') || (ts.isRegularExpressionLiteral(peel(a) ?? n) && /Developer ID/.test(peel(a).text)));
    return false;
  });
  const guarded = tests.filter((t) => {
    for (let child = t, p = t.parent; p !== undefined; child = p, p = p.parent) {
      if (ts.isBinaryExpression(p) && p.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) {
        const other = p.left === child ? p.right : p.left;
        if (/notarize/.test(other.getText()) && nodesOf(other).some((x) => ts.isPrefixUnaryExpression(x) && x.operator === ts.SyntaxKind.ExclamationToken)) return true;
      }
      if (ts.isConditionalExpression(p) || ts.isIfStatement(p) || ts.isReturnStatement(p) || ts.isBlock(p)) break;
    }
    return false;
  });
  if (tests.length === 0) return [`${F.packageMjs} never looks for "Developer ID" in electron-builder's log, so an unsigned run that signed anyway would pass`];
  if (guarded.length === 0) return [`${F.packageMjs} looks for "Developer ID" but not only when --notarize is off: the unsigned run's refusal must not depend on luck`];
  return [];
}

// ---------------------------------------------------------------------------
// D7 — release.yml
// ---------------------------------------------------------------------------

/** Canonical JSON: keys sorted at every depth, so a key moved within a map is the same job. */
function canon(v) {
  if (Array.isArray(v)) return `[${v.map(canon).join(',')}]`;
  if (v !== null && typeof v === 'object') {
    return `{${Object.keys(v)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canon(v[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(v ?? null);
}
/** The release job, everything but its `if`, with the workflow-wide settings it runs under, hashed. */
function releasePinOf(wf) {
  const job = { ...(wf?.jobs?.release ?? {}) };
  delete job.if;
  return sha256(canon({ name: wf?.name ?? null, concurrency: wf?.concurrency ?? null, permissions: wf?.permissions ?? null, release: job }));
}
/**
 * THE PIN: the release job as origin/main `3c0ac355` held it, before Phase
 * 364, hashed by releasePinOf. Phase 364 adds only its `if`, which the pin
 * leaves out. A deliberate change to the release lane re-pins it in the same
 * commit (`--print-release-pin`) and says why in the body.
 */
const RELEASE_PIN = 'a73fd06224f0fda4f0821e9100e218d4b0ed91d38b4795ac4975dde3259893db';

const yamlRead = new Map();
/** The workflow, parsed (or the in-memory copy an attack made), or an error. */
function workflowOf(tree) {
  if (tree.workflow !== undefined) return { wf: tree.workflow, error: null };
  const text = tree.text.get(F.release);
  if (typeof text !== 'string') return { wf: null, error: `${F.release} does not exist (builder: package)` };
  let r = yamlRead.get(text);
  if (r === undefined) {
    try {
      r = { wf: loadYaml(text), error: null };
    } catch (err) {
      r = { wf: null, error: `${F.release} is not YAML this gate can read: ${err instanceof Error ? err.message : String(err)}` };
    }
    yamlRead.set(text, r);
  }
  return r;
}
/** A copy of the tree whose workflow is a deep copy of today's, changed by `change`. */
function withWorkflow(tree, change) {
  const { wf } = workflowOf(tree);
  if (wf === null) return null;
  const copy = structuredClone(wf);
  if (change(copy) === false) return null;
  return { ...tree, workflow: copy };
}
const normIf = (s) => String(s ?? '').replace(/^\s*\$\{\{\s*/, '').replace(/\s*\}\}\s*$/, '').replace(/\s+/g, ' ').trim();
const RELEASE_IF = "github.event_name == 'push'";
const DIAGNOSTIC_IF = "github.event_name == 'workflow_dispatch' && inputs.diagnostic";
const stepsOf = (job) => (Array.isArray(job?.steps) ? job.steps : []);
const runText = (step) => (typeof step?.run === 'string' ? step.run.replace(/\\\n\s*/g, ' ') : '');

/** D7.a: the lane starts on a v* tag push or on a dispatch with one boolean input, diagnostic, off by default. */
function d7a(tree) {
  const { wf, error } = workflowOf(tree);
  if (wf === null) return [error];
  const out = [];
  const on = wf.on ?? {};
  const keys = Object.keys(on).sort();
  if (keys.join() !== 'push,workflow_dispatch') out.push(`${F.release} starts on ${keys.join(', ')}; on a v* tag push and on a dispatch, nothing else`);
  if (canon(on.push) !== canon({ tags: ['v*'] })) out.push(`${F.release}: push is ${canon(on.push)}; only v* tags, so the release job never runs from a branch`);
  const inputs = on.workflow_dispatch?.inputs ?? {};
  if (Object.keys(inputs).join() !== 'diagnostic') out.push(`${F.release}: the dispatch takes ${Object.keys(inputs).join(', ') || 'nothing'}; one input, diagnostic`);
  const d = inputs.diagnostic ?? {};
  if (d.type !== 'boolean' || d.default !== false || d.required === true) {
    out.push(`${F.release}: the diagnostic input is ${canon(d)}; a boolean, false by default, so a dispatch builds nothing unless it is ticked`);
  }
  return out;
}

/** D7.b: the release job runs only on a push and is otherwise the pinned one. */
function d7b(tree) {
  const { wf, error } = workflowOf(tree);
  if (wf === null) return [error];
  const out = [];
  const job = wf.jobs?.release;
  if (job === undefined) return [`${F.release} has no release job`];
  if (normIf(job.if) !== RELEASE_IF) out.push(`${F.release}: the release job's if is ${JSON.stringify(job.if ?? null)}; it is \`${RELEASE_IF}\`, so a dispatch never cuts a release`);
  const pin = releasePinOf(wf);
  if (pin !== RELEASE_PIN) {
    out.push(
      `${F.release}: the release job (its steps, env, runner and the workflow's name, permissions and concurrency) hashes to ${pin}, not the pinned ${RELEASE_PIN}; ` +
        'Phase 364 adds only its if. A deliberate change re-pins with --print-release-pin in the same commit'
    );
  }
  return out;
}

/** D7.c: exactly two jobs, and the diagnostic one runs only on a dispatch with diagnostic ticked. */
function d7c(tree) {
  const { wf, error } = workflowOf(tree);
  if (wf === null) return [error];
  const out = [];
  const jobs = Object.keys(wf.jobs ?? {}).sort();
  if (jobs.join() !== 'diagnostic,release') out.push(`${F.release} holds the jobs ${jobs.join(', ')}; release and diagnostic, nothing else`);
  const job = wf.jobs?.diagnostic;
  if (job === undefined) return [...out, `${F.release} has no diagnostic job`];
  if (normIf(job.if) !== DIAGNOSTIC_IF) out.push(`${F.release}: the diagnostic job's if is ${JSON.stringify(job.if ?? null)}; it is \`${DIAGNOSTIC_IF}\``);
  return out;
}

/** D7.d: the diagnostic job reads the repository and writes nothing to it. */
function d7d(tree) {
  const { wf, error } = workflowOf(tree);
  if (wf === null) return [error];
  const job = wf.jobs?.diagnostic;
  if (job === undefined) return [`${F.release} has no diagnostic job`];
  return canon(job.permissions) === canon({ contents: 'read' })
    ? []
    : [`${F.release}: the diagnostic job's permissions are ${canon(job.permissions)}; exactly contents: read, so its token can make no release, tag or attestation`];
}

/** D7.e: the diagnostic job uses only actions the release job already pins, and uploads through upload-artifact for at most 14 days. */
function d7e(tree) {
  const { wf, error } = workflowOf(tree);
  if (wf === null) return [error];
  const out = [];
  const job = wf.jobs?.diagnostic;
  if (job === undefined) return [`${F.release} has no diagnostic job`];
  const vetted = new Set(stepsOf(wf.jobs?.release).map((s) => s.uses).filter((u) => typeof u === 'string'));
  vetted.add('./.github/actions/setup');
  let uploads = 0;
  for (const s of stepsOf(job)) {
    if (s.uses === undefined) continue;
    if (!vetted.has(s.uses)) out.push(`${F.release}: the diagnostic job uses ${s.uses}, which the release job does not pin; it adds no action of its own`);
    if (typeof s.uses === 'string' && s.uses.startsWith('actions/upload-artifact@')) {
      uploads += 1;
      const days = s.with?.['retention-days'];
      if (typeof days !== 'number' || days > 14) out.push(`${F.release}: an upload keeps ${String(days)} days; at most 14`);
    }
  }
  if (uploads === 0) out.push(`${F.release}: the diagnostic job uploads nothing, so the DMG it makes reaches nobody`);
  if (job.uses !== undefined) out.push(`${F.release}: the diagnostic job calls a reusable workflow (${String(job.uses)})`);
  return out;
}

/** Every route from a job to a release, a tag or an update feed, by what a step would say. */
const ROUTES = [
  ['gh', /(^|[\s;&|(`$"'=])gh(\s|$)/m],
  ['a publish mode', /--publish(\s+|=)(always|onTag|onTagOrDraft)\b|-c\.publish\.provider/],
  ['a tag or a push', /\bgit\s+(-C\s+\S+\s+)?(tag|push)\b|--verify-tag|refs\/tags/],
  ['an update feed', /latest(-mac)?\.yml|app-update\.yml|refresh-dmg-feed/],
  ['a blockmap', /blockmap/i],
  ['a provenance attestation', /attest-build-provenance|attestations/],
  ['a token that can write', /\bGITHUB_TOKEN\b|\bGH_TOKEN\b|github\.token/],
  ['the GitHub API', /api\.github\.com|uploads\.github\.com/]
];

/** D7.f: nothing in the diagnostic job reaches a release, a tag or a feed, and electron-builder runs only through package.mjs. */
function d7f(tree) {
  const { wf, error } = workflowOf(tree);
  if (wf === null) return [error];
  const out = [];
  const job = wf.jobs?.diagnostic;
  if (job === undefined) return [`${F.release} has no diagnostic job`];
  const pieces = [];
  for (const [k, v] of Object.entries(job.env ?? {})) pieces.push([`env ${k}`, `${k}=${String(v)}`]);
  stepsOf(job).forEach((s, i) => {
    const label = `step ${String(i + 1)}${s.name ? ` (${s.name})` : ''}`;
    if (typeof s.run === 'string') pieces.push([label, s.run]);
    if (typeof s.uses === 'string') pieces.push([label, s.uses]);
    for (const [k, v] of Object.entries(s.env ?? {})) pieces.push([`${label} env ${k}`, `${k}=${String(v)}`]);
    for (const [k, v] of Object.entries(s.with ?? {})) pieces.push([`${label} with ${k}`, String(v)]);
  });
  for (const [where, text] of pieces) {
    for (const [route, re] of ROUTES) if (re.test(text)) out.push(`${F.release}: the diagnostic job's ${where} names ${route}; it uploads one artifact and reaches no release, tag or feed`);
  }
  stepsOf(job).forEach((s, i) => {
    if (/(^|[\s;&|(])(npx\s+)?electron-builder(\s|$)|electron-builder\/cli\.js|\.bin\/electron-builder/m.test(runText(s))) {
      out.push(`${F.release}: the diagnostic job's step ${String(i + 1)} runs electron-builder itself; it packs only through build/diagnostic/package.mjs, which passes -c.publish=null`);
    }
  });
  return out;
}

/** D7.g: the job builds the DIAGNOSTIC checker and packs it with --notarize, after the gate battery. */
function d7g(tree) {
  const { wf, error } = workflowOf(tree);
  if (wf === null) return [error];
  const out = [];
  const job = wf.jobs?.diagnostic;
  if (job === undefined) return [`${F.release} has no diagnostic job`];
  const steps = stepsOf(job);
  const whole = JSON.stringify(job);
  if (/TCHK_|P358ADV/.test(whole)) out.push(`${F.release}: the diagnostic job names TCHK_ or P358ADV, the test variant's words`);
  const at = (re) => steps.findIndex((s) => re.test(runText(s)));
  const checkerSteps = steps.filter((s) => /build\/diagnostic\/build-checker\.mjs/.test(runText(s)));
  if (checkerSteps.length === 0) out.push(`${F.release}: the diagnostic job never builds the checker with build/diagnostic/build-checker.mjs`);
  for (const s of checkerSteps) {
    const t = runText(s);
    if (!/--variant(\s+|=)diagnostic\b/.test(t) || /--variant(\s+|=)(test|plain)\b/.test(t) || /--define\b/.test(t)) {
      out.push(`${F.release}: the checker step does not build --variant diagnostic alone (no test variant, no --define): ${t.trim().slice(0, 160)}`);
    }
  }
  const pkg = at(/build\/diagnostic\/package\.mjs/);
  if (pkg === -1) out.push(`${F.release}: the diagnostic job never runs build/diagnostic/package.mjs`);
  else {
    const t = runText(steps[pkg]);
    if (!/--checker\b/.test(t) || !/--notarize\b/.test(t)) out.push(`${F.release}: package.mjs runs without --checker or --notarize: ${t.trim().slice(0, 160)}`);
    for (const [name, re] of [['npm run typecheck', /^\s*npm run typecheck\s*$/m], ['npm test', /^\s*npm test\s*$/m], ['npm run build', /^\s*npm run build\s*$/m]]) {
      const i = at(re);
      if (i === -1 || i > pkg) out.push(`${F.release}: ${name} does not run before the package step, so a tree that fails its own gates could be signed`);
    }
    const ck = at(/build\/diagnostic\/build-checker\.mjs/);
    if (ck !== -1 && ck > pkg) out.push(`${F.release}: the checker is built after the package step`);
  }
  return out;
}

// ---------------------------------------------------------------------------
// D8 — a built module, read as a Mach-O
// ---------------------------------------------------------------------------

const CPU_ARM64 = 0x0100000c;
const MH_BUNDLE = 8;
const cstrAt = (b, start, limit) => {
  let e = start;
  while (e < limit && e < b.length && b[e] !== 0) e += 1;
  return b.toString('latin1', start, e);
};

/** The symbol names one dyld bind opcode stream names. Throws on an opcode it does not know. */
function bindNames(b, off, size) {
  return bindEntries(b, off, size).map((e) => e.name);
}
/** The same, with the offset each name starts at. */
function bindEntries(b, off, size) {
  const names = [];
  let p = off;
  const end = Math.min(off + size, b.length);
  const uleb = () => {
    while (p < end && (b[p] & 0x80) !== 0) p += 1;
    p += 1;
  };
  while (p < end) {
    const byte = b[p];
    p += 1;
    const op = byte & 0xf0;
    const imm = byte & 0x0f;
    if (op === 0x00 || op === 0x10 || op === 0x30 || op === 0x50 || op === 0x90 || op === 0xb0) continue;
    if (op === 0x20 || op === 0x60 || op === 0x70 || op === 0x80 || op === 0xa0) {
      uleb();
      continue;
    }
    if (op === 0x40) {
      let q = p;
      while (q < end && b[q] !== 0) q += 1;
      names.push({ name: b.toString('latin1', p, q), at: p });
      p = q + 1;
      continue;
    }
    if (op === 0xc0) {
      uleb();
      uleb();
      continue;
    }
    if (op === 0xd0) {
      if (imm === 0x00) uleb();
      continue;
    }
    throw new Error(`a bind opcode this reader does not know: 0x${byte.toString(16)} at ${String(p - 1)}`);
  }
  return names;
}

/** The import names a chained-fixups blob holds. */
function chainedNames(b, off, size) {
  const importsOffset = b.readUInt32LE(off + 8);
  const symbolsOffset = b.readUInt32LE(off + 12);
  const n = b.readUInt32LE(off + 16);
  const format = b.readUInt32LE(off + 20);
  const symbolsFormat = b.readUInt32LE(off + 24);
  if (symbolsFormat !== 0) throw new Error('compressed chained-fixup symbol names');
  const names = [];
  for (let k = 0; k < n; k += 1) {
    let nameOffset;
    if (format === 1) nameOffset = b.readUInt32LE(off + importsOffset + k * 4) >>> 9;
    else if (format === 2) nameOffset = b.readUInt32LE(off + importsOffset + k * 8) >>> 9;
    else if (format === 3) nameOffset = b.readUInt32LE(off + importsOffset + k * 16 + 4);
    else throw new Error(`a chained import format this reader does not know: ${String(format)}`);
    names.push(cstrAt(b, off + symbolsOffset + nameOffset, off + size));
  }
  return names;
}

/** A thin 64-bit Mach-O image (the arm64 slice of a universal one), read for its imports. */
function readMachO(buf) {
  if (buf.length >= 8 && (buf.readUInt32BE(0) === 0xcafebabe || buf.readUInt32BE(0) === 0xcafebabf)) {
    const fat64 = buf.readUInt32BE(0) === 0xcafebabf;
    const n = buf.readUInt32BE(4);
    for (let k = 0; k < n; k += 1) {
      const e = 8 + k * (fat64 ? 32 : 20);
      const cpu = buf.readInt32BE(e);
      const offset = fat64 ? Number(buf.readBigUInt64BE(e + 8)) : buf.readUInt32BE(e + 8);
      const size = fat64 ? Number(buf.readBigUInt64BE(e + 16)) : buf.readUInt32BE(e + 12);
      if (cpu === CPU_ARM64) return { ...readMachO(buf.subarray(offset, offset + size)), fat: true };
    }
    throw new Error('a universal file with no arm64 slice');
  }
  if (buf.length < 32 || buf.readUInt32LE(0) !== 0xfeedfacf) throw new Error('not a 64-bit Mach-O file');
  const out = { cputype: buf.readInt32LE(4), filetype: buf.readUInt32LE(12), symtab: [], bind: [], chained: [], fat: false };
  const ncmds = buf.readUInt32LE(16);
  const sizeofcmds = buf.readUInt32LE(20);
  let off = 32;
  for (let k = 0; k < ncmds; k += 1) {
    if (off + 8 > 32 + sizeofcmds) throw new Error('the load commands run past their stated size');
    const cmd = buf.readUInt32LE(off);
    const cmdsize = buf.readUInt32LE(off + 4);
    if (cmdsize < 8 || off + cmdsize > 32 + sizeofcmds) throw new Error(`a load command of size ${String(cmdsize)} at ${String(off)}`);
    if (cmd === 0x2) {
      const symoff = buf.readUInt32LE(off + 8);
      const nsyms = buf.readUInt32LE(off + 12);
      const stroff = buf.readUInt32LE(off + 16);
      const strsize = buf.readUInt32LE(off + 20);
      for (let s = 0; s < nsyms; s += 1) {
        const e = symoff + s * 16;
        const type = buf[e + 4];
        if ((type & 0xe0) !== 0 || (type & 0x0e) !== 0 || (type & 0x01) === 0) continue;
        out.symtab.push(cstrAt(buf, stroff + buf.readUInt32LE(e), stroff + strsize));
      }
    } else if (cmd === 0x22 || cmd === 0x80000022) {
      for (const at of [16, 24, 32]) out.bind.push(...bindNames(buf, buf.readUInt32LE(off + at), buf.readUInt32LE(off + at + 4)));
    } else if (cmd === 0x80000034) {
      out.chained.push(...chainedNames(buf, buf.readUInt32LE(off + 8), buf.readUInt32LE(off + 12)));
    }
    off += cmdsize;
  }
  return out;
}

const countBytes = (buf, word) => {
  const needle = Buffer.from(word, 'latin1');
  let n = 0;
  for (let i = buf.indexOf(needle); i !== -1; i = buf.indexOf(needle, i + 1)) n += 1;
  return n;
};
const CHECKER_MARKS = ['TORTIE_CHECKER', 'diagnostic.pcache', 'tortie-guard-364'];

/** What one module holds: its arch, its imports and the plant's and the checker's words. */
function readModule(bytes) {
  let m;
  try {
    m = readMachO(bytes);
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
  const imports = new Set([...m.symtab, ...m.bind, ...m.chained]);
  return {
    error: null,
    arm64: m.cputype === CPU_ARM64,
    bundle: m.filetype === MH_BUNDLE,
    imports: m.symtab.length,
    sigaction: [...imports].some((s) => s === '_sigaction' || s.startsWith('_sigaction$')),
    sigactionWhere: [m.symtab.some((s) => s === '_sigaction') ? 'symbols' : null, m.bind.some((s) => s === '_sigaction') ? 'binds' : null, m.chained.some((s) => s === '_sigaction') ? 'fixups' : null].filter(Boolean),
    plant: Object.fromEntries(PLANT_STRINGS.map((w) => [w, countBytes(bytes, w)])),
    marks: Object.fromEntries(CHECKER_MARKS.map((w) => [w, countBytes(bytes, w) > 0]))
  };
}

/**
 * Which variant a built module is, by how it was BUILT and never by what it
 * holds: build-checker.mjs builds into `<out>/build/Release/` beside the copy
 * it appended the checker to, and only the test variant's copy defines
 * TCHK_PLANT. A module with no such build beside it is a shipped one, held
 * to the diagnostic variant's reads.
 */
function variantOf(path) {
  if (basename(path) === 'better_sqlite3.node' && basename(dirname(path)) === 'Release' && basename(dirname(dirname(path))) === 'build') {
    const c = join(dirname(dirname(dirname(path))), 'deps', 'sqlite3', 'sqlite3.c');
    if (existsSync(c)) {
      const text = readFileSync(c, 'latin1');
      if (!/\bp358adv_on_entry\s*\(\s*const char/.test(text)) return { variant: 'plain', why: `${c} holds no checker` };
      return /^[ \t]*#[ \t]*define[ \t]+TCHK_PLANT\b/m.test(text)
        ? { variant: 'test', why: `${c} defines ${PLANT_MACRO}` }
        : { variant: 'diagnostic', why: `${c} holds the checker without ${PLANT_MACRO}` };
    }
  }
  return { variant: 'diagnostic', why: 'no checker build beside it, so it is held to what ships' };
}

/** D8: each module holds what its variant must and nothing it must not. */
function d8(tree) {
  const out = [];
  for (const m of tree.nodes) {
    const r = readModule(m.bytes);
    const name = `${m.label} (${m.variant})`;
    if (r.error !== null) {
      out.push(`${name}: ${r.error}`);
      continue;
    }
    if (!r.arm64 || !r.bundle) out.push(`${name} is not an arm64 Mach-O bundle`);
    const plants = PLANT_STRINGS.filter((w) => r.plant[w] > 0);
    if (m.variant === 'diagnostic' || m.variant === 'prebuild') {
      for (const w of plants) out.push(`${name} holds ${String(r.plant[w])} × ${w}; the module that ships carries no plant (SPEC D10)`);
      if (r.sigaction) out.push(`${name} imports sigaction (${r.sigactionWhere.join(', ')}); the module that ships installs no signal handler`);
    }
    if (m.variant === 'diagnostic') {
      for (const w of CHECKER_MARKS) if (!r.marks[w]) out.push(`${name} holds no ${w}, so it is not the checking build`);
    }
    if (m.variant === 'test') {
      for (const w of PLANT_STRINGS) if (r.plant[w] === 0) out.push(`${name} holds no ${w}, so it is not the test variant and the rule could not fail on it`);
      if (!r.sigaction) out.push(`${name} imports no sigaction, so it is not the test variant and the rule could not fail on it`);
      for (const w of CHECKER_MARKS) if (!r.marks[w]) out.push(`${name} holds no ${w}, so it is not a checking build`);
    }
    if (m.variant === 'plain') out.push(`${name}: ${m.why}; hand the gate a diagnostic or a test build`);
  }
  return out;
}

/** In-memory attacks on a module's bytes. */
function renameInSymbols(bytes, to) {
  let m;
  try {
    m = readMachO(bytes);
  } catch {
    return null;
  }
  if (m.fat) return null;
  const buf = Buffer.from(bytes);
  const ncmds = buf.readUInt32LE(16);
  let off = 32;
  for (let k = 0; k < ncmds; k += 1) {
    const cmd = buf.readUInt32LE(off);
    if (cmd === 0x2) {
      const symoff = buf.readUInt32LE(off + 8);
      const nsyms = buf.readUInt32LE(off + 12);
      const stroff = buf.readUInt32LE(off + 16);
      for (let s = 0; s < nsyms; s += 1) {
        const e = symoff + s * 16;
        const type = buf[e + 4];
        if ((type & 0xe0) !== 0 || (type & 0x0e) !== 0 || (type & 0x01) === 0) continue;
        const at = stroff + buf.readUInt32LE(e);
        const name = cstrAt(buf, at, buf.length);
        if (name.length >= to.length && name !== to) {
          buf.write(`${to}\0`, at, 'latin1');
          return buf;
        }
      }
    }
    off += buf.readUInt32LE(off + 4);
  }
  return null;
}
function renameInBinds(bytes, to) {
  const buf = Buffer.from(bytes);
  let m;
  try {
    m = readMachO(buf);
  } catch {
    return null;
  }
  if (m.fat || m.bind.length === 0) return null;
  const ncmds = buf.readUInt32LE(16);
  let off = 32;
  for (let k = 0; k < ncmds; k += 1) {
    const cmd = buf.readUInt32LE(off);
    if (cmd === 0x22 || cmd === 0x80000022) {
      for (const e of bindEntries(buf, buf.readUInt32LE(off + 16), buf.readUInt32LE(off + 20))) {
        if (e.name.length < to.length || e.name === to) continue;
        const symbolsBefore = m.symtab.join('\n');
        buf.write(`${to}\0`, e.at, 'latin1');
        const after = readMachO(buf);
        return after.symtab.join('\n') === symbolsBefore && after.bind.includes(to) ? buf : null;
      }
    }
    off += buf.readUInt32LE(off + 4);
  }
  return null;
}
const replaceBytes = (bytes, from, to) => {
  const a = Buffer.from(from, 'latin1');
  const b = Buffer.from(to, 'latin1');
  if (a.length !== b.length) throw new Error('replaceBytes keeps lengths');
  const buf = Buffer.from(bytes);
  let n = 0;
  for (let i = buf.indexOf(a); i !== -1; i = buf.indexOf(a, i + 1)) {
    b.copy(buf, i);
    n += 1;
  }
  return n === 0 ? null : buf;
};
const appendBytes = (bytes, text) => Buffer.concat([bytes, Buffer.from(`\0${text}\0`, 'latin1')]);
/** A copy of the tree with every module of these variants changed by `change`; null when none changed. */
function withModules(tree, variants, change) {
  let changed = 0;
  const nodes = tree.nodes.map((m) => {
    if (!variants.includes(m.variant)) return m;
    const bytes = change(m.bytes);
    if (bytes === null) return m;
    changed += 1;
    return { ...m, bytes };
  });
  return changed === 0 ? null : { ...tree, nodes };
}

// ---------------------------------------------------------------------------
// The attacks: helpers that make one in-memory copy with one thing broken
// ---------------------------------------------------------------------------

/** Replace a node's text. */
const spliceNode = (text, node, to) => text.slice(0, node.getStart()) + to + text.slice(node.getEnd());
/** A copy of the tree with one script changed through its own parse. */
const withAst = (tree, rel, change) => withText(tree, rel, (text) => change(text, sfOf(rel, text)));
/** Append to a file. */
const appendTo = (tree, rel, add) => withText(tree, rel, (s) => `${s}\n${add}\n`);
/** Prepend to a file. */
const prependTo = (tree, rel, add) => withText(tree, rel, (s) => `${add}\n${s}`);

/** The C with the `#ifdef TCHK_PLANT … #endif` group (no #else) around `needle` opened up. */
function unwrapPlantAround(text, needle) {
  const at = text.indexOf(needle);
  if (at === -1) return null;
  const line = text.slice(0, at).split('\n').length;
  const lex = lexC(text);
  const stack = [];
  const groups = [];
  for (const d of lex.directives) {
    if (d.name === 'if' || d.name === 'ifdef' || d.name === 'ifndef') stack.push({ open: d, other: [] });
    else if ((d.name === 'elif' || d.name === 'else') && stack.length > 0) stack[stack.length - 1].other.push(d);
    else if (d.name === 'endif' && stack.length > 0) {
      const g = stack.pop();
      g.close = d;
      groups.push(g);
    }
  }
  const g = groups
    .filter((x) => x.open.name === 'ifdef' && x.open.toks[0]?.v === PLANT_MACRO && x.other.length === 0 && x.open.line < line && x.close.line > line)
    .sort((a, b) => a.close.line - a.open.line - (b.close.line - b.open.line))[0];
  if (g === undefined) return null;
  const lines = text.split('\n');
  lines[g.open.line - 1] = '';
  lines[g.close.line - 1] = '';
  return lines.join('\n');
}

/** The C with every tchkReadable call in the walk function that makes the most of them renamed away. */
function uncheckBusiestWalk(text) {
  const r = readC(text);
  let best = null;
  let most = 0;
  for (const f of r.diagFns) {
    if (f.name === 'tchkReadable' || f.name === 'tchkRegionAt') continue;
    let n = 0;
    for (let k = f.body[0]; k <= f.body[1]; k += 1) if (r.diagCode[k].v === 'tchkReadable') n += 1;
    if (n > most) {
      best = f;
      most = n;
    }
  }
  if (best === null) return null;
  const offsets = [];
  for (let k = best.body[0]; k <= best.body[1]; k += 1) if (r.diagCode[k].v === 'tchkReadable') offsets.push(r.diagCode[k].s);
  let out = text;
  for (const s of offsets.reverse()) out = `${out.slice(0, s)}tchkUnchecked${out.slice(s + 'tchkReadable'.length)}`;
  return out;
}

/** flag.ts's export's initializer, or null. */
function flagInitializer(sf) {
  for (const st of sf.statements) {
    if (!ts.isVariableStatement(st)) continue;
    for (const d of st.declarationList.declarations) if (ts.isIdentifier(d.name) && d.name.text === FLAG && d.initializer !== undefined) return d.initializer;
  }
  return null;
}

/** The comparison D6.a or D6.b reads, or null. */
const pinComparison = (sf, value, versionSide) =>
  comparisonsTo(sf, value).find((c) => (versionSide ? readsVersion(c.other) : true) && refusesOn(c.node)) ?? null;
/** Every literal that pins an anchor site in build-checker.mjs (the anchor, and any replacement that begins with it). */
function anchorLiterals(sf, tree, site) {
  const source = tree.bs3.sources[site.file] ?? '';
  return nodesOf(sf).filter((n) => {
    if (!(ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) || !n.text.includes(site.key)) return false;
    const first = source.indexOf(n.text);
    return first !== -1 && source.indexOf(n.text, first + 1) === -1;
  });
}
const anchorLiteral = (sf, tree, site) => anchorLiterals(sf, tree, site)[0] ?? null;
/** The script with every literal that pins `site` rewritten by `to`. */
function rewriteAnchors(text, sf, tree, site, to) {
  const lits = anchorLiterals(sf, tree, site).sort((a, b) => b.getStart() - a.getStart());
  if (lits.length === 0) return null;
  let out = text;
  for (const n of lits) out = spliceNode(out, n, JSON.stringify(to(n.text)));
  return out;
}
/** The `if` D6.d reads (a missing --devdir refused), or null. */
function devdirRefusal(sf) {
  return (
    nodesOf(sf).find(
      (n) =>
        ts.isIfStatement(n) &&
        /devdir/.test(n.expression.getText()) &&
        /(===|==)\s*(null|undefined)|^!/.test(n.expression.getText()) &&
        codeStrings(n.thenStatement).some((s) => s.text.includes('--devdir'))
    ) ?? null
  );
}
/** The statement of after-pack.cjs's exports.default that awaits the normal after-pack, or null. */
function normalAfterPackStatement(sf) {
  const def = exportedDefault(sf);
  if (def === null || !ts.isBlock(def.body)) return null;
  return def.body.statements.find((st) => /\.default\(/.test(st.getText()) && /await|return/.test(st.getText().slice(0, 12))) ?? null;
}

const SELF = 'self-test';

/** Does package.mjs hand electron-builder its settings in a config file (`--config`)? */
function usesConfigFile(t) {
  const text = t.text.get(F.packageMjs);
  if (typeof text !== 'string') return false;
  const argv = builderArgv(sfOf(F.packageMjs, text));
  return argv !== null && argv.elements.some((el) => foldString(el) === '--config');
}
const usesOverrides = (t) => !usesConfigFile(t);
/** A copy of the tree with package.mjs's electron-builder config object changed. */
const withConfig = (t, change) =>
  withAst(t, F.packageMjs, (s, sf) => {
    const cfg = diagnosticConfig(sf);
    return cfg === null ? null : change(s, cfg);
  });

// ---------------------------------------------------------------------------
// The clauses
// ---------------------------------------------------------------------------

const CLAUSES = [
  {
    id: 'D1.a',
    title: `${DEFINE} is named in no production file under src/ but flag.ts`,
    ask: d1a,
    attacks: [
      ['a second file declares and reads the define', (t) => withSource(t, `src/main/updates/${SELF}-d1a.ts`, `declare const ${DEFINE}: boolean;\nexport const on = ${DEFINE};\n`)],
      ['the define read by its name at run time', (t) => withSource(t, `src/main/${SELF}-d1a-global.ts`, `export const on = (globalThis as Record<string, unknown>)['${DEFINE}'] === true;\n`)],
      ['the updater tests the define instead of the flag', (t) => withText(t, 'src/main/updates/updater.ts', (s) => swap(s, `if (${FLAG}) return`, `if (${DEFINE}) return`))]
    ],
    controls: [
      ['a comment in the updater names the define', (t) => prependTo(t, 'src/main/updates/updater.ts', `// ${DEFINE} is flag.ts's alone.`)],
      ['a test stubs the define', (t) => withSource(t, `src/main/updates/__tests__/${SELF}-d1a.test.ts`, `vi.stubGlobal('${DEFINE}', true);\n`)]
    ]
  },
  {
    id: 'D1.b',
    title: `flag.ts is exactly \`declare const ${DEFINE}: boolean;\` and \`export const ${FLAG}: boolean = ${DEFINE};\``,
    ask: d1b,
    attacks: [
      ['the flag also reads the environment at run time', (t) => withAst(t, F.flag, (s, sf) => {
        const init = flagInitializer(sf);
        return init === null ? null : spliceNode(s, init, `${DEFINE} || process.env.${ENV_NAME} === '1'`);
      })],
      ['a second export beside the flag', (t) => appendTo(t, F.flag, 'export const DIAGNOSTIC_ON = true;')],
      ['the define typed loosely', (t) => withText(t, F.flag, (s) => swap(s, `declare const ${DEFINE}: boolean;`, `declare const ${DEFINE}: any;`))],
      ['a guard that reads true when the define is missing', (t) => withAst(t, F.flag, (s, sf) => {
        const init = flagInitializer(sf);
        return init === null ? null : spliceNode(s, init, `typeof ${DEFINE} !== 'boolean' || ${DEFINE}`);
      })]
    ],
    controls: [
      ['a trailing comment', (t) => appendTo(t, F.flag, '// nothing else lives here')],
      ['the other accepted spelling', (t) => withAst(t, F.flag, (s, sf) => {
        const init = flagInitializer(sf);
        if (init === null) return null;
        return spliceNode(s, init, ts.isIdentifier(peel(init) ?? init) ? `typeof ${DEFINE} === 'boolean' && ${DEFINE}` : DEFINE);
      })]
    ]
  },
  {
    id: 'D1.c',
    title: `electron.vite.config.ts sets ${DEFINE} from \`process.env.${ENV_NAME} === '1'\`, in main alone`,
    ask: d1c,
    attacks: [
      ['the renderer gets the define too', (t) => withText(t, F.vite, (s) => after(s, 'renderer: {', `\n    define: { ${DEFINE}: JSON.stringify(process.env.${ENV_NAME} === '1') },`))],
      ['a looser test of the variable', (t) => withText(t, F.vite, (s) => s.split(`process.env.${ENV_NAME} === '1'`).join(`process.env.${ENV_NAME} !== undefined`))],
      ['the define always on', (t) => withAst(t, F.vite, (s, sf) => {
        const p = propOf(peel(propOf(peel(propOf(configObject(sf), 'main')?.initializer), 'define')?.initializer), DEFINE);
        return p === null ? null : spliceNode(s, p.initializer, 'JSON.stringify(true)');
      })],
      ['the define dropped from main', (t) => withAst(t, F.vite, (s, sf) => {
        const p = propOf(peel(propOf(peel(propOf(configObject(sf), 'main')?.initializer), 'define')?.initializer), DEFINE);
        return p === null ? null : spliceNode(s, p, '__TORTIE_SELF_TEST__: JSON.stringify(false)');
      })]
    ],
    controls: [['the test spelled with brackets and parentheses', (t) => withText(t, F.vite, (s) => s.split(`process.env.${ENV_NAME} === '1'`).join(`(process.env['${ENV_NAME}'] === '1')`))]]
  },
  {
    id: 'D1.d',
    title: `vitest.config.ts defines ${DEFINE} false`,
    ask: d1d,
    attacks: [
      ['the define true under vitest', (t) => withAst(t, F.vitest, (s, sf) => {
        const p = propOf(peel(propOf(configObject(sf), 'define')?.initializer), DEFINE);
        return p === null ? null : spliceNode(s, p.initializer, "'true'");
      })],
      ['the define read from the environment under vitest', (t) => withAst(t, F.vitest, (s, sf) => {
        const p = propOf(peel(propOf(configObject(sf), 'define')?.initializer), DEFINE);
        return p === null ? null : spliceNode(s, p.initializer, `JSON.stringify(process.env.${ENV_NAME} === '1')`);
      })],
      ['the define dropped', (t) => withAst(t, F.vitest, (s, sf) => {
        const p = propOf(peel(propOf(configObject(sf), 'define')?.initializer), DEFINE);
        return p === null ? null : spliceNode(s, p, '__TORTIE_SELF_TEST__: "false"');
      })]
    ],
    controls: [['the define written JSON.stringify(false)', (t) => withAst(t, F.vitest, (s, sf) => {
      const p = propOf(peel(propOf(configObject(sf), 'define')?.initializer), DEFINE);
      return p === null ? null : spliceNode(s, p.initializer, 'JSON.stringify(false)');
    })]]
  },
  {
    id: 'D2.a',
    title: `${FLAG} is read only as the whole test of an \`if\` with no else and outside any try block, imported by name from flag.ts`,
    ask: d2a,
    attacks: [
      ['an else on the guard', (t) => withText(t, 'src/main/index.ts', (s) => swap(s, `if (${FLAG}) armChecker();`, `if (${FLAG}) armChecker(); else void 0;`))],
      ['a conditional expression', (t) => withText(t, 'src/main/index.ts', (s) => swap(s, `if (${FLAG}) armChecker();`, `void (${FLAG} ? armChecker() : undefined);`))],
      ['a logical expression', (t) => withText(t, 'src/main/index.ts', (s) => swap(s, `if (${FLAG}) armChecker();`, `${FLAG} && armChecker();`))],
      ['an argument', (t) => withText(t, 'src/main/updates/updater.ts', (s) => swap(s, "logInfo('updates are off in this diagnostic build');", `logInfo(String(${FLAG}));`))],
      ['a comparison as the test', (t) => withText(t, 'src/main/updates/updater.ts', (s) => swap(s, `if (${FLAG}) return`, `if (${FLAG} === true) return`))],
      ['an assignment', (t) => appendTo(t, 'src/main/updates/ui.ts', `export const diagnosticOn = ${FLAG};`)],
      ['a negated test', (t) => withText(t, 'src/main/updates/ui.ts', (s) => swap(s, `if (${FLAG}) {`, `if (!${FLAG}) {`))],
      ['a return', (t) => appendTo(t, 'src/main/updates/ui.ts', `export function diagnosticOnNow(): boolean {\n  return ${FLAG};\n}`)],
      ['the flag imported under another name', (t) => withText(t, 'src/main/index.ts', (s) => swap(s, `import { ${FLAG} } from './diagnostic-build/flag';`, `import { ${FLAG} as DIAG } from './diagnostic-build/flag';`))],
      ['the flag re-exported', (t) => withSource(t, `src/main/${SELF}-reexport.ts`, `export { ${FLAG} } from './diagnostic-build/flag';\n`)],
      ['flag.ts imported as a namespace', (t) => withSource(t, `src/main/${SELF}-namespace.ts`, `import * as flag from './diagnostic-build/flag';\nif (flag.${FLAG}) void 0;\n`)],
      ['a file declaring its own flag', (t) => withSource(t, `src/main/${SELF}-own.ts`, `const ${FLAG} = true;\nif (${FLAG}) void 0;\n`)],
      // The probe review (2026-11-09): rollup keeps a try block's statements, so this guard leaves the flag and
      // armChecker's body in the normal bundle (measured, rollup 4.62.4); the rule read it green before.
      ['the guard inside a try block', (t) => withText(t, 'src/main/index.ts', (s) => swap(s, `if (${FLAG}) armChecker();`, `try {\n  if (${FLAG}) armChecker();\n} catch {\n  /* never */\n}`))]
    ],
    controls: [
      ['one more guarded block', (t) => appendTo(t, 'src/main/index.ts', `if (${FLAG}) {\n  void 0;\n}`)],
      ['a comment that names the flag in an expression', (t) => appendTo(t, 'src/main/index.ts', `// never ${FLAG} ? a : b`)],
      // A catch or a finally block is not kept whole: the same guard there folded away (measured with the attack above).
      ['the guard inside a finally block', (t) => withText(t, 'src/main/index.ts', (s) => swap(s, `if (${FLAG}) armChecker();`, `try {\n  void 0;\n} finally {\n  if (${FLAG}) armChecker();\n}`))]
    ]
  },
  {
    id: 'D2.b',
    title: "checker.ts's and events.ts's exports are called only inside `if (DIAGNOSTIC_BUILD)`'s consequent",
    ask: d2b,
    attacks: [
      ['the handshake called unguarded', (t) => withText(t, 'src/main/index.ts', (s) => swap(s, `if (${FLAG}) armChecker();`, 'armChecker();'))],
      ['an event called unguarded', (t) => withText(t, 'src/main/watcher/host.ts', (s) => swap(s, `if (${FLAG}) diagnosticEvent(`, 'diagnosticEvent('))],
      ['the guard given an else', (t) => withText(t, 'src/main/index.ts', (s) => swap(s, `if (${FLAG}) armChecker();`, `if (${FLAG}) armChecker(); else void 0;`))],
      ['the handshake handed on as a value', (t) => appendTo(t, 'src/main/index.ts', 'export const arm = armChecker;')],
      ['events imported as a namespace', (t) => withSource(t, `src/main/${SELF}-ev.ts`, `import * as ev from './diagnostic-build/events';\nimport { ${FLAG} } from './diagnostic-build/flag';\nif (${FLAG}) ev.diagnosticEvent('door', 'x', {});\n`)],
      ['events re-exported', (t) => withSource(t, `src/main/${SELF}-re.ts`, "export { diagnosticEvent } from './diagnostic-build/events';\n")],
      ['the checker loaded at run time', (t) => withSource(t, `src/main/${SELF}-dyn.ts`, "export const load = () => import('./diagnostic-build/checker');\n")],
      ['events imported for its side effects', (t) => withSource(t, `src/main/${SELF}-bare.ts`, "import './diagnostic-build/events';\n")]
    ],
    controls: [
      ['a guarded call inside a callback', (t) => withSource(t, `src/main/${SELF}-ok.ts`, `import { ${FLAG} } from './diagnostic-build/flag';\nimport { diagnosticEvent } from './diagnostic-build/events';\nexport function f(on: (cb: () => void) => void): void {\n  if (${FLAG}) on(() => diagnosticEvent('door', 'x', {}));\n}\n`)],
      ['a type-only import', (t) => withSource(t, `src/main/${SELF}-type.ts`, "import type { diagnosticEvent } from './diagnostic-build/events';\nexport type E = typeof diagnosticEvent;\n")]
    ]
  },
  {
    id: 'D2.c',
    title: `the diagnostic build's updater never starts: initUpdater's \`if (${FLAG})\` comes after only its latch, logs §5's line and returns; checkForUpdatesNow answers \`unsupported\` first`,
    ask: d2c,
    attacks: [
      ["initUpdater's guard taken out (lens B's ablation 3)", (t) => withText(t, F.updater, (s) => swap(s, `  if (${FLAG}) {\n    logInfo('${UPDATES_OFF_LINE}');\n    return;\n  }\n`, ''))],
      ['the return taken out of the guard', (t) => withText(t, F.updater, (s) => swap(s, `logInfo('${UPDATES_OFF_LINE}');\n    return;`, `logInfo('${UPDATES_OFF_LINE}');`))],
      ['a setting wired before the guard', (t) => withText(t, F.updater, (s) => swap(s, 'initialized = true;\n  // Rule 7: one line', 'initialized = true;\n  autoUpdater.autoDownload = true;\n  // Rule 7: one line'))],
      ['a listener wired inside the guard', (t) => withText(t, F.updater, (s) => swap(s, `logInfo('${UPDATES_OFF_LINE}');\n    return;`, `logInfo('${UPDATES_OFF_LINE}');\n    autoUpdater.on('error', () => undefined);\n    return;`))],
      ['the off line in other words', (t) => withText(t, F.updater, (s) => swap(s, `logInfo('${UPDATES_OFF_LINE}');`, "logInfo('the updater is off');"))],
      ["checkForUpdatesNow's guard taken out", (t) => withText(t, F.updater, (s) => swap(s, `  if (${FLAG}) return { kind: 'unsupported' };\n`, ''))],
      ['checkForUpdatesNow answering another kind', (t) => withText(t, F.updater, (s) => swap(s, `if (${FLAG}) return { kind: 'unsupported' };`, `if (${FLAG}) return { kind: 'failed' };`))],
      ["checkForUpdatesNow's guard moved below another statement", (t) => withText(t, F.updater, (s) => swap(s, `  if (${FLAG}) return { kind: 'unsupported' };\n  if (!app.isPackaged) return { kind: 'unsupported' };`, `  if (!app.isPackaged) return { kind: 'unsupported' };\n  if (${FLAG}) return { kind: 'unsupported' };`))]
    ],
    controls: [
      ['a second log line inside the guard', (t) => withText(t, F.updater, (s) => swap(s, `logInfo('${UPDATES_OFF_LINE}');\n    return;`, `logInfo('${UPDATES_OFF_LINE}');\n    logInfo('no check, no download and no install in this build');\n    return;`))],
      ["checkForUpdatesNow's answer written as a block", (t) => withText(t, F.updater, (s) => swap(s, `if (${FLAG}) return { kind: 'unsupported' };`, `if (${FLAG}) {\n    return { kind: 'unsupported' };\n  }`))]
    ]
  },
  {
    id: 'D3.a',
    title: 'menu.ts and build-info.ts name neither flag and import nothing from src/main/diagnostic-build/',
    ask: d3a,
    attacks: [
      ['About reads the flag', (t) => withText(t, F.menu, (s) => `import { ${FLAG} } from './diagnostic-build/flag';\n${s}\nif (${FLAG}) void 0;\n`)],
      ['build-info reads the define', (t) => withText(t, F.buildInfo, (s) => swap(s, 'declare const __TORTIE_BUILD_COMMIT__: string;', `declare const __TORTIE_BUILD_COMMIT__: string;\ndeclare const ${DEFINE}: boolean;\nexport const MARK = ${DEFINE};`))],
      ['the menu imports the events', (t) => prependTo(t, F.menu, "import { diagnosticEvent } from './diagnostic-build/events';")]
    ],
    controls: [['a comment in the menu', (t) => appendTo(t, F.menu, `// ${FLAG} stays out of this file.`)]]
  },
  {
    id: 'D3.b',
    title: `the stamp is \`buildCommit() + (<the define's test> ? '${STAMP_MARK}' : '')\`, in main alone`,
    ask: d3b,
    attacks: [
      ['the mark always on', (t) => withText(t, F.vite, (s) => s.replace(/\(\s*([A-Za-z_$][\w$]*|process\.env\.TORTIE_DIAGNOSTIC === '1')\s*\?\s*' Diagnostic'\s*:\s*''\s*\)/, "' Diagnostic'"))],
      ['the mark under another test', (t) => withText(t, F.vite, (s) => s.replace(/\(\s*([A-Za-z_$][\w$]*)\s*\?\s*' Diagnostic'/, "(process.env.CI === 'true' ? ' Diagnostic'"))],
      ['the normal side marked too', (t) => withText(t, F.vite, (s) => s.replace(/' Diagnostic'\s*:\s*''/, "' Diagnostic' : ' Normal'"))],
      ['a second mark, in the renderer', (t) => withText(t, F.vite, (s) => after(s, 'renderer: {', "\n    define: { __TORTIE_MARK__: JSON.stringify(' Diagnostic') },"))]
    ],
    controls: [['the test written inline', (t) => withText(t, F.vite, (s) => s.replace(/\(\s*([A-Za-z_$][\w$]*)\s*\?\s*' Diagnostic'/, `(process.env.${ENV_NAME} === '1' ? ' Diagnostic'`))]]
  },
  {
    id: 'D3.c',
    title: 'flag.ts, checker.ts and events.ts run nothing when they are imported',
    ask: d3c,
    attacks: [
      ['a top-level call in events.ts', (t) => appendTo(t, F.events, 'export const made = String(Date.now());')],
      ['a side-effect import in checker.ts', (t) => prependTo(t, F.checker, "import './self-test-effects';")],
      ['an enum in events.ts', (t) => appendTo(t, F.events, 'export enum Kind { Watcher, Terminal }')],
      ['a statement in checker.ts', (t) => appendTo(t, F.checker, "process.env['TORTIE_SELF_TEST'] = '1';")]
    ],
    controls: [['a const list in events.ts', (t) => appendTo(t, F.events, "export const KINDS = ['watcher', 'terminal', 'door'] as const;")]]
  },
  {
    id: 'D4.a',
    title: `the C: every plant, P358ADV_ read, [p358adv- string, sigaction, _exit, libc allocation and foreign xFree sits inside #ifdef ${PLANT_MACRO}`,
    ask: d4a,
    attacks: [
      ['a [p358adv- line outside the plant', (t) => appendTo(t, F.c, 'static const char tchkSelfTestLeak[] = "[p358adv-LEAK] x";')],
      ['a P358ADV_ name outside the plant', (t) => appendTo(t, F.c, 'static const char tchkSelfTestLeak2[] = "P358ADV_LEAK";')],
      ['the two halves of a [p358adv- string joined by the compiler', (t) => appendTo(t, F.c, 'static const char tchkSelfTestLeak3[] = "[p358" "adv-SPLIT]";')],
      ['sigaction outside the plant', (t) => appendTo(t, F.c, 'static void tchkSelfTestSig(void){ struct sigaction sa; (void)sa; }')],
      ['_exit outside the plant', (t) => appendTo(t, F.c, 'static void tchkSelfTestExit(void){ _exit(139); }')],
      ['a libc allocation outside the plant', (t) => appendTo(t, F.c, 'static void *tchkSelfTestAlloc(void){ return malloc(16); }')],
      ['a free through the default allocator outside tchkFree', (t) => appendTo(t, F.c, 'static void tchkSelfTestFree(void *p){ tchkOrig.xFree(p); }')],
      ['the SEGV report\'s #ifdef taken away', (t) => withText(t, F.c, (s) => unwrapPlantAround(s, '"[p358adv-SEGV]'))]
    ],
    controls: [
      ['a comment holding every plant word', (t) => appendTo(t, F.c, '/* P358ADV_PLANT [p358adv-SEGV] sigaction _exit(139) malloc(16) tchkOrig.xFree(p) */')],
      ['a new plant line inside #ifdef TCHK_PLANT', (t) => appendTo(t, F.c, `#ifdef ${PLANT_MACRO}\nstatic const char tchkSelfTestOk[] = "[p358adv-OK]";\nstatic void *tchkSelfTestOkAlloc(void){ return malloc(16); }\n#endif`)]
    ]
  },
  {
    id: 'D4.b',
    title: `the C, outside the plant: one environment read, getenv("${CHECKER_VARIABLE}"), then its unsetenv in the same function`,
    ask: d4b,
    attacks: [
      ['a second variable read', (t) => appendTo(t, F.c, 'static const char *tchkSelfTestHome(void){ return getenv("HOME"); }')],
      ['the unsetenv taken away', (t) => withText(t, F.c, (s) => swap(s, `unsetenv("${CHECKER_VARIABLE}");`, '/* kept */'))],
      ['the variable read a second time, never removed there', (t) => appendTo(t, F.c, `static const char *tchkSelfTestAgain(void){ return getenv("${CHECKER_VARIABLE}"); }`)],
      ['the environment written', (t) => appendTo(t, F.c, `static void tchkSelfTestSet(void){ setenv("${CHECKER_VARIABLE}", "x", 1); }`)],
      ['the whole environment read', (t) => appendTo(t, F.c, 'extern char **environ;\nstatic char **tchkSelfTestEnv(void){ return environ; }')]
    ],
    controls: [['a P358ADV_ read inside the plant', (t) => appendTo(t, F.c, `#ifdef ${PLANT_MACRO}\nstatic const char *tchkSelfTestPlantEnv(void){ return getenv("P358ADV_SELF_TEST"); }\n#endif`)]]
  },
  {
    id: 'D4.c',
    title: `the C opens one file, the one ${CHECKER_VARIABLE} names, write-only with O_APPEND`,
    ask: d4c,
    attacks: [
      ['O_APPEND taken away', (t) => withText(t, F.c, (s) => swap(s, 'O_WRONLY|O_APPEND|O_CREAT|O_CLOEXEC', 'O_WRONLY|O_CREAT|O_CLOEXEC'))],
      ['O_TRUNC added', (t) => withText(t, F.c, (s) => swap(s, 'O_WRONLY|O_APPEND|O_CREAT|O_CLOEXEC', 'O_WRONLY|O_APPEND|O_CREAT|O_TRUNC|O_CLOEXEC'))],
      ['a second file opened', (t) => appendTo(t, F.c, 'static int tchkSelfTestOpen(void){ return open("/tmp/tortie-self-test", O_WRONLY|O_APPEND|O_CREAT, 0600); }')],
      ['the log opened through stdio', (t) => appendTo(t, F.c, 'static void *tchkSelfTestF(void){ return fopen(tchkLogPath, "a"); }')],
      ['the path filled from somewhere else', (t) => appendTo(t, F.c, 'static void tchkSelfTestPath(void){ snprintf(tchkLogPath, sizeof(tchkLogPath), "%s", "/tmp/x"); }')],
      ['a database opened', (t) => appendTo(t, F.c, 'static int tchkSelfTestDb(void){ sqlite3 *d; return sqlite3_open_v2(":memory:", &d, SQLITE_OPEN_READWRITE, 0); }')],
      ['a stream opened to a process', (t) => appendTo(t, F.c, 'static void *tchkSelfTestPipe(void){ return popen("/usr/bin/true", "r"); }')]
    ],
    controls: [['the flags in another order', (t) => withText(t, F.c, (s) => swap(s, 'O_WRONLY|O_APPEND|O_CREAT|O_CLOEXEC', 'O_APPEND|O_CLOEXEC|O_WRONLY|O_CREAT'))]]
  },
  {
    id: 'D4.d',
    title: 'the C installs its allocator once, in the constructor, after reading the default, and never initialises SQLite',
    ask: d4d,
    attacks: [
      ['SQLite initialised at load', (t) => withText(t, F.c, (s) => swap(s, 'if( sqlite3_config(SQLITE_CONFIG_GETMALLOC', 'sqlite3_initialize();\n  if( sqlite3_config(SQLITE_CONFIG_GETMALLOC'))],
      ['the allocator installed again later', (t) => appendTo(t, F.c, 'static void tchkSelfTestReinstall(void){ sqlite3_mem_methods m; memset(&m, 0, sizeof(m)); sqlite3_config(SQLITE_CONFIG_MALLOC, &m); }')],
      ['no constructor', (t) => withText(t, F.c, (s) => swap(s, '__attribute__((constructor))', ''))],
      ['the default never read', (t) => withText(t, F.c, (s) => s.replace(/if\(\s*sqlite3_config\(SQLITE_CONFIG_GETMALLOC,[^;]*;/, '/* not read */'))],
      ['another configuration at run time', (t) => appendTo(t, F.c, 'static void tchkSelfTestCfg(void){ sqlite3_config(SQLITE_CONFIG_MEMSTATUS, 0); }')]
    ],
    controls: [['the GETMALLOC test written the other way round', (t) => withText(t, F.c, (s) => s.replace(/if\(\s*sqlite3_config\(SQLITE_CONFIG_GETMALLOC, &tchkOrig\)!=SQLITE_OK\s*\)/, 'if( SQLITE_OK!=sqlite3_config(SQLITE_CONFIG_GETMALLOC, &tchkOrig) )'))]]
  },
  {
    id: 'D4.e',
    title: `the C never defines ${PLANT_MACRO} or a ${ABLATE_PREFIX}* itself`,
    ask: d4e,
    attacks: [
      [`#define ${PLANT_MACRO} at the top`, (t) => prependTo(t, F.c, `#define ${PLANT_MACRO} 1`)],
      [`#define ${ABLATE_PREFIX}OWNER at the top`, (t) => prependTo(t, F.c, `#define ${ABLATE_PREFIX}OWNER 1`)],
      [`#undef ${PLANT_MACRO}`, (t) => appendTo(t, F.c, `#undef ${PLANT_MACRO}`)]
    ],
    controls: [['one more ablation test', (t) => appendTo(t, F.c, `#ifdef ${ABLATE_PREFIX}SELF_TEST\n#endif`)]]
  },
  {
    id: 'D4.f',
    title: 'the C keeps the measured constants: a 16-byte guard "tortie-guard-364" and a 25 ms floor',
    ask: d4f,
    attacks: [
      ['a 32-byte guard', (t) => withText(t, F.c, (s) => s.replace(/#define TCHK_GUARD 16\b/, '#define TCHK_GUARD 32'))],
      ['no floor', (t) => withText(t, F.c, (s) => s.replace(/(#\s*define TCHK_FLOOR_MS )25(\.0)?/, '$10.0'))],
      ['the guard zeroed', (t) => withText(t, F.c, (s) => s.replace('0x74,0x6f,0x72,0x74', '0x00,0x6f,0x72,0x74'))]
    ],
    controls: [['the floor written 25', (t) => withText(t, F.c, (s) => s.replace(/(#\s*define TCHK_FLOOR_MS )25\.0/, '$125'))]]
  },
  {
    id: 'D5',
    title: 'the C, diagnostic variant: every read through a pcache pointer follows a tchkReadable of it',
    ask: d5,
    note: (t) => {
      const r = readC(t.text.get(F.c));
      const { reads, inFns } = walkCount(r.diagCode, r.diagFns.filter((f) => f.name !== 'tchkReadable' && f.name !== 'tchkRegionAt'));
      return `${String(reads)} reads through ${[...WALK_TYPES].join(', ')} pointers in ${String(inFns)} of the diagnostic variant's ${String(r.diagFns.length)} functions, each after a tchkReadable of its pointer`;
    },
    attacks: [
      ['the busiest walk function asks the kernel nothing', (t) => withText(t, F.c, uncheckBusiestWalk)],
      ['a read after one check, through the pointer it found', (t) => appendTo(t, F.c, 'static unsigned tchkSelfTestRead(TchkRegions *rc, Pager *pg){ PCache *pc; if( !tchkReadable(rc, pg, sizeof(Pager)) ) return 0; pc = pg->pPCache; return (unsigned)pc->szPage; }')],
      ['a loop checked once before it moves on', (t) => appendTo(t, F.c, 'static int tchkSelfTestLoop(TchkRegions *rc, PgHdr1 *p){ if( !tchkReadable(rc, p, sizeof(PgHdr1)) ) return 0; while( p ){ if( p->iKey==0 ) return 1; p = p->pNext; } return 0; }')],
      ['a cast read through directly', (t) => appendTo(t, F.c, 'static unsigned tchkSelfTestCast(void *x){ return ((PgHdr1*)x)->iKey; }')],
      ['a parameter its one caller never checked', (t) => appendTo(t, F.c, 'static unsigned tchkSelfTestKey(PgHdr1 *p){ return p->iKey; }\nstatic unsigned tchkSelfTestCaller(PgHdr1 *q){ return tchkSelfTestKey(q); }')],
      ['the check compiled into the test variant alone', (t) => appendTo(t, F.c, `static unsigned tchkSelfTestPlantCheck(TchkRegions *rc, PCache1 *c){\n#ifdef ${PLANT_MACRO}\n  if( !tchkReadable(rc, c, sizeof(PCache1)) ) return 0;\n#endif\n  return c->nPage;\n}`)],
      ['a copy out of an unchecked line', (t) => appendTo(t, F.c, 'static void tchkSelfTestCopy(TchkRegions *rc, PCache1 *c, unsigned char *dst){ PgHdr1 *q; if( !tchkReadable(rc, c, sizeof(PCache1)) ) return; q = c->pFree; memcpy(dst, q, 8); }')],
      // The fix round (lens B's ablation 2): the walk's own hash table read with its check deleted faulted the app
      // (tchkWalkDb+0x2c4) and wrote no line, and this rule read green.
      ["the walk's hash table read with its own check taken away", (t) => withText(t, F.c, (s) => swap(s, 'if( !tchkReadable(rc, ap, sizeof(PgHdr1*)*(size_t)nHash) ) TCHK_FAIL(f, "hash", 0, "the hash table cannot be read");', '/* not asked */'))],
      ['a table read through the pointer it found, never asked', (t) => appendTo(t, F.c, 'static PgHdr1 *tchkSelfTestTable(TchkRegions *rc, PCache1 *c){ PgHdr1 **ap; if( !tchkReadable(rc, c, sizeof(PCache1)) ) return 0; ap = c->apHash; return ap[0]; }')],
      ['a connection\'s database list read through the pointer it found, never asked', (t) => appendTo(t, F.c, 'static Btree *tchkSelfTestDbList(TchkRegions *rc, sqlite3 *db){ Db *aDb; if( !tchkReadable(rc, db, sizeof(sqlite3)) ) return 0; aDb = db->aDb; return aDb[0].pBt; }')]
    ],
    controls: [
      ['two checks, then the read', (t) => appendTo(t, F.c, 'static unsigned tchkSelfTestOk(TchkRegions *rc, Pager *pg){ PCache *pc; if( !tchkReadable(rc, pg, sizeof(Pager)) ) return 0; pc = pg->pPCache; if( !tchkReadable(rc, pc, sizeof(PCache)) ) return 0; return (unsigned)pc->szPage; }')],
      ['a table read after its own check', (t) => appendTo(t, F.c, 'static PgHdr1 *tchkSelfTestTableOk(TchkRegions *rc, PCache1 *c){ PgHdr1 **ap; if( !tchkReadable(rc, c, sizeof(PCache1)) ) return 0; ap = c->apHash; if( !tchkReadable(rc, ap, sizeof(PgHdr1*)) ) return 0; return ap[0]; }')],
      ['a loop that re-checks at its head', (t) => appendTo(t, F.c, 'static int tchkSelfTestLoopOk(TchkRegions *rc, PgHdr1 *p){ while( p ){ if( !tchkReadable(rc, p, sizeof(PgHdr1)) ) return 0; if( p->iKey==0 ) return 1; p = p->pNext; } return 0; }')],
      ['an interior pointer of a checked group', (t) => appendTo(t, F.c, 'static PgHdr1 *tchkSelfTestAnchor(TchkRegions *rc, PGroup *g){ PgHdr1 *a; if( !tchkReadable(rc, g, sizeof(PGroup)) ) return 0; a = &g->lru; return a->pLruPrev; }')]
    ]
  },
  {
    id: 'D6.a',
    title: 'build-checker.mjs refuses a better-sqlite3 other than the one package-lock.json pins',
    ask: d6a,
    attacks: [
      ['the pin moved to another version', (t) => withAst(t, F.buildChecker, (s, sf) => {
        const lit = nodesOf(sf).find((n) => isStr(n, t.bs3.locked));
        return lit === undefined ? null : spliceNode(s, lit, `'${t.bs3.locked}-self-test'`);
      })],
      ['the refusal taken away', (t) => withAst(t, F.buildChecker, (s, sf) => {
        const c = pinComparison(sf, t.bs3.locked, true);
        return c === null ? null : spliceNode(s, c.node, 'false');
      })]
    ],
    controls: [['the comparison written the other way round', (t) => withAst(t, F.buildChecker, (s, sf) => {
      const c = pinComparison(sf, t.bs3.locked, true);
      return c === null ? null : spliceNode(s, c.node, `${c.node.right.getText()} ${c.node.operatorToken.getText()} ${c.node.left.getText()}`);
    })]]
  },
  {
    id: 'D6.b',
    title: "build-checker.mjs pins the amalgamation's sha256, re-derived here from node_modules, and refuses any other",
    ask: d6b,
    attacks: [
      ['one digit of the pin changed', (t) => withAst(t, F.buildChecker, (s, sf) => {
        const lit = nodesOf(sf).find((n) => isStr(n, t.amalgamationSha ?? ''));
        return lit === undefined ? null : spliceNode(s, lit, `'${t.amalgamationSha.slice(0, -1)}${t.amalgamationSha.endsWith('0') ? '1' : '0'}'`);
      })],
      ['the refusal taken away', (t) => withAst(t, F.buildChecker, (s, sf) => {
        const c = pinComparison(sf, t.amalgamationSha ?? '', false);
        return c === null ? null : spliceNode(s, c.node, 'false');
      })]
    ],
    controls: [['the comparison written the other way round', (t) => withAst(t, F.buildChecker, (s, sf) => {
      const c = pinComparison(sf, t.amalgamationSha ?? '', false);
      return c === null ? null : spliceNode(s, c.node, `${c.node.right.getText()} ${c.node.operatorToken.getText()} ${c.node.left.getText()}`);
    })]]
  },
  {
    id: 'D6.c',
    title: 'build-checker.mjs pins the four anchors, each found exactly once where its breadcrumb goes (re-derived over the pinned sources)',
    ask: d6c,
    attacks: [
      ['the close anchor cut to the call alone, which occurs three times', (t) => withAst(t, F.buildChecker, (s, sf) => rewriteAnchors(s, sf, t, ANCHOR_SITES.close, () => '\t\tint status = sqlite3_close(db_handle);'))],
      ['the iterator anchor no longer in the source', (t) => withAst(t, F.buildChecker, (s, sf) => rewriteAnchors(s, sf, t, ANCHOR_SITES.next, (x) => x.replace('busy = true', 'busy = 1')))],
      ['the exec anchor cut so it occurs twice', (t) => withAst(t, F.buildChecker, (s, sf) => rewriteAnchors(s, sf, t, ANCHOR_SITES.exec, () => '\tdb->busy = true;\n'))],
      ['the start anchor no longer in the source', (t) => withAst(t, F.buildChecker, (s, sf) => rewriteAnchors(s, sf, t, ANCHOR_SITES.start, (x) => x.replace('(x, y)', '(y, x)')))],
      ['the exec anchor placed in another method (JS_table)', (t) => withAst(t, F.buildChecker, (s, sf) => rewriteAnchors(s, sf, t, ANCHOR_SITES.exec, () => '\tdb->busy = true;\n\tif (sqlite3_create_module_v2(db->db_handle'))]
    ],
    controls: [['the close anchor spelled as two joined strings', (t) => withAst(t, F.buildChecker, (s, sf) => {
      const n = anchorLiteral(sf, t, ANCHOR_SITES.close);
      if (n === null) return null;
      const half = Math.floor(n.text.length / 2);
      return spliceNode(s, n, `${JSON.stringify(n.text.slice(0, half))} + ${JSON.stringify(n.text.slice(half))}`);
    })]]
  },
  {
    id: 'D6.d',
    title: 'build-checker.mjs refuses a run with no --devdir, hands node-gyp --devdir=, and never reads a home folder',
    ask: d6d,
    attacks: [
      ['the --devdir refusal taken away', (t) => withAst(t, F.buildChecker, (s, sf) => {
        const n = devdirRefusal(sf);
        return n === null ? null : spliceNode(s, n, '');
      })],
      ['node-gyp left to pick its own headers', (t) => withAst(t, F.buildChecker, (s, sf) => {
        for (const arr of nodesOf(sf).filter((x) => ts.isArrayLiteralExpression(x) && x.elements.some((el) => foldString(el) === 'rebuild'))) {
          const el = arr.elements.find((x) => ts.isTemplateExpression(peel(x)) && peel(x).head.text === '--devdir=');
          if (el !== undefined) return spliceNode(s, el, "'--loglevel=warn'");
        }
        return null;
      })],
      ['a fallback to the home folder', (t) => appendTo(t, F.buildChecker, "export const fallbackDevdir = join(homedir(), '.electron-gyp');")],
      ['HOME read from the environment', (t) => appendTo(t, F.buildChecker, 'export const home = process.env.HOME;')]
    ],
    controls: [['the refusal reworded, still naming --devdir', (t) => withAst(t, F.buildChecker, (s, sf) => {
      const n = devdirRefusal(sf);
      if (n === null) return null;
      const from = n.thenStatement.getStart();
      const i = s.indexOf('--devdir', from);
      return i === -1 || i > n.thenStatement.getEnd() ? null : `${s.slice(0, i)}--devdir (${SELF})${s.slice(i + '--devdir'.length)}`;
    })]]
  },
  {
    id: 'D6.e',
    title: 'build-checker.mjs writes nothing under any node_modules and runs nothing there',
    ask: d6e,
    attacks: [
      ['the amalgamation patched in place', (t) => appendTo(t, F.buildChecker, "appendFileSync(join(ROOT, 'node_modules', 'better-sqlite3', 'deps', 'sqlite3', 'sqlite3.c'), '');")],
      ['node-gyp run inside the package', (t) => withAst(t, F.buildChecker, (s, sf) => {
        const cwd = nodesOf(sf).find((n) => ts.isPropertyAssignment(n) && propName(n.name) === 'cwd');
        return cwd === undefined ? null : spliceNode(s, cwd.initializer, "join(ROOT, 'node_modules', 'better-sqlite3')");
      })],
      ['the copy made the wrong way round', (t) => withAst(t, F.buildChecker, (s, sf) => {
        const arr = nodesOf(sf).find((n) => ts.isArrayLiteralExpression(n) && n.elements.length >= 3 && foldString(n.elements[0]) === '-Rc');
        if (arr === undefined) return null;
        const [a, b] = arr.elements.slice(-2);
        return s.slice(0, a.getStart()) + b.getText() + s.slice(a.getEnd(), b.getStart()) + a.getText() + s.slice(b.getEnd());
      })]
    ],
    controls: [['one more write, into the output', (t) => appendTo(t, F.buildChecker, `writeFileSync(join(resolve('${SELF}'), 'note.txt'), '');`)]]
  },
  {
    id: 'D6.f',
    title: `build-checker.mjs writes #define ${PLANT_MACRO} (and any --define) into the copy for --variant test alone`,
    ask: d6f,
    attacks: [
      ['the plant written for every variant', (t) => withAst(t, F.buildChecker, (s, sf) => {
        const lit = nodesOf(sf).find((n) => isStr(n) && /#\s*define\s+TCHK_PLANT/.test(n.text));
        if (lit === undefined) return null;
        for (let p = lit.parent; p !== undefined; p = p.parent) if (ts.isConditionalExpression(p)) return spliceNode(s, p.condition, 'true');
        return null;
      })],
      ['a define written unconditionally', (t) => appendTo(t, F.buildChecker, "export const ALWAYS = '#define TCHK_ABLATE_OWNER 1';")]
    ],
    controls: [["the test written 'test' === variant", (t) => withAst(t, F.buildChecker, (s, sf) => {
      const lit = nodesOf(sf).find((n) => isStr(n) && /#\s*define\s+TCHK_PLANT/.test(n.text));
      if (lit === undefined) return null;
      for (let p = lit.parent; p !== undefined; p = p.parent) {
        if (ts.isConditionalExpression(p) && ts.isBinaryExpression(peel(p.condition))) {
          const c = peel(p.condition);
          return spliceNode(s, c, `${c.right.getText()} === ${c.left.getText()}`);
        }
      }
      return null;
    })]]
  },
  {
    id: 'D6.g',
    title: "the close breadcrumb build-checker.mjs places carries the op the C walks at every close",
    ask: d6g,
    attacks: [
      ["the C's close op renamed", (t) => withText(t, F.c, (s) => swap(s, 'strcmp(op, "Database::close")', 'strcmp(op, "Database::closeHandles")'))],
      ["the script's close op renamed", (t) => withText(t, F.buildChecker, (s) => s.split('p358adv_on_entry("Database::close"').join('p358adv_on_entry("Database::shut"'))]
    ],
    controls: [['the breadcrumb spelled as two joined strings', (t) => withAst(t, F.buildChecker, (s, sf) => {
      const n = nodesOf(sf).find((x) => isStr(x) && x.text.includes('p358adv_on_entry("Database::close"'));
      if (n === undefined) return null;
      const cut = n.text.indexOf('Database::close') + 4;
      return spliceNode(s, n, `${JSON.stringify(n.text.slice(0, cut))} + ${JSON.stringify(n.text.slice(cut))}`);
    })]]
  },
  {
    id: 'D6.h',
    title: "after-pack.cjs writes only the packed module, refuses a normal or planted package before it writes, and awaits the normal after-pack after the swap",
    ask: d6h,
    attacks: [
      ['a write into the checkout\'s node_modules', (t) => appendTo(t, F.afterPack, "function selfTestWrite(context) {\n  writeFileSync(join(context.packager.projectDir, 'node_modules', 'better-sqlite3', 'prebuilds', 'darwin-arm64.node'), '');\n}")],
      ['the TORTIE_DIAGNOSTIC refusal taken away', (t) => withAst(t, F.afterPack, (s, sf) => {
        const n = nodesOf(sf).find((x) => ts.isIfStatement(x) && /TORTIE_DIAGNOSTIC\b/.test(x.expression.getText()) && !/TORTIE_DIAGNOSTIC_NODE/.test(x.expression.getText()));
        return n === undefined ? null : spliceNode(s, n, '');
      })],
      ['the plant refusal taken away', (t) => withAst(t, F.afterPack, (s, sf) => {
        const ifs = nodesOf(sf).filter((x) => ts.isIfStatement(x) && holdsThrow(x.thenStatement));
        const n = ifs.find((x) => /planted|PLANT_STRINGS|P358ADV/.test(x.expression.getText()));
        return n === undefined ? null : spliceNode(s, n, '');
      })],
      ['the normal after-pack before the swap', (t) => withAst(t, F.afterPack, (s, sf) => {
        const def = exportedDefault(sf);
        const normal = normalAfterPackStatement(sf);
        if (def === null || normal === null || !ts.isBlock(def.body)) return null;
        const first = def.body.statements[0];
        if (first === normal) return null;
        const without = s.slice(0, normal.getFullStart()) + s.slice(normal.getEnd());
        const at = first.getFullStart();
        return `${without.slice(0, at)}\n  const normalFirst = require('../after-pack.cjs');\n  await normalFirst.default(context);${without.slice(at)}`;
      })],
      ['the normal after-pack skipped when a variable says so', (t) => withAst(t, F.afterPack, (s, sf) => {
        const normal = normalAfterPackStatement(sf);
        return normal === null ? null : spliceNode(s, normal, `if (process.env.SKIP_NORMAL !== '1') { ${normal.getText()} }`);
      })],
      ['the normal after-pack not awaited', (t) => withAst(t, F.afterPack, (s, sf) => {
        const normal = normalAfterPackStatement(sf);
        return normal === null || !/^await\s/.test(normal.getText()) ? null : spliceNode(s, normal, normal.getText().replace(/^await\s+/, 'void '));
      })]
    ],
    controls: [
      ['a line logged after the swap', (t) => withAst(t, F.afterPack, (s, sf) => {
        const normal = normalAfterPackStatement(sf);
        return normal === null ? null : spliceNode(s, normal, `console.log('${SELF}');\n  ${normal.getText()}`);
      })],
      ['the normal after-pack returned instead of awaited', (t) => withAst(t, F.afterPack, (s, sf) => {
        const normal = normalAfterPackStatement(sf);
        return normal === null || !/^await\s/.test(normal.getText()) ? null : spliceNode(s, normal, normal.getText().replace(/^await\s+/, 'return '));
      })]
    ]
  },
  {
    id: 'D6.i',
    title: 'package.mjs hands electron-builder --publish never, a null publish, the diagnostic after-pack and a -diagnostic- name, unsigned unless --notarize',
    ask: d6i,
    attacks: [
      ['--publish always', (t) => withAst(t, F.packageMjs, (s, sf) => {
        const el = builderArgv(sf)?.elements.find((x) => foldString(x) === 'never');
        return el === undefined ? null : spliceNode(s, el, "'always'");
      })],
      ['a named identity on the command line', (t) => withAst(t, F.packageMjs, (s, sf) => {
        const arr = builderArgv(sf);
        return arr === null ? null : spliceNode(s, arr, `[${arr.elements.map((e) => e.getText()).join(', ')}, '-c.mac.identity=Developer ID Application: Self Test']`);
      })],
      ['the artifact name without -diagnostic-', (t) => withText(t, F.packageMjs, (s) => (s.includes('-diagnostic-${arch}') ? s.split('-diagnostic-${arch}').join('-${arch}') : null))],
      ['the config publishing to GitHub', (t) => withConfig(t, (s, cfg) => {
        const p = propOf(cfg, 'publish');
        return p === null ? null : spliceNode(s, p.initializer, "{ provider: 'github', owner: 'gregce', repo: 'tortie' }");
      }), usesConfigFile],
      ['the config\'s publish left out', (t) => withConfig(t, (s, cfg) => {
        const p = propOf(cfg, 'publish');
        return p === null ? null : spliceNode(s, p.name, 'notPublish');
      }), usesConfigFile],
      ['the config not extending electron-builder.yml', (t) => withConfig(t, (s, cfg) => {
        const p = propOf(cfg, 'extends');
        return p === null ? null : spliceNode(s, p.name, 'basedOn');
      }), usesConfigFile],
      ['the config\'s afterPack the normal one', (t) => withConfig(t, (s, cfg) => {
        const p = propOf(cfg, 'afterPack');
        return p === null ? null : spliceNode(s, p.initializer, `'${F.normalAfterPack}'`);
      }), usesConfigFile],
      ['an unsigned run left to find his identity', (t) => withConfig(t, (s, cfg) => {
        const mac = peel(propOf(cfg, 'mac')?.initializer);
        if (mac === undefined) return null;
        return ts.isConditionalExpression(mac) ? spliceNode(s, mac.whenFalse, '{}') : spliceNode(s, mac, '{}');
      }), usesConfigFile],
      ['identity null on the signing side', (t) => withConfig(t, (s, cfg) => {
        const mac = peel(propOf(cfg, 'mac')?.initializer);
        return mac === undefined || !ts.isConditionalExpression(mac) ? null : spliceNode(s, mac, `${mac.condition.getText()} ? ${mac.whenFalse.getText()} : ${mac.whenTrue.getText()}`);
      }), usesConfigFile],
      ['a named identity in the config', (t) => withConfig(t, (s, cfg) => {
        const mac = peel(propOf(cfg, 'mac')?.initializer);
        if (mac === undefined) return null;
        const target = ts.isConditionalExpression(mac) ? mac.whenFalse : mac;
        return spliceNode(s, target, "{ identity: 'Developer ID Application: Self Test' }");
      }), usesConfigFile],
      ['--config taken off the command line', (t) => withAst(t, F.packageMjs, (s, sf) => {
        const el = builderArgv(sf)?.elements.find((x) => foldString(x) === '--config');
        return el === undefined ? null : spliceNode(s, el, "'--arm64'");
      }), usesConfigFile],
      ['-c.publish=null taken away', (t) => withAst(t, F.packageMjs, (s, sf) => {
        const el = builderArgv(sf)?.elements.find((x) => foldString(x) === '-c.publish=null');
        return el === undefined ? null : spliceNode(s, el, "'--arm64'");
      }), usesOverrides],
      ['-c.mac.identity=null taken away', (t) => withAst(t, F.packageMjs, (s, sf) => {
        const lit = nodesOf(sf).find((x) => isStr(x, '-c.mac.identity=null'));
        return lit === undefined ? null : spliceNode(s, lit, "'-c.mac.hardenedRuntime=true'");
      }), usesOverrides],
      ['-c.afterPack taken away', (t) => withAst(t, F.packageMjs, (s, sf) => {
        const el = builderArgv(sf)?.elements.find((x) => (foldString(x) ?? '').startsWith('-c.afterPack='));
        return el === undefined ? null : spliceNode(s, el, "'--arm64'");
      }), usesOverrides]
    ],
    controls: [
      ['one more harmless key in the config', (t) => withConfig(t, (s, cfg) => {
        const p = propOf(cfg, 'extends');
        return p === null ? null : `${s.slice(0, p.getEnd())},\n    compression: 'store'${s.slice(p.getEnd())}`;
      }), usesConfigFile],
      ['one more harmless option on the command line', (t) => withAst(t, F.packageMjs, (s, sf) => {
        const arr = builderArgv(sf);
        return arr === null ? null : spliceNode(s, arr, `[${arr.elements.map((e) => e.getText()).join(', ')}, '-c.compression=store']`);
      })]
    ]
  },
  {
    id: 'D6.j',
    title: 'package.mjs refuses an unsigned run whose log names a Developer ID',
    ask: d6j,
    attacks: [
      ['the log never read', (t) => withAst(t, F.packageMjs, (s, sf) => {
        const n = nodesOf(sf).find((x) => ts.isCallExpression(x) && ts.isPropertyAccessExpression(x.expression) && x.expression.name.text === 'test' && ts.isRegularExpressionLiteral(peel(x.expression.expression) ?? x) && /Developer ID/.test(peel(x.expression.expression).text));
        return n === undefined ? null : spliceNode(s, n, 'false');
      })],
      ['the refusal applied to the signing run instead', (t) => withAst(t, F.packageMjs, (s, sf) => {
        const n = nodesOf(sf).find((x) => ts.isCallExpression(x) && ts.isPropertyAccessExpression(x.expression) && x.expression.name.text === 'test' && ts.isRegularExpressionLiteral(peel(x.expression.expression) ?? x) && /Developer ID/.test(peel(x.expression.expression).text));
        const and = n?.parent;
        if (and === undefined || !ts.isBinaryExpression(and)) return null;
        const other = and.left === n ? and.right : and.left;
        return spliceNode(s, other, 'notarize');
      })]
    ],
    controls: [['the pattern made case-blind', (t) => withText(t, F.packageMjs, (s) => (s.includes('/Developer ID/.test(') ? s.split('/Developer ID/.test(').join('/Developer ID/i.test(') : null))]]
  },
  {
    id: 'D7.a',
    title: 'release.yml starts on a v* tag push, or a dispatch with one boolean input, diagnostic, off by default',
    ask: d7a,
    attacks: [
      ['a push of a branch', (t) => withWorkflow(t, (w) => { w.on.push.branches = ['main']; })],
      ['a schedule', (t) => withWorkflow(t, (w) => { w.on.schedule = [{ cron: '0 3 * * *' }]; })],
      ['the input on by default', (t) => withWorkflow(t, (w) => { if (w.on.workflow_dispatch?.inputs?.diagnostic === undefined) return false; w.on.workflow_dispatch.inputs.diagnostic.default = true; })],
      ['a second input', (t) => withWorkflow(t, (w) => { if (w.on.workflow_dispatch?.inputs === undefined) return false; w.on.workflow_dispatch.inputs.tag = { type: 'string' }; })]
    ],
    controls: [['the triggers in another order', (t) => withWorkflow(t, (w) => { w.on = Object.fromEntries(Object.entries(w.on).reverse()); })]]
  },
  {
    id: 'D7.b',
    title: 'the release job runs only on a push and is otherwise the pinned job',
    ask: d7b,
    attacks: [
      ['the release job unconditioned', (t) => withWorkflow(t, (w) => { delete w.jobs.release.if; })],
      ['the release job on every event', (t) => withWorkflow(t, (w) => { w.jobs.release.if = 'always()'; })],
      ['a step added to the release job', (t) => withWorkflow(t, (w) => { w.jobs.release.steps.push({ run: `echo ${SELF}` }); })],
      ['the workflow\'s permissions narrowed', (t) => withWorkflow(t, (w) => { w.permissions = { contents: 'read' }; })]
    ],
    controls: [['the release job\'s keys in another order', (t) => withWorkflow(t, (w) => { w.jobs.release = Object.fromEntries(Object.entries(w.jobs.release).reverse()); })]]
  },
  {
    id: 'D7.c',
    title: 'release.yml holds two jobs, and the diagnostic one runs only on a dispatch with diagnostic ticked',
    ask: d7c,
    attacks: [
      ['the diagnostic job unconditioned', (t) => withWorkflow(t, (w) => { if (w.jobs.diagnostic === undefined) return false; delete w.jobs.diagnostic.if; })],
      ['the diagnostic job on any dispatch', (t) => withWorkflow(t, (w) => { if (w.jobs.diagnostic === undefined) return false; w.jobs.diagnostic.if = "github.event_name == 'workflow_dispatch'"; })],
      ['a third job', (t) => withWorkflow(t, (w) => { w.jobs.publish = { 'runs-on': 'macos-15', steps: [{ run: 'true' }] }; })]
    ],
    controls: [['the if written with ${{ }}', (t) => withWorkflow(t, (w) => { if (w.jobs.diagnostic === undefined) return false; w.jobs.diagnostic.if = `\${{ ${DIAGNOSTIC_IF} }}`; })]]
  },
  {
    id: 'D7.d',
    title: 'the diagnostic job holds exactly contents: read',
    ask: d7d,
    attacks: [
      ['contents: write', (t) => withWorkflow(t, (w) => { if (w.jobs.diagnostic === undefined) return false; w.jobs.diagnostic.permissions = { contents: 'write' }; })],
      ['an id-token', (t) => withWorkflow(t, (w) => { if (w.jobs.diagnostic === undefined) return false; w.jobs.diagnostic.permissions = { contents: 'read', 'id-token': 'write' }; })],
      ['the workflow\'s write permissions inherited', (t) => withWorkflow(t, (w) => { if (w.jobs.diagnostic === undefined) return false; delete w.jobs.diagnostic.permissions; })]
    ],
    controls: [['the same permissions written afresh', (t) => withWorkflow(t, (w) => { if (w.jobs.diagnostic === undefined) return false; w.jobs.diagnostic.permissions = JSON.parse('{"contents":"read"}'); })]]
  },
  {
    id: 'D7.e',
    title: 'the diagnostic job uses only actions the release job pins, and uploads an artifact for at most 14 days',
    ask: d7e,
    attacks: [
      ['a release action', (t) => withWorkflow(t, (w) => { if (w.jobs.diagnostic === undefined) return false; w.jobs.diagnostic.steps.push({ uses: 'softprops/action-gh-release@v2', with: { files: 'release/*.dmg' } }); })],
      ['upload-artifact at another pin', (t) => withWorkflow(t, (w) => { const s = w.jobs.diagnostic?.steps?.find((x) => String(x.uses).startsWith('actions/upload-artifact@')); if (s === undefined) return false; s.uses = 'actions/upload-artifact@v4'; })],
      ['an upload kept 90 days', (t) => withWorkflow(t, (w) => { const s = w.jobs.diagnostic?.steps?.find((x) => String(x.uses).startsWith('actions/upload-artifact@')); if (s === undefined) return false; s.with['retention-days'] = 90; })],
      ['no upload', (t) => withWorkflow(t, (w) => { if (w.jobs.diagnostic === undefined) return false; w.jobs.diagnostic.steps = w.jobs.diagnostic.steps.filter((x) => !String(x.uses).startsWith('actions/upload-artifact@')); })]
    ],
    controls: [['the checkout\'s depth changed', (t) => withWorkflow(t, (w) => { const s = w.jobs.diagnostic?.steps?.find((x) => String(x.uses).startsWith('actions/checkout@')); if (s === undefined) return false; s.with = { 'fetch-depth': 1 }; })]]
  },
  {
    id: 'D7.f',
    title: 'nothing in the diagnostic job reaches a release, a tag or a feed, and electron-builder runs only through package.mjs',
    ask: d7f,
    attacks: [
      ['gh release create', (t) => withWorkflow(t, (w) => { if (w.jobs.diagnostic === undefined) return false; w.jobs.diagnostic.steps.push({ run: 'gh release create v0.0.0-diagnostic release/*.dmg' }); })],
      ['electron-builder run itself, publishing', (t) => withWorkflow(t, (w) => { if (w.jobs.diagnostic === undefined) return false; w.jobs.diagnostic.steps.push({ run: 'npx electron-builder --mac --publish always' }); })],
      ['a tag pushed', (t) => withWorkflow(t, (w) => { if (w.jobs.diagnostic === undefined) return false; w.jobs.diagnostic.steps.push({ run: 'git tag v0.0.0-diagnostic && git push --tags' }); })],
      ['the update feed kept', (t) => withWorkflow(t, (w) => { if (w.jobs.diagnostic === undefined) return false; w.jobs.diagnostic.steps.push({ run: 'cp release/latest-mac.yml "$RUNNER_TEMP/tortie-diagnostic/"' }); })],
      ['a blockmap kept', (t) => withWorkflow(t, (w) => { if (w.jobs.diagnostic === undefined) return false; w.jobs.diagnostic.steps.push({ run: 'cp release/*.blockmap "$RUNNER_TEMP/tortie-diagnostic/"' }); })],
      ['a writing token in the environment', (t) => withWorkflow(t, (w) => { if (w.jobs.diagnostic === undefined) return false; w.jobs.diagnostic.env = { ...(w.jobs.diagnostic.env ?? {}), GH_TOKEN: '${{ secrets.GITHUB_TOKEN }}' }; })],
      ['the API called by hand', (t) => withWorkflow(t, (w) => { if (w.jobs.diagnostic === undefined) return false; w.jobs.diagnostic.steps.push({ run: 'curl -X POST https://uploads.github.com/repos/x/y/releases/1/assets' }); })],
      ['the feed re-aligned', (t) => withWorkflow(t, (w) => { if (w.jobs.diagnostic === undefined) return false; w.jobs.diagnostic.steps.push({ run: 'node build/refresh-dmg-feed.mjs "$dmg"' }); })],
      ['a provenance attestation', (t) => withWorkflow(t, (w) => { if (w.jobs.diagnostic === undefined) return false; w.jobs.diagnostic.steps.push({ uses: 'actions/attest-build-provenance@4d101475d8b20a2381f78447822ac1eab6504dd8', with: { 'subject-path': 'release/*.dmg' } }); })]
    ],
    controls: [['a step that only names the DMG', (t) => withWorkflow(t, (w) => { if (w.jobs.diagnostic === undefined) return false; w.jobs.diagnostic.steps.push({ name: 'Say where the DMG is', run: 'ls release/Tortie-*-diagnostic-arm64.dmg' }); })]]
  },
  {
    id: 'D7.g',
    title: 'the diagnostic job builds --variant diagnostic and packs it with --checker and --notarize, after typecheck, test and build',
    ask: d7g,
    attacks: [
      ['the test variant built', (t) => withWorkflow(t, (w) => { const s = w.jobs.diagnostic?.steps?.find((x) => /build-checker\.mjs/.test(String(x.run))); if (s === undefined) return false; s.run = s.run.replace('--variant diagnostic', '--variant test'); })],
      ['an ablation defined', (t) => withWorkflow(t, (w) => { const s = w.jobs.diagnostic?.steps?.find((x) => /build-checker\.mjs/.test(String(x.run))); if (s === undefined) return false; s.run = s.run.replace('--variant diagnostic', '--variant diagnostic --define TCHK_ABLATE_OWNER'); })],
      ['the package before the tests', (t) => withWorkflow(t, (w) => { const st = w.jobs.diagnostic?.steps; const i = st?.findIndex((x) => /build\/diagnostic\/package\.mjs/.test(String(x.run))) ?? -1; const j = st?.findIndex((x) => /^\s*npm test\s*$/m.test(String(x.run))) ?? -1; if (i === -1 || j === -1) return false; const [p] = st.splice(i, 1); st.splice(j, 0, p); })],
      ['a plant variable on the package step', (t) => withWorkflow(t, (w) => { const s = w.jobs.diagnostic?.steps?.find((x) => /build\/diagnostic\/package\.mjs/.test(String(x.run))); if (s === undefined) return false; s.env = { ...(s.env ?? {}), P358ADV_PLANT: 'crash-state' }; })],
      ['the package left unsigned', (t) => withWorkflow(t, (w) => { const s = w.jobs.diagnostic?.steps?.find((x) => /build\/diagnostic\/package\.mjs/.test(String(x.run))); if (s === undefined) return false; s.run = s.run.replace(/--notarize\b/, ''); })]
    ],
    controls: [['the checker step\'s flags in another order', (t) => withWorkflow(t, (w) => { const s = w.jobs.diagnostic?.steps?.find((x) => /build-checker\.mjs/.test(String(x.run))); if (s === undefined) return false; s.run = s.run.replace('--variant diagnostic', '--json "$RUNNER_TEMP/first.json" --variant diagnostic'); })]]
  },
  {
    id: 'D8',
    title: 'a built module: the shipped (diagnostic) one holds no P358ADV, no [p358adv- and no sigaction import; a test one holds all three',
    ask: d8,
    attacks: [
      ['an import renamed to _sigaction in the symbol table', (t) => withModules(t, ['diagnostic', 'prebuild'], (b) => renameInSymbols(b, '_sigaction')), ['diagnostic', 'prebuild']],
      ['an import renamed to _sigaction in dyld\'s bind stream', (t) => withModules(t, ['diagnostic', 'prebuild'], (b) => renameInBinds(b, '_sigaction')), ['diagnostic', 'prebuild']],
      ['a P358ADV_ name in the bytes', (t) => withModules(t, ['diagnostic', 'prebuild'], (b) => appendBytes(b, 'P358ADV_PLANT')), ['diagnostic', 'prebuild']],
      ['a [p358adv- line in the bytes', (t) => withModules(t, ['diagnostic', 'prebuild'], (b) => appendBytes(b, '[p358adv-PLANT] crash-state')), ['diagnostic', 'prebuild']],
      ['the checker\'s variable gone from a diagnostic module', (t) => withModules(t, ['diagnostic'], (b) => replaceBytes(b, 'TORTIE_CHECKER', 'TORTIE_CHECKEX')), ['diagnostic']],
      ['the plant\'s words gone from a test module', (t) => withModules(t, ['test'], (b) => replaceBytes(b, 'P358ADV', 'Q358ADV')), ['test']],
      ['the handler\'s import gone from a test module', (t) => withModules(t, ['test'], (b) => replaceBytes(b, '_sigaction\0', '_sigactioX\0')), ['test']]
    ],
    controls: [['a word that is not the plant\'s', (t) => withModules(t, ['diagnostic', 'prebuild', 'test'], (b) => appendBytes(b, 'Q358ADV_NOT_A_PLANT'))]]
  }
];

/** The clauses, by id, in order: one taken out, or one added without its line here, turns the gate red. */
const CLAUSE_IDS = [
  'D1.a', 'D1.b', 'D1.c', 'D1.d', 'D2.a', 'D2.b', 'D2.c', 'D3.a', 'D3.b', 'D3.c',
  'D4.a', 'D4.b', 'D4.c', 'D4.d', 'D4.e', 'D4.f', 'D5',
  'D6.a', 'D6.b', 'D6.c', 'D6.d', 'D6.e', 'D6.f', 'D6.g', 'D6.h', 'D6.i', 'D6.j',
  'D7.a', 'D7.b', 'D7.c', 'D7.d', 'D7.e', 'D7.f', 'D7.g', 'D8'
];
/** Every attack written, counted. Taking one out lowers this in the same commit, and the body names it. */
// 163, then 165 for D2.a's "the guard inside a try block" and D4.c's "a stream opened to a process" (the probe review, 2026-11-09),
// then 176 for D2.c's eight and D5's three table reads (the fix round: lens B's ablations 2 and 3).
const ATTACK_FLOOR = 176;

// ---------------------------------------------------------------------------
// The readers, proved on fixtures of their own before any rule reads the tree
// ---------------------------------------------------------------------------

const FIXTURES = 'build/diagnostic-fixtures';
/**
 * The pinned prebuild, read by `nm -u` on 2026-11-09 (Phase 364's gate
 * builder, from this worktree's node_modules): 186 undefined symbols. The
 * Mach-O reader must count the same, so it is shown to read what nm reads
 * before it is trusted with a built module. A better-sqlite3 that moves
 * moves this too (D6.a goes red first).
 */
const PREBUILD_SHA = '98e0e8acd01c632fe5615243e1296af0372826f8783b18fc31c506f73c47459c';
const PREBUILD_IMPORTS = 186;

/** The `// @…` marker of every line, or null. */
const markersOf = (text) =>
  text.split('\n').map((line) => {
    const i = line.indexOf('// @');
    return i === -1 ? null : line.slice(i + 3).trim();
  });
/** The 1-based lines whose marker holds `word`. */
const markedLines = (text, word) => new Set(markersOf(text).flatMap((m, i) => (m !== null && new RegExp(`(^|\\s)${word}(\\s|$)`).test(m) ? [i + 1] : [])));
/** The line numbers a list of findings names for one file. */
const linesNamed = (findings, rel) =>
  new Set(findings.flatMap((f) => {
    const m = new RegExp(`^${rel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:(\\d+)`).exec(f);
    return m === null ? [] : [Number(m[1])];
  }));
const sameLines = (name, want, got, what) => {
  const out = [];
  for (const l of want) if (!got.has(l)) out.push(`${name}:${String(l)} is marked ${what} and the reader did not name it`);
  for (const l of got) if (!want.has(l)) out.push(`${name}:${String(l)} was named ${what} and the fixture does not mark it`);
  return out;
};

/** The fixtures, each a reader's own proof. */
function proveReaders() {
  const proofs = [];
  const read = (name) => {
    try {
      return readFileSync(join(ROOT, FIXTURES, name), 'utf8');
    } catch {
      return null;
    }
  };
  {
    const name = 'c-regions.c';
    const text = read(name);
    const problems = [];
    let checked = 0;
    if (text === null) problems.push(`${FIXTURES}/${name} is missing`);
    else {
      const r = readC(text);
      const marks = markersOf(text);
      const byLine = new Map();
      for (const s of cStrings(r.lex.toks)) byLine.set(s.line, [...(byLine.get(s.line) ?? []), s.v]);
      marks.forEach((m, i) => {
        if (m === null) return;
        const ln = i + 1;
        const st = r.status[ln];
        const wantPlant = /@plant\b/.test(m) ? 'plant' : /@diag\b/.test(m) ? 'diag' : /@both\b/.test(m) ? 'both' : null;
        const wantDiag = /@in\b/.test(m) ? true : /@out\b/.test(m) ? false : null;
        if (wantPlant !== null && st.plant !== wantPlant) problems.push(`${name}:${String(ln)} reads ${st.plant}, marked ${wantPlant}`);
        if (wantDiag !== null && st.diag !== wantDiag) problems.push(`${name}:${String(ln)} reads ${st.diag ? 'in' : 'out of'} the diagnostic variant, marked ${wantDiag ? 'in' : 'out'}`);
        const sm = /@str:(.*)$/.exec(m);
        const got = byLine.get(ln) ?? [];
        if (sm !== null && (got.length !== 1 || got[0] !== sm[1])) problems.push(`${name}:${String(ln)} holds the string(s) ${JSON.stringify(got)}, marked ${JSON.stringify(sm[1])}`);
        checked += 1;
      });
      for (const [ln, vs] of byLine) {
        const m = marks[ln - 1];
        if (m === null || !/@str:/.test(m)) problems.push(`${name}:${String(ln)}: the lexer read ${JSON.stringify(vs)} where the fixture holds no string`);
      }
    }
    proofs.push({ name, problems, checked });
  }
  {
    const name = 'c-walk.c';
    const text = read(name);
    const problems = [];
    let checked = 0;
    if (text === null) problems.push(`${FIXTURES}/${name} is missing`);
    else {
      const r = readC(text);
      const fns = r.diagFns.filter((f) => f.name !== 'tchkReadable' && f.name !== 'tchkRegionAt');
      const got = new Set(walkFindings(r.diagCode, fns).map((x) => x.line));
      const want = markedLines(text, '@unchecked');
      problems.push(...sameLines(name, want, got, 'unchecked'));
      checked = fns.length;
    }
    proofs.push({ name, problems, checked });
  }
  {
    const name = 'ts-flag.ts';
    const text = read(name);
    const rel = 'src/main/diagnostic-fixture/ts-flag.ts';
    const problems = [];
    if (text === null) problems.push(`${FIXTURES}/${name} is missing`);
    else {
      const fixture = { text: new Map([[rel, text]]), src: [rel] };
      const got = linesNamed([...d2a(fixture), ...d2b(fixture)], rel);
      problems.push(...sameLines(name, markedLines(text, '@red'), got, 'red'));
    }
    proofs.push({ name, problems, checked: text === null ? 0 : markedLines(text, '@red').size });
  }
  {
    const name = 'ts-inert.ts';
    const text = read(name);
    const rel = 'src/main/diagnostic-build/ts-inert.ts';
    const problems = [];
    if (text === null) problems.push(`${FIXTURES}/${name} is missing`);
    else {
      const sf = sfOf(rel, text);
      const got = new Set(sf.statements.filter((st) => runsAtImport(st) !== null).map((st) => lineOf(st)));
      problems.push(...sameLines(name, markedLines(text, '@red'), got, 'red'));
    }
    proofs.push({ name, problems, checked: text === null ? 0 : markedLines(text, '@red').size });
  }
  {
    const name = PREBUILD;
    const problems = [];
    let bytes = null;
    try {
      bytes = readFileSync(join(ROOT, PREBUILD));
    } catch {
      problems.push(`${PREBUILD} cannot be read, so the Mach-O reader cannot be shown to read what nm reads`);
    }
    if (bytes !== null) {
      const sha = sha256(bytes);
      if (sha !== PREBUILD_SHA) {
        problems.push(`${PREBUILD} hashes to ${sha}, not the prebuild nm was read on (${PREBUILD_SHA}); re-read \`nm -u\` and re-pin PREBUILD_IMPORTS`);
      } else {
        try {
          const m = readMachO(bytes);
          if (m.symtab.length !== PREBUILD_IMPORTS) problems.push(`the reader finds ${String(m.symtab.length)} undefined symbols in ${PREBUILD}; nm -u found ${String(PREBUILD_IMPORTS)}`);
          const names = new Set(m.symtab);
          const stray = m.bind.filter((n) => !names.has(n));
          if (m.bind.length === 0) problems.push(`the reader finds no bind in ${PREBUILD}'s dyld info`);
          if (stray.length > 0) problems.push(`the bind stream names ${stray.slice(0, 3).join(', ')}, which the symbol table does not import`);
          const r = readModule(bytes);
          if (r.sigaction || PLANT_STRINGS.some((w) => r.plant[w] > 0)) problems.push(`${PREBUILD} reads as holding the plant, which the shipped prebuild cannot`);
          if (CHECKER_MARKS.some((w) => r.marks[w])) problems.push(`${PREBUILD} reads as a checking build, which it is not`);
        } catch (err) {
          problems.push(`the Mach-O reader fails on ${PREBUILD}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }
    proofs.push({ name, problems, checked: PREBUILD_IMPORTS });
  }
  return proofs;
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

function main() {
  if (opts.list) {
    for (const c of CLAUSES) process.stdout.write(`${c.id.padEnd(5)} ${c.title} (${String(c.attacks.length)} attacks, ${String(c.controls.length)} controls)\n`);
    process.stdout.write(`${String(CLAUSES.length)} clauses, ${String(CLAUSES.reduce((n, c) => n + c.attacks.length, 0))} attacks written, floor ${String(ATTACK_FLOOR)}\n`);
    return 0;
  }
  if (opts.printImports !== null) {
    let m;
    try {
      m = readMachO(readFileSync(opts.printImports));
    } catch (err) {
      process.stderr.write(`${TAG} ${opts.printImports}: ${err instanceof Error ? err.message : String(err)}\n`);
      return 2;
    }
    for (const name of [...new Set([...m.symtab, ...m.chained])].sort()) process.stdout.write(`${name}\n`);
    process.stderr.write(`${TAG} ${String(m.symtab.length)} undefined symbols, ${String(m.bind.length)} binds, ${String(m.chained.length)} chained imports\n`);
    return 0;
  }
  const tree = loadTree();
  if (opts.printReleasePin) {
    const { wf, error } = workflowOf(tree);
    if (wf === null) {
      process.stderr.write(`${TAG} ${error}\n`);
      return 2;
    }
    process.stdout.write(`${releasePinOf(wf)}\n`);
    return 0;
  }
  tree.nodes = [];
  for (const path of opts.nodes) {
    let bytes;
    try {
      bytes = readFileSync(path);
    } catch (err) {
      process.stderr.write(`${TAG} --node ${path} cannot be read: ${err instanceof Error ? err.message : String(err)}\n`);
      return 2;
    }
    const v = variantOf(path);
    tree.nodes.push({ label: path, bytes, variant: v.variant, why: v.why });
  }
  if (tree.nodes.length === 0) {
    try {
      tree.nodes.push({ label: PREBUILD, bytes: readFileSync(join(ROOT, PREBUILD)), variant: 'prebuild', why: 'no --node given: the shipped prebuild stands in, held to what ships' });
    } catch {
      /* the reader proof names it */
    }
  }

  const problems = [];
  say(`reading ${ROOT}`);
  {
    const ids = CLAUSES.map((c) => c.id).join(' ');
    if (ids !== CLAUSE_IDS.join(' ')) problems.push(`the gate asks ${ids}; it asks ${CLAUSE_IDS.join(' ')}, so a clause was taken out or added without its line in CLAUSE_IDS`);
    for (const c of CLAUSES) {
      if (c.attacks.length === 0 || c.controls.length === 0) problems.push(`${c.id} carries ${String(c.attacks.length)} attacks and ${String(c.controls.length)} controls; at least one of each, or it has never been shown to fail and to pass`);
    }
    const written = CLAUSES.reduce((n, c) => n + c.attacks.length, 0);
    if (written < ATTACK_FLOOR) problems.push(`the gate writes ${String(written)} attacks against a floor of ${String(ATTACK_FLOOR)}; an attack taken out lowers the floor in the same commit and the body names it`);
  }
  const proofs = proveReaders();
  for (const p of proofs) {
    if (p.problems.length === 0) say(`ok    reader   ${p.name}: ${String(p.checked)} marked readings agree`);
    else {
      say(`RED   reader   ${p.name}`);
      for (const x of p.problems) problems.push(`reader ${x}`);
    }
  }

  let attacksRed = 0;
  let controlsGreen = 0;
  let notApplicable = 0;
  let green = 0;
  for (const c of CLAUSES) {
    const found = c.ask(tree);
    if (found.length > 0) {
      say(`RED   ${c.id.padEnd(5)} ${c.title}`);
      for (const f of found.slice(0, 12)) say(`        ${f}`);
      if (found.length > 12) say(`        … and ${String(found.length - 12)} more`);
      problems.push(`${c.id}: ${found.length} finding${found.length === 1 ? '' : 's'}, the first: ${found[0]}`);
      say(`        (its ${String(c.attacks.length)} attacks and ${String(c.controls.length)} controls are asked once the clause is green over the tree)`);
      continue;
    }
    green += 1;
    let red = 0;
    let na = 0;
    let kept = 0;
    const applies = (needs) =>
      needs === undefined || (typeof needs === 'function' ? needs(tree) : tree.nodes.some((m) => needs.includes(m.variant)));
    for (const [name, build, needs] of c.attacks) {
      if (!applies(needs)) {
        na += 1;
        continue;
      }
      const broken = build(tree);
      if (broken === null) {
        problems.push(`${c.id} attack "${name}" could not be built over this tree, so the clause was not shown to fail that way`);
        say(`RED   ${c.id.padEnd(5)} attack "${name}" could not be built`);
        continue;
      }
      const f = c.ask(broken);
      if (f.length === 0) {
        problems.push(`${c.id} attack "${name}" read GREEN over a copy with the rule broken, so the clause has stopped asking`);
        say(`RED   ${c.id.padEnd(5)} attack "${name}" stayed green`);
        continue;
      }
      red += 1;
      if (opts.verbose) say(`        attack "${name}": ${f[0]}`);
    }
    for (const [name, build, needs] of c.controls) {
      if (!applies(needs)) {
        na += 1;
        continue;
      }
      const same = build(tree);
      if (same === null) {
        problems.push(`${c.id} control "${name}" could not be built over this tree`);
        say(`RED   ${c.id.padEnd(5)} control "${name}" could not be built`);
        continue;
      }
      const f = c.ask(same);
      if (f.length > 0) {
        problems.push(`${c.id} control "${name}" read RED (${f[0]}), so the clause refuses a change that keeps its promise`);
        say(`RED   ${c.id.padEnd(5)} control "${name}" read red: ${f[0]}`);
        continue;
      }
      kept += 1;
      if (opts.verbose) say(`        control "${name}": green`);
    }
    attacksRed += red;
    controlsGreen += kept;
    notApplicable += na;
    say(`ok    ${c.id.padEnd(5)} ${c.title} (${String(red)} attack${red === 1 ? '' : 's'} red, ${String(kept)} control${kept === 1 ? '' : 's'} green${na > 0 ? `, ${String(na)} not applicable to this tree` : ''})`);
    if (typeof c.note === 'function') say(`        ${c.note(tree)}`);
  }
  for (const m of tree.nodes) say(`D8 read ${m.label}: ${m.variant}, ${m.why}`);
  if (opts.nodes.length === 0) say('D8 was asked of the shipped prebuild alone; pass --node with each built module to hold it to its variant');

  const ms = Date.now() - t0;
  if (problems.length > 0) {
    for (const p of problems) process.stderr.write(`${TAG} ${p}\n`);
    process.stderr.write(`${TAG} FAILED: ${String(problems.length)} problem${problems.length === 1 ? '' : 's'}; ${String(green)} of ${String(CLAUSES.length)} clauses green (${String(ms)} ms).\n`);
    return 1;
  }
  say(
    `PASS: ${String(CLAUSES.length)} clauses green over the tree, ${String(attacksRed)} attacks each red on its own clause, ` +
      `${String(controlsGreen)} controls green, ${String(proofs.length)} readers proved on their fixtures` +
      `${notApplicable > 0 ? `, ${String(notApplicable)} attacks or controls not applicable to this tree` : ''} (${String(ms)} ms).`
  );
  return 0;
}

process.exitCode = main();


