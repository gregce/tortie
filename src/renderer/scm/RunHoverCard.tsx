/**
 * Run hover card (Phase 46.1). The Runs sibling of the commit HoverCard.
 *
 * The mechanics mirror HoverCard.tsx exactly. A body portal, because
 * position fixed has to escape the sidebar's overflow. Anchored 8px right of
 * the hovered row's rect. Flips upward instead of clipping the window
 * bottom. The parent owns the timers (hover-timing.ts) and keeps the card
 * open while the pointer is inside it.
 *
 * Every value on the card comes from the run row gh already sent or from the
 * jobs cache. The card never triggers a read, so hovering can never start a
 * process. The strings live in run-card-format.ts, which is pure and pinned
 * by test.
 */

import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ActionsJob, ActionsRun } from '@shared/actions';
import { Codicon } from '../icons';
import { RunStatusIcon, copyUrl } from './RunRow';
import { runCardModel } from './run-card-format';
import type { HoverAnchor } from './hover-timing';

/** Viewport inset the card never crosses (px). Same number as HoverCard. */
const EDGE = 8;
const CARD_WIDTH = 520;

export function RunHoverCard({
  run,
  jobs,
  anchor,
  now,
  onPointerEnter,
  onPointerLeave
}: {
  run: ActionsRun;
  /** The jobs already cached for this run, or null when none were read. */
  jobs: readonly ActionsJob[] | null;
  /** The hovered row's bounding rect at trigger time. */
  anchor: HoverAnchor;
  now: number;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
}): React.JSX.Element {
  const model = useMemo(() => runCardModel(run, jobs, now), [run, jobs, now]);

  const cardRef = useRef<HTMLDivElement | null>(null);
  const [top, setTop] = useState<number>(anchor.top);

  // Measure after render; flip upward when the card would clip the bottom.
  // Re-measure when the model changes, because jobs arriving grows the card.
  useLayoutEffect(() => {
    const el = cardRef.current;
    if (el === null) return;
    const h = el.offsetHeight;
    let next = anchor.top;
    if (next + h > window.innerHeight - EDGE) {
      next = Math.max(
        EDGE,
        Math.min(anchor.bottom, window.innerHeight - EDGE) - h
      );
    }
    setTop(next);
  }, [anchor, model]);

  const left = anchor.right + EDGE;
  const width = Math.min(
    CARD_WIDTH,
    Math.max(280, window.innerWidth - left - EDGE)
  );

  return createPortal(
    <div
      ref={cardRef}
      className="scm-card"
      role="dialog"
      aria-label={model.ariaLabel}
      style={{ left, top, width }}
      onMouseEnter={onPointerEnter}
      onMouseLeave={onPointerLeave}
    >
      <div className="runs-card-header">
        <RunStatusIcon glyph={model.glyph} />
        <span className="runs-card-name">{model.workflowName}</span>
        <span className="runs-card-age">{model.age}</span>
      </div>
      <div className="scm-card-body runs-card-body">
        {model.subject !== null ? (
          <p className="scm-card-subject">{model.subject}</p>
        ) : null}
        <p className="runs-card-summary">{model.summary}</p>
        {model.fields.length > 0 ? (
          <dl className="runs-card-grid">
            {model.fields.map((field) => (
              <React.Fragment key={field.label}>
                <dt className="runs-card-label">{field.label}</dt>
                <dd className="runs-card-value">{field.value}</dd>
              </React.Fragment>
            ))}
          </dl>
        ) : null}
        <div className="runs-card-jobs">
          <div className="runs-card-jobs-title">Jobs</div>
          {model.jobsNote !== null ? (
            <div className="runs-card-jobs-note">{model.jobsNote}</div>
          ) : (
            model.jobs.map((job) => (
              <div className="runs-card-job" key={job.key}>
                <RunStatusIcon glyph={job.glyph} />
                <span className="runs-card-job-name">{job.name}</span>
                {job.duration !== null ? (
                  <span className="runs-card-job-dur num">{job.duration}</span>
                ) : null}
              </div>
            ))
          )}
        </div>
      </div>
      <div className="scm-card-sha-row">
        <button
          type="button"
          className="scm-card-sha"
          title="Copy run URL"
          aria-label="Copy run URL"
          onClick={() => copyUrl(model.url, 'Run URL copied.')}
        >
          <Codicon name="copy" size={14} />
          <span className="num">{model.copyLabel}</span>
        </button>
        <span className="scm-row-space" />
        <a
          className="scm-card-github"
          href={model.url}
          target="_blank"
          rel="noreferrer"
        >
          <Codicon name="globe" size={14} />
          Open on GitHub
        </a>
      </div>
    </div>,
    document.body
  );
}
