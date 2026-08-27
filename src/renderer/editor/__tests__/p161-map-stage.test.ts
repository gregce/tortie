/**
 * Phase 161: the map width stage, held to its presentation-only promise.
 *
 * The rule under test is `map-stage.ts`, the one call site is EditorPanel.
 * What a unit can prove here: the stage applies exactly when the active tab
 * is the map in a plain split, it never shrinks a wider stored width, and a
 * divider drag ends it. What it cannot prove, that nothing is written to
 * localStorage, is held by the source scan below: the module must not name
 * any persistence surface.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { stagedMapWidth } from '../map-stage';

const HERE = dirname(fileURLToPath(import.meta.url));
const SOURCE = readFileSync(join(HERE, '..', 'map-stage.ts'), 'utf8');

const BASE = {
  activeIsMap: true,
  split: true,
  dropped: false,
  splitWidth: 720,
  maxWidth: 1240
};

describe('when the stage applies', () => {
  it('stages the row maximum while the map tab is active in a split', () => {
    expect(stagedMapWidth(BASE)).toBe(1240);
  });

  it('never shrinks a stored width already wider than the maximum', () => {
    expect(stagedMapWidth({ ...BASE, splitWidth: 1400 })).toBe(1400);
  });
});

describe('when it does not', () => {
  it('a file tab keeps the stored width', () => {
    expect(stagedMapWidth({ ...BASE, activeIsMap: false })).toBeNull();
  });

  it('overlay and fill own the geometry already', () => {
    expect(stagedMapWidth({ ...BASE, split: false })).toBeNull();
  });

  it('one divider drag drops the stage for the panel life', () => {
    expect(stagedMapWidth({ ...BASE, dropped: true })).toBeNull();
  });
});

describe('presentation only, held at the source', () => {
  it('the module touches no persistence surface', () => {
    for (const banned of [
      'localStorage',
      'saveEditorWidths',
      'loadEditorWidths',
      'setItem'
    ]) {
      expect(SOURCE).not.toContain(banned);
    }
  });
});
