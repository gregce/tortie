/**
 * Phase 292 — the pane's own colour reports are not keystrokes.
 *
 * The same shape as ./focus-report.test.ts, for the same reason: the whole
 * fix rests on telling a report from input, so the near misses matter more
 * than the hits. The two hits are the bytes probe:p292 recorded 33 ms after a
 * window resize, the ones that threw a scrolled-back reader to live output.
 * Anything a person can type or paste around them has to go down the ordinary
 * input path, or a scrolled pane would stop returning to the bottom when
 * somebody types.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { isColorReport } from '../keys/color-report';
import { isFocusReport } from '../keys/focus-report';

const ESC = '\u001b';
const ST = `${ESC}\\`;
/** The two chunks as the probe's listener recorded them, byte for byte. */
const FOREGROUND = `${ESC}]10;rgb:d8d8/dbdb/e2e2${ST}`;
const BACKGROUND = `${ESC}]11;rgb:1313/1414/1717${ST}`;

describe('isColorReport', () => {
  it('is the two answers xterm gives tmux, as they were recorded', () => {
    expect(isColorReport(FOREGROUND)).toBe(true);
    expect(isColorReport(BACKGROUND)).toBe(true);
    // Another theme is other digits in the same shape.
    expect(isColorReport(`${ESC}]11;rgb:ffff/ffff/ffff${ST}`)).toBe(true);
  });

  it('refuses every near miss', () => {
    for (const data of [
      '',
      // The QUESTION tmux sends, which is not an answer.
      `${ESC}]10;?${ST}`,
      // The colours tmux never asks this terminal for: cursor and palette.
      `${ESC}]12;rgb:d8d8/dbdb/e2e2${ST}`,
      `${ESC}]4;1;rgb:d8d8/dbdb/e2e2${ST}`,
      // The other terminator, which xterm does not compose.
      `${ESC}]10;rgb:d8d8/dbdb/e2e2\u0007`,
      // Short channels, a missing channel, upper case, a colour by name.
      `${ESC}]10;rgb:d8/db/e2${ST}`,
      `${ESC}]10;rgb:d8d8/dbdb${ST}`,
      `${ESC}]10;rgb:D8D8/DBDB/E2E2${ST}`,
      `${ESC}]10;red${ST}`,
      // Unterminated, and without its escape.
      `${ESC}]10;rgb:d8d8/dbdb/e2e2`,
      `]10;rgb:d8d8/dbdb/e2e2${ST}`,
      'rgb:d8d8/dbdb/e2e2'
    ]) {
      expect(isColorReport(data)).toBe(false);
    }
  });

  it('refuses a report carried inside a longer run of bytes', () => {
    // Only a chunk that IS the report is a report; anything around it makes
    // it input again, and input returns a scrolled pane to the bottom.
    expect(isColorReport(`ls${FOREGROUND}`)).toBe(false);
    expect(isColorReport(`${BACKGROUND}ls`)).toBe(false);
    expect(isColorReport(`${FOREGROUND}${BACKGROUND}`)).toBe(false);
    expect(isColorReport(`${FOREGROUND}\r`)).toBe(false);
    expect(isColorReport(`\n${FOREGROUND}`)).toBe(false);
  });

  it('is a different question from the focus report, and neither answers the other', () => {
    expect(isFocusReport(FOREGROUND)).toBe(false);
    expect(isColorReport(`${ESC}[I`)).toBe(false);
    expect(isColorReport(`${ESC}[O`)).toBe(false);
  });
});

describe('where the pane sends one', () => {
  const pane = readFileSync(
    resolve(__dirname, '..', 'TerminalPane.tsx'),
    'utf8'
  );

  /** The body of `term.onData((d) => { … })`, read by matching braces. */
  function onDataBody(): string {
    const at = pane.indexOf('term.onData((d) => {');
    expect(at).toBeGreaterThan(-1);
    const open = pane.indexOf('{', at);
    let depth = 0;
    for (let i = open; i < pane.length; i += 1) {
      if (pane[i] === '{') depth += 1;
      else if (pane[i] === '}') {
        depth -= 1;
        if (depth === 0) return pane.slice(open + 1, i);
      }
    }
    throw new Error('term.onData has no closing brace');
  }

  it('hands it to sendReport and returns BEFORE anything treats it as input', () => {
    const body = onDataBody();
    // The pane asks ONE question, ../keys/pane-report.ts, and that question
    // is proved to include this one in ./pane-report.test.ts.
    const report = body.indexOf('if (isPaneReport(d)) {');
    const sent = body.indexOf('scroll.sendReport(d)');
    const noted = body.indexOf('noteTerminalInput');
    const typed = body.indexOf('scroll.sendInput(d)');
    expect(report).toBeGreaterThan(-1);
    expect(sent).toBeGreaterThan(report);
    // A report must not answer a session that was waiting for input, and it
    // must not leave copy mode, so both of those come after the return.
    expect(body.indexOf('return;', sent)).toBeGreaterThan(sent);
    expect(noted).toBeGreaterThan(body.indexOf('return;', sent));
    expect(typed).toBeGreaterThan(noted);
  });
});
