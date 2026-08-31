/**
 * THE MAP AND DRILL FACE of the Architecture pane (Phase 172, the view seam).
 *
 * These three components moved whole out of ArchView.tsx, bodies unchanged:
 * the door from the cockpit to the map tab, the breadcrumb echo of the one
 * drill record, and the computed parts outline for a repository with no
 * contract. ArchView.tsx composes them and re-exports nothing of them; the
 * one drill record they read stays in the store, so the pane and the map
 * tab still cannot disagree about where the person is.
 */

import React, { useEffect } from 'react';
import { Codicon } from '../icons';
import { mapAvailable, mapPartAvailable } from './bridge';
import {
  ARCH_COMPUTED_TITLE,
  ARCH_DRILL_CRUMB_LABEL,
  ARCH_DRILL_WHOLE,
  ARCH_MAP_OPEN_BODY,
  ARCH_MAP_OPEN_TITLE
} from './copy';
import { openArchMap } from './open-map';
import {
  provenanceIcon,
  provenanceTitle,
  provenanceWord
} from './provenance';
import { useArch } from './store';

/**
 * THE BREADCRUMB ECHO (Phase 161). The pane names the level even when the
 * map tab is behind another tab.
 *
 * The tab carries the primary breadcrumb; this is the cockpit's echo of the
 * same one store record, so the two can never disagree. Every earlier
 * segment is a button one click up the ladder, which is the charter's own
 * control back to the whole. It draws nothing at the whole map, so the pane
 * carries no control a person has no use for.
 */
export function DrillCrumb({
  repoPath
}: {
  repoPath: string | null;
}): React.JSX.Element | null {
  const drill = useArch((s) =>
    repoPath === null ? null : (s.drills[repoPath] ?? null)
  );
  const subject = useArch((s) =>
    repoPath === null ? null : (s.maps[repoPath]?.model?.subject ?? null)
  );
  const drillHome = useArch((s) => s.drillHome);
  const drillUp = useArch((s) => s.drillUp);
  if (repoPath === null || drill === null || drill.level === 1) return null;
  const whole = subject ?? ARCH_DRILL_WHOLE;
  return (
    <nav className="arch-crumb" aria-label={ARCH_DRILL_CRUMB_LABEL}>
      <button
        type="button"
        className="arch-crumb-seg"
        title={whole}
        onClick={() => {
          drillHome(repoPath);
        }}
      >
        {whole}
      </button>
      <span className="arch-crumb-sep" aria-hidden="true">
        {'\u203a'}
      </span>
      {drill.level === 2 ? (
        <span className="arch-crumb-here" title={drill.groupLabel}>
          {drill.groupLabel}
        </span>
      ) : (
        <>
          <button
            type="button"
            className="arch-crumb-seg"
            title={drill.groupLabel}
            onClick={() => {
              drillUp(repoPath);
            }}
          >
            {drill.groupLabel}
          </button>
          <span className="arch-crumb-sep" aria-hidden="true">
            {'\u203a'}
          </span>
          <span className="arch-crumb-here" title={drill.moduleLabel}>
            {drill.moduleLabel}
          </span>
        </>
      )}
    </nav>
  );
}

/**
 * THE MAP CONTROL (Phase 160) — the pane's way into the picture.
 *
 * The pane is the cockpit and the map is a full size tab, which is the
 * operator's surface ruling. This control is the one door from the cockpit to
 * the tab, and it goes through `openArchMap`, the same door the View menu row
 * uses, so pressing it twice focuses the one tab rather than opening a twin.
 *
 * It renders for every repository on this computer, contract or none, because
 * the map needs no contract. On a build whose preload has no map channel it
 * disables itself and the title says why, in the feature detected shape every
 * arch surface uses.
 */
export function MapSection({
  repoPath
}: {
  repoPath: string | null;
}): React.JSX.Element | null {
  if (repoPath === null) return null;
  const canDraw = mapAvailable();
  return (
    <section className="arch-map-section" aria-label={ARCH_MAP_OPEN_TITLE}>
      <button
        type="button"
        className="arch-empty-action arch-map-open"
        disabled={!canDraw}
        title={canDraw ? ARCH_MAP_OPEN_BODY : 'This build cannot draw the map.'}
        onClick={() => openArchMap(repoPath)}
      >
        <Codicon name="map" size={14} />
        <span className="arch-empty-action-title">{ARCH_MAP_OPEN_TITLE}</span>
      </button>
    </section>
  );
}

/**
 * THE COMPUTED PARTS (Phase 160, drillable since Phase 161). The cockpit's
 * outline for a repository with no contract, listing the same five to nine
 * parts the map tab draws, each with its provenance glyph and word, in the
 * model's own order.
 *
 * SINCE PHASE 161 each row is a way into its part: a click drills the shared
 * record and focuses the map tab, and the drilled row wears the same selected
 * face the contract outline uses. On a build whose preload has no scoped read
 * the rows stay exactly the read only rows Phase 160 shipped, because a row
 * that looked clickable and did nothing would be worse than a list. NO COUNT
 * ON ANY ROW. Weight belongs to the map, where it is size, and a number
 * pinned to a row here is the count badge the view refuses.
 */
export function ComputedOutline({
  repoPath
}: {
  repoPath: string | null;
}): React.JSX.Element | null {
  const entry = useArch((s) =>
    repoPath === null ? null : (s.maps[repoPath] ?? null)
  );
  const loadMap = useArch((s) => s.loadMap);
  const drill = useArch((s) =>
    repoPath === null ? null : (s.drills[repoPath] ?? null)
  );
  const drillInto = useArch((s) => s.drillInto);
  useEffect(() => {
    if (repoPath !== null) void loadMap(repoPath);
  }, [repoPath, loadMap]);
  const groups = entry?.model?.groups ?? [];
  if (repoPath === null || groups.length === 0) return null;
  const canDrill = mapPartAvailable();
  return (
    <section className="arch-outline" aria-label={ARCH_COMPUTED_TITLE}>
      <div className="section-header">
        <span className="section-toggle">{ARCH_COMPUTED_TITLE}</span>
      </div>
      <ul role="list">
        {groups.map((g) => {
          const drilled =
            drill !== null && drill.level !== 1 && drill.groupId === g.id;
          const row = (
            <>
              <Codicon name={provenanceIcon(g.provenance)} size={14} />
              <span className="arch-row-name">{g.label}</span>
              <span
                className="arch-row-prov"
                title={provenanceTitle(g.provenance)}
              >
                {provenanceWord(g.provenance)}
              </span>
            </>
          );
          return (
            <li key={g.id}>
              {canDrill ? (
                <button
                  type="button"
                  className={`arch-row arch-row-computed arch-row-drill${
                    drilled ? ' selected' : ''
                  }`}
                  aria-current={drilled ? 'true' : undefined}
                  title={`Open ${g.label} in the map`}
                  onClick={() => {
                    drillInto(repoPath, g.id, g.label);
                    openArchMap(repoPath);
                  }}
                >
                  {row}
                </button>
              ) : (
                <div className="arch-row arch-row-computed">{row}</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
