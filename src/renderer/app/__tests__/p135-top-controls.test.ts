/**
 * Phase 135, item two, states A and B, reordered by Phase 148. The + is in
 * the title band whether the project row is expanded or collapsed, and it
 * sits to the right of wherever the projects are drawn. Phase 148 moved the
 * band's own controls to its HEAD, reversed, so the position control is the
 * one nearest the traffic lights, then the chevron, then the projects.
 *
 * The defect this file guards against is one missing element. Collapsing the
 * project row on top left the band holding a chip, a collapse chevron and a
 * position button, and no +. A person who collapsed the row lost the only
 * mouse path to "New project, or open one", because that verb has no other
 * button anywhere in the window. The + is now drawn in both branches.
 *
 * What these tests hold:
 *  - the collapsed branch draws the +, and draws it directly after the chip,
 *    because the chip is where the projects are in that state;
 *  - the expanded branch draws the + after the tabs, which is where it has
 *    always been, so state A did not move;
 *  - both branches read the same way left to right, being the projects, then
 *    the +, then the collapse chevron, then the position button;
 *  - the + is ONE element referenced twice rather than two hand written
 *    copies, so the two branches cannot drift apart the way a second copy of
 *    the position button would;
 *  - with the projects on the left the band still draws no project nav,
 *    which is Phase 129's rule and this phase does not touch it;
 *  - the band still carries its 76px traffic light inset and the + is still
 *    the 24px no-drag square it already was, so this phase needed no CSS and
 *    nothing it added can sit under the traffic lights.
 *
 * WHY THE ORDER IS READ FROM THE SOURCE RATHER THAN FROM A RENDER. The vitest
 * environment is node and this repository carries no jsdom. `Titlebar()` reads
 * `projectsPosition`, `projectsCollapsed` and the project list from the
 * zustand store, and in a server render zustand answers every selector from
 * the store's INITIAL state, so `useApp.setState` cannot reach the component
 * and all three shapes render as one. That was measured on 2026-08-22: three
 * renders with three different store states produced byte identical markup.
 * So the order is read off the JSX, which is the shape p93-attention-row and
 * p95-strip-note both use for a fact a node render cannot show. What a person
 * sees is the Tier 2 screenshot read and build/probe-p135-controls.mjs, not
 * this file.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../../../..');

const SRC = readFileSync(resolve(HERE, '../Titlebar.tsx'), 'utf8');
// The ＋ button's body moved into its own component during integration, so
// the title band and the project rail draw one element rather than two copies
// of one. The labels and the menu call are pinned there now.
const ADD = readFileSync(resolve(HERE, '../NewProjectButton.tsx'), 'utf8');
const CSS = readFileSync(resolve(ROOT, 'src/renderer/styles/app.css'), 'utf8');

/**
 * The two `<nav className="titlebar-tabs">` blocks, in source order. The
 * collapsed branch is written first and the expanded branch second, which is
 * the order the ternary in `Titlebar()` puts them in.
 */
function navBlocks(): { collapsed: string; expanded: string } {
  const blocks: string[] = [];
  let from = 0;
  for (;;) {
    const open = SRC.indexOf('<nav className="titlebar-tabs"', from);
    if (open === -1) break;
    const close = SRC.indexOf('</nav>', open);
    expect(close).toBeGreaterThan(open);
    blocks.push(SRC.slice(open, close));
    from = close;
  }
  expect(blocks).toHaveLength(2);
  return { collapsed: blocks[0] as string, expanded: blocks[1] as string };
}

/** Assert that each needle appears, and appears in the order given. */
function inOrder(block: string, needles: string[]): void {
  const found = needles.map((one) => block.indexOf(one));
  for (const one of found) expect(one).toBeGreaterThan(-1);
  expect([...found].sort((a, b) => a - b)).toEqual(found);
}

// ---------------------------------------------------------------------------
// State B. Projects on top, collapsed. This is the state the + was missing
// from, and the only state this builder changed.
// ---------------------------------------------------------------------------

