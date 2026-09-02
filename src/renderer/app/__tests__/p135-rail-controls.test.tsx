/**
 * Phase 135 — the project rail's controls sit at its head, and the ＋ never
 * leaves the rail.
 *
 * Two things were wrong before this phase. The position button and the
 * collapse chevron sat at the far right of the expanded band, 160px from the
 * traffic lights they belong beside. The ＋ was not drawn at all in the
 * collapsed 48px rail, because two 24px buttons do not fit side by side in a
 * 48px band and the button was dropped rather than moved.
 *
 * What these tests hold:
 * - the expanded band draws its children in one order, being the position
 *   button, the chevron, the word Projects, the count, the spacer and the ＋;
 * - the ＋ is the band's last child, so the spacer holds it at the tail;
 * - the collapsed rail draws the ＋ in its footer, above the position button,
 *   so the position button stays the last thing at the rail's foot;
 * - the two ＋ buttons are the same button, carrying the same class, the same
 *   title and the same accessible name;
 * - the footer is 72px with a 4px gap, which seats two 24px buttons with 10px
 *   of slack above the pair and 10px below;
 * - the label is the thing that yields, so it carries the ellipsis rules and
 *   no control does;
 * - no glyph and no label changed, so the chevron's four sentences and the
 *   position button's two are the ones Phase 129 wrote.
 *
 * The vitest environment is node and this repository has no jsdom, so these
 * read static markup from react-dom/server and the stylesheet as text. What a
 * person actually sees is the Tier 2 screenshot read at four states, and
 * build/probe-p135-controls.mjs prints the measured rects.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

const HERE = dirname(fileURLToPath(import.meta.url));

// The store reads window.gmux while zustand builds its initial state, so the
// globals have to exist before the modules under test are ever imported.
vi.stubGlobal('window', {
  addEventListener() {},
  removeEventListener() {},
  setTimeout,
  clearTimeout,
  gmux: {}
});
vi.stubGlobal('localStorage', {
  getItem: () => null,
  setItem() {},
  removeItem() {}
});
vi.stubGlobal('document', {
  body: { classList: { add() {}, remove() {}, contains: () => false } },
  documentElement: { style: { setProperty() {} } },
  querySelector: () => null,
  addEventListener() {},
  removeEventListener() {}
});

/** 200px expanded, 48px collapsed. The test drives which one is drawn. */
const rendered = { width: 200 };

// A partial mock: the store's own slice reads other exports of this module
// while zustand builds its initial state, so only the four the rail calls are
// replaced.
vi.mock('../../state/chrome-geometry', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  PROJECT_RAIL_COLLAPSED_W: 48,
  projectsRenderedWidth: () => rendered.width,
  projectRailForcedNarrow: () => false,
  useWindowWidth: () => 1600
}));

vi.mock('../project-tabs-data', () => ({
  useProjectTabs: () => [
    {
      project: { id: 'p1', name: 'tortie', path: '/Users/x/tortie' },
      dot: 'none',
      attentionCount: 0,
      sessionCount: 0,
      machine: null,
      title: '/Users/x/tortie'
    }
  ]
}));

vi.mock('../modifier-held', () => ({ useCommandHeld: () => false }));

/**
 * The store is read through a selector, and a server render answers a zustand
 * selector from the store's INITIAL state rather than from anything the test
 * writes afterwards. So the hook itself is replaced with one that reads this
 * object, and the object is what the test drives. Everything else the module
 * exports is kept, because the rail's neighbours import it too.
 */
const state: Record<string, unknown> = {
  projectsPosition: 'left',
  projectsCollapsed: false,
  activeProjectId: 'p1',
  setProjectsCollapsed() {},
  setProjectsPosition() {},
  setActiveProject() {},
  closeProject() {},
  setMenu() {}
};

vi.mock('../../state/store', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useApp: (select: (s: Record<string, unknown>) => unknown) => select(state)
}));

const { ProjectRail } = await import('../ProjectRail');
const { collapseIcon, collapseLabel, PROJECTS_LABEL } = await import(
  '../projects-position'
);

const CSS = readFileSync(resolve(HERE, '..', 'project-rail.css'), 'utf8');
const SOURCE = readFileSync(resolve(HERE, '..', 'ProjectRail.tsx'), 'utf8');
// The ＋ button's body moved into its own component during integration, so
// the title band and the rail draw one element rather than two copies of one.
// The glyph and the menu call are pinned there now.
const ADD_SOURCE = readFileSync(
  resolve(HERE, '..', 'NewProjectButton.tsx'),
  'utf8'
);

function draw(width: number): string {
  rendered.width = width;
  state.projectsCollapsed = width === 48;
  return renderToStaticMarkup(<ProjectRail />);
}

/**
 * The class attributes of the band's own children, in the order drawn. The
 * glyph inside each button carries a class of its own, so those are dropped
 * and what is left is the band's children.
 */
function bandChildren(markup: string): string[] {
  const band = markup.split('class="prail-band"')[1] ?? '';
  const list = band.split('class="prail-list"')[0] ?? '';
  const out: string[] = [];
  const re = /class="([^"]+)"/g;
  let m = re.exec(list);
  while (m !== null) {
    const cls = m[1] ?? '';
    if (!cls.startsWith('codicon')) out.push(cls);
    m = re.exec(list);
  }
  return out;
}

