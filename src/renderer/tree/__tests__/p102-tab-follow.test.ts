/**
 * PHASE 102. What a rename ON ANOTHER MACHINE does to the open editor tabs.
 *
 * THE CORRUPTION THIS PREVENTS, stated once. A remote tab's identity is not an
 * absolute path. It is `machine:<machineId>:<repoPath>:<relPath>`, composed by
 * `remoteTabId` in editor/tab-identity.ts, and the format exists because two
 * folders on one machine can both hold `src/a.ts`. Calling `followMoves`
 * unchanged after a remote rename would rekey such a tab onto a bare absolute
 * path, which collides with a local tab holding that path on this Mac and
 * destroys the rule. In the probes for these phases the far side IS this Mac,
 * so that collision is the ordinary case rather than a corner of it.
 *
 * FOUR RULES ARE PINNED HERE.
 *
 *  - A move that names a machine never touches a tab on this Mac.
 *  - A move on this Mac never touches a tab on a machine.
 *  - A move that names a machine touches a tab on that machine only when the
 *    folder matches too.
 *  - A touched remote tab keeps a machine shaped id, and its `relPath` and its
 *    name follow the new path.
 */

import { describe, expect, it } from 'vitest';
import type { EditorTab } from '../../editor/store';
import { remoteTabId } from '../../editor/tab-identity';
import { pathAfterMove, planTabFollow, retargetTab } from '../tab-follow';

const MACHINE = 'm1';
const REPO = '/home/greg/api';

/** A tab with only the fields these rules read. */
function tab(overrides: Partial<EditorTab> & { path: string }): EditorTab {
  const repoPath = overrides.repoPath ?? '/proj';
  const path = overrides.path;
  const relPath = path.startsWith(repoPath + '/')
    ? path.slice(repoPath.length + 1)
    : path;
  return {
    id: path,
    relPath,
    origRelPath: null,
    repoPath,
    name: path.slice(path.lastIndexOf('/') + 1),
    mode: 'file',
    canDiff: false,
    markdown: false,
    image: false,
    svg: false,
    imageData: null,
    imageHead: null,
    imageRevision: 0,
    preview: false,
    commit: null,
    dirty: false,
    deleted: false,
    truncated: false,
    loading: false,
    error: null,
    savedContents: '',
    headContents: null,
    lastUsed: 0,
    contextEntry: null,
    ...overrides
  } as EditorTab;
}

/** A tab showing a file on the machine, keyed the way the store keys one. */
function remoteTab(relPath: string, repoPath = REPO): EditorTab {
  const path = `${repoPath}/${relPath}`;
  return tab({
    path,
    repoPath,
    id: remoteTabId(MACHINE, repoPath, relPath),
    remote: {
      machineId: MACHINE,
      machineLabel: 'Studio',
      repoPath
    }
  });
}

const machine = { machineId: MACHINE, repoPath: REPO };

describe('the identity format has exactly one owner', () => {
  it('composes the three parts the store has always composed', () => {
    expect(remoteTabId('m1', '/home/greg/api', 'src/a.ts')).toBe(
      'machine:m1:/home/greg/api:src/a.ts'
    );
  });

  it('keeps two folders on one machine apart', () => {
    expect(remoteTabId('m1', '/a', 'src/a.ts')).not.toBe(
      remoteTabId('m1', '/b', 'src/a.ts')
    );
  });
});

describe('a rename on a machine never moves a tab on this Mac', () => {
  it('leaves a local tab at the same absolute path alone', () => {
    // The far side IS this Mac in every probe, so this path names a real file
    // here as well as there. Comparing paths first would move the wrong tab.
    const local = tab({ path: `${REPO}/README.md`, repoPath: REPO });
    const plan = planTabFollow(
      [local],
      [
        {
          from: `${REPO}/README.md`,
          to: `${REPO}/readme.md`,
          kind: 'file',
          machine
        }
      ]
    );
    expect(plan.rekeys).toEqual([]);
    expect(plan.tabs[0]?.id).toBe(local.id);
    expect(plan.tabs[0]?.path).toBe(`${REPO}/README.md`);
  });

  it('moves the remote tab and leaves the local one where it was', () => {
    const local = tab({ path: `${REPO}/README.md`, repoPath: REPO });
    const far = remoteTab('README.md');
    const plan = planTabFollow(
      [local, far],
      [
        {
          from: `${REPO}/README.md`,
          to: `${REPO}/readme.md`,
          kind: 'file',
          machine
        }
      ]
    );
    expect(plan.rekeys).toEqual([
      {
        from: remoteTabId(MACHINE, REPO, 'README.md'),
        to: remoteTabId(MACHINE, REPO, 'readme.md')
      }
    ]);
    expect(plan.tabs).toHaveLength(2);
    expect(plan.tabs[0]?.id).toBe(local.id);
    expect(plan.tabs[1]?.id).toBe(remoteTabId(MACHINE, REPO, 'readme.md'));
    expect(plan.tabs[1]?.path).toBe(`${REPO}/readme.md`);
    expect(plan.tabs[1]?.relPath).toBe('readme.md');
    expect(plan.tabs[1]?.name).toBe('readme.md');
  });
});

