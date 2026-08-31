/**
 * The package manifests a repository keeps, read once per scan (Phase 63).
 *
 * WHY THIS EXISTS AND WHY IT IS NOT OPTIONAL. Research 49's correctness attack
 * on the Static First design measured 534 aliased imports in this tree that a
 * naive relative-path rule drops on the floor. That count is stale, and the
 * spec agent remeasured 921 at `aa1d801` by its own stated rule. Either number
 * says the same thing: a resolver that only understands `./x` would report most
 * of this repository's imports as unresolved, and under the conservative
 * verdict rule every one of those becomes `unverifiable`. The map would then be
 * honest and useless at the same time.
 *
 * WHAT IT READS. `tsconfig*.json` at the repository root for `baseUrl` and
 * `paths`, `package.json` for the package's own name, its declared dependency
 * names and its workspaces, each workspace's own `package.json` for the same
 * two, and `go.mod` for the module directive. Every one of those is read as
 * text and parsed in process. Nothing here spawns anything, and no value read
 * from any of these files ever reaches an argv.
 *
 * WHY THE DEPENDENCY NAMES ARE READ AT ALL. Without them a bare specifier the
 * resolver does not recognise has to be guessed at, and the first build guessed
 * `external`, which is a DEFINITE answer. So an import through an alias this
 * build cannot see, from a nested tsconfig or a bundler config, was reported as
 * a dependency, and a `must-not` promise across that import stayed green. A
 * false green on a `must-not` is the single most damaging thing this feature
 * can print, so the answer is now `unresolved` unless the repository itself
 * declared the package. It reads only the root and the workspaces, so a
 * transitive dependency nobody declared reads as unresolved, which is grey
 * rather than green and is the safe side to be wrong on.
 *
 * WHAT PHASE 157 ADDED, AND WHY THE PARAGRAPH THAT USED TO BE HERE IS GONE.
 * Until Phase 157 this header said it deliberately did NOT read `Cargo.toml`
 * or Python's own packaging files, because Rust and Python resolution shipped
 * later rather than shipping wrong. Both arms shipped, and Ruby's with them, so
 * that sentence is now false and is deleted rather than left to mislead. This
 * file reads `Cargo.toml` through ./cargo.ts, `pyproject.toml`, `setup.cfg` and
 * `setup.py` through ./pyproject.ts, and the root `Gemfile` and gemspecs
 * through ./gemfile.ts. Each language's reader lives BESIDE ITS ARM and this
 * file only joins them onto the one shape the resolver context carries, so
 * adding a language adds a reader and one line here rather than growing this
 * module.
 *
 * `setup.py` is READ AS TEXT AND NEVER EVALUATED, and a test proves it by
 * writing a sentinel file from the top of a fixture `setup.py` and asserting
 * the sentinel is not there afterwards.
 *
 * WHAT PHASE 178 ADDED. Every `package.json` in the tree, bounded and skipping
 * `node_modules`, not only the root one and its declared workspaces. The
 * monorepo that forced it is measured: rookery keeps its real dependency list
 * in `server/package.json`, the root manifest declares neither workspaces nor
 * dependencies, and the strip showed 47 unresolved imports where the tree's
 * own manifests leave 6. A bare specifier is external-justified by the NEAREST
 * enclosing manifest that declares it, walking from the importing file's own
 * directory up to the root, which is the direction Node itself resolves in.
 * Unresolved-never-external survives whole: only a declared dependency becomes
 * external, and a module no enclosing manifest declares stays unresolved.
 *
 * WHAT IT STILL DELIBERATELY DOES NOT READ. A NESTED manifest of any OTHER
 * kind. A `go.mod`, a `Cargo.toml`, a `pyproject.toml` or a `Gemfile` in a
 * subdirectory is not read, so an import that only one of those could explain
 * answers `unresolved` rather than `external`. That is the grey side of the
 * trade and it is the safe one.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { readJsonFile } from './jsonc';
import { expandDirGlob, normalizeRel } from './paths';
// Phase 157. Each language arm's own manifest reader lives beside the arm, and
// this file joins them onto the one shape the resolver context carries. That is
// why the three imports below point outward rather than this file growing three
// more readers.
import { readCargoManifest, type CargoManifest } from './cargo';
import { readRubyManifest, type RubyManifest } from './gemfile';
import { readKotlinManifest, type KotlinManifest } from './gradle';
import { readObjcManifest, type ObjcManifest } from './podfile';
import { emptySwiftManifest, type SwiftManifest } from './swiftpm';
import { readPythonProject, type PythonProject } from './pyproject';

/** One `paths` rule from a tsconfig, already split at its single star. */
export interface AliasRule {
  /** Text before the star, e.g. `@shared/`. An exact rule has an empty suffix and no star. */
  prefix: string;
  /** Text after the star, usually empty. */
  suffix: string;
  /** Whether the rule had a star at all. An exact rule matches the whole specifier. */
  wildcard: boolean;
  /** Repository relative target prefixes, in the order the tsconfig listed them. */
  targets: { prefix: string; suffix: string }[];
}

