/**
 * PHASE 86 — Enter inside a modal, and the one control that opts out of the
 * button skip.
 *
 * The rule these tests hold is small and it has two halves that pull against
 * each other. Enter on a focused BUTTON must run that button and must not
 * also submit the dialog, or Cancel would create a session and Create would
 * create two. Enter on a chosen agent tile must reach the dialog's submit,
 * because a tile is a button only for layout reasons and choosing an agent is
 * a selection rather than an action.
 *
 * `ENTER_SUBMITS_ATTR` is what separates the two. It is set on exactly one
 * control in the product, the ⌘T sheet's agent tile in select mode, so every
 * other button in every other dialog keeps the behaviour it had before this
 * phase. These tests pin both sides of that, and they pin the two guards that
 * were already there, being the IME check and Escape's stopPropagation.
 *
 * The test environment is node and has no HTMLElement, which is exactly why
 * `modalKeyDown` duck types its target on `closest` and `tagName`. The fake
 * elements below are the shape that check reads and nothing more.
 */

import { describe, expect, it, vi } from 'vitest';
import { ENTER_SUBMITS_ATTR, modalKeyDown } from '../focus-trap';

/**
 * The smallest thing `modalKeyDown` will accept as an event target. `marked`
 * decides what `closest('[data-enter-submits]')` answers, which is how a real
 * tile and a real Cancel button differ.
 */
function target(tagName: string, marked = false): object {
  return {
    tagName,
    closest(selector: string): object | null {
      if (selector !== `[${ENTER_SUBMITS_ATTR}]`) return null;
      return marked ? { tagName } : null;
    }
  };
}

type Spy = ReturnType<typeof vi.fn<() => void>>;

interface Recorded {
  submit: Spy;
  close: Spy;
  preventDefault: Spy;
  stopPropagation: Spy;
}

function press(
  key: string,
  from: object | null,
  opts: { isComposing?: boolean } = {}
): Recorded {
  const rec: Recorded = {
    submit: vi.fn<() => void>(),
    close: vi.fn<() => void>(),
    preventDefault: vi.fn<() => void>(),
    stopPropagation: vi.fn<() => void>()
  };
  modalKeyDown(
    {
      key,
      shiftKey: false,
      target: from as EventTarget | null,
      nativeEvent: { isComposing: opts.isComposing === true },
      preventDefault: rec.preventDefault,
      stopPropagation: rec.stopPropagation
    },
    // Only the Tab branch touches the container, and no test here presses Tab.
    null as unknown as HTMLElement,
    { submit: rec.submit, close: rec.close }
  );
  return rec;
}

describe('Enter on a plain button still runs that button and nothing else', () => {
  it('does not submit from an unmarked BUTTON', () => {
    const rec = press('Enter', target('BUTTON'));
    expect(rec.submit).not.toHaveBeenCalled();
    expect(rec.preventDefault).not.toHaveBeenCalled();
  });

  it('does not submit from a button carrying some other attribute', () => {
    const el = {
      tagName: 'BUTTON',
      closest: (selector: string): object | null =>
        selector === '[data-something-else]' ? { tagName: 'BUTTON' } : null
    };
    const rec = press('Enter', el);
    expect(rec.submit).not.toHaveBeenCalled();
  });
});

describe('Enter on a marked control reaches the dialog', () => {
  it('submits exactly once and stops the default', () => {
    const rec = press('Enter', target('BUTTON', true));
    expect(rec.submit).toHaveBeenCalledTimes(1);
    expect(rec.preventDefault).toHaveBeenCalledTimes(1);
  });

  it('submits when the mark is on an ancestor rather than the target', () => {
    const el = {
      tagName: 'SPAN',
      closest: (selector: string): object | null =>
        selector === `[${ENTER_SUBMITS_ATTR}]` ? { tagName: 'BUTTON' } : null
    };
    const rec = press('Enter', el);
    expect(rec.submit).toHaveBeenCalledTimes(1);
  });
});

describe('the guards that were already there', () => {
  it('submits from an INPUT, which is the two key path', () => {
    const rec = press('Enter', target('INPUT'));
    expect(rec.submit).toHaveBeenCalledTimes(1);
  });

  it('does not submit while an IME candidate is being committed', () => {
    const rec = press('Enter', target('INPUT'), { isComposing: true });
    expect(rec.submit).not.toHaveBeenCalled();
  });

  it('treats a target that is not an element as not a button', () => {
    const rec = press('Enter', null);
    expect(rec.submit).toHaveBeenCalledTimes(1);
  });

  it('closes on Escape and stops it reaching anything behind the dialog', () => {
    const rec = press('Escape', target('INPUT'));
    expect(rec.close).toHaveBeenCalledTimes(1);
    expect(rec.stopPropagation).toHaveBeenCalledTimes(1);
    expect(rec.submit).not.toHaveBeenCalled();
  });
});
