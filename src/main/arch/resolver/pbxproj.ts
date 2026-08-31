/**
 * The Xcode project membership reader (Phase 180).
 *
 * A `project.pbxproj` is an old style property list Xcode writes, and for the
 * Swift arm it answers exactly one question: WHICH FILES BELONG TO WHICH
 * TARGET. The reader takes the object graph the format itself declares, being
 * build files pointing at file references, file references sitting in a group
 * tree that carries the paths, source build phases listing the build files,
 * and native targets listing the phases. Xcode 16's synchronized folders,
 * where a target's membership is "everything under this directory", are read
 * as the directory prefixes they are. Swift package references contribute the
 * product names a target declares, so the arm can tell a declared product
 * from a name found nowhere.
 *
 * THE LIMIT, STATED. Only what the file literally holds is read: a file added
 * by a build rule, a script phase's outputs, and a path under a source tree
 * this reader does not understand (an absolute one, or one rooted in a build
 * setting) are simply not membership, and an import only they could explain
 * answers `unresolved`. Variant groups and localization are not walked.
 *
 * NOTHING HERE SPAWNS ANYTHING. It is a text parse of one tracked file, and
 * no value read here reaches an argv.
 */

import { joinWithin, parentOf } from './paths';

/** One native target and the files the project says it compiles. */
export interface PbxTarget {
  name: string;
  /** Explicit member paths, repository relative. */
  files: string[];
  /** Synchronized folder prefixes, repository relative (Xcode 16). */
  syncDirs: string[];
  /** Swift package product names this target declares a dependency on. */
  products: string[];
}

/** What one project file declared. */
export interface PbxProject {
  targets: PbxTarget[];
  /** Remote Swift package names, from their repository URLs. */
  remotePackages: string[];
}

/** One entry of the `objects` dictionary. */
interface PbxObject {
  isa: string;
  body: string;
}

/**
 * Parse one project.pbxproj.
 *
 * `pbxprojPath` is the file's own repository relative path; the project
 * directory every group path hangs from is the `.xcodeproj`'s parent.
 */
export function readPbxProject(
  pbxprojPath: string,
  text: string
): PbxProject {
  const projectDir = parentOf(parentOf(pbxprojPath));
  const objects = parseObjects(text);

  const field = (id: string, name: string): string | null => {
    const body = objects.get(id)?.body;
    if (body === undefined) return null;
    const match = new RegExp(`(?:^|[;{\\s])${name} = ("(?:[^"\\\\]|\\\\.)*"|[^;]+);`).exec(body);
    if (match === null) return null;
    return unquote((match[1] ?? '').trim());
  };
  const ids = (id: string, name: string): string[] => {
    const body = objects.get(id)?.body;
    if (body === undefined) return [];
    const match = new RegExp(`${name} = \\(([^)]*)\\)`).exec(body);
    if (match === null) return [];
    return (match[1] ?? '').match(/[0-9A-Fa-f]{24}/g) ?? [];
  };

  // The group tree, inverted: which container holds each object.
  const parent = new Map<string, string>();
  for (const [id, object] of objects) {
    if (
      object.isa !== 'PBXGroup' &&
      object.isa !== 'PBXVariantGroup' &&
      object.isa !== 'PBXFileSystemSynchronizedRootGroup'
    ) {
      continue;
    }
    for (const child of ids(id, 'children')) parent.set(child, id);
  }

  /** A reference's repository relative path, or null when unknowable. */
  const resolvePath = (id: string): string | null => {
    const object = objects.get(id);
    if (object === undefined) return null;
    const sourceTree = field(id, 'sourceTree') ?? '<group>';
    const own = field(id, 'path');
    if (sourceTree === 'SOURCE_ROOT') {
      return own === null ? null : joinWithin(projectDir, own);
    }
    if (sourceTree !== '<group>') return null;
    const holder = parent.get(id);
    const base = holder === undefined ? projectDir : resolvePath(holder);
    if (base === null) return null;
    return own === null ? base : joinWithin(base, own);
  };

  const remotePackages: string[] = [];
  for (const [id, object] of objects) {
    if (object.isa !== 'XCRemoteSwiftPackageReference') continue;
    const url = field(id, 'repositoryURL');
    if (url === null) continue;
    const tail = url.replace(/\/+$/, '').split('/').pop() ?? '';
    const name = tail.endsWith('.git') ? tail.slice(0, -4) : tail;
    if (name.length > 0) remotePackages.push(name);
  }

  const targets: PbxTarget[] = [];
  for (const [id, object] of objects) {
    if (object.isa !== 'PBXNativeTarget') continue;
    const name = field(id, 'name') ?? field(id, 'productName');
    if (name === null) continue;
    const files: string[] = [];
    for (const phaseId of ids(id, 'buildPhases')) {
      if (objects.get(phaseId)?.isa !== 'PBXSourcesBuildPhase') continue;
      for (const buildFileId of ids(phaseId, 'files')) {
        const refId = field(buildFileId, 'fileRef');
        if (refId === null) continue;
        const path = resolvePath(refId);
        if (path !== null && path !== '') files.push(path);
      }
    }
    const syncDirs: string[] = [];
    for (const groupId of ids(id, 'fileSystemSynchronizedGroups')) {
      const path = resolvePath(groupId);
      if (path !== null && path !== '') syncDirs.push(path);
    }
    const products: string[] = [];
    for (const depId of ids(id, 'packageProductDependencies')) {
      const product = field(depId, 'productName');
      if (product !== null && product.length > 0) products.push(product);
    }
    targets.push({ name, files: files.sort(), syncDirs, products });
  }
  targets.sort((a, b) => a.name.localeCompare(b.name));
  return { targets, remotePackages: remotePackages.sort() };
}

/**
 * Every entry of the `objects` dictionary, by id, with the block comment asides
 * stripped from the body so an id inside one can never be read as a value.
 */
function parseObjects(text: string): Map<string, PbxObject> {
  const out = new Map<string, PbxObject>();
  const at = text.indexOf('objects = {');
  if (at === -1) return out;
  const entry = /([0-9A-Fa-f]{24})\s*(?:\/\*[^*]*(?:\*(?!\/)[^*]*)*\*\/\s*)?=\s*\{/g;
  entry.lastIndex = at;
  let match: RegExpExecArray | null;
  while ((match = entry.exec(text)) !== null) {
    const open = entry.lastIndex - 1;
    const close = matchBrace(text, open);
    if (close === -1) break;
    const body = text
      .slice(open + 1, close)
      .replace(/\/\*[^*]*(?:\*(?!\/)[^*]*)*\*\//g, ' ');
    const isa = /isa = ([A-Za-z0-9_]+);/.exec(body)?.[1] ?? '';
    out.set(match[1] ?? '', { isa, body });
    entry.lastIndex = close + 1;
  }
  return out;
}

/** The index of the brace that closes the one at `open`, or -1. */
function matchBrace(text: string, open: number): number {
  let depth = 0;
  let quoted = false;
  for (let i = open; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '\\') i += 1;
      else if (ch === '"') quoted = false;
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/** An old style plist value, unquoted when it was quoted. */
function unquote(value: string): string {
  if (value.startsWith('"') && value.endsWith('"') && value.length >= 2) {
    return value.slice(1, -1).replace(/\\(.)/g, '$1');
  }
  return value;
}
