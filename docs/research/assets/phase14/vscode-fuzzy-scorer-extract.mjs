/**
 * Faithful single-file port of VS Code's fuzzyScorer.ts (MIT, microsoft/vscode
 * src/vs/base/common/fuzzyScorer.ts @ main, fetched 2026-08-10) reduced to the
 * POSIX/macOS path case. Dependency shims: sep='/', isWindows=isLinux=false,
 * strings.startsWithIgnoreCase, filters.matchesPrefix, filters.isUpper.
 * ~230 lines vs ~928 upstream + its import closure.
 */

const NO_MATCH = 0;
const NO_SCORE = [NO_MATCH, []];
const sep = '/';

const CC = {
  Slash: 47, Backslash: 92, Underline: 95, Dash: 45, Period: 46,
  Space: 32, SingleQuote: 39, DoubleQuote: 34, Colon: 58, A: 65, Z: 90
};

function isUpper(code) { return CC.A <= code && code <= CC.Z; }

function startsWithIgnoreCase(str, candidate) {
  const candidateLength = candidate.length;
  if (candidate.length > str.length) return false;
  return str.substr(0, candidateLength).toLowerCase() === candidate.toLowerCase();
}

function matchesPrefix(word, wordToMatchAgainst) {
  if (!wordToMatchAgainst || wordToMatchAgainst.length < word.length) return null;
  if (!startsWithIgnoreCase(wordToMatchAgainst, word)) return null;
  return word.length > 0 ? [{ start: 0, end: word.length }] : [];
}

function considerAsEqual(a, b) {
  if (a === b) return true;
  if (a === '/' || a === '\\') return b === '/' || b === '\\';
  return false;
}

function scoreSeparatorAtPos(charCode) {
  switch (charCode) {
    case CC.Slash: case CC.Backslash: return 5;
    case CC.Underline: case CC.Dash: case CC.Period: case CC.Space:
    case CC.SingleQuote: case CC.DoubleQuote: case CC.Colon: return 4;
    default: return 0;
  }
}

function computeCharScore(qc, qlc, target, targetLower, targetIndex, seqLen) {
  let score = 0;
  if (!considerAsEqual(qlc, targetLower[targetIndex])) return score;
  score += 1;                                        // char match
  if (seqLen > 0) score += (Math.min(seqLen, 3) * 6) + (Math.max(0, seqLen - 3) * 3); // consecutive
  if (qc === target[targetIndex]) score += 1;        // same case
  if (targetIndex === 0) score += 8;                 // start of word
  else {
    const sepBonus = scoreSeparatorAtPos(target.charCodeAt(targetIndex - 1));
    if (sepBonus) score += sepBonus;
    else if (isUpper(target.charCodeAt(targetIndex)) && seqLen === 0) score += 2; // camelCase
  }
  return score;
}

function doScoreFuzzy(query, queryLower, queryLength, target, targetLower, targetLength, allowNonContiguous) {
  const scores = [];
  const matches = [];
  for (let qi = 0; qi < queryLength; qi++) {
    const qOff = qi * targetLength;
    const qPrevOff = qOff - targetLength;
    const qGt0 = qi > 0;
    const qc = query[qi];
    const qlc = queryLower[qi];
    for (let ti = 0; ti < targetLength; ti++) {
      const tGt0 = ti > 0;
      const cur = qOff + ti;
      const left = cur - 1;
      const diag = qPrevOff + ti - 1;
      const leftScore = tGt0 ? scores[left] : 0;
      const diagScore = qGt0 && tGt0 ? scores[diag] : 0;
      const seqLen = qGt0 && tGt0 ? matches[diag] : 0;
      let score;
      if (!diagScore && qGt0) score = 0;
      else score = computeCharScore(qc, qlc, target, targetLower, ti, seqLen);
      const valid = score && diagScore + score >= leftScore;
      if (valid && (allowNonContiguous || qGt0 || targetLower.startsWith(queryLower, ti))) {
        matches[cur] = seqLen + 1;
        scores[cur] = diagScore + score;
      } else {
        matches[cur] = NO_MATCH;
        scores[cur] = leftScore;
      }
    }
  }
  const positions = [];
  let qi = queryLength - 1, ti = targetLength - 1;
  while (qi >= 0 && ti >= 0) {
    const cur = qi * targetLength + ti;
    if (matches[cur] === NO_MATCH) ti--;
    else { positions.push(ti); qi--; ti--; }
  }
  return [scores[queryLength * targetLength - 1], positions.reverse()];
}

