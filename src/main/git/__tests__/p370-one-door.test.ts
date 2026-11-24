/**
 * Phase 370, item 5, read as text: there is ONE way to `git check-ignore`.
 * build/p370/SPEC.md §7.3 and D12.
 *
 * The file tree's store holds one call at a time and main holds one child at a
 * time. A second caller on either side would walk past both with every other
 * row green, which is what this file is for.
 *
 *   O1  under `src/renderer` only `tree/ignored.ts` names `checkIgnore`, and it
 *       calls it once, through one name that is asked its type and called, and
 *       nothing else: not copied, bound, passed on or read a second way
 *   O2  under `src/main` the argv element 'check-ignore' is written once, in
 *       `git/service.ts`, inside the job handed to `checkIgnoreLine.run(`, and
 *       no file but that one and `git/ignore-line.ts` says the words in a string
 *   O3  `checkIgnoreLine.run(` has one caller, the line is made once, and only
 *       `git/service.ts` imports its module
 *   O4  the preload exposes `checkIgnore` once, in `git.ts`
 *
 * Read with the TypeScript parser, so a comment is never read and a string
 * always is. Every rule is asked again over planted copies that must read red
 * on that rule, beside controls that must stay green. It reads what a file
 * SAYS: a name put together at run time is past it.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { SRC, relPath, sourceFiles } from '../../../shared/__tests__/source-scan';

/** `src/`-relative path → its text. */
type Tree = ReadonlyMap<string, string>;

const STORE = 'renderer/tree/ignored.ts';
const SERVICE = 'main/git/service.ts';
const LINE = 'main/git/ignore-line.ts';
const PRELOAD = 'preload/git.ts';

/** Only a file that says one of these is worth parsing. */
const WORTH_READING = /checkIgnore|check-ignore|IgnoreLine|ignore-line/;

function shippingTree(): Map<string, string> {
  const tree = new Map<string, string>();
  for (const side of ['main', 'preload', 'renderer']) {
    for (const file of sourceFiles(resolve(SRC, side))) {
      const text = readFileSync(file, 'utf8');
      if (WORTH_READING.test(text)) tree.set(relPath(file), text);
    }
  }
  return tree;
}

function walk(node: ts.Node, visit: (node: ts.Node) => void): void {
  visit(node);
  ts.forEachChild(node, (child) => walk(child, visit));
}

/** The text of a string or of any piece of a template, else null. */
function literalText(node: ts.Node): string | null {
  if (ts.isStringLiteralLike(node)) return node.text;
  if (ts.isTemplateHead(node) || ts.isTemplateMiddleOrTemplateTail(node)) {
    return node.text;
  }
  return null;
}

/** `a.b?.c` → `['a', 'b', 'c']`; an element access by a plain string counts. */
function chain(node: ts.Expression): string[] {
  if (ts.isIdentifier(node)) return [node.text];
  if (ts.isPropertyAccessExpression(node)) {
    return [...chain(node.expression), node.name.text];
  }
  if (ts.isElementAccessExpression(node) && ts.isStringLiteralLike(node.argumentExpression)) {
    return [...chain(node.expression), node.argumentExpression.text];
  }
  if (ts.isNonNullExpression(node) || ts.isParenthesizedExpression(node)) {
    return chain(node.expression);
  }
  return ['?'];
}

const isLineRun = (node: ts.Node): node is ts.CallExpression =>
  ts.isCallExpression(node) &&
  chain(node.expression).join('.') === 'checkIgnoreLine.run';

/** Is `node` inside the job the line is handed, and not merely near it? */
function insideTheJob(node: ts.Node): boolean {
  for (let at = node; at.parent !== undefined; at = at.parent) {
    const call = at.parent;
    if (isLineRun(call) && call.arguments[1] === at) {
      return ts.isArrowFunction(at) || ts.isFunctionExpression(at);
    }
  }
  return false;
}

/**
 * The only things the store may do with the name: declare it once from the
 * bridge, ask its type, and call it (`.call(`, or straight off the bridge).
 * Any other use is a second way to ask, under a name no rule here counts.
 */
function plainUse(id: ts.Identifier): boolean {
  const up = id.parent;
  if (ts.isVariableDeclaration(up)) return up.name === id;
  if (ts.isTypeOfExpression(up)) return true;
  if (!ts.isPropertyAccessExpression(up)) return false;
  if (up.expression === id) {
    // checkIgnore.call(…)
    return up.name.text === 'call' && ts.isCallExpression(up.parent) && up.parent.expression === up;
  }
  // bridge.checkIgnore: the declaration's own value, its type asked, or called
  const on = up.parent;
  if (ts.isTypeOfExpression(on)) return true;
  if (ts.isCallExpression(on)) return on.expression === up;
  return ts.isVariableDeclaration(on) && ts.isIdentifier(on.name) && on.name.text === 'checkIgnore';
}

