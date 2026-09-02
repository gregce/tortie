/**
 * What one read at the end of a remote create is allowed to prove (Phase 117).
 *
 * NOTHING HERE RUNS A COMMAND, because the module under test runs none. It is
 * the pure table, and the file is written the way `./restore-gate.test.ts` is:
 * one test per row of the table, then the invariants no row may break.
 *
 * The property the whole file exists for is the default. Before this phase every
 * failed read produced the same answer and that answer deleted a durable row.
 * After it, only the two rows where tmux itself answered can delete anything.
 */

import { describe, expect, it } from 'vitest';
import { GmuxError } from '../../errors';
import {
  CONFIRMATION_KINDS,
  classifyConfirmationFailure,
  confirmationArgs,
  confirmationDisposition,
  confirmationWhy,
  readConfirmationEnvironment,
  type RemoteCreateConfirmation
} from '../create-confirmation';

const OURS = '0d1f6f2e-70a1-4a1c-9f2f-5c0b1a2d3e4f';
const STRANGER = 'ffffffff-70a1-4a1c-9f2f-5c0b1a2d3e4f';

// ---------------------------------------------------------------------------
// The line that is sent
// ---------------------------------------------------------------------------

describe('the read the confirmation sends', () => {
  /**
   * THE MEASUREMENT THIS MAKES EXECUTABLE. Naming the variable makes tmux exit 1
   * for the ordinary case, the exec plane turns a non zero exit into a thrown
   * error, and an error cannot be told apart from a machine that did not answer.
   * MEASURED on tmux 3.6a, 2026-08-17, and recorded in `../pane-env-rescue.ts`.
   */
  it('never names the variable on the line', () => {
    expect(confirmationArgs('work')).toEqual([
      'show-environment',
      '-t',
      '=work'
    ]);
    expect(confirmationArgs('work')).not.toContain('GMUX_SESSION_ID');
  });

  it('asks for an exact name match rather than a prefix', () => {
    expect(confirmationArgs('work')[2]).toBe('=work');
  });
});

// ---------------------------------------------------------------------------
// An answer that came back
// ---------------------------------------------------------------------------

describe('an answer that came back', () => {
  it('is present when one line carries this create’s own id', () => {
    const printed = `PATH=/usr/bin\nGMUX_SESSION_ID=${OURS}\nSHELL=/bin/zsh\n`;
    expect(readConfirmationEnvironment(printed, OURS)).toBe('present');
  });

  /**
   * A session of the same name carrying somebody else's id is absent FOR THIS
   * CREATE. The question is never "is a session called this there".
   */
  it('is provenAbsent when the id belongs to somebody else', () => {
    expect(
      readConfirmationEnvironment(`GMUX_SESSION_ID=${STRANGER}\n`, OURS)
    ).toBe('provenAbsent');
  });

  it('is provenAbsent when no line names the variable at all', () => {
    expect(readConfirmationEnvironment('PATH=/usr/bin\nHOME=/home/a\n', OURS)).toBe(
      'provenAbsent'
    );
  });

  it('is provenAbsent when tmux printed the variable as unset', () => {
    expect(readConfirmationEnvironment('-GMUX_SESSION_ID\n', OURS)).toBe(
      'provenAbsent'
    );
  });

  it('is provenAbsent for an empty answer and for an empty id', () => {
    expect(readConfirmationEnvironment('', OURS)).toBe('provenAbsent');
    expect(readConfirmationEnvironment(`GMUX_SESSION_ID=\n`, '')).toBe(
      'provenAbsent'
    );
  });

  /** A prefix of the id is not the id. */
  it('refuses a value that only starts with this create’s id', () => {
    expect(
      readConfirmationEnvironment(`GMUX_SESSION_ID=${OURS}-second\n`, OURS)
    ).toBe('provenAbsent');
  });
});

// ---------------------------------------------------------------------------
// A read that threw, which is the whole of the fix
// ---------------------------------------------------------------------------

