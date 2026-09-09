/**
 * PHASE 243. The durable half of the shadow baseline, decided purely.
 *
 * ./baseline stays the ONE place the baseline moves, and this module never
 * moves it. What it owns is three questions the bridge call sites need
 * answered and which must be answerable under node, one clause at a time:
 *
 *   1. May this tab keep a baseline at all? (`keepsBaseline`)
 *   2. What does a moved baseline ask main to record? (`storeInputFor`)
 *   3. What state does a stored record come back as? (`stateFromStored`)
 *
 * IT NAMES NO BRIDGE, and that is deliberate. `./tab-io` already owns every
 * call this view makes into main — the file read, the HEAD read — and the two
 * baseline calls go there beside them, so the redline family keeps exactly the
 * doors `conformance:redline` rule 9 knows about and a second file cannot
 * quietly grow one.
 *
 * ## THE READ PATH IS STILL THE IN-MEMORY COPY
 *
 * Nothing here is on the draw path. The tab holds the baseline exactly as
 * Phase 225 left it, `redlineBaseSide` reads that field with no await, and the
 * projection property Phase 225 pinned is untouched. A restore is one event
 * into that field when the tab opens; a store is a receipt after it moved.
 *
 * ## AND IT IS NOT A BACKUP
 *
 * Research 83 A4.2. A baseline is a PREVIOUS state of a file whose CURRENT
 * state is on disk and whose COMMITTED state is in git, and losing it loses
 * the narrowing and nothing else. Nothing in this module, and nothing in the
 * sentences ./baseline draws from the state it hands back, may say or imply
 * that the old text is kept somewhere a person can go and get it.
 */

import type {
  BaselineKey,
  BaselineStoreInput,
  StoredBaseline,
  StoredBaselineOrigin
} from '@shared/baselines';
import { isProsePath } from '@shared/prose-paths';
import type { BaselineState } from './baseline';
import { fileInRepo } from './tab-identity';
import type { EditorTab } from './tab-types';

/**
 * The two origin unions are one union, checked at compile time.
 *
 * ./baseline owns `BaselineOrigin` and @shared/baselines owns the shape the
 * door speaks. They are the same three words and they must stay the same three
 * words; these two lines are what says so without either file importing the
 * other's concerns.
 */
type OriginsAgree = BaselineState['from'] extends StoredBaselineOrigin | null
  ? StoredBaselineOrigin extends NonNullable<BaselineState['from']>
    ? true
    : never
  : never;
const ORIGINS_AGREE: OriginsAgree = true;
void ORIGINS_AGREE;

/** What a tab must be for its baseline to be worth keeping. */
export type BaselineTab = Pick<
  EditorTab,
  'commit' | 'remote' | 'repoPath' | 'relPath' | 'path' | 'truncated'
>;

/**
 * May this tab's baseline be kept?
 *
 * The four refusals, each with its own reason:
 *  - a HISTORY tab and a REVIEW tab hold no baseline at all, and their two
 *    sides come from a commit or from another machine;
 *  - a file outside its repository has no key, because the key IS
 *    `(repo_path, rel_path)`;
 *  - a file the redline never draws could never use a baseline, and keeping
 *    one for it is how a store fills with a person's whole disk (research 106
 *    section 3.1: 2,098 prose files against a seven-day working set of 67);
 *  - a TRUNCATED tab's bytes are not the file. Research 83 E.7a measured what
 *    acting on them costs, and main refuses one at the door too.
 */
export function keepsBaseline(tab: BaselineTab): boolean {
  return (
    tab.commit === null &&
    tab.remote === undefined &&
    !tab.truncated &&
    fileInRepo(tab.repoPath, tab.path) &&
    isProsePath(tab.path)
  );
}

/**
 * Which file this tab's baseline belongs to.
 *
 * `machineId` is null and is a FIELD rather than a silence: main refuses any
 * non-null value, because two files at the same spelling on two computers
 * would otherwise share one key and the operator's Mac Pro's home really is
 * `/Users/gdc` too (research 106 section 2.4). `keepsBaseline` has already
 * refused a remote tab; the door refuses it again rather than inheriting the
 * refusal from a caller.
 */
export function baselineKeyFor(tab: BaselineTab): BaselineKey {
  return { repoPath: tab.repoPath, relPath: tab.relPath, machineId: null };
}

/**
 * What a moved baseline asks main to record, or null when there is nothing to
 * record because nothing has seeded it.
 *
 * `headSeen` is carried because it IS the credibility check. At the next open
 * the loader replays the current `git show HEAD:<rel>` answer through the
 * shipping `nextBaseline` as a `head` event: an unchanged answer returns the
 * same object and the baseline stands, a moved one re-seeds on the line that
 * already exists, so no narrowing across a commit can survive and the rule
 * that does it is one `conformance:redline` already ablates. A record without
 * it would be destroyed by the first watcher tick, silently, before the person
 * had looked (research 106 section 2.3).
 */
export function storeInputFor(
  tab: BaselineTab,
  state: BaselineState | undefined
): BaselineStoreInput | null {
  if (state === undefined || state.text === null || state.from === null) return null;
  return {
    ...baselineKeyFor(tab),
    text: state.text,
    headSeen: state.headSeen,
    origin: state.from,
    generation: state.generation,
    takenAt: state.takenAt,
    acceptedAt: state.acceptedAt,
    truncated: tab.truncated
  };
}

/**
 * The state a stored record comes back as.
 *
 * IT ARRIVES WITH ITS GENERATION, which is what Phase 227's press guard is
 * bound to (research 83 B.8a). `durable` is `restored`, which is the one fact
 * the face needs that the record does not otherwise carry: it says the marking
 * is from an earlier session, and it is what lets the sentence stop promising
 * a lifetime that is no longer true.
 */
export function stateFromStored(stored: StoredBaseline): BaselineState {
  return {
    text: stored.text,
    from: stored.origin,
    generation: stored.generation,
    headSeen: stored.headSeen,
    takenAt: stored.takenAt,
    acceptedAt: stored.acceptedAt,
    durable: 'restored'
  };
}

/**
 * The same state with the receipt on it, or the state itself when it already
 * carries one.
 *
 * The identity answer matters: a caller patches the tab only when this
 * returns something new, so a confirmed write cannot loop back into another
 * write.
 */
export function markStored(state: BaselineState): BaselineState {
  if (state.durable !== undefined) return state;
  return { ...state, durable: 'written' };
}
