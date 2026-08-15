/**
 * The HISTORY header's gutter-width accessory (Phase 47 item 4).
 *
 * One 18px toggle in the 28px section header, immediately next to the scope
 * control and following the same hover-revealed accessory pattern. It flips
 * the graph gutter between two widths:
 *
 *  - wide, the default. One shared width for the whole loaded window, sized
 *    from the widest row, so every subject starts at the same x. This is
 *    today's behavior, unchanged to the pixel until the user opts in.
 *  - compact, the operator's request with VS Code's Graph view as the
 *    reference. Each row's SVG gets only the width its own lanes need, so
 *    subjects hug the lanes.
 *
 * The vendored layout and fold run the same in both modes. Only the width
 * the renderer grants each row changes, through `rowColumns` in
 * graph/geometry.ts.
 *
 * The choice persists per user under `gmux.scm.graphGutter`. The backlog
 * entry names no default, so the default is wide, because wide changes
 * nothing until the user asks. An invalid stored value falls back to wide.
 */

import React, { useCallback, useState } from 'react';
import { Codicon } from '../icons';

export type GraphGutterMode = 'wide' | 'compact';

const STORAGE_KEY = 'gmux.scm.graphGutter';

function readMode(): GraphGutterMode {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'compact' ? 'compact' : 'wide';
  } catch {
    return 'wide';
  }
}

/** The persisted gutter mode. One key for the whole app, not per repo. */
export function useGraphGutter(): [
  GraphGutterMode,
  (next: GraphGutterMode) => void
] {
  const [mode, setMode] = useState<GraphGutterMode>(readMode);
  const update = useCallback((next: GraphGutterMode): void => {
    setMode(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* the choice still applies for this session */
    }
  }, []);
  return [mode, update];
}

export function GraphGutterControl({
  mode,
  onPick
}: {
  mode: GraphGutterMode;
  onPick: (next: GraphGutterMode) => void;
}): React.JSX.Element {
  const compact = mode === 'compact';
  return (
    <button
      type="button"
      className={`icon-btn scm-action scm-branch-accessory scm-gutter-btn${compact ? ' pinned' : ''}`}
      aria-label="Compact graph gutter"
      aria-pressed={compact}
      title="Compact graph gutter"
      onClick={(e) => {
        // The header owns a drag-to-reorder gesture; this click is the
        // button's.
        e.stopPropagation();
        onPick(compact ? 'wide' : 'compact');
      }}
    >
      <Codicon name="arrow-both" size={14} />
    </button>
  );
}
