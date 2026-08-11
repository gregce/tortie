/*---------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License.
 *  See https://github.com/microsoft/vscode/blob/main/LICENSE.txt
 *--------------------------------------------------------------------------*/

/**
 * VENDORED, NOT INVENTED (CLAUDE.md guardrail 2 — "assemble, never
 * reimplement"). This is a faithful extract of VS Code's
 * `src/vs/base/common/fuzzyScorer.ts` (microsoft/vscode @ main, fetched
 * 2026-08-10), reduced to the POSIX/macOS path case and typed for gmux.
 *
 * UPSTREAM FILE:  microsoft/vscode → src/vs/base/common/fuzzyScorer.ts
 *                 (plus three one-line helpers pulled in from
 *                 `strings.ts` / `filters.ts`: startsWithIgnoreCase,
 *                 matchesPrefix, isUpper).
 * DEPENDENCY SHIMS APPLIED: `sep = '/'`, `isWindows = isLinux = false`.
 * WHAT WAS DROPPED: the Windows/Linux path branches, the accessibility
 *                 label plumbing, the `IItemAccessor` indirection and the
 *                 separate-scores caching layer — gmux hands the reranker a
 *                 plain array of relative paths and wants nothing else.
 * DERIVED FROM:   docs/research/assets/phase14/vscode-fuzzy-scorer-extract.mjs
 *                 — the 275-line extract that research 19 benchmarked
 *                 (26/26 labelled targets in the top 5). Do not re-derive it;
 *                 this file is that file with types and the `?? 0` guards
 *                 TypeScript needs.
 *
 * WHY THIS AND NOT `fzf`: research 19 §0.2 override O1. `fzf@0.5.2` ranks
 * marginally better (MRR 0.919 vs 0.876) but is BSD-3-Clause (the phase
 * constraint is MIT/Apache), has had no functional commit since 2023-04-25,
 * and loses the property a picker actually needs: this scorer put ALL 26
 * labelled targets in the top 5, fzf put 25.
 *
 * WHERE IT SITS: stage TWO of the two-stage ranker. `fuzzysort` gates a
 * whole 50k-270k path list down to the best 512 in ~1-10 ms (it is the only
 * scorer fast enough to touch the whole list); this reranks those 512 the
 * way VS Code's quick open would have. See worker.ts.
 */

const NO_MATCH = 0;
const sep = '/';

/** A half-open [start, end) span of matched characters. */
export interface FuzzyMatch {
  start: number;
  end: number;
}

const NO_SCORE: [number, number[]] = [NO_MATCH, []];

const CC = {
  Slash: 47,
  Backslash: 92,
  Underline: 95,
  Dash: 45,
  Period: 46,
  Space: 32,
  SingleQuote: 39,
  DoubleQuote: 34,
  Colon: 58,
  A: 65,
  Z: 90
} as const;

function isUpper(code: number): boolean {
  return CC.A <= code && code <= CC.Z;
}

function startsWithIgnoreCase(str: string, candidate: string): boolean {
  const candidateLength = candidate.length;
  if (candidate.length > str.length) return false;
  return str.substr(0, candidateLength).toLowerCase() === candidate.toLowerCase();
}

function matchesPrefix(
  word: string,
  wordToMatchAgainst: string
): FuzzyMatch[] | null {
  if (!wordToMatchAgainst || wordToMatchAgainst.length < word.length) {
    return null;
  }
  if (!startsWithIgnoreCase(wordToMatchAgainst, word)) return null;
  return word.length > 0 ? [{ start: 0, end: word.length }] : [];
}

function considerAsEqual(a: string, b: string): boolean {
  if (a === b) return true;
  if (a === '/' || a === '\\') return b === '/' || b === '\\';
  return false;
}

