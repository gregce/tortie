/**
 * The symbol indexer's file list — ripgrep, through the SAME resolver and the
 * SAME argv builder every other consumer uses.
 *
 * O2 in research 19 says "one ripgrep, three consumers", and this is the third
 * one. Its preferred source is quick open's resident worker, which already
 * holds an authoritative, watcher-refreshed list; the research names the
 * fallback for when that worker is not warm — "falls back to its own
 * listFiles() (same files-args.ts)". Today the coordinator is deliberately
 * IPC-only (`nothing else in main talks to this module at all`), so this IS
 * the path taken. What matters is the invariant the override actually
 * protects: there is no second `.gitignore` implementation. `rgBinaryPath()`
 * and `buildListFilesArgs()` are imported, not copied — ripgrep stays the only
 * thing in gmux that knows what is ignored.
 *
 * IF the coordinator later exposes its list, this module becomes a fallback in
 * one place and nothing else changes.
 */

import { spawn } from 'node:child_process';
import { buildListFilesArgs } from '../search/files-args';
import { rgBinaryPath } from '../search/resolve';
import { grammarFor } from './languages';

/**
 * Every file in `repoPath` that gmux can extract symbols from.
 *
 * Filtered to indexable extensions HERE rather than by handing ripgrep a glob
 * union, for a boring reason that matters: the extension → grammar map in
 * languages.ts is the one truth about what gmux can parse, and a second copy
 * of it expressed as `-g '*.ts' -g '*.tsx' …` would drift the first time
 * somebody adds a language.
 */
export async function listIndexableFiles(
  repoPath: string,
  signal?: AbortSignal
): Promise<string[]> {
  const raw = await runRgFiles(repoPath, signal);
  const out: string[] = [];
  for (const relPath of raw) {
    if (grammarFor(relPath) !== null) out.push(relPath);
  }
  return out;
}

function runRgFiles(
  repoPath: string,
  signal?: AbortSignal
): Promise<string[]> {
  return new Promise<string[]>((resolve, reject) => {
    let child;
    try {
      child = spawn(rgBinaryPath(), buildListFilesArgs(), {
        cwd: repoPath,
        stdio: ['ignore', 'pipe', 'pipe']
      });
    } catch (err) {
      reject(err as Error);
      return;
    }

    const paths: string[] = [];
    let carry = '';
    let stderr = '';

    const onAbort = (): void => {
      child.kill('SIGKILL');
    };
    signal?.addEventListener('abort', onAbort, { once: true });

    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      const text = carry + chunk;
      let from = 0;
      for (;;) {
        const nl = text.indexOf('\n', from);
        if (nl === -1) break;
        const line = text.slice(from, nl);
        if (line.length > 0) paths.push(line);
        from = nl + 1;
      }
      carry = text.slice(from);
    });
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk: string) => {
      if (stderr.length < 4096) stderr += chunk;
    });

    child.on('error', (err) => {
      signal?.removeEventListener('abort', onAbort);
      reject(err);
    });
    child.on('close', (code) => {
      signal?.removeEventListener('abort', onAbort);
      if (carry.length > 0) paths.push(carry);
      // rg exits 1 for "no files matched", which is an empty project, not a
      // failure. Anything else with stderr is worth reporting.
      if (code !== 0 && code !== 1 && stderr.trim().length > 0) {
        reject(new Error(stderr.trim()));
        return;
      }
      resolve(paths);
    });
  });
}
