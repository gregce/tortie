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

import React, { useEffect, useMemo, useState } from 'react';
import type {
  ArchComponent,
  ArchCoverageCounts,
  ArchEdge,
  ArchVerdict
} from '@shared/arch';
import { ARCH_LIMITS } from '@shared/arch';
import { archViewGapId } from '@shared/arch-ids';
import {
  localPathOf,
  targetOfProject
} from '@shared/workspace-target';
import { Codicon } from '../icons';
import { requestOpenFile } from '../state/open-file';
import { useApp } from '../state/store';
import { ArchContractOffer, passSentence } from './ArchEmptyState';
import { openArchMap } from './open-map';
import {
  acceptAvailable,
  mapAvailable,
  mapPartAvailable,
  passAvailable
} from './bridge';
import type {
  ArchMapPartResult,
  ArchPassRunFace,
  ArchPassStatusResult
} from './bridge';
import {
  ARCH_ACCEPT_BODY,
  ARCH_ACCEPT_REASON_LABEL,
  ARCH_ACCEPT_TITLE,
  ARCH_ACCEPT_WRITE,
  ARCH_COMPUTED_TITLE,
  ARCH_CONTRACT_ADDS,
  ARCH_DRILL_CRUMB_LABEL,
  ARCH_DRILL_WHOLE,
  ARCH_ENRICH_BODY,
  ARCH_ENRICH_TITLE,
  ARCH_OFFENCE_ACCEPTED,
  enrichRefusalSentence,
  ARCH_MAP_OPEN_BODY,
  ARCH_MAP_OPEN_TITLE,
  ARCH_PASS_FAILED,
  ARCH_PASS_REFUSED,
  ARCH_PASS_RUNNING,
  ARCH_PASS_SUGGESTIONS,
  ARCH_PASS_SUGGESTIONS_NOTE,
  ARCH_PASS_TITLE,
  ARCH_SCOPED_LOADING,
  ARCH_SCOPED_NO_FAILURES,
  ARCH_SCOPED_NO_PROMISES
} from './copy';
import {
  ARCH_ACCEPTED_NOTE,
  ARCH_ELSEWHERE,
  ARCH_FIRST_CHECK,
  ARCH_GAPS_TITLE,
  ARCH_LAST_VALID,
  ARCH_NO_BRIDGE,
  ARCH_NO_FAILURES,
  ARCH_PARTLY_CHECKED_NOTE,
  ARCH_PROSE_UNVERIFIED,
  coverageWord,
  freshnessSentence,
  unresolvedSentence,
  verdictWord
} from './copy';
import {
  provenanceIcon,
  provenanceTitle,
  provenanceWord
} from './provenance';
import { ArchModules } from './ArchModules';
import { partKey, useArch } from './store';
// Phase 64: the aiming verb. The view's own control for it composes nothing
// itself; it hands the selection to the one picker every entry point uses.
import { AIM_MENU_LABEL } from './aim-copy';
import { canDeliverTo } from './deliver';
import { aimSelection } from './picker';
import './arch.css';
import './arch-drill.css';

// ---------------------------------------------------------------------------
// Small pure helpers, exported where a probe or a test has to see them
// ---------------------------------------------------------------------------

/** The glyph one verdict wears. Never the only channel; a word travels with it. */
export function verdictIcon(status: string): string {
  switch (status) {
    case 'convergent':
      return 'check';
    case 'divergent':
      return 'error';
    case 'absent':
      return 'circle-slash';
    default:
      return 'question';
  }
}

/** The class one verdict wears, which is where its colour comes from. */
export function verdictClass(status: string): string {
  switch (status) {
    case 'convergent':
      return 'arch-v-holds';
    case 'divergent':
      return 'arch-v-broke';
    case 'absent':
      return 'arch-v-missing';
    default:
      return 'arch-v-unknown';
  }
}

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

/** A verdict is a FAILURE when it broke or the thing it names is not there. */
export function isFailure(v: ArchVerdict): boolean {
  return v.status === 'divergent' || v.status === 'absent';
}

/**
 * The verdicts inside the drilled scope (Phase 161), by MEMBERSHIP and never
 * by a second arithmetic: main computed which subjects map into the part and
 * shipped their ids with the scoped model, so the pane filters by that set
 * rather than re-deriving the overlay here. Null means no scope, and the
 * list passes through untouched.
 */
