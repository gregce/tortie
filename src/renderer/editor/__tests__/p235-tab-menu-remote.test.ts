/**
 * The editor tab strip's context menu on a tab whose file is on another machine
 * (Phase 235 items 1 and 2).
 *
 * It is the sibling of `src/renderer/tree/__tests__/p903-b-tree-menu-remote.test.ts`
 * and asks the same two questions of the same two verbs, because until this
 * phase the two menus answered them differently: the Explorer's menu built no
 * Reveal and put the machine in front of Copy Path, while the strip's menu
 * offered an ENABLED Reveal over a far-side path and copied that path bare.
 * Both homes on the operator's two Macs are `/Users/gdc`, so `fs:reveal` opened
 * Finder on a colliding path here and showed the WRONG file.
 *
 * THE ABSENCE IS THE SAFETY PROPERTY, so it is asserted by name rather than by
 * a count, exactly as the tree's test asserts its two.
 */

import { describe, expect, it } from 'vitest';
import {
  buildTabMenu,
  tabClipboardPath,
  type TabMenuActions,
  type TabMenuCapabilities,
  type TabMenuTarget
} from '../tab-menu';

const noop = (): void => undefined;

const actions = (): TabMenuActions & { copied: string[]; revealed: string[] } => {
  const copied: string[] = [];
  const revealed: string[] = [];
  return {
    close: noop,
    closeOthers: noop,
    closeToRight: noop,
    closeSaved: noop,
    closeAll: noop,
    pin: noop,
    copyText: (text) => void copied.push(text),
    reveal: (path) => void revealed.push(path),
    copied,
    revealed
  };
};

const caps: TabMenuCapabilities = {
  tabCount: 2,
  index: 0,
  anySaved: true,
  reveal: true
};

const LOCAL: TabMenuTarget = {
  path: '/Users/gdc/gmux/src/core/core1.ts',
  relPath: 'src/core/core1.ts',
  preview: false,
  deleted: false
};

/** The same file, in a repository with the same path, on the other computer. */
const REMOTE: TabMenuTarget = {
  ...LOCAL,
  remote: { machineLabel: 'Greg’s Mac Pro' }
};

const labels = (items: ReturnType<typeof buildTabMenu>): string[] =>
  items.filter((one) => one !== 'sep').map((one) => one.label);

const rowNamed = (
  items: ReturnType<typeof buildTabMenu>,
  label: string
): Exclude<(typeof items)[number], 'sep'> | undefined =>
  items.find((one) => one !== 'sep' && one.label === label) as never;

