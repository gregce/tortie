/**
 * The canvas slice (Phase 162): the kept camera and the kept layout as the
 * window holds them, tested where a screenshot cannot see them.
 *
 * The two claims that matter: the camera is written AT REST, one write per
 * rest however long the glide (spec open question 5), and a build whose
 * preload predates the canvas keeps drawing exactly as Phase 161 did, with
 * every keep call a quiet no-op. What is not here: the camera math and the
 * gestures, which belong to the camera suite, and the restore-on-relaunch
 * claim, which belongs to the app run.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ArchCanvasStateResult } from '../bridge';
import { canvasKey, useArch } from '../store';

const REPO = '/somewhere/project';

function answer(over: Partial<ArchCanvasStateResult> = {}): ArchCanvasStateResult {
  return {
    cwd: REPO,
    scope: 'root',
    camera: { k: 1.5, x: -10, y: 4 },
    positions: [{ nodeId: 'engine', x: 10, y: 20 }],
    ...over
  };
}

describe('the canvas slice (store.ts)', () => {
  const canvasState = vi.fn(async () => answer());
  const setCamera = vi.fn(async () => ({ ok: true, reason: null }));
  const setLayout = vi.fn(async () => ({ ok: true, reason: null }));
  const clearLayout = vi.fn(async () => ({ ok: true, reason: null }));
  const realWindow = (globalThis as { window?: unknown }).window;

  beforeEach(() => {
    for (const fn of [canvasState, setCamera, setLayout, clearLayout]) {
      fn.mockClear();
    }
    canvasState.mockImplementation(async () => answer());
    (globalThis as { window?: unknown }).window = {
      gmux: {
        arch: {
          load: vi.fn(),
          canvasState,
          setCamera,
          setLayout,
          clearLayout
        }
      }
    };
    useArch.setState({ canvas: {} });
  });

  afterEach(() => {
    vi.useRealTimers();
    (globalThis as { window?: unknown }).window = realWindow as Window;
  });

  it('reads one scope once and holds both halves', async () => {
    await useArch.getState().loadCanvas(REPO, 'root');
    const entry = useArch.getState().canvasFor(REPO, 'root');
    expect(entry?.status).toBe('ready');
    expect(entry?.camera).toEqual({ k: 1.5, x: -10, y: 4 });
    expect(entry?.positions).toEqual([{ nodeId: 'engine', x: 10, y: 20 }]);
    // Once per window per scope: a second ask is answered from the held
    // entry, because the only other writer of these rows is this window.
    await useArch.getState().loadCanvas(REPO, 'root');
    expect(canvasState).toHaveBeenCalledTimes(1);
  });

  it('holds nothing-kept as nulls, so the drawing computes fresh', async () => {
    canvasState.mockImplementation(async () =>
      answer({ camera: null, positions: [] })
    );
    await useArch.getState().loadCanvas(REPO, 'root');
    const entry = useArch.getState().canvasFor(REPO, 'root');
    expect(entry?.status).toBe('ready');
    expect(entry?.camera).toBeNull();
    expect(entry?.positions).toBeNull();
  });

  it('keeps scopes apart: the root and a part never share a camera', async () => {
    canvasState.mockImplementation(async () =>
      answer({ scope: 'part:engine', camera: { k: 3, x: 0, y: 0 }, positions: [] })
    );
    await useArch.getState().loadCanvas(REPO, 'part:engine');
    expect(useArch.getState().canvasFor(REPO, 'root')).toBeNull();
    expect(
      useArch.getState().canvasFor(REPO, 'part:engine')?.camera
    ).toEqual({ k: 3, x: 0, y: 0 });
    expect(canvasKey(REPO, 'root')).not.toBe(canvasKey(REPO, 'part:engine'));
  });

  it('answers a failed read with nulls, never a blocked drawing', async () => {
    canvasState.mockImplementation(async () => {
      throw new Error('the database is on fire');
    });
    await useArch.getState().loadCanvas(REPO, 'root');
    const entry = useArch.getState().canvasFor(REPO, 'root');
    expect(entry?.status).toBe('error');
    expect(entry?.camera).toBeNull();
    expect(entry?.positions).toBeNull();
  });

  it('writes the camera AT REST: a burst of keeps is one write', async () => {
    vi.useFakeTimers();
    const s = useArch.getState();
    // A glide: many cameras, milliseconds apart. Memory moves every time,
    // the database only after the camera has been still.
    for (let i = 1; i <= 20; i += 1) {
      s.keepCamera(REPO, 'root', { k: 1 + i / 10, x: i, y: -i });
      vi.advanceTimersByTime(50);
    }
    expect(useArch.getState().canvasFor(REPO, 'root')?.camera).toEqual({
      k: 3,
      x: 20,
      y: -20
    });
    expect(setCamera).not.toHaveBeenCalled();
    vi.advanceTimersByTime(500);
    expect(setCamera).toHaveBeenCalledTimes(1);
    expect(setCamera).toHaveBeenCalledWith({
      cwd: REPO,
      scope: 'root',
      camera: { k: 3, x: 20, y: -20 }
    });
  });

  it('writes the layout immediately and WHOLE: a gesture end is already rest', () => {
    useArch
      .getState()
      .keepLayout(REPO, 'root', [
        { nodeId: 'engine', x: 1, y: 2 },
        { nodeId: 'surface', x: 3, y: 4 }
      ]);
    expect(setLayout).toHaveBeenCalledTimes(1);
    expect(setLayout).toHaveBeenCalledWith({
      cwd: REPO,
      scope: 'root',
      positions: [
        { nodeId: 'engine', x: 1, y: 2 },
        { nodeId: 'surface', x: 3, y: 4 }
      ]
    });
    expect(useArch.getState().canvasFor(REPO, 'root')?.positions).toEqual([
      { nodeId: 'engine', x: 1, y: 2 },
      { nodeId: 'surface', x: 3, y: 4 }
    ]);
  });

  it('re-layout is an explicit act: held and stored positions both go', async () => {
    useArch.getState().keepLayout(REPO, 'root', [{ nodeId: 'a', x: 1, y: 2 }]);
    useArch.getState().keepCamera(REPO, 'root', { k: 2, x: 0, y: 0 });
    await useArch.getState().relayout(REPO, 'root');
    const entry = useArch.getState().canvasFor(REPO, 'root');
    expect(entry?.positions).toBeNull();
    // The camera survives: dropping the geography does not throw away where
    // the person was looking.
    expect(entry?.camera).toEqual({ k: 2, x: 0, y: 0 });
    expect(clearLayout).toHaveBeenCalledWith({ cwd: REPO, scope: 'root' });
  });

  it('stays quiet on a preload that predates the canvas', async () => {
    (globalThis as { window?: unknown }).window = {
      gmux: { arch: { load: vi.fn() } }
    };
    await useArch.getState().loadCanvas(REPO, 'root');
    const entry = useArch.getState().canvasFor(REPO, 'root');
    // Ready with nulls: the drawing computes its fit and layout fresh, and
    // every keep call below must be a no-op rather than a crash.
    expect(entry?.status).toBe('ready');
    expect(() => {
      useArch.getState().keepCamera(REPO, 'root', { k: 1, x: 0, y: 0 });
      useArch.getState().keepLayout(REPO, 'root', [{ nodeId: 'a', x: 1, y: 2 }]);
    }).not.toThrow();
    await expect(useArch.getState().relayout(REPO, 'root')).resolves.toBeUndefined();
    expect(setCamera).not.toHaveBeenCalled();
    expect(setLayout).not.toHaveBeenCalled();
  });
});
