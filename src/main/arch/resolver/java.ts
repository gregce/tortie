/**
 * The Java arm (Phase 184), and it resolves at FILE grain.
 *
 * WHAT IT CLAIMS. A Java import names a TYPE, a type lives in a file of its
 * own name, and the package a file declares must match the directory it sits
 * in for the compiler to find it at all. So `import com.app.net.Client` is
 * looked up as the path `com/app/net/Client.java` at the end of some tracked
 * path, and `import com.app.net.Client.Nested` and
 * `import static com.app.net.Client.of` reach the same file by dropping the
 * trailing member names. Measured over gson and retrofit on 2026-09-03: 567
 * of 567 `.java` files put their package where their directory spells it, and
 * the file only index agreed with an index built from every file's real
 * `package` declaration on 5,625 of 5,625 imports.
 *
 * THE ONE THING IT DOES NOT COPY FROM THE KOTLIN ARM, AND THIS IS THE FINDING
 * RESEARCH 78 SECTION 3.3 EXISTS FOR. Kotlin's convention index falls back to
 * a DIRECTORY when the last segment is a member rather than a file. Run over
 * the two Java repositories that fallback invents 31 first party edges the
 * truth index does not have, and they are wrong edges rather than extra ones:
 * `import scala.concurrent.Future` lands on
 * `retrofit-adapters/scala/src/main/java/retrofit2/adapter/scala` because the
 * repository holds a directory literally named `scala`. So this arm indexes
 * FILES ONLY. It is the two worlds hazard the Kotlin arm's header describes
 * with `android/app` shadowing `android.app`, firing on a real corpus.
 *
 * THE LIMIT ON ITS FACE: A WILDCARD IMPORT RESOLVES NOTHING. `import a.b.*;`
 * names a PACKAGE, which is a directory, and answering it would drag this arm
 * back into the hazard above for a form that appears 0 times in those 5,625
 * imports. The grammar hands the path over without its star, so a wildcard
 * simply finds no file and answers `unresolved`, which is grey and correct.
 *
 * A MATCH MUST BE UNIQUE, WITH ONE STATED TIE BREAK, and it is the Kotlin
 * arm's: the same package exists under `src/main` and `src/test` in almost
 * every JVM project, so a name whose only ambiguity is main against test
 * resolves to the one candidate that is not under a test root. Any ambiguity
 * beyond that is `unresolved` rather than a coin flip.
 *
 * THE TWO WORLDS RULE, unchanged from Kotlin. When a specifier resolves by the
 * convention AND is claimed by the platform or by a declared coordinate, the
 * answer is `unresolved`.
 *
 * WHAT ADMITS `external`: the Kotlin arm's four coordinate rules, read off
 * Gradle AND Maven through ./maven.ts, plus the JVM platform heads. THE LIMIT
 * OF THE COORDINATE RULES IS MEASURED AND IT IS MOST OF THE GREY: Guava is
 * declared `com.google.guava:guava` and its package is `com.google.common`, so
 * 182 of gson's 212 unresolved imports are that one coordinate, and Truth
 * (`com.google.truth:truth`, package `com.google.common.truth`) is 101 of
 * retrofit's 326. A coordinate whose package shares no text with it stays grey
 * rather than guessed.
 *
 * THE COORDINATE A REPOSITORY DECLARES FOR ITSELF CLAIMS NOTHING, WHICH IS THE
 * PHASE 184 FIX ROUND AND THE SECOND LIMIT WORTH READING HERE. A Maven
 * project's own group is usually the group of the sibling libraries it depends
 * on, and the two worlds rule above then greys out the repository's ENTIRE own
 * package: apache/commons-lang declares `org.apache.commons:commons-text`, its
 * own group is `org.apache.commons`, and it resolved 0 of its 4,275 imports
 * first party with all 756 of its own `org.apache.commons.lang3.*` imports
 * answering unresolved. So a group that appears in ./maven.ts's `ownGroups`,
 * being a pom's own `<groupId>` or its `<parent>`'s, is skipped by rules 1 and
 * 3. `org.apache.commons.text.*` then answers `unresolved` rather than
 * `external`, which is the grey side and the safe one.
 *
 * WHAT THAT FIX DOES NOT REACH, AND IT IS ON THIS FACE BECAUSE IT IS REAL. It
 * reads Maven's declaration of identity and NOT Gradle's, which lives in a
 * `group` assignment or a `GROUP` property this resolver does not read. And it
 * cannot help a JVM repository whose own types are written in another
 * language: square/okio's 87 grey `okio.*` imports are grey because this index
 * holds `.java` files and `okio.Buffer` is declared in `Buffer.kt`, which is
 * the cross language limit and not this one.
 *
 * NOTHING HERE SPAWNS ANYTHING. Set membership against the caller's file list
 * plus the names ./gradle.ts and ./maven.ts read. No specifier reaches an argv.
 */

import { external, firstParty, unresolved, type ArchResolution } from './answers';
import type { ArchResolveContext } from './index';

/** The characters a Java import path may be written with. */
const PLAIN_IMPORT = /^[A-Za-z_$][A-Za-z0-9_$]*(\.[A-Za-z_$][A-Za-z0-9_$]*)*$/;