export function scoreFuzzy(target, query, queryLower, allowNonContiguous) {
  if (!target || !query) return NO_SCORE;
  const tl = target.length, ql = query.length;
  if (tl < ql) return NO_SCORE;
  return doScoreFuzzy(query, queryLower, ql, target, target.toLowerCase(), tl, allowNonContiguous);
}

const PATH_IDENTITY_SCORE = 1 << 18;
const LABEL_PREFIX_SCORE_THRESHOLD = 1 << 17;
const LABEL_SCORE_THRESHOLD = 1 << 16;
export const THRESHOLDS = { PATH_IDENTITY_SCORE, LABEL_PREFIX_SCORE_THRESHOLD, LABEL_SCORE_THRESHOLD };

function createMatches(offsets) {
  const ret = [];
  if (!offsets) return ret;
  let last;
  for (const pos of offsets) {
    if (last && last.end === pos) last.end += 1;
    else { last = { start: pos, end: pos + 1 }; ret.push(last); }
  }
  return ret;
}

function normalizeMatches(matches) {
  const sorted = matches.sort((a, b) => a.start - b.start);
  const out = [];
  let cur;
  for (const m of sorted) {
    if (!cur || !(cur.end >= m.start && m.end >= cur.start)) { cur = m; out.push(m); }
    else { cur.start = Math.min(cur.start, m.start); cur.end = Math.max(cur.end, m.end); }
  }
  return out;
}

const NO_ITEM_SCORE = Object.freeze({ score: 0 });

function doScoreItemFuzzySingle(label, description, path, q, preferLabelMatches, allowNonContiguous) {
  if (preferLabelMatches || !description) {
    const [labelScore, labelPositions] = scoreFuzzy(
      label, q.normalized, q.normalizedLowercase, allowNonContiguous && !q.expectContiguousMatch);
    if (labelScore) {
      const labelPrefixMatch = matchesPrefix(q.normalized, label);
      let baseScore;
      if (labelPrefixMatch) {
        baseScore = LABEL_PREFIX_SCORE_THRESHOLD +
          Math.round((q.normalized.length / label.length) * 100);
      } else {
        baseScore = LABEL_SCORE_THRESHOLD;
      }
      return { score: baseScore + labelScore, labelMatch: labelPrefixMatch || createMatches(labelPositions) };
    }
  }
  if (description) {
    const descriptionPrefix = path ? `${description}${sep}` : description;
    const dpl = descriptionPrefix.length;
    const combined = `${descriptionPrefix}${label}`;
    const [s, positions] = scoreFuzzy(combined, q.normalized, q.normalizedLowercase,
      allowNonContiguous && !q.expectContiguousMatch);
    if (s) {
      const all = createMatches(positions);
      const labelMatch = [], descriptionMatch = [];
      for (const h of all) {
        if (h.start < dpl && h.end > dpl) {
          labelMatch.push({ start: 0, end: h.end - dpl });
          descriptionMatch.push({ start: h.start, end: dpl });
        } else if (h.start >= dpl) labelMatch.push({ start: h.start - dpl, end: h.end - dpl });
        else descriptionMatch.push(h);
      }
      return { score: s, labelMatch, descriptionMatch };
    }
  }
  return NO_ITEM_SCORE;
}

export function scoreItem(label, description, path, query, allowNonContiguous) {
  if (!query.normalized || !label) return NO_ITEM_SCORE;
  const preferLabelMatches = !path || !query.containsPathSeparator;
  if (path && query.pathNormalized.toLowerCase() === path.toLowerCase()) {
    return { score: PATH_IDENTITY_SCORE, labelMatch: [{ start: 0, end: label.length }],
      descriptionMatch: description ? [{ start: 0, end: description.length }] : undefined };
  }
  if (query.values && query.values.length > 1) {
    let total = 0; const lm = [], dm = [];
    for (const piece of query.values) {
      const r = doScoreItemFuzzySingle(label, description, path, piece, preferLabelMatches, allowNonContiguous);
      if (r.score === NO_MATCH) return NO_ITEM_SCORE;
      total += r.score;
      if (r.labelMatch) lm.push(...r.labelMatch);
      if (r.descriptionMatch) dm.push(...r.descriptionMatch);
    }
    return { score: total, labelMatch: normalizeMatches(lm), descriptionMatch: normalizeMatches(dm) };
  }
  return doScoreItemFuzzySingle(label, description, path, query, preferLabelMatches, allowNonContiguous);
}