/** One workspace package: the name it publishes under and where it lives. */
export interface WorkspacePackage {
  name: string;
  /** Repository relative directory, no trailing slash. */
  dir: string;
  /** Every package name this workspace's own manifest declares a dependency on. */
  dependencies: Set<string>;
  /**
   * Repository relative paths the package's own manifest offers as its entry,
   * in the order they should be tried.
   *
   * A bare import of a workspace package by name names the package's ENTRY, not
   * its directory, and in a TypeScript monorepo the manifest usually points at
   * built output that is not tracked. So the source conventions are tried too,
   * and a package whose entry cannot be found answers unresolved rather than
   * external, because the package is real and the file behind it is not.
   */
  entries: string[];
}

/** Everything the resolver learned about one repository's own shape. */
export interface ArchManifests {
  /** The `name` field of the root package.json, or null. */
  packageName: string | null;
  /**
   * Every package name the repository DECLARES a dependency on, from the root
   * manifest and from each workspace manifest, scope included.
   *
   * It is what lets a bare specifier be answered `external` because the
   * repository said so, rather than because the resolver ran out of ideas. A
   * bare specifier that is in none of these is `unresolved`, which is a grey
   * verdict rather than a green one, and that is the whole point: an alias this
   * build does not know about, from a nested tsconfig or a bundler config, used
   * to be reported as a dependency, and a first party import wearing that
   * answer is a FALSE GREEN on a `must-not` promise.
   */
  dependencies: Set<string>;
  /**
   * The declared dependency names of EVERY `package.json` in the tree, keyed
   * by the repository relative directory that holds it, `''` for the root
   * (Phase 178). The script arm answers `external` for a bare specifier only
   * when an ENCLOSING manifest declares it, nearest first, so a nested
   * package's imports are justified by that package's own manifest and a
   * sibling package's declarations justify nothing outside their subtree.
   * Bounded by {@link MAX_NESTED_MANIFESTS} and the walk skips `node_modules`
   * and `.git`; a manifest past the bound is simply not read, which errs grey.
   */
  manifestDirs: Map<string, Set<string>>;
  /** Every `paths` rule found, longest prefix first so the match is deterministic. */
  aliases: AliasRule[];
  /** Workspace packages by the name they publish under. */
  workspaces: Map<string, WorkspacePackage>;
  /** The `module` directive of a root go.mod, or null. */
  goModule: string | null;
  /** True when a Cargo.toml exists, which is why rust imports say so on their face. */
  hasCargo: boolean;
  /** True when a Python project file exists, for the same reason. */
  hasPython: boolean;
  /**
   * What the repository's own Python packaging files said about themselves
   * (Phase 157): its package roots and the distributions it declares.
   *
   * The declared names are the ONLY thing that lets the Python arm answer
   * `external`, for the same reason `dependencies` above is for the script arm.
   * A repository with no packaging file gets the empty project and every bare
   * import it cannot find a file for answers `unresolved`.
   */
  python: PythonProject;
  /**
   * What the repository's own `Cargo.toml` said, or null when it has none
   * (Phase 157): every crate the workspace holds and where its sources live,
   * the dependency names as a `use` line spells them, and any
   * `[patch.crates-io]` or path dependency whose source is TRACKED IN THIS
   * REPOSITORY.
   *
   * That last part is not a detail. herdr reaches `portable-pty` through
   * `[patch.crates-io] portable-pty = { path = "vendor/portable-pty" }`, and
   * eighteen of its imports land in that vendored source. Answering `external`
   * there would hide eighteen real crossings behind a manifest's blessing.
   */
  cargo: CargoManifest | null;
  /**
   * What the root Gemfile and the root gemspecs said (Phase 157).
   *
   * The gem names are the ONLY thing that lets a bare `require` be answered
   * `external` for a name Ruby itself does not ship, and the declared require
   * paths are the only load path roots this build will resolve one through. A
   * repository with no Ruby in it carries the empty answer and every bare
   * require it cannot find a file for answers `unresolved`.
   */
  ruby: RubyManifest;
  /**
   * What the Gradle files literally declare (Phase 180): Maven groups,
   * artifact names, and whether an Android plugin is on. They are what lets
   * the Kotlin arm answer `external` for a name the platform does not ship.
   */
  kotlin: KotlinManifest;
  /**
   * What the Podfile and Cartfile literally declare (Phase 180): pod names,
   * the Objective-C arm's only non platform justification for `external`.
   */
  objc: ObjcManifest;
  /**
   * The Swift targets and declared packages (Phase 180). EMPTY OUT OF THIS
   * READER: Package.swift is parsed as Swift source by the wasm grammar,
   * which is asynchronous, so the caller that scans imports hydrates this
   * with `readSwiftManifest` from ./swiftpm.ts after this returns. A caller
   * that does not hydrate resolves no Swift target, and every Swift import
   * then answers `unresolved`, which is grey and safe rather than wrong.
   */
  swift: SwiftManifest;
}

