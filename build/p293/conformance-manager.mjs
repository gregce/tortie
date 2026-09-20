#!/usr/bin/env node
/**
 * `npm run conformance:manager`. The cheap gate on the session manager
 * (Phase 293, direction D, the Tabbed sheet).
 *
 * WHAT IT IS FOR. The sheet is the first surface in Tortie where one press can
 * end many sessions, and where a row can sit on screen for minutes while
 * another window, a machine reconnecting or the session itself changes it.
 * Every rule that keeps that safe is ONE clause somewhere in the store, the
 * actions module, the batch loop or the policy, and every one of those clauses
 * is a line a later round can delete without a single existing test noticing.
 * This gate is the executable half of those rules, in about two seconds.
 *
 * WHAT IT STARTS. One plain node (build/p293/manager-conformance-probe.mts)
 * through the pinned tsx in build/ts-runner.mjs. No Electron, no tmux, no ssh,
 * no agent, no token, no network, and nothing under the person's home is read.
 * The probe writes one stub file under a mkdtemp in the system temporary
 * directory and removes it in a `finally`.
 *
 * TWO HALVES.
 *
 *  DRIVEN (the probe). The SHIPPING modules over fixtures built by hand from
 *  build/p293/SPEC.md, never from the code: the gates predicate, the batch
 *  loop, who a batch may end, the freeze at the press, the run id a stop is
 *  bound to, the rule of the press over the real store, the policy's menu with
 *  and without a host, the grouping, the view, the cells and the truth table.
 *
 *  READ (this file). The source, parsed with the TypeScript compiler's own
 *  parser so a comment, a string and a JSX attribute are each read as what they
 *  are: no DOM menu in the domain, `setMenu(` the only call that draws one, no
 *  `setConfirm(`, no `data-session-id`, the discard channel reached only
 *  through `removeSessionNow`, no batch channel in the contract, `kill`
 *  reached only through `endSessionNow`, every per-row lifecycle verb called
 *  only below a `freshRow(` in the same function, batch-end.ts spelling no verb
 *  but End, no function reading `.session` off a drawn row, no tmux word and no
 *  `?? 0` in copy.ts, no name handed to a lifecycle call, and nothing imported
 *  from diagnostics.
 *
 *  READ, THE STYLESHEETS (Phase 298, mechanism 18). The same half gained a CSS
 *  reader, because the sheet's type and spacing are the one part of it no
 *  driven rule can see: no ratio line-height, every `font-size` paired with a
 *  `line-height`, `--text-2xs` nowhere but a chip and the footer, every
 *  `padding`/`margin`/`gap` a `--space-*` step or a `--sm-*` geometry property
 *  of the sheet, `--track-caps` on every uppercase rule, and — read from the
 *  TSX — every `size=` on a `Codicon` or an `AgentIcon` one of sm, md, lg, 16
 *  or 24. Phase 293 shipped a 10px step under five runs of prose, a ratio line
 *  height that landed one pixel off `--lh-2xs`, twenty unpaired sizes and a
 *  `size={19}` that appears nowhere else in the codebase; each of those is one
 *  declaration a later round can write again.
 *
 * WHAT IT FAILS ON. Every failure is printed as `[p293 <rule>]` with the clause
 * of the spec that owns it, which is what `npm run ablation:p293` reads to
 * prove each rule can go red on its own.
 *
 *   node build/p293/conformance-manager.mjs            the gate
 *   node build/p293/conformance-manager.mjs --list     the rules, and nothing run
 */

import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { tsxCli } from '../ts-runner.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const TAG = '[conformance:manager]';
const t0 = Date.now();

/** The source rules, by id. The driven rules are named by the probe. */
const TEXT_RULES = [
  ['T1', '§2.8', 'no DOM-drawn menu in the domain: no role="menu" or menuitem, no popover, no <menu>, no ContextMenu'],
  ['T2', '§2.8', 'setMenu( is the ONE call that draws a menu, and it is in actions.ts'],
  ['T3', '§2.9', 'no setConfirm( and no ConfirmDialog in the domain: a confirmation is an inline panel'],
  ['T4', '§2.14', 'no data-session-id anywhere in the domain'],
  ['T5', '§4.4', 'the discard channel is reached only through removeSessionNow, and the contract holds no batch channel'],
  ['T6', '§4.3', 'kill is reached only through endSessionNow'],
  ['T7', '§4.0', 'every per-row lifecycle verb is called only in actions.ts and only below a freshRow( in the same function'],
  ['T8', '§4.9', 'batch-end.ts spells no verb but End: not restart, remove, discard or restore, comments included'],
  ['T9', '§4.0', 'no function in actions.ts but freshRow reads .session off a drawn row'],
  ['T10', '§2.1', 'no tmux vocabulary in any string copy.ts draws'],
  ['T11', '§3.4', 'copy.ts holds no ?? 0 and no || 0'],
  ['T12', '§2.1', 'no name and no tmuxName is handed to a lifecycle call: every call is by session ID'],
  ['T13', '§2.7', 'the domain imports nothing from diagnostics'],
  ['T14', '§2.10, the fix round', 'the second click of a double click presses nothing: the sheet root swallows a click whose detail is above 1 on a control, in the capture phase'],
  ['T15', '§5.3, the fix round', 'under the sheet the split arrows and an agent hotkey reach nothing behind it, and the doors that draw a layer a person uses today close the sheet FIRST'],
  ['T16', '§2.11, §12, the reverify', 'a Past row\'s small line names the FOLDER the session ran in, as today, and never the project\'s label: two projects can be named alike'],
  // Phase 298, mechanism 18. Five over the domain's stylesheets and one over
  // its TSX. Each one is a divergence the phase measured and closed, so each is
  // a line a later round can write again with every other gate green.
  ['T17', '§2.1, Phase 298', 'no RATIO line-height in the domain: a line box is a --lh-* length, never a multiple of the size'],
  ['T18', '§2.1, Phase 298', 'every rule that sets a font-size sets a line-height in the same block'],
  ['T19', '§2.1, Phase 298', '--text-2xs nowhere but a chip and the footer: its own token says "Never body text"'],
  ['T20', '§2.1, Phase 298', 'every padding, margin and gap is a --space-* step, a --sm-* geometry property of the sheet, 0 or auto'],
  ['T21', '§2.1, Phase 298', 'every uppercase rule also sets letter-spacing: var(--track-caps)'],
  ['T22', '§2.2, Phase 298', 'every size= passed to Codicon or AgentIcon in the domain is one of sm, md, lg, 16 or 24']
];

