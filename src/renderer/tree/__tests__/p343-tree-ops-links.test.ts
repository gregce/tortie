/**
 * PHASE 343. The verbs' SECOND doors, and the kind arithmetic after main
 * answers for a link.
 *
 * The gesture refuses first (`canRename`, `canDrag`, `canDrop`, the menu), and
 * every verb asks again, so a caller that skipped the gesture still sends
 * nothing: a source under a link, or a destination at or under one, reaches no
 * disk. Each case below counts the bridge calls, and the control beside it
 * shows the same verb still working where there is no link.
 *
 * And main answers `kind: 'file'` for a link whatever it points at (it reads
 * `lstat`, measured A3), so after a trash, a move or a duplicate of a link row
 * drawn as a folder the tree takes the kind from its OWN row: the folder row is
 * removed, moved or added under the folder spelling, and its cached listing is
 * forgotten.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FileTreeRenameEvent } from '@pierre/trees';

const h = vi.hoisted(() => ({
  createFile: vi.fn(),
  createFolder: vi.fn(),
  rename: vi.fn(),
  duplicate: vi.fn(),
  move: vi.fn(),
  trash: vi.fn(),
  importPaths: vi.fn(),
  toast: vi.fn(),
  setConfirm: vi.fn(),
  relist: vi.fn(),
  forgetUnder: vi.fn(),
  followMoves: vi.fn(),
  requestOpenFile: vi.fn()
}));

vi.mock('../fs-ops-bridge', () => ({
  createFile: h.createFile,
  createFolder: h.createFolder,
  rename: h.rename,
  duplicate: h.duplicate,
  move: h.move,
  trash: h.trash,
  importPaths: h.importPaths,
  canMutate: () => true,
  canDuplicate: () => true,
  canImport: () => true
}));

vi.mock('../../state/store', () => ({
  useApp: {
    getState: () => ({ toast: h.toast, setConfirm: h.setConfirm })
  },
  errorPayload: () => null,
  errorText: (err: unknown) => String(err)
}));

vi.mock('../store', () => ({
  useFileTree: {
    getState: () => ({ relist: h.relist, forgetUnder: h.forgetUnder })
  }
}));

vi.mock('../open-file', () => ({ requestOpenFile: h.requestOpenFile }));
vi.mock('../editor-follow', () => ({ followMoves: h.followMoves }));
vi.mock('../tree-menu', () => ({
  describeConflicts: () => '',
  describeEntries: () => 'it',
  describeImportConflicts: () => ''
}));

import { createTreeOps, trashBody } from '../tree-ops';
import type { TreeOps, TreeOpsContext } from '../tree-ops';
import type { TreeRenameView } from '../rename-view';
import type { TreeLinks } from '../tree-paths';

const ROOT = '/repo';

/** `.claude/skills` and `linkOut` drawn as folders; `linkFile` a leaf link. */
const LINKS: TreeLinks = {
  folders: new Set(['.claude/skills/', 'linkOut/']),
  rows: new Set(['.claude/skills/', 'linkOut/', 'linkFile'])
};

interface Rig {
  ops: TreeOps;
  rows: Set<string>;
  batches: unknown[][];
  removes: { path: string; recursive: boolean }[];
  adds: string[];
  renames: string[];
  view: { path: string | null; value: string };
}

/** `null` is a context that says nothing about links, as older callers do. */
function makeRig(links: TreeLinks | null = LINKS): Rig {
  const rows = new Set<string>([
    '.claude/',
    '.claude/skills/',
    '.claude/skills/notes.md',
    'src/',
    'src/a.ts',
    'linkOut/',
    'linkFile'
  ]);
  const batches: unknown[][] = [];
  const removes: { path: string; recursive: boolean }[] = [];
  const adds: string[] = [];
  const renames: string[] = [];
  const view = { path: null as string | null, value: '' };
  const renameView: TreeRenameView = {
    getPath: () => view.path,
    getValue: () => view.value,
    isActive: () => view.path !== null,
    setValue: (value: string) => {
      view.value = value;
    },
    cancel: () => {
      view.path = null;
    },
    commit: () => {
      view.path = null;
    }
  };
  const model = {
    add: (path: string) => {
      adds.push(path);
      rows.add(path);
    },
    remove: (path: string, opts: { recursive: boolean }) => {
      removes.push({ path, recursive: opts.recursive });
      rows.delete(path);
    },
    getItem: (path: string) =>
      rows.has(path)
        ? ({
            isDirectory: () => path.endsWith('/'),
            isExpanded: () => true,
            expand: () => undefined
          } as never)
        : null,
    startRenaming: (path: string) => {
      renames.push(path);
      view.path = path;
      return true;
    },
    batch: (ops: unknown[]) => {
      batches.push(ops);
    },
    resetPaths: vi.fn(),
    focusPath: vi.fn(),
    getSelectedPaths: () => [] as string[]
  };
  let fed = new Set(rows);
  const ctx: TreeOpsContext = {
    rootPath: ROOT,
    model: model as unknown as TreeOpsContext['model'],
    readFed: () => fed,
    writeFed: (next) => {
      fed = next;
    },
    hold: () => () => undefined,
    renameView: () => renameView,
    selectOnly: vi.fn(),
    ...(links === null ? {} : { links: () => links })
  };
  return {
    ops: createTreeOps(ctx),
    rows,
    batches,
    removes,
    adds,
    renames,
    view
  };
}