/** How many workspace directories a glob is allowed to expand to. */
const MAX_WORKSPACES = 256;

/** How many nested `package.json` files the tree walk will read (Phase 178). */
const MAX_NESTED_MANIFESTS = 256;

/** How many directories the nested-manifest walk will enter before it stops. */
const MAX_MANIFEST_SCAN_DIRS = 4096;

/**
 * Read one repository's manifests. Cheap enough to do on every full scan, and
 * every failure is absorbed: a repository with no tsconfig and no go.mod
 * resolves relative imports and calls everything else external, which is the
 * right answer for a plain JavaScript project.
 */
export function readArchManifests(repoPath: string): ArchManifests {
  const pkg = readJsonFile(join(repoPath, 'package.json'));
  const workspaces = readWorkspaces(repoPath, pkg);
  const dependencies = declaredDependencies(pkg);
  for (const workspace of workspaces.values()) {
    for (const name of workspace.dependencies) dependencies.add(name);
  }
  const manifests: ArchManifests = {
    packageName: typeof pkg?.name === 'string' ? pkg.name : null,
    dependencies,
    manifestDirs: readManifestDirs(repoPath, pkg),
    aliases: readAliases(repoPath),
    workspaces,
    goModule: readGoModule(repoPath),
    hasCargo: exists(join(repoPath, 'Cargo.toml')),
    hasPython:
      exists(join(repoPath, 'pyproject.toml')) ||
      exists(join(repoPath, 'requirements.txt')) ||
      exists(join(repoPath, 'setup.py')),
    cargo: readCargoManifest(repoPath),
    python: readPythonProject(repoPath),
    ruby: readRubyManifest(repoPath),
    kotlin: readKotlinManifest(repoPath),
    objc: readObjcManifest(repoPath),
    swift: emptySwiftManifest()
  };
  return manifests;
}

/**
 * Every `package.json` in the tree, keyed by directory (Phase 178).
 *
 * A breadth first walk from the root, skipping `node_modules` and `.git`, so
 * the manifests nearest the root are found before either bound can cut the
 * walk short. Symlinked directories are not followed, because `withFileTypes`
 * reports a symlink as a symlink and the walk only enters real directories,
 * which is what keeps a link pointing above the repository from turning the
 * bound into a tour of the disk.
 */
