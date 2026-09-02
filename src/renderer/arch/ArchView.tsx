/**
 * ARCHITECTURE — the sidebar's fifth view, beside Explorer, Search, Source
 * Control and Context (research 49 section 9.6).
 *
 * ## What it is for
 *
 * Agents write more code than a person can read. A file tree answers where
 * something is. It cannot answer what the project is made of, which parts are
 * ours and which are leaned on, or whether the shape the team agreed on is
 * still true. This view is that answer: a small set of promises written into
 * the repository under `docs/arch/`, checked against the code, with the ones
 * that broke naming the line they broke at.
 *
 * ## Why a fifth view rather than a mode of Context
 *
 * The two answer different questions from different data. Context renders the
 * per agent substrate table, which is derived from the agents' own
 * configuration surfaces. This renders `docs/arch/` and the verdicts computed
 * from it. Phase 23 refusal 4 names Context's own data as a surface no
 * configuration mechanism may touch, and `docs/arch/` is a configuration
 * mechanism by that rule's own vocabulary, so folding the two together would
 * put an agent writable file set inside the one view that refusal protects.
 *
 * ## The six regions, top to bottom
 *
 *  1. The freshness ribbon, one sentence, in commits rather than in days.
 *  2. The verdict strip, reported BY COVERAGE, so "checked" and "could not be
 *     checked" are never added together into one reassuring number.
 *  3. The failure list. Every row jumps to the offending line.
 *  4. The component outline, with a provenance glyph and a word on each row.
 *  5. The gap strip, pinned, because the corpus makes gaps first class.
 *  6. The prose panel, PLAIN TEXT ONLY.
 *
 * ## The refusals this file is built on, so a later round has them in writing
 *
 *  - **The prose panel renders plain text and never markdown.** `rehype-raw`
 *    is in this product's dependency tree, so a markdown pipeline here would
 *    render raw HTML out of a file an agent wrote. The panel puts the string
 *    in a text node and the browser escapes it.
 *  - **No count badge on any node.** Counts live in the verdict strip and in
 *    the prose panel. A number on a row is the dashboard the Zen refuses.
 *  - **No verdict ever sets a session's status.** Nothing here touches the
 *    sessions slice.
 *  - **No canvas.** There is no drawing in this phase and no rendering
 *    package. The outline is a list.
 *  - **Accepting a divergence is the person's button, and the one write.**
 *    Phase 158 put the accept control on the failing row, on the operator's
 *    own amendment: it asks main to append one row to `baseline.json` with
 *    the person's reason, main validates whole and refuses whole, and that
 *    channel is the only way Tortie ever writes that file. The decision and
 *    the reason are the person's; the typing is not. Every accepted row is
 *    still counted in the strip in the person's own words, so an agent
 *    cannot quietly accept its own violation: no agent can press a button,
 *    and the enriching pass's validator refuses any answer that carries
 *    baseline content.
 *  - **No colour carries meaning on its own.** Every verdict is a glyph, a
 *    word and a colour, in that order of importance. No amber anywhere: that
 *    hue belongs to "an agent needs you" and nothing here is that.
 */

import React, { useEffect, useMemo } from 'react';
import {
  localPathOf,
  targetOfProject
} from '@shared/workspace-target';
import { Codicon } from '../icons';
import { useApp } from '../state/store';
import { ArchContractOffer } from './ArchEmptyState';
import { ArchModules } from './ArchModules';
import { ChangedSection, FreshnessRibbon } from './ArchFreshness';
import { DrillCrumb, Reading } from './ArchDrill';
import { PassFace } from './ArchPass';
import {
  FailureList,
  GapStrip,
  Outline,
  Problems,
  ProsePanel,
  scopeVerdicts,
  VerdictStrip
} from './ArchVerdicts';
import type { ScopedView } from './ArchVerdicts';
import {
  ARCH_ELSEWHERE,
  ARCH_LAST_VALID,
  ARCH_NO_BRIDGE,
  ARCH_SCOPED_LOADING,
  ARCH_SCOPED_NO_FAILURES
} from './copy';
import { partKey, useArch } from './store';
// Phase 64: the aiming verb. The view's own control for it composes nothing
// itself; it hands the selection to the one picker every entry point uses.
import { AIM_MENU_LABEL } from './aim-copy';
import { canDeliverTo } from './deliver';
import { aimSelection } from './picker';
import './arch.css';
import './arch-drill.css';
import './arch-reading.css';

// ---------------------------------------------------------------------------
// The faces moved to their subject files in Phase 172 and this file
// re-exports them, so every importer of './ArchView' keeps the name it had.
// The set of re-exported names is EXACTLY what this file exported before the
// split: nothing private (Lanes, writtenSentence, ArchNote, AimBar) is
// widened on the way through.
// ---------------------------------------------------------------------------

