/**
 * What the repository's Maven files literally declare, for the Java arm
 * (Phase 184).
 *
 * WHY IT IS A SECOND READER AND NOT A LINE ADDED TO ./gradle.ts. The Gradle
 * reader is the Kotlin arm's, and teaching it Maven would change what the
 * Kotlin arm answers for a project that carries a `pom.xml`, which is a
 * change to a shipped arm this phase refuses to make. So the Maven
 * coordinates are read here and JOINED onto the Gradle ones for the Java arm
 * alone; ./gradle.ts is untouched and Kotlin's answers do not move.
 *
 * WHAT IT READS, AND ALL OF IT AS TEXT. Every `pom.xml` the bounded walk
 * finds, and inside each one only the `<groupId>` and `<artifactId>` text of a
 * `<dependency>` element.
 *
 * THE `<dependency>` FENCE IS THE WHOLE CORRECTNESS OF THIS READER, and the
 * first build of it did not have one. A pom's TOP LEVEL `<groupId>` names the
 * project ITSELF, so reading every element in the file made a repository's own
 * group a declared dependency, and the Java arm's two worlds rule then greyed
 * out every one of that repository's own imports: `com.x.app.net.Client`
 * resolved to its real file and was thrown away because `com.x` looked like a
 * coordinate somebody depended on. `<parent>`, `<plugin>` and `<module>` are
 * outside the fence for the same reason.
 *
 * A pom is XML rather than a program, so nothing here is guessing at a value
 * some code would have computed; what it does refuse is a coordinate written
 * as a property reference such as `${project.groupId}`, because that names a
 * value declared somewhere else and this reader resolves no properties. A
 * dependency only a property could explain is simply not seen, and an import
 * only that dependency could explain answers `unresolved`, which is the grey
 * side and the safe one.
 *
 * NOTHING HERE SPAWNS ANYTHING. No mvn, no javac, no JVM. Values read here
 * are compared against import specifiers and reach no argv.
 */

import type { KotlinManifest } from './gradle';
import { readTextOrNull } from './paths';
import { walkForFiles } from './tree-walk';

/**
 * The JVM coordinates the Java arm compares against, being Gradle's and
 * Maven's joined. It is the same shape `KotlinManifest` carries, on purpose:
 * one arm reads one set of names, whichever build tool wrote them down.
 */
export interface JavaManifest {
  /** Declared Maven group ids, exactly as written. */
  groups: Set<string>;
  /** Declared artifact names, hyphens as written. */
  artifacts: Set<string>;
  /** True when a Gradle Android plugin is declared, which admits `android.*`. */
  android: boolean;
  /** True when any Gradle or Maven file was found at all. */
  present: boolean;
}

export function emptyJavaManifest(): JavaManifest {
  return { groups: new Set(), artifacts: new Set(), android: false, present: false };
}

/**
 * One `<dependency>` element's body. Non greedy so nested elements end at the
 * first close, which is the shape a pom always writes: a dependency holds no
 * dependency.
 */
const DEPENDENCY_BLOCK = /<dependency\b[^>]*>([\s\S]*?)<\/dependency>/g;

/** `<groupId>com.example</groupId>`, the literal element text only. */
const GROUP_ELEMENT = /<groupId>\s*([^<${}\s][^<]*?)\s*<\/groupId>/g;

/** `<artifactId>thing</artifactId>`, the literal element text only. */
const ARTIFACT_ELEMENT = /<artifactId>\s*([^<${}\s][^<]*?)\s*<\/artifactId>/g;

/** A dotted name is a plausible group; anything with a space is not one. */
const PLAUSIBLE_GROUP = /^[A-Za-z0-9_\-]+(\.[A-Za-z0-9_\-]+)*$/;

/** A plausible artifact name, which is the same alphabet without the dots. */
const PLAUSIBLE_ARTIFACT = /^[A-Za-z0-9_.\-]+$/;

/**
 * Read the JVM declarations one repository makes, from BOTH build tools.
 *
 * The Gradle half is handed in rather than read again, because ./manifest.ts
 * already reads it once for the Kotlin arm and reading the same files twice
 * per scan is the duplication the growth guardrail asks to be scanned for.
 */
export function readJavaManifest(
  repoPath: string,
  gradle: KotlinManifest
): JavaManifest {
  const out: JavaManifest = {
    groups: new Set(gradle.groups),
    artifacts: new Set(gradle.artifacts),
    android: gradle.android,
    present: gradle.present
  };
  const files = walkForFiles(repoPath, (name) => name === 'pom.xml');
  for (const relPath of files) {
    const text = readTextOrNull(`${repoPath}/${relPath}`);
    if (text === null) continue;
    out.present = true;
    for (const block of text.matchAll(DEPENDENCY_BLOCK)) {
      const body = block[1] ?? '';
      for (const match of body.matchAll(GROUP_ELEMENT)) {
        const value = match[1] ?? '';
        if (PLAUSIBLE_GROUP.test(value)) out.groups.add(value);
      }
      for (const match of body.matchAll(ARTIFACT_ELEMENT)) {
        const value = match[1] ?? '';
        if (PLAUSIBLE_ARTIFACT.test(value)) out.artifacts.add(value);
      }
    }
  }
  return out;
}
