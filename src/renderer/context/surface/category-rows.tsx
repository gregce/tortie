/**
 * The per-category rows of the header card (research 29 §7.2), where every
 * field below was read out of a real file on the operator's machine.
 *
 * Five payloads, one row shape. Each branch answers the question its category
 * actually raises:
 *
 *   skill        what makes it fire, what it is allowed to do, what it ships
 *   mcp          what process starts, and which variables it needs by NAME
 *   hook         which event, which script, and whether that script exists
 *   plugin       where it came from down to the commit, and what it contributes
 *   instruction  where it sits in the load order, and the bytes it costs
 *
 * The MCP branch is the one with the trap in it. `tools/list` needs an
 * initialized session, which for a stdio server means spawning someone else's
 * process. So listing tools is a verb the user presses, never a refresh, and
 * the card stamps the answer with its age rather than claiming a live state
 * Tortie is not maintaining.
 */

import React from 'react';
import { Codicon } from '../../icons';
import type { ContextPayload, McpPayload } from '../model';
import { hiddenValuesSentence, maskEnv } from './secrets';

export interface CategoryRowsProps {
  payload: ContextPayload;
  /** Absolute path of the file that defines the entry. */
  sourcePath: string;
  onOpenPath(path: string, line?: number): void;
  onCheckConnection?: () => void;
  /** Tool names from the last on-demand check, and when it ran. */
  check?: McpCheckResult | null;
}

/** The result of one `[Check connection]`. Never polled, never on view open. */
export interface McpCheckResult {
  checkedAt: number;
  tools: { name: string; summary: string }[];
  error: string | null;
}

function Row({
  label,
  children
}: {
  label: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <p className="ctxd-card-row">
      <span className="ctxd-card-label">{label}</span>
      <span className="ctxd-card-value">{children}</span>
    </p>
  );
}

/** "Checked 3 minutes ago" — never "Connected", which would imply a live state. */
function checkedAge(then: number): string {
  const mins = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (mins < 1) return 'Checked just now';
  if (mins < 60) return `Checked ${mins} minutes ago`;
  const hours = Math.round(mins / 60);
  return hours < 24
    ? `Checked ${hours} hours ago`
    : `Checked ${Math.round(hours / 24)} days ago`;
}

const APPROVAL_NOTE: Record<McpPayload['approval'], string | null> = {
  approved: null,
  pending:
    'This server is listed and is not running. The agent will ask you to approve it.',
  rejected: 'You turned this server down. The agent will not start it.',
  'not-required': null
};

