/**
 * The glance (§7.1) — a 420px card that answers "what is this" without a
 * click, at any pane width.
 *
 * IT IS LOAD BEARING AT 220px, not decoration. §5.9 drops the summary out of
 * the row entirely at the narrowest tier, and §6.6 says where it goes: here.
 * So this card is the only place a 220px pane can tell you what `impeccable`
 * does, which is why it is in the view rather than deferred to the detail tab.
 *
 * Rendered into a body portal, because `position: fixed` is the only way out of
 * the sidebar's own overflow, and anchored beside the row rather than over it —
 * the same geometry the SCM commit card uses (scm/HoverCard.tsx), narrowed from
 * 520 to 420 per §7.1. It flips upward instead of clipping the window bottom.
 *
 * Not interactive on purpose. The SCM card has to be, because it carries a
 * "Open on GitHub" target; this one carries a copy affordance for the path and
 * nothing else, and a card you can put the pointer inside is a card that has to
 * decide when to close.
 */

import React, { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AgentIcon, Codicon } from '../icons';
import { agentShortLabel } from '../state/agents';
import {
  CONTEXT_CATEGORY_ICON,
  SCOPE_GROUP_LABEL,
  scopeGroupHint,
  shadowHint
} from './groups';
import type { ContextEntry } from './model';

/** Viewport inset the card never crosses (px), and its width (§7.1). */
const EDGE = 8;
const CARD_WIDTH = 420;

export interface ContextHoverCardProps {
  entry: ContextEntry;
  /** The hovered row's rect at trigger time. */
  anchor: { top: number; bottom: number; right: number };
  /** How many registry agents exist, so "all of them" can be said as such. */
  totalAgents: number;
  onCopyPath(path: string): void;
}

export function ContextHoverCard({
  entry,
  anchor,
  totalAgents,
  onCopyPath
}: ContextHoverCardProps): React.JSX.Element {
  const ref = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number }>({
    left: anchor.right + EDGE,
    top: anchor.top
  });

  useLayoutEffect(() => {
    const el = ref.current;
    if (el === null) return;
    const height = el.offsetHeight;
    const left = Math.min(
      anchor.right + EDGE,
      window.innerWidth - CARD_WIDTH - EDGE
    );
    // Flip above the row rather than clip at the window bottom.
    const top =
      anchor.top + height + EDGE > window.innerHeight
        ? Math.max(EDGE, anchor.bottom - height)
        : anchor.top;
    setPos({ left: Math.max(EDGE, left), top });
  }, [anchor.top, anchor.bottom, anchor.right, entry.id]);

  const scopeLine = SCOPE_GROUP_LABEL[entry.scope];

  return createPortal(
    <div
      ref={ref}
      className="ctx-card"
      role="tooltip"
      style={{ left: pos.left, top: pos.top, width: CARD_WIDTH }}
    >
      <div className="ctx-card-head">
        <Codicon name={CONTEXT_CATEGORY_ICON[entry.category]} size="lg" />
        <span className="ctx-card-name">{entry.name}</span>
      </div>

      {entry.summary !== '' ? (
        <p className="ctx-card-summary">{entry.summary}</p>
      ) : null}

      <p className="ctx-card-scope" title={scopeGroupHint(entry.category, entry.scope)}>
        {scopeLine}
      </p>

      {entry.shadows.length > 0 ? (
        <p className="ctx-card-shadow">{shadowHint(entry)}</p>
      ) : null}

      {entry.problem !== null ? (
        <>
          <p className="ctx-card-problem">{entry.problem.message}</p>
          {/* Phase 26.2 — the guided fix rides with the warning. The card is
              not interactive, so the Open Folder affordance lives on the
              section row and in the detail view, and this line carries the
              words. */}
          {entry.problem.fix !== undefined ? (
            <p className="ctx-card-quiet">{entry.problem.fix}</p>
          ) : null}
        </>
      ) : null}

      {/* Phase 26.2 — a vendor-owned naming disagreement. One quiet sentence
          naming the owner, secondary tone, no error icon, because the user
          cannot act on someone else's installation. */}
      {entry.payload.kind === 'skill' && entry.payload.namingNote !== undefined ? (
        <p className="ctx-card-quiet">{entry.payload.namingNote}</p>
      ) : null}

      {entry.agents.length > 0 ? (
        <div className="ctx-card-agents">
          <span className="ctx-card-agents-label">
            {entry.agents.length === totalAgents && totalAgents > 0
              ? 'Loaded by every agent you have'
              : 'Loaded by'}
          </span>
          <span className="ctx-card-logos">
            {entry.agents.map((id) => (
              <span key={id} className="ctx-card-logo" title={agentShortLabel(id)}>
                <AgentIcon agent={id} size={14} />
              </span>
            ))}
          </span>
        </div>
      ) : null}

      <button
        type="button"
        className="ctx-card-path"
        title="Copy this path"
        onClick={() => onCopyPath(entry.sourcePath)}
      >
        <span className="ctx-card-path-text">{entry.sourcePath}</span>
        <Codicon name="copy" size="sm" />
      </button>
    </div>,
    document.body
  );
}
