/**
 * The manifest aware resolver (Phase 63, research 49 section 4.8 fix 4).
 *
 * It turns one import specifier written in one file into one of four answers,
 * and the four answers are the whole point:
 *
 * - `first-party`, with the repository relative path it names. This is the only
 *   answer that produces an edge the checkers can judge.
 * - `external`, being a dependency, a platform builtin, or a Go standard
 *   library package. It is a definite answer and it is not an internal edge.
 * - `unresolved`, being a specifier this build understands the syntax of and
 *   could not find a file for. Under the conservative verdict rule these are
 *   COUNTED AND SHOWN, so a resolver miss can never masquerade as a verified
 *   absence.
 * - `unverifiable`, being a language whose resolution this build does not ship.
 *   PHASE 157 EMPTIED THIS ANSWER. Rust and Python were captured and marked
 *   here, and both now have arms, as does Ruby. Nothing this build parses is
 *   marked `unverifiable` any more, and `conformance:arch` asserts that by
 *   cross checking `RESOLVER_MATRIX` below against what `resolveImport` really
 *   answers. The answer stays in the vocabulary because the fact base holds
 *   rows an older build wrote, and because the next language added is
 *   `unverifiable` between the day its query lands and the day its arm does. It
 *   is not the same answer as `unresolved`: this one says nobody looked, and
 *   that one says somebody looked and did not find it.
 *
 * THE RULE THAT GOVERNS ALL FOUR. A definite verdict requires a resolved search
 * that returned a definite answer. Nothing here ever guesses, and nothing here
 * ever answers `external` because it ran out of ideas. That is why the
 * unresolved count renders on the component's own face.
 *
 * NOTHING HERE SPAWNS ANYTHING. Resolution is set membership against a file
 * list the caller already enumerated with ONE FIXED ARGV `git ls-files -z`,
 * composed in ../argv-guard.ts, plus the manifests read in ./manifest.ts. There
 * is no ripgrep anywhere in this feature, which is the point of the argv
 * defense rather than an accident. No specifier, no alias and no manifest value
 * ever reaches an argv.
 */

import { builtinModules } from 'node:module';
import { IMPORT_TRUNCATION_MARKER, type ImportForm } from '../../symbols/queries';
import {
  external,
  firstParty,
  unresolved,
  type ArchResolution
} from './answers';
import { resolveKotlin } from './kotlin';
import { normalizeRel, type AliasRule, type ArchManifests } from './manifest';
import { resolveObjc } from './objc';
import { resolvePython } from './python';
import { resolveRuby } from './ruby';
import { resolveRust } from './rust';
import { resolveSwift } from './swift';

/**
 * What one specifier resolved to, and the four constructors that build one.
 *
 * The type and its constructors live in ./answers.ts, which is a leaf every arm
 * can reach. They are re-exported here because this module is the resolver's
 * one facade and every caller outside the directory names it.
 */
export type { ArchResolution } from './answers';
export {
  external,
  firstParty,
  unresolved,
  unverifiable
} from './answers';

/**
 * Every language this build resolves. Phase 180 commit two closed the gap
 * commit one opened: the Swift, Kotlin and Objective-C grammars and their
 * arms are both in the build now.
 *
 * This union and `src/main/arch/scan.ts`'s `languageOf` have to agree, because
 * `languageOf` is what turns a grammar into one of these names and its default
 * branch answers `'typescript'`. A language added to the grammar table and not
 * added here is resolved BY THE SCRIPT ARM, which is not a miss but a wrong
 * answer: a Ruby `require "fs"` would read `external` because `fs` is a Node
 * builtin, and an `external` leaves a `must-not` promise across it green.
 * `conformance:arch` asserts the two lists agree for that reason.
 */
export type ArchResolverLanguage =
  | 'typescript'
  | 'javascript'
  | 'go'
  | 'python'
  | 'rust'
  | 'ruby'
  | 'swift'
  | 'kotlin'
  | 'objc';

/**
 * The one row per language the matrix prints, with the reason a deferred
 * language would give on its face.
 *
 * EVERY ROW SAYS `resolves: true` NOW, and Phase 157 is what emptied the other
 * column. The shape is kept because a language whose query lands before its arm
 * does is `resolves: false` for exactly that long, and because the row is what
 * makes the deferral visible rather than silent.
 *
 * THIS TABLE IS HAND WRITTEN AND IS THEREFORE A CLAIM. `conformance:arch`
 * cross checks it against `resolveImport` itself: a language claiming
 * `resolves: true` must produce at least one answer that is not `unverifiable`,
 * and one claiming `resolves: false` must produce nothing else. Phase 63's
 * verifier caught the gate bucketing hand written facts instead of asking the
 * code, and a hand written table nothing checks is the same defect one level
 * up.
 */
