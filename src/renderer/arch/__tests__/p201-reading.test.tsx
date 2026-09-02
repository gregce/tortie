/**
 * The reading on the sidebar (Phase 201, research 77 section 7).
 *
 * Rendered to static markup over a seeded store, so what the rows say, in
 * what order, and what rides each hover is pinned without an app. The probe
 * `build/probe-p201-reading.mjs` reads the same rows off the live DOM.
 */

import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ArchMapGroup, ArchMapResult } from '@shared/ipc';
import { ReadingFace, partsByWeight, weightPercent, weightWidth } from '../ArchDrill';
import { ArchHeaderFace } from '../ArchHeader';
import {
  archBandTitle,
  ARCH_CHECK_BODY,
  ARCH_CHECK_LABEL,
  ARCH_COMPONENTS_TITLE,
  ARCH_MAP_OPEN_BODY,
  ARCH_MAP_OPEN_TITLE,
  ARCH_MODEL_NONE,
  ARCH_MODEL_NONE_TITLE,
  ARCH_REPO_LINE_TITLE,
  ARCH_SUBJECT_TITLE
} from '../copy';

function group(over: Partial<ArchMapGroup> & Pick<ArchMapGroup, 'id' | 'fileCount'>): ArchMapGroup {
  return {
    dir: over.id,
    label: over.id,
    componentId: null,
    description: null,
    band: 'engine',
    provenance: 'first-party',
    totalImports: 0,
    resolvedImports: 0,
    externalImports: 0,
    unresolvedImports: 0,
    languages: [{ name: 'TypeScript', files: over.fileCount }],
    lines: over.fileCount * 10,
    entries: [],
    sentence: `${String(over.fileCount)} files, TypeScript; no imports either way.`,
    facts: [`Size: ${String(over.fileCount)} files, ${String(over.fileCount * 10)} lines`, 'Languages: TypeScript'],
    ...over
  };
}

function model(): ArchMapResult {
  return {
    cwd: '/Users/op/project',
    building: false,
    scannedAtCommit: '0'.repeat(40),
    subject: 'tortie',
    sentence:
      'tortie: 100 files, TypeScript; 4 parts, the biggest src/main (50%); 2 connections between parts; 9 of 10 imports lead inside the repository.',
    groups: [
      group({ id: 'build', fileCount: 20, band: 'surface', facts: ['Size: 20 files, 200 lines', 'Languages: JavaScript 20', 'Uses: src/main 3'] }),
      group({ id: 'other', dir: '', label: 'everything else', fileCount: 5, band: 'surface' }),
      group({ id: 'src-main', dir: 'src/main', label: 'src/main', fileCount: 50, band: 'engine' }),
      group({ id: 'src-shared', dir: 'src/shared', label: 'src/shared', fileCount: 25, band: 'foundation' })
    ],
    edges: [],
    fileCount: 100,
    totalImports: 10,
    resolvedImports: 9,
    unresolvedImports: 1,
    contractPresent: false
  };
}

/** The face over the seeded model, with the drill on. */
function face(over: { model?: ArchMapResult; drilled?: string | null; open?: boolean } = {}): string {
  return renderToStaticMarkup(
    createElement(ReadingFace, {
      model: over.model ?? model(),
      drilledGroupId: over.drilled ?? null,
      onOpen: over.open === false ? null : vi.fn()
    })
  );
}

