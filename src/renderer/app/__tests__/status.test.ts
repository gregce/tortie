/**
 * How a session's END is described (Phase 12.7 F2).
 *
 * The incident that produced these rules: a durable claude session was
 * killed from outside with `kill -TERM`; claude traps SIGTERM and exits 143
 * itself, so gmux showed "Session ended unexpectedly (exit 143)" and the
 * user had to know that 143 = 128+15 to learn what had happened. Any agent
 * that does NOT self-map dies with no exit code at all, and the UI said
 * nothing whatsoever.
 */

import { describe, expect, it } from 'vitest';
import {
  diedRightAfterStart,
  endedBadly,
  endedTitle,
  endSignalName,
  exitDetailNote,
  FAST_DEATH_MS,
  fastDeathSentence,
  fastDeathTitle,
  machineUnreachable,
  rollupDot,
  statusVisual
} from '../status';

describe('endSignalName', () => {
  it('reads tmux pane_dead_signal, normalizing case and the SIG prefix', () => {
    expect(endSignalName({ exitSignal: 'term' })).toBe('TERM');
    expect(endSignalName({ exitSignal: 'SIGKILL' })).toBe('KILL');
  });

  it('decodes the 128+n exit code a self-mapping agent reports', () => {
    expect(endSignalName({ exitCode: 143 })).toBe('TERM');
    expect(endSignalName({ exitCode: 129 })).toBe('HUP');
    expect(endSignalName({ exitCode: 130 })).toBe('INT');
  });

  it('leaves ordinary exit codes alone', () => {
    expect(endSignalName({ exitCode: 0 })).toBeNull();
    expect(endSignalName({ exitCode: 1 })).toBeNull();
    expect(endSignalName({ exitCode: 127 })).toBeNull();
    expect(endSignalName({ exitCode: 128 })).toBeNull();
    expect(endSignalName({ exitCode: 200 })).toBeNull();
    expect(endSignalName(undefined)).toBeNull();
  });
});

describe('endedTitle', () => {
  it('names the signal instead of printing 143', () => {
    expect(endedTitle({ exitCode: 143 })).toBe(
      'Session terminated by SIGTERM (external)'
    );
    expect(endedTitle({ exitSignal: 'term' })).toBe(
      'Session terminated by SIGTERM (external)'
    );
  });

  it('does not blame the outside world for a keyboard signal', () => {
    expect(endedTitle({ exitCode: 130 })).toBe('Session terminated by SIGINT');
  });

  it('keeps the exit code for a real non-zero exit', () => {
    expect(endedTitle({ exitCode: 127 })).toBe(
      'Session ended unexpectedly (exit 127)'
    );
  });

  it('stays quiet for a clean end', () => {
    expect(endedTitle({ exitCode: 0 })).toBe('Session ended');
    expect(endedTitle(undefined)).toBe('Session ended');
  });

  it('drops the number when a capture wrapper collapsed it', () => {
    // A captured codex exiting 7 reaches gmux as 1 (research 13 §4.2), so the
    // banner must not state that 1 as the agent's own status.
    expect(
      endedTitle({ exitCode: 1, capture: { exitCodeApproximate: true } })
    ).toBe('Session ended unexpectedly');
    // The signal half is still exact — tmux reaped the process it names.
    expect(
      endedTitle({ exitSignal: 'term', capture: { exitCodeApproximate: true } })
    ).toBe('Session terminated by SIGTERM (external)');
    // An EXACT capture provider (claude) keeps the number.
    expect(
      endedTitle({ exitCode: 7, capture: { exitCodeApproximate: false } })
    ).toBe('Session ended unexpectedly (exit 7)');
  });
});

describe('statusVisual', () => {
  it('shows a signal death as failed, not as a clean "ended"', () => {
    // The regression this exists to prevent: exitSignal with NO exitCode.
    expect(endedBadly({ exitSignal: 'term' })).toBe(true);
    expect(statusVisual('exited', { exitSignal: 'term' })).toEqual({
      dot: 'failed',
      label: 'killed (SIGTERM)'
    });
  });

  it('still reports a plain failed exit by number', () => {
    expect(statusVisual('exited', { exitCode: 1 })).toEqual({
      dot: 'failed',
      label: 'failed (exit 1)'
    });
  });

  it('says only "failed" when the capture wrapper collapsed the code', () => {
    expect(
      statusVisual('exited', { exitCode: 1, capture: { exitCodeApproximate: true } })
    ).toEqual({ dot: 'failed', label: 'failed' });
  });

  it('leaves a clean exit quiet', () => {
    expect(statusVisual('exited', { exitCode: 0 })).toEqual({
      dot: 'ended',
      label: 'ended'
    });
    expect(statusVisual('exited')).toEqual({ dot: 'ended', label: 'ended' });
  });

  it('is unchanged for live sessions', () => {
    expect(statusVisual('running').dot).toBe('working');
    expect(statusVisual('needs_input').label).toBe('needs input');
    expect(statusVisual('restorable').label).toBe('saved');
  });
});

