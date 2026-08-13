/**
 * Preview eligibility (Phase 20.5, research 39 sections 2.5 and 3).
 *
 * Two claims are under test, and they are the two the phase brief calls
 * refusals rather than features.
 *
 *  1. Eligibility comes from the file NAME and never from the file's content.
 *     A private key can be valid JSON, and a `.pem` is base64 text, so any
 *     rule that reads bytes hands a rendered view to a secret.
 *  2. The files listed in `NEVER_PREVIEW` are refused, every one of them, and
 *     the list cannot be quietly narrowed without a failing test that names
 *     the file it stopped covering.
 */

import { describe, expect, it } from 'vitest';
import { IMAGE_EXTENSIONS } from '../image-types';
import {
  NEVER_PREVIEW,
  PREVIEW_SERVED_EXTENSIONS,
  canPreviewPath,
  isHtmlPath,
  isPreviewServablePath,
  looksLikeSecretPath,
  previewMediaType
} from '../preview-types';

/** A real, well-formed HTML document. Used to prove content decides nothing. */
const REAL_HTML = `<!doctype html>
<html><head><title>Quarterly</title></head>
<body><h1>Quarterly</h1><table><tr><td>1</td></tr></table></body></html>`;

describe('which files earn a preview', () => {
  it('accepts the two HTML spellings, in any case', () => {
    expect(canPreviewPath('/p/docs/index.html')).toBe(true);
    expect(canPreviewPath('/p/docs/index.htm')).toBe(true);
    expect(canPreviewPath('/p/docs/INDEX.HTML')).toBe(true);
  });

  it('refuses everything else, including the near misses', () => {
    for (const path of [
      '/p/page.xhtml', // XML, and parse5 is an HTML parser
      '/p/base.html.j2', // a template that produces HTML, and is not HTML
      '/p/index.html.bak',
      '/p/template.hbs',
      '/p/notes.md',
      '/p/main.ts',
      '/p/README',
      '/p/.html' // a file NAMED .html, not an HTML file
    ]) {
      expect(canPreviewPath(path), path).toBe(false);
    }
  });

  it('reads the name and nothing else, so HTML content grants nothing', () => {
    // The signature is the proof: there is no parameter to pass bytes in.
    expect(canPreviewPath.length).toBe(1);

    // The same document, written to files with four names. Only the name
    // decides, and content sniffing would have said yes to all four.
    expect(REAL_HTML.startsWith('<!doctype html>')).toBe(true);
    expect(canPreviewPath('/p/report.html')).toBe(true);
    expect(canPreviewPath('/p/report.txt')).toBe(false);
    expect(canPreviewPath('/p/report')).toBe(false);
    expect(canPreviewPath('/p/.env')).toBe(false);
  });

  it('separates "is HTML" from "may be previewed", because they differ', () => {
    // The handler asks the first question to decide whether to rewrite
    // anchors on a response. The editor asks the second to decide whether a
    // tab gets the Preview control. A secret named .html answers them
    // differently, and that is the whole reason there are two functions.
    expect(isHtmlPath('/p/.env.html')).toBe(true);
    expect(canPreviewPath('/p/.env.html')).toBe(false);
  });
});