if (process.argv.includes('--list')) {
  for (const [id, owner, title] of TEXT_RULES) process.stdout.write(`${id.padEnd(4)} ${owner.padEnd(14)} ${title}\n`);
  process.exit(0);
}

// ---------------------------------------------------------------------------
// The source, parsed
// ---------------------------------------------------------------------------

const DOMAIN = join(ROOT, 'src', 'renderer', 'session-manager');
const rel = (path) => relative(ROOT, path);

/** Every .ts and .tsx under a directory, tests excluded. */
function sourcesUnder(dir) {
  const out = [];
  // A tree without the directory (the parent commit, a half-landed round) is
  // read as holding nothing, and the rules say so by name rather than crash.
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
/** One file's AST, parsed once. */
function astOf(path) {
  let sf = parsed.get(path);
  if (sf === undefined) {
    sf = ts.createSourceFile(
      path,
      readFileSync(path, 'utf8'),
      ts.ScriptTarget.Latest,
      true,
      path.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
    );
    parsed.set(path, sf);
  }
  return sf;
}

/** Every node of a file, depth first. */
function nodesOf(path) {
  const out = [];
  const visit = (n) => {
    out.push(n);
    ts.forEachChild(n, visit);
  };
  visit(astOf(path));
  return out;
}

/** file:line for a node. */
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

/** The innermost function-like node around a node, or null at module scope. */
function enclosingFunction(node) {
  for (let n = node.parent; n !== undefined; n = n.parent) {
    if (
      ts.isFunctionDeclaration(n) ||
      ts.isFunctionExpression(n) ||
      ts.isArrowFunction(n) ||
      ts.isMethodDeclaration(n)
    ) {
      return n;
    }
  }
  return null;
}

/** A readable name for a function-like node. */
function functionName(fn) {
  if (fn === null) return '(module scope)';
  if (fn.name !== undefined && ts.isIdentifier(fn.name)) return fn.name.text;
  const p = fn.parent;
  if (p !== undefined && ts.isVariableDeclaration(p) && ts.isIdentifier(p.name)) return p.name.text;
  if (p !== undefined && ts.isPropertyAssignment(p) && ts.isIdentifier(p.name)) return `${p.name.text}:`;
  return '(anonymous)';
}

/** The text of every string a file holds: literals, template pieces and JSX text. */
function stringsOf(path) {
  return nodesOf(path)
    .filter(
      (n) =>
        ts.isStringLiteral(n) ||
        ts.isNoSubstitutionTemplateLiteral(n) ||
        ts.isTemplateHead(n) ||
        ts.isTemplateMiddle(n) ||
        ts.isTemplateTail(n) ||
        ts.isJsxText(n)
    )
    .map((n) => ({ node: n, text: n.text }));
}

// ---------------------------------------------------------------------------
// The source rules
// ---------------------------------------------------------------------------

const failures = new Map(TEXT_RULES.map(([id]) => [id, []]));
const checks = new Map(TEXT_RULES.map(([id]) => [id, 0]));
const fail = (id, text) => failures.get(id).push(text);
const checked = (id, n = 1) => checks.set(id, checks.get(id) + n);

const domainFiles = sourcesUnder(DOMAIN);
const ACTIONS = join(DOMAIN, 'actions.ts');
const BATCH_END = join(DOMAIN, 'batch-end.ts');
const COPY = join(DOMAIN, 'copy.ts');

function textRules() {
  if (domainFiles.length < 10) {
    fail('T1', `the domain holds ${String(domainFiles.length)} source files; a gate that reads fewer than ten has lost its subject`);
  }
  const MENU_ROLES = new Set(['menu', 'menuitem', 'menubar', 'menuitemcheckbox', 'menuitemradio']);
  const DRAWS_A_MENU = new Set(['setMenu', 'popupMenu', 'showContextMenu', 'buildFromTemplate', 'popup']);
  const ROW_VERBS = new Set([
    'endSessionNow',
    'removeSessionNow',
    'restartSessionNow',
    'renameSessionNow',
    'restoreSessionNow',
    'restorePastSession'
  ]);
  const LIFECYCLE_CALLS = new Set([
    ...ROW_VERBS,
    'jumpToSession',
    'freshRow',
    'kill',
    'discard',
    'end',
    'remove',
    'restore',
    'restart',
    'rename',
    'savedOutput',
    'goThen',
    'openSavedOutput',
    'markSessionSheetInlineBusy',
    'settleSessionSheetInline',
    'reportSessionSheetBatch',
    'runPrimary',
    'openDetails',
    'goToSession',
    'saveRename'
  ]);
  let setMenuSites = 0;
  let endNowSites = 0;

  for (const path of domainFiles) {
    for (const n of nodesOf(path)) {
      // T1, T4. JSX attributes.
      if (ts.isJsxAttribute(n)) {
        const name = n.name.getText(astOf(path));
        checked('T1');
        checked('T4');
        const value = n.initializer !== undefined && ts.isStringLiteral(n.initializer) ? n.initializer.text : null;
        if (name === 'role' && value !== null && MENU_ROLES.has(value)) fail('T1', `${where(path, n)} draws role="${value}"`);
        if (/^popover/i.test(name)) fail('T1', `${where(path, n)} draws a ${name} attribute`);
        if (name === 'data-session-id') fail('T4', `${where(path, n)} stamps data-session-id`);
      }
      if ((ts.isJsxOpeningElement(n) || ts.isJsxSelfClosingElement(n)) && n.tagName.getText(astOf(path)) === 'menu') {
        fail('T1', `${where(path, n)} draws a <menu> element`);
      }
      if (ts.isIdentifier(n) && n.text === 'ContextMenu') fail('T1', `${where(path, n)} names ContextMenu, the DOM menu`);
      // T3.
      if (ts.isIdentifier(n) && (n.text === 'setConfirm' || n.text === 'ConfirmDialog')) {
        fail('T3', `${where(path, n)} names ${n.text}`);
      }
      // T4, T5, T6 in strings.
      if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n) || ts.isTemplateHead(n) || ts.isTemplateMiddle(n) || ts.isTemplateTail(n)) {
        if (n.text.includes('data-session-id')) fail('T4', `${where(path, n)} spells data-session-id in a string`);
        if (n.text.includes('sessions:discard')) fail('T5', `${where(path, n)} spells the channel sessions:discard`);
        if (n.text.includes('sessions:kill')) fail('T6', `${where(path, n)} spells the channel sessions:kill`);
      }
      if (ts.isPropertyAccessExpression(n)) {
        const name = n.name.text;
        if (name === 'sessionId' && n.expression.getText(astOf(path)).endsWith('dataset')) {
          fail('T4', `${where(path, n)} reads or writes dataset.sessionId`);
        }
        if (name === 'discard' || name === 'discardSession') fail('T5', `${where(path, n)} reaches .${name}`);
        if (name === 'kill') fail('T6', `${where(path, n)} reaches .kill`);
      }
      if (ts.isIdentifier(n) && n.text === 'discardSession') fail('T5', `${where(path, n)} names discardSession`);
      // T13.
      if (ts.isImportDeclaration(n) && ts.isStringLiteral(n.moduleSpecifier)) {
        checked('T13');
        if (/diagnostic/i.test(n.moduleSpecifier.text)) fail('T13', `${where(path, n)} imports ${n.moduleSpecifier.text}`);
      }
      if (!ts.isCallExpression(n)) continue;
      const callee = calleeName(n);
      if (callee === null) continue;
      // T2.
      if (DRAWS_A_MENU.has(callee)) {
        checked('T2');
        if (callee !== 'setMenu') fail('T2', `${where(path, n)} draws a menu through ${callee}(`);
        else if (path !== ACTIONS) fail('T2', `${where(path, n)} calls setMenu( outside actions.ts`);
        else setMenuSites += 1;
      }
      // T6.
      if (callee === 'kill') fail('T6', `${where(path, n)} calls kill(`);
      if (callee === 'endSessionNow') endNowSites += 1;
      // T7.
      if (ROW_VERBS.has(callee)) {
        checked('T7');
        if (path !== ACTIONS) {
          fail('T7', `${where(path, n)} calls ${callee}( outside actions.ts`);
        } else {
          const fn = enclosingFunction(n);
          const inBatchDeps =
            callee === 'endSessionNow' &&
            fn !== null &&
            ts.isArrowFunction(fn) &&
            fn.parent !== undefined &&
            ts.isPropertyAssignment(fn.parent) &&
            fn.parent.name.getText(astOf(path)) === 'end' &&
            ts.isObjectLiteralExpression(fn.parent.parent) &&
            ts.isCallExpression(fn.parent.parent.parent) &&
            calleeName(fn.parent.parent.parent) === 'runBatchEnd';
          if (!inBatchDeps) {
            const before =
              fn !== null &&
              nodesOf(ACTIONS).some(
                (m) =>
                  ts.isCallExpression(m) &&
                  calleeName(m) === 'freshRow' &&
                  m.getStart() >= fn.getStart() &&
                  m.getEnd() <= fn.getEnd() &&
                  m.getStart() < n.getStart()
              );
            if (!before) {
              fail('T7', `${where(path, n)} calls ${callee}( in ${functionName(fn)} with no freshRow( above it in that function`);
            }
          }
        }
      }
      // T12.
      if (LIFECYCLE_CALLS.has(callee)) {
        checked('T12');
        for (const arg of n.arguments) {
          const text = arg.getText(astOf(path));
          if (/\.name\b|tmuxName/.test(text)) {
            fail('T12', `${where(path, n)} hands ${JSON.stringify(text)} to ${callee}(`);
          }
        }
      }
    }
  }
  // The rules that fail on a spelling count the files they read.
  checked('T3', domainFiles.length);
  checked('T6', domainFiles.length);
  if (setMenuSites === 0) fail('T2', 'no setMenu( call in actions.ts, so the row menu is not drawn natively');
  if (endNowSites === 0) fail('T6', 'no endSessionNow( call in the domain, so End reaches main some other way or not at all');

  // T5, renderer wide: the SESSION discard bridge is called by the sessions
  // slice alone. Two named exceptions, each the cleanup of a harness drive that
  // kills the session first (SPEC §4.9 names both), and `git.discard`, which is
  // a different verb on a different bridge. An exception that no longer matches
  // anything is itself a finding, so the list cannot rot into a blanket pass.
  const DISCARD_EXCEPTIONS = [
    ['src/renderer/app/probe-registry.ts', 'a harness cleanup: kill, then discard'],
    ['src/renderer/editor/shot-hook.ts', 'a harness cleanup: kill, then discard']
  ];
  const exceptionHits = new Map(DISCARD_EXCEPTIONS.map(([file]) => [file, 0]));
  for (const path of sourcesUnder(join(ROOT, 'src', 'renderer'))) {
    if (path.endsWith(join('state', 'sessions-slice.ts'))) continue;
    for (const n of nodesOf(path)) {
      if (!ts.isCallExpression(n) || !ts.isPropertyAccessExpression(n.expression)) continue;
      if (n.expression.name.text !== 'discard') continue;
      if (/\bgit\b/.test(n.expression.expression.getText(astOf(path)))) continue;
      checked('T5');
      const file = rel(path);
      if (exceptionHits.has(file)) {
        exceptionHits.set(file, exceptionHits.get(file) + 1);
        continue;
      }
      fail('T5', `${where(path, n)} calls the session discard outside the sessions slice`);
    }
  }
  for (const [file, hits] of exceptionHits) {
    if (hits === 0) fail('T5', `the named exception ${file} no longer calls a discard; take it off the list`);
  }
  // T5, the contract: no invoke channel carries many sessions at once.
  for (const path of sourcesUnder(join(ROOT, 'src', 'shared', 'ipc'))) {
    for (const n of nodesOf(path)) {
      if (ts.isPropertySignature(n) && n.name !== undefined && ts.isStringLiteral(n.name) && /^sessions:/.test(n.name.text)) {
        checked('T5');
        if (/batch|many|bulk|all$/i.test(n.name.text)) fail('T5', `${where(path, n)} declares the channel ${n.name.text}`);
      }
    }
  }

  // T8. batch-end.ts, comments included, as its own header promises.
  {
    const text = readFileSync(BATCH_END, 'utf8');
    checked('T8');
    for (const m of text.matchAll(/restart|remove|discard|restore/gi)) {
      const line = text.slice(0, m.index).split('\n').length;
      fail('T8', `${rel(BATCH_END)}:${String(line)} spells "${m[0]}"`);
    }
  }

  // T9. No function in actions.ts but freshRow reads .session off a drawn row.
  // A name is resolved to ITS OWN declaration, scope by scope, so a `row`
  // that is a fresh read in one function is not confused with a `row` that
  // is a drawn one in another.
  {
    const sf = astOf(ACTIONS);
    /** Whether one declaration binds a drawn row: typed ManageRow, or a loop over `.rows`. */
    const bindsDrawnRow = (decl) => {
      if (decl.type !== undefined && /\bManageRow\b/.test(decl.type.getText(sf))) return true;
      const list = decl.parent;
      return (
        list !== undefined &&
        ts.isVariableDeclarationList(list) &&
        list.parent !== undefined &&
        ts.isForOfStatement(list.parent) &&
        /\.rows$/.test(list.parent.expression.getText(sf))
      );
    };
    /** The declaration an identifier use resolves to, walking out one scope at a time. */
    const declarationOf = (id) => {
      for (let n = id.parent; n !== undefined; n = n.parent) {
        const found = [];
        if (ts.isFunctionLike(n)) {
          for (const p of n.parameters ?? []) if (ts.isIdentifier(p.name) && p.name.text === id.text) found.push(p);
        }
        if (ts.isForOfStatement(n) && ts.isVariableDeclarationList(n.initializer)) {
          for (const d of n.initializer.declarations) if (ts.isIdentifier(d.name) && d.name.text === id.text) found.push(d);
        }
        if (ts.isBlock(n) || ts.isSourceFile(n)) {
          for (const st of n.statements) {
            if (!ts.isVariableStatement(st)) continue;
            for (const d of st.declarationList.declarations) {
              if (ts.isIdentifier(d.name) && d.name.text === id.text) found.push(d);
            }
          }
        }
        if (found.length > 0) return found[0];
      }
      return undefined;
    };
    let drawnRows = 0;
    for (const n of nodesOf(ACTIONS)) {
      if ((ts.isParameter(n) || ts.isVariableDeclaration(n)) && bindsDrawnRow(n)) drawnRows += 1;
    }
    checked('T9', drawnRows);
    if (drawnRows === 0) fail('T9', 'no drawn row is named in actions.ts, so this rule reads nothing');
    const isRow = (e) => {
      if (ts.isIdentifier(e)) {
        const decl = declarationOf(e);
        return decl !== undefined && bindsDrawnRow(decl);
      }
      return ts.isElementAccessExpression(e) && /\.rows$/.test(e.expression.getText(sf));
    };
    for (const n of nodesOf(ACTIONS)) {
      const fn = enclosingFunction(n);
      if (functionName(fn) === 'freshRow') continue;
      if (ts.isPropertyAccessExpression(n) && n.name.text === 'session' && isRow(n.expression)) {
        fail('T9', `${where(ACTIONS, n)} reads ${n.getText(sf)} in ${functionName(fn)}`);
      }
      if (ts.isVariableDeclaration(n) && ts.isObjectBindingPattern(n.name) && n.initializer !== undefined && isRow(n.initializer)) {
        const takes = n.name.elements.some((el) => (el.propertyName ?? el.name).getText(sf) === 'session');
        if (takes) fail('T9', `${where(ACTIONS, n)} destructures session off ${n.initializer.getText(sf)} in ${functionName(fn)}`);
      }
    }
  }

  // T10, T11. copy.ts.
  {
    const TMUX = /\b(pane|panes|window|windows|prefix|attach|attached|detach|detached|socket|server)\b/i;
    for (const { node, text } of stringsOf(COPY)) {
      checked('T10');
      const m = TMUX.exec(text);
      if (m !== null) fail('T10', `${where(COPY, node)} draws "${m[0]}" in ${JSON.stringify(text.slice(0, 80))}`);
    }
    for (const n of nodesOf(COPY)) {
      if (!ts.isBinaryExpression(n)) continue;
      const op = n.operatorToken.kind;
      if (op !== ts.SyntaxKind.QuestionQuestionToken && op !== ts.SyntaxKind.BarBarToken) continue;
      checked('T11');
      if (ts.isNumericLiteral(n.right) && Number(n.right.text) === 0) {
        fail('T11', `${where(COPY, n)} defaults to zero: ${n.getText(astOf(COPY))}`);
      }
    }
  }
}

