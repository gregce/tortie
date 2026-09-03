/**
 * What the repository's Gradle files literally declare, for the Kotlin arm
 * (Phase 180).
 *
 * WHAT IT READS, AND EVERY ONE OF THEM AS TEXT. Every `build.gradle`,
 * `build.gradle.kts`, `settings.gradle` and `settings.gradle.kts` the bounded
 * walk finds, plus every `libs.versions.toml` version catalog. A Gradle build
 * file is a PROGRAM and this build will never run it, so the reader takes only
 * what is written as a literal: a quoted `"group:artifact"` coordinate, a
 * catalog row's `group`, `name` or `module` value, and a plugin id. A
 * dependency assembled at configuration time by code is simply not seen, and
 * an import only such a dependency could explain answers `unresolved`, which
 * is the grey side and the safe one.
 *
 * WHAT PHASE 184'S SECOND FIX ROUND ADDED, AND IT IS THE MAVEN READER'S SHAPE.
 * A build file also says what the project IS, and until this round that half
 * was never read. `group = "com.squareup.moshi"` at the root of moshi's
 * `build.gradle.kts` and `GROUP=com.squareup.okio` in okio's
 * `gradle.properties` are the two spellings the JVM world actually uses, and a
 * repository that publishes under a name usually also NAMES that coordinate
 * somewhere in its own build, moshi's japicmp baseline `com.squareup.moshi:moshi`
 * being the case that was measured. The coordinate then read as somebody
 * else's, and 137 of moshi's own `com.squareup.moshi.*` imports came back
 * `external`, which is a false green on any must-not they cross. So the
 * identity is read into `ownGroups` for ./maven.ts to join and the Java arm to
 * refuse, exactly as a pom's own `<groupId>` already is.
 *
 * ONLY A LITERAL COUNTS, and retrofit is why the sentence is here rather than
 * implied: its `build.gradle` writes `group = JavaBasePlugin.DOCUMENTATION_GROUP`,
 * which is a value Gradle would compute and this reader would have to invent.
 * A quoted string is taken, a `gradle.properties` row is taken because a
 * properties file is data rather than a program, and everything else is not
 * seen.
 *
 * THE KOTLIN ARM DOES NOT READ THIS FIELD AND ITS ANSWERS DO NOT MOVE. Only
 * ./java.ts asks, through ./maven.ts, because Phase 184 changes no arm that
 * shipped before it.
 *
 * NOTHING HERE SPAWNS ANYTHING. No gradle, no daemon, no JVM. Values read
 * here are compared against import specifiers and reach no argv.
 */

import { readTextOrNull } from './paths';
import { stripTomlComment } from './toml';
import { walkForFiles } from './tree-walk';

/** What the Gradle files said, already reduced to what the arm compares. */
export interface KotlinManifest {
  /** Declared Maven group ids, exactly as written. */
  groups: Set<string>;
  /** Declared artifact names, hyphens as written. */
  artifacts: Set<string>;
  /**
   * The group ids the repository declares for ITSELF, being a `group`
   * assignment written as a literal and a `GROUP` or `group` row of a
   * `gradle.properties`.
   *
   * ./maven.ts joins this onto the Java arm's own set and the Java arm refuses
   * to let a name under one of them be claimed. The Kotlin arm never reads it.
   */
  ownGroups: Set<string>;
  /** True when an Android plugin id is declared, which admits `android.*`. */
  android: boolean;
  /** True when any Gradle file was found at all. */
  present: boolean;
}

export function emptyKotlinManifest(): KotlinManifest {
  return {
    groups: new Set(),
    artifacts: new Set(),
    ownGroups: new Set(),
    android: false,
    present: false
  };
}

/** A quoted Maven coordinate: group, artifact, optionally more. */
const COORDINATE = /["']([A-Za-z0-9_.\-]+):([A-Za-z0-9_.\-]+)(?::[^"']*)?["']/g;

/** A dotted name is a plausible group; a bare word could be anything. */
const PLAUSIBLE_GROUP = /^[A-Za-z0-9_\-]+(\.[A-Za-z0-9_\-]+)*$/;

