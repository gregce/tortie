/**
 * The usage service (Phase 181): what is held, when a request is allowed, and
 * what a failure does to the face.
 *
 * THE DISCIPLINE, inherited whole from research 72 section 4, which is orca's
 * own hard-won list:
 *
 *  - POLL GENTLY. Fifteen minutes, and the renderer only asks while its window
 *    is visible and focused. Main enforces the interval as well, so a renderer
 *    that asked every second would still make one request every fifteen
 *    minutes. Claude's usage endpoint has a tight budget and a recent snapshot
 *    beats polling into a 429.
 *  - STALE BEATS BLANK. A failed read keeps the previous numbers under a small
 *    glyph for thirty minutes (twenty four hours after a rate limit) rather
 *    than flapping to an error face and back.
 *  - A SIGN IN LINE ONLY ON A CONFIRMED SIGN OUT. Network and parse failures
 *    can look like auth while the person's sessions are perfectly valid, so
 *    only "no credential exists at all" earns that line.
 *  - NOTHING WHILE OFF. This is the load bearing one, and it is structural
 *    rather than a check: a provider that is off never reaches
 *    `fetchProvider`, so no keychain is opened, no credentials file is read
 *    and no request is made. The unit test proves it by handing in a
 *    credential reader and a transport that throw when called.
 *  - THE SWITCH ANSWERS AT ONCE. A provider that has just been switched on
 *    holds nothing, so it is due and it asks, which is what makes the meter
 *    draw rather than sit empty for a quarter of an hour. The fix round of
 *    2026-08-31 measured that in the running app: one flip, one ask, and the
 *    row on screen in a millisecond. A flip is a person's own act in
 *    Settings, and a settings write is the only thing that broadcasts a
 *    settings change, so one request per flip is a person's pace rather than
 *    a poll. What a flip may NOT do is walk past a `Retry-After`, and that is
 *    the one thing an off row keeps.
 *
 * NO TOKEN REFRESH, EVER, IN THIS PHASE. An expired token draws a plain line
 * saying to run the agent, which is what actually refreshes it.
 */

import type {
  UsageProviderId,
  UsageProviderSnapshot,
  UsageSnapshot,
  UsageState,
  UsageWindow
} from '@shared/usage';
import { USAGE_PROVIDERS, emptyUsageProvider } from '@shared/usage';
import type { UsageSettings } from '@shared/settings';
import {
  claudeUsageHeaders,
  codexUsageHeaders,
  CLAUDE_USAGE_HOST,
  CLAUDE_USAGE_PATH,
  CODEX_USAGE_HOST,
  CODEX_USAGE_PATH
} from './endpoints';
import type { CredentialDeps, CredentialResult } from './credentials';
import { readClaudeCredential, readCodexCredential } from './credentials';
import {
  EMPTY_PARSE,
  boundParsedResets,
  parseClaudeUsage,
  parseCodexUsage
} from './parse';
import type { ParsedUsage } from './parse';
import type { TapSample } from './statusline';
import { decodeConfigKey, normalizeConfigDir, parseTapBody } from './statusline';
import type { UsageTransport } from './transport';

/** The poll interval, and main holds it as well as the renderer. */
export const USAGE_POLL_MS = 15 * 60 * 1000;
/** The floor the refresh control cannot go under. */
export const USAGE_REFRESH_FLOOR_MS = 60 * 1000;
/** How long old numbers stay on screen under a glyph after a failure. */
export const USAGE_STALE_MS = 30 * 60 * 1000;
/** The same, after a rate limit, where a longer memory is the kinder answer. */
export const USAGE_STALE_RATE_LIMITED_MS = 24 * 60 * 60 * 1000;
/**
 * How long a live post from the status line tap keeps the endpoint poll away
 * (Phase 182, research 72 section 3). The tap costs nothing and the endpoint
 * has a tight budget, so while the tap is talking the poll has nothing to add.
 */
