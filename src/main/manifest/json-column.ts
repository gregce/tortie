/**
 * One JSON-object column reader for the manifest codecs (Phase 42 stage 8).
 *
 * ./contract.ts and ./context-snapshot.ts each carried a byte-identical
 * private copy of this function. Two copies of a column parser can drift,
 * and a drift here decides whether a years-old row parses. This is now the
 * single copy; both import it.
 *
 * NULL in means undefined out, and so does anything that is not a JSON
 * object: a damaged column must degrade to "nothing was recorded", never to
 * a throw inside a manifest read.
 */

export function parseObject(
  text: string | null
): Record<string, unknown> | undefined {
  if (text === null) return undefined;
  try {
    const v: unknown = JSON.parse(text);
    if (v === null || typeof v !== 'object' || Array.isArray(v)) return undefined;
    return v as Record<string, unknown>;
  } catch {
    return undefined;
  }
}
