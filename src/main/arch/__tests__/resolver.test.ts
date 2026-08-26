/**
 * The manifest aware resolver, over real manifests on disk (Phase 63).
 *
 * Every case here is one of the four answers the design is built on, and the
 * distinction between the last two is the point of the whole file: `external`
 * is a definite answer and `unresolved` is the absence of one. A resolver that
 * blurred them would let a miss render as a verified absence, which research 49
 * calls the single most damaging output this feature could produce.
 */

import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { archResolveContext, resolveImport, RESOLVER_MATRIX } from '../resolver';
import { readArchManifests } from '../resolver/manifest';

let root: string;

const FILES = [
  'src/main/index.ts',
  'src/main/util/helpers.ts',
  'src/shared/ipc/index.ts',
  'src/shared/types.ts',
  'src/renderer/app/App.tsx',
  'web/legacy.js',
  'packages/core/src/index.ts',
  'packages/core/package.json',
  'internal/stats/stats.go',
  'cmd/tool/main.go',
  'crates/thing/src/lib.rs',
  'py/app.py'
];

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'gmux-arch-resolver-'));
  mkdirSync(join(root, 'packages', 'core'), { recursive: true });
  writeFileSync(
    join(root, 'package.json'),
    JSON.stringify({
      name: 'tortie-fixture',
      workspaces: ['packages/*'],
      dependencies: { zustand: '^5.0.0' },
      devDependencies: { 'react-dom': '^19.0.0', '@types/hast': '^3.0.0' }
    })
  );
  writeFileSync(
    join(root, 'packages', 'core', 'package.json'),
    JSON.stringify({ name: '@fixture/core' })
  );
  // Deliberately NOT strict JSON. Two of Tortie's own seven tsconfigs are not
  // either, so a resolver that used JSON.parse alone would lose every alias in
  // this repository and report its own imports as unresolved.
  writeFileSync(
    join(root, 'tsconfig.json'),
    `{
  // a comment, which tsc accepts and JSON.parse does not
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@shared/*": ["src/shared/*"],
      "@renderer/*": ["src/renderer/*"],
    },
  },
}`
  );
  writeFileSync(join(root, 'go.mod'), 'module github.com/fixture/thing\n\ngo 1.22\n');
});

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

function ctx(): ReturnType<typeof archResolveContext> {
  return archResolveContext(readArchManifests(root), FILES);
}

