/**
 * Phase 97 fix round. The activity rail's badge and the Changes header state
 * ONE number for one folder on one machine.
 *
 * WHY THIS FILE EXISTS. Phase 97 taught the Changes list to draw the files git
 * is not yet tracking, and for one round it taught only the list. The rail's
 * badge kept reading `files.length`, so a verifier photographed a badge of 2
 * beside a section header reading CHANGES 5, in one window at one moment. The
 * local rail never had that split, because git's own status puts an untracked
 * entry in the same array `dirtyCount` measures. The remote badge therefore
 * disagreed both with its own panel and with the local surface this phase
 * exists to reach parity with.
 *
 * What these tests hold:
 *  1. `remoteChangesCount` counts both groups, and it counts what is DRAWN.
 *  2. `scmBadgeCount`, which is the rail's own number, calls it for a folder
 *     on another machine and `dirtyCount` for a folder on this Mac.
 *  3. The local count has always included a file git is not tracking, proven
 *     with git's own porcelain output through the real parser rather than a
 *     hand-made object.
 *  4. The two rails answer the same for the same folder, and their accessible
 *     names are the same sentence. That is the parity claim of the phase
 *     stated as a number rather than as a promise.
 *
 * WHY NOTHING HERE RENDERS THE RAIL. zustand 5 answers a server render from
 * `getInitialState`, so `renderToStaticMarkup` on this component reads empty
 * stores no matter what a test writes into them. The number and the sentence
 * are pinned by calling the two pure functions the component itself calls.
 * What a person sees is `npm run probe:p97`, not this file.
 */

import { describe, expect, it, vi } from 'vitest';
import type { GitStatusResult } from '@shared/types';
import type { MachineReviewFile } from '@shared/ipc';

// The stores read window.gmux while zustand builds their initial state, so the
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

const { railItemLabel, scmBadgeCount } = await import('../../app/ActivityBar');
const { remoteChangesCount } = await import('../remote-changes');
const { dirtyCount } = await import('../groups');
const { parsePorcelainV2Status } = await import('../../../main/git/parse');

const PATH = '/home/greg/api';
const STUDIO = { machineId: 'studio', path: PATH };
const HERE = { machineId: 'local', path: PATH };

// PHASE 103 ADDED THE TWO CHARACTERS. Every row carries the pair git prints
// now, being what the index holds and what the folder on disk holds. These two
// tracked rows are edits nobody has staged, so their pair is `.M`, and the
// three untracked ones carry the pair `??` that git prints for a file it has
// never seen. Not one number in this file moved, because the rail's badge
// counts rows and this phase changed no row's existence.
const TRACKED: MachineReviewFile[] = [
  {
    path: 'src/auth.ts',
    origPath: null,
    status: 'M',
    indexState: '.',
    worktreeState: 'M'
  },
  {
    path: 'src/router.ts',
    origPath: null,
    status: 'M',
    indexState: '.',
    worktreeState: 'M'
  }
];
const UNTRACKED: MachineReviewFile[] = [
  {
    path: 'src/agent-notes.md',
    origPath: null,
    status: 'A',
    indexState: '?',
    worktreeState: '?'
  },
  {
    path: 'src/scratch/plan.txt',
    origPath: null,
    status: 'A',
    indexState: '?',
    worktreeState: '?'
  },
  {
    path: 'tools/p97-new.ts',
    origPath: null,
    status: 'A',
    indexState: '?',
    worktreeState: '?'
  }
];

/** One entry as the store holds it. Two changed files and three new ones. */
function entry(over: Record<string, unknown> = {}): never {
  return {
    machineId: 'studio',
    path: PATH,
    repoPath: PATH,
    files: TRACKED,
    total: TRACKED.length,
    untracked: UNTRACKED,
    untrackedTotal: UNTRACKED.length,
    note: null,
    notRepo: false,
    loading: false,
    refreshing: false,
    failed: false,
    readAt: 1,
    ...over
  } as never;
}

