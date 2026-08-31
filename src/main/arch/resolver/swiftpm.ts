/**
 * The Swift manifest reader (Phase 180): Package.swift and project.pbxproj,
 * reduced to TARGETS, because target grain is the only grain Swift source has.
 *
 * WHY TARGETS AND NOT FILES, stated once here and leaned on by ./swift.ts.
 * Files inside one Swift target see each other with ZERO import statements,
 * so file to file edges inside a target DO NOT EXIST IN THE SOURCE and are
 * never invented. What the source does contain is `import ModuleName`, and a
 * module name is a target somebody declared. So this reader extracts the
 * literal target declarations, being name, path defaulting to Sources/Name
 * (Tests/Name for a test target), and the declared package dependencies, and
 * the arm lands an edge from the importing file's target to the named one.
 *
 * PACKAGE.SWIFT IS PARSED AS SWIFT SOURCE BY THE SAME GRAMMAR the palette
 * reads .swift files with, through web-tree-sitter and the vendored wasm that
 * src/main/symbols/paths.ts owns the location of. It is parsed, NEVER RUN:
 * no swift, no xcodebuild, no gradle, no process of any kind. A manifest
 * whose `targets:` are COMPUTED rather than written as literals, being a
 * variable, a loop, a concatenation or an interpolated name, STOPS with the
 * limit recorded in `stopped`, and every one of its imports then answers
 * `unresolved` rather than resolving against a guess.
 *
 * Discovery is from the caller's tracked file list, so an untracked manifest
 * is not read and no directory is walked. Parsing loads the ~4 MB Swift wasm
 * once per process and keeps it; a repository with no Swift manifest loads
 * nothing.
 */

import { Language, Parser } from 'web-tree-sitter';
import type { Node as TsNode } from 'web-tree-sitter';
import { grammarPath, runtimeWasmPath } from '../../symbols/paths';
import { joinWithin, parentOf, readTextOrNull } from './paths';
import { readPbxProject } from './pbxproj';

/** One declared target: the unit a Swift import can land on. */
export interface SwiftTarget {
  /** The module name an `import` statement writes. */
  name: string;
  /** Repository relative path of the manifest that declared it. */
  manifest: string;
  /** SPM: the target's source directory, repository relative. */
  dir: string | null;
  /** Xcode: the explicit member files, repository relative. */
  files: string[] | null;
  /** Xcode 16 synchronized folder prefixes, repository relative. */
  syncDirs: string[];
}

/** Everything the Swift arm resolves against. */
export interface SwiftManifest {
  targets: SwiftTarget[];
  /** Declared external package and product names. Targets win over these. */
  packages: Set<string>;
  /** Manifests this reader refused, with the reason a face can state. */
  stopped: { path: string; reason: string }[];
  /** True when any Swift manifest was found at all. */
  present: boolean;
}

export function emptySwiftManifest(): SwiftManifest {
  return { targets: [], packages: new Set(), stopped: [], present: false };
}

/** How many manifests of each kind one repository may bring. */
const MAX_SWIFT_MANIFESTS = 16;

/** The parser, booted once per process and only when a manifest exists. */
let swiftParser: Promise<Parser> | null = null;

function parser(): Promise<Parser> {
  swiftParser ??= (async () => {
    await Parser.init({ locateFile: () => runtimeWasmPath() });
    const language = await Language.load(grammarPath('swift'));
    const instance = new Parser();
    instance.setLanguage(language);
    return instance;
  })();
  return swiftParser;
}

/**
 * Read every tracked Swift manifest of one repository.
 *
 * `readText` exists for the tests and the conformance probe, which hand in
 * bytes rather than opening a repository; the default reads the file.
 */
