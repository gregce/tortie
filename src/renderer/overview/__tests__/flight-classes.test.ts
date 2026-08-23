/**
 * The page rides the focus flight and writes no second animation
 * (Phase 137).
 *
 * overview-flight.ts must import the mode's own classes, timing reads and
 * arrival verbs from ../app/focus-flight and declare no motion of its own.
 * overview.css may animate opacity and nothing else, and its one animation
 * rides the gmux-focus-chrome-in keyframes focus-mode.css declares.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const DIR = join(__dirname, '..');
const flight = readFileSync(join(DIR, 'overview-flight.ts'), 'utf8');
const css = readFileSync(join(DIR, 'overview.css'), 'utf8');

describe('overview-flight.ts', () => {
  it('imports the six focus flight names from ../app/focus-flight', () => {
    const importBlock = /import\s*\{([\s\S]*?)\}\s*from\s*'\.\.\/app\/focus-flight';/.exec(
      flight
    );
    expect(importBlock, 'one import from ../app/focus-flight').not.toBeNull();
    const names = (importBlock?.[1] ?? '')
      .split(',')
      .map((n) => n.trim())
      .filter((n) => n.length > 0);
    for (const wanted of [
      'FLIGHT_CLASS',
      'ARRIVE_ATTR',
      'flightTiming',
      'prefersReducedMotion',
      'beginArrival',
      'clearArrival'
    ]) {
      expect(names, `${wanted} must be imported`).toContain(wanted);
    }
  });

  it('declares no keyframes and no transition of its own', () => {
    expect(flight).not.toContain('@keyframes');
    expect(flight).not.toMatch(/\btransition\b/);
  });
});

describe('overview.css', () => {
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '');

  it('declares no keyframes of its own', () => {
    expect(stripped).not.toContain('@keyframes');
  });

  it('rides the shared keyframes for its one animation', () => {
    const animations = [...stripped.matchAll(/animation\s*:\s*([^;]+);/g)].map(
      (m) => m[1] ?? ''
    );
    expect(animations.length).toBeGreaterThan(0);
    for (const value of animations) {
      expect(value).toContain('gmux-focus-chrome-in');
    }
  });

  it('transitions nothing but opacity', () => {
    const transitions = [
      ...stripped.matchAll(/transition\s*:\s*([^;]+);/g)
    ].map((m) => m[1] ?? '');
    for (const value of transitions) {
      expect(value).toMatch(/^\s*opacity[\s\S]*$/);
      for (const banned of [
        'width',
        'height',
        'inset',
        'left',
        'top',
        'right',
        'bottom',
        'flex',
        'margin',
        'padding',
        'all'
      ]) {
        expect(value, `transition animates ${banned}`).not.toMatch(
          new RegExp(`(^|[\\s,])${banned}([\\s,]|$)`)
        );
      }
    }
  });
});