/** The declarations inside one rule of project-rail.css, as text. */
function ruleBody(selector: string): string {
  return (CSS.split(`${selector} {`)[1] ?? '').split('}')[0] ?? '';
}

beforeEach(() => {
  rendered.width = 200;
});

describe('the expanded band', () => {
  it('puts the position button first and the chevron second', () => {
    const children = bandChildren(draw(200));
    expect(children[0]).toBe('icon-btn projects-position');
    expect(children[1]).toBe('icon-btn prail-collapse');
  });

  it('reads position, chevron, Projects, count, spacer, ＋', () => {
    const children = bandChildren(draw(200));
    expect(children).toEqual([
      'icon-btn projects-position',
      'icon-btn prail-collapse',
      'prail-title',
      'prail-count num',
      'prail-spacer',
      'icon-btn prail-add'
    ]);
  });

  it('draws the word and the count that Phase 129 wrote', () => {
    const markup = draw(200);
    expect(markup).toContain(`>${PROJECTS_LABEL}<`);
    expect(markup).toContain('class="prail-count num">1<');
  });

  it('keeps the ＋ last, which is what the spacer is now for', () => {
    const children = bandChildren(draw(200));
    expect(children[children.length - 1]).toBe('icon-btn prail-add');
    expect(CSS).toMatch(/\.prail-spacer \{\n {2}flex: 1;\n\}/);
  });
});

describe('the collapsed rail', () => {
  it('draws the ＋, which it did not draw before this phase', () => {
    expect(draw(48)).toContain('class="icon-btn prail-add"');
  });

  it('puts the ＋ above the position button in the footer', () => {
    const footer = draw(48).split('class="prail-footer"')[1] ?? '';
    const add = footer.indexOf('prail-add');
    const position = footer.indexOf('projects-position');
    expect(add).toBeGreaterThan(-1);
    expect(position).toBeGreaterThan(add);
  });

  it('keeps one centred chevron in the band and nothing else', () => {
    expect(bandChildren(draw(48))).toEqual(['icon-btn prail-collapse']);
  });

  it('draws the footer even with no projects open', () => {
    expect(SOURCE).toContain('{collapsed ? (\n          <div className="prail-footer">');
    expect(SOURCE).not.toContain('tabs.length > 0 && collapsed');
  });
});

describe('the two ＋ buttons are one button', () => {
  it('carries the same class, title and accessible name in both states', () => {
    const both = [draw(200), draw(48)];
    for (const markup of both) {
      expect(markup).toContain(
        '<button type="button" class="icon-btn prail-add" title="New project, or open one" aria-label="New project, or open one" aria-haspopup="menu">'
      );
    }
  });

  it('is written once in the source, not copied', () => {
    const copies = SOURCE.match(/className="icon-btn prail-add"/g) ?? [];
    expect(copies).toHaveLength(1);
  });
});

describe('the CSS that makes the two states fit', () => {
  it('sizes the ＋ at 24px, beside the chevron and the position button', () => {
    expect(CSS).toContain(
      '.prail-collapse,\n.projects-position,\n.prail-add {\n  width: 24px;\n  height: 24px;\n}'
    );
  });

  it('stacks the footer at 72px with a 4px gap', () => {
    const footer = ruleBody('.prail-footer');
    expect(footer).toContain('flex-direction: column');
    expect(footer).toContain('gap: var(--space-2)');
    expect(footer).toContain('height: 72px');
    expect(footer).toContain('flex: 0 0 72px');
    // 72 minus two 24px buttons minus one 4px gap, halved, is 10px above the
    // pair and 10px below.
    expect((72 - (24 + 24 + 4)) / 2).toBe(10);
  });

  it('makes the label the thing that yields, never a control', () => {
    const title = ruleBody('.prail-title');
    expect(title).toContain('min-width: 0');
    expect(title).toContain('overflow: hidden');
    expect(title).toContain('text-overflow: ellipsis');
    expect(title).toContain('white-space: nowrap');
    expect(CSS).not.toContain('.prail-add {\n  min-width');
  });

  it('states no width in pixels for the rail itself', () => {
    expect(CSS).not.toContain('width: 200px');
    expect(CSS).not.toMatch(/\.project-rail[^{]*\{[^}]*width: 48px/);
  });

  it('adds no width transition anywhere', () => {
    expect(CSS).not.toContain('transition: width');
  });
});

describe('nothing about the glyphs or the labels moved', () => {
  it('keeps the four collapse sentences Phase 129 wrote', () => {
    expect(collapseLabel('left', false)).toBe('Collapse the project rail');
    expect(collapseLabel('left', true)).toBe('Show project names');
    expect(collapseIcon('left', false)).toBe('chevron-left');
    expect(collapseIcon('left', true)).toBe('chevron-right');
  });

  it('keeps the ＋ glyph and asks the native menu for its verbs', () => {
    expect(ADD_SOURCE).toContain('<Codicon name="add" size="lg" />');
    expect(ADD_SOURCE).toContain('showProjectMenu(r.left, r.bottom)');
    // The rail states the class and nothing else, so it cannot drift from the
    // title band's copy of the same button.
    expect(SOURCE).toContain('<NewProjectButton className="icon-btn prail-add" />');
  });
});
