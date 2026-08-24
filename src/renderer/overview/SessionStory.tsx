/**
 * The story of what a model wrote about one session (Phase 143).
 *
 * This stands in for the conversation inside the one session view, and the
 * session's own header stays where it was, so the name of what you are
 * reading never leaves the screen.
 *
 * The panel always opens with a line saying what a person is reading, because
 * these sentences are a model's account and the turns are the real record. It
 * then draws either one line saying there is no story, or the list newest
 * first. Each row carries the sentence verbatim, the time that sentence was
 * written, the model that wrote it when the rows do not agree on one, and a
 * line saying plainly when a stretch of the conversation is missing.
 *
 * Pressing a row draws the turns behind it, through the same TurnBlock the
 * conversation uses, so the two surfaces cannot drift apart.
 *
 * The arrows are taken here, on a capture phase listener on window, for the
 * time the panel is on screen, and never out of a control that answers them
 * itself. The ask rail's own key seam in ./session-keys.ts is left alone,
 * because two owners of one key map is how these drift apart.
 */

import React, { useEffect, useRef } from 'react';
import type { SessionStatus } from '@shared/types';
import { formatTurnClock } from './clock';
import {
  STORY_CLOCK_NOTE,
  STORY_GAP,
  STORY_LEAD,
  STORY_MODEL_LEAD,
  STORY_NOTHING_YET,
  STORY_NO_MODEL,
  STORY_TURNS_CLIPPED,
  STORY_TURNS_GONE,
  WRITTEN_LEAD
} from './copy';
import type { StoryEntry, StoryState } from './story';
import {
  moveStoryCursor,
  pressStoryRow,
  setStoryCursor,
  storySnapshot,
  storyTurnsClipped
} from './story';
import { TurnBlock } from './TurnBlock';
import './story.css';

export interface SessionStoryProps {
  /** The panel's own store, subscribed by the conversation above it. */
  state: StoryState;
  /** Read for the turn blocks under a pressed row. Never written here. */
  status: SessionStatus;
  now: number;
}

interface StoryTurnsProps {
  entry: StoryEntry;
  state: StoryState;
  status: SessionStatus;
  now: number;
}

/** The turns behind one pressed row. */
function StoryTurns(props: StoryTurnsProps): React.JSX.Element | null {
  const { entry, state, status, now } = props;
  const turns = state.turns;
  if (turns === null) {
    // The read is in flight. Silence is right for a wait this short.
    return null;
  }
  return (
    <div
      className="overview-story-turns"
      onClick={(e) => {
        // A press inside the turns must not fold the row it opened.
        e.stopPropagation();
      }}
    >
      {state.turnsError !== null ? (
        <div className="overview-story-note" data-quoted>
          {state.turnsError}
        </div>
      ) : null}
      {state.turnsError === null && turns.length === 0 ? (
        <div className="overview-story-note">{STORY_TURNS_GONE}</div>
      ) : null}
      {storyTurnsClipped(entry, turns) ? (
        <div className="overview-story-note">{STORY_TURNS_CLIPPED}</div>
      ) : null}
      {turns.map((turn) => (
        <TurnBlock key={turn.index} turn={turn} status={status} now={now} />
      ))}
    </div>
  );
}

/**
 * The row the keyboard is standing on right now, or undefined when it is
 * standing somewhere else.
 *
 * This is read at the moment an arrow is pressed rather than remembered,
 * because it is the honest answer to where a person is. A focus that landed
 * inside the turns under a row counts as that row, which is why the row is
 * looked up by walking outwards.
 */
function focusedRow(list: HTMLElement | null): number | undefined {
  const active = document.activeElement;
  if (list === null || !(active instanceof HTMLElement)) return undefined;
  if (!list.contains(active)) return undefined;
  const row = active.closest('[data-story-row]');
  if (row === null) return undefined;
  const at = Number(row.getAttribute('data-story-row'));
  return Number.isFinite(at) ? at : undefined;
}

/** One drawn row by its position, straight out of the list. */
function rowAt(
  list: HTMLElement | null,
  index: number
): HTMLElement | undefined {
  return list?.querySelectorAll<HTMLElement>('.overview-story-row')[index];
}

/**
 * True when this key press belongs to whatever has focus rather than to the
 * panel.
 *
 * The panel takes the arrows and Return for as long as it is on screen, and
 * that must never take a key out of a control that answers it itself. A text
 * field answers every key, so nothing is taken while one has focus. A button
 * or a link answers Return, so Return is left to it, which is why pressing
 * Return on the header's own press target closes the panel rather than opening
 * a row. The arrows do nothing on a button, so the walk still works after a
 * person opens the panel by pressing it.
 *
 * A row is in that list too, because a row can be pressed and it answers
 * Return itself. That is what keeps the row a person is on and the row that
 * opens the same one, whether they arrived by walking with the arrows or by
 * stepping onto it with Tab. Three things below keep that promise: Tab onto a
 * row moves the highlight to it, the arrows walk from the row the keyboard is
 * on rather than from the highlight, and the arrows move the keyboard along
 * with the highlight. So there is only ever one row a person is on.
 */