function scoreSeparatorAtPos(charCode: number): number {
  switch (charCode) {
    case CC.Slash:
    case CC.Backslash:
      return 5;
    case CC.Underline:
    case CC.Dash:
    case CC.Period:
    case CC.Space:
    case CC.SingleQuote:
    case CC.DoubleQuote:
    case CC.Colon:
      return 4;
    default:
      return 0;
  }
}

function computeCharScore(
  qc: string,
  qlc: string,
  target: string,
  targetLower: string,
  targetIndex: number,
  seqLen: number
): number {
  let score = 0;
  if (!considerAsEqual(qlc, targetLower[targetIndex] ?? '')) return score;
  score += 1; // char match
  if (seqLen > 0) {
    score += Math.min(seqLen, 3) * 6 + Math.max(0, seqLen - 3) * 3; // consecutive
  }
  if (qc === target[targetIndex]) score += 1; // same case
  if (targetIndex === 0) {
    score += 8; // start of word
  } else {
    const sepBonus = scoreSeparatorAtPos(target.charCodeAt(targetIndex - 1));
    if (sepBonus) score += sepBonus;
    else if (isUpper(target.charCodeAt(targetIndex)) && seqLen === 0) score += 2; // camelCase
  }
  return score;
}

function doScoreFuzzy(
  query: string,
  queryLower: string,
  queryLength: number,
  target: string,
  targetLower: string,
  targetLength: number,
  allowNonContiguous: boolean
): [number, number[]] {
  const scores: number[] = [];
  const matches: number[] = [];
  for (let qi = 0; qi < queryLength; qi++) {
    const qOff = qi * targetLength;
    const qPrevOff = qOff - targetLength;
    const qGt0 = qi > 0;
    const qc = query[qi] ?? '';
    const qlc = queryLower[qi] ?? '';
    for (let ti = 0; ti < targetLength; ti++) {
      const tGt0 = ti > 0;
      const cur = qOff + ti;
      const left = cur - 1;
      const diag = qPrevOff + ti - 1;
      const leftScore = tGt0 ? (scores[left] ?? 0) : 0;
      const diagScore = qGt0 && tGt0 ? (scores[diag] ?? 0) : 0;
      const seqLen = qGt0 && tGt0 ? (matches[diag] ?? 0) : 0;
      let score: number;
      if (!diagScore && qGt0) score = 0;
      else score = computeCharScore(qc, qlc, target, targetLower, ti, seqLen);
      const valid = score && diagScore + score >= leftScore;
      if (
        valid &&
        (allowNonContiguous || qGt0 || targetLower.startsWith(queryLower, ti))
      ) {
        matches[cur] = seqLen + 1;
        scores[cur] = diagScore + score;
      } else {
        matches[cur] = NO_MATCH;
        scores[cur] = leftScore;
      }
    }
  }
  const positions: number[] = [];
  let qi = queryLength - 1;
  let ti = targetLength - 1;
  while (qi >= 0 && ti >= 0) {
    const cur = qi * targetLength + ti;
    if (matches[cur] === NO_MATCH) ti--;
    else {
      positions.push(ti);
      qi--;
      ti--;
    }
  }
  return [scores[queryLength * targetLength - 1] ?? 0, positions.reverse()];
}

export function scoreFuzzy(
  target: string,
  query: string,
  queryLower: string,
  allowNonContiguous: boolean
): [number, number[]] {
  if (!target || !query) return NO_SCORE;
  const tl = target.length;
  const ql = query.length;
  if (tl < ql) return NO_SCORE;
  return doScoreFuzzy(
    query,
    queryLower,
    ql,
    target,
    target.toLowerCase(),
    tl,
    allowNonContiguous
  );
}

const PATH_IDENTITY_SCORE = 1 << 18;
const LABEL_PREFIX_SCORE_THRESHOLD = 1 << 17;
const LABEL_SCORE_THRESHOLD = 1 << 16;

export const THRESHOLDS = {
  PATH_IDENTITY_SCORE,
  LABEL_PREFIX_SCORE_THRESHOLD,
  LABEL_SCORE_THRESHOLD
} as const;

