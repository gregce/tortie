/**
 * Integration tests: gmux's wrap composer against the REAL SpecStory CLI.
 *
 * WHY THIS EXISTS AS A TEST AND NOT A ONE-OFF PROBE. Phase 15's whole risk is
 * that capture silently changes what the agent is run with — a dropped flag, a
 * mangled `--mcp-config`, a resume that no longer resumes. The grammar this
 * repo quotes for lives in someone else's Go file (`spi.SplitCommandLine`),
 * so the only honest check is to hand a real `specstory run` a real argv and
 * read back what the child actually received. Byte-exact, in hex, so an
 * invisible difference cannot pass.
 *
 * The second thing measured here is EXIT CODES, because Phase 12.7's death
 * reporting and Phase 13's status detection both read them, and the CLI's
 * providers do not agree: `claude` mirrors the child's code exactly, while
 * `codex` (and droid/deepseek/antigravity) collapse every failure to 1. That
 * is what `AgentSpecstoryCapture.exitCodeFidelity` records, and this test is
 * the thing that makes the registry's claim executable.
 *
 * SAFETY. Every spawn runs with HOME pointed at a throwaway directory, so the
 * user's `~/.specstory/cli/auth.json` is never read: the CLI is unauthenticated
 * inside this test and cannot reach anyone's cloud. The captured "agent" is a
 * shell script in a temp dir, and the working directory is a temp dir too.
 *
 * Skips itself (rather than failing) when no specstory binary is present —
 * `npm run vendor:specstory` fetches the pinned copy this suite prefers.
 *
 * ---------------------------------------------------------------------------
 * PHASE 200 MOVED THIS FILE INTO THE ADAPTER LANE, and the reason is the whole
 * point of having lanes.
 * ---------------------------------------------------------------------------
 *
 * It was `wrap.integration.test.ts`, which the hermetic lane included, and
 * every describe in it EXECUTES a binary found on the host. The 0.98.0 audit
 * met the consequence: the hermetic lane failed on the audit machine because
 * the installed specstory it found there does not advertise `muse`. A lane
 * whose answer depends on an installed binary is not hermetic, whatever the
 * result is. So the real binary work is `*.native.test.ts` now, beside the
 * FSEvents and live process table adapters, and it runs under
 * `npm run test:native`.
 *
 * THE COMPATIBILITY RULE DID NOT MOVE WITH IT. `./wrap-providers.test.ts` runs
 * the same `parseProviderIds` over a CAPTURED `run --help`, so the hermetic
 * lane still fails when the parse stops finding the providers Tortie has rows
 * for. What it no longer does is ask the host what it happens to have
 * installed.
 *
 * The provider set assertion below is bound to the VENDORED pin as well, for
 * the same reason: a host binary can still prove the argv passthrough and the
 * exit code rows, which are properties of the wrapper, and it cannot be asked
 * to prove which providers a release Tortie pinned ships.
 */

import { execFileSync } from 'node:child_process';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import assert from 'node:assert/strict';
import { wrapArgv } from '../wrap';
import { parseProviderIds, parseProviderList } from '../capture';
import type { SpecstoryProviderId } from '../../agents/registry';

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

const VENDORED = join(
  process.cwd(),
  'build',
  'vendor',
  'specstory',
  'bin',
  'specstory'
);

function findSpecstory(): string | null {
  if (existsSync(VENDORED)) return VENDORED;
  for (const dir of ['/opt/homebrew/bin', '/usr/local/bin']) {
    const p = join(dir, 'specstory');
    if (existsSync(p)) return p;
  }
  return null;
}

const SPECSTORY = findSpecstory();
/**
 * PHASE 200. True only when the binary under test is the copy this build
 * vendored, which is the only one whose provider set is a property of Tortie
 * rather than of whoever's machine this is.
 */
const IS_VENDORED = SPECSTORY === VENDORED;
const root = mkdtempSync(join(tmpdir(), 'gmux-sswrap-'));
const HOME = join(root, 'home');
const CWD = join(root, 'proj');
const AGENT = join(root, 'bin', 'fakeagent');

