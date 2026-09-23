/**
 * What the activity feed says about each session RIGHT NOW, held in main
 * (Phase 316).
 *
 * WHY THIS EXISTS. The question an agent is asking (Phase 311), the numbered
 * choice it drew (Phase 312) and the moment tmux last saw output all reach the
 * renderer on `activity:changed`, and until Phase 316 they reached nothing
 * else: main broadcast them and kept no copy of its own. The monitor holds the
 * question it last sent (`questionOnWire`), but only a HASH of the choice and
 * nothing a reader outside it may ask. The phone's door answers the same
 * question and choice from main, so this is the one map written BESIDE that
 * broadcast, from the same updates, at the same moment (`build/p316/SPEC.md`
 * §4 S1 mechanism 1). A reader of this map and the renderer are handed one
 * stream, so they cannot disagree about what a row is asking.
 *
 * THE MERGE IS THE RENDERER'S. An update carries news only about the fields it
 * names. An absent field changes nothing; an EMPTY-STRING question is the feed's
 * explicit clear and is kept as one (a reader draws it as no question, exactly
 * as `src/main/pocket/routes.ts` does); `{ atChoice: false }` is the explicit
 * clear of a choice and is kept as one.
 *
 * IT IS BOUNDED. A session id is never reused, so an entry for a session that
 * has gone is harmless but would never leave. The map keeps at most
 * {@link ACTIVITY_NOW_MAX} sessions, the least recently updated dropped first,
 * which is far above any session list a person keeps and small in bytes.
 *
 * IT DECIDES NOTHING. It is not a status and it never becomes one: nothing
 * here reads or writes `SessionStatus`, and no status is derived from it.
 * Pure, and it never logs: the question is the agent's words.
 */

import type { SessionChoiceInfo } from '@shared/ipc/sessions';

/** What the feed last said about one session. Every field is optional news. */
export interface ActivityNow {
  /** The agent's question. An empty string is the feed's explicit clear. */
  readonly question?: string;
  /** The numbered choice it drew, or the explicit `{ atChoice: false }`. */
  readonly choice?: SessionChoiceInfo;
  /** Epoch ms of the last output tmux saw in the session's pane. */
  readonly lastActivityAt?: number;
}

/** One update as the monitor sends it; only these three fields are read. */
export interface ActivityNowUpdate {
  readonly sessionId: string;
  readonly question?: string;
  readonly choice?: SessionChoiceInfo;
  readonly lastActivityAt?: number;
}

/** The most sessions the map remembers. */
export const ACTIVITY_NOW_MAX = 1_000;

/**
 * Fold one batch of updates into the map.
 *
 * Every entry is REPLACED, never edited in place, so a reader that holds an
 * entry is never changed under it. An update that names none of the three
 * fields leaves the map exactly as it was.
 */
export function noteActivityNow(
  map: Map<string, ActivityNow>,
  updates: readonly ActivityNowUpdate[]
): void {
  for (const update of updates) {
    const news: { question?: string; choice?: SessionChoiceInfo; lastActivityAt?: number } = {};
    let any = false;
    if (typeof update.question === 'string') {
      news.question = update.question;
      any = true;
    }
    if (update.choice !== undefined) {
      news.choice = update.choice;
      any = true;
    }
    if (typeof update.lastActivityAt === 'number' && Number.isFinite(update.lastActivityAt)) {
      news.lastActivityAt = update.lastActivityAt;
      any = true;
    }
    if (!any) continue;
    const prior = map.get(update.sessionId);
    // Delete first, so the entry moves to the END of the insertion order and
    // the bound below drops the session updated longest ago.
    map.delete(update.sessionId);
    map.set(update.sessionId, { ...prior, ...news });
  }
  while (map.size > ACTIVITY_NOW_MAX) {
    const oldest = map.keys().next();
    if (oldest.done === true) break;
    map.delete(oldest.value);
  }
}
