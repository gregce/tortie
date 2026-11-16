#!/usr/bin/env node
/**
 * `npm run conformance:terminal`. PHASE 368, ISSUE 44: A LONG AGENT REPLY DRAWS
 * CLEANLY, A COPY HOLDS WHAT WAS DRAWN, AND AN AGENT'S LINKS OPEN.
 *
 * About a second. It launches no Electron, starts no tmux server, spawns
 * NOTHING, makes no request, spends no token and reads nothing under the
 * person's home. It reads this repository's own source with the TypeScript
 * parser, which is a module and not a process, and asserts over it.
 *
 * ## What this gate is for, and what it is deliberately not
 *
 * Issue 44 had three causes Tortie owns (research 145 §1, build/p368/SPEC.md
 * §1): every attach spawned its client at 80 by 24 and every session was made
 * at 80 by 24, so a program drawing a long reply was told a size it was not
 * shown at; the terminal counted 9,498 code points one cell wide that tmux
 * draws two wide, every emoji among them; and a copy carried cells nobody could
 * see, while tmux stripped every link before the terminal saw it. The phase
 * fixes each where it starts. Every one of those fixes is a line a later round
 * can delete in a tidy-up with every test it also edits still green, and the
 * defect comes back silently, so this gate holds the STRUCTURE:
 *
 *   T1  the attach carries a size: `sessions:attach` names it, the preload
 *       forwards it, main hands it to `attachSession`, and every
 *       `attachHost.attach({` spreads cols and rows from `attachSizeFor(`, fed
 *       by that request's size on every path into it; the pane attaches with
 *       its id AND its size, and (the fix round) that size is only ever
 *       `settleForAttach(`'s answer, which puts the terminal at the size it is
 *       handed and answers the terminal's own: a client spawned beside a
 *       terminal at another size (a pane mounted while the work area was
 *       hidden) left 34 of 39 rows garbled
 *   T2  the create carries a size: both `new-session` lines (this Mac's in
 *       `createSession`, another machine's in `remoteCreateArgs`) push `-x`
 *       and `-y` from `sanitizeTerminalSize(` of the request's size; the four
 *       production creates (create-local.ts twice, restore.ts, `remoteCreate`,
 *       remote-restore.ts) hand a size on; and create-local.ts and the core's
 *       two restores decide it from the request's own size, read through
 *       `sanitizeTerminalSize(`
 *   T3  one width provider from the shared tables on all three terminals: one
 *       `charProperties` under src/renderer, in tmux-widths.ts, importing
 *       `@shared/cell-widths` and `@shared/cells` and asking `nextCell`;
 *       registered and made active there alone; every `new Terminal(` made
 *       with `allowProposedApi: true` and handed to `registerTmuxWidths(`
 *       with its session row's `cellWidths`, which the core sets from
 *       `localCellWidths()`, chosen by `cellWidthsForServer(`, once, and only
 *       in the branch for rows on this Mac (D7, the fix round); `nextCell`
 *       declared once, in src/shared/cells.ts, and `clusterCells` asks it;
 *       src/main/screen/{cells,cell-widths}.ts absent; no
 *       `@xterm/addon-unicode*` in package.json or anywhere under src/
 *   T4  Copy bounded by the width: `drawnSelectionText` declared once, reading
 *       rows to the terminal's `cols` and ending each line at its last
 *       non-blank cell, and called by `snapshotSelection`, `copySelection` and
 *       `copySelectionAsHtml`; no `.getSelection()` call in capture/index.ts;
 *       serialize.ts' row end names `term.cols`; `composeText` trims a line's
 *       trailing spaces; the Edit menu's Copy routed (`routePaneCopy(`, which
 *       listens for `copy` and calls `copySelection`) from TerminalPane.tsx;
 *       and (the fix round, item 7 taken back out) drag-select.ts never reads
 *       xterm's own selection (`getSelectionPosition(`) and its selection
 *       change handler releases and holds nothing, so only a drag that
 *       scrolled is composed through `-J`
 *   T5  the link handler's routes, one per kind: the pane's Terminal options
 *       name `linkHandler`; the links call `window.open(` ONCE, in
 *       pane-link-handler.ts, with `'_blank'` and `'noopener,noreferrer'` and
 *       an address `openedAddress(` answered; nothing there names `shell`,
 *       `location`, `fetch`, `XMLHttpRequest` or `openExternal`; link-rules.ts
 *       parses with `new URL(` and checks `protocol` against http and https,
 *       `username`, `password` and 2,048; and (the fix round) the one other
 *       route is ONE `.activate(` of the path link `pathFor(` hands, which is
 *       only ever `pathUnder(`'s answer after `pathMayDecide(`, and the hover
 *       line is drawn by one `hoverText(` of the address `showLine` is handed,
 *       which is only ever `openedAddress(`'s answer or null (D16). The cut
 *       rule's behaviour (the whole continuation, never a prefix) is driven in
 *       src/renderer/terminal/links/__tests__/p368-link-rules.test.ts
 *   T6  never `allowNonHttpProtocols`, anywhere under src/ outside tests
 *   T7  `-T hyperlinks` on the local attach argv; the far argv carries it only
 *       behind `.hyperlinks`, which only `farAttachHyperlinks(` decides (or a
 *       literal `false`); that decider reads the pair (`farPairOf`), its
 *       server AND its program; `HYPERLINK_FAR_VERSIONS` holds no version
 *       below 3.4
 *   T8  never `FORCE_HYPERLINK`, anywhere under src/ outside tests or in the
 *       private server's configuration, resources/gmux-tmux.conf
 *   T9  the frame re-freeze is this Mac's alone: `synchronized_output_flag` is
 *       named in scroll.ts and nowhere else under src/, and read only where
 *       `isThisMacsRunner(` holds; `refresh-from-pane` is sent by `refreeze`
 *       alone, and every `refreeze(` call is where that runner holds too
 *
 * THE BEHAVIOUR IS DRIVEN ELSEWHERE, ON PURPOSE. The sizes, the widths, the
 * copies, the link rules and the frames are driven in the p368 vitest files
 * beside each module and in `probe:p368` over recorded agent bytes in the real
 * app. This gate is the half that no green test can keep in place, because a
 * round can change a rule and its test in one edit.
 *
 * ## How it reads, and why a comment never counts
 *
 * Every rule reads the parse tree: node kinds, identifiers, literal values,
 * which function a call sits in and which branch a read sits under. Comments
 * are trivia to the parser, so a comment that names `FORCE_HYPERLINK`, or a
 * `getSelection()` left in prose, neither satisfies nor breaks a rule; each
 * rule's controls plant exactly that and must stay green. Where a rule asks
 * where a value COMES from (T1, T2, T5, T7) it follows local constants and the
 * parameters of named functions in the same file to every caller, so an
 * argument dropped at one call site is red however the code is laid out. Where
 * it asks whether a read is GUARDED (T7, T9) it accepts the then-branch of an
 * `if`, the true arm of a `?:`, the right of an `&&`, an earlier
 * `if (!guard) return;`, a constant that is only read under the guard, and a
 * function whose every production call is under it.
 *
 * ## Every rule carries its own attack, and its own control
 *
 * Each rule is asked once over the tree. Then it is asked again over in-memory
 * copies of the tree with that rule broken one way at a time, its ABLATIONS,
 * and every one of them must read red on the rule that owns it. Then over
 * copies changed in a way that does NOT break it, its CONTROLS (the needle in
 * a comment, in a test, a near miss), and every one of them must read green,
 * or the rule is answering any edit rather than the defect. An ablation or a
 * control this gate cannot build over the tree is itself a finding: the rule
 * was not shown to fail, or not shown to be fair.
 *
 *   node build/conformance-terminal.mjs                this repository
 *   node build/conformance-terminal.mjs --root <dir>   another checkout (the
 *                                                       parent reads red)
 *   node build/conformance-terminal.mjs --verbose      and print what each
 *                                                       ablation found
 *
 * Exit 0 when every rule holds and every ablation and control reads as it
 * must, 1 on a finding, 2 on a usage error.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, posix, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const TAG = '[conformance:terminal]';
const HERE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const say = (line) => process.stdout.write(`${TAG} ${line}\n`);

/**
 * The one way this gate exits: conformance-pocket.mjs's helper, byte for byte
 * as `gate:checks` clause 9 pins it, so a report read through a pipe is never
 * cut short by the exit.
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

let ROOT = HERE;
let VERBOSE = false;
{
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === '--verbose') {
      VERBOSE = true;
      continue;
    }
    if (args[i] === '--root') {
      const dir = args[i + 1] ?? '';
      if (dir === '' || !existsSync(join(resolve(dir), 'src'))) {
        process.stderr.write(`${TAG} --root needs a checkout that holds src/\n`);
        await exitWhenWritten(2);
      }
      ROOT = resolve(dir);
      i += 1;
      continue;
    }
    process.stderr.write(`${TAG} unknown argument ${args[i]}; the options are --root <dir> and --verbose\n`);
    await exitWhenWritten(2);
  }
}

// ---------------------------------------------------------------------------
// The files the rules read
// ---------------------------------------------------------------------------

const F = Object.freeze({
  base: 'src/shared/ipc/base.ts',
  preload: 'src/preload/sessions.ts',
  ipc: 'src/main/ipc.ts',
  core: 'src/main/sessions/core.ts',
  pane: 'src/renderer/terminal/TerminalPane.tsx',
  tabSize: 'src/renderer/terminal/tab-size.ts',
  tmuxSessions: 'src/main/tmux/sessions.ts',
  remoteSessions: 'src/main/machines/remote-sessions.ts',
  createLocal: 'src/main/sessions/create-local.ts',
  restore: 'src/main/restore/restore.ts',
  remoteRestore: 'src/main/machines/remote-restore.ts',
  widths: 'src/renderer/terminal/tmux-widths.ts',
  historyCopy: 'src/renderer/terminal/capture/history-copy.ts',
  capture: 'src/renderer/terminal/capture/index.ts',
  serialize: 'src/renderer/terminal/capture/serialize.ts',
  drawn: 'src/renderer/terminal/capture/drawn-text.ts',
  dragSelect: 'src/renderer/terminal/scroll/drag-select.ts',
  sharedCells: 'src/shared/cells.ts',
  sharedWidths: 'src/shared/cell-widths.ts',
  oldCells: 'src/main/screen/cells.ts',
  oldWidths: 'src/main/screen/cell-widths.ts',
  pkg: 'package.json',
  linksDir: 'src/renderer/terminal/links/',
  handler: 'src/renderer/terminal/links/pane-link-handler.ts',
  rules: 'src/renderer/terminal/links/link-rules.ts',
  plan: 'src/main/attach/attach-plan.ts',
  gate: 'src/main/attach/hyperlinks-gate.ts',
  host: 'src/main/attach/attach-host.ts',
  registry: 'src/main/agents/registry.ts',
  conf: 'resources/gmux-tmux.conf',
  scroll: 'src/main/tmux/scroll.ts',
  scrollShapes: 'src/main/machines/scroll-shapes.ts',
  supervisor: 'src/main/tmux/supervisor.ts',
  version: 'src/main/tmux/version.ts'
});

/** The three terminals the renderer builds (SPEC §4.2). */
const TERMINAL_FILES = [F.pane, F.historyCopy, F.capture];
/** The words T5 refuses in the links folder: every way to a browser but main's gate. */
const REFUSED_ROUTES = ['shell', 'location', 'fetch', 'XMLHttpRequest', 'openExternal'];
const IPC_ATTACH = 'sessions:attach';

// ---------------------------------------------------------------------------
// The tree: the files on disk, and in-memory copies with some files changed
// ---------------------------------------------------------------------------

const TS_FILE = /\.(?:ts|tsx|mts|cts|js|jsx|mjs|cjs)$/;
const BINARY_FILE = /\.(?:png|jpg|jpeg|gif|ico|icns|woff2?|ttf|otf|wasm|node|pdf|zip|gz)$/i;
const isTestPath = (rel) =>
  rel.includes('/__tests__/') || rel.startsWith('src/test/') || /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(rel);
const isTextFile = (rel) => !BINARY_FILE.test(rel);
const isProductionCode = (rel) => TS_FILE.test(rel) && !isTestPath(rel);

const disk = new Map();
function diskText(rel) {
  if (!disk.has(rel)) {
    let text = null;
    try {
      text = readFileSync(join(ROOT, rel), 'utf8');
    } catch {
      text = null;
    }
    disk.set(rel, text);
  }
  return disk.get(rel);
}

