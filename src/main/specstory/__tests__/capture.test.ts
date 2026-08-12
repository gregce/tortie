/**
 * Unit tests for src/main/specstory/capture.ts — the OPEN provider vocabulary
 * (Phase 18.5, docs/research/30 §3.2 and §3.5).
 *
 * The behaviour under test is the one that used to be impossible: a provider
 * specstory reports that gmux has never heard of is surfaced instead of being
 * discarded, and an agent gmux can launch whose id equals that provider id
 * becomes capturable with no gmux release. Today that is exactly `qwen` —
 * gmux has had a launchable `qwen` row since Phase 10 and no specstory row for
 * it, and specstory's qwen-provider-support branch registers `qwen`.
 *
 * The probe ladder is exercised against FAKE specstory scripts rather than
 * mocked functions, because the two rungs are shell-level behaviours: which
 * subcommand is spawned, which stream the answer arrives on, and what the exit
 * code is. Each fake also logs its own argv, which is what pins the one rule
 * that cannot be inferred from the parse — the probe must never run `run
 * <sentinel>`, because that writes `.specstory/cli/config.toml` into its
 * working directory (measured twice, §0.1).
 *
 * The PATH sources are mocked for the same reason resolve.test.ts mocks them:
 * `extraBinDirs()` always includes /opt/homebrew/bin, so a test that leaned on
 * the real one would find this machine's own specstory.
 *
 * Runner: vitest (`npm test`). Assertions on node:assert/strict.
 */

import { afterEach, beforeEach, describe, it, vi } from 'vitest';
import assert from 'node:assert/strict';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

let cwdSpy: { mockRestore: () => void };

// Shared with resolve.test.ts — see ./path-sources for why the mock's state
// is an object and why only this one call stays in the test file.
vi.mock('../../tmux/resolve', async () =>
  (await import('./path-sources')).tmuxResolveMock()
);

import { pathSources } from './path-sources';
import {
  capturableAgents,
  captureMatrix,
  captureSupportFor,
  parseProviderIds,
  parseProviderList,
  providerCatalog,
  providerIdFor,
  resetProviderCache
} from '../capture';
import { bundledSpecstoryPath, resetSpecstoryResolutionCache } from '../resolve';

let root: string;

/** Where a fake CLI records every argv it was spawned with. */
function argvLog(): string {
  return join(dirname(bundledSpecstoryPath()), 'argv.log');
}

/**
 * A fake specstory. `body` handles everything except `--version`, and every
 * invocation appends its argv to argv.log first — the record the "never `run`"
 * assertion reads.
 */
function writeFakeCli(body: string): void {
  const path = bundledSpecstoryPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(
    path,
    [
      '#!/bin/sh',
      // Shell-builtin only: the probe env's PATH is a scratch directory, so
      // `dirname` would not resolve.
      `printf '%s\\n' "$*" >> "\${0%/*}/argv.log"`,
      'for a in "$@"; do',
      "  if [ \"$a\" = '--version' ]; then printf '2.9.0 (SpecStory)'; exit 0; fi",
      'done',
      body,
      'exit 0'
    ].join('\n'),
    { mode: 0o755 }
  );
  chmodSync(path, 0o755);
}

/** The real 2.8.0 shape: providers one per line, on stderr, exit 1. */
const LIST_REFUSAL = [
  'if [ "$1" = "list" ]; then',
  '  {',
  `    echo "Provider '$2' is not a valid provider implementation"`,
  '    echo ""',
  '    echo "The registered providers are:"',
  '    echo "  - claude - Claude Code"',
  '    echo "  - codex - Codex CLI"',
  '    echo "  - qwen - Qwen Code"',
  '  } >&2',
  '  exit 1',
  'fi'
].join('\n');

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'gmux-capture-'));
  cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(root);
  pathSources.userPath = join(root, 'empty');
  pathSources.extraDirs = [];
  resetSpecstoryResolutionCache();
  resetProviderCache();
});

afterEach(() => {
  cwdSpy.mockRestore();
  rmSync(root, { recursive: true, force: true });
  resetSpecstoryResolutionCache();
  resetProviderCache();
});

// ---------------------------------------------------------------------------
// The parsers
// ---------------------------------------------------------------------------

