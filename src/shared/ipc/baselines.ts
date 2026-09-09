/**
 * baselines:* — the durable baseline's two channels (Phase 243).
 *
 * ## Why two NEW channels, which research 106 §4 settled by reading three files
 *
 * The charter's third settled point is that the write goes through
 * `writeDurable` and nothing hand-rolled, and no existing door does that:
 *
 *   - `fs:writeGuarded` REFUSES any path outside an open project root
 *     (`refused/outside`, src/main/fs/guarded-write.ts), so it cannot reach
 *     `<userData>` at all, which is exactly the containment it exists for.
 *   - `fs:writeFile` can reach it and has no containment of any kind, but it
 *     is `await writeFile(abs, contents, 'utf8')` (src/main/fs/ipc.ts) — no
 *     flush, no rename, no read-back — which is the hand-rolled write the
 *     charter forbids for state a person cannot afford to lose.
 *   - `drop:persist` is the only channel that already puts renderer bytes
 *     into `<userData>/gmux/`, and it is a plain `writeFile` too, with a
 *     content hash for a name and no key of the shape this needs.
 *
 * So the inventory moves 226 → 228 and `docs/audits/contract-baseline.txt` is
 * regenerated in the same commit, which is what `gate:contract` is for.
 *
 * There is deliberately no `baselines:forget`. Nothing a person does forgets
 * a baseline: it is replaced when the baseline moves, re-seeded when the
 * file's committed version moves, and evicted by main's own prune.
 *
 * MAIN: src/main/baselines/ipc.ts → src/main/baselines/store.ts.
 */

import type {
  BaselineKey,
  BaselineLoadResult,
  BaselineStoreInput,
  BaselineStoreResult
} from '../baselines';

/** The two channels Phase 243 adds. */
export interface BaselinesInvokeChannelMap {
  /** The stored baseline for one file, or a word saying why there is none. */
  'baselines:load': {
    req: [key: BaselineKey];
    res: BaselineLoadResult;
  };
  /** Record a moved baseline. Answers a word for every outcome. */
  'baselines:store': {
    req: [input: BaselineStoreInput];
    res: BaselineStoreResult;
  };
}

/**
 * The `baselines` member of the installed bridge.
 *
 * Its own object rather than a member of `fs`, because `fs` is a question
 * about a file inside a project root and this is a question about Tortie's
 * own data directory.
 */
export interface GmuxBaselinesExtras {
  baselines: {
    load(key: BaselineKey): Promise<BaselineLoadResult>;
    store(input: BaselineStoreInput): Promise<BaselineStoreResult>;
  };
}