export const RESOLVER_MATRIX: readonly {
  language: ArchResolverLanguage;
  resolves: boolean;
  reason: string | null;
}[] = [
  { language: 'typescript', resolves: true, reason: null },
  { language: 'javascript', resolves: true, reason: null },
  { language: 'go', resolves: true, reason: null },
  { language: 'rust', resolves: true, reason: null },
  { language: 'python', resolves: true, reason: null },
  { language: 'ruby', resolves: true, reason: null },
  // Phase 180 commit two: the arms landed. Swift resolves at TARGET grain,
  // the only grain the language has; Kotlin by the package to directory
  // convention; Objective-C file to file. Each limit is stated on its arm.
  { language: 'swift', resolves: true, reason: null },
  { language: 'kotlin', resolves: true, reason: null },
  { language: 'objc', resolves: true, reason: null }
];

const BUILTINS = new Set(builtinModules);

/**
 * The suffixes a bare TypeScript or JavaScript specifier may be wearing.
 *
 * Order matters and it is TypeScript's own: a `.ts` beats a `.js` of the same
 * stem, because in a TypeScript project the `.js` is usually build output that
 * is not tracked at all.
 */
const TS_SUFFIXES = [
  '',
  '.ts',
  '.tsx',
  '.d.ts',
  '.mts',
  '.cts',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '/index.ts',
  '/index.tsx',
  '/index.d.ts',
  '/index.mts',
  '/index.cts',
  '/index.js',
  '/index.jsx',
  '/index.mjs',
  '/index.cjs'
];

/**
 * `./thing.js` written in a TypeScript ESM file names `./thing.ts` on disk.
 *
 * This is not a courtesy. Node's ESM resolution requires the extension and
 * TypeScript's `moduleResolution: nodenext` requires it to be the OUTPUT
 * extension, so a repository that follows the rule writes `.js` everywhere and
 * ships `.ts`. Without this rewrite such a repository resolves nothing.
 */
const OUTPUT_TO_SOURCE: Readonly<Record<string, string[]>> = {
  '.js': ['.ts', '.tsx'],
  '.mjs': ['.mts'],
  '.cjs': ['.cts'],
  '.jsx': ['.tsx']
};

/** Everything the resolver needs, gathered once per scan. */
export interface ArchResolveContext {
  manifests: ArchManifests;
  /** Every repository relative path the enumeration found, forward slashed. */
  files: ReadonlySet<string>;
  /** Every directory that holds at least one tracked file. Go resolves to these. */
  directories: ReadonlySet<string>;
}

/** Build the context once, from the file list the caller already has. */
export function archResolveContext(
  manifests: ArchManifests,
  files: readonly string[]
): ArchResolveContext {
  const fileSet = new Set<string>();
  const directories = new Set<string>();
  for (const raw of files) {
    const path = normalizeRel(raw);
    if (path === '') continue;
    fileSet.add(path);
    let cut = path.lastIndexOf('/');
    while (cut > 0) {
      directories.add(path.slice(0, cut));
      cut = path.lastIndexOf('/', cut - 1);
    }
  }
  return { manifests, files: fileSet, directories };
}

/**
 * Resolve one specifier written in one file.
 *
 * `fromPath` is repository relative and is used only to walk a relative
 * specifier and to find the enclosing manifests (Phase 178). It is never
 * handed to anything that runs.
 *
 * `form` is HOW the import was written, and exactly one arm needs it. Ruby's
 * `require "utils"` and `require_relative "utils"` are the same six letters and
 * they name different files, and no amount of looking at the specifier text
 * tells them apart. Homebrew holds both a root `utils.rb` and a `cask/utils.rb`,
 * so an arm that guessed between them would report a real edge to the wrong
 * file. Every other arm ignores it, and the one caller that has it,
 * `src/main/arch/scan.ts`, already holds it as `found.form`.
 */