export async function readSwiftManifest(
  repoPath: string,
  trackedFiles: readonly string[],
  readText: (relPath: string) => string | null = (relPath) =>
    readTextOrNull(`${repoPath}/${relPath}`)
): Promise<SwiftManifest> {
  const out = emptySwiftManifest();
  const packageManifests = trackedFiles
    .filter((p) => p === 'Package.swift' || p.endsWith('/Package.swift'))
    .slice(0, MAX_SWIFT_MANIFESTS);
  const projects = trackedFiles
    .filter((p) => p.endsWith('.xcodeproj/project.pbxproj'))
    .slice(0, MAX_SWIFT_MANIFESTS);
  for (const relPath of packageManifests) {
    const text = readText(relPath);
    if (text === null) continue;
    out.present = true;
    await readPackageSwift(relPath, text, out);
  }
  for (const relPath of projects) {
    const text = readText(relPath);
    if (text === null) continue;
    out.present = true;
    const project = readPbxProject(relPath, text);
    for (const target of project.targets) {
      out.targets.push({
        name: target.name,
        manifest: relPath,
        dir: null,
        files: target.files.filter((f) => f.endsWith('.swift')),
        syncDirs: target.syncDirs
      });
      for (const product of target.products) out.packages.add(product);
    }
    for (const name of project.remotePackages) out.packages.add(name);
  }
  // A product a LOCAL manifest declares as a target is first party, so it
  // must not sit in the external set shadowing its own target.
  for (const target of out.targets) out.packages.delete(target.name);
  return out;
}

// ---------------------------------------------------------------------------
// Package.swift, parsed as Swift source
// ---------------------------------------------------------------------------

/** The target factory names SPM ships. Anything else in `targets:` stops the manifest. */
const TARGET_CALLS: ReadonlySet<string> = new Set([
  'target',
  'executableTarget',
  'testTarget',
  'binaryTarget',
  'systemLibrary',
  'plugin',
  'macro'
]);

async function readPackageSwift(
  relPath: string,
  text: string,
  out: SwiftManifest
): Promise<void> {
  const manifestDir = parentOf(relPath);
  let root: TsNode;
  try {
    const tree = (await parser()).parse(text);
    if (tree === null) {
      out.stopped.push({ path: relPath, reason: 'The manifest could not be parsed' });
      return;
    }
    root = tree.rootNode;
  } catch {
    out.stopped.push({ path: relPath, reason: 'The manifest could not be parsed' });
    return;
  }
  const packageCall = findCall(root, 'Package');
  if (packageCall === null) {
    out.stopped.push({
      path: relPath,
      reason: 'The manifest declares no Package initializer this build can read'
    });
    return;
  }
  const args = callArguments(packageCall);

  // Declared external packages: `.package(url:)`, `.package(name:url:)`. A
  // `.package(path:)` names a LOCAL package whose own manifest is read on its
  // own, so it contributes nothing external.
  const dependencies = args.get('dependencies');
  if (dependencies !== undefined && dependencies.type === 'array_literal') {
    for (const element of namedChildren(dependencies)) {
      if (element.type !== 'call_expression') continue;
      if (calleeName(element) !== 'package') continue;
      const packageArgs = callArguments(element);
      if (packageArgs.has('path')) continue;
      const name = stringValue(packageArgs.get('name'));
      const url = stringValue(packageArgs.get('url'));
      if (name !== null) out.packages.add(name);
      else if (url !== null) {
        const tail = url.replace(/\/+$/, '').split('/').pop() ?? '';
        const bare = tail.endsWith('.git') ? tail.slice(0, -4) : tail;
        if (bare.length > 0) out.packages.add(bare);
      }
    }
  }

  const targets = args.get('targets');
  if (targets === undefined || targets.type !== 'array_literal') {
    out.stopped.push({
      path: relPath,
      reason: 'The targets are computed rather than written as literals'
    });
    return;
  }
  const declared: SwiftTarget[] = [];
  for (const element of namedChildren(targets)) {
    if (element.type === 'comment') continue;
    const callee = element.type === 'call_expression' ? calleeName(element) : null;
    if (callee === null || !TARGET_CALLS.has(callee)) {
      out.stopped.push({
        path: relPath,
        reason: 'The targets are computed rather than written as literals'
      });
      return;
    }
    const targetArgs = callArguments(element);
    const name = stringValue(targetArgs.get('name'));
    if (name === null) {
      out.stopped.push({
        path: relPath,
        reason: 'A target name is computed rather than written as a literal'
      });
      return;
    }
    const explicit = stringValue(targetArgs.get('path'));
    const fallback = callee === 'testTarget' ? `Tests/${name}` : `Sources/${name}`;
    const dir = joinWithin(manifestDir, explicit ?? fallback);
    declared.push({
      name,
      manifest: relPath,
      dir: dir === null || dir === '' ? null : dir,
      files: null,
      syncDirs: []
    });
    // `.product(name: "X", package: "Y")` in a target's dependencies declares
    // the external product a plain string in the same list cannot.
    const deps = targetArgs.get('dependencies');
    if (deps !== undefined && deps.type === 'array_literal') {
      for (const dep of namedChildren(deps)) {
        if (dep.type !== 'call_expression' || calleeName(dep) !== 'product') continue;
        const productArgs = callArguments(dep);
        const product = stringValue(productArgs.get('name'));
        const from = stringValue(productArgs.get('package'));
        if (product !== null) out.packages.add(product);
        if (from !== null) out.packages.add(from);
      }
    }
  }
  out.targets.push(...declared);
}

