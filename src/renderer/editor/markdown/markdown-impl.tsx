/**
 * Markdown — the HEAVY module. Never import this statically from anything the
 * shell loads at boot: `markdown-loader.ts` dynamic-imports it on the first
 * .md preview, so vite splits react-markdown + the remark/rehype stack
 * (~105 KB gzip, most of it rehype-raw) and, since Phase 255, markdown-it
 * (44 KB gzip) into its own chunk. Same shape, and the same reason, as
 * monaco-loader.ts / monaco-impl.ts.
 *
 * PHASE 255: THE FILE PREVIEW PAINTS AS YOU ARRIVE. It used to render the
 * whole document in one synchronous pass — 2,298 ms before the first paint
 * of the 2.56 MB twin, one 1,901 ms task the page could not interrupt —
 * because micromark was the whole cost (research 117 §2.2). Now the document
 * is CUT at blank lines where a cut cannot change the page (window-scan.ts),
 * each chunk is parsed by markdown-it and handed to the same sanitizer, the
 * same Shiki step and the same components map (chunk-parse.ts), the first
 * window is drawn in the commit the preview mounts in, and the rest streams
 * through idle callbacks. Every chunk mounts as a FRAGMENT, so a table's
 * scroller and a fence stay DIRECT children of `.md-content`, which is the
 * DOM shape the wide-block rules key on (conformance:wideblocks). A
 * document that defines a footnote is the one shape that cannot be cut, and
 * it keeps the old remark render exactly as it was.
 *
 * Code fences are coloured by the Shiki highlighter gmux ALREADY OWNS:
 * @pierre/diffs re-exports its shared singleton, so a TypeScript block in a
 * README and the same code in a diff resolve the same token to the same hue,
 * with no second highlighter, no second theme registration and no drift.
 *
 * No HTML ever reaches the DOM as a string — both paths build React elements
 * from a sanitized tree (markdown-it's HTML string is parser input to parse5,
 * never output), so this renderer has no `dangerouslySetInnerHTML` anywhere
 * near a window that holds a filesystem bridge. Sanitization (pipeline.ts)
 * is defence in depth rather than the only wall.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Fragment, jsx, jsxs } from 'react/jsx-runtime';
import Markdown from 'react-markdown';
import { toJsxRuntime } from 'hast-util-to-jsx-runtime';
import type MarkdownIt from 'markdown-it';
import remarkGfm from 'remark-gfm';
import { getSharedHighlighter } from '@pierre/diffs';
import type { Components } from 'react-markdown';
import type { Element as HastElement, Node as HastNode } from 'hast';
import type { HighlighterGeneric } from '@shikijs/types';
import { Codicon } from '../../icons';
import { GMUX_THEME_NAME } from '../../pierre/theme-bridge';
import { answerRehypePlugins, markdownRehypePlugins } from './pipeline';
import { resolveAssetSrc, resolveLinkPath } from './asset-url';
import {
  chunkToHast,
  createChunkParser,
  createChunkProcessor,
  type ChunkProcessor
} from './chunk-parse';
import {
  WINDOW_BATCH_CHARS,
  WINDOW_BATCH_CHUNKS,
  WINDOW_INITIAL_CHARS,
  WINDOW_INITIAL_CHUNKS,
  chunkTexts,
  hasFootnotes,
  scanChunks,
  windowEnd
} from './window-scan';

export type MarkdownHighlighter = HighlighterGeneric<string, string>;

// ---------------------------------------------------------------------------
// Highlighter: scan the fences, attach those languages, then render SYNC
// ---------------------------------------------------------------------------

/** ```lang … — the infostring's first word, which is what Shiki wants. */
const FENCE_RE = /^[ \t]{0,3}(?:`{3,}|~{3,})[ \t]*([A-Za-z0-9_+#.-]+)/gm;

/** Distinct fence infostrings in a document (cheap; runs per source change). */
export function fenceLanguages(source: string): string[] {
  const found = new Set<string>();
  for (const m of source.matchAll(FENCE_RE)) {
    const lang = m[1]?.toLowerCase();
    if (lang !== undefined && lang !== '') found.add(lang);
  }
  return [...found];
}

/**
 * Load the shared highlighter with this document's languages attached.
 *
 * Languages are attached ONE AT A TIME on purpose: the shared highlighter
 * attaches incrementally, and a README that fences ```lolcode must colour its
 * other nine blocks rather than throwing the whole document to plain text.
 * Returns null when even the base highlighter is unavailable — fences then
 * render unhighlighted, which is a degradation, not a failure.
 */
export async function prepareHighlighter(
  source: string
): Promise<MarkdownHighlighter | null> {
  let highlighter: MarkdownHighlighter;
  try {
    highlighter = (await getSharedHighlighter({
      themes: [GMUX_THEME_NAME],
      langs: ['text']
    })) as MarkdownHighlighter;
  } catch (err) {
    console.error('gmux: markdown highlighter unavailable', err);
    return null;
  }
  for (const lang of fenceLanguages(source)) {
    try {
      await getSharedHighlighter({ themes: [GMUX_THEME_NAME], langs: [lang] });
    } catch {
      /* unknown infostring — that fence falls back to plain text */
    }
  }
  return highlighter;
}

// ---------------------------------------------------------------------------
// Heading ids (anchor links + the preview's heading ruler)
// ---------------------------------------------------------------------------

function hastText(node: HastNode | undefined): string {
  if (node === undefined) return '';
  if (node.type === 'text') return (node as unknown as { value: string }).value;
  const children = (node as { children?: HastNode[] }).children;
  return children === undefined ? '' : children.map(hastText).join('');
}

/** `md-` prefixed so a heading id can never collide with app chrome. */
export function headingSlug(text: string): string {
  const base = text
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}\s-]/gu, '')
    .trim()
    .replace(/\s+/g, '-');
  return `md-${base === '' ? 'section' : base}`;
}

