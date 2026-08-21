/**
 * The project tabs' position toggle (Phase 129).
 *
 * ONE STORE VALUE, three controls. This button, the rail's copy of it and the
 * View menu's radio pair all read and write `projectsPosition` — no second
 * piece of state anywhere — and the store's setter is what tells main to move
 * the radio marks (src/renderer/state/chrome-slice.ts → ui:projectsPosition).
 *
 * Both positions render THIS component: the titlebar's tab strip and the left
 * rail's band. A second hand-written copy is how two surfaces drift apart, and
 * SessionsPositionButton.tsx carries the same note for the same reason.
 */

import React from 'react';
import { useApp } from '../state/store';
import {
  destinationIcon,
  movePositionLabel,
  otherPosition
} from './projects-position';
import { Codicon } from '../icons';
import './project-rail.css';

export function ProjectsPositionButton(): React.JSX.Element {
  const position = useApp((s) => s.projectsPosition);
  const setProjectsPosition = useApp((s) => s.setProjectsPosition);
  const label = movePositionLabel(position);

  return (
    <button
      type="button"
      className="icon-btn projects-position"
      aria-label={label}
      title={label}
      onClick={() => setProjectsPosition(otherPosition(position))}
    >
      <Codicon name={destinationIcon(position)} size={16} />
    </button>
  );
}