function createMatches(offsets: number[] | undefined): FuzzyMatch[] {
  const ret: FuzzyMatch[] = [];
  if (!offsets) return ret;
  let last: FuzzyMatch | undefined;
  for (const pos of offsets) {
    if (last && last.end === pos) last.end += 1;
    else {
      last = { start: pos, end: pos + 1 };
      ret.push(last);
    }
  }
  return ret;
}

function normalizeMatches(matches: FuzzyMatch[]): FuzzyMatch[] {
  const sorted = matches.sort((a, b) => a.start - b.start);
  const out: FuzzyMatch[] = [];
  let cur: FuzzyMatch | undefined;
  for (const m of sorted) {
    if (!cur || !(cur.end >= m.start && m.end >= cur.start)) {
      cur = m;
      out.push(m);
    } else {
      cur.start = Math.min(cur.start, m.start);
      cur.end = Math.max(cur.end, m.end);
    }
  }
  return out;
}

/** What `scoreItem` produced: a score plus where the characters landed. */
export interface ItemScore {
  score: number;
  labelMatch?: FuzzyMatch[];
  descriptionMatch?: FuzzyMatch[];
}

const NO_ITEM_SCORE: ItemScore = Object.freeze({ score: NO_MATCH });

/** One piece of a (possibly space-split) query, normalized once. */
export interface PreparedQueryPiece {
  original: string;
  originalLowercase: string;
  pathNormalized: string;
  normalized: string;
  normalizedLowercase: string;
  expectContiguousMatch: boolean;
}

export interface PreparedQuery extends PreparedQueryPiece {
  /** Set only when the query had spaces: each piece must match. */
  values?: PreparedQueryPiece[];
  containsPathSeparator: boolean;
}

function doScoreItemFuzzySingle(
  label: string,
  description: string | undefined,
  path: string | undefined,
  q: PreparedQueryPiece,
  preferLabelMatches: boolean,
  allowNonContiguous: boolean
): ItemScore {
  if (preferLabelMatches || !description) {
    const [labelScore, labelPositions] = scoreFuzzy(
      label,
      q.normalized,
      q.normalizedLowercase,
      allowNonContiguous && !q.expectContiguousMatch
    );
    if (labelScore) {
      const labelPrefixMatch = matchesPrefix(q.normalized, label);
      let baseScore: number;
      if (labelPrefixMatch) {
        baseScore =
          LABEL_PREFIX_SCORE_THRESHOLD +
          Math.round((q.normalized.length / label.length) * 100);
      } else {
        baseScore = LABEL_SCORE_THRESHOLD;
      }
      return {
        score: baseScore + labelScore,
        labelMatch: labelPrefixMatch || createMatches(labelPositions)
      };
    }
  }
  if (description) {
    const descriptionPrefix = path ? `${description}${sep}` : description;
    const dpl = descriptionPrefix.length;
    const combined = `${descriptionPrefix}${label}`;
    const [s, positions] = scoreFuzzy(
      combined,
      q.normalized,
      q.normalizedLowercase,
      allowNonContiguous && !q.expectContiguousMatch
    );
    if (s) {
      const all = createMatches(positions);
      const labelMatch: FuzzyMatch[] = [];
      const descriptionMatch: FuzzyMatch[] = [];
      for (const h of all) {
        if (h.start < dpl && h.end > dpl) {
          labelMatch.push({ start: 0, end: h.end - dpl });
          descriptionMatch.push({ start: h.start, end: dpl });
        } else if (h.start >= dpl) {
          labelMatch.push({ start: h.start - dpl, end: h.end - dpl });
        } else {
          descriptionMatch.push(h);
        }
      }
      return { score: s, labelMatch, descriptionMatch };
    }
  }
  return NO_ITEM_SCORE;
}

