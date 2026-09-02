/**
 * THE CONTRACT AND VERDICTS FACE of the Architecture pane (Phase 172, the
 * view seam).
 *
 * The verdict vocabulary and the six contract sections moved whole out of
 * ArchView.tsx, bodies unchanged: the glyph and class a verdict wears, the
 * strip that never folds three coverage lanes into one flattering total,
 * the dropped rows, the failure list whose every row jumps, the outline,
 * the gap strip and the prose panel. The prose panel's refusal travels
 * with it: every string here renders as a text node, never markdown, never
 * raw HTML, because an agent can write the file the string came from.
 */

import React from 'react';
import type {
  ArchComponent,
  ArchCoverageCounts,
  ArchEdge,
  ArchVerdict
} from '@shared/arch';
import { archViewGapId } from '@shared/arch-ids';
import { Codicon } from '../icons';
import { requestOpenFile } from '../state/open-file';
import { AcceptDivergence, acceptEdgeId, canAcceptOffence } from './ArchPass';
import { acceptAvailable } from './bridge';
import type { ArchMapPartResult } from './bridge';
import {
  ARCH_ACCEPTED_NOTE,
  archChecksHoldWord,
  ARCH_FIRST_CHECK,
  ARCH_GAPS_TITLE,
  ARCH_NO_FAILURES,
  ARCH_NO_PROMISES_NOTE,
  ARCH_OFFENCE_ACCEPTED,
  ARCH_PARTLY_CHECKED_NOTE,
  ARCH_PROBLEMS_MORE,
  archProblemsSummary,
  ARCH_PROSE_UNVERIFIED,
  ARCH_SCOPED_LOADING,
  ARCH_SCOPED_NO_PROMISES,
  coverageWord,
  unresolvedSentence,
  verdictWord
} from './copy';
import { unparsedSentence } from './modules';
import {
  provenanceIcon,
  provenanceTitle,
  provenanceWord
} from './provenance';
import { useArch } from './store';

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
  counts: ArchCoverageCounts,
  /**
   * PHASE 178. True when the contract writes zero promises between parts.
   * The held lane then stops saying the word a person reads as a promise:
   * research 71 section 5 found "9 checked and holds" over a contract whose
   * `edges.json` was empty. On rookery all nine are anchor checks, so the
   * lane's word names checks, never a narrower kind.
   */
  noPromises = false
): { key: string; word: string; n: number; cls: string; icon: string }[] {
  return [
    {
      key: 'hold',
      word: noPromises
        ? archChecksHoldWord(counts.checkedHold)
        : `checked and ${verdictWord('convergent')}`,
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

/** The three lanes themselves, one markup for the whole and for a part. */
function Lanes({
  counts,
  noPromises = false
}: {
  counts: ArchCoverageCounts;
  noPromises?: boolean;
}): React.JSX.Element {
  return (
    <div className="arch-lane">
      <span className="arch-lane-counts">
        {stripLanes(counts, noPromises).map((lane) => (
          <span className={lane.cls} key={lane.key}>
            <Codicon name={lane.icon} size="sm" />
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
export function VerdictStrip({
  scoped
}: {
  scoped: ScopedView | null;
}): React.JSX.Element | null {
  const counts = useArch((s) => s.counts());
  const verdicts = useArch((s) => s.verdicts());
  const edges = useArch((s) => s.edges());
  const load = useArch((s) => s.load);
  if (scoped !== null) return <ScopedStrip scoped={scoped} />;
  if (counts === null) return null;
  const accepted = load?.baseline.accepted ?? [];
  const unresolved = unresolvedSentence(
    counts.unresolvedImports,
    counts.totalImports
  );
  // PHASE 178. With zero promises between parts there are no promise verdicts
  // at all, so the strip says so first and the held lane stops wearing the
  // word a person reads as a promise: research 71 section 5 found "9 checked
  // and holds" standing over an empty edges.json, where the nine were anchor
  // checks. Read through the store's own accessor, the sibling of counts(),
  // so the strip and the contract cannot disagree.
  const noPromises = edges.length === 0;
  // PHASE 178. The whole-repo unparsed sentence, lifted onto the resting face
  // from the level 2 module view where it sat stranded behind a drill. It is
  // why the map is thin on a repository Tortie mostly cannot read, and the
  // rows ride the counts record so nothing is derived here.
  const thin = unparsedSentence(counts.unparsed ?? []);
  // A run that has not finished has nothing to say about whether anything
  // moved, so its claims read as a question rather than as a stale verdict.
  const firstCheck = verdicts.some((v) => v.firstCheck);

  return (
    <section className="arch-strip" aria-label="Promises by coverage">
      {noPromises ? (
        <p className="arch-strip-note">{ARCH_NO_PROMISES_NOTE}</p>
      ) : null}
      <Lanes counts={counts} noPromises={noPromises} />
      {firstCheck ? (
        <div className="arch-lane">
          <span className="arch-lane-name">{ARCH_FIRST_CHECK}</span>
        </div>
      ) : null}
      {unresolved !== null ? (
        <p className="arch-strip-note">{unresolved}</p>
      ) : null}
      {thin !== null ? <p className="arch-strip-note">{thin}</p> : null}
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
 * Rows that would not load at all, FOLDED (Phase 178).
 *
 * A row is dropped WHOLE and named, never partially merged and never silently
 * dropped. That is the overlay rule from CLAUDE.md's Phase 23 section, and
 * this is what it looks like on screen: one summary line saying how many
 * files refused, with the file, the field and the reason for every one of
 * them behind a disclosure. Rookery drew 34 near identical red rows on the
 * resting face out of 17 files (research 71 section 5), and a wall of red is
 * not Just enough words. Phase 177 already folds the usual case to nothing,
 * so this line is the general case for contracts that still refuse rows.
 * Nothing is hidden: every row is one click away, still whole, still named.
 */
export function Problems(): React.JSX.Element | null {
  const problems = useArch((s) => s.problems());
  if (problems.length === 0) return null;
  const files = new Set(problems.map((e) => e.file)).size;
  return (
    <section className="arch-schema" aria-label="Rows that would not load">
      <div className="section-header">
        <span className="section-toggle">Would not load</span>
      </div>
      <p className="arch-note arch-note-inline">{archProblemsSummary(files)}</p>
      <details className="arch-more">
        <summary>{ARCH_PROBLEMS_MORE}</summary>
        <ul>
          {problems.map((e, i) => (
            <li key={`${e.file}:${e.field}:${String(i)}`}>
              <Codicon name="error" size="sm" />
              <span className="arch-schema-file">{e.file}</span>
              <span className="arch-schema-field">{e.field}</span>
              <span className="arch-schema-reason">{e.message}</span>
            </li>
          ))}
        </ul>
      </details>
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
export function FailureList({
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
                <Codicon name={verdictIcon(v.status)} size="sm" />
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
export function Outline({
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
                  size="md"
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
                    <Codicon name={verdictIcon(v.status)} size="sm" />
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
export function GapStrip({
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
export function ProsePanel({
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
          <Codicon name={verdictIcon(verdict.status)} size="sm" />
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
