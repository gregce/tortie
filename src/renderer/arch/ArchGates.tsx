/**
 * THE GATES WORKSHEET (Phase 258): runstory's one computing device, the
 * thing its successors lost (research 118 §3.2 item 4, §9's last paragraph),
 * and the one view on this tab that needs no model at all.
 *
 * A person names a part, or a region, or the whole repository, in one native
 * select, ticks which of the four gate kinds they mean, and the view answers
 * with the gate facts under that scope's files: one line with the count and
 * its denominators, one line with the four counts, then the rows, each
 * opening the file at the line. Everything is recomputed on every change
 * from ONE `arch:facts` read per scope; the whole-repository count on the
 * first line is a second read of the same channel under the null scope.
 *
 * Nothing is drawn until a part is named, so the resting face is the select
 * and the four labels.
 *
 * PHASE 259 ADDED THE MODEL HALF AND MOVED NONE OF THE COMPUTED ONE. When an
 * agent has read this repository, the reasons it wrote for the named part are
 * drawn UNDER the counts and ABOVE the rows, each with the citations that back
 * it graded and the part's backing rate beside its floor. When nothing has
 * read it, the view says so in one line with a link to Settings and then draws
 * the whole worksheet underneath, because the deterministic half is complete
 * without any model and OFF MUST NEVER READ AS BROKEN.
 *
 * THE MODEL'S ANSWER IS NEVER THE WORKSHEET'S ANSWER. The count, the
 * denominators and the rows are computed from the fact base; the reason is a
 * sentence somebody's agent wrote about them. They are two blocks with two
 * labels and the model's carries `read by <agent>`.
 */

import React, { useMemo, useState } from 'react';
import type { ArchGateReading } from '@shared/arch';
import type { ArchMapResult, ArchSemanticResult } from './bridge';
import {
  ARCH_GATE_KINDS,
  ARCH_GATES_NAME_ONE,
  ARCH_GATES_REASONS,
  ARCH_GATES_SCOPE_LABEL,
  ARCH_GATES_WHOLE,
  archGatesAnswer,
  archGatesBreakdown
} from './copy';
import { FactRows, useFacts } from './ArchFactRows';
import { CiteChips, NoReading, RateLine, ReadBy } from './ArchClaim';
import { partScope, rateOf } from './cite';
import type { ArchFactsEntry } from './store';

/** One choice in the select: the scope id the channel takes, and its name. */
export interface GateScope {
  /** `''` for the whole repository, else a region or box id. */
  value: string;
  name: string;
}

/** The whole repository, then each region, then each box in map order. */
export function gateScopes(model: ArchMapResult): GateScope[] {
  const out: GateScope[] = [{ value: '', name: ARCH_GATES_WHOLE }];
  const regions = (model.regions ?? []).filter((r) => r.kind !== 'outside');
  for (const r of regions) out.push({ value: r.id, name: r.label });
  const byId = new Map(model.groups.map((g) => [g.id, g]));
  const ordered =
    regions.length === 0
      ? model.groups.map((g) => g.id)
      : regions.flatMap((r) => r.groupIds);
  for (const id of ordered) {
    const g = byId.get(id);
    if (g !== undefined) out.push({ value: g.id, name: g.label });
  }
  return out;
}

/** The four counts over an answer's rows, unticked kinds included. */
export function gateCounts(entry: ArchFactsEntry | null): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const k of ARCH_GATE_KINDS) counts[k] = 0;
  for (const r of entry?.result?.rows ?? []) counts[r.kind] = (counts[r.kind] ?? 0) + 1;
  return counts;
}

/** The select's value for "nothing named yet", a byte no id can be. */
const UNNAMED = ' ';

/** The model's reasons for one named scope, in the order main answered with. */
export function gateReadingsFor(
  reading: ArchSemanticResult | null,
  scope: string | null
): readonly ArchGateReading[] {
  if (reading === null || scope === null || scope === '') return [];
  return reading.gates.filter((g) => g.partId === scope);
}

