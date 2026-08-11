/**
 * SpecStory status — the wire shapes and pure evaluators behind Settings →
 * SpecStory (Phase 15, spec: docs/research/13-specstory-integration.md §3.4).
 *
 * NEW FILE appended to src/shared by the settings+status stream (shared/* is
 * append-only during parallel builds — nothing existing was edited here).
 *
 * WHAT THIS FILE IS FOR. Two processes need the same answer to "is this Mac
 * signed in to SpecStory Cloud, and with which binary would a capture run":
 * main reads it off disk, the Settings renderer draws it. Both read the
 * evaluators below, so the rule that decides "signed in" exists once.
 *
 * THE CHEAPEST HONEST SOURCE (and it is a FILE, not a spawn). specstory-cli
 * has no `whoami` and no `status` command — the full verb list is
 * check/help/list/login/logout/reindex/resume/run/search/skills/sync/version/
 * watch. Its own `cloud.IsAuthenticated()` (pkg/cloud/auth.go:220-289) reads
 * `~/.specstory/cli/auth.json` and nothing else, so gmux reads the same file
 * and applies the same rule: authenticated ⇔ the file parses AND (a non-empty
 * unexpired access token OR a non-empty unexpired refresh token), where
 * "unexpired" carries the CLI's own 5-minute buffer (auth.go:796-810).
 *
 * A CORRECTION TO THE RESEARCH, worth stating because it changes the copy:
 * §3.4 proposed showing "last sync" from `~/.specstory/sessions.db`. That
 * database is the CLI's LOCAL index of native agent stores — its columns are
 * created_at / updated_at / indexed_at / deleted, with no cloud column
 * anywhere (verified against the user's own 3.2 GB copy, 33,024 rows), and
 * `lastSyncTime` in pkg/cloud/sync.go lives only in memory for the life of one
 * process. So a "last synced" line sourced from that file would be a
 * fabrication. The one durable trace of cloud contact is
 * `cloud_refresh.lastValidAt`, stamped when the CLI successfully exchanges its
 * refresh token for an access token (auth.go:542) — which is why the UI calls
 * it "last cloud activity" and not "last sync".
 */

import type { LaunchableAgentId } from './types';

// ---------------------------------------------------------------------------
// Binary
// ---------------------------------------------------------------------------

/** Which copy of specstory a capture would run. */
export type SpecStoryBinarySource = 'bundled' | 'installed';

export interface SpecStoryBinaryInfo {
  /** Absolute path of the resolved executable. */
  path: string;
  /** `X.Y.Z` as the binary reports it; null when the probe gave nothing. */
  version: string | null;
  source: SpecStoryBinarySource;
}

// ---------------------------------------------------------------------------
// Account
// ---------------------------------------------------------------------------

/**
 * What auth.json says, evaluated. Everything is nullable because a
 * hand-edited, half-written or absent file is a normal state, not an error.
 */
export interface SpecStoryAuthFacts {
  signedIn: boolean;
  /** `cloud_refresh.as` — the account the tokens belong to. */
  email: string | null;
  /** `cloud_refresh.createdAt` (ISO) — when this Mac signed in. */
  since: string | null;
  /**
   * `cloud_refresh.lastValidAt` (ISO) — the last time the CLI successfully
   * talked to SpecStory Cloud. NOT a sync timestamp; see the file header.
   */
  lastCloudActivity: string | null;
}

/** The CLI's own grace period on token expiry (pkg/cloud/auth.go:807). */
export const SPECSTORY_TOKEN_EXPIRY_BUFFER_MS = 5 * 60_000;