if (SPECSTORY !== null) {
  mkdirSync(HOME, { recursive: true });
  mkdirSync(CWD, { recursive: true });
  mkdirSync(join(root, 'bin'), { recursive: true });
  // Prints its argv as hex lines (invisible differences cannot survive hex),
  // then exits with $EXITWITH so the exit-code fidelity claim is measurable.
  writeFileSync(
    AGENT,
    [
      '#!/bin/bash',
      'echo ARGVSTART',
      `for a in "$@"; do printf '%s\\n' "$(printf '%s' "$a" | xxd -p | tr -d '\\n')"; done`,
      'echo ARGVEND',
      'exit "${EXITWITH:-0}"',
      ''
    ].join('\n')
  );
  chmodSync(AGENT, 0o755);
}

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

interface RunResult {
  argv: string[];
  code: number;
  output: string;
}

/** Run one wrapped launch and read back what the child actually received. */
function runWrapped(
  provider: SpecstoryProviderId,
  innerArgs: readonly string[],
  exitWith = 0
): RunResult {
  const argv = wrapArgv({
    bin: SPECSTORY as string,
    provider,
    inner: [AGENT, ...innerArgs]
  });
  assert.notEqual(argv, null, 'wrapArgv declined an argv this test expects it to carry');
  const [bin, ...args] = argv as string[];
  let code = 0;
  let output = '';
  try {
    output = execFileSync(bin as string, args, {
      cwd: CWD,
      // HOME is the whole safety story: an unauthenticated CLI in a temp home.
      env: { ...process.env, HOME, EXITWITH: String(exitWith) },
      encoding: 'utf8',
      timeout: 60_000
    });
  } catch (err) {
    const e = err as { status?: number; stdout?: string; stderr?: string };
    code = e.status ?? -1;
    output = `${e.stdout ?? ''}${e.stderr ?? ''}`;
  }
  const lines = output.split('\n');
  const start = lines.indexOf('ARGVSTART');
  const end = lines.indexOf('ARGVEND');
  const received =
    start >= 0 && end > start
      ? lines
          .slice(start + 1, end)
          .map((hex) => Buffer.from(hex.trim(), 'hex').toString('utf8'))
      : [];
  return { argv: received, code, output };
}

const describeIf = SPECSTORY === null ? describe.skip : describe;

// ---------------------------------------------------------------------------
// The argv passthrough — the constraint itself
// ---------------------------------------------------------------------------

