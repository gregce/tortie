/**
 * The explorer's context menu — its SHAPE, which is the part that regresses.
 *
 * Two rules are pinned here because both are invisible until they are wrong:
 * Finder's selection rule (the verbs act on the selection only when the
 * clicked row is inside it) and the counted labels (never a bare verb over a
 * set). The third is capability gating: an older preload that cannot mutate
 * must hide the whole verb set rather than offer items that throw on click.
 */

import { describe, expect, it, vi } from 'vitest';
import type { MenuItemSpec } from '../../state/store';
import {
  buildTreeMenu,
  copiedMessage,
  countedNoun,
  describeConflicts,
  describeEntries,
  pathsForClipboard
} from '../tree-menu';
import type { TreeMenuActions, TreeMenuCapabilities } from '../tree-menu';

const ALL: TreeMenuCapabilities = {
  mutate: true,
  duplicate: true,
  reveal: true
};

function actions(): TreeMenuActions {
  return {
    open: vi.fn(),
    newEntry: vi.fn(),
    rename: vi.fn(),
    duplicate: vi.fn(),
    reveal: vi.fn(),
    copyPaths: vi.fn(),
    trash: vi.fn()
  };
}

function labels(items: (MenuItemSpec | 'sep')[]): string[] {
  return items.filter((i): i is MenuItemSpec => i !== 'sep').map((i) => i.label);
}

describe('a file row', () => {
  it('teaches both openings, then the verbs, then the locators', () => {
    const items = buildTreeMenu(
      {
        canonical: 'src/app.tsx',
        selection: ['src/app.tsx'],
        destDir: 'src/',
        openable: true
      },
      ALL,
      actions()
    );
    expect(labels(items)).toEqual([
      'Open',
      'Open in New Tab',
      'New File…',
      'New Folder…',
      'Rename…',
      'Duplicate',
      'Move to Trash',
      'Reveal in Finder',
      'Copy Path',
      'Copy Relative Path'
    ]);
  });

  it('never offers Open for a socket or device', () => {
    const items = buildTreeMenu(
      {
        canonical: 'run.sock',
        selection: ['run.sock'],
        destDir: '',
        openable: false
      },
      ALL,
      actions()
    );
    expect(labels(items)).not.toContain('Open');
  });

  it('marks the delete destructive and says where the file goes', () => {
    const items = buildTreeMenu(
      {
        canonical: 'a.ts',
        selection: ['a.ts'],
        destDir: '',
        openable: true
      },
      ALL,
      actions()
    );
    const del = items.find(
      (i): i is MenuItemSpec => i !== 'sep' && i.label.includes('Trash')
    );
    expect(del?.destructive).toBe(true);
    expect(del?.label).toBe('Move to Trash');
  });
});

describe('a folder row', () => {
  it('creates INSIDE the folder and does not offer Open', () => {
    const act = actions();
    const items = buildTreeMenu(
      { canonical: 'src/', selection: ['src/'], destDir: 'src/', openable: true },
      ALL,
      act
    );
    expect(labels(items)).not.toContain('Open');
    const newFile = items.find(
      (i): i is MenuItemSpec => i !== 'sep' && i.label === 'New File…'
    );
    newFile?.run();
    expect(act.newEntry).toHaveBeenCalledWith('src/', 'file');
  });
});

describe('a multi-selection', () => {
  const selection = ['src/a.ts', 'src/b.ts', 'src/deep/'];

  it('counts the noun instead of leaving a bare verb', () => {
    const items = buildTreeMenu(
      { canonical: 'src/a.ts', selection, destDir: 'src/', openable: true },
      ALL,
      actions()
    );
    expect(labels(items)).toContain('Move 3 items to Trash');
    expect(labels(items)).toContain('Copy Paths');
    expect(labels(items)).toContain('Copy Relative Paths');
  });

  it('hides the single-subject verbs', () => {
    const items = labels(
      buildTreeMenu(
        { canonical: 'src/a.ts', selection, destDir: 'src/', openable: true },
        ALL,
        actions()
      )
    );
    expect(items).not.toContain('Rename…');
    expect(items).not.toContain('Duplicate');
    expect(items).not.toContain('Open');
  });

  it('names files and folders separately when the set is uniform', () => {
    expect(countedNoun(['a.ts', 'b.ts'])).toBe('2 files');
    expect(countedNoun(['a/', 'b/'])).toBe('2 folders');
    expect(countedNoun(['a/', 'b.ts'])).toBe('2 items');
  });

  it('trashes the WHOLE selection, not the clicked row', () => {
    const act = actions();
    const items = buildTreeMenu(
      { canonical: 'src/a.ts', selection, destDir: 'src/', openable: true },
      ALL,
      act
    );
    items
      .find((i): i is MenuItemSpec => i !== 'sep' && i.label.includes('Trash'))
      ?.run();
    expect(act.trash).toHaveBeenCalledWith(selection);
  });
});

