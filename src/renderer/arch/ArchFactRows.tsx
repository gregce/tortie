/**
 * THE FACT ROWS behind every disclosure on the map tab (Phase 258): the
 * inspector's Show, a surface kind's count, and the gates worksheet all draw
 * the same list from the same read, so there is ONE row component and one
 * loader rather than three.
 *
 * A row is `subject · file:line`, optionally with the cited line after it,
 * and a click opens the file at the line through the open-file bus, the
 * Phase 63 failure-row path, on whichever computer the repository is on.
 * Nothing is fetched until a disclosure opens (`useFacts` is asked with
 * `enabled`), the rows are held once per window per key, and the map's own
 * re-read on `arch:mapUpdated` lets them go.
 *
 * Every string here renders as a text node. A subject and an evidence line
 * are bytes an agent may have written, and the browser escapes them.
 */

import React, { useEffect, useState } from 'react';
import type { ArchFact, ArchFactCategory } from '@shared/arch';
import {
  ARCH_FACTS_EMPTY,
  ARCH_FACTS_ERROR,
  ARCH_FACTS_HIDE,
  ARCH_FACTS_LOADING,
  ARCH_FACTS_SHOW,
  ARCH_FACTS_TRUNCATED
} from './copy';
import { openArchRow } from './open-row';
import { useArch } from './store';
import type { ArchFactsEntry } from './store';

/**
 * The held rows for one key, fetched on first use while `enabled`. Returns
 * null before the first read and while disabled.
 */
export function useFacts(
  repoKey: string | null,
  scope: string | null,
  categories: readonly ArchFactCategory[],
  enabled: boolean
): ArchFactsEntry | null {
  const key = categories.join(',');
  const entry = useArch((s) =>
    repoKey === null ? null : s.factsFor(repoKey, scope, categories)
  );
  const loadFacts = useArch((s) => s.loadFacts);
  useEffect(() => {
    if (!enabled || repoKey === null) return;
    void loadFacts(repoKey, scope, key.length === 0 ? [] : (key.split(',') as ArchFactCategory[]));
  }, [enabled, repoKey, scope, key, loadFacts]);
  return enabled ? entry : null;
}

/** `file:line`, the way every row names its place. */
export function whereOf(row: ArchFact): string {
  return `${row.file}:${String(row.line)}`;
}

/**
 * The rows themselves. Pure over its props so the unit suite can render it
 * to static markup; the loader above is what the surfaces hand it.
 */
export function FactRows({
  repoKey,
  entry,
  kind = null,
  evidence = false
}: {
  repoKey: string | null;
  entry: ArchFactsEntry | null;
  /** Keep only rows of this kind, or every row when null. */
  kind?: string | null;
  /** Draw the cited line after the subject, the worksheet's shape. */
  evidence?: boolean;
}): React.JSX.Element {
  if (entry === null || (entry.status === 'loading' && entry.result === null)) {
    return <p className="arch-facts-note">{ARCH_FACTS_LOADING}</p>;
  }
  if (entry.result === null) {
    return <p className="arch-facts-note">{entry.error ?? ARCH_FACTS_ERROR}</p>;
  }
  const rows = entry.result.rows.filter((r) => kind === null || r.kind === kind);
  if (rows.length === 0) {
    return <p className="arch-facts-note">{ARCH_FACTS_EMPTY}</p>;
  }
  return (
    <>
      <ul className="arch-facts" role="list">
        {rows.map((r, i) => (
          <li key={`${whereOf(r)} ${r.rule} ${String(i)}`}>
            <button
              type="button"
              className="arch-fact-row"
              disabled={repoKey === null}
              title={`Open ${whereOf(r)}`}
              onClick={() => {
                if (repoKey === null) return;
                openArchRow({ repoKey, relPath: r.file, line: r.line });
              }}
            >
              {evidence ? (
                <>
                  <span className="arch-fact-where">{whereOf(r)}</span>
                  <span className="arch-fact-subject">{r.subject}</span>
                  <span className="arch-fact-evidence">{r.evidence}</span>
                </>
              ) : (
                <>
                  <span className="arch-fact-subject">{r.subject}</span>
                  <span className="arch-fact-where">{whereOf(r)}</span>
                </>
              )}
            </button>
          </li>
        ))}
      </ul>
      {entry.result.truncated ? (
        <p className="arch-facts-note">{ARCH_FACTS_TRUNCATED}</p>
      ) : null}
      {entry.status === 'error' && entry.error !== null ? (
        <p className="arch-facts-note">{entry.error}</p>
      ) : null}
    </>
  );
}

/**
 * A Show / Hide control and, when open, the rows behind it. Nothing is
 * fetched until it opens. The kind filter narrows one category's rows to
 * one kind, which is how a surface kind's count opens its own list.
 */
export function FactDisclosure({
  repoKey,
  scope,
  categories,
  kind = null,
  evidence = false,
  label = ARCH_FACTS_SHOW,
  defaultOpen = false
}: {
  repoKey: string | null;
  scope: string | null;
  categories: readonly ArchFactCategory[];
  kind?: string | null;
  evidence?: boolean;
  /** The control's word while closed. */
  label?: string;
  defaultOpen?: boolean;
}): React.JSX.Element {
  const [open, setOpen] = useState(defaultOpen);
  const entry = useFacts(repoKey, scope, categories, open);
  return (
    <>
      <button
        type="button"
        className="arch-facts-toggle"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? ARCH_FACTS_HIDE : label}
      </button>
      {open ? (
        <FactRows repoKey={repoKey} entry={entry} kind={kind} evidence={evidence} />
      ) : null}
    </>
  );
}
