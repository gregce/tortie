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
  /** True when an Android plugin id is declared, which admits `android.*`. */
  android: boolean;
  /** True when any Gradle file was found at all. */
  present: boolean;
}

export function emptyKotlinManifest(): KotlinManifest {
  return { groups: new Set(), artifacts: new Set(), android: false, present: false };
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
      name.endsWith('.versions.toml')
  );
  for (const relPath of files) {
    const text = readTextOrNull(`${repoPath}/${relPath}`);
    if (text === null) continue;
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
}
