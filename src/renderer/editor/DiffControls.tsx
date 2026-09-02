/**
 * DiffControls — how this diff is drawn, at the head of the diff surface
 * (Phase 185).
 *
 * It lives HERE, in the diff view, rather than in Settings: it changes the
 * thing directly underneath it and you reach for it while you are reading a
 * change, not while you are configuring an app. The two answers are one app
 * setting each, not per file and not per project, so a diff opened afterwards
 * is drawn the way the last one was.
 *
 * Two controls, and they are different KINDS of thing even though they sit in
 * one row:
 *   Inline    — @pierre/diffs' `lineDiffType`, four modes, described in
 *               ../pierre/diff-view-prefs. This one cannot be delivered on
 *               the surface's own options prop while a worker pool is attached
 *               (the pool's copy wins), so PierreDiff also pushes it to the
 *               pool through `applyInlineDiffMode`.
 *   Backgrounds — @pierre/diffs' `disableBackground`, which is the ONLY gate
 *               on the full-width row wash. Pierre's stylesheet computes that
 *               wash inside a `:where([data-background])` block, and the
 *               option's whole effect is removing that attribute from the
 *               wrapper; with it gone every changed row falls back to
 *               `--diffs-computed-diff-line-bg: var(--diffs-computed-decoration-bg)`,
 *               which is the page background. The change bars and the inline
 *               spans are styled outside that block and survive, so the diff
 *               still says which side is which.
 *
 * Under "just enough words": one word per choice on the resting face, the
 * detail on hover. There is no paragraph here explaining what Phrases means.
 *
 * ONE LINE MAY FOLLOW THE CONTROLS, and it is the whole of Phase 190. The
 * operator changed Inline between Words, Phrases and Characters on his own
 * file and nothing happened, which read as broken. Research 74 measured why:
 * his edit was a pure word deletion, and on that shape jsdiff returns the
 * same parts to all three, so the three modes draw byte identical markup.
 * Nothing was broken, and the control said nothing about it. Of the three
 * options the backlog weighed, this is option 2: when the mode the person
 * chose draws exactly what another mode would draw over this diff, one short
 * muted line names the modes that coincide, and when the modes differ the
 * resting face carries nothing. Not option 1, say nothing, because the cost
 * that made it the fallback was measured away, being under a millisecond on
 * a real diff and a few milliseconds in the worst case the cap allows, once
 * per diff open. Not option 3, greying the buttons that cannot differ, because
 * the answer is per diff rather than per visible window, so nothing here
 * flickers on scroll, and greying would compute the same thing anyway. The
 * comparison, its bounds and its measured cost live in
 * ../pierre/inline-diff-agreement; this file only draws the line it hands
 * back. The four modes, their names and what they draw when they do differ
 * are untouched.
 *
 * There is NO redline control here, and that is a decision rather than an
 * omission. Phase 191 put one in this row and the operator asked for it to go
 * the same day: the redline is a reading of the DOCUMENT, not a way of drawing
 * the diff, so it belongs in a view of its own beside Diff and File (Phase
 * 194) and the diff surface draws only what Pierre draws.
 */

import React from 'react';
import { Codicon } from '../icons';
import { INLINE_DIFF_MODES } from '../pierre/diff-view-prefs';
import { inlineDiffAgreementLine } from '../pierre/inline-diff-agreement';
import type { InlineDiffAgreement } from '../pierre/inline-diff-agreement';
import { useEditor } from './store';

export interface DiffControlsProps {
  /**
   * Whether the modes draw the diff underneath the same, computed once per
   * diff by PierreDiff. Null while there is no exact diff to say anything
   * about, which draws nothing.
   */
  agreement: InlineDiffAgreement | null;
}

export function DiffControls({ agreement }: DiffControlsProps): React.JSX.Element {
  const inlineMode = useEditor((s) => s.diffInlineMode);
  const backgrounds = useEditor((s) => s.diffBackgrounds);
  const setInlineMode = useEditor((s) => s.setDiffInlineMode);
  const setBackgrounds = useEditor((s) => s.setDiffBackgrounds);
  const sameLine = inlineDiffAgreementLine(agreement, inlineMode);

  return (
    <div className="ed-diff-bar">
      <span className="ed-diff-bar-label">Inline</span>
      <div className="ed-mode" role="group" aria-label="Inline highlighting">
        {INLINE_DIFF_MODES.map((mode) => (
          <button
            key={mode.id}
            type="button"
            className={`ed-mode-opt${inlineMode === mode.id ? ' on' : ''}`}
            aria-pressed={inlineMode === mode.id}
            title={mode.hint}
            onClick={() => setInlineMode(mode.id)}
          >
            {mode.label}
          </button>
        ))}
      </div>
      <button
        type="button"
        className={`ed-icon-btn${backgrounds ? ' on' : ''}`}
        aria-pressed={backgrounds}
        aria-label="Changed row color"
        title={
          backgrounds
            ? 'Stop coloring the whole changed row'
            : 'Color the whole changed row'
        }
        onClick={() => setBackgrounds(!backgrounds)}
      >
        <Codicon name="paintcan" size="md" />
      </button>
      {/* Last in the row, so nothing a person already knows the place of
          moves when it comes and goes. It takes what width is left and
          truncates rather than wrapping, with the whole line on hover. */}
      {sameLine !== null ? (
        <span className="ed-diff-bar-note" title={sameLine}>
          {sameLine}
        </span>
      ) : null}
    </div>
  );
}
