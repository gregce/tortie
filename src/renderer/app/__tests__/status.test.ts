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
import { endedBadly, endedTitle, endSignalName, statusVisual } from '../status';

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
