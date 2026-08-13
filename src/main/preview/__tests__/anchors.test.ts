/**
 * The anchor rewrite (Phase 20.5, research 39 section 2.6).
 *
 * Three properties are asserted here, and each one is a defect that was
 * measured before the module existed.
 *
 *  1. **No live external href survives.** A click on one blanks the preview,
 *     because the application's `frame-src` refuses the navigation and no
 *     event fires. The measured leftover was an empty frame.
 *  2. **Nothing else in the document is touched.** A regular expression over
 *     `href="..."` rewrites an address inside a comment and inside another
 *     attribute's value. Both are in the fixture below.
 *  3. **The rewrite produces no URL the main process acts on.** The sentinel
 *     route an earlier draft specified was fired by a 1x1 nested iframe with
 *     no script and no click. There is no route here to fire.
 */

import { describe, expect, it } from 'vitest';
import { parse } from 'parse5';
import {
  ANCHOR_PARSE_CAP_BYTES,
  rewriteExternalAnchors,
  type AnchorRewriteOk
} from '../anchors';

/** The document URL every fixture is served at. */
const DOC = 'gmux-preview://p7f3a91c/docs/index.html';

/** Rewrite, and fail loudly rather than narrow the type by hand. */
function rewrite(html: string, url: string = DOC): AnchorRewriteOk {
  const result = rewriteExternalAnchors(html, url);
  if (result.status !== 'ok') {
    throw new Error(`expected ok, got ${result.status}`);
  }
  return result;
}

/** Every `href` still on an `<a>` or `<area>` in a served document. */
function survivingHrefs(html: string): string[] {
  const found: string[] = [];
  const walk = (node: unknown): void => {
    const n = node as {
      tagName?: string;
      attrs?: { name: string; value: string }[];
      childNodes?: unknown[];
      content?: unknown;
    };
    if (n.tagName === 'a' || n.tagName === 'area') {
      for (const attr of n.attrs ?? []) {
        if (attr.name === 'href') found.push(attr.value);
      }
    }
    if (n.content) walk(n.content);
    for (const child of n.childNodes ?? []) walk(child);
  };
  walk(parse(html));
  return found;
}

describe('links that leave the project', () => {
  it('removes the href, keeps the text, and puts the address in title', () => {
    const out = rewrite(
      '<p><a href="https://example.com/docs">Read the docs</a></p>'
    );
    expect(out.inertLinks).toBe(1);
    expect(survivingHrefs(out.html)).toEqual([]);
    expect(out.html).toContain('>Read the docs</a>');
    expect(out.html).toContain('title="https://example.com/docs"');
  });

  it('kills every scheme that is not this project, not only http', () => {
    // Each of these blanks the preview on click, for the same reason: the
    // application policy refuses the navigation before an event fires.
    const cases = [
      'https://example.com/x',
      'http://example.com/x',
      'mailto:someone@example.com',
      'file:///etc/passwd',
      'data:text/html,<b>hi</b>',
      'javascript:alert(1)',
      'gmux-asset://local/Users/gdc/secret.png'
    ];
    for (const href of cases) {
      const out = rewrite(`<a href="${href}">t</a>`);
      expect(out.inertLinks, href).toBe(1);
      expect(survivingHrefs(out.html), href).toEqual([]);
    }
  });

  it('sees through the whitespace the URL parser strips from a scheme', () => {
    // `java<TAB>script:` IS a javascript URL to the parser. A hand-rolled
    // scheme comparison does not see it, which is why this uses `new URL`.
    const out = rewrite('<a href="java&#9;script:alert(1)">t</a>');
    expect(out.inertLinks).toBe(1);
    expect(survivingHrefs(out.html)).toEqual([]);
  });

  it('kills a protocol-relative href, which inherits our own scheme', () => {
    // `//evil.example/x` resolves to gmux-preview://evil.example/x, so a
    // scheme-only check passes it. The host check is what stops it.
    const out = rewrite('<a href="//evil.example/x">t</a>');
    expect(out.inertLinks).toBe(1);
    expect(survivingHrefs(out.html)).toEqual([]);
  });

  it('kills a link into another project, because the host is the token', () => {
    // Tortie holds several projects in one window, and each gets its own
    // opaque host token. One project may not link into another's origin.
    const out = rewrite('<a href="gmux-preview://other0token/x.html">t</a>');
    expect(out.inertLinks).toBe(1);
    expect(survivingHrefs(out.html)).toEqual([]);
  });

  it('leaves an author title alone, and loses the address rather than it', () => {
    const out = rewrite(
      '<a href="https://example.com/x" title="Our handbook">t</a>'
    );
    expect(out.inertLinks).toBe(1);
    expect(out.html).toContain('title="Our handbook"');
    expect(out.html).not.toContain('https://example.com/x');
  });

  it('rewrites an xlink:href inside inline SVG', () => {
    const out = rewrite(
      '<svg><a xlink:href="https://example.com/x"><text>s</text></a></svg>'
    );
    expect(out.inertLinks).toBe(1);
    expect(out.html).not.toContain('xlink:href="https://example.com/x"');
    expect(out.html).toContain('<text>s</text>');
  });

  it('rewrites an <area> in an image map', () => {
    const out = rewrite(
      '<map><area shape="rect" href="http://example.com/x"></map>'
    );
    expect(out.inertLinks).toBe(1);
    expect(survivingHrefs(out.html)).toEqual([]);
    expect(out.html).toContain('shape="rect"');
  });

  it('reaches an anchor inside a <template>, so grep can check the bytes', () => {
    const out = rewrite(
      '<template><a href="https://example.com/x">t</a></template>'
    );
    expect(out.inertLinks).toBe(1);
    expect(out.html).not.toContain('href="https://example.com/x"');
  });
});

