/**
 * PHASE 119 — decline capture on restore, the insurance verb (renderer half).
 *
 * Two things are pinned here, and both of them are things a person reads or
 * a person sees.
 *
 * The first is WHEN the verb is offered. One predicate answers that for both
 * surfaces, being the ended card and the native session context menu, so a
 * drifted second answer cannot put the button on a row that has nothing to
 * decline. The three facts are in the predicate's own comment and each one is
 * held below on its own.
 *
 * The second is WHAT IT SAYS. The choice is durable and Tortie offers no way to
 * turn saving back on for that session, so the confirm has to say that before
 * the button, not after it. These tests hold the promises rather than the
 * prose: they assert that the sentence about the armed command matches the row
 * it is shown for, that the one-way nature is stated, and that nothing claims
 * the already saved history is touched.
 */

import { describe, expect, it } from 'vitest';
import type { Session } from '@shared/types';
import {
  BARE_RECOVERY_NOTE,
  BARE_RESTART_LABEL,
  BARE_RESTART_SUBLABEL,
  BARE_RESTORE_LABEL,
  BARE_RESTORE_SUBLABEL,
  bareRestartConfirm,
  bareRestoreConfirm,
  offersBareRecovery
} from '../../state/resume';

function session(over: Partial<Session> = {}): Session {
  return {
    id: 'sid',
    name: 'auth',
    tmuxName: 'auth',
    projectPath: '/repo',
    cwd: '/repo',
    agent: 'claude',
    status: 'exited',
    createdAt: 0,
    capture: {
      provider: 'claude',
      bin: '/Applications/Tortie.app/Contents/Resources/bin/specstory',
      exitCodeApproximate: true
    },
    ...over
  };
}

const everyCopy = [
  BARE_RECOVERY_NOTE,
  BARE_RESTORE_LABEL,
  BARE_RESTORE_SUBLABEL,
  BARE_RESTART_LABEL,
  BARE_RESTART_SUBLABEL,
  bareRestoreConfirm(session()).title,
  bareRestoreConfirm(session()).body,
  bareRestoreConfirm(session({ resumeArgv: ['claude', '-r', 'u'] })).body,
  bareRestartConfirm(session()).title,
  bareRestartConfirm(session()).body
];

describe('offersBareRecovery', () => {
  it('offers the verb for an ended captured session on this Mac', () => {
    expect(offersBareRecovery(session({ status: 'exited' }))).toBe(true);
    expect(offersBareRecovery(session({ status: 'restorable' }))).toBe(true);
  });

  it('offers nothing for a session that is not captured', () => {
    // There is no wrapper to decline, so the verb would be a second Restore
    // wearing a longer label.
    const bare = session();
    delete bare.capture;
    expect(offersBareRecovery(bare)).toBe(false);
  });

  it('offers nothing while the session is still running', () => {
    for (const status of ['running', 'idle', 'needs_input'] as const) {
      expect(offersBareRecovery(session({ status }))).toBe(false);
    }
  });

  it('offers nothing for a session on another machine', () => {
    // Phase 91 refuses capture on a machine, so such a row never carries a
    // capture at all. The predicate holds even for a row that somehow does.
    expect(
      offersBareRecovery(
        session({
          machine: {
            id: 'm1',
            label: 'studio',
            color: 'blue',
            answering: true,
            canRestore: true,
            restoreReason: null
          }
        })
      )
    ).toBe(false);
  });

  it('stops offering the verb the moment the choice has been made', () => {
    // Main clears the row's capture record and the projection drops the field,
    // so the disappearance of the button IS the feedback that the choice took.
    // Nothing extra is remembered in the renderer to produce it.
    const before = session({ status: 'exited' });
    const after = session({ status: 'exited' });
    delete after.capture;
    expect(offersBareRecovery(before)).toBe(true);
    expect(offersBareRecovery(after)).toBe(false);
  });
});

