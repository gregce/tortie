/**
 * One read of the tree (Phase 201): the two facts the import scan cannot
 * give, stamped like the import rows so a warm pass reads only what drifted.
 * Since Phase 257 the same read carries the fact pass, driven here with an in
 * process extractor standing in for the worker pool, so the orchestration is
 * asserted without a thread.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, utimesSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ArchStore } from '../db';
import type { ArchFactParser } from '../fact-parser';
import { EMPTY_WRAPPER_DIGEST } from '../facts/index';
import { readRootCrateName } from '../resolver/cargo';
import { readArchManifests } from '../resolver/manifest';
import { countLines, declaredNameOf, readArchTreeFacts } from '../tree-facts';
import { SymbolExtractor } from '../../symbols/extract';
import { grammarPath } from '../../symbols/paths';

const require_ = createRequire(import.meta.url);
const runtimeWasm = require_.resolve('web-tree-sitter/web-tree-sitter.wasm');
const extractorPromise = SymbolExtractor.create({ runtimeWasm, grammarPath });

/**
 * The seam the coordinator fills with the shared pool, filled here with the
 * extractor in this process: the same `extractFile` the worker calls, the
 * same refusals, no thread. `asks` records every ask so a test can say what
 * was parsed and with which flags.
 */
function inProcessParser(asks: { files: string[]; wrappers: boolean }[] = []): ArchFactParser {
  return {
    batchSize: 4,
    run: async (files, ask) => {
      asks.push({ files: files.map((f) => f.relPath), wrappers: ask.wrappers });
      const extractor = await extractorPromise;
      const out = [];
      for (const file of files) {
        const got = await extractor.extractFile(file.relPath, file.absPath, ask);
        if (got === null) continue;
        out.push({
          relPath: file.relPath,
          mtimeMs: got.mtimeMs,
          size: got.size,
          symbols: got.symbols,
          calls: got.calls,
          callsTruncated: got.callsTruncated,
          wrappers: got.wrappers
        });
      }
      return out;
    }
  };
}

/** A parser that answers nothing, for the tests about the tree half alone. */
const silentParser: ArchFactParser = { batchSize: 4, run: async () => [] };

describe('the declared name', () => {
  it('reads each manifest kind as text and never evaluates it', () => {
    expect(declaredNameOf('package.json', '{"name":"@rookery/cli","main":"x"}')).toBe('@rookery/cli');
    expect(declaredNameOf('Cargo.toml', '[package]\nname = "grep-printer"\nversion = "1"\n')).toBe('grep-printer');
    expect(declaredNameOf('pyproject.toml', '[project]\nname = "lift-sys"\n')).toBe('lift-sys');
    expect(declaredNameOf('go.mod', 'module github.com/foo/bar\n\ngo 1.22\n')).toBe('github.com/foo/bar');
    expect(declaredNameOf('Package.swift', 'let package = Package(\n  name: "RookKit",\n')).toBe('RookKit');
  });

  it('answers null for a manifest with no name, one that does not parse, and any other file', () => {
    expect(declaredNameOf('package.json', '{"main":"x"}')).toBeNull();
    expect(declaredNameOf('package.json', '{not json')).toBeNull();
    expect(declaredNameOf('Cargo.toml', '[workspace]\nmembers = ["crates/*"]\n')).toBeNull();
    expect(declaredNameOf('README.md', 'name = "x"')).toBeNull();
    expect(declaredNameOf('package.json', `{"name":"${'x'.repeat(300)}"}`)).toBeNull();
  });
});

describe('the line count', () => {
  it('counts newlines and answers zero for a binary', () => {
    expect(countLines(Buffer.from('a\nb\nc'))).toBe(2);
    expect(countLines(Buffer.from('a\nb\nc\n'))).toBe(3);
    expect(countLines(Buffer.from(''))).toBe(0);
    expect(countLines(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0x0a, 0x0a]))).toBe(0);
  });
});