// ---------------------------------------------------------------------------
// Phase 67 — unreachable is not dead
// ---------------------------------------------------------------------------

describe('the unknown status (Phase 67)', () => {
  it('reads "unreachable" on the hollow dot, with no new color', () => {
    expect(statusVisual('unknown')).toEqual({
      dot: 'ended',
      label: 'unreachable'
    });
  });

  it('machineUnreachable is true as soon as one row reads unknown', () => {
    expect(
      machineUnreachable([{ status: 'running' }, { status: 'unknown' }])
    ).toBe(true);
    expect(machineUnreachable([{ status: 'unknown' }])).toBe(true);
  });

  it('machineUnreachable is false for any list with no unknown row', () => {
    expect(machineUnreachable([])).toBe(false);
    expect(
      machineUnreachable([
        { status: 'running' },
        { status: 'restorable' },
        { status: 'exited' },
        { status: 'needs_input' },
        { status: 'idle' },
        { status: 'discarded' }
      ])
    ).toBe(false);
  });

  it('rollupDot still excludes unknown, so no tab lights up for it', () => {
    expect(rollupDot(['unknown'])).toBe('none');
    expect(rollupDot(['unknown', 'unknown'])).toBe('none');
    expect(rollupDot(['unknown', 'running'])).toBe('working');
    expect(rollupDot(['unknown', 'needs_input'])).toBe('attention');
    expect(rollupDot(['unknown', 'idle'])).toBe('idle');
  });
});

// ---------------------------------------------------------------------------
// Phase 48 — a session that started and then stopped at once
// ---------------------------------------------------------------------------

describe('diedRightAfterStart', () => {
  const createdAt = 1_700_000_000_000;

  it('is true at 4999 ms and false at 5001 ms', () => {
    expect(
      diedRightAfterStart({ createdAt, endedAt: createdAt + 4999 })
    ).toBe(true);
    expect(
      diedRightAfterStart({ createdAt, endedAt: createdAt + 5001 })
    ).toBe(false);
  });

  it('is true exactly on the bound', () => {
    expect(
      diedRightAfterStart({ createdAt, endedAt: createdAt + FAST_DEATH_MS })
    ).toBe(true);
  });

  it('claims nothing for a session this window did not watch start', () => {
    expect(diedRightAfterStart({ createdAt })).toBe(false);
  });

  it('claims nothing when the clock ran backwards', () => {
    expect(
      diedRightAfterStart({ createdAt, endedAt: createdAt - 1 })
    ).toBe(false);
  });
});

describe('the state D copy', () => {
  it('names the agent in the heading', () => {
    expect(fastDeathTitle('claude')).toBe(
      'claude stopped right after it started'
    );
  });

  it('states the bound and then the exit code', () => {
    expect(fastDeathSentence({ exitCode: 1 })).toBe(
      'The session ended within 5 seconds of starting. It exited with code 1.'
    );
  });

  it('names the signal instead of a code when there was one', () => {
    expect(fastDeathSentence({ exitSignal: 'term' })).toBe(
      'The session ended within 5 seconds of starting. It was stopped by SIGTERM.'
    );
  });

  it('drops the number when the capture wrapper collapsed it', () => {
    expect(
      fastDeathSentence({
        exitCode: 1,
        capture: { exitCodeApproximate: true }
      })
    ).toBe('The session ended within 5 seconds of starting.');
  });

  it('says nothing about a duration it cannot measure', () => {
    const text = fastDeathSentence({ exitCode: 1 });
    expect(text).not.toMatch(/ran for/);
    expect(text).not.toMatch(/0\.\d/);
  });
});

/**
 * PHASE 48 FIX ROUND. The note under the pane's last words.
 *
 * It used to be one fixed sentence ending "restarting will not change the
 * result". A verifier killed a healthy long-running agent from outside, and
 * Tortie drew its TUI frame as its last words and then told the person a
 * restart would not help, when the session was fully restartable.
 */
describe('exitDetailNote', () => {
  it('tells a failed launch that a restart will not help', () => {
    const note = exitDetailNote({ exitCode: 127 });
    expect(note).toContain('restarting will not change the result');
    expect(note).not.toContain('SIG');
  });

  it('tells a session killed from outside that a restart may well work', () => {
    const note = exitDetailNote({ exitSignal: 'kill' });
    expect(note).toContain('SIGKILL');
    expect(note).toContain('a restart may well succeed');
    expect(note).not.toContain('will not change the result');
  });

  it('reads the 128+n exit code as the signal it is', () => {
    // claude traps SIGTERM and exits 143 itself, which is the same event
    // wearing a number, so it gets the same sentence.
    expect(exitDetailNote({ exitCode: 143 })).toContain('SIGTERM');
  });
});