export function resolveImport(
  specifier: string,
  fromPath: string,
  language: ArchResolverLanguage,
  ctx: ArchResolveContext,
  form?: ImportForm
): ArchResolution {
  // A SPECIFIER THE EXTRACTOR HAD TO TRUNCATE IS NOBODY'S ANSWER TO GIVE.
  // It is recorded rather than dropped, which is what keeps the checker counting
  // it, and it is refused here rather than in each arm so that Go's fallback
  // cannot call a mangled path a dependency. See IMPORT_TRUNCATION_MARKER.
  if (specifier.includes(IMPORT_TRUNCATION_MARKER)) return unresolved();
  if (language === 'go') return resolveGo(specifier, ctx);
  if (language === 'rust') return resolveRust(specifier, fromPath, ctx);
  if (language === 'python') return resolvePython(specifier, fromPath, ctx);
  if (language === 'ruby') {
    return resolveRuby(
      specifier,
      fromPath,
      ctx,
      form === 'require-relative' ? 'require-relative' : 'require'
    );
  }
  if (language === 'swift') return resolveSwift(specifier, fromPath, ctx);
  if (language === 'kotlin') return resolveKotlin(specifier, ctx);
  if (language === 'objc') return resolveObjc(specifier, fromPath, ctx);
  return resolveScript(specifier, fromPath, ctx);
}

// ---------------------------------------------------------------------------
// TypeScript and JavaScript
// ---------------------------------------------------------------------------

function resolveScript(
  raw: string,
  fromPath: string,
  ctx: ArchResolveContext
): ArchResolution {
  const specifier = withoutBundlerQuery(raw);
  if (specifier.length === 0) {
    return unresolved();
  }
  // The platform, named directly. `node:fs` and every bare builtin name.
  if (specifier.startsWith('node:')) return external();
  if (specifier === 'electron' || specifier.startsWith('electron/')) {
    return external();
  }
  if (BUILTINS.has(headSegment(specifier))) return external();

  if (specifier.startsWith('./') || specifier.startsWith('../')) {
    const dir = parentOf(fromPath);
    const joined = normalizeRel(dir === '' ? specifier : `${dir}/${specifier}`);
    const hit = firstExisting(joined, ctx);
    return hit === null
      ? unresolved()
      : firstParty(hit);
  }

  if (specifier.startsWith('/')) {
    // An absolute specifier is not a repository relative path and this build
    // will not pretend to know what it names.
    return unresolved();
  }

  const aliased = resolveAlias(specifier, ctx);
  if (aliased !== null) return aliased;

  const workspace = resolveWorkspace(specifier, ctx);
  if (workspace !== null) return workspace;

  // THE REPOSITORY HAS TO HAVE SAID SO. A bare specifier an ENCLOSING manifest
  // declares a dependency on, nearest first (Phase 178), is `external`, which
  // is a definite answer. One no enclosing manifest declares is `unresolved`,
  // which is not.
  //
  // The first build answered `external` here whatever the specifier was, and
  // that is the rule this module's own header forbids: it answered definitely
  // because it had run out of ideas. The cost was not a wrong count. An import
  // through an alias this build cannot see, from a nested tsconfig or a Vite
  // `resolve.alias`, is a FIRST PARTY import, and calling it a dependency
  // hides it from the crossing list and leaves a `must-not` promise across it
  // green. Being grey about a package nobody declared is the safe half of that
  // trade.
  //
  // THE OTHER HALF IS STILL OPEN, and this tree holds a live instance of it.
  // The rule above only guards the specifiers that reach HERE. A specifier the
  // short circuits above answer for never gets an alias consulted at all, and
  // `vitest.config.ts` aliases the bare name `electron` to the first party file
  // `src/test/electron-stub.cjs`. So under that config `electron` is a first
  // party import wearing `external`, which is the exact shape described in the
  // paragraph above, with a DECLARED package rather than an undeclared one. No
  // contract in this repository exercises it, because this repository ships no
  // `docs/arch/` of its own, so it is a gap in what this module can see rather
  // than a verdict it gets wrong today. Closing it means asking the alias table
  // first and the platform names second, and that is a later round's change
  // because it moves the answer for every builtin too.
  if (isDeclared(packageHead(specifier), fromPath, ctx)) return external();
  return unresolved();
}