export const USAGE_TAP_SUPPRESS_MS = 5 * 60 * 1000;
/** Identical numbers inside this window are the same post, not a new one. */
export const USAGE_TAP_DEDUPE_MS = 30 * 1000;

export interface UsageServiceDeps {
  credentials: CredentialDeps;
  transport: UsageTransport;
  /** What Settings says right now. Read on every call; never cached. */
  settings(): UsageSettings;
  now(): number;
  /** A provider name and a fixed sentence. NEVER a token, a body or a header. */
  log(event: string, fields: Record<string, unknown>): void;
  /**
   * The held snapshot changed without anybody asking for it (Phase 182).
   * Only a live tap does that; every other change is the answer to a call the
   * renderer already made. Absent in tests and in any wiring with no window.
   */
  onChanged?(snapshot: UsageSnapshot): void;
}

export interface UsageService {
  /** The held snapshot, fetching only what the interval says is due. */
  read(): Promise<UsageSnapshot>;
  /** The refresh control: skips the interval, honours the floor and Retry-After. */
  refresh(): Promise<UsageSnapshot>;
  /** What is held right now. Reads nothing, sends nothing, starts nothing. */
  current(): UsageSnapshot;
  /**
   * One form encoded post from a Tortie launched claude session's managed
   * status line (Phase 182). `sessionId` is the one the TOKEN belongs to and
   * not the one the body claims; the two are compared here.
   */
  applyTap(sessionId: string, body: string): TapOutcome;
}

/**
 * What happened to one tap post. Every value except `applied` is a DROP, and
 * a drop never changes a number on screen.
 */
export type TapOutcome =
  /** The numbers moved and the snapshot was broadcast. */
  | 'applied'
  /** The Claude switch is off, so this meter holds nothing and reads nothing. */
  | 'off'
  /** The body did not parse, named no window, or was not version 1. */
  | 'shape'
  /** The body claimed a session the token does not belong to. */
  | 'session'
  /** The poster's config directory is not the account this meter draws. */
  | 'account'
  /** The same numbers, again, inside the dedupe window. */
  | 'duplicate';

type Outcome =
  | { kind: 'ok'; parsed: ParsedUsage }
  | { kind: 'signed-out' }
  | { kind: 'api-key' }
  | { kind: 'expired' }
  | { kind: 'rate-limited'; retryAfterAt: number | null }
  | { kind: 'unavailable' };

interface Held {
  state: UsageState;
  parsed: ParsedUsage;
  readAt: number | null;
  lastAttemptAt: number;
  retryAfter: number | null;
  inFlight: Promise<void> | null;
  /** When a live tap post was last APPLIED, or null. Phase 182. */
  tapAt: number | null;
}

function freshHeld(): Held {
  return {
    state: 'off',
    parsed: EMPTY_PARSE,
    readAt: null,
    lastAttemptAt: 0,
    retryAfter: null,
    inFlight: null,
    tapAt: null
  };
}

/** Do two windows say exactly the same thing? Used only for the tap dedupe. */
function sameWindow(a: UsageWindow | null, b: UsageWindow | null): boolean {
  if (a === null || b === null) return a === b;
  return a.percent === b.percent && a.resetsAt === b.resetsAt;
}

function hasAnything(parsed: ParsedUsage): boolean {
  return (
    parsed.fiveHour !== null || parsed.sevenDay !== null || parsed.scoped !== null
  );
}

/** The held row as the renderer sees it. Numbers, timestamps and a state code. */
function viewOf(provider: UsageProviderId, held: Held): UsageProviderSnapshot {
  if (held.state === 'off') return emptyUsageProvider(provider);
  return {
    provider,
    state: held.state,
    fiveHour: held.parsed.fiveHour,
    sevenDay: held.parsed.sevenDay,
    scoped: held.parsed.scoped,
    plan: held.parsed.plan,
    readAt: held.readAt,
    retryAfter: held.retryAfter
  };
}

