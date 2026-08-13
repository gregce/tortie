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
 * Phase 26 item 4 rearranged the sections into two reading columns above the
 * one control, because seven short facts in one narrow column cost seven
 * screens of scroll before the decision. The columns are a PARTITION of the
 * same ordered data, not a second order. `SECTION_COLUMN` is a Record over
 * every section id, so the compiler refuses a section without a column, and
 * each column filters the ordered list, which preserves the data order inside
 * it. The facts column carries the scan, the control renders after both
 * columns, and the stylesheet collapses the columns back into the single
 * data-ordered stack when the card is narrow. Nothing is collapsed behind a
 * disclosure at any width: the no-information-lost rule is the point of the
 * redesign, not a constraint on it.
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
import type { PreviewSection, PreviewSectionId } from './preview-sections';
import { scanSkillBody } from './executable-scan';

/**
 * Which column each section reads in when the card is wide enough for two.
 * Facts on one side, the plan (who gets it, the exact command) on the other,
 * which is the arrangement the operator named in the Phase 26 entry. A Record
 * over the id union, so adding a section without placing it is a type error.
 */
const SECTION_COLUMN: Record<PreviewSectionId, 'facts' | 'plan'> = {
  'what-runs': 'facts',
  'where-from': 'facts',
  'scanned-by': 'facts',
  cost: 'facts',
  'who-gets-it': 'plan',
  command: 'plan'
};

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

  // One renderer for every section, used by both columns, so the two columns
  // cannot drift into two treatments of the same fact.
  const renderSection = (section: PreviewSection): React.JSX.Element => (
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
  );

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

      {/* Two reading columns over one control. Each column maps the SAME
          ordered section list, filtered by SECTION_COLUMN, so the data order
          survives inside each column and no section can render twice or not
          at all. When the card is narrow the stylesheet stacks the columns
          and the surface reads exactly as the single data-ordered list. */}
      <div className="ctxd-preview-body">
        <div className="ctxd-preview-col" data-column="facts">
          {sections
            .filter((s) => SECTION_COLUMN[s.id] === 'facts')
            .map(renderSection)}
        </div>
        <div className="ctxd-preview-col" data-column="plan">
          {sections
            .filter((s) => SECTION_COLUMN[s.id] === 'plan')
            .map(renderSection)}
        </div>
      </div>

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
