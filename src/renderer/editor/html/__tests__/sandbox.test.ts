/**
 * The frame attribute is exactly `sandbox=""`, asserted on the literal text
 * of the component (Phase 20.5, research 39 §2.3).
 *
 * WHY THIS TEST READS A FILE INSTEAD OF RENDERING ONE.
 *
 * The thing being protected is a string in the source, and the way it breaks
 * is a later refactor that widens it by one keyword because something did
 * not work. Two keywords were measured and each one costs the whole design:
 *
 *   allow-same-origin  the child takes the parent's origin. A probe read
 *                      `window.parent.gmux` and got "object", read the
 *                      parent's document title, and read 9,196 bytes of
 *                      /etc/passwd. `wc -c /etc/passwd` on this machine is
 *                      9,196.
 *   allow-scripts      script runs. Its absence is the only thing refusing
 *                      `<meta http-equiv="refresh">` to a remote host, and
 *                      with it 11 of 11 probes reached a local sink under a
 *                      relaxed policy, because the sandbox attribute has
 *                      never been a network control.
 *
 * A rendering test would prove the attribute reaches the DOM once. This
 * proves the source cannot say anything else, including in a file that is
 * added to the module later, which is the failure that actually happens.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const HTML_DIR = resolve(__dirname, '..');
const COMPONENT = join(HTML_DIR, 'HtmlPreview.tsx');

/**
 * Every SHIPPED source file in the module. The tests are excluded because
 * this file has to name the forbidden keywords in order to forbid them.
 */
function moduleFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === '__tests__') continue;
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else out.push(path);
    }
  };
  walk(HTML_DIR);
  return out;
}

/**
 * Every keyword the attribute can take. The two at the top are the ones with
 * a measurement behind them; the rest are here because "sandbox with one
 * harmless keyword" is how a widening starts, and none of them is needed by
 * a document that is only being read.
 */
const SANDBOX_KEYWORDS = [
  'allow-same-origin',
  'allow-scripts',
  'allow-downloads',
  'allow-forms',
  'allow-modals',
  'allow-orientation-lock',
  'allow-pointer-lock',
  'allow-popups',
  'allow-popups-to-escape-sandbox',
  'allow-presentation',
  'allow-storage-access-by-user-activation',
  'allow-top-navigation',
  'allow-top-navigation-by-user-activation',
  'allow-top-navigation-to-custom-protocols'
];

describe('the preview frame carries an empty sandbox attribute', () => {
  const component = readFileSync(COMPONENT, 'utf8');

  it('spells it as the literal string `sandbox=""`', () => {
    const literals = component.match(/sandbox=""/g) ?? [];
    expect(
      literals.length,
      'HtmlPreview.tsx must contain exactly one `sandbox=""`'
    ).toBe(1);
  });

  it('writes the attribute nowhere else and no other way', () => {
    // `sandbox={…}` would move the value out of this file, where this test
    // cannot see it. An empty attribute is the only accepted spelling.
    const anySandboxAttribute = component.match(/\bsandbox\s*=/g) ?? [];
    expect(anySandboxAttribute.length).toBe(1);
  });

  it('puts it on the iframe and not on something else', () => {
    const frame = /<iframe\b[\s\S]*?\/>/.exec(component);
    expect(frame, 'HtmlPreview.tsx must render exactly one iframe').not.toBeNull();
    expect(frame?.[0]).toContain('sandbox=""');
  });

  it('renders exactly one iframe in the whole module', () => {
    let frames = 0;
    for (const file of moduleFiles()) {
      if (!file.endsWith('.tsx')) continue;
      frames += (readFileSync(file, 'utf8').match(/<iframe\b/g) ?? []).length;
    }
    expect(frames).toBe(1);
  });

  it('names no sandbox keyword anywhere in the module', () => {
    const offenders: string[] = [];
    for (const file of moduleFiles()) {
      if (file === COMPONENT) continue;
      const text = readFileSync(file, 'utf8');
      for (const keyword of SANDBOX_KEYWORDS) {
        if (text.includes(keyword)) offenders.push(`${file}: ${keyword}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('names the two dangerous keywords in the component only to refuse them', () => {
    // The component's own comment explains what each one costs, so the
    // strings are in the file on purpose. What must not be there is either
    // of them inside an attribute.
    expect(component).toContain('allow-same-origin');
    expect(component).toContain('allow-scripts');
    expect(/sandbox\s*=\s*"[^"]+"/.test(component)).toBe(false);
    expect(/sandbox\s*=\s*'[^']+'/.test(component)).toBe(false);
  });
});
