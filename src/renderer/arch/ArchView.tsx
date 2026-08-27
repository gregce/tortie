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
 *  - **Tortie reads `baseline.json` and never writes it.** There is no accept
 *    control on this surface. An accepted divergence is counted in the strip
 *    with the reason its author gave, so an agent cannot quietly accept its
 *    own violation.
 *  - **No colour carries meaning on its own.** Every verdict is a glyph, a
 *    word and a colour, in that order of importance. No amber anywhere: that
 *    hue belongs to "an agent needs you" and nothing here is that.
 */

import React, { useEffect, useMemo } from 'react';
import type {
  ArchComponent,
  ArchCoverageCounts,
  ArchEdge,
  ArchVerdict
} from '@shared/arch';
import { archViewGapId } from '@shared/arch-ids';
import {
  localPathOf,
  targetOfProject
} from '@shared/workspace-target';
import { Codicon } from '../icons';
import { requestOpenFile } from '../state/open-file';
import { useApp } from '../state/store';
import { ArchEmptyState } from './ArchEmptyState';
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
import { useArch } from './store';
// Phase 64: the aiming verb. The view's own control for it composes nothing
// itself; it hands the selection to the one picker every entry point uses.
import { AIM_MENU_LABEL } from './aim-copy';
import { canDeliverTo } from './deliver';
import { aimSelection } from './picker';
import './arch.css';

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

  if (status === 'unavailable') {
    return <ArchNote text={ARCH_NO_BRIDGE} />;
  }
  if (status === 'elsewhere') {
    return <ArchNote text={ARCH_ELSEWHERE} />;
  }
  if (status === 'error' && error !== null) {
    return <ArchNote text={error} />;
  }
  // A repository with no `docs/arch/` at all, which is every repository until
  // somebody writes one. `present` is main's own answer to that question, and
  // it is separate from `contract === null` on purpose: a directory that
  // exists but whose every row was dropped is NOT the teaching state, it is
  // the state where the person needs to read the problems.
  if (status === 'ready' && load !== null && !load.present) {
    return <ArchEmptyState />;
  }

  return (
    <div className="arch" data-slot="arch">
      {contract !== null ? (
        <div className="arch-subject" title={contract.subject}>
          {contract.subject}
        </div>
      ) : null}

      {/* A read that failed over bytes on disk, showing the LAST GOOD rows
          under a banner naming the failure. A half written contract file must
          never blank this view: an agent rewriting `edges.json` would
          otherwise make the whole surface disappear mid save. */}
      {load?.lastValid === true ? (
        <p className="arch-lastvalid">{ARCH_LAST_VALID}</p>
      ) : null}
      <FreshnessRibbon />
      <VerdictStrip />
      <Problems />
      <FailureList
        verdicts={verdicts}
        repoPath={repoPath}
        onSelect={select}
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
      {/* LEVEL 2, the computed module view. It draws only for a component, and
          the component is the focused one, which is the same subject the prose
          panel above is describing. The props were frozen in the phase spec
          before either file was written, because the mount point and the
          component belong to different hands. */}
      <ArchModules
        cwd={repoPath}
        componentId={focusedComponentId(selected)}
        componentName={nameOf(focusedComponentId(selected) ?? '')}
        refreshKey={lastCheck?.generation ?? 0}
      />
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

/** The strip. Three lanes, never one total. */
function VerdictStrip(): React.JSX.Element | null {
  const counts = useArch((s) => s.counts());
  const verdicts = useArch((s) => s.verdicts());
  const load = useArch((s) => s.load);
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
          a person editing `baseline.json` and every accepted row shows up here
          in that person's own words. Tortie reads that file and never writes
          it, and there is no accept control anywhere on this surface. */}
      {accepted.length > 0 ? (
        <div className="arch-accepted">
          <p className="arch-strip-note">
            {`${String(counts.accepted)} accepted. ${ARCH_ACCEPTED_NOTE}`}
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
  onSelect
}: {
  verdicts: readonly ArchVerdict[];
  repoPath: string | null;
  onSelect: (id: string) => void;
}): React.JSX.Element {
  const failures = verdicts.filter(isFailure);
  return (
    <section className="arch-failures" aria-label="Promises that did not hold">
      <div className="section-header">
        <span className="section-toggle">Did not hold</span>
      </div>
      {failures.length === 0 ? (
        <p className="arch-note arch-note-inline">{ARCH_NO_FAILURES}</p>
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
                <button
                  key={`${o.fromPath}:${String(o.line)}:${String(i)}`}
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
                </button>
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
