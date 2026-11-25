/**
 * What Tortie reads back out of the small files its Antigravity status line
 * script writes (Phase 374). PURE: it takes text and a clock and answers a
 * reading or a row. The folder is `./folder.ts`'s and the script is
 * `./script.ts`'s.
 *
 * THE FILE IS TREATED AS THOUGH A STRANGER WROTE IT, although only Tortie's own
 * script does. Any process of the person's could replace it, so every field is
 * checked again here and nothing is taken for its shape alone.
 *
 * FIVE RULES, and each is here because its absence draws a false number:
 *
 *  1. THE NEWEST FILE SPEAKS WHOLE. Every bucket of one file or none: nothing
 *     is merged across files, so two accounts are never mixed and a bucket the
 *     newest file does not name is not drawn out of an older one. A file with
 *     no account hash is not a reading at all.
 *  2. A NUMBER NEEDS 0 ≤ f ≤ 1, finite, from a bucket that is not disabled and
 *     states no amount. The clamp alone is not enough: it would turn −3 into a
 *     FULL bar.
 *  3. A FULL BUCKET HAS NO RESET. At a remaining fraction of 1 the reset is now
 *     plus the window at the moment the program asked, so it counts down and
 *     jumps back (docs/research/146 §6.4).
 *  4. AGE IS DECIDED HERE, AT COMPOSE TIME, because nobody asks for this row
 *     and so no failed read can ever age it. Old past `USAGE_STALE_MS` reads
 *     `stale`. A window whose reset has passed is void, and so is one whose
 *     reading is older than the window is long, or an old full bucket would be
 *     drawn for a month.
 *  5. THE LAST PAYLOAD IS KEPT, EXACTLY. Within seconds of a launch the same
 *     bucket alternates between two server values (146 §16, at most 0.4 of a
 *     point) and nobody here knows which is right. Nothing reads the step as
 *     use: no log line, no notice and no status.
 *
 * NO HASH LEAVES MAIN. It is compared nowhere, because rule 1 makes comparing
 * it unnecessary: a newer file from another account replaces the whole reading.
 * It is what makes a file a reading, and the row does not carry it.
 */

import type {
  UsageProviderSnapshot,
  UsageSecondGroup,
  UsageWaitingFor,
  UsageWindow
} from '@shared/usage';
import {
  USAGE_STALE_MS,
  boundUsageReset,
  clampUsagePercent,
  emptyUsageProvider,
  usagePlanWord
} from '@shared/usage';
import type { AntigravityFile } from './folder';
import { ANTIGRAVITY_BUCKET_IDS } from './script';

export type { AntigravityFile };

/**
 * The four bucket ids, matched exactly, being the one list the script keeps
 * (./script.ts). They are the server's own words and they move (a fifth was
 * live until November 2026), and a bucket carries no other statement of its
 * window or its group. An id that is not one of these is dropped rather than
 * guessed at.
 */
export type AntigravityBucketId = (typeof ANTIGRAVITY_BUCKET_IDS)[number];

/** One bucket as the script kept it, each field checked again here. */
export interface AntigravityBucket {
  /** What REMAINS, 0 to 1. Null when absent or not a number. Not range checked yet. */
  f: number | null;
  /** When it resets, in milliseconds since epoch, or null when unstated. */
  r: number | null;
  disabled: boolean;
  /** A `remaining_amount` was there, so the fraction is not what is left. */
  amount: boolean;
}

/** One file's whole reading. */
export interface AntigravityReading {
  /** Which account, as a salted hash the script made. Never leaves main. */
  hash: string;
  plan: string | null;
  /** When the kept numbers last CHANGED, being the file's own time. */
  at: number;
  buckets: Partial<Record<AntigravityBucketId, AntigravityBucket>>;
}

/** The label the second group is drawn under, on the card alone. */
export const ANTIGRAVITY_SECOND_LABEL = 'Claude and GPT';

const FIVE_HOURS_MS = 5 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/** The longest file this reads. The script's own line is under 700 characters. */
const TEXT_MAX = 4096;
const HASH = /^[0-9a-f]{64}$/;
/**
 * One exact instant, with its zone. `Date.parse` on its own takes `5` and
 * answers a day in 2001, and the kept reset's charset lets such a token through.
 */
const INSTANT =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/;

function asRecord(raw: unknown): Record<string, unknown> | null {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return null;
  return raw as Record<string, unknown>;
}

function instant(raw: unknown): number | null {
  if (typeof raw !== 'string' || !INSTANT.test(raw)) return null;
  const at = Date.parse(raw);
  return Number.isNaN(at) ? null : at;
}

function bucketOf(raw: unknown): AntigravityBucket | null {
  const obj = asRecord(raw);
  if (obj === null) return null;
  const f = obj['f'];
  const d = obj['d'];
  const a = obj['a'];
  return {
    f: typeof f === 'number' ? f : null,
    r: instant(obj['r']),
    // Anything odd is disabled, and anything odd is an amount. Both are the
    // answer that draws nothing.
    disabled: !(d === false || d === null || d === undefined),
    amount: !(a === false || a === null || a === undefined)
  };
}

/**
 * One file's text to a reading, or null when it is not one.
 *
 * A new slot holds `{}` until its session has reported, so "not a reading" is
 * the ordinary answer and never an error. The reading's `at` is the file's and
 * the caller's: {@link newestReading} fills it in.
 */
