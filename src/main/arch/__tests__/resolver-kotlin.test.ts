/**
 * The Kotlin arm, over real Gradle files on disk (Phase 180).
 *
 * The convention under test is the one the arm states: packages mirror
 * directories, a match must be unique, and a name both the repository and the
 * outside world claim is grey. The manifest cases each pin one of the four
 * admission rules the arm's header numbers, and the last block is the false
 * green control: names nobody declared stay unresolved, never external.
 */

import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { archResolveContext, resolveImport } from '../resolver';
import { readArchManifests } from '../resolver/manifest';

let root: string;

const FILES = [
  'gradle/libs.versions.toml',
  'app/build.gradle.kts',
  'app/src/main/java/com/x/app/Main.kt',
  'app/src/main/java/com/x/app/ui/Panel.kt',
  'app/src/main/java/com/x/app/Dup.kt',
  'app/src/test/java/com/x/app/Dup.kt',
  'app/src/main/java/com/x/app/Amb.kt',
  'feature/src/main/java/com/x/app/Amb.kt',
  'lib/src/main/kotlin/math/Vec.kt'
];

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'gmux-arch-kotlin-'));
  mkdirSync(join(root, 'gradle'), { recursive: true });
  mkdirSync(join(root, 'app'), { recursive: true });
  writeFileSync(
    join(root, 'gradle', 'libs.versions.toml'),
    [
      '[libraries]',
      'androidx-core-ktx = { group = "androidx.core", name = "core-ktx", version.ref = "coreKtx" }',
      'kotlinx-coroutines = { group = "org.jetbrains.kotlinx", name = "kotlinx-coroutines-android", version.ref = "c" }',
      'moshi = { module = "com.squareup.moshi:moshi", version.ref = "m" }',
      '',
      '[plugins]',
      'android-application = { id = "com.android.application", version.ref = "agp" }'
    ].join('\n')
  );
  writeFileSync(
    join(root, 'app', 'build.gradle.kts'),
    [
      'dependencies {',
      '    implementation("com.squareup.okhttp3:okhttp:4.12.0")',
      '    testImplementation("junit:junit:4.13.2")',
      '}'
    ].join('\n')
  );
});

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

function ctx(): ReturnType<typeof archResolveContext> {
  return archResolveContext(readArchManifests(root), FILES);
}

describe('the Kotlin manifest reader', () => {
  it('reads groups, artifacts and the android plugin out of the files', () => {
    const kotlin = readArchManifests(root).kotlin;
    expect(kotlin.present).toBe(true);
    expect(kotlin.groups.has('androidx.core')).toBe(true);
    expect(kotlin.groups.has('org.jetbrains.kotlinx')).toBe(true);
    expect(kotlin.groups.has('com.squareup.moshi')).toBe(true);
    expect(kotlin.groups.has('com.squareup.okhttp3')).toBe(true);
    expect(kotlin.groups.has('junit')).toBe(true);
    expect(kotlin.artifacts.has('kotlinx-coroutines-android')).toBe(true);
    expect(kotlin.android).toBe(true);
  });
});

