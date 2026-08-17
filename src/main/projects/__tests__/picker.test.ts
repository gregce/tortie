/**
 * Phase 74, GitHub issue 6. What the native folder panel says.
 *
 * WHY THIS TEST EXISTS. The panel is a native macOS panel. `capturePage`
 * photographs the app window and cannot see it, and a whole screen capture is
 * refused after the incident recorded under Phase 73.1 in docs/BACKLOG.md. So
 * the sentence is proven here and at the one call site in src/main/ipc.ts,
 * rather than by a photograph.
 */

import { describe, expect, it } from 'vitest';
import {
  DIRECTORY_PICK_MESSAGES,
  directoryPickMessage
} from '../picker';

/** An em dash or an en dash, anywhere. */
const DASHES = /[—–]/;

describe('directoryPickMessage', () => {
  it('tells New Project that the folder it picks is the one the project goes inside', () => {
    expect(directoryPickMessage('new-project-parent')).toBe(
      'Choose where the new project goes. Tortie creates the project folder inside the folder you choose.'
    );
  });

  it('leaves the frozen channel saying exactly what it has always said', () => {
    expect(directoryPickMessage('project')).toBe('Choose a project folder');
  });

  it('falls back to the old sentence for a purpose it does not know', () => {
    // The value crosses IPC, so an unknown one must produce a panel rather
    // than an empty message or a throw.
    expect(directoryPickMessage('nonsense')).toBe('Choose a project folder');
    expect(directoryPickMessage('')).toBe('Choose a project folder');
  });

  it('says the word "inside", which is the fact the issue says is missing', () => {
    expect(directoryPickMessage('new-project-parent')).toContain('inside');
  });

  it('writes no em dash and no en dash in any message', () => {
    for (const message of Object.values(DIRECTORY_PICK_MESSAGES)) {
      expect(message).not.toMatch(DASHES);
    }
  });

  it('has exactly the two purposes the contract declares', () => {
    expect(Object.keys(DIRECTORY_PICK_MESSAGES).sort()).toEqual([
      'new-project-parent',
      'project'
    ]);
  });
});
