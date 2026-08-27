/**
 * The Rust arm, over a Cargo manifest on disk and a tracked file list
 * (Phase 157).
 *
 * The cases here are the four `use` shapes, the three module file shapes, the
 * four kinds of crate root, and then the ones that matter more than any of
 * them: every place the arm could answer `external` and must not, and the
 * checker level proof that a `must-not` promise a repository really breaks is
 * reported as broken rather than green.
 *
 * The last describe block is the attack. It is not that the arm crashes. It is
 * that a wrong `external` renders as a KEPT PROMISE, and the block proves both
 * halves: the arm answers first party where the crossing is real, and the same
 * contract goes green the moment a fact wears `external` instead.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ArchComponent, ArchEdge } from '@shared/arch';
import { checkImports, type ArchFactBase, type ArchImportFact } from '../checkers';
import { archResolveContext, resolveImport } from '../resolver';
import { readArchManifests } from '../resolver/manifest';
import { readCargoManifest, type CargoManifest } from '../resolver/cargo';
import { parseUseTree, resolveRust, resolveRustWith } from '../resolver/rust';

/**
 * One imaginary crate that wears every shape herdr wears.
 *
 * `src/app.rs` holds its children in `src/app/` with NO `mod.rs`, which is the
 * shape a reader forgets and the one that loses thirteen files in herdr.
 * `src/layout/mod.rs` is the other shape. `tests/it.rs` and `build.rs` are
 * crate roots of their own, and `vendor/patched/` is a crate reached only
 * through `[patch.crates-io]`.
 */
const FILES = [
  'Cargo.toml',
  'build.rs',
  'src/main.rs',
  'src/app.rs',
  'src/app/inner.rs',
  'src/app/forward.rs',
  'src/app/forward/deep.rs',
  'src/layout/mod.rs',
  'src/layout/grid.rs',
  'src/store.rs',
  'src/util.rs',
  'tests/it.rs',
  'tests/support/mod.rs',
  'vendor/patched/Cargo.toml',
  'vendor/patched/src/lib.rs'
];

let root: string;
let cargo: CargoManifest | null;
const files = new Set(FILES);

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'gmux-arch-rust-'));
  mkdirSync(join(root, 'vendor', 'patched'), { recursive: true });
  writeFileSync(
    join(root, 'Cargo.toml'),
    [
      '# a comment with a ] and a [ in it',
      '[package]',
      'name = "fixture-app"',
      'version = "0.1.0"',
      '',
      '[dependencies]',
      'serde = { version = "1", features = ["derive"] }',
      'portable-pty = "=0.9.0"',
      'ratatui = { version = "0.30", features = [',
      '    "unstable-rendered-line-info",',
      '] }',
      '',
      '[dev-dependencies]',
      'tempfile = "3"',
      '',
      '[build-dependencies]',
      'cc = "1"',
      '',
      "[target.'cfg(windows)'.dependencies]",
      'windows-sys = { version = "0.61" }',
      '',
      '[patch.crates-io]',
      'patched = { path = "vendor/patched" }',
      ''
    ].join('\n')
  );
  writeFileSync(
    join(root, 'vendor', 'patched', 'Cargo.toml'),
    '[package]\nname = "patched"\nversion = "0.9.0"\n'
  );
  cargo = readCargoManifest(root);
});

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

const answer = (specifier: string, fromPath: string, depth?: number) =>
  resolveRustWith(
    specifier,
    fromPath,
    cargo,
    files,
    depth === undefined ? {} : { inlineModuleDepth: depth }
  );

describe('the Cargo reader', () => {
  it('reads the package name, every dependency table, and the patched path', () => {
    expect([...(cargo?.crates.keys() ?? [])]).toEqual(['fixture_app']);
    expect([...(cargo?.dependencies ?? [])].sort()).toEqual([
      'cc',
      'portable_pty',
      'ratatui',
      'serde',
      'tempfile',
      'windows_sys'
    ]);
    expect([...(cargo?.pathDependencies ?? [])]).toEqual([
      ['patched', 'vendor/patched']
    ]);
  });

  it('turns a hyphen into an underscore, because that is what a use line writes', () => {
    // `portable-pty` in the manifest is `portable_pty` in every use line, and
    // an arm that compared the raw name would call eighteen of herdr's imports
    // unresolved for no reason at all.
    expect(cargo?.dependencies.has('portable_pty')).toBe(true);
    expect(cargo?.dependencies.has('portable-pty')).toBe(false);
  });

  it('answers null for a repository with no Cargo.toml', () => {
    expect(readCargoManifest(join(root, 'vendor'))).toBeNull();
  });
});

