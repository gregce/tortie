/**
 * The call layer of the tags queries (Phase 257, research 118 §6).
 *
 * The sibling of extract.test.ts and imports.test.ts, for the same reason
 * both exist: gmux owns the queries and the node to record work in calls.ts,
 * so a grammar bump that renames a node or moves a field breaks THIS FILE
 * loudly instead of quietly emptying the fact base. An empty fact base is the
 * worst failure here, because every surface would then say `0 found` about a
 * repository that has hundreds.
 *
 * One probe per exercised grammar, asserting one call, one construction and
 * one decorator, attribute or macro where the grammar has one, with the
 * callee, its split, the string arguments and the count read back exactly.
 * The values are the prototype's own (`build/p256/det/parse.mts`), which is
 * what the 79% and the 229 of 229 were measured with, so a change here is a
 * change to a measured number.
 */

import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { SymbolExtractor } from '../extract';
import type { ExtractedCall } from '../extract';
import { MAX_CALLS_PER_FILE, unquoteLiteral } from '../calls';
import { CALL_BY_CAPTURE } from '../queries';
import { grammarPath } from '../paths';
import { importAliases } from '../wrappers';

const require_ = createRequire(import.meta.url);
const runtimeWasm = require_.resolve('web-tree-sitter/web-tree-sitter.wasm');

const extractorPromise = SymbolExtractor.create({ runtimeWasm, grammarPath });

async function callsOf(relPath: string, source: string): Promise<ExtractedCall[]> {
  const extractor = await extractorPromise;
  return (await extractor.extractAll(relPath, source, { calls: true })).calls;
}

function one(calls: ExtractedCall[], callee: string, form?: ExtractedCall['form']): ExtractedCall {
  const hit = calls.find((c) => c.callee === callee && (form === undefined || c.form === form));
  if (hit === undefined) {
    throw new Error(`no ${form ?? ''} site with callee ${callee} among ${calls.map((c) => `${c.form}:${c.callee}`).join(', ')}`);
  }
  return hit;
}

