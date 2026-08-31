/**
 * The regression suite for the nine hand-authored tags queries.
 *
 * This is the maintenance contract research 19 §7.2 asks for: gmux owns these
 * queries, so a grammar bump inside `@vscode/tree-sitter-wasm` that renames a
 * node breaks THIS FILE, loudly, instead of quietly emptying a user's ⌘⇧O.
 *
 * The 17-symbol probe is the one the research ran against upstream `tags.scm`,
 * where it scored 12/17. Every name below was a real miss or a real hit then;
 * the whole point of owning the queries is that it is now 17/17.
 */

import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { GRAMMARS } from '../languages';
import type { GrammarId } from '../languages';
import { SymbolExtractor } from '../extract';
import { grammarPath } from '../paths';

const require_ = createRequire(import.meta.url);
const runtimeWasm = require_.resolve('web-tree-sitter/web-tree-sitter.wasm');

const extractorPromise = SymbolExtractor.create({
  runtimeWasm,
  // paths.ts, not a hand-joined directory: since Phase 180 the vendored
  // grammars live in resources/tree-sitter while the rest ship in
  // node_modules, and paths.ts is the one module that knows which is which.
  grammarPath
});

const TS_SOURCE = `
export const OPEN_FILE_EVENT = 'gmux:open-file';
export const MAX_TABS = 10;
const MARKDOWN_MODES = ['preview', 'source'] as const;

export type EditorMode = 'file' | 'diff' | 'preview';
export type SidebarViewId = 'scm' | 'explorer' | 'search';

export interface EditorTab {
  id: string;
  path: string;
}

export enum Season {
  Spring = 'spring',
  Winter = 'winter'
}

export const useEditor = create<EditorState>()((set) => ({ set }));

export function requestOpenFile(req: OpenFileRequest): void {}

export function openFromRequest(req: OpenFileRequest): void {}

export const tabIdFor = (path: string): string => path;

export class ActivityBar {
  render(): void {}
  private readonly handle = (): void => {};
}

declare module 'virtual:thing' {
  export function registerFsIpc(): void;
}
`;

const GO_SOURCE = `
package stats

import "time"

const DefaultWindow = 7

var registry = map[string]int{}

type StatisticsCollector struct {
	Sessions int
	LastRun  time.Time
}

type Reporter interface {
	Report() error
}

type Handle = StatisticsCollector

func NewCollector() *StatisticsCollector { return &StatisticsCollector{} }

func (c *StatisticsCollector) AddSessionStats(n int) {
	localOnly := n * 2
	var alsoLocal = localOnly
	_ = alsoLocal
}
`;

const PY_SOURCE = `
API_ROOT = "https://example.test"

def load_config(path):
    inner = 1
    return inner

class Session:
    def start(self):
        pass

    @property
    def name(self):
        return "s"
`;

const RUST_SOURCE = `
pub const MAX_TABS: usize = 10;

pub struct Session {
    pub id: String,
}

pub enum Status {
    Idle,
    Working,
}

pub trait Oracle {
    fn probe(&self) -> bool;
}

pub type Handle = Session;

pub fn boot() {}

impl Session {
    pub fn start(&self) {
        let local = 1;
    }
}
`;

const JS_SOURCE = `
export const RETRIES = 3;
export const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export function main() {}
export class Runner {
  go() {}
}
`;

interface Found {
  name: string;
  kind: string;
  container: string | null;
  line: number;
  column: number;
  endColumn: number;
}

async function symbolsOf(relPath: string, source: string): Promise<Found[]> {
  const extractor = await extractorPromise;
  return extractor.extract(relPath, source);
}

function names(found: Found[]): Set<string> {
  return new Set(found.map((s) => s.name));
}

function kindOf(found: Found[], name: string): string | undefined {
  return found.find((s) => s.name === name)?.kind;
}