describe('the tab strip menu on another machine', () => {
  it('builds no Reveal in Finder at all, the way the Explorer does not', () => {
    const local = labels(buildTabMenu(LOCAL, caps, actions()));
    const remote = labels(buildTabMenu(REMOTE, caps, actions()));
    expect(local).toContain('Reveal in Finder');
    expect(remote).not.toContain('Reveal in Finder');
  });

  it('is absent rather than disabled, so it cannot be pressed at all', () => {
    const items = buildTabMenu(REMOTE, caps, actions());
    expect(
      items.some((one) => one !== 'sep' && one.label === 'Reveal in Finder')
    ).toBe(false);
  });

  it('differs from the local menu by that one row and nothing else', () => {
    const local = labels(buildTabMenu(LOCAL, caps, actions()));
    const remote = labels(buildTabMenu(REMOTE, caps, actions()));
    expect(local.filter((one) => one !== 'Reveal in Finder')).toEqual(remote);
  });

  it('adds no sentence to the remote menu', () => {
    const remote = buildTabMenu(REMOTE, caps, actions());
    expect(remote.some((one) => one !== 'sep' && one.disabled === true)).toBe(
      false
    );
    expect(labels(remote)).toEqual([
      'Close',
      'Close Others',
      'Close to the Right',
      'Close Saved',
      'Close All',
      'Copy Path',
      'Copy Relative Path'
    ]);
  });

  it('puts the machine in front of Copy Path', () => {
    const a = actions();
    const row = rowNamed(buildTabMenu(REMOTE, caps, a), 'Copy Path');
    row?.run();
    expect(a.copied).toEqual([
      'Greg’s Mac Pro:/Users/gdc/gmux/src/core/core1.ts'
    ]);
  });

  it('leaves Copy Path alone on this Mac', () => {
    const a = actions();
    rowNamed(buildTabMenu(LOCAL, caps, a), 'Copy Path')?.run();
    expect(a.copied).toEqual(['/Users/gdc/gmux/src/core/core1.ts']);
  });

  it('leaves Copy Relative Path alone on both, because it is true on both', () => {
    const here = actions();
    const there = actions();
    rowNamed(buildTabMenu(LOCAL, caps, here), 'Copy Relative Path')?.run();
    rowNamed(buildTabMenu(REMOTE, caps, there), 'Copy Relative Path')?.run();
    expect(here.copied).toEqual(['src/core/core1.ts']);
    expect(there.copied).toEqual(here.copied);
  });

  it('is the Explorer composer and not a second one', () => {
    expect(tabClipboardPath(REMOTE, false)).toBe(
      'Greg’s Mac Pro:/Users/gdc/gmux/src/core/core1.ts'
    );
    expect(tabClipboardPath(REMOTE, true)).toBe('src/core/core1.ts');
  });
});

describe('the tab strip menu on this Mac is unchanged', () => {
  it('keeps the two reasons Reveal is disabled here', () => {
    const noBridge = buildTabMenu(LOCAL, { ...caps, reveal: false }, actions());
    const deleted = buildTabMenu({ ...LOCAL, deleted: true }, caps, actions());
    expect(rowNamed(noBridge, 'Reveal in Finder')?.disabled).toBe(true);
    expect(rowNamed(deleted, 'Reveal in Finder')?.disabled).toBe(true);
    expect(rowNamed(buildTabMenu(LOCAL, caps, actions()), 'Reveal in Finder')
      ?.disabled).toBe(false);
  });

  it('reveals the tab’s own path', () => {
    const a = actions();
    rowNamed(buildTabMenu(LOCAL, caps, a), 'Reveal in Finder')?.run();
    expect(a.revealed).toEqual(['/Users/gdc/gmux/src/core/core1.ts']);
  });

  it('keeps Keep Open on a preview tab and the five closes in order', () => {
    const preview = labels(
      buildTabMenu({ ...LOCAL, preview: true }, caps, actions())
    );
    expect(preview).toEqual([
      'Close',
      'Close Others',
      'Close to the Right',
      'Close Saved',
      'Close All',
      'Keep Open',
      'Copy Path',
      'Copy Relative Path',
      'Reveal in Finder'
    ]);
  });

  it('drops Copy Relative Path on the map and report tabs', () => {
    expect(
      labels(buildTabMenu({ ...LOCAL, archMap: {} }, caps, actions()))
    ).not.toContain('Copy Relative Path');
    expect(
      labels(buildTabMenu({ ...LOCAL, diagnostics: {} }, caps, actions()))
    ).not.toContain('Copy Relative Path');
  });

  it('keeps the three close conditions', () => {
    const one = buildTabMenu(LOCAL, { ...caps, tabCount: 1, index: 0 }, actions());
    expect(rowNamed(one, 'Close Others')?.disabled).toBe(true);
    expect(rowNamed(one, 'Close to the Right')?.disabled).toBe(true);
    const last = buildTabMenu(LOCAL, { ...caps, index: 1 }, actions());
    expect(rowNamed(last, 'Close to the Right')?.disabled).toBe(true);
    const dirty = buildTabMenu(LOCAL, { ...caps, anySaved: false }, actions());
    expect(rowNamed(dirty, 'Close Saved')?.disabled).toBe(true);
  });
});
