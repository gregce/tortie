/**
 * The Figma key set's decision table (Phase 162), proved chord by chord.
 *
 * The negative cases are the phase's own safety rule: a chord the app or an
 * agent already owns must come back null here, because a stolen keystroke is
 * invisible in any photograph. The keymap cross-check at the bottom is the
 * mechanical half of that promise: no bare chord this table claims may
 * collide with any registered accelerator.
 */

import { describe, expect, it, vi } from 'vitest';
import { KEYMAP } from '@shared/keymap';
import {
  cameraKeyCommand,
  runCameraCommand,
  type CameraKeyStroke
} from '../keys';
import type { ArchCameraHandle } from '../seam';

function stroke(over: Partial<CameraKeyStroke>): CameraKeyStroke {
  return {
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    code: '',
    key: '',
    ...over
  };
}

describe('the panel zoom chord, routed into the camera', () => {
  it('answers ⌘+ ⌘− ⌘0 with the camera verbs', () => {
    expect(cameraKeyCommand(stroke({ metaKey: true, code: 'Equal' }))).toBe(
      'zoomIn'
    );
    // ⌘+ is Shift+Equal on a US layout; shift must not disqualify it.
    expect(
      cameraKeyCommand(stroke({ metaKey: true, shiftKey: true, code: 'Equal' }))
    ).toBe('zoomIn');
    // A layout where + is its own key answers through `key`.
    expect(
      cameraKeyCommand(stroke({ metaKey: true, code: 'BracketRight', key: '+' }))
    ).toBe('zoomIn');
    expect(cameraKeyCommand(stroke({ metaKey: true, code: 'Minus' }))).toBe(
      'zoomOut'
    );
    expect(cameraKeyCommand(stroke({ metaKey: true, code: 'Digit0' }))).toBe(
      'zoomReset'
    );
  });

  it('leaves ⇧⌘0 to the app: reset-all stays a CSS-region verb', () => {
    expect(
      cameraKeyCommand(
        stroke({ metaKey: true, shiftKey: true, code: 'Digit0' })
      )
    ).toBeNull();
  });

  it('never claims a ⌘ chord it was not given', () => {
    for (const code of ['KeyF', 'Digit1', 'Digit2', 'KeyW', 'KeyT']) {
      expect(cameraKeyCommand(stroke({ metaKey: true, code }))).toBeNull();
    }
    // ⌃ and ⌥ variants belong to the terminal and the system.
    expect(cameraKeyCommand(stroke({ ctrlKey: true, code: 'Equal' }))).toBeNull();
    expect(
      cameraKeyCommand(stroke({ metaKey: true, ctrlKey: true, code: 'Equal' }))
    ).toBeNull();
    expect(cameraKeyCommand(stroke({ altKey: true, code: 'KeyF' }))).toBeNull();
  });
});

describe('the frame and fit keys', () => {
  it('F frames, Shift+1 fits all, Shift+2 fits the selection', () => {
    expect(cameraKeyCommand(stroke({ code: 'KeyF', key: 'f' }))).toBe('frame');
    expect(
      cameraKeyCommand(stroke({ shiftKey: true, code: 'Digit1', key: '!' }))
    ).toBe('fitAll');
    expect(
      cameraKeyCommand(stroke({ shiftKey: true, code: 'Digit2', key: '@' }))
    ).toBe('fitSelection');
  });

  it('does not claim Shift+F, bare digits, or any other bare letter', () => {
    expect(
      cameraKeyCommand(stroke({ shiftKey: true, code: 'KeyF' }))
    ).toBeNull();
    expect(cameraKeyCommand(stroke({ code: 'Digit1' }))).toBeNull();
    expect(cameraKeyCommand(stroke({ code: 'Digit2' }))).toBeNull();
    expect(cameraKeyCommand(stroke({ code: 'KeyG' }))).toBeNull();
    expect(cameraKeyCommand(stroke({ shiftKey: true, code: 'Digit3' }))).toBeNull();
  });

  it('NEVER claims Space or Enter: the drill keeps its keyboard activation', () => {
    // Space is the hand tool's key in the GESTURE layer; as a command it
    // would collide with activating a focused box. Enter stays the drill's.
    expect(cameraKeyCommand(stroke({ code: 'Space', key: ' ' }))).toBeNull();
    expect(cameraKeyCommand(stroke({ code: 'Enter', key: 'Enter' }))).toBeNull();
  });
});

describe('the handle', () => {
  it('drives the named verb and survives an unmounted camera', () => {
    const handle: ArchCameraHandle = {
      zoomIn: vi.fn(),
      zoomOut: vi.fn(),
      zoomReset: vi.fn(),
      fitAll: vi.fn(),
      fitSelection: vi.fn(),
      frame: vi.fn()
    };
    runCameraCommand(handle, 'frame');
    runCameraCommand(handle, 'fitAll');
    expect(handle.frame).toHaveBeenCalledTimes(1);
    expect(handle.fitAll).toHaveBeenCalledTimes(1);
    expect(handle.zoomIn).not.toHaveBeenCalled();
    expect(() => runCameraCommand(null, 'zoomIn')).not.toThrow();
  });
});

describe('the keymap cross-check: nothing this table claims is registered elsewhere', () => {
  it('no registered accelerator collides with the bare F, Shift+1 or Shift+2', () => {
    const registered = KEYMAP.flatMap((row) =>
      row.keys
        .map((chord) => chord.accelerator)
        .filter((a): a is string => a !== null)
    );
    // The three camera keys are display-only rows: nothing registers them.
    for (const claimed of ['F', 'Shift+1', 'Shift+2']) {
      expect(registered).not.toContain(claimed);
    }
    // And the map's own rows carry no accelerator at all, so the ⌘/ overlay
    // shows them without the app ever listening for them globally.
    for (const row of KEYMAP.filter((r) => r.scope === 'map')) {
      for (const chord of row.keys) {
        expect(chord.accelerator).toBeNull();
      }
    }
  });
});
