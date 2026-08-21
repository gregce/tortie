/**
 * The confirm that arms someone else's code to run (research 29 §9.1, §3.7).
 *
 * The generic `ConfirmDialog` takes a plain string body, and this one cannot:
 * requirement 3 of the phase is that the confirm shows the FULL command line,
 * which is a mono block that has to wrap, be copyable, and never be summarised.
 * So this is its own modal on the same S6 chrome, and it obeys the same five
 * rules the wireframe encodes.
 *
 *  1. Name what runs and when, in the user's words. "After every edit", not
 *     `PostToolUse`. The event names stay in the detail view.
 *  2. Name where it came from, down to the commit.
 *  3. Not destructive-styled. The error fill is reserved for confirms that
 *     destroy something, and this one creates capability.
 *  4. No "do not ask again" and no checkbox that switches the dialog off. A
 *     confirmation that can be turned off is decoration.
 *  5. State the blast radius honestly, which is what `blastRadius` carries and
 *     why it comes from registry data rather than from a sentence typed here.
 *
 * The dialog will not run anything until a human presses the primary button.
 * Enter on the scrim does not confirm, Escape cancels, and Tab cycles inside
 * the dialog because `aria-modal` promises the shell behind it is inert.
 */

import React, { useEffect, useRef } from 'react';
import { trapTabKey } from '../../app/focus-trap';
import { formatCommandLine, formatShortCommand } from '../surface/command-line';
import type { InstallPlan } from '../surface/model';
import type { ConfirmCopy, PluginRunRow } from './install-copy';
import { InstallFailure } from './InstallFailure';
import type { CommandFailure } from './InstallFailure';
import './install.css';

export interface InstallDialogSpec {
  copy: ConfirmCopy;
  /**
   * The exact plan that will be spawned. Present for every skill operation.
   * Absent for the confirms that edit a JSON file rather than run a command.
   */
  plan: InstallPlan | null;
  /** §9.1's "what runs and when" table, for a plugin or a hook. */
  runs?: readonly PluginRunRow[];
  /**
   * What a remove takes off the machine (Phase 30). The CLI has no dry run, so
   * these rows come from Tortie's own filesystem scan, which is the same read
   * the panel is drawn from. A null path is a row with no single path, e.g.
   * the lock entry.
   */
  removes?: readonly { label: string; path: string | null }[];
  /** Provenance lines: marketplace, version, repository, commit. */
  provenance?: readonly string[];
  /** From `../surface/reload-sentence`. Never typed by hand. */
  blastRadius?: string | null;
  /**
   * The agent's own gate, named when Tortie knows one exists. Tortie never
   * writes an approval into an agent's config to skip a prompt.
   */
  agentGateNote?: string | null;
  /**
   * Set after a run that did not exit 0. The dialog stays open and reports it
   * here, under the command line it showed before the run, so the two are the
   * same text in the same place.
   */
  failure?: CommandFailure | null;
  /** True while the child is running. The primary control cannot be pressed twice. */
  running?: boolean;
}

export interface InstallDialogProps {
  spec: InstallDialogSpec | null;
  onConfirm(spec: InstallDialogSpec): void;
  onAlt?: (spec: InstallDialogSpec) => void;
  onCancel(): void;
  onCopyCommand(text: string): void;
}

