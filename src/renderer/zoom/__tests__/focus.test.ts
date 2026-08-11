import { describe, expect, it } from 'vitest';
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

  it('separates Explorer from Source Control by the view attribute', () => {
    expect(target(['.sidebar-view'], 'top', 'explorer')).toBe('explorer');
    expect(target(['.sidebar-view'], 'top', 'scm')).toBe('scm');
    // An unlabelled sidebar view is the SCM default the sidebar itself uses.
    expect(target(['.sidebar-view'])).toBe('scm');
  });

  it('sends the editor panel to the editor region', () => {
    expect(target(['.ed-panel'])).toBe('editor');
  });

  it('leaves the image viewer its own ⌘+ / ⌘- / ⌘0', () => {
    // The viewer is INSIDE the editor panel, so ordering is the whole test:
    // deferring has to win over the editor region.
    expect(target(['.imgv', '.ed-panel'])).toBe('defer');
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