function McpRows({
  payload,
  sourcePath,
  onOpenPath,
  onCheckConnection,
  check
}: {
  payload: McpPayload;
  sourcePath: string;
  onOpenPath: (path: string, line?: number) => void;
  onCheckConnection?: () => void;
  check?: McpCheckResult | null;
}): React.JSX.Element {
  const env = maskEnv(payload.envKeys);
  const runs = [payload.command, ...payload.args].filter(
    (s): s is string => s !== null
  );
  const approval = APPROVAL_NOTE[payload.approval];

  return (
    <>
      <Row label="Transport">{payload.transport}</Row>
      {payload.url !== null ? (
        <Row label="Address">
          <span className="ctxd-mono ctxd-wrap">{payload.url}</span>
        </Row>
      ) : null}
      {runs.length > 0 ? (
        <Row label="Runs">
          <span className="ctxd-mono ctxd-wrap">{runs.join(' ')}</span>
        </Row>
      ) : null}
      {payload.cwd !== null ? (
        <Row label="In">
          <span className="ctxd-mono ctxd-path">{payload.cwd}</span>
        </Row>
      ) : null}

      {env.length > 0 ? (
        <>
          <Row label="Environment">
            <span className="ctxd-env">
              {env.map((pair) => (
                <span key={pair.key} className="ctxd-env-pair">
                  <span className="ctxd-mono">{pair.key}</span>
                  <span className="ctxd-mask" aria-label="hidden value">
                    {pair.value}
                  </span>
                </span>
              ))}
            </span>
          </Row>
          <p className="ctxd-card-note ctxd-muted">
            {hiddenValuesSentence(
              payload.hiddenValueCount > 0
                ? payload.hiddenValueCount
                : env.length
            )}{' '}
            <button
              type="button"
              className="btn-text"
              onClick={() => onOpenPath(sourcePath)}
            >
              Open
            </button>
          </p>
        </>
      ) : null}

      {approval !== null ? (
        <p className="ctxd-muted ctxd-card-note">{approval}</p>
      ) : null}

      <div className="ctxd-card-note">
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={onCheckConnection}
          disabled={onCheckConnection === undefined}
        >
          Check connection
        </button>
        {check !== null && check !== undefined ? (
          <span className="ctxd-muted ctxd-check-age">
            {checkedAge(check.checkedAt)}
          </span>
        ) : null}
      </div>

      {check !== null && check !== undefined && check.error !== null ? (
        <p className="ctxd-error">{check.error}</p>
      ) : null}
      {check !== null && check !== undefined && check.tools.length > 0 ? (
        <ul className="ctxd-tools">
          {check.tools.map((tool) => (
            <li key={tool.name}>
              <span className="ctxd-mono">{tool.name}</span>
              <span className="ctxd-muted"> {tool.summary}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}

export function CategoryRows({
  payload,
  sourcePath,
  onOpenPath,
  onCheckConnection,
  check
}: CategoryRowsProps): React.JSX.Element | null {
  switch (payload.kind) {
    case 'skill': {
      const bundles = [
        ['scripts', payload.bundles.scripts],
        ['references', payload.bundles.references],
        ['assets', payload.bundles.assets]
      ].filter(([, n]) => (n as number) > 0);
      return (
        <>
          {bundles.length > 0 ? (
            <Row label="Bundles">
              {bundles
                .map(
                  ([dir, n]) =>
                    `${dir as string}/ (${n as number} ${n === 1 ? 'file' : 'files'})`
                )
                .join(' · ')}
            </Row>
          ) : null}
          {payload.allowedTools.length > 0 ? (
            <Row label="Pre-approved tools">
              <span className="ctxd-mono ctxd-wrap">
                {payload.allowedTools.join(' · ')}
              </span>
            </Row>
          ) : null}
          {payload.argumentHint !== null ? (
            <Row label="Takes">
              <span className="ctxd-mono">{payload.argumentHint}</span>
            </Row>
          ) : null}
          <Row label="Every session pays">
            {`${payload.startupBytes.toLocaleString()} bytes, about ${payload.startupTokens.toLocaleString()} tokens`}
          </Row>
          {payload.license !== null ? (
            <Row label="Licence">{payload.license}</Row>
          ) : null}
          {payload.compatibility !== null ? (
            <Row label="Works with">{payload.compatibility}</Row>
          ) : null}
          {payload.lazy ? (
            <p className="ctxd-muted ctxd-card-note">
              This one sits below the project root, so the agent loads it only
              once it touches a file in that subtree.
            </p>
          ) : null}
          {!payload.nameMatchesDirectory ? (
            <p className="ctxd-warning ctxd-card-note">
              Its name does not match its directory, so agents disagree about
              what to call it.
            </p>
          ) : null}
        </>
      );
    }

    case 'mcp':
      return (
        <McpRows
          payload={payload}
          sourcePath={sourcePath}
          onOpenPath={onOpenPath}
          {...(onCheckConnection !== undefined ? { onCheckConnection } : {})}
          {...(check !== undefined ? { check } : {})}
        />
      );

    case 'hook':
      return (
        <>
          <Row label="Event">{payload.event}</Row>
          {payload.matcher !== null ? (
            <Row label="Matching">
              <span className="ctxd-mono">{payload.matcher}</span>
            </Row>
          ) : null}
          <Row label="Handler">{payload.handlerType}</Row>
          {payload.command !== null ? (
            <Row label="Runs">
              <span className="ctxd-mono ctxd-wrap">{payload.command}</span>
            </Row>
          ) : null}
          {payload.scriptPath !== null ? (
            <Row label="Script">
              <button
                type="button"
                className="btn-text ctxd-mono ctxd-path"
                onClick={() => onOpenPath(payload.scriptPath ?? '')}
              >
                {payload.scriptPath}
              </button>
            </Row>
          ) : null}
          {payload.scriptMissing ? (
            <p className="ctxd-error">
              <Codicon name="error" size={14} />
              The script this hook runs is not on disk. The agent will log an
              error and keep going.
            </p>
          ) : null}
          {payload.timeoutSeconds !== null ? (
            <Row label="Gives up after">{`${payload.timeoutSeconds}s`}</Row>
          ) : null}
          {payload.statusMessage !== null ? (
            <Row label="Says">{payload.statusMessage}</Row>
          ) : null}
          {payload.trustedHash !== null ? (
            <p className="ctxd-muted ctxd-card-note">
              Codex pins this hook to its current contents and will refuse to
              run it if the file changes.
            </p>
          ) : null}
        </>
      );

    case 'plugin':
      return (
        <>
          {payload.version !== null ? (
            <Row label="Version">{payload.version}</Row>
          ) : null}
          {payload.author !== null ? (
            <Row label="Author">{payload.author}</Row>
          ) : null}
          {payload.marketplace !== null ? (
            <Row label="From">
              {payload.marketplace}
              {payload.commitSha !== null ? (
                <span className="ctxd-muted ctxd-mono">
                  {' '}
                  commit {payload.commitSha}
                </span>
              ) : null}
            </Row>
          ) : null}
          {payload.homepage !== null ? (
            <Row label="Home">
              <span className="ctxd-mono ctxd-path">{payload.homepage}</span>
            </Row>
          ) : null}
          <Row label="Contributes">
            {contributionSentence(payload.contributes)}
          </Row>
          {payload.installPath !== null ? (
            <Row label="Installed at">
              <button
                type="button"
                className="btn-text ctxd-mono ctxd-path"
                onClick={() => onOpenPath(payload.installPath ?? '')}
              >
                {payload.installPath}
              </button>
            </Row>
          ) : null}
        </>
      );

    case 'instruction':
      return (
        <>
          {payload.importedBy !== null ? (
            <Row label="Pulled in by">
              <button
                type="button"
                className="btn-text ctxd-mono ctxd-path"
                onClick={() => onOpenPath(payload.importedBy ?? '')}
              >
                {payload.importedBy}
              </button>
            </Row>
          ) : (
            <Row label="Position">{`${payload.order + 1} in the load order`}</Row>
          )}
          <Row label="First line">{payload.firstLine}</Row>
          <Row label="Every session pays">{`${payload.bytes.toLocaleString()} bytes`}</Row>
        </>
      );
  }
}

function contributionSentence(c: {
  skills: number;
  hooks: number;
  mcpServers: number;
  agents: number;
  commands: number;
}): string {
  const parts: string[] = [];
  const say = (n: number, one: string, many: string): void => {
    if (n > 0) parts.push(`${n} ${n === 1 ? one : many}`);
  };
  say(c.skills, 'skill', 'skills');
  say(c.hooks, 'hook', 'hooks');
  say(c.mcpServers, 'MCP server', 'MCP servers');
  say(c.agents, 'subagent', 'subagents');
  say(c.commands, 'command', 'commands');
  return parts.length === 0 ? 'nothing yet' : parts.join(' · ');
}
