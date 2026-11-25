/**
 * PHASE 371, row B2, read as text: how the one bit reaches a window
 * (build/p371/SPEC.md D15, §4.2).
 *
 * The bit is true unless the watcher says otherwise, so there is ONE way for a
 * `false` to reach a window: the watcher's flush, through the bus, into
 * `broadcastGitChanged`. Everything else that broadcasts just did something to
 * the repository, and says nothing, which means it may have moved.
 *
 *   T1  `broadcastGitChanged` takes `gitMoved`, defaults it to `true`, and sends
 *       exactly `(EVT_GIT_CHANGED, repoPath, gitMoved)`
 *   T2  the two lines that hand a function over hand the function itself, since
 *       an arrow in between is where a value is dropped or put together
 *   T3  every other call of it, and every `deps.broadcast` in `depth-ipc.ts`,
 *       passes one argument, and `depth-ipc.ts` is handed the function itself
 *   T4  no other file under `src/main` names `EVT_GIT_CHANGED` or its channel
 *
 * Read with the TypeScript parser, so a comment is never read. Every rule is
 * asked again over planted copies that must read red on that rule.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { SRC, relPath, sourceFiles } from '../../../shared/__tests__/source-scan';

/** `src/`-relative path → its text. */
type Tree = ReadonlyMap<string, string>;

const IPC = 'main/git/ipc.ts';
const DEPTH = 'main/git/depth-ipc.ts';
const NAME = 'broadcastGitChanged';

function shippingTree(): Map<string, string> {
  const tree = new Map<string, string>();
  for (const file of sourceFiles(resolve(SRC, 'main'))) {
    const text = readFileSync(file, 'utf8');
    if (/EVT_GIT_CHANGED|git:changed|broadcastGitChanged/.test(text) || relPath(file) === DEPTH) {
      tree.set(relPath(file), text);
    }
  }
  return tree;
}

const parsed = (name: string, text: string): ts.SourceFile =>
  ts.createSourceFile(name, text, ts.ScriptTarget.Latest, true);

function nodesOf(source: ts.SourceFile): ts.Node[] {
  const out: ts.Node[] = [];
  const visit = (node: ts.Node): void => {
    out.push(node);
    ts.forEachChild(node, visit);
  };
  visit(source);
  return out;
}

/** The rules a tree breaks, each by its letter. */
function broken(tree: Tree): string[] {
  const out = new Set<string>();
  const ipc = parsed(IPC, tree.get(IPC) ?? '');
  const nodes = nodesOf(ipc);
  const text = (node: ts.Node | undefined): string =>
    node === undefined ? '' : node.getText(node.getSourceFile()).replace(/\s+/g, ' ');

  // T1
  const decls = nodes.filter(
    (x): x is ts.FunctionDeclaration => ts.isFunctionDeclaration(x) && x.name?.text === NAME
  );
  const decl = decls[0];
  const [first, second] = decl?.parameters ?? [];
  if (
    decls.length !== 1 ||
    decl!.parameters.length !== 2 ||
    text(first) !== 'repoPath: string' ||
    text(second?.name) !== 'gitMoved' ||
    text(second?.initializer) !== 'true' ||
    text(decl!.body) !== '{ broadcastEvent(EVT_GIT_CHANGED, repoPath, gitMoved); }'
  ) {
    out.add('T1');
  }

  // T2 and T3, over every use of the name but its declaration.
  let handedToBus = 0;
  let handedToDepth = 0;
  for (const x of nodes) {
    if (!ts.isIdentifier(x) || x.text !== NAME || x.parent === decl) continue;
    const up = x.parent;
    if (ts.isCallExpression(up) && up.expression === x) {
      if (up.arguments.length !== 1) out.add('T3');
    } else if (text(up) === `onRepoChanged(${NAME})` && ts.isExpressionStatement(up.parent)) {
      handedToBus += 1;
    } else if (text(up) === `broadcast: ${NAME}`) {
      handedToDepth += 1;
    } else {
      out.add('T3');
    }
  }
  const onChanges = nodes
    .filter((x): x is ts.PropertyAssignment => ts.isPropertyAssignment(x) && text(x.name) === 'onChange')
    .map((x) => text(x.initializer));
  if (handedToBus !== 1 || onChanges.join() !== 'emitRepoChanged') out.add('T2');
  if (handedToDepth !== 1) out.add('T3');

  const depthCalls = nodesOf(parsed(DEPTH, tree.get(DEPTH) ?? '')).filter(
    (x): x is ts.PropertyAccessExpression =>
      ts.isPropertyAccessExpression(x) && x.name.text === 'broadcast'
  );
  if (depthCalls.length === 0) out.add('T3');
  for (const x of depthCalls) {
    const up = x.parent;
    if (!ts.isCallExpression(up) || up.expression !== x || up.arguments.length !== 1) out.add('T3');
  }

  // T4
  for (const [name, body] of tree) {
    if (name === IPC) continue;
    for (const x of nodesOf(parsed(name, body))) {
      if (
        (ts.isIdentifier(x) && x.text === 'EVT_GIT_CHANGED') ||
        (ts.isStringLiteralLike(x) && x.text === 'git:changed')
      ) {
        out.add('T4');
      }
    }
  }
  return [...out].sort();
}

