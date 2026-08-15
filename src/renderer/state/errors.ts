/**
 * Error helpers for the app store and its slices (Phase 42 stage 4 moved
 * them out of store.ts so the slices can share them without importing the
 * facade). The public import path is unchanged: store.ts re-exports both.
 */

import type { GmuxErrorPayload } from '@shared/types';

/** Parse a main-process rejection into its structured payload, if any. */
export function errorPayload(err: unknown): GmuxErrorPayload | null {
  const raw = err instanceof Error ? err.message : String(err);
  const start = raw.indexOf('{');
  if (start === -1) return null;
  try {
    const payload = JSON.parse(raw.slice(start)) as GmuxErrorPayload;
    return typeof payload.message === 'string' ? payload : null;
  } catch {
    return null;
  }
}

/** Friendly one-line error copy. */
export function errorText(err: unknown): string {
  const payload = errorPayload(err);
  if (payload) return payload.message;
  return err instanceof Error ? err.message : String(err);
}
