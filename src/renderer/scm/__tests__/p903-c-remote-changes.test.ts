/**
 * Phase 90.3. What has changed in a folder on another machine.
 *
 * FOUR THINGS THIS PROVES, and each is a rule the phase set rather than an
 * implementation detail.
 *
 *  1. The store is keyed by the PAIR. Two folders at ONE path on two computers
 *     are two entries, and neither can read the other's rows. That is the wrong
 *     machine defect the whole round exists to remove.
 *  2. NO TIMER, ANYWHERE. Nothing in this module schedules a second read. The
 *     test advances fake timers by five minutes and counts the calls.
 *  3. PHASE 103 REPLACED THIS CASE AND PHASE 104 REPLACED IT AGAIN. It used to
 *     read that the store has no verb that writes and that its whole surface is
 *     three functions. Phase 103 made it five, being `stage` and `unstage`
 *     added. Phase 104 made it eight, being `setMessage`, `commit` and
 *     `checkCommit` added. What the case proves instead is that the surface is
 *     exactly those eight, so a ninth cannot arrive without this file being
 *     edited, and that none of the three verbs that write can change a file's
 *     contents on either computer.
 *  4. A machine that did not answer is a state and not a thrown error, so the
 *     view draws a sentence rather than a stack.
 *  5. PHASE 97. It records TWO groups, being the tracked files and the files
 *     git is not yet tracking, each with a count of its own.
 *  6. PHASE 103. A verb sends the machine, the tab's folder on that machine
 *     and a list of repository relative paths, and it sends no repository
 *     root. It records a word rather than a sentence. It throws nothing, so a
 *     connection that dies is the word `unsure`. And it re-reads that folder
 *     afterwards, every time, because nothing over there tells Tortie that the
 *     index moved.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const reviewFiles = vi.fn();
const stage = vi.fn();
const unstage = vi.fn();

vi.stubGlobal('window', {
  gmux: { machines: { reviewFiles, stage, unstage } }
});

const {
  remoteChangesAvailable,
  remoteChangesOf,
  remoteIndexWriteAvailable,
  useRemoteChanges
} = await import('../remote-changes');

const STUDIO = { machineId: 'studio', path: '/home/greg/api' };
const ATTIC = { machineId: 'attic', path: '/home/greg/api' };
const HERE = { machineId: 'local', path: '/home/greg/api' };

function answer(over: Record<string, unknown> = {}): unknown {
  return {
    machineId: 'studio',
    machineLabel: 'Studio',
    repoPath: '/home/greg/api',
    files: [{ path: 'src/auth.ts', origPath: null, status: 'M' }],
    total: 1,
    // PHASE 97. Every case written before this phase keeps passing byte for
    // byte, because an answer with no new file in it is the empty pair.
    untracked: [],
    untrackedTotal: 0,
    note: null,
    ...over
  };
}

const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

/** What main answers for one stage or one unstage. */
function wrote(over: Record<string, unknown> = {}): unknown {
  return {
    outcome: 'done',
    paths: 1,
    chunks: 1,
    repoPath: '/home/greg/api',
    writeRoot: '/home/greg',
    machineSaid: null,
    readMs: 40,
    tookMs: 90,
    ...over
  };
}

beforeEach(() => {
  useRemoteChanges.setState({ byTarget: {} });
  reviewFiles.mockReset();
  reviewFiles.mockResolvedValue(answer());
  stage.mockReset();
  stage.mockResolvedValue(wrote());
  unstage.mockReset();
  unstage.mockResolvedValue(wrote());
});

afterEach(() => {
  vi.useRealTimers();
});

