/**
 * Which of the seven states an HTML tab is in, and what the line under the
 * frame says (Phase 20.5).
 *
 * The state worth the most attention is `blank`. Research 39 part 2 measured
 * 1,052 HTML files in 233 repositories and found that 63% of them render
 * blank or nearly blank once script is removed. A preview that opens empty
 * looks broken rather than safe, so the empty case is a state with its own
 * copy and not an accident of an empty frame.
 */

import { describe, expect, it } from 'vitest';
import {
  BLANK_TEXT_CHARS,
  NOTHING_BLOCKED,
  htmlSourceFor,
  refusalCells,
  staticShapeOf
} from '../source';
import type { HtmlStatic, HtmlTabView, PreviewStats } from '../source';

const URL = 'gmux-preview://abc123/docs/index.html?v=1f4a09c3';

/** A page whose source text holds nothing the renderer can count by itself. */
const NOTHING: HtmlStatic = {
  textLength: 900,
  scripts: 0,
  remoteResources: 0,
  externalLinks: 0,
  hasVisual: true
};

/** Main answered, and it refused nothing. */
const CLEAN: PreviewStats = {
  served: 0,
  refusedOutsideRoot: 0,
  refusedType: 0,
  refusedBudget: 0,
  refusedMissing: 0,
  refusedUnreadable: 0,
  inertLinks: 0
};

const base: HtmlTabView = {
  loading: false,
  error: null,
  truncated: false,
  deleted: false,
  text:
    '<html><body><h1>Coverage report</h1>' +
    '<p>Every statement in the suite is accounted for, and this paragraph is ' +
    'long enough that no threshold in the state machine is close.</p>' +
    '</body></html>',
  url: URL,
  refusal: null,
  available: true
};

describe('the seven states', () => {
  it('renders a page that has something in it', () => {
    const source = htmlSourceFor(base);
    expect(source.kind).toBe('ready');
    if (source.kind !== 'ready') return;
    expect(source.url).toBe(URL);
  });

  it('says so when the channel is not in this build', () => {
    expect(htmlSourceFor({ ...base, available: false }).kind).toBe(
      'unavailable'
    );
  });

  it("shows main's refusals in this surface's own words", () => {
    // Main resolves the real path of the request and of the root, so these
    // four answers are the authoritative ones. The viewer maps them and adds
    // no opinion of its own.
    const refused = (reason: HtmlTabView['refusal']): string =>
      htmlSourceFor({ ...base, url: null, refusal: reason }).kind;
    expect(refused('outside-root')).toBe('outside');
    expect(refused('missing')).toBe('missing');
    expect(refused('too-large')).toBe('too-large');
    // A disagreement between the panel's list and the handler's list is a
    // defect, so it reads as one rather than as a state of the file.
    expect(refused('not-previewable')).toBe('error');
  });

  it('carries a load failure through unchanged', () => {
    const source = htmlSourceFor({ ...base, error: 'permission denied' });
    expect(source).toEqual({ kind: 'error', message: 'permission denied' });
  });

  it('reports a deleted file rather than rendering a stale one', () => {
    expect(htmlSourceFor({ ...base, deleted: true }).kind).toBe('missing');
  });

  it('refuses a truncated file, because half a page is worse than none', () => {
    // One unclosed tag in the part that was cut swallows the rest of the
    // document, so this is a refusal and not a partial render.
    expect(htmlSourceFor({ ...base, truncated: true }).kind).toBe('too-large');
  });

  it('waits while the read is in flight', () => {
    expect(htmlSourceFor({ ...base, loading: true, text: '' }).kind).toBe(
      'loading'
    );
  });

  it('waits while the project token is still resolving', () => {
    expect(htmlSourceFor({ ...base, url: null }).kind).toBe('loading');
  });

  it('refuses before it waits, so a broken file never shows a spinner', () => {
    expect(
      htmlSourceFor({ ...base, loading: true, text: '', error: 'gone' }).kind
    ).toBe('error');
  });
});