export function scopeVerdicts(
  verdicts: readonly ArchVerdict[],
  subjectIds: readonly string[] | null
): readonly ArchVerdict[] {
  if (subjectIds === null) return verdicts;
  const inScope = new Set(subjectIds);
  return verdicts.filter((v) => inScope.has(v.subjectId));
}

/**
 * What the pane knows about the drilled scope, computed once in the view and
 * handed to the strip and the failure list so the two cannot disagree.
 */
export interface ScopedView {
  /** What the drilled part is called, the breadcrumb's own word. */
  label: string;
  /** The held scoped model, or null while the first read is out. */
  model: ArchMapPartResult | null;
}

/**
 * Which face the scoped strip wears, as one word a test can hold: `loading`
 * while no scoped model has landed, `silent` when the contract's promises do
 * not touch the part, `lanes` when there are scoped counts to draw.
 */
export function scopedStripFace(
  scoped: ScopedView
): 'loading' | 'silent' | 'lanes' {
  if (scoped.model === null) return 'loading';
  if (scoped.model.subjectIds.length === 0) return 'silent';
  return 'lanes';
}

/**
 * The strip's counts come from MAIN, and this is why they are not derived here.
 *
 * `ArchCoverageCounts` is computed beside the checkers that produced the
 * verdicts, and it is the number `npm run conformance:arch` compares against
 * its expectation table. A second arithmetic in the renderer would be a second
 * answer to the same question, and the two would disagree the first time a
 * checker learned a new status. So this reads the record rather than counting
 * rows, and the ONE thing it adds is the refusal to add the lanes together.
 *
 * A strip that said "38 of 40 hold" over a set where twenty-one of them were
 * never checkable would be a reassuring number about nothing. Checked-and-hold,
 * broke, and cannot-be-checked are three separate figures on screen, and the
 * accepted count is shown beside them rather than folded into the held one.
 */
export function stripLanes(
  counts: ArchCoverageCounts
): { key: string; word: string; n: number; cls: string; icon: string }[] {
  return [
    {
      key: 'hold',
      word: `checked and ${verdictWord('convergent')}`,
      n: counts.checkedHold,
      cls: verdictClass('convergent'),
      icon: verdictIcon('convergent')
    },
    {
      key: 'broke',
      word: verdictWord('divergent'),
      n: counts.broke,
      cls: verdictClass('divergent'),
      icon: verdictIcon('divergent')
    },
    {
      key: 'cannot',
      word: coverageWord('unverifiable'),
      n: counts.cannotCheck,
      cls: verdictClass('unverifiable'),
      icon: verdictIcon('unverifiable')
    }
  ];
}

// ---------------------------------------------------------------------------
// Phase 158, the run face and the accept verb: the pure parts
// ---------------------------------------------------------------------------

/**
 * The promise id an accepted divergence names, out of the verdict's own
 * subject vocabulary. `edge:<id>` and `edge:<id>#<facet>` both answer the
 * id; a component or gap subject answers undefined, because a baseline row
 * without an edge id matches offences by path pair alone.
 */
export function acceptEdgeId(subjectId: string): string | undefined {
  if (!subjectId.startsWith('edge:')) return undefined;
  const rest = subjectId.slice('edge:'.length);
  const hash = rest.indexOf('#');
  const id = hash === -1 ? rest : rest.slice(0, hash);
  return id.length === 0 ? undefined : id;
}

/**
 * Whether one offending record can be accepted at all. A baseline row names
 * a `fromPath` and a `toPath`, so an offence with no target, which is what
 * an absent component reports, has nothing a row could match and gets no
 * button rather than a button that writes a row main must refuse.
 */
export function canAcceptOffence(o: {
  fromPath: string;
  toPath: string;
  accepted?: string;
}): boolean {
  // An offence a baseline row already covers gets no second button: the
  // person accepted it, and the row says so in their words instead.
  return o.fromPath.length > 0 && o.toPath.length > 0 && o.accepted === undefined;
}

/** The clock word the run face says, hours and minutes, this computer's day. */
export function timeWord(ms: number): string {
  const d = new Date(ms);
  const two = (n: number): string => String(n).padStart(2, '0');
  return `${two(d.getHours())}:${two(d.getMinutes())}`;
}

