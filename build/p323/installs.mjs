/**
 * build/p323/installs.mjs — every global npm package on this Mac, by version
 * and mtime, READ from files and never run (Phase 323, the tools round after
 * his ruling of 2026-09-30).
 *
 * Shared by `probe:p323` and `build/p323/fence.mjs`, which both read every
 * install before and after a run and stop or report on any move. A registry
 * READ asked of npm (a Claude Code plugin's `npm view vercel version`) moves
 * nothing and is not an install; a global add, by the refusing stub or by the
 * real npm a login shell under his home can find first, moves one of these
 * folders, and that is what an install is.
 *
 * It starts nothing and writes nothing.
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Every global npm package folder that exists: /usr/local's, Homebrew's, and,
 * given his home, his npm-global's and each nvm node's.
 */
export function globalModuleDirs(home = null) {
  const dirs = ['/usr/local/lib/node_modules', '/opt/homebrew/lib/node_modules'];
  if (home !== null) {
    dirs.push(join(home, '.npm-global', 'lib', 'node_modules'));
    const nvm = join(home, '.nvm', 'versions', 'node');
    try {
      for (const v of readdirSync(nvm).sort()) dirs.push(join(nvm, v, 'lib', 'node_modules'));
    } catch {
      /* no nvm */
    }
  }
  return dirs.filter((d) => existsSync(d));
}

/** One global folder's packages as `name@version mtime`, scoped ones included, from each package.json. */
export function globalPackagesAt(dir) {
  const out = [];
  const one = (name, path) => {
    try {
      const pkg = join(path, 'package.json');
      out.push(`${name}@${String(JSON.parse(readFileSync(pkg, 'utf8')).version)} ${statSync(pkg).mtime.toISOString()}`);
    } catch {
      out.push(`${name} unreadable`);
    }
  };
  try {
    for (const e of readdirSync(dir).sort()) {
      if (e.startsWith('.')) continue;
      if (e.startsWith('@')) {
        for (const f of readdirSync(join(dir, e)).sort()) one(`${e}/${f}`, join(dir, e, f));
      } else {
        one(e, join(dir, e));
      }
    }
  } catch (err) {
    return `unreadable: ${String(err?.code ?? err)}`;
  }
  return out.join('; ');
}

/** `{ 'global <dir>': '<name@version mtime; …>' }` for every global folder. */
export function globalInstalls(home = null) {
  const out = {};
  for (const dir of globalModuleDirs(home)) out[`global ${dir}`] = globalPackagesAt(dir);
  return out;
}
