/**
 * THE READING AND THE DRILL FACE of the Architecture pane (Phase 172, the view
 * seam; the reading since Phase 201).
 *
 * The breadcrumb echo of the one drill record moved here whole from
 * ArchView.tsx, body unchanged. The reading is research 77 section 7 drawn:
 * the repository line, the model slot honestly absent, and one row per part
 * in weight order, each with its band glyph, its weight bar, the sentence rule
 * S composed, and the ten facts behind its hover. ArchView.tsx composes them;
 * the one drill record they read stays in the store, so the pane and the map
 * tab still cannot disagree about where the person is.
 *
 * JUST ENOUGH WORDS. The face is a name, a glyph, a bar and one sentence; the
 * repository line above it is the one paragraph he asked for, and it is the
 * code's, not a model's. Everything else rides a hover title. NO COUNT ON ANY
 * ROW: weight is the bar, and the numbers sit behind the hover.
 */

import React, { useEffect } from 'react';
import type { ArchMapGroup, ArchMapResult } from '@shared/ipc';
import { mapPartAvailable } from './bridge';
import {
  archBandTitle,
  archWeightTitle,
  ARCH_COMPONENTS_TITLE,
  ARCH_DRILL_CRUMB_LABEL,
  ARCH_DRILL_WHOLE,
  ARCH_MODEL_NONE,
  ARCH_MODEL_NONE_TITLE,
  ARCH_REPO_LINE_TITLE,
  ARCH_SUBJECT_TITLE
} from './copy';
import { openArchMap } from './open-map';
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
        {'›'}
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
            {'›'}
          </span>
          <span className="arch-crumb-here" title={drill.moduleLabel}>
            {drill.moduleLabel}
          </span>
        </>
      )}
    </nav>
  );
}

// ---------------------------------------------------------------------------
// The reading (Phase 201)
// ---------------------------------------------------------------------------

/** The parts in weight order, heaviest first, ties by id so the order is stable. */
export function partsByWeight(groups: readonly ArchMapGroup[]): ArchMapGroup[] {
  return [...groups].sort((a, b) => b.fileCount - a.fileCount || (a.id < b.id ? -1 : 1));
}

/** The share of the repository one part holds, as a whole percent. */
export function weightPercent(group: ArchMapGroup, fileCount: number): number {
  return fileCount <= 0 ? 0 : Math.round((100 * group.fileCount) / fileCount);
}

/** The weight bar's fill, a percent of the bar with a floor so a small part still shows. */
export function weightWidth(group: ArchMapGroup, fileCount: number): string {
  const share = fileCount <= 0 ? 0 : (100 * group.fileCount) / fileCount;
  return `${String(Math.max(4, Math.round(share * 10) / 10))}%`;
}

/** The band glyph: three bars, the lit one saying which row of the map the part sits in. */
function BandGlyph({ band }: { band: string }): React.JSX.Element {
  const lit = band === 'surface' ? 0 : band === 'foundation' ? 2 : 1;
  return (
    <svg className="rd-band" viewBox="0 0 8 12" role="img" aria-label={archBandTitle(band)}>
      <title>{archBandTitle(band)}</title>
      {[0, 1, 2].map((row) => (
        <rect
          key={row}
          className={row === lit ? 'on' : undefined}
          x="0"
          y={String(row * 5)}
          width="8"
          height="2"
          rx="1"
        />
      ))}
    </svg>
  );
}

/**
 * THE REPOSITORY LINE. The subject in the name row and rule R under it, the
 * one paragraph on the face, composed in main from the code alone.
 */
function RepositoryLine({ model }: { model: ArchMapResult }): React.JSX.Element {
  return (
    <div className="rd-repo" data-slot="arch-reading-repo">
      <div className="arch-subject" title={ARCH_SUBJECT_TITLE}>
        {model.subject}
      </div>
      <p className="rd-line" title={ARCH_REPO_LINE_TITLE}>
        {model.sentence}
      </p>
    </div>
  );
}

/**
 * THE MODEL SLOT, drawn absent. One line above the list, because a paragraph
 * of purpose reads before a list of parts, and it never pushes the list down
 * by more than this one line. Layer 2 puts a reading here under a Model chip;
 * this phase makes no model call and draws no control that would.
 */
