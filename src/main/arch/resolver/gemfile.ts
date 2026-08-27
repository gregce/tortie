/**
 * The Ruby manifests a repository keeps, read once per scan (Phase 157).
 *
 * WHAT IT READS, AND WHERE IT STOPS. The `Gemfile` at the repository root and
 * every `*.gemspec` at the repository root. NOTHING BELOW THE ROOT. A gem that
 * lives in a subdirectory with its own gemspec is invisible to this reader, and
 * the Ruby arm answers `unresolved` rather than `external` for anything it
 * cannot account for, so an invisible manifest costs a grey verdict rather than
 * a green one. That limit is stated here because Phase 63's own manifest reader
 * had the same shape and the reason it is safe is the answer it gives when it
 * misses, not the completeness of what it reads.
 *
 * THE GEMFILE IS RUBY SOURCE CODE AND IS NEVER EVALUATED. It is matched line by
 * line with anchored regular expressions, the way `readGoModule` reads `go.mod`
 * one line at a time. A gemspec is Ruby source code too and is read the same
 * way. NOTHING HERE SPAWNS ANYTHING and no value read out of either file ever
 * reaches an argv: gem names are compared against an import specifier in
 * process and require paths are joined onto a repository relative path and
 * looked up in a set.
 *
 * WHY THE GEM NAMES ARE READ AT ALL. They are the only thing that lets a bare
 * `require "rake"` be answered `external` because the REPOSITORY SAID SO. A
 * bare require the manifests do not name is `unresolved`, which is grey rather
 * than green, and that is the rule Phase 63's verifier was written around.
 */

import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { normalizeRel, readTextOrNull } from './paths';

/** What the root Gemfile and the root gemspecs said. */
export interface RubyManifest {
  /**
   * Every gem name the repository declares a dependency on, from the Gemfile's
   * `gem "x"` lines and from each gemspec's `add_dependency` family.
   *
   * It is the only reason the Ruby arm may ever answer `external` for a name
   * that is not in Ruby's own standard library.
   */
  gems: Set<string>;
  /**
   * The load path roots a gemspec declared, repository relative, in the order
   * they were found. `require_paths = ["lib"]` is the near universal shape and
   * a gemspec that names none is treated as declaring `lib`, which is
   * RubyGems' own default rather than a guess of ours.
   *
   * EMPTY WHEN NO GEMSPEC WAS FOUND, and that is the honest state: Ruby's load
   * path is assembled at run time by the program itself, so a repository that
   * declares nothing has a load path this build cannot know. Every bare require
   * in such a repository answers `unresolved`.
   */
  requirePaths: string[];
  /** True when a Gemfile or a gemspec exists at the root. Provenance for the arm. */
  present: boolean;
}

/** The empty answer, for a repository with no Ruby manifests at all. */
export function emptyRubyManifest(): RubyManifest {
  return { gems: new Set<string>(), requirePaths: [], present: false };
}

/** A gem name as a manifest may write it. Compared, never run. */
const GEM_NAME = String.raw`([A-Za-z0-9_][A-Za-z0-9_.\-]*)`;

/** `gem "rake"`, `gem 'rake', "~> 13"`, indented inside a `group` block. */
const GEMFILE_GEM = new RegExp(String.raw`^\s*gem\s*\(?\s*["']${GEM_NAME}["']`);

/** `spec.add_dependency "x"`, `add_runtime_dependency`, `add_development_dependency`. */
const GEMSPEC_DEPENDENCY = new RegExp(
  String.raw`\.add(?:_runtime|_development)?_dependency\s*\(?\s*["']${GEM_NAME}["']`
);

/** `spec.require_paths = ["lib", "ext"]`. */
const REQUIRE_PATHS = /\.require_paths\s*=\s*\[([^\]]*)\]/;

/** `spec.require_path = "lib"`, the singular form. */
const REQUIRE_PATH = /\.require_path\s*=\s*["']([^"']+)["']/;

/** How many gemspecs one root may contribute. A repository has one or two. */
const MAX_GEMSPECS = 8;

/**
 * Read the root Gemfile and the root gemspecs.
 *
 * Every failure is absorbed into the empty answer, because a repository with no
 * Ruby in it must cost nothing and a repository whose Gemfile cannot be read
 * must still resolve its `require_relative` lines.
 */
export function readRubyManifest(repoPath: string): RubyManifest {
  const out = emptyRubyManifest();
  const gemfile = readTextOrNull(join(repoPath, 'Gemfile'));
  if (gemfile !== null) {
    out.present = true;
    for (const line of gemfile.split('\n')) {
      const match = GEMFILE_GEM.exec(line);
      if (match?.[1] !== undefined) out.gems.add(match[1]);
    }
  }
  for (const name of gemspecNames(repoPath)) {
    const text = readTextOrNull(join(repoPath, name));
    if (text === null) continue;
    out.present = true;
    readGemspecInto(text, out);
  }
  return out;
}

/** One gemspec's dependency names and require paths, merged into the answer. */
function readGemspecInto(text: string, out: RubyManifest): void {
  let declaredPaths = false;
  for (const line of text.split('\n')) {
    if (line.trimStart().startsWith('#')) continue;
    const dependency = GEMSPEC_DEPENDENCY.exec(line);
    if (dependency?.[1] !== undefined) out.gems.add(dependency[1]);
    const many = REQUIRE_PATHS.exec(line);
    if (many?.[1] !== undefined) {
      for (const piece of many[1].split(',')) {
        const value = piece.trim().replace(/^["']|["']$/g, '');
        if (addRequirePath(value, out)) declaredPaths = true;
      }
      continue;
    }
    const one = REQUIRE_PATH.exec(line);
    if (one?.[1] !== undefined && addRequirePath(one[1], out)) declaredPaths = true;
  }
  // RubyGems' own default, written down in its specification: a gemspec that
  // names no require path has `["lib"]`. Taking the default is reading the
  // manifest rather than guessing at it, and it is what makes the ordinary gem
  // layout resolve.
  if (!declaredPaths) addRequirePath('lib', out);
}

function addRequirePath(value: string, out: RubyManifest): boolean {
  const path = normalizeRel(value);
  if (path === '') return false;
  if (!out.requirePaths.includes(path)) out.requirePaths.push(path);
  return true;
}

/** The `*.gemspec` names directly in the root, sorted so the read is deterministic. */
function gemspecNames(repoPath: string): string[] {
  try {
    return readdirSync(repoPath)
      .filter((name) => name.endsWith('.gemspec'))
      .sort()
      .slice(0, MAX_GEMSPECS);
  } catch {
    return [];
  }
}
