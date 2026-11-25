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
 * reaches this shape, a log line, the manifest, a store or an argv. And since
 * Phase 375 one address, on the received row alone, which the person's own
 * agent handed Tortie's script: `email` below, which passes `usageAddress`.
 *
 * The state word is a CODE and never a vendor sentence. Main names what
 * happened and the renderer writes the words (src/renderer/app/usage-copy.ts),
 * which is the house pattern the fold and arch sections already use, and it is
 * also what stops an error string somebody else composed from being drawn.
 *
 * TWO KINDS OF PROVIDER (Phase 374). Claude and Codex are ASKED: main reads the
 * person's own sign in and sends it to the vendor that issued it. Antigravity
 * is RECEIVED: its own program hands Tortie's script the numbers, main reads
 * the one small file that script wrote, and nobody is asked for anything. So a
 * received row has no login, can never be signed out or expired, and can never
 * have failed to be read. What kind a provider is lives in ONE table,
 * `src/main/usage/providers.ts`, and the two lookups below say the two facts a
 * renderer needs of it. Neither is ever a comparison: at the parent of Phase
 * 374 "not claude" meant Codex in three places, and a third member sent the
 * Codex sign in to the Codex host under its own name.
 */

import type { LoginProviderId } from './logins';

/**
 * Every provider the meter can draw. The first two are the person's own login;
 * the third has none, and its numbers arrive from the sessions themselves.
 */
export type UsageProviderId = 'claude' | 'codex' | 'antigravity';

export const USAGE_PROVIDERS: readonly UsageProviderId[] = [
  'claude',
  'codex',
  'antigravity'
];

/**
 * Which login a provider's numbers belong to, or null when it has none (Phase
 * 374). `LoginProviderId` stays TWO members: widened, a Google login would
 * fall through to Claude's keychain item on some paths and to Codex's file on
 * others, with almost nothing failing to compile.
 *
 * NULL MEANS NO LOGIN LINE, NO CHOOSE LOGIN AND NO LOGIN FILE ASKED. Every
 * caller that holds a `UsageProviderId` and wants a login goes through
 * {@link usageLoginProvider}, which is a lookup and never a comparison.
 */
export const USAGE_LOGIN_PROVIDER: Readonly<
  Record<UsageProviderId, LoginProviderId | null>
> = {
  claude: 'claude',
  codex: 'codex',
  antigravity: null
};

/** The login this provider's numbers belong to, or null when it has none. */
export function usageLoginProvider(p: UsageProviderId): LoginProviderId | null {
  return USAGE_LOGIN_PROVIDER[p];
}

/**
 * Whether a provider's numbers arrive rather than being asked for (Phase 374).
 * It agrees with the entry's kind in `src/main/usage/providers.ts`, which
 * `npm run conformance:usage` holds.
 */
export const USAGE_RECEIVERS: Readonly<Record<UsageProviderId, boolean>> = {
  claude: false,
  codex: false,
  antigravity: true
};

/** Do this provider's numbers arrive by themselves, so nothing asks for them? */
export function usageIsReceiver(p: UsageProviderId): boolean {
  return USAGE_RECEIVERS[p];
}

/** How long numbers may stand before the row says they are old. */
export const USAGE_STALE_MS = 30 * 60 * 1000;

/**
 * What happened on the last attempt for one provider.
 *
 * `off` is the shipped answer for every provider and it is load bearing:
 * while a provider is off nothing is read and nothing is sent, so main does
 * not open the keychain, does not open a credentials file, makes no request at
 * all and opens no folder of received numbers.
 *
 * A RECEIVED ROW NEVER SAYS `signed-out`, `expired`, `api-key` OR
 * `unavailable` (Phase 374): nothing is asked for it, so nothing can have
 * refused it.
 */
export type UsageState =
  /** The toggle is off. Nothing was read and nothing was sent. */
  | 'off'
  /** Numbers below are from a successful read. */
  | 'ok'
  /**
   * The last read failed; the numbers below are the previous ones. On a
   * RECEIVED row nothing failed: the numbers are simply older than
   * {@link USAGE_STALE_MS}, and `readAt` says how old.
   */
  | 'stale'
  /**
   * Phase 374. A received row with nothing to draw yet, either because nothing
   * has arrived or because every window that did has passed. `waitingFor` says
   * what it is waiting for, and the renderer writes the words.
   */
  | 'waiting'
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

/**
 * Why a received row has no numbers, as a CODE (Phase 374). It is what the last
 * launch decision of this process found, and `session` before any launch: a
 * row that says "start a session" to a person who just started one would be
 * false, so each of the other answers is the reason that one did not report.
 */
export type UsageWaitingFor =
  /** Nothing has arrived; a new session is what fills it. */
  | 'session'
  /** The person has a status line or settings of their own, so Tortie stood aside. */
  | 'own-status-line'
  /** The program is too old, or its version could not be read off the file that runs. */
  | 'version'
  /** The session is recorded by SpecStory, which holds its command line. */
  | 'captured'
  /** The program did not start with it, so this build of it is left alone. */
  | 'start-failed'
  /** Tortie could not write its script. */
  | 'unwritable';

/**
 * A second pair of windows beside the face's own (Phase 374). Antigravity has
 * two model groups, each with a five hour and a weekly window; the Gemini group
 * is the face's and this one is drawn on the hover card alone. It has no bar.
 */