describe('links that stay inside the project', () => {
  it('keeps a relative, a root-absolute and a fragment link working', () => {
    const out = rewrite(
      '<a href="other.html">a</a>' +
        '<a href="../shared/index.html">b</a>' +
        '<a href="/top.html">c</a>' +
        '<a href="#section-2">d</a>' +
        '<a href="">e</a>'
    );
    expect(out.inertLinks).toBe(0);
    expect(survivingHrefs(out.html)).toEqual([
      'other.html',
      '../shared/index.html',
      '/top.html',
      '#section-2',
      ''
    ]);
  });

  it('keeps an absolute link to our own project origin', () => {
    const out = rewrite(`<a href="${DOC}">self</a>`);
    expect(out.inertLinks).toBe(0);
    expect(survivingHrefs(out.html)).toEqual([DOC]);
  });
});

describe('attributes stripped from every link', () => {
  it('removes target, on internal links as well as external ones', () => {
    // Under sandbox="" a popup is blocked, so target can only turn a working
    // internal link into a dead click. On an external link it is the
    // setWindowOpenHandler route research 39 recorded as not a plan.
    const out = rewrite(
      '<a href="other.html" target="_blank">a</a>' +
        '<a href="https://example.com/x" target="_blank">b</a>'
    );
    expect(out.html).not.toContain('target=');
    expect(out.strippedAttributes).toBe(2);
    expect(out.inertLinks).toBe(1);
  });

  it('removes ping, which is a POST on click to an address of its choosing', () => {
    const out = rewrite('<a href="other.html" ping="http://tracker/x">a</a>');
    expect(out.html).not.toContain('ping=');
    expect(out.html).toContain('href="other.html"');
  });

  it('removes target from a form as well as from a link', () => {
    // A verifier drove a `target="_blank"` submit and a `target="_top"` submit
    // with real mouse clicks on 2026-08-13. Both were already stopped, by
    // `form-action 'none'` and by the sandbox, with no new window and nothing
    // reaching a local sink. The attribute is stripped so that this set covers
    // what its own comment says it covers.
    const out = rewrite(
      '<form action="/submit" method="post" target="_top">' +
        '<input name="q"><button>go</button></form>'
    );
    expect(out.html).not.toContain('target=');
    expect(out.strippedAttributes).toBe(1);
    // The action is left exactly as written. It is not a link, the response
    // policy is what refuses the submit, and removing it would change what the
    // page shows without adding a lock.
    expect(out.html).toContain('action="/submit"');
    expect(out.html).toContain('method="post"');
    // A form is not a link, so it never earns a title or an inert count.
    expect(out.html).not.toContain('title=');
    expect(out.inertLinks).toBe(0);
  });
});

describe('what a regular expression gets wrong', () => {
  // The two cases the phase brief names. A pattern over href="..." rewrites
  // both, changing bytes the page never treats as a link.
  const FIXTURE = `<!doctype html>
<html><head><title>t</title>
<style>a[href^="https://in-css.example"] { color: red }</style></head>
<body>
<!-- <a href="https://commented.example/x">not a link</a> -->
<div data-snippet='<a href="https://in-attr.example/x">'>not a link either</div>
<script>var s = '<a href="https://in-script.example/x">';</script>
<a href="https://real.example/x">the one real link</a>
</body></html>`;

  it('counts one link, not four', () => {
    const out = rewrite(FIXTURE);
    expect(out.inertLinks).toBe(1);
  });

  it('leaves the comment, the attribute value, the script and the CSS alone', () => {
    const out = rewrite(FIXTURE);
    expect(out.html).toContain(
      '<!-- <a href="https://commented.example/x">not a link</a> -->'
    );
    expect(out.html).toContain('https://in-attr.example/x');
    expect(out.html).toContain(
      `var s = '<a href="https://in-script.example/x">';`
    );
    expect(out.html).toContain('a[href^="https://in-css.example"]');
  });

  it('leaves only the real link dead', () => {
    const out = rewrite(FIXTURE);
    expect(survivingHrefs(out.html)).toEqual([]);
    expect(out.html).toContain('>the one real link</a>');
    expect(out.html).toContain('title="https://real.example/x"');
  });
});

