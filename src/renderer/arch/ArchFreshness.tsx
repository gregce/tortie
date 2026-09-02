/**
 * THE FRESHNESS AND REPAIR FACE of the Architecture pane (Phase 172, the
 * view seam).
 *
 * The ribbon and the change diff moved whole out of ArchView.tsx, bodies
 * unchanged: the freshness sentence in commits and never days, the repair
 * control's pure mount rule, the ribbon row that carries both, and the
 * Phase 159 changed section that draws main's own burst and counts
 * nothing. ChangedSection stays last in this file on purpose: the p159
 * suite reads it as source from its declaration to the end of the file.
 */

import React from 'react';
import { Codicon } from '../icons';
import { verdictClass, verdictIcon } from './ArchVerdicts';
import { passAvailable } from './bridge';
import {
  changeLabel,
  changeSelectId,
  changeWord,
  hasChanges,
  orderedChanges,
  orderedParts,
  partDelta,
  partSelectId,
  shortCommit
} from './changes';
import {
  ARCH_CHANGES_BODY,
  ARCH_CHANGES_TITLE,
  ARCH_REPAIR_BODY,
  ARCH_REPAIR_LABEL,
  freshnessSentence,
  partChangeTitle
} from './copy';
import { useArch } from './store';

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
export function FreshnessRibbon({
  repoPath
}: {
  repoPath: string | null;
}): React.JSX.Element | null {
  const rows = useArch((s) => s.freshness());
  const nameOf = useArch((s) => s.nameOf);
  // PHASE 159, THE ONE KEYPRESS. Main says on every load and every check
  // whether something drifted, being a promise that broke or a part that
  // fell behind, and the control mounts on that answer alone: no second
  // arithmetic here, and no number on the face. It asks for the SAME pass
  // the fill in button asks for, scoped to what drifted, and main holds
  // the gate exactly as it does for that button.
  const drifted = useArch((s) => s.driftCount()) > 0;
  const repairDrift = useArch((s) => s.repairDrift);
  const enriching = useArch((s) => s.enriching);
  const drafting = useArch((s) => s.drafting);
  const entry = useArch((s) =>
    repoPath === null ? null : (s.passes[repoPath] ?? null)
  );
  const face = repairFace({
    drifted,
    chosen: entry?.status?.chosen === true,
    available: passAvailable(),
    busy: enriching || drafting || entry?.status?.running === true
  });
  if (rows.length === 0 && face === 'none') return null;
  return (
    <RibbonRow
      sentence={freshnessSentence(rows, nameOf)}
      repair={face}
      onRepair={() => void repairDrift()}
    />
  );
}

/** What the ribbon's one control is doing: absent, ready, or held while a pass runs. */
export type RepairFace = 'none' | 'ready' | 'busy';

/**
 * The mount rule for the repair control, pure so the suite can hold it.
 *
 * It draws only when main counted drift, only when an agent is chosen, the
 * run face's own rule, because a control that can only ever come back
 * refused is not a control, and only in a build with the pass half. While
 * any pass or draft is out it stays on screen and disabled, like the fill
 * in button, so a second press cannot start a second ask.
 */
export function repairFace(input: {
  drifted: boolean;
  chosen: boolean;
  available: boolean;
  busy: boolean;
}): RepairFace {
  if (!input.drifted || !input.chosen || !input.available) return 'none';
  return input.busy ? 'busy' : 'ready';
}

/** The ribbon's row: the sentence, and the one control when it has a face. */
export function RibbonRow({
  sentence,
  repair,
  onRepair
}: {
  sentence: string;
  repair: RepairFace;
  onRepair: () => void;
}): React.JSX.Element {
  return (
    <div className="arch-ribbon-row">
      <p className="arch-ribbon">{sentence}</p>
      {repair !== 'none' ? (
        <button
          type="button"
          className="icon-btn arch-ribbon-repair"
          aria-label={ARCH_REPAIR_LABEL}
          title={ARCH_REPAIR_BODY}
          disabled={repair === 'busy'}
          onClick={onRepair}
        >
          <Codicon name="sparkle" size="md" />
        </button>
      ) : null}
    </div>
  );
}

/**
 * THE CHANGE DIFF (Phase 159). What the last check moved, against the check
 * before it, in the failure list's house shape.
 *
 * Every row here was computed in MAIN, inside the one check where the
 * previous verdict set and the next both exist, and persisted as one burst
 * per repository. The section draws that record and counts nothing: no
 * second arithmetic over the verdicts, which is the store's own rule for
 * the strip and holds here for the same reason. It does not mount at all
 * when there is no burst or the burst is empty, so a repository whose
 * checks keep agreeing shows no header over nothing.
 *
 * JUST ENOUGH WORDS. One header with the commit the burst landed at, one
 * line per moved promise, being a glyph, the subject's name and two verdict
 * words with an arrow between them, and one line per part that fell
 * further behind with a chip saying by how much. The checker's reason is
 * the hover title and is never on the face. Every row selects its subject
 * through the same `select` the failure list uses, so the prose panel and
 * the module view below answer to it.
 */
export function ChangedSection({
  onSelect
}: {
  onSelect: (id: string) => void;
}): React.JSX.Element | null {
  const changes = useArch((s) => s.changes());
  const verdicts = useArch((s) => s.verdicts());
  const nameOf = useArch((s) => s.nameOf);
  if (changes === null || !hasChanges(changes)) return null;
  // The reason is the current verdict's own sentence for the subject, read
  // from the set in force rather than carried twice on the burst.
  const reasonOf = (subjectId: string): string | undefined =>
    verdicts.find((v) => v.subjectId === subjectId)?.reason ?? undefined;
  return (
    <section className="arch-changes" aria-label={ARCH_CHANGES_TITLE}>
      <div className="section-header" title={ARCH_CHANGES_BODY}>
        <span className="section-toggle">{ARCH_CHANGES_TITLE}</span>
        <span className="arch-changes-commit">
          {shortCommit(changes.toCommit)}
        </span>
      </div>
      <ul>
        {orderedChanges(changes).map((c) => {
          // A subject this check dropped wears the unknown glyph and colour:
          // it is gone rather than broken, and grey says so without a word.
          const shown = c.to ?? 'unverifiable';
          return (
            <li key={c.subjectId} className={verdictClass(shown)}>
              <button
                type="button"
                className="arch-change-head"
                title={reasonOf(c.subjectId)}
                onClick={() => onSelect(changeSelectId(c))}
              >
                <Codicon name={verdictIcon(shown)} size="sm" />
                <span className="arch-change-name">
                  {changeLabel(c.subjectId, nameOf)}
                </span>
                <span className="arch-change-verdicts">
                  <span>{changeWord(c.from, 'from')}</span>
                  <Codicon name="arrow-small-right" size="sm" />
                  <span>{changeWord(c.to, 'to')}</span>
                </span>
              </button>
            </li>
          );
        })}
        {orderedParts(changes).map((p) => (
          <li key={`part:${p.componentId}`} className="arch-change-part">
            <button
              type="button"
              className="arch-change-head"
              title={partChangeTitle(p.commitsBehindDelta, p.uncommittedFiles)}
              onClick={() => onSelect(partSelectId(p))}
            >
              <Codicon name="git-commit" size="sm" />
              <span className="arch-change-name">{nameOf(p.componentId)}</span>
              <span className="arch-change-delta">{partDelta(p)}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
