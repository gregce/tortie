/**
 * The alert's bytes (Phase 314, SPEC §2.1 to §2.5). Pure: rows in, one plan out.
 *
 * WHERE ITS WORDS COME FROM. The rows are the door's own `/v1/blocked` rows,
 * and this module reads SEVEN of their fields and no others: `sessionId`,
 * `name`, `project`, `machine`, `agentLabel`, `statusLabel` and `seenAtWake`.
 * It never reads the question, the choices, the dot, the stamp, or any line of
 * a conversation, because a native alert is JSON Apple reads. The question
 * stays behind the tap, which reads it from the door.
 *
 * THE THREE SHAPES, and when each is used:
 *
 *   single  exactly one row is announced and it was not first seen at a wake;
 *   count   two or more rows are announced, or any announced row was first
 *           seen at a wake, so a wake is said even for one row. The body
 *           leads with `Seen when your Mac woke` only when EVERY announced row
 *           was first seen at a wake (the fix round): a row that joined just
 *           before the sleep folds into the wake's one alert with its true
 *           stamp, and the lead would be false of it;
 *   badge   nothing is announced and the blocked count fell. It carries no
 *           word and no sound, and it goes at priority 5 with expiration 0 so
 *           it can never displace a stored alert while the phone is offline.
 *
 * THE CEILING. Apple's is 4096 bytes. The clip is deterministic and pinned in
 * SPEC §2.4, so an independent reader can reproduce it byte for byte: a name is
 * cut at a whole code point and ends in `…`, and a count alert drops names from
 * its end and says so once with ` · …`.
 */

import type { PocketBlockedRow } from '@shared/ipc/pocket';
import { PUSH_WAKE_SEEN } from '@shared/push-copy';
import { NEEDS_YOUR_INPUT } from '../tray/attention';

/** Apple's ceiling for every remote notification that is not VoIP. */
export const APNS_PAYLOAD_MAX_BYTES = 4096;

/** The count alert's thread and collapse id. A session id is a UUID and cannot be this. */
export const WAITING_THREAD = 'tortie-waiting';

/** How long Apple may hold an alert for a phone that is offline. */
const ALERT_TTL_SECONDS = 3600;

/** Tortie's separator, the one ` · ` every surface draws between two facts. */
const SEPARATOR = ' · ';

/** Tortie's ellipsis, one character. */
const ELLIPSIS = '…';

export interface AlertPlan {
  readonly kind: 'single' | 'count' | 'badge';
  readonly payload: string;
  readonly priority: 10 | 5;
  readonly collapseId: string | null;
  /** 3600 for alerts, 0 for the badge. The engine turns it into `apns-expiration`. */
  readonly ttlSeconds: number;
}

function fits(payload: string): boolean {
  return Buffer.byteLength(payload, 'utf8') <= APNS_PAYLOAD_MAX_BYTES;
}

/**
 * The longest prefix of `text`'s whole code points, followed by `…`, for which
 * `render` fits, or null when not even `…` alone does. The payload's length
 * never shrinks as a code point is added, so a binary search is exact.
 */
function clipToFit(text: string, render: (value: string) => string): string | null {
  // Where each whole code point ends, in UTF-16 units, so a cut never splits a
  // surrogate pair.
  const ends = [0];
  for (const point of text) ends.push((ends[ends.length - 1] ?? 0) + point.length);
  const at = (count: number): string => text.slice(0, ends[count] ?? 0) + ELLIPSIS;
  if (!fits(render(at(0)))) return null;
  let low = 0;
  let high = ends.length - 1;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (fits(render(at(mid)))) low = mid;
    else high = mid - 1;
  }
  return at(low);
}

interface SingleSlots {
  readonly sessionId: string;
  readonly name: string;
  readonly statusLabel: string;
  readonly project: string;
  readonly agentLabel: string;
  readonly machine: string | null;
}

function singlePayload(row: SingleSlots, badge: number): string {
  const body = [row.project, row.agentLabel, ...(row.machine !== null ? [row.machine] : [])].join(
    SEPARATOR
  );
  return JSON.stringify({
    aps: {
      alert: {
        title: `${row.name} ${row.statusLabel}`,
        body
      },
      badge,
      sound: 'default',
      'thread-id': row.sessionId
    },
    tortie: { v: 1, session: row.sessionId }
  });
}

