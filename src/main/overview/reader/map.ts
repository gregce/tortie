/**
 * Loads keep-map.json and answers the three questions the service asks about
 * it. Which block belongs to a provider, what version that block carries,
 * and what hash the whole map has. A stored watermark is only honoured when
 * the provider's version has not moved since it was written, so a rule
 * change forces a full re-read instead of serving turns cut by old rules.
 */

import { createHash } from 'node:crypto';
import rawMap from '../keep-map.json';
import type { KeepMap, ProviderMap } from './map-types';

export const KEEP_MAP: KeepMap = rawMap as unknown as KeepMap;

let cachedHash: string | null = null;

/** The provider's block, or null when the map has none. */
export function providerMap(provider: string): ProviderMap | null {
  return KEEP_MAP.providers[provider] ?? null;
}

/** The provider's rule version. Throws on an unmapped provider. */
export function providerVersion(provider: string): number {
  const cfg = KEEP_MAP.providers[provider];
  if (!cfg) throw new Error('keep-map: no provider ' + provider);
  return cfg.version;
}

/**
 * sha256 of the map's content, stable across processes. The map is bundled
 * as data, so the hash is taken over its canonical JSON rather than over a
 * file path that does not exist inside the bundle.
 */
export function keepMapHash(): string {
  if (cachedHash === null) {
    cachedHash = createHash('sha256').update(JSON.stringify(rawMap)).digest('hex');
  }
  return cachedHash;
}