describe('the blank case, which is 63% of the corpus', () => {
  it('calls a script-only page blank', () => {
    const source = htmlSourceFor({
      ...base,
      text: '<html><head><title>App</title></head><body><div id="root"></div><script src="/main.js"></script></body></html>'
    });
    expect(source.kind).toBe('blank');
    if (source.kind !== 'blank') return;
    expect(source.shape.scripts).toBe(1);
  });

  it('does not call a page blank when there is a picture to draw', () => {
    const source = htmlSourceFor({
      ...base,
      text: '<html><body><svg viewBox="0 0 8 8"><rect width="8" height="8"/></svg><script src="/a.js"></script></body></html>'
    });
    expect(source.kind).toBe('ready');
  });

  it('does not count the title or a style block as body text', () => {
    // This was the mistake the static-render option made, and one of the
    // reasons it was rejected: the <title> and the contents of <style> came
    // out as body text and the page looked full when it was empty.
    const shape = staticShapeOf(
      '<html><head><title>A rather long document title goes here</title>' +
        '<style>body{background:#111;color:#eee;font-family:system-ui}</style>' +
        '</head><body><div id="root"></div></body></html>'
    );
    expect(shape.textLength).toBeLessThan(BLANK_TEXT_CHARS);
  });

  it('reads a document that survives without script', () => {
    const shape = staticShapeOf(
      '<html><body><h1>Coverage report</h1><p>92% of statements are covered by the suite.</p></body></html>'
    );
    expect(shape.textLength).toBeGreaterThan(BLANK_TEXT_CHARS);
    expect(shape.scripts).toBe(0);
  });
});

describe('what the preview refused, counted', () => {
  it('counts scripts, remote files and external links separately', () => {
    const shape = staticShapeOf(
      [
        '<html><head>',
        '<link rel="stylesheet" href="https://cdn.example/site.css">',
        '<link rel="stylesheet" href="./local.css">',
        '<script src="https://cdn.example/a.js"></script>',
        '</head><body>',
        '<img src="https://tracker.example/pixel.gif">',
        '<img src="./shot.png">',
        '<a href="https://example.com/docs">the docs</a>',
        '<a href="./other.html">the sibling page</a>',
        '<script>console.log(1)</script>',
        '<p>Some text that is long enough to keep this page out of the blank state.</p>',
        '</body></html>'
      ].join('')
    );
    expect(shape.scripts).toBe(2);
    // The remote stylesheet, the remote script and the tracking pixel. The
    // local stylesheet and the local image both load, and neither counts.
    expect(shape.remoteResources).toBe(3);
    // The sibling page is a working link inside the project.
    expect(shape.externalLinks).toBe(1);
  });

  it('ignores anything inside a comment', () => {
    const shape = staticShapeOf(
      '<html><body><!-- <script src="https://evil.example/x.js"></script> --><p>Only the comment held a script, and there is enough text here.</p></body></html>'
    );
    expect(shape.scripts).toBe(0);
    expect(shape.remoteResources).toBe(0);
  });

  it('counts a remote @import inside a local stylesheet', () => {
    const shape = staticShapeOf(
      '<html><head><style>@import url(https://fonts.example/x.css);</style></head><body><p>Text long enough to render.</p></body></html>'
    );
    expect(shape.remoteResources).toBe(1);
  });

  it('counts a protocol-relative address as remote', () => {
    // `//cdn.example.com/x` carries no scheme and inherits the document's,
    // which inside the frame is `gmux-preview:`. It resolves to another host,
    // the response policy refuses it, and the file does not load. Counting
    // only `https:` reported one script for this page and never mentioned the
    // stylesheet or the image.
    const shape = staticShapeOf(
      '<html><head><link rel="stylesheet" href="//cdn.example.com/a.css">' +
        '<style>@import url(//cdn.example.com/b.css);</style></head><body>' +
        '<img src="//cdn.example.com/c.png">' +
        '<a href="//cdn.example.com/d">d</a>' +
        '<img src="/local/e.png"><a href="/local/f">f</a>' +
        '<p>Text long enough that the page is not treated as blank.</p>' +
        '</body></html>'
    );
    // The two remote files, the remote @import, and neither of the two
    // root-relative addresses, which stay inside the project.
    expect(shape.remoteResources).toBe(3);
    expect(shape.externalLinks).toBe(1);
  });

  it('writes one cell per non-zero count, in plain words', () => {
    expect(
      refusalCells(
        {
          textLength: 900,
          scripts: 3,
          remoteResources: 1,
          externalLinks: 2,
          hasVisual: true
        },
        { ...CLEAN, served: 1, inertLinks: 2 }
      )
    ).toEqual([
      '3 scripts did not run',
      '1 remote file was not loaded',
      '2 external links are not clickable'
    ]);
  });

  it('uses the singular for one of anything', () => {
    expect(
      refusalCells(
        {
          textLength: 900,
          scripts: 1,
          remoteResources: 0,
          externalLinks: 1,
          hasVisual: false
        },
        { ...CLEAN, served: 1, inertLinks: 1 }
      )
    ).toEqual(['1 script did not run', '1 external link is not clickable']);
  });

  it('says so out loud when nothing was refused', () => {
    // A line that disappears reads as a missing feature rather than as an
    // all-clear, so the clean case gets a sentence of its own.
    expect(refusalCells(NOTHING, { ...CLEAN, served: 1 })).toEqual([
      NOTHING_BLOCKED
    ]);
  });
});

