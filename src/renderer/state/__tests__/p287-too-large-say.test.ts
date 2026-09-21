/**
 * Phase 287. ONE SWITCH SAYS ONE THING.
 *
 * A choose that met the too-large refusal has two outcomes and neither of them
 * is the switched sentence. It was REFUSED, and nothing moved, so the refusal
 * is what a person reads; or it STOOD, the login is chosen and its own store
 * holds its account, and the running default session was deliberately not
 * moved, so the sentence says the outcome first and keeps `Restart now`. The
 * first build of this phase posted both, which is two toasts that disagree
 * about the same click.
 *
 * AND `problem` IS LEFT ALONE FOR A SWITCH THAT STOOD, which is the other half.
 * `problem` is drawn in this window by the Add login dialog alone, and that
 * dialog does not clear it when it opens, so a sentence left there after a
 * switch that worked turns up later under the name field of an unrelated
 * dialog.
 *
 * PHASE 304 PINS THE TWO SENTENCES HERE, by their exact bytes and their sha256,
 * because the copy test that pinned them died with the row label: since Phase
 * 304 Tortie's own copy of a sign in is a sealed file that refuses nothing for
 * size, so the only store that can is the agent's own keychain entry, no row
 * carries a size any more, and these two sentences are the whole of what a
 * person reads about it. `build/probe-p211-switch.mjs` carries the same bytes
 * and asserts the same lengths, so a sentence that drifts fails on the length
 * there and on the digest here rather than quietly matching nothing in a toast.
 */

import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  (globalThis as { window?: unknown }).window = { gmux: undefined };
});

import type { LoginProviderId, LoginRow, LoginsSnapshot } from '@shared/logins';
import { defaultLoginRow } from '@shared/logins';
import type { LoginActionResult } from '@shared/ipc/logins';
import {
  LOGIN_RESTART_NOW,
  LOGIN_TOO_LARGE_RUNNING,
  LOGIN_TOO_LARGE_SENTENCE
} from '@shared/login-copy';
import type { Session } from '@shared/types';
import {
  seedLoginsSnapshot,
  setLoginSwitchedListener,
  setLoginTooLargeListener,
  useLogins
} from '../logins';
import { sayLoginTooLarge, switchedLine } from '../login-switch';

function row(over: Partial<LoginRow> = {}): LoginRow {
  return {
    provider: 'claude',
    name: 'work.example',
    isDefault: false,
    chosen: false,
    present: false,
    email: 'work@example.com',
    kept: true,
    restores: true,
    ...over
  };
}

function snapshot(rows: LoginRow[]): LoginsSnapshot {
  return { logins: rows, problems: [], at: 1 };
}

/** A main that answers one prepared result for the one choose a test makes. */
function install(answer: Omit<LoginActionResult, 'snapshot'>): {
  tooLarge: [LoginProviderId, string, string][];
  switched: [LoginProviderId, string][];
} {
  const tooLarge: [LoginProviderId, string, string][] = [];
  const switched: [LoginProviderId, string][] = [];
  setLoginTooLargeListener((provider, chosen, outcome) => {
    tooLarge.push([provider, chosen, outcome]);
  });
  setLoginSwitchedListener((provider, chosen) => {
    switched.push([provider, chosen]);
  });
  (globalThis as { window: { gmux: unknown } }).window.gmux = {
    logins: {
      list: () => Promise.resolve(seedLoginsSnapshot()),
      add: () => Promise.resolve({ ok: true, snapshot: seedLoginsSnapshot() }),
      remove: () => Promise.resolve({ ok: true, snapshot: seedLoginsSnapshot() }),
      choose: () =>
        Promise.resolve({
          ...answer,
          snapshot: snapshot([defaultLoginRow('claude', false, true), row({ chosen: true })])
        }),
      onChanged: () => () => undefined
    }
  };
  return { tooLarge, switched };
}

beforeEach(() => {
  setLoginTooLargeListener(null);
  setLoginSwitchedListener(null);
  (globalThis as { window: { gmux: unknown } }).window.gmux = undefined;
  useLogins.setState({
    snapshot: snapshot([defaultLoginRow('claude', false, true), row()]),
    available: true,
    busy: false,
    problem: null
  });
});

