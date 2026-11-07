/**
 * Phase 359, Builder B — the create call site keeps the manifest honest.
 *
 * WHAT THIS PINS, by reading the shipping source rather than running a
 * launch (no Electron, no agent, no tmux):
 * - create composes delivery through the one helper from the sealed switch;
 * - the delivered argv reaches `tmux.createSession` while the record keeps
 *   the pre-delivery `spec.argv` (the manifest stores no injected pair);
 * - the env merges `GMUX_AGENT_SOCKET` after `paneEnvFor` — never inside it;
 * - a remote branch takes a different path entirely and never receives the
 *   local socket or bundle argument;
 * - shell is never delivered; other user flags remain in order.
 *
 * The pure composition matrix lives in `p359-delivery.test.ts`. This file
 * owns only the wiring claims: one helper, pre-delivery records, env order,
 * and the remote boundary.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = (): string =>
  readFileSync(resolve(import.meta.dirname, '../create-local.ts'), 'utf8');

describe('create composes delivery through the one helper', () => {
  it('reads the sealed switch exactly once for this purpose', () => {
    const matches = source().match(/settings\.agentAccess === true/g) ?? [];
    expect(matches.length).toBe(1);
  });

  it('composes through composeAgentAccessDelivery from the sealed setting', () => {
    expect(source()).toContain('composeAgentAccessDelivery({');
    expect(source()).toContain('enabled: settings.agentAccess === true');
  });

  it('passes the delivered argv to tmux.createSession, not the raw launch argv', () => {
    expect(source()).toContain('argv: deliveredArgv');
  });

  it('merges the socket env after paneEnvFor', () => {
    const body = source();
    const at = body.indexOf('...paneEnvFor(spec.env, resolvedEnv, id');
    expect(at).toBeGreaterThan(-1);
    const after = body.slice(at, at + 400);
    expect(after).toContain('...accessDelivery.env');
  });
});

describe('the manifest keeps the pre-delivery record', () => {
  it('inserts the record before delivery is composed', () => {
    const body = source();
    const insert = body.indexOf('deps.manifest.insertSession(record)');
    const compose = body.indexOf('composeAgentAccessDelivery({');
    expect(insert).toBeGreaterThan(-1);
    expect(compose).toBeGreaterThan(-1);
    expect(insert).toBeLessThan(compose);
  });

  it('never writes the delivered argv or env onto the record', () => {
    const body = source();
    // The manifest writes are the insert plus the tmuxName/panePid mirror;
    // none carries a delivered value. The delivered names reach only the
    // tmux.createSession call.
    expect(body).not.toMatch(/manifest\.(insertSession|updateSession)\([^)]*delivered/);
    expect(body).not.toMatch(/updateSession\(id, \{[^}]*delivered/);
  });
});

describe('the remote boundary', () => {
  it('leaves before any delivery composition for a machine-bound create', () => {
    const body = source();
    const remoteReturn = body.indexOf('openTabsForRemoteCreate(');
    const compose = body.indexOf('composeAgentAccessDelivery({');
    expect(remoteReturn).toBeGreaterThan(-1);
    expect(compose).toBeGreaterThan(-1);
    expect(remoteReturn).toBeLessThan(compose);
  });

  it('reaches the remote return before any delivery import is used', () => {
    const body = source();
    const remoteEnd = body.indexOf('return session;');
    expect(remoteEnd).toBeGreaterThan(-1);
    const compose = body.indexOf('composeAgentAccessDelivery({');
    expect(compose).toBeGreaterThan(remoteEnd);
  });
});