function belongsToTheControl(e: KeyboardEvent): boolean {
  const target = e.target instanceof HTMLElement ? e.target : null;
  const control =
    target?.closest(
      'button, a[href], input, textarea, select, [contenteditable="true"], [data-story-row]'
    ) ?? null;
  if (control === null) return false;
  const pressable =
    control.tagName === 'BUTTON' ||
    control.tagName === 'A' ||
    control.hasAttribute('data-story-row');
  return pressable ? e.key === 'Enter' : true;
}

export function SessionStory(props: SessionStoryProps): React.JSX.Element {
  const { state, status, now } = props;
  const listRef = useRef<HTMLDivElement | null>(null);

  // The arrows walk the rows and Return presses the row the keyboard is on,
  // for exactly as long as the panel is mounted. Escape is not taken here,
  // because the window ladder in ../app/keyboard.ts owns it and asks the
  // store directly.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      // A chorded arrow belongs to the window ladder in ../app/keyboard.ts,
      // which moves the focus between the splits and is listening before this
      // panel is on screen. Only the bare keys are taken here, so one press
      // never does two things.
      if (e.metaKey || e.altKey || e.ctrlKey) return;
      if (belongsToTheControl(e)) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        // The walk starts from the row the keyboard is on, so stepping onto a
        // row with Tab and then walking moves away from that row rather than
        // from wherever the highlight was left.
        const standingOn = focusedRow(listRef.current);
        moveStoryCursor(e.key === 'ArrowDown' ? 1 : -1, standingOn);
        // And the keyboard comes with it, because a row answers Return itself
        // and a keyboard left behind would open a different row from the one a
        // person is looking at. Only a keyboard that was already on a row is
        // moved, so nothing is taken from anywhere else on the page.
        if (standingOn !== undefined) {
          rowAt(listRef.current, storySnapshot().cursor)?.focus({
            preventScroll: true
          });
        }
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        pressStoryRow(storySnapshot().cursor);
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
    };
  }, []);

  // The row the keyboard is on stays on screen. Nothing else scrolls, and
  // nothing here moves the keyboard: the walk above owns that, so there is one
  // place that decides where a person is standing.
  useEffect(() => {
    rowAt(listRef.current, state.cursor)?.scrollIntoView({ block: 'nearest' });
  }, [state.cursor]);

  const timeline = state.timeline;
  const entries = timeline?.entries ?? [];

  return (
    <div className="overview-story" ref={listRef}>
      <div className="overview-story-lead">
        <div>{STORY_LEAD}</div>
        <div className="overview-story-note">{STORY_CLOCK_NOTE}</div>
      </div>

      {state.error !== null ? (
        <div className="overview-story-empty" data-quoted>
          {state.error}
        </div>
      ) : null}

      {state.error === null && timeline !== null && !timeline.chosen ? (
        <div className="overview-story-empty">{STORY_NO_MODEL}</div>
      ) : null}

      {state.error === null && timeline !== null && timeline.chosen
        ? entries.length === 0
          ? <div className="overview-story-empty">{STORY_NOTHING_YET}</div>
          : entries.map((entry, i) => {
              const clock = formatTurnClock(entry.writtenAt, now);
              const marks = [
                i === state.cursor ? ' cursor' : '',
                i === state.expanded ? ' open' : ''
              ].join('');
              return (
                <div
                  key={i}
                  className={`overview-story-row${marks}`}
                  data-story-row={i}
                  // A row is a press target, so it says so to a keyboard and
                  // to a screen reader as well as to a pointer. Tab reaches
                  // it, Return and the space bar press it, and it says
                  // whether the turns behind it are open.
                  role="button"
                  tabIndex={0}
                  aria-expanded={i === state.expanded}
                  onClick={() => {
                    pressStoryRow(i);
                  }}
                  onFocus={(e) => {
                    // Tab stepped onto this row, so the highlight comes with
                    // it. A focus that rose out of the turns below is not a
                    // step onto the row and moves nothing.
                    if (e.target !== e.currentTarget) return;
                    setStoryCursor(i);
                  }}
                  onKeyDown={(e) => {
                    // Only the row's own press, never a press that rose out
                    // of the turns it opened.
                    if (e.target !== e.currentTarget) return;
                    if (e.metaKey || e.altKey || e.ctrlKey) return;
                    if (e.key !== 'Enter' && e.key !== ' ') return;
                    e.preventDefault();
                    e.stopPropagation();
                    pressStoryRow(i);
                  }}
                >
                  <div className="overview-story-head">
                    {/* The model's own sentence, verbatim. Its digits are
                        accounted for as quoted text, exactly as an ask is. */}
                    <span className="overview-story-text" data-quoted>
                      {entry.text}
                    </span>
                    {clock !== null ? (
                      <span className="overview-story-clock">
                        {WRITTEN_LEAD}
                        <span data-clock>{clock}</span>
                      </span>
                    ) : null}
                  </div>
                  {timeline.modelChanged ? (
                    <div className="overview-story-model">
                      {STORY_MODEL_LEAD}
                      {/* An agent id and a model name are outside words. */}
                      <span data-quoted>
                        {entry.harness}
                        {' · '}
                        {entry.model}
                      </span>
                    </div>
                  ) : null}
                  {entry.gapBefore ? (
                    <div className="overview-story-gap">{STORY_GAP}</div>
                  ) : null}
                  {i === state.expanded ? (
                    <StoryTurns
                      entry={entry}
                      state={state}
                      status={status}
                      now={now}
                    />
                  ) : null}
                </div>
              );
            })
        : null}
    </div>
  );
}
