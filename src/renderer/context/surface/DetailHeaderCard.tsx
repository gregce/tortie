/**
 * The header card over the artifact's own content (research 29 §7.1).
 *
 * The detail tab is a rendered card ON TOP OF the file, so the second half of
 * the tab is always the truth on disk. That is deliberate: everything the card
 * says is derived, and a derived claim next to its source is checkable by the
 * person reading it.
 *
 * Three things this component will never do.
 *
 *  - Render a secret. Env values reach it as key names, and `./secrets` is the
 *    only module that decides what a secret is. There is no reveal control and
 *    the mask is not selectable.
 *  - Say a session is running with something. It can only prove what a session
 *    was LAUNCHED with, so session mode always names the launch time (§10.2).
 *  - Invent a sentence about live reload. Those come from the registry, cell by
 *    cell, and `unknown` prints its own honest sentence.
 */

import React from 'react';
import { AgentIcon, Codicon } from '../../icons';
import { CONTEXT_SCOPE_LABEL } from '../model';
import type {
  ContextCategory,
  ContextRowDrift,
  ContextEntry,
  ContextPayload,
  ContextPrecedenceModel
} from '../model';
import { CategoryRows } from './category-rows';
import type { McpCheckResult } from './category-rows';
import type { AgentReload, SessionContext } from './model';
import { driftSentence, reloadLineAgents, reloadLines } from './reload-sentence';

export const CATEGORY_LABEL: Record<ContextCategory, string> = {
  skill: 'Skill',
  mcp: 'MCP server',
  hook: 'Hook',
  plugin: 'Plugin',
  instruction: 'Instructions'
};

/**
 * One agent's rule for this entry's category, in that agent's own words.
 *
 * It is rendered for the models that RESOLVE NOTHING, which is where the panel
 * was previously silent. `resolve.ts` promises "All three produce two rows and
 * a sentence, never a made-up winner", and the two rows arrived while the
 * sentence did not: `entry.model` and `verdicts[].model` crossed the bridge and
 * nothing in the renderer read either of them. A card for a Codex skill with a
 * second copy three rows below it said nothing about the second copy, and a
 * Cursor card said nothing about Tortie not knowing Cursor's rule.
 */
export interface AgentPrecedenceNote {
  agentId: string;
  agentName: string;
  model: ContextPrecedenceModel;
  /** The registry's own sentence. Never composed here. */
  note: string;
}

export interface DetailHeaderCardProps {
  entry: ContextEntry;
  /** Per-agent live reload for this entry's category, straight from the registry. */
  agentReload: readonly AgentReload[];
  /** The rule sentence for each agent whose model names no winner. */
  precedenceNotes?: readonly AgentPrecedenceNote[];
  /** Set in session mode. Absent in browse mode. */
  session?: SessionContext | null;
  /** How this row differs from the snapshot the session was launched with. */
  drift?: ContextRowDrift;
  check?: McpCheckResult | null;
  onOpenPath(path: string, line?: number): void;
  onCheckConnection?: () => void;
  /**
   * Phase 26.2 — reveals a folder in the Finder, for the Open Folder
   * affordance beside a guided fix. Absent means no button, never a dead one.
   */
  onRevealPath?(path: string): void;
}