describe('parseProviderList — the per-line oracle', () => {
  /** Byte-for-byte what specstory 2.8.0 printed on 2026-08-12. */
  const REAL_2_8_0 = [
    "Provider '__tortie_provider_probe__' is not a valid provider implementation",
    '',
    'The registered providers are:',
    '  - antigravity - Antigravity CLI',
    '  - claude - Claude Code',
    '  - codex - Codex CLI',
    '  - copilotide - VS Code Copilot IDE',
    '  - cursor - Cursor CLI',
    '  - cursoride - Cursor IDE',
    '  - deepseek - DeepSeek TUI',
    '  - droid - Factory Droid CLI',
    '  - gemini - Gemini CLI',
    '',
    'Example: specstory list antigravity',
    '',
    '  ERROR  ',
    '',
    "  Provider '__tortie_provider_probe__' not found."
  ].join('\n');

  it('reads all nine providers and their display names, and nothing else', () => {
    const parsed = parseProviderList(REAL_2_8_0);
    assert.deepEqual(
      parsed?.map((p) => p.id),
      [
        'antigravity',
        'claude',
        'codex',
        'copilotide',
        'cursor',
        'cursoride',
        'deepseek',
        'droid',
        'gemini'
      ]
    );
    // The display name is the reason this rung is preferred: it is the only
    // label available for a provider gmux has no agent for.
    assert.equal(parsed?.find((p) => p.id === 'claude')?.displayName, 'Claude Code');
    assert.equal(
      parsed?.find((p) => p.id === 'copilotide')?.displayName,
      'VS Code Copilot IDE'
    );
  });

  it('takes the • form too — the same list from `check`', () => {
    const parsed = parseProviderList('  • claude - Claude Code\n  • qwen - Qwen Code');
    assert.deepEqual(
      parsed?.map((p) => p.id),
      ['claude', 'qwen']
    );
  });

  it('is null, not empty, when the text holds no provider lines', () => {
    assert.equal(parseProviderList('command not found: specstory'), null);
    assert.equal(parseProviderList(''), null);
  });
});

describe('parseProviderIds — the help fallback, now open', () => {
  it('keeps an id gmux has never heard of instead of discarding it', () => {
    const help =
      'Available provider IDs: claude (Claude Code), qwen (Qwen Code), ' +
      'zzz-future (Something New).';
    assert.deepEqual(parseProviderIds(help), ['claude', 'qwen', 'zzz-future']);
  });

  it('still cannot invent one out of prose that lost the marker', () => {
    assert.equal(parseProviderIds('usage: specstory run (provider)'), null);
  });
});

// ---------------------------------------------------------------------------
// The intersection
// ---------------------------------------------------------------------------

describe('providerIdFor — two sources, exact match only', () => {
  const probed = new Set(['claude', 'qwen', 'cursoride']);

  it('prefers the registry row, which is where measured fidelity lives', () => {
    assert.equal(providerIdFor('claude', probed), 'claude');
  });

  it('falls back to the agent id — this is the whole qwen fix', () => {
    assert.equal(providerIdFor('qwen', probed), 'qwen');
  });

  it('is null for a launchable agent the binary does not know', () => {
    assert.equal(providerIdFor('pi', probed), null);
  });

  it('never matches an agent gmux cannot launch', () => {
    // cursoride is in the probed set and is a real registry row, and it must
    // still not be offered: the intersection is with what gmux can put in a
    // tmux pane.
    assert.equal(providerIdFor('cursoride', probed), null);
  });

  it('is null for a shell, which has no registry row at all', () => {
    assert.equal(providerIdFor('shell', probed), null);
  });
});

// ---------------------------------------------------------------------------
// The probe ladder, against fake binaries
// ---------------------------------------------------------------------------

