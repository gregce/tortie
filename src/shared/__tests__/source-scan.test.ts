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
 *  2. The production import cycles the audit named are broken, and the
 *     specific edge that closed each cycle stays gone. These are string
 *     scans of the one forbidden specifier per file, not a graph walk: the
 *     other direction of each former cycle is legitimate and stays.
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

describe('the broken cycle edges stay broken', () => {
  /**
   * file → the import specifier that would re-close its former cycle.
   * Each pair reads as: `file` must never import `specifier` again.
   */
  const FORBIDDEN_EDGES: [string, string][] = [
    // stores.ts <-> agy-owner.ts: the shared leaves moved to
    // harvest/process-table.ts. stores → agy-owner stays; the back edge must not.
    ['main/manifest/harvest/agy-owner.ts', './stores'],
    // SearchView.tsx <-> QueryBlock.tsx: focusResultsList moved to
    // search/results-focus.ts. SearchView → QueryBlock stays.
    ['renderer/search/QueryBlock.tsx', './SearchView'],
    // editor/store.ts <-> tab-io.ts: EditorTab moved to editor/tab-types.ts.
    // store → tab-io stays.
    ['renderer/editor/tab-io.ts', './store'],
    // highlight-pool.ts <-> highlight-pool-impl.ts: DIFF_RENDER_OPTIONS moved
    // to pierre/diff-render-options.ts. The lazy pool → impl import stays.
    ['renderer/pierre/highlight-pool-impl.ts', './highlight-pool'],
    // state/store.ts <-> app/ContextMenu.tsx: MenuSpec now lives with the
    // bridge in ContextMenu. The overlays slice → ContextMenu import stays;
    // ContextMenu must import nothing from state.
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
