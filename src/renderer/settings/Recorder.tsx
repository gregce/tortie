/**
 * Hotkey recorder chip (DESIGN.md §3, S13 Hotkeys).
 *
 * States: unassigned → "Record shortcut"; assigned → chord glyphs (mono) +
 * × clear on hover; recording → "Type shortcut…" with accent border +
 * focus ring. Esc cancels, ⌫ clears, a valid chord commits instantly;
 * conflicts surface as a 12px --error line under the row (owned by the
 * parent — this component only reports them).
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  acceleratorToDisplay,
  eventToAccelerator,
  validateChord,
  type ChordContext
} from './chords';

export interface RecorderProps {
  /** Canonical accelerator currently assigned, or undefined. */
  value: string | undefined;
  /** Everything conflict validation needs (assigned map, names, self id). */
  context: ChordContext;
  /** Chord passed validation → persist (undefined = cleared). */
  onCommit: (accelerator: string | undefined) => void;
  /** Validation failed → show/clear the error line under the row. */
  onError: (reason: string | null) => void;
  /** Placeholder mnemonic, e.g. "e.g. ⌘⇧C" (registry defaultHotkeyHint). */
  hint?: string;
}

export function Recorder({
  value,
  context,
  onCommit,
  onError,
  hint
}: RecorderProps): React.JSX.Element {
  const [recording, setRecording] = useState(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);

  // Recording captures the chord at the window level so modifiers held
  // before focus and chords the browser would eat still register.
  useEffect(() => {
    if (!recording) return;
    const onKeyDown = (e: KeyboardEvent): void => {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === 'Escape') {
        setRecording(false);
        onError(null);
        return;
      }
      if (e.key === 'Backspace' || e.key === 'Delete') {
        setRecording(false);
        onError(null);
        onCommit(undefined);
        return;
      }
      const accel = eventToAccelerator(e);
      if (accel === null) return; // modifier-only — keep waiting
      const verdict = validateChord(accel, context);
      if (verdict.ok) {
        setRecording(false);
        onError(null);
        onCommit(verdict.accelerator);
      } else {
        // Stay recording so the user can immediately try another chord.
        onError(verdict.reason);
      }
    };
    window.addEventListener('keydown', onKeyDown, { capture: true });
    return () =>
      window.removeEventListener('keydown', onKeyDown, { capture: true });
  }, [recording, context, onCommit, onError]);

  // Clicking anywhere else / losing focus cancels the recording.
  const stopOnBlur = (): void => {
    if (recording) {
      setRecording(false);
      onError(null);
    }
  };

  return (
    <span className="set-recorder-wrap">
      <button
        type="button"
        ref={btnRef}
        className={`set-recorder${recording ? ' recording' : ''}${
          value !== undefined ? ' assigned' : ''
        }`}
        aria-label={
          value !== undefined
            ? `Shortcut ${acceleratorToDisplay(value)} — click to re-record`
            : 'Record shortcut'
        }
        title={recording && hint !== undefined ? hint : undefined}
        onClick={() => {
          if (!recording) {
            onError(null);
            setRecording(true);
          }
        }}
        onBlur={stopOnBlur}
      >
        {recording ? (
          <span className="set-recorder-hinting">
            Type shortcut…{hint !== undefined ? ` (${hint})` : ''}
          </span>
        ) : value !== undefined ? (
          <span className="set-recorder-chord num">
            {acceleratorToDisplay(value)}
          </span>
        ) : (
          'Record shortcut'
        )}
      </button>
      {value !== undefined && !recording ? (
        <button
          type="button"
          className="set-recorder-clear"
          aria-label="Clear shortcut"
          title="Clear shortcut"
          onClick={() => {
            onError(null);
            onCommit(undefined);
          }}
        >
          ×
        </button>
      ) : null}
    </span>
  );
}