const flush = async (): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, 0));
};

function renameEvent(
  sourcePath: string,
  destinationPath: string,
  isFolder: boolean
): FileTreeRenameEvent {
  return { sourcePath, destinationPath, isFolder } as FileTreeRenameEvent;
}

/** Press the confirm the last `setConfirm` raised. */
function confirmLast(): { body: string } {
  const call = h.setConfirm.mock.calls.at(-1)?.[0] as
    | { body: string; onConfirm: () => void }
    | undefined;
  if (call === undefined) throw new Error('no confirm was raised');
  call.onConfirm();
  return { body: call.body };
}

beforeEach(() => {
  vi.clearAllMocks();
  h.relist.mockResolvedValue(undefined);
});

describe('every second door refuses under a link and sends nothing', () => {
  it('newEntry: no placeholder at or under a link; beside it still works', () => {
    const rig = makeRig();
    rig.ops.newEntry('.claude/skills/', 'file');
    rig.ops.newEntry('.claude/skills/a-skill/', 'dir');
    expect(rig.adds).toEqual([]);
    expect(rig.renames).toEqual([]);
    rig.ops.newEntry('.claude/', 'file');
    expect(rig.adds).toEqual(['.claude/untitled']);
  });

  it('startRename: nothing under a link; the link row itself still renames', () => {
    const rig = makeRig();
    rig.ops.startRename('.claude/skills/notes.md');
    expect(rig.renames).toEqual([]);
    rig.ops.startRename('.claude/skills/');
    expect(rig.renames).toEqual(['.claude/skills/']);
  });

  it('onRenameCommitted: a rename under a link is put back and never sent', async () => {
    const rig = makeRig();
    rig.ops.onRenameCommitted(
      renameEvent('.claude/skills/notes.md', '.claude/skills/n.md', false)
    );
    await flush();
    expect(h.rename).not.toHaveBeenCalled();
    // The library had already moved the row; the refusal moves it back.
    expect(rig.batches).toEqual([
      [
        {
          type: 'move',
          from: '.claude/skills/n.md',
          to: '.claude/skills/notes.md'
        }
      ]
    ]);
  });

  it('onRenameCommitted: renaming the link row itself reaches main', async () => {
    h.rename.mockResolvedValue({
      from: { path: `${ROOT}/.claude/skills`, relPath: '.claude/skills', kind: 'file' },
      to: { path: `${ROOT}/.claude/tools`, relPath: '.claude/tools', kind: 'file' }
    });
    const rig = makeRig();
    rig.ops.onRenameCommitted(
      renameEvent('.claude/skills', '.claude/tools', true)
    );
    await flush();
    expect(h.rename).toHaveBeenCalledTimes(1);
  });

  it('duplicate: nothing under a link (it would write beside the target)', () => {
    const rig = makeRig();
    rig.ops.duplicate('.claude/skills/notes.md');
    expect(h.duplicate).not.toHaveBeenCalled();
    expect(rig.adds).toEqual([]);
  });

  it('trash: a row under a link is dropped from the targets, as .git is', async () => {
    const rig = makeRig();
    rig.ops.trash(['.claude/skills/notes.md']);
    expect(h.setConfirm).not.toHaveBeenCalled();
    h.trash.mockResolvedValue({ trashed: [], failed: [] });
    rig.ops.trash(['.claude/skills/notes.md', 'src/a.ts']);
    confirmLast();
    await flush();
    expect(h.trash).toHaveBeenCalledTimes(1);
    expect(h.trash.mock.calls[0]?.[0]).toEqual({
      root: ROOT,
      paths: ['src/a.ts']
    });
  });

  it('drop: nothing INTO a link, and a model that moved is put back', () => {
    const rig = makeRig();
    rig.ops.drop(['src/a.ts'], '.claude/skills/', true);
    expect(h.move).not.toHaveBeenCalled();
    expect(rig.batches).toEqual([
      [{ type: 'move', from: '.claude/skills/a.ts', to: 'src/a.ts' }]
    ]);
    rig.ops.drop(['src/a.ts'], 'linkOut/sub/', false);
    expect(h.move).not.toHaveBeenCalled();
  });

  it('drop: nothing FROM under a link, even with a plain destination', () => {
    const rig = makeRig();
    rig.ops.drop(['.claude/skills/notes.md', 'src/a.ts'], '.claude/', false);
    expect(h.move).not.toHaveBeenCalled();
  });

  it('drop: an ordinary move still reaches main', async () => {
    h.move.mockResolvedValue({ status: 'moved', moved: [], skipped: [] });
    const rig = makeRig();
    rig.ops.drop(['src/a.ts'], '.claude/', false);
    await flush();
    expect(h.move).toHaveBeenCalledTimes(1);
  });

  it('importPaths: nothing copied into a link or under one', async () => {
    const rig = makeRig();
    rig.ops.importPaths(['/Users/x/in.md'], '.claude/skills/', 0);
    rig.ops.importPaths(['/Users/x/in.md'], '.claude/skills/a-skill/', 0);
    expect(h.importPaths).not.toHaveBeenCalled();
    h.importPaths.mockResolvedValue({ status: 'imported', imported: [], skipped: [] });
    rig.ops.importPaths(['/Users/x/in.md'], '.claude/', 0);
    await flush();
    expect(h.importPaths).toHaveBeenCalledTimes(1);
  });

  it('with no links said at all, the verbs behave as they always did', () => {
    const rig = makeRig(null);
    rig.ops.startRename('.claude/skills/notes.md');
    expect(rig.renames).toEqual(['.claude/skills/notes.md']);
  });
});

