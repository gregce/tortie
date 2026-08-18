/**
 * The reading filter, which the ⌘/ overlay and Settings → Keyboard now share
 * (Phase 86).
 *
 * It was one surface's private helper until this phase, and the overlay was
 * about to grow a second copy. The rule it encodes is not obvious enough to
 * be re-derived: match action names and chords FIRST, and only search the
 * plain-language explanations when that finds nothing at all. Every per-agent
 * row explains itself as "…in the project you are looking at", so a search
 * for "project" answered with eleven session rows before it answered with the
 * Projects group.
 *
 * The fixtures below are hand-written rather than taken from KEYMAP, because
 * this is a test of the FILTER and not of today's shortcut list. The one case
 * that reads the real keymap is the accelerator case, which has to prove that
 * what a person types (`cmd+t`) meets what the keymap stores (`Cmd+T`).
 */

import { describe, expect, it } from 'vitest';
import {
  filterForReading,
  keymapSections,
  nameOrChordMatches
} from '../keymap';
import type { KeymapEntry, KeymapSection } from '../keymap';

function entry(
  id: string,
  action: string,
  explain: string,
  display: string,
  accelerator: string | null
): KeymapEntry {
  return {
    id,
    keys: [{ accelerator, display, kind: 'key' }],
    action,
    explain,
    group: 'sessions',
    scope: 'app',
    assignable: false,
    source: 'built-in'
  };
}

/**
 * Two groups. "Open project" is a NAME match for "project"; the two session
 * rows mention a project only in their explanations, which is the trap.
 */
const FIXTURE: readonly KeymapSection[] = [
  {
    group: { id: 'sessions', title: 'Sessions' },
    entries: [
      entry(
        'sessions.new',
        'New session',
        'Opens the sheet in the project you are looking at.',
        '⌘T',
        'Cmd+T'
      ),
      entry(
        'sessions.claude',
        'New Claude Code session',
        'Creates a Claude Code session in the project you are looking at.',
        '⇧⌘C',
        'Shift+Cmd+C'
      )
    ]
  },
  {
    group: { id: 'projects', title: 'Projects' },
    entries: [
      entry(
        'projects.open',
        'Open project…',
        'Picks a folder and adds it as a tab.',
        '⌘O',
        'Cmd+O'
      )
    ]
  }
];

/** Every action name the filter left standing, flattened in display order. */
function actions(sections: readonly KeymapSection[]): string[] {
  return sections.flatMap((s) => s.entries.map((e) => e.action));
}

describe('filterForReading', () => {
  it('returns the sections unchanged for an empty query', () => {
    expect(filterForReading(FIXTURE, '')).toBe(FIXTURE);
    expect(filterForReading(FIXTURE, '   ')).toBe(FIXTURE);
  });

  it('answers a name match without falling through to the explanations', () => {
    // All three rows say "project" somewhere. Only one row is NAMED for it.
    expect(actions(filterForReading(FIXTURE, 'project'))).toEqual([
      'Open project…'
    ]);
  });

  it('falls back to the explanations when no name or chord matches', () => {
    // "folder" appears in one explanation and in no action or chord.
    expect(actions(filterForReading(FIXTURE, 'folder'))).toEqual([
      'Open project…'
    ]);
  });

  it('finds a row by the accelerator a person would type', () => {
    const found = filterForReading(keymapSections(), 'cmd+t');
    const names = actions(found);
    expect(names.length).toBeGreaterThan(0);
    expect(names).toContain('New session');
  });

  it('returns an empty list when nothing matches at all', () => {
    expect(filterForReading(FIXTURE, 'xyzzy')).toEqual([]);
  });

  it('drops a group that ends up with no rows', () => {
    const found = filterForReading(FIXTURE, 'session');
    expect(found.map((s) => s.group.id)).toEqual(['sessions']);
  });
});

describe('nameOrChordMatches', () => {
  const row = FIXTURE[0]?.entries[0] as KeymapEntry;

  it('trims and lowercases the query itself, so its callers cannot differ', () => {
    expect(nameOrChordMatches(row, '  New  ')).toBe(
      nameOrChordMatches(row, 'new')
    );
    expect(nameOrChordMatches(row, '  New  ')).toBe(true);
  });

  it('answers true for an empty query, the same as keymapMatches', () => {
    expect(nameOrChordMatches(row, '')).toBe(true);
    expect(nameOrChordMatches(row, '   ')).toBe(true);
  });

  it('matches the chord as well as the name', () => {
    expect(nameOrChordMatches(row, 'cmd+t')).toBe(true);
    expect(nameOrChordMatches(row, 'sheet')).toBe(false);
  });
});
