/**
 * Unit tests for src/main/specstory/wrap.ts — the argv composer that has to
 * hold Phase 15's one non-negotiable constraint:
 *
 *   the wrapped form of an agent launch, AND of its resume, must still be the
 *   same command the agent would have received unwrapped.
 *
 * These are the pure half (the grammar, the round trip, the refusals). The
 * other half — that a REAL `specstory run` hands the child exactly these
 * bytes, and what it does with the child's exit code — is
 * ./wrap.integration.test.ts, which spawns the bundled CLI.
 */

import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import {
  canWrapArgv,
  isWrappedArgv,
  specstoryQuoteArgv,
  specstorySplitCommandLine,
  unwrapArgv,
  wrapArgv
} from '../wrap';

const BIN = '/Applications/gmux.app/Contents/Resources/bin/specstory';

/** The argv shapes gmux actually composes, plus the ones that break naive quoting. */
const GNARLY: readonly (readonly string[])[] = [
  ['/usr/bin/claude'],
  ['/usr/bin/claude', '--model', 'opus'],
  ['/usr/bin/claude', '--dangerously-skip-permissions'],
  // The constraint, literally: a resume argv must survive the wrap.
  [
    '/usr/bin/claude',
    '--resume',
    '550e8400-e29b-41d4-a716-446655440000',
    '--dangerously-skip-permissions'
  ],
  ['/usr/bin/codex', 'resume', '01994f3c-b1a2-7000-8000-000000000000', '--yolo'],
  // Embedded JSON — research 13 §4 flagged this as the round-trip hazard.
  ['/usr/bin/claude', '--mcp-config', '{"mcpServers":{"a":{"command":"x y"}}}'],
  ['/usr/bin/claude', '--add-dir', '/Users/g/My Projects/thing'],
  ['/usr/bin/claude', "--append-system-prompt", "it's fine"],
  ['/usr/bin/claude', '--append-system-prompt', 'say "hi"'],
  // Backslashes: the case where a POSIX shell quoter silently corrupts the
  // argument, because specstory's splitter honours `\` INSIDE quotes too.
  ['/usr/bin/claude', 'a\\b\\\\c'],
  ['/usr/bin/claude', '--flag=va$lue`x`;rm -rf /'],
  ['/usr/bin/claude', 'héllo', '日本語'],
  ['/usr/bin/claude', '--tab\there'],
  ['/usr/bin/claude', 'trailing\\']
];

describe('specstory -c quoting round-trips every argv gmux composes', () => {
  it('quote → split is the identity for the gnarly set', () => {
    for (const argv of GNARLY) {
      const line = specstoryQuoteArgv(argv);
      assert.deepEqual(
        specstorySplitCommandLine(line),
        [...argv],
        `round trip lost bytes for ${JSON.stringify(argv)} (encoded: ${line})`
      );
    }
  });

  it('refuses — rather than mangles — the one argv the grammar cannot carry', () => {
    // specstory's splitter drops empty quoted strings outright: `if
    // current.Len() > 0`. There is no encoding that brings the element back,
    // so the wrap is declined and the session launches bare.
    assert.equal(canWrapArgv(['/usr/bin/claude', '']), false);
    assert.equal(canWrapArgv([]), false);
    assert.equal(wrapArgv({ bin: BIN, provider: 'claude', inner: ['/x', ''] }), null);
    assert.equal(canWrapArgv(['/usr/bin/claude', '--model', 'opus']), true);
  });
});

describe('wrapArgv composes the launch AND the resume identically', () => {
  it('puts the whole inner argv in -c, under the right provider, with the flags that keep the pane clean', () => {
    const inner = ['/usr/bin/claude', '--model', 'opus'];
    const argv = wrapArgv({ bin: BIN, provider: 'claude', inner });
    assert.deepEqual(argv, [
      BIN,
      'run',
      'claude',
      '--no-version-check',
      '--silent',
      '-c',
      '/usr/bin/claude --model opus'
    ]);
  });

  it('preserves a resume argv byte-for-byte, flags included', () => {
    const resume = [
      '/usr/bin/claude',
      '--resume',
      '550e8400-e29b-41d4-a716-446655440000',
      '--dangerously-skip-permissions'
    ];
    const argv = wrapArgv({ bin: BIN, provider: 'claude', inner: resume });
    assert.notEqual(argv, null);
    assert.deepEqual(unwrapArgv(argv as string[]), resume);
    // gmux never delegates resume translation to specstory: no --resume flag
    // of its own rides along, because the registry already knows this agent's
    // resume syntax and specstory's guess is wrong for three of eight.
    assert.equal((argv as string[]).includes('--resume'), false);
  });

  it('carries the local-only opt-out as a flag, before -c', () => {
    const argv = wrapArgv({
      bin: BIN,
      provider: 'claude',
      inner: ['/usr/bin/claude'],
      noCloud: true
    }) as string[];
    assert.deepEqual(argv, [
      BIN,
      'run',
      'claude',
      '--no-version-check',
      '--silent',
      '--no-cloud-sync',
      '-c',
      '/usr/bin/claude'
    ]);
    // …and it is opt-IN: a normal wrap uploads exactly as the user expects.
    const normal = wrapArgv({ bin: BIN, provider: 'claude', inner: ['/usr/bin/claude'] });
    assert.equal((normal as string[]).includes('--no-cloud-sync'), false);
  });

  it('never composes a wrap without a binary or a provider', () => {
    assert.equal(wrapArgv({ bin: '', provider: 'claude', inner: ['/x'] }), null);
    assert.equal(
      wrapArgv({
        bin: BIN,
        provider: '' as unknown as 'claude',
        inner: ['/x']
      }),
      null
    );
  });
});

describe('isWrappedArgv / unwrapArgv', () => {
  it('recognises a wrap and leaves a bare agent argv alone', () => {
    const wrapped = wrapArgv({
      bin: BIN,
      provider: 'codex',
      inner: ['/usr/bin/codex', '--yolo']
    }) as string[];
    assert.equal(isWrappedArgv(wrapped), true);
    assert.equal(isWrappedArgv(['/usr/bin/codex', '--yolo']), false);
    assert.deepEqual(unwrapArgv(['/usr/bin/codex', '--yolo']), []);
    assert.deepEqual(unwrapArgv(wrapped), ['/usr/bin/codex', '--yolo']);
  });
});
