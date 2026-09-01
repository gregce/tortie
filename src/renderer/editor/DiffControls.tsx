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
 *   Redline     Tortie's OWN drawing, not Pierre's (Phase 191). Pierre cannot
 *               draw a redline: every one of its diff lines is a grid item of
 *               a subgrid, so its display is blockified by the specification.
 *               This toggle turns on an extra light-DOM annotation row under
 *               each changed block holding `del` and `ins` in ONE element.
 *               It is offered for PROSE ONLY and in the ONE-COLUMN layout
 *               only, and both of those are decided upstream in ./PierreDiff:
 *               a file that cannot have one never draws the button at all, and
 *               a two-column diff draws it DISABLED and says why. Absent would
 *               be worse than disabled, because `gmux.diffSideBySide` defaults
 *               on, so most people are in two columns most of the time and an
 *               absent control makes the feature invisible.
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
 */

import React from 'react';
import { Codicon } from '../icons';
import { INLINE_DIFF_MODES } from '../pierre/diff-view-prefs';
import { useEditor } from './store';

export interface DiffControlsProps {
  /**
   * Whether this file can have a redline at all. False for anything that is
   * not prose, and then the control is not rendered, which is the established
   * shape of `minimapApplies` and `diffSplitApplies` in ./EditorPanel.
   */
  redlineApplies: boolean;
  /** Two columns. The redline needs one, so it disables itself and says so. */
  sideBySide: boolean;
}

export function DiffControls({
  redlineApplies,
  sideBySide
}: DiffControlsProps): React.JSX.Element {
  const inlineMode = useEditor((s) => s.diffInlineMode);
  const backgrounds = useEditor((s) => s.diffBackgrounds);
  const redline = useEditor((s) => s.diffRedline);
  const setInlineMode = useEditor((s) => s.setDiffInlineMode);
  const setBackgrounds = useEditor((s) => s.setDiffBackgrounds);
  const setRedline = useEditor((s) => s.setDiffRedline);

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
        <Codicon name="paintcan" size={14} />
      </button>
      {redlineApplies ? (
        <button
          type="button"
          className={`ed-mode-opt ed-redline-opt${
            redline && !sideBySide ? ' on' : ''
          }`}
          aria-pressed={redline && !sideBySide}
          disabled={sideBySide}
          title={
            sideBySide
              ? 'Redline. Show the diff in one column to use it'
              : redline
                ? 'Stop marking the change up as a redline'
                : 'Mark the change up as a redline'
          }
          onClick={() => setRedline(!redline)}
        >
          Redline
        </button>
      ) : null}
    </div>
  );
}