describe('the read', () => {
  it('is available only when the bridge has the method', () => {
    expect(remoteChangesAvailable()).toBe(true);
  });

  it('asks the machine for the folder ON THAT MACHINE', async () => {
    useRemoteChanges.getState().ensure(STUDIO);
    await flush();
    expect(reviewFiles).toHaveBeenCalledWith({
      machineId: 'studio',
      cwd: '/home/greg/api'
    });
    const entry = remoteChangesOf(useRemoteChanges.getState().byTarget, STUDIO);
    expect(entry.files).toHaveLength(1);
    expect(entry.repoPath).toBe('/home/greg/api');
    expect(entry.notRepo).toBe(false);
    expect(entry.failed).toBe(false);
    expect(entry.readAt).toBeGreaterThan(0);
  });

  it('reads once for a target that has been read, and again on Refresh', async () => {
    useRemoteChanges.getState().ensure(STUDIO);
    await flush();
    useRemoteChanges.getState().ensure(STUDIO);
    useRemoteChanges.getState().ensure(STUDIO);
    await flush();
    expect(reviewFiles).toHaveBeenCalledTimes(1);

    await useRemoteChanges.getState().refresh(STUDIO);
    expect(reviewFiles).toHaveBeenCalledTimes(2);
  });
});

describe('the key is the pair, never the path', () => {
  it('keeps two machines at one path apart', async () => {
    reviewFiles.mockResolvedValueOnce(answer());
    useRemoteChanges.getState().ensure(STUDIO);
    await flush();
    reviewFiles.mockResolvedValueOnce(
      answer({
        machineId: 'attic',
        machineLabel: 'Attic',
        files: [],
        total: 0,
        note: 'nothing'
      })
    );
    useRemoteChanges.getState().ensure(ATTIC);
    await flush();

    const byTarget = useRemoteChanges.getState().byTarget;
    expect(remoteChangesOf(byTarget, STUDIO).files).toHaveLength(1);
    expect(remoteChangesOf(byTarget, ATTIC).files).toHaveLength(0);
    // A folder on THIS Mac at the same path reads neither of them.
    expect(remoteChangesOf(byTarget, HERE).files).toHaveLength(0);
    expect(remoteChangesOf(byTarget, HERE).readAt).toBe(0);
    expect(remoteChangesOf(byTarget, null).readAt).toBe(0);
  });

  it('forgets one target and leaves the other alone', async () => {
    useRemoteChanges.getState().ensure(STUDIO);
    await flush();
    useRemoteChanges.getState().ensure(ATTIC);
    await flush();
    useRemoteChanges.getState().forget(STUDIO);
    const byTarget = useRemoteChanges.getState().byTarget;
    expect(remoteChangesOf(byTarget, STUDIO).readAt).toBe(0);
    expect(remoteChangesOf(byTarget, ATTIC).readAt).toBeGreaterThan(0);
  });
});

describe('no timer, anywhere', () => {
  it('makes no second call in five minutes of clock', async () => {
    vi.useFakeTimers();
    useRemoteChanges.getState().ensure(STUDIO);
    await vi.advanceTimersByTimeAsync(1);
    expect(reviewFiles).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
    expect(reviewFiles).toHaveBeenCalledTimes(1);
  });

  it('holds no timer id and no interval in its own source', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const source = readFileSync(
      resolve(import.meta.dirname, '../remote-changes.ts'),
      'utf8'
    );
    expect(source).not.toContain('setInterval');
    expect(source).not.toContain('setTimeout');
    expect(source).not.toContain('requestAnimationFrame');
  });
});

describe('what a machine said is a state and never a thrown error', () => {
  it('records a folder that is not a repository', async () => {
    reviewFiles.mockResolvedValueOnce(
      answer({ repoPath: '', files: [], total: 0, note: 'not a repository' })
    );
    useRemoteChanges.getState().ensure(STUDIO);
    await flush();
    const entry = remoteChangesOf(useRemoteChanges.getState().byTarget, STUDIO);
    expect(entry.notRepo).toBe(true);
    // Main's own sentence is dropped for this case, because the view draws its
    // own for it and two sentences saying one thing is one too many.
    expect(entry.note).toBeNull();
  });

  it('records a machine that did not answer, and throws nothing', async () => {
    reviewFiles.mockRejectedValueOnce(new Error('no answer'));
    await expect(
      useRemoteChanges.getState().refresh(STUDIO)
    ).resolves.toBeUndefined();
    const entry = remoteChangesOf(useRemoteChanges.getState().byTarget, STUDIO);
    expect(entry.failed).toBe(true);
    expect(entry.loading).toBe(false);
    expect(entry.refreshing).toBe(false);
  });

  it('keeps main sentence under a capped list', async () => {
    reviewFiles.mockResolvedValueOnce(
      answer({ total: 900, note: 'Showing the first 200 of 900 files.' })
    );
    useRemoteChanges.getState().ensure(STUDIO);
    await flush();
    const entry = remoteChangesOf(useRemoteChanges.getState().byTarget, STUDIO);
    expect(entry.note).toBe('Showing the first 200 of 900 files.');
    expect(entry.total).toBe(900);
  });
});