const shipping = shippingTree();

function planted(file: string, from: string, to: string): Map<string, string> {
  const tree = new Map(shipping);
  const text = tree.get(file) ?? '';
  expect(text.split(from).length - 1).toBeGreaterThan(0);
  tree.set(file, text.replace(from, to));
  return tree;
}

describe('B2: one way for a false to reach a window', () => {
  it('the shipping tree keeps every rule', () => {
    expect(broken(shipping)).toEqual([]);
  });

  const plants: [string, string, string, string, string][] = [
    ['T1', 'the value not sent', IPC, 'EVT_GIT_CHANGED, repoPath, gitMoved)', 'EVT_GIT_CHANGED, repoPath)'],
    ['T1', 'a constant sent', IPC, 'EVT_GIT_CHANGED, repoPath, gitMoved)', 'EVT_GIT_CHANGED, repoPath, true)'],
    ['T1', 'the default false', IPC, 'gitMoved = true)', 'gitMoved = false)'],
    ['T1', 'no default', IPC, 'gitMoved = true)', 'gitMoved?: boolean)'],
    ['T2', 'an arrow to the broadcast', IPC, 'onRepoChanged(broadcastGitChanged)', 'onRepoChanged((p) => broadcastGitChanged(p))'],
    ['T2', 'an arrow to the bus', IPC, 'onChange: emitRepoChanged', 'onChange: (p) => emitRepoChanged(p)'],
    ['T3', 'a second argument after a stage', IPC, 'broadcastGitChanged(svc.repoPath)', 'broadcastGitChanged(svc.repoPath, false)'],
    ['T3', 'a second argument in depth', DEPTH, 'deps.broadcast(svc.repoPath)', 'deps.broadcast(svc.repoPath, false)'],
    ['T3', 'an arrow to depth', IPC, 'broadcast: broadcastGitChanged', 'broadcast: (p) => broadcastGitChanged(p)'],
    ['T3', 'the function kept under another name', IPC, 'onRepoChanged(broadcastGitChanged);', 'onRepoChanged(broadcastGitChanged); const other = broadcastGitChanged; other("", false);'],
    ['T4', 'another sender', DEPTH, 'deps.broadcast(svc.repoPath)', 'broadcastEvent(EVT_GIT_CHANGED, svc.repoPath)'],
    ['T4', 'another sender, by the channel\'s own name', DEPTH, 'deps.broadcast(svc.repoPath)', "broadcastEvent('git:changed', svc.repoPath)"]
  ];
  it.each(plants)('%s is red for %s', (rule, _what, file, from, to) => {
    expect(broken(planted(file, from, to))).toContain(rule);
  });

  it('a comment that names it is not one that does', () => {
    expect(broken(planted(DEPTH, 'deps.broadcast(svc.repoPath)', '/* EVT_GIT_CHANGED git:changed */ deps.broadcast(svc.repoPath)'))).toEqual([]);
  });
});
