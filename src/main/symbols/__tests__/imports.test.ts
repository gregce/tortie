/**
 * The import layer of the five hand-authored tags queries (Phase 63).
 *
 * It is the sibling of extract.test.ts and it exists for the same reason: gmux
 * owns these queries, so a grammar bump inside `@vscode/tree-sitter-wasm` that
 * renames a node breaks THIS FILE loudly, instead of quietly emptying the arch
 * view's fact base. An empty fact base is the worst possible failure here,
 * because under the conservative verdict rule every promise then reports
 * `unverifiable` and the view looks like a project nobody can check rather than
 * a build whose extractor stopped working.
 *
 * The two rules in queries.ts are both asserted below. Rule 1 is the plain
 * JavaScript case, which must find its imports without any TypeScript-only
 * node. Rule 2 is the capture table, and an import form missing from it would
 * be dropped in silence.
 */

import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import type { GrammarId } from '../languages';
import { SymbolExtractor } from '../extract';
import { IMPORT_BY_CAPTURE } from '../queries';

const require_ = createRequire(import.meta.url);
const grammarDir = dirname(require_.resolve('@vscode/tree-sitter-wasm'));
const runtimeWasm = require_.resolve('web-tree-sitter/web-tree-sitter.wasm');

const extractorPromise = SymbolExtractor.create({
  runtimeWasm,
  grammarPath: (id: GrammarId) => join(grammarDir, `tree-sitter-${id}.wasm`)
});

async function importsOf(relPath: string, source: string): Promise<string[]> {
  const extractor = await extractorPromise;
  const found = await extractor.extractAll(relPath, source);
  return found.imports.map((i) => i.specifier);
}

describe('the import captures', () => {
  it('finds every TypeScript import form, including the two nobody remembers', async () => {
    const source = `
import { a } from './a';
import type { B } from '@shared/b';
import * as path from 'node:path';
import './side-effect';
export { d } from './d';
export * from './e';
const f = require('./f');
const g = await import('./g');
import h = require('./h');
`;
    expect((await importsOf('x.ts', source)).sort()).toEqual([
      './a',
      './d',
      './e',
      './f',
      './g',
      './h',
      './side-effect',
      '@shared/b',
      'node:path'
    ]);
  });

  it('finds imports on plain JavaScript, which is rule 1 of the header', async () => {
    const source = `
import { a } from './a';
const f = require('./f');
const g = await import('./g');
export { d } from './d';
`;
    expect((await importsOf('x.js', source)).sort()).toEqual([
      './a',
      './d',
      './f',
      './g'
    ]);
  });

  it('does not mistake every one string call for a require', async () => {
    // Without the `#eq?` predicate this pattern matches thousands of ordinary
    // calls per repository, and every one of them would enter the fact base as
    // an import of something that is not a module.
    const source = `
const log = getLog('watcher');
describe('a thing', () => {});
const f = require('./real');
`;
    expect(await importsOf('x.ts', source)).toEqual(['./real']);
  });

  it('strips the quotes off a Go import, which has no string fragment node', async () => {
    const source = `
package main

import "fmt"

import (
  "os"
  alias "github.com/foo/bar"
)
`;
    expect((await importsOf('x.go', source)).sort()).toEqual([
      'fmt',
      'github.com/foo/bar',
      'os'
    ]);
  });

  it('captures Python imports rather than dropping them, so they can be counted', async () => {
    const source = `
import os
import os.path as p
from . import sibling
from .rel import thing
from pkg.mod import other
`;
    expect((await importsOf('x.py', source)).sort()).toEqual([
      '.',
      '.rel',
      'os',
      'os.path',
      'pkg.mod'
    ]);
  });

  it('captures Rust imports rather than dropping them, for the same reason', async () => {
    const source = `
use std::collections::HashMap;
use crate::foo::bar;
extern crate serde;
`;
    expect((await importsOf('x.rs', source)).sort()).toEqual([
      'crate::foo::bar',
      'serde',
      'std::collections::HashMap'
    ]);
  });

  it('reports the line the specifier sits on, which is what a jump lands on', async () => {
    const found = await (
      await extractorPromise
    ).extractAll('x.ts', "\n\nimport { a } from './a';\n");
    expect(found.imports).toEqual([
      { specifier: './a', line: 3, form: 'static' }
    ]);
  });

  it('finds symbols and imports out of ONE walk, with neither disturbing the other', async () => {
    const found = await (
      await extractorPromise
    ).extractAll(
      'x.ts',
      "import { a } from './a';\nexport function go(): void {}\n"
    );
    expect(found.symbols.map((s) => s.name)).toEqual(['go']);
    expect(found.imports.map((i) => i.specifier)).toEqual(['./a']);
  });

  it('maps every import form it can capture, which is rule 2 of the header', async () => {
    expect(Object.keys(IMPORT_BY_CAPTURE).sort()).toEqual([
      'import.dynamic',
      'import.reexport',
      'import.require',
      'import.static'
    ]);
  });
});