describeIf('a real `specstory run` hands the agent gmux’s argv unchanged', () => {
  const cases: readonly (readonly string[])[] = [
    ['--model', 'opus'],
    ['--dangerously-skip-permissions'],
    // THE resume case: this is what a restored captured session runs.
    ['--resume', '550e8400-e29b-41d4-a716-446655440000', '--dangerously-skip-permissions'],
    ['--mcp-config', '{"mcpServers":{"a":{"command":"x y","args":["--p","1"]}}}'],
    ['--add-dir', '/Users/g/My Projects/thing'],
    ['--append-system-prompt', 'it’s "fine" — really'],
    ['a\\b\\\\c'],
    ['--flag=va$lue`x`;echo pwned'],
    ['héllo', '日本語'],
    ['--tab\there']
  ];

  it.each(cases.map((c) => [JSON.stringify(c), c] as const))(
    'passes %s through byte-for-byte',
    (_label, args) => {
      const run = runWrapped('claude', args);
      expect(run.argv).toEqual([...args]);
    }
  );

  it('adds nothing of its own to the child argv', () => {
    const run = runWrapped('claude', ['--model', 'opus']);
    expect(run.argv).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// Exit codes — what the registry's exitCodeFidelity actually means
// ---------------------------------------------------------------------------

describeIf('exit codes through the wrapper — the registry matrix, executable', () => {
  // Every launchable agent whose registry row claims a fidelity, measured
  // against the CLI this build bundles. `muse` is absent on purpose: the
  // released 2.8.0 has no such provider (see the provider-probe test below).
  const matrix: readonly [SpecstoryProviderId, 'exact' | 'collapsed'][] = [
    ['claude', 'exact'],
    ['cursor', 'exact'],
    ['gemini', 'exact'],
    ['codex', 'collapsed'],
    ['droid', 'collapsed'],
    ['deepseek', 'collapsed'],
    ['antigravity', 'collapsed']
  ];

  it.each(matrix)('%s exits %s', (provider, fidelity) => {
    // A clean exit is a clean exit everywhere — that half never differs.
    expect(runWrapped(provider, [], 0).code).toBe(0);
    // 42 is arbitrary; 127 is the one gmux's dead-pane UX reads by name
    // ("command not found"), so it is worth its own measurement.
    const expected = (code: number): number => (fidelity === 'exact' ? code : 1);
    expect(runWrapped(provider, [], 42).code).toBe(expected(42));
    expect(runWrapped(provider, [], 127).code).toBe(expected(127));
  });
});

const describeVendored =
  SPECSTORY === null || !IS_VENDORED ? describe.skip : describe;

describeVendored('the provider probe reads the CLI this build actually ships', () => {
  it('finds the providers gmux has rows for, muse included since 2.10.0', () => {
    const help = execFileSync(SPECSTORY as string, ['run', '--help', '--no-version-check'], {
      encoding: 'utf8',
      env: { ...process.env, HOME },
      timeout: 30_000
    });
    const ids = parseProviderIds(help);
    assert.notEqual(ids, null, 'the provider marker moved — capture would fail closed');
    const found = new Set(ids as SpecstoryProviderId[]);
    for (const p of ['claude', 'codex', 'cursor', 'gemini', 'droid', 'deepseek', 'antigravity']) {
      expect(found.has(p as SpecstoryProviderId)).toBe(true);
    }
    // MEASURED: 2.8.0 had never heard of muse and this line asserted its
    // absence. The 2.10.0 pin (Phase 115, research 59 section 4) ships muse
    // as a released provider, and the open-vocabulary parse from Phase 18.5
    // carries it through. The probe stays the authority either way: it
    // reports what THIS binary can do, so the toggle lights only for
    // providers that exist.
    expect(found.has('muse')).toBe(true);
  });
});

// The list probe is a property of ANY real specstory rather than of the pin,
// so it runs against whatever binary was found.
describeIf('the list probe against a real CLI', () => {
  /**
   * The rung the ladder prefers (Phase 18.5), against the shipped CLI.
   *
   * Two properties no unit test can establish: that a REAL specstory answers
   * this in the shape the parse expects, and that asking it writes NOTHING
   * into the working directory. The second is the reason the probe is `list`
   * and not `run`: `run`'s RunE calls `config.EnsureDefaultProjectConfig()`
   * and drops `.specstory/cli/config.toml` wherever it was invoked, which for
   * a probe that inherits the app's cwd is one of the user's repositories.
   */
  it('answers `list <sentinel>` with one provider per line, and writes nothing', () => {
    const probeCwd = mkdtempSync(join(root, 'probe-'));
    let stderr = '';
    let code = 0;
    try {
      execFileSync(
        SPECSTORY as string,
        [
          'list',
          '__tortie_provider_probe__',
          '--no-version-check',
          '--no-usage-analytics'
        ],
        { cwd: probeCwd, env: { ...process.env, HOME }, encoding: 'utf8', timeout: 30_000 }
      );
    } catch (err) {
      const e = err as { status?: number; stderr?: string };
      code = e.status ?? -1;
      stderr = e.stderr ?? '';
    }
    // Non-zero AND the sentinel echoed back: the two guards that stop a future
    // version which ACCEPTS the argument from being read as a provider list.
    expect(code).not.toBe(0);
    expect(stderr).toContain('__tortie_provider_probe__');

    const parsed = parseProviderList(stderr);
    assert.notEqual(parsed, null, 'the per-line provider surface moved');
    const byId = new Map((parsed ?? []).map((p) => [p.id, p.displayName]));
    for (const p of ['claude', 'codex', 'cursor', 'gemini', 'droid', 'deepseek', 'antigravity']) {
      expect(byId.has(p)).toBe(true);
    }
    // The display name is what this rung buys over the help paragraph, which
    // wraps mid-name at ~120 columns.
    expect(byId.get('claude')).toBe('Claude Code');
    expect(readdirSync(probeCwd)).toEqual([]);
  });
});