/**
 * The painted coverage sentence, on the run's face because the map binding
 * makes it the proof: an enrichment that painted nothing did not reach the
 * picture, and main records such a run failed rather than kept. Null when
 * the run carries no counts, which a refused run does not.
 */
export function paintedSentence(run: ArchPassRunFace): string | null {
  if (run.painted === null || run.components === null) return null;
  return `Painted ${String(run.painted)} of ${String(run.components)} parts on the map.`;
}

/**
 * The one sentence the run face leads with, decided by main's status and
 * the last gesture's refusal alone, so the unit suite can hold every state.
 * Null means the face has nothing to say yet, which is a chosen pass that
 * has never run.
 */
export function passLead(
  status: ArchPassStatusResult,
  askRefusal: string | null
): string | null {
  if (status.running) return ARCH_PASS_RUNNING;
  if (askRefusal !== null) return enrichRefusalSentence(askRefusal);
  const run = status.lastRun;
  if (status.suspended !== null) {
    // A suspension after a kept run still owes the written time: the
    // contract on disk is that run's, whatever the window is doing now.
    return run !== null && run.verdict === 'kept'
      ? `${status.suspended} ${writtenSentence(run)}`
      : status.suspended;
  }
  if (run === null) return null;
  if (run.verdict === 'refused') {
    return run.reason === null
      ? ARCH_PASS_REFUSED
      : `${ARCH_PASS_REFUSED} The refusal is named ${run.reason}.`;
  }
  if (run.verdict === 'failed') {
    return run.reason === null
      ? ARCH_PASS_FAILED
      : `${ARCH_PASS_FAILED} ${run.reason}`;
  }
  // Kept: the contract on disk is the run's own write, said with the time,
  // the way a session row says written and when.
  return writtenSentence(run);
}

/** The kept run's own line: written, and when. */
function writtenSentence(run: ArchPassRunFace): string {
  return `The contract was last written at ${timeWord(run.startedAt + run.wallMs)}.`;
}

/**
 * The validator's own sentence under a refused run's lead, naming the field
 * and the reason, so the person reads what to change and not only the
 * token's name. Null unless the last run carried one.
 */
