/**
 * The loopback hook channel — mapping, argv splicing, and the auth surface.
 *
 * Verified live on 2026-08-10 against claude 2.1.226: a session launched with
 * `--settings <this exact shape>` posted `UserPromptSubmit` (+1.7 s before
 * `Stop`) to `POST /h/<token>?e=<Event>` on 127.0.0.1 with a JSON body — no
 * subprocess, no change to any file outside gmux's own userData.
 */

import { describe, expect, it } from 'vitest';
import {
  isSubagentPayload,
  stateForHookEvent,
  withClaudeSettingsFlag
} from '../hooks';

describe('hook event → state', () => {
  it('maps the four events that carry a state', () => {
    expect(stateForHookEvent('UserPromptSubmit')).toBe('working');
    expect(stateForHookEvent('PermissionRequest')).toBe('needs_input');
    expect(stateForHookEvent('PostToolUse')).toBe('working');
    expect(stateForHookEvent('Stop')).toBe('idle');
  });

  it('ignores Notification', () => {
    // Debounced ~6 s after a permission request, and its idle variant fires a
    // full 60 s after Stop — a nudge, never a state.
    expect(stateForHookEvent('Notification')).toBeUndefined();
  });

  it('ignores anything it does not know', () => {
    expect(stateForHookEvent('')).toBeUndefined();
    expect(stateForHookEvent('SessionStart')).toBeUndefined();
    // Nothing may reach through the event name into Object.prototype.
    expect(stateForHookEvent('toString')).toBeUndefined();
    expect(stateForHookEvent('constructor')).toBeUndefined();
  });
});

describe('subagent payloads', () => {
  it('are ignored — they must not move the top-level status', () => {
    expect(isSubagentPayload('{"agent_id":"abc","prompt":"x"}')).toBe(true);
    expect(isSubagentPayload('{"agent_type":"explore"}')).toBe(true);
  });
  it('leave ordinary payloads alone', () => {
    expect(isSubagentPayload('{"prompt":"hello"}')).toBe(false);
    expect(isSubagentPayload('')).toBe(false);
    expect(isSubagentPayload('not json')).toBe(false);
  });
});

describe('withClaudeSettingsFlag', () => {
  it('splices the flag in right after the binary', () => {
    expect(
      withClaudeSettingsFlag(['/bin/claude', '--session-id', 'u1'], '/p/s.json')
    ).toEqual(['/bin/claude', '--settings', '/p/s.json', '--session-id', 'u1']);
  });

  it('rides the resume argv too (--resume does not re-apply launch flags)', () => {
    expect(
      withClaudeSettingsFlag(['/bin/claude', '--resume', 'u1'], '/p/s.json')
    ).toEqual(['/bin/claude', '--settings', '/p/s.json', '--resume', 'u1']);
  });

  it('is idempotent', () => {
    const once = withClaudeSettingsFlag(['/bin/claude'], '/p/s.json');
    expect(withClaudeSettingsFlag(once, '/other.json')).toEqual(once);
  });

  it('leaves an empty argv alone', () => {
    expect(withClaudeSettingsFlag([], '/p/s.json')).toEqual([]);
  });
});
