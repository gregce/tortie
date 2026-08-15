/**
 * Phase 35. The log:append bounds (spec §5).
 *
 * The renderer is the one process that can produce log lines in a loop
 * without a person doing anything, because a render that throws re-renders
 * and throws again. Without these bounds one broken component could fill the
 * 2 MiB file in seconds and push every other domain's history out of it.
 *
 * The rules under test: an invalid line is dropped WHOLE and never partially
 * written, msg is truncated at 2048 characters, serialized fields are capped
 * at 8 KiB, and each sender WebContents gets 200 accepted lines per run with
 * one final log.capped record on the 201st.
 */

import { describe, expect, it } from 'vitest';
import {
  APPEND_MAX_FIELDS_BYTES,
  APPEND_MAX_LINES_PER_SENDER,
  APPEND_MAX_MSG_CHARS,
  AppendBudget,
  sanitizeRendererLine
} from '../append';

describe('sanitizeRendererLine drops an invalid line whole', () => {
  it('rejects a payload that is not an object', () => {
    expect(sanitizeRendererLine(null)).toBeNull();
    expect(sanitizeRendererLine('error')).toBeNull();
    expect(sanitizeRendererLine(42)).toBeNull();
    expect(sanitizeRendererLine(undefined)).toBeNull();
  });

  it('rejects an unknown level', () => {
    expect(
      sanitizeRendererLine({ level: 'trace', scope: 'renderer', msg: 'x' })
    ).toBeNull();
    expect(
      sanitizeRendererLine({ level: 7, scope: 'renderer', msg: 'x' })
    ).toBeNull();
  });

  it('rejects a scope outside the allowlist', () => {
    // The allowlist is the whole point: a renderer must not be able to write
    // a line that reads as if main's tmux layer said it.
    expect(
      sanitizeRendererLine({ level: 'error', scope: 'tmux', msg: 'x' })
    ).toBeNull();
    expect(
      sanitizeRendererLine({ level: 'error', scope: 'boot', msg: 'x' })
    ).toBeNull();
  });

  it('accepts the two allowed scopes', () => {
    expect(
      sanitizeRendererLine({ level: 'error', scope: 'renderer', msg: 'x' })
    ).toEqual({ level: 'error', scope: 'renderer', msg: 'x' });
    expect(
      sanitizeRendererLine({ level: 'warn', scope: 'settings', msg: 'y' })
    ).toEqual({ level: 'warn', scope: 'settings', msg: 'y' });
  });

  it('rejects a msg that is not a string', () => {
    expect(
      sanitizeRendererLine({ level: 'error', scope: 'renderer', msg: { a: 1 } })
    ).toBeNull();
    expect(
      sanitizeRendererLine({ level: 'error', scope: 'renderer' })
    ).toBeNull();
  });

  it('rejects fields that are not an object, rather than writing half a line', () => {
    expect(
      sanitizeRendererLine({
        level: 'error',
        scope: 'renderer',
        msg: 'x',
        fields: 'not an object'
      })
    ).toBeNull();
  });
});

describe('sanitizeRendererLine bounds what it accepts', () => {
  it('truncates msg at 2048 characters', () => {
    expect(APPEND_MAX_MSG_CHARS).toBe(2048);
    const clean = sanitizeRendererLine({
      level: 'error',
      scope: 'renderer',
      msg: 'z'.repeat(5000)
    });
    expect(clean?.msg).toHaveLength(2048);
  });

  it('leaves fields under the 8 KiB cap exactly as they are', () => {
    expect(APPEND_MAX_FIELDS_BYTES).toBe(8192);
    const fields = { source: 'index.tsx', line: 12, col: 3 };
    expect(
      sanitizeRendererLine({
        level: 'error',
        scope: 'renderer',
        msg: 'boom',
        fields
      })?.fields
    ).toEqual(fields);
  });

  it('replaces fields over the cap with {"truncated":true}', () => {
    const clean = sanitizeRendererLine({
      level: 'error',
      scope: 'renderer',
      msg: 'boom',
      fields: { stack: 'q'.repeat(APPEND_MAX_FIELDS_BYTES + 1) }
    });
    expect(clean?.fields).toEqual({ truncated: true });
  });

  it('replaces fields it cannot serialize with {"truncated":true}', () => {
    const cyclic: Record<string, unknown> = {};
    cyclic['self'] = cyclic;
    expect(
      sanitizeRendererLine({
        level: 'error',
        scope: 'renderer',
        msg: 'boom',
        fields: cyclic
      })?.fields
    ).toEqual({ truncated: true });
  });

  it('leaves fields absent when the payload had none', () => {
    const clean = sanitizeRendererLine({
      level: 'info',
      scope: 'settings',
      msg: 'opened'
    });
    expect(clean).not.toHaveProperty('fields');
  });
});

describe('AppendBudget', () => {
  it('accepts 200 lines per sender, caps once, then drops silently', () => {
    expect(APPEND_MAX_LINES_PER_SENDER).toBe(200);
    const budget = new AppendBudget();
    for (let i = 0; i < 200; i += 1) {
      expect(budget.take(1)).toBe('accept');
    }
    // Line 201 writes the one log.capped record for this sender.
    expect(budget.take(1)).toBe('cap');
    // Everything after it is silence, so a loop cannot keep writing.
    expect(budget.take(1)).toBe('drop');
    expect(budget.take(1)).toBe('drop');
  });

  it('counts each sender WebContents separately', () => {
    const budget = new AppendBudget();
    for (let i = 0; i < 201; i += 1) budget.take(1);
    // The settings window has its own budget; the main window using its own
    // up must not silence it.
    expect(budget.take(2)).toBe('accept');
  });
});
