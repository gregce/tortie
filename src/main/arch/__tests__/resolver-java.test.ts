/**
 * The Java arm, over a real Maven and Gradle tree on disk (Phase 184).
 *
 * The three things under test are the three the arm's header claims. The
 * convention resolves a type to its FILE with the main over test tie break; the
 * DIRECTORY fallback the Kotlin arm has is absent, which is what stops
 * `scala.concurrent.Future` landing on a directory named `scala`; and a name
 * nobody declared stays unresolved rather than becoming a dependency.
 */

import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { archResolveContext, resolveImport } from '../resolver';
import { readArchManifests } from '../resolver/manifest';

let root: string;

const FILES = [
  'pom.xml',
  'gradle/libs.versions.toml',
  'core/src/main/java/com/x/app/Main.java',
  'core/src/main/java/com/x/app/net/Client.java',
  'core/src/test/java/com/x/app/net/Client.java',
  'core/src/main/java/com/x/app/Amb.java',
  'extra/src/main/java/com/x/app/Amb.java',
  // The directory named `scala`, which is the trap research 78 section 3.3
  // found on retrofit. Nothing under it may ever answer an import.
  'adapters/scala/src/main/java/retrofit2/adapter/scala/Adapter.java'
];

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'gmux-arch-java-'));
  mkdirSync(join(root, 'gradle'), { recursive: true });
  writeFileSync(
    join(root, 'pom.xml'),
    [
      '<project>',
      '  <groupId>com.x</groupId>',
      '  <artifactId>app</artifactId>',
      '  <dependencies>',
      '    <dependency>',
      '      <groupId>com.google.guava</groupId>',
      '      <artifactId>guava</artifactId>',
      '    </dependency>',
      '    <dependency>',
      '      <groupId>${project.groupId}</groupId>',
      '      <artifactId>computed</artifactId>',
      '    </dependency>',
      '  </dependencies>',
      '</project>'
    ].join('\n')
  );
  writeFileSync(
    join(root, 'gradle', 'libs.versions.toml'),
    [
      '[libraries]',
      'okhttp = { module = "com.squareup.okhttp3:okhttp", version.ref = "o" }'
    ].join('\n')
  );
});

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

const ctx = (): ReturnType<typeof archResolveContext> =>
  archResolveContext(readArchManifests(root), FILES);

const answer = (
  specifier: string,
  fromPath = 'core/src/main/java/com/x/app/Main.java'
): { toPath: string | null; resolution: string } =>
  resolveImport(specifier, fromPath, 'java', ctx());

describe('the Java arm resolves a type to its file', () => {
  it('reads a plain import as the file the package spells', () => {
    expect(answer('com.x.app.net.Client')).toEqual({
      toPath: 'core/src/main/java/com/x/app/net/Client.java',
      resolution: 'first-party'
    });
  });

  it('drops trailing member names to reach the type', () => {
    expect(answer('com.x.app.net.Client.Builder').toPath).toBe(
      'core/src/main/java/com/x/app/net/Client.java'
    );
    expect(answer('com.x.app.net.Client.of').toPath).toBe(
      'core/src/main/java/com/x/app/net/Client.java'
    );
  });

  it('prefers main over test when that is the only ambiguity', () => {
    // Both source sets hold com/x/app/net/Client.java, which is every JVM
    // project, and the direction every build depends in is main.
    expect(answer('com.x.app.net.Client').toPath).not.toContain('/test/');
  });

  it('answers unresolved when two modules hold the same type', () => {
    expect(answer('com.x.app.Amb').resolution).toBe('unresolved');
  });
});

describe('the directory fallback is absent, and that is the point', () => {
  it('never lands an import on a directory that merely shares its name', () => {
    // retrofit holds `adapters/scala/...`, and the Kotlin arm's directory
    // fallback lands `scala.concurrent.Future` on it. This arm indexes files
    // only, so the answer is grey.
    const got = answer('scala.concurrent.Future');
    expect(got.resolution).toBe('unresolved');
    expect(got.toPath).toBeNull();
  });

  it('answers unresolved for a wildcard import, which names a package', () => {
    // The grammar hands `import com.x.app.net.*;` over as `com.x.app.net`,
    // and a package is a directory this arm will not answer with.
    expect(answer('com.x.app.net').resolution).toBe('unresolved');
  });
});