describe('the four use shapes', () => {
  it('resolves crate:: to a module file and to a mod.rs', () => {
    expect(answer('crate::store::Thing', 'src/app/inner.rs')).toEqual({
      toPath: 'src/store.rs',
      resolution: 'first-party'
    });
    expect(answer('crate::layout::Grid', 'src/app/inner.rs')).toEqual({
      toPath: 'src/layout/mod.rs',
      resolution: 'first-party'
    });
    expect(answer('crate::layout::grid::Cell', 'src/app/inner.rs')).toEqual({
      toPath: 'src/layout/grid.rs',
      resolution: 'first-party'
    });
  });

  it('resolves self:: against the file own module', () => {
    expect(answer('self::inner::Thing', 'src/app.rs')).toEqual({
      toPath: 'src/app/inner.rs',
      resolution: 'first-party'
    });
  });

  it('resolves super:: when the module tree leaves one reading standing', () => {
    // From `src/app/inner.rs` the parent module is `src/app.rs`, and `forward`
    // is a module under it. The other reading, the one where this line sits
    // inside an inline `mod`, finds no `src/app/inner/forward.rs`, so the tree
    // has picked.
    expect(answer('super::forward::Thing', 'src/app/inner.rs')).toEqual({
      toPath: 'src/app/forward.rs',
      resolution: 'first-party'
    });
  });

  it('resolves a bare head that names a module of this file or of the crate root', () => {
    expect(answer('inner::Thing', 'src/app.rs')).toEqual({
      toPath: 'src/app/inner.rs',
      resolution: 'first-party'
    });
    expect(answer('store::Thing', 'src/app/inner.rs')).toEqual({
      toPath: 'src/store.rs',
      resolution: 'first-party'
    });
  });

  it('resolves the crate own name to its root file', () => {
    expect(answer('fixture_app::store::Thing', 'tests/it.rs')).toEqual({
      toPath: 'src/store.rs',
      resolution: 'first-party'
    });
  });
});

describe('the module file shapes and the crate roots', () => {
  it('finds the children of an x.rs that has no mod.rs beside them', () => {
    // herdr's `src/api/schema.rs` holds thirteen children in `src/api/schema/`
    // with no `mod.rs`. An arm that only knew the `mod.rs` shape loses all of
    // them.
    expect(answer('crate::app::inner::Thing', 'src/main.rs')).toEqual({
      toPath: 'src/app/inner.rs',
      resolution: 'first-party'
    });
  });

  it('treats a direct child of tests as its own crate root', () => {
    // `use support::helper` inside `tests/it.rs` names `tests/support/mod.rs`,
    // because that test file is a crate of its own and `support` is its module.
    expect(answer('support::helper', 'tests/it.rs')).toEqual({
      toPath: 'tests/support/mod.rs',
      resolution: 'first-party'
    });
    // And `crate::` inside that same file is the test file, never src/main.rs.
    expect(answer('crate::support::helper', 'tests/it.rs')).toEqual({
      toPath: 'tests/support/mod.rs',
      resolution: 'first-party'
    });
  });

  it('treats build.rs as its own crate root and never as part of src', () => {
    // `crate::` inside a build script is the build script. `store` is not a
    // module of it, so the walk stops where it started and the answer is
    // build.rs itself. An arm that folded build.rs into `src` would answer
    // `src/store.rs` and draw an edge the crate does not have.
    expect(answer('crate::store::Thing', 'build.rs')).toEqual({
      toPath: 'build.rs',
      resolution: 'first-party'
    });
  });

  it('answers the crate root file when the whole path is items', () => {
    expect(answer('crate::Thing', 'src/app.rs')).toEqual({
      toPath: 'src/main.rs',
      resolution: 'first-party'
    });
  });
});

