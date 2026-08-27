/**
 * `Cargo.toml`, read as text, for the Rust arm (Phase 157).
 *
 * WHY IT IS HAND PARSED. Tortie ships no TOML parser and Phase 157 adds no npm
 * package, which is the reason the phase is affordable at all. So this reads
 * the file line by line the way `readGoModule` in ./manifest.ts reads `go.mod`,
 * and it reads only the four things the Rust arm actually needs:
 *
 *  1. `[package] name`, because a crate may import itself by its own name.
 *  2. `[workspace] members`, because each member is a crate of its own with its
 *     own root file, and an import of a sibling member is FIRST PARTY.
 *  3. Every dependency name in `[dependencies]`, `[dev-dependencies]`,
 *     `[build-dependencies]`, `[workspace.dependencies]` and any
 *     `[target.'cfg(...)'.dependencies]` table. This is the ONLY thing that
 *     lets the arm answer `external`, and that rule is the whole point: an arm
 *     that answered `external` because it ran out of ideas would put a FALSE
 *     GREEN on a `must-not` promise.
 *  4. Every dependency declared with a `path`, including the ones in a
 *     `[patch.*]` table, because that crate's SOURCE IS IN THIS REPOSITORY and
 *     an import of it is a real crossing rather than a dependency.
 *
 * NAMES ARE STORED THE WAY AN IMPORT WRITES THEM. Cargo's `portable-pty` is
 * `portable_pty` in a `use` line, so every name here has its hyphens turned
 * into underscores before it is stored. The raw form is never compared.
 *
 * NOTHING HERE SPAWNS ANYTHING and no value read from a manifest ever reaches
 * an argv. These strings are compared against a file list and against a
 * specifier, and that is all they are ever used for.
 *
 * WHAT IT DELIBERATELY DOES NOT DO. It is not a TOML parser and must never grow
 * into one. It does not evaluate `cfg` expressions, it does not follow
 * `workspace = true` inheritance to find a version, it does not read
 * `Cargo.lock`, and it does not understand a dotted key such as
 * `dependencies.serde.version = "1"` written at the top level. A manifest shape
 * it cannot read costs those names their `external` answer, and the arm then
 * says `unresolved`, which is grey rather than green and is the safe side to be
 * wrong on.
 */

import { join } from 'node:path';
import { expandDirGlob, normalizeRel, readTextOrNull } from './paths';
import {
  balanced,
  indexOfTopLevel,
  splitKeyPath,
  stripTomlComment,
  unquote
} from './toml';

/** One crate this repository itself contains. */
export interface CargoCrate {
  /** The name an import writes, hyphens already underscores. */
  name: string;
  /** Repository relative directory of the crate, `''` for the root crate. */
  dir: string;
}

/** Everything the Rust arm learned from one repository's Cargo manifests. */
export interface CargoManifest {
  /** Every crate in this repository, keyed by the name an import writes. */
  crates: Map<string, CargoCrate>;
  /**
   * Every dependency name any manifest in this repository declares, hyphens
   * already underscores.
   *
   * It is what lets a bare head be answered `external` BECAUSE THE REPOSITORY
   * SAID SO. A bare head in none of these is `unresolved`.
   */
  dependencies: Set<string>;
  /**
   * Dependency name to the repository relative directory its source lives in,
   * for every dependency declared with a `path` and every `[patch.*]` entry
   * that names one.
   *
   * herdr is why this exists. It reaches `portable-pty` through
   * `[patch.crates-io] portable-pty = { path = "vendor/portable-pty" }`, the
   * source is tracked at `vendor/portable-pty/src/`, and eighteen `use
   * portable_pty::` lines would otherwise be answered `external` while the code
   * they name sits in the repository.
   */
  pathDependencies: Map<string, string>;
}

/** How many workspace members this reader will open. */
const MAX_MEMBERS = 256;

/** The tables whose keys are dependency names. */
const DEPENDENCY_TABLES = new Set([
  'dependencies',
  'dev-dependencies',
  'build-dependencies'
]);

/**
 * Read a repository's Cargo manifests, or null when it has none.
 *
 * The root manifest is read first, then each `[workspace] members` entry, so a
 * workspace's crate names and its members' own dependencies are all in one
 * answer. Every failure is absorbed: an unreadable member costs that member its
 * first party classification and nothing else.
 */
export function readCargoManifest(repoPath: string): CargoManifest | null {
  const rootText = readTextOrNull(join(repoPath, 'Cargo.toml'));
  if (rootText === null) return null;
  const out: CargoManifest = {
    crates: new Map(),
    dependencies: new Set(),
    pathDependencies: new Map()
  };
  const root = parseCargoText(rootText);
  absorb(out, root, '');

  let count = 0;
  for (const glob of root.members) {
    if (count >= MAX_MEMBERS) break;
    for (const dir of expandDirGlob(repoPath, glob)) {
      if (count >= MAX_MEMBERS) break;
      count += 1;
      const text = readTextOrNull(join(repoPath, dir, 'Cargo.toml'));
      if (text === null) continue;
      absorb(out, parseCargoText(text), dir);
    }
  }
  return out;
}