export function scoreItem(
  label: string,
  description: string | undefined,
  path: string | undefined,
  query: PreparedQuery,
  allowNonContiguous: boolean
): ItemScore {
  if (!query.normalized || !label) return NO_ITEM_SCORE;
  const preferLabelMatches = !path || !query.containsPathSeparator;
  if (path && query.pathNormalized.toLowerCase() === path.toLowerCase()) {
    return {
      score: PATH_IDENTITY_SCORE,
      labelMatch: [{ start: 0, end: label.length }],
      descriptionMatch: description
        ? [{ start: 0, end: description.length }]
        : undefined
    };
  }
  if (query.values && query.values.length > 1) {
    let total = 0;
    const lm: FuzzyMatch[] = [];
    const dm: FuzzyMatch[] = [];
    for (const piece of query.values) {
      const r = doScoreItemFuzzySingle(
        label,
        description,
        path,
        piece,
        preferLabelMatches,
        allowNonContiguous
      );
      if (r.score === NO_MATCH) return NO_ITEM_SCORE;
      total += r.score;
      if (r.labelMatch) lm.push(...r.labelMatch);
      if (r.descriptionMatch) dm.push(...r.descriptionMatch);
    }
    return {
      score: total,
      labelMatch: normalizeMatches(lm),
      descriptionMatch: normalizeMatches(dm)
    };
  }
  return doScoreItemFuzzySingle(
    label,
    description,
    path,
    query,
    preferLabelMatches,
    allowNonContiguous
  );
}

