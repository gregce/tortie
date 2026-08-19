/**
 * The recent-row context menu — its SHAPE, which is the part that regresses.
 *
 * Three rules are pinned here because all three are invisible until they are
 * wrong. Reveal in Finder disappears on a folder that is gone. It also
 * disappears when the preload cannot reveal, rather than offering a verb that
 * throws on click. Remove from Recent survives both, because a row pointing
 * at a folder that no longer exists is the one the user most wants gone.
 *
 * PHASE 92 ADDED A FOURTH. Reveal in Finder also disappears on a folder that
 * is on another machine, because Finder has nothing to show. The other three
 * items stay, and Copy Path copies the path exactly as that machine states it.
 */

import { describe, expect, it, vi } from 'vitest';
import type { MenuItemSpec } from '../../state/store';
import { recentMenuItems } from '../recent-menu';
import type { RecentMenuActions } from '../recent-menu';

function actions(): RecentMenuActions {
  return {
    open: vi.fn(),
    reveal: vi.fn(),
    copyPath: vi.fn(),
    remove: vi.fn()
  };
}

const labels = (items: (MenuItemSpec | 'sep')[]): string[] =>
  items.map((i) => (i === 'sep' ? '---' : i.label));

describe('recentMenuItems', () => {
  it('offers the four verbs in research 35 §1.9 order', () => {
    const items = recentMenuItems({ path: '/a/b' }, actions(), true);
    expect(labels(items)).toEqual([
      'Open',
      'Reveal in Finder',
      'Copy Path',
      '---',
      'Remove from Recent'
    ]);
  });

  it('drops Reveal in Finder when the folder is gone', () => {
    const items = recentMenuItems(
      { path: '/a/b', missing: true },
      actions(),
      true
    );
    expect(labels(items)).toEqual([
      'Open',
      'Copy Path',
      '---',
      'Remove from Recent'
    ]);
  });

  it('drops Reveal in Finder when the preload cannot reveal', () => {
    const items = recentMenuItems({ path: '/a/b' }, actions(), false);
    expect(labels(items)).not.toContain('Reveal in Finder');
    expect(labels(items)).toContain('Remove from Recent');
  });

  it('drops Reveal in Finder for a folder on another machine', () => {
    const items = recentMenuItems(
      { path: '/Users/gdc/dev', remote: true },
      actions(),
      true
    );
    expect(labels(items)).toEqual([
      'Open',
      'Copy Path',
      '---',
      'Remove from Recent'
    ]);
  });

  it('keeps Reveal in Finder for a local row beside a remote one', () => {
    // The two targets differ only in the new field, so this pins the field as
    // the thing that decides it rather than something else in the row.
    const local = recentMenuItems({ path: '/Users/gdc/dev' }, actions(), true);
    const remote = recentMenuItems(
      { path: '/Users/gdc/dev', remote: true },
      actions(),
      true
    );
    expect(labels(local)).toContain('Reveal in Finder');
    expect(labels(remote)).not.toContain('Reveal in Finder');
  });

  it('runs the callback the caller supplied, and only that one', () => {
    const a = actions();
    const items = recentMenuItems({ path: '/a/b' }, a, true);
    for (const item of items) if (item !== 'sep') item.run();
    expect(a.open).toHaveBeenCalledTimes(1);
    expect(a.reveal).toHaveBeenCalledTimes(1);
    expect(a.copyPath).toHaveBeenCalledTimes(1);
    expect(a.remove).toHaveBeenCalledTimes(1);
  });
});
