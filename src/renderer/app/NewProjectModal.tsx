/**
 * New Project… (Phase 12.9 item 1) — the other way in.
 *
 * ⌘O could only ever open a folder that already existed, so starting a piece
 * of work meant leaving gmux, making a directory somewhere else, and coming
 * back. Three fields close that: where it goes, what it is called, and
 * whether it is a repository.
 *
 * IT FOLLOWS THE ⌘T MODAL EXACTLY (S6): same scrim, same 20vh anchor, same
 * field rhythm, ↩ creates from any field, Esc cancels, focus trapped. This is
 * the second dialog in the product and the two must not read as two different
 * products — the only structural difference is the path preview, which no
 * other surface needs and this one cannot do without: it is the line that
 * says, before anything is written, exactly what will be created and where.
 *
 * AND IT HANDS OFF. On success the new tab is focused, which puts the §6.2
 * fleet on screen, and this dialog moves the keyboard onto its default agent
 * tile — so the whole path from nothing to a running agent is
 * ⇧⌘N · name · ↩ · ↩, and the "offer to start a session immediately" is the
 * empty state that already exists rather than a second modal.
 */

import React, { useEffect, useRef, useState } from 'react';
import { projectPathFor, validateProjectName } from '@shared/project-create';
// `suggestedProjectParent` is the ONE guess at where a new project goes; the
// clone dialog calls the same function (Phase 18.6 dedup).
import { errorText, suggestedProjectParent, useApp } from '../state/store';
import { TargetPathLine } from './TargetPathLine';
import { focusFleetPrimary, modalKeyDown } from './focus-trap';

export function NewProjectModal(): React.JSX.Element | null {
  const open = useApp((s) => s.newProjectOpen);
  const setOpen = useApp((s) => s.setNewProjectOpen);
  const createProject = useApp((s) => s.createProject);

  const [parentDir, setParentDir] = useState('');
  const [name, setName] = useState('');
  const [touched, setTouched] = useState(false);
  const [gitInit, setGitInit] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const nameRef = useRef<HTMLInputElement | null>(null);
  const chooseRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    // Read once, as the dialog opens. It was a useMemo over the project list
    // before, which recomputed on every tab change behind an open dialog and
    // was never read again after this line.
    const suggestedParent = suggestedProjectParent();
    setParentDir(suggestedParent);
    setName('');
    setTouched(false);
    setGitInit(true);
    setError(null);
    setCreating(false);
    // With a location already guessed the name is the only unknown; without
    // one, [Choose…] is the first thing to do and takes the focus.
    requestAnimationFrame(() => {
      if (suggestedParent === '') chooseRef.current?.focus();
      else nameRef.current?.focus();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const nameError = touched ? validateProjectName(name) : null;
  const target =
    parentDir.trim().length > 0 && name.trim().length > 0
      ? projectPathFor(parentDir, name)
      : null;
  const ready =
    !creating &&
    parentDir.trim().length > 0 &&
    validateProjectName(name) === null;

  const chooseLocation = (): void => {
    void window.gmux?.projects.pickDirectory().then((dir) => {
      if (dir === null) return;
      setParentDir(dir);
      setError(null);
      nameRef.current?.focus();
    });
  };

  const submit = (): void => {
    if (creating) return;
    setTouched(true);
    const invalid = validateProjectName(name);
    if (invalid !== null) {
      setError(null);
      nameRef.current?.focus();
      return;
    }
    if (parentDir.trim().length === 0) {
      setError('Choose a folder to create it in.');
      chooseRef.current?.focus();
      return;
    }
    setCreating(true);
    setError(null);
    void createProject({ parentDir: parentDir.trim(), name: name.trim(), gitInit })
      .then(() => {
        setOpen(false);
        focusFleetPrimary();
      })
      .catch((err: unknown) => {
        setCreating(false);
        setError(errorText(err));
        nameRef.current?.focus();
      });
  };

  return (
    <div
      className="modal-scrim"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label="New project"
        onKeyDown={(e) =>
          modalKeyDown(e, e.currentTarget, {
            submit,
            close: () => setOpen(false)
          })
        }
      >
        <h2 className="modal-title">New project</h2>

        <div className="field">
          <label className="field-label" htmlFor="new-project-name">
            Name
          </label>
          <input
            id="new-project-name"
            ref={nameRef}
            className={`input${nameError !== null ? ' input-error' : ''}`}
            value={name}
            spellCheck={false}
            autoComplete="off"
            placeholder="my-project"
            onChange={(e) => {
              setName(e.target.value);
              setTouched(true);
              setError(null);
            }}
          />
          {nameError !== null ? (
            <div className="input-error-text">{nameError}</div>
          ) : null}
        </div>

        <div className="field">
          <label className="field-label" htmlFor="new-project-dir">
            Create it in
          </label>
          <div className="field-row">
            <input
              id="new-project-dir"
              className="input input-mono"
              value={parentDir}
              spellCheck={false}
              autoComplete="off"
              placeholder="Choose a folder…"
              onChange={(e) => {
                setParentDir(e.target.value);
                setError(null);
              }}
            />
            <button
              type="button"
              ref={chooseRef}
              className="btn btn-secondary"
              onClick={chooseLocation}
            >
              Choose…
            </button>
          </div>
        </div>

        <div className="field">
          <label className="preset-row">
            <input
              type="checkbox"
              className="preset-check"
              checked={gitInit}
              onChange={(e) => setGitInit(e.target.checked)}
            />
            <span className="preset-label">Create a git repository</span>
          </label>
        </div>

        <TargetPathLine target={target} />

        {error !== null ? <div className="modal-error">{error}</div> : null}

        <div className="modal-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setOpen(false)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!ready}
            onClick={submit}
          >
            {creating ? 'Creating…' : 'Create project'}
            {!creating ? <span aria-hidden="true">↩</span> : null}
          </button>
        </div>
      </div>
    </div>
  );
}
