/**
 * The one piece of logic in the Settings keyboard map: what to say when a
 * recorded agent chord is already spoken for. The recorder cannot create
 * these — they arrive when the keymap grows a chord a user recorded in an
 * older build — so this is the only place that behaviour is exercised.
 */

import { describe, expect, it } from 'vitest';
import { accelerator } from '@shared/keymap';
import { shortcutConflictNote } from '../keyboard-conflicts';

const none: readonly [] = [];

describe('shortcutConflictNote', () => {
  it('passes a chord nothing else owns', () => {
    expect(shortcutConflictNote('Shift+Cmd+C', 'claude', none)).toBeNull();
  });

  it('names the built-in that wins, derived from the keymap', () => {
    // ⇧⌘N is New project… — the exact drift Phase 12.12 was written for.
    const note = shortcutConflictNote(accelerator('project.new'), 'claude', none);
    expect(note).toContain('New project');
    expect(note).not.toContain('…');
    expect(note).toContain('Record a different shortcut');
  });

  it('is insensitive to modifier order', () => {
    expect(shortcutConflictNote('Cmd+Shift+N', 'claude', none)).toContain(
      'New project'
    );
  });

  it('names the Edit menu role for a native chord', () => {
    expect(shortcutConflictNote('Cmd+V', 'claude', none)).toContain('Paste');
  });

  it('names macOS when the system takes the chord first', () => {
    expect(shortcutConflictNote('Cmd+Space', 'claude', none)).toContain(
      'Spotlight'
    );
  });

  it('names the other agent when two rows share a chord', () => {
    const note = shortcutConflictNote('Shift+Cmd+C', 'claude', [
      { agentId: 'claude', displayName: 'Claude Code', accelerator: 'Shift+Cmd+C' },
      { agentId: 'codex', displayName: 'Codex', accelerator: 'Shift+Cmd+C' }
    ]);
    expect(note).toContain('New Codex session');
  });

  it('does not conflict a row with itself', () => {
    expect(
      shortcutConflictNote('Shift+Cmd+C', 'claude', [
        { agentId: 'claude', displayName: 'Claude Code', accelerator: 'Shift+Cmd+C' }
      ])
    ).toBeNull();
  });

  it('flags a chord with no ⌘ or ⌃ — it could never fire', () => {
    expect(shortcutConflictNote('Shift+C', 'claude', none)).toContain('⌘ or ⌃');
  });
});
