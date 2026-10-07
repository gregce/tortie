/**
 * Where a drop from OUTSIDE the app lands (Phase 154).
 *
 * `importTargetFor` is pure on purpose, and this file is why: the FILTERED
 * case cannot be reasoned about from the model. A name filter changes which
 * rows are mounted and never changes a mounted row's own `data-item-path`, so
 * the destination is a function of the row alone. Proving that here is what
 * makes "the file lands where the row says, not where the unfiltered index
 * would put it" a property rather than a hope.
 */

import { describe, expect, it } from 'vitest';
import { importTargetFor, NO_TREE_LINKS } from '../tree-paths';

const file = (rel: string): { rel: string; isFolder: boolean } => ({
  rel,
  isFolder: false
});
const folder = (rel: string): { rel: string; isFolder: boolean } => ({
  rel,
  isFolder: true
});

describe('the destination rule, which matches the internal move rule', () => {
  it('a folder row takes the drop INSIDE that folder', () => {
    expect(importTargetFor(folder('src/'), null, NO_TREE_LINKS)).toBe('src/');
  });

  it('a folder row spelled without its slash is still that folder', () => {
    expect(importTargetFor(folder('src'), null, NO_TREE_LINKS)).toBe('src/');
  });

  it('a nested folder row takes it inside the nested folder', () => {
    expect(importTargetFor(folder('src/app/'), null, NO_TREE_LINKS)).toBe('src/app/');
  });

  it("a file row takes the drop into that file's OWN folder", () => {
    expect(importTargetFor(file('src/index.ts'), null, NO_TREE_LINKS)).toBe('src/');
  });

  it('a top-level file row takes it to the project root', () => {
    expect(importTargetFor(file('README.md'), null, NO_TREE_LINKS)).toBe('');
  });

  it('the empty space below the rows is the project root', () => {
    expect(importTargetFor(null, null, NO_TREE_LINKS)).toBe('');
  });
});

describe('what it refuses, and null means nothing is painted', () => {
  it('refuses the .git folder itself', () => {
    expect(importTargetFor(folder('.git/'), null, NO_TREE_LINKS)).toBeNull();
  });

  it('refuses a folder under .git', () => {
    expect(importTargetFor(folder('.git/hooks/'), null, NO_TREE_LINKS)).toBeNull();
  });

  it('refuses a FILE under .git, whose parent is also .git', () => {
    expect(importTargetFor(file('.git/config'), null, NO_TREE_LINKS)).toBeNull();
  });

  it('refuses a nested submodule .git at any depth', () => {
    expect(importTargetFor(folder('vendor/lib/.git/'), null, NO_TREE_LINKS)).toBeNull();
  });

  it('refuses the pending create row itself', () => {
    expect(importTargetFor(folder('src/untitled folder/'), 'src/untitled folder/', NO_TREE_LINKS)).toBeNull();
  });

  it('refuses a file row whose parent is the pending create folder', () => {
    expect(importTargetFor(file('src/pending/x.ts'), 'src/pending/', NO_TREE_LINKS)).toBeNull();
  });

  it('takes a row that merely LOOKS like .git', () => {
    expect(importTargetFor(folder('.github/'), null, NO_TREE_LINKS)).toBe('.github/');
    expect(importTargetFor(file('.gitignore'), null, NO_TREE_LINKS)).toBe('');
  });
});

describe('THE FILTERED TREE, which the charter names as an attack', () => {
  it('answers from the row alone, so a filter cannot move the landing spot', () => {
    // While the filter is open, `src/app/deep.ts` may be the only mounted row
    // and its ancestors may be entirely absent from the viewport. The row
    // still carries its own path, so the answer is the same either way.
    expect(importTargetFor(file('src/app/deep.ts'), null, NO_TREE_LINKS)).toBe('src/app/');
    expect(importTargetFor(folder('src/app/'), null, NO_TREE_LINKS)).toBe('src/app/');
  });
});
