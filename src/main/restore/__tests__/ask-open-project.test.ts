/**
 * The Phase 60 restore ask — the pure half.
 *
 * What is pinned here is the dialog's WORDS and BUTTONS, because they are a
 * promise to the operator: the two-button question offers exactly two ways
 * forward and never a third, the missing-folder warning can only cancel, and
 * every string follows the writing rules (no em dashes, no en dashes, the
 * folder named by name and by path). The handler around these functions is
 * exercised live by the phase's probe; these tests are the cheap floor that
 * keeps the copy and the mapping from drifting under it.
 */

import { describe, expect, it, vi } from 'vitest';

// ask-open-project.ts imports electron for its registrar half. The builder
// under test never touches it, so the mock only has to exist.
vi.mock('electron', () => ({
  BrowserWindow: { fromWebContents: () => null },
  dialog: { showMessageBox: () => Promise.resolve({ response: 0 }) },
  shell: {}
}));

const { answerForResponse, askRestoreProjectOptions } = await import(
  '../ask-open-project'
);

const SESSION = 'fix-auth';
const PATH = '/Users/dev/repo';

describe('askRestoreProjectOptions, folder exists', () => {
  const opts = askRestoreProjectOptions(SESSION, PATH, true);

  it('is a question with exactly two buttons, Open and Restore first', () => {
    expect(opts.type).toBe('question');
    expect(opts.buttons).toEqual(['Open and Restore', 'Cancel']);
    expect(opts.defaultId).toBe(0);
    expect(opts.cancelId).toBe(1);
  });

  it('names the folder in the message', () => {
    expect(opts.message).toBe('Open repo to restore this session?');
  });

  it('names the session, the folder and the full path in the detail', () => {
    expect(opts.detail).toContain(`"${SESSION}"`);
    expect(opts.detail).toContain('repo');
    expect(opts.detail).toContain(PATH);
  });

  it('says what each button does, and that Cancel changes nothing', () => {
    expect(opts.detail).toContain('That project is not open.');
    expect(opts.detail).toContain(
      '"Open and Restore" opens the project and restores the session into it.'
    );
    expect(opts.detail).toContain('"Cancel" changes nothing.');
  });
});

describe('askRestoreProjectOptions, folder missing', () => {
  const opts = askRestoreProjectOptions(SESSION, PATH, false);

  it('is a warning with only Cancel', () => {
    expect(opts.type).toBe('warning');
    expect(opts.buttons).toEqual(['Cancel']);
    expect(opts.defaultId).toBe(0);
    expect(opts.cancelId).toBe(0);
  });

  it('says the folder no longer exists', () => {
    expect(opts.message).toBe(
      'The project folder for this session no longer exists.'
    );
  });

  it('names the session and the path, and says nothing was changed', () => {
    expect(opts.detail).toContain(`"${SESSION}"`);
    expect(opts.detail).toContain(PATH);
    expect(opts.detail).toContain('Nothing was changed.');
  });
});

describe('the writing rules hold in every string', () => {
  it('contains no em dash and no en dash anywhere', () => {
    for (const exists of [true, false]) {
      const opts = askRestoreProjectOptions(SESSION, PATH, exists);
      const all = [opts.message, opts.detail, ...opts.buttons].join(' ');
      expect(all).not.toMatch(/[–—]/);
    }
  });
});

describe('answerForResponse', () => {
  it('maps only the two-button question’s first button to open', () => {
    expect(answerForResponse(true, 0)).toBe('open');
    expect(answerForResponse(true, 1)).toBe('cancel');
  });

  it('the one-button warning always cancels, whatever the index', () => {
    expect(answerForResponse(false, 0)).toBe('cancel');
    expect(answerForResponse(false, 1)).toBe('cancel');
  });
});
