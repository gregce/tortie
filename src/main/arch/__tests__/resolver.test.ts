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
import { GRAMMARS } from '../../symbols/languages';
import { IMPORT_TRUNCATION_MARKER } from '../../symbols/queries';
import { collapseSameAnswer } from '../scan';

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
  // PHASE 178. A nested manifest the root neither lists as a workspace nor
  // depends on, which is rookery's exact shape: the root package.json declares
  // nothing and `server/package.json` holds the real dependency list.
  mkdirSync(join(root, 'server', 'src'), { recursive: true });
  writeFileSync(
    join(root, 'server', 'package.json'),
    JSON.stringify({ name: 'fixture-server', dependencies: { fastify: '^5.0.0' } })
  );
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

  it('justifies a bare specifier by the NEAREST enclosing manifest (Phase 178)', () => {
    // Rookery's shape: the root manifest declares nothing and the nested
    // `server/package.json` declares fastify. The old reader never saw the
    // nested file, so every one of that package's imports drew unresolved,
    // 47 rows on a strip whose true count is a handful.
    expect(
      resolveImport('fastify', 'server/src/app.ts', 'typescript', ctx())
    ).toEqual({ toPath: null, resolution: 'external' });
  });

  it('lets a sibling subtree justify NOTHING outside itself (Phase 178)', () => {
    // The same name imported from the root's own code: no manifest enclosing
    // `src/main/index.ts` declares fastify, and the nested server manifest is
    // a sibling, not an ancestor. Unresolved-never-external survives: grey,
    // never a blessed dependency by association.
    expect(
      resolveImport('fastify', 'src/main/index.ts', 'typescript', ctx())
    ).toEqual({ toPath: null, resolution: 'unresolved' });
  });

  it('walks past a nested manifest to one higher up that declares the name', () => {
    // A monorepo keeps shared devDependencies at the root. The nested manifest
    // does not declare zustand, the root does, and the walk climbs in the same
    // direction Node resolves in, so the nested file's import is external.
    expect(
      resolveImport('zustand', 'server/src/app.ts', 'typescript', ctx())
    ).toEqual({ toPath: null, resolution: 'external' });
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

  it('sends Rust, Python and Ruby to their own arms rather than to the script one', () => {
    // Phase 157. These three used to answer `unverifiable` here. The point of
    // this test is no longer the answer, it is WHICH ARM ANSWERED: the script
    // arm would call `crate::foo::bar` and `os.path` unresolved for reasons of
    // its own, so the assertions below name answers only a real arm can give.
    const c = ctx();
    // The Rust arm, and nothing else in this file, knows `std` is Rust's own
    // standard library. The script arm has no such list.
    expect(
      resolveImport('std::io::Write', 'crates/thing/src/lib.rs', 'rust', c)
    ).toEqual({ toPath: null, resolution: 'external' });
    // The Python arm, and nothing else, knows `os` is Python's.
    expect(resolveImport('os.path', 'py/app.py', 'python', c)).toEqual({
      toPath: null,
      resolution: 'external'
    });
    // The Ruby arm, and nothing else, knows `pathname` is Ruby's.
    expect(resolveImport('pathname', 'lib/app.rb', 'ruby', c)).toEqual({
      toPath: null,
      resolution: 'external'
    });
    // AND NONE OF THEM IS THE SCRIPT ARM. `fs` is a Node builtin, so a `.rb`
    // file routed to the script arm would answer external here. It must not:
    // Ruby has no `fs`, nobody declared the gem, and an external would leave a
    // must-not promise across it green.
    expect(resolveImport('fs', 'lib/app.rb', 'ruby', c).resolution).toBe(
      'unresolved'
    );
  });

  it('never answers unverifiable for a language whose arm shipped', () => {
    // THE ROW THAT USED TO SAY THE OPPOSITE. Phase 157 emptied this answer, and
    // this test is what stops a later round quietly refilling it. It is not the
    // same answer as `unresolved`: this one says nobody looked. Phase 180
    // commit two emptied it AGAIN, and the three client languages are held to
    // the same rule below.
    const c = ctx();
    for (const [specifier, from, language] of [
      ['crate::foo::bar', 'crates/thing/src/lib.rs', 'rust'],
      ['os.path', 'py/app.py', 'python'],
      ['./x', 'src/app/main.ts', 'typescript'],
      ['./x', 'src/app/main.js', 'javascript'],
      ['fmt', 'cmd/tool/main.go', 'go'],
      ['app', 'lib/app.rb', 'ruby']
    ] as const) {
      expect(
        resolveImport(specifier, from, language, c).resolution
      ).not.toBe('unverifiable');
    }
  });

  it('prints one matrix row per language and every one of them resolves', () => {
    expect(RESOLVER_MATRIX.map((r) => [r.language, r.resolves])).toEqual([
      ['typescript', true],
      ['javascript', true],
      ['go', true],
      ['rust', true],
      ['python', true],
      ['ruby', true],
      ['swift', true],
      ['kotlin', true],
      ['objc', true],
      ['java', true]
    ]);
    for (const row of RESOLVER_MATRIX) {
      expect(row.resolves ? row.reason === null : row.reason !== null).toBe(true);
    }
  });

  it('refuses a truncated specifier in every language, Go included', () => {
    // A specifier the extractor had to truncate is recorded rather than dropped,
    // which is what keeps the checker counting it. Five of the six arms refuse
    // it on syntax alone; Go's does not, because its rule is that a path not
    // under the module directive IS a dependency, and that rule would have made
    // a definite answer out of a mangled path. The facade refuses it first.
    const ctx = archResolveContext(readArchManifests(root), FILES);
    const long = `${'q'.repeat(5000)}${IMPORT_TRUNCATION_MARKER}`;
    for (const language of RESOLVER_MATRIX.map((r) => r.language)) {
      const answer = resolveImport(long, 'src/main/index.ts', language, ctx);
      expect([language, answer.resolution]).toEqual([language, 'unresolved']);
    }
  });

  it('routes the Phase 180 three to their own arms, never the script arm', () => {
    // Commit two of Phase 180. The full behaviour of each arm lives in its
    // own suite; what THIS test pins is the dispatch: `import Foundation` in
    // a repository that also has a package.json must never reach the script
    // arm, where a name Node happens to ship or the manifest happens to
    // declare could read external and leave a must-not promise green. The
    // platform answers below are each language's own, and the unknown name
    // stays unresolved in all three.
    const c = ctx();
    expect(resolveImport('Foundation', 'ios/Main.swift', 'swift', c)).toEqual({
      toPath: null,
      resolution: 'external'
    });
    expect(
      resolveImport('kotlin.math.abs', 'android/App.kt', 'kotlin', c)
    ).toEqual({ toPath: null, resolution: 'external' });
    expect(
      resolveImport('<Foundation/Foundation.h>', 'mac/Renderer.m', 'objc', c)
    ).toEqual({ toPath: null, resolution: 'external' });
    for (const [specifier, from, language] of [
      ['NoSuchKit', 'ios/Main.swift', 'swift'],
      ['dev.nowhere.Thing', 'android/App.kt', 'kotlin'],
      ['Missing.h', 'mac/Renderer.m', 'objc'],
      // zustand IS declared in the fixture package.json: the script arm
      // would answer external for all three of these, and none may.
      ['zustand', 'ios/Main.swift', 'swift'],
      ['zustand', 'android/App.kt', 'kotlin'],
      ['zustand.h', 'mac/Renderer.m', 'objc']
    ] as const) {
      expect(resolveImport(specifier, from, language, c)).toEqual({
        toPath: null,
        resolution: 'unresolved'
      });
    }
  });

  it('collapses several specifiers on one line that share an answer', () => {
    // `from .schemas import A, B, C` yields four specifiers and one answer when
    // the names are classes rather than submodules. Keeping four facts would
    // count one import four times and list one line four times in a promise's
    // offending list. The shortest specifier survives, which is what the author
    // wrote. A name that really is a submodule has a DIFFERENT answer and stays.
    const rows = [
      { fromPath: 'py/app.py', line: 3, specifier: '.schemas', toPath: 'py/schemas.py', resolution: 'first-party' as const, language: 'python' as const },
      { fromPath: 'py/app.py', line: 3, specifier: '.schemas.A', toPath: 'py/schemas.py', resolution: 'first-party' as const, language: 'python' as const },
      { fromPath: 'py/app.py', line: 3, specifier: '.schemas.B', toPath: 'py/schemas.py', resolution: 'first-party' as const, language: 'python' as const },
      { fromPath: 'py/app.py', line: 4, specifier: '.routes', toPath: 'py/routes/__init__.py', resolution: 'first-party' as const, language: 'python' as const },
      { fromPath: 'py/app.py', line: 4, specifier: '.routes.auth', toPath: 'py/routes/auth.py', resolution: 'first-party' as const, language: 'python' as const }
    ];
    expect(collapseSameAnswer(rows).map((r) => r.specifier)).toEqual([
      '.schemas',
      '.routes',
      '.routes.auth'
    ]);
  });

  it('names every language the scanner can produce, so none falls to the script arm', () => {
    // `languageOf` in ../scan.ts ends in a default branch that answers
    // `'typescript'`. A grammar added to ../../symbols/languages.ts and left out
    // of `ArchResolverLanguage` is therefore read by the SCRIPT arm, which is
    // worse than not reading it at all. This is the unit test half of the same
    // assertion `npm run conformance:arch` makes.
    const fromGrammars = new Set(
      GRAMMARS.map((g) => (g === 'tsx' ? 'typescript' : g))
    );
    const fromMatrix = new Set(RESOLVER_MATRIX.map((r) => r.language));
    expect([...fromGrammars].sort()).toEqual([...fromMatrix].sort());
  });
});