describe('the shape of the output', () => {
  it('keeps the doctype, the title and the page text', () => {
    const out = rewrite(
      '<!doctype html><html><head><title>Report</title></head>' +
        '<body><h1>Q3</h1><p>Revenue rose.</p></body></html>'
    );
    expect(out.html.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(out.html).toContain('<title>Report</title>');
    expect(out.html).toContain('<h1>Q3</h1><p>Revenue rose.</p>');
  });

  it('is idempotent, so a second pass finds nothing left to do', () => {
    const first = rewrite('<a href="https://example.com/x">t</a>');
    const second = rewrite(first.html);
    expect(second.inertLinks).toBe(0);
    expect(second.strippedAttributes).toBe(0);
    expect(second.html).toBe(first.html);
  });

  it('counts zero on a page with no links at all', () => {
    const out = rewrite('<p>Just words.</p>');
    expect(out.inertLinks).toBe(0);
    expect(out.strippedAttributes).toBe(0);
  });
});

describe('the refusals', () => {
  it('refuses a document over the cap, and does not hand back the bytes', () => {
    const oversize = `<p>${'x'.repeat(ANCHOR_PARSE_CAP_BYTES)}</p>`;
    const result = rewriteExternalAnchors(oversize, DOC);
    expect(result.status).toBe('too-large');
    if (result.status !== 'too-large') throw new Error('unreachable');
    expect(result.bytes).toBeGreaterThan(ANCHOR_PARSE_CAP_BYTES);
    expect(result.capBytes).toBe(ANCHOR_PARSE_CAP_BYTES);
    // The input is deliberately absent from the result: a caller cannot
    // serve the file unrewritten by accident, because it is not here.
    expect('html' in result).toBe(false);
  });

  it('refuses a document nested deeper than the limit', () => {
    // parse5's serialiser is recursive. Without this guard a 22,026 byte file
    // throws RangeError out of the protocol handler, and a 1.1 MB one blocks
    // the main process for about 31 s before it does.
    const nest = (depth: number): string =>
      '<div>'.repeat(depth) + 'x' + '</div>'.repeat(depth);
    expect(rewriteExternalAnchors(nest(500), DOC).status).toBe('ok');
    for (const depth of [2000, 20000, 100000]) {
      const result = rewriteExternalAnchors(nest(depth), DOC);
      expect(result.status, `depth ${depth}`).toBe('too-deep');
      expect('html' in result, `depth ${depth}`).toBe(false);
    }
  });

  it('counts depth through a template, which holds children elsewhere', () => {
    const inner = '<div>'.repeat(600) + 'x' + '</div>'.repeat(600);
    const result = rewriteExternalAnchors(`<template>${inner}</template>`, DOC);
    expect(result.status).toBe('too-deep');
  });

  it('does not refuse the shapes a text scan would get wrong', () => {
    // HTML closes many tags implicitly. Counting `<` against `</` in the bytes
    // reads both of these as 20,000 deep. The tree is 4 and 6 deep, and both
    // parse in under 30 ms. This is why the guard counts the tree.
    const list = `<ul>${'<li>item'.repeat(20000)}</ul>`;
    const table = `<table>${'<tr><td>cell'.repeat(20000)}</table>`;
    expect(rewriteExternalAnchors(list, DOC).status).toBe('ok');
    expect(rewriteExternalAnchors(table, DOC).status).toBe('ok');
  });

  it('throws on a document URL that is not a URL, rather than guessing', () => {
    // The handler builds this from a request it received. A string that does
    // not parse is a bug in the handler, and treating every link on the page
    // as external would hide it.
    expect(() => rewriteExternalAnchors('<p>x</p>', 'not a url')).toThrow();
  });

  it('never writes a sentinel route into the document', () => {
    const out = rewrite(
      '<a href="https://example.com/x">t</a>' +
        '<iframe src="/__external?u=https%3A%2F%2Fevil.example%2F"></iframe>'
    );
    // The page may still ask for a route. What matters is that we never
    // create one, and that the handler has no such route to answer.
    expect(out.html).not.toContain('__external?u=https%3A%2F%2Fexample.com');
    expect(survivingHrefs(out.html)).toEqual([]);
  });
});
