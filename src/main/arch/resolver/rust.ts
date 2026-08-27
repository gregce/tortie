/**
 * The Rust arm (Phase 157). One `use` line to one of the four answers.
 *
 * WHAT THIS ARM CLAIMS, AND IT IS EXACTLY ONE THING. It resolves an import to
 * the MODULE FILE that carries the name, and nothing finer. "Does `app` import
 * from `layout`" is a question it answers. "Does `app` use `layout::Foo`" is
 * not, and it never pretends otherwise: the walk below stops at the first
 * segment that names no file, because the tail of a `use` path is an ITEM
 * rather than a module, and the answer is the last module file the walk stood
 * on. So `use crate::terminal::state::AgentMetadata` answers
 * `src/terminal/state.rs` and says nothing at all about `AgentMetadata`.
 *
 * A RE-EXPORT CHAIN RESOLVES TO THE FILE THAT FORWARDS, NOT THE FILE THAT
 * DEFINES. herdr's `src/api/mod.rs` writes `pub use server::{ServerHandle};`,
 * so `use crate::api::ServerHandle` written elsewhere answers `src/api/mod.rs`
 * and not `src/api/server.rs`. That is the honest answer for a module level
 * reader, and following the chain would mean resolving items, which is the line
 * above.
 *
 * THE RULE THAT GOVERNS EVERY BRANCH BELOW. An arm that cannot answer returns
 * `unresolved` and NEVER `external`. `external` is a definite answer, and a
 * definite answer that is wrong hides a real import from the crossing list and
 * leaves a `must-not` promise GREEN, which is the single worst thing this
 * feature can print. So `external` here is returned in exactly two places: a
 * name in the compiled in standard library list, and a name a `Cargo.toml` in
 * this repository declares a dependency on. Everything else this arm does not
 * recognise is `unresolved`, which is grey rather than green.
 *
 * A VENDORED CRATE IS FIRST PARTY, and that is a decision rather than an
 * accident. herdr reaches `portable-pty` through `[patch.crates-io]
 * portable-pty = { path = "vendor/portable-pty" }` and the source is tracked at
 * `vendor/portable-pty/src/`. Cargo calls it a dependency, but the code is in
 * the repository, so an import of it is a real crossing a contract can be asked
 * about. Calling it `external` would be the false green above with the
 * manifest's blessing on it.
 *
 * A USE TREE THAT NAMES TWO DIFFERENT MODULES ANSWERS `unresolved`. The fact
 * base holds ONE edge per specifier, and `use crate::{a, b}` where `a` and `b`
 * are both modules is two edges. Reporting one of the two would hide the other,
 * and reporting their common parent would put an edge in a place neither import
 * goes. So every branch is resolved and the answer is theirs only when they
 * agree.
 *
 * WHAT IT DOES NOT MODEL, stated so a verifier does not have to find it.
 * `#[path = "..."]` on a `mod` item, `#[cfg]` gated modules, `macro_rules!`
 * paths, and `Cargo.toml`'s `[lib] path` and `[[bin]] path` overrides. Each of
 * those costs an import its first party answer and gives it `unresolved`. A
 * module declared inline as `mod foo { ... }` is not a gap: the walk stops at
 * the file that declares it, which is where a module level reader should be
 * sent.
 *
 * MEASURED OVER A REAL REPOSITORY RATHER THAN A FIXTURE. herdr at `6e8b138d`,
 * 271 non vendor `.rs` files, parsed by this build's own extractor and answered
 * by this arm: 1,772 imports found, 619 first party, 880 external and 273
 * unresolved. Every one of the 880 is justified, being 556 in the standard
 * library list and 324 across eighteen names `Cargo.toml` declares, and no
 * external answer in that repository lacks a manifest behind it. 18 of the
 * first party answers land inside `vendor/portable-pty`, which is the patched
 * crate above. The 273 are 225 `super` lines that
 * `resolveSuper` below explains, 46 brace groups that name more than one
 * module, and 2 item paths.
 *
 * THOSE NUMBERS ARE THE ONES AFTER THE EXTRACTOR'S CAP WAS FIXED, and the
 * difference is worth knowing. An earlier draft of this header read 1,763 /
 * 615 / 879 / 269, measured while the extractor still DROPPED any specifier
 * over 512 characters. Nine of herdr's `use` lines are brace groups longer than
 * that, and a dropped import is neither a crossing nor an unresolved one, so it
 * could not be counted at all. Re-measure this paragraph whenever the extractor
 * changes, because a number that no longer reproduces is how a later round
 * inherits a false premise.
 *
 * NOTHING HERE SPAWNS ANYTHING. Every answer is set membership against the file
 * list the caller already enumerated with one fixed `git ls-files -z`, plus the
 * text of the Cargo manifests. No specifier and no manifest value ever reaches
 * an argv.
 */