export function passDetail(status: ArchPassStatusResult): string | null {
  const run = status.lastRun;
  if (run === null || status.running || run.verdict === 'kept') return null;
  return run.detail;
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
  const contract = load?.contract ?? null;
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
  // every repository: the open map control always, the strip, failures and
  // outline when a contract exists, the computed parts and the quiet line
  // about what a contract adds when none does. `present` is still main's own
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
      {contract !== null ? (
        <div className="arch-subject" title={contract.subject}>
          {contract.subject}
        </div>
      ) : null}
      <MapSection repoPath={repoPath} />
      <DrillCrumb repoPath={repoPath} />
      {noContract ? (
        // No contract: the computed parts the map draws, the quiet line about
        // what a contract adds, and the two ways to get one. The verdict
        // machinery below has nothing to say about a repository with no
        // promises, and zero-filled lanes would be a reassuring number about
        // nothing, so it does not mount.
        <>
          <ComputedOutline repoPath={repoPath} />
          <p className="arch-note arch-contract-adds">{ARCH_CONTRACT_ADDS}</p>
          <ArchContractOffer />
        </>
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
          <FreshnessRibbon />
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
function DrillCrumb({
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
function MapSection({
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
function ComputedOutline({
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

/**
 * THE RUN FACE (Phase 158). What the pass is doing, when the contract was
 * last written, the painted coverage, and the answer's regroup suggestions,
 * on one quiet section of the cockpit.
 *
 * IT IS VISIBLE WHILE IT RUNS, the charter's own words: a headless pass a
 * person cannot see is a pass they cannot trust. The face reads the pass
 * record main reports and nothing else; it derives nothing of its own, so
 * the numbers here are the numbers main counted. With no agent picked it
 * says the pass is off, plainly, with the Settings pointer, and the one
 * control it carries asks main to run the pass once. Main holds the gate:
 * nothing this face sends can start an agent the person has not confirmed.
 */
function PassFace({
  repoPath
}: {
  repoPath: string | null;
}): React.JSX.Element | null {
  const loadPass = useArch((s) => s.loadPass);
  const enrich = useArch((s) => s.enrich);
  const enriching = useArch((s) => s.enriching);
  const drafting = useArch((s) => s.drafting);
  const entry = useArch((s) =>
    repoPath === null ? null : (s.passes[repoPath] ?? null)
  );
  useEffect(() => {
    if (repoPath !== null) void loadPass(repoPath);
  }, [repoPath, loadPass]);

  if (repoPath === null || !passAvailable()) return null;

  const status = entry?.status ?? null;
  const chosen = status?.chosen ?? false;
  const running = enriching || status?.running === true;
  const lead =
    status === null ? null : passLead(status, entry?.refusal ?? null);
  const detail = status === null ? null : passDetail(status);
  const run = status?.lastRun ?? null;
  const painted = run === null ? null : paintedSentence(run);
  const suggestions = run?.suggestions ?? [];
  const offSentence = passSentence(true, chosen);

  return (
    <section className="arch-pass" aria-label={ARCH_PASS_TITLE}>
      <div className="section-header">
        <span className="section-toggle">{ARCH_PASS_TITLE}</span>
        {running ? (
          // VISUAL STATE OVER WORDS (the copy ruling): the header spins
          // while the agent runs, the same modifier the SCM run row uses.
          <Codicon name="sync" size={12} className="codicon-modifier-spin" />
        ) : null}
      </div>
      {!chosen ? (
        <p className="arch-note arch-note-inline">{offSentence}</p>
      ) : (
        <>
          {lead !== null ? (
            <p className="arch-note arch-note-inline">{lead}</p>
          ) : null}
          {detail !== null ? (
            // PLAIN TEXT: the sentence quotes the model's answer by field.
            <p className="arch-note arch-note-inline arch-pass-detail">
              {detail}
            </p>
          ) : null}
          {painted !== null ? (
            <p className="arch-note arch-note-inline">{painted}</p>
          ) : null}
          <button
            type="button"
            className="arch-empty-action arch-pass-run"
            disabled={running || drafting}
            title={ARCH_ENRICH_BODY}
            onClick={() => void enrich()}
          >
            <Codicon name="sparkle" size={14} />
            <span className="arch-empty-action-title">{ARCH_ENRICH_TITLE}</span>
          </button>
          {suggestions.length > 0 ? (
            <div className="arch-pass-suggestions">
              <p className="arch-note arch-note-inline">
                {`${ARCH_PASS_SUGGESTIONS} · ${ARCH_PASS_SUGGESTIONS_NOTE}`}
              </p>
              <ul>
                {suggestions.map((sentence, i) => (
                  // PLAIN TEXT, the prose panel's own rule: these sentences
                  // came out of a model's answer and render as text nodes.
                  <li key={`${String(i)}:${sentence.slice(0, 24)}`}>
                    {sentence}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

/**
 * THE ACCEPT CONTROL on one failing row (Phase 158, the operator's
 * amendment). The decision and the reason are the person's; the typing is
 * not. The button opens a small reason form, the write stays disabled until
 * the reason is non-empty, and the submit asks main to append one validated
 * row to `docs/arch/baseline.json`. A refused write says main's own sentence
 * on the row rather than vanishing.
 */
function AcceptDivergence({
  edgeId,
  fromPath,
  toPath
}: {
  edgeId: string | undefined;
  fromPath: string;
  toPath: string;
}): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [because, setBecause] = useState('');
  const [busy, setBusy] = useState(false);
  const [refused, setRefused] = useState<string | null>(null);
  const accept = useArch((s) => s.acceptDivergence);

  if (!open) {
    return (
      <button
        type="button"
        className="arch-accept-open"
        title={ARCH_ACCEPT_BODY}
        onClick={() => setOpen(true)}
      >
        {ARCH_ACCEPT_TITLE}
      </button>
    );
  }
  return (
    <form
      className="arch-accept"
      onSubmit={(e) => {
        e.preventDefault();
        if (busy || because.trim().length === 0) return;
        setBusy(true);
        setRefused(null);
        void accept(
          edgeId === undefined
            ? { fromPath, toPath, because: because.trim() }
            : { edgeId, fromPath, toPath, because: because.trim() }
        ).then((result) => {
          setBusy(false);
          if (result.ok) {
            setOpen(false);
            setBecause('');
          } else {
            setRefused(result.reason);
          }
        });
      }}
    >
      <input
        className="arch-accept-input"
        type="text"
        value={because}
        maxLength={ARCH_LIMITS.maxBecause}
        placeholder={ARCH_ACCEPT_REASON_LABEL}
        aria-label={ARCH_ACCEPT_REASON_LABEL}
        onChange={(e) => setBecause(e.target.value)}
      />
      <button
        type="submit"
        className="arch-accept-write"
        disabled={busy || because.trim().length === 0}
        title={ARCH_ACCEPT_BODY}
      >
        {ARCH_ACCEPT_WRITE}
      </button>
      {refused !== null ? (
        <p className="arch-accept-refused">{refused}</p>
      ) : null}
    </form>
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
 * The freshness ribbon.
 *
 * COMMITS, NEVER DAYS, and never the word "stale". A calendar date says how
 * long ago somebody typed. The question a person is asking is how much code
 * moved under the promise since then, and only git can answer that without
 * lying. The uncommitted line is here rather than hidden because a verdict
 * computed against a dirty worktree is a different claim from one computed
 * against HEAD, and a person reading a red row deserves to know which.
 */
function FreshnessRibbon(): React.JSX.Element | null {
  const rows = useArch((s) => s.freshness());
  const nameOf = useArch((s) => s.nameOf);
  if (rows.length === 0) return null;
  return <p className="arch-ribbon">{freshnessSentence(rows, nameOf)}</p>;
}

/** The three lanes themselves, one markup for the whole and for a part. */
function Lanes({ counts }: { counts: ArchCoverageCounts }): React.JSX.Element {
  return (
    <div className="arch-lane">
      <span className="arch-lane-counts">
        {stripLanes(counts).map((lane) => (
          <span className={lane.cls} key={lane.key}>
            <Codicon name={lane.icon} size={12} />
            {`${String(lane.n)} ${lane.word}`}
          </span>
        ))}
      </span>
    </div>
  );
}

/**
 * THE SCOPED STRIP (Phase 161). The part's own verdict slice, or the one
 * honest sentence when there is nothing to slice.
 *
 * The counts come from MAIN beside the scoped compose, for the same reason
 * the unscoped strip reads a record rather than counting rows: a second
 * arithmetic here would be a second answer to the same question. A contract
 * whose promises do not touch the drilled part, shown by an empty in scope
 * id set, gets a sentence rather than zero filled lanes, because a
 * reassuring number about nothing is the exact thing the strip refuses. The accepted list and the first check line stay
 * with the whole: both are repository wide claims and scoping their absence
 * would misstate them.
 */
export function ScopedStrip({
  scoped
}: {
  scoped: ScopedView;
}): React.JSX.Element {
  const face = scopedStripFace(scoped);
  const counts = face === 'lanes' ? (scoped.model?.counts ?? null) : null;
  if (counts === null) {
    return (
      <section className="arch-strip" aria-label="Promises by coverage">
        <p className="arch-strip-note">
          {face === 'loading' ? ARCH_SCOPED_LOADING : ARCH_SCOPED_NO_PROMISES}
        </p>
      </section>
    );
  }
  const unresolved = unresolvedSentence(
    counts.unresolvedImports,
    counts.totalImports
  );
  return (
    <section className="arch-strip" aria-label="Promises by coverage">
      <Lanes counts={counts} />
      {unresolved !== null ? (
        <p className="arch-strip-note">{unresolved}</p>
      ) : null}
    </section>
  );
}

/** The strip. Three lanes, never one total. Scopes with the drill. */
function VerdictStrip({
  scoped
}: {
  scoped: ScopedView | null;
}): React.JSX.Element | null {
  const counts = useArch((s) => s.counts());
  const verdicts = useArch((s) => s.verdicts());
  const load = useArch((s) => s.load);
  if (scoped !== null) return <ScopedStrip scoped={scoped} />;
  if (counts === null) return null;
  const accepted = load?.baseline.accepted ?? [];
  const unresolved = unresolvedSentence(
    counts.unresolvedImports,
    counts.totalImports
  );
  // A run that has not finished has nothing to say about whether anything
  // moved, so its claims read as a question rather than as a stale verdict.
  const firstCheck = verdicts.some((v) => v.firstCheck);

  return (
    <section className="arch-strip" aria-label="Promises by coverage">
      <Lanes counts={counts} />
      {firstCheck ? (
        <div className="arch-lane">
          <span className="arch-lane-name">{ARCH_FIRST_CHECK}</span>
        </div>
      ) : null}
      {unresolved !== null ? (
        <p className="arch-strip-note">{unresolved}</p>
      ) : null}
      {/* ACCEPTED DIVERGENCES ARE ALWAYS COUNTED AND ALWAYS CARRY THEIR REASON.
          They are never folded into the held figure and they are never hidden.
          That is the whole mechanism behind the operator's second rider: an
          agent cannot quietly accept its own violation, because acceptance is
          the person's own button on the failing row (Phase 158), the reason
          is typed by them, and every accepted row shows up here in their own
          words. The accept channel is the one way that file is ever written,
          and no agent can press a button. */}
      {accepted.length > 0 ? (
        <div className="arch-accepted">
          {/* The heading counts the rows under it, the person's own
              acceptances, and not the promises accepted whole in the lane
              arithmetic: one accepted row under a promise that still has
              open offences read "0 accepted" above itself before this. */}
          <p className="arch-strip-note" title={ARCH_ACCEPTED_NOTE}>
            {`${String(accepted.length)} accepted`}
          </p>
          <ul>
            {accepted.map((row, i) => (
              <li key={`${row.fromPath}:${row.toPath}:${String(i)}`}>
                <span className="arch-accepted-pair">
                  {`${row.fromPath} → ${row.toPath}`}
                </span>
                <span className="arch-accepted-why">{row.because}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

/**
 * Rows that would not load at all.
 *
 * A row is dropped WHOLE and named, never partially merged and never silently
 * dropped. That is the overlay rule from CLAUDE.md's Phase 23 section, and
 * this is what it looks like on screen: the file, the field and the reason,
 * beside every row that did load.
 */
function Problems(): React.JSX.Element | null {
  const problems = useArch((s) => s.problems());
  if (problems.length === 0) return null;
  return (
    <section className="arch-schema" aria-label="Rows that would not load">
      <div className="section-header">
        <span className="section-toggle">Would not load</span>
      </div>
      <ul>
        {problems.map((e, i) => (
          <li key={`${e.file}:${e.field}:${String(i)}`}>
            <Codicon name="error" size={12} />
            <span className="arch-schema-file">{e.file}</span>
            <span className="arch-schema-field">{e.field}</span>
            <span className="arch-schema-reason">{e.message}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * The failure list, and every row jumps.
 *
 * A verdict that says a promise broke and cannot say where is an accusation
 * rather than a finding. Every offending row here carries a path and a line
 * and opens the file at that line through the ordinary open-file bus, which is
 * the same bus a search hit and a symbol pick already use, so the editor
 * reveals, selects and flashes the range exactly as it does for those.
 */
function FailureList({
  verdicts,
  repoPath,
  onSelect,
  emptyText
}: {
  verdicts: readonly ArchVerdict[];
  repoPath: string | null;
  onSelect: (id: string) => void;
  /**
   * What no failures means HERE (Phase 161): the whole keeps its sentence,
   * and a drilled scope names the part instead, because "every promise
   * holds" about a scope still being read would be a claim nobody checked.
   */
  emptyText?: string;
}): React.JSX.Element {
  const failures = verdicts.filter(isFailure);
  return (
    <section className="arch-failures" aria-label="Promises that did not hold">
      <div className="section-header">
        <span className="section-toggle">Did not hold</span>
      </div>
      {failures.length === 0 ? (
        <p className="arch-note arch-note-inline">
          {emptyText ?? ARCH_NO_FAILURES}
        </p>
      ) : (
        <ul>
          {failures.map((v) => (
            <li key={v.subjectId} className={verdictClass(v.status)}>
              <button
                type="button"
                className="arch-failure-head"
                onClick={() => onSelect(v.subjectId)}
              >
                <Codicon name={verdictIcon(v.status)} size={12} />
                <span className="arch-failure-subject">{v.subjectId}</span>
                <span className="arch-failure-word">
                  {verdictWord(v.status)}
                </span>
              </button>
              {(v.offending ?? []).map((o, i) => (
                <div
                  key={`${o.fromPath}:${String(o.line)}:${String(i)}`}
                  className="arch-offending-row"
                >
                  <button
                    type="button"
                    className="arch-offending"
                    disabled={repoPath === null}
                    title={`Open ${o.fromPath} at line ${String(o.line)}`}
                    onClick={() => {
                      if (repoPath === null) return;
                      requestOpenFile({
                        repoPath,
                        relPath: o.fromPath,
                        path: `${repoPath}/${o.fromPath}`,
                        mode: 'file',
                        source: 'search',
                        preview: false,
                        selection: { line: o.line }
                      });
                    }}
                  >
                    <span className="arch-offending-path">{o.fromPath}</span>
                    <span className="arch-offending-line">
                      {`:${String(o.line)}`}
                    </span>
                    {o.specifier.length > 0 ? (
                      <span className="arch-offending-spec">{o.specifier}</span>
                    ) : null}
                    {o.accepted !== undefined ? (
                      // VISUAL STATE OVER WORDS: one word, the reason on
                      // hover, and no accept control beside it.
                      <span className="arch-offending-accepted" title={o.accepted}>
                        {ARCH_OFFENCE_ACCEPTED}
                      </span>
                    ) : null}
                  </button>
                  {/* THE ACCEPT CONTROL (Phase 158) rides the offending row
                      in the PANE ONLY. Source Control's Promises section
                      stays visibility only, per the operator's recorded
                      rider: there is no accept control there. An offence
                      with no target path gets no button, because a baseline
                      row could not match it. */}
                  {repoPath !== null &&
                  acceptAvailable() &&
                  canAcceptOffence(o) ? (
                    <AcceptDivergence
                      edgeId={acceptEdgeId(v.subjectId)}
                      fromPath={o.fromPath}
                      toPath={o.toPath}
                    />
                  ) : null}
                </div>
              ))}
              {v.reason !== null && v.reason !== undefined ? (
                <p className="arch-failure-reason">{v.reason}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * The component outline.
 *
 * IT ALWAYS LISTS EVERYTHING. Research 49 section 9.6 caps the DRAWING at a
 * dozen boxes and says in the same row that the outline lists them all. There
 * is no drawing in this phase, so the cap has nothing to apply to and the list
 * is the whole surface.
 *
 * A deprecated component is drawn struck through and never hidden. The corpus
 * already strikes things through in prose because ASCII had no other way, and
 * hiding it would lose the one fact the author went out of their way to state.
 */
function Outline({
  components,
  verdicts,
  selected,
  onSelect,
  onToggle
}: {
  components: readonly ArchComponent[];
  verdicts: readonly ArchVerdict[];
  selected: readonly string[];
  onSelect: (id: string) => void;
  /** ⌘-click, which builds a scope out of more than one part (Phase 64). */
  onToggle: (id: string) => void;
}): React.JSX.Element | null {
  if (components.length === 0) return null;
  const worst = (id: string): ArchVerdict | undefined =>
    verdicts
      .filter((v) => v.subjectId === `component:${id}`)
      .sort((a, b) => Number(isFailure(b)) - Number(isFailure(a)))[0];
  return (
    <section className="arch-outline" aria-label="Components">
      <div className="section-header">
        <span className="section-toggle">Components</span>
      </div>
      <ul role="tree">
        {components.map((c) => {
          const v = worst(c.id);
          const id = `component:${c.id}`;
          return (
            <li key={c.id} role="none">
              <button
                type="button"
                role="treeitem"
                aria-selected={selected.includes(id)}
                className={`arch-row${selected.includes(id) ? ' selected' : ''}${
                  c.deprecated ? ' arch-row-deprecated' : ''
                }`}
                // ⌘-click adds to the selection instead of replacing it, which
                // is what a scope of more than one part is built with. A plain
                // click still means "this one", so nothing a person already
                // knows about this list changed.
                onClick={(e) => {
                  if (e.metaKey) onToggle(id);
                  else onSelect(id);
                }}
              >
                <Codicon
                  name={provenanceIcon(c.provenance)}
                  size={14}
                />
                <span className="arch-row-name">{c.name}</span>
                <span
                  className="arch-row-prov"
                  title={provenanceTitle(c.provenance)}
                >
                  {provenanceWord(c.provenance)}
                </span>
                {v !== undefined ? (
                  <span className={`arch-row-v ${verdictClass(v.status)}`}>
                    <Codicon name={verdictIcon(v.status)} size={12} />
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/**
 * The gap strip, pinned.
 *
 * Gaps are first class here because they are first class in the corpus: 14 of
 * the operator's 30 documents carry a "shipped versus thin" section, and it is
 * the section a person actually acts on. It is prose and it is never verified,
 * and the panel says so rather than letting a sentence sit beside a checked
 * verdict looking equally solid.
 */
function GapStrip({
  components,
  onSelect
}: {
  components: readonly ArchComponent[];
  onSelect: (id: string) => void;
}): React.JSX.Element | null {
  const rows = components.flatMap((c) =>
    (c.gaps ?? []).map((text, i) => ({ component: c, text, i }))
  );
  if (rows.length === 0) return null;
  return (
    <section className="arch-gaps" aria-label={ARCH_GAPS_TITLE}>
      <div className="section-header">
        <span className="section-toggle">{ARCH_GAPS_TITLE}</span>
      </div>
      <ul>
        {rows.map(({ component, text, i }) => (
          <li key={`${component.id}:${String(i)}`}>
            <button
              type="button"
              className="arch-gap"
              onClick={() => onSelect(archViewGapId(component.id, i))}
            >
              <span className="arch-gap-where">{component.name}</span>
              <span className="arch-gap-text">{text}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * The prose panel. PLAIN TEXT, and this is the load-bearing refusal.
 *
 * Every string drawn here comes out of a file under `docs/arch/`, and an agent
 * can write that file. `rehype-raw` 7.0.0 is in this product's dependency tree
 * and the editor's markdown pipeline uses it, so rendering this text through
 * that pipeline would render raw HTML an agent wrote, inside the one renderer
 * whose CSP Phase 23 refusal 7 says is never relaxed.
 *
 * So the text goes into a text node. React escapes it, there is no
 * `dangerouslySetInnerHTML` anywhere in this file, and there never may be.
 *
 * IT ALSO LABELS ITSELF. Description, note and gap text are never verified and
 * the panel says so in one sentence, because a paragraph sitting beside a
 * checked verdict looks exactly as solid as the verdict does.
 */
function ProsePanel({
  selected,
  components,
  edges,
  verdicts
}: {
  selected: string | null;
  components: readonly ArchComponent[];
  edges: readonly ArchEdge[];
  verdicts: readonly ArchVerdict[];
}): React.JSX.Element | null {
  if (selected === null) return null;
  const verdict = verdicts.find((v) => v.subjectId === selected);
  const [kind, rest] = [
    selected.slice(0, selected.indexOf(':')),
    selected.slice(selected.indexOf(':') + 1)
  ];

  let title = selected;
  let body: string | null = null;
  let anchors: readonly string[] = [];

  if (kind === 'component') {
    const c = components.find((x) => x.id === rest);
    if (c !== undefined) {
      title = c.name;
      body = c.description;
      anchors = c.anchors;
    }
  } else if (kind === 'edge') {
    const e = edges.find((x) => x.id === rest);
    if (e !== undefined) {
      title = `${e.from} ${e.rule} ${e.kind} ${e.to}`;
      body = e.note ?? null;
    }
  } else if (kind === 'gap') {
    const cid = rest.slice(0, rest.lastIndexOf(':'));
    const index = Number(rest.slice(rest.lastIndexOf(':') + 1));
    const c = components.find((x) => x.id === cid);
    if (c !== undefined) {
      title = `Gap in ${c.name}`;
      body = c.gaps[index] ?? null;
    }
  }

  return (
    <section className="arch-prose" aria-label="What the author wrote">
      <h3 className="arch-prose-title">{title}</h3>
      {verdict !== undefined ? (
        <p className={`arch-prose-verdict ${verdictClass(verdict.status)}`}>
          <Codicon name={verdictIcon(verdict.status)} size={12} />
          {`${verdictWord(verdict.status)} · ${coverageWord(verdict.coverage)}`}
        </p>
      ) : null}
      {verdict?.coverage === 'partly-checked' ? (
        <p className="arch-prose-note">{ARCH_PARTLY_CHECKED_NOTE}</p>
      ) : null}
      {/* PLAIN TEXT. A text node, never markdown, never raw HTML. */}
      {body !== null && body.length > 0 ? (
        <p className="arch-prose-body">{body}</p>
      ) : null}
      {anchors.length > 0 ? (
        <ul className="arch-prose-anchors">
          {anchors.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      ) : null}
      <p className="arch-prose-note">{ARCH_PROSE_UNVERIFIED}</p>
    </section>
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
        <Codicon name="checklist" size={12} />
        {AIM_MENU_LABEL}
      </button>
      {target.ok ? null : (
        <p className="arch-aim-why">{target.reason}</p>
      )}
    </section>
  );
}
