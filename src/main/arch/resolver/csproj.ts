/**
 * What the repository's C sharp projects declare, and which namespace each
 * one owns, for the C sharp arm (Phase 184).
 *
 * WHY THIS READER OPENS SOURCE FILES WHEN NO OTHER ONE DOES. Every other
 * language in this resolver can be answered from manifests plus a path: Java's
 * package mirrors its directory, PHP's autoload map names the directory
 * outright. C sharp can do neither, and the measurement is not close. A file's
 * namespace matches the directory it sits in for 58 percent of serilog, 44
 * percent of Nancy and **0.3 percent of SignalR**, being 2 files of 656. An
 * arm built on that convention would resolve almost nothing in SignalR and
 * would be WRONG about the rest. What a namespace does match is a PROJECT: 44
 * of serilog's 44 namespaces, 149 of Nancy's 153 and 86 of SignalR's 97 live
 * inside exactly one `.csproj`. So the fact this reader needs is which
 * namespace each file declares, and the only place that is written down is the
 * file.
 *
 * IT IS A REGULAR EXPRESSION AND NEVER A PARSE. The namespace declaration is a
 * keyword at statement position, both the block form and C sharp 10's file
 * scoped form, and reading it with the grammar would mean a second full parse
 * of every `.cs` file in the repository for one line of it.
 *
 * WHAT IT READS FROM A `.csproj`, all of it as text and all of it a literal:
 *  - whether it is SDK style, being `<Project Sdk="...">`, which compiles
 *    every `.cs` under its own directory by an implicit glob;
 *  - `<Compile Include="...">` entries when it is the older style, which is an
 *    EXPLICIT membership table, the same shape Phase 180 reads out of a
 *    pbxproj. Nancy keeps 20 such projects with 121 entries;
 *  - `<PackageReference Include>` and `<Reference Include>`, the declared
 *    dependencies, which are the arm's only justification for `external`.
 * `<ProjectReference>` is deliberately not read: a project reference points at
 * another project in this repository, and the namespace map below already
 * answers those as first party.
 *
 * NOTHING HERE SPAWNS ANYTHING. No dotnet, no msbuild, no nuget. Values read
 * here are compared against import specifiers and reach no argv.
 */

import { readTextOrNull } from './paths';

/** What the projects and their sources said, reduced to what the arm compares. */
export interface CsharpManifest {
  /**
   * Every namespace some tracked `.cs` file declares, keyed to the DIRECTORIES
   * of the projects those files belong to. More than one directory means the
   * namespace spans several assemblies, and the arm answers `unresolved`
   * rather than picking one.
   */
  namespaceDirs: Map<string, string[]>;
  /**
   * Every DOTTED PREFIX of every declared namespace, keyed the same way.
   *
   * A namespace declaration creates its parents implicitly: a file declaring
   * `Nancy.Tests.Unit` makes `using Nancy.Tests;` legal even though no file
   * declares that name outright. This map is what answers those, and it is
   * asked only after every exact match has failed, so it can never override
   * one. Where a parent spans several projects, which the common heads always
   * do, it holds several directories and the arm goes grey exactly as it does
   * for a declared namespace that spans.
   */
  namespacePrefixDirs: Map<string, string[]>;
  /** The first namespace each tracked `.cs` file declares, for the enclosing walk. */
  namespaceOf: Map<string, string>;
  /** Declared package and assembly reference names, LOWER CASED. */
  packages: Set<string>;
  /** True when any `.csproj` was found at all. The arm says so on its face. */
  present: boolean;
}

export function emptyCsharpManifest(): CsharpManifest {
  return {
    namespaceDirs: new Map(),
    namespacePrefixDirs: new Map(),
    namespaceOf: new Map(),
    packages: new Set(),
    present: false
  };
}

/** How many `.csproj` files are read. */
const MAX_PROJECTS = 512;

/** How many `.cs` files are opened for their namespace. */
const MAX_SOURCES = 20_000;

/** `namespace A.B.C {` and C sharp 10's `namespace A.B.C;`, at statement position. */
const NAMESPACE_LINE = /^[ \t]*namespace[ \t]+([A-Za-z_][A-Za-z0-9_.]*)/gm;

/** `<Project ... Sdk="...">`, which is what makes the compile list implicit. */
const SDK_PROJECT = /<Project\b[^>]*\bSdk\s*=/i;

/** `<Compile Include="Foo.cs" />`, the older style's explicit membership. */
const COMPILE_INCLUDE = /<Compile\b[^>]*\bInclude\s*=\s*"([^"]+)"/gi;

/** A declared package or assembly reference. */
const REFERENCE = /<(?:PackageReference|Reference)\b[^>]*\bInclude\s*=\s*"([^"]+)"/gi;

/**
 * A UTF-8 byte order mark, which Visual Studio writes at the head of both
 * `.csproj` and `.cs` files.
 *
 * IT COST 563 OF NANCY'S 959 FILES THEIR NAMESPACE before it was stripped. The
 * namespace pattern is anchored to the start of a line, and a file whose very
 * first line is `\ufeffnamespace Nancy.Demo.Async` does not match it, so more
 * than half the repository read as though it declared nothing at all.
 */
