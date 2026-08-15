/**
 * localStorage helpers for the app store and its slices (Phase 42 stage 4
 * moved them out of store.ts so the slices can share them without importing
 * the facade). The public import path is unchanged: store.ts re-exports both.
 *
 * Key NAMES are a protected strand (CLAUDE.md) — `gmux.*` stays `gmux.*`.
 * The keys themselves live beside the state they persist, in each slice.
 */

export function loadLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function saveLocal(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full/unavailable — cosmetic state only */
  }
}