function ModelSlot(): React.JSX.Element {
  return (
    <div className="rd-model" data-slot="arch-reading-model" title={ARCH_MODEL_NONE_TITLE}>
      <span>{ARCH_MODEL_NONE}</span>
    </div>
  );
}

/**
 * THE COMPONENTS. One row per part in weight order: the band glyph, the name,
 * the weight bar, and the sentence. The ten facts ride the row's hover in
 * their fixed order. A click drills the shared record and focuses the map
 * tab, the Phase 161 rule; on a build whose preload has no scoped read the
 * rows are read only, because a row that looked clickable and did nothing
 * would be worse than a list.
 */
export function Components({
  model,
  drilledGroupId,
  onOpen
}: {
  model: ArchMapResult;
  /** The level 1 group the shared drill record is inside, or null at the whole. */
  drilledGroupId: string | null;
  /** The drill, or null on a build whose preload has no scoped read. */
  onOpen: ((group: ArchMapGroup) => void) | null;
}): React.JSX.Element | null {
  if (model.groups.length === 0) return null;
  return (
    <section className="arch-outline rd-parts" aria-label={ARCH_COMPONENTS_TITLE}>
      <div className="section-header">
        <span className="section-toggle">{ARCH_COMPONENTS_TITLE}</span>
      </div>
      <ul role="list">
        {partsByWeight(model.groups).map((g) => {
          const drilled = drilledGroupId === g.id;
          const percent = weightPercent(g, model.fileCount);
          const face = (
            <>
              <span className="rd-part-head">
                <BandGlyph band={g.band} />
                <span className="rd-part-name" title={g.label}>
                  {g.label}
                </span>
                <span className="rd-bar" title={archWeightTitle(percent)}>
                  <i style={{ width: weightWidth(g, model.fileCount) }} />
                </span>
              </span>
              <span className="rd-part-sentence">{g.sentence}</span>
            </>
          );
          return (
            <li key={g.id} data-group={g.id}>
              {onOpen !== null ? (
                <button
                  type="button"
                  className={`rd-part arch-row-drill${drilled ? ' selected' : ''}`}
                  aria-current={drilled ? 'true' : undefined}
                  title={g.facts.join('\n')}
                  onClick={() => onOpen(g)}
                >
                  {face}
                </button>
              ) : (
                <div className="rd-part" title={g.facts.join('\n')}>
                  {face}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/**
 * THE READING'S FACE, pure over its props so the unit suite can render it to
 * static markup: the repository line, the model slot, the components.
 */
export function ReadingFace({
  model,
  drilledGroupId,
  onOpen
}: {
  model: ArchMapResult;
  drilledGroupId: string | null;
  onOpen: ((group: ArchMapGroup) => void) | null;
}): React.JSX.Element {
  return (
    <div className="rd" data-slot="arch-reading">
      <RepositoryLine model={model} />
      <ModelSlot />
      <Components model={model} drilledGroupId={drilledGroupId} onOpen={onOpen} />
    </div>
  );
}

/**
 * THE READING, top of the pane for every repository, contract or none. It
 * draws nothing until the first map read lands, and the map read never waits
 * on a scan, so a cold repository draws its boxes with thin sentences first
 * and the full ones when the `arch:mapUpdated` push follows. A row's click
 * drills the ONE shared record and focuses the map tab, the Phase 161 rule.
 */
export function Reading({
  repoPath
}: {
  repoPath: string | null;
}): React.JSX.Element | null {
  const entry = useArch((s) =>
    repoPath === null ? null : (s.maps[repoPath] ?? null)
  );
  const drill = useArch((s) =>
    repoPath === null ? null : (s.drills[repoPath] ?? null)
  );
  const drillInto = useArch((s) => s.drillInto);
  const loadMap = useArch((s) => s.loadMap);
  useEffect(() => {
    if (repoPath !== null) void loadMap(repoPath);
  }, [repoPath, loadMap]);
  const model = entry?.model ?? null;
  if (repoPath === null || model === null) return null;
  const drilledGroupId =
    drill !== null && drill.level !== 1 ? drill.groupId : null;
  const onOpen = mapPartAvailable()
    ? (group: ArchMapGroup): void => {
        drillInto(repoPath, group.id, group.label);
        openArchMap(repoPath);
      }
    : null;
  return <ReadingFace model={model} drilledGroupId={drilledGroupId} onOpen={onOpen} />;
}
