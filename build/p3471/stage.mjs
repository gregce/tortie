/**
 * THE PATH PROVIDER, STAGED SO IT LOADS UNDER PLAIN NODE (Phase 347.1).
 *
 * Moved here verbatim from `conformance:pathdoors` rule 17, its staging and
 * its probe's two cell helpers, so that rule 17, rule 18 and
 * `measure:p3471` (`build/p3471/corpora.mjs`) stage the SAME copy and count
 * cells the SAME way. Two spellings of one stage drift, and a corpus judged
 * through a stage the gate never proved is a corpus judged through nothing.
 *
 * - `stageProvider(text, doorsPath)` rewrites `path-links.ts`'s imports: the
 *   grammar from its own directory, the door predicates from `doorsPath`
 *   (the tree's `src/shared/path-doors.ts`), and the bridge and the store as
 *   stubs, neither of which a hover reaches. Any other runtime import is
 *   returned in `loose`, because the stage could not see it, and every caller
 *   treats a non-empty `loose` as a finding.
 * - `writeStage(dir, { spans, links })` writes the four files exactly as
 *   rule 17 wrote them: `path-spans.ts`, `path-links.ts` (already staged),
 *   `bridge-stub.ts` and `store-stub.ts`.
 * - `cellsOf(text)` and `fakeLine(text)` are the cells the way xterm draws
 *   them and an xterm buffer line over them, so a staged provider can be
 *   hovered with no xterm at all.
 *
 * Imports `node:fs` and `node:path` and nothing else, so `corpora.mjs` and
 * the gate can both import it and a probe can import it by file URL.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The provider's imports, rewritten so a staged copy loads under plain node:
 * the grammar from its own directory, the door predicates from the tree, and
 * the bridge and the store as stubs (neither is reached by a hover). Any
 * other runtime import is a finding, because the stage could not see it.
 */
export function stageProvider(text, doorsPath) {
  let out = text
    .replaceAll("from '@shared/path-spans'", "from './path-spans.ts'")
    .replaceAll("from '@shared/path-doors'", `from '${doorsPath}'`)
    .replaceAll("from '../bridge'", "from './bridge-stub.ts'")
    .replaceAll("from '../state/store'", "from './store-stub.ts'");
  const loose = out
    .split('\n')
    .filter((l) => /^import (?!type )/.test(l) || /^} from '/.test(l))
    .filter((l) => /from '(?:@|\.\.\/)/.test(l));
  return { text: out, loose };
}

/** The four files of one staged provider, as rule 17 writes them. */
export function writeStage(dir, { spans, links }) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'path-spans.ts'), spans);
  writeFileSync(join(dir, 'path-links.ts'), links);
  writeFileSync(join(dir, 'bridge-stub.ts'), 'export function gmuxBridge(): undefined {\n  return undefined;\n}\n');
  writeFileSync(join(dir, 'store-stub.ts'), 'export const useApp = { getState: () => ({ toast: () => undefined }) };\n');
}

// Cells the way xterm draws them: one per code point, a variation selector or
// a combining mark JOINING the cell before it, width 2 in the wide ranges.
export function cellsOf(text) {
  const out = [];
  for (const chars of text) {
    const cp = chars.codePointAt(0) ?? 0;
    const joins = (cp >= 0xfe00 && cp <= 0xfe0f) || (cp >= 0x0300 && cp <= 0x036f) || cp === 0x200d;
    const last = out[out.length - 1];
    if (joins && last !== undefined) { last.chars += chars; continue; }
    const wide = (cp >= 0x2e80 && cp <= 0xa4cf) || (cp >= 0xac00 && cp <= 0xd7a3);
    out.push({ chars, width: wide ? 2 : 1 });
  }
  const at = [];
  for (const cell of out) {
    at.push(cell);
    for (let i = 1; i < cell.width; i += 1) at.push({ chars: '', width: 0 });
  }
  return at;
}

export function fakeLine(text) {
  const at = cellsOf(text);
  return {
    length: at.length,
    translateToString: () => text,
    getCell: (x) => (at[x] === undefined ? undefined : { getChars: () => at[x].chars, getWidth: () => at[x].width })
  };
}