describe('the two groups Phase 97 added', () => {
  it('carries the untracked group into the entry', async () => {
    reviewFiles.mockResolvedValueOnce(
      answer({
        untracked: [
          { path: 'src/agent-notes.md', origPath: null, status: 'A' },
          { path: 'tools/p97-new.ts', origPath: null, status: 'A' }
        ],
        untrackedTotal: 2
      })
    );
    useRemoteChanges.getState().ensure(STUDIO);
    await flush();
    const entry = remoteChangesOf(useRemoteChanges.getState().byTarget, STUDIO);
    expect(entry.files.map((one) => one.path)).toEqual(['src/auth.ts']);
    expect(entry.total).toBe(1);
    expect(entry.untracked.map((one) => one.path)).toEqual([
      'src/agent-notes.md',
      'tools/p97-new.ts'
    ]);
    expect(entry.untrackedTotal).toBe(2);
  });

  it("keeps main's capped sentence when only the untracked group has rows", async () => {
    // THIS IS THE CASE THAT FAILS ON THE OLD CONDITION. It read
    // `list.files.length > 0`, so an answer whose rows are all untracked lost
    // the one sentence main composes, and the person was told nothing about a
    // list that had been cut.
    reviewFiles.mockResolvedValueOnce(
      answer({
        files: [],
        total: 0,
        untracked: [{ path: 'tools/p97-new.ts', origPath: null, status: 'A' }],
        untrackedTotal: 40,
        note: 'Showing 30 of 40 files. The rest are not listed here.'
      })
    );
    useRemoteChanges.getState().ensure(STUDIO);
    await flush();
    const entry = remoteChangesOf(useRemoteChanges.getState().byTarget, STUDIO);
    expect(entry.note).toBe(
      'Showing 30 of 40 files. The rest are not listed here.'
    );
    expect(entry.untrackedTotal).toBe(40);
    expect(entry.notRepo).toBe(false);
  });

  it('starts every target with both groups empty rather than undefined', () => {
    const entry = remoteChangesOf({}, STUDIO);
    expect(entry.untracked).toEqual([]);
    expect(entry.untrackedTotal).toBe(0);
  });
});

describe('the whole surface, counted', () => {
  it('offers exactly eight functions and no ninth', () => {
    // PHASE 103 CHANGED THIS COUNT FROM THREE TO FIVE AND PHASE 104 CHANGED IT
    // FROM FIVE TO EIGHT. The point of counting is unchanged: a verb cannot be
    // added to this store without a reader of this file seeing it happen.
    const state = useRemoteChanges.getState() as unknown as Record<
      string,
      unknown
    >;
    const verbs = Object.keys(state).filter(
      (key) => typeof state[key] === 'function'
    );
    expect(verbs.sort()).toEqual([
      'checkCommit',
      'commit',
      'ensure',
      'forget',
      'refresh',
      'setMessage',
      'stage',
      'unstage'
    ]);
  });

  it('has no discard and no checkout, and this is the refusal', () => {
    // PHASE 104 TOOK `commit` OUT OF THIS LIST, because it ships. The two that
    // are left are refused for good. Discard is refused by research 57 section
    // 5.7 and `build/conformance-machines.mjs` condition 83 reads every command
    // Tortie can send and fails on one that could overwrite a working tree file
    // over there. Checkout is not authorised by anything.
    const state = useRemoteChanges.getState() as unknown as Record<
      string,
      unknown
    >;
    expect(state['discard']).toBeUndefined();
    expect(state['checkout']).toBeUndefined();
    expect(state['amend']).toBeUndefined();
    expect(state['push']).toBeUndefined();
  });
});