describe('the stated limit', () => {
  it('stops the walk at the first segment that names no module', () => {
    // `Cell` is an item. The arm answers the file that carries it and claims
    // nothing about the item itself.
    expect(answer('crate::layout::grid::Cell::new', 'src/app.rs')).toEqual({
      toPath: 'src/layout/grid.rs',
      resolution: 'first-party'
    });
  });

  it('resolves a re-export chain to the file that FORWARDS, not the one that defines', () => {
    // `src/app/forward.rs` re-exports from `src/app/forward/deep.rs`, which
    // re-exports again. A module level reader is sent to the forwarder, which
    // is `forward.rs`, because following the chain would mean resolving items.
    expect(answer('crate::app::forward::Deep', 'src/main.rs')).toEqual({
      toPath: 'src/app/forward.rs',
      resolution: 'first-party'
    });
  });

  it('resolves a glob to the module it hangs off', () => {
    expect(answer('crate::layout::*', 'src/app.rs')).toEqual({
      toPath: 'src/layout/mod.rs',
      resolution: 'first-party'
    });
  });

  it('drops an as alias, which is a local name and never a path', () => {
    expect(answer('crate::store::Thing as Other', 'src/app.rs')).toEqual({
      toPath: 'src/store.rs',
      resolution: 'first-party'
    });
  });
});

describe('the use tree', () => {
  it('expands a brace group and answers when every branch agrees', () => {
    expect(answer('crate::store::{Thing, Other}', 'src/app.rs')).toEqual({
      toPath: 'src/store.rs',
      resolution: 'first-party'
    });
  });

  it('reads a brace group written over several lines', () => {
    expect(
      answer('crate::store::{\n    Thing,\n    Other,\n}', 'src/app.rs')
    ).toEqual({ toPath: 'src/store.rs', resolution: 'first-party' });
  });

  it('reads self inside a brace group as the prefix itself', () => {
    expect(answer('crate::layout::{self, grid}', 'src/app.rs')).toEqual({
      toPath: null,
      resolution: 'unresolved'
    });
    expect(answer('crate::layout::{self, Grid}', 'src/app.rs')).toEqual({
      toPath: 'src/layout/mod.rs',
      resolution: 'first-party'
    });
  });

  it('answers unresolved when the branches name two different modules', () => {
    // This is two edges and the fact base holds one. Reporting either would
    // hide the other, which is the false green this whole arm is written
    // against.
    expect(answer('crate::{store, util}', 'src/app.rs')).toEqual({
      toPath: null,
      resolution: 'unresolved'
    });
  });

  it('expands a nested tree', () => {
    expect(parseUseTree('crate::a::{b::{c, d}, e}')).toEqual([
      ['crate', 'a', 'b', 'c'],
      ['crate', 'a', 'b', 'd'],
      ['crate', 'a', 'e']
    ]);
  });
});

describe('the rule that binds this arm: never external when it cannot answer', () => {
  it('calls the standard library and a DECLARED dependency external', () => {
    expect(answer('std::io::Write', 'src/app.rs')).toEqual({
      toPath: null,
      resolution: 'external'
    });
    expect(answer('serde::Serialize', 'src/app.rs')).toEqual({
      toPath: null,
      resolution: 'external'
    });
    // A dev dependency, a build dependency and a target gated one all count,
    // because the repository declared all three.
    expect(answer('tempfile::TempDir', 'tests/it.rs').resolution).toBe('external');
    expect(answer('cc::Build', 'build.rs').resolution).toBe('external');
    expect(answer('windows_sys::Win32', 'src/app.rs').resolution).toBe('external');
  });

  it('calls a bare head NO manifest declares unresolved, never external', () => {
    expect(answer('nobody_declared_this::Thing', 'src/app.rs')).toEqual({
      toPath: null,
      resolution: 'unresolved'
    });
  });

  it('calls a PATCHED crate whose source is tracked FIRST PARTY, never external', () => {
    // herdr reaches portable-pty this way and its source is in the repository,
    // so eighteen imports of it are real crossings. Answering external would
    // hide every one of them.
    expect(answer('patched::PtySize', 'src/app.rs')).toEqual({
      toPath: 'vendor/patched/src/lib.rs',
      resolution: 'first-party'
    });
  });

  it('answers nothing external at all when there is no Cargo.toml', () => {
    for (const specifier of [
      'serde::Serialize',
      'anything::At::All',
      'crate::store::Thing'
    ]) {
      expect(resolveRustWith(specifier, 'src/app.rs', null, files).resolution).not.toBe(
        'external'
      );
    }
    // The standard library is the one compiled in list, and it is still a
    // definite answer because no manifest can declare or vendor it.
    expect(resolveRustWith('std::io', 'src/app.rs', null, files).resolution).toBe(
      'external'
    );
  });

  it('answers unresolved for a crate this repository holds whose root is untracked', () => {
    const thin = new Set(FILES.filter((f) => f !== 'vendor/patched/src/lib.rs'));
    expect(resolveRustWith('patched::PtySize', 'src/app.rs', cargo, thin)).toEqual({
      toPath: null,
      resolution: 'unresolved'
    });
  });
});

