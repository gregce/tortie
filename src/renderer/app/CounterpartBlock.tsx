/**
 * Phase 90.2, items 2 and 3. Where this project already is on the chosen
 * machine, and the one button that offers to put it there.
 *
 * WHAT THIS BLOCK IS FOR. The create sheet's Directory field names a folder on
 * the other computer. Phase 84 gave a person a picker to walk it with, and a
 * person still had to know which folder over there held this project. Tortie
 * now reads this project's git remote on this Mac, asks that machine once for
 * the git folders under its own home directory, and fills the field when
 * exactly one folder over there has the same remote.
 *
 * A MATCH IS A SUGGESTION AND NEVER A SILENT ACTION. The field is filled and it
 * stays editable. Nothing is created, copied or opened without a press. When
 * two or more folders match, nothing is filled at all, because they may hold
 * different work and Tortie has not compared them.
 *
 * WHAT THE WORDS MAY NEVER CLAIM. A shared git remote says the two folders came
 * from the same place. It says nothing about what is in them now. Every
 * sentence here and in main's own copy keeps saying so.
 *
 * THE ONE WRITE. In the absent case, and in no other, this block offers to put
 * the project on that machine. That is a confirm showing the address and the
 * destination, and the press runs one write on the far side which checks the
 * destination first, checks that the address can be reached second, and only
 * then copies. The copy finishes before any session exists, so a copy that
 * fails leaves no half made session behind.
 *
 * TWO EXPORTS, AND THE REASON IS THE TEST ENVIRONMENT. `CounterpartBlockView`
 * is the whole surface as a pure function of one answer, so every state it can
 * be in is rendered and read in `__tests__/counterpart.test.tsx`, where the
 * vitest environment is node and there is no DOM to click. `CounterpartBlock`
 * is the small stateful wrapper that holds the confirm, the destination field,
 * the elapsed count and the one call that writes.
 *
 * THE KEYBOARD. Escape shuts the confirm and changes nothing, and it is stopped
 * here so it does not reach the create sheet and shut that instead. While a
 * copy is running Escape does nothing at all, and the block says why. Enter is
 * stopped for the same reason the folder picker stops it: a person pressing
 * Return in here is answering this block, never creating a session.
 */

import React, { useEffect, useRef, useState } from 'react';
import type {
  RemoteCloneResult,
  RemoteProjectFindResult
} from '@shared/ipc';
import { REMOTE_PROJECT_MATCH_MAX } from '@shared/ipc';
import {
  CLONE_BUSY_CLOSE,
  CLONE_CANCEL_BUTTON,
  CLONE_CONFIRM_BUTTON,
  CLONE_ONLY_WRITE,
  CLONE_PLAIN,
  cloneDestLabel,
  cloneNoCredential,
  clonePlanLine,
  cloneRunningLine,
  cloneTitle,
  COUNTERPART_CLONE_BUTTON,
  COUNTERPART_USE_MATCH,
  counterpartLooking
} from '../machines/presentation';
import './counterpart-block.css';

/**
 * How often the elapsed count moves while a copy runs. 1000 ms.
 *
 * The number on screen is seconds, so a faster timer would redraw the same
 * sentence for nothing.
 */
export const CLONE_TICK_MS = 1000;

/**
 * The outcomes after which the destination is a folder that holds this project.
 *
 * `existsSame` is in here because a lost answer is not a failed copy. A link
 * that dies after the far side finished leaves a good folder Tortie never heard
 * about, and the retry then finds this project already at that path. Reporting
 * that as a refusal would be wrong.
 */
const CLONE_FILLS_FIELD: readonly string[] = ['cloned', 'existsSame'];

/**
 * Whether the project is now on that machine, as far as that machine said.
 *
 * It is what takes the copy button off the screen. A copy that landed has
 * filled the Directory field, so a second button offering to copy the same
 * project again would be an offer to write on somebody's computer for no
 * reason. A copy that failed leaves the button, because trying again with
 * another folder is the right thing to do.
 */
export function copyLanded(clone: RemoteCloneResult | null): boolean {
  return clone !== null && CLONE_FILLS_FIELD.includes(clone.outcome);
}

/**
 * Whether the copy button may be offered at all.
 *
 * Two conditions, and both are about truth rather than taste. The outcome has
 * to be the one where nothing over there matched, because that is the only
 * state where copying is the right answer. And there has to be an address to
 * copy from, which a project whose remote is a folder on this Mac does not
 * have.
 */
export function cloneOffered(find: RemoteProjectFindResult | null): boolean {
  return (
    find !== null && find.outcome === 'absent' && find.cloneUrl !== null
  );
}

