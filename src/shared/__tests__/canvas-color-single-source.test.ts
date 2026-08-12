/**
 * Guardrail 5, for the one colour that cannot come from a CSS token.
 *
 * `--bg-canvas` is the app's ground, and three places have to paint it before
 * `tokens.css` can possibly apply:
 *
 *   1. `BrowserWindow({ backgroundColor })` — the compositor fills the window
 *      before a renderer exists. Main cannot read a custom property.
 *   2. the two `index.html` inline `<style>` blocks — the document's ground
 *      before any stylesheet has been fetched.
 *
 * Each is a legitimate mirror; four independent literals of the same colour
 * are not. This test makes them one fact with three copies that must agree,
 * which is the difference between a mirror and a second source of truth. If
 * `--bg-canvas` is ever retuned, this fails and names every site to change.
 *
 * It deliberately does NOT scan for other literals — `keymap-single-source`'s
 * shape (a blanket ban plus an allow-list) does not transfer to colour, where
 * `#000`/`#fff` gradient stops, SVG icon fills and the light-background HTML
 * export branch are all correct. Guardrail 5's real content is "no SECOND
 * COPY of the ramp", and the ramp's pre-paint colour is the only piece of it
 * that lives outside `tokens.css` by necessity.
 */

import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { WINDOW_BACKGROUND } from '../window-chrome';

const SRC = resolve(__dirname, '..', '..');

function read(...parts: string[]): string {
  return readFileSync(join(SRC, ...parts), 'utf8');
}

describe('--bg-canvas has one value, wherever it has to be spelled', () => {
  it('matches the token in tokens.css', () => {
    const tokens = read('renderer', 'styles', 'tokens.css');
    const declared = /--bg-canvas:\s*(#[0-9a-fA-F]{3,8})\s*;/.exec(tokens);
    expect(declared, '--bg-canvas must be declared in tokens.css').not.toBeNull();
    expect(declared?.[1]?.toLowerCase()).toBe(WINDOW_BACKGROUND.toLowerCase());
  });

  it('matches the pre-paint ground in both HTML entries', () => {
    for (const html of [
      ['renderer', 'index.html'],
      ['renderer', 'settings', 'index.html']
    ]) {
      const source = read(...html);
      const ground = /html\s*\{[^}]*background:\s*(#[0-9a-fA-F]{3,8})\s*;/.exec(
        source
      );
      expect(ground, `${html.join('/')} must set an html background`).not.toBeNull();
      expect(
        ground?.[1]?.toLowerCase(),
        `${html.join('/')} pre-paint ground drifted from --bg-canvas`
      ).toBe(WINDOW_BACKGROUND.toLowerCase());
    }
  });

  it('is the only background colour the main process spells', () => {
    for (const file of [
      ['main', 'index.ts'],
      ['main', 'settings', 'window.ts']
    ]) {
      const source = read(...file);
      expect(
        /backgroundColor:\s*WINDOW_BACKGROUND/.test(source),
        `${file.join('/')} must use WINDOW_BACKGROUND, not a literal`
      ).toBe(true);
    }
  });
});