/**
 * The three defects a Tier 3 verifier reproduced in the running app, each with
 * the counts that were on screen when the line read "Nothing in this page was
 * blocked".
 *
 * All three have the same cause. The line was written from patterns over the
 * source text, and a refusal made by the handler in main leaves no trace in
 * the source text. There is no `http:` address in a symlink that leaves the
 * project, no `<script>` in an image that is not on disk, and nothing at all
 * in a request the budget turned away.
 */
describe('the line reports what main actually refused', () => {
  it('names subresources refused as outside the project', () => {
    // Measured on fs.html: 10 broken images and 2 nested frames, and the line
    // underneath said nothing had been blocked.
    expect(
      refusalCells(NOTHING, {
        ...CLEAN,
        served: 1,
        refusedOutsideRoot: 10,
        refusedType: 2
      })
    ).toEqual([
      '10 files outside the project were not loaded',
      '2 files were not loaded, because Tortie does not serve that kind of file'
    ]);
  });

  it('names the budget refusals', () => {
    // Measured on budget.html through CDP: 999 images decoded, 501 failed.
    expect(
      refusalCells(NOTHING, { ...CLEAN, served: 999, refusedBudget: 501 })
    ).toEqual(['501 requests were refused, because this page asked for too many']);
  });

  it('names a document the handler would not render', () => {
    // Measured on deep.html, 1.32 MB and refused for nesting depth.
    expect(
      refusalCells(NOTHING, { ...CLEAN, refusedUnreadable: 1 })
    ).toEqual(['1 file was too large or too deeply nested to render']);
  });

  it('names a stylesheet that is not in the project', () => {
    // Measured on a monorepo page whose only stylesheet was ../../shared/
    // site.css. The URL parser clamps `..` at the host, so the handler looks
    // for the file inside the project and does not find it. The page rendered
    // unstyled with no explanation.
    expect(refusalCells(NOTHING, { ...CLEAN, served: 1, refusedMissing: 1 })).toEqual(
      ['1 file was not found in this project']
    );
  });

  it('never prints the all-clear before main has confirmed it', () => {
    // Null is every case where main did not answer: the frame has not loaded,
    // the preload is older than this channel, the project has closed, or a
    // second tab on the same project took the shared counter. Saying nothing
    // is the honest answer, and saying nothing was blocked is not.
    expect(refusalCells(NOTHING, null)).toEqual([]);
  });

  it('still prints what it knows on its own while main is silent', () => {
    expect(
      refusalCells(
        {
          textLength: 900,
          scripts: 2,
          remoteResources: 1,
          externalLinks: 3,
          hasVisual: true
        },
        null
      )
    ).toEqual([
      '2 scripts did not run',
      '1 remote file was not loaded',
      '3 external links are not clickable'
    ]);
  });

  it('prefers the parsed link count over the pattern once a page was served', () => {
    // parse5 in main sees an anchor the pattern misses and skips one inside a
    // comment. Its number wins whenever there is one.
    expect(
      refusalCells(
        {
          textLength: 900,
          scripts: 0,
          remoteResources: 0,
          externalLinks: 3,
          hasVisual: true
        },
        { ...CLEAN, served: 1, inertLinks: 5 }
      )
    ).toEqual(['5 external links are not clickable']);
  });

  it('falls back to the pattern when main served no document at all', () => {
    expect(
      refusalCells(
        {
          textLength: 900,
          scripts: 0,
          remoteResources: 0,
          externalLinks: 3,
          hasVisual: true
        },
        { ...CLEAN, refusedUnreadable: 1 }
      )
    ).toEqual([
      '1 file was too large or too deeply nested to render',
      '3 external links are not clickable'
    ]);
  });
});
