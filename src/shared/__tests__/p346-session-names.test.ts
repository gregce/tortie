/**
 * ONE RULE FOR NAMES (Phase 346, build/p346/SPEC.md §4.3, D14, §8.2).
 *
 * `nextOrdinal` moved from src/renderer/state/sessions-slice.ts to
 * src/shared/session-names.ts, beside the dedupe loop `createSession` ran
 * inline (`dedupedName`) and `ordinalName`, which the phone's start names a
 * session with. These hold:
 *
 *  1. The slice still exports `nextOrdinal`, and it is the shared function
 *     itself, so no importer moved and there is one definition.
 *  2. `ordinalName` equals the renderer's OLD rule, re-written here byte for
 *     byte from the parent (`0b87d0af`), over 50 name lists made by a seeded
 *     generator: names with the base, with other bases, with regular
 *     expression characters, with suffixes that collide, and empty lists.
 *  3. `dedupedName` is the loop: `name`, else `name-2`, `name-3`, …
 */

import { describe, expect, it, vi } from 'vitest';

import { dedupedName, nextOrdinal, ordinalName } from '../session-names';

/** The parent's `nextOrdinal`, copied from `0b87d0af` sessions-slice.ts:464-472, so the move is compared with what it was. */
function parentNextOrdinal(sessions: { name: string }[], base: string): number {
  let max = 0;
  const re = new RegExp(`^${base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-(\\d+)$`);
  for (const s of sessions) {
    const m = re.exec(s.name);
    if (m && m[1] !== undefined) max = Math.max(max, parseInt(m[1], 10));
  }
  return max + 1;
}

/** The parent's quickCreate name, then its createSession dedupe loop (`0b87d0af` :1163-1172). */
function parentName(sessions: { name: string }[], base: string): string {
  const name = `${base}-${parentNextOrdinal(sessions, base)}`;
  const existing = new Set(sessions.map((x) => x.name));
  let finalName = name;
  for (let n = 2; existing.has(finalName); n++) {
    finalName = `${name}-${n}`;
  }
  return finalName;
}

/** A small seeded generator, so a failure names the list it failed on. */
function seeded(seed: number): () => number {
  let x = seed >>> 0;
  return () => {
    x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
    return x / 4294967296;
  };
}

const BASES = ['claude', 'codex', 'cursor', 'a.b', 'x+y', 'shell', 'antigravity'];

function listOf(seed: number): { name: string }[] {
  const rnd = seeded(seed);
  const pick = <T>(xs: readonly T[]): T => xs[Math.floor(rnd() * xs.length)] as T;
  const out: { name: string }[] = [];
  const count = Math.floor(rnd() * 12);
  for (let i = 0; i < count; i += 1) {
    const base = pick(BASES);
    const shapes = [
      `${base}-${String(1 + Math.floor(rnd() * 6))}`,
      `${base}-${String(1 + Math.floor(rnd() * 3))}-${String(2 + Math.floor(rnd() * 2))}`,
      base,
      `${base}-x`,
      `${base}-0${String(Math.floor(rnd() * 9))}`,
      `my ${base}`,
      `${base}-${String(1 + Math.floor(rnd() * 3))}-2`
    ];
    out.push({ name: pick(shapes) });
  }
  return out;
}

describe('one rule for names (Phase 346, D14)', () => {
  it('is the one function the slice re-exports', async () => {
    // The renderer store needs a window to load; nothing here draws.
    vi.stubGlobal('window', { addEventListener() {}, removeEventListener() {} });
    vi.stubGlobal('localStorage', { getItem: () => null, setItem() {}, removeItem() {} });
    vi.stubGlobal('document', { body: { classList: { add() {}, remove() {}, contains: () => false } } });
    const slice = await import('../../renderer/state/sessions-slice');
    expect(slice.nextOrdinal).toBe(nextOrdinal);
    const store = await import('../../renderer/state/store');
    expect(store.nextOrdinal).toBe(nextOrdinal);
    vi.unstubAllGlobals();
  });

  it('names a session exactly as the parent did, over 50 seeded lists and every base', () => {
    let compared = 0;
    for (let seed = 1; seed <= 50; seed += 1) {
      const list = listOf(seed);
      for (const base of BASES) {
        expect(nextOrdinal(list, base), `seed ${String(seed)} ${base}`).toBe(parentNextOrdinal(list, base));
        expect(ordinalName(base, list), `seed ${String(seed)} ${base}`).toBe(parentName(list, base));
        compared += 1;
      }
    }
    expect(compared).toBe(350);
  });

  it('dedupes a taken name the way the loop did', () => {
    expect(dedupedName('claude-1', new Set())).toBe('claude-1');
    expect(dedupedName('claude-1', new Set(['claude-1']))).toBe('claude-1-2');
    expect(dedupedName('claude-1', new Set(['claude-1', 'claude-1-2', 'claude-1-3']))).toBe('claude-1-4');
    // The ordinal skips past the largest number, so the dedupe is reached only by a name the ordinal cannot see.
    expect(ordinalName('claude', [{ name: 'claude-2' }, { name: 'claude-3' }])).toBe('claude-4');
    expect(ordinalName('a.b', [{ name: 'aXb-5' }])).toBe('a.b-1');
    expect(ordinalName('codex', [])).toBe('codex-1');
  });
});
