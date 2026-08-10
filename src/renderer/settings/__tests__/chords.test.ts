/**
 * S13 hotkey chords — capture normalization + the recorder's conflict
 * matrix (must include ⌘/⌃; rejects §4-map, macOS-reserved, and cross-row
 * chords; self-row re-record never conflicts with itself).
 */

import { describe, expect, it } from 'vitest';
import {
  acceleratorToDisplay,
  eventToAccelerator,
  normalizeAccelerator,
  validateChord,
  type ChordContext,
  type ChordKeyEvent
} from '../chords';

function ev(partial: Partial<ChordKeyEvent>): ChordKeyEvent {
  return {
    key: '',
    code: '',
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    ...partial
  };
}

const CTX: ChordContext = {
  assigned: { claude: 'Shift+Cmd+C', codex: 'Shift+Cmd+X' },
  displayNames: { claude: 'Claude Code', codex: 'Codex CLI' },
  selfAgentId: 'gemini'
};

describe('eventToAccelerator', () => {
  it('builds a canonical chord from code-based letters (Shift-stable)', () => {
    expect(
      eventToAccelerator(
        ev({ key: 'C', code: 'KeyC', metaKey: true, shiftKey: true })
      )
    ).toBe('Shift+Cmd+C');
  });

  it('uses the fixed Ctrl→Alt→Shift→Cmd modifier order', () => {
    expect(
      eventToAccelerator(
        ev({
          key: 'g',
          code: 'KeyG',
          metaKey: true,
          ctrlKey: true,
          altKey: true,
          shiftKey: true
        })
      )
    ).toBe('Ctrl+Alt+Shift+Cmd+G');
  });

  it('returns null for pure modifier presses', () => {
    expect(
      eventToAccelerator(ev({ key: 'Meta', code: 'MetaLeft', metaKey: true }))
    ).toBeNull();
    expect(
      eventToAccelerator(ev({ key: 'Shift', code: 'ShiftLeft', shiftKey: true }))
    ).toBeNull();
  });

  it('maps digits, F-keys, arrows and space', () => {
    expect(
      eventToAccelerator(ev({ key: '5', code: 'Digit5', metaKey: true }))
    ).toBe('Cmd+5');
    expect(eventToAccelerator(ev({ key: 'F6', code: 'F6', ctrlKey: true }))).toBe(
      'Ctrl+F6'
    );
    expect(
      eventToAccelerator(ev({ key: 'ArrowUp', code: 'ArrowUp', metaKey: true }))
    ).toBe('Cmd+Up');
    expect(
      eventToAccelerator(ev({ key: ' ', code: 'Space', ctrlKey: true }))
    ).toBe('Ctrl+Space');
  });
});

describe('normalizeAccelerator / display', () => {
  it('reorders modifiers into the canonical form', () => {
    expect(normalizeAccelerator('Cmd+Shift+C')).toBe('Shift+Cmd+C');
  });

  it('renders macOS glyph order ⌃⌥⇧⌘', () => {
    expect(acceleratorToDisplay('Cmd+Shift+C')).toBe('⇧⌘C');
    expect(acceleratorToDisplay('Ctrl+Alt+Shift+Cmd+Up')).toBe('⌃⌥⇧⌘↑');
  });
});

describe('validateChord', () => {
  it('requires ⌘ or ⌃', () => {
    const v = validateChord('Alt+Shift+C', CTX);
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toContain('⌘ or ⌃');
  });

  it('rejects the §4 app map with the owning action named', () => {
    const v = validateChord('Cmd+T', CTX);
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toBe('Already used by New session');
  });

  it('rejects app chords regardless of recorded modifier order', () => {
    expect(validateChord('Cmd+Shift+E', CTX).ok).toBe(false); // Explorer
  });

  it('rejects macOS-reserved chords', () => {
    const v = validateChord('Cmd+Space', CTX);
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toContain('macOS');
  });

  it('rejects a chord held by another agent row, naming it', () => {
    const v = validateChord('Cmd+Shift+C', CTX);
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toBe('Already used by New Claude Code session');
  });

  it('accepts re-recording a row’s own chord', () => {
    const v = validateChord('Shift+Cmd+C', { ...CTX, selfAgentId: 'claude' });
    expect(v.ok).toBe(true);
  });

  it('accepts a free chord and returns the canonical form', () => {
    const v = validateChord('Cmd+Shift+G', CTX);
    expect(v.ok).toBe(true);
    if (v.ok) expect(v.accelerator).toBe('Shift+Cmd+G');
  });
});