describe('the hostile fixture', () => {
  const hostile: [string, string][] = [
    ['a path holding a leading dash', '-crate::store'],
    ['a segment holding a dash', 'crate::sto-re::Thing'],
    ['a path walking out of the repository', 'crate::..::..::etc::passwd'],
    ['an absolute path', '/etc/passwd'],
    ['a path that is only separators', '::::'],
    ['an empty specifier', ''],
    ['whitespace only', '   \n  '],
    ['a shell fragment', 'crate::store; rm -rf /'],
    ['a backtick fragment', 'crate::`whoami`'],
    ['an unclosed brace', 'crate::store::{Thing'],
    ['a stray closing brace', 'crate::store::Thing}'],
    ['text after the brace group', 'crate::store::{Thing} and more'],
    // Over the reader's own 4,096 character cap. It used to be 512 and it was
    // raised in Phase 157's fix round, because the extractor was dropping every
    // real `use` tree longer than 512 characters in silence and a dropped import
    // leaves a `must-not` promise green. A path THIS long still buys nothing but
    // work, so the reader still refuses it.
    ['a very long path', `crate::${'a::'.repeat(1400)}Thing`]
  ];

  for (const [name, specifier] of hostile) {
    it(`refuses ${name} without a first party or external answer`, () => {
      expect(answer(specifier, 'src/app.rs')).toEqual({
        toPath: null,
        resolution: 'unresolved'
      });
    });
  }

  it('answers the crate root for a path whose segments name nothing, which is the walk\'s own rule', () => {
    // NOT A HOSTILE CASE, and it is written down here so a later round does not
    // mistake it for one. The walk stops at the first segment that names neither
    // a file nor a directory and answers with the last file that did, because
    // the tail of a use path is an ITEM rather than a module. So a made up path
    // under `crate::` answers the crate root, exactly as `crate::Thing` does.
    // The long path above passed for a while because it was over the length cap
    // rather than because the reader refused its shape, and raising that cap is
    // what made the difference visible.
    expect(answer('crate::nothing::like::this::Thing', 'src/app.rs').resolution).toBe(
      'first-party'
    );
  });

  it('refuses to walk above the crate root however many supers are written', () => {
    expect(answer('super::super::super::super::Thing', 'src/app/inner.rs')).toEqual({
      toPath: null,
      resolution: 'unresolved'
    });
    expect(answer('super::Thing', 'src/main.rs')).toEqual({
      toPath: 'src/main.rs',
      resolution: 'first-party'
    });
  });

  it('never answers with a path outside the tracked file list', () => {
    for (const [, specifier] of hostile) {
      const one = answer(specifier, 'src/app.rs');
      if (one.toPath !== null) expect(files.has(one.toPath)).toBe(true);
    }
  });
});

describe('the ambiguity an inline module creates', () => {
  it('answers unresolved when both readings of super are alive', () => {
    // `use super::*` inside `#[cfg(test)] mod tests` names this file. At the
    // top level it names the parent. Nothing in the fact base says which, and
    // 172 of herdr's 349 super lines are the first kind, so a build that
    // guessed would publish 172 edges that do not exist.
    expect(answer('super::*', 'src/app/inner.rs')).toEqual({
      toPath: null,
      resolution: 'unresolved'
    });
  });

  it('answers definitely once the caller says how deep the line sits', () => {
    expect(answer('super::*', 'src/app/inner.rs', 0)).toEqual({
      toPath: 'src/app.rs',
      resolution: 'first-party'
    });
    expect(answer('super::*', 'src/app/inner.rs', 1)).toEqual({
      toPath: 'src/app/inner.rs',
      resolution: 'first-party'
    });
  });
});

