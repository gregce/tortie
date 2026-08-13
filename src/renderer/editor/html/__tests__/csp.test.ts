/**
 * The application policy gained exactly one directive (Phase 20.5).
 *
 * Research 39 §2.4 and the phase brief both say "exactly one", and the
 * reason to pin it as a whole string rather than to assert that the new
 * directive is present is that the interesting failure is the other one: a
 * later change adds `connect-src` or widens `img-src` while it is in here,
 * and nothing notices. The renderer holds the project tree, the terminal
 * buffers and the agent output, and research 37 §8.1's guarantee is that it
 * cannot post any of that anywhere. This test is what makes that guarantee
 * an executable claim rather than a sentence in a document.
 *
 * The settings window is checked too, and it must NOT gain the directive.
 * It has no preview in it, and a policy that is wider than the thing it
 * governs is how a capability arrives without a decision.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const RENDERER = resolve(__dirname, '..', '..', '..');

/** What shipped before Phase 20.5, byte for byte. */
const POLICY_BEFORE =
  "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; " +
  "img-src 'self' data: gmux-asset:; font-src 'self' data:; " +
  "worker-src 'self' blob:";

/** The whole change. */
const THE_ONE_DIRECTIVE = 'frame-src gmux-preview:';

function policyOf(file: string): string {
  const source = readFileSync(resolve(RENDERER, file), 'utf8');
  const meta =
    /http-equiv="Content-Security-Policy"\s*\n?\s*content="([^"]*)"/.exec(
      source
    );
  expect(meta, `${file} must carry a Content-Security-Policy meta tag`).not
    .toBeNull();
  return meta?.[1] ?? '';
}

describe('the renderer policy after the HTML preview', () => {
  it('is the old policy plus one directive and nothing else', () => {
    expect(policyOf('index.html')).toBe(
      `${POLICY_BEFORE}; ${THE_ONE_DIRECTIVE}`
    );
  });

  it('names the preview scheme and no host', () => {
    const directives = policyOf('index.html').split(';').map((d) => d.trim());
    const frameSrc = directives.filter((d) => d.startsWith('frame-src'));
    expect(frameSrc).toEqual([THE_ONE_DIRECTIVE]);
  });

  it('still has no connect-src widening, so the renderer cannot post', () => {
    const policy = policyOf('index.html');
    expect(policy).not.toContain('connect-src');
    expect(policy).not.toContain('http://');
    expect(policy).not.toContain('https://');
    expect(policy).not.toContain('*');
  });

  it('leaves the settings window alone', () => {
    const policy = policyOf('settings/index.html');
    expect(policy).not.toContain('frame-src');
    expect(policy).not.toContain('gmux-preview');
  });
});