/**
 * Did an ENCLOSING manifest declare this package, directly or as its types?
 *
 * PHASE 178 MADE THE QUESTION PATH AWARE. The old form asked one merged set,
 * being the root manifest and its declared workspaces, so a monorepo whose
 * real dependency list lives in a nested `package.json` the root never named
 * showed every one of that package's imports as unresolved: rookery drew 47
 * where its own manifests leave 6. The walk now starts at the importing
 * file's own directory and climbs to the root, and the NEAREST enclosing
 * manifest that declares the name justifies `external`, which is the
 * direction Node itself resolves in. A sibling subtree's declarations justify
 * nothing here, and a name no enclosing manifest declares stays `unresolved`,
 * so unresolved-never-external survives exactly as written.
 *
 * The types form is DefinitelyTyped's own mapping and not a guess: a
 * `@types/hast` in the manifest is what makes `import type { Root } from 'hast'`
 * resolve, and a scoped package's types live under the scope joined with two
 * underscores. Without this rule a types only import reads as unresolved and
 * greys out a promise for no reason, which was measured on this tree.
 */
function isDeclared(
  name: string,
  fromPath: string,
  ctx: ArchResolveContext
): boolean {
  const dirs = ctx.manifests.manifestDirs;
  let dir = parentOf(fromPath);
  for (;;) {
    const declared = dirs.get(dir);
    if (declared !== undefined && declaresPackage(declared, name)) return true;
    if (dir === '') return false;
    const cut = dir.lastIndexOf('/');
    dir = cut === -1 ? '' : dir.slice(0, cut);
  }
}

/** One manifest's own answer, the `@types` mapping included. */
function declaresPackage(declared: ReadonlySet<string>, name: string): boolean {
  if (declared.has(name)) return true;
  if (name.startsWith('@')) {
    const [scope, rest] = [name.slice(1, name.indexOf('/')), name.slice(name.indexOf('/') + 1)];
    return declared.has(`@types/${scope}__${rest}`);
  }
  return declared.has(`@types/${name}`);
}

/**
 * The package name a bare specifier begins with, scope included.
 *
 * `lodash/fp` is `lodash` and `@babel/core/lib/x` is `@babel/core`, which is
 * what a manifest's dependency block is keyed on.
 */
function packageHead(specifier: string): string {
  const parts = specifier.split('/');
  if (specifier.startsWith('@') && parts.length >= 2) {
    return `${parts[0] ?? ''}/${parts[1] ?? ''}`;
  }
  return parts[0] ?? specifier;
}

/** The first `paths` rule that matches, in longest prefix order. */
function resolveAlias(
  specifier: string,
  ctx: ArchResolveContext
): ArchResolution | null {
  for (const rule of ctx.manifests.aliases) {
    const star = matchAlias(rule, specifier);
    if (star === null) continue;
    for (const target of rule.targets) {
      const candidate = normalizeRel(
        rule.wildcard
          ? `${target.prefix}${star}${target.suffix}`
          : `${target.prefix}${target.suffix}`
      );
      const hit = firstExisting(candidate, ctx);
      if (hit !== null) return firstParty(hit);
    }
    // The rule matched and no target exists. This is the honest unresolved
    // case: the alias is real, the file behind it is not, and calling it
    // external would invent a dependency that does not exist.
    return unresolved();
  }
  return null;
}

/** What the rule's star stands for in this specifier, or null when it does not match. */
function matchAlias(rule: AliasRule, specifier: string): string | null {
  if (!rule.wildcard) return specifier === rule.prefix ? '' : null;
  if (!specifier.startsWith(rule.prefix)) return null;
  const rest = specifier.slice(rule.prefix.length);
  if (rule.suffix.length === 0) return rest;
  if (!rest.endsWith(rule.suffix)) return null;
  return rest.slice(0, rest.length - rule.suffix.length);
}

/** A bare specifier naming a package this repository itself publishes. */
function resolveWorkspace(
  specifier: string,
  ctx: ArchResolveContext
): ArchResolution | null {
  const { workspaces, packageName } = ctx.manifests;
  const names = [...workspaces.keys()];
  if (packageName !== null) names.push(packageName);
  let best: string | null = null;
  for (const name of names) {
    if (specifier !== name && !specifier.startsWith(`${name}/`)) continue;
    if (best === null || name.length > best.length) best = name;
  }
  if (best === null) return null;
  const workspace = workspaces.get(best);
  const dir = workspace === undefined ? '' : workspace.dir;
  const rest = specifier === best ? '' : specifier.slice(best.length + 1);
  if (rest === '') {
    // A bare package name names the package's ENTRY, and the manifest is what
    // says where that is. The source conventions are tried after it, because a
    // TypeScript package's `main` usually points at output nobody tracks.
    for (const entry of workspace?.entries ?? []) {
      const hit = firstExisting(entry, ctx);
      if (hit !== null) return firstParty(hit);
    }
    return unresolved();
  }
  const candidate = normalizeRel(dir === '' ? rest : `${dir}/${rest}`);
  const hit = firstExisting(candidate, ctx);
  if (hit !== null) return firstParty(hit);
  return unresolved();
}

