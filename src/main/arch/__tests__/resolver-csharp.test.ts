/**
 * The C sharp arm, over real csproj files and real sources on disk
 * (Phase 184).
 *
 * The arm answers with a PROJECT DIRECTORY, which is the grain the language
 * has: a namespace matches a directory 0.3 percent of the time in SignalR and
 * a csproj 86 to 100 percent of the time. So the tests here pin a directory,
 * both project styles, the enclosing namespace walk, the ambiguity rule, the
 * lower cased NuGet compare and the byte order mark that cost Nancy 563 of its
 * 959 files their namespace before it was stripped.
 */

import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { archResolveContext, resolveImport } from '../resolver';
import { readArchManifests } from '../resolver/manifest';
import { readCsharpManifest } from '../resolver/csproj';

let root: string;

const FILES = [
  'src/Nancy/Nancy.csproj',
  'src/Nancy/Bootstrapper.cs',
  'src/Nancy/Configuration/Env.cs',
  'src/Nancy.Hosting/Nancy.Hosting.csproj',
  'src/Nancy.Hosting/Host.cs',
  'src/Legacy/Legacy.csproj',
  'src/Legacy/Listed.cs',
  'src/Spanning.A/Spanning.A.csproj',
  'src/Spanning.A/One.cs',
  'src/Spanning.B/Spanning.B.csproj',
  'src/Spanning.B/Two.cs',
  'src/Nancy/bin/Debug/Generated.cs'
];

const write = (relPath: string, text: string): void => {
  const at = join(root, relPath);
  mkdirSync(at.slice(0, at.lastIndexOf('/')), { recursive: true });
  writeFileSync(at, text);
};

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'gmux-arch-csharp-'));
  write(
    'src/Nancy/Nancy.csproj',
    [
      '<Project Sdk="Microsoft.NET.Sdk">',
      '  <ItemGroup>',
      '    <PackageReference Include="xunit" Version="2.4.1" />',
      '    <Reference Include="System.Xml, Version=4.0.0.0, Culture=neutral" />',
      '  </ItemGroup>',
      '</Project>'
    ].join('\n')
  );
  write('src/Nancy.Hosting/Nancy.Hosting.csproj', '<Project Sdk="Microsoft.NET.Sdk" />');
  write(
    'src/Legacy/Legacy.csproj',
    [
      '<?xml version="1.0" encoding="utf-8"?>',
      '<Project ToolsVersion="4.0" xmlns="http://schemas.microsoft.com/developer/msbuild/2003">',
      '  <ItemGroup>',
      '    <Compile Include="Listed.cs" />',
      '  </ItemGroup>',
      '</Project>'
    ].join('\n')
  );
  write('src/Spanning.A/Spanning.A.csproj', '<Project Sdk="Microsoft.NET.Sdk" />');
  write('src/Spanning.B/Spanning.B.csproj', '<Project Sdk="Microsoft.NET.Sdk" />');
  // THE BYTE ORDER MARK IS THE POINT OF THIS FILE. Visual Studio writes one,
  // and a namespace pattern anchored to the start of a line does not match
  // through it.
  write('src/Nancy/Bootstrapper.cs', '﻿namespace Nancy\n{\n  using Configuration;\n}\n');
  write('src/Nancy/Configuration/Env.cs', 'namespace Nancy.Configuration;\nclass Env {}\n');
  write('src/Nancy.Hosting/Host.cs', 'namespace Nancy.Hosting {\n  class Host {}\n}\n');
  write('src/Legacy/Listed.cs', 'namespace Legacy.Listed { class A {} }\n');
  write('src/Spanning.A/One.cs', 'namespace Shared { class One {} }\n');
  write('src/Spanning.B/Two.cs', 'namespace Shared { class Two {} }\n');
  write('src/Nancy/bin/Debug/Generated.cs', 'namespace Generated { class G {} }\n');
});

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

