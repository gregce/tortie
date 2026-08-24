/**
 * The twenty sentences the real model actually wrote (Phase 138).
 *
 * These came out of a real run of the shipped recipe on 2026-08-23, against
 * the composer's own prompt shape. They are here so the validator is checked
 * against what a model writes rather than only against what a builder imagined
 * it might write, and so a later prompt change that starts producing refusals
 * fails here rather than in front of a person.
 *
 * The run cost $0.027383 over twenty invocations, at a median of 1,941 ms.
 *
 * ONE OF THE TWENTY WAS REFUSED, and the refusal is correct rather than a
 * false alarm. The model reused a forty character run out of the answer it
 * was shown, being "the caption out of flow inside the rese", so the quote
 * test fired. The entry's refusal reads that the model never writes the
 * verbatim answer, and the page falls back to Phase 137's built line, which
 * is current by construction.
 *
 * ONE FIXTURE WAS NOT ENOUGH, and the second block below is why. The twenty
 * above are twenty answers to ONE invented ask. The fix round folded sixty
 * turns out of three of the operator's own projects instead, and the first
 * cut of the validator refused nineteen of them, being 31.7 percent. Only
 * five of the nineteen broke a refusal the entry names. The other fourteen
 * are here verbatim, and every one of them must be kept.
 *
 * After the git rule and the status rule were narrowed to name the mark and
 * the state rather than the vocabulary around them, the same sixty measure 55
 * kept and 5 refused, being 8.3 percent, and all five are the entry's own
 * refusals: two over the length cap, one quoting the ask, one quoting the
 * answer and one carrying a digit.
 */

import { describe, expect, it } from 'vitest';
import type { StoredTurn } from '../../store';
import { validateFoldText } from '../validate';

const ASK =
  'Round one: the close control still jumps when the sidebar narrows. Work ' +
  'out why and fix it without changing what the caption says.';
const ANSWER =
  'I measured the caption at its shortest and found it taller than the ' +
  'height the slot reserves, so the centred column grows and pushes the ' +
  'heading upward. I moved the caption out of flow inside the reserved slot, ' +
  'so however tall it gets nothing above it moves.';

const TURNS: StoredTurn[] = [
  {
    sessionId: 's1',
    index: 0,
    askText: ASK,
    askAt: null,
    answerText: ANSWER,
    answerAt: null,
    queued: 1,
    closed: true,
    interrupted: false,
    notice: null,
    stopReason: null,
    durationMs: null,
    paths: [],
    pathSource: 'text-only',
    gitVerdict: null,
    gitCheckedAt: null
  }
];

/** Verbatim, in the order they were written. */
const MEASURED = [
  'The agent positioned the caption outside normal flow within its reserved slot to stop it from pushing the heading upward when the sidebar narrows.',
  'The agent positioned the caption outside the document flow to prevent it from expanding the reserved slot and pushing the heading upward when the sidebar narrows.',
  'The agent identified that the caption exceeds the reserved slot height, causing layout shifts, so it removed the caption from document flow to prevent the column from growing.',
  'The agent repositioned the caption to stay outside the normal flow, preventing the close control from jumping when the sidebar narrows.',
  'The agent positioned the caption outside normal flow within the reserved slot so the heading stays fixed when the sidebar narrows and the caption expands.',
  'The agent positioned the caption outside the normal flow within the reserved slot, preventing the close control from jumping when the sidebar narrows.',
  'The agent positioned the caption outside the normal flow so its height no longer affects the layout, preventing the close control from jumping when the sidebar narrows.',
  'The agent positioned the caption outside normal flow within the reserved slot, preventing the close control from jumping when the sidebar narrows.',
  'The agent repositioned the caption to prevent the heading from shifting when the sidebar narrows and the caption expands vertically.',
  'You identified the close control jumping when the sidebar narrows, and the agent found the caption was taller than the reserved space, then removed it from flow to stop the movement.',
  'The agent positioned the caption outside the document flow to prevent it from expanding the reserved slot, which was causing the close control to jump when the sidebar narrowed.',
  'The agent moved the caption outside the normal flow within the reserved slot to prevent the close control from jumping when the sidebar narrows.',
  'You reported the heading still jumps when the sidebar narrows, and the agent found the caption exceeded the reserved slot height, then repositioned it to prevent upward movement.',
  'The agent took the caption out of flow inside the reserved slot so the close control no longer jumps when the sidebar narrows.',
  'You identified that the caption exceeded the reserved height and was pushing content upward, so the agent repositioned it to prevent any movement.',
  'The agent positioned the caption outside normal flow within the reserved slot so the close control stays put when the sidebar narrows.',
  'You identified that the caption was exceeding its reserved height and pushing content up, so the agent removed the caption from the document flow to keep the layout stable.',
  'You reported the close control jumping when the sidebar narrows, and the agent discovered the caption exceeded the reserved slot height, then repositioned the caption to prevent upward movement.',
  'The agent positioned the caption outside the normal flow to prevent its variable height from pushing the heading upward when the sidebar narrows.',
  'The agent repositioned the caption to sit outside the normal flow within the reserved slot, preventing it from pushing the heading upward when the sidebar narrows.'
];

