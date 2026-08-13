/**
 * HtmlPreview — the rendered-page surface (Phase 20.5).
 *
 * An `.html` tab gets the control markdown already has, which is Preview,
 * Source and Split. Preview is this: the file itself, rendered by Chromium,
 * inside a frame that can reach nothing.
 *
 * WHERE THE CONTENT RUNS, because that is the whole design.
 *
 *   main            protocol.handle('gmux-preview') — one response
 *                   constructor, `Content-Security-Policy: default-src
 *                   'none'` set inside it, real-path containment on both the
 *                   request and the root, external anchors rewritten inert
 *                     |
 *   this renderer   an iframe whose sandbox attribute is empty, pointed at
 *                   a gmux-preview://<token>/… URL
 *                     |
 *   preview frame   its own renderer process, opaque origin, no preload,
 *                   no window.gmux, no parent access, no script
 *
 * Three locks hold it and they were measured separately (research 39 §2.2).
 * The one this file owns is the sandbox attribute, and the belief most
 * likely to produce a wrong change here is that the attribute stops network
 * access. It does not, and it never did: with `allow-scripts` under a
 * deliberately relaxed policy, 11 of 11 probes reached a local sink. What it
 * does stop is parent DOM access, cookies, storage, forms, popups, top
 * navigation and `<meta http-equiv="refresh">`. Read the comment on the
 * attribute itself before touching it.
 *
 * WHAT THIS SURFACE DOES NOT DO, stated here rather than discovered:
 *
 *  - **It shows the file as SAVED, including in Split.** The frame is served
 *    from disk. Serving an unsaved buffer would mean main holding the
 *    renderer's editor state and serving it back, which is a new surface
 *    into the process that holds the trust, and this phase does not build
 *    one. Split says so in the line under the frame.
 *  - **Scroll position is not kept across a reload.** It cannot be. The
 *    frame has an opaque origin and no script, so there is nothing in this
 *    process that may read its scroll offset and nothing in that one that
 *    could send it. What is done instead is to reload as rarely as possible:
 *    the URL's version stamp comes from the bytes, so a rewrite that changes
 *    nothing changes no URL, and a burst of writes settles into one reload.
 *  - **Focus is never taken.** The markdown preview focuses its scroller on
 *    open so the arrow keys work. Doing that here would put the keyboard
 *    inside the frame, where the panel's own ⌘W and Esc listeners cannot see
 *    it. Wheel and trackpad scroll the page; the keyboard stays in the app.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useEditor } from '../store';
import type { EditorTab } from '../store';
import { useLiveTabText } from '../live-text';
import {
  contentVersion,
  previewAvailable,
  previewStatsOf,
  previewUrlFor
} from './preview-url';
import { htmlSourceFor, refusalCells } from './source';
import type {
  HtmlPreviewSource,
  PreviewRefusal,
  PreviewStats
} from './source';
import './html.css';

/**
 * How long the bytes have to hold still before the frame is reloaded. An
 * agent rewriting a generated report writes it in several passes, and each
 * reload throws away where the reader was.
 */
export const PREVIEW_RELOAD_DEBOUNCE_MS = 250;

/**
 * How long after the frame's load event the handler's counts are read a
 * second time.
 *
 * The load event fires when the document and its subresources are done, so one
 * reading at that moment catches almost everything. It does not catch a
 * `loading="lazy"` image that scrolls into view, and it does not catch a nested
 * frame that starts its own requests late. The counts only ever go up within
 * one document, so the later reading is simply kept.
 */
export const PREVIEW_STATS_SETTLE_MS = 600;

export interface HtmlPreviewProps {
  tab: EditorTab;
  /**
   * Split mode. It does not change what the frame shows, because the frame
   * shows the saved file either way. It turns on the line that says so, and
   * it keeps this surface from asking for anything the source pane owns.
   */
  live: boolean;
}

/**
 * A value that waits for its input to stop changing, reset whenever `key`
 * changes so switching tabs is immediate rather than a quarter of a second
 * of the previous file.
 */
function useSettled(key: string, value: number, delayMs: number): number {
  const [settled, setSettled] = useState<{ key: string; value: number }>(() => ({
    key,
    value
  }));
  useEffect(() => {
    if (settled.key !== key) {
      setSettled({ key, value });
      return;
    }
    if (settled.value === value) return;
    const timer = setTimeout(() => {
      setSettled({ key, value });
    }, delayMs);
    return () => {
      clearTimeout(timer);
    };
  }, [key, value, settled, delayMs]);
  return settled.key === key ? settled.value : value;
}