/** Every rule broken, as `O<n> <file>: what`. Empty means one door. */
function readDoors(tree: Tree): string[] {
  const broken: string[] = [];
  let storeCalls = 0;
  let argv = 0;
  let lineRuns = 0;
  let linesMade = 0;
  let exposed = 0;

  for (const [file, text] of tree) {
    const source = ts.createSourceFile(
      file,
      text,
      ts.ScriptTarget.Latest,
      true,
      file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
    );
    const renderer = file.startsWith('renderer/');
    const main = file.startsWith('main/');
    const preload = file.startsWith('preload/');

    walk(source, (node) => {
      const said = literalText(node);
      const name = ts.isIdentifier(node) ? node.text : null;

      if (renderer) {
        const names = name === 'checkIgnore' || (said?.includes('checkIgnore') ?? false);
        if (names && file !== STORE) broken.push(`O1 ${file}: names checkIgnore`);
        if (file === STORE && (said?.includes('checkIgnore') ?? false)) {
          broken.push(`O1 ${file}: reaches checkIgnore by a string`);
        }
        if (file === STORE && name === 'checkIgnore' && !plainUse(node as ts.Identifier)) {
          broken.push(`O1 ${file}: hands checkIgnore on`);
        }
        if (file === STORE && ts.isCallExpression(node)) {
          const called = chain(node.expression);
          if (['call', 'apply'].includes(called.at(-1) ?? '')) called.pop();
          if (called.at(-1) === 'checkIgnore') storeCalls += 1;
        }
      }

      if (main) {
        if (said !== null && said.includes('check-ignore')) {
          if (file !== SERVICE && file !== LINE) {
            broken.push(`O2 ${file}: says check-ignore`);
          }
          if (said.trim() === 'check-ignore') {
            argv += 1;
            if (file !== SERVICE) broken.push(`O2 ${file}: holds the argv`);
            else if (!insideTheJob(node)) {
              broken.push(`O2 ${file}: the argv is outside the line`);
            }
          }
        }
        if (isLineRun(node)) {
          lineRuns += 1;
          if (file !== SERVICE) broken.push(`O3 ${file}: runs the line`);
        }
        if (
          ts.isCallExpression(node) &&
          chain(node.expression).at(-1) === 'createIgnoreLine'
        ) {
          linesMade += 1;
          if (file !== LINE) broken.push(`O3 ${file}: makes a line`);
        }
        if (said !== null && /(^|\/)ignore-line$/.test(said) && file !== SERVICE) {
          broken.push(`O3 ${file}: imports the line`);
        }
        if (name === 'checkIgnoreLine' && file !== SERVICE && file !== LINE) {
          broken.push(`O3 ${file}: names the line`);
        }
      }

      if (preload) {
        if (said === 'git:checkIgnore' || said === 'checkIgnore' || name === 'checkIgnore') {
          if (file !== PRELOAD) broken.push(`O4 ${file}: names checkIgnore`);
          else if (said === 'git:checkIgnore') exposed += 1;
        }
      }
    });
  }

  if (storeCalls !== 1) broken.push(`O1 ${STORE}: ${String(storeCalls)} calls, not 1`);
  if (argv !== 1) broken.push(`O2 main: ${String(argv)} argv, not 1`);
  if (lineRuns !== 1) broken.push(`O3 main: the line is run ${String(lineRuns)} times, not 1`);
  if (linesMade !== 1) broken.push(`O3 main: ${String(linesMade)} lines made, not 1`);
  if (exposed !== 1) broken.push(`O4 ${PRELOAD}: exposed ${String(exposed)} times, not 1`);
  return broken;
}

const shipping = shippingTree();

/** The shipping tree with one file edited or added. */
function planted(file: string, edit: (text: string) => string): Tree {
  const tree = new Map(shipping);
  const before = tree.get(file) ?? '';
  const after = edit(before);
  // A plant whose anchor has gone would leave the tree as it was and pass for
  // the wrong reason.
  if (after === before) throw new Error(`the plant did not take in ${file}`);
  tree.set(file, after);
  return tree;
}

/** The rules a tree breaks, by number. */
const rules = (tree: Tree): string[] =>
  [...new Set(readDoors(tree).map((line) => line.slice(0, 2)))].sort();

const ARGV_JOB = /\(\) =>\s*runGit\(this\.repoPath, \['check-ignore', '-z', '--stdin'\], \{\s*stdin: asked\.join\('\\0'\) \+ '\\0'\s*\}\)/;

describe('there is one door to git check-ignore', () => {
  it('reads the four files the rules are about', () => {
    for (const file of [STORE, SERVICE, LINE, PRELOAD]) {
      expect(shipping.has(file), file).toBe(true);
    }
    expect(ARGV_JOB.test(shipping.get(SERVICE) ?? '')).toBe(true);
  });

  it('is the store, the service and the line', () => {
    expect(readDoors(shipping)).toEqual([]);
  });
});

