/**
 * Nothing that could be a credential leaves this reader.
 *
 * This is not a hypothetical. Research 29 §2.6 found a live API key in an
 * `env` block in `~/.cursor/mcp.json` on the operator's machine, a provider
 * key in `~/.qwen/settings.json` and another in `~/.deepseek/config.toml`.
 * OAuth material sits in `~/.codex/auth.json`. A view that renders MCP
 * configuration verbatim paints those onto a screen the user may be sharing.
 *
 * The defence has two halves and the first one matters more:
 *
 *  1. **The readers take named fields, never whole objects.** An MCP payload
 *     carries `command`, `args`, `url`, `cwd` and env KEYS, and there is no
 *     field on it that can hold an env value. A future edit cannot leak one by
 *     accident, because the model has nowhere to put it.
 *  2. **Masking on the way out**, for the fields that are free text and can
 *     still carry a secret inline: a `--api-key sk-…` argument, a URL with a
 *     token in the query string, a hook command that exports one.
 *
 * There is no reveal affordance anywhere and there never will be. The file is
 * one click away in the editor, which is the surface that already has the
 * user's trust for showing file contents (§7.3).
 */

/** The mask. Four dots, never a truncation, never the real length. */
export const MASK = '••••';

/**
 * A key name that means the value is a credential. Anchored at the end so
 * `MY_API_KEY`, `token`, `githubToken` and `DB_PASSWORD` all match while
 * `KEYBOARD` and `KEYMAP` do not.
 */
export const SECRET_KEY_PATTERN =
  /(?:^|[_.\-])?(?:api[_.-]?)?(?:key|token|secret|password|passwd|credential|credentials|auth|bearer|pat)s?$/i;

