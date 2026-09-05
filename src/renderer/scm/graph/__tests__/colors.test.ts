import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  CONFUSABLE_PAIRS,
  LANE_COLOR_VARS,
  createLaneCycler,
  hueKeyOf,
  laneColorVar,
  liveHues,
  sameColor
} from '../colors';
import { layoutGraph } from '../layout';
import { makeRoleResolver } from '../roles';
import { CYCLE_LENGTH } from '../types';
import type { Lane, LaneColor } from '../types';
import {
  contrastRatio,
  hexToRgb,
  readCssTokens,
  separation,
  worstSeparation
} from './contrast';
import {
  GETSPECSTORY_HEAD,
  GETSPECSTORY_MERGE_BASE,
  GETSPECSTORY_TANGLE,
  GETSPECSTORY_UPSTREAM
} from './fixtures/getspecstory';

const lane = (sha: string, color: LaneColor): Lane => ({ sha, color });
const cycle = (slot: number): LaneColor => ({ kind: 'cycle', slot });
const role = (r: 'local' | 'remote' | 'base'): LaneColor => ({
  kind: 'role',
  role: r
});

describe('hue identity', () => {
  it('collapses a role onto the rotating slot it falls back to', () => {
    // While the upstream lane is on screen its hue IS lane 3's cyan, so the
    // rotation must not hand cyan to something else and claim two different
    // lines of history are the same one.
    expect(hueKeyOf(role('local'))).toBe(hueKeyOf(cycle(0)));
    expect(hueKeyOf(role('remote'))).toBe(hueKeyOf(cycle(2)));
    expect(hueKeyOf(role('base'))).toBe(hueKeyOf(cycle(3)));
  });

  it('resolves to tokens, never to literals', () => {
    expect(laneColorVar(cycle(0))).toBe('var(--graph-lane-1)');
    expect(laneColorVar(cycle(5))).toBe('var(--graph-lane-6)');
    // Roles emit a fallback chain: an undefined custom property paints an
    // INVISIBLE stroke, which is a worse failure than a slightly wrong hue.
    expect(laneColorVar(role('remote'))).toBe(
      'var(--graph-remote, var(--graph-lane-3))'
    );
    // Out-of-range slots wrap rather than emitting `var(undefined)`.
    expect(laneColorVar(cycle(8))).toBe('var(--graph-lane-3)');
    expect(laneColorVar(cycle(-1))).toBe('var(--graph-lane-6)');
  });

  it('compares colours structurally', () => {
    expect(sameColor(cycle(2), cycle(2))).toBe(true);
    expect(sameColor(cycle(2), cycle(3))).toBe(false);
    expect(sameColor(role('local'), role('local'))).toBe(true);
    expect(sameColor(role('local'), cycle(0))).toBe(false);
  });
});

