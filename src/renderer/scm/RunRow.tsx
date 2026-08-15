/**
 * One workflow run row (Phase 46).
 *
 * The row IS the expand toggle: clicking it opens the run's jobs underneath,
 * and its `aria-expanded` plus the label from runs-format say so to a screen
 * reader. Right-click gives the two read-only verbs, both native through the
 * ui:popupMenu bridge (DESIGN.md rule: no DOM-drawn menus).
 *
 * This file also owns the two small things RunJobs needs, being the status
 * glyph and the copy helper. They live here rather than in RunsSection because
 * RunsSection imports both components, and putting them there would close an
 * import cycle.
 */

import React from 'react';
import type { ActionsRun } from '@shared/actions';
import { useApp } from '../state/store';
import type { MenuItemSpec } from '../state/store';
import { Codicon } from '../icons';
import { formatRelative } from './format';
import {
  activityDurationText,
  activityTooltip,
  expandLabel,
  runActivity,
  runGlyph
} from './runs-format';
import type { RunGlyph } from './runs-format';

/**
 * A run, job or step status icon. The tone is a class, and runs.css maps each
 * of the five tones to exactly one token.
 */
export function RunStatusIcon({
  glyph,
  title
}: {
  glyph: RunGlyph;
  title?: string;
}): React.JSX.Element {
  // A titled icon is the header's, and it is the only thing saying what the
  // latest run did, so it gets a name a screen reader can read. An untitled
  // one sits inside a row whose own label already says it.
  const named =
    title === undefined
      ? {}
      : { title, role: 'img' as const, 'aria-label': title };
  return (
    <span className={`runs-icon tone-${glyph.tone}`} {...named}>
      <Codicon
        name={glyph.name}
        size={14}
        {...(glyph.spin ? { className: 'codicon-modifier-spin' } : {})}
      />
    </span>
  );
}

/** Copy a URL and say so. One helper, so both menus report the same way. */
export function copyUrl(url: string, done: string): void {
  void navigator.clipboard.writeText(url).then(
    () => useApp.getState().toast('info', done),
    () => useApp.getState().toast('error', 'Could not copy the URL.')
  );
}

/** Open a github.com page in the user's browser. Main routes this to the shell. */
export function openOnGitHub(url: string): void {
  window.open(url, '_blank');
}

export function RunRow({
  run,
  expanded,
  now,
  onToggle
}: {
  run: ActionsRun;
  expanded: boolean;
  /** The instant ages and durations are measured against. */
  now: number;
  onToggle: (runId: number) => void;
}): React.JSX.Element {
  const setMenu = useApp((s) => s.setMenu);

  const activity = runActivity(run);
  const glyph = runGlyph(run.status, run.conclusion);
  const duration = activityDurationText(activity);

  const onContextMenu = (e: React.MouseEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    const items: MenuItemSpec[] = [
      { label: 'Open on GitHub', run: () => openOnGitHub(run.url) },
      { label: 'Copy run URL', run: () => copyUrl(run.url, 'Run URL copied.') }
    ];
    setMenu({ x: e.clientX, y: e.clientY, items });
  };

  return (
    <button
      type="button"
      className={`runs-row${expanded ? ' expanded' : ''}`}
      aria-expanded={expanded}
      aria-label={expandLabel(run, expanded)}
      title={activityTooltip(activity, now)}
      onClick={() => onToggle(run.id)}
      onContextMenu={onContextMenu}
    >
      <span className="runs-chevron" aria-hidden="true">
        <Codicon name="chevron-down" size={12} />
      </span>
      <RunStatusIcon glyph={glyph} />
      <span className="runs-name">{run.workflowName}</span>
      {run.displayTitle !== '' ? (
        <span className="runs-title">{run.displayTitle}</span>
      ) : null}
      <span className="runs-space" />
      <span className="runs-age num">{formatRelative(run.createdAt, now)}</span>
      {duration !== null ? (
        <span className="runs-dur num">{duration}</span>
      ) : null}
    </button>
  );
}
