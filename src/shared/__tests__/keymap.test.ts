/**
 * The keymap is the one definition of every gmux shortcut, so these tests
 * guard the properties that make it safe to be the only one:
 *  - every entry is well formed and every chord is a canonical accelerator;
 *  - the recorder's reserved table is DERIVED, so a new shortcut becomes
 *    un-recordable in the same commit;
 *  - a chord is claimed twice only when the two claims live in different
 *    scopes (⌃⇥ cycles projects, and editor tabs inside the editor) — an
 *    accidental collision inside one scope fails here, not in the field;
 *  - the shortcuts the phase brief calls "the things nobody discovers" are
 *    actually present.
 */

import { describe, expect, it } from 'vitest';
import {
  KEYMAP,
  KEYMAP_GROUPS,
  RESERVED_APP_CHORDS,
  accelerator,
  acceleratorToDisplay,
  agentKeymapEntries,
  builtInOwner,
  displayChords,
  filterKeymapSections,
  keyDisplay,
  keymapEntry,
  keymapSections,
  normalizeAccelerator
} from '../keymap';

describe('shape', () => {
  it('gives every entry a unique id, an action and an explanation', () => {
    const ids = new Set<string>();
    for (const entry of KEYMAP) {
      expect(ids.has(entry.id), `duplicate id ${entry.id}`).toBe(false);
      ids.add(entry.id);
      expect(entry.action.length, entry.id).toBeGreaterThan(0);
      // The overlay column is narrow — long labels ellipsis away.
      expect(entry.action.length, entry.id).toBeLessThanOrEqual(26);
      expect(entry.explain.length, entry.id).toBeGreaterThan(20);
      expect(entry.explain.endsWith('.'), entry.id).toBe(true);
    }
  });

  it('places every entry in a declared group', () => {
    const groups = new Set(KEYMAP_GROUPS.map((g) => g.id));
    for (const entry of KEYMAP) expect(groups.has(entry.group)).toBe(true);
  });

  it('stores every chord in canonical accelerator form', () => {
    for (const entry of KEYMAP) {
      for (const chord of entry.keys) {
        if (chord.accelerator === null) continue;
        expect(normalizeAccelerator(chord.accelerator)).toBe(chord.accelerator);
        expect(chord.display).toBe(acceleratorToDisplay(chord.accelerator));
      }
    }
  });
});

describe('collisions', () => {
  it('claims a chord twice only across different scopes', () => {
    const seen = new Map<string, Set<string>>();
    for (const entry of KEYMAP) {
      for (const chord of entry.keys) {
        if (chord.accelerator === null) continue;
        const scopes = seen.get(chord.accelerator) ?? new Set<string>();
        expect(
          scopes.has(entry.scope),
          `${chord.accelerator} claimed twice in scope ${entry.scope}`
        ).toBe(false);
        scopes.add(entry.scope);
        seen.set(chord.accelerator, scopes);
      }
    }
  });

  it('names the app-wide owner when scopes share a chord', () => {
    // ⌃⇥ is project cycling app-wide and editor MRU inside the editor.
    expect(builtInOwner('Ctrl+Tab')?.id).toBe('project.next');
    expect(builtInOwner('Cmd+Shift+E')?.id).toBe('view.explorer');
    expect(builtInOwner('Cmd+Shift+Y')).toBeUndefined();
  });
});

describe('reserved chords are derived, not retyped', () => {
  it('reserves every ⌘/⌃ chord the keymap defines', () => {
    for (const entry of KEYMAP) {
      for (const chord of entry.keys) {
        if (chord.accelerator === null) continue;
        const mods = chord.accelerator.split('+').slice(0, -1);
        if (!mods.includes('Cmd') && !mods.includes('Ctrl')) continue;
        expect(
          RESERVED_APP_CHORDS[chord.accelerator],
          chord.accelerator
        ).toBeDefined();
      }
    }
  });

  it('reserves ⇧⌘N, which the hand-written table used to miss', () => {
    expect(RESERVED_APP_CHORDS['Shift+Cmd+N']).toBe('New project…');
  });

  it('leaves unmodified keys recordable (F2, ⇧PgUp, Space)', () => {
    expect(RESERVED_APP_CHORDS['F2']).toBeUndefined();
    expect(RESERVED_APP_CHORDS['Shift+PageUp']).toBeUndefined();
    expect(RESERVED_APP_CHORDS['Space']).toBeUndefined();
  });

  it('keeps the native Edit-menu roles in the table', () => {
    expect(RESERVED_APP_CHORDS['Cmd+V']).toBe('Paste');
    expect(RESERVED_APP_CHORDS['Shift+Cmd+Z']).toBe('Redo');
  });
});