// T14. The double click (the batch attack's P1, major): the first click ran a
// batch that closed its own panel, and the second landed on an ended row's
// Restore that slid under the pointer. One function, wired at the sheet ROOT in
// the capture phase, so no control below it ever sees the repeat.
{
  const SHEET = join(DOMAIN, 'SessionManagerSheet.tsx');
  const REPEAT = join(DOMAIN, 'repeat-click.ts');
  checked('T14', 2);
  if (!existsSync(REPEAT)) {
    fail('T14', `${rel(REPEAT)} is missing`);
  } else {
    const fn = nodesOf(REPEAT).find(
      (n) => ts.isFunctionDeclaration(n) && n.name?.text === 'isRepeatClickOnControl'
    );
    const body = fn === undefined ? '' : fn.getText(astOf(REPEAT));
    if (!/\.detail\s*>\s*1/.test(body)) fail('T14', `${rel(REPEAT)}: isRepeatClickOnControl no longer asks detail > 1`);
    const swallow = nodesOf(REPEAT).find(
      (n) => ts.isFunctionDeclaration(n) && n.name?.text === 'swallowRepeatClick'
    );
    const sw = swallow === undefined ? '' : swallow.getText(astOf(REPEAT));
    if (!/preventDefault\(\)/.test(sw) || !/stopPropagation\(\)/.test(sw)) {
      fail('T14', `${rel(REPEAT)}: swallowRepeatClick no longer both prevents and stops the repeat`);
    }
  }
  let wired = 0;
  for (const n of nodesOf(SHEET)) {
    if (!ts.isJsxAttribute(n) || n.name.getText(astOf(SHEET)) !== 'onClickCapture') continue;
    const el = n.parent?.parent;
    const cls = el?.attributes?.properties?.find((a) => ts.isJsxAttribute(a) && a.name.getText(astOf(SHEET)) === 'className');
    const text = n.initializer?.getText(astOf(SHEET)) ?? '';
    if (cls !== undefined && /modal session-sheet/.test(cls.getText(astOf(SHEET))) && /swallowRepeatClick/.test(text)) wired += 1;
  }
  if (wired !== 1) fail('T14', `the sheet root (.modal.session-sheet) wires onClickCapture={swallowRepeatClick} ${String(wired)} times, want 1`);
}

