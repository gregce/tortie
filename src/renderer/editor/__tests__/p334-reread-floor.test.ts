/**
 * PHASE 334. THE FLOOR ON A RETURN'S RE-READ, AND WHAT COUNTS AS ENTERING.
 *
 * ./reread-on-return is pure, so its two promises are driven here with a clock
 * the test owns and a container that answers `contains` from a list:
 *
 *   F1  one look per repository per floor, leading edge: the first is
 *       admitted, a second inside 1,000 ms is refused, one at exactly 1,000 ms
 *       is admitted (the refusal is `t - last < floor`, strict);
 *   F2  each repository has its own floor;
 *   F3  a clock that reads EARLIER than the last admission admits, so a clock
 *       that went backwards never shuts the door;
 *   F4  `focusEntersFrom`: no previous holder is entering, a holder the
 *       container contains is a move inside it, one it does not is entering.
 *
 * build/p334/SPEC.md §4.1 and D5.
 */

import { describe, expect, it } from 'vitest';
import { REREAD_FLOOR_MS, createRereadFloor, focusEntersFrom } from '../reread-on-return';

function clocked(): { at: (t: number) => void; now: () => number } {
  let t = 0;
  return {
    at: (next) => {
      t = next;
    },
    now: () => t
  };
}

describe('REREAD_FLOOR_MS', () => {
  it('is the measured second (build/p334/SPEC.md §2)', () => {
    expect(REREAD_FLOOR_MS).toBe(1_000);
  });
});

describe('F1. one look per repository per floor, leading edge', () => {
  it('admits the first, refuses inside the floor, admits at exactly the floor', () => {
    const clock = clocked();
    const floor = createRereadFloor(REREAD_FLOOR_MS, clock.now);
    clock.at(5_000);
    expect(floor.admit('/r')).toBe(true);
    clock.at(5_001);
    expect(floor.admit('/r')).toBe(false);
    clock.at(5_999);
    expect(floor.admit('/r')).toBe(false);
    clock.at(6_000);
    expect(floor.admit('/r')).toBe(true);
  });

  it('a refused look records nothing: the floor runs from the last ADMISSION', () => {
    const clock = clocked();
    const floor = createRereadFloor(1_000, clock.now);
    clock.at(0);
    expect(floor.admit('/r')).toBe(true);
    clock.at(900);
    expect(floor.admit('/r')).toBe(false);
    // Were the refusal at 900 recorded, 1,000 would still be inside a floor.
    clock.at(1_000);
    expect(floor.admit('/r')).toBe(true);
  });

  it('reads the clock at the call, not at construction', () => {
    const clock = clocked();
    clock.at(10_000);
    const floor = createRereadFloor(1_000, clock.now);
    clock.at(20_000);
    expect(floor.admit('/r')).toBe(true);
    clock.at(20_500);
    expect(floor.admit('/r')).toBe(false);
  });
});

describe('F2. two repositories are independent', () => {
  it('a look at one never consumes the other', () => {
    const clock = clocked();
    const floor = createRereadFloor(1_000, clock.now);
    clock.at(100);
    expect(floor.admit('/a')).toBe(true);
    clock.at(110);
    expect(floor.admit('/b')).toBe(true);
    clock.at(120);
    expect(floor.admit('/a')).toBe(false);
    expect(floor.admit('/b')).toBe(false);
    clock.at(1_100);
    expect(floor.admit('/a')).toBe(true);
    expect(floor.admit('/b')).toBe(false);
  });
});

describe('F3. a clock that went backwards admits', () => {
  it('a reading earlier than the last admission is admitted and becomes the new mark', () => {
    const clock = clocked();
    const floor = createRereadFloor(1_000, clock.now);
    clock.at(50_000);
    expect(floor.admit('/r')).toBe(true);
    clock.at(49_999);
    expect(floor.admit('/r')).toBe(true);
    // The admission at 49,999 is the mark now, so the floor runs from it.
    clock.at(50_500);
    expect(floor.admit('/r')).toBe(false);
    clock.at(50_999);
    expect(floor.admit('/r')).toBe(true);
  });
});

describe('F4. focusEntersFrom', () => {
  const inside = { id: 'inside' } as unknown as Node;
  const outside = { id: 'outside' } as unknown as Node;
  const container = {
    contains: (other: Node | null): boolean => other === inside
  };

  it('no previous holder is entering', () => {
    expect(focusEntersFrom(container, null)).toBe(true);
  });

  it('no previous holder is decided before the container is asked anything', () => {
    // A container whose `contains(null)` answers true (a host that treats null
    // as itself) must not turn "focus came from nowhere" into a move inside it.
    const asked: Array<Node | null> = [];
    const generous = {
      contains: (other: Node | null): boolean => {
        asked.push(other);
        return true;
      }
    };
    expect(focusEntersFrom(generous, null)).toBe(true);
    expect(asked).toEqual([]);
  });

  it('a previous holder inside the container is a move within it, not entering', () => {
    expect(focusEntersFrom(container, inside as unknown as EventTarget)).toBe(false);
  });

  it('a previous holder outside the container is entering', () => {
    expect(focusEntersFrom(container, outside as unknown as EventTarget)).toBe(true);
  });
});
