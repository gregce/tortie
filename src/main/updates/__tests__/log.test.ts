/**
 * Phase 35 unit tests for the updater's logging call.
 *
 * Phase 31 tested a rotation this module no longer owns. `appendUpdateLogLine`,
 * the 524288-byte cap and the `updates.log.1` rename retired when updater
 * events moved into the shared log, and the rotation they used to prove is
 * now proved one level down, against the shipping file-transport config, in
 * src/main/log/__tests__/rotation.test.ts.
 *
 * What is left to prove here is the thing the 5 updater call sites depend on:
 * `logUpdateEvent` keeps its signature, and each of its three levels reaches
 * the same-named function on the shared log at scope "updates". A silent
 * mis-mapping (warn arriving as info) would leave a real update failure
 * sitting below the file level and invisible.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

// vi.hoisted, because vi.mock is lifted above every const in this file and a
// factory closing over a plain const reads it inside its temporal dead zone.
const h = vi.hoisted(() => ({
  calls: [] as { level: string; msg: string }[],
  scopes: [] as string[]
}));
const { calls, scopes } = h;

vi.mock('../../log', () => ({
  getLog: (scope: string) => {
    h.scopes.push(scope);
    return {
      error: (msg: string) => h.calls.push({ level: 'error', msg }),
      warn: (msg: string) => h.calls.push({ level: 'warn', msg }),
      info: (msg: string) => h.calls.push({ level: 'info', msg }),
      debug: (msg: string) => h.calls.push({ level: 'debug', msg })
    };
  }
}));

import { logUpdateEvent } from '../log';

beforeEach(() => {
  calls.length = 0;
});

describe('logUpdateEvent', () => {
  it('logs at scope "updates", so every updater line reads in one place', () => {
    expect(scopes).toContain('updates');
  });

  it('carries each level through unchanged', () => {
    logUpdateEvent('info', 'checking for an update');
    logUpdateEvent('warn', 'the install was refused');
    logUpdateEvent('error', 'the download failed');
    expect(calls).toEqual([
      { level: 'info', msg: 'checking for an update' },
      { level: 'warn', msg: 'the install was refused' },
      { level: 'error', msg: 'the download failed' }
    ]);
  });

  it('passes the message through without a prefix of its own', () => {
    // The `[gmux-updates] ` prefix belongs to the console side of the shared
    // log. If this module added one too, dev terminals would read
    // `[gmux-updates] [gmux-updates] …`.
    logUpdateEvent('info', 'staged 0.20.3');
    expect(calls[0]?.msg).toBe('staged 0.20.3');
  });
});
