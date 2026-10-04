/**
 * The question id main mints (Phase 318, build/p318/SPEC.md §5.3, D6, D7,
 * §Revision R2, R16): one process-wide counter, a 64-bit prefix, a string on
 * the wire, n = 0 never offered, and D7's one exemption.
 */

import { describe, expect, it } from 'vitest';
import { createQuestionIds, replyTurns, type TurnCause } from '../question-id';

const PREFIX = '0123456789abcdef';

describe('the question id', () => {
  it('is the prefix, a dash and the count, as a string, and a session never bumped reads 0', () => {
    const ids = createQuestionIds(PREFIX);
    const fresh = ids.current('s1');
    expect(fresh).toEqual({ id: `${PREFIX}-0`, n: 0, hooks: 0, hookAsk: null, hookBash: null });
    ids.bump('s1', 'desk');
    const after = ids.current('s1');
    expect(after.id).toBe(`${PREFIX}-1`);
    expect(typeof after.id).toBe('string');
    expect(after.id).toMatch(/^[0-9a-f]{16}-[1-9][0-9]{0,15}$/);
  });

  it('reading a session never bumped does not make it one', () => {
    const ids = createQuestionIds(PREFIX);
    ids.current('ghost');
    ids.bump('other', 'desk');
    expect(ids.current('other').n).toBe(1);
    expect(ids.current('ghost').n).toBe(0);
  });

  it('refuses a prefix that is not 16 lowercase hex', () => {
    for (const bad of ['', '0123456789ABCDEF', '0123456789abcde', '0123456789abcdef0', 'zzzzzzzzzzzzzzzz']) {
      expect(() => createQuestionIds(bad)).toThrow();
    }
  });

  it('is ONE process-wide counter: two sessions never hold the same non-zero id (R2)', () => {
    const ids = createQuestionIds(PREFIX);
    const seen = new Set<string>();
    const causes: Exclude<TurnCause, 'hook'>[] = ['desk', 'phone', 'choice-moved', 'choice-gone', 'status'];
    for (let round = 0; round < 50; round += 1) {
      for (const session of ['a', 'b', 'c']) {
        ids.bump(session, causes[round % causes.length] ?? 'desk');
        const id = ids.current(session).id;
        expect(seen.has(id)).toBe(false);
        seen.add(id);
      }
    }
    // The first dialog of two sessions: a counter per session would give both `-1`.
    const two = createQuestionIds(PREFIX);
    two.hook('x', 'Bash ls', 'whole');
    two.hook('y', 'Bash ls', 'whole');
    expect(two.current('x').id).not.toBe(two.current('y').id);
  });

  it('never reuses a count, across every cause', () => {
    const ids = createQuestionIds(PREFIX);
    const counts: number[] = [];
    ids.hook('s', 'Bash ls', 'whole');
    counts.push(ids.current('s').n);
    for (const cause of ['desk', 'phone', 'choice-appeared', 'choice-moved', 'choice-gone', 'status'] as const) {
      ids.bump('s', cause);
      counts.push(ids.current('s').n);
    }
    expect(counts).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('two instances with fresh prefixes never share an id', () => {
    const a = createQuestionIds('aaaaaaaaaaaaaaaa');
    const b = createQuestionIds('bbbbbbbbbbbbbbbb');
    a.bump('s', 'desk');
    b.bump('s', 'desk');
    expect(a.current('s').n).toBe(b.current('s').n);
    expect(a.current('s').id).not.toBe(b.current('s').id);
  });

  it('the production counter has a random 64-bit prefix', () => {
    const id = replyTurns.current('p318-never-bumped').id;
    expect(id).toMatch(/^[0-9a-f]{16}-0$/);
  });
});

describe('the hook and D7', () => {
  it('a hook takes a count, counts a hook, and keeps its question and Bash flag', () => {
    const ids = createQuestionIds(PREFIX);
    ids.hook('s', 'Bash touch x', 'whole');
    expect(ids.current('s')).toEqual({
      id: `${PREFIX}-1`,
      n: 1,
      hooks: 1,
      hookAsk: 'Bash touch x',
      hookBash: 'whole'
    });
  });

  it('an empty question is no question, and a Bash flag never outlives its question', () => {
    const ids = createQuestionIds(PREFIX);
    ids.hook('s', '', 'partial');
    expect(ids.current('s').hookAsk).toBeNull();
    expect(ids.current('s').hookBash).toBeNull();
    ids.hook('s', null, 'whole');
    expect(ids.current('s').hookBash).toBeNull();
    expect(ids.current('s').hooks).toBe(2);
  });

  it('the hook question survives exactly one bump: the choice appearing right after the hook (D7)', () => {
    const ids = createQuestionIds(PREFIX);
    ids.hook('s', 'Bash ls', 'whole');
    const atHook = ids.current('s');
    ids.bump('s', 'choice-appeared');
    expect(ids.current('s')).toEqual(atHook);
    // A second appearance is a new count and clears it.
    ids.bump('s', 'choice-appeared');
    expect(ids.current('s').n).toBe(atHook.n + 1);
    expect(ids.current('s').hookAsk).toBeNull();
    expect(ids.current('s').hookBash).toBeNull();
  });

  it('every other bump after a hook takes a count and clears the question', () => {
    for (const cause of ['desk', 'phone', 'choice-moved', 'choice-gone', 'status'] as const) {
      const ids = createQuestionIds(PREFIX);
      ids.hook('s', 'Bash ls', 'whole');
      ids.bump('s', cause);
      const turn = ids.current('s');
      expect(turn.n, cause).toBe(2);
      expect(turn.hookAsk, cause).toBeNull();
      expect(turn.hookBash, cause).toBeNull();
      expect(turn.hooks, cause).toBe(1);
    }
  });

  it('a choice appearing with no hook before it takes a count', () => {
    const ids = createQuestionIds(PREFIX);
    ids.bump('s', 'choice-appeared');
    expect(ids.current('s').n).toBe(1);
    ids.bump('s', 'desk');
    ids.bump('s', 'choice-appeared');
    expect(ids.current('s').n).toBe(3);
  });

  it('the exemption is per session: another session\'s hook does not lend it', () => {
    const ids = createQuestionIds(PREFIX);
    ids.hook('a', 'Bash ls', 'whole');
    ids.bump('b', 'choice-appeared');
    expect(ids.current('b').n).toBe(2);
    expect(ids.current('a').hookAsk).toBe('Bash ls');
  });

  it('a read hands out a frozen copy that later bumps do not change', () => {
    const ids = createQuestionIds(PREFIX);
    ids.hook('s', 'Bash ls', 'whole');
    const before = ids.current('s');
    ids.bump('s', 'desk');
    expect(Object.isFrozen(before)).toBe(true);
    expect(before.hookAsk).toBe('Bash ls');
    expect(before.n).toBe(1);
  });
});
