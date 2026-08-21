/**
 * Phase 79.1. Setting up a key for one machine, drawn.
 *
 * WHAT THIS IS. The block under a connection test that came back with the
 * machine turning the sign in down, or with the machine not accepting
 * connections at all. It says what Tortie is about to do, takes that machine's
 * password once, and hands both to main. Main makes a key, puts its public
 * half on that machine, and the store then starts the real connection test
 * again so the last thing a person reads is the machine's own answer.
 *
 * WHERE THE WORDS COME FROM, and this is the whole reason the block can be
 * trusted. The lines, the warning and the notes are main's, composed beside
 * the hash that binds the agreement, and they are drawn here exactly as they
 * arrived. So is every sentence about what happened afterwards. This file
 * writes labels, one button and one hint, and nothing else. It names no file,
 * no path, no program and no part of the key.
 *
 * THE PASSWORD. It lives in this component's own state and nowhere else. It is
 * never put in the store, so no snapshot of the store holds it, and the field
 * is cleared on the same tick the call is made. That is the same shape the
 * connection test's answer field already has.
 *
 * PHASE 130. Two of main's five notes now sit behind a shut disclosure rather
 * than in the stack above the password field. They are still main's words,
 * still drawn byte for byte, and one press opens them. The rule that decides
 * which two is written beside the partition in the component below. Nothing
 * was deleted, nothing was reworded, and no consent fact moved.
 *
 * WHY THIS IMPORTS FROM ITS OWN PARENT. `Remedy` is defined in
 * ConnectionTestView.tsx, which renders this component, so the two modules
 * refer to each other. It is safe because both are function declarations and
 * neither runs at module scope. The alternative was a second copy of the
 * remedy block, and one advice table drawn two ways is how two answers to the
 * same question start to disagree.
 */

import React, { useState } from 'react';
import type { MachineKeySheet, MachineTestClass } from '@shared/ipc';
import { Remedy } from './ConnectionTestView';
import {
  BTN_INSTALL_KEY,
  INSTALLING_KEY,
  KEY_BLOCK_LABEL,
  KEY_DISABLED_REASON,
  KEY_FINGERPRINT_LABEL,
  KEY_LINES_LABEL,
  KEY_MADE_NEW,
  KEY_MADE_REUSED,
  KEY_MORE_LABEL,
  KEY_PASSWORD_HINT,
  KEY_PASSWORD_LABEL,
  KEY_RESULT_LABEL,
  KEY_TRANSCRIPT_LABEL,
  KEY_WROTE_ADDED,
  KEY_WROTE_PRESENT,
  REMEDY_ALREADY_SAYS_REMOTE_LOGIN
} from './machines-copy';
import type { KeyInstallState } from './machines-store';
import './key-install.css';

export interface KeyInstallProps {
  /**
   * Main's sheet for this machine, or null when there is nothing to offer.
   * The caller reads it through `keySheetOf`, so one rule decides when the
   * block exists.
   */
  sheet: MachineKeySheet | null;
  /** The install for this machine, or null before one has been started. */
  state: KeyInstallState | null;
  /**
   * The class the panel above has already given advice for, or null.
   *
   * A refused install under a refused test would otherwise draw the same
   * paragraph twice on one panel, one line apart. The advice is worth reading
   * once.
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

  // Nothing to offer and nothing to report. The block does not exist rather
  // than existing empty, so a machine that is working shows no password field
  // at all.
  if (sheet === null && result === null) return null;

  const ready = password !== '' && !running;

  // PHASE 130. Main writes five notes and this surface drew all five, in one
  // stack, above the password field. The operator read the whole thing and
  // asked for what a person needs at that moment. Two of them move behind a
  // shut disclosure and the rest stay where they were.
  //
  // WHAT MOVES, AND WHY EACH ONE MOVES:
  //  - notes[1], why the key has no passphrase. It explains a design choice.
  //    The fact it defends, that the file is what protects the key, is already
  //    the second sentence of main's warning above it.
  //  - notes[0], turn on Remote Login first, and ONLY when the advice above
  //    has already said it. On `refused` the remedy four lines up says exactly
  //    this. On the other two classes that offer a key nothing above says it,
  //    so it stays in place there.
  //
  // NOTHING IS DELETED AND NOTHING IS REWORDED. Both are main's own strings,
  // drawn byte for byte, one press away. No consent fact moves: what happened,
  // the next action, the file written on that machine, where the private half
  // lives and what becomes of the password are all still on screen with
  // nothing to press.
  const behindIndexes = new Set<number>([1]);
  if (
    adviceAbove !== null &&
    REMEDY_ALREADY_SAYS_REMOTE_LOGIN.includes(adviceAbove)
  ) {
    behindIndexes.add(0);
  }
  const notes = sheet === null ? [] : sheet.notes;
  const shownNotes = notes.filter((_, i) => !behindIndexes.has(i));
  const behindNotes = notes.filter((_, i) => behindIndexes.has(i));

  const press = (): void => {
    onInstall(password);
    // Cleared on the same tick the call is made. What a person typed lives in
    // this component for as long as it takes to hand it over.
    setPassword('');
  };

  return (
    <div className="mach-key" data-machines-key="1">
      <div className="mach-key-label">{KEY_BLOCK_LABEL}</div>

      {sheet === null ? null : (
        <>
          {/* Main's own lines, being exactly the facts its hash covers. */}
          <div className="mach-key-lines">
            <div className="mach-key-sublabel">{KEY_LINES_LABEL}</div>
            <ul className="set-config-lines">
              {sheet.lines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>

          {/* Main's warning and main's notes, in main's order, unchanged. The
              note that says Remote Login comes before the key stays here on
              every answer whose advice has not already said it, because a key
              on a machine that is not accepting connections still cannot sign
              in. The partition above decides which notes are here and which
              are one press away, and it deletes none of them. */}
          <p className="set-config-warning">{sheet.warning}</p>
          {shownNotes.map((note) => (
            <p className="mach-key-note" key={note}>
              {note}
            </p>
          ))}
          {behindNotes.length === 0 ? null : (
            <details className="mach-key-more" data-p130-key-more="1">
              <summary>{KEY_MORE_LABEL}</summary>
              {behindNotes.map((note) => (
                <p className="mach-key-note" key={note}>
                  {note}
                </p>
              ))}
            </details>
          )}

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
          <div className="mach-hint">{KEY_PASSWORD_HINT}</div>

          <button
            type="button"
            className="btn btn-primary"
            disabled={!ready}
            data-machines-action="install-key"
            onClick={press}
          >
            {running ? INSTALLING_KEY : BTN_INSTALL_KEY}
          </button>
          {/* A control that is off without saying why is a puzzle rather than
              a safeguard, which is the shape the Add button already has. */}
          {ready || running ? null : (
            <div className="mach-hint">{KEY_DISABLED_REASON}</div>
          )}
        </>
      )}

      {result === null ? null : (
        <div
          className="mach-key-result"
          data-key-class={result.class}
          data-key-alarm={result.alarm ? 'yes' : 'no'}
        >
          <div className="mach-key-sublabel">{KEY_RESULT_LABEL}</div>
          {/* Both sentences are main's, for the reason the outcome's are. */}
          <div className="mach-outcome-head">{result.headline}</div>
          <div className="mach-outcome-detail">{result.detail}</div>

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
              <span className="mach-prepare-label">
                {KEY_FINGERPRINT_LABEL}
              </span>
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

          {result.class === adviceAbove ? null : <Remedy cls={result.class} />}
        </div>
      )}
    </div>
  );
}