describe('a rename on this Mac never moves a tab on a machine', () => {
  it('leaves the remote tab alone', () => {
    const far = remoteTab('README.md');
    const plan = planTabFollow(
      [far],
      [{ from: `${REPO}/README.md`, to: `${REPO}/readme.md`, kind: 'file' }]
    );
    expect(plan.rekeys).toEqual([]);
    expect(plan.tabs[0]?.id).toBe(far.id);
  });
});

describe('a machine move has to name the same folder too', () => {
  it('leaves a tab from a second folder on that machine alone', () => {
    // Two folders on ONE machine can both hold src/a.ts, which is why the
    // repository root is part of the identity in the first place.
    const other = remoteTab('src/a.ts', '/home/greg/www');
    const plan = planTabFollow(
      [other],
      [
        {
          from: `${REPO}/src/a.ts`,
          to: `${REPO}/src/b.ts`,
          kind: 'file',
          machine
        }
      ]
    );
    expect(plan.rekeys).toEqual([]);
    expect(plan.tabs[0]?.id).toBe(other.id);
  });
});

describe('a folder rename on a machine carries every tab beneath it', () => {
  it('rewrites both descendants and keeps both identities machine shaped', () => {
    const one = remoteTab('src/deep/a.ts');
    const two = remoteTab('src/b.ts');
    const plan = planTabFollow(
      [one, two],
      [{ from: `${REPO}/src`, to: `${REPO}/lib`, kind: 'dir', machine }]
    );
    expect(plan.tabs.map((t) => t.id)).toEqual([
      remoteTabId(MACHINE, REPO, 'lib/deep/a.ts'),
      remoteTabId(MACHINE, REPO, 'lib/b.ts')
    ]);
    expect(plan.tabs.map((t) => t.path)).toEqual([
      `${REPO}/lib/deep/a.ts`,
      `${REPO}/lib/b.ts`
    ]);
  });

  it('touches nothing beneath it when the kind reads file', () => {
    // The kind comes from the machine's own answer for exactly this reason. A
    // folder rename carried as a file leaves every tab under it stranded, and
    // the arithmetic that would have moved them never runs.
    const one = remoteTab('src/deep/a.ts');
    expect(
      pathAfterMove(one.path, {
        from: `${REPO}/src`,
        to: `${REPO}/lib`,
        kind: 'file',
        machine
      })
    ).toBeNull();
  });
});

describe('retargeting one tab by hand', () => {
  it('gives a machine tab a machine id and a local tab its path', () => {
    const far = retargetTab(remoteTab('src/a.ts'), `${REPO}/src/b.ts`, machine);
    expect(far.id).toBe(remoteTabId(MACHINE, REPO, 'src/b.ts'));
    expect(far.path).toBe(`${REPO}/src/b.ts`);
    const here = retargetTab(tab({ path: '/proj/src/a.ts' }), '/proj/lib/b.ts');
    expect(here.id).toBe('/proj/lib/b.ts');
    expect(here.path).toBe('/proj/lib/b.ts');
  });

  it('records the pre-rename path for the diff on a machine too', () => {
    // `review-file` reads the committed side with `git show HEAD:<path>`, so
    // after a rename the new path is not in HEAD and the left side would read
    // as a whole file addition.
    const before = remoteTab('src/a.ts');
    const after = retargetTab(
      { ...before, canDiff: true },
      `${REPO}/src/b.ts`,
      machine
    );
    expect(after.origRelPath).toBe('src/a.ts');
  });
});

describe('a history tab is never touched', () => {
  it('leaves a commit tab where it is, on either computer', () => {
    const history = tab({
      path: `${REPO}/README.md`,
      repoPath: REPO,
      id: 'abc1234:README.md',
      commit: { sha: 'abc1234', shortSha: 'abc1234' } as never
    });
    const plan = planTabFollow(
      [history],
      [
        {
          from: `${REPO}/README.md`,
          to: `${REPO}/readme.md`,
          kind: 'file',
          machine
        }
      ]
    );
    expect(plan.rekeys).toEqual([]);
  });
});
