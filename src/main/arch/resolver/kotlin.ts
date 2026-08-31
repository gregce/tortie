/**
 * The Kotlin arm (Phase 180).
 *
 * WHAT IT CLAIMS, AND THE CONVENTION IT LEANS ON. A Kotlin import names a
 * dotted package path, and the compiler DOES NOT require packages to mirror
 * directories; it is a convention almost every repository follows and this arm
 * resolves by it, which is the stated limit. `import com.app.ui.Panel` is
 * looked up as the path `com/app/ui/Panel.kt` at the end of some tracked
 * path, and when the last segment is a member rather than a file, as the
 * directory `com/app/ui`. A repository that breaks the convention resolves
 * nothing first party and its imports answer `unresolved`, never a guess.
 *
 * A MATCH MUST BE UNIQUE, WITH ONE STATED TIE BREAK. The same package exists
 * under `src/main` and `src/test` in almost every Gradle project, because the
 * language merges source roots into one package, so a name whose only
 * ambiguity is main against test resolves to the one candidate that is not
 * under a test root, which is the direction every build depends in. Any
 * ambiguity beyond that is `unresolved` rather than a coin flip, because a
 * real edge to the wrong file is worse than a grey answer. Gradle's own
 * `*.gradle.kts` build scripts are Kotlin files with no package at all, so
 * they are left out of the convention index entirely; without that, a
 * repository directory literally named `android/app` (they all have one)
 * would shadow the platform's `android.app` and grey out every one of its
 * imports.
 *
 * THE TWO WORLDS RULE. When a specifier resolves by the convention AND is
 * claimed by the platform or by a declared dependency, the answer is
 * `unresolved`. The convention is a suffix match, so a repository directory
 * `src/main/kotlin/math/` would otherwise capture `import kotlin.math.abs`
 * and invent an edge the code does not contain. Grey is the safe half.
 *
 * WHAT ADMITS `external`, and each is a literal a manifest wrote:
 *  1. A declared Maven GROUP that is a dotted prefix of the import
 *     (`androidx.compose` admits `androidx.compose.foundation.layout`).
 *  2. A declared ARTIFACT name, hyphens read as dots, sharing at least its
 *     first two dotted segments with the import (`kotlinx-coroutines-android`
 *     admits `kotlinx.coroutines.flow`), because Maven groups and Kotlin
 *     packages famously differ and the artifact is usually the package.
 *  3. A group's LAST segment equal to the import's first or second segment
 *     (`com.squareup.okhttp3` admits `okhttp3.OkHttpClient`, `junit` admits
 *     `org.junit.Test`).
 *  4. The platform: `kotlin.*`, `java.*`, `javax.*` always, and `android.*`
 *     when an Android plugin is declared.
 * A name none of these admit is `unresolved`. THE LIMIT OF RULE 2 AND 3: they
 * are textual conventions, not facts, so a coordinate whose package shares no
 * text with it (org.json inside `org.json:json`… admitted by rule 3;
 * `com.google.code.gson` naming package `com.google.gson` is NOT admitted)
 * stays grey rather than guessed.
 *
 * NOTHING HERE SPAWNS ANYTHING. Set membership against the caller's file
 * list plus the names ./gradle.ts read. No specifier reaches an argv.
 */

import { external, firstParty, unresolved, type ArchResolution } from './answers';
import type { ArchResolveContext } from './index';

/** The characters a Kotlin import path may be written with. */
const PLAIN_IMPORT = /^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*)*$/;

/** Platform packages the language and the JVM always provide. */
const KOTLIN_PLATFORM = ['kotlin', 'java', 'javax'];

/** Per context suffix indexes, built once per scan. */
const KOTLIN_INDEX = new WeakMap<
  ArchResolveContext,
  { files: Map<string, string[]>; dirs: Map<string, string[]> }
>();

/** Resolve one Kotlin import. */
export function resolveKotlin(
  specifier: string,
  ctx: ArchResolveContext
): ArchResolution {
  const spec = specifier.trim();
  if (spec.length === 0 || !PLAIN_IMPORT.test(spec)) return unresolved();
  const segments = spec.split('.');
  const conventional = byConvention(segments, ctx);
  if (conventional.kind === 'unique') {
    // The two worlds rule from the header: both claim it, nobody wins.
    if (claimedExternally(spec, segments, ctx)) return unresolved();
    return firstParty(conventional.path);
  }
  if (conventional.kind === 'ambiguous') {
    // More than one tracked file could be this import. Calling it external
    // would hide a real first party edge, and picking one would invent one.
    return unresolved();
  }
  if (claimedExternally(spec, segments, ctx)) return external();
  return unresolved();
}

