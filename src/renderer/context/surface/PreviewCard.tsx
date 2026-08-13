/**
 * Preview mode — the detail surface for something that is not on disk yet
 * (research 29 §7.6), and the surface the operator's four install requirements
 * land on.
 *
 * It is the SAME component family as the installed card, in a third mode, not a
 * new screen. `browse` and `session` already existed; `preview` adds a header
 * card for a thing that has not been downloaded, over its own fetched content.
 *
 * The order of the sections is the argument, so it is data
 * (`./preview-sections`) rather than markup, and the install control renders
 * after the whole list. That is requirement 4 made structural: there is no
 * arrangement of this component in which the scan appears below the button.
 *
 * Three rules that keep this from being a product page.
 *
 *  - It opens from a query, never from a browse surface. There is no featured
 *    row, no trending list and no recommendation.
 *  - Remote text is never trusted text. The description and the body render as
 *    plain text. Nothing here is handed to a markdown renderer, so a registry
 *    string cannot become a link, an image or a script.
 *  - The primary button names the consequence rather than the verb.
 */

import React, { useMemo } from 'react';
import { AgentIcon } from '../../icons';
import type { Blocker } from '../install/install-gate';
import { evaluateInstall } from '../install/install-gate';
import type { BlockerCode } from '../install/install-gate';
import { formatCommandLine } from './command-line';
import type { InstallPlan, InstallTarget, PreviewSubject } from './model';
import { previewSections } from './preview-sections';
import { scanSkillBody } from './executable-scan';

export interface PreviewCardProps {
  subject: PreviewSubject;
  targets: readonly InstallTarget[];
  /** Built by main. The renderer never assembles argv (see ./model). */
  plan: InstallPlan | null;
  cliAvailable: boolean;
  online: boolean;
  /**
   * Set when the command line this card would SHOW is not the one main would
   * RUN. Always a hard refusal: a command the user did not see is not one they
   * approved.
   */
  commandMismatch?: string | null;
  acknowledged: readonly BlockerCode[];
  onToggleTarget(agentId: string): void;
  onAcknowledge(code: BlockerCode, on: boolean): void;
  /** Opens the confirm. It never installs by itself. */
  onRequestInstall(plan: InstallPlan): void;
  onCopyCommand(text: string): void;
}

export function PreviewCard({
  subject,
  targets,
  plan,
  cliAvailable,
  online,
  commandMismatch = null,
  acknowledged,
  onToggleTarget,
  onAcknowledge,
  onRequestInstall,
  onCopyCommand
}: PreviewCardProps): React.JSX.Element {
  // The scan is the one thing this surface must never be missing. If main
  // already ran it, use that; if only the body arrived, run the same pure
  // regex here rather than showing a card with a hole in it.
  const scan = useMemo(() => {
    if (subject.scan !== null) return subject.scan;
    if (subject.body !== null) return scanSkillBody(subject.body);
    return null;
  }, [subject.scan, subject.body]);

  const sections = useMemo(
    () => previewSections({ ...subject, scan }, targets, plan),
    [subject, scan, targets, plan]
  );

  const gate = evaluateInstall({
    plan,
    scan,
    audit: subject.audit,
    targets,
    cliAvailable,
    online,
    commandMismatch,
    acknowledged
  });

  const soft: Blocker[] = gate.blockers.filter((b) => !b.hard);
  const hard: Blocker[] = gate.blockers.filter((b) => b.hard);

  return (
    <section
      className="ctxd-card ctxd-preview"
      aria-label={`${subject.name} preview`}
    >
      <header className="ctxd-card-head">
        <h2 className="ctxd-card-title">{subject.name}</h2>
      </header>

      {/* Attacker-controlled. Plain text, always. */}
      <p className="ctxd-card-line ctxd-remote-text">{subject.description}</p>

      {sections.map((section) => (
        <div
          key={section.id}
          className="ctxd-preview-section"
          data-section={section.id}
        >
          <h3 className="ctxd-preview-label">{section.label}</h3>

          {section.id === 'who-gets-it' ? (
            <div className="ctxd-targets">
              {targets.map((target) => (
                <label
                  key={target.agentId}
                  className={`ctxd-target${target.unavailableReason !== null ? ' is-unavailable' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={target.selected}
                    disabled={target.unavailableReason !== null}
                    onChange={() => onToggleTarget(target.agentId)}
                  />
                  <AgentIcon agent={target.agentId} size={14} />
                  <span>{target.agentName}</span>
                </label>
              ))}
            </div>
          ) : null}

          {section.lines.map((line, i) => (
            <p
              key={`${section.id}-${i}`}
              className={`ctxd-preview-line ctxd-tone-${line.tone}${line.mono ? ' ctxd-mono ctxd-wrap' : ''}`}
            >
              {line.text}
            </p>
          ))}

          {section.id === 'command' && plan !== null ? (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => onCopyCommand(formatCommandLine(plan))}
            >
              Copy the command
            </button>
          ) : null}
        </div>
      ))}

      {/* Everything above this line is what runs, where it came from, what has
          looked at it, what it costs and what will be typed. Only now the
          control. */}
      <div className="ctxd-install-control">
        {soft.map((blocker) => (
          <label key={blocker.code} className="ctxd-ack">
            <input
              type="checkbox"
              checked={acknowledged.includes(blocker.code)}
              onChange={(e) =>
                onAcknowledge(blocker.code, e.currentTarget.checked)
              }
            />
            <span>{blocker.message}</span>
          </label>
        ))}

        {hard.map((blocker) => (
          <p key={`${blocker.code}-${blocker.message}`} className="ctxd-error">
            {blocker.message}
          </p>
        ))}

        <button
          type="button"
          className="btn btn-primary"
          disabled={!gate.allowed || plan === null}
          onClick={() => {
            if (gate.allowed && plan !== null) onRequestInstall(plan);
          }}
        >
          {subject.category === 'mcp' ? 'Add server…' : 'Install…'}
        </button>
      </div>

      {subject.body !== null ? (
        <pre className="ctxd-remote-body ctxd-mono">{subject.body}</pre>
      ) : null}
    </section>
  );
}