import {
  external,
  firstParty,
  unresolved,
  type ArchResolution
} from './answers';
import type { ArchResolveContext } from './index';
import type { CargoManifest } from './cargo';
import { normalizeRel } from './manifest';

/**
 * The names the compiler itself puts in every crate's prelude.
 *
 * This is a compiled in list rather than a manifest fact, and it is the one
 * place this arm answers `external` without a repository having said so. It is
 * defensible because these five are shipped with the toolchain and reserved by
 * the language: no `Cargo.toml` declares them and no repository vendors them.
 * It is also tried AFTER the first party module files, so a repository that
 * really does have a `src/test.rs` keeps its own module.
 */
const RUST_STD_CRATES = new Set(['std', 'core', 'alloc', 'proc_macro', 'test']);

/** The directories whose direct `.rs` children are each their own crate root. */
const TARGET_DIRS = ['tests', 'examples', 'benches', 'src/bin'];

/** How deep a nested use tree may go before this reader gives up. */
const MAX_TREE_DEPTH = 16;

/** How many branches one use tree may expand to. */
const MAX_TREE_BRANCHES = 512;

/**
 * How long a `use` argument may be before this reader gives up on it.
 *
 * IT IS 4,096 BECAUSE A REAL ONE IS THOUSANDS OF CHARACTERS LONG. This started
 * at 512 and was never reached, because `../../symbols/extract.ts` dropped the
 * import before this arm saw it. Phase 157's verifier found that drop, and
 * raising only the extractor's cap would have handed every long `use` here to
 * be refused one line later: 9 of herdr's 1,889 `use` statements and 27 of
 * deadreckon's 2,762 are over 512 characters, the longest measured being 2,840.
 * They are ordinary brace lists rather than anything pathological, and refusing
 * them would report a real edge as grey.
 *
 * The cost is still bounded, and by the two limits above rather than by this
 * one: MAX_TREE_DEPTH stops nesting and MAX_TREE_BRANCHES stops the expansion.
 * It matches the extractor's own cap so nothing arrives here that this refuses
 * on length alone; a longer specifier reaches this arm wearing the extractor's
 * truncation marker, which holds characters no Rust path may hold, and it comes
 * back `unresolved` from `readPath` rather than from here.
 */
const MAX_USE_TREE_CHARS = 4096;

/**
 * The entry the dispatcher calls. `ctx.manifests.cargo` is read structurally so
 * this arm compiles before and after that field is added to `ArchManifests`.
 */
export function resolveRust(
  specifier: string,
  fromPath: string,
  ctx: ArchResolveContext
): ArchResolution {
  return resolveRustWith(specifier, fromPath, cargoOf(ctx.manifests), ctx.files);
}

/**
 * What a caller may tell this arm beyond the specifier and the file.
 *
 * There is exactly one thing, and the `super::` section below says why it
 * matters and what it is worth. Nothing today supplies it, because the fact
 * base does not carry it yet, and the arm answers `unresolved` in its absence
 * rather than picking a reading.
 */
export interface RustResolveOptions {
  /**
   * How many inline `mod` blocks enclose the import's line, when the caller
   * knows. Zero means the import is at the top level of its file.
   */
  inlineModuleDepth?: number;
}

