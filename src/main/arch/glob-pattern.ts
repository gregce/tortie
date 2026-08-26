/**
 * The anchor pattern language, compiled and matched (Phase 63).
 *
 * It sits beside `./schema.ts` rather than inside `./checkers/` because BOTH
 * layers need it and they need it for different reasons. The format layer
 * counts an anchor's wildcards so it can refuse one that is too expensive to
 * match, and the glob checker matches the anchor against the tracked file list.
 * One tokenizer serving both is what keeps the bound the format prints and the
 * cost the matcher pays talking about the same thing.
 *
 * ## Four rules and no more
 *
 * - `**` matches any run of characters, separators included.
 * - `*` matches any run of characters that holds no separator.
 * - `?` matches one character that is not a separator.
 * - Everything else is literal text.
 *
 * A character class is not supported, and `pathField` in `./schema.ts` already
 * refuses the brackets, so a person cannot write one and be quietly ignored.
 *
 * ## Why this is not a regular expression, and it is a fix rather than a taste
 *
 * The first build of this feature turned each `**` into `.*` and handed the
 * result to `new RegExp`. That is catastrophic backtracking, and it was
 * measured: the anchor `**a` repeated eight times followed by `zz` is 26
 * characters, passes every path rule in `./schema.ts` without complaint, and
 * froze the main thread for over twelve seconds against ONE path. The format's
 * own ceiling on an anchor is 512 characters, the matching runs on the main
 * thread, and an anchor arrives with a `git pull` written by whoever last
 * pushed, which is the same untrusted input `./argv-guard.ts` was built for.
 *
 * WHAT THE COST NEEDS, said plainly, because an earlier draft of this comment
 * got it wrong. The blow up needs a PATH shaped for the pattern, not just the
 * pattern. The worst path this repository actually tracks holds seven `a`
 * characters and the eight repeat anchor needs eight, so the engine fails at
 * once and the whole tree costs well under a millisecond. Point the same
 * anchor at a path packed with `a` characters and the seconds arrive. A person
 * who can push a contract file can also push a file, so the reachable case is
 * the one that was fixed rather than the one this tree happens to hold.
 *
 * So a pattern is compiled into a token list and matched by a scan that visits
 * each position of the path once per token. The cost is the number of tokens
 * times the length of the path, whatever the pattern holds, and there is no
 * input that makes it explode. `ARCH_LIMITS.maxAnchorWildcards` bounds the
 * first of those two at the format layer as well, because a bound a person
 * reads in an error message beats a bound only the matcher knows about.
 *
 * ## What the two matchers cost, remeasured on 2026-08-26 over this repository
 *
 * The hostile anchor is `**a` repeated N times followed by `zz`, and the two
 * paths are one packed with 62 `a` characters and one plausibly shaped path
 * holding 44. The old regular expression grew about six times per repeat and
 * the scan did not move:
 *
 * | repeats | anchor | regex, 62 a | regex, 44 a | this scan |
 * | --- | --- | --- | --- | --- |
 * | 4 | 14 chars | 1.8 ms | 0.5 ms | under 0.01 ms |
 * | 6 | 20 chars | 206.5 ms | 28.5 ms | 0.03 ms |
 * | 8 | 26 chars | 12,734.1 ms | 874.3 ms | 0.02 ms |
 *
 * Eight repeats is 8 wildcards, which the format ACCEPTS, so those twelve
 * seconds for one path were reachable by a legal anchor. Fourteen and forty
 * repeats are refused by `globField` now, naming the field and the count.
 *
 * Over all 2,151 tracked files of this repository the same three anchors cost
 * the regex 0.6, 0.5 and 0.6 ms, because no real path here holds the eighth
 * `a`. The scan costs 3.90, 1.76 and 1.14 ms on the same run. That is the
 * scan being SLOWER on the shapes this tree happens to hold, and it is the
 * trade this file makes on purpose: a few milliseconds always, rather than
 * microseconds until somebody pushes the wrong path.
 *
 * THE WORST ACCEPTED ANCHOR I could find costs 0.97 ms against all 2,151
 * files. Five shapes at the format's own 512 character ceiling, being eight
 * globstars ahead of a literal, eight globstars interleaved, eight question
 * marks, eight stars interleaved and a bare 512 character literal, all landed
 * between 0.17 and 0.85 ms.
 *
 * THE HONEST CEILING, because the matching runs on the main thread and the
 * 5,000 ms budget in `./ipc.ts` guards the tree-sitter parse rather than this.
 * A contract sitting at every format limit at once, being 400 parts each with
 * 64 anchors at 512 characters, is 25,600 anchors and extrapolates to about
 * 25 seconds over this repository at that worst measured 0.97 ms. That is far
 * past the budget and it is LINEAR in anchors times files, so it is a slow
 * contract rather than a hung one, and no input makes it explode. The
 * unbounded case is the one that is gone.
 */

