/**
 * Phase 207. The Monaco theme as a function of the frame.
 *
 * - The shipped state (no overrides, light text) reproduces the Phase 11
 *   literal table: every colour Monaco used to be handed is still the same
 *   byte, spot checked on the ones a person sees most.
 * - A rotated frame moves exactly the neutrals: the canvas, the surface, the
 *   raised and active fills, the two hairlines and the two greys the gutter
 *   draws, and nothing chromatic.
 * - A dark text state flips the syntax ramp and the foreground darker than
 *   the canvas.
 * - An override that is not a six digit hex is ignored, because the alpha
 *   suffixes need six digits in front of them.
 * - The foreground is the terminal's foreground on every ground, because
 *   the two are one constant on one material and take one floor.
 */

import { describe, expect, it } from 'vitest';
import { converter, parse } from 'culori';
import { gmuxMonacoTheme } from '../monaco-theme';
import { terminalTextFor } from '../../terminal/theme';

const toOklch = converter('oklch');
const L = (hex: string): number => toOklch(parse(hex))?.l ?? -1;

const SHIPPED = { scheme: 'dark' as const, overrides: {}, canvas: '#131417', textDark: false };

describe('gmuxMonacoTheme', () => {
  it('reproduces the Phase 11 table at the shipped state', () => {
    const t = gmuxMonacoTheme(SHIPPED);
    expect(t.base).toBe('vs-dark');
    expect(t.colors['editor.background']).toBe('#131417');
    expect(t.colors['editor.foreground']).toBe('#D8DBE2');
    expect(t.colors['editorCursor.foreground']).toBe('#E8EAED');
    expect(t.colors['editor.lineHighlightBackground']).toBe('#191B20');
    expect(t.colors['editorLineNumber.foreground']).toBe('#565B66');
    expect(t.colors['editorLineNumber.activeForeground']).toBe('#9CA1AB');
    expect(t.colors['editorIndentGuide.background1']).toBe('#202329');
    expect(t.colors['editorWhitespace.foreground']).toBe('#25282E');
    expect(t.colors['scrollbarSlider.background']).toBe('#20232999');
    expect(t.colors['minimapSlider.activeBackground']).toBe('#353943EE');
    expect(t.colors['editor.selectionBackground']).toBe('#4D9DE84D');
    expect(t.colors['minimap.findMatchHighlight']).toBe('#F5B84A66');
    const rule = (token: string): string | undefined =>
      t.rules.find((r) => r.token === token)?.foreground;
    expect(rule('comment')).toBe('6E7583');
    expect(rule('string')).toBe('6BC46D');
    expect(rule('keyword')).toBe('6CB6FF');
    expect(rule('number')).toBe('E2B340');
    expect(rule('identifier')).toBe('D8DBE2');
    expect(t.rules).toHaveLength(20);
  });

  it('moves exactly the neutrals for a rotated frame', () => {
    const rotated = gmuxMonacoTheme({
      scheme: 'dark',
      overrides: {
        '--bg-canvas': '#171314',
        '--bg-surface': '#1f191b',
        '--bg-raised': '#282123',
        '--bg-active': '#302629',
        '--border': '#2d2628',
        '--border-strong': '#423539'
      },
      canvas: '#171314',
      textDark: false
    });
    const shipped = gmuxMonacoTheme(SHIPPED);
    expect(rotated.colors['editor.background']).toBe('#171314');
    expect(rotated.colors['editorGutter.background']).toBe('#171314');
    expect(rotated.colors['minimap.background']).toBe('#171314');
    expect(rotated.colors['editor.lineHighlightBackground']).toBe('#1f191b');
    expect(rotated.colors['scrollbarSlider.background']).toBe('#28212399');
    expect(rotated.colors['editorBracketMatch.border']).toBe('#423539');
    // Nothing chromatic moved, and no syntax colour moved either.
    expect(rotated.colors['editor.selectionBackground']).toBe(shipped.colors['editor.selectionBackground']);
    expect(rotated.colors['focusBorder']).toBe(shipped.colors['focusBorder']);
    expect(rotated.colors['minimap.errorHighlight']).toBe(shipped.colors['minimap.errorHighlight']);
    expect(rotated.rules).toEqual(shipped.rules);
    expect(rotated.colors['editor.foreground']).toBe(shipped.colors['editor.foreground']);
  });

  it('flips the syntax ramp and the foreground darker than a light canvas', () => {
    const light = gmuxMonacoTheme({
      scheme: 'dark',
      overrides: { '--bg-canvas': '#d9dbdf' },
      canvas: '#d9dbdf',
      textDark: true
    });
    expect(L(light.colors['editor.foreground'] ?? '')).toBeLessThan(L('#d9dbdf'));
    expect(L(light.colors['editorCursor.foreground'] ?? '')).toBeLessThan(L('#d9dbdf'));
    for (const rule of light.rules) {
      expect(L(`#${rule.foreground ?? ''}`), rule.token).toBeLessThan(L('#d9dbdf'));
    }
  });

  it('ignores an override that is not a six digit hex', () => {
    const t = gmuxMonacoTheme({
      scheme: 'dark',
      overrides: { '--bg-raised': 'rgba(40, 33, 35, 0.5)' },
      canvas: '#131417',
      textDark: false
    });
    expect(t.colors['scrollbarSlider.background']).toBe('#20232999');
  });

  it('agrees with the terminal foreground on every ground, the floor included', () => {
    // #787571 is a ground the shipped foreground reads about 3.3:1 on, over
    // the palette floor and under the text floor; the terminal lifts its
    // foreground there and the editor must lift to the same byte.
    const grounds: [string, boolean][] = [
      ['#131417', false],
      ['#161411', false],
      ['#434447', false],
      ['#787571', false],
      ['#787672', true],
      ['#bebbb7', true],
      ['#d9dbdf', true]
    ];
    for (const [canvas, textDark] of grounds) {
      const t = gmuxMonacoTheme({ scheme: 'dark', overrides: { '--bg-canvas': canvas }, canvas, textDark });
      const term = terminalTextFor(canvas, textDark);
      expect(t.colors['editor.foreground']?.toLowerCase(), canvas).toBe(term.foreground.toLowerCase());
      expect(t.colors['editorCursor.foreground']?.toLowerCase(), canvas).toBe(term.cursor.toLowerCase());
    }
    const lifted = gmuxMonacoTheme({ scheme: 'dark', overrides: { '--bg-canvas': '#787571' }, canvas: '#787571', textDark: false });
    expect(lifted.colors['editor.foreground']).not.toBe('#D8DBE2');
  });

  it('fills the same table from the light palette over vs (Phase 213)', () => {
    const light = gmuxMonacoTheme({ scheme: 'light', overrides: {}, canvas: '#f5f7fa', textDark: true });
    const dark = gmuxMonacoTheme(SHIPPED);
    expect(light.base).toBe('vs');
    expect(light.colors['editor.background']).toBe('#f5f7fa');
    expect(light.colors['editor.foreground']).toBe('#282a30');
    expect(light.colors['editorCursor.foreground']).toBe('#1e1f22');
    expect(light.colors['editor.lineHighlightBackground']).toBe('#fcfcfe');
    expect(light.colors['editorLineNumber.foreground']).toBe('#9297a4');
    expect(light.colors['editorLineNumber.activeForeground']).toBe('#4f535c');
    expect(light.colors['editor.selectionBackground']).toBe('#2175bd4D');
    expect(light.colors['focusBorder']).toBe('#2175bd');
    expect(light.colors['minimap.findMatchHighlight']).toBe('#97690066');
    expect(light.colors['editorBracketHighlight.unexpectedBracket.foreground']).toBe('#b23534');
    const rule = (token: string): string | undefined =>
      light.rules.find((r) => r.token === token)?.foreground;
    expect(rule('comment')).toBe('6a707d');
    expect(rule('string')).toBe('006814');
    expect(rule('keyword')).toBe('025b9e');
    expect(rule('number')).toBe('715500');
    expect(rule('identifier')).toBe('282a30');
    // The same keys, the same rule tokens, in the same order: one table.
    expect(Object.keys(light.colors)).toEqual(Object.keys(dark.colors));
    expect(light.rules.map((r) => r.token)).toEqual(dark.rules.map((r) => r.token));
    // Every text colour is darker than the paper.
    for (const r of light.rules) {
      if (r.foreground !== undefined) expect(L(`#${r.foreground}`), r.token).toBeLessThan(L('#f5f7fa'));
    }
    // And the dark answer is what it was: the scheme field did not move it.
    expect(dark.colors['editor.background']).toBe('#131417');
    expect(dark.base).toBe('vs-dark');
  });
});