/** Fold one parsed manifest, living at `dir`, into the answer. */
function absorb(out: CargoManifest, parsed: ParsedCargo, dir: string): void {
  if (parsed.packageName !== null) {
    const name = crateName(parsed.packageName);
    if (name !== null) out.crates.set(name, { name, dir });
  }
  for (const raw of parsed.dependencies) {
    const name = crateName(raw);
    if (name !== null) out.dependencies.add(name);
  }
  for (const [raw, path] of parsed.pathDependencies) {
    const name = crateName(raw);
    if (name === null) continue;
    const target = normalizeRel(dir === '' ? path : `${dir}/${path}`);
    if (target === '') continue;
    if (!out.pathDependencies.has(name)) out.pathDependencies.set(name, target);
  }
}

/**
 * A crate name as an import writes it, or null when the string cannot be one.
 *
 * The check is deliberately strict rather than forgiving. A manifest key
 * holding anything other than the characters a Rust identifier is made of is
 * dropped whole, so nothing shaped like a path, a flag or a command can ever
 * enter the dependency set and be compared against a specifier.
 */
function crateName(raw: string): string | null {
  const name = raw.trim().split('-').join('_');
  if (name.length === 0 || name.length > 128) return null;
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) return null;
  return name;
}

// ---------------------------------------------------------------------------
// The narrow reader
// ---------------------------------------------------------------------------

interface ParsedCargo {
  packageName: string | null;
  members: string[];
  dependencies: Set<string>;
  pathDependencies: Map<string, string>;
}

/**
 * One manifest's text to the four things the arm needs.
 *
 * The loop joins a key to its value first, because a value may run over several
 * lines: an array of members and an inline dependency table both do, and herdr
 * writes both. A key whose value never balances is dropped rather than guessed
 * at.
 */
export function parseCargoText(text: string): ParsedCargo {
  const out: ParsedCargo = {
    packageName: null,
    members: [],
    dependencies: new Set(),
    pathDependencies: new Map()
  };
  const lines = text.split('\n');
  let table = '';
  for (let i = 0; i < lines.length; i += 1) {
    const line = stripTomlComment(lines[i] ?? '').trim();
    if (line.length === 0) continue;

    if (line.startsWith('[')) {
      const close = line.lastIndexOf(']');
      if (close <= 0) continue;
      const inner = line.slice(1, close).replace(/^\[/, '').replace(/\]$/, '');
      table = inner.trim();
      continue;
    }

    const eq = indexOfTopLevel(line, '=');
    if (eq === -1) continue;
    const key = unquote(line.slice(0, eq).trim());
    let value = line.slice(eq + 1).trim();
    // A value that has not closed its brackets continues on the next lines.
    let guard = 0;
    while (!balanced(value) && i + 1 < lines.length && guard < 512) {
      i += 1;
      guard += 1;
      value = `${value}\n${stripTomlComment(lines[i] ?? '').trim()}`;
    }
    if (!balanced(value)) continue;

    take(out, table, key, value);
  }
  return out;
}

/** Record one key from one table, when it is one of the four things needed. */
function take(out: ParsedCargo, table: string, key: string, value: string): void {
  const segments = splitKeyPath(table);
  const last = segments[segments.length - 1] ?? '';

  if (table === 'package' && key === 'name') {
    const name = readString(value);
    if (name !== null) out.packageName = name;
    return;
  }
  if (table === 'workspace' && key === 'members') {
    for (const member of readStringArray(value)) out.members.push(member);
    return;
  }
  const isDependencyTable =
    DEPENDENCY_TABLES.has(last) &&
    (segments.length === 1 ||
      segments[0] === 'target' ||
      segments[0] === 'workspace');
  const isPatchTable = segments[0] === 'patch' && segments.length >= 1;
  if (!isDependencyTable && !isPatchTable) return;

  // A patch entry is not a dependency. It REDIRECTS one, and the crate it
  // redirects to may be named nowhere else, so its name is not added to the
  // dependency set from here.
  if (isDependencyTable) out.dependencies.add(key);
  const path = readInlinePath(value);
  if (path !== null) out.pathDependencies.set(key, path);
}

/** The `path` of an inline table value, or null when there is none. */
function readInlinePath(value: string): string | null {
  if (!value.trimStart().startsWith('{')) return null;
  const match = /(^|[{,\s])path\s*=\s*("([^"]*)"|'([^']*)')/.exec(value);
  if (match === null) return null;
  const raw = match[3] ?? match[4] ?? '';
  return raw.length === 0 ? null : raw;
}

function readString(value: string): string | null {
  const match = /^("([^"]*)"|'([^']*)')/.exec(value.trim());
  if (match === null) return null;
  return match[2] ?? match[3] ?? null;
}

function readStringArray(value: string): string[] {
  const out: string[] = [];
  const trimmed = value.trim();
  if (!trimmed.startsWith('[')) return out;
  const pattern = /"([^"]*)"|'([^']*)'/g;
  let match = pattern.exec(trimmed);
  while (match !== null) {
    const item = match[1] ?? match[2] ?? '';
    if (item.length > 0) out.push(item);
    match = pattern.exec(trimmed);
  }
  return out;
}