export interface UsageSecondGroup {
  label: string;
  fiveHour: UsageWindow | null;
  sevenDay: UsageWindow | null;
}

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
  /** The second model group, for the card alone (Phase 374). Null on every other provider. */
  second: UsageSecondGroup | null;
  /** What a `waiting` row waits for (Phase 374). Null in every other state. */
  waitingFor: UsageWaitingFor | null;
  /**
   * The plain plan word this login is on, or null when the vendor named none
   * (Phase 181.2). Claude's `subscriptionType` and Codex's `plan_type`, both
   * measured in docs/research/72 section 8, and since Phase 374 the plan word
   * Antigravity's own payload states, passed through `usagePlanWord` before
   * they reach this field.
   *
   * WHAT KEEPS AN IDENTIFIER OUT OF HERE IS WHAT MAIN READS, and not the
   * filter on its own. Main calls `usagePlanWord` on those three plan fields
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
  /**
   * TRUE when the numbers above were read for a DIFFERENT login than the one
   * this meter is now on (Phase 202 fix round). It is only ever true beside
   * the `stale` state, and it is what lets the card say the new login is
   * being read rather than that the last read failed, which would be false.
   *
   * The whole reason it exists is that "stale" has two causes now: a read
   * that failed, and a person who chose another account a moment ago. They
   * want different words, and research 72's rule that the meter never lies
   * across accounts is what makes the difference worth a field.
   */
  loginChanged: boolean;
  /**
   * Milliseconds since epoch of the read the numbers came from; null if never.
   * On a received row it is when the numbers last CHANGED, which is the only
   * thing that proves they were served again (Phase 374).
   */
  readAt: number | null;
  /** Milliseconds since epoch before which a refresh is refused, or null. */
  retryAfter: number | null;
  /**
   * THE ACCOUNT A RECEIVED ROW'S NUMBERS BELONG TO (Phase 375 D6, D11), being
   * the address the person's own agent handed Tortie's script beside them, and
   * it passed {@link usageAddress}. OPTIONAL AND ABSENT UNLESS SET: only the
   * Antigravity row ever carries it, and only when its newest file names one,
   * so every other row, and an Antigravity row with no address, is the JSON
   * Phase 374 sent. Claude's and Codex's addresses are never put here; the card
   * finds those through the logins store (Phase 203).
   *
   * WHERE IT MAY GO: the slot file, main's memory, the `usage:read`,
   * `usage:refresh` and `usage:account` answers, the `usage:changed` push, the
   * two windows' memory, the hover card and the one Settings row. NEVER a log
   * line, the manifest, settings.json, Local or Session Storage, an argv, an
   * environment, a door route or the phone, Live Diagnostics, a crash
   * annotation or a row's resting accessible text. `npm run conformance:usage`
   * G12 holds it.
   */
  email?: string;
}

/** Every provider, in `USAGE_PROVIDERS` order. The one payload both channels answer. */
/**
 * Whether a claude session Tortie launches carries the managed status line,
 * and when it does not, WHY (Phase 219, item 8).
 *
 * Phase 182 wrote this decision at every launch and sent it to a log line, one
 * per reason per process. Its own verifier recorded that a person is never
 * told, and it stayed unfixed for twenty seven phases: turning Claude usage on
 * in Settings can leave the meter polling on a fifteen minute interval instead
 * of moving when a turn ends, and the face said nothing at all.
 *
 * `off` and `installed` are not refusals and the face draws nothing extra for
 * them. The other two are refusals and each gets one short line.
 */
export type ClaudeStatusLineState =
  /** The Claude usage switch is off. Nothing is written and nothing runs. */
  | 'off'
  /** A session launched now gets the managed status line; the meter is live. */
  | 'installed'
  /**
   * The person's own settings already name a status line. A status line is one
   * command and the highest source wins outright, so installing Tortie's would
   * silently delete theirs inside Tortie launched sessions. The meter keeps the
   * endpoint poll it already had.
   */
  | 'person-owns-it'
  /** The script could not be written at the last launch that tried. */
  | 'unwritable';

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
    second: null,
    waitingFor: null,
    plan: null,
    login: null,
    loginChanged: false,
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
 * `subscriptionType` off the Claude keychain item, on `plan_type` off the
 * Codex usage body and, since Phase 374, on the one plan field of the file
 * Tortie's own Antigravity script writes, and on nothing else; the renderer
 * calls it a second time on a plan that already came through here. The address, user id and account
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

/** The longest address this app will draw, being what one may be (Phase 375). */
export const USAGE_ADDRESS_MAX = 254;

/**
 * The one gate an address passes before it may be drawn or carried (Phase 375
 * D4). Main's reader, the card and Settings each ask it.
 *
 * WHAT IT LETS THROUGH: a plain ASCII address, being letters, digits and
 * `. _ % + ' -` before ONE `@`, a local part of 1 to 64 of them, then labels
 * of letters, digits and hyphens with at least one dot between them, and at
 * most {@link USAGE_ADDRESS_MAX} in all. It is the twin, over the DECODED
 * string, of the shape Tortie's Antigravity script keeps over the raw token
 * (src/main/usage/antigravity/script.ts), and `conformance:usage` G12 holds
 * the two to one committed corpus.
 *
 * WHAT IT REFUSES, and that is most of what it is for: a quote, a backslash,
 * a space, a newline, markup, any byte outside ASCII (an accent, another
 * script, a direction mark), two `@`, no dot, a trailing dot, and anything
 * longer. Nothing is ever escaped or trimmed to make a value pass: an address
 * that does not pass is not drawn at all.
 */
export function usageAddress(raw: unknown): string | null {
  if (typeof raw !== 'string' || raw.length > USAGE_ADDRESS_MAX) return null;
  const at = raw.indexOf('@');
  if (at < 1 || at > 64) return null;
  return /^[A-Za-z0-9._%+'-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$/.test(raw) ? raw : null;
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