describe('the files that must never be rendered', () => {
  it('refuses every example on every rule', () => {
    for (const rule of NEVER_PREVIEW) {
      for (const example of rule.examples) {
        expect(looksLikeSecretPath(example), `${rule.what}: ${example}`).toBe(
          true
        );
        expect(canPreviewPath(example), `${rule.what}: ${example}`).toBe(false);
        expect(previewMediaType(example), `${rule.what}: ${example}`).toBe(
          null
        );
      }
    }
  });

  it('refuses them at any depth and under any project root', () => {
    for (const path of [
      '/Users/gdc/proj/.env',
      '/Users/gdc/proj/services/api/.env.production',
      '/Users/gdc/proj/certs/server.pem',
      '/Users/gdc/proj/.ssh/id_rsa',
      '/Users/gdc/proj/src/main/resources/application.properties',
      '/Users/gdc/proj/.netrc',
      '/Users/gdc/proj/deploy/.htpasswd'
    ]) {
      expect(canPreviewPath(path), path).toBe(false);
      expect(isPreviewServablePath(path), path).toBe(false);
    }
  });

  it('covers the seven names the phase brief listed by name', () => {
    // dotenv, key, pem, id_rsa, properties, netrc, htpasswd. Written as a
    // list rather than as prose so removing a rule breaks this test.
    const brief = [
      '.env',
      'private.key',
      'server.pem',
      'id_rsa',
      'application.properties',
      '.netrc',
      '.htpasswd'
    ];
    for (const name of brief) {
      expect(looksLikeSecretPath(name), name).toBe(true);
    }
  });

  it('gives every rule a reason and at least one example', () => {
    for (const rule of NEVER_PREVIEW) {
      expect(rule.what.length, rule.what).toBeGreaterThan(0);
      expect(rule.reason.length, rule.what).toBeGreaterThan(20);
      expect(rule.examples.length, rule.what).toBeGreaterThan(0);
    }
  });

  it('does not refuse an ordinary project file by accident', () => {
    for (const path of [
      '/p/docs/index.html',
      '/p/environment.html',
      '/p/keyboard.css',
      '/p/monkey.png',
      '/p/properties-of-water.html'
    ]) {
      expect(looksLikeSecretPath(path), path).toBe(false);
    }
  });
});

describe('what the preview protocol may stream', () => {
  it('serves the five groups a scriptless page actually needs', () => {
    expect(previewMediaType('/p/index.html')).toBe('text/html; charset=utf-8');
    expect(previewMediaType('/p/site.css')).toBe('text/css; charset=utf-8');
    expect(previewMediaType('/p/logo.png')).toBe('image/png');
    expect(previewMediaType('/p/inter.woff2')).toBe('font/woff2');
    expect(previewMediaType('/p/clip.mp4')).toBe('video/mp4');
  });

  it('refuses script and data, which the page cannot use anyway', () => {
    // The child response policy is `default-src 'none'` with no `script-src`,
    // so Chromium refuses these whether or not the handler would serve them.
    // Leaving them out means the request never reaches the disk and never
    // spends a slot from the per-document request budget.
    for (const path of [
      '/p/app.js',
      '/p/app.mjs',
      '/p/app.js.map',
      '/p/data.json',
      '/p/engine.wasm',
      '/p/notes.txt'
    ]) {
      expect(isPreviewServablePath(path), path).toBe(false);
    }
  });

  it('is its own set, and did not grow the image viewer set', () => {
    // IMAGE_EXTENSIONS also decides what opens in the image viewer. If a later
    // edit merges the two, a stylesheet starts claiming an image tab.
    expect(PREVIEW_SERVED_EXTENSIONS.has('.css')).toBe(true);
    expect(IMAGE_EXTENSIONS.has('.css')).toBe(false);
    expect(PREVIEW_SERVED_EXTENSIONS.has('.woff2')).toBe(true);
    expect(IMAGE_EXTENSIONS.has('.woff2')).toBe(false);
    expect(IMAGE_EXTENSIONS.has('.html')).toBe(false);
  });

  it('answers null after a symlink resolves to a key', () => {
    // The handler re-asks this question with the REAL path, so a link named
    // logo.png pointing at ~/.ssh/id_rsa comes back spelled id_rsa. This is
    // the call that has to say no.
    expect(previewMediaType('/p/docs/logo.png')).toBe('image/png');
    expect(previewMediaType('/Users/gdc/.ssh/id_rsa')).toBe(null);
    expect(previewMediaType('/Users/gdc/certs/server.pem')).toBe(null);
  });

  it('refuses a secret name even when its extension is servable', () => {
    // The refusal list runs before the served set, and these are the cases
    // that prove it does. Without that order each of these is served.
    expect(previewMediaType('/p/logo.svg')).toBe('image/svg+xml');
    expect(previewMediaType('/p/.env.svg')).toBe(null);
    expect(previewMediaType('/p/keys/id_rsa.png')).toBe(null);
    expect(canPreviewPath('/p/.env.local.html')).toBe(false);
  });
});