/** The first call expression whose callee is exactly `name`. */
function findCall(root: TsNode, name: string): TsNode | null {
  const stack: TsNode[] = [root];
  while (stack.length > 0) {
    const node = stack.pop();
    if (node === undefined) break;
    if (node.type === 'call_expression' && calleeName(node) === name) return node;
    for (let i = node.namedChildCount - 1; i >= 0; i -= 1) {
      const child = node.namedChild(i);
      if (child !== null) stack.push(child);
    }
  }
  return null;
}

/** `Package` for `Package(...)`, `target` for `.target(...)`, else null. */
function calleeName(call: TsNode): string | null {
  const head = call.namedChild(0);
  if (head === null) return null;
  if (head.type === 'simple_identifier') return head.text;
  if (head.type === 'prefix_expression') {
    const inner = head.namedChild(0);
    return inner !== null && inner.type === 'simple_identifier' ? inner.text : null;
  }
  return null;
}

/** A call's labelled arguments, by label. Unlabelled arguments are dropped. */
function callArguments(call: TsNode): Map<string, TsNode> {
  const out = new Map<string, TsNode>();
  for (const child of namedChildren(call)) {
    if (child.type !== 'call_suffix') continue;
    for (const argsNode of namedChildren(child)) {
      if (argsNode.type !== 'value_arguments') continue;
      for (const arg of namedChildren(argsNode)) {
        if (arg.type !== 'value_argument') continue;
        let label: string | null = null;
        let value: TsNode | null = null;
        for (const piece of namedChildren(arg)) {
          if (piece.type === 'value_argument_label') label = piece.text;
          else value = piece;
        }
        if (label !== null && value !== null && !out.has(label)) {
          out.set(label, value);
        }
      }
    }
  }
  return out;
}

/**
 * The text of a plain string literal, or null for anything else, an
 * interpolated string included, because an interpolated name is a computed
 * name and computed names stop the manifest rather than resolve a guess.
 */
function stringValue(node: TsNode | undefined): string | null {
  if (node === undefined || node.type !== 'line_string_literal') return null;
  let text = '';
  for (const piece of namedChildren(node)) {
    if (piece.type === 'line_str_text') text += piece.text;
    else if (piece.type !== 'comment') return null;
  }
  return text;
}

function namedChildren(node: TsNode): TsNode[] {
  const out: TsNode[] = [];
  for (let i = 0; i < node.namedChildCount; i += 1) {
    const child = node.namedChild(i);
    if (child !== null) out.push(child);
  }
  return out;
}