function str(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

/** Mirrors `isTokenExpired`: empty or unparseable counts as expired. */
export function isSpecStoryTokenExpired(
  expiresAt: unknown,
  nowMs: number
): boolean {
  const raw = str(expiresAt);
  if (raw === null) return true;
  const at = Date.parse(raw);
  if (Number.isNaN(at)) return true;
  return nowMs + SPECSTORY_TOKEN_EXPIRY_BUFFER_MS > at;
}

export function signedOutFacts(): SpecStoryAuthFacts {
  return { signedIn: false, email: null, since: null, lastCloudActivity: null };
}

/**
 * Evaluate parsed auth.json exactly as `cloud.IsAuthenticated()` does.
 *
 * The identity fields are read even when the tokens have expired, so the UI
 * can say "your session with SpecStory Cloud expired" about a named account
 * rather than pretending the machine was never signed in.
 */
export function evaluateSpecStoryAuth(
  raw: unknown,
  nowMs: number = Date.now()
): SpecStoryAuthFacts {
  if (raw === null || typeof raw !== 'object') return signedOutFacts();
  const obj = raw as Record<string, unknown>;
  const refresh = (obj['cloud_refresh'] ?? null) as Record<string, unknown> | null;
  const access = (obj['cloud_access'] ?? null) as Record<string, unknown> | null;

  const accessOk =
    access !== null &&
    typeof access === 'object' &&
    str(access['token']) !== null &&
    !isSpecStoryTokenExpired(access['expiresAt'], nowMs);

  const refreshOk =
    refresh !== null &&
    typeof refresh === 'object' &&
    str(refresh['token']) !== null &&
    !isSpecStoryTokenExpired(refresh['expiresAt'], nowMs);

  return {
    signedIn: accessOk || refreshOk,
    email: refresh === null ? null : str(refresh['as']),
    since: refresh === null ? null : str(refresh['createdAt']),
    lastCloudActivity:
      (refresh === null ? null : str(refresh['lastValidAt'])) ??
      (access === null ? null : str(access['updatedAt']))
  };
}

// ---------------------------------------------------------------------------
// Which agents can be captured
// ---------------------------------------------------------------------------

/**
 * agentId → specstory provider id, from the verified table in
 * docs/research/13-specstory-integration.md §1.1.
 *
 * THIS IS THE FALLBACK, NOT THE ANSWER. Main derives the real list from the
 * registry intersected with the providers the RESOLVED BINARY actually has
 * (`specstory run --help`), and that difference is not hypothetical: the
 * bundled 2.8.0 release advertises antigravity/claude/codex/copilotide/cursor/
 * cursoride/deepseek/droid/gemini and NO `muse` — muse exists only on the
 * unreleased branch this table was read from. Offering a Muse capture switch
 * against that binary would promise a wrap that errors at launch. This
 * constant exists for the one case main cannot answer: a renderer whose status
 * channel is unavailable, which cannot import the registry.
 */
export const SPECSTORY_PROVIDER_BY_AGENT: Readonly<
  Partial<Record<LaunchableAgentId, string>>
> = {
  claude: 'claude',
  codex: 'codex',
  cursor: 'cursor',
  gemini: 'gemini',
  droid: 'droid',
  deepseek: 'deepseek',
  antigravity: 'antigravity',
  muse: 'muse'
};

export interface SpecStoryCaptureAgent {
  agentId: LaunchableAgentId;
  /** The `specstory run <provider>` positional for this agent. */
  provider: string;
}

/** The capture-capable agents, in the order the table above declares them. */
export function defaultCaptureAgents(): SpecStoryCaptureAgent[] {
  return Object.entries(SPECSTORY_PROVIDER_BY_AGENT).map(([agentId, provider]) => ({
    agentId: agentId as LaunchableAgentId,
    provider: provider as string
  }));
}

// ---------------------------------------------------------------------------
// The status payload
// ---------------------------------------------------------------------------

export interface SpecStoryStatus {
  /**
   * The copy of specstory a capture would run, or null when neither a bundled
   * nor an installed one could be resolved — the only state in which the
   * capture switches are dead, and the UI says so in one line.
   */
  binary: SpecStoryBinaryInfo | null;
  auth: SpecStoryAuthFacts;
  /** Agents this build can capture (registry order). */
  captureAgents: SpecStoryCaptureAgent[];
  /** Device-login page; honours SPECSTORY_CLOUD_URL like the CLI does. */
  loginUrl: string;
  /** The file the account facts were read from (shown as a tooltip). */
  authPath: string;
}

/** `specstory:beginLogin` — we opened the browser (or could not). */
export interface SpecStoryLoginStart {
  url: string;
  opened: boolean;
}

/** Result of finishing a sign-in or of signing out. */
export interface SpecStoryAuthActionResult {
  ok: boolean;
  /** Plain-language failure, taken from the CLI's own output when it spoke. */
  message: string | null;
  /** The freshly re-read status, so the caller never guesses. */
  status: SpecStoryStatus;
}

// ---------------------------------------------------------------------------
// Device code
// ---------------------------------------------------------------------------

/**
 * Normalize a typed device code the way `normalizeDeviceCode`
 * (pkg/cmd/login.go:226-247) does: an optional dash in the middle of a
 * 7-character input is dropped, and the result must be 6 ASCII alphanumerics.
 * Returns null when the code cannot be one — the field says so before a
 * process is spawned.
 */
export function normalizeSpecStoryDeviceCode(input: string): string | null {
  let code = input.trim();
  if (code.length === 7 && code[3] === '-') code = code.slice(0, 3) + code.slice(4);
  if (code.length !== 6) return null;
  return /^[A-Za-z0-9]{6}$/.test(code) ? code : null;
}

// ---------------------------------------------------------------------------
// Turning CLI output into the one line a row can show
// ---------------------------------------------------------------------------

/**
 * Lines that are furniture, not news: the prompt the CLI reprints before every
 * read, and the banner it opens with. MEASURED against `specstory login` fed a
 * bad code — its last spoken line is the prompt `Code:`, so "take the last
 * line" (the obvious rule, and the one this replaces) surfaced a colon.
 */
const CLI_NOISE = [
  /^code:?$/i,
  /^enter the .*code/i,
  /^opening your browser/i,
  /^if your browser/i,
  /^please try entering/i,
  /^authenticating/i,
  /^error$/i,
  /^https?:\/\//i,
  // OUR artifact, never the user's problem: it is what the CLI says when the
  // pipe carrying the code is closed while it is asking for the next one.
  /^failed to read authentication code/i
];

/** The lines that say why something failed, in the words the CLI used. */
const CLI_FAILURE = /(fail|invalid|expired|denied|unauthor|not signed|error)/i;

function cliLines(raw: string): string[] {
  return (
    raw
      .split('\n')
      // Strip ANSI colour, then the leading emoji and box glyphs the CLI
      // decorates with — what is left is the sentence.
      .map((l) =>
        l
          // eslint-disable-next-line no-control-regex
          .replace(/\[[0-9;]*[A-Za-z]/g, '')
          .replace(/^[\s│┃|>*─-╿\p{Extended_Pictographic}️↳]+/gu, '')
          .trim()
      )
      .filter((l) => l.length > 0 && !CLI_NOISE.some((re) => re.test(l)))
  );
}

function lastFailure(lines: string[]): string | null {
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const line = lines[i] as string;
    if (CLI_FAILURE.test(line)) return line;
  }
  return null;
}

/**
 * The most useful line of a CLI run, for a UI that has one line to spend.
 *
 * specstory decorates its output with emoji ("❌ Authentication failed: …")
 * and re-prompts after a rejected code, so the rule is "the last line that
 * BLAMES something", falling back to the last line that is neither prompt nor
 * banner. STDOUT IS SEARCHED FIRST, and that ordering is the whole point:
 * MEASURED against a real rejected code, stdout carries the diagnosis
 * ("Authentication failed: Invalid or expired device code") while stderr
 * carried only the CLI's framing of how the process ended. Showing the second
 * one taught the user nothing about the code they had mistyped.
 *
 * Pure, and exported, so the sentence a user actually reads has a unit test.
 */
export function distillCliMessage(
  stdout: string,
  stderr: string
): string | null {
  const out = cliLines(stdout);
  const err = cliLines(stderr);
  return (
    lastFailure(out) ??
    lastFailure(err) ??
    out[out.length - 1] ??
    err[err.length - 1] ??
    null
  );
}

// ---------------------------------------------------------------------------
// Version comparison (used to prefer a newer installed copy over the bundle)
// ---------------------------------------------------------------------------

/**
 * Pull `2.7.0` out of `2.7.0 (SpecStory)` / `specstory version 2.7.0` / a bare
 * `v2.7.0`. Null when the output holds no dotted triple — a probe that says
 * nothing recognisable must not be reported as a version.
 */
export function parseSpecStoryVersionOutput(raw: string): string | null {
  // No leading \b: the CLI prints `v2.7.0` as often as `2.7.0 (SpecStory)`,
  // and there is no word boundary between `v` and `2`.
  const m = /(?<![\d.])\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?/.exec(raw);
  return m === null ? null : m[0];
}

/** -1 / 0 / 1 by numeric semver precedence; unparseable sorts lowest. */
export function compareSpecStoryVersions(
  a: string | null,
  b: string | null
): number {
  const parts = (v: string | null): number[] =>
    (v ?? '').split('.').map((p) => Number.parseInt(p, 10) || 0);
  const left = parts(a);
  const right = parts(b);
  for (let i = 0; i < 3; i += 1) {
    const l = left[i] ?? 0;
    const r = right[i] ?? 0;
    if (l !== r) return l < r ? -1 : 1;
  }
  return 0;
}
