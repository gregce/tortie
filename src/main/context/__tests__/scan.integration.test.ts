/**
 * The reader against the real machine, read-only.
 *
 * The unit tests prove the precedence rules against a filesystem in a record
 * literal, which is where a rule can be stated exactly. This file proves the
 * other half: that the declared locations point at directories that exist,
 * that the shapes on disk parse, and that the cost is what research 29
 * measured rather than two orders of magnitude more.
 *
 * It reads and never writes. Nothing in `src/main/context` can write.
 *
 * Every assertion degrades when a root is absent, because this has to pass on
 * a machine that is not the operator's. What it will not do is pass silently
 * when it found nothing: the guard is explicit and named.
 */

import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { scanContext } from '../scan';
import { CONTEXT_AGENT_IDS, locationsFor } from '../agent-context';
import { expandLocation, resolveHomes } from '../env';

const HOME = homedir();
/** The vendor-neutral root, which 10 of 12 agents read. Its absence means an unconfigured machine. */
const HAS_AGENT_CONFIG = existsSync(join(HOME, '.agents', 'skills'));
const REPO = process.cwd();

describe.skipIf(!HAS_AGENT_CONFIG)('the reader on this machine', () => {
  it('resolves the whole set in well under a second', async () => {
    // Warm the page cache first: research 29's 11.1 ms was a warm number, and
    // a first read after boot measured 7.1 s for the same work through the
    // skills CLI. The budget here is deliberately loose, because what it is
    // guarding against is an accidental O(projects) walk of a 1.17 MB
    // `~/.claude.json`, not a few milliseconds of drift.
    await scanContext({ cwd: REPO });
    const result = await scanContext({ cwd: REPO });
    expect(result.durationMs).toBeLessThan(900);
    expect(result.entries.length).toBeGreaterThan(0);
  }, 30_000);

  it('returns nothing that looks like a credential', async () => {
    const result = await scanContext({ cwd: REPO });
    const text = JSON.stringify(result);
    for (const pattern of [
      /\bsk-[A-Za-z0-9_-]{20,}/,
      /\b(?:ghp|gho|ghu|ghs|github_pat)_[A-Za-z0-9_]{20,}/,
      /\bAIza[0-9A-Za-z_-]{25,}/,
      /\bxox[abposr]-[A-Za-z0-9-]{15,}/
    ]) {
      expect(text).not.toMatch(pattern);
    }
  }, 30_000);

  it('shows one row for a skill that is symlinked into several agent directories', async () => {
    const result = await scanContext({ cwd: REPO, categories: ['skill'] });
    const shared = result.entries.filter((entry) => entry.agents.length > 2);
    expect(shared.length).toBeGreaterThan(0);
    // A row is a skill, not a directory entry: the same real path never
    // appears twice within one category.
    const seen = new Set<string>();
    for (const entry of result.entries) {
      expect(seen.has(entry.realPath)).toBe(false);
      seen.add(entry.realPath);
    }
  }, 30_000);

  it('reads MCP servers, and never an env value', async () => {
    const result = await scanContext({ cwd: REPO, categories: ['mcp'] });
    for (const entry of result.entries) {
      expect(entry.payload.kind).toBe('mcp');
      if (entry.payload.kind !== 'mcp') continue;
      expect(entry.payload.hiddenValueCount).toBe(entry.payload.envKeys.length);
    }
  }, 30_000);

  it('every declared location expands to a path, and enough of them exist', async () => {
    const homes = resolveHomes(process.env);
    let existing = 0;
    for (const agent of CONTEXT_AGENT_IDS) {
      for (const category of ['skill', 'mcp', 'hook', 'plugin', 'instruction'] as const) {
        for (const location of locationsFor(agent, category)) {
          if (location.at.startsWith('<pluginInstall>')) continue;
          const path = expandLocation(location.at, homes, REPO);
          expect(path).not.toBeNull();
          if (path && !path.includes('*') && existsSync(path)) existing += 1;
        }
      }
    }
    // A table pointing entirely at paths that do not exist would pass every
    // other test in this file by returning an empty list.
    expect(existing).toBeGreaterThan(10);
  });

  it('hashing is opt-in, and full hashing covers the whole skill directory', async () => {
    const plain = await scanContext({ cwd: REPO, categories: ['skill'] });
    expect(plain.entries.every((entry) => entry.hash === null)).toBe(true);

    const head = await scanContext({ cwd: REPO, categories: ['skill'], hash: 'head' });
    const withHash = head.entries.filter((entry) => entry.hash !== null);
    expect(withHash.length).toBeGreaterThan(0);
    expect(withHash[0]?.hashAlgorithm).toBe('sha256-file-v1');

    const full = await scanContext({ cwd: REPO, categories: ['skill'], hash: 'full' });
    const target = full.entries.find((entry) => entry.hash !== null);
    expect(target?.hashAlgorithm).toBe('sha256-dir-v1');
    const sameName = head.entries.find((entry) => entry.id === target?.id);
    // The two hashes answer different questions over different inputs, so they
    // must not be equal and must never be compared in production either.
    expect(target?.hash).not.toBe(sameName?.hash);
  }, 60_000);

  it('is stable: two scans of the same tree return the same rows', async () => {
    const first = await scanContext({ cwd: REPO });
    const second = await scanContext({ cwd: REPO });
    expect(second.entries.map((entry) => entry.id)).toEqual(first.entries.map((entry) => entry.id));
  }, 30_000);
});