describe('the call captures, per grammar', () => {
  it('reads a TypeScript call, a construction and a decorator', async () => {
    const calls = await callsOf(
      'a.ts',
      [
        "@dec('x')",
        'class A { @m x() {} }',
        "ipcMain.handle('a:b', fn);",
        "new Worker('w.js');",
        'new Foo;',
        'fetch(`https://u`, { a: 1 });'
      ].join('\n')
    );
    expect(one(calls, 'ipcMain.handle')).toMatchObject({
      last: 'handle',
      recv: 'ipcMain',
      args: ['a:b', ''],
      argc: 2,
      line: 3,
      form: 'call'
    });
    expect(one(calls, 'Worker', 'new')).toMatchObject({ args: ['w.js'], argc: 1, line: 4 });
    expect(one(calls, 'Foo', 'new')).toMatchObject({ args: [], argc: 0 });
    expect(one(calls, 'dec', 'decorator')).toMatchObject({ args: ['x'], argc: 1, line: 1 });
    expect(one(calls, 'm', 'decorator')).toMatchObject({ args: [], argc: 0, line: 2 });
    // A template string is a string argument too.
    expect(one(calls, 'fetch')).toMatchObject({ args: ['https://u', ''], argc: 2 });
  });

  it('reads the same shapes on plain JavaScript (rule 1 of queries.ts)', async () => {
    const calls = await callsOf('a.js', "app.get('/x', h);\nnew Server(opts);");
    expect(one(calls, 'app.get')).toMatchObject({ last: 'get', recv: 'app', args: ['/x', ''], argc: 2 });
    expect(one(calls, 'Server', 'new')).toMatchObject({ args: [''], argc: 1 });
  });

  it('reads a Python call and a decorator, wrapping a call or a bare name', async () => {
    const calls = await callsOf(
      'a.py',
      ["@router.get('/p', x=1)", 'def f():', "    subprocess.run(['ls'])", '@click.command', 'def g(): pass'].join('\n')
    );
    // The decorator and the call it wraps are BOTH recorded, at one line; the
    // rule table's cross rule dedupe is what keeps them one fact.
    expect(one(calls, 'router.get', 'decorator')).toMatchObject({ last: 'get', recv: 'router', args: ['/p', ''], argc: 2, line: 1 });
    expect(one(calls, 'router.get', 'call')).toMatchObject({ line: 1 });
    expect(one(calls, 'subprocess.run')).toMatchObject({ last: 'run', recv: 'subprocess', args: ['ls'], argc: 1, line: 3 });
    expect(one(calls, 'click.command', 'decorator')).toMatchObject({ last: 'command', recv: 'click', args: [], argc: 0, line: 4 });
  });

  it('reads a Go call and a composite literal as its construction', async () => {
    const calls = await callsOf('a.go', 'package m\nfunc main() { g.GET("/x", h); x := &T{A: 1}; exec.Command("git", "a") }');
    expect(one(calls, 'g.GET')).toMatchObject({ last: 'GET', recv: 'g', args: ['/x', ''], argc: 2 });
    expect(one(calls, 'exec.Command')).toMatchObject({ last: 'Command', recv: 'exec', args: ['git', 'a'], argc: 2 });
    expect(one(calls, 'T', 'new')).toMatchObject({ args: [], argc: 0 });
  });

  it('reads a Rust call, both attribute shapes and a macro', async () => {
    const calls = await callsOf(
      'a.rs',
      ['#![allow(x)]', '#[test]', 'fn a() { Command::new("rg"); println!("x {}", 1); thread::spawn(|| {}); }', '#[tokio::test]', 'async fn b() {}'].join('\n')
    );
    expect(one(calls, 'Command::new')).toMatchObject({ last: 'new', recv: 'Command', args: ['rg'], argc: 1, line: 3 });
    expect(one(calls, 'thread::spawn')).toMatchObject({ last: 'spawn', recv: 'thread', argc: 1 });
    expect(one(calls, 'allow', 'attribute')).toMatchObject({ line: 1 });
    expect(one(calls, 'test', 'attribute')).toMatchObject({ recv: '', line: 2 });
    expect(one(calls, 'tokio::test', 'attribute')).toMatchObject({ last: 'test', recv: 'tokio', line: 4 });
    // A macro keeps its bang, and its token tree is read for strings.
    expect(one(calls, 'println!', 'macro')).toMatchObject({ args: ['x {}', ''], argc: 2 });
  });

  it('reads a Ruby call with a symbol as a literal, colon on, and the receiver in front of the method', async () => {
    const calls = await callsOf(
      'a.rb',
      ['get :activity', 'post "/x", to: "a#b"', 'resources :users', 'system("ls")', 'Foo.bar(1)', "ENV.fetch('X')", 'Net::HTTP.new("h")', 'Rails.application.routes.draw'].join('\n')
    );
    expect(one(calls, 'get')).toMatchObject({ args: [':activity'], argc: 1, line: 1 });
    // A pair's VALUE is the argument's string.
    expect(one(calls, 'post')).toMatchObject({ args: ['/x', 'a#b'], argc: 2 });
    expect(one(calls, 'resources')).toMatchObject({ args: [':users'] });
    expect(one(calls, 'system')).toMatchObject({ recv: '', args: ['ls'] });
    // THE ONE DIVERGENCE FROM THE PROTOTYPE: Ruby's `call` holds the receiver
    // in a field of its own, and reading the `method` field alone made
    // `ENV.fetch('X')` a bare `fetch`, which was 195 of mastodon's 365
    // network facts (the Phase 257 fix round). The receiver is composed in
    // front, as it is for every other grammar's dotted callee.
    expect(one(calls, 'Foo.bar')).toMatchObject({ last: 'bar', recv: 'Foo', args: [''], argc: 1 });
    expect(one(calls, 'ENV.fetch')).toMatchObject({ last: 'fetch', recv: 'ENV', args: ['X'] });
    expect(one(calls, 'Net::HTTP.new')).toMatchObject({ last: 'new', recv: 'HTTP', args: ['h'] });
    expect(one(calls, 'Rails.application.routes.draw')).toMatchObject({ last: 'draw', recv: 'routes' });
    expect(calls.some((c) => c.callee === 'bar' || c.callee === 'fetch')).toBe(false);
  });

  it('reads a Swift call through its suffix and an attribute with the at sign off', async () => {
    const calls = await callsOf(
      'a.swift',
      ['@main', 'struct A {}', '@Test func c() {}', 'let t = URLSession.shared.dataTask(with: url)', 'Process().run()', 'print("hi", 2)'].join('\n')
    );
    expect(one(calls, 'main', 'attribute')).toMatchObject({ line: 1 });
    expect(one(calls, 'Test', 'attribute')).toMatchObject({ line: 3 });
    expect(one(calls, 'URLSession.shared.dataTask')).toMatchObject({ last: 'dataTask', recv: 'shared', argc: 1 });
    expect(one(calls, 'Process().run')).toMatchObject({ last: 'run', recv: 'Process' });
    expect(one(calls, 'print')).toMatchObject({ args: ['hi', ''], argc: 2 });
  });

  it('answers no call for the five grammars the corpus does not exercise (spec D4)', async () => {
    expect(await callsOf('a.java', 'class A { void f() { g(1); new B(); } }')).toEqual([]);
    expect(await callsOf('a.php', '<?php\nf(1); new B();')).toEqual([]);
    expect(await callsOf('a.cs', 'class A { void F() { G(1); new B(); } }')).toEqual([]);
    expect(await callsOf('a.kt', 'fun f() { g(1) }')).toEqual([]);
    expect(await callsOf('a.m', 'int f(void) { g(1); return 1; }')).toEqual([]);
  });

  it('describes nothing unless asked, and the symbols and imports are unchanged either way', async () => {
    const extractor = await extractorPromise;
    const source = "import { a } from './a';\nexport function f() { a('x'); }\n";
    const silent = await extractor.extractAll('x.ts', source);
    const asked = await extractor.extractAll('x.ts', source, { calls: true });
    expect(silent.calls).toEqual([]);
    expect(silent.callsTruncated).toBe(false);
    expect(asked.calls.map((c) => c.callee)).toEqual(['a']);
    expect(asked.symbols).toEqual(silent.symbols);
    expect(asked.imports).toEqual(silent.imports);
  });

  it('stops at MAX_CALLS_PER_FILE and says so', async () => {
    const big = Array.from({ length: MAX_CALLS_PER_FILE + 1 }, (_, i) => `f('x${i}');`).join('\n');
    const found = await (await extractorPromise).extractAll('big.ts', big, { calls: true });
    expect(found.calls).toHaveLength(MAX_CALLS_PER_FILE);
    expect(found.callsTruncated).toBe(true);
    const fits = Array.from({ length: 3 }, (_, i) => `f('x${i}');`).join('\n');
    expect((await (await extractorPromise).extractAll('ok.ts', fits, { calls: true })).callsTruncated).toBe(false);
  });

  it('maps every call capture to a form (rule 2 of queries.ts)', () => {
    expect(CALL_BY_CAPTURE).toEqual({
      'call.site': 'call',
      'call.new': 'new',
      'call.decorator': 'decorator',
      'call.attribute': 'attribute',
      'call.macro': 'macro'
    });
  });
});