describe('the manifest aware resolver', () => {
  it('reads an alias out of a tsconfig that is not strict JSON', () => {
    const manifests = readArchManifests(root);
    expect(manifests.aliases.map((a) => a.prefix).sort()).toEqual([
      '@renderer/',
      '@shared/'
    ]);
  });

  it('resolves a relative specifier to the tracked file', () => {
    expect(
      resolveImport('./util/helpers', 'src/main/index.ts', 'typescript', ctx())
    ).toEqual({ toPath: 'src/main/util/helpers.ts', resolution: 'first-party' });
  });

  it('resolves an aliased specifier through the tsconfig paths', () => {
    expect(
      resolveImport('@shared/ipc', 'src/main/index.ts', 'typescript', ctx())
    ).toEqual({ toPath: 'src/shared/ipc/index.ts', resolution: 'first-party' });
  });

  it('resolves the output extension back to the source one', () => {
    // `./types.js` in an ESM TypeScript file names `types.ts` on disk. Without
    // this a repository following the nodenext rule resolves nothing at all.
    expect(
      resolveImport('../types.js', 'src/shared/ipc/index.ts', 'typescript', ctx())
    ).toEqual({ toPath: 'src/shared/types.ts', resolution: 'first-party' });
  });

  it('classifies a workspace package as first party', () => {
    expect(
      resolveImport('@fixture/core', 'src/main/index.ts', 'typescript', ctx())
    ).toEqual({
      toPath: 'packages/core/src/index.ts',
      resolution: 'first-party'
    });
  });

  it('ignores a bundler query, which changes what happens to a file and not which file it is', () => {
    // Measured on this repository: thirteen of twenty six unresolved
    // specifiers were `?raw`, `?inline` or `?worker&inline` and nothing else.
    const c = ctx();
    expect(
      resolveImport('./legacy.js?raw', 'web/other.js', 'javascript', c)
    ).toEqual({ toPath: 'web/legacy.js', resolution: 'first-party' });
    expect(
      resolveImport('@shared/types?inline', 'src/main/index.ts', 'typescript', c)
    ).toEqual({ toPath: 'src/shared/types.ts', resolution: 'first-party' });
  });

  it('calls a platform builtin and a DECLARED dependency external, which is a definite answer', () => {
    const c = ctx();
    // `hast` is declared only as `@types/hast`, which is DefinitelyTyped's own
    // mapping and the reason a types only import resolves at all.
    for (const spec of [
      'node:fs',
      'fs',
      'electron',
      'zustand',
      'react-dom/client',
      'hast'
    ]) {
      expect(resolveImport(spec, 'src/main/index.ts', 'typescript', c)).toEqual({
        toPath: null,
        resolution: 'external'
      });
    }
  });

  it('calls a bare specifier NO manifest declares unresolved, never external', () => {
    // This is the answer that stops a false green. An import through an alias
    // this build cannot see, from a nested tsconfig or a bundler config, is a
    // first party import, and answering `external` because the resolver ran out
    // of ideas would hide it from the crossing list and leave a `must-not`
    // promise across it green.
    const c = ctx();
    for (const spec of ['totally-made-up-package-xyz', '@nobody/declared-this']) {
      expect(resolveImport(spec, 'src/main/index.ts', 'typescript', c)).toEqual({
        toPath: null,
        resolution: 'unresolved'
      });
    }
  });

  it('calls a real alias with no file behind it UNRESOLVED, never external', () => {
    // The rule matched and the target does not exist. Calling this external
    // would invent a dependency that is not in any manifest.
    expect(
      resolveImport('@shared/gone', 'src/main/index.ts', 'typescript', ctx())
    ).toEqual({ toPath: null, resolution: 'unresolved' });
  });

  it('calls a relative specifier with no file behind it unresolved', () => {
    expect(
      resolveImport('./nowhere', 'src/main/index.ts', 'typescript', ctx())
    ).toEqual({ toPath: null, resolution: 'unresolved' });
  });

  it('resolves a Go import under the module directive to its package directory', () => {
    expect(
      resolveImport(
        'github.com/fixture/thing/internal/stats',
        'cmd/tool/main.go',
        'go',
        ctx()
      )
    ).toEqual({ toPath: 'internal/stats', resolution: 'first-party' });
  });

  it('calls the Go standard library and a third party module external', () => {
    const c = ctx();
    expect(resolveImport('fmt', 'cmd/tool/main.go', 'go', c).resolution).toBe(
      'external'
    );
    expect(
      resolveImport('github.com/other/pkg', 'cmd/tool/main.go', 'go', c).resolution
    ).toBe('external');
  });

  it('marks Rust and Python unverifiable rather than dropping or guessing', () => {
    const c = ctx();
    expect(
      resolveImport('crate::foo::bar', 'crates/thing/src/lib.rs', 'rust', c)
    ).toEqual({ toPath: null, resolution: 'unverifiable' });
    expect(resolveImport('os.path', 'py/app.py', 'python', c)).toEqual({
      toPath: null,
      resolution: 'unverifiable'
    });
  });

  it('prints one matrix row per language with the two deferred ones named', () => {
    expect(RESOLVER_MATRIX.map((r) => [r.language, r.resolves])).toEqual([
      ['typescript', true],
      ['javascript', true],
      ['go', true],
      ['rust', false],
      ['python', false]
    ]);
    for (const row of RESOLVER_MATRIX) {
      expect(row.resolves ? row.reason === null : row.reason !== null).toBe(true);
    }
  });
});
