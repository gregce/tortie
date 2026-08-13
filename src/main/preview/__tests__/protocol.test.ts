/**
 * The `gmux-preview:` handler (Phase 20.5).
 *
 * This file previews content the user did not write, so the tests are about
 * refusals rather than features. Each one pins a measurement from research
 * 39 section 2.
 *
 *  - The policy header is on EVERY response, including every refusal, and
 *    there is exactly one function in the module that can build a response.
 *    With the header absent, 2 requests left the frame under `sandbox=""`.
 *  - Containment resolves the real path on both the request and the root. A
 *    prefix check was measured serving the real /etc/passwd through a
 *    symlink named docs/notes.html.
 *  - The served extension set is the handler's own and never grants a
 *    preview to a credential file.
 *  - The budget bounds one document's requests. 8,000 images cost the main
 *    process 96 ms of added timer latency.
 *
 * The fixture root is created under the OS temp directory on purpose. On
 * macOS that path runs through the /var to /private/var symlink, so every
 * test here fails closed if the ROOT stops being resolved, which is the half
 * of the containment rule that is easy to drop.
 */

import { mkdtempSync, mkdirSync, symlinkSync, writeFileSync } from 'node:fs';
import { readFile, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { IMAGE_EXTENSIONS } from '@shared/image-types';
import {
  PREVIEW_SERVED_EXTENSIONS,
  previewMediaType
} from '@shared/preview-types';
import type { PreviewStats } from '@shared/preview-types';

/** Every `protocol.handle` registration the module made. */
const handlers: Array<{ scheme: string; handler: (r: Request) => unknown }> = [];

vi.mock('electron', () => ({
  protocol: {
    handle: (scheme: string, handler: (r: Request) => unknown) => {
      handlers.push({ scheme, handler });
    }
  },
  net: {
    // The real `net.fetch` streams a file: URL. Reading it is the same
    // answer with none of Electron's machinery.
    fetch: async (url: string) =>
      new Response(await readFile(fileURLToPath(url)))
  }
}));

const {
  PREVIEW_HTML_CAP_BYTES,
  PREVIEW_PRIVILEGED_SCHEME,
  PREVIEW_REQUEST_BUDGET,
  PREVIEW_RESPONSE_POLICY,
  PREVIEW_SCHEME,
  previewStatsFor,
  previewUrlForFile,
  registerPreviewProtocol,
  releasePreviewRoot,
  resetPreviewProtocolForTests,
  servePreviewRequest
} = await import('../protocol');

type Rewrite = Parameters<typeof registerPreviewProtocol>[0]['rewriteHtml'];

/**
 * Stands in for the real parse5 rewrite, which has its own tests beside this
 * file. A pattern is the wrong tool for the product and the right one here:
 * these tests are about which requests reach the rewrite and what the
 * handler does with its answer, not about parsing.
 */
const rewriteHtml: Rewrite = (html) => {
  const found = html.match(/href="https?:[^"]*"/g) ?? [];
  return {
    status: 'ok',
    html: html.replace(/href="https?:[^"]*"/g, 'data-inert-link'),
    inertLinks: found.length,
    strippedAttributes: 0
  };
};

const deps = { rewriteHtml };

/** The fixture project, and one file deliberately outside it. */
let root = '';
let outside = '';

beforeAll(() => {
  const base = mkdtempSync(join(tmpdir(), 'gmux-preview-'));
  root = join(base, 'proj');
  outside = join(base, 'elsewhere');
  mkdirSync(join(root, 'docs', 'css'), { recursive: true });
  mkdirSync(join(root, 'img'), { recursive: true });
  mkdirSync(outside, { recursive: true });

  writeFileSync(
    join(root, 'index.html'),
    '<!doctype html><title>t</title><a href="https://example.com/a">a</a>' +
      '<a href="docs/page.html">local</a>'
  );
  writeFileSync(join(root, 'docs', 'page.html'), '<p>page</p>');
  writeFileSync(join(root, 'docs', 'css', 'style.css'), 'h1{color:#0f0}');
  writeFileSync(join(root, 'img', 'logo.png'), Buffer.from([0x89, 0x50]));
  writeFileSync(join(root, 'app.js'), 'window.x = 1');
  writeFileSync(join(root, 'secret.env'), 'API_KEY=hunter2');
  writeFileSync(join(root, 'id_rsa'), 'PRIVATE KEY');
  writeFileSync(join(root, 'server.pem'), 'PRIVATE KEY');
  writeFileSync(join(outside, 'outside.html'), '<p>not yours</p>');

  // The attack from research 39 section 3.2: a page name pointing at a file
  // no preview may ever show.
  symlinkSync('/etc/passwd', join(root, 'notes.html'));
  // The honest case that must still work: a link inside the root.
  symlinkSync(join(root, 'docs', 'page.html'), join(root, 'linked.html'));
  // A stylesheet name pointing at a private key.
  symlinkSync(join(root, 'id_rsa'), join(root, 'docs', 'css', 'theme.css'));
  // A page name pointing at a file outside the project.
  symlinkSync(join(outside, 'outside.html'), join(root, 'escape.html'));
});

beforeEach(() => {
  handlers.length = 0;
  resetPreviewProtocolForTests();
});

/**
 * Generation of the most recent mint.
 *
 * A token is per project and its counter is reset by every mint, so reading
 * the counts takes the generation as well as the token. Holding the newest one
 * here keeps `statsOf` below a one-argument call at every site.
 */
let lastGeneration = 0;

/** Mint a URL for the fixture index page and hand back its parts. */
async function openIndex(): Promise<{ token: string; url: string }> {
  const result = await previewUrlForFile({
    root,
    path: join(root, 'index.html')
  });
  if (result.status !== 'ok') throw new Error(`mint refused: ${result.reason}`);
  lastGeneration = result.generation;
  return { token: result.token, url: result.url };
}

/** The counts for the document the most recent mint opened. */
function statsOf(token: string): PreviewStats | null {
  return previewStatsFor({ token, generation: lastGeneration });
}

/** One request against the handler, with the fixture rewrite installed. */
function get(url: string, method = 'GET'): Promise<Response> {
  return servePreviewRequest(new Request(url, { method }), deps);
}

describe('the fixture proves the root needs resolving', () => {
  it('sits behind a symlink, so a spelled-path compare would fail closed', async () => {
    expect(await realpath(root)).not.toBe(root);
  });
});

describe('the response policy', () => {
  it('is the string that was measured, byte for byte', () => {
    expect(PREVIEW_RESPONSE_POLICY).toBe(
      "default-src 'none'; " +
        'img-src gmux-preview: data:; ' +
        "style-src gmux-preview: 'unsafe-inline'; " +
        'font-src gmux-preview: data:; ' +
        'media-src gmux-preview:; ' +
        'frame-src gmux-preview:; ' +
        "form-action 'none'; " +
        "base-uri 'none'"
    );
  });

  it('rides on a served document', async () => {
    const { url } = await openIndex();
    const res = await get(url);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-security-policy')).toBe(
      PREVIEW_RESPONSE_POLICY
    );
    expect(res.headers.get('content-type')).toBe('text/html; charset=utf-8');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('cache-control')).toBe('no-store');
  });

  it('rides on every refusal as well', async () => {
    const { token, url } = await openIndex();
    const refusals = [
      await get(url, 'POST'),
      await get(`${PREVIEW_SCHEME}://deadbeef/index.html`),
      await get(`${PREVIEW_SCHEME}://${token}/app.js`),
      await get(`${PREVIEW_SCHEME}://${token}/notes.html`),
      await get(`${PREVIEW_SCHEME}://${token}/docs/nope.html`)
    ];
    for (const res of refusals) {
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.headers.get('content-security-policy')).toBe(
        PREVIEW_RESPONSE_POLICY
      );
    }
  });

  it('comes from exactly one response constructor in the module', async () => {
    // A unit test on the header string still passes when somebody adds a
    // second response path, so this one counts the paths. Comments are
    // stripped first, because the module's own prose names the constructor.
    const source = await readFile(join(__dirname, '..', 'protocol.ts'), 'utf8');
    const code = source
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    const built = code.match(/new Response\(/g) ?? [];
    expect(
      built.length,
      'every gmux-preview: response must come from previewResponse, which is ' +
        'the one place the policy header is set'
    ).toBe(1);
  });
});