describe('main answers `file` for a link; the tree keeps its folder row', () => {
  it('trash of the link row removes the FOLDER row and forgets its listing', async () => {
    h.trash.mockResolvedValue({
      trashed: [
        {
          path: `${ROOT}/.claude/skills`,
          relPath: '.claude/skills',
          kind: 'file'
        }
      ],
      failed: []
    });
    const rig = makeRig();
    rig.ops.trash(['.claude/skills/']);
    confirmLast();
    await flush();
    expect(rig.removes).toEqual([
      { path: '.claude/skills/', recursive: true }
    ]);
    expect(h.forgetUnder).toHaveBeenCalledWith([`${ROOT}/.claude/skills`]);
  });

  it('a move of the link row moves the FOLDER row, and tabs under it follow', async () => {
    h.move.mockResolvedValue({
      status: 'moved',
      moved: [
        {
          from: {
            path: `${ROOT}/.claude/skills`,
            relPath: '.claude/skills',
            kind: 'file'
          },
          to: { path: `${ROOT}/src/skills`, relPath: 'src/skills', kind: 'file' }
        }
      ],
      skipped: []
    });
    const rig = makeRig();
    rig.ops.drop(['.claude/skills/'], 'src/', false);
    await flush();
    expect(rig.batches).toEqual([
      [{ type: 'move', from: '.claude/skills/', to: 'src/skills/' }]
    ]);
    expect(h.followMoves).toHaveBeenCalledWith([
      {
        from: `${ROOT}/.claude/skills`,
        to: `${ROOT}/src/skills`,
        kind: 'dir'
      }
    ]);
    expect(h.forgetUnder).toHaveBeenCalledWith([`${ROOT}/.claude/skills`]);
  });

  it('a duplicate of the link row adds a FOLDER row for the copy', async () => {
    h.duplicate.mockResolvedValue({
      path: `${ROOT}/.claude/skills copy`,
      relPath: '.claude/skills copy',
      kind: 'file'
    });
    const rig = makeRig();
    rig.ops.duplicate('.claude/skills/');
    await flush();
    expect(h.duplicate).toHaveBeenCalledTimes(1);
    expect(rig.adds).toEqual(['.claude/skills copy/']);
  });

  it('a duplicate of a link to a FILE stays a file row', async () => {
    h.duplicate.mockResolvedValue({
      path: `${ROOT}/linkFile copy`,
      relPath: 'linkFile copy',
      kind: 'file'
    });
    const rig = makeRig();
    rig.ops.duplicate('linkFile');
    await flush();
    expect(rig.adds).toEqual(['linkFile copy']);
  });
});

describe("Move to Trash's confirm over a link", () => {
  const BASE = 'It moves to the Trash, so you can put it back from Finder.';

  it('says only the link moves, once, when one target is a link', () => {
    const rig = makeRig();
    rig.ops.trash(['.claude/skills/']);
    const body = (h.setConfirm.mock.calls[0]?.[0] as { body: string }).body;
    expect(body).toBe(
      `${BASE} Only the link moves, and what it points to stays.`
    );
  });

  it('says it in the plural for two links', () => {
    const rig = makeRig();
    rig.ops.trash(['.claude/skills/', 'linkFile', 'src/a.ts']);
    const body = (h.setConfirm.mock.calls[0]?.[0] as { body: string }).body;
    expect(body).toBe(
      `${BASE} Only the links move, and what they point to stays.`
    );
  });

  it("is today's sentence when no target is a link", () => {
    const rig = makeRig();
    rig.ops.trash(['src/a.ts']);
    const body = (h.setConfirm.mock.calls[0]?.[0] as { body: string }).body;
    expect(body).toBe(BASE);
    expect(trashBody(0)).toBe(BASE);
  });
});
