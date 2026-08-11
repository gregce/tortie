/**
 * Keycap — the one way a keyboard chord is drawn in gmux.
 *
 * Lives outside app/ and settings/ on purpose: the ⌘/ overlay, the Settings
 * shortcut map, the recorder and the empty-state hints all render chords, and
 * they run in two different BrowserWindows. Both load styles/globals.css, so
 * `.key` is available to both; this component is the only thing that should
 * ever emit it.
 *
 * Sans, not mono, per the DESIGN.md §3 keycap rule: in the mono face "⌘O"
 * reads as "⌘0".
 */

import React from 'react';
import type { KeymapChord, KeymapEntry } from '@shared/keymap';
import { acceleratorToDisplay, displayChords } from '@shared/keymap';

/** A single chip. Children is the already-glyphed text ("⇧⌘C"). */
export function Keycap({ children }: { children: string }): React.JSX.Element {
  return <span className="key">{children}</span>;
}

/** A chip from a canonical accelerator ("Shift+Cmd+C" → ⇧⌘C). */
export function AcceleratorKeycap({
  accelerator
}: {
  accelerator: string;
}): React.JSX.Element {
  return <Keycap>{acceleratorToDisplay(accelerator)}</Keycap>;
}

/**
 * Every chord of one keymap entry, ranges collapsed (⌘1 … ⌘8). Connective
 * tokens render as plain muted text so the eye reads three chips and a range,
 * not ten chips.
 */
export function Keycaps({
  entry
}: {
  entry: KeymapEntry;
}): React.JSX.Element | null {
  const chords = displayChords(entry);
  if (chords.length === 0) return null;
  return (
    <>
      {chords.map((chord: KeymapChord, i: number) =>
        chord.kind === 'text' ? (
          <span key={`${chord.display}-${i}`} className="key-range">
            {chord.display}
          </span>
        ) : (
          <Keycap key={`${chord.display}-${i}`}>{chord.display}</Keycap>
        )
      )}
    </>
  );
}
