/**
 * The Swift arm (Phase 180), and it resolves at TARGET GRAIN, deliberately.
 *
 * WHAT IT CLAIMS. A Swift import names a MODULE, never a file, and files
 * inside one target see each other with zero import statements, so file to
 * file edges inside a target DO NOT EXIST IN THE SOURCE and this arm never
 * invents one. What it answers is the edge the source does contain: the
 * importing file belongs to a target by the manifest's own path rules, the
 * specifier names a target somebody declared, and the edge lands from that
 * file on the named target's own directory. Which is the same shape the Go
 * arm has answered since Phase 63: a first party answer that is a directory,
 * because that is the grain the language resolves at.
 *
 * WHERE THE TARGETS COME FROM: ./swiftpm.ts, being every tracked
 * Package.swift read as Swift source by the same grammar the palette uses,
 * and every tracked project.pbxproj's membership tables. A manifest whose
 * targets are computed rather than literal has STOPPED, its targets are not
 * here, and every import that only it could answer is `unresolved`.
 *
 * THE RULES, in the order they are asked:
 *  1. A target named by the import that OWNS at least one tracked file
 *     resolves first party to its directory. A declared target that owns
 *     nothing resolves nothing, because an edge to an empty claim is an
 *     invented edge. Two same-named targets in different projects are told
 *     apart by the importing file's own manifest, and an ambiguity that
 *     survives that is `unresolved`, never a coin flip.
 *  2. A name both a target and Apple's SDK claim is `unresolved`, the two
 *     worlds rule: guessing either way risks a wrong edge or a false green.
 *  3. A declared package or product name is `external`; the manifest said so.
 *  4. A known Apple SDK module is `external`; the platform, the same
 *     authority as `node:fs`, checked after the repository's own names.
 *  5. Everything else is `unresolved`, NEVER `external`.
 *
 * NOTHING HERE SPAWNS ANYTHING. Set membership against the caller's file
 * list plus what ./swiftpm.ts read. No specifier reaches an argv.
 */

import { APPLE_SDK_MODULES } from './apple-sdk';
import { external, firstParty, unresolved, type ArchResolution } from './answers';
import type { ArchResolveContext } from './index';
import type { SwiftTarget } from './swiftpm';

/** The characters a module path may be written with. */
const PLAIN_MODULE = /^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*)*$/;

/** Per context assignment of files to targets, built once per scan. */
const SWIFT_INDEX = new WeakMap<ArchResolveContext, SwiftIndex>();

interface SwiftIndex {
  /** Every tracked .swift file's target, by the manifest's own path rules. */
  targetOf: Map<string, SwiftTarget>;
  /** The directory each resolvable target's edge lands on. */
  dirOf: Map<SwiftTarget, string>;
  /** Targets by module name, only those that own at least one tracked file. */
  byName: Map<string, SwiftTarget[]>;
}

/** Resolve one Swift import. */
export function resolveSwift(
  specifier: string,
  fromPath: string,
  ctx: ArchResolveContext
): ArchResolution {
  const spec = specifier.trim();
  if (spec.length === 0 || !PLAIN_MODULE.test(spec)) return unresolved();
  // `import UIKit.UIView` scopes the import; the module is still UIKit.
  const head = spec.split('.')[0] ?? spec;
  const index = swiftIndex(ctx);
  let candidates = index.byName.get(head) ?? [];
  if (candidates.length > 1) {
    // Two projects may both declare a target named Rook. The importing file's
    // own manifest is what tells its tests' `@testable import Rook` apart.
    const own = index.targetOf.get(fromPath);
    if (own !== undefined) {
      const near = candidates.filter((t) => t.manifest === own.manifest);
      if (near.length > 0) candidates = near;
    }
  }
  if (candidates.length === 1) {
    const target = candidates[0];
    if (target !== undefined) {
      // The two worlds rule: a target wearing an SDK module's name could be
      // either import, and both possible wrong answers are worse than grey.
      if (APPLE_SDK_MODULES.has(head)) return unresolved();
      const dir = index.dirOf.get(target);
      if (dir !== undefined) return firstParty(dir);
    }
    return unresolved();
  }
  if (candidates.length > 1) return unresolved();
  if (ctx.manifests.swift.packages.has(head)) return external();
  if (APPLE_SDK_MODULES.has(head)) return external();
  return unresolved();
}

/**
 * Which target one tracked file belongs to, by the manifest's own path rules,
 * exported so the conformance probe can print the assignment table the
 * charter asks to be proved against the manifest.
 */
export function swiftTargetName(
  relPath: string,
  ctx: ArchResolveContext
): string | null {
  return swiftIndex(ctx).targetOf.get(relPath)?.name ?? null;
}

/** Assign every tracked .swift file once, and index the targets by name. */
function swiftIndex(ctx: ArchResolveContext): SwiftIndex {
  const cached = SWIFT_INDEX.get(ctx);
  if (cached !== undefined) return cached;
  const { targets } = ctx.manifests.swift;

  const explicit = new Map<string, SwiftTarget>();
  const prefixes: { dir: string; target: SwiftTarget }[] = [];
  for (const target of targets) {
    for (const file of target.files ?? []) {
      // Explicit membership: first declaration wins, and a file two targets
      // both list stays with the first, which is deterministic.
      if (!explicit.has(file)) explicit.set(file, target);
    }
    if (target.dir !== null) prefixes.push({ dir: target.dir, target });
    for (const dir of target.syncDirs) prefixes.push({ dir, target });
  }
  // Longest prefix first, so a nested target's directory beats its parent's.
  prefixes.sort((a, b) => b.dir.length - a.dir.length);

  const targetOf = new Map<string, SwiftTarget>();
  const owned = new Map<SwiftTarget, string[]>();
  for (const path of ctx.files) {
    if (!path.endsWith('.swift')) continue;
    let target = explicit.get(path);
    if (target === undefined) {
      for (const { dir, target: candidate } of prefixes) {
        if (path.startsWith(`${dir}/`)) {
          target = candidate;
          break;
        }
      }
    }
    if (target === undefined) continue;
    targetOf.set(path, target);
    const held = owned.get(target);
    if (held === undefined) owned.set(target, [path]);
    else held.push(path);
  }

  // The directory an edge lands on: the SPM target's declared directory, or
  // for an Xcode target the deepest directory all its members share.
  const dirOf = new Map<SwiftTarget, string>();
  const byName = new Map<string, SwiftTarget[]>();
  for (const target of targets) {
    const files = owned.get(target) ?? [];
    if (files.length === 0) continue;
    const dir = target.dir ?? commonDir(files);
    if (dir === null) continue;
    dirOf.set(target, dir);
    const held = byName.get(target.name);
    if (held === undefined) byName.set(target.name, [target]);
    else held.push(target);
  }

  const built = { targetOf, dirOf, byName };
  SWIFT_INDEX.set(ctx, built);
  return built;
}

/** The deepest directory every one of the paths sits under, or null. */
function commonDir(paths: readonly string[]): string | null {
  let common: string[] | null = null;
  for (const path of paths) {
    const cut = path.lastIndexOf('/');
    const parts = cut === -1 ? [] : path.slice(0, cut).split('/');
    if (common === null) {
      common = parts;
      continue;
    }
    let same = 0;
    while (same < common.length && same < parts.length && common[same] === parts[same]) {
      same += 1;
    }
    common.length = same;
  }
  if (common === null || common.length === 0) return null;
  return common.join('/');
}
