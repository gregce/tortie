/**
 * `search:context` — the lines around one hit, read on expand.
 *
 * This channel exists so the STREAM does not have to carry context. Measured
 * (research §3.1): asking ripgrep for `-A1 -B1` costs 214 ms → 394 ms and
 * 47 MB → 84 MB of JSON for lines that are invisible until someone expands a
 * group. Reading them from disk at the moment of the expand costs one open of
 * one file.
 *
 * The read stops as soon as the last wanted line has been seen, so expanding a
 * hit on line 12 of a 400 MB log reads 400 bytes, not 400 MB — and the same
 * `LineSplitter` the NDJSON parser uses does the framing, so a multi-byte
 * character split across two reads cannot corrupt the text here either.
 */

import { createReadStream } from 'node:fs';
import { SEARCH_LIMITS } from '@shared/ipc';
import type { SearchContextInput, SearchContextResult } from '@shared/ipc';
import { gmuxError } from '../errors';
import { resolveInsideRoot, resolveProjectRoot } from '../fs/paths';
import { LineSplitter } from './parser';

/** Hard ceiling on how far either side of a hit a caller may ask for. */
const MAX_CONTEXT_LINES = 200;

function clamp(text: string, maxChars: number): string {
  let line = text;
  if (line.endsWith('\r')) line = line.slice(0, -1);
  return line.length > maxChars ? `${line.slice(0, maxChars)}…` : line;
}

/**
 * Lines `[line-before, line-1]` and `[line+1, line+after]`, in order. The
 * match line itself is excluded — the caller already has it, clamped and
 * highlighted, from the stream.
 */
export async function readSearchContext(
  input: SearchContextInput
): Promise<SearchContextResult> {
  const line = Math.floor(input.line);
  if (!Number.isFinite(line) || line < 1) {
    throw gmuxError('INVALID_INPUT', 'That line number is not valid.');
  }
  const before = Math.min(MAX_CONTEXT_LINES, Math.max(0, Math.floor(input.before ?? 0)));
  const after = Math.min(MAX_CONTEXT_LINES, Math.max(0, Math.floor(input.after ?? 0)));
  const maxChars = Math.max(16, Math.floor(input.maxLineChars ?? SEARCH_LIMITS.maxLineChars));

  const root = await resolveProjectRoot(input.repoPath);
  const { abs } = await resolveInsideRoot(root, input.relPath);

  const from = Math.max(1, line - before);
  const to = line + after;
  if (to < from) return { lines: [] };

  return await new Promise<SearchContextResult>((resolve, reject) => {
    const out: { line: number; text: string }[] = [];
    const splitter = new LineSplitter();
    let n = 0;
    let settled = false;
    const stream = createReadStream(abs);

    const done = (): void => {
      if (settled) return;
      settled = true;
      stream.destroy();
      resolve({ lines: out });
    };

    const take = (text: string): void => {
      n += 1;
      if (n >= from && n <= to && n !== line) {
        out.push({ line: n, text: clamp(text, maxChars) });
      }
      if (n >= to) done();
    };

    stream.on('data', (chunk) => {
      if (settled) return;
      splitter.push(chunk as Buffer, take);
    });
    stream.on('end', () => {
      if (settled) return;
      splitter.flush(take);
      done();
    });
    stream.on('error', (err: NodeJS.ErrnoException) => {
      if (settled) return;
      settled = true;
      reject(
        gmuxError(
          'INVALID_INPUT',
          'That file could not be read.',
          `${input.relPath}: ${err.message}`
        )
      );
    });
  });
}
