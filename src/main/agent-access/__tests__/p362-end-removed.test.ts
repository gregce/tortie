/** Agent End is removed: every end/close spelling is an unknown operation. */
import { mkdtempSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createConnection, type Socket } from 'node:net';
import { describe, expect, it, vi } from 'vitest';
import type { Session } from '@shared/types';

const world = vi.hoisted(() => ({ profile: '' }));
vi.mock('electron', () => ({ app: { getPath: () => world.profile } }));
vi.mock('../../log', () => ({ getLog: () => ({ info: vi.fn(), warn: vi.fn() }) }));
vi.mock('../../settings/store', () => ({ getSettings: () => ({ agentAccess: true }) }));

import {
  agentAccessSocketPath,
  installAgentAccess,
  reconcileAgentAccess,
  beginAgentAccessShutdown,
  joinAgentAccess,
  resetAgentAccessForTests
} from '../service';

// Plain unit host: no Electron, tmux, manifest, native dialog or lifecycle.
describe('agent End is removed', () => {
  it.each(['end', 'End', 'close', 'kill', 'END'])('operation %s is unknown-operation', async (operation) => {
    world.profile = mkdtempSync(join(tmpdir(), 'p362-end-'));
    let socket: Socket | undefined;
    const sessions = [{
      id: 'caller-1', name: 'caller', status: 'running', projectPath: '/tmp/a'
    }] as Session[];
    try {
      resetAgentAccessForTests();
      installAgentAccess({
        isEnabled: () => true,
        listSessions: async () => sessions,
        listProjects: async () => [],
        tortieVersion: () => 'test',
        open: async () => ({ state: 'refused', reason: 'missing' }),
        openProject: async () => ({ state: 'refused', reason: 'project-missing' }),
        create: async () => ({ state: 'refused', reason: 'failed' }),
        rename: async () => ({ state: 'refused', reason: 'failed' }),
        focus: async () => ({ state: 'refused', reason: 'failed' })
      });
      reconcileAgentAccess(true);
      const path = agentAccessSocketPath();
      await vi.waitFor(() => expect(existsSync(path)).toBe(true));
      socket = createConnection({ path });
      let received = '';
      socket.on('data', (bytes: Buffer) => { received += bytes.toString(); });
      socket.on('error', () => undefined);
      await new Promise<void>((resolve) => socket!.once('connect', resolve));
      socket.write(JSON.stringify({
        version: 1, operation, session: 'caller-1', target: 'target-1'
      }) + '\n');
      await vi.waitFor(() => expect(received.endsWith('\n')).toBe(true));
      const answer = JSON.parse(received) as { ok: boolean; error: { code: string } };
      expect(answer.ok).toBe(false);
      expect(answer.error.code).toBe('unknown-operation');
    } finally {
      socket?.destroy();
      beginAgentAccessShutdown();
      await joinAgentAccess();
      resetAgentAccessForTests();
      rmSync(world.profile, { recursive: true, force: true });
    }
  });
});
