import { describe, expect, it } from 'vitest';
import {
  SIDEBAR_VIEW_DEFAULT,
  SIDEBAR_VIEW_IDS
} from '../../state/sidebar-views';
import { zoomTargetFor } from '../focus';
import type { ClosestProbe, SessionSurfaceOrientation } from '../focus';
import { zoomVerbFor } from '../chord';

/** A `closest` that answers for the given ancestor chain and nothing else. */
function inside(
  ancestors: readonly string[],
  view?: string
): ClosestProbe {
  return (selector) =>
    ancestors.includes(selector) ? (view === undefined ? {} : { view }) : null;
}

function target(
  ancestors: readonly string[],
  orientation: SessionSurfaceOrientation = 'top',
  view?: string
): string {
  return zoomTargetFor(inside(ancestors, view), orientation);
}

describe('which region a zoom press belongs to', () => {
  it('sends a focused terminal to the terminal region', () => {
    expect(target(['.gmux-terminal-pane'])).toBe('terminal');
  });

  it('sends every sidebar view to its OWN region', () => {
    // Phase 18.55: the rule used to be `explorer ? 'explorer' : 'scm'`, so
    // Search resolved to Source Control and ⌘+ over the results list moved a
    // level the user had not asked to change. Asserted for every view the
    // sidebar has, so the view added after this one is covered on arrival.
    for (const view of SIDEBAR_VIEW_IDS) {
      expect(target(['.sidebar-view'], 'top', view)).toBe(view);
    }
    // And the one that matters, said in its own words rather than in a loop.
    expect(target(['.sidebar-view'], 'top', 'search')).toBe('search');
    expect(target(['.sidebar-view'], 'top', 'search')).not.toBe('scm');
  });

  it('falls back to the sidebar default for an unlabelled view', () => {
    expect(target(['.sidebar-view'])).toBe(SIDEBAR_VIEW_DEFAULT);
    // A stale or hand-edited attribute is not a region of its own either.
    expect(target(['.sidebar-view'], 'top', 'timeline')).toBe(
      SIDEBAR_VIEW_DEFAULT
    );
  });

  it('sends the editor panel to the editor region', () => {
    expect(target(['.ed-panel'])).toBe('editor');
  });

  it('leaves the image viewer its own ⌘+ / ⌘- / ⌘0', () => {
    // The viewer is INSIDE the editor panel, so ordering is the whole test:
    // deferring has to win over the editor region.
    expect(target(['.imgv', '.ed-panel'])).toBe('defer');
  });

  it('leaves the architecture map its own ⌘+ / ⌘- / ⌘0 (Phase 162)', () => {
    // The map tab nests inside `.ed-panel` exactly as the image viewer
    // does, so the same ordering is the same whole test: before this
    // branch existed, ⌘+ over the map silently moved `--zoom-editor`, a
    // level the person had not asked to change and could not see move.
    expect(target(['.arch-map-tab', '.ed-panel'])).toBe('defer');
    // The camera chord routes into the camera, not into any CSS region.
    expect(target(['.arch-map-tab'])).toBe('defer');
  });

  it('still zooms the arch COCKPIT as a sidebar view: only the map defers', () => {
    // The sidebar pane (strip, failure list, outline) stays an ordinary CSS
    // zoom region under --zoom-arch; the exemption is the map tab alone.
    expect(target(['.sidebar-view'], 'top', 'arch')).toBe('arch');
  });

  it('zooms the dock list from the dock', () => {
    expect(target(['[data-slot="session-dock"]'], 'right')).toBe('sessions');
  });

  it('sends a top-strip tab to its session, not to a band that cannot zoom', () => {
    expect(target(['[data-slot="session-strip"]'], 'top')).toBe('terminal');
    // Right orientation still renders the strip as the identity band, and
    // there the sessions region is a real list.
    expect(target(['[data-slot="session-strip"]'], 'right')).toBe('sessions');
  });

  it('falls back to the session when focus is nowhere in particular', () => {
    expect(target([])).toBe('terminal');
  });
});

/** The fields `zoomVerbFor` reads, so a test need not build a real event. */
function press(
  code: string,
  opts: { meta?: boolean; shift?: boolean; ctrl?: boolean; alt?: boolean; key?: string } = {}
): KeyboardEvent {
  return {
    code,
    key: opts.key ?? '',
    metaKey: opts.meta ?? true,
    shiftKey: opts.shift ?? false,
    ctrlKey: opts.ctrl ?? false,
    altKey: opts.alt ?? false
  } as KeyboardEvent;
}

describe('the zoom chords', () => {
  it('reads ⌘+ off the PHYSICAL key, whatever character it produces', () => {
    // ⌘+ is ⌘⇧= on a US layout and something else elsewhere; `code` is the
    // only stable identity.
    expect(zoomVerbFor(press('Equal'))).toBe('in');
    expect(zoomVerbFor(press('Equal', { shift: true }))).toBe('in');
    expect(zoomVerbFor(press('Minus'))).toBe('out');
  });

  it('accepts the numeric keypad', () => {
    expect(zoomVerbFor(press('NumpadAdd'))).toBe('in');
    expect(zoomVerbFor(press('NumpadSubtract'))).toBe('out');
  });

  it('separates ⌘0 from ⌘⇧0', () => {
    expect(zoomVerbFor(press('Digit0'))).toBe('reset');
    expect(zoomVerbFor(press('Digit0', { shift: true }))).toBe('reset-all');
  });

  it('ignores anything that is not a plain ⌘ chord', () => {
    expect(zoomVerbFor(press('Equal', { meta: false }))).toBeNull();
    expect(zoomVerbFor(press('Equal', { ctrl: true }))).toBeNull();
    expect(zoomVerbFor(press('Equal', { alt: true }))).toBeNull();
    expect(zoomVerbFor(press('KeyT'))).toBeNull();
    // ⌘1…⌘9 belong to the project tabs and must survive untouched.
    expect(zoomVerbFor(press('Digit1', { key: '1' }))).toBeNull();
  });

  it('still works on a layout that puts +/- somewhere else', () => {
    expect(zoomVerbFor(press('BracketRight', { key: '+' }))).toBe('in');
    expect(zoomVerbFor(press('Slash', { key: '-' }))).toBe('out');
  });
});
