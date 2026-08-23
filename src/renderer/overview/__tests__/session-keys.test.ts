/**
 * The session level keyboard's state machine (Phase 137.2).
 *
 * The module is plain state with no DOM of its own, so these tests drive it
 * with fake hooks and a fake scroller and read the snapshot back. What only
 * the running app can prove, the tracking rectangles and the real Escape
 * ladder, lives in build/probe-p137-overview.mjs.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  askRailTookEscape,
  handleSessionLevelKey,
  jumpToAsk,
  railSnapshot,
  registerConversation,
  scrollTurnIntoView,
  subscribeRail
} from '../session-keys';

function fakeScroller(rowCount: number): {
  el: HTMLElement;
  landed: () => number[];
} {
  const landings: number[] = [];
  const el = {
    querySelectorAll: () =>
      Array.from({ length: rowCount }, (_, i) => ({
        scrollIntoView: () => {
          landings.push(i);
        }
      }))
  } as unknown as HTMLElement;
  return { el, landed: () => landings };
}

function key(name: string): {
  key: string;
  prevented: () => boolean;
  preventDefault(): void;
  stopPropagation(): void;
} {
  let prevented = false;
  return {
    key: name,
    prevented: () => prevented,
    preventDefault() {
      prevented = true;
    },
    stopPropagation() {
      /* recorded through prevented */
    }
  };
}

function mount(turnCount: number, startSelected: number) {
  const { el, landed } = fakeScroller(turnCount);
  let selected = startSelected;
  const selections: number[] = [];
  registerConversation({
    scroller: el,
    turnCount,
    selected: () => selected,
    select: (i) => {
      selected = i;
      selections.push(i);
    }
  });
  return { landed, selections, selectedNow: () => selected };
}

afterEach(() => {
  registerConversation(null);
});

describe('outside the rail', () => {
  it('consumes nothing but Tab, so the layer keeps its own arrows and Return', () => {
    mount(5, 4);
    for (const name of ['ArrowUp', 'ArrowDown', 'Enter', 'Escape']) {
      const e = key(name);
      expect(handleSessionLevelKey(e), name).toBe(false);
      expect(e.prevented(), name).toBe(false);
    }
    expect(railSnapshot().active).toBe(false);
  });

  it('falls through entirely when no conversation is mounted', () => {
    registerConversation(null);
    expect(handleSessionLevelKey(key('Tab'))).toBe(false);
  });

  it('falls through when the session has no turns, because there is no rail', () => {
    mount(0, 0);
    expect(handleSessionLevelKey(key('Tab'))).toBe(false);
  });

  it('Tab activates the rail with the cursor on the selected exchange', () => {
    mount(5, 3);
    const e = key('Tab');
    expect(handleSessionLevelKey(e)).toBe(true);
    expect(e.prevented()).toBe(true);
    expect(railSnapshot()).toEqual({ active: true, cursor: 3 });
  });
});

describe('inside the rail', () => {
  it('the arrows move the cursor and never the selection', () => {
    const { selections } = mount(5, 3);
    handleSessionLevelKey(key('Tab'));
    expect(handleSessionLevelKey(key('ArrowUp'))).toBe(true);
    expect(railSnapshot().cursor).toBe(2);
    expect(handleSessionLevelKey(key('ArrowDown'))).toBe(true);
    expect(railSnapshot().cursor).toBe(3);
    expect(selections).toEqual([]);
  });

  it('the cursor clamps at both ends', () => {
    mount(3, 0);
    handleSessionLevelKey(key('Tab'));
    handleSessionLevelKey(key('ArrowUp'));
    expect(railSnapshot().cursor).toBe(0);
    handleSessionLevelKey(key('ArrowDown'));
    handleSessionLevelKey(key('ArrowDown'));
    handleSessionLevelKey(key('ArrowDown'));
    expect(railSnapshot().cursor).toBe(2);
  });

  it('Return jumps through jumpToAsk: selects the cursor row and lands it', () => {
    const { landed, selections } = mount(6, 5);
    handleSessionLevelKey(key('Tab'));
    handleSessionLevelKey(key('ArrowUp'));
    handleSessionLevelKey(key('ArrowUp'));
    expect(handleSessionLevelKey(key('Enter'))).toBe(true);
    expect(selections).toEqual([3]);
    expect(landed()).toEqual([3]);
    expect(railSnapshot().active).toBe(true);
  });

  it('Tab returns the keyboard to the conversation', () => {
    mount(5, 2);
    handleSessionLevelKey(key('Tab'));
    expect(handleSessionLevelKey(key('Tab'))).toBe(true);
    expect(railSnapshot().active).toBe(false);
  });
});

describe('Escape and the window ladder', () => {
  it('askRailTookEscape answers true exactly once per activation', () => {
    mount(5, 2);
    expect(askRailTookEscape()).toBe(false);
    handleSessionLevelKey(key('Tab'));
    expect(askRailTookEscape()).toBe(true);
    expect(railSnapshot().active).toBe(false);
    expect(askRailTookEscape()).toBe(false);
  });

  it('the ladder in keyboard.ts asks the rail before it steps the page back', () => {
    const source = readFileSync(
      join(__dirname, '..', '..', 'app', 'keyboard.ts'),
      'utf8'
    );
    const guard = source.indexOf('if (askRailTookEscape()) return;');
    const back = source.indexOf('void backOrLeaveOverview();');
    expect(guard).toBeGreaterThan(-1);
    expect(back).toBeGreaterThan(-1);
    expect(guard).toBeLessThan(back);
  });
});

describe('jumpToAsk, the one landing function', () => {
  it('selects and scrolls the same index for a rail press', () => {
    const { landed, selections } = mount(10, 9);
    jumpToAsk(4);
    expect(selections).toEqual([4]);
    expect(landed()).toEqual([4]);
  });

  it('clamps an index past either end', () => {
    const { selections } = mount(3, 0);
    jumpToAsk(99);
    jumpToAsk(-1);
    expect(selections).toEqual([2, 0]);
  });

  it('scrollTurnIntoView lands by row position, not by payload index', () => {
    const { el, landed } = fakeScroller(4);
    scrollTurnIntoView(el, 2);
    expect(landed()).toEqual([2]);
  });
});

describe('unmount and remount', () => {
  it('a new registration with fewer turns drops a stale active cursor', () => {
    mount(10, 9);
    handleSessionLevelKey(key('Tab'));
    handleSessionLevelKey(key('ArrowUp'));
    expect(railSnapshot()).toEqual({ active: true, cursor: 8 });
    mount(3, 0);
    expect(railSnapshot().active).toBe(false);
  });

  it('subscribers hear every change', () => {
    mount(5, 1);
    let heard = 0;
    const stop = subscribeRail(() => {
      heard += 1;
    });
    handleSessionLevelKey(key('Tab'));
    handleSessionLevelKey(key('ArrowDown'));
    stop();
    handleSessionLevelKey(key('ArrowDown'));
    expect(heard).toBe(2);
  });
});
