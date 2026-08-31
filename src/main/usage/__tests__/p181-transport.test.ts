/**
 * The Retry-After reader (Phase 181). Nothing here opens a socket.
 *
 * Research 72 section 8.5 records that no 429 was ever received, so whether
 * either vendor sends this header at all is UNMEASURED. Both HTTP forms are
 * therefore accepted and neither is assumed, and the clamp is what stops a
 * header nobody has seen from silencing the meter for a year.
 */

import { describe, expect, it } from 'vitest';
import { RETRY_AFTER_MAX_MS, retryAfterDeadline } from '../transport';

const NOW = 1_000_000;

describe('retryAfterDeadline', () => {
  it('reads the delta seconds form', () => {
    expect(retryAfterDeadline('120', NOW)).toBe(NOW + 120_000);
  });

  it('reads the HTTP date form', () => {
    const at = NOW + 300_000;
    expect(retryAfterDeadline(new Date(at).toUTCString(), NOW)).toBe(
      NOW + Math.floor(300_000 / 1000) * 1000
    );
  });

  it('clamps a very long wait to twenty four hours', () => {
    expect(retryAfterDeadline('99999999', NOW)).toBe(NOW + RETRY_AFTER_MAX_MS);
    const farOff = new Date(NOW + 40 * 24 * 3600 * 1000).toUTCString();
    expect(retryAfterDeadline(farOff, NOW)).toBe(NOW + RETRY_AFTER_MAX_MS);
  });

  it('answers null for absent, empty, nonsense and past values', () => {
    expect(retryAfterDeadline(undefined, NOW)).toBeNull();
    expect(retryAfterDeadline('   ', NOW)).toBeNull();
    expect(retryAfterDeadline('soon', NOW)).toBeNull();
    expect(retryAfterDeadline(new Date(NOW - 1000).toUTCString(), NOW)).toBeNull();
    expect(retryAfterDeadline('-5', NOW)).toBeNull();
  });
});