function normalizeQuery(original) {
  const pathNormalized = original.replace(/\\/g, sep);
  const normalized = pathNormalized.replace(/[\*…\s"]/g, '').replace(/(?<=.)#$/, '');
  return { pathNormalized, normalized, normalizedLowercase: normalized.toLowerCase() };
}

function queryExpectsExactMatch(q) { return q.startsWith('"') && q.endsWith('"'); }

export function prepareQuery(original) {
  if (typeof original !== 'string') original = '';
  const originalLowercase = original.toLowerCase();
  const { pathNormalized, normalized, normalizedLowercase } = normalizeQuery(original);
  const containsPathSeparator = pathNormalized.indexOf(sep) >= 0;
  const expectContiguousMatch = queryExpectsExactMatch(original);
  let values;
  const split = original.split(' ');
  if (split.length > 1) {
    for (const piece of split) {
      const n = normalizeQuery(piece);
      if (n.normalized) {
        (values ||= []).push({
          original: piece, originalLowercase: piece.toLowerCase(),
          pathNormalized: n.pathNormalized, normalized: n.normalized,
          normalizedLowercase: n.normalizedLowercase,
          expectContiguousMatch: queryExpectsExactMatch(piece)
        });
      }
    }
  }
  return { original, originalLowercase, pathNormalized, normalized, normalizedLowercase,
    values, containsPathSeparator, expectContiguousMatch };
}

/** VS Code's compareItemsByFuzzyScore tiebreakers, over precomputed scores. */
export function compareScored(a, b) {
  const sa = a.score, sb = b.score;
  if (sa === PATH_IDENTITY_SCORE || sb === PATH_IDENTITY_SCORE) {
    if (sa !== sb) return sa === PATH_IDENTITY_SCORE ? -1 : 1;
  }
  if (sa > LABEL_SCORE_THRESHOLD || sb > LABEL_SCORE_THRESHOLD) {
    if (sa !== sb) return sa > sb ? -1 : 1;
    if (sa < LABEL_PREFIX_SCORE_THRESHOLD && sb < LABEL_PREFIX_SCORE_THRESHOLD) {
      const c = compareByMatchLength(a.labelMatch, b.labelMatch);
      if (c !== 0) return c;
    }
    if (a.label.length !== b.label.length) return a.label.length - b.label.length;
  }
  if (sa !== sb) return sa > sb ? -1 : 1;
  const alm = a.labelMatch?.length > 0, blm = b.labelMatch?.length > 0;
  if (alm && !blm) return -1;
  if (blm && !alm) return 1;
  const da = matchDistance(a), db = matchDistance(b);
  if (da && db && da !== db) return db > da ? -1 : 1;
  const la = a.label.length + (a.description?.length || 0);
  const lb = b.label.length + (b.description?.length || 0);
  if (la !== lb) return la - lb;
  if (a.path.length !== b.path.length) return a.path.length - b.path.length;
  return a.path < b.path ? -1 : a.path > b.path ? 1 : 0;
}

function matchDistance(x) {
  let s = -1, e = -1;
  if (x.descriptionMatch?.length) s = x.descriptionMatch[0].start;
  else if (x.labelMatch?.length) s = x.labelMatch[0].start;
  if (x.labelMatch?.length) {
    e = x.labelMatch[x.labelMatch.length - 1].end;
    if (x.descriptionMatch?.length && x.description) e += x.description.length;
  } else if (x.descriptionMatch?.length) e = x.descriptionMatch[x.descriptionMatch.length - 1].end;
  return e - s;
}

function compareByMatchLength(ma, mb) {
  if ((!ma?.length) && (!mb?.length)) return 0;
  if (!mb?.length) return -1;
  if (!ma?.length) return 1;
  const la = ma[ma.length - 1].end - ma[0].start;
  const lb = mb[mb.length - 1].end - mb[0].start;
  return la === lb ? 0 : lb < la ? 1 : -1;
}
