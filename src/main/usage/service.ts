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
  UsageState
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
import type { UsageTransport } from './transport';

/** The poll interval, and main holds it as well as the renderer. */
export const USAGE_POLL_MS = 15 * 60 * 1000;
/** The floor the refresh control cannot go under. */
export const USAGE_REFRESH_FLOOR_MS = 60 * 1000;
/** How long old numbers stay on screen under a glyph after a failure. */
export const USAGE_STALE_MS = 30 * 60 * 1000;
/** The same, after a rate limit, where a longer memory is the kinder answer. */
export const USAGE_STALE_RATE_LIMITED_MS = 24 * 60 * 60 * 1000;

export interface UsageServiceDeps {
  credentials: CredentialDeps;
  transport: UsageTransport;
  /** What Settings says right now. Read on every call; never cached. */
  settings(): UsageSettings;
  now(): number;
  /** A provider name and a fixed sentence. NEVER a token, a body or a header. */
  log(event: string, fields: Record<string, unknown>): void;
}

export interface UsageService {
  /** The held snapshot, fetching only what the interval says is due. */
  read(): Promise<UsageSnapshot>;
  /** The refresh control: skips the interval, honours the floor and Retry-After. */
  refresh(): Promise<UsageSnapshot>;
}

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
}

function freshHeld(): Held {
  return {
    state: 'off',
    parsed: EMPTY_PARSE,
    readAt: null,
    lastAttemptAt: 0,
    retryAfter: null,
    inFlight: null
  };
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
    const since = now - h.lastAttemptAt;
    return since >= (force ? USAGE_REFRESH_FLOOR_MS : USAGE_POLL_MS);
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
    return {
      at: deps.now(),
      providers: USAGE_PROVIDERS.map((p) =>
        viewOf(p, held.get(p) ?? freshHeld())
      )
    };
  }

  return {
    read: () => run(false),
    refresh: () => run(true)
  };
}