/**
 * What a body's status means. Two of the four are CONFIRMED answers about the
 * credential and the other two are failures the stale policy covers.
 *
 * Research 72 section 8.5 is explicit that no failure path was ever exercised,
 * so every branch below except 200 stands on orca's code rather than on bytes.
 * That is why the mapping is by STATUS ONLY and reads nothing out of an error
 * body: a shape nobody has seen cannot be parsed safely.
 *
 * WHAT HAS BEEN MEASURED SINCE, and what has not (research 72 section 9,
 * Phase 197 item 9). Claude answers a request with NO Authorization header
 * with 429 and a real Retry-After, measured twice at 3438 s and 3600 s, so
 * the rate limit branch is exercised and the header parser is real. What
 * Claude answers to a REFUSED token is still unmeasured, because Tortie never
 * sends the no header shape and a refused login was not to hand, so it is
 * possible a refused token also arrives as 429 and draws the old numbers
 * under the stale glyph for a day rather than the run the agent line. The
 * mapping is deliberately NOT changed on that possibility: reading 429 as
 * expired would treat an unauthenticated refusal as an authenticated one and
 * break the rate limit policy the same measurement proved real. The honest
 * next step is one measurement with a token the vendor refuses.
 */
function outcomeForStatus(
  status: number,
  retryAfterAt: number | null
): Outcome | null {
  if (status === 200) return null;
  if (status === 401 || status === 403) return { kind: 'expired' };
  if (status === 429) return { kind: 'rate-limited', retryAfterAt };
  return { kind: 'unavailable' };
}

function parseBody(body: string): unknown {
  try {
    return JSON.parse(body) as unknown;
  } catch {
    return null;
  }
}

