/**
 * What an HTML tab should render, decided in one pure function.
 *
 * Same shape as src/renderer/editor/image/source.ts, and for the same
 * reason: the branch lives outside the component so the six answers can be
 * tested without a DOM, and so the component cannot grow a second opinion
 * about what "too large" or "nearly empty" means.
 *
 * The five states the image viewer has are here unchanged. HTML adds a
 * sixth, `blank`, and it is the most important one in the file. Research 39
 * part 2 stripped the scripts, the styles and the head content from all
 * 1,052 HTML files tracked in 233 repositories on this machine and measured
 * the text that survived: 379 files were left with under 40 characters and
 * another 281 with under 400. A script-free preview therefore renders blank
 * or nearly blank for 63% of them. That is not a bug to fix later. It is
 * what the design costs, and the honest response is to say so in plain
 * words rather than show an empty white rectangle.
 */

import type { PreviewRefusal, PreviewStats } from '@shared/preview-types';

/**
 * Why main refused to mint a URL. Declared once in `@shared/preview-types`,
 * because main writes these strings and this file is what turns each one into
 * a sentence the reader sees. Re-exported here so the component keeps
 * importing its vocabulary from one module.
 */
export type { PreviewRefusal, PreviewStats } from '@shared/preview-types';

/**
 * Under this many characters of surviving text, with nothing to draw, the
 * page has nothing to show. 40 is research 39 part 2's own threshold, kept
 * so the copy in the app and the number in the research mean the same thing.
 */
export const BLANK_TEXT_CHARS = 40;

/** What is in the file, as far as a preview is concerned. */
export interface HtmlStatic {
  /** Characters of text left after script, style, head and tags are gone. */
  textLength: number;
  /** `<script>` elements. None of them will run. */
  scripts: number;
  /** Images, stylesheets, fonts and media on a remote host. None load. */
  remoteResources: number;
  /** `<a href="http…">`. Inert in this phase, with the address in a tooltip. */
  externalLinks: number;
  /** There is something to draw even with no text worth counting. */
  hasVisual: boolean;
}

export type HtmlPreviewSource =
  /** The file, or the project's preview token, has not arrived yet. */
  | { kind: 'loading' }
  | { kind: 'ready'; url: string; shape: HtmlStatic }
  /** Rendered, and nearly nothing was in it. The 63% case. */
  | { kind: 'blank'; shape: HtmlStatic }
  /** Hit the editor's 5 MB text cap. Half a document is worse than none. */
  | { kind: 'too-large' }
  | { kind: 'missing' }
  | { kind: 'error'; message: string }
  /** Main resolved the real path and it is not inside the real root. */
  | { kind: 'outside' }
  /** The preview channel is not in this build (feature detection). */
  | { kind: 'unavailable' };

export interface HtmlTabView {
  /** The read has not answered yet. */
  loading: boolean;
  /** Friendly load failure from the text path, when there was one. */
  error: string | null;
  /** The text read hit the 5 MB cap. */
  truncated: boolean;
  /** The watcher says the file is gone. */
  deleted: boolean;
  /** The file as saved on disk. This is what the handler will serve. */
  text: string;
  /** The frame URL from main. Null while the round trip is in flight. */
  url: string | null;
  /** Main's answer when it would not mint one. Null when it did. */
  refusal: PreviewRefusal | null;
  /** `window.gmux.preview` exists. */
  available: boolean;
}

/**
 * Blocks that contribute nothing a reader would see. `<head>` goes because
 * its `<title>` and its `<style>` text would otherwise be counted as body
 * text, which is the mistake the static-render option made and one of the
 * reasons it was rejected (research 39 §2.8).
 */
