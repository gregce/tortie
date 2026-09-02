/**
 * THE CONTRACT OFFER, one path in since Phase 158.
 *
 * ## Why there is one button where there were two
 *
 * Until this phase the section offered a fork: a deterministic skeleton as
 * unsaved buffers, or a prompt to paste at an agent. The operator pressed the
 * second one and it was bad, and he ruled the fork itself the defect: picking
 * determinism or no determinism must never be an operator choice. So there is
 * one way a contract starts. The button asks MAIN to write the deterministic
 * skeleton under `docs/arch/`, the write lands as an ordinary uncommitted
 * change a person reviews in Source Control, and where the person has picked
 * an agent in Settings the same gesture continues into the enriching pass.
 * The paste-a-prompt module is deleted, and with it the defect it carried:
 * a prompt that told every repository on this machine to read a file that
 * only exists in one of them.
 *
 * ## What the model adds, said in one quiet sentence
 *
 * The skeleton is complete on its own. A model's job is the part determinism
 * cannot do: what a part is FOR, may into must or must-not, and the gaps.
 * With an agent picked in Settings the section says the pass will follow;
 * with none it says the pass is off, plainly, so off never reads as broken.
 * The pointer is to Settings because that is the ONE gate: nothing here can
 * start an agent the person has not confirmed there.
 *
 * ## The number in the guidance is the corpus's own
 *
 * 5 to 10. Research 49 section 9.6 read thirty architecture documents the
 * operator wrote by hand and none of them opens with more than nine boxes.
 *
 * ## The resting face is one line (the copy ruling, 2026-08-28)
 *
 * The operator ruled the panel was carrying too many words. The face now
 * says one line and one labelled button; what a contract is and the 5 to 10
 * guidance sit behind the collapsed disclosure, and what the button writes
 * rides its hover title.
 */

import React, { useEffect, useMemo } from 'react';
import { targetOfProject, localPathOf } from '@shared/workspace-target';
import { Codicon } from '../icons';
import { useApp } from '../state/store';
import {
  ARCH_CONTRACT_OFFER_TITLE,
  ARCH_DRAFT_BODY,
  ARCH_DRAFT_TITLE,
  ARCH_EMPTY_BODY,
  ARCH_EMPTY_LONG,
  ARCH_EMPTY_MORE,
  ARCH_PASS_OFF,
  ARCH_PASS_QUIET,
  ARCH_PROMISE_GUIDANCE
} from './copy';
import { passAvailable, seedAvailable } from './bridge';
import { useArch } from './store';

/**
 * The one sentence about the pass, decided by what this build and this
 * repository actually have. Exported pure for the unit suite: an agent
 * picked in Settings earns the quiet promise, anything else says off
 * plainly, and a build with no pass half says nothing about a pass at all.
 */
export function passSentence(
  passHalf: boolean,
  chosen: boolean
): string | null {
  if (!passHalf) return null;
  return chosen ? ARCH_PASS_QUIET : ARCH_PASS_OFF;
}

export function ArchContractOffer(): React.JSX.Element {
  const projects = useApp((s) => s.projects);
  const activeProjectId = useApp((s) => s.activeProjectId);
  const drafting = useArch((s) => s.drafting);
  const enriching = useArch((s) => s.enriching);
  const draft = useArch((s) => s.draft);
  const loadPass = useArch((s) => s.loadPass);

  const repoPath = useMemo(() => {
    const project = projects.find((p) => p.id === activeProjectId) ?? null;
    return localPathOf(targetOfProject(project));
  }, [projects, activeProjectId]);

  // The pass status says whether an agent is picked, so the sentence under
  // the button is true rather than hopeful. One read per repository.
  useEffect(() => {
    if (repoPath !== null) void loadPass(repoPath);
  }, [repoPath, loadPass]);
  const entry = useArch((s) =>
    repoPath === null ? null : (s.passes[repoPath] ?? null)
  );

  const canDraft = seedAvailable();
  const sentence = passSentence(
    passAvailable(),
    entry?.status?.chosen ?? false
  );

  return (
    <section className="arch-empty" aria-label={ARCH_CONTRACT_OFFER_TITLE}>
      <div className="section-header">
        <span className="section-toggle">{ARCH_CONTRACT_OFFER_TITLE}</span>
      </div>
      <p className="arch-empty-body">{ARCH_EMPTY_BODY}</p>

      <div className="arch-empty-actions">
        <button
          type="button"
          className="arch-empty-action"
          disabled={!canDraft || drafting || enriching || repoPath === null}
          title={ARCH_DRAFT_BODY}
          onClick={() => void draft()}
        >
          <Codicon name="new-file" size="md" />
          <span className="arch-empty-action-title">{ARCH_DRAFT_TITLE}</span>
        </button>
      </div>

      {sentence !== null ? (
        <p className="arch-empty-body arch-pass-sentence">{sentence}</p>
      ) : null}

      {/* THE ONE DISCLOSURE (the copy ruling, 2026-08-28). The teaching
          paragraph and the corpus number live here, collapsed, so the
          resting face carries one line and the person who wants the whole
          story is one click from it. */}
      <details className="arch-more">
        <summary>{ARCH_EMPTY_MORE}</summary>
        <p className="arch-empty-body">{ARCH_EMPTY_LONG}</p>
        <p className="arch-empty-body">{ARCH_PROMISE_GUIDANCE}</p>
      </details>
    </section>
  );
}
