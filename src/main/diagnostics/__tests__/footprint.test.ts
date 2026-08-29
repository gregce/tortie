/**
 * Unit tests for src/main/diagnostics/footprint.ts (Phase 163).
 *
 * The fixture is the tool's real output from 2026-08-29, including the trap:
 * a pid this account could not read was matched by the tool as a NAME and
 * answered for a stranger. The parser keeps only what was asked for.
 */

import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { footprintArgs, parseFootprint, readFootprints } from '../footprint';

const REAL = `Found process muse-bin-0.2.1-R1215.1 [16208] from partial name 1
footprint: Unable to find pid for process matching '999999'
======================================================================
muse-bin-0.2.1-R1215.1 [16208]: 64-bit    Footprint: 5439920 B (16384 bytes per page)
======================================================================

Auxiliary data:
    phys_footprint: 5472688 B
    phys_footprint_peak: 5472688 B

======================================================================
zsh [94276]: 64-bit    Footprint: 2179384 B (16384 bytes per page)
======================================================================

Auxiliary data:
    phys_footprint: 2195768 B
    phys_footprint_peak: 2359608 B

======================================================================
Summary Footprint: 7619304 B
`;

describe('parseFootprint', () => {
  it('reads phys_footprint for the pids that were asked for', () => {
    const out = parseFootprint(REAL, new Set([94276, 1, 999999]));
    assert.deepEqual([...out.entries()], [[94276, 2195768]]);
  });

  it('drops a process the tool volunteered by partial name', () => {
    const out = parseFootprint(REAL, new Set([1, 94276]));
    assert.equal(out.has(16208), false);
  });

  it('keeps the header total when no auxiliary line follows', () => {
    const out = parseFootprint(
      'zsh [5]: 64-bit    Footprint: 100 B (16384 bytes per page)\n',
      new Set([5])
    );
    assert.equal(out.get(5), 100);
  });

  it('never invents a number for a pid that was not printed', () => {
    const out = parseFootprint(REAL, new Set([424242]));
    assert.equal(out.size, 0);
  });
});

describe('readFootprints', () => {
  it('asks for bytes, no categories, one -p per pid, and filters the reply', async () => {
    let seen: readonly string[] = [];
    const out = await readFootprints([94276, 0, -3, 1], {
      run: async (args) => {
        seen = args;
        return REAL;
      }
    });
    assert.deepEqual([...seen], ['-f', 'bytes', '--noCategories', '-p', '94276', '-p', '1']);
    assert.deepEqual([...out.entries()], [[94276, 2195768]]);
  });

  it('spawns nothing for an empty list', async () => {
    let ran = false;
    const out = await readFootprints([], { run: async () => { ran = true; return ''; } });
    assert.equal(ran, false);
    assert.equal(out.size, 0);
  });

  it('answers empty rather than throwing when the tool fails', async () => {
    const out = await readFootprints([7], { run: async () => { throw new Error('gone'); } });
    assert.equal(out.size, 0);
  });

  it('pins the argv shape', () => {
    assert.deepEqual(footprintArgs([3, 4]), ['-f', 'bytes', '--noCategories', '-p', '3', '-p', '4']);
  });
});
