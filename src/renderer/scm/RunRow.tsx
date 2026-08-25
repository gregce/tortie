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
 *
 * PHASE 105 ADDED A SECOND MODE, and the first one did not move. A row in
 * `open` mode opens the run on github.com instead of expanding it. It draws no
 * chevron, it carries no `aria-expanded`, and its label says what the click
 * does. That mode is what the Runs group for a folder on another machine draws,
 * because reading a run's jobs is a second channel and a second gh process for
 * every row, and Phase 105 has one channel. `expand` is the default, so every
 * caller written before this phase behaves byte for byte as it did.
 */

import React from 'react';
import type { ActionsRun } from '@shared/actions';
import { useApp } from '../state/store';
import type { MenuItemSpec } from '../state/store';
import { Codicon, menuGlyph } from '../icons';
import {
  activityDurationText,
  expandLabel,
  formatAgeShort,
  openLabel,
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

/**
 * What a click on the row does.
 *
 * `expand` opens the run's jobs under it, which is what the local Runs section
 * has done since Phase 46. `open` sends the person to the run on github.com,
 * which is what the Runs group for a folder on another machine does.
 */
export type RunRowMode = 'expand' | 'open';

/**
 * What a click on a run row does, as a plain function.
 *
 * It is a named function rather than a body inside the JSX so that a test can
 * call it. This repository carries no jsdom and no testing library, so a click
 * on a rendered row cannot be simulated at all, and the one thing that must be
 * proved about a row in `open` mode is that clicking it opens a page instead of
 * expanding anything.
 */
export function runRowClick(
  run: ActionsRun,
  mode: RunRowMode,
  onToggle?: (runId: number) => void
): void {
  if (mode === 'open') {
    openOnGitHub(run.url);
    return;
  }
  onToggle?.(run.id);
}

export function RunRow({
  run,
  expanded = false,
  now,
  mode = 'expand',
  onToggle,
  onHoverStart,
  onHoverEnd
}: {
  run: ActionsRun;
  /** Whether the jobs are showing. Never true in `open` mode. */
  expanded?: boolean;
  /** The instant ages and durations are measured against. */
  now: number;
  /** PHASE 105. Defaults to the behaviour every caller before it had. */
  mode?: RunRowMode;
  /** Called on a click in `expand` mode. `open` mode never calls it. */
  onToggle?: (runId: number) => void;
  /**
   * Hover card wiring (Phase 46.1). RunsSection owns the timers and the card;
   * the row only reports the pointer and hands over its own element so the
   * card can anchor to the row's rect.
   */
  onHoverStart?: (el: HTMLElement) => void;
  onHoverEnd?: () => void;
}): React.JSX.Element {
  const opens = mode === 'open';
  const setMenu = useApp((s) => s.setMenu);

  const activity = runActivity(run);
  const glyph = runGlyph(run.status, run.conclusion);
  const duration = activityDurationText(activity);

  const onContextMenu = (e: React.MouseEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    const items: MenuItemSpec[] = [
      {
        label: 'Open on GitHub',
        ...menuGlyph('globe'),
        run: () => openOnGitHub(run.url)
      },
      {
        label: 'Copy run URL',
        ...menuGlyph('copy'),
        run: () => copyUrl(run.url, 'Run URL copied.')
      }
    ];
    setMenu({ x: e.clientX, y: e.clientY, items });
  };

  // No title attribute here (Phase 46.1). The hover card is the row's
  // explanation now, and an OS tooltip would stack on top of it.
  return (
    <button
      type="button"
      className={`runs-row${expanded ? ' expanded' : ''}${opens ? ' opens' : ''}`}
      // A row that opens a page is not an expander, so it carries no
      // `aria-expanded` at all rather than carrying a false one.
      {...(opens ? {} : { 'aria-expanded': expanded })}
      aria-label={opens ? openLabel(run) : expandLabel(run, expanded)}
      onClick={() => runRowClick(run, mode, onToggle)}
      onContextMenu={onContextMenu}
      onMouseEnter={(e) => onHoverStart?.(e.currentTarget)}
      onMouseLeave={() => onHoverEnd?.()}
    >
      {opens ? null : (
        <span className="runs-chevron" aria-hidden="true">
          <Codicon name="chevron-down" size={12} />
        </span>
      )}
      <RunStatusIcon glyph={glyph} />
      <span className="runs-name">{run.workflowName}</span>
      {run.displayTitle !== '' ? (
        <span className="runs-title">{run.displayTitle}</span>
      ) : null}
      <span className="runs-space" />
      <span className="runs-age num">{formatAgeShort(run.createdAt, now)}</span>
      {duration !== null ? (
        <>
          <span className="runs-sep" aria-hidden="true">
            ·
          </span>
          <span className="runs-dur num">{duration}</span>
        </>
      ) : null}
    </button>
  );
}