/** What the block needs to draw itself, and nothing else. */
export interface CounterpartBlockViewProps {
  /** The machine's own label. Several sentences name it. */
  machineLabel: string;
  /** The last answer, or null while there has never been one. */
  find: RemoteProjectFindResult | null;
  /** True while the lookup is in flight. */
  looking: boolean;
  /** True while the confirm is open. */
  confirmOpen: boolean;
  /** The destination as the person has left it. */
  dest: string;
  /** The last copy answer, or null while there has never been one. */
  clone: RemoteCloneResult | null;
  /** True while a copy is running on that machine. */
  cloning: boolean;
  /** Whole seconds since the copy started. 0 when none is running. */
  elapsedSeconds: number;
  onUsePath(path: string): void;
  onOpenConfirm(): void;
  onCancelConfirm(): void;
  onDestChange(next: string): void;
  onConfirm(): void;
}

/**
 * The block, as a pure function of one answer and one copy result.
 *
 * Main's sentences are drawn in the order main sent them, and this file writes
 * none of them. That is what keeps one fact in one wording: the file that knows
 * what the machine said is the file that says it.
 */
export function CounterpartBlockView({
  machineLabel,
  find,
  looking,
  confirmOpen,
  dest,
  clone,
  cloning,
  elapsedSeconds,
  onUsePath,
  onOpenConfirm,
  onCancelConfirm,
  onDestChange,
  onConfirm
}: CounterpartBlockViewProps): React.JSX.Element {
  const matches =
    find !== null ? find.matches.slice(0, REMOTE_PROJECT_MATCH_MAX) : [];
  // The folders are offered as a choice only when there is a choice to make.
  // In the found case the field is already filled with that one path, so a
  // button repeating it would be a second way to do what is done.
  const choices = find?.outcome === 'several' ? matches : [];
  const offerClone =
    cloneOffered(find) && !confirmOpen && !cloning && !copyLanded(clone);
  const url = find?.cloneUrl ?? '';

  return (
    <div className="cpart" role="group" aria-label={cloneTitle(machineLabel)}>
      <div className="cpart-body" aria-live="polite">
        {looking ? (
          <p className="cpart-line">{counterpartLooking(machineLabel)}</p>
        ) : null}
        {!looking && find !== null
          ? find.sentences.map((line) => (
              <p key={line} className="cpart-line">
                {line}
              </p>
            ))
          : null}
        {choices.length > 0 ? (
          <ul className="cpart-list">
            {choices.map((match) => (
              <li key={match.path} className="cpart-match">
                <span className="cpart-path">{match.path}</span>
                <button
                  type="button"
                  className="btn btn-secondary"
                  data-cpart-action="use"
                  data-cpart-path={match.path}
                  onClick={() => onUsePath(match.path)}
                >
                  {COUNTERPART_USE_MATCH}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {offerClone ? (
          <div className="cpart-actions">
            <button
              type="button"
              className="btn btn-secondary"
              data-cpart-action="open-confirm"
              onClick={onOpenConfirm}
            >
              {COUNTERPART_CLONE_BUTTON}
            </button>
          </div>
        ) : null}
      </div>

      {confirmOpen ? (
        <div className="cpart-confirm">
          <h3 className="cpart-confirm-title">{cloneTitle(machineLabel)}</h3>
          <label className="field-label" htmlFor="counterpart-dest">
            {cloneDestLabel(machineLabel)}
          </label>
          <input
            id="counterpart-dest"
            className="input input-mono"
            value={dest}
            spellCheck={false}
            autoComplete="off"
            disabled={cloning}
            data-cpart-field="dest"
            onChange={(e) => onDestChange(e.target.value)}
          />
          {/* The four sentences a person reads before the press. The first
              names the exact address and the exact path, and the other three
              are the bounds on what the press can do. */}
          <p className="cpart-line">
            {clonePlanLine(url, dest, machineLabel)}
          </p>
          <p className="cpart-line">{CLONE_ONLY_WRITE}</p>
          <p className="cpart-line">{cloneNoCredential(machineLabel)}</p>
          <p className="cpart-line">{CLONE_PLAIN}</p>
          {cloning ? (
            <>
              <p className="cpart-line cpart-running">
                {cloneRunningLine(machineLabel, dest, elapsedSeconds)}
              </p>
              <p className="cpart-line">{CLONE_BUSY_CLOSE}</p>
            </>
          ) : null}
          <div className="cpart-actions">
            <button
              type="button"
              className="btn btn-secondary"
              disabled={cloning}
              data-cpart-action="cancel"
              onClick={onCancelConfirm}
            >
              {CLONE_CANCEL_BUTTON}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={cloning || dest.trim().length === 0}
              data-cpart-action="confirm"
              onClick={onConfirm}
            >
              {CLONE_CONFIRM_BUTTON}
            </button>
          </div>
        </div>
      ) : null}

      {clone !== null ? (
        <div className="cpart-result" aria-live="polite">
          {clone.sentences.map((line) => (
            <p key={line} className="cpart-line">
              {line}
            </p>
          ))}
          {/* What the machine itself reported, drawn as it arrived. It is the
              machine's words and not Tortie's, so it is drawn in the mono face
              and never reworded. */}
          {clone.detail.length > 0 ? (
            <pre className="cpart-detail">{clone.detail}</pre>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export interface CounterpartBlockProps {
  machineId: string;
  machineLabel: string;
  /** The project folder on this Mac. Main re-reads its remote from here. */
  localPath: string;
  find: RemoteProjectFindResult | null;
  looking: boolean;
  /** Writes a path into the Directory field. Always after a person's press. */
  onUsePath(path: string): void;
  /** Told whenever a copy starts and whenever it stops. */
  onBusyChange(busy: boolean): void;
}

/**
 * The block plus the one call that writes.
 *
 * THE RENDERER NEVER CHOOSES THE ADDRESS. It sends back the address the sheet
 * was drawn from as `expectUrl`, and main re-reads the remote from the project
 * folder and refuses when the two disagree. So the address that reaches the
 * machine is always one main read from a repository on this Mac.
 *
 * An answer for a machine that is no longer chosen is dropped, which is the
 * same rule Phase 90.1 put on the four sidebar stores.
 */
export function CounterpartBlock({
  machineId,
  machineLabel,
  localPath,
  find,
  looking,
  onUsePath,
  onBusyChange
}: CounterpartBlockProps): React.JSX.Element {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [dest, setDest] = useState('');
  const [clone, setClone] = useState<RemoteCloneResult | null>(null);
  const [cloning, setCloning] = useState(false);
  const [elapsedSeconds, setElapsed] = useState(0);
  /** The machine the newest copy was started for. An older answer is dropped. */
  const wanted = useRef(machineId);

  // A new answer is a new question, so the confirm shuts and the destination
  // goes back to the one Tortie would suggest. Without this a person who
  // changed machine mid confirm would be looking at one machine's home path
  // under another machine's name.
  useEffect(() => {
    setConfirmOpen(false);
    setClone(null);
    setDest(find?.suggestedPath ?? '');
  }, [find]);

  // The elapsed count, on this Mac's own clock. It exists because a copy of a
  // large project takes minutes and a screen that says nothing for minutes
  // reads as a screen that has hung.
  useEffect(() => {
    if (!cloning) return undefined;
    const started = Date.now();
    setElapsed(0);
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - started) / 1000));
    }, CLONE_TICK_MS);
    return () => clearInterval(timer);
  }, [cloning]);

  const start = (): void => {
    const api = window.gmux?.machines;
    const url = find?.cloneUrl ?? null;
    if (api?.cloneProject === undefined || url === null) return;
    if (cloning) return;
    wanted.current = machineId;
    setClone(null);
    setCloning(true);
    onBusyChange(true);
    void api
      .cloneProject({
        machineId,
        localPath,
        expectUrl: url,
        path: dest.trim()
      })
      .then(
        (answer) => {
          if (wanted.current !== machineId) return;
          setCloning(false);
          onBusyChange(false);
          setClone(answer);
          if (CLONE_FILLS_FIELD.includes(answer.outcome)) {
            setConfirmOpen(false);
            onUsePath(answer.path);
          }
        },
        () => {
          // The call itself did not come back. Main answers every state it
          // knows about as an outcome, so there is no sentence written for
          // this one. The block stops saying it is copying and says nothing
          // it cannot prove.
          if (wanted.current !== machineId) return;
          setCloning(false);
          onBusyChange(false);
        }
      );
  };

  return (
    <div
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          // While a copy is running there is no way out of this block, and
          // the sentence beside the running line says why.
          if (cloning) {
            e.stopPropagation();
            return;
          }
          if (confirmOpen) {
            e.stopPropagation();
            setConfirmOpen(false);
          }
          return;
        }
        // A person pressing Return in here is answering this block. The create
        // sheet's own Return would start a session on another computer, so it
        // never reaches it from in here. The default is left alone, so Return
        // on a focused button still presses that button.
        if (e.key === 'Enter') e.stopPropagation();
      }}
    >
      <CounterpartBlockView
        machineLabel={machineLabel}
        find={find}
        looking={looking}
        confirmOpen={confirmOpen}
        dest={dest}
        clone={clone}
        cloning={cloning}
        elapsedSeconds={elapsedSeconds}
        onUsePath={onUsePath}
        onOpenConfirm={() => {
          setClone(null);
          setDest(find?.suggestedPath ?? '');
          setConfirmOpen(true);
        }}
        onCancelConfirm={() => setConfirmOpen(false)}
        onDestChange={setDest}
        onConfirm={start}
      />
    </div>
  );
}