/** The first suffix that names a tracked file, or null. */
function firstExisting(base: string, ctx: ArchResolveContext): string | null {
  if (base === '') return null;
  for (const suffix of TS_SUFFIXES) {
    const candidate = suffix === '' ? base : `${base}${suffix}`;
    if (ctx.files.has(candidate)) return candidate;
  }
  const dot = base.lastIndexOf('.');
  if (dot > base.lastIndexOf('/')) {
    const stem = base.slice(0, dot);
    for (const source of OUTPUT_TO_SOURCE[base.slice(dot)] ?? []) {
      const candidate = `${stem}${source}`;
      if (ctx.files.has(candidate)) return candidate;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Go
// ---------------------------------------------------------------------------

/**
 * A Go import names a PACKAGE, which is a directory, so a first party Go answer
 * is a directory path rather than a file path. That is stated here rather than
 * smoothed over, because an anchor glob is matched against it exactly as it is
 * matched against a file path.
 *
 * A specifier under the module directive is first party. Everything else is
 * external, and the standard library is the case where the first segment
 * carries no dot, which is Go's own rule for telling a module path from a
 * standard library package.
 */
function resolveGo(
  specifier: string,
  ctx: ArchResolveContext
): ArchResolution {
  const module = ctx.manifests.goModule;
  if (specifier.length === 0) {
    return unresolved();
  }
  if (module !== null) {
    if (specifier === module) {
      return firstParty('');
    }
    if (specifier.startsWith(`${module}/`)) {
      const dir = normalizeRel(specifier.slice(module.length + 1));
      if (ctx.directories.has(dir)) {
        return firstParty(dir);
      }
      return unresolved();
    }
  }
  return external();
}

// ---------------------------------------------------------------------------
// Small shared pieces
// ---------------------------------------------------------------------------

/**
 * The specifier without a bundler's query or fragment.
 *
 * `./icon.svg?raw`, `./worker?worker&inline` and `./font.woff2?inline` are
 * ordinary in a Vite project and this repository writes all three. The query
 * changes what the bundler DOES with the file and never which file it is, so a
 * resolver that kept it would report a repository's own assets as unresolved
 * and inflate the one number the conservative rule asks a person to read.
 *
 * Counted on 2026-08-26 over this tree, by reading every one of the 1,744
 * tracked script files and taking every quoted specifier out of an `import`, an
 * `export from`, a dynamic `import()` and a `require()`. That is 9,584
 * specifiers, of which 25 carry a query or a fragment. 19 of the 25 are
 * relative, being the thirteen agent icons, the four capture fonts, one brand
 * asset and the diff worker, and those 19 are the ones that would read as
 * unresolved without this strip. The other 6 are bare, being five Monaco
 * workers and one Pierre worker, and they resolve by their package name with or
 * without the strip.
 *
 * TWO EARLIER VERSIONS OF THIS COMMENT STATED A NUMBER THAT WAS NOT TRUE. The
 * first turned two counts into a before and after count of unresolved
 * specifiers, and that arithmetic never reconciled with the zero that was
 * actually left. The second said 26 and called them all static, when five of
 * them are dynamic `import()` calls, being the four fonts and the diff worker.
 * A count written into a comment is a claim like any other, so this one says
 * how it was taken.
 */
function withoutBundlerQuery(specifier: string): string {
  const cut = specifier.search(/[?#]/);
  return cut === -1 ? specifier : specifier.slice(0, cut);
}

function headSegment(specifier: string): string {
  const slash = specifier.indexOf('/');
  return slash === -1 ? specifier : specifier.slice(0, slash);
}

function parentOf(path: string): string {
  const cut = normalizeRel(path).lastIndexOf('/');
  return cut === -1 ? '' : normalizeRel(path).slice(0, cut);
}