function readManifestDirs(
  repoPath: string,
  rootPkg: Record<string, unknown> | null
): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  out.set('', declaredDependencies(rootPkg));
  const queue: string[] = [''];
  let visited = 0;
  while (queue.length > 0) {
    const dir = queue.shift();
    if (dir === undefined) break;
    visited += 1;
    if (visited > MAX_MANIFEST_SCAN_DIRS) break;
    let entries;
    try {
      entries = readdirSync(join(repoPath, dir), { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const name = entry.name;
      if (entry.isDirectory()) {
        if (name === 'node_modules' || name === '.git') continue;
        queue.push(dir === '' ? name : `${dir}/${name}`);
        continue;
      }
      if (dir === '' || name !== 'package.json' || !entry.isFile()) continue;
      if (out.size > MAX_NESTED_MANIFESTS) continue;
      const child = readJsonFile(join(repoPath, dir, name));
      if (child === null) continue;
      out.set(dir, declaredDependencies(child));
    }
  }
  return out;
}

/**
 * The dependency names one manifest declares, across all four fields.
 *
 * A name is taken as written, scope included, because that is what a bare
 * specifier's head is compared against. Nothing here is a version, a URL or
 * anything else that could run: these are compared and never spawned.
 */
function declaredDependencies(pkg: Record<string, unknown> | null): Set<string> {
  const out = new Set<string>();
  if (pkg === null) return out;
  for (const field of [
    'dependencies',
    'devDependencies',
    'peerDependencies',
    'optionalDependencies'
  ]) {
    const block = pkg[field];
    if (block === null || typeof block !== 'object' || Array.isArray(block)) continue;
    for (const name of Object.keys(block as Record<string, unknown>)) {
      if (name.length > 0) out.add(name);
    }
  }
  return out;
}

function exists(path: string): boolean {
  try {
    statSync(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Every `paths` rule in every `tsconfig*.json` at the repository root, merged.
 *
 * MERGED RATHER THAN LAYERED, and the reason is measured on this repository.
 * Tortie declares `@shared/*` in four tsconfigs and `@renderer/*` in two, and
 * which one governs a given file depends on which project references it. A
 * resolver that picked one file would resolve `@shared/ipc` in main and lose it
 * in the preload. The merge is safe because a `paths` rule that resolves to a
 * file which does not exist simply does not match, so a rule borrowed from the
 * wrong project costs nothing.
 *
 * `extends` is deliberately not followed. It would mean walking into
 * node_modules for a shared base config, and the rules that matter for a first
 * party import are written in the repository's own files.
 */
function readAliases(repoPath: string): AliasRule[] {
  const rules: AliasRule[] = [];
  let names: string[];
  try {
    names = readdirSync(repoPath).filter(
      (n) => n === 'tsconfig.json' || (n.startsWith('tsconfig.') && n.endsWith('.json'))
    );
  } catch {
    return rules;
  }
  for (const name of names.sort()) {
    const config = readJsonFile(join(repoPath, name));
    const options = config?.compilerOptions;
    if (options === null || typeof options !== 'object') continue;
    const record = options as Record<string, unknown>;
    const baseUrl = typeof record.baseUrl === 'string' ? record.baseUrl : '.';
    const base = normalizeRel(baseUrl === '' ? '.' : baseUrl);
    const paths = record.paths;
    if (paths === null || typeof paths !== 'object') continue;
    for (const [pattern, rawTargets] of Object.entries(
      paths as Record<string, unknown>
    )) {
      if (!Array.isArray(rawTargets)) continue;
      const targets: { prefix: string; suffix: string }[] = [];
      for (const target of rawTargets) {
        if (typeof target !== 'string') continue;
        const star = target.indexOf('*');
        // The prefix is joined as TEXT and normalised later, with the star's
        // value already in it. Normalising it here would strip the trailing
        // separator a wildcard rule needs, turning `src/shared/` plus `ipc`
        // into `src/sharedipc`.
        const joined = (piece: string): string =>
          base === '' ? piece : `${base}/${piece}`;
        if (star === -1) {
          targets.push({ prefix: joined(target), suffix: '' });
        } else {
          targets.push({
            prefix: joined(target.slice(0, star)),
            suffix: target.slice(star + 1)
          });
        }
      }
      if (targets.length === 0) continue;
      const star = pattern.indexOf('*');
      rules.push(
        star === -1
          ? { prefix: pattern, suffix: '', wildcard: false, targets }
          : {
              prefix: pattern.slice(0, star),
              suffix: pattern.slice(star + 1),
              wildcard: true,
              targets
            }
      );
    }
  }
  // Longest prefix first, so `@shared/ipc/*` beats `@shared/*` whatever order
  // the files were read in. Ties keep the order they arrived in.
  rules.sort((a, b) => b.prefix.length - a.prefix.length);
  return dedupeRules(rules);
}

function dedupeRules(rules: AliasRule[]): AliasRule[] {
  const seen = new Set<string>();
  const out: AliasRule[] = [];
  for (const rule of rules) {
    const key = `${rule.prefix}\u0000${rule.suffix}\u0000${rule.wildcard ? '1' : '0'}\u0000${rule.targets
      .map((t) => `${t.prefix}|${t.suffix}`)
      .join(',')}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(rule);
  }
  return out;
}

/**
 * The workspace packages a monorepo declares, by the name each publishes under.
 *
 * A bare specifier naming one of these is FIRST PARTY, which is the
 * classification research 49 section 4.8 fix 4 names explicitly. Without it
 * every cross package import in a monorepo reads as a dependency on something
 * outside the repository, and the map draws a repository with no internal
 * structure at all.
 */
function readWorkspaces(
  repoPath: string,
  pkg: Record<string, unknown> | null
): Map<string, WorkspacePackage> {
  const out = new Map<string, WorkspacePackage>();
  const raw = pkg?.workspaces;
  const globs: string[] = Array.isArray(raw)
    ? raw.filter((g): g is string => typeof g === 'string')
    : Array.isArray((raw as { packages?: unknown } | undefined)?.packages)
      ? ((raw as { packages: unknown[] }).packages.filter(
          (g): g is string => typeof g === 'string'
        ))
      : [];
  for (const glob of globs) {
    if (out.size >= MAX_WORKSPACES) break;
    for (const dir of expandDirGlob(repoPath, glob)) {
      if (out.size >= MAX_WORKSPACES) break;
      const child = readJsonFile(join(repoPath, dir, 'package.json'));
      if (child === null) continue;
      const name = typeof child.name === 'string' ? child.name : null;
      if (name === null) continue;
      out.set(name, {
        name,
        dir,
        dependencies: declaredDependencies(child),
        entries: entryCandidates(dir, child)
      });
    }
  }
  return out;
}

/**
 * Where a workspace package's own entry might be, most specific first.
 *
 * The manifest's own fields come first, because they are what the package says
 * about itself. The two source conventions come after, because a TypeScript
 * package usually points `main` at build output nobody tracks, and resolving to
 * a path that is not in the repository is the same as not resolving at all.
 */
function entryCandidates(
  dir: string,
  pkg: Record<string, unknown>
): string[] {
  const out: string[] = [];
  const push = (value: unknown): void => {
    if (typeof value !== 'string' || value.length === 0) return;
    out.push(normalizeRel(`${dir}/${value}`));
  };
  push(pkg.types);
  push(pkg.module);
  push(pkg.main);
  const exports = pkg.exports;
  if (typeof exports === 'string') push(exports);
  else if (exports !== null && typeof exports === 'object') {
    const dot = (exports as Record<string, unknown>)['.'];
    if (typeof dot === 'string') push(dot);
    else if (dot !== null && typeof dot === 'object') {
      const record = dot as Record<string, unknown>;
      for (const key of ['types', 'import', 'require', 'default']) {
        push(record[key]);
      }
    }
  }
  out.push(normalizeRel(`${dir}/src/index`));
  out.push(normalizeRel(`${dir}/index`));
  return out;
}

/**
 * The `module` directive of a root `go.mod`.
 *
 * Read line by line rather than with a go.mod parser, because the directive is
 * the first non comment line by the format's own rules and nothing else here
 * needs the file. `module github.com/foo/bar` makes every specifier under that
 * prefix a first party import at the matching subdirectory.
 */
function readGoModule(repoPath: string): string | null {
  let text: string;
  try {
    text = readFileSync(join(repoPath, 'go.mod'), 'utf8');
  } catch {
    return null;
  }
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith('//')) continue;
    if (!trimmed.startsWith('module ')) continue;
    const value = trimmed.slice('module '.length).trim();
    if (value.length === 0) return null;
    return value.replace(/^"|"$/g, '');
  }
  return null;
}

/**
 * A repository relative path in one shape, re-exported from ./paths.ts.
 *
 * It LIVES in ./paths.ts because this module reads ./pyproject.ts and
 * ./gemfile.ts, so those two cannot import back out of here without a runtime
 * cycle. It is re-exported because six call sites across the resolver already
 * name this module for it, and one facade is what CLAUDE.md's growth guardrail
 * asks for rather than a second import path to the same function.
 */
export { normalizeRel } from './paths';
