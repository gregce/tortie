/**
 * The include directories a C or C++ project LITERALLY declares, for the
 * C family arm (Phase 184).
 *
 * WHY THIS FILE IS THE HARD PART OF THE WHOLE PHASE. Java, PHP and C sharp all
 * write their mapping down in one place a reader can take at face value. C and
 * C++ do not: an `#include` resolves against a search path assembled by
 * CMakeLists, a Makefile or a Bazel BUILD file, all three of which are
 * PROGRAMS. Measured over four repositories on 2026-09-03: of 161 include path
 * arguments, 67 are literals and 94 are a variable, a generator expression or
 * an absolute path. abseil declares SIXTEEN and not one of them is a literal.
 *
 * SO THIS READER TAKES THE LITERALS AND NOTHING ELSE, AND IT NEVER RUNS THE
 * BUILD. A path holding a `$` is refused with two exceptions that are not
 * refusals at all, being `${CMAKE_CURRENT_SOURCE_DIR}` and
 * `${CMAKE_CURRENT_LIST_DIR}`: both name the directory of the file being read,
 * which this reader already knows, so substituting them resolves nothing and
 * decides nothing. That is the same ruling the PHP arm makes about `__DIR__`
 * and refuses about `ABSPATH`. An absolute path is refused because it is not a
 * repository relative path and this build will not pretend to know what it
 * names. An include only a computed path could explain answers `unresolved`,
 * which is the grey side and the safe one.
 *
 * WHAT IT READS, joined onto the DECLARING FILE'S own directory, which is what
 * both CMake and make mean by a relative path here:
 *  - `include_directories(...)` and `target_include_directories(...)` from
 *    every `CMakeLists.txt` and `*.cmake`.
 *  - every `-I` argument in a `Makefile`, `GNUmakefile` or `*.mk`. One line of
 *    redis's `src/Makefile` carries four of them and they resolve 677 of that
 *    repository's includes.
 *  - `includes = [...]` and `strip_include_prefix = "..."` from every `BUILD`
 *    and `BUILD.bazel`. `strip_include_prefix` is an include directory in
 *    everything but name: it says which prefix a header's path loses before it
 *    is written, which is the same thing as saying where the search starts.
 *
 * NOTHING HERE SPAWNS ANYTHING. No cmake, no make, no bazel, no compiler and
 * no compilation database. Values read here are compared against import
 * specifiers and reach no argv.
 */

import { normalizeRel, readTextOrNull } from './paths';
import { walkForFiles } from './tree-walk';

/** What the build files declared, reduced to what the arm searches. */
export interface IncludeDirs {
  /** Repository relative directories, deduplicated, shortest first. */
  dirs: string[];
  /** True when any CMake, make or Bazel file was found at all. */
  present: boolean;
}

export function emptyIncludeDirs(): IncludeDirs {
  return { dirs: [], present: false };
}

/** How many build files the walk will read. */
const MAX_BUILD_FILES = 512;

/** How many distinct include directories are kept. */
const MAX_INCLUDE_DIRS = 256;

/** `include_directories(...)` and `target_include_directories(...)`. */
const CMAKE_CALL = /\b(target_)?include_directories\s*\(([^)]*)\)/gi;

/** A `-I` argument on a make command line, quoted or bare. */
const MAKE_INCLUDE = /-I\s*("[^"]*"|'[^']*'|[^\s"';]+)/g;

/** Bazel's `includes = [ "a", "b" ]`. */
const BAZEL_INCLUDES = /\bincludes\s*=\s*\[([^\]]*)\]/g;

/** Bazel's `strip_include_prefix = "a/b"`. */
const BAZEL_STRIP = /\bstrip_include_prefix\s*=\s*"([^"]*)"/g;

/** The CMake words that are options rather than directories. */
const CMAKE_KEYWORDS: ReadonlySet<string> = new Set([
  'PUBLIC', 'PRIVATE', 'INTERFACE', 'SYSTEM', 'BEFORE', 'AFTER'
]);

/**
 * The two CMake variables that name the declaring file's own directory. They
 * are substituted rather than refused, because substituting them resolves
 * nothing: this reader already knows which file it is reading.
 */
const OWN_DIR_VARS = ['${CMAKE_CURRENT_SOURCE_DIR}', '${CMAKE_CURRENT_LIST_DIR}'];

