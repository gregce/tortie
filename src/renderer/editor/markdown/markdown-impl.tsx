/**
 * Markdown — the HEAVY module. Never import this statically from anything the
 * shell loads at boot: `markdown-loader.ts` dynamic-imports it on the first
 * .md preview, so vite splits react-markdown + the remark/rehype stack
 * (~105 KB gzip, most of it rehype-raw) into its own chunk. Same shape, and
 * the same reason, as monaco-loader.ts / monaco-impl.ts.
 *
 * Code fences are coloured by the Shiki highlighter gmux ALREADY OWNS:
 * @pierre/diffs re-exports its shared singleton, so a TypeScript block in a
 * README and the same code in a diff resolve the same token to the same hue,
 * with no second highlighter, no second theme registration and no drift.
 *
 * No HTML string is ever produced — react-markdown builds React elements from
 * the mdast, so this renderer has no `dangerouslySetInnerHTML` anywhere near
 * a window that holds a filesystem bridge. Sanitization (pipeline.ts) is
 * defence in depth rather than the only wall.
 */

import React, { useMemo } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getSharedHighlighter } from '@pierre/diffs';
import type { Components } from 'react-markdown';
import type { Element as HastElement, Node as HastNode } from 'hast';
import type { HighlighterGeneric } from '@shikijs/types';
import { Codicon } from '../../icons';
import { GMUX_THEME_NAME } from '../../pierre/theme-bridge';
import { markdownRehypePlugins } from './pipeline';
import { resolveAssetSrc, resolveLinkPath } from './asset-url';

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
}

export function MarkdownDocument({
  source,
  filePath,
  rootPath,
  highlighter,
  onOpenFile
}: MarkdownDocumentProps): React.JSX.Element {
  const rehypePlugins = useMemo(
    () => markdownRehypePlugins(highlighter, GMUX_THEME_NAME),
    [highlighter]
  );

  const components = useMemo<Components>(() => {
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

      input({ type, checked, ...rest }) {
        // GFM task lists. Read-only: the preview renders the file, it does
        // not edit it — Source mode is the edit path.
        //
        // NOT an <input>: Chromium ignores `accent-color` on a DISABLED
        // checkbox, so the OS widget painted itself grey-on-grey (a #757575
        // fill with a #3B3B3B tick, and unchecked boxes at 1.5:1 against the
        // canvas) — the one element that made this preview read as a web page
        // rather than as gmux. A box gmux draws, with a codicon tick.
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
      },

      table({ children, ...rest }) {
        // Wide tables scroll inside their own box; the document never does.
        return (
          <div className="md-table-scroll">
            <table {...rest}>{children}</table>
          </div>
        );
      }
    };
  }, [filePath, rootPath, onOpenFile]);

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
