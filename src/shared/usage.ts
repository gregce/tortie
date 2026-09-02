/**
 * The subscription usage meter's wire shapes (Phase 181).
 *
 * ONE RULE DECIDES EVERY FIELD HERE: what crosses IPC is numbers, timestamps,
 * a state word and, since Phase 181.2, a plain plan word, and nothing else.
 * A plan word is what a person calls the thing they pay for. It passes
 * `usagePlanWord` below, which is a narrow filter and NOT a general
 * identifier detector; what keeps an identifier off a face is that main hands
 * that filter two plan fields and nothing else, and the comment on the
 * function says how far each half of it reaches. The Codex usage response
 * carries the person's email address, user id and account id at its TOP
 * LEVEL, measured
 * over the wire on 2026-08-31 and written down in docs/research/72 section
 * 8.3, so that body is itself personal data. Main parses it and none of it
 * reaches this shape, a log line, the manifest, a store or an argv.
 *
 * The state word is a CODE and never a vendor sentence. Main names what
 * happened and the renderer writes the words (src/renderer/app/usage-copy.ts),
 * which is the house pattern the fold and arch sections already use, and it is
 * also what stops an error string somebody else composed from being drawn.
 */

/** The two providers Phase 181 reads. Both are the person's own login. */
export type UsageProviderId = 'claude' | 'codex';

export const USAGE_PROVIDERS: readonly UsageProviderId[] = ['claude', 'codex'];

/**
 * What happened on the last attempt for one provider.
 *
 * `off` is the shipped answer for both providers and it is load bearing:
 * while a provider is off nothing is read and nothing is sent, so main does
 * not open the keychain, does not open a credentials file and makes no
 * request at all.
 */
export type UsageState =
  /** The toggle is off. Nothing was read and nothing was sent. */
  | 'off'
  /** Numbers below are from a successful read. */
  | 'ok'
  /** The last read failed; the numbers below are the previous ones. */
  | 'stale'
  /** No credential was found at all. The one state that earns a sign in line. */
  | 'signed-out'
  /** A credential was found and the vendor refused it. Run the agent to refresh. */
  | 'expired'
  /** API key billing rather than a subscription, so there is no window to draw. */
  | 'api-key'
  /** The vendor answered and named no window this meter draws. */
  | 'no-windows'
  /** Anything else: no route, a timeout, a body that did not parse. */
  | 'unavailable';

/** One window's served number and its reset time. Nothing is computed here. */
export interface UsageWindow {
  /** Percent USED, 0 to 100, clamped and rounded once by main. */
  percent: number;
  /** Milliseconds since epoch when the window resets; null when unstated. */
  resetsAt: number | null;
}

/** One provider's meter. Every number is served; none is estimated. */
export interface UsageProviderSnapshot {
  provider: UsageProviderId;
  state: UsageState;
  /** The five hour window, or null when the vendor named none. */
  fiveHour: UsageWindow | null;
  /** The seven day window, or null when the vendor named none. */
  sevenDay: UsageWindow | null;
  /**
   * The per model weekly window when the vendor names one (Claude's Fable
   * row inside `limits[]`). Null everywhere else. A label and a percent, and
   * the label is the vendor's own display name.
   */
  scoped: (UsageWindow & { label: string }) | null;
  /**
   * The plain plan word this login is on, or null when the vendor named none
   * (Phase 181.2). Claude's `subscriptionType` and Codex's `plan_type`, both
   * measured in docs/research/72 section 8, passed through
   * `usagePlanWord` before they reach this field.
   *
   * WHAT KEEPS AN IDENTIFIER OUT OF HERE IS WHAT MAIN READS, and not the
   * filter on its own. Main calls `usagePlanWord` on those two plan fields
   * and on nothing else in the tree: `email`, `user_id` and `account_id` sit
   * beside `plan_type` in the same Codex body and are never touched, and
   * Codex's account id goes into a request header and never onto a snapshot.
   * The filter is the second guard, and it refuses a long value and an
   * address rather than every short one, which `usagePlanWord` states
   * exactly. A provider that can only be told apart by an identifier says
   * nothing rather than drawing a string nobody can read.
   */
  plan: string | null;
  /**
   * WHICH LOGIN THESE NUMBERS BELONG TO, by name, or null for the person's own
   * default sign in (Phase 202).
   *
   * It is the login the read was actually made against, not the one that is
   * chosen: those differ for exactly as long as it takes the next read to
   * land, and during that gap the state is `stale`, so the card can say the
   * numbers are the previous login's rather than draw them as current. That is
   * the research 72 rule this phase inherits whole, being never lie across
   * accounts.
   *
   * A NAME AND NEVER A DIRECTORY. A renderer has no use for the path and a
   * value a renderer never sees cannot reach a screenshot or a report.
   */
  login: string | null;
  /** Milliseconds since epoch of the read the numbers came from; null if never. */
  readAt: number | null;
  /** Milliseconds since epoch before which a refresh is refused, or null. */
  retryAfter: number | null;
}