/** The one the quote test caught, named so a change to either is visible. */
const QUOTED_ANSWER =
  'The agent took the caption out of flow inside the reserved slot so the ' +
  'close control no longer jumps when the sidebar narrows.';

describe('what the real model wrote', () => {
  it.each(MEASURED.map((text, i) => [i + 1, text]))(
    'rules on sentence %i',
    (_i, text) => {
      const out = validateFoldText(text as string, TURNS);
      if (text === QUOTED_ANSWER) {
        expect(out.refusal).toBe('quoted-answer');
        expect(out.kept).toBeNull();
        return;
      }
      expect(out.refusal).toBeNull();
      expect(out.kept).toBe(text);
    }
  );

  it('refused exactly one of the twenty, and for reusing the answer', () => {
    const refused = MEASURED.filter(
      (text) => validateFoldText(text, TURNS).refusal !== null
    );
    expect(refused).toEqual([QUOTED_ANSWER]);
  });

  it('none of them carries a digit, which the page forbids', () => {
    for (const text of MEASURED) expect(text).not.toMatch(/[0-9]/);
  });

  it('every one fits the line', () => {
    for (const text of MEASURED) expect(text.length).toBeLessThanOrEqual(320);
  });
});


// ---------------------------------------------------------------------------
// The fourteen the first cut refused wrongly (the fix round)
// ---------------------------------------------------------------------------

/**
 * Fourteen sentences the model wrote about the operator's own turns, each one
 * refused by the first cut of the validator and each one breaking no refusal
 * the entry names.
 *
 * `was` records which rule fired on it before the narrowing, so a later round
 * that widens either rule back fails here with the sentence in front of it.
 *
 * They are ruled on against an EMPTY turn list, because the turns they were
 * written from are the operator's own conversations and none of them is
 * committed anywhere. The quote test therefore proves nothing here. It proved
 * something when the measurement ran: all fourteen were re-ruled against
 * their real turns and all fourteen were kept.
 */