describe('the reading', () => {
  it('draws the repository line, the model slot and the components in that order', () => {
    const html = face();
    const repo = html.indexOf('data-slot="arch-reading-repo"');
    const slot = html.indexOf('data-slot="arch-reading-model"');
    const parts = html.indexOf(`aria-label="${ARCH_COMPONENTS_TITLE}"`);
    expect(repo).toBeGreaterThan(-1);
    expect(slot).toBeGreaterThan(repo);
    expect(parts).toBeGreaterThan(slot);
    expect(html).toContain('>tortie<');
    expect(html).toContain(`title="${ARCH_SUBJECT_TITLE}"`);
    expect(html).toContain('the biggest src/main (50%)');
    expect(html).toContain(`title="${ARCH_REPO_LINE_TITLE}"`);
    expect(html).toContain(`>${ARCH_MODEL_NONE}<`);
    expect(html).toContain(`title="${ARCH_MODEL_NONE_TITLE}"`);
    // The model slot carries no control: no model call is made in this phase.
    expect(html.slice(slot, parts)).not.toContain('<button');
  });

  it('lists the parts by weight, each with its glyph, bar, sentence and the facts on hover', () => {
    const html = face();
    const order = [...html.matchAll(/data-group="([a-z-]+)"/g)].map((m) => m[1]);
    expect(order).toEqual(['src-main', 'src-shared', 'build', 'other']);
    // Every row is a button with the ten facts joined by newlines on its title.
    expect(html).toContain('title="Size: 20 files, 200 lines\nLanguages: JavaScript 20\nUses: src/main 3"');
    expect(html).toContain('>50 files, TypeScript; no imports either way.<');
    expect(html).toContain('>everything else<');
    expect(html).toContain(`<title>${archBandTitle('surface')}</title>`);
    expect(html).toContain(`<title>${archBandTitle('foundation')}</title>`);
    expect(html).toContain('title="50% of the files in the repository"');
    expect(html).toContain('title="5% of the files in the repository"');
    // No count on any face: the numbers on the face are inside the sentence only.
    expect(html).not.toContain('rd-count');
  });

  it('draws the line and the slot and no rows on an empty model', () => {
    const html = face({ model: { ...model(), groups: [] } });
    expect(html).toContain('data-slot="arch-reading-repo"');
    expect(html).toContain(`>${ARCH_MODEL_NONE}<`);
    expect(html).not.toContain(`aria-label="${ARCH_COMPONENTS_TITLE}"`);
  });

  it('wears the selected face on the drilled part', () => {
    const html = face({ drilled: 'src-shared' });
    expect(html).toContain('class="rd-part arch-row-drill selected" aria-current="true"');
    expect(html.match(/aria-current="true"/g)?.length).toBe(1);
  });

  it('keeps the rows read only on a build with no scoped read', () => {
    const html = face({ open: false });
    expect(html).not.toContain('<button');
    expect(html).toContain('class="rd-part"');
  });
});

describe('the weight', () => {
  it('orders heaviest first with ties by id, rounds the percent, and floors the bar', () => {
    const groups = [group({ id: 'b', fileCount: 3 }), group({ id: 'a', fileCount: 3 }), group({ id: 'c', fileCount: 9 })];
    expect(partsByWeight(groups).map((g) => g.id)).toEqual(['c', 'a', 'b']);
    expect(weightPercent(groups[2] as ArchMapGroup, 15)).toBe(60);
    expect(weightPercent(groups[0] as ArchMapGroup, 0)).toBe(0);
    expect(weightWidth(groups[2] as ArchMapGroup, 15)).toBe('60%');
    expect(weightWidth(group({ id: 'tiny', fileCount: 1 }), 1000)).toBe('4%');
  });
});

describe('the header', () => {
  it('carries the map and the refresh as two icons with hover titles, in that order', () => {
    const html = renderToStaticMarkup(
      createElement(ArchHeaderFace, {
        progressLabel: null,
        canDraw: true,
        canCheck: true,
        onMap: vi.fn(),
        onCheck: vi.fn()
      })
    );
    const map = html.indexOf(`aria-label="${ARCH_MAP_OPEN_TITLE}"`);
    const refresh = html.indexOf(`aria-label="${ARCH_CHECK_LABEL}"`);
    expect(map).toBeGreaterThan(-1);
    expect(refresh).toBeGreaterThan(map);
    expect(html).toContain('arch-map-open');
    expect(html).toContain(`title="${ARCH_MAP_OPEN_BODY}"`);
    expect(html).toContain(`title="${ARCH_CHECK_BODY}"`);
    // The band carries no words beside its title and no count.
    expect(html).not.toContain('>Open the map<');
  });
});
