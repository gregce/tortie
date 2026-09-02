/**
 * The Architecture view's slice of the 36px HEADER BAND (DESIGN-SPEC S3).
 *
 *     ARCHITECTURE                                 ▦  ⟳
 *
 * The sidebar owns one band, and exactly one label and one hairline cross it
 * whichever view is showing (S1). That is why this is its own component rather
 * than the top of the list: the band is a region of the window, not a part of
 * the view underneath it, and every other sidebar view splits the same way.
 *
 * TWO ACTIONS SINCE PHASE 201, both icons with a hover title, as research 77
 * section 7 draws them. The map opens or focuses the map tab through the one
 * door the View menu row uses; it was a full width button at the top of the
 * face and it is not what a person opens the sidebar for. The refresh re-reads
 * the code and checks any promises against it. It is here for the reason
 * Context's refresh is here rather than for symmetry: the checkers ride the
 * file watcher, and a watcher cannot see a directory that did not exist when
 * the view opened. Naming that costs one 16px glyph where hiding it would cost
 * the person an afternoon of wondering why a number will not move.
 *
 * NO COUNT IN THE BAND. The verdict strip carries the numbers, and a number in
 * the band would be the count badge this phase refuses: a figure that sits
 * there forever and rises on its own is the dashboard the Zen names.
 *
 * THE HEADER USES `.view-header`, which is the class Phase 149 bound to
 * `--view-heading-text`. A hand written font size here would be the drift that
 * phase existed to end.
 */

import React, { useMemo } from 'react';
import { localPathOf, targetOfProject } from '@shared/workspace-target';
import { Codicon } from '../icons';
import { useApp } from '../state/store';
import { mapAvailable } from './bridge';
import {
  ARCH_CHECK_BODY,
  ARCH_CHECK_LABEL,
  ARCH_MAP_OPEN_BODY,
  ARCH_MAP_OPEN_TITLE,
  ARCH_VIEW_TITLE
} from './copy';
import { openArchMap } from './open-map';
import { useArch } from './store';

/** The band's face, pure over its props so the unit suite can render it. */
export function ArchHeaderFace({
  progressLabel,
  canDraw,
  canCheck,
  onMap,
  onCheck
}: {
  /** What main says it is doing, as a fraction, or null when nothing is in flight. */
  progressLabel: string | null;
  canDraw: boolean;
  canCheck: boolean;
  onMap: () => void;
  onCheck: () => void;
}): React.JSX.Element {
  return (
    <div className="view-header" data-slot="view-header">
      <span className="view-header-title">{ARCH_VIEW_TITLE}</span>
      <span className="view-header-spacer" />
      {progressLabel !== null ? (
        <span className="arch-progress" aria-live="polite">
          {progressLabel}
        </span>
      ) : null}
      {/* The one door from the cockpit to the map tab (Phase 160), an icon
          since Phase 201. `arch-map-open` is the class the shot harness and
          the Phase 165 probe press, so the door keeps its name. */}
      <button
        type="button"
        className="icon-btn view-header-action arch-map-open"
        aria-label={ARCH_MAP_OPEN_TITLE}
        title={canDraw ? ARCH_MAP_OPEN_BODY : 'This build cannot draw the map.'}
        disabled={!canDraw}
        onClick={onMap}
      >
        <Codicon name="map" size="lg" />
      </button>
      <button
        type="button"
        className="icon-btn view-header-action"
        aria-label={ARCH_CHECK_LABEL}
        title={ARCH_CHECK_BODY}
        disabled={!canCheck}
        onClick={onCheck}
      >
        <Codicon name="refresh" size="lg" />
      </button>
    </div>
  );
}

export function ArchHeader(): React.JSX.Element {
  const status = useArch((s) => s.status);
  const checking = useArch((s) => s.checking);
  const progress = useArch((s) => s.progress);
  const check = useArch((s) => s.check);
  const projects = useApp((s) => s.projects);
  const activeProjectId = useApp((s) => s.activeProjectId);
  const repoPath = useMemo(() => {
    const project = projects.find((p) => p.id === activeProjectId) ?? null;
    return localPathOf(targetOfProject(project));
  }, [projects, activeProjectId]);

  // What main says it is doing, as a fraction rather than a spinner. It is the
  // one moving number on this surface and it exists only while a run is in
  // flight, so nothing here rises on its own.
  const progressLabel =
    checking && progress !== null && progress.total > 0
      ? `${String(progress.done)}/${String(progress.total)}`
      : null;

  return (
    <ArchHeaderFace
      progressLabel={progressLabel}
      canDraw={repoPath !== null && mapAvailable()}
      canCheck={status !== 'unavailable' && status !== 'elsewhere' && !checking}
      onMap={() => {
        if (repoPath !== null) openArchMap(repoPath);
      }}
      onCheck={() => void check()}
    />
  );
}