const BOM = '\ufeff';

/** Directories that hold build output rather than source. */
const OUTPUT_DIRS: ReadonlySet<string> = new Set(['bin', 'obj']);

/** One project, as the assignment below needs it. */
interface Project {
  /** Repository relative directory holding the `.csproj`. `''` at the root. */
  dir: string;
  /** True when the SDK glob owns every `.cs` under `dir`. */
  glob: boolean;
  /** Repository relative paths the project lists explicitly. */
  explicit: Set<string>;
}

/**
 * Read the projects and the namespaces out of one repository.
 *
 * The tracked file list is handed in rather than walked for, because the
 * caller already has it from its one `git ls-files -z` and because a walk
 * would find the `.cs` files under `bin` and `obj` that git does not track.
 */
export function readCsharpManifest(
  repoPath: string,
  trackedFiles: readonly string[]
): CsharpManifest {
  const out = emptyCsharpManifest();
  const projects: Project[] = [];
  const sources: string[] = [];
  for (const raw of trackedFiles) {
    const path = raw.split('\\').join('/');
    if (path.endsWith('.csproj')) {
      if (projects.length >= MAX_PROJECTS) continue;
      const project = readProject(repoPath, path, out.packages);
      if (project !== null) projects.push(project);
      continue;
    }
    if (!path.endsWith('.cs')) continue;
    if (path.split('/').some((segment) => OUTPUT_DIRS.has(segment))) continue;
    if (sources.length < MAX_SOURCES) sources.push(path);
  }
  if (projects.length === 0) return out;
  out.present = true;
  // Longest directory first, so a nested project beats the one that contains
  // it, which is the same rule the Swift arm's prefix table uses.
  const byDepth = [...projects].sort((a, b) => b.dir.length - a.dir.length);

  for (const path of sources) {
    const owner = ownerOf(path, projects, byDepth);
    if (owner === null) continue;
    const raw = readTextOrNull(`${repoPath}/${path}`);
    if (raw === null) continue;
    const text = raw.startsWith(BOM) ? raw.slice(BOM.length) : raw;
    let first = true;
    for (const match of text.matchAll(NAMESPACE_LINE)) {
      const name = match[1] ?? '';
      if (name.length === 0) continue;
      if (first) {
        out.namespaceOf.set(path, name);
        first = false;
      }
      add(out.namespaceDirs, name, owner.dir);
      const parts = name.split('.');
      for (let take = parts.length - 1; take > 0; take -= 1) {
        add(out.namespacePrefixDirs, parts.slice(0, take).join('.'), owner.dir);
      }
    }
  }
  return out;
}

/** One directory into a name's list, kept unique so ambiguity is checkable. */
function add(map: Map<string, string[]>, name: string, dir: string): void {
  const held = map.get(name);
  if (held === undefined) map.set(name, [dir]);
  else if (!held.includes(dir)) held.push(dir);
}

/** Which project owns one source file: the explicit table first, then the glob. */
function ownerOf(
  path: string,
  projects: readonly Project[],
  byDepth: readonly Project[]
): Project | null {
  for (const project of projects) {
    if (project.explicit.has(path)) return project;
  }
  for (const project of byDepth) {
    if (!project.glob) continue;
    if (project.dir === '' || path.startsWith(`${project.dir}/`)) return project;
  }
  return null;
}

/** One `.csproj` as text. */
function readProject(
  repoPath: string,
  path: string,
  packages: Set<string>
): Project | null {
  const raw = readTextOrNull(`${repoPath}/${path}`);
  if (raw === null) return null;
  const text = raw.startsWith(BOM) ? raw.slice(BOM.length) : raw;
  const dir = path.slice(0, Math.max(0, path.lastIndexOf('/')));
  const explicit = new Set<string>();
  for (const match of text.matchAll(COMPILE_INCLUDE)) {
    const listed = (match[1] ?? '').split('\\').join('/');
    // A wildcard in an explicit list is the glob again, and this reader takes
    // literals; the SDK flag below is what covers the glob case.
    if (listed.includes('*') || listed.length === 0) continue;
    const joined = dir === '' ? listed : `${dir}/${listed}`;
    const parts: string[] = [];
    for (const segment of joined.split('/')) {
      if (segment === '' || segment === '.') continue;
      if (segment === '..') {
        parts.pop();
        continue;
      }
      parts.push(segment);
    }
    explicit.add(parts.join('/'));
  }
  for (const match of text.matchAll(REFERENCE)) {
    // `<Reference Include="System.Xml, Version=4.0.0.0, ..." />` carries the
    // assembly's whole strong name; the id is the part before the comma.
    const name = (match[1] ?? '').split(',')[0]?.trim().toLowerCase() ?? '';
    if (name.length > 0) packages.add(name);
  }
  // An SDK style project globs. An older one that listed nothing globs too,
  // because a project with no membership table at all would own no file and
  // every namespace under it would go unanswered.
  const glob = SDK_PROJECT.test(text) || explicit.size === 0;
  return { dir, glob, explicit };
}
