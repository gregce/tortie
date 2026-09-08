/**
 * Phase 104. The commit box on a tab whose folder is on another machine.
 *
 * WHAT THIS FILE PROVES, and each item is a decision the phase made rather than
 * an implementation detail.
 *
 *  1. THE ORDER OF THE DISABLED REASONS. Six things can stop a commit before
 *     anything is sent, and the order they are reported in is the design. A
 *     person whose machine has no permission to be written on is told that
 *     rather than being told to type a message, because typing one would
 *     change nothing.
 *  2. THE THREE CHECK SENTENCES. The check is one read of that folder, and its
 *     whole question is whether HEAD moved off the sha the commit was sent
 *     with. A sha that moved means the commit ran. A sha that did not means it
 *     did not. No answer means Tortie still cannot say, and the sentence says
 *     exactly that.
 *  3. WHAT THE VERB SENDS. The machine, the tab's folder over there, the sha
 *     the panel drew, the staged paths the panel drew and the person's text.
 *     No repository root, ever, because a root from this renderer paired with
 *     relative paths would let one call reach any repository on that machine.
 *  4. THE STAGED LIST THAT CROSSES IS THE LIST ON SCREEN. It comes out of
 *     `groupRemoteFiles`, which is the same pure function the Staged group is
 *     drawn with, so the two cannot differ.
 *  5. IT THROWS NOTHING. A call that rejects is the word `unsure`, which never
 *     means nothing was committed over there.
 *  6. THE MESSAGE IS CLEARED ONLY ON `committed`, which is the local box's own
 *     rule, so a failure does not make a person type it again.
 *  7. THE MESSAGE IS KEYED BY THE PAIR. Two folders at one path on two
 *     machines hold two drafts, and neither can read the other's.
 *  8. NO SENTENCE ABOUT WHAT HAPPENED OVER THERE IS COMPOSED IN THE RENDERER.
 *     They arrive in `MachineCommitResult.sentences` and the store records them
 *     as main sent them.
 *
 * WHAT IT IS NOT. It is a unit test and it is not evidence at this phase's
 * tier. Nothing here opens a window, contacts a machine or runs a git command.
 * The photographs are taken by `build/probe-p104-shot.mjs` and the far side
 * measurements by `build/probe-p104-commit.mjs`.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MachineReviewFile } from '@shared/ipc';
import {
  REMOTE_SCM_SECTIONS_NOTE,
  commitIdentityFact,
  remoteCommitButton,
  remoteCommitCheckDidNot,
  remoteCommitCheckNoAnswer,
  remoteCommitCheckRan,
  remoteCommitConflicts,
  remoteCommitDisabledReason,
  remoteCommitIdentityMissing,
  remoteCommitNotConnected,
  remoteCommitNothingStagedYet,
  remoteCommitStanding,
  remoteWritesNotConfirmed
} from '../../machines/scm';
import type { RemoteCommitFacts } from '../../machines/scm';

const reviewFiles = vi.fn();
const stage = vi.fn();
const unstage = vi.fn();
const commit = vi.fn();

vi.stubGlobal('window', {
  gmux: { machines: { reviewFiles, stage, unstage, commit } }
});

const { remoteCommitAvailable, useRemoteChanges } = await import(
  '../remote-changes'
);

const STUDIO = { machineId: 'studio', path: '/home/greg/api' };
const ATTIC = { machineId: 'attic', path: '/home/greg/api' };

/** One changed file, from an XY pair written the way git prints it. */
function pair(path: string, xy: string): MachineReviewFile {
  const x = (xy[0] ?? '.') as MachineReviewFile['indexState'];
  const y = (xy[1] ?? '.') as MachineReviewFile['worktreeState'];
  const folded = y !== '.' ? y : x;
  return {
    path,
    origPath: null,
    status: folded as MachineReviewFile['status'],
    indexState: x,
    worktreeState: y
  };
}

/** What main answers for one review read. */
function answer(over: Record<string, unknown> = {}): unknown {
  return {
    machineId: 'studio',
    machineLabel: 'Studio',
    repoPath: '/home/greg/api',
    headSha: '2b9e5f1aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    files: [pair('src/auth.ts', 'M.'), pair('src/ui.ts', '.M')],
    total: 2,
    untracked: [],
    untrackedTotal: 0,
    note: null,
    ...over
  };
}