describe('what may be called a dependency, and what may not', () => {
  it('calls the JVM platform external', () => {
    expect(answer('java.util.List').resolution).toBe('external');
    expect(answer('javax.annotation.Nullable').resolution).toBe('external');
    expect(answer('org.w3c.dom.Node').resolution).toBe('external');
  });

  it('calls a declared Maven group external', () => {
    expect(answer('com.google.guava.Thing').resolution).toBe('external');
  });

  it("calls a group's last segment at the head external", () => {
    // `com.squareup.okhttp3` from the Gradle catalog admits `okhttp3.*`.
    expect(answer('okhttp3.OkHttpClient').resolution).toBe('external');
  });

  it('leaves a name nobody declared unresolved, never external', () => {
    // The false green control. An `external` is dropped from both sides of the
    // imports checker's ledger, so a must-not crossed by this import would
    // print convergent.
    expect(answer('dev.nowhere.Thing').resolution).toBe('unresolved');
  });

  it('does not read a coordinate written as a property reference', () => {
    // `${project.groupId}` names a value this reader resolves nothing for, and
    // the one word artifact beside it admits nothing on its own either.
    expect(answer('computed.thing.Whatever').resolution).toBe('unresolved');
  });

  it("never reads the repository's OWN coordinate as a dependency", () => {
    // The top level <groupId>com.x</groupId> names this project. Reading it
    // made the two worlds rule grey out every one of the repository's own
    // imports, which is the defect the <dependency> fence exists for.
    expect(answer('com.x.app.net.Client').resolution).toBe('first-party');
  });

  it('refuses a specifier the extractor had to truncate', () => {
    expect(
      resolveImport(
        'com.x.app … truncated',
        'core/src/main/java/com/x/app/Main.java',
        'java',
        ctx()
      ).resolution
    ).toBe('unresolved');
  });
});

/**
 * THE REPOSITORY WHOSE OWN GROUP IS ALSO A DEPENDENCY'S, WHICH IS A SECOND
 * TREE BECAUSE THE FIXTURE ABOVE MUST KEEP PROVING THE `<dependency>` FENCE.
 *
 * apache/commons-lang is `org.apache.commons` and it declares
 * `org.apache.commons:commons-text`, so the fence kept the project's identity
 * out of `groups` and the dependency put the same value straight back in. The
 * two worlds rule then greyed out all 756 of the repository's own
 * `org.apache.commons.lang3.*` imports and it resolved 0 of its 4,275 imports
 * first party. The fix reads the identity into `ownGroups` and refuses to let
 * a group in that set claim anything; measured over the real repository it
 * recovers all 756 and costs exactly one external, being
 * `org.apache.commons.text.TextStringBuilder`, which goes grey.
 */
describe('a group the repository declares for itself', () => {
  let ownRoot: string;
  const OWN_FILES = [
    'pom.xml',
    'src/main/java/org/apache/commons/lang3/StringUtils.java'
  ];

  beforeAll(() => {
    ownRoot = mkdtempSync(join(tmpdir(), 'gmux-arch-java-own-'));
    writeFileSync(
      join(ownRoot, 'pom.xml'),
      [
        '<project>',
        '  <parent>',
        '    <groupId>org.apache</groupId>',
        '    <artifactId>apache</artifactId>',
        '  </parent>',
        '  <groupId>org.apache.commons</groupId>',
        '  <artifactId>commons-lang3</artifactId>',
        '  <dependencies>',
        '    <dependency>',
        '      <groupId>org.apache.commons</groupId>',
        '      <artifactId>commons-text</artifactId>',
        '    </dependency>',
        '  </dependencies>',
        '  <build>',
        '    <plugins>',
        '      <plugin>',
        '        <groupId>org.apache.maven.plugins</groupId>',
        '        <artifactId>maven-surefire-plugin</artifactId>',
        '      </plugin>',
        '    </plugins>',
        '  </build>',
        '</project>'
      ].join('\n')
    );
  });

  afterAll(() => {
    rmSync(ownRoot, { recursive: true, force: true });
  });

  const own = (specifier: string): { toPath: string | null; resolution: string } =>
    resolveImport(
      specifier,
      'src/main/java/org/apache/commons/lang3/StringUtils.java',
      'java',
      archResolveContext(readArchManifests(ownRoot), OWN_FILES)
    );

  it('resolves the repository\'s own package even when a dependency shares it', () => {
    expect(own('org.apache.commons.lang3.StringUtils').toPath).toBe(
      'src/main/java/org/apache/commons/lang3/StringUtils.java'
    );
  });

  it('makes that dependency grey rather than external, which is the price', () => {
    expect(own('org.apache.commons.text.TextStringBuilder').resolution).toBe(
      'unresolved'
    );
  });

  it('reads the parent coordinate as identity and the plugin as neither', () => {
    const java = readArchManifests(ownRoot).java;
    expect([...java.ownGroups].sort()).toEqual(['org.apache', 'org.apache.commons']);
    expect([...java.groups]).toEqual(['org.apache.commons']);
  });
});
