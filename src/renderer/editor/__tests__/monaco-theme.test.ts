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
 */

import { describe, expect, it } from 'vitest';
import { converter, parse } from 'culori';
import { gmuxMonacoTheme } from '../monaco-theme';

const toOklch = converter('oklch');
const L = (hex: string): number => toOklch(parse(hex))?.l ?? -1;

const SHIPPED = { overrides: {}, canvas: '#131417', textDark: false };

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
      overrides: { '--bg-raised': 'rgba(40, 33, 35, 0.5)' },
      canvas: '#131417',
      textDark: false
    });
    expect(t.colors['scrollbarSlider.background']).toBe('#20232999');
  });
});