const ctx = (): ReturnType<typeof archResolveContext> => {
  const manifests = readArchManifests(root);
  manifests.csharp = readCsharpManifest(root, FILES);
  return archResolveContext(manifests, FILES);
};

const using = (
  specifier: string,
  fromPath = 'src/Nancy/Bootstrapper.cs'
): { toPath: string | null; resolution: string } =>
  resolveImport(specifier, fromPath, 'csharp', ctx());

describe('an answer is a project directory, never a file', () => {
  it('resolves a namespace to the directory of the project that owns it', () => {
    expect(using('Nancy.Hosting')).toEqual({
      toPath: 'src/Nancy.Hosting',
      resolution: 'first-party'
    });
  });

  it('reads a file scoped namespace as well as the block form', () => {
    expect(using('Nancy.Configuration').toPath).toBe('src/Nancy');
  });

  it("reads an older project's explicit Compile list", () => {
    expect(using('Legacy.Listed').toPath).toBe('src/Legacy');
  });

  it('reads a namespace through a byte order mark', () => {
    // A UTF-8 BOM before `namespace` cost Nancy 563 of its 959 files their
    // namespace before it was stripped, so more than half the repository read
    // as though it declared nothing at all.
    expect(readCsharpManifest(root, FILES).namespaceOf.get('src/Nancy/Bootstrapper.cs')).toBe(
      'Nancy'
    );
  });

  it('never lets build output own a namespace', () => {
    expect(using('Generated').resolution).not.toBe('first-party');
  });
});

describe('the enclosing namespace walk, which the compiler does too', () => {
  it('resolves an unqualified using against its own namespace', () => {
    // `using Configuration;` inside `namespace Nancy` means
    // `Nancy.Configuration`. 47 of Nancy's first party answers are found only
    // this way.
    expect(using('Configuration').toPath).toBe('src/Nancy');
  });

  it('skips the walk for a global:: qualified name', () => {
    // The qualifier is syntax, not part of the name, and it says the lookup
    // starts at the global namespace.
    expect(using('global::Configuration').resolution).toBe('unresolved');
    expect(using('global::Nancy.Hosting').toPath).toBe('src/Nancy.Hosting');
  });

  it('resolves an implicit parent namespace nobody declares outright', () => {
    // `namespace Legacy.Listed` makes `using Legacy;` legal even though no
    // file declares `Legacy` on its own.
    expect(using('Legacy').toPath).toBe('src/Legacy');
  });
});

describe('ambiguity and dependency', () => {
  it('answers unresolved when several projects declare the namespace', () => {
    // SignalR has 196 such usings across 10 namespaces, and picking one would
    // be a real edge to the wrong assembly.
    expect(using('Shared').resolution).toBe('unresolved');
  });

  it('calls the .NET platform external', () => {
    expect(using('System.Collections.Generic').resolution).toBe('external');
  });

  it('calls a declared PackageReference external, LOWER CASED', () => {
    // NuGet ids are case insensitive and namespaces are Pascal case, so a byte
    // compare loses `using Xunit;` against `<PackageReference Include="xunit">`.
    // That one shape was 210 of Nancy's and 100 of SignalR's apparent misses.
    expect(using('Xunit').resolution).toBe('external');
    expect(using('Xunit.Abstractions').resolution).toBe('external');
  });

  it("reads a Reference's strong name down to its id", () => {
    expect(using('System.Xml').resolution).toBe('external');
  });

  it('leaves a namespace nobody declared unresolved, never external', () => {
    expect(using('Nobody.Declared.This').resolution).toBe('unresolved');
  });

  it('resolves nothing first party in a repository with no csproj', () => {
    const bare = archResolveContext(readArchManifests(root), ['src/Nancy/Bootstrapper.cs']);
    expect(resolveImport('Nancy.Hosting', 'src/Nancy/Bootstrapper.cs', 'csharp', bare).resolution).toBe(
      'unresolved'
    );
  });
});
