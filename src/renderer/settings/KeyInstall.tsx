/**
 * Phase 79.1. Setting up a key for one machine, drawn. PHASE 340 made it one
 * step of the check (build/p340/SPEC.md D10).
 *
 * WHAT THIS IS. The step under a check that came back with the machine asking
 * for a password, turning the sign in down, or not accepting connections. It
 * takes that machine's password once and hands it to main with main's own
 * hash. Main makes a key, puts its public half on that machine, and the store
 * then runs the check again so the last thing a person reads is the machine's
 * own answer.
 *
 * WHAT IS ON ITS FACE, AND WHAT IS ONE PRESS AWAY. The password field, one
 * hint saying where the password goes, and one button. Main's lines, its
 * warning and its five notes stand behind What this does, drawn byte for byte,
 * because his design asked for a password once and "just enough words". This
 * supersedes Phase 130's rule that the file written on that machine and where
 * the private half lives stand on the face: they are one press away, and the
 * hash binds them exactly as before, because the hash is main's and nothing
 * here composes a line of it.
 *
 * WHERE THE WORDS COME FROM, and this is the whole reason the step can be
 * trusted. The lines, the warning and the notes are main's, composed beside
 * the hash that binds the agreement, and they are drawn here exactly as they
 * arrived. So is every sentence about what happened afterwards. This file
 * writes labels, one button and one hint, and nothing else.
 *
 * THE PASSWORD. It lives in this component's own state and nowhere else. It is
 * never put in the store, so no snapshot of the store holds it, and the field
 * is cleared on the same tick the call is made.
 */

import React, { useState } from 'react';
import type { MachineKeySheet, MachineTestClass } from '@shared/ipc';
import { Remedy } from './Remedy';
import {
  BTN_INSTALL_KEY,
  DETAILS_LABEL,
  INSTALLING_KEY,
  KEY_DISABLED_REASON,
  KEY_FINGERPRINT_LABEL,
  KEY_MADE_NEW,
  KEY_MADE_REUSED,
  KEY_PASSWORD_HINT,
  KEY_PASSWORD_LABEL,
  KEY_RESULT_LABEL,
  KEY_TRANSCRIPT_LABEL,
  KEY_WHAT_THIS_DOES,
  KEY_WROTE_ADDED,
  KEY_WROTE_PRESENT
} from './machines-copy';
import type { KeyInstallState } from './machines-store';
import './key-install.css';

export interface KeyInstallProps {
  /**
   * Main's sheet for this machine, or null when there is nothing to offer.
   * The caller reads it through `keySheetOf`, so one rule decides when the
   * step exists.
   */
  sheet: MachineKeySheet | null;
  /** The install for this machine, or null before one has been started. */
  state: KeyInstallState | null;
  /**
   * The class the check above has already given advice for, or null. A refused
   * install under a refused check would otherwise draw the same paragraph twice
   * on one panel. The advice is worth reading once.
   */
  adviceAbove: MachineTestClass | null;
  /** Takes the password once. This component keeps no copy of it. */
  onInstall(password: string): void;
}

export function KeyInstall({
  sheet,
  state,
  adviceAbove,
  onInstall
}: KeyInstallProps): React.JSX.Element | null {
  const [password, setPassword] = useState('');

  const running = state?.running === true;
  const result = state?.result ?? null;

  // Nothing to offer and nothing to report. The step does not exist rather
  // than existing empty, so a machine that is working shows no password field
  // at all.
  if (sheet === null && result === null) return null;

  const ready = password !== '' && !running;

  const press = (): void => {
    onInstall(password);
    // Cleared on the same tick the call is made. What a person typed lives in
    // this component for as long as it takes to hand it over.
    setPassword('');
  };

  return (
    <div className="mach-key" data-machines-key="1">
      {sheet === null ? null : (
        <>
          <div className="mach-key-row">
            <label className="mach-field-row mach-key-field">
              <span className="mach-field-label">{KEY_PASSWORD_LABEL}</span>
              <input
                type="password"
                className="mach-field"
                data-machines-field="machine-password"
                spellCheck={false}
                autoComplete="off"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && ready) press();
                }}
              />
            </label>
            {/* The reason the button is off rides on the button as its hover,
                the shape the Add flow uses, and an enabled button carries no
                hover at all. */}
            <button
              type="button"
              className="btn btn-primary"
              disabled={!ready}
              {...(ready || running ? {} : { title: KEY_DISABLED_REASON })}
              data-machines-action="install-key"
              onClick={press}
            >
              {running ? INSTALLING_KEY : BTN_INSTALL_KEY}
            </button>
          </div>
          <div className="mach-hint">{KEY_PASSWORD_HINT}</div>

          {/* Main's own lines, warning and notes, in main's order, unchanged,
              one press away (D10). Nothing here is deleted or reworded. */}
          <details className="mach-key-more" data-machines-key-what="1">
            <summary>{KEY_WHAT_THIS_DOES}</summary>
            <ul className="set-config-lines">
              {sheet.lines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <p className="set-config-warning">{sheet.warning}</p>
            {sheet.notes.map((note) => (
              <p className="mach-key-note" key={note}>
                {note}
              </p>
            ))}
          </details>
        </>
      )}

      {result === null ? null : (
        <div
          className="mach-key-result"
          data-key-class={result.class}
          data-key-alarm={result.alarm ? 'yes' : 'no'}
        >
          {/* Both sentences are main's, for the reason the outcome's are. */}
          <div className="mach-outcome-head">{result.headline}</div>
          <div className="mach-outcome-detail">{result.detail}</div>

          {result.class === adviceAbove ? null : <Remedy cls={result.class} />}

          <details className="mach-key-more" data-machines-key-result-details="1">
            <summary>{DETAILS_LABEL}</summary>
            <div className="mach-key-sublabel">{KEY_RESULT_LABEL}</div>
            <p className="mach-key-note">
              {result.keyMade ? KEY_MADE_NEW : KEY_MADE_REUSED}
            </p>
            {result.wrote === null ? null : (
              <p className="mach-key-note">
                {result.wrote === 'added' ? KEY_WROTE_ADDED : KEY_WROTE_PRESENT}
              </p>
            )}
            {result.fingerprint === null ? null : (
              <div className="mach-prepare-fact">
                <span className="mach-prepare-label">{KEY_FINGERPRINT_LABEL}</span>
                <span className="mach-prepare-value" data-key-fingerprint>
                  {result.fingerprint}
                </span>
              </div>
            )}
            {result.transcript === '' ? null : (
              <>
                <div className="mach-key-sublabel">{KEY_TRANSCRIPT_LABEL}</div>
                <pre className="mach-transcript" data-key-transcript="1">
                  {result.transcript}
                </pre>
              </>
            )}
          </details>
        </div>
      )}
    </div>
  );
}