function relativeAge(then: number, now: number): string {
  const mins = Math.max(0, Math.round((now - then) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

/** A skill's defining file has a name worth using; everything else does not. */
function openLabelFor(entry: ContextEntry): string {
  return entry.category === 'skill' ? 'Open SKILL.md' : 'Open the file';
}

/** The derived trigger sentence, which main computes and keeps on the payload. */
function triggerOf(payload: ContextPayload): string | null {
  if (payload.kind !== 'skill') return null;
  return payload.trigger.length > 0 ? payload.trigger : null;
}

export function DetailHeaderCard({
  entry,
  agentReload,
  precedenceNotes = [],
  session,
  drift,
  check,
  onOpenPath,
  onCheckConnection,
  onRevealPath
}: DetailHeaderCardProps): React.JSX.Element {
  const trigger = triggerOf(entry.payload);
  const reload = reloadLines(agentReload);
  const driftLine = drift === undefined ? null : driftSentence(drift);

  return (
    <section className="ctxd-card" aria-label={`${entry.name} details`}>
      <header className="ctxd-card-head">
        <h2 className="ctxd-card-title">{entry.name}</h2>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() =>
            onOpenPath(entry.sourcePath, entry.problem?.line ?? undefined)
          }
        >
          {openLabelFor(entry)}
        </button>
      </header>

      <p className="ctxd-card-line ctxd-card-provenance">
        <span>{CATEGORY_LABEL[entry.category]}</span>
        <span className="ctxd-dot">·</span>
        <span>{CONTEXT_SCOPE_LABEL[entry.scope]}</span>
        <span className="ctxd-dot">·</span>
        <span className="ctxd-mono ctxd-path">{entry.sourcePath}</span>
      </p>

      {entry.problem !== null ? (
        <>
          <p className="ctxd-error">
            <Codicon name="error" size="md" />
            {entry.problem.message}
          </p>
          {/* Phase 26.2 — a user-owned naming problem carries its way out:
              both fixes in one sentence, and Open Folder beside them. Tortie
              states the fix and never applies it. */}
          {entry.problem.fix !== undefined ? (
            <p className="ctxd-muted ctxd-problem-fix">
              <span>{entry.problem.fix}</span>
              {entry.problem.revealDir !== undefined && onRevealPath !== undefined ? (
                <button
                  type="button"
                  className="btn-text"
                  onClick={() => onRevealPath(entry.problem?.revealDir ?? '')}
                >
                  Open Folder
                </button>
              ) : null}
            </p>
          ) : null}
        </>
      ) : null}

      {entry.agents.length > 0 ? (
        <p className="ctxd-card-row">
          <span className="ctxd-card-label">Loaded by</span>
          <span className="ctxd-agents">
            {entry.agents.map((id) => (
              <span key={id} className="ctxd-agent" title={id}>
                <AgentIcon agent={id} size={14} />
                <span className="ctxd-agent-name">{id}</span>
              </span>
            ))}
          </span>
        </p>
      ) : null}

      {/* §4: a losing duplicate is never its own row. It is a mark on the
          winner and a line here, which is the only place the whole picture
          fits. The reason names both ends and the direction, because with
          skills the direction is the surprising half. */}
      {entry.shadows.map((shadow) => (
        <p key={shadow.sourcePath} className="ctxd-card-row ctxd-shadow">
          <Codicon name="layers" size="md" />
          <span className="ctxd-card-value">
            <span className="ctxd-mono ctxd-path">{shadow.sourcePath}</span>
            <span className="ctxd-shadow-reason">{shadow.reason}</span>
            <button
              type="button"
              className="btn-text"
              onClick={() => onOpenPath(shadow.sourcePath)}
            >
              Open
            </button>
          </span>
        </p>
      ))}

      {/* The three models that name no winner. Codex keeps both copies, muse
          resolves it inside its own CLI, and `unknown` is Tortie admitting it
          never established the rule. Each sentence is the registry's, and it is
          labelled with the agent it belongs to rather than composed into one
          claim about all of them. */}
      {precedenceNotes.length > 0 ? (
        <div className="ctxd-card-note ctxd-precedence">
          {precedenceNotes.map((row) => (
            <p
              key={row.agentId}
              className={`ctxd-muted ctxd-precedence-${row.model}`}
            >
              <span className="ctxd-precedence-who">{row.agentName}</span>
              {row.note}
            </p>
          ))}
        </div>
      ) : null}

      {trigger !== null ? (
        <p className="ctxd-card-row">
          <span className="ctxd-card-label">Trigger</span>
          <span className="ctxd-card-value">{trigger}</span>
        </p>
      ) : null}

      <CategoryRows
        payload={entry.payload}
        sourcePath={entry.sourcePath}
        onOpenPath={onOpenPath}
        {...(onCheckConnection !== undefined ? { onCheckConnection } : {})}
        {...(check !== undefined ? { check } : {})}
      />

      {reload.length > 0 ? (
        <div className="ctxd-card-note ctxd-reload">
          {reload.map((line) => (
            <p
              key={`${line.behavior}-${line.agentNames.join(',')}`}
              className={`ctxd-muted ctxd-reload-${line.behavior}`}
            >
              {/* The agents are a LABEL on the registry's sentence, not part of
                  it. Keeping them in their own element is what stops a future
                  edit turning "who this applies to" into composed prose that
                  claims something the registry did not. */}
              <span className="ctxd-reload-who">{reloadLineAgents(line)}</span>
              {line.note}
            </p>
          ))}
        </div>
      ) : null}

      {session !== null && session !== undefined ? (
        <div className="ctxd-card-note ctxd-session">
          <p className="ctxd-muted">
            {`${session.sessionName} started ${relativeAge(session.startedAt, Date.now())}.`}
          </p>
          {driftLine !== null ? (
            <p className="ctxd-warning">{driftLine}</p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
