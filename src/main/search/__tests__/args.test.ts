/**
 * The ripgrep argv builder. Every case here is one the UI can produce and
 * none of them are visible in a screenshot: a glob that means the wrong
 * thing, a `.git` exclusion a user include silently overrides, or a query
 * starting with `-` that ripgrep reads as a flag.
 */

import { describe, expect, it } from 'vitest';
import type { ContentSearchInput } from '@shared/ipc';
import { SEARCH_LIMITS } from '@shared/ipc';
import {
  buildContentSearchArgs,
  expandGlob,
  needsMultiline,
  searchLimits,
  translateGlobList
} from '../args';

function input(over: Partial<ContentSearchInput> = {}): ContentSearchInput {
  return {
    repoPath: '/tmp/proj',
    query: 'needle',
    isRegex: false,
    isCaseSensitive: false,
    matchWholeWord: false,
    includes: '',
    excludes: '',
    useIgnoreFiles: true,
    contextLines: 0,
    ...over
  };
}

/** Index of `value` among the args, or -1. */
function at(args: string[], value: string): number {
  return args.indexOf(value);
}

describe('expandGlob', () => {
  it('expands a bare NAME to both the file and the whole subtree', () => {
    // Typing `node_modules` in "files to exclude" has to exclude the folder.
    expect(expandGlob('node_modules')).toEqual([
      '**/node_modules/**',
      '**/node_modules'
    ]);
  });

  it('keeps a bare extension pattern depth-independent', () => {
    expect(expandGlob('*.ts')).toContain('**/*.ts');
  });

  it('anchors a pattern that contains a slash to the search root', () => {
    // Otherwise `src/**` would also match `vendor/src/`.
    expect(expandGlob('src/**')).toEqual(['/src/**']);
    expect(expandGlob('./src/**')).toEqual(['/src/**']);
  });

  it('turns a trailing slash into a subtree', () => {
    expect(expandGlob('out/')).toEqual(['/out/**']);
  });

  it('leaves an already-globstar-prefixed pattern alone', () => {
    expect(expandGlob('**/dist/**')).toEqual(['**/dist/**']);
  });

  it('drops empty entries rather than emitting a match-everything glob', () => {
    expect(expandGlob('   ')).toEqual([]);
    expect(translateGlobList(' , ,', false)).toEqual([]);
  });

  it('negates every glob of an exclude list, deduped', () => {
    expect(translateGlobList('dist, dist', true)).toEqual([
      '!**/dist/**',
      '!**/dist'
    ]);
  });
});

describe('buildContentSearchArgs', () => {
  it('refuses an empty query instead of matching every line', () => {
    expect(() => buildContentSearchArgs(input({ query: '' }))).toThrow();
  });

  it('carries the four non-negotiable flags', () => {
    const args = buildContentSearchArgs(input());
    expect(args).toContain('--hidden');
    expect(args).toContain('--no-require-git');
    expect(args).toContain('--no-config');
    expect(args).toContain('--engine');
    expect(args).toContain('--json');
  });

  it('passes the pattern as a flag value so a leading dash is a query', () => {
    const args = buildContentSearchArgs(input({ query: '--help' }));
    expect(args[args.length - 4]).toBe('--regexp');
    expect(args[args.length - 2]).toBe('--');
    expect(args[args.length - 1]).toBe('.');
    expect(args[args.indexOf('--regexp') + 1]).toBe('--help');
  });

  it('excludes .git AFTER the user globs, so an include cannot re-admit it', () => {
    const args = buildContentSearchArgs(input({ includes: '**/*.json' }));
    const dotGit = at(args, '!.git/');
    const include = at(args, '**/*.json');
    expect(dotGit).toBeGreaterThan(include);
  });

  it('is literal by default and a regex only when asked', () => {
    expect(buildContentSearchArgs(input())).toContain('--fixed-strings');
    expect(buildContentSearchArgs(input({ isRegex: true }))).not.toContain(
      '--fixed-strings'
    );
  });

  it('maps the three toggles', () => {
    expect(buildContentSearchArgs(input())).toContain('--ignore-case');
    expect(
      buildContentSearchArgs(input({ isCaseSensitive: true }))
    ).toContain('--case-sensitive');
    expect(
      buildContentSearchArgs(input({ matchWholeWord: true }))
    ).toContain('--word-regexp');
  });

  it('turns ignore files off with the one flag that covers all of them', () => {
    expect(buildContentSearchArgs(input())).not.toContain('--no-ignore');
    expect(
      buildContentSearchArgs(input({ useIgnoreFiles: false }))
    ).toContain('--no-ignore');
  });

  it('never asks ripgrep for context lines (they are fetched on expand)', () => {
    const args = buildContentSearchArgs(input({ contextLines: 3 }));
    expect(args).not.toContain('--after-context');
    expect(args).not.toContain('--before-context');
  });

  it('adds --replace only for a preview request', () => {
    expect(buildContentSearchArgs(input())).not.toContain('--replace');
    const args = buildContentSearchArgs(input({ replace: 'x' }));
    expect(args[args.indexOf('--replace') + 1]).toBe('x');
  });

  it('caps file size so one 2 GB log cannot own the search', () => {
    const args = buildContentSearchArgs(input());
    expect(args[args.indexOf('--max-filesize') + 1]).toBe(
      String(SEARCH_LIMITS.maxFilesizeBytes)
    );
  });
});

describe('needsMultiline', () => {
  it('is off for an ordinary query', () => {
    expect(needsMultiline(input())).toBe(false);
  });

  it('turns itself on for a pattern that can cross a line', () => {
    expect(needsMultiline(input({ isRegex: true, query: 'a\\nb' }))).toBe(true);
    expect(needsMultiline(input({ query: 'a\nb' }))).toBe(true);
  });

  it('obeys an explicit override either way', () => {
    expect(needsMultiline(input({ multiline: true }))).toBe(true);
    expect(
      needsMultiline(input({ isRegex: true, query: 'a\\nb', multiline: false }))
    ).toBe(false);
  });
});

describe('searchLimits', () => {
  it('falls back to the shared defaults', () => {
    expect(searchLimits(input())).toEqual({
      maxResults: SEARCH_LIMITS.maxResults,
      maxPerFile: SEARCH_LIMITS.maxPerFile,
      maxLineChars: SEARCH_LIMITS.maxLineChars,
      maxFilesizeBytes: SEARCH_LIMITS.maxFilesizeBytes
    });
  });

  it('refuses nonsense rather than propagating it into a spawn', () => {
    const limits = searchLimits(
      input({ maxResults: 0, maxPerFile: -3, maxLineChars: 2 })
    );
    expect(limits.maxResults).toBe(SEARCH_LIMITS.maxResults);
    expect(limits.maxPerFile).toBe(SEARCH_LIMITS.maxPerFile);
    expect(limits.maxLineChars).toBe(16);
  });
});