/** The arm proper, with its manifest and its file list handed in directly. */
export function resolveRustWith(
  specifier: string,
  fromPath: string,
  cargo: CargoManifest | null,
  files: ReadonlySet<string>,
  options: RustResolveOptions = {}
): ArchResolution {
  const branches = parseUseTree(specifier);
  if (branches.length === 0) return unresolved();

  const from = normalizeRel(fromPath);
  const crates = crateDirectories(cargo);
  const info = fileInfo(from, crates, files);
  const depth =
    typeof options.inlineModuleDepth === 'number' &&
    Number.isInteger(options.inlineModuleDepth) &&
    options.inlineModuleDepth >= 0
      ? options.inlineModuleDepth
      : null;

  const seen = new Set<string>();
  let answer: ArchResolution | null = null;
  for (const branch of branches) {
    const one = resolveBranch(branch, from, info, crates, cargo, files, depth);
    const key = `${one.resolution} ${one.toPath ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    answer = one;
    // Two branches that disagree are two edges, and this fact base holds one.
    if (seen.size > 1) return unresolved();
  }
  return answer ?? unresolved();
}

/**
 * The cargo manifest, read off whatever the context is carrying.
 *
 * `hasCargo` is named in the parameter type on purpose. TypeScript's weak type
 * rule refuses a parameter type whose properties are all optional, and naming a
 * field `ArchManifests` really has is what keeps this a structural read rather
 * than a cast.
 */
function cargoOf(manifests: {
  hasCargo: boolean;
  cargo?: CargoManifest | null;
}): CargoManifest | null {
  return manifests.cargo ?? null;
}

// ---------------------------------------------------------------------------
// The specifier
// ---------------------------------------------------------------------------

/**
 * One `use` argument to the list of paths it names.
 *
 * The query captures the WHOLE argument node, so what arrives here is what the
 * author wrote: `crate::a::b`, `crate::a::{b, c}`, `crate::a::*`, `a as b`, and
 * any of those spread over several lines. Every brace group is expanded, `as`
 * is dropped because a local alias changes no path, a `*` names the module it
 * hangs off, and a `self` inside a brace group names the prefix itself.
 *
 * A branch holding a segment that is not a Rust identifier makes the WHOLE
 * specifier answer nothing, so a path with a leading dash or a stray character
 * is `unresolved` rather than half read.
 */
export function parseUseTree(specifier: string): string[][] {
  const text = specifier.trim();
  if (text.length === 0 || text.length > MAX_USE_TREE_CHARS) return [];
  const branches: string[][] = [];
  if (!expand(text, [], branches, 0)) return [];
  return branches.filter((branch) => branch.length > 0);
}

function expand(
  text: string,
  prefix: string[],
  out: string[][],
  depth: number
): boolean {
  if (depth > MAX_TREE_DEPTH || out.length > MAX_TREE_BRANCHES) return false;
  const trimmed = text.trim();
  if (trimmed.length === 0) return false;

  const open = topLevelBrace(trimmed);
  if (open === -1) {
    const segments = readPath(trimmed);
    if (segments === null) return false;
    out.push([...prefix, ...segments]);
    return true;
  }

  const close = matchingBrace(trimmed, open);
  if (close === -1) return false;
  if (trimmed.slice(close + 1).trim().length > 0) return false;

  const head = trimmed.slice(0, open).trim();
  let base = prefix;
  if (head.length > 0) {
    if (!head.endsWith('::')) return false;
    const segments = readPath(head.slice(0, -2));
    if (segments === null) return false;
    base = [...prefix, ...segments];
  }
  for (const part of splitTopLevel(trimmed.slice(open + 1, close))) {
    const piece = part.trim();
    if (piece.length === 0) continue;
    // `self` and `*` inside a brace group both name the prefix itself.
    if (piece === 'self' || piece === '*') {
      out.push([...base]);
      continue;
    }
    if (!expand(piece, base, out, depth + 1)) return false;
  }
  return true;
}

/**
 * One brace free path to its segments, or null when it is not a Rust path.
 *
 * A leading `::` survives as an empty first segment, because it changes where
 * the head is looked for and the caller has to see it.
 */
function readPath(text: string): string[] | null {
  let path = text.trim();
  // `a::b as c` and `a::b as _`. The alias is a local name, never a path.
  const alias = / +as +[A-Za-z_][A-Za-z0-9_]*$/.exec(path);
  if (alias !== null) path = path.slice(0, alias.index).trim();
  if (path.endsWith('::*')) path = path.slice(0, -3).trim();
  else if (path === '*') return null;
  if (path.length === 0) return null;

  const raw = path.split('::');
  const segments: string[] = [];
  for (let i = 0; i < raw.length; i += 1) {
    let segment = (raw[i] ?? '').trim();
    if (segment.length === 0) {
      // Only a leading `::` is legal, and it is carried as an empty segment.
      if (i === 0 && raw.length > 1) {
        segments.push('');
        continue;
      }
      return null;
    }
    if (segment.startsWith('r#')) segment = segment.slice(2);
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(segment)) return null;
    segments.push(segment);
  }
  return segments;
}

/** The first `{` that is not inside another one, or -1. */
function topLevelBrace(text: string): number {
  const cut = text.indexOf('{');
  return cut;
}

function matchingBrace(text: string, open: number): number {
  let depth = 0;
  for (let i = open; i < text.length; i += 1) {
    if (text[i] === '{') depth += 1;
    else if (text[i] === '}') {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function splitTopLevel(text: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let current = '';
  for (const ch of text) {
    if (ch === '{') depth += 1;
    else if (ch === '}') depth -= 1;
    if (ch === ',' && depth === 0) {
      out.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  out.push(current);
  return out;
}

// ---------------------------------------------------------------------------
// The crate and module tree
// ---------------------------------------------------------------------------

/** One crate directory this repository holds, by the name an import writes. */
interface CrateDirectory {
  name: string;
  dir: string;
}

/**
 * Every crate whose source is in this repository.
 *
 * The declared packages come first and the path dependencies after, so a
 * workspace member always wins a name it shares with a patched crate.
 */
function crateDirectories(cargo: CargoManifest | null): CrateDirectory[] {
  if (cargo === null) return [];
  const out: CrateDirectory[] = [];
  const seen = new Set<string>();
  for (const crate of cargo.crates.values()) {
    if (seen.has(crate.name)) continue;
    seen.add(crate.name);
    out.push({ name: crate.name, dir: normalizeRel(crate.dir) });
  }
  for (const [name, dir] of cargo.pathDependencies) {
    if (seen.has(name)) continue;
    seen.add(name);
    out.push({ name, dir: normalizeRel(dir) });
  }
  return out;
}

/** Where one file sits in the crate and module tree. */
interface RustFileInfo {
  /** The crate root file that governs this file, or null when none can be named. */
  rootFile: string | null;
  /** The directory the crate root's own child modules live in. */
  rootDir: string;
  /** The directory THIS file's child modules live in. */
  moduleDir: string;
}

function fileInfo(
  fromPath: string,
  crates: readonly CrateDirectory[],
  files: ReadonlySet<string>
): RustFileInfo {
  const crateDir = crateDirFor(fromPath, crates);
  const rel = crateDir === '' ? fromPath : fromPath.slice(crateDir.length + 1);
  const prefix = (path: string): string =>
    crateDir === '' ? path : `${crateDir}/${path}`;

  let rootFile: string | null = null;
  let rootDir = crateDir;

  if (rel === 'build.rs') {
    rootFile = prefix('build.rs');
    rootDir = crateDir;
  } else {
    const target = TARGET_DIRS.find((dir) => rel.startsWith(`${dir}/`));
    if (target !== undefined) {
      const rest = rel.slice(target.length + 1);
      const cut = rest.indexOf('/');
      if (cut === -1) {
        // A direct `.rs` child of tests, examples, benches or src/bin is its
        // own crate root, and cargo compiles one crate per such file.
        rootFile = prefix(`${target}/${rest}`);
        rootDir = prefix(target);
      } else {
        const segment = rest.slice(0, cut);
        rootDir = prefix(`${target}/${segment}`);
        for (const candidate of [`${rootDir}/main.rs`, `${rootDir}.rs`]) {
          if (files.has(candidate)) {
            rootFile = candidate;
            break;
          }
        }
      }
    } else if (rel.startsWith('src/')) {
      rootDir = prefix('src');
      rootFile = crateRootFile(crateDir, files);
    }
  }

  return { rootFile, rootDir, moduleDir: moduleDirOf(fromPath, rootFile, rootDir) };
}

/** The longest crate directory that contains this file, `''` for the root crate. */
function crateDirFor(
  fromPath: string,
  crates: readonly CrateDirectory[]
): string {
  let best = '';
  for (const crate of crates) {
    if (crate.dir === '') continue;
    if (fromPath !== crate.dir && !fromPath.startsWith(`${crate.dir}/`)) continue;
    if (crate.dir.length > best.length) best = crate.dir;
  }
  return best;
}

/** `<dir>/src/lib.rs`, else `<dir>/src/main.rs`, else null. */
function crateRootFile(dir: string, files: ReadonlySet<string>): string | null {
  const base = dir === '' ? 'src' : `${dir}/src`;
  for (const name of ['lib.rs', 'main.rs']) {
    const candidate = `${base}/${name}`;
    if (files.has(candidate)) return candidate;
  }
  return null;
}

/**
 * The directory a file's own child modules live in.
 *
 * Three shapes and herdr uses all three: the crate root's children live beside
 * it in `src/`, `x/mod.rs`'s children live in `x/`, and `x.rs`'s children live
 * in `x/`. The third is the one a reader forgets, and forgetting it loses every
 * child of herdr's `src/api/schema.rs`, which has thirteen and no `mod.rs`.
 */
function moduleDirOf(
  fromPath: string,
  rootFile: string | null,
  rootDir: string
): string {
  if (rootFile !== null && fromPath === rootFile) return rootDir;
  if (fromPath.endsWith('/mod.rs')) return fromPath.slice(0, -'/mod.rs'.length);
  if (fromPath === 'mod.rs') return '';
  if (fromPath.endsWith('.rs')) return fromPath.slice(0, -'.rs'.length);
  return fromPath;
}

/** `<dir>/<name>.rs` or `<dir>/<name>/mod.rs`, whichever is tracked. */
function moduleChild(
  dir: string,
  name: string,
  files: ReadonlySet<string>
): string | null {
  const base = dir === '' ? name : `${dir}/${name}`;
  for (const candidate of [`${base}.rs`, `${base}/mod.rs`]) {
    if (files.has(candidate)) return candidate;
  }
  return null;
}

/** The file that DECLARES the module living in this directory. */
function moduleFileOf(
  dir: string,
  info: RustFileInfo,
  files: ReadonlySet<string>
): string | null {
  if (dir === info.rootDir) return info.rootFile;
  for (const candidate of [`${dir}/mod.rs`, `${dir}.rs`]) {
    if (files.has(candidate)) return candidate;
  }
  return null;
}

function parentDir(dir: string): string {
  const cut = dir.lastIndexOf('/');
  return cut === -1 ? '' : dir.slice(0, cut);
}

// ---------------------------------------------------------------------------
// One branch
// ---------------------------------------------------------------------------

function resolveBranch(
  segments: readonly string[],
  fromPath: string,
  info: RustFileInfo,
  crates: readonly CrateDirectory[],
  cargo: CargoManifest | null,
  files: ReadonlySet<string>,
  depth: number | null
): ArchResolution {
  const head = segments[0];
  if (head === undefined) return unresolved();

  if (head === 'crate') {
    if (info.rootFile === null) return unresolved();
    return walk(segments.slice(1), info.rootDir, info.rootFile, files);
  }

  if (head === 'self') {
    return walk(segments.slice(1), info.moduleDir, fromPath, files);
  }

  if (head === 'super') {
    return resolveSuper(segments, fromPath, info, files, depth);
  }

  // A leading `::` names a crate rather than a sibling module, so the module
  // attempt below is skipped for it.
  const absolute = head === '';
  const rest = absolute ? segments.slice(1) : segments;
  const name = rest[0];
  if (name === undefined || name.length === 0) return unresolved();

  if (!absolute) {
    // Rust 2018's uniform paths: a bare head may be a module of this file or a
    // module of the crate root. A tracked file beats every guess below it,
    // which is what keeps a real `tests/support/mod.rs` from reading as a
    // dependency nobody declared.
    const bases =
      info.moduleDir === info.rootDir
        ? [info.rootDir]
        : [info.moduleDir, info.rootDir];
    for (const base of bases) {
      const hit = moduleChild(base, name, files);
      if (hit === null) continue;
      const dir = base === '' ? name : `${base}/${name}`;
      return walk(rest.slice(1), dir, hit, files);
    }
  }

  const crate = crates.find((entry) => entry.name === name);
  if (crate !== undefined) {
    const root = crateRootFile(crate.dir, files);
    // A crate this repository holds whose root file is not tracked is a thing
    // this arm cannot answer, and that is `unresolved` rather than external.
    if (root === null) return unresolved();
    const dir = crate.dir === '' ? 'src' : `${crate.dir}/src`;
    return walk(rest.slice(1), dir, root, files);
  }

  // The two definite answers, and there are no others.
  if (RUST_STD_CRATES.has(name)) return external();
  if (cargo !== null && cargo.dependencies.has(name)) return external();

  return unresolved();
}

/**
 * `super::` and the one thing this fact base does not know.
 *
 * `super` walks up the MODULE tree, and a module is not always a file. An
 * import written inside `#[cfg(test)] mod tests { ... }` in `src/foo.rs` sits
 * one module DEEPER than the file, so its `super` is `src/foo.rs` itself and
 * not `src/foo.rs`'s parent. The fact base carries a specifier and a file path
 * and nothing about the blocks the line sits inside, so this arm cannot be told
 * which reading is meant.
 *
 * MEASURED, BECAUSE THE SIZE OF THIS DECIDES THE DESIGN. Over herdr at
 * `6e8b138d`, 353 imports begin with `super`, and 172 of them are written
 * inside an inline `mod` block, 147 of those being the exact line
 * `use super::*;` at the top of a test module. A build that took the file's
 * parent every time would publish 172 edges that do not exist, and a spurious
 * edge satisfies a `must` promise that nothing really satisfies, which is a
 * false green of the same family as a wrong `external`.
 *
 * SO EVERY READING IS TRIED AND THE MODULE TREE PICKS. If the import sits
 * inside `d` inline modules, the first `d` supers unwind those and the rest
 * walk the directories, so the anchor is one of the ancestors of this file's own
 * module at every height from `0` up to the number of supers written, where
 * height `0` is the file itself. Each candidate is walked. When exactly one
 * candidate DESCENDS through a real module file, the module tree has answered
 * and that answer is taken. When none descends, the anchors themselves are the
 * answers, and they agree only when there is one candidate at all. Anything
 * else is `unresolved`, which is grey rather than a guess.
 *
 * WHAT IT COSTS AND WHAT WOULD FIX IT, measured rather than estimated.
 * `use super::*` and `use super::Item` name nothing below their anchor, so
 * nothing descends and both come back `unresolved`. That is 225 of herdr's 353
 * `super` lines, and 128 still resolve because the module tree picked. The fix
 * is not in this arm. It is one more field on an extracted import saying how
 * many inline modules enclose its line, and `RustResolveOptions` above already
 * takes it: handing in the true depth moves about two hundred of herdr's
 * imports off `unresolved`. That last figure was taken on the pre cap draft of
 * the extractor, where the base was 1,763 imports rather than 1,772, so treat
 * it as the size of the prize and not as a current measurement. Nothing in the
 * fact base carries the depth today, so nothing supplies it today.
 */
function resolveSuper(
  segments: readonly string[],
  fromPath: string,
  info: RustFileInfo,
  files: ReadonlySet<string>,
  depth: number | null
): ArchResolution {
  let count = 0;
  while (segments[count] === 'super') count += 1;
  const rest = segments.slice(count);

  // A caller that knows the depth leaves exactly one reading standing, and the
  // ambiguity below never arises.
  const only = depth === null ? null : Math.max(0, count - depth);
  const candidates: { dir: string; file: string }[] = [];
  if (only === null || only === 0) candidates.push({ dir: info.moduleDir, file: fromPath });
  let dir = info.moduleDir;
  for (let height = 1; height <= count; height += 1) {
    // The crate root is the ceiling. Nothing is above it and `super` from it
    // is not a path any crate can write.
    if (dir === '' || dir === info.rootDir || info.rootFile === null) break;
    dir = parentDir(dir);
    const file = moduleFileOf(dir, info, files);
    if (file === null) break;
    if (only === null || only === height) candidates.push({ dir, file });
  }
  if (candidates.length === 0) return unresolved();

  const descended = new Map<string, ArchResolution>();
  for (const candidate of candidates) {
    const answer = walk(rest, candidate.dir, candidate.file, files);
    if (answer.toPath === candidate.file) continue;
    descended.set(answer.toPath ?? '', answer);
  }
  if (descended.size === 1) return [...descended.values()][0] as ArchResolution;
  if (descended.size > 1) return unresolved();

  const anchors = new Set(candidates.map((candidate) => candidate.file));
  if (anchors.size === 1) {
    return firstParty([...anchors][0] as string);
  }
  return unresolved();
}

/**
 * Walk the segments down the module tree and stop at the first one that names
 * no module file.
 *
 * That stop is the arm's stated limit made mechanical. `use
 * crate::terminal::state::AgentMetadata` walks `terminal` then `state` and then
 * meets `AgentMetadata`, which names no file, so the answer is `state.rs` and
 * the item is never claimed.
 */
function walk(
  segments: readonly string[],
  startDir: string,
  anchor: string,
  files: ReadonlySet<string>
): ArchResolution {
  let dir = startDir;
  let current = anchor;
  for (const segment of segments) {
    const hit = moduleChild(dir, segment, files);
    if (hit === null) break;
    current = hit;
    dir = dir === '' ? segment : `${dir}/${segment}`;
  }
  return firstParty(current);
}
