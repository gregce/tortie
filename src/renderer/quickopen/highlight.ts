/**
 * Turning "these character indices matched" into renderable runs.
 *
 * The palette shows a path as two pieces — the filename, then its folder —
 * but the ranker reports one set of offsets into the whole relative path,
 * because that is the string it scored. This module is the join: it slices a
 * substring out of that index space and reports which of ITS characters were
 * hits, so each piece can be rendered on its own without either side knowing
 * about the other's offsets.
 *
 * Pure, and tested, because off-by-one here is invisible in review and
 * glaring on screen: the highlight lands one character to the left and every
 * row looks subtly wrong.
 */

export interface HighlightRun {
  text: string;
  /** This run is matched query text. */
  hit: boolean;
}

/**
 * Split `text` — which occupies `[offset, offset + text.length)` of the
 * scored string — into alternating plain/matched runs.
 *
 * `positions` may cover the whole scored string; indices outside this slice
 * are ignored. Adjacent matched characters coalesce into one run so a
 * contiguous match renders as one span rather than eight.
 */
export function highlightRuns(
  text: string,
  positions: readonly number[],
  offset = 0
): HighlightRun[] {
  if (text.length === 0) return [];
  const hit = new Set<number>();
  for (const p of positions) {
    const local = p - offset;
    if (local >= 0 && local < text.length) hit.add(local);
  }
  if (hit.size === 0) return [{ text, hit: false }];

  const runs: HighlightRun[] = [];
  let start = 0;
  let current = hit.has(0);
  for (let i = 1; i <= text.length; i++) {
    const isHit = i < text.length && hit.has(i);
    if (i === text.length || isHit !== current) {
      runs.push({ text: text.slice(start, i), hit: current });
      start = i;
      current = isHit;
    }
  }
  return runs;
}

/**
 * `src/renderer/state/open-file.ts` → the filename, its folder, and where the
 * filename starts in the whole string (which is what `highlightRuns` needs).
 */
export function splitRelPath(relPath: string): {
  name: string;
  dir: string;
  nameOffset: number;
} {
  const slash = relPath.lastIndexOf('/');
  if (slash < 0) return { name: relPath, dir: '', nameOffset: 0 };
  return {
    name: relPath.slice(slash + 1),
    dir: relPath.slice(0, slash),
    nameOffset: slash + 1
  };
}