describe('the words on screen', () => {
  it('never says wrapper, binary or capture plane', () => {
    // The verb names the outcome a person cares about. The mechanism behind it
    // is Tortie's problem and it stays out of the copy.
    for (const line of everyCopy) {
      expect(line.toLowerCase()).not.toContain('wrapper');
      expect(line.toLowerCase()).not.toContain('binary');
      expect(line.toLowerCase()).not.toContain('capture');
      expect(line.toLowerCase()).not.toContain('argv');
    }
  });

  it('carries no em dash and no en dash', () => {
    for (const line of everyCopy) {
      expect(line).not.toContain('—');
      expect(line).not.toContain('–');
    }
  });

  it('never says that anything is broken', () => {
    // Phase 115 healed the wrapper and it works today. This verb is insurance
    // against the next one, and no string may imply an emergency that is not
    // happening.
    for (const line of everyCopy) {
      const lower = line.toLowerCase();
      expect(lower).not.toContain('broken');
      expect(lower).not.toContain('failed');
      expect(lower).not.toContain('error');
    }
  });

  it('gives both surfaces one label per verb', () => {
    expect(BARE_RESTORE_LABEL).toBe('Restore without saving history');
    expect(BARE_RESTART_LABEL).toBe('Restart without saving history');
  });

  it('says what stops and what still happens in the note', () => {
    expect(BARE_RECOVERY_NOTE).toContain('SpecStory');
    expect(BARE_RECOVERY_NOTE).toContain('The conversation still comes back');
    expect(BARE_RECOVERY_NOTE).toContain('stops saving');
  });

  it('spends the menu sublabels on the two answers a row cannot show', () => {
    // A native menu carries no tooltip, so this line is the only prose the
    // menu has.
    expect(BARE_RESTORE_SUBLABEL).toContain('The conversation comes back');
    expect(BARE_RESTORE_SUBLABEL).toContain('stops saving');
    expect(BARE_RESTART_SUBLABEL).toContain('same name and directory');
    expect(BARE_RESTART_SUBLABEL).toContain('no saving');
  });
});

describe('bareRestoreConfirm', () => {
  it('names the session in the question', () => {
    expect(bareRestoreConfirm(session({ name: 'auth' })).title).toBe(
      "Restore 'auth' without saving history?"
    );
    expect(bareRestoreConfirm(session()).confirmLabel).toBe('Restore');
  });

  it('promises the armed command only for a row that has one', () => {
    const armed = bareRestoreConfirm(
      session({ resumeArgv: ['claude', '-r', 'u'] })
    ).body;
    expect(armed).toContain('you press Enter to run it');
    expect(armed).not.toContain('nothing is armed');
  });

  it('says nothing is armed, in its own sentence, when nothing is', () => {
    // The answer that can be cut gets its own sentence and its own branch,
    // rather than a hedge inside the sentence about something else.
    const unarmed = bareRestoreConfirm(session()).body;
    expect(unarmed).toContain(
      'This session has no recorded command to continue its conversation, ' +
        'so nothing is armed for you to press Enter on.'
    );
    expect(unarmed).not.toContain('you press Enter to run it');
  });

  it('states the one-way nature before the button, on both branches', () => {
    for (const body of [
      bareRestoreConfirm(session()).body,
      bareRestoreConfirm(session({ resumeArgv: ['claude', '-r', 'u'] })).body
    ]) {
      expect(body).toContain(
        'Tortie does not offer a way to turn saving back on for this session.'
      );
      expect(body).toContain('The history it already saved stays where it is.');
    }
  });
});

describe('bareRestartConfirm', () => {
  it('names the session and keeps the Restart verb', () => {
    expect(bareRestartConfirm(session({ name: 'auth' })).title).toBe(
      "Restart 'auth' without saving history?"
    );
    expect(bareRestartConfirm(session()).confirmLabel).toBe('Restart');
  });

  it('repeats what Restart always does rather than hiding it', () => {
    const body = bareRestartConfirm(session()).body;
    expect(body).toContain('The conversation does not come back');
    expect(body).toContain('same name, the same directory');
    expect(body).toContain('The history it already saved stays where it is.');
  });

  it('promises no armed command, because a restart never has one', () => {
    expect(bareRestartConfirm(session()).body).not.toContain('press Enter');
  });
});
