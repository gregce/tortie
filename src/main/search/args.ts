/**
 * ContentSearchInput → ripgrep argv. Pure, so the quirks are unit-testable
 * (docs/research/19-search.md §2.3, D1 §4.2 — VS Code's `getRgArgs` with the
 * corrections the research measured).
 *
 * The four flags that are NOT taste:
 *
 *  - `--no-config` — without it a user's RIPGREP_CONFIG_PATH silently changes
 *    gmux's results. A search that disagrees with itself between machines is
 *    worse than a search that is missing a flag.
 *  - `--hidden` — `.claude/`, `.specstory/`, `.github/` and dotfile configs
 *    are first-class content in an agentic shell, and ripgrep skips them by
 *    default.
 *  - `-g '!.git/'` — the price of `--hidden`. Measured: it is worth 78% of the
 *    file count on this repo. Note the honest framing from the research: this
 *    is RESULT HYGIENE, not speed (+0.6% to +45%, because packfiles trip
 *    ripgrep's binary detection anyway).
 *  - `--engine auto` — lets ripgrep fall back to PCRE2 (present, JIT-enabled)
 *    for lookaround instead of erroring at the user.
 *
 * `--no-messages` deserves its own note. Without it, one broken symlink or one
 * unreadable directory puts text on stderr AND makes ripgrep exit 2, which the
 * engine would have to show as a failed search. With it, per-file read errors
 * are suppressed while regex-parse errors — the ones the user can actually fix
 * — still come through. The engine only classifies an exit as an error when
 * stderr is non-empty, so the two cases stay distinguishable.
 */

import type { ContentSearchInput } from '@shared/ipc';
import { SEARCH_LIMITS } from '@shared/ipc';
import { gmuxError } from '../errors';

/**
 * One user glob → the ripgrep globs it means, VS Code-style.
 *
 * The rule that surprises people: a pattern with NO slash is a NAME, and it
 * has to match both a file and a directory's whole subtree — typing
 * `node_modules` in "files to exclude" must exclude the folder, not just a
 * file literally called `node_modules`. VS Code expands it to two globs and
 * so do we. A pattern WITH a slash is a path and is anchored to the search
 * root, so `src/**` cannot accidentally match `vendor/src/`.
 */
export function expandGlob(pattern: string): string[] {
  let p = pattern.trim();
  if (p.length === 0) return [];
  while (p.startsWith('./')) p = p.slice(2);
  if (p.length === 0) return [];

  if (!p.includes('/')) {
    const both = [`**/${p}/**`, `**/${p}`].map((g) =>
      g.replaceAll('**/**', '**')
    );
    return [...new Set(both)];
  }

  if (p.endsWith('/')) p = `${p}**`;
  const anchored = p.startsWith('**') || p.startsWith('/') ? p : `/${p}`;
  return [anchored];
}

/** A comma-separated glob list → ripgrep globs, optionally negated. */
export function translateGlobList(list: string, negate: boolean): string[] {
  const out: string[] = [];
  for (const raw of list.split(',')) {
    for (const glob of expandGlob(raw)) {
      const g = negate ? `!${glob}` : glob;
      if (!out.includes(g)) out.push(g);
    }
  }
  return out;
}

/**
 * True when the pattern can match across a line boundary, in which case
 * ripgrep needs `--multiline` or it silently finds nothing. Auto-detection
 * exists because a user who types `foo\nbar` has already told us.
 */
export function needsMultiline(input: ContentSearchInput): boolean {
  if (input.multiline !== undefined) return input.multiline;
  if (input.query.includes('\n') || input.query.includes('\r')) return true;
  return input.isRegex && /\\[nr]/.test(input.query);
}

/** The clamped, defaulted view of the caller's limits. */
export function searchLimits(input: ContentSearchInput): {
  maxResults: number;
  maxPerFile: number;
  maxLineChars: number;
  maxFilesizeBytes: number;
} {
  const positive = (value: number | undefined, fallback: number): number =>
    typeof value === 'number' && Number.isFinite(value) && value > 0
      ? Math.floor(value)
      : fallback;
  return {
    maxResults: positive(input.maxResults, SEARCH_LIMITS.maxResults),
    maxPerFile: positive(input.maxPerFile, SEARCH_LIMITS.maxPerFile),
    // A 1-char window would be nonsense; 16 is the floor that keeps the
    // "… window around the match …" shape meaningful.
    maxLineChars: Math.max(16, positive(input.maxLineChars, SEARCH_LIMITS.maxLineChars)),
    maxFilesizeBytes: positive(
      input.maxFilesizeBytes,
      SEARCH_LIMITS.maxFilesizeBytes
    )
  };
}

/**
 * Build the argv. Throws INVALID_INPUT for an empty query — an empty pattern
 * matches every line of every file, which is never what anyone meant.
 */
export function buildContentSearchArgs(input: ContentSearchInput): string[] {
  if (typeof input.query !== 'string' || input.query.length === 0) {
    throw gmuxError('INVALID_INPUT', 'Type something to search for.');
  }

  const limits = searchLimits(input);
  const args: string[] = ['--hidden', '--no-require-git', '--no-config', '--no-messages'];

  args.push(input.isCaseSensitive ? '--case-sensitive' : '--ignore-case');
  if (input.matchWholeWord) args.push('--word-regexp');

  // Globs, in precedence order — ripgrep lets a LATER glob override an
  // earlier one, so `!.git/` goes last and cannot be re-included by a user
  // include like `**/*.json`.
  for (const g of translateGlobList(input.includes ?? '', false)) {
    args.push('-g', g);
  }
  for (const g of translateGlobList(input.excludes ?? '', true)) {
    args.push('-g', g);
  }
  args.push('-g', '!.git/');

  // The opt-out is one flag: --no-ignore implies --no-ignore-{vcs,parent,
  // global,dot,exclude,files}. Measured cost of turning ignores off: 12-80x.
  if (!input.useIgnoreFiles) args.push('--no-ignore');

  args.push('--max-filesize', String(limits.maxFilesizeBytes));
  args.push('--crlf', '--engine', 'auto');

  if (!input.isRegex) args.push('--fixed-strings');
  if (needsMultiline(input)) args.push('--multiline');

  // NOTE `input.contextLines` is deliberately NOT translated into -A/-B. The
  // stream carries no context: measured, `-A1 -B1` costs 214 ms → 394 ms and
  // 47 MB → 84 MB for lines that are invisible until a group is expanded. The
  // `search:context` channel reads them from disk at that moment instead. The
  // field stays in the contract because that is where the decision is
  // documented — a caller setting it gets no context and no lie about it.

  args.push('--json');
  if (typeof input.replace === 'string') args.push('--replace', input.replace);

  // The pattern rides as a flag value, never as a positional: a query that
  // starts with '-' is a query, not a flag.
  args.push('--regexp', input.query);
  args.push('--', '.');
  return args;
}
