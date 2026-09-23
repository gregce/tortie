/**
 * The blocked feed (Phase 314): the ONE owner of "when did each session start
 * waiting on a human", and the ONE assignment of `core.onSessionsBroadcast`.
 *
 * WHY IT MOVED OUT OF THE TRAY. `GmuxCore.onSessionsBroadcast` is a single
 * slot (`../sessions/core.ts`), and until this phase the menu-bar sentinel
 * assigned it and kept the stamps in a module-level map of its own. A second
 * consumer that assigned the slot would have silently unplugged the menu bar,
 * and the door's `PocketFacts.blockedSince` promised "the SAME map" with no
 * producer outside the tray. So the slot and the map live here, the slot is
 * assigned once, and every consumer subscribes: the tray draws its menu from
 * the snapshot exactly as it drew it before, the push engine observes the same
 * broadcast, and the door reads the same map.
 *
 * THE STAMPS ARE UNCHANGED. Each broadcast runs `blockedSince(prev, sessions,
 * now)` (`./attention.ts`), so a session is stamped on the first broadcast that
 * shows it needing input and keeps that stamp for as long as it stays blocked.
 * The map is REPLACED on every pass and never edited in place, so a snapshot a
 * listener holds is never changed under it.
 *
 * IT SENDS NOTHING AND DECIDES NOTHING. It holds ids and epoch ms. What a
 * blocked session means to a surface is that surface's own question.
 */

import type { Project, Session } from '@shared/types';
import { getLog } from '../log';
import { blockedSince } from './attention';

const feedLog = getLog('tray');

/** One broadcast, as every listener sees it. */
export interface BlockedSnapshot {
  readonly sessions: readonly Session[];
  readonly projects: readonly Project[];
  readonly since: ReadonlyMap<string, number>;
}

/** The part of `GmuxCore` the feed touches. */
interface FeedCore {
  onSessionsBroadcast: ((s: Session[]) => void) | null;
  listSessions(): Session[];
  listProjects(): Project[];
}

let installedOn: FeedCore | null = null;
let stamp: () => number = Date.now;
/** sessionId → when it started needing input (see attention.blockedSince). */
let since = new Map<string, number>();
const listeners = new Set<(snapshot: BlockedSnapshot) => void>();

/** Stamp one session list and hand the snapshot to every listener. */
function pass(core: FeedCore, sessions: readonly Session[]): void {
  since = blockedSince(since, sessions, stamp());
  const snapshot: BlockedSnapshot = { sessions, projects: core.listProjects(), since };
  for (const listener of [...listeners]) {
    try {
      listener(snapshot);
    } catch {
      // One consumer failing must never unplug another: the menu bar keeps
      // drawing whatever the push engine does, and the other way round.
      feedLog.warn('a listener of the blocked feed failed; the others still ran');
    }
  }
}

/**
 * Take the core's broadcast slot, once, and run one pass over the sessions it
 * holds now. Safe to call again: the slot is not assigned a second time, and
 * the pass that follows is exactly what the next broadcast would do.
 */
export function installBlockedFeed(core: FeedCore, now?: () => number): void {
  if (installedOn === null) {
    installedOn = core;
    stamp = now ?? Date.now;
    core.onSessionsBroadcast = (sessions) => {
      if (installedOn === core) pass(core, sessions);
    };
  } else if (installedOn !== core) {
    feedLog.warn('the blocked feed is already installed on another core; nothing changed');
    return;
  }
  pass(core, core.listSessions());
}

/** Called with every snapshot from the next pass on. Returns the unsubscribe. */
export function onBlockedChange(listener: (snapshot: BlockedSnapshot) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The current stamps. Replaced on every pass, never edited in place. */
export function blockedSinceMap(): ReadonlyMap<string, number> {
  return since;
}

/** Forget the core, the stamps and every listener. Tests only. */
export function resetBlockedFeedForTests(): void {
  installedOn = null;
  stamp = Date.now;
  since = new Map();
  listeners.clear();
}