describe('the collapsed project row keeps the +', () => {
  it('draws it at all, which is what Phase 135 fixes', () => {
    expect(navBlocks().collapsed).toContain('{addControl}');
  });

  it('puts it to the RIGHT of the chip, because that is where the projects are', () => {
    inOrder(navBlocks().collapsed, ['<CollapsedProjectChip', '{addControl}']);
  });

  it('reads position button, then chevron, then chip, then + (Phase 148)', () => {
    inOrder(navBlocks().collapsed, [
      '<ProjectsPositionButton />',
      '{collapseControl}',
      '<CollapsedProjectChip',
      '{addControl}'
    ]);
  });

  it('holds four children and no fifth', () => {
    const block = navBlocks().collapsed;
    expect(block.split('<CollapsedProjectChip').length - 1).toBe(1);
    expect(block.split('{addControl}').length - 1).toBe(1);
    expect(block.split('{collapseControl}').length - 1).toBe(1);
    expect(block.split('<ProjectsPositionButton').length - 1).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// State A. Projects on top, expanded. Nothing here moved.
// ---------------------------------------------------------------------------

describe('the expanded project row carries its controls at its head (Phase 148)', () => {
  it('draws the position button, then the chevron, then the tabs, then the +', () => {
    inOrder(navBlocks().expanded, [
      '<ProjectsPositionButton />',
      '{collapseControl}',
      '<ProjectTab',
      '{addControl}'
    ]);
  });

  it('still draws the drop indicator before the +, so a drag lands as it did', () => {
    inOrder(navBlocks().expanded, ['<TabIndicator', '{addControl}']);
  });

  it('draws no chip, because the tabs carry their own names', () => {
    expect(navBlocks().expanded).not.toContain('CollapsedProjectChip');
  });
});

// ---------------------------------------------------------------------------
// One button, referenced twice.
// ---------------------------------------------------------------------------

describe('the + does not change identity when the row collapses', () => {
  it('is one element in the source, not two hand written copies', () => {
    expect(SRC.split('className="ptab-add"').length - 1).toBe(1);
    expect(SRC.split('const addControl =').length - 1).toBe(1);
    expect(SRC.split('{addControl}').length - 1).toBe(2);
    // The band no longer writes the button's body at all. It names the class
    // and nothing else, so it cannot drift from the project rail's copy.
    expect(SRC).not.toContain('showProjectMenu(');
    expect(SRC).toContain('<NewProjectButton className="ptab-add" />');
  });

  it('carries the labels the + has always carried, unchanged', () => {
    expect(ADD).toContain("NEW_PROJECT_LABEL = 'New project, or open one'");
    expect(ADD).toContain('title={NEW_PROJECT_LABEL}');
    expect(ADD).toContain('aria-label={NEW_PROJECT_LABEL}');
    expect(ADD).toContain('aria-haspopup="menu"');
    expect(ADD).toContain('showProjectMenu(r.left, r.bottom)');
    expect(ADD).toContain('<Codicon name="add" size="lg" />');
  });
});

// ---------------------------------------------------------------------------
// Phase 129's rule, which this phase does not touch.
// ---------------------------------------------------------------------------

describe('with the projects on the left the band draws none of them', () => {
  it('still returns null for both nav branches', () => {
    expect(SRC).toContain("projectsPosition === 'left' ? null : projectsCollapsed ?");
  });
});

// ---------------------------------------------------------------------------
// The traffic lights still own the band's first 76px, and no CSS was needed.
// ---------------------------------------------------------------------------

describe('the title band’s geometry', () => {
  it('still insets the whole band by 76px for the traffic lights', () => {
    const rule = CSS.slice(
      CSS.indexOf('.titlebar {'),
      CSS.indexOf('.titlebar-tabs {')
    );
    expect(rule).toContain('padding-left: 76px');
  });

  it('lays the nav out as a flex row with a gap, which the + needs nothing more than', () => {
    const rule = CSS.slice(
      CSS.indexOf('.titlebar-tabs {'),
      CSS.indexOf('.ptab-wrap {')
    );
    expect(rule).toContain('display: flex');
    expect(rule).toContain('gap: var(--space-2)');
  });

  it('already sized the + at 24px and already took it out of the drag region', () => {
    const rule = CSS.slice(
      CSS.indexOf('.ptab-add {'),
      CSS.indexOf('.ptab-add:hover')
    );
    expect(rule).toContain('width: 24px');
    expect(rule).toContain('height: 24px');
    expect(rule).toContain('-webkit-app-region: no-drag');
  });
});
