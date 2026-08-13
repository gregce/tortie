/**
 * The sheet: find a skill, read it, then decide.
 *
 * It is a modal because installing is a decision with its own attention, and
 * because the sidebar is 220 to 400px wide and the thing a reader has to check
 * here is a command line. The S6 chrome and the focus trap are the app's own.
 *
 * ## The order is the argument, and the component does not choose it
 *
 * The preview is `PreviewCard`, which maps over `PREVIEW_SECTION_ORDER` and
 * renders its primary control after the map. What runs comes first, then where
 * it came from, then what has scanned it, then the cost, then the agents, then
 * the exact command. There is no arrangement of that component in which the
 * scan appears below the button, and this sheet does not reorder it.
 *
 * ## Three refusals kept from research 29 §13.4
 *
 * There is no featured row, no trending list and no recommendation. The sheet
 * opens from a query the user typed, and it shows what the search returned in
 * the order the search returned it. Install counts are printed because they are
 * a fact about the row, and nothing is sorted or promoted by them here.
 */

import React, { useEffect, useRef } from 'react';
import { trapTabKey } from '../../app/focus-trap';
import { Codicon } from '../../icons';
import { useInstallFlow } from './install-store';
import { PreviewCard } from '../surface/PreviewCard';
import './install.css';

export function InstallSheet(): React.JSX.Element | null {
  const flow = useInstallFlow();
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (flow.open && flow.step === 'search') {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [flow.open, flow.step]);

  if (!flow.open) return null;

  const copyCommand = (text: string): void => {
    void navigator.clipboard.writeText(text);
  };

  return (
    <div
      className="modal-scrim"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) flow.close();
      }}
    >
      <div
        className="modal ctx-install-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Install a skill"
        onKeyDown={(e) => {
          trapTabKey(e, e.currentTarget);
          if (e.key === 'Escape') {
            e.stopPropagation();
            flow.close();
          }
        }}
      >
        <header className="ctx-sheet-head">
          <h2 className="modal-title">
            {flow.step === 'preview' && flow.chosen !== null
              ? flow.chosen.name
              : 'Install a skill'}
          </h2>
          {flow.step === 'preview' ? (
            <button type="button" className="btn-text" onClick={() => flow.back()}>
              Back to the results
            </button>
          ) : null}
        </header>

        {flow.step === 'search' ? (
          <>
            <form
              className="ctx-sheet-search"
              onSubmit={(e) => {
                e.preventDefault();
                void flow.search();
              }}
            >
              <Codicon name="search" size={14} />
              <input
                ref={inputRef}
                type="text"
                value={flow.query}
                placeholder="Search skills.sh"
                onChange={(e) => flow.setQuery(e.currentTarget.value)}
              />
              <button type="submit" className="btn btn-secondary btn-sm">
                {flow.searching ? 'Searching…' : 'Search'}
              </button>
            </form>

            {/* Discovery is HTTP, so it is the one part of this panel that
                needs a connection. The sentence says that rather than the
                section disabling itself. */}
            {flow.searchProblem !== null ? (
              <p className="ctxd-error">{flow.searchProblem}</p>
            ) : null}

            <ul className="ctx-sheet-hits">
              {flow.hits.map((hit) => (
                <li key={hit.id}>
                  <button
                    type="button"
                    className="ctx-sheet-hit"
                    onClick={() => void flow.choose(hit)}
                  >
                    <span className="ctx-sheet-hit-name">{hit.name}</span>
                    <span className="ctx-sheet-hit-source ctxd-mono">
                      {hit.source}
                    </span>
                    {hit.installs === null ? null : (
                      <span className="ctx-sheet-hit-installs num">
                        {hit.installs.toLocaleString()}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>

            {!flow.searching &&
            flow.hits.length === 0 &&
            flow.query.trim() !== '' &&
            flow.searchProblem === null ? (
              <p className="ctxd-muted">Nothing matched that.</p>
            ) : null}

            <p className="ctxd-muted ctx-sheet-note">
              Installing sends the source and the target agents to the skills
              registry, which is how its install counts exist.
            </p>
          </>
        ) : null}

        {flow.step === 'preview' ? (
          flow.loadingSubject ? (
            <p className="ctxd-muted">Reading it before showing you anything…</p>
          ) : flow.subject === null ? (
            <p className="ctxd-error">
              {flow.subjectProblem ??
                'Tortie could not read that skill, so it will not offer to install it.'}
            </p>
          ) : (
            <>
              {flow.subjectProblem === null ? null : (
                <p className="ctxd-error">{flow.subjectProblem}</p>
              )}
              <div className="ctx-sheet-scope">
                <span className="ctxd-card-label">Where it lands</span>
                <label>
                  <input
                    type="radio"
                    name="ctx-install-scope"
                    checked={flow.scope === 'global'}
                    onChange={() => flow.setScope('global')}
                  />
                  <span>All your projects</span>
                </label>
                <label
                  className={flow.projectRoot === null ? 'is-unavailable' : ''}
                >
                  <input
                    type="radio"
                    name="ctx-install-scope"
                    checked={flow.scope === 'project'}
                    disabled={flow.projectRoot === null}
                    onChange={() => flow.setScope('project')}
                  />
                  <span>This project only</span>
                </label>
              </div>

              {flow.planProblem === null ? null : (
                <p className="ctxd-error">{flow.planProblem}</p>
              )}

              <PreviewCard
                subject={flow.subject}
                targets={flow.targets}
                plan={flow.plan}
                cliAvailable={flow.planProblem === null}
                online
                commandMismatch={flow.commandMismatch}
                acknowledged={flow.acknowledged}
                onToggleTarget={(id) => flow.toggleTarget(id)}
                onAcknowledge={(code, on) => flow.acknowledge(code, on)}
                onRequestInstall={() => flow.requestInstall()}
                onCopyCommand={copyCommand}
              />
            </>
          )
        ) : null}
      </div>
    </div>
  );
}
