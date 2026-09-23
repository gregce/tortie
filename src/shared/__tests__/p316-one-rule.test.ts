/**
 * Phase 316 moved six rules into src/shared/ so main can answer the phone with
 * the rule the Mac draws with. A MOVE, not a copy: this file is what fails the
 * day somebody pastes one of them back into the renderer, or into main, and the
 * phone and the Mac start drawing two answers.
 *
 * For each rule it counts DEFINITIONS across every production source under
 * `src/` (comments blanked, tests skipped) and requires exactly one, in the
 * shared module that owns it. Then it drives the three rules that choose a
 * word, row by row.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { formatAge } from '../age';
import {
  ANSWER_NOT_IN_RECORD,
  NOT_ANSWERED_YET,
  STOPPED_BEFORE_ANSWER,
  answerAbsence
} from '../overview-copy';
import { raisedLabel, statusVisual } from '../status-words';
import { SRC, relPath, sourceFiles, stripComments } from './source-scan';

/** The rule, the pattern that DEFINES it, and the one module allowed to. */
const RULES: readonly (readonly [string, RegExp, string])[] = [
  ['formatAge', /\bfunction formatAge\s*\(|\bformatAge\s*=\s*\(/, 'shared/age.ts'],
  ['formatTurnClock', /\bfunction formatTurnClock\s*\(/, 'shared/overview-clock.ts'],
  ['buildProjectLine', /\bfunction buildProjectLine\s*\(/, 'shared/overview-line.ts'],
  ['answerAbsence', /\bfunction answerAbsence\s*\(/, 'shared/overview-copy.ts'],
  ['statusVisual', /\bfunction statusVisual\s*\(/, 'shared/status-words.ts'],
  ['raisedLabel', /\bfunction raisedLabel\s*\(/, 'shared/status-words.ts']
];

const SOURCES = sourceFiles(SRC).map((file) => ({
  rel: relPath(file),
  code: stripComments(readFileSync(file, 'utf8'))
}));

describe('one definition of each rule the phone and the Mac share', () => {
  it('scans the tree at all', () => {
    expect(SOURCES.length).toBeGreaterThan(500);
  });

  for (const [name, pattern, owner] of RULES) {
    it(`${name} is defined once, in src/${owner}`, () => {
      const where = SOURCES.filter((s) => pattern.test(s.code)).map((s) => s.rel);
      expect(where).toEqual([owner]);
    });
  }

  it('leaves nothing at the three renderer paths the Catch Me Up modules moved from', () => {
    for (const gone of ['line.ts', 'clock.ts', 'copy.ts']) {
      expect(existsSync(join(SRC, 'renderer', 'overview', gone)), gone).toBe(false);
    }
  });

  it('keeps every status word in the shared table and none in the renderer’s', () => {
    const renderer = SOURCES.find((s) => s.rel === 'renderer/app/status.ts');
    expect(renderer?.code).not.toMatch(/label:\s*'/);
    const shared = SOURCES.find((s) => s.rel === 'shared/status-words.ts');
    for (const word of ['working', 'needs input', 'idle', 'ended', 'saved', 'not running', 'unreachable', 'removed']) {
      expect(shared?.code, word).toContain(`label: '${word}'`);
    }
  });
});

describe('the rules, row by row', () => {
  it('chooses the absence sentence from the turn and the session', () => {
    const open = { closed: false, interrupted: false };
    expect(answerAbsence(open, 'running')).toBe(NOT_ANSWERED_YET);
    expect(answerAbsence(open, 'needs_input')).toBe(NOT_ANSWERED_YET);
    expect(answerAbsence(open, 'idle')).toBe(ANSWER_NOT_IN_RECORD);
    expect(answerAbsence({ closed: true, interrupted: true }, 'running')).toBe(STOPPED_BEFORE_ANSWER);
    expect(answerAbsence({ closed: false, interrupted: true }, 'exited')).toBe(STOPPED_BEFORE_ANSWER);
    expect(answerAbsence({ closed: true, interrupted: false }, 'running')).toBe(ANSWER_NOT_IN_RECORD);
  });

  it('raises a status word for a title and nothing else', () => {
    expect(raisedLabel(statusVisual('needs_input').label)).toBe('Needs input');
    expect(raisedLabel(statusVisual('exited', { exitCode: 1 }).label)).toBe('Failed (exit 1)');
    expect(raisedLabel(statusVisual('exited', { exitSignal: 'term' }).label)).toBe('Killed (SIGTERM)');
  });

  it('draws the one age in one unit', () => {
    const now = 100 * 24 * 60 * 60_000;
    expect(formatAge(now - 59_999, now)).toBe('now');
    expect(formatAge(now - 60_000, now)).toBe('1m');
    expect(formatAge(now - 59 * 60_000, now)).toBe('59m');
    expect(formatAge(now - 60 * 60_000, now)).toBe('1h');
    expect(formatAge(now - 24 * 60 * 60_000, now)).toBe('1d');
    // A clock in the future is "now", never a negative age.
    expect(formatAge(now + 60_000, now)).toBe('now');
  });
});