/** What main answers for one commit. */
function committed(over: Record<string, unknown> = {}): unknown {
  return {
    outcome: 'committed',
    sha: '7d1c40a0000000000000000000000000000000000',
    headSha: '7d1c40a0000000000000000000000000000000000',
    machineSaid: null,
    sentences: ['Committed 7d1c40a on Studio.'],
    sent: 1,
    readMs: 40,
    tookMs: 900,
    ...over
  };
}

const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  useRemoteChanges.setState({ byTarget: {}, messages: {} });
  reviewFiles.mockReset();
  reviewFiles.mockResolvedValue(answer());
  commit.mockReset();
  commit.mockResolvedValue(committed());
});

/** Every fact true, so each case below turns exactly one of them false. */
const READY: RemoteCommitFacts = {
  committing: false,
  writesConfirmed: true,
  connected: true,
  identity: 'known',
  conflicted: false,
  staged: 2,
  message: 'a real message'
};

describe('why the commit button is disabled', () => {
  it('is not disabled when every fact is in order', () => {
    expect(remoteCommitDisabledReason(READY, 'Mac Pro')).toBe(null);
  });

  it('says a commit is already running, before anything else', () => {
    expect(
      remoteCommitDisabledReason(
        { ...READY, committing: true, writesConfirmed: false, message: '' },
        'Mac Pro'
      )
    ).toBe('Committing…');
  });

  it('says saving is off for that machine, and names the two steps', () => {
    expect(
      remoteCommitDisabledReason({ ...READY, writesConfirmed: false }, 'Mac Pro')
    ).toBe(remoteWritesNotConfirmed('Mac Pro'));
  });

  it('says the machine is not answering', () => {
    expect(
      remoteCommitDisabledReason({ ...READY, connected: false }, 'Mac Pro')
    ).toBe(remoteCommitNotConnected('Mac Pro'));
  });

  /**
   * PHASE 229. THE PRECHECK, pinned so it goes red when the `missing` branch
   * of `remoteCommitDisabledReason` is ablated. Every commit on his Mac Pro
   * failed after the press because git there had no name and no address, and
   * nothing asked before it. The reason is one sentence naming the two
   * settings and the machine, and it is drawn ABOVE the staged and message
   * checks, because staging and typing would change nothing.
   */
  it('says git there has no name or address, and names the two settings', () => {
    const said = remoteCommitDisabledReason(
      { ...READY, identity: 'missing' },
      'Mac Pro'
    );
    expect(said).toBe(remoteCommitIdentityMissing('Mac Pro'));
    expect(said).toBe('Set user.name and user.email in git on Mac Pro first');
    expect(said).toContain('user.name');
    expect(said).toContain('user.email');
    // One sentence: no full stop inside it and none at the end, which is the
    // shape of every other caption on this button.
    expect(said).not.toContain('. ');
  });

  it('composes the identity fact from the branch answer (Phase 229)', () => {
    // The Phase 229 verifier found this composition pinned by no unit test,
    // the app run alone proving it. It is one function now: `missing` is the
    // one answer that disables a press, `known` is known, and `unknown` and a
    // target with no store entry are composed as `known`, because a press is
    // never disabled by a question nobody answered.
    expect(commitIdentityFact('missing')).toBe('missing');
    expect(commitIdentityFact('known')).toBe('known');
    expect(commitIdentityFact('unknown')).toBe('known');
    expect(commitIdentityFact(undefined)).toBe('known');
    // And the box hands that function the branch store's own field rather
    // than composing a ternary of its own, read off the source of the section
    // the way the Phase 106 expand guard is.
    const source = readFileSync(
      resolve(__dirname, '../ScmSection.tsx'),
      'utf8'
    );
    expect(source).toContain('identity: commitIdentityFact(branch.identity),');
    expect(source).not.toMatch(/identity:\s*branch\.identity\s*===/);
  });

  it('puts the identity above the folder facts and the box', () => {
    expect(
      remoteCommitDisabledReason(
        { ...READY, identity: 'missing', conflicted: true, staged: 0, message: '' },
        'Mac Pro'
      )
    ).toBe(remoteCommitIdentityMissing('Mac Pro'));
    // And below the machine facts, which are the two things nothing on that
    // machine can change.
    expect(
      remoteCommitDisabledReason(
        { ...READY, identity: 'missing', connected: false },
        'Mac Pro'
      )
    ).toBe(remoteCommitNotConnected('Mac Pro'));
    expect(
      remoteCommitDisabledReason(
        { ...READY, identity: 'missing', writesConfirmed: false },
        'Mac Pro'
      )
    ).toBe(remoteWritesNotConfirmed('Mac Pro'));
  });

  it('says the conflicts have to be resolved over there', () => {
    expect(
      remoteCommitDisabledReason({ ...READY, conflicted: true }, 'Mac Pro')
    ).toBe(remoteCommitConflicts('Mac Pro'));
  });

  it('says nothing is staged on that machine', () => {
    expect(
      remoteCommitDisabledReason({ ...READY, staged: 0 }, 'Mac Pro')
    ).toBe(remoteCommitNothingStagedYet('Mac Pro'));
  });

  it('asks for a message last, and treats blank space as no message', () => {
    expect(
      remoteCommitDisabledReason({ ...READY, message: '   \n  ' }, 'Mac Pro')
    ).toBe('Enter a commit message');
  });

  it('puts every fact about the machine before the empty box', () => {
    // THE ORDER IS THE DESIGN. A person told to type a message, whose machine
    // then refuses the write, typed for nothing.
    const empty = { ...READY, message: '' };
    expect(
      remoteCommitDisabledReason({ ...empty, writesConfirmed: false }, 'Mac Pro')
    ).toBe(remoteWritesNotConfirmed('Mac Pro'));
    expect(
      remoteCommitDisabledReason({ ...empty, connected: false }, 'Mac Pro')
    ).toBe(remoteCommitNotConnected('Mac Pro'));
    expect(
      remoteCommitDisabledReason({ ...empty, identity: 'missing' }, 'Mac Pro')
    ).toBe(remoteCommitIdentityMissing('Mac Pro'));
    expect(
      remoteCommitDisabledReason({ ...empty, staged: 0 }, 'Mac Pro')
    ).toBe(remoteCommitNothingStagedYet('Mac Pro'));
  });

  it('names the machine in every reason that is a sentence', () => {
    const said = [
      remoteWritesNotConfirmed('Mac Pro'),
      remoteCommitNotConnected('Mac Pro'),
      remoteCommitIdentityMissing('Mac Pro'),
      remoteCommitConflicts('Mac Pro'),
      remoteCommitNothingStagedYet('Mac Pro')
    ];
    for (const one of said) expect(one).toContain('Mac Pro');
  });
});