/** Values that are recognisably a credential wherever they appear. */
const SECRET_VALUE_PATTERNS: readonly RegExp[] = [
  /\bsk-[A-Za-z0-9_-]{16,}/g,
  /\bsk_(?:live|test)_[A-Za-z0-9]{12,}/g,
  /\b(?:ghp|gho|ghu|ghs|ghr|github_pat)_[A-Za-z0-9_]{16,}/g,
  /\bxox[abposr]-[A-Za-z0-9-]{10,}/g,
  /\bAKIA[0-9A-Z]{16}\b/g,
  /\bAIza[0-9A-Za-z_-]{20,}/g,
  /\bey[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g,
  /\bnpm_[A-Za-z0-9]{20,}/g,
  /\bglpat-[A-Za-z0-9_-]{16,}/g
];

/**
 * A URL's userinfo, wherever it appears in free text.
 *
 * THE CANONICAL SHAPE OF AN MCP CREDENTIAL IS A CONNECTION STRING, and a
 * connection string is usually an ARGUMENT rather than the `url` field. The MCP
 * quickstart's own example passes `postgresql://user:pass@host/db` as argv to a
 * stdio server, and `mcp-remote` takes `https://user:token@host/sse` the same
 * way. Only `payload.url` was ever routed through `maskUrl`, so those four
 * shapes rendered their password in full, two words after a `--token ••••` that
 * had already told the reader the panel hides credentials.
 *
 * So userinfo masking is a FREE-TEXT rule, not a URL-field rule, and it lives
 * here rather than inside `maskUrl` so that `maskInline`, `maskArgs` and every
 * reader that calls them get it without a second call site to remember. It runs
 * on the raw text rather than through `new URL(...)`, because the string being
 * masked is very often one token of a command line rather than a whole URL, and
 * because `URL.toString()` percent-encodes the mask into `%E2%80%A2` and turns
 * a readable line into noise.
 *
 * The whole userinfo goes, username included. A bare `ssh://git@github.com`
 * loses the word `git`, which is a small cost paid for one rule with no
 * exceptions: deciding per case which half of a userinfo is a secret is exactly
 * the guessing this module refuses everywhere else.
 */
const URL_USERINFO_PATTERN = /([A-Za-z][A-Za-z0-9+.-]*:\/\/)([^\s/?#@]+)@/g;

/**
 * Strip the userinfo out of every URL in a string. Idempotent: running it on
 * its own output leaves `scheme://••••@host` unchanged.
 */
export function maskUserinfo(text: string): string {
  return text.replace(URL_USERINFO_PATTERN, (_whole, scheme: string) => `${scheme}${MASK}@`);
}

/** True when a config key's VALUE must never be shown. */
export function isSecretKey(key: string): boolean {
  return SECRET_KEY_PATTERN.test(key.trim());
}

/** Replace anything that looks like a credential inside free text. */
export function maskInline(text: string): string {
  let out = maskUserinfo(text);
  for (const pattern of SECRET_VALUE_PATTERNS) out = out.replace(pattern, MASK);
  // `NAME=secret`, `--api-key=secret`, `TOKEN: secret` inside one string.
  // The value stops at a separator. A greedy `\S+` here swallowed the rest of
  // a query string, so masking `?api_key=…&page=2` also deleted `page=2`.
  out = out.replace(
    /([A-Za-z0-9_.-]*(?:key|token|secret|password|passwd|credential|auth|bearer|pat)s?)(\s*[=:]\s*)("[^"]*"|'[^']*'|[^\s&;"'`]+)/gi,
    (_whole, name: string, joiner: string) => `${name}${joiner}${MASK}`
  );
  return out;
}

/**
 * Mask an argv. A flag whose NAME says credential hides the argument that
 * follows it, in both the separated and the `=` form, and any argument that
 * looks like a credential on its own is masked wherever it sits.
 */
export function maskArgs(args: readonly string[]): string[] {
  const out: string[] = [];
  let hideNext = false;
  for (const arg of args) {
    if (hideNext) {
      out.push(MASK);
      hideNext = false;
      continue;
    }
    const flag = /^-{1,2}([A-Za-z0-9_.-]+)$/.exec(arg);
    if (flag && flag[1] && isSecretKey(flag[1].replace(/-/g, '_'))) {
      out.push(arg);
      hideNext = true;
      continue;
    }
    out.push(maskInline(arg));
  }
  return out;
}

/**
 * Strip userinfo and credential-shaped query parameters from a URL. A remote
 * MCP server's endpoint is routinely `https://…?api_key=…`, and the endpoint
 * itself is the thing the row shows.
 */
export function maskUrl(raw: string): string {
  const trimmed = raw.trim();
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return maskInline(trimmed);
  }
  // The userinfo is cleared here and re-inserted as text below. Assigning the
  // mask to `url.username` works, and then `toString()` percent-encodes it to
  // `%E2%80%A2%E2%80%A2%E2%80%A2%E2%80%A2`, which is unreadable in a row.
  const hadUserinfo = url.username !== '' || url.password !== '';
  url.username = '';
  url.password = '';
  const params = [...url.searchParams.keys()];
  for (const key of params) if (isSecretKey(key)) url.searchParams.set(key, MASK);
  const serialized = hadUserinfo
    ? url.toString().replace(/^([A-Za-z][A-Za-z0-9+.-]*:\/\/)/, `$1${MASK}@`)
    : url.toString();
  // A token can also be the last path segment of a webhook-style endpoint.
  return maskInline(serialized);
}

/**
 * Env keys only, with the count of values that were dropped. The values are
 * never returned, so "3 environment values are hidden. Open the file to see
 * them." is the only thing that can be rendered.
 */
export function envKeysOnly(source: unknown): { envKeys: string[]; hiddenValueCount: number } {
  if (typeof source !== 'object' || source === null || Array.isArray(source)) {
    return { envKeys: [], hiddenValueCount: 0 };
  }
  const keys = Object.keys(source as Record<string, unknown>).sort();
  return { envKeys: keys, hiddenValueCount: keys.length };
}
