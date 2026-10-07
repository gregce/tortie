/**
 * PHASE 343. A link to a folder draws as a folder and opens; from the
 * Explorer, through a link, Tortie reads and never writes.
 *
 * These are the PURE halves of that rule, pinned without a tree, a bridge or a
 * disk: the two questions every door asks (is this row UNDER a link, is this
 * folder AT OR UNDER one), where a create aimed at a link lands instead, how a
 * listing becomes rows, where the header and a drop from Finder aim, and what
 * the right-click menu offers. Each case fails when the clause it names is
 * taken out, which is what `ablation:p343` checks.
 *
 * The fixture is the issue's own shape, `.claude/skills -> ../.agent/skills`,
 * beside a link that leaves the project (`linkOut`), a loop to the project
 * itself (`loopRoot`), a chain (`chainA -> chainB -> ...`), a link under a link
 * (`linkIn/inner`), a link to a file, a dangling link and a link to a FIFO.
 */

import { describe, expect, it } from 'vitest';
import type { FsDirEntry } from '@shared/types';
import { LINK_MARK, treeRowDecoration } from '../decorations';
import { headerDestDir } from '../header-actions';
import {
  buildTreeMenu,
  LINK_READ_ONLY_NOTE,
  type TreeMenuActions
} from '../tree-menu';
import {
  besideLinkDrop,
  drawsAsFolder,
  importRowFor,
  importTargetFor,
  isAtOrUnderLink,
  isInertEntry,
  isUnderLink,
  linkAimOf,
  NO_TREE_LINKS,
  outsideLinks,
  treeInputOf,
  type TreeLinks
} from '../tree-paths';

const ROOT = '/p/proj';

/** One listing entry, in main's own shape. */
function entry(
  dir: string,
  name: string,
  kind: FsDirEntry['kind'],
  link?: FsDirEntry['link']
): FsDirEntry {
  const path = dir === ROOT ? `${ROOT}/${name}` : `${dir}/${name}`;
  return link === undefined ? { name, path, kind } : { name, path, kind, link };
}

/** The listing cache after `.claude/skills`, `linkIn` and `loopRoot` opened. */
const CACHE: Record<string, FsDirEntry[]> = {
  [ROOT]: [
    entry(ROOT, '.agent', 'dir'),
    entry(ROOT, '.claude', 'dir'),
    entry(ROOT, 'src', 'dir'),
    entry(ROOT, 'linkIn', 'symlink', 'dir'),
    entry(ROOT, 'linkOut', 'symlink', 'dir'),
    entry(ROOT, 'loopRoot', 'symlink', 'dir'),
    entry(ROOT, 'chainA', 'symlink', 'dir'),
    entry(ROOT, 'linkFile', 'symlink', 'file'),
    entry(ROOT, 'dangling', 'symlink', 'none'),
    entry(ROOT, 'linkPipe', 'symlink', 'other'),
    entry(ROOT, 'slow', 'symlink'),
    entry(ROOT, 'pipe', 'other'),
    entry(ROOT, 'README.md', 'file')
  ],
  [`${ROOT}/.claude`]: [entry(`${ROOT}/.claude`, 'skills', 'symlink', 'dir')],
  [`${ROOT}/.claude/skills`]: [
    entry(`${ROOT}/.claude/skills`, 'a-skill', 'dir'),
    entry(`${ROOT}/.claude/skills`, 'notes.md', 'file')
  ],
  [`${ROOT}/linkIn`]: [
    entry(`${ROOT}/linkIn`, 'index.ts', 'file'),
    entry(`${ROOT}/linkIn`, 'inner', 'symlink', 'dir')
  ],
  [`${ROOT}/loopRoot`]: [
    entry(`${ROOT}/loopRoot`, 'loopRoot', 'symlink', 'dir'),
    entry(`${ROOT}/loopRoot`, 'README.md', 'file')
  ],
  // A folder ABOVE the root, as a link above a project opened through it would
  // be. It is not under the root, so it never becomes a row or a link.
  ['/p']: [
    entry('/p', 'proj', 'symlink', 'dir'),
    entry('/p', 'sibling-link', 'symlink', 'dir')
  ]
};

const INPUT = treeInputOf(CACHE, ROOT);
const LINKS: TreeLinks = INPUT.links;

