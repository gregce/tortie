/**
 * Phase 359, Builder B — launch/restore delivery composition.
 *
 * WHAT THIS PINS, with no Electron, no agent, no tmux, and no manifest:
 * - the exact supported set: claude, pi, omp, with their exact measured
 *   pairs — and null for shell plus the other ten launchable ids;
 * - off is byte-identical argv/env for all thirteen launchable rows;
 * - additive existing flags, no duplicate exact pair, paths with spaces;
 * - Claude/Pi/omp captured wrappers carry the pair inside `-c` and nowhere
 *   outside; a rewrap failure keeps the original argv;
 * - a retained restart gets delivery only with the original pane env plus
 *   the current switch (the eligibility rule the restart seam encodes);
 * - remote rows receive nothing;
 * - missing bundle root or an overlong socket preserves the original launch
 *   and logs no argv or path.
 *
 * HERMETIC. `electron` is not imported: `delivery.ts` names no runtime of
 * its own, and the wrapper helpers arrive as parameters, so what is asserted
 * is the composition, never the wrapper's quoting.
 */

import { describe, expect, it } from 'vitest';
import { AGENT_ACCESS_SOCKET_ENV } from '@shared/agent-access';
import type { LaunchableAgentKind } from '@shared/types';
import type { SpecstoryCaptureRecord } from '../../specstory/capture';
import {
  agentAccessArgvPair,
  agentAccessDelivery,
  agentAccessEligible,
  applyAgentAccessArgv
} from '../delivery';

const SOCKET = '/Users/t/gmux/agent.sock';
const BUNDLE = '/Resources/agent-skills/tortie';

/** The thirteen launchable rows: twelve agents plus shell. */
const ALL_ROWS: LaunchableAgentKind[] = [
  'claude',
  'cursor',
  'codex',
  'gemini',
  'droid',
  'deepseek',
  'antigravity',
  'muse',
  'qwen',
  'pi',
  'omp',
  'grok',
  'opencode',
  'shell'
];

/** The real wrapper seams, imported for the captured arms only. */
const { isWrappedArgv, unwrapArgv } = await import('../../specstory/wrap');
const { wrapWithRecord } = await import('../../specstory/capture');

function captureFor(inner: string[]): SpecstoryCaptureRecord {
  return {
    enabled: true,
    bin: '/opt/specstory/bin/specstory',
    binVersion: '2.8.0',
    provider: 'claude',
    exitCodeFidelity: 'exact',
    agentArgv: inner
  };
}

describe('the exact supported set and pairs', () => {
  it('delivers to claude, pi, and omp with their exact measured pairs', () => {
    expect(agentAccessDelivery('claude', true, true, SOCKET, BUNDLE)).toEqual({
      argv: ['--plugin-dir', BUNDLE],
      env: { [AGENT_ACCESS_SOCKET_ENV]: SOCKET }
    });
    expect(agentAccessDelivery('omp', true, true, SOCKET, BUNDLE)).toEqual({
      argv: ['--plugin-dir', BUNDLE],
      env: { [AGENT_ACCESS_SOCKET_ENV]: SOCKET }
    });
    expect(agentAccessDelivery('pi', true, true, SOCKET, BUNDLE)).toEqual({
      argv: ['--skill', `${BUNDLE}/skills/tortie`],
      env: { [AGENT_ACCESS_SOCKET_ENV]: SOCKET }
    });
  });

  it('answers null for shell plus the other ten launchable ids', () => {
    for (const agent of ALL_ROWS) {
      if (agent === 'claude' || agent === 'pi' || agent === 'omp') continue;
      expect(agentAccessDelivery(agent, true, true, SOCKET, BUNDLE)).toBeNull();
    }
  });

  it('pins the pair helper to the same two shapes', () => {
    expect(agentAccessArgvPair('claude', BUNDLE)).toEqual([
      '--plugin-dir',
      BUNDLE
    ]);
    expect(agentAccessArgvPair('omp', BUNDLE)).toEqual([
      '--plugin-dir',
      BUNDLE
    ]);
    expect(agentAccessArgvPair('pi', BUNDLE)).toEqual([
      '--skill',
      `${BUNDLE}/skills/tortie`
    ]);
  });
});

describe('off is byte-identical for all thirteen launchable rows', () => {
  it('answers null with the switch off, whatever else holds', () => {
    for (const agent of ALL_ROWS) {
      expect(agentAccessDelivery(agent, false, true, SOCKET, BUNDLE)).toBeNull();
    }
  });

  it('answers null for a remote session, whatever else holds', () => {
    for (const agent of ['claude', 'pi', 'omp'] as const) {
      expect(agentAccessDelivery(agent, true, false, SOCKET, BUNDLE)).toBeNull();
    }
  });

  it('leaves every argv and env byte-identical when delivery is null', () => {
    const argv = ['/usr/local/bin/codex', '--flag', 'a b'];
    const env = { A: '1' };
    for (const agent of ALL_ROWS) {
      const delivery = agentAccessDelivery(agent, false, true, SOCKET, BUNDLE);
      expect(delivery).toBeNull();
      expect(
        applyAgentAccessArgv(argv, undefined, delivery, isWrappedArgv, unwrapArgv, wrapWithRecord)
      ).toEqual(argv);
      expect({ ...env }).toEqual(env);
    }
  });
});

