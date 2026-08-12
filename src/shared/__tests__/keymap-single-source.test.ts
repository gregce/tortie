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

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
// The scanner this guardrail shares with ipc-single-bridge.test.ts.
import { SRC, relPath, sourceFiles, stripComments } from './source-scan';

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
  'main/menu-popup.ts': 'glyph → accelerator parser for native popup menus',
  // Harness console output, never user-visible.
  'renderer/zoom/shot-probe.ts': 'screenshot-probe logging'
};

describe('the keymap is the only place a chord is spelled', () => {
  it('finds no modifier glyph in code outside src/shared/keymap.ts', () => {
    const offenders: string[] = [];
    for (const file of sourceFiles(SRC)) {
      const rel = relPath(file);
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
    const present = new Set(sourceFiles(SRC).map(relPath));
    for (const rel of Object.keys(ALLOWED)) {
      expect(present.has(rel), `${rel} is allow-listed but gone`).toBe(true);
    }
  });
});
