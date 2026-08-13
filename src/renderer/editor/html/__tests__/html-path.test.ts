/**
 * The gate the editor panel actually calls (Phase 20.5).
 *
 * The allowlist and the refusal list live in src/shared/preview-types.ts and
 * are tested there. What is tested here is the one thing this module owns:
 * the panel asks a TAB whether it has a rendered form, and that question has
 * to give the same answer whether or not `openFromRequest` has computed the
 * flag yet.
 *
 * The secret cases are checked a second time on purpose, at the point of
 * use. There are 79 `.env.*` files, 8 files named `id_rsa` and 6 `.pem`
 * files tracked in git on this machine, and the harm of a rendered view of
 * one is that it turns a file that took effort to read into a screenshot.
 * One duplicated test is cheap next to that.
 */

import { describe, expect, it } from 'vitest';
import { tabRendersHtml } from '../html-path';

describe('does this tab have a rendered form', () => {
  it('says yes for an HTML document', () => {
    expect(tabRendersHtml({ path: '/repo/docs/index.html' })).toBe(true);
    expect(tabRendersHtml({ path: '/repo/old/page.htm' })).toBe(true);
    expect(tabRendersHtml({ path: '/repo/INDEX.HTML' })).toBe(true);
  });

  it('says no for everything the phase did not ship', () => {
    for (const path of [
      '/repo/index.xhtml',
      '/repo/index.html.tmpl',
      '/repo/page.hbs',
      '/repo/README.md',
      '/repo/logo.svg',
      '/repo/data.csv',
      '/repo/paper.pdf',
      '/repo/notes.ipynb',
      '/repo/main.ts',
      '/repo/index',
      '/repo/.html'
    ]) {
      expect(tabRendersHtml({ path }), path).toBe(false);
    }
  });

  it('never says yes for a file that carries a secret', () => {
    for (const path of [
      '/repo/.env',
      '/repo/.env.local',
      '/repo/.env.production',
      '/repo/keys/id_rsa',
      '/repo/keys/id_ed25519',
      '/repo/keys/server.pem',
      '/repo/keys/tls.key',
      '/repo/certs/ca.cer',
      '/repo/app.keystore',
      '/repo/.netrc',
      '/repo/.htpasswd',
      '/repo/application.properties'
    ]) {
      expect(tabRendersHtml({ path }), path).toBe(false);
    }
  });

  it('refuses a secret even when it is spelled as a page', () => {
    // `.env.local.html` opens with `.env.`, so the refusal list catches it
    // before the allowlist ever sees the extension.
    expect(tabRendersHtml({ path: '/repo/.env.local.html' })).toBe(false);
  });

  it('believes the store when the store has an opinion', () => {
    expect(tabRendersHtml({ path: '/repo/index.html', html: false })).toBe(
      false
    );
    expect(tabRendersHtml({ path: '/repo/generated', html: true })).toBe(true);
  });

  it('falls back to the shared predicate while the flag is not there', () => {
    expect(tabRendersHtml({ path: '/repo/index.html' })).toBe(true);
    expect(tabRendersHtml({ path: '/repo/main.ts' })).toBe(false);
  });
});