export function createUsageService(deps: UsageServiceDeps): UsageService {
  const held = new Map<UsageProviderId, Held>(
    USAGE_PROVIDERS.map((p) => [p, freshHeld()])
  );

  async function credentialFor(
    provider: UsageProviderId
  ): Promise<CredentialResult> {
    return provider === 'claude'
      ? readClaudeCredential(deps.credentials)
      : readCodexCredential(deps.credentials);
  }

  async function fetchProvider(provider: UsageProviderId): Promise<Outcome> {
    let cred: CredentialResult;
    try {
      cred = await credentialFor(provider);
    } catch {
      return { kind: 'unavailable' };
    }
    if (cred.kind === 'missing') return { kind: 'signed-out' };
    if (cred.kind === 'api-key') return { kind: 'api-key' };
    const request =
      provider === 'claude'
        ? {
            host: CLAUDE_USAGE_HOST,
            path: CLAUDE_USAGE_PATH,
            headers: claudeUsageHeaders(cred.token)
          }
        : {
            host: CODEX_USAGE_HOST,
            path: CODEX_USAGE_PATH,
            headers: codexUsageHeaders(cred.token, cred.accountId ?? '')
          };
    let res;
    try {
      res = await deps.transport(request);
    } catch {
      return { kind: 'unavailable' };
    }
    const bad = outcomeForStatus(res.status, res.retryAfterAt);
    if (bad !== null) return bad;
    const body = parseBody(res.body);
    if (body === null) return { kind: 'unavailable' };
    const now = deps.now();
    const parsed =
      provider === 'claude'
        ? // The Claude body names no plan, so the word comes off the login
          // that was just read. It is a plan and never an identifier: the
          // credential reader put it through `usagePlanWord` already.
          { ...parseClaudeUsage(body), plan: cred.plan }
        : parseCodexUsage(body, now);
    return { kind: 'ok', parsed: boundParsedResets(parsed, now) };
  }

  function applyOutcome(h: Held, outcome: Outcome, now: number): void {
    h.lastAttemptAt = now;
    if (outcome.kind === 'ok') {
      h.parsed = outcome.parsed;
      h.readAt = now;
      h.retryAfter = null;
      h.state = hasAnything(outcome.parsed) ? 'ok' : 'no-windows';
      return;
    }
    if (outcome.kind === 'signed-out' || outcome.kind === 'api-key') {
      h.parsed = EMPTY_PARSE;
      h.readAt = null;
      h.retryAfter = null;
      h.state = outcome.kind;
      return;
    }
    if (outcome.kind === 'expired') {
      // A confirmed refusal of this token, and the fix is one sentence a
      // person can act on. Old numbers under a glyph would hide that.
      h.parsed = EMPTY_PARSE;
      h.readAt = null;
      h.retryAfter = null;
      h.state = 'expired';
      return;
    }
    const rateLimited = outcome.kind === 'rate-limited';
    if (rateLimited) h.retryAfter = outcome.retryAfterAt;
    const keepFor = rateLimited ? USAGE_STALE_RATE_LIMITED_MS : USAGE_STALE_MS;
    const fresh =
      h.readAt !== null && now - h.readAt <= keepFor && hasAnything(h.parsed);
    if (fresh) {
      h.state = 'stale';
      return;
    }
    h.parsed = EMPTY_PARSE;
    h.readAt = null;
    h.state = 'unavailable';
  }

  function due(h: Held, now: number, force: boolean): boolean {
    if (h.retryAfter !== null && now < h.retryAfter) return false;
    // Phase 182: a live post inside the last five minutes says the numbers on
    // screen are the vendor's own current answer, so the poll has nothing to
    // add and spends budget for it. The REFRESH CONTROL is not suppressed,
    // because it is a person asking, and because the endpoint is the only
    // source of the per model weekly row the tap never carries.
    if (
      !force &&
      h.tapAt !== null &&
      now - h.tapAt < USAGE_TAP_SUPPRESS_MS
    ) {
      return false;
    }
    const since = now - h.lastAttemptAt;
    return since >= (force ? USAGE_REFRESH_FLOOR_MS : USAGE_POLL_MS);
  }

  function compose(): UsageSnapshot {
    return {
      at: deps.now(),
      providers: USAGE_PROVIDERS.map((p) => viewOf(p, held.get(p) ?? freshHeld()))
    };
  }

  /**
   * The account this meter draws, as the tap encodes it: the config directory
   * main itself would read a credential from, trailing separators trimmed.
   *
   * WHY IT IS COMPARED AT ALL, and it is the research 72 section 4 rule that
   * matters most here. A person can run several Claude logins on one machine
   * by pointing sessions at different `CLAUDE_CONFIG_DIR`s. The meter draws
   * ONE account's quota, being the one main reads the credential for, and a
   * post from a session logged in as somebody else would put another
   * account's numbers under this account's plan word. That is not a stale
   * number, it is a false one, so it is dropped.
   */
  function selectedAccountDir(): string {
    return normalizeConfigDir(deps.credentials.env['CLAUDE_CONFIG_DIR']);
  }

  /**
   * One live post, and the five ingest rules from research 72 section 3, in
   * the order a post meets them.
   */
  function applyTap(sessionId: string, body: string): TapOutcome {
    const h = held.get('claude');
    if (h === undefined) return 'off';
    // 1. NOTHING WHILE OFF. The switch is the whole permission this feature
    //    has, and a meter that is off holds nothing and shows nothing. The
    //    script is not even installed while it is off; this is the second
    //    guard, for a session that was launched while it was on.
    if (!deps.settings().claude) return 'off';
    const sample: TapSample | null = parseTapBody(body, deps.now());
    // 2. A SHAPE NOBODY RECOGNISES IS NOT A NUMBER. An absent window is the
    //    tap saying nothing about that window, and a body naming neither is
    //    nothing to apply rather than a meter to clear.
    if (sample === null) return 'shape';
    // 3. THE BODY MAY NOT NAME A SESSION THE TOKEN DOES NOT OWN. The token is
    //    already proof this is one of Tortie's own claude sessions; this
    //    catches a session posting under another one's name.
    if (sample.sessionId !== sessionId) return 'session';
    // 4. NEVER LIE ACROSS ACCOUNTS.
    if (decodeConfigKey(sample.configKey) !== selectedAccountDir()) {
      return 'account';
    }
    const now = deps.now();
    // 5. THE SAME NUMBERS AGAIN ARE NOT NEWS. A long turn re-runs the status
    //    line many times and the throttle in the script is per pane, so two
    //    panes of the same login post the same numbers seconds apart.
    if (
      h.tapAt !== null &&
      now - h.tapAt < USAGE_TAP_DEDUPE_MS &&
      sameWindow(sample.fiveHour, h.parsed.fiveHour) &&
      sameWindow(sample.sevenDay, h.parsed.sevenDay)
    ) {
      return 'duplicate';
    }
    // THE PER MODEL WEEKLY ROW AND THE PLAN WORD ARE KEPT, and research 72
    // section 10.4 is why: the tap carries `five_hour` and `seven_day` and
    // nothing else, so the Fable row can only ever come from the endpoint. A
    // tap that overwrote the whole parse would take that row off the card
    // for as long as it kept suppressing the poll.
    h.parsed = {
      fiveHour: sample.fiveHour ?? h.parsed.fiveHour,
      sevenDay: sample.sevenDay ?? h.parsed.sevenDay,
      scoped: h.parsed.scoped,
      plan: h.parsed.plan
    };
    h.readAt = now;
    h.tapAt = now;
    h.state = 'ok';
    // `lastAttemptAt` is deliberately NOT moved. It records when the endpoint
    // was last asked, and the suppression above is what keeps the poll away;
    // moving it too would push the first poll after a quiet tap out by a
    // second interval. `retryAfter` is not cleared either: a wait the vendor
    // asked for is not answered by a number that arrived another way.
    deps.onChanged?.(compose());
    return 'applied';
  }

  async function run(force: boolean): Promise<UsageSnapshot> {
    const on = deps.settings();
    const now = deps.now();
    const waits: Promise<void>[] = [];
    for (const provider of USAGE_PROVIDERS) {
      const h = held.get(provider);
      if (h === undefined) continue;
      if (!on[provider]) {
        // OFF. The numbers, the state and the credential answer are all
        // thrown away, so a switch flipped off takes the numbers off the
        // screen with it, and nothing below this line runs: no keychain, no
        // file, no request.
        //
        // ONE THING SURVIVES, and the fix round of 2026-08-31 is why. A row
        // that holds nothing is due, which is what makes a switch turned on
        // ask at once instead of drawing an empty meter for a quarter of an
        // hour. If a `Retry-After` went with the rest, a flip of the switch
        // would walk straight past a wait the vendor asked for. It does not,
        // and `due` refuses until it has passed.
        held.set(provider, { ...freshHeld(), retryAfter: h.retryAfter });
        continue;
      }
      if (h.state === 'off') h.state = 'unavailable';
      if (h.inFlight !== null) {
        waits.push(h.inFlight);
        continue;
      }
      if (!due(h, now, force)) continue;
      // Claim the slot before awaiting, so two calls in the same tick make
      // one request rather than two.
      h.lastAttemptAt = now;
      const job = fetchProvider(provider)
        .then((outcome) => {
          applyOutcome(h, outcome, deps.now());
          if (outcome.kind !== 'ok') {
            deps.log('usage.read.failed', {
              provider,
              outcome: outcome.kind,
              state: h.state
            });
          }
        })
        .catch(() => {
          applyOutcome(h, { kind: 'unavailable' }, deps.now());
        })
        .finally(() => {
          h.inFlight = null;
        });
      h.inFlight = job;
      waits.push(job);
    }
    await Promise.all(waits);
    return compose();
  }

  return {
    read: () => run(false),
    refresh: () => run(true),
    current: () => compose(),
    applyTap
  };
}