describe('the blank area below the rows', () => {
  it('is the project root: create verbs and its own path, nothing to delete', () => {
    const items = buildTreeMenu(
      { canonical: null, selection: [], destDir: '', openable: false },
      ALL,
      actions()
    );
    expect(labels(items)).toEqual(['New File…', 'New Folder…', 'Copy Path']);
  });
});

describe('capability gating', () => {
  it('hides every mutation when the preload cannot mutate', () => {
    const items = labels(
      buildTreeMenu(
        {
          canonical: 'a.ts',
          selection: ['a.ts'],
          destDir: '',
          openable: true
        },
        { mutate: false, duplicate: false, reveal: true },
        actions()
      )
    );
    expect(items).toEqual([
      'Open',
      'Open in New Tab',
      'Reveal in Finder',
      'Copy Path',
      'Copy Relative Path'
    ]);
  });

  it('hides Duplicate alone when only that channel is missing', () => {
    const items = labels(
      buildTreeMenu(
        {
          canonical: 'a.ts',
          selection: ['a.ts'],
          destDir: '',
          openable: true
        },
        { mutate: true, duplicate: false, reveal: false },
        actions()
      )
    );
    expect(items).toContain('Rename…');
    expect(items).not.toContain('Duplicate');
    expect(items).not.toContain('Reveal in Finder');
  });
});

describe('the clipboard', () => {
  it('writes absolute paths, one per line, and the root as itself', () => {
    expect(pathsForClipboard('/proj', ['src/a.ts', 'src/'], false)).toBe(
      '/proj/src/a.ts\n/proj/src'
    );
    expect(pathsForClipboard('/proj', [''], false)).toBe('/proj');
  });

  it('writes relative paths without the canonical slash', () => {
    expect(pathsForClipboard('/proj', ['src/a.ts', 'src/'], true)).toBe(
      'src/a.ts\nsrc'
    );
  });

  it('names what landed there', () => {
    expect(copiedMessage(1, false)).toBe('Path copied');
    expect(copiedMessage(1, true)).toBe('Relative path copied');
    expect(copiedMessage(3, true)).toBe('3 paths copied');
  });
});

describe('what the confirmations say', () => {
  it('names one item and counts several', () => {
    expect(describeEntries(['src/notes.md'])).toBe('"notes.md"');
    expect(describeEntries(['src/', 'lib/'])).toBe('2 folders');
    expect(describeEntries(['a.ts', 'b/'])).toBe('2 items');
  });

  it('names every collision, and says Replace is still recoverable', () => {
    const conflict = (name: string): {
      from: { path: string; relPath: string; kind: 'file' };
      to: { path: string; relPath: string; kind: 'file' };
    } => ({
      from: { path: `/p/src/${name}`, relPath: `src/${name}`, kind: 'file' },
      to: { path: `/p/lib/${name}`, relPath: `lib/${name}`, kind: 'file' }
    });

    const one = describeConflicts([conflict('a.ts')]);
    expect(one).toContain('"a.ts" already exists there');
    expect(one).toContain('Trash');

    const many = describeConflicts(
      ['a.ts', 'b.ts', 'c.ts', 'd.ts', 'e.ts'].map(conflict)
    );
    expect(many).toContain('"a.ts", "b.ts", "c.ts"');
    expect(many).toContain('and 2 more');
    expect(many).toContain('Trash');
  });
});