describe('the nine gmux tags queries', () => {
  it('compiles every query against every shipped grammar', async () => {
    const extractor = await extractorPromise;
    // One trivially valid source per grammar; a query that failed to compile
    // yields zero symbols for its language, which the assertions below catch.
    const probes: Record<GrammarId, [string, string, string]> = {
      typescript: ['a.ts', 'export function probeName(): void {}', 'probeName'],
      tsx: [
        'a.tsx',
        'export function ProbeName(): JSX.Element { return <div/>; }',
        'ProbeName'
      ],
      javascript: ['a.js', 'export function probeName() {}', 'probeName'],
      go: ['a.go', 'package a\nfunc ProbeName() {}', 'ProbeName'],
      python: ['a.py', 'def probe_name():\n    pass', 'probe_name'],
      rust: ['a.rs', 'pub fn probe_name() {}', 'probe_name'],
      ruby: ['a.rb', 'class ProbeName\nend', 'ProbeName'],
      swift: ['a.swift', 'func probeName() -> Int { 1 }', 'probeName'],
      kotlin: ['a.kt', 'fun probeName(): Int = 1', 'probeName'],
      objc: ['a.m', 'int probeName(void) { return 1; }', 'probeName']
    };
    for (const id of GRAMMARS) {
      const [relPath, source, expected] = probes[id];
      const found = await extractor.extract(relPath, source);
      expect(
        found.map((s) => s.name),
        `${id}: query did not compile or matched nothing`
      ).toContain(expected);
    }
  });

  it('finds all five symbol shapes upstream tags.scm misses', async () => {
    const found = await symbolsOf('store.ts', TS_SOURCE);
    const got = names(found);
    // The exact five misses recorded in research 19 §3.3.
    for (const missed of [
      'useEditor',
      'EditorMode',
      'SidebarViewId',
      'MAX_TABS',
      'MARKDOWN_MODES'
    ]) {
      expect(got, `missing ${missed}`).toContain(missed);
    }
  });

  it('scores the full TypeScript probe set with the right kinds', async () => {
    const found = await symbolsOf('store.ts', TS_SOURCE);
    const got = names(found);
    for (const name of [
      'OPEN_FILE_EVENT',
      'EditorTab',
      'Season',
      'requestOpenFile',
      'openFromRequest',
      'tabIdFor',
      'ActivityBar',
      'render',
      'handle',
      'registerFsIpc'
    ]) {
      expect(got, `missing ${name}`).toContain(name);
    }
    expect(kindOf(found, 'EditorMode')).toBe('type');
    expect(kindOf(found, 'EditorTab')).toBe('interface');
    expect(kindOf(found, 'Season')).toBe('enum');
    expect(kindOf(found, 'ActivityBar')).toBe('class');
    expect(kindOf(found, 'render')).toBe('method');
    expect(kindOf(found, 'MAX_TABS')).toBe('constant');
    // The one-row-per-span dedupe: an arrow-function const is a FUNCTION, and
    // it appears exactly once even though two patterns match it.
    expect(kindOf(found, 'tabIdFor')).toBe('function');
    expect(found.filter((s) => s.name === 'tabIdFor')).toHaveLength(1);
  });

  it('reports the enum member with its container', async () => {
    const found = await symbolsOf('store.ts', TS_SOURCE);
    const spring = found.find((s) => s.name === 'Spring');
    expect(spring?.kind).toBe('enum-member');
    expect(spring?.container).toBe('Season');
  });

  it('reports a class method with its class as the container', async () => {
    const found = await symbolsOf('store.ts', TS_SOURCE);
    expect(found.find((s) => s.name === 'render')?.container).toBe('ActivityBar');
  });

  it('anchors Go const/var to the file, keeping locals out', async () => {
    const found = await symbolsOf('stats.go', GO_SOURCE);
    const got = names(found);
    expect(got).toContain('DefaultWindow');
    expect(got).toContain('registry');
    // The 926 → 83 fix: function-local declarations must NOT be indexed.
    expect(got).not.toContain('localOnly');
    expect(got).not.toContain('alsoLocal');
  });

  it('reports Go methods with their receiver type and struct fields', async () => {
    const found = await symbolsOf('stats.go', GO_SOURCE);
    const method = found.find((s) => s.name === 'AddSessionStats');
    expect(method?.kind).toBe('method');
    expect(method?.container).toBe('StatisticsCollector');
    const field = found.find((s) => s.name === 'Sessions');
    expect(field?.kind).toBe('field');
    expect(field?.container).toBe('StatisticsCollector');
    expect(kindOf(found, 'StatisticsCollector')).toBe('struct');
    expect(kindOf(found, 'Reporter')).toBe('interface');
    expect(kindOf(found, 'Handle')).toBe('type');
    expect(kindOf(found, 'NewCollector')).toBe('function');
  });

  it('indexes python module-level definitions and methods, not locals', async () => {
    const found = await symbolsOf('mod.py', PY_SOURCE);
    const got = names(found);
    expect(got).toContain('API_ROOT');
    expect(got).toContain('load_config');
    expect(got).toContain('Session');
    expect(got).toContain('start');
    expect(got).not.toContain('inner');
    expect(found.find((s) => s.name === 'start')?.container).toBe('Session');
  });

  it('indexes rust items and impl methods, not locals', async () => {
    const found = await symbolsOf('lib.rs', RUST_SOURCE);
    const got = names(found);
    expect(got).toContain('MAX_TABS');
    expect(got).toContain('Session');
    expect(got).toContain('Status');
    expect(got).toContain('Oracle');
    expect(got).toContain('Handle');
    expect(got).toContain('boot');
    expect(got).toContain('start');
    expect(got).not.toContain('local');
    expect(kindOf(found, 'Session')).toBe('struct');
    expect(kindOf(found, 'Status')).toBe('enum');
    expect(kindOf(found, 'Oracle')).toBe('interface');
    expect(found.find((s) => s.name === 'Idle')?.kind).toBe('enum-member');
    expect(found.find((s) => s.name === 'start')?.container).toBe('Session');
  });

  it('runs the JavaScript base layer on plain .js', async () => {
    const found = await symbolsOf('a.js', JS_SOURCE);
    const got = names(found);
    expect(got).toContain('RETRIES');
    expect(got).toContain('wait');
    expect(got).toContain('main');
    expect(got).toContain('Runner');
    expect(got).toContain('go');
  });

  it('returns nothing for a language gmux does not index', async () => {
    expect(await symbolsOf('README.md', '# hello')).toEqual([]);
    expect(await symbolsOf('Makefile', 'all:\n\techo hi')).toEqual([]);
  });

  it('reports columns in UTF-16 units, not bytes', async () => {
    // 'café' is 4 UTF-16 units and 5 UTF-8 bytes. A byte column would put the
    // identifier one place to the right and the editor would select the wrong
    // span — the same class of bug as the ripgrep byte-offset trap.
    const found = await symbolsOf('u.ts', 'const café = 1; export function naïve(): void {}');
    const fn = found.find((s) => s.name === 'naïve');
    expect(fn).toBeDefined();
    const line = 'const café = 1; export function naïve(): void {}';
    expect(line.slice(fn?.column ?? 0, fn?.endColumn ?? 0)).toBe('naïve');
  });

  it('gives a 1-based line and a 0-based column that select the name', async () => {
    const src = 'const a = 1;\nexport function target(): void {}\n';
    const found = await symbolsOf('x.ts', src);
    const t = found.find((s) => s.name === 'target');
    expect(t?.line).toBe(2);
    const lines = src.split('\n');
    expect(
      lines[(t?.line ?? 1) - 1]?.slice(t?.column ?? 0, t?.endColumn ?? 0)
    ).toBe('target');
  });

  it('reads a Ruby class, its methods and its constants (Phase 157)', async () => {
    const found = await symbolsOf(
      'cask/cmd.rb',
      [
        'module Homebrew',
        '  DEFAULT_PREFIX = "/opt/homebrew"',
        '  class Cmd < AbstractCommand',
        '    def run(args)',
        '    end',
        '    def self.parse',
        '    end',
        '  end',
        'end',
        'class Utils::Curl',
        '  def value=(v); end',
        'end',
        'def top_level_helper; end'
      ].join('\n')
    );
    const got = names(found);
    for (const name of [
      'Homebrew',
      'DEFAULT_PREFIX',
      'Cmd',
      'run',
      'parse',
      'Curl',
      'value=',
      'top_level_helper'
    ]) {
      expect(got, `missing ${name}`).toContain(name);
    }
    expect(kindOf(found, 'Homebrew')).toBe('module');
    expect(kindOf(found, 'Cmd')).toBe('class');
    expect(kindOf(found, 'DEFAULT_PREFIX')).toBe('constant');
    expect(kindOf(found, 'run')).toBe('method');
    // The container comes off the class the method sits in, which is what tells
    // a reader which `run` of the fourteen in a Ruby repository this one is.
    expect(found.find((s) => s.name === 'run')?.container).toBe('Cmd');
  });

  it('reads Swift types, methods and enum cases (Phase 180)', async () => {
    // struct, class, actor and extension are ALL class_declaration in this
    // grammar; the enum is told apart by its enum_class_body. The kinds below
    // are the honest closest the palette has, and the header says why.
    const found = await symbolsOf(
      'Sources/App/Renderer.swift',
      [
        'struct Point {',
        '    var x: Double',
        '    func norm() -> Double { x }',
        '}',
        'class Renderer {',
        '    static let shared = Renderer()',
        '    func draw(in rect: Point) {}',
        '}',
        'enum Direction {',
        '    case north',
        '    case south, east',
        '}',
        'protocol Drawable {',
        '    func draw()',
        '}',
        'extension Renderer {',
        '    func clear() {}',
        '}',
        'typealias Callback = () -> Void',
        'let topLevel = 42',
        'func freeFunction(a: Int) -> Int { a }'
      ].join('\n')
    );
    const got = names(found);
    for (const name of [
      'Point',
      'Renderer',
      'Direction',
      'Drawable',
      'Callback',
      'topLevel',
      'freeFunction',
      'north',
      'south',
      'east',
      'clear'
    ]) {
      expect(got, `missing ${name}`).toContain(name);
    }
    expect(kindOf(found, 'Point')).toBe('class');
    expect(kindOf(found, 'Direction')).toBe('enum');
    expect(kindOf(found, 'Drawable')).toBe('interface');
    expect(kindOf(found, 'Callback')).toBe('type');
    expect(kindOf(found, 'topLevel')).toBe('constant');
    expect(kindOf(found, 'freeFunction')).toBe('function');
    expect(kindOf(found, 'north')).toBe('enum-member');
    expect(found.find((s) => s.name === 'draw')?.container).toBe('Renderer');
    // The extension's method belongs to the extended type by name.
    expect(found.find((s) => s.name === 'clear')?.container).toBe('Renderer');
  });

  it('reads Kotlin classes, objects and companion members (Phase 180)', async () => {
    const found = await symbolsOf(
      'app/src/main/kotlin/Renderer.kt',
      [
        'package com.example.app',
        'class Renderer(val frame: Int) {',
        '    val cache = HashMap<String, Int>()',
        '    fun draw() {}',
        '    companion object {',
        '        fun shared(): Renderer = Renderer(0)',
        '    }',
        '}',
        'interface Drawable {',
        '    fun draw()',
        '}',
        'object Registry {',
        '    fun lookup(id: String): Int = 0',
        '}',
        'enum class Direction { NORTH, SOUTH }',
        'typealias Callback = (Int) -> Unit',
        'fun topLevel(a: Int): Int = a',
        'val topConst = 42'
      ].join('\n')
    );
    const got = names(found);
    for (const name of [
      'Renderer',
      'Drawable',
      'Registry',
      'Direction',
      'Callback',
      'topLevel',
      'topConst',
      'NORTH',
      'shared',
      'lookup'
    ]) {
      expect(got, `missing ${name}`).toContain(name);
    }
    // An interface body is a class_body too; the anonymous keyword token in
    // the query is what keeps the class pattern from swallowing it.
    expect(kindOf(found, 'Drawable')).toBe('interface');
    expect(kindOf(found, 'Renderer')).toBe('class');
    expect(kindOf(found, 'NORTH')).toBe('enum-member');
    expect(kindOf(found, 'topLevel')).toBe('function');
    expect(kindOf(found, 'topConst')).toBe('constant');
    expect(found.find((s) => s.name === 'shared')?.container).toBe('Renderer');
    expect(found.find((s) => s.name === 'lookup')?.container).toBe('Registry');
  });

  it('reads Objective-C interfaces, selectors and C functions (Phase 180)', async () => {
    const found = await symbolsOf(
      'mac/Renderer.m',
      [
        '@protocol Drawable',
        '- (void)draw;',
        '@end',
        '@interface Renderer : NSObject <Drawable>',
        '@property (nonatomic) NSInteger frame;',
        '- (instancetype)initWithFrame:(NSInteger)frame;',
        '@end',
        '@implementation Renderer',
        '- (instancetype)initWithFrame:(NSInteger)frame { return self; }',
        '- (void)setX:(int)x y:(int)y {}',
        '@end',
        'static const int kMax = 10;',
        'int freeFunction(int a) { return a; }'
      ].join('\n')
    );
    const got = names(found);
    for (const name of [
      'Drawable',
      'Renderer',
      'frame',
      'initWithFrame',
      'kMax',
      'freeFunction'
    ]) {
      expect(got, `missing ${name}`).toContain(name);
    }
    expect(kindOf(found, 'Drawable')).toBe('interface');
    expect(kindOf(found, 'Renderer')).toBe('class');
    expect(kindOf(found, 'kMax')).toBe('constant');
    expect(kindOf(found, 'freeFunction')).toBe('function');
    // A multi-part selector reads by its FIRST segment; the anchor after
    // method_type is what keeps `y` from being reported as a method of its own.
    expect(got).toContain('setX');
    expect(got).not.toContain('y');
    // The superclass is an identifier child of the same node; the leading
    // anchor is what keeps NSObject from being reported as a class here.
    expect(got).not.toContain('NSObject');
    expect(
      found.find((s) => s.name === 'initWithFrame')?.container
    ).toBe('Renderer');
  });

});