function countPayload(body: string, badge: number): string {
  return JSON.stringify({
    aps: {
      alert: {
        title: `${NEEDS_YOUR_INPUT} (${badge})`,
        body
      },
      badge,
      sound: 'default',
      'thread-id': WAITING_THREAD
    },
    tortie: { v: 1 }
  });
}

/** SPEC §2.4 step 2: the name, then the project, then the agent's name. */
function clippedSingle(slots: SingleSlots, badge: number): string {
  const whole = singlePayload(slots, badge);
  if (fits(whole)) return whole;
  const name = clipToFit(slots.name, (value) => singlePayload({ ...slots, name: value }, badge));
  if (name !== null) return singlePayload({ ...slots, name }, badge);
  const noName: SingleSlots = { ...slots, name: ELLIPSIS };
  const project = clipToFit(slots.project, (value) =>
    singlePayload({ ...noName, project: value }, badge)
  );
  if (project !== null) return singlePayload({ ...noName, project }, badge);
  const noProject: SingleSlots = { ...noName, project: ELLIPSIS };
  const agentLabel = clipToFit(slots.agentLabel, (value) =>
    singlePayload({ ...noProject, agentLabel: value }, badge)
  );
  if (agentLabel !== null) return singlePayload({ ...noProject, agentLabel }, badge);
  // Past SPEC §2.4, and unreachable while a session id is a UUID: the only
  // unclipped slots left are the id and main's status word. The one row is
  // said in the count shape, which always fits, rather than exceed Apple's cap.
  return clippedCount([slots.name], false, badge);
}

/** SPEC §2.4 step 3: drop names from the end, say so once, then clip the first. */
function clippedCount(names: readonly string[], wake: boolean, badge: number): string {
  const lead = wake ? [PUSH_WAKE_SEEN] : [];
  const whole = countPayload([...lead, ...names].join(SEPARATOR), badge);
  if (fits(whole)) return whole;
  for (let kept = names.length - 1; kept >= 1; kept -= 1) {
    const payload = countPayload([...lead, ...names.slice(0, kept), ELLIPSIS].join(SEPARATOR), badge);
    if (fits(payload)) return payload;
  }
  const [first, ...dropped] = names;
  if (first === undefined) return countPayload(lead.join(SEPARATOR), badge);
  const tail = dropped.length > 0 ? [ELLIPSIS] : [];
  const render = (value: string): string =>
    countPayload([...lead, value, ...tail].join(SEPARATOR), badge);
  const clipped = clipToFit(first, render) ?? ELLIPSIS;
  return render(clipped);
}

/**
 * The alert for the rows that joined since the last send and are still
 * blocked, in the door's order, newest blocked first. `blockedCount` is the
 * badge and the number in the count alert's title.
 */
export function composeAlert(request: {
  readonly announce: readonly PocketBlockedRow[];
  readonly blockedCount: number;
}): AlertPlan {
  const [head, ...rest] = request.announce;
  if (head === undefined) return composeBadge(request.blockedCount);
  // Not empty from here on, and the tuple type says so.
  const input = { announce: [head, ...rest] as const, blockedCount: request.blockedCount };
  const single = input.announce.length === 1 && !input.announce[0].seenAtWake;
  if (single) {
    const slots: SingleSlots = {
      sessionId: head.sessionId,
      name: head.name,
      statusLabel: head.statusLabel,
      project: head.project,
      agentLabel: head.agentLabel,
      machine: head.machine
    };
    return {
      kind: 'single',
      payload: clippedSingle(slots, input.blockedCount),
      priority: 10,
      collapseId: head.sessionId,
      ttlSeconds: ALERT_TTL_SECONDS
    };
  }
  // The lead says every name after it was first seen at the wake, so it is
  // drawn only when that is true of every name (SPEC §As built, the fix round).
  const wake = input.announce.every((row) => row.seenAtWake);
  return {
    kind: 'count',
    payload: clippedCount(
      input.announce.map((row) => row.name),
      wake,
      input.blockedCount
    ),
    priority: 10,
    collapseId: WAITING_THREAD,
    ttlSeconds: ALERT_TTL_SECONDS
  };
}

/** The badge-only correction for a count that fell: no word, no sound, stored nowhere. */
export function composeBadge(blockedCount: number): AlertPlan {
  return {
    kind: 'badge',
    payload: JSON.stringify({ aps: { badge: blockedCount } }),
    priority: 5,
    collapseId: null,
    ttlSeconds: 0
  };
}
