/**
 * The shared source-scanning primitives behind the "blunt grep" guardrail
 * tests — `keymap-single-source.test.ts` (a modifier glyph in code is a bug)
 * and `ipc-single-bridge.test.ts` (a raw Electron IPC primitive outside the
 * bridge is a bug).
 *
 * Both tests work the same way: walk `src/` for production sources, blank out
 * the comments, and assert that a pattern appears nowhere except an
 * allow-list whose every entry names a MECHANISM. Phase 16 added the second
 * test by copying the first one's two helpers verbatim — 45 identical lines —
 * which is exactly the duplication the growth guardrails tell the integrator
 * to extract after parallel work. They live here now, so a third guardrail
 * test costs an import rather than another copy.
 *
 * NOT a `.test.ts`: vitest only collects `*.test.*`, so this module is a
 * library, and `sourceFiles` skips `__tests__` directories anyway — it never
 * scans itself or the tests that use it.
 */

import { readdirSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

/** `src/` — the root every allow-list path is relative to. */
export const SRC = resolve(__dirname, '..', '..');

/** `src/`-relative, forward-slashed — the form allow-list keys are written in. */
export function relPath(file: string): string {
  return relative(SRC, file).split(sep).join('/');
}

/**
 * Every production `.ts`/`.tsx` under `dir`, recursively. `__tests__` is
 * skipped: a test may legitimately spell the thing it is asserting about.
 */
export function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name === '__tests__') continue;
      sourceFiles(full, out);
    } else if (name.endsWith('.ts') || name.endsWith('.tsx')) {
      out.push(full);
    }
  }
  return out;
}

/**
 * Blank out comments so only executable text is scanned. Block comments are
 * tracked across lines; a line comment counts only when the `//` is not
 * inside a string on that line, which is conservative in the right direction
 * — an unrecognised comment is scanned, never skipped.
 *
 * Line COUNT is preserved (a stripped line becomes empty, never disappears)
 * so callers can report `file:line` against the original.
 */
export function stripComments(source: string): string {
  const out: string[] = [];
  let inBlock = false;
  for (const line of source.split('\n')) {
    let text = line;
    if (inBlock) {
      const end = text.indexOf('*/');
      if (end < 0) {
        out.push('');
        continue;
      }
      text = text.slice(end + 2);
      inBlock = false;
    }
    for (;;) {
      const start = text.indexOf('/*');
      if (start < 0) break;
      const end = text.indexOf('*/', start + 2);
      if (end < 0) {
        text = text.slice(0, start);
        inBlock = true;
        break;
      }
      text = text.slice(0, start) + text.slice(end + 2);
    }
    const slashes = text.indexOf('//');
    if (slashes >= 0 && !/['"`]/.test(text.slice(0, slashes))) {
      text = text.slice(0, slashes);
    }
    out.push(text);
  }
  return out.join('\n');
}
