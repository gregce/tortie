/**
 * The level decision (Phase 137). The table is section 7.5 of the build
 * spec: the level is decided by focus and by nothing else.
 */

import { describe, expect, it } from 'vitest';
import { decideOverviewLevel } from '../level';

describe('decideOverviewLevel', () => {
  it('opens the one focused session when the keyboard is in a session', () => {
    expect(
      decideOverviewLevel({
        region: 'session',
        visibleIds: ['a'],
        focusedRowId: 'a',
        activeId: 'a'
      })
    ).toEqual({ level: 'session', sessionIds: ['a'] });
  });

  it('falls back from the focused row to the active session', () => {
    expect(
      decideOverviewLevel({
        region: 'session',
        visibleIds: ['a'],
        focusedRowId: null,
        activeId: 'b'
      })
    ).toEqual({ level: 'session', sessionIds: ['b'] });
  });

  it('falls back to the one visible session when the store names nothing', () => {
    expect(
      decideOverviewLevel({
        region: 'session',
        visibleIds: ['only'],
        focusedRowId: null,
        activeId: null
      })
    ).toEqual({ level: 'session', sessionIds: ['only'] });
  });

  it('opens the split as columns when several sessions are on screen', () => {
    expect(
      decideOverviewLevel({
        region: 'session',
        visibleIds: ['a', 'b', 'c'],
        focusedRowId: 'a',
        activeId: 'a'
      })
    ).toEqual({ level: 'several', sessionIds: ['a', 'b', 'c'] });
  });

  it('opens the project when the surface shows no session', () => {
    expect(
      decideOverviewLevel({
        region: 'session',
        visibleIds: [],
        focusedRowId: null,
        activeId: 'a'
      })
    ).toEqual({ level: 'project', sessionIds: [] });
  });

  it('opens the project from the editor', () => {
    expect(
      decideOverviewLevel({
        region: 'editor',
        visibleIds: ['a'],
        focusedRowId: 'a',
        activeId: 'a'
      })
    ).toEqual({ level: 'project', sessionIds: [] });
  });

  it('opens the project from anywhere else', () => {
    expect(
      decideOverviewLevel({
        region: null,
        visibleIds: ['a', 'b'],
        focusedRowId: null,
        activeId: 'a'
      })
    ).toEqual({ level: 'project', sessionIds: [] });
  });

  it('copies the visible list rather than aliasing it', () => {
    const visibleIds = ['a', 'b'];
    const out = decideOverviewLevel({
      region: 'session',
      visibleIds,
      focusedRowId: null,
      activeId: null
    });
    expect(out.sessionIds).toEqual(visibleIds);
    expect(out.sessionIds).not.toBe(visibleIds);
  });
});
