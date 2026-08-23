/**
 * The safety line both folder-making dialogs show: exactly what will be made,
 * and exactly where, before anything is written.
 *
 * It exists as its own module because it arrived twice. New Project shipped it
 * in Phase 12.9 and the Phase 18.6 clone dialog copied it verbatim, eleven
 * lines including the 52-character truncation — which is precisely the shape
 * that goes on to drift, because the next person to widen one dialog widens
 * one number and not the other.
 *
 * The `<p>` keeps its height when there is nothing to show, so neither dialog
 * jumps as the user finishes typing a name. `aria-live="polite"` is what makes
 * the path a thing a screen reader reads out when it changes, rather than a
 * thing only a sighted user is warned by.
 *
 * The styles (`.np-target`, `.np-target-label`, `.np-target-path`) live in
 * src/renderer/styles/app.css and are shared, exactly as `.field` and `.btn`
 * are. The `np-` prefix is where they were born and is left alone: renaming a
 * class costs a sweep and buys nothing a comment cannot say.
 */

import React from 'react';
import { displayPath, truncateMiddle } from '../format';

/** How much of the path is shown before truncateMiddle folds the middle. */
const TARGET_PATH_CHARS = 52;

export interface TargetPathLineProps {
  /** The absolute path that will be created, or null while it is unknowable. */
  target: string | null;
  /** The verb, e.g. "Creates". */
  label?: string;
}

export function TargetPathLine({
  target,
  label = 'Creates'
}: TargetPathLineProps): React.JSX.Element {
  return (
    <p className="np-target" aria-live="polite">
      {target !== null ? (
        <>
          <span className="np-target-label">{label}</span>
          {/* The full path is on the title, so a truncated middle never hides
              which of two similarly named folders this is. */}
          <code className="np-target-path" title={target}>
            {truncateMiddle(displayPath(target), TARGET_PATH_CHARS)}
          </code>
        </>
      ) : null}
    </p>
  );
}
