/**
 * ImageCompare — what a commit did to a picture (Phase 12.10 item 1).
 *
 * gmux's whole editor gesture is "a modified file opens as a diff", and an
 * image was the one file type where that promise quietly turned into a
 * single working copy with no way to see what changed. This is the same
 * gesture for pixels: LEFT is the blob at HEAD, RIGHT is the file on disk,
 * side by side under one shared control with the text diff.
 *
 * IT REUSES THE TEXT DIFF'S LAYOUT DECISION ON PURPOSE. `sideBySide` and its
 * 640px floor come from EditorPanel, the one place that knows how wide the
 * panel is (DESIGN-SPEC S5C) — so the "Side by side" toggle a user already
 * knows drives this surface too, and there is no second threshold to keep in
 * step.
 *
 * NO ZOOM HERE, deliberately. Each side fits its half, and the Image mode
 * beside it in the mode control is one click away with the full magnifier.
 * A linked pan-and-zoom across two panes is a different tool, and a
 * comparison you cannot read at a glance has already failed.
 */

import React, { useState } from 'react';
import type { ImageReadResult } from '@shared/image-types';
import type { EditorTab } from '../store';
import { formatBytes, shortTypeOf } from './zoom';
import type { Size } from './zoom';
import './image.css';

export interface ImageCompareProps {
  tab: EditorTab;
  /** Two columns when the panel is wide enough (EditorPanel decides). */
  sideBySide: boolean;
}

export function ImageCompare({
  tab,
  sideBySide
}: ImageCompareProps): React.JSX.Element {
  return (
    <div className={`imgc${sideBySide ? ' side-by-side' : ''}`}>
      <ComparePane
        caption="Before"
        sublabel="HEAD"
        data={tab.imageHead}
        name={tab.name}
        emptyTitle="Not in HEAD"
        emptyBody="This image is new — there is nothing to compare it against yet."
      />
      <ComparePane
        caption="After"
        sublabel="working tree"
        data={tab.imageData}
        name={tab.name}
        emptyTitle="Not on disk"
        emptyBody="The working copy was moved or deleted."
        revision={tab.imageRevision}
      />
    </div>
  );
}

function ComparePane({
  caption,
  sublabel,
  data,
  name,
  emptyTitle,
  emptyBody,
  revision = 0
}: {
  caption: string;
  sublabel: string;
  data: ImageReadResult | null;
  name: string;
  emptyTitle: string;
  emptyBody: string;
  revision?: number;
}): React.JSX.Element {
  const [natural, setNatural] = useState<Size | null>(null);
  const src =
    data !== null && data.status === 'ok' ? (data.dataUrl ?? data.url) : null;
  const versioned =
    src === null || revision === 0
      ? src
      : `${src}${src.includes('?') ? '&' : '?'}v=${String(revision)}`;

  return (
    <section className="imgc-pane" aria-label={`${name} — ${caption}`}>
      <header className="imgc-caption">
        <span className="imgc-caption-name">{caption}</span>
        <span className="imgc-caption-sub">{sublabel}</span>
      </header>
      <div className="imgc-stage">
        {data === null ? (
          <div className="imgv-loading" aria-label="Loading" />
        ) : data.status === 'too-large' ? (
          <p className="imgc-empty">
            {formatBytes(data.bytes)} — too large to preview.
          </p>
        ) : versioned === null ? (
          <p className="imgc-empty">
            <span className="imgc-empty-title">{emptyTitle}</span>
            {emptyBody}
          </p>
        ) : (
          <img
            className="imgc-img"
            src={versioned}
            alt={`${name} — ${caption}`}
            draggable={false}
            onLoad={(e) =>
              setNatural({
                width: e.currentTarget.naturalWidth,
                height: e.currentTarget.naturalHeight
              })
            }
          />
        )}
      </div>
      <footer className="imgc-meta">
        {data !== null && data.status !== 'missing' ? (
          <>
            {natural !== null && natural.width > 0 ? (
              <span>{`${String(natural.width)} × ${String(natural.height)}`}</span>
            ) : null}
            <span>{formatBytes(data.bytes)}</span>
            <span>{shortTypeOf(data.mediaType)}</span>
          </>
        ) : null}
      </footer>
    </section>
  );
}
