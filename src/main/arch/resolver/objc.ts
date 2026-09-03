/**
 * The Objective-C arm (Phase 180), the plain file to file recipe.
 *
 * WHAT IT CLAIMS. `#import "Renderer.h"` names a header file, and the arm
 * finds it the way the toolchain's own header map does: the importing file's
 * own directory first, which is the compiler's rule for the quoted form, then
 * the path as written from the repository root, then a UNIQUE match on the
 * path's tail anywhere in the tree, because Xcode's header maps make every
 * header in a project reachable by its bare name. A name two headers share is
 * `unresolved` rather than a coin flip.
 *
 * THE ANGLE BRACKET FORM ARRIVES WITH ITS BRACKETS ON, the way Go's specifier
 * arrives with its quotes, because the query keeps them so this arm can read
 * the form: `<Foundation/Foundation.h>` declares a SYSTEM search, which is the
 * language's own way of saying "outside this repository", the same authority
 * `node:fs` carries. So a bracketed include is `external` on its form alone,
 * with two overrides read in order: a tracked file that could be it makes the
 * answer `unresolved`, because header search paths can point back into the
 * repository and inventing a dependency there is the false green; and a
 * framework head that is neither Apple's SDK nor a declared pod is left
 * `external` only when the path is bracketed, never for the quoted form.
 * `@import Module;` resolves by the module name: a declared pod or an Apple
 * SDK module is `external`, anything else is `unresolved`.
 *
 * THE LIMIT ON ITS FACE: HEADER VERSUS IMPLEMENTATION. An edge lands on the
 * FILE THAT WAS NAMED, which is almost always the `.h`, and this arm never
 * pairs a header with the `.m` that implements it. "A.m uses B" therefore
 * reads as an edge to `B.h`, not to `B.m`, and a promise written about
 * implementation files must anchor the headers too. Pairing by basename would
 * be a guess the build system does not write down, so it is refused.
 *
 * PHASE 184 MOVED ONE PRIVATE HELPER OUT AND CHANGED NO ANSWER. The suffix
 * index this arm built for itself is now ./suffix-index.ts, shared with the C
 * family arm, which needs exactly the same map. The map's contents are
 * identical and the tests over this arm are unchanged; what moved is eighteen
 * duplicated lines, per CLAUDE.md's growth guardrail.
 *
 * NOTHING HERE SPAWNS ANYTHING. Set membership against the caller's file
 * list plus the names ./podfile.ts read. No specifier reaches an argv.
 */

import { APPLE_SDK_MODULES } from './apple-sdk';
import { external, firstParty, unresolved, type ArchResolution } from './answers';
import type { ArchResolveContext } from './index';
import { joinWithin, parentOf } from './paths';
import { trackedSuffixIndex } from './suffix-index';

/** The characters a header path may be written with. */
const PLAIN_HEADER = /^[A-Za-z0-9_.+\-/]+$/;

/** The characters a module name may be written with. */
const PLAIN_MODULE = /^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*)*$/;

/** Resolve one Objective-C import. */
export function resolveObjc(
  specifier: string,
  fromPath: string,
  ctx: ArchResolveContext
): ArchResolution {
  const spec = specifier.trim();
  if (spec.length === 0) return unresolved();
  if (spec.startsWith('<') && spec.endsWith('>')) {
    return systemInclude(spec.slice(1, -1), ctx);
  }
  if (!spec.includes('.') || spec.endsWith('.')) {
    // No extension at all: `@import Foundation;`, or a mangled specifier.
    return moduleImport(spec, ctx);
  }
  return quotedInclude(spec, fromPath, ctx);
}

/** The quoted form: the includer's own directory, the root, then a unique tail. */
function quotedInclude(
  spec: string,
  fromPath: string,
  ctx: ArchResolveContext
): ArchResolution {
  if (!PLAIN_HEADER.test(spec)) return unresolved();
  if (spec.startsWith('/')) return unresolved();
  const dir = parentOf(fromPath);
  const beside = joinWithin(dir, spec);
  if (beside !== null && ctx.files.has(beside)) return firstParty(beside);
  const fromRoot = joinWithin('', spec);
  if (fromRoot !== null && ctx.files.has(fromRoot)) return firstParty(fromRoot);
  if (fromRoot === null) return unresolved();
  const matches = trackedSuffixIndex(ctx).get(fromRoot) ?? [];
  if (matches.length === 1) return firstParty(matches[0] ?? '');
  return unresolved();
}

/** The bracketed form: system by declaration, shadowed by anything tracked. */
function systemInclude(path: string, ctx: ArchResolveContext): ArchResolution {
  if (!PLAIN_HEADER.test(path) || path.startsWith('/')) return unresolved();
  const normal = joinWithin('', path);
  if (normal === null) return unresolved();
  // The shadow rule: a tracked file this bracket could reach through a header
  // search path makes the answer grey, never a dependency.
  if (ctx.files.has(normal) || (trackedSuffixIndex(ctx).get(normal) ?? []).length > 0) {
    return unresolved();
  }
  // THE RULING, made explicit by the Phase 180 fix round because this return
  // is the one place the arm answers `external` for a framework nothing
  // declares. `#import <Undeclared/Undeclared.h>` is external ON ITS FORM
  // ALONE. That does not breach the charter's "unresolved NEVER external",
  // because that rule forbids DOWNGRADING a failure into a dependency, and
  // the bracket is not a failure: it is the language's own declaration that
  // the search happens outside this repository, the same authority `node:fs`
  // carries, and the shadow rule above has already gone grey for every
  // tracked file a header search path could reach back to. The cost accepted
  // with eyes open: a bracketed include of a genuinely missing framework
  // drops off both sides of the imports checker's ledger the way every
  // dependency does, and a promise about it tops out at the manifest
  // checker. The `@import Module;` form keeps the opposite default in
  // `moduleImport` below, because a module NAME carries no such declaration:
  // undeclared there answers `unresolved`. Changing this return to
  // `unresolved` would grey every promise out of every file that includes a
  // system framework, which is every Objective-C file, and that is why the
  // trade lands this way.
  return external();
}

/** `@import Module;` and `@import Module.Submodule;`. */
function moduleImport(spec: string, ctx: ArchResolveContext): ArchResolution {
  if (!PLAIN_MODULE.test(spec)) return unresolved();
  const head = spec.split('.')[0] ?? spec;
  if (ctx.manifests.objc.pods.has(head)) return external();
  if (APPLE_SDK_MODULES.has(head)) return external();
  return unresolved();
}