describe('a read that threw', () => {
  it('reads tmux’s own no server sentence as a completed answer of none', () => {
    const err = new GmuxError(
      'TMUX_UNREACHABLE',
      'The Tortie session server is not running.',
      'no server running on /tmp/tortie/gmux'
    );
    expect(classifyConfirmationFailure(err)).toBe('provenAbsent');
  });

  it('reads tmux naming the session as missing as a completed answer', () => {
    const err = new GmuxError(
      'SESSION_NOT_FOUND',
      'Session not found.',
      "can't find session: work"
    );
    expect(classifyConfirmationFailure(err)).toBe('provenAbsent');
  });

  /**
   * PHASE 117 FIX ROUND. MEASURED 2026-08-20 on tmux 3.6a from
   * /opt/homebrew/bin/tmux, on a scratch socket holding one real session:
   *
   *   show-environment -t '=p117-absent-1'   exit 1, "no such session: =p117-absent-1"
   *
   * That is the sentence THIS verb prints, and it was in neither of the two the
   * table used to name. Without it a machine that answered and named the session
   * as missing was classified unreachable, its row was kept for ever, and the
   * negative case this phase needs could not happen.
   */
  it('reads tmux’s own no such session sentence as a completed answer', () => {
    expect(
      classifyConfirmationFailure(new Error('no such session: =p117-absent-1'))
    ).toBe('provenAbsent');
    expect(
      classifyConfirmationFailure(
        new GmuxError('UNKNOWN', 'tmux failed', 'no such session: work')
      )
    ).toBe('provenAbsent');
  });

  it('reads that sentence off the detail even under another code', () => {
    const err = new GmuxError(
      'UNKNOWN',
      'tmux failed',
      'popos: session not found'
    );
    expect(classifyConfirmationFailure(err)).toBe('provenAbsent');
  });

  it('reads a machine that could not be reached as unreachable', () => {
    const err = new GmuxError(
      'TMUX_UNREACHABLE',
      'Tortie could not reach popos.',
      'unreachable: ssh: connect to host popos port 22: Host is down'
    );
    expect(classifyConfirmationFailure(err)).toBe('unreachable');
  });

  it('reads a machine that refused the caller as unreachable', () => {
    for (const detail of [
      'host-key-changed: REMOTE HOST IDENTIFICATION HAS CHANGED',
      'auth-refused: Permission denied (publickey)'
    ]) {
      const err = new GmuxError('INVALID_INPUT', 'Tortie could not reach popos.', detail);
      expect(classifyConfirmationFailure(err)).toBe('unreachable');
    }
  });

  it('reads a Mac with no sign in program as unreachable', () => {
    const err = new GmuxError(
      'TMUX_NOT_FOUND',
      'This Mac has no sign in program where Tortie expected one.',
      '/usr/bin/ssh was there when Tortie started and it is gone now'
    );
    expect(classifyConfirmationFailure(err)).toBe('unreachable');
  });

  it('reads a timeout, which says nothing at all, as unreachable', () => {
    const err = new GmuxError('UNKNOWN', 'tmux show-environment failed', '');
    expect(classifyConfirmationFailure(err)).toBe('unreachable');
  });

  /**
   * THE ARM THE OLD BROAD CATCH GOT WRONG. Every one of these used to produce
   * the same answer as a proven absence, and that answer deleted the durable row
   * of a session that was running on the other machine.
   */
  it('reads anything nobody can classify as unreachable', () => {
    for (const err of [
      new Error('socket hang up'),
      new Error('the child was killed'),
      'a string nobody threw on purpose',
      null,
      undefined
    ]) {
      expect(classifyConfirmationFailure(err)).toBe('unreachable');
    }
  });
});

// ---------------------------------------------------------------------------
// One row, one action
// ---------------------------------------------------------------------------

