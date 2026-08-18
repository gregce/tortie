/**
 * The face the capture SVG carries (Phase 78).
 *
 * The woff2 files are Vite assets and this runner is outside Vite's asset
 * pipeline, so every case here hands `faceCssFor` a fake byte loader. What is
 * under test is the rule text, the weight gating and the family name, and the
 * family name is read from the shipped preset table rather than from a copy of
 * it, so a rename in `work-fonts.ts` fails here instead of shipping an SVG
 * that names a family the bytes do not declare.
 */

import { describe, expect, it } from 'vitest';
import type { WorkAreaFont } from '@shared/settings';
import { workFont } from '../../../theme/work-fonts';
import {
  faceCssFor,
  hasBoldRuns,
  type BundledWorkAreaFont,
  type FaceWeight
} from '../capture-fonts';

/** Records what was asked for and returns a stand-in data URL. */
function fakeLoader(asked: string[]) {
  return (preset: BundledWorkAreaFont, weight: FaceWeight): Promise<string> => {
    asked.push(`${preset}/${weight}`);
    return Promise.resolve(`data:font/woff2;base64,${weight.toUpperCase()}`);
  };
}

const BUNDLED: BundledWorkAreaFont[] = ['jetbrains-mono', 'source-code-pro'];

describe('faceCssFor', () => {
  it('inlines nothing for the System preset', async () => {
    const asked: string[] = [];
    expect(await faceCssFor('system', { bold: false }, fakeLoader(asked))).toBe(
      ''
    );
    expect(await faceCssFor('system', { bold: true }, fakeLoader(asked))).toBe(
      ''
    );
    // Not merely empty. It never reached for bytes it would have thrown away.
    expect(asked).toEqual([]);
  });

  it('inlines the regular face alone when nothing on screen is bold', async () => {
    const asked: string[] = [];
    const css = await faceCssFor(
      'jetbrains-mono',
      { bold: false },
      fakeLoader(asked)
    );
    expect(asked).toEqual(['jetbrains-mono/regular']);
    expect(css.match(/@font-face/g)).toHaveLength(1);
    expect(css).toBe(
      '@font-face{font-family:"JetBrains Mono";font-style:normal;' +
        'font-weight:400;font-display:block;' +
        'src:url("data:font/woff2;base64,REGULAR") format("woff2")}'
    );
  });

  it('adds the bold face only when the capture holds a bold run', async () => {
    const asked: string[] = [];
    const css = await faceCssFor(
      'jetbrains-mono',
      { bold: true },
      fakeLoader(asked)
    );
    expect(asked).toEqual(['jetbrains-mono/regular', 'jetbrains-mono/bold']);
    expect(css.match(/@font-face/g)).toHaveLength(2);
    expect(css).toContain('font-weight:400');
    expect(css).toContain('font-weight:700');
    // One family, two members. Two families would leave bold in the fallback.
    expect(css.match(/font-family:"JetBrains Mono"/g)).toHaveLength(2);
    // Regular first, so a reader of the SVG sees the members in weight order.
    expect(css.indexOf('font-weight:400')).toBeLessThan(
      css.indexOf('font-weight:700')
    );
  });

  it('names the family the preset table names', async () => {
    for (const id of BUNDLED) {
      const family = workFont(id).familyName;
      expect(family).not.toBeNull();
      const css = await faceCssFor(id, { bold: true }, fakeLoader([]));
      expect(css).toContain(`font-family:"${family}"`);
    }
  });

  it('writes a woff2 source and an upright face for every member', async () => {
    for (const id of BUNDLED) {
      const css = await faceCssFor(id, { bold: true }, fakeLoader([]));
      expect(css.match(/format\("woff2"\)/g)).toHaveLength(2);
      expect(css.match(/font-style:normal/g)).toHaveLength(2);
      // No italic member ships. Chromium synthesises the oblique.
      expect(css).not.toContain('font-style:italic');
    }
  });

  it('covers every preset the settings type offers', async () => {
    const all: WorkAreaFont[] = ['system', ...BUNDLED];
    for (const id of all) {
      await expect(
        faceCssFor(id, { bold: false }, fakeLoader([]))
      ).resolves.toEqual(expect.any(String));
    }
  });
});

describe('hasBoldRuns', () => {
  it('sees the marker the serializer writes for a bold cell', () => {
    expect(
      hasBoldRuns('<span style="color:#fff;font-weight:bold">go</span>')
    ).toBe(true);
  });

  it('is false for a capture with no bold in it', () => {
    expect(hasBoldRuns('<span style="color:#fff">go</span>')).toBe(false);
    expect(hasBoldRuns('')).toBe(false);
  });

  it('is not fooled by an italic-only run', () => {
    expect(hasBoldRuns('<span style="font-style:italic">go</span>')).toBe(false);
  });
});
