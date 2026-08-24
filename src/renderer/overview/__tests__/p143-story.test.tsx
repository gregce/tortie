/**
 * The story panel, drawn rather than described (Phase 143).
 *
 * Every rule the entry binds this surface with is held here by rendering the
 * real component over a real payload shape.
 *
 *  - The sentence saying what a person is reading is ALWAYS drawn, above
 *    everything, including the two one line answers.
 *  - No model chosen draws ONE line and no list at all.
 *  - A model chosen with nothing written yet draws a DIFFERENT one line.
 *  - Each row carries the sentence verbatim inside data-quoted and the time
 *    it was written inside data-clock, so the digit walk stays satisfied.
 *  - The model line is drawn on EVERY row or on none, because main decides it
 *    once and hands over one answer.
 *  - The coverage line is drawn only on the rows that carry the flag.
 *  - A pressed row draws the turns under it, and says in words when only the
 *    newest turns of a wide stretch are shown.
 *
 * This repository carries no jsdom, so the component renders through
 * `renderToStaticMarkup`, the shape p138-written-line.test.tsx uses.
 */

import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type {
  OverviewTimeline,
  OverviewTimelineEntry,
  OverviewTurnView
} from '@shared/overview';
import { SessionStory } from '../SessionStory';
import {
  STORY_CLOCK_NOTE,
  STORY_GAP,
  STORY_LEAD,
  STORY_MODEL_LEAD,
  STORY_NOTHING_YET,
  STORY_NO_MODEL,
  STORY_TURNS_CLIPPED,
  STORY_TURNS_GONE
} from '../copy';
import type { StoryState } from '../story';
import { storyTurnsClipped } from '../story';
import { formatTurnClock } from '../clock';

const NOW = Date.UTC(2026, 7, 23, 12, 0, 0);

function entry(
  over: Partial<OverviewTimelineEntry> = {}
): OverviewTimelineEntry {
  return {
    text: 'You asked for a board of where phases stand.',
    writtenAt: NOW - 60_000,
    fromTurn: 0,
    toTurn: 4,
    harness: 'claude',
    model: 'haiku',
    repeated: false,
    gapBefore: false,
    ...over
  };
}

function timeline(over: Partial<OverviewTimeline> = {}): OverviewTimeline {
  return {
    sessionId: 'one',
    entries: [entry()],
    chosen: true,
    modelChanged: false,
    ...over
  };
}

function state(over: Partial<StoryState> = {}): StoryState {
  return {
    open: true,
    sessionId: 'one',
    loading: false,
    timeline: timeline(),
    error: null,
    cursor: 0,
    expanded: null,
    turns: null,
    turnsError: null,
    ...over
  };
}

function turn(over: Partial<OverviewTurnView> = {}): OverviewTurnView {
  return {
    index: 0,
    askText: 'Fix the flaky restore test.',
    askClipped: false,
    askAt: '2026-08-23T11:00:00.000Z',
    answerText: 'Done.',
    answerClipped: false,
    answerAt: '2026-08-23T11:04:00.000Z',
    closed: true,
    interrupted: false,
    notice: null,
    git: 'agrees',
    namedOnlyOutside: false,
    ...over
  };
}

function draw(over: Partial<StoryState> = {}): string {
  return renderToStaticMarkup(
    <SessionStory state={state(over)} status="idle" now={NOW} />
  );
}

/** How many times a class appears in the markup. */
function count(markup: string, className: string): number {
  return markup.split(`class="${className}`).length - 1;
}

describe('the sentence that says what this is', () => {
  it('is drawn with a list', () => {
    expect(draw()).toContain(STORY_LEAD);
  });

  it('is drawn with no model chosen', () => {
    const markup = draw({ timeline: timeline({ chosen: false, entries: [] }) });
    expect(markup).toContain(STORY_LEAD);
  });

  it('is drawn with nothing written yet', () => {
    expect(draw({ timeline: timeline({ entries: [] }) })).toContain(STORY_LEAD);
  });

  it('says which clock the rows carry', () => {
    expect(draw()).toContain(STORY_CLOCK_NOTE);
  });
});

describe('no chain', () => {
  it('draws one line and no list at all with no model chosen', () => {
    const markup = draw({ timeline: timeline({ chosen: false, entries: [] }) });
    expect(markup).toContain(STORY_NO_MODEL);
    expect(markup).not.toContain(STORY_NOTHING_YET);
    expect(count(markup, 'overview-story-row')).toBe(0);
  });

  it('draws a different line when a model is chosen and nothing is written', () => {
    const markup = draw({ timeline: timeline({ entries: [] }) });
    expect(markup).toContain(STORY_NOTHING_YET);
    expect(markup).not.toContain(STORY_NO_MODEL);
    expect(count(markup, 'overview-story-row')).toBe(0);
  });

  it('says nothing about a chain while the read is still in flight', () => {
    const markup = draw({ timeline: null, loading: true });
    expect(markup).toContain(STORY_LEAD);
    expect(markup).not.toContain(STORY_NO_MODEL);
    expect(markup).not.toContain(STORY_NOTHING_YET);
  });

  it('shows main’s own sentence when the read failed', () => {
    const markup = draw({ timeline: null, error: 'The store is locked.' });
    expect(markup).toContain('The store is locked.');
    expect(count(markup, 'overview-story-row')).toBe(0);
  });
});