export {
  isFailure,
  ScopedStrip,
  scopedStripFace,
  scopeVerdicts,
  stripLanes,
  verdictClass,
  verdictIcon
} from './ArchVerdicts';
export type { ScopedView } from './ArchVerdicts';
export {
  ChangedSection,
  FreshnessRibbon,
  repairFace,
  RibbonRow
} from './ArchFreshness';
export type { RepairFace } from './ArchFreshness';
export {
  acceptEdgeId,
  canAcceptOffence,
  paintedSentence,
  passDetail,
  passLead,
  timeWord
} from './ArchPass';

// ---------------------------------------------------------------------------
// Small pure helpers, exported where a probe or a test has to see them
// ---------------------------------------------------------------------------

/**
 * The component the module view draws, which is the LAST subject picked.
 *
 * Null for a gap or an edge, because level 2 is a component's own files and a
 * promise between two components is not one of them.
 */
export function focusedComponentId(selected: readonly string[]): string | null {
  const last = selected[selected.length - 1] ?? '';
  return last.startsWith('component:') ? last.slice('component:'.length) : null;
}

// ---------------------------------------------------------------------------
// The view
// ---------------------------------------------------------------------------

export function ArchView(): React.JSX.Element {
  const projects = useApp((s) => s.projects);
  const activeProjectId = useApp((s) => s.activeProjectId);
  const status = useArch((s) => s.status);
  const load = useArch((s) => s.load);
  const lastCheck = useArch((s) => s.lastCheck);
  const error = useArch((s) => s.error);
  const selected = useArch((s) => s.selected);
  const select = useArch((s) => s.select);
  const toggleSelected = useArch((s) => s.toggleSelected);
  const nameOf = useArch((s) => s.nameOf);
  const syncProject = useArch((s) => s.syncProject);

  const project = useMemo(
    () => projects.find((p) => p.id === activeProjectId) ?? null,
    [projects, activeProjectId]
  );
  const target = useMemo(() => targetOfProject(project), [project]);

  useEffect(() => {
    syncProject(target);
  }, [target, syncProject]);

  const verdicts = useMemo(
    () => lastCheck?.verdicts ?? load?.verdicts ?? [],
    [lastCheck, load]
  );
  const components = useMemo(() => load?.components ?? [], [load]);
  const edges = useMemo(() => load?.edges ?? [], [load]);
  const repoPath = target === null ? null : localPathOf(target);

  // Main's two pushes, for as long as the view is mounted. Nothing polls, and
  // a finished re-check announces nothing: it re-reads and the numbers move.
  useEffect(() => useArch.getState().subscribeEvents(), []);

  // PHASE 161. Where this repository's map is drilled to, read from the ONE
  // record the map tab writes too, so the cockpit and the picture cannot
  // disagree about where the person is. Scoping applies only when the pane's
  // repository is the drilled one, which this keying already guarantees.
  const drill = useArch((s) =>
    repoPath === null ? null : (s.drills[repoPath] ?? null)
  );
  const partEntry = useArch((s) =>
    repoPath === null || drill === null || drill.level === 1
      ? null
      : (s.partMaps[partKey(repoPath, drill.groupId)] ?? null)
  );

  if (status === 'unavailable') {
    return <ArchNote text={ARCH_NO_BRIDGE} />;
  }
  if (status === 'elsewhere') {
    return <ArchNote text={ARCH_ELSEWHERE} />;
  }
  if (status === 'error' && error !== null) {
    return <ArchNote text={error} />;
  }
  // PHASE 160. A repository with no `docs/arch/` is NOT an empty surface any
  // more. The map draws from the code alone, so the cockpit below renders for
  // every repository: the reading always (Phase 201), the strip, failures and
  // outline when a contract exists, and the offer of one when none does.
  // `present` is still main's own
  // answer: a directory that exists but whose every row was dropped keeps the
  // full cockpit, because the person then needs to read the problems.
  const noContract = status === 'ready' && load !== null && !load.present;

  // PHASE 161. The scoped reading the strip and the failure list share, so
  // the two cannot disagree, and the verdicts inside the scope by membership
  // in main's own id set rather than by a second arithmetic here.
  const scoped: ScopedView | null =
    drill !== null && drill.level !== 1
      ? { label: drill.groupLabel, model: partEntry?.model ?? null }
      : null;
  const shownVerdicts =
    scoped === null
      ? verdicts
      : scoped.model === null
        ? []
        : scopeVerdicts(verdicts, scoped.model.subjectIds);
  const failuresEmptyText =
    scoped === null
      ? undefined
      : scoped.model === null
        ? ARCH_SCOPED_LOADING
        : ARCH_SCOPED_NO_FAILURES;

  return (
    <div className="arch" data-slot="arch">
      {/* PHASE 201, THE ORDER OF RESEARCH 77 SECTION 7. The reading first,
          for every repository: the repository line, the model slot, the
          components each with its sentence. The contract comes LAST, as the
          offer when none exists and as the cockpit when one does, because a
          contract is a promise pane and the first screen is a reading. */}
      <DrillCrumb repoPath={repoPath} />
      <Reading repoPath={repoPath} />
      {noContract ? (
        // No contract: the one way to get one. The verdict machinery below
        // has nothing to say about a repository with no promises, and
        // zero-filled lanes would be a reassuring number about nothing, so
        // it does not mount.
        <ArchContractOffer />
      ) : (
        <>
          {/* A read that failed over bytes on disk, showing the LAST GOOD rows
              under a banner naming the failure. A half written contract file
              must never blank this view: an agent rewriting `edges.json` would
              otherwise make the whole surface disappear mid save. */}
          {load?.lastValid === true ? (
            <p className="arch-lastvalid">{ARCH_LAST_VALID}</p>
          ) : null}
          <PassFace repoPath={repoPath} />
          <FreshnessRibbon repoPath={repoPath} />
          {/* PHASE 159. What the last check moved, between the ribbon that
              says how far the code went and the strip that says where the
              promises stand now. Repository wide, like the accepted list:
              the drill does not scope it. */}
          <ChangedSection onSelect={select} />
          <VerdictStrip scoped={scoped} />
          <Problems />
          <FailureList
            verdicts={shownVerdicts}
            repoPath={repoPath}
            onSelect={select}
            emptyText={failuresEmptyText}
          />
          <Outline
            components={components}
            verdicts={verdicts}
            selected={selected}
            onSelect={select}
            onToggle={toggleSelected}
          />
          <GapStrip components={components} onSelect={select} />
          <AimBar />
          <ProsePanel
            selected={selected[selected.length - 1] ?? null}
            components={components}
            edges={edges}
            verdicts={verdicts}
          />
          {/* LEVEL 2, the computed module view. It draws only for a component,
              and the component is the focused one, which is the same subject
              the prose panel above is describing. The props were frozen in the
              phase spec before either file was written, because the mount
              point and the component belong to different hands. */}
          <ArchModules
            cwd={repoPath}
            componentId={focusedComponentId(selected)}
            componentName={nameOf(focusedComponentId(selected) ?? '')}
            refreshKey={lastCheck?.generation ?? 0}
          />
        </>
      )}
    </div>
  );
}

