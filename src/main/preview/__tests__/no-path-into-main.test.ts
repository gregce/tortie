/**
 * The preview code has no route from a previewed document into the main
 * process (Phase 20.5, research 39 section 2.6).
 *
 * ## The attack this exists to keep cut
 *
 * An earlier draft rewrote external anchors to a sentinel URL,
 * `gmux-preview://<token>/__external?u=<encoded>`, so that
 * `will-frame-navigate` would fire and main could call `shell.openExternal`.
 * One line in a previewed file fired that event on load, with no script and no
 * click:
 *
 *     <iframe width=1 height=1 src="/__external?u=https%3A%2F%2Fevil.example%2F">
 *
 * The event carried the attacker's exact URL, and `file:///…` produced the same
 * event with the scheme intact. So the page author chose both the address and
 * the scheme.
 *
 * ## Why this is a source scan and not a unit test
 *
 * A unit test asserts what one function returns. This asserts that the
 * capability is absent from the whole directory, which is the claim the phase
 * makes. It scans everything under `src/main/preview/`, so it covers the
 * protocol handler as well as the anchor rewrite, and it will fail on a file
 * that does not exist yet if that file ever reaches for the shell.
 *
 * It uses the shared scanning primitives behind the other two blunt-grep
 * guardrails (`keymap-single-source.test.ts`, `ipc-single-bridge.test.ts`), so
 * a third guardrail costs an import rather than another copy of the walker.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  SRC,
  relPath,
  sourceFiles,
  stripComments
} from '../../../shared/__tests__/source-scan';

const PREVIEW_DIR = join(SRC, 'main', 'preview');

/**
 * Each row is a capability, not a spelling. The message says what the code
 * would be able to do, because a future reader deleting a line needs to know
 * what it cost rather than which word was banned.
 */
const FORBIDDEN: readonly { pattern: RegExp; capability: string }[] = [
  {
    pattern: /openExternal/,
    capability:
      'hand an address from a previewed file to the system browser, or ' +
      'to the system opener'
  },
  {
    pattern: /\bshell\b/,
    capability: "reach Electron's shell module at all"
  },
  {
    pattern: /__external/,
    capability:
      'answer a sentinel route, which a 1x1 nested iframe fires with no ' +
      'script and no click'
  }
];

describe('nothing in src/main/preview can act on an address from a page', () => {
  it('scans at least the anchor rewrite, so the test cannot pass on nothing', () => {
    expect(existsSync(join(PREVIEW_DIR, 'anchors.ts'))).toBe(true);
    expect(sourceFiles(PREVIEW_DIR).length).toBeGreaterThan(0);
  });

  it('names none of the three capabilities in executable code', () => {
    const offences: string[] = [];
    for (const file of sourceFiles(PREVIEW_DIR)) {
      const code = stripComments(readFileSync(file, 'utf8'));
      code.split('\n').forEach((line, index) => {
        for (const { pattern, capability } of FORBIDDEN) {
          if (pattern.test(line)) {
            offences.push(
              `${relPath(file)}:${index + 1} would ${capability}\n    ${line.trim()}`
            );
          }
        }
      });
    }
    expect(offences.join('\n')).toBe('');
  });

  it('keeps the anchor rewrite a pure function over a string', () => {
    // No file system, no Electron, no IPC. That is why the attacks in
    // anchors.test.ts can be run without an app, and it is why the module
    // cannot grow a side effect without this test noticing.
    const code = stripComments(
      readFileSync(join(PREVIEW_DIR, 'anchors.ts'), 'utf8')
    );
    const imports = [...code.matchAll(/from\s+'([^']+)'/g)].map((m) => m[1]);
    expect(imports).toEqual(['parse5', 'parse5']);
  });
});
