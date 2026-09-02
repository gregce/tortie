/**
 * The argv a History search composes (Phase 199), in one place so the rule
 * can be read in one place and proved in one place. `npm run
 * conformance:historysearch` runs these functions under node over the attack
 * shapes and proves what this header claims; a later round that adds a form
 * here adds it there in the same commit.
 *
 * THE RULE. Every value a person typed reaches git as ONE argv element, and
 * never as one that git could read as a flag:
 *
 *   --grep=<value>          attached, never `--grep <value>`
 *   --author=<value>        attached
 *   -S<value>               attached, never `-S <value>`
 *   -- :(literal)<path>     after the end of revisions, never before it
 *   --end-of-options <rev>  before anything `rev-parse` could take as a flag
 *
 * A value beginning with a dash therefore stays a value, and `-S-x` asks git
 * for the string `-x`. Patterns are fixed strings (`--fixed-strings`) and
 * case is ignored (`--regexp-ignore-case`), because git's default basic
 * regex makes `Greg [` fatal and `a\|b` an alternation, and a person typing
 * into a field is not writing a regex. Line breaks fold to a space, because
 * a newline inside `--grep=` is a second pattern and a trailing one matches
 * every commit, measured at 741 of 741. An empty value contributes nothing,
 * because `--grep=` alone matches everything.
 *
 * No `runGit` here, no path validation here: this module composes argv from
 * values the service already validated, and it imports nothing.
 */

import type { GitHistorySearch } from '@shared/types';

/** A search with every value folded and every empty one removed. */
export interface NormalizedSearch {
  message: string | null;
  author: string | null;
  commit: string | null;
  path: string | null;
  change: string | null;
}

/** Line breaks become one space; surrounding space goes; empty is null. */
export function foldValue(value: string | undefined): string | null {
  if (typeof value !== 'string') return null;
  const folded = value.replace(/[\r\n]+/g, ' ').trim();
  return folded.length === 0 ? null : folded;
}

/**
 * The search with nothing empty in it, or null when nothing was asked: a
 * query that is only an operator is the plain walk, not a filtered one.
 */
export function normalizeSearch(
  search: GitHistorySearch | undefined
): NormalizedSearch | null {
  if (search === undefined || search === null) return null;
  const out: NormalizedSearch = {
    message: foldValue(search.message),
    author: foldValue(search.author),
    commit: foldValue(search.commit),
    path: foldValue(search.path),
    change: foldValue(search.change)
  };
  return out.message === null &&
    out.author === null &&
    out.commit === null &&
    out.path === null &&
    out.change === null
    ? null
    : out;
}

/**
 * The filter flags for `git log`. Each value is exactly one element in its
 * attached form. The two pattern flags ride along only when a pattern does.
 */
export function searchFilterArgs(search: NormalizedSearch): string[] {
  const args: string[] = [];
  if (search.message !== null) args.push(`--grep=${search.message}`);
  if (search.author !== null) args.push(`--author=${search.author}`);
  if (search.message !== null || search.author !== null) {
    args.push('--fixed-strings', '--regexp-ignore-case');
  }
  if (search.change !== null) args.push(`-S${search.change}`);
  return args;
}

/**
 * The pathspec tail: the end of revisions marker, then the literal spec the
 * service built from a validated relative path. Always the LAST two elements
 * of the argv, because git reads everything after `--` as a path.
 */
export function pathspecArgs(literalSpec: string): string[] {
  return ['--', literalSpec];
}

/**
 * `rev-parse --verify --quiet` over one name, with `--end-of-options` before
 * it so a name beginning with a dash is a name. `^{commit}` peels a tag and
 * refuses a tree or a blob, which is what "one row" needs.
 */
export function revParseArgs(rev: string): string[] {
  return ['rev-parse', '--verify', '--quiet', '--end-of-options', `${rev}^{commit}`];
}

/** Milliseconds a `-S` walk may run: it is seconds on a large repository. */
export const CHANGE_SEARCH_TIMEOUT_MS = 180_000;
