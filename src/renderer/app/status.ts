/**
 * Visual mapping for session status (DESIGN.md §1.3): color + shape + text.
 * Status is never color-alone — the dot class encodes shape (solid/hollow)
 * and motion (pulse), and every row carries the text label.
 */

import type { SessionStatus } from '@shared/types';

export type DotKind = 'working' | 'attention' | 'idle' | 'ended' | 'failed';

export interface StatusVisual {
  dot: DotKind;
  /** Row/strip text label; sentence case. */
  label: string;
}

export function statusVisual(status: SessionStatus): StatusVisual {
  switch (status) {
    case 'running':
      return { dot: 'working', label: 'working' };
    case 'needs_input':
      return { dot: 'attention', label: 'needs input' };
    case 'idle':
      return { dot: 'idle', label: 'idle' };
    case 'exited':
      // Exit codes are not in the frozen Session shape yet, so every ended
      // session renders the exit-0 form (hollow gray, "ended"); the failed
      // variant (hollow red) is wired for when main reports codes.
      return { dot: 'ended', label: 'ended' };
    case 'restorable':
      return { dot: 'idle', label: 'saved' };
  }
}

/** Roll-up for a project tab: attention > working > idle; none → hollow. */
export function rollupDot(statuses: SessionStatus[]): DotKind | 'none' {
  let saw: DotKind | 'none' = 'none';
  for (const s of statuses) {
    if (s === 'needs_input') return 'attention';
    if (s === 'running') saw = 'working';
    else if (s === 'idle' && saw !== 'working') saw = 'idle';
  }
  return saw;
}