describe('the rows', () => {
  const three = timeline({
    entries: [
      entry({ text: 'The newest thing.', writtenAt: NOW - 60_000 }),
      entry({ text: 'The middle thing.', writtenAt: NOW - 120_000 }),
      entry({ text: 'The oldest thing.', writtenAt: NOW - 180_000 })
    ]
  });

  it('draws one row per entry, in the order main handed over', () => {
    const markup = draw({ timeline: three });
    expect(count(markup, 'overview-story-row')).toBe(3);
    expect(markup.indexOf('The newest thing.')).toBeLessThan(
      markup.indexOf('The oldest thing.')
    );
  });

  it('carries the sentence verbatim inside a quoted span', () => {
    const markup = draw({ timeline: three });
    expect(markup).toContain(
      '<span class="overview-story-text" data-quoted="true">The newest thing.</span>'
    );
  });

  it('carries the writing time inside a clock span', () => {
    const clock = formatTurnClock(NOW - 60_000, NOW);
    expect(clock).not.toBeNull();
    expect(draw({ timeline: three })).toContain(
      `<span data-clock="true">${clock ?? ''}</span>`
    );
  });

  it('names no model at all when every row agrees on one', () => {
    const markup = draw({ timeline: three });
    expect(markup).not.toContain(STORY_MODEL_LEAD);
    expect(count(markup, 'overview-story-model')).toBe(0);
  });

  it('names a model on EVERY row when they do not agree', () => {
    const markup = draw({
      timeline: { ...three, modelChanged: true }
    });
    expect(count(markup, 'overview-story-model')).toBe(3);
    expect(markup).toContain('claude');
  });

  it('draws the coverage line only on the rows that carry the flag', () => {
    const markup = draw({
      timeline: timeline({
        entries: [entry({ gapBefore: true }), entry({ gapBefore: false })]
      })
    });
    expect(markup.split(STORY_GAP).length - 1).toBe(1);
  });

  it('says a row can be pressed, to a keyboard and to a screen reader', () => {
    const markup = draw({ timeline: three, expanded: 1 });
    expect(count(markup, 'overview-story-row')).toBe(3);
    expect(markup.split('role="button"').length - 1).toBe(3);
    expect(markup.split('tabindex="0"').length - 1).toBe(3);
    // The open row says it is open and the other two say they are not.
    expect(markup.split('aria-expanded="true"').length - 1).toBe(1);
    expect(markup.split('aria-expanded="false"').length - 1).toBe(2);
  });

  it('marks the row the keyboard is on and the row that is open', () => {
    const markup = draw({ timeline: three, cursor: 1, expanded: 2 });
    expect(markup).toContain('overview-story-row cursor');
    expect(markup).toContain('overview-story-row open');
  });
});

describe('a pressed row', () => {
  const wide = timeline({ entries: [entry({ fromTurn: 0, toTurn: 9 })] });

  it('draws the turns behind the sentence', () => {
    const markup = draw({
      timeline: wide,
      expanded: 0,
      turns: [turn({ index: 8 }), turn({ index: 9 })]
    });
    expect(count(markup, 'overview-story-turns')).toBe(1);
    expect(markup).toContain('Fix the flaky restore test.');
  });

  it('says in words when only the newest turns of a stretch are shown', () => {
    const markup = draw({
      timeline: wide,
      expanded: 0,
      turns: [turn({ index: 8 }), turn({ index: 9 })]
    });
    expect(markup).toContain(STORY_TURNS_CLIPPED);
  });

  it('says nothing about a cap when the whole stretch is there', () => {
    const markup = draw({
      timeline: timeline({ entries: [entry({ fromTurn: 0, toTurn: 1 })] }),
      expanded: 0,
      turns: [turn({ index: 0 }), turn({ index: 1 })]
    });
    expect(markup).not.toContain(STORY_TURNS_CLIPPED);
  });

  it('says so when the turns have left the record', () => {
    const markup = draw({ timeline: wide, expanded: 0, turns: [] });
    expect(markup).toContain(STORY_TURNS_GONE);
  });

  it('draws nothing extra while the turns are still being read', () => {
    const markup = draw({ timeline: wide, expanded: 0, turns: null });
    expect(count(markup, 'overview-story-turns')).toBe(0);
  });
});

describe('storyTurnsClipped', () => {
  it('is false when the whole stretch is there', () => {
    expect(
      storyTurnsClipped(entry({ fromTurn: 0, toTurn: 2 }), [
        turn(),
        turn(),
        turn()
      ])
    ).toBe(false);
  });

  it('is true when fewer turns came back than the stretch covers', () => {
    expect(
      storyTurnsClipped(entry({ fromTurn: 0, toTurn: 9 }), [turn(), turn()])
    ).toBe(true);
  });

  it('is false with no turns at all, because that is a different sentence', () => {
    expect(storyTurnsClipped(entry({ fromTurn: 0, toTurn: 9 }), [])).toBe(
      false
    );
  });
});
