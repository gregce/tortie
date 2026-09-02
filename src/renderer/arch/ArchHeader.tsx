/**
 * The Architecture view's slice of the 36px HEADER BAND (DESIGN-SPEC S3).
 *
 *     ARCHITECTURE                                    ⟳
 *
 * The sidebar owns one band, and exactly one label and one hairline cross it
 * whichever view is showing (S1). That is why this is its own component rather
 * than the top of the list: the band is a region of the window, not a part of
 * the view underneath it, and every other sidebar view splits the same way.
 *
 * ONE ACTION, and it is the re-check. It is here for the reason Context's
 * refresh is here rather than for symmetry: the checkers ride the file
 * watcher, and a watcher cannot see a directory that did not exist when the
 * view opened. Naming that costs one 16px glyph where hiding it would cost the
 * person an afternoon of wondering why a number will not move.
 *
 * NO COUNT IN THE BAND. The verdict strip carries the numbers, and a number in
 * the band would be the count badge this phase refuses: a figure that sits
 * there forever and rises on its own is the dashboard the Zen names.
 *
 * THE HEADER USES `.view-header`, which is the class Phase 149 bound to
 * `--view-heading-text`. A hand written font size here would be the drift that
 * phase existed to end.
 */

import React from 'react';
import { Codicon } from '../icons';
import { ARCH_VIEW_TITLE } from './copy';
import { useArch } from './store';

export function ArchHeader(): React.JSX.Element {
  const status = useArch((s) => s.status);
  const checking = useArch((s) => s.checking);
  const progress = useArch((s) => s.progress);
  const check = useArch((s) => s.check);

  // What main says it is doing, as a fraction rather than a spinner. It is the
  // one moving number on this surface and it exists only while a run is in
  // flight, so nothing here rises on its own.
  const progressLabel =
    checking && progress !== null && progress.total > 0
      ? `${String(progress.done)}/${String(progress.total)}`
      : null;

  return (
    <div className="view-header" data-slot="view-header">
      <span className="view-header-title">{ARCH_VIEW_TITLE}</span>
      <span className="view-header-spacer" />
      {progressLabel !== null ? (
        <span className="arch-progress" aria-live="polite">
          {progressLabel}
        </span>
      ) : null}
      <button
        type="button"
        className="icon-btn view-header-action"
        aria-label="Check the promises again"
        title="Check the promises against the code again. The file watcher cannot see a folder that did not exist when this view opened."
        disabled={
          status === 'unavailable' || status === 'elsewhere' || checking
        }
        onClick={() => void check()}
      >
        <Codicon name="refresh" size="lg" />
      </button>
    </div>
  );
}
