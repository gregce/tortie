/**
 * The detail surface — one component, three modes (research 29 §7 and §8.3).
 *
 *   browse    something on disk. Header card over the file's own content.
 *   session   the same card, plus the launch time and the drift sentence.
 *   preview   something not on disk yet, over its own fetched text.
 *
 * Making it one component before the drift rather than after it is DESIGN.md
 * §11.1's rule applied early: `AgentGrid` became one component only after the
 * ⌘T copy had already rotted in two places.
 *
 * The body under the card is a SLOT, not an import. In browse mode the body is
 * the file on disk and the right renderer for it is the S5B markdown preview
 * the editor already owns, which needs an `EditorTab` this component has no
 * business constructing. The `context:<id>` tab host passes `renderBody`. In
 * preview mode there is no slot at all, because remote text is never trusted
 * text and it renders as plain text inside `PreviewCard`.
 */

import React from 'react';
import type { ContextRowDrift, ContextEntry } from '../model';
import type { McpCheckResult } from './category-rows';
import { ContextDetailEmpty } from './DetailEmpty';
import { DetailHeaderCard } from './DetailHeaderCard';
import type { AgentPrecedenceNote } from './DetailHeaderCard';
import { PreviewCard } from './PreviewCard';
import type { PreviewCardProps } from './PreviewCard';
import type { AgentReload, SessionContext } from './model';
import './surface.css';

export type ContextDetailMode = 'browse' | 'session' | 'preview';

interface InstalledProps {
  mode: 'browse' | 'session';
  entry: ContextEntry;
  agentReload: readonly AgentReload[];
  /** One sentence per agent whose precedence model names no winner. */
  precedenceNotes?: readonly AgentPrecedenceNote[];
  session?: SessionContext | null;
  drift?: ContextRowDrift;
  check?: McpCheckResult | null;
  onOpenPath(path: string, line?: number): void;
  onCheckConnection?: () => void;
  /** The artifact's own content, rendered by whoever owns that renderer. */
  renderBody?: () => React.ReactNode;
}

interface PreviewProps extends PreviewCardProps {
  mode: 'preview';
}

export type ContextDetailProps = InstalledProps | PreviewProps;

export function ContextDetail(props: ContextDetailProps): React.JSX.Element {
  if (props.mode === 'preview') {
    const { mode: _mode, ...card } = props;
    return (
      <div className="ctxd-detail">
        <PreviewCard {...card} />
      </div>
    );
  }

  const {
    entry,
    agentReload,
    precedenceNotes,
    session,
    drift,
    check,
    onOpenPath,
    onCheckConnection,
    renderBody
  } = props;

  return (
    <div className="ctxd-detail">
      <DetailHeaderCard
        entry={entry}
        agentReload={agentReload}
        {...(precedenceNotes !== undefined ? { precedenceNotes } : {})}
        {...(session !== undefined ? { session } : {})}
        {...(drift !== undefined ? { drift } : {})}
        {...(check !== undefined ? { check } : {})}
        onOpenPath={onOpenPath}
        {...(onCheckConnection !== undefined ? { onCheckConnection } : {})}
      />
      <div className="ctxd-detail-body">
        {renderBody !== undefined ? (
          renderBody()
        ) : (
          <ContextDetailEmpty entry={entry} />
        )}
      </div>
    </div>
  );
}
