/**
 * Unit cover for SCRATCH_ROOT (Phase 114, root 2 of Phase 112's list).
 *
 * The constant is read once at module load, so each case resets the module
 * registry and imports the module again after arranging the environment. The
 * property under test is the isolation rule itself: under a harness the root
 * sits inside that run's own directory, and without one the old location
 * under the system temp directory is kept.
 */

import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

const ORIGINAL_HARNESS_DIR = process.env['GMUX_HARNESS_DIR'];

const loadScratchRoot = async (): Promise<string> => {
  vi.resetModules();
  const { SCRATCH_ROOT } = await import('../scratch');
  return SCRATCH_ROOT;
};

describe('SCRATCH_ROOT', () => {
  afterEach(() => {
    if (ORIGINAL_HARNESS_DIR === undefined) {
      delete process.env['GMUX_HARNESS_DIR'];
    } else {
      process.env['GMUX_HARNESS_DIR'] = ORIGINAL_HARNESS_DIR;
    }
    vi.resetModules();
  });

  it('sits under GMUX_HARNESS_DIR when the variable is set', async () => {
    process.env['GMUX_HARNESS_DIR'] = join(
      tmpdir(),
      'gmux-smoke-t1-wt-p114-4242'
    );
    const root = await loadScratchRoot();
    expect(root).toBe(
      join(tmpdir(), 'gmux-smoke-t1-wt-p114-4242', 'gmux-conformance')
    );
    expect(root.endsWith('/gmux-conformance')).toBe(true);
  });

  it('falls back to the system temp directory when the variable is absent', async () => {
    delete process.env['GMUX_HARNESS_DIR'];
    const root = await loadScratchRoot();
    expect(root).toBe(join(tmpdir(), 'gmux-conformance'));
    expect(root.endsWith('/gmux-conformance')).toBe(true);
  });
});