let srcListing = null;
/** Every file under src/, by its path from the root. */
function listSrc() {
  if (srcListing !== null) return srcListing;
  const out = [];
  const walk = (dir) => {
    let entries = [];
    try {
      entries = readdirSync(join(ROOT, dir), { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (e.name === 'node_modules' || e.name === '.DS_Store') continue;
      const rel = `${dir}/${e.name}`;
      if (e.isDirectory()) walk(rel);
      else if (e.isFile()) out.push(rel);
    }
  };
  walk('src');
  srcListing = out.sort();
  return srcListing;
}

/** The tree on disk, or a copy of it with some files replaced, added or removed (null). */
class Tree {
  constructor(overrides = new Map()) {
    this.overrides = overrides;
  }
  text(rel) {
    return this.overrides.has(rel) ? this.overrides.get(rel) : diskText(rel);
  }
  has(rel) {
    return this.text(rel) !== null;
  }
  with(rel, text) {
    const next = new Map(this.overrides);
    next.set(rel, text);
    return new Tree(next);
  }
  /** Every file under `prefix` in this copy. */
  files(prefix) {
    const set = new Set(listSrc().filter((rel) => rel.startsWith(prefix)));
    for (const [rel, text] of this.overrides) {
      if (!rel.startsWith(prefix)) continue;
      if (text === null) set.delete(rel);
      else set.add(rel);
    }
    return [...set].sort();
  }
}

const needleOnDisk = new Map();
/** Every file under src/ in this copy whose text holds `needle` at all; a filter, never a verdict. */
function srcFilesNaming(tree, needle) {
  if (!needleOnDisk.has(needle)) {
    needleOnDisk.set(
      needle,
      listSrc().filter((rel) => isTextFile(rel) && (diskText(rel) ?? '').includes(needle))
    );
  }
  const set = new Set(needleOnDisk.get(needle));
  for (const [rel, text] of tree.overrides) {
    if (!rel.startsWith('src/')) continue;
    if (text !== null && isTextFile(rel) && text.includes(needle)) set.add(rel);
    else set.delete(rel);
  }
  return [...set].sort();
}

const parsedByText = new Map();
const scriptKind = (rel) =>
  rel.endsWith('.tsx')
    ? ts.ScriptKind.TSX
    : rel.endsWith('.jsx')
      ? ts.ScriptKind.JSX
      : /\.[cm]?js$/.test(rel)
        ? ts.ScriptKind.JS
        : ts.ScriptKind.TS;

/** The file parsed, or null when this copy does not hold it. */
function sourceOf(tree, rel) {
  const text = tree.text(rel);
  if (text === null) return null;
  let byText = parsedByText.get(rel);
  if (byText === undefined) {
    byText = new Map();
    parsedByText.set(rel, byText);
  }
  let sf = byText.get(text);
  if (sf === undefined) {
    sf = ts.createSourceFile(rel, text, ts.ScriptTarget.Latest, true, scriptKind(rel));
    byText.set(text, sf);
  }
  return sf;
}

// ---------------------------------------------------------------------------
// Reading the parse tree
// ---------------------------------------------------------------------------

const K = ts.SyntaxKind;
const nodeLists = new WeakMap();
/** Every node under `root`, depth first, the root included. */
function nodesUnder(root) {
  let list = nodeLists.get(root);
  if (list === undefined) {
    list = [];
    const visit = (n) => {
      list.push(n);
      ts.forEachChild(n, visit);
    };
    visit(root);
    nodeLists.set(root, list);
  }
  return list;
}

/** `file:line` of a node, for a finding a person can open. */
function at(node) {
  const sf = node.getSourceFile();
  return `${sf.fileName}:${String(sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1)}`;
}

/** `(x)`, `x as T`, `x!`, `x satisfies T` and `<T>x`, peeled to `x`. */
function peel(e) {
  let x = e;
  while (
    x !== undefined &&
    (ts.isParenthesizedExpression(x) ||
      ts.isAsExpression(x) ||
      ts.isNonNullExpression(x) ||
      ts.isSatisfiesExpression(x) ||
      ts.isTypeAssertionExpression(x))
  ) {
    x = x.expression;
  }
  return x;
}

/** `peel`, and `Object.freeze(x)` and `new Set(x)` peeled to `x` as well. */
function peelValue(e) {
  let x = peel(e);
  for (;;) {
    if (x !== undefined && ts.isCallExpression(x) && pathOf(x.expression) === 'Object.freeze' && x.arguments.length === 1) {
      x = peel(x.arguments[0]);
      continue;
    }
    if (x !== undefined && ts.isNewExpression(x) && pathOf(x.expression) === 'Set' && x.arguments?.length === 1) {
      x = peel(x.arguments[0]);
      continue;
    }
    return x;
  }
}

/** `a.b.c` for a chain of names on an identifier or `this`, else null. */
function pathOf(e) {
  const x = peel(e);
  if (x === undefined) return null;
  if (ts.isIdentifier(x)) return x.text;
  if (x.kind === K.ThisKeyword) return 'this';
  if (ts.isPropertyAccessExpression(x)) {
    const left = pathOf(x.expression);
    return left === null ? null : `${left}.${x.name.text}`;
  }
  return null;
}

/** The names of a member chain read from its right end: `a.unicode.register` is ['register', 'unicode', 'a']. */
function tailNames(e) {
  const out = [];
  let x = peel(e);
  while (x !== undefined && ts.isPropertyAccessExpression(x)) {
    out.push(x.name.text);
    x = peel(x.expression);
  }
  if (x !== undefined && ts.isIdentifier(x)) out.push(x.text);
  return out;
}

const calleeName = (call) => {
  const c = peel(call.expression);
  if (ts.isIdentifier(c)) return c.text;
  if (ts.isPropertyAccessExpression(c)) return c.name.text;
  return null;
};
const calleePath = (call) => pathOf(call.expression);
const isCall = (n, name) => ts.isCallExpression(n) && calleeName(n) === name;
const stringOf = (n) => (n !== undefined && ts.isStringLiteralLike(n) ? n.text : null);
const isNullish = (n) => {
  const x = peel(n);
  return (
    x === undefined ||
    x.kind === K.NullKeyword ||
    (ts.isIdentifier(x) && x.text === 'undefined') ||
    ts.isVoidExpression(x)
  );
};

const isFunctionLike = (n) =>
  ts.isFunctionDeclaration(n) ||
  ts.isMethodDeclaration(n) ||
  ts.isArrowFunction(n) ||
  ts.isFunctionExpression(n) ||
  ts.isConstructorDeclaration(n) ||
  ts.isGetAccessorDeclaration(n) ||
  ts.isSetAccessorDeclaration(n);

/** The name a function is called by in its file: its own, or the const or class field holding it. */
function nameOfFunction(fn) {
  if ((ts.isFunctionDeclaration(fn) || ts.isMethodDeclaration(fn)) && fn.name !== undefined) {
    return ts.isIdentifier(fn.name) || ts.isStringLiteral(fn.name) ? fn.name.text : null;
  }
  if ((ts.isArrowFunction(fn) || ts.isFunctionExpression(fn)) && fn.parent !== undefined) {
    const p = fn.parent;
    if ((ts.isVariableDeclaration(p) || ts.isPropertyDeclaration(p)) && p.initializer === fn && ts.isIdentifier(p.name)) {
      return p.name.text;
    }
  }
  return null;
}

const functionTables = new WeakMap();
/** Every function a file gives `name` to: declarations, methods, and consts holding an arrow. */
function functionsNamed(sf, name) {
  let table = functionTables.get(sf);
  if (table === undefined) {
    table = new Map();
    for (const n of nodesUnder(sf)) {
      if (!isFunctionLike(n)) continue;
      const own = nameOfFunction(n);
      if (own === null) continue;
      if (!table.has(own)) table.set(own, []);
      table.get(own).push(n);
    }
    functionTables.set(sf, table);
  }
  return table.get(name) ?? [];
}

function enclosingFunction(node) {
  for (let p = node.parent; p !== undefined; p = p.parent) if (isFunctionLike(p)) return p;
  return null;
}

/** The nearest function around a node that has a name, skipping anonymous arrows. */
function namedEnclosing(node) {
  for (let p = node.parent; p !== undefined; p = p.parent) {
    if (isFunctionLike(p) && nameOfFunction(p) !== null) return p;
  }
  return null;
}

/** Calls of `name` (bare or as a member) under a node. */
const callsUnder = (root, name) => nodesUnder(root).filter((n) => isCall(n, name));

/** Whether a node sits inside a type annotation, where a name is not a value. */
function isInType(n) {
  for (let p = n.parent; p !== undefined; p = p.parent) {
    if (ts.isTypeNode(p)) return true;
    if (ts.isSourceFile(p)) return false;
  }
  return false;
}

/** An identifier that names a binding or a key rather than reading a value. */
function isDeclarationName(id) {
  const p = id.parent;
  if (p === undefined) return false;
  if (
    (ts.isVariableDeclaration(p) ||
      ts.isParameter(p) ||
      ts.isFunctionDeclaration(p) ||
      ts.isFunctionExpression(p) ||
      ts.isClassDeclaration(p) ||
      ts.isMethodDeclaration(p) ||
      ts.isPropertyDeclaration(p) ||
      ts.isPropertySignature(p) ||
      ts.isMethodSignature(p) ||
      ts.isPropertyAssignment(p) ||
      ts.isGetAccessorDeclaration(p) ||
      ts.isSetAccessorDeclaration(p) ||
      ts.isEnumMember(p) ||
      ts.isInterfaceDeclaration(p) ||
      ts.isTypeAliasDeclaration(p)) &&
    p.name === id
  ) {
    return true;
  }
  if (ts.isBindingElement(p) && (p.name === id || p.propertyName === id)) return true;
  if (ts.isPropertyAccessExpression(p) && p.name === id) return true;
  if (ts.isImportSpecifier(p) || ts.isExportSpecifier(p) || ts.isImportClause(p) || ts.isNamespaceImport(p)) return true;
  if (ts.isQualifiedName(p)) return true;
  return false;
}

/** The identifiers an expression reads as values: no keys, no member names, no types. */
function valueIdentifiers(expr) {
  const out = [];
  const visit = (n) => {
    if (ts.isTypeNode(n)) return;
    if (ts.isIdentifier(n)) {
      if (!isDeclarationName(n)) out.push(n);
      return;
    }
    ts.forEachChild(n, visit);
  };
  visit(expr);
  return out;
}

const hasStatements = (n) =>
  ts.isBlock(n) || ts.isSourceFile(n) || ts.isModuleBlock(n) || ts.isCaseClause(n) || ts.isDefaultClause(n);

/** What an identifier names where it is read: a parameter, a variable, a function, an import, or nothing local. */
function resolveLocal(id) {
  const name = id.text;
  for (let n = id.parent; n !== undefined; n = n.parent) {
    if (isFunctionLike(n)) {
      for (let i = 0; i < n.parameters.length; i += 1) {
        const p = n.parameters[i];
        if (ts.isIdentifier(p.name) && p.name.text === name) return { kind: 'param', fn: n, index: i };
      }
    }
    if ((ts.isForOfStatement(n) || ts.isForInStatement(n) || ts.isForStatement(n)) && n.initializer !== undefined && ts.isVariableDeclarationList(n.initializer)) {
      for (const d of n.initializer.declarations) {
        if (ts.isIdentifier(d.name) && d.name.text === name) return { kind: 'var', decl: d };
      }
    }
    if (ts.isCatchClause(n) && n.variableDeclaration !== undefined && ts.isIdentifier(n.variableDeclaration.name) && n.variableDeclaration.name.text === name) {
      return { kind: 'var', decl: n.variableDeclaration };
    }
    if (hasStatements(n)) {
      for (const s of n.statements) {
        if (ts.isVariableStatement(s)) {
          for (const d of s.declarationList.declarations) {
            if (ts.isIdentifier(d.name) && d.name.text === name) return { kind: 'var', decl: d };
            if (!ts.isIdentifier(d.name) && nodesUnder(d.name).some((b) => ts.isBindingElement(b) && ts.isIdentifier(b.name) && b.name.text === name)) {
              return { kind: 'binding', decl: d };
            }
          }
        } else if (ts.isFunctionDeclaration(s) && s.name?.text === name) {
          return { kind: 'fn', decl: s };
        } else if (ts.isClassDeclaration(s) && s.name?.text === name) {
          return { kind: 'class', decl: s };
        } else if (ts.isImportDeclaration(s) && s.importClause !== undefined) {
          const c = s.importClause;
          if (c.name?.text === name) return { kind: 'import', decl: s };
          const b = c.namedBindings;
          if (b !== undefined && ts.isNamespaceImport(b) && b.name.text === name) return { kind: 'import', decl: s };
          if (b !== undefined && ts.isNamedImports(b) && b.elements.some((e) => e.name.text === name)) {
            return { kind: 'import', decl: s };
          }
        }
      }
    }
  }
  return null;
}

const isConst = (decl) =>
  ts.isVariableDeclarationList(decl.parent) && (decl.parent.flags & ts.NodeFlags.Const) !== 0;

/**
 * Whether the value of `expr` comes from a source `src` accepts: a node it
 * accepts (`src.node`), a call it accepts (`src.call`), or a parameter it
 * accepts (`src.param(name, index)`),
 * through local constants and variables, the returns of functions declared in
 * the same file, and, for a parameter of a named function, EVERY call of that
 * function in the file. One identifier carrying the source is enough; a
 * parameter needs every caller.
 */
function tracesBack(expr, src, assume = new Set(), depth = 0) {
  if (expr === undefined || depth > 14) return false;
  const sf = expr.getSourceFile();
  if (src.node !== undefined && nodesUnder(expr).some(src.node)) return true;
  for (const n of nodesUnder(expr)) {
    if (!ts.isCallExpression(n)) continue;
    if (src.call !== undefined && src.call(n)) return true;
    // A helper declared in this file: what it returns.
    const name = calleeName(n);
    const callee = peel(n.expression);
    if (name === null || !(ts.isIdentifier(callee) || (ts.isPropertyAccessExpression(callee) && callee.expression.kind === K.ThisKeyword))) continue;
    for (const fn of functionsNamed(sf, name)) {
      const key = `ret#${sf.fileName}#${name}`;
      if (assume.has(key)) continue;
      const next = new Set(assume).add(key);
      if (returnsOf(fn).some((r) => tracesBack(r, src, next, depth + 1))) return true;
    }
  }
  for (const id of valueIdentifiers(expr)) {
    const d = resolveLocal(id);
    if (d === null) continue;
    if (d.kind === 'var') {
      if (d.decl.initializer !== undefined && tracesBack(d.decl.initializer, src, assume, depth + 1)) return true;
      // A `let` assigned later: any assignment that carries the source.
      for (const a of assignmentsTo(d.decl)) if (tracesBack(a, src, assume, depth + 1)) return true;
      continue;
    }
    if (d.kind !== 'param') continue;
    const fname = nameOfFunction(d.fn);
    if (src.param !== undefined && src.param(fname, d.index, d.fn)) return true;
    if (fname === null) continue;
    const key = `param#${d.fn.getSourceFile().fileName}#${fname}#${String(d.index)}`;
    if (assume.has(key)) return true;
    const callers = callsUnder(d.fn.getSourceFile(), fname);
    if (callers.length === 0) continue;
    const next = new Set(assume).add(key);
    if (callers.every((c) => c.arguments[d.index] !== undefined && tracesBack(c.arguments[d.index], src, next, depth + 1))) {
      return true;
    }
  }
  return false;
}

/** The expressions a function returns, its concise body included, nested functions excluded. */
function returnsOf(fn) {
  if (fn.body === undefined) return [];
  if (!ts.isBlock(fn.body)) return [fn.body];
  const out = [];
  const visit = (n) => {
    if (n !== fn.body && isFunctionLike(n)) return;
    if (ts.isReturnStatement(n) && n.expression !== undefined) out.push(n.expression);
    ts.forEachChild(n, visit);
  };
  visit(fn.body);
  return out;
}

/** The right-hand sides assigned to a variable after its declaration, in its scope. */
function assignmentsTo(decl) {
  if (!ts.isIdentifier(decl.name)) return [];
  const name = decl.name.text;
  const scope = enclosingFunction(decl) ?? decl.getSourceFile();
  return nodesUnder(scope)
    .filter(
      (n) =>
        ts.isBinaryExpression(n) &&
        n.operatorToken.kind === K.EqualsToken &&
        ts.isIdentifier(peel(n.left)) &&
        peel(n.left).text === name
    )
    .map((n) => n.right);
}

// ---- guards ---------------------------------------------------------------

/**
 * Whether a condition being TRUE means the guard holds: the guard itself (an
 * atom), an `&&` with it on either side, `=== true`, `!== false`, `!!`, a
 * const that holds it, or a const that is only non-null when it holds
 * (`const r = guard ? read() : null`, then `r !== null`).
 */
function implies(cond, isAtom, depth = 0) {
  const c = peel(cond);
  if (c === undefined || depth > 6) return false;
  if (isAtom(c)) return true;
  if (ts.isBinaryExpression(c)) {
    const op = c.operatorToken.kind;
    if (op === K.AmpersandAmpersandToken) return implies(c.left, isAtom, depth + 1) || implies(c.right, isAtom, depth + 1);
    if (op === K.EqualsEqualsEqualsToken || op === K.EqualsEqualsToken) {
      if (c.right.kind === K.TrueKeyword) return implies(c.left, isAtom, depth + 1);
      if (c.left.kind === K.TrueKeyword) return implies(c.right, isAtom, depth + 1);
      return false;
    }
    if (op === K.ExclamationEqualsEqualsToken || op === K.ExclamationEqualsToken) {
      if (c.right.kind === K.FalseKeyword) return implies(c.left, isAtom, depth + 1);
      if (c.left.kind === K.FalseKeyword) return implies(c.right, isAtom, depth + 1);
      if (isNullish(c.right)) return presentOnlyWhen(c.left, isAtom, depth + 1);
      if (isNullish(c.left)) return presentOnlyWhen(c.right, isAtom, depth + 1);
      return false;
    }
    return false;
  }
  if (ts.isPrefixUnaryExpression(c) && c.operator === K.ExclamationToken) {
    const inner = peel(c.operand);
    return ts.isPrefixUnaryExpression(inner) && inner.operator === K.ExclamationToken
      ? implies(inner.operand, isAtom, depth + 1)
      : false;
  }
  if (ts.isIdentifier(c)) {
    const d = resolveLocal(c);
    if (d?.kind === 'var' && isConst(d.decl) && d.decl.initializer !== undefined) {
      return implies(d.decl.initializer, isAtom, depth + 1) || presentOnlyWhen(c, isAtom, depth + 1);
    }
    return false;
  }
  if (ts.isPropertyAccessExpression(c)) return presentOnlyWhen(c.expression, isAtom, depth + 1);
  return false;
}

/** Whether an expression is only non-null while the guard holds (`guard ? x : null`, `guard && x`). */
function presentOnlyWhen(e, isAtom, depth) {
  const x = peel(e);
  if (x === undefined || depth > 6) return false;
  if (ts.isIdentifier(x)) {
    const d = resolveLocal(x);
    if (d?.kind !== 'var' || !isConst(d.decl) || d.decl.initializer === undefined) return false;
    return presentOnlyWhen(d.decl.initializer, isAtom, depth + 1);
  }
  if (ts.isAwaitExpression(x)) return presentOnlyWhen(x.expression, isAtom, depth + 1);
  if (ts.isConditionalExpression(x)) return isNullish(x.whenFalse) && implies(x.condition, isAtom, depth + 1);
  if (ts.isBinaryExpression(x) && x.operatorToken.kind === K.AmpersandAmpersandToken) return implies(x.left, isAtom, depth + 1);
  return false;
}

/** Whether a condition being TRUE means the guard does NOT hold (`!guard`, `guard === false`, `a || !guard`). */
function impliesNot(cond, isAtom) {
  const c = peel(cond);
  if (c === undefined) return false;
  if (ts.isPrefixUnaryExpression(c) && c.operator === K.ExclamationToken) return implies(c.operand, isAtom);
  if (ts.isBinaryExpression(c)) {
    const op = c.operatorToken.kind;
    if (op === K.BarBarToken) return impliesNot(c.left, isAtom) || impliesNot(c.right, isAtom);
    if (op === K.EqualsEqualsEqualsToken || op === K.EqualsEqualsToken) {
      if (c.right.kind === K.FalseKeyword) return implies(c.left, isAtom);
      if (c.left.kind === K.FalseKeyword) return implies(c.right, isAtom);
      if (isNullish(c.right)) return presentOnlyWhen(c.left, isAtom, 0);
      if (isNullish(c.left)) return presentOnlyWhen(c.right, isAtom, 0);
    }
    if ((op === K.ExclamationEqualsEqualsToken || op === K.ExclamationEqualsToken) && c.right.kind === K.TrueKeyword) {
      return implies(c.left, isAtom);
    }
  }
  return false;
}

function alwaysExits(stmt) {
  if (ts.isReturnStatement(stmt) || ts.isThrowStatement(stmt) || ts.isContinueStatement(stmt) || ts.isBreakStatement(stmt)) {
    return true;
  }
  if (ts.isBlock(stmt)) {
    const last = stmt.statements[stmt.statements.length - 1];
    return last !== undefined && alwaysExits(last);
  }
  return false;
}

/** Whether a declaration is exported from its module. */
function isExported(decl) {
  if ((ts.getCombinedModifierFlags(decl) & ts.ModifierFlags.Export) !== 0) return true;
  const name = decl.name !== undefined && ts.isIdentifier(decl.name) ? decl.name.text : null;
  if (name === null) return false;
  return nodesUnder(decl.getSourceFile()).some(
    (n) => ts.isExportSpecifier(n) && (n.propertyName ?? n.name).text === name
  );
}

/** Whether a production file other than `rel` names `name` as code. */
function namedOutside(tree, name, rel) {
  for (const other of srcFilesNaming(tree, name)) {
    if (other === rel || !isProductionCode(other)) continue;
    const sf = sourceOf(tree, other);
    if (nodesUnder(sf).some((n) => ts.isIdentifier(n) && n.text === name && !isInType(n))) return true;
  }
  return false;
}

/** The identifiers that read a declared const or variable, in its scope. */
function referencesOf(decl) {
  const name = decl.name.text;
  const scope = enclosingFunction(decl) ?? decl.getSourceFile();
  return nodesUnder(scope).filter(
    (n) => ts.isIdentifier(n) && n.text === name && n !== decl.name && !isDeclarationName(n) && !isInType(n)
  );
}

/**
 * Whether `site` runs only where the guard holds (see the header): its own
 * position under the guard, a constant whose every read is, or a named
 * function whose every production call is.
 */
function guardedSite(site, isAtom, tree, assume = new Set()) {
  let child = site;
  for (let p = site.parent; p !== undefined; child = p, p = p.parent) {
    if (ts.isIfStatement(p) && p.thenStatement === child && implies(p.expression, isAtom)) return true;
    if (ts.isConditionalExpression(p) && p.whenTrue === child && implies(p.condition, isAtom)) return true;
    if (ts.isBinaryExpression(p) && p.operatorToken.kind === K.AmpersandAmpersandToken && p.right === child && implies(p.left, isAtom)) {
      return true;
    }
    if (hasStatements(p)) {
      for (const s of p.statements) {
        if (s === child) break;
        if (ts.isIfStatement(s) && s.elseStatement === undefined && impliesNot(s.expression, isAtom) && alwaysExits(s.thenStatement)) {
          return true;
        }
      }
    }
    if (ts.isVariableDeclaration(p) && p.initializer === child && ts.isIdentifier(p.name)) {
      // A named format: made unguarded, and read only where its every use is.
      // Only DATA is held this way. A module constant can send nothing, but a
      // local whose making awaits or calls anything else has already sent its
      // read, whatever reads the answer later.
      const moduleLevel = ts.isSourceFile(p.parent?.parent?.parent ?? p);
      if ((moduleLevel || isDataPath(site, p.initializer)) && usesGuarded(p, isAtom, tree, assume)) return true;
    }
    if (isFunctionLike(p)) {
      const name = nameOfFunction(p);
      if (name === null) continue; // an anonymous function is as guarded as the place it is made
      return guardedFunction(p, name, isAtom, tree, assume);
    }
  }
  return false;
}

/** The calls that only build a string or an array, so a value made with them is still data. */
const DATA_CALLS = new Set(['join', 'concat', 'String', 'slice']);

/** Whether everything between a use and the initializer around it only builds data. */
function isDataPath(site, init) {
  for (let n = site.parent; n !== undefined; n = n.parent) {
    if (ts.isAwaitExpression(n) || ts.isNewExpression(n) || ts.isYieldExpression(n)) return false;
    if (ts.isCallExpression(n) && !DATA_CALLS.has(calleeName(n) ?? '')) return false;
    if (n === init) return true;
  }
  return false;
}

function usesGuarded(decl, isAtom, tree, assume) {
  const sf = decl.getSourceFile();
  const key = `var#${sf.fileName}#${decl.name.text}#${String(decl.pos)}`;
  if (assume.has(key)) return true;
  if (isExported(decl) && namedOutside(tree, decl.name.text, sf.fileName)) return false;
  const next = new Set(assume).add(key);
  return referencesOf(decl).every((r) => guardedSite(r, isAtom, tree, next));
}

function guardedFunction(fn, name, isAtom, tree, assume) {
  const sf = fn.getSourceFile();
  const key = `fn#${sf.fileName}#${name}`;
  if (assume.has(key)) return true;
  const holder = ts.isFunctionDeclaration(fn) ? fn : fn.parent;
  if (!ts.isMethodDeclaration(fn) && holder !== undefined && isExported(holder) && namedOutside(tree, name, sf.fileName)) {
    return false;
  }
  const next = new Set(assume).add(key);
  const refs = ts.isMethodDeclaration(fn)
    ? nodesUnder(sf).filter(
        (n) => ts.isPropertyAccessExpression(n) && n.name.text === name && n.expression.kind === K.ThisKeyword
      )
    : nodesUnder(sf).filter(
        (n) => ts.isIdentifier(n) && n.text === name && !isDeclarationName(n) && !isInType(n)
      );
  for (const r of refs) {
    const call = r.parent !== undefined && ts.isCallExpression(r.parent) && r.parent.expression === r ? r.parent : null;
    if (call === null) return false; // handed on as a value, so called from anywhere
    if (!guardedSite(call, isAtom, tree, next)) return false;
  }
  return true; // every call guarded, or none in production at all
}

/**
 * Where a string literal is USED: the literal itself, or, when it sits in a
 * module-level constant, every read of that constant (and of any constant
 * built from it).
 */
function usesOf(literal) {
  const out = [];
  const seen = new Set();
  const queue = [literal];
  while (queue.length > 0) {
    const n = queue.shift();
    let holder = null;
    for (let p = n.parent; p !== undefined; p = p.parent) {
      if (isFunctionLike(p)) break;
      if (ts.isVariableDeclaration(p) && ts.isIdentifier(p.name) && ts.isSourceFile(p.parent?.parent?.parent ?? p)) {
        holder = p;
        break;
      }
    }
    if (holder === null) {
      out.push(n);
      continue;
    }
    if (seen.has(holder)) continue;
    seen.add(holder);
    queue.push(...referencesOf(holder));
  }
  return out;
}

// ---- small readers shared by the rules and their attacks ------------------

/** A member of an interface by its key: `InvokeChannelMap['sessions:attach']`. */
function interfaceMember(sf, iface, key) {
  for (const n of nodesUnder(sf)) {
    if (!ts.isInterfaceDeclaration(n) || n.name.text !== iface) continue;
    for (const m of n.members) {
      if (m.name !== undefined && (ts.isIdentifier(m.name) || ts.isStringLiteral(m.name)) && m.name.text === key) return m;
    }
  }
  return null;
}

const typeMember = (typeNode, key) =>
  typeNode !== undefined && ts.isTypeLiteralNode(typeNode)
    ? typeNode.members.find((m) => m.name !== undefined && (ts.isIdentifier(m.name) || ts.isStringLiteral(m.name)) && m.name.text === key) ?? null
    : null;

/** A property of an object literal by name: an assignment, a shorthand or a method. */
const propertyNamed = (obj, name) =>
  obj.properties.find(
    (p) =>
      (ts.isPropertyAssignment(p) || ts.isShorthandPropertyAssignment(p) || ts.isMethodDeclaration(p)) &&
      p.name !== undefined &&
      (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name)) &&
      p.name.text === name
  ) ?? null;

const valueOfProperty = (p) =>
  ts.isPropertyAssignment(p) ? p.initializer : ts.isShorthandPropertyAssignment(p) ? p.name : p;

/**
 * A property named `name` anywhere in an object literal, through spreads,
 * conditionals and nested literals (`...(size !== null ? { size } : {})`), but
 * never inside a function. Null when there is none, or only a nullish one.
 */
function deepProperty(obj, name) {
  let found = null;
  const visit = (n) => {
    if (found !== null || isFunctionLike(n)) return;
    if (ts.isObjectLiteralExpression(n)) {
      const p = propertyNamed(n, name);
      if (p !== null && !ts.isMethodDeclaration(p) && !isNullish(valueOfProperty(p))) {
        found = p;
        return;
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(obj);
  return found;
}

const isNewTerminal = (n) => ts.isNewExpression(n) && pathOf(n.expression) === 'Terminal';
const optionsOf = (newExpr) => {
  const a = newExpr.arguments?.[0];
  const o = a === undefined ? undefined : peel(a);
  return o !== undefined && ts.isObjectLiteralExpression(o) ? o : null;
};

/** The name a `new Terminal(` is held by: `const term = …` or `offscreen = …`. */
function bindingOf(newExpr) {
  let n = newExpr;
  let p = n.parent;
  while (p !== undefined && (ts.isParenthesizedExpression(p) || ts.isAsExpression(p) || ts.isNonNullExpression(p) || ts.isSatisfiesExpression(p))) {
    n = p;
    p = p.parent;
  }
  if (p !== undefined && ts.isVariableDeclaration(p) && p.initializer === n && ts.isIdentifier(p.name)) return p.name.text;
  if (p !== undefined && ts.isBinaryExpression(p) && p.operatorToken.kind === K.EqualsToken && p.right === n) return pathOf(p.left);
  return null;
}

/** Every declaration of `name` in production code under `prefix`: functions, consts and methods. */
function declarationsNamed(tree, prefix, name) {
  const out = [];
  for (const rel of srcFilesNaming(tree, name)) {
    if (!rel.startsWith(prefix) || !isProductionCode(rel)) continue;
    const sf = sourceOf(tree, rel);
    for (const n of nodesUnder(sf)) {
      if (
        (ts.isFunctionDeclaration(n) || ts.isVariableDeclaration(n) || ts.isMethodDeclaration(n) || ts.isPropertyDeclaration(n)) &&
        n.name !== undefined &&
        ts.isIdentifier(n.name) &&
        n.name.text === name
      ) {
        out.push({ rel, node: n });
      }
    }
  }
  return out;
}

/** Whether a function, or a function its own file declares that it calls, calls `name`. */
function reaches(fn, name, sf, depth = 0) {
  if (callsUnder(fn, name).length > 0) return true;
  if (depth >= 2) return false;
  for (const c of nodesUnder(fn).filter(ts.isCallExpression)) {
    const callee = calleeName(c);
    if (callee === null || callee === name) continue;
    for (const g of functionsNamed(sf, callee)) {
      if (g !== fn && reaches(g, name, sf, depth + 1)) return true;
    }
  }
  return false;
}

/** The path, from the root, of a module an import names, or null for a package. */
function importTarget(fromRel, spec) {
  if (spec.startsWith('@shared/')) return `src/shared/${spec.slice('@shared/'.length)}`;
  if (spec.startsWith('@renderer/')) return `src/renderer/${spec.slice('@renderer/'.length)}`;
  if (spec.startsWith('.')) return posix.normalize(posix.join(posix.dirname(fromRel), spec));
  return null;
}
const withoutExtension = (rel) => rel.replace(/\.(?:ts|tsx|js|mjs)$/, '');

function importsModule(sf, targetRel) {
  const want = withoutExtension(targetRel);
  return sf.statements.some(
    (s) =>
      ts.isImportDeclaration(s) &&
      ts.isStringLiteral(s.moduleSpecifier) &&
      withoutExtension(importTarget(sf.fileName, s.moduleSpecifier.text) ?? '') === want
  );
}

/** The file an imported name comes from, in this copy, or null. */
function importedFrom(tree, sf, name) {
  for (const s of sf.statements) {
    if (!ts.isImportDeclaration(s) || !ts.isStringLiteral(s.moduleSpecifier)) continue;
    const b = s.importClause?.namedBindings;
    if (b === undefined || !ts.isNamedImports(b)) continue;
    const el = b.elements.find((e) => e.name.text === name);
    if (el === undefined) continue;
    const target = importTarget(sf.fileName, s.moduleSpecifier.text);
    if (target === null) return null;
    for (const ext of ['.ts', '.tsx', '/index.ts']) {
      const rel = `${withoutExtension(target)}${ext}`;
      if (tree.has(rel)) return { sf: sourceOf(tree, rel), name: (el.propertyName ?? el.name).text };
    }
  }
  return null;
}

/**
 * The places under `root` that remove a line's trailing spaces: a regular
 * expression ending in a run of spaces anchored at `$`, `trimEnd`/`trimRight`,
 * a space compared in a loop (`=== ' '`, or a `charCodeAt(`/`codePointAt(`
 * compared with 0x20), or a call of a function this copy declares, in the
 * file or in a module it imports by path, that does one of those, two calls
 * deep. Every one is returned, so an ablation can take them all away.
 */
function stripsOf(root, sf, tree, depth = 0) {
  const out = [];
  const SPACE_RUN_AT_END = /(\[[^\]]*\]|\\x20|\\u0020|\\u\{20\}|\\s| )(?:\+|\*|\{1,\})\$$/;
  const inLoop = (n) => {
    for (let p = n.parent; p !== undefined && p !== root; p = p.parent) {
      if (ts.isWhileStatement(p) || ts.isForStatement(p) || ts.isDoStatement(p)) return true;
      if (isFunctionLike(p)) return false;
    }
    return false;
  };
  const isSpaceCode = (n) => ts.isNumericLiteral(n) && Number(n.text.replace(/_/g, '')) === 0x20;
  const readsCode = (n) => nodesUnder(n).some((m) => isCall(m, 'charCodeAt') || isCall(m, 'codePointAt'));
  for (const n of nodesUnder(root)) {
    if (ts.isRegularExpressionLiteral(n)) {
      const pattern = n.text.slice(1, n.text.lastIndexOf('/'));
      const m = SPACE_RUN_AT_END.exec(pattern);
      if (m !== null && (!m[1].startsWith('[') || (!m[1].startsWith('[^') && /(?: |\\x20|\\u0020|\\s)/.test(m[1])))) {
        out.push({ kind: 'regex', node: n });
      }
      continue;
    }
    if (ts.isCallExpression(n)) {
      const name = calleeName(n);
      if ((name === 'trimEnd' || name === 'trimRight') && ts.isPropertyAccessExpression(peel(n.expression))) {
        out.push({ kind: 'method', node: n });
        continue;
      }
      const callee = peel(n.expression);
      if (name !== null && ts.isIdentifier(callee) && depth < 2) {
        const local = functionsNamed(sf, name).filter((f) => f !== root);
        const imported = local.length === 0 ? importedFrom(tree, sf, name) : null;
        const bodies =
          local.length > 0
            ? local.map((f) => [f, sf])
            : imported === null
              ? []
              : functionsNamed(imported.sf, imported.name).map((f) => [f, imported.sf]);
        if (bodies.some(([f, fsf]) => stripsOf(f, fsf, tree, depth + 1).length > 0)) out.push({ kind: 'helper', node: n });
      }
      continue;
    }
    if (
      ts.isBinaryExpression(n) &&
      [K.EqualsEqualsEqualsToken, K.ExclamationEqualsEqualsToken, K.EqualsEqualsToken, K.ExclamationEqualsToken].includes(n.operatorToken.kind) &&
      inLoop(n)
    ) {
      if (stringOf(n.left) === ' ' || stringOf(n.right) === ' ') {
        out.push({ kind: 'compare', node: stringOf(n.left) === ' ' ? n.left : n.right });
      } else if ((isSpaceCode(n.right) && readsCode(n.left)) || (isSpaceCode(n.left) && readsCode(n.right))) {
        out.push({ kind: 'code', node: isSpaceCode(n.right) ? n.right : n.left });
      }
    }
  }
  return out;
}

/** Whether a production file names `needle` as code, and where: a name, a string, a template or JSX text. */
function codeMention(tree, rel, needle) {
  const text = tree.text(rel);
  if (text === null || !text.includes(needle)) return null;
  if (!TS_FILE.test(rel)) {
    const i = text.indexOf(needle);
    return `${rel}:${String(text.slice(0, i).split('\n').length)}`;
  }
  const sf = sourceOf(tree, rel);
  for (const n of nodesUnder(sf)) {
    if (
      ((ts.isIdentifier(n) || ts.isPrivateIdentifier(n)) && n.text.includes(needle)) ||
      ((ts.isStringLiteralLike(n) ||
        ts.isTemplateHead(n) ||
        ts.isTemplateMiddle(n) ||
        ts.isTemplateTail(n) ||
        ts.isRegularExpressionLiteral(n) ||
        n.kind === K.JsxText) &&
        n.text.includes(needle))
    ) {
      return at(n);
    }
  }
  return null;
}

/** Findings for every production file under src/ that names `needle` as code. */
function namedNowhere(tree, needle) {
  const out = [];
  for (const rel of srcFilesNaming(tree, needle)) {
    if (isTestPath(rel)) continue;
    const where = codeMention(tree, rel, needle);
    if (where !== null) out.push(`${where} names ${needle}`);
  }
  return out;
}

// ---------------------------------------------------------------------------
// T1. The attach carries a size
// ---------------------------------------------------------------------------

/** The `.attachSession(` argument index main hands the request's size at, or null. */
function attachSizeIndex(tree) {
  const ipc = sourceOf(tree, F.ipc);
  if (ipc === null) return null;
  for (const h of nodesUnder(ipc).filter((n) => ts.isCallExpression(n) && stringOf(n.arguments[0]) === IPC_ATTACH)) {
    const fn = peel(h.arguments[1]);
    if (fn === undefined || !(ts.isArrowFunction(fn) || ts.isFunctionExpression(fn))) continue;
    const p = fn.parameters[2];
    if (p === undefined || !ts.isIdentifier(p.name)) continue;
    for (const c of callsUnder(fn, 'attachSession')) {
      const i = c.arguments.findIndex((a) => ts.isIdentifier(peel(a)) && peel(a).text === p.name.text);
      if (i >= 0) return i;
    }
  }
  return null;
}

const attachCalls = (core) =>
  nodesUnder(core).filter((n) => ts.isCallExpression(n) && /(?:^|\.)attachHost\.attach$/.test(calleePath(n) ?? ''));

/** The expressions an attach request carries its size in: cols and rows, or a spread. */
function sizeCarriers(obj) {
  const cols = propertyNamed(obj, 'cols');
  const rows = propertyNamed(obj, 'rows');
  const out = obj.properties.filter(ts.isSpreadAssignment).map((s) => s.expression);
  if (cols !== null && rows !== null) out.push(valueOfProperty(cols), valueOfProperty(rows));
  return out;
}

/**
 * Probe review (2026-11-16). The `cols:` and `rows:` an attach request writes, in the object itself or in an
 * object spread into it, whose value is not read from a size's own field of that name: `cols: fitted.rows`.
 * T2 asks this of `-x` and `-y`; T1 accepted the two crossed, a client spawned at the size on its side.
 */
function crossedSize(obj) {
  const props = [];
  const collect = (o) => {
    for (const p of o.properties) {
      if (ts.isPropertyAssignment(p) && ['cols', 'rows'].includes(p.name.getText())) props.push(p);
      else if (ts.isSpreadAssignment(p)) for (const n of nodesUnder(p.expression)) if (ts.isObjectLiteralExpression(n)) collect(n);
    }
  };
  collect(obj);
  return [...new Set(props)].filter((p) => {
    const field = p.name.getText();
    return !mentionsName(p.initializer, field) || mentionsName(p.initializer, field === 'cols' ? 'rows' : 'cols');
  });
}

/**
 * The parameters of a function that carry an attach's size: read by an
 * `attachSizeFor(` call in it, or by the size an `attachHost.attach({` in it
 * carries.
 */
function sizeParameterIndices(fn) {
  if (fn.body === undefined) return [];
  const read = new Set();
  for (const c of callsUnder(fn.body, 'attachSizeFor')) for (const id of c.arguments.flatMap(valueIdentifiers)) read.add(id.text);
  for (const a of nodesUnder(fn.body).filter((n) => ts.isCallExpression(n) && /(?:^|\.)attachHost\.attach$/.test(calleePath(n) ?? ''))) {
    const obj = peel(a.arguments[0]);
    if (obj !== undefined && ts.isObjectLiteralExpression(obj)) for (const e of sizeCarriers(obj)) for (const id of valueIdentifiers(e)) read.add(id.text);
  }
  return fn.parameters.map((p, i) => (ts.isIdentifier(p.name) && read.has(p.name.text) ? i : -1)).filter((i) => i >= 0);
}

/** What `attachSizeFor` must be able to answer: its own argument, read through the validator. */
const SIZE_FOR_ANSWERS = {
  call: (c) =>
    calleeName(c) === 'sanitizeTerminalSize' &&
    c.arguments.some((a) => tracesBack(a, { param: (name, i) => name === 'attachSizeFor' && i === 0 }))
};

/** The source T1 asks of an attach: `attachSizeFor(x)` where x is the request's size on every path. */
function attachSizeSource(sizeIndex) {
  const fromRequest = { param: (name, i) => name === 'attachSession' && i === sizeIndex };
  return {
    call: (c) => calleeName(c) === 'attachSizeFor' && c.arguments.length > 0 && tracesBack(c.arguments[0], fromRequest)
  };
}

function t1(tree) {
  const out = [];
  const base = sourceOf(tree, F.base);
  if (base === null) {
    out.push(`${F.base} is missing`);
  } else {
    const member = interfaceMember(base, 'InvokeChannelMap', IPC_ATTACH);
    const req = member === null ? null : typeMember(member.type, 'req');
    const tuple = req !== null && req.type !== undefined && ts.isTupleTypeNode(req.type) ? req.type : null;
    if (tuple === null) out.push(`${F.base}: '${IPC_ATTACH}' has no request tuple this gate can read`);
    else {
      const names = tuple.elements.map((e) => (ts.isNamedTupleMember(e) ? e.name.text : '?'));
      if (names[1] !== 'size') out.push(`${at(tuple)}: '${IPC_ATTACH}' takes [${names.join(', ')}], with no second member named size`);
    }
    const sessions = interfaceMember(base, 'GmuxApi', 'sessions');
    const attach = sessions === null ? null : typeMember(sessions.type, 'attach');
    const second = attach !== null && ts.isMethodSignature(attach) ? attach.parameters[1] : undefined;
    if (second === undefined || !ts.isIdentifier(second.name) || second.name.text !== 'size') {
      out.push(`${F.base}: GmuxApi's sessions.attach takes no second parameter named size`);
    }
  }

  const preload = sourceOf(tree, F.preload);
  if (preload === null) out.push(`${F.preload} is missing`);
  else {
    const invokes = nodesUnder(preload).filter((n) => ts.isCallExpression(n) && stringOf(n.arguments[0]) === IPC_ATTACH);
    if (invokes.length === 0) out.push(`${F.preload} never invokes '${IPC_ATTACH}'`);
    for (const c of invokes) {
      const fn = enclosingFunction(c);
      const p = fn?.parameters[1];
      const third = peel(c.arguments[2]);
      if (p === undefined || !ts.isIdentifier(p.name) || third === undefined || !ts.isIdentifier(third) || third.text !== p.name.text) {
        out.push(`${at(c)}: the preload forwards ${String(c.arguments.length - 1)} argument(s) to '${IPC_ATTACH}', not the pane's size`);
      }
    }
  }

  const sizeIndex = attachSizeIndex(tree);
  if (sourceOf(tree, F.ipc) === null) out.push(`${F.ipc} is missing`);
  else if (sizeIndex === null) out.push(`${F.ipc}: the '${IPC_ATTACH}' handler takes no size, or never hands it to attachSession`);

  const core = sourceOf(tree, F.core);
  if (core === null) out.push(`${F.core} is missing`);
  else {
    const sizeFor = functionsNamed(core, 'attachSizeFor');
    if (sizeFor.length !== 1) out.push(`${F.core} declares attachSizeFor ${String(sizeFor.length)} times, not once`);
    else if (!returnsOf(sizeFor[0]).some((r) => tracesBack(r, SIZE_FOR_ANSWERS))) {
      out.push(`${at(sizeFor[0])}: attachSizeFor never answers the size it was handed, read through sanitizeTerminalSize(`);
    }
    const attaches = attachCalls(core);
    if (attaches.length < 2) {
      out.push(`${F.core} makes ${String(attaches.length)} attachHost.attach( call(s); the local branch and the listed-remote branch, which the far wait ends in, are two`);
    }
    const source = sizeIndex === null ? null : attachSizeSource(sizeIndex);
    for (const a of attaches) {
      const obj = peel(a.arguments[0]);
      if (obj === undefined || !ts.isObjectLiteralExpression(obj)) {
        out.push(`${at(a)}: the attach request is not an object literal this gate can read`);
        continue;
      }
      const carriers = sizeCarriers(obj);
      if (carriers.length === 0) {
        out.push(`${at(a)}: the attach carries no size, so the client spawns at 80 by 24`);
        continue;
      }
      if (source !== null && !carriers.some((c) => tracesBack(c, source))) {
        out.push(`${at(a)}: the attach's cols and rows do not come from attachSizeFor( fed by the request's size on every path into it`);
      }
      const crossed = crossedSize(obj);
      if (crossed.length > 0) {
        out.push(`${at(a)}: the attach's ${crossed.map((p) => p.name.getText()).join(' and ')} not read from the size's own field of that name, so the client spawns at the size on its side`);
      }
    }
  }

  const pane = sourceOf(tree, F.pane);
  if (pane === null) out.push(`${F.pane} is missing`);
  else {
    const calls = nodesUnder(pane).filter((n) => ts.isCallExpression(n) && /(?:^|\.)sessions\.attach$/.test(calleePath(n) ?? ''));
    if (calls.length === 0) out.push(`${F.pane} never attaches`);
    for (const c of calls) {
      if (c.arguments.length !== 2 || isNullish(c.arguments[1])) {
        out.push(`${at(c)}: the pane attaches with ${String(c.arguments.length)} argument(s), not its id and its size`);
      } else if (!onlyFrom(c.arguments[1], (x) => calleeName(x) === 'settleForAttach')) {
        // The fix round: a client spawned at a size its terminal is not at (a pane mounted while the work
        // area was hidden) left 34 of 39 rows garbled until the window was resized.
        out.push(`${at(c)}: the pane attaches with a size that is not settleForAttach('s answer, so its client can be spawned at a size its terminal is not at`);
      }
    }
  }
  out.push(...settledAttach(tree));
  return out;
}

/**
 * The fix round. `settleForAttach` in tab-size.ts puts the terminal at the size it is handed (`<term>.resize(`)
 * and answers the terminal's OWN size, read after the move (`<term>.cols`), on every return.
 */
function settledAttach(tree) {
  const out = [];
  const sf = sourceOf(tree, F.tabSize);
  if (sf === null) return [`${F.tabSize} is missing`];
  const fns = functionsNamed(sf, 'settleForAttach');
  if (fns.length !== 1) return [`${F.tabSize} declares settleForAttach ${String(fns.length)} times, not once`];
  const fn = fns[0];
  const p0 = fn.parameters[0];
  const termName = p0 !== undefined && ts.isIdentifier(p0.name) ? p0.name.text : null;
  if (termName === null) return [`${at(fn)}: settleForAttach takes no terminal`];
  const ownCols = { node: (n) => ts.isPropertyAccessExpression(n) && n.name.text === 'cols' && pathOf(n.expression) === termName };
  const returns = returnsOf(fn);
  if (returns.length === 0 || !returns.every((r) => tracesBack(r, ownCols))) {
    out.push(`${at(fn)}: settleForAttach does not answer the terminal's own size (${termName}.cols) on every return, so the attach can name a size the terminal is not at`);
  }
  if (!callsUnder(fn, 'resize').some((c) => calleePath(c) === `${termName}.resize`)) {
    out.push(`${at(fn)}: settleForAttach never puts the terminal at the size it was handed (${termName}.resize(), so a pane hidden at its mount attaches at its unfitted 80 by 24 or another size`);
  }
  return out;
}

// ---------------------------------------------------------------------------
// T2. The create carries a size
// ---------------------------------------------------------------------------

const NEW_SESSION_LINES = [
  [F.tmuxSessions, 'createSession'],
  [F.remoteSessions, 'remoteCreateArgs']
];
/** [file, callee, the function it must sit in (or null)]: the four production creates (SPEC §4.1). */
const CREATE_SITES = [
  [F.createLocal, 'tmux.createSession', null],
  [F.createLocal, 'remoteCreate', null],
  [F.restore, 'tmux.createSession', null],
  [F.remoteSessions, 'remoteCreateArgs', 'remoteCreate'],
  [F.remoteRestore, 'remoteCreateArgs', null]
];

/** A request's own size: `input.size`, `options.size`, followed back through parameters to every caller. */
const REQUEST_SIZE = { node: (n) => ts.isPropertyAccessExpression(n) && n.name.text === 'size' };
/** A size read through the one validator, from the request's own size. */
const FROM_SANITIZER = {
  call: (c) => calleeName(c) === 'sanitizeTerminalSize' && c.arguments.some((a) => tracesBack(a, REQUEST_SIZE))
};

/** The element after a literal in its array, or the argument after it in its call. */
function nextSibling(lit) {
  const p = lit.parent;
  if (p !== undefined && ts.isArrayLiteralExpression(p)) return p.elements[p.elements.indexOf(lit) + 1] ?? null;
  if (p !== undefined && ts.isCallExpression(p)) return p.arguments[p.arguments.indexOf(lit) + 1] ?? null;
  return null;
}

const mentionsName = (expr, name) =>
  nodesUnder(expr).some((m) => (ts.isPropertyAccessExpression(m) && m.name.text === name) || (ts.isIdentifier(m) && m.text === name));

const holdsNewSession = (arr) => arr !== undefined && ts.isArrayLiteralExpression(arr) && arr.elements.some((e) => stringOf(e) === 'new-session');

/**
 * Whether a flag lands in the `new-session` line itself: written in the array
 * that holds 'new-session' (or in one spread into it), or pushed onto the
 * variable that array is held by.
 */
function intoNewSessionLine(lit) {
  for (let p = lit.parent; p !== undefined && !ts.isStatement(p) && !isFunctionLike(p); p = p.parent) {
    if (holdsNewSession(p)) return true;
    if (isCall(p, 'push')) {
      const receiver = peel(peel(p.expression).expression);
      const d = receiver !== undefined && ts.isIdentifier(receiver) ? resolveLocal(receiver) : null;
      return d?.kind === 'var' && holdsNewSession(peel(d.decl.initializer));
    }
  }
  return false;
}

/** The `-x` (or `-y`) literals of a new-session composer, and the one fed from the sanitizer, if any. */
function sizeFlag(fn, flag, field) {
  const sites = nodesUnder(fn).filter((n) => stringOf(n) === flag && n.parent !== undefined && (ts.isArrayLiteralExpression(n.parent) || isCall(n.parent, 'push')));
  const fed = sites.find((lit) => {
    const next = nextSibling(lit);
    return next !== null && mentionsName(next, field) && tracesBack(next, FROM_SANITIZER) && intoNewSessionLine(lit);
  });
  return { sites, fed: fed ?? null };
}

/** The calls of one production create, with the size each hands on (null when none). */
function createSites(tree, rel, callee, within) {
  const sf = sourceOf(tree, rel);
  if (sf === null) return null;
  const scopes = within === null ? [sf] : functionsNamed(sf, within);
  return scopes.flatMap((scope) =>
    nodesUnder(scope)
      .filter((n) => ts.isCallExpression(n) && calleePath(n) === callee)
      .map((call) => {
        const arg = peel(call.arguments[0]);
        return { call, size: arg !== undefined && ts.isObjectLiteralExpression(arg) ? deepProperty(arg, 'size') : null };
      })
  );
}

function t2(tree) {
  const out = [];
  for (const [rel, name] of NEW_SESSION_LINES) {
    const sf = sourceOf(tree, rel);
    if (sf === null) {
      out.push(`${rel} is missing`);
      continue;
    }
    const fns = functionsNamed(sf, name);
    if (fns.length !== 1) {
      out.push(`${rel} declares ${name} ${String(fns.length)} times, not once`);
      continue;
    }
    if (!nodesUnder(fns[0]).some((n) => stringOf(n) === 'new-session')) out.push(`${at(fns[0])}: ${name} composes no new-session line`);
    for (const [flag, field] of [['-x', 'cols'], ['-y', 'rows']]) {
      const { sites, fed } = sizeFlag(fns[0], flag, field);
      if (sites.length === 0) out.push(`${at(fns[0])}: ${name} pushes no ${flag}, so the session is made at 80 by 24`);
      else if (fed === null) {
        out.push(`${at(sites[0])}: ${name}'s ${flag} is not the ${field} of a size read through sanitizeTerminalSize(, put on the new-session line itself`);
      }
    }
  }
  for (const [rel, callee, within] of CREATE_SITES) {
    const sites = createSites(tree, rel, callee, within);
    const where = within === null ? rel : `${rel}'s ${within}`;
    if (sites === null) out.push(`${rel} is missing`);
    else if (sites.length === 0) out.push(`${where} makes no ${callee}( call`);
    else for (const s of sites) if (s.size === null) out.push(`${at(s.call)}: ${callee}( is handed no size`);
  }
  // Where those sizes are decided: a create in create-local.ts, a restore in
  // the core, each from the request's own size read through the validator
  // (SPEC §4.1, D2). A size handed on that nothing decides is no size.
  for (const s of createSites(tree, F.createLocal, 'tmux.createSession', null) ?? []) {
    if (s.size !== null && !tracesBack(valueOfProperty(s.size), FROM_SANITIZER)) {
      out.push(`${at(s.size)}: the create's size is not the request's own, read through sanitizeTerminalSize(`);
    }
  }
  const core = sourceOf(tree, F.core);
  if (core === null) out.push(`${F.core} is missing`);
  else {
    for (const [callee, why] of RESTORE_HANDOFFS) {
      const calls = callsUnder(core, callee);
      if (calls.length === 0) out.push(`${F.core} makes no ${callee}( call`);
      for (const c of calls) {
        const size = restoreSizeOf(c);
        if (size === null) out.push(`${at(c)}: ${callee}( is handed no size, so ${why} is made at 80 by 24`);
        else if (!tracesBack(size, FROM_SANITIZER)) out.push(`${at(c)}: the size ${callee}( is handed is not the request's own, read through sanitizeTerminalSize(`);
      }
    }
  }
  return out;
}

/** The two restores the core starts, and what each makes (SPEC §4.1). */
const RESTORE_HANDOFFS = [
  ['restoreSessionInTmux', 'a restore on this Mac'],
  ['restoreRemoteSession', 'a restore on another machine']
];

/** The size a restore call is handed: a `size` in its options, or a size-named argument after the first. */
function restoreSizeOf(call) {
  for (const a of call.arguments.slice(1)) {
    const x = peel(a);
    if (x !== undefined && ts.isObjectLiteralExpression(x)) {
      const p = deepProperty(x, 'size');
      if (p !== null) return valueOfProperty(p);
      continue;
    }
    if (!isNullish(a) && mentionsName(a, 'size')) return a;
  }
  return null;
}

// ---------------------------------------------------------------------------
// T3. One width provider, from the shared tables, on all three terminals
// ---------------------------------------------------------------------------

/** Every `charProperties` implementation in production code under src/renderer. */
function providerImplementations(tree) {
  const out = [];
  for (const rel of srcFilesNaming(tree, 'charProperties')) {
    if (!rel.startsWith('src/renderer/') || !isProductionCode(rel)) continue;
    for (const n of nodesUnder(sourceOf(tree, rel))) {
      if (
        (ts.isMethodDeclaration(n) || ts.isPropertyAssignment(n) || ts.isShorthandPropertyAssignment(n) || ts.isPropertyDeclaration(n) || ts.isGetAccessorDeclaration(n)) &&
        n.name !== undefined &&
        (ts.isIdentifier(n.name) || ts.isStringLiteral(n.name)) &&
        n.name.text === 'charProperties'
      ) {
        out.push({ rel, node: n });
      }
    }
  }
  return out;
}

/** Calls under src/renderer whose callee ends `.unicode.<name>`, and assignments to `.unicode.activeVersion`. */
function unicodeTouches(tree) {
  const registers = [];
  const activations = [];
  for (const rel of srcFilesNaming(tree, '.unicode.')) {
    if (!rel.startsWith('src/renderer/') || !isProductionCode(rel)) continue;
    for (const n of nodesUnder(sourceOf(tree, rel))) {
      if (ts.isCallExpression(n)) {
        const names = tailNames(n.expression);
        if (names[0] === 'register' && names[1] === 'unicode') registers.push(n);
      } else if (ts.isBinaryExpression(n) && n.operatorToken.kind === K.EqualsToken) {
        const names = tailNames(n.left);
        if (names[0] === 'activeVersion' && names[1] === 'unicode') activations.push(n);
      }
    }
  }
  return { registers, activations };
}

/** Every `new Terminal(` in production code, with what it is held by and the registration it gets. */
function terminalsMade(tree) {
  const out = [];
  for (const rel of srcFilesNaming(tree, 'new Terminal')) {
    if (!isProductionCode(rel)) continue;
    const sf = sourceOf(tree, rel);
    for (const n of nodesUnder(sf).filter(isNewTerminal)) {
      const binding = bindingOf(n);
      const scope = enclosingFunction(n) ?? sf;
      const registration =
        binding === null
          ? null
          : callsUnder(scope, 'registerTmuxWidths').find((c) => c.arguments[0] !== undefined && pathOf(c.arguments[0]) === binding) ?? null;
      out.push({ rel, node: n, binding, registration });
    }
  }
  return out;
}

/**
 * A string literal that can BE a value: the value itself, an arm of `??`,
 * `||`, `&&` or `?:`, what a local holds, or what a caller hands the
 * parameter it names (or the parameter's default), a few steps deep. A call's
 * own arguments are not its value, so `row('id')` holds none. A table chosen
 * by a literal is not the row's.
 */
function literalOnPath(expr, depth = 0, seen = new Set()) {
  const x = peel(expr);
  if (x === undefined || depth > 8) return null;
  if (ts.isStringLiteralLike(x)) return x;
  if (ts.isBinaryExpression(x) && [K.QuestionQuestionToken, K.BarBarToken, K.AmpersandAmpersandToken].includes(x.operatorToken.kind)) {
    return literalOnPath(x.left, depth + 1, seen) ?? literalOnPath(x.right, depth + 1, seen);
  }
  if (ts.isConditionalExpression(x)) return literalOnPath(x.whenTrue, depth + 1, seen) ?? literalOnPath(x.whenFalse, depth + 1, seen);
  if (!ts.isIdentifier(x)) return null;
  const d = resolveLocal(x);
  if (d?.kind === 'var') {
    const init = peel(d.decl.initializer);
    return init === undefined || isFunctionLike(init) ? null : literalOnPath(init, depth + 1, seen);
  }
  if (d?.kind !== 'param') return null;
  const name = nameOfFunction(d.fn);
  const key = `${String(name)}#${String(d.index)}`;
  if (name === null || seen.has(key)) return null;
  seen.add(key);
  const own = d.fn.parameters[d.index].initializer;
  if (own !== undefined) {
    const hit = literalOnPath(own, depth + 1, seen);
    if (hit !== null) return hit;
  }
  for (const c of callsUnder(d.fn.getSourceFile(), name)) {
    const hit = literalOnPath(c.arguments[d.index], depth + 1, seen);
    if (hit !== null) return hit;
  }
  return null;
}

/** A terminal's table read from its session row (`sessionRow()?.cellWidths`, `pane.cellWidths`). */
const FROM_SESSION_ROW = {
  node: (n) => ts.isPropertyAccessExpression(n) && n.name.text === 'cellWidths'
};

const DEPENDENCY_FIELDS = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'];
const UNICODE_ADDON = '@xterm/addon-unicode';

function t3(tree) {
  const out = [];
  for (const rel of [F.oldCells, F.oldWidths]) {
    if (tree.has(rel)) out.push(`${rel} is still in the tree; the width table and its joining rules live in src/shared/ alone`);
  }
  for (const rel of [F.sharedCells, F.sharedWidths, F.widths]) if (!tree.has(rel)) out.push(`${rel} is missing`);

  const nextCells = declarationsNamed(tree, 'src/', 'nextCell');
  if (nextCells.length !== 1 || nextCells[0].rel !== F.sharedCells) {
    out.push(`nextCell is declared ${String(nextCells.length)} time(s)${nextCells.length > 0 ? ` (${nextCells.map((d) => at(d.node)).join(', ')})` : ''}, not once in ${F.sharedCells}`);
  }
  const cells = sourceOf(tree, F.sharedCells);
  if (cells !== null) {
    const cluster = functionsNamed(cells, 'clusterCells');
    if (cluster.length !== 1 || !reaches(cluster[0], 'nextCell', cells)) out.push(`${F.sharedCells}: clusterCells does not ask nextCell, so the phone and the Mac would spell the joining rules twice`);
  }

  const providers = providerImplementations(tree);
  if (providers.length !== 1 || providers[0].rel !== F.widths) {
    out.push(`charProperties is implemented ${String(providers.length)} time(s) under src/renderer${providers.length > 0 ? ` (${providers.map((p) => at(p.node)).join(', ')})` : ''}, not once in ${F.widths}`);
  }
  const widths = sourceOf(tree, F.widths);
  if (widths !== null) {
    for (const p of providers.filter((x) => x.rel === F.widths)) {
      if (!reaches(p.node, 'nextCell', widths)) out.push(`${at(p.node)}: the provider's charProperties does not ask nextCell`);
    }
    if (!importsModule(widths, F.sharedWidths)) out.push(`${F.widths} does not import @shared/cell-widths`);
    if (!importsModule(widths, F.sharedCells)) out.push(`${F.widths} does not import @shared/cells`);
  }
  const registers = declarationsNamed(tree, 'src/', 'registerTmuxWidths');
  if (registers.length !== 1 || registers[0].rel !== F.widths) {
    out.push(`registerTmuxWidths is declared ${String(registers.length)} time(s), not once in ${F.widths}`);
  }
  const { registers: regs, activations } = unicodeTouches(tree);
  if (regs.length === 0) out.push(`no renderer code registers a width provider (.unicode.register()`);
  for (const r of regs) if (r.getSourceFile().fileName !== F.widths) out.push(`${at(r)}: a width provider is registered outside ${F.widths}`);
  if (activations.length === 0) out.push(`no renderer code makes a width provider active (.unicode.activeVersion =), so a registered table is never used`);
  for (const a of activations) if (a.getSourceFile().fileName !== F.widths) out.push(`${at(a)}: a width provider is made active outside ${F.widths}`);
  // Probe review (2026-11-16): the version made active is the registered provider's own, `<p>.version` of a
  // `<p>` handed to `.unicode.register(` in the same function. Any assignment read green before, and
  // `activeVersion = '6'` registers the table and draws with xterm's Unicode 6.
  for (const a of activations.filter((x) => x.getSourceFile().fileName === F.widths)) {
    const rhs = peel(a.right);
    const fn = enclosingFunction(a);
    const registered = regs.filter((r) => enclosingFunction(r) === fn && r.arguments[0] !== undefined).map((r) => pathOf(r.arguments[0]));
    const own =
      rhs !== undefined && ts.isPropertyAccessExpression(rhs) && rhs.name.text === 'version' && pathOf(rhs.expression) !== null && registered.includes(pathOf(rhs.expression));
    if (!own) out.push(`${at(a)}: the version made active is not the version of the provider registered beside it, so the terminal draws with another table`);
  }

  const made = terminalsMade(tree);
  for (const rel of TERMINAL_FILES) {
    if (!made.some((m) => m.rel === rel)) out.push(`${rel} makes no new Terminal(, so one of the three terminals is not where the rule reads it`);
  }
  for (const m of made) {
    const opts = optionsOf(m.node);
    const proposed = opts === null ? null : propertyNamed(opts, 'allowProposedApi');
    if (proposed === null || !ts.isPropertyAssignment(proposed) || peel(proposed.initializer).kind !== K.TrueKeyword) {
      out.push(`${at(m.node)}: the terminal is made without allowProposedApi: true, so xterm refuses its width provider`);
    }
    if (m.registration === null) out.push(`${at(m.node)}: the terminal ${m.binding === null ? 'is held by no name' : `(${m.binding})`} is never handed to registerTmuxWidths(`);
    else if (m.registration.arguments.length < 2 || isNullish(m.registration.arguments[1])) {
      out.push(`${at(m.registration)}: registerTmuxWidths( is handed no table, which keeps xterm's Unicode 6`);
    } else if (!tracesBack(m.registration.arguments[1], FROM_SESSION_ROW)) {
      out.push(`${at(m.registration)}: the table registerTmuxWidths( is handed is not the session row's cellWidths on every path`);
    } else {
      const fixed = literalOnPath(m.registration.arguments[1]);
      if (fixed !== null) {
        out.push(`${at(fixed)}: a terminal is handed the fixed table ${fixed.getText()} beside its row's, so a session on another machine, whose row names none, is drawn with this Mac's widths (D7)`);
      }
    }
  }
  const core = sourceOf(tree, F.core);
  if (core !== null && callsUnder(core, 'localCellWidths').length === 0) {
    out.push(`${F.core} never reads this Mac's table (localCellWidths()), so no session row carries one and every terminal keeps Unicode 6`);
  }
  if (core !== null) out.push(...localRowsOnly(core));
  const version = sourceOf(tree, F.version);
  const local = version === null ? undefined : functionsNamed(version, 'localCellWidths')[0];
  if (local === undefined) out.push(`${F.version} declares no localCellWidths`);
  else if (!reaches(local, 'cellWidthsForServer', version)) out.push(`${at(local)}: localCellWidths does not choose the table by this Mac's server (cellWidthsForServer()`);

  const pkgText = tree.text(F.pkg);
  if (pkgText === null) out.push(`${F.pkg} is missing`);
  else {
    let pkg = null;
    try {
      pkg = JSON.parse(pkgText);
    } catch (err) {
      out.push(`${F.pkg} does not parse: ${String(err?.message ?? err)}`);
    }
    for (const field of DEPENDENCY_FIELDS) {
      for (const name of Object.keys(pkg?.[field] ?? {})) {
        if (name.startsWith(UNICODE_ADDON)) out.push(`${F.pkg} ${field} lists ${name}; the widths are Tortie's own measured table, and no Unicode addon is added`);
      }
    }
  }
  for (const rel of srcFilesNaming(tree, UNICODE_ADDON)) {
    if (!TS_FILE.test(rel)) {
      out.push(`${rel} names ${UNICODE_ADDON}`);
      continue;
    }
    const hit = nodesUnder(sourceOf(tree, rel)).find((n) => ts.isStringLiteralLike(n) && n.text.startsWith(UNICODE_ADDON));
    if (hit !== undefined) out.push(`${at(hit)}: names ${hit.text}`);
  }
  return out;
}

/**
 * The fix round (D7). core.ts gives a session row `cellWidths` ONCE, inside the branch for rows on this Mac
 * (an `if` whose condition names LOCAL_MACHINE), so a session on another machine never draws with a table its
 * server was never measured for. The attack lens planted that table on the other machine's rows with every
 * rule here green.
 */
function localRowsOnly(core) {
  const out = [];
  const sets = nodesUnder(core).filter(
    (n) => (ts.isPropertyAssignment(n) || ts.isShorthandPropertyAssignment(n)) && n.name.getText() === 'cellWidths'
  );
  if (sets.length !== 1) out.push(`${F.core} gives a session row cellWidths ${String(sets.length)} time(s), not once, in the branch for rows on this Mac`);
  for (const s of sets) {
    if (!underThisMac(s)) {
      out.push(`${at(s)}: a session row is given this Mac's width table outside the branch for rows on this Mac, so a session on another machine would draw with a table its server was never measured for (D7)`);
    }
  }
  return out;
}

/** Whether a node sits in the then-branch of an `if` whose condition names LOCAL_MACHINE, in its own function. */
function underThisMac(node) {
  for (let child = node, p = node.parent; p !== undefined; child = p, p = p.parent) {
    if (ts.isIfStatement(p) && p.thenStatement === child && nodesUnder(p.expression).some((n) => ts.isIdentifier(n) && n.text === 'LOCAL_MACHINE')) return true;
    if (isFunctionLike(p)) return false;
  }
  return false;
}

// ---------------------------------------------------------------------------
// T4. Copy bounded by the width
// ---------------------------------------------------------------------------

const COPY_VERBS = ['snapshotSelection', 'copySelection', 'copySelectionAsHtml'];
/** A value read from a terminal's width. */
const FROM_COLS = { node: (n) => ts.isPropertyAccessExpression(n) && n.name.text === 'cols' };

/**
 * Probe review (2026-11-16). An end column that is `Math.min(` of something read from the terminal's cols,
 * directly or through a local constant, so no row is read past the width. `tracesBack` alone asks whether
 * cols reaches the argument at all, and `Math.max(to ?? line.length, cols)`, which reads every row to at
 * least the width, read green.
 */
function minOfCols(expr, depth = 0) {
  const x = peel(expr);
  if (x === undefined || depth > 6) return false;
  if (ts.isCallExpression(x) && calleePath(x) === 'Math.min') return x.arguments.some((a) => tracesBack(a, FROM_COLS));
  if (!ts.isIdentifier(x)) return false;
  const d = resolveLocal(x);
  return d?.kind === 'var' && d.decl.initializer !== undefined && isConst(d.decl) && minOfCols(d.decl.initializer, depth + 1);
}

/**
 * Probe review (2026-11-16). Whether EVERY value `expr` can hold is a source call (`isSource`) or nothing
 * (null or undefined): through local constants and variables (their initializer and every later
 * assignment), both arms of `??`, `||` and `?:`, and every return of a function declared in the same file
 * that it calls. `tracesBack` asks whether ONE path carries the source, which is right for a size and wrong
 * for a refusal: `opened(…) ?? text` hands window.open the raw target whenever openedAddress refuses it, and
 * read green.
 */
function onlyFrom(expr, isSource, seen = new Set(), depth = 0) {
  const x = peel(expr);
  if (x === undefined || depth > 14) return false;
  if (isNullish(x)) return true;
  if (ts.isCallExpression(x)) {
    if (isSource(x)) return true;
    const name = calleeName(x);
    const callee = peel(x.expression);
    if (name === null || !ts.isIdentifier(callee)) return false;
    const fns = functionsNamed(x.getSourceFile(), name);
    if (fns.length === 0) return false;
    const key = `ret#${x.getSourceFile().fileName}#${name}`;
    if (seen.has(key)) return true;
    const next = new Set(seen).add(key);
    return fns.every((fn) => {
      const rs = returnsOf(fn);
      return rs.length > 0 && rs.every((r) => onlyFrom(r, isSource, next, depth + 1));
    });
  }
  if (ts.isBinaryExpression(x) && [K.QuestionQuestionToken, K.BarBarToken].includes(x.operatorToken.kind)) {
    return onlyFrom(x.left, isSource, seen, depth + 1) && onlyFrom(x.right, isSource, seen, depth + 1);
  }
  if (ts.isConditionalExpression(x)) return onlyFrom(x.whenTrue, isSource, seen, depth + 1) && onlyFrom(x.whenFalse, isSource, seen, depth + 1);
  if (!ts.isIdentifier(x)) return false;
  const d = resolveLocal(x);
  if (d?.kind !== 'var' || d.decl.initializer === undefined) return false;
  return onlyFrom(d.decl.initializer, isSource, seen, depth + 1) && assignmentsTo(d.decl).every((a) => onlyFrom(a, isSource, seen, depth + 1));
}

/** serializeRow's `Math.min(` argument that names its terminal's cols, or null. */
function serializeBound(ser) {
  const row = functionsNamed(ser, 'serializeRow')[0];
  if (row === undefined) return { row: null, bound: null };
  const p0 = row.parameters[0];
  const term = p0 !== undefined && ts.isIdentifier(p0.name) ? p0.name.text : null;
  for (const c of nodesUnder(row)) {
    if (!ts.isCallExpression(c) || calleePath(c) !== 'Math.min') continue;
    const arg = c.arguments.find((a) => {
      const e = peel(a);
      return ts.isPropertyAccessExpression(e) && e.name.text === 'cols' && ts.isIdentifier(peel(e.expression)) && peel(e.expression).text === term;
    });
    if (arg !== undefined) return { row, bound: { call: c, arg } };
  }
  return { row, bound: null };
}

function t4(tree) {
  const out = [];
  const decls = declarationsNamed(tree, 'src/', 'drawnSelectionText');
  if (decls.length !== 1 || decls[0].rel !== F.drawn) {
    out.push(`drawnSelectionText is declared ${String(decls.length)} time(s), not once in ${F.drawn}`);
  }
  const drawn = sourceOf(tree, F.drawn);
  if (drawn === null) out.push(`${F.drawn} is missing`);
  else {
    const rowReads = callsUnder(drawn, 'translateToString');
    if (rowReads.length === 0) out.push(`${F.drawn} reads no row (translateToString()`);
    else if (!rowReads.some((c) => c.arguments.some((a) => tracesBack(a, FROM_COLS)))) {
      out.push(`${F.drawn}: no row is read up to the terminal's cols, so a copied row is not bounded by the width`);
    } else if (!rowReads.some((c) => c.arguments[2] !== undefined && minOfCols(c.arguments[2]))) {
      // Probe review (2026-11-16): the end column, translateToString's third argument, is what bounds a row.
      out.push(`${F.drawn}: no row's end column is Math.min( of the terminal's cols, so a copied row is not bounded by the width`);
    }
    if (stripsOf(drawn, drawn, tree).length === 0) out.push(`${F.drawn} removes no trailing space at a line's end`);
  }

  const capture = sourceOf(tree, F.capture);
  if (capture === null) out.push(`${F.capture} is missing`);
  else {
    for (const name of COPY_VERBS) {
      const fns = functionsNamed(capture, name);
      if (fns.length !== 1) out.push(`${F.capture} declares ${name} ${String(fns.length)} times, not once`);
      else if (!reaches(fns[0], 'drawnSelectionText', capture)) out.push(`${at(fns[0])}: ${name} does not read its text through drawnSelectionText(`);
    }
    for (const c of callsUnder(capture, 'getSelection')) out.push(`${at(c)}: capture/index.ts reads xterm's unbounded getSelection()`);
    const route = functionsNamed(capture, 'routePaneCopy');
    if (route.length !== 1) out.push(`${F.capture} declares routePaneCopy ${String(route.length)} times, not once`);
    else {
      if (!nodesUnder(route[0]).some((n) => stringOf(n) === 'copy')) out.push(`${at(route[0])}: routePaneCopy listens for no copy event`);
      if (!reaches(route[0], 'copySelection', capture)) out.push(`${at(route[0])}: routePaneCopy does not copy through copySelection(, so the Edit menu's Copy is not ⌘C's text`);
    }
  }

  const ser = sourceOf(tree, F.serialize);
  if (ser === null) out.push(`${F.serialize} is missing`);
  else {
    const { row, bound } = serializeBound(ser);
    if (row === null) out.push(`${F.serialize} declares no serializeRow`);
    else if (bound === null) out.push(`${at(row)}: serializeRow's row end does not name its terminal's cols, so Copy as HTML carries cells past the edge`);
  }

  const hc = sourceOf(tree, F.historyCopy);
  if (hc === null) out.push(`${F.historyCopy} is missing`);
  else {
    const compose = functionsNamed(hc, 'composeText');
    if (compose.length !== 1) out.push(`${F.historyCopy} declares composeText ${String(compose.length)} times, not once`);
    else if (stripsOf(compose[0], hc, tree).length === 0) out.push(`${at(compose[0])}: composeText keeps the spaces at a line's end`);
  }

  const pane = sourceOf(tree, F.pane);
  if (pane !== null && callsUnder(pane, 'routePaneCopy').length === 0) {
    out.push(`${F.pane} never routes the Edit menu's Copy (no routePaneCopy( call)`);
  }
  out.push(...onlyScrolledDragsHeld(tree));
  return out;
}

/**
 * The fix round (item 7, taken back out). A selection xterm made, live or scrolled back, is xterm's own: drag-
 * select.ts never reads it (`getSelectionPosition(`), and its selection change handler releases whatever was
 * held and holds nothing. Held as history it was composed through `-J`, which glued rows a program redrew
 * apart under a stale wrap mark (research 142 §2.4): 4 lines where the screen draws 11, the parent 11.
 */
function onlyScrolledDragsHeld(tree) {
  const out = [];
  const drag = sourceOf(tree, F.dragSelect);
  if (drag === null) return [`${F.dragSelect} is missing`];
  for (const c of callsUnder(drag, 'getSelectionPosition')) {
    out.push(`${at(c)}: drag-select reads xterm's own selection, so a selection that never scrolled can be held as history and composed through -J, which glues rows a program redrew apart under a stale wrap mark`);
  }
  const change = functionsNamed(drag, 'onSelectionChange');
  if (change.length !== 1) out.push(`${F.dragSelect} declares onSelectionChange ${String(change.length)} times, not once`);
  else {
    if (callsUnder(change[0], 'hold').length > 0) out.push(`${at(change[0])}: a selection change xterm reports is held as history rather than released`);
    if (!reaches(change[0], 'release', drag)) out.push(`${at(change[0])}: a selection change xterm reports does not release what was held`);
  }
  return out;
}

// ---------------------------------------------------------------------------
// T5. The link handler's one route, and its refusals
// ---------------------------------------------------------------------------

const OPENER_ROOTS = new Set(['window', 'globalThis', 'self', 'top', 'parent', 'opener']);
/** A call that opens a window: `window.open(`, its spellings on another global, or a bare global `open(`. */
function isOpenCall(n) {
  if (!ts.isCallExpression(n)) return false;
  const callee = peel(n.expression);
  const names = tailNames(callee);
  if (ts.isIdentifier(callee)) return callee.text === 'open' && resolveLocal(callee) === null;
  return names[0] === 'open' && names.length >= 2 && OPENER_ROOTS.has(names[names.length - 1]);
}

/** Every way the links folder names a route to a browser other than main's gate. */
function refusedRoutes(sf) {
  const out = [];
  for (const n of nodesUnder(sf)) {
    if (ts.isElementAccessExpression(n) && REFUSED_ROUTES.includes(stringOf(n.argumentExpression) ?? '')) {
      out.push(`${at(n)}: names ${stringOf(n.argumentExpression)}`);
      continue;
    }
    if (!ts.isIdentifier(n) || !REFUSED_ROUTES.includes(n.text) || isInType(n)) continue;
    const p = n.parent;
    if (ts.isPropertyAccessExpression(p) && p.name === n) {
      out.push(`${at(n)}: names .${n.text}`);
      continue;
    }
    if (p !== undefined && (ts.isImportSpecifier(p) || ts.isImportClause(p) || ts.isNamespaceImport(p))) {
      out.push(`${at(n)}: imports ${n.text}`);
      continue;
    }
    if (isDeclarationName(n)) continue; // a key or a local binding of that name is not a route
    if (resolveLocal(n) === null) out.push(`${at(n)}: names the global ${n.text}`);
  }
  return out;
}

const linkFiles = (tree) => tree.files(F.linksDir).filter(isProductionCode);

function t5(tree) {
  const out = [];
  const pane = sourceOf(tree, F.pane);
  if (pane === null) out.push(`${F.pane} is missing`);
  else {
    const terms = nodesUnder(pane).filter(isNewTerminal);
    if (terms.length === 0) out.push(`${F.pane} makes no terminal`);
    for (const t of terms) {
      const opts = optionsOf(t);
      const prop = opts === null ? null : propertyNamed(opts, 'linkHandler');
      if (prop === null || isNullish(valueOfProperty(prop))) out.push(`${at(t)}: the pane's terminal is made with no linkHandler, so a click on a link runs xterm's own confirm and opens nothing`);
    }
  }
  const files = linkFiles(tree);
  for (const rel of [F.handler, F.rules]) if (!files.includes(rel)) out.push(`${rel} is missing`);
  const opens = [];
  for (const rel of files) {
    const sf = sourceOf(tree, rel);
    opens.push(...nodesUnder(sf).filter(isOpenCall));
    out.push(...refusedRoutes(sf));
  }
  if (files.length > 0 && opens.length !== 1) {
    out.push(`the links open a window ${String(opens.length)} times${opens.length > 0 ? ` (${opens.map(at).join(', ')})` : ''}, not once`);
  }
  for (const o of opens) {
    if (o.getSourceFile().fileName !== F.handler) out.push(`${at(o)}: a link is opened outside ${F.handler}`);
    if (calleePath(o) !== 'window.open') out.push(`${at(o)}: a link is opened by ${calleePath(o) ?? 'a computed callee'}, not window.open, so main's gate may not decide`);
    if (o.arguments.length !== 3 || stringOf(o.arguments[1]) !== '_blank' || stringOf(o.arguments[2]) !== 'noopener,noreferrer') {
      out.push(`${at(o)}: window.open is not handed exactly an address, '_blank' and 'noopener,noreferrer'`);
    }
    if (o.arguments[0] === undefined || !tracesBack(o.arguments[0], { call: (c) => calleeName(c) === 'openedAddress' })) {
      out.push(`${at(o)}: the address window.open is handed is not openedAddress('s answer, so the refusals are skipped`);
    } else if (!onlyFrom(o.arguments[0], (c) => calleeName(c) === 'openedAddress')) {
      // Probe review (2026-11-16): every value it can be handed, not one of them.
      out.push(`${at(o)}: window.open can be handed a value other than openedAddress('s answer (another arm of a ??, || or ?:), so a refused target can still open`);
    }
  }
  const rules = sourceOf(tree, F.rules);
  if (rules !== null) {
    const opened = functionsNamed(rules, 'openedAddress');
    if (opened.length !== 1) out.push(`${F.rules} declares openedAddress ${String(opened.length)} times, not once`);
    // Every check must be one openedAddress can reach: a refusal in a
    // function nothing on its path calls refuses nothing.
    const reached = opened.length === 1 ? reachableFrom(opened[0], rules) : [];
    const inReach = (n) => usesOf(n).some((use) => reached.some((fn) => use.pos >= fn.pos && use.end <= fn.end));
    for (const name of ['protocol', 'username', 'password']) {
      const reads = nodesUnder(rules).filter((n) => ts.isPropertyAccessExpression(n) && n.name.text === name);
      if (reads.length === 0) out.push(`${F.rules} never reads an address's ${name}`);
      else if (!reads.some(inReach)) out.push(`${at(reads[0])}: the ${name} check is not on openedAddress's path`);
    }
    for (const scheme of ['http:', 'https:']) {
      const named = nodesUnder(rules).filter((n) => stringOf(n) === scheme);
      if (named.length === 0) out.push(`${F.rules} never names ${scheme}`);
      else if (!named.some(inReach)) out.push(`${at(named[0])}: ${scheme} is not checked on openedAddress's path`);
    }
    const bounds = nodesUnder(rules).filter((n) => ts.isNumericLiteral(n) && Number(n.text.replace(/_/g, '')) === 2048);
    if (bounds.length === 0) out.push(`${F.rules} holds no 2,048 bound on an address`);
    else if (!bounds.some(inReach)) out.push(`${at(bounds[0])}: the 2,048 bound is not on openedAddress's path`);
    if (!nodesUnder(rules).some((n) => ts.isNewExpression(n) && pathOf(n.expression) === 'URL')) out.push(`${F.rules} never parses an address with new URL(`);
  }
  const handler = sourceOf(tree, F.handler);
  if (handler !== null) out.push(...pathRoute(handler), ...hoverSaysWhatOpens(handler));
  return out;
}

/** Whether a call is `x.activate(…)`: a link's own activation. */
const isActivateCall = (n) => {
  if (!ts.isCallExpression(n)) return false;
  const callee = peel(n.expression);
  return ts.isPropertyAccessExpression(callee) && callee.name.text === 'activate';
};

/**
 * The fix round (D14 rule 0): one route per kind. The handler's only effect besides its one `window.open` is ONE
 * `.activate(` of a path link, called on the value `pathFor(` hands its callback, and `pathFor` hands it only
 * `pathUnder(`'s answer or null, after `pathMayDecide(`. So a file an agent linked to a web page opens the
 * file, as before links reached the terminal, and a click can never open a path the pointer is not on, nor
 * one where a web address holds the cell.
 */
function pathRoute(handler) {
  const out = [];
  const activations = nodesUnder(handler).filter(isActivateCall);
  if (activations.length !== 1) out.push(`${F.handler} calls .activate( ${String(activations.length)} times; its one route besides window.open is the path link pathFor( hands it`);
  for (const a of activations) {
    const recv = peel(peel(a.expression).expression);
    const d = recv !== undefined && ts.isIdentifier(recv) ? resolveLocal(recv) : null;
    const cb = d?.kind === 'param' ? d.fn : null;
    const ok = cb !== null && cb.parent !== undefined && ts.isCallExpression(cb.parent) && calleeName(cb.parent) === 'pathFor' && cb.parent.arguments.includes(cb);
    if (!ok) out.push(`${at(a)}: .activate( is called on something other than the path link pathFor( hands its callback`);
  }
  const fns = functionsNamed(handler, 'pathFor');
  if (fns.length !== 1) return [...out, `${F.handler} declares pathFor ${String(fns.length)} times, not once`];
  const fn = fns[0];
  const p2 = fn.parameters[2];
  const thenName = p2 !== undefined && ts.isIdentifier(p2.name) ? p2.name.text : null;
  const thenCalls = thenName === null ? [] : nodesUnder(fn).filter((n) => ts.isCallExpression(n) && ts.isIdentifier(peel(n.expression)) && peel(n.expression).text === thenName);
  if (thenCalls.length === 0) out.push(`${at(fn)}: pathFor never answers its callback`);
  for (const c of thenCalls) {
    if (c.arguments[0] === undefined || !onlyFrom(c.arguments[0], (x) => calleeName(x) === 'pathUnder')) {
      out.push(`${at(c)}: pathFor hands its callback something other than pathUnder('s answer, so a click can open a path the pointer is not on`);
    }
  }
  if (!reaches(fn, 'pathMayDecide', handler)) out.push(`${at(fn)}: pathFor never asks pathMayDecide(, so a path can take a click from a web address that holds the cell`);
  return out;
}

/**
 * The fix round (D16): the hover line says the address a click opens and nothing else. `hoverText(` is called
 * once, on the address `showLine` is handed, and every `showLine(` is handed `openedAddress(`'s answer or
 * null. The attack lens planted the raw target on the line with every rule here green.
 */
function hoverSaysWhatOpens(handler) {
  const out = [];
  const shows = functionsNamed(handler, 'showLine');
  if (shows.length !== 1) return [`${F.handler} declares showLine ${String(shows.length)} times, not once`];
  const show = shows[0];
  const hovers = callsUnder(handler, 'hoverText');
  if (hovers.length !== 1) out.push(`${F.handler} calls hoverText( ${String(hovers.length)} times, not once`);
  for (const h of hovers) {
    const arg = h.arguments[0] === undefined ? undefined : peel(h.arguments[0]);
    const d = arg !== undefined && ts.isIdentifier(arg) ? resolveLocal(arg) : null;
    if (!(d?.kind === 'param' && d.fn === show && d.index === 0)) out.push(`${at(h)}: the hover line is drawn from something other than the address showLine was handed`);
  }
  const calls = callsUnder(handler, 'showLine');
  if (calls.length === 0) out.push(`${F.handler} never draws the hover line`);
  for (const c of calls) {
    if (c.arguments[0] === undefined || !onlyFrom(c.arguments[0], (x) => calleeName(x) === 'openedAddress')) {
      out.push(`${at(c)}: the hover line can say something other than the address a click opens (D16)`);
    }
  }
  return out;
}

/** Every function a file declares that `fn` reaches by calling it, `fn` included. */
function reachableFrom(fn, sf) {
  const seen = new Set([fn]);
  const queue = [fn];
  while (queue.length > 0) {
    const f = queue.shift();
    for (const c of nodesUnder(f).filter(ts.isCallExpression)) {
      const name = calleeName(c);
      if (name === null) continue;
      for (const g of functionsNamed(sf, name)) {
        if (!seen.has(g)) {
          seen.add(g);
          queue.push(g);
        }
      }
    }
  }
  return [...seen];
}

// ---------------------------------------------------------------------------
// T6 and T8. Never allowNonHttpProtocols, never FORCE_HYPERLINK
// ---------------------------------------------------------------------------

const t6 = (tree) => namedNowhere(tree, 'allowNonHttpProtocols');

/** The private server's configuration with its comment lines blanked. */
function confCode(text) {
  return text
    .split('\n')
    .map((line) => (/^\s*#/.test(line) ? '' : line))
    .join('\n');
}

function t8(tree) {
  const out = namedNowhere(tree, 'FORCE_HYPERLINK');
  const conf = tree.text(F.conf);
  if (conf === null) out.push(`${F.conf} is missing`);
  else if (confCode(conf).includes('FORCE_HYPERLINK')) {
    const line = confCode(conf).split('\n').findIndex((l) => l.includes('FORCE_HYPERLINK')) + 1;
    out.push(`${F.conf}:${String(line)} puts FORCE_HYPERLINK in every pane's environment`);
  }
  return out;
}

// ---------------------------------------------------------------------------
// T7. -T hyperlinks on the local attach, and on another machine only behind the gate
// ---------------------------------------------------------------------------

/** An array's string elements, with a spread of a module const array expanded; anything else is null. */
function flatten(arr, sf, depth = 0) {
  const out = [];
  for (const e of arr.elements) {
    const v = stringOf(e);
    if (v !== null) {
      out.push({ value: v, node: e });
      continue;
    }
    if (ts.isSpreadElement(e) && ts.isIdentifier(peel(e.expression)) && depth < 3) {
      const d = resolveLocal(peel(e.expression));
      const init = d?.kind === 'var' ? peelValue(d.decl.initializer) : undefined;
      if (init !== undefined && ts.isArrayLiteralExpression(init)) {
        out.push(...flatten(init, sf, depth + 1));
        continue;
      }
    }
    out.push({ value: null, node: e });
  }
  return out;
}

/** The local attach argv: an array holding '-L' and 'attach-session'. */
const localArgvs = (plan) =>
  nodesUnder(plan)
    .filter(ts.isArrayLiteralExpression)
    .filter((a) => {
      const values = flatten(a, plan).map((x) => x.value);
      return values.includes('-L') && values.includes('attach-session');
    });

const HYPERLINKS_FLAG = (n) =>
  (ts.isPropertyAccessExpression(n) && n.name.text === 'hyperlinks') || (ts.isIdentifier(n) && n.text === 'hyperlinks');

/** Every production object property named `hyperlinks` under src/main. */
function hyperlinkProperties(tree) {
  const out = [];
  for (const rel of srcFilesNaming(tree, 'hyperlinks')) {
    if (!rel.startsWith('src/main/') || !isProductionCode(rel)) continue;
    for (const n of nodesUnder(sourceOf(tree, rel))) {
      if ((ts.isPropertyAssignment(n) || ts.isShorthandPropertyAssignment(n)) && ts.isIdentifier(n.name) && n.name.text === 'hyperlinks' && ts.isObjectLiteralExpression(n.parent)) {
        out.push(n);
      }
    }
  }
  return out;
}

/** A tmux version `HYPERLINK_FAR_VERSIONS` may hold: well formed, and 3.4 or later. */
function versionFloor(v) {
  const m = /^(\d+)\.(\d+)([a-z]?)$/.exec(v);
  if (m === null) return 'is not a tmux version';
  const major = Number(m[1]);
  const minor = Number(m[2]);
  return major > 3 || (major === 3 && minor >= 4) ? null : 'is below 3.4, which has no hyperlinks feature at index 4';
}

function farVersions(tree) {
  const decls = declarationsNamed(tree, 'src/', 'HYPERLINK_FAR_VERSIONS');
  const d = decls.length === 1 ? decls[0].node : null;
  const init = d === null || !ts.isVariableDeclaration(d) ? undefined : peelValue(d.initializer);
  return { decls, array: init !== undefined && ts.isArrayLiteralExpression(init) ? init : null };
}

function t7(tree) {
  const out = [];
  const plan = sourceOf(tree, F.plan);
  if (plan === null) out.push(`${F.plan} is missing`);
  else {
    const locals = localArgvs(plan);
    if (locals.length === 0) out.push(`${F.plan} composes no local attach argv this gate can read`);
    for (const argvNode of locals) {
      const values = flatten(argvNode, plan).map((x) => x.value);
      const t = values.findIndex((v, i) => v === '-T' && values[i + 1] === 'hyperlinks');
      if (t < 0 || t > values.indexOf('attach-session')) out.push(`${at(argvNode)}: the local attach argv carries no -T hyperlinks before attach-session, so tmux strips every link`);
    }
    const far = nodesUnder(plan).filter((n) => stringOf(n) === 'hyperlinks' && !locals.some((l) => n.pos >= l.pos && n.end <= l.end));
    const farUses = far.flatMap((lit) => usesOf(lit).map((use) => ({ lit, use }))).filter(({ use }) => !locals.some((l) => use.pos >= l.pos && use.end <= l.end));
    if (farUses.length === 0) out.push(`${F.plan} composes no far attach that can carry -T hyperlinks`);
    for (const { lit, use } of farUses) {
      const p = lit.parent;
      const before = p !== undefined && ts.isArrayLiteralExpression(p) ? stringOf(p.elements[p.elements.indexOf(lit) - 1]) : null;
      if (before !== '-T') out.push(`${at(lit)}: the far 'hyperlinks' does not follow -T`);
      if (!guardedSite(use, HYPERLINKS_FLAG, tree)) out.push(`${at(use)}: the far attach carries -T hyperlinks without its target saying hyperlinks`);
    }
  }

  const props = hyperlinkProperties(tree);
  if (props.length === 0) out.push(`no production code under src/main hands an attach target hyperlinks, so no far attach ever carries the flag`);
  for (const p of props) {
    const value = valueOfProperty(p);
    if (peel(value).kind === K.FalseKeyword) continue;
    if (!tracesBack(value, { call: (c) => calleeName(c) === 'farAttachHyperlinks' })) {
      out.push(`${at(p)}: hyperlinks is decided by something other than farAttachHyperlinks(`);
    }
  }

  const gate = sourceOf(tree, F.gate);
  if (gate === null) out.push(`${F.gate} is missing`);
  else {
    const deciders = declarationsNamed(tree, 'src/', 'farAttachHyperlinks');
    if (deciders.length !== 1 || deciders[0].rel !== F.gate) out.push(`farAttachHyperlinks is declared ${String(deciders.length)} time(s), not once in ${F.gate}`);
    const own = functionsNamed(gate, 'farAttachHyperlinks')[0];
    if (own !== undefined && !reaches(own, 'farPairOf', gate)) out.push(`${at(own)}: farAttachHyperlinks does not read the machine's pair (farPairOf()`);
    for (const field of ['server', 'program']) {
      if (!nodesUnder(gate).some((n) => ts.isPropertyAccessExpression(n) && n.name.text === field)) {
        out.push(`${F.gate} never reads the far ${field}'s version; the flag needs both the far program and the far server at 3.4 or later`);
      }
    }
    if (!nodesUnder(gate).some((n) => ts.isIdentifier(n) && n.text === 'HYPERLINK_FAR_VERSIONS' && !isDeclarationName(n))) {
      out.push(`${F.gate} never reads HYPERLINK_FAR_VERSIONS`);
    }
  }
  const { decls, array } = farVersions(tree);
  if (decls.length !== 1) out.push(`HYPERLINK_FAR_VERSIONS is declared ${String(decls.length)} time(s), not once`);
  else if (array === null) out.push(`${at(decls[0].node)}: HYPERLINK_FAR_VERSIONS is not an array of versions this gate can read`);
  else {
    if (array.elements.length === 0) out.push(`${at(array)}: HYPERLINK_FAR_VERSIONS is empty`);
    for (const e of array.elements) {
      const v = stringOf(e);
      const why = v === null ? 'is not a string literal' : versionFloor(v);
      if (why !== null) out.push(`${at(e)}: ${v ?? e.getText()} ${why}`);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// T9. The frame re-freeze is this Mac's alone
// ---------------------------------------------------------------------------

const FLAG = 'synchronized_output_flag';
const REFRESH = 'refresh-from-pane';
const THIS_MACS_RUNNER = (n) => ts.isCallExpression(n) && calleeName(n) === 'isThisMacsRunner';
const flagLiterals = (sf) => nodesUnder(sf).filter((n) => (ts.isStringLiteralLike(n) || ts.isTemplateHead(n) || ts.isTemplateMiddle(n) || ts.isTemplateTail(n)) && n.text.includes(FLAG));

function t9(tree) {
  const out = [];
  for (const rel of srcFilesNaming(tree, FLAG)) {
    if (rel === F.scroll || !isProductionCode(rel)) continue;
    const where = codeMention(tree, rel, FLAG);
    if (where !== null) out.push(`${where} names ${FLAG}; the re-freeze is this Mac's and is read in scroll.ts alone`);
  }
  const scroll = sourceOf(tree, F.scroll);
  if (scroll === null) {
    out.push(`${F.scroll} is missing`);
    return out;
  }
  const literals = flagLiterals(scroll);
  if (literals.length === 0) out.push(`${F.scroll} never reads ${FLAG}, so a scrollback entered inside a frame is never re-frozen`);
  for (const use of literals.flatMap((l) => usesOf(l))) {
    if (!guardedSite(use, THIS_MACS_RUNNER, tree)) out.push(`${at(use)}: ${FLAG} is read where isThisMacsRunner( does not hold`);
  }
  for (const rel of srcFilesNaming(tree, REFRESH)) {
    if (!isProductionCode(rel)) continue;
    for (const lit of nodesUnder(sourceOf(tree, rel)).filter((n) => ts.isStringLiteralLike(n) && n.text.includes(REFRESH))) {
      for (const use of usesOf(lit)) {
        const fn = namedEnclosing(use);
        if (rel !== F.scroll || fn === null || nameOfFunction(fn) !== 'refreeze') out.push(`${at(use)}: ${REFRESH} is sent outside refreeze`);
      }
    }
  }
  const refreezes = callsUnder(scroll, 'refreeze');
  for (const c of refreezes) {
    if (!guardedSite(c, THIS_MACS_RUNNER, tree)) out.push(`${at(c)}: refreeze( is called where isThisMacsRunner( does not hold`);
  }
  return out;
}

// ---------------------------------------------------------------------------
// The attacks: ablations that must read red, controls that must read green
// ---------------------------------------------------------------------------

const splice = (text, start, end, to) => text.slice(0, start) + to + text.slice(end);
const replaceNode = (text, node, to) => splice(text, node.getStart(), node.getEnd(), to);
const nodeText = (node) => node.getSourceFile().text.slice(node.getStart(), node.getEnd());

/** Apply several replacements to one text, last first, refusing overlaps. */
function applyEdits(text, edits) {
  const sorted = [...edits].sort((a, b) => b.start - a.start);
  let out = text;
  let floor = Infinity;
  for (const e of sorted) {
    if (e.end > floor) return null;
    out = splice(out, e.start, e.end, e.to);
    floor = e.start;
  }
  return out;
}
const editOf = (node, to) => ({ start: node.getStart(), end: node.getEnd(), to });

/** A copy of the tree with one file rewritten by `change(text, sf)`, or null when nothing changed. */
function edit(tree, rel, change) {
  const sf = sourceOf(tree, rel);
  if (sf === null) return null;
  const next = change(sf.text, sf);
  return next === null || next === undefined || next === sf.text ? null : tree.with(rel, next);
}
const appendTo = (tree, rel, addition) => {
  const text = tree.text(rel);
  return text === null ? null : tree.with(rel, `${text}\n${addition}\n`);
};
const addFile = (tree, rel, text) => (tree.has(rel) ? null : tree.with(rel, text));

/** The edit that rebuilds an array literal, an object literal or a call's arguments without some items. */
function withoutEdit(container, drop) {
  const items = ts.isArrayLiteralExpression(container)
    ? container.elements
    : ts.isObjectLiteralExpression(container)
      ? container.properties
      : container.arguments;
  const kept = items.filter((n) => !drop.includes(n)).map(nodeText);
  if (kept.length === items.length) return null;
  if (ts.isArrayLiteralExpression(container)) return editOf(container, `[${kept.join(', ')}]`);
  if (ts.isObjectLiteralExpression(container)) return editOf(container, kept.length === 0 ? '{}' : `{ ${kept.join(', ')} }`);
  return { start: container.arguments.pos, end: container.arguments.end, to: kept.join(', ') };
}

/** `text` with an array literal, an object literal or a call's arguments rebuilt without some items. */
function without(text, container, drop) {
  const e = withoutEdit(container, drop);
  return e === null ? null : splice(text, e.start, e.end, e.to);
}

/**
 * The expression whose value a links file's `window.open(` is handed: the initializer of the local it names,
 * or its first argument itself. Null when there is no such call. (Probe review, 2026-11-16.)
 */
function handedToOpen(sf) {
  const o = nodesUnder(sf).find(isOpenCall);
  const arg = o?.arguments[0] === undefined ? undefined : peel(o.arguments[0]);
  if (arg === undefined) return null;
  if (ts.isIdentifier(arg)) {
    const d = resolveLocal(arg);
    if (d?.kind === 'var' && d.decl.initializer !== undefined) return d.decl.initializer;
  }
  return arg;
}

/** The first statement under `root` whose expression is a call of `name`, or the call itself. */
function callStatement(root, name) {
  const call = callsUnder(root, name)[0];
  if (call === undefined) return null;
  for (let p = call.parent; p !== undefined; p = p.parent) {
    if (ts.isExpressionStatement(p)) return p;
    if (isFunctionLike(p) || ts.isBlock(p)) break;
  }
  return call;
}

const ABLATIONS = {
  T1: [
    // Probe review (2026-11-16): the size still from attachSizeFor, its fields crossed.
    ["the local attach's cols and rows crossed", (tree) => edit(tree, F.core, (text, sf) => {
      const a = attachCalls(sf)[0];
      const obj = a === undefined ? undefined : peel(a.arguments[0]);
      if (obj === undefined || !ts.isObjectLiteralExpression(obj)) return null;
      const props = [];
      const collect = (o) => {
        for (const p of o.properties) {
          if (ts.isPropertyAssignment(p) && ['cols', 'rows'].includes(p.name.getText())) props.push(p);
          else if (ts.isSpreadAssignment(p)) for (const n of nodesUnder(p.expression)) if (ts.isObjectLiteralExpression(n)) collect(n);
        }
      };
      collect(obj);
      const cols = props.find((p) => p.name.getText() === 'cols');
      const rows = props.find((p) => p.name.getText() === 'rows');
      return cols === undefined || rows === undefined ? null : applyEdits(text, [editOf(cols.initializer, nodeText(rows.initializer)), editOf(rows.initializer, nodeText(cols.initializer))]);
    })],
    ['drop the size from the local attach', (tree) => edit(tree, F.core, (text, sf) => {
      const a = attachCalls(sf)[0];
      const obj = a === undefined ? undefined : peel(a.arguments[0]);
      if (obj === undefined || !ts.isObjectLiteralExpression(obj)) return null;
      const drop = obj.properties.filter((p) => ts.isSpreadAssignment(p) || (p.name !== undefined && ['cols', 'rows'].includes(p.name.getText())));
      return without(text, obj, drop);
    })],
    ['drop the size from the listed-remote attach, which the far wait ends in', (tree) => edit(tree, F.core, (text, sf) => {
      const a = attachCalls(sf)[1];
      const obj = a === undefined ? undefined : peel(a.arguments[0]);
      if (obj === undefined || !ts.isObjectLiteralExpression(obj)) return null;
      const drop = obj.properties.filter((p) => ts.isSpreadAssignment(p) || (p.name !== undefined && ['cols', 'rows'].includes(p.name.getText())));
      return without(text, obj, drop);
    })],
    ['the far wait hands the listed-remote attach no size', (tree) => edit(tree, F.core, (text, sf) => {
      const far = functionsNamed(sf, 'attachFarUnbound')[0];
      const listed = functionsNamed(sf, 'attachListedRemote')[0];
      if (far === undefined || listed === undefined) return null;
      const indices = sizeParameterIndices(listed);
      const edits = callsUnder(far, 'attachListedRemote').flatMap((c) =>
        indices.filter((i) => c.arguments[i] !== undefined).map((i) => editOf(c.arguments[i], 'null'))
      );
      return edits.length === 0 ? null : applyEdits(text, edits);
    })],
    ['the preload forwards one argument', (tree) => edit(tree, F.preload, (text, sf) => {
      const c = nodesUnder(sf).find((n) => ts.isCallExpression(n) && stringOf(n.arguments[0]) === IPC_ATTACH);
      return c === undefined ? null : without(text, c, c.arguments.slice(2));
    })],
    ['main hands attachSession no size', (tree) => edit(tree, F.ipc, (text, sf) => {
      const i = attachSizeIndex(tree);
      const c = callsUnder(sf, 'attachSession').find((x) => x.arguments[i] !== undefined);
      return c === undefined ? null : without(text, c, [c.arguments[i]]);
    })],
    ['the pane attaches with its id alone', (tree) => edit(tree, F.pane, (text, sf) => {
      const c = nodesUnder(sf).find((n) => ts.isCallExpression(n) && /(?:^|\.)sessions\.attach$/.test(calleePath(n) ?? ''));
      return c === undefined ? null : without(text, c, c.arguments.slice(1));
    })],
    ['the request\'s size never reaches attachSizeFor', (tree) => edit(tree, F.core, (text, sf) => {
      const edits = callsUnder(sf, 'attachSizeFor').filter((c) => c.arguments[0] !== undefined).map((c) => editOf(c.arguments[0], 'undefined'));
      return edits.length === 0 ? null : applyEdits(text, edits);
    })],
    ['attachSizeFor answers the last fitted size alone', (tree) => edit(tree, F.core, (text, sf) => {
      const fn = functionsNamed(sf, 'attachSizeFor')[0];
      const p = fn?.parameters[0];
      if (fn === undefined || fn.body === undefined || p === undefined || !ts.isIdentifier(p.name)) return null;
      return replaceNode(text, fn.body, `{\n    void sanitizeTerminalSize(${p.name.text});\n    return this.lastFittedSize ?? null;\n  }`);
    })],
    ['the attach contract names no size', (tree) => edit(tree, F.base, (text, sf) => {
      const member = interfaceMember(sf, 'InvokeChannelMap', IPC_ATTACH);
      const req = member === null ? null : typeMember(member.type, 'req');
      if (req === null || req.type === undefined || !ts.isTupleTypeNode(req.type)) return null;
      return replaceNode(text, req.type, `[${nodeText(req.type.elements[0])}]`);
    })],
    // The fix round: the attack lens's hidden pane, a client spawned at the window's size beside a terminal
    // still at its unfitted 80 by 24.
    ['the pane attaches at the size it wanted, not the size its terminal is at', (tree) => edit(tree, F.pane, (text, sf) => {
      const settle = callsUnder(sf, 'settleForAttach')[0];
      const wanted = settle?.arguments[1];
      return settle === undefined || wanted === undefined ? null : replaceNode(text, settle, nodeText(wanted));
    })],
    ['settleForAttach answers the size it was handed', (tree) => edit(tree, F.tabSize, (text, sf) => {
      const fn = functionsNamed(sf, 'settleForAttach')[0];
      const p1 = fn?.parameters[1];
      if (fn === undefined || p1 === undefined || !ts.isIdentifier(p1.name)) return null;
      const rs = returnsOf(fn);
      return rs.length === 0 ? null : applyEdits(text, rs.map((r) => editOf(r, p1.name.text)));
    })],
    ['settleForAttach never moves the terminal', (tree) => edit(tree, F.tabSize, (text, sf) => {
      const fn = functionsNamed(sf, 'settleForAttach')[0];
      const moves = fn === undefined ? [] : callsUnder(fn, 'resize');
      return moves.length === 0 ? null : applyEdits(text, moves.map((m) => editOf(m, 'void 0')));
    })]
  ],
  T2: [
    ['delete the -x push from this Mac\'s new-session line', (tree) => edit(tree, F.tmuxSessions, (text, sf) => {
      const fn = functionsNamed(sf, 'createSession')[0];
      const { fed } = fn === undefined ? { fed: null } : sizeFlag(fn, '-x', 'cols');
      return fed === null ? null : without(text, fed.parent, [fed, nextSibling(fed)]);
    })],
    ['delete the -x push from another machine\'s new-session line', (tree) => edit(tree, F.remoteSessions, (text, sf) => {
      const fn = functionsNamed(sf, 'remoteCreateArgs')[0];
      const { fed } = fn === undefined ? { fed: null } : sizeFlag(fn, '-x', 'cols');
      return fed === null ? null : without(text, fed.parent, [fed, nextSibling(fed)]);
    })],
    ['the size put on an array the new-session line never sends', (tree) => edit(tree, F.tmuxSessions, (text, sf) => {
      const fn = functionsNamed(sf, 'createSession')[0];
      const { fed } = fn === undefined ? { fed: null } : sizeFlag(fn, '-x', 'cols');
      if (fed === null || fn.body === undefined) return null;
      const value = nextSibling(fed);
      const moved = withoutEdit(fed.parent, [fed, value]);
      if (moved === null) return null;
      return applyEdits(text, [
        moved,
        { start: fn.body.getStart() + 1, end: fn.body.getStart() + 1, to: `\n  const selfTestUnsent = [${nodeText(fed)}, ${nodeText(value)}];` }
      ]);
    })],
    ['the -y value no longer from the sanitizer', (tree) => edit(tree, F.tmuxSessions, (text, sf) => {
      const fn = functionsNamed(sf, 'createSession')[0];
      const { fed } = fn === undefined ? { fed: null } : sizeFlag(fn, '-y', 'rows');
      return fed === null ? null : replaceNode(text, nextSibling(fed), "'24'");
    })],
    ['drop the size from restore.ts\' create', (tree) => edit(tree, F.restore, (text) => {
      const s = (createSites(tree, F.restore, 'tmux.createSession', null) ?? []).find((x) => x.size !== null);
      return s === undefined ? null : without(text, s.size.parent, [s.size]);
    })],
    ['drop the size from create-local.ts\' create on this Mac', (tree) => edit(tree, F.createLocal, (text) => {
      const s = (createSites(tree, F.createLocal, 'tmux.createSession', null) ?? []).find((x) => x.size !== null);
      return s === undefined ? null : without(text, s.size.parent, [s.size]);
    })],
    ['drop the size from remote-restore.ts\' create', (tree) => edit(tree, F.remoteRestore, (text) => {
      const s = (createSites(tree, F.remoteRestore, 'remoteCreateArgs', null) ?? []).find((x) => x.size !== null);
      return s === undefined ? null : without(text, s.size.parent, [s.size]);
    })],
    ['the core\'s local restore hands restore.ts no size', (tree) => edit(tree, F.core, (text, sf) => {
      const c = callsUnder(sf, 'restoreSessionInTmux')[0];
      const opts = c === undefined ? undefined : c.arguments.map(peel).find((a) => a !== undefined && ts.isObjectLiteralExpression(a) && deepProperty(a, 'size') !== null);
      if (opts === undefined) return null;
      const p = deepProperty(opts, 'size');
      return without(text, p.parent, [p]);
    })],
    ['the core\'s restores sized without the request\'s own size', (tree) => edit(tree, F.core, (text, sf) => {
      const c = callsUnder(sf, 'restoreSessionInTmux')[0];
      const fn = c === undefined ? null : namedEnclosing(c);
      if (fn === null) return null;
      const reads = nodesUnder(fn).filter((n) => ts.isPropertyAccessExpression(n) && n.name.text === 'size' && !(ts.isPropertyAccessExpression(n.parent) && n.parent.expression === n));
      return reads.length === 0 ? null : applyEdits(text, reads.map((n) => editOf(n, 'undefined')));
    })],
    ['create-local.ts sizes a create without the request\'s own size', (tree) => edit(tree, F.createLocal, (text, sf) => {
      const calls = callsUnder(sf, 'sanitizeTerminalSize').filter((c) => c.arguments[0] !== undefined);
      return calls.length === 0 ? null : applyEdits(text, calls.map((c) => editOf(c.arguments[0], 'undefined')));
    })]
  ],
  T3: [
    ['remove the registration from history-copy.ts', (tree) => edit(tree, F.historyCopy, (text, sf) => {
      const s = callStatement(sf, 'registerTmuxWidths');
      return s === null ? null : replaceNode(text, s, ts.isExpressionStatement(s) ? ';' : 'undefined');
    })],
    ['remove the registration from the capture terminal (rasterizeRows)', (tree) => edit(tree, F.capture, (text, sf) => {
      const s = callStatement(sf, 'registerTmuxWidths');
      return s === null ? null : replaceNode(text, s, ts.isExpressionStatement(s) ? ';' : 'undefined');
    })],
    ['declare a second nextCell', (tree) => addFile(tree, 'src/main/screen/p368-self-test-cells.ts', 'export function nextCell(state: number): number {\n  return state;\n}\n')],
    ['add @xterm/addon-unicode11 to a copy of package.json', (tree) => {
      const text = tree.text(F.pkg);
      if (text === null) return null;
      const pkg = JSON.parse(text);
      pkg.dependencies = { ...(pkg.dependencies ?? {}), '@xterm/addon-unicode11': '0.9.0' };
      return tree.with(F.pkg, `${JSON.stringify(pkg, null, 2)}\n`);
    }],
    ['import @xterm/addon-unicode11 in the pane', (tree) => edit(tree, F.pane, (text) => `import { Unicode11Addon } from '@xterm/addon-unicode11';\nvoid Unicode11Addon;\n${text}`)],
    ['the pane\'s terminal made without allowProposedApi', (tree) => edit(tree, F.pane, (text, sf) => {
      const opts = nodesUnder(sf).filter(isNewTerminal).map(optionsOf).find((o) => o !== null && propertyNamed(o, 'allowProposedApi') !== null);
      return opts === undefined ? null : without(text, opts, [propertyNamed(opts, 'allowProposedApi')]);
    })],
    ['the pane registers no table', (tree) => edit(tree, F.pane, (text, sf) => {
      const c = callsUnder(sf, 'registerTmuxWidths')[0];
      return c === undefined || c.arguments[1] === undefined ? null : replaceNode(text, c.arguments[1], 'null');
    })],
    ["the pane falls back to this Mac's table for a row that names none", (tree) => edit(tree, F.pane, (text, sf) => {
      const c = callsUnder(sf, 'registerTmuxWidths')[0];
      return c === undefined || c.arguments[1] === undefined ? null : replaceNode(text, c.arguments[1], `(${nodeText(c.arguments[1])}) ?? '3.7b'`);
    })],
    ['a second width provider in the renderer', (tree) => addFile(tree, 'src/renderer/terminal/p368-self-test-widths.ts', "export const selfTestProvider = {\n  version: 'self-test',\n  wcwidth: (cp: number): number => (cp > 0 ? 1 : 0),\n  charProperties: (cp: number, preceding: number): number => cp + preceding\n};\n")],
    ['the provider registered but never made active', (tree) => edit(tree, F.widths, (text) => {
      const { activations } = unicodeTouches(tree);
      const own = activations.filter((a) => a.getSourceFile().fileName === F.widths);
      return own.length === 0 ? null : applyEdits(text, own.map((a) => editOf(a, 'undefined')));
    })],
    ['the old src/main/screen/cells.ts back beside the shared one', (tree) => addFile(tree, F.oldCells, "export { clusterCells } from '@shared/cells';\n")],
    ['the history copy\'s buffer handed no table', (tree) => edit(tree, F.historyCopy, (text, sf) => {
      const reg = callsUnder(sf, 'registerTmuxWidths')[0];
      const table = reg?.arguments[1] === undefined ? undefined : peel(reg.arguments[1]);
      const d = table !== undefined && ts.isIdentifier(table) ? resolveLocal(table) : null;
      if (d?.kind !== 'param' || d.index === 0) return null;
      const holder = nameOfFunction(d.fn);
      const calls = holder === null ? [] : callsUnder(sf, holder).filter((c) => c.arguments[d.index] !== undefined);
      return calls.length === 0 ? null : applyEdits(text, calls.map((c) => ({ start: c.arguments[d.index - 1].getEnd(), end: c.arguments[d.index].getEnd(), to: '' })));
    })],
    ['the core never reads this Mac\'s table', (tree) => edit(tree, F.core, (text, sf) => {
      const calls = callsUnder(sf, 'localCellWidths');
      return calls.length === 0 ? null : applyEdits(text, calls.map((c) => editOf(c, 'null')));
    })],
    // Probe review (2026-11-16): registered, and Unicode 6 made the active version.
    ['the provider registered and Unicode 6 made the active version', (tree) => edit(tree, F.widths, (text) => {
      const { activations } = unicodeTouches(tree);
      const own = activations.filter((a) => a.getSourceFile().fileName === F.widths);
      return own.length === 0 ? null : applyEdits(text, own.map((a) => editOf(a.right, "'6'")));
    })],
    // The fix round (D7), the attack lens's own plant: another machine's row given this Mac's table.
    ["a session row on another machine given this Mac's table", (tree) => appendTo(tree, F.core, 'export function selfTestRemoteRow(row: object, widths: unknown): object {\n  return { ...row, cellWidths: widths };\n}')],
    ["the branch that gives the table no longer asks for this Mac's rows", (tree) => edit(tree, F.core, (text, sf) => {
      const set = nodesUnder(sf).find((n) => ts.isPropertyAssignment(n) && n.name.getText() === 'cellWidths');
      let p = set?.parent;
      while (p !== undefined && !(ts.isIfStatement(p) && nodesUnder(p.expression).some((n) => ts.isIdentifier(n) && n.text === 'LOCAL_MACHINE'))) p = p.parent;
      return p === undefined ? null : replaceNode(text, p.expression, 'true');
    })]
  ],
  T4: [
    ['put term.getSelection() back in copySelection', (tree) => edit(tree, F.capture, (text, sf) => {
      const fn = functionsNamed(sf, 'copySelection')[0];
      const c = fn === undefined ? undefined : callsUnder(fn, 'drawnSelectionText')[0];
      return c === undefined ? null : replaceNode(text, c, 'term.getSelection()');
    })],
    ['snapshotSelection reads getSelection again', (tree) => edit(tree, F.capture, (text, sf) => {
      const fn = functionsNamed(sf, 'snapshotSelection')[0];
      const calls = fn === undefined ? [] : callsUnder(fn, 'drawnSelectionText');
      return calls.length === 0 ? null : applyEdits(text, calls.map((c) => editOf(c, 'term.getSelection()')));
    })],
    ['drop term.cols from serialize.ts', (tree) => edit(tree, F.serialize, (text, sf) => {
      const { bound } = serializeBound(sf);
      return bound === null ? null : without(text, bound.call, [bound.arg]);
    })],
    ['drawn rows read to their own length', (tree) => edit(tree, F.drawn, (text, sf) => {
      const cols = nodesUnder(sf).filter((n) => ts.isPropertyAccessExpression(n) && n.name.text === 'cols');
      return cols.length === 0 ? null : applyEdits(text, cols.map((n) => editOf(n, 'Infinity')));
    })],
    ['the width read, but bounding no row', (tree) => edit(tree, F.drawn, (text, sf) => {
      const bounded = callsUnder(sf, 'translateToString').flatMap((c) => c.arguments.filter((a) => tracesBack(a, FROM_COLS)));
      return bounded.length === 0 ? null : applyEdits(text, bounded.map((a) => editOf(a, 'undefined')));
    })],
    ['drawn lines keep their trailing spaces', (tree) => edit(tree, F.drawn, (text, sf) => neutralize(text, stripsOf(sf, sf, tree)))],
    ["composeText back to the parent's own join, which keeps -J's trailing spaces", (tree) => edit(tree, F.historyCopy, (text, sf) => {
      const fn = functionsNamed(sf, 'composeText')[0];
      return fn === undefined || fn.body === undefined ? null : replaceNode(text, fn.body, PARENT_COMPOSE_TEXT_BODY);
    })],
    ['composeText reaching no strip', (tree) => edit(tree, F.historyCopy, (text, sf) => {
      const fn = functionsNamed(sf, 'composeText')[0];
      return fn === undefined ? null : neutralize(text, stripsOf(fn, sf, tree));
    })],
    ['a second drawnSelectionText, in capture/index.ts', (tree) => appendTo(tree, F.capture, 'export function drawnSelectionText(): string {\n  return \'\';\n}')],
    ['the pane no longer routes the Edit menu\'s Copy', (tree) => edit(tree, F.pane, (text, sf) => {
      const calls = callsUnder(sf, 'routePaneCopy');
      return calls.length === 0 ? null : applyEdits(text, calls.map((c) => editOf(c, '(() => undefined)')));
    })],
    // Probe review (2026-11-16): cols still named, but every row read to at least the width.
    ['the drawn row bound by Math.max, its cols still named', (tree) => edit(tree, F.drawn, (text, sf) => {
      const ends = callsUnder(sf, 'translateToString')
        .map((c) => (c.arguments[2] === undefined ? undefined : peel(c.arguments[2])))
        .filter((e) => e !== undefined && ts.isCallExpression(e) && calleePath(e) === 'Math.min');
      return ends.length === 0 ? null : applyEdits(text, ends.map((e) => editOf(e.expression, 'Math.max')));
    })],
    // The fix round (item 7, taken back out): the conversion put back, and a change held rather than released.
    ['a selection that never scrolled held as history again', (tree) => edit(tree, F.dragSelect, (text, sf) => {
      const fn = functionsNamed(sf, 'onSelectionChange')[0];
      const rel = fn === undefined ? undefined : callsUnder(fn, 'release')[0];
      return rel === undefined ? null : replaceNode(text, rel, 'void (this.term.getSelectionPosition() === undefined ? this.release() : undefined)');
    })],
    ['a selection change held rather than released', (tree) => edit(tree, F.dragSelect, (text, sf) => {
      const fn = functionsNamed(sf, 'onSelectionChange')[0];
      const rel = fn === undefined ? undefined : callsUnder(fn, 'release')[0];
      return rel === undefined ? null : replaceNode(text, rel, 'this.hold(null as never)');
    })]
  ],
  T5: [
    ['a second window.open(', (tree) => appendTo(tree, F.handler, "export function selfTestOpen(address: string): void {\n  window.open(address, '_blank', 'noopener,noreferrer');\n}")],
    ['the username check removed', (tree) => edit(tree, F.rules, (text, sf) => {
      const reads = nodesUnder(sf).filter((n) => ts.isPropertyAccessExpression(n) && n.name.text === 'username');
      return reads.length === 0 ? null : applyEdits(text, reads.map((n) => editOf(n, "''")));
    })],
    ['the 2,048 bound removed', (tree) => edit(tree, F.rules, (text, sf) => {
      const bounds = nodesUnder(sf).filter((n) => ts.isNumericLiteral(n) && Number(n.text.replace(/_/g, '')) === 2048);
      return bounds.length === 0 ? null : applyEdits(text, bounds.map((n) => editOf(n, 'Number.MAX_SAFE_INTEGER')));
    })],
    ['the address checks left where openedAddress never calls them', (tree) => edit(tree, F.rules, (text, sf) => {
      const read = nodesUnder(sf).find((n) => ts.isPropertyAccessExpression(n) && n.name.text === 'username');
      const holder = read === undefined ? null : namedEnclosing(read);
      const name = holder === null ? null : nameOfFunction(holder);
      if (name === null || name === 'openedAddress') return null;
      const calls = callsUnder(sf, name).filter((c) => !(c.pos >= holder.pos && c.end <= holder.end));
      return calls.length === 0 ? null : applyEdits(text, calls.map((c) => editOf(c, 'true')));
    })],
    ['the protocol check removed', (tree) => edit(tree, F.rules, (text, sf) => {
      const reads = nodesUnder(sf).filter((n) => ts.isPropertyAccessExpression(n) && n.name.text === 'protocol');
      return reads.length === 0 ? null : applyEdits(text, reads.map((n) => editOf(n, "'https:'")));
    })],
    ['the open without noopener', (tree) => edit(tree, F.handler, (text, sf) => {
      const o = nodesUnder(sf).find(isOpenCall);
      return o === undefined || o.arguments[2] === undefined ? null : replaceNode(text, o.arguments[2], "''");
    })],
    ['the handler opening the raw target', (tree) => edit(tree, F.handler, (text, sf) => {
      const o = nodesUnder(sf).find(isOpenCall);
      return o === undefined || o.arguments[0] === undefined ? null : replaceNode(text, o.arguments[0], 'selfTestRawTarget');
    })],
    ['a route through main\'s openExternal', (tree) => appendTo(tree, F.handler, "export function selfTestExternal(address: string): void {\n  (window as unknown as { gmux: { shell: { openExternal(a: string): void } } }).gmux.shell.openExternal(address);\n}")],
    ['location.href assigned', (tree) => appendTo(tree, F.handler, 'export function selfTestNavigate(address: string): void {\n  location.href = address;\n}')],
    ['the pane\'s terminal made without linkHandler', (tree) => edit(tree, F.pane, (text, sf) => {
      const opts = nodesUnder(sf).filter(isNewTerminal).map(optionsOf).find((o) => o !== null && propertyNamed(o, 'linkHandler') !== null);
      return opts === undefined ? null : without(text, opts, [propertyNamed(opts, 'linkHandler')]);
    })],
    // Probe review (2026-11-16): openedAddress still on the path, but a refused target opens the raw one.
    ['a refused target falling back to the raw one', (tree) => edit(tree, F.handler, (text, sf) => {
      const at0 = handedToOpen(sf);
      return at0 === null ? null : replaceNode(text, at0, `(${nodeText(at0)}) ?? selfTestRawTarget`);
    })],
    // The fix round (D16), the attack lens's own plant: the hover line shows the raw target.
    ['the hover line shows the raw target', (tree) => edit(tree, F.handler, (text, sf) => {
      const calls = callsUnder(sf, 'showLine').filter((c) => c.arguments[0] !== undefined && !isNullish(c.arguments[0]));
      return calls.length === 0 ? null : applyEdits(text, calls.map((c) => editOf(c.arguments[0], 'h.target')));
    })],
    ['the hover line drawn from something other than the address showLine was handed', (tree) => edit(tree, F.handler, (text, sf) => {
      const h = callsUnder(sf, 'hoverText')[0];
      return h === undefined || h.arguments[0] === undefined ? null : replaceNode(text, h.arguments[0], 'String(range.start.x)');
    })],
    // The fix round (D14 rule 0): the path route widened.
    ['pathFor hands the first path offered, wherever the pointer is', (tree) => edit(tree, F.handler, (text, sf) => {
      const pu = callsUnder(sf, 'pathUnder')[0];
      const offered = pu?.arguments[1];
      return pu === undefined || offered === undefined ? null : replaceNode(text, pu, `(${nodeText(offered)}[0] ?? null)`);
    })],
    ['a second .activate( on a link pathFor never handed', (tree) => appendTo(tree, F.handler, "export function selfTestActivate(l: { activate(e: unknown, t: string): void }): void {\n  l.activate(null, '');\n}")],
    ['pathFor asks the path provider before pathMayDecide', (tree) => edit(tree, F.handler, (text, sf) => {
      const pm = callsUnder(sf, 'pathMayDecide')[0];
      return pm === undefined ? null : replaceNode(text, pm, 'true');
    })]
  ],
  T6: [
    ['set it in a copy of pane-link-handler.ts', (tree) => edit(tree, F.handler, (text, sf) => {
      const handlerObj = nodesUnder(sf).find((n) => ts.isObjectLiteralExpression(n) && propertyNamed(n, 'activate') !== null);
      if (handlerObj !== undefined) return splice(text, handlerObj.getStart() + 1, handlerObj.getStart() + 1, '\n    allowNonHttpProtocols: true,');
      return `${text}\nexport const selfTestOptions = { allowNonHttpProtocols: true };\n`;
    })],
    ['set it in the pane\'s terminal options', (tree) => edit(tree, F.pane, (text, sf) => {
      const opts = nodesUnder(sf).filter(isNewTerminal).map(optionsOf).find((o) => o !== null);
      return opts === undefined ? null : splice(text, opts.getStart() + 1, opts.getStart() + 1, '\n      allowNonHttpProtocols: true,');
    })],
    ['set it through a string key', (tree) => appendTo(tree, F.handler, "export const selfTestKeyed = { ['allowNonHttpProtocols']: true };")]
  ],
  T7: [
    ['drop -T from the local argv', (tree) => edit(tree, F.plan, (text, sf) => {
      const argvNode = localArgvs(sf)[0];
      if (argvNode === undefined) return null;
      const drop = argvNode.elements.filter((e, i, all) => (stringOf(e) === '-T' && stringOf(all[i + 1]) === 'hyperlinks') || (stringOf(e) === 'hyperlinks' && stringOf(all[i - 1]) === '-T') || ts.isSpreadElement(e));
      return drop.length === 0 ? null : without(text, argvNode, drop);
    })],
    ["add '3.3a' to the list", (tree) => {
      const { decls, array } = farVersions(tree);
      if (array === null) return null;
      return edit(tree, decls[0].rel, (text) => splice(text, array.getStart() + 1, array.getStart() + 1, "'3.3a', "));
    }],
    ['the far argv always takes the flag', (tree) => edit(tree, F.plan, (text, sf) => {
      const guards = nodesUnder(sf).filter((n) => ts.isPropertyAccessExpression(n) && n.name.text === 'hyperlinks');
      return guards.length === 0 ? null : applyEdits(text, guards.map((n) => editOf(n, 'true')));
    })],
    ['hyperlinks decided by a literal in the attach host', (tree) => {
      const p = hyperlinkProperties(tree).find((x) => peel(valueOfProperty(x)).kind !== K.FalseKeyword);
      if (p === undefined) return null;
      return edit(tree, p.getSourceFile().fileName, (text) => replaceNode(text, p, 'hyperlinks: true'));
    }],
    ['the decider reading only the program', (tree) => edit(tree, F.gate, (text, sf) => {
      const reads = nodesUnder(sf).filter((n) => ts.isPropertyAccessExpression(n) && n.name.text === 'server');
      return reads.length === 0 ? null : applyEdits(text, reads.map((n) => editOf(n, `${nodeText(n.expression)}.program`)));
    })]
  ],
  T8: [
    ["plant it in a copy of registry.ts' claude row", (tree) => edit(tree, F.registry, (text, sf) => {
      const d = nodesUnder(sf).find((n) => ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === 'CLAUDE_INLINE_ENV');
      const obj = d === undefined ? undefined : peelValue(d.initializer);
      if (obj !== undefined && ts.isObjectLiteralExpression(obj)) return splice(text, obj.getStart() + 1, obj.getStart() + 1, " FORCE_HYPERLINK: '1',");
      return `${text}\nexport const SELF_TEST_ENV = { FORCE_HYPERLINK: '1' };\n`;
    })],
    ["set it in the private server's configuration", (tree) => {
      const conf = tree.text(F.conf);
      return conf === null ? null : tree.with(F.conf, `${conf}\nset-environment -g FORCE_HYPERLINK 1\n`);
    }],
    ["name it in the supervisor's server environment", (tree) => appendTo(tree, F.supervisor, "export const SELF_TEST_SERVER_ENV = ['FORCE_HYPERLINK'];")]
  ],
  T9: [
    ['read the flag in the remote branch of a copy', (tree) => edit(tree, F.scroll, (text, sf) => {
      const branch = orderedBranch(sf);
      if (branch === null) return null;
      const holder = flagHolderName(sf);
      const format = holder ?? `'#{${FLAG}}'`;
      return splice(text, branch.getStart() + 1, branch.getStart() + 1, `\n    await run(['display-message', '-p', '-t', target, '-F', ${format}]);`);
    })],
    ['name the flag in the far scroll shapes', (tree) => appendTo(tree, F.scrollShapes, `export const SELF_TEST_FLAG = '#{${FLAG}}';`)],
    ['send refresh-from-pane outside refreeze', (tree) => appendTo(tree, F.scroll, `export async function selfTestRefresh(run: TmuxScrollRunner, target: string): Promise<void> {\n  await run(['send-keys', '-t', target, '-X', '${REFRESH}']);\n}`)],
    ['re-freeze in the remote branch', (tree) => edit(tree, F.scroll, (text, sf) => {
      const branch = orderedBranch(sf);
      return branch === null ? null : splice(text, branch.getStart() + 1, branch.getStart() + 1, '\n    await refreeze(run, target);');
    })],
    ["the read made before the reader's own guard, its answer read after it", (tree) => edit(tree, F.scroll, (text, sf) => {
      for (const use of flagLiterals(sf).flatMap(usesOf)) {
        const fn = namedEnclosing(use);
        if (fn === null || fn.body === undefined || !ts.isBlock(fn.body)) continue;
        const guard = fn.body.statements.find(
          (s) => ts.isIfStatement(s) && s.elseStatement === undefined && impliesNot(s.expression, THIS_MACS_RUNNER) && alwaysExits(s.thenStatement)
        );
        if (guard === undefined) continue;
        const format = flagHolderName(sf) ?? `'#{${FLAG}}'`;
        return applyEdits(text, [
          { start: guard.getStart(), end: guard.getStart(), to: `const selfTestEarly = await run(['display-message', '-p', '-t', target, '-F', ${format}]);\n  ` },
          { start: guard.getEnd(), end: guard.getEnd(), to: '\n  void selfTestEarly;' }
        ]);
      }
      return null;
    })]
  ]
};

/** The then-block of `if (run.ordered === true)` in scrollPaneBy, or the first such block anywhere in scroll.ts. */
function orderedBranch(sf) {
  const isOrdered = (n) => ts.isIfStatement(n) && ts.isBinaryExpression(peel(n.expression)) && pathOf(peel(n.expression).left) === 'run.ordered' && peel(n.expression).right.kind === K.TrueKeyword && ts.isBlock(n.thenStatement);
  const scope = functionsNamed(sf, 'scrollPaneBy')[0] ?? sf;
  const hit = nodesUnder(scope).find(isOrdered) ?? nodesUnder(sf).find(isOrdered);
  return hit === undefined ? null : hit.thenStatement;
}

/** The module const that holds the flag in its format, if the flag is read through one. */
function flagHolderName(sf) {
  for (const lit of flagLiterals(sf)) {
    for (let p = lit.parent; p !== undefined; p = p.parent) {
      if (isFunctionLike(p)) break;
      if (ts.isVariableDeclaration(p) && ts.isIdentifier(p.name) && ts.isSourceFile(p.parent?.parent?.parent ?? p)) return p.name.text;
    }
  }
  return null;
}

/**
 * `composeText`'s body at the parent commit, 8497c34c, byte for byte but for
 * the non-breaking space, spelled here as an escape: its own join, which keeps
 * the spaces `-J` hands back at a line's end. An ablation puts it back.
 */
const PARENT_COMPOSE_TEXT_BODY = `{
  const buffer = term.buffer.active;
  const text = (y: number, from: number, to?: number): string =>
    buffer.getLine(y)?.translateToString(true, from, to) ?? '';
  const wrapped = (y: number): boolean => buffer.getLine(y)?.isWrapped === true;
  const out: string[] = [];
  const oneRow = sel.start.y === sel.end.y;
  out.push(text(sel.start.y, sel.start.x, oneRow ? sel.end.x : undefined));
  for (let y = sel.start.y + 1; y <= sel.end.y - 1; y += 1) {
    const row = text(y, 0);
    if (wrapped(y)) out[out.length - 1] += row;
    else out.push(row);
  }
  if (!oneRow) {
    const row = text(sel.end.y, 0, sel.end.x);
    if (wrapped(sel.end.y)) out[out.length - 1] += row;
    else out.push(row);
  }
  return out.map((line) => line.replace(/\\u00a0/g, ' ')).join('\\n');
}`;

/** Every trailing-space strip taken away: the regex never matches, the trim returns its input. */
function neutralize(text, strips) {
  if (strips.length === 0) return null;
  return applyEdits(
    text,
    strips.map((s) => {
      if (s.kind === 'regex') return editOf(s.node, '/(?!)/');
      if (s.kind === 'method') return editOf(s.node, nodeText(peel(s.node.expression).expression));
      if (s.kind === 'helper') return editOf(s.node, s.node.arguments[0] === undefined ? "''" : nodeText(s.node.arguments[0]));
      if (s.kind === 'code') return editOf(s.node, '-1');
      return editOf(s.node, "'\\u0000'");
    })
  );
}

const CONTROLS = {
  T1: [
    ['an attach with the id alone, in a comment of the pane', (tree) => appendTo(tree, F.pane, '// await gmux.sessions.attach(sessionId);')],
    // Probe review (2026-11-16): each field still read from its own, through a cast.
    ["the local attach's cols and rows read through a cast", (tree) => edit(tree, F.core, (text, sf) => {
      const a = attachCalls(sf)[0];
      const obj = a === undefined ? undefined : peel(a.arguments[0]);
      if (obj === undefined || !ts.isObjectLiteralExpression(obj)) return null;
      const props = nodesUnder(obj).filter((p) => ts.isPropertyAssignment(p) && ['cols', 'rows'].includes(p.name.getText()));
      return props.length === 0 ? null : applyEdits(text, props.map((p) => editOf(p.initializer, `(${nodeText(p.initializer)} as number)`)));
    })],
    ['one more property beside the local attach\'s size', (tree) => edit(tree, F.core, (text, sf) => {
      const a = attachCalls(sf)[0];
      const obj = a === undefined ? undefined : peel(a.arguments[0]);
      return obj === undefined || !ts.isObjectLiteralExpression(obj) ? null : splice(text, obj.getStart() + 1, obj.getStart() + 1, ' selfTest: true,');
    })],
    ['the attach with the wanted size, in a comment of the pane', (tree) => appendTo(tree, F.pane, '// await gmux.sessions.attach(sessionId, wanted ?? undefined);')]
  ],
  T2: [
    ["'-x' named in a comment beside this Mac's new-session line", (tree) => edit(tree, F.tmuxSessions, (text, sf) => {
      const fn = functionsNamed(sf, 'createSession')[0];
      return fn === undefined || fn.body === undefined ? null : splice(text, fn.body.getStart() + 1, fn.body.getStart() + 1, "\n  // args.push('-x', '80')");
    })],
    ["one more property beside restore.ts' size", (tree) => edit(tree, F.restore, (text) => {
      const s = (createSites(tree, F.restore, 'tmux.createSession', null) ?? [])[0];
      const obj = s === undefined ? undefined : peel(s.call.arguments[0]);
      return obj === undefined || !ts.isObjectLiteralExpression(obj) ? null : splice(text, obj.getStart() + 1, obj.getStart() + 1, ' selfTest: true,');
    })]
  ],
  T3: [
    ['a nextCell declared in a test', (tree) => addFile(tree, 'src/shared/__tests__/p368-self-test-next-cell.test.ts', 'export function nextCell(): number {\n  return 0;\n}\n')],
    ['@xterm/addon-unicode11 named in a comment of tmux-widths.ts', (tree) => appendTo(tree, F.widths, "// import { Unicode11Addon } from '@xterm/addon-unicode11';")],
    ['charProperties named in an interface of tmux-widths.ts', (tree) => appendTo(tree, F.widths, 'interface SelfTestProviderShape {\n  charProperties(cp: number, preceding: number): number;\n}\nexport type SelfTestShape = SelfTestProviderShape;')],
    // Probe review (2026-11-16): the registered provider's version, read through a cast, is still its own.
    ["the active version read through a cast", (tree) => edit(tree, F.widths, (text) => {
      const { activations } = unicodeTouches(tree);
      const own = activations.filter((a) => a.getSourceFile().fileName === F.widths);
      return own.length === 0 ? null : applyEdits(text, own.map((a) => editOf(a.right, `(${nodeText(a.right)} as string)`)));
    })],
    ['cellWidths named in a comment and a type of core.ts', (tree) => appendTo(tree, F.core, '// { ...remoteRow, cellWidths: widths } is never built (D7).\nexport interface SelfTestRowShape {\n  cellWidths?: string;\n}')]
  ],
  T4: [
    ['getSelectionPosition() read again in capture/index.ts', (tree) => appendTo(tree, F.capture, "export function selfTestPosition(t: { getSelectionPosition(): unknown }): unknown {\n  return t.getSelectionPosition();\n}")],
    // Probe review (2026-11-16): one more bound beside the width keeps the row bounded.
    ['one more bound in the end column\'s Math.min', (tree) => edit(tree, F.drawn, (text, sf) => {
      const ends = callsUnder(sf, 'translateToString')
        .map((c) => (c.arguments[2] === undefined ? undefined : peel(c.arguments[2])))
        .filter((e) => e !== undefined && ts.isCallExpression(e) && calleePath(e) === 'Math.min' && e.arguments.length > 0);
      return ends.length === 0 ? null : applyEdits(text, ends.map((e) => ({ start: e.arguments[e.arguments.length - 1].getEnd(), end: e.arguments[e.arguments.length - 1].getEnd(), to: ', Number.MAX_SAFE_INTEGER' })));
    })],
    ['term.getSelection() in a comment of copySelection', (tree) => edit(tree, F.capture, (text, sf) => {
      const fn = functionsNamed(sf, 'copySelection')[0];
      return fn === undefined || fn.body === undefined ? null : splice(text, fn.body.getStart() + 1, fn.body.getStart() + 1, '\n  // text = term.getSelection();');
    })],
    ['getSelection() called outside capture/index.ts', (tree) => appendTo(tree, F.dragSelect, "export function selfTestSelection(t: { getSelection(): string }): string {\n  return t.getSelection();\n}")],
    ['getSelectionPosition() named in a comment of drag-select.ts', (tree) => appendTo(tree, F.dragSelect, '// const range = this.term.getSelectionPosition(); is never read here.')]
  ],
  T5: [
    ['window.open( in a comment of the handler', (tree) => appendTo(tree, F.handler, "// window.open(address, '_blank');")],
    ['the word location in a string of the handler', (tree) => appendTo(tree, F.handler, "export const SELF_TEST_WORD = 'location';")],
    ['a parameter named location', (tree) => appendTo(tree, F.handler, 'export function selfTestParameter(location: number): number {\n  return location + 1;\n}')],
    // Probe review (2026-11-16): a nullish fallback beside openedAddress's answer hands window.open nothing else.
    ["a nullish fallback beside openedAddress's answer", (tree) => edit(tree, F.handler, (text, sf) => {
      const at0 = handedToOpen(sf);
      return at0 === null ? null : replaceNode(text, at0, `(${nodeText(at0)}) ?? null`);
    })],
    ['.activate( and a raw target on the hover line, in comments of the handler', (tree) => appendTo(tree, F.handler, '// link.activate(event, link.text);\n// showLine(h.target, h.range);')]
  ],
  T6: [
    ['named in a test', (tree) => addFile(tree, 'src/renderer/terminal/links/__tests__/p368-self-test.test.ts', 'export const options = { allowNonHttpProtocols: false };\n')],
    ['named in a comment of the handler', (tree) => appendTo(tree, F.handler, '// allowNonHttpProtocols is never set.')]
  ],
  T7: [
    ["a newer version, '3.8', added to the list", (tree) => {
      const { decls, array } = farVersions(tree);
      if (array === null) return null;
      return edit(tree, decls[0].rel, (text) => splice(text, array.getEnd() - 1, array.getEnd() - 1, ", '3.8'"));
    }],
    ["'hyperlinks' in a comment of attach-plan.ts", (tree) => appendTo(tree, F.plan, "// const call = remoteTmuxArgv(ctx, ['-u', '-T', 'hyperlinks', 'attach-session', '-t']);")],
    ['an explicit false beside the decider', (tree) => appendTo(tree, F.host, 'export const SELF_TEST_TARGET = { hyperlinks: false };')]
  ],
  T8: [
    ['named in a test', (tree) => addFile(tree, 'src/main/agents/__tests__/p368-self-test.test.ts', "export const refused = 'FORCE_HYPERLINK';\n")],
    ['named in a comment of registry.ts', (tree) => appendTo(tree, F.registry, '// FORCE_HYPERLINK is never set in a pane (Phase 368).')],
    ['a commented line of gmux-tmux.conf', (tree) => {
      const conf = tree.text(F.conf);
      return conf === null ? null : tree.with(F.conf, `${conf}\n# set-environment -g FORCE_HYPERLINK 1\n`);
    }]
  ],
  T9: [
    ["one more read under the runner's guard", (tree) => edit(tree, F.scroll, (text, sf) => {
      const guard = nodesUnder(sf).find((n) => ts.isIfStatement(n) && THIS_MACS_RUNNER(peel(n.expression)) && ts.isBlock(n.thenStatement));
      if (guard === undefined) return null;
      const format = flagHolderName(sf) ?? `'#{${FLAG}}'`;
      return splice(text, guard.thenStatement.getStart() + 1, guard.thenStatement.getStart() + 1, `\n      await run(['display-message', '-p', '-t', target, '-F', ${format}]);`);
    })],
    ['the flag named in a comment of the far scroll shapes', (tree) => appendTo(tree, F.scrollShapes, `// '#{${FLAG}}' is read on this Mac alone.`)],
    ["a format built before a reader's guard and sent after it", (tree) => edit(tree, F.scroll, (text, sf) => {
      for (const use of flagLiterals(sf).flatMap(usesOf)) {
        const fn = namedEnclosing(use);
        if (fn === null || fn.body === undefined || !ts.isBlock(fn.body)) continue;
        const guard = fn.body.statements.find(
          (s) => ts.isIfStatement(s) && s.elseStatement === undefined && impliesNot(s.expression, THIS_MACS_RUNNER) && alwaysExits(s.thenStatement)
        );
        if (guard === undefined) continue;
        const format = flagHolderName(sf) ?? `'#{${FLAG}}'`;
        return applyEdits(text, [
          { start: guard.getStart(), end: guard.getStart(), to: `const selfTestFormat = [${format}].join('\\t');\n  ` },
          { start: guard.getEnd(), end: guard.getEnd(), to: "\n  void run(['display-message', '-p', '-t', target, '-F', selfTestFormat]);" }
        ]);
      }
      return null;
    })]
  ]
};

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

const RULES = [
  ['T1', 'the attach carries a size', t1],
  ['T2', 'the create carries a size, on both new-session lines and the four production creates', t2],
  ['T3', 'one width provider from the shared tables, on all three terminals', t3],
  ['T4', 'Copy is bounded by the width', t4],
  ['T5', "the link handler's one route, and its refusals", t5],
  ['T6', 'never allowNonHttpProtocols', t6],
  ['T7', '-T hyperlinks on the local attach, and on another machine only from 3.4', t7],
  ['T8', 'never FORCE_HYPERLINK', t8],
  ['T9', "the frame re-freeze is this Mac's alone", t9]
];

/** A rule's findings over a tree; a rule that throws is a finding of its own. */
function ask(rule, tree) {
  try {
    return rule(tree);
  } catch (err) {
    return [`the rule threw: ${String(err?.stack ?? err).split('\n').slice(0, 3).join(' | ')}`];
  }
}

const started = Date.now();
const tree = new Tree();
const problems = [];
let red = 0;
let ablationsAsked = 0;
let ablationsRed = 0;
let controlsAsked = 0;
let controlsGreen = 0;

if (RULES.length !== 9 || new Set(RULES.map(([id]) => id)).size !== 9) problems.push('the gate asks nine rules, T1 to T9, and no longer does');
for (const [id] of RULES) {
  if ((ABLATIONS[id] ?? []).length === 0) problems.push(`${id} carries no ablation, so it has never been shown to fail`);
  if ((CONTROLS[id] ?? []).length === 0) problems.push(`${id} carries no control, so it has never been shown to be fair`);
}

for (const [id, name, rule] of RULES) {
  const ruleStarted = Date.now();
  const found = ask(rule, tree);
  const ablations = ABLATIONS[id] ?? [];
  const controls = CONTROLS[id] ?? [];
  if (found.length > 0) {
    red += 1;
    say(`RED   ${id}  ${name}`);
    for (const f of found) {
      problems.push(`${id} ${f}`);
      say(`        ${f}`);
    }
    say(`        (its ${String(ablations.length)} ablations and ${String(controls.length)} controls are not asked while the rule is red over the tree itself)`);
    continue;
  }
  let shown = 0;
  for (const [label, build] of ablations) {
    ablationsAsked += 1;
    let broken = null;
    try {
      broken = build(tree);
    } catch (err) {
      problems.push(`${id} ablation "${label}" threw while it was built: ${String(err?.message ?? err)}`);
      continue;
    }
    if (broken === null) {
      problems.push(`${id} ablation "${label}" could not be built over this tree, so the rule was not shown to fail that way`);
      continue;
    }
    const again = ask(rule, broken);
    if (again.length === 0) {
      problems.push(`${id} ablation "${label}": the rule read GREEN over a copy with it broken, so it has stopped asking`);
      continue;
    }
    if (again.some((f) => f.startsWith('the rule threw'))) {
      problems.push(`${id} ablation "${label}": the rule threw rather than finding it: ${again[0]}`);
      continue;
    }
    if (VERBOSE) say(`        ablation "${label}" -> ${again[0]}${again.length > 1 ? ` (+${String(again.length - 1)})` : ''}`);
    ablationsRed += 1;
    shown += 1;
  }
  let fair = 0;
  for (const [label, build] of controls) {
    controlsAsked += 1;
    let changed = null;
    try {
      changed = build(tree);
    } catch (err) {
      problems.push(`${id} control "${label}" threw while it was built: ${String(err?.message ?? err)}`);
      continue;
    }
    if (changed === null) {
      problems.push(`${id} control "${label}" could not be built over this tree`);
      continue;
    }
    const again = ask(rule, changed);
    if (again.length > 0) {
      problems.push(`${id} control "${label}" read RED (${again[0]}), so the rule answers a change that does not break it`);
      continue;
    }
    if (VERBOSE) say(`        control "${label}" -> green`);
    controlsGreen += 1;
    fair += 1;
  }
  const whole = shown === ablations.length && fair === controls.length;
  say(
    `${whole ? 'ok   ' : 'RED  '} ${id}  ${name}  (${String(shown)} of ${String(ablations.length)} ablations red, ` +
      `${String(fair)} of ${String(controls.length)} controls green, ${String(Date.now() - ruleStarted)} ms)`
  );
  if (!whole) red += 1;
}

const counts =
  `${String(RULES.length)} rules, ${String(ablationsRed)} of ${String(ablationsAsked)} ablations read red, ` +
  `${String(controlsGreen)} of ${String(controlsAsked)} controls read green, ${String(Date.now() - started)} ms`;
const where = ROOT === HERE ? 'this repository' : ROOT;
if (problems.length > 0) {
  for (const p of problems) process.stderr.write(`${TAG} ${p}\n`);
  process.stderr.write(`${TAG} FAILED over ${where}: ${String(red)} of ${String(RULES.length)} rules red, ${String(problems.length)} finding(s); ${counts}.\n`);
  await exitWhenWritten(1);
}
say(
  `PASS over ${where}: all ${String(RULES.length)} rules hold; ${String(ablationsRed)} ablations, each a copy of the tree with one ` +
    `rule broken, read red on the rule that owns it, and ${String(controlsGreen)} controls, each a copy changed without breaking ` +
    `it, read green (${counts}).`
);
await exitWhenWritten(0);
