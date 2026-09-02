/**
 * One read of the tree (Phase 201): the two facts the import scan cannot
 * give, stamped like the import rows so a warm pass reads only what drifted.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ArchStore } from '../db';
import { readRootCrateName } from '../resolver/cargo';
import { readArchManifests } from '../resolver/manifest';
import { countLines, declaredNameOf, readArchTreeFacts } from '../tree-facts';

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

  it('reads every tracked file once, keeps lines and declared names, and reuses the stamps', async () => {
    const first = await readArchTreeFacts({ repoPath: repo, repoKey: KEY, store, trackedFiles: tracked });
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

    const second = await readArchTreeFacts({ repoPath: repo, repoKey: KEY, store, trackedFiles: tracked });
    expect(second.read).toBe(0);
    expect(second.reused).toBe(4);
  });

  it('re-reads a file that changed and forgets one the tree no longer tracks', async () => {
    await readArchTreeFacts({ repoPath: repo, repoKey: KEY, store, trackedFiles: tracked });
    writeFileSync(join(repo, 'src', 'b.ts'), 'one\ntwo\nthree\nfour\nfive\n');
    const again = await readArchTreeFacts({
      repoPath: repo,
      repoKey: KEY,
      store,
      trackedFiles: tracked.filter((p) => p !== 'icon.png')
    });
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
    const out = await readArchTreeFacts({ repoPath: repo, repoKey: KEY, store, trackedFiles: ['src/a.ts', 'src/link.txt'] });
    expect(out.read).toBe(1);
    expect(store.treeFacts(KEY).map((f) => f.path)).toEqual(['src/a.ts']);
  });

  it('stops between chunks when cancelled and keeps what it wrote', async () => {
    const controller = new AbortController();
    controller.abort();
    const out = await readArchTreeFacts({ repoPath: repo, repoKey: KEY, store, trackedFiles: tracked, signal: controller.signal });
    expect(out.read).toBe(0);
    expect(store.treeFacts(KEY)).toEqual([]);
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