describe('a choose that met the refusal', () => {
  it('refused: the sentence is the problem, and the listener says refused once', async () => {
    const seen = install({
      ok: false,
      reason: LOGIN_TOO_LARGE_SENTENCE,
      why: 'too-large'
    });
    const ok = await useLogins.getState().choose('claude', 'work.example');
    expect(ok).toBe(false);
    expect(useLogins.getState().problem).toBe(LOGIN_TOO_LARGE_SENTENCE);
    expect(seen.tooLarge).toEqual([['claude', 'work.example', 'refused']]);
    expect(seen.switched).toEqual([]);
  });

  it('stood: `problem` stays NULL, and the listener says chosen once', async () => {
    const seen = install({ ok: true, why: 'too-large' });
    const ok = await useLogins.getState().choose('claude', 'work.example');
    expect(ok).toBe(true);
    // THE NULL IS THE POINT. The Add login dialog draws `problem` and never
    // clears it when it opens, so a sentence left here after a switch that
    // worked waits under an unrelated name field.
    expect(useLogins.getState().problem).toBeNull();
    expect(seen.tooLarge).toEqual([['claude', 'work.example', 'chosen']]);
    // AND NOT THE SWITCHED SENTENCE, although the row restores. Two toasts
    // that disagree about one click is what this replaces.
    expect(seen.switched).toEqual([]);
  });

  it('says it once whatever the row promised', async () => {
    // THE ROW PROMISES "Puts this account back." (restores true) and the click
    // still says the one sentence, because since Phase 304 no row carries a
    // size: the answer to the click is the only place the reason exists.
    const seen = install({ ok: true, why: 'too-large' });
    useLogins.setState({
      snapshot: snapshot([defaultLoginRow('claude', false, true), row({ restores: true })])
    });
    await useLogins.getState().choose('claude', 'work.example');
    expect(seen.tooLarge).toHaveLength(1);
    expect(seen.switched).toHaveLength(0);
  });
});

describe('the two sentences, pinned by their exact bytes (Phase 304)', () => {
  const sha16 = (text: string): string =>
    createHash('sha256').update(text, 'utf8').digest('hex').slice(0, 16);

  it('the refusal names the store that refused and what was not done', () => {
    expect(LOGIN_TOO_LARGE_SENTENCE).toBe(
      'This sign in is too large for Tortie to write into the keychain entry the agent reads, so nothing was put back.'
    );
    expect(Buffer.byteLength(LOGIN_TOO_LARGE_SENTENCE, 'utf8')).toBe(111);
    expect(LOGIN_TOO_LARGE_SENTENCE.length).toBe(111);
    expect(sha16(LOGIN_TOO_LARGE_SENTENCE)).toBe('123ddf8f842d3fa7');
  });

  it('the switch that stood says the outcome first', () => {
    expect(LOGIN_TOO_LARGE_RUNNING).toBe(
      'Switched for new sessions. This sign in is too large for Tortie to write into the keychain entry the running session reads, so that session keeps its current sign in.'
    );
    expect(Buffer.byteLength(LOGIN_TOO_LARGE_RUNNING, 'utf8')).toBe(166);
    expect(LOGIN_TOO_LARGE_RUNNING.length).toBe(166);
    expect(sha16(LOGIN_TOO_LARGE_RUNNING)).toBe('fc94a671cccfc47f');
  });

  it('blames the writer that has the ceiling, and never the keeper', () => {
    // THE STORE THAT REFUSES IS THE AGENT'S ENTRY, written through one
    // `security` line by Tortie. Phase 287's sentence said "for Tortie to keep",
    // and on the arm its reverifier built Tortie HAD kept the sign in; a later
    // draft said "for the agent to hold", and the agent's own writer holds sign
    // ins of any size. So each sentence names the entry and the act of writing
    // into it, and neither says Tortie could not keep anything.
    for (const words of [LOGIN_TOO_LARGE_SENTENCE, LOGIN_TOO_LARGE_RUNNING]) {
      expect(words).toContain('keychain entry');
      expect(words).toContain('for Tortie to write');
      expect(words).not.toContain('to keep');
      expect(words).not.toContain('to hold');
      // No vendor, no length, no apostrophe: both conformance gates read the
      // bytes out of the words file with a single-quoted match.
      expect(words).not.toContain('Claude');
      expect(words).not.toContain('codex');
      expect(words).not.toMatch(/[0-9]/);
      expect(words).not.toContain("'");
    }
  });
});