describe('the rotation', () => {
  it('never repeats a hue that is already on screen', () => {
    const cycler = createLaneCycler();
    const lanes: Lane[] = [];
    for (let i = 0; i < CYCLE_LENGTH; i++) {
      lanes.push(lane(`c${i}`, cycler.next(i, lanes, lanes.length)));
      cycler.touch(i, lanes);
    }
    expect(new Set(lanes.map((l) => hueKeyOf(l.color))).size).toBe(
      CYCLE_LENGTH
    );
  });

  it('never paints a rotating lane in a live role hue', () => {
    const cycler = createLaneCycler();
    const roles = [
      lane('h', role('local')),
      lane('u', role('remote')),
      lane('b', role('base'))
    ];
    const banned = new Set([...liveHues(roles)]);
    for (let i = 0; i < 20; i++) {
      expect(banned.has(hueKeyOf(cycler.next(i, roles, roles.length)))).toBe(false);
    }
  });

  it('avoids the one hue that is CONFUSABLE with the local lane', () => {
    // `--graph-lane-5` #d19fe8 reads as `--graph-lane-1` #4d9de8 at 21.2 under
    // protanopia — the only pair in the six-hue palette below the ~32 the rest
    // clear. tokens.css mitigates it by putting them four columns apart, but
    // lanes compact, so "rarely adjacent" is not "never".
    const cycler = createLaneCycler();
    for (let i = 0; i < 10; i++) {
      expect(cycler.next(i, [lane('h', role('local'))], 1)).not.toEqual(
        cycle(4)
      );
    }
  });

  it('degrades to a plain free-longest choice rather than deadlocking', () => {
    // Slot 0 live (softly banning slot 4) and every other hue taken: slot 4 is
    // all that is left, so the soft ban must yield.
    const cycler = createLaneCycler();
    const live = [0, 1, 2, 3, 5].map((s) => lane(`c${s}`, cycle(s)));
    expect(cycler.next(0, live, live.length)).toEqual(cycle(4));
  });

  it('reuses the hue that has been free the longest', () => {
    const cycler = createLaneCycler();
    const opened: Lane[] = [];
    for (let i = 0; i < CYCLE_LENGTH; i++) {
      opened.push(lane(`c${i}`, cycler.next(i, opened, opened.length)));
    }
    cycler.touch(0, opened);
    // Everything closes except slot 3; the rest have been dark since row 0.
    const survivor = [lane('c3', cycle(3))];
    for (let row = 1; row < 10; row++) cycler.touch(row, survivor);
    // Deterministic — the lowest-indexed hue that has been dark longest — and
    // determinism is what keeps paging stable.
    expect(cycler.next(10, survivor, survivor.length)).toEqual(cycle(0));
    const withNew = [...survivor, lane('n', cycle(0))];
    cycler.touch(10, withNew);
    expect(cycler.next(11, withNew, withNew.length)).toEqual(cycle(1));
  });

  it('repeats the FURTHEST hue when a collision is unavoidable', () => {
    // Every hue live: some lane must share one. Lanes only ever open at the
    // right edge, so the least-bad repeat is the hue worn furthest LEFT — not
    // whichever the counter happened to land on, which is what a blind
    // rotation would give and could put the repeat in the column next door.
    const cycler = createLaneCycler();
    const all = Array.from({ length: CYCLE_LENGTH }, (_, s) =>
      lane(`c${s}`, cycle(s))
    );
    expect(hueKeyOf(cycler.next(0, all, all.length))).toBe(0);

    // Shuffle which hue sits leftmost and the answer follows it.
    const reversed = all.slice().reverse();
    expect(
      hueKeyOf(createLaneCycler().next(0, reversed, reversed.length))
    ).toBe(CYCLE_LENGTH - 1);
  });

  it('never creates an AVOIDABLE collision on a real 400-commit tangle', () => {
    const layout = layoutGraph(GETSPECSTORY_TANGLE, {
      roleOf: makeRoleResolver({
        headSha: GETSPECSTORY_HEAD,
        upstreamSha: GETSPECSTORY_UPSTREAM,
        mergeBase: GETSPECSTORY_MERGE_BASE
      })
    });

    // This tangle peaks at 14 concurrent lanes against a 6-hue palette, so
    // some repeats are arithmetic, not a defect. The testable claim is the
    // strong one: in any region the graph never widened past the palette,
    // there is NO repeat at all — every collision that exists was forced when
    // its lane opened in a 7-plus-lane region and is merely still being
    // carried after the graph compacted.
    let peak = 0;
    const avoidable: string[] = [];
    for (const row of layout.rows) {
      peak = Math.max(peak, row.in.length, row.out.length);
      if (peak > CYCLE_LENGTH) continue;
      if (liveHues(row.out).size !== row.out.length) avoidable.push(row.hash);
    }
    expect(avoidable).toEqual([]);

    // And the roles never collide with each other, at any width — that pair is
    // the whole of ask #1.
    for (const row of layout.rows) {
      const roles = row.out.filter((l) => l.color.kind === 'role');
      const distinctRoles = new Set(
        roles.map((l) => (l.color.kind === 'role' ? l.color.role : ''))
      );
      expect(new Set(roles.map((l) => hueKeyOf(l.color))).size).toBe(
        distinctRoles.size
      );
    }
  });
});

/**
 * THE PALETTE, RE-MEASURED ON BOTH BASES (Phase 213 fix round, finding 2).
 *
 * Lane colour is identity: if two concurrent lanes read as one hue, the graph
 * says two branches are one. That property was pinned for the dark palette
 * and, when Phase 213 designed a second one, the reader was narrowed to the
 * first `:root` block and the light lanes were left measured by nothing. They
 * are worse: two confusable pairs against the dark base's one, the worst of
 * them 12.4 where dark's is 21.2. So the property is restated PER BASE, and
 * the rotation's soft-avoidance map is asserted to cover every weak pair
 * either base has rather than the one pair the dark base had.
 */
