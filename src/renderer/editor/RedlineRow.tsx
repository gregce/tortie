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
 * ## THE LEAF ATTRIBUTE CONTRACT (Phase 251, research 114 §6.5)
 *
 * TWO BUILDERS DEPEND ON THIS AND A NAME THAT DRIFTS BREAKS A PICTURE IN
 * SILENCE, so the whole contract is written here rather than left to be found:
 * this file EMITS the attributes and ./redline.css keys on them, and neither
 * half means anything without the other. They are computed by `redlineLeaves`
 * in ./redline-document, which is arithmetic over the run list and is where
 * `npm run conformance:redline` drives them under node.
 *
 * Every one is a BOOLEAN ATTRIBUTE, present with an empty value or absent, and
 * every one is on a `<del>` or an `<ins>` and never on a plain run, because
 * every one of them is a rule about a MARK.
 *
 *   `data-redline-wordless`  The mark has no letter and no digit and is not
 *                            only whitespace, being a table's `|` and its
 *                            `---`. NO WASH. It keeps its colour and its
 *                            strikethrough, because a wash on furniture reads
 *                            as a change to the furniture.
 *   `data-redline-blank`     The mark is only whitespace.
 *   `data-redline-spacing`   The mark is only whitespace AND is a real spacing
 *                            change, being one with an opposite-kind
 *                            whitespace mark beside it. IT KEEPS ITS WASH,
 *                            which is ./redline ruling 5 exactly and no wider,
 *                            and loses only the strikethrough it had no glyph
 *                            to draw on. A blank mark WITHOUT this attribute
 *                            takes no wash.
 *   `data-redline-lone`      The mark is whitespace and its whole CHANGE holds
 *                            nothing a reader can read, so with the wash and
 *                            the strikethrough both correctly withheld the
 *                            reader would be shown nothing at all. The
 *                            stylesheet draws it as a bar in the mark's own
 *                            colour THROUGH A PSEUDO-ELEMENT, which is what
 *                            keeps it out of the node count, the text nodes,
 *                            the leaf walk and the clipboard.
 *   `data-redline-drop`      The deleted copy of a plain-dashes table
 *                            separator row whose insertion is one too. It is
 *                            NOT DRAWN, and not drawn is not the same as
 *                            absent: only the stylesheet hides it, its text
 *                            node is present, and both projections, the copy
 *                            handler's clone and every leaf walk read exactly
 *                            what they read before.
 *
 * THE ATTRIBUTE NAMES BEGIN `data-redline-` ON PURPOSE and the wrapper's begin
 * `data-change`: ./redline-copy takes `[data-redline-del]` off a clone, so a
 * name in this family belongs to something that is part of the change, and a
 * name in that one to something that is Tortie talking about it.
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
import type { RedlineBlock, RedlineRun } from './redline';
import { redlineLeaves } from './redline-document';
import type { RedlineLeaf } from './redline-document';
import './redline.css';

export interface RedlineRowProps {
  block: RedlineBlock;
}

/**
 * The runs themselves, as real `<del>`, `<ins>` and plain spans. Shared by
 * the row and by ./RedlineDocument (Phase 194), so the document and the row
 * draw one change the same way from one piece of code.
 */
/**
 * The leaf attributes for one mark, as the contract above spells them. An
 * absent attribute and a false one are the same thing to a selector, so only
 * the true ones are emitted and a mark with nothing to say carries nothing.
 */
function leafAttributes(leaf: RedlineLeaf | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (leaf === undefined) return out;
  if (leaf.wordless) out['data-redline-wordless'] = '';
  if (leaf.blank) out['data-redline-blank'] = '';
  if (leaf.spacing) out['data-redline-spacing'] = '';
  if (leaf.lone) out['data-redline-lone'] = '';
  if (leaf.drop) out['data-redline-drop'] = '';
  return out;
}

export function RedlineRuns({
  runs
}: {
  runs: readonly RedlineRun[];
}): React.JSX.Element {
  // PHASE 251. Asked once for the whole list rather than per run, because
  // three of the five answers are about a run's NEIGHBOURS or about the whole
  // change it belongs to. ./RedlineDocument hands this exactly one change's
  // runs and ./RedlineRow one block's, and `redlineLeaves` groups either the
  // same way, being research 83 B.2's unit.
  const leaves = redlineLeaves(runs);
  return (
    <>
      {runs.map((run, index) =>
        run.kind === 'del' ? (
          // PHASE 237. `contenteditable="false"` makes a deletion an atomic
          // island: research 83 D.2 measured four arrow presses to cross a
          // four-character deletion without it and ONE with it, and research
          // 97 §2.4 re-derived that on this markup. It is on every deletion
          // and not only the document's, because the attribute means nothing
          // outside an editable ancestor and the row and the document draw
          // one change from one piece of code.
          <del
            key={index}
            data-redline-del=""
            contentEditable={false}
            {...leafAttributes(leaves[index])}
          >
            {run.text}
          </del>
        ) : run.kind === 'ins' ? (
          <ins key={index} data-redline-ins="" {...leafAttributes(leaves[index])}>
            {run.text}
          </ins>
        ) : (
          <span key={index}>{run.text}</span>
        )
      )}
    </>
  );
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
      <RedlineRuns runs={block.runs} />
    </div>
  );
}