export function InstallDialog({
  spec,
  onConfirm,
  onAlt,
  onCancel,
  onCopyCommand
}: InstallDialogProps): React.JSX.Element | null {
  // Focus lands on CANCEL, which is where the app's other confirms do not put
  // it. The difference is deliberate and it is one line. Every other confirm in
  // Tortie asks about Tortie's own state; this one arms someone else's code to
  // run with the user's permissions. A dialog that appears under a hand already
  // reaching for Enter should not have Install under that key.
  const cancelRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (spec !== null) requestAnimationFrame(() => cancelRef.current?.focus());
  }, [spec]);

  if (spec === null) return null;

  const { copy, plan } = spec;
  const commandLine = plan === null ? null : formatCommandLine(plan);

  return (
    <div
      className="modal-scrim"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        className="modal ctxd-install-modal"
        role="alertdialog"
        aria-modal="true"
        aria-label={copy.title}
        onKeyDown={(e) => {
          trapTabKey(e, e.currentTarget);
          if (e.key === 'Escape') {
            e.stopPropagation();
            onCancel();
          }
          if (e.key === 'Enter') {
            // Let a focused button run its own activation, so Enter on Cancel
            // cancels rather than installing.
            if ((e.target as HTMLElement).tagName === 'BUTTON') return;
            e.preventDefault();
          }
        }}
      >
        <h2 className="modal-title">{copy.title}</h2>

        {/* Phase 132. Everything the confirm SHOWS scrolls in this one band,
            so the row of buttons underneath it cannot leave the modal. Nothing
            is removed and nothing is reordered: every line the confirm rendered
            before this wrapper it renders after it, in the same order, the full
            command line included. It was measured first. At a 586 px viewport
            the modal is capped at 538 px, its content is 580 px, and the
            Install button sat 23 px below the modal's visible bottom edge, so
            `document.elementFromPoint` at the button's centre returned
            something else. At 700 px and at 900 px it was already on screen. */}
        <div className="ctxd-install-modal-body">
          {copy.body.map((line) => (
            <p key={line} className="modal-body">
              {line}
            </p>
          ))}

          {spec.runs !== undefined && spec.runs.length > 0 ? (
            <table className="ctxd-runs">
              <tbody>
                {spec.runs.map((row) => (
                  <tr key={`${row.when}-${row.script}`}>
                    <td className="ctxd-runs-when">{row.when}</td>
                    <td className="ctxd-mono ctxd-runs-script">{row.script}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}

          {spec.removes !== undefined && spec.removes.length > 0 ? (
            <table className="ctxd-runs">
              <tbody>
                {spec.removes.map((row) => (
                  <tr key={`${row.label}-${row.path ?? ''}`}>
                    <td className="ctxd-runs-when">{row.label}</td>
                    <td className="ctxd-mono ctxd-runs-script">
                      {row.path ?? ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}

          {spec.provenance !== undefined && spec.provenance.length > 0 ? (
            <div className="ctxd-provenance">
              {spec.provenance.map((line) => (
                <p key={line} className="ctxd-muted ctxd-mono">
                  {line}
                </p>
              ))}
            </div>
          ) : null}

          {/* Requirement 3. The whole command, not a description of it. */}
          {commandLine !== null && plan !== null ? (
            <div className="ctxd-command">
              <div className="ctxd-command-head">
                <span className="ctxd-card-label">This runs</span>
                <button
                  type="button"
                  className="btn-text"
                  onClick={() => onCopyCommand(commandLine)}
                >
                  Copy
                </button>
              </div>
              <pre className="ctxd-mono ctxd-command-line">{commandLine}</pre>
              <p className="ctxd-muted ctxd-command-short">
                {formatShortCommand(plan)}
              </p>
              <p className="ctxd-muted">Working directory: {plan.cwd}</p>
            </div>
          ) : null}

          {spec.blastRadius !== undefined && spec.blastRadius !== null ? (
            <p className="modal-body ctxd-blast">{spec.blastRadius}</p>
          ) : null}

          {spec.agentGateNote !== undefined && spec.agentGateNote !== null ? (
            <p className="modal-body ctxd-muted">{spec.agentGateNote}</p>
          ) : null}

          {spec.failure !== undefined && spec.failure !== null ? (
            <InstallFailure failure={spec.failure} />
          ) : null}
        </div>

        <div className="modal-actions">
          {copy.altLabel !== undefined && onAlt !== undefined ? (
            <button
              type="button"
              className="btn btn-secondary modal-action-alt"
              onClick={() => onAlt(spec)}
            >
              {copy.altLabel}
            </button>
          ) : null}
          <button
            ref={cancelRef}
            type="button"
            className="btn btn-secondary"
            onClick={onCancel}
          >
            {copy.cancelLabel}
          </button>
          <button
            type="button"
            className={`btn ${copy.destructive ? 'btn-destructive' : 'btn-primary'}`}
            disabled={spec.running === true}
            onClick={() => onConfirm(spec)}
          >
            {spec.running === true
              ? 'Running…'
              : spec.failure !== undefined && spec.failure !== null
                ? 'Try again'
                : copy.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