// T15. The doors under the sheet (the press attack's P1 and P3, and the
// no-regression verifier's W6). Read as source, because each is one clause in
// a file outside the domain that a later round can delete without a sheet test
// noticing.
{
  const KEYBOARD = join(ROOT, 'src', 'renderer', 'app', 'keyboard.ts');
  const MENU = join(ROOT, 'src', 'renderer', 'app', 'menu-actions.ts');
  const LAUNCH = join(ROOT, 'src', 'renderer', 'settings', 'launch-agent.ts');
  const code = (path) => readFileSync(path, 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/.*$/gm, ' ');
  const kb = code(KEYBOARD);
  const arrows = kb.slice(kb.indexOf('const onKeyDownArrows'), kb.indexOf("window.addEventListener('keydown', onKeyDown,"));
  checked('T15');
  if (!/sessionSheet !== null\)\s*\{\s*e\.preventDefault\(\);\s*return;/.test(arrows) || arrows.indexOf('sessionSheet') > arrows.indexOf('.navigate(')) {
    fail('T15', `${rel(KEYBOARD)}: the split arrows no longer return, prevented, under the sheet before they navigate`);
  }
  const launch = code(LAUNCH);
  const body = launch.slice(launch.indexOf('export async function launchAgent'));
  checked('T15');
  if (!/if \(s\.sessionSheet !== null\) return;/.test(body) || body.indexOf('sessionSheet') > body.indexOf('createSession(')) {
    fail('T15', `${rel(LAUNCH)}: an agent hotkey no longer starts nothing under the sheet`);
  }
  const menu = code(MENU);
  for (const [arm, verb] of [['next-session', 'navigate('], ['prev-session', 'navigate(']]) {
    const at = menu.indexOf(`case '${arm}':`);
    const armText = menu.slice(at, menu.indexOf('return;', menu.indexOf(verb, at)) + 7);
    checked('T15');
    if (at === -1 || !/if \(sheetOpen\) return;/.test(armText)) fail('T15', `${rel(MENU)}: ${arm} no longer returns under the sheet`);
  }
  for (const arm of ['new-project', 'open-remote-project', 'clone-repository']) {
    const at = menu.indexOf(`case '${arm}'`);
    const armText = menu.slice(at, menu.indexOf('case ', at + 6));
    checked('T15');
    if (at === -1 || !/if \(sheetOpen\) return;/.test(armText)) fail('T15', `${rel(MENU)}: ${arm} no longer returns under the sheet`);
  }
  for (const arm of ['end-session', 'attention', 'shortcuts', 'close-project']) {
    const at = menu.indexOf(`case '${arm}'`);
    const armText = menu.slice(at, menu.indexOf('case ', at + 6));
    checked('T15');
    if (at === -1 || !/leaveSessionManagerFor\(/.test(armText)) fail('T15', `${rel(MENU)}: ${arm} no longer closes the sheet FIRST under it`);
  }
  // T16. The reverify of the operator's ruling A: the first pass put the
  // project's LABEL on a Past row, and two folders can be named alike, so
  // `/nr/one/app` and `/nr/two/app` drew the same line. The folder is what
  // today's panel drew and what tells them apart. Read as text, because the
  // rendered line is a component's and this clause is one call.
  {
    const PAST_LIST = join(ROOT, 'src', 'renderer', 'session-manager', 'PastList.tsx');
    const past = code(PAST_LIST);
    const at = past.indexOf('function smallOf');
    const small = at === -1 ? '' : past.slice(at, past.indexOf('function promiseOf'));
    checked('T16');
    if (!/displayPath\(session\.cwd\)/.test(small)) {
      fail('T16', `${rel(PAST_LIST)}: a Past row's small line no longer names displayPath(session.cwd), the folder today's panel drew`);
    }
    // The reverify's RV-1: a substring test alone stayed green on two shapes
    // that reproduce the defect exactly — the `!underHead ||` arm dropped, so
    // an in-project session draws no folder under All, and the folder cut down
    // to its last segment, which is the project's name by another road.
    checked('T16');
    if (!/!underHead/.test(small)) {
      fail('T16', `${rel(PAST_LIST)}: the small line no longer asks !underHead, so a row drawn in the single list can lose its folder`);
    }
    checked('T16');
    if (/\.split\(|\.slice\(|\.pop\(|basename/.test(small)) {
      fail('T16', `${rel(PAST_LIST)}: the small line cuts the folder down; the whole path is what tells two projects named alike apart`);
    }
    checked('T16');
    if (/group\.label|group\.machineLabel/.test(small)) {
      fail('T16', `${rel(PAST_LIST)}: a Past row's small line names its group's label or machine again; two projects named alike then read the same`);
    }
    checked('T16');
    if (!/title=\{row\.session\.cwd\}/.test(past)) {
      fail('T16', `${rel(PAST_LIST)}: a Past row no longer carries its whole folder as a hover title`);
    }
  }

  for (const key of ["case 'j':", "case '/':"]) {
    const at = kb.indexOf(key);
    const armText = kb.slice(at, kb.indexOf('return;', kb.indexOf('leaveSessionManagerFor', at)) + 7);
    checked('T15');
    if (at === -1 || !/if \(s\.sessionSheet !== null\) \{\s*leaveSessionManagerFor\(/.test(armText)) {
      fail('T15', `${rel(KEYBOARD)}: ${key} no longer closes the sheet FIRST under it`);
    }
  }
}

// ---------------------------------------------------------------------------
// The stylesheets, and the icon scale (Phase 298, mechanism 18)
// ---------------------------------------------------------------------------

/** Every `.css` file of the domain. A tree without the directory holds none. */
function stylesUnder(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith('.css'))
    .map((name) => join(dir, name))
    .sort();
}

/**
 * Every innermost `selector { body }` of a stylesheet, comments removed first so
 * a sentence ABOUT a value is not a value, with the line its selector starts on.
 *
 * An `@media` wrapper is not a rule and carries no declaration of its own, so
 * the walk answers the rules INSIDE it and the wrapper's own text belongs to no
 * selector. The one question that is about a media block rather than about a
 * declaration — mechanism 14's, that the narrow row is never taller than the
 * wide one — is a unit case in p293-css-tokens.test.ts, over the text.
 */
function cssRulesOf(path) {
  // A comment is blanked CHARACTER BY CHARACTER and its newlines are kept, so
  // every file:line below is the line a person opens the file at. Replacing a
  // multi-line comment with one space moves every line after it.
  const code = readFileSync(path, 'utf8').replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
  const rules = [];
  for (const m of code.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const raw = m[1] ?? '';
    const lead = raw.length - raw.replace(/^\s+/, '').length;
    const line = code.slice(0, (m.index ?? 0) + lead).split('\n').length;
    const declarations = (m[2] ?? '')
      .split(';')
      .map((one) => one.trim())
      .filter((one) => one.includes(':'))
      .map((one) => {
        const at = one.indexOf(':');
        return { property: one.slice(0, at).trim(), value: one.slice(at + 1).trim() };
      });
    rules.push({ file: rel(path), selector: raw.trim().replace(/\s+/g, ' '), line, declarations });
  }
  return rules;
}

/**
 * The `--sm-*` custom properties the sheet declares on its OWN selector. T20
 * admits those in a spacing value and nothing else that is not a `--space-*`
 * step, because the sheet's geometry deliberately lives in one block
 * (session-manager.css's header says so) and `--sm-state-pad` is a padding.
 */
function sheetVariables(rules) {
  const out = new Set();
  for (const r of rules) {
    if (!/(^|[\s,])\.modal\.session-sheet($|[\s,:])/.test(r.selector)) continue;
    for (const d of r.declarations) if (/^--sm-/.test(d.property)) out.add(d.property);
  }
  return out;
}

const SPACING_PROPERTY =
  /^(padding|margin)(-(top|right|bottom|left|inline|block)(-(start|end))?)?$|^(row-|column-)?gap$/;

/** T19's two homes: a chip primitive and the footer. `.sm-count` is a chip too. */
const TWO_XS_ALLOWED = /\.sm-foot\b|chip|\.sm-count\b/;

/**
 * T20's one named exception. `.sr-only` is the app's visually-hidden clip idiom
 * and its `-1px` is a clip and not spacing. It is named by SELECTOR, PROPERTY
 * AND VALUE rather than by selector alone, so a real padding written on the same
 * rule is still a finding; and an exception that matches nothing is itself a
 * failure, because a list that rots into a blanket pass is worse than no list.
 */
const SPACING_EXCEPTIONS = [
  {
    selector: '.session-sheet .sr-only',
    property: 'margin',
    value: '-1px',
    why: 'the visually-hidden clip idiom, not spacing'
  }
];

/**
 * T21's one named exception. `::first-letter` raises ONE letter, and tracking a
 * single letter only adds a space after it.
 */
const UPPERCASE_EXCEPTIONS = [
  { match: /::first-letter/, why: 'one raised letter takes no tracking' }
];

function styleRules() {
  const files = stylesUnder(DOMAIN);
  if (files.length < 2) {
    fail('T17', `the domain holds ${String(files.length)} stylesheet(s); this half of the gate has lost its subject`);
    return;
  }
  const rules = files.flatMap((path) => cssRulesOf(path));
  checked('T17', files.length);
  if (rules.length < 60) {
    fail('T17', `the two stylesheets parsed to ${String(rules.length)} rules; a reader that finds fewer than sixty has lost them`);
  }
  const sheetVars = sheetVariables(rules);
  if (sheetVars.size === 0) {
    fail('T20', 'no --sm-* property is declared on .modal.session-sheet, so T20 cannot tell the sheet\'s own geometry from a literal');
  }
  const smVar = new RegExp(`var\\((?:${[...sheetVars].join('|')})\\)`, 'g');
  const spacingHits = SPACING_EXCEPTIONS.map(() => 0);
  const upperHits = UPPERCASE_EXCEPTIONS.map(() => 0);

  for (const r of rules) {
    const at = `${r.file}:${String(r.line)} ${r.selector}`;
    const heights = r.declarations.filter((d) => d.property === 'line-height');

    // T17. `line-height: 1.5` on a 10px step drew 15px, the only ratio line
    // height in any row in either tree, one pixel off --lh-2xs.
    for (const d of heights) {
      checked('T17');
      if (!/^var\(--lh-[a-z0-9-]+\)$/.test(d.value) && d.value !== 'normal') {
        fail('T17', `${at} sets line-height: ${d.value}. A ratio multiplies whatever the size turns out to be; every step in tokens.css:226-237 has a --lh-* length beside it`);
      }
    }

    // T18. `body { line-height: var(--lh-base) }` (globals.css:55-61) is a
    // LENGTH, so it inherits as a computed 20px: a rule that sets only a
    // font-size draws a 20px line box whatever its size. That is why the
    // pairing matters, and why the app pairs 63 percent of its own.
    // The `font` SHORTHAND always carries a line-height of its own, so it can
    // never be the unpaired case and is not asked about.
    for (const d of r.declarations.filter((one) => one.property === 'font-size')) {
      checked('T18');
      if (heights.length === 0) {
        fail('T18', `${at} sets font-size: ${d.value} and no line-height, so it draws body's inherited 20px line box`);
      }
    }

    // T19. tokens.css:219-225 on --text-2xs: "Never body text". Phase 293 drew
    // five runs of prose in it.
    for (const d of r.declarations) {
      if (!d.value.includes('var(--text-2xs)')) continue;
      checked('T19');
      if (!TWO_XS_ALLOWED.test(r.selector)) {
        fail('T19', `${at} draws --text-2xs (${d.property}: ${d.value}). The step is for a chip and the footer; its own token forbids body text`);
      }
    }

    // T20.
    for (const d of r.declarations) {
      if (!SPACING_PROPERTY.test(d.property)) continue;
      const ex = SPACING_EXCEPTIONS.findIndex(
        (one) => one.selector === r.selector && one.property === d.property && one.value === d.value
      );
      if (ex !== -1) {
        spacingHits[ex] += 1;
        continue;
      }
      checked('T20');
      const left = d.value
        .replace(/var\(--space-\d+\)/g, ' ')
        .replace(smVar, ' ')
        .replace(/\bcalc\b/g, ' ')
        .replace(/[()+*\/-]/g, ' ')
        .replace(/\bauto\b/g, ' ')
        .replace(/\b0\b/g, ' ')
        .trim();
      if (left !== '') {
        fail('T20', `${at} sets ${d.property}: ${d.value}; ${JSON.stringify(left)} is neither a --space-* step, a --sm-* property of the sheet, 0 nor auto`);
      }
    }

    // T21. The heading idiom is unanimous across the app's 26 uppercase rules.
    if (r.declarations.some((d) => d.property === 'text-transform' && d.value === 'uppercase')) {
      const ex = UPPERCASE_EXCEPTIONS.findIndex((one) => one.match.test(r.selector));
      if (ex !== -1) {
        upperHits[ex] += 1;
      } else {
        checked('T21');
        if (!r.declarations.some((d) => d.property === 'letter-spacing' && d.value === 'var(--track-caps)')) {
          fail('T21', `${at} raises its text to uppercase and does not set letter-spacing: var(--track-caps)`);
        }
      }
    }
  }

  SPACING_EXCEPTIONS.forEach((one, i) => {
    checked('T20');
    if (spacingHits[i] === 0) {
      fail('T20', `the named exception ${one.selector} { ${one.property}: ${one.value} } (${one.why}) matches nothing any more; take it off the list rather than leave a blanket pass behind it`);
    }
  });
  UPPERCASE_EXCEPTIONS.forEach((one, i) => {
    checked('T21');
    if (upperHits[i] === 0) {
      fail('T21', `the named exception ${String(one.match)} (${one.why}) matches no uppercase rule any more; take it off the list`);
    }
  });
}

/**
 * T22. Read from the TSX, because the size is a call site and not a stylesheet.
 * `<Codicon>`'s scale is 12/14/16 as sm/md/lg, and 24 is the one larger size the
 * app draws (the activity bar). Phase 293 shipped `size={19}` on an AgentIcon —
 * the only 19 in the codebase — and `size={28}`, larger than anything the app
 * draws. An element that passes NO size takes its component's own default and is
 * the shape this rule prefers, so absence is not asked about.
 */
function iconRules() {
  const ICONS = new Set(['Codicon', 'AgentIcon']);
  const WORDS = new Set(['sm', 'md', 'lg']);
  const NUMBERS = new Set([16, 24]);
  let sites = 0;
  for (const path of domainFiles) {
    if (!path.endsWith('.tsx')) continue;
    const sf = astOf(path);
    for (const n of nodesOf(path)) {
      if (!ts.isJsxOpeningElement(n) && !ts.isJsxSelfClosingElement(n)) continue;
      const tag = n.tagName.getText(sf);
      if (!ICONS.has(tag)) continue;
      sites += 1;
      for (const a of n.attributes.properties) {
        if (!ts.isJsxAttribute(a) || a.name.getText(sf) !== 'size') continue;
        checked('T22');
        const init = a.initializer;
        let ok = false;
        if (init !== undefined && ts.isStringLiteral(init)) {
          ok = WORDS.has(init.text);
        } else if (
          init !== undefined &&
          ts.isJsxExpression(init) &&
          init.expression !== undefined &&
          ts.isNumericLiteral(init.expression)
        ) {
          ok = NUMBERS.has(Number(init.expression.text));
        }
        if (!ok) {
          const drawn = init === undefined ? '(no value)' : init.getText(sf);
          fail('T22', `${where(path, a)} passes size=${drawn} to <${tag}>. The set is sm, md, lg, 16 and 24; a 19 or a 28 is a size nothing else in the app draws`);
        }
      }
    }
  }
  checked('T22', sites);
  if (sites === 0) fail('T22', 'no Codicon and no AgentIcon is drawn in the domain, so this rule reads nothing');
}

// ---------------------------------------------------------------------------
// The driven half
// ---------------------------------------------------------------------------

function drivenRules() {
  const probe = spawnSync(
    process.execPath,
    [tsxCli(), '--tsconfig', 'tsconfig.web.json', 'build/p293/manager-conformance-probe.mts'],
    { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 120_000 }
  );
  const line = (probe.stdout ?? '').split('\n').find((l) => l.startsWith('P293_JSON:'));
  if (line === undefined) {
    return [
      {
        id: 'PROBE',
        owner: 'the gate itself',
        title: 'the driven probe answered',
        checks: 1,
        failures: [
          `the probe printed no answer (exit ${String(probe.status)}). Its last words: ${`${probe.stdout ?? ''}${probe.stderr ?? ''}`.trim().split('\n').slice(-8).join(' // ')}`
        ]
      }
    ];
  }
  return JSON.parse(line.slice('P293_JSON:'.length)).rules;
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

try {
  textRules();
} catch (err) {
  fail('T1', `the source rules could not read the domain: ${err instanceof Error ? err.message : String(err)}`);
}
try {
  styleRules();
} catch (err) {
  fail('T17', `the style rules could not read the domain's stylesheets: ${err instanceof Error ? err.message : String(err)}`);
}
try {
  iconRules();
} catch (err) {
  fail('T22', `the icon rule could not read the domain's components: ${err instanceof Error ? err.message : String(err)}`);
}
const driven = drivenRules();
const all = [
  ...driven,
  ...TEXT_RULES.map(([id, owner, title]) => ({ id, owner, title, checks: checks.get(id), failures: failures.get(id) }))
];

let red = 0;
let total = 0;
for (const r of all) {
  total += r.checks;
  const ok = r.failures.length === 0;
  if (!ok) red += 1;
  process.stdout.write(`${ok ? 'ok  ' : 'FAIL'} ${r.id.padEnd(5)} ${String(r.checks).padStart(4)} check(s)  ${r.owner}: ${r.title}\n`);
}
const seconds = ((Date.now() - t0) / 1000).toFixed(2);
if (red > 0) {
  process.stdout.write('\n');
  for (const r of all) {
    for (const f of r.failures) process.stdout.write(`  - [p293 ${r.id}] ${r.owner}: ${f}\n`);
  }
  process.stdout.write(`\n${TAG} FAIL: ${String(red)} of ${String(all.length)} rules red, ${String(total)} checks, ${seconds} s.\n`);
  process.exit(1);
}
process.stdout.write(
  `\n${TAG} PASS: ${String(all.length)} rules, ${String(total)} checks, ${seconds} s. ` +
    'No Electron, no tmux, no ssh, no agent, nothing under the person\'s home.\n'
);
process.exit(0);
