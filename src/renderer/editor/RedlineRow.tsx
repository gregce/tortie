/**
 * RedlineRow, the row Tortie draws inside the slot @pierre/diffs hands back
 * (Phase 191).
 *
 * Pierre cannot draw a redline and no option will make it: every one of its
 * diff lines is a grid item of a subgrid, so `display: inline` on it computes
 * to `block` by the CSS specification, proved in the running app by forcing
 * the declaration into Pierre's own shadow root and watching the colour and
 * the strikethrough in the same rule both take while the display did not
 * (docs/research/74-redline-in-the-diff-view.md §3).
 *
 * So this is TORTIE'S OWN subtree, in the LIGHT DOM, mounted through the
 * `renderAnnotation` slot. Three consequences follow and each is deliberate:
 *
 *   - `src/renderer/styles/tokens.css` reaches it, so the colours are
 *     `--error` and `--success` with NO NEW TOKEN and no literal anywhere.
 *   - Pierre's Shiki tokens live only inside its shadow rows and never reach
 *     here, so CHANGE COLOUR WINS ABSOLUTELY and this row carries no syntax
 *     colour at all. That is structural rather than a preference: `color` is
 *     one property and a token colour and `var(--error)` cannot both have it.
 *     Nothing is lost, because Pierre's own two rows sit directly above, still
 *     monospace, still syntax coloured, still carrying their change bars. The
 *     reader gets both readings at once.
 *   - The elements are real `<del>` and `<ins>` rather than styled spans, so
 *     when the copy handler cannot run (a drag that ends outside the app, an
 *     assistive technology's own copy) the semantics are still right.
 *
 * The row is an EXTRA row and nothing is merged, so nothing loses a number.
 * Pierre gives an annotation row a gutter cell with no line number and no
 * change mark, which is correct: the row is a reading of a PAIR rather than a
 * line of either file, and a number on it would have to be a lie about one
 * side.
 *
 * THE ONE TAG, and it is here because the alternative is a lie. When the only
 * difference between the two sides is whitespace, ./redline's normalisation
 * has already made them identical and the row would draw the sentence with
 * nothing marked at all, under a pair of rows the diff has painted red and
 * green (./redline ruling 5). Two words on the resting face and the
 * explanation on hover, which is "just enough words". It carries
 * `data-redline-tag` so ./redline-copy takes it back off the clipboard: it is
 * Tortie talking about the change, not part of the change.
 */

import React from 'react';
import type { RedlineBlock } from './redline';
import './redline.css';

export interface RedlineRowProps {
  block: RedlineBlock;
}

export function RedlineRow({ block }: RedlineRowProps): React.JSX.Element {
  return (
    <div className="ed-redline" data-redline="">
      {block.whitespaceOnly ? (
        <span
          className="ed-redline-tag"
          data-redline-tag=""
          title="The words are the same and only the spacing changed. This row joins a block into one sentence and collapses every run of spacing, so it is the one change it cannot draw. The two rows above show it."
        >
          Spacing only
        </span>
      ) : null}
      {block.runs.map((run, index) =>
        run.kind === 'del' ? (
          <del key={index} data-redline-del="">
            {run.text}
          </del>
        ) : run.kind === 'ins' ? (
          <ins key={index} data-redline-ins="">
            {run.text}
          </ins>
        ) : (
          <span key={index}>{run.text}</span>
        )
      )}
    </div>
  );
}
