/**
 * The C and C++ arm (Phase 184), and it resolves at FILE grain.
 *
 * ONE ARM, TWO LANGUAGES, BECAUSE `#include` IS ONE MECHANISM. C and C++ are
 * separate rows in the matrix, because each is a separate claim over a
 * separate corpus and a row that could not fail on its own would prove
 * nothing, but the recipe is the same and writing it twice is the duplication
 * the growth guardrail forbids.
 *
 * NO NEW GRAMMAR WAS ADMITTED FOR EITHER, AND BOTH REFUSALS ARE MEASURED. The
 * Phase 184 entry left the C decision open and assumed C++ was free.
 *
 *  - **The separate C grammar is refused.** `tree-sitter/tree-sitter-c` v0.24.2
 *    publishes a 645,157 byte wasm. Run against the objc grammar this build
 *    already vendors it wins by ONE clean file on libgit2 and loses by TWO on
 *    redis, and both grammars extract exactly the same includes. 645 KB for
 *    minus one file is not a deliberate act, it is a reflex.
 *  - **The `cpp` grammar is refused too, and this is the argument that has to
 *    be won on the house's own precedent.** Phase 157 spent 2.0 MB and Phase
 *    180 spent 12.6 MB, and both bought the same thing: imports RESOLVING.
 *    The cpp grammar buys none. Measured over 400 abseil files, the objc
 *    grammar extracted 3,637 `#include` directives against a regular
 *    expression ground truth of 3,636, which is every one of them; a
 *    tree-sitter parse recovers a preprocessor directive whatever the
 *    surrounding macro soup does. Its 5,394,393 bytes would buy SYMBOLS only,
 *    and only from 5.5 percent of abseil's files clean to 20 percent. That is
 *    a real gain and it is not the gain this feature spends bundle on.
 *
 * SO `.c`, `.cc`, `.cpp`, `.cxx`, `.hpp`, `.hh` and `.hxx` all read with the
 * objc grammar, the way `.h` has since Phase 180, and the limit that follows
 * is stated where a person will meet it: a template heavy C++ file gives
 * PARTIAL SYMBOLS. Its imports are whole.
 *
 * THE LADDER FOR A QUOTED INCLUDE, in the order it is asked:
 *  1. Beside the including file, which is the compiler's own rule for the
 *     quoted form.
 *  2. From the repository root. THIS STEP IS NOT OPTIONAL: abseil writes
 *     `#include "absl/strings/str_cat.h"` and resolves 4,277 of its 4,748
 *     quoted includes that way and nothing else at all, because that is the
 *     Bazel convention and it is the whole of abseil's answer.
 *  3. Through a directory the project DECLARED, from ./include-dirs.ts. redis
 *     resolves 677 of its 1,859 quoted includes through `-I../deps/hiredis`
 *     and its three neighbours on one line of one Makefile.
 *  4. A UNIQUE match on the path's tail anywhere in the tree.
 *  5. Anything else is `unresolved`, NEVER `external`. A quoted include that
 *     found no file is a failure to resolve and it is reported as one, which
 *     is why abseil's 471 `gtest/gtest.h` and friends stay grey: they are
 *     declared in Bazel dependency RULES rather than as include paths, and
 *     this arm reads paths.
 *
 * THE AMBIGUOUS TAIL IS REAL AND IT MUST STAY GREY. libgit2 has 592 quoted
 * includes, 14 percent of them, whose tail matches more than one tracked file,
 * because it vendors zlib, pcre2, ntlmclient and http_parser beside its own
 * headers. Picking one would be the wrong edge.
 *
 * THE ANGLE BRACKET FORM ARRIVES WITH ITS BRACKETS ON, the way the
 * Objective-C arm's does, and is judged the same way with one step in front:
 * a declared include directory that names a tracked file wins, because the
 * project said the search starts there; then a tracked file the bracket could
 * otherwise reach makes the answer `unresolved`, which is the shadow rule;
 * then it is `external` on its form alone, which is the language's own
 * declaration that the search happens outside this repository, the same
 * authority `node:fs` carries. The long defence of that trade is in ./objc.ts
 * and it is not repeated here.
 *
 * THE LIMIT PHASE 180 SET AND THIS PHASE KEEPS. A `.h` reads with the
 * OBJECTIVE-C arm, not this one, because it is the one extension all three
 * languages share and Phase 180 ruled on it. So an `#include` written in a
 * `.h` gets steps 1, 2 and 4 and NOT step 3: a declared include directory is
 * not consulted for a header. Moving `.h` here would change what a shipped arm
 * answers for every Objective-C repository, which this phase refuses to do.
 *
 * NOTHING HERE SPAWNS ANYTHING. Set membership against the caller's file list
 * plus the directories ./include-dirs.ts read. No specifier reaches an argv.
 */

import { external, firstParty, unresolved, type ArchResolution } from './answers';
import type { ArchResolveContext } from './index';
import { joinWithin, parentOf } from './paths';
import { trackedSuffixIndex } from './suffix-index';

/** The characters an include path may be written with. */
const PLAIN_INCLUDE = /^[A-Za-z0-9_.+\-/]+$/;

/** Resolve one C or C++ include. */
export function resolveCFamily(
  specifier: string,
  fromPath: string,
  ctx: ArchResolveContext
): ArchResolution {
  const spec = specifier.trim();
  if (spec.length === 0) return unresolved();
  if (spec.startsWith('<') && spec.endsWith('>')) {
    return systemInclude(spec.slice(1, -1), ctx);
  }
  return quotedInclude(spec, fromPath, ctx);
}

/** Beside, then the root, then a declared directory, then a unique tail. */
function quotedInclude(
  spec: string,
  fromPath: string,
  ctx: ArchResolveContext
): ArchResolution {
  if (!PLAIN_INCLUDE.test(spec) || spec.startsWith('/')) return unresolved();
  const beside = joinWithin(parentOf(fromPath), spec);
  if (beside !== null && ctx.files.has(beside)) return firstParty(beside);
  const fromRoot = joinWithin('', spec);
  if (fromRoot === null) return unresolved();
  if (ctx.files.has(fromRoot)) return firstParty(fromRoot);
  const declared = throughDeclaredDir(spec, ctx);
  if (declared !== null) return firstParty(declared);
  const matches = trackedSuffixIndex(ctx).get(fromRoot) ?? [];
  if (matches.length === 1) return firstParty(matches[0] ?? '');
  // Nothing, or several. Both are grey: a wrong edge is worse than no edge.
  return unresolved();
}

/** Declared first, then the shadow rule, then external on the form alone. */
function systemInclude(path: string, ctx: ArchResolveContext): ArchResolution {
  if (!PLAIN_INCLUDE.test(path) || path.startsWith('/')) return unresolved();
  const declared = throughDeclaredDir(path, ctx);
  if (declared !== null) return firstParty(declared);
  const normal = joinWithin('', path);
  if (normal === null) return unresolved();
  if (ctx.files.has(normal) || (trackedSuffixIndex(ctx).get(normal) ?? []).length > 0) {
    return unresolved();
  }
  return external();
}

/** The first declared include directory that names a tracked file, or null. */
function throughDeclaredDir(
  spec: string,
  ctx: ArchResolveContext
): string | null {
  for (const dir of ctx.manifests.includeDirs.dirs) {
    const candidate = joinWithin(dir, spec);
    if (candidate !== null && ctx.files.has(candidate)) return candidate;
  }
  return null;
}