/** Read the Gradle declarations out of one repository. */
export function readKotlinManifest(repoPath: string): KotlinManifest {
  const out = emptyKotlinManifest();
  const files = walkForFiles(
    repoPath,
    (name) =>
      name === 'build.gradle' ||
      name === 'build.gradle.kts' ||
      name === 'settings.gradle' ||
      name === 'settings.gradle.kts' ||
      name === 'gradle.properties' ||
      name.endsWith('.versions.toml')
  );
  for (const relPath of files) {
    const text = readTextOrNull(`${repoPath}/${relPath}`);
    if (text === null) continue;
    // A `gradle.properties` is not a build file, so it does not make this
    // manifest PRESENT on its own; it carries the identity and nothing else.
    if (relPath.endsWith('gradle.properties')) {
      readProperties(text, out);
      continue;
    }
    out.present = true;
    if (relPath.endsWith('.toml')) readCatalog(text, out);
    else readGradleText(text, out);
  }
  return out;
}

/**
 * One version catalog. The `[libraries]` rows carry `group` and `name`, or a
 * combined `module = "group:name"`, and `[plugins]` rows carry `id`.
 */
function readCatalog(text: string, out: KotlinManifest): void {
  for (const raw of text.split('\n')) {
    const line = stripTomlComment(raw);
    const group = /\bgroup\s*=\s*"([^"]+)"/.exec(line);
    const name = /\bname\s*=\s*"([^"]+)"/.exec(line);
    const module = /\bmodule\s*=\s*"([^"]+):([^"]+)"/.exec(line);
    const id = /\bid\s*=\s*"([^"]+)"/.exec(line);
    if (group !== null && PLAUSIBLE_GROUP.test(group[1] ?? '')) {
      out.groups.add(group[1] ?? '');
    }
    if (name !== null) out.artifacts.add(name[1] ?? '');
    if (module !== null) {
      if (PLAUSIBLE_GROUP.test(module[1] ?? '')) out.groups.add(module[1] ?? '');
      out.artifacts.add(module[2] ?? '');
    }
    if (id !== null && (id[1] ?? '').startsWith('com.android.')) {
      out.android = true;
    }
  }
}

/**
 * One Gradle build or settings file, read for its literal coordinates and
 * plugin ids only. Comments are not stripped: a coordinate in a comment adds a
 * name to a comparison set and can admit nothing that runs, and Gradle files
 * nest quotes inside code in ways a line stripper would misread.
 */
function readGradleText(text: string, out: KotlinManifest): void {
  for (const match of text.matchAll(COORDINATE)) {
    out.groups.add(match[1] ?? '');
    out.artifacts.add(match[2] ?? '');
  }
  if (/["']com\.android\.[A-Za-z0-9_.\-]*["']/.test(text)) out.android = true;
  for (const match of text.matchAll(OWN_GROUP)) {
    const value = match[1] ?? match[2] ?? '';
    if (PLAUSIBLE_GROUP.test(value)) out.ownGroups.add(value);
  }
}

/**
 * `group = "com.example"` in a Kotlin build script and `group 'com.example'` in
 * a Groovy one, the two spellings of the project's own identity. Anchored to
 * the start of a line so a `group` named inside some other call is not read,
 * and a value that is not a quoted string is not matched at all. See the
 * literal paragraph on this face.
 */
const OWN_GROUP =
  /^[ \t]*group[ \t]*(?:=[ \t]*["']([^"']+)["']|["']([^"']+)["'])/gm;

/**
 * `GROUP=com.example` or `group=com.example` in a `gradle.properties`, which is
 * the spelling square's publish plugin uses and okio and retrofit both carry.
 * A properties file is data rather than a program, so the value is the value.
 */
const PROPERTY_GROUP = /^[ \t]*(?:GROUP|group)[ \t]*=[ \t]*([^\s#]+)[ \t]*$/gm;

/** One `gradle.properties`, read for the project's own coordinate only. */
function readProperties(text: string, out: KotlinManifest): void {
  for (const match of text.matchAll(PROPERTY_GROUP)) {
    const value = match[1] ?? '';
    if (PLAUSIBLE_GROUP.test(value)) out.ownGroups.add(value);
  }
}