describe('a listing, as the rows the tree draws', () => {
  it('spells a link to a folder as a folder, and every other link as a leaf', () => {
    expect(INPUT.paths.has('.claude/skills/')).toBe(true);
    expect(INPUT.paths.has('.claude/skills')).toBe(false);
    expect(INPUT.paths.has('linkOut/')).toBe(true);
    expect(INPUT.paths.has('loopRoot/loopRoot/')).toBe(true);
    for (const leaf of ['linkFile', 'dangling', 'linkPipe', 'slow']) {
      expect(INPUT.paths.has(leaf)).toBe(true);
      expect(INPUT.paths.has(leaf + '/')).toBe(false);
    }
    // `kind` is main's word and never moves: a link is still `symlink`.
    expect(INPUT.kinds.get('.claude/skills')).toBe('symlink');
  });

  it('collects the link rows: folders, and every link at all', () => {
    expect([...LINKS.folders].sort()).toEqual(
      [
        '.claude/skills/',
        'chainA/',
        'linkIn/',
        'linkIn/inner/',
        'linkOut/',
        'loopRoot/',
        'loopRoot/loopRoot/'
      ].sort()
    );
    for (const leaf of ['linkFile', 'dangling', 'linkPipe', 'slow']) {
      expect(LINKS.rows.has(leaf)).toBe(true);
      expect(LINKS.folders.has(leaf + '/')).toBe(false);
    }
    expect(LINKS.rows.has('.claude/skills/')).toBe(true);
    // Real folders and real files are not links.
    expect(LINKS.rows.has('src/')).toBe(false);
    expect(LINKS.rows.has('README.md')).toBe(false);
  });

  it('never counts a link ABOVE the root (a project opened through a link)', () => {
    // Every row is a path under the root: nothing from `/p` leaks in.
    expect(LINKS.rows.size).toBe(11);
    expect([...LINKS.rows].some((row) => row.includes('sibling'))).toBe(false);
    expect(LINKS.folders.has('proj/')).toBe(false);
    expect(isUnderLink('src/index.ts', LINKS)).toBe(false);
    expect(isAtOrUnderLink('src/', LINKS)).toBe(false);
  });

  it('makes a link to a FIFO inert, as a real FIFO is, and nothing else', () => {
    expect(INPUT.inert.has('linkPipe')).toBe(true);
    expect(INPUT.inert.has('pipe')).toBe(true);
    for (const opens of ['linkFile', 'dangling', 'slow', 'README.md']) {
      expect(INPUT.inert.has(opens)).toBe(false);
    }
    expect(isInertEntry(entry(ROOT, 'x', 'symlink', 'other'))).toBe(true);
    expect(isInertEntry(entry(ROOT, 'x', 'symlink'))).toBe(false);
  });

  it('draws only a link that points at a folder as one', () => {
    expect(drawsAsFolder(entry(ROOT, 'x', 'symlink', 'dir'))).toBe(true);
    expect(drawsAsFolder(entry(ROOT, 'x', 'dir'))).toBe(true);
    for (const link of ['file', 'other', 'none', undefined] as const) {
      expect(drawsAsFolder(entry(ROOT, 'x', 'symlink', link))).toBe(false);
    }
  });
});

describe('the two questions', () => {
  it('UNDER: a row strictly below a link is under it', () => {
    expect(isUnderLink('.claude/skills/notes.md', LINKS)).toBe(true);
    expect(isUnderLink('.claude/skills/a-skill/', LINKS)).toBe(true);
    expect(isUnderLink('.claude/skills/a-skill/SKILL.md', LINKS)).toBe(true);
    expect(isUnderLink('linkOut/secret.txt', LINKS)).toBe(true);
  });

  it('UNDER: the link row itself is NOT under a link', () => {
    expect(isUnderLink('.claude/skills/', LINKS)).toBe(false);
    expect(isUnderLink('.claude/skills', LINKS)).toBe(false);
    expect(isUnderLink('linkOut/', LINKS)).toBe(false);
    expect(isUnderLink('linkFile', LINKS)).toBe(false);
  });

  it('UNDER: a loop, a link under a link and a chain', () => {
    expect(isUnderLink('loopRoot/loopRoot/', LINKS)).toBe(true);
    expect(isUnderLink('loopRoot/loopRoot/x', LINKS)).toBe(true);
    expect(isUnderLink('linkIn/inner/', LINKS)).toBe(true);
    expect(isUnderLink('linkIn/inner/deep.ts', LINKS)).toBe(true);
    expect(isUnderLink('chainA/x.md', LINKS)).toBe(true);
  });

  it('UNDER: nothing beside a link, and nothing with no links at all', () => {
    expect(isUnderLink('src/index.ts', LINKS)).toBe(false);
    expect(isUnderLink('.claude/other.md', LINKS)).toBe(false);
    // A name that merely STARTS like a link folder is not under it.
    expect(isUnderLink('linkOutside/x', LINKS)).toBe(false);
    expect(isUnderLink('.claude/skills/notes.md', NO_TREE_LINKS)).toBe(false);
  });

  it('AT OR UNDER: the link folder itself and everything below it', () => {
    expect(isAtOrUnderLink('.claude/skills/', LINKS)).toBe(true);
    // Spelled without the folder slash, it is still that folder.
    expect(isAtOrUnderLink('.claude/skills', LINKS)).toBe(true);
    expect(isAtOrUnderLink('.claude/skills/a-skill/', LINKS)).toBe(true);
    expect(isAtOrUnderLink('loopRoot/loopRoot/', LINKS)).toBe(true);
  });

  it('AT OR UNDER: the root and the folder that holds a link are not', () => {
    expect(isAtOrUnderLink('', LINKS)).toBe(false);
    expect(isAtOrUnderLink('.claude/', LINKS)).toBe(false);
    expect(isAtOrUnderLink('src/', LINKS)).toBe(false);
  });
});