describe('the probe ladder', () => {
  it('uses `list <sentinel>` and NEVER `run <sentinel>`', async () => {
    writeFakeCli(LIST_REFUSAL);
    const catalog = await providerCatalog();

    assert.equal(catalog.source, 'probed');
    const spawned = readFileSync(argvLog(), 'utf8');
    assert.ok(spawned.includes('list __tortie_provider_probe__'));
    // `run <sentinel>` calls EnsureDefaultProjectConfig() and writes
    // .specstory/cli/config.toml into its cwd. It must never be spawned.
    assert.ok(!/(^|\n)run __/.test(spawned));
  });

  it('surfaces a provider gmux has no registry row for', async () => {
    writeFakeCli(LIST_REFUSAL);
    const catalog = await providerCatalog();
    assert.deepEqual(
      catalog.list.map((p) => p.id),
      ['claude', 'codex', 'qwen']
    );
  });

  it('offers qwen the day the binary reports it, with no gmux release', async () => {
    writeFakeCli(LIST_REFUSAL);
    const matrix = await captureMatrix();

    const qwen = matrix.supported.find((a) => a.agentId === 'qwen');
    assert.equal(qwen?.provider, 'qwen');
    // Offered, and honest about the one thing nobody has measured.
    assert.equal(qwen?.discovered, true);
    assert.equal(qwen?.providerName, 'Qwen Code');
    assert.equal(
      matrix.supported.find((a) => a.agentId === 'claude')?.discovered,
      false
    );
    assert.ok((await capturableAgents()).includes('qwen'));
  });

  it('records a discovered provider as collapsed, never guessing exact', async () => {
    writeFakeCli(LIST_REFUSAL);
    const support = await captureSupportFor('qwen');
    assert.equal(support.supported, true);
    assert.equal(support.registry, null);
    assert.equal(support.confidence, 'new');
  });

  it('reports every blocked agent with the reason it computed', async () => {
    writeFakeCli(LIST_REFUSAL);
    const matrix = await captureMatrix();
    const byId = new Map(matrix.blocked.map((b) => [b.agentId, b.reason]));
    // A registry row whose provider this binary does not have — "your
    // SpecStory is too old for this agent", the sentence the UI could never
    // say before.
    assert.equal(byId.get('cursor'), 'provider-missing-from-cli');
    // A launchable agent specstory cannot read at all.
    assert.equal(byId.get('pi'), 'no-provider-for-agent');
    assert.ok(!byId.has('qwen'));
  });

  it('falls through to `run --help` when the list rung says nothing', async () => {
    writeFakeCli(
      [
        'if [ "$1" = "list" ]; then exit 1; fi',
        'if [ "$1" = "run" ]; then',
        '  echo "Available provider IDs: claude (Claude Code), qwen (Qwen Code)."',
        '  exit 0',
        'fi'
      ].join('\n')
    );
    const catalog = await providerCatalog();
    assert.equal(catalog.source, 'probed');
    assert.deepEqual(
      catalog.list.map((p) => p.id),
      ['claude', 'qwen']
    );
    // The wrapped help paragraph carries no usable display name.
    assert.equal(catalog.list[0]?.displayName, null);
  });

  it('refuses a list rung that EXITS ZERO — the sentinel was accepted', async () => {
    // A future version that treats the sentinel as a real argument must not be
    // read as a provider list. It falls through to the help rung, which here
    // answers nothing, so the catalog is the measured fallback.
    writeFakeCli(
      [
        'if [ "$1" = "list" ]; then',
        '  echo "  - claude - Claude Code" >&2',
        '  exit 0',
        'fi'
      ].join('\n')
    );
    const catalog = await providerCatalog();
    assert.equal(catalog.source, 'fallback');
  });

  it('falls back to the measured set, and says so, when nothing answers', async () => {
    writeFakeCli('exit 3');
    const catalog = await providerCatalog();
    assert.equal(catalog.source, 'fallback');
    assert.ok(catalog.ids.has('claude'));
    // The fallback is registry rows measured against a real capture, so a
    // provider nobody has verified must not appear in it.
    assert.ok(!catalog.ids.has('qwen'));
  });

  it('is an empty catalog, not a fallback list, when there is no specstory', async () => {
    const catalog = await providerCatalog();
    assert.equal(catalog.ids.size, 0);
    assert.deepEqual(await capturableAgents(), []);
    const matrix = await captureMatrix();
    // No per-agent rows either: the section says "SpecStory isn't available"
    // once, rather than ten times.
    assert.deepEqual(matrix.blocked, []);
    assert.equal((await captureSupportFor('claude')).reason, 'no-binary');
  });

  it('probes once per app run, and again after a Settings re-check', async () => {
    writeFakeCli(LIST_REFUSAL);
    await providerCatalog();
    await providerCatalog();
    assert.equal(
      readFileSync(argvLog(), 'utf8')
        .split('\n')
        .filter((l) => l.startsWith('list ')).length,
      1
    );
    resetProviderCache();
    await providerCatalog();
    assert.equal(
      readFileSync(argvLog(), 'utf8')
        .split('\n')
        .filter((l) => l.startsWith('list ')).length,
      2
    );
  });
});