/** One sentence in the body, for every state that has nothing to draw. */
function ArchNote({ text }: { text: string }): React.JSX.Element {
  return (
    <div className="arch">
      <p className="arch-note">{text}</p>
    </div>
  );
}

/**
 * THE AIMING BAR — the view's own way in to the verb (Phase 64).
 *
 * The chord is the primary surface and this is not a second one competing with
 * it: the chord aims one thing from inside a session, and this aims a scope a
 * person has built out of several rows in this list, which is the one thing a
 * single native menu cannot express.
 *
 * It draws nothing at all until something is selected, so a person reading the
 * view is not carrying a control they have no use for.
 *
 * It composes nothing itself and it writes to no session. Every path into the
 * verb goes through ./picker.ts, which goes through ./deliver.ts, which holds
 * the one guard. THE SELECTION SETS NO SESSION'S STATUS.
 */
function AimBar(): React.JSX.Element | null {
  const selected = useArch((s) => s.selected);
  // Subscribed rather than read once, so the row's reason follows a session
  // that ends while a person is looking at this list.
  const sessions = useApp((s) => s.sessions);
  const activeByProject = useApp((s) => s.activeSessionByProject);
  const activeProjectId = useApp((s) => s.activeProjectId);
  const activeId =
    activeProjectId === null ? undefined : activeByProject[activeProjectId];
  const target = useMemo(
    () => canDeliverTo(activeId ?? null),
    // `sessions` is in the list because membership in it is the first thing
    // the guard asks, so a session leaving the list must re-run this.
    [activeId, sessions]
  );

  if (selected.length === 0) return null;
  const count = selected.length;
  return (
    <section className="arch-aim" aria-label={AIM_MENU_LABEL}>
      <p className="arch-aim-count">
        {count === 1 ? '1 selected' : `${String(count)} selected`}
      </p>
      <button
        type="button"
        className="arch-aim-go"
        disabled={!target.ok}
        title={target.ok ? undefined : target.reason}
        onClick={() => void aimSelection()}
      >
        <Codicon name="checklist" size="sm" />
        {AIM_MENU_LABEL}
      </button>
      {target.ok ? null : (
        <p className="arch-aim-why">{target.reason}</p>
      )}
    </section>
  );
}
