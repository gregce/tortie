/**
 * The teaching empty state, which is what almost every repository sees first.
 *
 * ## Why it teaches rather than apologises
 *
 * A view that opens on "No contract found" has told the person the one thing
 * they already knew and nothing they can act on. The whole idea here is
 * unusual enough that the empty state has to carry it: what a promise is, how
 * many of them a healthy set holds, and the two ways to get one.
 *
 * ## The two routes, and what each of them writes
 *
 *  1. **Draft a contract.** Main composes a deterministic skeleton and writes
 *     nothing. Every file arrives as text and opens as an editor buffer that
 *     is dirty from the moment it appears, so the person reads it, edits it
 *     and presses Save, or closes it and nothing happened. The one write this
 *     gesture makes is creating the folders those buffers would be saved into,
 *     and the control says so before it is pressed.
 *  2. **Ask an agent to draft it.** The prompt is composed here, copied to the
 *     clipboard, and the ORDINARY new session sheet opens. The person picks
 *     the agent, the launch flags and the capture setting exactly as they
 *     would for any other session. Tortie starts nothing, and nothing is typed
 *     into any session: sending a composed payload to a running agent is a
 *     later slice's verb, and this phase refuses it in writing.
 *
 * The prompt is shown in full underneath, in a plain text box, for two
 * reasons. A person should be able to read what they are about to hand an
 * agent before they hand it over. And a clipboard that refuses, which happens,
 * must not leave the gesture with nothing to fall back on.
 *
 * ## The number in the guidance is the corpus's own
 *
 * 5 to 10. Research 49 section 9.6 read thirty architecture documents the
 * operator wrote by hand and none of them opens with more than nine boxes. It
 * is in the empty state AND inside the prompt, because an agent told to "write
 * the contract" with no number writes forty.
 */

import React, { useMemo } from 'react';
import { targetOfProject, localPathOf } from '@shared/workspace-target';
import { Codicon } from '../icons';
import { useApp } from '../state/store';
import {
  ARCH_DRAFT_BODY,
  ARCH_DRAFT_TITLE,
  ARCH_EMPTY_BODY,
  ARCH_EMPTY_TITLE,
  ARCH_PROMISE_GUIDANCE,
  ARCH_SEED_BODY,
  ARCH_SEED_TITLE
} from './copy';
import { seedPromptText } from './seed-prompt';
import { skeletonAvailable } from './bridge';
import { useArch } from './store';

export function ArchEmptyState(): React.JSX.Element {
  const projects = useApp((s) => s.projects);
  const activeProjectId = useApp((s) => s.activeProjectId);
  const drafting = useArch((s) => s.drafting);
  const draft = useArch((s) => s.draft);
  const seed = useArch((s) => s.seed);

  const repoPath = useMemo(() => {
    const project = projects.find((p) => p.id === activeProjectId) ?? null;
    return localPathOf(targetOfProject(project));
  }, [projects, activeProjectId]);

  const prompt = repoPath === null ? null : seedPromptText(repoPath);
  const canDraft = skeletonAvailable();

  return (
    <div className="arch arch-empty">
      <h2 className="arch-empty-title">{ARCH_EMPTY_TITLE}</h2>
      <p className="arch-empty-body">{ARCH_EMPTY_BODY}</p>
      <p className="arch-empty-body">{ARCH_PROMISE_GUIDANCE}</p>

      <div className="arch-empty-actions">
        <button
          type="button"
          className="arch-empty-action"
          disabled={!canDraft || drafting || repoPath === null}
          onClick={() => void draft()}
        >
          <Codicon name="new-file" size={14} />
          <span className="arch-empty-action-title">{ARCH_DRAFT_TITLE}</span>
          <span className="arch-empty-action-body">{ARCH_DRAFT_BODY}</span>
        </button>
        <button
          type="button"
          className="arch-empty-action"
          disabled={repoPath === null}
          onClick={() => seed()}
        >
          <Codicon name="comment" size={14} />
          <span className="arch-empty-action-title">{ARCH_SEED_TITLE}</span>
          <span className="arch-empty-action-body">{ARCH_SEED_BODY}</span>
        </button>
      </div>

      {prompt !== null ? (
        <details className="arch-empty-prompt">
          <summary>What the prompt says</summary>
          {/* PLAIN TEXT, for the reason the prose panel is plain text: this is
              the text that will reach an agent, and a person is entitled to
              read the bytes rather than a rendering of them. */}
          <pre className="arch-empty-prompt-text">{prompt}</pre>
        </details>
      ) : null}
    </div>
  );
}