describe('the one unquote', () => {
  it('strips one layer of delimiters and a prefix only when a quote follows it', () => {
    expect(unquoteLiteral('"a"')).toBe('a');
    expect(unquoteLiteral("'a'")).toBe('a');
    expect(unquoteLiteral('`a`')).toBe('a');
    expect(unquoteLiteral('r"a"')).toBe('a');
    expect(unquoteLiteral('r#"a"#')).toBe('a');
    expect(unquoteLiteral('br"a"')).toBe('a');
    expect(unquoteLiteral('f"a"')).toBe('a');
    expect(unquoteLiteral('@"a"')).toBe('a');
    expect(unquoteLiteral('"""a"""')).toBe('a');
    // A Python dotted name keeps its first letter: the prefix rule needs a quote.
    expect(unquoteLiteral('routes')).toBe('routes');
    expect(unquoteLiteral('rb')).toBe('rb');
    expect(unquoteLiteral('"#{dir}/x"')).toBe('#{dir}/x');
    expect(unquoteLiteral('<Foundation/Foundation.h>')).toBe('<Foundation/Foundation.h>');
  });
});

describe('the wrapper declaration walk', () => {
  async function wrappersOf(relPath: string, source: string) {
    return (await (await extractorPromise).extractAll(relPath, source, { wrappers: true })).wrappers;
  }

  it('records a forwarding into an anchor as hop 1, with the two indexes', async () => {
    const found = await wrappersOf('typed-ipc.ts', 'export function handle(ipc, channel, fn) {\n  ipc.handle(channel, fn);\n}\n');
    expect(found).toEqual([
      { name: 'handle', innerCallee: 'ipc.handle', innerLast: 'handle', paramIndex: 1, innerIndex: 0, hops: 1, line: 1 }
    ]);
  });

  it('resolves the import alias at extraction, so a second hop is reachable', async () => {
    const found = await wrappersOf(
      'ipc.ts',
      "import { handle as handleTyped } from './typed-ipc';\nfunction handle(channel, fn) {\n  handleTyped(ipcMain, channel, fn);\n}\n"
    );
    expect(found).toEqual([
      { name: 'handle', innerCallee: 'handleTyped', innerLast: 'handle', paramIndex: 0, innerIndex: 1, hops: 0, line: 2 }
    ]);
    expect(importAliases("import type { A as B, C } from 'x'; import { d as e } from 'y';")).toEqual(
      new Map([
        ['B', 'A'],
        ['e', 'd']
      ])
    );
  });

  it('records a forwarding into a plain function as an unresolved candidate, and none for a call that forwards no parameter', async () => {
    const found = await wrappersOf('a.ts', 'function a(x) { helper(x); }\nfunction b(y) { helper(1); }\n');
    expect(found).toEqual([{ name: 'a', innerCallee: 'helper', innerLast: 'helper', paramIndex: 0, innerIndex: 0, hops: 0, line: 1 }]);
  });

  it('walks nothing unless asked, and nothing outside the JavaScript family', async () => {
    const extractor = await extractorPromise;
    const ts = 'export function handle(ipc, channel, fn) { ipc.handle(channel, fn); }\n';
    expect((await extractor.extractAll('a.ts', ts)).wrappers).toEqual([]);
    expect((await extractor.extractAll('a.ts', ts, { calls: true })).wrappers).toEqual([]);
    const py = 'def handle(app, path, fn):\n    app.get(path, fn)\n';
    expect((await extractor.extractAll('a.py', py, { wrappers: true })).wrappers).toEqual([]);
    const go = 'package m\nfunc Handle(mux *Mux, p string, h Handler) { mux.HandleFunc(p, h) }\n';
    expect((await extractor.extractAll('a.go', go, { wrappers: true })).wrappers).toEqual([]);
  });
});
