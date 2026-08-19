/**
 * What a person is told when a session came back on another machine and its
 * resume command did not land once (Phase 89).
 *
 * ## The thing under test
 *
 * Phase 89 gave a remote restore the local restore's shape. The session comes
 * back running that machine's own shell, Tortie types the command that
 * continues the conversation into it, and Tortie stops there. It never presses
 * Enter. It then reads that session's screen and counts the copies of the text
 * it sent. `resumeLanding` is what that count said, and it has four values:
 *
 *  - `armed`: one copy. The command is waiting on the screen.
 *  - `twice`: two copies. Pressing Enter would run something nobody composed.
 *  - `absent`: Tortie read the screen and the text is not on it.
 *  - `unknown`: Tortie could not read the screen at all.
 *
 * `reportRemoteResume` in `../core.ts` turns the last three into one notice and
 * the first into silence. That rule is what this file drives.
 *
 * ## Why silence on `armed` is the interesting half
 *
 * A notice exists only when a layer is degraded, which is ZEN-OF-TORTIE's rule
 * and Phase 19's own brief. A command that landed exactly once is sitting on the
 * screen of that session where the person can read it, so nothing is degraded
 * and a toast there would be a dashboard line. The local restore is silent in
 * exactly the same case, and the two paths must not disagree about it.
 *
 * ## How it is driven
 *
 * The real method is taken off `GmuxCore.prototype` and called, which is the
 * pattern `./remote-lifecycle.test.ts` set for the same reason: booting a core
 * needs a tmux server, an attach host and a control client, so a functional boot
 * here would prove the mocks rather than the method. The body touches no field
 * of the core, so it is called against an empty object.
 *
 * THE NOTICE MODULE IS REAL, not a spy. No renderer is listening in a test, so
 * `postDurabilityNotice` queues, and `takePendingNotices` is what reads back
 * exactly what a renderer would have been handed. Mocking it would prove the
 * mock and would also hide the latch, which is a rule this notice has to live
 * under.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import type { Session } from '@shared/types';
import type { DurabilityNotice } from '@shared/notice';

const { GmuxCore } = await import('../core');
const { resetDurabilityNoticesForTests, takePendingNotices } = await import(
  '../../notice'
);
import type { RemoteRestoreOutcome } from '../../machines/remote-restore';

/** The real body, borrowed. No subclass, no cast of the whole class. */
const reportRemoteResume = (
  GmuxCore.prototype as unknown as {
    reportRemoteResume: (this: unknown, outcome: RemoteRestoreOutcome) => void;
  }
).reportRemoteResume;

/**
 * One restore outcome, with only the fields this method reads set honestly and
 * the rest filled with the shape a real outcome carries.
 */
function outcome(
  over: Partial<RemoteRestoreOutcome> & { name?: string }
): RemoteRestoreOutcome {
  const { name = 'the remote one', ...rest } = over;
  return {
    session: { id: 'sess-1', name } as Session,
    tmuxId: '$7',
    stampsLanded: 4,
    serverWasBorn: false,
    savedOutputAt: null,
    resumeArmed: false,
    resumeCommand: null,
    resumeLanding: null,
    resumeRefusal: null,
    resumeNote: null,
    replayNote: null,
    ...rest
  };
}

/** Everything a renderer would have been handed, in order. */
function said(): DurabilityNotice[] {
  return takePendingNotices();
}

beforeEach(() => {
  resetDurabilityNoticesForTests();
});

describe('the three landings a person has to hear about', () => {
  it('says two copies were typed, so the line can be cleared first', () => {
    reportRemoteResume(
      outcome({ name: 'api', resumeLanding: 'twice', resumeCommand: 'x' })
    );
    expect(said()).toEqual([
      { kind: 'remote-resume', sessionName: 'api', landing: 'twice' }
    ]);
  });

  it('says the command is not on the screen when it read the screen', () => {
    reportRemoteResume(
      outcome({ name: 'api', resumeLanding: 'absent', resumeCommand: 'x' })
    );
    expect(said()).toEqual([
      { kind: 'remote-resume', sessionName: 'api', landing: 'absent' }
    ]);
  });

  /**
   * "Could not look" is a different fact from "it is not there". Telling a
   * person their conversation is gone when Tortie could not read the screen is
   * a claim about their work that Tortie has no evidence for.
   */
  it('says it could not read the screen rather than guessing what is on it', () => {
    reportRemoteResume(
      outcome({ name: 'api', resumeLanding: 'unknown', resumeCommand: 'x' })
    );
    expect(said()).toEqual([
      { kind: 'remote-resume', sessionName: 'api', landing: 'unknown' }
    ]);
  });
});

describe('the two cases that say nothing at all', () => {
  /**
   * The good answer. The command is on the screen of that session and the
   * person presses Enter. Nothing is degraded, so nothing is said, which is
   * what the local restore already does.
   */
  it('says nothing when the command landed exactly once', () => {
    reportRemoteResume(
      outcome({
        name: 'api',
        resumeLanding: 'armed',
        resumeArmed: true,
        resumeCommand: '/usr/local/bin/claude --resume abc'
      })
    );
    expect(said()).toEqual([]);
  });

  /**
   * A row the arming gate refused never had a send. Its `resumeLanding` is
   * null, and the refusal already carries its own sentence on the outcome for
   * the surface that asked for the restore. A toast here would be the second
   * time the same fact was said.
   */
  it('says nothing for a row the arming gate refused', () => {
    reportRemoteResume(
      outcome({
        name: 'api',
        resumeLanding: null,
        resumeRefusal: 'not-collected',
        resumeNote: 'Tortie has no conversation id for this session.'
      })
    );
    expect(said()).toEqual([]);
  });

  /** A shell. It never had a conversation, so it never had a landing. */
  it('says nothing for a session whose agent keeps no conversation', () => {
    reportRemoteResume(
      outcome({ name: 'a shell', resumeRefusal: 'nothing-to-arm' })
    );
    expect(said()).toEqual([]);
  });
});

describe('the latch, which is the ordinary one', () => {
  /**
   * ONCE PER APP RUN. A restore of every session on a machine that has gone
   * strange must not put nine toasts on the screen. The per session detail is
   * in the log line `../../machines/remote-restore.ts` writes for every arm,
   * which is where a person looking for the second one finds it.
   */
  it('speaks once, however many sessions land the same way', () => {
    reportRemoteResume(outcome({ name: 'api', resumeLanding: 'twice' }));
    reportRemoteResume(outcome({ name: 'web', resumeLanding: 'twice' }));
    reportRemoteResume(outcome({ name: 'docs', resumeLanding: 'absent' }));
    expect(said()).toEqual([
      { kind: 'remote-resume', sessionName: 'api', landing: 'twice' }
    ]);
  });
});