describe('containment', () => {
  it('serves a page inside the project', async () => {
    const { url } = await openIndex();
    const res = await get(url);
    expect(await res.text()).toContain('<title>t</title>');
  });

  it('serves a stylesheet and an image the page asks for', async () => {
    const { token } = await openIndex();
    const css = await get(`${PREVIEW_SCHEME}://${token}/docs/css/style.css`);
    expect(css.status).toBe(200);
    expect(css.headers.get('content-type')).toBe('text/css; charset=utf-8');
    expect(await css.text()).toBe('h1{color:#0f0}');

    const png = await get(`${PREVIEW_SCHEME}://${token}/img/logo.png`);
    expect(png.status).toBe(200);
    expect(png.headers.get('content-type')).toBe('image/png');
  });

  it('follows a symlink that stays inside the project', async () => {
    const { token } = await openIndex();
    const res = await get(`${PREVIEW_SCHEME}://${token}/linked.html`);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('page');
  });

  it('refuses a page name that is a symlink to /etc/passwd', async () => {
    const { token } = await openIndex();
    const res = await get(`${PREVIEW_SCHEME}://${token}/notes.html`);
    expect(res.status).toBe(404);
    const body = await res.text();
    expect(body).not.toContain('root:');
    expect(statsOf(token)?.refusedOutsideRoot).toBe(1);
  });

  it('refuses a stylesheet name that is a symlink to a private key', async () => {
    const { token } = await openIndex();
    const res = await get(`${PREVIEW_SCHEME}://${token}/docs/css/theme.css`);
    expect(res.status).toBe(404);
    expect(await res.text()).not.toContain('PRIVATE KEY');
  });

  it('refuses a page name that is a symlink out of the project', async () => {
    const { token } = await openIndex();
    const res = await get(`${PREVIEW_SCHEME}://${token}/escape.html`);
    expect(res.status).toBe(404);
    expect(await res.text()).not.toContain('not yours');
  });

  it('has traversal clamped at the host by the URL parser, and refuses what is left', async () => {
    const { token } = await openIndex();
    const spelled = `${PREVIEW_SCHEME}://${token}/../../../../etc/passwd`;
    expect(new URL(spelled).pathname).toBe('/etc/passwd');
    const res = await get(spelled);
    expect(res.status).toBe(404);
    expect(await res.text()).not.toContain('root:');
  });

  it('refuses a token nobody minted', async () => {
    const res = await get(`${PREVIEW_SCHEME}://0123456789abcdef/index.html`);
    expect(res.status).toBe(404);
  });

  it('refuses a token whose project has closed', async () => {
    const { token, url } = await openIndex();
    expect((await get(url)).status).toBe(200);
    await releasePreviewRoot(root);
    expect((await get(url)).status).toBe(404);
    expect(statsOf(token)).toBeNull();
  });

  it('gives two projects two different tokens', async () => {
    const a = await previewUrlForFile({ root, path: join(root, 'index.html') });
    const b = await previewUrlForFile({
      root: outside,
      path: join(outside, 'outside.html')
    });
    expect(a.status).toBe('ok');
    expect(b.status).toBe('ok');
    if (a.status !== 'ok' || b.status !== 'ok') return;
    expect(a.token).not.toBe(b.token);
    // Opaque: 16 random bytes as lowercase hex, carrying no path.
    expect(a.token).toMatch(/^[0-9a-f]{32}$/);
    expect(a.url).not.toContain('proj');
    // One project's token cannot name the other's file.
    const crossed = await get(`${PREVIEW_SCHEME}://${a.token}/outside.html`);
    expect(crossed.status).toBe(404);
  });
});

