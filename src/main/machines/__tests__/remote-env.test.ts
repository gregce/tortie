/**
 * Which environment names may cross to a session on another machine
 * (Phase 73, M6, item 2).
 *
 * The measured byte path is in docs/research/52-remote-env-and-review.md and
 * `build/probe-remote-env.mjs` is what measured it. What is testable without a
 * machine is the refusal itself, and the refusal is the whole production change
 * this item made: the value would stand in two process tables at once for the
 * life of the create, one of them on a computer whose readers Tortie has never
 * counted, so Tortie sends the two names it already sends and no others.
 */

import { describe, expect, it } from 'vitest';
import { GmuxError } from '../../errors';
import {
  REMOTE_ENV_ALLOWED,
  REMOTE_ENV_MEASURED_AND_REFUSED,
  REMOTE_ENV_PASSTHROUGH_REFUSED,
  assertRemoteEnvAllowed,
  remoteEnvNameAllowed
} from '../remote-env';
import { managedPaneEnv } from '../../tmux/env';

describe('the allowed set', () => {
  it('is exactly the two names Tortie already puts on a pane', () => {
    // Written out rather than derived, because this is the set a person's
    // safety is argued from. A third name reaching the pane environment for
    // some unrelated reason must not silently widen what crosses a wire.
    expect([...REMOTE_ENV_ALLOWED].sort()).toEqual([
      'GMUX_MANAGED',
      'GMUX_SESSION_ID'
    ]);
  });

  it('agrees with managedPaneEnv, so the two cannot drift apart unnoticed', () => {
    const composed = Object.keys(managedPaneEnv('abc')).sort();
    expect(composed).toEqual([...REMOTE_ENV_ALLOWED].sort());
  });

  /**
   * PHASE 84 TRIED TO ADD `PATH` AND MEASUREMENT REFUSED IT.
   *
   * MEASURED 2026-08-18 by `build/probe-execplane.mjs` step 17c on tmux 3.6a. A
   * session created with `-e PATH=/p84-planted-85507:/usr/bin:/bin` produced a
   * pane printing `/Users/gdc/.cargo/bin:/usr/bin:/bin:/usr/sbin:/sbin`. On a
   * scratch socket, `-e FOO=bar-planted` on the same line DID reach the pane
   * and `-e PATH=` did not, while `show-environment` read both back. A pane
   * takes its PATH from the server rather than from the session environment.
   *
   * So the pair would have crossed to another computer and changed nothing, and
   * an allowance nothing uses is a widening for nothing.
   */
  it('does not hold PATH, because the pair would change nothing there', () => {
    expect(REMOTE_ENV_MEASURED_AND_REFUSED).toBe('PATH');
    expect(REMOTE_ENV_ALLOWED).not.toContain(REMOTE_ENV_MEASURED_AND_REFUSED);
    expect(remoteEnvNameAllowed('PATH')).toBe(false);
  });

  it('answers per name', () => {
    expect(remoteEnvNameAllowed('GMUX_SESSION_ID')).toBe(true);
    expect(remoteEnvNameAllowed('ANTHROPIC_API_KEY')).toBe(false);
    // Case matters. A name that differs only in case is a different name to
    // every shell involved.
    expect(remoteEnvNameAllowed('gmux_session_id')).toBe(false);
  });
});

describe('the refusal', () => {
  it('accepts exactly what Tortie composes for a create', () => {
    expect(() =>
      assertRemoteEnvAllowed(managedPaneEnv('11111111-2222-3333-4444-555555555555'))
    ).not.toThrow();
  });

  it('accepts an empty record', () => {
    expect(() => assertRemoteEnvAllowed({})).not.toThrow();
  });

  /** PHASE 84. Measurement refused this pair, so the refusal still fires. */
  it('refuses a list of folders, because it would change nothing there', () => {
    expect(() =>
      assertRemoteEnvAllowed({
        ...managedPaneEnv('11111111-2222-3333-4444-555555555555'),
        PATH: '/Users/gdc/.local/bin:/usr/local/bin:/usr/bin:/bin'
      })
    ).toThrow();
  });

  it('refuses any other name and names the first offending one', () => {
    let thrown: unknown = null;
    try {
      assertRemoteEnvAllowed({
        GMUX_MANAGED: '1',
        ANTHROPIC_API_KEY: 'sk-not-a-real-key',
        OPENAI_API_KEY: 'also-not-real'
      });
    } catch (err) {
      thrown = err;
    }
    expect(thrown).toBeInstanceOf(GmuxError);
    const payload = (thrown as GmuxError).payload;
    expect(payload.code).toBe('INVALID_INPUT');
    expect(payload.message).toBe(REMOTE_ENV_PASSTHROUGH_REFUSED);
    // The FIRST offending name, because a person fixing this needs the name
    // rather than a count.
    expect(String(payload.detail ?? '')).toContain('ANTHROPIC_API_KEY');
    expect(String(payload.detail ?? '')).not.toContain('OPENAI_API_KEY');
  });

  it('says what did not happen', () => {
    // The writing rule this phase works under: a refusal names what Tortie did
    // not do. A person who reads this must know that no session was started.
    expect(REMOTE_ENV_PASSTHROUGH_REFUSED).toContain('Nothing was started.');
    expect(REMOTE_ENV_PASSTHROUGH_REFUSED).not.toMatch(/[—–]/);
  });
});
