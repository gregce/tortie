/**
 * "Enable for…" — the picker (Phase 26 item 3).
 *
 * One question, answered with checkboxes: which of the detected agents get
 * this skill. Pre-checked from what is on disk. Rows the CLI cannot target are
 * disabled with the same reason sentence the install sheet shows, printed as a
 * line rather than hidden in a tooltip. There is NO search field here — the
 * operator named that as the defect this surface replaces.
 *
 * It is rendered into a body portal for the same reason the hover card is:
 * the Context view lives inside an `overflow: auto` sidebar column, and a
 * scrim clipped to 300px is not a modal. The confirm that follows is the
 * shared InstallDialog, already mounted at the top of the tree, so handing off
 * to it survives anything that happens to this view.
 */

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { trapTabKey } from '../../app/focus-trap';
import { AgentIcon } from '../../icons';
import { enableBlocker } from './enable-model';
import { useEnableFlow } from './enable-store';
import { registerEnableShotProbe } from './shot-probe';
import './enable.css';

// Harness-only (Phase 26.1): an inert window global the GMUX_SHOT harness can
// call to open this dialog, because its real entry point is a native menu.
registerEnableShotProbe();

export function EnableForDialog(): React.JSX.Element | null {
  const flow = useEnableFlow();
  const boxRef = useRef<HTMLDivElement | null>(null);

  // Focus moves into the dialog when it opens, or Escape and Tab keep acting
  // on a list that is now behind a scrim.
  useEffect(() => {
    if (flow.open) {
      requestAnimationFrame(() => {
        boxRef.current
          ?.querySelector<HTMLElement>('input:not(:disabled), button')
          ?.focus();
      });
    }
  }, [flow.open]);

  if (!flow.open || flow.name === null) return null;

  const known = flow.source !== null;
  const blocker = known ? enableBlocker(flow.targets) : null;

  // Agents that share the exact same unavailable reason are named together in
  // one sentence. The fact is printed once per distinct reason, never dropped.
  const reasonGroups: Array<{ reason: string; names: string[] }> = [];
  for (const t of flow.targets) {
    if (t.unavailableReason === null) continue;
    const group = reasonGroups.find((g) => g.reason === t.unavailableReason);
    if (group) group.names.push(t.agentName);
    else reasonGroups.push({ reason: t.unavailableReason, names: [t.agentName] });
  }
  const nameList = (names: string[]): string =>
    names.length <= 1
      ? (names[0] ?? '')
      : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;

  return createPortal(
    <div
      className="modal-scrim"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) flow.close();
      }}
    >
      <div
        ref={boxRef}
        className="modal ctx-enable-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={`Enable ${flow.name} for agents`}
        onKeyDown={(e) => {
          trapTabKey(e, e.currentTarget);
          if (e.key === 'Escape') {
            e.stopPropagation();
            flow.close();
          }
        }}
      >
        <header className="ctx-enable-head">
          <h2 className="modal-title">Enable {flow.name} for…</h2>
        </header>

        {known ? (
          <p className="ctx-enable-source">
            From <span className="ctx-enable-mono">{flow.source}</span>. The
            checked agents already have it.
          </p>
        ) : null}

        <div className="ctx-enable-targets" role="group" aria-label="Agents">
          {flow.targets.map((target) => {
            const off = target.unavailableReason !== null;
            return (
              <label
                key={target.agentId}
                className={`ctx-enable-target${off ? ' is-unavailable' : ''}`}
                title={
                  target.locked && !off
                    ? 'Already enabled from disk. This surface only adds; use Move to Trash to remove it.'
                    : undefined
                }
              >
                <input
                  type="checkbox"
                  checked={target.checked}
                  disabled={off || target.locked || !known}
                  onChange={() => flow.toggle(target.agentId)}
                />
                <AgentIcon agent={target.agentId} size={14} />
                <span>{target.agentName}</span>
              </label>
            );
          })}
        </div>

        {/* The reason treatment the install sheet has: the row is disabled
            AND the reason is printed, because a fact behind a tooltip is a
            fact most people never meet. */}
        {reasonGroups.length > 0 ? (
          <div className="ctx-enable-reasons">
            {reasonGroups.map((g) => (
              <p key={g.reason} className="ctx-enable-reason">
                {nameList(g.names)}: {g.reason}
              </p>
            ))}
          </div>
        ) : null}

        {known ? (
          <>
            {blocker !== null ? (
              <p className="ctx-enable-blocker">{blocker}</p>
            ) : null}
            <footer className="ctx-enable-foot">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => flow.close()}
              >
                Cancel
              </button>
              {/* The ellipsis is honest: this opens the confirm with the full
                  command line. Nothing runs from this surface. */}
              <button
                type="button"
                className="btn btn-primary"
                disabled={blocker !== null}
                onClick={() => void flow.confirmEnable()}
              >
                Enable…
              </button>
            </footer>
          </>
        ) : (
          <>
            <p className="ctx-enable-blocker">
              Tortie did not install this skill, so it does not know where it
              came from. Pick the source yourself and the same preview and
              confirm apply.
            </p>
            <footer className="ctx-enable-foot">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => flow.close()}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => flow.findSource()}
              >
                Find its source…
              </button>
            </footer>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
