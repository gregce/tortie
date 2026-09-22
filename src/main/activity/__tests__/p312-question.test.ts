/**
 * PHASE 312 mechanism 6 — ONE FIELD, TWO SOURCES, ONE PRECEDENCE.
 *
 * The entry: "For a Claude session both answers can exist: the hook's question
 * (Phase 311) and the screen's. **The hook's wins** … and one function answers
 * the question for every surface so two draw sites cannot disagree."
 *
 * The first build of this phase wrote the screen's question onto the channel
 * unconditionally and asked nothing about a hook question, so the precedence
 * existed as a sentence in the entry and as nothing in the tree. Both phases
 * declare the same field on the same channel, so once 311 lands a screen read
 * could overwrite the agent's own words on the field the phone's first screen is
 * specified to draw.
 *
 * WHAT CAN AND CANNOT BE PROVED IN THIS WORKTREE. The hook question does not
 * exist here — Phase 311 is what produces it — so what is asserted below is the
 * PRECEDENCE, over both arguments, independently of who supplies them. That the
 * monitor passes a real hook answer as the first argument is 311's own
 * reconciliation and is verified when both halves are live.
 */

import { describe, expect, it } from 'vitest';
import { composeQuestion } from '../question';

describe('composeQuestion — the hook wins', () => {
  it('takes the hook’s words over the screen’s reading', () => {
    // A hook body IS the question. A screen row is this repository's guess at
    // which drawn row was the question, out of a 24-row window and a
    // six-phrase regex, and it can be the wrong row.
    expect(
      composeQuestion('May I edit note.txt?', 'Do you want to make this edit?')
    ).toBe('May I edit note.txt?');
  });

  it('takes the screen’s reading when there is no hook', () => {
    // Every registry row but one, which is the reason mechanism 3 exists.
    expect(composeQuestion(null, 'Do you trust the files in this folder?')).toBe(
      'Do you trust the files in this folder?'
    );
  });

  it('answers null when neither source has anything', () => {
    // Absent means the update carries no news about the question, which is what
    // the channel's own field says in the same words.
    expect(composeQuestion(null, null)).toBeNull();
    expect(composeQuestion(undefined, undefined)).toBeNull();
  });

  it('treats an empty hook body as no answer rather than as a blank question', () => {
    // A hook that fires with no body must not blank a row the screen can still
    // read, and a blank drawn where a sentence belongs reads as a broken agent.
    expect(composeQuestion('', 'Do you want to run it?')).toBe(
      'Do you want to run it?'
    );
    expect(composeQuestion('', '')).toBeNull();
  });

  it('never merges the two, so no sentence is half of each', () => {
    const answer = composeQuestion('A?', 'B?');
    expect(answer === 'A?' || answer === 'B?').toBe(true);
    expect(answer).toBe('A?');
  });

  it('is pure: the same pair answers the same way twice', () => {
    expect(composeQuestion('A?', 'B?')).toBe(composeQuestion('A?', 'B?'));
  });
});