describe('the read of the tree', () => {
  let root: string;
  let repo: string;
  let store: ArchStore;
  const KEY = 'test:repo';

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'gmux-arch-tree-'));
    repo = join(root, 'repo');
    mkdirSync(join(repo, 'src'), { recursive: true });
    mkdirSync(join(repo, 'server'), { recursive: true });
    writeFileSync(join(repo, 'src', 'a.ts'), 'one\ntwo\nthree\n');
    writeFileSync(join(repo, 'src', 'b.ts'), 'one\n');
    writeFileSync(join(repo, 'server', 'package.json'), '{"name":"rookery-server"}\n');
    writeFileSync(join(repo, 'icon.png'), Buffer.from([0x89, 0x50, 0x00, 0x0a]));
    store = new ArchStore(join(root, 'arch.db'));
  });

  afterEach(() => {
    store.close();
    rmSync(root, { recursive: true, force: true });
  });

  const tracked = ['src/a.ts', 'src/b.ts', 'server/package.json', 'icon.png', 'gone.txt'];
  const base = () => ({ repoPath: repo, repoKey: KEY, store, wrapperPass: false, parser: silentParser });

  it('reads every tracked file once, keeps lines and declared names, and reuses the stamps', async () => {
    const first = await readArchTreeFacts({ ...base(), trackedFiles: tracked });
    // gone.txt is tracked at HEAD and absent from the tree: not read, not stored.
    expect(first.read).toBe(4);
    expect(first.reused).toBe(0);
    const facts = new Map(store.treeFacts(KEY).map((f) => [f.path, f]));
    expect(facts.get('src/a.ts')?.lines).toBe(3);
    expect(facts.get('src/b.ts')?.lines).toBe(1);
    expect(facts.get('icon.png')?.lines).toBe(0);
    expect(facts.get('server/package.json')).toEqual({ path: 'server/package.json', lines: 1, declares: 'rookery-server' });
    expect(facts.get('src/a.ts')?.declares).toBeNull();
    expect(facts.has('gone.txt')).toBe(false);

    const second = await readArchTreeFacts({ ...base(), trackedFiles: tracked });
    expect(second.read).toBe(0);
    expect(second.reused).toBe(4);
  });

  it('re-reads a file that changed and forgets one the tree no longer tracks', async () => {
    await readArchTreeFacts({ ...base(), trackedFiles: tracked });
    writeFileSync(join(repo, 'src', 'b.ts'), 'one\ntwo\nthree\nfour\nfive\n');
    const again = await readArchTreeFacts({ ...base(), trackedFiles: tracked.filter((p) => p !== 'icon.png') });
    expect(again.read).toBe(1);
    const facts = new Map(store.treeFacts(KEY).map((f) => [f.path, f.lines]));
    expect(facts.get('src/b.ts')).toBe(5);
    expect(facts.has('icon.png')).toBe(false);
  });

  it('does not follow a tracked symlink, wherever it points', async () => {
    // Read through stat, a link to a file outside the repository was read
    // for its line count (the Phase 201 fix round, from the verifier's note).
    writeFileSync(join(root, 'outside.txt'), 'one\ntwo\nthree\nfour\nfive\nsix\nseven\n');
    symlinkSync(join(root, 'outside.txt'), join(repo, 'src', 'link.txt'));
    const out = await readArchTreeFacts({ ...base(), trackedFiles: ['src/a.ts', 'src/link.txt'] });
    expect(out.read).toBe(1);
    expect(store.treeFacts(KEY).map((f) => f.path)).toEqual(['src/a.ts']);
    expect([...store.factStamps(KEY).keys()]).toEqual(['src/a.ts']);
  });

  it('stops between chunks when cancelled and keeps what it wrote', async () => {
    const controller = new AbortController();
    controller.abort();
    const out = await readArchTreeFacts({ ...base(), trackedFiles: tracked, signal: controller.signal });
    expect(out.read).toBe(0);
    expect(store.treeFacts(KEY)).toEqual([]);
    expect(out.facts.overBudget).toBe('The check was cancelled by a newer one.');
  });
});