describe('every other answer is exactly what it was', () => {
  it('a refusal for another reason sets its own sentence and says nothing new', async () => {
    const seen = install({
      ok: false,
      reason: 'Tortie is closing, so nothing was changed.'
    });
    const ok = await useLogins.getState().choose('claude', 'work.example');
    expect(ok).toBe(false);
    expect(useLogins.getState().problem).toBe(
      'Tortie is closing, so nothing was changed.'
    );
    expect(seen.tooLarge).toEqual([]);
    expect(seen.switched).toEqual([]);
  });

  it('an ordinary switch still says the switched sentence, and nothing new', async () => {
    const seen = install({ ok: true, reason: 'work.example is signed in again.' });
    const ok = await useLogins.getState().choose('claude', 'work.example');
    expect(ok).toBe(true);
    expect(useLogins.getState().problem).toBeNull();
    expect(seen.tooLarge).toEqual([]);
    expect(seen.switched).toEqual([['claude', 'work.example']]);
  });

  it('choosing the default says nothing at all, as before', async () => {
    const seen = install({ ok: true, why: 'too-large' });
    await useLogins.getState().choose('claude', null);
    expect(seen.tooLarge).toEqual([]);
    expect(seen.switched).toEqual([]);
  });
});

describe('sayLoginTooLarge posts exactly one toast', () => {
  function host(sessions: Session[]): {
    host: Parameters<typeof sayLoginTooLarge>[0];
    toasts: { kind: string; text: string; sticky?: boolean; action?: { label: string; run: () => void } }[];
    restarted: [string, unknown][];
  } {
    const toasts: {
      kind: string;
      text: string;
      sticky?: boolean;
      action?: { label: string; run: () => void };
    }[] = [];
    const restarted: [string, unknown][] = [];
    return {
      toasts,
      restarted,
      host: {
        sessions,
        toast: (kind, text, opts) => {
          toasts.push({
            kind,
            text,
            ...(opts?.sticky === undefined ? {} : { sticky: opts.sticky }),
            ...(opts?.action === undefined ? {} : { action: opts.action })
          });
        },
        restartSession: async (id, options) => {
          restarted.push([id, options]);
        }
      }
    };
  }

  function session(over: Partial<Session>): Session {
    return {
      id: over.id ?? 'id',
      name: 'x',
      tmuxName: 'x',
      projectPath: '/p',
      cwd: '/p',
      agent: 'claude',
      status: 'idle',
      createdAt: 0,
      ...over
    };
  }

  it('refused: the refusal, as an error, with nothing offered', () => {
    const h = host([session({ id: 'a' })]);
    sayLoginTooLarge(h.host, 'claude', 'work.example', 'refused');
    expect(h.toasts).toHaveLength(1);
    expect(h.toasts[0]?.kind).toBe('error');
    expect(h.toasts[0]?.text).toBe(LOGIN_TOO_LARGE_SENTENCE);
    // NOTHING WAS SWITCHED, so nothing is offered.
    expect(h.toasts[0]?.action).toBeUndefined();
    expect(h.toasts[0]?.text).not.toBe(switchedLine('work.example'));
  });

  it('chosen: the outcome first, and Restart now over the sessions the switch reached', () => {
    const h = host([
      session({ id: 'a' }),
      session({ id: 'b', login: 'work.example' }),
      session({ id: 'c', login: 'home' })
    ]);
    sayLoginTooLarge(h.host, 'claude', 'work.example', 'chosen');
    expect(h.toasts).toHaveLength(1);
    expect(h.toasts[0]?.kind).toBe('error');
    expect(h.toasts[0]?.text).toBe(LOGIN_TOO_LARGE_RUNNING);
    expect(h.toasts[0]?.sticky).toBe(true);
    expect(h.toasts[0]?.action?.label).toBe(LOGIN_RESTART_NOW);
    h.toasts[0]?.action?.run();
    expect(h.restarted).toEqual([
      ['a', { underChosenLogin: true }],
      ['b', { underChosenLogin: true }]
    ]);
  });

  it('chosen with no session reached: the sentence alone, still one toast', () => {
    const h = host([session({ id: 'c', login: 'home' })]);
    sayLoginTooLarge(h.host, 'claude', 'work.example', 'chosen');
    expect(h.toasts).toHaveLength(1);
    expect(h.toasts[0]?.text).toBe(LOGIN_TOO_LARGE_RUNNING);
    expect(h.toasts[0]?.action).toBeUndefined();
    expect(h.restarted).toEqual([]);
  });
});
