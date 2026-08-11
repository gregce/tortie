/**
 * `rg --files` argv — the ONE file enumeration in gmux (O2 in
 * docs/research/19-search.md: "one ripgrep, three consumers").
 *
 * Quick open's resident worker spawns this, and the symbol indexer consumes
 * that worker's list rather than walking again. It lives here, next to the
 * content-search argv, so there is exactly one place that knows what "the
 * files of a project" means — and so there is never a second `.gitignore`
 * implementation anywhere under src/main/search/**. Ripgrep is the only thing
 * in gmux that knows what is ignored.
 *
 * Measured (research §3.2): 16 ms for 11,885 files, 157 ms for 271,791, first
 * path on stdout at 4 ms regardless of size — and it is the only enumerator
 * tried that honours NESTED .gitignore. The glob libraries returned 10x too
 * many files because they walked node_modules.
 */

export interface ListFilesOptions {
  /** false → --no-ignore (the ⌘P equivalent of the search opt-out). */
  useIgnoreFiles?: boolean;
  /** Extra globs, already in ripgrep syntax (e.g. '!**\/*.min.js'). */
  extraGlobs?: string[];
}

/**
 * Enumerate every file of a project, one path per line on stdout, relative to
 * the cwd the caller spawns with (the repo root).
 *
 * node_modules is excluded here but NOT in content search, and that asymmetry
 * is deliberate: ⌘P is a picker over files a human might open, while ⌘⇧F is
 * how you find the one line in a dependency that explains a bug.
 */
export function buildListFilesArgs(options: ListFilesOptions = {}): string[] {
  const args = [
    '--files',
    '--hidden',
    '--no-require-git',
    '--no-config',
    '--no-messages'
  ];
  if (options.useIgnoreFiles === false) args.push('--no-ignore');
  for (const glob of options.extraGlobs ?? []) args.push('-g', glob);
  args.push('-g', '!.git', '-g', '!node_modules', '-g', '!.DS_Store');
  return args;
}
