/**
 * Redaction for the overview store. Both sides of every turn, the ask and
 * the answer, pass through `redactText` before they are written, so no
 * secret shape research 63 section 16 found can reach the page or the
 * database file.
 *
 * SECRET_PATTERNS and redactSecrets are vendored from
 * /Users/gdc/getspecstory/lore/scripts/lib/patterns.mjs lines 196 to 218,
 * @specstory/lore 3.9.0, Apache License 2.0. The extract is 24 lines and
 * adds no package, so no NOTICE file changes. Patterns are provider shaped
 * prefixes plus an assignment heuristic. Deliberately NOT matched: bare
 * 40/64-char hex (git SHAs are evidence, not secrets).
 *
 * TORTIE_PATTERNS adds the two rules the measurement in research 63 section
 * 16 needs and the extract does not hold. Seven Stripe keys were found in
 * ANSWERS and the extract's api-key rule wants a hyphen after `sk`. And
 * 5,399 email addresses sat on the ask side.
 *
 * A home path such as /Users/example/demo-app/src/index.ts is not a secret
 * and survives, because the git mark needs it.
 */

export interface SecretPattern {
  name: string;
  re: RegExp;
  keep?: number;
}

// Begin vendored extract. @specstory/lore 3.9.0, scripts/lib/patterns.mjs
// lines 196 to 218, Apache License 2.0. Kept byte for byte apart from the
// TypeScript type annotation on the array.
export const SECRET_PATTERNS: SecretPattern[] = [
  { name: 'aws-key', re: /\bAKIA[0-9A-Z]{16}\b/g },
  { name: 'github-token', re: /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/g },
  { name: 'slack-token', re: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g },
  { name: 'api-key', re: /\bsk-[A-Za-z0-9_-]{20,}\b/g },
  { name: 'google-key', re: /\bAIza[0-9A-Za-z_-]{35}\b/g },
  { name: 'jwt', re: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,}\b/g },
  { name: 'private-key', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g },
  { name: 'bearer', re: /\b([Bb]earer\s+)[A-Za-z0-9._~+/=-]{16,}/g, keep: 1 },
  // key = value where the key NAME says secret; the value is masked, the structure kept.
  // Values containing ( or ) are code expressions ("token = tokenize(x)"), not credentials.
  { name: 'assignment', re: /\b((?:api[_-]?key|apikey|secret|token|passwd|password|credentials?|access[_-]?key|auth[_-]?token)["']?\s*[:=]\s*["']?)([^\s"'()]{8,})(?![\w(])/gi, keep: 1 }
];

// Mask secret VALUES in text bound for an LLM or chat; structure and surrounding evidence stay
// verbatim. Returns the redacted string.
export function redactSecrets(s: string): string {
  if (!s) return s;
  let out = s;
  for (const p of SECRET_PATTERNS) {
    out = out.replace(p.re, (...m) => (p.keep ? String(m[p.keep]) : '') + `[REDACTED:${p.name}]`);
  }
  return out;
}
// End vendored extract.

/** The two Tortie rules on top of the extract. */
export const TORTIE_PATTERNS: SecretPattern[] = [
  { name: 'stripe-key', re: /\bsk_(?:live|test)_[A-Za-z0-9]{10,}\b/g },
  { name: 'email', re: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g }
];

/** The names in the order they run, for the test and the gate. */
export const REDACTION_PATTERN_NAMES: readonly string[] = [
  ...SECRET_PATTERNS.map((p) => p.name),
  ...TORTIE_PATTERNS.map((p) => p.name)
];

/**
 * Masks every secret shape above. Returns the input unchanged when nothing
 * matched. Pure.
 */
export function redactText(text: string): string {
  if (!text) return text;
  let out = redactSecrets(text);
  for (const p of TORTIE_PATTERNS) {
    out = out.replace(p.re, (...m) => (p.keep ? String(m[p.keep]) : '') + `[REDACTED:${p.name}]`);
  }
  return out;
}
