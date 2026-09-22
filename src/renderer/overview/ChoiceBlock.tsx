/**
 * Phase 312 — the choices the agent drew, as ONE block drawn in three places.
 *
 * Catch Me Up has three levels and the level is decided by where the keyboard
 * is (`level.ts`): the project's rows, one session's conversation, or a split's
 * sessions as columns. The first build of this phase drew the options on the
 * project rows alone, which is the level a person reaches LEAST from a blocked
 * session — pressing the chord while sitting in the session that is asking gives
 * the `session` level, and it drew nothing at all. Three faces meant three
 * places to forget the refusals, so there is one block and the three levels hand
 * it their rows.
 *
 * THE REFUSALS, and they are the entry's rather than this file's:
 *
 *  - DRAWN, NEVER PRESSED. No button, no anchor, no input, no `role`, no
 *    `tabindex`, no handler. Answering a choice needs a delivery door that does
 *    not exist in the tree and it is a later phase with its own ruling. The note
 *    line says so in the phone mock's own words, above the rows, so a person
 *    reads it before they reach the first thing that looks like a control.
 *  - THE MARKER IS THE AGENT'S. A `<ul>` and never an `<ol>`: an `<ol>`
 *    generates its numerals from position, and an agent that draws 1, 2, 4 would
 *    then tell a person to press 3.
 *  - EVERY WORD AND EVERY DIGIT IN IT IS THE AGENT'S, so the whole block sits
 *    under `data-quoted`, which is what the overview probe's integer rule
 *    requires of text nobody in this repository wrote.
 *  - NO CAP AND NO REDACTION HERE. Main does both before it sends, each at one
 *    definition with one call site; a second cap would be a second place the
 *    truth about what a person sees lives.
 */

import React from 'react';
import type { SessionChoiceInfo } from '@shared/ipc/sessions';
import { CHOICE_NOT_PRESSABLE, choiceOptionsFor } from '../choice';

export interface ChoiceBlockProps {
  /** What main last said about this session's choice, or nothing. */
  choice: SessionChoiceInfo | undefined;
  /**
   * What the agent is asking, composed by main out of the hook's answer and the
   * screen's reading (`src/main/activity/question.ts`), or nothing.
   *
   * It is drawn HERE and not on the row above, because it is the sentence the
   * options answer: a question with no rows under it reads as the session's
   * status, and rows with no question reads as a menu with no subject. When main
   * has one it goes above the note; when it has none the block is the rows, and
   * no placeholder is invented.
   */
  question?: string | undefined;
}

/**
 * The block, or null for a session that is not at a choice.
 *
 * Null rather than an empty element, so a row that draws no choice draws exactly
 * the markup it drew before this phase — which is the shape his no-regression
 * rule is proved against, by slicing this block out of the markup and comparing
 * the rest byte for byte.
 */
export function ChoiceBlock(props: ChoiceBlockProps): React.JSX.Element | null {
  const options = choiceOptionsFor(props.choice);
  if (options.length === 0) return null;
  const question = props.question ?? '';
  return (
    <div className="overview-line-choices" data-quoted>
      {question === '' ? null : (
        // PHASES 311 AND 312, RECONCILED. The `title` is Phase 311's measured
        // repair, carried here because this block is now the ONE cell that draws
        // the question on a row that is at a choice. That line is about 1,109px
        // at the shipped width and draws roughly 155 of the 200 characters main
        // will send, so the tail is the only place the rest of the sentence
        // exists — and the two Catch Me Up levels that never had Phase 311's cell
        // gain it here rather than being the two that cannot read a long question.
        <div className="overview-line-choices-question" title={question}>
          {question}
        </div>
      )}
      <div className="overview-line-choices-note">{CHOICE_NOT_PRESSABLE}</div>
      <ul className="overview-line-options">
        {options.map((option, n) => (
          // The key carries the POSITION as well as the marker, because the
          // marker is the agent's own and nothing makes it unique: a screen that
          // drew `1.` twice, or a half-repainted one, must still draw two rows
          // rather than collide into one.
          <li key={`${n}:${option.marker}`} className="overview-line-option">
            <span className="overview-line-option-mark">{option.marker}</span>
            <span className="overview-line-option-text">{option.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