describe('the two verbs Phase 103 added', () => {
  it('is available only when the bridge carries both members', () => {
    expect(remoteIndexWriteAvailable()).toBe(true);
  });

  it('sends the machine, the folder and the paths, and no repository root', async () => {
    await useRemoteChanges.getState().stage(STUDIO, ['src/auth.ts']);
    expect(stage).toHaveBeenCalledWith({
      machineId: 'studio',
      cwd: '/home/greg/api',
      paths: ['src/auth.ts']
    });
    const sent = stage.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(Object.keys(sent).sort()).toEqual(['cwd', 'machineId', 'paths']);
    expect(sent['repoPath']).toBeUndefined();
    expect(sent['root']).toBeUndefined();
  });

  it('sends the same shape for unstage', async () => {
    await useRemoteChanges.getState().unstage(STUDIO, ['src/auth.ts']);
    expect(unstage).toHaveBeenCalledWith({
      machineId: 'studio',
      cwd: '/home/greg/api',
      paths: ['src/auth.ts']
    });
    expect(stage).not.toHaveBeenCalled();
  });

  it('reads that folder again after every write', async () => {
    await useRemoteChanges.getState().stage(STUDIO, ['src/auth.ts']);
    expect(reviewFiles).toHaveBeenCalledTimes(1);
    await useRemoteChanges.getState().unstage(STUDIO, ['src/auth.ts']);
    expect(reviewFiles).toHaveBeenCalledTimes(2);
  });

  it('reads that folder again even when nothing was sent', async () => {
    // A refusal decided on this Mac costs one read. A stale list costs a
    // person a wrong commit, which is the more expensive of the two.
    stage.mockResolvedValueOnce(wrote({ outcome: 'writesOff', chunks: 0 }));
    await useRemoteChanges.getState().stage(STUDIO, ['src/auth.ts']);
    expect(reviewFiles).toHaveBeenCalledTimes(1);
    const entry = remoteChangesOf(useRemoteChanges.getState().byTarget, STUDIO);
    expect(entry.writeOutcome).toBe('writesOff');
    expect(entry.writeVerb).toBe('stage');
  });

  it('records a word and never a sentence', async () => {
    for (const outcome of [
      'done',
      'partial',
      'unsure',
      'writesOff',
      'outsideRoot',
      'notRepo',
      'nothingToDo'
    ]) {
      stage.mockResolvedValueOnce(wrote({ outcome }));
      await useRemoteChanges.getState().stage(STUDIO, ['src/auth.ts']);
      const entry = remoteChangesOf(
        useRemoteChanges.getState().byTarget,
        STUDIO
      );
      expect(entry.writeOutcome).toBe(outcome);
      // No prose is stored anywhere on the entry. The view composes every
      // sentence a person reads about a machine.
      expect(JSON.stringify(entry)).not.toContain('Tortie');
    }
  });

  it('answers unsure when the machine does not answer, and throws nothing', async () => {
    stage.mockRejectedValueOnce(new Error('the link went away'));
    await expect(
      useRemoteChanges.getState().stage(STUDIO, ['src/auth.ts'])
    ).resolves.toBeUndefined();
    const entry = remoteChangesOf(useRemoteChanges.getState().byTarget, STUDIO);
    expect(entry.writeOutcome).toBe('unsure');
    expect(entry.writing).toBe(false);
    // A link that failed carries no refusal, so the view draws the word.
    expect(entry.writeRefusal).toBeNull();
    // It re-reads even then, because unsure never means nothing changed.
    expect(reviewFiles).toHaveBeenCalledTimes(1);
  });

  it("carries main's own refusal sentence instead of the word unsure", async () => {
    // PHASE 103 FIX ROUND. Three of this phase's refusals are thrown by
    // src/main/machines/remote-stage.ts and nothing is sent for any of them.
    // Before this, every one of them read as `unsure`, which draws the sentence
    // saying Tortie asked that machine and it did not say it had. That sentence
    // was false three times over.
    const said =
      'Tortie will not stage a file whose name holds a line break, because ' +
      'the list of paths travels to that machine one path per line. Nothing ' +
      'was sent.';
    stage.mockRejectedValueOnce(
      new Error(
        `Error invoking remote method 'machines:stage': ${JSON.stringify({
          code: 'INVALID_INPUT',
          message: said
        })}`
      )
    );
    await useRemoteChanges.getState().stage(STUDIO, ['bad\nname.ts']);
    const entry = remoteChangesOf(useRemoteChanges.getState().byTarget, STUDIO);
    expect(entry.writeRefusal).toBe(said);
    expect(entry.writeOutcome).toBe('unsure');
    // Refresh is what clears it, exactly as it clears the word.
    await useRemoteChanges.getState().refresh(STUDIO);
    expect(
      remoteChangesOf(useRemoteChanges.getState().byTarget, STUDIO).writeRefusal
    ).toBeNull();
  });

  it('runs one write per folder at a time', async () => {
    let release = (): void => {};
    stage.mockImplementationOnce(
      () =>
        new Promise((r) => {
          release = () => r(wrote());
        })
    );
    const first = useRemoteChanges.getState().stage(STUDIO, ['src/auth.ts']);
    await flush();
    expect(
      remoteChangesOf(useRemoteChanges.getState().byTarget, STUDIO).writing
    ).toBe(true);
    await useRemoteChanges.getState().stage(STUDIO, ['src/other.ts']);
    expect(stage).toHaveBeenCalledTimes(1);
    release();
    await first;
    expect(
      remoteChangesOf(useRemoteChanges.getState().byTarget, STUDIO).writing
    ).toBe(false);
  });

  it('keeps two machines at one path apart for the verbs as well', async () => {
    await useRemoteChanges.getState().stage(STUDIO, ['src/auth.ts']);
    const byTarget = useRemoteChanges.getState().byTarget;
    expect(remoteChangesOf(byTarget, STUDIO).writeOutcome).toBe('done');
    expect(remoteChangesOf(byTarget, ATTIC).writeOutcome).toBeNull();
  });

  it('starts every target with no write on it', () => {
    const entry = remoteChangesOf({}, STUDIO);
    expect(entry.writing).toBe(false);
    expect(entry.writeVerb).toBeNull();
    expect(entry.writeOutcome).toBeNull();
  });
});