describe.each([
  {
    scheme: 'dark' as const,
    // gmux was dark-only; the SELECTED row is the worst ground and the one
    // that gets forgotten in screenshots.
    backgrounds: ['#0e0f13', '#202329', '#252931'],
    // Measured floor: the red on a selected row, 4.41 (4.12 before Phase 196).
    floor: 4,
    weak: ['1-5=21.2']
  },
  {
    scheme: 'light' as const,
    // The same three rungs on paper: the sidebar, the hover fill and the
    // selected row, which is the deepest fill the light ramp has.
    backgrounds: ['#edeff3', '#e5e7ed', '#d9dce3'],
    // Measured floor: the teal on a selected row, 3.52. Every lane clears
    // WCAG 1.4.11's 3:1, and paper has less room above it than graphite does.
    floor: 3.4,
    weak: ['2-3=26.9', '4-6=12.4']
  }
])('the $scheme palette in tokens.css §1.4b, re-measured', ({ scheme, backgrounds, floor, weak: expectedWeak }) => {
  const css = readFileSync(
    new URL('../../../styles/tokens.css', import.meta.url),
    'utf8'
  );
  const tokens = readCssTokens(css, scheme);

  /**
   * Resolve `--graph-lane-N` through one level of `var(--other)` indirection,
   * because tokens.css deliberately aliases four of the six onto colours gmux
   * already owns (`--accent`, `--git-deleted`, `--git-conflict`,
   * `--git-added`). The alias itself is declared once, on the dark base, and
   * the light base moves what it points AT, which is why this resolves
   * against the base's own token map rather than against the dark one.
   */
  function resolve(name: string): string {
    const direct = tokens.get(name);
    if (direct !== undefined) return direct.toLowerCase();
    const alias = /--graph-lane-\d\s*:\s*var\((--[a-z0-9-]+)\)/g;
    for (const match of css.matchAll(alias)) {
      if (css.slice(match.index).startsWith(name)) {
        const target = match[1];
        const value = target === undefined ? undefined : tokens.get(target);
        if (value !== undefined) return value.toLowerCase();
      }
    }
    throw new Error(`${name} is not defined in tokens.css`);
  }

  const LANES = LANE_COLOR_VARS.map(resolve);

  it('declares exactly the six hues the rotation expects', () => {
    expect(LANES).toHaveLength(CYCLE_LENGTH);
    expect(new Set(LANES).size).toBe(CYCLE_LENGTH);
    expect(tokens.has('--graph-lane-7')).toBe(false);
  });

  it('every hue clears WCAG 1.4.11 (3:1) on all three row backgrounds', () => {
    for (const hex of LANES) {
      for (const bg of backgrounds) {
        expect(
          contrastRatio(hexToRgb(hex), hexToRgb(bg)),
          `${hex} on ${bg}`
        ).toBeGreaterThanOrEqual(3);
      }
    }
    const worstGround = backgrounds[backgrounds.length - 1] as string;
    const measured = Math.min(
      ...LANES.map((hex) => contrastRatio(hexToRgb(hex), hexToRgb(worstGround)))
    );
    expect(measured).toBeGreaterThan(floor);
  });

  it('names every pair that colour-vision deficiency confuses', () => {
    // tokens.css optimised ΔE2000 for normal vision and for adjacency; it did
    // not measure dichromats. This is that measurement, and it is why the
    // rotation carries a soft-avoidance rule instead of a comment.
    const weak: string[] = [];
    for (let i = 0; i < LANES.length; i++) {
      for (let j = i + 1; j < LANES.length; j++) {
        const sep = worstSeparation(
          hexToRgb(LANES[i] as string),
          hexToRgb(LANES[j] as string)
        );
        if (sep < 32) weak.push(`${i + 1}-${j + 1}=${sep.toFixed(1)}`);
      }
    }
    expect(weak).toEqual(expectedWeak);
  });

  it('has every one of those pairs in the rotation, both ways round', () => {
    // THE ASSERTION THE LIGHT BASE WAS MISSING. The cycler runs before any
    // scheme is known, so its map is the union of the two bases' weak pairs;
    // a pair measured here and absent there is a pair the graph will happily
    // put side by side.
    for (let i = 0; i < LANES.length; i++) {
      for (let j = i + 1; j < LANES.length; j++) {
        const sep = worstSeparation(
          hexToRgb(LANES[i] as string),
          hexToRgb(LANES[j] as string)
        );
        if (sep >= 32) continue;
        expect(CONFUSABLE_PAIRS.get(i) ?? [], `slot ${i} avoids ${j}`).toContain(j);
        expect(CONFUSABLE_PAIRS.get(j) ?? [], `slot ${j} avoids ${i}`).toContain(i);
      }
    }
  });

  it('keeps the three role hues far apart — the pair ask #1 depends on', () => {
    const local = hexToRgb(LANES[0] as string); //  --graph-lane-1, blue
    const remote = hexToRgb(LANES[2] as string); // --graph-lane-3, cyan
    const base = hexToRgb(LANES[3] as string); //   --graph-lane-4, orange
    expect(worstSeparation(local, remote)).toBeGreaterThan(50);
    expect(worstSeparation(local, base)).toBeGreaterThan(50);
    expect(worstSeparation(remote, base)).toBeGreaterThan(50);
  });
});

describe('the rejected alternative, for the record', () => {
  it('measures brMagenta against the accent under protanopia', () => {
    // brMagenta is the other hue in the palette with no competing meaning
    // elsewhere in the app, and it measures 21.2 against the accent under
    // protanopia — the two lanes whose distinction IS the feature would be
    // the two a red-green colourblind user could not separate (research 24
    // §7.4).
    const css = readFileSync(
      new URL('../../../styles/tokens.css', import.meta.url),
      'utf8'
    );
    const tokens = readCssTokens(css);
    expect(
      separation(
        hexToRgb(tokens.get('--accent') as string),
        hexToRgb(tokens.get('--graph-lane-5') as string),
        'protan'
      )
    ).toBeLessThan(25);
  });
});