describe('where a create aimed at a link lands (D7)', () => {
  it('lands in the folder holding the link, for the link row', () => {
    expect(outsideLinks('.claude/skills/', LINKS)).toBe('.claude/');
    expect(outsideLinks('linkOut/', LINKS)).toBe('');
  });

  it('lands in the folder holding the OUTERMOST link, for a nested one', () => {
    expect(outsideLinks('linkIn/inner/', LINKS)).toBe('');
    expect(outsideLinks('linkIn/inner/sub/', LINKS)).toBe('');
    expect(outsideLinks('loopRoot/loopRoot/', LINKS)).toBe('');
    expect(outsideLinks('.claude/skills/a-skill/', LINKS)).toBe('.claude/');
  });

  it('leaves a folder that is not at or under a link where it is', () => {
    expect(outsideLinks('src/', LINKS)).toBe('src/');
    expect(outsideLinks('.claude/', LINKS)).toBe('.claude/');
    expect(outsideLinks('', LINKS)).toBe('');
  });
});

describe("the header's New File and New Folder", () => {
  it('lands where it landed before when the LINK ROW is selected', () => {
    // Before this phase the link row was the leaf `.claude/skills`, and the
    // header aimed at its parent. It still does.
    expect(headerDestDir(['.claude/skills/'], LINKS)).toBe('.claude/');
    expect(headerDestDir(['.claude/skills'], NO_TREE_LINKS)).toBe('.claude/');
  });

  it('never lands under a link when a row under one is selected', () => {
    expect(headerDestDir(['.claude/skills/notes.md'], LINKS)).toBe('.claude/');
    expect(headerDestDir(['.claude/skills/a-skill/'], LINKS)).toBe('.claude/');
    expect(headerDestDir(['linkIn/inner/deep.ts'], LINKS)).toBe('');
  });

  it('is unchanged where there is no link', () => {
    expect(headerDestDir(['src/'], LINKS)).toBe('src/');
    expect(headerDestDir(['src/index.ts'], LINKS)).toBe('src/');
  });
});

describe('a drop from Finder', () => {
  const folder = (rel: string): { rel: string; isFolder: boolean } => ({
    rel,
    isFolder: true
  });
  const file = (rel: string): { rel: string; isFolder: boolean } => ({
    rel,
    isFolder: false
  });

  // PHASE 343 (its fix round). Before this phase the link row was a leaf and
  // a drop from Finder over it landed in the folder holding it. It still does:
  // never INTO the link, and never refused, which would be worse than today.
  it('lands BESIDE a link row, in the folder holding it, as it did', () => {
    expect(importTargetFor(folder('.claude/skills/'), null, LINKS)).toBe('.claude/');
    expect(importTargetFor(folder('linkOut/'), null, LINKS)).toBe('');
    expect(importTargetFor(folder('loopRoot/'), null, LINKS)).toBe('');
  });

  it('refuses a link row UNDER a link, which would land under the outer link', () => {
    expect(importTargetFor(folder('linkIn/inner/'), null, LINKS)).toBeNull();
    expect(importTargetFor(folder('loopRoot/loopRoot/'), null, LINKS)).toBeNull();
  });

  it('paints nothing over a row under a link', () => {
    expect(
      importTargetFor(file('.claude/skills/notes.md'), null, LINKS)
    ).toBeNull();
    expect(
      importTargetFor(folder('.claude/skills/a-skill/'), null, LINKS)
    ).toBeNull();
  });

  it('still lands beside a link to a FILE, as it did', () => {
    expect(importTargetFor(file('linkFile'), null, LINKS)).toBe('');
    expect(importTargetFor(folder('src/'), null, LINKS)).toBe('src/');
  });
});