// git's own output for two changed files and three it is not tracking. The
// real parser reads it, so this is what THIS Mac would put in its git store.
const PORCELAIN = [
  '# branch.head main',
  '1 .M N... 100644 100644 100644 aaa bbb src/auth.ts',
  '1 .M N... 100644 100644 100644 ccc ddd src/router.ts',
  '? src/agent-notes.md',
  '? src/scratch/plan.txt',
  '? tools/p97-new.ts'
].join('\0');

function localStatus(): GitStatusResult {
  return {
    repoPath: PATH,
    ahead: 0,
    behind: 0,
    merging: false,
    files: parsePorcelainV2Status(PORCELAIN).files,
    isRepo: true
  };
}

describe('the remote count itself', () => {
  it('counts both groups, not the tracked one', () => {
    expect(remoteChangesCount(entry())).toBe(5);
  });

  it('is zero for a folder with nothing in either group', () => {
    expect(remoteChangesCount(entry({ files: [], untracked: [] }))).toBe(0);
  });

  it('counts a folder whose only rows are new files', () => {
    expect(remoteChangesCount(entry({ files: [], total: 0 }))).toBe(3);
  });

  it('counts what is DRAWN, not what that machine holds', () => {
    // A capped answer. The list holds five rows and main's own sentence under
    // it states the larger number, so the badge must agree with the list.
    expect(remoteChangesCount(entry({ total: 900, untrackedTotal: 400 }))).toBe(
      5
    );
  });
});

describe('the rail for a folder on another machine', () => {
  it('draws the number the panel header draws', () => {
    expect(scmBadgeCount(STUDIO, null, entry())).toBe(5);
  });

  it('draws nothing for a machine that has not answered yet', () => {
    expect(scmBadgeCount(STUDIO, null, undefined)).toBe(0);
  });

  it('never reads the git status this Mac holds for that path', () => {
    // A local status is present and says five. The badge must still be the
    // machine's own three, because the folder is not on this Mac.
    expect(
      scmBadgeCount(STUDIO, localStatus(), entry({ files: [], total: 0 }))
    ).toBe(3);
  });
});

describe('parity with the rail for a folder on this Mac', () => {
  it('the local count has always included a file git is not tracking', () => {
    const parsed = parsePorcelainV2Status(PORCELAIN);
    expect(parsed.groups.untracked).toHaveLength(3);
    expect(dirtyCount(localStatus())).toBe(5);
  });

  it('the two rails answer the same for the same folder', () => {
    expect(scmBadgeCount(HERE, localStatus(), undefined)).toBe(5);
    expect(scmBadgeCount(STUDIO, null, entry())).toBe(
      scmBadgeCount(HERE, localStatus(), undefined)
    );
  });

  it('a folder that is not a repository counts nothing on either rail', () => {
    expect(
      scmBadgeCount(HERE, { ...localStatus(), isRepo: false }, undefined)
    ).toBe(0);
    expect(scmBadgeCount(STUDIO, null, entry({ files: [], untracked: [] }))).toBe(
      0
    );
  });
});

describe('what a screen reader is told', () => {
  // THE NOUN IS `changed` ON PURPOSE. The section header beside this rail reads
  // `Changes` and the list's own accessible name reads `Changed files`, and
  // both have covered untracked rows since long before this phase. A different
  // word here would put a third wording in one panel.
  it('names the same number the badge draws', () => {
    expect(railItemLabel('Source control', '⌃⇧G', 5, 'changed')).toBe(
      'Source control (⌃⇧G), 5 changed files'
    );
  });

  it('says file, singular, for one', () => {
    expect(railItemLabel('Source control', '⌃⇧G', 1, 'changed')).toBe(
      'Source control (⌃⇧G), 1 changed file'
    );
  });

  it('says nothing about files when there are none', () => {
    expect(railItemLabel('Source control', '⌃⇧G', 0, 'changed')).toBe(
      'Source control (⌃⇧G)'
    );
  });

  it('is one sentence for both rails, because it is one number', () => {
    const remote = scmBadgeCount(STUDIO, null, entry());
    const local = scmBadgeCount(HERE, localStatus(), undefined);
    expect(railItemLabel('Source control', '⌃⇧G', remote, 'changed')).toBe(
      railItemLabel('Source control', '⌃⇧G', local, 'changed')
    );
  });
});