describe('the served extension set', () => {
  it('refuses every credential shape, by name and never by content', async () => {
    const { token } = await openIndex();
    for (const name of ['secret.env', 'id_rsa', 'server.pem', 'app.js']) {
      const res = await get(`${PREVIEW_SCHEME}://${token}/${name}`);
      expect(res.status, name).toBe(404);
      const body = await res.text();
      expect(body).not.toContain('hunter2');
      expect(body).not.toContain('PRIVATE KEY');
    }
    expect(statsOf(token)?.refusedType).toBe(4);
  });

  it('is the shared contract, so the tab and the handler cannot disagree', () => {
    // The handler asks `previewMediaType`, which is the same function the
    // editor asks to decide whether a tab gets the Preview control. This
    // pins the direction of the dependency rather than the list itself,
    // which has its own tests beside the contract.
    expect(previewMediaType('/p/style.css')).toBe('text/css; charset=utf-8');
    expect(previewMediaType('/p/app.js')).toBeNull();
    expect(previewMediaType('/p/id_rsa')).toBeNull();
    for (const ext of IMAGE_EXTENSIONS) {
      expect(PREVIEW_SERVED_EXTENSIONS.has(ext), ext).toBe(true);
    }
  });

  it('answers with the media type the contract names', async () => {
    const { token } = await openIndex();
    const css = await get(`${PREVIEW_SCHEME}://${token}/docs/css/style.css`);
    expect(css.headers.get('content-type')).toBe(
      previewMediaType('/p/style.css')
    );
  });
});

