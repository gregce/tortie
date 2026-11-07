/**
 * Phase 359, Builder B — the retained restart needs the pane's own record
 * plus the current switch.
 *
 * WHAT THIS PINS, driving the shipping helpers with a stubbed exec (no
 * Electron, no tmux, no manifest writes):
 * - `readRetainedAgentAccessEnv` reads `show-environment -t <target>
 *   GMUX_AGENT_SOCKET` and answers the value, or null when the pane never
 *   had delivery, the variable is empty, or the read throws;
 * - `applyRetainedAgentAccess` keeps the recorded command byte-identical
 *   unless BOTH halves hold: the pane's env equals this profile's exact
 *   socket path AND the sealed switch is on now;
 * - when both hold, the CURRENT bundle pair is applied through the shared
 *   applier — inside `-c` for a captured wrapper, with a failing rewrap
 *   keeping the recorded command;
 * - a pre-enable retained pane (no recorded env) receives nothing after the
 *   switch turns on; a switched-off pane receives nothing even with the env.
 */

import { describe, expect, it, vi } from 'vitest';
import { AGENT_ACCESS_SOCKET_ENV } from '@shared/agent-access';
import type { ManifestSessionRecord } from '../../manifest';
import {
  applyRetainedAgentAccess,
  readRetainedAgentAccessEnv
} from '../resume-in-place';

const SOCKET = '/run/u/gmux/agent.sock';

function rowOf(over: Partial<ManifestSessionRecord> = {}): ManifestSessionRecord {
  return {
    id: 'sess-1',
    name: 'claude-1',
    agent: 'claude',
    status: 'running',
    cwd: '/tmp',
    projectPath: '/tmp',
    createdAt: 1,
    argv: ['/usr/local/bin/claude'],
    resumeArgv: ['/usr/local/bin/claude', '--resume', 'conv-1'],
    agentSessionId: 'conv-1',
    ...over
  } as unknown as ManifestSessionRecord;
}

vi.mock('electron', () => ({
  app: {
    isPackaged: false,
    getAppPath: () => '/nonexistent-app-path',
    getPath: () => '/nonexistent-user-data'
  }
}));



describe('readRetainedAgentAccessEnv', () => {
  it('answers the recorded socket value', async () => {
    const exec = async (args: readonly string[]): Promise<string> => {
      expect(args).toEqual([
        'show-environment',
        '-t',
        '$4',
        AGENT_ACCESS_SOCKET_ENV
      ]);
      return `${AGENT_ACCESS_SOCKET_ENV}=${SOCKET}\n`;
    };
    await expect(readRetainedAgentAccessEnv('$4', exec)).resolves.toBe(SOCKET);
  });

  it('answers null when the pane never had delivery', async () => {
    const exec = async (): Promise<string> =>
      `${AGENT_ACCESS_SOCKET_ENV}\n`;
    await expect(readRetainedAgentAccessEnv('$4', exec)).resolves.toBeNull();
  });

  it('answers null when the read throws', async () => {
    const exec = async (): Promise<string> => {
      throw new Error('no such session');
    };
    await expect(readRetainedAgentAccessEnv('$4', exec)).resolves.toBeNull();
  });
});

describe('applyRetainedAgentAccess', () => {
  it('keeps the recorded command when the pane predates enablement', () => {
    const rec = rowOf();
    const recorded = [...(rec.resumeArgv ?? [])];
    expect(
      applyRetainedAgentAccess(rec, recorded, null, true, SOCKET)
    ).toEqual(recorded);
  });

  it('keeps the recorded command when the switch is off, env or not', () => {
    const rec = rowOf();
    const recorded = [...(rec.resumeArgv ?? [])];
    expect(
      applyRetainedAgentAccess(rec, recorded, SOCKET, false, SOCKET)
    ).toEqual(recorded);
    expect(
      applyRetainedAgentAccess(rec, recorded, null, false, SOCKET)
    ).toEqual(recorded);
  });

  it('keeps the recorded command when the pane env is a different profile', () => {
    const rec = rowOf();
    const recorded = [...(rec.resumeArgv ?? [])];
    expect(
      applyRetainedAgentAccess(rec, recorded, '/other/profile/gmux/agent.sock', true, SOCKET)
    ).toEqual(recorded);
  });

  it('applies the current pair when both halves hold', () => {
    const rec = rowOf();
    const recorded = [...(rec.resumeArgv ?? [])];
    const out = applyRetainedAgentAccess(
      rec,
      recorded,
      SOCKET,
      true,
      SOCKET,
      '/bundle/tortie'
    );
    expect(out).toEqual([...recorded, '--plugin-dir', '/bundle/tortie']);
    // The record itself is untouched.
    expect(rec.resumeArgv).toEqual(recorded);
  });

  it('returns a copy when refusing, so callers cannot edit the recorded argv', () => {
    const rec = rowOf();
    const recorded = [...(rec.resumeArgv ?? [])];
    const out = applyRetainedAgentAccess(rec, recorded, null, true, SOCKET);
    expect(out).not.toBe(recorded);
    expect(out).toEqual(recorded);
  });

  it('gives shell rows nothing even with both halves held', () => {
    const rec = rowOf({ agent: 'shell' });
    const recorded = [...(rec.resumeArgv ?? [])];
    expect(
      applyRetainedAgentAccess(rec, recorded, SOCKET, true, SOCKET, '/bundle/tortie')
    ).toEqual(recorded);
  });
});