describe('the standing line and the button', () => {
  it('warns about hooks and signing before anything is pressed', () => {
    const line = remoteCommitStanding('Mac Pro');
    expect(line).toContain('Hooks and signing run on Mac Pro.');
    expect(line).toContain('Tortie cannot answer it');
  });

  it('names the machine on the button rather than saying here', () => {
    expect(remoteCommitButton('Mac Pro')).toBe('Commit on Mac Pro');
  });
});

describe('the three sentences the check leaves', () => {
  it('says the commit ran when HEAD moved, and names both shas', () => {
    expect(remoteCommitCheckRan('Mac Pro', '7d1c40a', '2b9e5f1')).toBe(
      'That folder on Mac Pro is at 7d1c40a now and it was at 2b9e5f1 when ' +
        'Tortie asked, so the commit ran.'
    );
  });

  it('says it did not run when HEAD is where Tortie left it', () => {
    expect(remoteCommitCheckDidNot('Mac Pro', '2b9e5f1')).toBe(
      'That folder on Mac Pro is still at 2b9e5f1, so the commit did not run ' +
        'and nothing was committed.'
    );
  });

  it('names no empty sha for a repository that had no commit yet', () => {
    // A person can stage in a repository with no commit using the Phase 103
    // verbs and then commit, so this state is reachable. The first build of
    // this phase drew "is still at , so the commit did not run".
    expect(remoteCommitCheckDidNot('Mac Pro', '')).toBe(
      'That folder on Mac Pro still has no commit yet, so the commit did not ' +
        'run and nothing was committed.'
    );
    expect(remoteCommitCheckRan('Mac Pro', '7d1c40a', '')).toBe(
      'That folder on Mac Pro is at 7d1c40a now and it had none when Tortie ' +
        'asked, so the commit ran.'
    );
    for (const line of [
      remoteCommitCheckDidNot('Mac Pro', ''),
      remoteCommitCheckRan('Mac Pro', '7d1c40a', '')
    ]) {
      expect(line).not.toContain('at ,');
      expect(line).not.toContain('at .');
    }
  });

  it('says Tortie still cannot tell when the check itself got no answer', () => {
    const line = remoteCommitCheckNoAnswer('Mac Pro');
    expect(line).toBe(
      'Mac Pro did not answer, so Tortie cannot say whether the commit ran.'
    );
    // It never says nothing was committed, because nobody read that.
    expect(line).not.toContain('nothing was committed');
  });
});

