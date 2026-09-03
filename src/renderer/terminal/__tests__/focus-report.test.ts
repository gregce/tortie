/**
 * Phase 205 item 1 — the pane's own focus reports are not keystrokes.
 *
 * These cases pin the exact byte comparison, because the whole fix rests on
 * it: the two sequences xterm answers DECSET 1004 with are recognised, and
 * everything a person can actually type is not. The near misses matter more
 * than the hits. A CSI that merely starts the same way, the letters on their
 * own, and either sequence carried INSIDE a longer run of bytes all have to
 * go down the ordinary input path, or a scrolled pane would stop returning to
 * the bottom when somebody types.
 */

import { describe, expect, it } from 'vitest';
import {
  FOCUS_IN_REPORT,
  FOCUS_OUT_REPORT,
  isFocusReport
} from '../keys/focus-report';

const ESC = '\u001b';

describe('isFocusReport', () => {
  it('is the two sequences DECSET 1004 defines and nothing else', () => {
    expect(FOCUS_IN_REPORT).toBe(`${ESC}[I`);
    expect(FOCUS_OUT_REPORT).toBe(`${ESC}[O`);
    expect(isFocusReport(FOCUS_IN_REPORT)).toBe(true);
    expect(isFocusReport(FOCUS_OUT_REPORT)).toBe(true);
  });

  it('refuses every near miss a person can produce', () => {
    for (const data of [
      '',
      'I',
      'O',
      `${ESC}[`,
      `${ESC}[i`,
      `${ESC}[o`,
      // The private-mode form, which is a different sequence entirely.
      `${ESC}[?I`,
      // A cursor key, which is what the wheel used to emit.
      `${ESC}OA`,
      // Either sequence with one byte more or one byte fewer.
      `${ESC}[II`,
      `${ESC}[OO`,
      `[I`,
      `[O`
    ]) {
      expect(isFocusReport(data)).toBe(false);
    }
  });

  it('refuses a report carried inside a longer run of bytes', () => {
    // A paste, or a fast typist, delivers one string. Only a string that IS
    // the report is a report; anything around it makes it input again.
    expect(isFocusReport(`ls${FOCUS_IN_REPORT}`)).toBe(false);
    expect(isFocusReport(`${FOCUS_OUT_REPORT}ls`)).toBe(false);
    expect(isFocusReport(`${FOCUS_IN_REPORT}${FOCUS_OUT_REPORT}`)).toBe(false);
    expect(isFocusReport('\r')).toBe(false);
  });
});