describe('a planted copy reads red on its own rule', () => {
  const append = (code: string) => (text: string) => `${text}\n${code}\n`;

  it.each<[string, string, string, (text: string) => string]>([
    [
      'a second renderer caller',
      'O1',
      'renderer/tree/git-status.ts',
      append("export const x = (g: any) => g.git.checkIgnore({ repoPath: '/r', paths: [] });")
    ],
    [
      'a second renderer caller, by a string',
      'O1',
      'renderer/scm/planted.ts',
      append("export const x = (g: any) => g.git['checkIgnore']({ repoPath: '/r', paths: [] });")
    ],
    [
      'a second call in the store itself',
      'O1',
      STORE,
      append("export const x = (g: any) => g.git.checkIgnore({ repoPath: '/r', paths: [] });")
    ],
    [
      'the store calling through apply',
      'O1',
      STORE,
      append('export const x = (checkIgnore: any) => checkIgnore.apply(null, []);')
    ],
    [
      'the store asking through a second name',
      'O1',
      STORE,
      append('export const x = (g: any) => { const ask = g.git.checkIgnore; return ask.call(g.git, {}); };')
    ],
    [
      'the store asking through a name taken apart',
      'O1',
      STORE,
      append('export const x = (g: any) => { const { checkIgnore: ask } = g.git; return ask({}); };')
    ],
    [
      'the store asking through a string',
      'O1',
      STORE,
      append("export const x = (g: any) => { const ask = g.git['checkIgnore']; return ask({}); };")
    ],
    [
      'the store binding it',
      'O1',
      STORE,
      append('export const x = (checkIgnore: any) => checkIgnore.bind(null);')
    ],
    [
      'the store handing it on',
      'O1',
      STORE,
      append('export const x = (g: any, f: any) => f(g.git.checkIgnore);')
    ],
    [
      'a second argv in src/main',
      'O2',
      'main/overview/planted.ts',
      append("export const x = (run: any) => run('/r', ['check-ignore', '-z', '--stdin']);")
    ],
    [
      'a second argv in src/main, in a template',
      'O2',
      'main/overview/planted.ts',
      append('export const x = (run: any, p: string) => run(`git -C ${p} check-ignore -z`);')
    ],
    [
      'a second argv in the service',
      'O2',
      SERVICE,
      append("export const x = () => runGit('/r', [\"check-ignore\", '-z', '--stdin']);")
    ],
    [
      'the argv outside the line',
      'O2',
      SERVICE,
      (text) =>
        text.replace(
          ARGV_JOB,
          () =>
            "() => Promise.resolve({ code: 1 } as any)); runGit(this.repoPath, ['check-ignore', '-z', '--stdin'], {}"
        )
    ],
    [
      'the argv handed to the line as a call already started',
      'O2',
      SERVICE,
      (text) =>
        text.replace(
          ARGV_JOB,
          () => "runGit(this.repoPath, ['check-ignore', '-z', '--stdin'], {}) as any"
        )
    ],
    [
      'a second caller of the line',
      'O3',
      SERVICE,
      append("export const x = () => checkIgnoreLine.run('/r', () => Promise.resolve(1));")
    ],
    [
      'a line of its own in the service',
      'O3',
      SERVICE,
      append('export const own = createIgnoreLine(() => new Error());')
    ],
    [
      'another module that imports the line',
      'O3',
      'main/git/planted.ts',
      append("import { checkIgnoreLine as l } from './ignore-line'; export const x = l;")
    ],
    [
      'a second exposure in the preload',
      'O4',
      PRELOAD,
      append("export const x = (invoke: any) => invoke('git:checkIgnore', {});")
    ],
    [
      'an exposure in another preload file',
      'O4',
      'preload/planted.ts',
      append("export const x = (invoke: any) => invoke('git:checkIgnore', {});")
    ]
  ])('%s', (_what, rule, file, edit) => {
    expect(rules(planted(file, edit))).toEqual([rule]);
  });

  it('a door that has gone reads red too', () => {
    expect(rules(planted(STORE, () => 'export const nothing = 1;'))).toEqual(['O1']);
    expect(rules(planted(SERVICE, () => 'export const nothing = 1;'))).toEqual(['O2', 'O3']);
    expect(rules(planted(PRELOAD, () => 'export const nothing = 1;'))).toEqual(['O4']);
  });
});

describe('a control stays green', () => {
  it.each([
    ['a comment in the renderer', 'renderer/scm/planted.ts', '// g.git.checkIgnore(x) is the store’s'],
    ['a comment in main', 'main/overview/planted.ts', "/* runGit(['check-ignore']) */ export {};"],
    ['a comment in the preload', 'preload/planted.ts', "// invoke('git:checkIgnore')"],
    ['a comment in the service', SERVICE, "// ['check-ignore', '-z'] is the line's job"]
  ])('%s', (_what, file, code) => {
    expect(readDoors(planted(file, (text) => `${text}\n${code}\n`))).toEqual([]);
  });
});