describe('what the caller does with each kind', () => {
  const present: RemoteCreateConfirmation = { kind: 'present', tmuxId: '$4' };
  const absent: RemoteCreateConfirmation = {
    kind: 'provenAbsent',
    why: 'the machine answered and holds no session called work'
  };
  const unreachable: RemoteCreateConfirmation = {
    kind: 'unreachable',
    why: 'the machine did not answer'
  };

  it('binds a present confirmation and nothing else', () => {
    expect(confirmationDisposition(present)).toBe('bind');
    expect(confirmationDisposition(absent)).not.toBe('bind');
    expect(confirmationDisposition(unreachable)).not.toBe('bind');
  });

  it('drops the row only for a proven absence', () => {
    expect(confirmationDisposition(absent)).toBe('dropRow');
    expect(confirmationDisposition(present)).not.toBe('dropRow');
    expect(confirmationDisposition(unreachable)).not.toBe('dropRow');
  });

  it('keeps the row and marks it unknown when nothing was proved', () => {
    expect(confirmationDisposition(unreachable)).toBe('keepUnknown');
  });

  it('carries a reason for every kind, for the log and the refusal detail', () => {
    expect(confirmationWhy(present)).toContain('$4');
    expect(confirmationWhy(absent)).toBe(absent.why);
    expect(confirmationWhy(unreachable)).toBe(unreachable.why);
  });

  /** The declared list and the table are one set, in the order they are read. */
  it('declares three kinds and no more', () => {
    expect([...CONFIRMATION_KINDS]).toEqual([
      'present',
      'provenAbsent',
      'unreachable'
    ]);
    expect(
      CONFIRMATION_KINDS.map((kind) =>
        confirmationDisposition(
          kind === 'present'
            ? { kind, tmuxId: '$4' }
            : { kind, why: 'a reason' }
        )
      )
    ).toEqual(['bind', 'dropRow', 'keepUnknown']);
  });
});

// ---------------------------------------------------------------------------
// Phase 200. A completed answer stays completed across a loader boundary
// ---------------------------------------------------------------------------
//
// `classifyConfirmationFailure` used to ask `err instanceof GmuxError` before it
// read the code or the detail. That question is about constructor identity, and
// a value built by a second copy of `../../errors` answers no to it while
// carrying exactly the payload this product wrote. The 0.98.0 audit met that
// under the `.mts` probe runtime: the one sentence that may delete a durable row
// read as an answer nobody could read. The rows below carry the payload without
// the class, and the malformed ones prove the reader fails closed.
describe('Phase 200: the payload is read by shape', () => {
  const withPayload = (payload: unknown): unknown =>
    Object.assign(new Error('a message that names nothing'), { payload });

  it('reads a completed no server answer that carries no class', () => {
    expect(
      classifyConfirmationFailure(
        withPayload({
          code: 'TMUX_UNREACHABLE',
          message: 'no answer',
          detail: 'no server running on /tmp/x'
        })
      )
    ).toBe('provenAbsent');
  });

  it('reads a session named as missing that carries no class', () => {
    expect(
      classifyConfirmationFailure(
        withPayload({ code: 'SESSION_NOT_FOUND', message: 'gone' })
      )
    ).toBe('provenAbsent');
  });

  it('keeps the row for an unreachable machine that carries no class', () => {
    expect(
      classifyConfirmationFailure(
        withPayload({
          code: 'TMUX_UNREACHABLE',
          message: 'no answer',
          detail: 'connection refused'
        })
      )
    ).toBe('unreachable');
  });

  // The safety default, which is the whole point of the file. A payload that is
  // not exactly the shape this release writes is refused whole, and the row is
  // kept, even when the sentence inside it would otherwise have proved a death.
  it('keeps the row for every malformed payload', () => {
    const malformed: unknown[] = [
      'no server running on /tmp/x',
      ['TMUX_UNREACHABLE', 'no server running on /tmp/x'],
      null,
      { code: 7, message: 'x', detail: 'no server running on /tmp/x' },
      {
        code: 'TMUX_HOLDS_NOTHING',
        message: 'x',
        detail: 'no server running on /tmp/x'
      },
      { code: 'TMUX_UNREACHABLE', detail: 'no server running on /tmp/x' },
      {
        code: 'TMUX_UNREACHABLE',
        message: 'x',
        detail: { text: 'no server running on /tmp/x' }
      }
    ];
    for (const payload of malformed) {
      expect(classifyConfirmationFailure(withPayload(payload))).toBe('unreachable');
    }
  });
});
