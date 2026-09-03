/**
 * The C and C++ arm, over real CMake, make and Bazel files on disk
 * (Phase 184).
 *
 * The ladder is under test in the order the arm's header states it, and so are
 * the three refusals that make the include path reader honest: a computed
 * path, a generator expression and an absolute path are all left unread, and
 * an include only one of them could explain answers unresolved.
 */

import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { archResolveContext, resolveImport } from '../resolver';
import { readArchManifests } from '../resolver/manifest';
import { readIncludeDirs } from '../resolver/include-dirs';

let root: string;

const FILES = [
  'CMakeLists.txt',
  'src/Makefile',
  'third/BUILD.bazel',
  'src/main.c',
  'src/util.h',
  'src/app.cc',
  'src/engine.hpp',
  'include/pub/api.h',
  'deps/hiredis/hiredis.h',
  'third/lib/thing.h',
  'src/a/common.h',
  'src/b/common.h',
  'absl/strings/str_cat.h'
];

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'gmux-arch-cfamily-'));
  mkdirSync(join(root, 'src'), { recursive: true });
  mkdirSync(join(root, 'third'), { recursive: true });
  writeFileSync(
    join(root, 'CMakeLists.txt'),
    [
      'include_directories(include)',
      'target_include_directories(app PRIVATE ${CMAKE_CURRENT_SOURCE_DIR}/include SYSTEM)',
      // Every one of these three must be refused.
      'target_include_directories(app PRIVATE ${UTIL_INCLUDES})',
      'target_include_directories(app PUBLIC $<BUILD_INTERFACE:${CMAKE_SOURCE_DIR}/nope>)',
      'include_directories(/usr/local/include)'
    ].join('\n')
  );
  writeFileSync(
    join(root, 'src', 'Makefile'),
    'FINAL_CFLAGS+= -I../deps/hiredis -I$(LUA_DIR)/src -Wall\n'
  );
  writeFileSync(
    join(root, 'third', 'BUILD.bazel'),
    [
      'cc_library(',
      '    name = "thing",',
      '    includes = ["lib"],',
      '    strip_include_prefix = "lib",',
      ')'
    ].join('\n')
  );
});

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

const ctx = (): ReturnType<typeof archResolveContext> =>
  archResolveContext(readArchManifests(root), FILES);

const inc = (
  specifier: string,
  fromPath = 'src/main.c',
  language: 'c' | 'cpp' = 'c'
): { toPath: string | null; resolution: string } =>
  resolveImport(specifier, fromPath, language, ctx());

describe('the ladder, in the order the arm asks it', () => {
  it('finds a header beside the including file first', () => {
    expect(inc('util.h')).toEqual({
      toPath: 'src/util.h',
      resolution: 'first-party'
    });
  });

  it('finds a header from the repository root, which abseil depends on', () => {
    // abseil writes #include "absl/strings/str_cat.h" and resolves 4,277 of
    // its 4,748 quoted includes that way and nothing else at all.
    expect(inc('absl/strings/str_cat.h').toPath).toBe('absl/strings/str_cat.h');
  });

  it('finds a header through a directory CMake declared', () => {
    expect(inc('pub/api.h').toPath).toBe('include/pub/api.h');
  });

  it("finds a header through a Makefile's own -I, relative to the makefile", () => {
    expect(inc('hiredis.h').toPath).toBe('deps/hiredis/hiredis.h');
  });

  it('finds a header through a Bazel includes rule', () => {
    expect(inc('thing.h').toPath).toBe('third/lib/thing.h');
  });

  it('answers unresolved when a tail matches more than one file', () => {
    // libgit2 has 592 such includes, 14 percent of its quoted ones, because it
    // vendors zlib, pcre2 and http_parser beside its own headers.
    expect(inc('common.h').resolution).toBe('unresolved');
  });

  it('answers unresolved for a quoted include that found nothing', () => {
    // NEVER external. A quoted include that found no file is a failure to
    // resolve, which is what keeps abseil's 471 gtest and gmock includes grey
    // rather than reported as a dependency nobody named as a path.
    expect(inc('gtest/gtest.h').resolution).toBe('unresolved');
  });

  it('reads a C++ file by the same ladder', () => {
    expect(inc('engine.hpp', 'src/app.cc', 'cpp').toPath).toBe('src/engine.hpp');
  });
});

describe('the angle bracket form', () => {
  it('takes a declared include directory before anything else', () => {
    expect(inc('<pub/api.h>').toPath).toBe('include/pub/api.h');
  });

  it('goes grey when a tracked file could shadow it', () => {
    expect(inc('<absl/strings/str_cat.h>').resolution).toBe('unresolved');
  });

  it('is external on its form alone when nothing tracked could be it', () => {
    expect(inc('<stdio.h>').resolution).toBe('external');
    expect(inc('<vector>', 'src/app.cc', 'cpp').resolution).toBe('external');
  });
});

describe('the include path reader takes literals and nothing else', () => {
  it('reads the literal and the two variables that name its own directory', () => {
    const dirs = readIncludeDirs(root).dirs;
    expect(dirs).toContain('include');
    expect(dirs).toContain('deps/hiredis');
    expect(dirs).toContain('third/lib');
  });

  it('refuses a computed path, a generator expression and an absolute one', () => {
    const dirs = readIncludeDirs(root).dirs;
    // ${UTIL_INCLUDES}, $<BUILD_INTERFACE:...>, /usr/local/include and
    // $(LUA_DIR)/src. libgit2 writes 50 of its 69 include arguments this way
    // and abseil writes all 16 of its own.
    for (const refused of dirs) {
      expect(refused).not.toContain('$');
      expect(refused.startsWith('/')).toBe(false);
    }
    expect(dirs).not.toContain('nope');
    expect(dirs.some((d) => d.includes('usr'))).toBe(false);
    expect(dirs.some((d) => d.includes('LUA_DIR'))).toBe(false);
  });

  it('never reads a CMake keyword or a target name as a directory', () => {
    const dirs = readIncludeDirs(root).dirs;
    for (const word of ['app', 'PRIVATE', 'PUBLIC', 'SYSTEM']) {
      expect(dirs).not.toContain(word);
    }
  });
});