describe('the sentence this phase rewrote', () => {
  // PHASE 228 TOOK THE BAND OFF. The other sentence this describe pinned,
  // `remoteChangesBand`, no longer exists; p903-c pins the deletion.
  it('no longer says staging is the only thing this view changes', () => {
    expect(REMOTE_SCM_SECTIONS_NOTE).toContain(
      'which files are staged and whether they are committed'
    );
    expect(REMOTE_SCM_SECTIONS_NOTE).not.toContain('The only thing this view');
  });
});

describe('the verb', () => {
  it('is available only when the bridge carries the member', () => {
    expect(remoteCommitAvailable()).toBe(true);
  });

  it('sends the folder, the sha, the staged list and the text, and no root', async () => {
    useRemoteChanges.getState().ensure(STUDIO);
    await flush();
    useRemoteChanges.getState().setMessage(STUDIO, 'a real message');
    await useRemoteChanges.getState().commit(STUDIO);
    expect(commit).toHaveBeenCalledWith({
      machineId: 'studio',
      cwd: '/home/greg/api',
      headSha: '2b9e5f1aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      // `src/ui.ts` is `.M`, which is unstaged, so it is not on this list.
      staged: ['src/auth.ts'],
      message: 'a real message'
    });
    const sent = commit.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(Object.keys(sent).sort()).toEqual([
      'cwd',
      'headSha',
      'machineId',
      'message',
      'staged'
    ]);
    expect(sent['repoPath']).toBeUndefined();
    expect(sent['root']).toBeUndefined();
  });

  it('sends nothing at all when the box is empty', async () => {
    useRemoteChanges.getState().ensure(STUDIO);
    await flush();
    useRemoteChanges.getState().setMessage(STUDIO, '   ');
    await useRemoteChanges.getState().commit(STUDIO);
    expect(commit).not.toHaveBeenCalled();
  });

  it('records main sentences as main sent them and composes none', async () => {
    useRemoteChanges.getState().ensure(STUDIO);
    await flush();
    useRemoteChanges.getState().setMessage(STUDIO, 'm');
    commit.mockResolvedValue(
      committed({
        outcome: 'failed',
        sha: '',
        machineSaid: 'pre-commit refused this one',
        sentences: ['The commit failed on Studio.']
      })
    );
    await useRemoteChanges.getState().commit(STUDIO);
    const entry = useRemoteChanges.getState().byTarget['studio:/home/greg/api'];
    expect(entry?.commitOutcome).toBe('failed');
    expect(entry?.commitSentences).toEqual(['The commit failed on Studio.']);
    expect(entry?.commitMachineSaid).toBe('pre-commit refused this one');
  });

  it('is the word unsure when the call rejects, and it throws nothing', async () => {
    useRemoteChanges.getState().ensure(STUDIO);
    await flush();
    useRemoteChanges.getState().setMessage(STUDIO, 'm');
    commit.mockRejectedValue(new Error('the link dropped'));
    await expect(
      useRemoteChanges.getState().commit(STUDIO)
    ).resolves.toBeUndefined();
    const entry = useRemoteChanges.getState().byTarget['studio:/home/greg/api'];
    expect(entry?.commitOutcome).toBe('unsure');
    expect(entry?.committing).toBe(false);
  });

  it('reads that folder again after every commit, good or bad', async () => {
    useRemoteChanges.getState().ensure(STUDIO);
    await flush();
    const readsBefore = reviewFiles.mock.calls.length;
    useRemoteChanges.getState().setMessage(STUDIO, 'm');
    await useRemoteChanges.getState().commit(STUDIO);
    expect(reviewFiles.mock.calls.length).toBe(readsBefore + 1);
  });

  it('holds the guard sha it sent, so the check has something to compare', async () => {
    useRemoteChanges.getState().ensure(STUDIO);
    await flush();
    useRemoteChanges.getState().setMessage(STUDIO, 'm');
    await useRemoteChanges.getState().commit(STUDIO);
    const entry = useRemoteChanges.getState().byTarget['studio:/home/greg/api'];
    expect(entry?.commitGuardSha).toBe(
      '2b9e5f1aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
    );
  });
});