/**
 * Packages the JVM itself always provides, so no manifest can declare them
 * and no repository can hold them. Checked AFTER the repository's own files
 * have had their chance at the name, which is the rule ./answers.ts states.
 */
const JVM_PLATFORM = [
  'java', 'javax', 'jdk', 'sun', 'org.w3c', 'org.xml', 'org.ietf'
];

/** How many trailing member names an import may carry before the type name. */
const MAX_MEMBER_DEPTH = 2;

/** Per context suffix index over `.java` files, built once per scan. */
const JAVA_INDEX = new WeakMap<ArchResolveContext, Map<string, string[]>>();

/** Resolve one Java import. */
export function resolveJava(
  specifier: string,
  ctx: ArchResolveContext
): ArchResolution {
  const spec = specifier.trim();
  if (spec.length === 0 || !PLAIN_IMPORT.test(spec)) return unresolved();
  const segments = spec.split('.');
  const hit = byConvention(segments, ctx);
  if (hit.kind === 'unique') {
    // The two worlds rule: both claim it, nobody wins.
    if (claimedExternally(spec, segments, ctx)) return unresolved();
    return firstParty(hit.path);
  }
  // More than one tracked file could be this import. Calling it external would
  // hide a real first party edge, and picking one would invent one.
  if (hit.kind === 'ambiguous') return unresolved();
  if (claimedExternally(spec, segments, ctx)) return external();
  return unresolved();
}

/** What the convention found: one file, several, or nothing. */
type ConventionHit =
  | { kind: 'unique'; path: string }
  | { kind: 'ambiguous' }
  | { kind: 'none' };

/**
 * The package to directory convention, FILES ONLY. The whole dotted path as a
 * `.java` file, then the same with the trailing member names dropped, which is
 * how `Outer.Inner` and a `static` member import reach their file. The first
 * hit stops the walk and only a UNIQUE hit resolves.
 */
function byConvention(
  segments: readonly string[],
  ctx: ArchResolveContext
): ConventionHit {
  const index = javaIndex(ctx);
  const floor = Math.max(1, segments.length - MAX_MEMBER_DEPTH);
  for (let take = segments.length; take >= floor; take -= 1) {
    const path = `${segments.slice(0, take).join('/')}.java`;
    const files = index.get(path);
    if (files !== undefined) return pickOne(files);
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

/** The source set names Gradle and Maven use for tests. */
const TEST_ROOTS: ReadonlySet<string> = new Set([
  'test', 'tests', 'androidTest', 'integrationTest', 'testFixtures'
]);

function underTestRoot(path: string): boolean {
  return path.split('/').some((segment) => TEST_ROOTS.has(segment));
}

/** Did a build file, or the platform, claim this name? */
function claimedExternally(
  spec: string,
  segments: readonly string[],
  ctx: ArchResolveContext
): boolean {
  const head = segments[0] ?? '';
  const two = segments.length >= 2 ? `${head}.${segments[1] ?? ''}` : head;
  for (const platform of JVM_PLATFORM) {
    if (head === platform || two === platform) return true;
  }
  const java = ctx.manifests.java;
  if (head === 'android' && java.android) return true;
  for (const group of java.groups) {
    // A GROUP THE REPOSITORY DECLARES FOR ITSELF CLAIMS NOTHING, however many
    // dependencies also carry it. See the Phase 184 fix round on this face and
    // the identity paragraph in ./maven.ts.
    if (java.ownGroups.has(group)) continue;
    // Rule 1: the group as a dotted prefix.
    if (spec === group || spec.startsWith(`${group}.`)) return true;
    // Rule 3: the group's last segment at the import's head.
    const last = group.slice(group.lastIndexOf('.') + 1);
    if (last.length >= 3 && (last === segments[0] || last === segments[1])) {
      return true;
    }
  }
  for (const artifact of java.artifacts) {
    // Rule 2: at least two shared dotted segments with the artifact's name.
    const parts = artifact.split('-');
    if (parts.length < 2) continue;
    if (segments[0] === parts[0] && segments[1] === parts[1]) return true;
  }
  return false;
}

/**
 * Every tracked `.java` path keyed by every one of its slash suffixes, with
 * the paths that share a suffix kept so uniqueness is checkable.
 *
 * NO DIRECTORY MAP. See the header: the directory half is what invents wrong
 * edges in Java, and leaving it out is the whole difference between this index
 * and the Kotlin arm's.
 */
function javaIndex(ctx: ArchResolveContext): Map<string, string[]> {
  const cached = JAVA_INDEX.get(ctx);
  if (cached !== undefined) return cached;
  const index = new Map<string, string[]>();
  const add = (key: string, path: string): void => {
    const held = index.get(key);
    if (held === undefined) index.set(key, [path]);
    else if (!held.includes(path)) held.push(path);
  };
  for (const path of ctx.files) {
    if (!path.endsWith('.java')) continue;
    add(path, path);
    let cut = path.indexOf('/');
    while (cut !== -1) {
      add(path.slice(cut + 1), path);
      cut = path.indexOf('/', cut + 1);
    }
  }
  JAVA_INDEX.set(ctx, index);
  return index;
}