export function ArchGates({
  repoKey,
  model,
  initialScope = null,
  reading = null
}: {
  repoKey: string | null;
  model: ArchMapResult;
  /** A box id the Guards link named, or null to start unnamed. */
  initialScope?: string | null;
  /**
   * PHASE 259. What an agent said about this repository, or null before the
   * read lands. The whole worksheet below draws without it.
   */
  reading?: ArchSemanticResult | null;
}): React.JSX.Element {
  const scopes = useMemo(() => gateScopes(model), [model]);
  // `null` is "nothing named yet", which is the resting face; `''` is the
  // whole repository, which a person has to choose on purpose.
  const [chosen, setChosen] = useState<string | null>(initialScope);
  const [ticked, setTicked] = useState<readonly string[]>(ARCH_GATE_KINDS);
  const named = chosen !== null;
  const scope = chosen === '' ? null : chosen;
  const entry = useFacts(repoKey, scope, ['gate'], named);
  const whole = useFacts(repoKey, null, ['gate'], named && scope !== null);
  const counts = gateCounts(entry);
  const shown = ARCH_GATE_KINDS.filter((k) => ticked.includes(k));
  const n = shown.reduce((sum, k) => sum + (counts[k] ?? 0), 0);
  const total = whole?.result == null ? null : whole.result.rows.length;
  const scopeName = scopes.find((s) => s.value === chosen)?.name ?? null;
  const filtered: ArchFactsEntry | null =
    entry?.result == null
      ? entry
      : {
          ...entry,
          result: {
            ...entry.result,
            rows: entry.result.rows.filter((r) => shown.includes(r.kind))
          }
        };

  const reasons = gateReadingsFor(reading, scope);
  const rate =
    reading === null || scope === null || scope === ''
      ? null
      : rateOf(reading.rates, partScope(scope));

  return (
    <div className="arch-gates" data-slot="arch-gates">
      {reading === null || reading.readAt === null ? <NoReading /> : null}
      <div className="arch-gates-controls">
        <select
          className="arch-gates-select"
          aria-label={ARCH_GATES_SCOPE_LABEL}
          value={chosen ?? UNNAMED}
          onChange={(e) => setChosen(e.target.value === UNNAMED ? null : e.target.value)}
        >
          <option value={UNNAMED}>{ARCH_GATES_NAME_ONE}</option>
          {scopes.map((s) => (
            <option key={s.value} value={s.value}>
              {s.name}
            </option>
          ))}
        </select>
        <span className="arch-gates-kinds">
          {ARCH_GATE_KINDS.map((k) => (
            <label key={k} className="arch-gates-kind" data-kind={k}>
              <input
                type="checkbox"
                checked={ticked.includes(k)}
                onChange={(e) =>
                  setTicked((v) =>
                    e.target.checked ? [...v, k] : v.filter((x) => x !== k)
                  )
                }
              />
              <span>{k}</span>
            </label>
          ))}
        </span>
      </div>
      {named ? (
        <>
          <p className="arch-gates-answer" data-count={n}>
            {archGatesAnswer(
              n,
              scope === null ? null : scopeName,
              entry?.result?.parsed ?? 0,
              total
            )}
            <span>{archGatesBreakdown(counts)}</span>
          </p>
          {reasons.length === 0 ? null : (
            <section className="arch-gate-reasons">
              <p className="arch-journeys-sub">
                {ARCH_GATES_REASONS} <ReadBy agentId={reasons[0]?.agentId ?? null} />
                {rate === null ? null : (
                  <>
                    {' '}
                    <RateLine rate={rate} />
                  </>
                )}
              </p>
              <ul className="arch-gate-reason-list" role="list">
                {reasons.map((g) => (
                  <li
                    key={g.gateId}
                    className="arch-gate-reason arch-claim"
                    data-field="gate"
                    data-answer={g.answer}
                    data-stale={g.stale ? 'true' : 'false'}
                    {...(g.stale && g.staleReason !== null
                      ? { title: g.staleReason }
                      : {})}
                  >
                    <span className="arch-gate-question">{g.question}</span>
                    <span className="arch-gate-answer">{g.answer}</span>
                    <span className="arch-claim-text">{g.because}</span>
                    <CiteChips cites={g.cites} repoKey={repoKey} />
                  </li>
                ))}
              </ul>
            </section>
          )}
          <div className="arch-gates-rows">
            <FactRows repoKey={repoKey} entry={filtered} evidence />
          </div>
        </>
      ) : null}
    </div>
  );
}