describe('the fact pass over the same read (Phase 257)', () => {
  let root: string;
  let repo: string;
  let store: ArchStore;
  const KEY = 'test:repo';

  const TYPED_IPC = "export function handle(ipc, channel, fn) {\n  ipc.handle(channel, fn);\n}\n";
  const IPC =
    "import { handle as handleTyped } from './typed-ipc';\n" +
    "function handle(channel, fn) {\n  handleTyped(ipcMain, channel, fn);\n}\n" +
    "handle('arch:map', () => 1);\n" +
    "sock.on('data', () => 2);\n";
  const REGISTRAR = "import { handle } from '../typed-ipc';\nhandle(ipc, 'arch:load', () => 1);\nipcMain.handle('direct:one', () => 2);\n";

  function write(rel: string, text: string | Buffer): void {
    mkdirSync(join(repo, rel, '..'), { recursive: true });
    writeFileSync(join(repo, rel), text);
  }

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'gmux-arch-facts-'));
    repo = join(root, 'repo');
    mkdirSync(repo, { recursive: true });
    write('src/main/typed-ipc.ts', TYPED_IPC);
    write('src/main/ipc.ts', IPC);
    write('src/main/arch/ipc.ts', REGISTRAR);
    write('src/main/run.ts', "import { spawn } from 'node:child_process';\nspawn('git', ['status']);\n");
    write('package.json', '{"name":"fixture","main":"out/main.js","scripts":{"test":"vitest run"}}\n');
    write('setup.py', "from setuptools import setup\nsetup(entry_points={'console_scripts': ['fx = fx.cli:main']})\n");
    write('vendor/lib.js', "app.get('/vendored', h);\n");
    write('icon.png', Buffer.from([0x89, 0x50, 0x00, 0x0a]));
    write('README.md', '# fixture\n');
    store = new ArchStore(join(root, 'arch.db'));
  });

  afterEach(() => {
    store.close();
    rmSync(root, { recursive: true, force: true });
  });

  const tracked = [
    'src/main/typed-ipc.ts',
    'src/main/ipc.ts',
    'src/main/arch/ipc.ts',
    'src/main/run.ts',
    'package.json',
    'setup.py',
    'vendor/lib.js',
    'icon.png',
    'README.md'
  ];
  const run = (wrapperPass: boolean, asks: { files: string[]; wrappers: boolean }[] = [], files = tracked, signal?: AbortSignal) =>
    readArchTreeFacts({
      repoPath: repo,
      repoKey: KEY,
      store,
      trackedFiles: files,
      wrapperPass,
      parser: inProcessParser(asks),
      ...(signal === undefined ? {} : { signal })
    });
  const subjects = (viaWrapper?: boolean) =>
    store
      .facts(KEY)
      .filter((f) => viaWrapper === undefined || f.viaWrapper === viaWrapper)
      .map((f) => `${f.file}:${f.line} ${f.category}/${f.kind} ${f.subject}`)
      .sort();

  it('writes the declarations off the SAME parse, keyed on the same bytes (Phase 259)', async () => {
    const out = await run(false);
    // The symbols arrive on the worker message the calls already came on, so
    // this is a second table off ONE parse rather than a second parse.
    expect(out.facts.decls).toBeGreaterThan(0);
    expect(out.facts.declsTruncated).toBe(0);
    const decls = store.declsOf(KEY, ['src/main/typed-ipc.ts']);
    expect(decls.map((row) => row.subject)).toContain('function handle');
    expect(decls[0]?.evidence).toContain('export function handle');
    // Nothing was written for a file no rule reads.
    expect(store.declsOf(KEY, ['icon.png', 'README.md'])).toEqual([]);
  });

  it('keeps the declarations out of the fact base, so no count on any face moves', async () => {
    await run(false);
    const categories = new Set(store.facts(KEY).map((fact) => fact.category));
    expect(categories.has('decl' as never)).toBe(false);
    expect(store.factCounts(KEY).byCategory).not.toHaveProperty('decl');
  });

  it('forgets a file declarations with its facts when the tree stops tracking it', async () => {
    await run(false);
    expect(store.declsOf(KEY, ['src/main/typed-ipc.ts']).length).toBeGreaterThan(0);
    await run(false, [], tracked.filter((one) => one !== 'src/main/typed-ipc.ts'));
    store.pruneUnlinkedFacts();
    expect(store.declsOf(KEY, ['src/main/typed-ipc.ts'])).toEqual([]);
  });

  it('links every tracked file, reads the rule files, refuses the vendored one and parses only source', async () => {
    const asks: { files: string[]; wrappers: boolean }[] = [];
    const out = await run(false, asks);
    // Four source files, the two manifests and the README; the vendored file
    // and the binary are linked with no rule read.
    expect(out.facts.read).toBe(7);
    expect(out.facts.reused).toBe(0);
    expect(out.facts.wrapDigest).toBeNull();
    expect(out.facts.overBudget).toBeNull();
    // Only the four source files went to the parser, with no wrapper ask.
    expect(asks.flatMap((a) => a.files).sort()).toEqual(['src/main/arch/ipc.ts', 'src/main/ipc.ts', 'src/main/run.ts', 'src/main/typed-ipc.ts']);
    expect(asks.every((a) => a.wrappers === false)).toBe(true);
    const stamps = store.factStamps(KEY);
    expect([...stamps.keys()].sort()).toEqual([...tracked].sort());
    expect(stamps.get('src/main/ipc.ts')?.lang).toBe('typescript');
    expect(stamps.get('package.json')?.lang).toBe('manifest');
    // A manifest that carries a grammar is a manifest first, never parsed.
    expect(stamps.get('setup.py')?.lang).toBe('manifest');
    expect(stamps.get('README.md')?.lang).toBe('path');
    expect(stamps.get('vendor/lib.js')?.lang).toBeNull();
    expect(stamps.get('icon.png')?.lang).toBeNull();
    for (const stamp of stamps.values()) expect(stamp.oid).toMatch(/^[0-9a-f]{40}$/);
    const counts = store.factCounts(KEY);
    expect(counts.files).toBe(9);
    expect(counts.vendored).toBe(1);
    expect(counts.wrapFacts).toBe(0);
    // With the pass off, the direct registration and the spawn are seen and
    // the wrapped channels are not: 0 of 2 through `handle`, as measured.
    const got = subjects();
    expect(got).toContain('src/main/arch/ipc.ts:3 surface/ipc-channel IPC serves direct:one');
    expect(got).toContain('src/main/run.ts:2 effect/spawn runs git');
    expect(got).toContain('package.json:1 entrypoint/package-main node entry out/main.js');
    expect(got).toContain('setup.py:2 entrypoint/bin python console script table');
    expect(got.some((s) => s.includes('arch:map'))).toBe(false);
    expect(got.some((s) => s.includes('arch:load'))).toBe(false);
    expect(got.some((s) => s.includes('vendored'))).toBe(false);
  });

  it('reuses a fresh stamp without a read and the same bytes at a moved stamp without a parse', async () => {
    await run(false);
    const asks: { files: string[]; wrappers: boolean }[] = [];
    const warm = await run(false, asks);
    expect(warm.facts.read).toBe(0);
    expect(warm.facts.reused).toBe(9);
    expect(asks).toEqual([]);
    // A touch moves the stamp and no byte: hashed, linked, not parsed.
    const later = new Date(Date.now() + 5_000);
    utimesSync(join(repo, 'src/main/run.ts'), later, later);
    const touched = await run(false, asks);
    expect(touched.facts.read).toBe(0);
    expect(touched.facts.reused).toBe(9);
    expect(asks).toEqual([]);
    expect(Math.round(store.factStamps(KEY).get('src/main/run.ts')?.mtimeMs ?? 0)).toBe(later.getTime());
    // A real change is parsed again, and the old fact list is pruned once
    // nothing links it.
    write('src/main/run.ts', "import { spawn } from 'node:child_process';\nspawn('tmux', ['ls']);\n");
    const changed = await run(false, asks);
    expect(changed.facts.read).toBe(1);
    expect(asks.flatMap((a) => a.files)).toEqual(['src/main/run.ts']);
    const got = subjects();
    expect(got).toContain('src/main/run.ts:2 effect/spawn runs tmux');
    expect(got.some((s) => s.includes('runs git'))).toBe(false);
  });

  it('forgets a file the tree no longer tracks and prunes its facts', async () => {
    await run(false);
    await run(false, [], tracked.filter((p) => p !== 'src/main/run.ts'));
    expect(store.factStamps(KEY).has('src/main/run.ts')).toBe(false);
    expect(subjects().some((s) => s.startsWith('src/main/run.ts'))).toBe(false);
  });

  it('with the wrapper pass on, finds the channels behind both hops and the shadowing declaration, and nothing behind sock.on', async () => {
    const asks: { files: string[]; wrappers: boolean }[] = [];
    const out = await run(true, asks);
    expect(asks.every((a) => a.wrappers === true)).toBe(true);
    expect(out.facts.wrapDigest).toMatch(/^[0-9a-f]{64}$/);
    expect(out.facts.wrapDigest).not.toBe(EMPTY_WRAPPER_DIGEST);
    expect(out.facts.wrapFacts).toBe(2);
    const wrapped = subjects(true);
    expect(wrapped).toEqual([
      'src/main/arch/ipc.ts:2 surface/ipc-channel IPC serves arch:load',
      'src/main/ipc.ts:5 surface/ipc-channel IPC serves arch:map'
    ]);
    // The direct registration is a base fact, never a wrap fact.
    expect(subjects(false)).toContain('src/main/arch/ipc.ts:3 surface/ipc-channel IPC serves direct:one');
    const stamps = store.factStamps(KEY);
    expect(stamps.get('src/main/ipc.ts')?.wrapDigest).toBe(out.facts.wrapDigest);
    expect(stamps.get('src/main/run.ts')?.wrapDigest).toBe(out.facts.wrapDigest);
    // A file outside the wrapper grammars carries no digest.
    expect(stamps.get('package.json')?.wrapDigest).toBeNull();
    expect(store.factCounts(KEY).wrapFacts).toBe(2);
    expect(store.factCounts(KEY).wrapDigest).toBe(out.facts.wrapDigest);

    // Warm: nothing parsed, the digest unchanged, the wrap facts kept.
    const again = await run(true, asks.splice(0));
    expect(asks).toEqual([]);
    expect(again.facts.wrapDigest).toBe(out.facts.wrapDigest);
    expect(subjects(true)).toHaveLength(2);
  });

  it('re-reads every wrapper grammar file for its wrapper arm alone when a declaration moves the digest', async () => {
    const first = await run(true);
    // A second wrapper joins the declaring file: the map moves, and what the
    // existing wrappers reach does not.
    write('src/main/typed-ipc.ts', TYPED_IPC + 'export function handleOnce(ipc, channel, fn) {\n  ipc.handleOnce(channel, fn);\n}\n');
    const asks: { files: string[]; wrappers: boolean }[] = [];
    const second = await run(true, asks);
    expect(second.facts.wrapDigest).not.toBe(first.facts.wrapDigest);
    // The changed file was parsed for facts and declarations; the other three
    // wrapper grammar files were re-asked for their calls alone.
    expect(asks.find((a) => a.files.includes('src/main/typed-ipc.ts'))?.wrappers).toBe(true);
    const reasked = asks.filter((a) => a.wrappers === false).flatMap((a) => a.files).sort();
    expect(reasked).toEqual(['src/main/arch/ipc.ts', 'src/main/ipc.ts', 'src/main/run.ts']);
    expect(subjects(true)).toEqual([
      'src/main/arch/ipc.ts:2 surface/ipc-channel IPC serves arch:load',
      'src/main/ipc.ts:5 surface/ipc-channel IPC serves arch:map'
    ]);
    for (const p of ['src/main/arch/ipc.ts', 'src/main/ipc.ts', 'src/main/run.ts', 'src/main/typed-ipc.ts']) {
      expect(store.factStamps(KEY).get(p)?.wrapDigest).toBe(second.facts.wrapDigest);
    }
  });

  it('takes a channel away again when the declaration it reached through changes shape', async () => {
    await run(true);
    // The channel now sits in the THIRD parameter, so `handle(ipc, 'arch:load',
    // fn)` forwards its second argument as `fn`, and ipc.ts's own `handle`
    // lands the channel where the new declaration keeps the callback.
    write('src/main/typed-ipc.ts', 'export function handle(ipc, fn, channel) {\n  ipc.handle(channel, fn);\n}\n');
    await run(true);
    expect(subjects(true)).toEqual([]);
    expect(subjects(false)).toContain('src/main/arch/ipc.ts:3 surface/ipc-channel IPC serves direct:one');
  });

  it('turned off after being on, deletes every wrapper only row once and clears the digests', async () => {
    await run(true);
    expect(subjects(true)).toHaveLength(2);
    const asks: { files: string[]; wrappers: boolean }[] = [];
    const off = await run(false, asks);
    expect(asks).toEqual([]);
    expect(off.facts.wrapDigest).toBeNull();
    expect(subjects(true)).toEqual([]);
    for (const stamp of store.factStamps(KEY).values()) expect(stamp.wrapDigest).toBeNull();
    expect(store.factCounts(KEY).wrapFacts).toBe(0);
    // Base facts are untouched by the flip.
    expect(subjects(false)).toContain('src/main/arch/ipc.ts:3 surface/ipc-channel IPC serves direct:one');
  });

  it('turned on after being off, reads the declarations of files it reused whole', async () => {
    await run(false);
    const asks: { files: string[]; wrappers: boolean }[] = [];
    const on = await run(true, asks);
    // Every wrapper grammar file was linked under the pass off with no
    // declarations cached, so each is asked once more, with wrappers.
    expect(asks.flatMap((a) => a.files).sort()).toEqual(['src/main/arch/ipc.ts', 'src/main/ipc.ts', 'src/main/run.ts', 'src/main/typed-ipc.ts']);
    expect(asks.every((a) => a.wrappers === true)).toBe(true);
    expect(on.facts.wrapFacts).toBe(2);
    expect(subjects(true)).toHaveLength(2);
  });

  it('keeps two repositories over the same bytes on one fact list, and prunes it only when neither links it', async () => {
    await run(false);
    const other = 'test:other';
    await readArchTreeFacts({ repoPath: repo, repoKey: other, store, trackedFiles: tracked, wrapperPass: false, parser: inProcessParser() });
    expect(store.facts(other).length).toBe(store.facts(KEY).length);
    await readArchTreeFacts({ repoPath: repo, repoKey: KEY, store, trackedFiles: [], wrapperPass: false, parser: silentParser });
    expect(store.facts(KEY)).toEqual([]);
    expect(store.facts(other).length).toBeGreaterThan(0);
  });

  it('gives the same bytes at a test path the test path refusals, keyed on the path', async () => {
    write('src/route.ts', "app.get('/x', h);\n");
    write('test/route.test.ts', "app.get('/x', h);\n");
    await run(false, [], ['src/route.ts', 'test/route.test.ts']);
    const got = subjects();
    expect(got).toContain('src/route.ts:1 surface/http-route HTTP GET /x');
    expect(got.some((s) => s.startsWith('test/route.test.ts') && s.includes('http-route'))).toBe(false);
    const stamps = store.factStamps(KEY);
    expect(stamps.get('src/route.ts')?.oid).toBe(stamps.get('test/route.test.ts')?.oid);
  });

  it('links a late NUL as a binary, lang null and no fact, over the one window the extractor sniffs (the fix round)', async () => {
    // A NUL at byte 8,100: text to git's 8,000 byte window, binary to the
    // extractor's 8,192. The product stored `environment switch LATE_NUL`
    // from it while the reference driver called it unreadable.
    // Short lines, so the vendor filter's bytes half (a line of 2,000 bytes)
    // stays out of it and the binary window alone decides.
    let text = 'export const x = process.env.LATE_NUL_SECRET;\n';
    while (text.length + 80 <= 8100) text += `// ${'p'.repeat(76)}\n`;
    text += `// ${'q'.repeat(8100 - text.length - 3)}`;
    expect(Buffer.byteLength(text)).toBe(8100);
    const body = Buffer.concat([Buffer.from(text), Buffer.from([0]), Buffer.from('\n')]);
    write('src/main/late-nul.ts', body);
    const asks: { files: string[]; wrappers: boolean }[] = [];
    await run(false, asks, ['src/main/late-nul.ts']);
    expect(asks).toEqual([]);
    const stamp = store.factStamps(KEY).get('src/main/late-nul.ts');
    expect(stamp?.lang).toBeNull();
    expect(stamp?.truncated).toBe(false);
    expect(subjects().some((s) => s.includes('LATE_NUL'))).toBe(false);
    expect(store.factCounts(KEY).unread).toBe(1);
  });

  it('keeps the line and path facts of a source file the worker refuses over its cap, and links it truncated (T4)', async () => {
    const text = `export const big = process.env.BIG_SWITCH;\n${'// pad\n'.repeat(400_000)}`;
    expect(text.length).toBeGreaterThan(2 * 1024 * 1024);
    write('src/main/big.ts', text);
    await run(false, [], ['src/main/big.ts']);
    const stamp = store.factStamps(KEY).get('src/main/big.ts');
    expect(stamp?.lang).toBe('typescript');
    expect(stamp?.truncated).toBe(true);
    expect(subjects()).toContain('src/main/big.ts:1 gate/flag environment switch BIG_SWITCH');
    expect(store.factCounts(KEY).truncated).toBe(1);
  });

  it('leaves a file rewritten between the parse and the second read UNLINKED, and reads it next time (the base pass guard)', async () => {
    // The verifier drove this through the parser seam: pass 1 stored
    // `IPC serves race:before` under the before-oid with evidence citing
    // `race:after`. The second read must hash to the first read's oid.
    write('src/main/race.ts', "ipcMain.handle('race:before', f);\n");
    const racing: ArchFactParser = {
      batchSize: 4,
      run: async (files, ask) => {
        const out = await inProcessParser().run(files, ask);
        if (files.some((f) => f.relPath === 'src/main/race.ts')) write('src/main/race.ts', "ipcMain.handle('race:after', g);\n");
        return out;
      }
    };
    const first = await readArchTreeFacts({ repoPath: repo, repoKey: KEY, store, trackedFiles: ['src/main/race.ts'], wrapperPass: false, parser: racing });
    expect(first.facts.read).toBe(0);
    expect(store.factStamps(KEY).has('src/main/race.ts')).toBe(false);
    expect(subjects().some((s) => s.includes('race:'))).toBe(false);
    const second = await run(false, [], ['src/main/race.ts']);
    expect(second.facts.read).toBe(1);
    expect(subjects()).toContain('src/main/race.ts:1 surface/ipc-channel IPC serves race:after');
    expect(subjects().some((s) => s.includes('race:before'))).toBe(false);
  });

  it('leaves the source files a cancelled parser loop never reached unlinked, so the next run reads them (T9)', async () => {
    for (let i = 0; i < 6; i += 1) write(`src/main/many${i}.ts`, `ipcMain.handle('many:${i}', f);\n`);
    const files = [0, 1, 2, 3, 4, 5].map((i) => `src/main/many${i}.ts`);
    const controller = new AbortController();
    const parser: ArchFactParser = {
      batchSize: 4,
      run: async (batch, ask) => {
        const out = await inProcessParser().run(batch, ask);
        controller.abort();
        return out;
      }
    };
    const first = await readArchTreeFacts({ repoPath: repo, repoKey: KEY, store, trackedFiles: files, wrapperPass: false, parser, signal: controller.signal });
    expect(first.facts.overBudget).toBe('The check was cancelled by a newer one.');
    expect(first.facts.read).toBe(4);
    // The queue is filled in read completion order, so WHICH four is not
    // fixed; that exactly the other two are unlinked and read next time is.
    const linked = new Set(store.factStamps(KEY).keys());
    expect(linked.size).toBe(4);
    const unreached = files.filter((f) => !linked.has(f));
    expect(unreached).toHaveLength(2);
    const asks: { files: string[]; wrappers: boolean }[] = [];
    const second = await run(false, asks, files);
    expect(second.facts.read).toBe(2);
    expect(asks.flatMap((a) => a.files).sort()).toEqual(unreached.sort());
    expect(subjects().filter((s) => s.includes('many:'))).toHaveLength(6);
  });

  it('links a file over the read cap under a streamed hash with no rule read', async () => {
    const big = Buffer.alloc(4_000_001, 0x61);
    write('big.txt', big);
    await run(false, [], ['big.txt']);
    const stamp = store.factStamps(KEY).get('big.txt');
    expect(stamp?.lang).toBeNull();
    // git's own name for 4,000,001 bytes of `a`, computed the same way in process.
    const { createHash } = await import('node:crypto');
    const h = createHash('sha1');
    h.update(`blob ${big.length}\0`);
    h.update(big);
    expect(stamp?.oid).toBe(h.digest('hex'));
    expect(store.factCounts(KEY).unread).toBe(1);
  });
});

describe('the root crate name', () => {
  let root: string;
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'gmux-arch-crate-'));
  });
  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('is the name as written, hyphens kept, and null for a virtual workspace or no Cargo.toml', () => {
    expect(readRootCrateName(root)).toBeNull();
    expect(readArchManifests(root).crateName).toBeNull();
    writeFileSync(join(root, 'Cargo.toml'), '[workspace]\nmembers = ["crates/*"]\n');
    expect(readRootCrateName(root)).toBeNull();
    writeFileSync(join(root, 'Cargo.toml'), '[package]\nname = "grep-printer"\n[workspace]\nmembers = ["crates/*"]\n');
    expect(readRootCrateName(root)).toBe('grep-printer');
    expect(readArchManifests(root).crateName).toBe('grep-printer');
    // The resolver's own map keeps the form a `use` line writes.
    expect([...(readArchManifests(root).cargo?.crates.keys() ?? [])]).toEqual(['grep_printer']);
  });
});
