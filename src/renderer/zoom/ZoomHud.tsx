/**
 * The zoom readout — one line, for about a second, then gone.
 *
 * It exists for two reasons and no others. First, zoom is scoped to a region,
 * so the user has to be told WHICH region moved: pressing ⌘+ with focus in
 * the sidebar and watching the terminal not change is otherwise a bug report.
 * Second, the ladder has ends, and a ⌘- that does nothing has to say why —
 * that is the spec's "quiet hint at the limits", said in the same place as
 * every other zoom message rather than as a separate toast.
 *
 * It is NOT a toast: toasts stack, persist, and are for things that happened
 * to the work. This is a transient readout of a control the user is holding
 * down, so it replaces itself, never queues, and occupies its own lane
 * (bottom centre) so it can never push a real toast around.
 */

import React, { useEffect } from 'react';
import { formatZoomPercent, ZOOM_REGION_LABELS } from './regions';
import { useZoom } from './store';
import './zoom.css';

/** How long the readout stays up after the last press. */
const HOLD_MS = 1100;

const LIMIT_NOTE: Readonly<Record<'min' | 'max', string>> = {
  min: 'smallest',
  max: 'largest'
};

export function ZoomHud(): React.JSX.Element | null {
  const hint = useZoom((s) => s.hint);
  const dismiss = useZoom((s) => s.dismissHint);

  const seq = hint?.seq ?? 0;
  useEffect(() => {
    if (seq === 0) return undefined;
    const timer = window.setTimeout(() => dismiss(seq), HOLD_MS);
    return () => window.clearTimeout(timer);
  }, [seq, dismiss]);

  if (hint === null) return null;

  const label =
    hint.region === 'all' ? 'Zoom reset' : ZOOM_REGION_LABELS[hint.region];

  return (
    <div className="zoom-hud" role="status" aria-live="polite" key={hint.seq}>
      <span className="zoom-hud-label">{label}</span>
      {hint.region === 'all' ? null : (
        <span className="zoom-hud-value">{formatZoomPercent(hint.factor)}</span>
      )}
      {hint.limit === null ? null : (
        <span className="zoom-hud-note">{LIMIT_NOTE[hint.limit]}</span>
      )}
    </div>
  );
}