function normalizeQuery(original: string): {
  pathNormalized: string;
  normalized: string;
  normalizedLowercase: string;
} {
  const pathNormalized = original.replace(/\\/g, sep);
  const normalized = pathNormalized
    .replace(/[*…\s"]/g, '')
    .replace(/(?<=.)#$/, '');
  return {
    pathNormalized,
    normalized,
    normalizedLowercase: normalized.toLowerCase()
  };
}

function queryExpectsExactMatch(q: string): boolean {
  return q.startsWith('"') && q.endsWith('"');
}

export function prepareQuery(original: string): PreparedQuery {
  if (typeof original !== 'string') original = '';
  const originalLowercase = original.toLowerCase();
  const { pathNormalized, normalized, normalizedLowercase } =
    normalizeQuery(original);
  const containsPathSeparator = pathNormalized.indexOf(sep) >= 0;
  const expectContiguousMatch = queryExpectsExactMatch(original);
  let values: PreparedQueryPiece[] | undefined;
  const split = original.split(' ');
  if (split.length > 1) {
    for (const piece of split) {
      const n = normalizeQuery(piece);
      if (n.normalized) {
        (values ||= []).push({
          original: piece,
          originalLowercase: piece.toLowerCase(),
          pathNormalized: n.pathNormalized,
          normalized: n.normalized,
          normalizedLowercase: n.normalizedLowercase,
          expectContiguousMatch: queryExpectsExactMatch(piece)
        });
      }
    }
  }
  return {
    original,
    originalLowercase,
    pathNormalized,
    normalized,
    normalizedLowercase,
    values,
    containsPathSeparator,
    expectContiguousMatch
  };
}

/** An item that has been scored, carrying what `compareScored` needs. */
export interface ScoredItem extends ItemScore {
  label: string;
  description?: string;
  path: string;
}

/** VS Code's compareItemsByFuzzyScore tiebreakers, over precomputed scores. */
export function compareScored(a: ScoredItem, b: ScoredItem): number {
  const sa = a.score;
  const sb = b.score;
  if (sa === PATH_IDENTITY_SCORE || sb === PATH_IDENTITY_SCORE) {
    if (sa !== sb) return sa === PATH_IDENTITY_SCORE ? -1 : 1;
  }
  if (sa > LABEL_SCORE_THRESHOLD || sb > LABEL_SCORE_THRESHOLD) {
    if (sa !== sb) return sa > sb ? -1 : 1;
    if (
      sa < LABEL_PREFIX_SCORE_THRESHOLD &&
      sb < LABEL_PREFIX_SCORE_THRESHOLD
    ) {
      const c = compareByMatchLength(a.labelMatch, b.labelMatch);
      if (c !== 0) return c;
    }
    if (a.label.length !== b.label.length) return a.label.length - b.label.length;
  }
  if (sa !== sb) return sa > sb ? -1 : 1;
  const alm = (a.labelMatch?.length ?? 0) > 0;
  const blm = (b.labelMatch?.length ?? 0) > 0;
  if (alm && !blm) return -1;
  if (blm && !alm) return 1;
  const da = matchDistance(a);
  const db = matchDistance(b);
  if (da && db && da !== db) return db > da ? -1 : 1;
  const la = a.label.length + (a.description?.length || 0);
  const lb = b.label.length + (b.description?.length || 0);
  if (la !== lb) return la - lb;
  if (a.path.length !== b.path.length) return a.path.length - b.path.length;
  return a.path < b.path ? -1 : a.path > b.path ? 1 : 0;
}

function matchDistance(x: ScoredItem): number {
  let s = -1;
  let e = -1;
  if (x.descriptionMatch?.length) s = x.descriptionMatch[0]?.start ?? -1;
  else if (x.labelMatch?.length) s = x.labelMatch[0]?.start ?? -1;
  if (x.labelMatch?.length) {
    e = x.labelMatch[x.labelMatch.length - 1]?.end ?? -1;
    if (x.descriptionMatch?.length && x.description) e += x.description.length;
  } else if (x.descriptionMatch?.length) {
    e = x.descriptionMatch[x.descriptionMatch.length - 1]?.end ?? -1;
  }
  return e - s;
}

function compareByMatchLength(
  ma: FuzzyMatch[] | undefined,
  mb: FuzzyMatch[] | undefined
): number {
  if (!ma?.length && !mb?.length) return 0;
  if (!mb?.length) return -1;
  if (!ma?.length) return 1;
  const la = (ma[ma.length - 1]?.end ?? 0) - (ma[0]?.start ?? 0);
  const lb = (mb[mb.length - 1]?.end ?? 0) - (mb[0]?.start ?? 0);
  return la === lb ? 0 : lb < la ? 1 : -1;
}

// ---------------------------------------------------------------------------
// gmux additions (NOT from VS Code) — the two adapters the worker needs.
// ---------------------------------------------------------------------------

/**
 * Flatten a scored relative path's label/description matches into character
 * indices over the WHOLE relative path, which is the one string the palette
 * renders.
 *
 * `scoreItem` reports matches against the label (basename) and the
 * description (dirname) separately, each 0-based within its own string. In
 * `dir/sub/name.ts` the description occupies [0, dirLen) and the label
 * occupies [dirLen + 1, len) — the `+ 1` being the separator itself, which
 * is never reported as matched by either side.
 */
export function positionsForPath(
  relPath: string,
  score: ItemScore
): number[] {
  const slash = relPath.lastIndexOf(sep);
  const labelOffset = slash < 0 ? 0 : slash + 1;
  const out: number[] = [];
  for (const m of score.descriptionMatch ?? []) {
    for (let i = m.start; i < m.end; i++) out.push(i);
  }
  for (const m of score.labelMatch ?? []) {
    for (let i = m.start; i < m.end; i++) out.push(labelOffset + i);
  }
  out.sort((a, b) => a - b);
  return out;
}

/** Split `dir/sub/name.ts` into the label + description pair VS Code scores. */
export function splitPath(relPath: string): {
  label: string;
  description: string | undefined;
} {
  const slash = relPath.lastIndexOf(sep);
  if (slash < 0) return { label: relPath, description: undefined };
  return {
    label: relPath.slice(slash + 1),
    description: relPath.slice(0, slash)
  };
}