describe('the anchor rewrite', () => {
  it('runs on an HTML document and its count reaches the stats', async () => {
    const { token, url } = await openIndex();
    const body = await (await get(url)).text();
    expect(body).not.toContain('https://example.com/a');
    expect(body).toContain('data-inert-link');
    // The link to a sibling page is untouched, because a documentation site
    // has to stay browsable inside the frame.
    expect(body).toContain('href="docs/page.html"');
    expect(statsOf(token)?.inertLinks).toBe(1);
  });

  it('is answered with a refusal when it throws, never with an escape', async () => {
    // parse5 serialises by recursion, so a document nested deeply enough
    // exceeds the call stack. An exception out of the handler fails the load
    // with no explanation and leaves an unhandled rejection in main.
    const { token, url } = await openIndex();
    const res = await servePreviewRequest(new Request(url), {
      rewriteHtml: () => {
        throw new RangeError('Maximum call stack size exceeded');
      }
    });
    expect(res.status).toBe(500);
    expect(res.headers.get('content-security-policy')).toBe(
      PREVIEW_RESPONSE_POLICY
    );
    expect(statsOf(token)?.served).toBe(0);
    expect(statsOf(token)?.refusedUnreadable).toBe(1);
  });

  it('says a deep document is deep, and a large one is large', async () => {
    // The reader sees this body inside the frame. Both refusals used to map
    // to the size message, so a 1.32 MB file refused for nesting depth was
    // described to the reader as being over a 5 MB cap. The refusal was
    // right and the sentence was wrong, and the two have different fixes.
    const { token, url } = await openIndex();
    const deep = await servePreviewRequest(new Request(url), {
      rewriteHtml: () => ({ status: 'too-deep', maxDepth: 512 })
    });
    expect(deep.status).toBe(422);
    expect(await deep.text()).toBe(
      'document nested deeper than 512 elements'
    );
    expect(deep.headers.get('content-security-policy')).toBe(
      PREVIEW_RESPONSE_POLICY
    );
    expect(statsOf(token)?.refusedUnreadable).toBe(1);

    const big = await servePreviewRequest(new Request(url), {
      rewriteHtml: () => ({
        status: 'too-large',
        bytes: 6_000_000,
        capBytes: PREVIEW_HTML_CAP_BYTES
      })
    });
    expect(big.status).toBe(413);
    expect(await big.text()).toBe('document over the preview size cap');
  });

  it('does not run on a stylesheet', async () => {
    const seen: string[] = [];
    const spy = {
      rewriteHtml: (html: string) => {
        seen.push(html);
        return {
          status: 'ok' as const,
          html,
          inertLinks: 0,
          strippedAttributes: 0
        };
      }
    };
    const { token } = await openIndex();
    await servePreviewRequest(
      new Request(`${PREVIEW_SCHEME}://${token}/docs/css/style.css`),
      spy
    );
    expect(seen).toHaveLength(0);
  });
});

describe('the request budget', () => {
  it('refuses past the budget and counts the refusal', async () => {
    const { token } = await openIndex();
    // A refused type is the cheapest request that still spends budget.
    for (let i = 0; i < PREVIEW_REQUEST_BUDGET; i += 1) {
      await get(`${PREVIEW_SCHEME}://${token}/app.js`);
    }
    const over = await get(`${PREVIEW_SCHEME}://${token}/index.html`);
    expect(over.status).toBe(429);
    expect(statsOf(token)?.refusedBudget).toBe(1);
  });

  it('starts again when the renderer opens the document again', async () => {
    const { token } = await openIndex();
    for (let i = 0; i < PREVIEW_REQUEST_BUDGET + 1; i += 1) {
      await get(`${PREVIEW_SCHEME}://${token}/app.js`);
    }
    expect((await get(`${PREVIEW_SCHEME}://${token}/index.html`)).status).toBe(
      429
    );
    const again = await openIndex();
    expect(again.token).toBe(token);
    expect((await get(again.url)).status).toBe(200);
    expect(statsOf(token)?.refusedBudget).toBe(0);
  });
});