const WRONGLY_REFUSED: { was: string; where: string; text: string }[] = [
  {
    was: 'status-word',
    where: 'A#150',
    text:
      'You asked how to describe the time commitment across course blocks ' +
      'based on live sessions and project work, and the agent provided an ' +
      'hour breakdown showing roughly seven to eight focused hours per ' +
      'week plus a flag that the estimated time might need updating from ' +
      'two to four hours up to six to nine hours total.'
  },
  {
    was: 'status-word',
    where: 'A#158',
    text:
      'The agent cut roughly four hundred thirty characters while ' +
      'preserving every key idea, delivering a tighter version that moves ' +
      'from thesis through the hard differentiator to SpecStory\'s ' +
      'credibility and Stoa\'s live build room.'
  },
  {
    was: 'git-mark',
    where: 'A#168',
    text:
      'You confirmed the agent had updated the documentation file with ' +
      'the condensed rewrites, and the agent verified all fifteen bullets ' +
      'met the character limit and were committed to the repository.'
  },
  {
    was: 'git-mark',
    where: 'B#121',
    text:
      'The agent discovered the original sandbox was deleted when the API ' +
      'returned failed status, so the report markdown cannot be ' +
      'recovered; the agent is offering to kill an orphan sandbox and ' +
      'proceed with a fresh run that includes all three committed fixes.'
  },
  {
    was: 'git-mark',
    where: 'B#127',
    text:
      'You confirmed the report heading will update once the template ' +
      'rebuilds, and the agent committed changes so the next research run ' +
      'displays the corrected heading with your topic instead of the old ' +
      'reference.'
  },
  {
    was: 'status-word',
    where: 'B#130',
    text:
      'The agent deployed a live progress cockpit above the research ' +
      'scaffold showing phase status, live counters for sources and axes, ' +
      'platform distribution, active queries, and newly discovered URLs ' +
      'as the run populates.'
  },
  {
    was: 'git-mark',
    where: 'B#133',
    text:
      'The agent committed to returning in approximately twenty-five ' +
      'minutes with results from the research run, while you asked how to ' +
      'make progress visibility more user friendly.'
  },
  {
    was: 'git-mark',
    where: 'B#135',
    text:
      'You asked the agent to increase concurrency for the next run and ' +
      'fix an elapsed time counter that was overcounting, and the agent ' +
      'committed both changes while noting that concurrency takes effect ' +
      'on the next run but the elapsed fix is live.'
  },
  {
    was: 'git-mark',
    where: 'B#136',
    text:
      'You asked for the elapsed time display to update every second, and ' +
      'the agent implemented this with a commit and confirmed that all ' +
      'external links already open in new tabs.'
  },
  {
    was: 'git-mark',
    where: 'B#138',
    text:
      'You asked the agent to enhance the report tab markdown with ' +
      'polished styling, download and publish buttons at the top, and ' +
      'perfect formatting. The agent committed changes adding a sticky ' +
      'action bar, improved typography with custom need chips and ' +
      'metadata cards, and platform glyphs for URLs.'
  },
  {
    was: 'git-mark',
    where: 'C#96',
    text:
      'You asked the agent to commit the changes, and the agent completed ' +
      'the commit and push operation.'
  },
  {
    was: 'status-word',
    where: 'C#104',
    text:
      'You selected layout B and the agent built it live with auto- ' +
      'advancing scene tabs, a split layout showing transcripts and ' +
      'metadata, and color-coded structural elements, now ready for ' +
      'validation or refinement.'
  },
  {
    was: 'git-mark',
    where: 'C#106',
    text:
      'You asked the agent to write a commit message, and the agent ' +
      'confirmed it pushed the changes to the repository with a summary ' +
      'of file modifications.'
  },
  {
    was: 'git-mark',
    where: 'C#107',
    text:
      'The agent built custom animations using Framer Motion that align ' +
      'with the vignette context and site design, then committed the ' +
      'changes for your review.'
  }
];

describe('the sentences the first cut refused wrongly', () => {
  it.each(WRONGLY_REFUSED.map((row) => [row.where, row]))(
    'keeps %s',
    (_where, row) => {
      const out = validateFoldText((row as { text: string }).text, []);
      expect(out.refusal).toBeNull();
      expect(out.kept).toBe((row as { text: string }).text);
    }
  );

  it('covers both rules that were narrowed', () => {
    const rules = new Set(WRONGLY_REFUSED.map((row) => row.was));
    expect(rules).toEqual(new Set(['git-mark', 'status-word']));
  });

  it('still refuses a sentence that names the mark itself', () => {
    const out = validateFoldText(
      'The agent settled the rail and read you back the commit hash.',
      []
    );
    expect(out.refusal).toBe('git-mark');
  });

  it('still refuses a sentence that says what state the session is in', () => {
    const out = validateFoldText(
      'The agent settled the rail and the session is idle now.',
      []
    );
    expect(out.refusal).toBe('status-word');
  });
});
