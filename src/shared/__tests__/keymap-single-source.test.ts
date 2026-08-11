/**
 * The guardrail that keeps Phase 12.12 item 5 true after the phase ships.
 *
 * The keymap being data is only half the work; the half that rots is the
 * SURFACES. Before 12.12 the ⌘/ overlay, the recorder's reserved table and
 * src/main/menu.ts each carried their own chords, and they drifted — that is
 * how the ⇧↩ row went missing the same phase that shipped it, and how ⇧⌘N
 * never became a chord the recorder would refuse. Rewiring those three fixed
 * the past. This test is what stops the next one, and it is deliberately
 * blunt: **a modifier glyph in executable source is a bug.**
 *
 * The fix when this fails is never to widen the allow-list. It is to add the
 * shortcut to src/shared/keymap.ts (if it is missing) and read it back with
 * `keyDisplay(id)` / `accelerator(id)` / `acceleratorToDisplay(accel)`.
 *
 * Comments are exempt: prose that says "the ⌘T sheet" is documentation, and
 * documentation naming a shortcut is what we want. Only code is scanned.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = resolve(__dirname, '..', '..');

/** The modifier glyphs. A bare ↩ or ⇥ is punctuation; a modifier is not. */
const MODIFIER_GLYPHS = /[⌘⌥⇧⌃]/;

/**
 * The only files allowed to spell a modifier in code, and why. Every entry
 * describes a MECHANISM, not a convenience — which is the test for whether a
 * new one belongs.
 */
const ALLOWED: Readonly<Record<string, string>> = {
  // The single source itself: the glyph table and the formatter live here.
  'shared/keymap.ts': 'the keymap — this is where chords are spelled',
  // Validation copy about the CLASS of modifiers a chord must contain. There
  // is no keymap row behind "a shortcut needs ⌘ or ⌃" — it is a rule, not a
  // shortcut, so there is nothing to derive it from.
  'renderer/settings/chords.ts': 'names the modifier class, not a shortcut',
  'renderer/settings/keyboard-conflicts.ts':
    'names the modifier class, not a shortcut',
  // The inverse of acceleratorToDisplay, at the native-menu boundary: a
  // display hint (already produced by the keymap) back to an Electron
  // accelerator for Menu.popup. It reads glyphs; it does not author them.
  'main/ipc.ts': 'glyph → accelerator parser for native popup menus',
  // Harness console output, never user-visible.
  'renderer/zoom/shot-probe.ts': 'screenshot-probe logging'
};

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name === '__tests__') continue;
      sourceFiles(full, out);
    } else if (name.endsWith('.ts') || name.endsWith('.tsx')) {
      out.push(full);
    }
  }
  return out;
}

/**
 * Blank out comments so only executable text is scanned. Block comments are
 * tracked across lines; a line comment counts only when the `//` is not
 * inside a string on that line, which is conservative in the right direction
 * — an unrecognised comment is scanned, never skipped.
 */
function stripComments(source: string): string {
  const out: string[] = [];
  let inBlock = false;
  for (const line of source.split('\n')) {
    let text = line;
    if (inBlock) {
      const end = text.indexOf('*/');
      if (end < 0) {
        out.push('');
        continue;
      }
      text = text.slice(end + 2);
      inBlock = false;
    }
    for (;;) {
      const start = text.indexOf('/*');
      if (start < 0) break;
      const end = text.indexOf('*/', start + 2);
      if (end < 0) {
        text = text.slice(0, start);
        inBlock = true;
        break;
      }
      text = text.slice(0, start) + text.slice(end + 2);
    }
    const slashes = text.indexOf('//');
    if (slashes >= 0 && !/['"`]/.test(text.slice(0, slashes))) {
      text = text.slice(0, slashes);
    }
    out.push(text);
  }
  return out.join('\n');
}

describe('the keymap is the only place a chord is spelled', () => {
  it('finds no modifier glyph in code outside src/shared/keymap.ts', () => {
    const offenders: string[] = [];
    for (const file of sourceFiles(SRC)) {
      const rel = relative(SRC, file).split(sep).join('/');
      if (ALLOWED[rel] !== undefined) continue;
      const lines = stripComments(readFileSync(file, 'utf8')).split('\n');
      lines.forEach((line, i) => {
        if (MODIFIER_GLYPHS.test(line)) {
          offenders.push(`${rel}:${i + 1}: ${line.trim()}`);
        }
      });
    }
    expect(offenders).toEqual([]);
  });

  it('keeps the allow-list honest — every entry still exists', () => {
    const present = new Set(
      sourceFiles(SRC).map((f) => relative(SRC, f).split(sep).join('/'))
    );
    for (const rel of Object.keys(ALLOWED)) {
      expect(present.has(rel), `${rel} is allow-listed but gone`).toBe(true);
    }
  });
});
