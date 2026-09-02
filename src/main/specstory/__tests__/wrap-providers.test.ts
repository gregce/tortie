/**
 * The provider compatibility rule, hermetic (Phase 200).
 *
 * This is the half of the old `wrap.integration.test.ts` that belongs in a
 * lane that controls every effect it uses. The other half, being the argv
 * passthrough and the exit code matrix, EXECUTES a specstory binary and is
 * `./wrap.native.test.ts` now.
 *
 * WHY THE SPLIT EXISTS. The 0.98.0 audit ran the hermetic lane and it failed:
 * `wrap.integration.test.ts` asked the host's installed specstory for its
 * provider list and required `muse` to be in it, and the binary on the audit
 * machine does not advertise `muse`. A lane whose answer depends on what
 * somebody happens to have installed is not hermetic, and a green result there
 * would have been just as wrong as the red one.
 *
 * WHAT THIS FILE STILL PROVES, and it is the rule that actually protects
 * capture: that `parseProviderIds` finds every provider Tortie carries a
 * registry row for in the help text the PINNED CLI prints. The bytes are a
 * committed fixture captured from `build/vendor/specstory/bin/specstory
 * 2.10.0`, so a parse that stops reading that surface fails here, immediately,
 * on any machine, with nothing installed at all.
 *
 * WHAT IT CANNOT PROVE, said here so nobody reads more into a pass: that the
 * binary on THIS machine still prints that surface. That is the adapter lane's
 * question and it is asked there, against the vendored pin.
 *
 * IT SPAWNS NOTHING. It reads one text file and calls two pure parsers.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { describe, expect, it } from 'vitest';

import { parseProviderIds } from '../capture';
import type { SpecstoryProviderId } from '../../agents/registry';

/** `specstory run --help --no-version-check`, captured from the 2.10.0 pin. */
const HELP = readFileSync(
  join(
    dirname(fileURLToPath(import.meta.url)),
    'fixtures',
    'specstory-2.10.0-run-help.txt'
  ),
  'utf8'
);

/**
 * The providers Tortie carries a capture row for. `muse` is last because it is
 * the one the audit's host binary lacked: 2.8.0 had never heard of it and the
 * 2.10.0 pin (Phase 115, research 59 section 4) ships it as released.
 */
const CARRIED: readonly SpecstoryProviderId[] = [
  'claude',
  'codex',
  'cursor',
  'gemini',
  'droid',
  'deepseek',
  'antigravity',
  'muse'
];

describe('the provider surface of the pinned CLI, from captured bytes', () => {
  it('parses the marker at all', () => {
    const ids = parseProviderIds(HELP);
    assert.notEqual(
      ids,
      null,
      'the provider marker moved, and capture would fail closed'
    );
  });

  it('finds every provider Tortie has a row for', () => {
    const found = new Set(parseProviderIds(HELP) as SpecstoryProviderId[]);
    for (const provider of CARRIED) {
      expect(
        found.has(provider),
        `${provider} is missing from the pinned help text`
      ).toBe(true);
    }
  });

  it('reads an open vocabulary rather than a fixed list', () => {
    // Phase 18.5's parse carries a provider nobody has written a row for, so a
    // CLI release that adds one does not need a Tortie release to be seen.
    const found = new Set(parseProviderIds(HELP) as SpecstoryProviderId[]);
    // The pin ships two Tortie has no capture row for, which is the proof the
    // parse is not filtering against the registry.
    expect(found.size).toBeGreaterThan(CARRIED.length);
  });

  it('answers null for help text that lost the marker', () => {
    expect(parseProviderIds('USAGE\n  specstory run [provider-id]\n')).toBe(null);
    expect(parseProviderIds('')).toBe(null);
  });
});