describe('Refresh clears what the last write left', () => {
  it('takes the sentence off the screen once the person presses it', async () => {
    // The two sentences that ask for a Refresh would otherwise still be on
    // screen after the person pressed it, which is the panel asking twice for
    // something already done.
    stage.mockResolvedValueOnce(wrote({ outcome: 'unsure' }));
    await useRemoteChanges.getState().stage(STUDIO, ['src/auth.ts']);
    expect(
      remoteChangesOf(useRemoteChanges.getState().byTarget, STUDIO).writeOutcome
    ).toBe('unsure');
    await useRemoteChanges.getState().refresh(STUDIO);
    const entry = remoteChangesOf(useRemoteChanges.getState().byTarget, STUDIO);
    expect(entry.writeOutcome).toBeNull();
    expect(entry.writeVerb).toBeNull();
    expect(entry.readAt).toBeGreaterThan(0);
  });

  it('leaves it alone for the re-read a verb runs itself', async () => {
    stage.mockResolvedValueOnce(wrote({ outcome: 'partial' }));
    await useRemoteChanges.getState().stage(STUDIO, ['src/auth.ts']);
    const entry = remoteChangesOf(useRemoteChanges.getState().byTarget, STUDIO);
    expect(entry.writeOutcome).toBe('partial');
    expect(entry.readAt).toBeGreaterThan(0);
  });
});