// ---------------------------------------------------------------------------
// PHASE 343 (its fix round). A move dragged inside the tree over a link row
// ---------------------------------------------------------------------------

describe('a move dropped over a link row', () => {
  /** The row under the pointer as `rowFromEvent` reads it: a folder row, or a file row. */
  const folderRow = (rel: string) => ({ rel, type: 'folder' as const });
  const fileRow = (rel: string) => ({ rel, type: 'file' as const });

  it('lands in the folder holding the link, as it did when the link was a leaf', () => {
    expect(besideLinkDrop(['README.md'], '.claude/skills/', LINKS, folderRow('.claude/skills/'))).toBe('.claude/');
    expect(besideLinkDrop(['src/'], 'linkOut/', LINKS, folderRow('linkOut/'))).toBe('');
    // The library's own spelling of the folder, with or without its slash.
    expect(besideLinkDrop(['README.md'], '.claude/skills', LINKS, folderRow('.claude/skills/'))).toBe('.claude/');
  });

  it('says nothing over a folder that is not a link row: the library owns that drop', () => {
    expect(besideLinkDrop(['README.md'], 'src/', LINKS, folderRow('src/'))).toBeNull();
    expect(besideLinkDrop(['README.md'], 'src/', LINKS, fileRow('src/a.ts'))).toBeNull();
    expect(besideLinkDrop(['README.md'], '.claude/', LINKS, folderRow('.claude/'))).toBeNull();
    expect(besideLinkDrop(['README.md'], '', LINKS, fileRow('README.md'))).toBeNull();
    expect(besideLinkDrop(['README.md'], null, LINKS, null)).toBeNull();
  });

  it('never lands under another link, and never moves a row under a link', () => {
    expect(besideLinkDrop(['README.md'], 'linkIn/inner/', LINKS, folderRow('linkIn/inner/'))).toBeNull();
    expect(besideLinkDrop(['README.md'], 'loopRoot/loopRoot/', LINKS, folderRow('loopRoot/loopRoot/'))).toBeNull();
    expect(besideLinkDrop(['.claude/skills/notes.md'], 'linkOut/', LINKS, folderRow('linkOut/'))).toBeNull();
    expect(besideLinkDrop(['README.md', 'linkIn/index.ts'], 'linkOut/', LINKS, folderRow('linkOut/'))).toBeNull();
  });

  it('refuses a folder dropped beside a link inside it, the library\'s self or descendant rule', () => {
    expect(besideLinkDrop(['.claude/'], '.claude/skills/', LINKS, folderRow('.claude/skills/'))).toBeNull();
    expect(besideLinkDrop([], '.claude/skills/', LINKS, folderRow('.claude/skills/'))).toBeNull();
    // The link itself over itself lands where it is: a move that moves nothing.
    expect(besideLinkDrop(['.claude/skills/'], '.claude/skills/', LINKS, folderRow('.claude/skills/'))).toBe('.claude/');
  });

  // THE NARROW FIX (2026-10-07, his ruling): everything under a link is read
  // only, so a move dropped over ANY row under a link is refused. A FILE row
  // directly inside a linked folder is the one the library reads as the LINK
  // (its folder), and it was carried beside the link into `.claude/`.
  it('a move dropped over ANY row under a link is refused, and only the link row itself lands beside it', () => {
    // A file row directly inside the linked folder: the library's folder is the link.
    expect(besideLinkDrop(['README.md'], '.claude/skills/', LINKS, fileRow('.claude/skills/notes.md'))).toBeNull();
    expect(besideLinkDrop(['README.md'], 'linkIn/', LINKS, fileRow('linkIn/index.ts'))).toBeNull();
    // A link to a file directly inside a linked folder is a file row too.
    expect(besideLinkDrop(['README.md'], 'linkIn/', LINKS, fileRow('linkIn/aFileLink'))).toBeNull();
    // A folder row under the link: the library's folder is that folder.
    expect(besideLinkDrop(['README.md'], '.claude/skills/a-skill/', LINKS, folderRow('.claude/skills/a-skill/'))).toBeNull();
    // The link row itself, still beside it.
    expect(besideLinkDrop(['README.md'], '.claude/skills/', LINKS, folderRow('.claude/skills/'))).toBe('.claude/');
    // A chain row folded INTO the link (`.claude / skills / a-skill` when the
    // link holds one folder) has its deepest folder as its row; the pointer on
    // the link's own segment is the link row, and lands beside it.
    expect(besideLinkDrop(['README.md'], '.claude/skills/', LINKS, folderRow('.claude/skills/a-skill/'))).toBe('.claude/');
  });
});