describe('the arm through the dispatcher', () => {
  it('reaches the same answer through resolveRust and through resolveImport', () => {
    const manifests = { ...readArchManifests(root), cargo };
    const ctx = archResolveContext(manifests, FILES);
    expect(resolveRust('crate::store::Thing', 'src/app.rs', ctx)).toEqual({
      toPath: 'src/store.rs',
      resolution: 'first-party'
    });
    // Until the spine dispatches rust to this arm the shipped answer is still
    // the deferred one, and this asserts whichever of the two is true rather
    // than pinning the arm's own answer twice.
    const through = resolveImport('crate::store::Thing', 'src/app.rs', 'rust', ctx);
    expect(['unverifiable', 'first-party']).toContain(through.resolution);
  });
});

// ---------------------------------------------------------------------------
// The attack: a must-not promise that IS broken must not read as kept
// ---------------------------------------------------------------------------

const component = (over: Partial<ArchComponent>): ArchComponent => ({
  id: 'app',
  name: 'app',
  kind: 'component',
  layer: 'surface',
  provenance: 'first-party',
  anchors: ['src/app'],
  boundary: 'open',
  description: '',
  evidence: [],
  deprecated: false,
  gaps: [],
  ...over
});

const mustNot: ArchEdge = {
  id: 'app-must-not-store',
  from: 'app',
  to: 'store',
  kind: 'imports',
  rule: 'must-not',
  checker: 'imports',
  evidence: []
};

function factsFrom(imports: ArchImportFact[]): ArchFactBase {
  return {
    contract: {
      version: 1,
      subject: 'a rust crate',
      strictness: 'not-wrong',
      layers: [{ id: 'surface', name: 'surface', order: 0 }],
      flows: []
    },
    components: [
      component({ id: 'app', anchors: ['src/app', 'src/app.rs'] }),
      component({ id: 'store', anchors: ['src/store.rs'] })
    ],
    edges: [mustNot],
    baseline: { accepted: [] },
    trackedFiles: FILES,
    imports,
    manifest: { names: new Set<string>(), filesRead: [] },
    headBytes: new Map<string, string | null>(),
    commitsBehind: new Map<string, number>(),
    uncommittedFiles: new Map<string, number>(),
    headCommit: '0123456789abcdef0123456789abcdef01234567',
    unparsed: []
  };
}

/** One real answer from the arm, turned into the fact the checkers read. */
function factFor(specifier: string, fromPath: string): ArchImportFact {
  const one = answer(specifier, fromPath);
  return {
    fromPath,
    specifier,
    line: 1,
    toPath: one.resolution === 'first-party' ? one.toPath : null,
    resolution: one.resolution,
    reason: null
  };
}

describe('the false green, which is what this arm exists to prevent', () => {
  it('reports a must-not promise the crate really breaks as BROKEN', () => {
    const result = checkImports(
      factsFrom([factFor('crate::store::Thing', 'src/app/inner.rs')])
    );
    expect(result.verdicts[0]?.status).toBe('divergent');
    expect(result.verdicts[0]?.offending?.[0]?.toPath).toBe('src/store.rs');
  });

  it('leaves a must-not promise the crate keeps alone', () => {
    const result = checkImports(
      factsFrom([
        factFor('crate::layout::Grid', 'src/app/inner.rs'),
        factFor('std::io::Write', 'src/app/inner.rs'),
        factFor('serde::Serialize', 'src/app/inner.rs')
      ])
    );
    expect(result.verdicts[0]?.status).toBe('convergent');
  });

  it('goes green the moment that same import wears external, which is the whole stake', () => {
    // The control. Nothing else changes: the same specifier, the same file,
    // the same contract. Only the answer moves from first party to external,
    // and a promise the crate breaks reads as kept.
    const wrong: ArchImportFact = {
      fromPath: 'src/app/inner.rs',
      specifier: 'crate::store::Thing',
      line: 1,
      toPath: null,
      resolution: 'external',
      reason: null
    };
    expect(checkImports(factsFrom([wrong])).verdicts[0]?.status).toBe('convergent');
    // And the arm never produces that answer for this specifier.
    expect(answer('crate::store::Thing', 'src/app/inner.rs').resolution).toBe(
      'first-party'
    );
  });

  it('holds the verdict grey rather than green when the arm could not answer', () => {
    const result = checkImports(
      factsFrom([factFor('super::*', 'src/app/inner.rs')])
    );
    expect(result.verdicts[0]?.status).toBe('unverifiable');
  });
});
