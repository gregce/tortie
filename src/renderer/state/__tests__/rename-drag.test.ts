/**
 * Phase 12.2 — the store side of "rename no longer grabs the row".
 *
 * Two store entry points must revoke an outstanding pointer drag:
 *  - `setMenu`, the single choke point every native context menu funnels
 *    through (DESIGN.md §3). The menu takes an OS mouse grab, so the press
 *    underneath it will never see its pointerup.
 *  - `setRenaming`, so any other path that armed a drag before a rename began
 *    cannot leave the row tracking the pointer while the user types.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const bodyClasses = new Set<string>();
const listeners = new Map<string, Set<(e: unknown) => void>>();

function emit(type: string, event: Record<string, unknown>): void {
  for (const fn of [...(listeners.get(type) ?? [])]) {
    fn({ type, preventDefault() {}, stopPropagation() {}, ...event });
  }
}

function installGlobals(): void {
  bodyClasses.clear();
  listeners.clear();
  vi.stubGlobal('window', {
    addEventListener(type: string, fn: (e: unknown) => void) {
      const set = listeners.get(type) ?? new Set<(e: unknown) => void>();
      set.add(fn);
      listeners.set(type, set);
    },
    removeEventListener(type: string, fn: (e: unknown) => void) {
      listeners.get(type)?.delete(fn);
    },
    // No popupMenu on the bridge → showNativeMenu is a documented no-op, so
    // these tests exercise setMenu without an Electron main process.
    gmux: {}
  });
  vi.stubGlobal('localStorage', {
    getItem: () => null,
    setItem() {},
    removeItem() {}
  });
  vi.stubGlobal('document', {
    body: {
      classList: {
        add: (c: string) => bodyClasses.add(c),
        remove: (c: string) => bodyClasses.delete(c),
        contains: (c: string) => bodyClasses.has(c)
      }
    }
  });
}

// The store reads window.gmux while zustand builds its initial state, so the
// globals have to exist before the module is ever imported.
installGlobals();

const { armPointerDrag, isDragActive } = await import(
  '../../app/split/pointer-drag'
);
const { installAppShellOps } = await import('../../app/shell-ops-install');
const { useApp } = await import('../store');

// PHASE 127. The store no longer imports the drag engine or the menu helper,
// because the store may not name the app shell that composes it. It calls
// both through the seam in ../shell-ops.ts, and src/renderer/main.tsx fills
// that seam once before the first render. This test fills it the same way, so
// what it drives is the shipped pair rather than a stand-in. Filling it with
// the two real functions by hand would be a second composition, and a second
// composition is how a test starts passing against something the product does
// not do.

beforeEach(() => {
  installGlobals();
  installAppShellOps();
});

/** Press a row, then travel far enough that the drag is genuinely armed. */
function armRealDrag(): { onEnd: ReturnType<typeof vi.fn> } {
  const onEnd = vi.fn();
  armPointerDrag(
    { clientX: 100, clientY: 100, button: 0, ctrlKey: false },
    { onMove: vi.fn(), onDrop: vi.fn(), onEnd }
  );
  emit('pointermove', { clientX: 200, clientY: 100 });
  expect(isDragActive()).toBe(true);
  return { onEnd };
}

/** Press a row but stay under the threshold — armed on the NEXT move. */
function pendingDrag(): { onStart: ReturnType<typeof vi.fn> } {
  const onStart = vi.fn();
  armPointerDrag(
    { clientX: 100, clientY: 100, button: 0, ctrlKey: false },
    { onStart, onMove: vi.fn(), onDrop: vi.fn(), onEnd: vi.fn() }
  );
  return { onStart };
}

describe('setRenaming', () => {
  it('aborts an in-flight drag when a rename starts', () => {
    const { onEnd } = armRealDrag();

    useApp.getState().setRenaming('session-1');

    expect(onEnd).toHaveBeenCalledWith(true);
    expect(isDragActive()).toBe(false);
    expect(bodyClasses.has('gmux-dragging')).toBe(false);
    expect(useApp.getState().renamingSessionId).toBe('session-1');
  });

  it('stops a pending press from arming once the rename box is open', () => {
    const { onStart } = pendingDrag();

    useApp.getState().setRenaming('session-1');
    // The user now moves the pointer toward the rename box.
    emit('pointermove', { clientX: 400, clientY: 120 });

    expect(onStart).not.toHaveBeenCalled();
    expect(isDragActive()).toBe(false);
  });

  it('leaves the engine usable after clearing the rename', () => {
    useApp.getState().setRenaming('session-1');
    useApp.getState().setRenaming(null);
    expect(useApp.getState().renamingSessionId).toBe(null);

    const { onStart } = pendingDrag();
    emit('pointermove', { clientX: 400, clientY: 100 });
    expect(onStart).toHaveBeenCalledTimes(1);
    useApp.getState().setRenaming('cleanup');
  });
});

describe('setMenu', () => {
  it('revokes the press underneath a native context menu', () => {
    const { onStart } = pendingDrag();

    useApp.getState().setMenu({
      x: 10,
      y: 10,
      items: [{ label: 'Rename', run: () => undefined }]
    });
    // Whatever the user does next — including picking Rename and moving to
    // the box — the row must not follow the pointer.
    emit('pointermove', { clientX: 500, clientY: 300 });

    expect(onStart).not.toHaveBeenCalled();
    expect(isDragActive()).toBe(false);
    expect(bodyClasses.has('gmux-dragging')).toBe(false);
  });

  it('does not disturb the engine when the menu request is null', () => {
    const { onStart } = pendingDrag();

    useApp.getState().setMenu(null);
    emit('pointermove', { clientX: 400, clientY: 100 });

    expect(onStart).toHaveBeenCalledTimes(1);
    useApp.getState().setRenaming('cleanup');
    expect(isDragActive()).toBe(false);
  });
});