describe('minting a preview URL', () => {
  it('carries the revision so a rewritten file is not shown stale', async () => {
    const result = await previewUrlForFile({
      root,
      path: join(root, 'index.html'),
      revision: 7
    });
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.url.endsWith('/index.html?v=7')).toBe(true);
  });

  it('refuses a file that is not an HTML document', async () => {
    const result = await previewUrlForFile({
      root,
      path: join(root, 'docs', 'css', 'style.css')
    });
    expect(result).toEqual({ status: 'refused', reason: 'not-previewable' });
  });

  it('refuses a page outside the project root', async () => {
    const result = await previewUrlForFile({
      root,
      path: join(outside, 'outside.html')
    });
    expect(result).toEqual({ status: 'refused', reason: 'outside-root' });
  });

  it('refuses a page that is a symlink out of the project root', async () => {
    const result = await previewUrlForFile({
      root,
      path: join(root, 'escape.html')
    });
    expect(result).toEqual({ status: 'refused', reason: 'outside-root' });
  });

  it('refuses a missing file', async () => {
    const result = await previewUrlForFile({
      root,
      path: join(root, 'nope.html')
    });
    expect(result).toEqual({ status: 'refused', reason: 'missing' });
  });

  it('refuses a document over the size cap', async () => {
    const big = join(root, 'big.html');
    writeFileSync(big, 'x'.repeat(PREVIEW_HTML_CAP_BYTES + 1));
    const result = await previewUrlForFile({ root, path: big });
    expect(result).toEqual({ status: 'refused', reason: 'too-large' });
  });

  it('reports unknown tokens as null rather than empty counts', () => {
    expect(previewStatsFor({ token: 'nosuchtoken', generation: 1 })).toBeNull();
  });
});

/**
 * The counts the renderer prints under the frame.
 *
 * They are the only honest source for that line. A refusal made here is
 * invisible from the renderer: the bytes never arrive, no event fires in that
 * process, and a pattern over the source text cannot see a symlink that leaves
 * the project or an image that is not on disk.
 */
describe('the counts a document reports back', () => {
  it('separates a file that is not there from one that will not render', async () => {
    const { token } = await openIndex();
    await get(`${PREVIEW_SCHEME}://${token}/img/nope.png`);
    expect(statsOf(token)?.refusedMissing).toBe(1);
    expect(statsOf(token)?.refusedUnreadable).toBe(0);
  });

  it('counts a subresource whose real path leaves the project', async () => {
    const { token } = await openIndex();
    await get(`${PREVIEW_SCHEME}://${token}/escape.html`);
    await get(`${PREVIEW_SCHEME}://${token}/docs/css/theme.css`);
    // theme.css resolves onto a private key, so it is refused by TYPE after
    // the symlink is followed rather than by containment.
    expect(statsOf(token)?.refusedOutsideRoot).toBe(1);
    expect(statsOf(token)?.refusedType).toBe(1);
  });

  it('refuses to answer for a generation another document has replaced', async () => {
    // Two preview tabs on one project share a token, and every mint resets the
    // counter. Answering the first tab with the second tab's counts would put
    // a wrong number under a page, which is the defect the whole channel
    // exists to remove. Null is the honest answer and the renderer then says
    // nothing rather than something false.
    const first = await previewUrlForFile({
      root,
      path: join(root, 'index.html')
    });
    if (first.status !== 'ok') throw new Error('mint refused');
    await get(`${PREVIEW_SCHEME}://${first.token}/app.js`);
    expect(
      previewStatsFor({ token: first.token, generation: first.generation })
        ?.refusedType
    ).toBe(1);

    const second = await previewUrlForFile({
      root,
      path: join(root, 'docs', 'page.html')
    });
    if (second.status !== 'ok') throw new Error('mint refused');
    expect(second.token).toBe(first.token);
    expect(second.generation).toBe(first.generation + 1);
    expect(
      previewStatsFor({ token: first.token, generation: first.generation })
    ).toBeNull();
    expect(
      previewStatsFor({ token: second.token, generation: second.generation })
    ).toEqual({
      served: 0,
      refusedOutsideRoot: 0,
      refusedType: 0,
      refusedBudget: 0,
      refusedMissing: 0,
      refusedUnreadable: 0,
      inertLinks: 0
    });
  });
});

describe('registration', () => {
  it('installs one handler, for this scheme only', () => {
    registerPreviewProtocol(deps);
    expect(handlers).toHaveLength(1);
    expect(handlers[0]?.scheme).toBe(PREVIEW_SCHEME);
  });

  it('declares the privileges that were measured, and no others', () => {
    expect(PREVIEW_PRIVILEGED_SCHEME.scheme).toBe(PREVIEW_SCHEME);
    const p = PREVIEW_PRIVILEGED_SCHEME.privileges ?? {};
    expect(p.standard).toBe(true);
    expect(p.secure).toBe(true);
    expect(p.stream).toBe(true);
    // Measured 2026-08-13: with corsEnabled false, a local @font-face file
    // was refused before the request reached the handler, because the
    // sandboxed frame's origin is opaque and every request it makes for its
    // own subresources is cross origin.
    expect(p.corsEnabled).toBe(true);
    // Nothing may fetch this scheme, and nothing may outlive the frame.
    expect(p.supportFetchAPI).toBe(false);
    expect(p.bypassCSP).toBe(false);
    expect(p.allowServiceWorkers ?? false).toBe(false);
  });

});