export function parseAntigravityFile(text: string): AntigravityReading | null {
  if (text.length > TEXT_MAX) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(text) as unknown;
  } catch {
    return null;
  }
  const obj = asRecord(raw);
  if (obj === null || obj['v'] !== 1) return null;
  const hash = obj['h'];
  if (typeof hash !== 'string' || !HASH.test(hash)) return null;
  const q = asRecord(obj['q']);
  if (q === null) return null;
  const buckets: Partial<Record<AntigravityBucketId, AntigravityBucket>> = {};
  for (const id of ANTIGRAVITY_BUCKET_IDS) {
    const bucket = bucketOf(q[id]);
    if (bucket !== null) buckets[id] = bucket;
  }
  return { hash, plan: usagePlanWord(obj['p']), at: 0, buckets };
}

/**
 * The newest file that is a reading, whole.
 *
 * A time in the FUTURE counts as now. `seen` is what keeps that from making an
 * unchanged file read as fresh for ever: the first time a future file is met
 * its own "now" is written down and every later look answers with that. A
 * caller that asks once may leave it out.
 */
export function newestReading(
  files: readonly AntigravityFile[],
  now: number,
  seen: Map<string, number> = new Map()
): AntigravityReading | null {
  let best: AntigravityReading | null = null;
  const ahead = new Set<string>();
  for (const file of files) {
    let at = file.mtimeMs;
    if (!Number.isFinite(at)) continue;
    const key = `${file.id} ${String(file.mtimeMs)}`;
    const first = seen.get(key);
    if (first !== undefined) {
      at = Math.min(first, now);
      ahead.add(key);
    } else if (at > now) {
      at = now;
      seen.set(key, now);
      ahead.add(key);
    }
    if (best !== null && at <= best.at) continue;
    const reading = parseAntigravityFile(file.text);
    if (reading === null) continue;
    best = { ...reading, at };
  }
  for (const key of seen.keys()) if (!ahead.has(key)) seen.delete(key);
  return best;
}

/**
 * Which reading is held after a look, being the newer one (Phase 374 D18).
 *
 * THE HELD ONE STAYS until a newer file replaces it, so removing the session it
 * came from does not bring an older session's numbers back. A held time that is
 * ahead of the clock means the clock was put back, and then whatever the folder
 * says now is the newer thing.
 */
export function heldReading(
  held: AntigravityReading | null,
  next: AntigravityReading | null,
  now: number
): AntigravityReading | null {
  if (next === null) return held;
  if (held === null || held.at > now) return next;
  return next.at >= held.at ? next : held;
}

/** What one bucket answers: a window, a window that has passed, or nothing. */
type Drawn = { kind: 'window'; window: UsageWindow } | { kind: 'void' } | { kind: 'none' };

function drawnOf(
  bucket: AntigravityBucket | undefined,
  lengthMs: number,
  at: number,
  now: number
): Drawn {
  if (bucket === undefined || bucket.disabled || bucket.amount) return { kind: 'none' };
  const f = bucket.f;
  if (f === null || !Number.isFinite(f) || f < 0 || f > 1) return { kind: 'none' };
  const percent = clampUsagePercent(100 * (1 - f));
  if (percent === null) return { kind: 'none' };
  // A FULL BUCKET'S RESET IS A PLACEHOLDER, so it decides nothing either.
  const reset = f === 1 ? null : bucket.r;
  if (reset !== null && reset <= now) return { kind: 'void' };
  if (now - at > lengthMs) return { kind: 'void' };
  return { kind: 'window', window: { percent, resetsAt: boundUsageReset(reset, now) } };
}

function windowOf(drawn: Drawn): UsageWindow | null {
  return drawn.kind === 'window' ? drawn.window : null;
}

/**
 * The row, as the renderer sees it. Pure over the held reading and the clock:
 * the same reading is `ok`, then `stale`, then `waiting`, with nothing read in
 * between.
 */
export function antigravityRow(
  reading: AntigravityReading | null,
  now: number,
  waitingFor: UsageWaitingFor = 'session'
): UsageProviderSnapshot {
  const waiting = (): UsageProviderSnapshot => ({
    ...emptyUsageProvider('antigravity', 'waiting'),
    waitingFor
  });
  if (reading === null) return waiting();
  const b = reading.buckets;
  const five = drawnOf(b['gemini-5h'], FIVE_HOURS_MS, reading.at, now);
  const week = drawnOf(b['gemini-weekly'], SEVEN_DAYS_MS, reading.at, now);
  const otherFive = drawnOf(b['3p-5h'], FIVE_HOURS_MS, reading.at, now);
  const otherWeek = drawnOf(b['3p-weekly'], SEVEN_DAYS_MS, reading.at, now);
  const all = [five, week, otherFive, otherWeek];
  if (!all.some((one) => one.kind === 'window')) {
    if (all.some((one) => one.kind === 'void')) return waiting();
    return {
      ...emptyUsageProvider('antigravity', 'no-windows'),
      plan: reading.plan,
      readAt: reading.at
    };
  }
  const second: UsageSecondGroup = {
    label: ANTIGRAVITY_SECOND_LABEL,
    fiveHour: windowOf(otherFive),
    sevenDay: windowOf(otherWeek)
  };
  return {
    ...emptyUsageProvider('antigravity', now - reading.at > USAGE_STALE_MS ? 'stale' : 'ok'),
    fiveHour: windowOf(five),
    sevenDay: windowOf(week),
    second: second.fiveHour === null && second.sevenDay === null ? null : second,
    plan: reading.plan,
    readAt: reading.at
  };
}