describe('lookups', () => {
  it('returns the accelerator the native menu registers', () => {
    expect(accelerator('session.new')).toBe('Cmd+T');
    expect(accelerator('view.explorer')).toBe('Shift+Cmd+E');
    expect(accelerator('project.new')).toBe('Shift+Cmd+N');
  });

  it('refuses an accelerator for a deliberately unaccelerated action', () => {
    expect(() => accelerator('session.end')).toThrow(/no accelerator/);
  });

  it('renders keycap text for tooltips', () => {
    expect(keyDisplay('session.new')).toBe('⌘T');
    expect(keyDisplay('terminal.scrollBack')).toBe('⇧PgUp');
    expect(keyDisplay('view.zoomIn')).toBe('⌘+');
  });

  it('collapses ⌘1…⌘8 to three tokens for display, keeping all eight', () => {
    const entry = keymapEntry('project.switch');
    expect(entry.keys).toHaveLength(8);
    const shown = displayChords(entry);
    expect(shown.map((c) => c.display)).toEqual(['⌘1', '…', '⌘8']);
    expect(shown[1]?.kind).toBe('text');
    // …and every one of the eight is still reserved.
    expect(RESERVED_APP_CHORDS['Cmd+5']).toBe('Switch to project');
  });
});

describe('sections', () => {
  it('groups in declared order and folds in user-assigned rows', () => {
    const extra = agentKeymapEntries([
      { id: 'claude', displayName: 'Claude Code', accelerator: 'Cmd+Shift+C' }
    ]);
    const sections = keymapSections(extra);
    expect(sections.map((s) => s.group.id)).toEqual(
      KEYMAP_GROUPS.map((g) => g.id)
    );
    const sessions = sections[0];
    const claude = sessions?.entries.find(
      (e) => e.id === 'session.launch:claude'
    );
    expect(claude?.source).toBe('user-assigned');
    expect(claude?.assignable).toBe(true);
    expect(claude?.keys[0]?.display).toBe('⇧⌘C');
    // Built-ins come first; the recorded row is appended to its group.
    expect(sessions?.entries[0]?.id).toBe('session.new');
  });

  it('leaves an unassigned agent row chordless rather than inventing one', () => {
    const [row] = agentKeymapEntries([{ id: 'pi', displayName: 'Pi' }]);
    expect(row?.keys).toEqual([]);
    expect(row?.action).toBe('New Pi session');
  });

  it('filters on action, explanation and chord text', () => {
    const byAction = filterKeymapSections(keymapSections(), 'scroll back');
    expect(byAction.flatMap((s) => s.entries).map((e) => e.id)).toContain(
      'terminal.scrollBack'
    );
    const byChord = filterKeymapSections(keymapSections(), '⇧↩');
    expect(byChord.flatMap((s) => s.entries).map((e) => e.id)).toEqual([
      'terminal.newline'
    ]);
    const nothing = filterKeymapSections(keymapSections(), 'zzzz');
    expect(nothing).toEqual([]);
  });
});

describe('the shortcuts nobody discovers are all here', () => {
  const REQUIRED: readonly [string, string][] = [
    ['project.switch', '⌘1'],
    ['project.last', '⌘9'],
    ['project.next', '⌃⇥'],
    ['terminal.scrollBack', '⇧PgUp'],
    ['terminal.scrollForward', '⇧PgDn'],
    ['terminal.newline', '⇧↩'],
    ['session.focusLeft', '⌥⌘←'],
    ['session.focusRight', '⌥⌘→'],
    ['editor.nextTab', '⇧⌘]'],
    ['app.shortcuts', '⌘/'],
    ['view.zoomIn', '⌘+'],
    ['view.zoomOut', '⌘-'],
    ['view.zoomReset', '⌘0'],
    ['view.zoomResetAll', '⇧⌘0']
  ];

  it.each(REQUIRED)('%s renders as %s', (id, display) => {
    expect(keymapEntry(id as Parameters<typeof keymapEntry>[0]).keys[0]?.display).toBe(
      display
    );
  });
});
