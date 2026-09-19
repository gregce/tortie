/**
 * Phase 292 — everything a pane says about itself is forwarded, never typed.
 *
 * Three kinds of report arrive on `term.onData`, the event a keystroke arrives
 * on, and each was once sent down the keystroke's road and threw a reader who
 * had scrolled back to live output with nobody at the keyboard: the focus
 * reports (Phase 205), the colour reports a late resize draws, and the
 * device-attribute answers every return to a session draws. The pane asks ONE
 * question of them, `isPaneReport`, and these are its rows.
 *
 * The near misses matter more than the hits. Anything a person can type or
 * paste has to go down the ordinary input path, because that path is what
 * takes a scrolled pane back to the bottom before a keystroke reaches the
 * program.
 */

import { describe, expect, it } from 'vitest';
import { isDeviceReport } from '../keys/device-report';
import { isPaneReport } from '../keys/pane-report';

const ESC = '\u001b';
/** What xterm handed the app at a return to a session, byte for byte. */
const DA1 = `${ESC}[?1;2c`;
const DA2 = `${ESC}[>0;276;0c`;
const FOREGROUND = `${ESC}]10;rgb:d8d8/dbdb/e2e2${ESC}\\`;
const BACKGROUND = `${ESC}]11;rgb:1313/1414/1717${ESC}\\`;
const FOCUS_IN = `${ESC}[I`;
const FOCUS_OUT = `${ESC}[O`;

/** Keys and pastes a person makes, none of which may be taken for a report. */
const TYPED = [
  'x',
  'c',
  '\r',
  '\u0003',
  `${ESC}`,
  // Arrows in both cursor modes, a function key, Home.
  `${ESC}[A`,
  `${ESC}OA`,
  `${ESC}[15~`,
  `${ESC}[H`,
  // A modified key in the two extended encodings a terminal can use.
  `${ESC}[27;5;99~`,
  `${ESC}[99;5u`,
  // The bracketed paste markers and a paste.
  `${ESC}[200~echo hi${ESC}[201~`,
  // An SGR mouse report, which is the program's and not this question's.
  `${ESC}[<0;10;5M`
];

describe('isDeviceReport', () => {
  it('is the two answers xterm gives at an attach, as they were recorded', () => {
    expect(isDeviceReport(DA1)).toBe(true);
    expect(isDeviceReport(DA2)).toBe(true);
    // Another terminal's parameters are other digits in the same shape.
    expect(isDeviceReport(`${ESC}[?62;22c`)).toBe(true);
    expect(isDeviceReport(`${ESC}[>1;10;0c`)).toBe(true);
  });

  it('refuses every near miss', () => {
    for (const data of [
      '',
      // The QUESTIONS tmux sends, which are not answers.
      `${ESC}[c`,
      `${ESC}[0c`,
      // Upper case, another prefix, an unterminated answer.
      `${ESC}[?1;2C`,
      `${ESC}[=1;2c`,
      `${ESC}[?1;2`,
      // Without its escape, or with a letter among the parameters.
      '[?1;2c',
      `${ESC}[?1;xc`
    ]) {
      expect([data, isDeviceReport(data)]).toEqual([data, false]);
    }
  });

  it('refuses an answer carried inside a longer run of bytes', () => {
    expect(isDeviceReport(`x${DA1}`)).toBe(false);
    expect(isDeviceReport(`${DA1}x`)).toBe(false);
    expect(isDeviceReport(`${DA1}${DA2}`)).toBe(false);
    expect(isDeviceReport(`${DA2}\r`)).toBe(false);
    expect(isDeviceReport(`${DA1}\n`)).toBe(false);
  });
});

describe('isPaneReport, the one question the pane asks', () => {
  it('is true for every kind of report, each on its own', () => {
    for (const data of [FOCUS_IN, FOCUS_OUT, FOREGROUND, BACKGROUND, DA1, DA2]) {
      expect([data, isPaneReport(data)]).toEqual([data, true]);
    }
  });

  it('is false for everything a person types or pastes', () => {
    for (const data of TYPED) {
      expect([data, isPaneReport(data)]).toEqual([data, false]);
    }
  });

  it('is false for two reports in one chunk, which is not a shape any of the three composes', () => {
    expect(isPaneReport(`${FOCUS_IN}${DA1}`)).toBe(false);
    expect(isPaneReport(`${DA1}${FOREGROUND}`)).toBe(false);
  });
});
