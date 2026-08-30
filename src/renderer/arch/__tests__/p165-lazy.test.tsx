/**
 * Phase 165. The Architecture subject's lazy door, run rather than read.
 *
 * The claims: the sidebar reaches the header and the view through ONE
 * dynamic import of `./subject.ts`, so both arrive in one chunk from one
 * fetch; the barrel no longer re-exports either from its own file, because a
 * static re-export would keep the subject in the entry chunk whether or not
 * the name was used; the header's fallback is the empty band and not
 * nothing, so the first show does not collapse the sidebar by 36px; and the
 * real subject module exports what the door reads.
 *
 * No jsdom in this repository, so the wrappers render through
 * `renderToStaticMarkup`. The subject module is mocked so its evaluations
 * can be counted without rendering the real view, which its own tests do.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

const DIR = join(import.meta.dirname, '..');

/** How many times the subject's module was evaluated. */
const evaluated = { count: 0 };

vi.mock('../subject', () => {
  evaluated.count += 1;
  return {
    ArchHeader: () =>
      React.createElement('div', { className: 'view-header', 'data-stub': 'header' }),
    ArchView: () => React.createElement('div', { className: 'arch', 'data-stub': 'view' })
  };
});

const { ArchHeaderLazy, ArchViewLazy, preloadArchSubject } = await import('../lazy');

const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

describe('the Architecture subject is a lazy door (Phase 165)', () => {
  it('reaches the subject through one dynamic import of one door', () => {
    const lazy = readFileSync(join(DIR, 'lazy.tsx'), 'utf8');
    expect(lazy.match(/(?<!typeof )import\(\s*'\.\/subject'\s*\)/g) ?? []).toHaveLength(1);
    expect(lazy).not.toMatch(/from\s+'\.\/(ArchView|ArchHeader|subject)'/);
    const statics = [...lazy.matchAll(/from\s+'([^']+)'/g)].map((m) => m[1]);
    expect(statics).toEqual(['react', '../lazy/door']);

    const subject = readFileSync(join(DIR, 'subject.ts'), 'utf8');
    const exports = [...subject.matchAll(/export \{ (\w+) \} from '\.\/(\w+)'/g)].map(
      (m) => `${m[1]}:${m[2]}`
    );
    expect(exports.sort()).toEqual(['ArchHeader:ArchHeader', 'ArchView:ArchView']);
  });

  it('keeps the barrel off the subject files, and on the door', () => {
    const barrel = readFileSync(join(DIR, 'index.ts'), 'utf8');
    expect(barrel).not.toMatch(/from\s+'\.\/(ArchView|ArchHeader|subject)'/);
    expect(barrel).toMatch(/export \{[^}]*ArchHeaderLazy[^}]*\} from '\.\/lazy'/);
    expect(barrel).toMatch(/export \{[^}]*ArchViewLazy[^}]*\} from '\.\/lazy'/);
  });

  it('draws the empty band while the chunk is in flight, and no body', () => {
    expect(evaluated.count).toBe(0);
    expect(renderToStaticMarkup(<ArchHeaderLazy />)).toBe(
      '<div class="view-header" data-slot="view-header"></div>'
    );
    expect(renderToStaticMarkup(<ArchViewLazy />)).toBe('');
  });

  it('draws both parts from one fetch once the door has opened', async () => {
    await preloadArchSubject();
    await flush();
    expect(evaluated.count).toBe(1);
    expect(renderToStaticMarkup(<ArchHeaderLazy />)).toContain('data-stub="header"');
    expect(renderToStaticMarkup(<ArchViewLazy />)).toContain('data-stub="view"');
    await preloadArchSubject();
    expect(evaluated.count).toBe(1);
  });

  it('names exports the real subject module has', async () => {
    const real = await vi.importActual<typeof import('../subject')>('../subject');
    expect(typeof real.ArchHeader).toBe('function');
    expect(typeof real.ArchView).toBe('function');
  });
});
