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
 * AND THE VALUE THE FENCE KEEPS OUT IS WORTH KEEPING, WHICH IS THE PHASE 184
 * FIX ROUND. The fence stops the project's own identity being read as a
 * DEPENDENCY. It does not stop some real dependency sharing that identity, and
 * a Maven project's own group is usually the group of the sibling libraries it
 * depends on: apache/commons-lang is `org.apache.commons` and it declares
 * `org.apache.commons:commons-text`, so the two worlds rule greyed out all 756
 * of its own `org.apache.commons.lang3.*` imports and the repository resolved
 * 0 of its 4,275 imports first party. Grey is safe and no promise was
 * falsified, which is why this was a coverage defect and not a correctness
 * one, but a repository reading as though it contained no code of its own is
 * not an answer. So the identity is READ, into `ownGroups`, and the Java arm
 * refuses to let a group in that set claim a name. It is one set of values
 * this reader keeps rather than discards, and nothing about the fence moves.
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
  /**
   * The group ids the repository's own poms declare for THEMSELVES, being a
   * top level `<groupId>` and a `<parent>`'s, exactly as written.
   *
   * A group here can never admit `external` on its own, whichever dependency
   * also carries it. See the identity paragraph on this face.
   */
  ownGroups: Set<string>;
  /** Declared artifact names, hyphens as written. */
  artifacts: Set<string>;
  /** True when a Gradle Android plugin is declared, which admits `android.*`. */
  android: boolean;
  /** True when any Gradle or Maven file was found at all. */
  present: boolean;
}

export function emptyJavaManifest(): JavaManifest {
  return {
    groups: new Set(),
    ownGroups: new Set(),
    artifacts: new Set(),
    android: false,
    present: false
  };
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
 * The blocks whose `<groupId>` names SOMEBODY ELSE, removed before the pom's
 * own identity is read out of what is left.
 *
 * `<dependency>` first and `<plugin>` second, so a plugin carrying its own
 * dependency list has that list taken out from under it before the plugin
 * itself goes. Each pattern is non greedy, which is the shape a pom always
 * writes: a dependency holds no dependency.
 */
const FOREIGN_BLOCKS = [
  /<dependency\b[^>]*>[\s\S]*?<\/dependency>/g,
  /<plugin\b[^>]*>[\s\S]*?<\/plugin>/g,
  /<extension\b[^>]*>[\s\S]*?<\/extension>/g
];

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
    ownGroups: new Set(),
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
    // WHAT IS LEFT WHEN EVERY BLOCK THAT NAMES SOMEBODY ELSE IS GONE is the
    // project's own identity, being its `<groupId>` and its `<parent>`'s. See
    // the identity paragraph on this face.
    let own = text;
    for (const block of FOREIGN_BLOCKS) own = own.replace(block, ' ');
    for (const match of own.matchAll(GROUP_ELEMENT)) {
      const value = match[1] ?? '';
      if (PLAUSIBLE_GROUP.test(value)) out.ownGroups.add(value);
    }
  }
  return out;
}
