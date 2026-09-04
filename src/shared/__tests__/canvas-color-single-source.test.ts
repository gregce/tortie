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

import { windowBackgroundFor } from '../chrome-hue';
import { DEFAULT_CHROME_HUE } from '../settings';
import { WINDOW_BACKGROUND, WINDOW_BACKGROUND_LIGHT } from '../window-chrome';

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

  it('matches the LIGHT token in tokens.css (Phase 213)', () => {
    // The light base is the `:root[data-scheme='light']` block, and its
    // canvas has the same three mirrors the dark one has.
    const tokens = read('renderer', 'styles', 'tokens.css');
    const block = tokens.slice(tokens.indexOf(":root[data-scheme='light']"));
    const declared = /--bg-canvas:\s*(#[0-9a-fA-F]{3,8})\s*;/.exec(block);
    expect(declared, 'the light block must declare --bg-canvas').not.toBeNull();
    expect(declared?.[1]?.toLowerCase()).toBe(WINDOW_BACKGROUND_LIGHT.toLowerCase());
    expect(WINDOW_BACKGROUND_LIGHT.toLowerCase()).not.toBe(WINDOW_BACKGROUND.toLowerCase());
  });

  it('matches the light pre-paint ground in both HTML entries (Phase 213)', () => {
    for (const html of [
      ['renderer', 'index.html'],
      ['renderer', 'settings', 'index.html']
    ]) {
      const source = read(...html);
      const ground = /html\[data-scheme='light'\]\s*\{[^}]*background:\s*(#[0-9a-fA-F]{3,8})\s*;/.exec(
        source
      );
      expect(ground, `${html.join('/')} must set a light html background`).not.toBeNull();
      expect(
        ground?.[1]?.toLowerCase(),
        `${html.join('/')} light pre-paint ground drifted from the light --bg-canvas`
      ).toBe(WINDOW_BACKGROUND_LIGHT.toLowerCase());
      expect(/html\[data-scheme='light'\]\s*\{[^}]*color-scheme:\s*light/.test(source)).toBe(true);
    }
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
    // Phase 207: both windows compose their fill from the persisted hue
    // through windowBackgroundNow (src/main/settings/chrome.ts), which is
    // WINDOW_BACKGROUND itself at the shipped hue and the same shared
    // rotation the renderer writes into --bg-canvas otherwise. Neither file
    // spells a literal.
    for (const file of [
      ['main', 'index.ts'],
      ['main', 'settings', 'window.ts']
    ]) {
      const source = read(...file);
      expect(
        /backgroundColor:\s*windowBackgroundNow\(\)/.test(source),
        `${file.join('/')} must use windowBackgroundNow(), not a literal`
      ).toBe(true);
      expect(/backgroundColor:\s*['"#]/.test(source)).toBe(false);
    }
    expect(windowBackgroundFor(DEFAULT_CHROME_HUE)).toBe(WINDOW_BACKGROUND);
  });
});
