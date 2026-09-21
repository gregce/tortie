/**
 * The resolver's memory of ONE answer (Phase 300, finding C5).
 *
 * `resolveSessionLog`'s claude arm stats the direct path
 * `<projects>/<dash encoded cwd>/<id>.jsonl` and, on a miss, accepts
 * `<id>.jsonl` under ANY entry of `~/.claude/projects`. On the operator's
 * machine that is 2,776 directories. A row that HAS a record at the direct
 * path never enters the loop; a row that has no record yet — a claude session
 * before its first turn — runs the loop to the end on EVERY ask, because
 * `service.ts` resolves before it checks the watermark, so a warm store does
 * not avoid it, and `carryForward` stores `readState: 'no-file'` that nothing
 * reads to skip the next scan.
 *
 * Measured for the phase entry over the real directory, warm, twelve runs:
 * min 14.3 ms, median 19.5 ms, max 30.8 ms, of which the one `readdirSync` is
 * 1.9 ms. So the LISTING is a tenth of the cost and the 2,776 `statSync` calls
 * are the other nine tenths, and the Phase 293 verifier measured 575 of the
 * 659 ms of a warm pass over 161 rows inside this one loop.
 *
 * That arithmetic is the whole design. **This caches the ANSWER, not the
 * listing.** A cache of the listing buys 1.9 ms of a 19.5 ms median, misses
 * the stats that are the rest, and caches a directory that grows by ones,
 * which is a source of wrong answers for a tenth of the win.
 *
 * WHAT IS CACHED IS ONE THING: the negative answer of the FALLBACK, being the
 * `no-file` reached by falling off the end of that loop. Never the direct
 * stat, which is one `statSync` and is exactly where a session's first turn
 * lands. Never a `resolved`. Never any other state. And never another
 * provider: counted for the entry, cursor holds 52 entries, omp 61, grok 152,
 * pi 305 and gemini 311, against claude's 2,776, so claude is nine times the
 * next largest and widening this without measuring is how a cache becomes a
 * source of wrong answers.
 *
 * THE CLAUSE A LATER ROUND WILL DELETE, so it is written here as well as in
 * `build/p300/SPEC.md`: *the projects directory's own mtime can only ever be a
 * reason to DROP this cache and NEVER a reason to trust it*, because a new
 * `<id>.jsonl` written into an EXISTING project directory does not move the
 * parent's mtime. What bounds the staleness is the TTL below. What makes the
 * TTL safe is that a normal first turn writes to the DIRECT path, which is
 * never cached, so only the `cd`-elsewhere and the symlinked-folder case is
 * delayed at all, and by at most one window.
 *
 * It is handed in on `ResolveEnv` and is NEVER a module-level cache, so
 * `resolveSessionLog` stays pure, a test hands it a fresh one, and two
 * instances in one process cannot share an answer. The home is part of the key
 * for the same reason: a probe with a scratch HOME must not read the real
 * home's answer.
 *
 * No filesystem call and no import of one. This module is a bounded table of
 * strings and a clock.
 */

/**
 * One window of staleness, 30 s.
 *
 * It matches the sheet's own re-ask interval, `RUNNING_REASK_MS` in
 * `src/renderer/session-manager/use-sheet-refresh.ts`, so a running row gets a
 * freshly scanned answer every cycle and no row can hold a remembered
 * `no-file` for longer than the gap between two asks a person's sheet already
 * makes. The constant is not imported — main does not import from the
 * renderer, and this is a bound of its own that stays true if that one moves.
 */
export const RESOLVE_CACHE_TTL_MS = 30_000;

/**
 * The bound, 512 keys, oldest written evicted first.
 *
 * A cache with no bound in a process that runs for days is the defect a later
 * round writes. 512 is comfortably more than the 200 ids one
 * `overview:activity` call may carry (`OVERVIEW_ACTIVITY_MAX_IDS` in
 * `src/shared/overview.ts`), and small enough that the whole table is a few
 * tens of kilobytes of key strings.
 */
export const RESOLVE_CACHE_MAX = 512;

/**
 * The key, and every part of it is load-bearing. `home`, because one process
 * can be handed two homes and a scratch HOME must not read the real home's
 * answer. `provider`, because this is claude's cache alone and nothing else
 * may ever be written under a key that could collide with it. `id`, because
 * the answer is about one session's record.
 */
export interface ResolveCacheKey {
  home: string;
  provider: string;
  id: string;
}

export interface ResolveCache {
  /**
   * The remembered `no-file`, or null when nothing is remembered or the
   * window has passed. An expired entry is dropped as it is read, so a
   * never-asked-again id costs nothing forever.
   */
  get(key: ResolveCacheKey): 'no-file' | null;
  /** Remembers that the FALLBACK fell off its end for this key. */
  set(key: ResolveCacheKey): void;
  /** How many keys are held. Never above `max`. */
  readonly size: number;
}

/**
 * A NUL separator, because a path may hold every byte but this one, so no
 * `home` can be spelled to look like the start of a `provider` or an `id`.
 */
const SEP = '\u0000';

function composeKey(key: ResolveCacheKey): string {
  return `${key.home}${SEP}${key.provider}${SEP}${key.id}`;
}

/**
 * One cache. The caller owns it and hands it in; there is deliberately no
 * module-level instance and no default one to reach for.
 *
 * `now` is injectable so a test can drive the window without fake timers. It
 * is not a knob for the product: the one shipped instance takes the default.
 */
export function createResolveCache(opts?: {
  ttlMs?: number;
  max?: number;
  now?: () => number;
}): ResolveCache {
  const ttlMs = opts?.ttlMs ?? RESOLVE_CACHE_TTL_MS;
  const max = opts?.max ?? RESOLVE_CACHE_MAX;
  const now = opts?.now ?? Date.now;
  /** key -> the millisecond the answer was remembered at. */
  const at = new Map<string, number>();

  return {
    get(key: ResolveCacheKey): 'no-file' | null {
      const k = composeKey(key);
      const stamp = at.get(k);
      if (stamp === undefined) return null;
      // The TTL is what bounds the staleness. Removing this clause is the
      // ablation that must go red.
      if (now() - stamp >= ttlMs) {
        at.delete(k);
        return null;
      }
      return 'no-file';
    },
    set(key: ResolveCacheKey): void {
      const k = composeKey(key);
      // Re-written keys move to the end, so an id a person's sheet asks about
      // every 30 s is not evicted by a burst of one-off ids.
      at.delete(k);
      at.set(k, now());
      // The bound. Map iteration is insertion order, so the first key is the
      // one written longest ago.
      while (at.size > max) {
        const oldest = at.keys().next().value;
        if (oldest === undefined) break;
        at.delete(oldest);
      }
    },
    get size(): number {
      return at.size;
    }
  };
}
