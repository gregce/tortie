/**
 * Phase 74, GitHub issue 6. A project folder with no basename gets a name a
 * person can read.
 *
 * `basename('/')` is an empty string, so opening the root of a volume used to
 * produce a project row with no name and a tab with no label.
 */

import { describe, expect, it } from 'vitest';
import { projectNameForPath } from '../name';

describe('projectNameForPath', () => {
  it('is the folder name for an ordinary project folder', () => {
    expect(projectNameForPath('/Users/me/code/tortie')).toBe('tortie');
  });

  it('is the path itself for the root of a volume, which has no basename', () => {
    expect(projectNameForPath('/')).toBe('/');
  });

  it('is the folder name for a mounted volume', () => {
    expect(projectNameForPath('/Volumes/Work')).toBe('Work');
  });

  it('never returns an empty string', () => {
    for (const path of ['/', '/Users/me/code/tortie', '/Volumes/Work']) {
      expect(projectNameForPath(path).length).toBeGreaterThan(0);
    }
  });
});