describe('the message', () => {
  it('is cleared when that machine committed', async () => {
    useRemoteChanges.getState().ensure(STUDIO);
    await flush();
    useRemoteChanges.getState().setMessage(STUDIO, 'a real message');
    await useRemoteChanges.getState().commit(STUDIO);
    expect(
      useRemoteChanges.getState().messages['studio:/home/greg/api']
    ).toBe('');
  });

  it('is kept on every other answer, so nobody has to type it twice', async () => {
    useRemoteChanges.getState().ensure(STUDIO);
    await flush();
    useRemoteChanges.getState().setMessage(STUDIO, 'a real message');
    commit.mockResolvedValue(
      committed({ outcome: 'moved', sha: '', sentences: ['Something else.'] })
    );
    await useRemoteChanges.getState().commit(STUDIO);
    expect(
      useRemoteChanges.getState().messages['studio:/home/greg/api']
    ).toBe('a real message');
  });

  it('is keyed by the pair, so two machines at one path hold two drafts', () => {
    useRemoteChanges.getState().setMessage(STUDIO, 'for the studio');
    useRemoteChanges.getState().setMessage(ATTIC, 'for the attic');
    const held = useRemoteChanges.getState().messages;
    expect(held['studio:/home/greg/api']).toBe('for the studio');
    expect(held['attic:/home/greg/api']).toBe('for the attic');
  });

  it('goes when the tab is forgotten', () => {
    useRemoteChanges.getState().setMessage(STUDIO, 'for the studio');
    useRemoteChanges.getState().forget(STUDIO);
    expect(
      useRemoteChanges.getState().messages['studio:/home/greg/api']
    ).toBeUndefined();
  });
});

describe('the check', () => {
  it('says the commit ran when HEAD moved off the guard sha', async () => {
    useRemoteChanges.getState().ensure(STUDIO);
    await flush();
    useRemoteChanges.getState().setMessage(STUDIO, 'm');
    // The commit answers, and the re-read after it reports the new sha.
    reviewFiles.mockResolvedValue(
      answer({ headSha: '7d1c40a0000000000000000000000000000000000' })
    );
    commit.mockResolvedValue(
      committed({ outcome: 'unsure', sha: '', sentences: ['Tortie asked.'] })
    );
    await useRemoteChanges.getState().commit(STUDIO);
    await useRemoteChanges.getState().checkCommit(STUDIO);
    const entry = useRemoteChanges.getState().byTarget['studio:/home/greg/api'];
    expect(entry?.checkOutcome).toBe('ran');
    expect(entry?.checkHeadSha).toBe(
      '7d1c40a0000000000000000000000000000000000'
    );
  });

  it('says it did not run when HEAD is still the guard sha', async () => {
    useRemoteChanges.getState().ensure(STUDIO);
    await flush();
    useRemoteChanges.getState().setMessage(STUDIO, 'm');
    commit.mockResolvedValue(
      committed({ outcome: 'timeout', sha: '', sentences: ['It did not.'] })
    );
    await useRemoteChanges.getState().commit(STUDIO);
    await useRemoteChanges.getState().checkCommit(STUDIO);
    const entry = useRemoteChanges.getState().byTarget['studio:/home/greg/api'];
    expect(entry?.checkOutcome).toBe('didNot');
  });

  it('says nobody answered when the read itself did not land', async () => {
    useRemoteChanges.getState().ensure(STUDIO);
    await flush();
    useRemoteChanges.getState().setMessage(STUDIO, 'm');
    commit.mockResolvedValue(
      committed({ outcome: 'unsure', sha: '', sentences: ['Tortie asked.'] })
    );
    await useRemoteChanges.getState().commit(STUDIO);
    reviewFiles.mockRejectedValue(new Error('the link dropped'));
    await useRemoteChanges.getState().checkCommit(STUDIO);
    const entry = useRemoteChanges.getState().byTarget['studio:/home/greg/api'];
    expect(entry?.checkOutcome).toBe('noAnswer');
  });
});

describe("the sha main reads out of that machine's own porcelain", () => {
  it('reaches the store, and an unborn branch is the empty string', async () => {
    reviewFiles.mockResolvedValue(answer({ headSha: '' }));
    useRemoteChanges.getState().ensure(STUDIO);
    await flush();
    const entry = useRemoteChanges.getState().byTarget['studio:/home/greg/api'];
    expect(entry?.headSha).toBe('');
  });
});
