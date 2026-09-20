/**
 * Phase 293, the fix round. The second click of a double click inside the
 * session manager presses nothing (the batch attack's P1, major).
 *
 * The attack: a double click at the centre of `End 2 sessions`. The first
 * click ran the batch, the targets ended in under 150 ms, the panel closed by
 * itself and the grid slid up; the second click landed on an ended row's
 * Restore and restored a session nobody named, four times in four. The rule is
 * one function at the sheet root, in the capture phase, so these tests hold
 * the function over plain events and hold, as source text, that the root is
 * where it is wired. The app run is the attack's own driver, re-run.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  isRepeatClickOnControl,
  swallowRepeatClick
} from '../repeat-click';

/** A target that answers `closest` for the one selector the rule asks. */
function target(isControl: boolean): { closest: (selector: string) => unknown } {
  return {
    closest: (selector: string) => {
      expect(selector).toBe('button, input, label');
      return isControl ? { tagName: 'BUTTON' } : null;
    }
  };
}

function click(detail: number, onControl: boolean) {
  return {
    detail,
    target: target(onControl),
    preventDefault: vi.fn(),
    stopPropagation: vi.fn()
  };
}

describe('a repeated click on a control is swallowed', () => {
  it.each([2, 3, 4])('detail %i on a button, a checkbox or a label: prevented and stopped', (detail) => {
    const e = click(detail, true);
    swallowRepeatClick(e);
    expect(e.preventDefault).toHaveBeenCalledTimes(1);
    expect(e.stopPropagation).toHaveBeenCalledTimes(1);
    expect(isRepeatClickOnControl(e)).toBe(true);
  });

  it('the FIRST click is never touched: every control acts on it', () => {
    const e = click(1, true);
    swallowRepeatClick(e);
    expect(e.preventDefault).not.toHaveBeenCalled();
    expect(e.stopPropagation).not.toHaveBeenCalled();
  });

  it('a key press (detail 0) is never touched: Enter and Space press a button once each', () => {
    const e = click(0, true);
    swallowRepeatClick(e);
    expect(e.preventDefault).not.toHaveBeenCalled();
    expect(e.stopPropagation).not.toHaveBeenCalled();
  });

  it('a repeated click on no control (a cell, the scroller) is left alone', () => {
    const e = click(2, false);
    swallowRepeatClick(e);
    expect(e.preventDefault).not.toHaveBeenCalled();
    expect(e.stopPropagation).not.toHaveBeenCalled();
  });

  it('a target with no `closest` (a text node, nothing) is left alone', () => {
    for (const t of [null, undefined, 'text', {}]) {
      const e = { detail: 2, target: t, preventDefault: vi.fn(), stopPropagation: vi.fn() };
      swallowRepeatClick(e);
      expect(e.preventDefault).not.toHaveBeenCalled();
    }
  });
});

describe('where it is wired (source text)', () => {
  const sheet = readFileSync(
    resolve(import.meta.dirname, '..', 'SessionManagerSheet.tsx'),
    'utf8'
  );
  const code = sheet.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/.*$/gm, ' ');

  it('on the sheet root, in the CAPTURE phase, so no row control sees the repeat', () => {
    const root = code.indexOf('className="modal session-sheet"');
    expect(root).toBeGreaterThan(-1);
    const tagEnd = code.indexOf('>', code.indexOf('onKeyDown=', root));
    const tag = code.slice(root, tagEnd);
    expect(tag).toContain('onClickCapture={swallowRepeatClick}');
  });

  it('the keyboard is pulled back on focusin, registered and removed on the document', () => {
    expect(code).toContain("document.addEventListener('focusin', onFocusIn, true)");
    expect(code).toContain("document.removeEventListener('focusin', onFocusIn, true)");
    expect(code).toContain('reclaimSheetKeyboard(lastFocus.current)');
  });
});
