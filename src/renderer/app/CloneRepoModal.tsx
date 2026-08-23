/**
 * Clone repository (Phase 18.6) — the third way into a project.
 *
 * IT IS THE ⌘T MODAL AGAIN (DESIGN-SPEC S6). Same 480 px width, same 20vh
 * anchor, same scrim, same field rhythm, same path preview, Return submits
 * from any field. There are now three dialogs in the product and they must not
 * read as three different products, so nothing here is invented that
 * NewProjectModal already ships.
 *
 * WHAT IT IS FOR. Opening a project that is not on this machine yet. It is
 * deliberately not a front end for `git clone`: there is no depth control, no
 * submodule checkbox, no branch picker and no partial clone, because those are
 * git command furniture and the point of the screen is to end with a project
 * tab (research 35 §3.6, §5.6).
 *
 * THREE THINGS ABOUT THE RUNNING STATE, all of them refusals.
 *
 *  1. **One bar per phase, showing that phase's own number.** Git prints a
 *     percentage per phase and never an overall one. The phase WORD changing
 *     is what tells the user the bar reset, which is why the words are one per
 *     git phase rather than three collapsed ones.
 *  2. **No byte denominator.** Git prints a cumulative figure and never a
 *     total, so "12.4 MB of 48.1 MB" could never render. What shows is git's
 *     own figure in git's own unit, standing alone.
 *  3. **Esc does nothing and the scrim does nothing.** This is the one place
 *     in the application where Esc does not close the topmost layer. Esc is a
 *     reflex, and a reflex must not silently kill a two minute download. Only
 *     the Cancel button ends it.
 */

import React, { useEffect, useRef } from 'react';
import { projectPathFor, validateProjectName } from '@shared/project-create';
import {
  CLONE_REWRITTEN_FROM_SSH_NOTE,
  CLONE_STRIPPED_CREDENTIAL_NOTE
} from '@shared/clone-url';
import { useClone } from '../state/clone';
import { CLONE_CHECKING_NOTE } from '../state/clone-copy';
import { displayPath, truncateMiddle } from '../format';
import { TargetPathLine } from './TargetPathLine';
import { modalKeyDown } from './focus-trap';
import './clone-repo.css';

export function CloneRepoModal(): React.JSX.Element | null {
  const open = useClone((s) => s.open);
  // Mounted only while open, so the focus effects below run on arrival rather
  // than on every render of a hidden dialog.
  return open ? <CloneRepoDialog /> : null;
}