/** What the convention found: one path, several, or nothing. */
type ConventionHit =
  | { kind: 'unique'; path: string }
  | { kind: 'ambiguous' }
  | { kind: 'none' };

/**
 * The package to directory convention: the whole path as a file, the whole
 * path as a directory, then each with the trailing member name dropped. The
 * first hit stops the walk, and only a UNIQUE hit resolves; an ambiguous one
 * is reported as such so the caller stays grey rather than guessing or
 * calling a visible file a dependency.
 */
function byConvention(
  segments: readonly string[],
  ctx: ArchResolveContext
): ConventionHit {
  const index = kotlinIndex(ctx);
  for (const take of [segments.length, segments.length - 1]) {
    if (take < 1) break;
    const path = segments.slice(0, take).join('/');
    const files = index.files.get(`${path}.kt`) ?? index.files.get(`${path}.kts`);
    if (files !== undefined) return pickOne(files);
    const dirs = index.dirs.get(path);
    if (dirs !== undefined) return pickOne(dirs);
  }
  return { kind: 'none' };
}

/** Unique, or main against test with main winning, or honestly ambiguous. */
function pickOne(candidates: readonly string[]): ConventionHit {
  if (candidates.length === 1) {
    const only = candidates[0];
    return only === undefined ? { kind: 'none' } : { kind: 'unique', path: only };
  }
  const main = candidates.filter((path) => !underTestRoot(path));
  const one = main.length === 1 ? main[0] : undefined;
  return one === undefined ? { kind: 'ambiguous' } : { kind: 'unique', path: one };
}

/** The source set names Gradle and Kotlin multiplatform use for tests. */
const TEST_ROOTS: ReadonlySet<string> = new Set([
  'test', 'androidTest', 'commonTest', 'jvmTest', 'iosTest',
  'integrationTest', 'testFixtures'
]);

function underTestRoot(path: string): boolean {
  return path.split('/').some((segment) => TEST_ROOTS.has(segment));
}

/** Did a manifest, or the platform, claim this name? */
function claimedExternally(
  spec: string,
  segments: readonly string[],
  ctx: ArchResolveContext
): boolean {
  const head = segments[0] ?? '';
  if (KOTLIN_PLATFORM.includes(head)) return true;
  const kotlin = ctx.manifests.kotlin;
  if (head === 'android' && kotlin.android) return true;
  for (const group of kotlin.groups) {
    // Rule 1: the group as a dotted prefix.
    if (spec === group || spec.startsWith(`${group}.`)) return true;
    // Rule 3: the group's last segment at the import's head.
    const last = group.slice(group.lastIndexOf('.') + 1);
    if (last.length >= 3 && (last === segments[0] || last === segments[1])) {
      return true;
    }
  }
  for (const artifact of kotlin.artifacts) {
    // Rule 2: at least two shared dotted segments with the artifact's name.
    const parts = artifact.split('-');
    if (parts.length < 2) continue;
    if (segments[0] === parts[0] && segments[1] === parts[1]) return true;
  }
  return false;
}

/**
 * Every tracked `.kt` and `.kts` path and every directory holding one, keyed
 * by every suffix it can be reached by, with the paths that share the suffix
 * kept so uniqueness is checkable.
 */
function kotlinIndex(ctx: ArchResolveContext): {
  files: Map<string, string[]>;
  dirs: Map<string, string[]>;
} {
  const cached = KOTLIN_INDEX.get(ctx);
  if (cached !== undefined) return cached;
  const files = new Map<string, string[]>();
  const dirs = new Map<string, string[]>();
  const add = (map: Map<string, string[]>, key: string, path: string): void => {
    const held = map.get(key);
    if (held === undefined) map.set(key, [path]);
    else if (!held.includes(path)) held.push(path);
  };
  const suffixes = (path: string, into: (suffix: string) => void): void => {
    into(path);
    let cut = path.indexOf('/');
    while (cut !== -1) {
      into(path.slice(cut + 1));
      cut = path.indexOf('/', cut + 1);
    }
  };
  for (const path of ctx.files) {
    if (!path.endsWith('.kt') && !path.endsWith('.kts')) continue;
    // A Gradle build script is Kotlin with no package; see the header.
    if (path.endsWith('.gradle.kts')) continue;
    suffixes(path, (suffix) => add(files, suffix, path));
    const slash = path.lastIndexOf('/');
    if (slash === -1) continue;
    const dir = path.slice(0, slash);
    suffixes(dir, (suffix) => add(dirs, suffix, dir));
  }
  const built = { files, dirs };
  KOTLIN_INDEX.set(ctx, built);
  return built;
}
