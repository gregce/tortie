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
 * and the four labels. The model half of this view, being the journeys and
 * the sentences about why work proceeds or stops, is Phase 259's and there is
 * no placeholder for it here.
 */

import React, { useMemo, useState } from 'react';
import type { ArchMapResult } from './bridge';
import {
  ARCH_GATE_KINDS,
  ARCH_GATES_NAME_ONE,
  ARCH_GATES_SCOPE_LABEL,
  ARCH_GATES_WHOLE,
  archGatesAnswer,
  archGatesBreakdown
} from './copy';
import { FactRows, useFacts } from './ArchFactRows';
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

export function ArchGates({
  repoKey,
  model,
  initialScope = null
}: {
  repoKey: string | null;
  model: ArchMapResult;
  /** A box id the Guards link named, or null to start unnamed. */
  initialScope?: string | null;
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

  return (
    <div className="arch-gates" data-slot="arch-gates">
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
          <div className="arch-gates-rows">
            <FactRows repoKey={repoKey} entry={filtered} evidence />
          </div>
        </>
      ) : null}
    </div>
  );
}