/** Every provider, in `USAGE_PROVIDERS` order. The one payload both channels answer. */
export interface UsageSnapshot {
  providers: UsageProviderSnapshot[];
  /** Milliseconds since epoch this payload was composed. */
  at: number;
}

/** A provider with nothing read yet, which is what `off` looks like. */
export function emptyUsageProvider(
  provider: UsageProviderId,
  state: UsageState = 'off'
): UsageProviderSnapshot {
  return {
    provider,
    state,
    fiveHour: null,
    sevenDay: null,
    scoped: null,
    plan: null,
    login: null,
    readAt: null,
    retryAfter: null
  };
}

/** Does this provider have a number worth drawing a bar for? */
export function usageHasNumbers(p: UsageProviderSnapshot): boolean {
  return p.fiveHour !== null || p.sevenDay !== null;
}

/**
 * The one clamp. A served percentage is trusted for its VALUE and never for
 * its range: a vendor that answers 1e309, -3 or NaN must not widen a bar past
 * its track or draw a number nobody can read.
 */
export function clampUsagePercent(raw: unknown): number | null {
  const n = typeof raw === 'number' ? raw : Number.NaN;
  if (!Number.isFinite(n)) return null;
  return Math.round(Math.min(100, Math.max(0, n)) * 10) / 10;
}

/**
 * The longest plan word this app will draw. Every plan word either vendor is
 * measured to use is far under it, and it is what refuses a uuid at thirty
 * six characters and the long opaque runs real keys, session ids and account
 * ids are written as. It refuses nothing shorter, which is the measurement
 * the note on `usagePlanWord` rests on.
 */
export const USAGE_PLAN_MAX = 20;

/**
 * The one gate a plan word passes before it may be drawn (Phase 181.2).
 *
 * WHAT IT LETS THROUGH: a short word a person recognises, being `pro`, `max`,
 * `team`, `plus`, `enterprise` or whatever either vendor names next, with the
 * separators those words are written with. It starts with a letter, holds
 * only letters, digits, spaces, underscores and hyphens, and is at most
 * twenty characters.
 *
 * WHAT EACH HALF REFUSES, measured rather than claimed, because two earlier
 * versions of this comment said more than the code does and a later round
 * could have trusted one of them. THE SHAPE refuses an address, which holds
 * an `@`, a bare number, which starts with no letter, and anything carrying a
 * character outside the set, being a colon, a slash, a dot, a newline or a
 * direction mark. THE LENGTH refuses every value over twenty characters,
 * which is a uuid at thirty six and the long opaque runs real keys, session
 * ids and account ids are written as.
 *
 * WHAT NEITHER HALF REFUSES, and this is the sentence to read before handing
 * this function a new field. A SHORT identifier shaped value passes the whole
 * gate and is returned. Measured on 2026-08-31: `org-01HZY8Q7C3K9` at sixteen
 * characters comes back drawable, a person's first and last name at sixteen
 * comes back drawable, and a truncated key at seventeen comes back drawable.
 * No cap could fix that, because `pro` and a short id are the same shape. So
 * this is a narrow filter on ONE kind of value and it is not, and cannot be,
 * a general identifier detector.
 *
 * SO THE GUARD THAT HOLDS IS WHAT IT IS HANDED. Main calls this on
 * `subscriptionType` off the Claude keychain item and on `plan_type` off the
 * Codex usage body, and on nothing else; the renderer calls it a second time
 * on a plan that already came through here. The address, user id and account
 * id in that same Codex body are never read, the organization id arrives in a
 * response header and the account id goes into a request header, and none of
 * them is offered to this function at all. Handing it a field that can hold
 * an identifier would defeat it whatever the cap says, and
 * `src/main/usage/__tests__/p1812-plan.test.ts` fails when a call site does.
 */
export function usagePlanWord(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const word = raw.trim();
  if (word.length === 0 || word.length > USAGE_PLAN_MAX) return null;
  return /^[A-Za-z][A-Za-z0-9 _-]*$/.test(word) ? word : null;
}

/**
 * The furthest ahead a plan window may reset, being forty days.
 *
 * The longest window either vendor names is seven days, so this has five
 * weeks of slack and still refuses the shapes the fix round of 2026-08-31
 * found: nothing bounded how far away a reset could be, so a body naming an
 * absurd one drew `Resets in 11574053377d 9h` on the hover card. A reset
 * beyond this horizon is not a plan window, so it is dropped rather than
 * capped, and the card simply says nothing about that window's reset.
 */
export const USAGE_MAX_RESET_MS = 40 * 24 * 60 * 60 * 1000;

/** A served reset time, or null when it is not one this app will draw. */
export function boundUsageReset(at: number | null, now: number): number | null {
  if (at === null || !Number.isFinite(at)) return null;
  return at - now > USAGE_MAX_RESET_MS ? null : at;
}