function CloneRepoDialog(): React.JSX.Element {
  const status = useClone((s) => s.status);
  const address = useClone((s) => s.address);
  const name = useClone((s) => s.name);
  const parentDir = useClone((s) => s.parentDir);
  const nameTouched = useClone((s) => s.nameTouched);
  const resolvedUrl = useClone((s) => s.resolvedUrl);
  const rewrittenFromSsh = useClone((s) => s.rewrittenFromSsh);
  const strippedCredential = useClone((s) => s.strippedCredential);
  const phaseWord = useClone((s) => s.phaseWord);
  const percent = useClone((s) => s.percent);
  const bytes = useClone((s) => s.bytes);
  const failure = useClone((s) => s.failure);
  const detailsOpen = useClone((s) => s.detailsOpen);
  const cancelNote = useClone((s) => s.cancelNote);
  const focusRequest = useClone((s) => s.focusRequest);

  const close = useClone((s) => s.close);
  const setAddress = useClone((s) => s.setAddress);
  const setName = useClone((s) => s.setName);
  const setParentDir = useClone((s) => s.setParentDir);
  const chooseParent = useClone((s) => s.chooseParent);
  const checkAddress = useClone((s) => s.checkAddress);
  const submit = useClone((s) => s.submit);
  const cancel = useClone((s) => s.cancel);
  const toggleDetails = useClone((s) => s.toggleDetails);

  const addressRef = useRef<HTMLInputElement | null>(null);
  const nameRef = useRef<HTMLInputElement | null>(null);
  const chooseRef = useRef<HTMLButtonElement | null>(null);
  const cancelRef = useRef<HTMLButtonElement | null>(null);

  const busy = status === 'running' || status === 'stopping';

  // Every focus move the store asked for: on arrival, after the clipboard
  // prefill, and after a failure (where the address takes the keyboard with
  // its contents selected, so typing replaces it).
  useEffect(() => {
    if (focusRequest === null || busy) return;
    const target =
      focusRequest.field === 'address'
        ? addressRef.current
        : focusRequest.field === 'name'
          ? nameRef.current
          : chooseRef.current;
    if (target === null) return;
    target.focus();
    if (focusRequest.select && target instanceof HTMLInputElement) {
      target.select();
    }
  }, [focusRequest, busy]);

  // The fields become static text once git is running, so the keyboard has to
  // go somewhere real — the one control that still does anything.
  useEffect(() => {
    if (status === 'running') cancelRef.current?.focus();
  }, [status]);

  const nameError = nameTouched ? validateProjectName(name) : null;
  const target =
    parentDir.trim().length > 0 && name.trim().length > 0
      ? projectPathFor(parentDir, name)
      : null;
  // Enabled while the address is being checked, not only when it is settled.
  // Clicking this button blurs the Repository field, the blur starts the
  // check, and a button that disabled itself in between would swallow the
  // click that caused it.
  const ready =
    !busy &&
    address.trim().length > 0 &&
    parentDir.trim().length > 0 &&
    validateProjectName(name) === null;

  return (
    <div
      className="modal-scrim"
      onMouseDown={(e) => {
        // close() is inert while git is running; the guard lives in the store
        // so every dismissal path obeys the same rule.
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        className="modal clone-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Clone repository"
        onKeyDown={(e) => modalKeyDown(e, e.currentTarget, { submit, close })}
      >
        <h2 className="modal-title">Clone repository</h2>

        {busy ? (
          <>
            <CloneRunning
              url={resolvedUrl ?? address.trim()}
              target={target}
              phaseWord={phaseWord}
              percent={percent}
              bytes={bytes}
            />
            <div className="modal-actions">
              <button
                type="button"
                ref={cancelRef}
                className="btn btn-secondary"
                disabled={status === 'stopping'}
                onClick={cancel}
              >
                {status === 'stopping' ? 'Stopping…' : 'Cancel'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="field">
              <label className="field-label" htmlFor="clone-address">
                Repository
              </label>
              <input
                id="clone-address"
                ref={addressRef}
                className="input input-mono"
                value={address}
                spellCheck={false}
                autoComplete="off"
                placeholder="https://github.com/owner/repo.git"
                onChange={(e) => setAddress(e.target.value)}
                // Preflight runs here and on submit, and nowhere else. On open
                // it would fire a request, with whatever credential the
                // keychain holds for that host, at whatever address happened
                // to be on the clipboard.
                onBlur={checkAddress}
              />
              {/* Height reserved, so the dialog does not jump when the address
                  resolves. */}
              <div className="clone-notes">
                {status === 'checking' ? (
                  <div className="field-caption">{CLONE_CHECKING_NOTE}</div>
                ) : null}
                {status !== 'checking' && resolvedUrl !== null ? (
                  <div
                    className="field-caption clone-resolved"
                    title={resolvedUrl}
                  >
                    {resolvedUrl}
                  </div>
                ) : null}
                {rewrittenFromSsh ? (
                  <div className="field-caption">
                    {CLONE_REWRITTEN_FROM_SSH_NOTE}
                  </div>
                ) : null}
                {strippedCredential ? (
                  <div className="field-caption">
                    {CLONE_STRIPPED_CREDENTIAL_NOTE}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="field">
              <label className="field-label" htmlFor="clone-name">
                Folder name
              </label>
              <input
                id="clone-name"
                ref={nameRef}
                className={`input${nameError !== null ? ' input-error' : ''}`}
                value={name}
                spellCheck={false}
                autoComplete="off"
                onChange={(e) => setName(e.target.value)}
              />
              {nameError !== null ? (
                <div className="input-error-text">{nameError}</div>
              ) : null}
            </div>

            <div className="field">
              <label className="field-label" htmlFor="clone-parent">
                Clone it into
              </label>
              <div className="field-row">
                <input
                  id="clone-parent"
                  className="input input-mono"
                  value={parentDir}
                  spellCheck={false}
                  autoComplete="off"
                  placeholder="Choose a folder…"
                  onChange={(e) => setParentDir(e.target.value)}
                />
                <button
                  type="button"
                  ref={chooseRef}
                  className="btn btn-secondary"
                  onClick={chooseParent}
                >
                  Choose…
                </button>
              </div>
            </div>

            {/* The same safety line New Project ships, from the same
                module. */}
            <TargetPathLine target={target} />

            {cancelNote !== null ? (
              <div className="clone-cancelled">{cancelNote}</div>
            ) : null}

            {failure !== null ? (
              <div className="modal-error" role="alert">
                {/* A failure sentence can carry a second line: the `gh` line
                    under a credential failure, and git's own last line under
                    one nothing classified. The second is git's words and is
                    set in mono; the first is prose. */}
                {failure.message.split('\n').map((line, i) =>
                  i === 0 ? (
                    <div key={`${String(i)}-${line}`}>{line}</div>
                  ) : (
                    <div
                      key={`${String(i)}-${line}`}
                      className={
                        failure.kind === 'unknown'
                          ? 'clone-verbatim'
                          : 'clone-hint'
                      }
                    >
                      {line}
                    </div>
                  )
                )}
                {failure.detail !== null && failure.detail.trim().length > 0 ? (
                  <>
                    <button
                      type="button"
                      className="btn-text clone-details-toggle"
                      onClick={toggleDetails}
                      aria-expanded={detailsOpen}
                    >
                      {detailsOpen ? 'Hide details' : 'Show details'}
                    </button>
                    {detailsOpen ? (
                      <pre className="clone-details">{failure.detail}</pre>
                    ) : null}
                  </>
                ) : null}
              </div>
            ) : null}

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={close}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!ready}
                onClick={submit}
              >
                Clone repository
                <span aria-hidden="true">↩</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * The running state. The fields are gone and what is left is the address, the
 * folder it lands in, the phase and its own bar.
 */
function CloneRunning({
  url,
  target,
  phaseWord,
  percent,
  bytes
}: {
  url: string;
  target: string | null;
  phaseWord: string | null;
  percent: number | null;
  bytes: string | null;
}): React.JSX.Element {
  return (
    <div className="clone-run">
      <div className="clone-run-url" title={url}>
        {url}
      </div>
      {target !== null ? (
        <div className="clone-run-into" title={target}>
          into {truncateMiddle(displayPath(target), 52)}
        </div>
      ) : null}

      {/* The word is announced; the percentage is not, because it changes
          about thirty times a second. */}
      <div className="clone-phase" aria-live="polite">
        {phaseWord ?? ''}
      </div>
      <div
        className="clone-bar"
        role="progressbar"
        aria-label={phaseWord ?? 'Cloning'}
        aria-valuemin={0}
        aria-valuemax={100}
        {...(percent !== null ? { 'aria-valuenow': percent } : {})}
      >
        <div
          className="clone-bar-fill"
          style={{ width: `${String(percent ?? 0)}%` }}
        />
      </div>
      {/* Reserved, so the dialog does not resize when Downloading starts
          printing a figure and again when it stops. */}
      <div className="clone-bytes">{bytes ?? ''}</div>
    </div>
  );
}
