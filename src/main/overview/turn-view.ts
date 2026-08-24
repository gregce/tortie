/**
 * The one turn on the wire, and the two numbers that bound it (Phase 143).
 *
 * Two readers draw the same turn. The page's own read in ./service.ts marks
 * each turn against fresh git evidence as it goes. The story's read in
 * ./timeline.ts answers a range of turns behind one written sentence, and it
 * runs no git command at all, so it carries the verdict the page already
 * stored. Everything else about the drawn turn is the same in both, which is
 * why the mapping lives here rather than once in each file.
 *
 * This module holds no state, opens nothing and starts nothing. It is a pure
 * shape change over a row the store already handed over.
 */

import type { OverviewTurnView } from '@shared/overview';
import type { StoredTurn } from './store';

/**
 * The cap main holds `turnLimit` to, whatever the renderer asks for.
 *
 * Both readers hold themselves to it, because a second number would be a
 * second answer to the same question.
 */
export const MAX_TURN_LIMIT = 200;

/** The payload text clip. The store keeps the full text. */
export const CLIP_CHARACTERS = 4_000;

/** The one clip. Every payload text on this surface goes through it. */
export function clip(text: string): { text: string; clipped: boolean } {
  if (text.length <= CLIP_CHARACTERS) return { text, clipped: false };
  return { text: text.slice(0, CLIP_CHARACTERS), clipped: true };
}

/**
 * One stored turn as the renderer draws it.
 *
 * The caller decides the two fields a git mark answers, because only the
 * caller knows whether it looked at git at all. The page's read hands over
 * what it just measured. The story's read hands over what was stored, and
 * false for the second, because whether a turn named files outside the
 * project is a judgement about a project and that read is given a session.
 */
export function toTurnView(
  turn: StoredTurn,
  git: OverviewTurnView['git'],
  namedOnlyOutside: boolean
): OverviewTurnView {
  const ask = clip(turn.askText);
  const answer = turn.answerText === null ? null : clip(turn.answerText);
  return {
    index: turn.index,
    askText: ask.text,
    askClipped: ask.clipped,
    askAt: turn.askAt,
    answerText: answer === null ? null : answer.text,
    answerClipped: answer !== null && answer.clipped,
    answerAt: turn.answerAt,
    closed: turn.closed,
    interrupted: turn.interrupted,
    notice: turn.notice,
    git,
    namedOnlyOutside
  };
}
