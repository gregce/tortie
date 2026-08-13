/**
 * One call, every scheme.
 *
 * `protocol.registerSchemesAsPrivileged` must be called exactly once for the
 * whole application. This was measured on Electron 43.3.0 on 2026-08-13 with
 * two calls of one scheme each, and the result is not what the name of the
 * function suggests.
 *
 *   privilege            after two calls
 *   standard             kept for both schemes
 *   stream               kept for both schemes
 *   secure               kept only for the LAST call
 *   supportFetchAPI      kept only for the LAST call
 *   corsEnabled          kept only for the LAST call
 *
 * A page then fetched the second scheme and failed to fetch the first. So
 * adding a second call for `gmux-preview:` would silently strip three
 * privileges from `gmux-asset:`, which is the channel markdown images ride
 * on. Nothing would throw and nothing would log.
 *
 * The fix is a descriptor rather than a registration function:
 * `PREVIEW_PRIVILEGED_SCHEME` is added to the existing call. This test is
 * how that stays true, and it fails the moment somebody adds a second call
 * anywhere in main.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const MAIN = join(__dirname, '..', '..');

/** Every .ts file under src/main that is not a test. */
function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...sourceFiles(path));
    else if (entry.name.endsWith('.ts')) out.push(path);
  }
  return out;
}

describe('privileged scheme registration', () => {
  it('happens in exactly one place in main', () => {
    const sites: string[] = [];
    for (const file of sourceFiles(MAIN)) {
      const code = readFileSync(file, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '');
      const calls = code.match(/registerSchemesAsPrivileged\(/g) ?? [];
      for (let i = 0; i < calls.length; i += 1) sites.push(file);
    }
    expect(
      sites,
      'a second registerSchemesAsPrivileged call strips secure, ' +
        'supportFetchAPI and corsEnabled from the scheme registered first. ' +
        'Add PREVIEW_PRIVILEGED_SCHEME to the existing call instead of ' +
        'making a new one.'
    ).toHaveLength(1);
  });

  it('is not something the preview module does for itself', () => {
    const protocolSource = readFileSync(join(MAIN, 'preview', 'protocol.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    expect(protocolSource).not.toContain('registerSchemesAsPrivileged');
  });
});
