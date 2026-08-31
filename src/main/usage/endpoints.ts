/**
 * The two destinations, frozen (Phase 181).
 *
 * A bearer token may go to the vendor that issued it and to nowhere else, so
 * these are constants in compiled code rather than configuration. There is no
 * base URL setting, no override env var and no way for a settings file, a
 * configuration overlay or an argv to name a third host. That is the same
 * boundary CLAUDE.md states for everything else Tortie will run:
 * configuration selects from choices the compiled world already contains.
 *
 * The headers are the ones the CLIs themselves send, measured over the wire on
 * 2026-08-31 and recorded in docs/research/72 sections 8.2 and 8.3. Sending
 * exactly what the CLI sends is the point: the vendor sees the same shape of
 * request it would have seen from the agent the person already runs.
 */

export const CLAUDE_USAGE_HOST = 'api.anthropic.com';
export const CLAUDE_USAGE_PATH = '/api/oauth/usage';
/** The beta gate the Claude Code OAuth surface requires. */
export const CLAUDE_OAUTH_BETA = 'oauth-2025-04-20';
export const CLAUDE_USER_AGENT = 'claude-code/2.1.0';

export const CODEX_USAGE_HOST = 'chatgpt.com';
export const CODEX_USAGE_PATH = '/backend-api/wham/usage';
export const CODEX_USER_AGENT = 'codex-cli';
export const CODEX_BETA = 'codex-1';
export const CODEX_ORIGINATOR = 'Codex Desktop';

/** Claude's request headers. `token` is the person's own access token. */
export function claudeUsageHeaders(token: string): Record<string, string> {
  return {
    authorization: `Bearer ${token}`,
    'anthropic-beta': CLAUDE_OAUTH_BETA,
    'user-agent': CLAUDE_USER_AGENT,
    accept: 'application/json'
  };
}

/**
 * Codex's request headers. `accountId` is an identifier the endpoint requires
 * and it is read from the person's own auth file; it goes to OpenAI in this
 * header and nowhere else, and it never reaches a log, a store or the
 * renderer.
 */
export function codexUsageHeaders(
  token: string,
  accountId: string
): Record<string, string> {
  return {
    authorization: `Bearer ${token}`,
    'user-agent': CODEX_USER_AGENT,
    'openai-beta': CODEX_BETA,
    originator: CODEX_ORIGINATOR,
    'chatgpt-account-id': accountId,
    accept: 'application/json'
  };
}