// ---------------------------------------------------------------------------
// Components both renderers share
// ---------------------------------------------------------------------------

/**
 * GFM task lists. Read-only: the preview renders the file, it does not edit
 * it — Source mode is the edit path. The answer renderer reuses it because
 * an agent's answer is not editable either.
 *
 * NOT an <input>: Chromium ignores `accent-color` on a DISABLED checkbox,
 * so the OS widget painted itself grey-on-grey (a #757575 fill with a
 * #3B3B3B tick, and unchecked boxes at 1.5:1 against the canvas) — the one
 * element that made the preview read as a web page rather than as gmux. A
 * box gmux draws, with a codicon tick.
 */
function readOnlyTaskInput({
  type,
  checked,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement>): React.JSX.Element {
  if (type !== 'checkbox') return <input type={type} {...rest} />;
  const on = checked === true;
  return (
    <span
      className={`md-task${on ? ' checked' : ''}`}
      role="checkbox"
      aria-checked={on}
      aria-disabled="true"
    >
      {on ? <Codicon name="check" size={11} /> : null}
    </span>
  );
}

/** Wide tables scroll inside their own box; the document never does. */
function scrollingTable({
  children,
  ...rest
}: React.TableHTMLAttributes<HTMLTableElement>): React.JSX.Element {
  return (
    <div className="md-table-scroll">
      <table {...rest}>{children}</table>
    </div>
  );
}

/**
 * The file preview's components map — headings with ids, links routed to the
 * system browser or to another file, images through the asset protocol, the
 * read-only task box and the scrolling table. Both of the preview's paths
 * hand their tree to exactly this map.
 */
export function previewComponents(
  filePath: string,
  rootPath: string,
  onOpenFile: (absPath: string) => void
): Components {
  const heading =
    (level: 1 | 2 | 3 | 4 | 5 | 6) =>
    ({
      node,
      children,
      ...rest
    }: React.HTMLAttributes<HTMLHeadingElement> & {
      node?: HastElement;
    }): React.JSX.Element => {
      const Tag = `h${level}` as const;
      return (
        <Tag
          {...rest}
          id={headingSlug(hastText(node))}
          data-md-heading={level}
        >
          {children}
        </Tag>
      );
    };

  return {
    h1: heading(1),
    h2: heading(2),
    h3: heading(3),
    h4: heading(4),
    h5: heading(5),
    h6: heading(6),

    a({ href, children, ...rest }) {
      const target = href ?? '';
      // In-document anchor: let the browser scroll the preview pane.
      if (target.startsWith('#')) {
        return (
          <a {...rest} href={target}>
            {children}
          </a>
        );
      }
      if (/^https?:\/\//i.test(target)) {
        return (
          <a
            {...rest}
            href={target}
            title={target}
            onClick={(e) => {
              // Never navigate the renderer — main's window-open handler
              // sends it to the system browser (and will-navigate is the
              // backstop if anything slips through).
              e.preventDefault();
              window.open(target, '_blank', 'noopener,noreferrer');
            }}
          >
            {children}
          </a>
        );
      }
      const abs = resolveLinkPath(target, filePath, rootPath);
      if (abs === null) {
        return <span {...rest}>{children}</span>;
      }
      return (
        <a
          {...rest}
          href={target}
          title={abs}
          onClick={(e) => {
            e.preventDefault();
            onOpenFile(abs);
          }}
        >
          {children}
        </a>
      );
    },

    img({ src, alt, ...rest }) {
      const resolved = resolveAssetSrc(
        typeof src === 'string' ? src : '',
        filePath,
        rootPath
      );
      if (resolved.kind === 'remote') {
        // Deliberate: gmux opens arbitrary checked-out repositories, and a
        // README badge is exactly the shape of a tracking pixel.
        return (
          <span className="md-blocked" title={resolved.url}>
            {alt !== undefined && alt !== '' ? alt : 'Remote image'} — not
            loaded
          </span>
        );
      }
      if (resolved.kind === 'unsupported') {
        return (
          <span className="md-blocked">
            {alt !== undefined && alt !== '' ? alt : 'Image'} — not loaded
          </span>
        );
      }
      return (
        <img
          {...rest}
          src={resolved.url}
          alt={alt ?? ''}
          loading="lazy"
          className="md-img"
        />
      );
    },

    input: readOnlyTaskInput,
    table: scrollingTable
  };
}

// ---------------------------------------------------------------------------
// PHASE 255 — the windowed path: draw the first window, stream the rest
// ---------------------------------------------------------------------------

/**
 * What the preview has drawn so far, reported upward so the shell can say
 * when the page is complete (`data-md-stream`) and re-measure the heading
 * ruler as chunks land. It CARRIES THE SOURCE it drew: a report can arrive
 * from an effect after the source has already changed, and a reader trusting
 * a bare "done" between a commit and its effects gets the PREVIOUS document's
 * completion (the stale-completion race research 117 §8 caught). Comparing
 * the carried source by identity is what keeps the flag honest.
 */
export interface RenderProgress {
  source: string;
  drawn: number;
  total: number;
}

/**
 * One chunk to elements: chunk-parse.ts's tree through the exact
 * `toJsxRuntime` call react-markdown makes over its own tree
 * (react-markdown/lib/index.js `post`), so the components map receives the
 * same props on both paths.
 */
export function renderChunk(
  md: MarkdownIt,
  processor: ChunkProcessor,
  text: string,
  components: Components
): React.ReactNode {
  return toJsxRuntime(chunkToHast(md, processor, text), {
    Fragment,
    components: components as never,
    ignoreInvalidStyle: true,
    jsx,
    jsxs,
    passKeys: true,
    passNode: true
  });
}

/**
 * One chunk, held by `React.memo` on its text. This is the one cache research
 * 117 §5 found worth its memory: while the tab lives, a Split-mode keystroke
 * or a watcher refresh re-parses only the chunks whose text changed, because
 * every other chunk's text is byte-identical and the memo skips it.
 *
 * A FRAGMENT, never an element: `.md-table-scroll` and `pre` must stay
 * direct children of `.md-content` for the wide-block rules, and
 * `display: contents` is not an escape hatch, because those rules match the
 * DOM and not the boxes.
 */
const MarkdownChunk = React.memo(function MarkdownChunk({
  text,
  render
}: {
  text: string;
  render: (text: string) => React.ReactNode;
}): React.JSX.Element {
  return <>{render(text)}</>;
});

interface WindowedMarkdownProps {
  source: string;
  components: Components;
  highlighter: MarkdownHighlighter | null;
  onRenderProgress?: ((progress: RenderProgress) => void) | undefined;
}

const WindowedMarkdown = React.memo(function WindowedMarkdown({
  source,
  components,
  highlighter,
  onRenderProgress
}: WindowedMarkdownProps): React.JSX.Element {
  const md = useMemo(createChunkParser, []);
  const render = useMemo(() => {
    const processor = createChunkProcessor(highlighter, GMUX_THEME_NAME);
    return (text: string): React.ReactNode =>
      renderChunk(md, processor, text, components);
  }, [md, highlighter, components]);

  const plan = useMemo(() => scanChunks(source), [source]);
  const texts = useMemo(() => chunkTexts(source, plan), [source, plan]);

  // NOT reset when the source changes: a keystroke must not restream the
  // tail. A DIFFERENT document starts from the first window because
  // MarkdownDocument keys this component by path, which remounts it.
  const [drawn, setDrawn] = useState(() =>
    windowEnd(plan.chunks, 0, WINDOW_INITIAL_CHUNKS, WINDOW_INITIAL_CHARS)
  );
  const shown = Math.min(drawn, texts.length);

  useEffect(() => {
    onRenderProgress?.({ source, drawn: shown, total: texts.length });
    if (shown >= texts.length) return;
    const step = (): void =>
      setDrawn((d) =>
        windowEnd(
          plan.chunks,
          Math.min(d, plan.chunks.length),
          WINDOW_BATCH_CHUNKS,
          WINDOW_BATCH_CHARS
        )
      );
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(step, { timeout: 200 });
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(step, 16);
    return () => window.clearTimeout(id);
  }, [shown, texts, plan, source, onRenderProgress]);

  return (
    <>
      {texts.slice(0, shown).map((text, i) => (
        <MarkdownChunk key={i} text={text} render={render} />
      ))}
    </>
  );
});

// ---------------------------------------------------------------------------
// Document
// ---------------------------------------------------------------------------

export interface MarkdownDocumentProps {
  source: string;
  /** Absolute path of the file being rendered (relative refs hang off it). */
  filePath: string;
  /** Absolute project root (a leading `/` in a README means repo root). */
  rootPath: string;
  highlighter: MarkdownHighlighter | null;
  /** Clicking a relative link to another file in the repo. */
  onOpenFile: (absPath: string) => void;
  /** How much of the document is drawn (see RenderProgress). */
  onRenderProgress?: (progress: RenderProgress) => void;
}

export function MarkdownDocument({
  source,
  filePath,
  rootPath,
  highlighter,
  onOpenFile,
  onRenderProgress
}: MarkdownDocumentProps): React.JSX.Element {
  const rehypePlugins = useMemo(
    () => markdownRehypePlugins(highlighter, GMUX_THEME_NAME),
    [highlighter]
  );

  // A document that defines a footnote cannot be cut (window-scan.ts), so it
  // keeps the whole-document remark render below, which is why a large one
  // stays deferred (large-prose.ts). Everything else is windowed, at any size.
  const whole = useMemo(() => hasFootnotes(source), [source]);

  // The whole-document render is synchronous, so by the time effects run it
  // is fully drawn; the report carries the source for RenderProgress's reason.
  useEffect(() => {
    if (whole) onRenderProgress?.({ source, drawn: 1, total: 1 });
  }, [whole, source, onRenderProgress]);

  const components = useMemo(
    () => previewComponents(filePath, rootPath, onOpenFile),
    [filePath, rootPath, onOpenFile]
  );

  if (!whole) {
    return (
      <WindowedMarkdown
        key={filePath}
        source={source}
        components={components}
        highlighter={highlighter}
        onRenderProgress={onRenderProgress}
      />
    );
  }

  return (
    <Markdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={rehypePlugins}
      components={components}
    >
      {source}
    </Markdown>
  );
}

// ---------------------------------------------------------------------------
// An agent's answer (Phase 137.1) — the Catch Me Up page's renderer
// ---------------------------------------------------------------------------

export interface AnswerMarkdownProps {
  /** The agent's closing answer, already redacted by the store. */
  source: string;
  highlighter: MarkdownHighlighter | null;
}

/**
 * The agent's closing answer as markdown, for the Catch Me Up page.
 *
 * The same react-markdown, the same remark-gfm and the same sanitize schema
 * as the preview above, through `answerRehypePlugins`, which leaves
 * `rehype-raw` OUT: raw HTML in an answer is dropped before it can become a
 * node, and the sanitizer stays in the chain behind that. The components map
 * is smaller than the preview's on purpose:
 *
 *  - A link opens through the existing external-open bridge, being
 *    `window.open` routed by main's window-open handler to the system
 *    browser. That is the one way any link leaves this window. A relative
 *    link renders inert, because an answer has no file to hang it off, and
 *    an in-page anchor renders inert because the page it names is not this
 *    one. A `javascript:` href never reaches this component at all — the
 *    sanitizer strips the attribute and the link arrives with no href.
 *  - An image never loads. An answer is an agent's bytes, and a remote
 *    image in one is exactly the shape of a tracking pixel, so the alt text
 *    is drawn instead, the way the preview treats remote images.
 *  - Task-list checkboxes reuse the preview's read-only box.
 *  - Headings render as plain heading tags with no anchor ids, because the
 *    heading ruler and its slugs belong to the file preview.
 */
export function AnswerMarkdown({
  source,
  highlighter
}: AnswerMarkdownProps): React.JSX.Element {
  const rehypePlugins = useMemo(
    () => answerRehypePlugins(highlighter, GMUX_THEME_NAME),
    [highlighter]
  );

  const components = useMemo<Components>(() => {
    return {
      a({ href, children, ...rest }) {
        const target = href ?? '';
        if (/^https?:\/\//i.test(target)) {
          return (
            <a
              {...rest}
              href={target}
              title={target}
              onClick={(e) => {
                // Never navigate the renderer — main's window-open handler
                // sends it to the system browser (and will-navigate is the
                // backstop if anything slips through).
                e.preventDefault();
                window.open(target, '_blank', 'noopener,noreferrer');
              }}
            >
              {children}
            </a>
          );
        }
        // Relative links, anchors, and anything whose scheme the sanitizer
        // stripped: the words stay, the link does not.
        return <span {...rest}>{children}</span>;
      },

      img({ alt }) {
        return (
          <span className="md-blocked">
            {alt !== undefined && alt !== '' ? alt : 'Image'} — not loaded
          </span>
        );
      },

      input: readOnlyTaskInput,
      table: scrollingTable
    };
  }, []);

  return (
    <Markdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={rehypePlugins}
      components={components}
    >
      {source}
    </Markdown>
  );
}