describe('the Kotlin arm', () => {
  it('resolves a class import to its file by the package convention', () => {
    expect(
      resolveImport('com.x.app.ui.Panel', 'app/src/main/java/com/x/app/Main.kt', 'kotlin', ctx())
    ).toEqual({
      toPath: 'app/src/main/java/com/x/app/ui/Panel.kt',
      resolution: 'first-party'
    });
  });

  it('resolves a package import to its directory', () => {
    expect(
      resolveImport('com.x.app.ui', 'app/src/main/java/com/x/app/Main.kt', 'kotlin', ctx())
    ).toEqual({
      toPath: 'app/src/main/java/com/x/app/ui',
      resolution: 'first-party'
    });
  });

  it('resolves a member import through its enclosing package directory', () => {
    // someTopLevelFunction is not a file; the package directory is.
    expect(
      resolveImport('com.x.app.ui.someTopLevelFunction', 'app/src/main/java/com/x/app/Main.kt', 'kotlin', ctx())
    ).toEqual({
      toPath: 'app/src/main/java/com/x/app/ui',
      resolution: 'first-party'
    });
  });

  it('breaks a main against test tie toward main, the stated tie break', () => {
    // Dup.kt exists under src/main and src/test in the same package. The
    // language merges source roots into one package and every build depends
    // main-ward, so the one non test candidate wins.
    expect(
      resolveImport('com.x.app.Dup', 'app/src/test/java/com/x/app/DupTest.kt', 'kotlin', ctx())
    ).toEqual({
      toPath: 'app/src/main/java/com/x/app/Dup.kt',
      resolution: 'first-party'
    });
  });

  it('answers unresolved for a name two main files could be, never a coin flip', () => {
    // Amb.kt exists in the same package under two modules, neither a test
    // root, and no tie break applies.
    expect(
      resolveImport('com.x.app.Amb', 'app/src/main/java/com/x/app/Main.kt', 'kotlin', ctx())
    ).toEqual({ toPath: null, resolution: 'unresolved' });
  });

  it('leaves Gradle build scripts out of the convention entirely', () => {
    // Every Android repository holds a directory literally named android/app
    // full of build.gradle.kts files. Without the exclusion those scripts
    // would put `android/app` in the directory index and grey out the
    // platform's own android.app.* imports; with it they stay external.
    const withScripts = archResolveContext(readArchManifests(root), [
      ...FILES,
      'clients/android/build.gradle.kts',
      'clients/android/app/build.gradle.kts'
    ]);
    expect(
      resolveImport('android.app.Notification', 'app/src/main/java/com/x/app/Main.kt', 'kotlin', withScripts)
    ).toEqual({ toPath: null, resolution: 'external' });
  });

  it('answers external for each of the four admission rules', () => {
    const c = ctx();
    for (const specifier of [
      // Rule 1: the declared group as a dotted prefix.
      'androidx.core.content.ContextCompat',
      // Rule 2: the artifact name, hyphens as dots, two shared segments.
      'kotlinx.coroutines.flow.MutableStateFlow',
      // Rule 3: the group's last segment at the head, and at second place.
      'okhttp3.OkHttpClient',
      'org.junit.Test',
      // Rule 4: the platform, and android because the plugin is declared.
      'kotlin.collections.List',
      'java.time.Instant',
      'android.os.Build'
    ]) {
      expect(resolveImport(specifier, 'app/src/main/java/com/x/app/Main.kt', 'kotlin', c)).toEqual({
        toPath: null,
        resolution: 'external'
      });
    }
  });

  it('answers unresolved when the repository and the platform both claim a name', () => {
    // lib/src/main/kotlin/math/ makes `kotlin.math` a conventional match, and
    // the platform ships kotlin.math too. Guessing either way risks a wrong
    // edge or a false green, so the answer is grey.
    expect(
      resolveImport('kotlin.math.abs', 'app/src/main/java/com/x/app/Main.kt', 'kotlin', ctx())
    ).toEqual({ toPath: null, resolution: 'unresolved' });
  });

  it('never answers external for a name no manifest declared', () => {
    const c = ctx();
    for (const specifier of [
      'okio.ByteString',
      'dev.nowhere.Thing',
      'com.google.gson.Gson'
    ]) {
      expect(resolveImport(specifier, 'app/src/main/java/com/x/app/Main.kt', 'kotlin', c)).toEqual({
        toPath: null,
        resolution: 'unresolved'
      });
    }
  });

  it('refuses a specifier that is not a plain dotted identifier', () => {
    const c = ctx();
    for (const specifier of ['', '  ', 'com..x', 'com.x.`fun`', 'com/x/app', 'com.x.app.']) {
      expect(resolveImport(specifier, 'app/Main.kt', 'kotlin', c)).toEqual({
        toPath: null,
        resolution: 'unresolved'
      });
    }
  });
});