/** Read the declared include directories out of one repository. */
export function readIncludeDirs(repoPath: string): IncludeDirs {
  const out = emptyIncludeDirs();
  const seen = new Set<string>();
  const files = walkForFiles(repoPath, isBuildFile, MAX_BUILD_FILES);
  for (const relPath of files) {
    const text = readTextOrNull(`${repoPath}/${relPath}`);
    if (text === null) continue;
    out.present = true;
    const dir = relPath.slice(0, Math.max(0, relPath.lastIndexOf('/')));
    const name = relPath.slice(relPath.lastIndexOf('/') + 1);
    const add = (raw: string): void => {
      if (seen.size >= MAX_INCLUDE_DIRS) return;
      const value = literalPath(raw, dir);
      if (value === null || seen.has(value)) return;
      seen.add(value);
      out.dirs.push(value);
    };
    if (name.endsWith('.cmake') || name === 'CMakeLists.txt') {
      readCmake(text, add);
    } else if (name === 'BUILD' || name === 'BUILD.bazel') {
      readBazel(text, add);
    } else {
      for (const match of text.matchAll(MAKE_INCLUDE)) add(match[1] ?? '');
    }
  }
  // Shortest first, so a search that walks them in order asks the widest
  // roots before the narrowest. Ties keep the order they were read in.
  out.dirs.sort((a, b) => a.length - b.length);
  return out;
}

function isBuildFile(name: string): boolean {
  return (
    name === 'CMakeLists.txt' ||
    name.endsWith('.cmake') ||
    name === 'Makefile' ||
    name === 'makefile' ||
    name === 'GNUmakefile' ||
    name.endsWith('.mk') ||
    name === 'BUILD' ||
    name === 'BUILD.bazel'
  );
}

/** Every literal argument of every include_directories call in one file. */
function readCmake(text: string, add: (raw: string) => void): void {
  for (const call of text.matchAll(CMAKE_CALL)) {
    const targetForm = (call[1] ?? '').length > 0;
    const args = splitArgs(call[2] ?? '');
    // `target_include_directories(<target> <scope> dirs...)`: the first token
    // is the target's name and is never a directory.
    for (const [at, arg] of args.entries()) {
      if (targetForm && at === 0) continue;
      if (CMAKE_KEYWORDS.has(arg.toUpperCase())) continue;
      add(arg);
    }
  }
}

/** Bazel's two literal shapes. */
function readBazel(text: string, add: (raw: string) => void): void {
  for (const call of text.matchAll(BAZEL_INCLUDES)) {
    for (const arg of splitArgs((call[1] ?? '').split(',').join(' '))) add(arg);
  }
  for (const call of text.matchAll(BAZEL_STRIP)) add(call[1] ?? '');
}

/** One argument list into tokens, honouring both quote styles. */
function splitArgs(text: string): string[] {
  const out: string[] = [];
  const pattern = /"([^"]*)"|'([^']*)'|(\S+)/g;
  for (const match of text.matchAll(pattern)) {
    const value = match[1] ?? match[2] ?? match[3] ?? '';
    if (value.length > 0) out.push(value);
  }
  return out;
}

/**
 * One declared path as a repository relative directory, or null when it is not
 * decidable from bytes.
 */
function literalPath(raw: string, declaringDir: string): string | null {
  let value = raw.trim();
  if (value.length === 0) return null;
  for (const variable of OWN_DIR_VARS) {
    if (!value.startsWith(variable)) continue;
    const rest = value.slice(variable.length);
    value = rest.startsWith('/') ? rest.slice(1) : rest;
    // The variable ALONE names the declaring directory itself.
    if (value.length === 0) return declaringDir;
    break;
  }
  // A computed path, a generator expression, an absolute path or a walk out of
  // the repository. Each is refused rather than guessed at.
  if (value.includes('$') || value.startsWith('/') || value.startsWith('~')) {
    return null;
  }
  const joined = declaringDir === '' ? value : `${declaringDir}/${value}`;
  const parts: string[] = [];
  for (const segment of joined.split('/')) {
    if (segment === '' || segment === '.') continue;
    if (segment === '..') {
      if (parts.length === 0) return null;
      parts.pop();
      continue;
    }
    parts.push(segment);
  }
  return normalizeRel(parts.join('/'));
}
