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

import { describe, expect, it, vi } from 'vitest';
import type { Session, SessionMachine, SessionStatus } from '@shared/types';

// PHASE 71. `machineUnreachable` and `unreachableMachines` read status through
// `effectiveStatusOf`, which lives in the store, and importing the store builds
// its initial state against window.gmux. These globals exist so that import is
// inert in a node environment.
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

// Dynamic, so the globals above are in place before the store is built.
const {
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
  statusVisual,
  unreachableMachines
} = await import('../status');

const STUDIO: SessionMachine = {
  id: 'studio',
  label: 'Studio',
  color: 'orange',
  answering: true,
  // Phase 72 appended these two. A row Tortie may bring back is the case the
  // ten row matrix drives; this fixture is about the badge and the bars, so it
  // states the ordinary answer for a row nothing has offered.
  canRestore: false,
  restoreReason: 'That machine still lists this session, so it is already running.'
};

/** One session row, for the two conditions that now take whole sessions. */
function sess(status: SessionStatus, over: Partial<Session> = {}): Session {
  return {
    id: `sess-${status}`,
    name: 'auth',
    tmuxName: 'auth',
    projectPath: '/repo',
    cwd: '/repo',
    agent: 'claude',
    status,
    createdAt: 0,
    ...over
  };
}

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
    // Phase 115 made the title say WHICH process that was: for a captured
    // session, argv[0] is specstory, so the reaped process was SpecStory.
    expect(
      endedTitle({ exitSignal: 'term', capture: { exitCodeApproximate: true } })
    ).toBe('SpecStory was stopped by SIGTERM (external)');
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

  // PHASE 71. Nothing about a session on another machine is saved on this Mac:
  // no scrollback, no resume line, no launch snapshot. The machine holds all of
  // it. `saved` there would be the exact class of claim Phase 67 existed to
  // kill, so a restorable row that carries a machine reads "not running".
  it('does not say a session on another machine is saved', () => {
    expect(statusVisual('restorable', { machine: STUDIO })).toEqual({
      dot: 'idle',
      label: 'not running'
    });
  });

  it('still says saved for a restorable session on this Mac', () => {
    expect(statusVisual('restorable', { machine: undefined })).toEqual({
      dot: 'idle',
      label: 'saved'
    });
    expect(statusVisual('restorable', sess('restorable'))).toEqual({
      dot: 'idle',
      label: 'saved'
    });
  });

  it('leaves every other arm alone for a session on another machine', () => {
    // Only the restorable arm reads the machine. A remote row that is running
    // is working, and one that is unreachable is unreachable, exactly as
    // before.
    expect(statusVisual('running', { machine: STUDIO }).label).toBe('working');
    expect(statusVisual('unknown', { machine: STUDIO }).label).toBe(
      'unreachable'
    );
    expect(
      statusVisual('exited', { machine: STUDIO, exitCode: 0 }).label
    ).toBe('ended');
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
    expect(machineUnreachable([sess('running'), sess('unknown')])).toBe(true);
    expect(machineUnreachable([sess('unknown')])).toBe(true);
  });

  it('machineUnreachable is false for any list with no unknown row', () => {
    expect(machineUnreachable([])).toBe(false);
    expect(
      machineUnreachable([
        sess('running'),
        sess('restorable'),
        sess('exited'),
        sess('needs_input'),
        sess('idle'),
        sess('discarded')
      ])
    ).toBe(false);
  });

  it('both conditions read status through the one expression', () => {
    // PHASE 71. The two conditions take whole sessions and read through
    // `effectiveStatusOf`, so a bar can never decide from a different reading
    // than the row beside it. Today the two values agree; per machine
    // reconcile is what makes them able to disagree.
    const quiet = { ...STUDIO, answering: false };
    const rows = [
      sess('unknown', { id: 'a', machine: quiet }),
      sess('running', { id: 'b', machine: STUDIO }),
      sess('unknown', { id: 'c' })
    ];
    expect(machineUnreachable(rows)).toBe(true);
    expect(unreachableMachines(rows)).toEqual([quiet]);
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

// ---------------------------------------------------------------------------
// Phase 115 — a captured signal death describes SpecStory, not the agent
// ---------------------------------------------------------------------------

/**
 * tmux execs argv[0], and for a captured session wrapArgv puts the specstory
 * binary there. A SIGNAL death therefore names the SpecStory process, and the
 * old copy blamed the agent for it (github issue 10: the hardened runtime
 * killed specstory mid-save, and Tortie said the agent was killed). An exit
 * CODE death keeps today's copy, because the wrapper mirrors the agent's own
 * exit status, so on that path the number does describe the agent.
 */
describe('a captured signal death names SpecStory (Phase 115)', () => {
  /** A captured session end: the wrapper was SIGKILLed mid-save. */
  const capturedKill = {
    capture: { exitCodeApproximate: false },
    exitSignal: 'KILL'
  };

  it('endedTitle names SpecStory, keeping the (external) suffix rule', () => {
    expect(endedTitle(capturedKill)).toBe(
      'SpecStory was stopped by SIGKILL (external)'
    );
    // INT and QUIT are what a keyboard sends, so the captured arm drops
    // "(external)" exactly like the uncaptured arm does.
    expect(
      endedTitle({ capture: { exitCodeApproximate: false }, exitSignal: 'INT' })
    ).toBe('SpecStory was stopped by SIGINT');
    expect(
      endedTitle({ capture: { exitCodeApproximate: false }, exitSignal: 'QUIT' })
    ).toBe('SpecStory was stopped by SIGQUIT');
  });

  it('fastDeathTitle names SpecStory when the end rides along', () => {
    expect(fastDeathTitle('claude', capturedKill)).toBe(
      'SpecStory stopped right after it started'
    );
  });

  it('fastDeathTitle keeps the agent form with no second argument', () => {
    // No other caller breaks: the parameter is optional, and without it the
    // heading is exactly what it was before this phase.
    expect(fastDeathTitle('claude')).toBe(
      'claude stopped right after it started'
    );
  });

  it('fastDeathTitle keeps the agent form for a captured exit-code death', () => {
    // The wrapper mirrors the agent's own exit status, so an exit CODE death
    // does describe the agent, captured or not.
    expect(
      fastDeathTitle('claude', {
        capture: { exitCodeApproximate: false },
        exitCode: 1
      })
    ).toBe('claude stopped right after it started');
  });

  it('fastDeathSentence says what the capture program was', () => {
    expect(fastDeathSentence(capturedKill)).toBe(
      'The session ended within 5 seconds of starting. SpecStory, the ' +
        'capture program it ran under, was stopped by SIGKILL.'
    );
  });

  it('exitDetailNote does not blame the agent and does not promise a restart', () => {
    expect(exitDetailNote(capturedKill)).toBe(
      'Restart runs the same command again, with the same SpecStory ' +
        'capture. It was SpecStory that was stopped by SIGKILL, not the ' +
        'agent. If a restart stops the same way, start a new session with ' +
        'capture turned off.'
    );
    // The promise the uncaptured arm keeps is not made here: when the
    // bundled binary is the resolved copy, a restart runs the same bytes
    // into the same stop.
    expect(exitDetailNote(capturedKill)).not.toContain('may well succeed');
  });

  it('statusVisual labels the row with the process that was killed', () => {
    expect(statusVisual('exited', capturedKill)).toEqual({
      dot: 'failed',
      label: 'SpecStory killed (SIGKILL)'
    });
  });

  it('leaves the uncaptured signal death exactly as it was', () => {
    expect(endedTitle({ exitSignal: 'kill' })).toBe(
      'Session terminated by SIGKILL (external)'
    );
    expect(fastDeathSentence({ exitSignal: 'kill' })).toBe(
      'The session ended within 5 seconds of starting. It was stopped by SIGKILL.'
    );
    expect(exitDetailNote({ exitSignal: 'kill' })).toContain(
      'a restart may well succeed'
    );
    expect(statusVisual('exited', { exitSignal: 'kill' })).toEqual({
      dot: 'failed',
      label: 'killed (SIGKILL)'
    });
  });

  it('leaves the captured exit-code death exactly as it was', () => {
    // A collapsed wrapper still drops the number and says nothing about
    // SpecStory, because the exit path mirrors the agent.
    expect(
      endedTitle({ exitCode: 1, capture: { exitCodeApproximate: true } })
    ).toBe('Session ended unexpectedly');
    expect(
      endedTitle({ exitCode: 7, capture: { exitCodeApproximate: false } })
    ).toBe('Session ended unexpectedly (exit 7)');
    expect(
      statusVisual('exited', {
        exitCode: 1,
        capture: { exitCodeApproximate: true }
      })
    ).toEqual({ dot: 'failed', label: 'failed' });
    expect(
      statusVisual('exited', {
        exitCode: 7,
        capture: { exitCodeApproximate: false }
      })
    ).toEqual({ dot: 'failed', label: 'failed (exit 7)' });
  });

  it('never says pane', () => {
    const strings = [
      endedTitle(capturedKill),
      fastDeathTitle('claude', capturedKill),
      fastDeathSentence(capturedKill),
      exitDetailNote(capturedKill),
      statusVisual('exited', capturedKill).label
    ];
    for (const s of strings) expect(s.toLowerCase()).not.toContain('pane');
  });
});