/**
 * What main last answered, and which file it answered for.
 *
 * The path is part of the state so that a NEW version of the same file keeps
 * the page on screen until its replacement URL arrives, while a different
 * file does not. Clearing on every version change would blank the pane for
 * one round trip every time an agent touched the file, which is the flash
 * the debounce exists to avoid.
 */
interface FrameUrl {
  path: string;
  url: string | null;
  refusal: PreviewRefusal | null;
  /** The two halves of the key for reading this document's counts back. */
  token: string | null;
  generation: number;
}

const PENDING: FrameUrl = {
  path: '',
  url: null,
  refusal: null,
  token: null,
  generation: 0
};

/**
 * The handler's counts, and the frame URL they belong to.
 *
 * The URL is kept beside them so a reading that arrives after the frame moved
 * on is discarded rather than printed under the new page. Putting last
 * document's refusals under this one is the same class of defect this whole
 * channel exists to fix.
 */
interface FrameStats {
  url: string;
  value: PreviewStats | null;
}

export function HtmlPreview({ tab, live }: HtmlPreviewProps): React.JSX.Element {
  const available = previewAvailable();

  // The buffer, through the one hook the diff and the markdown preview also
  // use. It is not what the frame renders — the frame renders the file on
  // disk — but it is how this surface knows the two have drifted apart.
  const buffer = useLiveTabText(tab.id, tab.savedContents, live);
  const unsaved = live && buffer !== tab.savedContents;

  // One reload per burst of writes, and none at all for a rewrite that left
  // the bytes alone.
  const version = useSettled(
    tab.id,
    contentVersion(tab.savedContents),
    PREVIEW_RELOAD_DEBOUNCE_MS
  );

  const [frame, setFrame] = useState<FrameUrl>(PENDING);
  useEffect(() => {
    if (!available) return;
    let cancelled = false;
    const path = tab.path;
    void previewUrlFor({
      root: tab.repoPath,
      path,
      revision: version
    }).then((result) => {
      if (cancelled) return;
      setFrame(
        result.status === 'ok'
          ? {
              path,
              url: result.url,
              refusal: null,
              token: result.token,
              generation: result.generation
            }
          : {
              path,
              url: null,
              refusal: result.reason,
              token: null,
              generation: 0
            }
      );
    });
    return () => {
      cancelled = true;
    };
  }, [available, tab.repoPath, tab.path, version]);

  // An answer about another file is no answer about this one.
  const current = frame.path === tab.path ? frame : PENDING;

  // What main refused while serving this document. Null until the frame has
  // loaded and main has answered, and the line under the frame prints no
  // all-clear while it is null.
  const [stats, setStats] = useState<FrameStats | null>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (settleTimer.current !== null) clearTimeout(settleTimer.current);
    },
    []
  );

  const { url: frameUrl, token, generation } = current;
  const onFrameLoad = useCallback(() => {
    if (frameUrl === null || token === null) return;
    const read = (): void => {
      void previewStatsOf({ token, generation }).then((value) => {
        setStats((prev) => {
          // A null answer never replaces a confirmed one for the same frame.
          // The second reading exists to catch a count that arrived late, and
          // if the generation has moved on by then the earlier numbers are
          // still the true ones for the page on screen.
          const confirmed =
            prev !== null && prev.url === frameUrl && prev.value !== null;
          if (value === null && confirmed) return prev;
          return { url: frameUrl, value };
        });
      });
    };
    read();
    if (settleTimer.current !== null) clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(read, PREVIEW_STATS_SETTLE_MS);
  }, [frameUrl, token, generation]);

  // Counts belong to the document they were read for, and to no other.
  const shownStats =
    stats !== null && stats.url === frameUrl ? stats.value : null;

  const source = htmlSourceFor({
    loading: tab.loading,
    error: tab.error,
    truncated: tab.truncated,
    deleted: tab.deleted,
    text: tab.savedContents,
    url: current.url,
    refusal: current.refusal,
    available
  });

  return (
    <div className="htmlp">
      <div className="htmlp-stage">
        <HtmlStage source={source} tab={tab} onFrameLoad={onFrameLoad} />
      </div>
      {/*
        The bar is rendered even while it has nothing to say, which is the
        moment between the frame mounting and main answering. It is a fixed 26
        px, so holding the space keeps the counts from shoving the page upward
        when they arrive a few hundred milliseconds later.
      */}
      {source.kind === 'ready' || source.kind === 'blank' ? (
        <div className="htmlp-foot">
          <span className="htmlp-counts">
            {refusalCells(
              source.shape,
              // The blank state mounts no frame, so main is never asked and
              // never answers. There is no all-clear to print for a page that
              // was not served.
              source.kind === 'ready' ? shownStats : null
            ).map((cell) => (
              <span key={cell}>{cell}</span>
            ))}
          </span>
          {unsaved ? (
            <span className="htmlp-note">
              Showing the file as saved. Save to update it.
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ShowSourceButton({ tabId }: { tabId: string }): React.JSX.Element {
  return (
    <button
      type="button"
      className="btn btn-secondary"
      onClick={() => {
        useEditor.getState().setMode(tabId, 'file');
      }}
    >
      Show the source
    </button>
  );
}

function HtmlStage({
  source,
  tab,
  onFrameLoad
}: {
  source: HtmlPreviewSource;
  tab: EditorTab;
  /** Fired when the frame has finished loading, so its counts can be read. */
  onFrameLoad: () => void;
}): React.JSX.Element {
  if (source.kind === 'unavailable') {
    return (
      <div className="ed-state">
        <div className="ed-state-title">Preview is not available</div>
        <div className="ed-state-body">
          This build of Tortie cannot render a page. The file itself is fine,
          so read it as source.
        </div>
        <ShowSourceButton tabId={tab.id} />
      </div>
    );
  }
  if (source.kind === 'outside') {
    return (
      <div className="ed-state">
        <div className="ed-state-title">This page is outside the project</div>
        <div className="ed-state-body">
          A preview serves one project folder and nothing above it, so{' '}
          {tab.name} cannot be rendered from here. Read it as source instead.
        </div>
        <ShowSourceButton tabId={tab.id} />
      </div>
    );
  }
  if (source.kind === 'error') {
    return (
      <div className="ed-state">
        <div className="ed-state-title">Could not open this page</div>
        <div className="ed-state-body">{source.message}</div>
      </div>
    );
  }
  if (source.kind === 'missing') {
    return (
      <div className="ed-state">
        <div className="ed-state-title">This page is not on disk</div>
        <div className="ed-state-body">
          {tab.name} was moved or deleted, so there is nothing left to render.
        </div>
      </div>
    );
  }
  if (source.kind === 'too-large') {
    return (
      <div className="ed-state">
        <div className="ed-state-title">This page is too large to preview</div>
        <div className="ed-state-body">
          Tortie read the first 5 MB of {tab.name} and stopped there. One
          unclosed tag in the part that was cut would swallow the rest of the
          page, so a half-read file is not rendered.
        </div>
      </div>
    );
  }
  if (source.kind === 'blank') {
    return (
      <div className="ed-state">
        <div className="ed-state-title">Nothing to show without JavaScript</div>
        <div className="ed-state-body">
          {tab.name} builds itself with script, and script does not run in a
          preview. That is the point of the preview: it renders a page from a
          repository without letting the page do anything.
        </div>
        <ShowSourceButton tabId={tab.id} />
      </div>
    );
  }
  if (source.kind === 'loading') {
    return <div className="htmlp-loading" aria-label="Opening page" />;
  }

  return (
    <iframe
      className="htmlp-frame"
      title={`${tab.name}, rendered`}
      src={source.url}
      /*
       * The one event this surface takes from the frame, and it carries no
       * data. `load` fires on the parent's own element, in this process, and
       * says only that the frame finished. Nothing inside the frame chose to
       * send it and nothing inside the frame can put anything in it. What it
       * triggers is a read of main's own counters by token, which is why the
       * line under the frame can now report a refusal the page tried to hide.
       */
      onLoad={onFrameLoad}
      /*
       * THE control. It is empty on purpose and it must stay empty.
       *
       *   allow-same-origin  NEVER. With it, a probe inside the frame took
       *                      the parent's origin, read `window.parent.gmux`
       *                      and got back "object", and read 9,196 bytes of
       *                      /etc/passwd. `wc -c` on that file agrees.
       *   allow-scripts      NEVER. Its absence is what refuses
       *                      `<meta http-equiv="refresh">`, and Chromium
       *                      names the sandbox in the console when it does.
       *
       * Adding either one is not a widening of a convenience. It is the
       * difference between a page from a cloned repository being a document
       * and being code running next to the user's source, their credentials
       * and their sessions. `sandbox.test.ts` asserts this literal string
       * for exactly that reason.
       */
      sandbox=""
    />
  );
}
