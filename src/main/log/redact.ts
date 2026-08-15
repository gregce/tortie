/**
 * Write-time redaction (Phase 35, research 42 section 9).
 *
 * Every string that reaches the log file passes through here first, and the
 * one rule in this phase is that the home directory prefix becomes `~`. The
 * file on disk is already safe, so a later hand export cannot leak what was
 * never written. This is deliberately narrower than Signal's redaction set,
 * because Tortie logs no phone numbers and no user identifiers, and the
 * research 42 section 13 refusals forbid the content classes that would
 * need more.
 *
 * Pure. No electron import, no filesystem, so the unit tests run in plain
 * node. The home directory is an argument; src/main/log/format.ts binds it
 * from os.homedir() once.
 */

/** Replace every occurrence of the home directory prefix with `~`. */
export function redactString(value: string, homeDir: string): string {
  if (homeDir === '' || homeDir === '/') return value;
  // The path SEPARATOR is not required after the prefix: an argv joined into
  // one string, a quoted path and a bare `/Users/x` all redact the same way.
  return value.split(homeDir).join('~');
}

/**
 * Walk a JSON-shaped value and redact every string in it, including object
 * keys' values inside arrays and nested objects. Non-string leaves pass
 * through untouched. Cycles are cut rather than followed, because a log
 * field must never be the thing that hangs the app.
 */
export function redactValue(
  value: unknown,
  homeDir: string,
  seen: WeakSet<object> = new WeakSet()
): unknown {
  if (typeof value === 'string') return redactString(value, homeDir);
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value)) return undefined;
  seen.add(value);
  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item, homeDir, seen));
  }
  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    out[key] = redactValue(item, homeDir, seen);
  }
  return out;
}