const COMMENTS = /<!--[\s\S]*?-->/g;
const SCRIPT_BLOCKS = /<script\b[\s\S]*?<\/script\s*>/gi;
const STYLE_BLOCKS = /<style\b[\s\S]*?<\/style\s*>/gi;
const HEAD_BLOCK = /<head\b[\s\S]*?<\/head\s*>/gi;
const TAGS = /<[^>]*>/g;
const ENTITIES = /&(?:#\d+|#x[0-9a-f]+|[a-z][a-z0-9]*);/gi;

/**
 * A remote address, as it can appear in an attribute or in a stylesheet.
 *
 * `(?:https?:)?//` and not `https?:`. A protocol-relative address, spelled
 * `//cdn.example.com/x.css`, carries no scheme and inherits the document's,
 * which inside the frame is `gmux-preview:`. It resolves to another host, the
 * response policy refuses it, and the file does not load. Counting only
 * `https:` missed all three of them on a fixture page and reported one script
 * where three references were refused.
 */
const REMOTE_ADDRESS = String.raw`(?:https?:)?//`;

const SCRIPT_TAG = /<script\b/gi;
const EXTERNAL_ANCHOR = new RegExp(
  String.raw`<a\b[^>]*\bhref\s*=\s*["']?\s*` + REMOTE_ADDRESS,
  'gi'
);
const REMOTE_RESOURCE = new RegExp(
  String.raw`<(?:img|link|iframe|source|video|audio|embed|object|track|script)\b[^>]*\b(?:src|href|data|poster|srcset)\s*=\s*["']?\s*` +
    REMOTE_ADDRESS,
  'gi'
);
const REMOTE_IMPORT = new RegExp(
  String.raw`@import\s+(?:url\(\s*)?["']?\s*` + REMOTE_ADDRESS,
  'gi'
);
const VISUAL_TAG = /<(?:svg|img|picture|video|table|figure|hr)\b/i;

function countOf(text: string, pattern: RegExp): number {
  return text.match(pattern)?.length ?? 0;
}

/**
 * Read the shape of a page without parsing it.
 *
 * These numbers drive one line of copy under the frame and the choice
 * between the `ready` and `blank` states. They are NOT a security control
 * and nothing is decided by them that could let a byte out of the machine:
 * every refusal they describe is made by the response header main sets, and
 * by the empty sandbox attribute on the frame. A regular expression over
 * HTML is approximate, and it is allowed to be approximate here, because the
 * worst outcome is a count that is one out. The place where a real parse is
 * required is the anchor rewrite in main, which changes the bytes served.
 */
export function staticShapeOf(html: string): HtmlStatic {
  const withoutComments = html.replace(COMMENTS, ' ');
  const body = withoutComments
    .replace(SCRIPT_BLOCKS, ' ')
    .replace(STYLE_BLOCKS, ' ')
    .replace(HEAD_BLOCK, ' ');
  const text = body
    .replace(TAGS, ' ')
    .replace(ENTITIES, 'x')
    .replace(/\s+/g, ' ')
    .trim();
  return {
    textLength: text.length,
    scripts: countOf(withoutComments, SCRIPT_TAG),
    remoteResources:
      countOf(withoutComments, REMOTE_RESOURCE) +
      countOf(withoutComments, REMOTE_IMPORT),
    externalLinks: countOf(withoutComments, EXTERNAL_ANCHOR),
    hasVisual: VISUAL_TAG.test(body)
  };
}

/**
 * Main's refusal, in this surface's vocabulary.
 *
 * `not-previewable` is the odd one. It means the panel offered Preview for a
 * file the handler will not serve, which is a disagreement between two lists
 * that are supposed to be one list. It is reported as an error rather than
 * as a state of its own, because it is a defect and not a situation the user
 * has got themselves into.
 */
function refusedState(reason: PreviewRefusal): HtmlPreviewSource {
  switch (reason) {
    case 'missing':
      return { kind: 'missing' };
    case 'too-large':
      return { kind: 'too-large' };
    case 'outside-root':
      return { kind: 'outside' };
    case 'not-previewable':
      return {
        kind: 'error',
        message: 'Tortie does not render this kind of file.'
      };
  }
}

/** Decide what the viewer shows for one tab. */
export function htmlSourceFor(view: HtmlTabView): HtmlPreviewSource {
  if (!view.available) return { kind: 'unavailable' };
  if (view.error !== null) return { kind: 'error', message: view.error };
  if (view.deleted) return { kind: 'missing' };
  // A truncated HTML file is refused rather than rendered. One unclosed tag
  // swallows the rest of the page, so half a document does not look like a
  // boundary, it looks like the renderer is broken. Same rule the SVG
  // preview already follows.
  if (view.truncated) return { kind: 'too-large' };
  if (view.refusal !== null) return refusedState(view.refusal);
  if (view.loading && view.text === '') return { kind: 'loading' };
  if (view.url === null) return { kind: 'loading' };

  const shape = staticShapeOf(view.text);
  if (shape.textLength < BLANK_TEXT_CHARS && !shape.hasVisual) {
    return { kind: 'blank', shape };
  }
  return { kind: 'ready', url: view.url, shape };
}

/** "1 file" / "3 files", so each cell below reads as English. */
function count(n: number, one: string, many: string): string {
  return `${String(n)} ${n === 1 ? one : many}`;
}

/** The all-clear, which may only be printed when main has confirmed it. */
export const NOTHING_BLOCKED = 'Nothing in this page was blocked.';

/**
 * The line under the frame: what this preview did not do, counted.
 *
 * ## Where each number comes from, because it is two places and not one
 *
 * Some refusals are made by Chromium inside the frame and never reach the main
 * process at all. A `<script>` does not run and a remote address is refused by
 * the response policy, so no request is sent and main sees nothing. Those can
 * only be counted from the source text, which is what `shape` is.
 *
 * Every other refusal is made by the handler in main, and it is invisible from
 * this process. The bytes never arrive, no event fires here, and no pattern
 * over the source can tell that `img/logo.png` is a symlink out of the project
 * or that it is not on disk. Those come from `stats`.
 *
 * ## Why `stats` is allowed to be null, and what that changes
 *
 * Null means main did not confirm the counts. It happens before the frame has
 * loaded, on an older preload, and when a second preview tab on the same
 * project has taken the shared counter. In that state the cells from `shape`
 * are still printed, because they are true on their own, and THE ALL-CLEAR IS
 * NOT PRINTED. That rule is the whole fix. The sentence "Nothing in this page
 * was blocked" was measured on screen three times while the handler had
 * refused 501 requests, 12 subresources and a whole document, because the line
 * was written from the source text alone and the source text cannot see any of
 * that.
 */
export function refusalCells(
  shape: HtmlStatic,
  stats: PreviewStats | null
): string[] {
  const cells: string[] = [];
  if (shape.scripts > 0) {
    cells.push(`${count(shape.scripts, 'script', 'scripts')} did not run`);
  }
  if (shape.remoteResources > 0) {
    cells.push(
      `${count(shape.remoteResources, 'remote file was', 'remote files were')} not loaded`
    );
  }
  if (stats !== null) {
    if (stats.refusedOutsideRoot > 0) {
      cells.push(
        `${count(stats.refusedOutsideRoot, 'file', 'files')} outside the project ${stats.refusedOutsideRoot === 1 ? 'was' : 'were'} not loaded`
      );
    }
    if (stats.refusedType > 0) {
      cells.push(
        `${count(stats.refusedType, 'file was', 'files were')} not loaded, because Tortie does not serve that kind of file`
      );
    }
    if (stats.refusedMissing > 0) {
      cells.push(
        `${count(stats.refusedMissing, 'file was', 'files were')} not found in this project`
      );
    }
    if (stats.refusedUnreadable > 0) {
      cells.push(
        `${count(stats.refusedUnreadable, 'file was', 'files were')} too large or too deeply nested to render`
      );
    }
    if (stats.refusedBudget > 0) {
      cells.push(
        `${count(stats.refusedBudget, 'request was', 'requests were')} refused, because this page asked for too many`
      );
    }
  }
  // The handler's own anchor count is a parse and the pattern above is not, so
  // it is the better number whenever main actually served the document. When
  // main refused the document there is nothing for it to have counted, and the
  // pattern is the only answer available.
  const links =
    stats !== null && stats.served > 0 ? stats.inertLinks : shape.externalLinks;
  if (links > 0) {
    cells.push(
      `${count(links, 'external link is', 'external links are')} not clickable`
    );
  }
  if (cells.length > 0) return cells;
  return stats === null ? [] : [NOTHING_BLOCKED];
}
