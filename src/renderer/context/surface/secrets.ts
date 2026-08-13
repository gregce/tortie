/**
 * The secrets rule (research 29 §7.3), in the one place a builder will hit it.
 *
 * Two rules, and they are different.
 *
 *  1. Every value under an MCP server's `env` is hidden, whatever the key is
 *     called. The survey found a plaintext bearer token in `~/.cursor/mcp.json`
 *     and plaintext provider keys in two other agents' settings. Guessing which
 *     keys hold a credential is how one gets through.
 *  2. Anywhere else in a rendered config fragment, a key whose name ends in
 *     KEY / TOKEN / SECRET / PASSWORD / CREDENTIAL (singular or plural, with or
 *     without a leading underscore) is hidden too.
 *
 * Hidden means replaced with four bullets. Not truncated, not hover to reveal,
 * not copyable. The header card says how many are hidden and offers to open the
 * file, because the editor already owns showing file contents and opening it is
 * then an explicit act by the person at the keyboard.
 */

/** §7.3's pattern, verbatim. */
const SECRET_KEY = /(_?(KEY|TOKEN|SECRET|PASSWORD|CREDENTIAL)S?)$/i;

/** What a hidden value renders as, everywhere, with no exceptions. */
export const MASK = '••••';

export function isSecretKey(key: string): boolean {
  return SECRET_KEY.test(key);
}

/** One rendered key and its value, after the rule has been applied. */
export interface MaskedPair {
  key: string;
  value: string;
  masked: boolean;
}

/**
 * Rule 1. Every value is hidden, so the caller only ever receives key names.
 * Sorted, because a config file's key order is not information and a stable
 * order makes the card diffable by eye.
 */
export function maskEnv(keys: readonly string[]): MaskedPair[] {
  return [...keys]
    .sort((a, b) => a.localeCompare(b))
    .map((key) => ({ key, value: MASK, masked: true }));
}

/**
 * Rule 2. For a fragment that is not an env block: hide the values whose key
 * names them a credential, and show the rest.
 */
export function maskFragment(
  entries: readonly (readonly [string, string])[]
): MaskedPair[] {
  return entries.map(([key, value]) =>
    isSecretKey(key)
      ? { key, value: MASK, masked: true }
      : { key, value, masked: false }
  );
}

/**
 * The sentence under a masked env block. It names the count and points at the
 * file, so the user knows something was withheld rather than absent.
 */
export function hiddenValuesSentence(count: number): string {
  if (count <= 0) return '';
  return count === 1
    ? '1 environment value is hidden. Open the file to see it.'
    : `${count} environment values are hidden. Open the file to see them.`;
}

/**
 * A last guard for anything that reaches a mono block through a path this
 * module does not control, e.g. an argv element from a plan. It hides the
 * value half of `--token=abc` and `TOKEN=abc` and leaves everything else
 * alone. It is deliberately narrow: this is a backstop, not the rule.
 */
export function maskInlineAssignment(token: string): string {
  const eq = token.indexOf('=');
  if (eq <= 0) return token;
  const name = token.slice(0, eq).replace(/^-+/, '');
  return isSecretKey(name) ? `${token.slice(0, eq)}=${MASK}` : token;
}