// ---------------------------------------------------------------------------
// PHASE 343's folded-row fix (2026-10-07, his ruling "Tiny fix + recheck that
// case"). A row that folds a link with the one folder it holds.
// ---------------------------------------------------------------------------

describe('a row that folds a link with the one folder it holds', () => {
  /** The reverify's shapes, as main lists them once opened. */
  const FOLDED = treeInputOf(
    {
      [ROOT]: [
        entry(ROOT, '.claude3', 'dir'),
        entry(ROOT, 'hold', 'dir'),
        entry(ROOT, 'rootFold', 'symlink', 'dir'),
        entry(ROOT, 'a', 'dir'),
        entry(ROOT, 'README.md', 'file')
      ],
      [`${ROOT}/.claude3`]: [entry(`${ROOT}/.claude3`, 'skills', 'symlink', 'dir')],
      [`${ROOT}/.claude3/skills`]: [entry(`${ROOT}/.claude3/skills`, 'only', 'dir')],
      [`${ROOT}/hold`]: [
        entry(`${ROOT}/hold`, 'onefold', 'symlink', 'dir'),
        entry(`${ROOT}/hold`, 'h.txt', 'file')
      ],
      [`${ROOT}/hold/onefold`]: [entry(`${ROOT}/hold/onefold`, 'only', 'dir')],
      [`${ROOT}/rootFold`]: [entry(`${ROOT}/rootFold`, 'only', 'dir')],
      // An ordinary chain row, `a / b / c`, that no link touches.
      [`${ROOT}/a`]: [entry(`${ROOT}/a`, 'b', 'dir')],
      [`${ROOT}/a/b`]: [entry(`${ROOT}/a/b`, 'c', 'dir')]
    },
    ROOT
  ).links;
  const C3 = ['.claude3/', '.claude3/skills/', '.claude3/skills/only/'];
  const HOLD = ['hold/onefold/', 'hold/onefold/only/'];
  const ROOT_FOLD = ['rootFold/', 'rootFold/only/'];
  const ABC = ['a/', 'a/b/', 'a/b/c/'];
  /** The folder the library aims at for a point of a chain row: the segment, else the row's path. */
  const at = (segments: string[], on: string | null): string | null =>
    linkAimOf(on ?? (segments[segments.length - 1] as string), { segments, on }, FOLDED);
  const folderRow = (rel: string) => ({ rel, type: 'folder' as const });
  /** A move, as the hook composes it, over a point of a chain row. */
  const moved = (segments: string[], on: string | null): string | null =>
    besideLinkDrop(['README.md'], at(segments, on), FOLDED, folderRow(segments[segments.length - 1] as string));
  /** A drop from Finder, as the hook composes it, over a point of a chain row. */
  const imported = (segments: string[], on: string | null): string | null =>
    importTargetFor(
      importRowFor({ rel: segments[segments.length - 1] as string, isFolder: true }, at(segments, on), FOLDED),
      null,
      FOLDED
    );

  it('aims off every segment at the OUTERMOST link the row folds, and on a segment at that segment', () => {
    expect(at(C3, null)).toBe('.claude3/skills/');
    expect(at(C3, '.claude3/')).toBe('.claude3/');
    expect(at(C3, '.claude3/skills/')).toBe('.claude3/skills/');
    expect(at(C3, '.claude3/skills/only/')).toBe('.claude3/skills/only/');
    expect(at(HOLD, null)).toBe('hold/onefold/');
    // A row that folds no link keeps the library's answer, and so does a row
    // that is not a chain row, and a point over no row.
    expect(at(ABC, null)).toBe('a/b/c/');
    expect(at(ABC, 'a/')).toBe('a/');
    expect(linkAimOf('src/', null, FOLDED)).toBe('src/');
    expect(linkAimOf(null, { segments: C3, on: null }, FOLDED)).toBeNull();
  });

  it('a move lands beside the link on its segment and off every segment, leaves the outer segment to the library, and lands nothing under the link', () => {
    expect(moved(C3, '.claude3/skills/')).toBe('.claude3/');
    expect(moved(C3, null)).toBe('.claude3/');
    expect(moved(C3, '.claude3/')).toBeNull();
    expect(moved(C3, '.claude3/skills/only/')).toBeNull();
    expect(moved(HOLD, 'hold/onefold/')).toBe('hold/');
    expect(moved(HOLD, null)).toBe('hold/');
    expect(moved(HOLD, 'hold/onefold/only/')).toBeNull();
    // A link at the project root lands at the root.
    expect(moved(ROOT_FOLD, null)).toBe('');
    // An ordinary chain row is the library's wherever the pointer is.
    expect(moved(ABC, null)).toBeNull();
  });

  it('a drop from Finder lands beside the link on its segment and off every segment, in the outer segment\'s folder, and nothing under the link', () => {
    expect(imported(C3, '.claude3/skills/')).toBe('.claude3/');
    expect(imported(C3, null)).toBe('.claude3/');
    expect(imported(C3, '.claude3/')).toBe('.claude3/');
    expect(imported(C3, '.claude3/skills/only/')).toBeNull();
    expect(imported(HOLD, 'hold/onefold/')).toBe('hold/');
    expect(imported(HOLD, null)).toBe('hold/');
    expect(imported(HOLD, 'hold/onefold/only/')).toBeNull();
    expect(imported(ROOT_FOLD, null)).toBe('');
  });

  it('keeps every other Finder drop as it was: a file row under a link, a plain link row, a row under one, and an ordinary chain row', () => {
    // A file directly inside a link: the library's folder is the link, and the
    // file row is still refused, never read as the link row.
    expect(importRowFor({ rel: '.claude/skills/notes.md', isFolder: false }, '.claude/skills/', LINKS)).toEqual({
      rel: '.claude/skills/notes.md',
      isFolder: false
    });
    expect(
      importTargetFor(importRowFor({ rel: '.claude/skills/notes.md', isFolder: false }, '.claude/skills/', LINKS), null, LINKS)
    ).toBeNull();
    expect(importTargetFor(importRowFor({ rel: '.claude/skills/', isFolder: true }, '.claude/skills/', LINKS), null, LINKS)).toBe('.claude/');
    expect(
      importTargetFor(importRowFor({ rel: '.claude/skills/a-skill/', isFolder: true }, '.claude/skills/a-skill/', LINKS), null, LINKS)
    ).toBeNull();
    // An ordinary chain row keeps Phase 154's reading: its deepest folder,
    // wherever the pointer is on it.
    expect(imported(ABC, 'a/')).toBe('a/b/c/');
    expect(imported(ABC, null)).toBe('a/b/c/');
    expect(importRowFor({ rel: 'src/', isFolder: true }, 'src/', LINKS)).toEqual({ rel: 'src/', isFolder: true });
    expect(importRowFor(null, null, LINKS)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// The right-click menu
// ---------------------------------------------------------------------------

const actions: TreeMenuActions = {
  open: () => undefined,
  history: () => undefined,
  newEntry: () => undefined,
  rename: () => undefined,
  duplicate: () => undefined,
  reveal: () => undefined,
  copyPaths: () => undefined,
  trash: () => undefined
};

const labels = (items: ReturnType<typeof buildTreeMenu>): string[] =>
  items.filter((one) => one !== 'sep').map((one) => one.label);

const LOCAL = { mutate: true, duplicate: true, reveal: true };
const MACHINE_NOTE =
  'Tortie changes files on mac-pro only inside a project you opened there.';
const REMOTE_WRITING = {
  mutate: false,
  duplicate: true,
  reveal: false,
  readOnlyNote: MACHINE_NOTE,
  remoteCreateFile: true,
  remoteWriteEntries: true
};
/** The verbs that write, and History, which a link empties. */
const WRITES = [
  'New File…',
  'New Folder…',
  'Rename…',
  'Duplicate',
  'Move to Trash',
  'History'
];

const underLinkFile = {
  canonical: '.claude/skills/notes.md',
  selection: ['.claude/skills/notes.md'],
  destDir: '.claude/',
  openable: true,
  underLink: true
};

describe('the menu on a row under a link', () => {
  it('offers no verb that writes, and no History, on this Mac', () => {
    const got = labels(buildTreeMenu(underLinkFile, LOCAL, actions));
    for (const absent of WRITES) expect(got).not.toContain(absent);
    for (const kept of [
      'Open',
      'Open in New Tab',
      'Reveal in Finder',
      'Copy Path',
      'Copy Relative Path'
    ]) {
      expect(got).toContain(kept);
    }
  });

  it('ends with ONE disabled line, the link footnote', () => {
    const items = buildTreeMenu(underLinkFile, LOCAL, actions);
    const last = items[items.length - 1];
    expect(last).not.toBe('sep');
    expect(last !== 'sep' && last?.label).toBe(LINK_READ_ONLY_NOTE);
    expect(last !== 'sep' && last?.disabled).toBe(true);
    expect(LINK_READ_ONLY_NOTE).toBe('Read only through a link');
    expect(
      labels(items).filter((label) => label === LINK_READ_ONLY_NOTE)
    ).toHaveLength(1);
  });

  it('on another machine, the link footnote REPLACES the machine note', () => {
    const items = buildTreeMenu(underLinkFile, REMOTE_WRITING, actions);
    const got = labels(items);
    for (const absent of WRITES) expect(got).not.toContain(absent);
    expect(got).not.toContain(MACHINE_NOTE);
    expect(got.filter((label) => label === LINK_READ_ONLY_NOTE)).toHaveLength(
      1
    );
    const disabled = items.filter((one) => one !== 'sep' && one.disabled);
    expect(disabled).toHaveLength(1);
  });

  it('a folder under a link offers no create either', () => {
    const got = labels(
      buildTreeMenu(
        {
          canonical: '.claude/skills/a-skill/',
          selection: ['.claude/skills/a-skill/'],
          destDir: '.claude/',
          openable: true,
          underLink: true
        },
        LOCAL,
        actions
      )
    );
    expect(got).not.toContain('New File…');
    expect(got).not.toContain('New Folder…');
    expect(got).toContain(LINK_READ_ONLY_NOTE);
  });

  it('a MIXED selection holding one row under a link loses every write', () => {
    const got = labels(
      buildTreeMenu(
        {
          canonical: 'src/a.ts',
          selection: ['src/a.ts', '.claude/skills/notes.md'],
          destDir: 'src/',
          openable: true,
          underLink: true
        },
        LOCAL,
        actions
      )
    );
    expect(got.some((label) => label.includes('Trash'))).toBe(false);
    expect(got).toContain(LINK_READ_ONLY_NOTE);
  });
});

describe('the menu on the link row itself', () => {
  const linkRow = {
    canonical: '.claude/skills/',
    selection: ['.claude/skills/'],
    destDir: '.claude/',
    openable: true,
    underLink: false
  };

  it('keeps every item it has today, and New File… lands beside the link', () => {
    const seen: string[] = [];
    const items = buildTreeMenu(linkRow, LOCAL, {
      ...actions,
      newEntry: (dir) => {
        seen.push(dir);
      }
    });
    const got = labels(items);
    for (const kept of [
      'New File…',
      'New Folder…',
      'Rename…',
      'Duplicate',
      'Move to Trash'
    ]) {
      expect(got).toContain(kept);
    }
    expect(got).not.toContain(LINK_READ_ONLY_NOTE);
    for (const one of items) {
      if (one !== 'sep' && one.label === 'New File…') one.run();
    }
    expect(seen).toEqual(['.claude/']);
  });

  it('on another machine keeps the machine note, and only that', () => {
    const got = labels(buildTreeMenu(linkRow, REMOTE_WRITING, actions));
    expect(got).toContain(MACHINE_NOTE);
    expect(got).not.toContain(LINK_READ_ONLY_NOTE);
  });

  // PHASE 343 (its fix round). As a leaf the link row carried Open With and
  // History, and both worked: Open With handed the linked folder to another
  // app, History showed the link's own commits. A folder row offers neither,
  // so `linkRow` keeps both, aimed at the LINK's spelling with no slash.
  const OPEN_WITH: ReturnType<typeof buildTreeMenu> = [
    { label: 'Open in Default App', run: () => undefined }
  ];

  it('keeps Open With and History, the link\'s own, ahead of the verbs it had', () => {
    const histories: string[] = [];
    const items = buildTreeMenu(
      { ...linkRow, linkRow: true },
      LOCAL,
      { ...actions, history: (path) => void histories.push(path) },
      OPEN_WITH
    );
    const got = labels(items);
    expect(got.slice(0, 3)).toEqual(['Open With', 'History', 'New File…']);
    expect(got).not.toContain('Open');
    expect(got).not.toContain('Open in New Tab');
    const withApp = items.find((one) => one !== 'sep' && one.label === 'Open With');
    expect(withApp !== 'sep' && withApp?.submenu).toBe(OPEN_WITH);
    for (const one of items) if (one !== 'sep' && one.label === 'History') one.run();
    expect(histories).toEqual(['.claude/skills']);
  });

  it('keeps neither on another machine, nor in a selection of several rows', () => {
    const remote = labels(
      buildTreeMenu({ ...linkRow, linkRow: true }, REMOTE_WRITING, actions, OPEN_WITH)
    );
    expect(remote).not.toContain('Open With');
    expect(remote).not.toContain('History');
    const many = labels(
      buildTreeMenu(
        { ...linkRow, selection: ['.claude/skills/', 'src/a.ts'], linkRow: true },
        LOCAL,
        actions,
        OPEN_WITH
      )
    );
    expect(many).not.toContain('Open With');
    expect(many).not.toContain('History');
  });

  it('a link row UNDER a link keeps Open With and loses History, as every row under a link does', () => {
    const got = labels(
      buildTreeMenu(
        {
          canonical: 'linkIn/inner/',
          selection: ['linkIn/inner/'],
          destDir: '',
          openable: true,
          underLink: true,
          linkRow: true
        },
        LOCAL,
        actions,
        OPEN_WITH
      )
    );
    expect(got).toContain('Open With');
    expect(got).not.toContain('History');
    expect(got[got.length - 1]).toBe(LINK_READ_ONLY_NOTE);
  });
});

describe('the menu everywhere else is unchanged', () => {
  it('an ordinary row offers History and no footnote', () => {
    const got = labels(
      buildTreeMenu(
        {
          canonical: 'src/a.ts',
          selection: ['src/a.ts'],
          destDir: 'src/',
          openable: true
        },
        LOCAL,
        actions
      )
    );
    expect(got).toContain('History');
    expect(got).toContain('Move to Trash');
    expect(got).not.toContain(LINK_READ_ONLY_NOTE);
  });
});

describe('the row mark', () => {
  const item = (
    path: string,
    kind: 'directory' | 'file' = path.endsWith('/') ? 'directory' : 'file'
  ): Parameters<typeof treeRowDecoration>[0] => ({
    item: { path, kind, name: path },
    row: {}
  });
  const NONE = new Set<string>();

  it('is ⤷, titled Link, in the muted text colour, on a link folder', () => {
    expect(LINK_MARK).toBe('\u2937');
    expect(treeRowDecoration(item('.claude/skills/'), NONE, LINKS.rows)).toEqual({
      text: '\u2937',
      title: 'Link',
      parts: [{ text: '\u2937', color: 'var(--text-muted)' }]
    });
  });

  it('marks EVERY link row: a leaf link, a dangling one, a link to a FIFO', () => {
    for (const leaf of ['linkFile', 'dangling', 'linkPipe', 'slow']) {
      expect(treeRowDecoration(item(leaf), NONE, LINKS.rows)?.title).toBe(
        'Link'
      );
    }
  });

  it('marks a chain row when any folder it names is a link', () => {
    const chain = {
      item: { path: '.claude/skills/', kind: 'directory' as const, name: '' },
      row: {
        flattenedSegments: [
          { path: '.claude/', name: '.claude', isTerminal: false },
          { path: '.claude/skills/', name: 'skills', isTerminal: true }
        ]
      }
    };
    expect(treeRowDecoration(chain, NONE, LINKS.rows)?.title).toBe('Link');
    const linkFirst = {
      item: { path: 'linkIn/sub/', kind: 'directory' as const, name: '' },
      row: {
        flattenedSegments: [
          { path: 'linkIn/', name: 'linkIn', isTerminal: false },
          { path: 'linkIn/sub/', name: 'sub', isTerminal: true }
        ]
      }
    };
    expect(treeRowDecoration(linkFirst, NONE, LINKS.rows)?.title).toBe('Link');
  });

  it('leaves every other row unmarked', () => {
    for (const plain of ['src/', 'README.md', '.claude/skills/notes.md']) {
      expect(treeRowDecoration(item(plain), NONE, LINKS.rows)).toBeNull();
    }
  });

  it('gives the conflict ! the lane first, even on a link row', () => {
    expect(
      treeRowDecoration(item('linkFile'), new Set(['linkFile']), LINKS.rows)
    ).toEqual({
      text: '!',
      title: 'Merge conflict',
      parts: [{ text: '!', color: 'var(--git-conflict)' }]
    });
    expect(
      treeRowDecoration(item('src/a.ts'), new Set(['src/a.ts']), NONE)?.title
    ).toBe('Merge conflict');
  });
});
