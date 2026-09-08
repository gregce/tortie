/**
 * PHASE 238, item 2. The baseline advances through the ONE place that already
 * owns it, and the face says so.
 *
 * Three things are pinned here and each is one line away from being undone.
 * The generation MOVES on an accept, exactly as it moves on a re-seed, which
 * is what makes research 83 B.8a's guard fire under this phase's own gesture.
 * `acceptedAt` is carried, because the sentence research 83 A4.2 ruling 1
 * wrote — *"since you accepted, 14:02"* — needs a moment and no other origin
 * has one. And an accept does NOT touch `headSeen`, so a HEAD version that
 * arrives after an accept still wins outright, whatever its date, which is
 * A4.2 ruling 2's ordering rule and the reason a branch switch is never
 * swallowed by an accept.
 */

import { describe, expect, it } from 'vitest';
import {
  NO_BASELINE,
  baselineName,
  baselineSentence,
  clockTime,
  nextBaseline
} from '../baseline';

/** A fixed moment, so the sentence is a pin rather than a clock reading. */
const AT = new Date(2026, 8, 8, 14, 2, 30).getTime();

describe('nextBaseline takes an accept', () => {
  it('becomes the accepted bytes, and the generation moves', () => {
    const seeded = nextBaseline(NO_BASELINE, { kind: 'read', contents: 'a\n' });
    const accepted = nextBaseline(seeded, { kind: 'accept', contents: 'b\n', at: AT });
    expect(accepted).toEqual({
      text: 'b\n',
      from: 'accept',
      generation: seeded.generation + 1,
      headSeen: null,
      // Phase 239's `takenAt` and this phase's `acceptedAt` are ONE number on
      // an accept, so no face can name two times for one seed.
      takenAt: AT,
      acceptedAt: AT
    });
  });

  it('moves the generation on EVERY accept, not only the first', () => {
    let state = nextBaseline(NO_BASELINE, { kind: 'read', contents: 'a\n' });
    const seen = [state.generation];
    for (const text of ['b\n', 'c\n', 'd\n']) {
      state = nextBaseline(state, { kind: 'accept', contents: text, at: AT });
      seen.push(state.generation);
    }
    expect(seen).toEqual([1, 2, 3, 4]);
  });

  it('moves the generation even when the accepted bytes are what is already there', () => {
    // Accept-all over a file with nothing left to accept is still an act, and
    // a picture drawn before it is still drawn against the older generation.
    const seeded = nextBaseline(NO_BASELINE, { kind: 'read', contents: 'a\n' });
    const again = nextBaseline(seeded, { kind: 'accept', contents: 'a\n', at: AT });
    expect(again.text).toBe('a\n');
    expect(again.generation).toBe(seeded.generation + 1);
  });

  it('does not touch headSeen, so a HEAD version arriving after still wins', () => {
    const seeded = nextBaseline(NO_BASELINE, { kind: 'read', contents: 'a\n' });
    const withHead = nextBaseline(seeded, { kind: 'head', contents: 'HEAD\n' });
    const accepted = nextBaseline(withHead, { kind: 'accept', contents: 'b\n', at: AT });
    expect(accepted.headSeen).toBe('HEAD\n');
    // The SAME head repeating changes nothing, so the accept stands.
    expect(nextBaseline(accepted, { kind: 'head', contents: 'HEAD\n' })).toBe(accepted);
    // A branch switch: a HEAD version not seen before wins outright, and the
    // accept's moment goes with it because the origin is no longer an accept.
    const switched = nextBaseline(accepted, { kind: 'head', contents: 'OTHER\n' });
    expect(switched.from).toBe('commit');
    expect(switched.text).toBe('OTHER\n');
    expect(switched.acceptedAt).toBe(null);
    expect(switched.generation).toBe(accepted.generation + 1);
  });

  it('a read after an accept still moves nothing, because the file changing never does', () => {
    const seeded = nextBaseline(NO_BASELINE, { kind: 'read', contents: 'a\n' });
    const accepted = nextBaseline(seeded, { kind: 'accept', contents: 'b\n', at: AT });
    expect(nextBaseline(accepted, { kind: 'read', contents: 'anything\n' })).toBe(accepted);
  });
});

describe('the face names the accept and its moment', () => {
  it('baselineName says when', () => {
    const accepted = nextBaseline(
      nextBaseline(NO_BASELINE, { kind: 'read', contents: 'a\n' }),
      { kind: 'accept', contents: 'b\n', at: AT }
    );
    expect(baselineName(accepted)).toBe(`you accepted at ${clockTime(AT)}`);
    // And it is the SAME clock the opening sentence draws, hours and minutes
    // and never a second, because two clocks would put `2:02 PM` and `14:02`
    // on one face. Phase 239 owns the format; this pins that accept reads it.
    expect(clockTime(AT)).toBe('14:02');
    expect(clockTime(AT)).not.toContain('30');
  });

  it('baselineSentence is ONE short line and still says how long it lasts', () => {
    const accepted = nextBaseline(
      nextBaseline(NO_BASELINE, { kind: 'read', contents: 'a\n' }),
      { kind: 'accept', contents: 'b\n', at: AT }
    );
    expect(baselineSentence(accepted, false)).toBe(
      `Marked since you accepted at ${clockTime(AT)}, for as long as this tab is open.`
    );
    // It never says the old text is kept anywhere (research 83 A3.4).
    expect(baselineSentence(accepted, false)).not.toMatch(/backup|saved|kept|restore/i);
    // And the dirty clause still follows it.
    expect(baselineSentence(accepted, true)).toContain(
      'Not refreshed from disk while there are unsaved edits.'
    );
  });

  it('the other two origins are exactly what Phase 225 shipped', () => {
    const read = nextBaseline(NO_BASELINE, { kind: 'read', contents: 'a\n' });
    expect(baselineName(read)).toBe('you opened this file');
    expect(baselineName(nextBaseline(read, { kind: 'head', contents: 'H\n' }))).toBe(
      'the last commit'
    );
    expect(baselineName(NO_BASELINE)).toBe(null);
  });
});
