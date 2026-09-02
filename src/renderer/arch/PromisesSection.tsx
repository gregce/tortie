/**
 * PROMISES — the Source Control view's fifth section (Phase 63).
 *
 * ## Why a broken promise appears in Source Control at all
 *
 * This is the operator's second rider on the Zen addition, made real. He
 * accepted the words on condition that the rule "an accepted divergence stays
 * visible" ships in the same phase as the words, so that "a person's agent
 * doing the work where they can see it" can never be read as blessing a silent
 * agent write to `baseline.json`.
 *
 * Source Control is where a person looks at what changed. Putting the broken
 * promise on that same screen is what makes the visibility structural instead
 * of promised: you cannot review a diff that broke a promise without the break
 * being in front of you. THERE IS NO ACCEPT CONTROL HERE, and that stays the
 * operator's recorded rider even after Phase 158 put an accept button on the
 * Architecture pane's failing rows: this section is visibility only. Accepting
 * a divergence is the person's own button over there, the one channel that
 * ever writes `docs/arch/baseline.json`, and the reason is typed by them.
 *
 * ## Why a fifth SECTION rather than a mark on the changed rows
 *
 * The charter and research 49 read differently on this and the charter wins,
 * so this says which out loud. Research 49 says "beside the changed files that
 * caused them", which reads as a decoration on the row. The charter names
 * `SCM_SECTION_IDS` as "the list a divergence section joins", which decides it
 * as a section. Three things settle it in the charter's favour. A divergence
 * has a LINE, and a row decoration has nowhere to put one, so the jump would
 * be lost. A divergence can name a file that is not in the diff at all, which
 * is common and which a row decoration could not draw. And the SCM view's
 * sections are already reorderable and collapsible per person, so a section is
 * something they can put where they want or fold away, which a decoration
 * bolted onto every row is not.
 *
 * ## What it refuses
 *
 * No count badge on the Source Control rail item. No session status ever
 * changes. No colour outside the verdict vocabulary the Architecture view
 * already uses, and no amber anywhere. It renders NOTHING when there is
 * nothing broken, so a repository with no contract has four sections and no
 * empty fifth one, which is the rule the Runs section already follows.
 *
 * ## It reads and never fetches
 *
 * Every row is derived from verdicts the arch store already holds. This
 * section starts no check, opens no file and asks main for nothing. If the
 * Architecture view has never been opened in this session there is nothing to
 * draw and the section is not there, which is the honest answer rather than a
 * section that says nothing.
 */

import React, { useMemo, useState } from 'react';
import { Codicon } from '../icons';
import { requestOpenFile } from '../state/open-file';
import { verdictWord } from './copy';
import { archDivergences } from './divergences';
import { useArch } from './store';
import './arch.css';

export function PromisesSection({
  repoPath
}: {
  repoPath: string;
}): React.JSX.Element | null {
  const [collapsed, setCollapsed] = useState(false);
  const load = useArch((s) => s.load);
  const lastCheck = useArch((s) => s.lastCheck);

  const rows = useMemo(
    () => archDivergences(lastCheck?.verdicts ?? load?.verdicts ?? []),
    [lastCheck, load]
  );

  if (rows.length === 0) return null;

  return (
    <section
      className={`section-scm${collapsed ? ' collapsed' : ''}`}
      data-section-root="promises"
    >
      <div
        className={`section-header${collapsed ? ' collapsed' : ''}`}
        data-section="promises"
      >
        <button
          type="button"
          className="section-toggle"
          aria-expanded={!collapsed}
          onClick={() => setCollapsed(!collapsed)}
        >
          <span className="section-chevron">
            <Codicon name="chevron-down" size="sm" />
          </span>
          Promises
          {/* The count is on the SECTION HEADER, where Changes already puts
              one, and nowhere else. It is not a badge on the rail and it is
              not a badge on a node, both of which this phase refuses: a number
              inside a section a person opened is an answer, and a number on a
              rail they did not open is a demand. */}
          <span className="section-count num">{rows.length}</span>
        </button>
        <span className="section-spacer" />
        <span className="section-gripper" aria-hidden="true">
          <Codicon name="gripper" size="md" />
        </span>
      </div>
      {!collapsed ? (
        <div className="section-body">
          <ul className="arch-scm-rows">
            {rows.map((r) => (
              <li key={`${r.subjectId}:${r.path}:${String(r.line)}`}>
                <button
                  type="button"
                  className="arch-scm-row"
                  title={`${r.subjectId} ${verdictWord(r.status)}. Open ${r.path} at line ${String(r.line)}.`}
                  onClick={() => {
                    requestOpenFile({
                      repoPath,
                      relPath: r.path,
                      path: `${repoPath}/${r.path}`,
                      mode: 'file',
                      // 'search' is the one source value the editor acts on,
                      // and it is right here for the same reason: this is a
                      // NAVIGATION to a line rather than an open of a file.
                      source: 'search',
                      preview: true,
                      selection: { line: r.line }
                    });
                  }}
                >
                  <Codicon
                    name={r.status === 'absent' ? 'circle-slash' : 'error'}
                    size="sm"
                  />
                  <span className="arch-scm-path">{r.path}</span>
                  <span className="arch-scm-line">{`:${String(r.line)}`}</span>
                  <span className="arch-scm-subject">{r.subjectId}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