/** One piece of a compiled anchor. */
export type ArchGlobToken =
  | { kind: 'literal'; text: string }
  /** `*`, any run of characters holding no separator. */
  | { kind: 'star' }
  /** `**`, any run of characters, separators included. */
  | { kind: 'globstar' }
  /** `?`, one character that is not a separator. */
  | { kind: 'question' };

/**
 * Turn one anchor into its token list.
 *
 * A globstar swallows a separator that follows it, so `src` then `**` then `/`
 * then `x.ts` also matches `src/x.ts`. Without that a person has to write the
 * pattern twice.
 */
export function compileGlob(glob: string): ArchGlobToken[] {
  const tokens: ArchGlobToken[] = [];
  let literal = '';
  const flush = (): void => {
    if (literal.length === 0) return;
    tokens.push({ kind: 'literal', text: literal });
    literal = '';
  };
  for (let i = 0; i < glob.length; i += 1) {
    const ch = glob[i] ?? '';
    if (ch === '*') {
      flush();
      if (glob[i + 1] === '*') {
        tokens.push({ kind: 'globstar' });
        i += 1;
        if (glob[i + 1] === '/') i += 1;
        continue;
      }
      tokens.push({ kind: 'star' });
      continue;
    }
    if (ch === '?') {
      flush();
      tokens.push({ kind: 'question' });
      continue;
    }
    literal += ch;
  }
  flush();
  return tokens;
}

/** How many wildcards one anchor holds, counting a globstar as one. */
export function countGlobWildcards(glob: string): number {
  let count = 0;
  for (const token of compileGlob(glob)) {
    if (token.kind !== 'literal') count += 1;
  }
  return count;
}

/** True when a pattern holds no wildcard, so it names a file or a directory outright. */
export function isPlainGlob(glob: string): boolean {
  return !glob.includes('*') && !glob.includes('?');
}

/**
 * Does one compiled anchor match one whole path?
 *
 * The scan holds the set of path positions the pattern could have reached so
 * far and advances it one token at a time. Every token advances that set in one
 * pass over the path, so the whole match is bounded and nothing in the pattern
 * can make it explode.
 */
export function matchGlobTokens(
  tokens: readonly ArchGlobToken[],
  path: string
): boolean {
  const len = path.length;
  let reach = new Uint8Array(len + 1);
  let next = new Uint8Array(len + 1);
  reach[0] = 1;
  for (const token of tokens) {
    next.fill(0);
    let any = false;
    if (token.kind === 'literal') {
      const text = token.text;
      for (let i = 0; i + text.length <= len; i += 1) {
        if (reach[i] === 0) continue;
        if (!path.startsWith(text, i)) continue;
        next[i + text.length] = 1;
        any = true;
      }
    } else if (token.kind === 'question') {
      for (let i = 0; i < len; i += 1) {
        if (reach[i] === 0 || path[i] === '/') continue;
        next[i + 1] = 1;
        any = true;
      }
    } else if (token.kind === 'star') {
      // Every reachable position reaches forward to the next separator. The
      // runs of two reachable positions in one segment nest, so the walk skips
      // past a segment once it has marked it.
      let i = 0;
      while (i <= len) {
        if (reach[i] === 0) {
          i += 1;
          continue;
        }
        const slash = path.indexOf('/', i);
        const end = slash === -1 ? len : slash;
        for (let j = i; j <= end; j += 1) next[j] = 1;
        any = true;
        i = end + 1;
      }
    } else {
      // A globstar reaches the whole rest of the path from the earliest
      // position it could have started at.
      let first = -1;
      for (let i = 0; i <= len; i += 1) {
        if (reach[i] === 1) {
          first = i;
          break;
        }
      }
      if (first >= 0) {
        for (let j = first; j <= len; j += 1) next[j] = 1;
        any = true;
      }
    }
    if (!any) return false;
    const swap = reach;
    reach = next;
    next = swap;
  }
  return reach[len] === 1;
}