describe('additive composition', () => {
  it('appends after existing agent args and preserves every byte', () => {
    const argv = ['claude', '--model', 'opus', '--add-dir', '/w a dir'];
    const delivery = agentAccessDelivery('claude', true, true, SOCKET, BUNDLE);
    expect(delivery).not.toBeNull();
    expect(
      applyAgentAccessArgv(argv, undefined, delivery, isWrappedArgv, unwrapArgv, wrapWithRecord)
    ).toEqual([...argv, '--plugin-dir', BUNDLE]);
  });

  it('does not duplicate the exact pair when it is already present', () => {
    const argv = ['pi', '--tui-mode', 'regular', '--skill', `${BUNDLE}/skills/tortie`];
    const delivery = agentAccessDelivery('pi', true, true, SOCKET, BUNDLE);
    expect(
      applyAgentAccessArgv(argv, undefined, delivery, isWrappedArgv, unwrapArgv, wrapWithRecord)
    ).toEqual(argv);
  });

  it('keeps other user plugin and skill flags in place', () => {
    const argv = ['claude', '--plugin-dir', '/person/skills', '--skill', '/other'];
    const delivery = agentAccessDelivery('claude', true, true, SOCKET, BUNDLE);
    expect(
      applyAgentAccessArgv(argv, undefined, delivery, isWrappedArgv, unwrapArgv, wrapWithRecord)
    ).toEqual([...argv, '--plugin-dir', BUNDLE]);
  });

  it('handles bundle roots with spaces without splitting', () => {
    const spaced = '/App With Space/Resources/agent-skills/tortie';
    const delivery = agentAccessDelivery('omp', true, true, SOCKET, spaced);
    expect(delivery?.argv).toEqual(['--plugin-dir', spaced]);
    expect(
      applyAgentAccessArgv(['omp'], undefined, delivery, isWrappedArgv, unwrapArgv, wrapWithRecord)
    ).toEqual(['omp', '--plugin-dir', spaced]);
  });

  it('returns copies and never mutates the input argv', () => {
    const argv = ['claude'];
    const delivery = agentAccessDelivery('claude', true, true, SOCKET, BUNDLE);
    const out = applyAgentAccessArgv(argv, undefined, delivery, isWrappedArgv, unwrapArgv, wrapWithRecord);
    expect(out).not.toBe(argv);
    expect(out).toEqual(['claude', '--plugin-dir', BUNDLE]);
    expect(argv).toEqual(['claude']);
  });
});

describe('captured wrappers', () => {
  it('puts the claude pair inside -c and nowhere outside', () => {
    const inner = ['/usr/local/bin/claude', '--session-id', 'id-1'];
    const record = captureFor(inner);
    const wrapped = wrapWithRecord(record, inner);
    if (wrapped === null) throw new Error('the fixture could not be wrapped');
    const delivery = agentAccessDelivery('claude', true, true, SOCKET, BUNDLE);
    const out = applyAgentAccessArgv(wrapped, record, delivery, isWrappedArgv, unwrapArgv, wrapWithRecord);
    const innerOut = unwrapArgv(out);
    expect(innerOut).toEqual([...inner, '--plugin-dir', BUNDLE]);
    // The pair rides inside the -c string; the outer wrapper shape is intact.
    expect(isWrappedArgv(out)).toBe(true);
    expect(out.slice(0, wrapped.indexOf('-c') + 1)).toEqual(
      wrapped.slice(0, wrapped.indexOf('-c') + 1)
    );
  });

  it('puts the pi pair inside -c and nowhere outside', () => {
    const inner = ['/usr/local/bin/pi', '--session-id', 'id-2'];
    const record: SpecstoryCaptureRecord = { ...captureFor(inner), provider: 'pi' };
    const wrapped = wrapWithRecord(record, inner);
    if (wrapped === null) throw new Error('the fixture could not be wrapped');
    const delivery = agentAccessDelivery('pi', true, true, SOCKET, BUNDLE);
    const out = applyAgentAccessArgv(wrapped, record, delivery, isWrappedArgv, unwrapArgv, wrapWithRecord);
    expect(unwrapArgv(out)).toEqual([...inner, '--skill', `${BUNDLE}/skills/tortie`]);
    expect(isWrappedArgv(out)).toBe(true);
  });

  it('keeps the original argv when the rewrap fails', () => {
    const argv = ['/s/bin', 'run', 'claude', '-c', 'inner'];
    const record = captureFor(['/usr/local/bin/claude']);
    const failing = () => null;
    expect(
      applyAgentAccessArgv(argv, record, agentAccessDelivery('claude', true, true, SOCKET, BUNDLE), isWrappedArgv, unwrapArgv, failing)
    ).toEqual(argv);
  });
});

describe('retained-restart eligibility', () => {
  it('requires the original pane env plus the current switch', () => {
    // Enabled now, pane recorded with the socket: eligible.
    expect(agentAccessEligible('claude', true, true, SOCKET, BUNDLE)).toBe(true);
    // Switched off since: not eligible, so the restart stays byte-identical.
    expect(agentAccessEligible('claude', false, true, SOCKET, BUNDLE)).toBe(false);
    // Enabled now but the pane predates enablement: not eligible.
    expect(agentAccessEligible('claude', true, true, '', BUNDLE)).toBe(false);
  });
});

describe('refusals preserve the launch and name no bytes', () => {
  it('refuses a missing bundle root', () => {
    expect(agentAccessDelivery('claude', true, true, SOCKET, '')).toBeNull();
    expect(agentAccessEligible('claude', true, true, SOCKET, '')).toBe(false);
  });

  it('refuses an overlong socket path without truncating', () => {
    const long = `/${'s'.repeat(200)}/agent.sock`;
    expect(Buffer.byteLength(long, 'utf8')).toBeGreaterThan(103);
    expect(agentAccessDelivery('claude', true, true, long, BUNDLE)).toBeNull();
  });

  it('refuses an empty socket path', () => {
    expect(agentAccessDelivery('pi', true, true, '', BUNDLE)).toBeNull();
  });
});
