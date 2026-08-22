/**
 * Phase 42 stage 8 — the source-scan guards.
 *
 * Three facts this stage established, checked so they stay established:
 *
 *  1. Every production source file is text. One file
 *     (main/manifest/harvest/agy-owner.ts) carried a literal NUL byte inside
 *     a template string for months; `file` classified it as data, grep
 *     treated it as binary, and diffs of it rendered as "Binary files
 *     differ". The byte is now spelled as a backslash-u escape and no
 *     source file may contain a raw control byte again.
 *
 *  2. Phase 123 replaced this stage's cycle checks with a graph gate.
 *     build/assert-no-runtime-cycles.mjs parses every production source
 *     file, builds the runtime import graph and reports every strongly
 *     connected component, so a cycle that closes through a new edge is
 *     caught. The string table that used to live here named one specifier
 *     per known cycle, and it passed for months while seven components
 *     existed across thirty-eight modules. One row of that table survives,
 *     because it is stricter than the graph rule rather than weaker. See
 *     the describe below for why.
 *
 *  3. The manifest's JSON-object column reader has exactly one copy.
 *     contract.ts and context-snapshot.ts carried byte-identical private
 *     `parseObject` functions; both now import ../json-column.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = resolve(__dirname, '..', '..');

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') continue;
      sourceFiles(path, out);
    } else if (/\.(ts|tsx|css|html)$/.test(entry.name)) {
      out.push(path);
    }
  }
  return out;
}

describe('every source file is text', () => {
  it('no raw NUL or other C0 control byte outside tab, newline, return', () => {
    const offenders: string[] = [];
    for (const file of sourceFiles(SRC)) {
      const bytes = readFileSync(file);
      for (const b of bytes) {
        if (b < 0x20 && b !== 0x09 && b !== 0x0a && b !== 0x0d) {
          offenders.push(`${relative(SRC, file)} (byte 0x${b.toString(16)})`);
          break;
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe('the one boundary the graph gate cannot see', () => {
  /**
   * Phase 123 moved every cycle check to build/assert-no-runtime-cycles.mjs,
   * which runs on `npm run typecheck`. Four of the five rows that used to be
   * here named a two-module cycle, and the graph gate now catches all four
   * whichever edge closes them.
   *
   * This row is not a cycle rule and the graph gate would not catch it.
   * state/overlays-slice.ts imports ../app/ContextMenu, so ContextMenu
   * importing state/store.ts would close a cycle and the graph gate would
   * fail. ContextMenu importing a state LEAF, e.g. state/errors.ts, closes
   * no cycle, so the graph gate would pass it while the boundary is broken
   * all the same. MenuSpec lives with the bridge in ContextMenu, and
   * ContextMenu imports nothing from state at all. That is a stricter rule
   * than "no cycle", so it stays stated here as a string.
   *
   * A later round that deletes this row for tidiness weakens the boundary.
   * Delete it only with a replacement rule that is at least as strict.
   */
  const FORBIDDEN_EDGES: [string, string][] = [
    ['renderer/app/ContextMenu.tsx', '../state/']
  ];

  for (const [file, specifier] of FORBIDDEN_EDGES) {
    it(`${file} does not import '${specifier}'`, () => {
      const text = readFileSync(join(SRC, file), 'utf8');
      const hits = [...text.matchAll(/from\s+'([^']+)'/g)]
        .map((m) => m[1] ?? '')
        .filter((spec) => spec === specifier || spec.startsWith(specifier));
      expect(hits).toEqual([]);
    });
  }
});

describe('one JSON-object column reader in the manifest', () => {
  const CALLERS = [
    'main/manifest/contract.ts',
    'main/manifest/context-snapshot.ts'
  ];

  for (const file of CALLERS) {
    it(`${file} imports the shared copy and defines none of its own`, () => {
      const text = readFileSync(join(SRC, file), 'utf8');
      expect(text).not.toMatch(/function parseObject\b/);
      expect(text).toMatch(/import \{ parseObject \} from '\.\/json-column'/);
    });
  }
});
